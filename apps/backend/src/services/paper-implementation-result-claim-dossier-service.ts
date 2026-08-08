import crypto from 'node:crypto';

import {
  CLOSED_INTERPRETATION_PACKET_REQUIRED_REASON_CODE,
  RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  ImplementationProject,
  RecordImplementationFeedbackEventRequest,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ClaimCandidate,
  ClosedValidationCycleSnapshotRef,
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  CreateResultInterpretationPacketRequest,
  CreateWritingEntryPacketRequest,
  ImplementationDossier,
  ImplementationDossierSourceBundle,
  PaperImplementationWritingEntryPacket,
  RecordResultClaimFeedbackEventRequest,
  RecordResultClaimFeedbackEventResponse,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  ClaimTracePacket,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  ExperimentV2ReasonCode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
import { sha256Text } from './literature-content-processing-utils.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationResultClaimDossierRepository,
} from '../repositories/paper-implementation-result-claim-dossier.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type {
  PaperImplementationEvidenceV2ClaimSupportReader,
} from '../repositories/paper-implementation-evidence-v2.repository.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';
import type {
  PaperImplementationStoredValidationCycleClosureV2,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  consumeHumanConfirmation,
  requireActiveHumanConfirmation,
  requirePassedTraceGateResult,
} from './paper-implementation-governance-gate-refs.js';
import type {
  ClosedInterpretationPacketView,
  PaperImplementationClosedInterpretationPacketViewReader,
} from './paper-implementation-result-packet-v2-materializer.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationResultClaimDossierFeedbackRecorder = {
  recordFeedbackEvent(
    implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse>;
};

export type PaperImplementationClosedCycleSnapshotReader = {
  findStoredClosureByCycle(
    validationCycleId: string,
  ): Promise<PaperImplementationStoredValidationCycleClosureV2 | null>;
};

export type PaperImplementationResultClaimDossierServiceOptions = {
  projectRepository: PaperImplementationRepository;
  resultClaimRepository: PaperImplementationResultClaimDossierRepository;
  traceRepository: PaperImplementationTraceRepository;
  validationRepository: PaperImplementationValidationRepository;
  evidenceV2Reader: PaperImplementationEvidenceV2ClaimSupportReader;
  confirmationRepository: PaperImplementationHumanConfirmationRepository;
  feedbackRecorder: PaperImplementationResultClaimDossierFeedbackRecorder;
  closedCycleSnapshotReader: PaperImplementationClosedCycleSnapshotReader;
  closedPacketViewReader: PaperImplementationClosedInterpretationPacketViewReader;
  idFactory?: IdFactory;
  now?: () => string;
};

// T-124 G4.6 run-012 fix: exported so the Domain Gate assembly can mirror this
// exact evidence discipline when mapping the adjudicator's semantic support
// selection into the CreateClaimCandidateRequest evidence position (single
// source — the gate's own check below stays untouched, defence in depth).
export const CLAIM_SUPPORT_EVIDENCE_REF_TYPES = new Set([
  'runevidenceunit',
  'citationcandidate',
  'literatureevidence',
  'literatureevidenceunit',
  'sourceevidence',
  'sourceevidenceunit',
  'citableevidence',
  'citableevidenceunit',
  'citablesourceevidence',
  'citablesourceevidenceunit',
]);
const HIGH_RISK_OVERCLAIM_TERMS = [
  'broad',
  'broadly',
  'general',
  'generalize',
  'generalizes',
  'generalization',
  'universal',
  'universally',
  'all tasks',
  'all datasets',
  'all domains',
  'every task',
  'every dataset',
  'any task',
  'any dataset',
  'reliable',
  'reliability',
  'robust',
  'robustness',
  'always',
  'superior',
  'superiority',
  'best',
  'outperform',
  'outperforms',
  'state of the art',
  'sota',
] as const;
const LEGACY_RECORD_NOT_ELIGIBLE_REASON_CODE: ExperimentV2ReasonCode =
  'LEGACY_RECORD_NOT_ELIGIBLE';
const HIGH_RISK_OVERCLAIM_STATEMENT_PATTERNS = [
  /\b(universal|universally|always)\b/u,
  /\b(generalize|generalizes|generalized|generalization)\b/u,
  /\b(all|every|any) (task|tasks|dataset|datasets|domain|domains|setting|settings)\b/u,
  /\b(broadly|generally|globally) (improve|improves|outperform|outperforms|generalize|generalizes|reliable|superior)\b/u,
  /\b(reliable|robust) (across|for all|in all|on all)\b/u,
  /\b(superior|superiority|best|state of the art|sota)\b/u,
  /\boutperform(s)? (all|every|any|across)\b/u,
] as const;
// T-124 G5 FIX-A item 11: single source of the memo/summary/interpretation ref
// types that may never stand in as evidence. This is the UNION of the former
// dossier-private and harness-private copies (whichever was stricter wins — the
// harness copy's extra entries are folded in); the harness now imports this set
// instead of keeping a divergent copy.
export const MEMO_OR_SUMMARY_REF_TYPES = new Set([
  'resultinterpretationpacket',
  'resultinterpretation',
  'llmrationale',
  'llmsummary',
  'boardsummary',
  'rationalememo',
  'memo',
  'displaysummary',
  'internalinterpretation',
  'summary',
]);

