import {
  EXPERIMENT_V2_INT32_MAX,
  EXPERIMENT_V2_JSON_SAFE_INTEGER_MAX,
  EXPERIMENT_V2_HASH_PATTERN,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_V2_ASSET_TYPES = [
  'Dataset',
  'DataPolicy',
  'MetricDefinition',
  'Benchmark',
  'EvaluationProtocol',
] as const;
export type ExperimentFoundationV2AssetType =
  (typeof EXPERIMENT_FOUNDATION_V2_ASSET_TYPES)[number];

export const EXPERIMENT_FOUNDATION_V2_LIFECYCLE_STATUSES = [
  'draft',
  'active',
  'deprecated',
  'revoked',
] as const;
export type ExperimentFoundationV2LifecycleStatus =
  (typeof EXPERIMENT_FOUNDATION_V2_LIFECYCLE_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_V2_READINESS_STATUSES = ['passed', 'blocked'] as const;
export type ExperimentFoundationV2ReadinessStatus =
  (typeof EXPERIMENT_FOUNDATION_V2_READINESS_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_V2_DATASET_ROLES = [
  'corpus',
  'query_workload',
  'supervised_examples',
] as const;
export type ExperimentFoundationV2DatasetRole =
  (typeof EXPERIMENT_FOUNDATION_V2_DATASET_ROLES)[number];

export const EXPERIMENT_FOUNDATION_V2_SPLIT_ROLES = [
  'train',
  'validation',
  'test',
  'corpus',
  'query',
] as const;
export type ExperimentFoundationV2SplitRole =
  (typeof EXPERIMENT_FOUNDATION_V2_SPLIT_ROLES)[number];

export const EXPERIMENT_FOUNDATION_V2_DATA_POLICY_ACCESS_LEVELS = [
  'open',
  'restricted',
  'private',
] as const;
export type ExperimentFoundationV2DataPolicyAccessLevel =
  (typeof EXPERIMENT_FOUNDATION_V2_DATA_POLICY_ACCESS_LEVELS)[number];

export const EXPERIMENT_FOUNDATION_V2_METRIC_DIRECTIONS = [
  'higher_is_better',
  'lower_is_better',
  'informational',
] as const;
export type ExperimentFoundationV2MetricDirection =
  (typeof EXPERIMENT_FOUNDATION_V2_METRIC_DIRECTIONS)[number];

export const EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES = [
  'number',
  'percentage',
  'duration_ns',
  'count',
] as const;
export type ExperimentFoundationV2MetricValueType =
  (typeof EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES)[number];

export const EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES = [
  'metric_contract@v1',
  'artifact_contract@v1',
] as const;
export type ExperimentFoundationV2RequiredRuleType =
  (typeof EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES)[number];

export interface ExperimentFoundationV2ExactAssetRevisionRef {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  revision_id: string;
  revision_sequence: number;
  content_hash: string;
}

export interface ExperimentFoundationV2ChecksumEntrySnapshotV1 {
  path: string;
  byte_size: number;
  checksum: string;
}

export interface ExperimentFoundationV2ChecksumManifestSnapshotV1 {
  manifest_version: 'v1';
  algorithm: 'sha256' | 'sha512';
  entries: ExperimentFoundationV2ChecksumEntrySnapshotV1[];
  aggregate_checksum: string;
}

export interface ExperimentFoundationV2SplitSnapshotV1 {
  ordinal: number;
  split_key: string;
  split_role: ExperimentFoundationV2SplitRole;
  source_selector: string;
}

export interface ExperimentFoundationV2SplitProtocolSnapshotV1 {
  protocol_version: 'v1';
  splits: ExperimentFoundationV2SplitSnapshotV1[];
}

export interface ExperimentFoundationV2DatasetSourceIdentityV1 {
  source_name: string;
  source_revision: string;
  source_uri: string;
}

interface ExperimentFoundationV2DatasetSemanticContentV1 {
  schema_version: 'v1';
  dataset_key: string;
  display_name: string;
  version_label: string;
  dataset_role: ExperimentFoundationV2DatasetRole;
  source_identity: ExperimentFoundationV2DatasetSourceIdentityV1;
  checksum_manifest: ExperimentFoundationV2ChecksumManifestSnapshotV1;
  split_protocol: ExperimentFoundationV2SplitProtocolSnapshotV1;
  data_policy: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'DataPolicy' };
}

export interface ExperimentFoundationV2DatasetDraftContentV1
  extends ExperimentFoundationV2DatasetSemanticContentV1 {}
export interface ExperimentFoundationV2DatasetRevisionContentV1
  extends ExperimentFoundationV2DatasetSemanticContentV1 {}

interface ExperimentFoundationV2DataPolicySemanticContentV1 {
  schema_version: 'v1';
  policy_key: string;
  display_name: string;
  license_expression: string;
  access_level: ExperimentFoundationV2DataPolicyAccessLevel;
  source_terms_uri: string;
  redistribution_allowed: boolean;
  commercial_use_allowed: boolean;
  use_constraints: string[];
}

export interface ExperimentFoundationV2DataPolicyDraftContentV1
  extends ExperimentFoundationV2DataPolicySemanticContentV1 {}
export interface ExperimentFoundationV2DataPolicyRevisionContentV1
  extends ExperimentFoundationV2DataPolicySemanticContentV1 {}

export interface ExperimentFoundationV2EvaluatorBindingV1 {
  evaluator_key: string;
  evaluator_version: string;
}

interface ExperimentFoundationV2MetricDefinitionSemanticContentV1 {
  schema_version: 'v1';
  metric_key: string;
  display_name: string;
  direction: ExperimentFoundationV2MetricDirection;
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
  evaluator_binding: ExperimentFoundationV2EvaluatorBindingV1;
}

export interface ExperimentFoundationV2MetricDefinitionDraftContentV1
  extends ExperimentFoundationV2MetricDefinitionSemanticContentV1 {}
export interface ExperimentFoundationV2MetricDefinitionRevisionContentV1
  extends ExperimentFoundationV2MetricDefinitionSemanticContentV1 {}

interface ExperimentFoundationV2BenchmarkSemanticContentV1 {
  schema_version: 'v1';
  benchmark_key: string;
  display_name: string;
  description: string;
  corpus_dataset: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'Dataset' };
  query_workload_dataset: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'Dataset';
  };
}

