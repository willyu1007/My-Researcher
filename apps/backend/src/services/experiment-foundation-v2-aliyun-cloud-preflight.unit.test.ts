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
  ExperimentFoundationAliyunPaiDlcExecutionProfileV1,
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
  AliyunSdkExperimentFoundationReadOnlyTransportV1,
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
  type ExperimentFoundationAliyunReadOnlyTransportV1,
} from './experiment-foundation-v2-aliyun-read-only-preflight-service.js';
import {
  ExperimentFoundationV2AliyunSamePayloadFakeLifecycle,
} from './experiment-foundation-v2-aliyun-same-payload-fake-lifecycle.js';

const timestamp = '2026-07-18T00:00:00.000Z';
const hash = (character: string) => `sha256:${character.repeat(64)}`;

const profile: ExperimentFoundationAliyunPaiDlcExecutionProfileV1 = {
  schema_version: 'AliyunPaiDlcExecutionProfile@v1',
  region_id: 'cn-hangzhou',
  workspace_id: 'ws-preflight-secret-ref',
  resource_id: 'quota-preflight-secret-ref',
  image_uri: 'registry-vpc.cn-hangzhou.aliyuncs.com/pai/example:2026-07-18',
  job_type: 'PyTorchJob',
  job_spec_type: 'Worker',
  pod_count: 1,
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
    ],
    verified_denied_actions: ['paidlc:CreateJob'],
    reviewer_ref: 'security-review:T-132-cloud-preflight',
    reviewed_at: '2026-07-17T12:00:00.000Z',
    expires_at: '2026-07-18T12:00:00.000Z',
  };
}

class PassingReadOnlyTransport implements ExperimentFoundationAliyunReadOnlyTransportV1 {
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

  async listResources() {
    this.record('AIWorkspace.ListResources', 'aiworkspace.cn-hangzhou.aliyuncs.com', 'request-2');
    return {
      request_id: 'request-2',
      endpoint: 'aiworkspace.cn-hangzhou.aliyuncs.com',
      resource_id_hash: hashAliyunPreflightProviderRef('resource_id', profile.resource_id),
      resource_found: true,
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

  private record(
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

test('exact Aliyun CreateJob payload is canonical, bounded, and persistently redacted', () => {
  const service = new ExperimentFoundationV2AliyunCreateJobPayloadService();
  const result = service.materialize(prerequisite(), profile);
  const payload = service.verify(result);

  assert.equal(payload.WorkspaceId, profile.workspace_id);
  assert.equal(payload.ResourceId, profile.resource_id);
  assert.equal(payload.JobSpecs[0].ResourceConfig.CPU, '2');
  assert.equal(payload.JobSpecs[0].ResourceConfig.Memory, '2048Mi');
  assert.match(payload.UserCommand, /must-be-redacted/);
  assert.ok(result.payload_byte_size < EXPERIMENT_FOUNDATION_ALIYUN_CREATE_JOB_MAX_BYTES);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /must-be-redacted/);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /ws-preflight-secret-ref/);
  assert.doesNotMatch(JSON.stringify(result.redacted_manifest), /quota-preflight-secret-ref/);
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
    ['paiworkspace:GetWorkspace', 'paiworkspace:ListResources'],
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
                id: profile.resource_id,
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
        assert.equal(request.pageSize, 100);
        const firstPage = Array.from({ length: 100 }, () => ({
          acceleratorType: 'CPU',
          isAvailable: false,
        }));
        return new ListEcsSpecsResponse({
          body: request.pageNumber === 1 ? {
            requestId: 'spec-request-1',
            totalCount: 101,
            ecsSpecs: firstPage,
          } : {
            requestId: 'spec-request-2',
            totalCount: 101,
            ecsSpecs: [{ acceleratorType: 'CPU', isAvailable: true }],
          },
        });
      },
    },
  };
  const transport = new AliyunSdkExperimentFoundationReadOnlyTransportV1(
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
  assert.equal(result.resource.resource_found, true);
  assert.equal(result.resource.request_id, 'resource-request-2');
  assert.equal(result.dlc_specs.visible_cpu_spec_count, 101);
  assert.equal(result.dlc_specs.available_cpu_spec_count, 1);
  assert.deepEqual(result.operation_ledger.map((entry) => entry.operation), [
    'AIWorkspace.GetWorkspace',
    'AIWorkspace.ListResources',
    'AIWorkspace.ListResources',
    'PaiDlc.ListEcsSpecs',
    'PaiDlc.ListEcsSpecs',
  ]);
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
    () => new AliyunSdkExperimentFoundationReadOnlyTransportV1('cn-hangzhou', {
      access_key_id: 'id',
      access_key_secret: 'secret',
      security_token: '',
    }),
    (error) => error instanceof ExperimentFoundationAliyunCloudPreflightError
      && error.reasonCode === 'ALIYUN_TEMPORARY_CREDENTIAL_REQUIRED',
  );

  const sdkTransport = new AliyunSdkExperimentFoundationReadOnlyTransportV1('cn-hangzhou', {
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
