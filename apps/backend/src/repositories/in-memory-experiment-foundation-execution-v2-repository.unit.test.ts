import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationCollectionAttemptV2Record,
  type ExperimentFoundationCycleActiveRealAttemptRefV2,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptStateV2,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2Prerequisite,
  type ExperimentFoundationExecutionV2StartInput,
  type ExperimentFoundationProviderCommandKindV2,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
  type ExperimentFoundationProvisionalOutputV2Record,
} from './experiment-foundation-execution-v2.repository.js';
import {
  assertAttemptTerminalStateReasonPair,
} from './experiment-foundation-execution-v2-invariants.js';
import { InMemoryExperimentFoundationExecutionV2Repository } from './in-memory-experiment-foundation-execution-v2-repository.js';

const T0 = '2026-07-13T00:00:00.000Z';
const T1 = '2026-07-13T00:01:00.000Z';
const T2 = '2026-07-13T00:02:00.000Z';
const T3 = '2026-07-13T00:03:00.000Z';
const T4 = '2026-07-13T00:04:00.000Z';
const T5 = '2026-07-13T00:05:00.000Z';

test('in-memory EF execution v2 closes E1/E3/E4/E5 crash windows and exact replays', async () => {
  const prerequisite = makePrerequisite(1);
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const start = makeStart(prerequisite, 'workflow-1', [1]);

  repository.failNext('startWorkflowSimulation');
  await assert.rejects(repository.startWorkflowSimulation(start), /INJECTED/);
  assert.deepEqual(repository.snapshot().attempts, []);

  const committed = await repository.startWorkflowSimulation(start);
  assert.equal(committed.replayed, false);
  assert.equal((await repository.findWorkflowSimulationStart('run-1', 'workflow-1'))?.replayed, true);
  assert.equal((await repository.startWorkflowSimulation(start)).replayed, true);
  await assert.rejects(
    repository.startWorkflowSimulation({ ...start, request_hash: hash('x') }),
    reason('EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT'),
  );

  const submit = (await repository.claimCommands({
    lease_owner: 'worker-1',
    claimed_at: T1,
    lease_expires_at: T5,
    limit: 1,
  }))[0]!;
  const prepared = start.attempts[0]!;
  const submitted = nextAttempt(prepared, 'submitted', T1, 'job-1');
  const sync = makeCommand(submitted, 2, 'sync', 'command-sync-1', T1);
  await assert.rejects(repository.commitCommandOutcome({
    command_id: submit.id,
    lease_owner: 'worker-1',
    expected_lease_version: submit.lease_version,
    committed_at: T1,
    response_hash: hash('r'),
    expected_attempt_state_version: 0,
    next_attempt: submitted,
    event: {
      ...makeEvent(prepared, submitted, 2, 'submitted', submit.id, T1),
      provider_command_id: 'wrong-submit-command',
    },
    next_command: sync,
  }), reason('EXECUTION_ATTEMPT_STATE_CONFLICT'));
  assert.equal((await repository.findAttempt(prepared.id))?.lifecycle_state, 'prepared');
  assert.equal(
    (await repository.listAttemptCommands(prepared.id)).find(({ id }) => id === submit.id)?.state,
    'claimed',
  );
  assert.equal((await repository.listAttemptEvents(prepared.id)).length, 1);
  await repository.commitCommandOutcome({
    command_id: submit.id,
    lease_owner: 'worker-1',
    expected_lease_version: submit.lease_version,
    committed_at: T1,
    response_hash: hash('r'),
    expected_attempt_state_version: 0,
    next_attempt: submitted,
    event: makeEvent(prepared, submitted, 2, 'submitted', submit.id, T1),
    next_command: sync,
  });

  const claimedSync = (await repository.claimCommands({
    lease_owner: 'worker-2',
    claimed_at: T2,
    lease_expires_at: T5,
    limit: 1,
  }))[0]!;
  assert.equal(claimedSync.id, sync.id);
  const running = nextAttempt(submitted, 'running', T2, 'job-1');
  const reconcile = makeCommand(running, 3, 'reconcile', 'command-reconcile-1', T2);
  await repository.commitCommandOutcome({
    command_id: sync.id,
    lease_owner: 'worker-2',
    expected_lease_version: claimedSync.lease_version,
    committed_at: T2,
    response_hash: hash('s'),
    expected_attempt_state_version: 1,
    next_attempt: running,
    event: makeEvent(submitted, running, 3, 'running', sync.id, T2),
    next_command: reconcile,
  });

  const claimedReconcile = (await repository.claimCommands({
    lease_owner: 'worker-3',
    claimed_at: T3,
    lease_expires_at: T5,
    limit: 1,
  }))[0]!;
  assert.equal(claimedReconcile.id, reconcile.id);
  const succeeded = nextAttempt(running, 'succeeded', T3, 'job-1', 'simulation_succeeded');
  const collection = makeCollection(succeeded, T3);
  const collect = makeCommand(succeeded, 4, 'collect', 'command-collect-1', T3, collection.id);
  const prepare = {
    command_id: reconcile.id,
    lease_owner: 'worker-3',
    expected_lease_version: claimedReconcile.lease_version,
    response_hash: hash('t'),
    committed_at: T3,
    expected_attempt_state_version: 2,
    next_attempt: succeeded,
    succeeded_event: makeEvent(running, succeeded, 4, 'succeeded', reconcile.id, T3),
    collection,
    collection_prepared_event: makeEvent(
      succeeded,
      succeeded,
      5,
      'collection_prepared',
      null,
      T3,
    ),
    collect_command: collect,
  };
  repository.failNext('prepareCollection');
  await assert.rejects(repository.prepareCollection(prepare), /INJECTED/);
  assert.equal((await repository.findAttempt(running.id))?.lifecycle_state, 'running');
  assert.equal((await repository.listAttemptCollections(running.id)).length, 0);

  assert.deepEqual(await repository.prepareCollection(prepare), collection);
  assert.deepEqual(await repository.prepareCollection(prepare), collection);

  const claimedCollect = (await repository.claimCommands({
    lease_owner: 'worker-4',
    claimed_at: T4,
    lease_expires_at: T5,
    limit: 1,
  }))[0]!;
  assert.equal(claimedCollect.id, collect.id);
  const collected: ExperimentFoundationCollectionAttemptV2Record = {
    ...collection,
    collection_state: 'collected',
    state_version: 1,
    updated_at: T4,
    terminal_at: T4,
  };
  const output: ExperimentFoundationProvisionalOutputV2Record = {
    id: 'output-1',
    collection_attempt_id: collection.id,
    ordinal: 1,
    output_kind: 'simulation_lifecycle_trace',
    output_manifest_schema_version: 'v1',
    output_class: 'diagnostic_only',
    redacted_manifest: { output_class: 'diagnostic_only' },
    output_hash: hash('o'),
    created_at: T4,
  };
  const collectionEvent = makeEvent(
    succeeded,
    succeeded,
    6,
    'collection_collected',
    collect.id,
    T4,
  );
  await assert.rejects(repository.commitCollectionCompletion({
    collection_id: collection.id,
    command_id: collect.id,
    lease_owner: 'worker-4',
    expected_lease_version: claimedCollect.lease_version,
    response_hash: hash('u'),
    committed_at: T4,
    expected_collection_state_version: 0,
    next_collection: collected,
    provisional_outputs: [output],
    event: { ...collectionEvent, provider_command_id: null },
  }), reason('COLLECTION_ATTEMPT_CONFLICT'));
  assert.equal(
    (await repository.listAttemptCollections(succeeded.id))[0]?.collection_state,
    'prepared',
  );
  assert.equal(
    (await repository.listAttemptCommands(succeeded.id)).find(({ id }) => id === collect.id)?.state,
    'claimed',
  );
  assert.equal((await repository.listAttemptEvents(succeeded.id)).length, 5);
  await repository.commitCollectionCompletion({
    collection_id: collection.id,
    command_id: collect.id,
    lease_owner: 'worker-4',
    expected_lease_version: claimedCollect.lease_version,
    response_hash: hash('u'),
    committed_at: T4,
    expected_collection_state_version: 0,
    next_collection: collected,
    provisional_outputs: [output],
    event: collectionEvent,
  });
  assert.deepEqual(
    await repository.commitCollectionCompletion({
      collection_id: collection.id,
      command_id: collect.id,
      lease_owner: 'worker-4',
      expected_lease_version: claimedCollect.lease_version,
      response_hash: hash('u'),
      committed_at: T4,
      expected_collection_state_version: 0,
      next_collection: collected,
      provisional_outputs: [output],
      event: collectionEvent,
    }),
    collected,
  );
  await assert.rejects(
    repository.commitCollectionCompletion({
      collection_id: collection.id,
      command_id: collect.id,
      lease_owner: 'worker-4',
      expected_lease_version: claimedCollect.lease_version,
      response_hash: hash('u'),
      committed_at: T4,
      expected_collection_state_version: 0,
      next_collection: collected,
      provisional_outputs: [{ ...output, output_hash: hash('changed-output') }],
      event: collectionEvent,
    }),
    reason('COLLECTION_ATTEMPT_CONFLICT'),
  );
});

