import { timingSafeEqual } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { CreateJobRequest } from '@alicloud/pai-dlc20201203';

import type {
  ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_HASH_PROFILE_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
  type ExperimentFoundationAliyunRealProviderRedactedManifestV1,
  type ExperimentFoundationExecutableTrainingTaskSpecV2,
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
export const EXPERIMENT_FOUNDATION_REAL_PROVIDER_IDEMPOTENCY_TAG_KEY_V2 =
  'ef-provider-idempotency' as const;

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
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
  ): ExperimentFoundationMaterializedRealProviderPayloadV2 {
    assertExactPrerequisite(prerequisite);
    assertProfile(profile, prerequisite);

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
      displayName: deterministicDisplayName,
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
    const canonicalPayloadBytes = canonicalizeExperimentV2Json(request.toMap());
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
      'AliyunPaiDlcExecutionProfile',
      profile,
    );
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
    const redactedManifest: ExperimentFoundationAliyunRealProviderRedactedManifestV1 = {
      manifest_schema_version: 'v1',
      payload_schema: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
      adapter_identity: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
      provider_profile_version: profile.schema_version,
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
      },
      provider_binding_hashes: {
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
      },
      redacted_fields: [
        'canonical_payload_bytes',
        'WorkspaceId',
        'ResourceId',
        'JobSpecs[0].Image',
        'UserCommand',
        'Settings.Tags',
      ],
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
        provider_profile_version: profile.schema_version,
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
    profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
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
  profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
  prerequisite: ExperimentFoundationRealProviderPayloadPrerequisiteV2,
): void {
  if (
    profile.schema_version !== 'AliyunPaiDlcExecutionProfile@v2'
    || profile.job_type !== 'PyTorchJob'
    || profile.job_spec_type !== 'Worker'
    || profile.pod_count !== 1
    || profile.image_uri
      !== prerequisite.execution_bundle_revision.revision_content.container_image.image_ref
  ) {
    throw invalid('Aliyun execution profile does not match the exact ExecutionBundle image.');
  }
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
