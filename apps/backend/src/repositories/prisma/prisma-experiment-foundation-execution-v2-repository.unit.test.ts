import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import {
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationExecutionAttemptEventV2,
  serverHashExperimentFoundationProviderCommandV2,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationExecutionV2CommitCollectionInput,
} from '../experiment-foundation-execution-v2.repository.js';
import { PrismaExperimentFoundationExecutionV2Repository } from './prisma-experiment-foundation-execution-v2-repository.js';

test('PB14 Prisma fence is Cycle-wide and does not filter by Run or head lineage', async () => {
  const capturedQueries: Record<string, unknown>[] = [];
  const rows = [
    attemptRow({
      id: 'real-attempt-non-head',
      externalPiBranchId: 'branch-a',
      runId: 'run-superseded-non-head',
      lifecycleState: 'running',
    }),
    attemptRow({
      id: 'real-attempt-head',
      externalPiBranchId: 'branch-b',
      runId: 'run-current-head',
      lifecycleState: 'submitted',
    }),
  ];
  const prisma = {
    experimentFoundationExecutionAttemptV2: {
      async findMany(query: Record<string, unknown>) {
        capturedQueries.push(structuredClone(query));
        return rows;
      },
    },
  } as unknown as PrismaClient;
  const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

  const refs = await repository.listCycleActiveRealAttemptRefs({
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
  });

  assert.deepEqual(refs.map((ref) => [
    ref.execution_attempt_id,
    ref.external_pi_branch_id,
    ref.run_id,
    ref.lifecycle_state,
    ref.execution_mode,
  ]), [
    ['real-attempt-non-head', 'branch-a', 'run-superseded-non-head', 'running', 'real_provider'],
    ['real-attempt-head', 'branch-b', 'run-current-head', 'submitted', 'real_provider'],
  ]);
  const capturedQuery = capturedQueries[0];
  assert.ok(capturedQuery);
  const where = capturedQuery.where as Record<string, unknown>;
  assert.deepEqual(where, {
    externalPiImplementationProjectId: 'project-1',
    externalPiValidationCycleId: 'cycle-1',
    executionMode: 'real_provider',
    lifecycleState: { in: ['prepared', 'submitted', 'running'] },
  });
  assert.equal(Object.hasOwn(where, 'runId'), false);
  assert.equal(Object.keys(where).some((key) => /head/i.test(key)), false);
});

test('PB14 Prisma fence fails closed if storage returns a non-real or terminal row', async () => {
  for (const drift of [
    { lifecycleState: 'succeeded' },
    { executionMode: 'simulation' },
  ]) {
    const prisma = {
      experimentFoundationExecutionAttemptV2: {
        async findMany() {
          return [attemptRow(drift)];
        },
      },
    } as unknown as PrismaClient;
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    await assert.rejects(repository.listCycleActiveRealAttemptRefs({
      implementation_project_id: 'project-1',
      validation_cycle_id: 'cycle-1',
    }), (error: unknown) => (
      error instanceof ExperimentFoundationExecutionV2ConstraintError
      && error.reasonCode === 'EXECUTION_SCOPE_DRIFT'
    ));
  }
});

test('Pack B Prisma reads fail closed on AttemptEvent schema-version drift', async () => {
  const validRepository = new PrismaExperimentFoundationExecutionV2Repository({
    experimentFoundationExecutionAttemptEventV2: {
      async findMany() {
        return [eventRow()];
      },
    },
  } as unknown as PrismaClient);
  assert.equal((await validRepository.listAttemptEvents('attempt-1')).length, 1);

  for (const row of [
    eventRow({ eventSchemaVersion: 'v2' }),
    eventRow({ eventSnapshotJson: { snapshot_schema_version: 'v2' } }),
  ]) {
    const prisma = {
      experimentFoundationExecutionAttemptEventV2: {
        async findMany() {
          return [row];
        },
      },
    } as unknown as PrismaClient;
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    await assert.rejects(
      repository.listAttemptEvents('attempt-1'),
      isProviderResponseVersionConflict,
    );
  }
});

test('Pack B Prisma reads fail closed on AttemptEvent snapshot and hash tampering', async () => {
  const original = eventRow();
  const wrongProfileHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExecutionAttemptEventV2',
    schema_version: 'v1',
    hash_profile: 'ef-provider-command-json@v1',
    content: eventHashContent(original),
  });
  for (const row of [
    eventRow({
      eventSnapshotJson: {
        ...(original.eventSnapshotJson as Record<string, unknown>),
        note: 'tampered after commit',
      },
    }),
    eventRow({
      eventSnapshotJson: {
        ...(original.eventSnapshotJson as Record<string, unknown>),
        untyped_extra: true,
      },
    }),
    eventRow({ eventHash: wrongProfileHash }),
  ]) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationExecutionAttemptEventV2: {
        async findMany() {
          return [row];
        },
      },
    } as unknown as PrismaClient);

    await assert.rejects(
      repository.listAttemptEvents('attempt-1'),
      isProviderResponseVersionConflict,
    );
  }
});