export interface ExperimentFoundationV2BenchmarkDraftContentV1
  extends ExperimentFoundationV2BenchmarkSemanticContentV1 {}
export interface ExperimentFoundationV2BenchmarkRevisionContentV1
  extends ExperimentFoundationV2BenchmarkSemanticContentV1 {}

export interface ExperimentFoundationV2MetricContractRuleV1 {
  rule_id: string;
  rule_type: 'metric_contract@v1';
  metric_definition: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  };
  metric_key: string;
  required_cardinality: number;
  split_key: string;
  value_type: ExperimentFoundationV2MetricValueType;
  unit: string;
  finite_required: boolean;
}

export interface ExperimentFoundationV2ArtifactContractRuleV1 {
  rule_id: string;
  rule_type: 'artifact_contract@v1';
  artifact_kind: string;
  file_name: string;
  required_cardinality: number;
  content_hash_required: boolean;
  parser_binding: string;
}

export type ExperimentFoundationV2RequiredRuleV1 =
  | ExperimentFoundationV2MetricContractRuleV1
  | ExperimentFoundationV2ArtifactContractRuleV1;

interface ExperimentFoundationV2EvaluationProtocolSemanticContentV2 {
  schema_version: 'v2';
  protocol_key: string;
  display_name: string;
  benchmark_dependency: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'Benchmark';
  };
  metric_dependencies: Array<
    ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'MetricDefinition' }
  >;
  required_rules: ExperimentFoundationV2RequiredRuleV1[];
}

export interface ExperimentFoundationV2EvaluationProtocolDraftContentV2
  extends ExperimentFoundationV2EvaluationProtocolSemanticContentV2 {}
export interface ExperimentFoundationV2EvaluationProtocolRevisionContentV2
  extends ExperimentFoundationV2EvaluationProtocolSemanticContentV2 {}

