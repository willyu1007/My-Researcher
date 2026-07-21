import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  ResultInterpretationPacket,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  BootstrapImplementationProjectResponse,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CitationCandidate,
  ClaimTracePacket,
  ListTraceRepairQueueResponse,
  TraceGateResult,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  RecordRunMonitorIntakeResponse,
  ResearchWorkOrder,
  ResearchWorkOrderHarnessRun,
  RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPaperProjectBridgeHandoff,
  TopicSelectionPaperProjectBridgeRecord,
  TopicSelectionPaperProjectBridgeWorkingCopyPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamTopicFeedbackCreateInput,
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

import { buildApp } from '../app.js';
import { PaperImplementationController } from '../controllers/paper-implementation-controller.js';
import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from '../repositories/in-memory-paper-implementation-workorder-repository.js';
import { InMemoryPaperImplementationCycleReadinessV2Repository } from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';
import {
  InMemoryPaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationValidationCycleClosureV2Repository,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PaperImplementationIntakeBootstrapService,
  type PaperImplementationDownstreamFeedbackService,
} from '../services/paper-implementation-intake-bootstrap-service.js';
import { PaperImplementationAiWorkflowHarnessService } from '../services/paper-implementation-ai-workflow-harness-service.js';
import { PaperImplementationMotiveEvidenceBoardService } from '../services/paper-implementation-motive-evidence-board-service.js';
import { PaperImplementationP1RuntimeReviewService } from '../services/paper-implementation-p1-runtime-review-service.js';
import { PaperImplementationResultAnalysisRuntimeService } from '../services/paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from '../services/paper-implementation-experiment-planning-runtime-service.js';
import { PaperImplementationRoutePlanningRuntimeService } from '../services/paper-implementation-route-planning-runtime-service.js';
import { PaperImplementationValidationCyclePlanningRuntimeService } from '../services/paper-implementation-validation-cycle-planning-runtime-service.js';
import { PaperImplementationResultClaimDossierService } from '../services/paper-implementation-result-claim-dossier-service.js';
import { PaperImplementationRuntimeAdmissionService } from '../services/paper-implementation-runtime-admission-service.js';
import { PaperImplementationRuntimeDomainGateService } from '../services/paper-implementation-runtime-domain-gate-service.js';
import { PaperImplementationHumanConfirmationService } from '../services/paper-implementation-human-confirmation-service.js';
import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import { PaperImplementationTraceIntegrityDebateRuntimeService } from '../services/paper-implementation-trace-integrity-debate-runtime-service.js';
import { PaperImplementationTraceKernelService } from '../services/paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from '../services/paper-implementation-validation-cycle-planning-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from '../services/paper-implementation-workorder-experiment-bridge-service.js';
import type {
  TopicSelectionV1cDownstreamFeedbackRecheckResult,
} from '../services/topic-selection-v1c-downstream-feedback-recheck-service.js';
import { registerPaperImplementationRoutes } from './paper-implementation-routes.js';

