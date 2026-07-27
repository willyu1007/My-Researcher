import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';
import {
  createRealProviderV2TestFixture,
  realProviderTestHash,
} from './experiment-foundation-real-provider-v2-test-fixture.js';

function firstCellFixture() {
  const fixture = createRealProviderV2TestFixture();
  const cell = fixture.prerequisite.cells[0]!;
  return {
    ...fixture,
    payloadPrerequisite: {
      run: fixture.prerequisite.run,
      run_cell: cell.run_cell,
      task_spec: cell.task_spec,
      execution_bundle_revision: fixture.bundle,
      provider_idempotency_key: 'attempt-1:submit:1',
    },
  };
}

test('real-provider payload binds exact OSS mounts, environment and runtime role', () => {
  const { payloadPrerequisite, bundle, profile } = firstCellFixture();
  const materialized = new ExperimentFoundationRealProviderPayloadV2Service().materialize(
    payloadPrerequisite,
    profile,
  );
  const request = materialized.create_job_request.toMap();

  assert.deepEqual(request.DataSources, [
    {
      Uri: bundle.revision_content.code_artifact.artifact_ref,
      MountAccess: 'RO',
      MountPath: '/mnt/pea-code',
    },
    {
      Uri: bundle.revision_content.dataset_mirrors[0]!.object_ref,
      MountAccess: 'RO',
      MountPath: '/mnt/pea-input/1',
    },
    {
      Uri: 'oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/output/run-real-1/cell-a/',
      MountAccess: 'RW',
      MountPath: '/mnt/pea-output',
    },
  ]);
  assert.deepEqual(request.CredentialConfig, {
    AliyunEnvRoleKey: '0',
    CredentialConfigItems: [{
      Key: '0',
      Roles: [{
        AssumeRoleFor: '1183869713036194',
        RoleArn: profile.workload_binding.runtime_role_arn,
        RoleType: 'service',
      }],
      Type: 'Role',
    }],
    EnableCredentialInject: true,
  });
  assert.equal(request.Envs.EXPERIMENT_FOUNDATION_CODE_DIR, '/mnt/pea-code');
  assert.equal(request.Envs.EXPERIMENT_FOUNDATION_INPUT_1_DIR, '/mnt/pea-input/1');
  assert.equal(request.Envs.EXPERIMENT_FOUNDATION_OUTPUT_DIR, '/mnt/pea-output');
  assert.equal(request.JobSpecs[0].EcsSpec, profile.resource_binding.mode === 'public_resource'
    ? profile.resource_binding.ecs_spec
    : undefined);
  assert.equal('ResourceConfig' in request.JobSpecs[0], false);
  assert.match(request.Settings.Tags['ef-request-binding'], /^[a-f0-9]{64}$/u);
  assert.deepEqual(
    JSON.parse(request.Envs.EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON),
    {
      cell_key: 'cell-a',
      execution_bundle_revision_hash: bundle.content_hash,
      execution_bundle_revision_id: bundle.execution_bundle_revision_id,
      parser_profile_hash:
        payloadPrerequisite.task_spec.io_snapshot.parser_profile_hash,
      parser_profile_version:
        payloadPrerequisite.task_spec.io_snapshot.parser_profile_version,
      result_envelope_schema:
        payloadPrerequisite.task_spec.io_snapshot.result_envelope_schema,
      run_cell_id: 'run-cell-1',
      run_id: 'run-real-1',
      run_manifest_hash: payloadPrerequisite.run.run_manifest_hash,
      training_task_spec_hash: payloadPrerequisite.task_spec.task_spec_hash,
      training_task_spec_id: payloadPrerequisite.task_spec.training_task_spec_id,
    },
  );
  assert.equal(
    materialized.canonical_payload_bytes,
    canonicalizeExperimentV2Json(request),
  );
  assert.deepEqual(
    materialized.record.redacted_manifest.artifact_bindings.code_artifact,
    {
      artifact_ref_hash:
        materialized.record.redacted_manifest.artifact_bindings.code_artifact.artifact_ref_hash,
      content_digest: bundle.revision_content.code_artifact.content_digest,
      byte_size: bundle.revision_content.code_artifact.byte_size,
      mount_path_hash:
        materialized.record.redacted_manifest.artifact_bindings.code_artifact.mount_path_hash,
    },
  );
  assert.equal('image_digest' in bundle.revision_content.container_image, true);
  assert.equal(
    'image_digest' in materialized.record.redacted_manifest.provider_binding_hashes,
    true,
  );
  if (
    !('image_digest' in bundle.revision_content.container_image)
    || !('image_digest' in materialized.record.redacted_manifest.provider_binding_hashes)
  ) {
    assert.fail('OCI image identity did not retain its content digest.');
  }
  assert.equal(
    materialized.record.redacted_manifest.provider_binding_hashes.image_digest,
    bundle.revision_content.container_image.image_digest,
  );
  const persistedJson = JSON.stringify(materialized.record);
  assert.equal(persistedJson.includes('pea-m7-canary-test'), false);
  assert.equal(persistedJson.includes(profile.workload_binding.runtime_role_arn), false);
  assert.equal(persistedJson.includes(bundle.revision_content.container_image.image_ref), false);
});

