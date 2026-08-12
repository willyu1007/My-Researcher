import type {
  ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
} from './experiment-foundation-cloud-preflight-v2-contracts.js';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from './experiment-foundation-v2-contracts.js';
import {
  EXPERIMENT_V2_HASH_PATTERN,
  EXPERIMENT_V2_JSON_SAFE_INTEGER_MAX,
} from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2 =
  'ef-execution-bundle-semantic-json@v1' as const;
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2 =
  'ef-real-provider-payload-json@v1' as const;
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_CONTROL_HASH_PROFILE_V2 =
  'ef-real-provider-control-json@v1' as const;

export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2 =
  'AliyunPaiDlcCreateJobPayload@v1' as const;
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2 =
  'aliyun_pai_dlc_official_sdk@v1' as const;
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2 =
  'AliyunPaiDlcRealProviderProfile@v1' as const;
export const EXPERIMENT_FOUNDATION_ALIYUN_WORKLOAD_BINDING_SCHEMA_V2 =
  'AliyunPaiDlcWorkloadBinding@v1' as const;
export const EXPERIMENT_FOUNDATION_PROVIDER_MANAGED_IMAGE_SCOPES_V2 = [
  'm7_l1_diagnostic_only',
  'm0_sci_p5_scientific_only',
] as const;
export type ExperimentFoundationProviderManagedImageScopeV2 =
  (typeof EXPERIMENT_FOUNDATION_PROVIDER_MANAGED_IMAGE_SCOPES_V2)[number];
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_OUTPUT_KEYS_V2 = [
  'real_provider_result_envelope',
  'real_provider_diagnostic_log',
] as const;
export type ExperimentFoundationRealProviderOutputKeyV2 =
  (typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_OUTPUT_KEYS_V2)[number];

export interface ExperimentFoundationAliyunWorkloadBindingV2 {
  schema_version: typeof EXPERIMENT_FOUNDATION_ALIYUN_WORKLOAD_BINDING_SCHEMA_V2;
  runtime_role_arn: string;
  code_mount_path: string;
  input_mount_root: string;
  output_mount_path: string;
  output_uri_prefix: string;
}

export interface ExperimentFoundationAliyunRealProviderProfileV2
  extends Omit<
    ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
    'schema_version' | 'resource_binding'
  > {
  schema_version: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2;
  resource_binding:
    | {
      mode: 'exact_quota';
      resource_id: string;
    }
    | {
      mode: 'public_resource';
      ecs_spec: string;
      cpu_cores: number;
      memory_mb: number;
    };
  workload_binding: ExperimentFoundationAliyunWorkloadBindingV2;
}

export interface ExperimentFoundationAliyunRealProviderCreateJobRequestV1 {
  WorkspaceId: string;
  ResourceId?: string;
  DisplayName: string;
  JobType: 'PyTorchJob';
  JobSpecs: [{
    Type: 'Worker';
    Image: string;
    PodCount: 1;
    EcsSpec?: string;
    ResourceConfig?: {
      CPU: string;
      Memory: string;
    };
  }];
  UserCommand: string;
  JobMaxRunningTimeMinutes: number;
  Settings: {
    Tags: {
      'ef-provider-idempotency': string;
      'ef-request-binding': string;
    };
  };
  DataSources: Array<{
    Uri: string;
    MountPath: string;
    MountAccess: 'RO' | 'RW';
    Options: '{}';
  }>;
  Envs: Record<string, string>;
  CredentialConfig: {
    EnableCredentialInject: true;
    AliyunEnvRoleKey: '0';
    CredentialConfigItems: [{
      Key: '0';
      Type: 'Role';
      Roles: [{
        RoleType: 'service';
        RoleArn: string;
      }];
    }];
  };
  Accessibility: 'PRIVATE';
}

export interface ExperimentFoundationAliyunRealProviderCreateJobRequestV2
  extends Omit<ExperimentFoundationAliyunRealProviderCreateJobRequestV1, 'DataSources'> {
  DataSources: Array<{
    Uri: string;
    MountPath: string;
    MountAccess?: 'RO';
    Options: '{}';
  }>;
}

export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_REASON_CODES_V2 = [
  'EF_V2_REAL_PROVIDER_INTAKE_DISABLED',
  'EXECUTION_BUNDLE_INVALID',
  'EXECUTION_BUNDLE_CONFLICT',
  'EXECUTION_BUNDLE_NOT_READY',
  'EXECUTION_BUNDLE_SCOPE_DRIFT',
  'REAL_PROVIDER_TUPLE_INVALID',
  'REAL_PROVIDER_PAYLOAD_INVALID',
  'REAL_PROVIDER_PAYLOAD_CONFLICT',
  'REAL_PROVIDER_RESPONSE_INVALID',
  'REAL_PROVIDER_STATUS_UNKNOWN',
  'REAL_PROVIDER_ACCEPTANCE_AMBIGUOUS',
  'REAL_PROVIDER_RECOVERY_NOT_FOUND',
  'REAL_PROVIDER_RECOVERY_DUPLICATE',
  'REAL_PROVIDER_JOB_FAILED',
  'REAL_PROVIDER_NOT_TERMINAL',
  'REAL_PROVIDER_TIMEOUT',
  'REAL_PROVIDER_CLEANUP_UNVERIFIED',
  'REAL_PROVIDER_RESULT_READER_UNAVAILABLE',
  'REAL_PROVIDER_RESULT_READ_FAILED',
  'REAL_PROVIDER_RESULT_INVALID',
  'REAL_PROVIDER_RESULT_BINDING_DRIFT',
  'REAL_PROVIDER_RESULT_HANDOFF_CONFLICT',
  'SCIENTIFIC_SOURCE_AUTHORITY_READ_FAILED',
  'SCIENTIFIC_SOURCE_PREPARATION_FAILED',
  'SCIENTIFIC_SOURCE_COMMIT_FAILED',
  'SCIENTIFIC_SOURCE_COMMIT_CONFLICT',
] as const;
export type ExperimentFoundationRealProviderReasonCodeV2 =
  (typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_REASON_CODES_V2)[number];

