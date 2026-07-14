import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma, PrismaClient } from '@prisma/client';
import {
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationExecutionAttemptEventV2,
  serverHashExperimentFoundationProviderCommandV2,
  serverHashExperimentFoundationV2ReadinessAttestation,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2RunRecipe,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashExperimentFoundationV2VersionLock,
  serverHashExperimentFoundationV2VersionLockDependencyManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  BranchHeadAdvancedEventV1,
  ExperimentFoundationIntegrationInboxV2,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  ExperimentFoundationExecutionV2ConstraintError,
} from '../experiment-foundation-execution-v2.repository.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import type {
  ExperimentFoundationExecutionAttemptEventV2Record,
  ExperimentFoundationExecutionAttemptV2Record,
  ExperimentFoundationExecutionV2StartInput,
  ExperimentFoundationProviderCommandV2Record,
  ExperimentFoundationProviderPayloadV2Record,
} from '../experiment-foundation-execution-v2.repository.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
  EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
  type ExperimentFoundationV2MaterializationBundle,
} from '../experiment-spine-v2.repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationExecutionV2Repository } from './prisma-experiment-foundation-execution-v2-repository.js';

const RUN_REAL_POSTGRES = process.env.EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_EXECUTION_V2_RELATIONAL_PRISMA=1 with the explicit randomized disposable database identity variables';

const EXPECTED_PACK_B_INDEXES = [
  'ExperimentFoundationCollectionAttemptV2_pkey',
  'ExperimentFoundationExecutionAttemptEventV2_pkey',
  'ExperimentFoundationExecutionAttemptV2_pkey',
  'ExperimentFoundationProviderCommandV2_pkey',
  'ExperimentFoundationProviderPayloadV2_pkey',
  'ExperimentFoundationProvisionalOutputV2_pkey',
  'ef_collection_attempt_exact_attempt_unique',
  'ef_collection_attempt_exact_binding_unique',
  'ef_collection_attempt_execution_unique',
  'ef_execution_attempt_cell_sequence_unique',
  'ef_execution_attempt_cycle_mode_state_idx',
  'ef_execution_attempt_collection_binding_unique',
  'ef_execution_attempt_event_command_unique',
  'ef_execution_attempt_event_exact_command_unique',
  'ef_execution_attempt_event_hash_unique',
  'ef_execution_attempt_event_sequence_unique',
  'ef_execution_attempt_event_time_idx',
  'ef_execution_attempt_exact_payload_unique',
  'ef_execution_attempt_head_ack_idx',
  'ef_execution_attempt_provider_idempotency_unique',
  'ef_execution_attempt_run_sequence_idx',
  'ef_execution_attempt_workflow_business_unique',
  'ef_provider_command_attempt_hash_unique',
  'ef_provider_command_attempt_sequence_unique',
  'ef_provider_command_collection_idx',
  'ef_provider_command_exact_attempt_unique',
  'ef_provider_command_idempotency_unique',
  'ef_provider_command_lease_expiry_idx',
  'ef_provider_command_ready_idx',
  'ef_provider_payload_cell_profile_unique',
  'ef_provider_payload_exact_binding_unique',
  'ef_provider_payload_exact_hash_unique',
  'ef_provider_payload_materialization_unique',
  'ef_provider_payload_run_cell_idx',
  'ef_provider_payload_task_spec_idx',
  'ef_provisional_output_collection_hash_unique',
  'ef_provisional_output_collection_kind_unique',
  'ef_provisional_output_collection_ordinal_unique',
] as const;

