import crypto from 'node:crypto';

import {
  PAPER_IMPLEMENTATION_CITATION_SOURCE_KINDS,
  PAPER_IMPLEMENTATION_CITABLE_SOURCE_TYPES,
  type CitationCandidate,
  type ClaimTracePacket,
  type CreateCitationCandidateRequest,
  type CreateClaimTracePacketRequest,
  type CreateTraceManifestRequest,
  type EvaluateTraceGateRequest,
  type NaturalLanguageFieldRoleRecord,
  PAPER_IMPLEMENTATION_TRACE_LINEAGE_TYPES,
  type PaperImplementationFieldRole,
  type PaperImplementationTraceLineageType,
  type PaperImplementationTraceStatus,
  type RegisterNaturalLanguageFieldRoleRequest,
  type ResolveTraceRepairQueueItemRequest,
  type TraceGateResult,
  type TraceIntegrity,
  type TraceLineageBundle,
  type TraceManifest,
  type TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-recheck-risk-memory-contracts';

import { AppError } from '../errors/app-error.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationTraceKernelServiceOptions = {
  projectRepository: PaperImplementationRepository;
  traceRepository: PaperImplementationTraceRepository;
  idFactory?: IdFactory;
  now?: () => string;
};

const MEMO_OR_INTERPRETATION_ROLES = new Set<PaperImplementationFieldRole>([
  'interpretation',
  'rationale_memo',
  'display_summary',
]);

const WRITING_AFFECTING_TARGET_REQUIREMENTS = new Map<string, PaperImplementationTraceLineageType[]>([
  ['coremotiveversion', ['literature']],
  ['motiveevidenceboardversion', ['literature']],
  ['evidencebinding', ['literature']],
  ['evidencetransferbinding', ['literature']],
  ['citationcandidate', ['literature']],
  ['implementationdossier', ['literature']],
  ['resultclaim', ['experiment']],
  ['resultinterpretationpacket', ['experiment']],
  ['resultinterpretationpacketlight', ['experiment']],
  ['runevidenceunit', ['experiment', 'artifact']],
  ['validationcycle', ['decision']],
  ['motiveevolutiondecision', ['decision']],
  ['technicalroutecandidate', ['decision']],
  ['feasibilityprobe', ['experiment']],
  ['experimentplanlight', ['experiment']],
  ['researchworkorder', ['experiment']],
]);

// D-N8 (2026-07-11): claim-level targets need at least ONE of these lineage
// families; a claim with neither citable literature nor experiment lineage
// stays broken, while pure experimental claims are complete without padding
// citations. Dossier-level literature anchoring stays required above.
const WRITING_AFFECTING_TARGET_ANY_OF_REQUIREMENTS = new Map<string, PaperImplementationTraceLineageType[]>([
  ['claimcandidate', ['literature', 'experiment']],
  ['claimcandidatelight', ['literature', 'experiment']],
  ['claimtracepacket', ['literature', 'experiment']],
]);

