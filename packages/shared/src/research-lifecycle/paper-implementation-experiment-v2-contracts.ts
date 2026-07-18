import {
  experimentFoundationV2ExactAssetRevisionRefSchema,
  type ExperimentFoundationV2ExactAssetRevisionRef,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_INT32_MAX,
  EXPERIMENT_V2_INT32_MIN,
  EXPERIMENT_V2_HASH_PATTERN,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_V2_TOP_LEVEL_ERROR_CODES = [
  'INVALID_PAYLOAD',
  'NOT_FOUND',
  'VERSION_CONFLICT',
  'GATE_CONSTRAINT_FAILED',
  'CONCURRENT_ADVANCE',
] as const;
export type ExperimentV2TopLevelErrorCode =
  (typeof EXPERIMENT_V2_TOP_LEVEL_ERROR_CODES)[number];
export type ExperimentV2HttpErrorCode = ExperimentV2TopLevelErrorCode | 'INTERNAL_ERROR';

export const LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE =
  'LEGACY_SCIENTIFIC_WRITER_CLOSED' as const;

export const EXPERIMENT_V2_REASON_CODES = [
  'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
  'LEGACY_RECORD_NOT_ELIGIBLE',
  LEGACY_SCIENTIFIC_WRITER_CLOSED_REASON_CODE,
  'V2_TYPED_SNAPSHOT_INVALID',
  'WORK_ORDER_CELL_PLAN_INVALID',
  'SERVER_CANONICAL_HASH_MISMATCH',
  'ADMISSION_IDEMPOTENCY_CONFLICT',
  'BRANCH_SCOPE_CONFLICT',
  'BRANCH_REVISION_CONFLICT',
  'BRANCH_CURRENT_REVISION_CAS_CONFLICT',
  'ASSET_IDENTITY_CONFLICT',
  'ASSET_REVISION_CONFLICT',
  'ASSET_DRAFT_CAS_CONFLICT',
  'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
  'ASSET_LIFECYCLE_PROJECTION_CAS_CONFLICT',
  'ASSET_LIFECYCLE_TRANSITION_INVALID',
  'D19_FIXTURE_IMPORT_CONFLICT',
  'ASSET_LIFECYCLE_NOT_ACTIVE',
  'ASSET_REVISION_REVOKED',
  'EXACT_REVISION_REQUIRED',
  'EXACT_REVISION_NOT_FOUND',
  'READINESS_DEPENDENCY_DRIFT',
  'UNSUPPORTED_RULE',
  'MATERIALIZATION_KEY_CONFLICT',
  'RUN_CELL_PARITY_MISMATCH',
  'RUN_ALREADY_FROZEN',
  'RUN_MANIFEST_CONFLICT',
  'INTEGRATION_EVENT_TYPE_UNSUPPORTED',
  'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
  'INTEGRATION_EVENT_PRODUCER_INVALID',
  'INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH',
  'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  'INTEGRATION_PREREQUISITE_NOT_READY',
  'BRANCH_HEAD_CAS_CONFLICT',
  'BRANCH_HEAD_SCOPE_CONFLICT',
  'EF_V2_WORKFLOW_SIMULATION_DISABLED',
  'EXECUTION_HEAD_ACK_REQUIRED',
  'EXECUTION_RUN_NOT_CURRENT_HEAD',
  'EXECUTION_SCOPE_DRIFT',
  'EXECUTION_READINESS_DRIFT',
  'EXECUTION_ATTEMPT_NOT_FOUND',
  'PROVIDER_PAYLOAD_INVALID',
  'PROVIDER_PAYLOAD_CONFLICT',
  'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
  'EXECUTION_ATTEMPT_LIMIT_EXHAUSTED',
  'EXECUTION_ATTEMPT_STATE_CONFLICT',
  'PROVIDER_COMMAND_LEASE_CONFLICT',
  'PROVIDER_RESPONSE_INVALID',
  'COLLECTION_ATTEMPT_CONFLICT',
] as const;
export type ExperimentV2ReasonCode = (typeof EXPERIMENT_V2_REASON_CODES)[number];

export const EXPERIMENT_V2_INTEGRATION_OUTCOMES = [
  'processed',
  'ignored_stale',
  'retryable',
  'terminal_conflict',
] as const;
export type ExperimentV2IntegrationOutcome =
  (typeof EXPERIMENT_V2_INTEGRATION_OUTCOMES)[number];

export interface ExperimentV2ErrorDetails {
  reason_code: ExperimentV2ReasonCode;
}

export interface ExperimentV2ErrorEnvelope {
  error: {
    code: ExperimentV2HttpErrorCode;
    message: string;
    details?: ExperimentV2ErrorDetails;
  };
}

export const EXPERIMENT_V2_EVENT_TYPES = [
  'WorkOrderRevisionAdmitted',
  'RunManifestFrozen',
  'BranchHeadAdvanced',
] as const;
export type ExperimentV2EventType = (typeof EXPERIMENT_V2_EVENT_TYPES)[number];

export const EXPERIMENT_V2_EVENT_SCHEMA_VERSION = 'v1' as const;
export const EXPERIMENT_V2_PRODUCER_DOMAINS = [
  'PaperImplementation',
  'ExperimentFoundation',
] as const;
export type ExperimentV2ProducerDomain = (typeof EXPERIMENT_V2_PRODUCER_DOMAINS)[number];

export type PaperImplementationExperimentV2ParameterScalar =
  | string
  | number
  | boolean
  | null;

export interface PaperImplementationExperimentV2ParameterValue {
  name: string;
  value: PaperImplementationExperimentV2ParameterScalar;
}

export interface PaperImplementationExperimentV2RequiredMetricResult {
  metric_definition: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  };
  required_cardinality: number;
}