export const EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_LIFECYCLE_STATUSES_V2 = [
  'draft',
  'active',
  'revoked',
] as const;
export type ExperimentFoundationExecutionBundleLifecycleStatusV2 =
  (typeof EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_LIFECYCLE_STATUSES_V2)[number];

export interface ExperimentFoundationExecutionBundleExactRevisionRefV2 {
  execution_bundle_id: string;
  execution_bundle_revision_id: string;
  revision_sequence: number;
  content_hash: string;
}

export interface ExperimentFoundationExecutionBundleDatasetMirrorV1 {
  ordinal: number;
  dataset_revision: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'Dataset';
  };
  object_ref: string;
  content_digest: string;
  byte_size: number;
}

export interface ExperimentFoundationExecutionBundleOutputContractV1 {
  result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1';
  result_object_name: string;
  parser_profile_version: string;
  parser_profile_hash: string;
  /** Absent on legacy diagnostic-only bundles. */
  scientific_result_schema_version?: string;
  /** Absent on legacy diagnostic-only bundles. */
  scientific_result_schema_hash?: string;
}

export interface ExperimentFoundationExecutionBundleProviderManagedContainerImageV2 {
  image_identity_kind: 'provider_managed_asset';
  image_ref: string;
  provider_managed_asset: {
    provider: 'aliyun_pai';
    asset_id: string;
    region_id: string;
    modified_at: string;
    size_bytes: number;
    accessibility: 'PUBLIC';
    source_type: 'Import';
    permitted_scope: ExperimentFoundationProviderManagedImageScopeV2;
  };
}

export interface ExperimentFoundationExecutionBundleContentV1 {
  execution_bundle_schema_version: 'v1';
  code_artifact: {
    artifact_ref: string;
    content_digest: string;
    byte_size: number;
  };
  container_image: {
    image_ref: string;
    image_digest: string;
  };
  dataset_mirrors: ExperimentFoundationExecutionBundleDatasetMirrorV1[];
  entrypoint: string;
  arguments: string[];
  dependency_lock_digest: string;
  output_contract: ExperimentFoundationExecutionBundleOutputContractV1;
}

export interface ExperimentFoundationExecutionBundleContentV2
  extends Omit<
    ExperimentFoundationExecutionBundleContentV1,
    'execution_bundle_schema_version' | 'container_image'
  > {
  execution_bundle_schema_version: 'v2';
  container_image: ExperimentFoundationExecutionBundleProviderManagedContainerImageV2;
}

export type ExperimentFoundationExecutionBundleContent =
  | ExperimentFoundationExecutionBundleContentV1
  | ExperimentFoundationExecutionBundleContentV2;

export type ExperimentFoundationExecutionBundleContainerImage =
  ExperimentFoundationExecutionBundleContent['container_image'];

export interface ExperimentFoundationExecutionBundleIdentityV2 {
  execution_bundle_id: string;
  bundle_key: string;
  display_name: string;
  state_version: number;
  created_at: string;
  updated_at: string;
}

export interface ExperimentFoundationExecutionBundleDraftV2 {
  execution_bundle_id: string;
  draft_version: number;
  draft_content: ExperimentFoundationExecutionBundleContent;
  updated_at: string;
}

export interface ExperimentFoundationExecutionBundleRevisionV2 {
  execution_bundle_revision_id: string;
  execution_bundle_id: string;
  revision_sequence: number;
  schema_version: 'v1' | 'v2';
  hash_profile: typeof EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2;
  content_hash: string;
  revision_content: ExperimentFoundationExecutionBundleContent;
  created_at: string;
}

export interface ExperimentFoundationExecutionBundleLifecycleEventV2 {
  lifecycle_event_id: string;
  execution_bundle_revision_id: string;
  event_sequence: number;
  status: ExperimentFoundationExecutionBundleLifecycleStatusV2;
  reason_code: string;
  event_hash: string;
  occurred_at: string;
}

export interface ExperimentFoundationExecutionBundleLifecycleProjectionV2 {
  execution_bundle_revision_id: string;
  current_status: ExperimentFoundationExecutionBundleLifecycleStatusV2;
  latest_event_sequence: number;
  latest_event_hash: string;
  state_version: number;
  updated_at: string;
}

export interface ExperimentFoundationExecutionBundleReadinessV2 {
  execution_bundle_readiness_id: string;
  execution_bundle_revision_id: string;
  execution_bundle_revision_hash: string;
  lifecycle_event_hash: string;
  outcome: 'passed' | 'blocked';
  reason_codes: string[];
  readiness_hash: string;
  evaluated_at: string;
}

export interface PaperImplementationExecutableWorkOrderRevisionSnapshotV2 {
  work_order_schema_version: 'v2';
  title: string;
  objective: string;
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  asset_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  execution_bundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  resource_snapshot?: {
    cpu_cores: number;
    memory_mb: number;
  };
  run_policy: {
    max_attempts_per_cell: number;
    timeout_seconds: number;
  };
}

export interface ExperimentFoundationExecutableRunRecipeSnapshotV2 {
  recipe_schema_version: 'v2';
  execution_bundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  entrypoint: string;
  arguments: string[];
  dependency_lock_digest: string;
  environment_keys: string[];
  output_contract: ExperimentFoundationExecutionBundleOutputContractV1;
}

export interface ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2 {
  schema_version: 'v2';
  execution_bundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  command_snapshot: {
    command: string;
    arguments: string[];
  };
  io_snapshot: {
    input_keys: string[];
    output_keys: ExperimentFoundationRealProviderOutputKeyV2[];
    input_mirror_ordinals: number[];
    result_object_name: string;
    result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1';
    parser_profile_version: string;
    parser_profile_hash: string;
    scientific_result_schema_version?: string;
    scientific_result_schema_hash?: string;
  };
  resource_snapshot: {
    cpu_cores: number;
    memory_mb: number;
  };
  retry_snapshot: {
    max_attempts: number;
    timeout_seconds: number;
  };
}

export interface ExperimentFoundationExecutableRunRecipeV2 {
  run_recipe_id: string;
  materialization_key: string;
  version_lock_id: string;
  readiness_attestation_id: string;
  execution_bundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  recipe_snapshot: ExperimentFoundationExecutableRunRecipeSnapshotV2;
  recipe_hash: string;
  created_at: string;
}

