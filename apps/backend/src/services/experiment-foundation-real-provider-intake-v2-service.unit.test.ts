import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryExperimentFoundationExecutionV2Repository,
} from '../repositories/in-memory-experiment-foundation-execution-v2-repository.js';
import {
  ExperimentFoundationRealProviderIntakeV2Error,
  ExperimentFoundationRealProviderIntakeV2Service,
} from './experiment-foundation-real-provider-intake-v2-service.js';
import {
  createRealProviderV2TestFixture,
  REAL_PROVIDER_TEST_NOW,
} from './experiment-foundation-real-provider-v2-test-fixture.js';

test('M7-04 capability-off performs zero repository writes and dependency reads', async () => {
  const { prerequisite, bundle, profile } = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [prerequisite],
  });
  let bundleReads = 0;
  let profileReads = 0;
  const service = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => {
        bundleReads += 1;
        return { revision: bundle };
      },
    },
    profileResolver: async () => {
      profileReads += 1;
      return profile;
    },
    intakeEnabled: () => false,
  });

  await assert.rejects(
    () => service.start(prerequisite.run.run_id, 'real-workflow-1'),
    (error) => error instanceof ExperimentFoundationRealProviderIntakeV2Error
      && error.reasonCode === 'EF_V2_REAL_PROVIDER_INTAKE_DISABLED',
  );
  assert.equal(bundleReads, 0);
  assert.equal(profileReads, 0);
  assert.deepEqual(repository.snapshot(), {
    payloads: [], attempts: [], events: [], commands: [], collections: [], outputs: [], start_receipts: [],
  });
});

test('M7-02/03 real intake atomically creates two exact real tuples and replays without duplicates', async () => {
  const { prerequisite, bundle, profile } = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [prerequisite],
  });
  const counters = new Map<string, number>();
  const service = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: bundle }),
    },
    profileResolver: async () => profile,
    intakeEnabled: () => true,
    now: () => REAL_PROVIDER_TEST_NOW,
    idGenerator: (kind) => {
      const next = (counters.get(kind) ?? 0) + 1;
      counters.set(kind, next);
      return `${kind}-${next}`;
    },
  });

  const started = await service.start(prerequisite.run.run_id, 'real-workflow-1');
  const replay = await service.start(prerequisite.run.run_id, 'real-workflow-1');
  const snapshot = repository.snapshot();

  assert.equal(started.replayed, false);
  assert.equal(replay.replayed, true);
  assert.equal(snapshot.payloads.length, 2);
  assert.equal(snapshot.attempts.length, 2);
  assert.equal(snapshot.events.length, 2);
  assert.equal(snapshot.commands.length, 2);
  assert.equal(snapshot.start_receipts.length, 1);
  assert.deepEqual(
    snapshot.attempts.map((attempt) => [attempt.cell_key, attempt.execution_mode, attempt.provenance]),
    [
      ['cell-a', 'real_provider', 'real_provider'],
      ['cell-b', 'real_provider', 'real_provider'],
    ],
  );
  assert.ok(snapshot.payloads.every((payload) => (
    payload.payload_schema === 'AliyunPaiDlcCreateJobPayload@v1'
    && payload.adapter_identity === 'aliyun_pai_dlc_official_sdk@v1'
    && payload.execution_mode === 'real_provider'
    && payload.provenance === 'real_provider'
  )));
  const persistedJson = JSON.stringify(snapshot.payloads);
  assert.equal(persistedJson.includes(profile.workspace_id), false);
  assert.equal(persistedJson.includes(bundle.revision_content.container_image.image_ref), false);
  assert.equal(persistedJson.includes(bundle.revision_content.code_artifact.artifact_ref), false);
  assert.equal(persistedJson.includes(profile.workload_binding.runtime_role_arn), false);
});

