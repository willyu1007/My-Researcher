import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES,
  TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS,
  type TopicSelectionOfflineEvaluationCaseRecord,
  type TopicSelectionOfflineEvaluationGoldExpectation,
  type TopicSelectionOfflineFrozenInputBundle,
  type TopicSelectionOfflineEvaluationMetricResultRecord,
  type TopicSelectionOfflineEvaluationObservedOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/in-memory-topic-selection-offline-evaluation-replay-repository.js';
import { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';

function makeContext() {
  let sequence = 0;
  const now = () => '2026-05-13T00:00:00.000Z';
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const repository = new InMemoryTopicSelectionOfflineEvaluationReplayRepository();
  const service = new TopicSelectionOfflineEvaluationReplayService(repository, { idFactory, now });
  return { repository, service };
}

async function createCompletedSyntheticRun() {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1aBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1a-frozen-fixture',
    workflow_profile_version: 'v1',
    model_profile_key: 'offline-fixture',
    search_profile_key: 'offline-fixture',
    policy_version_id: 'policy_v1',
  });

  for (const evaluationCase of cases) {
    await ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(evaluationCase),
    });
  }
  const completion = await ctx.service.completeRunAndCalculateMetrics({
    run_id: run.offline_evaluation_run_id,
  });
  return { ...ctx, dataset, cases, run: completion.run, metricResults: completion.metric_results };
}

async function createCompletedSyntheticV1bRun() {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1bBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
    workflow_profile_version: 'v1',
    model_profile_key: 'offline-fixture',
    search_profile_key: 'offline-fixture',
    policy_version_id: 'policy_v1b',
  });

  for (const evaluationCase of cases) {
    await ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(evaluationCase),
    });
  }
  const completion = await ctx.service.completeRunAndCalculateMetrics({
    run_id: run.offline_evaluation_run_id,
  });
  return { ...ctx, dataset, cases, run: completion.run, metricResults: completion.metric_results };
}

async function createCompletedSyntheticV1cRun() {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1cBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
    workflow_profile_version: 'v1',
    model_profile_key: 'offline-fixture',
    search_profile_key: 'offline-fixture',
    policy_version_id: 'policy_v1c',
  });

  for (const evaluationCase of cases) {
    await ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(evaluationCase),
    });
  }
  const completion = await ctx.service.completeRunAndCalculateMetrics({
    run_id: run.offline_evaluation_run_id,
  });
  return { ...ctx, dataset, cases, run: completion.run, metricResults: completion.metric_results };
}

function fixtureObservedOutput(
  evaluationCase: TopicSelectionOfflineEvaluationCaseRecord,
): TopicSelectionOfflineEvaluationObservedOutput {
  return evaluationCase.frozen_input_bundle.payload.fixture_observed_output as TopicSelectionOfflineEvaluationObservedOutput;
}

function metricByKey(
  metrics: TopicSelectionOfflineEvaluationMetricResultRecord[],
): Map<string, TopicSelectionOfflineEvaluationMetricResultRecord> {
  return new Map(metrics.map((record) => [record.metric_key, record]));
}

function minimalGoldExpectation(): TopicSelectionOfflineEvaluationGoldExpectation {
  return {
    expected_unmet_need: false,
    expected_key_evidence_refs: [],
    expected_counter_evidence_refs: [],
    expected_blocker_codes: [],
    required_trace_refs: [],
    expected_recheck_action_refs: [],
    expected_negative_memory_refs: [],
    expected_downstream_rework_causes: [],
    notes: [],
  };
}

function minimalFrozenBundle(stage: 'v1a' | 'v1b' | 'v1c'): TopicSelectionOfflineFrozenInputBundle {
  return {
    stage,
    frozen_at: '2026-05-13T00:00:00.000Z',
    source_refs: [],
    artifact_refs: [],
    stage_snapshots: {},
    payload: {},
  };
}

