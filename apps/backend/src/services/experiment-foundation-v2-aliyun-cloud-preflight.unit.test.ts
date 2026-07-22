import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  GetWorkspaceResponse,
  ListResourcesResponse,
  type ListResourcesRequest,
} from '@alicloud/aiworkspace20210204';
import {
  ListEcsSpecsResponse,
  type ListEcsSpecsRequest,
} from '@alicloud/pai-dlc20201203';
import type {
  ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import {
  EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES,
  ExperimentFoundationAliyunCreateJobPayloadError,
  ExperimentFoundationV2AliyunCreateJobPayloadService,
  type ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2,
} from './experiment-foundation-v2-aliyun-create-job-payload-service.js';
import {
  AliyunSdkExperimentFoundationReadOnlyTransportV2,
  EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_V1,
  EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_HASH_V1,
  ExperimentFoundationAliyunCloudPreflightError,
  ExperimentFoundationV2AliyunReadOnlyPreflightService,
  assertAliyunPreflightProviderOperationAllowed,
  hashAliyunPreflightCredentialAccessKeyId,
  hashAliyunPreflightProviderRef,
  parseAliyunPreflightIdentityPolicyEvidence,
  readAliyunPreflightReviewedPolicyEvidenceFile,
  type ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1,
  type ExperimentFoundationAliyunReadOnlySdkClientsV1,
  type ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1,
  type ExperimentFoundationAliyunResourceObservationV2,
  type ExperimentFoundationAliyunReadOnlyTransportV2,
} from './experiment-foundation-v2-aliyun-read-only-preflight-service.js';
import {
  ExperimentFoundationV2AliyunSamePayloadFakeLifecycle,
} from './experiment-foundation-v2-aliyun-same-payload-fake-lifecycle.js';

const timestamp = '2026-07-18T00:00:00.000Z';
const hash = (character: string) => `sha256:${character.repeat(64)}`;

const profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2 = {
  schema_version: 'AliyunPaiDlcExecutionProfile@v2',
  region_id: 'cn-hangzhou',
  workspace_id: 'ws-preflight-secret-ref',
  resource_binding: {
    mode: 'exact_quota',
    resource_id: 'quota-preflight-secret-ref',
  },
  image_uri: 'registry-vpc.cn-hangzhou.aliyuncs.com/pai/example:2026-07-18',
  job_type: 'PyTorchJob',
  job_spec_type: 'Worker',
  pod_count: 1,
};

const publicResourceProfile: ExperimentFoundationAliyunPaiDlcExecutionProfileV2 = {
  ...profile,
  resource_binding: { mode: 'public_resource' },
};

function prerequisite(
  args: string[] = ['retriever-top-k-5', '--token=must-be-redacted'],
): ExperimentFoundationAliyunCreateJobPayloadPrerequisiteV2 {
  const run: ExperimentFoundationRunV2 = {
    run_id: 'ef_run_v2_preflight_001',
    external_pi_work_order_revision_id: 'pi_revision_v2_preflight_001',
    external_pi_work_order_revision_hash: hash('1'),
    external_pi_branch_revision_sequence: 1,
    run_manifest_hash: hash('2'),
    cell_count: 1,
    frozen_at: timestamp,
  };
  const runCell: ExperimentFoundationRunCellV2 = {
    run_cell_id: 'ef_run_cell_v2_preflight_001',
    run_id: run.run_id,
    ordinal: 1,
    cell_key: 'retriever-top-k-5',
    external_pi_cell_id: 'pi_cell_v2_preflight_001',
    external_pi_cell_hash: hash('3'),
    training_task_spec_id: 'ef_task_spec_v2_preflight_001',
    training_task_spec_hash: hash('4'),
    seed: 7,
    repeat_index: 0,
  };
  const taskSpec: ExperimentFoundationTrainingTaskSpecV2 = {
    training_task_spec_id: runCell.training_task_spec_id,
    materialization_key: 'preflight-materialization-001',
    run_recipe_id: 'ef_run_recipe_v2_preflight_001',
    external_pi_work_order_revision_id: run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: run.external_pi_work_order_revision_hash,
    external_pi_cell_id: runCell.external_pi_cell_id,
    external_pi_cell_hash: runCell.external_pi_cell_hash,
    command_snapshot: {
      command: 'experiment-foundation-v2:materialize-cell',
      arguments: args,
    },
    io_snapshot: {
      input_keys: ['version_lock', 'admitted_cell'],
      output_keys: ['simulation_lifecycle_trace'],
    },
    resource_snapshot: { cpu_cores: 2, memory_mb: 2048 },
    retry_snapshot: { max_attempts: 2 },
    task_spec_hash: runCell.training_task_spec_hash,
    created_at: timestamp,
  };
  return { run, run_cell: runCell, task_spec: taskSpec };
}

function policyEvidence(
  accessKeyId = 'STS.preflight-access-key-id',
): ExperimentFoundationAliyunPreflightIdentityPolicyEvidenceV1 {
  return {
    schema_version: 'AliyunPaiDlcPreflightIdentityPolicyEvidence@v1',
    principal_ref_hash: hash('5'),
    credential_access_key_id_hash: hashAliyunPreflightCredentialAccessKeyId(accessKeyId),
    policy_document_hash: EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_HASH_V1,
    verified_allowed_actions: [
      'paiworkspace:GetWorkspace',
      'paiworkspace:ListResources',
      'paidlc:ListEcsSpecs',
    ],
    verified_denied_actions: ['paidlc:CreateJob'],
    reviewer_ref: 'security-review:T-132-cloud-preflight',
    reviewed_at: '2026-07-17T12:00:00.000Z',
    expires_at: '2026-07-18T12:00:00.000Z',
  };
}

class PassingReadOnlyTransport implements ExperimentFoundationAliyunReadOnlyTransportV2 {
  private readonly ledger: ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1[] = [];

  async getWorkspace() {
    this.record('AIWorkspace.GetWorkspace', 'aiworkspace.cn-hangzhou.aliyuncs.com', 'request-1');
    return {
      request_id: 'request-1',
      endpoint: 'aiworkspace.cn-hangzhou.aliyuncs.com',
      workspace_id_hash: hashAliyunPreflightProviderRef('workspace_id', profile.workspace_id),
      status: 'ENABLED',
    };
  }

  async listResources(): Promise<ExperimentFoundationAliyunResourceObservationV2> {
    this.record('AIWorkspace.ListResources', 'aiworkspace.cn-hangzhou.aliyuncs.com', 'request-2');
    return {
      request_id: 'request-2',
      endpoint: 'aiworkspace.cn-hangzhou.aliyuncs.com',
      resource_mode: 'exact_quota' as const,
      resource_id_hash: hashAliyunPreflightProviderRef(
        'resource_id',
        profile.resource_binding.mode === 'exact_quota'
          ? profile.resource_binding.resource_id
          : 'unreachable',
      ),
      exact_quota_found: true,
      quota_type: 'DLC',
      quota_spec_count: 1,
      quota_spec_manifest_hash: hash('6'),
    };
  }

  async listEcsSpecs() {
    this.record('PaiDlc.ListEcsSpecs', 'pai-dlc.cn-hangzhou.aliyuncs.com', 'request-3');
    return {
      request_id: 'request-3',
      endpoint: 'pai-dlc.cn-hangzhou.aliyuncs.com',
      total_count: 2,
      visible_cpu_spec_count: 2,
      available_cpu_spec_count: 1,
    };
  }

  getOperationLedger() {
    return structuredClone(this.ledger);
  }

  protected record(
    operation: ExperimentFoundationAliyunReadOnlyOperationLedgerEntryV1['operation'],
    endpoint: string,
    requestId: string,
  ) {
    this.ledger.push({
      sequence: this.ledger.length + 1,
      operation,
      endpoint,
      request_id: requestId,
      outcome: 'succeeded',
      redacted_refs: {},
    });
  }
}

class DisabledWorkspaceTransport extends PassingReadOnlyTransport {
  override async getWorkspace() {
    return {
      ...(await super.getWorkspace()),
      status: 'DISABLED',
    };
  }
}

class PassingPublicResourceTransport extends PassingReadOnlyTransport {
  override async listResources(): Promise<ExperimentFoundationAliyunResourceObservationV2> {
    this.record(
      'AIWorkspace.ListResources',
      'aiworkspace.cn-hangzhou.aliyuncs.com',
      'request-2',
    );
    return {
      request_id: 'request-2',
      endpoint: 'aiworkspace.cn-hangzhou.aliyuncs.com',
      resource_mode: 'public_resource' as const,
      resource_id_hash: null,
      exact_quota_found: false,
      quota_type: null,
      quota_spec_count: 0,
      quota_spec_manifest_hash: null,
    };
  }
}

class DuplicatePublicResourceReadTransport extends PassingPublicResourceTransport {
  override async listResources(): Promise<ExperimentFoundationAliyunResourceObservationV2> {
    await super.listResources();
    return super.listResources();
  }
}

test('exact Aliyun CreateJob payload is canonical, bounded, and persistently redacted', () => {
  const service = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  const result = service.materialize(prerequisite(), profile);
  const payload = service.verify(result);

  assert.equal(payload.WorkspaceId, profile.workspace_id);
  assert.equal(
    payload.ResourceId,
    profile.resource_binding.mode === 'exact_quota'
      ? profile.resource_binding.resource_id
      : undefined,
  );
  assert.equal(payload.JobSpecs[0].ResourceConfig.CPU, '2');
  assert.equal(payload.JobSpecs[0].ResourceConfig.Memory, '2048Mi');
  assert.match(payload.UserCommand, /must-be-redacted/);
  assert.ok(result.payload_byte_size < EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /must-be-redacted/);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /ws-preflight-secret-ref/);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /quota-preflight-secret-ref/);
});

