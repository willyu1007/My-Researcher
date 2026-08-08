import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  CreateAgentWorkflowHarnessRunRequest,
  CreateImplementationHarnessRequest,
  CreateImplementationInputSnapshotRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  CreateCoreMotiveDraftRequest,
  CreateMotiveEvidenceBoardVersionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  CreateClaimCandidateRequest,
  CreateImplementationDossierRequest,
  CreateResultInterpretationPacketRequest,
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  TraceLineageBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateExperimentPlanLightRequest,
  CreateTechnicalRouteCandidateRequest,
  CreateValidationCycleDraftRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  CreateResearchWorkOrderDraftRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeRecord,
  TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from '../repositories/in-memory-paper-implementation-workorder-repository.js';
import type { PaperImplementationStoredValidationCycleClosureV2 } from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationIntakeBootstrapService,
  type PaperImplementationDownstreamFeedbackService,
} from './paper-implementation-intake-bootstrap-service.js';
import { PaperImplementationAiWorkflowHarnessService } from './paper-implementation-ai-workflow-harness-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from './paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationResultClaimDossierService } from './paper-implementation-result-claim-dossier-service.js';
import { PaperImplementationTraceKernelService } from './paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from './paper-implementation-validation-cycle-planning-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from './paper-implementation-workorder-experiment-bridge-service.js';
import type {
  TopicSelectionV1cDownstreamFeedbackRecheckResult,
} from './topic-selection-v1c-downstream-feedback-recheck-service.js';
import { buildApp } from '../app.js';

const NOW = '2026-05-22T00:00:00.000Z';
const PROJECT_BRIDGE_ID = 'paper_project_bridge_001';
const BRIDGE_HASH = 'bridge_payload_hash_001';
const MOTIVE_ID = 'core_motive_001';
const CORE_MOTIVE_VERSION_ID = 'core_motive_version_001';
const ASSERTION_ID = 'motive_assertion_001';
const BOARD_ID = 'motive_evidence_board_version_001';
const BINDING_ID = 'evidence_binding_001';
const VALIDATION_CYCLE_ID = 'validation_cycle_001';
const ROUTE_ID = 'technical_route_candidate_001';
const EXPERIMENT_PLAN_ID = 'experiment_plan_light_001';
const WORK_ORDER_ID = 'research_work_order_001';
const RUN_EVIDENCE_ID = 'run_evidence_unit_001';
const RESULT_PACKET_ID = 'result_interpretation_packet_001';
const CLAIM_ID = 'claim_candidate_001';
const DOSSIER_ID = 'implementation_dossier_001';
const CLOSURE_ID = 'validation_cycle_closure_001';
const CLOSURE_SNAPSHOT_HASH = 'sha256:closed-cycle-snapshot-001';

function closedCycleAuthority(): PaperImplementationStoredValidationCycleClosureV2 {
  return {
    implementation_project_id: 'implementation_project_001',
    closure: {
      closure_id: CLOSURE_ID,
      schema_version: 'v1',
      validation_cycle_id: VALIDATION_CYCLE_ID,
      cycle_version_at_closure: 1,
      closure_kind: 'control_flow_validated_no_paper_evidence',
      scientific_disposition: null,
      selected_exit_key: null,
      accepted_proposal_id: null,
      accepted_proposal_hash: null,
      scientific_authority: null,
      closure_watermark: {
        schema_version: 'v1',
        validation_cycle_id: VALIDATION_CYCLE_ID,
        expected_cycle_version: 1,
        ordered_branches: [],
        active_real_attempt_count: 0,
        closure_input_hash: 'sha256:closure-input-001',
      },
      closure_snapshot_hash: CLOSURE_SNAPSHOT_HASH,
    },
    idempotency_key: 'close-cycle-001',
    created_at: NOW,
  };
}

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: [],
      source_locator_refs: [],
      citation_candidate_refs: [],
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
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function literatureLineage(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    literature: {
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      source_locator_refs: [ref('source_locator', 'source_locator_001')],
      citation_candidate_refs: [],
    },
  };
}

function decisionLineage(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    decision: {
      validation_cycle_refs: [ref('validation_cycle', VALIDATION_CYCLE_ID)],
      motive_evolution_decision_refs: [],
      gate_result_refs: [ref('gate_result', 'gate_result_001')],
      human_decision_refs: [],
      accepted_risk_refs: [],
    },
  };
}

function experimentLineage(): TraceLineageBundle {
  return {
    ...emptyLineage(),
    experiment: {
      experiment_plan_refs: [ref('experiment_plan_light', EXPERIMENT_PLAN_ID)],
      work_order_refs: [ref('research_work_order', WORK_ORDER_ID)],
      run_refs: [ref('experiment_foundation_run', 'experiment_run_001')],
      run_evidence_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      result_packet_refs: [ref('result_interpretation_packet', RESULT_PACKET_ID)],
      metric_refs: [ref('metric', 'metric_001')],
    },
    artifact: {
      dataset_refs: [ref('dataset_version', 'dataset_version_001')],
      baseline_refs: [ref('baseline_version', 'baseline_version_001')],
      code_version_refs: [ref('code_version', 'code_version_001')],
      model_checkpoint_refs: [],
      config_refs: [ref('config', 'config_001')],
      log_artifact_refs: [ref('log_artifact', 'failed_run_log_001')],
    },
  };
}