export interface ExperimentFoundationV2UpdateDatasetDraftRequest {
  expected_state_version: number;
  dataset_draft: ExperimentFoundationV2DatasetDraftContentV1;
}
export interface ExperimentFoundationV2UpdateDataPolicyDraftRequest {
  expected_state_version: number;
  data_policy_draft: ExperimentFoundationV2DataPolicyDraftContentV1;
}
export interface ExperimentFoundationV2UpdateMetricDefinitionDraftRequest {
  expected_state_version: number;
  metric_definition_draft: ExperimentFoundationV2MetricDefinitionDraftContentV1;
}
export interface ExperimentFoundationV2UpdateBenchmarkDraftRequest {
  expected_state_version: number;
  benchmark_draft: ExperimentFoundationV2BenchmarkDraftContentV1;
}
export interface ExperimentFoundationV2UpdateEvaluationProtocolDraftRequest {
  expected_state_version: number;
  evaluation_protocol_draft: ExperimentFoundationV2EvaluationProtocolDraftContentV2;
}

export interface ExperimentFoundationV2FreezeDraftRequest {
  expected_state_version: number;
  business_idempotency_key: string;
}

interface ExperimentFoundationV2AssetIdentityBase {
  logical_id: string;
  draft_state_version: number;
  current_revision_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExperimentFoundationDatasetV2
  extends ExperimentFoundationV2AssetIdentityBase {
  dataset_key: string;
  dataset_draft: ExperimentFoundationV2DatasetDraftContentV1 | null;
}
export interface ExperimentFoundationDataPolicyV2
  extends ExperimentFoundationV2AssetIdentityBase {
  policy_key: string;
  data_policy_draft: ExperimentFoundationV2DataPolicyDraftContentV1 | null;
}
export interface ExperimentFoundationMetricDefinitionV2
  extends ExperimentFoundationV2AssetIdentityBase {
  metric_key: string;
  metric_definition_draft: ExperimentFoundationV2MetricDefinitionDraftContentV1 | null;
}
export interface ExperimentFoundationBenchmarkV2
  extends ExperimentFoundationV2AssetIdentityBase {
  benchmark_key: string;
  benchmark_draft: ExperimentFoundationV2BenchmarkDraftContentV1 | null;
}
export interface ExperimentFoundationEvaluationProtocolV2
  extends ExperimentFoundationV2AssetIdentityBase {
  protocol_key: string;
  evaluation_protocol_draft: ExperimentFoundationV2EvaluationProtocolDraftContentV2 | null;
}

interface ExperimentFoundationV2AssetRevisionBase {
  logical_id: string;
  revision_id: string;
  revision_sequence: number;
  schema_version: string;
  hash_profile: 'ef-asset-semantic-json@v1';
  content_hash: string;
  created_at: string;
}

export interface ExperimentFoundationDatasetRevisionV2
  extends ExperimentFoundationV2AssetRevisionBase {
  dataset_revision: ExperimentFoundationV2DatasetRevisionContentV1;
}
export interface ExperimentFoundationDataPolicyRevisionV2
  extends ExperimentFoundationV2AssetRevisionBase {
  data_policy_revision: ExperimentFoundationV2DataPolicyRevisionContentV1;
}
export interface ExperimentFoundationMetricDefinitionRevisionV2
  extends ExperimentFoundationV2AssetRevisionBase {
  metric_definition_revision: ExperimentFoundationV2MetricDefinitionRevisionContentV1;
}
export interface ExperimentFoundationBenchmarkRevisionV2
  extends ExperimentFoundationV2AssetRevisionBase {
  benchmark_revision: ExperimentFoundationV2BenchmarkRevisionContentV1;
}
export interface ExperimentFoundationEvaluationProtocolRevisionV2
  extends ExperimentFoundationV2AssetRevisionBase {
  evaluation_protocol_revision: ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
}

export const EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES = [
  'registered',
  'activated',
  'deprecated',
  'revoked',
  'location_available',
  'location_unavailable',
] as const;
export type ExperimentFoundationV2LifecycleEventType =
  (typeof EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES)[number];

export interface ExperimentFoundationAssetLifecycleEventV2 {
  lifecycle_event_id: string;
  asset: ExperimentFoundationV2ExactAssetRevisionRef;
  lifecycle_sequence: number;
  event_type: ExperimentFoundationV2LifecycleEventType;
  reason_code: string;
  note: string | null;
  occurred_at: string;
}

export interface ExperimentFoundationAssetLifecycleProjectionV2 {
  asset: ExperimentFoundationV2ExactAssetRevisionRef;
  projection_state_version: number;
  lifecycle_sequence: number;
  lifecycle_status: ExperimentFoundationV2LifecycleStatus;
  location_available: boolean;
  source_event_id: string;
  updated_at: string;
}

export interface ExperimentFoundationReadinessBlockerV2 {
  reason_code: string;
  dependency_ordinal: number | null;
}

export interface ExperimentFoundationReadinessQualificationSnapshotV2 {
  target_lifecycle_sequence: number;
  dependency_count: number;
  all_dependencies_active: boolean;
  all_required_rules_supported: boolean;
}

export interface ExperimentFoundationReadinessAttestationV2 {
  readiness_attestation_id: string;
  target: ExperimentFoundationV2ExactAssetRevisionRef;
  status: ExperimentFoundationV2ReadinessStatus;
  evaluator_profile_version: string;
  evaluator_profile_hash: string;
  dependency_manifest_hash: string;
  qualification_snapshot: ExperimentFoundationReadinessQualificationSnapshotV2;
  blockers: ExperimentFoundationReadinessBlockerV2[];
  attestation_hash: string;
  created_at: string;
}

export interface ExperimentFoundationReadinessDependencyV2 {
  readiness_attestation_id: string;
  ordinal: number;
  dependency: ExperimentFoundationV2ExactAssetRevisionRef;
}

export interface ExperimentFoundationVersionLockDependencyV2 {
  version_lock_id: string;
  ordinal: number;
  dependency: ExperimentFoundationV2ExactAssetRevisionRef;
}

export interface ExperimentFoundationVersionLockV2 {
  version_lock_id: string;
  materialization_key: string;
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  dependency_manifest_hash: string;
  dependency_count: number;
  lock_hash: string;
  created_at: string;
}

export interface ExperimentFoundationRunRecipeSnapshotV2 {
  recipe_schema_version: 'v1';
  entrypoint: string;
  arguments: string[];
  environment_keys: string[];
}

export interface ExperimentFoundationRunRecipeV2 {
  run_recipe_id: string;
  materialization_key: string;
  version_lock_id: string;
  readiness_attestation_id: string;
  recipe_snapshot: ExperimentFoundationRunRecipeSnapshotV2;
  recipe_hash: string;
  created_at: string;
}

export interface ExperimentFoundationTrainingTaskCommandSnapshotV2 {
  command: string;
  arguments: string[];
}

export const EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS = [
  'simulation_lifecycle_trace',
  'simulation_provider_metadata',
  'simulation_collection_log',
] as const;
export type ExperimentFoundationV2TrainingTaskOutputKey =
  (typeof EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS)[number];

export interface ExperimentFoundationTrainingTaskIoSnapshotV2 {
  input_keys: string[];
  output_keys: ExperimentFoundationV2TrainingTaskOutputKey[];
}

export interface ExperimentFoundationTrainingTaskResourceSnapshotV2 {
  cpu_cores: number;
  memory_mb: number;
}

export interface ExperimentFoundationTrainingTaskRetrySnapshotV2 {
  max_attempts: number;
}

export interface ExperimentFoundationTrainingTaskSpecSnapshotV2 {
  schema_version: 'v1';
  command_snapshot: ExperimentFoundationTrainingTaskCommandSnapshotV2;
  io_snapshot: ExperimentFoundationTrainingTaskIoSnapshotV2;
  resource_snapshot: ExperimentFoundationTrainingTaskResourceSnapshotV2;
  retry_snapshot: ExperimentFoundationTrainingTaskRetrySnapshotV2;
}

export interface ExperimentFoundationTrainingTaskSpecV2 {
  training_task_spec_id: string;
  materialization_key: string;
  run_recipe_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_cell_id: string;
  external_pi_cell_hash: string;
  command_snapshot: ExperimentFoundationTrainingTaskCommandSnapshotV2;
  io_snapshot: ExperimentFoundationTrainingTaskIoSnapshotV2;
  resource_snapshot: ExperimentFoundationTrainingTaskResourceSnapshotV2;
  retry_snapshot: ExperimentFoundationTrainingTaskRetrySnapshotV2;
  task_spec_hash: string;
  created_at: string;
}

export interface ExperimentFoundationRunV2 {
  run_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_branch_revision_sequence: number;
  run_manifest_hash: string;
  cell_count: number;
  frozen_at: string;
}

export interface ExperimentFoundationRunCellV2 {
  run_cell_id: string;
  run_id: string;
  ordinal: number;
  cell_key: string;
  external_pi_cell_id: string;
  external_pi_cell_hash: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  seed: number;
  repeat_index: number;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const timestampSchema = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const positiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const jsonSafeNonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: EXPERIMENT_V2_JSON_SAFE_INTEGER_MAX,
} as const;

function exactAssetRevisionRefFor(assetType?: ExperimentFoundationV2AssetType) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
    properties: {
      asset_type: assetType
        ? { type: 'string', const: assetType }
        : { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_ASSET_TYPES] },
      logical_id: stringId,
      revision_id: stringId,
      revision_sequence: positiveInteger,
      content_hash: hashSchema,
    },
  } as const;
}

