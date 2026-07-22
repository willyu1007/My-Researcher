import assert from 'node:assert/strict';
import test from 'node:test';

import type { ExperimentFoundationExecutionReasonCodeV2 } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentFoundationExecutionV2ConstraintError,
  ExperimentFoundationExecutionV2Repository,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import { InMemoryExperimentFoundationExecutionV2Repository } from '../repositories/in-memory-experiment-foundation-execution-v2-repository.js';
import { InMemoryPaperImplementationValidationCycleClosureV2Lookup } from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
import { DeterministicFakeAliyunPaiDlcTransport } from './experiment-foundation-v2-deterministic-fake-provider.js';
import {
  createProviderCommandV2Record,
  ExperimentFoundationExecutionV2Service,
  type ExperimentFoundationExecutionV2ReadinessRevalidator,
} from './experiment-foundation-execution-v2-service.js';
import {
  buildPackBExecutionPrerequisite,
  deterministicPackBIdGenerator,
  deterministicPackBWorkerIdGenerator,
  mutablePackBClock,
  packBTestHash,
  passingPackBReadinessRevalidator,
} from '../test-support/experiment-foundation-execution-v2-test-fixture.js';
import { ExperimentFoundationProviderCommandV2Worker } from './experiment-foundation-provider-command-v2-worker.js';

const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};

function assertAppReason(reasonCode: string) {
  return (error: unknown): boolean => (
    error instanceof AppError && error.details?.reason_code === reasonCode
  );
}

test('ProviderCommand authoring closes cancellation reason semantics before persistence', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    idGenerator: deterministicPackBIdGenerator('command_reason'),
  });
  await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'command-reason-start',
  });
  const attempt = repository.snapshot().attempts[0];
  assert.ok(attempt);
  const base = {
    id: 'command-reason-test',
    attempt,
    sequence: 2,
    providerIdempotencyKey: 'command-reason-provider-key',
    externalJobRef: null,
    collectionAttemptId: null,
    now: '2026-07-15T00:00:00.000Z',
  };

  assert.equal(createProviderCommandV2Record({
    ...base,
    operation: 'cancel',
    cancellationReason: 'operator_cancelled',
  }).command_snapshot.cancellation_reason, 'operator_cancelled');
  assert.equal(createProviderCommandV2Record({
    ...base,
    operation: 'sync',
    cancellationReason: null,
  }).command_snapshot.cancellation_reason, null);
  for (const input of [
    { operation: 'cancel' as const, cancellationReason: null },
    { operation: 'cancel' as const, cancellationReason: 'changed_reason' },
    { operation: 'submit' as const, cancellationReason: 'operator_cancelled' },
  ]) {
    assert.throws(
      () => createProviderCommandV2Record({ ...base, ...input }),
      assertAppReason('PROVIDER_RESPONSE_INVALID'),
    );
  }
});

test('PB02 capability-off rejects before prerequisite/readiness and writes nothing', async () => {
  const prerequisite = buildPackBExecutionPrerequisite();
  let prerequisiteCalls = 0;
  let readinessCalls = 0;
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisiteResolver: async () => {
      prerequisiteCalls += 1;
      return prerequisite;
    },
  });
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite, () => {
      readinessCalls += 1;
    }),
    intakeEnabled: () => false,
    idGenerator: deterministicPackBIdGenerator('capability_off'),
  });

  await assert.rejects(
    service.startWorkflowSimulation(prerequisite.run.run_id, {
      business_idempotency_key: 'pack-b-capability-off',
    }),
    assertAppReason('EF_V2_WORKFLOW_SIMULATION_DISABLED'),
  );
  assert.equal(prerequisiteCalls, 0);
  assert.equal(readinessCalls, 0);
  assert.deepEqual(repository.snapshot(), {
    payloads: [],
    attempts: [],
    events: [],
    commands: [],
    collections: [],
    outputs: [],
    start_receipts: [],
  });
});

