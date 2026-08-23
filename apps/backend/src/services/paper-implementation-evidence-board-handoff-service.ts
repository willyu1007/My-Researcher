import {
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_HANDOFF_RESUME_POLICY,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_HANDOFF_SCHEMA_VERSION,
  type CreatePaperImplementationEvidenceBoardHandoffRequest,
  type ImplementationIntakeSnapshot,
  type PaperImplementationEvidenceBoardHandoffBlocker,
  type PaperImplementationEvidenceBoardHandoffEffect,
  type PaperImplementationEvidenceBoardHandoffResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CoreMotiveIdentity,
  CoreMotiveVersion,
  CoreMotiveVersionState,
  CreateEvidenceBindingInput,
  EvidenceBinding,
  MotiveAssertion,
  MotiveEvidenceBoardVersion,
  MotiveEvidenceBindingScope,
  PaperImplementationMotiveSupportLevel,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_ID,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_VERSION,
  PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID,
  type PaperImplementationEvidenceBoardBindingCandidateProposal,
  type PaperImplementationEvidenceBoardCandidateStrength,
  type PaperImplementationEvidenceBoardCurationArtifact,
  type PaperImplementationRuntimeArtifactEnvelope,
  type RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  CitationCandidate,
  CreateCitationCandidateRequest,
  SourceLocatorPayload,
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationRuntimeRepository } from '../repositories/paper-implementation-runtime.repository.js';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import type { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';
import type { PaperImplementationRunCoordinatorService } from './paper-implementation-run-coordinator-service.js';
import type { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';

type HandoffTraceKernel = Pick<
  PaperImplementationTraceKernelService,
  'ensureTraceManifest' | 'ensureReviewedCitationCandidate' | 'getTraceManifest' | 'listCitationCandidates'
>;

type HandoffCoordinator = Pick<
  PaperImplementationRunCoordinatorService,
  'createCoordinatorRun' | 'getCoordinatorRun' | 'advance'
>;

type HandoffBoardWriter = Pick<
  PaperImplementationMotiveEvidenceBoardService,
  'createMotiveEvidenceBoardVersion'
>;

export interface PaperImplementationEvidenceBoardHandoffServiceOptions {
  projectRepository: PaperImplementationRepository;
  motiveRepository: PaperImplementationMotiveRepository;
  evidenceMapRepository: TopicSelectionEvidenceMapRepository;
  runtimeRepository: Pick<PaperImplementationRuntimeRepository, 'findRuntimeArtifactById'>;
  traceKernel: HandoffTraceKernel;
  boardWriter: HandoffBoardWriter;
  coordinator: HandoffCoordinator;
}

interface OwnerContext {
  snapshot: ImplementationIntakeSnapshot;
  motive: CoreMotiveIdentity;
  version: CoreMotiveVersion;
  state: CoreMotiveVersionState;
  assertions: MotiveAssertion[];
  requiredAssertions: MotiveAssertion[];
}

interface SourceContext {
  units: TopicSelectionEvidenceUnitRecord[];
  refs: TopicSelectionFunctionalRef[];
  hashes: string[];
  locatorRefs: TopicSelectionFunctionalRef[];
  citationCandidates: CitationCandidate[];
  citationTraceManifests: TraceManifest[];
  packets: NonNullable<RunPaperImplementationEvidenceBoardCurationRuntimeRequest['source_context_packets']>;
}

interface ResponseState {
  performed: PaperImplementationEvidenceBoardHandoffEffect[];
  reused: PaperImplementationEvidenceBoardHandoffEffect[];
  source: SourceContext | null;
  coordinatorRunId: string | null;
  curationArtifact: PaperImplementationRuntimeArtifactEnvelope | null;
  board: MotiveEvidenceBoardVersion | null;
  bindings: EvidenceBinding[];
  traceManifestIds: string[];
  gaps: string[];
}

export class PaperImplementationEvidenceBoardHandoffService {
  private readonly inFlight = new Map<string, Promise<PaperImplementationEvidenceBoardHandoffResponse>>();

  constructor(private readonly options: PaperImplementationEvidenceBoardHandoffServiceOptions) {}

  async continue(
    request: CreatePaperImplementationEvidenceBoardHandoffRequest,
  ): Promise<PaperImplementationEvidenceBoardHandoffResponse> {
    if (!request.implementation_project_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const projectId = request.implementation_project_id.trim();
    const existing = this.inFlight.get(projectId);
    if (existing) return existing;
    const current = this.continueOnce(projectId).finally(() => {
      if (this.inFlight.get(projectId) === current) this.inFlight.delete(projectId);
    });
    this.inFlight.set(projectId, current);
    return current;
  }

  private async continueOnce(
    implementationProjectId: string,
  ): Promise<PaperImplementationEvidenceBoardHandoffResponse> {
    const owner = await this.readOwner(implementationProjectId);
    const state: ResponseState = {
      performed: [],
      reused: [],
      source: null,
      coordinatorRunId: null,
      curationArtifact: null,
      board: null,
      bindings: [],
      traceManifestIds: [],
      gaps: [],
    };
    const existingBoard = await this.readEligibleCurrentBoard(owner);
    const sourceResult = await this.resolveSources(owner);
    if ('blocker' in sourceResult) {
      return this.blocked(owner, state, 'source_resolution', sourceResult.blocker);
    }
    state.source = sourceResult.source;

    if (existingBoard) {
      const source = await this.recoverExistingCitationContext(
        owner,
        sourceResult.source,
        existingBoard.traces,
      );
      state.source = source;
      state.traceManifestIds.push(...source.citationTraceManifests.map((trace) => trace.trace_manifest_id));
      if (source.citationCandidates.length > 0) this.effect(state, 'citation_context', false);
      const curationRuntimeArtifactRef = existingBoard.traces
        .flatMap((trace) => trace.lineage.internal_interpretation.llm_rationale_refs)
        .find((ref) => this.normalizedType(ref.ref_type) === 'paperimplementationruntimeartifact') ?? null;
      const curationArtifact = curationRuntimeArtifactRef
        ? await this.options.runtimeRepository.findRuntimeArtifactById(
          owner.snapshot.implementation_project_id,
          curationRuntimeArtifactRef.ref_id,
        )
        : null;
      if (curationRuntimeArtifactRef && !curationArtifact) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'The current Evidence Board is missing its persisted curation runtime authority.',
        );
      }
      state.coordinatorRunId = curationArtifact
        ? this.curationCoordinatorRunId(owner, source)
        : null;
      state.curationArtifact = curationArtifact;
      state.board = existingBoard.board;
      state.bindings = existingBoard.bindings;
      state.traceManifestIds.push(...existingBoard.traceManifestIds);
      if (curationArtifact) this.effect(state, 'curation_artifact', false);
      this.effect(state, 'trace_manifests', false);
      this.effect(state, 'evidence_board', false);
      return this.success(owner, state, false);
    }

    const citations = await this.ensureReviewedCitations(owner, sourceResult.source);
    state.source = citations.source;
    state.traceManifestIds.push(...citations.source.citationTraceManifests.map((trace) => trace.trace_manifest_id));
    this.effect(state, 'citation_context', citations.created);

    const curation = await this.ensureCuration(owner, citations.source);
    state.coordinatorRunId = curation.coordinatorRunId;
    state.curationArtifact = curation.artifact;
    if (curation.artifact) this.effect(state, 'curation_artifact', curation.performed);
    if (curation.blocker) {
      state.gaps = curation.gaps;
      return this.blocked(owner, state, 'curation', curation.blocker);
    }
    if (!curation.artifact) {
      return this.blocked(owner, state, 'curation', {
        code: 'EVIDENCE_BOARD_CURATION_ARTIFACT_MISSING',
        message: 'The curation coordinator did not persist an admitted final artifact.',
        source: 'domain',
        retryable: true,
      });
    }

    const artifact = this.parseCurationArtifact(curation.artifact);
    const candidates = this.acceptedCandidates(owner, citations.source, artifact);
    if ('blocker' in candidates) {
      state.gaps = candidates.gaps;
      return this.blocked(owner, state, 'board_write', candidates.blocker);
    }

    const written = await this.ensureBoard(owner, state, citations.source, artifact, candidates.candidates);
    state.board = written.board;
    state.bindings = written.bindings;
    state.traceManifestIds.push(...written.traceManifestIds);
    this.effect(state, 'trace_manifests', written.tracesCreated);
    this.effect(state, 'evidence_board', written.boardCreated);
    return this.success(owner, state, written.boardCreated);
  }

  private async readOwner(implementationProjectId: string): Promise<OwnerContext> {
    const project = await this.options.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    const snapshot = await this.options.projectRepository.findIntakeSnapshotByProjectId(implementationProjectId);
    if (!snapshot) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ImplementationProject has no persisted intake snapshot.');
    }
    if (
      project.lifecycle_status !== 'active'
      || project.freshness_status !== 'fresh'
      || project.source_status !== 'active'
      || snapshot.source_status !== 'active'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Evidence Board handoff requires an active, fresh ImplementationProject and intake snapshot.',
      );
    }
    const set = await this.options.motiveRepository.findMotiveSet(implementationProjectId);
    const motiveId = set?.primary_motive_ids[0] ?? null;
    if (!motiveId || set?.primary_motive_ids.length !== 1) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Evidence Board handoff requires exactly one admitted primary CoreMotive.',
      );
    }
    const motive = await this.options.motiveRepository.findMotiveIdentityById(implementationProjectId, motiveId);
    const versionId = motive?.current_version_id ?? null;
    const version = versionId
      ? await this.options.motiveRepository.findCoreMotiveVersionById(implementationProjectId, versionId)
      : null;
    if (!motive || !version || version.version_status !== 'admitted') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Evidence Board handoff requires an admitted current CoreMotiveVersion.',
      );
    }
    const state = await this.options.motiveRepository.findMotiveVersionStateByVersionId(
      implementationProjectId,
      version.core_motive_version_id,
    );
    const assertions = await this.options.motiveRepository.listAssertionsByVersion(
      implementationProjectId,
      version.core_motive_version_id,
    );
    const requiredAssertions = assertions.filter((assertion) =>
      assertion.importance.role === 'core' || assertion.importance.must_hold_for_motive_to_continue);
    if (!state || assertions.length === 0 || requiredAssertions.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Admitted CoreMotiveVersion is missing state or required assertions.',
      );
    }
    return { snapshot, motive, version, state, assertions, requiredAssertions };
  }

  private async readEligibleCurrentBoard(owner: OwnerContext): Promise<{
    board: MotiveEvidenceBoardVersion;
    bindings: EvidenceBinding[];
    traces: TraceManifest[];
    traceManifestIds: string[];
  } | null> {
    if (!owner.state.current_board_version_id) return null;
    const board = await this.options.motiveRepository.findMotiveEvidenceBoardById(
      owner.snapshot.implementation_project_id,
      owner.state.current_board_version_id,
    );
    if (!board) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CoreMotiveVersion points to a missing current Evidence Board.');
    }
    if (
      board.core_motive_version_id !== owner.version.core_motive_version_id
      || board.board_state.readiness_status !== 'evidence_ready'
      || board.board_state.freshness_status !== 'fresh'
      || board.board_state.blocker_status !== 'none'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'The current Evidence Board is not fresh, unblocked, and evidence-ready.',
      );
    }
    const bindings = await Promise.all(board.evidence_binding_refs.map(async (ref) => {
      const binding = await this.options.motiveRepository.findEvidenceBindingById(
        owner.snapshot.implementation_project_id,
        ref.ref_id,
      );
      if (!binding) throw new AppError(409, 'VERSION_CONFLICT', `EvidenceBinding ${ref.ref_id} is missing.`);
      return binding;
    }));
    const traces = await Promise.all([
      ...bindings.map((binding) => binding.trace_manifest_id),
      board.trace_manifest_id,
    ].map((traceId) => this.options.traceKernel.getTraceManifest(
      owner.snapshot.implementation_project_id,
      traceId,
    )));
    if (traces.some((trace) => trace.trace_status !== 'complete')) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The current Evidence Board has incomplete trace authority.');
    }
    return {
      board,
      bindings,
      traces,
      traceManifestIds: traces.map((trace) => trace.trace_manifest_id),
    };
  }

  private async resolveSources(owner: OwnerContext): Promise<
    { source: SourceContext } | { blocker: PaperImplementationEvidenceBoardHandoffBlocker }
  > {
    const selectedRefs = this.uniqueRefs(owner.snapshot.source_refs.filter((ref) =>
      this.normalizedType(ref.ref_type) === 'evidenceunit'));
    if (selectedRefs.length === 0) {
      return { blocker: {
        code: 'EVIDENCE_BOARD_SOURCE_EVIDENCE_MISSING',
        message: 'The accepted intake snapshot has no selected EvidenceUnit that can seed a traceable board.',
        source: 'owner_state',
        retryable: false,
      } };
    }
    const maps = await this.options.evidenceMapRepository.listEvidenceMapsByTitleCardId(
      owner.snapshot.title_card_id,
    );
    const eligibleMaps = maps.filter((map) =>
      map.status === 'ready'
      && map.freshness_status === 'current'
      && ['machine_checked', 'human_reviewed'].includes(map.review_status));
    const units = (await Promise.all(maps.map((map) =>
      this.options.evidenceMapRepository.listEvidenceUnitsByEvidenceMapId(map.evidence_map_id))))
      .flat();
    const eligibleMapIds = new Set(eligibleMaps.map((map) => map.evidence_map_id));
    const byId = new Map(units.map((unit) => [unit.evidence_unit_id, unit]));
    const selectedUnits = selectedRefs
      .map((ref) => byId.get(ref.ref_id) ?? null)
      .filter((unit): unit is TopicSelectionEvidenceUnitRecord => unit !== null);
    if (selectedUnits.length !== selectedRefs.length) {
      return { blocker: {
        code: 'EVIDENCE_BOARD_SOURCE_EVIDENCE_UNRESOLVED',
        message: 'One or more accepted EvidenceUnit refs cannot be resolved from persisted EvidenceMap owner state.',
        source: 'owner_state',
        retryable: false,
      } };
    }
    const unusable = selectedUnits.find((unit) =>
      !eligibleMapIds.has(unit.evidence_map_id)
      || !['machine_checked', 'human_reviewed'].includes(unit.review_status)
      || unit.freshness_status !== 'current'
      || unit.issue_codes.includes('REVIEW_REQUIRED')
      || unit.source_attribution_kind === 'llm_inference'
      || !unit.locator?.locator_ref?.ref_id
      || !unit.source_statement.trim());
    if (unusable) {
      return { blocker: {
        code: 'EVIDENCE_BOARD_SOURCE_EVIDENCE_NOT_REVIEWED_OR_FRESH',
        message: `EvidenceUnit ${unusable.evidence_unit_id} is not current, reviewed, traceable source evidence.`,
        source: 'domain',
        retryable: false,
      } };
    }
    const refs = selectedUnits.map((unit) => this.ref(
      'evidence_unit',
      unit.evidence_unit_id,
      owner.snapshot.title_card_id,
      unit.evidence_map_version,
    ));
    return { source: {
      units: selectedUnits,
      refs,
      hashes: selectedUnits.map((unit) => sha256Text(stableStringify(unit))),
      locatorRefs: this.uniqueRefs(selectedUnits.map((unit) => unit.locator.locator_ref)),
      citationCandidates: [],
      citationTraceManifests: [],
      packets: [],
    } };
  }

  private async ensureReviewedCitations(owner: OwnerContext, source: SourceContext): Promise<{
    source: SourceContext;
    created: boolean;
  }> {
    let created = false;
    const citationCandidates: CitationCandidate[] = [];
    const citationTraceManifests: TraceManifest[] = [];
    const packets: SourceContext['packets'] = [];
    for (const [index, unit] of source.units.entries()) {
      const evidenceRef = source.refs[index]!;
      const sourceHash = source.hashes[index]!;
      const locatorRef = unit.locator.locator_ref;
      const citationCandidateId = this.id('citation_candidate', stableStringify({
        implementation_project_id: owner.snapshot.implementation_project_id,
        evidence_ref: evidenceRef,
        source_hash: sourceHash,
      }));
      const citationTarget = this.ref(
        'citation_candidate',
        citationCandidateId,
        owner.snapshot.title_card_id,
        sourceHash,
      );
      const citationLinkTarget = this.ref(
        'core_motive_version',
        owner.version.core_motive_version_id,
        owner.snapshot.title_card_id,
        `v${owner.version.version_number}`,
      );
      const traceId = this.id('trace_manifest', `citation:${citationCandidateId}`);
      const traceResult = await this.options.traceKernel.ensureTraceManifest(
        owner.snapshot.implementation_project_id,
        traceId,
        {
          target_ref: citationLinkTarget,
          lineage: this.traceLineage(owner, [evidenceRef], [locatorRef], []),
          created_by: 'system',
        },
      );
      created ||= traceResult.created;
      citationTraceManifests.push(traceResult.manifest);
      const citationResult = await this.options.traceKernel.ensureReviewedCitationCandidate(
        owner.snapshot.implementation_project_id,
        citationCandidateId,
        this.citationRequest(unit, evidenceRef, citationLinkTarget, traceResult.manifest.trace_manifest_id),
        unit.review_status as 'machine_checked' | 'human_reviewed',
      );
      created ||= citationResult.created;
      citationCandidates.push(citationResult.candidate);
      const packetBase = {
        packet_ref: this.ref(
          'source_context_packet',
          this.id('source_context_packet', `${citationCandidateId}:${sourceHash}`),
          owner.snapshot.title_card_id,
          sourceHash,
        ),
        source_ref: evidenceRef,
        source_hash: sourceHash,
        evidence_kind: 'reviewed_topic_selection_evidence_unit',
        content_summary: unit.normalized_statement?.trim() || unit.source_statement.trim(),
        key_facts: this.uniqueStrings([
          unit.source_statement.trim(),
          `evidence_role=${unit.evidence_role}`,
          `locator_type=${unit.locator.locator_type}`,
          `review_status=${unit.review_status}`,
          ...unit.issue_codes.map((code) => `issue_code=${code}`),
        ]),
        covered_evidence_refs: [evidenceRef],
        covered_source_locator_refs: [locatorRef],
        covered_citation_candidate_refs: [citationTarget],
        covered_trace_manifest_refs: [this.ref(
          'trace_manifest',
          traceResult.manifest.trace_manifest_id,
          owner.snapshot.title_card_id,
        )],
      };
      packets.push({
        ...packetBase,
        packet_hash: sha256Text(stableStringify(packetBase)),
      });
    }
    return {
      created,
      source: { ...source, citationCandidates, citationTraceManifests, packets },
    };
  }

  private async recoverExistingCitationContext(
    owner: OwnerContext,
    source: SourceContext,
    boardTraces: TraceManifest[],
  ): Promise<SourceContext> {
    const refs = this.uniqueRefs(boardTraces.flatMap((trace) =>
      trace.lineage.literature.citation_candidate_refs));
    if (refs.length === 0) return source;
    const allCandidates = await this.options.traceKernel.listCitationCandidates(
      owner.snapshot.implementation_project_id,
    );
    const byId = new Map(allCandidates.map((candidate) => [candidate.citation_candidate_id, candidate]));
    const candidates = refs
      .map((ref) => byId.get(ref.ref_id) ?? null)
      .filter((candidate): candidate is CitationCandidate => candidate !== null);
    if (candidates.length !== refs.length) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'The current Evidence Board references a missing CitationCandidate authority.',
      );
    }
    const citationTraceManifests = await Promise.all(candidates.map((candidate) =>
      this.options.traceKernel.getTraceManifest(
        owner.snapshot.implementation_project_id,
        candidate.trace_manifest_id,
      )));
    if (citationTraceManifests.some((trace) => trace.trace_status !== 'complete')) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'The current Evidence Board references incomplete citation trace authority.',
      );
    }
    return { ...source, citationCandidates: candidates, citationTraceManifests };
  }

  private citationRequest(
    unit: TopicSelectionEvidenceUnitRecord,
    evidenceRef: TopicSelectionFunctionalRef,
    linkedTarget: TopicSelectionFunctionalRef,
    traceManifestId: string,
  ): CreateCitationCandidateRequest {
    return {
      trace_manifest_id: traceManifestId,
      source_kind: 'literature_evidence_unit',
      source_type: 'paper',
      source_id: unit.literature_ref.ref_id,
      source_evidence_unit_ref: evidenceRef,
      source_locator_id: unit.locator.locator_ref.ref_id,
      locator_quality: unit.locator.locator_type === 'manual' ? 'approximate' : 'exact',
      locator: this.locatorPayload(unit),
      cited_for: this.citedFor(unit),
      linked_target_refs: [linkedTarget],
      normalized_source_statement: unit.normalized_statement?.trim() || unit.source_statement.trim(),
      citation_limitation: this.uniqueStrings([
        ...(unit.abstract_only ? ['Abstract-only evidence.'] : []),
        ...unit.issue_codes,
      ]).join(' ') || null,
      created_by: 'system',
    };
  }

  private locatorPayload(unit: TopicSelectionEvidenceUnitRecord): SourceLocatorPayload {
    const locator = unit.locator;
    return {
      section: locator.section_ref?.ref_id
        ?? (locator.locator_type === 'abstract' ? 'abstract' : null),
      page: locator.page_number === null || locator.page_number === undefined
        ? null
        : String(locator.page_number),
      paragraph: locator.paragraph_ref?.ref_id ?? null,
      quote_or_span_ref: locator.anchor_ref?.ref_id ?? locator.quote_hash ?? locator.manual_label ?? null,
      extraction_artifact_ref: locator.content_ref?.ref_id ?? locator.locator_ref.ref_id,
    };
  }

  private citedFor(unit: TopicSelectionEvidenceUnitRecord): CreateCitationCandidateRequest['cited_for'] {
    switch (unit.evidence_role) {
      case 'challenge': return ['counter_evidence', 'limitation'];
      case 'baseline': return ['baseline_gap', 'method_prior_art'];
      case 'context': return ['method_prior_art', 'dataset_context'];
      default: return ['motivation_pressure', 'current_solution_insufficiency'];
    }
  }

  private async ensureCuration(owner: OwnerContext, source: SourceContext): Promise<{
    coordinatorRunId: string;
    artifact: PaperImplementationRuntimeArtifactEnvelope | null;
    performed: boolean;
    blocker: PaperImplementationEvidenceBoardHandoffBlocker | null;
    gaps: string[];
  }> {
    const motiveTrace = owner.version.trace_manifest_id
      ? await this.options.traceKernel.getTraceManifest(
        owner.snapshot.implementation_project_id,
        owner.version.trace_manifest_id,
      )
      : null;
    if (!motiveTrace || motiveTrace.trace_status !== 'complete') {
      return {
        coordinatorRunId: this.id('pi_coordinator_run', owner.version.core_motive_version_id),
        artifact: null,
        performed: false,
        blocker: {
          code: 'EVIDENCE_BOARD_CORE_MOTIVE_TRACE_INCOMPLETE',
          message: 'The admitted CoreMotiveVersion is missing its complete trace manifest.',
          source: 'owner_state',
          retryable: false,
        },
        gaps: [],
      };
    }
    const coordinatorRunId = this.curationCoordinatorRunId(owner, source);
    const targetAssertionRefs = owner.assertions.map((assertion) => this.ref(
      'motive_assertion', assertion.assertion_id, owner.snapshot.title_card_id,
    ));
    const traceManifests = [motiveTrace, ...source.citationTraceManifests];
    const slotRequest: Omit<
      RunPaperImplementationEvidenceBoardCurationRuntimeRequest,
      'run_mode' | 'execution_mode'
    > = {
      curation_mode: 'seed_initial_board_candidates',
      target_ref: this.ref(
        'core_motive_version',
        owner.version.core_motive_version_id,
        owner.snapshot.title_card_id,
        `v${owner.version.version_number}`,
      ),
      target_version_id: `v${owner.version.version_number}`,
      target_motive_ref: this.ref('core_motive', owner.motive.motive_id, owner.snapshot.title_card_id),
      target_core_motive_version_ref: this.ref(
        'core_motive_version', owner.version.core_motive_version_id, owner.snapshot.title_card_id,
      ),
      target_assertion_refs: targetAssertionRefs,
      input_snapshot_ref: this.ref(
        'implementation_intake_snapshot',
        owner.snapshot.intake_snapshot_id,
        owner.snapshot.title_card_id,
        owner.snapshot.intake_snapshot_hash,
      ),
      input_snapshot_hash: this.hash(owner.snapshot.intake_snapshot_hash),
      source_refs: source.refs,
      source_hashes: source.hashes,
      source_context_packets: source.packets,
      trace_manifest_refs: traceManifests.map((trace) => this.ref(
        'trace_manifest', trace.trace_manifest_id, owner.snapshot.title_card_id,
      )),
      trace_manifest_hashes: traceManifests.map((trace) => sha256Text(stableStringify(trace))),
      source_locator_refs: source.locatorRefs,
      citation_candidate_refs: source.citationCandidates.map((candidate) => this.ref(
        'citation_candidate', candidate.citation_candidate_id, owner.snapshot.title_card_id,
      )),
      reviewed_citation_candidate_refs: source.citationCandidates.map((candidate) => this.ref(
        'citation_candidate', candidate.citation_candidate_id, owner.snapshot.title_card_id,
      )),
      evidence_refs: source.refs,
      existing_evidence_binding_refs: [],
      existing_bound_evidence_refs: [],
      accepted_risk_refs: owner.state.accepted_risk_refs,
      freshness_policy: {
        stale_evidence_requires_gap_candidate: true,
        unreviewed_citation_requires_gap_candidate: true,
        duplicate_existing_binding_requires_gap_candidate: true,
      },
      secondary_evidence_transfer_binding_refs: [],
      secondary_cross_board_review_refs: [],
      secondary_trace_repair_queue_refs: [],
      preflight_blocker_codes: [],
    };
    let created = false;
    try {
      await this.options.coordinator.createCoordinatorRun(owner.snapshot.implementation_project_id, {
        coordinator_run_id: coordinatorRunId,
        lane_id: 'evidence-board-curation',
        run_mode: 'product',
        execution_mode: 'provider_llm',
        model_profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
        budget_envelope: { max_steps: 1, max_provider_calls: 2 },
        slot_request_payloads: {
          [PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID]: slotRequest,
        },
      });
      created = true;
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') throw error;
    }
    let run = await this.options.coordinator.getCoordinatorRun(
      owner.snapshot.implementation_project_id,
      coordinatorRunId,
    );
    this.assertCurationRun(run.run.lane_id, run.run.slot_request_payloads, slotRequest);
    let performed = false;
    if (['created', 'advancing'].includes(run.run.run_status)) {
      try {
        run = await this.options.coordinator.advance(
          owner.snapshot.implementation_project_id,
          coordinatorRunId,
        );
        performed = true;
      } catch (error) {
        if (!(error instanceof AppError) || error.errorCode !== 'CONCURRENT_ADVANCE') throw error;
        return {
          coordinatorRunId,
          artifact: null,
          performed: false,
          blocker: {
            code: 'EVIDENCE_BOARD_CURATION_IN_PROGRESS',
            message: 'The persisted curation run is currently advancing; repeat the same handoff.',
            source: 'provider',
            retryable: true,
          },
          gaps: [],
        };
      }
    }
    const step = [...run.steps].reverse().find((item) => item.runtime_artifact_id) ?? null;
    const artifact = step?.runtime_artifact_id
      ? await this.options.runtimeRepository.findRuntimeArtifactById(
        owner.snapshot.implementation_project_id,
        step.runtime_artifact_id,
      )
      : null;
    if (!artifact) {
      return {
        coordinatorRunId,
        artifact: null,
        performed,
        blocker: {
          code: 'EVIDENCE_BOARD_CURATION_DID_NOT_COMPLETE',
          message: `Curation run ${coordinatorRunId} stopped in ${run.run.run_status} without an admitted final artifact.`,
          source: run.run.run_status === 'failed' ? 'provider' : 'domain',
          retryable: created || performed,
        },
        gaps: [],
      };
    }
    const parsed = this.parseCurationArtifact(artifact);
    const gaps = parsed.gap_candidate_proposals.map((gap) => gap.missing_evidence_need);
    if (
      run.run.run_status !== 'completed'
      || parsed.status !== 'passed'
      || parsed.recommended_disposition !== 'proceed'
      || gaps.length > 0
    ) {
      return {
        coordinatorRunId,
        artifact,
        performed,
        blocker: {
          code: 'EVIDENCE_BOARD_CURATION_GAPS_REMAIN',
          message: gaps[0] ?? parsed.blockers[0] ?? 'Curation did not produce a gap-free viable binding set.',
          source: 'domain',
          retryable: false,
        },
        gaps,
      };
    }
    return { coordinatorRunId, artifact, performed, blocker: null, gaps: [] };
  }

  private assertCurationRun(
    laneId: string,
    payloads: Record<string, Record<string, unknown>>,
    expected: Omit<RunPaperImplementationEvidenceBoardCurationRuntimeRequest, 'run_mode' | 'execution_mode'>,
  ): void {
    if (
      laneId !== 'evidence-board-curation'
      || stableStringify(payloads[PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID])
        !== stableStringify(expected)
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Deterministic curation run identity is bound to different owner state.');
    }
  }

  private parseCurationArtifact(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): PaperImplementationEvidenceBoardCurationArtifact {
    const payload = artifact.artifact_payload;
    if (
      artifact.slot_id !== PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_SLOT_ID
      || !Array.isArray(payload.binding_candidate_proposals)
      || !Array.isArray(payload.gap_candidate_proposals)
      || typeof payload.status !== 'string'
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Persisted curation artifact no longer matches its admitted contract.');
    }
    return payload as unknown as PaperImplementationEvidenceBoardCurationArtifact;
  }

  private acceptedCandidates(
    owner: OwnerContext,
    source: SourceContext,
    artifact: PaperImplementationEvidenceBoardCurationArtifact,
  ): { candidates: PaperImplementationEvidenceBoardBindingCandidateProposal[] } | {
    blocker: PaperImplementationEvidenceBoardHandoffBlocker;
    gaps: string[];
  } {
    const evidenceKeys = new Set(source.refs.map((ref) => this.refKey(ref)));
    const locatorKeys = new Set(source.locatorRefs.map((ref) => this.refKey(ref)));
    const citationKeys = new Set(source.citationCandidates.map((candidate) =>
      this.refKey(this.ref('citation_candidate', candidate.citation_candidate_id, owner.snapshot.title_card_id))));
    const assertionIds = new Set(owner.assertions.map((assertion) => assertion.assertion_id));
    const candidates = artifact.binding_candidate_proposals.filter((candidate) => {
      const assertion = owner.assertions.find((item) =>
        item.assertion_id === candidate.target_assertion_ref.ref_id);
      return candidate.support_state === 'viable_binding'
      && candidate.challenge_status === 'passed'
      && candidate.freshness_status === 'fresh'
      && candidate.proposed_strength !== 'blocked'
      && candidate.blocker_codes.length === 0
      && candidate.challenge_check.should_downgrade_to_gap === false
      && candidate.challenge_check.blocking_reason_codes.length === 0
      && assertion !== undefined
      && assertionIds.has(candidate.target_assertion_ref.ref_id)
      && this.meetsMinimumSupport(
        candidate.proposed_strength,
        assertion.validation_requirements.minimum_support_level,
      )
      && evidenceKeys.has(this.refKey(candidate.evidence_ref))
      && candidate.source_locator_refs.length > 0
      && candidate.source_locator_refs.every((ref) => locatorKeys.has(this.refKey(ref)))
      && candidate.citation_candidate_refs.length > 0
      && candidate.citation_candidate_refs.every((ref) => citationKeys.has(this.refKey(ref)));
    });
    const covered = new Set(candidates.map((candidate) => candidate.target_assertion_ref.ref_id));
    const missing = owner.requiredAssertions.filter((assertion) => !covered.has(assertion.assertion_id));
    if (
      candidates.length !== artifact.binding_candidate_proposals.length
      || artifact.gap_candidate_proposals.length > 0
      || missing.length > 0
    ) {
      const gaps = [
        ...artifact.gap_candidate_proposals.map((gap) => gap.missing_evidence_need),
        ...missing.map((assertion) => `No viable fresh binding covers required assertion ${assertion.assertion_id}.`),
      ];
      return { blocker: {
        code: 'EVIDENCE_BOARD_REQUIRED_ASSERTION_COVERAGE_INCOMPLETE',
        message: gaps[0] ?? 'Curation output contains a blocked, stale, or untraceable binding candidate.',
        source: 'domain',
        retryable: false,
      }, gaps };
    }
    return { candidates };
  }

  private async ensureBoard(
    owner: OwnerContext,
    state: ResponseState,
    source: SourceContext,
    artifact: PaperImplementationEvidenceBoardCurationArtifact,
    candidates: PaperImplementationEvidenceBoardBindingCandidateProposal[],
  ): Promise<{
    board: MotiveEvidenceBoardVersion;
    bindings: EvidenceBinding[];
    traceManifestIds: string[];
    tracesCreated: boolean;
    boardCreated: boolean;
  }> {
    const artifactHash = state.curationArtifact?.final_artifact_hash
      ?? state.curationArtifact?.artifact_payload_hash
      ?? sha256Text(stableStringify(artifact));
    const boardVersionId = this.id('motive_evidence_board_version', stableStringify({
      core_motive_version_id: owner.version.core_motive_version_id,
      curation_artifact_hash: artifactHash,
    }));
    const bindingInputs: CreateEvidenceBindingInput[] = [];
    const traceManifestIds: string[] = [];
    let tracesCreated = false;
    for (const candidate of candidates) {
      const assertion = owner.assertions.find((item) =>
        item.assertion_id === candidate.target_assertion_ref.ref_id)!;
      const sourceUnit = source.units.find((unit) => unit.evidence_unit_id === candidate.evidence_ref.ref_id)!;
      const bindingId = this.id('evidence_binding', stableStringify({
        board_version_id: boardVersionId,
        candidate_key: candidate.candidate_key,
        assertion_id: assertion.assertion_id,
        evidence_ref: candidate.evidence_ref,
      }));
      const traceId = this.id('trace_manifest', `binding:${bindingId}`);
      const trace = await this.options.traceKernel.ensureTraceManifest(
        owner.snapshot.implementation_project_id,
        traceId,
        {
          target_ref: this.ref('evidence_binding', bindingId, owner.snapshot.title_card_id, artifactHash),
          lineage: this.traceLineage(
            owner,
            [candidate.evidence_ref],
            candidate.source_locator_refs,
            candidate.citation_candidate_refs,
            state.curationArtifact,
          ),
          created_by: 'system',
        },
      );
      tracesCreated ||= trace.created;
      traceManifestIds.push(trace.manifest.trace_manifest_id);
      bindingInputs.push({
        binding_id: bindingId,
        assertion_id: assertion.assertion_id,
        evidence_ref: candidate.evidence_ref,
        role: this.bindingRole(candidate),
        scope: this.bindingScope(owner.version, candidate),
        strength: this.bindingStrength(candidate),
        support_state: candidate.proposed_strength === 'strong'
          ? 'strong'
          : candidate.proposed_strength === 'moderate' ? 'partial' : 'weak',
        challenge_status: assertion.validation_requirements.required_counter_evidence_check
          || ['contradicting_evidence', 'limitation_context'].includes(candidate.proposed_role)
          ? 'addressed'
          : 'none',
        interpretation: {
          normalized_statement: candidate.interpretation.trim(),
          why_relevant_to_assertion: `Curated for admitted assertion: ${assertion.assertion_text}`,
          limitations: this.uniqueStrings([
            ...candidate.warning_codes,
            ...sourceUnit.issue_codes,
            'Literature evidence constrains the pre-experiment rationale and is not a new experimental result.',
          ]),
        },
        trace_manifest_id: trace.manifest.trace_manifest_id,
      });
    }
    const boardTraceId = this.id('trace_manifest', `board:${boardVersionId}`);
    const boardTrace = await this.options.traceKernel.ensureTraceManifest(
      owner.snapshot.implementation_project_id,
      boardTraceId,
      {
        target_ref: this.ref(
          'motive_evidence_board_version', boardVersionId, owner.snapshot.title_card_id, artifactHash,
        ),
        lineage: this.traceLineage(
          owner,
          candidates.map((candidate) => candidate.evidence_ref),
          candidates.flatMap((candidate) => candidate.source_locator_refs),
          candidates.flatMap((candidate) => candidate.citation_candidate_refs),
          state.curationArtifact,
        ),
        created_by: 'system',
      },
    );
    tracesCreated ||= boardTrace.created;
    traceManifestIds.push(boardTrace.manifest.trace_manifest_id);
    const existing = await this.options.motiveRepository.findMotiveEvidenceBoardById(
      owner.snapshot.implementation_project_id,
      boardVersionId,
    );
    if (existing) {
      const bindings = await this.readExpectedBindings(owner, existing, bindingInputs);
      return { board: existing, bindings, traceManifestIds, tracesCreated, boardCreated: false };
    }
    const request = {
      board_version_id: boardVersionId,
      motive_id: owner.motive.motive_id,
      core_motive_version_id: owner.version.core_motive_version_id,
      bindings: bindingInputs,
      board_summary: {
        current_support_summary: artifact.role_summary
          ?? `${bindingInputs.length} traceable literature bindings cover the admitted required assertions.`,
        current_challenge_summary:
          `Challenge checks passed for ${bindingInputs.length} accepted binding candidates; limitations remain explicit per binding.`,
        unresolved_conflicts: [],
        board_gap_summary: 'No unresolved curation gap remains for the required CoreMotive assertions.',
        next_evidence_needed: this.uniqueStrings(owner.requiredAssertions.flatMap((assertion) =>
          assertion.validation_requirements.required_evidence_types.map((type) =>
            `Validate ${assertion.assertion_id} with ${type} evidence where required.`))),
      },
      board_state: {
        readiness_status: 'evidence_ready' as const,
        blocker_status: 'none' as const,
        freshness_status: 'fresh' as const,
        support_state: bindingInputs.every((binding) => binding.support_state === 'strong')
          ? 'strong' as const
          : 'partial' as const,
        challenge_status: bindingInputs.some((binding) => binding.challenge_status === 'addressed')
          ? 'addressed' as const
          : 'none' as const,
        accepted_risk_refs: [],
      },
      trace_manifest_id: boardTrace.manifest.trace_manifest_id,
      created_by: 'system' as const,
    };
    try {
      const created = await this.options.boardWriter.createMotiveEvidenceBoardVersion(
        owner.snapshot.implementation_project_id,
        request,
      );
      return {
        board: created.board_version,
        bindings: created.evidence_bindings,
        traceManifestIds,
        tracesCreated,
        boardCreated: true,
      };
    } catch (error) {
      if (!(error instanceof AppError) || error.errorCode !== 'VERSION_CONFLICT') throw error;
      const raced = await this.options.motiveRepository.findMotiveEvidenceBoardById(
        owner.snapshot.implementation_project_id,
        boardVersionId,
      );
      if (!raced) throw error;
      const bindings = await this.readExpectedBindings(owner, raced, bindingInputs);
      return { board: raced, bindings, traceManifestIds, tracesCreated, boardCreated: false };
    }
  }

  private async readExpectedBindings(
    owner: OwnerContext,
    board: MotiveEvidenceBoardVersion,
    expected: CreateEvidenceBindingInput[],
  ): Promise<EvidenceBinding[]> {
    if (
      board.motive_id !== owner.motive.motive_id
      || board.core_motive_version_id !== owner.version.core_motive_version_id
      || board.board_state.readiness_status !== 'evidence_ready'
      || board.board_state.freshness_status !== 'fresh'
      || board.board_state.blocker_status !== 'none'
    ) {
      throw new AppError(409, 'VERSION_CONFLICT', `Evidence Board ${board.board_version_id} owner semantics drifted.`);
    }
    const expectedIds = new Set(expected.map((binding) => binding.binding_id));
    const bindings = await Promise.all(board.evidence_binding_refs.map(async (ref) => {
      const binding = await this.options.motiveRepository.findEvidenceBindingById(
        owner.snapshot.implementation_project_id,
        ref.ref_id,
      );
      if (!binding) throw new AppError(409, 'VERSION_CONFLICT', `EvidenceBinding ${ref.ref_id} is missing.`);
      return binding;
    }));
    if (bindings.length !== expectedIds.size || bindings.some((binding) => !expectedIds.has(binding.binding_id))) {
      throw new AppError(409, 'VERSION_CONFLICT', `Evidence Board ${board.board_version_id} binding set drifted.`);
    }
    return bindings;
  }

  private bindingRole(
    candidate: PaperImplementationEvidenceBoardBindingCandidateProposal,
  ): CreateEvidenceBindingInput['role'] {
    switch (candidate.proposed_role) {
      case 'supporting_evidence': return 'support';
      case 'contradicting_evidence': return 'contradict';
      case 'limitation_context': return 'qualify';
      case 'scope_context': return 'qualify';
      default: return 'contextualize';
    }
  }

  private bindingScope(
    version: CoreMotiveVersion,
    candidate: PaperImplementationEvidenceBoardBindingCandidateProposal,
  ): MotiveEvidenceBindingScope {
    return {
      dataset_scope: version.scope_contract.dataset_scope ?? null,
      task_scope: version.motive_contract.target_setting,
      method_scope: version.scope_contract.method_scope ?? null,
      baseline_scope: version.scope_contract.baseline_scope ?? null,
      metric_scope: candidate.proposed_scope === 'board_level'
        ? version.scope_contract.evaluation_scope ?? null
        : null,
    };
  }

  private bindingStrength(
    candidate: PaperImplementationEvidenceBoardBindingCandidateProposal,
  ): CreateEvidenceBindingInput['strength'] {
    if (candidate.proposed_strength === 'strong') {
      return { directness: 'strong', reliability: 'high', reproducibility: 'unknown', freshness: 'fresh' };
    }
    if (candidate.proposed_strength === 'moderate') {
      return { directness: 'moderate', reliability: 'medium', reproducibility: 'unknown', freshness: 'fresh' };
    }
    return { directness: 'weak', reliability: 'low', reproducibility: 'unknown', freshness: 'fresh' };
  }

  private meetsMinimumSupport(
    candidateStrength: PaperImplementationEvidenceBoardCandidateStrength,
    minimumSupport: PaperImplementationMotiveSupportLevel,
  ): boolean {
    const rank: Record<
      PaperImplementationMotiveSupportLevel | PaperImplementationEvidenceBoardCandidateStrength,
      number
    > = {
      none: 0,
      weak: 1,
      moderate: 2,
      strong: 3,
      blocked: -1,
    };
    return rank[candidateStrength] >= rank[minimumSupport];
  }

  private traceLineage(
    owner: OwnerContext,
    evidenceRefs: TopicSelectionFunctionalRef[],
    locatorRefs: TopicSelectionFunctionalRef[],
    citationRefs: TopicSelectionFunctionalRef[],
    curationArtifact: PaperImplementationRuntimeArtifactEnvelope | null = null,
  ): TraceLineageBundle {
    return {
      literature: {
        literature_evidence_refs: this.uniqueRefs(evidenceRefs),
        source_locator_refs: this.uniqueRefs(locatorRefs),
        citation_candidate_refs: this.uniqueRefs(citationRefs),
      },
      experiment: {
        experiment_plan_refs: [],
        work_order_refs: [],
        run_refs: [],
        run_evidence_refs: [],
        result_packet_refs: [],
        metric_refs: [],
      },
      artifact: {
        dataset_refs: [],
        baseline_refs: [],
        code_version_refs: [],
        model_checkpoint_refs: [],
        config_refs: [],
        log_artifact_refs: [],
      },
      decision: {
        validation_cycle_refs: [],
        motive_evolution_decision_refs: [],
        gate_result_refs: [],
        human_decision_refs: this.uniqueRefs([
          owner.snapshot.promotion_decision_ref,
          owner.snapshot.promotion_commitment_profile_ref,
        ]),
        accepted_risk_refs: owner.state.accepted_risk_refs,
      },
      internal_interpretation: {
        result_interpretation_refs: [],
        llm_rationale_refs: curationArtifact ? [this.ref(
          'paper_implementation_runtime_artifact',
          curationArtifact.runtime_artifact_id,
          owner.snapshot.title_card_id,
          curationArtifact.final_artifact_hash ?? curationArtifact.artifact_payload_hash,
        )] : [],
        board_summary_refs: [],
        non_citable_refs: [],
      },
    };
  }

  private success(
    owner: OwnerContext,
    state: ResponseState,
    created: boolean,
  ): PaperImplementationEvidenceBoardHandoffResponse {
    return this.response(owner, state, {
      status: created ? 'created' : 'resumed',
      stage: 'evidence_board_ready',
      blocker: null,
      action: 'continue_validation_planning',
      description: 'The current Evidence Board is fresh, trace-complete, and ready for validation planning.',
    });
  }

  private blocked(
    owner: OwnerContext,
    state: ResponseState,
    stage: PaperImplementationEvidenceBoardHandoffResponse['semantic_stage'],
    blocker: PaperImplementationEvidenceBoardHandoffBlocker,
  ): PaperImplementationEvidenceBoardHandoffResponse {
    return this.response(owner, state, {
      status: 'blocked',
      stage,
      blocker,
      action: blocker.code.includes('GAP') || blocker.code.includes('COVERAGE')
        ? 'resolve_evidence_gap'
        : blocker.retryable ? 'repeat_handoff' : 'resolve_blocker',
      description: blocker.message,
    });
  }

  private response(
    owner: OwnerContext,
    state: ResponseState,
    projection: {
      status: PaperImplementationEvidenceBoardHandoffResponse['status'];
      stage: PaperImplementationEvidenceBoardHandoffResponse['semantic_stage'];
      blocker: PaperImplementationEvidenceBoardHandoffBlocker | null;
      action: PaperImplementationEvidenceBoardHandoffResponse['next_action']['action'];
      description: string;
    },
  ): PaperImplementationEvidenceBoardHandoffResponse {
    return {
      schema_version: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_HANDOFF_SCHEMA_VERSION,
      status: projection.status,
      semantic_stage: projection.stage,
      effects: {
        performed: this.uniqueEffects(state.performed),
        reused: this.uniqueEffects(state.reused),
      },
      next_action: {
        action: projection.action,
        description: projection.description,
        requires_human_confirmation: false,
      },
      blocker: projection.blocker,
      semantic_context: {
        admitted_core_motive: {
          short_name: owner.version.motive_contract.short_name,
          assertion_count: owner.assertions.length,
          required_assertion_count: owner.requiredAssertions.length,
        },
        source_evidence_count: state.source?.units.length ?? 0,
        evidence_gaps: this.uniqueStrings(state.gaps),
        board: state.board ? {
          readiness_status: state.board.board_state.readiness_status,
          freshness_status: state.board.board_state.freshness_status,
          support_state: state.board.board_state.support_state,
          challenge_status: state.board.board_state.challenge_status,
          binding_count: state.bindings.length,
          current_support_summary: state.board.board_summary.current_support_summary,
          current_challenge_summary: state.board.board_summary.current_challenge_summary,
        } : null,
      },
      lineage: {
        implementation_project_id: owner.snapshot.implementation_project_id,
        intake_snapshot_id: owner.snapshot.intake_snapshot_id,
        motive_id: owner.motive.motive_id,
        core_motive_version_id: owner.version.core_motive_version_id,
        assertion_ids: owner.assertions.map((assertion) => assertion.assertion_id),
        source_evidence_ids: state.source?.units.map((unit) => unit.evidence_unit_id) ?? [],
        source_locator_ids: state.source?.locatorRefs.map((ref) => ref.ref_id) ?? [],
        citation_candidate_ids: state.source?.citationCandidates.map((candidate) =>
          candidate.citation_candidate_id) ?? [],
        coordinator_run_id: state.coordinatorRunId,
        curation_runtime_artifact_id: state.curationArtifact?.runtime_artifact_id ?? null,
        board_version_id: state.board?.board_version_id ?? null,
        evidence_binding_ids: state.bindings.map((binding) => binding.binding_id),
        trace_manifest_ids: this.uniqueStrings(state.traceManifestIds),
      },
      resume_policy: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_HANDOFF_RESUME_POLICY,
    };
  }

  private effect(
    state: ResponseState,
    effect: PaperImplementationEvidenceBoardHandoffEffect,
    performed: boolean,
  ): void {
    (performed ? state.performed : state.reused).push(effect);
  }

  private id(prefix: string, seed: string): string {
    return `${prefix}_${sha256Text(seed).slice(0, 32)}`;
  }

  private curationCoordinatorRunId(owner: OwnerContext, source: SourceContext): string {
    return this.id('pi_coordinator_run', stableStringify({
      implementation_project_id: owner.snapshot.implementation_project_id,
      core_motive_version_id: owner.version.core_motive_version_id,
      intake_snapshot_hash: owner.snapshot.intake_snapshot_hash,
      source_hashes: source.hashes,
      profile_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROFILE_ID,
      prompt_template_id: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_ID,
      prompt_template_version: PAPER_IMPLEMENTATION_EVIDENCE_BOARD_CURATION_PROMPT_TEMPLATE_VERSION,
    }));
  }

  private hash(value: string): string {
    return /^[a-f0-9]{64}$/.test(value) ? value : sha256Text(value);
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      ...(versionId ? { version_id: versionId } : {}),
    };
  }

  private normalizedType(refType: string): string {
    return refType.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${this.normalizedType(ref.ref_type)}:${ref.ref_id}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = this.refKey(ref);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private uniqueEffects(
    effects: PaperImplementationEvidenceBoardHandoffEffect[],
  ): PaperImplementationEvidenceBoardHandoffEffect[] {
    return [...new Set(effects)];
  }
}
