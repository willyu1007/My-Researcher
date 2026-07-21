import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ExperimentFoundationV2TrainingTaskOutputKey,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

import type { ExperimentFoundationExecutionV2Repository } from '../repositories/experiment-foundation-execution-v2.repository.js';
import { InMemoryExperimentFoundationExecutionV2Repository } from '../repositories/in-memory-experiment-foundation-execution-v2-repository.js';
import {
  DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
  DeterministicFakeAliyunPaiDlcTransport,
  type ExperimentFoundationV2FakeProviderResponse,
} from './experiment-foundation-v2-deterministic-fake-provider.js';
import { hashProviderPayloadSemantic } from './experiment-foundation-v2-provider-payload-service.js';
import { ExperimentFoundationExecutionV2Service } from './experiment-foundation-execution-v2-service.js';
import {
  buildPackBExecutionPrerequisite,
  deterministicPackBIdGenerator,
  deterministicPackBWorkerIdGenerator,
  mutablePackBClock,
  passingPackBReadinessRevalidator,
} from '../test-support/experiment-foundation-execution-v2-test-fixture.js';
import { ExperimentFoundationProviderCommandV2Worker } from './experiment-foundation-provider-command-v2-worker.js';

const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};

function createHarness(options: {
  cellCount?: number;
  outputKeys?: ExperimentFoundationV2TrainingTaskOutputKey[];
  transport?: DeterministicFakeAliyunPaiDlcTransport;
} = {}) {
  const prerequisite = buildPackBExecutionPrerequisite({
    cellCount: options.cellCount ?? 1,
  });
  if (options.outputKeys) {
    prerequisite.cells[0]!.task_spec.io_snapshot.output_keys = [...options.outputKeys];
  }
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const clock = mutablePackBClock();
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('worker_harness_service'),
  });
  const transport = options.transport ?? new DeterministicFakeAliyunPaiDlcTransport();
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport,
    leaseOwner: 'pack-b-worker-one',
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('worker_harness_worker'),
  });
  return { prerequisite, repository, clock, service, transport, worker };
}

class DeferredReconcileTransport extends DeterministicFakeAliyunPaiDlcTransport {
  private releaseReconcile!: () => void;
  private signalStarted!: () => void;
  readonly reconcileStarted = new Promise<void>((resolve) => {
    this.signalStarted = resolve;
  });
  private readonly reconcileRelease = new Promise<void>((resolve) => {
    this.releaseReconcile = resolve;
  });

  override async reconcile(
    input: Parameters<DeterministicFakeAliyunPaiDlcTransport['reconcile']>[0],
  ): Promise<unknown> {
    this.signalStarted();
    await this.reconcileRelease;
    return super.reconcile(input);
  }

  resumeReconcile(): void {
    this.releaseReconcile();
  }
}

class DeferredSyncTransport extends DeterministicFakeAliyunPaiDlcTransport {
  private releaseSync!: () => void;
  private signalStarted!: () => void;
  readonly syncStarted = new Promise<void>((resolve) => {
    this.signalStarted = resolve;
  });
  private readonly syncRelease = new Promise<void>((resolve) => {
    this.releaseSync = resolve;
  });

  override async sync(
    input: Parameters<DeterministicFakeAliyunPaiDlcTransport['sync']>[0],
  ): Promise<unknown> {
    this.signalStarted();
    await this.syncRelease;
    return super.sync(input);
  }

  resumeSync(): void {
    this.releaseSync();
  }
}

class DeferredCancelTransport extends DeterministicFakeAliyunPaiDlcTransport {
  private releaseCancel!: () => void;
  private signalStarted!: () => void;
  readonly cancelStarted = new Promise<void>((resolve) => {
    this.signalStarted = resolve;
  });
  private readonly cancelRelease = new Promise<void>((resolve) => {
    this.releaseCancel = resolve;
  });
  private deferFirst = true;

  override async cancel(
    input: Parameters<DeterministicFakeAliyunPaiDlcTransport['cancel']>[0],
  ): Promise<unknown> {
    if (this.deferFirst) {
      this.deferFirst = false;
      this.signalStarted();
      await this.cancelRelease;
    }
    return super.cancel(input);
  }

  resumeCancel(): void {
    this.releaseCancel();
  }
}

class SubstitutedExternalJobRefTransport extends DeterministicFakeAliyunPaiDlcTransport {
  static readonly substitutedRef = 'fake_aliyun_pai_dlc_job_substituted';