test('closed-Cycle seal blocks workflow simulation and Attempt creation with zero writes', async () => {
  const prerequisite = buildPackBExecutionPrerequisite();
  let readinessCalls = 0;
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite, () => {
      readinessCalls += 1;
    }),
    intakeEnabled: () => true,
    cycleClosureLookup: new InMemoryPaperImplementationValidationCycleClosureV2Lookup([
      prerequisite.validation_cycle_id,
    ]),
    idGenerator: deterministicPackBIdGenerator('closed_cycle'),
  });

  await assert.rejects(
    service.startWorkflowSimulation(prerequisite.run.run_id, {
      business_idempotency_key: 'closed-cycle-start',
    }),
    assertAppReason('CYCLE_ALREADY_CLOSED'),
  );
  assert.equal(readinessCalls, 0);
  assert.deepEqual(repository.snapshot(), {
    payloads: [],
    attempts: [],
    events: [],
    commands: [],
    collections: [],
    outputs: [],
    start_receipts: [],
  });
});

test('Pack B public reads map persisted lineage integrity failures to stable AppError reasons', async () => {
  const prerequisite = buildPackBExecutionPrerequisite();
  const baseRepository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const repository = new Proxy(baseRepository, {
    get(target, property) {
      if (property === 'resolveRunPrerequisite') {
        return async () => {
          throw new ExperimentFoundationExecutionV2ConstraintError(
            'EXECUTION_SCOPE_DRIFT',
            'stored Run materialization canonical hash mismatch',
          );
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
  });

  await assert.rejects(
    service.startWorkflowSimulation(prerequisite.run.run_id, {
      business_idempotency_key: 'pack-b-persisted-integrity-failure',
    }),
    (error) => error instanceof AppError
      && error.statusCode === 422
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.details?.reason_code === 'EXECUTION_SCOPE_DRIFT',
  );
  await assert.rejects(
    service.getWorkflowSimulationStatus(prerequisite.run.run_id),
    assertAppReason('EXECUTION_SCOPE_DRIFT'),
  );
  assert.deepEqual(baseRepository.snapshot(), {
    payloads: [],
    attempts: [],
    events: [],
    commands: [],
    collections: [],
    outputs: [],
    start_receipts: [],
  });
});

test('PB03 exact current-head and readiness drift fail closed with zero E1 writes', async (t) => {
  await t.test('latest branch-head acknowledgement drift', async () => {
    const prerequisite = buildPackBExecutionPrerequisite();
    prerequisite.latest_branch_head_acknowledgement = {
      ...prerequisite.latest_branch_head_acknowledgement,
      event_payload_hash: packBTestHash('9'),
    };
    const repository = new InMemoryExperimentFoundationExecutionV2Repository({
      prerequisites: [prerequisite],
    });
    let readinessCalls = 0;
    const service = new ExperimentFoundationExecutionV2Service({
      repository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessRevalidator: passingPackBReadinessRevalidator(prerequisite, () => {
        readinessCalls += 1;
      }),
      intakeEnabled: () => true,
    });

    await assert.rejects(
      service.startWorkflowSimulation(prerequisite.run.run_id, {
        business_idempotency_key: 'pack-b-head-drift',
      }),
      assertAppReason('EXECUTION_RUN_NOT_CURRENT_HEAD'),
    );
    assert.equal(readinessCalls, 0);
    assert.equal(repository.snapshot().attempts.length, 0);
  });

  await t.test('exact readiness attestation identity drift', async () => {
    const prerequisite = buildPackBExecutionPrerequisite();
    const repository = new InMemoryExperimentFoundationExecutionV2Repository({
      prerequisites: [prerequisite],
    });
    const driftedRevalidator: ExperimentFoundationExecutionV2ReadinessRevalidator = {
      async revalidateReadiness() {
        return {
          attestation: {
            status: 'passed',
            attestation_hash: packBTestHash('9'),
            evaluator_profile_version: prerequisite.readiness.evaluator_profile_version,
            evaluator_profile_hash: prerequisite.readiness.evaluator_profile_hash,
            dependency_manifest_hash: prerequisite.readiness.dependency_manifest_hash,
          },
        };
      },
    };
    const service = new ExperimentFoundationExecutionV2Service({
      repository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessRevalidator: driftedRevalidator,
      intakeEnabled: () => true,
    });

    await assert.rejects(
      service.startWorkflowSimulation(prerequisite.run.run_id, {
        business_idempotency_key: 'pack-b-readiness-drift',
      }),
      assertAppReason('EXECUTION_READINESS_DRIFT'),
    );
    assert.equal(repository.snapshot().attempts.length, 0);
    assert.equal(repository.snapshot().start_receipts.length, 0);
  });
});

test('PB03 invalid TaskSpec output contracts fail before E1 writes and provider transport', async () => {
  for (const [label, outputKeys] of [
    ['four outputs', [
      'simulation_lifecycle_trace',
      'simulation_provider_metadata',
      'simulation_collection_log',
      'simulation_lifecycle_trace',
    ]],
    ['unknown output', ['unknown_diagnostic']],
  ] as const) {
    const prerequisite = buildPackBExecutionPrerequisite();
    (prerequisite.cells[0]!.task_spec.io_snapshot as { output_keys: string[] }).output_keys =
      [...outputKeys];
    const repository = new InMemoryExperimentFoundationExecutionV2Repository({
      prerequisites: [prerequisite],
    });
    const transport = new DeterministicFakeAliyunPaiDlcTransport();
    const service = new ExperimentFoundationExecutionV2Service({
      repository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
      intakeEnabled: () => true,
    });

    await assert.rejects(
      service.startWorkflowSimulation(prerequisite.run.run_id, {
        business_idempotency_key: `pack-b-invalid-outputs-${label.replaceAll(' ', '-')}`,
      }),
      assertAppReason('PROVIDER_PAYLOAD_INVALID'),
      label,
    );
    assert.deepEqual(repository.snapshot(), {
      payloads: [],
      attempts: [],
      events: [],
      commands: [],
      collections: [],
      outputs: [],
      start_receipts: [],
    }, label);
    assert.equal(transport.getOperationLedger().length, 0, label);
    assert.deepEqual(transport.getNetworkCensus(), {
      real_network_request_count: 0,
      create_job_call_count: 0,
    }, label);
  }
});

test('PB04 E1 same-key replay converges without duplicate payload, Attempt, event, or command', async () => {
  const prerequisite = buildPackBExecutionPrerequisite();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    idGenerator: deterministicPackBIdGenerator('same_key'),
  });
  const request = { business_idempotency_key: 'pack-b-e1-same-key' };

  const first = await service.startWorkflowSimulation(prerequisite.run.run_id, request);
  const firstSnapshot = repository.snapshot();
  const replay = await service.startWorkflowSimulation(prerequisite.run.run_id, request);
  const replaySnapshot = repository.snapshot();

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(
    replay.execution_attempts.map((attempt) => attempt.execution_attempt_id),
    first.execution_attempts.map((attempt) => attempt.execution_attempt_id),
  );
  assert.deepEqual(replaySnapshot, firstSnapshot);
  assert.equal(firstSnapshot.payloads.length, prerequisite.cells.length);
  assert.equal(firstSnapshot.attempts.length, prerequisite.cells.length);
  assert.equal(firstSnapshot.events.length, prerequisite.cells.length);
  assert.equal(firstSnapshot.commands.length, prerequisite.cells.length);
  assert.equal(firstSnapshot.start_receipts.length, 1);
});

test('workflow simulation exact idempotency-key replay converges after Cycle closure', async () => {
  const prerequisite = buildPackBExecutionPrerequisite();
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  let closed = false;
  let readinessCalls = 0;
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: { async isCycleClosed() { return closed; } },
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite, () => {
      readinessCalls += 1;
    }),
    intakeEnabled: () => true,
    idGenerator: deterministicPackBIdGenerator('closed_replay'),
  });
  const request = { business_idempotency_key: 'pack-b-e1-closed-replay' };
  const first = await service.startWorkflowSimulation(prerequisite.run.run_id, request);
  const before = repository.snapshot();

  closed = true;
  const replay = await service.startWorkflowSimulation(prerequisite.run.run_id, request);

  assert.equal(first.replayed, false);
  assert.equal(replay.replayed, true);
  assert.deepEqual(
    replay.execution_attempts.map((attempt) => attempt.execution_attempt_id),
    first.execution_attempts.map((attempt) => attempt.execution_attempt_id),
  );
  assert.equal(readinessCalls, 1, 'replay does not re-run mutable readiness authority');
  assert.deepEqual(repository.snapshot(), before);
});