test('public-resource CreateJob payload omits ResourceId in canonical bytes, SDK wire map, and evidence', () => {
  const service = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  const result = service.materialize(prerequisite(), publicResourceProfile);
  const payload = service.verify(result);
  const parsedBytes = JSON.parse(result.canonical_payload_bytes) as Record<string, unknown>;

  assert.equal(Object.hasOwn(payload, 'ResourceId'), false);
  assert.equal(Object.hasOwn(parsedBytes, 'ResourceId'), false);
  assert.equal(result.redacted_manifest.provider_binding_hashes.resource_mode, 'public_resource');
  assert.equal(result.redacted_manifest.provider_binding_hashes.resource_id_hash, null);
  assert.equal(
    (result.redacted_manifest.redacted_fields as readonly string[]).includes('ResourceId'),
    false,
  );
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /quota-preflight-secret-ref/);

  const exactQuotaResult = service.materialize(prerequisite(), profile);
  assert.throws(
    () => service.verify({
      ...result,
      redacted_manifest: exactQuotaResult.redacted_manifest,
    }),
    (error) => error instanceof ExperimentFoundationAliyunCreateJobPayloadError
      && error.reasonCode === 'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
  );

  assert.throws(
    () => service.verify({
      ...result,
      execution_profile_hash: hash('0'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCreateJobPayloadError
      && error.reasonCode === 'ALIYUN_CREATE_JOB_PAYLOAD_CONFLICT',
  );

  assert.throws(
    () => service.materialize(prerequisite(), {
      ...publicResourceProfile,
      resource_binding: { mode: 'public_resource', resource_id: 'fake-quota' },
    } as unknown as ExperimentFoundationAliyunPaiDlcExecutionProfileV2),
    (error) => error instanceof ExperimentFoundationAliyunCreateJobPayloadError
      && error.reasonCode === 'ALIYUN_EXECUTION_PROFILE_INVALID',
  );
});

test('Aliyun CreateJob payload materialization is deterministic and rejects exact-binding drift', () => {
  const service = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  const exact = prerequisite();
  assert.deepEqual(service.materialize(exact, profile), service.materialize(exact, profile));

  const drifted = prerequisite();
  drifted.run_cell.training_task_spec_hash = hash('8');
  assert.throws(
    () => service.materialize(drifted, profile),
    (error) => error instanceof ExperimentFoundationAliyunCreateJobPayloadError
      && error.reasonCode === 'ALIYUN_CREATE_JOB_PAYLOAD_INVALID',
  );
});

test('Aliyun CreateJob payload enforces the documented 65,536-byte ceiling before transport', () => {
  const service = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  assert.throws(
    () => service.materialize(prerequisite(['x'.repeat(70_000)]), profile),
    (error) => error instanceof ExperimentFoundationAliyunCreateJobPayloadError
      && error.reasonCode === 'ALIYUN_CREATE_JOB_PAYLOAD_TOO_LARGE',
  );
});

test('same-payload fake lifecycle exercises replay, recovery, cancel, and collection with zero writes', () => {
  const materialized = new ExperimentFoundationV2AliyunCreateJobPayloadService()
    .materialize(prerequisite(), profile);
  const result = new ExperimentFoundationV2AliyunSamePayloadFakeLifecycle().run(materialized);

  assert.equal(result.status, 'workflow_simulation_passed');
  assert.equal(result.operation_ledger.length, 10);
  assert.equal(result.operation_ledger[1]?.replay, true);
  assert.ok(result.operation_ledger.every((entry) => entry.payload_hash === materialized.payload_hash));
  assert.equal(result.success_terminal_state, 'collected');
  assert.equal(result.cancel_terminal_state, 'cancelled_collected');
  assert.equal(result.network_requests, 0);
  assert.equal(result.provider_writes, 0);
  assert.equal(result.scientific_writes, 0);
});

test('read-only preflight rejects CreateJob before transport and accepts only the exact three-call ledger', async () => {
  assert.deepEqual(
    EXPERIMENT_FOUNDATION_ALIYUN_PREFLIGHT_REQUIRED_RAM_POLICY_V1.Statement[0].Action,
    ['paiworkspace:GetWorkspace', 'paiworkspace:ListResources', 'paidlc:ListEcsSpecs'],
  );
  const transport = new PassingReadOnlyTransport();
  const result = await new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
    profile,
    credentialAccessKeyId: 'STS.preflight-access-key-id',
    identityPolicyEvidence: policyEvidence(),
    transport,
    now: new Date('2026-07-18T00:00:00.000Z'),
  });

  assert.equal(result.status, 'cloud_preflight_passed');
  assert.deepEqual(
    result.operation_ledger.map((entry) => entry.operation),
    ['AIWorkspace.GetWorkspace', 'AIWorkspace.ListResources', 'PaiDlc.ListEcsSpecs'],
  );
  assert.equal(result.provider_write_attempts, 0);
  assert.equal(result.provider_writes, 0);
});

