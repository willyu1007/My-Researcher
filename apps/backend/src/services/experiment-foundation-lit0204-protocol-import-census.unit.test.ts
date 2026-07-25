import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  censusRuleEquivalence,
  LIT0204_METRIC_REQUIREMENT_KEYS,
  mapLit0204DefinitionToTypedV2Draft,
  type Lit0204ProtocolDraftDependencies,
} from './experiment-foundation-lit0204-protocol-import-service.js';

const PRODUCT_METRIC_KEYS = [
  'embedding_time_ns',
  'generation_time_ns',
  'prompt_time_ns',
  'qps',
  'rerank_time_ns',
  'retrieval_time_ns',
  'total_pipeline_time_ns',
] as const;
const PRODUCT_METRIC_KEY_SET = new Set<string>(PRODUCT_METRIC_KEYS);
const FIXTURE_URL = new URL(
  './test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json',
  import.meta.url,
);

test('censuses imported and product rules by exact id/type/key/cardinality without authority claims', () => {
  const imported = mapLit0204DefinitionToTypedV2Draft(
    JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as unknown,
    buildDependencies(),
  );
  const productRules = [
    ...imported.required_rules.filter(
      (rule) => rule.rule_type === 'metric_contract@v1'
        && PRODUCT_METRIC_KEY_SET.has(rule.metric_key),
    ).reverse(),
    imported.required_rules[0]!,
  ];

  const census = censusRuleEquivalence(
    imported,
    { required_rules: productRules },
  );

  assert.equal(census.matching_rule_count, 8);
  assert.deepEqual(census.other_only, []);
  assert.deepEqual(
    census.imported_only.map((entry) => entry.rule_key).sort(),
    [
      'answer_accuracy',
      'answer_relevancy',
      'context_precision',
      'context_recall',
      'cpu_memory_disk_process_io',
      'factual_correctness',
      'faithfulness',
      'gpu_memory_or_dram_bandwidth',
      'gpu_utilization',
      'llm_context_recall',
    ],
  );
  assert.ok(census.imported_only.every(
    (entry) => entry.rule_type === 'metric_contract@v1'
      && entry.required_cardinality === 1,
  ));
});

test('treats a cardinality drift as imported-only plus other-only evidence', () => {
  const imported = mapLit0204DefinitionToTypedV2Draft(
    JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as unknown,
    buildDependencies(),
  );
  const qpsRule = imported.required_rules.find(
    (rule) => rule.rule_type === 'metric_contract@v1' && rule.metric_key === 'qps',
  );
  assert.ok(qpsRule);

  const census = censusRuleEquivalence(
    { required_rules: [qpsRule] },
    { required_rules: [{ ...qpsRule, required_cardinality: 2 }] },
  );

  assert.equal(census.matching_rule_count, 0);
  assert.deepEqual(census.imported_only, [{
    rule_id: 'metric_contract@v1:qps',
    rule_type: 'metric_contract@v1',
    rule_key: 'qps',
    required_cardinality: 1,
  }]);
  assert.deepEqual(census.other_only, [{
    rule_id: 'metric_contract@v1:qps',
    rule_type: 'metric_contract@v1',
    rule_key: 'qps',
    required_cardinality: 2,
  }]);
});

function buildDependencies(): Lit0204ProtocolDraftDependencies {
  return {
    benchmark_dependency: {
      asset_type: 'Benchmark',
      logical_id: 'benchmark-lit0204-census',
      revision_id: 'revision-benchmark-lit0204-census',
      revision_sequence: 1,
      content_hash: `sha256:${'b'.repeat(64)}`,
    },
    metric_definitions: LIT0204_METRIC_REQUIREMENT_KEYS.map((metricKey, index) => ({
      metric_key: metricKey,
      metric_definition: {
        asset_type: 'MetricDefinition' as const,
        logical_id: `metric-lit0204-census-${metricKey}`,
        revision_id: `revision-metric-lit0204-census-${index + 1}`,
        revision_sequence: 1,
        content_hash: `sha256:${(index % 16).toString(16).repeat(64)}`,
      },
    })),
  };
}