test('in-memory EF execution v2 retries only the exact failed/cancelled cell subset', async () => {
  const prerequisite = makePrerequisite(2);
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const initial = makeStart(prerequisite, 'workflow-initial', [1, 2]);
  await repository.startWorkflowSimulation(initial);
  const submits = await repository.claimCommands({
    lease_owner: 'worker', claimed_at: T1, lease_expires_at: T5, limit: 2,
  });
  for (const [index, submit] of submits.entries()) {
    const prepared = initial.attempts.find((attempt) => attempt.id === submit.execution_attempt_id)!;
    const submitted = nextAttempt(prepared, 'submitted', T1, `job-${index + 1}`);
    const sync = makeCommand(submitted, 2, 'sync', `sync-${index + 1}`, T1);
    await repository.commitCommandOutcome({
      command_id: submit.id,
      lease_owner: 'worker',
      expected_lease_version: submit.lease_version,
      committed_at: T1,
      response_hash: hash(String(index + 1)),
      expected_attempt_state_version: 0,
      next_attempt: submitted,
      event: makeEvent(prepared, submitted, 2, 'submitted', submit.id, T1),
      next_command: sync,
    });
  }

  const prematureRetry = makeStart(prerequisite, 'workflow-premature', [2], 2);
  await assert.rejects(
    repository.startWorkflowSimulation(prematureRetry),
    reason('EXECUTION_ATTEMPT_STATE_CONFLICT'),
  );

  const syncs = await repository.claimCommands({
    lease_owner: 'worker', claimed_at: T2, lease_expires_at: T5, limit: 2,
  });
  for (const [index, sync] of syncs.entries()) {
    const submitted = (await repository.findAttempt(sync.execution_attempt_id))!;
    const running = nextAttempt(submitted, 'running', T2, submitted.external_job_ref);
    const reconcile = makeCommand(
      running,
      3,
      'reconcile',
      `reconcile-${index + 1}`,
      T2,
    );
    await repository.commitCommandOutcome({
      command_id: sync.id,
      lease_owner: 'worker',
      expected_lease_version: sync.lease_version,
      committed_at: T2,
      response_hash: hash(index === 0 ? 'a' : 'b'),
      expected_attempt_state_version: 1,
      next_attempt: running,
      event: makeEvent(submitted, running, 3, 'running', sync.id, T2),
      next_command: reconcile,
    });
  }

  const reconciles = await repository.claimCommands({
    lease_owner: 'worker', claimed_at: T3, lease_expires_at: T5, limit: 2,
  });
  for (const [index, reconcile] of reconciles.entries()) {
    const running = (await repository.findAttempt(reconcile.execution_attempt_id))!;
    if (index === 0) {
      const succeeded = nextAttempt(
        running,
        'succeeded',
        T3,
        running.external_job_ref,
        'simulation_succeeded',
      );
      const collection = makeCollection(succeeded, T3);
      await repository.prepareCollection({
        command_id: reconcile.id,
        lease_owner: 'worker',
        expected_lease_version: reconcile.lease_version,
        response_hash: hash('c'),
        committed_at: T3,
        expected_attempt_state_version: 2,
        next_attempt: succeeded,
        succeeded_event: makeEvent(running, succeeded, 4, 'succeeded', reconcile.id, T3),
        collection,
        collection_prepared_event: makeEvent(
          succeeded,
          succeeded,
          5,
          'collection_prepared',
          null,
          T3,
        ),
        collect_command: makeCommand(
          succeeded,
          4,
          'collect',
          'collect-successful-cell',
          T3,
          collection.id,
        ),
      });
      continue;
    }
    const failed = nextAttempt(
      running,
      'failed',
      T3,
      running.external_job_ref,
      'simulation_failed',
    );
    await repository.commitCommandOutcome({
      command_id: reconcile.id,
      lease_owner: 'worker',
      expected_lease_version: reconcile.lease_version,
      committed_at: T3,
      response_hash: hash('d'),
      command_terminal_error_code: 'malformed_provider_response',
      expected_attempt_state_version: 2,
      next_attempt: failed,
      event: makeEvent(running, failed, 4, 'failed', reconcile.id, T3),
    });
  }

  const failedCell = (await repository.listRunAttempts('run-1'))
    .find((attempt) => attempt.lifecycle_state === 'failed')!;
  const retry = makeStart(
    prerequisite,
    'workflow-retry',
    [Number(failedCell.cell_key.replace('cell-', ''))],
    2,
  );
  const retried = await repository.startWorkflowSimulation(retry);
  assert.deepEqual(retried.attempts.map((attempt) => attempt.run_cell_id), [failedCell.run_cell_id]);
  assert.equal(retried.attempts[0]?.attempt_sequence, 2);
});