export interface ExperimentFoundationExecutableTrainingTaskSpecV2 {
  training_task_spec_id: string;
  materialization_key: string;
  run_recipe_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_cell_id: string;
  external_pi_cell_hash: string;
  execution_bundle: ExperimentFoundationExecutionBundleExactRevisionRefV2;
  command_snapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['command_snapshot'];
  io_snapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['io_snapshot'];
  resource_snapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['resource_snapshot'];
  retry_snapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['retry_snapshot'];
  task_spec_hash: string;
  created_at: string;
}

export interface ExperimentFoundationAliyunRealProviderRedactedManifestV1 {
  manifest_schema_version: 'v1';
  payload_schema: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2;
  adapter_identity: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2;
  provider_profile_version: string;
  source_binding: {
    execution_bundle_revision_id: string;
    execution_bundle_revision_hash: string;
    run_id: string;
    run_manifest_hash: string;
    run_cell_id: string;
    cell_key: string;
    training_task_spec_id: string;
    training_task_spec_hash: string;
  };
  request_summary: {
    deterministic_display_name: string;
    deterministic_tag_hash: string;
    job_type: 'PyTorchJob';
    pod_count: 1;
    cpu_cores: number;
    memory_mb: number;
    maximum_running_time_minutes: number;
    data_source_count: number;
    environment_variable_count: number;
  };
  provider_binding_hashes: {
    execution_profile_hash: string;
    region_id_hash: string;
    workspace_id_hash: string;
    resource_mode: 'exact_quota' | 'public_resource';
    resource_id_hash: string | null;
    image_ref_hash: string;
    image_digest: string;
    runtime_role_arn_hash: string;
  };
  artifact_bindings: {
    code_artifact: {
      artifact_ref_hash: string;
      content_digest: string;
      byte_size: number;
      mount_path_hash: string;
    };
    dataset_mirrors: Array<{
      ordinal: number;
      dataset_revision_hash: string;
      object_ref_hash: string;
      content_digest: string;
      byte_size: number;
      mount_path_hash: string;
    }>;
    output: {
      output_uri_hash: string;
      mount_path_hash: string;
      result_object_name_hash: string;
    };
    environment_hash: string;
  };
  redacted_fields: string[];
}

export interface ExperimentFoundationAliyunRealProviderRedactedManifestV2
  extends Omit<
    ExperimentFoundationAliyunRealProviderRedactedManifestV1,
    'manifest_schema_version' | 'provider_binding_hashes'
  > {
  manifest_schema_version: 'v2';
  provider_binding_hashes: Omit<
    ExperimentFoundationAliyunRealProviderRedactedManifestV1['provider_binding_hashes'],
    'image_digest'
  > & {
    image_identity_kind: 'provider_managed_asset';
    provider_managed_asset_identity_hash: string;
    provider_managed_asset_scope: ExperimentFoundationProviderManagedImageScopeV2;
  };
}

export interface ExperimentFoundationRealProviderPayloadV2 {
  provider_payload_id: string;
  materialization_key: string;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  payload_schema: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2;
  adapter_identity: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2;
  execution_mode: 'real_provider';
  provenance: 'real_provider';
  provider_profile_version: string;
  redacted_manifest:
    | ExperimentFoundationAliyunRealProviderRedactedManifestV1
    | ExperimentFoundationAliyunRealProviderRedactedManifestV2;
  payload_hash: string;
  payload_byte_size: number;
  created_at: string;
}

export interface ExperimentFoundationAliyunRealExternalJobRefV1 {
  ref_type: 'aliyun_pai_dlc_job';
  job_id: string;
  region_id_hash: string;
}

export const EXPERIMENT_FOUNDATION_ALIYUN_JOB_STATUSES_V2 = [
  'Creating',
  'Queuing',
  'Bidding',
  'EnvPreparing',
  'SanityChecking',
  'Running',
  'Restarting',
  'Stopping',
  'SucceededReserving',
  'FailedReserving',
  'Succeeded',
  'Failed',
  'Stopped',
] as const;
export type ExperimentFoundationAliyunJobStatusV2 =
  (typeof EXPERIMENT_FOUNDATION_ALIYUN_JOB_STATUSES_V2)[number];

export interface ExperimentFoundationAliyunNormalizedProviderOutcomeV1 {
  outcome_schema_version: 'AliyunPaiDlcNormalizedOutcome@v1';
  adapter_identity: typeof EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2;
  operation: 'submit' | 'sync' | 'reconcile' | 'cancel' | 'collect';
  provider_idempotency_key: string;
  payload_hash: string;
  external_job_ref: ExperimentFoundationAliyunRealExternalJobRefV1 | null;
  provider_status: ExperimentFoundationAliyunJobStatusV2 | null;
  normalized_state:
    | 'submitted'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled'
    | 'acceptance_ambiguous';
  result_manifest_hash: string | null;
  response_hash: string;
}

export interface ExperimentFoundationProviderResultEnvelopeV1 {
  result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1';
  execution_bundle_revision_id: string;
  execution_bundle_revision_hash: string;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  parser_profile_version: string;
  parser_profile_hash: string;
  outputs: Record<string, unknown>;
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;
const positiveInteger = { type: 'integer', minimum: 1, maximum: 2_147_483_647 } as const;
const nonNegativeInteger = { type: 'integer', minimum: 0, maximum: 2_147_483_647 } as const;
const jsonSafePositiveInteger = {
  type: 'integer',
  minimum: 1,
  maximum: EXPERIMENT_V2_JSON_SAFE_INTEGER_MAX,
} as const;
const timestampSchema = { type: 'string', minLength: 1 } as const;
const absoluteMountPathSchema = {
  type: 'string',
  pattern: '^/(?!.*(?:^|/)\\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$',
  minLength: 2,
  maxLength: 256,
} as const;
const internalOssDirectoryUriSchema = {
  type: 'string',
  pattern: '^oss://[a-z0-9][a-z0-9-]{1,62}\\.oss-[a-z0-9-]+-internal\\.aliyuncs\\.com/.+/$',
  minLength: 16,
  maxLength: 2048,
} as const;
const runtimeRoleArnSchema = {
  type: 'string',
  pattern: '^acs:ram::[0-9]{6,32}:role/[A-Za-z0-9@._-]{1,64}$',
  maxLength: 160,
} as const;

const exactDatasetRevisionRefSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
  properties: {
    asset_type: { type: 'string', const: 'Dataset' },
    logical_id: nonEmptyString,
    revision_id: nonEmptyString,
    revision_sequence: positiveInteger,
    content_hash: hashSchema,
  },
} as const;