export const experimentFoundationV2ExactAssetRevisionRefSchema =
  exactAssetRevisionRefFor();

export const experimentFoundationV2ChecksumEntrySnapshotV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['path', 'byte_size', 'checksum'],
  properties: {
    path: stringId,
    byte_size: jsonSafeNonNegativeInteger,
    checksum: stringId,
  },
} as const;

export const experimentFoundationV2ChecksumManifestSnapshotV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['manifest_version', 'algorithm', 'entries', 'aggregate_checksum'],
  properties: {
    manifest_version: { type: 'string', const: 'v1' },
    algorithm: { type: 'string', enum: ['sha256', 'sha512'] },
    entries: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationV2ChecksumEntrySnapshotV1Schema,
    },
    aggregate_checksum: stringId,
  },
} as const;

export const experimentFoundationV2SplitSnapshotV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ordinal', 'split_key', 'split_role', 'source_selector'],
  properties: {
    ordinal: positiveInteger,
    split_key: stringId,
    split_role: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_SPLIT_ROLES] },
    source_selector: stringId,
  },
} as const;

export const experimentFoundationV2SplitProtocolSnapshotV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['protocol_version', 'splits'],
  properties: {
    protocol_version: { type: 'string', const: 'v1' },
    splits: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationV2SplitSnapshotV1Schema,
    },
  },
} as const;

const datasetSourceIdentitySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_name', 'source_revision', 'source_uri'],
  properties: {
    source_name: stringId,
    source_revision: stringId,
    source_uri: stringId,
  },
} as const;

const datasetSemanticContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'dataset_key',
    'display_name',
    'version_label',
    'dataset_role',
    'source_identity',
    'checksum_manifest',
    'split_protocol',
    'data_policy',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    dataset_key: stringId,
    display_name: stringId,
    version_label: stringId,
    dataset_role: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_DATASET_ROLES] },
    source_identity: datasetSourceIdentitySchema,
    checksum_manifest: experimentFoundationV2ChecksumManifestSnapshotV1Schema,
    split_protocol: experimentFoundationV2SplitProtocolSnapshotV1Schema,
    data_policy: exactAssetRevisionRefFor('DataPolicy'),
  },
} as const;

export const experimentFoundationV2DatasetDraftContentV1Schema = {
  ...datasetSemanticContentSchema,
} as const;
export const experimentFoundationV2DatasetRevisionContentV1Schema = {
  ...datasetSemanticContentSchema,
} as const;

const dataPolicySemanticContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'policy_key',
    'display_name',
    'license_expression',
    'access_level',
    'source_terms_uri',
    'redistribution_allowed',
    'commercial_use_allowed',
    'use_constraints',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    policy_key: stringId,
    display_name: stringId,
    license_expression: stringId,
    access_level: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_V2_DATA_POLICY_ACCESS_LEVELS],
    },
    source_terms_uri: stringId,
    redistribution_allowed: { type: 'boolean' },
    commercial_use_allowed: { type: 'boolean' },
    use_constraints: { type: 'array', items: stringId },
  },
} as const;