test('Pack B Prisma reads and claims fail closed on ProviderCommand schema-version drift', async () => {
  const validRepository = new PrismaExperimentFoundationExecutionV2Repository({
    experimentFoundationProviderCommandV2: {
      async findMany() {
        return [commandRow()];
      },
    },
  } as unknown as PrismaClient);
  assert.equal((await validRepository.listAttemptCommands('attempt-1')).length, 1);

  for (const row of [
    commandRow({ commandSchemaVersion: 'v2' }),
    commandRow({ commandSnapshotJson: { command_schema_version: 'v2' } }),
  ]) {
    const prisma = {
      experimentFoundationProviderCommandV2: {
        async findMany() {
          return [row];
        },
      },
    } as unknown as PrismaClient;
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    await assert.rejects(
      repository.listAttemptCommands('attempt-1'),
      isProviderResponseVersionConflict,
    );
  }

  const driftedClaim = commandRow({ commandSchemaVersion: 'v2' });
  const commandDelegate = {
    async findMany() {
      return [driftedClaim];
    },
    async updateMany() {
      return { count: 1 };
    },
    async findUniqueOrThrow() {
      return driftedClaim;
    },
  };
  const prisma = {
    experimentFoundationProviderCommandV2: commandDelegate,
    async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
      return operation({ experimentFoundationProviderCommandV2: commandDelegate });
    },
  } as unknown as PrismaClient;
  const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

  await assert.rejects(repository.claimCommands({
    lease_owner: 'worker-1',
    claimed_at: '2026-07-14T00:00:00.000Z',
    lease_expires_at: '2026-07-14T00:05:00.000Z',
    limit: 1,
  }), isProviderResponseVersionConflict);
});

test('Pack B Prisma command claim rejects typed-snapshot and hash tampering before lease mutation', async () => {
  const original = commandRow();
  const wrongProfileHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationProviderCommandV2',
    schema_version: 'v1',
    hash_profile: 'ef-execution-attempt-event-json@v1',
    content: commandHashContent(original),
  });
  for (const drifted of [
    rehashCommandRow(commandRow({
      commandSnapshotJson: {
        ...(original.commandSnapshotJson as Record<string, unknown>),
        cancellation_reason: 'tampered after commit',
      },
    })),
    rehashCommandRow(commandRow({
      commandSnapshotJson: {
        ...(original.commandSnapshotJson as Record<string, unknown>),
        operation: 'cancel',
      },
    })),
    rehashCommandRow(commandRow({
      commandSnapshotJson: {
        ...(original.commandSnapshotJson as Record<string, unknown>),
        provider_payload_id: 'self-consistent-poison-payload',
      },
    })),
    rehashCommandRow(commandRow({
      operation: 'cancel',
      commandSnapshotJson: {
        ...(original.commandSnapshotJson as Record<string, unknown>),
        operation: 'cancel',
        cancellation_reason: null,
      },
    })),
    commandRow({ commandHash: wrongProfileHash }),
  ]) {
    let updateCalls = 0;
    const commandDelegate = {
      async findMany() {
        return [drifted];
      },
      async updateMany() {
        updateCalls += 1;
        return { count: 1 };
      },
      async findUniqueOrThrow() {
        return drifted;
      },
    };
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationProviderCommandV2: commandDelegate,
      async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
        return operation({ experimentFoundationProviderCommandV2: commandDelegate });
      },
    } as unknown as PrismaClient);

    await assert.rejects(repository.claimCommands({
      lease_owner: 'worker-1',
      claimed_at: '2026-07-14T00:00:00.000Z',
      lease_expires_at: '2026-07-14T00:05:00.000Z',
      limit: 1,
    }), isProviderResponseVersionConflict);
    assert.equal(updateCalls, 0);
  }
});