export const experimentFoundationAliyunWorkloadBindingV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'runtime_role_arn',
    'code_mount_path',
    'input_mount_root',
    'output_mount_path',
    'output_uri_prefix',
  ],
  properties: {
    schema_version: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_ALIYUN_WORKLOAD_BINDING_SCHEMA_V2,
    },
    runtime_role_arn: runtimeRoleArnSchema,
    code_mount_path: absoluteMountPathSchema,
    input_mount_root: absoluteMountPathSchema,
    output_mount_path: absoluteMountPathSchema,
    output_uri_prefix: internalOssDirectoryUriSchema,
  },
} as const;

export const experimentFoundationAliyunRealProviderProfileV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'region_id',
    'workspace_id',
    'resource_binding',
    'image_uri',
    'job_type',
    'job_spec_type',
    'pod_count',
    'workload_binding',
  ],
  properties: {
    schema_version: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2,
    },
    region_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{1,62}$' },
    workspace_id: nonEmptyString,
    resource_binding: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'resource_id'],
          properties: {
            mode: { type: 'string', const: 'exact_quota' },
            resource_id: nonEmptyString,
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['mode', 'ecs_spec', 'cpu_cores', 'memory_mb'],
          properties: {
            mode: { type: 'string', const: 'public_resource' },
            ecs_spec: {
              type: 'string',
              pattern: '^ecs\\.[a-z0-9-]+\\.[a-z0-9-]+$',
            },
            cpu_cores: positiveInteger,
            memory_mb: positiveInteger,
          },
        },
      ],
    },
    image_uri: { type: 'string', minLength: 3, maxLength: 2048 },
    job_type: { type: 'string', const: 'PyTorchJob' },
    job_spec_type: { type: 'string', const: 'Worker' },
    pod_count: { type: 'integer', const: 1 },
    workload_binding: experimentFoundationAliyunWorkloadBindingV2Schema,
  },
} as const;

export const experimentFoundationAliyunRealProviderCreateJobRequestV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'WorkspaceId',
    'DisplayName',
    'JobType',
    'JobSpecs',
    'UserCommand',
    'JobMaxRunningTimeMinutes',
    'Settings',
    'DataSources',
    'Envs',
    'CredentialConfig',
    'Accessibility',
  ],
  properties: {
    WorkspaceId: nonEmptyString,
    ResourceId: nonEmptyString,
    DisplayName: {
      type: 'string',
      minLength: 1,
      maxLength: 256,
      pattern: '^[A-Za-z0-9_.-]+$',
    },
    JobType: { type: 'string', const: 'PyTorchJob' },
    JobSpecs: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['Type', 'Image', 'PodCount'],
        properties: {
          Type: { type: 'string', const: 'Worker' },
          Image: { type: 'string', minLength: 3, maxLength: 2048 },
          PodCount: { type: 'integer', const: 1 },
          EcsSpec: {
            type: 'string',
            pattern: '^ecs\\.[a-z0-9-]+\\.[a-z0-9-]+$',
          },
          ResourceConfig: {
            type: 'object',
            additionalProperties: false,
            required: ['CPU', 'Memory'],
            properties: {
              CPU: { type: 'string', pattern: '^[1-9][0-9]*$' },
              Memory: { type: 'string', pattern: '^[1-9][0-9]*Mi$' },
            },
          },
        },
        oneOf: [
          { required: ['EcsSpec'], not: { required: ['ResourceConfig'] } },
          { required: ['ResourceConfig'], not: { required: ['EcsSpec'] } },
        ],
      },
    },
    UserCommand: nonEmptyString,
    JobMaxRunningTimeMinutes: { type: 'integer', minimum: 1, maximum: 60 },
    Settings: {
      type: 'object',
      additionalProperties: false,
      required: ['Tags'],
      properties: {
        Tags: {
          type: 'object',
          additionalProperties: false,
          required: ['ef-provider-idempotency', 'ef-request-binding'],
          properties: {
            'ef-provider-idempotency': {
              type: 'string',
              pattern: '^[a-f0-9]{64}$',
            },
            'ef-request-binding': {
              type: 'string',
              pattern: '^[a-f0-9]{64}$',
            },
          },
        },
      },
    },
    DataSources: {
      type: 'array',
      minItems: 3,
      maxItems: 34,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['Uri', 'MountPath', 'MountAccess', 'Options'],
        properties: {
          Uri: internalOssDirectoryUriSchema,
          MountPath: absoluteMountPathSchema,
          MountAccess: { type: 'string', enum: ['RO', 'RW'] },
          Options: { type: 'string', const: '{}' },
        },
      },
    },
    Envs: {
      type: 'object',
      additionalProperties: false,
      required: [
        'EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON',
        'EXPERIMENT_FOUNDATION_CODE_DIR',
        'EXPERIMENT_FOUNDATION_OUTPUT_DIR',
      ],
      properties: {
        EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON: nonEmptyString,
        EXPERIMENT_FOUNDATION_CODE_DIR: absoluteMountPathSchema,
        EXPERIMENT_FOUNDATION_OUTPUT_DIR: absoluteMountPathSchema,
      },
      patternProperties: {
        '^EXPERIMENT_FOUNDATION_INPUT_[1-9][0-9]*_DIR$': absoluteMountPathSchema,
      },
    },
    CredentialConfig: {
      type: 'object',
      additionalProperties: false,
      required: [
        'EnableCredentialInject',
        'AliyunEnvRoleKey',
        'CredentialConfigItems',
      ],
      properties: {
        EnableCredentialInject: { type: 'boolean', const: true },
        AliyunEnvRoleKey: { type: 'string', const: '0' },
        CredentialConfigItems: {
          type: 'array',
          minItems: 1,
          maxItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['Key', 'Type', 'Roles'],
            properties: {
              Key: { type: 'string', const: '0' },
              Type: { type: 'string', const: 'Role' },
              Roles: {
                type: 'array',
                minItems: 1,
                maxItems: 1,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['RoleType', 'RoleArn'],
                  properties: {
                    RoleType: { type: 'string', const: 'service' },
                    RoleArn: runtimeRoleArnSchema,
                  },
                },
              },
            },
          },
        },
      },
    },
    Accessibility: { type: 'string', const: 'PRIVATE' },
  },
} as const;