test('read-only preflight accepts public-resource selector omission without claiming an exact quota', async () => {
  const result = await new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
    profile: publicResourceProfile,
    credentialAccessKeyId: 'STS.preflight-access-key-id',
    identityPolicyEvidence: policyEvidence(),
    transport: new PassingPublicResourceTransport(),
    now: new Date('2026-07-18T00:00:00.000Z'),
  });

  assert.equal(result.resource.resource_mode, 'public_resource');
  assert.equal(result.resource.resource_id_hash, null);
  assert.equal(result.resource.exact_quota_found, false);
  assert.equal(result.resource.quota_type, null);
  assert.deepEqual(result.operation_ledger.map((entry) => entry.operation), [
    'AIWorkspace.GetWorkspace',
    'AIWorkspace.ListResources',
    'PaiDlc.ListEcsSpecs',
  ]);
  assert.equal(result.provider_write_attempts, 0);
  assert.equal(result.provider_writes, 0);

  await assert.rejects(
    () => new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
      profile: {
        ...publicResourceProfile,
        resource_binding: { mode: 'public_resource', resource_id: 'fake-quota' },
      } as unknown as ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
      credentialAccessKeyId: 'STS.preflight-access-key-id',
      identityPolicyEvidence: policyEvidence(),
      transport: new PassingPublicResourceTransport(),
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_EXECUTION_PROFILE_INVALID',
  );

  await assert.rejects(
    () => new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
      profile: publicResourceProfile,
      credentialAccessKeyId: 'STS.preflight-access-key-id',
      identityPolicyEvidence: policyEvidence(),
      transport: new DuplicatePublicResourceReadTransport(),
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_READ_ONLY_LEDGER_INVALID',
  );
});