test('generic offline-evaluation owner refuses research-arena dataset creation', async () => {
  const { service } = makeContext();
  await assert.rejects(
    () => service.createDataset({
      dataset_key: 'forged-arena-dataset',
      stage: 'research_arena',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && /dedicated Arena calibration owner/u.test(error.message),
  );

  const arenaDataset = await service.createDatasetForStage({
    dataset_key: 'owner-bound-arena-dataset',
    stage: 'research_arena',
  }, 'research_arena');
  const ownerError = (error: unknown) => error instanceof AppError
    && error.statusCode === 400
    && /dedicated Arena calibration owner/u.test(error.message);
  await assert.rejects(
    () => service.addCase({
      dataset_id: arenaDataset.offline_evaluation_dataset_id,
      case_key: 'forged-generic-case',
      case_type: 'arena_advancing_case',
      frozen_input_bundle: {
        stage: 'research_arena',
        frozen_at: '2026-05-13T00:00:00.000Z',
        source_refs: [],
        artifact_refs: [],
        stage_snapshots: {},
        payload: {},
      },
      gold_expectation: minimalGoldExpectation(),
    }),
    ownerError,
  );
  await assert.rejects(
    () => service.startRun({
      dataset_id: arenaDataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'forged-generic-arena-run',
    }),
    ownerError,
  );
  const arenaRun = await service.startRunForStage({
    dataset_id: arenaDataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'owner-bound-arena-run',
  }, 'research_arena');
  await assert.rejects(
    () => service.recordFrozenCaseResult({
      run_id: arenaRun.offline_evaluation_run_id,
      case_id: 'forged-case',
      observed_output: {} as TopicSelectionOfflineEvaluationObservedOutput,
    }),
    ownerError,
  );
  await assert.rejects(
    () => service.completeRunAndCalculateMetrics({ run_id: arenaRun.offline_evaluation_run_id }),
    ownerError,
  );
});

test('synthetic baseline covers every required v1a offline evaluation case type', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1aBaselineDataset({ stage: 'v1b' });

  assert.equal(dataset.stage, 'v1a');
  assert.equal(dataset.case_count, TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES.length);
  assert.deepEqual(new Set(cases.map((record) => record.case_type)), new Set(TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES));
  assert.deepEqual(new Set(dataset.case_type_coverage), new Set(TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_CASE_TYPES));
  assert.equal(cases.every((record) => record.frozen_input_bundle.stage === 'v1a'), true);
  assert.equal(cases.every((record) => record.frozen_input_bundle.payload.fixture_observed_output), true);
});

test('synthetic baseline covers every required v1b offline evaluation case type', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1bBaselineDataset();

  assert.equal(dataset.stage, 'v1b');
  assert.equal(dataset.case_count, TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES.length);
  assert.deepEqual(new Set(cases.map((record) => record.case_type)), new Set(TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES));
  assert.deepEqual(new Set(dataset.case_type_coverage), new Set(TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_CASE_TYPES));
  assert.equal(cases.every((record) => record.frozen_input_bundle.stage === 'v1b'), true);
  assert.equal(cases.every((record) => record.frozen_input_bundle.payload.fixture_observed_output), true);
  assert.equal(TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES.includes('package_trace_gap'), true);
  assert.equal(TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS.includes('package_trace_completeness'), true);
});

test('synthetic baseline covers every required v1c offline evaluation case type', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1cBaselineDataset();

  assert.equal(dataset.stage, 'v1c');
  assert.equal(dataset.case_count, TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES.length);
  assert.deepEqual(new Set(cases.map((record) => record.case_type)), new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES));
  assert.deepEqual(new Set(dataset.case_type_coverage), new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_CASE_TYPES));
  assert.equal(cases.every((record) => record.frozen_input_bundle.stage === 'v1c'), true);
  assert.equal(cases.every((record) => record.frozen_input_bundle.payload.fixture_observed_output), true);
  assert.equal(cases.every((record) => record.frozen_input_bundle.stage_snapshots.promotion_input_snapshot), true);
  assert.equal(cases.every((record) => record.frozen_input_bundle.stage_snapshots.paper_project_bridge), true);
  assert.equal(TOPIC_SELECTION_OFFLINE_EVALUATION_CASE_TYPES.includes('promotion_false_pass'), true);
  assert.equal(TOPIC_SELECTION_OFFLINE_EVALUATION_METRIC_KEYS.includes('bridge_trace_completeness'), true);
});

