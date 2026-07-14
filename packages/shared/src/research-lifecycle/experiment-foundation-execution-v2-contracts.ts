import {
  EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS,
  type ExperimentFoundationV2TrainingTaskOutputKey,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_HASH_PATTERN,
  EXPERIMENT_V2_INT32_MAX,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2 =
  'FakeAliyunPaiDlcSubmitPayload@v1' as const;
export const EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2 =
  'deterministic_fake_aliyun_pai_dlc@v1' as const;

export const EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2 = ['simulation'] as const;
export type ExperimentFoundationExecutionModeV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2 = [
  'non_production_fake_provider',
] as const;
export type ExperimentFoundationExecutionProvenanceV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_REASON_CODES_V2 = [
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
export type ExperimentFoundationExecutionReasonCodeV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_REASON_CODES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2 = [
  'prepared',
  'submitted',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type ExperimentFoundationExecutionAttemptStateV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_TERMINAL_REASON_CODES_V2 = [
  'simulation_succeeded',
  'simulation_failed',
  'operator_cancelled',
  'provider_response_invalid',
] as const;
export type ExperimentFoundationExecutionTerminalReasonCodeV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_TERMINAL_REASON_CODES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_CONTROL_REASON_CODES_V2 = [
  'operator_cancelled',
  'manual_reconcile',
] as const;
export type ExperimentFoundationExecutionControlReasonCodeV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_CONTROL_REASON_CODES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_EVENT_TYPES_V2 = [
  'created',
  'submitted',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'collection_prepared',
  'collection_collected',
  'collection_failed',
] as const;
export type ExperimentFoundationExecutionAttemptEventTypeV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_EVENT_TYPES_V2)[number];

export const EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2 = [
  'submit',
  'sync',
  'reconcile',
  'cancel',
  'collect',
] as const;
export type ExperimentFoundationProviderCommandOperationV2 =
  (typeof EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2)[number];

export const EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_STATES_V2 = [
  'pending',
  'claimed',
  'succeeded',
  'terminal',
] as const;
export type ExperimentFoundationProviderCommandStateV2 =
  (typeof EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_STATES_V2)[number];

export const EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2 = [
  'prepared',
  'collected',
  'failed',
] as const;
export type ExperimentFoundationCollectionAttemptStateV2 =
  (typeof EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2)[number];

export const EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2 =
  EXPERIMENT_FOUNDATION_V2_TRAINING_TASK_OUTPUT_KEYS;
export type ExperimentFoundationProvisionalOutputKindV2 =
  ExperimentFoundationV2TrainingTaskOutputKey;

export const EXPERIMENT_FOUNDATION_WORKFLOW_SIMULATION_STATUSES_V2 = [
  'not_started',
  'in_progress',
  'workflow_simulation_passed',
  'workflow_simulation_failed',
  'workflow_simulation_blocked',
] as const;
export type ExperimentFoundationWorkflowSimulationStateV2 =
  (typeof EXPERIMENT_FOUNDATION_WORKFLOW_SIMULATION_STATUSES_V2)[number];

export interface FakeAliyunPaiDlcSourceBindingV1 {
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
}

export interface FakeAliyunPaiDlcRedactedManifestV1 {
  manifest_schema_version: 'v1';
  payload_schema: typeof EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2;
  adapter_identity: typeof EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2;
  simulation_profile_version: string;
  job_name: string;
  source_binding: FakeAliyunPaiDlcSourceBindingV1;
  command_summary: {
    command: string;
    argument_count: number;
  };
  resource_summary: {
    cpu_cores: number;
    memory_mb: number;
  };
  input_keys: string[];
  output_keys: ExperimentFoundationV2TrainingTaskOutputKey[];
  redacted_fields: string[];
}

export interface SimulationExternalJobRefV2 {
  ref_type: 'fake_aliyun_pai_dlc_job';
  ref_id: string;
}

export interface ProviderPayloadV2 {
  provider_payload_id: string;
  materialization_key: string;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  payload_schema: typeof EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2;
  adapter_identity: typeof EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2;
  execution_mode: ExperimentFoundationExecutionModeV2;
  provenance: ExperimentFoundationExecutionProvenanceV2;
  simulation_profile_version: string;
  redacted_manifest: FakeAliyunPaiDlcRedactedManifestV1;
  payload_hash: string;
  payload_byte_size: number;
  created_at: string;
}

export interface ExecutionAttemptV2 {
  execution_attempt_id: string;
  external_pi_implementation_project_id: string;
  external_pi_validation_cycle_id: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  provider_payload_id: string;
  provider_payload_hash: string;
  head_acknowledgement_inbox_id: string;
  attempt_sequence: number;
  workflow_business_key: string;
  workflow_request_hash: string;
  execution_mode: ExperimentFoundationExecutionModeV2;
  provenance: ExperimentFoundationExecutionProvenanceV2;
  provider_idempotency_key: string;
  lifecycle_state: ExperimentFoundationExecutionAttemptStateV2;
  state_version: number;
  terminal_reason_code: ExperimentFoundationExecutionTerminalReasonCodeV2 | null;
  external_job_ref: SimulationExternalJobRefV2 | null;
  external_job_ref_hash: string | null;
  created_at: string;
  updated_at: string;
  terminal_at: string | null;
}

export interface AttemptEventSnapshotV2 {
  snapshot_schema_version: 'v1';
  reason_code: string | null;
  observed_provider_state: string | null;
  note: string | null;
}

export interface AttemptEventV2 {
  attempt_event_id: string;
  execution_attempt_id: string;
  event_sequence: number;
  event_type: ExperimentFoundationExecutionAttemptEventTypeV2;
  prior_state: ExperimentFoundationExecutionAttemptStateV2 | null;
  next_state: ExperimentFoundationExecutionAttemptStateV2;
  provider_command_id: string | null;
  provider_payload_hash: string;
  external_job_ref: SimulationExternalJobRefV2 | null;
  external_job_ref_hash: string | null;
  event_snapshot: AttemptEventSnapshotV2;
  event_hash: string;
  occurred_at: string;
}

export interface ProviderCommandSnapshotV2 {
  command_schema_version: 'v1';
  operation: ExperimentFoundationProviderCommandOperationV2;
  provider_payload_id: string;
  provider_payload_hash: string;
  external_job_ref: SimulationExternalJobRefV2 | null;
  cancellation_reason: string | null;
}

export interface ProviderCommandV2 {
  provider_command_id: string;
  execution_attempt_id: string;
  collection_attempt_id: string | null;
  command_sequence: number;
  operation: ExperimentFoundationProviderCommandOperationV2;
  command_snapshot: ProviderCommandSnapshotV2;
  command_hash: string;
  response_hash: string | null;
  provider_idempotency_key: string;
  provider_payload_hash: string;
  external_job_ref: SimulationExternalJobRefV2 | null;
  external_job_ref_hash: string | null;
  command_state: ExperimentFoundationProviderCommandStateV2;
  lease_version: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
  terminal_at: string | null;
}

export interface CollectionAttemptV2 {
  collection_attempt_id: string;
  execution_attempt_id: string;
  business_idempotency_key: string;
  collection_request_hash: string;
  provider_payload_id: string;
  provider_payload_hash: string;
  external_job_ref: SimulationExternalJobRefV2;
  external_job_ref_hash: string;
  collection_state: ExperimentFoundationCollectionAttemptStateV2;
  state_version: number;
  prepared_at: string;
  updated_at: string;
  collected_at: string | null;
}

export interface ProvisionalOutputManifestV2 {
  manifest_schema_version: 'v1';
  output_class: 'diagnostic_only';
  output_kind: ExperimentFoundationProvisionalOutputKindV2;
  media_type: string;
  redacted_locator: string;
}

export interface ProvisionalOutputV2 {
  provisional_output_id: string;
  collection_attempt_id: string;
  ordinal: number;
  output_kind: ExperimentFoundationProvisionalOutputKindV2;
  output_class: 'diagnostic_only';
  manifest: ProvisionalOutputManifestV2;
  output_hash: string;
  created_at: string;
}

export interface WorkflowSimulationCellStatusV2 {
  run_cell_id: string;
  cell_key: string;
  latest_execution_attempt_id: string | null;
  latest_attempt_state: ExperimentFoundationExecutionAttemptStateV2 | null;
  latest_collection_state: ExperimentFoundationCollectionAttemptStateV2 | null;
}

export interface WorkflowSimulationStatusV2 {
  run_id: string;
  run_manifest_hash: string;
  workflow_simulation_status: ExperimentFoundationWorkflowSimulationStateV2;
  required_cell_count: number;
  terminal_cell_count: number;
  collected_cell_count: number;
  cells: WorkflowSimulationCellStatusV2[];
  scientific_execution_status: 'not_started';
  evidence_eligibility: false;
  derived_at: string;
}

export interface StartWorkflowSimulationV2Request {
  business_idempotency_key: string;
}

export interface StartWorkflowSimulationV2Response {
  run_id: string;
  run_manifest_hash: string;
  business_idempotency_key: string;
  provider_payloads: ProviderPayloadV2[];
  execution_attempts: ExecutionAttemptV2[];
  replayed: boolean;
  workflow_simulation_status: WorkflowSimulationStatusV2;
}

export interface ControlExecutionAttemptV2Request {
  business_idempotency_key: string;
  reason_code?: ExperimentFoundationExecutionControlReasonCodeV2;
}

const stringId = { type: 'string', minLength: 1 } as const;
const nullableStringId = { anyOf: [stringId, { type: 'null' }] } as const;
const timestampSchema = { type: 'string', minLength: 1 } as const;
const nullableTimestampSchema = { anyOf: [timestampSchema, { type: 'null' }] } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const nullableHashSchema = { anyOf: [hashSchema, { type: 'null' }] } as const;
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

export const simulationExternalJobRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'ref_id'],
  properties: {
    ref_type: { type: 'string', const: 'fake_aliyun_pai_dlc_job' },
    ref_id: stringId,
  },
} as const;