function makeBridgeHandoff(
  overrides: {
    bridge?: Partial<TopicSelectionPaperProjectBridgeRecord>;
    handoff?: Partial<TopicSelectionPaperProjectBridgeHandoff>;
  } = {},
): TopicSelectionPaperProjectBridgeHandoff {
  const sourceRefs = [
    ref('topic_package', 'topic_package_001', 'v1'),
    ref('topic_value_assessment', 'topic_value_assessment_001'),
    ref('topic_question', 'topic_question_001'),
    ref('research_slice', 'research_slice_001'),
    ref('validated_need', 'validated_need_001'),
    ref('evidence_unit', 'evidence_unit_001'),
  ];
  const workingCopy: TopicSelectionPaperProjectBridgeWorkingCopyPayload = {
    editable_title: 'Working paper title',
    problem_statement: 'A concise problem statement.',
    contribution_summary: 'A focused contribution summary.',
    evaluation_plan: 'Run early feasibility checks.',
    initial_planning_notes: ['Preserve accepted risks during implementation intake.'],
    claim_ceiling: 'Moderate scoped claims only.',
    prohibited_claims: ['Do not claim broad generality.'],
    conditions: [{
      condition_id: 'condition_001',
      condition_code: 'verify_claim_ceiling',
      owner: { actor_type: 'human', actor_id: 'paper-owner' },
      required_action: {
        action_code: 'verify_claim_ceiling',
        severity: 'blocking',
        loopback_target: 'value',
        refs: [ref('topic_value_assessment', 'topic_value_assessment_001')],
        reason: 'Verify the claim ceiling before validation cycles.',
      },
      refs: [ref('topic_value_assessment', 'topic_value_assessment_001')],
      early_check_obligations: ['Verify claim ceiling before validation cycles.'],
    }],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    early_check_obligations: ['Verify claim ceiling before validation cycles.'],
    source_lineage_summary: {
      topic_package_id: 'topic_package_001',
    },
  };
  const bridge: TopicSelectionPaperProjectBridgeRecord = {
    paper_project_bridge_id: PROJECT_BRIDGE_ID,
    bridge_status: 'active',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    source_promotion_decision_id: 'promotion_decision_001',
    source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
    human_promotion_decision_ref: ref('human_promotion_decision', 'human_promotion_decision_001'),
    human_confirmed_decision_ref: ref('human_confirmed_decision', 'human_confirmed_decision_001'),
    promotion_commitment_profile_id: 'promotion_commitment_profile_001',
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_001'),
    promotion_gate_check_ref: ref('promotion_gate_check', 'promotion_gate_check_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_001',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    topic_package_id: 'topic_package_001',
    package_version: 'v1',
    decision: 'promote_to_paper_project',
    conditions: workingCopy.conditions,
    accepted_risk_refs: workingCopy.accepted_risk_refs,
    allowed_refinements: [],
    early_check_obligations: workingCopy.early_check_obligations,
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_001',
      package_snapshot_hash: 'package_snapshot_hash_001',
      package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
    },
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_payload_hash_001',
    bridge_payload_hash: BRIDGE_HASH,
    paper_project_intake_ref: ref(
      'paper_project_intake',
      'paper_project_intake_001',
      BRIDGE_HASH,
    ),
    target_paper_project_ref: ref(
      'paper_project',
      'paper_project_001',
      BRIDGE_HASH,
    ),
    source_promotion_handoff: {} as never,
    artifact_refs: [ref('artifact_ref', 'artifact_ref_001')],
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    ...overrides.bridge,
  };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
    bridge_status: 'active',
    source_promotion_decision_id: bridge.source_promotion_decision_id,
    source_promotion_decision_ref: bridge.source_promotion_decision_ref,
    promotion_commitment_profile_ref: bridge.promotion_commitment_profile_ref,
    promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
    promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    topic_package_id: bridge.topic_package_id,
    package_version: bridge.package_version,
    decision: bridge.decision,
    working_copy_payload: bridge.working_copy_payload,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    bridge_payload_hash: bridge.bridge_payload_hash,
    conditions: bridge.conditions,
    accepted_risk_refs: bridge.accepted_risk_refs,
    allowed_refinements: bridge.allowed_refinements,
    early_check_obligations: bridge.early_check_obligations,
    stop_conditions: bridge.stop_conditions,
    reopen_conditions: bridge.reopen_conditions,
    source_refs: bridge.source_refs,
    snapshot_hashes: bridge.snapshot_hashes,
    paper_project_intake_ref: bridge.paper_project_intake_ref,
    target_paper_project_ref: bridge.target_paper_project_ref,
    bridge,
    source_promotion_handoff: bridge.source_promotion_handoff,
    ...overrides.handoff,
  };
}

class StubBridgeService {
  constructor(private readonly handoff: TopicSelectionPaperProjectBridgeHandoff = makeBridgeHandoff()) {}

  async getPaperProjectBridgeHandoff(
    paperProjectBridgeId: string,
  ): Promise<TopicSelectionPaperProjectBridgeHandoff> {
    if (paperProjectBridgeId !== this.handoff.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return structuredClone(this.handoff);
  }
}

class RecordingDownstreamFeedbackService implements PaperImplementationDownstreamFeedbackService {
  readonly calls: TopicSelectionDownstreamTopicFeedbackCreateInput[] = [];

  async recordDownstreamTopicFeedback(
    input: TopicSelectionDownstreamTopicFeedbackCreateInput,
  ): Promise<TopicSelectionV1cDownstreamFeedbackRecheckResult> {
    this.calls.push(structuredClone(input));
    const feedbackId = `downstream_topic_feedback_${String(this.calls.length).padStart(3, '0')}`;
    const downstreamTopicFeedback: TopicSelectionDownstreamTopicFeedbackRecord = {
      downstream_topic_feedback_id: feedbackId,
      feedback_fingerprint: `fingerprint_${this.calls.length}`,
      workspace_id: input.workspace_id ?? null,
      title_card_id: 'title_card_001',
      paper_project_bridge_id: input.paper_project_bridge_id,
      paper_project_bridge_ref: ref('paper_project_bridge', input.paper_project_bridge_id, BRIDGE_HASH),
      source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_001'),
      promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_001'),
      promotion_input_snapshot_id: 'promotion_input_snapshot_001',
      promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_001'),
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      downstream_source_kind: input.downstream_source_kind,
      downstream_source_ref: input.downstream_source_ref,
      source_feedback_refs: input.source_feedback_refs ?? [],
      observed_blocker_refs: input.observed_blocker_refs ?? [],
      feedback_signal: input.feedback_signal,
      severity: input.severity,
      summary: input.summary,
      required_action: input.required_action ?? null,
      classification: {
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        severity: input.severity,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, BRIDGE_HASH),
        affected_stage: 'paper_project_bridge',
        source_refs: [input.downstream_source_ref],
        rationale: 'contract evaluation classification',
        required_actions: input.required_action ? [input.required_action] : [],
      },
      recheck_request: {
        downstream_recheck_request_id: `downstream_recheck_request_${this.calls.length}`,
        feedback_ref: ref('downstream_topic_feedback', feedbackId),
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, BRIDGE_HASH),
        required_actions: input.required_action ? [input.required_action] : [],
        reason_codes: [input.feedback_signal],
        source_refs: [input.downstream_source_ref],
        created_at: NOW,
      },
      impact_summary: {
        impact_level: 'recheck_required',
        severity: input.severity,
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, BRIDGE_HASH),
        summary: 'contract evaluation impact',
      },
      recheck_event_ref: null,
      recheck_impact_ref: null,
      decision_work_queue_item_ref: null,
      artifact_refs: input.artifact_refs ?? [],
      payload: input.feedback_payload ?? {},
      policy_version_id: input.policy_version_id ?? null,
      created_by: input.created_by ?? 'system',
      created_at: NOW,
    };
    return {
      downstream_topic_feedback: downstreamTopicFeedback,
      classification: downstreamTopicFeedback.classification,
      recheck_request: downstreamTopicFeedback.recheck_request ?? null,
      impact_summary: downstreamTopicFeedback.impact_summary,
    };
  }
}

function buildEvaluationHarness() {
  const projectRepository = new InMemoryPaperImplementationRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultClaimRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const aiHarnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const downstreamFeedback = new RecordingDownstreamFeedbackService();
  const idFactory = makeIdFactory();
  const intakeService = new PaperImplementationIntakeBootstrapService({
    repository: projectRepository,
    paperProjectBridgeService: new StubBridgeService(),
    downstreamFeedbackService: downstreamFeedback,
    idFactory,
    now: () => NOW,
  });
  const traceService = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    idFactory,
    now: () => NOW,
  });
  const confirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const motiveService = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository,
    motiveRepository,
    traceRepository,
    confirmationRepository,
    idFactory,
    now: () => NOW,
  });
  const feedbackRecorder = {
    recordFeedbackEvent: (
      implementationProjectId: string,
      request: Parameters<PaperImplementationIntakeBootstrapService['recordFeedbackEvent']>[1],
    ) => intakeService.recordFeedbackEvent(implementationProjectId, request),
  };
  const validationService = new PaperImplementationValidationCyclePlanningService({
    projectRepository,
    motiveRepository,
    traceRepository,
    validationRepository,
    feedbackRecorder,
    idFactory,
    now: () => NOW,
  });
  const workOrderService = new PaperImplementationWorkOrderExperimentBridgeService({
    projectRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    idFactory,
    now: () => NOW,
  });
  const resultClaimService = new PaperImplementationResultClaimDossierService({
    projectRepository,
    resultClaimRepository,
    traceRepository,
    validationRepository,
    evidenceV2Reader: {
      resolveClaimSupportRunEvidenceUnit: async (input) => ({
        status: 'v2_closed',
        run_evidence_unit: {
          run_evidence_unit_id: input.run_evidence_unit_id,
          implementation_project_id: input.implementation_project_id,
          validation_cycle_id: VALIDATION_CYCLE_ID,
          content_hash: input.expected_content_hash ?? 'sha256:contract-evaluation-claim-evidence',
        },
        closure_id: 'validation_cycle_closure_contract_evaluation',
      }),
    },
    confirmationRepository,
    feedbackRecorder,
    closedCycleSnapshotReader: {
      findStoredClosureByCycle: async (validationCycleId) => {
        const stored = closedCycleAuthority();
        return stored.closure.validation_cycle_id === validationCycleId
          ? structuredClone(stored)
          : null;
      },
    },
    idFactory,
    now: () => NOW,
  });
  const aiHarnessService = new PaperImplementationAiWorkflowHarnessService({
    projectRepository,
    traceRepository,
    harnessRepository: aiHarnessRepository,
    idFactory,
    now: () => NOW,
  });

  return {
    aiHarnessService,
    downstreamFeedback,
    intakeService,
    motiveService,
    resultClaimRepository,
    resultClaimService,
    traceRepository,
    traceService,
    validationService,
    workOrderRepository,
    workOrderService,
  };
}