test(
  'Prisma EF execution v2 atomically persists E1 and rolls back an invalid E3 command chain',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const start = makeStart(prerequisite, fixture);
      const outcome = await repository.startWorkflowSimulation(start);
      assert.equal(outcome.replayed, false);
      assert.equal((await repository.findWorkflowSimulationStart(fixture.runId, fixture.workflowKey))?.replayed, true);
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), 1);

      const claimed = (await repository.claimCommands({
        lease_owner: 'relational-worker',
        claimed_at: fixture.later,
        lease_expires_at: fixture.leaseExpiry,
        limit: 1,
      }))[0]!;
      const prepared = start.attempts[0]!;
      const submitted: ExperimentFoundationExecutionAttemptV2Record = {
        ...prepared,
        lifecycle_state: 'submitted',
        state_version: 1,
        external_job_ref: 'relational-job',
        external_job_ref_hash: externalJobRefHash('relational-job'),
        updated_at: fixture.later,
      };
      const event = makeEvent(prepared, submitted, claimed.id, fixture.later);
      const invalidNext = makeCommand(submitted, 2, 'sync', `${fixture.prefix}-invalid-sync`);
      invalidNext.payload_hash = hash('x');
      await assert.rejects(repository.commitCommandOutcome({
        command_id: claimed.id,
        lease_owner: 'relational-worker',
        expected_lease_version: claimed.lease_version,
        committed_at: fixture.later,
        response_hash: hash('r'),
        expected_attempt_state_version: 0,
        next_attempt: submitted,
        event,
        next_command: invalidNext,
      }));
      assert.equal((await repository.findAttempt(prepared.id))?.lifecycle_state, 'prepared');
      assert.equal((await prisma.experimentFoundationProviderCommandV2.findUnique({
        where: { id: claimed.id },
        select: { commandState: true },
      }))?.commandState, 'claimed');
      assert.equal((await repository.listAttemptEvents(prepared.id)).length, 1);

      const validNext = makeCommand(submitted, 2, 'sync', `${fixture.prefix}-valid-sync`);
      await repository.commitCommandOutcome({
        command_id: claimed.id,
        lease_owner: 'relational-worker',
        expected_lease_version: claimed.lease_version,
        committed_at: fixture.later,
        response_hash: hash('r'),
        expected_attempt_state_version: 0,
        next_attempt: submitted,
        event,
        next_command: validNext,
      });
      assert.equal((await repository.findAttempt(prepared.id))?.lifecycle_state, 'submitted');
      assert.equal((await prisma.experimentFoundationProviderCommandV2.findUnique({
        where: { id: claimed.id },
        select: { commandState: true },
      }))?.commandState, 'succeeded');

      await assert.rejects(prisma.experimentFoundationExecutionAttemptV2.create({
        data: {
          ...attemptData({
            ...prepared,
            id: `${fixture.prefix}-cross-scope-attempt`,
            external_pi_branch_id: `${fixture.prefix}-wrong-branch`,
            attempt_sequence: 2,
            workflow_business_key: `${fixture.prefix}-cross-scope`,
            provider_idempotency_key: `${fixture.prefix}-cross-scope-provider`,
          }),
        },
      }));
    } finally {
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 rejects a persisted TaskSpec snapshot tamper before every E1 write',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
    let taskTriggerDisabled = false;
    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const start = makeStart(prerequisite, fixture);
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2" DISABLE TRIGGER USER',
      );
      taskTriggerDisabled = true;
      await prisma.experimentFoundationTrainingTaskSpecV2.update({
        where: { id: fixture.taskId },
        data: {
          taskSpecSnapshotJson: {
            schema_version: 'v1',
            command_snapshot: { command: 'tampered-before-e1', arguments: [] },
            io_snapshot: {
              input_keys: ['input'],
              output_keys: ['simulation_lifecycle_trace'],
            },
            resource_snapshot: { cpu_cores: 1, memory_mb: 128 },
            retry_snapshot: { max_attempts: 2 },
          },
        },
      });
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2" ENABLE TRIGGER USER',
      );
      taskTriggerDisabled = false;

      await assert.rejects(
        repository.resolveRunPrerequisite(fixture.runId),
        reason('EXECUTION_SCOPE_DRIFT'),
      );
      await assert.rejects(
        repository.startWorkflowSimulation(start),
        reason('EXECUTION_SCOPE_DRIFT'),
      );
      assert.equal(await prisma.experimentFoundationProviderPayloadV2.count({
        where: { runId: fixture.runId },
      }), 0);
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), 0);
      assert.equal(await prisma.experimentFoundationExecutionAttemptEventV2.count({
        where: { executionAttempt: { runId: fixture.runId } },
      }), 0);
      assert.equal(await prisma.experimentFoundationProviderCommandV2.count({
        where: { executionAttempt: { runId: fixture.runId } },
      }), 0);
    } finally {
      if (taskTriggerDisabled) {
        await prisma.$executeRawUnsafe(
          'ALTER TABLE "ExperimentFoundationTrainingTaskSpecV2" ENABLE TRIGGER USER',
        );
      }
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 concurrent E1 exact replay converges and rejects workflow binding drift',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const first = makeStart(prerequisite, fixture);
      const drifted = structuredClone(first);
      drifted.attempts[0]!.workflow_business_key = `${fixture.workflowKey}-drift`;
      await assert.rejects(repository.startWorkflowSimulation(drifted));
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), 0);

      const second = regenerateStartIdentities(first, 'competitor');
      const outcomes = await Promise.all([
        repository.startWorkflowSimulation(first),
        repository.startWorkflowSimulation(second),
      ]);
      assert.deepEqual(outcomes.map((outcome) => outcome.replayed).sort(), [false, true]);
      assert.equal(outcomes[0]!.attempts[0]!.id, outcomes[1]!.attempts[0]!.id);
      assert.equal(outcomes[0]!.payloads[0]!.id, outcomes[1]!.payloads[0]!.id);
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), 1);
    } finally {
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 batches a large E1 cell set with bounded query shape',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const cellCount = 48;
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(
      process.env,
      'packb',
      (databaseUrl) => new PrismaClient({
        datasources: { db: { url: databaseUrl } },
        log: [{ emit: 'event', level: 'query' }],
      }),
    );
    const queries: string[] = [];
    let captureQueries = false;
    prisma.$on('query', (event) => {
      if (captureQueries) queries.push(event.query);
    });
    const fixture = await seedPackAPrerequisite(prisma, cellCount);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      assert.equal(prerequisite.cells.length, cellCount);
      const start = makeStart(prerequisite, fixture);

      captureQueries = true;
      const outcome = await repository.startWorkflowSimulation(start);
      captureQueries = false;

      assert.equal(outcome.replayed, false);
      assert.equal(outcome.attempts.length, cellCount);
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), cellCount);
      assert.ok(
        queries.length < cellCount,
        `E1 emitted ${queries.length} SQL statements for ${cellCount} cells`,
      );
      for (const table of [
        'ExperimentFoundationProviderPayloadV2',
        'ExperimentFoundationExecutionAttemptV2',
        'ExperimentFoundationExecutionAttemptEventV2',
        'ExperimentFoundationProviderCommandV2',
      ]) {
        assert.equal(
          queries.filter((query) => /^INSERT INTO /.test(query) && query.includes(`"${table}"`)).length,
          1,
          `${table} must be persisted by one createMany statement`,
        );
      }
      assert.ok(
        queries.some((query) => (
          /^SELECT /.test(query)
          && query.includes('"ExperimentFoundationExecutionAttemptV2"')
          && /GROUP BY .*"runCellId"/s.test(query)
          && /MAX\(.*"attemptSequence"\)/s.test(query)
        )),
        'latest Attempt discovery must aggregate attemptSequence by runCellId in Postgres',
      );
    } finally {
      captureQueries = false;
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 pre-submit cancel commits command before its FK-bound event and replays',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const start = makeStart(prerequisite, fixture);
      await repository.startWorkflowSimulation(start);
      const prepared = start.attempts[0]!;
      const cancelled: ExperimentFoundationExecutionAttemptV2Record = {
        ...prepared,
        lifecycle_state: 'cancelled',
        state_version: 1,
        terminal_reason_code: 'operator_cancelled',
        updated_at: fixture.later,
        terminal_at: fixture.later,
      };
      const command = makeCommand(
        prepared,
        2,
        'cancel',
        `${fixture.prefix}-cancel-before-submit`,
      );
      const event = makeHashedEvent({
        id: `${fixture.prefix}-cancelled-event`,
        execution_attempt_id: prepared.id,
        event_sequence: 2,
        event_type: 'cancelled',
        prior_state: 'prepared',
        next_state: 'cancelled',
        provider_command_id: command.id,
        payload_hash: prepared.provider_payload_hash,
        external_job_ref: null,
        external_job_ref_hash: null,
        event_snapshot: {
          snapshot_schema_version: 'v1',
          reason_code: 'operator_cancelled',
          observed_provider_state: null,
          note: null,
        },
        occurred_at: fixture.later,
      });
      const input = {
        attempt_id: prepared.id,
        expected_attempt_state_version: 0,
        command,
        event,
        next_attempt: cancelled,
      };

      const regeneratedCommand = {
        ...command,
        id: `${fixture.prefix}-cancel-before-submit-competitor`,
      };
      const [committed, concurrentReplay] = await Promise.all([
        repository.enqueueControlCommand(input),
        repository.enqueueControlCommand({
          ...input,
          command: regeneratedCommand,
          event: rehashEvent(event, {
            id: `${fixture.prefix}-cancelled-event-competitor`,
            provider_command_id: regeneratedCommand.id,
          }),
        }),
      ]);
      assert.equal(committed.state, 'succeeded');
      assert.equal(concurrentReplay.id, committed.id);
      assert.equal((await repository.findAttempt(prepared.id))?.lifecycle_state, 'cancelled');
      assert.deepEqual(
        (await repository.listAttemptCommands(prepared.id)).map((row) => [
          row.operation,
          row.state,
          row.last_error_code,
        ]),
        [
          ['submit', 'terminal', 'cancelled_before_submit'],
          ['cancel', 'succeeded', null],
        ],
      );
      assert.deepEqual(
        (await repository.listAttemptEvents(prepared.id)).map((row) => row.event_type),
        ['created', 'cancelled'],
      );
      assert.equal((await repository.enqueueControlCommand(input)).id, committed.id);
    } finally {
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 persists cancel during a submit lease and defers its claim until E3',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const start = makeStart(prerequisite, fixture);
      await repository.startWorkflowSimulation(start);
      const prepared = start.attempts[0]!;
      const claimedSubmit = (await repository.claimCommands({
        lease_owner: 'relational-crashed-submit-worker',
        claimed_at: fixture.later,
        lease_expires_at: fixture.leaseExpiry,
        limit: 1,
        command_kinds: ['submit'],
      }))[0]!;
      const cancelCommand = makeCommand(
        prepared,
        2,
        'cancel',
        `${fixture.prefix}-cancel-during-submit-lease`,
      );
      cancelCommand.provider_idempotency_key = `${prepared.id}:cancel:leased-submit`;
      cancelCommand.command_hash = hashProviderCommand(
        cancelCommand.provider_idempotency_key,
        cancelCommand.command_snapshot,
      );
      const cancelled: ExperimentFoundationExecutionAttemptV2Record = {
        ...prepared,
        lifecycle_state: 'cancelled',
        state_version: 1,
        terminal_reason_code: 'operator_cancelled',
        updated_at: fixture.later,
        terminal_at: fixture.later,
      };
      const cancelEvent = makeHashedEvent({
        id: `${fixture.prefix}-leased-submit-cancel-event`,
        execution_attempt_id: prepared.id,
        event_sequence: 2,
        event_type: 'cancelled',
        prior_state: 'prepared',
        next_state: 'cancelled',
        provider_command_id: cancelCommand.id,
        payload_hash: prepared.provider_payload_hash,
        external_job_ref: null,
        external_job_ref_hash: null,
        event_snapshot: {
          snapshot_schema_version: 'v1',
          reason_code: 'operator_cancelled',
          observed_provider_state: null,
          note: null,
        },
        occurred_at: fixture.later,
      });
      const input = {
        attempt_id: prepared.id,
        expected_attempt_state_version: 0,
        command: cancelCommand,
        event: cancelEvent,
        next_attempt: cancelled,
      };

      const intent = await repository.enqueueControlCommand(input);
      assert.equal(intent.state, 'pending');
      assert.equal((await repository.enqueueControlCommand(input)).id, intent.id);
      assert.equal((await repository.findAttempt(prepared.id))?.lifecycle_state, 'prepared');
      assert.deepEqual(
        (await repository.listAttemptEvents(prepared.id)).map((event) => event.event_type),
        ['created'],
      );
      assert.deepEqual(await repository.claimCommands({
        lease_owner: 'relational-cancel-worker',
        claimed_at: fixture.later,
        lease_expires_at: fixture.leaseExpiry,
        limit: 1,
        command_kinds: ['cancel'],
      }), []);

      const submitted: ExperimentFoundationExecutionAttemptV2Record = {
        ...prepared,
        lifecycle_state: 'submitted',
        state_version: 1,
        external_job_ref: 'relational-job-after-lease',
        external_job_ref_hash: externalJobRefHash('relational-job-after-lease'),
        updated_at: fixture.later,
      };
      const sync = makeCommand(
        submitted,
        3,
        'sync',
        `${fixture.prefix}-sync-after-cancel-intent`,
      );
      await repository.commitCommandOutcome({
        command_id: claimedSubmit.id,
        lease_owner: 'relational-crashed-submit-worker',
        expected_lease_version: claimedSubmit.lease_version,
        committed_at: fixture.later,
        response_hash: hash('r'),
        expected_attempt_state_version: 0,
        next_attempt: submitted,
        event: makeEvent(prepared, submitted, claimedSubmit.id, fixture.later),
        next_command: sync,
      });
      const claimedCancel = (await repository.claimCommands({
        lease_owner: 'relational-cancel-worker',
        claimed_at: fixture.later,
        lease_expires_at: fixture.leaseExpiry,
        limit: 1,
        command_kinds: ['cancel'],
      }))[0]!;
      assert.equal(claimedCancel.id, intent.id);
      assert.equal(claimedCancel.command_sequence, 2);
      assert.equal((await prisma.experimentFoundationProviderCommandV2.findUnique({
        where: { id: sync.id },
        select: { commandSequence: true },
      }))?.commandSequence, 3);
    } finally {
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma EF execution v2 cleanup migration restricts immutable updates and closes exact schema domains',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'packb');
    const fixture = await seedPackAPrerequisite(prisma);
    const repository = new PrismaExperimentFoundationExecutionV2Repository(prisma);

    try {
      const prerequisite = await repository.resolveRunPrerequisite(fixture.runId);
      assert.ok(prerequisite);
      const start = makeStart(prerequisite, fixture);
      const acknowledgementIdDrift = structuredClone(start);
      acknowledgementIdDrift.expected_head_acknowledgement_inbox_id =
        `${start.expected_head_acknowledgement_inbox_id}-drift`;
      await assert.rejects(
        repository.startWorkflowSimulation(acknowledgementIdDrift),
        reason('EXECUTION_HEAD_ACK_REQUIRED'),
      );
      const acknowledgementHashDrift = structuredClone(start);
      acknowledgementHashDrift.expected_head_acknowledgement_payload_hash = hash('x');
      await assert.rejects(
        repository.startWorkflowSimulation(acknowledgementHashDrift),
        reason('EXECUTION_HEAD_ACK_REQUIRED'),
      );
      assert.equal(await prisma.experimentFoundationExecutionAttemptV2.count({
        where: { runId: fixture.runId },
      }), 0);

      await repository.startWorkflowSimulation(start);
      const prepared = start.attempts[0]!;
      const submit = start.commands[0]!;

      const activeRealFenceInput = {
        implementation_project_id: prepared.implementation_project_id,
        validation_cycle_id: prepared.validation_cycle_id,
      };
      assert.deepEqual(
        await repository.listCycleActiveRealAttemptRefs(activeRealFenceInput),
        [],
      );
      await assert.rejects(
        prisma.experimentFoundationExecutionAttemptV2.create({
          data: {
            ...attemptData(prepared),
            id: `${fixture.prefix}-rejected-real-attempt`,
            attemptSequence: 2,
            workflowBusinessKey: `${fixture.prefix}-rejected-real-workflow`,
            providerIdempotencyKey: `${fixture.prefix}-rejected-real-provider`,
            executionMode: 'real',
          },
        }),
        databaseCheck('ef_execution_attempt_mode_check'),
      );
      assert.deepEqual(
        await repository.listCycleActiveRealAttemptRefs(activeRealFenceInput),
        [],
      );

      for (const data of [
        {
          lifecycleState: 'prepared',
          terminalReasonCode: 'simulation_succeeded',
          terminalAt: null,
        },
        {
          lifecycleState: 'succeeded',
          terminalReasonCode: 'simulation_failed',
          terminalAt: new Date(fixture.later),
        },
        {
          lifecycleState: 'cancelled',
          terminalReasonCode: 'simulation_succeeded',
          terminalAt: new Date(fixture.later),
        },
        {
          lifecycleState: 'failed',
          terminalReasonCode: 'operator_cancelled',
          terminalAt: new Date(fixture.later),
        },
      ] as const) {
        await assert.rejects(prisma.experimentFoundationExecutionAttemptV2.update({
          where: { id: prepared.id },
          data,
        }));
      }
      assert.equal(
        (await prisma.experimentFoundationExecutionAttemptV2.findUniqueOrThrow({
          where: { id: prepared.id },
        })).lifecycleState,
        'prepared',
      );

      const refId = `${fixture.prefix}-tampered-job`;
      const refHash = externalJobRefHash(refId);
      await prisma.experimentFoundationExecutionAttemptV2.update({
        where: { id: prepared.id },
        data: {
          externalJobRefSchemaVersion: 'v1',
          externalJobRefJson: exactExternalJobRef(refId),
          externalJobRefHash: hash('x'),
        },
      });
      await assert.rejects(
        repository.findAttempt(prepared.id),
        reason('EXECUTION_SCOPE_DRIFT'),
      );
      await prisma.experimentFoundationExecutionAttemptV2.update({
        where: { id: prepared.id },
        data: {
          externalJobRefJson: {
            ...exactExternalJobRef(refId),
            unexpected: true,
          },
          externalJobRefHash: refHash,
        },
      });
      await assert.rejects(
        repository.findAttempt(prepared.id),
        reason('EXECUTION_SCOPE_DRIFT'),
      );
      await prisma.experimentFoundationExecutionAttemptV2.update({
        where: { id: prepared.id },
        data: {
          externalJobRefSchemaVersion: null,
          externalJobRefJson: Prisma.DbNull,
          externalJobRefHash: null,
        },
      });

      await prisma.experimentFoundationProviderCommandV2.update({
        where: { id: submit.id },
        data: {
          externalJobRefJson: exactExternalJobRef(refId),
          externalJobRefHash: hash('x'),
        },
      });
      await assert.rejects(
        repository.listAttemptCommands(prepared.id),
        reason('PROVIDER_RESPONSE_INVALID'),
      );
      await prisma.experimentFoundationProviderCommandV2.update({
        where: { id: submit.id },
        data: {
          externalJobRefJson: {
            ...exactExternalJobRef(refId),
            unexpected: true,
          },
          externalJobRefHash: refHash,
        },
      });
      await assert.rejects(
        repository.listAttemptCommands(prepared.id),
        reason('PROVIDER_RESPONSE_INVALID'),
      );
      await prisma.experimentFoundationProviderCommandV2.update({
        where: { id: submit.id },
        data: {
          externalJobRefJson: Prisma.DbNull,
          externalJobRefHash: null,
        },
      });

      await assert.rejects(prisma.experimentFoundationRunV2.update({
        where: { id: fixture.runId },
        data: { runManifestHash: hash('x') },
      }));
      assert.equal(
        (await prisma.experimentFoundationRunV2.findUniqueOrThrow({
          where: { id: fixture.runId },
        })).runManifestHash,
        prerequisite.run.run_manifest_hash,
      );

      const indexes = await prisma.$queryRaw<Array<{ index_name: string }>>`
        SELECT indexname AS index_name
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN (
            'ExperimentFoundationProviderPayloadV2',
            'ExperimentFoundationExecutionAttemptV2',
            'ExperimentFoundationExecutionAttemptEventV2',
            'ExperimentFoundationProviderCommandV2',
            'ExperimentFoundationCollectionAttemptV2',
            'ExperimentFoundationProvisionalOutputV2'
          )
        ORDER BY indexname
      `;
      assert.deepEqual(
        indexes.map((row) => row.index_name),
        [...EXPECTED_PACK_B_INDEXES].sort(),
      );

      const collectionSequenceColumns = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) AS count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ExperimentFoundationCollectionAttemptV2'
          AND column_name = 'collectionSequence'
      `;
      assert.equal(Number(collectionSequenceColumns[0]?.count ?? 0), 0);

      const removedFoundationPlaceholders = await prisma.$queryRaw<Array<{
        table_name: string;
        column_name: string;
      }>>`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (
              table_name = 'ExperimentFoundationVersionLockV2'
              AND column_name IN ('lockSchemaVersion', 'resolvedLockJson')
            )
            OR (
              table_name IN (
                'ExperimentFoundationDatasetV2',
                'ExperimentFoundationDataPolicyV2',
                'ExperimentFoundationMetricDefinitionV2',
                'ExperimentFoundationBenchmarkV2',
                'ExperimentFoundationEvaluationProtocolV2'
              )
              AND column_name IN ('draftSchemaVersion', 'draftHash')
            )
          )
        ORDER BY table_name, column_name
      `;
      assert.deepEqual(removedFoundationPlaceholders, []);

      const foreignKeys = await prisma.$queryRaw<Array<{
        constraint_name: string;
        update_action: string;
      }>>`
        SELECT conname AS constraint_name, confupdtype::text AS update_action
        FROM pg_constraint
        WHERE contype = 'f'
          AND conrelid IN (
            '"ExperimentFoundationProviderPayloadV2"'::regclass,
            '"ExperimentFoundationExecutionAttemptV2"'::regclass,
            '"ExperimentFoundationExecutionAttemptEventV2"'::regclass,
            '"ExperimentFoundationProviderCommandV2"'::regclass,
            '"ExperimentFoundationCollectionAttemptV2"'::regclass,
            '"ExperimentFoundationProvisionalOutputV2"'::regclass
          )
        ORDER BY conname
      `;
      assert.equal(foreignKeys.length, 15);
      assert.ok(foreignKeys.every((row) => row.update_action === 'r'));

      const checkRows = await prisma.$queryRaw<Array<{
        constraint_name: string;
        definition: string;
      }>>`
        SELECT conname AS constraint_name, pg_get_constraintdef(oid) AS definition
        FROM pg_constraint
        WHERE conname IN (
          'ef_execution_attempt_terminal_reason_check',
          'ef_collection_attempt_state_check',
          'ef_attempt_event_type_check'
        )
        ORDER BY conname
      `;
      const checks = new Map(
        checkRows.map((row) => [row.constraint_name, row.definition]),
      );
      assert.doesNotMatch(
        checks.get('ef_execution_attempt_terminal_reason_check') ?? '',
        /collection_failed/,
      );
      assert.match(
        checks.get('ef_execution_attempt_terminal_reason_check') ?? '',
        /simulation_succeeded/,
      );
      assert.match(
        checks.get('ef_execution_attempt_terminal_reason_check') ?? '',
        /operator_cancelled/,
      );
      assert.match(
        checks.get('ef_execution_attempt_terminal_reason_check') ?? '',
        /provider_response_invalid/,
      );
      assert.doesNotMatch(
        checks.get('ef_collection_attempt_state_check') ?? '',
        /collecting/,
      );
      assert.doesNotMatch(checks.get('ef_attempt_event_type_check') ?? '', /reconciled/);
      assert.match(
        checks.get('ef_attempt_event_type_check') ?? '',
        /collection_failed/,
      );
    } finally {
      await cleanup(prisma, fixture.prefix);
      await prisma.$disconnect();
    }
  },
);

interface Fixture {
  prefix: string;
  now: string;
  later: string;
  leaseExpiry: string;
  runId: string;
  runCellId: string;
  taskId: string;
  payloadId: string;
  workflowKey: string;
}

async function seedPackAPrerequisite(
  prisma: PrismaClient,
  cellCount = 1,
): Promise<Fixture> {
  const prefix = `ef-execution-rel-${randomUUID()}`;
  const now = '2026-07-13T00:00:00.000Z';
  const later = '2026-07-13T00:01:00.000Z';
  const leaseExpiry = '2026-07-13T00:10:00.000Z';
  const targetEventId = `${prefix}-target-event`;
  const dependencyEventId = `${prefix}-dependency-event`;
  const readinessId = `${prefix}-readiness`;
  const versionLockId = `${prefix}-lock`;
  const recipeId = `${prefix}-recipe`;
  const taskId = `${prefix}-task`;
  const runId = `${prefix}-run`;
  const runCellId = `${prefix}-cell`;
  const revisionId = `${prefix}-pi-revision`;
  const branchId = `${prefix}-branch`;
  const branchKey = `${prefix}-main`;
  const projectId = `${prefix}-project`;
  const cycleId = `${prefix}-cycle`;
  const targetHash = fixtureHash(prefix, 'target');
  const dependencyHash = fixtureHash(prefix, 'dependency');
  const evaluatorProfileHash = fixtureHash(prefix, 'evaluator-profile');
  const target: ExperimentFoundationV2ExactAssetRevisionRef = {
    asset_type: 'EvaluationProtocol',
    logical_id: `${prefix}-protocol`,
    revision_id: `${prefix}-protocol-revision`,
    revision_sequence: 1,
    content_hash: targetHash,
  };
  const dependency: ExperimentFoundationV2ExactAssetRevisionRef = {
    asset_type: 'Dataset',
    logical_id: `${prefix}-dataset`,
    revision_id: `${prefix}-dataset-revision`,
    revision_sequence: 1,
    content_hash: dependencyHash,
  };
  const readinessDependencies = [dependency];
  const readinessDependencyManifestHash =
    serverHashExperimentFoundationV2ReadinessDependencyManifest(readinessDependencies);
  const qualificationSnapshot = {
    target_lifecycle_sequence: 1,
    dependency_count: readinessDependencies.length,
    all_dependencies_active: true,
    all_required_rules_supported: true,
  };
  const readinessHash = serverHashExperimentFoundationV2ReadinessAttestation({
    target,
    status: 'passed',
    evaluator_profile_version: 'v1',
    evaluator_profile_hash: evaluatorProfileHash,
    dependency_manifest_hash: readinessDependencyManifestHash,
    qualification_snapshot: qualificationSnapshot,
    blockers: [],
  });
  const branchFrame = {
    frame_schema_version: 'v1' as const,
    display_name: 'Relational Pack B fixture',
    scientific_intent: 'Verify immutable Pack A lineage before E1.',
    comparison_role: 'primary' as const,
    parent_branch_key: null,
  };
  const branchFrameHash = serverHashPaperImplementationExperimentV2BranchFrame(branchFrame);
  const assetDependencies = [target, dependency];
  const workOrderRevision = {
    work_order_schema_version: 'v1' as const,
    title: 'Relational execution fixture',
    objective: 'Materialize an exact simulation-only Run.',
    readiness_attestation_id: readinessId,
    readiness_attestation_hash: readinessHash,
    asset_dependencies: assetDependencies,
    run_policy: { max_attempts_per_cell: 2, timeout_seconds: 60 },
  };
  const revisionHash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    workOrderRevision,
  );
  const ordinals = Array.from({ length: cellCount }, (_, index) => index + 1);
  const exactCells = ordinals.map((ordinal) => {
    const semanticCell = {
      cell_key: `cell-${ordinal}`,
      seed: ordinal,
      repeat_index: 0,
      parameters: [{ name: 'ordinal', value: ordinal }],
      required_result_contract: { metrics: [], artifacts: [] },
    };
    return {
      ordinal,
      work_order_cell_id: ordinal === 1
        ? `${prefix}-pi-cell`
        : `${prefix}-pi-cell-${ordinal}`,
      ...semanticCell,
      cell_hash: serverHashPaperImplementationExperimentV2Cell(semanticCell),
    };
  });
  const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(exactCells);
  const approvedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: branchFrameHash,
    work_order_revision_hash: revisionHash,
    cell_plan_hash: cellPlanHash,
  });
  const admittedPayload: WorkOrderRevisionAdmittedEventV1['payload'] = {
    admission_id: `${prefix}-admission`,
    branch_frame_hash: branchFrameHash,
    work_order_revision: workOrderRevision,
    readiness_attestation_id: readinessId,
    readiness_attestation_hash: readinessHash,
    asset_dependencies: assetDependencies,
    exact_cells: exactCells,
  };
  const admittedEvent: WorkOrderRevisionAdmittedEventV1 = {
    event_id: `${prefix}-admitted-event`,
    event_type: 'WorkOrderRevisionAdmitted',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: now,
    correlation_id: `${prefix}-correlation`,
    causation_id: `${prefix}-admission-request`,
    business_idempotency_key: `${prefix}-admission-business`,
    implementation_project_id: projectId,
    validation_cycle_id: cycleId,
    branch_id: branchId,
    branch_key: branchKey,
    work_order_revision_id: revisionId,
    work_order_revision_hash: revisionHash,
    branch_revision_sequence: 1,
    cell_plan_hash: cellPlanHash,
    approved_plan_hash: approvedPlanHash,
    payload_hash: serverHashExperimentV2EventPayload(
      'WorkOrderRevisionAdmitted',
      'v1',
      admittedPayload,
    ),
    payload: admittedPayload,
  };

  await prisma.experimentFoundationAssetLifecycleEventV2.createMany({ data: [
    {
      id: targetEventId,
      assetType: 'EvaluationProtocol',
      assetId: target.logical_id,
      assetRevisionId: target.revision_id,
      assetRevisionSequence: 1,
      assetRevisionHash: targetHash,
      eventSequence: 1,
      eventType: 'activated',
      eventSchemaVersion: 'v1',
      reasonCode: 'relational_fixture',
      actorType: 'server',
      occurredAt: new Date(now),
    },
    {
      id: dependencyEventId,
      assetType: 'Dataset',
      assetId: dependency.logical_id,
      assetRevisionId: dependency.revision_id,
      assetRevisionSequence: 1,
      assetRevisionHash: dependencyHash,
      eventSequence: 1,
      eventType: 'activated',
      eventSchemaVersion: 'v1',
      reasonCode: 'relational_fixture',
      actorType: 'server',
      occurredAt: new Date(now),
    },
  ] });
  await prisma.experimentFoundationAssetLifecycleProjectionV2.createMany({ data: [
    {
      id: `${prefix}-target-projection`,
      assetType: 'EvaluationProtocol',
      assetId: target.logical_id,
      currentRevisionId: target.revision_id,
      currentRevisionSequence: 1,
      currentRevisionHash: targetHash,
      lifecycleSequence: 1,
      lifecycleStatus: 'active',
      locationAvailable: true,
      stateVersion: 1,
      lastEventId: targetEventId,
      updatedAt: new Date(now),
    },
    {
      id: `${prefix}-dependency-projection`,
      assetType: 'Dataset',
      assetId: dependency.logical_id,
      currentRevisionId: dependency.revision_id,
      currentRevisionSequence: 1,
      currentRevisionHash: dependencyHash,
      lifecycleSequence: 1,
      lifecycleStatus: 'active',
      locationAvailable: true,
      stateVersion: 1,
      lastEventId: dependencyEventId,
      updatedAt: new Date(now),
    },
  ] });
  await prisma.experimentFoundationReadinessAttestationV2.create({ data: {
    id: readinessId,
    targetAssetType: 'EvaluationProtocol',
    targetAssetId: target.logical_id,
    targetRevisionId: target.revision_id,
    targetRevisionSequence: 1,
    targetRevisionHash: targetHash,
    evaluatorProfileVersion: 'v1',
    evaluatorProfileHash,
    dependencyManifestHash: readinessDependencyManifestHash,
    outcome: 'passed',
    qualificationSnapshotJson: qualificationSnapshot,
    blockerSnapshotJson: [],
    attestationHash: readinessHash,
    attestedAt: new Date(now),
  } });
  await prisma.experimentFoundationReadinessDependencyV2.create({ data: {
    id: `${prefix}-readiness-dependency`,
    attestationId: readinessId,
    ordinal: 1,
    dependencyRole: 'Dataset',
    dependencyAssetType: 'Dataset',
    dependencyAssetId: dependency.logical_id,
    dependencyRevisionId: dependency.revision_id,
    dependencyRevisionSequence: 1,
    dependencyRevisionHash: dependencyHash,
  } });
  const materializationKey = `${revisionId}:${approvedPlanHash}`;
  const versionLockDependencies = assetDependencies.map((asset, index) => ({
    version_lock_id: versionLockId,
    ordinal: index + 1,
    dependency: asset,
  }));
  const versionLockDependencyManifestHash =
    serverHashExperimentFoundationV2VersionLockDependencyManifest(assetDependencies);
  const lockHash = serverHashExperimentFoundationV2VersionLock({
    materialization_key: materializationKey,
    readiness_attestation_id: readinessId,
    readiness_attestation_hash: readinessHash,
    dependency_manifest_hash: versionLockDependencyManifestHash,
    dependencies: versionLockDependencies.map(({ ordinal, dependency: exactDependency }) => ({
      ordinal,
      dependency: exactDependency,
    })),
  });
  const recipeSnapshot = {
    recipe_schema_version: 'v1' as const,
    entrypoint: 'fixture.mjs',
    arguments: [],
    environment_keys: [],
  };
  const recipeHash = serverHashExperimentFoundationV2RunRecipe({
    materialization_key: materializationKey,
    version_lock_id: versionLockId,
    readiness_attestation_id: readinessId,
    recipe_snapshot: recipeSnapshot,
  });
  const taskSpecs = exactCells.map((cell) => {
    const taskMaterializationKey = `${materializationKey}:cell:${cell.ordinal}`;
    const commandSnapshot = { command: 'run', arguments: [] };
    const ioSnapshot: ExperimentFoundationTrainingTaskSpecV2['io_snapshot'] = {
      input_keys: ['input'],
      output_keys: ['simulation_lifecycle_trace'],
    };
    const resourceSnapshot = { cpu_cores: 1, memory_mb: 128 };
    const retrySnapshot = { max_attempts: 2 };
    return {
      training_task_spec_id: cell.ordinal === 1 ? taskId : `${prefix}-task-${cell.ordinal}`,
      materialization_key: taskMaterializationKey,
      run_recipe_id: recipeId,
      external_pi_work_order_revision_id: revisionId,
      external_pi_work_order_revision_hash: revisionHash,
      external_pi_cell_id: cell.work_order_cell_id,
      external_pi_cell_hash: cell.cell_hash,
      command_snapshot: commandSnapshot,
      io_snapshot: {
        input_keys: [...ioSnapshot.input_keys],
        output_keys: [...ioSnapshot.output_keys],
      },
      resource_snapshot: resourceSnapshot,
      retry_snapshot: retrySnapshot,
      task_spec_hash: serverHashExperimentFoundationV2TrainingTaskSpec({
        materialization_key: taskMaterializationKey,
        run_recipe_id: recipeId,
        external_pi_work_order_revision_id: revisionId,
        external_pi_work_order_revision_hash: revisionHash,
        external_pi_cell_id: cell.work_order_cell_id,
        external_pi_cell_hash: cell.cell_hash,
        admitted_cell: cell,
        command_snapshot: commandSnapshot,
        io_snapshot: ioSnapshot,
        resource_snapshot: resourceSnapshot,
        retry_snapshot: retrySnapshot,
      }),
      created_at: now,
    };
  });
  const runCells = exactCells.map((cell, index) => ({
    run_cell_id: cell.ordinal === 1 ? runCellId : `${prefix}-cell-${cell.ordinal}`,
    run_id: runId,
    ordinal: cell.ordinal,
    cell_key: cell.cell_key,
    external_pi_cell_id: cell.work_order_cell_id,
    external_pi_cell_hash: cell.cell_hash,
    training_task_spec_id: taskSpecs[index]!.training_task_spec_id,
    training_task_spec_hash: taskSpecs[index]!.task_spec_hash,
    seed: cell.seed,
    repeat_index: cell.repeat_index,
  }));
  const runManifestHash = serverHashExperimentFoundationV2RunManifest(runCells);
  const frozenPayload: RunManifestFrozenEventV1['payload'] = {
    source_event_id: admittedEvent.event_id,
    version_lock_id: versionLockId,
    version_lock_hash: lockHash,
    run_recipe_id: recipeId,
    run_recipe_hash: recipeHash,
    run_id: runId,
    run_manifest_hash: runManifestHash,
    task_spec_bindings: runCells.map((cell) => ({
      ordinal: cell.ordinal,
      work_order_cell_id: cell.external_pi_cell_id,
      cell_key: cell.cell_key,
      cell_hash: cell.external_pi_cell_hash,
      training_task_spec_id: cell.training_task_spec_id,
      training_task_spec_hash: cell.training_task_spec_hash,
    })),
  };
  const frozenEvent: RunManifestFrozenEventV1 = {
    event_id: `${prefix}-run-frozen-event`,
    event_type: 'RunManifestFrozen',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: now,
    correlation_id: admittedEvent.correlation_id,
    causation_id: admittedEvent.event_id,
    business_idempotency_key: admittedEvent.business_idempotency_key,
    implementation_project_id: projectId,
    validation_cycle_id: cycleId,
    branch_id: branchId,
    branch_key: branchKey,
    work_order_revision_id: revisionId,
    work_order_revision_hash: revisionHash,
    branch_revision_sequence: 1,
    cell_plan_hash: cellPlanHash,
    approved_plan_hash: approvedPlanHash,
    payload_hash: serverHashExperimentV2EventPayload('RunManifestFrozen', 'v1', frozenPayload),
    payload: frozenPayload,
  };
  const materialization: ExperimentFoundationV2MaterializationBundle = {
    inbox: {
      inbox_id: `${prefix}-materializer-inbox`,
      consumer_name: EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
      source_event_id: admittedEvent.event_id,
      business_idempotency_key: admittedEvent.business_idempotency_key,
      payload_hash: admittedEvent.payload_hash,
      source_event_hash: serverHashExperimentV2EventEnvelope(admittedEvent),
      scope: {
        implementation_project_id: projectId,
        validation_cycle_id: cycleId,
        branch_id: branchId,
        branch_key: branchKey,
        work_order_revision_id: revisionId,
        work_order_revision_hash: revisionHash,
        branch_revision_sequence: 1,
        cell_plan_hash: cellPlanHash,
        approved_plan_hash: approvedPlanHash,
      },
      outcome: 'processed',
      reason_code: null,
      processed_at: now,
    },
    version_lock: {
      version_lock_id: versionLockId,
      materialization_key: materializationKey,
      readiness_attestation_id: readinessId,
      readiness_attestation_hash: readinessHash,
      dependency_manifest_hash: versionLockDependencyManifestHash,
      dependency_count: versionLockDependencies.length,
      lock_hash: lockHash,
      created_at: now,
    },
    version_lock_dependencies: versionLockDependencies,
    run_recipe: {
      run_recipe_id: recipeId,
      materialization_key: materializationKey,
      version_lock_id: versionLockId,
      readiness_attestation_id: readinessId,
      recipe_snapshot: recipeSnapshot,
      recipe_hash: recipeHash,
      created_at: now,
    },
    task_specs: taskSpecs,
    run: {
      run_id: runId,
      external_pi_work_order_revision_id: revisionId,
      external_pi_work_order_revision_hash: revisionHash,
      external_pi_branch_revision_sequence: 1,
      run_manifest_hash: runManifestHash,
      cell_count: runCells.length,
      frozen_at: now,
    },
    run_cells: runCells,
    outbox: {
      outbox_id: `${prefix}-run-frozen-outbox`,
      aggregate_transition_key: 'run-manifest-frozen',
      event: frozenEvent,
      created_at: now,
    },
  };
  const spineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  await spineRepository.commitMaterialization(materialization, admittedEvent);
  const headEventPayload: BranchHeadAdvancedEventV1['payload'] = {
    source_event_id: frozenEvent.event_id,
    run_id: runId,
    run_manifest_hash: runManifestHash,
    accepted_revision_sequence: 1,
    branch_state_version: 2,
  };
  const headEvent: BranchHeadAdvancedEventV1 = {
    event_id: `${prefix}-head-event`,
    event_type: 'BranchHeadAdvanced',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: now,
    correlation_id: `${prefix}-correlation`,
    causation_id: frozenEvent.event_id,
    business_idempotency_key: `${prefix}-head-business`,
    implementation_project_id: projectId,
    validation_cycle_id: cycleId,
    branch_id: branchId,
    branch_key: branchKey,
    work_order_revision_id: revisionId,
    work_order_revision_hash: revisionHash,
    branch_revision_sequence: 1,
    cell_plan_hash: cellPlanHash,
    approved_plan_hash: approvedPlanHash,
    payload_hash: serverHashExperimentV2EventPayload(
      'BranchHeadAdvanced',
      'v1',
      headEventPayload,
    ),
    payload: headEventPayload,
  };
  const acknowledgement: ExperimentFoundationIntegrationInboxV2 = {
    inbox_id: `${prefix}-head-ack`,
    consumer_name: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
    source_event_id: headEvent.event_id,
    business_idempotency_key: headEvent.business_idempotency_key,
    payload_hash: headEvent.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(headEvent),
    scope: {
      implementation_project_id: projectId,
      validation_cycle_id: cycleId,
      branch_id: branchId,
      branch_key: branchKey,
      work_order_revision_id: revisionId,
      work_order_revision_hash: revisionHash,
      branch_revision_sequence: 1,
      cell_plan_hash: cellPlanHash,
      approved_plan_hash: approvedPlanHash,
    },
    outcome: 'processed',
    reason_code: null,
    processed_at: now,
  };
  await spineRepository.commitAcknowledgement(acknowledgement, headEvent);
  return {
    prefix,
    now,
    later,
    leaseExpiry,
    runId,
    runCellId,
    taskId,
    payloadId: `${prefix}-payload`,
    workflowKey: `${prefix}-workflow`,
  };
}

function makeStart(
  prerequisite: NonNullable<Awaited<ReturnType<PrismaExperimentFoundationExecutionV2Repository['resolveRunPrerequisite']>>>,
  fixture: Fixture,
): ExperimentFoundationExecutionV2StartInput {
  const records = prerequisite.cells.map((cell) => {
    const ordinal = cell.run_cell.ordinal;
    const suffix = ordinal === 1 ? '' : `-${ordinal}`;
    const payload: ExperimentFoundationProviderPayloadV2Record = {
      id: `${fixture.payloadId}${suffix}`,
      materialization_key: `${fixture.prefix}-payload${suffix}-materialization`,
      run_id: fixture.runId,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: cell.run_cell.run_cell_id,
      cell_key: cell.run_cell.cell_key,
      training_task_spec_id: cell.task_spec.training_task_spec_id,
      training_task_spec_hash: cell.task_spec.task_spec_hash,
      payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1',
      adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
      execution_mode: 'simulation',
      provenance: 'non_production_fake_provider',
      simulation_profile_version: 'v1',
      redacted_manifest: {
        manifest_schema_version: 'v1',
        payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1',
        adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
        simulation_profile_version: 'v1',
        job_name: `${fixture.prefix}-fake-job${suffix}`,
        source_binding: {
          run_id: fixture.runId,
          run_manifest_hash: prerequisite.run.run_manifest_hash,
          run_cell_id: cell.run_cell.run_cell_id,
          cell_key: cell.run_cell.cell_key,
          training_task_spec_id: cell.task_spec.training_task_spec_id,
          training_task_spec_hash: cell.task_spec.task_spec_hash,
        },
        command_summary: { command: 'python', argument_count: 2 },
        resource_summary: { cpu_cores: 2, memory_mb: 4096 },
        input_keys: ['dataset'],
        output_keys: ['simulation_lifecycle_trace'],
        redacted_fields: [
          'canonical_payload_bytes',
          'profile.workspace_id',
          'simulated_job.arguments',
        ],
      },
      payload_hash: hash('y'),
      payload_byte_size: 100,
      created_at: fixture.now,
    };
    const attempt: ExperimentFoundationExecutionAttemptV2Record = {
      id: `${fixture.prefix}-attempt${suffix}`,
      implementation_project_id: prerequisite.implementation_project_id,
      validation_cycle_id: prerequisite.validation_cycle_id,
      external_pi_branch_id: prerequisite.external_pi_branch_id,
      external_pi_work_order_revision_id: prerequisite.run.external_pi_work_order_revision_id,
      external_pi_work_order_revision_hash: prerequisite.run.external_pi_work_order_revision_hash,
      external_pi_revision_sequence: prerequisite.run.external_pi_branch_revision_sequence,
      run_id: fixture.runId,
      run_manifest_hash: prerequisite.run.run_manifest_hash,
      run_cell_id: cell.run_cell.run_cell_id,
      cell_key: cell.run_cell.cell_key,
      training_task_spec_id: cell.task_spec.training_task_spec_id,
      training_task_spec_hash: cell.task_spec.task_spec_hash,
      provider_payload_id: payload.id,
      provider_payload_hash: payload.payload_hash,
      head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
      attempt_sequence: 1,
      workflow_business_key: fixture.workflowKey,
      workflow_request_hash: hash('f'),
      execution_mode: 'simulation',
      provenance: 'non_production_fake_provider',
      provider_idempotency_key: `${fixture.prefix}-attempt${suffix}-provider`,
      lifecycle_state: 'prepared',
      state_version: 0,
      external_job_ref: null,
      external_job_ref_hash: null,
      terminal_reason_code: null,
      created_at: fixture.now,
      updated_at: fixture.now,
      terminal_at: null,
    };
    const event = makeHashedEvent({
      id: `${fixture.prefix}-created-event${suffix}`,
      execution_attempt_id: attempt.id,
      event_sequence: 1,
      event_type: 'created',
      prior_state: null,
      next_state: 'prepared',
      provider_command_id: null,
      payload_hash: payload.payload_hash,
      external_job_ref: null,
      external_job_ref_hash: null,
      event_snapshot: {
        snapshot_schema_version: 'v1',
        reason_code: null,
        observed_provider_state: null,
        note: null,
      },
      occurred_at: fixture.now,
    });
    const command = makeCommand(attempt, 1, 'submit', `${fixture.prefix}-submit${suffix}`);
    return { payload, attempt, event, command };
  });
  return {
    run_id: fixture.runId,
    business_idempotency_key: fixture.workflowKey,
    request_hash: hash('f'),
    expected_run_manifest_hash: prerequisite.run.run_manifest_hash,
    expected_head_acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
    expected_head_acknowledgement_payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
    expected_readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
    expected_readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
    payloads: records.map((record) => record.payload),
    attempts: records.map((record) => record.attempt),
    events: records.map((record) => record.event),
    commands: records.map((record) => record.command),
  };
}

function regenerateStartIdentities(
  source: ExperimentFoundationExecutionV2StartInput,
  suffix: string,
): ExperimentFoundationExecutionV2StartInput {
  const next = structuredClone(source);
  const payload = next.payloads[0]!;
  const attempt = next.attempts[0]!;
  const event = next.events[0]!;
  const command = next.commands[0]!;
  payload.id = `${payload.id}-${suffix}`;
  attempt.id = `${attempt.id}-${suffix}`;
  attempt.provider_payload_id = payload.id;
  attempt.provider_idempotency_key = `${attempt.id}:submit:1`;
  event.id = `${event.id}-${suffix}`;
  event.execution_attempt_id = attempt.id;
  command.id = `${command.id}-${suffix}`;
  command.execution_attempt_id = attempt.id;
  command.provider_idempotency_key = attempt.provider_idempotency_key;
  return next;
}

function makeEvent(
  prior: ExperimentFoundationExecutionAttemptV2Record,
  next: ExperimentFoundationExecutionAttemptV2Record,
  commandId: string,
  at: string,
): ExperimentFoundationExecutionAttemptEventV2Record {
  return makeHashedEvent({
    id: `${next.id}-submitted-event`,
    execution_attempt_id: next.id,
    event_sequence: 2,
    event_type: 'submitted',
    prior_state: prior.lifecycle_state,
    next_state: next.lifecycle_state,
    provider_command_id: commandId,
    payload_hash: next.provider_payload_hash,
    external_job_ref: next.external_job_ref,
    external_job_ref_hash: next.external_job_ref_hash,
    event_snapshot: {
      snapshot_schema_version: 'v1',
      reason_code: null,
      observed_provider_state: null,
      note: null,
    },
    occurred_at: at,
  });
}

function makeCommand(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  sequence: number,
  operation: 'submit' | 'sync' | 'cancel',
  id: string,
): ExperimentFoundationProviderCommandV2Record {
  const commandSnapshot = {
    command_schema_version: 'v1',
    operation,
    provider_payload_id: attempt.provider_payload_id,
    provider_payload_hash: attempt.provider_payload_hash,
    external_job_ref: attempt.external_job_ref === null
      ? null
      : exactExternalJobRef(attempt.external_job_ref),
    cancellation_reason: operation === 'cancel' ? 'operator_cancelled' : null,
  };
  const providerIdempotencyKey = `${attempt.id}:${operation}:${sequence}`;
  return {
    id,
    execution_attempt_id: attempt.id,
    collection_attempt_id: null,
    command_sequence: sequence,
    operation,
    command_snapshot: commandSnapshot,
    command_hash: hashProviderCommand(providerIdempotencyKey, commandSnapshot),
    provider_idempotency_key: providerIdempotencyKey,
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
    created_at: attempt.updated_at,
    updated_at: attempt.updated_at,
    completed_at: null,
  };
}

function hashProviderCommand(
  providerIdempotencyKey: string,
  commandSnapshot: ExperimentFoundationProviderCommandV2Record['command_snapshot'],
): string {
  return serverHashExperimentFoundationProviderCommandV2({
    provider_idempotency_key: providerIdempotencyKey,
    command_snapshot: commandSnapshot,
  });
}

function makeHashedEvent(
  event: Omit<ExperimentFoundationExecutionAttemptEventV2Record, 'event_hash'>,
): ExperimentFoundationExecutionAttemptEventV2Record {
  return {
    ...event,
    event_hash: serverHashExperimentFoundationExecutionAttemptEventV2({
      execution_attempt_id: event.execution_attempt_id,
      event_sequence: event.event_sequence,
      event_type: event.event_type,
      prior_state: event.prior_state,
      next_state: event.next_state,
      provider_command_id: event.provider_command_id,
      payload_hash: event.payload_hash,
      external_job_ref: event.external_job_ref,
      external_job_ref_hash: event.external_job_ref_hash,
      event_snapshot: event.event_snapshot,
      occurred_at: event.occurred_at,
    }),
  };
}

function rehashEvent(
  event: ExperimentFoundationExecutionAttemptEventV2Record,
  overrides: Partial<Omit<ExperimentFoundationExecutionAttemptEventV2Record, 'event_hash'>>,
): ExperimentFoundationExecutionAttemptEventV2Record {
  const { event_hash: _discardedHash, ...unhashed } = event;
  return makeHashedEvent({ ...unhashed, ...overrides });
}

function attemptData(record: ExperimentFoundationExecutionAttemptV2Record) {
  return {
    id: record.id,
    externalPiImplementationProjectId: record.implementation_project_id,
    externalPiValidationCycleId: record.validation_cycle_id,
    externalPiBranchId: record.external_pi_branch_id,
    externalPiWorkOrderRevisionId: record.external_pi_work_order_revision_id,
    externalPiWorkOrderRevisionHash: record.external_pi_work_order_revision_hash,
    externalPiRevisionSequence: record.external_pi_revision_sequence,
    runId: record.run_id,
    runManifestHash: record.run_manifest_hash,
    runCellId: record.run_cell_id,
    cellKey: record.cell_key,
    trainingTaskSpecId: record.training_task_spec_id,
    trainingTaskSpecHash: record.training_task_spec_hash,
    providerPayloadId: record.provider_payload_id,
    providerPayloadHash: record.provider_payload_hash,
    headAcknowledgementInboxId: record.head_acknowledgement_inbox_id,
    attemptSequence: record.attempt_sequence,
    workflowBusinessKey: record.workflow_business_key,
    workflowRequestHash: record.workflow_request_hash,
    executionMode: record.execution_mode,
    provenance: record.provenance,
    providerIdempotencyKey: record.provider_idempotency_key,
    lifecycleState: record.lifecycle_state,
    stateVersion: record.state_version,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
  };
}

async function cleanup(prisma: PrismaClient, prefix: string): Promise<void> {
  const startsWith = { startsWith: prefix };
  await prisma.experimentFoundationProvisionalOutputV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationExecutionAttemptEventV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationProviderCommandV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationCollectionAttemptV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationExecutionAttemptV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationProviderPayloadV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationIntegrationInboxV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationIntegrationOutboxV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationRunCellV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationRunV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationTrainingTaskSpecV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationRunRecipeV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationVersionLockDependencyV2.deleteMany({
    where: { id: startsWith },
  });
  await prisma.experimentFoundationVersionLockV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationReadinessDependencyV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationReadinessAttestationV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationAssetLifecycleProjectionV2.deleteMany({ where: { id: startsWith } });
  await prisma.experimentFoundationAssetLifecycleEventV2.deleteMany({ where: { id: startsWith } });
}

function hash(character: string): string {
  return `sha256:${createHash('sha256').update(character).digest('hex')}`;
}

function fixtureHash(prefix: string, label: string): string {
  return `sha256:${createHash('sha256').update(`${prefix}:${label}`).digest('hex')}`;
}

function exactExternalJobRef(refId: string) {
  return {
    ref_type: 'fake_aliyun_pai_dlc_job',
    ref_id: refId,
  } as const;
}

function externalJobRefHash(refId: string): string {
  return serverHashExperimentFoundationExternalJobRefV2(refId);
}

function reason(reasonCode: string) {
  return (error: unknown) => error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === reasonCode;
}

function databaseCheck(constraintName: string) {
  return (error: unknown) => error instanceof Error
    && `${error.message}\n${JSON.stringify(error)}`.includes(constraintName);
}