test('in-memory control same-key replay precedes Attempt CAS and ignores generated identity fields', async () => {
  const prerequisite = makePrerequisite(1);
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const start = makeStart(prerequisite, 'workflow-control-replay', [1]);
  await repository.startWorkflowSimulation(start);
  const prepared = start.attempts[0]!;
  const cancelled = nextAttempt(prepared, 'cancelled', T1, null, 'operator_cancelled');
  const command = makeCommand(prepared, 2, 'cancel', 'cancel-command-first', T1);
  const event = makeEvent(prepared, cancelled, 2, 'cancelled', command.id, T1);
  const regenerated: ExperimentFoundationProviderCommandV2Record = {
    ...command,
    id: 'cancel-command-regenerated',
    command_sequence: 99,
    next_attempt_at: T2,
    created_at: T2,
    updated_at: T2,
  };
  const [first, replay] = await Promise.all([
    repository.enqueueControlCommand({
      attempt_id: prepared.id,
      expected_attempt_state_version: 0,
      command,
      event,
      next_attempt: cancelled,
    }),
    repository.enqueueControlCommand({
      attempt_id: prepared.id,
      expected_attempt_state_version: 0,
      command: regenerated,
      event: { ...event, id: 'regenerated-event', occurred_at: T2 },
      next_attempt: { ...cancelled, updated_at: T2, terminal_at: T2 },
    }),
  ]);
  assert.equal(first.id, command.id);
  assert.equal(replay.id, command.id);
  assert.equal(repository.snapshot().commands.length, 2, 'one submit and one cancel only');

  await assert.rejects(repository.enqueueControlCommand({
    attempt_id: prepared.id,
    expected_attempt_state_version: 0,
    command: {
      ...regenerated,
      command_snapshot: { ...regenerated.command_snapshot, cancellation_reason: 'changed' },
    },
  }), reason('EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT'));
});

