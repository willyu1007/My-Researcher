import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  ExperimentPlanLight,
  FeasibilityProbe,
  TechnicalRouteCandidate,
  ValidationCycle,
  ValidationCycleInputSnapshot,
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import { PrismaPaperImplementationValidationRepository } from './prisma-paper-implementation-validation-repository.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

type StoredRow = Record<string, unknown> & { id: string };

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

function makeInputSnapshot(): ValidationCycleInputSnapshot {
  return {
    input_snapshot_id: 'validation_input_snapshot_001',
    implementation_project_id: PROJECT_ID,
    context_policy_version_id: 'context_policy_v1',
    included_refs: {
      motive_version_refs: [ref('core_motive_version', 'core_motive_version_001', '1')],
      board_version_refs: [ref('motive_evidence_board_version', 'board_001')],
      evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_001')],
      route_refs: [],
      work_order_refs: [],
      result_packet_refs: [],
      experiment_plan_light_refs: [],
    },
    excluded_context_notes: [],
    input_snapshot_hash: 'input_hash_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeCycle(): ValidationCycle {
  const inputSnapshot = makeInputSnapshot();
  return {
    validation_cycle_id: 'validation_cycle_001',
    implementation_project_id: PROJECT_ID,
    input_snapshot_id: inputSnapshot.input_snapshot_id,
    target: {
      target_type: 'core_motive_version',
      target_id: 'core_motive_version_001',
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'board_gap',
      trigger_refs: [ref('motive_evidence_board_version', 'board_001')],
    },
    cycle_type: 'route_feasibility',
    validation_frame: {
      validation_question: 'Can a low-cost route answer the assertion?',
      assumptions_under_test: ['Route can isolate the failure.'],
      assertions_under_test: [ref('motive_assertion', 'motive_assertion_001')],
      decision_if_pass: 'Create route candidate.',
      decision_if_fail: 'Emit feedback.',
      decision_if_inconclusive: 'Narrow the probe.',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'The board has a route gap.',
    },
    context: inputSnapshot,
    criteria: {
      pass_conditions: ['Route answers the assertion.'],
      fail_conditions: ['Route cannot answer.'],
      inconclusive_conditions: ['Ambiguous after probe.'],
      stop_conditions: ['Stop after one failed check.'],
      minimum_artifacts_required: ['Trace-ready memo.'],
    },
    budget: {
      budget_id: 'validation_budget_001',
      max_runtime: 'PT4H',
      max_compute: 'local_cpu',
      max_human_review_count: 1,
      retry_budget: 0,
    },
    lifecycle_status: 'proposed',
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
    trace_manifest_ref: null,
    trace_manifest_id: null,
    gate_result_id: null,
    decision_exit: null,
    confirmation_level: 'not_required',
    confirmed_by: null,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
    admitted_at: null,
    completed_at: null,
  };
}

function makeRoute(): TechnicalRouteCandidate {
  return {
    route_candidate_id: 'technical_route_candidate_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    motive_id: 'core_motive_001',
    core_motive_version_id: 'core_motive_version_001',
    route_summary: 'Use a low-cost route.',
    route_status: 'proposed',
    expected_information_gain: 'medium',
    baseline_gap_status: 'not_applicable',
    scope_boundary_ref: ref('scope_boundary', 'scope_boundary_001'),
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [],
    code_version_refs: [],
    config_refs: [],
    confirmatory_marker: false,
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_route_001'),
    trace_manifest_id: 'trace_manifest_route_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeProbe(): FeasibilityProbe {
  return {
    probe_id: 'feasibility_probe_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    probe_kind: 'data_feasibility',
    probe_question: 'Is the dataset available?',
    probe_status: 'proposed',
    expected_information_gain: 'low',
    baseline_gap_status: 'not_applicable',
    scope_boundary_ref: null,
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [],
    code_version_refs: [],
    config_refs: [],
    confirmatory_marker: false,
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_probe_001'),
    trace_manifest_id: 'trace_manifest_probe_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makePlan(): ExperimentPlanLight {
  return {
    experiment_plan_light_id: 'experiment_plan_light_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    route_candidate_id: 'technical_route_candidate_001',
    run_mode: 'confirmatory',
    plan_summary: 'Run the confirmatory plan.',
    estimated_cost_class: 'high',
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

function makeReviewItem(): ValidationPlanningReviewItem {
  return {
    review_item_id: 'validation_review_item_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    item_kind: 'loop_budget_review',
    status: 'open',
    severity: 'warning',
    blocker_code: 'REPEATED_LOW_INFORMATION_GAIN',
    summary: 'Loop budget review required.',
    source_refs: [ref('validation_cycle', 'validation_cycle_001')],
    created_at: NOW,
    resolved_at: null,
  };
}

function makeFeedbackCandidate(): ValidationUpstreamFeedbackCandidate {
  return {
    candidate_id: 'validation_feedback_candidate_001',
    implementation_project_id: PROJECT_ID,
    validation_cycle_id: 'validation_cycle_001',
    source_object_refs: [ref('validation_cycle', 'validation_cycle_001')],
    evidence_refs: [],
    feedback_type: 'infeasible_route',
    severity: 'blocking',
    summary: 'Route is infeasible.',
    recommended_upstream_action: 'recheck_topic_selection',
    candidate_status: 'candidate',
    feedback_event_ref: null,
    created_by: 'system',
    created_at: NOW,
    dispatched_at: null,
  };
}

function normalizeRow(row: StoredRow): StoredRow {
  const normalized: StoredRow = { ...row };
  for (const [key, value] of Object.entries(normalized)) {
    if ((key.endsWith('At') || key.endsWith('Since')) && typeof value === 'string') {
      normalized[key] = new Date(value);
    }
  }
  return normalized;
}

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      rows.push(normalizeRow(data));
      return rows.at(-1);
    },
    findFirst: async ({ where }: { where: Partial<StoredRow> }) =>
      rows.find((row) => matchesWhere(row, where)) ?? null,
    findMany: async ({ where, take }: { where?: Partial<StoredRow>; take?: number }) => {
      const matched = rows.filter((row) => matchesWhere(row, where ?? {}));
      return typeof take === 'number' ? matched.slice(0, take) : matched;
    },
    update: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
      const index = rows.findIndex((row) => matchesWhere(row, where));
      if (index < 0) {
        throw new Error('row not found');
      }
      rows[index] = normalizeRow({ ...rows[index], ...data });
      return rows[index];
    },
  };
}

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(): PrismaClient {
  const client = {
    paperImplementationValidationCycleInputSnapshot: makeModel([]),
    paperImplementationValidationCycle: makeModel([]),
    paperImplementationTechnicalRouteCandidate: makeModel([]),
    paperImplementationFeasibilityProbe: makeModel([]),
    paperImplementationExperimentPlanLight: makeModel([]),
    paperImplementationValidationPlanningReviewItem: makeModel([]),
    paperImplementationValidationUpstreamFeedbackCandidate: makeModel([]),
  };
  return {
    ...client,
    $transaction: async (input: Array<Promise<unknown>> | ((tx: typeof client) => Promise<unknown>)) => {
      if (Array.isArray(input)) {
        return Promise.all(input);
      }
      return input(client);
    },
  } as unknown as PrismaClient;
}

test('Prisma PaperImplementationValidation repository round-trips validation planning objects', async () => {
  const repository = new PrismaPaperImplementationValidationRepository(makeFakePrismaClient());
  const inputSnapshot = makeInputSnapshot();
  const cycle = makeCycle();
  await repository.createValidationCycleDraft({
    input_snapshot: inputSnapshot,
    validation_cycle: cycle,
  });
  assert.equal((await repository.findValidationCycleById(PROJECT_ID, cycle.validation_cycle_id))?.input_snapshot_id, inputSnapshot.input_snapshot_id);
  assert.equal((await repository.listValidationCycles(PROJECT_ID))[0]?.validation_frame.validation_question, cycle.validation_frame.validation_question);

  await repository.updateValidationCycle({
    ...cycle,
    lifecycle_status: 'completed',
    execution_status: 'completed',
    cycle_assessment: {
      outcome: 'inconclusive',
      information_gain_realized: 'low',
      residual_uncertainties: ['Still ambiguous.'],
      recommended_next_action: 'Review.',
      rationale: 'Low information gain.',
    },
  });
  assert.equal(
    (await repository.listRecentCompletedCyclesByTarget(PROJECT_ID, 'core_motive_version', 'core_motive_version_001', 1))[0]
      ?.cycle_assessment?.information_gain_realized,
    'low',
  );

  const route = await repository.createTechnicalRouteCandidate(makeRoute());
  assert.equal(route.primary_metric_refs[0]?.ref_id, 'metric_001');
  assert.equal(
    (await repository.findTechnicalRouteCandidateById(PROJECT_ID, route.route_candidate_id))?.scope_boundary_ref?.ref_id,
    'scope_boundary_001',
  );

  const probe = await repository.createFeasibilityProbe(makeProbe());
  assert.equal((await repository.findFeasibilityProbeById(PROJECT_ID, probe.probe_id))?.probe_kind, 'data_feasibility');

  const plan = await repository.createExperimentPlanLight(makePlan());
  assert.equal((await repository.findExperimentPlanLightById(PROJECT_ID, plan.experiment_plan_light_id))?.run_mode, 'confirmatory');

  const reviewItem = await repository.createReviewItem(makeReviewItem());
  assert.equal((await repository.listReviewItems(PROJECT_ID))[0]?.review_item_id, reviewItem.review_item_id);

  const candidate = await repository.createFeedbackCandidate(makeFeedbackCandidate());
  assert.equal((await repository.findFeedbackCandidateById(PROJECT_ID, candidate.candidate_id))?.candidate_status, 'candidate');
  const dispatched = await repository.updateFeedbackCandidate({
    ...candidate,
    candidate_status: 'dispatched',
    feedback_event_ref: ref('implementation_feedback_event', 'feedback_event_001'),
    dispatched_at: NOW,
  });
  assert.equal(dispatched.feedback_event_ref?.ref_id, 'feedback_event_001');
});

test('Prisma PaperImplementationValidation repository maps ValidationCycle unique races to VERSION_CONFLICT', async () => {
  const race = new Prisma.PrismaClientKnownRequestError('simulated cycle race', {
    code: 'P2002',
    clientVersion: '5.22.0',
  });
  const client = {
    paperImplementationValidationCycleInputSnapshot: {
      create: async () => { throw race; },
    },
    paperImplementationValidationCycle: {
      create: async () => { throw race; },
    },
    $transaction: async (input: Array<Promise<unknown>>) => Promise.all(input),
  } as unknown as PrismaClient;
  const repository = new PrismaPaperImplementationValidationRepository(client);

  await assert.rejects(
    repository.createValidationCycleDraft({
      input_snapshot: makeInputSnapshot(),
      validation_cycle: makeCycle(),
    }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('validation migration declares queryable cycle route probe plan review and feedback indexes', async () => {
  const sql = await readFile(
    new URL('../../../../../prisma/migrations/20260521140000_add_paper_implementation_validation_cycle_planning/migration.sql', import.meta.url),
    'utf8',
  );
  for (const expected of [
    'pivc_input_snapshot_idx',
    'pivc_target_idx',
    'pivc_budget_idx',
    'pivc_info_gain_idx',
    'pivc_trace_manifest_idx',
    'pitrc_motive_version_idx',
    'pitrc_baseline_gap_idx',
    'pifp_kind_idx',
    'pifp_trace_manifest_idx',
    'piepl_run_mode_idx',
    'piepl_budget_idx',
    'piepl_trace_manifest_idx',
    'pivpri_kind_idx',
    'pivufc_feedback_type_idx',
    'pivufc_status_idx',
  ]) {
    assert.match(sql, new RegExp(expected));
  }
});