test('Pack B heartbeat validates command-to-Attempt binding before any lease mutation', async () => {
  const original = commandRow();
  const poisoned = rehashCommandRow(commandRow({
    commandSnapshotJson: {
      ...(original.commandSnapshotJson as Record<string, unknown>),
      provider_payload_id: 'self-consistent-poison-payload',
    },
    commandState: 'claimed',
    leaseVersion: 1,
    leaseOwner: 'worker-1',
    leaseExpiresAt: new Date('2026-07-15T00:10:00.000Z'),
    heartbeatAt: new Date('2026-07-15T00:00:00.000Z'),
    attemptCount: 1,
    nextAttemptAt: null,
  }));
  let updateCalls = 0;
  const commandDelegate = {
    async findUnique() {
      return poisoned;
    },
    async updateMany() {
      updateCalls += 1;
      return { count: 1 };
    },
    async findUniqueOrThrow() {
      return poisoned;
    },
  };
  const repository = new PrismaExperimentFoundationExecutionV2Repository({
    async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
      return operation({ experimentFoundationProviderCommandV2: commandDelegate });
    },
  } as unknown as PrismaClient);

  await assert.rejects(repository.heartbeatCommand({
    command_id: poisoned.id,
    lease_owner: 'worker-1',
    expected_lease_version: 1,
    heartbeat_at: '2026-07-15T00:01:00.000Z',
    lease_expires_at: '2026-07-15T00:11:00.000Z',
  }), isProviderResponseVersionConflict);
  assert.equal(updateCalls, 0);
});

test('Pack B release validates command-to-Attempt binding before any lease mutation', async () => {
  const original = commandRow();
  const poisoned = rehashCommandRow(commandRow({
    commandSnapshotJson: {
      ...(original.commandSnapshotJson as Record<string, unknown>),
      provider_payload_id: 'self-consistent-poison-payload',
    },
    commandState: 'claimed',
    leaseVersion: 1,
    leaseOwner: 'worker-1',
    leaseExpiresAt: new Date('2026-07-15T00:10:00.000Z'),
    heartbeatAt: new Date('2026-07-15T00:00:00.000Z'),
    attemptCount: 1,
    nextAttemptAt: null,
  }));
  let updateCalls = 0;
  const commandDelegate = {
    async findUnique() {
      return poisoned;
    },
    async updateMany() {
      updateCalls += 1;
      return { count: 1 };
    },
    async findUniqueOrThrow() {
      return poisoned;
    },
  };
  const repository = new PrismaExperimentFoundationExecutionV2Repository({
    async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
      return operation({ experimentFoundationProviderCommandV2: commandDelegate });
    },
  } as unknown as PrismaClient);

  await assert.rejects(repository.releaseCommand({
    command_id: poisoned.id,
    lease_owner: 'worker-1',
    expected_lease_version: 1,
    released_at: '2026-07-15T00:01:00.000Z',
    next_attempt_at: '2026-07-15T00:02:00.000Z',
    error_code: 'PROVIDER_RESPONSE_INVALID',
  }), isProviderResponseVersionConflict);
  assert.equal(updateCalls, 0);
});

test('Pack B Prisma claim fences Int32-saturated lease counters before increment', async () => {
  let updateCalls = 0;
  const commandDelegate = {
    async findMany() {
      return [commandRow({
        id: 'command-saturated',
        leaseVersion: 2_147_483_647,
        attemptCount: 1,
      })];
    },
    async updateMany() {
      updateCalls += 1;
      return { count: 1 };
    },
  };
  const prisma = {
    experimentFoundationProviderCommandV2: commandDelegate,
    async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
      return operation({ experimentFoundationProviderCommandV2: commandDelegate });
    },
  } as unknown as PrismaClient;
  const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

  await assert.rejects(repository.claimCommands({
    lease_owner: 'worker-1',
    claimed_at: '2026-07-14T00:00:00.000Z',
    lease_expires_at: '2026-07-14T00:05:00.000Z',
    limit: 1,
  }), (error: unknown) => (
    error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === 'PROVIDER_COMMAND_LEASE_CONFLICT'
  ));
  assert.equal(updateCalls, 0);
});

test('Pack B Prisma claim CAS carries both Int32 increment fences', async () => {
  let updateWhere: Record<string, unknown> | undefined;
  const commandDelegate = {
    async findMany() {
      return [commandRow({ id: 'command-ready', leaseVersion: 0, attemptCount: 0 })];
    },
    async updateMany(input: { where: Record<string, unknown> }) {
      updateWhere = structuredClone(input.where);
      return { count: 0 };
    },
  };
  const prisma = {
    experimentFoundationProviderCommandV2: commandDelegate,
    async $transaction<T>(operation: (transaction: unknown) => Promise<T>) {
      return operation({ experimentFoundationProviderCommandV2: commandDelegate });
    },
  } as unknown as PrismaClient;
  const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

  assert.deepEqual(await repository.claimCommands({
    lease_owner: 'worker-1',
    claimed_at: '2026-07-14T00:00:00.000Z',
    lease_expires_at: '2026-07-14T00:05:00.000Z',
    limit: 1,
  }), []);
  assert.deepEqual(updateWhere?.leaseVersion, { lt: 2_147_483_647 });
  assert.deepEqual(updateWhere?.attemptCount, { lt: 2_147_483_647 });
});