const NOW = '2026-05-20T00:00:00.000Z';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function assertStatus(
  response: { statusCode: number; body: string },
  expectedStatusCode: number,
): void {
  if (response.statusCode !== expectedStatusCode) {
    throw new Error(`Expected ${expectedStatusCode}, got ${response.statusCode}: ${response.body}`);
  }
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function emptyTraceLineage() {
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

function traceLineageWithLiterature() {
  return {
    ...emptyTraceLineage(),
    literature: {
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      source_locator_refs: [ref('source_locator', 'source_locator_001')],
      citation_candidate_refs: [],
    },
  };
}

function aiHarnessPayload() {
  return {
    harness_id: 'ai_harness_route_001',
    policy_pack: {
      context_policy_version_id: 'context_policy_route_v1',
      trace_policy_version_id: 'trace_policy_route_v1',
      evidence_policy_version_id: 'evidence_policy_route_v1',
      experiment_policy_version_id: 'experiment_policy_route_v1',
      retention_policy_version_id: 'retention_policy_route_v1',
      evaluation_policy_version_id: 'evaluation_policy_route_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_route_001',
      artifact_store_ref: ref('artifact_store', 'artifact_store_route_001'),
      evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_route_001'),
      work_order_broker_ref: ref('work_order_broker', 'broker_route_001'),
      run_monitor_ref: ref('run_monitor', 'monitor_route_001'),
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

function aiInputSnapshotPayload(targetRef: TopicSelectionFunctionalRef, traceManifestId: string) {
  return {
    input_snapshot_id: 'ai_input_snapshot_route_001',
    target_ref: targetRef,
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_route_v1',
    included_context: {
      motive_version_refs: [ref('core_motive_version', 'core_motive_route_001')],
      board_version_refs: [ref('motive_evidence_board_version', 'board_route_001')],
      assertion_refs: [],
      evidence_binding_refs: [],
      route_refs: [],
      probe_refs: [],
      experiment_plan_refs: [],
      work_order_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      accepted_risk_refs: [],
      human_decision_refs: [],
      trace_manifest_refs: [ref('trace_manifest', traceManifestId)],
    },
    excluded_context: {
      excluded_refs: [],
      exclusion_reasons: [],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:ai-route-context'],
    created_by: 'system',
  };
}

function aiWorkflowRunPayload(input: {
  targetRef: TopicSelectionFunctionalRef;
  traceManifestId: string;
  harnessRunId?: string;
  proposalArtifactId?: string;
}) {
  const harnessRunId = input.harnessRunId ?? 'ai_harness_run_route_001';
  const proposalArtifactId = input.proposalArtifactId ?? 'ai_proposal_route_001';
  return {
    harness_run_id: harnessRunId,
    harness_id: 'ai_harness_route_001',
    input_snapshot_id: 'ai_input_snapshot_route_001',
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.route.v1',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: 'mock.paper-implementation.validation-cycle-planner.route.v1',
    prompt_template_version_id: 'prompt_template_route_v1',
    output_schema_version_id: 'validation_cycle_planning_output_route_v1',
    raw_output_artifact_ref: ref('artifact', `${harnessRunId}_raw`),
    parsed_output_artifact_ref: ref('artifact', `${harnessRunId}_parsed`),
    spec: {
      workflow_type: 'validation_cycle_planning',
      workflow_version: 'validation_cycle_planning.route.v1',
      input_policy: {
        required_input_snapshot: true,
        allowed_context_types: ['core_motive_version', 'motive_evidence_board_version', 'trace_manifest'],
        forbidden_context_types: ['display_summary', 'rationale_memo'],
        max_context_tokens: 12000,
      },
      prompt_policy: {
        prompt_template_version_id: 'prompt_template_route_v1',
        system_instruction_version_id: 'system_instruction_route_v1',
        output_schema_version_id: 'validation_cycle_planning_output_route_v1',
      },
      model_policy: {
        model_profile_id: 'mock.paper-implementation.validation-cycle-planner.route.v1',
        temperature: 0.1,
        allowed_tools: [],
      },
      output_policy: {
        required_schema: 'validation_cycle_planning_output_route_v1',
        natural_language_field_contract_version_id: 'nl_field_policy_route_v1',
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
      proposal_artifact_id: proposalArtifactId,
      artifact_kind: 'proposal_object',
      target_ref: input.targetRef,
      artifact_ref: ref('artifact', 'proposal_artifact_route_001'),
      source_refs: [ref('core_motive_version', 'core_motive_route_001')],
      trace_manifest_refs: [ref('trace_manifest', input.traceManifestId)],
      payload: { proposal_only: true },
    }],
    quality_signal_candidates: [],
    direct_authority_mutation_refs: [],
    created_by: 'system',
  };
}

function motiveDraftPayload() {
  return {
    motive_id: 'core_motive_route_001',
    core_motive_version_id: 'core_motive_version_route_001',
    motive_contract: {
      short_name: 'Evidence synthesis conflation',
      motivation_claim: 'Evidence synthesis can conflate adjacent claims.',
      problem_pressure: 'False gap judgments affect paper planning.',
      current_solution_insufficiency: 'Retrieval-only systems do not address synthesis conflation.',
      unmet_or_failure_mechanism: 'Adjacent non-equivalent claims are compressed into one statement.',
      target_setting: 'CS paper evidence synthesis.',
      expected_contribution_path: 'Make claim conflation measurable and reducible.',
      why_this_is_not_trivial: 'The failure appears after retrieval.',
      why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance, not claim equivalence.',
      what_makes_this_researchable_now: 'Evidence locator infrastructure exists.',
    },
    scope_contract: {
      included_scope: ['cross-paper synthesis'],
      excluded_scope: ['general web QA'],
      non_goals: ['broad model reliability'],
    },
    falsification_contract: {
      invalidation_conditions: ['Controlled synthesis preserves distinct claims.'],
      weakening_conditions: ['Only low-severity conflation remains.'],
      minimum_evidence_to_continue: ['At least one literature or probe signal.'],
      decisive_negative_conditions: ['Retrieval alone fully explains the issue.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The method reduces scoped claim conflation.',
      minimum_defensible_contribution_claim: 'The analysis identifies a measurable failure mode.',
      forbidden_overclaims: ['Do not claim broad model reliability.'],
      claim_types_allowed: ['analysis_claim'],
    },
    source_refs: [ref('topic_package', 'topic_package_001', 'v1')],
    assertions: [
      {
        assertion_id: 'motive_assertion_route_001',
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
      },
    ],
  };
}

function makeBridgeHandoff(): TopicSelectionPaperProjectBridgeHandoff {
  const sourceRefs = [
    ref('topic_package', 'topic_package_001', 'v1'),
    ref('evidence_unit', 'evidence_unit_001'),
  ];
  const workingCopy: TopicSelectionPaperProjectBridgeWorkingCopyPayload = {
    editable_title: 'Working paper title',
    problem_statement: 'Problem statement.',
    contribution_summary: 'Contribution summary.',
    evaluation_plan: 'Evaluation plan.',
    initial_planning_notes: [],
    claim_ceiling: 'Bounded claim ceiling.',
    prohibited_claims: [],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [],
    source_lineage_summary: {
      topic_package_id: 'topic_package_001',
    },
  };
  const bridge: TopicSelectionPaperProjectBridgeRecord = {
    paper_project_bridge_id: 'paper_project_bridge_001',
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
    conditions: [],
    accepted_risk_refs: [],
    allowed_refinements: [],
    early_check_obligations: [],
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
    bridge_payload_hash: 'bridge_payload_hash_001',
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: {} as never,
    artifact_refs: [],
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
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
  };
}

class StubBridgeService {
  private readonly handoff = makeBridgeHandoff();

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
      paper_project_bridge_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
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
        loopback_target: 'evidence_or_search',
        loopback_cause: input.feedback_signal,
        severity: input.severity,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
        affected_stage: 'paper_project_bridge',
        source_refs: [input.downstream_source_ref],
        rationale: 'route test classification',
        required_actions: input.required_action ? [input.required_action] : [],
      },
      recheck_request: {
        downstream_recheck_request_id: `downstream_recheck_request_${this.calls.length}`,
        feedback_ref: ref('downstream_topic_feedback', feedbackId),
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
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
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_001'),
        summary: 'route test impact',
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

function makeRealService(): {
  downstreamFeedback: RecordingDownstreamFeedbackService;
  service: PaperImplementationIntakeBootstrapService;
  traceKernel: PaperImplementationTraceKernelService;
  motiveEvidenceBoard: PaperImplementationMotiveEvidenceBoardService;
  validationCyclePlanning: PaperImplementationValidationCyclePlanningService;
  workOrderExperimentBridge: PaperImplementationWorkOrderExperimentBridgeService;
  resultClaimDossier: PaperImplementationResultClaimDossierService;
  aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService;
  runtimeAdmission: PaperImplementationRuntimeAdmissionService;
  traceIntegrityDebateRuntime: PaperImplementationTraceIntegrityDebateRuntimeService;
  p1RuntimeReview: PaperImplementationP1RuntimeReviewService;
  resultAnalysisRuntime: PaperImplementationResultAnalysisRuntimeService;
  experimentPlanningRuntime: PaperImplementationExperimentPlanningRuntimeService;
  routePlanningRuntime: PaperImplementationRoutePlanningRuntimeService;
  validationCyclePlanningRuntime: PaperImplementationValidationCyclePlanningRuntimeService;
  feasibilityPlanningRuntime: never;
  crossBoardSynthesisRuntime: never;
  evidenceBoardCurationRuntime: never;
  motiveDecompositionRuntime: never;
  motiveEvolutionRuntime: never;
  runtimeDomainGate: PaperImplementationRuntimeDomainGateService;
  humanConfirmation: PaperImplementationHumanConfirmationService;
} {
  const downstreamFeedback = new RecordingDownstreamFeedbackService();
  const repository = new InMemoryPaperImplementationRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultClaimDossierRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const aiWorkflowHarnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const idFactory = makeIdFactory();
  const service = new PaperImplementationIntakeBootstrapService({
    repository,
    paperProjectBridgeService: new StubBridgeService(),
    downstreamFeedbackService: downstreamFeedback,
    idFactory,
    now: () => NOW,
  });
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: new InMemoryPaperImplementationRuntimeRepository(),
    idFactory,
    now: () => NOW,
  });
  const traceIntegrityDebateRuntime = new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('trace integrity debate runtime is not used by this route test');
      },
    },
  });
  const p1RuntimeReview = new PaperImplementationP1RuntimeReviewService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('P1 runtime review is not used by this route test');
      },
    },
  });
  const resultAnalysisRuntime = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('result analysis runtime is not used by this route test');
      },
    },
  });
  const experimentPlanningRuntime = new PaperImplementationExperimentPlanningRuntimeService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('experiment planning runtime is not used by this route test');
      },
    },
  });
  const routePlanningRuntime = new PaperImplementationRoutePlanningRuntimeService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('route planning runtime is not used by this route test');
      },
    },
  });
  const validationCyclePlanningRuntime = new PaperImplementationValidationCyclePlanningRuntimeService({
    projectRepository: repository,
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('validation cycle planning runtime is not used by this route test');
      },
    },
  });
  const confirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const resultClaimDossier = new PaperImplementationResultClaimDossierService({
    projectRepository: repository,
    resultClaimRepository: resultClaimDossierRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    confirmationRepository,
    feedbackRecorder: service,
    closedCycleSnapshotReader: {
      findStoredClosureByCycle: async () => null,
    },
    idFactory,
    now: () => NOW,
  });
  const humanConfirmation = new PaperImplementationHumanConfirmationService({
    projectRepository: repository,
    confirmationRepository,
    idFactory,
    now: () => NOW,
  });
  const runtimeDomainGate = new PaperImplementationRuntimeDomainGateService({
    runtimeAdmission,
    resultClaimDossier,
  });
  return {
    downstreamFeedback,
    service,
    traceKernel: new PaperImplementationTraceKernelService({
      projectRepository: repository,
      traceRepository,
      idFactory,
      now: () => NOW,
    }),
    motiveEvidenceBoard: new PaperImplementationMotiveEvidenceBoardService({
      projectRepository: repository,
      motiveRepository,
      traceRepository,
      confirmationRepository,
      idFactory,
      now: () => NOW,
    }),
    validationCyclePlanning: new PaperImplementationValidationCyclePlanningService({
      projectRepository: repository,
      motiveRepository,
      traceRepository,
      validationRepository,
      feedbackRecorder: service,
      idFactory,
      now: () => NOW,
    }),
    workOrderExperimentBridge: new PaperImplementationWorkOrderExperimentBridgeService({
      projectRepository: repository,
      traceRepository,
      validationRepository,
      workOrderRepository,
      idFactory,
      now: () => NOW,
    }),
    resultClaimDossier,
    aiWorkflowHarness: new PaperImplementationAiWorkflowHarnessService({
      projectRepository: repository,
      traceRepository,
      harnessRepository: aiWorkflowHarnessRepository,
      idFactory,
      now: () => NOW,
    }),
    runtimeAdmission,
    traceIntegrityDebateRuntime,
    p1RuntimeReview,
    resultAnalysisRuntime,
    experimentPlanningRuntime,
    routePlanningRuntime,
    validationCyclePlanningRuntime,
    feasibilityPlanningRuntime: {} as never,
    crossBoardSynthesisRuntime: {} as never,
    evidenceBoardCurationRuntime: {} as never,
    motiveDecompositionRuntime: {} as never,
    motiveEvolutionRuntime: {} as never,
    runtimeDomainGate,
    humanConfirmation,
  };
}