const nullableExternalJobRefSchema = {
  anyOf: [simulationExternalJobRefV2Schema, { type: 'null' }],
} as const;

export const fakeAliyunPaiDlcSourceBindingV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
  ],
  properties: {
    run_id: stringId,
    run_manifest_hash: hashSchema,
    run_cell_id: stringId,
    cell_key: stringId,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
  },
} as const;

export const fakeAliyunPaiDlcRedactedManifestV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'manifest_schema_version',
    'payload_schema',
    'adapter_identity',
    'simulation_profile_version',
    'job_name',
    'source_binding',
    'command_summary',
    'resource_summary',
    'input_keys',
    'output_keys',
    'redacted_fields',
  ],
  properties: {
    manifest_schema_version: { type: 'string', const: 'v1' },
    payload_schema: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
    },
    adapter_identity: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
    },
    simulation_profile_version: stringId,
    job_name: stringId,
    source_binding: fakeAliyunPaiDlcSourceBindingV1Schema,
    command_summary: {
      type: 'object',
      additionalProperties: false,
      required: ['command', 'argument_count'],
      properties: {
        command: stringId,
        argument_count: nonNegativeInteger,
      },
    },
    resource_summary: {
      type: 'object',
      additionalProperties: false,
      required: ['cpu_cores', 'memory_mb'],
      properties: {
        cpu_cores: positiveInteger,
        memory_mb: positiveInteger,
      },
    },
    input_keys: { type: 'array', items: stringId },
    output_keys: {
      type: 'array',
      minItems: 1,
      maxItems: EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2.length,
      uniqueItems: true,
      items: {
        type: 'string',
        enum: EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2,
      },
    },
    redacted_fields: { type: 'array', items: stringId },
  },
} as const;

