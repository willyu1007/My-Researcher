import type {
  ExperimentFoundationV2EvaluationProtocolDraftContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationV2MetricDirection,
  ExperimentFoundationV2MetricValueType,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import type {
  ExperimentFoundationV2AssetIdentityRecord,
  ExperimentFoundationV2AssetRevisionRecord,
} from '../repositories/experiment-foundation-v2.repository.js';
import { ExperimentFoundationV2Service } from './experiment-foundation-v2-service.js';

export const LIT0204_SOURCE_PROTOCOL_LOGICAL_ID =
  'lit0204-evaluation-protocol-ragperf-v2-source' as const;
export const LIT0204_SOURCE_PROTOCOL_KEY = 'ragperf-adapter-tier-v2-source' as const;
export const LIT0204_SOURCE_PROTOCOL_FREEZE_IDEMPOTENCY_KEY =
  'lit0204-ragperf-source-import:freeze:v1' as const;

export type Lit0204ProtocolImportErrorCode =
  | 'LIT0204_DEFINITION_INVALID'
  | 'LIT0204_REQUIREMENT_UNMAPPABLE'
  | 'LIT0204_DEPENDENCY_INVALID'
  | 'LIT0204_SOURCE_HASH_INVALID'
  | 'LIT0204_IMPORT_INVARIANT';

export class Lit0204ProtocolImportError extends Error {
  constructor(
    public readonly code: Lit0204ProtocolImportErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = 'Lit0204ProtocolImportError';
  }
}

export interface Lit0204MetricDefinitionDependency {
  metric_key: string;
  metric_definition: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  };
}

export interface Lit0204ProtocolDraftDependencies {
  benchmark_dependency: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'Benchmark';
  };
  metric_definitions: readonly Lit0204MetricDefinitionDependency[];
}

export interface Lit0204ProtocolImportDependencies
  extends Lit0204ProtocolDraftDependencies {
  definition_document: unknown;
  source_document_sha256: string;
}

export interface Lit0204ProtocolImportResult {
  identity: Extract<
    ExperimentFoundationV2AssetIdentityRecord,
    { asset_type: 'EvaluationProtocol' }
  >;
  revision: Extract<
    ExperimentFoundationV2AssetRevisionRecord,
    { asset_type: 'EvaluationProtocol' }
  >;
  source_binding: {
    source_document_sha256: string;
    imported_content_hash: string;
    rule_count: number;
  };
}

export interface Lit0204RuleCensusSnapshot {
  required_rules: readonly ExperimentFoundationV2RequiredRuleV1[];
}

export interface Lit0204RuleCensusEntry {
  rule_id: string;
  rule_type: ExperimentFoundationV2RequiredRuleV1['rule_type'];
  rule_key: string;
  required_cardinality: number;
}

export interface Lit0204RuleEquivalenceCensus {
  matching_rule_count: number;
  imported_only: Lit0204RuleCensusEntry[];
  other_only: Lit0204RuleCensusEntry[];
}

interface Lit0204MetricRequirement {
  metric_key: string;
  source: string;
  direction: ExperimentFoundationV2MetricDirection;
}

interface Lit0204Definition {
  metric_requirements: Lit0204MetricRequirement[];
}

interface Lit0204MetricRuleShape extends Lit0204MetricRequirement {
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
}

const LIT0204_METRIC_RULE_SHAPES: readonly Lit0204MetricRuleShape[] = [
  metricShape(
    'embedding_time_ns',
    'TextsRAGPipeline text_pipeline_stats.txt',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'retrieval_time_ns',
    'TextsRAGPipeline text_pipeline_stats.txt',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'rerank_time_ns',
    'TextsRAGPipeline text_pipeline_stats.txt',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'prompt_time_ns',
    'TextsRAGPipeline text_pipeline_stats.txt',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'generation_time_ns',
    'TextsRAGPipeline text_pipeline_stats.txt',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'total_pipeline_time_ns',
    'derived from stage timings',
    'lower_is_better',
    'duration_ns',
    'ns',
  ),
  metricShape(
    'qps',
    'derived from question_num / total time',
    'higher_is_better',
    'number',
    'queries_per_second',
  ),
  metricShape(
    'factual_correctness',
    'Ragasvllm/RagasEvaluator evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'answer_accuracy',
    'Ragasvllm evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'llm_context_recall',
    'Ragasvllm evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'faithfulness',
    'RagasEvaluator evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'context_recall',
    'RagasEvaluator evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'context_precision',
    'RagasEvaluator evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'answer_relevancy',
    'RagasEvaluator evaluate_result.csv',
    'higher_is_better',
    'number',
    'score',
  ),
  metricShape(
    'gpu_utilization',
    'MSys GPUMeter protobuf output',
    'informational',
    'percentage',
    'percent',
  ),
  metricShape(
    'gpu_memory_or_dram_bandwidth',
    'MSys GPUMeter protobuf output',
    'informational',
    'number',
    'bytes_per_second',
  ),
  metricShape(
    'cpu_memory_disk_process_io',
    'MSys CPU/Mem/Disk/Proc meters',
    'informational',
    'number',
    'bytes_per_second',
  ),
];

