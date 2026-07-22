import { timingSafeEqual } from 'node:crypto';

import { Ajv, type ValidateFunction } from 'ajv';
import { CreateJobRequest } from '@alicloud/pai-dlc20201203';

import {
  experimentFoundationAliyunPaiDlcCreateJobPayloadV2Schema,
  experimentFoundationAliyunPaiDlcExecutionProfileV2Schema,
  experimentFoundationAliyunPaiDlcRedactedManifestV2Schema,
  type ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2,
  type ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
  type ExperimentFoundationAliyunPaiDlcRedactedManifestV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

export const EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_PAYLOAD_SCHEMA =
  'AliyunPaiDlcCreateJobRequest@2020-12-03' as const;
export const EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES = 65_536;

const HASH_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);
const PAYLOAD_HASH_RECORD_KIND = 'AliyunPaiDlcCreateJobRequest';
const PAYLOAD_HASH_SCHEMA_VERSION = '2020-12-03';

export interface ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2 {
  run: ExperimentFoundationRunV2;
  run_cell: ExperimentFoundationRunCellV2;
  task_spec: ExperimentFoundationTrainingTaskSpecV2;
}

export interface ExperimentFoundationAliyunCreateJobMaterializationV2 {
  payload_hash: string;
  payload_byte_size: number;
  execution_profile_hash: string;
  redacted_manifest: ExperimentFoundationAliyunPaiDlcRedactedManifestV2;
  /** Transient provider bytes. These bytes must never be persisted or logged. */
  canonical_payload_bytes: string;
}

export class ExperimentFoundationAliyunCreateJobPayloadError extends Error {
  constructor(
    public readonly reasonCode:
      | 'ALIYUN_EXECUTION_PROFILE_INVALID'
      | 'ALIYUN_CREATE_JOB_PAYLOAD_INVALID'
      | 'ALIYUN_CREATE_JOB_PAYLOAD_TOO_LARGE'
      | 'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
    message: string,
    public readonly validationErrors: Array<{
      instance_path: string;
      keyword: string;
    }> = [],
  ) {
    super(message);
    this.name = 'ExperimentFoundationAliyunCreateJobPayloadError';
  }
}

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  removeAdditional: false,
});

const profileValidator: ValidateFunction<ExperimentFoundationAliyunPaiDlcExecutionProfileV2> =
  ajv.compile<ExperimentFoundationAliyunPaiDlcExecutionProfileV2>(
    experimentFoundationAliyunPaiDlcExecutionProfileV2Schema,
  );
const payloadValidator: ValidateFunction<ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2> =
  ajv.compile<ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2>(
    experimentFoundationAliyunPaiDlcCreateJobPayloadV2Schema,
  );
const manifestValidator: ValidateFunction<ExperimentFoundationAliyunPaiDlcRedactedManifestV2> =
  ajv.compile<ExperimentFoundationAliyunPaiDlcRedactedManifestV2>(
    experimentFoundationAliyunPaiDlcRedactedManifestV2Schema,
  );