function buildRouteBackedApp() {
  return buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationMotiveRepository: new InMemoryPaperImplementationMotiveRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationValidationRepository: new InMemoryPaperImplementationValidationRepository(),
    paperImplementationWorkOrderRepository: new InMemoryPaperImplementationWorkOrderRepository(),
    paperImplementationResultClaimDossierRepository: new InMemoryPaperImplementationResultClaimDossierRepository(),
    paperImplementationAiWorkflowHarnessRepository: new InMemoryPaperImplementationAiWorkflowHarnessRepository(),
    paperImplementationBridgeService: new StubBridgeService(),
    paperImplementationDownstreamFeedbackService: new RecordingDownstreamFeedbackService(),
  });
}

async function bootstrapProject(harness = buildEvaluationHarness()) {
  const bootstrap = await harness.intakeService.bootstrapProject({
    paper_project_bridge_id: PROJECT_BRIDGE_ID,
    bridge_payload_hash: BRIDGE_HASH,
    workspace_id: 'workspace_001',
    created_by: 'system',
  });
  return {
    ...harness,
    bootstrap,
    projectId: bootstrap.implementation_project.implementation_project_id,
  };
}

function coreMotiveDraftRequest(): CreateCoreMotiveDraftRequest {
  return {
    motive_id: MOTIVE_ID,
    core_motive_version_id: CORE_MOTIVE_VERSION_ID,
    motive_contract: {
      short_name: 'Claim conflation in synthesis',
      motivation_claim: 'Evidence synthesis can conflate adjacent claims.',
      problem_pressure: 'False gap judgments affect paper planning.',
      current_solution_insufficiency: 'Retrieval-only systems do not address synthesis conflation.',
      unmet_or_failure_mechanism: 'Non-equivalent adjacent claims are compressed into one statement.',
      target_setting: 'CS paper evidence synthesis.',
      expected_contribution_path: 'Make claim conflation measurable and reducible.',
      why_this_is_not_trivial: 'The failure appears after retrieval.',
      why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance, not claim equivalence.',
      what_makes_this_researchable_now: 'Evidence locator infrastructure exists.',
    },
    scope_contract: {
      included_scope: ['cross-paper synthesis'],
      excluded_scope: ['general web QA'],
      non_goals: ['general RAG reliability'],
    },
    falsification_contract: {
      invalidation_conditions: ['Controlled synthesis preserves all distinct claims.'],
      weakening_conditions: ['Only low-severity conflation remains.'],
      minimum_evidence_to_continue: ['At least one literature or probe signal.'],
      decisive_negative_conditions: ['Retrieval alone fully explains the issue.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The method reduces scoped claim conflation.',
      minimum_defensible_contribution_claim: 'The analysis identifies a measurable failure mode.',
      forbidden_overclaims: ['Do not claim broad generalization.'],
      claim_types_allowed: ['analysis_claim', 'empirical_finding'],
    },
    source_refs: [ref('topic_package', 'topic_package_001', 'v1')],
    assertions: [{
      assertion_id: ASSERTION_ID,
      assertion_type: 'failure_mechanism',
      assertion_text: 'Claim conflation is a synthesis-level failure mechanism.',
      importance: {
        role: 'core',
        must_hold_for_motive_to_continue: true,
      },
      validation_requirements: {
        minimum_support_level: 'weak',
        required_evidence_types: ['literature'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['Equivalent claims are always preserved.'],
        what_would_weaken_this: ['Conflation is limited to missing abstracts.'],
      },
      expected_initial_status: 'untested',
    }],
  };
}

function evidenceBoardRequest(boardTraceId: string, bindingTraceId: string): CreateMotiveEvidenceBoardVersionRequest {
  return {
    board_version_id: BOARD_ID,
    motive_id: MOTIVE_ID,
    core_motive_version_id: CORE_MOTIVE_VERSION_ID,
    trace_manifest_id: boardTraceId,
    board_summary: {
      current_support_summary: 'Literature provides an initial signal.',
      current_challenge_summary: 'No direct counter-evidence yet.',
      unresolved_conflicts: [],
      board_gap_summary: 'Needs a validation probe.',
      next_evidence_needed: ['Run a controlled synthesis probe.'],
    },
    bindings: [{
      binding_id: BINDING_ID,
      assertion_id: ASSERTION_ID,
      evidence_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
      role: 'support',
      scope: { dataset_scope: 'CS papers' },
      strength: {
        directness: 'moderate',
        reliability: 'medium',
        reproducibility: 'unknown',
        freshness: 'fresh',
      },
      support_state: 'weak',
      challenge_status: 'none',
      interpretation: {
        normalized_statement: 'Prior work reports related synthesis conflation.',
        why_relevant_to_assertion: 'It supports the failure mechanism.',
        limitations: ['Different benchmark setting.'],
      },
      trace_manifest_id: bindingTraceId,
    }],
  };
}

function validationDraftRequest(): CreateValidationCycleDraftRequest {
  return {
    validation_cycle_id: VALIDATION_CYCLE_ID,
    target: {
      target_type: 'core_motive_version',
      target_id: CORE_MOTIVE_VERSION_ID,
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'board_gap',
      trigger_refs: [ref('motive_evidence_board_version', BOARD_ID)],
    },
    cycle_type: 'route_feasibility',
    validation_frame: {
      validation_question: 'Can a low-cost route answer the failure mechanism assertion?',
      assumptions_under_test: ['The route can isolate synthesis failures.'],
      assertions_under_test: [ref('motive_assertion', ASSERTION_ID)],
      decision_if_pass: 'Dispatch a governed WorkOrder.',
      decision_if_fail: 'Lower the claim ceiling or send upstream feedback.',
      decision_if_inconclusive: 'Review loop budget before another cycle.',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'The evidence board has a route gap.',
    },
    context: {
      input_snapshot_id: 'validation_input_snapshot_001',
      included_refs: {
        motive_version_refs: [ref('core_motive_version', CORE_MOTIVE_VERSION_ID, '1')],
        board_version_refs: [ref('motive_evidence_board_version', BOARD_ID)],
        evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
        route_refs: [],
        work_order_refs: [],
        result_packet_refs: [],
        experiment_plan_light_refs: [],
      },
      excluded_context_notes: [],
    },
    criteria: {
      pass_conditions: ['The route can isolate synthesis-level failures.'],
      fail_conditions: ['The route cannot answer the assertion.'],
      inconclusive_conditions: ['The route remains ambiguous.'],
      stop_conditions: ['Stop after one failed confirmatory run.'],
      minimum_artifacts_required: ['Trace-ready plan note.'],
    },
    budget: {
      budget_id: 'validation_budget_001',
      max_runtime: 'PT4H',
      max_compute: 'local_cpu',
      max_human_review_count: 1,
      retry_budget: 0,
    },
  };
}

function routeRequest(traceManifestId: string): CreateTechnicalRouteCandidateRequest {
  return {
    route_candidate_id: ROUTE_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    core_motive_version_id: CORE_MOTIVE_VERSION_ID,
    route_summary: 'Use a low-cost route that isolates synthesis failures.',
    expected_information_gain: 'medium',
    primary_metric_refs: [ref('metric', 'metric_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    trace_manifest_id: traceManifestId,
  };
}

function experimentPlanRequest(traceManifestId: string): CreateExperimentPlanLightRequest {
  return {
    experiment_plan_light_id: EXPERIMENT_PLAN_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    route_candidate_id: ROUTE_ID,
    run_mode: 'confirmatory',
    plan_summary: 'Run a local confirmatory check with frozen config.',
    estimated_cost_class: 'medium',
    baseline_gap_status: 'resolved',
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    budget_id: 'validation_budget_001',
    stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
    trace_manifest_id: traceManifestId,
  };
}

function workOrderRequest(traceManifestId: string): CreateResearchWorkOrderDraftRequest {
  return {
    work_order_id: WORK_ORDER_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    experiment_plan_light_id: EXPERIMENT_PLAN_ID,
    run_type: 'confirmatory',
    run_policy: {
      run_policy_id: 'run_policy_001',
      retry_budget: 0,
      stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('experiment_run_recipe', 'run_recipe_001', 'v1'),
      run_recipe_hash: 'run_recipe_hash_001',
      version_lock_hash: 'version_lock_hash_001',
      config_snapshot_hash: 'config_snapshot_hash_001',
      result_validation_policy_ref: ref('result_validation_policy', 'result_validation_policy_001'),
    },
    trace_manifest_id: traceManifestId,
  };
}

function resultPacketRequest(traceManifestId: string): CreateResultInterpretationPacketRequest {
  return {
    result_interpretation_packet_id: RESULT_PACKET_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    experiment_plan_light_id: EXPERIMENT_PLAN_ID,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      validation_report_refs: [ref('result_validation_report', 'result_validation_report_001')],
      metric_refs: [ref('metric', 'metric_001')],
      failed_run_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The failed run is retained and lowers the claim ceiling.',
      supports_assertion_refs: [ref('motive_assertion', ASSERTION_ID)],
      challenges_assertion_refs: [],
      unexpected_findings: ['The confirmatory path failed before producing result artifacts.'],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [ref('limitation', 'failed_run_limit_001')],
      reliability_notes: ['Claim must stay moderate because the retained run failed.'],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: traceManifestId,
  };
}

function historicalResultPacket(
  implementationProjectId: string,
  traceManifestId: string,
): ResultInterpretationPacket {
  const request = resultPacketRequest(traceManifestId);
  return {
    result_interpretation_packet_id: request.result_interpretation_packet_id,
    implementation_project_id: implementationProjectId,
    validation_cycle_id: request.validation_cycle_id,
    experiment_plan_light_id: request.experiment_plan_light_id ?? null,
    source: request.source,
    result_summary: request.result_summary,
    reliability: request.reliability,
    claim_implications: request.claim_implications,
    interpretation_gate_status: 'passed_with_risk',
    trace_manifest_ref: ref('trace_manifest', traceManifestId),
    trace_manifest_id: traceManifestId,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function claimCandidateRequest(traceManifestId: string, claimTracePacketId: string): CreateClaimCandidateRequest {
  return {
    claim_candidate_id: CLAIM_ID,
    claim_type: 'negative_result_claim',
    claim_statement: 'The admitted confirmatory run failed before supporting a broad improvement claim.',
    claim_strength: 'moderate',
    result_interpretation_packet_ids: [RESULT_PACKET_ID],
    support_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
    challenge_refs: [],
    scope: {
      population_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      metric_scope: 'Primary metric.',
      negative_scope_notes: ['The failed run is the admitted finding and must not support an improvement claim.'],
      excluded_scope_notes: [],
    },
    boundary: {
      rationale: 'Bounded to the admitted benchmark and failed-run accounting; no positive improvement claim is admitted.',
      forbidden_overclaims: ['broad generalization'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: traceManifestId,
    claim_trace_packet_id: claimTracePacketId,
  };
}

function dossierRequest(
  traceManifestId: string,
  claimTracePacketId: string,
  readinessGateResultId = 'dossier_readiness_gate_001',
): CreateImplementationDossierRequest {
  return {
    dossier_id: DOSSIER_ID,
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: [RESULT_PACKET_ID],
    claim_candidate_ids: [CLAIM_ID],
    claim_trace_packet_ids: [claimTracePacketId],
    closed_validation_cycle_snapshot_refs: [{
      validation_cycle_id: VALIDATION_CYCLE_ID,
      closure_id: CLOSURE_ID,
      closure_snapshot_hash: CLOSURE_SNAPSHOT_HASH,
    }],
    experiment_section: {
      failed_run_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: ['The failed run is retained and reported.'],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', CLAIM_ID)],
      rejected_claim_refs: [],
      forbidden_overclaims: ['broad generalization'],
      claim_ceiling: 'moderate',
    },
    readiness: {
      readiness_gate_result_id: readinessGateResultId,
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: ['Ready with failed-run limitation preserved.'],
    },
    trace_manifest_id: traceManifestId,
    projection_policy_version_id: 'writing_projection_policy_v1',
  };
}

function implementationHarnessRequest(): CreateImplementationHarnessRequest {
  return {
    harness_id: 'implementation_harness_001',
    policy_pack: {
      context_policy_version_id: 'context_policy_v1',
      trace_policy_version_id: 'trace_policy_v1',
      evidence_policy_version_id: 'evidence_policy_v1',
      experiment_policy_version_id: 'experiment_policy_v1',
      retention_policy_version_id: 'retention_policy_v1',
      evaluation_policy_version_id: 'evaluation_policy_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_001',
      artifact_store_ref: ref('artifact_store', 'artifact_store_001'),
      evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_001'),
      work_order_broker_ref: ref('work_order_broker', 'work_order_broker_001'),
      run_monitor_ref: ref('run_monitor', 'run_monitor_001'),
    },
    invariants: {
      require_input_snapshot: true,
      require_trace_manifest: true,
      require_artifact_refs: true,
      forbid_untraced_claims: true,
      forbid_memo_as_evidence: true,
      retain_failed_runs: true,
      separate_exploratory_and_confirmatory: true,
    },
    created_by: 'system',
  };
}

function implementationInputSnapshotRequest(traceManifestId: string): CreateImplementationInputSnapshotRequest {
  return {
    input_snapshot_id: 'implementation_input_snapshot_001',
    target_ref: ref('validation_cycle', VALIDATION_CYCLE_ID),
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_v1',
    included_context: {
      motive_version_refs: [ref('core_motive_version', CORE_MOTIVE_VERSION_ID)],
      board_version_refs: [ref('motive_evidence_board_version', BOARD_ID)],
      assertion_refs: [ref('motive_assertion', ASSERTION_ID)],
      evidence_binding_refs: [ref('evidence_binding', BINDING_ID)],
      route_refs: [ref('technical_route_candidate', ROUTE_ID)],
      probe_refs: [],
      experiment_plan_refs: [ref('experiment_plan_light', EXPERIMENT_PLAN_ID)],
      work_order_refs: [ref('research_work_order', WORK_ORDER_ID)],
      run_evidence_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      result_packet_refs: [ref('result_interpretation_packet', RESULT_PACKET_ID)],
      accepted_risk_refs: [],
      human_decision_refs: [],
      trace_manifest_refs: [ref('trace_manifest', traceManifestId)],
    },
    excluded_context: {
      excluded_refs: [ref('rationale_memo', 'memo_001')],
      exclusion_reasons: ['memo_as_evidence_forbidden'],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:implementation-context'],
    created_by: 'system',
  };
}

function agentRunRequest(
  traceManifestId: string,
  overrides: Partial<CreateAgentWorkflowHarnessRunRequest> = {},
): CreateAgentWorkflowHarnessRunRequest {
  const base: CreateAgentWorkflowHarnessRunRequest = {
    harness_run_id: 'agent_workflow_harness_run_001',
    harness_id: 'implementation_harness_001',
    input_snapshot_id: 'implementation_input_snapshot_001',
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.v1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
    prompt_template_version_id: 'prompt_template_v1',
    output_schema_version_id: 'validation_cycle_planning_output_v1',
    raw_output_artifact_ref: ref('artifact', 'raw_output_001'),
    parsed_output_artifact_ref: ref('artifact', 'parsed_output_001'),
    spec: {
      workflow_type: 'validation_cycle_planning',
      workflow_version: 'validation_cycle_planning.v1',
      input_policy: {
        required_input_snapshot: true,
        allowed_context_types: ['core_motive_version', 'motive_evidence_board_version', 'trace_manifest'],
        forbidden_context_types: ['display_summary', 'rationale_memo'],
        max_context_tokens: 12_000,
      },
      prompt_policy: {
        prompt_template_version_id: 'prompt_template_v1',
        system_instruction_version_id: 'system_instruction_v1',
        output_schema_version_id: 'validation_cycle_planning_output_v1',
      },
      model_policy: {
        model_profile_id: 'mock.paper-implementation.validation-cycle-planner.v1',
        temperature: 0.1,
        allowed_tools: [],
      },
      output_policy: {
        required_schema: 'validation_cycle_planning_output_v1',
        natural_language_field_contract_version_id: 'nl_field_policy_v1',
        required_ref_fields: ['trace_manifest_refs', 'source_refs'],
        forbidden_outputs: ['authority_write', 'citation_from_memo'],
      },
      validation_policy: {
        schema_validation: true,
        reference_validation: true,
        trace_validation: true,
        claim_boundary_validation: true,
      },
      retry_policy: {
        max_retries: 1,
        retry_on_schema_failure: true,
        retry_on_missing_refs: true,
      },
      audit_policy: {
        save_prompt: true,
        save_input_snapshot: true,
        save_raw_output: true,
        save_parsed_output: true,
        save_validator_results: true,
      },
    },
    proposal_artifacts: [{
      proposal_artifact_id: 'implementation_proposal_artifact_001',
      artifact_kind: 'proposal_object',
      target_ref: ref('validation_cycle', VALIDATION_CYCLE_ID),
      artifact_ref: ref('artifact', 'proposal_artifact_001'),
      source_refs: [ref('core_motive_version', CORE_MOTIVE_VERSION_ID)],
      trace_manifest_refs: [ref('trace_manifest', traceManifestId)],
      payload: { proposal_only: true },
    }],
    quality_signal_candidates: [],
    direct_authority_mutation_refs: [],
    created_by: 'system',
  };
  return { ...base, ...overrides };
}

async function assertAppError(
  promise: Promise<unknown>,
  errorCode: string,
) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof AppError && error.errorCode === errorCode,
  );
}

test('T-101 replays the PaperImplementation ready path across child authorities', async () => {
  const harness = await bootstrapProject();
  const { projectId } = harness;

  const motiveTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('core_motive_version', CORE_MOTIVE_VERSION_ID, 'v1'),
    lineage: literatureLineage(),
  });
  await harness.motiveService.createCoreMotiveDraft(projectId, coreMotiveDraftRequest());
  const admittedMotive = await harness.motiveService.admitCoreMotiveVersion(
    projectId,
    MOTIVE_ID,
    CORE_MOTIVE_VERSION_ID,
    { trace_manifest_id: motiveTrace.trace_manifest_id },
  );
  assert.equal(admittedMotive.core_motive_version.version_status, 'admitted');

  const boardTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('motive_evidence_board_version', BOARD_ID, 'v1'),
    lineage: literatureLineage(),
  });
  const bindingTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('evidence_binding', BINDING_ID, 'v1'),
    lineage: literatureLineage(),
  });
  const board = await harness.motiveService.createMotiveEvidenceBoardVersion(
    projectId,
    evidenceBoardRequest(boardTrace.trace_manifest_id, bindingTrace.trace_manifest_id),
  );
  assert.equal(board.board_version.board_state.readiness_status, 'evidence_ready');

  const validationCycle = await harness.validationService.createValidationCycleDraft(
    projectId,
    validationDraftRequest(),
  );
  const routeTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('technical_route_candidate', ROUTE_ID, 'v1'),
    lineage: decisionLineage(),
  });
  const route = await harness.validationService.createTechnicalRouteCandidate(
    projectId,
    routeRequest(routeTrace.trace_manifest_id),
  );
  assert.equal(route.route_status, 'proposed');

  const planTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('experiment_plan_light', EXPERIMENT_PLAN_ID, 'v1'),
    lineage: experimentLineage(),
  });
  const plan = await harness.validationService.createExperimentPlanLight(
    projectId,
    experimentPlanRequest(planTrace.trace_manifest_id),
  );
  assert.equal(plan.run_mode, 'confirmatory');
  const validationTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('validation_cycle', validationCycle.validation_cycle_id, 'v1'),
    lineage: decisionLineage(),
  });
  const admittedCycle = await harness.validationService.admitValidationCycle(
    projectId,
    validationCycle.validation_cycle_id,
    { trace_manifest_id: validationTrace.trace_manifest_id },
  );
  assert.equal(admittedCycle.lifecycle_status, 'admitted');

  const workOrderTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('research_work_order', WORK_ORDER_ID, 'v1'),
    lineage: experimentLineage(),
  });
  const workOrder = await harness.workOrderService.createResearchWorkOrderDraft(
    projectId,
    workOrderRequest(workOrderTrace.trace_manifest_id),
  );
  assert.equal(workOrder.work_order_status, 'draft');
  const workOrderGateResult = await harness.traceService.evaluateTraceGate(projectId, {
    trace_manifest_id: workOrderTrace.trace_manifest_id,
  });
  assert.equal(workOrderGateResult.gate_status, 'passed');
  await harness.workOrderService.admitResearchWorkOrder(projectId, WORK_ORDER_ID, {
    admission_gate_result_id: workOrderGateResult.gate_result_id,
  });
  await harness.workOrderService.submitHarnessRun(projectId, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });
  const monitor = await harness.workOrderService.recordRunMonitorIntake(projectId, {
    work_order_id: WORK_ORDER_ID,
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    monitor_event_kind: 'failed',
    run_status: 'failed',
    failure_summary: 'The run failed before producing result artifacts.',
  });
  assert.equal(monitor.monitor_intake.trust_status, 'trusted');
  assert.equal(monitor.monitor_intake.run_status, 'failed');
  assert.equal(monitor.evidence_handoff.authority, 'paper_implementation_evidence_trust_gateway_v2');
  assert.equal((await harness.workOrderService.listRunEvidenceUnits(projectId)).length, 0);

  const resultTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('result_interpretation_packet', RESULT_PACKET_ID, 'v1'),
    lineage: experimentLineage(),
  });
  const resultPacket = await harness.resultClaimRepository.createResultInterpretationPacket(
    historicalResultPacket(projectId, resultTrace.trace_manifest_id),
  );
  assert.equal(resultPacket.interpretation_gate_status, 'passed_with_risk');

  const claimTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('claim_candidate', CLAIM_ID, 'v1'),
    lineage: literatureLineage(),
  });
  const citation = await harness.traceService.createCitationCandidate(projectId, {
    trace_manifest_id: claimTrace.trace_manifest_id,
    source_kind: 'literature_evidence_unit',
    source_type: 'paper',
    source_id: 'literature_source_001',
    source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
    source_locator_id: 'source_locator_001',
    locator_quality: 'exact',
    locator: { section: '3.1', paragraph: '2' },
    cited_for: ['method_prior_art'],
    linked_target_refs: [ref('claim_candidate', CLAIM_ID, 'v1')],
    normalized_source_statement: 'Prior work establishes the bounded comparison point.',
  });
  const claimPacket = await harness.traceService.createClaimTracePacket(projectId, {
    claim_ref: ref('claim_candidate', CLAIM_ID),
    claim_statement: 'The admitted confirmatory run failed before supporting a broad improvement claim.',
    trace_manifest_id: claimTrace.trace_manifest_id,
    lineage: {
      ...experimentLineage(),
      literature: {
        literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
        source_locator_refs: [ref('source_locator', 'source_locator_001')],
        citation_candidate_refs: [ref('citation_candidate', citation.citation_candidate_id)],
      },
    },
    challenge: {
      challenging_result_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      task_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      evaluation_scope: 'Primary metric.',
      baseline_scope: 'Baseline v1.',
    },
    boundary: {
      forbidden_overclaims: ['broad generalization'],
      claim_strength: 'moderate',
      human_confirmation_required: false,
    },
  });
  const strongClaimId = 'claim_candidate_strong_bypass_001';
  const strongClaimTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('claim_candidate', strongClaimId, 'v1'),
    lineage: experimentLineage(),
  });
  const strongClaimPacket = await harness.traceService.createClaimTracePacket(projectId, {
    claim_ref: ref('claim_candidate', strongClaimId),
    claim_statement: 'The method broadly improves the admitted benchmark metric.',
    trace_manifest_id: strongClaimTrace.trace_manifest_id,
    lineage: experimentLineage(),
    challenge: {
      challenging_result_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      task_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      evaluation_scope: 'Primary metric.',
      baseline_scope: 'Baseline v1.',
    },
    boundary: {
      forbidden_overclaims: ['broad generalization'],
      claim_strength: 'strong',
      human_confirmation_required: true,
    },
  });
  await assertAppError(
    harness.resultClaimService.createClaimCandidate(projectId, {
      ...claimCandidateRequest(strongClaimTrace.trace_manifest_id, strongClaimPacket.claim_trace_packet_id),
      claim_candidate_id: strongClaimId,
      claim_type: 'empirical_finding',
      claim_statement: 'The method broadly improves the admitted benchmark metric.',
      claim_strength: 'strong',
      claim_trace_packet_id: strongClaimPacket.claim_trace_packet_id,
      support_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      boundary: {
        rationale: 'Strong improvement claims require explicit human confirmation.',
        forbidden_overclaims: ['broad generalization'],
        hidden_counter_evidence_refs: [],
        required_followup_refs: [],
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );
  const claim = await harness.resultClaimService.createClaimCandidate(
    projectId,
    claimCandidateRequest(claimTrace.trace_manifest_id, claimPacket.claim_trace_packet_id),
  );
  assert.equal(claim.claim_trace_packet_id, claimPacket.claim_trace_packet_id);
  assert.equal(claim.claim_type, 'negative_result_claim');
  assert.doesNotMatch(claim.claim_statement, /\bimproves\b/);

  const dossierTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('implementation_dossier', DOSSIER_ID, 'v1'),
    lineage: literatureLineage(),
  });
  const dossierGateResult = await harness.traceService.evaluateTraceGate(projectId, {
    trace_manifest_id: dossierTrace.trace_manifest_id,
  });
  assert.equal(dossierGateResult.gate_status, 'passed');
  const dossier = await harness.resultClaimService.createImplementationDossier(
    projectId,
    dossierRequest(
      dossierTrace.trace_manifest_id,
      claimPacket.claim_trace_packet_id,
      dossierGateResult.gate_result_id,
    ),
  );
  assert.equal(dossier.dossier_status, 'ready_for_writing');
  assert.equal(dossier.failed_run_count, 1);
  const writingPacket = await harness.resultClaimService.createWritingEntryPacket(projectId, DOSSIER_ID, {
    projection_policy_version_id: 'writing_projection_policy_v1',
  });
  assert.equal(writingPacket.dossier_id, DOSSIER_ID);
  assert.equal(writingPacket.trace_manifest_id, dossier.trace_manifest_id);
});