export interface PaperImplementationExperimentV2RequiredArtifactResult {
  artifact_kind: string;
  required_cardinality: number;
}

export interface PaperImplementationExperimentV2RequiredResultContract {
  metrics: PaperImplementationExperimentV2RequiredMetricResult[];
  artifacts: PaperImplementationExperimentV2RequiredArtifactResult[];
}

export interface PaperImplementationExperimentV2ExactCellInput {
  cell_key: string;
  seed: number;
  repeat_index: number;
  parameters: PaperImplementationExperimentV2ParameterValue[];
  required_result_contract: PaperImplementationExperimentV2RequiredResultContract;
}

export interface PaperImplementationExperimentV2BranchFrame {
  frame_schema_version: 'v1';
  display_name: string;
  scientific_intent: string;
  comparison_role: 'primary' | 'baseline' | 'ablation' | 'robustness';
  parent_branch_key: string | null;
}

export interface PaperImplementationExperimentV2RunPolicy {
  max_attempts_per_cell: number;
  timeout_seconds: number;
}

export interface PaperImplementationExperimentV2WorkOrderRevisionSnapshot {
  work_order_schema_version: 'v1';
  title: string;
  objective: string;
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  asset_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  run_policy: PaperImplementationExperimentV2RunPolicy;
}

export interface PaperImplementationExperimentV2AdmissionRequest {
  branch_key: string;
  branch_frame: PaperImplementationExperimentV2BranchFrame;
  work_order_revision: PaperImplementationExperimentV2WorkOrderRevisionSnapshot;
  exact_cells: PaperImplementationExperimentV2ExactCellInput[];
  business_idempotency_key: string;
}