test('PB06 lease version rejects a stale claim even when the worker owner is reused', async () => {
  const prerequisite = makePrerequisite(1);
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  await repository.startWorkflowSimulation(makeStart(prerequisite, 'workflow-lease-version', [1]));
  const first = (await repository.claimCommands({
    lease_owner: 'reused-worker',
    claimed_at: T1,
    lease_expires_at: T2,
    limit: 1,
  }))[0]!;
  const reclaimed = (await repository.claimCommands({
    lease_owner: 'reused-worker',
    claimed_at: T3,
    lease_expires_at: T5,
    limit: 1,
  }))[0]!;
  assert.equal(reclaimed.id, first.id);
  assert.equal(reclaimed.lease_version, first.lease_version + 1);

  await assert.rejects(repository.heartbeatCommand({
    command_id: first.id,
    lease_owner: 'reused-worker',
    expected_lease_version: first.lease_version,
    heartbeat_at: T4,
    lease_expires_at: '2026-07-13T00:06:00.000Z',
  }), reason('PROVIDER_COMMAND_LEASE_CONFLICT'));
  const heartbeat = await repository.heartbeatCommand({
    command_id: reclaimed.id,
    lease_owner: 'reused-worker',
    expected_lease_version: reclaimed.lease_version,
    heartbeat_at: T4,
    lease_expires_at: '2026-07-13T00:06:00.000Z',
  });
  assert.equal(heartbeat.lease_version, reclaimed.lease_version);
});