test('PaperImplementation routes expose AI workflow harness proposal-only closure', async () => {
  const app = Fastify({ logger: false });
  const {
    service,
    traceKernel,
    motiveEvidenceBoard,
    validationCyclePlanning,
    workOrderExperimentBridge,
    resultClaimDossier,
    aiWorkflowHarness,
    runtimeAdmission,
    traceIntegrityDebateRuntime,
    p1RuntimeReview,
    resultAnalysisRuntime,
    experimentPlanningRuntime,
    routePlanningRuntime,
    validationCyclePlanningRuntime,
    feasibilityPlanningRuntime,
    crossBoardSynthesisRuntime,
    evidenceBoardCurationRuntime,
    motiveDecompositionRuntime,
    motiveEvolutionRuntime,
    runtimeDomainGate,
    humanConfirmation,
  } = makeRealService();
  await registerPaperImplementationRoutes(
    app,
    new PaperImplementationController({
      intakeBootstrap: service,
      traceKernel,
      motiveEvidenceBoard,
      validationCyclePlanning,
      workOrderExperimentBridge,
      resultClaimDossier,
      aiWorkflowHarness,
      runtimeAdmission,
      traceIntegrityDebateRuntime,
      p1RuntimeReview,
      resultAnalysisRuntime,
      experimentPlanningRuntime,
      routePlanningRuntime,
      validationCyclePlanningRuntime,
      feasibilityPlanningRuntime,
      crossBoardSynthesisRuntime,
      evidenceBoardCurationRuntime,
      motiveDecompositionRuntime,
      motiveEvolutionRuntime,
      runtimeDomainGate,
      humanConfirmation,
    }),
  );
  try {
    const bootstrap = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assertStatus(bootstrap, 201);
    const projectId = (bootstrap.json() as BootstrapImplementationProjectResponse)
      .implementation_project.implementation_project_id;
    const targetRef = ref('validation_cycle', 'validation_cycle_route_001');
    const trace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: targetRef,
        lineage: {
          ...emptyTraceLineage(),
          artifact: {
            ...emptyTraceLineage().artifact,
            log_artifact_refs: [ref('artifact', 'proposal_artifact_route_001')],
          },
          decision: {
            ...emptyTraceLineage().decision,
            human_decision_refs: [ref('human_decision', 'ai_route_decision_001')],
          },
        },
        integrity: {},
      },
    });
    assertStatus(trace, 201);
    const traceBody = trace.json() as TraceManifest;
    assert.equal(traceBody.trace_status, 'complete');

    const harness = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/implementation-harnesses`,
      payload: aiHarnessPayload(),
    });
    assertStatus(harness, 201);
    const snapshot = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/implementation-input-snapshots`,
      payload: aiInputSnapshotPayload(targetRef, traceBody.trace_manifest_id),
    });
    assertStatus(snapshot, 201);
    const run = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/agent-workflow-harness-runs`,
      payload: aiWorkflowRunPayload({
        targetRef,
        traceManifestId: traceBody.trace_manifest_id,
      }),
    });
    assertStatus(run, 201);
    assert.equal((run.json() as { harness_run: { run_status: string } }).harness_run.run_status, 'completed');
    assert.equal('spec' in (run.json() as Record<string, unknown>), false);
    assert.equal((run.json() as { queue_items: unknown[] }).queue_items.length, 0);

    const malformedRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/agent-workflow-harness-runs`,
      payload: {
        ...aiWorkflowRunPayload({
          harnessRunId: 'ai_harness_run_route_malformed',
          proposalArtifactId: 'ai_proposal_route_malformed',
          targetRef,
          traceManifestId: traceBody.trace_manifest_id,
        }),
        input_snapshot_id: '',
      },
    });
    assertStatus(malformedRun, 400);

    const blocked = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/agent-workflow-harness-runs`,
      payload: aiWorkflowRunPayload({
        harnessRunId: 'ai_harness_run_route_blocked',
        proposalArtifactId: 'ai_proposal_route_blocked',
        targetRef,
        traceManifestId: 'trace_manifest_missing',
      }),
    });
    assertStatus(blocked, 201);
    assert.equal((blocked.json() as { harness_run: { run_status: string } }).harness_run.run_status, 'blocked');
    assert.equal((blocked.json() as { queue_items: Array<{ queue_type: string }> }).queue_items[0]?.queue_type, 'trace_repair');
  } finally {
    await app.close();
  }
});

test('buildApp registers PaperImplementation routes and drives bootstrap happy path', async () => {
  const downstreamFeedback = new RecordingDownstreamFeedbackService();
  const app = buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationBridgeService: new StubBridgeService(),
    paperImplementationDownstreamFeedbackService: downstreamFeedback,
  });
  try {
    const malformed = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
      },
    });
    assert.equal(malformed.statusCode, 400);
    assert.equal((malformed.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const missing = await app.inject({
      method: 'GET',
      url: '/paper-implementation/projects/implementation_project_missing',
    });
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.json() as { error: { code: string } }).error.code, 'NOT_FOUND');

    const created = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assertStatus(created, 201);
    const createdBody = created.json() as BootstrapImplementationProjectResponse;
    assert.equal(createdBody.project_created, true);
    const projectId = createdBody.implementation_project.implementation_project_id;

    const duplicate = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assert.equal(duplicate.statusCode, 200);
    assert.equal((duplicate.json() as BootstrapImplementationProjectResponse).project_created, false);

    const feedback = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(createdBody.implementation_project.implementation_project_id)}/feedback-events`,
      payload: {
        feedback_type: 'lower_claim_ceiling',
        severity: 'warning',
        summary: 'The observed result lowers the admissible claim ceiling.',
      },
    });
    assert.equal(feedback.statusCode, 201);
    assert.equal(
      (feedback.json() as RecordImplementationFeedbackEventResponse).feedback_event.feedback_status,
      'recheck_requested',
    );
    assert.equal(downstreamFeedback.calls[0]?.downstream_source_kind, 'paper_implementation');

    const malformedTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
      },
    });
    assert.equal(malformedTrace.statusCode, 400);
    assert.equal((malformedTrace.json() as { error: { code: string } }).error.code, 'INVALID_PAYLOAD');

    const trace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('core_motive_version', 'core_motive_version_001', 'v1'),
        lineage: traceLineageWithLiterature(),
        integrity: {
          missing_refs: [ref('source_locator', 'source_locator_missing')],
        },
      },
    });
    assert.equal(trace.statusCode, 201);
    const traceBody = trace.json() as TraceManifest;
    assert.equal(traceBody.trace_status, 'broken');
    assert.equal(traceBody.missing_ref_count, 1);

    const missingManifest = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests/trace_manifest_missing`,
    });
    assert.equal(missingManifest.statusCode, 404);
    assert.equal((missingManifest.json() as { error: { code: string } }).error.code, 'NOT_FOUND');

    const gate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-gates/evaluate`,
      payload: {
        trace_manifest_id: traceBody.trace_manifest_id,
      },
    });
    assert.equal(gate.statusCode, 200);
    assert.equal((gate.json() as TraceGateResult).gate_status, 'blocked');

    const nonCitableCandidate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/citation-candidates`,
      payload: {
        trace_manifest_id: traceBody.trace_manifest_id,
        source_kind: 'literature_evidence_unit',
        source_type: 'paper',
        source_id: 'literature_source_001',
        source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
        source_locator_id: 'source_locator_missing',
        locator_quality: 'missing',
        locator: {},
        cited_for: ['method_prior_art'],
        linked_target_refs: [traceBody.target_ref],
        normalized_source_statement: 'A citable statement needs an exact locator.',
      },
    });
    assert.equal(nonCitableCandidate.statusCode, 409);
    assert.equal((nonCitableCandidate.json() as { error: { code: string } }).error.code, 'GATE_CONSTRAINT_FAILED');

    const queue = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-repair-queue`,
    });
    assert.equal(queue.statusCode, 200);
    const queueItems = (queue.json() as ListTraceRepairQueueResponse).items;
    assert.equal(queueItems.length, 1);
    assert.equal(queueItems[0]?.status, 'open');

    const resolved = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-repair-queue/${encodeURIComponent(queueItems[0]?.queue_item_id ?? '')}/resolve`,
      payload: {
        resolution_note: 'Locator was replaced by a newer trace manifest.',
      },
    });
    assert.equal(resolved.statusCode, 200);
    assert.equal((resolved.json() as TraceRepairQueueItem).status, 'resolved');

    const fetchedTrace = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests/${encodeURIComponent(traceBody.trace_manifest_id)}`,
    });
    assert.equal(fetchedTrace.statusCode, 200);
    assert.equal((fetchedTrace.json() as TraceManifest).trace_status, 'broken');
  } finally {
    await app.close();
  }
});

