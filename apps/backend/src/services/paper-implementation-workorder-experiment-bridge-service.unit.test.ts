import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  ExperimentPlanLight,
  ValidationCycle,
  ValidationCycleInputSnapshot,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { InMemoryPaperImplementationWorkOrderRepository } from '../repositories/in-memory-paper-implementation-workorder-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import { seedAcceptedProposalFixture } from './paper-implementation-acceptance-bridge-test-fixtures.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationWorkOrderExperimentBridgeService } from './paper-implementation-workorder-experiment-bridge-service.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';
const VALIDATION_CYCLE_ID = 'validation_cycle_001';
const EXPERIMENT_PLAN_ID = 'experiment_plan_light_001';
const WORK_ORDER_ID = 'research_work_order_001';
const RUN_EVIDENCE_ID = 'run_evidence_unit_001';

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

class StaticProjectRepository implements PaperImplementationRepository {
  readonly project: ImplementationProject = {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: 'intake_snapshot_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return { ...persistence, created: true };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return implementationProjectId === PROJECT_ID ? structuredClone(this.project) : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return structuredClone(this.project);
  }

  async findIntakeSnapshotById(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    return structuredClone(event);
  }
}

function makeInputSnapshot(): ValidationCycleInputSnapshot {
  return {
    input_snapshot_id: 'validation_input_snapshot_001',
    implementation_project_id: PROJECT_ID,
    context_policy_version_id: 'validation_context_v1',
    included_refs: {
      motive_version_refs: [ref('core_motive_version', 'core_motive_version_001', '1')],
      board_version_refs: [ref('motive_evidence_board_version', 'motive_evidence_board_001')],
      evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      route_refs: [],
      work_order_refs: [],
      result_packet_refs: [],
      experiment_plan_light_refs: [],
    },
    excluded_context_notes: [],
    input_snapshot_hash: 'validation_input_hash_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeValidationCycle(status: ValidationCycle['lifecycle_status'] = 'admitted'): ValidationCycle {
  const inputSnapshot = makeInputSnapshot();
  return {
    validation_cycle_id: VALIDATION_CYCLE_ID,
    implementation_project_id: PROJECT_ID,
    input_snapshot_id: inputSnapshot.input_snapshot_id,
    target: {
      target_type: 'core_motive_version',
      target_id: 'core_motive_version_001',
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'board_gap',
      trigger_refs: [ref('motive_evidence_board_version', 'motive_evidence_board_001')],
    },
    cycle_type: 'probe_execution',
    validation_frame: {
      validation_question: 'Does the run support the admitted assertion?',
      assumptions_under_test: ['The dataset contains sufficient paired examples.'],
      assertions_under_test: [ref('motive_assertion', 'motive_assertion_001')],
      decision_if_pass: 'Prepare claim interpretation.',
      decision_if_fail: 'Lower the claim ceiling.',
      decision_if_inconclusive: 'Revise the route.',
      expected_information_gain: 'high',
      why_this_cycle_now: 'The evidence board is admitted and needs run evidence.',
    },
    context: inputSnapshot,
    criteria: {
      pass_conditions: ['Primary metric improves over baseline.'],
      fail_conditions: ['Primary metric does not improve.'],
      inconclusive_conditions: ['Run cannot complete or metric is unstable.'],
      stop_conditions: ['Stop after one failed confirmatory run.'],
      minimum_artifacts_required: ['Trusted run evidence unit.'],
    },
    budget: {
      budget_id: 'validation_budget_001',
      max_runtime: 'PT4H',
      max_compute: 'local_cpu',
      max_human_review_count: 1,
      retry_budget: 0,
    },
    lifecycle_status: status,
    execution_status: 'not_started',
    outputs: {
      evidence_unit_refs: [],
      evidence_binding_refs: [],
      board_update_refs: [],
      route_update_refs: [],
      work_order_result_refs: [],
      result_interpretation_packet_refs: [],
      quality_signal_refs: [],
      recommended_evolution_decision_refs: [],
    },
    cycle_assessment: null,
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_validation_001'),
    trace_manifest_id: 'trace_manifest_validation_001',
    gate_result_id: 'validation_gate_result_001',
    decision_exit: null,
    confirmation_level: 'human_confirmed',
    confirmed_by: 'human',
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    admitted_at: status === 'admitted' ? NOW : null,
    completed_at: null,
  };
}

function makeExperimentPlan(): ExperimentPlanLight {
  return {
    experiment_plan_light_id: EXPERIMENT_PLAN_ID,
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    route_candidate_id: null,
    run_mode: 'confirmatory',
    plan_summary: 'Run confirmatory experiment.',
    estimated_cost_class: 'medium',
    baseline_gap_status: 'resolved',
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    confirmatory_marker: true,
    scope_boundary_ref: null,
    budget_id: 'validation_budget_001',
    stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_plan_001'),
    trace_manifest_id: 'trace_manifest_plan_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function traceManifest(
  traceManifestId: string,
  targetRefType: string,
  targetRefId: string,
  status: TraceManifest['trace_status'] = 'complete',
): TraceManifest {
  return {
    trace_manifest_id: traceManifestId,
    implementation_project_id: PROJECT_ID,
    target_ref: ref(targetRefType, targetRefId, 'v1'),
    lineage: emptyLineage(),
    integrity: {
      missing_refs: [],
      broken_refs: [],
      stale_refs: status === 'stale' ? [ref('dataset_version', 'dataset_version_old')] : [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: status,
    broken_ref_count: 0,
    stale_ref_count: status === 'stale' ? 1 : 0,
    missing_ref_count: 0,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace_policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

async function assertRejectsWithCode(
  action: () => Promise<unknown>,
  expectedCode: string,
) {
  await assert.rejects(
    action,
    (error: unknown) => error instanceof AppError && error.errorCode === expectedCode,
  );
}

async function makeHarness(options: { cycleStatus?: ValidationCycle['lifecycle_status'] } = {}) {
  const projectRepository = new StaticProjectRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: new InMemoryPaperImplementationRuntimeRepository(),
    now: () => NOW,
  });
  const service = new PaperImplementationWorkOrderExperimentBridgeService({
    projectRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    runtimeAdmission,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const inputSnapshot = makeInputSnapshot();
  const cycle = makeValidationCycle(options.cycleStatus ?? 'admitted');
  await validationRepository.createValidationCycleDraft({
    input_snapshot: inputSnapshot,
    validation_cycle: cycle,
  });
  await validationRepository.createExperimentPlanLight(makeExperimentPlan());
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_work_order_001', 'research_work_order', WORK_ORDER_ID),
    [],
  );
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_run_evidence_001', 'run_evidence_unit', RUN_EVIDENCE_ID),
    [],
  );
  await traceRepository.createTraceGateResult({
    gate_result_id: 'work_order_gate_result_001',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: 'trace_manifest_work_order_001',
    gate_status: 'passed',
    trace_status: 'complete',
    blocker_codes: [],
    repair_queue_item_refs: [],
    created_at: NOW,
  });

  return {
    service,
    workOrderRepository,
    traceRepository,
    runtimeAdmission,
  };
}

function workOrderRequest() {
  return {
    work_order_id: WORK_ORDER_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    experiment_plan_light_id: EXPERIMENT_PLAN_ID,
    run_type: 'confirmatory' as const,
    run_policy: {
      run_policy_id: 'run_policy_001',
      retry_budget: 0,
      stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled' as const,
    },
    experiment_bridge: {
      run_recipe_ref: ref('experiment_run_recipe', 'run_recipe_001', 'v1'),
      run_recipe_hash: 'run_recipe_hash_001',
      version_lock_hash: 'version_lock_hash_001',
      config_snapshot_hash: 'config_snapshot_hash_001',
      result_validation_policy_ref: ref('result_validation_policy', 'result_validation_policy_001'),
    },
    trace_manifest_id: 'trace_manifest_work_order_001',
  };
}

test('creates ResearchWorkOrder draft from admitted validation cycle and plan refs', async () => {
  const { service } = await makeHarness();
  const workOrder = await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());

  assert.equal(workOrder.work_order_id, WORK_ORDER_ID);
  assert.equal(workOrder.work_order_status, 'draft');
  assert.equal(workOrder.validation_cycle_id, VALIDATION_CYCLE_ID);
  assert.equal(workOrder.experiment_plan_light_id, EXPERIMENT_PLAN_ID);
  assert.equal(workOrder.dataset_version_refs[0]?.ref_id, 'dataset_version_001');
  assert.equal(workOrder.code_version_refs[0]?.ref_id, 'code_version_001');
  assert.equal(workOrder.config_refs[0]?.ref_id, 'config_001');
});

test('blocks draft creation from non-admitted cycle and stale work-order trace', async () => {
  const proposedHarness = await makeHarness({ cycleStatus: 'proposed' });
  await assertRejectsWithCode(
    () => proposedHarness.service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest()),
    'GATE_CONSTRAINT_FAILED',
  );

  const staleHarness = await makeHarness();
  await staleHarness.traceRepository.createTraceManifest(
    traceManifest('trace_manifest_work_order_stale', 'research_work_order', 'research_work_order_stale', 'stale'),
    [],
  );
  await assertRejectsWithCode(
    () => staleHarness.service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      work_order_id: 'research_work_order_stale',
      trace_manifest_id: 'trace_manifest_work_order_stale',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('creates ResearchWorkOrder draft with admitted proposal lineage that is readable back', async () => {
  const { service, runtimeAdmission } = await makeHarness();
  const proposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'experiment_design',
    runtimeArtifactId: 'runtime_artifact_experiment_design_001',
  });

  const workOrder = await service.createResearchWorkOrderDraft(PROJECT_ID, {
    ...workOrderRequest(),
    source_proposal_artifact_ref: proposal.sourceProposalArtifactRef,
    source_proposal_artifact_hash: proposal.sourceProposalArtifactHash,
  });
  assert.deepEqual(workOrder.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(workOrder.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);

  const readBack = await service.getResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID);
  assert.deepEqual(readBack.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(readBack.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);
});

test('acceptance bridge rejects lineage drift for forged hash, blocked final, and wrong workflow type', async () => {
  const { service, runtimeAdmission, workOrderRepository } = await makeHarness();
  const proposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'experiment_design',
    runtimeArtifactId: 'runtime_artifact_experiment_design_001',
  });

  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      source_proposal_artifact_ref: proposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: 'a'.repeat(64),
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const blockedProposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'experiment_design',
    runtimeArtifactId: 'runtime_artifact_experiment_design_blocked_001',
    runtimeStatus: 'blocked',
  });
  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      source_proposal_artifact_ref: blockedProposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: blockedProposal.sourceProposalArtifactHash,
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const wrongWorkflowProposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'route_architecture',
    runtimeArtifactId: 'runtime_artifact_route_architecture_001',
  });
  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      source_proposal_artifact_ref: wrongWorkflowProposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: wrongWorkflowProposal.sourceProposalArtifactHash,
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  assert.equal(await workOrderRepository.findWorkOrderById(PROJECT_ID, WORK_ORDER_ID), null);
});

