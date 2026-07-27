import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
  experimentFoundationAliyunNormalizedProviderOutcomeV1Schema,
  experimentFoundationExecutionBundleDraftV2Schema,
  experimentFoundationExecutionBundleIdentityV2Schema,
  experimentFoundationExecutionBundleLifecycleEventV2Schema,
  experimentFoundationExecutionBundleLifecycleProjectionV2Schema,
  experimentFoundationExecutionBundleReadinessV2Schema,
  experimentFoundationExecutionBundleRevisionV2Schema,
  experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
  experimentFoundationAliyunRealProviderProfileV2Schema,
  experimentFoundationAliyunWorkloadBindingV2Schema,
  experimentFoundationRealProviderPayloadV2Schema,
  paperImplementationExecutableWorkOrderRevisionSnapshotV2Schema,
} from './experiment-foundation-real-provider-v2-contracts.js';
import { serverHashExperimentV2SemanticContent } from './experiment-v2-canonical-hash.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
type JsonSchema = Readonly<Record<string, unknown>>;

async function validates(schema: JsonSchema, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload: payload as object,
  });
  await app.close();
  return response.statusCode === 200;
}

function bundleContent() {
  return {
    execution_bundle_schema_version: 'v1',
    code_artifact: {
      artifact_ref: 'artifact://ragperf/code/v1',
      content_digest: hash('1'),
      byte_size: 1024,
    },
    container_image: {
      image_ref: 'registry.example/ragperf@sha256:abc',
      image_digest: hash('2'),
    },
    dataset_mirrors: [{
      ordinal: 1,
      dataset_revision: {
        asset_type: 'Dataset',
        logical_id: 'dataset-1',
        revision_id: 'dataset-revision-1',
        revision_sequence: 1,
        content_hash: hash('3'),
      },
      object_ref: 'object://dataset/revision-1',
      content_digest: hash('4'),
      byte_size: 2048,
    }],
    entrypoint: 'python',
    arguments: ['-m', 'ragperf.run'],
    dependency_lock_digest: hash('5'),
    output_contract: {
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      result_object_name: 'result.json',
      parser_profile_version: 'v1',
      parser_profile_hash: hash('6'),
    },
  };
}

function providerManagedBundleContent() {
  return {
    ...bundleContent(),
    execution_bundle_schema_version: 'v2',
    container_image: {
      image_identity_kind: 'provider_managed_asset',
      image_ref:
        'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04',
      provider_managed_asset: {
        provider: 'aliyun_pai',
        asset_id: 'image-liuxvj7p2qcnflha84',
        region_id: 'cn-shanghai',
        modified_at: '2026-07-02T04:35:35.000Z',
        size_bytes: 3_803_970_629,
        accessibility: 'PUBLIC',
        source_type: 'Import',
        permitted_scope: 'm7_l1_diagnostic_only',
      },
    },
  };
}

test('ExecutionBundle draft excludes caller hashes and revision accepts only server profile', async () => {
  assert.equal(await validates(experimentFoundationExecutionBundleIdentityV2Schema, {
    execution_bundle_id: 'bundle-1',
    bundle_key: 'ragperf-bundle',
    display_name: 'RAGPerf execution bundle',
    state_version: 0,
    created_at: '2026-07-23T00:00:00.000Z',
    updated_at: '2026-07-23T00:00:00.000Z',
  }), true);
  const draft = {
    execution_bundle_id: 'bundle-1',
    draft_version: 1,
    draft_content: bundleContent(),
    updated_at: '2026-07-23T00:00:00.000Z',
  };
  assert.equal(await validates(experimentFoundationExecutionBundleDraftV2Schema, draft), true);
  assert.equal(await validates(
    experimentFoundationExecutionBundleDraftV2Schema,
    { ...draft, content_hash: hash('7') },
  ), false);

  const revision = {
    execution_bundle_revision_id: 'bundle-revision-1',
    execution_bundle_id: 'bundle-1',
    revision_sequence: 1,
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    content_hash: hash('8'),
    revision_content: bundleContent(),
    created_at: '2026-07-23T00:00:00.000Z',
  };
  assert.equal(await validates(experimentFoundationExecutionBundleRevisionV2Schema, revision), true);
  assert.equal(await validates(
    experimentFoundationExecutionBundleRevisionV2Schema,
    { ...revision, hash_profile: 'caller-profile' },
  ), false);

  const lifecycleEvent = {
    lifecycle_event_id: 'event-1',
    execution_bundle_revision_id: 'bundle-revision-1',
    event_sequence: 1,
    status: 'active',
    reason_code: 'execution_bundle_frozen',
    event_hash: hash('9'),
    occurred_at: '2026-07-23T00:00:00.000Z',
  };
  assert.equal(await validates(
    experimentFoundationExecutionBundleLifecycleEventV2Schema,
    lifecycleEvent,
  ), true);
  assert.equal(await validates(
    experimentFoundationExecutionBundleLifecycleProjectionV2Schema,
    {
      execution_bundle_revision_id: 'bundle-revision-1',
      current_status: 'active',
      latest_event_sequence: 1,
      latest_event_hash: lifecycleEvent.event_hash,
      state_version: 0,
      updated_at: '2026-07-23T00:00:00.000Z',
    },
  ), true);
  assert.equal(await validates(
    experimentFoundationExecutionBundleReadinessV2Schema,
    {
      execution_bundle_readiness_id: 'readiness-1',
      execution_bundle_revision_id: 'bundle-revision-1',
      execution_bundle_revision_hash: revision.content_hash,
      lifecycle_event_hash: lifecycleEvent.event_hash,
      outcome: 'passed',
      reason_codes: [],
      readiness_hash: hash('0'),
      evaluated_at: '2026-07-23T00:00:00.000Z',
    },
  ), true);
});