test('QR-2 production-default intake ids are deterministic and distinct across cells', async () => {
  const [left, right] = await Promise.all([
    startWithProductionDefaultIds(),
    startWithProductionDefaultIds(),
  ]);
  const projectAuthority = (snapshot: typeof left) => ({
    payloads: snapshot.payloads.map((payload) => ({
      id: payload.id,
      materialization_key: payload.materialization_key,
      payload_hash: payload.payload_hash,
    })),
    attempts: snapshot.attempts.map((attempt) => ({
      id: attempt.id,
      provider_payload_id: attempt.provider_payload_id,
      provider_payload_hash: attempt.provider_payload_hash,
      provider_idempotency_key: attempt.provider_idempotency_key,
      workflow_request_hash: attempt.workflow_request_hash,
    })),
    events: snapshot.events.map((event) => ({
      id: event.id,
      event_hash: event.event_hash,
    })),
    commands: snapshot.commands.map((command) => ({
      id: command.id,
      command_hash: command.command_hash,
    })),
  });

  assert.deepEqual(projectAuthority(left), projectAuthority(right));
  assert.equal(new Set(left.payloads.map(({ id }) => id)).size, 2);
  assert.equal(new Set(left.attempts.map(({ id }) => id)).size, 2);
  assert.equal(new Set(left.events.map(({ id }) => id)).size, 2);
  assert.equal(new Set(left.commands.map(({ id }) => id)).size, 2);
  assert.ok(left.payloads.every(({ id }) => /^ef_v2_real_payload_[a-f0-9]{40}$/.test(id)));
  assert.ok(left.attempts.every(({ id }) => /^ef_v2_real_attempt_[a-f0-9]{40}$/.test(id)));
  assert.ok(left.events.every(({ id }) => /^ef_v2_real_event_[a-f0-9]{40}$/.test(id)));
  assert.ok(left.commands.every(({ id }) => /^ef_v2_real_command_[a-f0-9]{40}$/.test(id)));
  assert.ok(left.attempts.every(
    (attempt) => attempt.provider_idempotency_key === `${attempt.id}:submit:1`,
  ));
});

test('M7-05 repository rejects a mixed real payload/simulation Attempt tuple atomically', async () => {
  const { prerequisite, bundle, profile } = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [prerequisite],
  });
  let sequence = 0;
  const service = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: bundle }),
    },
    profileResolver: async () => profile,
    intakeEnabled: () => true,
    now: () => REAL_PROVIDER_TEST_NOW,
    idGenerator: (kind) => `${kind}-${sequence += 1}`,
  });
  const originalStart = repository.startRealProviderExecution.bind(repository);
  repository.startRealProviderExecution = async (input) => originalStart({
    ...input,
    attempts: input.attempts.map((attempt, index) => index === 0
      ? {
        ...attempt,
        execution_mode: 'simulation',
        provenance: 'non_production_fake_provider',
      }
      : attempt),
  });

  await assert.rejects(
    () => service.start(prerequisite.run.run_id, 'real-workflow-mixed'),
    (error) => error instanceof ExperimentFoundationRealProviderIntakeV2Error
      && error.reasonCode === 'EXECUTION_SCOPE_DRIFT',
  );
  assert.equal(repository.snapshot().payloads.length, 0);
  assert.equal(repository.snapshot().attempts.length, 0);
});

async function startWithProductionDefaultIds() {
  const { prerequisite, bundle, profile } = createRealProviderV2TestFixture();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    realProviderPrerequisites: [prerequisite],
  });
  const service = new ExperimentFoundationRealProviderIntakeV2Service({
    repository,
    cycleClosureLookup: { isCycleClosed: async () => false },
    executionBundleResolver: {
      resolveActiveReadyExact: async () => ({ revision: bundle }),
    },
    profileResolver: async () => profile,
    intakeEnabled: () => true,
    now: () => REAL_PROVIDER_TEST_NOW,
  });

  await service.start(prerequisite.run.run_id, 'qr-2-production-default-intake');
  return repository.snapshot();
}