test('requires confirmatory version lock and forbids autotune on primary evidence path', async () => {
  const { service } = await makeHarness();
  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      experiment_bridge: {
        ...workOrderRequest().experiment_bridge,
        version_lock_hash: null,
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      run_policy: {
        ...workOrderRequest().run_policy,
        autotune_policy: 'human_confirmed',
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('rejects experiment foundation DTO copies and paper claims at adjacent bridge boundaries', async () => {
  const { service } = await makeHarness();
  await assertRejectsWithCode(
    () => service.createResearchWorkOrderDraft(PROJECT_ID, {
      ...workOrderRequest(),
      experiment_bridge: {
        ...workOrderRequest().experiment_bridge,
        run_recipe: {
          run_recipe_id: 'run_recipe_001',
          run_recipe_hash: 'sha256:run-recipe',
        },
      } as never,
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      monitor_event_kind: 'result_available',
      run_status: 'succeeded',
      raw_payload: {
        adapter_event_id: 'adapter_event_001',
        nested_payload: {
          experiment_result: {
            experiment_result_id: 'experiment_result_001',
            result_hash: 'sha256:experiment-result',
          },
        },
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      monitor_event_kind: 'result_available',
      run_status: 'succeeded',
      raw_payload: {
        result_ref: ref('experiment_result', 'experiment_result_001'),
        result_hash: 'sha256:experiment-result',
        claim_text: 'This belongs to paper drafting, not run monitor intake.',
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const lightweight = await service.recordRunMonitorIntake(PROJECT_ID, {
    monitor_event_kind: 'status_update',
    run_status: 'running',
    raw_payload: {
      external_event_ref: ref('adapter_event', 'adapter_event_001'),
      result_hash: 'sha256:result-observed',
    },
  });
  assert.equal(lightweight.monitor_intake.trust_status, 'untrusted');
  assert.deepEqual(Object.keys(lightweight.monitor_intake.raw_payload).sort(), ['external_event_ref', 'result_hash']);
});

test('admits work order, submits harness run, and records failed run evidence', async () => {
  const { service, workOrderRepository } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  const admitted = await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  assert.equal(admitted.work_order_status, 'admitted');

  const harnessRun = await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });
  assert.equal(harnessRun.run_status, 'submitted');
  assert.equal((await service.listHarnessRuns(PROJECT_ID, WORK_ORDER_ID)).length, 1);

  const response = await service.recordRunMonitorIntake(PROJECT_ID, {
    work_order_id: WORK_ORDER_ID,
    run_evidence_unit_id: RUN_EVIDENCE_ID,
    run_evidence_trace_manifest_id: 'trace_manifest_run_evidence_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    monitor_event_kind: 'failed',
    run_status: 'failed',
    failure_summary: 'The run failed before producing result artifacts.',
  });
  assert.equal(response.monitor_intake.trust_status, 'trusted');
  assert.equal(response.run_evidence_unit?.run_status, 'failed');
  assert.equal(response.run_evidence_unit?.failure_summary_id?.startsWith('run_failure_summary_'), true);
  assert.equal(response.run_evidence_unit?.trace_manifest_id, 'trace_manifest_run_evidence_001');
  assert.equal((await workOrderRepository.findWorkOrderById(PROJECT_ID, WORK_ORDER_ID))?.work_order_status, 'failed');
});

test('work order admission replays same gate result and rejects drifted gate result', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  const admitted = await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });

  const replay = await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  assert.equal(replay.work_order_status, 'admitted');
  assert.equal(replay.work_order_id, admitted.work_order_id);
  assert.equal(replay.admission_gate_result_id, admitted.admission_gate_result_id);
  assert.equal(replay.admitted_at, admitted.admitted_at);

  await assertRejectsWithCode(
    () => service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
      admission_gate_result_id: 'work_order_gate_result_drifted',
    }),
    'VERSION_CONFLICT',
  );
});

test('harness run submission replays same idempotency key and rejects drifted external job identity', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  const first = await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });

  const replay = await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });
  assert.equal(replay.harness_run_id, first.harness_run_id);
  assert.equal((await service.listHarnessRuns(PROJECT_ID, WORK_ORDER_ID)).length, 1);

  await assertRejectsWithCode(
    () => service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
      idempotency_key: 'work_order_attempt_001',
      external_job_ref: ref('experiment_foundation_run', 'drifted_run_001'),
      external_job_hash: 'drifted_run_hash_001',
    }),
    'VERSION_CONFLICT',
  );
});

