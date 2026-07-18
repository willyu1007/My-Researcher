import { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

export const EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS = [
  'CP01_EXACT_SCOPE',
  'CP02_OFFLINE_CREATE_JOB_PAYLOAD',
  'CP03_PAYLOAD_HASH_REDACTION',
  'CP04_WRITE_HARD_DENY',
  'CP05_READ_ONLY_ALLOWLIST',
  'CP06_IDENTITY_POLICY',
  'CP07_SIGNING_ENDPOINT_REGION',
  'CP08_WORKSPACE_ENABLED',
  'CP09_RESOURCE_VISIBLE',
  'CP10_SAME_PAYLOAD_FAKE_LIFECYCLE',
  'CP11_ZERO_CLOUD_WRITES',
  'CP12_ZERO_SCIENTIFIC_WRITES',
] as const;

export type ExperimentFoundationCloudPreflightV2CheckId =
  (typeof EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS)[number];

export const EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_STATUSES = [
  'passed',
  'blocked',
  'failed',
] as const;

export type ExperimentFoundationCloudPreflightV2CheckStatus =
  (typeof EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_STATUSES = [
  'cloud_preflight_passed',
  'blocked',
  'failed',
] as const;

export type ExperimentFoundationCloudPreflightV2Status =
  (typeof EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_STATUSES)[number];

export const EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2 = [
  'AIWorkspace.GetWorkspace',
  'AIWorkspace.ListResources',
  'PaiDlc.ListEcsSpecs',
] as const;

export type ExperimentFoundationAliyunReadOnlyOperationV2 =
  (typeof EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2)[number];

export const EXPERIMENT_FOUNDATION_ALIYUN_FORBIDDEN_WRITE_OPERATION_V2 =
  'PaiDlc.CreateJob' as const;

export const EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_UNVERIFIED_BEHAVIORS_V2 = [
  'scheduler_acceptance_and_capacity_stock',
  'runtime_image_pull',
  'data_and_code_mounts',
  'runtime_network_path',
  'accelerator_health',
  'user_command_execution',
  'cloud_logs_and_results',
  'real_cancellation_and_cleanup',
  'scientific_validation_and_evidence',
] as const;

export interface ExperimentFoundationAliyunPaiDlcExecutionProfileV1 {
  schema_version: 'AliyunPaiDlcExecutionProfile@v1';
  region_id: string;
  workspace_id: string;
  resource_id: string;
  image_uri: string;
  job_type: 'PyTorchJob';
  job_spec_type: 'Worker';
  pod_count: 1;
}

export interface ExperimentFoundationAliyunPaiDlcCreateJobPayloadV1 {
  WorkspaceId: string;
  ResourceId: string;
  DisplayName: string;
  JobType: 'PyTorchJob';
  JobSpecs: [{
    Type: 'Worker';
    Image: string;
    PodCount: 1;
    ResourceConfig: {
      CPU: string;
      Memory: string;
    };
  }];
  UserCommand: string;
  Accessibility: 'PRIVATE';
}

export interface ExperimentFoundationAliyunPaiDlcRedactedManifestV1 {
  schema_version: 'AliyunPaiDlcRedactedManifest@v1';
  payload_schema: 'AliyunPaiDlcCreateJobRequest@2020-12-03';
  source_binding: {
    run_id: string;
    run_manifest_hash: string;
    run_cell_id: string;
    cell_key: string;
    training_task_spec_id: string;
    training_task_spec_hash: string;
  };
  provider_binding_hashes: {
    execution_profile_hash: string;
    region_id_hash: string;
    workspace_id_hash: string;
    resource_id_hash: string;
    image_uri_hash: string;
  };
  request_summary: {
    display_name: string;
    job_type: 'PyTorchJob';
    job_spec_type: 'Worker';
    pod_count: 1;
    cpu_cores: number;
    memory_mb: number;
    argument_count: number;
  };
  redacted_fields: [
    'canonical_payload_bytes',
    'WorkspaceId',
    'ResourceId',
    'JobSpecs[0].Image',
    'UserCommand',
  ];
}

export interface ExperimentFoundationCloudPreflightV2CheckOutcome {
  id: ExperimentFoundationCloudPreflightV2CheckId;
  status: ExperimentFoundationCloudPreflightV2CheckStatus;
  summary: string;
  reason_code?: string;
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const hashSchema = { type: 'string', pattern: EXPERIMENT_V2_HASH_PATTERN } as const;

export const experimentFoundationAliyunPaiDlcExecutionProfileV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'region_id',
    'workspace_id',
    'resource_id',
    'image_uri',
    'job_type',
    'job_spec_type',
    'pod_count',
  ],
  properties: {
    schema_version: { type: 'string', const: 'AliyunPaiDlcExecutionProfile@v1' },
    region_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9-]{1,62}$' },
    workspace_id: nonEmptyString,
    resource_id: nonEmptyString,
    image_uri: { type: 'string', minLength: 3, maxLength: 2048 },
    job_type: { type: 'string', const: 'PyTorchJob' },
    job_spec_type: { type: 'string', const: 'Worker' },
    pod_count: { type: 'integer', const: 1 },
  },
} as const;