export const LIT0204_METRIC_REQUIREMENT_KEYS: readonly string[] = Object.freeze(
  LIT0204_METRIC_RULE_SHAPES.map((requirement) => requirement.metric_key),
);

const LIT0204_METRIC_RULE_SHAPE_BY_KEY = new Map(
  LIT0204_METRIC_RULE_SHAPES.map((requirement) => [requirement.metric_key, requirement]),
);

/**
 * Maps the immutable T-131 definition snapshot into the closed typed v2
 * EvaluationProtocol draft. Exact dependency refs remain caller-supplied
 * inputs; this mapper never synthesizes canonical asset identities or hashes.
 */
export function mapLit0204DefinitionToTypedV2Draft(
  definitionDocument: unknown,
  dependencies: Lit0204ProtocolDraftDependencies,
): ExperimentFoundationV2EvaluationProtocolDraftContentV2 {
  const definition = parseLit0204Definition(definitionDocument);
  assertExactDependencyRef(dependencies.benchmark_dependency, 'Benchmark');

  const metricDependencyByKey = new Map<string, Lit0204MetricDefinitionDependency>();
  for (const dependency of dependencies.metric_definitions) {
    if (
      typeof dependency.metric_key !== 'string'
      || dependency.metric_key.length === 0
      || metricDependencyByKey.has(dependency.metric_key)
    ) {
      throw dependencyError('Metric dependency keys must be unique non-empty strings.');
    }
    assertExactDependencyRef(dependency.metric_definition, 'MetricDefinition');
    metricDependencyByKey.set(dependency.metric_key, dependency);
  }

  const sourceMetricKeys = new Set(
    definition.metric_requirements.map((requirement) => requirement.metric_key),
  );
  const extraDependencyKeys = [...metricDependencyByKey.keys()]
    .filter((metricKey) => !sourceMetricKeys.has(metricKey))
    .sort();
  if (extraDependencyKeys.length > 0) {
    throw dependencyError('Metric dependencies contain keys absent from the source definition.', {
      metric_keys: extraDependencyKeys,
    });
  }

  const metricDependencies: Array<
    ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'MetricDefinition' }
  > = [];
  const metricRules: ExperimentFoundationV2RequiredRuleV1[] = [];
  for (const requirement of definition.metric_requirements) {
    const ruleShape = LIT0204_METRIC_RULE_SHAPE_BY_KEY.get(requirement.metric_key);
    if (
      !ruleShape
      || ruleShape.source !== requirement.source
      || ruleShape.direction !== requirement.direction
    ) {
      throw unmappableRequirement(requirement);
    }
    const dependency = metricDependencyByKey.get(requirement.metric_key);
    if (!dependency) {
      throw dependencyError('A source metric requirement is missing its exact MetricDefinition ref.', {
        metric_key: requirement.metric_key,
      });
    }
    metricDependencies.push(structuredClone(dependency.metric_definition));
    metricRules.push({
      rule_id: `metric_contract@v1:${requirement.metric_key}`,
      rule_type: 'metric_contract@v1',
      metric_definition: structuredClone(dependency.metric_definition),
      metric_key: requirement.metric_key,
      required_cardinality: 1,
      split_key: 'query',
      value_type: ruleShape.value_type,
      unit: ruleShape.unit,
      finite_required: true,
    });
  }

  return {
    schema_version: 'v2',
    protocol_key: LIT0204_SOURCE_PROTOCOL_KEY,
    display_name: 'RAGPerf adapter-tier EvaluationProtocol v2 — LIT-0204 source import',
    benchmark_dependency: structuredClone(dependencies.benchmark_dependency),
    metric_dependencies: metricDependencies,
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
      ...metricRules,
    ],
  };
}