export class PaperImplementationResultClaimDossierService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly resultClaimRepository: PaperImplementationResultClaimDossierRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly evidenceV2Reader: PaperImplementationEvidenceV2ClaimSupportReader;
  private readonly confirmationRepository: PaperImplementationHumanConfirmationRepository;
  private readonly feedbackRecorder: PaperImplementationResultClaimDossierFeedbackRecorder;
  private readonly closedCycleSnapshotReader: PaperImplementationClosedCycleSnapshotReader;
  private readonly closedPacketViewReader: PaperImplementationClosedInterpretationPacketViewReader;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationResultClaimDossierServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.resultClaimRepository = options.resultClaimRepository;
    this.traceRepository = options.traceRepository;
    this.evidenceV2Reader = options.evidenceV2Reader;
    this.confirmationRepository = options.confirmationRepository;
    this.feedbackRecorder = options.feedbackRecorder;
    this.closedCycleSnapshotReader = options.closedCycleSnapshotReader;
    this.closedPacketViewReader = options.closedPacketViewReader;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createResultInterpretationPacket(
    _implementationProjectId: string,
    _request: CreateResultInterpretationPacketRequest,
  ): Promise<ResultInterpretationPacket> {
    throw new AppError(
      409,
      'GATE_CONSTRAINT_FAILED',
      'Direct ResultInterpretationPacket materialization is closed; ValidationCycleClosed@v1 is the sole materialization trigger.',
      { reason_code: RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED_REASON_CODE },
    );
  }

  async listResultInterpretationPackets(
    implementationProjectId: string,
  ): Promise<ResultInterpretationPacket[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.resultClaimRepository.listResultInterpretationPackets(implementationProjectId);
  }

  async getResultInterpretationPacket(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireResultPacket(implementationProjectId, resultInterpretationPacketId);
  }

  async createClaimCandidate(
    implementationProjectId: string,
    request: CreateClaimCandidateRequest,
  ): Promise<ClaimCandidate> {
    const project = await this.requireActiveProject(implementationProjectId);
    const manifest = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'claim_candidate',
      request.claim_candidate_id,
      'ClaimCandidate',
    );
    const resultPacketViews = await Promise.all(
      request.result_interpretation_packet_ids.map((id) =>
        this.requireClosedResultPacketView(project.implementation_project_id, id)),
    );
    const resultPackets = resultPacketViews.map((view) => view.packet);
    await this.assertClaimSupport(project.implementation_project_id, request, resultPackets);
    await this.assertStrongClaimConfirmation(project, request);
    this.assertClaimBoundary(request, resultPackets);
    const claimTracePacket = request.claim_trace_packet_id
      ? await this.requireClaimTracePacket(project.implementation_project_id, request.claim_trace_packet_id)
      : null;
    if (claimTracePacket) {
      this.assertClaimTracePacketTargetsCandidate(claimTracePacket, request.claim_candidate_id);
    }
    const humanConfirmationRequired = request.claim_strength === 'strong';
    const boundaryGateStatus = request.claim_strength === 'strong'
      ? 'allow_strong_with_confirmation'
      : request.claim_strength === 'moderate'
        ? 'allow_moderate'
        : 'allow_tentative';
    const createdAt = this.now();
    const candidate: ClaimCandidate = {
      claim_candidate_id: request.claim_candidate_id,
      implementation_project_id: project.implementation_project_id,
      claim_type: request.claim_type,
      claim_statement: request.claim_statement.trim(),
      claim_strength: request.claim_strength,
      claim_status: claimTracePacket ? 'supported' : 'support_pending_trace',
      boundary_gate_status: boundaryGateStatus,
      result_interpretation_packet_refs: resultPackets.map((packet) =>
        this.ref(
          'result_interpretation_packet',
          packet.result_interpretation_packet_id,
          project.title_card_id,
          packet.packet_content_hash ?? null,
        )),
      support_refs: this.dedupeRefs(request.support_refs),
      challenge_refs: this.dedupeRefs(request.challenge_refs ?? []),
      scope: request.scope,
      boundary: request.boundary,
      trace_manifest_ref: this.traceManifestRef(project, manifest),
      trace_manifest_id: manifest.trace_manifest_id,
      claim_trace_packet_ref: claimTracePacket
        ? this.ref('claim_trace_packet', claimTracePacket.claim_trace_packet_id, project.title_card_id)
        : null,
      claim_trace_packet_id: claimTracePacket?.claim_trace_packet_id ?? null,
      human_confirmation_required: humanConfirmationRequired,
      forbidden_overclaim_count: this.forbiddenOverclaimsFor(request, resultPackets).length,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    // Consume-before-write: the confirmation is single-use and burnt right
    // before the authoritative write so a racing duplicate fails here first.
    await this.consumeStrongClaimConfirmation(project, request, createdAt);
    return this.resultClaimRepository.createClaimCandidate(candidate);
  }

  async listClaimCandidates(implementationProjectId: string): Promise<ClaimCandidate[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.resultClaimRepository.listClaimCandidates(implementationProjectId);
  }

  async getClaimCandidate(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireClaimCandidate(implementationProjectId, claimCandidateId);
  }

  async createImplementationDossier(
    implementationProjectId: string,
    request: CreateImplementationDossierRequest,
  ): Promise<ImplementationDossier> {
    const project = await this.requireActiveProject(implementationProjectId);
    const manifest = await this.requireTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
    );
    if (request.dossier_status === 'ready_for_writing') {
      this.assertCompleteManifestTarget(
        manifest,
        'implementation_dossier',
        request.dossier_id,
        'ImplementationDossier',
      );
    }
    const resultPacketViews = await Promise.all(
      request.result_interpretation_packet_ids.map((id) =>
        this.requireClosedResultPacketView(project.implementation_project_id, id)),
    );
    const resultPackets = resultPacketViews.map((view) => view.packet);
    const claimCandidates = await Promise.all(
      request.claim_candidate_ids.map((id) =>
        this.requireClaimCandidate(project.implementation_project_id, id)),
    );
    const claimTracePackets = await Promise.all(
      request.claim_trace_packet_ids.map((id) =>
        this.requireClaimTracePacket(project.implementation_project_id, id)),
    );
    this.assertDossierClaimPacketLineage(resultPackets, claimCandidates);
    this.assertDossierGate(request, resultPackets, claimCandidates, claimTracePackets);
    this.assertDossierClosedPacketAccounting(request, resultPacketViews);
    // Resolve only the declared readiness authorities: the keyed gate result
    // and the explicit immutable v2 Cycle-closure snapshots.
    await this.assertReadinessGateResult(project.implementation_project_id, request);
    await this.assertClosedCycleSnapshotRefs(project.implementation_project_id, request);
    const createdAt = this.now();
    const source = this.buildDossierSource(
      project,
      resultPackets,
      claimCandidates,
      claimTracePackets,
      manifest,
      request.closed_validation_cycle_snapshot_refs,
    );
    const dossierHash = this.hashStable({
      dossier_id: request.dossier_id,
      dossier_version: request.dossier_version ?? 1,
      source,
      experiment_section: request.experiment_section,
      claim_section: request.claim_section,
      readiness: request.readiness,
      trace_manifest_id: manifest.trace_manifest_id,
      projection_policy_version_id: request.projection_policy_version_id ?? null,
    });
    const dossier: ImplementationDossier = {
      dossier_id: request.dossier_id,
      implementation_project_id: project.implementation_project_id,
      dossier_version: request.dossier_version ?? 1,
      dossier_status: request.dossier_status,
      dossier_trace_status: manifest.trace_status === 'complete'
        ? 'complete'
        : manifest.trace_status === 'partial'
          ? 'partial'
          : 'blocked',
      source,
      experiment_section: request.experiment_section,
      claim_section: request.claim_section,
      readiness: request.readiness,
      trace_manifest_ref: this.traceManifestRef(project, manifest),
      trace_manifest_id: manifest.trace_manifest_id,
      failed_run_count: request.experiment_section.failed_run_refs.length,
      forbidden_overclaim_count: request.claim_section.forbidden_overclaims.length,
      readiness_gate_result_id: request.readiness.readiness_gate_result_id ?? null,
      projection_policy_version_id: request.projection_policy_version_id ?? project.policy_version_id ?? null,
      dossier_hash: `sha256:${dossierHash}`,
      reopen_condition: request.reopen_condition ?? null,
      abandon_reason: request.abandon_reason ?? null,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.resultClaimRepository.createImplementationDossier(dossier);
  }

  async listImplementationDossiers(
    implementationProjectId: string,
  ): Promise<ImplementationDossier[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.resultClaimRepository.listImplementationDossiers(implementationProjectId);
  }

  async getImplementationDossier(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireDossier(implementationProjectId, dossierId);
  }

  async createWritingEntryPacket(
    implementationProjectId: string,
    dossierId: string,
    request: CreateWritingEntryPacketRequest,
  ): Promise<PaperImplementationWritingEntryPacket> {
    const project = await this.requireActiveProject(implementationProjectId);
    const dossier = await this.requireDossier(project.implementation_project_id, dossierId);
    if (dossier.dossier_status !== 'ready_for_writing') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'WritingEntryPacket can only be projected from a ready_for_writing ImplementationDossier.',
      );
    }
    if (!this.hasText(dossier.readiness_gate_result_id)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'WritingEntryPacket requires a dossier readiness gate result.',
      );
    }
    const requestedPolicy = request.projection_policy_version_id ?? null;
    const dossierPolicy = dossier.projection_policy_version_id ?? project.policy_version_id ?? null;
    if (requestedPolicy && dossierPolicy && requestedPolicy !== dossierPolicy) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'WritingEntryPacket projection policy must match the ready dossier projection policy.',
      );
    }
    const projectionPolicyVersionId = requestedPolicy ?? dossierPolicy;
    if (!this.hasText(projectionPolicyVersionId)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'WritingEntryPacket requires a projection policy version id.',
      );
    }
    const createdAt = this.now();
    const packet: PaperImplementationWritingEntryPacket = {
      writing_entry_packet_id: this.idFactory('writing_entry_packet'),
      implementation_project_id: project.implementation_project_id,
      dossier_id: dossier.dossier_id,
      dossier_version: dossier.dossier_version,
      dossier_hash: dossier.dossier_hash,
      dossier_status: dossier.dossier_status,
      readiness_gate_result_id: dossier.readiness_gate_result_id,
      trace_manifest_ref: dossier.trace_manifest_ref,
      trace_manifest_id: dossier.trace_manifest_id,
      projection_policy_version_id: projectionPolicyVersionId,
      packet_status: 'current',
      writing_target_ref: request.writing_target_ref ?? null,
      packet_payload: {
        dossier_ref: this.ref('implementation_dossier', dossier.dossier_id, project.title_card_id, dossier.dossier_hash),
        admitted_claim_refs: dossier.claim_section.admitted_claim_refs,
        claim_trace_packet_refs: dossier.source.claim_trace_packet_refs,
        forbidden_overclaims: dossier.claim_section.forbidden_overclaims,
        failed_run_refs: dossier.experiment_section.failed_run_refs,
        projection_payload: request.packet_payload ?? {},
      },
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.resultClaimRepository.createWritingEntryPacket(packet);
  }

  async listWritingEntryPackets(
    implementationProjectId: string,
  ): Promise<PaperImplementationWritingEntryPacket[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.resultClaimRepository.listWritingEntryPackets(implementationProjectId);
  }

  async recordResultClaimFeedbackEvent(
    implementationProjectId: string,
    request: RecordResultClaimFeedbackEventRequest,
  ): Promise<RecordResultClaimFeedbackEventResponse> {
    await this.requireActiveProject(implementationProjectId);
    const result = await this.feedbackRecorder.recordFeedbackEvent(implementationProjectId, {
      feedback_type: request.feedback_trigger,
      severity: request.severity,
      summary: request.summary,
      source_object_refs: request.source_object_refs ?? [],
      evidence_refs: request.evidence_refs ?? [],
      run_refs: request.run_refs ?? [],
      recommended_upstream_action: 'recheck_topic_selection',
      required_action: request.required_action ?? 'Review PaperImplementation result/claim feedback and recheck upstream topic-selection authority.',
      artifact_refs: request.artifact_refs ?? [],
      feedback_payload: {
        result_claim_feedback_trigger: request.feedback_trigger,
        feedback_payload: request.feedback_payload ?? {},
      },
      policy_version_id: request.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
    });
    return {
      ...result,
      feedback_trigger: request.feedback_trigger,
    };
  }

  private async requireActiveProject(implementationProjectId: string): Promise<ImplementationProject> {
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (project.lifecycle_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'PaperImplementation result claim dossier requires an active ImplementationProject.');
    }
    return project;
  }

  private async requireTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest> {
    const manifest = await this.traceRepository.findTraceManifestById(implementationProjectId, traceManifestId);
    if (!manifest) {
      throw new AppError(404, 'NOT_FOUND', `TraceManifest ${traceManifestId} not found.`);
    }
    return manifest;
  }

  private async requireCompleteTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    targetRefType: string,
    targetRefId: string,
    label: string,
  ): Promise<TraceManifest> {
    const manifest = await this.requireTraceManifest(implementationProjectId, traceManifestId);
    this.assertCompleteManifestTarget(manifest, targetRefType, targetRefId, label);
    return manifest;
  }

  private assertCompleteManifestTarget(
    manifest: TraceManifest,
    targetRefType: string,
    targetRefId: string,
    label: string,
  ): void {
    if (manifest.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `${label} requires a complete TraceManifest.`);
    }
    if (
      this.normalizedRefType(manifest.target_ref.ref_type) !== this.normalizedRefType(targetRefType)
      || manifest.target_ref.ref_id !== targetRefId
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `TraceManifest ${manifest.trace_manifest_id} does not target ${targetRefType}:${targetRefId}.`,
      );
    }
  }

  private async assertClaimSupport(
    implementationProjectId: string,
    request: CreateClaimCandidateRequest,
    resultPackets: ResultInterpretationPacket[],
  ): Promise<void> {
    const memoRef = request.support_refs.find((ref) =>
      MEMO_OR_SUMMARY_REF_TYPES.has(this.normalizedRefType(ref.ref_type)));
    if (memoRef) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ClaimCandidate support cannot use memo, summary, or interpretation refs as evidence: ${memoRef.ref_type}:${memoRef.ref_id}.`,
      );
    }
    const unsupportedRef = request.support_refs.find((ref) =>
      !CLAIM_SUPPORT_EVIDENCE_REF_TYPES.has(this.normalizedRefType(ref.ref_type)));
    if (unsupportedRef) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ClaimCandidate support must point to run evidence, citation candidates, or explicit citable/source evidence units.',
        {
          ref_type: unsupportedRef.ref_type,
          ref_id: unsupportedRef.ref_id,
        },
      );
    }
    // QR-4: claim consumers are closed-cycle-only under D-16/D-17. A v2 REU
    // becomes claim-usable only after its ValidationCycle has a v2 closure row.
    // Historical legacy rows are rejection-classification data, never a read
    // fallback or an alternate evidence authority.
    await this.assertRunEvidenceSupportRefsResolve(implementationProjectId, request.support_refs);
    this.assertClaimRunEvidenceBoundToPackets(request.support_refs, resultPackets);
    if (request.claim_strength === 'strong' && !request.boundary.human_confirmation_ref) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Strong ClaimCandidate requires explicit human confirmation.',
      );
    }
  }

  private assertClaimRunEvidenceBoundToPackets(
    supportRefs: TopicSelectionFunctionalRef[],
    resultPackets: ResultInterpretationPacket[],
  ): void {
    const packetEvidenceKeys = new Set(
      resultPackets.flatMap((packet) => packet.source.run_evidence_refs).map((ref) => this.refKey(ref)),
    );
    const unbound = supportRefs.find((ref) => (
      this.normalizedRefType(ref.ref_type) === 'runevidenceunit'
      && !packetEvidenceKeys.has(this.refKey(ref))
    ));
    if (unbound) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ClaimCandidate run evidence support must be exactly bound to an included closed Packet.',
        { ref_type: unbound.ref_type, ref_id: unbound.ref_id, version_id: unbound.version_id ?? null },
      );
    }
  }

  /**
   * Every run_evidence_unit support ref must resolve to exact project-scoped v2
   * evidence whose ValidationCycle has a v2 closure. When version_id is
   * supplied it is treated as the expected immutable REU content_hash.
   * Other evidence classes (citation / source evidence) are out of this
   * repository's scope and are not existence-checked here.
   */
  private async assertRunEvidenceSupportRefsResolve(
    implementationProjectId: string,
    supportRefs: TopicSelectionFunctionalRef[],
  ): Promise<void> {
    const runEvidenceSupportRefs = supportRefs.filter((ref) =>
      this.normalizedRefType(ref.ref_type) === 'runevidenceunit');
    if (runEvidenceSupportRefs.length === 0) {
      return;
    }
    const uniqueRefs = [...new Map(runEvidenceSupportRefs.map((ref) => [
      `${ref.ref_id}\0${ref.version_id ?? ''}`,
      ref,
    ])).values()];
    for (const ref of uniqueRefs) {
      const resolution = await this.evidenceV2Reader.resolveClaimSupportRunEvidenceUnit({
        implementation_project_id: implementationProjectId,
        run_evidence_unit_id: ref.ref_id,
        expected_content_hash: ref.version_id ?? null,
      });
      if (resolution.status === 'v2_closed') {
        continue;
      }
      if (resolution.status === 'legacy_record_not_eligible') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Historical legacy RunEvidenceUnit records are not eligible for claim support after the v2 cutover.',
          {
            reason_code: LEGACY_RECORD_NOT_ELIGIBLE_REASON_CODE,
            ref_type: ref.ref_type,
            ref_id: ref.ref_id,
          },
        );
      }
      if (resolution.status === 'v2_open') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ClaimCandidate run_evidence_unit support requires a v2 ValidationCycle closure.',
          {
            ref_type: ref.ref_type,
            ref_id: ref.ref_id,
            validation_cycle_id: resolution.run_evidence_unit.validation_cycle_id,
          },
        );
      }
      if (resolution.status === 'v2_content_hash_mismatch') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ClaimCandidate run_evidence_unit support content hash does not match the v2 authority.',
          {
            ref_type: ref.ref_type,
            ref_id: ref.ref_id,
            expected_content_hash: ref.version_id,
            actual_content_hash: resolution.run_evidence_unit.content_hash,
          },
        );
      }
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ClaimCandidate run_evidence_unit support refs must resolve to v2 RunEvidenceUnit objects in this project.',
        { ref_type: ref.ref_type, ref_id: ref.ref_id },
      );
    }
  }

  private strongClaimConfirmationTarget(
    project: ImplementationProject,
    request: CreateClaimCandidateRequest,
  ): TopicSelectionFunctionalRef {
    return this.ref('claim_candidate', request.claim_candidate_id, project.title_card_id);
  }

  private async assertStrongClaimConfirmation(
    project: ImplementationProject,
    request: CreateClaimCandidateRequest,
  ): Promise<void> {
    if (request.claim_strength !== 'strong') {
      return;
    }
    const confirmationRef = request.boundary.human_confirmation_ref;
    if (!confirmationRef) {
      return;
    }
    const record = await requireActiveHumanConfirmation(
      this.confirmationRepository,
      project.implementation_project_id,
      confirmationRef.ref_id,
      'strong_claim_acceptance',
      'Strong ClaimCandidate',
      this.strongClaimConfirmationTarget(project, request),
    );
    // T-124 G5 FIX-A item 9: content binding. When the confirmation carries the
    // sha256 of the exact claim_statement the reviewer approved, it must equal
    // the sha256 of the claim being written — the reviewer authorized THAT
    // wording, not a later edit. Validated only when the record carries the hash
    // (backward compatible with records that predate the field).
    const reviewedHash = record.reviewed_claim_statement_hash;
    if (reviewedHash && reviewedHash.trim().length > 0) {
      const expected = sha256Text(request.claim_statement.trim());
      const provided = reviewedHash.trim().replace(/^sha256:/, '');
      if (provided !== expected) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Strong ClaimCandidate human confirmation reviewed_claim_statement_hash does not match the claim_statement being written.',
          {
            confirmation_record_id: record.confirmation_record_id,
            expected_claim_statement_hash: expected,
            reviewed_claim_statement_hash: provided,
          },
        );
      }
    }
  }

  private async consumeStrongClaimConfirmation(
    project: ImplementationProject,
    request: CreateClaimCandidateRequest,
    consumedAt: string,
  ): Promise<void> {
    if (request.claim_strength !== 'strong') {
      return;
    }
    const confirmationRef = request.boundary.human_confirmation_ref;
    if (!confirmationRef) {
      return;
    }
    const target = this.strongClaimConfirmationTarget(project, request);
    await consumeHumanConfirmation(
      this.confirmationRepository,
      project.implementation_project_id,
      confirmationRef.ref_id,
      'strong_claim_acceptance',
      'Strong ClaimCandidate',
      target,
      target,
      consumedAt,
    );
  }

  private async assertReadinessGateResult(
    implementationProjectId: string,
    request: CreateImplementationDossierRequest,
  ): Promise<void> {
    if (request.dossier_status !== 'ready_for_writing') {
      return;
    }
    const readinessGateResultId = request.readiness.readiness_gate_result_id;
    if (!this.hasText(readinessGateResultId)) {
      return;
    }
    await requirePassedTraceGateResult(
      this.traceRepository,
      implementationProjectId,
      readinessGateResultId,
      request.trace_manifest_id,
      'Ready ImplementationDossier readiness',
    );
  }

  private assertClaimBoundary(
    request: CreateClaimCandidateRequest,
    resultPackets: ResultInterpretationPacket[],
  ): void {
    const strengthRank = { tentative: 0, moderate: 1, strong: 2 } as const;
    const ceilingViolation = resultPackets.find((packet) => (
      strengthRank[request.claim_strength]
        > strengthRank[packet.claim_implications.allowed_claim_ceiling]
    ));
    if (ceilingViolation) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Claim strength exceeds the accepted ResultAnalysis claim ceiling.',
        {
          result_interpretation_packet_id:
            ceilingViolation.result_interpretation_packet_id,
          allowed_claim_ceiling:
            ceilingViolation.claim_implications.allowed_claim_ceiling,
        },
      );
    }
    const forbidden = this.forbiddenOverclaimsFor(request, resultPackets);
    const normalizedStatement = this.normalizeText(request.claim_statement);
    const matched = forbidden.find((item) => {
      const normalized = this.normalizeText(item);
      return normalized.length > 0 && normalizedStatement.includes(normalized);
    });
    const highRiskMatched = matched ?? this.matchHighRiskOverclaim(normalizedStatement, forbidden);
    if (highRiskMatched) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ClaimBoundaryGate blocks a claim statement that matches a forbidden overclaim.',
        { forbidden_overclaim: highRiskMatched },
      );
    }
  }

  private assertDossierGate(
    request: CreateImplementationDossierRequest,
    resultPackets: ResultInterpretationPacket[],
    claimCandidates: ClaimCandidate[],
    claimTracePackets: ClaimTracePacket[],
  ): void {
    if (request.dossier_status === 'parked_with_reopen_condition' && !this.hasText(request.reopen_condition)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Parked ImplementationDossier requires reopen_condition.');
    }
    if (request.dossier_status === 'abandoned_with_trace' && !this.hasText(request.abandon_reason)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Abandoned ImplementationDossier requires abandon_reason.');
    }
    if (request.dossier_status !== 'ready_for_writing') {
      return;
    }
    if (!this.hasText(request.readiness.readiness_gate_result_id)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Ready ImplementationDossier requires readiness_gate_result_id.');
    }
    if (request.readiness.blocker_refs.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier cannot contain unresolved blocker_refs.',
      );
    }
    if (resultPackets.length === 0 || claimCandidates.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier requires result packets and claim candidates.',
      );
    }
    this.assertReadyDossierClaimDisposition(request, claimCandidates);
    this.assertReadyDossierClaimCeiling(request, resultPackets, claimCandidates);
    this.assertReadyDossierOverclaimAccounting(request, resultPackets, claimCandidates);
    const tracePacketsById = new Map(claimTracePackets.map((packet) => [
      packet.claim_trace_packet_id,
      packet,
    ]));
    const invalidTracePacket = claimCandidates.find((candidate) => {
      if (!candidate.claim_trace_packet_id) return true;
      const packet = tracePacketsById.get(candidate.claim_trace_packet_id);
      return !packet
        || this.normalizedRefType(packet.claim_ref.ref_type) !== 'claimcandidate'
        || packet.claim_ref.ref_id !== candidate.claim_candidate_id;
    });
    if (invalidTracePacket) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier requires every included ClaimCandidate to have its exact ClaimTracePacket.',
      );
    }
  }

  private assertDossierClaimPacketLineage(
    resultPackets: ResultInterpretationPacket[],
    claimCandidates: ClaimCandidate[],
  ): void {
    const includedPacketHashes = new Map(resultPackets.map((packet) => [
      packet.result_interpretation_packet_id,
      packet.packet_content_hash ?? null,
    ]));
    const unboundCandidate = claimCandidates.find((candidate) => (
      candidate.result_interpretation_packet_refs.length === 0
      || candidate.result_interpretation_packet_refs.some((ref) => (
        this.normalizedRefType(ref.ref_type) !== 'resultinterpretationpacket'
        || !includedPacketHashes.has(ref.ref_id)
        || ref.version_id !== includedPacketHashes.get(ref.ref_id)
      ))
    ));
    if (unboundCandidate) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ImplementationDossier ClaimCandidate lineage must be fully covered by its included closed Packets.',
        { claim_candidate_id: unboundCandidate.claim_candidate_id },
      );
    }
  }

  private assertReadyDossierClaimCeiling(
    request: CreateImplementationDossierRequest,
    resultPackets: ResultInterpretationPacket[],
    claimCandidates: ClaimCandidate[],
  ): void {
    const rank = { tentative: 0, moderate: 1, strong: 2 } as const;
    const packetViolation = resultPackets.find((packet) => (
      rank[request.claim_section.claim_ceiling]
      > rank[packet.claim_implications.allowed_claim_ceiling]
    ));
    if (packetViolation) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier claim ceiling exceeds an included closed Packet ceiling.',
        { result_interpretation_packet_id: packetViolation.result_interpretation_packet_id },
      );
    }
    const admittedIds = new Set(request.claim_section.admitted_claim_refs.map((ref) => ref.ref_id));
    const claimViolation = claimCandidates.find((candidate) => (
      admittedIds.has(candidate.claim_candidate_id)
      && rank[candidate.claim_strength] > rank[request.claim_section.claim_ceiling]
    ));
    if (claimViolation) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier claim ceiling is lower than an admitted ClaimCandidate strength.',
        { claim_candidate_id: claimViolation.claim_candidate_id },
      );
    }
  }

  private assertReadyDossierOverclaimAccounting(
    request: CreateImplementationDossierRequest,
    resultPackets: ResultInterpretationPacket[],
    claimCandidates: ClaimCandidate[],
  ): void {
    const observed = new Set(
      request.claim_section.forbidden_overclaims.map((item) => this.normalizeText(item)),
    );
    const required = [...new Set([
      ...resultPackets.flatMap((packet) => packet.claim_implications.forbidden_overclaims),
      ...claimCandidates.flatMap((candidate) => candidate.boundary.forbidden_overclaims),
    ].map((item) => this.normalizeText(item)).filter((item) => item.length > 0))];
    const missing = required.filter((item) => !observed.has(item));
    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must preserve every Packet and ClaimCandidate forbidden overclaim.',
        { missing_forbidden_overclaims: missing },
      );
    }
  }

  private assertReadyDossierClaimDisposition(
    request: CreateImplementationDossierRequest,
    claimCandidates: ClaimCandidate[],
  ): void {
    if (request.claim_section.admitted_claim_refs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier requires at least one admitted claim ref.',
      );
    }
    const includedCandidateIds = new Set(claimCandidates.map((candidate) => candidate.claim_candidate_id));
    const admittedCandidateIds = this.assertClaimSectionRefsResolve(
      request.claim_section.admitted_claim_refs,
      includedCandidateIds,
      'admitted_claim_refs',
    );
    const rejectedCandidateIds = this.assertClaimSectionRefsResolve(
      request.claim_section.rejected_claim_refs,
      includedCandidateIds,
      'rejected_claim_refs',
    );
    const overlap = [...admittedCandidateIds].filter((id) => rejectedCandidateIds.has(id));
    if (overlap.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier cannot admit and reject the same ClaimCandidate.',
        { claim_candidate_ids: overlap },
      );
    }
    const undisposed = [...includedCandidateIds].filter((id) =>
      !admittedCandidateIds.has(id) && !rejectedCandidateIds.has(id));
    if (undisposed.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must admit or reject every included ClaimCandidate.',
        { claim_candidate_ids: undisposed },
      );
    }
    const pendingAdmitted = claimCandidates.find((candidate) =>
      admittedCandidateIds.has(candidate.claim_candidate_id) && candidate.claim_status !== 'supported');
    if (pendingAdmitted) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier can only admit ClaimCandidate objects with supported trace-ready status.',
        {
          claim_candidate_id: pendingAdmitted.claim_candidate_id,
          claim_status: pendingAdmitted.claim_status,
        },
      );
    }
  }

  private assertClaimSectionRefsResolve(
    refs: TopicSelectionFunctionalRef[],
    includedCandidateIds: Set<string>,
    fieldName: string,
  ): Set<string> {
    const ids = new Set<string>();
    for (const ref of refs) {
      if (this.normalizedRefType(ref.ref_type) !== 'claimcandidate') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `Ready ImplementationDossier ${fieldName} must only contain ClaimCandidate refs.`,
          { ref_type: ref.ref_type, ref_id: ref.ref_id },
        );
      }
      if (!includedCandidateIds.has(ref.ref_id)) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `Ready ImplementationDossier ${fieldName} must reference included ClaimCandidate objects.`,
          { claim_candidate_id: ref.ref_id },
        );
      }
      ids.add(ref.ref_id);
    }
    return ids;
  }

  private async requireResultPacket(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ResultInterpretationPacket> {
    const packet = await this.resultClaimRepository.findResultInterpretationPacketById(
      implementationProjectId,
      resultInterpretationPacketId,
    );
    if (!packet) {
      throw new AppError(404, 'NOT_FOUND', `ResultInterpretationPacket ${resultInterpretationPacketId} not found.`);
    }
    return packet;
  }

  private async requireClosedResultPacketView(
    implementationProjectId: string,
    resultInterpretationPacketId: string,
  ): Promise<ClosedInterpretationPacketView> {
    const view = await this.closedPacketViewReader.findClosedInterpretationPacketView(
      implementationProjectId,
      resultInterpretationPacketId,
    );
    if (!view) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `ResultInterpretationPacket ${resultInterpretationPacketId} not found.`,
      );
    }
    if (
      view.packet.closure_id !== view.closure.closure_id
      || view.packet.closure_snapshot_hash !== view.closure.closure_snapshot_hash
      || view.closure.accepted_proposal_id === null
      || view.closure.accepted_proposal_hash === null
      || view.accepted_proposal.validation_cycle_id !== view.packet.validation_cycle_id
      || view.accepted_proposal.claim_ceiling
        !== view.packet.claim_implications.allowed_claim_ceiling
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResultInterpretationPacket does not resolve to an exact closed interpretation view.',
        { reason_code: CLOSED_INTERPRETATION_PACKET_REQUIRED_REASON_CODE },
      );
    }
    return view;
  }

  private assertDossierClosedPacketAccounting(
    request: CreateImplementationDossierRequest,
    views: ClosedInterpretationPacketView[],
  ): void {
    if (request.dossier_status !== 'ready_for_writing') return;
    const failedKeys = new Set(request.experiment_section.failed_run_refs.map((ref) => this.refKey(ref)));
    const inconclusiveKeys = new Set(
      request.experiment_section.inconclusive_run_refs.map((ref) => this.refKey(ref)),
    );
    const negativeKeys = new Set(
      request.experiment_section.negative_result_refs.map((ref) => this.refKey(ref)),
    );
    const staleKeys = new Set(
      request.experiment_section.excluded_stale_or_invalidated_evidence_refs
        .map((ref) => this.refKey(ref)),
    );
    const closureByCycle = new Map(request.closed_validation_cycle_snapshot_refs.map((ref) => [
      ref.validation_cycle_id,
      ref,
    ]));
    for (const view of views) {
      const closureRef = closureByCycle.get(view.packet.validation_cycle_id);
      if (
        !closureRef
        || closureRef.closure_id !== view.closure.closure_id
        || closureRef.closure_snapshot_hash !== view.closure.closure_snapshot_hash
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Ready ImplementationDossier must preserve every Packet exact Closure snapshot.',
        );
      }
      this.assertDossierRefCoverage(
        view.packet.source.failed_run_refs,
        failedKeys,
        'failed or cancelled evidence',
      );
      this.assertDossierRefCoverage(
        view.packet.source.inconclusive_run_refs,
        inconclusiveKeys,
        'inconclusive evidence',
      );
      this.assertDossierRefCoverage(
        view.packet.source.stale_or_invalidated_evidence_refs,
        staleKeys,
        'stale or invalidated evidence',
      );
      if (view.closure.scientific_disposition === 'negative') {
        const authority = view.closure.scientific_authority;
        if (!authority) {
          throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Negative Closure is missing scientific authority.');
        }
        const negativeRef = this.ref(
          'scientific_comparison_fact',
          authority.primary_comparison_fact_id,
          '',
          authority.primary_comparison_fact_hash,
        );
        if (!negativeKeys.has(this.refKey(negativeRef))) {
          throw new AppError(
            409,
            'GATE_CONSTRAINT_FAILED',
            'Ready ImplementationDossier must preserve the negative primary comparison fact.',
          );
        }
      }
    }
  }

  private assertDossierRefCoverage(
    requiredRefs: TopicSelectionFunctionalRef[],
    observedKeys: Set<string>,
    label: string,
  ): void {
    const missing = requiredRefs.filter((ref) => !observedKeys.has(this.refKey(ref)));
    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Ready ImplementationDossier must preserve all ${label}.`,
        { missing_refs: missing },
      );
    }
  }

  private async assertClosedCycleSnapshotRefs(
    implementationProjectId: string,
    request: CreateImplementationDossierRequest,
  ): Promise<void> {
    const refs = request.closed_validation_cycle_snapshot_refs;
    if (request.dossier_status === 'ready_for_writing' && refs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier requires at least one explicit closed ValidationCycle snapshot ref.',
      );
    }
    const cycleIds = new Set<string>();
    for (const ref of refs) {
      if (cycleIds.has(ref.validation_cycle_id)) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ImplementationDossier closed ValidationCycle snapshot refs must be unique by validation_cycle_id.',
          { validation_cycle_id: ref.validation_cycle_id },
        );
      }
      cycleIds.add(ref.validation_cycle_id);
      const stored = await this.closedCycleSnapshotReader.findStoredClosureByCycle(
        ref.validation_cycle_id,
      );
      if (!stored) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ImplementationDossier snapshot refs must resolve to closed ValidationCycle v2 authority.',
          { validation_cycle_id: ref.validation_cycle_id },
        );
      }
      if (stored.implementation_project_id !== implementationProjectId) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ImplementationDossier closed ValidationCycle snapshot belongs to a different project.',
          { validation_cycle_id: ref.validation_cycle_id },
        );
      }
      if (stored.closure.closure_id !== ref.closure_id
        || stored.closure.closure_snapshot_hash !== ref.closure_snapshot_hash) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ImplementationDossier closed ValidationCycle snapshot identity or hash does not match closure authority.',
          {
            validation_cycle_id: ref.validation_cycle_id,
            expected_closure_id: stored.closure.closure_id,
            expected_closure_snapshot_hash: stored.closure.closure_snapshot_hash,
          },
        );
      }
    }
  }

  private async requireClaimCandidate(
    implementationProjectId: string,
    claimCandidateId: string,
  ): Promise<ClaimCandidate> {
    const candidate = await this.resultClaimRepository.findClaimCandidateById(
      implementationProjectId,
      claimCandidateId,
    );
    if (!candidate) {
      throw new AppError(404, 'NOT_FOUND', `ClaimCandidate ${claimCandidateId} not found.`);
    }
    return candidate;
  }

  private async requireDossier(
    implementationProjectId: string,
    dossierId: string,
  ): Promise<ImplementationDossier> {
    const dossier = await this.resultClaimRepository.findImplementationDossierById(
      implementationProjectId,
      dossierId,
    );
    if (!dossier) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationDossier ${dossierId} not found.`);
    }
    return dossier;
  }

  private async requireClaimTracePacket(
    implementationProjectId: string,
    claimTracePacketId: string,
  ): Promise<ClaimTracePacket> {
    const packets = await this.traceRepository.listClaimTracePackets(implementationProjectId);
    const packet = packets.find((item) => item.claim_trace_packet_id === claimTracePacketId);
    if (!packet) {
      throw new AppError(404, 'NOT_FOUND', `ClaimTracePacket ${claimTracePacketId} not found.`);
    }
    return packet;
  }

  private assertClaimTracePacketTargetsCandidate(
    packet: ClaimTracePacket,
    claimCandidateId: string,
  ): void {
    if (
      this.normalizedRefType(packet.claim_ref.ref_type) !== 'claimcandidate'
      || packet.claim_ref.ref_id !== claimCandidateId
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ClaimCandidate claim_trace_packet_id must point to a ClaimTracePacket for the same claim candidate.',
      );
    }
  }

  private buildDossierSource(
    project: ImplementationProject,
    resultPackets: ResultInterpretationPacket[],
    claimCandidates: ClaimCandidate[],
    claimTracePackets: ClaimTracePacket[],
    traceManifest: TraceManifest,
    closedCycleSnapshotRefs: ClosedValidationCycleSnapshotRef[],
  ): ImplementationDossierSourceBundle {
    return {
      result_interpretation_packet_refs: resultPackets.map((packet) =>
        this.ref(
          'result_interpretation_packet',
          packet.result_interpretation_packet_id,
          project.title_card_id,
          packet.packet_content_hash ?? null,
        )),
      claim_candidate_refs: claimCandidates.map((candidate) =>
        this.ref('claim_candidate', candidate.claim_candidate_id, project.title_card_id, candidate.trace_manifest_id)),
      claim_trace_packet_refs: claimTracePackets.map((packet) =>
        this.ref('claim_trace_packet', packet.claim_trace_packet_id, project.title_card_id, packet.trace_manifest_id)),
      run_evidence_refs: this.dedupeRefs(resultPackets.flatMap((packet) => packet.source.run_evidence_refs)),
      validation_cycle_refs: this.dedupeRefs(closedCycleSnapshotRefs.map((closedRef) =>
        this.ref('validation_cycle', closedRef.validation_cycle_id, project.title_card_id))),
      trace_manifest_refs: this.dedupeRefs([
        this.traceManifestRef(project, traceManifest),
        ...resultPackets.map((packet) => packet.trace_manifest_ref),
        ...claimCandidates.map((candidate) => candidate.trace_manifest_ref),
        ...claimTracePackets.map((packet) => packet.trace_manifest_ref),
      ]),
      closed_validation_cycle_snapshot_refs: structuredClone(closedCycleSnapshotRefs),
    };
  }

  private traceManifestRef(
    project: ImplementationProject,
    manifest: TraceManifest,
  ): TopicSelectionFunctionalRef {
    return this.ref('trace_manifest', manifest.trace_manifest_id, project.title_card_id);
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      version_id: versionId,
    };
  }

  private forbiddenOverclaimsFor(
    request: CreateClaimCandidateRequest,
    resultPackets: ResultInterpretationPacket[],
  ): string[] {
    return [
      ...resultPackets.flatMap((packet) => packet.claim_implications.forbidden_overclaims),
      ...request.boundary.forbidden_overclaims,
    ];
  }

  private matchHighRiskOverclaim(normalizedStatement: string, forbidden: string[]): string | null {
    const statementHasHighRiskTerm = HIGH_RISK_OVERCLAIM_STATEMENT_PATTERNS.some((pattern) =>
      pattern.test(normalizedStatement));
    if (!statementHasHighRiskTerm) {
      return null;
    }
    return forbidden.find((item) => {
      const normalized = this.normalizeText(item);
      return HIGH_RISK_OVERCLAIM_TERMS.some((term) => normalized.includes(term));
    }) ?? null;
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const deduped: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(ref);
    }
    return deduped;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${this.normalizedRefType(ref.ref_type)}:${ref.ref_id}:${ref.version_id ?? ''}`;
  }

  private normalizedRefType(refType: string): string {
    // S2-C C4: converged from the looser [_-]-only strip onto the repo-wide
    // [^a-z0-9] semantics (single source in paper-implementation-runtime-utils).
    return normalizedPaperImplementationRefType(refType);
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private hashStable(value: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(this.sortForHash(value)))
      .digest('hex');
  }

  private sortForHash(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sortForHash(item));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, item]) => [key, this.sortForHash(item)]),
      );
    }
    return value;
  }

  private hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