test('execution repository adapters classify acknowledgement identity and hash drift identically', async () => {
  const prerequisite = makePrerequisite(1);
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    prerequisites: [prerequisite],
  });
  const start = makeStart(prerequisite, 'workflow-ack-parity', [1]);

  await assert.rejects(repository.startWorkflowSimulation({
    ...start,
    expected_head_acknowledgement_inbox_id: 'substituted-ack',
  }), reason('EXECUTION_HEAD_ACK_REQUIRED'));
  await assert.rejects(repository.startWorkflowSimulation({
    ...start,
    expected_head_acknowledgement_payload_hash: hash('x'),
  }), reason('EXECUTION_HEAD_ACK_REQUIRED'));
  assert.deepEqual(repository.snapshot().attempts, []);
});

test('Attempt terminal state, reason, and timestamp form one exact invariant', () => {
  const prerequisite = makePrerequisite(1);
  const prepared = makeStart(prerequisite, 'workflow-terminal-pairs', [1]).attempts[0]!;
  const invalid: ExperimentFoundationExecutionAttemptV2Record[] = [
    { ...prepared, terminal_reason_code: 'simulation_failed' },
    {
      ...prepared,
      lifecycle_state: 'succeeded',
      terminal_reason_code: 'simulation_failed',
      terminal_at: T1,
    },
    {
      ...prepared,
      lifecycle_state: 'cancelled',
      terminal_reason_code: 'simulation_succeeded',
      terminal_at: T1,
    },
    {
      ...prepared,
      lifecycle_state: 'failed',
      terminal_reason_code: 'operator_cancelled',
      terminal_at: T1,
    },
  ];
  for (const attempt of invalid) {
    assert.throws(
      () => assertAttemptTerminalStateReasonPair(attempt),
      reason('EXECUTION_ATTEMPT_STATE_CONFLICT'),
    );
  }
});

test('PB14 in-memory fence enumerates every Cycle-wide active real Attempt across Runs', async () => {
  const head = activeRealAttemptRef({
    execution_attempt_id: 'real-attempt-head',
    external_pi_branch_id: 'branch-b',
    run_id: 'run-head',
  });
  const nonHead = activeRealAttemptRef({
    execution_attempt_id: 'real-attempt-non-head',
    external_pi_branch_id: 'branch-a',
    run_id: 'run-superseded-non-head',
    lifecycle_state: 'running',
  });
  const otherCycle = activeRealAttemptRef({
    execution_attempt_id: 'real-attempt-other-cycle',
    validation_cycle_id: 'cycle-2',
    run_id: 'run-other-cycle',
  });
  const repository = new InMemoryExperimentFoundationExecutionV2Repository({
    activeRealAttemptRefs: [head, nonHead, otherCycle],
  });

  assert.deepEqual(await repository.listCycleActiveRealAttemptRefs({
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
  }), [nonHead, head]);
});

