import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationScientificDirectionalDifferenceRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationSourceBoundResultCellV2,
  ScientificUncertaintyV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';

import { executeScientificComparisonsV1 } from './experiment-foundation-v2-scientific-comparison-engine.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const cells: ExperimentFoundationRunCellV2[] = [1, 2].map((ordinal) => ({
  run_cell_id: `cell-${ordinal}`,
  run_id: 'run-1',
  ordinal,
  cell_key: `cell-${ordinal}`,
  external_pi_cell_id: `pi-cell-${ordinal}`,
  external_pi_cell_hash: hash(String(ordinal)),
  training_task_spec_id: `task-${ordinal}`,
  training_task_spec_hash: hash(String(ordinal + 2)),
  seed: ordinal,
  repeat_index: 0,
}));

const baseRule: ExperimentFoundationScientificDirectionalDifferenceRuleV1 = {
  comparison_key: 'primary-quality',
  ordinal: 1,
  left_cell_ordinal: 1,
  right_cell_ordinal: 2,
  observation_key: 'quality',
  effect_kind: 'absolute_difference',
  direction: 'higher_is_support',
  support_min: 0.1,
  contradiction_max: -0.1,
  uncertainty_policy: { kind: 'not_required_by_protocol' },
};

function result(
  ordinal: number,
  value: number,
  uncertainty: ScientificUncertaintyV1 = {
    kind: 'none', reason: 'not_required_by_protocol',
  },
): ExperimentFoundationSourceBoundResultCellV2 {
  return {
    result_id: `result-${ordinal}`,
    schema_version: 'v2',
    run_id: 'run-1',
    run_manifest_hash: hash('a'),
    run_cell_id: `cell-${ordinal}`,
    cell_key: `cell-${ordinal}`,
    training_task_spec_id: `task-${ordinal}`,
    training_task_spec_hash: hash(String(ordinal + 2)),
    execution_attempt_id: `attempt-${ordinal}`,
    collection_attempt_id: `collection-${ordinal}`,
    source_output_id: `source-${ordinal}`,
    source_output_hash: hash('b'),
    source_output_kind: 'scientific_result_manifest',
    source_output_class: 'scientific_source',
    parser_profile_version: 'parser@v1',
    parser_profile_hash: hash('c'),
    evaluation_protocol: {
      asset_type: 'EvaluationProtocol',
      logical_id: 'protocol-1',
      revision_id: 'protocol-revision-1',
      revision_sequence: 1,
      content_hash: hash('d'),
    },
    provenance: 'real_provider',
    metric_observations: [{
      observation_id: `observation-${ordinal}`,
      ordinal: 1,
      observation_key: 'quality',
      metric_key: 'quality',
      split_key: 'test',
      value,
      value_type: 'number',
      unit: 'score',
      statistic: { kind: 'mean', sample_size: 10 },
      uncertainty,
    }],
    artifact_observations: [],
    derivation_hash: hash('e'),
    content_hash: hash(ordinal === 1 ? 'f' : '0'),
  };
}

function execute(
  left: ExperimentFoundationSourceBoundResultCellV2,
  right: ExperimentFoundationSourceBoundResultCellV2,
  rule: ExperimentFoundationScientificDirectionalDifferenceRuleV1 = baseRule,
) {
  return executeScientificComparisonsV1({
    run_id: 'run-1',
    evaluation_protocol_revision_hash: hash('d'),
    ordered_cells: cells,
    ordered_cell_results: [left, right],
    observation_slots: [{
      observation_key: 'quality',
      ordinal: 1,
      metric_key: 'quality',
      split_key: 'test',
      value_type: 'number',
      unit: 'score',
      statistic: { kind: 'mean' },
      uncertainty: { kind: 'none' },
    }],
    comparison_rules: [rule],
  });
}

test('CMP-B1 point rules classify support, contradiction and the open decision gap', () => {
  assert.equal(
    execute(result(1, 0.8), result(2, 0.6))
      .ordered_comparison_results[0]?.fact?.registered_relation,
    'supports_registered_expectation',
  );
  assert.equal(
    execute(result(1, 0.4), result(2, 0.6))
      .ordered_comparison_results[0]?.fact?.registered_relation,
    'contradicts_registered_expectation',
  );
  const gap = execute(result(1, 0.65), result(2, 0.6))
    .ordered_comparison_results[0]?.fact;
  assert.equal(gap?.registered_relation, 'indeterminate');
  assert.equal(gap?.relation_reason, 'decision_gap');
});

test('lower-is-support uses the same oriented decision algorithm', () => {
  const outcome = execute(result(1, 0.4), result(2, 0.6), {
    ...baseRule,
    direction: 'lower_is_support',
  });
  assert.equal(
    outcome.ordered_comparison_results[0]?.fact?.registered_relation,
    'supports_registered_expectation',
  );
  assert.ok(Math.abs(
    (outcome.ordered_comparison_results[0]?.fact?.raw_effect.value ?? 0) + 0.2,
  ) < Number.EPSILON);
});

