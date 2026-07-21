import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
  RecordImplementationFeedbackEventRequest,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  CoreMotiveDraftResponse,
  CoreMotiveVersionState,
  MotiveEvidenceBoardVersion,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationMotiveRepository } from '../repositories/in-memory-paper-implementation-motive-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import { seedAcceptedProposalFixture } from './paper-implementation-acceptance-bridge-test-fixtures.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationValidationCyclePlanningService } from './paper-implementation-validation-cycle-planning-service.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';
const MOTIVE_ID = 'core_motive_001';
const VERSION_ID = 'core_motive_version_001';
const ASSERTION_ID = 'motive_assertion_001';
const BOARD_ID = 'motive_evidence_board_version_001';

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
    return implementationProjectId === this.project.implementation_project_id
      ? structuredClone(this.project)
      : null;
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

class RecordingFeedbackRecorder {
  requests: RecordImplementationFeedbackEventRequest[] = [];

  async recordFeedbackEvent(
    implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse> {
    assert.equal(implementationProjectId, PROJECT_ID);
    this.requests.push(structuredClone(request));
    return {
      feedback_event: {
        feedback_event_id: `feedback_event_${this.requests.length}`,
        implementation_project_id: PROJECT_ID,
        intake_snapshot_id: 'intake_snapshot_001',
        paper_project_bridge_id: 'paper_project_bridge_001',
        feedback_type: request.feedback_type,
        severity: request.severity,
        summary: request.summary,
        source_object_refs: request.source_object_refs ?? [],
        evidence_refs: request.evidence_refs ?? [],
        run_refs: request.run_refs ?? [],
        recommended_upstream_action: request.recommended_upstream_action ?? 'recheck_topic_selection',
        feedback_status: 'recorded',
        downstream_topic_feedback_ref: null,
        downstream_recheck_request: null,
        downstream_impact_summary: null,
        artifact_refs: [],
        payload: request.feedback_payload ?? {},
        policy_version_id: null,
        created_by: request.created_by ?? 'system',
        created_at: NOW,
      },
      downstream_topic_feedback: null,
    };
  }
}

function traceManifest(
  traceManifestId: string,
  targetRefType: string,
  targetRefId: string,
  traceStatus: TraceManifest['trace_status'] = 'complete',
): TraceManifest {
  const missingRefs = traceStatus === 'complete' ? [] : [ref('source_locator', 'missing_locator_001')];
  return {
    trace_manifest_id: traceManifestId,
    implementation_project_id: PROJECT_ID,
    target_ref: ref(targetRefType, targetRefId),
    lineage: emptyLineage(),
    integrity: {
      missing_refs: missingRefs,
      broken_refs: [],
      stale_refs: [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: traceStatus,
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: missingRefs.length,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace_policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

type SeedOptions = {
  activeMotiveCount?: number;
  primaryMotiveIds?: string[];
  currentBoardVersionId?: string | null;
};

async function makeHarness(seedOptions: SeedOptions = {}) {
  const projectRepository = new StaticProjectRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const feedbackRecorder = new RecordingFeedbackRecorder();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: new InMemoryPaperImplementationRuntimeRepository(),
    now: () => NOW,
  });
  const service = new PaperImplementationValidationCyclePlanningService({
    projectRepository,
    motiveRepository,
    traceRepository,
    validationRepository,
    feedbackRecorder,
    runtimeAdmission,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  await seedMotiveAndBoard(motiveRepository, traceRepository, seedOptions);
  return {
    service,
    traceRepository,
    validationRepository,
    feedbackRecorder,
    runtimeAdmission,
  };
}

async function seedMotiveAndBoard(
  motiveRepository: InMemoryPaperImplementationMotiveRepository,
  traceRepository: InMemoryPaperImplementationTraceRepository,
  options: SeedOptions = {},
) {
  await traceRepository.createTraceManifest(traceManifest('trace_manifest_core', 'core_motive_version', VERSION_ID), []);
  await traceRepository.createTraceManifest(traceManifest('trace_manifest_board', 'motive_evidence_board_version', BOARD_ID), []);

  const versionState: CoreMotiveVersionState = {
    motive_version_state_id: 'motive_version_state_001',
    implementation_project_id: PROJECT_ID,
    motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID,
    review_status: 'reviewed',
    freshness_status: 'fresh',
    maturity_level: 'L1_evidence_backed',
    board_readiness_status: 'evidence_ready',
    evidence_status: 'weak',
    feasibility_status: 'not_checked',
    result_status: 'no_results',
    current_board_version_id: options.currentBoardVersionId === undefined
      ? BOARD_ID
      : options.currentBoardVersionId,
    latest_validation_cycle_id: null,
    latest_evolution_decision_id: null,
    blocker_refs: [],
    accepted_risk_refs: [],
    updated_at: NOW,
  };
  const draft: CoreMotiveDraftResponse = {
    motive_identity: {
      motive_id: MOTIVE_ID,
      implementation_project_id: PROJECT_ID,
      current_version_id: VERSION_ID,
      origin: {
        source_topic_package_id: 'topic_package_001',
        source_validated_need_ids: [],
        source_topic_question_contract_id: 'topic_question_contract_001',
        created_from_motive_ids: [],
      },
      portfolio_role: {
        role: 'primary',
        role_since: NOW,
        role_decision_ref: ref('motive_portfolio_decision', 'motive_portfolio_decision_001'),
      },
      lifecycle_status: 'active',
      lineage: {
        merged_into_motive_id: null,
        split_into_motive_ids: [],
        superseded_by_motive_id: null,
        parent_motive_ids: [],
        child_motive_ids: [],
      },
      control: {
        owner: null,
        human_confirmation_required_for_major_change: true,
      },
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
    },
    motive_set: {
      motive_set_id: 'core_motive_set_001',
      implementation_project_id: PROJECT_ID,
      active_motive_ids: [MOTIVE_ID],
      primary_motive_ids: options.primaryMotiveIds ?? [MOTIVE_ID],
      secondary_motive_ids: [],
      fallback_motive_ids: [],
      supporting_motive_ids: [],
      parked_motive_ids: [],
      abandoned_motive_ids: [],
      active_motive_count: options.activeMotiveCount ?? 1,
      max_active_motives: 3,
      max_primary_motives: 1,
      max_parallel_routes: 2,
      latest_portfolio_decision_id: 'motive_portfolio_decision_001',
      policy_version_id: 'policy_v1',
      created_at: NOW,
      updated_at: NOW,
    },
    core_motive_version: {
      core_motive_version_id: VERSION_ID,
      motive_id: MOTIVE_ID,
      implementation_project_id: PROJECT_ID,
      version_number: 1,
      version_status: 'admitted',
      version_origin: {
        created_by_decision_id: null,
        previous_version_id: null,
        derived_from_motive_version_ids: [],
        derivation_type: 'initial',
      },
      motive_contract: {
        short_name: 'Evidence synthesis failure',
        motivation_claim: 'Synthesis conflates adjacent claims.',
        problem_pressure: 'False gap detection hurts planning.',
        current_solution_insufficiency: 'Retrieval-only methods miss synthesis errors.',
        unmet_or_failure_mechanism: 'Claim boundaries collapse during synthesis.',
        target_setting: 'CS paper evidence synthesis.',
        expected_contribution_path: 'Expose and reduce synthesis claim conflation.',
        why_this_is_not_trivial: 'The failure emerges after retrieval.',
        why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance.',
        what_makes_this_researchable_now: 'Evidence locator substrate exists.',
      },
      scope_contract: {
        included_scope: ['CS synthesis'],
        excluded_scope: ['general QA'],
        non_goals: ['claim universal reliability'],
      },
      boundary_to_upstream: {
        topic_question_contract_id: 'topic_question_contract_001',
        research_slice_id: 'research_slice_001',
        within_upstream_boundary: true,
        boundary_risk_notes: [],
        upstream_recheck_required: false,
      },
      falsification_contract: {
        invalidation_conditions: ['No conflation under controlled synthesis.'],
        weakening_conditions: ['Only rare harmless conflation.'],
        minimum_evidence_to_continue: ['One scoped signal.'],
        decisive_negative_conditions: ['Retrieval explains all errors.'],
      },
      claim_boundary: {
        maximum_allowed_claim: 'Scoped reduction in claim conflation.',
        minimum_defensible_contribution_claim: 'Measurable synthesis failure mode.',
        forbidden_overclaims: ['Do not claim general RAG reliability.'],
        claim_types_allowed: ['analysis_claim'],
      },
      route_interface: {
        plausible_route_families: ['probe'],
        disallowed_route_families: [],
        required_route_properties: ['local'],
        cheapest_validation_route_hint: 'manual probe',
      },
      source_refs: [ref('topic_package', 'topic_package_001')],
      source_result_packet_refs: [],
      source_human_judgment_refs: [],
      trace_manifest_ref: ref('trace_manifest', 'trace_manifest_core'),
      trace_manifest_id: 'trace_manifest_core',
      admission_gate_result_id: 'gate_result_001',
      evolution_decision_id: null,
      hypothesis_only: false,
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      admitted_at: NOW,
    },
    motive_version_state: versionState,
    assertions: [
      {
        assertion_id: ASSERTION_ID,
        implementation_project_id: PROJECT_ID,
        motive_id: MOTIVE_ID,
        core_motive_version_id: VERSION_ID,
        assertion_type: 'failure_mechanism',
        assertion_text: 'Claim boundaries collapse during synthesis.',
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
          what_would_contradict_this: ['No collapse occurs.'],
          what_would_weaken_this: ['Collapse is rare.'],
        },
        status: 'supported',
        created_by: 'system',
        created_at: NOW,
      },
    ],
  };
  await motiveRepository.createCoreMotiveDraft(draft);
  const board: MotiveEvidenceBoardVersion = {
    board_version_id: BOARD_ID,
    implementation_project_id: PROJECT_ID,
    motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID,
    assertion_refs: [ref('motive_assertion', ASSERTION_ID)],
    evidence_binding_refs: [ref('evidence_binding', 'evidence_binding_001')],
    board_summary: {
      current_support_summary: 'Weak support exists.',
      current_challenge_summary: 'No blocking challenge.',
      unresolved_conflicts: [],
      board_gap_summary: 'Route is not planned yet.',
      next_evidence_needed: ['Feasibility route.'],
    },
    board_state: {
      readiness_status: 'evidence_ready',
      blocker_status: 'none',
      freshness_status: 'fresh',
      support_state: 'weak',
      challenge_status: 'none',
      accepted_risk_refs: [],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_board'),
    trace_manifest_id: 'trace_manifest_board',
    created_by: 'system',
    created_at: NOW,
  };
  await motiveRepository.createMotiveEvidenceBoardVersion({
    board_version: board,
    evidence_bindings: [],
    motive_version_state: versionState,
  });
}

function validDraftPayload(validationCycleId = 'validation_cycle_001') {
  return {
    validation_cycle_id: validationCycleId,
    target: {
      target_type: 'core_motive_version' as const,
      target_id: VERSION_ID,
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'board_gap' as const,
      trigger_refs: [ref('motive_evidence_board_version', BOARD_ID)],
    },
    cycle_type: 'route_feasibility' as const,
    validation_frame: {
      validation_question: 'Can the cheapest route answer the failure mechanism assertion?',
      assumptions_under_test: ['The route can isolate synthesis failures.'],
      assertions_under_test: [ref('motive_assertion', ASSERTION_ID)],
      decision_if_pass: 'Create work-order-ready route input.',
      decision_if_fail: 'Emit feedback or park motive.',
      decision_if_inconclusive: 'Narrow the probe.',
      expected_information_gain: 'medium' as const,
      why_this_cycle_now: 'The evidence board has a route gap.',
    },
    context: {
      included_refs: {
        motive_version_refs: [ref('core_motive_version', VERSION_ID, '1')],
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
      stop_conditions: ['Stop after one failed data check.'],
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

async function assertRejectsWithCode(
  promise: Promise<unknown>,
  errorCode: string,
) {
  await assert.rejects(
    promise,
    (error) => error instanceof AppError && error.errorCode === errorCode,
  );
}

test('validation cycle draft from admitted motive and trace-ready board succeeds', async () => {
  const { service } = await makeHarness();
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload());
  assert.equal(cycle.lifecycle_status, 'proposed');
  assert.equal(cycle.context.included_refs.board_version_refs[0].ref_id, BOARD_ID);
  assert.equal(cycle.input_snapshot_id, 'validation_input_snapshot_001');
});

test('validation cycle draft backfills current trace-ready board when context omits board refs', async () => {
  const { service } = await makeHarness();
  const { context: _context, ...payloadWithoutContext } = validDraftPayload();
  void _context;
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, payloadWithoutContext);
  assert.equal(cycle.context.included_refs.board_version_refs.length, 1);
  assert.equal(cycle.context.included_refs.board_version_refs[0].ref_type, 'motive_evidence_board_version');
  assert.equal(cycle.context.included_refs.board_version_refs[0].ref_id, BOARD_ID);
});

test('validation cycle draft blocks when no current trace-ready board exists', async () => {
  const { service } = await makeHarness({ currentBoardVersionId: null });
  const { context: _context, ...payloadWithoutContext } = validDraftPayload();
  void _context;
  await assertRejectsWithCode(
    service.createValidationCycleDraft(PROJECT_ID, payloadWithoutContext),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('expected information gain none blocks without human-confirmed override', async () => {
  const { service } = await makeHarness();
  await assertRejectsWithCode(
    service.createValidationCycleDraft(PROJECT_ID, {
      ...validDraftPayload(),
      validation_frame: {
        ...validDraftPayload().validation_frame,
        expected_information_gain: 'none',
      },
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('portfolio constraint drift blocks validation cycle draft creation', async () => {
  const { service } = await makeHarness({ activeMotiveCount: 4 });
  await assertRejectsWithCode(
    service.createValidationCycleDraft(PROJECT_ID, validDraftPayload()),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('admission requires complete validation-cycle trace manifest', async () => {
  const { service, traceRepository } = await makeHarness();
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload());
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_validation_broken', 'validation_cycle', cycle.validation_cycle_id, 'broken'),
    [],
  );
  await assertRejectsWithCode(
    service.admitValidationCycle(PROJECT_ID, cycle.validation_cycle_id, {
      trace_manifest_id: 'trace_manifest_validation_broken',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('admitted validation cycle stores trace_manifest_ref as TraceManifest authority ref', async () => {
  const { service, traceRepository } = await makeHarness();
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload());
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_validation', 'validation_cycle', cycle.validation_cycle_id),
    [],
  );
  const admitted = await service.admitValidationCycle(PROJECT_ID, cycle.validation_cycle_id, {
    trace_manifest_id: 'trace_manifest_validation',
  });
  assert.equal(admitted.trace_manifest_id, 'trace_manifest_validation');
  assert.equal(admitted.trace_manifest_ref?.ref_type, 'trace_manifest');
  assert.equal(admitted.trace_manifest_ref?.ref_id, 'trace_manifest_validation');
});

test('route and plan handoff refs point to TraceManifest and keep cycle/motive ownership aligned', async () => {
  const { service, traceRepository } = await makeHarness();
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload());
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_route', 'technical_route_candidate', 'technical_route_candidate_001'),
    [],
  );
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_plan', 'experiment_plan_light', 'experiment_plan_light_001'),
    [],
  );
  const route = await service.createTechnicalRouteCandidate(PROJECT_ID, {
    route_candidate_id: 'technical_route_candidate_001',
    validation_cycle_id: cycle.validation_cycle_id,
    core_motive_version_id: VERSION_ID,
    route_summary: 'Use a low-cost route.',
    expected_information_gain: 'medium',
    primary_metric_refs: [ref('metric', 'metric_001')],
    trace_manifest_id: 'trace_manifest_route',
  });
  assert.equal(route.motive_id, MOTIVE_ID);
  assert.equal(route.trace_manifest_ref.ref_type, 'trace_manifest');
  assert.equal(route.trace_manifest_ref.ref_id, 'trace_manifest_route');

  const plan = await service.createExperimentPlanLight(PROJECT_ID, {
    experiment_plan_light_id: 'experiment_plan_light_001',
    route_candidate_id: route.route_candidate_id,
    run_mode: 'dry_run',
    plan_summary: 'Run a local dry-run plan.',
    estimated_cost_class: 'low',
    baseline_gap_status: 'not_applicable',
    primary_metric_refs: [ref('metric', 'metric_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    budget_id: 'validation_budget_001',
    stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
    trace_manifest_id: 'trace_manifest_plan',
  });
  assert.equal(plan.validation_cycle_id, cycle.validation_cycle_id);
  assert.equal(plan.trace_manifest_ref.ref_type, 'trace_manifest');
  assert.equal(plan.trace_manifest_ref.ref_id, 'trace_manifest_plan');
});

test('route and plan creation block ownership drift', async () => {
  const { service, traceRepository } = await makeHarness();
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_route', 'technical_route_candidate', 'technical_route_candidate_001'),
    [],
  );
  await assertRejectsWithCode(
    service.createTechnicalRouteCandidate(PROJECT_ID, {
      route_candidate_id: 'technical_route_candidate_001',
      motive_id: 'other_motive',
      core_motive_version_id: VERSION_ID,
      route_summary: 'Use a mismatched route.',
      expected_information_gain: 'medium',
      primary_metric_refs: [ref('metric', 'metric_001')],
      trace_manifest_id: 'trace_manifest_route',
    }),
    'GATE_CONSTRAINT_FAILED',
  );

  const firstCycle = await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload('validation_cycle_001'));
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_route_valid', 'technical_route_candidate', 'technical_route_candidate_002'),
    [],
  );
  const route = await service.createTechnicalRouteCandidate(PROJECT_ID, {
    route_candidate_id: 'technical_route_candidate_002',
    validation_cycle_id: firstCycle.validation_cycle_id,
    core_motive_version_id: VERSION_ID,
    route_summary: 'Use a scoped route.',
    expected_information_gain: 'medium',
    primary_metric_refs: [ref('metric', 'metric_001')],
    trace_manifest_id: 'trace_manifest_route_valid',
  });
  await service.createValidationCycleDraft(PROJECT_ID, validDraftPayload('validation_cycle_002'));
  await assertRejectsWithCode(
    service.createExperimentPlanLight(PROJECT_ID, {
      experiment_plan_light_id: 'experiment_plan_light_drift',
      validation_cycle_id: 'validation_cycle_002',
      route_candidate_id: route.route_candidate_id,
      run_mode: 'dry_run',
      plan_summary: 'Attempt a cross-cycle plan.',
      estimated_cost_class: 'low',
      baseline_gap_status: 'not_applicable',
      primary_metric_refs: [ref('metric', 'metric_001')],
      dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
      code_version_refs: [ref('code_version', 'code_version_001')],
      config_refs: [ref('config', 'config_001')],
      budget_id: 'validation_budget_001',
      stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
      trace_manifest_id: 'trace_manifest_unused',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('feasibility probe creation with admitted proposal lineage is readable back', async () => {
  const { service, traceRepository, validationRepository, runtimeAdmission } = await makeHarness();
  const proposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'feasibility_planning',
    runtimeArtifactId: 'runtime_artifact_feasibility_planning_001',
  });
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_probe', 'feasibility_probe', 'feasibility_probe_001'),
    [],
  );

  const probe = await service.createFeasibilityProbe(PROJECT_ID, {
    probe_id: 'feasibility_probe_001',
    probe_kind: 'data_feasibility',
    probe_question: 'Is the scoped dataset locally available?',
    expected_information_gain: 'medium',
    primary_metric_refs: [ref('metric', 'metric_001')],
    trace_manifest_id: 'trace_manifest_probe',
    source_proposal_artifact_ref: proposal.sourceProposalArtifactRef,
    source_proposal_artifact_hash: proposal.sourceProposalArtifactHash,
  });
  assert.deepEqual(probe.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(probe.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);

  const readBack = await validationRepository.findFeasibilityProbeById(PROJECT_ID, 'feasibility_probe_001');
  assert.deepEqual(readBack?.source_proposal_artifact_ref, proposal.sourceProposalArtifactRef);
  assert.equal(readBack?.source_proposal_artifact_hash, proposal.sourceProposalArtifactHash);
});

test('feasibility probe and route lineage drift is rejected before authority writes', async () => {
  const { service, traceRepository, validationRepository, runtimeAdmission } = await makeHarness();
  const feasibilityProposal = await seedAcceptedProposalFixture({
    admissionService: runtimeAdmission,
    implementationProjectId: PROJECT_ID,
    workflowType: 'feasibility_planning',
    runtimeArtifactId: 'runtime_artifact_feasibility_planning_001',
  });
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_probe', 'feasibility_probe', 'feasibility_probe_001'),
    [],
  );

  await assertRejectsWithCode(
    service.createFeasibilityProbe(PROJECT_ID, {
      probe_id: 'feasibility_probe_001',
      probe_kind: 'data_feasibility',
      probe_question: 'Is the scoped dataset locally available?',
      expected_information_gain: 'medium',
      primary_metric_refs: [ref('metric', 'metric_001')],
      trace_manifest_id: 'trace_manifest_probe',
      source_proposal_artifact_ref: feasibilityProposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: 'a'.repeat(64),
    }),
    'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(await validationRepository.findFeasibilityProbeById(PROJECT_ID, 'feasibility_probe_001'), null);

  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_route_lineage', 'technical_route_candidate', 'technical_route_candidate_lineage'),
    [],
  );
  await assertRejectsWithCode(
    service.createTechnicalRouteCandidate(PROJECT_ID, {
      route_candidate_id: 'technical_route_candidate_lineage',
      core_motive_version_id: VERSION_ID,
      route_summary: 'Route seeded from a feasibility proposal must be rejected.',
      expected_information_gain: 'medium',
      primary_metric_refs: [ref('metric', 'metric_001')],
      trace_manifest_id: 'trace_manifest_route_lineage',
      source_proposal_artifact_ref: feasibilityProposal.sourceProposalArtifactRef,
      source_proposal_artifact_hash: feasibilityProposal.sourceProposalArtifactHash,
    }),
    'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(
    await validationRepository.findTechnicalRouteCandidateById(PROJECT_ID, 'technical_route_candidate_lineage'),
    null,
  );
});

test('expensive or confirmatory plan with open baseline gap blocks admission', async () => {
  const { service, traceRepository } = await makeHarness();
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_plan', 'experiment_plan_light', 'experiment_plan_light_001'),
    [],
  );
  await service.createExperimentPlanLight(PROJECT_ID, {
    experiment_plan_light_id: 'experiment_plan_light_001',
    run_mode: 'confirmatory',
    plan_summary: 'Run confirmatory evaluation.',
    estimated_cost_class: 'high',
    baseline_gap_status: 'open',
    primary_metric_refs: [ref('metric', 'metric_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    budget_id: 'validation_budget_001',
    stop_condition_refs: [ref('stop_rule', 'stop_rule_001')],
    trace_manifest_id: 'trace_manifest_plan',
  });
  const cycle = await service.createValidationCycleDraft(PROJECT_ID, {
    ...validDraftPayload(),
    context: {
      ...validDraftPayload().context,
      included_refs: {
        ...validDraftPayload().context.included_refs,
        experiment_plan_light_refs: [ref('experiment_plan_light', 'experiment_plan_light_001')],
      },
    },
  });
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_validation', 'validation_cycle', cycle.validation_cycle_id),
    [],
  );
  await assertRejectsWithCode(
    service.admitValidationCycle(PROJECT_ID, cycle.validation_cycle_id, {
      trace_manifest_id: 'trace_manifest_validation',
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
    }),
    'GATE_CONSTRAINT_FAILED',
  );
});

test('legacy completion is closed below HTTP while historical completed-cycle reads are preserved', async () => {
  const { service, traceRepository, validationRepository } = await makeHarness();
  const cycle = await service.createValidationCycleDraft(
    PROJECT_ID,
    validDraftPayload('validation_cycle_legacy_completion_closed'),
  );
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_legacy_completion_closed', 'validation_cycle', cycle.validation_cycle_id),
    [],
  );
  const admitted = await service.admitValidationCycle(PROJECT_ID, cycle.validation_cycle_id, {
    trace_manifest_id: 'trace_manifest_legacy_completion_closed',
  });
  await assert.rejects(
    service.completeValidationCycle(PROJECT_ID, cycle.validation_cycle_id, {}),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED'
      && error.message.includes('v2 closure lane'),
  );
  assert.deepEqual(await service.getValidationCycle(PROJECT_ID, cycle.validation_cycle_id), admitted);

  const historical = await validationRepository.updateValidationCycle({
    ...admitted,
    lifecycle_status: 'completed',
    execution_status: 'completed',
    cycle_assessment: {
      outcome: 'inconclusive',
      information_gain_realized: 'low',
      residual_uncertainties: ['Historical uncertainty remains queryable.'],
      recommended_next_action: 'Preserve the historical read shape.',
      rationale: 'This row predates the v2 closure cutover.',
    },
    decision_exit: 'historical-exit',
    completed_at: NOW,
  });
  assert.deepEqual(await service.getValidationCycle(PROJECT_ID, cycle.validation_cycle_id), historical);
  assert.deepEqual(await service.listValidationCycles(PROJECT_ID), [historical]);
  assert.deepEqual(await service.listValidationPlanningReviewItems(PROJECT_ID), []);
});

test('upstream feedback candidate dispatch is explicit and uses implementation feedback event service', async () => {
  const { service, feedbackRecorder } = await makeHarness();
  const candidate = await service.createValidationUpstreamFeedbackCandidate(PROJECT_ID, {
    source_object_refs: [ref('validation_cycle', 'validation_cycle_001')],
    feedback_type: 'infeasible_route',
    severity: 'blocking',
    summary: 'The route is infeasible under the admitted constraints.',
  });
  assert.equal(candidate.candidate_status, 'candidate');
  assert.equal(feedbackRecorder.requests.length, 0);

  const dispatched = await service.dispatchValidationUpstreamFeedbackCandidate(
    PROJECT_ID,
    candidate.candidate_id,
    { created_by: 'system' },
  );
  assert.equal(dispatched.feedback_candidate.candidate_status, 'dispatched');
  assert.equal(dispatched.feedback_dispatch.feedback_event.feedback_type, 'infeasible_route');
  assert.equal(feedbackRecorder.requests.length, 1);
});