function makePrerequisite(cellCount: number): ExperimentFoundationExecutionV2Prerequisite {
  const acknowledgement = {
    inbox_id: 'ack-1',
    event_id: 'head-event-1',
    event_payload_hash: hash('h'),
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    branch_id: 'branch-1',
    work_order_revision_id: 'revision-1',
    work_order_revision_hash: hash('w'),
    revision_sequence: 1,
    run_id: 'run-1',
    run_manifest_hash: hash('m'),
    processed_at: T0,
  };
  return {
    run: {
      run_id: 'run-1',
      external_pi_work_order_revision_id: 'revision-1',
      external_pi_work_order_revision_hash: hash('w'),
      external_pi_branch_revision_sequence: 1,
      run_manifest_hash: hash('m'),
      cell_count: cellCount,
      frozen_at: T0,
    },
    run_recipe_id: 'recipe-1',
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    external_pi_branch_id: 'branch-1',
    readiness: {
      readiness_attestation_id: 'readiness-1',
      readiness_attestation_hash: hash('q'),
      target: exactRef('EvaluationProtocol', 'protocol-1', 'protocol-revision-1', 'p'),
      ordered_dependencies: [{
        readiness_attestation_id: 'readiness-1',
        ordinal: 1,
        dependency: exactRef('Dataset', 'dataset-1', 'dataset-revision-1', 'd'),
      }],
      evaluator_profile_version: 'v1',
      evaluator_profile_hash: hash('e'),
      dependency_manifest_hash: hash('n'),
      outcome: 'passed',
    },
    head_acknowledgement: acknowledgement,
    latest_branch_head_acknowledgement: { ...acknowledgement },
    cells: Array.from({ length: cellCount }, (_, index) => {
      const ordinal = index + 1;
      return {
        run_cell: {
          run_cell_id: `run-cell-${ordinal}`,
          run_id: 'run-1',
          ordinal,
          cell_key: `cell-${ordinal}`,
          external_pi_cell_id: `pi-cell-${ordinal}`,
          external_pi_cell_hash: hash(String(ordinal)),
          training_task_spec_id: `task-${ordinal}`,
          training_task_spec_hash: hash(String(ordinal + 2)),
          seed: ordinal,
          repeat_index: 0,
        },
        task_spec: {
          training_task_spec_id: `task-${ordinal}`,
          materialization_key: `task-materialization-${ordinal}`,
          run_recipe_id: 'recipe-1',
          external_pi_work_order_revision_id: 'revision-1',
          external_pi_work_order_revision_hash: hash('w'),
          external_pi_cell_id: `pi-cell-${ordinal}`,
          external_pi_cell_hash: hash(String(ordinal)),
          command_snapshot: { command: 'run', arguments: [] },
          io_snapshot: { input_keys: ['input'], output_keys: ['simulation_lifecycle_trace'] },
          resource_snapshot: { cpu_cores: 1, memory_mb: 128 },
          retry_snapshot: { max_attempts: 2 },
          task_spec_hash: hash(String(ordinal + 2)),
          created_at: T0,
        },
        retry_ceiling: 2,
      };
    }),
  };
}

function makeStart(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  businessKey: string,
  ordinals: number[],
  attemptSequence = 1,
): ExperimentFoundationExecutionV2StartInput {
  const requestHash = hash(businessKey[0] ?? 'z');
  const payloads = ordinals.map((ordinal) => makePayload(prerequisite, ordinal));
  const attempts = ordinals.map((ordinal) => makeAttempt(
    prerequisite,
    payloads.find((payload) => payload.cell_key === `cell-${ordinal}`)!,
    businessKey,
    requestHash,
    attemptSequence,
  ));
  return {
    run_id: prerequisite.run.run_id,
    business_idempotency_key: businessKey,
    request_hash: requestHash,
    expected_run_manifest_hash: prerequisite.run.run_manifest_hash,
    expected_head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
    expected_head_acknowledgement_payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
    expected_readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
    expected_readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
    payloads,
    attempts,
    events: attempts.map((attempt) => makeEvent(attempt, attempt, 1, 'created', null, T0, null)),
    commands: attempts.map((attempt) => makeCommand(attempt, 1, 'submit', `submit-${attempt.id}`, T0)),
  };
}