export const providerPayloadV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_payload_id',
    'materialization_key',
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'payload_schema',
    'adapter_identity',
    'execution_mode',
    'provenance',
    'simulation_profile_version',
    'redacted_manifest',
    'payload_hash',
    'payload_byte_size',
    'created_at',
  ],
  properties: {
    provider_payload_id: stringId,
    materialization_key: stringId,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    run_cell_id: stringId,
    cell_key: stringId,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
    payload_schema: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
    },
    adapter_identity: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
    },
    execution_mode: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2] },
    provenance: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2],
    },
    simulation_profile_version: stringId,
    redacted_manifest: fakeAliyunPaiDlcRedactedManifestV1Schema,
    payload_hash: hashSchema,
    payload_byte_size: positiveInteger,
    created_at: timestampSchema,
  },
} as const;

export const executionAttemptV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_attempt_id',
    'external_pi_implementation_project_id',
    'external_pi_validation_cycle_id',
    'external_pi_branch_id',
    'external_pi_work_order_revision_id',
    'external_pi_work_order_revision_hash',
    'external_pi_revision_sequence',
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'provider_payload_id',
    'provider_payload_hash',
    'head_acknowledgement_inbox_id',
    'attempt_sequence',
    'workflow_business_key',
    'workflow_request_hash',
    'execution_mode',
    'provenance',
    'provider_idempotency_key',
    'lifecycle_state',
    'state_version',
    'terminal_reason_code',
    'external_job_ref',
    'external_job_ref_hash',
    'created_at',
    'updated_at',
    'terminal_at',
  ],
  properties: {
    execution_attempt_id: stringId,
    external_pi_implementation_project_id: stringId,
    external_pi_validation_cycle_id: stringId,
    external_pi_branch_id: stringId,
    external_pi_work_order_revision_id: stringId,
    external_pi_work_order_revision_hash: hashSchema,
    external_pi_revision_sequence: positiveInteger,
    run_id: stringId,
    run_manifest_hash: hashSchema,
    run_cell_id: stringId,
    cell_key: stringId,
    training_task_spec_id: stringId,
    training_task_spec_hash: hashSchema,
    provider_payload_id: stringId,
    provider_payload_hash: hashSchema,
    head_acknowledgement_inbox_id: stringId,
    attempt_sequence: positiveInteger,
    workflow_business_key: stringId,
    workflow_request_hash: hashSchema,
    execution_mode: { type: 'string', enum: [...EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2] },
    provenance: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2],
    },
    provider_idempotency_key: stringId,
    lifecycle_state: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2],
    },
    state_version: nonNegativeInteger,
    terminal_reason_code: {
      anyOf: [
        {
          type: 'string',
          enum: [...EXPERIMENT_FOUNDATION_EXECUTION_TERMINAL_REASON_CODES_V2],
        },
        { type: 'null' },
      ],
    },
    external_job_ref: nullableExternalJobRefSchema,
    external_job_ref_hash: nullableHashSchema,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    terminal_at: nullableTimestampSchema,
  },
} as const;