test('Pack B Prisma payload mapper rejects fixed-literal and typed-manifest poison rows', async () => {
  const validRepository = new PrismaExperimentFoundationExecutionV2Repository({
    experimentFoundationProviderPayloadV2: {
      async findUnique() {
        return payloadRow();
      },
    },
  } as unknown as PrismaClient);
  assert.equal((await validRepository.findProviderPayload('payload-1'))?.id, 'payload-1');

  const original = payloadRow();
  for (const poisoned of [
    payloadRow({ adapterIdentity: 'self_consistent_but_unknown_adapter@v1' }),
    payloadRow({ executionMode: 'real_provider' }),
    payloadRow({
      redactedManifestJson: {
        ...(original.redactedManifestJson as Record<string, unknown>),
        source_binding: {
          ...((original.redactedManifestJson as Record<string, unknown>)
            .source_binding as Record<string, unknown>),
          run_cell_id: 'poison-cell',
        },
      },
    }),
    payloadRow({
      redactedManifestJson: {
        ...(original.redactedManifestJson as Record<string, unknown>),
        redacted_fields: ['simulated_job.arguments'],
      },
    }),
  ]) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationProviderPayloadV2: {
        async findUnique() {
          return poisoned;
        },
      },
    } as unknown as PrismaClient);
    await assert.rejects(
      repository.findProviderPayload('payload-1'),
      isProviderPayloadConflict,
    );
  }
});

test('Pack B Prisma Attempt mapper rejects vocabulary and terminal-pair poison rows', async () => {
  const validRepository = new PrismaExperimentFoundationExecutionV2Repository({
    experimentFoundationExecutionAttemptV2: {
      async findUnique() {
        return executionAttemptRow();
      },
    },
  } as unknown as PrismaClient);
  assert.equal((await validRepository.findAttempt('attempt-1'))?.lifecycle_state, 'prepared');

  for (const poisoned of [
    executionAttemptRow({ lifecycleState: 'poisoned' }),
    executionAttemptRow({ terminalReasonCode: 'unknown_terminal_reason' }),
    executionAttemptRow({
      lifecycleState: 'succeeded',
      terminalReasonCode: 'simulation_failed',
      terminalAt: new Date('2026-07-14T00:01:00.000Z'),
    }),
  ]) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationExecutionAttemptV2: {
        async findUnique() {
          return poisoned;
        },
      },
    } as unknown as PrismaClient);
    await assert.rejects(repository.findAttempt('attempt-1'), isExecutionIntegrityConflict);
  }
});

test('Pack B Prisma AttemptEvent mapper rejects self-consistent type/state poison after rehash', async () => {
  const selfConsistentPoisonRows = [
    rehashEventRow(eventRow({
      eventType: 'invented',
      priorState: 'prepared',
      nextState: 'invented',
    })),
    rehashEventRow(eventRow({
      eventType: 'submitted',
      priorState: 'prepared',
      nextState: 'running',
    })),
  ];
  for (const poisoned of selfConsistentPoisonRows) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationExecutionAttemptEventV2: {
        async findMany() {
          return [poisoned];
        },
      },
    } as unknown as PrismaClient);
    await assert.rejects(
      repository.listAttemptEvents('attempt-1'),
      isProviderResponseVersionConflict,
    );
  }
});

test('Pack B Prisma ProviderCommand mapper rejects self-consistent operation/state poison after rehash', async () => {
  const original = commandRow();
  const selfConsistentOperationPoison = rehashCommandRow(commandRow({
    operation: 'invented',
    commandSnapshotJson: {
      ...(original.commandSnapshotJson as Record<string, unknown>),
      operation: 'invented',
    },
  }));
  for (const poisoned of [
    selfConsistentOperationPoison,
    commandRow({ commandState: 'poisoned' }),
    commandRow({ commandState: 'succeeded' }),
  ]) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationProviderCommandV2: {
        async findMany() {
          return [poisoned];
        },
      },
    } as unknown as PrismaClient);
    await assert.rejects(
      repository.listAttemptCommands('attempt-1'),
      isProviderResponseVersionConflict,
    );
  }
});