export const experimentFoundationAliyunRealProviderCreateJobRequestV2Schema = {
  ...experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
  properties: {
    ...experimentFoundationAliyunRealProviderCreateJobRequestV1Schema.properties,
    DataSources: {
      ...experimentFoundationAliyunRealProviderCreateJobRequestV1Schema.properties.DataSources,
      items: {
        ...experimentFoundationAliyunRealProviderCreateJobRequestV1Schema.properties.DataSources
          .items,
        required: ['Uri', 'MountPath', 'Options'],
        properties: {
          ...experimentFoundationAliyunRealProviderCreateJobRequestV1Schema.properties.DataSources
            .items.properties,
          MountAccess: { type: 'string', const: 'RO' },
        },
      },
    },
  },
} as const;

export const experimentFoundationExecutionBundleExactRevisionRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_id',
    'execution_bundle_revision_id',
    'revision_sequence',
    'content_hash',
  ],
  properties: {
    execution_bundle_id: nonEmptyString,
    execution_bundle_revision_id: nonEmptyString,
    revision_sequence: positiveInteger,
    content_hash: hashSchema,
  },
} as const;

export const experimentFoundationExecutionBundleContentV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_schema_version',
    'code_artifact',
    'container_image',
    'dataset_mirrors',
    'entrypoint',
    'arguments',
    'dependency_lock_digest',
    'output_contract',
  ],
  properties: {
    execution_bundle_schema_version: { type: 'string', const: 'v1' },
    code_artifact: {
      type: 'object',
      additionalProperties: false,
      required: ['artifact_ref', 'content_digest', 'byte_size'],
      properties: {
        artifact_ref: nonEmptyString,
        content_digest: hashSchema,
        byte_size: positiveInteger,
      },
    },
    container_image: {
      type: 'object',
      additionalProperties: false,
      required: ['image_ref', 'image_digest'],
      properties: {
        image_ref: nonEmptyString,
        image_digest: hashSchema,
      },
    },
    dataset_mirrors: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ordinal', 'dataset_revision', 'object_ref', 'content_digest', 'byte_size'],
        properties: {
          ordinal: positiveInteger,
          dataset_revision: exactDatasetRevisionRefSchema,
          object_ref: nonEmptyString,
          content_digest: hashSchema,
          byte_size: positiveInteger,
        },
      },
    },
    entrypoint: nonEmptyString,
    arguments: { type: 'array', items: nonEmptyString },
    dependency_lock_digest: hashSchema,
    output_contract: {
      type: 'object',
      additionalProperties: false,
      dependencies: {
        scientific_result_schema_version: ['scientific_result_schema_hash'],
        scientific_result_schema_hash: ['scientific_result_schema_version'],
      },
      required: [
        'result_envelope_schema',
        'result_object_name',
        'parser_profile_version',
        'parser_profile_hash',
      ],
      properties: {
        result_envelope_schema: {
          type: 'string',
          const: 'ExperimentFoundationProviderResultEnvelope@v1',
        },
        result_object_name: nonEmptyString,
        parser_profile_version: nonEmptyString,
        parser_profile_hash: hashSchema,
        scientific_result_schema_version: nonEmptyString,
        scientific_result_schema_hash: hashSchema,
      },
    },
  },
} as const;

export const experimentFoundationExecutionBundleContentV2Schema = {
  ...experimentFoundationExecutionBundleContentV1Schema,
  allOf: [
    {
      if: {
        properties: {
          container_image: {
            type: 'object',
            properties: {
              provider_managed_asset: {
                type: 'object',
                properties: {
                  permitted_scope: {
                    const: 'm0_sci_p5_scientific_only',
                  },
                },
              },
            },
          },
        },
      },
      then: {
        properties: {
          output_contract: {
            type: 'object',
            required: [
              'scientific_result_schema_version',
              'scientific_result_schema_hash',
            ],
          },
        },
      },
      else: {
        properties: {
          output_contract: {
            type: 'object',
            not: {
              anyOf: [
                {
                  type: 'object',
                  required: ['scientific_result_schema_version'],
                },
                {
                  type: 'object',
                  required: ['scientific_result_schema_hash'],
                },
              ],
            },
          },
        },
      },
    },
  ],
  properties: {
    ...experimentFoundationExecutionBundleContentV1Schema.properties,
    execution_bundle_schema_version: { type: 'string', const: 'v2' },
    container_image: {
      type: 'object',
      additionalProperties: false,
      required: [
        'image_identity_kind',
        'image_ref',
        'provider_managed_asset',
      ],
      properties: {
        image_identity_kind: {
          type: 'string',
          const: 'provider_managed_asset',
        },
        image_ref: nonEmptyString,
        provider_managed_asset: {
          type: 'object',
          additionalProperties: false,
          required: [
            'provider',
            'asset_id',
            'region_id',
            'modified_at',
            'size_bytes',
            'accessibility',
            'source_type',
            'permitted_scope',
          ],
          properties: {
            provider: { type: 'string', const: 'aliyun_pai' },
            asset_id: nonEmptyString,
            region_id: nonEmptyString,
            modified_at: timestampSchema,
            size_bytes: jsonSafePositiveInteger,
            accessibility: { type: 'string', const: 'PUBLIC' },
            source_type: { type: 'string', const: 'Import' },
            permitted_scope: {
              type: 'string',
              enum: [...EXPERIMENT_FOUNDATION_PROVIDER_MANAGED_IMAGE_SCOPES_V2],
            },
          },
        },
      },
    },
  },
} as const;