test('real-provider payload keeps PAI asset identity distinct from an OCI digest', () => {
  const { payloadPrerequisite, bundle, profile } = firstCellFixture();
  bundle.schema_version = 'v2';
  bundle.revision_content = {
    ...bundle.revision_content,
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
  const materialized = new ExperimentFoundationRealProviderPayloadV2Service().materialize(
    {
      ...payloadPrerequisite,
      execution_bundle_revision: bundle,
    },
    {
      ...profile,
      image_uri: bundle.revision_content.container_image.image_ref,
    },
  );
  const binding = materialized.record.redacted_manifest.provider_binding_hashes;

  assert.equal('image_digest' in binding, false);
  assert.equal('image_identity_kind' in binding, true);
  if (!('image_identity_kind' in binding)) {
    assert.fail('Provider-managed image identity was not materialized.');
  }
  assert.equal(binding.image_identity_kind, 'provider_managed_asset');
  assert.equal(binding.provider_managed_asset_scope, 'm7_l1_diagnostic_only');
  assert.match(binding.provider_managed_asset_identity_hash, /^sha256:[a-f0-9]{64}$/);
  const persistedJson = JSON.stringify(materialized.record);
  assert.equal(persistedJson.includes('image-liuxvj7p2qcnflha84'), false);
  assert.equal(persistedJson.includes(bundle.revision_content.container_image.image_ref), false);
});

test('real-provider payload rejects unbound or non-content-addressed workload inputs', () => {
  const service = new ExperimentFoundationRealProviderPayloadV2Service();
  const { payloadPrerequisite, profile } = firstCellFixture();

  assert.throws(
    () => service.materialize({
      ...payloadPrerequisite,
      task_spec: {
        ...payloadPrerequisite.task_spec,
        command_snapshot: { command: 'python3', arguments: ['entrypoint.py'] },
      },
    }, profile),
    hasReason('REAL_PROVIDER_PAYLOAD_INVALID'),
  );
  assert.throws(
    () => service.materialize({
      ...payloadPrerequisite,
      execution_bundle_revision: {
        ...payloadPrerequisite.execution_bundle_revision,
        revision_content: {
          ...payloadPrerequisite.execution_bundle_revision.revision_content,
          code_artifact: {
            ...payloadPrerequisite.execution_bundle_revision.revision_content.code_artifact,
            content_digest: realProviderTestHash('f'),
          },
        },
      },
    }, profile),
    hasReason('REAL_PROVIDER_PAYLOAD_INVALID'),
  );
  assert.throws(
    () => service.materialize(payloadPrerequisite, {
      ...profile,
      workload_binding: {
        ...profile.workload_binding,
        output_mount_path: '/mnt/pea-input/output',
      },
    }),
    hasReason('REAL_PROVIDER_PAYLOAD_INVALID'),
  );
  assert.throws(
    () => service.materialize({
      ...payloadPrerequisite,
      task_spec: {
        ...payloadPrerequisite.task_spec,
        io_snapshot: {
          ...payloadPrerequisite.task_spec.io_snapshot,
          input_mirror_ordinals: [2],
        },
      },
    }, profile),
    hasReason('REAL_PROVIDER_PAYLOAD_INVALID'),
  );
});

test('rematerialization binds runtime role and artifact byte-size evidence', () => {
  const service = new ExperimentFoundationRealProviderPayloadV2Service();
  const { payloadPrerequisite, profile } = firstCellFixture();
  const materialized = service.materialize(payloadPrerequisite, profile);
  const persisted = {
    id: 'payload-1',
    ...materialized.record,
    created_at: '2026-07-26T00:00:00.000Z',
  };

  assert.throws(
    () => service.rematerializeAndVerify(payloadPrerequisite, {
      ...profile,
      workload_binding: {
        ...profile.workload_binding,
        runtime_role_arn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime-v2',
      },
    }, persisted),
    hasReason('REAL_PROVIDER_PAYLOAD_CONFLICT'),
  );
  assert.throws(
    () => service.rematerializeAndVerify({
      ...payloadPrerequisite,
      execution_bundle_revision: {
        ...payloadPrerequisite.execution_bundle_revision,
        revision_content: {
          ...payloadPrerequisite.execution_bundle_revision.revision_content,
          code_artifact: {
            ...payloadPrerequisite.execution_bundle_revision.revision_content.code_artifact,
            byte_size:
              payloadPrerequisite.execution_bundle_revision.revision_content.code_artifact
                .byte_size + 1,
          },
        },
      },
    }, profile, persisted),
    hasReason('REAL_PROVIDER_PAYLOAD_CONFLICT'),
  );
});

function hasReason(reasonCode: string): (error: unknown) => boolean {
  return (error) => (
    error instanceof Error
    && 'reasonCode' in error
    && error.reasonCode === reasonCode
  );
}