export const experimentFoundationV2DataPolicyDraftContentV1Schema = {
  ...dataPolicySemanticContentSchema,
} as const;
export const experimentFoundationV2DataPolicyRevisionContentV1Schema = {
  ...dataPolicySemanticContentSchema,
} as const;

const evaluatorBindingSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['evaluator_key', 'evaluator_version'],
  properties: {
    evaluator_key: stringId,
    evaluator_version: stringId,
  },
} as const;

const metricDefinitionSemanticContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'metric_key',
    'display_name',
    'direction',
    'value_type',
    'unit',
    'evaluator_binding',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    metric_key: stringId,
    display_name: stringId,
    direction: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_METRIC_DIRECTIONS] },
    value_type: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES] },
    unit: stringId,
    evaluator_binding: evaluatorBindingSchema,
  },
} as const;

export const experimentFoundationV2MetricDefinitionDraftContentV1Schema = {
  ...metricDefinitionSemanticContentSchema,
} as const;
export const experimentFoundationV2MetricDefinitionRevisionContentV1Schema = {
  ...metricDefinitionSemanticContentSchema,
} as const;

const benchmarkSemanticContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'benchmark_key',
    'display_name',
    'description',
    'corpus_dataset',
    'query_workload_dataset',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    benchmark_key: stringId,
    display_name: stringId,
    description: stringId,
    corpus_dataset: exactAssetRevisionRefFor('Dataset'),
    query_workload_dataset: exactAssetRevisionRefFor('Dataset'),
  },
} as const;

export const experimentFoundationV2BenchmarkDraftContentV1Schema = {
  ...benchmarkSemanticContentSchema,
} as const;
export const experimentFoundationV2BenchmarkRevisionContentV1Schema = {
  ...benchmarkSemanticContentSchema,
} as const;

export const experimentFoundationV2MetricContractRuleV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'rule_id',
    'rule_type',
    'metric_definition',
    'metric_key',
    'required_cardinality',
    'split_key',
    'value_type',
    'unit',
    'finite_required',
  ],
  properties: {
    rule_id: stringId,
    rule_type: { type: 'string', const: 'metric_contract@v1' },
    metric_definition: exactAssetRevisionRefFor('MetricDefinition'),
    metric_key: stringId,
    required_cardinality: positiveInteger,
    split_key: stringId,
    value_type: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_METRIC_VALUE_TYPES] },
    unit: stringId,
    finite_required: { type: 'boolean' },
  },
} as const;

export const experimentFoundationV2ArtifactContractRuleV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'rule_id',
    'rule_type',
    'artifact_kind',
    'file_name',
    'required_cardinality',
    'content_hash_required',
    'parser_binding',
  ],
  properties: {
    rule_id: stringId,
    rule_type: { type: 'string', const: 'artifact_contract@v1' },
    artifact_kind: stringId,
    file_name: stringId,
    required_cardinality: positiveInteger,
    content_hash_required: { type: 'boolean' },
    parser_binding: stringId,
  },
} as const;

export const experimentFoundationV2RequiredRuleV1Schema = {
  oneOf: [
    experimentFoundationV2MetricContractRuleV1Schema,
    experimentFoundationV2ArtifactContractRuleV1Schema,
  ],
} as const;

const evaluationProtocolSemanticContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'protocol_key',
    'display_name',
    'benchmark_dependency',
    'metric_dependencies',
    'required_rules',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v2' },
    protocol_key: stringId,
    display_name: stringId,
    benchmark_dependency: exactAssetRevisionRefFor('Benchmark'),
    metric_dependencies: {
      type: 'array',
      minItems: 1,
      items: exactAssetRevisionRefFor('MetricDefinition'),
    },
    required_rules: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationV2RequiredRuleV1Schema,
    },
  },
} as const;

export const experimentFoundationV2EvaluationProtocolDraftContentV2Schema = {
  ...evaluationProtocolSemanticContentSchema,
} as const;
export const experimentFoundationV2EvaluationProtocolRevisionContentV2Schema = {
  ...evaluationProtocolSemanticContentSchema,
} as const;

