import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CreateJobResponse,
  GetJobResponse,
  ListJobsResponse,
  StopJobResponse,
} from '@alicloud/pai-dlc20201203';

import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationExecutionBundleRevisionV2,
  ExperimentFoundationProviderResultEnvelopeV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import { canonicalizeExperimentV2Json } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationAliyunRealProviderTransportErrorV2,
  ExperimentFoundationAliyunRealProviderTransportV2,
  type ExperimentFoundationAliyunPaiDlcSdkClientV2,
  type ExperimentFoundationAliyunRealProviderTransportInputV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';

const hash = (character: string) => `sha256:${character.repeat(64)}`;
const NOW = '2026-07-23T00:00:00.000Z';

interface FakeJob {
  jobId: string;
  workspaceId: string;
  resourceId?: string;
  displayName: string;
  accessibility: string;
  jobType: string;
  userCommand: string;
  envs: Record<string, string>;
  dataSources: Array<{ uri?: string; mountPath?: string }>;
  credentialConfig: NonNullable<
    ExperimentFoundationAliyunRealProviderTransportInputV2[
      'materialized'
    ]['create_job_request']['credentialConfig']
  >;
  jobSpecs: Array<{
    type: string;
    image: string;
    podCount: number;
    resourceConfig?: { CPU?: string; memory?: string };
    quotaId?: string;
    ecsSpec?: string;
  }>;
  settings: { tags: Record<string, string> };
  status: string;
}

class InjectedPaiDlcSdkFake {
  createCount = 0;
  listCount = 0;
  readonly listedPageNumbers: number[] = [];
  getCount = 0;
  stopCount = 0;
  visibleAfterListCount = 0;
  loseCreateResponse = false;
  nextStatus = 'Creating';
  readonly jobs = new Map<string, FakeJob>();

  readonly createJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['createJobWithOptions'] =
    async (request) => {
      this.createCount += 1;
      const jobId = `job-${this.createCount}`;
      this.jobs.set(jobId, {
        jobId,
        workspaceId: request.workspaceId!,
        resourceId: request.resourceId,
        displayName: request.displayName!,
        accessibility: request.accessibility!,
        jobType: request.jobType!,
        userCommand: request.userCommand!,
        envs: { ...(request.envs ?? {}) },
        dataSources: (request.dataSources ?? []).map((source) => ({
          uri: source.uri,
          mountPath: source.mountPath,
        })),
        credentialConfig: request.credentialConfig!,
        jobSpecs: request.jobSpecs!.map((spec) => ({
          type: spec.type!,
          image: spec.image!,
          podCount: spec.podCount!,
          resourceConfig: spec.resourceConfig
            ? {
              CPU: spec.resourceConfig.CPU,
              memory: spec.resourceConfig.memory,
            }
            : undefined,
          quotaId: spec.quotaId,
          ecsSpec: spec.ecsSpec,
        })),
        settings: { tags: { ...(request.settings?.tags ?? {}) } },
        status: this.nextStatus,
      });
      if (this.loseCreateResponse) throw new Error('accepted response lost');
      return new CreateJobResponse({ statusCode: 200, body: { jobId, requestId: 'redacted' } });
    };

  readonly listJobsWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['listJobsWithOptions'] =
    async (request) => {
      this.listCount += 1;
      const allJobs = this.listCount > this.visibleAfterListCount
        ? [...this.jobs.values()].map((job) => ({
          jobId: job.jobId,
          displayName: job.displayName,
          status: job.status,
        }))
        : [];
      const pageNumber = request.pageNumber ?? 1;
      const pageSize = request.pageSize ?? 50;
      this.listedPageNumbers.push(pageNumber);
      const jobs = allJobs.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
      return new ListJobsResponse({
        statusCode: 200,
        body: { jobs, totalCount: allJobs.length, requestId: 'redacted' },
      });
    };

  readonly getJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['getJobWithOptions'] =
    async (jobId) => {
      this.getCount += 1;
      const job = this.jobs.get(jobId);
      return new GetJobResponse({
        statusCode: job ? 200 : 404,
        body: job ? { ...job, requestId: 'redacted' } : undefined,
      });
    };

  readonly stopJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['stopJobWithOptions'] =
    async (jobId) => {
      this.stopCount += 1;
      const job = this.jobs.get(jobId);
      if (job) job.status = 'Stopped';
      return new StopJobResponse({ statusCode: 200, body: { requestId: 'redacted' } });
    };
}