test('Pack B Prisma Collection mapper rejects state vocabulary and terminal-shape poison rows', async () => {
  const validRepository = new PrismaExperimentFoundationExecutionV2Repository({
    experimentFoundationCollectionAttemptV2: {
      async findMany() {
        return [collectionRow()];
      },
    },
  } as unknown as PrismaClient);
  assert.equal((await validRepository.listAttemptCollections('attempt-1'))[0]?.collection_state, 'prepared');

  for (const poisoned of [
    collectionRow({ collectionState: 'poisoned' }),
    collectionRow({ collectionState: 'collected', collectedAt: null }),
    collectionRow({ collectedAt: new Date('2026-07-14T00:01:00.000Z') }),
  ]) {
    const repository = new PrismaExperimentFoundationExecutionV2Repository({
      experimentFoundationCollectionAttemptV2: {
        async findMany() {
          return [poisoned];
        },
      },
    } as unknown as PrismaClient);
    await assert.rejects(
      repository.listAttemptCollections('attempt-1'),
      isCollectionIntegrityConflict,
    );
  }
});

test('Pack B Prisma output replay rejects kind/class/typed-manifest and self-consistent hash substitution', async () => {
  const expectedOutputRow = outputRow();
  const replacementHash = hash('e');
  const selfConsistentHashPoison = outputRow({
    id: `fake_diagnostic_output_${replacementHash.slice('sha256:'.length).slice(0, 32)}`,
    outputHash: replacementHash,
    redactedManifestJson: {
      ...(expectedOutputRow.redactedManifestJson as Record<string, unknown>),
      redacted_locator: `diagnostic://${replacementHash}`,
    },
  });
  const poisonRows = [
    outputRow({
      outputKind: 'invented',
      redactedManifestJson: {
        ...(expectedOutputRow.redactedManifestJson as Record<string, unknown>),
        output_kind: 'invented',
      },
    }),
    outputRow({
      outputClass: 'scientific_evidence',
      redactedManifestJson: {
        ...(expectedOutputRow.redactedManifestJson as Record<string, unknown>),
        output_class: 'scientific_evidence',
      },
    }),
    outputRow({
      redactedManifestJson: {
        ...(expectedOutputRow.redactedManifestJson as Record<string, unknown>),
        output_kind: 'simulation_provider_metadata',
      },
    }),
    selfConsistentHashPoison,
  ];
  for (const poisoned of poisonRows) {
    const { repository, input } = collectionCompletionReplayHarness(poisoned);
    await assert.rejects(
      repository.commitCollectionCompletion(input),
      isCollectionIntegrityConflict,
    );
  }
});

function attemptRow(overrides: Partial<ReturnType<typeof baseAttemptRow>> = {}) {
  return { ...baseAttemptRow(), ...overrides };
}

function baseAttemptRow() {
  return {
    id: 'real-attempt-1',
    externalPiImplementationProjectId: 'project-1',
    externalPiValidationCycleId: 'cycle-1',
    externalPiBranchId: 'branch-1',
    externalPiWorkOrderRevisionId: 'revision-1',
    externalPiWorkOrderRevisionHash: hash('w'),
    externalPiRevisionSequence: 1,
    runId: 'run-1',
    runManifestHash: hash('m'),
    runCellId: 'run-cell-1',
    attemptSequence: 1,
    stateVersion: 0,
    executionMode: 'real_provider',
    lifecycleState: 'submitted',
  };
}

function payloadRow(overrides: Record<string, unknown> = {}) {
  const redactedManifestJson = {
    manifest_schema_version: 'v1',
    payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1',
    adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
    simulation_profile_version: 'simulation-profile-v1',
    job_name: 'ef-v2-simulation-test',
    source_binding: {
      run_id: 'run-1',
      run_manifest_hash: hash('m'),
      run_cell_id: 'run-cell-1',
      cell_key: 'cell-1',
      training_task_spec_id: 'task-spec-1',
      training_task_spec_hash: hash('t'),
    },
    command_summary: { command: 'run', argument_count: 1 },
    resource_summary: { cpu_cores: 1, memory_mb: 512 },
    input_keys: ['input'],
    output_keys: ['simulation_lifecycle_trace'],
    redacted_fields: [
      'canonical_payload_bytes',
      'profile.workspace_id',
      'simulated_job.arguments',
    ],
  };
  return {
    id: 'payload-1',
    materializationKey: hash('k'),
    runId: 'run-1',
    runManifestHash: hash('m'),
    runCellId: 'run-cell-1',
    cellKey: 'cell-1',
    trainingTaskSpecId: 'task-spec-1',
    trainingTaskSpecHash: hash('t'),
    payloadSchemaVersion: 'FakeAliyunPaiDlcSubmitPayload@v1',
    adapterIdentity: 'deterministic_fake_aliyun_pai_dlc@v1',
    executionMode: 'simulation',
    provenance: 'non_production_fake_provider',
    providerProfileVersion: 'simulation-profile-v1',
    redactedManifestVersion: 'v1',
    redactedManifestJson,
    payloadHash: hash('p'),
    payloadByteSize: 256,
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    ...overrides,
  };
}

function executionAttemptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'attempt-1',
    externalPiImplementationProjectId: 'project-1',
    externalPiValidationCycleId: 'cycle-1',
    externalPiBranchId: 'branch-1',
    externalPiWorkOrderRevisionId: 'revision-1',
    externalPiWorkOrderRevisionHash: hash('w'),
    externalPiRevisionSequence: 1,
    runId: 'run-1',
    runManifestHash: hash('m'),
    runCellId: 'run-cell-1',
    cellKey: 'cell-1',
    trainingTaskSpecId: 'task-spec-1',
    trainingTaskSpecHash: hash('t'),
    providerPayloadId: 'payload-1',
    providerPayloadHash: hash('p'),
    headAcknowledgementInboxId: 'ack-1',
    attemptSequence: 1,
    workflowBusinessKey: 'workflow-1',
    workflowRequestHash: hash('r'),
    executionMode: 'simulation',
    provenance: 'non_production_fake_provider',
    providerIdempotencyKey: 'provider-attempt-1',
    lifecycleState: 'prepared',
    stateVersion: 0,
    terminalReasonCode: null,
    externalJobRefSchemaVersion: null,
    externalJobRefJson: null,
    externalJobRefHash: null,
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    updatedAt: new Date('2026-07-14T00:00:00.000Z'),
    terminalAt: null as Date | null,
    ...overrides,
  };
}

function collectionRow(overrides: Record<string, unknown> = {}) {
  const externalJobRef = 'fake-job-1';
  return {
    id: 'collection-1',
    executionAttemptId: 'attempt-1',
    businessIdempotencyKey: 'collection-business-1',
    collectionRequestHash: hash('c'),
    providerPayloadId: 'payload-1',
    providerPayloadHash: hash('p'),
    externalJobRefJson: {
      ref_type: 'fake_aliyun_pai_dlc_job',
      ref_id: externalJobRef,
    },
    externalJobRefHash: externalJobRefHash(externalJobRef),
    collectionState: 'prepared',
    stateVersion: 0,
    preparedAt: new Date('2026-07-14T00:00:00.000Z'),
    updatedAt: new Date('2026-07-14T00:00:00.000Z'),
    collectedAt: null as Date | null,
    ...overrides,
  };
}

function outputRow(overrides: Record<string, unknown> = {}) {
  const outputHash = hash('d');
  return {
    id: `fake_diagnostic_output_${outputHash.slice('sha256:'.length).slice(0, 32)}`,
    collectionAttemptId: 'collection-1',
    ordinal: 1,
    outputKind: 'simulation_lifecycle_trace',
    outputClass: 'diagnostic_only',
    manifestSchemaVersion: 'v1',
    redactedManifestJson: {
      manifest_schema_version: 'v1',
      output_class: 'diagnostic_only',
      output_kind: 'simulation_lifecycle_trace',
      media_type: 'application/json',
      redacted_locator: `diagnostic://${outputHash}`,
    },
    outputHash,
    createdAt: new Date('2026-07-14T00:02:00.000Z'),
    ...overrides,
  };
}

