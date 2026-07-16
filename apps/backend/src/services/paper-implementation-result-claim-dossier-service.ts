import crypto from 'node:crypto';

import type {
  ImplementationProject,
  RecordImplementationFeedbackEventRequest,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ClaimCandidate,
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
  RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { normalizedPaperImplementationRefType } from './paper-implementation-runtime-utils.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type {
  PaperImplementationResultClaimDossierRepository,
} from '../repositories/paper-implementation-result-claim-dossier.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationWorkOrderRepository } from '../repositories/paper-implementation-workorder.repository.js';
import type {
  PaperImplementationHumanConfirmationRepository,
} from '../repositories/paper-implementation-human-confirmation.repository.js';
import {
  consumeHumanConfirmation,
  requireActiveHumanConfirmation,
  requirePassedTraceGateResult,
} from './paper-implementation-governance-gate-refs.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationResultClaimDossierFeedbackRecorder = {
  recordFeedbackEvent(
    implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse>;
};

export type PaperImplementationResultClaimDossierServiceOptions = {
  projectRepository: PaperImplementationRepository;
  resultClaimRepository: PaperImplementationResultClaimDossierRepository;
  traceRepository: PaperImplementationTraceRepository;
  validationRepository: PaperImplementationValidationRepository;
  workOrderRepository: PaperImplementationWorkOrderRepository;
  confirmationRepository: PaperImplementationHumanConfirmationRepository;
  feedbackRecorder: PaperImplementationResultClaimDossierFeedbackRecorder;
  idFactory?: IdFactory;
  now?: () => string;
};

const FAILED_LIKE_RUN_STATUSES = new Set(['failed', 'cancelled', 'negative']);
// S3-β2 (review N7): a ready dossier must reconcile against every trusted
// non-supporting run in the PROJECT, not only against the runs its included
// result packets happen to cite — otherwise selective packet inclusion can
// silently launder away failed/negative evidence.
const PROJECT_ACCOUNTABLE_RUN_STATUSES = new Set(['failed', 'cancelled', 'negative', 'inconclusive']);
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
const HIGH_RISK_OVERCLAIM_STATEMENT_PATTERNS = [
  /\b(universal|universally|always)\b/u,
  /\b(generalize|generalizes|generalized|generalization)\b/u,
  /\b(all|every|any) (task|tasks|dataset|datasets|domain|domains|setting|settings)\b/u,
  /\b(broadly|generally|globally) (improve|improves|outperform|outperforms|generalize|generalizes|reliable|superior)\b/u,
  /\b(reliable|robust) (across|for all|in all|on all)\b/u,
  /\b(superior|superiority|best|state of the art|sota)\b/u,
  /\boutperform(s)? (all|every|any|across)\b/u,
] as const;
export const MEMO_OR_SUMMARY_REF_TYPES = new Set([
  'resultinterpretationpacket',
  'llmrationale',
  'boardsummary',
  'rationalememo',
  'displaysummary',
  'internalinterpretation',
]);