test('official Aliyun SDK adapter maps requests and exhausts bounded read-only pagination', async () => {
  const resourcePageNumbers: number[] = [];
  const specPageNumbers: number[] = [];
  const clients: ExperimentFoundationAliyunReadOnlySdkClientsV1 = {
    workspaceClient: {
      async getWorkspace(workspaceId) {
        assert.equal(workspaceId, profile.workspace_id);
        return new GetWorkspaceResponse({
          body: {
            requestId: 'workspace-request',
            workspaceId,
            status: 'ENABLED',
          },
        });
      },
      async listResources(request: ListResourcesRequest) {
        resourcePageNumbers.push(request.pageNumber ?? -1);
        assert.equal(request.workspaceId, profile.workspace_id);
        assert.equal(request.pageSize, 100);
        const fillerResources = Array.from({ length: 100 }, (_, index) => ({
          id: `unrelated-resource-${index + 1}`,
          quotas: [],
        }));
        return new ListResourcesResponse({
          body: request.pageNumber === 1 ? {
            requestId: 'resource-request-1',
            totalCount: 101,
            resources: fillerResources,
          } : {
            requestId: 'resource-request-2',
            totalCount: 101,
            resources: [{
              id: 'resource-container-101',
              quotas: [{
                id: profile.resource_binding.mode === 'exact_quota'
                  ? profile.resource_binding.resource_id
                  : 'unreachable',
                quotaType: 'DLC',
                specs: [{ name: 'cpu', value: '8' }],
              }],
            }],
          },
        });
      },
    },
    dlcClient: {
      async listEcsSpecs(request: ListEcsSpecsRequest) {
        specPageNumbers.push(request.pageNumber ?? -1);
        assert.equal(request.pageSize, 10);
        assert.equal(request.acceleratorType, 'CPU');
        assert.equal(request.resourceType, 'ECS');
        assert.equal(request.sortBy, undefined);
        assert.equal(request.order, undefined);
        const firstPage = Array.from({ length: 10 }, () => ({
          acceleratorType: 'CPU',
          isAvailable: false,
        }));
        return new ListEcsSpecsResponse({
          body: request.pageNumber === 1 ? {
            requestId: 'spec-request-1',
            totalCount: 11,
            ecsSpecs: firstPage,
          } : {
            requestId: 'spec-request-2',
            totalCount: 11,
            ecsSpecs: [{ acceleratorType: 'CPU', isAvailable: true }],
          },
        });
      },
    },
  };
  const transport = new AliyunSdkExperimentFoundationReadOnlyTransportV2(
    profile.region_id,
    {
      access_key_id: 'STS.adapter-test',
      access_key_secret: 'adapter-test-secret',
      security_token: 'adapter-test-token',
    },
    clients,
  );

  const result = await new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
    profile,
    credentialAccessKeyId: 'STS.adapter-test',
    identityPolicyEvidence: policyEvidence('STS.adapter-test'),
    transport,
    now: new Date('2026-07-18T00:00:00.000Z'),
  });

  assert.deepEqual(resourcePageNumbers, [1, 2]);
  assert.deepEqual(specPageNumbers, [1, 2]);
  assert.equal(result.resource.exact_quota_found, true);
  assert.equal(result.resource.request_id, 'resource-request-2');
  assert.equal(result.dlc_specs.visible_cpu_spec_count, 11);
  assert.equal(result.dlc_specs.available_cpu_spec_count, 1);
  assert.deepEqual(result.operation_ledger.map((entry) => entry.operation), [
    'AIWorkspace.GetWorkspace',
    'AIWorkspace.ListResources',
    'AIWorkspace.ListResources',
    'PaiDlc.ListEcsSpecs',
    'PaiDlc.ListEcsSpecs',
  ]);
});