test('T-101 blocks authority bypass and corrupted evaluation fixtures', async () => {
  const harness = await bootstrapProject();
  const { projectId } = harness;

  await assertAppError(
    harness.intakeService.bootstrapProject({
      paper_project_bridge_id: PROJECT_BRIDGE_ID,
      bridge_payload_hash: 'changed_bridge_hash',
    }),
    'VERSION_CONFLICT',
  );
  const readBack = await harness.intakeService.getProjectByBridge(PROJECT_BRIDGE_ID);
  assert.equal(readBack.implementation_project.bridge_payload_hash, BRIDGE_HASH);

  const claimTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('claim_candidate', 'blocked_claim_001', 'v1'),
    lineage: literatureLineage(),
  });
  await assertAppError(
    harness.traceService.createCitationCandidate(projectId, {
      trace_manifest_id: claimTrace.trace_manifest_id,
      source_kind: 'literature_evidence_unit',
      source_type: 'paper',
      source_id: 'literature_source_001',
      source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
      source_locator_id: '',
      locator_quality: 'missing',
      locator: {},
      cited_for: ['method_prior_art'],
      linked_target_refs: [ref('claim_candidate', 'blocked_claim_001')],
      normalized_source_statement: 'Missing locator must block citation.',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
  await assertAppError(
    harness.traceService.createCitationCandidate(projectId, {
      trace_manifest_id: 'trace_manifest_missing',
      source_kind: 'literature_evidence_unit',
      source_type: 'paper',
      source_id: 'literature_source_001',
      source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
      source_locator_id: 'source_locator_001',
      locator_quality: 'exact',
      locator: { section: '1' },
      cited_for: ['method_prior_art'],
      linked_target_refs: [ref('claim_candidate', 'blocked_claim_001')],
      normalized_source_statement: 'A missing trace manifest must block citation.',
    }),
    'NOT_FOUND',
  );
  await assertAppError(
    harness.traceService.registerNaturalLanguageFieldRole(projectId, {
      field_owner_ref: ref('motive_evidence_board_version', BOARD_ID),
      field_name: 'board_summary',
      field_role: 'display_summary',
      can_feed_workflow: false,
      can_feed_hard_gate: true,
      can_be_cited: false,
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const orphanMonitor = await harness.workOrderService.recordRunMonitorIntake(projectId, {
    external_job_ref: ref('experiment_foundation_run', 'orphan_run_001'),
    external_job_hash: 'orphan_run_hash_001',
    monitor_event_kind: 'result_available',
    run_status: 'succeeded',
    result_ref: ref('experiment_result', 'orphan_result_001'),
    result_hash: 'orphan_result_hash_001',
    result_validation_report_ref: ref('result_validation_report', 'orphan_report_001'),
    result_validation_report_hash: 'orphan_report_hash_001',
  });
  assert.equal(orphanMonitor.monitor_intake.trust_status, 'untrusted');
  assert.equal(orphanMonitor.evidence_handoff.required_input, 'ef_qualified_evidence_candidate');

  const proposalTrace = await harness.traceService.createTraceManifest(projectId, {
    target_ref: ref('validation_cycle', VALIDATION_CYCLE_ID, 'v1'),
    lineage: decisionLineage(),
  });
  await harness.aiHarnessService.createImplementationHarness(projectId, implementationHarnessRequest());
  await harness.aiHarnessService.createImplementationInputSnapshot(
    projectId,
    implementationInputSnapshotRequest(proposalTrace.trace_manifest_id),
  );
  const blockedRun = await harness.aiHarnessService.createAgentWorkflowHarnessRun(
    projectId,
    agentRunRequest(proposalTrace.trace_manifest_id, {
      direct_authority_mutation_refs: [ref('core_motive_version', CORE_MOTIVE_VERSION_ID)],
    }),
  );
  assert.equal(blockedRun.harness_run.run_status, 'blocked');
  assert.ok(blockedRun.quality_signals.some((signal) => signal.signal_type === 'forbidden_state_mutation'));
  assert.equal(blockedRun.queue_items[0]?.priority, 'critical');

  const feedback = await harness.intakeService.recordFeedbackEvent(projectId, {
    feedback_type: 'lower_claim_ceiling',
    severity: 'warning',
    summary: 'Contract evaluation records upstream feedback without mutating topic-selection authority.',
    source_object_refs: [ref('result_interpretation_packet', RESULT_PACKET_ID)],
    run_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
  });
  assert.equal(feedback.feedback_event.feedback_type, 'lower_claim_ceiling');
  assert.equal(harness.downstreamFeedback.calls.at(-1)?.downstream_source_kind, 'paper_implementation');
  assert.equal((await harness.intakeService.getProject(projectId)).implementation_project.bridge_payload_hash, BRIDGE_HASH);
});

test('T-101 queryability guard rejects JSON-only gate trace queue run claim and dossier fields', async () => {
  const schema = await readFile(new URL('../../../../prisma/schema.prisma', import.meta.url), 'utf8');
  const dbContext = JSON.parse(
    await readFile(new URL('../../../../docs/context/db/schema.json', import.meta.url), 'utf8'),
  ) as DbContextSchema;

  const requiredFieldsByModel = {
    PaperImplementationProject: ['intakeSnapshotId', 'paperProjectBridgeId', 'bridgePayloadHash', 'lifecycleStatus'],
    PaperImplementationFeedbackEvent: ['feedbackType', 'severity', 'feedbackStatus', 'recommendedUpstreamAction'],
    PaperImplementationTraceManifest: [
      'implementationProjectId',
      'targetRefType',
      'targetRefId',
      'traceStatus',
      'brokenRefCount',
      'staleRefCount',
      'missingRefCount',
    ],
    PaperImplementationCitationCandidate: [
      'traceManifestId',
      'sourceLocatorId',
      'sourceEvidenceUnitId',
      'linkedTargetRefType',
      'linkedTargetRefId',
    ],
    PaperImplementationClaimTracePacket: ['claimRefType', 'claimRefId', 'traceManifestId'],
    PaperImplementationNaturalLanguageFieldRole: [
      'fieldOwnerRefType',
      'fieldOwnerRefId',
      'fieldName',
      'fieldRole',
      'canFeedWorkflow',
      'canFeedHardGate',
      'canBeCited',
    ],
    PaperImplementationTraceRepairQueueItem: ['traceManifestId', 'targetRefType', 'targetRefId', 'status', 'severity', 'blockerCode'],
    PaperImplementationValidationCycle: [
      'inputSnapshotId',
      'targetRefType',
      'targetRefId',
      'validationQuestion',
      'budgetId',
      'expectedInformationGain',
      'cycleStatus',
      'executionStatus',
      'decisionExit',
      'gateResultId',
      'traceManifestId',
    ],
    PaperImplementationExperimentPlanLight: [
      'runMode',
      'primaryMetricRefs',
      'datasetVersionRefs',
      'baselineVersionRefs',
      'codeVersionRefs',
      'configRefs',
      'confirmatoryMarker',
      'budgetId',
      'traceManifestId',
    ],
    PaperImplementationResearchWorkOrder: [
      'validationCycleId',
      'experimentPlanLightId',
      'runType',
      'workOrderStatus',
      'runPolicyId',
      'retryBudget',
      'traceManifestId',
      'admissionGateResultId',
    ],
    PaperImplementationRunEvidenceUnit: [
      'workOrderId',
      'validationCycleId',
      'runType',
      'runStatus',
      'trustedStatus',
      'resultValidationReportRefId',
      'failureSummaryId',
      'traceManifestId',
    ],
    PaperImplementationClaimCandidate: [
      'claimType',
      'claimStrength',
      'claimStatus',
      'boundaryGateStatus',
      'traceManifestId',
      'claimTracePacketId',
      'forbiddenOverclaimCount',
    ],
    PaperImplementationDossier: [
      'dossierStatus',
      'dossierTraceStatus',
      'readinessGateResultId',
      'traceManifestId',
      'failedRunCount',
      'forbiddenOverclaimCount',
      'projectionPolicyVersionId',
    ],
    PaperImplementationAgentWorkflowHarnessRun: [
      'harnessId',
      'inputSnapshotId',
      'workflowType',
      'modelProfileId',
      'runMode',
      'schemaValidationStatus',
      'referenceValidationStatus',
      'traceValidationStatus',
      'gateResultId',
    ],
    PaperImplementationDecisionWorkQueueItem: [
      'queueType',
      'targetRefType',
      'targetRefId',
      'priority',
      'status',
      'dedupKey',
      'policyVersionId',
      'retryCount',
      'retryBudget',
      'cooldownUntil',
    ],
  } satisfies Record<string, string[]>;

  for (const [modelName, fields] of Object.entries(requiredFieldsByModel)) {
    const block = modelBlock(schema, modelName);
    for (const field of fields) {
      assertColumnizedField(block, modelName, field);
      assertDbContextField(dbContext, modelName, field);
    }
  }

  assertIndexed(schema, 'PaperImplementationTraceManifest', 'targetRefType, targetRefId, targetVersionId');
  assertIndexed(schema, 'PaperImplementationTraceRepairQueueItem', 'blockerCode');
  assertIndexed(schema, 'PaperImplementationRunEvidenceUnit', 'runStatus');
  assertIndexed(schema, 'PaperImplementationClaimCandidate', 'claimTracePacketId');
  assertIndexed(schema, 'PaperImplementationDossier', 'readinessGateResultId');
  assertIndexed(schema, 'PaperImplementationDecisionWorkQueueItem', 'queueType, status');
});

test('T-101 UI command boundary uses backend read models and existing routes only', async () => {
  const api = await readFile(
    new URL('../../../desktop/src/renderer/modules/paper-implementation/api.ts', import.meta.url),
    'utf8',
  );
  const controller = await readFile(
    new URL('../../../desktop/src/renderer/modules/paper-implementation/usePaperImplementationWorkbenchController.ts', import.meta.url),
    'utf8',
  );
  const workbench = await readFile(
    new URL('../../../desktop/src/renderer/modules/paper-implementation/PaperImplementationWorkbench.tsx', import.meta.url),
    'utf8',
  );
  const routes = await readFile(new URL('../routes/paper-implementation-routes.ts', import.meta.url), 'utf8');
  const moduleSource = `${api}\n${controller}\n${workbench}`;

  assert.doesNotMatch(moduleSource, /research-argument|researchArgument/);
  assert.doesNotMatch(moduleSource, /client-only readiness|mock-only readiness|localStorage|sessionStorage/);
  assert.doesNotMatch(moduleSource, /apps\/desktop\/src\/renderer\/styles|app-layout\.css/);
  assert.match(api, /requestGovernance/);
  assert.match(controller, /resolveDecisionWorkQueueItem/);
  assert.match(controller, /resolveTraceRepairQueueItem/);
  assert.match(controller, /dispatchValidationUpstreamFeedbackCandidate/);
  assert.match(controller, /applyMotivePortfolioDecision/);

  const frontendSuffixes = [
    '/trace-manifests',
    '/trace-repair-queue',
    '/claim-trace-packets',
    '/core-motives',
    '/motive-evidence-boards',
    '/motive-portfolio-decisions',
    '/validation-cycles',
    '/validation-planning-review-items',
    '/validation-upstream-feedback-candidates',
    '/research-work-orders',
    '/run-evidence-units',
    '/result-interpretation-packets',
    '/claim-candidates',
    '/implementation-dossiers',
    '/writing-entry-packets',
    '/agent-workflow-harness-runs',
    '/implementation-proposal-artifacts',
    '/decision-work-queue',
    '/decision-work-queue/:queue_item_id/resolve',
    '/trace-repair-queue/:queue_item_id/resolve',
    '/validation-upstream-feedback-candidates/:candidate_id/dispatch',
    '/motive-portfolio-decisions/apply',
  ];

  for (const suffix of frontendSuffixes) {
    assert.match(routes, new RegExp(escapeRegex(suffix)), `backend routes must expose ${suffix}`);
  }

  const app = buildRouteBackedApp();
  try {
    const malformed = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: { paper_project_bridge_id: PROJECT_BRIDGE_ID },
    });
    assert.equal(malformed.statusCode, 400);
    assert.equal((malformed.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const created = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: PROJECT_BRIDGE_ID,
        bridge_payload_hash: BRIDGE_HASH,
      },
    });
    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as {
      implementation_project: { implementation_project_id: string };
      project_created: boolean;
    };
    assert.equal(createdBody.project_created, true);
    const projectId = encodeURIComponent(createdBody.implementation_project.implementation_project_id);

    const projectReadModel = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${projectId}`,
    });
    assert.equal(projectReadModel.statusCode, 200);

    const trace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${projectId}/trace-manifests`,
      payload: {
        target_ref: ref('core_motive_version', CORE_MOTIVE_VERSION_ID, 'v1'),
        lineage: literatureLineage(),
        integrity: {
          missing_refs: [ref('source_locator', 'source_locator_missing')],
        },
      },
    });
    assert.equal(trace.statusCode, 201);

    const traceRepairQueue = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${projectId}/trace-repair-queue`,
    });
    assert.equal(traceRepairQueue.statusCode, 200);

    const decisionQueue = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${projectId}/decision-work-queue`,
    });
    assert.equal(decisionQueue.statusCode, 200);
  } finally {
    await app.close();
  }
});