export class ExperimentFoundationV2AliyunCreateJobPayloadService {
  materialize(
    prerequisite: ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2,
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
  ): ExperimentFoundationAliyunCreateJobMaterializationV2 {
    assertPrerequisite(prerequisite);
    assertExecutionProfile(profile);

    const payload: ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2 = {
      WorkspaceId: profile.workspace_id,
      ...(profile.resource_binding.mode === 'exact_quota'
        ? { ResourceId: profile.resource_binding.resource_id }
        : {}),
      DisplayName: deterministicDisplayName(prerequisite),
      JobType: profile.job_type,
      JobSpecs: [{
        Type: profile.job_spec_type,
        Image: profile.image_uri,
        PodCount: profile.pod_count,
        ResourceConfig: {
          CPU: String(prerequisite.task_spec.resource_snapshot.cpu_cores),
          Memory: `${prerequisite.task_spec.resource_snapshot.memory_mb}Mi`,
        },
      }],
      UserCommand: renderPosixCommand(
        prerequisite.task_spec.command_snapshot.command,
        prerequisite.task_spec.command_snapshot.arguments,
      ),
      Accessibility: 'PRIVATE',
    };
    assertCreateJobPayload(payload);

    const canonicalPayloadBytes = canonicalizeExperimentV2Json(payload);
    const payloadByteSize = Buffer.byteLength(canonicalPayloadBytes, 'utf8');
    if (payloadByteSize > EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES) {
      throw new ExperimentFoundationAliyunCreateJobPayloadError(
        'ALIYUN_CREATE_JOB_PAYLOAD_TOO_LARGE',
        'The exact Aliyun CreateJob request exceeds the documented 65,536-byte limit.',
      );
    }

    const executionProfileHash = hashAliyunProviderValue(
      'AliyunPaiDlcExecutionProfile',
      profile.schema_version,
      profile,
    );
    const commonProviderBindingHashes = {
      execution_profile_hash: executionProfileHash,
      region_id_hash: hashRedactedProviderRef('region_id', profile.region_id),
      workspace_id_hash: hashRedactedProviderRef('workspace_id', profile.workspace_id),
      image_uri_hash: hashRedactedProviderRef('image_uri', profile.image_uri),
    };
    const commonManifest = {
      schema_version: 'AliyunPaiDlcRedactedManifest@v2' as const,
      payload_schema: EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_PAYLOAD_SCHEMA,
      source_binding: {
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cell_id: prerequisite.run_cell.run_cell_id,
        cell_key: prerequisite.run_cell.cell_key,
        training_task_spec_id: prerequisite.task_spec.training_task_spec_id,
        training_task_spec_hash: prerequisite.task_spec.task_spec_hash,
      },
      request_summary: {
        display_name: payload.DisplayName,
        job_type: payload.JobType,
        job_spec_type: payload.JobSpecs[0].Type,
        pod_count: payload.JobSpecs[0].PodCount,
        cpu_cores: prerequisite.task_spec.resource_snapshot.cpu_cores,
        memory_mb: prerequisite.task_spec.resource_snapshot.memory_mb,
        argument_count: prerequisite.task_spec.command_snapshot.arguments.length,
      },
    };
    const redactedManifest: ExperimentFoundationAliyunPaiDlcRedactedManifestV2 =
      profile.resource_binding.mode === 'exact_quota'
        ? {
          ...commonManifest,
          provider_binding_hashes: {
            ...commonProviderBindingHashes,
            resource_mode: 'exact_quota',
            resource_id_hash: hashRedactedProviderRef(
              'resource_id',
              profile.resource_binding.resource_id,
            ),
          },
          redacted_fields: [
            'canonical_payload_bytes',
            'WorkspaceId',
            'ResourceId',
            'JobSpecs[0].Image',
            'UserCommand',
          ],
        }
        : {
          ...commonManifest,
          provider_binding_hashes: {
            ...commonProviderBindingHashes,
            resource_mode: 'public_resource',
            resource_id_hash: null,
          },
          redacted_fields: [
            'canonical_payload_bytes',
            'WorkspaceId',
            'JobSpecs[0].Image',
            'UserCommand',
          ],
        };
    assertRedactedManifest(redactedManifest);

    const serializedManifest = canonicalizeExperimentV2Json(redactedManifest);
    const forbiddenValues = [
      profile.workspace_id,
      profile.image_uri,
      payload.UserCommand,
      ...(profile.resource_binding.mode === 'exact_quota'
        ? [profile.resource_binding.resource_id]
        : []),
    ];
    for (const forbiddenValue of forbiddenValues) {
      if (forbiddenValue.length > 0 && serializedManifest.includes(forbiddenValue)) {
        throw new ExperimentFoundationAliyunCreateJobPayloadError(
          'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
          'The redacted CreateJob manifest contains a provider-sensitive field.',
        );
      }
    }

    return {
      payload_hash: hashAliyunCreateJobPayloadBytes(canonicalPayloadBytes),
      payload_byte_size: payloadByteSize,
      execution_profile_hash: executionProfileHash,
      redacted_manifest: redactedManifest,
      canonical_payload_bytes: canonicalPayloadBytes,
    };
  }