function makePayload(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  ordinal: number,
): ExperimentFoundationProviderPayloadV2Record {
  const cell = prerequisite.cells[ordinal - 1]!;
  return {
    id: `payload-${ordinal}`,
    materialization_key: `payload-materialization-${ordinal}`,
    run_id: prerequisite.run.run_id,
    run_manifest_hash: prerequisite.run.run_manifest_hash,
    run_cell_id: cell.run_cell.run_cell_id,
    cell_key: cell.run_cell.cell_key,
    training_task_spec_id: cell.task_spec.training_task_spec_id,
    training_task_spec_hash: cell.task_spec.task_spec_hash,
    payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1',
    adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    provider_profile_version: 'v1',
    redacted_manifest: { manifest_schema_version: 'v1' },
    payload_hash: hash(String(ordinal + 4)),
    payload_byte_size: 100,
    created_at: T0,
  };
}

function makeAttempt(
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
  payload: ExperimentFoundationProviderPayloadV2Record,
  businessKey: string,
  requestHash: string,
  sequence: number,
): ExperimentFoundationExecutionAttemptV2Record {
  return {
    id: `attempt-${payload.cell_key}-${sequence}-${businessKey}`,
    implementation_project_id: prerequisite.implementation_project_id,
    validation_cycle_id: prerequisite.validation_cycle_id,
    external_pi_branch_id: prerequisite.external_pi_branch_id,
    external_pi_work_order_revision_id: prerequisite.run.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: prerequisite.run.external_pi_work_order_revision_hash,
    external_pi_revision_sequence: prerequisite.run.external_pi_branch_revision_sequence,
    run_id: prerequisite.run.run_id,
    run_manifest_hash: prerequisite.run.run_manifest_hash,
    run_cell_id: payload.run_cell_id,
    cell_key: payload.cell_key,
    training_task_spec_id: payload.training_task_spec_id,
    training_task_spec_hash: payload.training_task_spec_hash,
    provider_payload_id: payload.id,
    provider_payload_hash: payload.payload_hash,
    head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
    attempt_sequence: sequence,
    workflow_business_key: businessKey,
    workflow_request_hash: requestHash,
    execution_mode: 'simulation',
    provenance: 'non_production_fake_provider',
    provider_idempotency_key: `attempt-provider-${payload.cell_key}-${sequence}-${businessKey}`,
    lifecycle_state: 'prepared',
    state_version: 0,
    external_job_ref: null,
    external_job_ref_hash: null,
    terminal_reason_code: null,
    created_at: T0,
    updated_at: T0,
    terminal_at: null,
  };
}

function nextAttempt(
  current: ExperimentFoundationExecutionAttemptV2Record,
  state: ExperimentFoundationExecutionAttemptStateV2,
  at: string,
  externalJobRef: string | null,
  terminalReason: ExperimentFoundationExecutionAttemptV2Record['terminal_reason_code'] = null,
): ExperimentFoundationExecutionAttemptV2Record {
  return {
    ...current,
    lifecycle_state: state,
    state_version: current.state_version + 1,
    external_job_ref: externalJobRef,
    external_job_ref_hash: externalJobRef ? hash('j') : null,
    terminal_reason_code: terminalReason,
    updated_at: at,
    terminal_at: ['succeeded', 'failed', 'cancelled'].includes(state) ? at : null,
  };
}