test('confidence-interval guard classifies only intervals wholly inside a decision band', () => {
  const rule: ExperimentFoundationScientificDirectionalDifferenceRuleV1 = {
    ...baseRule,
    uncertainty_policy: {
      kind: 'confidence_interval_guard', confidence_level: 0.95, method_key: 'bootstrap',
    },
  };
  const ci = (lower: number, upper: number): ScientificUncertaintyV1 => ({
    kind: 'confidence_interval', level: 0.95, lower, upper, method_key: 'bootstrap',
  });
  const support = execute(result(1, 0.8, ci(0.75, 0.85)), result(2, 0.5, ci(0.45, 0.55)), rule);
  assert.equal(
    support.ordered_comparison_results[0]?.fact?.registered_relation,
    'supports_registered_expectation',
  );
  const contradiction = execute(
    result(1, 0.4, ci(0.35, 0.45)),
    result(2, 0.7, ci(0.65, 0.75)),
    rule,
  );
  assert.equal(
    contradiction.ordered_comparison_results[0]?.fact?.registered_relation,
    'contradicts_registered_expectation',
  );
  const uncertain = execute(
    result(1, 0.65, ci(0.45, 0.85)),
    result(2, 0.6, ci(0.4, 0.8)),
    rule,
  ).ordered_comparison_results[0]?.fact;
  assert.equal(uncertain?.registered_relation, 'indeterminate');
  assert.equal(uncertain?.relation_reason, 'uncertainty_interval_not_decisive');
});

const ciRule: ExperimentFoundationScientificDirectionalDifferenceRuleV1 = {
  ...baseRule,
  uncertainty_policy: {
    kind: 'confidence_interval_guard', confidence_level: 0.95, method_key: 'bootstrap',
  },
};

const ci = (
  lower: number,
  upper: number,
  level = 0.95,
  methodKey = 'bootstrap',
): ScientificUncertaintyV1 => ({
  kind: 'confidence_interval', level, lower, upper, method_key: methodKey,
});

test('missing required CI fails validation and emits no fact', () => {
  const outcome = execute(result(1, 0.8), result(2, 0.5), ciRule);
  assert.equal(outcome.status, 'failed');
  assert.deepEqual(outcome.ordered_comparison_results[0], {
    ordinal: 1,
    comparison_key: 'primary-quality',
    rule_hash: outcome.ordered_comparison_results[0]?.rule_hash,
    status: 'failed',
    detail_code: 'COMPARISON_REQUIRED_CI_MISSING_OR_MISMATCHED',
    fact: null,
  });
});

test('required CI confidence-level mismatch fails validation', () => {
  const outcome = execute(
    result(1, 0.8, ci(0.75, 0.85, 0.9)),
    result(2, 0.5, ci(0.45, 0.55)),
    ciRule,
  );
  assert.equal(outcome.status, 'failed');
  assert.equal(
    outcome.ordered_comparison_results[0]?.detail_code,
    'COMPARISON_REQUIRED_CI_MISSING_OR_MISMATCHED',
  );
});

test('required CI method mismatch fails validation', () => {
  const outcome = execute(
    result(1, 0.8, ci(0.75, 0.85, 0.95, 'wald')),
    result(2, 0.5, ci(0.45, 0.55)),
    ciRule,
  );
  assert.equal(outcome.status, 'failed');
  assert.equal(
    outcome.ordered_comparison_results[0]?.detail_code,
    'COMPARISON_REQUIRED_CI_MISSING_OR_MISMATCHED',
  );
});

test('malformed required CI fails validation with the invalid-interval reason', () => {
  const outcome = execute(
    result(1, 0.8, ci(0.85, 0.75)),
    result(2, 0.5, ci(0.45, 0.55)),
    ciRule,
  );
  assert.equal(outcome.status, 'failed');
  assert.equal(
    outcome.ordered_comparison_results[0]?.detail_code,
    'COMPARISON_REQUIRED_CI_INVALID',
  );
});

test('lower-is-support CI guard orients the conservative interval correctly', () => {
  const outcome = execute(
    result(1, 0.4, ci(0.35, 0.45)),
    result(2, 0.7, ci(0.65, 0.75)),
    {
      ...ciRule,
      direction: 'lower_is_support',
    },
  );
  assert.equal(outcome.status, 'passed');
  assert.equal(
    outcome.ordered_comparison_results[0]?.fact?.registered_relation,
    'supports_registered_expectation',
  );
  const interval = outcome.ordered_comparison_results[0]?.fact?.raw_effect_interval;
  assert.ok(interval);
  assert.ok(Math.abs(interval.lower + 0.4) < Number.EPSILON);
  assert.ok(Math.abs(interval.upper + 0.2) < Number.EPSILON);
  assert.equal(interval.unit, 'score');
});

test('fact identity and hashes replay exactly and expose no PI disposition authority', () => {
  const first = execute(result(1, 0.8), result(2, 0.6));
  const replay = execute(result(1, 0.8), result(2, 0.6));
  assert.deepEqual(replay, first);
  const serialized = JSON.stringify(first);
  assert.doesNotMatch(serialized, /positive|negative|inconclusive|selected_exit|claim/i);
  assert.match(
    first.ordered_comparison_results[0]?.fact?.comparison_fact_hash ?? '',
    /^sha256:[0-9a-f]{64}$/,
  );
});