test('offline replay rejects stage-incompatible case types, frozen bundles, and metric keys', async () => {
  const ctx = makeContext();
  const v1aDataset = await ctx.service.createDataset({
    dataset_key: 'manual-v1a-hardening',
    stage: 'v1a',
    status: 'active',
  });
  await assert.rejects(
    () => ctx.service.addCase({
      dataset_id: v1aDataset.offline_evaluation_dataset_id,
      case_key: 'v1c-case-type-on-v1a',
      case_type: 'promotion_false_pass',
      frozen_input_bundle: minimalFrozenBundle('v1a'),
      gold_expectation: minimalGoldExpectation(),
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Case type promotion_false_pass/.test(error.message),
  );

  const dataset = await ctx.service.createDataset({
    dataset_key: 'manual-v1b-hardening',
    stage: 'v1b',
    status: 'active',
  });

  await assert.rejects(
    () => ctx.service.addCase({
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: 'v1a-case-type',
      case_type: 'true_unmet_need',
      frozen_input_bundle: minimalFrozenBundle('v1b'),
      gold_expectation: minimalGoldExpectation(),
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Case type true_unmet_need/.test(error.message),
  );

  await assert.rejects(
    () => ctx.service.addCase({
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: 'wrong-frozen-stage',
      case_type: 'slice_boundary_drift',
      frozen_input_bundle: minimalFrozenBundle('v1a'),
      gold_expectation: minimalGoldExpectation(),
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /does not match dataset stage v1b/.test(error.message),
  );

  await assert.rejects(
    () => ctx.service.addCase({
      dataset_id: dataset.offline_evaluation_dataset_id,
      case_key: 'v1c-case-type-on-v1b',
      case_type: 'promotion_false_pass',
      frozen_input_bundle: minimalFrozenBundle('v1b'),
      gold_expectation: minimalGoldExpectation(),
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Case type promotion_false_pass/.test(error.message),
  );

  await assert.rejects(
    () => ctx.service.startRun({
      dataset_id: dataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1b-frozen-fixture',
      metric_keys: ['false_gap_rate'],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Metric keys are not compatible with v1b/.test(error.message),
  );

  const v1cDataset = await ctx.service.createDataset({
    dataset_key: 'manual-v1c-hardening',
    stage: 'v1c',
    status: 'active',
  });
  await assert.rejects(
    () => ctx.service.addCase({
      dataset_id: v1cDataset.offline_evaluation_dataset_id,
      case_key: 'wrong-v1c-case-type',
      case_type: 'package_trace_gap',
      frozen_input_bundle: minimalFrozenBundle('v1c'),
      gold_expectation: minimalGoldExpectation(),
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Case type package_trace_gap/.test(error.message),
  );
  await assert.rejects(
    () => ctx.service.startRun({
      dataset_id: v1cDataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
      metric_keys: ['false_gap_rate'],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Metric keys are not compatible with v1c/.test(error.message),
  );
  await assert.rejects(
    () => ctx.service.startRun({
      dataset_id: v1cDataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
      metric_keys: ['package_trace_completeness'],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /Metric keys are not compatible with v1c/.test(error.message),
  );
});

test('frozen replay records case results without production workflow or ValidatedNeed dependencies', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1aBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1a-frozen-fixture',
  });

  const first = cases.find((record) => record.case_type === 'true_unmet_need') as TopicSelectionOfflineEvaluationCaseRecord;
  const result = await ctx.service.recordFrozenCaseResult({
    run_id: run.offline_evaluation_run_id,
    case_id: first.offline_evaluation_case_id,
    observed_output: fixtureObservedOutput(first),
  });

  assert.equal(result.case_result.dataset_id, dataset.offline_evaluation_dataset_id);
  assert.equal(result.case_result.status, 'evaluated');
  assert.equal(result.case_result.observed_output.final_decision, 'validate');
  assert.equal(result.replay_diff.dataset_id, dataset.offline_evaluation_dataset_id);
  assert.equal(await ctx.repository.findDatasetById(dataset.offline_evaluation_dataset_id), dataset);
});

test('offline replay service remains isolated from live topic-selection write services', async () => {
  const serviceSource = await readFile(
    new URL('./topic-selection-offline-evaluation-replay-service.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(serviceSource, /topic-selection-need-validation-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-recheck-risk-memory-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-search-resource-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-control-plane-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1b-intake-constraint-profile-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1b-research-slice-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1b-topic-question-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1b-value-assessment-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1b-topic-package-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-promotion-input-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-promotion-gate-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-human-promotion-decision-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-paper-project-bridge-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-downstream-feedback-recheck-service/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-promotion-input-repository/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-promotion-gate-repository/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-human-promotion-decision-repository/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-paper-project-bridge-repository/);
  assert.doesNotMatch(serviceSource, /topic-selection-v1c-downstream-feedback-recheck-repository/);
});

test('offline replay runs deduplicate metric keys and reject empty metric sets', async () => {
  const ctx = makeContext();
  const { dataset } = await ctx.service.createSyntheticV1aBaselineDataset();

  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1a-frozen-fixture',
    metric_keys: ['false_gap_rate', 'false_gap_rate', 'trace_completeness'],
  });

  assert.deepEqual(run.metric_keys, ['false_gap_rate', 'trace_completeness']);
  await assert.rejects(
    () => ctx.service.startRun({
      dataset_id: dataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1a-frozen-fixture',
      metric_keys: [],
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('frozen replay rejects duplicate case results and cannot complete with missing case results', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1aBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1a-frozen-fixture',
  });
  const first = cases.find((record) => record.case_type === 'true_unmet_need') as TopicSelectionOfflineEvaluationCaseRecord;

  await ctx.service.recordFrozenCaseResult({
    run_id: run.offline_evaluation_run_id,
    case_id: first.offline_evaluation_case_id,
    observed_output: fixtureObservedOutput(first),
  });

  await assert.rejects(
    () => ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: first.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(first),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  await assert.rejects(
    () => ctx.service.completeRunAndCalculateMetrics({ run_id: run.offline_evaluation_run_id }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('completed replay runs reject late case results and metric completion is idempotent', async () => {
  const { run, cases, service, metricResults } = await createCompletedSyntheticRun();
  const first = cases.find((record) => record.case_type === 'true_unmet_need') as TopicSelectionOfflineEvaluationCaseRecord;

  await assert.rejects(
    () => service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: first.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(first),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  const secondCompletion = await service.completeRunAndCalculateMetrics({ run_id: run.offline_evaluation_run_id });
  assert.equal(secondCompletion.run.status, 'completed');
  assert.deepEqual(secondCompletion.metric_results, metricResults);
});

test('v1c replay keeps duplicate missing late-write and metric idempotency invariants', async () => {
  const ctx = makeContext();
  const { dataset, cases } = await ctx.service.createSyntheticV1cBaselineDataset();
  const run = await ctx.service.startRun({
    dataset_id: dataset.offline_evaluation_dataset_id,
    workflow_profile_key: 'topic-selection-v1c-frozen-fixture',
  });
  const first = cases[0] as TopicSelectionOfflineEvaluationCaseRecord;

  await ctx.service.recordFrozenCaseResult({
    run_id: run.offline_evaluation_run_id,
    case_id: first.offline_evaluation_case_id,
    observed_output: fixtureObservedOutput(first),
  });
  await assert.rejects(
    () => ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: first.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(first),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  await assert.rejects(
    () => ctx.service.completeRunAndCalculateMetrics({ run_id: run.offline_evaluation_run_id }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  for (const evaluationCase of cases.slice(1)) {
    await ctx.service.recordFrozenCaseResult({
      run_id: run.offline_evaluation_run_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(evaluationCase),
    });
  }
  const completion = await ctx.service.completeRunAndCalculateMetrics({ run_id: run.offline_evaluation_run_id });
  await assert.rejects(
    () => ctx.service.recordFrozenCaseResult({
      run_id: completion.run.offline_evaluation_run_id,
      case_id: first.offline_evaluation_case_id,
      observed_output: fixtureObservedOutput(first),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  const secondCompletion = await ctx.service.completeRunAndCalculateMetrics({
    run_id: completion.run.offline_evaluation_run_id,
  });
  assert.deepEqual(secondCompletion.metric_results, completion.metric_results);
});

test('metric calculation emits all minimum metrics with numerator, denominator, case refs, and notes', async () => {
  const { metricResults } = await createCompletedSyntheticRun();
  const byKey = metricByKey(metricResults);

  assert.deepEqual(new Set(byKey.keys()), new Set(TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS));
  for (const metricKey of TOPIC_SELECTION_V1A_OFFLINE_EVALUATION_METRIC_KEYS) {
    const metric = byKey.get(metricKey);
    assert.ok(metric, `missing metric ${metricKey}`);
    assert.equal(typeof metric.numerator, 'number');
    assert.equal(typeof metric.denominator, 'number');
    assert.equal(Array.isArray(metric.contributing_case_refs), true);
    assert.equal(Array.isArray(metric.failure_case_refs), true);
    assert.equal(metric.notes.length > 0, true);
  }

  assert.equal(byKey.get('false_gap_rate')?.numerator, 2);
  assert.equal(byKey.get('false_gap_rate')?.denominator, 7);
  assert.equal(byKey.get('baseline_miss_rate')?.numerator, 1);
  assert.equal(byKey.get('baseline_miss_rate')?.denominator, 1);
  assert.equal(byKey.get('counter_evidence_recall')?.numerator, 0);
  assert.equal(byKey.get('counter_evidence_recall')?.denominator, 3);
  assert.equal(byKey.get('trace_completeness')?.numerator, 8);
  assert.equal(byKey.get('trace_completeness')?.denominator, 9);
  assert.equal(byKey.get('readiness_false_pass_rate')?.numerator, 2);
  assert.equal(byKey.get('human_override_rate')?.numerator, 1);
  assert.equal(byKey.get('rerun_instability')?.numerator, 1);
  assert.equal(byKey.get('recheck_precision')?.numerator, 1);
  assert.equal(byKey.get('recheck_precision')?.denominator, 1);
});

test('v1b metric calculation emits boundary answerability value package and loopback baseline metrics', async () => {
  const { metricResults, run } = await createCompletedSyntheticV1bRun();
  const byKey = metricByKey(metricResults);

  assert.deepEqual(new Set(run.metric_keys), new Set(TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS));
  assert.deepEqual(new Set(byKey.keys()), new Set(TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS));
  for (const metricKey of TOPIC_SELECTION_V1B_OFFLINE_EVALUATION_METRIC_KEYS) {
    const metric = byKey.get(metricKey);
    assert.ok(metric, `missing metric ${metricKey}`);
    assert.equal(typeof metric.numerator, 'number');
    assert.equal(typeof metric.denominator, 'number');
    assert.equal(Array.isArray(metric.contributing_case_refs), true);
    assert.equal(Array.isArray(metric.failure_case_refs), true);
    assert.equal(metric.notes.length > 0, true);
  }

  assert.equal(byKey.get('slice_boundary_drift_rate')?.numerator, 1);
  assert.equal(byKey.get('slice_boundary_drift_rate')?.denominator, 6);
  assert.equal(byKey.get('answerability_false_pass_rate')?.numerator, 1);
  assert.equal(byKey.get('answerability_false_pass_rate')?.denominator, 1);
  assert.equal(byKey.get('value_overclaim_rate')?.numerator, 1);
  assert.equal(byKey.get('value_overclaim_rate')?.denominator, 6);
  assert.equal(byKey.get('package_trace_completeness')?.numerator, 11);
  assert.equal(byKey.get('package_trace_completeness')?.denominator, 12);
  assert.equal(byKey.get('package_readiness_false_pass_rate')?.numerator, 1);
  assert.equal(byKey.get('package_readiness_false_pass_rate')?.denominator, 3);
  assert.equal(byKey.get('downstream_loopback_cause_distribution')?.numerator, 0);
  assert.equal(byKey.get('downstream_loopback_cause_distribution')?.denominator, 1);
  assert.deepEqual(byKey.get('downstream_loopback_cause_distribution')?.metric_payload, {
    cause_distribution: {
      refine_slice: 1,
    },
  });
});

test('v1c metric calculation emits promotion bridge loopback and downstream guard baseline metrics', async () => {
  const { metricResults, run } = await createCompletedSyntheticV1cRun();
  const byKey = metricByKey(metricResults);

  assert.deepEqual(new Set(run.metric_keys), new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS));
  assert.deepEqual(new Set(byKey.keys()), new Set(TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS));
  for (const metricKey of TOPIC_SELECTION_V1C_OFFLINE_EVALUATION_METRIC_KEYS) {
    const metric = byKey.get(metricKey);
    assert.ok(metric, `missing metric ${metricKey}`);
    assert.equal(typeof metric.numerator, 'number');
    assert.equal(typeof metric.denominator, 'number');
    assert.equal(Array.isArray(metric.contributing_case_refs), true);
    assert.equal(Array.isArray(metric.failure_case_refs), true);
    assert.equal(metric.notes.length > 0, true);
  }

  assert.equal(byKey.get('promotion_input_staleness_false_pass_rate')?.numerator, 1);
  assert.equal(byKey.get('promotion_input_staleness_false_pass_rate')?.denominator, 1);
  assert.equal(byKey.get('promotion_gate_blocker_false_pass_rate')?.numerator, 1);
  assert.equal(byKey.get('promotion_gate_blocker_false_pass_rate')?.denominator, 2);
  assert.equal(byKey.get('human_promotion_bypass_rate')?.numerator, 1);
  assert.equal(byKey.get('human_promotion_bypass_rate')?.denominator, 8);
  assert.equal(byKey.get('promotion_false_pass_rate')?.numerator, 1);
  assert.equal(byKey.get('promotion_false_pass_rate')?.denominator, 3);
  assert.equal(byKey.get('bridge_trace_completeness')?.numerator, 71);
  assert.equal(byKey.get('bridge_trace_completeness')?.denominator, 72);
  assert.equal(byKey.get('commitment_profile_completeness')?.numerator, 55);
  assert.equal(byKey.get('commitment_profile_completeness')?.denominator, 56);
  assert.equal(byKey.get('loopback_target_accuracy')?.numerator, 0);
  assert.equal(byKey.get('loopback_target_accuracy')?.denominator, 1);
  assert.equal(byKey.get('downstream_mutation_guard_rate')?.numerator, 0);
  assert.equal(byKey.get('downstream_mutation_guard_rate')?.denominator, 1);
});

test('ReplayDiff flags final decision, key evidence, blocker set, and trace verdict changes', async () => {
  const { run, service } = await createCompletedSyntheticRun();
  const diffs = await service.listReplayDiffs(run.offline_evaluation_run_id);
  const changedDimensions = new Set(diffs.flatMap((record) => record.changed_dimensions));

  assert.equal(changedDimensions.has('final_decision'), true);
  assert.equal(changedDimensions.has('key_evidence_set'), true);
  assert.equal(changedDimensions.has('blocker_set'), true);
  assert.equal(changedDimensions.has('trace_verdict'), true);
  assert.equal(diffs.some((record) => record.status === 'mismatch'), true);
});

test('v1b ReplayDiff flags boundary answerability value package and loopback changes', async () => {
  const { run, service } = await createCompletedSyntheticV1bRun();
  const diffs = await service.listReplayDiffs(run.offline_evaluation_run_id);
  const changedDimensions = new Set(diffs.flatMap((record) => record.changed_dimensions));

  assert.equal(changedDimensions.has('slice_boundary'), true);
  assert.equal(changedDimensions.has('answerability_verdict'), true);
  assert.equal(changedDimensions.has('value_claim'), true);
  assert.equal(changedDimensions.has('package_trace'), true);
  assert.equal(changedDimensions.has('package_readiness'), true);
  assert.equal(changedDimensions.has('loopback_cause'), true);
  assert.equal(diffs.some((record) => record.status === 'mismatch'), true);
});

test('v1c ReplayDiff flags promotion input gate human bridge commitment loopback and downstream changes', async () => {
  const { run, service } = await createCompletedSyntheticV1cRun();
  const diffs = await service.listReplayDiffs(run.offline_evaluation_run_id);
  const changedDimensions = new Set(diffs.flatMap((record) => record.changed_dimensions));

  assert.equal(changedDimensions.has('promotion_input_currentness'), true);
  assert.equal(changedDimensions.has('promotion_gate_blocker'), true);
  assert.equal(changedDimensions.has('human_authorization'), true);
  assert.equal(changedDimensions.has('promotion_gate'), true);
  assert.equal(changedDimensions.has('bridge_trace'), true);
  assert.equal(changedDimensions.has('commitment_profile'), true);
  assert.equal(changedDimensions.has('loopback_target'), true);
  assert.equal(changedDimensions.has('downstream_feedback'), true);
  assert.equal(diffs.some((record) => record.status === 'mismatch'), true);
});

test('memory is evaluated as constraint context only and never boosts evidence recall', async () => {
  const { metricResults } = await createCompletedSyntheticRun();
  const byKey = metricByKey(metricResults);
  const memory = byKey.get('negative_memory_usefulness');
  const counterEvidence = byKey.get('counter_evidence_recall');

  assert.equal(memory?.numerator, 1);
  assert.equal(memory?.denominator, 2);
  assert.equal(memory?.failure_case_refs.some((ref) => ref.title_card_id === 'title_card_same_team_duplicate_claim'), true);
  assert.deepEqual(memory?.metric_payload, { evidence_policy: 'not_evidence' });
  assert.equal(counterEvidence?.denominator, 3);
  assert.equal(counterEvidence?.numerator, 0);
});

test('downstream rework cause metric records classification distribution', async () => {
  const { metricResults } = await createCompletedSyntheticRun();
  const downstream = metricByKey(metricResults).get('downstream_rework_cause');

  assert.equal(downstream?.numerator, 1);
  assert.equal(downstream?.denominator, 1);
  assert.deepEqual(downstream?.metric_payload, {
    cause_distribution: {
      weak_counter_evidence_recall: 1,
    },
  });
});

test('Prisma migration protects one case result per run/case and one metric result per run/key', async () => {
  const migration = await readFile(
    new URL('../../../../prisma/migrations/20260513224500_add_topic_selection_offline_evaluation_replay/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(
    migration,
    /CREATE UNIQUE INDEX "TopicSelectionOfflineEvaluationCaseResult_runId_caseId_key"/,
  );
  assert.match(
    migration,
    /CREATE UNIQUE INDEX "TopicSelectionOfflineEvaluationMetricResult_runId_metricKey_key"/,
  );
});