test('T-101 coverage anchors existing child-level blocked-path tests', async () => {
  const files = [
    'paper-implementation-intake-bootstrap-service.unit.test.ts',
    'paper-implementation-motive-evidence-board-service.unit.test.ts',
    'paper-implementation-validation-cycle-planning-service.unit.test.ts',
    'paper-implementation-workorder-experiment-bridge-service.unit.test.ts',
    'paper-implementation-result-claim-dossier-service.unit.test.ts',
    'paper-implementation-ai-workflow-harness-service.unit.test.ts',
  ];
  const corpus = (await Promise.all(files.map((file) =>
    readFile(new URL(file, import.meta.url), 'utf8')))).join('\n');
  const requiredAnchors = [
    'hash mismatch and changed upstream hash block without mutating admitted implementation state',
    'portfolio constraint drift blocks validation cycle draft creation',
    'legacy completion is closed below HTTP while historical completed-cycle reads are preserved',
    'marks monitor intake without work_order_id untrusted and does not create run evidence',
    'direct ResultInterpretationPacket materialization is closed pending ValidationCycleClosed consumption',
    'ready dossier fails closed when a declared ValidationCycle has no v2 closure',
    'claim boundary blocks interpretation refs as support and forbidden overclaims',
    'strong claim requires explicit human confirmation',
    'expected information gain none blocks without human-confirmed override',
    'AI workflow harness blocks missing trace manifest instead of admitting proposal',
    'AI workflow harness turns direct authority mutation into queue blocker',
  ];

  for (const anchor of requiredAnchors) {
    assertExecutableTestAnchor(corpus, anchor);
  }
}
);