test('PB04 replay rejects a malformed nested persisted redacted manifest with zero writes', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const request = { business_idempotency_key: 'pack-b-manifest-tamper-replay' };
  const initialService = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    idGenerator: deterministicPackBIdGenerator('manifest_tamper_initial'),
  });
  await initialService.startWorkflowSimulation(prerequisite.run.run_id, request);
  const beforeReplay = repository.snapshot();
  const exactReplay = await repository.findWorkflowSimulationStart(
    prerequisite.run.run_id,
    request.business_idempotency_key,
  );
  assert.ok(exactReplay);
  exactReplay.payloads[0] = {
    ...exactReplay.payloads[0]!,
    redacted_manifest: {
      source_binding: { run_id: 42 },
    },
  };
  const tamperedRepository = new Proxy(repository, {
    get(target, property) {
      if (property === 'findWorkflowSimulationStart') {
        return async () => structuredClone(exactReplay);
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const replayService = new ExperimentFoundationExecutionV2Service({
    repository: tamperedRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
  });

  await assert.rejects(
    replayService.startWorkflowSimulation(prerequisite.run.run_id, request),
    assertAppReason('PROVIDER_PAYLOAD_CONFLICT'),
  );
  assert.deepEqual(repository.snapshot(), beforeReplay);
});

test('Pack B control rejects exhausted Attempt stateVersion before repository write', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const service = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    idGenerator: deterministicPackBIdGenerator('state_version_initial'),
  });
  const started = await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-state-version-initial',
  });
  const beforeControl = repository.snapshot();
  const exhaustedRepository = new Proxy(repository, {
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
  const exhaustedService = new ExperimentFoundationExecutionV2Service({
    repository: exhaustedRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
  });

  await assert.rejects(
    exhaustedService.cancelExecutionAttempt(
      started.execution_attempts[0]!.execution_attempt_id,
      { business_idempotency_key: 'pack-b-state-version-cancel' },
    ),
    assertAppReason('EXECUTION_ATTEMPT_STATE_CONFLICT'),
  );
  assert.deepEqual(repository.snapshot(), beforeControl);
});