export const experimentFoundationExecutionBundleContentSchema = {
  oneOf: [
    experimentFoundationExecutionBundleContentV1Schema,
    experimentFoundationExecutionBundleContentV2Schema,
  ],
} as const;

export const experimentFoundationExecutionBundleIdentityV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_id',
    'bundle_key',
    'display_name',
    'state_version',
    'created_at',
    'updated_at',
  ],
  properties: {
    execution_bundle_id: nonEmptyString,
    bundle_key: nonEmptyString,
    display_name: nonEmptyString,
    state_version: nonNegativeInteger,
    created_at: timestampSchema,
    updated_at: timestampSchema,
  },
} as const;

export const experimentFoundationExecutionBundleDraftV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['execution_bundle_id', 'draft_version', 'draft_content', 'updated_at'],
  properties: {
    execution_bundle_id: nonEmptyString,
    draft_version: positiveInteger,
    draft_content: experimentFoundationExecutionBundleContentSchema,
    updated_at: timestampSchema,
  },
} as const;

export const experimentFoundationExecutionBundleRevisionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_revision_id',
    'execution_bundle_id',
    'revision_sequence',
    'schema_version',
    'hash_profile',
    'content_hash',
    'revision_content',
    'created_at',
  ],
  properties: {
    execution_bundle_revision_id: nonEmptyString,
    execution_bundle_id: nonEmptyString,
    revision_sequence: positiveInteger,
    schema_version: { type: 'string', enum: ['v1', 'v2'] },
    hash_profile: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    },
    content_hash: hashSchema,
    revision_content: experimentFoundationExecutionBundleContentSchema,
    created_at: timestampSchema,
  },
} as const;

export const experimentFoundationExecutionBundleLifecycleEventV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'lifecycle_event_id',
    'execution_bundle_revision_id',
    'event_sequence',
    'status',
    'reason_code',
    'event_hash',
    'occurred_at',
  ],
  properties: {
    lifecycle_event_id: nonEmptyString,
    execution_bundle_revision_id: nonEmptyString,
    event_sequence: positiveInteger,
    status: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_LIFECYCLE_STATUSES_V2],
    },
    reason_code: nonEmptyString,
    event_hash: hashSchema,
    occurred_at: timestampSchema,
  },
} as const;

export const experimentFoundationExecutionBundleLifecycleProjectionV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_revision_id',
    'current_status',
    'latest_event_sequence',
    'latest_event_hash',
    'state_version',
    'updated_at',
  ],
  properties: {
    execution_bundle_revision_id: nonEmptyString,
    current_status: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_LIFECYCLE_STATUSES_V2],
    },
    latest_event_sequence: positiveInteger,
    latest_event_hash: hashSchema,
    state_version: nonNegativeInteger,
    updated_at: timestampSchema,
  },
} as const;

export const experimentFoundationExecutionBundleReadinessV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'execution_bundle_readiness_id',
    'execution_bundle_revision_id',
    'execution_bundle_revision_hash',
    'lifecycle_event_hash',
    'outcome',
    'reason_codes',
    'readiness_hash',
    'evaluated_at',
  ],
  properties: {
    execution_bundle_readiness_id: nonEmptyString,
    execution_bundle_revision_id: nonEmptyString,
    execution_bundle_revision_hash: hashSchema,
    lifecycle_event_hash: hashSchema,
    outcome: { type: 'string', enum: ['passed', 'blocked'] },
    reason_codes: { type: 'array', uniqueItems: true, items: nonEmptyString },
    readiness_hash: hashSchema,
    evaluated_at: timestampSchema,
  },
} as const;

export const paperImplementationExecutableWorkOrderRevisionSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'work_order_schema_version',
    'title',
    'objective',
    'readiness_attestation_id',
    'readiness_attestation_hash',
    'asset_dependencies',
    'execution_bundle',
    'run_policy',
  ],
  properties: {
    work_order_schema_version: { type: 'string', const: 'v2' },
    title: nonEmptyString,
    objective: nonEmptyString,
    readiness_attestation_id: nonEmptyString,
    readiness_attestation_hash: hashSchema,
    asset_dependencies: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['asset_type', 'logical_id', 'revision_id', 'revision_sequence', 'content_hash'],
        properties: {
          asset_type: {
            type: 'string',
            enum: ['Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol'],
          },
          logical_id: nonEmptyString,
          revision_id: nonEmptyString,
          revision_sequence: positiveInteger,
          content_hash: hashSchema,
        },
      },
    },
    execution_bundle: experimentFoundationExecutionBundleExactRevisionRefV2Schema,
    resource_snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['cpu_cores', 'memory_mb'],
      properties: {
        cpu_cores: positiveInteger,
        memory_mb: positiveInteger,
      },
    },
    run_policy: {
      type: 'object',
      additionalProperties: false,
      required: ['max_attempts_per_cell', 'timeout_seconds'],
      properties: {
        max_attempts_per_cell: positiveInteger,
        timeout_seconds: positiveInteger,
      },
    },
  },
} as const;

export const experimentFoundationExecutableRunRecipeSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'recipe_schema_version',
    'execution_bundle',
    'entrypoint',
    'arguments',
    'dependency_lock_digest',
    'environment_keys',
    'output_contract',
  ],
  properties: {
    recipe_schema_version: { type: 'string', const: 'v2' },
    execution_bundle: experimentFoundationExecutionBundleExactRevisionRefV2Schema,
    entrypoint: nonEmptyString,
    arguments: { type: 'array', items: nonEmptyString },
    dependency_lock_digest: hashSchema,
    environment_keys: { type: 'array', uniqueItems: true, items: nonEmptyString },
    output_contract: experimentFoundationExecutionBundleContentV1Schema
      .properties.output_contract,
  },
} as const;