function makeEvent(
  prior: ExperimentFoundationExecutionAttemptV2Record,
  next: ExperimentFoundationExecutionAttemptV2Record,
  sequence: number,
  eventType: ExperimentFoundationExecutionAttemptEventV2Record['event_type'],
  commandId: string | null,
  at: string,
  priorState: ExperimentFoundationExecutionAttemptStateV2 | null = prior.lifecycle_state,
): ExperimentFoundationExecutionAttemptEventV2Record {
  return {
    id: `event-${next.id}-${sequence}`,
    execution_attempt_id: next.id,
    event_sequence: sequence,
    event_type: eventType,
    prior_state: priorState,
    next_state: next.lifecycle_state,
    provider_command_id: commandId,
    payload_hash: next.provider_payload_hash,
    external_job_ref: next.external_job_ref,
    external_job_ref_hash: next.external_job_ref_hash,
    event_snapshot: { snapshot_schema_version: 'v1' },
    event_hash: hash(String((sequence % 9) + 1)),
    occurred_at: at,
  };
}

function makeCommand(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  sequence: number,
  operation: ExperimentFoundationProviderCommandKindV2,
  id: string,
  at: string,
  collectionId: string | null = null,
): ExperimentFoundationProviderCommandV2Record {
  return {
    id,
    execution_attempt_id: attempt.id,
    collection_attempt_id: collectionId,
    command_sequence: sequence,
    operation,
    command_snapshot: { command_schema_version: 'v1', operation },
    command_hash: hash(String((sequence % 9) + 1)),
    provider_idempotency_key: `${attempt.id}:${operation}:${sequence}`,
    payload_hash: attempt.provider_payload_hash,
    external_job_ref: attempt.external_job_ref,
    external_job_ref_hash: attempt.external_job_ref_hash,
    state: 'pending',
    lease_version: 0,
    lease_owner: null,
    lease_expires_at: null,
    last_heartbeat_at: null,
    attempt_count: 0,
    next_attempt_at: null,
    response_hash: null,
    last_error_code: null,
    created_at: at,
    updated_at: at,
    completed_at: null,
  };
}

function makeCollection(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  at: string,
): ExperimentFoundationCollectionAttemptV2Record {
  assert.ok(attempt.external_job_ref);
  return {
    id: `collection-${attempt.id}`,
    execution_attempt_id: attempt.id,
    provider_payload_id: attempt.provider_payload_id,
    provider_payload_hash: attempt.provider_payload_hash,
    external_job_ref: attempt.external_job_ref,
    external_job_ref_hash: attempt.external_job_ref_hash!,
    business_idempotency_key: `collect-${attempt.id}`,
    request_hash: hash('c'),
    collection_state: 'prepared',
    state_version: 0,
    created_at: at,
    updated_at: at,
    terminal_at: null,
  };
}

function exactRef(
  assetType: 'Dataset' | 'EvaluationProtocol',
  logicalId: string,
  revisionId: string,
  hashCharacter: string,
) {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: 1,
    content_hash: hash(hashCharacter),
  };
}

function hash(character: string): string {
  return `sha256:${character.repeat(64).slice(0, 64)}`;
}

function activeRealAttemptRef(
  overrides: Partial<ExperimentFoundationCycleActiveRealAttemptRefV2> = {},
): ExperimentFoundationCycleActiveRealAttemptRefV2 {
  return {
    execution_attempt_id: 'real-attempt-1',
    implementation_project_id: 'project-1',
    validation_cycle_id: 'cycle-1',
    external_pi_branch_id: 'branch-1',
    external_pi_work_order_revision_id: 'revision-1',
    external_pi_work_order_revision_hash: hash('w'),
    external_pi_revision_sequence: 1,
    run_id: 'run-1',
    run_manifest_hash: hash('m'),
    run_cell_id: 'run-cell-1',
    attempt_sequence: 1,
    state_version: 0,
    execution_mode: 'real_provider',
    lifecycle_state: 'submitted',
    ...overrides,
  };
}

function reason(reasonCode: string) {
  return (error: unknown) => error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === reasonCode;
}