type DbContextSchema = {
  tables?: Array<{
    name?: string;
    columns?: Array<{
      name?: string;
      type?: string;
    }>;
  }>;
};

function modelBlock(schema: string, modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `Prisma model ${modelName} must exist.`);
  return match[0];
}

function assertColumnizedField(block: string, modelName: string, fieldName: string): void {
  const line = block.split('\n').find((candidate) => candidate.trimStart().startsWith(`${fieldName} `));
  assert.ok(line, `${modelName}.${fieldName} must be declared as a top-level Prisma field.`);
  assert.doesNotMatch(line, /\sJson(\s|$)/, `${modelName}.${fieldName} must not be JSON-only.`);
}

function assertDbContextField(dbContext: DbContextSchema, modelName: string, fieldName: string): void {
  const table = dbContext.tables?.find((candidate) => candidate.name === modelName);
  assert.ok(table, `docs/context/db/schema.json must include table ${modelName}.`);
  const column = table.columns?.find((candidate) => candidate.name === fieldName);
  assert.ok(column, `docs/context/db/schema.json must include ${modelName}.${fieldName}.`);
  assert.notEqual(column.type, 'Json', `docs/context/db/schema.json must not mark ${modelName}.${fieldName} as Json.`);
}

function assertIndexed(schema: string, modelName: string, fields: string): void {
  const block = modelBlock(schema, modelName);
  const pattern = new RegExp(`@@(?:index|unique)\\(\\[${escapeRegex(fields).replaceAll(', ', '\\s*,\\s*')}`);
  assert.match(block, pattern, `${modelName} must index [${fields}].`);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertExecutableTestAnchor(corpus: string, anchor: string): void {
  const escapedAnchor = escapeRegex(anchor);
  assert.match(
    corpus,
    new RegExp(`test\\(\\s*['"\`]${escapedAnchor}['"\`]`),
    `missing executable child-level blocked path anchor: ${anchor}`,
  );
  assert.doesNotMatch(
    corpus,
    new RegExp(`test\\.(?:skip|todo)\\(\\s*['"\`]${escapedAnchor}['"\`]`),
    `child-level blocked path anchor must not be skipped or todo: ${anchor}`,
  );
}
