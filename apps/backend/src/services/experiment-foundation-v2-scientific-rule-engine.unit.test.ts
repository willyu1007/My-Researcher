import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationV2ArtifactContractRuleV1,
  ExperimentFoundationV2MetricContractRuleV1,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type { ExperimentResultCellV2 } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';

import {
  computeScientificValidatorProfileHashV2,
  executeScientificRequiredRulesV2,
  listUnsupportedRequiredRulesV2,
} from './experiment-foundation-v2-scientific-rule-engine.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;

const metricRule: ExperimentFoundationV2MetricContractRuleV1 = {
  rule_id: 'rule-metric-001',
  rule_type: 'metric_contract@v1',
  metric_definition: {
    asset_type: 'MetricDefinition',
    logical_id: 'metric-faithfulness',
    revision_id: 'metric-rev-001',
    revision_sequence: 1,
    content_hash: hash('a'),
  },
  metric_key: 'faithfulness',
  required_cardinality: 1,
  split_key: 'test',
  value_type: 'number',
  unit: 'score',
  finite_required: true,
};

const artifactRule: ExperimentFoundationV2ArtifactContractRuleV1 = {
  rule_id: 'rule-artifact-001',
  rule_type: 'artifact_contract@v1',
  artifact_kind: 'metrics_json',
  file_name: 'metrics.json',
  required_cardinality: 1,
  content_hash_required: true,
  parser_binding: 'metrics_json_parser@v1',
};

function makeCellResult(cellKey: string): ExperimentResultCellV2 {
  return {
    result_id: `result-${cellKey}`,
    schema_version: 'v1',
    run_id: 'run-001',
    run_manifest_hash: hash('1'),
    run_cell_id: `run-cell-${cellKey}`,
    cell_key: cellKey,
    training_task_spec_id: `task-spec-${cellKey}`,
    training_task_spec_hash: hash('2'),
    execution_attempt_id: `attempt-${cellKey}`,
    provenance: 'real_provider',
    metric_observations: [
      { metric_key: 'faithfulness', split_key: 'test', value: 0.9, value_type: 'number', unit: 'score' },
    ],
    artifact_observations: [
      {
        artifact_kind: 'metrics_json',
        file_name: 'metrics.json',
        content_hash: hash('3'),
        byte_size: 1024,
        parser_binding: 'metrics_json_parser@v1',
      },
    ],
    content_hash: hash('4'),
  };
}

const twoCells = [makeCellResult('cell-a'), makeCellResult('cell-b')];

test('complete two-cell batch passes both first-slice rule types in protocol order', () => {
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule, artifactRule],
    ordered_cell_results: twoCells,
  });
  assert.equal(outcome.status, 'passed');
  assert.deepEqual(
    outcome.ordered_rule_results.map((result) => [result.ordinal, result.rule_id, result.status]),
    [
      [1, 'rule-metric-001', 'passed'],
      [2, 'rule-artifact-001', 'passed'],
    ],
  );
});

test('a metric missing on one cell fails the rule with a cell-scoped detail code', () => {
  const brokenCell = {
    ...makeCellResult('cell-b'),
    metric_observations: [],
  };
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule],
    ordered_cell_results: [makeCellResult('cell-a'), brokenCell],
  });
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.ordered_rule_results[0]?.status, 'failed');
  assert.equal(outcome.ordered_rule_results[0]?.detail_code, 'metric_cardinality:cell-b:0');
});

test('unit and value-type drift fail the metric rule', () => {
  const wrongUnit = {
    ...makeCellResult('cell-a'),
    metric_observations: [
      { metric_key: 'faithfulness', split_key: 'test', value: 0.9, value_type: 'number' as const, unit: 'percent' },
    ],
  };
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule],
    ordered_cell_results: [wrongUnit],
  });
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.ordered_rule_results[0]?.detail_code, 'metric_unit:cell-a');
});

test('excess cardinality fails exactly like missing observations', () => {
  const doubled = {
    ...makeCellResult('cell-a'),
    metric_observations: [
      { metric_key: 'faithfulness', split_key: 'test', value: 0.9, value_type: 'number' as const, unit: 'score' },
      { metric_key: 'faithfulness', split_key: 'test', value: 0.8, value_type: 'number' as const, unit: 'score' },
    ],
  };
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule],
    ordered_cell_results: [doubled],
  });
  assert.equal(outcome.ordered_rule_results[0]?.detail_code, 'metric_cardinality:cell-a:2');
});

test('artifact parser-binding drift fails the artifact rule', () => {
  const wrongParser = {
    ...makeCellResult('cell-a'),
    artifact_observations: [
      {
        artifact_kind: 'metrics_json',
        file_name: 'metrics.json',
        content_hash: hash('3'),
        byte_size: 1024,
        parser_binding: 'other_parser@v1',
      },
    ],
  };
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [artifactRule],
    ordered_cell_results: [wrongParser],
  });
  assert.equal(outcome.status, 'failed');
  assert.equal(outcome.ordered_rule_results[0]?.detail_code, 'artifact_parser_binding:cell-a');
});

test('a declared unsupported rule type yields unsupported status, never best effort', () => {
  const unsupportedRule = {
    rule_id: 'rule-statistical-001',
    rule_type: 'statistical_test@v1',
  } as unknown as ExperimentFoundationV2RequiredRuleV1;
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule, unsupportedRule],
    ordered_cell_results: twoCells,
  });
  assert.equal(outcome.status, 'unsupported');
  assert.equal(outcome.ordered_rule_results[1]?.status, 'unsupported');
  assert.equal(outcome.ordered_rule_results[1]?.detail_code, 'UNSUPPORTED_RULE');

  assert.deepEqual(listUnsupportedRequiredRulesV2([metricRule, unsupportedRule]), [
    { rule_id: 'rule-statistical-001', declared_rule_type: 'statistical_test@v1' },
  ]);
});

test('unsupported outranks failed in the overall status', () => {
  const brokenCell = { ...makeCellResult('cell-a'), metric_observations: [] };
  const unsupportedRule = {
    rule_id: 'rule-threshold-001',
    rule_type: 'target_threshold@v1',
  } as unknown as ExperimentFoundationV2RequiredRuleV1;
  const outcome = executeScientificRequiredRulesV2({
    required_rules: [metricRule, unsupportedRule],
    ordered_cell_results: [brokenCell],
  });
  assert.equal(outcome.status, 'unsupported');
});

test('empty rules or empty cells are programmer errors, not silent passes', () => {
  assert.throws(() =>
    executeScientificRequiredRulesV2({ required_rules: [], ordered_cell_results: twoCells }),
  );
  assert.throws(() =>
    executeScientificRequiredRulesV2({ required_rules: [metricRule], ordered_cell_results: [] }),
  );
});

test('validator profile hash is deterministic and version-bound', () => {
  const first = computeScientificValidatorProfileHashV2();
  const second = computeScientificValidatorProfileHashV2();
  assert.equal(first, second);
  assert.match(first, /^sha256:[0-9a-f]{64}$/);
});