test('trusted final run evidence requires target-specific run evidence trace manifest', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      work_order_id: WORK_ORDER_ID,
      external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
      external_job_hash: 'experiment_run_hash_001',
      monitor_event_kind: 'failed',
      run_status: 'failed',
      failure_summary: 'The final callback did not predeclare evidence identity.',
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      work_order_id: WORK_ORDER_ID,
      run_evidence_unit_id: RUN_EVIDENCE_ID,
      external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
      external_job_hash: 'experiment_run_hash_001',
      monitor_event_kind: 'failed',
      run_status: 'failed',
      failure_summary: 'The final callback did not include the evidence trace.',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('negative final run keeps process completion separate from scientific outcome', async () => {
  const { service, workOrderRepository, traceRepository } = await makeHarness();
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_run_evidence_negative', 'run_evidence_unit', 'run_evidence_unit_negative'),
    [],
  );
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });

  const response = await service.recordRunMonitorIntake(PROJECT_ID, {
    work_order_id: WORK_ORDER_ID,
    run_evidence_unit_id: 'run_evidence_unit_negative',
    run_evidence_trace_manifest_id: 'trace_manifest_run_evidence_negative',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    monitor_event_kind: 'failed',
    run_status: 'negative',
    failure_summary: 'The controlled run completed with a negative scientific outcome.',
  });

  assert.equal(response.run_evidence_unit?.run_status, 'negative');
  assert.equal((await workOrderRepository.findWorkOrderById(PROJECT_ID, WORK_ORDER_ID))?.work_order_status, 'completed');
});