function collectionCompletionReplayHarness(poisonedOutput: ReturnType<typeof outputRow>) {
  const completedAt = new Date('2026-07-14T00:02:00.000Z');
  const externalJobRef = 'fake-job-1';
  const refHash = externalJobRefHash(externalJobRef);
  const attempt = executionAttemptRow({
    lifecycleState: 'succeeded',
    stateVersion: 3,
    terminalReasonCode: 'simulation_succeeded',
    externalJobRefSchemaVersion: 'v1',
    externalJobRefJson: {
      ref_type: 'fake_aliyun_pai_dlc_job',
      ref_id: externalJobRef,
    },
    externalJobRefHash: refHash,
    updatedAt: completedAt,
    terminalAt: completedAt,
  });
  const collection = collectionRow({
    collectionState: 'collected',
    stateVersion: 1,
    updatedAt: completedAt,
    collectedAt: completedAt,
  });
  const commandBase = commandRow({
    collectionAttemptId: 'collection-1',
    commandSequence: 4,
    operation: 'collect',
    commandSnapshotJson: {
      command_schema_version: 'v1',
      operation: 'collect',
      provider_payload_id: 'payload-1',
      provider_payload_hash: hash('p'),
      external_job_ref: {
        ref_type: 'fake_aliyun_pai_dlc_job',
        ref_id: externalJobRef,
      },
      cancellation_reason: null,
    },
    responseHash: hash('b'),
    externalJobRefJson: {
      ref_type: 'fake_aliyun_pai_dlc_job',
      ref_id: externalJobRef,
    },
    externalJobRefHash: refHash,
    commandState: 'succeeded',
    lastErrorCode: null,
    updatedAt: completedAt,
    terminalAt: completedAt,
  });
  const command = rehashCommandRow(commandBase);
  const event = rehashEventRow(eventRow({
    id: 'collection-event-1',
    eventSequence: 4,
    eventType: 'collection_collected',
    priorState: 'succeeded',
    nextState: 'succeeded',
    providerCommandId: command.id,
    externalJobRefJson: {
      ref_type: 'fake_aliyun_pai_dlc_job',
      ref_id: externalJobRef,
    },
    externalJobRefHash: refHash,
    occurredAt: completedAt,
  }));
  const expectedCollection = {
    id: collection.id,
    execution_attempt_id: collection.executionAttemptId,
    provider_payload_id: collection.providerPayloadId,
    provider_payload_hash: collection.providerPayloadHash,
    external_job_ref: externalJobRef,
    external_job_ref_hash: collection.externalJobRefHash,
    business_idempotency_key: collection.businessIdempotencyKey,
    request_hash: collection.collectionRequestHash,
    collection_state: 'collected' as const,
    state_version: collection.stateVersion,
    created_at: collection.preparedAt.toISOString(),
    updated_at: collection.updatedAt.toISOString(),
    terminal_at: collection.collectedAt?.toISOString() ?? null,
  };
  const expectedEvent = {
    id: event.id,
    execution_attempt_id: event.executionAttemptId,
    event_sequence: event.eventSequence,
    event_type: 'collection_collected' as const,
    prior_state: 'succeeded' as const,
    next_state: 'succeeded' as const,
    provider_command_id: event.providerCommandId,
    payload_hash: event.providerPayloadHash,
    external_job_ref: externalJobRef,
    external_job_ref_hash: event.externalJobRefHash,
    event_snapshot: event.eventSnapshotJson as Readonly<Record<string, unknown>>,
    event_hash: event.eventHash,
    occurred_at: event.occurredAt.toISOString(),
  };
  const validOutput = outputRow();
  const expectedOutput = {
    id: validOutput.id,
    collection_attempt_id: validOutput.collectionAttemptId,
    ordinal: validOutput.ordinal,
    output_kind: 'simulation_lifecycle_trace' as const,
    output_manifest_schema_version: validOutput.manifestSchemaVersion,
    output_class: 'diagnostic_only' as const,
    redacted_manifest: validOutput.redactedManifestJson as Readonly<Record<string, unknown>>,
    output_hash: validOutput.outputHash,
    created_at: validOutput.createdAt.toISOString(),
  };
  const transaction = {
    experimentFoundationCollectionAttemptV2: {
      async findUnique() {
        return collection;
      },
    },
    experimentFoundationProviderCommandV2: {
      async findUnique() {
        return command;
      },
    },
    experimentFoundationExecutionAttemptV2: {
      async findUnique() {
        return attempt;
      },
    },
    experimentFoundationExecutionAttemptEventV2: {
      async findUnique() {
        return event;
      },
    },
    experimentFoundationProvisionalOutputV2: {
      async findUnique() {
        return poisonedOutput;
      },
    },
  };
  const repository = new PrismaExperimentFoundationExecutionV2Repository({
    async $transaction<T>(operation: (client: typeof transaction) => Promise<T>) {
      return operation(transaction);
    },
  } as unknown as PrismaClient);
  const input = {
    collection_id: collection.id,
    command_id: command.id,
    lease_owner: 'worker-1',
    expected_lease_version: 1,
    response_hash: hash('b'),
    committed_at: completedAt.toISOString(),
    expected_collection_state_version: 0,
    next_collection: expectedCollection,
    provisional_outputs: [expectedOutput],
    event: expectedEvent,
  } satisfies ExperimentFoundationExecutionV2CommitCollectionInput;
  return { repository, input };
}

function eventRow(overrides: Record<string, unknown> = {}) {
  const row = {
    id: 'event-1',
    executionAttemptId: 'attempt-1',
    eventSequence: 1,
    eventType: 'created',
    priorState: null,
    nextState: 'prepared',
    providerCommandId: null,
    providerPayloadHash: hash('p'),
    externalJobRefJson: null,
    externalJobRefHash: null,
    eventSchemaVersion: 'v1',
    eventSnapshotJson: {
      snapshot_schema_version: 'v1',
      reason_code: null,
      observed_provider_state: null,
      note: null,
    },
    eventHash: '',
    occurredAt: new Date('2026-07-14T00:00:00.000Z'),
  };
  row.eventHash = serverHashExperimentFoundationExecutionAttemptEventV2(
    eventHashContent(row) as Parameters<
      typeof serverHashExperimentFoundationExecutionAttemptEventV2
    >[0],
  );
  return { ...row, ...overrides };
}

