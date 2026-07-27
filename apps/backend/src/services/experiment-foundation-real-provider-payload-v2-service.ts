import { timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { Ajv, type ValidateFunction } from 'ajv';
import {
  CreateJobRequest,
  CreateJobRequestDataSources,
  CredentialConfig,
  CredentialConfigItem,
  CredentialRole,
} from '@alicloud/pai-dlc20201203';

import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
  experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
  experimentFoundationAliyunRealProviderProfileV2Schema,
  type ExperimentFoundationAliyunRealProviderCreateJobRequestV1,
  type ExperimentFoundationAliyunRealProviderProfileV2,
  type ExperimentFoundationAliyunRealProviderRedactedManifestV1,
  type ExperimentFoundationAliyunRealProviderRedactedManifestV2,
  type ExperimentFoundationExecutableTrainingTaskSpecV2,
  type ExperimentFoundationExecutionBundleContainerImage,
  type ExperimentFoundationExecutionBundleRevisionV2,
  type ExperimentFoundationRealProviderPayloadV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ExperimentFoundationProviderPayloadV2Record,
} from '../repositories/experiment-foundation-execution-v2.repository.js';

const EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_MAX_BYTES_V2 = 65_536;
const EXPERIMENT_FOUNDATION_REAL_PROVIDER_MAX_RUNNING_MINUTES_V2 = 60;
const EXPERIMENT_FOUNDATION_REAL_PROVIDER_MAX_DATASET_MIRRORS_V2 = 32;
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2 =
  'ef-provider-idempotency' as const;
const SOURCE_BINDING_ENV_KEY = 'EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON';
const CODE_DIR_ENV_KEY = 'EXPERIMENT_FOUNDATION_CODE_DIR';
const OUTPUT_DIR_ENV_KEY = 'EXPERIMENT_FOUNDATION_OUTPUT_DIR';
const REDACTED_FIELDS = [
  'canonical_payload_bytes',
  'WorkspaceId',
  'ResourceId',
  'JobSpecs[0].Image',
  'UserCommand',
  'DataSources[*].Uri',
  'DataSources[*].MountPath',
  'Envs',
  'CredentialConfig',
  'Settings.Tags',
] as const;

const ajv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const requestValidator: ValidateFunction<ExperimentFoundationAliyunRealProviderCreateJobRequestV1> =
  ajv.compile<ExperimentFoundationAliyunRealProviderCreateJobRequestV1>(
    experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
  );
const profileValidator: ValidateFunction<ExperimentFoundationAliyunRealProviderProfileV2> =
  ajv.compile<ExperimentFoundationAliyunRealProviderProfileV2>(
    experimentFoundationAliyunRealProviderProfileV2Schema,
  );

interface ExperimentFoundationRealProviderPayloadPrerequisiteV2 {
  run: ExperimentFoundationRunV2;
  run_cell: ExperimentFoundationRunCellV2;
  task_spec: ExperimentFoundationExecutableTrainingTaskSpecV2;
  execution_bundle_revision: ExperimentFoundationExecutionBundleRevisionV2;
  provider_idempotency_key: string;
}

export interface ExperimentFoundationMaterializedRealProviderPayloadV2 {
  record: Omit<ExperimentFoundationRealProviderPayloadV2, 'provider_payload_id' | 'created_at'>;
  /** Transient official-SDK request. This value must never be persisted or logged. */
  create_job_request: CreateJobRequest;
  canonical_payload_bytes: string;
  deterministic_display_name: string;
  deterministic_tag_value: string;
}

class ExperimentFoundationRealProviderPayloadV2Error extends Error {
  constructor(
    public readonly reasonCode:
      | 'REAL_PROVIDER_PAYLOAD_INVALID'
      | 'REAL_PROVIDER_PAYLOAD_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationRealProviderPayloadV2Error';
  }
}

