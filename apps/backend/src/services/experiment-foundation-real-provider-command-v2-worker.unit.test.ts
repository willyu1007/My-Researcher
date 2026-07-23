import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CreateJobResponse,
  GetJobResponse,
  ListJobsResponse,
  StopJobResponse,
} from '@alicloud/pai-dlc20201203';
import {
  canonicalizeExperimentV2Json,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  InMemoryExperimentFoundationExecutionV2Repository,
} from '../repositories/in-memory-experiment-foundation-execution-v2-repository.js';
import {
  ExperimentFoundationAliyunRealProviderTransportV2,
  type ExperimentFoundationAliyunPaiDlcSdkClientV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  ExperimentFoundationRealProviderCommandV2Worker,
} from './experiment-foundation-real-provider-command-v2-worker.js';
import {
  ExperimentFoundationRealProviderIntakeV2Service,
} from './experiment-foundation-real-provider-intake-v2-service.js';
import {
  createRealProviderV2TestFixture,
  REAL_PROVIDER_TEST_NOW,
} from './experiment-foundation-real-provider-v2-test-fixture.js';

interface FakeJob {
  jobId: string;
  workspaceId: string;
  displayName: string;
  jobType: string;
  userCommand: string;
  jobSpecs: Array<{ type: string; image: string; podCount: number }>;
  settings: { tags: Record<string, string> };
  status: string;
}

class WorkerPaiDlcSdkFake {
  createCount = 0;
  stopCount = 0;
  listCount = 0;
  loseCreateResponse = false;
  visibleAfterListCount = 0;
  initialStatus = 'Creating';
  readonly jobs = new Map<string, FakeJob>();

  readonly createJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['createJobWithOptions'] =
    async (request) => {
      this.createCount += 1;
      const jobId = `job-${this.createCount}`;
      this.jobs.set(jobId, {
        jobId,
        workspaceId: request.workspaceId!,
        displayName: request.displayName!,
        jobType: request.jobType!,
        userCommand: request.userCommand!,
        jobSpecs: request.jobSpecs!.map((spec) => ({
          type: spec.type!, image: spec.image!, podCount: spec.podCount!,
        })),
        settings: { tags: { ...(request.settings?.tags ?? {}) } },
        status: this.initialStatus,
      });
      if (this.loseCreateResponse) throw new Error('accepted response lost');
      return new CreateJobResponse({ statusCode: 200, body: { jobId } });
    };

  readonly listJobsWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['listJobsWithOptions'] =
    async () => {
      this.listCount += 1;
      const jobs = this.listCount > this.visibleAfterListCount
        ? [...this.jobs.values()].map(({ jobId, displayName, status }) => ({
          jobId, displayName, status,
        }))
        : [];
      return new ListJobsResponse({ statusCode: 200, body: { jobs, totalCount: jobs.length } });
    };

  readonly getJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['getJobWithOptions'] =
    async (jobId) => {
      const job = this.jobs.get(jobId);
      return new GetJobResponse({ statusCode: job ? 200 : 404, body: job });
    };

  readonly stopJobWithOptions: ExperimentFoundationAliyunPaiDlcSdkClientV2['stopJobWithOptions'] =
    async (jobId) => {
      this.stopCount += 1;
      const job = this.jobs.get(jobId);
      if (job) job.status = 'Stopped';
      return new StopJobResponse({ statusCode: 200, body: {} });
    };
}

test('M7-04 control drain capability-off claims nothing and performs no provider call', async () => {
  const harness = await createHarness();
  const before = harness.repository.snapshot();
  const worker = harness.worker({ controlDrainEnabled: () => false });

  assert.deepEqual(await worker.runOnce(), {
    claimed_count: 0, completed_count: 0, released_count: 0, terminal_count: 0,
  });
  assert.deepEqual(harness.repository.snapshot(), before);
  assert.equal(harness.client.createCount, 0);
  assert.equal(harness.client.listCount, 0);
});

test('M7-06/10 real worker converges two exact cells through durable collection manifests', async () => {
  const harness = await createHarness();
  const worker = harness.worker();

  assert.deepEqual(await worker.runOnce(), {
    claimed_count: 2, completed_count: 2, released_count: 0, terminal_count: 0,
  });
  assert.equal(harness.client.createCount, 2);
  for (const job of harness.client.jobs.values()) job.status = 'Succeeded';
  assert.equal((await worker.runOnce()).completed_count, 2);
  assert.equal((await worker.runOnce()).completed_count, 2);

  const snapshot = harness.repository.snapshot();
  assert.ok(snapshot.attempts.every((attempt) => (
    attempt.lifecycle_state === 'succeeded'
    && attempt.terminal_reason_code === 'real_provider_succeeded'
    && attempt.external_job_ref_type === 'aliyun_pai_dlc_job'
  )));
  assert.equal(snapshot.collections.length, 2);
  assert.ok(snapshot.collections.every((collection) => collection.collection_state === 'collected'));
  assert.equal(snapshot.outputs.length, 2);
  assert.ok(snapshot.outputs.every((output) => (
    output.output_kind === 'real_provider_result_envelope'
    && output.output_class === 'diagnostic_only'
    && String(output.redacted_manifest.redacted_locator).startsWith('result-manifest://sha256:')
  )));
  assert.equal(JSON.stringify(snapshot).includes('workspace-secret-ref'), false);
});