test('ExecutionBundle accepts a diagnostic-only provider asset without relabeling it as a digest', async () => {
  const draft = {
    execution_bundle_id: 'bundle-provider-image-1',
    draft_version: 1,
    draft_content: providerManagedBundleContent(),
    updated_at: '2026-07-27T00:00:00.000Z',
  };
  assert.equal(
    await validates(experimentFoundationExecutionBundleDraftV2Schema, draft),
    true,
  );
  assert.equal(
    await validates(experimentFoundationExecutionBundleDraftV2Schema, {
      ...draft,
      draft_content: {
        ...draft.draft_content,
        container_image: {
          ...draft.draft_content.container_image,
          image_digest: hash('2'),
        },
      },
    }),
    false,
  );
  assert.equal(
    await validates(experimentFoundationExecutionBundleDraftV2Schema, {
      ...draft,
      draft_content: {
        ...draft.draft_content,
        container_image: {
          ...draft.draft_content.container_image,
          provider_managed_asset: {
            ...draft.draft_content.container_image.provider_managed_asset,
            permitted_scope: 'scientific_evidence',
          },
        },
      },
    }),
    false,
  );
});

test('executable WorkOrder v2 requires one exact ExecutionBundle revision', async () => {
  const snapshot = {
    work_order_schema_version: 'v2',
    title: 'RAGPerf diagnostic execution',
    objective: 'Exercise the exact real-provider path.',
    readiness_attestation_id: 'readiness-1',
    readiness_attestation_hash: hash('a'),
    asset_dependencies: [{
      asset_type: 'Dataset',
      logical_id: 'dataset-1',
      revision_id: 'dataset-revision-1',
      revision_sequence: 1,
      content_hash: hash('b'),
    }],
    execution_bundle: {
      execution_bundle_id: 'bundle-1',
      execution_bundle_revision_id: 'bundle-revision-1',
      revision_sequence: 1,
      content_hash: hash('c'),
    },
    run_policy: { max_attempts_per_cell: 1, timeout_seconds: 600 },
  };
  assert.equal(await validates(paperImplementationExecutableWorkOrderRevisionSnapshotV2Schema, snapshot), true);
  assert.equal(await validates(paperImplementationExecutableWorkOrderRevisionSnapshotV2Schema, {
    ...snapshot,
    execution_bundle: { ...snapshot.execution_bundle, content_hash: 'caller-hash' },
  }), false);
});