export class ExperimentFoundationRealProviderPayloadV2Service {
  materialize(
    prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
    profile: ExperimentFoundationAliyunRealProviderProfileV2,
  ): ExperimentFoundationMaterializedRealProviderPayloadV2 {
    assertExactPrerequisite(prerequisite);
    assertProfile(profile, prerequisite);

    const sourceBinding = {
      execution_bundle_revision_id:
        prerequisite.execution_bundle_revision.execution_bundle_revision_id,
      execution_bundle_revision_hash: prerequisite.execution_bundle_revision.content_hash,
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: prerequisite.run_cell.run_cell_id,
      cell_key: prerequisite.run_cell.cell_key,
      training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
      training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
    };
    const resultSourceBinding = {
      result_envelope_schema: prerequisite.task_spec.io_snapshot.result_envelope_schema,
      ...sourceBinding,
      parser_profile_version: prerequisite.task_spec.io_snapshot.parser_profile_version,
      parser_profile_hash: prerequisite.task_spec.io_snapshot.parser_profile_hash,
    };
    const workload = materializeWorkloadBindings(
      prerequisite,
      profile,
      canonicalizeExperimentV2Json(resultSourceBinding),
    );
    const deterministicTagValue = hashRealProviderValue(
      'AliyunPaiDlcProviderIdempotencyTag',
      { provider_idempotency_key: prerequisite.provider_idempotency_key },
    ).slice('sha256:'.length);
    const deterministicDisplayName = [
      'ef-v2-real',
      prerequisite.run_cell.ordinal,
      deterministicTagValue.slice(0, 24),
    ].join('-');
    const maximumRunningTimeMinutes = Math.min(
      EXPERIMENT_FOUNDATION_REAL_PROVIDER_MAX_RUNNING_MINUTES_V2,
      Math.max(1, Math.ceil(prerequisite.task_spec.retry_snapshot.timeout_seconds / 60)),
    );
    const request = new CreateJobRequest({
      workspaceId: profile.workspace_id,
      ...(profile.resource_binding.mode === 'exact_quota'
        ? { resourceId: profile.resource_binding.resource_id }
        : {}),
      credentialConfig: new CredentialConfig({
        enableCredentialInject: true,
        aliyunEnvRoleKey: '0',
        credentialConfigItems: [
          new CredentialConfigItem({
            key: '0',
            type: 'Role',
            roles: [
              new CredentialRole({
                assumeRoleFor: workload.runtime_account_id,
                roleType: 'service',
                roleArn: profile.workload_binding.runtime_role_arn,
              }),
            ],
          }),
        ],
      }),
      dataSources: workload.data_sources,
      displayName: deterministicDisplayName,
      envs: workload.envs,
      jobType: profile.job_type,
      jobSpecs: [{
        type: profile.job_spec_type,
        image: prerequisite.execution_bundle_revision.revision_content.container_image.image_ref,
        podCount: profile.pod_count,
        resourceConfig: {
          CPU: String(prerequisite.task_spec.resource_snapshot.cpu_cores),
          memory: `${prerequisite.task_spec.resource_snapshot.memory_mb}Mi`,
        },
      }],
      userCommand: renderPosixCommand(
        prerequisite.task_spec.command_snapshot.command,
        prerequisite.task_spec.command_snapshot.arguments,
      ),
      jobMaxRunningTimeMinutes: maximumRunningTimeMinutes,
      settings: {
        tags: {
          [EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2]:
            deterministicTagValue,
        },
      },
      accessibility: 'PRIVATE',
    });
    try {
      request.validate();
    } catch {
      throw invalid('Aliyun CreateJob request failed official SDK validation.');
    }
    const requestMap = request.toMap();
    if (!requestValidator(requestMap)) {
      throw invalid('Aliyun CreateJob request failed the exact real-provider payload schema.');
    }
    const canonicalPayloadBytes = canonicalizeExperimentV2Json(requestMap);
    const payloadByteSize = Buffer.byteLength(canonicalPayloadBytes, 'utf8');
    if (
      payloadByteSize < 1
      || payloadByteSize > EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_MAX_BYTES_V2
    ) {
      throw invalid('Aliyun CreateJob request exceeds the exact byte-size ceiling.');
    }
    const payloadHash = hashRealProviderValue(
      'AliyunPaiDlcCreateJobPayload',
      JSON.parse(canonicalPayloadBytes) as unknown,
    );
    const executionProfileHash = hashRealProviderValue(
      'AliyunPaiDlcRealProviderProfile',
      profile,
    );
    const imageManifestBinding = materializeContainerImageManifestBinding(
      prerequisite.execution_bundle_revision.revision_content.container_image,
      {
        execution_profile_hash: executionProfileHash,
        region_id_hash: hashProviderRef('region_id', profile.region_id),
        workspace_id_hash: hashProviderRef('workspace_id', profile.workspace_id),
        resource_mode: profile.resource_binding.mode,
        resource_id_hash: profile.resource_binding.mode === 'exact_quota'
          ? hashProviderRef('resource_id', profile.resource_binding.resource_id)
          : null,
        image_ref_hash: hashProviderRef(
          'image_ref',
          prerequisite.execution_bundle_revision.revision_content.container_image.image_ref,
        ),
        runtime_role_arn_hash: hashProviderRef(
          'runtime_role_arn',
          profile.workload_binding.runtime_role_arn,
        ),
      },
    );
    const redactedManifest:
      | ExperimentFoundationAliyunRealProviderRedactedManifestV1
      | ExperimentFoundationAliyunRealProviderRedactedManifestV2 = {
      ...imageManifestBinding,
      payload_schema: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
      adapter_identity: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
      provider_profile_version: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2,
      source_binding: sourceBinding,
      request_summary: {
        deterministic_display_name: deterministicDisplayName,
        deterministic_tag_hash: hashRealProviderValue(
          'AliyunPaiDlcProviderIdempotencyTagValue',
          { tag_value: deterministicTagValue },
        ),
        job_type: 'PyTorchJob',
        pod_count: 1,
        cpu_cores: prerequisite.task_spec.resource_snapshot.cpu_cores,
        memory_mb: prerequisite.task_spec.resource_snapshot.memory_mb,
        maximum_running_time_minutes: maximumRunningTimeMinutes,
        data_source_count: workload.data_sources.length,
        environment_variable_count: Object.keys(workload.envs).length,
      },
      artifact_bindings: {
        code_artifact: {
          artifact_ref_hash: hashProviderRef(
            'code_artifact_ref',
            prerequisite.execution_bundle_revision.revision_content.code_artifact.artifact_ref,
          ),
          content_digest:
            prerequisite.execution_bundle_revision.revision_content.code_artifact.content_digest,
          byte_size:
            prerequisite.execution_bundle_revision.revision_content.code_artifact.byte_size,
          mount_path_hash: hashProviderRef(
            'code_mount_path',
            profile.workload_binding.code_mount_path,
          ),
        },
        dataset_mirrors:
          prerequisite.execution_bundle_revision.revision_content.dataset_mirrors.map(
            (mirror) => ({
              ordinal: mirror.ordinal,
              dataset_revision_hash: hashRealProviderValue(
                'AliyunPaiDlcDatasetRevisionRef',
                mirror.dataset_revision,
              ),
              object_ref_hash: hashProviderRef(
                `dataset_mirror_${mirror.ordinal}_object_ref`,
                mirror.object_ref,
              ),
              content_digest: mirror.content_digest,
              byte_size: mirror.byte_size,
              mount_path_hash: hashProviderRef(
                `dataset_mirror_${mirror.ordinal}_mount_path`,
                datasetMountPath(profile.workload_binding.input_mount_root, mirror.ordinal),
              ),
            }),
          ),
        output: {
          output_uri_hash: hashProviderRef('output_uri', workload.output_uri),
          mount_path_hash: hashProviderRef(
            'output_mount_path',
            profile.workload_binding.output_mount_path,
          ),
          result_object_name_hash: hashProviderRef(
            'result_object_name',
            prerequisite.task_spec.io_snapshot.result_object_name,
          ),
        },
        environment_hash: hashRealProviderValue(
          'AliyunPaiDlcWorkloadEnvironment',
          workload.envs,
        ),
      },
      redacted_fields: [...REDACTED_FIELDS],
    };
    const manifestHash = hashRealProviderValue(
      'AliyunPaiDlcRealProviderRedactedManifest',
      redactedManifest,
    );
    return {
      record: {
        materialization_key: hashRealProviderValue(
          'AliyunPaiDlcProviderPayloadMaterialization',
          { source_binding: sourceBinding, execution_profile_hash: executionProfileHash, manifest_hash: manifestHash },
        ),
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: prerequisite.run_cell.run_cell_id,
        cell_key: prerequisite.run_cell.cell_key,
        training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
        training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
        payload_schema: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
        adapter_identity: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
        execution_mode: 'real_provider',
        provenance: 'real_provider',
        provider_profile_version: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2,
        redacted_manifest: redactedManifest,
        payload_hash: payloadHash,
        payload_byte_size: payloadByteSize,
      },
      create_job_request: request,
      canonical_payload_bytes: canonicalPayloadBytes,
      deterministic_display_name: deterministicDisplayName,
      deterministic_tag_value: deterministicTagValue,
    };
  }