export const attemptEventSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['snapshot_schema_version', 'reason_code', 'observed_provider_state', 'note'],
  properties: {
    snapshot_schema_version: { type: 'string', const: 'v1' },
    reason_code: nullableStringId,
    observed_provider_state: nullableStringId,
    note: nullableStringId,
  },
} as const;

export const attemptEventV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'attempt_event_id',
    'execution_attempt_id',
    'event_sequence',
    'event_type',
    'prior_state',
    'next_state',
    'provider_command_id',
    'provider_payload_hash',
    'external_job_ref',
    'external_job_ref_hash',
    'event_snapshot',
    'event_hash',
    'occurred_at',
  ],
  properties: {
    attempt_event_id: stringId,
    execution_attempt_id: stringId,
    event_sequence: positiveInteger,
    event_type: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_EVENT_TYPES_V2],
    },
    prior_state: {
      anyOf: [
        { type: 'string', enum: [...EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2] },
        { type: 'null' },
      ],
    },
    next_state: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2],
    },
    provider_command_id: nullableStringId,
    provider_payload_hash: hashSchema,
    external_job_ref: nullableExternalJobRefSchema,
    external_job_ref_hash: nullableHashSchema,
    event_snapshot: attemptEventSnapshotV2Schema,
    event_hash: hashSchema,
    occurred_at: timestampSchema,
  },
} as const;