test('control same-key replay rejects changed route-specific reason codes', async (t) => {
  await t.test('cancel reason drift', async () => {
    const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
    const repository = new InMemoryExperimentFoundationExecutionV2Repository({
      prerequisites: [prerequisite],
    });
    const service = new ExperimentFoundationExecutionV2Service({
      repository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
      intakeEnabled: () => true,
      idGenerator: deterministicPackBIdGenerator('cancel_reason_replay'),
    });
    const started = await service.startWorkflowSimulation(prerequisite.run.run_id, {
      business_idempotency_key: 'cancel-reason-start',
    });
    const attemptId = started.execution_attempts[0].execution_attempt_id;
    const businessKey = 'cancel-reason-control';

    await service.cancelExecutionAttempt(attemptId, {
      business_idempotency_key: businessKey,
      reason_code: 'operator_cancelled',
    });
    const commandCount = repository.snapshot().commands.length;
    await assert.rejects(
      service.cancelExecutionAttempt(attemptId, {
        business_idempotency_key: businessKey,
        reason_code: 'manual_reconcile',
      }),
      assertAppReason('PROVIDER_PAYLOAD_INVALID'),
    );
    assert.equal(repository.snapshot().commands.length, commandCount);
  });

  await t.test('reconcile reason drift', async () => {
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
      idGenerator: deterministicPackBIdGenerator('reconcile_reason_replay'),
    });
    const worker = new ExperimentFoundationProviderCommandV2Worker({
      repository,
      transport: new DeterministicFakeAliyunPaiDlcTransport(),
      now: clock.now,
      idGenerator: deterministicPackBWorkerIdGenerator('reconcile_reason_replay_worker'),
    });
    const started = await service.startWorkflowSimulation(prerequisite.run.run_id, {
      business_idempotency_key: 'reconcile-reason-start',
    });
    await worker.runOnce();
    const attemptId = started.execution_attempts[0].execution_attempt_id;
    const businessKey = 'reconcile-reason-control';

    await service.reconcileExecutionAttempt(attemptId, {
      business_idempotency_key: businessKey,
      reason_code: 'manual_reconcile',
    });
    const commandCount = repository.snapshot().commands.length;
    await assert.rejects(
      service.reconcileExecutionAttempt(attemptId, {
        business_idempotency_key: businessKey,
        reason_code: 'operator_cancelled',
      }),
      assertAppReason('PROVIDER_PAYLOAD_INVALID'),
    );
    assert.equal(repository.snapshot().commands.length, commandCount);
  });
});