test('PaperImplementation motive routes bootstrap draft admission and evidence board through buildApp', async () => {
  const downstreamFeedback = new RecordingDownstreamFeedbackService();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultClaimDossierRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const closureSnapshotHash = 'sha256:route-closure-snapshot-001';
  const seededClosureRepository = new InMemoryPaperImplementationValidationCycleClosureV2Repository({
    readinessRepository: new InMemoryPaperImplementationCycleReadinessV2Repository(),
    closures: [{
      implementation_project_id: 'implementation_project_001',
      closure: {
        closure_id: 'validation_cycle_closure_route_001',
        schema_version: 'v1',
        validation_cycle_id: 'validation_cycle_route_001',
        cycle_version_at_closure: 1,
        closure_kind: 'control_flow_validated_no_paper_evidence',
        scientific_disposition: null,
        selected_exit_key: null,
        accepted_proposal_id: null,
        accepted_proposal_hash: null,
        closure_watermark: {
          schema_version: 'v1',
          validation_cycle_id: 'validation_cycle_route_001',
          expected_cycle_version: 1,
          ordered_branches: [],
          active_real_attempt_count: 0,
          closure_input_hash: 'sha256:route-closure-input-001',
        },
        closure_snapshot_hash: closureSnapshotHash,
      },
      idempotency_key: 'route-close-cycle-001',
      created_at: NOW,
    }],
  });
  let closureOwnerProjectId = 'implementation_project_pending';
  const closureRepository: PaperImplementationValidationCycleClosureV2Repository = {
    isCycleClosed: (validationCycleId) => seededClosureRepository.isCycleClosed(validationCycleId),
    withTransaction: (operation) => seededClosureRepository.withTransaction((transaction) => operation({
      ...transaction,
      findStoredClosureByCycle: async (validationCycleId) => {
        const stored = await transaction.findStoredClosureByCycle(validationCycleId);
        return stored === null
          ? null
          : { ...stored, implementation_project_id: closureOwnerProjectId };
      },
      findStoredClosureByIdempotencyKey: async (idempotencyKey) => {
        const stored = await transaction.findStoredClosureByIdempotencyKey(idempotencyKey);
        return stored === null
          ? null
          : { ...stored, implementation_project_id: closureOwnerProjectId };
      },
    })),
  };
  const app = buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationWorkOrderRepository: workOrderRepository,
    paperImplementationResultClaimDossierRepository: resultClaimDossierRepository,
    paperImplementationValidationCycleClosureV2Repository: closureRepository,
    paperImplementationBridgeService: new StubBridgeService(),
    paperImplementationDownstreamFeedbackService: downstreamFeedback,
  });
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assert.equal(created.statusCode, 201);
    const projectId = (created.json() as BootstrapImplementationProjectResponse)
      .implementation_project.implementation_project_id;
    closureOwnerProjectId = projectId;

    const draft = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/core-motives/drafts`,
      payload: motiveDraftPayload(),
    });
    assertStatus(draft, 201);

    const motiveTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('core_motive_version', 'core_motive_version_route_001', 'v1'),
        lineage: traceLineageWithLiterature(),
      },
    });
    assertStatus(motiveTrace, 201);
    const motiveTraceId = (motiveTrace.json() as TraceManifest).trace_manifest_id;

    const admitted = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/core-motives/core_motive_route_001/versions/core_motive_version_route_001/admit`,
      payload: {
        trace_manifest_id: motiveTraceId,
      },
    });
    assertStatus(admitted, 200);

    const boardTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('motive_evidence_board_version', 'motive_evidence_board_route_001', 'v1'),
        lineage: traceLineageWithLiterature(),
      },
    });
    assertStatus(boardTrace, 201);

    const bindingTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('evidence_binding', 'evidence_binding_route_001', 'v1'),
        lineage: traceLineageWithLiterature(),
      },
    });
    assertStatus(bindingTrace, 201);

    const board = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/motive-evidence-boards`,
      payload: {
        board_version_id: 'motive_evidence_board_route_001',
        motive_id: 'core_motive_route_001',
        core_motive_version_id: 'core_motive_version_route_001',
        trace_manifest_id: (boardTrace.json() as TraceManifest).trace_manifest_id,
        board_summary: {
          current_support_summary: 'Literature provides an initial signal.',
          current_challenge_summary: 'No direct counter-evidence yet.',
          unresolved_conflicts: [],
          board_gap_summary: 'Needs validation probe.',
          next_evidence_needed: ['Run a controlled synthesis probe.'],
        },
        bindings: [
          {
            binding_id: 'evidence_binding_route_001',
            assertion_id: 'motive_assertion_route_001',
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
            trace_manifest_id: (bindingTrace.json() as TraceManifest).trace_manifest_id,
          },
        ],
      },
    });
    assertStatus(board, 201);

    const boards = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/motive-evidence-boards`,
    });
    assertStatus(boards, 200);
    assert.equal((boards.json() as { items: unknown[] }).items.length, 1);

    const transfers = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/evidence-transfer-bindings`,
    });
    assertStatus(transfers, 200);
    assert.equal((transfers.json() as { items: unknown[] }).items.length, 0);

    const validationDraft = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-cycles/drafts`,
      payload: {
        validation_cycle_id: 'validation_cycle_route_001',
        target: {
          target_type: 'core_motive_version',
          target_id: 'core_motive_version_route_001',
          target_version_id: '1',
        },
        trigger: {
          trigger_type: 'board_gap',
          trigger_refs: [ref('motive_evidence_board_version', 'motive_evidence_board_route_001')],
        },
        cycle_type: 'route_feasibility',
        validation_frame: {
          validation_question: 'Can a low-cost probe answer the failure mechanism assertion?',
          assumptions_under_test: ['The scoped route can isolate synthesis conflation.'],
          assertions_under_test: [ref('motive_assertion', 'motive_assertion_route_001')],
          decision_if_pass: 'Create a work-order-ready route plan.',
          decision_if_fail: 'Emit upstream feedback or park the motive.',
          decision_if_inconclusive: 'Narrow the validation question.',
          expected_information_gain: 'medium',
          why_this_cycle_now: 'The admitted board has a route gap.',
        },
        context: {
          included_refs: {
            motive_version_refs: [ref('core_motive_version', 'core_motive_version_route_001', '1')],
            board_version_refs: [ref('motive_evidence_board_version', 'motive_evidence_board_route_001')],
            evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
            route_refs: [],
            work_order_refs: [],
            result_packet_refs: [],
            experiment_plan_light_refs: [],
          },
          excluded_context_notes: [],
        },
        criteria: {
          pass_conditions: ['The route can isolate synthesis conflation.'],
          fail_conditions: ['The route cannot answer the assertion.'],
          inconclusive_conditions: ['The route remains ambiguous.'],
          stop_conditions: ['Stop after one failed feasibility check.'],
          minimum_artifacts_required: ['Trace-ready validation memo.'],
        },
        budget: {
          budget_id: 'validation_budget_route_001',
          max_runtime: 'PT4H',
          max_compute: 'local_cpu',
          max_human_review_count: 1,
          retry_budget: 0,
        },
      },
    });
    assertStatus(validationDraft, 201);

    const validationTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('validation_cycle', 'validation_cycle_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          decision: {
            ...emptyTraceLineage().decision,
            human_decision_refs: [ref('human_decision', 'human_decision_route_001')],
          },
        },
      },
    });
    assertStatus(validationTrace, 201);
    assert.equal((validationTrace.json() as TraceManifest).trace_status, 'complete');

    const admittedValidation = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-cycles/validation_cycle_route_001/admit`,
      payload: {
        trace_manifest_id: (validationTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(admittedValidation, 200);
    const admittedValidationBody = admittedValidation.json() as ValidationCycle;
    assert.equal(admittedValidationBody.trace_manifest_ref?.ref_type, 'trace_manifest');
    assert.equal(admittedValidationBody.trace_manifest_ref?.ref_id, (validationTrace.json() as TraceManifest).trace_manifest_id);

    const experimentPlanTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('experiment_plan_light', 'experiment_plan_light_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          experiment: {
            ...emptyTraceLineage().experiment,
            metric_refs: [ref('metric', 'claim_conflation_rate')],
          },
          decision: {
            ...emptyTraceLineage().decision,
            validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_route_001')],
          },
          artifact: {
            ...emptyTraceLineage().artifact,
            dataset_refs: [ref('dataset_version', 'dataset_version_route_001')],
            code_version_refs: [ref('code_version', 'code_version_route_001')],
            config_refs: [ref('config', 'config_route_001')],
          },
        },
      },
    });
    assertStatus(experimentPlanTrace, 201);

    const experimentPlan = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/experiment-plan-lights`,
      payload: {
        experiment_plan_light_id: 'experiment_plan_light_route_001',
        validation_cycle_id: 'validation_cycle_route_001',
        run_mode: 'confirmatory',
        plan_summary: 'Run a controlled synthesis conflation check.',
        estimated_cost_class: 'medium',
        baseline_gap_status: 'resolved',
        primary_metric_refs: [ref('metric', 'claim_conflation_rate')],
        dataset_version_refs: [ref('dataset_version', 'dataset_version_route_001')],
        baseline_version_refs: [ref('baseline_version', 'baseline_version_route_001')],
        code_version_refs: [ref('code_version', 'code_version_route_001')],
        config_refs: [ref('config', 'config_route_001')],
        budget_id: 'validation_budget_route_001',
        stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
        trace_manifest_id: (experimentPlanTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(experimentPlan, 201);

    const workOrderTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('research_work_order', 'research_work_order_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          experiment: {
            ...emptyTraceLineage().experiment,
            experiment_plan_refs: [ref('experiment_plan_light', 'experiment_plan_light_route_001')],
          },
          decision: {
            ...emptyTraceLineage().decision,
            validation_cycle_refs: [ref('validation_cycle', 'validation_cycle_route_001')],
          },
        },
      },
    });
    assertStatus(workOrderTrace, 201);

    const workOrderDraft = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/research-work-orders/drafts`,
      payload: {
        work_order_id: 'research_work_order_route_001',
        validation_cycle_id: 'validation_cycle_route_001',
        experiment_plan_light_id: 'experiment_plan_light_route_001',
        run_type: 'confirmatory',
        run_policy: {
          run_policy_id: 'run_policy_route_001',
          retry_budget: 0,
          stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
          allowed_mutation_refs: [],
          autotune_policy: 'disabled',
        },
        experiment_bridge: {
          run_recipe_ref: ref('experiment_run_recipe', 'run_recipe_route_001', 'v1'),
          run_recipe_hash: 'run_recipe_hash_001',
          version_lock_hash: 'version_lock_hash_001',
          config_snapshot_hash: 'config_snapshot_hash_001',
          result_validation_policy_ref: ref('result_validation_policy', 'result_validation_policy_001'),
        },
        trace_manifest_id: (workOrderTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(workOrderDraft, 201);
    assert.equal((workOrderDraft.json() as ResearchWorkOrder).work_order_status, 'draft');

    const workOrderGate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-gates/evaluate`,
      payload: {
        trace_manifest_id: (workOrderTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(workOrderGate, 200);
    assert.equal((workOrderGate.json() as TraceGateResult).gate_status, 'passed');

    const admittedWorkOrder = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/research-work-orders/research_work_order_route_001/admit`,
      payload: {
        admission_gate_result_id: (workOrderGate.json() as TraceGateResult).gate_result_id,
      },
    });
    assertStatus(admittedWorkOrder, 200);
    assert.equal((admittedWorkOrder.json() as ResearchWorkOrder).work_order_status, 'admitted');

    const harnessRun = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/research-work-orders/research_work_order_route_001/harness-runs`,
      payload: {
        idempotency_key: 'work_order_route_attempt_001',
        external_job_ref: ref('experiment_foundation_run', 'experiment_foundation_run_001'),
        external_job_hash: 'external_job_hash_001',
      },
    });
    assertStatus(harnessRun, 201);
    assert.equal((harnessRun.json() as ResearchWorkOrderHarnessRun).run_status, 'submitted');

    const missingRunEvidenceTraceMonitor = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/run-monitor-intakes`,
      payload: {
        work_order_id: 'research_work_order_route_001',
        run_evidence_unit_id: 'run_evidence_unit_route_001',
        external_job_ref: ref('experiment_foundation_run', 'experiment_foundation_run_001'),
        external_job_hash: 'external_job_hash_001',
        monitor_event_kind: 'failed',
        run_status: 'failed',
        failure_summary: 'The controlled run failed before producing trusted result artifacts.',
      },
    });
    assertStatus(missingRunEvidenceTraceMonitor, 409);

    const routeRunEvidenceId = 'run_evidence_unit_route_001';

    const monitor = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/run-monitor-intakes`,
      payload: {
        work_order_id: 'research_work_order_route_001',
        external_job_ref: ref('experiment_foundation_run', 'experiment_foundation_run_001'),
        external_job_hash: 'external_job_hash_001',
        monitor_event_kind: 'failed',
        run_status: 'failed',
        failure_summary: 'The controlled run failed before producing trusted result artifacts.',
      },
    });
    assertStatus(monitor, 201);
    const monitorBody = monitor.json() as RecordRunMonitorIntakeResponse;
    assert.equal(monitorBody.monitor_intake.trust_status, 'trusted');
    assert.equal(monitorBody.monitor_intake.run_status, 'failed');
    assert.equal(monitorBody.evidence_handoff.authority, 'paper_implementation_evidence_trust_gateway_v2');

    const runEvidenceUnits = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/run-evidence-units`,
    });
    assertStatus(runEvidenceUnits, 200);
    assert.equal((runEvidenceUnits.json() as { items: RunEvidenceUnit[] }).items.length, 0);

    const resultTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('result_interpretation_packet', 'result_interpretation_packet_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          experiment: {
            ...emptyTraceLineage().experiment,
            run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
            metric_refs: [ref('metric', 'claim_conflation_rate')],
          },
        },
      },
    });
    assertStatus(resultTrace, 201);

    const resultPacket = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/result-interpretation-packets`,
      payload: {
        result_interpretation_packet_id: 'result_interpretation_packet_route_001',
        validation_cycle_id: 'validation_cycle_route_001',
        experiment_plan_light_id: 'experiment_plan_light_route_001',
        source: {
          run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
          validation_report_refs: [],
          metric_refs: [ref('metric', 'claim_conflation_rate')],
          failed_run_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
          inconclusive_run_refs: [],
          stale_or_invalidated_evidence_refs: [],
        },
        result_summary: {
          result_summary: 'The controlled run failed, so the claim must stay bounded.',
          supports_assertion_refs: [],
          challenges_assertion_refs: [ref('motive_assertion', 'motive_assertion_route_001')],
          unexpected_findings: [],
          failed_runs_accounted_for: true,
          inconclusive_runs_accounted_for: true,
          exploratory_confirmatory_separated: true,
        },
        reliability: {
          failed_runs_retained: true,
          confound_refs: [],
          limitation_refs: [],
          reliability_notes: ['Failed run retained as boundary evidence.'],
        },
        claim_implications: {
          allowed_claim_ceiling: 'tentative',
          forbidden_overclaims: ['broad model reliability'],
          recommended_claim_refs: [],
          required_followup_refs: [],
        },
        trace_manifest_id: (resultTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(resultPacket, 409);
    assert.equal(
      resultPacket.json().error.details.reason_code,
      'RESULT_INTERPRETATION_PACKET_MATERIALIZATION_CLOSED',
    );
    const historicalPacket: ResultInterpretationPacket = {
      result_interpretation_packet_id: 'result_interpretation_packet_route_001',
      implementation_project_id: projectId,
      validation_cycle_id: 'validation_cycle_route_001',
      experiment_plan_light_id: 'experiment_plan_light_route_001',
      source: {
        run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
        validation_report_refs: [],
        metric_refs: [ref('metric', 'claim_conflation_rate')],
        failed_run_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
        inconclusive_run_refs: [],
        stale_or_invalidated_evidence_refs: [],
      },
      result_summary: {
        result_summary: 'Historical pre-cutover packet retained for downstream read coverage.',
        supports_assertion_refs: [],
        challenges_assertion_refs: [ref('motive_assertion', 'motive_assertion_route_001')],
        unexpected_findings: [],
        failed_runs_accounted_for: true,
        inconclusive_runs_accounted_for: true,
        exploratory_confirmatory_separated: true,
      },
      reliability: {
        failed_runs_retained: true,
        confound_refs: [],
        limitation_refs: [],
        reliability_notes: [],
      },
      claim_implications: {
        allowed_claim_ceiling: 'tentative',
        forbidden_overclaims: ['broad model reliability'],
        recommended_claim_refs: [],
        required_followup_refs: [],
      },
      interpretation_gate_status: 'passed_with_risk',
      trace_manifest_ref: ref(
        'trace_manifest',
        (resultTrace.json() as TraceManifest).trace_manifest_id,
      ),
      trace_manifest_id: (resultTrace.json() as TraceManifest).trace_manifest_id,
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
    };
    await resultClaimDossierRepository.createResultInterpretationPacket(historicalPacket);

    const claimTraceManifest = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('claim_candidate', 'claim_candidate_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          literature: {
            ...emptyTraceLineage().literature,
            literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
          },
          experiment: {
            ...emptyTraceLineage().experiment,
            run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
            result_packet_refs: [ref('result_interpretation_packet', 'result_interpretation_packet_route_001')],
          },
        },
      },
    });
    assertStatus(claimTraceManifest, 201);

    const claimTracePacket = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/claim-trace-packets`,
      payload: {
        claim_ref: ref('claim_candidate', 'claim_candidate_route_001'),
        claim_statement: 'The run exposes a bounded failure case.',
        trace_manifest_id: (claimTraceManifest.json() as TraceManifest).trace_manifest_id,
        lineage: {
          ...emptyTraceLineage(),
          literature: {
            ...emptyTraceLineage().literature,
            literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
          },
          experiment: {
            ...emptyTraceLineage().experiment,
            run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
            result_packet_refs: [ref('result_interpretation_packet', 'result_interpretation_packet_route_001')],
          },
        },
        challenge: {
          challenging_result_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
          counter_evidence_refs: [],
          unresolved_objections: [],
        },
        scope: {
          dataset_scope: 'Route dataset version.',
          task_scope: 'Controlled synthesis conflation check.',
          baseline_scope: 'Route baseline.',
          method_scope: 'Configured route method.',
          evaluation_scope: 'claim_conflation_rate metric.',
        },
        boundary: {
          forbidden_overclaims: ['broad model reliability'],
          claim_strength: 'tentative',
          human_confirmation_required: false,
        },
      },
    });
    assertStatus(claimTracePacket, 201);

    const claimCandidate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/claim-candidates`,
      payload: {
        claim_candidate_id: 'claim_candidate_route_001',
        claim_type: 'negative_result_claim',
        claim_statement: 'The run exposes a bounded failure case.',
        claim_strength: 'tentative',
        result_interpretation_packet_ids: ['result_interpretation_packet_route_001'],
        support_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
        challenge_refs: [],
        scope: {
          population_scope: 'Controlled synthesis conflation check.',
          method_scope: 'Configured route method.',
          dataset_scope: 'Route dataset version.',
          metric_scope: 'claim_conflation_rate metric.',
          negative_scope_notes: ['Run failed before trusted positive evidence.'],
          excluded_scope_notes: ['No broad model reliability claim.'],
        },
        boundary: {
          rationale: 'The failed run supports only a bounded negative result.',
          forbidden_overclaims: ['broad model reliability'],
          hidden_counter_evidence_refs: [],
          required_followup_refs: [],
        },
        trace_manifest_id: (claimTraceManifest.json() as TraceManifest).trace_manifest_id,
        claim_trace_packet_id: (claimTracePacket.json() as ClaimTracePacket).claim_trace_packet_id,
      },
    });
    assertStatus(claimCandidate, 201);

    const dossierTrace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('implementation_dossier', 'implementation_dossier_route_001', 'v1'),
        lineage: {
          ...emptyTraceLineage(),
          literature: {
            ...emptyTraceLineage().literature,
            literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
          },
          experiment: {
            ...emptyTraceLineage().experiment,
            run_evidence_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
            result_packet_refs: [ref('result_interpretation_packet', 'result_interpretation_packet_route_001')],
          },
        },
      },
    });
    assertStatus(dossierTrace, 201);

    const dossierGate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-gates/evaluate`,
      payload: {
        trace_manifest_id: (dossierTrace.json() as TraceManifest).trace_manifest_id,
      },
    });
    assertStatus(dossierGate, 200);
    assert.equal((dossierGate.json() as TraceGateResult).gate_status, 'passed');

    const dossier = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/implementation-dossiers`,
      payload: {
        dossier_id: 'implementation_dossier_route_001',
        dossier_status: 'ready_for_writing',
        result_interpretation_packet_ids: ['result_interpretation_packet_route_001'],
        claim_candidate_ids: ['claim_candidate_route_001'],
        claim_trace_packet_ids: [(claimTracePacket.json() as ClaimTracePacket).claim_trace_packet_id],
        closed_validation_cycle_snapshot_refs: [{
          validation_cycle_id: 'validation_cycle_route_001',
          closure_id: 'validation_cycle_closure_route_001',
          closure_snapshot_hash: closureSnapshotHash,
        }],
        experiment_section: {
          failed_run_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
          inconclusive_run_refs: [],
          negative_result_refs: [ref('run_evidence_unit', routeRunEvidenceId)],
          excluded_stale_or_invalidated_evidence_refs: [],
          experiment_limitations: ['Failed run limits the claim ceiling.'],
        },
        claim_section: {
          admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_route_001')],
          rejected_claim_refs: [],
          forbidden_overclaims: ['broad model reliability'],
          claim_ceiling: 'tentative',
        },
        readiness: {
          readiness_gate_result_id: (dossierGate.json() as TraceGateResult).gate_result_id,
          blocker_refs: [],
          warning_refs: [],
          readiness_notes: ['Ready as bounded negative result dossier.'],
        },
        trace_manifest_id: (dossierTrace.json() as TraceManifest).trace_manifest_id,
        projection_policy_version_id: 'writing_projection_policy_v1',
      },
    });
    assertStatus(dossier, 201);

    const writingPacket = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/implementation-dossiers/implementation_dossier_route_001/writing-entry-packets`,
      payload: {
        projection_policy_version_id: 'writing_projection_policy_v1',
      },
    });
    assertStatus(writingPacket, 201);
    assert.equal((writingPacket.json() as { packet_status: string }).packet_status, 'current');

    const untrustedMonitor = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/run-monitor-intakes`,
      payload: {
        external_job_ref: ref('experiment_foundation_run', 'orphan_run_001'),
        external_job_hash: 'orphan_run_hash_001',
        monitor_event_kind: 'result_available',
        run_status: 'succeeded',
      },
    });
    assertStatus(untrustedMonitor, 201);
    const untrustedMonitorBody = untrustedMonitor.json() as RecordRunMonitorIntakeResponse;
    assert.equal(untrustedMonitorBody.monitor_intake.trust_status, 'untrusted');
    assert.equal(untrustedMonitorBody.evidence_handoff.required_input, 'ef_qualified_evidence_candidate');

    const callerAuthoredCompletion = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-cycles/validation_cycle_route_001/complete`,
      payload: {
        cycle_assessment: {
          outcome: 'inconclusive',
          information_gain_realized: 'low',
          residual_uncertainties: ['Route feasibility still needs narrowing.'],
          recommended_next_action: 'Review the route plan before another cycle.',
          rationale: 'The cycle did not reduce the main uncertainty enough.',
        },
      },
    });
    assertStatus(callerAuthoredCompletion, 409);
    assert.equal(
      (callerAuthoredCompletion.json() as { error?: { details?: { reason_code?: string } } })
        .error?.details?.reason_code,
      'LEGACY_SCIENTIFIC_WRITER_CLOSED',
    );

    const preservedCycleRead = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-cycles/validation_cycle_route_001`,
    });
    assertStatus(preservedCycleRead, 200);
    assert.equal((preservedCycleRead.json() as { lifecycle_status: string }).lifecycle_status, 'admitted');
    assert.equal((preservedCycleRead.json() as { cycle_assessment: unknown }).cycle_assessment, null);

    const feedbackCandidate = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-upstream-feedback-candidates`,
      payload: {
        validation_cycle_id: 'validation_cycle_route_001',
        source_object_refs: [ref('validation_cycle', 'validation_cycle_route_001')],
        feedback_type: 'infeasible_route',
        severity: 'blocking',
        summary: 'The route may be infeasible under admitted constraints.',
      },
    });
    assertStatus(feedbackCandidate, 201);

    const dispatched = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/validation-upstream-feedback-candidates/${encodeURIComponent((feedbackCandidate.json() as { candidate_id: string }).candidate_id)}/dispatch`,
      payload: {},
    });
    assertStatus(dispatched, 200);
    assert.equal(downstreamFeedback.calls[0]?.downstream_source_kind, 'paper_implementation');
  } finally {
    await app.close();
  }
});