test('M7-07 accepted-response loss retries discovery only and never issues a second CreateJob', async () => {
  let clock = REAL_PROVIDER_TEST_NOW;
  const harness = await createHarness({ now: () => clock });
  harness.client.loseCreateResponse = true;
  harness.client.visibleAfterListCount = Number.MAX_SAFE_INTEGER;
  const worker = harness.worker({ now: () => clock, maximumCommandAttempts: 3 });

  const first = await worker.runOnce();
  assert.deepEqual(first, {
    claimed_count: 2, completed_count: 0, released_count: 2, terminal_count: 0,
  });
  assert.equal(harness.client.createCount, 2);

  harness.client.visibleAfterListCount = 0;
  clock = '2026-07-23T00:00:10.000Z';
  const recovered = await worker.runOnce();
  assert.equal(recovered.completed_count, 2);
  assert.equal(harness.client.createCount, 2);
  assert.ok(harness.repository.snapshot().attempts.every(
    (attempt) => attempt.lifecycle_state === 'submitted',
  ));
});

test('M7-09 wall-clock watchdog timeout verifies StopJob cleanup before failing Attempt', async () => {
  let clock = REAL_PROVIDER_TEST_NOW;
  const harness = await createHarness({ now: () => clock });
  harness.client.initialStatus = 'Running';
  // maximumCommandAttempts=1 must NOT time a healthy job out: the watchdog is
  // wall-clock against the frozen TaskSpec timeout_seconds, not a poll count.
  const worker = harness.worker({
    now: () => clock,
    maximumCommandAttempts: 1,
    watchdogGraceMs: 0,
  });

  assert.equal((await worker.runOnce()).completed_count, 2);
  clock = '2026-07-23T00:05:00.000Z';
  const healthy = await worker.runOnce();
  assert.equal(healthy.released_count, 2);
  assert.equal(healthy.terminal_count, 0);
  assert.equal(harness.client.stopCount, 0);

  clock = '2026-07-23T00:10:00.001Z';
  const timeout = await worker.runOnce();
  assert.equal(timeout.terminal_count, 2);
  assert.equal(harness.client.stopCount, 2);
  assert.ok(harness.repository.snapshot().attempts.every((attempt) => (
    attempt.lifecycle_state === 'failed'
    && attempt.terminal_reason_code === 'real_provider_timeout'
  )));
});

test('M7-14 disabling intake does not stop the control drain for already committed commands', async () => {
  const harness = await createHarness();
  const disabledIntake = new ExperimentFoundationRealProviderIntakeV2Service({
    repository: harness.repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: harness.fixture.bundle }),
    },
    profileResolver: async () => harness.fixture.profile,
    intakeEnabled: () => false,
  });

  await assert.rejects(
    disabledIntake.start(harness.fixture.prerequisite.run.run_id, 'disabled-new-intake'),
    (error: unknown) => (
      error instanceof Error
      && 'reasonCode' in error
      && error.reasonCode
        === 'EF_V2_REAL_PROVIDER_INTAKE_DISABLED'
    ),
  );
  assert.equal((await harness.worker().runOnce()).completed_count, 2);
  assert.equal(harness.client.createCount, 2);
});

async function createHarness(options: { now?: () => string } = {}) {
  const fixture = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [fixture.prerequisite],
  });
  const counters = new Map<string, number>();
  const idGenerator = (kind: string) => {
    const next = (counters.get(kind) ?? 0) + 1;
    counters.set(kind, next);
    return `${kind}-${next}`;
  };
  const now = options.now ?? (() => REAL_PROVIDER_TEST_NOW);
  const intake = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: fixture.bundle }),
    },
    profileResolver: async () => fixture.profile,
    intakeEnabled: () => true,
    now,
    idGenerator,
  });
  await intake.start(fixture.prerequisite.run.run_id, 'real-worker-test');
  const client = new WorkerPaiDlcSdkFake();
  const transport = new ExperimentFoundationAliyunRealProviderTransportV2({
    client,
    resultReader: {
      readExactResult: async ({ job_id, result_object_name }) => {
        const index = Number(job_id.slice('job-'.length)) - 1;
        const cell = fixture.prerequisite.cells[index]!;
        return {
          object_locator: `oss://redacted-results/${job_id}/${result_object_name}`,
          canonical_result_bytes: canonicalizeExperimentV2Json({
            result_envelope_schema: 'ExperimentFoundationProviderResultEnvelope@v1',
            execution_bundle_revision_id:
              cell.task_spec.execution_bundle.execution_bundle_revision_id,
            execution_bundle_revision_hash: cell.task_spec.execution_bundle.content_hash,
            run_id: fixture.prerequisite.run.run_id,
            run_manifest_hash: fixture.prerequisite.run.run_manifest_hash,
            run_cell_id: cell.run_cell.run_cell_id,
            cell_key: cell.run_cell.cell_key,
            training_task_spec_id: cell.task_spec.training_task_spec_id,
            training_task_spec_hash: cell.task_spec.task_spec_hash,
            parser_profile_version: cell.task_spec.io_snapshot.parser_profile_version,
            parser_profile_hash: cell.task_spec.io_snapshot.parser_profile_hash,
            outputs: { diagnostic_only: true },
          }),
        };
      },
    },
  });
  return {
    fixture,
    repository,
    client,
    worker: (overrides: Partial<ConstructorParameters<
      typeof ExperimentFoundationRealProviderCommandV2Worker
    >[0]> = {}) => new ExperimentFoundationRealProviderCommandV2Worker({
      repository,
      transport,
      executionBundleResolver: {
        resolveActiveReadyExact: async () => ({ revision: fixture.bundle }),
      },
      profileResolver: async () => fixture.profile,
      controlDrainEnabled: () => true,
      now,
      idGenerator,
      ...overrides,
    }),
  };
}