  verify(
    materialized: ExperimentFoundationAliyunCreateJobMaterializationV2,
  ): ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2 {
    let parsed: unknown;
    try {
      parsed = JSON.parse(materialized.canonical_payload_bytes);
    } catch {
      throw new ExperimentFoundationAliyunCreateJobPayloadError(
        'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
        'The materialized CreateJob bytes are not valid JSON.',
      );
    }
    if (
      canonicalizeExperimentV2Json(parsed) !== materialized.canonical_payload_bytes
      || !safeTextEqual(
        hashAliyunCreateJobPayloadBytes(materialized.canonical_payload_bytes),
        materialized.payload_hash,
      )
      || Buffer.byteLength(materialized.canonical_payload_bytes, 'utf8')
        !== materialized.payload_byte_size
      || materialized.payload_byte_size > EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES
      || !safeTextEqual(
        materialized.execution_profile_hash,
        materialized.redacted_manifest.provider_binding_hashes.execution_profile_hash,
      )
    ) {
      throw new ExperimentFoundationAliyunCreateJobPayloadError(
        'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
        'The materialized CreateJob bytes do not match their canonical hash and size.',
      );
    }
    assertCreateJobPayload(parsed);
    assertRedactedManifest(materialized.redacted_manifest);
    assertPayloadManifestBindings(parsed, materialized.redacted_manifest);
    return structuredClone(parsed);
  }
}

export function hashAliyunCreateJobPayloadBytes(canonicalPayloadBytes: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalPayloadBytes);
  } catch {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob payload bytes must be valid JSON.',
    );
  }
  if (canonicalizeExperimentV2Json(parsed) !== canonicalPayloadBytes) {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob payload bytes must use the canonical JSON profile.',
    );
  }
  assertCreateJobPayload(parsed);
  return hashAliyunProviderValue(
    PAYLOAD_HASH_RECORD_KIND,
    PAYLOAD_HASH_SCHEMA_VERSION,
    parsed,
  );
}

function assertExecutionProfile(
  value: unknown,
): asserts value is ExperimentFoundationAliyunPaiDlcExecutionProfileV2 {
  if (!profileValidator(value)) {
    throw validationError(
      'ALIYUN_EXECUTION_PROFILE_INVALID',
      'Aliyun execution profile failed its exact v2 schema.',
      profileValidator,
    );
  }
  if (/\s/.test(value.image_uri) || /[?#]/.test(value.image_uri)) {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_EXECUTION_PROFILE_INVALID',
      'Aliyun image URI must be an exact non-query registry reference.',
    );
  }
}

function assertCreateJobPayload(
  value: unknown,
): asserts value is ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2 {
  if (!payloadValidator(value)) {
    throw validationError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob request failed its exact offline schema.',
      payloadValidator,
    );
  }
  assertOfficialSdkWireRoundTrip(value);
}

function assertOfficialSdkWireRoundTrip(
  payload: ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2,
): void {
  try {
    const request = new CreateJobRequest({
      workspaceId: payload.WorkspaceId,
      ...(payload.ResourceId === undefined ? {} : { resourceId: payload.ResourceId }),
      displayName: payload.DisplayName,
      jobType: payload.JobType,
      jobSpecs: payload.JobSpecs.map((spec) => ({
        type: spec.Type,
        image: spec.Image,
        podCount: spec.PodCount,
        resourceConfig: {
          CPU: spec.ResourceConfig.CPU,
          memory: spec.ResourceConfig.Memory,
        },
      })),
      userCommand: payload.UserCommand,
      accessibility: payload.Accessibility,
    });
    request.validate();
    if (canonicalizeExperimentV2Json(request.toMap()) !== canonicalizeExperimentV2Json(payload)) {
      throw new Error('SDK wire map differs from the exact payload.');
    }
  } catch {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob request does not round-trip through the official SDK model.',
    );
  }
}

function assertRedactedManifest(
  value: unknown,
): asserts value is ExperimentFoundationAliyunPaiDlcRedactedManifestV2 {
  if (!manifestValidator(value)) {
    throw validationError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob redacted manifest failed its exact v2 schema.',
      manifestValidator,
    );
  }
}