export interface PaperImplementationExperimentWorkOrderBranchV2 {
  branch_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_key: string;
  branch_frame: PaperImplementationExperimentV2BranchFrame;
  branch_frame_hash: string;
  state_version: number;
  current_admitted_revision_id: string | null;
  current_admitted_revision_sequence: number | null;
  head_run_id: string | null;
  head_run_manifest_hash: string | null;
  head_source_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaperImplementationExperimentWorkOrderRevisionV2 {
  work_order_revision_id: string;
  branch_id: string;
  revision_sequence: number;
  work_order_revision: PaperImplementationExperimentV2WorkOrderRevisionSnapshot;
  content_hash: string;
  cell_plan_hash: string;
  approved_plan_hash: string;
  created_at: string;
}

export interface PaperImplementationExperimentWorkOrderRevisionCellV2
  extends PaperImplementationExperimentV2ExactCellInput {
  work_order_cell_id: string;
  work_order_revision_id: string;
  ordinal: number;
  cell_hash: string;
}

export interface PaperImplementationExperimentWorkOrderAdmissionV2 {
  admission_id: string;
  work_order_revision_id: string;
  approved_plan_hash: string;
  business_idempotency_key: string;
  admitted_by: string;
  admitted_at: string;
}

export interface PaperImplementationExperimentV2AdmissionResponse {
  branch: PaperImplementationExperimentWorkOrderBranchV2;
  revision: PaperImplementationExperimentWorkOrderRevisionV2;
  cells: PaperImplementationExperimentWorkOrderRevisionCellV2[];
  admission: PaperImplementationExperimentWorkOrderAdmissionV2;
  replayed: boolean;
}

export interface ExperimentV2EventScope {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  branch_revision_sequence: number;
  cell_plan_hash: string;
  approved_plan_hash: string;
}

interface ExperimentV2EventEnvelopeBase<TEventType, TProducer, TPayload>
  extends ExperimentV2EventScope {
  event_id: string;
  event_type: TEventType;
  schema_version: 'v1';
  producer_domain: TProducer;
  occurred_at: string;
  correlation_id: string;
  causation_id: string;
  business_idempotency_key: string;
  payload_hash: string;
  payload: TPayload;
}

export interface WorkOrderRevisionAdmittedCellV1 {
  ordinal: number;
  work_order_cell_id: string;
  cell_key: string;
  cell_hash: string;
  seed: number;
  repeat_index: number;
  parameters: PaperImplementationExperimentV2ParameterValue[];
  required_result_contract: PaperImplementationExperimentV2RequiredResultContract;
}

export interface WorkOrderRevisionAdmittedPayloadV1 {
  admission_id: string;
  branch_frame_hash: string;
  work_order_revision: PaperImplementationExperimentV2WorkOrderRevisionSnapshot;
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  asset_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  exact_cells: WorkOrderRevisionAdmittedCellV1[];
}

export type WorkOrderRevisionAdmittedEventV1 = ExperimentV2EventEnvelopeBase<
  'WorkOrderRevisionAdmitted',
  'PaperImplementation',
  WorkOrderRevisionAdmittedPayloadV1
>;

export interface RunManifestFrozenTaskSpecBindingV1 {
  ordinal: number;
  work_order_cell_id: string;
  cell_key: string;
  cell_hash: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
}

export interface RunManifestFrozenPayloadV1 {
  source_event_id: string;
  version_lock_id: string;
  version_lock_hash: string;
  run_recipe_id: string;
  run_recipe_hash: string;
  run_id: string;
  run_manifest_hash: string;
  task_spec_bindings: RunManifestFrozenTaskSpecBindingV1[];
}

export type RunManifestFrozenEventV1 = ExperimentV2EventEnvelopeBase<
  'RunManifestFrozen',
  'ExperimentFoundation',
  RunManifestFrozenPayloadV1
>;

export interface BranchHeadAdvancedPayloadV1 {
  source_event_id: string;
  run_id: string;
  run_manifest_hash: string;
  accepted_revision_sequence: number;
  branch_state_version: number;
}

export type BranchHeadAdvancedEventV1 = ExperimentV2EventEnvelopeBase<
  'BranchHeadAdvanced',
  'PaperImplementation',
  BranchHeadAdvancedPayloadV1
>;

export type ExperimentV2IntegrationEvent =
  | WorkOrderRevisionAdmittedEventV1
  | RunManifestFrozenEventV1
  | BranchHeadAdvancedEventV1;

export interface PaperImplementationExperimentIntegrationInboxV2 {
  inbox_id: string;
  consumer_name: string;
  source_event_id: string;
  business_idempotency_key: string;
  payload_hash: string;
  source_event_hash: string;
  scope: ExperimentV2EventScope;
  outcome: ExperimentV2IntegrationOutcome;
  reason_code: ExperimentV2ReasonCode | null;
  processed_at: string | null;
}

export interface PaperImplementationExperimentIntegrationOutboxV2 {
  outbox_id: string;
  aggregate_transition_key: string;
  event: WorkOrderRevisionAdmittedEventV1 | BranchHeadAdvancedEventV1;
  created_at: string;
}

export interface ExperimentFoundationIntegrationInboxV2 {
  inbox_id: string;
  consumer_name: string;
  source_event_id: string;
  business_idempotency_key: string;
  payload_hash: string;
  source_event_hash: string;
  scope: ExperimentV2EventScope;
  outcome: ExperimentV2IntegrationOutcome;
  reason_code: ExperimentV2ReasonCode | null;
  processed_at: string | null;
}

export interface ExperimentFoundationIntegrationOutboxV2 {
  outbox_id: string;
  aggregate_transition_key: string;
  event: RunManifestFrozenEventV1;
  created_at: string;
}

const stringId = { type: 'string', minLength: 1 } as const;
const timestampSchema = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const int32Integer = {
  type: 'integer',
  minimum: EXPERIMENT_V2_INT32_MIN,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const positiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const nonNegativeInteger = {
  type: 'integer',
  minimum: 0,
  maximum: EXPERIMENT_V2_INT32_MAX,
} as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const nullablePositiveInteger = { anyOf: [positiveInteger, { type: 'null' }] } as const;

export const experimentV2ErrorEnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      additionalProperties: false,
      required: ['code', 'message'],
      properties: {
        code: {
          type: 'string',
          enum: [...EXPERIMENT_V2_TOP_LEVEL_ERROR_CODES, 'INTERNAL_ERROR'],
        },
        message: stringId,
        details: {
          type: 'object',
          additionalProperties: false,
          required: ['reason_code'],
          properties: {
            reason_code: { type: 'string', enum: [...EXPERIMENT_V2_REASON_CODES] },
          },
        },
      },
    },
  },
} as const;