test('Pack B transaction-race reason codes map to one exhaustive stable HTTP policy', async () => {
  const cases: Array<[
    ExperimentFoundationExecutionReasonCodeV2,
    number,
    AppError['errorCode'],
  ]> = [
    ['EF_V2_WORKFLOW_SIMULATION_DISABLED', 409, 'VERSION_CONFLICT'],
    ['EXECUTION_HEAD_ACK_REQUIRED', 404, 'NOT_FOUND'],
    ['EXECUTION_RUN_NOT_CURRENT_HEAD', 422, 'GATE_CONSTRAINT_FAILED'],
    ['EXECUTION_SCOPE_DRIFT', 422, 'GATE_CONSTRAINT_FAILED'],
    ['EXECUTION_READINESS_DRIFT', 422, 'GATE_CONSTRAINT_FAILED'],
    ['EXECUTION_ATTEMPT_NOT_FOUND', 404, 'NOT_FOUND'],
    ['PROVIDER_PAYLOAD_INVALID', 400, 'INVALID_PAYLOAD'],
    ['PROVIDER_PAYLOAD_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['EXECUTION_ATTEMPT_LIMIT_EXHAUSTED', 409, 'VERSION_CONFLICT'],
    ['EXECUTION_ATTEMPT_STATE_CONFLICT', 409, 'VERSION_CONFLICT'],
    ['PROVIDER_COMMAND_LEASE_CONFLICT', 409, 'CONCURRENT_ADVANCE'],
    ['PROVIDER_RESPONSE_INVALID', 422, 'GATE_CONSTRAINT_FAILED'],
    ['COLLECTION_ATTEMPT_CONFLICT', 409, 'VERSION_CONFLICT'],
  ];

  for (const [reasonCode, statusCode, errorCode] of cases) {
    const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
    const repository = new InMemoryExperimentFoundationExecutionV2Repository({
      prerequisites: [prerequisite],
    });
    const racingRepository = new Proxy(repository, {
      get(target, property) {
        if (property === 'startWorkflowSimulation') {
          return async () => {
            throw new ExperimentFoundationExecutionV2ConstraintError(
              reasonCode,
              `Injected transaction race: ${reasonCode}`,
            );
          };
        }
        const value = Reflect.get(target, property, target) as unknown;
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as ExperimentFoundationExecutionV2Repository;
    const service = new ExperimentFoundationExecutionV2Service({
      repository: racingRepository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
      intakeEnabled: () => true,
      idGenerator: deterministicPackBIdGenerator(`error_policy_${reasonCode}`),
    });

    await assert.rejects(
      service.startWorkflowSimulation(prerequisite.run.run_id, {
        business_idempotency_key: `race-${reasonCode}`,
      }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, statusCode, reasonCode);
        assert.equal(error.errorCode, errorCode, reasonCode);
        assert.equal(error.message, `Injected transaction race: ${reasonCode}`);
        assert.deepEqual(error.details, { reason_code: reasonCode });
        return true;
      },
    );
    assert.equal(repository.snapshot().attempts.length, 0, reasonCode);
  }
});

test('PB10 cancel racing submit E3 returns zero-partial conflict and same-key retry becomes durable', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ cellCount: 1 });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const clock = mutablePackBClock();
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport: new DeterministicFakeAliyunPaiDlcTransport(),
    leaseOwner: 'pack-b-cancel-e3-race-worker',
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('cancel_e3_race_worker'),
  });
  let injectE3 = true;
  const racingRepository = new Proxy(repository, {
    get(target, property) {
      if (property === 'enqueueControlCommand') {
        return async (
          input: Parameters<ExperimentFoundationExecutionV2Repository['enqueueControlCommand']>[0],
        ) => {
          if (injectE3) {
            injectE3 = false;
            const outcome = await worker.runOnce();
            assert.equal(outcome.completed_count, 1);
          }
          return target.enqueueControlCommand(input);
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const service = new ExperimentFoundationExecutionV2Service({
    repository: racingRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('cancel_e3_race_service'),
  });
  const started = await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-cancel-e3-race-start',
  });
  const attemptId = started.execution_attempts[0].execution_attempt_id;
  const request = {
    business_idempotency_key: 'pack-b-cancel-e3-race-control',
    reason_code: 'operator_cancelled' as const,
  };

  await assert.rejects(
    service.cancelExecutionAttempt(attemptId, request),
    assertAppReason('EXECUTION_ATTEMPT_STATE_CONFLICT'),
  );
  const afterConflict = repository.snapshot();
  assert.equal(afterConflict.attempts[0].lifecycle_state, 'submitted');
  assert.deepEqual(
    afterConflict.events.map((event) => event.event_type),
    ['created', 'submitted'],
  );
  assert.equal(
    afterConflict.commands.filter((command) => command.operation === 'cancel').length,
    0,
  );

  const retry = await service.cancelExecutionAttempt(attemptId, request);
  assert.equal(retry.lifecycle_state, 'submitted');
  assert.equal(
    repository.snapshot().commands.filter((command) => command.operation === 'cancel').length,
    1,
  );
  await worker.runOnce();
  assert.equal((await repository.findAttempt(attemptId))?.lifecycle_state, 'cancelled');
});

test('PB05 retry creates Attempts only for the failed cell and advances its cell-local sequence', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({ retryCeiling: 2 });
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
    idGenerator: deterministicPackBIdGenerator('mixed_retry'),
  });
  const first = await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-mixed-retry-first',
  });
  const transport = new DeterministicFakeAliyunPaiDlcTransport([{
    operation: 'submit',
    invocation: 2,
    kind: 'malformed_response',
  }]);
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport,
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('mixed_retry_worker'),
  });
  await worker.drainUntilIdle();

  const firstCellId = first.execution_attempts[0].run_cell_id;
  const failedCellId = first.execution_attempts[1].run_cell_id;
  const beforeRetry = repository.snapshot();
  assert.equal(
    beforeRetry.attempts.find((attempt) => attempt.run_cell_id === firstCellId)?.lifecycle_state,
    'succeeded',
  );
  assert.equal(
    beforeRetry.attempts.find((attempt) => attempt.run_cell_id === failedCellId)?.lifecycle_state,
    'failed',
  );

  const retry = await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-mixed-retry-second',
  });
  const afterRetry = repository.snapshot();

  assert.equal(retry.execution_attempts.length, 1);
  assert.equal(retry.execution_attempts[0].run_cell_id, failedCellId);
  assert.equal(retry.execution_attempts[0].attempt_sequence, 2);
  assert.equal(afterRetry.attempts.length, 3);
  assert.equal(afterRetry.payloads.length, 2, 'retry exact-reuses the immutable cell payload');
  assert.equal(
    afterRetry.attempts.filter((attempt) => attempt.run_cell_id === firstCellId).length,
    1,
  );
});