  verify(
    materialized: ExperimentFoundationMaterializedRealProviderPayloadV2,
  ): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(materialized.canonical_payload_bytes);
    } catch {
      throw conflict('Aliyun CreateJob canonical bytes are not valid JSON.');
    }
    const canonical = canonicalizeExperimentV2Json(parsed);
    if (
      !safeEqual(canonical, materialized.canonical_payload_bytes)
      || !safeEqual(
        hashRealProviderValue('AliyunPaiDlcCreateJobPayload', parsed),
        materialized.record.payload_hash,
      )
      || Buffer.byteLength(canonical, 'utf8') !== materialized.record.payload_byte_size
      || materialized.record.redacted_manifest.request_summary.deterministic_display_name
        !== materialized.deterministic_display_name
    ) {
      throw conflict('Aliyun CreateJob canonical payload binding drifted.');
    }
  }

  rematerializeAndVerify(
    prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
    profile: ExperimentFoundationAliyunRealProviderProfileV2,
    persisted: ExperimentFoundationProviderPayloadV2Record,
  ): ExperimentFoundationMaterializedRealProviderPayloadV2 {
    if (
      persisted.payload_schema !== EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2
      || persisted.adapter_identity !== EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2
      || persisted.execution_mode !== 'real_provider'
      || persisted.provenance !== 'real_provider'
    ) {
      throw conflict('Persisted ProviderPayload is not the exact real-provider tuple.');
    }
    const materialized = this.materialize(prerequisite, profile);
    this.verify(materialized);
    if (!isDeepStrictEqual(materialized.record, {
      materialization_key: persisted.materialization_key,
      run_id: persisted.run_id,
      run_manifest_hash: persisted.run_manifest_hash,
      run_cell_id: persisted.run_cell_id,
      cell_key: persisted.cell_key,
      training_task_spec_id: persisted.training_task_spec_id,
      training_task_spec_hash: persisted.training_task_spec_hash,
      payload_schema: persisted.payload_schema,
      adapter_identity: persisted.adapter_identity,
      execution_mode: persisted.execution_mode,
      provenance: persisted.provenance,
      provider_profile_version: persisted.provider_profile_version,
      redacted_manifest: persisted.redacted_manifest,
      payload_hash: persisted.payload_hash,
      payload_byte_size: persisted.payload_byte_size,
    })) {
      throw conflict('Persisted real ProviderPayload drifted from exact rematerialization.');
    }
    return materialized;
  }
}