  override async sync(
    input: Parameters<DeterministicFakeAliyunPaiDlcTransport['sync']>[0],
  ): Promise<unknown> {
    const valid = await super.sync(input) as ExperimentFoundationV2FakeProviderResponse;
    const { response_hash: _responseHash, ...validBody } = valid;
    const substitutedBody = {
      ...validBody,
      external_job_ref: SubstitutedExternalJobRefTransport.substitutedRef,
    };
    return {
      ...substitutedBody,
      response_hash: hashProviderPayloadSemantic(
        'DeterministicFakeAliyunPaiDlcResponse',
        DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
        substitutedBody,
      ),
    };
  }
}

test('PB07 durable worker runs submit -> sync -> reconcile -> collection -> collect for every exact cell', async () => {
  const harness = createHarness({ cellCount: 2 });
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-worker-golden' },
  );

  const result = await harness.worker.drainUntilIdle();
  const snapshot = harness.repository.snapshot();

  assert.deepEqual(result, {
    claimed_count: 8,
    completed_count: 8,
    released_count: 0,
    terminal_count: 0,
  });
  assert.equal(snapshot.attempts.length, 2);
  assert.ok(snapshot.attempts.every((attempt) => (
    attempt.lifecycle_state === 'succeeded'
    && attempt.state_version === 3
    && attempt.terminal_reason_code === 'simulation_succeeded'
    && attempt.external_job_ref !== null
  )));
  assert.equal(snapshot.commands.length, 8);
  assert.ok(snapshot.commands.every((command) => command.state === 'succeeded'));
  assert.equal(snapshot.collections.length, 2);
  assert.ok(snapshot.collections.every((collection) => (
    collection.collection_state === 'collected'
    && collection.state_version === 1
  )));
  assert.equal(snapshot.outputs.length, 2);
  assert.ok(snapshot.outputs.every((output) => output.output_class === 'diagnostic_only'));
  assert.equal(snapshot.events.length, 12);

  const ledger = harness.transport.getOperationLedger();
  assert.equal(ledger.length, 8);
  for (const attempt of started.execution_attempts) {
    const attemptLedger = ledger.filter(
      (entry) => entry.provider_idempotency_key === attempt.provider_idempotency_key,
    );
    assert.deepEqual(
      attemptLedger.map((entry) => entry.operation),
      ['submit', 'sync', 'reconcile', 'collect'],
    );
    assert.ok(attemptLedger.every((entry) => (
      entry.payload_hash === attempt.provider_payload_hash
      && entry.provider_idempotency_key === attempt.provider_idempotency_key
      && entry.external_job_ref === attemptLedger[0].external_job_ref
      && entry.real_network_request_count === 0
      && entry.create_job_call_count === 0
    )));
  }
  assert.deepEqual(harness.transport.getNetworkCensus(), {
    real_network_request_count: 0,
    create_job_call_count: 0,
  });
});