test('official Aliyun SDK adapter performs one ListResources read for public-resource mode', async () => {
  const resourcePageNumbers: number[] = [];
  const clients: ExperimentFoundationAliyunReadOnlySdkClientsV1 = {
    workspaceClient: {
      async getWorkspace(workspaceId) {
        return new GetWorkspaceResponse({
          body: { requestId: 'public-workspace-request', workspaceId, status: 'ENABLED' },
        });
      },
      async listResources(request: ListResourcesRequest) {
        resourcePageNumbers.push(request.pageNumber ?? -1);
        return new ListResourcesResponse({
          body: {
            requestId: 'public-resource-request',
            totalCount: 0,
            resources: [],
          },
        });
      },
    },
    dlcClient: {
      async listEcsSpecs() {
        return new ListEcsSpecsResponse({
          body: {
            requestId: 'public-spec-request',
            totalCount: 1,
            ecsSpecs: [{ acceleratorType: 'CPU', isAvailable: true }],
          },
        });
      },
    },
  };
  const transport = new AliyunSdkExperimentFoundationReadOnlyTransportV2(
    publicResourceProfile.region_id,
    {
      access_key_id: 'STS.public-adapter-test',
      access_key_secret: 'public-adapter-test-secret',
      security_token: 'public-adapter-test-token',
    },
    clients,
  );

  const result = await new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
    profile: publicResourceProfile,
    credentialAccessKeyId: 'STS.public-adapter-test',
    identityPolicyEvidence: policyEvidence('STS.public-adapter-test'),
    transport,
    now: new Date('2026-07-18T00:00:00.000Z'),
  });

  assert.deepEqual(resourcePageNumbers, [1]);
  assert.equal(result.resource.resource_mode, 'public_resource');
  assert.equal(result.resource.exact_quota_found, false);
  assert.deepEqual(result.operation_ledger.map((entry) => entry.operation), [
    'AIWorkspace.GetWorkspace',
    'AIWorkspace.ListResources',
    'PaiDlc.ListEcsSpecs',
  ]);
});