async function bootstrapProjectWithMotiveDraft(app: ReturnType<typeof buildApp>): Promise<string> {
  const created = await app.inject({
    method: 'POST',
    url: '/paper-implementation/projects/bootstrap',
    payload: {
      paper_project_bridge_id: 'paper_project_bridge_001',
      bridge_payload_hash: 'bridge_payload_hash_001',
    },
  });
  assertStatus(created, 201);
  const projectId = (created.json() as BootstrapImplementationProjectResponse)
    .implementation_project.implementation_project_id;
  const draft = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/core-motives/drafts`,
    payload: motiveDraftPayload(),
  });
  assertStatus(draft, 201);
  return projectId;
}

function evolutionDecisionPayload(confirmationRecordId: string) {
  return {
    source_motive_refs: [ref('core_motive', 'core_motive_route_001')],
    evolution_type: 'refine_statement',
    effect_class: 'structural_evolution',
    decision_summary: 'Structural refinement of the drafted motive.',
    decision_rationale: 'Board review requires refining the motive statement.',
    change_set: {},
    human_confirmation_required: true,
    confirmed_by: 'human',
    confirmation_ref: ref('human_confirmation_record', confirmationRecordId),
    application_status: 'proposed',
  };
}

async function createConfirmationForTargets(
  app: ReturnType<typeof buildApp>,
  projectId: string,
  targetRefs: TopicSelectionFunctionalRef[],
): Promise<string> {
  const confirmation = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/human-confirmations`,
    payload: {
      confirmation_scope: 'motive_evolution_decision',
      target_refs: targetRefs,
      rationale: 'Reviewed the structural evolution before confirming.',
      confirmed_by_actor_type: 'human',
      confirmed_by_actor_id: 'reviewer_001',
    },
  });
  assertStatus(confirmation, 201);
  return (confirmation.json() as { confirmation_record_id: string }).confirmation_record_id;
}