function assertExactPrerequisite(
  prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
): void {
  const bundleRef = prerequisite.task_spec.execution_bundle;
  if (
    prerequisite.run_cell.run_id !== prerequisite.run.run_id
    || prerequisite.run_cell.training_task_spec_id
      !== prerequisite.task_spec.training_task_spec_id
    || prerequisite.run_cell.training_task_spec_hash !== prerequisite.task_spec.task_spec_hash
    || prerequisite.task_spec.external_pi_work_order_revision_id
      !== prerequisite.run.external_pi_work_order_revision_id
    || bundleRef.execution_bundle_revision_id
      !== prerequisite.execution_bundle_revision.execution_bundle_revision_id
    || bundleRef.execution_bundle_id
      !== prerequisite.execution_bundle_revision.execution_bundle_id
    || bundleRef.content_hash !== prerequisite.execution_bundle_revision.content_hash
    || bundleRef.revision_sequence
      !== prerequisite.execution_bundle_revision.revision_sequence
    || prerequisite.provider_idempotency_key.trim().length === 0
  ) {
    throw invalid('Real-provider payload prerequisite exact lineage drifted.');
  }
}

function assertProfile(
  profile: ExperimentFoundationAliyunRealProviderProfileV2,
  prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
): void {
  if (
    profile.schema_version !== EXPERIMENT_FOUNDATION_REAL_PROVIDER_PROFILE_SCHEMA_V2
    || profile.job_type !== 'PyTorchJob'
    || profile.job_spec_type !== 'Worker'
    || profile.pod_count !== 1
    || profile.image_uri
      !== prerequisite.execution_bundle_revision.revision_content.container_image.image_ref
    || !profileValidator(profile)
  ) {
    throw invalid('Aliyun execution profile does not match the exact ExecutionBundle image.');
  }
}