export const experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'WorkspaceId',
    'ResourceId',
    'DisplayName',
    'JobType',
    'JobSpecs',
    'UserCommand',
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
        required: ['Type', 'Image', 'PodCount', 'ResourceConfig'],
        properties: {
          Type: { type: 'string', const: 'Worker' },
          Image: { type: 'string', minLength: 3, maxLength: 2048 },
          PodCount: { type: 'integer', const: 1 },
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
      },
    },
    UserCommand: nonEmptyString,
    Accessibility: { type: 'string', const: 'PRIVATE' },
  },
} as const;

export const experimentFoundationAliyunPaiDlcRedactedManifestV1Schema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'payload_schema',
    'source_binding',
    'provider_binding_hashes',
    'request_summary',
    'redacted_fields',
  ],
  properties: {
    schema_version: { type: 'string', const: 'AliyunPaiDlcRedactedManifest@v1' },
    payload_schema: {
      type: 'string',
      const: 'AliyunPaiDlcCreateJobRequest@2020-12-03',
    },
    source_binding: {
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
        run_id: nonEmptyString,
        run_manifest_hash: hashSchema,
        run_cell_id: nonEmptyString,
        cell_key: nonEmptyString,
        training_task_spec_id: nonEmptyString,
        training_task_spec_hash: hashSchema,
      },
    },
    provider_binding_hashes: {
      type: 'object',
      additionalProperties: false,
      required: [
        'execution_profile_hash',
        'region_id_hash',
        'workspace_id_hash',
        'resource_id_hash',
        'image_uri_hash',
      ],
      properties: {
        execution_profile_hash: hashSchema,
        region_id_hash: hashSchema,
        workspace_id_hash: hashSchema,
        resource_id_hash: hashSchema,
        image_uri_hash: hashSchema,
      },
    },
    request_summary: {
      type: 'object',
      additionalProperties: false,
      required: [
        'display_name',
        'job_type',
        'job_spec_type',
        'pod_count',
        'cpu_cores',
        'memory_mb',
        'argument_count',
      ],
      properties: {
        display_name: nonEmptyString,
        job_type: { type: 'string', const: 'PyTorchJob' },
        job_spec_type: { type: 'string', const: 'Worker' },
        pod_count: { type: 'integer', const: 1 },
        cpu_cores: { type: 'integer', minimum: 1 },
        memory_mb: { type: 'integer', minimum: 1 },
        argument_count: { type: 'integer', minimum: 0 },
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
      ],
    },
  },
} as const;

export const experimentFoundationCloudPreflightV2CheckOutcomeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'status', 'summary'],
  properties: {
    id: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS],
    },
    status: {
      type: 'string',
      enum: [...EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_STATUSES],
    },
    summary: nonEmptyString,
    reason_code: nonEmptyString,
  },
} as const;