test('marks monitor intake without work_order_id untrusted and does not create run evidence', async () => {
  const { service } = await makeHarness();
  const response = await service.recordRunMonitorIntake(PROJECT_ID, {
    external_job_ref: ref('experiment_foundation_run', 'orphan_run_001'),
    external_job_hash: 'orphan_run_hash_001',
    monitor_event_kind: 'result_available',
    run_status: 'succeeded',
    result_ref: ref('experiment_result', 'result_001'),
    result_hash: 'result_hash_001',
    result_validation_report_ref: ref('result_validation_report', 'report_001'),
    result_validation_report_hash: 'report_hash_001',
  });
  assert.equal(response.monitor_intake.trust_status, 'untrusted');
  assert.equal(response.run_evidence_unit, null);
  assert.equal((await service.listRunEvidenceUnits(PROJECT_ID)).length, 0);
});

test('successful trusted run evidence requires result and validation report refs', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      work_order_id: WORK_ORDER_ID,
      external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
      external_job_hash: 'experiment_run_hash_001',
      monitor_event_kind: 'result_available',
      run_status: 'succeeded',
      result_ref: ref('experiment_result', 'result_001'),
      result_hash: 'result_hash_001',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('trusted monitor intake requires a submitted harness run', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      work_order_id: WORK_ORDER_ID,
      external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
      external_job_hash: 'experiment_run_hash_001',
      monitor_event_kind: 'failed',
      run_status: 'failed',
      failure_summary: 'The callback arrived before harness submission.',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('trusted monitor intake rejects mismatched external job identity', async () => {
  const { service } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  await service.submitHarnessRun(PROJECT_ID, WORK_ORDER_ID, {
    idempotency_key: 'work_order_attempt_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
  });

  await assertRejectsWithCode(
    () => service.recordRunMonitorIntake(PROJECT_ID, {
      work_order_id: WORK_ORDER_ID,
      external_job_ref: ref('experiment_foundation_run', 'different_run_001'),
      external_job_hash: 'different_hash_001',
      monitor_event_kind: 'failed',
      run_status: 'failed',
      failure_summary: 'The callback points at the wrong external job.',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('work order admission rejects unresolvable or non-passed admission gate results', async () => {
  const { service, traceRepository } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());

  await assertRejectsWithCode(
    () => service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
      admission_gate_result_id: 'work_order_gate_result_missing',
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  await traceRepository.createTraceGateResult({
    gate_result_id: 'work_order_gate_result_blocked',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: 'trace_manifest_work_order_001',
    gate_status: 'blocked',
    trace_status: 'broken',
    blocker_codes: ['trace_manifest_missing'],
    repair_queue_item_refs: [],
    created_at: NOW,
  });
  await assertRejectsWithCode(
    () => service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
      admission_gate_result_id: 'work_order_gate_result_blocked',
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const admitted = await service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
    admission_gate_result_id: 'work_order_gate_result_001',
  });
  assert.equal(admitted.work_order_status, 'admitted');
});

test('work order admission rejects gate results targeting a different trace manifest', async () => {
  const { service, traceRepository } = await makeHarness();
  await service.createResearchWorkOrderDraft(PROJECT_ID, workOrderRequest());
  await traceRepository.createTraceGateResult({
    gate_result_id: 'work_order_gate_result_other_manifest',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: 'trace_manifest_run_evidence_001',
    gate_status: 'passed',
    trace_status: 'complete',
    blocker_codes: [],
    repair_queue_item_refs: [],
    created_at: NOW,
  });
  await assertRejectsWithCode(
    () => service.admitResearchWorkOrder(PROJECT_ID, WORK_ORDER_ID, {
      admission_gate_result_id: 'work_order_gate_result_other_manifest',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});