type ProviderBindingCommon = Omit<
  ExperimentFoundationAliyunRealProviderRedactedManifestV1['provider_binding_hashes'],
  'image_digest'
>;

type ContainerImageManifestBinding =
  | Pick<
    ExperimentFoundationAliyunRealProviderRedactedManifestV1,
    'manifest_schema_version' | 'provider_binding_hashes'
  >
  | Pick<
    ExperimentFoundationAliyunRealProviderRedactedManifestV2,
    'manifest_schema_version' | 'provider_binding_hashes'
  >;

function materializeContainerImageManifestBinding(
  image: ExperimentFoundationExecutionBundleContainerImage,
  common: ProviderBindingCommon,
): ContainerImageManifestBinding {
  if ('image_digest' in image) {
    return {
      manifest_schema_version: 'v1',
      provider_binding_hashes: {
        ...common,
        image_digest: image.image_digest,
      },
    };
  }
  return {
    manifest_schema_version: 'v2',
    provider_binding_hashes: {
      ...common,
      image_identity_kind: image.image_identity_kind,
      provider_managed_asset_identity_hash: hashRealProviderValue(
        'AliyunPaiProviderManagedImageAsset',
        image.provider_managed_asset,
      ),
      provider_managed_asset_scope:
        image.provider_managed_asset.permitted_scope,
    },
  };
}

function materializeWorkloadBindings(
  prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
  profile: ExperimentFoundationAliyunRealProviderProfileV2,
  canonicalSourceBinding: string,
): {
  data_sources: CreateJobRequestDataSources[];
  envs: Record<string, string>;
  output_uri: string;
  runtime_account_id: string;
} {
  const binding = profile.workload_binding;
  const content = prerequisite.execution_bundle_revision.revision_content;
  const mirrors = content.dataset_mirrors;
  if (
    mirrors.length < 1
    || mirrors.length > EXPERIMENT_FOUNDATION_REAL_PROVIDER_MAX_DATASET_MIRRORS_V2
    || !isDeepStrictEqual(
      prerequisite.task_spec.io_snapshot.input_mirror_ordinals,
      mirrors.map((mirror) => mirror.ordinal),
    )
  ) {
    throw invalid('Real-provider dataset mirror bindings are incomplete or out of order.');
  }
  assertSafePathSegment(prerequisite.run.run_id, 'run_id');
  assertSafePathSegment(prerequisite.run_cell.cell_key, 'cell_key');
  assertSafePathSegment(
    prerequisite.task_spec.io_snapshot.result_object_name,
    'result_object_name',
  );
  assertDistinctMountRoots(binding);

  const outputRoot = parseOssDirectoryUri(binding.output_uri_prefix);
  if (outputRoot.region_id !== profile.region_id || outputRoot.path !== 'output/') {
    throw invalid('Real-provider output URI must be the exact regional output/ root.');
  }
  assertContentAddressedInput(
    content.code_artifact.artifact_ref,
    content.code_artifact.content_digest,
    outputRoot,
    profile.region_id,
    'code artifact',
  );
  for (const mirror of mirrors) {
    assertContentAddressedInput(
      mirror.object_ref,
      mirror.content_digest,
      outputRoot,
      profile.region_id,
      `dataset mirror ${mirror.ordinal}`,
    );
  }
  const commandValues = [
    prerequisite.task_spec.command_snapshot.command,
    ...prerequisite.task_spec.command_snapshot.arguments,
  ];
  if (!commandValues.some((value) => (
    value === binding.code_mount_path
    || value.startsWith(`${binding.code_mount_path}/`)
  ))) {
    throw invalid('Real-provider user command does not execute from the exact code mount.');
  }

  const outputUri = [
    binding.output_uri_prefix,
    prerequisite.run.run_id,
    '/',
    prerequisite.run_cell.cell_key,
    '/',
  ].join('');
  const envs: Record<string, string> = {
    [SOURCE_BINDING_ENV_KEY]: canonicalSourceBinding,
    [CODE_DIR_ENV_KEY]: binding.code_mount_path,
    [OUTPUT_DIR_ENV_KEY]: binding.output_mount_path,
  };
  for (const mirror of mirrors) {
    envs[`EXPERIMENT_FOUNDATION_INPUT_${mirror.ordinal}_DIR`] =
      datasetMountPath(binding.input_mount_root, mirror.ordinal);
  }
  const dataSources = [
    new CreateJobRequestDataSources({
      uri: content.code_artifact.artifact_ref,
      mountPath: binding.code_mount_path,
      mountAccess: 'RO',
    }),
    ...mirrors.map((mirror) => new CreateJobRequestDataSources({
      uri: mirror.object_ref,
      mountPath: datasetMountPath(binding.input_mount_root, mirror.ordinal),
      mountAccess: 'RO',
    })),
    new CreateJobRequestDataSources({
      uri: outputUri,
      mountPath: binding.output_mount_path,
      mountAccess: 'RW',
    }),
  ];
  const roleMatch = /^acs:ram::([0-9]{6,32}):role\/[A-Za-z0-9@._-]{1,64}$/u.exec(
    binding.runtime_role_arn,
  );
  if (!roleMatch) {
    throw invalid('Real-provider runtime role ARN is invalid.');
  }
  return {
    data_sources: dataSources,
    envs,
    output_uri: outputUri,
    runtime_account_id: roleMatch[1]!,
  };
}