const parameterScalarSchema = {
  anyOf: [
    { type: 'string' },
    { type: 'number' },
    { type: 'boolean' },
    { type: 'null' },
  ],
} as const;

export const paperImplementationExperimentV2ParameterValueSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'value'],
  properties: {
    name: stringId,
    value: parameterScalarSchema,
  },
} as const;

export const paperImplementationExperimentV2RequiredMetricResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metric_definition', 'required_cardinality'],
  properties: {
    metric_definition: {
      ...experimentFoundationV2ExactAssetRevisionRefSchema,
      properties: {
        ...experimentFoundationV2ExactAssetRevisionRefSchema.properties,
        asset_type: { type: 'string', const: 'MetricDefinition' },
      },
    },
    required_cardinality: positiveInteger,
  },
} as const;

export const paperImplementationExperimentV2RequiredArtifactResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['artifact_kind', 'required_cardinality'],
  properties: {
    artifact_kind: stringId,
    required_cardinality: positiveInteger,
  },
} as const;

export const paperImplementationExperimentV2RequiredResultContractSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['metrics', 'artifacts'],
  properties: {
    metrics: {
      type: 'array',
      items: paperImplementationExperimentV2RequiredMetricResultSchema,
    },
    artifacts: {
      type: 'array',
      items: paperImplementationExperimentV2RequiredArtifactResultSchema,
    },
  },
} as const;

export const paperImplementationExperimentV2ExactCellInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['cell_key', 'seed', 'repeat_index', 'parameters', 'required_result_contract'],
  properties: {
    cell_key: stringId,
    seed: int32Integer,
    repeat_index: nonNegativeInteger,
    parameters: {
      type: 'array',
      items: paperImplementationExperimentV2ParameterValueSchema,
    },
    required_result_contract: paperImplementationExperimentV2RequiredResultContractSchema,
  },
} as const;

export const paperImplementationExperimentV2BranchFrameSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'frame_schema_version',
    'display_name',
    'scientific_intent',
    'comparison_role',
    'parent_branch_key',
  ],
  properties: {
    frame_schema_version: { type: 'string', const: 'v1' },
    display_name: stringId,
    scientific_intent: stringId,
    comparison_role: {
      type: 'string',
      enum: ['primary', 'baseline', 'ablation', 'robustness'],
    },
    parent_branch_key: nullableStringId,
  },
} as const;

export const paperImplementationExperimentV2RunPolicySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['max_attempts_per_cell', 'timeout_seconds'],
  properties: {
    max_attempts_per_cell: positiveInteger,
    timeout_seconds: positiveInteger,
  },
} as const;

export const paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_schema_version',
    'title',
    'objective',
    'readiness_attestation_id',
    'readiness_attestation_hash',
    'asset_dependencies',
    'run_policy',
  ],
  properties: {
    work_order_schema_version: { type: 'string', const: 'v1' },
    title: stringId,
    objective: stringId,
    readiness_attestation_id: stringId,
    readiness_attestation_hash: hashSchema,
    asset_dependencies: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationV2ExactAssetRevisionRefSchema,
    },
    run_policy: paperImplementationExperimentV2RunPolicySchema,
  },
} as const;

export const paperImplementationExperimentV2AdmissionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'branch_key',
    'branch_frame',
    'work_order_revision',
    'exact_cells',
    'business_idempotency_key',
  ],
  properties: {
    branch_key: stringId,
    branch_frame: paperImplementationExperimentV2BranchFrameSchema,
    work_order_revision: paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
    exact_cells: {
      type: 'array',
      minItems: 1,
      items: paperImplementationExperimentV2ExactCellInputSchema,
    },
    business_idempotency_key: stringId,
  },
} as const;