test('official Aliyun SDK adapter classifies provider failures without leaking diagnostics', async () => {
  const providerDiagnostic =
    'AccessKeySecret=must-not-leak SecurityToken=must-not-leak RequestId=provider-secret';
  const safeProviderRequestId = 'provider-request-safe';
  const clients: ExperimentFoundationAliyunReadOnlySdkClientsV1 = {
    workspaceClient: {
      async getWorkspace(workspaceId) {
        return new GetWorkspaceResponse({
          body: { requestId: 'failure-workspace-request', workspaceId, status: 'ENABLED' },
        });
      },
      async listResources() {
        return new ListResourcesResponse({
          body: {
            requestId: 'failure-resource-request',
            totalCount: 0,
            resources: [],
          },
        });
      },
    },
    dlcClient: {
      async listEcsSpecs() {
        throw Object.assign(new Error(providerDiagnostic), {
          statusCode: 400,
          requestId: safeProviderRequestId,
          code: 'BadRequest',
        });
      },
    },
  };
  const transport = new AliyunSdkExperimentFoundationReadOnlyTransportV2(
    publicResourceProfile.region_id,
    {
      access_key_id: 'STS.failure-adapter-test',
      access_key_secret: 'failure-adapter-test-secret',
      security_token: 'failure-adapter-test-token',
    },
    clients,
  );

  await assert.rejects(
    () => new ExperimentFoundationV2AliyunReadOnlyPreflightService().run({
      profile: publicResourceProfile,
      credentialAccessKeyId: 'STS.failure-adapter-test',
      identityPolicyEvidence: policyEvidence('STS.failure-adapter-test'),
      transport,
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.disposition === 'failed'
      && error.reasonCode === 'ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED'
      && error.message.includes('provider_status=400')
      && error.message.includes('provider_code=BadRequest')
      && error.message.includes(`request_id=${safeProviderRequestId}`)
      && !error.message.includes(providerDiagnostic)
      && !error.message.includes('must-not-leak'),
  );
  assert.deepEqual(transport.getOperationLedger().at(-1), {
    sequence: 3,
    operation: 'PaiDlc.ListEcsSpecs',
    endpoint: 'pai-dlc.cn-hangzhou.aliyuncs.com',
    request_id: safeProviderRequestId,
    outcome: 'failed',
    reason_code: 'ALIYUN_READ_ONLY_PROVIDER_CALL_FAILED',
    redacted_refs: {},
  });
});

test('read-only preflight fails closed for policy drift, expiry, unavailable workspace, and incomplete STS', async () => {
  const service = new ExperimentFoundationV2AliyunReadOnlyPreflightService();
  const driftedPolicy = policyEvidence();
  driftedPolicy.policy_document_hash = hash('9');
  await assert.rejects(
    () => service.run({
      profile,
      credentialAccessKeyId: 'STS.preflight-access-key-id',
      identityPolicyEvidence: driftedPolicy,
      transport: new PassingReadOnlyTransport(),
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_MISMATCH',
  );

  await assert.rejects(
    () => service.run({
      profile,
      credentialAccessKeyId: 'STS.preflight-access-key-id',
      identityPolicyEvidence: policyEvidence(),
      transport: new DisabledWorkspaceTransport(),
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_WORKSPACE_NOT_ENABLED',
  );

  const expired = policyEvidence();
  expired.reviewed_at = '2026-07-16T00:00:00.000Z';
  expired.expires_at = '2026-07-17T00:00:00.000Z';
  await assert.rejects(
    () => service.run({
      profile,
      credentialAccessKeyId: 'STS.preflight-access-key-id',
      identityPolicyEvidence: expired,
      transport: new PassingReadOnlyTransport(),
      now: new Date('2026-07-18T00:00:00.000Z'),
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_EXPIRED',
  );

  assert.throws(
    () => new AliyunSdkExperimentFoundationReadOnlyTransportV2('cn-hangzhou', {
      access_key_id: 'id',
      access_key_secret: 'secret',
      security_token: '',
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_TEMPORARY_CREDENTIAL_REQUIRED',
  );

  const sdkTransport = new AliyunSdkExperimentFoundationReadOnlyTransportV2('cn-hangzhou', {
    access_key_id: 'STS.runtime-constructor-only',
    access_key_secret: 'constructor-only-secret',
    security_token: 'constructor-only-token',
  });
  assert.deepEqual(sdkTransport.getOperationLedger(), []);

  assert.deepEqual(
    parseAliyunPreflightIdentityPolicyEvidence(policyEvidence()),
    policyEvidence(),
  );

  const nonCanonicalTime = policyEvidence();
  nonCanonicalTime.reviewed_at = '2026-07-17 00:00:00 UTC';
  assert.throws(
    () => parseAliyunPreflightIdentityPolicyEvidence(nonCanonicalTime),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
  );

  assert.throws(
    () => assertAliyunPreflightProviderOperationAllowed('CreateJob:credential-like-input'),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_WRITE_OPERATION_DENIED'
      && !error.message.includes('credential-like-input'),
  );

  const excessiveLifetime = policyEvidence();
  excessiveLifetime.expires_at = '2026-07-19T12:00:00.001Z';
  assert.throws(
    () => parseAliyunPreflightIdentityPolicyEvidence(excessiveLifetime),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
  );

  const impossibleDate = policyEvidence();
  impossibleDate.reviewed_at = '2026-02-30T00:00:00.000Z';
  assert.throws(
    () => parseAliyunPreflightIdentityPolicyEvidence(impossibleDate),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID',
  );
});

test('reviewed policy evidence requires a regular repo-external file and independent digest', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ef-cloud-policy-'));
  const repositoryRoot = path.join(root, 'repo');
  const evidencePath = path.join(root, 'reviewed-policy.json');
  const symlinkPath = path.join(root, 'reviewed-policy-link.json');
  const repositoryAliasPath = path.join(root, 'repo-alias');
  const repositoryEvidencePath = path.join(repositoryRoot, 'reviewed-policy.json');
  const rawJson = `${JSON.stringify(policyEvidence())}\n`;
  const expectedSha256 = `sha256:${createHash('sha256').update(rawJson).digest('hex')}`;
  try {
    await fs.mkdir(repositoryRoot);
    await fs.writeFile(evidencePath, rawJson, { mode: 0o600 });
    const reviewed = await readAliyunPreflightReviewedPolicyEvidenceFile({
      filePath: evidencePath,
      repositoryRoot,
      expectedSha256,
    });
    assert.equal(reviewed.raw_json, rawJson);
    assert.equal(reviewed.sha256, expectedSha256);

    await assert.rejects(
      () => readAliyunPreflightReviewedPolicyEvidenceFile({
        filePath: evidencePath,
        repositoryRoot,
        expectedSha256: `sha256:${'0'.repeat(64)}`,
      }),
      (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
        && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_DIGEST_MISMATCH',
    );

    await fs.chmod(evidencePath, 0o622);
    await assert.rejects(
      () => readAliyunPreflightReviewedPolicyEvidenceFile({
        filePath: evidencePath,
        repositoryRoot,
        expectedSha256,
      }),
      (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
        && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_FILE_UNTRUSTED',
    );
    await fs.chmod(evidencePath, 0o600);

    await fs.writeFile(repositoryEvidencePath, rawJson, { mode: 0o600 });
    await fs.symlink(repositoryRoot, repositoryAliasPath, 'dir');
    await assert.rejects(
      () => readAliyunPreflightReviewedPolicyEvidenceFile({
        filePath: path.join(repositoryAliasPath, path.basename(repositoryEvidencePath)),
        repositoryRoot,
        expectedSha256,
      }),
      (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
        && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_MUST_BE_REPO_EXTERNAL',
    );

    await fs.symlink(evidencePath, symlinkPath);
    await assert.rejects(
      () => readAliyunPreflightReviewedPolicyEvidenceFile({
        filePath: symlinkPath,
        repositoryRoot,
        expectedSha256,
      }),
      (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
        && error.reasonCode === 'ALIYUN_IDENTITY_POLICY_EVIDENCE_SYMLINK_FORBIDDEN',
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