test('PB05/PB06 indexed facts preserve latest lineage and ordering at multi-cell retry scale', async () => {
  const prerequisite = buildPackBExecutionPrerequisite({
    cellCount: 12,
    retryCeiling: 3,
  });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const clock = mutablePackBClock();
  const initialService = new ExperimentFoundationExecutionV2Service({
    repository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('indexed_scale_initial'),
  });
  const first = await initialService.startWorkflowSimulation(
    prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-indexed-scale-initial' },
  );
  const transport = new DeterministicFakeAliyunPaiDlcTransport(
    Array.from({ length: 6 }, (_, index) => ({
      operation: 'submit' as const,
      invocation: (index + 1) * 2,
      kind: 'malformed_response' as const,
    })),
  );
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport,
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('indexed_scale_worker'),
  });
  await worker.drainUntilIdle({ max_passes: 100 });
  const firstSnapshot = repository.snapshot();
  assert.equal(firstSnapshot.attempts.length, 12);
  assert.equal(
    firstSnapshot.attempts.filter((attempt) => attempt.lifecycle_state === 'failed').length,
    6,
  );
  assert.equal(
    firstSnapshot.attempts.filter((attempt) => attempt.lifecycle_state === 'succeeded').length,
    6,
  );

  let fullFactsFilterCalls = 0;
  let fullPayloadFindCalls = 0;
  const observeFullFacts = <T>(rows: T[]): T[] => new Proxy(rows, {
    get(target, property, receiver) {
      if (property === 'filter') fullFactsFilterCalls += 1;
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
  const observePayloads = <T>(rows: T[]): T[] => new Proxy(rows, {
    get(target, property, receiver) {
      if (property === 'find') fullPayloadFindCalls += 1;
      return Reflect.get(target, property, receiver) as unknown;
    },
  });
  const indexedRepository = new Proxy(repository, {
    get(target, property) {
      if (property === 'listRunAttempts') {
        return async (runId: string) => observeFullFacts(
          await target.listRunAttempts(runId),
        );
      }
      if (property === 'listRunPayloads') {
        return async (runId: string) => observePayloads(
          await target.listRunPayloads(runId),
        );
      }
      if (property === 'readRunProjectionFacts') {
        return async (runId: string) => {
          const facts = await target.readRunProjectionFacts(runId);
          return {
            attempts: observeFullFacts([...facts.attempts].sort(
              (left, right) => left.attempt_sequence - right.attempt_sequence
                || right.run_cell_id.localeCompare(left.run_cell_id),
            )),
            events: observeFullFacts([...facts.events].sort(
              (left, right) => right.event_sequence - left.event_sequence
                || right.execution_attempt_id.localeCompare(left.execution_attempt_id),
            )),
            collections: observeFullFacts([...facts.collections].reverse()),
          };
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const indexedService = new ExperimentFoundationExecutionV2Service({
    repository: indexedRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
    idGenerator: deterministicPackBIdGenerator('indexed_scale_retry'),
  });
  const retry = await indexedService.startWorkflowSimulation(
    prerequisite.run.run_id,
    { business_idempotency_key: 'pack-b-indexed-scale-retry' },
  );
  assert.equal(retry.execution_attempts.length, 6);
  assert.ok(retry.execution_attempts.every((attempt) => attempt.attempt_sequence === 2));

  await worker.drainUntilIdle({ max_passes: 100 });
  const status = await indexedService.getWorkflowSimulationStatus(prerequisite.run.run_id);
  const expectedLatestByCell = new Map(
    first.execution_attempts.map((attempt) => [
      attempt.run_cell_id,
      attempt.execution_attempt_id,
    ]),
  );
  for (const attempt of retry.execution_attempts) {
    expectedLatestByCell.set(attempt.run_cell_id, attempt.execution_attempt_id);
  }

  assert.equal(status.workflow_simulation_status, 'workflow_simulation_passed');
  assert.equal(status.required_cell_count, 12);
  assert.equal(status.terminal_cell_count, 12);
  assert.equal(status.collected_cell_count, 12);
  assert.deepEqual(
    status.cells.map((cell) => cell.run_cell_id),
    prerequisite.cells.map((cell) => cell.run_cell.run_cell_id),
  );
  assert.deepEqual(
    status.cells.map((cell) => cell.latest_execution_attempt_id),
    status.cells.map((cell) => expectedLatestByCell.get(cell.run_cell_id)),
  );
  assert.ok(status.cells.every((cell) => (
    cell.latest_attempt_state === 'succeeded'
    && cell.latest_collection_state === 'collected'
  )));
  assert.equal(fullFactsFilterCalls, 0);
  assert.equal(fullPayloadFindCalls, 0);
});

test('PB06 workflow status is event-derived, has no persisted aggregate, and rejects row/event drift', async () => {
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
    idGenerator: deterministicPackBIdGenerator('event_status'),
  });
  await service.startWorkflowSimulation(prerequisite.run.run_id, {
    business_idempotency_key: 'pack-b-event-status',
  });
  const worker = new ExperimentFoundationProviderCommandV2Worker({
    repository,
    transport: new DeterministicFakeAliyunPaiDlcTransport(),
    now: clock.now,
    idGenerator: deterministicPackBWorkerIdGenerator('event_status_worker'),
  });
  await worker.drainUntilIdle();

  const status = await service.getWorkflowSimulationStatus(prerequisite.run.run_id);
  assert.equal(status.workflow_simulation_status, 'workflow_simulation_passed');
  assert.equal(status.terminal_cell_count, 1);
  assert.equal(status.collected_cell_count, 1);
  assert.equal(status.cells[0].latest_attempt_state, 'succeeded');
  assert.equal(status.cells[0].latest_collection_state, 'collected');
  assert.equal(status.scientific_execution_status, 'not_started');
  assert.equal(status.evidence_eligibility, false);
  const persistedJson = JSON.stringify(repository.snapshot());
  assert.equal(persistedJson.includes('workflow_simulation_passed'), false);
  assert.equal(persistedJson.includes('evidence_eligibility'), false);

  const driftedRepository = new Proxy(repository, {
    get(target, property) {
      if (property === 'readRunProjectionFacts') {
        return async (runId: string) => {
          const facts = await target.readRunProjectionFacts(runId);
          return {
            ...facts,
            attempts: facts.attempts.map((attempt) => ({
              ...attempt,
              lifecycle_state: 'failed' as const,
            })),
          };
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationExecutionV2Repository;
  const driftDetectingService = new ExperimentFoundationExecutionV2Service({
    repository: driftedRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessRevalidator: passingPackBReadinessRevalidator(prerequisite),
    intakeEnabled: () => true,
    now: clock.now,
  });
  await assert.rejects(
    driftDetectingService.getWorkflowSimulationStatus(prerequisite.run.run_id),
    assertAppReason('EXECUTION_SCOPE_DRIFT'),
  );
});