export class PaperImplementationResultClaimDossierService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly resultClaimRepository: PaperImplementationResultClaimDossierRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly validationRepository: PaperImplementationValidationRepository;
  private readonly workOrderRepository: PaperImplementationWorkOrderRepository;
  private readonly confirmationRepository: PaperImplementationHumanConfirmationRepository;
  private readonly feedbackRecorder: PaperImplementationResultClaimDossierFeedbackRecorder;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationResultClaimDossierServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.resultClaimRepository = options.resultClaimRepository;
    this.traceRepository = options.traceRepository;
    this.validationRepository = options.validationRepository;
    this.workOrderRepository = options.workOrderRepository;
    this.confirmationRepository = options.confirmationRepository;
    this.feedbackRecorder = options.feedbackRecorder;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createResultInterpretationPacket(
    implementationProjectId: string,
    request: CreateResultInterpretationPacketRequest,
  ): Promise<ResultInterpretationPacket> {
    const project = await this.requireActiveProject(implementationProjectId);
    const cycle = await this.validationRepository.findValidationCycleById(
      project.implementation_project_id,
      request.validation_cycle_id,
    );
    if (!cycle) {
      throw new AppError(404, 'NOT_FOUND', `ValidationCycle ${request.validation_cycle_id} not found.`);
    }
    if (request.experiment_plan_light_id) {
      const plan = await this.validationRepository.findExperimentPlanLightById(
        project.implementation_project_id,
        request.experiment_plan_light_id,
      );
      if (!plan) {
        throw new AppError(404, 'NOT_FOUND', `ExperimentPlanLight ${request.experiment_plan_light_id} not found.`);
      }
      if (plan.validation_cycle_id !== request.validation_cycle_id) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ResultInterpretationPacket ExperimentPlanLight must belong to its ValidationCycle.',
        );
      }
    }
    const manifest = await this.requireCompleteTraceManifest(
      project.implementation_project_id,
      request.trace_manifest_id,
      'result_interpretation_packet',
      request.result_interpretation_packet_id,
      'ResultInterpretationPacket',
    );
    const runEvidenceUnits = await this.resolveRunEvidenceRefs(
      project.implementation_project_id,
      request.source.run_evidence_refs,
      request.validation_cycle_id,
      request.experiment_plan_light_id ?? null,
    );
    this.assertResultInterpretationGate(request, runEvidenceUnits);
    const createdAt = this.now();
    const packet: ResultInterpretationPacket = {
      result_interpretation_packet_id: request.result_interpretation_packet_id,
      implementation_project_id: project.implementation_project_id,
      validation_cycle_id: request.validation_cycle_id,
      experiment_plan_light_id: request.experiment_plan_light_id ?? null,
      source: request.source,
      result_summary: request.result_summary,
      reliability: request.reliability,
      claim_implications: request.claim_implications,
      interpretation_gate_status: this.hasRiskyInterpretationSignals(request) ? 'passed_with_risk' : 'passed',
      trace_manifest_ref: this.traceManifestRef(project, manifest),
      trace_manifest_id: manifest.trace_manifest_id,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.resultClaimRepository.createResultInterpretationPacket(packet);
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
    const resultPackets = await Promise.all(
      request.result_interpretation_packet_ids.map((id) =>
        this.requireResultPacket(project.implementation_project_id, id)),
    );
    this.assertClaimSupport(request);
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
          packet.trace_manifest_id,
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
    const resultPackets = await Promise.all(
      request.result_interpretation_packet_ids.map((id) =>
        this.requireResultPacket(project.implementation_project_id, id)),
    );
    const claimCandidates = await Promise.all(
      request.claim_candidate_ids.map((id) =>
        this.requireClaimCandidate(project.implementation_project_id, id)),
    );
    const claimTracePackets = await Promise.all(
      request.claim_trace_packet_ids.map((id) =>
        this.requireClaimTracePacket(project.implementation_project_id, id)),
    );
    this.assertDossierGate(request, resultPackets, claimCandidates, claimTracePackets);
    // S3 F4-3: validate the keyed readiness gate result before the (heavier)
    // project-wide RunEvidenceUnit scan. Both fail with the same 409 class, so
    // this is ordering hygiene only — cheap keyed lookups first.
    await this.assertReadinessGateResult(project.implementation_project_id, request);
    await this.assertProjectRunEvidenceAccounting(project.implementation_project_id, request, resultPackets);
    const createdAt = this.now();
    const source = this.buildDossierSource(project, resultPackets, claimCandidates, claimTracePackets, manifest);
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

  private async resolveRunEvidenceRefs(
    implementationProjectId: string,
    refs: TopicSelectionFunctionalRef[],
    validationCycleId: string,
    experimentPlanLightId: string | null,
  ): Promise<RunEvidenceUnit[]> {
    const units: RunEvidenceUnit[] = [];
    for (const ref of refs) {
      if (this.normalizedRefType(ref.ref_type) !== 'runevidenceunit') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ResultInterpretationPacket source refs must point to RunEvidenceUnit objects.',
        );
      }
      const unit = await this.workOrderRepository.findRunEvidenceUnitById(implementationProjectId, ref.ref_id);
      if (!unit) {
        throw new AppError(404, 'NOT_FOUND', `RunEvidenceUnit ${ref.ref_id} not found.`);
      }
      if (unit.trusted_status !== 'trusted') {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ResultInterpretationPacket source refs must point to trusted RunEvidenceUnit objects.',
          {
            run_evidence_unit_id: unit.run_evidence_unit_id,
            trusted_status: unit.trusted_status,
          },
        );
      }
      if (unit.validation_cycle_id !== validationCycleId) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ResultInterpretationPacket run evidence must belong to its ValidationCycle.',
        );
      }
      if (experimentPlanLightId && unit.experiment_plan_light_id !== experimentPlanLightId) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ResultInterpretationPacket run evidence must belong to its ExperimentPlanLight.',
        );
      }
      units.push(unit);
    }
    return units;
  }

  private assertResultInterpretationGate(
    request: CreateResultInterpretationPacketRequest,
    runEvidenceUnits: RunEvidenceUnit[],
  ): void {
    if (runEvidenceUnits.length === 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ResultInterpretationPacket requires RunEvidenceUnit source refs.');
    }
    if (!request.result_summary.exploratory_confirmatory_separated) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResultInterpretationPacket must separate exploratory and confirmatory evidence.',
      );
    }
    if (request.claim_implications.forbidden_overclaims.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ResultInterpretationPacket must list forbidden overclaims.',
      );
    }
    const validationReportRefs = runEvidenceUnits
      .map((unit) => unit.result_validation_report_ref)
      .filter((ref): ref is TopicSelectionFunctionalRef => Boolean(ref));
    if (validationReportRefs.length > 0) {
      this.assertRefsCoverFunctionalRefs(
        request.source.validation_report_refs,
        validationReportRefs,
        'validation_report_refs',
      );
    }
    const successfulRuns = runEvidenceUnits.filter((unit) => unit.run_status === 'succeeded');
    if (successfulRuns.length > 0 && request.source.metric_refs.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Successful run evidence requires metric_refs in ResultInterpretationPacket source.',
      );
    }
    const failedLikeRuns = runEvidenceUnits.filter((unit) => FAILED_LIKE_RUN_STATUSES.has(unit.run_status));
    if (failedLikeRuns.length > 0) {
      if (!request.result_summary.failed_runs_accounted_for || !request.reliability.failed_runs_retained) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Failed, cancelled, or negative run evidence must be accounted for and retained.',
        );
      }
      this.assertRefsCoverUnits(request.source.failed_run_refs, failedLikeRuns, 'failed_run_refs');
    }
    const inconclusiveRuns = runEvidenceUnits.filter((unit) => unit.run_status === 'inconclusive');
    if (inconclusiveRuns.length > 0) {
      if (!request.result_summary.inconclusive_runs_accounted_for) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Inconclusive run evidence must be accounted for.',
        );
      }
      this.assertRefsCoverUnits(request.source.inconclusive_run_refs, inconclusiveRuns, 'inconclusive_run_refs');
    }
  }

  private assertRefsCoverFunctionalRefs(
    refs: TopicSelectionFunctionalRef[],
    requiredRefs: TopicSelectionFunctionalRef[],
    fieldName: string,
  ): void {
    const keys = new Set(refs.map((ref) => this.refKey(ref)));
    const missing = requiredRefs.filter((ref) => !keys.has(this.refKey(ref)));
    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResultInterpretationPacket ${fieldName} must list every required source ref.`,
        { missing_refs: missing },
      );
    }
  }

  private assertRefsCoverUnits(
    refs: TopicSelectionFunctionalRef[],
    units: RunEvidenceUnit[],
    fieldName: string,
  ): void {
    const ids = new Set(refs.map((ref) => ref.ref_id));
    const missing = units.filter((unit) => !ids.has(unit.run_evidence_unit_id));
    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ResultInterpretationPacket ${fieldName} must list every matching RunEvidenceUnit.`,
        { missing_run_evidence_unit_ids: missing.map((unit) => unit.run_evidence_unit_id) },
      );
    }
  }

  private assertClaimSupport(request: CreateClaimCandidateRequest): void {
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
    if (request.claim_strength === 'strong' && !request.boundary.human_confirmation_ref) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Strong ClaimCandidate requires explicit human confirmation.',
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
    await requireActiveHumanConfirmation(
      this.confirmationRepository,
      project.implementation_project_id,
      confirmationRef.ref_id,
      'strong_claim_acceptance',
      'Strong ClaimCandidate',
      this.strongClaimConfirmationTarget(project, request),
    );
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
    const tracePacketIds = new Set(claimTracePackets.map((packet) => packet.claim_trace_packet_id));
    const missingTracePacket = claimCandidates.find((candidate) =>
      !candidate.claim_trace_packet_id || !tracePacketIds.has(candidate.claim_trace_packet_id));
    if (missingTracePacket) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier requires every included ClaimCandidate to have an included ClaimTracePacket.',
      );
    }
    if (request.claim_section.forbidden_overclaims.length === 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must preserve forbidden overclaims.',
      );
    }
    this.assertDossierRunAccounting(request, resultPackets);
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

  private assertDossierRunAccounting(
    request: CreateImplementationDossierRequest,
    resultPackets: ResultInterpretationPacket[],
  ): void {
    const failedRunIds = new Set(
      resultPackets.flatMap((packet) => packet.source.failed_run_refs.map((ref) => ref.ref_id)),
    );
    const includedFailedRunIds = new Set(request.experiment_section.failed_run_refs.map((ref) => ref.ref_id));
    const missingFailed = [...failedRunIds].filter((id) => !includedFailedRunIds.has(id));
    if (missingFailed.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must include all failed, cancelled, and negative run refs.',
        { missing_run_evidence_unit_ids: missingFailed },
      );
    }
    const inconclusiveRunIds = new Set(
      resultPackets.flatMap((packet) => packet.source.inconclusive_run_refs.map((ref) => ref.ref_id)),
    );
    const includedInconclusiveRunIds = new Set(request.experiment_section.inconclusive_run_refs.map((ref) => ref.ref_id));
    const missingInconclusive = [...inconclusiveRunIds].filter((id) => !includedInconclusiveRunIds.has(id));
    if (missingInconclusive.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must include all inconclusive run refs.',
        { missing_run_evidence_unit_ids: missingInconclusive },
      );
    }
  }

  /**
   * S3-β2 (review N7): project-level failed-run reconciliation for the
   * ready_for_writing path. Every trusted RunEvidenceUnit in the project whose
   * run_status is failed/cancelled/negative/inconclusive must be visibly
   * accounted for by the dossier through one of:
   * - experiment_section.failed_run_refs / inconclusive_run_refs /
   *   negative_result_refs (direct disclosure),
   * - an included ResultInterpretationPacket's source.run_evidence_refs
   *   (the packet already carries the interpretation-side accounting), or
   * - experiment_section.excluded_stale_or_invalidated_evidence_refs
   *   (explicit, reviewable exemption — e.g. superseded or invalidated runs).
   * Anything uncovered fails closed with the missing RunEvidenceUnit ids.
   * Untrusted/needs_review units are out of scope: they are not admissible
   * evidence in either direction, and trusting them is a separate gate.
   *
   * S3 F4-1: the exemption list is validated, not trusted — every excluded
   * ref must resolve to a real project RunEvidenceUnit that is provably
   * superseded (see resolveProvablyInvalidatedExclusions). Otherwise listing
   * all failed runs as "excluded" would zero-disclosure the ready gate.
   * S3 F4-2: coverage only counts refs whose normalized ref_type is
   * run_evidence_unit, so a foreign-typed ref whose ref_id happens to collide
   * with a RunEvidenceUnit id no longer counts as accounting for it.
   */
  private async assertProjectRunEvidenceAccounting(
    implementationProjectId: string,
    request: CreateImplementationDossierRequest,
    resultPackets: ResultInterpretationPacket[],
  ): Promise<void> {
    if (request.dossier_status !== 'ready_for_writing') {
      return;
    }
    const projectUnits = await this.workOrderRepository.listRunEvidenceUnits(implementationProjectId);
    const exemptedRunIds = await this.resolveProvablyInvalidatedExclusions(
      implementationProjectId,
      request.experiment_section.excluded_stale_or_invalidated_evidence_refs,
      projectUnits,
    );
    const accountableUnits = projectUnits.filter((unit) =>
      unit.trusted_status === 'trusted' && PROJECT_ACCOUNTABLE_RUN_STATUSES.has(unit.run_status));
    if (accountableUnits.length === 0) {
      return;
    }
    const coveredRunIds = new Set([
      ...this.runEvidenceRefIds(request.experiment_section.failed_run_refs),
      ...this.runEvidenceRefIds(request.experiment_section.inconclusive_run_refs),
      ...this.runEvidenceRefIds(request.experiment_section.negative_result_refs),
      ...exemptedRunIds,
      ...resultPackets.flatMap((packet) => this.runEvidenceRefIds(packet.source.run_evidence_refs)),
    ]);
    const missing = accountableUnits.filter((unit) => !coveredRunIds.has(unit.run_evidence_unit_id));
    if (missing.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier must account for every trusted failed, cancelled, negative, or inconclusive RunEvidenceUnit in the project (cover it in experiment_section refs, an included result packet source, or exempt it via excluded_stale_or_invalidated_evidence_refs).',
        {
          missing_run_evidence_unit_ids: missing.map((unit) => unit.run_evidence_unit_id),
          missing_run_statuses: Object.fromEntries(missing.map((unit) => [unit.run_evidence_unit_id, unit.run_status])),
        },
      );
    }
  }

  /**
   * S3 F4-1: excluded_stale_or_invalidated_evidence_refs is an audited
   * exemption, not a free-form escape hatch. Each excluded ref must:
   * (a) be a run_evidence_unit ref that resolves to a RunEvidenceUnit that
   *     actually exists in this project (the already-fetched projectUnits), and
   * (b) be provably invalidated — either a strictly NEWER trusted
   *     RunEvidenceUnit exists for the same work order (a trusted rerun
   *     supersedes it), or its owning ResearchWorkOrder is superseded.
   * Refs that fail (a) are reported as unresolved; units that fail (b) as
   * not-superseded. Both fail closed with a 409.
   *
   * NOTE (contract gap, no contract change here): RunEvidenceUnit carries no
   * first-class staleness/invalidation marker, so "provably invalidated" is
   * approximated from same-work-order supersession (newer trusted REU or a
   * superseded work order). A proper invalidated/stale flag on the REU needs
   * a workorder-contract evolution and should replace this heuristic then.
   */
  private async resolveProvablyInvalidatedExclusions(
    implementationProjectId: string,
    excludedRefs: TopicSelectionFunctionalRef[],
    projectUnits: RunEvidenceUnit[],
  ): Promise<Set<string>> {
    const exemptedRunIds = new Set<string>();
    if (excludedRefs.length === 0) {
      return exemptedRunIds;
    }
    const unitsById = new Map(projectUnits.map((unit) => [unit.run_evidence_unit_id, unit]));
    const unresolvedRefs: Array<{ ref_type: string; ref_id: string }> = [];
    const notSupersededRunIds: string[] = [];
    const workOrderStatusCache = new Map<string, string | null>();
    for (const ref of excludedRefs) {
      if (this.normalizedRefType(ref.ref_type) !== 'runevidenceunit') {
        unresolvedRefs.push({ ref_type: ref.ref_type, ref_id: ref.ref_id });
        continue;
      }
      const unit = unitsById.get(ref.ref_id);
      if (!unit) {
        unresolvedRefs.push({ ref_type: ref.ref_type, ref_id: ref.ref_id });
        continue;
      }
      const supersededByNewerTrustedRun = projectUnits.some((candidate) =>
        candidate.run_evidence_unit_id !== unit.run_evidence_unit_id
        && candidate.work_order_id === unit.work_order_id
        && candidate.trusted_status === 'trusted'
        && candidate.created_at > unit.created_at);
      let provablyInvalidated = supersededByNewerTrustedRun;
      if (!provablyInvalidated) {
        if (!workOrderStatusCache.has(unit.work_order_id)) {
          const workOrder = await this.workOrderRepository.findWorkOrderById(
            implementationProjectId,
            unit.work_order_id,
          );
          workOrderStatusCache.set(unit.work_order_id, workOrder?.work_order_status ?? null);
        }
        provablyInvalidated = workOrderStatusCache.get(unit.work_order_id) === 'superseded';
      }
      if (!provablyInvalidated) {
        notSupersededRunIds.push(unit.run_evidence_unit_id);
        continue;
      }
      exemptedRunIds.add(unit.run_evidence_unit_id);
    }
    if (unresolvedRefs.length > 0 || notSupersededRunIds.length > 0) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Ready ImplementationDossier excluded_stale_or_invalidated_evidence_refs must resolve to project RunEvidenceUnit objects that are provably superseded or invalidated (unresolved refs / not-superseded units are rejected).',
        {
          unresolved_excluded_refs: unresolvedRefs,
          not_superseded_excluded_run_evidence_unit_ids: notSupersededRunIds,
        },
      );
    }
    return exemptedRunIds;
  }

  // S3 F4-2: coverage accounting only accepts run_evidence_unit-typed refs
  // (same pattern as assertClaimSectionRefsResolve for claim refs).
  private runEvidenceRefIds(refs: TopicSelectionFunctionalRef[]): string[] {
    return refs
      .filter((ref) => this.normalizedRefType(ref.ref_type) === 'runevidenceunit')
      .map((ref) => ref.ref_id);
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
  ): ImplementationDossierSourceBundle {
    return {
      result_interpretation_packet_refs: resultPackets.map((packet) =>
        this.ref(
          'result_interpretation_packet',
          packet.result_interpretation_packet_id,
          project.title_card_id,
          packet.trace_manifest_id,
        )),
      claim_candidate_refs: claimCandidates.map((candidate) =>
        this.ref('claim_candidate', candidate.claim_candidate_id, project.title_card_id, candidate.trace_manifest_id)),
      claim_trace_packet_refs: claimTracePackets.map((packet) =>
        this.ref('claim_trace_packet', packet.claim_trace_packet_id, project.title_card_id, packet.trace_manifest_id)),
      run_evidence_refs: this.dedupeRefs(resultPackets.flatMap((packet) => packet.source.run_evidence_refs)),
      validation_cycle_refs: this.dedupeRefs(resultPackets.map((packet) =>
        this.ref('validation_cycle', packet.validation_cycle_id, project.title_card_id))),
      trace_manifest_refs: this.dedupeRefs([
        this.traceManifestRef(project, traceManifest),
        ...resultPackets.map((packet) => packet.trace_manifest_ref),
        ...claimCandidates.map((candidate) => candidate.trace_manifest_ref),
        ...claimTracePackets.map((packet) => packet.trace_manifest_ref),
      ]),
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

  private hasRiskyInterpretationSignals(request: CreateResultInterpretationPacketRequest): boolean {
    return request.source.failed_run_refs.length > 0
      || request.source.inconclusive_run_refs.length > 0
      || request.source.stale_or_invalidated_evidence_refs.length > 0
      || request.reliability.confound_refs.length > 0
      || request.result_summary.unexpected_findings.length > 0;
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