function fixture(): {
  input: ExperimentFoundationAliyunRealProviderTransportInputV2;
  resultEnvelope: ExperimentFoundationProviderResultEnvelopeV1;
} {
  const run: ExperimentFoundationRunV2 = {
    run_id: 'run-1',
    external_pi_work_order_revision_id: 'work-order-revision-2',
    external_pi_work_order_revision_hash: hash('1'),
    external_pi_branch_revision_sequence: 2,
    run_manifest_hash: hash('2'),
    cell_count: 2,
    frozen_at: NOW,
  };
  const runCell: ExperimentFoundationRunCellV2 = {
    run_cell_id: 'run-cell-1',
    run_id: run.run_id,
    ordinal: 1,
    cell_key: 'cell-a',
    external_pi_cell_id: 'pi-cell-a',
    external_pi_cell_hash: hash('3'),
    training_task_spec_id: 'task-spec-a',
    training_task_spec_hash: hash('4'),
    seed: 7,
    repeat_index: 1,
  };
  const bundle: ExperimentFoundationExecutionBundleRevisionV2 = {
    execution_bundle_revision_id: 'execution-bundle-revision-1',
    execution_bundle_id: 'execution-bundle-1',
    revision_sequence: 1,
    schema_version: 'v1',
    hash_profile: 'ef-execution-bundle-semantic-json@v1',
    content_hash: hash('5'),
    revision_content: {
      execution_bundle_schema_version: 'v1',
      code_artifact: {
        artifact_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/workload/${'6'.repeat(64)}/`,
        content_digest: hash('6'),
        byte_size: 1024,
      },
      container_image: {
        image_ref: 'dsw-registry-vpc.cn-shanghai.cr.aliyuncs.com/pai/ragperf-official:py311-cpu',
        image_digest: hash('7'),
      },
      dataset_mirrors: [{
        ordinal: 1,
        dataset_revision: {
          asset_type: 'Dataset',
          logical_id: 'dataset-1',
          revision_id: 'dataset-revision-1',
          revision_sequence: 1,
          content_hash: hash('8'),
        },
        object_ref: `oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/input/scifact/${'9'.repeat(64)}/`,
        content_digest: hash('9'),
        byte_size: 2048,
      }],
      entrypoint: 'python3',
      arguments: ['/mnt/pea-code/entrypoint.py'],
      dependency_lock_digest: hash('a'),
      output_contract: {
        result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
        result_object_name: 'result.json',
        parser_profile_version: 'ragperf-parser-v1',
        parser_profile_hash: hash('b'),
      },
    },
    created_at: NOW,
  };
  const task: ExperimentFoundationExecutableTrainingTaskSpecV2 = {
    training_task_spec_id: runCell.training_task_spec_id,
    materialization_key: 'task-materialization-1',
    run_recipe_id: 'run-recipe-1',
    external_pi_work_order_revision_id: run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: run.external_pi_work_order_revision_hash,
    external_pi_cell_id: runCell.external_pi_cell_id,
    external_pi_cell_hash: runCell.external_pi_cell_hash,
    execution_bundle: {
      execution_bundle_id: bundle.execution_bundle_id,
      execution_bundle_revision_id: bundle.execution_bundle_revision_id,
      revision_sequence: bundle.revision_sequence,
      content_hash: bundle.content_hash,
    },
    command_snapshot: {
      command: 'python3',
      arguments: ['/mnt/pea-code/entrypoint.py', '--cell-key=cell-a'],
    },
    io_snapshot: {
      input_keys: ['dataset-mirror-1'],
      output_keys: ['real_provider_result_envelope', 'real_provider_diagnostic_log'],
      input_mirror_ordinals: [1],
      result_object_name: 'result.json',
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      parser_profile_version: 'ragperf-parser-v1',
      parser_profile_hash: hash('b'),
    },
    resource_snapshot: { cpu_cores: 1, memory_mb: 1024 },
    retry_snapshot: { max_attempts: 1, timeout_seconds: 600 },
    task_spec_hash: runCell.training_task_spec_hash,
    created_at: NOW,
  };
  const profile: ExperimentFoundationAliyunRealProviderProfileV2 = {
    schema_version: 'AliyunPaiDlcRealProviderProfile@v1',
    region_id: 'cn-shanghai',
    workspace_id: 'workspace-1',
    resource_binding: {
      mode: 'public_resource',
      ecs_spec: 'ecs.test.large',
      cpu_cores: 1,
      memory_mb: 1024,
    },
    image_uri: bundle.revision_content.container_image.image_ref,
    job_type: 'PyTorchJob',
    job_spec_type: 'Worker',
    pod_count: 1,
    workload_binding: {
      schema_version: 'AliyunPaiDlcWorkloadBinding@v1',
      runtime_role_arn: 'acs:ram::1183869713036194:role/pea-m7-canary-runtime',
      code_mount_path: '/mnt/pea-code',
      input_mount_root: '/mnt/pea-input',
      output_mount_path: '/mnt/pea-output',
      output_uri_prefix:
        'oss://pea-m7-canary-test.oss-cn-shanghai-internal.aliyuncs.com/output/',
    },
  };
  const providerIdempotencyKey = 'attempt-1:submit:1';
  const materialized = new ExperimentFoundationRealProviderPayloadV2Service().materialize({
    run,
    run_cell: runCell,
    task_spec: task,
    execution_bundle_revision: bundle,
    provider_idempotency_key: providerIdempotencyKey,
  }, profile);
  return {
    input: {
      materialized,
      task_spec: task,
      provider_idempotency_key: providerIdempotencyKey,
      create_permitted: true,
      external_job_ref: null,
    },
    resultEnvelope: {
      result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
      execution_bundle_revision_id: bundle.execution_bundle_revision_id,
      execution_bundle_revision_hash: bundle.content_hash,
      run_id: run.run_id,
      run_manifest_hash: run.run_manifest_hash,
      run_cell_id: runCell.run_cell_id,
      cell_key: runCell.cell_key,
      training_task_spec_id: task.training_task_spec_id,
      training_task_spec_hash: task.task_spec_hash,
      parser_profile_version: task.io_snapshot.parser_profile_version,
      parser_profile_hash: task.io_snapshot.parser_profile_hash,
      outputs: { qps: 10 },
    },
  };
}

test('M7-06 submit creates at most one job and recovery replay never calls CreateJob', async () => {
  const sdk = new InjectedPaiDlcSdkFake();
  const { input } = fixture();
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({ client: sdk });
  const submitted = await transport.submit(input);
  const replay = await transport.submit({ ...input, create_permitted: false });

  assert.equal(sdk.createCount, 1);
  assert.equal(submitted.external_job_ref?.job_id, 'job-1');
  assert.equal(replay.external_job_ref?.job_id, 'job-1');
});

test('M7-07 accepted-response loss discovers the exact job without blind retry', async () => {
  const sdk = new InjectedPaiDlcSdkFake();
  sdk.loseCreateResponse = true;
  sdk.visibleAfterListCount = 2;
  const { input } = fixture();
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: sdk,
    maximumRecoveryPolls: 3,
  });
  const recovered = await transport.submit(input);

  assert.equal(recovered.external_job_ref?.job_id, 'job-1');
  assert.equal(sdk.createCount, 1);
  assert.equal(sdk.listCount, 3);
});

test('M7-07 recovery-only miss remains retryable but cannot issue a second CreateJob', async () => {
  const sdk = new InjectedPaiDlcSdkFake();
  sdk.loseCreateResponse = true;
  sdk.visibleAfterListCount = 100;
  const { input } = fixture();
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: sdk,
    maximumRecoveryPolls: 2,
  });
  await assert.rejects(
    () => transport.submit(input),
    isReason('REAL_PROVIDER_RECOVERY_NOT_FOUND', true),
  );
  await assert.rejects(
    () => transport.submit({ ...input, create_permitted: false }),
    isReason('REAL_PROVIDER_RECOVERY_NOT_FOUND', true),
  );
  assert.equal(sdk.createCount, 1);
});

test('M7-06 duplicate discovery and M7-08 unknown status fail closed', async () => {
  const duplicateSdk = new InjectedPaiDlcSdkFake();
  const { input } = fixture();
  seedExactJob(duplicateSdk, input, 'job-a', 'Running');
  seedExactJob(duplicateSdk, input, 'job-b', 'Running');
  const duplicateTransport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: duplicateSdk,
  });
  await assert.rejects(
    () => duplicateTransport.submit(input),
    isReason('REAL_PROVIDER_RECOVERY_DUPLICATE', false),
  );
  assert.equal(duplicateSdk.createCount, 0);

  const unknownSdk = new InjectedPaiDlcSdkFake();
  seedExactJob(unknownSdk, input, 'job-unknown', 'Paused');
  const unknownTransport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: unknownSdk,
  });
  await assert.rejects(
    () => unknownTransport.sync({
      ...input,
      external_job_ref: {
        ref_type: 'aliyun_pai_dlc_job',
        job_id: 'job-unknown',
        region_id_hash:
          input.materialized.record.redacted_manifest.provider_binding_hashes.region_id_hash,
      },
    }),
    isReason('REAL_PROVIDER_STATUS_UNKNOWN', false),
  );
});

test('M7-L1 recovery paginates to exhaustion and exact-matches full job detail', async () => {
  const sdk = new InjectedPaiDlcSdkFake();
  const { input } = fixture();
  for (let index = 0; index < 50; index += 1) {
    seedExactJob(sdk, input, `job-decoy-${index}`, 'Running');
    sdk.jobs.get(`job-decoy-${index}`)!.workspaceId = 'wrong-workspace';
  }
  seedExactJob(sdk, input, 'job-page-2', 'Running');
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({ client: sdk });
  const recovered = await transport.submit({ ...input, create_permitted: false });

  assert.equal(recovered.external_job_ref?.job_id, 'job-page-2');
  assert.deepEqual(sdk.listedPageNumbers, [1, 2]);
  assert.equal(sdk.createCount, 0);

  sdk.jobs.get('job-page-2')!.credentialConfig
    .credentialConfigItems![0]!.roles![0]!.assumeRoleFor = '1183869713036194';
  const recoveredWithProviderEcho = await transport.submit({
    ...input,
    create_permitted: false,
  });
  assert.equal(recoveredWithProviderEcho.external_job_ref?.job_id, 'job-page-2');

  const providerNormalized = sdk.jobs.get('job-page-2')!;
  providerNormalized.resourceId = '';
  providerNormalized.credentialConfig
    .credentialConfigItems![0]!.roles![0]!.policy = '';
  providerNormalized.jobSpecs[0]!.resourceConfig = { CPU: '', memory: '' };
  const recoveredWithProviderEmptyDefaults = await transport.submit({
    ...input,
    create_permitted: false,
  });
  assert.equal(
    recoveredWithProviderEmptyDefaults.external_job_ref?.job_id,
    'job-page-2',
  );

  sdk.jobs.get('job-page-2')!.jobSpecs[0]!.ecsSpec = 'ecs.other.large';
  await assert.rejects(
    () => transport.submit({ ...input, create_permitted: false }),
    isReason('REAL_PROVIDER_RECOVERY_NOT_FOUND', true),
  );
});

test('M7-09 cancel verifies Stopped and M7-10 collection verifies exact canonical binding', async () => {
  const sdk = new InjectedPaiDlcSdkFake();
  const { input, resultEnvelope } = fixture();
  seedExactJob(sdk, input, 'job-running', 'Running');
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: sdk,
    resultReader: {
      readExactResult: async () => ({
        object_locator: 'oss://redacted-output/job-running/result.json',
        canonical_result_bytes: canonicalizeExperimentV2Json(resultEnvelope),
      }),
    },
  });
  const bound = withExternalJob(input, 'job-running');
  const cancelled = await transport.cancel(bound);
  assert.equal(cancelled.normalized_state, 'cancelled');
  assert.equal(sdk.stopCount, 1);

  sdk.jobs.get('job-running')!.status = 'Succeeded';
  const collected = await transport.collect(bound);
  assert.equal(collected.normalized_state, 'succeeded');
  assert.match(collected.result_manifest_hash!, /^sha256:[0-9a-f]{64}$/u);

  const tamperedTransport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client: sdk,
    resultReader: {
      readExactResult: async () => ({
        object_locator: 'oss://redacted-output/job-running/result.json',
        canonical_result_bytes: canonicalizeExperimentV2Json({
          ...resultEnvelope,
          training_task_spec_hash: hash('f'),
        }),
      }),
    },
  });
  await assert.rejects(
    () => tamperedTransport.collect(bound),
    isReason('REAL_PROVIDER_RESULT_INVALID', false),
  );
});

function seedExactJob(
  sdk: InjectedPaiDlcSdkFake,
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  jobId: string,
  status: string,
): void {
  const request = input.materialized.create_job_request;
  sdk.jobs.set(jobId, {
    jobId,
    workspaceId: request.workspaceId!,
    resourceId: request.resourceId,
    displayName: request.displayName!,
    accessibility: request.accessibility!,
    jobType: request.jobType!,
    userCommand: request.userCommand!,
    envs: { ...(request.envs ?? {}) },
    dataSources: (request.dataSources ?? []).map((source) => ({
      uri: source.uri,
      mountPath: source.mountPath,
    })),
    credentialConfig: request.credentialConfig!,
    jobSpecs: request.jobSpecs!.map((spec) => ({
      type: spec.type!,
      image: spec.image!,
      podCount: spec.podCount!,
      resourceConfig: spec.resourceConfig
        ? {
          CPU: spec.resourceConfig.CPU,
          memory: spec.resourceConfig.memory,
        }
        : undefined,
      quotaId: spec.quotaId,
      ecsSpec: spec.ecsSpec,
    })),
    settings: { tags: { ...(request.settings?.tags ?? {}) } },
    status,
  });
}

function withExternalJob(
  input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  jobId: string,
): ExperimentFoundationAliyunRealProviderTransportInputV2 {
  return {
    ...input,
    create_permitted: false,
    external_job_ref: {
      ref_type: 'aliyun_pai_dlc_job',
      job_id: jobId,
      region_id_hash:
        input.materialized.record.redacted_manifest.provider_binding_hashes.region_id_hash,
    },
  };
}

function isReason(
  reasonCode: string,
  retryable: boolean,
): (error: unknown) => boolean {
  return (error) => error instanceof ExperimentFoundationAliyunRealProviderTransportErrorV2
    && error.reasonCode === reasonCode
    && error.retryable === retryable;
}
