import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import {
  EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2,
  EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS,
  experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema,
  experimentFoundationAliyunPaiDlcCreateJobPayloadV2Schema,
  experimentFoundationAliyunPaiDlcExecutionProfileV1Schema,
  experimentFoundationAliyunPaiDlcExecutionProfileV2Schema,
  experimentFoundationAliyunPaiDlcRedactedManifestV1Schema,
  experimentFoundationAliyunPaiDlcRedactedManifestV2Schema,
  experimentFoundationCloudPreflightV2CheckOutcomeSchema,
} from './experiment-foundation-cloud-preflight-v2-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;
const hash = (character: string) => `sha256:${character.repeat(64)}`;

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

const profile = {
  schema_version: 'AliyunPaiDlcExecutionProfile@v1',
  region_id: 'cn-hangzhou',
  workspace_id: 'workspace-001',
  resource_id: 'quota-001',
  image_uri: 'registry-vpc.cn-hangzhou.aliyuncs.com/pai/example:v1',
  job_type: 'PyTorchJob',
  job_spec_type: 'Worker',
  pod_count: 1,
};

const payload = {
  WorkspaceId: profile.workspace_id,
  ResourceId: profile.resource_id,
  DisplayName: 'ef-v2-1-abcd',
  JobType: 'PyTorchJob',
  JobSpecs: [{
    Type: 'Worker',
    Image: profile.image_uri,
    PodCount: 1,
    ResourceConfig: { CPU: '2', Memory: '2048Mi' },
  }],
  UserCommand: 'python /workspace/run.py',
  Accessibility: 'PRIVATE',
};

const manifest = {
  schema_version: 'AliyunPaiDlcRedactedManifest@v1',
  payload_schema: 'AliyunPaiDlcCreateJobRequest@2020-12-03',
  source_binding: {
    run_id: 'run-001',
    run_manifest_hash: hash('1'),
    run_cell_id: 'run-cell-001',
    cell_key: 'cell-a',
    training_task_spec_id: 'task-spec-001',
    training_task_spec_hash: hash('2'),
  },
  provider_binding_hashes: {
    execution_profile_hash: hash('3'),
    region_id_hash: hash('4'),
    workspace_id_hash: hash('5'),
    resource_id_hash: hash('6'),
    image_uri_hash: hash('7'),
  },
  request_summary: {
    display_name: payload.DisplayName,
    job_type: 'PyTorchJob',
    job_spec_type: 'Worker',
    pod_count: 1,
    cpu_cores: 2,
    memory_mb: 2048,
    argument_count: 1,
  },
  redacted_fields: [
    'canonical_payload_bytes',
    'WorkspaceId',
    'ResourceId',
    'JobSpecs[0].Image',
    'UserCommand',
  ],
};

test('cloud-preflight profile, payload, manifest, and check contracts accept the exact v1 shapes', async () => {
  assert.equal(await validates(experimentFoundationAliyunPaiDlcExecutionProfileV1Schema, profile), true);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema, payload), true);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcRedactedManifestV1Schema, manifest), true);
  assert.equal(await validates(experimentFoundationCloudPreflightV2CheckOutcomeSchema, {
    id: 'CP04_WRITE_HARD_DENY',
    status: 'passed',
    summary: 'CreateJob was rejected before transport.',
  }), true);
  assert.equal(EXPERIMENT_FOUNDATION_CLOUD_PREFLIGHT_V2_CHECK_IDS.length, 12);
  assert.deepEqual(EXPERIMENT_FOUNDATION_ALIYUN_READ_ONLY_OPERATIONS_V2, [
    'AIWorkspace.GetWorkspace',
    'AIWorkspace.ListResources',
    'PaiDlc.ListEcsSpecs',
  ]);
});

test('cloud-preflight contracts reject caller expansion and provider-write upgrades', async () => {
  assert.equal(await validates(experimentFoundationAliyunPaiDlcExecutionProfileV1Schema, {
    ...profile,
    caller_authored_payload_hash: hash('8'),
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema, {
    ...payload,
    DryRun: true,
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcCreateJobPayloadV1Schema, {
    ...payload,
    JobType: 'ShellJob',
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcRedactedManifestV1Schema, {
    ...manifest,
    WorkspaceId: 'must-not-persist',
  }), false);
  assert.equal(await validates(experimentFoundationCloudPreflightV2CheckOutcomeSchema, {
    id: 'CP13_CREATE_JOB',
    status: 'passed',
    summary: 'Forbidden.',
  }), false);
});

test('cloud-preflight v2 contracts bind exact-quota and public-resource selectors without a fake resource ID', async () => {
  const exactQuotaProfile = {
    ...profile,
    schema_version: 'AliyunPaiDlcExecutionProfile@v2',
    resource_binding: { mode: 'exact_quota', resource_id: profile.resource_id },
  };
  delete (exactQuotaProfile as Partial<typeof profile>).resource_id;
  const publicResourceProfile = {
    ...exactQuotaProfile,
    resource_binding: { mode: 'public_resource' },
  };
  const publicPayload = { ...payload };
  delete (publicPayload as Partial<typeof payload>).ResourceId;
  const exactManifest = {
    ...manifest,
    schema_version: 'AliyunPaiDlcRedactedManifest@v2',
    provider_binding_hashes: {
      ...manifest.provider_binding_hashes,
      resource_mode: 'exact_quota',
    },
  };
  const publicManifest = {
    ...exactManifest,
    provider_binding_hashes: {
      ...exactManifest.provider_binding_hashes,
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

  assert.equal(await validates(
    experimentFoundationAliyunPaiDlcExecutionProfileV2Schema,
    exactQuotaProfile,
  ), true);
  assert.equal(await validates(
    experimentFoundationAliyunPaiDlcExecutionProfileV2Schema,
    publicResourceProfile,
  ), true);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcCreateJobPayloadV2Schema, payload), true);
  assert.equal(await validates(
    experimentFoundationAliyunPaiDlcCreateJobPayloadV2Schema,
    publicPayload,
  ), true);
  assert.equal(await validates(
    experimentFoundationAliyunPaiDlcRedactedManifestV2Schema,
    exactManifest,
  ), true);
  assert.equal(await validates(
    experimentFoundationAliyunPaiDlcRedactedManifestV2Schema,
    publicManifest,
  ), true);

  assert.equal(await validates(experimentFoundationAliyunPaiDlcExecutionProfileV2Schema, {
    ...publicResourceProfile,
    resource_binding: { mode: 'public_resource', resource_id: 'fake-quota' },
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcExecutionProfileV2Schema, {
    ...exactQuotaProfile,
    resource_binding: { mode: 'exact_quota' },
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcRedactedManifestV2Schema, {
    ...publicManifest,
    redacted_fields: exactManifest.redacted_fields,
  }), false);
  assert.equal(await validates(experimentFoundationAliyunPaiDlcRedactedManifestV2Schema, {
    ...publicManifest,
    provider_binding_hashes: {
      ...publicManifest.provider_binding_hashes,
      resource_id_hash: hash('9'),
    },
  }), false);
});
