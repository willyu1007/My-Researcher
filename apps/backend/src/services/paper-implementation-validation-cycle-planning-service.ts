import crypto from 'node:crypto';

import type {
  CreateExperimentPlanLightRequest,
  CreateFeasibilityProbeRequest,
  CreateTechnicalRouteCandidateRequest,
  CreateValidationCycleDraftRequest,
  CreateValidationUpstreamFeedbackCandidateRequest,
  DispatchValidationUpstreamFeedbackCandidateRequest,
  DispatchValidationUpstreamFeedbackCandidateResponse,
  ExperimentPlanLight,
  FeasibilityProbe,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationCycleIncludedRefs,
  ValidationCycleInputSnapshot,
  ValidationCycleOutputs,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
  AdmitValidationCycleRequest,
  CompleteValidationCycleRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  ImplementationProject,
  RecordImplementationFeedbackEventRequest,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CoreMotiveIdentity,
  CoreMotiveVersion,
  MotiveEvidenceBoardVersion,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import type { PaperImplementationMotiveRepository } from '../repositories/paper-implementation-motive.repository.js';
import type { PaperImplementationRepository } from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import {
  requireAcceptedProposalLineage,
  type PaperImplementationAcceptanceBridgeAdmissionReader,
} from './paper-implementation-acceptance-bridge.js';

type IdFactory = (prefix: string) => string;

export type PaperImplementationFeedbackRecorder = {
  recordFeedbackEvent(
    implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse>;
};

export type PaperImplementationValidationCyclePlanningServiceOptions = {
  projectRepository: PaperImplementationRepository;
  motiveRepository: PaperImplementationMotiveRepository;
  traceRepository: PaperImplementationTraceRepository;
  validationRepository: PaperImplementationValidationRepository;
  feedbackRecorder?: PaperImplementationFeedbackRecorder;
  runtimeAdmission?: PaperImplementationAcceptanceBridgeAdmissionReader;
  idFactory?: IdFactory;
  now?: () => string;
};

const ACTIVE_PORTFOLIO_ROLES = new Set(['primary', 'secondary', 'fallback', 'supporting']);
const LOW_INFORMATION_GAINS = new Set(['none', 'low']);
const MEMO_LIKE_REF_TYPES = new Set([
  'boardsummary',
  'displaysummary',
  'llmsummary',
  'llmrationale',
  'rationalememo',
  'resultinterpretation',
]);
const DEFAULT_POLICY_VERSION = 'paper-implementation-validation-v1';

export class PaperImplementationValidationCyclePlanningService {
  private readonly projectRepository: PaperImplementationRepository;
  private readonly motiveRepository: PaperImplementationMotiveRepository;
  private readonly traceRepository: PaperImplementationTraceRepository;
  private readonly validationRepository: PaperImplementationValidationRepository;
  private readonly feedbackRecorder?: PaperImplementationFeedbackRecorder;
  private readonly runtimeAdmission?: PaperImplementationAcceptanceBridgeAdmissionReader;
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(options: PaperImplementationValidationCyclePlanningServiceOptions) {
    this.projectRepository = options.projectRepository;
    this.motiveRepository = options.motiveRepository;
    this.traceRepository = options.traceRepository;
    this.validationRepository = options.validationRepository;
    this.feedbackRecorder = options.feedbackRecorder;
    this.runtimeAdmission = options.runtimeAdmission;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createValidationCycleDraft(
    implementationProjectId: string,
    request: CreateValidationCycleDraftRequest,
  ): Promise<ValidationCycle> {
    const project = await this.requireActiveProject(implementationProjectId);
    this.assertValidationFrame(request);
    this.assertCriteria(request.criteria);
    this.assertBudget(request.budget);
    this.assertExpectedInformationGainOverride(request);
    const targetVersion = await this.requireAdmittedTarget(project.implementation_project_id, request);
    const proposalLineage = await requireAcceptedProposalLineage({
      runtimeAdmission: this.runtimeAdmission,
      implementationProjectId: project.implementation_project_id,
      targetType: 'validation_cycle',
      request,
    });
    const createdAt = this.now();
    const createdBy = request.created_by ?? 'system';
    const validationCycleId = request.validation_cycle_id ?? this.idFactory('validation_cycle');
    const includedRefs = await this.normalizeAndRequireTraceReadyContext(
      project.implementation_project_id,
      targetVersion,
      this.normalizeIncludedRefs(
        request.context?.included_refs,
        targetVersion,
        request.target,
      ),
    );
    this.assertNoMemoOnlyEvidence(includedRefs.evidence_refs);
    await this.assertAssertionsBelongToVersion(
      project.implementation_project_id,
      targetVersion,
      request.validation_frame.assertions_under_test,
    );

    const inputSnapshot: ValidationCycleInputSnapshot = {
      input_snapshot_id: request.context?.input_snapshot_id ?? this.idFactory('validation_input_snapshot'),
      implementation_project_id: project.implementation_project_id,
      context_policy_version_id: request.context?.context_policy_version_id ?? DEFAULT_POLICY_VERSION,
      included_refs: includedRefs,
      excluded_context_notes: request.context?.excluded_context_notes ?? [],
      input_snapshot_hash: request.context?.input_snapshot_hash ?? this.hashPayload({
        included_refs: includedRefs,
        validation_frame: request.validation_frame,
        criteria: request.criteria,
        budget: request.budget,
      }),
      created_by: createdBy,
      created_at: createdAt,
    };
    const validationCycle: ValidationCycle = {
      validation_cycle_id: validationCycleId,
      implementation_project_id: project.implementation_project_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      target: request.target,
      trigger: request.trigger,
      cycle_type: request.cycle_type,
      validation_frame: request.validation_frame,
      context: inputSnapshot,
      criteria: request.criteria,
      budget: request.budget,
      lifecycle_status: 'proposed',
      execution_status: 'not_started',
      outputs: this.emptyOutputs(),
      cycle_assessment: null,
      trace_manifest_ref: null,
      trace_manifest_id: null,
      gate_result_id: null,
      decision_exit: request.decision_exit ?? null,
      confirmation_level: request.confirmation_level ?? 'not_required',
      confirmed_by: request.confirmed_by ?? null,
      policy_version_id: request.policy_version_id ?? project.policy_version_id ?? null,
      source_proposal_artifact_ref: proposalLineage?.source_proposal_artifact_ref ?? null,
      source_proposal_artifact_hash: proposalLineage?.source_proposal_artifact_hash ?? null,
      created_by: createdBy,
      created_at: createdAt,
      updated_at: createdAt,
      admitted_at: null,
      completed_at: null,
    };
    const persisted = await this.validationRepository.createValidationCycleDraft({
      input_snapshot: inputSnapshot,
      validation_cycle: validationCycle,
    });
    return persisted.validation_cycle;
  }

  async admitValidationCycle(
    implementationProjectId: string,
    validationCycleId: string,
    request: AdmitValidationCycleRequest,
  ): Promise<ValidationCycle> {
    const project = await this.requireActiveProject(implementationProjectId);
    const cycle = await this.requireValidationCycle(implementationProjectId, validationCycleId);
    if (cycle.lifecycle_status !== 'proposed') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only proposed ValidationCycle objects can be admitted.');
    }
    this.assertExpectedInformationGainOverride({
      validation_frame: cycle.validation_frame,
      human_override_expected_information_gain_none: request.human_override_expected_information_gain_none,
      confirmation_level: request.confirmation_level ?? cycle.confirmation_level,
    });
    const traceManifest = await this.requireCompleteTraceManifest(
      implementationProjectId,
      request.trace_manifest_id,
      'validation_cycle',
      cycle.validation_cycle_id,
    );
    await this.requireAdmittedTarget(implementationProjectId, {
      target: cycle.target,
      validation_frame: cycle.validation_frame,
      context: cycle.context,
    } as CreateValidationCycleDraftRequest);
    await this.assertAdmissionExperimentPlanConstraints(cycle, request);
    const admittedAt = this.now();
    const updated: ValidationCycle = {
      ...cycle,
      lifecycle_status: 'admitted',
      execution_status: 'not_started',
      trace_manifest_id: traceManifest.trace_manifest_id,
      trace_manifest_ref: this.traceManifestRef(project, traceManifest),
      gate_result_id: request.gate_result_id ?? cycle.gate_result_id ?? this.idFactory('validation_gate_result'),
      decision_exit: request.decision_exit ?? cycle.decision_exit,
      confirmation_level: request.confirmation_level ?? cycle.confirmation_level,
      confirmed_by: request.confirmed_by ?? cycle.confirmed_by ?? null,
      updated_at: admittedAt,
      admitted_at: admittedAt,
    };
    return this.validationRepository.updateValidationCycle(updated);
  }

  async completeValidationCycle(
    implementationProjectId: string,
    validationCycleId: string,
    request: CompleteValidationCycleRequest,
  ): Promise<ValidationCycle> {
    await this.requireActiveProject(implementationProjectId);
    const cycle = await this.requireValidationCycle(implementationProjectId, validationCycleId);
    if (!['admitted', 'running', 'interpreting'].includes(cycle.lifecycle_status)) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only admitted or in-progress ValidationCycle objects can complete.');
    }
    const recentBefore = await this.validationRepository.listRecentCompletedCyclesByTarget(
      implementationProjectId,
      cycle.target.target_type,
      cycle.target.target_id,
      2,
    );
    const completedAt = this.now();
    const updated: ValidationCycle = {
      ...cycle,
      lifecycle_status: request.lifecycle_status ?? 'completed',
      execution_status: request.execution_status ?? 'completed',
      outputs: this.mergeOutputs(cycle.outputs, request.outputs),
      cycle_assessment: request.cycle_assessment,
      updated_at: completedAt,
      completed_at: completedAt,
    };
    const persisted = await this.validationRepository.updateValidationCycle(updated);
    if (
      LOW_INFORMATION_GAINS.has(request.cycle_assessment.information_gain_realized)
      && recentBefore.some((previous) => (
        previous.cycle_assessment
        && LOW_INFORMATION_GAINS.has(previous.cycle_assessment.information_gain_realized)
      ))
    ) {
      await this.validationRepository.createReviewItem({
        review_item_id: this.idFactory('validation_review_item'),
        implementation_project_id: implementationProjectId,
        validation_cycle_id: validationCycleId,
        item_kind: 'loop_budget_review',
        status: 'open',
        severity: 'warning',
        blocker_code: 'REPEATED_LOW_INFORMATION_GAIN',
        summary: 'Repeated low or no information gain requires loop-budget review before scheduling another cycle.',
        source_refs: [this.functionalRef('validation_cycle', validationCycleId)],
        created_at: completedAt,
        resolved_at: null,
      });
    }
    return persisted;
  }

  async listValidationCycles(
    implementationProjectId: string,
  ): Promise<ValidationCycle[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.validationRepository.listValidationCycles(implementationProjectId);
  }

  async getValidationCycle(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle> {
    await this.requireActiveProject(implementationProjectId);
    return this.requireValidationCycle(implementationProjectId, validationCycleId);
  }

  async createTechnicalRouteCandidate(
    implementationProjectId: string,
    request: CreateTechnicalRouteCandidateRequest,
  ): Promise<TechnicalRouteCandidate> {
    const project = await this.requireActiveProject(implementationProjectId);
    const version = await this.requireAdmittedCoreMotiveVersion(implementationProjectId, request.core_motive_version_id);
    if (request.motive_id && request.motive_id !== version.motive_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'TechnicalRouteCandidate motive_id must match its CoreMotiveVersion.',
      );
    }
    if (request.validation_cycle_id) {
      const cycle = await this.requireValidationCycle(implementationProjectId, request.validation_cycle_id);
      this.assertCycleIncludesMotiveVersion(cycle, version.core_motive_version_id);
    }
    const proposalLineage = await requireAcceptedProposalLineage({
      runtimeAdmission: this.runtimeAdmission,
      implementationProjectId: project.implementation_project_id,
      targetType: 'technical_route_candidate',
      request,
    });
    const routeCandidateId = request.route_candidate_id ?? this.idFactory('technical_route_candidate');
    const traceManifest = await this.requireCompleteTraceManifest(
      implementationProjectId,
      request.trace_manifest_id,
      'technical_route_candidate',
      routeCandidateId,
    );
    const createdAt = this.now();
    const route: TechnicalRouteCandidate = {
      route_candidate_id: routeCandidateId,
      implementation_project_id: implementationProjectId,
      validation_cycle_id: request.validation_cycle_id ?? null,
      motive_id: request.motive_id ?? version.motive_id,
      core_motive_version_id: request.core_motive_version_id,
      route_summary: request.route_summary.trim(),
      route_status: request.route_status ?? 'proposed',
      expected_information_gain: request.expected_information_gain,
      baseline_gap_status: request.baseline_gap_status ?? 'not_applicable',
      scope_boundary_ref: request.scope_boundary_ref ?? null,
      primary_metric_refs: request.primary_metric_refs,
      secondary_metric_refs: request.secondary_metric_refs ?? [],
      dataset_version_refs: request.dataset_version_refs ?? [],
      baseline_version_refs: request.baseline_version_refs ?? [],
      code_version_refs: request.code_version_refs ?? [],
      config_refs: request.config_refs ?? [],
      confirmatory_marker: request.confirmatory_marker ?? false,
      trace_manifest_ref: this.traceManifestRef(project, traceManifest),
      trace_manifest_id: traceManifest.trace_manifest_id,
      source_proposal_artifact_ref: proposalLineage?.source_proposal_artifact_ref ?? null,
      source_proposal_artifact_hash: proposalLineage?.source_proposal_artifact_hash ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.validationRepository.createTechnicalRouteCandidate(route);
  }

  async createFeasibilityProbe(
    implementationProjectId: string,
    request: CreateFeasibilityProbeRequest,
  ): Promise<FeasibilityProbe> {
    const project = await this.requireActiveProject(implementationProjectId);
    if (request.validation_cycle_id) {
      await this.requireValidationCycle(implementationProjectId, request.validation_cycle_id);
    }
    const proposalLineage = await requireAcceptedProposalLineage({
      runtimeAdmission: this.runtimeAdmission,
      implementationProjectId: project.implementation_project_id,
      targetType: 'feasibility_probe',
      request,
    });
    const probeId = request.probe_id ?? this.idFactory('feasibility_probe');
    const traceManifest = await this.requireCompleteTraceManifest(
      implementationProjectId,
      request.trace_manifest_id,
      'feasibility_probe',
      probeId,
    );
    const createdAt = this.now();
    const probe: FeasibilityProbe = {
      probe_id: probeId,
      implementation_project_id: implementationProjectId,
      validation_cycle_id: request.validation_cycle_id ?? null,
      probe_kind: request.probe_kind,
      probe_question: request.probe_question.trim(),
      probe_status: request.probe_status ?? 'proposed',
      expected_information_gain: request.expected_information_gain,
      baseline_gap_status: request.baseline_gap_status ?? 'not_applicable',
      scope_boundary_ref: request.scope_boundary_ref ?? null,
      primary_metric_refs: request.primary_metric_refs ?? [],
      secondary_metric_refs: request.secondary_metric_refs ?? [],
      dataset_version_refs: request.dataset_version_refs ?? [],
      baseline_version_refs: request.baseline_version_refs ?? [],
      code_version_refs: request.code_version_refs ?? [],
      config_refs: request.config_refs ?? [],
      confirmatory_marker: request.confirmatory_marker ?? false,
      trace_manifest_ref: this.traceManifestRef(project, traceManifest),
      trace_manifest_id: traceManifest.trace_manifest_id,
      source_proposal_artifact_ref: proposalLineage?.source_proposal_artifact_ref ?? null,
      source_proposal_artifact_hash: proposalLineage?.source_proposal_artifact_hash ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.validationRepository.createFeasibilityProbe(probe);
  }

  async createExperimentPlanLight(
    implementationProjectId: string,
    request: CreateExperimentPlanLightRequest,
  ): Promise<ExperimentPlanLight> {
    const project = await this.requireActiveProject(implementationProjectId);
    let cycle: ValidationCycle | null = null;
    if (request.validation_cycle_id) {
      cycle = await this.requireValidationCycle(implementationProjectId, request.validation_cycle_id);
    }
    let route: TechnicalRouteCandidate | null = null;
    if (request.route_candidate_id) {
      route = await this.validationRepository.findTechnicalRouteCandidateById(
        implementationProjectId,
        request.route_candidate_id,
      );
      if (!route) {
        throw new AppError(404, 'NOT_FOUND', `TechnicalRouteCandidate ${request.route_candidate_id} not found.`);
      }
      if (
        request.validation_cycle_id
        && route.validation_cycle_id
        && route.validation_cycle_id !== request.validation_cycle_id
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ExperimentPlanLight validation_cycle_id must match its TechnicalRouteCandidate.',
        );
      }
      if (!cycle && route.validation_cycle_id) {
        cycle = await this.requireValidationCycle(implementationProjectId, route.validation_cycle_id);
      }
      if (cycle) {
        this.assertCycleIncludesMotiveVersion(cycle, route.core_motive_version_id);
      }
    }
    const proposalLineage = await requireAcceptedProposalLineage({
      runtimeAdmission: this.runtimeAdmission,
      implementationProjectId: project.implementation_project_id,
      targetType: 'experiment_plan_light',
      request,
    });
    const planId = request.experiment_plan_light_id ?? this.idFactory('experiment_plan_light');
    const traceManifest = await this.requireCompleteTraceManifest(
      implementationProjectId,
      request.trace_manifest_id,
      'experiment_plan_light',
      planId,
    );
    const createdAt = this.now();
    const plan: ExperimentPlanLight = {
      experiment_plan_light_id: planId,
      implementation_project_id: implementationProjectId,
      validation_cycle_id: request.validation_cycle_id ?? route?.validation_cycle_id ?? null,
      route_candidate_id: request.route_candidate_id ?? null,
      run_mode: request.run_mode,
      plan_summary: request.plan_summary.trim(),
      estimated_cost_class: request.estimated_cost_class,
      baseline_gap_status: request.baseline_gap_status,
      primary_metric_refs: request.primary_metric_refs,
      secondary_metric_refs: request.secondary_metric_refs ?? [],
      dataset_version_refs: request.dataset_version_refs,
      baseline_version_refs: request.baseline_version_refs ?? [],
      code_version_refs: request.code_version_refs,
      config_refs: request.config_refs,
      confirmatory_marker: request.confirmatory_marker ?? request.run_mode === 'confirmatory',
      scope_boundary_ref: request.scope_boundary_ref ?? null,
      budget_id: request.budget_id,
      stop_condition_refs: request.stop_condition_refs,
      trace_manifest_ref: this.traceManifestRef(project, traceManifest),
      trace_manifest_id: traceManifest.trace_manifest_id,
      source_proposal_artifact_ref: proposalLineage?.source_proposal_artifact_ref ?? null,
      source_proposal_artifact_hash: proposalLineage?.source_proposal_artifact_hash ?? null,
      created_by: request.created_by ?? 'system',
      created_at: createdAt,
    };
    return this.validationRepository.createExperimentPlanLight(plan);
  }

  async listValidationPlanningReviewItems(
    implementationProjectId: string,
  ): Promise<ValidationPlanningReviewItem[]> {
    await this.requireActiveProject(implementationProjectId);
    return this.validationRepository.listReviewItems(implementationProjectId);
  }

  async createValidationUpstreamFeedbackCandidate(
    implementationProjectId: string,
    request: CreateValidationUpstreamFeedbackCandidateRequest,
  ): Promise<ValidationUpstreamFeedbackCandidate> {
    await this.requireActiveProject(implementationProjectId);
    if (request.validation_cycle_id) {
      await this.requireValidationCycle(implementationProjectId, request.validation_cycle_id);
    }
    const candidate: ValidationUpstreamFeedbackCandidate = {
      candidate_id: request.candidate_id ?? this.idFactory('validation_feedback_candidate'),
      implementation_project_id: implementationProjectId,
      validation_cycle_id: request.validation_cycle_id ?? null,
      source_object_refs: request.source_object_refs,
      evidence_refs: request.evidence_refs ?? [],
      feedback_type: request.feedback_type,
      severity: request.severity,
      summary: request.summary.trim(),
      recommended_upstream_action: request.recommended_upstream_action ?? 'recheck_topic_selection',
      candidate_status: 'candidate',
      feedback_event_ref: null,
      created_by: request.created_by ?? 'system',
      created_at: this.now(),
      dispatched_at: null,
    };
    return this.validationRepository.createFeedbackCandidate(candidate);
  }

  async dispatchValidationUpstreamFeedbackCandidate(
    implementationProjectId: string,
    candidateId: string,
    request: DispatchValidationUpstreamFeedbackCandidateRequest,
  ): Promise<DispatchValidationUpstreamFeedbackCandidateResponse> {
    await this.requireActiveProject(implementationProjectId);
    const candidate = await this.validationRepository.findFeedbackCandidateById(
      implementationProjectId,
      candidateId,
    );
    if (!candidate) {
      throw new AppError(404, 'NOT_FOUND', `ValidationUpstreamFeedbackCandidate ${candidateId} not found.`);
    }
    if (candidate.candidate_status !== 'candidate') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Only candidate feedback can be dispatched.');
    }
    if (!this.feedbackRecorder) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Feedback dispatch is not configured.');
    }
    const feedbackDispatch = await this.feedbackRecorder.recordFeedbackEvent(
      implementationProjectId,
      {
        feedback_type: candidate.feedback_type,
        severity: candidate.severity,
        summary: candidate.summary,
        source_object_refs: candidate.source_object_refs,
        evidence_refs: candidate.evidence_refs,
        recommended_upstream_action: candidate.recommended_upstream_action,
        required_action: request.required_action ?? null,
        feedback_payload: {
          source: 'validation_upstream_feedback_candidate',
          candidate_id: candidate.candidate_id,
          validation_cycle_id: candidate.validation_cycle_id,
        },
        created_by: request.created_by ?? candidate.created_by,
      },
    );
    const dispatchedAt = this.now();
    const updated = await this.validationRepository.updateFeedbackCandidate({
      ...candidate,
      candidate_status: 'dispatched',
      feedback_event_ref: this.functionalRef(
        'implementation_feedback_event',
        feedbackDispatch.feedback_event.feedback_event_id,
      ),
      dispatched_at: dispatchedAt,
    });
    return {
      feedback_candidate: updated,
      feedback_dispatch: feedbackDispatch,
    };
  }

  private async requireActiveProject(implementationProjectId: string) {
    if (!this.hasText(implementationProjectId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'implementation_project_id is required.');
    }
    const project = await this.projectRepository.findProjectById(implementationProjectId);
    if (!project) {
      throw new AppError(404, 'NOT_FOUND', `ImplementationProject ${implementationProjectId} not found.`);
    }
    if (project.lifecycle_status !== 'active') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Validation planning requires an active ImplementationProject.');
    }
    return project;
  }

  private async requireValidationCycle(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycle> {
    if (!this.hasText(validationCycleId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'validation_cycle_id is required.');
    }
    const cycle = await this.validationRepository.findValidationCycleById(
      implementationProjectId,
      validationCycleId,
    );
    if (!cycle) {
      throw new AppError(404, 'NOT_FOUND', `ValidationCycle ${validationCycleId} not found.`);
    }
    return cycle;
  }

  private async requireAdmittedTarget(
    implementationProjectId: string,
    request: Pick<CreateValidationCycleDraftRequest, 'target' | 'validation_frame' | 'context'>,
  ): Promise<CoreMotiveVersion> {
    if (request.target.target_type === 'motive_evidence_board') {
      const board = await this.requireTraceReadyBoard(implementationProjectId, request.target.target_id);
      return this.requireAdmittedCoreMotiveVersion(implementationProjectId, board.core_motive_version_id);
    }
    const versionId = request.target.target_type === 'core_motive_version'
      ? request.target.target_id
      : request.target.target_version_id;
    if (!versionId) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ValidationCycle target must resolve to an admitted CoreMotiveVersion.',
      );
    }
    return this.requireAdmittedCoreMotiveVersion(implementationProjectId, versionId);
  }

  private async requireAdmittedCoreMotiveVersion(
    implementationProjectId: string,
    coreMotiveVersionId: string,
  ): Promise<CoreMotiveVersion> {
    const version = await this.motiveRepository.findCoreMotiveVersionById(
      implementationProjectId,
      coreMotiveVersionId,
    );
    if (!version) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveVersion ${coreMotiveVersionId} not found.`);
    }
    if (version.version_status !== 'admitted') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Validation planning requires an admitted CoreMotiveVersion.');
    }
    await this.requireCompleteTraceManifest(
      implementationProjectId,
      version.trace_manifest_id ?? '',
      'core_motive_version',
      version.core_motive_version_id,
    );
    const identity = await this.requireMotiveIdentity(implementationProjectId, version.motive_id);
    if (!ACTIVE_PORTFOLIO_ROLES.has(identity.portfolio_role.role)) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Validation planning cannot schedule draft, parked, abandoned, or inactive motive roles.',
      );
    }
    await this.assertPortfolioConstraints(implementationProjectId, identity);
    const state = await this.motiveRepository.findMotiveVersionStateByVersionId(
      implementationProjectId,
      version.core_motive_version_id,
    );
    if (!state) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveVersionState is missing.');
    }
    if (state.freshness_status !== 'fresh') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Validation planning requires fresh motive state.');
    }
    return version;
  }

  private async requireMotiveIdentity(
    implementationProjectId: string,
    motiveId: string,
  ): Promise<CoreMotiveIdentity> {
    const identity = await this.motiveRepository.findMotiveIdentityById(implementationProjectId, motiveId);
    if (!identity) {
      throw new AppError(404, 'NOT_FOUND', `CoreMotiveIdentity ${motiveId} not found.`);
    }
    return identity;
  }

  private async assertPortfolioConstraints(
    implementationProjectId: string,
    identity: CoreMotiveIdentity,
  ): Promise<void> {
    const motiveSet = await this.motiveRepository.findMotiveSet(implementationProjectId);
    if (!motiveSet) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveSet is missing.');
    }
    if (motiveSet.active_motive_count > motiveSet.max_active_motives) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveSet exceeds max active motive limit.');
    }
    if (motiveSet.primary_motive_ids.length > motiveSet.max_primary_motives) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CoreMotiveSet exceeds max primary motive limit.');
    }
    const role = identity.portfolio_role.role;
    const motiveId = identity.motive_id;
    const roleContainsMotive = (
      (role === 'primary' && motiveSet.primary_motive_ids.includes(motiveId))
      || (role === 'secondary' && motiveSet.secondary_motive_ids.includes(motiveId))
      || (role === 'fallback' && motiveSet.fallback_motive_ids.includes(motiveId))
      || (role === 'supporting' && motiveSet.supporting_motive_ids.includes(motiveId))
    );
    if (!roleContainsMotive) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'CoreMotive portfolio role is not consistent with CoreMotiveSet membership.',
      );
    }
  }

  private async requireTraceReadyBoard(
    implementationProjectId: string,
    boardVersionId: string,
  ): Promise<MotiveEvidenceBoardVersion> {
    const board = await this.motiveRepository.findMotiveEvidenceBoardById(
      implementationProjectId,
      boardVersionId,
    );
    if (!board) {
      throw new AppError(404, 'NOT_FOUND', `MotiveEvidenceBoardVersion ${boardVersionId} not found.`);
    }
    if (
      board.board_state.blocker_status === 'hard_blocked'
      || board.board_state.freshness_status !== 'fresh'
      || board.board_state.readiness_status === 'not_ready'
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Validation planning requires a fresh trace-ready board.');
    }
    await this.requireCompleteTraceManifest(
      implementationProjectId,
      board.trace_manifest_id,
      'motive_evidence_board_version',
      board.board_version_id,
    );
    return board;
  }

  private async normalizeAndRequireTraceReadyContext(
    implementationProjectId: string,
    targetVersion: CoreMotiveVersion,
    includedRefs: ValidationCycleIncludedRefs,
  ): Promise<ValidationCycleIncludedRefs> {
    let boardRefs = includedRefs.board_version_refs;
    if (boardRefs.length === 0) {
      const currentBoard = await this.requireCurrentTraceReadyBoardForVersion(
        implementationProjectId,
        targetVersion,
      );
      boardRefs = [this.functionalRef('motive_evidence_board_version', currentBoard.board_version_id)];
    }
    for (const boardRef of boardRefs) {
      const board = await this.requireTraceReadyBoard(implementationProjectId, boardRef.ref_id);
      if (board.core_motive_version_id !== targetVersion.core_motive_version_id) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'ValidationCycle board context must belong to the target CoreMotiveVersion.',
        );
      }
    }
    return {
      ...includedRefs,
      board_version_refs: this.dedupeRefs(boardRefs),
    };
  }

  private async requireCurrentTraceReadyBoardForVersion(
    implementationProjectId: string,
    version: CoreMotiveVersion,
  ): Promise<MotiveEvidenceBoardVersion> {
    const state = await this.motiveRepository.findMotiveVersionStateByVersionId(
      implementationProjectId,
      version.core_motive_version_id,
    );
    if (!state?.current_board_version_id) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'ValidationCycle requires a current trace-ready MotiveEvidenceBoardVersion.',
      );
    }
    return this.requireTraceReadyBoard(implementationProjectId, state.current_board_version_id);
  }

  private async assertAssertionsBelongToVersion(
    implementationProjectId: string,
    version: CoreMotiveVersion,
    assertionRefs: TopicSelectionFunctionalRef[],
  ): Promise<void> {
    const assertions = await this.motiveRepository.listAssertionsByVersion(
      implementationProjectId,
      version.core_motive_version_id,
    );
    const assertionIds = new Set(assertions.map((assertion) => assertion.assertion_id));
    for (const assertionRef of assertionRefs) {
      if (
        this.normalizedRefType(assertionRef.ref_type) === 'motiveassertion'
        && !assertionIds.has(assertionRef.ref_id)
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          `MotiveAssertion ${assertionRef.ref_id} does not belong to CoreMotiveVersion ${version.core_motive_version_id}.`,
        );
      }
    }
  }

  private async assertAdmissionExperimentPlanConstraints(
    cycle: ValidationCycle,
    request: AdmitValidationCycleRequest,
  ): Promise<void> {
    const planRefs = cycle.context.included_refs.experiment_plan_light_refs;
    for (const planRef of planRefs) {
      const plan = await this.validationRepository.findExperimentPlanLightById(
        cycle.implementation_project_id,
        planRef.ref_id,
      );
      if (!plan) {
        throw new AppError(404, 'NOT_FOUND', `ExperimentPlanLight ${planRef.ref_id} not found.`);
      }
      const isExpensiveOrBroadening = (
        plan.estimated_cost_class === 'high'
        || plan.run_mode === 'confirmatory'
        || plan.run_mode === 'reproduction'
        || Boolean(plan.scope_boundary_ref)
      );
      if (
        isExpensiveOrBroadening
        && (request.confirmation_level ?? cycle.confirmation_level) !== 'human_confirmed'
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Expensive, confirmatory, reproduction, or scope-broadening cycles require human confirmation.',
        );
      }
      if (
        plan.baseline_gap_status === 'open'
        && (plan.estimated_cost_class === 'high' || plan.run_mode === 'confirmatory')
      ) {
        throw new AppError(
          409,
          'GATE_CONSTRAINT_FAILED',
          'Expensive or confirmatory experiment plans require baseline gaps to be resolved or accepted as risk.',
        );
      }
    }
  }

  private assertCycleIncludesMotiveVersion(
    cycle: ValidationCycle,
    coreMotiveVersionId: string,
  ): void {
    const hasVersion = cycle.context.included_refs.motive_version_refs.some((ref) => (
      this.normalizedRefType(ref.ref_type) === 'coremotiveversion'
      && ref.ref_id === coreMotiveVersionId
    ));
    if (!hasVersion) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Planning object must target a CoreMotiveVersion included in the ValidationCycle input snapshot.',
      );
    }
  }

  private traceManifestRef(
    project: ImplementationProject,
    manifest: TraceManifest,
  ): TopicSelectionFunctionalRef {
    return this.functionalRef('trace_manifest', manifest.trace_manifest_id, project.title_card_id);
  }

  private async requireCompleteTraceManifest(
    implementationProjectId: string,
    traceManifestId: string,
    targetRefType: string,
    targetRefId: string,
  ): Promise<TraceManifest> {
    if (!this.hasText(traceManifestId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'trace_manifest_id is required.');
    }
    const manifest = await this.traceRepository.findTraceManifestById(implementationProjectId, traceManifestId);
    if (!manifest) {
      throw new AppError(404, 'NOT_FOUND', `TraceManifest ${traceManifestId} not found.`);
    }
    if (manifest.trace_status !== 'complete') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Validation planning requires a complete TraceManifest.');
    }
    if (
      this.normalizedRefType(manifest.target_ref.ref_type) !== this.normalizedRefType(targetRefType)
      || manifest.target_ref.ref_id !== targetRefId
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `TraceManifest ${traceManifestId} does not target ${targetRefType}:${targetRefId}.`,
      );
    }
    return manifest;
  }

  private assertValidationFrame(request: CreateValidationCycleDraftRequest): void {
    const frame = request.validation_frame;
    if (
      !this.hasText(frame.validation_question)
      || frame.assumptions_under_test.length === 0
      || frame.assertions_under_test.length === 0
      || !this.hasText(frame.decision_if_pass)
      || !this.hasText(frame.decision_if_fail)
      || !this.hasText(frame.decision_if_inconclusive)
      || !this.hasText(frame.why_this_cycle_now)
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ValidationCycle requires a concrete question, assumptions, assertions, decision exits, and rationale.');
    }
  }

  private assertCriteria(criteria: CreateValidationCycleDraftRequest['criteria']): void {
    if (
      criteria.pass_conditions.length === 0
      || criteria.fail_conditions.length === 0
      || criteria.inconclusive_conditions.length === 0
      || criteria.stop_conditions.length === 0
      || criteria.minimum_artifacts_required.length === 0
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ValidationCycle criteria require pass/fail/inconclusive/stop conditions and minimum artifacts.');
    }
  }

  private assertBudget(budget: CreateValidationCycleDraftRequest['budget']): void {
    if (!this.hasText(budget.budget_id) || budget.retry_budget < 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'ValidationCycle requires an explicit budget and stop-rule-compatible retry budget.');
    }
  }

  private assertExpectedInformationGainOverride(
    input: {
      validation_frame: { expected_information_gain: string };
      human_override_expected_information_gain_none?: boolean;
      confirmation_level?: string;
    },
  ): void {
    if (
      input.validation_frame.expected_information_gain === 'none'
      && (
        input.human_override_expected_information_gain_none !== true
        || input.confirmation_level !== 'human_confirmed'
      )
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'expected_information_gain=none requires explicit human-confirmed override.',
      );
    }
  }

  private assertNoMemoOnlyEvidence(evidenceRefs: TopicSelectionFunctionalRef[]): void {
    const memoRef = evidenceRefs.find((ref) => MEMO_LIKE_REF_TYPES.has(this.normalizedRefType(ref.ref_type)));
    if (memoRef) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `ValidationCycle evidence context cannot use memo or summary refs as evidence: ${memoRef.ref_type}:${memoRef.ref_id}.`,
      );
    }
  }

  private normalizeIncludedRefs(
    input: Partial<ValidationCycleIncludedRefs> | undefined,
    targetVersion: CoreMotiveVersion,
    target: CreateValidationCycleDraftRequest['target'],
  ): ValidationCycleIncludedRefs {
    const motiveVersionRef = this.functionalRef(
      'core_motive_version',
      targetVersion.core_motive_version_id,
      String(targetVersion.version_number),
    );
    const boardRefs = input?.board_version_refs ?? (
      target.target_type === 'motive_evidence_board'
        ? [this.functionalRef('motive_evidence_board_version', target.target_id, target.target_version_id)]
        : []
    );
    return {
      motive_version_refs: this.dedupeRefs([
        ...(input?.motive_version_refs ?? []),
        motiveVersionRef,
      ]),
      board_version_refs: this.dedupeRefs(boardRefs),
      evidence_refs: this.dedupeRefs(input?.evidence_refs ?? []),
      route_refs: this.dedupeRefs(input?.route_refs ?? []),
      work_order_refs: this.dedupeRefs(input?.work_order_refs ?? []),
      result_packet_refs: this.dedupeRefs(input?.result_packet_refs ?? []),
      experiment_plan_light_refs: this.dedupeRefs(input?.experiment_plan_light_refs ?? []),
    };
  }

  private mergeOutputs(
    existing: ValidationCycleOutputs,
    patch: Partial<ValidationCycleOutputs> | undefined,
  ): ValidationCycleOutputs {
    return {
      evidence_unit_refs: patch?.evidence_unit_refs ?? existing.evidence_unit_refs,
      evidence_binding_refs: patch?.evidence_binding_refs ?? existing.evidence_binding_refs,
      board_update_refs: patch?.board_update_refs ?? existing.board_update_refs,
      route_update_refs: patch?.route_update_refs ?? existing.route_update_refs,
      work_order_result_refs: patch?.work_order_result_refs ?? existing.work_order_result_refs,
      result_interpretation_packet_refs: patch?.result_interpretation_packet_refs
        ?? existing.result_interpretation_packet_refs,
      quality_signal_refs: patch?.quality_signal_refs ?? existing.quality_signal_refs,
      recommended_evolution_decision_refs: patch?.recommended_evolution_decision_refs
        ?? existing.recommended_evolution_decision_refs,
    };
  }

  private emptyOutputs(): ValidationCycleOutputs {
    return {
      evidence_unit_refs: [],
      evidence_binding_refs: [],
      board_update_refs: [],
      route_update_refs: [],
      work_order_result_refs: [],
      result_interpretation_packet_refs: [],
      quality_signal_refs: [],
      recommended_evolution_decision_refs: [],
    };
  }

  private functionalRef(
    refType: string,
    refId: string,
    versionId: string | null = null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      version_id: versionId,
    };
  }

  private dedupeRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const deduped: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = `${this.normalizedRefType(ref.ref_type)}:${ref.ref_id}:${ref.version_id ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      deduped.push(ref);
    }
    return deduped;
  }

  private hashPayload(payload: unknown): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  private normalizedRefType(refType: string): string {
    return refType.toLowerCase().replace(/[_-]/g, '');
  }

  private hasText(value: string | null | undefined): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