test('PB08 exact-payload resolution preserves scope drift versus payload conflict', async (context) => {
  for (const scenario of [
    {
      name: 'missing Run prerequisite is durable scope drift',
      expectedReason: 'EXECUTION_SCOPE_DRIFT',
      overrideProperty: 'resolveRunCellPrerequisite',
    },
    {
      name: 'missing immutable payload is durable payload conflict',
      expectedReason: 'PROVIDER_PAYLOAD_CONFLICT',
      overrideProperty: 'findProviderPayload',
    },
  ] as const) {
    await context.test(scenario.name, async () => {
      const harness = createHarness();
      await harness.service.startWorkflowSimulation(
        harness.prerequisite.run.run_id,
        { business_idempotency_key: `pack-b-exact-resolution-${scenario.expectedReason}` },
      );
      const driftedRepository = new Proxy(harness.repository, {
        get(target, property) {
          if (property === scenario.overrideProperty) return async () => null;
          const value = Reflect.get(target, property, target) as unknown;
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as ExperimentFoundationExecutionV2Repository;
      const worker = new ExperimentFoundationProviderCommandV2Worker({
        repository: driftedRepository,
        transport: harness.transport,
        leaseOwner: `pack-b-exact-resolution-${scenario.expectedReason}`,
        now: harness.clock.now,
        idGenerator: deterministicPackBWorkerIdGenerator(
          `exact_resolution_${scenario.expectedReason}`,
        ),
      });

      assert.deepEqual(await worker.runOnce(), {
        claimed_count: 1,
        completed_count: 0,
        released_count: 0,
        terminal_count: 1,
      });
      const snapshot = harness.repository.snapshot();
      assert.equal(snapshot.attempts[0].lifecycle_state, 'failed');
      assert.equal(snapshot.commands[0].state, 'terminal');
      assert.equal(snapshot.commands[0].last_error_code, scenario.expectedReason);
      assert.equal(
        snapshot.events.at(-1)?.event_snapshot.reason_code,
        scenario.expectedReason,
      );
      assert.equal(harness.transport.getOperationLedger().length, 0);
    });
  }
});

test('PB08 worker rejects nested persisted manifest tamper before provider dispatch', async () => {
  const harness = createHarness();
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-worker-manifest-tamper' },
  );
  const tamperedRepository = new Proxy(harness.repository, {
    get(target, property) {
      if (property === 'findProviderPayload') {
        return async (payloadId: string) => {
          const payload = await target.findProviderPayload(payloadId);
          return payload
            ? {
              ...payload,
              redacted_manifest: {
                source_binding: { run_id: 42 },
              },
            }
            : null;
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository: tamperedRepository,
    transport: harness.transport,
    leaseOwner: 'pack-b-manifest-tamper-worker',
    now: harness.clock.now,
  });

  assert.deepEqual(await worker.runOnce(), {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(harness.transport.getOperationLedger().length, 0);
  assert.equal(harness.repository.snapshot().attempts[0]!.lifecycle_state, 'failed');
  assert.equal(
    harness.repository.snapshot().commands[0]!.last_error_code,
    'PROVIDER_PAYLOAD_CONFLICT',
  );
});

test('Pack B worker terminalizes an exhausted Attempt stateVersion before provider dispatch', async () => {
  const harness = createHarness();
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-worker-state-version-exhausted' },
  );
  const exhaustedRepository = new Proxy(harness.repository, {
    get(target, property) {
      if (property === 'findAttempt') {
        return async (attemptId: string) => {
          const attempt = await target.findAttempt(attemptId);
          return attempt ? { ...attempt, state_version: 2_147_483_647 } : null;
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository: exhaustedRepository,
    transport: harness.transport,
    leaseOwner: 'pack-b-state-version-exhausted-worker',
    now: harness.clock.now,
  });

  assert.deepEqual(await worker.runOnce(), {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });
  const snapshot = harness.repository.snapshot();
  assert.equal(harness.transport.getOperationLedger().length, 0);
  assert.equal(snapshot.attempts[0]!.state_version, 0);
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.commands[0]!.state, 'terminal');
  assert.equal(
    snapshot.commands[0]!.last_error_code,
    'EXECUTION_ATTEMPT_STATE_CONFLICT',
  );
});

test('PB06 batched worker uses exact RunCell and payload lookups without full-run scans', async () => {
  const harness = createHarness({ cellCount: 12 });
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-worker-exact-lookup-scale' },
  );
  let exactRunCellLookups = 0;
  let exactPayloadLookups = 0;
  const exactRepository = new Proxy(harness.repository, {
    get(target, property) {
      if (property === 'resolveRunPrerequisite' || property === 'listRunPayloads') {
        return async () => {
          throw new Error(`unexpected full-run lookup: ${String(property)}`);
        };
      }
      if (property === 'resolveRunCellPrerequisite') {
        return async (runId: string, runCellId: string) => {
          exactRunCellLookups += 1;
          return target.resolveRunCellPrerequisite(runId, runCellId);
        };
      }
      if (property === 'findProviderPayload') {
        return async (providerPayloadId: string) => {
          exactPayloadLookups += 1;
          return target.findProviderPayload(providerPayloadId);
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository: exactRepository,
    transport: harness.transport,
    leaseOwner: 'pack-b-exact-lookup-scale-worker',
    now: harness.clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('exact_lookup_scale_worker'),
  });

  const outcome = await worker.runOnce(12);
  assert.equal(outcome.completed_count, 12);
  assert.equal(outcome.terminal_count, 0);
  assert.equal(exactRunCellLookups, 12);
  assert.equal(exactPayloadLookups, 12);
  assert.equal(harness.transport.getOperationLedger().length, 12);
});

test('PB07 worker preserves a non-prefix allowed output key as its exact provisional kind', async () => {
  const harness = createHarness({ outputKeys: ['simulation_collection_log'] });
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-worker-exact-output-kind' },
  );

  const result = await harness.worker.drainUntilIdle();
  assert.equal(result.terminal_count, 0);
  assert.deepEqual(
    harness.repository.snapshot().outputs.map((output) => output.output_kind),
    ['simulation_collection_log'],
  );
});

test('PB09 self-hashed substituted external job ref is rejected without identity leakage', async () => {
  const transport = new SubstitutedExternalJobRefTransport();
  const harness = createHarness({ transport });
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-substituted-external-ref' },
  );
  assert.equal((await harness.worker.runOnce()).completed_count, 1);
  const afterSubmit = harness.repository.snapshot();
  const establishedRef = afterSubmit.attempts[0].external_job_ref;
  const establishedRefHash = afterSubmit.attempts[0].external_job_ref_hash;
  assert.ok(establishedRef);
  assert.ok(establishedRefHash);

  const rejected = await harness.worker.runOnce();
  const final = harness.repository.snapshot();
  assert.deepEqual(rejected, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(final.attempts[0].lifecycle_state, 'failed');
  assert.equal(final.attempts[0].terminal_reason_code, 'provider_response_invalid');
  assert.equal(final.attempts[0].external_job_ref, establishedRef);
  assert.equal(final.attempts[0].external_job_ref_hash, establishedRefHash);
  assert.deepEqual(final.events.map((event) => event.event_type), [
    'created',
    'submitted',
    'failed',
  ]);
  assert.deepEqual(final.commands.map((command) => [command.operation, command.state]), [
    ['submit', 'succeeded'],
    ['sync', 'terminal'],
  ]);
  assert.equal(final.collections.length, 0);
  assert.equal(final.outputs.length, 0);
  assert.equal(
    JSON.stringify(final).includes(SubstitutedExternalJobRefTransport.substitutedRef),
    false,
  );
});

test('PB06 batched worker heartbeats immediately before dispatch and skips an expired later lease', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 2 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const clock = mutablePackBClock();
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('batch_lease_service'),
  });
  await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-batch-lease-fence',
  });

  let firstCommit = true;
  let heartbeatCalls = 0;
  const expiringRepository = new Proxy(repository, {
    get(target, property) {
      if (property === 'heartbeatCommand') {
        return async (
          input: Parameters<ExperimentFoundationExecutionV2Repository['heartbeatCommand']>[0],
        ) => {
          heartbeatCalls += 1;
          return target.heartbeatCommand(input);
        };
      }
      if (property === 'commitCommandOutcome') {
        return async (
          input: Parameters<ExperimentFoundationExecutionV2Repository['commitCommandOutcome']>[0],
        ) => {
          const outcome = await target.commitCommandOutcome(input);
          if (firstCommit) {
            firstCommit = false;
            clock.advance(1_001);
          }
          return outcome;
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const transport = new DeterministicFakeAliyunPaiDlcTransport();
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository: expiringRepository,
    transport,
    leaseOwner: 'pack-b-batch-lease-worker',
    leaseMs: 1_000,
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('batch_lease_worker'),
  });

  const outcome = await worker.runOnce(2);
  const snapshot = repository.snapshot();
  assert.deepEqual(outcome, {
    claimed_count: 2,
    completed_count: 1,
    released_count: 1,
    terminal_count: 0,
  });
  assert.equal(heartbeatCalls, 2);
  assert.equal(transport.getOperationLedger().length, 1);
  assert.equal(
    snapshot.commands.filter((command) => command.operation === 'submit'
      && command.state === 'succeeded').length,
    1,
  );
  assert.equal(
    snapshot.commands.filter((command) => command.operation === 'submit'
      && command.state === 'claimed').length,
    1,
  );

  const reclaimed = await repository.claimCommands({
    lease_owner: 'pack-b-batch-lease-recovery',
    claimed_at: clock.now(),
    lease_expires_at: new Date(Date.parse(clock.now()) + 1_000).toISOString(),
    limit: 1,
    command_kinds: ['submit'],
  });
  assert.equal(reclaimed.length, 1);
  assert.equal(reclaimed[0].lease_owner, 'pack-b-batch-lease-recovery');
});

test('PB08 pre-submit cancellation atomically terminalizes submit with zero provider transport', async () => {
  const harness = createHarness();
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-cancel-before-submit' },
  );
  const attemptId = started.execution_attempts[0].execution_attempt_id;

  const cancelled = await harness.service.cancelExecutionAttempt(attemptId, {
    business_idempotency_key: 'pack-b-cancel-control-001',
    reason_code: 'operator_cancelled',
  });
  const workerResult = await harness.worker.runOnce();
  const snapshot = harness.repository.snapshot();

  assert.equal(cancelled.lifecycle_state, 'cancelled');
  assert.equal(cancelled.terminal_reason_code, 'operator_cancelled');
  assert.deepEqual(workerResult, {
    claimed_count: 0,
    completed_count: 0,
    released_count: 0,
    terminal_count: 0,
  });
  assert.equal(harness.transport.getOperationLedger().length, 0);
  assert.equal(snapshot.attempts[0].lifecycle_state, 'cancelled');
  assert.deepEqual(
    snapshot.events.map((event) => event.event_type),
    ['created', 'cancelled'],
  );
  assert.deepEqual(
    snapshot.commands.map((command) => [command.operation, command.state, command.last_error_code]),
    [
      ['submit', 'terminal', 'cancelled_before_submit'],
      ['cancel', 'succeeded', null],
    ],
  );
  assert.equal(snapshot.collections.length, 0);
  assert.equal(snapshot.outputs.length, 0);
});

test('PB10 cancel during a leased submit persists and converges after submit recovery', async () => {
  const harness = createHarness();
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-cancel-during-submit-lease' },
  );
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  const claimedAt = harness.clock.now();
  const leasedSubmit = (await harness.repository.claimCommands({
    lease_owner: 'crashed-submit-worker',
    claimed_at: claimedAt,
    lease_expires_at: new Date(Date.parse(claimedAt) + 30_000).toISOString(),
    limit: 1,
    command_kinds: ['submit'],
  }))[0]!;
  assert.equal(leasedSubmit.operation, 'submit');

  const request = {
    business_idempotency_key: 'pack-b-cancel-during-submit-control',
    reason_code: 'operator_cancelled' as const,
  };
  const pending = await harness.service.cancelExecutionAttempt(attemptId, request);
  const replay = await harness.service.cancelExecutionAttempt(attemptId, request);
  const afterIntent = harness.repository.snapshot();
  assert.equal(pending.lifecycle_state, 'prepared');
  assert.equal(replay.lifecycle_state, 'prepared');
  assert.deepEqual(afterIntent.events.map((event) => event.event_type), ['created']);
  assert.deepEqual(
    afterIntent.commands.map((command) => [
      command.command_sequence,
      command.operation,
      command.state,
    ]),
    [
      [1, 'submit', 'claimed'],
      [2, 'cancel', 'pending'],
    ],
  );

  assert.deepEqual(await harness.worker.runOnce(), {
    claimed_count: 0,
    completed_count: 0,
    released_count: 0,
    terminal_count: 0,
  });
  harness.clock.advance(30_001);
  const recoveredSubmit = await harness.worker.runOnce();
  assert.equal(recoveredSubmit.completed_count, 1);
  const afterSubmit = harness.repository.snapshot();
  assert.equal(afterSubmit.attempts[0].lifecycle_state, 'submitted');
  assert.deepEqual(
    afterSubmit.commands.map((command) => [command.command_sequence, command.operation]),
    [[1, 'submit'], [2, 'cancel'], [3, 'sync']],
  );

  const cancelled = await harness.worker.runOnce();
  const final = harness.repository.snapshot();
  assert.deepEqual(cancelled, {
    claimed_count: 2,
    completed_count: 1,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(final.attempts[0].lifecycle_state, 'cancelled');
  assert.deepEqual(
    final.events.map((event) => event.event_type),
    ['created', 'submitted', 'cancelled'],
  );
  assert.deepEqual(
    harness.transport.getOperationLedger().map((entry) => entry.operation),
    ['submit', 'cancel'],
  );
  assert.equal(final.commands.filter((command) => command.operation === 'cancel').length, 1);
});

test('PB10 running cancellation is claimed before an older pending reconcile', async () => {
  const harness = createHarness();
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-running-cancel' },
  );
  await harness.worker.runOnce();
  await harness.worker.runOnce();
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  assert.equal((await harness.repository.findAttempt(attemptId))?.lifecycle_state, 'running');

  await harness.service.cancelExecutionAttempt(attemptId, {
    business_idempotency_key: 'pack-b-running-cancel-control',
    reason_code: 'operator_cancelled',
  });
  const outcome = await harness.worker.runOnce();
  const snapshot = harness.repository.snapshot();

  assert.equal(outcome.completed_count, 1);
  assert.equal(outcome.terminal_count, 1);
  assert.equal(snapshot.attempts[0].lifecycle_state, 'cancelled');
  assert.equal(snapshot.attempts[0].terminal_reason_code, 'operator_cancelled');
  assert.deepEqual(
    harness.transport.getOperationLedger().map((entry) => entry.operation),
    ['submit', 'sync', 'cancel'],
  );
  assert.equal(
    snapshot.commands.find((command) => command.operation === 'reconcile')?.last_error_code,
    'EXECUTION_ATTEMPT_STATE_CONFLICT',
  );
  assert.equal(snapshot.collections.length, 0);
});

test('PB10 durable running cancel intent wins over an already leased reconcile before E4', async () => {
  const transport = new DeferredReconcileTransport();
  const harness = createHarness({ transport });
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-running-cancel-reconcile-race' },
  );
  await harness.worker.runOnce();
  await harness.worker.runOnce();
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  assert.equal((await harness.repository.findAttempt(attemptId))?.lifecycle_state, 'running');

  const reconcilePass = harness.worker.runOnce();
  await transport.reconcileStarted;
  const cancelIntent = await harness.service.cancelExecutionAttempt(attemptId, {
    business_idempotency_key: 'pack-b-running-cancel-race-control',
    reason_code: 'operator_cancelled',
  });
  assert.equal(cancelIntent.lifecycle_state, 'running');
  transport.resumeReconcile();
  const reconcileOutcome = await reconcilePass;
  assert.deepEqual(reconcileOutcome, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });

  const cancelOutcome = await harness.worker.runOnce();
  const snapshot = harness.repository.snapshot();
  assert.equal(cancelOutcome.completed_count, 1);
  assert.equal(snapshot.attempts[0].lifecycle_state, 'cancelled');
  assert.equal(snapshot.collections.length, 0);
  assert.equal(snapshot.outputs.length, 0);
  assert.equal(
    snapshot.commands.find((command) => command.operation === 'reconcile')?.last_error_code,
    'EXECUTION_ATTEMPT_STATE_CONFLICT',
  );
  assert.deepEqual(
    transport.getOperationLedger().map((entry) => entry.operation),
    ['submit', 'sync', 'reconcile', 'cancel'],
  );
});

test('PB10 a leased sync that loses to cancel terminalizes immediately without lease-expiry delay', async () => {
  const syncTransport = new DeferredSyncTransport();
  const harness = createHarness({ transport: syncTransport });
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-submitted-cancel-sync-race' },
  );
  await harness.worker.runOnce();
  const attemptId = started.execution_attempts[0].execution_attempt_id;

  const syncPass = harness.worker.runOnce();
  await syncTransport.syncStarted;
  await harness.service.cancelExecutionAttempt(attemptId, {
    business_idempotency_key: 'pack-b-submitted-cancel-sync-control',
    reason_code: 'operator_cancelled',
  });
  const cancelTransport = new DeterministicFakeAliyunPaiDlcTransport();
  const cancelWorker = new ExperimentFoundationProviderCommandV2Worker({
    repository: harness.repository,
    transport: cancelTransport,
    leaseOwner: 'pack-b-cancel-race-worker',
    now: harness.clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('cancel_race_worker'),
  });
  const cancelOutcome = await cancelWorker.runOnce();
  assert.equal(cancelOutcome.completed_count, 1);
  assert.equal((await harness.repository.findAttempt(attemptId))?.lifecycle_state, 'cancelled');

  syncTransport.resumeSync();
  const syncOutcome = await syncPass;
  const snapshot = harness.repository.snapshot();
  assert.deepEqual(syncOutcome, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(
    snapshot.commands.find((command) => command.operation === 'sync')?.last_error_code,
    'EXECUTION_ATTEMPT_STATE_CONFLICT',
  );
  assert.equal(snapshot.collections.length, 0);
  assert.deepEqual(
    syncTransport.getOperationLedger().map((entry) => entry.operation),
    ['submit', 'sync'],
  );
  assert.deepEqual(
    cancelTransport.getOperationLedger().map((entry) => entry.operation),
    ['cancel'],
  );
});

test('PB10 a leased cancel that loses to sync requeues immediately and still wins before E4', async () => {
  const harness = createHarness();
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-cancel-loses-sync-cas' },
  );
  await harness.worker.runOnce();
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  await harness.service.cancelExecutionAttempt(attemptId, {
    business_idempotency_key: 'pack-b-cancel-loses-sync-control',
    reason_code: 'operator_cancelled',
  });

  const cancelTransport = new DeferredCancelTransport();
  const cancelWorker = new ExperimentFoundationProviderCommandV2Worker({
    repository: harness.repository,
    transport: cancelTransport,
    leaseOwner: 'pack-b-deferred-cancel-worker',
    now: harness.clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('deferred_cancel_worker'),
  });
  const cancelPass = cancelWorker.runOnce(1);
  await cancelTransport.cancelStarted;
  const syncOutcome = await harness.worker.runOnce();
  assert.equal(syncOutcome.completed_count, 1);
  assert.equal((await harness.repository.findAttempt(attemptId))?.lifecycle_state, 'running');

  cancelTransport.resumeCancel();
  assert.deepEqual(await cancelPass, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 1,
    terminal_count: 0,
  });
  const retryOutcome = await cancelWorker.runOnce();
  const snapshot = harness.repository.snapshot();
  assert.deepEqual(retryOutcome, {
    claimed_count: 2,
    completed_count: 1,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(snapshot.attempts[0].lifecycle_state, 'cancelled');
  assert.equal(snapshot.collections.length, 0);
  assert.equal(
    snapshot.commands.find((command) => command.operation === 'cancel')?.attempt_count,
    2,
  );
  assert.deepEqual(
    cancelTransport.getOperationLedger().map((entry) => entry.operation),
    ['cancel', 'cancel'],
  );
});

test('PB09 accepted-response-lost retry reuses one payload and one provider job identity', async () => {
  const transport = new DeterministicFakeAliyunPaiDlcTransport([{
    operation: 'submit',
    invocation: 1,
    kind: 'retryable_after_acceptance',
  }]);
  const harness = createHarness({ transport });
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-response-lost' },
  );
  const attempt = started.execution_attempts[0];

  const firstPass = await harness.worker.runOnce();
  const afterLostResponse = harness.repository.snapshot();
  assert.deepEqual(firstPass, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 1,
    terminal_count: 0,
  });
  assert.equal(afterLostResponse.attempts[0].lifecycle_state, 'prepared');
  assert.deepEqual(
    afterLostResponse.events.map((event) => event.event_type),
    ['created'],
  );
  assert.equal(afterLostResponse.commands[0].state, 'pending');
  assert.equal(afterLostResponse.commands[0].attempt_count, 1);

  harness.clock.advance(1_001);
  const replayPass = await harness.worker.runOnce();
  assert.equal(replayPass.completed_count, 1);
  await harness.worker.drainUntilIdle();

  const final = harness.repository.snapshot();
  const submitLedger = transport.getOperationLedger().filter(
    (entry) => entry.operation === 'submit',
  );
  assert.equal(submitLedger.length, 2);
  assert.deepEqual(
    submitLedger.map((entry) => entry.outcome),
    ['fault_after_acceptance', 'responded'],
  );
  assert.ok(submitLedger.every((entry) => (
    entry.provider_idempotency_key === attempt.provider_idempotency_key
    && entry.payload_hash === attempt.provider_payload_hash
    && entry.external_job_ref === submitLedger[0].external_job_ref
  )));
  assert.equal(final.payloads.length, 1);
  assert.equal(final.attempts.length, 1);
  assert.equal(final.attempts[0].lifecycle_state, 'succeeded');
  assert.equal(final.attempts[0].external_job_ref, submitLedger[0].external_job_ref);
  assert.equal(
    final.events.filter((event) => event.event_type === 'submitted').length,
    1,
  );
  assert.equal(
    final.commands.find((command) => command.operation === 'submit')?.attempt_count,
    2,
  );
});

test('PB06 manual reconcile and automatic reconcile have distinct durable command identities', async () => {
  const harness = createHarness();
  const started = await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-manual-reconcile-command-hash' },
  );
  await harness.worker.runOnce();
  await harness.worker.runOnce();
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  assert.equal((await harness.repository.findAttempt(attemptId))?.lifecycle_state, 'running');
  await harness.service.reconcileExecutionAttempt(attemptId, {
    business_idempotency_key: 'operator-requested-reconcile',
    reason_code: 'manual_reconcile',
  });

  await harness.worker.drainUntilIdle();
  const snapshot = harness.repository.snapshot();
  const reconciles = snapshot.commands.filter((command) => command.operation === 'reconcile');
  assert.equal(reconciles.length, 2);
  assert.equal(new Set(reconciles.map((command) => command.command_hash)).size, 2);
  assert.equal(new Set(reconciles.map((command) => command.provider_idempotency_key)).size, 2);
  assert.deepEqual(
    reconciles.map((command) => command.state).sort(),
    ['succeeded', 'terminal'],
  );
  assert.equal(snapshot.attempts[0].lifecycle_state, 'succeeded');
  assert.equal(snapshot.collections[0].collection_state, 'collected');
  assert.equal(snapshot.outputs.length, 1);
});

test('PB10 malformed provider response has no partial lifecycle write and recovers after lease expiry', async () => {
  const transport = new DeterministicFakeAliyunPaiDlcTransport([
    { operation: 'submit', invocation: 1, kind: 'malformed_response' },
    { operation: 'submit', invocation: 2, kind: 'malformed_response' },
  ]);
  const harness = createHarness({ transport });
  await harness.service.startWorkflowSimulation(
    harness.prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-malformed-response' },
  );
  harness.repository.failNext(
    'commitCommandOutcome',
    new Error('INJECTED_TERMINAL_COMMIT_CRASH'),
  );

  await assert.rejects(
    harness.worker.runOnce(),
    /INJECTED_TERMINAL_COMMIT_CRASH/,
  );
  const afterCrash = harness.repository.snapshot();
  assert.equal(afterCrash.attempts[0].lifecycle_state, 'prepared');
  assert.equal(afterCrash.attempts[0].state_version, 0);
  assert.equal(afterCrash.attempts[0].external_job_ref, null);
  assert.deepEqual(afterCrash.events.map((event) => event.event_type), ['created']);
  assert.equal(afterCrash.commands.length, 1);
  assert.equal(afterCrash.commands[0].state, 'claimed');
  assert.equal(afterCrash.collections.length, 0);
  assert.equal(afterCrash.outputs.length, 0);

  harness.clock.advance(30_001);
  const recoveryWorker = new ExperimentFoundationProviderCommandV2Worker({
    repository: harness.repository,
    transport,
    leaseOwner: 'pack-b-worker-recovery',
    now: harness.clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('worker_recovery'),
  });
  const recovered = await recoveryWorker.runOnce();
  const terminal = harness.repository.snapshot();

  assert.deepEqual(recovered, {
    claimed_count: 1,
    completed_count: 0,
    released_count: 0,
    terminal_count: 1,
  });
  assert.equal(terminal.attempts[0].lifecycle_state, 'failed');
  assert.equal(terminal.attempts[0].state_version, 1);
  assert.equal(terminal.attempts[0].external_job_ref, null);
  assert.deepEqual(
    terminal.events.map((event) => event.event_type),
    ['created', 'failed'],
  );
  assert.equal(terminal.commands.length, 1);
  assert.equal(terminal.commands[0].state, 'terminal');
  assert.equal(terminal.commands[0].last_error_code, 'PROVIDER_RESPONSE_INVALID');
  assert.equal(terminal.collections.length, 0);
  assert.equal(terminal.outputs.length, 0);
});

test('PB15 committed commands keep draining after the branch head advances', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const clock = mutablePackBClock();
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('head_advance_service'),
  });
  await service.startWorkflowSimulation(
    prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-committed-before-head-advance' },
  );

  repository.seedPrerequisite({
    ...prerequisite,
    latest_branch_head_acknowledgement: {
      ...prerequisite.latest_branch_head_acknowledgement,
      inbox_id: 'ef_inbox_v2_newer_branch_head',
      event_id: 'pi_outbox_v2_newer_branch_head',
      event_payload_hash: `sha256:${'f'.repeat(64)}`,
      work_order_revision_id: 'pi_revision_v2_newer',
      work_order_revision_hash: `sha256:${'e'.repeat(64)}`,
      revision_sequence: prerequisite.run.external_pi_branch_revision_sequence + 1,
      run_id: 'ef_run_v2_newer',
      run_manifest_hash: `sha256:${'d'.repeat(64)}`,
    },
  });
  const transport = new DeterministicFakeAliyunPaiDlcTransport();
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport,
    leaseOwner: 'pack-b-worker-after-head-advance',
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('head_advance_worker'),
  });

  const drained = await worker.drainUntilIdle();
  const snapshot = repository.snapshot();
  assert.equal(drained.terminal_count, 0);
  assert.equal(snapshot.attempts[0].lifecycle_state, 'succeeded');
  assert.equal(snapshot.collections[0].collection_state, 'collected');
  assert.ok(snapshot.commands.every((command) => command.state === 'succeeded'));
  assert.equal(transport.getOperationLedger().length, 4);
});