export async function importLit0204ProtocolV2(
  service: ExperimentFoundationV2Service,
  dependencies: Lit0204ProtocolImportDependencies,
): Promise<Lit0204ProtocolImportResult> {
  if (!/^sha256:[0-9a-f]{64}$/.test(dependencies.source_document_sha256)) {
    throw new Lit0204ProtocolImportError(
      'LIT0204_SOURCE_HASH_INVALID',
      'source_document_sha256 must be a lowercase sha256-prefixed digest.',
    );
  }
  const draft = mapLit0204DefinitionToTypedV2Draft(
    dependencies.definition_document,
    dependencies,
  );
  const identity = await service.createAssetDraft({
    asset_type: 'EvaluationProtocol',
    logical_id: LIT0204_SOURCE_PROTOCOL_LOGICAL_ID,
    draft_content: draft,
  });
  const frozen = await service.freezeAssetDraft({
    asset_type: 'EvaluationProtocol',
    logical_id: LIT0204_SOURCE_PROTOCOL_LOGICAL_ID,
    expected_state_version: 1,
    business_idempotency_key: LIT0204_SOURCE_PROTOCOL_FREEZE_IDEMPOTENCY_KEY,
  });
  if (identity.asset_type !== 'EvaluationProtocol' || frozen.revision.asset_type !== 'EvaluationProtocol') {
    throw new Lit0204ProtocolImportError(
      'LIT0204_IMPORT_INVARIANT',
      'The typed source import returned a non-EvaluationProtocol record.',
    );
  }
  return {
    identity,
    revision: frozen.revision,
    source_binding: {
      source_document_sha256: dependencies.source_document_sha256,
      imported_content_hash: frozen.exact_ref.content_hash,
      rule_count: draft.required_rules.length,
    },
  };
}

/**
 * Evidence-only rule census. Equality is limited to rule id, type, semantic
 * key, and required cardinality; it does not imply promotion or authority.
 */
export function censusRuleEquivalence(
  importedSnapshot: Lit0204RuleCensusSnapshot,
  productSnapshot: Lit0204RuleCensusSnapshot,
): Lit0204RuleEquivalenceCensus {
  const imported = importedSnapshot.required_rules.map(toCensusEntry);
  const otherRemaining = productSnapshot.required_rules.map(toCensusEntry);
  const importedOnly: Lit0204RuleCensusEntry[] = [];
  let matchingRuleCount = 0;

  for (const entry of imported) {
    const matchingIndex = otherRemaining.findIndex((candidate) => (
      censusEntriesEqual(entry, candidate)
    ));
    if (matchingIndex < 0) {
      importedOnly.push(entry);
      continue;
    }
    matchingRuleCount += 1;
    otherRemaining.splice(matchingIndex, 1);
  }

  return {
    matching_rule_count: matchingRuleCount,
    imported_only: importedOnly.sort(compareCensusEntries),
    other_only: otherRemaining.sort(compareCensusEntries),
  };
}

function metricShape(
  metricKey: string,
  source: string,
  direction: ExperimentFoundationV2MetricDirection,
  valueType: ExperimentFoundationV2MetricValueType,
  unit: string,
): Lit0204MetricRuleShape {
  return {
    metric_key: metricKey,
    source,
    direction,
    value_type: valueType,
    unit,
  };
}

function parseLit0204Definition(value: unknown): Lit0204Definition {
  const root = requireObject(value, 'definition document');
  assertExactKeys(
    root,
    ['generated_at', 'task_id', 'protocol_hash', 'hash_scheme', 'document'],
    'definition document',
  );
  requireString(root.generated_at, 'generated_at');
  requireExactString(root.task_id, 'T-131', 'task_id');
  requireString(root.protocol_hash, 'protocol_hash');
  requireString(root.hash_scheme, 'hash_scheme');

  const document = requireObject(root.document, 'document');
  assertExactKeys(document, ['tier', 'adapter_patch_digest', 'definition'], 'document');
  requireExactString(document.tier, 'cpu_adapter', 'document.tier');
  requireString(document.adapter_patch_digest, 'document.adapter_patch_digest');

  const definition = requireObject(document.definition, 'document.definition');
  assertExactKeys(
    definition,
    [
      'protocol_name',
      'literature_id',
      'repo_url',
      'git_head',
      'license',
      'entrypoint_shape',
      'key_knobs',
      'metric_definitions',
    ],
    'document.definition',
  );
  requireString(definition.protocol_name, 'document.definition.protocol_name');
  requireExactString(
    definition.literature_id,
    'LIT-0204',
    'document.definition.literature_id',
  );
  requireString(definition.repo_url, 'document.definition.repo_url');
  requireString(definition.git_head, 'document.definition.git_head');
  requireString(definition.license, 'document.definition.license');

  const entrypointShape = requireObject(
    definition.entrypoint_shape,
    'document.definition.entrypoint_shape',
  );
  assertExactKeys(
    entrypointShape,
    ['insert', 'query'],
    'document.definition.entrypoint_shape',
  );
  requireString(entrypointShape.insert, 'document.definition.entrypoint_shape.insert');
  requireString(entrypointShape.query, 'document.definition.entrypoint_shape.query');
  requireStringArray(definition.key_knobs, 'document.definition.key_knobs');

  if (!Array.isArray(definition.metric_definitions)) {
    throw definitionError('document.definition.metric_definitions must be an array.');
  }
  const requirements = definition.metric_definitions.map((candidate, index) => {
    const label = `document.definition.metric_definitions[${index}]`;
    const requirement = requireObject(candidate, label);
    assertExactKeys(requirement, ['metric_key', 'source', 'direction'], label);
    const metricKey = requireString(requirement.metric_key, `${label}.metric_key`);
    const source = requireString(requirement.source, `${label}.source`);
    const direction = requireMetricDirection(requirement.direction, `${label}.direction`);
    return { metric_key: metricKey, source, direction };
  });

  const seenMetricKeys = new Set<string>();
  for (const requirement of requirements) {
    if (seenMetricKeys.has(requirement.metric_key)) {
      throw definitionError('Metric requirement keys must be unique.', {
        metric_key: requirement.metric_key,
      });
    }
    seenMetricKeys.add(requirement.metric_key);
    if (!LIT0204_METRIC_RULE_SHAPE_BY_KEY.has(requirement.metric_key)) {
      throw unmappableRequirement(requirement);
    }
  }
  const missingMetricKeys = LIT0204_METRIC_REQUIREMENT_KEYS
    .filter((metricKey) => !seenMetricKeys.has(metricKey));
  if (missingMetricKeys.length > 0) {
    throw definitionError('The LIT-0204 source definition is missing metric requirements.', {
      metric_keys: missingMetricKeys,
    });
  }
  return { metric_requirements: requirements };
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw definitionError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw definitionError(`${label} contains missing or unknown fields.`, {
      actual_keys: actual,
      expected_keys: expected,
    });
  }
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw definitionError(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireExactString(value: unknown, expected: string, label: string): void {
  if (value !== expected) {
    throw definitionError(`${label} must equal ${expected}.`);
  }
}

function requireStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value)
    || value.length === 0
    || value.some((entry) => typeof entry !== 'string' || entry.length === 0)
  ) {
    throw definitionError(`${label} must be a non-empty string array.`);
  }
  return [...value] as string[];
}

