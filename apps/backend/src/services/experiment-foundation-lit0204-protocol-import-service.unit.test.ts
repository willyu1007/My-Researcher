import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type {
  ExperimentFoundationV2MetricValueType,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import {
  LIT0204_METRIC_REQUIREMENT_KEYS,
  LIT0204_SOURCE_PROTOCOL_KEY,
  Lit0204ProtocolImportError,
  mapLit0204DefinitionToTypedV2Draft,
  type Lit0204ProtocolDraftDependencies,
} from './experiment-foundation-lit0204-protocol-import-service.js';

const FIXTURE_URL = new URL(
  './test-fixtures/lit-0204-ragperf-protocol-definition.fixture.json',
  import.meta.url,
);
const SOURCE_METRIC_KEYS = [
  'embedding_time_ns',
  'retrieval_time_ns',
  'rerank_time_ns',
  'prompt_time_ns',
  'generation_time_ns',
  'total_pipeline_time_ns',
  'qps',
  'factual_correctness',
  'answer_accuracy',
  'llm_context_recall',
  'faithfulness',
  'context_recall',
  'context_precision',
  'answer_relevancy',
  'gpu_utilization',
  'gpu_memory_or_dram_bandwidth',
  'cpu_memory_disk_process_io',
] as const;
const METRIC_RULE_VALUE_SHAPES = {
  embedding_time_ns: metricValueShape('duration_ns', 'ns'),
  retrieval_time_ns: metricValueShape('duration_ns', 'ns'),
  rerank_time_ns: metricValueShape('duration_ns', 'ns'),
  prompt_time_ns: metricValueShape('duration_ns', 'ns'),
  generation_time_ns: metricValueShape('duration_ns', 'ns'),
  total_pipeline_time_ns: metricValueShape('duration_ns', 'ns'),
  qps: metricValueShape('number', 'queries_per_second'),
  factual_correctness: metricValueShape('number', 'score'),
  answer_accuracy: metricValueShape('number', 'score'),
  llm_context_recall: metricValueShape('number', 'score'),
  faithfulness: metricValueShape('number', 'score'),
  context_recall: metricValueShape('number', 'score'),
  context_precision: metricValueShape('number', 'score'),
  answer_relevancy: metricValueShape('number', 'score'),
  gpu_utilization: metricValueShape('percentage', 'percent'),
  gpu_memory_or_dram_bandwidth: metricValueShape('number', 'bytes_per_second'),
  cpu_memory_disk_process_io: metricValueShape('number', 'bytes_per_second'),
} satisfies Record<
  (typeof SOURCE_METRIC_KEYS)[number],
  { value_type: ExperimentFoundationV2MetricValueType; unit: string }
>;

test('maps the copied LIT-0204 definition exactly into deterministic typed v2 rules', () => {
  const definitionDocument = readFixture();
  const dependencies = buildDependencies();
  const originalDocument = structuredClone(definitionDocument);

  const first = mapLit0204DefinitionToTypedV2Draft(definitionDocument, dependencies);
  const second = mapLit0204DefinitionToTypedV2Draft(definitionDocument, dependencies);

  assert.deepEqual(first, second);
  assert.deepEqual(definitionDocument, originalDocument);
  assert.deepEqual(LIT0204_METRIC_REQUIREMENT_KEYS, SOURCE_METRIC_KEYS);
  assert.deepEqual(first, {
    schema_version: 'v2',
    protocol_key: LIT0204_SOURCE_PROTOCOL_KEY,
    display_name: 'RAGPerf adapter-tier EvaluationProtocol v2 — LIT-0204 source import',
    benchmark_dependency: dependencies.benchmark_dependency,
    metric_dependencies: SOURCE_METRIC_KEYS.map((metricKey) => (
      requireMetricDependency(dependencies, metricKey).metric_definition
    )),
    required_rules: [
      {
        rule_id: 'artifact_contract@v1:text_pipeline_stats',
        rule_type: 'artifact_contract@v1',
        artifact_kind: 'text_pipeline_stats',
        file_name: 'text_pipeline_stats.txt',
        required_cardinality: 1,
        content_hash_required: true,
        parser_binding: 'ragperf_text_pipeline_stats@v1',
      },
      ...SOURCE_METRIC_KEYS.map((metricKey) => {
        const valueShape = METRIC_RULE_VALUE_SHAPES[metricKey];
        return {
          rule_id: `metric_contract@v1:${metricKey}`,
          rule_type: 'metric_contract@v1' as const,
          metric_definition:
            requireMetricDependency(dependencies, metricKey).metric_definition,
          metric_key: metricKey,
          required_cardinality: 1,
          split_key: 'query',
          value_type: valueShape.value_type,
          unit: valueShape.unit,
          finite_required: true,
        };
      }),
    ],
  });
  assert.equal(first.metric_dependencies.length, 17);
  assert.equal(first.required_rules.length, 18);
});

test('throws a typed error for an unknown source requirement kind', () => {
  const definitionDocument = readFixture();
  const root = requireRecord(definitionDocument);
  const document = requireRecord(root.document);
  const definition = requireRecord(document.definition);
  const requirements = requireArray(definition.metric_definitions);
  const firstRequirement = requireRecord(requirements[0]);
  firstRequirement.metric_key = 'unknown_custom_metric';

  assert.throws(
    () => mapLit0204DefinitionToTypedV2Draft(definitionDocument, buildDependencies()),
    (error) => error instanceof Lit0204ProtocolImportError
      && error.code === 'LIT0204_REQUIREMENT_UNMAPPABLE',
  );
});

function readFixture(): unknown {
  return JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as unknown;
}

function buildDependencies(): Lit0204ProtocolDraftDependencies {
  return {
    benchmark_dependency: {
      asset_type: 'Benchmark',
      logical_id: 'benchmark-lit0204-test',
      revision_id: 'revision-benchmark-lit0204-test',
      revision_sequence: 1,
      content_hash: `sha256:${'b'.repeat(64)}`,
    },
    metric_definitions: SOURCE_METRIC_KEYS.map((metricKey, index) => ({
      metric_key: metricKey,
      metric_definition: {
        asset_type: 'MetricDefinition' as const,
        logical_id: `metric-lit0204-test-${metricKey}`,
        revision_id: `revision-metric-lit0204-test-${index + 1}`,
        revision_sequence: 1,
        content_hash: `sha256:${(index % 16).toString(16).repeat(64)}`,
      },
    })),
  };
}

function requireMetricDependency(
  dependencies: Lit0204ProtocolDraftDependencies,
  metricKey: string,
) {
  const dependency = dependencies.metric_definitions.find(
    (candidate) => candidate.metric_key === metricKey,
  );
  assert.ok(dependency);
  return dependency;
}

function metricValueShape(
  valueType: ExperimentFoundationV2MetricValueType,
  unit: string,
) {
  return { value_type: valueType, unit };
}

function requireRecord(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, 'object');
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function requireArray(value: unknown): unknown[] {
  assert.ok(Array.isArray(value));
  return value;
}