test('human confirmation target binding rejects records that do not cover the authorized object', async () => {
  const app = buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationBridgeService: new StubBridgeService(),
  });
  try {
    const projectId = await bootstrapProjectWithMotiveDraft(app);
    const confirmationRecordId = await createConfirmationForTargets(app, projectId, [
      ref('core_motive', 'core_motive_unrelated_001'),
    ]);

    const rejected = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/motive-evolution-decisions`,
      payload: evolutionDecisionPayload(confirmationRecordId),
    });
    assertStatus(rejected, 409);
    const rejectedBody = rejected.json() as { error: { code: string; message: string } };
    assert.equal(rejectedBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(rejectedBody.error.message, /target_refs must cover the authorized object/);

    // The record stays unconsumed and usable for its actual target.
    const records = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/human-confirmations`,
    });
    assertStatus(records, 200);
    const items = (records.json() as { items: { consumed_at?: string | null }[] }).items;
    assert.equal(items.length, 1);
    assert.equal(items[0]?.consumed_at ?? null, null);
  } finally {
    await app.close();
  }
});

test('human confirmation record is consumed once and rejects reuse across decisions', async () => {
  const app = buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationBridgeService: new StubBridgeService(),
  });
  try {
    const projectId = await bootstrapProjectWithMotiveDraft(app);
    const confirmationRecordId = await createConfirmationForTargets(app, projectId, [
      ref('core_motive', 'core_motive_route_001'),
    ]);

    const firstDecision = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/motive-evolution-decisions`,
      payload: evolutionDecisionPayload(confirmationRecordId),
    });
    assertStatus(firstDecision, 201);
    const firstDecisionId = (firstDecision.json() as { motive_evolution_decision_id: string })
      .motive_evolution_decision_id;

    const records = await app.inject({
      method: 'GET',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/human-confirmations`,
    });
    assertStatus(records, 200);
    const consumed = (records.json() as {
      items: {
        confirmation_record_id: string;
        consumed_at?: string | null;
        consumed_by_ref?: { ref_type: string; ref_id: string } | null;
      }[];
    }).items.find((item) => item.confirmation_record_id === confirmationRecordId);
    assert.ok(consumed?.consumed_at);
    assert.equal(consumed?.consumed_by_ref?.ref_type, 'motive_evolution_decision');
    assert.equal(consumed?.consumed_by_ref?.ref_id, firstDecisionId);

    const reused = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/motive-evolution-decisions`,
      payload: evolutionDecisionPayload(confirmationRecordId),
    });
    assertStatus(reused, 409);
    const reusedBody = reused.json() as { error: { code: string; message: string } };
    assert.equal(reusedBody.error.code, 'GATE_CONSTRAINT_FAILED');
    assert.match(reusedBody.error.message, /already been consumed/);
  } finally {
    await app.close();
  }
});

test('PaperImplementation routes expose bootstrap, idempotent duplicate, stale hash, and feedback behavior through real service', async () => {
  const app = Fastify({ logger: false });
  const {
    downstreamFeedback,
    service,
    traceKernel,
    motiveEvidenceBoard,
    validationCyclePlanning,
    workOrderExperimentBridge,
    resultClaimDossier,
    aiWorkflowHarness,
    runtimeAdmission,
    traceIntegrityDebateRuntime,
    p1RuntimeReview,
    resultAnalysisRuntime,
    experimentPlanningRuntime,
    routePlanningRuntime,
    validationCyclePlanningRuntime,
    feasibilityPlanningRuntime,
    crossBoardSynthesisRuntime,
    evidenceBoardCurationRuntime,
    motiveDecompositionRuntime,
    motiveEvolutionRuntime,
    runtimeDomainGate,
    humanConfirmation,
  } = makeRealService();
  await registerPaperImplementationRoutes(
    app,
    new PaperImplementationController({
      intakeBootstrap: service,
      traceKernel,
      motiveEvidenceBoard,
      validationCyclePlanning,
      workOrderExperimentBridge,
      resultClaimDossier,
      aiWorkflowHarness,
      runtimeAdmission,
      traceIntegrityDebateRuntime,
      p1RuntimeReview,
      resultAnalysisRuntime,
      experimentPlanningRuntime,
      routePlanningRuntime,
      validationCyclePlanningRuntime,
      feasibilityPlanningRuntime,
      crossBoardSynthesisRuntime,
      evidenceBoardCurationRuntime,
      motiveDecompositionRuntime,
      motiveEvolutionRuntime,
      runtimeDomainGate,
      humanConfirmation,
    }),
  );
  try {
    const created = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assert.equal(created.statusCode, 201);
    const createdBody = created.json() as BootstrapImplementationProjectResponse;
    assert.equal(createdBody.project_created, true);
    assert.equal(createdBody.implementation_project.paper_project_bridge_id, 'paper_project_bridge_001');

    const duplicate = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_payload_hash_001',
      },
    });
    assert.equal(duplicate.statusCode, 200);
    assert.equal((duplicate.json() as BootstrapImplementationProjectResponse).project_created, false);

    const stale = await app.inject({
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'stale_hash',
      },
    });
    assert.equal(stale.statusCode, 409);
    assert.equal((stale.json() as { error: { code: string } }).error.code, 'VERSION_CONFLICT');

    const feedback = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(createdBody.implementation_project.implementation_project_id)}/feedback-events`,
      payload: {
        feedback_type: 'infeasible_route',
        severity: 'blocking',
        summary: 'The route is infeasible.',
      },
    });
    assert.equal(feedback.statusCode, 201);
    assert.equal(
      (feedback.json() as RecordImplementationFeedbackEventResponse).feedback_event.feedback_status,
      'recheck_requested',
    );
    assert.equal(downstreamFeedback.calls.length, 1);
    assert.equal(downstreamFeedback.calls[0]?.downstream_source_kind, 'paper_implementation');
    assert.equal(downstreamFeedback.calls[0]?.feedback_signal, 'paper_project_constraint_conflict');

    const projectId = createdBody.implementation_project.implementation_project_id;
    const trace = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/trace-manifests`,
      payload: {
        target_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
        lineage: traceLineageWithLiterature(),
      },
    });
    assert.equal(trace.statusCode, 201);
    const traceBody = trace.json() as TraceManifest;
    assert.equal(traceBody.trace_status, 'complete');

    const citation = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/citation-candidates`,
      payload: {
        trace_manifest_id: traceBody.trace_manifest_id,
        source_kind: 'literature_evidence_unit',
        source_type: 'paper',
        source_id: 'literature_source_001',
        source_evidence_unit_ref: ref('literature_evidence_unit', 'literature_evidence_unit_001'),
        source_locator_id: 'source_locator_001',
        locator_quality: 'exact',
        locator: {
          section: '3.1',
          paragraph: '2',
        },
        cited_for: ['method_prior_art'],
        linked_target_refs: [traceBody.target_ref],
        normalized_source_statement: 'The prior paper establishes the comparison point.',
      },
    });
    assert.equal(citation.statusCode, 201);
    assert.equal((citation.json() as CitationCandidate).status, 'candidate');

    const claimPacket = await app.inject({
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(projectId)}/claim-trace-packets`,
      payload: {
        claim_ref: ref('claim_candidate', 'claim_candidate_001', 'v1'),
        claim_statement: 'The implementation improves the target workflow under the bounded setting.',
        trace_manifest_id: traceBody.trace_manifest_id,
        lineage: {
          ...emptyTraceLineage(),
          literature: {
            ...emptyTraceLineage().literature,
            citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
          },
        },
        challenge: {
          challenging_result_refs: [],
          counter_evidence_refs: [],
          unresolved_objections: [],
        },
        scope: {
          task_scope: 'bounded implementation workflow',
        },
        boundary: {
          forbidden_overclaims: ['Do not claim general superiority.'],
          claim_strength: 'tentative',
          human_confirmation_required: true,
        },
      },
    });
    assert.equal(claimPacket.statusCode, 201);
    assert.equal((claimPacket.json() as ClaimTracePacket).claim_ref.ref_id, 'claim_candidate_001');
  } finally {
    await app.close();
  }
});