test('real-provider workload and CreateJob schemas close OSS mounts and credential injection', async () => {
  const workloadBinding = {
    schema_version: 'AliyunPaiDlcWorkloadBinding@v1',
    runtime_role_arn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
    code_mount_path: '/mnt/pea-code',
    input_mount_root: '/mnt/pea-input',
    output_mount_path: '/mnt/pea-output',
    output_uri_prefix:
      'oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/output/',
  };
  assert.equal(
    await validates(experimentFoundationAliyunWorkloadBindingV2Schema, workloadBinding),
    true,
  );
  assert.equal(await validates(experimentFoundationAliyunWorkloadBindingV2Schema, {
    ...workloadBinding,
    runtime_role_arn: 'acs:ram::*:role/admin',
  }), false);
  const realProviderProfile = {
    schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
    region_id: 'cn-shanghai',
    workspace_id: 'workspace-1',
    resource_binding: { mode: 'public_resource' },
    image_uri: 'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/image:py311-cpu',
    job_type: 'PyTorchJob',
    job_spec_type: 'Worker',
    pod_count: 1,
    workload_binding: workloadBinding,
  };
  assert.equal(
    await validates(experimentFoundationAliyunRealProviderProfileV2Schema, realProviderProfile),
    true,
  );
  assert.equal(await validates(experimentFoundationAliyunRealProviderProfileV2Schema, {
    ...realProviderProfile,
    unreviewed_mount: '/mnt/other',
  }), false);

  const request = {
    WorkspaceId: 'workspace-1',
    DisplayName: 'ef-v2-real-1-abc',
    JobType: 'PyTorchJob',
    JobSpecs: [{
      Type: 'Worker',
      Image: 'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/image:py311-cpu',
      PodCount: 1,
      ResourceConfig: { CPU: '1', Memory: '1024Mi' },
    }],
    UserCommand: 'python3 /mnt/pea-code/entrypoint.py --cell-key=cell-a',
    JobMaxRunningTimeMinutes: 10,
    Settings: { Tags: { 'ef-provider-idempotency': 'a'.repeat(64) } },
    DataSources: [
      {
        Uri: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/workload/${'1'.repeat(64)}/`,
        MountPath: '/mnt/pea-code',
        MountAccess: 'RO',
      },
      {
        Uri: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/${'2'.repeat(64)}/`,
        MountPath: '/mnt/pea-input/1',
        MountAccess: 'RO',
      },
      {
        Uri: 'oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/output/run-1/cell-a/',
        MountPath: '/mnt/pea-output',
        MountAccess: 'RW',
      },
    ],
    Envs: {
      EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON: '{"run_id":"run-1"}',
      EXPERIMENT_FOUNDATION_CODE_DIR: '/mnt/pea-code',
      EXPERIMENT_FOUNDATION_INPUT_1_DIR: '/mnt/pea-input/1',
      EXPERIMENT_FOUNDATION_OUTPUT_DIR: '/mnt/pea-output',
    },
    CredentialConfig: {
      EnableCredentialInject: true,
      AliyunEnvRoleKey: '0',
      CredentialConfigItems: [{
        Key: '0',
        Type: 'Role',
        Roles: [{
          AssumeRoleFor: '1183869713036194',
          RoleType: 'service',
          RoleArn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
        }],
      }],
    },
    Accessibility: 'PRIVATE',
  };
  assert.equal(
    await validates(experimentFoundationAliyunRealProviderCreateJobRequestV1Schema, request),
    true,
  );
  assert.equal(await validates(
    experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
    {
      ...request,
      CredentialConfig: {
        ...request.CredentialConfig,
        CredentialConfigItems: [{
          ...request.CredentialConfig.CredentialConfigItems[0],
          Type: 'RoleChain',
        }],
      },
    },
  ), false);
  assert.equal(await validates(
    experimentFoundationAliyunRealProviderCreateJobRequestV1Schema,
    { ...request, Envs: { ...request.Envs, ALIBABA_CLOUD_ACCESS_KEY_SECRET: 'forbidden' } },
  ), false);
});