export const experimentFoundationExecutableTrainingTaskSpecSnapshotV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'execution_bundle',
    'command_snapshot',
    'io_snapshot',
    'resource_snapshot',
    'retry_snapshot',
  ],
  properties: {
    schema_version: { type: 'string', const: 'v2' },
    execution_bundle: experimentFoundationExecutionBundleExactRevisionRefV2Schema,
    command_snapshot: {
      type: 'object',
      additionalProperties: false,
      required: ['command', 'arguments'],
      properties: {
        command: nonEmptyString,
        arguments: { type: 'array', items: nonEmptyString },
      },
    },
    io_snapshot: {
      type: 'object',
      additionalProperties: false,
      dependencies: {
        scientific_result_schema_version: ['scientific_result_schema_hash'],
        scientific_result_schema_hash: ['scientific_result_schema_version'],
      },
      required: [
        'input_keys',
        'output_keys',
        'input_mirror_ordinals',
        'result_object_name',
        'result_envelope_schema',
        'parser_profile_version',
        'parser_profile_hash',
      ],
      properties: {
        input_keys: { type: 'array', minItems: 1, uniqueItems: true, items: nonEmptyString },
        output_keys: {
          type: 'array',
          minItems: 1,
          maxItems: EXPERIMENT_FOUNDATION_REAL_PROVIDER_OUTPUT_KEYS_V2.length,
          uniqueItems: true,
          items: {
            type: 'string',
            enum: [...EXPERIMENT_FOUNDATION_REAL_PROVIDER_OUTPUT_KEYS_V2],
          },
        },
        input_mirror_ordinals: {
          type: 'array',
          minItems: 1,
          uniqueItems: true,
          items: positiveInteger,
        },
        result_object_name: nonEmptyString,
        result_envelope_schema: {
          type: 'string',
          const: 'ExperimentFoundationProviderResultEnvelope@v1',
        },
        parser_profile_version: nonEmptyString,
        parser_profile_hash: hashSchema,
        scientific_result_schema_version: nonEmptyString,
        scientific_result_schema_hash: hashSchema,
      },
    },
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
      required: ['max_attempts', 'timeout_seconds'],
      properties: {
        max_attempts: positiveInteger,
        timeout_seconds: positiveInteger,
      },
    },
  },
} as const;

export const experimentFoundationAliyunRealProviderRedactedManifestV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'manifest_schema_version',
    'payload_schema',
    'adapter_identity',
    'provider_profile_version',
    'source_binding',
    'request_summary',
    'provider_binding_hashes',
    'artifact_bindings',
    'redacted_fields',
  ],
  properties: {
    manifest_schema_version: {
      type: 'string',
      const: 'v1',
    },
    payload_schema: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
    },
    adapter_identity: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
    },
    provider_profile_version: nonEmptyString,
    source_binding: {
      type: 'object',
      additionalProperties: false,
      required: [
        'execution_bundle_revision_id',
        'execution_bundle_revision_hash',
        'run_id',
        'run_manifest_hash',
        'run_cell_id',
        'cell_key',
        'training_task_spec_id',
        'training_task_spec_hash',
      ],
      properties: {
        execution_bundle_revision_id: nonEmptyString,
        execution_bundle_revision_hash: hashSchema,
        run_id: nonEmptyString,
        run_manifest_hash: hashSchema,
        run_cell_id: nonEmptyString,
        cell_key: nonEmptyString,
        training_task_spec_id: nonEmptyString,
        training_task_spec_hash: hashSchema,
      },
    },
    request_summary: {
      type: 'object',
      additionalProperties: false,
      required: [
        'deterministic_display_name',
        'deterministic_tag_hash',
        'job_type',
        'pod_count',
        'cpu_cores',
        'memory_mb',
        'maximum_running_time_minutes',
        'data_source_count',
        'environment_variable_count',
      ],
      properties: {
        deterministic_display_name: nonEmptyString,
        deterministic_tag_hash: hashSchema,
        job_type: { type: 'string', const: 'PyTorchJob' },
        pod_count: { type: 'integer', const: 1 },
        cpu_cores: positiveInteger,
        memory_mb: positiveInteger,
        maximum_running_time_minutes: positiveInteger,
        data_source_count: { type: 'integer', minimum: 3, maximum: 34 },
        environment_variable_count: { type: 'integer', minimum: 4, maximum: 35 },
      },
    },
    provider_binding_hashes: {
      type: 'object',
      additionalProperties: false,
      required: [
        'execution_profile_hash',
        'region_id_hash',
        'workspace_id_hash',
        'resource_mode',
        'resource_id_hash',
        'image_ref_hash',
        'image_digest',
        'runtime_role_arn_hash',
      ],
      properties: {
        execution_profile_hash: hashSchema,
        region_id_hash: hashSchema,
        workspace_id_hash: hashSchema,
        resource_mode: { type: 'string', enum: ['exact_quota', 'public_resource'] },
        resource_id_hash: { anyOf: [hashSchema, { type: 'null' }] },
        image_ref_hash: hashSchema,
        image_digest: hashSchema,
        runtime_role_arn_hash: hashSchema,
      },
    },
    artifact_bindings: {
      type: 'object',
      additionalProperties: false,
      required: [
        'code_artifact',
        'dataset_mirrors',
        'output',
        'environment_hash',
      ],
      properties: {
        code_artifact: {
          type: 'object',
          additionalProperties: false,
          required: [
            'artifact_ref_hash',
            'content_digest',
            'byte_size',
            'mount_path_hash',
          ],
          properties: {
            artifact_ref_hash: hashSchema,
            content_digest: hashSchema,
            byte_size: positiveInteger,
            mount_path_hash: hashSchema,
          },
        },
        dataset_mirrors: {
          type: 'array',
          minItems: 1,
          maxItems: 32,
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'ordinal',
              'dataset_revision_hash',
              'object_ref_hash',
              'content_digest',
              'byte_size',
              'mount_path_hash',
            ],
            properties: {
              ordinal: positiveInteger,
              dataset_revision_hash: hashSchema,
              object_ref_hash: hashSchema,
              content_digest: hashSchema,
              byte_size: positiveInteger,
              mount_path_hash: hashSchema,
            },
          },
        },
        output: {
          type: 'object',
          additionalProperties: false,
          required: [
            'output_uri_hash',
            'mount_path_hash',
            'result_object_name_hash',
          ],
          properties: {
            output_uri_hash: hashSchema,
            mount_path_hash: hashSchema,
            result_object_name_hash: hashSchema,
          },
        },
        environment_hash: hashSchema,
      },
    },
    redacted_fields: {
      type: 'array',
      const: [
        'canonical_payload_bytes',
        'WorkspaceId',
        'ResourceId',
        'JobSpecs[0].Image',
        'UserCommand',
        'DataSources[*].Uri',
        'DataSources[*].MountPath',
        'DataSources[*].Options',
        'Envs',
        'CredentialConfig',
        'Settings.Tags',
      ],
    },
  },
} as const;