function updateDraftRequestSchema(
  draftProperty: string,
  draftSchema: Readonly<Record<string, unknown>>,
) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['expected_state_version', draftProperty],
    properties: {
      expected_state_version: positiveInteger,
      [draftProperty]: draftSchema,
    },
  } as const;
}

export const experimentFoundationV2UpdateDatasetDraftRequestSchema =
  updateDraftRequestSchema('dataset_draft', experimentFoundationV2DatasetDraftContentV1Schema);
export const experimentFoundationV2UpdateDataPolicyDraftRequestSchema =
  updateDraftRequestSchema(
    'data_policy_draft',
    experimentFoundationV2DataPolicyDraftContentV1Schema,
  );
export const experimentFoundationV2UpdateMetricDefinitionDraftRequestSchema =
  updateDraftRequestSchema(
    'metric_definition_draft',
    experimentFoundationV2MetricDefinitionDraftContentV1Schema,
  );
export const experimentFoundationV2UpdateBenchmarkDraftRequestSchema =
  updateDraftRequestSchema('benchmark_draft', experimentFoundationV2BenchmarkDraftContentV1Schema);
export const experimentFoundationV2UpdateEvaluationProtocolDraftRequestSchema =
  updateDraftRequestSchema(
    'evaluation_protocol_draft',
    experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
  );

export const experimentFoundationV2FreezeDraftRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['expected_state_version', 'business_idempotency_key'],
  properties: {
    expected_state_version: positiveInteger,
    business_idempotency_key: stringId,
  },
} as const;

function assetIdentitySchema(
  keyProperty: string,
  draftProperty: string,
  draftSchema: Readonly<Record<string, unknown>>,
) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'logical_id',
      keyProperty,
      'draft_state_version',
      draftProperty,
      'current_revision_id',
      'created_at',
      'updated_at',
    ],
    properties: {
      logical_id: stringId,
      [keyProperty]: stringId,
      draft_state_version: positiveInteger,
      [draftProperty]: { anyOf: [draftSchema, { type: 'null' }] },
      current_revision_id: nullableStringId,
      created_at: timestampSchema,
      updated_at: timestampSchema,
    },
  } as const;
}

export const experimentFoundationDatasetV2Schema = assetIdentitySchema(
  'dataset_key',
  'dataset_draft',
  experimentFoundationV2DatasetDraftContentV1Schema,
);
export const experimentFoundationDataPolicyV2Schema = assetIdentitySchema(
  'policy_key',
  'data_policy_draft',
  experimentFoundationV2DataPolicyDraftContentV1Schema,
);
export const experimentFoundationMetricDefinitionV2Schema = assetIdentitySchema(
  'metric_key',
  'metric_definition_draft',
  experimentFoundationV2MetricDefinitionDraftContentV1Schema,
);
export const experimentFoundationBenchmarkV2Schema = assetIdentitySchema(
  'benchmark_key',
  'benchmark_draft',
  experimentFoundationV2BenchmarkDraftContentV1Schema,
);
export const experimentFoundationEvaluationProtocolV2Schema = assetIdentitySchema(
  'protocol_key',
  'evaluation_protocol_draft',
  experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
);

function assetRevisionSchema(
  contentProperty: string,
  schemaVersion: 'v1' | 'v2',
  contentSchema: Readonly<Record<string, unknown>>,
) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'logical_id',
      'revision_id',
      'revision_sequence',
      'schema_version',
      'hash_profile',
      'content_hash',
      contentProperty,
      'created_at',
    ],
    properties: {
      logical_id: stringId,
      revision_id: stringId,
      revision_sequence: positiveInteger,
      schema_version: { type: 'string', const: schemaVersion },
      hash_profile: { type: 'string', const: 'ef-asset-semantic-json@v1' },
      content_hash: hashSchema,
      [contentProperty]: contentSchema,
      created_at: timestampSchema,
    },
  } as const;
}