export const providerCommandSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'command_schema_version',
    'operation',
    'provider_payload_id',
    'provider_payload_hash',
    'external_job_ref',
    'cancellation_reason',
  ],
  properties: {
    command_schema_version: { type: 'string', const: 'v1' },
    operation: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2],
    },
    provider_payload_id: stringId,
    provider_payload_hash: hashSchema,
    external_job_ref: nullableExternalJobRefSchema,
    cancellation_reason: nullableStringId,
  },
} as const;

export const providerCommandV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provider_command_id',
    'execution_attempt_id',
    'collection_attempt_id',
    'command_sequence',
    'operation',
    'command_snapshot',
    'command_hash',
    'response_hash',
    'provider_idempotency_key',
    'provider_payload_hash',
    'external_job_ref',
    'external_job_ref_hash',
    'command_state',
    'lease_version',
    'lease_owner',
    'lease_expires_at',
    'heartbeat_at',
    'attempt_count',
    'next_attempt_at',
    'last_error_code',
    'created_at',
    'updated_at',
    'terminal_at',
  ],
  properties: {
    provider_command_id: stringId,
    execution_attempt_id: stringId,
    collection_attempt_id: nullableStringId,
    command_sequence: positiveInteger,
    operation: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2],
    },
    command_snapshot: providerCommandSnapshotV2Schema,
    command_hash: hashSchema,
    response_hash: nullableHashSchema,
    provider_idempotency_key: stringId,
    provider_payload_hash: hashSchema,
    external_job_ref: nullableExternalJobRefSchema,
    external_job_ref_hash: nullableHashSchema,
    command_state: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_STATES_V2],
    },
    lease_version: nonNegativeInteger,
    lease_owner: nullableStringId,
    lease_expires_at: nullableTimestampSchema,
    heartbeat_at: nullableTimestampSchema,
    attempt_count: nonNegativeInteger,
    next_attempt_at: nullableTimestampSchema,
    last_error_code: nullableStringId,
    created_at: timestampSchema,
    updated_at: timestampSchema,
    terminal_at: nullableTimestampSchema,
  },
} as const;

export const collectionAttemptV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'collection_attempt_id',
    'execution_attempt_id',
    'business_idempotency_key',
    'collection_request_hash',
    'provider_payload_id',
    'provider_payload_hash',
    'external_job_ref',
    'external_job_ref_hash',
    'collection_state',
    'state_version',
    'prepared_at',
    'updated_at',
    'collected_at',
  ],
  properties: {
    collection_attempt_id: stringId,
    execution_attempt_id: stringId,
    business_idempotency_key: stringId,
    collection_request_hash: hashSchema,
    provider_payload_id: stringId,
    provider_payload_hash: hashSchema,
    external_job_ref: simulationExternalJobRefV2Schema,
    external_job_ref_hash: hashSchema,
    collection_state: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2],
    },
    state_version: nonNegativeInteger,
    prepared_at: timestampSchema,
    updated_at: timestampSchema,
    collected_at: nullableTimestampSchema,
  },
} as const;

export const provisionalOutputManifestV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'manifest_schema_version',
    'output_class',
    'output_kind',
    'media_type',
    'redacted_locator',
  ],
  properties: {
    manifest_schema_version: { type: 'string', const: 'v1' },
    output_class: { type: 'string', const: 'diagnostic_only' },
    output_kind: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2],
    },
    media_type: stringId,
    redacted_locator: stringId,
  },
} as const;