function requireMetricDirection(
  value: unknown,
  label: string,
): ExperimentFoundationV2MetricDirection {
  if (
    value !== 'higher_is_better'
    && value !== 'lower_is_better'
    && value !== 'informational'
  ) {
    throw new Lit0204ProtocolImportError(
      'LIT0204_REQUIREMENT_UNMAPPABLE',
      `${label} is not a supported metric requirement direction.`,
      { direction: value },
    );
  }
  return value;
}

function assertExactDependencyRef(
  value: ExperimentFoundationV2ExactAssetRevisionRef,
  expectedAssetType: 'Benchmark' | 'MetricDefinition',
): void {
  if (
    value.asset_type !== expectedAssetType
    || typeof value.logical_id !== 'string'
    || value.logical_id.length === 0
    || typeof value.revision_id !== 'string'
    || value.revision_id.length === 0
    || !Number.isSafeInteger(value.revision_sequence)
    || value.revision_sequence < 1
    || !/^sha256:[0-9a-f]{64}$/.test(value.content_hash)
  ) {
    throw dependencyError(`Expected an exact ${expectedAssetType} revision ref.`);
  }
}

function toCensusEntry(rule: ExperimentFoundationV2RequiredRuleV1): Lit0204RuleCensusEntry {
  return {
    rule_id: rule.rule_id,
    rule_type: rule.rule_type,
    rule_key: rule.rule_type === 'metric_contract@v1'
      ? rule.metric_key
      : rule.artifact_kind,
    required_cardinality: rule.required_cardinality,
  };
}

function censusEntriesEqual(
  left: Lit0204RuleCensusEntry,
  right: Lit0204RuleCensusEntry,
): boolean {
  return left.rule_id === right.rule_id
    && left.rule_type === right.rule_type
    && left.rule_key === right.rule_key
    && left.required_cardinality === right.required_cardinality;
}

function compareCensusEntries(
  left: Lit0204RuleCensusEntry,
  right: Lit0204RuleCensusEntry,
): number {
  return left.rule_id.localeCompare(right.rule_id)
    || left.rule_type.localeCompare(right.rule_type)
    || left.rule_key.localeCompare(right.rule_key)
    || left.required_cardinality - right.required_cardinality;
}

function definitionError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): Lit0204ProtocolImportError {
  return new Lit0204ProtocolImportError('LIT0204_DEFINITION_INVALID', message, details);
}

function unmappableRequirement(
  requirement: Lit0204MetricRequirement,
): Lit0204ProtocolImportError {
  return new Lit0204ProtocolImportError(
    'LIT0204_REQUIREMENT_UNMAPPABLE',
    `Metric requirement ${requirement.metric_key} has no exact typed v2 mapping.`,
    { requirement: structuredClone(requirement) },
  );
}

function dependencyError(
  message: string,
  details: Readonly<Record<string, unknown>> = {},
): Lit0204ProtocolImportError {
  return new Lit0204ProtocolImportError('LIT0204_DEPENDENCY_INVALID', message, details);
}