export const experimentFoundationAliyunRealProviderRedactedManifestV2Schema = {
  ...experimentFoundationAliyunRealProviderRedactedManifestV1Schema,
  properties: {
    ...experimentFoundationAliyunRealProviderRedactedManifestV1Schema.properties,
    manifest_schema_version: {
      type: 'string',
      const: 'v2',
    },
    provider_binding_hashes: {
      type: 'object',
      additionalProperties: false,
      required: [
        'execution_profile_hash',
        'region_id_hash',
        'workspace_id_hash',
        'resource_mode',
        'resource_id_hash',
        'image_ref_hash',
        'image_identity_kind',
        'provider_managed_asset_identity_hash',
        'provider_managed_asset_scope',
        'runtime_role_arn_hash',
      ],
      properties: {
        execution_profile_hash: hashSchema,
        region_id_hash: hashSchema,
        workspace_id_hash: hashSchema,
        resource_mode: { type: 'string', enum: ['exact_quota', 'public_resource'] },
        resource_id_hash: { anyOf: [hashSchema, { type: 'null' }] },
        image_ref_hash: hashSchema,
        image_identity_kind: {
          type: 'string',
          const: 'provider_managed_asset',
        },
        provider_managed_asset_identity_hash: hashSchema,
        provider_managed_asset_scope: {
          type: 'string',
          enum: [...EXPERIMENT_FOUNDATION_PROVIDER_MANAGED_IMAGE_SCOPES_V2],
        },
        runtime_role_arn_hash: hashSchema,
      },
    },
  },
} as const;

export const experimentFoundationRealProviderPayloadV2Schema = {
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
    'provider_profile_version',
    'redacted_manifest',
    'payload_hash',
    'payload_byte_size',
    'created_at',
  ],
  properties: {
    provider_payload_id: nonEmptyString,
    materialization_key: nonEmptyString,
    run_id: nonEmptyString,
    run_manifest_hash: hashSchema,
    run_cell_id: nonEmptyString,
    cell_key: nonEmptyString,
    training_task_spec_id: nonEmptyString,
    training_task_spec_hash: hashSchema,
    payload_schema: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
    },
    adapter_identity: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
    },
    execution_mode: { type: 'string', const: 'real_provider' },
    provenance: { type: 'string', const: 'real_provider' },
    provider_profile_version: nonEmptyString,
    redacted_manifest: {
      oneOf: [
        experimentFoundationAliyunRealProviderRedactedManifestV1Schema,
        experimentFoundationAliyunRealProviderRedactedManifestV2Schema,
      ],
    },
    payload_hash: hashSchema,
    payload_byte_size: positiveInteger,
    created_at: timestampSchema,
  },
} as const;

export const experimentFoundationAliyunRealExternalJobRefV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['ref_type', 'job_id', 'region_id_hash'],
  properties: {
    ref_type: { type: 'string', const: 'aliyun_pai_dlc_job' },
    job_id: nonEmptyString,
    region_id_hash: hashSchema,
  },
} as const;

export const experimentFoundationAliyunNormalizedProviderOutcomeV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'outcome_schema_version',
    'adapter_identity',
    'operation',
    'provider_idempotency_key',
    'payload_hash',
    'external_job_ref',
    'provider_status',
    'normalized_state',
    'result_manifest_hash',
    'response_hash',
  ],
  properties: {
    outcome_schema_version: {
      type: 'string',
      const: 'AliyunPaiDlcNormalizedOutcome@v1',
    },
    adapter_identity: {
      type: 'string',
      const: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
    },
    operation: {
      type: 'string',
      enum: ['submit', 'sync', 'reconcile', 'cancel', 'collect'],
    },
    provider_idempotency_key: nonEmptyString,
    payload_hash: hashSchema,
    external_job_ref: {
      anyOf: [experimentFoundationAliyunRealExternalJobRefV1Schema, { type: 'null' }],
    },
    provider_status: {
      anyOf: [
        {
          type: 'string',
          enum: [...EXPERIMENT_FOUNDATION_ALIYUN_JOB_STATUSES_V2],
        },
        { type: 'null' },
      ],
    },
    normalized_state: {
      type: 'string',
      enum: [
        'submitted',
        'running',
        'succeeded',
        'failed',
        'cancelled',
        'acceptance_ambiguous',
      ],
    },
    result_manifest_hash: { anyOf: [hashSchema, { type: 'null' }] },
    response_hash: hashSchema,
  },
} as const;

export const experimentFoundationProviderResultEnvelopeV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'result_envelope_schema',
    'execution_bundle_revision_id',
    'execution_bundle_revision_hash',
    'run_id',
    'run_manifest_hash',
    'run_cell_id',
    'cell_key',
    'training_task_spec_id',
    'training_task_spec_hash',
    'parser_profile_version',
    'parser_profile_hash',
    'outputs',
  ],
  properties: {
    result_envelope_schema: {
      type: 'string',
      const: 'ExperimentFoundationProviderResultEnvelope@v1',
    },
    execution_bundle_revision_id: nonEmptyString,
    execution_bundle_revision_hash: hashSchema,
    run_id: nonEmptyString,
    run_manifest_hash: hashSchema,
    run_cell_id: nonEmptyString,
    cell_key: nonEmptyString,
    training_task_spec_id: nonEmptyString,
    training_task_spec_hash: hashSchema,
    parser_profile_version: nonEmptyString,
    parser_profile_hash: hashSchema,
    outputs: { type: 'object' },
  },
} as const;