export const provisionalOutputV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'provisional_output_id',
    'collection_attempt_id',
    'ordinal',
    'output_kind',
    'output_class',
    'manifest',
    'output_hash',
    'created_at',
  ],
  properties: {
    provisional_output_id: stringId,
    collection_attempt_id: stringId,
    ordinal: positiveInteger,
    output_kind: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2],
    },
    output_class: { type: 'string', const: 'diagnostic_only' },
    manifest: provisionalOutputManifestV2Schema,
    output_hash: hashSchema,
    created_at: timestampSchema,
  },
} as const;

export const workflowSimulationCellStatusV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_cell_id',
    'cell_key',
    'latest_execution_attempt_id',
    'latest_attempt_state',
    'latest_collection_state',
  ],
  properties: {
    run_cell_id: stringId,
    cell_key: stringId,
    latest_execution_attempt_id: nullableStringId,
    latest_attempt_state: {
      anyOf: [
        { type: 'string', enum: [...EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2] },
        { type: 'null' },
      ],
    },
    latest_collection_state: {
      anyOf: [
        { type: 'string', enum: [...EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2] },
        { type: 'null' },
      ],
    },
  },
} as const;

export const workflowSimulationStatusV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_id',
    'run_manifest_hash',
    'workflow_simulation_status',
    'required_cell_count',
    'terminal_cell_count',
    'collected_cell_count',
    'cells',
    'scientific_execution_status',
    'evidence_eligibility',
    'derived_at',
  ],
  properties: {
    run_id: stringId,
    run_manifest_hash: hashSchema,
    workflow_simulation_status: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_WORKFLOW_SIMULATION_STATUSES_V2],
    },
    required_cell_count: positiveInteger,
    terminal_cell_count: nonNegativeInteger,
    collected_cell_count: nonNegativeInteger,
    cells: { type: 'array', minItems: 1, items: workflowSimulationCellStatusV2Schema },
    scientific_execution_status: { type: 'string', const: 'not_started' },
    evidence_eligibility: { type: 'boolean', const: false },
    derived_at: timestampSchema,
  },
} as const;

export const startWorkflowSimulationV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['business_idempotency_key'],
  properties: {
    business_idempotency_key: stringId,
  },
} as const;

export const startWorkflowSimulationV2ResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'run_id',
    'run_manifest_hash',
    'business_idempotency_key',
    'provider_payloads',
    'execution_attempts',
    'replayed',
    'workflow_simulation_status',
  ],
  properties: {
    run_id: stringId,
    run_manifest_hash: hashSchema,
    business_idempotency_key: stringId,
    provider_payloads: { type: 'array', minItems: 1, items: providerPayloadV2Schema },
    execution_attempts: { type: 'array', minItems: 1, items: executionAttemptV2Schema },
    replayed: { type: 'boolean' },
    workflow_simulation_status: workflowSimulationStatusV2Schema,
  },
} as const;

export const controlExecutionAttemptV2RequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['business_idempotency_key'],
  properties: {
    business_idempotency_key: stringId,
    reason_code: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_CONTROL_REASON_CODES_V2],
    },
  },
} as const;

export const executionAttemptV2EnvelopeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_attempt'],
  properties: {
    execution_attempt: executionAttemptV2Schema,
  },
} as const;

export const experimentFoundationExecutionV2ErrorResponseSchema = {
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
          enum: [
            'INVALID_PAYLOAD',
            'NOT_FOUND',
            'VERSION_CONFLICT',
            'GATE_CONSTRAINT_FAILED',
            'CONCURRENT_ADVANCE',
            'INTERNAL_ERROR',
          ],
        },
        message: stringId,
        details: {
          type: 'object',
          additionalProperties: true,
          required: ['reason_code'],
          properties: {
            reason_code: {
              type: 'string',
              enum: [...EXPERIMENT_FOUNDATION_EXECUTION_REASON_CODES_V2],
            },
          },
        },
      },
    },
  },
} as const;