export const paperImplementationExperimentWorkOrderBranchV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'branch_id',
    'implementation_project_id',
    'validation_cycle_id',
    'branch_key',
    'branch_frame',
    'branch_frame_hash',
    'state_version',
    'current_admitted_revision_id',
    'current_admitted_revision_sequence',
    'head_run_id',
    'head_run_manifest_hash',
    'head_source_event_id',
    'created_at',
    'updated_at',
  ],
  properties: {
    branch_id: stringId,
    implementation_project_id: stringId,
    validation_cycle_id: stringId,
    branch_key: stringId,
    branch_frame: paperImplementationExperimentV2BranchFrameSchema,
    branch_frame_hash: hashSchema,
    state_version: positiveInteger,
    current_admitted_revision_id: nullableStringId,
    current_admitted_revision_sequence: nullablePositiveInteger,
    head_run_id: nullableStringId,
    head_run_manifest_hash: { anyOf: [hashSchema, { type: 'null' }] },
    head_source_event_id: nullableStringId,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  },
} as const;

export const paperImplementationExperimentWorkOrderRevisionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_revision_id',
    'branch_id',
    'revision_sequence',
    'work_order_revision',
    'content_hash',
    'cell_plan_hash',
    'approved_plan_hash',
    'created_at',
  ],
  properties: {
    work_order_revision_id: stringId,
    branch_id: stringId,
    revision_sequence: positiveInteger,
    work_order_revision: paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
    content_hash: hashSchema,
    cell_plan_hash: hashSchema,
    approved_plan_hash: hashSchema,
    created_at: timestampSchema,
  },
} as const;

export const paperImplementationExperimentWorkOrderRevisionCellV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_cell_id',
    'work_order_revision_id',
    'ordinal',
    'cell_key',
    'seed',
    'repeat_index',
    'parameters',
    'required_result_contract',
    'cell_hash',
  ],
  properties: {
    work_order_cell_id: stringId,
    work_order_revision_id: stringId,
    ordinal: positiveInteger,
    cell_key: stringId,
    seed: int32Integer,
    repeat_index: nonNegativeInteger,
    parameters: {
      type: 'array',
      items: paperImplementationExperimentV2ParameterValueSchema,
    },
    required_result_contract: paperImplementationExperimentV2RequiredResultContractSchema,
    cell_hash: hashSchema,
  },
} as const;

export const paperImplementationExperimentWorkOrderAdmissionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'admission_id',
    'work_order_revision_id',
    'approved_plan_hash',
    'business_idempotency_key',
    'admitted_by',
    'admitted_at',
  ],
  properties: {
    admission_id: stringId,
    work_order_revision_id: stringId,
    approved_plan_hash: hashSchema,
    business_idempotency_key: stringId,
    admitted_by: stringId,
    admitted_at: timestampSchema,
  },
} as const;

export const paperImplementationExperimentV2AdmissionResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'revision', 'cells', 'admission', 'replayed'],
  properties: {
    branch: paperImplementationExperimentWorkOrderBranchV2Schema,
    revision: paperImplementationExperimentWorkOrderRevisionV2Schema,
    cells: {
      type: 'array',
      minItems: 1,
      items: paperImplementationExperimentWorkOrderRevisionCellV2Schema,
    },
    admission: paperImplementationExperimentWorkOrderAdmissionV2Schema,
    replayed: { type: 'boolean' },
  },
} as const;

const experimentV2EventScopeProperties = {
  implementation_project_id: stringId,
  validation_cycle_id: stringId,
  branch_id: stringId,
  branch_key: stringId,
  work_order_revision_id: stringId,
  work_order_revision_hash: hashSchema,
  branch_revision_sequence: positiveInteger,
  cell_plan_hash: hashSchema,
  approved_plan_hash: hashSchema,
} as const;

const experimentV2EventScopeRequired = [
  'implementation_project_id',
  'validation_cycle_id',
  'branch_id',
  'branch_key',
  'work_order_revision_id',
  'work_order_revision_hash',
  'branch_revision_sequence',
  'cell_plan_hash',
  'approved_plan_hash',
] as const;