function commandRow(overrides: Record<string, unknown> = {}) {
  const row = {
    id: 'command-1',
    executionAttemptId: 'attempt-1',
    collectionAttemptId: null,
    commandSequence: 1,
    operation: 'submit',
    commandSchemaVersion: 'v1',
    commandSnapshotJson: {
      command_schema_version: 'v1',
      operation: 'submit',
      provider_payload_id: 'payload-1',
      provider_payload_hash: hash('p'),
      external_job_ref: null,
      cancellation_reason: null,
    },
    commandHash: '',
    responseHash: null,
    providerIdempotencyKey: 'provider-command-1',
    providerPayloadHash: hash('p'),
    externalJobRefJson: null,
    externalJobRefHash: null,
    commandState: 'pending',
    leaseVersion: 0,
    leaseOwner: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    attemptCount: 0,
    nextAttemptAt: new Date('2026-07-14T00:00:00.000Z'),
    lastErrorCode: null,
    createdAt: new Date('2026-07-14T00:00:00.000Z'),
    updatedAt: new Date('2026-07-14T00:00:00.000Z'),
    terminalAt: null as Date | null,
    executionAttempt: executionAttemptRow(),
  };
  row.commandHash = serverHashExperimentFoundationProviderCommandV2(
    commandHashContent(row) as Parameters<
      typeof serverHashExperimentFoundationProviderCommandV2
    >[0],
  );
  return { ...row, ...overrides };
}

function rehashEventRow(row: ReturnType<typeof eventRow>) {
  return {
    ...row,
    eventHash: serverHashExperimentFoundationExecutionAttemptEventV2(
      eventHashContent(row) as Parameters<
        typeof serverHashExperimentFoundationExecutionAttemptEventV2
      >[0],
    ),
  };
}

function rehashCommandRow(row: ReturnType<typeof commandRow>) {
  return {
    ...row,
    commandHash: serverHashExperimentFoundationProviderCommandV2(
      commandHashContent(row) as Parameters<
        typeof serverHashExperimentFoundationProviderCommandV2
      >[0],
    ),
  };
}

function eventHashContent(row: ReturnType<typeof eventRow> | Record<string, unknown>) {
  const externalRef = row.externalJobRefJson as Record<string, unknown> | null;
  return {
    execution_attempt_id: row.executionAttemptId,
    event_sequence: row.eventSequence,
    event_type: row.eventType,
    prior_state: row.priorState,
    next_state: row.nextState,
    provider_command_id: row.providerCommandId,
    payload_hash: row.providerPayloadHash,
    external_job_ref: externalRef?.ref_id ?? null,
    external_job_ref_hash: row.externalJobRefHash,
    event_snapshot: row.eventSnapshotJson,
    occurred_at: (row.occurredAt as Date).toISOString(),
  };
}

function commandHashContent(row: ReturnType<typeof commandRow> | Record<string, unknown>) {
  return {
    provider_idempotency_key: row.providerIdempotencyKey,
    command_snapshot: row.commandSnapshotJson,
  };
}

function isProviderResponseVersionConflict(error: unknown): boolean {
  return error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === 'PROVIDER_RESPONSE_INVALID';
}

function isProviderPayloadConflict(error: unknown): boolean {
  return error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === 'PROVIDER_PAYLOAD_CONFLICT';
}

function isExecutionIntegrityConflict(error: unknown): boolean {
  return error instanceof ExperimentFoundationExecutionV2ConstraintError
    && (
      error.reasonCode === 'EXECUTION_SCOPE_DRIFT'
      || error.reasonCode === 'EXECUTION_ATTEMPT_STATE_CONFLICT'
    );
}

function isCollectionIntegrityConflict(error: unknown): boolean {
  return error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === 'COLLECTION_ATTEMPT_CONFLICT';
}

function externalJobRefHash(refId: string): string {
  return serverHashExperimentFoundationExternalJobRefV2(refId);
}

function hash(character: string): string {
  const hexCharacter = /^[0-9a-f]$/.test(character)
    ? character
    : (character.codePointAt(0) ?? 0).toString(16).slice(-1);
  return `sha256:${hexCharacter.repeat(64)}`;
}