function assertPayloadManifestBindings(
  payload: ExperimentFoundationAliyunPaiDlcCreateJobPayloadV2,
  manifest: ExperimentFoundationAliyunPaiDlcRedactedManifestV2,
): void {
  const bindings = manifest.provider_binding_hashes;
  const hasResourceId = Object.hasOwn(payload, 'ResourceId');
  const commonBindingsMatch = bindings.workspace_id_hash
      === hashRedactedProviderRef('workspace_id', payload.WorkspaceId)
    && bindings.image_uri_hash
      === hashRedactedProviderRef('image_uri', payload.JobSpecs[0].Image);
  const resourceBindingMatches = bindings.resource_mode === 'exact_quota'
    ? hasResourceId
      && payload.ResourceId !== undefined
      && bindings.resource_id_hash === hashRedactedProviderRef('resource_id', payload.ResourceId)
    : !hasResourceId && bindings.resource_id_hash === null;
  if (!commonBindingsMatch || !resourceBindingMatches) {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
      'The CreateJob payload and redacted manifest provider bindings differ.',
    );
  }
}

function assertPrerequisite(
  prerequisite: ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2,
): void {
  const { run, run_cell: runCell, task_spec: taskSpec } = prerequisite;
  if (
    run.run_id.length === 0
    || runCell.run_cell_id.length === 0
    || taskSpec.training_task_spec_id.length === 0
    || runCell.run_id !== run.run_id
    || runCell.training_task_spec_id !== taskSpec.training_task_spec_id
    || runCell.training_task_spec_hash !== taskSpec.task_spec_hash
    || run.external_pi_work_order_revision_id !== taskSpec.external_pi_work_order_revision_id
    || run.external_pi_work_order_revision_hash !== taskSpec.external_pi_work_order_revision_hash
    || runCell.external_pi_cell_id !== taskSpec.external_pi_cell_id
    || runCell.external_pi_cell_hash !== taskSpec.external_pi_cell_hash
    || !HASH_PATTERN.test(run.run_manifest_hash)
    || !HASH_PATTERN.test(taskSpec.task_spec_hash)
    || !Number.isSafeInteger(runCell.ordinal)
    || runCell.ordinal < 1
    || taskSpec.command_snapshot.command.length === 0
    || !Number.isSafeInteger(taskSpec.resource_snapshot.cpu_cores)
    || taskSpec.resource_snapshot.cpu_cores < 1
    || !Number.isSafeInteger(taskSpec.resource_snapshot.memory_mb)
    || taskSpec.resource_snapshot.memory_mb < 1
  ) {
    throw new ExperimentFoundationAliyunCreateJobPayloadError(
      'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
      'Aliyun CreateJob materialization requires one exact Run/RunCell/TaskSpec binding.',
    );
  }
}

function deterministicDisplayName(
  prerequisite: ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2,
): string {
  const suffix = hashAliyunProviderValue(
    'AliyunPaiDlcCreateJobDisplayName',
    'v1',
    {
      run_id: prerequisite.run.run_id,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: prerequisite.run_cell.run_cell_id,
      task_spec_hash: prerequisite.task_spec.task_spec_hash,
    },
  ).slice('sha256:'.length, 'sha256:'.length + 24);
  return `ef-v2-${prerequisite.run_cell.ordinal}-${suffix}`;
}

function renderPosixCommand(command: string, args: string[]): string {
  return [command, ...args].map(posixQuote).join(' ');
}

function posixQuote(value: string): string {
  if (value.length === 0) return "''";
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function hashRedactedProviderRef(kind: string, value: string): string {
  return hashAliyunProviderValue('AliyunPaiDlcRedactedProviderRef', 'v1', {
    ref_kind: kind,
    ref_value: value,
  });
}

function hashAliyunProviderValue(
  recordKind: string,
  schemaVersion: string,
  content: unknown,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: schemaVersion,
    hash_profile: 'ef-provider-payload-json@v1',
    content,
  });
}

function validationError(
  reasonCode:
    | 'ALIYUN_EXECUTION_PROFILE_INVALID'
    | 'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
  message: string,
  validator: ValidateFunction,
): ExperimentFoundationAliyunCreateJobPayloadError {
  return new ExperimentFoundationAliyunCreateJobPayloadError(
    reasonCode,
    message,
    (validator.errors ?? []).map((error) => ({
      instance_path: error.instancePath,
      keyword: error.keyword,
    })),
  );
}

function safeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length
    && timingSafeEqual(leftBuffer, rightBuffer);
}