export const workOrderRevisionAdmittedCellV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ordinal',
    'work_order_cell_id',
    'cell_key',
    'cell_hash',
    'seed',
    'repeat_index',
    'parameters',
    'required_result_contract',
  ],
  properties: {
    ordinal: positiveInteger,
    work_order_cell_id: stringId,
    cell_key: stringId,
    cell_hash: hashSchema,
    seed: int32Integer,
    repeat_index: nonNegativeInteger,
    parameters: {
      type: 'array',
      items: paperImplementationExperimentV2ParameterValueSchema,
    },
    required_result_contract: paperImplementationExperimentV2RequiredResultContractSchema,
  },
} as const;

export const workOrderRevisionAdmittedPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'admission_id',
    'branch_frame_hash',
    'work_order_revision',
    'readiness_attestation_id',
    'readiness_attestation_hash',
    'asset_dependencies',
    'exact_cells',
  ],
  properties: {
    admission_id: stringId,
    branch_frame_hash: hashSchema,
    work_order_revision: paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
    readiness_attestation_id: stringId,
    readiness_attestation_hash: hashSchema,
    asset_dependencies: {
      type: 'array',
      minItems: 1,
      items: experimentFoundationV2ExactAssetRevisionRefSchema,
    },
    exact_cells: {
      type: 'array',
      minItems: 1,
      items: workOrderRevisionAdmittedCellV1Schema,
    },
  },
} as const;

export const runManifestFrozenTaskSpecBindingV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ordinal',
    'work_order_cell_id',
    'cell_key',
    'cell_hash',
    'training_task_spec_id',
    'training_task_spec_hash',
  ],
  properties: {
    ordinal: positiveInteger,
    work_order_cell_id: stringId,
    cell_key: stringId,
    cell_hash: hashSchema,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
  },
} as const;

export const runManifestFrozenPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_event_id',
    'version_lock_id',
    'version_lock_hash',
    'run_recipe_id',
    'run_recipe_hash',
    'run_id',
    'run_manifest_hash',
    'task_spec_bindings',
  ],
  properties: {
    source_event_id: stringId,
    version_lock_id: stringId,
    version_lock_hash: hashSchema,
    run_recipe_id: stringId,
    run_recipe_hash: hashSchema,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    task_spec_bindings: {
      type: 'array',
      minItems: 1,
      items: runManifestFrozenTaskSpecBindingV1Schema,
    },
  },
} as const;

export const branchHeadAdvancedPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'source_event_id',
    'run_id',
    'run_manifest_hash',
    'accepted_revision_sequence',
    'branch_state_version',
  ],
  properties: {
    source_event_id: stringId,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    accepted_revision_sequence: positiveInteger,
    branch_state_version: positiveInteger,
  },
} as const;

function integrationEventSchema(
  eventType: ExperimentV2EventType,
  producerDomain: ExperimentV2ProducerDomain,
  payloadSchema: Readonly<Record<string, unknown>>,
) {
  return {
    type: 'object',
    additionalProperties: false,
    required: [
      'event_id',
      'event_type',
      'schema_version',
      'producer_domain',
      'occurred_at',
      'correlation_id',
      'causation_id',
      'business_idempotency_key',
      ...experimentV2EventScopeRequired,
      'payload_hash',
      'payload',
    ],
    properties: {
      event_id: stringId,
      event_type: { type: 'string', const: eventType },
      schema_version: { type: 'string', const: EXPERIMENT_V2_EVENT_SCHEMA_VERSION },
      producer_domain: { type: 'string', const: producerDomain },
      occurred_at: timestampSchema,
      correlation_id: stringId,
      causation_id: stringId,
      business_idempotency_key: stringId,
      ...experimentV2EventScopeProperties,
      payload_hash: hashSchema,
      payload: payloadSchema,
    },
  } as const;
}

export const workOrderRevisionAdmittedEventV1Schema = integrationEventSchema(
  'WorkOrderRevisionAdmitted',
  'PaperImplementation',
  workOrderRevisionAdmittedPayloadV1Schema,
);

export const runManifestFrozenEventV1Schema = integrationEventSchema(
  'RunManifestFrozen',
  'ExperimentFoundation',
  runManifestFrozenPayloadV1Schema,
);

export const branchHeadAdvancedEventV1Schema = integrationEventSchema(
  'BranchHeadAdvanced',
  'PaperImplementation',
  branchHeadAdvancedPayloadV1Schema,
);

export const experimentV2IntegrationEventSchema = {
  oneOf: [
    workOrderRevisionAdmittedEventV1Schema,
    runManifestFrozenEventV1Schema,
    branchHeadAdvancedEventV1Schema,
  ],
} as const;