export const experimentFoundationDatasetRevisionV2Schema = assetRevisionSchema(
  'dataset_revision',
  'v1',
  experimentFoundationV2DatasetRevisionContentV1Schema,
);
export const experimentFoundationDataPolicyRevisionV2Schema = assetRevisionSchema(
  'data_policy_revision',
  'v1',
  experimentFoundationV2DataPolicyRevisionContentV1Schema,
);
export const experimentFoundationMetricDefinitionRevisionV2Schema = assetRevisionSchema(
  'metric_definition_revision',
  'v1',
  experimentFoundationV2MetricDefinitionRevisionContentV1Schema,
);
export const experimentFoundationBenchmarkRevisionV2Schema = assetRevisionSchema(
  'benchmark_revision',
  'v1',
  experimentFoundationV2BenchmarkRevisionContentV1Schema,
);
export const experimentFoundationEvaluationProtocolRevisionV2Schema = assetRevisionSchema(
  'evaluation_protocol_revision',
  'v2',
  experimentFoundationV2EvaluationProtocolRevisionContentV2Schema,
);

export const experimentFoundationTrainingTaskIoSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['input_keys', 'output_keys'],
  properties: {
    input_keys: { type: 'array', minItems: 1, items: stringId },
    output_keys: {
      type: 'array',
      minItems: 1,
      maxItems: EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS.length,
      uniqueItems: true,
      items: {
        type: 'string',
        enum: EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
      },
    },
  },
} as const;

export const experimentFoundationRunRecipeSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['recipe_schema_version', 'entrypoint', 'arguments', 'environment_keys'],
  properties: {
    recipe_schema_version: { type: 'string', const: 'v1' },
    entrypoint: stringId,
    arguments: { type: 'array', items: stringId },
    environment_keys: { type: 'array', uniqueItems: true, items: stringId },
  },
} as const;

export const experimentFoundationTrainingTaskSpecSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'command_snapshot',
    'io_snapshot',
    'resource_snapshot',
    'retry_snapshot',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v1' },
    command_snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['command', 'arguments'],
      properties: {
        command: stringId,
        arguments: { type: 'array', items: stringId },
      },
    },
    io_snapshot: experimentFoundationTrainingTaskIoSnapshotV2Schema,
    resource_snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['cpu_cores', 'memory_mb'],
      properties: {
        cpu_cores: positiveInteger,
        memory_mb: positiveInteger,
      },
    },
    retry_snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['max_attempts'],
      properties: {
        max_attempts: positiveInteger,
      },
    },
  },
} as const;

export const experimentFoundationReadinessQualificationSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target_lifecycle_sequence',
    'dependency_count',
    'all_dependencies_active',
    'all_required_rules_supported',
  ],
  properties: {
    target_lifecycle_sequence: positiveInteger,
    dependency_count: {
      type: 'integer',
      minimum: 0,
      maximum: EXPERIMENT_V2_INT32_MAX,
    },
    all_dependencies_active: { type: 'boolean' },
    all_required_rules_supported: { type: 'boolean' },
  },
} as const;

export const experimentFoundationReadinessBlockerV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['reason_code', 'dependency_ordinal'],
  properties: {
    reason_code: stringId,
    dependency_ordinal: { anyOf: [positiveInteger, { type: 'null' }] },
  },
} as const;

export const experimentFoundationReadinessAttestationV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'readiness_attestation_id',
    'target',
    'status',
    'evaluator_profile_version',
    'evaluator_profile_hash',
    'dependency_manifest_hash',
    'qualification_snapshot',
    'blockers',
    'attestation_hash',
    'created_at',
  ],
  properties: {
    readiness_attestation_id: stringId,
    target: experimentFoundationV2ExactAssetRevisionRefSchema,
    status: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_V2_READINESS_STATUSES] },
    evaluator_profile_version: stringId,
    evaluator_profile_hash: hashSchema,
    dependency_manifest_hash: hashSchema,
    qualification_snapshot: experimentFoundationReadinessQualificationSnapshotV2Schema,
    blockers: { type: 'array', items: experimentFoundationReadinessBlockerV2Schema },
    attestation_hash: hashSchema,
    created_at: timestampSchema,
  },
} as const;

export const experimentFoundationReadinessDependencyV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['readiness_attestation_id', 'ordinal', 'dependency'],
  properties: {
    readiness_attestation_id: stringId,
    ordinal: positiveInteger,
    dependency: experimentFoundationV2ExactAssetRevisionRefSchema,
  },
} as const;