export class PaperImplementationTraceKernelService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationTraceKernelServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.traceRepository = options.traceRepository;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createTraceManifest(
    implementationProjectId: string,
    request: CreateTraceManifestRequest,
  ): Promise<TraceManifest> {
    const manifest = await this.buildTraceManifest(
      implementationProjectId,
      this.idFactory('trace_manifest'),
      request,
    );
    const queueItems = this.buildRepairQueueItems(
      manifest,
      manifest.created_by,
      manifest.created_at,
    );
    return this.traceRepository.createTraceManifest(manifest, queueItems);
  }

  /** Internal exact-once seam for owner-root composition; the public contract stays semantic-only. */
  async ensureTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    request: CreateTraceManifestRequest,
  ): Promise<{ manifest: TraceManifest; created: boolean }> {
    const expected = await this.buildTraceManifest(implementationProjectId, traceManifestId, request);
    const existing = await this.traceRepository.findTraceManifestById(
      implementationProjectId,
      traceManifestId,
    );
    if (existing) {
      this.assertExpectedManifest(existing, expected);
      return { manifest: existing, created: false };
    }
    const queueItems = this.buildRepairQueueItems(
      expected,
      expected.created_by,
      expected.created_at,
    );
    try {
      return {
        manifest: await this.traceRepository.createTraceManifest(expected, queueItems),
        created: true,
      };
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') {
        throw error;
      }
      const raced = await this.traceRepository.findTraceManifestById(
        implementationProjectId,
        traceManifestId,
      );
      if (!raced) {
        throw error;
      }
      this.assertExpectedManifest(raced, expected);
      return { manifest: raced, created: false };
    }
  }

  private async buildTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    request: CreateTraceManifestRequest,
  ): Promise<TraceManifest> {
    const project = await this.requireProject(implementationProjectId);
    this.assertFunctionalRef(request.target_ref, 'target_ref');
    this.assertLineageBundle(request.lineage);
    const integrity = this.withRequiredLineageGaps(
      request.target_ref,
      request.lineage,
      this.normalizeIntegrity(request.integrity),
    );
    return {
      trace_manifest_id: traceManifestId,
      implementation_project_id: project.implementation_project_id,
      target_ref: request.target_ref,
      lineage: request.lineage,
      integrity,
      trace_status: this.computeTraceStatus(integrity),
      broken_ref_count: integrity.broken_refs.length,
      stale_ref_count: integrity.stale_refs.length,
      missing_ref_count: integrity.missing_refs.length,
      non_citable_ref_count: integrity.non_citable_refs.length,
      trace_policy_version_id: request.trace_policy_version_id ?? project.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
      created_at: this.now(),
    };
  }

  private assertExpectedManifest(existing: TraceManifest, expected: TraceManifest): void {
    const comparable = (manifest: TraceManifest) => ({
      implementation_project_id: manifest.implementation_project_id,
      target_ref: manifest.target_ref,
      lineage: manifest.lineage,
      integrity: manifest.integrity,
      trace_status: manifest.trace_status,
      trace_policy_version_id: manifest.trace_policy_version_id ?? null,
    });
    if (stableStringify(comparable(existing)) !== stableStringify(comparable(expected))) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `TraceManifest ${existing.trace_manifest_id} exists with different owner semantics.`,
      );
    }
  }

  async listTraceManifests(
    implementationProjectId: string,
  ): Promise<TraceManifest[]> {
    await this.requireProject(implementationProjectId);
    return this.traceRepository.listTraceManifests(implementationProjectId);
  }

  async getTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest> {
    await this.requireProject(implementationProjectId);
    return this.requireTraceManifest(implementationProjectId, traceManifestId);
  }

  async createCitationCandidate(
    implementationProjectId: string,
    request: CreateCitationCandidateRequest,
  ): Promise<CitationCandidate> {
    const project = await this.requireProject(implementationProjectId);
    const manifest = await this.requireTraceManifest(implementationProjectId, request.trace_manifest_id);
    this.assertCitationRequest(request, manifest);
    const linkedTargetRefs = this.prioritizeManifestTargetRef(
      request.linked_target_refs,
      manifest.target_ref,
    );
    const createdAt = this.now();
    const candidate: CitationCandidate = {
      citation_candidate_id: this.idFactory('citation_candidate'),
      implementation_project_id: project.implementation_project_id,
      trace_manifest_id: manifest.trace_manifest_id,
      trace_manifest_ref: this.ref('trace_manifest', manifest.trace_manifest_id, project.title_card_id),
      source_kind: request.source_kind,
      source_type: request.source_type,
      source_id: request.source_id,
      source_evidence_unit_ref: request.source_evidence_unit_ref,
      source_locator_id: request.source_locator_id,
      locator_quality: request.locator_quality,
      locator: request.locator,
      cited_for: request.cited_for,
      linked_target_refs: linkedTargetRefs,
      status: 'candidate',
      normalized_source_statement: request.normalized_source_statement.trim(),
      citation_limitation: request.citation_limitation ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.traceRepository.createCitationCandidate(candidate);
  }

  async listCitationCandidates(
    implementationProjectId: string,
  ): Promise<CitationCandidate[]> {
    await this.requireProject(implementationProjectId);
    return this.traceRepository.listCitationCandidates(implementationProjectId);
  }

  async createClaimTracePacket(
    implementationProjectId: string,
    request: CreateClaimTracePacketRequest,
  ): Promise<ClaimTracePacket> {
    const project = await this.requireProject(implementationProjectId);
    const manifest = await this.requireTraceManifest(implementationProjectId, request.trace_manifest_id);
    this.assertFunctionalRef(request.claim_ref, 'claim_ref');
    if (!this.hasText(request.claim_statement)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'claim_statement is required.');
    }
    this.assertLineageBundle(request.lineage);
    this.assertClaimTraceHasCitableOrExperimentalSupport(request.lineage);
    const createdAt = this.now();
    const packet: ClaimTracePacket = {
      claim_trace_packet_id: this.idFactory('claim_trace_packet'),
      implementation_project_id: project.implementation_project_id,
      claim_ref: request.claim_ref,
      claim_statement: request.claim_statement.trim(),
      trace_manifest_id: manifest.trace_manifest_id,
      trace_manifest_ref: this.ref('trace_manifest', manifest.trace_manifest_id, project.title_card_id),
      lineage: request.lineage,
      challenge: request.challenge,
      scope: request.scope,
      boundary: request.boundary,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.traceRepository.createClaimTracePacket(packet);
  }

  async listClaimTracePackets(
    implementationProjectId: string,
  ): Promise<ClaimTracePacket[]> {
    await this.requireProject(implementationProjectId);
    return this.traceRepository.listClaimTracePackets(implementationProjectId);
  }

  async registerNaturalLanguageFieldRole(
    implementationProjectId: string,
    request: RegisterNaturalLanguageFieldRoleRequest,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    const project = await this.requireProject(implementationProjectId);
    this.assertFunctionalRef(request.field_owner_ref, 'field_owner_ref');
    if (!this.hasText(request.field_name)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'field_name is required.');
    }
    this.assertFieldRolePolicy(request);
    const fieldName = request.field_name.trim();
    const policyVersionId = request.policy_version_id ?? project.policy_version_id ?? null;
    const existing = await this.traceRepository.findNaturalLanguageFieldRoleByIdentity(
      project.implementation_project_id,
      request.field_owner_ref,
      fieldName,
      policyVersionId,
    );
    if (existing) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NaturalLanguageFieldRole already exists for ${request.field_owner_ref.ref_type}:${request.field_owner_ref.ref_id}.${fieldName}.`,
      );
    }
    const record: NaturalLanguageFieldRoleRecord = {
      field_role_record_id: this.idFactory('natural_language_field_role'),
      implementation_project_id: project.implementation_project_id,
      field_owner_ref: request.field_owner_ref,
      field_name: fieldName,
      field_role: request.field_role,
      can_feed_workflow: request.can_feed_workflow,
      can_feed_hard_gate: request.can_feed_hard_gate,
      can_be_cited: request.can_be_cited,
      policy_version_id: policyVersionId,
      created_by: request.created_by ?? 'system',
      created_at: this.now(),
    };
    return this.traceRepository.createNaturalLanguageFieldRole(record);
  }

  async evaluateTraceGate(
    implementationProjectId: string,
    request: EvaluateTraceGateRequest,
  ): Promise<TraceGateResult> {
    await this.requireProject(implementationProjectId);
    const manifest = await this.requireTraceManifest(implementationProjectId, request.trace_manifest_id);
    const queueItems = await this.traceRepository.listTraceRepairQueueItemsByManifest(
      implementationProjectId,
      manifest.trace_manifest_id,
    );
    const blockerCodes = Array.from(new Set(queueItems
      .filter((item) => item.status === 'open')
      .map((item) => item.blocker_code)));
    const gateResult: TraceGateResult = {
      gate_result_id: this.idFactory('trace_gate_result'),
      implementation_project_id: implementationProjectId,
      trace_manifest_id: manifest.trace_manifest_id,
      gate_status: this.traceGateStatus(manifest.trace_status),
      trace_status: manifest.trace_status,
      blocker_codes: blockerCodes,
      repair_queue_item_refs: queueItems
        .filter((item) => item.status === 'open')
        .map((item) => this.ref('trace_repair_queue_item', item.queue_item_id, manifest.target_ref.title_card_id ?? null)),
      created_at: this.now(),
    };
    return this.traceRepository.createTraceGateResult(gateResult);
  }

  async findTraceGateResultById(
    implementationProjectId: string,
    gateResultId: string,
  ): Promise<TraceGateResult | null> {
    return this.traceRepository.findTraceGateResultById(implementationProjectId, gateResultId);
  }

  async listTraceRepairQueue(
    implementationProjectId: string,
  ): Promise<TraceRepairQueueItem[]> {
    await this.requireProject(implementationProjectId);
    return this.traceRepository.listTraceRepairQueueItems(implementationProjectId);
  }

  async resolveTraceRepairQueueItem(
    implementationProjectId: string,
    queueItemId: string,
    request: ResolveTraceRepairQueueItemRequest,
  ): Promise<TraceRepairQueueItem> {
    await this.requireProject(implementationProjectId);
    if (!this.hasText(queueItemId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'queue_item_id is required.');
    }
    return this.traceRepository.resolveTraceRepairQueueItem(
      implementationProjectId,
      queueItemId,
      {
        resolved_by: request.resolved_by ?? 'system',
        resolved_at: this.now(),
        resolution_note: request.resolution_note ?? null,
      },
    );
  }

  private async requireProject(implementationProjectId: string) {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    return project;
  }

  private async requireTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest> {
    if (!this.hasText(traceManifestId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'trace_manifest_id is required.');
    }
    const manifest = await this.traceRepository.findTraceManifestById(
      implementationProjectId,
      traceManifestId,
    );
    if (!manifest) {
      throw new AppError(404, 'NOT_FOUND', `TraceManifest ${traceManifestId} not found.`);
    }
    return manifest;
  }

  private normalizeIntegrity(input: Partial<TraceIntegrity> | undefined): TraceIntegrity {
    return {
      missing_refs: input?.missing_refs ?? [],
      broken_refs: input?.broken_refs ?? [],
      stale_refs: input?.stale_refs ?? [],
      invalidated_refs: input?.invalidated_refs ?? [],
      non_citable_refs: input?.non_citable_refs ?? [],
      partial_refs: input?.partial_refs ?? [],
    };
  }

  private withRequiredLineageGaps(
    targetRef: TopicSelectionFunctionalRef,
    lineage: TraceLineageBundle,
    integrity: TraceIntegrity,
  ): TraceIntegrity {
    const normalizedRefType = this.normalizedRefType(targetRef.ref_type);
    const requiredLineages = WRITING_AFFECTING_TARGET_REQUIREMENTS.get(normalizedRefType) ?? [];
    const requiredMissingRefs = requiredLineages
      .filter((lineageType) => !this.hasLineageRefs(lineage, lineageType))
      .map((lineageType) => this.requiredLineageRef(targetRef, lineageType));
    const anyOfLineages = WRITING_AFFECTING_TARGET_ANY_OF_REQUIREMENTS.get(normalizedRefType) ?? [];
    const anyOfSatisfied = anyOfLineages.length === 0
      || anyOfLineages.some((lineageType) => this.hasLineageRefs(lineage, lineageType));
    const anyOfMissingRefs = anyOfSatisfied
      ? []
      : anyOfLineages.map((lineageType) => this.requiredLineageRef(targetRef, lineageType));
    if (requiredMissingRefs.length === 0 && anyOfMissingRefs.length === 0) {
      return integrity;
    }
    return {
      ...integrity,
      missing_refs: this.dedupeRefs([...integrity.missing_refs, ...requiredMissingRefs, ...anyOfMissingRefs]),
    };
  }

  private computeTraceStatus(integrity: TraceIntegrity): PaperImplementationTraceStatus {
    if (integrity.invalidated_refs.length > 0) {
      return 'invalidated';
    }
    if (
      integrity.broken_refs.length > 0
      || integrity.missing_refs.length > 0
      || integrity.non_citable_refs.length > 0
    ) {
      return 'broken';
    }
    if (integrity.stale_refs.length > 0) {
      return 'stale';
    }
    if (integrity.partial_refs.length > 0) {
      return 'partial';
    }
    return 'complete';
  }

  private buildRepairQueueItems(
    manifest: TraceManifest,
    createdBy: TraceRepairQueueItem['created_by'],
    createdAt: string,
  ): TraceRepairQueueItem[] {
    const items: TraceRepairQueueItem[] = [];
    const add = (
      refs: TopicSelectionFunctionalRef[],
      blockerCode: string,
      severity: TopicSelectionSeverity,
    ) => {
      refs.forEach((sourceRef) => {
        items.push({
          queue_item_id: this.idFactory('trace_repair_queue_item'),
          implementation_project_id: manifest.implementation_project_id,
          trace_manifest_id: manifest.trace_manifest_id,
          target_ref: manifest.target_ref,
          lineage_type: this.inferLineageType(sourceRef),
          blocker_code: blockerCode,
          severity,
          status: 'open',
          source_ref: sourceRef,
          created_by: createdBy,
          created_at: createdAt,
          resolution_note: null,
        });
      });
    };
    manifest.integrity.missing_refs.forEach((sourceRef) => {
      items.push({
        queue_item_id: this.idFactory('trace_repair_queue_item'),
        implementation_project_id: manifest.implementation_project_id,
        trace_manifest_id: manifest.trace_manifest_id,
        target_ref: manifest.target_ref,
        lineage_type: this.inferLineageType(sourceRef),
        blocker_code: sourceRef.ref_type.startsWith('required_') ? 'missing_required_lineage' : 'missing_ref',
        severity: 'blocking',
        status: 'open',
        source_ref: sourceRef,
        created_by: createdBy,
        created_at: createdAt,
        resolution_note: null,
      });
    });
    add(manifest.integrity.broken_refs, 'broken_ref', 'blocking');
    add(manifest.integrity.non_citable_refs, 'non_citable_ref', 'blocking');
    add(manifest.integrity.invalidated_refs, 'invalidated_ref', 'critical');
    add(manifest.integrity.stale_refs, 'stale_ref', 'warning');
    add(manifest.integrity.partial_refs, 'partial_trace', 'warning');
    return items;
  }

  private traceGateStatus(
    traceStatus: PaperImplementationTraceStatus,
  ): TraceGateResult['gate_status'] {
    if (traceStatus === 'complete') {
      return 'passed';
    }
    if (traceStatus === 'partial') {
      return 'warning';
    }
    return 'blocked';
  }

  private assertCitationRequest(
    request: CreateCitationCandidateRequest,
    manifest: TraceManifest,
  ): void {
    if (!PAPER_IMPLEMENTATION_CITATION_SOURCE_KINDS.includes(request.source_kind)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CitationCandidate source_kind is not citable.');
    }
    if (!PAPER_IMPLEMENTATION_CITABLE_SOURCE_TYPES.includes(request.source_type)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CitationCandidate source_type is not citable.');
    }
    this.assertFunctionalRef(request.source_evidence_unit_ref, 'source_evidence_unit_ref');
    if (!this.sourceEvidenceUnitKindMatches(request.source_kind, request.source_evidence_unit_ref)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CitationCandidate source_evidence_unit_ref must match source_kind and cannot be memo, summary, rationale, or interpretation text.',
      );
    }
    if (!this.hasText(request.source_locator_id) || request.locator_quality === 'missing') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CitationCandidate requires a valid source_locator_id and locator_quality other than missing.',
      );
    }
    if (request.cited_for.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CitationCandidate requires cited_for.');
    }
    if (request.linked_target_refs.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CitationCandidate requires a linked target.');
    }
    if (!request.linked_target_refs.some((targetRef) => this.sameFunctionalRef(targetRef, manifest.target_ref))) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CitationCandidate linked target must include the referenced TraceManifest target_ref.',
      );
    }
    if (!this.hasText(request.normalized_source_statement)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'normalized_source_statement is required.');
    }
  }

  private assertClaimTraceHasCitableOrExperimentalSupport(lineage: TraceLineageBundle): void {
    const supportRefCount =
      lineage.literature.literature_evidence_refs.length
      + lineage.literature.source_locator_refs.length
      + lineage.literature.citation_candidate_refs.length
      + lineage.experiment.experiment_plan_refs.length
      + lineage.experiment.work_order_refs.length
      + lineage.experiment.run_refs.length
      + lineage.experiment.run_evidence_refs.length
      + lineage.experiment.result_packet_refs.length
      + lineage.experiment.metric_refs.length
      + lineage.artifact.dataset_refs.length
      + lineage.artifact.baseline_refs.length
      + lineage.artifact.code_version_refs.length
      + lineage.artifact.model_checkpoint_refs.length
      + lineage.artifact.config_refs.length
      + lineage.artifact.log_artifact_refs.length;
    const decisionRefCount =
      lineage.decision.validation_cycle_refs.length
      + lineage.decision.motive_evolution_decision_refs.length
      + lineage.decision.gate_result_refs.length
      + lineage.decision.human_decision_refs.length
      + lineage.decision.accepted_risk_refs.length;
    const internalRefCount =
      lineage.internal_interpretation.result_interpretation_refs.length
      + lineage.internal_interpretation.llm_rationale_refs.length
      + lineage.internal_interpretation.board_summary_refs.length
      + lineage.internal_interpretation.non_citable_refs.length;
    if (supportRefCount === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        decisionRefCount > 0 || internalRefCount > 0
          ? 'ClaimTracePacket cannot be supported only by decision, memo, rationale, summary, or internal interpretation lineage.'
          : 'ClaimTracePacket requires citable literature, experiment, or artifact support lineage.',
      );
    }
  }

  private assertFieldRolePolicy(request: RegisterNaturalLanguageFieldRoleRequest): void {
    if (MEMO_OR_INTERPRETATION_ROLES.has(request.field_role)) {
      if (request.can_be_cited || request.can_feed_hard_gate) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `${request.field_role} cannot be cited or feed hard gates.`,
        );
      }
    }
    if (request.field_role === 'semantic_contract' && request.can_be_cited) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'semantic_contract can feed workflow and hard gates but cannot be cited.',
      );
    }
    if (request.field_role === 'human_judgment' && (request.can_be_cited || request.can_feed_hard_gate)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'human_judgment is decision lineage and cannot be cited or directly feed hard gates.',
      );
    }
    if (request.field_role === 'operational_instruction' && (request.can_be_cited || request.can_feed_hard_gate)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'operational_instruction can guide workflow but cannot be cited or feed hard gates.',
      );
    }
  }

  private assertLineageBundle(lineage: TraceLineageBundle): void {
    for (const section of [
      lineage.literature,
      lineage.experiment,
      lineage.artifact,
      lineage.decision,
      lineage.internal_interpretation,
    ]) {
      if (!section || typeof section !== 'object') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'lineage sections are required.');
      }
    }
  }

  private inferLineageType(ref: TopicSelectionFunctionalRef): PaperImplementationTraceLineageType {
    const type = ref.ref_type.toLowerCase();
    const requiredLineageMatch = type.match(/^required_(.+)_lineage$/u);
    if (requiredLineageMatch && PAPER_IMPLEMENTATION_TRACE_LINEAGE_TYPES.includes(
      requiredLineageMatch[1] as PaperImplementationTraceLineageType,
    )) {
      return requiredLineageMatch[1] as PaperImplementationTraceLineageType;
    }
    if (
      type.includes('result_interpretation')
      || type.includes('llm_rationale')
      || type.includes('board_summary')
      || type.includes('non_citable')
      || type.includes('memo')
      || type.includes('summary')
      || type.includes('interpretation')
      || type.includes('rationale')
      || type.includes('discussion_note')
    ) {
      return 'internal_interpretation';
    }
    if (type.includes('literature') || type.includes('source') || type.includes('citation')) {
      return 'literature';
    }
    if (type.includes('run') || type.includes('metric') || type.includes('work_order') || type.includes('result')) {
      return 'experiment';
    }
    if (
      type.includes('dataset')
      || type.includes('baseline')
      || type.includes('code')
      || type.includes('checkpoint')
      || type.includes('config')
      || type.includes('artifact')
      || type.includes('log')
    ) {
      return 'artifact';
    }
    if (type.includes('decision') || type.includes('gate') || type.includes('risk') || type.includes('human')) {
      return 'decision';
    }
    return 'internal_interpretation';
  }

  private hasLineageRefs(
    lineage: TraceLineageBundle,
    lineageType: PaperImplementationTraceLineageType,
  ): boolean {
    switch (lineageType) {
      case 'literature':
        return lineage.literature.literature_evidence_refs.length
          + lineage.literature.source_locator_refs.length
          + lineage.literature.citation_candidate_refs.length > 0;
      case 'experiment':
        return lineage.experiment.experiment_plan_refs.length
          + lineage.experiment.work_order_refs.length
          + lineage.experiment.run_refs.length
          + lineage.experiment.run_evidence_refs.length
          + lineage.experiment.result_packet_refs.length
          + lineage.experiment.metric_refs.length > 0;
      case 'artifact':
        return lineage.artifact.dataset_refs.length
          + lineage.artifact.baseline_refs.length
          + lineage.artifact.code_version_refs.length
          + lineage.artifact.model_checkpoint_refs.length
          + lineage.artifact.config_refs.length
          + lineage.artifact.log_artifact_refs.length > 0;
      case 'decision':
        return lineage.decision.validation_cycle_refs.length
          + lineage.decision.motive_evolution_decision_refs.length
          + lineage.decision.gate_result_refs.length
          + lineage.decision.human_decision_refs.length
          + lineage.decision.accepted_risk_refs.length > 0;
      case 'internal_interpretation':
        return lineage.internal_interpretation.result_interpretation_refs.length
          + lineage.internal_interpretation.llm_rationale_refs.length
          + lineage.internal_interpretation.board_summary_refs.length
          + lineage.internal_interpretation.non_citable_refs.length > 0;
    }
  }

  private requiredLineageRef(
    targetRef: TopicSelectionFunctionalRef,
    lineageType: PaperImplementationTraceLineageType,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: `required_${lineageType}_lineage`,
      ref_id: `${targetRef.ref_type}:${targetRef.ref_id}`,
      title_card_id: targetRef.title_card_id ?? null,
      version_id: targetRef.version_id ?? null,
      legacy_ref: {
        target_ref: targetRef,
        required_lineage_type: lineageType,
      },
    };
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const deduped: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(ref);
      }
    }
    return deduped;
  }

  private sourceEvidenceUnitKindMatches(
    sourceKind: CreateCitationCandidateRequest['source_kind'],
    sourceEvidenceUnitRef: TopicSelectionFunctionalRef,
  ): boolean {
    const refType = this.normalizedRefType(sourceEvidenceUnitRef.ref_type);
    if (
      refType.includes('memo')
      || refType.includes('summary')
      || refType.includes('rationale')
      || refType.includes('interpretation')
      || refType.includes('humandiscussionnote')
      || refType.includes('noncitable')
    ) {
      return false;
    }
    if (sourceKind === 'literature_evidence_unit') {
      return refType === 'literatureevidenceunit';
    }
    return refType === 'citablesourceevidenceunit';
  }

  private sameFunctionalRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    const leftTitleCardId = left.title_card_id ?? null;
    const rightTitleCardId = right.title_card_id ?? null;
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (!leftTitleCardId || !rightTitleCardId || leftTitleCardId === rightTitleCardId);
  }

  private prioritizeManifestTargetRef(
    refs: TopicSelectionFunctionalRef[],
    targetRef: TopicSelectionFunctionalRef,
  ): TopicSelectionFunctionalRef[] {
    const targetIndex = refs.findIndex((ref) => this.sameFunctionalRef(ref, targetRef));
    if (targetIndex <= 0) {
      return refs;
    }
    return [
      refs[targetIndex] as TopicSelectionFunctionalRef,
      ...refs.slice(0, targetIndex),
      ...refs.slice(targetIndex + 1),
    ];
  }

  private normalizedRefType(refType: string): string {
    return normalizedPaperImplementationRefType(refType);
  }

  private assertFunctionalRef(ref: TopicSelectionFunctionalRef, fieldName: string): void {
    if (!ref || !this.hasText(ref.ref_type) || !this.hasText(ref.ref_id)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} must include ref_type and ref_id.`);
    }
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string | null,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
      version_id: versionId ?? null,
    };
  }

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