test('real provider payload rejects every simulation/real tuple mix', async () => {
  const payload = {
    provider_payload_id: 'payload-1',
    materialization_key: 'materialization-1',
    run_id: 'run-1',
    run_manifest_hash: hash('d'),
    run_cell_id: 'cell-1',
    cell_key: 'cell-a',
    training_task_spec_id: 'task-1',
    training_task_spec_hash: hash('e'),
    payload_schema: 'AliyunPaiDlcCreateJobPayload@v1',
    adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
    execution_mode: 'real_provider',
    provenance: 'real_provider',
    provider_profile_version: 'profile-v1',
    redacted_manifest: {
      manifest_schema_version: 'v1',
      payload_schema: 'AliyunPaiDlcCreateJobPayload@v1',
      adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
      provider_profile_version: 'profile-v1',
      source_binding: {
        execution_bundle_revision_id: 'bundle-revision-1',
        execution_bundle_revision_hash: hash('f'),
        run_id: 'run-1',
        run_manifest_hash: hash('d'),
        run_cell_id: 'cell-1',
        cell_key: 'cell-a',
        training_task_spec_id: 'task-1',
        training_task_spec_hash: hash('e'),
      },
      request_summary: {
        deterministic_display_name: 'ef-v2-real-abc',
        deterministic_tag_hash: hash('0'),
        job_type: 'PyTorchJob',
        pod_count: 1,
        cpu_cores: 1,
        memory_mb: 512,
        maximum_running_time_minutes: 10,
        data_source_count: 3,
        environment_variable_count: 4,
      },
      provider_binding_hashes: {
        execution_profile_hash: hash('1'),
        region_id_hash: hash('2'),
        workspace_id_hash: hash('3'),
        resource_mode: 'public_resource',
        resource_id_hash: null,
        image_ref_hash: hash('4'),
        image_digest: hash('5'),
        runtime_role_arn_hash: hash('6'),
      },
      artifact_bindings: {
        code_artifact: {
          artifact_ref_hash: hash('7'),
          content_digest: hash('8'),
          byte_size: 1024,
          mount_path_hash: hash('9'),
        },
        dataset_mirrors: [{
          ordinal: 1,
          dataset_revision_hash: hash('a'),
          object_ref_hash: hash('b'),
          content_digest: hash('c'),
          byte_size: 2048,
          mount_path_hash: hash('d'),
        }],
        output: {
          output_uri_hash: hash('e'),
          mount_path_hash: hash('f'),
          result_object_name_hash: hash('0'),
        },
        environment_hash: hash('1'),
      },
      redacted_fields: [
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
      ],
    },
    payload_hash: hash('2'),
    payload_byte_size: 1024,
    created_at: '2026-07-23T00:00:00.000Z',
  };
  assert.equal(await validates(experimentFoundationRealProviderPayloadV2Schema, payload), true);
  const providerManagedPayload = {
    ...payload,
    redacted_manifest: {
      ...payload.redacted_manifest,
      manifest_schema_version: 'v2',
      provider_binding_hashes: {
        execution_profile_hash: hash('1'),
        region_id_hash: hash('2'),
        workspace_id_hash: hash('3'),
        resource_mode: 'public_resource',
        resource_id_hash: null,
        image_ref_hash: hash('4'),
        image_identity_kind: 'provider_managed_asset',
        provider_managed_asset_identity_hash: hash('5'),
        provider_managed_asset_scope: 'm7_l1_diagnostic_only',
        runtime_role_arn_hash: hash('6'),
      },
    },
  };
  assert.equal(
    await validates(experimentFoundationRealProviderPayloadV2Schema, providerManagedPayload),
    true,
  );
  assert.equal(
    await validates(experimentFoundationRealProviderPayloadV2Schema, {
      ...providerManagedPayload,
      redacted_manifest: {
        ...providerManagedPayload.redacted_manifest,
        provider_binding_hashes: {
          ...providerManagedPayload.redacted_manifest.provider_binding_hashes,
          image_digest: hash('7'),
        },
      },
    }),
    false,
  );
  assert.equal(await validates(
    experimentFoundationRealProviderPayloadV2Schema,
    { ...payload, execution_mode: 'simulation' },
  ), false);
  assert.equal(await validates(
    experimentFoundationRealProviderPayloadV2Schema,
    { ...payload, provenance: 'non_production_fake_provider' },
  ), false);
  assert.equal(await validates(experimentFoundationRealProviderPayloadV2Schema, {
    ...payload,
    adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
  }), false);
});

test('normalized Aliyun outcomes use a closed status vocabulary and canonical hashes detect drift', async () => {
  const outcome = {
    outcome_schema_version: 'AliyunPaiDlcNormalizedOutcome@v1',
    adapter_identity: 'aliyun_pai_dlc_official_sdk@v1',
    operation: 'sync',
    provider_idempotency_key: 'provider-key-1',
    payload_hash: hash('6'),
    external_job_ref: {
      ref_type: 'aliyun_pai_dlc_job',
      job_id: 'job-1',
      region_id_hash: hash('7'),
    },
    provider_status: 'Running',
    normalized_state: 'running',
    result_manifest_hash: null,
    response_hash: hash('8'),
  };
  assert.equal(await validates(experimentFoundationAliyunNormalizedProviderOutcomeV1Schema, outcome), true);
  assert.equal(await validates(
    experimentFoundationAliyunNormalizedProviderOutcomeV1Schema,
    { ...outcome, provider_status: 'Paused' },
  ), false);

  const first = serverHashExperimentV2SemanticContent({
    record_kind: 'ExecutionBundleRevision',
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    content: bundleContent(),
  });
  const changed = serverHashExperimentV2SemanticContent({
    record_kind: 'ExecutionBundleRevision',
    schema_version: 'v1',
    hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    content: { ...bundleContent(), entrypoint: 'node' },
  });
  assert.notEqual(first, changed);
});