function assertDistinctMountRoots(
  binding: ExperimentFoundationAliyunRealProviderProfileV2['workload_binding'],
): void {
  const paths = [
    binding.code_mount_path,
    binding.input_mount_root,
    binding.output_mount_path,
  ];
  if (
    paths.some((path) => path.endsWith('/'))
    || paths.some((path, index) => paths.some((other, otherIndex) => (
      index !== otherIndex
      && (path === other || path.startsWith(`${other}/`) || other.startsWith(`${path}/`))
    )))
  ) {
    throw invalid('Real-provider mount roots must be distinct, non-nested, and canonical.');
  }
}

function assertContentAddressedInput(
  uri: string,
  digest: string,
  outputRoot: OssDirectoryRef,
  expectedRegionId: string,
  label: string,
): void {
  const parsed = parseOssDirectoryUri(uri);
  const digestSegment = digest.slice('sha256:'.length);
  if (
    parsed.bucket !== outputRoot.bucket
    || parsed.region_id !== expectedRegionId
    || parsed.path.startsWith('input/') === false
    || !parsed.path.split('/').includes(digestSegment)
  ) {
    throw invalid(`${label} must be a content-addressed input/ URI in the exact bucket.`);
  }
}

interface OssDirectoryRef {
  bucket: string;
  region_id: string;
  path: string;
}

function parseOssDirectoryUri(value: string): OssDirectoryRef {
  const match =
    /^oss:\/\/([a-z0-9][a-z0-9-]{1,62})\.oss-([a-z0-9-]+)-internal\.aliyuncs\.com\/(.+\/)$/u
      .exec(value);
  const path = match?.[3];
  if (
    !match
    || !path
    || path.includes('//')
    || path.includes('?')
    || path.includes('#')
    || path.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw invalid('Real-provider OSS binding must be an exact internal directory URI.');
  }
  return {
    bucket: match[1]!,
    region_id: match[2]!,
    path,
  };
}

function assertSafePathSegment(value: string, label: string): void {
  if (!/^[A-Za-z0-9_.-]{1,256}$/u.test(value)) {
    throw invalid(`${label} must be one safe provider path segment.`);
  }
}

function datasetMountPath(inputMountRoot: string, ordinal: number): string {
  return `${inputMountRoot}/${ordinal}`;
}

function renderPosixCommand(command: string, arguments_: string[]): string {
  return [command, ...arguments_].map(posixQuote).join(' ');
}

function posixQuote(value: string): string {
  if (value.length === 0) return "''";
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function hashProviderRef(kind: string, value: string): string {
  return hashRealProviderValue('AliyunPaiDlcRedactedProviderRef', {
    ref_kind: kind,
    ref_value: value,
  });
}

function hashRealProviderValue(recordKind: string, content: unknown): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
    content,
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}

function invalid(message: string): ExperimentFoundationRealProviderPayloadV2Error {
  return new ExperimentFoundationRealProviderPayloadV2Error(
    'REAL_PROVIDER_PAYLOAD_INVALID',
    message,
  );
}

function conflict(message: string): ExperimentFoundationRealProviderPayloadV2Error {
  return new ExperimentFoundationRealProviderPayloadV2Error(
    'REAL_PROVIDER_PAYLOAD_CONFLICT',
    message,
  );
}
