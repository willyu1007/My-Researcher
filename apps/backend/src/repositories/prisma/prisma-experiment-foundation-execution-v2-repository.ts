import { isDeepStrictEqual } from 'node:util';

import { Ajv, type ValidateFunction } from 'ajv';
import {
  Prisma,
  type ExperimentFoundationCollectionAttemptV2 as CollectionRow,
  type ExperimentFoundationExecutionAttemptEventV2 as EventRow,
  type ExperimentFoundationExecutionAttemptV2 as AttemptRow,
  type ExperimentFoundationIntegrationInboxV2 as InboxRow,
  type ExperimentFoundationProviderCommandV2 as CommandRow,
  type ExperimentFoundationProviderPayloadV2 as PayloadRow,
  type ExperimentFoundationProvisionalOutputV2 as OutputRow,
  type ExperimentFoundationReadinessAttestationV2 as ReadinessRow,
  type ExperimentFoundationReadinessDependencyV2 as ReadinessDependencyRow,
  type ExperimentFoundationRunV2 as RunRow,
  type PrismaClient,
} from '@prisma/client';
import {
  collectionAttemptV2Schema,
  executionAttemptV2Schema,
  EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2,
  EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_EVENT_TYPES_V2,
  EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2,
  EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2,
  EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2,
  EXPERIMENT_FOUNDATION_EXECUTION_TERMINAL_REASON_CODES_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_STATES_V2,
  EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
  EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2,
  attemptEventSnapshotV2Schema,
  attemptEventV2Schema,
  fakeAliyunPaiDlcRedactedManifestV1Schema,
  providerPayloadV2Schema,
  providerCommandSnapshotV2Schema,
  providerCommandV2Schema,
  provisionalOutputManifestV2Schema,
  provisionalOutputV2Schema,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import type {
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationReadinessBlockerV2,
  ExperimentFoundationReadinessDependencyV2,
  ExperimentFoundationReadinessQualificationSnapshotV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
  EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
  experimentFoundationAliyunRealProviderRedactedManifestV1Schema,
  experimentFoundationAliyunRealProviderRedactedManifestV2Schema,
  type ExperimentFoundationAliyunRealProviderRedactedManifestV1,
  type ExperimentFoundationAliyunRealProviderRedactedManifestV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  serverHashExperimentFoundationExecutionAttemptEventV2,
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationProviderCommandV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import {
  assertAttemptTerminalStateReasonPair,
  assertAttemptEventStatePair,
  assertCollectionCompletionShape,
  assertCollectionPreparationShape,
  assertCommandOutcomeTransition,
  assertValidAttemptUpdate,
  indexWorkflowStartRecords,
  sameControlCommandIntent,
} from '../experiment-foundation-execution-v2-invariants.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
  EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationV2MaterializationBundle,
} from '../experiment-spine-v2.repository.js';
import {
  EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2,
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationCollectionAttemptV2Record,
  type ExperimentFoundationCycleActiveRealAttemptFenceInputV2,
  type ExperimentFoundationCycleActiveRealAttemptRefV2,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2CommandClaimInput,
  type ExperimentFoundationExecutionV2CommandHeartbeatInput,
  type ExperimentFoundationExecutionV2CommitCollectionInput,
  type ExperimentFoundationExecutionV2CommitCommandOutcomeInput,
  type ExperimentFoundationExecutionV2EnqueueControlCommandInput,
  type ExperimentFoundationExecutionV2PrepareCollectionInput,
  type ExperimentFoundationExecutionV2Prerequisite,
  type ExperimentFoundationRealProviderExecutionV2Prerequisite,
  type ExperimentFoundationExecutionV2Readiness,
  type ExperimentFoundationExecutionV2ReleaseCommandInput,
  type ExperimentFoundationExecutionV2Repository,
  type ExperimentFoundationExecutionV2HeadAcknowledgement,
  type ExperimentFoundationExecutionV2StartInput,
  type ExperimentFoundationExecutionV2StartOutcome,
  type ExperimentFoundationExecutionV2TerminalizeCommandInput,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
  type ExperimentFoundationProvisionalOutputV2Record,
} from '../experiment-foundation-execution-v2.repository.js';
import {
  decodeExperimentV2InboxOutcome,
  reconstructExperimentV2Event,
  StoredExperimentV2EventIntegrityError,
} from '../experiment-v2-stored-integration-event.js';
import {
  assertStoredExperimentFoundationV2ReadinessIntegrity,
  StoredExperimentFoundationV2SnapshotIntegrityError,
} from '../experiment-foundation-v2-stored-snapshot-integrity.js';
import {
  loadVerifiedExperimentFoundationV2Materialization,
} from './prisma-experiment-foundation-spine-v2-repository.js';

type Client = PrismaClient | Prisma.TransactionClient;
const STORED_SCHEMA_VERSION_V1 = 'v1';

const storedExecutionSnapshotAjv = new Ajv({ allErrors: true, strict: false });
const attemptEventSnapshotValidator = storedExecutionSnapshotAjv.compile(
  attemptEventSnapshotV2Schema,
);
const attemptEventValidator = storedExecutionSnapshotAjv.compile(attemptEventV2Schema);
const providerCommandSnapshotValidator = storedExecutionSnapshotAjv.compile(
  providerCommandSnapshotV2Schema,
);
const providerPayloadManifestValidator = storedExecutionSnapshotAjv.compile(
  fakeAliyunPaiDlcRedactedManifestV1Schema,
);
type ExperimentFoundationAliyunRealProviderRedactedManifest =
  | ExperimentFoundationAliyunRealProviderRedactedManifestV1
  | ExperimentFoundationAliyunRealProviderRedactedManifestV2;
const realProviderPayloadManifestValidator: ValidateFunction<
  ExperimentFoundationAliyunRealProviderRedactedManifest
> = storedExecutionSnapshotAjv.compile<
ExperimentFoundationAliyunRealProviderRedactedManifest
>({
  oneOf: [
    experimentFoundationAliyunRealProviderRedactedManifestV1Schema,
    experimentFoundationAliyunRealProviderRedactedManifestV2Schema,
  ],
});
const providerPayloadValidator = storedExecutionSnapshotAjv.compile(providerPayloadV2Schema);
const executionAttemptValidator = storedExecutionSnapshotAjv.compile(executionAttemptV2Schema);
const providerCommandValidator = storedExecutionSnapshotAjv.compile(providerCommandV2Schema);
const collectionAttemptValidator = storedExecutionSnapshotAjv.compile(collectionAttemptV2Schema);
const provisionalOutputManifestValidator = storedExecutionSnapshotAjv.compile(
  provisionalOutputManifestV2Schema,
);
const provisionalOutputValidator = storedExecutionSnapshotAjv.compile(provisionalOutputV2Schema);

type HeadAcknowledgementExpectation =
  | {
    kind: 'exact';
    run: RunRow;
  }
  | {
    kind: 'latest';
    branch_id: string;
  };

export class PrismaExperimentFoundationExecutionV2Repository
implements ExperimentFoundationExecutionV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  resolveRunPrerequisite(runId: string) {
    return this.prisma.$transaction(
      (transaction) => loadRunPrerequisite(transaction, runId),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  resolveRunCellPrerequisite(runId: string, runCellId: string) {
    return this.prisma.$transaction(
      (transaction) => loadRunPrerequisite(transaction, runId, runCellId),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  resolveRealProviderRunPrerequisite(runId: string) {
    return this.prisma.$transaction(
      (transaction) => loadRunPrerequisite(transaction, runId, undefined, 'real_provider'),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  resolveRealProviderRunCellPrerequisite(runId: string, runCellId: string) {
    return this.prisma.$transaction(
      (transaction) => loadRunPrerequisite(transaction, runId, runCellId, 'real_provider'),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findWorkflowSimulationStart(
    runId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome | null> {
    return this.findExecutionStart(runId, businessIdempotencyKey, 'simulation') as Promise<
      ExperimentFoundationExecutionV2StartOutcome | null
    >;
  }

  async findRealProviderExecutionStart(
    runId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationRealProviderExecutionV2Prerequisite
  > | null> {
    return this.findExecutionStart(runId, businessIdempotencyKey, 'real_provider') as Promise<
      ExperimentFoundationExecutionV2StartOutcome<
        ExperimentFoundationRealProviderExecutionV2Prerequisite
      > | null
    >;
  }

  private async findExecutionStart(
    runId: string,
    businessIdempotencyKey: string,
    executionMode: 'simulation' | 'real_provider',
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const attempts = await transaction.experimentFoundationExecutionAttemptV2.findMany({
        where: { runId, workflowBusinessKey: businessIdempotencyKey },
        orderBy: [{ runCellId: 'asc' }, { attemptSequence: 'asc' }, { id: 'asc' }],
      });
      if (attempts.length === 0) return null;
      const prerequisite = await loadRunPrerequisite(
        transaction,
        runId,
        undefined,
        executionMode,
      );
      if (!prerequisite) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Committed workflow start lost its prerequisite.');
      }
      if (!isExactReplayAttemptSubset(prerequisite, attempts)) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Committed workflow start has a drifted cell subset.');
      }
      return loadStartReplay(transaction, prerequisite, attempts);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }

  async startWorkflowSimulation(
    input: ExperimentFoundationExecutionV2StartInput,
    serializationRetry = 0,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome> {
    return this.startExecution(input, 'simulation', serializationRetry) as Promise<
      ExperimentFoundationExecutionV2StartOutcome
    >;
  }

  async startRealProviderExecution(
    input: ExperimentFoundationExecutionV2StartInput,
    serializationRetry = 0,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationRealProviderExecutionV2Prerequisite
  >> {
    return this.startExecution(input, 'real_provider', serializationRetry) as Promise<
      ExperimentFoundationExecutionV2StartOutcome<
        ExperimentFoundationRealProviderExecutionV2Prerequisite
      >
    >;
  }

  private async startExecution(
    input: ExperimentFoundationExecutionV2StartInput,
    executionMode: 'simulation' | 'real_provider',
    serializationRetry: number,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite
  >> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const prerequisite = await loadRunPrerequisite(
          transaction,
          input.run_id,
          undefined,
          executionMode,
        );
        if (!prerequisite) {
          throw constraint('EXECUTION_SCOPE_DRIFT', `Run prerequisite not found: ${input.run_id}`);
        }

        const replayRows = await transaction.experimentFoundationExecutionAttemptV2.findMany({
          where: { runId: input.run_id, workflowBusinessKey: input.business_idempotency_key },
          orderBy: [{ runCellId: 'asc' }, { attemptSequence: 'asc' }],
        });
        if (replayRows.length > 0) {
          if (
            replayRows.some((row) => row.workflowRequestHash !== input.request_hash)
            || !isExactReplayAttemptSubset(prerequisite, replayRows)
          ) {
            throw constraint(
              'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
              'Workflow business key was reused with changed exact scope.',
            );
          }
          return loadStartReplay(transaction, prerequisite, replayRows);
        }

        const closure = await transaction.paperImplementationValidationCycleClosureV2.findUnique({
          where: { validationCycleId: prerequisite.validation_cycle_id },
          select: { id: true },
        });
        if (closure) {
          throw constraint(
            'CYCLE_ALREADY_CLOSED',
            `ValidationCycle already has an immutable v2 closure: ${prerequisite.validation_cycle_id}`,
          );
        }
        assertStartPrerequisite(prerequisite, input);
        await assertLiveReadinessSnapshot(transaction, prerequisite);
        await assertStartShape(transaction, prerequisite, input, executionMode);

        const existingPayloads = await transaction.experimentFoundationProviderPayloadV2.findMany({
          where: {
            OR: [
              { id: { in: input.payloads.map((payload) => payload.id) } },
              {
                materializationKey: {
                  in: input.payloads.map((payload) => payload.materialization_key),
                },
              },
            ],
          },
        });
        const existingPayloadById = new Map(existingPayloads.map((row) => [row.id, row]));
        const existingPayloadByMaterializationKey = new Map(
          existingPayloads.map((row) => [row.materializationKey, row]),
        );
        const payloadsToCreate = input.payloads.filter((payload) => {
          const byId = existingPayloadById.get(payload.id);
          const byMaterializationKey = existingPayloadByMaterializationKey.get(
            payload.materialization_key,
          );
          if (byId && byMaterializationKey && byId.id !== byMaterializationKey.id) {
            throw constraint(
              'PROVIDER_PAYLOAD_CONFLICT',
              'Provider payload id and materialization key resolve to different records.',
            );
          }
          const existing = byId ?? byMaterializationKey;
          if (!existing) return true;
          exactRecord(
            mapPayload(existing),
            payload,
            'PROVIDER_PAYLOAD_CONFLICT',
            'Provider payload identity was reused with changed content.',
          );
          return false;
        });
        if (payloadsToCreate.length > 0) {
          await transaction.experimentFoundationProviderPayloadV2.createMany({
            data: payloadsToCreate.map(
              mapExperimentFoundationProviderPayloadV2CreateData,
            ),
          });
        }
        await transaction.experimentFoundationExecutionAttemptV2.createMany({
          data: input.attempts.map(attemptCreateData),
        });
        await transaction.experimentFoundationExecutionAttemptEventV2.createMany({
          data: input.events.map(eventCreateData),
        });
        await transaction.experimentFoundationProviderCommandV2.createMany({
          data: input.commands.map(commandCreateData),
        });

        return {
          prerequisite,
          payloads: input.payloads,
          attempts: input.attempts,
          events: input.events,
          commands: input.commands,
          replayed: false,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === 'P2002' || error.code === 'P2034')
      ) {
        const replay = await this.findExecutionStart(
          input.run_id,
          input.business_idempotency_key,
          executionMode,
        );
        if (replay) {
          assertStartReplayMatchesInput(replay, input);
          return replay;
        }
        if (error.code === 'P2034' && serializationRetry < 2) {
          return this.startExecution(input, executionMode, serializationRetry + 1);
        }
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw constraint(
          'EXECUTION_SCOPE_DRIFT',
          'Serializable E1 prerequisite did not converge after bounded retry.',
        );
      }
      throw mapWriteError(error, 'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT');
    }
  }

  async findAttempt(attemptId: string) {
    const row = await this.prisma.experimentFoundationExecutionAttemptV2.findUnique({
      where: { id: attemptId },
    });
    return row ? mapAttempt(row) : null;
  }

  async findProviderPayload(providerPayloadId: string) {
    const row = await this.prisma.experimentFoundationProviderPayloadV2.findUnique({
      where: { id: providerPayloadId },
    });
    return row ? mapPayload(row) : null;
  }

  async listRunAttempts(runId: string) {
    const rows = await this.prisma.experimentFoundationExecutionAttemptV2.findMany({
      where: { runId },
      orderBy: [{ runCellId: 'asc' }, { attemptSequence: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapAttempt);
  }

  async listCycleActiveRealAttemptRefs(
    input: ExperimentFoundationCycleActiveRealAttemptFenceInputV2,
  ): Promise<ExperimentFoundationCycleActiveRealAttemptRefV2[]> {
    const rows = await this.prisma.experimentFoundationExecutionAttemptV2.findMany({
      where: {
        externalPiImplementationProjectId: input.implementation_project_id,
        externalPiValidationCycleId: input.validation_cycle_id,
        executionMode: 'real_provider',
        lifecycleState: { in: [...EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2] },
      },
      select: {
        id: true,
        externalPiImplementationProjectId: true,
        externalPiValidationCycleId: true,
        externalPiBranchId: true,
        externalPiWorkOrderRevisionId: true,
        externalPiWorkOrderRevisionHash: true,
        externalPiRevisionSequence: true,
        runId: true,
        runManifestHash: true,
        runCellId: true,
        attemptSequence: true,
        stateVersion: true,
        executionMode: true,
        lifecycleState: true,
      },
      orderBy: [
        { externalPiBranchId: 'asc' },
        { externalPiRevisionSequence: 'asc' },
        { runId: 'asc' },
        { runCellId: 'asc' },
        { attemptSequence: 'asc' },
        { id: 'asc' },
      ],
    });
    return rows.map(mapCycleActiveRealAttemptRef);
  }

  async listAttemptEvents(attemptId: string) {
    const rows = await this.prisma.experimentFoundationExecutionAttemptEventV2.findMany({
      where: { executionAttemptId: attemptId },
      orderBy: [{ eventSequence: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapEvent);
  }

  async readRunProjectionFacts(runId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const attempts = await transaction.experimentFoundationExecutionAttemptV2.findMany({
        where: { runId },
        orderBy: [{ runCellId: 'asc' }, { attemptSequence: 'asc' }, { id: 'asc' }],
      });
      const attemptIds = attempts.map((attempt) => attempt.id);
      const [events, collections] = await Promise.all([
        transaction.experimentFoundationExecutionAttemptEventV2.findMany({
          where: { executionAttemptId: { in: attemptIds } },
          orderBy: [{ occurredAt: 'asc' }, { executionAttemptId: 'asc' }, { eventSequence: 'asc' }],
        }),
        transaction.experimentFoundationCollectionAttemptV2.findMany({
          where: { executionAttemptId: { in: attemptIds } },
          orderBy: [{ executionAttemptId: 'asc' }, { id: 'asc' }],
        }),
      ]);
      return {
        attempts: attempts.map(mapAttempt),
        events: events.map(mapEvent),
        collections: collections.map(mapCollection),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }

  async listAttemptCollections(attemptId: string) {
    const rows = await this.prisma.experimentFoundationCollectionAttemptV2.findMany({
      where: { executionAttemptId: attemptId },
      orderBy: [{ id: 'asc' }],
    });
    return rows.map(mapCollection);
  }

  async listRunPayloads(runId: string) {
    const rows = await this.prisma.experimentFoundationProviderPayloadV2.findMany({
      where: { runId },
      orderBy: [{ runCellId: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapPayload);
  }

  async listAttemptCommands(attemptId: string) {
    const rows = await this.prisma.experimentFoundationProviderCommandV2.findMany({
      where: { executionAttemptId: attemptId },
      include: { executionAttempt: true },
      orderBy: [{ commandSequence: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => mapCommand(row, mapAttempt(row.executionAttempt)));
  }

  async claimCommands(input: ExperimentFoundationExecutionV2CommandClaimInput) {
    const claimedAt = new Date(input.claimed_at);
    const leaseExpiresAt = new Date(input.lease_expires_at);
    if (leaseExpiresAt <= claimedAt) {
      throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command lease must expire after claim time.');
    }
    return this.prisma.$transaction(async (transaction) => {
      const ready = commandReadyWhere(
        claimedAt,
        input.command_kinds,
        input.execution_modes,
      );
      const candidates = await transaction.experimentFoundationProviderCommandV2.findMany({
        where: ready,
        include: { executionAttempt: true },
        orderBy: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: Math.max(0, input.limit),
      });
      const claims: ExperimentFoundationProviderCommandV2Record[] = [];
      for (const candidate of candidates) {
        // A command must pass its immutable typed-snapshot and canonical-hash
        // boundary before the lease row is mutated or any provider dispatch can
        // observe it.
        mapCommand(candidate, mapAttempt(candidate.executionAttempt));
        if (
          candidate.leaseVersion < 0
          || candidate.leaseVersion >= EXPERIMENT_V2_INT32_MAX
          || candidate.attemptCount < 0
          || candidate.attemptCount >= EXPERIMENT_V2_INT32_MAX
        ) {
          throw constraint(
            'PROVIDER_COMMAND_LEASE_CONFLICT',
            'Provider command claim counter cannot advance within the PostgreSQL Int32 range.',
          );
        }
        const claimed = await transaction.experimentFoundationProviderCommandV2.updateMany({
          where: {
            id: candidate.id,
            ...ready,
            leaseVersion: { lt: EXPERIMENT_V2_INT32_MAX },
            attemptCount: { lt: EXPERIMENT_V2_INT32_MAX },
          },
          data: {
            commandState: 'claimed',
            leaseVersion: { increment: 1 },
            leaseOwner: input.lease_owner,
            leaseExpiresAt,
            heartbeatAt: claimedAt,
            attemptCount: { increment: 1 },
            updatedAt: claimedAt,
          },
        });
        if (claimed.count !== 1) continue;
        const row = await transaction.experimentFoundationProviderCommandV2.findUniqueOrThrow({
          where: { id: candidate.id },
          include: { executionAttempt: true },
        });
        claims.push(mapCommand(row, mapAttempt(row.executionAttempt)));
      }
      return claims;
    });
  }

  async heartbeatCommand(input: ExperimentFoundationExecutionV2CommandHeartbeatInput) {
    const heartbeatAt = new Date(input.heartbeat_at);
    const leaseExpiresAt = new Date(input.lease_expires_at);
    if (leaseExpiresAt <= heartbeatAt) {
      throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command lease must extend past heartbeat time.');
    }
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.experimentFoundationProviderCommandV2.findUnique({
        where: { id: input.command_id },
        include: { executionAttempt: true },
      });
      if (!current) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command heartbeat target is missing.');
      }
      mapCommand(current, mapAttempt(current.executionAttempt));
      const updated = await transaction.experimentFoundationProviderCommandV2.updateMany({
        where: {
          id: input.command_id,
          commandHash: current.commandHash,
          providerPayloadHash: current.providerPayloadHash,
          commandState: 'claimed',
          leaseOwner: input.lease_owner,
          leaseVersion: input.expected_lease_version,
          leaseExpiresAt: { gt: heartbeatAt },
        },
        data: { leaseExpiresAt, heartbeatAt, updatedAt: heartbeatAt },
      });
      if (updated.count !== 1) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command heartbeat lost its lease fence.');
      }
      const row = await transaction.experimentFoundationProviderCommandV2.findUniqueOrThrow({
        where: { id: input.command_id },
        include: { executionAttempt: true },
      });
      return mapCommand(row, mapAttempt(row.executionAttempt));
    });
  }

  async commitCommandOutcome(input: ExperimentFoundationExecutionV2CommitCommandOutcomeInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const commandRow = await transaction.experimentFoundationProviderCommandV2.findUnique({
          where: { id: input.command_id },
        });
        if (!commandRow) {
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Provider command does not exist.');
        }
        const currentRow = await transaction.experimentFoundationExecutionAttemptV2.findUnique({
          where: { id: commandRow.executionAttemptId },
        });
        if (!currentRow) throw constraint('EXECUTION_SCOPE_DRIFT', 'Command owner is missing.');
        const current = mapAttempt(currentRow);
        const command = mapCommand(commandRow, current);

        if (commandRow.commandState === 'succeeded' || commandRow.commandState === 'terminal') {
          if (
            commandRow.responseHash !== input.response_hash
            || commandRow.lastErrorCode !== (input.command_terminal_error_code ?? null)
            || !isDeepStrictEqual(current, input.next_attempt)
          ) {
            throw constraint('PROVIDER_RESPONSE_INVALID', 'Provider outcome replay drifted.');
          }
          await assertCommittedEventAndCommand(transaction, input.event, input.next_command);
          return current;
        }

        assertClaimed(
          commandRow,
          input.lease_owner,
          input.expected_lease_version,
          input.committed_at,
        );
        if (commandRow.operation === 'reconcile' && input.next_attempt.lifecycle_state === 'succeeded') {
          throw constraint(
            'EXECUTION_ATTEMPT_STATE_CONFLICT',
            'Successful reconcile must use atomic collection preparation.',
          );
        }
        if (
          input.command_terminal_error_code
          && (input.next_attempt.lifecycle_state !== 'failed' || input.next_command)
        ) {
          throw constraint(
            'PROVIDER_RESPONSE_INVALID',
            'Terminal provider command must atomically fail its Attempt.',
          );
        }
        assertValidAttemptUpdate(
          current,
          input.expected_attempt_state_version,
          input.next_attempt,
          input.event,
          commandRow.id,
        );
        assertCommandOutcomeTransition(
          command,
          current,
          input.next_attempt,
          input.command_terminal_error_code,
        );
        await assertNextEventSequence(transaction, input.event);
        if (input.next_command) {
          await assertNextCommandSequence(transaction, input.next_command, input.next_attempt);
        }

        const cas = await transaction.experimentFoundationExecutionAttemptV2.updateMany({
          where: {
            id: current.id,
            stateVersion: input.expected_attempt_state_version,
            lifecycleState: current.lifecycle_state,
          },
          data: attemptUpdateData(input.next_attempt),
        });
        if (cas.count !== 1) throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt CAS lost.');
        await transaction.experimentFoundationExecutionAttemptEventV2.create({
          data: eventCreateData(input.event),
        });
        if (input.next_command) {
          await transaction.experimentFoundationProviderCommandV2.create({
            data: commandCreateData(input.next_command),
          });
        }
        const commandCas = await transaction.experimentFoundationProviderCommandV2.updateMany({
          where: claimedCommandWhere(
            input.command_id,
            input.lease_owner,
            input.expected_lease_version,
            input.committed_at,
          ),
          data: completedCommandData(
            input.committed_at,
            input.response_hash,
            input.command_terminal_error_code,
          ),
        });
        if (commandCas.count !== 1) {
          throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command outcome lost its lease fence.');
        }
        return input.next_attempt;
      });
    } catch (error) {
      throw mapWriteError(error, 'EXECUTION_ATTEMPT_STATE_CONFLICT');
    }
  }

  async releaseCommand(input: ExperimentFoundationExecutionV2ReleaseCommandInput) {
    const releasedAt = new Date(input.released_at);
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.experimentFoundationProviderCommandV2.findUnique({
        where: { id: input.command_id },
        include: { executionAttempt: true },
      });
      if (!current) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command release target is missing.');
      }
      mapCommand(current, mapAttempt(current.executionAttempt));
      const result = await transaction.experimentFoundationProviderCommandV2.updateMany({
        where: {
          ...claimedCommandWhere(
            input.command_id,
            input.lease_owner,
            input.expected_lease_version,
            input.released_at,
          ),
          commandHash: current.commandHash,
          providerPayloadHash: current.providerPayloadHash,
        },
        data: {
          commandState: 'pending',
          leaseOwner: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
          nextAttemptAt: new Date(input.next_attempt_at),
          lastErrorCode: input.error_code,
          updatedAt: releasedAt,
        },
      });
      if (result.count !== 1) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command release lost its lease fence.');
      }
      const row = await transaction.experimentFoundationProviderCommandV2.findUniqueOrThrow({
        where: { id: input.command_id },
        include: { executionAttempt: true },
      });
      return mapCommand(row, mapAttempt(row.executionAttempt));
    });
  }

  async terminalizeCommand(input: ExperimentFoundationExecutionV2TerminalizeCommandInput) {
    const current = await this.prisma.experimentFoundationProviderCommandV2.findUnique({
      where: { id: input.command_id },
      include: { executionAttempt: true },
    });
    if (!current) throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Command does not exist.');
    const owningAttempt = mapAttempt(current.executionAttempt);
    const mappedCurrent = mapCommand(current, owningAttempt);
    if (current.commandState === 'terminal') {
      if (current.lastErrorCode !== input.error_code) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Terminal replay drifted.');
      }
      return mappedCurrent;
    }
    const terminalAt = new Date(input.terminal_at);
    const ownerWhere = current.commandState === 'claimed'
      ? {
        commandState: 'claimed',
        leaseOwner: input.lease_owner ?? '__missing__',
        leaseVersion: input.expected_lease_version ?? -1,
        leaseExpiresAt: { gt: terminalAt },
      }
      : input.lease_owner === null && input.expected_lease_version === null
        ? { commandState: 'pending', leaseOwner: null }
        : { commandState: '__lease_mismatch__', leaseOwner: null };
    const result = await this.prisma.experimentFoundationProviderCommandV2.updateMany({
      where: { id: input.command_id, ...ownerWhere },
      data: {
        commandState: 'terminal',
        leaseOwner: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastErrorCode: input.error_code,
        updatedAt: terminalAt,
        terminalAt,
      },
    });
    if (result.count !== 1) {
      throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command terminalization lost its fence.');
    }
    return this.findCommandOrThrow(input.command_id);
  }

  async enqueueControlCommand(input: ExperimentFoundationExecutionV2EnqueueControlCommandInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const replay = await findExactControlCommandReplay(transaction, input.command);
        if (replay) return replay;

        const attemptRow = await transaction.experimentFoundationExecutionAttemptV2.findUnique({
          where: { id: input.attempt_id },
        });
        if (!attemptRow || attemptRow.stateVersion !== input.expected_attempt_state_version) {
          const concurrentReplay = await findExactControlCommandReplay(
            transaction,
            input.command,
          );
          if (concurrentReplay) return concurrentReplay;
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt changed before control enqueue.');
        }
        const attempt = mapAttempt(attemptRow);

        if (
          input.command.operation === 'cancel'
          && attempt.lifecycle_state === 'prepared'
          && attempt.external_job_ref === null
        ) {
          const submit = await transaction.experimentFoundationProviderCommandV2.findFirst({
            where: {
              executionAttemptId: attempt.id,
              operation: 'submit',
              commandState: { in: ['pending', 'claimed'] },
            },
          });
          if (!submit) {
            // Under READ COMMITTED a same-key competitor may commit between
            // the initial replay probe and this submit lookup. Converge on its
            // durable command instead of reporting a false missing-submit
            // lease conflict.
            const concurrentReplay = await findExactControlCommandReplay(
              transaction,
              input.command,
            );
            if (concurrentReplay) return concurrentReplay;
            throw constraint(
              'PROVIDER_COMMAND_LEASE_CONFLICT',
              'Prepared Attempt has no pending or leased submit command.',
            );
          }
          if (submit.commandState === 'claimed') {
            // E2 intentionally leaves the Attempt prepared. Persist an async
            // cancel intent without inventing a provider outcome; command
            // claiming defers it until submit E3 or lease recovery converges.
            const concurrentReplay = await assertNextControlCommandOrReplay(
              transaction,
              input.command,
              attempt,
            );
            if (concurrentReplay) return concurrentReplay;
            const row = await transaction.experimentFoundationProviderCommandV2.create({
              data: commandCreateData(input.command),
            });
            return mapCommand(row, attempt);
          }
          if (!input.event || !input.next_attempt) {
            throw constraint(
              'EXECUTION_ATTEMPT_STATE_CONFLICT',
              'Pending-submit cancel requires atomic Attempt/event records.',
            );
          }
          assertValidAttemptUpdate(
            attempt,
            input.expected_attempt_state_version,
            input.next_attempt,
            input.event,
            input.command.id,
          );
          try {
            await assertNextEventSequence(transaction, input.event);
            await assertNextCommandSequence(transaction, input.command, input.next_attempt);
          } catch (error) {
            const concurrentReplay = await findExactControlCommandReplay(
              transaction,
              input.command,
            );
            if (concurrentReplay) return concurrentReplay;
            throw error;
          }
          const at = input.event.occurred_at;
          const completed = {
            ...input.command,
            state: input.command.state === 'terminal' ? 'terminal' as const : 'succeeded' as const,
            response_hash: input.command.response_hash ?? input.event.event_hash,
            updated_at: at,
            completed_at: at,
          };
          // Insert the idempotency winner before any competing CAS/update. A
          // concurrent same-key loser then blocks on the unique provider key
          // and converges through the P2002 semantic replay path.
          const row = await transaction.experimentFoundationProviderCommandV2.create({
            data: commandCreateData(completed),
          });
          const submitCas = await transaction.experimentFoundationProviderCommandV2.updateMany({
            where: {
              executionAttemptId: attempt.id,
              operation: 'submit',
              commandState: 'pending',
            },
            data: {
              commandState: 'terminal',
              lastErrorCode: 'cancelled_before_submit',
              updatedAt: new Date(at),
              terminalAt: new Date(at),
            },
          });
          if (submitCas.count !== 1) {
            throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Submit is missing or already claimed.');
          }
          const cas = await transaction.experimentFoundationExecutionAttemptV2.updateMany({
            where: { id: attempt.id, stateVersion: input.expected_attempt_state_version },
            data: attemptUpdateData(input.next_attempt),
          });
          if (cas.count !== 1) throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Cancel CAS lost.');
          // AttemptEvent.providerCommandId is an immediate FK, so the durable
          // completed cancel intent must exist before its outcome event.
          await transaction.experimentFoundationExecutionAttemptEventV2.create({
            data: eventCreateData(input.event),
          });
          return mapCommand(row, input.next_attempt);
        }

        const concurrentReplay = await assertNextControlCommandOrReplay(
          transaction,
          input.command,
          attempt,
        );
        if (concurrentReplay) return concurrentReplay;
        const row = await transaction.experimentFoundationProviderCommandV2.create({
          data: commandCreateData(input.command),
        });
        return mapCommand(row, attempt);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await findExactControlCommandReplay(this.prisma, input.command);
        if (replay) return replay;
      }
      throw mapWriteError(error, 'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT');
    }
  }

  async prepareCollection(input: ExperimentFoundationExecutionV2PrepareCollectionInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const commandRow = await transaction.experimentFoundationProviderCommandV2.findUnique({
          where: { id: input.command_id },
        });
        if (!commandRow || commandRow.operation !== 'reconcile') {
          throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Exact reconcile command is required.');
        }
        const attemptRow = await transaction.experimentFoundationExecutionAttemptV2.findUniqueOrThrow({
          where: { id: commandRow.executionAttemptId },
        });
        const current = mapAttempt(attemptRow);
        const command = mapCommand(commandRow, current);
        const existing = await transaction.experimentFoundationCollectionAttemptV2.findUnique({
          where: { executionAttemptId: current.id },
        });
        if (commandRow.commandState === 'succeeded' && existing) {
          if (
            commandRow.responseHash !== input.response_hash
            || !isDeepStrictEqual(current, input.next_attempt)
          ) {
            throw constraint('PROVIDER_RESPONSE_INVALID', 'Collection preparation replay drifted.');
          }
          exactRecord(
            mapCollection(existing),
            input.collection,
            'COLLECTION_ATTEMPT_CONFLICT',
            'Collection replay drifted.',
          );
          await assertCommittedEventAndCommand(transaction, input.succeeded_event);
          await assertCommittedEventAndCommand(
            transaction,
            input.collection_prepared_event,
            input.collect_command,
          );
          return mapCollection(existing);
        }

        const activeCancel = await transaction.experimentFoundationProviderCommandV2.findFirst({
          where: {
            executionAttemptId: current.id,
            operation: 'cancel',
            commandState: { in: ['pending', 'claimed'] },
          },
          select: { id: true },
        });
        if (activeCancel) {
          throw constraint(
            'EXECUTION_ATTEMPT_STATE_CONFLICT',
            'Successful reconcile cannot overtake a durable cancellation intent.',
          );
        }

        assertClaimed(
          commandRow,
          input.lease_owner,
          input.expected_lease_version,
          input.committed_at,
        );
        assertValidAttemptUpdate(
          current,
          input.expected_attempt_state_version,
          input.next_attempt,
          input.succeeded_event,
          commandRow.id,
        );
        assertCollectionPreparationShape(current, command, input);
        if (existing) throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Attempt already has a collection.');
        await assertNextEventSequence(transaction, input.succeeded_event);
        await assertNextCommandSequence(transaction, input.collect_command, input.next_attempt);

        const attemptCas = await transaction.experimentFoundationExecutionAttemptV2.updateMany({
          where: { id: current.id, stateVersion: input.expected_attempt_state_version },
          data: attemptUpdateData(input.next_attempt),
        });
        if (attemptCas.count !== 1) throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt CAS lost.');
        await transaction.experimentFoundationExecutionAttemptEventV2.create({
          data: eventCreateData(input.succeeded_event),
        });
        const collectionRow = await transaction.experimentFoundationCollectionAttemptV2.create({
          data: collectionCreateData(input.collection),
        });
        await transaction.experimentFoundationProviderCommandV2.create({
          data: commandCreateData(input.collect_command),
        });
        await assertNextEventSequence(transaction, input.collection_prepared_event);
        await transaction.experimentFoundationExecutionAttemptEventV2.create({
          data: eventCreateData(input.collection_prepared_event),
        });
        const commandCas = await transaction.experimentFoundationProviderCommandV2.updateMany({
          where: claimedCommandWhere(
            input.command_id,
            input.lease_owner,
            input.expected_lease_version,
            input.committed_at,
          ),
          data: completedCommandData(input.committed_at, input.response_hash),
        });
        if (commandCas.count !== 1) {
          throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Reconcile command lease was lost.');
        }
        return mapCollection(collectionRow);
      });
    } catch (error) {
      throw mapWriteError(error, 'COLLECTION_ATTEMPT_CONFLICT');
    }
  }

  async commitCollectionCompletion(input: ExperimentFoundationExecutionV2CommitCollectionInput) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const collectionRow = await transaction.experimentFoundationCollectionAttemptV2.findUnique({
          where: { id: input.collection_id },
        });
        const commandRow = await transaction.experimentFoundationProviderCommandV2.findUnique({
          where: { id: input.command_id },
        });
        if (
          !collectionRow
          || !commandRow
          || commandRow.collectionAttemptId !== collectionRow.id
          || commandRow.operation !== 'collect'
        ) {
          throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection command scope drifted.');
        }
        const collection = mapCollection(collectionRow);
        const attemptRow = await transaction.experimentFoundationExecutionAttemptV2.findUnique({
          where: { id: collection.execution_attempt_id },
        });
        if (!attemptRow) {
          throw constraint('EXECUTION_SCOPE_DRIFT', 'Collection Attempt owner is missing.');
        }
        const attempt = mapAttempt(attemptRow);
        const command = mapCommand(commandRow, attempt);
        const expectedCommandState = input.command_terminal_error_code ? 'terminal' : 'succeeded';
        if (collection.collection_state === input.next_collection.collection_state) {
          if (
            !isDeepStrictEqual(collection, input.next_collection)
            || commandRow.commandState !== expectedCommandState
            || commandRow.responseHash !== input.response_hash
            || commandRow.lastErrorCode !== (input.command_terminal_error_code ?? null)
          ) {
            throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection completion replay drifted.');
          }
          await assertCommittedEventAndOutputs(transaction, input.event, input.provisional_outputs);
          return collection;
        }

        assertClaimed(
          commandRow,
          input.lease_owner,
          input.expected_lease_version,
          input.committed_at,
        );
        assertCollectionCompletionShape(collection, attempt, command, input);
        await assertNextEventSequence(transaction, input.event);
        const cas = await transaction.experimentFoundationCollectionAttemptV2.updateMany({
          where: { id: collection.id, stateVersion: input.expected_collection_state_version },
          data: collectionUpdateData(input.next_collection),
        });
        if (cas.count !== 1) throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection CAS lost.');
        for (const output of input.provisional_outputs) {
          await transaction.experimentFoundationProvisionalOutputV2.create({
            data: outputCreateData(output),
          });
        }
        await transaction.experimentFoundationExecutionAttemptEventV2.create({
          data: eventCreateData(input.event),
        });
        const commandCas = await transaction.experimentFoundationProviderCommandV2.updateMany({
          where: claimedCommandWhere(
            input.command_id,
            input.lease_owner,
            input.expected_lease_version,
            input.committed_at,
          ),
          data: completedCommandData(
            input.committed_at,
            input.response_hash,
            input.command_terminal_error_code,
          ),
        });
        if (commandCas.count !== 1) {
          throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Collect command lease was lost.');
        }
        return input.next_collection;
      });
    } catch (error) {
      throw mapWriteError(error, 'COLLECTION_ATTEMPT_CONFLICT');
    }
  }

  private async findCommandOrThrow(commandId: string) {
    const row = await this.prisma.experimentFoundationProviderCommandV2.findUniqueOrThrow({
      where: { id: commandId },
      include: { executionAttempt: true },
    });
    return mapCommand(row, mapAttempt(row.executionAttempt));
  }
}

export function resolveExperimentFoundationExecutionV2RunPrerequisiteInTransaction(
  transaction: Prisma.TransactionClient,
  runId: string,
): Promise<ExperimentFoundationExecutionV2Prerequisite | null> {
  return loadRunPrerequisite(transaction, runId);
}

async function loadRunPrerequisite(
  client: Client,
  runId: string,
  runCellId: string | undefined,
  mode: 'real_provider',
): Promise<ExperimentFoundationRealProviderExecutionV2Prerequisite | null>;
async function loadRunPrerequisite(
  client: Client,
  runId: string,
  runCellId?: string,
): Promise<ExperimentFoundationExecutionV2Prerequisite | null>;
async function loadRunPrerequisite(
  client: Client,
  runId: string,
  runCellId: string | undefined,
  mode: 'simulation' | 'real_provider',
): Promise<
  | ExperimentFoundationExecutionV2Prerequisite
  | ExperimentFoundationRealProviderExecutionV2Prerequisite
  | null
>;
async function loadRunPrerequisite(
  client: Client,
  runId: string,
  runCellId?: string,
  mode: 'simulation' | 'real_provider' = 'simulation',
): Promise<
  | ExperimentFoundationExecutionV2Prerequisite
  | ExperimentFoundationRealProviderExecutionV2Prerequisite
  | null
> {
  const run = await client.experimentFoundationRunV2.findUnique({ where: { id: runId } });
  if (!run) return null;
  const materialization = await loadExecutionMaterialization(client, run);
  const selectedRunCells = runCellId
    ? materialization.run_cells.filter((cell) => cell.run_cell_id === runCellId)
    : materialization.run_cells;
  if (selectedRunCells.length === 0) return null;

  const [exactAck, latestAck] = await Promise.all([
    client.experimentFoundationIntegrationInboxV2.findFirst({
      where: {
        consumerName: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
        eventType: 'BranchHeadAdvanced',
        status: 'processed',
        outcome: 'processed',
        reasonCode: null,
        runId,
        runManifestHash: run.runManifestHash,
        branchId: run.externalPiBranchId,
        revisionSequence: run.externalPiRevisionSequence,
        workOrderRevisionId: run.externalPiWorkOrderRevisionId,
        workOrderRevisionHash: run.externalPiWorkOrderRevisionHash,
      },
      orderBy: [{ processedAt: 'desc' }, { id: 'asc' }],
    }),
    client.experimentFoundationIntegrationInboxV2.findFirst({
      where: {
        consumerName: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
        eventType: 'BranchHeadAdvanced',
        status: 'processed',
        outcome: 'processed',
        reasonCode: null,
        branchId: run.externalPiBranchId,
      },
      orderBy: [{ revisionSequence: 'desc' }, { processedAt: 'desc' }, { id: 'asc' }],
    }),
  ]);
  if (!exactAck || !latestAck) return null;
  const exactAcknowledgement = mapAcknowledgement(exactAck, { kind: 'exact', run });
  const latestAcknowledgement = mapAcknowledgement(latestAck, {
    kind: 'latest',
    branch_id: run.externalPiBranchId,
  });
  const [readiness, dependencies] = await Promise.all([
    client.experimentFoundationReadinessAttestationV2.findUnique({
      where: { id: materialization.run_recipe.readiness_attestation_id },
    }),
    client.experimentFoundationReadinessDependencyV2.findMany({
      where: { attestationId: materialization.run_recipe.readiness_attestation_id },
      orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
    }),
  ]);
  if (!readiness) return null;
  const mappedReadiness = mapVerifiedReadiness(readiness, dependencies);
  assertExecutionReadinessMatchesMaterialization(mappedReadiness, materialization);
  const taskSpecById = new Map(materialization.task_specs.map((task) => [
    task.training_task_spec_id,
    task,
  ]));
  const base = {
    run: materialization.run,
    run_recipe_id: materialization.run_recipe.run_recipe_id,
    implementation_project_id: exactAcknowledgement.implementation_project_id,
    validation_cycle_id: exactAcknowledgement.validation_cycle_id,
    external_pi_branch_id: run.externalPiBranchId,
    readiness: mappedReadiness,
    head_acknowledgement: exactAcknowledgement,
    latest_branch_head_acknowledgement: latestAcknowledgement,
  };
  if (mode === 'real_provider') {
    if (!('execution_bundle' in materialization.run_recipe)) {
      throw constraint(
        'EXECUTION_SCOPE_DRIFT',
        'Real-provider execution requires an executable v2 RunRecipe.',
      );
    }
    return {
      ...base,
      cells: selectedRunCells.map((cell) => {
        const mappedTask = taskSpecById.get(cell.training_task_spec_id);
        if (!mappedTask || !('execution_bundle' in mappedTask)) {
          throw constraint(
            'EXECUTION_SCOPE_DRIFT',
            `Real-provider RunCell lost its executable TrainingTaskSpec: ${cell.run_cell_id}`,
          );
        }
        return {
          run_cell: cell,
          task_spec: mappedTask,
          retry_ceiling: mappedTask.retry_snapshot.max_attempts,
        };
      }),
    };
  }
  return {
    ...base,
    cells: selectedRunCells.map((cell) => {
      const mappedTask = taskSpecById.get(cell.training_task_spec_id);
      if (!mappedTask) {
        throw constraint(
          'EXECUTION_SCOPE_DRIFT',
          `Verified RunCell lost its exact TrainingTaskSpec: ${cell.run_cell_id}`,
        );
      }
      if ('execution_bundle' in mappedTask) {
        throw constraint(
          'EXECUTION_SCOPE_DRIFT',
          'Simulation execution cannot consume an executable real-provider TaskSpec.',
        );
      }
      return {
        run_cell: cell,
        task_spec: mappedTask,
        retry_ceiling: mappedTask.retry_snapshot.max_attempts,
      };
    }),
  };
}

async function loadExecutionMaterialization(
  client: Client,
  run: RunRow,
): Promise<ExperimentFoundationV2MaterializationBundle> {
  let materialization: ExperimentFoundationV2MaterializationBundle | null;
  try {
    materialization = await loadVerifiedExperimentFoundationV2Materialization(
      client,
      run.externalPiWorkOrderRevisionId,
    );
  } catch (error) {
    if (
      error instanceof ExperimentSpineV2RepositoryConstraintError
      || error instanceof StoredExperimentFoundationV2SnapshotIntegrityError
    ) {
      throw constraint(
        'EXECUTION_SCOPE_DRIFT',
        `Run materialization failed immutable integrity verification: ${error.message}`,
      );
    }
    throw error;
  }
  if (!materialization) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      `Run has no complete verified materialization: ${run.id}`,
    );
  }
  if (
    materialization.inbox.consumer_name
      !== EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER
    || materialization.inbox.outcome !== 'processed'
    || materialization.inbox.reason_code !== null
    || materialization.run.run_id !== run.id
    || materialization.run_recipe.run_recipe_id !== run.runRecipeId
    || materialization.run.external_pi_work_order_revision_id
      !== run.externalPiWorkOrderRevisionId
    || materialization.run.external_pi_work_order_revision_hash
      !== run.externalPiWorkOrderRevisionHash
    || materialization.run.external_pi_branch_revision_sequence
      !== run.externalPiRevisionSequence
    || materialization.run.run_manifest_hash !== run.runManifestHash
    || materialization.run.frozen_at !== run.frozenAt.toISOString()
  ) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      `Run differs from its verified materialization lineage: ${run.id}`,
    );
  }
  return materialization;
}

function mapVerifiedReadiness(
  row: ReadinessRow,
  dependencyRows: ReadinessDependencyRow[],
): ExperimentFoundationExecutionV2Readiness {
  if (dependencyRows.some((dependency) => (
    dependency.dependencyRole !== dependency.dependencyAssetType
  ))) {
    throw constraint(
      'EXECUTION_READINESS_DRIFT',
      `Readiness dependency role drifted from its typed asset family: ${row.id}`,
    );
  }
  const dependencies: ExperimentFoundationReadinessDependencyV2[] = dependencyRows.map(
    (dependency) => ({
      readiness_attestation_id: dependency.attestationId,
      ordinal: dependency.ordinal,
      dependency: {
        asset_type: dependency.dependencyAssetType,
        logical_id: dependency.dependencyAssetId,
        revision_id: dependency.dependencyRevisionId,
        revision_sequence: dependency.dependencyRevisionSequence,
        content_hash: dependency.dependencyRevisionHash,
      },
    }),
  );
  const attestation: ExperimentFoundationReadinessAttestationV2 = {
    readiness_attestation_id: row.id,
    target: {
      asset_type: row.targetAssetType,
      logical_id: row.targetAssetId,
      revision_id: row.targetRevisionId,
      revision_sequence: row.targetRevisionSequence,
      content_hash: row.targetRevisionHash,
    },
    status: row.outcome as ExperimentFoundationReadinessAttestationV2['status'],
    evaluator_profile_version: row.evaluatorProfileVersion,
    evaluator_profile_hash: row.evaluatorProfileHash,
    dependency_manifest_hash: row.dependencyManifestHash,
    qualification_snapshot: fromJson<ExperimentFoundationReadinessQualificationSnapshotV2>(
      row.qualificationSnapshotJson,
    ),
    blockers: fromJson<ExperimentFoundationReadinessBlockerV2[]>(row.blockerSnapshotJson),
    attestation_hash: row.attestationHash,
    created_at: row.attestedAt.toISOString(),
  };
  try {
    assertStoredExperimentFoundationV2ReadinessIntegrity(attestation, dependencies);
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw constraint(
        'EXECUTION_READINESS_DRIFT',
        `Readiness failed immutable integrity verification: ${error.message}`,
      );
    }
    throw error;
  }
  return {
    readiness_attestation_id: attestation.readiness_attestation_id,
    readiness_attestation_hash: attestation.attestation_hash,
    target: attestation.target,
    ordered_dependencies: dependencies,
    evaluator_profile_version: attestation.evaluator_profile_version,
    evaluator_profile_hash: attestation.evaluator_profile_hash,
    dependency_manifest_hash: attestation.dependency_manifest_hash,
    outcome: attestation.status,
  };
}

function assertExecutionReadinessMatchesMaterialization(
  readiness: ExperimentFoundationExecutionV2Readiness,
  materialization: ExperimentFoundationV2MaterializationBundle,
): void {
  const targetLockDependencies = materialization.version_lock_dependencies.filter(
    (dependency) => isDeepStrictEqual(dependency.dependency, readiness.target),
  );
  const orderedNonTargetDependencies = materialization.version_lock_dependencies
    .filter((dependency) => !isDeepStrictEqual(dependency.dependency, readiness.target))
    .map((dependency) => dependency.dependency);
  if (
    readiness.readiness_attestation_id
      !== materialization.version_lock.readiness_attestation_id
    || readiness.readiness_attestation_id
      !== materialization.run_recipe.readiness_attestation_id
    || readiness.readiness_attestation_hash
      !== materialization.version_lock.readiness_attestation_hash
    || targetLockDependencies.length !== 1
    || !isDeepStrictEqual(
      readiness.ordered_dependencies.map((dependency) => dependency.dependency),
      orderedNonTargetDependencies,
    )
  ) {
    throw constraint(
      'EXECUTION_READINESS_DRIFT',
      'Readiness does not match the exact verified VersionLock dependency lineage.',
    );
  }
}

async function loadStartReplay(
  client: Client,
  prerequisite:
    | ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite,
  attempts: AttemptRow[],
): Promise<ExperimentFoundationExecutionV2StartOutcome<
  ExperimentFoundationExecutionV2Prerequisite
  | ExperimentFoundationRealProviderExecutionV2Prerequisite
>> {
  const ordinalByCell = new Map(
    prerequisite.cells.map((cell) => [cell.run_cell.run_cell_id, cell.run_cell.ordinal]),
  );
  const orderedAttempts = [...attempts].sort((left, right) => (
    (ordinalByCell.get(left.runCellId) ?? Number.MAX_SAFE_INTEGER)
      - (ordinalByCell.get(right.runCellId) ?? Number.MAX_SAFE_INTEGER)
    || left.attemptSequence - right.attemptSequence
    || left.id.localeCompare(right.id)
  ));
  const attemptIds = orderedAttempts.map((row) => row.id);
  const payloadIds = [...new Set(orderedAttempts.map((row) => row.providerPayloadId))];
  const [payloads, events, commands] = await Promise.all([
    client.experimentFoundationProviderPayloadV2.findMany({ where: { id: { in: payloadIds } } }),
    client.experimentFoundationExecutionAttemptEventV2.findMany({
      where: { executionAttemptId: { in: attemptIds }, eventSequence: 1 },
      orderBy: [{ executionAttemptId: 'asc' }, { eventSequence: 'asc' }],
    }),
    client.experimentFoundationProviderCommandV2.findMany({
      where: { executionAttemptId: { in: attemptIds }, commandSequence: 1 },
      orderBy: [{ executionAttemptId: 'asc' }, { commandSequence: 'asc' }],
    }),
  ]);
  if (payloads.length !== payloadIds.length || events.length !== attempts.length || commands.length !== attempts.length) {
    throw constraint('EXECUTION_SCOPE_DRIFT', 'Workflow replay lineage is incomplete.');
  }
  const payloadById = new Map(payloads.map((row) => [row.id, row]));
  const eventByAttempt = new Map(events.map((row) => [row.executionAttemptId, row]));
  const commandByAttempt = new Map(commands.map((row) => [row.executionAttemptId, row]));
  return {
    prerequisite,
    payloads: orderedAttempts.map((attempt) => mapPayload(payloadById.get(attempt.providerPayloadId)!)),
    attempts: orderedAttempts.map(mapAttempt),
    events: orderedAttempts.map((attempt) => mapEvent(eventByAttempt.get(attempt.id)!)),
    commands: orderedAttempts.map((attempt) => mapCommand(
      commandByAttempt.get(attempt.id)!,
      mapAttempt(attempt),
    )),
    replayed: true,
  };
}

function assertStartReplayMatchesInput(
  replay: ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite
  >,
  input: ExperimentFoundationExecutionV2StartInput,
): void {
  const inputCells = new Set(input.attempts.map((attempt) => attempt.run_cell_id));
  if (
    replay.prerequisite.run.run_id !== input.run_id
    || replay.attempts.length !== input.attempts.length
    || replay.payloads.length !== input.payloads.length
    || replay.events.length !== input.events.length
    || replay.commands.length !== input.commands.length
    || replay.attempts.some((attempt) => (
      attempt.workflow_business_key !== input.business_idempotency_key
      || attempt.workflow_request_hash !== input.request_hash
      || !inputCells.has(attempt.run_cell_id)
    ))
  ) {
    throw constraint(
      'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
      'Concurrent workflow replay changed its request hash or exact cell subset.',
    );
  }
}

function isExactReplayAttemptSubset(
  prerequisite:
    | ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite,
  attempts: AttemptRow[],
): boolean {
  const requiredCellIds = new Set(
    prerequisite.cells.map((cell) => cell.run_cell.run_cell_id),
  );
  const seen = new Set<string>();
  return attempts.every((attempt) => {
    if (!requiredCellIds.has(attempt.runCellId) || seen.has(attempt.runCellId)) return false;
    seen.add(attempt.runCellId);
    return attempt.runId === prerequisite.run.run_id
      && attempt.runManifestHash === prerequisite.run.run_manifest_hash
      && attempt.externalPiBranchId === prerequisite.external_pi_branch_id
      && attempt.externalPiWorkOrderRevisionId
        === prerequisite.run.external_pi_work_order_revision_id
      && attempt.externalPiWorkOrderRevisionHash
        === prerequisite.run.external_pi_work_order_revision_hash
      && attempt.externalPiRevisionSequence
        === prerequisite.run.external_pi_branch_revision_sequence;
  });
}

function assertStartPrerequisite(
  prerequisite:
    | ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite,
  input: ExperimentFoundationExecutionV2StartInput,
): void {
  if (prerequisite.run.run_manifest_hash !== input.expected_run_manifest_hash) {
    throw constraint('EXECUTION_SCOPE_DRIFT', 'Run manifest changed before start.');
  }
  if (
    prerequisite.head_acknowledgement.inbox_id !== input.expected_head_acknowledgement_inbox_id
    || prerequisite.head_acknowledgement.event_payload_hash
      !== input.expected_head_acknowledgement_payload_hash
  ) {
    throw constraint('EXECUTION_HEAD_ACK_REQUIRED', 'Exact durable head acknowledgement changed.');
  }
  if (
    prerequisite.head_acknowledgement.implementation_project_id
      !== prerequisite.implementation_project_id
    || prerequisite.head_acknowledgement.validation_cycle_id !== prerequisite.validation_cycle_id
    || prerequisite.head_acknowledgement.branch_id !== prerequisite.external_pi_branch_id
    || prerequisite.head_acknowledgement.work_order_revision_id
      !== prerequisite.run.external_pi_work_order_revision_id
    || prerequisite.head_acknowledgement.work_order_revision_hash
      !== prerequisite.run.external_pi_work_order_revision_hash
    || prerequisite.head_acknowledgement.revision_sequence
      !== prerequisite.run.external_pi_branch_revision_sequence
    || prerequisite.head_acknowledgement.run_id !== prerequisite.run.run_id
    || prerequisite.head_acknowledgement.run_manifest_hash !== prerequisite.run.run_manifest_hash
    || !isDeepStrictEqual(
      prerequisite.latest_branch_head_acknowledgement,
      prerequisite.head_acknowledgement,
    )
  ) {
    throw constraint('EXECUTION_RUN_NOT_CURRENT_HEAD', 'Run is not the latest acknowledged branch head.');
  }
  if (
    prerequisite.readiness.readiness_attestation_id
      !== input.expected_readiness_attestation_id
    || prerequisite.readiness.readiness_attestation_hash
      !== input.expected_readiness_attestation_hash
    || prerequisite.readiness.outcome !== 'passed'
    || prerequisite.readiness.ordered_dependencies.length === 0
    || prerequisite.readiness.ordered_dependencies.some((dependency, index) => (
      dependency.ordinal !== index + 1
      || dependency.readiness_attestation_id
        !== prerequisite.readiness.readiness_attestation_id
    ))
  ) {
    throw constraint('EXECUTION_READINESS_DRIFT', 'Exact readiness changed or is not passed.');
  }
}

async function assertStartShape(
  client: Client,
  prerequisite:
    | ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite,
  input: ExperimentFoundationExecutionV2StartInput,
  executionMode: 'simulation' | 'real_provider',
): Promise<void> {
  const required = new Map(prerequisite.cells.map((cell) => [cell.run_cell.run_cell_id, cell]));
  const latestByCell = await loadLatestRunAttemptsByCell(client, prerequisite.run.run_id);
  const expected = new Map(required);
  if (latestByCell.size > 0) {
    expected.clear();
    for (const [runCellId, cell] of required) {
      const latest = latestByCell.get(runCellId);
      if (!latest) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Retry lineage is missing a required cell Attempt.');
      }
      if (!['succeeded', 'failed', 'cancelled'].includes(latest.lifecycleState)) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Retry is blocked by a nonterminal latest Attempt.');
      }
      if (latest.lifecycleState === 'succeeded') continue;
      if (latest.attemptSequence >= cell.retry_ceiling) {
        throw constraint('EXECUTION_ATTEMPT_LIMIT_EXHAUSTED', 'TaskSpec retry ceiling is exhausted.');
      }
      expected.set(runCellId, cell);
    }
    if (expected.size === 0) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'All required cells already succeeded.');
    }
  }
  if (
    input.payloads.length !== expected.size
    || input.attempts.length !== expected.size
    || input.events.length !== expected.size
    || input.commands.length !== expected.size
  ) {
    throw constraint('EXECUTION_SCOPE_DRIFT', 'E1 records differ from exact initial/retry subset.');
  }
  const startRecords = indexWorkflowStartRecords(input);
  const seen = new Set<string>();
  for (const attempt of input.attempts) {
    const cell = expected.get(attempt.run_cell_id);
    if (!cell || seen.has(attempt.run_cell_id)) {
      throw constraint('EXECUTION_SCOPE_DRIFT', 'Attempt cell set differs from RunCell manifest.');
    }
    seen.add(attempt.run_cell_id);
    const prior = latestByCell.get(attempt.run_cell_id);
    if (prior) {
      if (!['failed', 'cancelled'].includes(prior.lifecycleState)) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Only terminal failure/cancel can retry.');
      }
      if (attempt.attempt_sequence !== prior.attemptSequence + 1) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt sequence did not advance once.');
      }
    } else if (attempt.attempt_sequence !== 1) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'First Attempt sequence must be one.');
    }
    if (attempt.attempt_sequence > cell.retry_ceiling) {
      throw constraint('EXECUTION_ATTEMPT_LIMIT_EXHAUSTED', 'TaskSpec retry ceiling is exhausted.');
    }
    const payload = startRecords.payloadByRunCellId.get(attempt.run_cell_id);
    const event = startRecords.eventByAttemptId.get(attempt.id);
    const command = startRecords.commandByAttemptId.get(attempt.id);
    assertAttemptTerminalStateReasonPair(attempt);
    if (!payload || !event || !command) {
      throw constraint(
        'EXECUTION_SCOPE_DRIFT',
        'E1 payload/Attempt/event/command cardinality or identity drifted.',
      );
    }
    if (!hasExactEventHash(event) || !hasExactCommandHash(command)) {
      throw constraint(
        'PROVIDER_RESPONSE_INVALID',
        'E1 event or command canonical hash drifted before persistence.',
      );
    }
    if (
      payload.id !== attempt.provider_payload_id
      || payload.payload_hash !== attempt.provider_payload_hash
      || payload.run_id !== prerequisite.run.run_id
      || payload.run_manifest_hash !== prerequisite.run.run_manifest_hash
      || payload.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || payload.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || !isExactProviderTuple(payload, attempt, executionMode)
      || attempt.implementation_project_id !== prerequisite.implementation_project_id
      || attempt.validation_cycle_id !== prerequisite.validation_cycle_id
      || attempt.external_pi_branch_id !== prerequisite.external_pi_branch_id
      || attempt.external_pi_work_order_revision_id
        !== prerequisite.run.external_pi_work_order_revision_id
      || attempt.external_pi_work_order_revision_hash
        !== prerequisite.run.external_pi_work_order_revision_hash
      || attempt.external_pi_revision_sequence
        !== prerequisite.run.external_pi_branch_revision_sequence
      || attempt.run_id !== prerequisite.run.run_id
      || attempt.run_manifest_hash !== prerequisite.run.run_manifest_hash
      || attempt.cell_key !== cell.run_cell.cell_key
      || attempt.training_task_spec_id !== cell.task_spec.training_task_spec_id
      || attempt.training_task_spec_hash !== cell.task_spec.task_spec_hash
      || attempt.head_acknowledgement_inbox_id
        !== prerequisite.head_acknowledgement.inbox_id
      || attempt.workflow_business_key !== input.business_idempotency_key
      || attempt.workflow_request_hash !== input.request_hash
      || attempt.lifecycle_state !== 'prepared'
      || attempt.state_version !== 0
      || event.event_sequence !== 1
      || event.event_type !== 'created'
      || event.prior_state !== null
      || event.next_state !== 'prepared'
      || event.provider_command_id !== null
      || event.payload_hash !== payload.payload_hash
      || event.external_job_ref !== null
      || event.external_job_ref_hash !== null
      || command.command_sequence !== 1
      || command.operation !== 'submit'
      || command.execution_attempt_id !== attempt.id
      || command.collection_attempt_id !== null
      || command.state !== 'pending'
      || command.payload_hash !== payload.payload_hash
      || command.provider_idempotency_key !== attempt.provider_idempotency_key
      || command.command_snapshot.operation !== 'submit'
      || command.command_snapshot.provider_payload_id !== payload.id
      || command.command_snapshot.provider_payload_hash !== payload.payload_hash
      || command.command_snapshot.external_job_ref !== null
      || command.command_snapshot.cancellation_reason !== null
      || command.external_job_ref !== null
      || command.external_job_ref_hash !== null
    ) {
      throw constraint('EXECUTION_SCOPE_DRIFT', 'E1 exact payload/Attempt/event/command scope drifted.');
    }
  }
}

async function assertLiveReadinessSnapshot(
  client: Client,
  prerequisite:
    | ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite,
): Promise<void> {
  const exactRefs = [
    prerequisite.readiness.target,
    ...prerequisite.readiness.ordered_dependencies.map((row) => row.dependency),
  ];
  const projections = await client.experimentFoundationAssetLifecycleProjectionV2.findMany({
    where: {
      OR: exactRefs.map((exactRef) => ({
        assetType: exactRef.asset_type,
        assetId: exactRef.logical_id,
        currentRevisionId: exactRef.revision_id,
        currentRevisionSequence: exactRef.revision_sequence,
        currentRevisionHash: exactRef.content_hash,
        lifecycleStatus: 'active',
        ...(exactRef.asset_type === 'Dataset' ? { locationAvailable: true } : {}),
      })),
    },
    select: {
      assetType: true,
      assetId: true,
      currentRevisionId: true,
      currentRevisionSequence: true,
      currentRevisionHash: true,
    },
  });
  const found = new Set(projections.map(readinessProjectionKey));
  for (const exactRef of exactRefs) {
    if (found.has(readinessExactRefKey(exactRef))) continue;
    throw constraint(
      'EXECUTION_READINESS_DRIFT',
      `Exact readiness lifecycle projection drifted: ${exactRef.asset_type}:${exactRef.revision_id}`,
    );
  }
}

function isExactProviderTuple(
  payload: ExperimentFoundationProviderPayloadV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  mode: 'simulation' | 'real_provider',
): boolean {
  if (
    payload.execution_mode !== mode
    || attempt.execution_mode !== mode
    || payload.provenance !== attempt.provenance
  ) return false;
  return mode === 'simulation'
    ? payload.payload_schema === 'FakeAliyunPaiDlcSubmitPayload@v1'
      && payload.adapter_identity === 'deterministic_fake_aliyun_pai_dlc@v1'
      && payload.provenance === 'non_production_fake_provider'
      && attempt.provenance === 'non_production_fake_provider'
    : payload.payload_schema === 'AliyunPaiDlcCreateJobPayload@v1'
      && payload.adapter_identity === 'aliyun_pai_dlc_official_sdk@v1'
      && payload.provenance === 'real_provider'
      && attempt.provenance === 'real_provider';
}

async function loadLatestRunAttemptsByCell(
  client: Client,
  runId: string,
): Promise<Map<string, AttemptRow>> {
  const latestSequences = await client.experimentFoundationExecutionAttemptV2.groupBy({
    by: ['runCellId'],
    where: { runId },
    _max: { attemptSequence: true },
  });
  const exactLatestBindings = latestSequences.flatMap((row) => (
    row._max.attemptSequence === null
      ? []
      : [{ runCellId: row.runCellId, attemptSequence: row._max.attemptSequence }]
  ));
  if (exactLatestBindings.length === 0) return new Map();
  const rows = await client.experimentFoundationExecutionAttemptV2.findMany({
    where: {
      runId,
      OR: exactLatestBindings,
    },
    orderBy: [{ runCellId: 'asc' }, { id: 'asc' }],
  });
  if (rows.length !== exactLatestBindings.length) {
    throw constraint('EXECUTION_SCOPE_DRIFT', 'Latest Attempt aggregation returned an inexact cell set.');
  }
  return new Map(rows.map((row) => [row.runCellId, row]));
}

function readinessExactRefKey(
  exactRef: ExperimentFoundationExecutionV2Prerequisite['readiness']['target'],
): string {
  return [
    exactRef.asset_type,
    exactRef.logical_id,
    exactRef.revision_id,
    exactRef.revision_sequence,
    exactRef.content_hash,
  ].join('\u0000');
}

function readinessProjectionKey(projection: {
  assetType: string;
  assetId: string;
  currentRevisionId: string;
  currentRevisionSequence: number;
  currentRevisionHash: string;
}): string {
  return [
    projection.assetType,
    projection.assetId,
    projection.currentRevisionId,
    projection.currentRevisionSequence,
    projection.currentRevisionHash,
  ].join('\u0000');
}

async function assertCommittedEventAndCommand(
  client: Client,
  event: ExperimentFoundationExecutionAttemptEventV2Record,
  command?: ExperimentFoundationProviderCommandV2Record,
): Promise<void> {
  const eventRow = await client.experimentFoundationExecutionAttemptEventV2.findUnique({
    where: { id: event.id },
  });
  if (!eventRow || !isDeepStrictEqual(mapEvent(eventRow), event)) {
    throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Committed event replay drifted.');
  }
  if (command) {
    const commandRow = await client.experimentFoundationProviderCommandV2.findUnique({
      where: { id: command.id },
      include: { executionAttempt: true },
    });
    if (
      !commandRow
      || !isDeepStrictEqual(
        mapCommand(commandRow, mapAttempt(commandRow.executionAttempt)),
        command,
      )
    ) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Committed next command replay drifted.');
    }
  }
}

async function assertNextEventSequence(
  client: Client,
  event: ExperimentFoundationExecutionAttemptEventV2Record,
): Promise<void> {
  const count = await client.experimentFoundationExecutionAttemptEventV2.count({
    where: { executionAttemptId: event.execution_attempt_id },
  });
  if (event.event_sequence !== count + 1) {
    throw constraint(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Attempt event sequence must be contiguous.',
    );
  }
}

async function findExactControlCommandReplay(
  client: Client,
  incoming: ExperimentFoundationProviderCommandV2Record,
): Promise<ExperimentFoundationProviderCommandV2Record | null> {
  const replay = await client.experimentFoundationProviderCommandV2.findUnique({
    where: { providerIdempotencyKey: incoming.provider_idempotency_key },
    include: { executionAttempt: true },
  });
  if (!replay) return null;
  const mapped = mapCommand(replay, mapAttempt(replay.executionAttempt));
  if (!sameControlCommandIntent(mapped, incoming)) {
    throw constraint(
      'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
      'Control idempotency key was reused with changed semantic intent.',
    );
  }
  return mapped;
}

async function assertNextControlCommandOrReplay(
  client: Client,
  command: ExperimentFoundationProviderCommandV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): Promise<ExperimentFoundationProviderCommandV2Record | null> {
  try {
    await assertNextCommandSequence(client, command, attempt);
    return null;
  } catch (error) {
    const replay = await findExactControlCommandReplay(client, command);
    if (replay) return replay;
    throw error;
  }
}

async function assertNextCommandSequence(
  client: Client,
  command: ExperimentFoundationProviderCommandV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): Promise<void> {
  const count = await client.experimentFoundationProviderCommandV2.count({
    where: { executionAttemptId: command.execution_attempt_id },
  });
  if (
    command.command_sequence !== count + 1
    || command.execution_attempt_id !== attempt.id
    || command.payload_hash !== attempt.provider_payload_hash
    || command.state !== 'pending'
    || command.response_hash !== null
    || command.lease_owner !== null
    || command.lease_expires_at !== null
    || command.last_heartbeat_at !== null
    || command.completed_at !== null
  ) {
    throw constraint(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Next provider command sequence, scope, or initial state drifted.',
    );
  }
}

async function assertCommittedEventAndOutputs(
  client: Client,
  event: ExperimentFoundationExecutionAttemptEventV2Record,
  outputs: ExperimentFoundationProvisionalOutputV2Record[],
): Promise<void> {
  await assertCommittedEventAndCommand(client, event);
  for (const output of outputs) {
    const row = await client.experimentFoundationProvisionalOutputV2.findUnique({
      where: { id: output.id },
    });
    if (!row || !isDeepStrictEqual(mapOutput(row), output)) {
      throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Committed output replay drifted.');
    }
  }
}

function assertClaimed(
  row: CommandRow,
  leaseOwner: string,
  expectedLeaseVersion: number,
  at: string,
): void {
  if (
    row.commandState !== 'claimed'
    || row.leaseOwner !== leaseOwner
    || row.leaseVersion !== expectedLeaseVersion
    || !row.leaseExpiresAt
    || row.leaseExpiresAt <= new Date(at)
  ) {
    throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command lease is absent, expired, or foreign.');
  }
}

function claimedCommandWhere(
  id: string,
  leaseOwner: string,
  expectedLeaseVersion: number,
  at: string,
) {
  return {
    id,
    commandState: 'claimed',
    leaseOwner,
    leaseVersion: expectedLeaseVersion,
    leaseExpiresAt: { gt: new Date(at) },
  } satisfies Prisma.ExperimentFoundationProviderCommandV2WhereInput;
}

function commandReadyWhere(
  at: Date,
  operations?: ExperimentFoundationExecutionV2CommandClaimInput['command_kinds'],
  executionModes?: ExperimentFoundationExecutionV2CommandClaimInput['execution_modes'],
) {
  return {
    ...(operations ? { operation: { in: operations } } : {}),
    ...(executionModes
      ? { executionAttempt: { executionMode: { in: executionModes } } }
      : {}),
    AND: [
      {
        OR: [
          { commandState: 'pending', OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: at } }] },
          { commandState: 'claimed', leaseExpiresAt: { lte: at } },
        ],
      },
      {
        // A cancel enqueued while submit is leased remains durable but is not
        // dispatchable until the owning Attempt leaves prepared.
        OR: [
          { operation: { not: 'cancel' } },
          { executionAttempt: { lifecycleState: { not: 'prepared' } } },
        ],
      },
    ],
  } satisfies Prisma.ExperimentFoundationProviderCommandV2WhereInput;
}

function completedCommandData(at: string, responseHash: string, terminalErrorCode?: string) {
  return {
    commandState: terminalErrorCode ? 'terminal' : 'succeeded',
    leaseOwner: null,
    leaseExpiresAt: null,
    heartbeatAt: null,
    responseHash,
    lastErrorCode: terminalErrorCode ?? null,
    updatedAt: new Date(at),
    terminalAt: new Date(at),
  } satisfies Prisma.ExperimentFoundationProviderCommandV2UpdateManyMutationInput;
}

export function mapExperimentFoundationProviderPayloadV2CreateData(
  record: ExperimentFoundationProviderPayloadV2Record,
) {
  const redactedManifest =
    providerPayloadManifestForWrite(record);
  return {
    id: record.id,
    materializationKey: record.materialization_key,
    runId: record.run_id,
    runManifestHash: record.run_manifest_hash,
    runCellId: record.run_cell_id,
    cellKey: record.cell_key,
    trainingTaskSpecId: record.training_task_spec_id,
    trainingTaskSpecHash: record.training_task_spec_hash,
    payloadSchemaVersion: record.payload_schema,
    adapterIdentity: record.adapter_identity,
    executionMode: record.execution_mode,
    provenance: record.provenance,
    providerProfileVersion: record.provider_profile_version,
    redactedManifestVersion: String(redactedManifest.manifest_schema_version),
    redactedManifestJson: toJson(redactedManifest),
    payloadHash: record.payload_hash,
    payloadByteSize: record.payload_byte_size,
    createdAt: new Date(record.created_at),
  } satisfies Prisma.ExperimentFoundationProviderPayloadV2UncheckedCreateInput;
}

function providerPayloadManifestForWrite(
  record: ExperimentFoundationProviderPayloadV2Record,
): Readonly<Record<string, unknown>> {
  const value = record.redacted_manifest;
  const manifestSchemaVersion = value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    ? (value as Record<string, unknown>).manifest_schema_version
    : undefined;
  const versionAllowed = record.execution_mode === 'simulation'
    ? manifestSchemaVersion === STORED_SCHEMA_VERSION_V1
    : manifestSchemaVersion === STORED_SCHEMA_VERSION_V1 || manifestSchemaVersion === 'v2';
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
    || !versionAllowed
  ) {
    throw constraint(
      'PROVIDER_PAYLOAD_CONFLICT',
      record.execution_mode === 'simulation'
        ? 'Simulation ProviderPayload redacted manifest must be a v1 JSON object.'
        : 'Real ProviderPayload redacted manifest must be a v1 or v2 JSON object.',
    );
  }
  return value as Readonly<Record<string, unknown>>;
}

function attemptCreateData(record: ExperimentFoundationExecutionAttemptV2Record) {
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
    terminalReasonCode: record.terminal_reason_code,
    externalJobRefSchemaVersion: record.external_job_ref ? STORED_SCHEMA_VERSION_V1 : null,
    externalJobRefJson: externalRefJson(
      record.external_job_ref,
      record.external_job_ref_type ?? (record.execution_mode === 'real_provider'
        ? 'aliyun_pai_dlc_job'
        : 'fake_aliyun_pai_dlc_job'),
      record.external_job_ref_region_hash ?? null,
    ),
    externalJobRefHash: record.external_job_ref_hash,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    terminalAt: record.terminal_at ? new Date(record.terminal_at) : null,
  } satisfies Prisma.ExperimentFoundationExecutionAttemptV2UncheckedCreateInput;
}

function attemptUpdateData(record: ExperimentFoundationExecutionAttemptV2Record) {
  return {
    lifecycleState: record.lifecycle_state,
    stateVersion: record.state_version,
    terminalReasonCode: record.terminal_reason_code,
    externalJobRefSchemaVersion: record.external_job_ref ? STORED_SCHEMA_VERSION_V1 : null,
    externalJobRefJson: externalRefJson(
      record.external_job_ref,
      record.external_job_ref_type ?? (record.execution_mode === 'real_provider'
        ? 'aliyun_pai_dlc_job'
        : 'fake_aliyun_pai_dlc_job'),
      record.external_job_ref_region_hash ?? null,
    ),
    externalJobRefHash: record.external_job_ref_hash,
    updatedAt: new Date(record.updated_at),
    terminalAt: record.terminal_at ? new Date(record.terminal_at) : null,
  } satisfies Prisma.ExperimentFoundationExecutionAttemptV2UpdateManyMutationInput;
}

function eventCreateData(record: ExperimentFoundationExecutionAttemptEventV2Record) {
  assertRecordSchemaVersion(
    record.event_snapshot.snapshot_schema_version,
    'PROVIDER_RESPONSE_INVALID',
    'AttemptEvent snapshot',
  );
  if (!hasExactEventHash(record)) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'AttemptEvent write hash drifted from its typed v1 snapshot.',
    );
  }
  return {
    id: record.id,
    executionAttemptId: record.execution_attempt_id,
    eventSequence: record.event_sequence,
    eventType: record.event_type,
    priorState: record.prior_state,
    nextState: record.next_state,
    providerCommandId: record.provider_command_id,
    providerPayloadHash: record.payload_hash,
    externalJobRefJson: externalRefJson(
      record.external_job_ref,
      record.external_job_ref_type ?? 'fake_aliyun_pai_dlc_job',
      record.external_job_ref_region_hash ?? null,
    ),
    externalJobRefHash: record.external_job_ref_hash,
    eventSchemaVersion: STORED_SCHEMA_VERSION_V1,
    eventSnapshotJson: toJson(record.event_snapshot),
    eventHash: record.event_hash,
    occurredAt: new Date(record.occurred_at),
  } satisfies Prisma.ExperimentFoundationExecutionAttemptEventV2UncheckedCreateInput;
}

function commandCreateData(record: ExperimentFoundationProviderCommandV2Record) {
  assertRecordSchemaVersion(
    record.command_snapshot.command_schema_version,
    'PROVIDER_RESPONSE_INVALID',
    'ProviderCommand snapshot',
  );
  if (!hasExactCommandHash(record)) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'ProviderCommand write hash drifted from its typed v1 snapshot.',
    );
  }
  return {
    id: record.id,
    executionAttemptId: record.execution_attempt_id,
    collectionAttemptId: record.collection_attempt_id,
    commandSequence: record.command_sequence,
    operation: record.operation,
    commandSchemaVersion: STORED_SCHEMA_VERSION_V1,
    commandSnapshotJson: toJson(record.command_snapshot),
    commandHash: record.command_hash,
    responseHash: record.response_hash,
    providerIdempotencyKey: record.provider_idempotency_key,
    providerPayloadHash: record.payload_hash,
    externalJobRefJson: externalRefJson(
      record.external_job_ref,
      record.external_job_ref_type ?? 'fake_aliyun_pai_dlc_job',
      record.external_job_ref_region_hash ?? null,
    ),
    externalJobRefHash: record.external_job_ref_hash,
    commandState: record.state,
    leaseVersion: record.lease_version,
    leaseOwner: record.lease_owner,
    leaseExpiresAt: toDate(record.lease_expires_at),
    heartbeatAt: toDate(record.last_heartbeat_at),
    attemptCount: record.attempt_count,
    nextAttemptAt: toDate(record.next_attempt_at),
    lastErrorCode: record.last_error_code,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    terminalAt: toDate(record.completed_at),
  } satisfies Prisma.ExperimentFoundationProviderCommandV2UncheckedCreateInput;
}

function hasExactEventHash(record: ExperimentFoundationExecutionAttemptEventV2Record): boolean {
  return record.event_hash === serverHashExperimentFoundationExecutionAttemptEventV2({
    execution_attempt_id: record.execution_attempt_id,
    event_sequence: record.event_sequence,
    event_type: record.event_type,
    prior_state: record.prior_state,
    next_state: record.next_state,
    provider_command_id: record.provider_command_id,
    payload_hash: record.payload_hash,
    external_job_ref: record.external_job_ref,
    external_job_ref_hash: record.external_job_ref_hash,
    event_snapshot: record.event_snapshot,
    occurred_at: record.occurred_at,
  });
}

function hasExactCommandHash(record: ExperimentFoundationProviderCommandV2Record): boolean {
  return record.command_hash === serverHashExperimentFoundationProviderCommandV2({
    provider_idempotency_key: record.provider_idempotency_key,
    command_snapshot: record.command_snapshot,
  });
}

function collectionCreateData(record: ExperimentFoundationCollectionAttemptV2Record) {
  return {
    id: record.id,
    executionAttemptId: record.execution_attempt_id,
    businessIdempotencyKey: record.business_idempotency_key,
    collectionRequestHash: record.request_hash,
    providerPayloadId: record.provider_payload_id,
    providerPayloadHash: record.provider_payload_hash,
    externalJobRefJson: externalRefRequiredJson(
      record.external_job_ref,
      record.external_job_ref_type ?? 'fake_aliyun_pai_dlc_job',
      record.external_job_ref_region_hash ?? null,
    ),
    externalJobRefHash: record.external_job_ref_hash,
    collectionState: record.collection_state,
    stateVersion: record.state_version,
    preparedAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    collectedAt: toDate(record.terminal_at),
  } satisfies Prisma.ExperimentFoundationCollectionAttemptV2UncheckedCreateInput;
}

function collectionUpdateData(record: ExperimentFoundationCollectionAttemptV2Record) {
  return {
    collectionState: record.collection_state,
    stateVersion: record.state_version,
    updatedAt: new Date(record.updated_at),
    collectedAt: toDate(record.terminal_at),
  } satisfies Prisma.ExperimentFoundationCollectionAttemptV2UpdateManyMutationInput;
}

function outputCreateData(record: ExperimentFoundationProvisionalOutputV2Record) {
  return {
    id: record.id,
    collectionAttemptId: record.collection_attempt_id,
    ordinal: record.ordinal,
    outputKind: record.output_kind,
    outputClass: record.output_class,
    manifestSchemaVersion: record.output_manifest_schema_version,
    redactedManifestJson: toJson(record.redacted_manifest),
    outputHash: record.output_hash,
    createdAt: new Date(record.created_at),
  } satisfies Prisma.ExperimentFoundationProvisionalOutputV2UncheckedCreateInput;
}

function mapPayload(row: PayloadRow): ExperimentFoundationProviderPayloadV2Record {
  if (row.executionMode === 'real_provider') return mapRealProviderPayload(row);
  const redactedManifest = decodeStoredExecutionSnapshot(
    providerPayloadManifestValidator,
    row.redactedManifestJson,
    'ProviderPayload redacted manifest',
    'PROVIDER_PAYLOAD_CONFLICT',
  );
  if (
    row.payloadSchemaVersion !== EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2
    || row.adapterIdentity !== EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2
    || row.executionMode !== EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2[0]
    || row.provenance !== EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2[0]
    || row.redactedManifestVersion !== STORED_SCHEMA_VERSION_V1
    || redactedManifest.manifest_schema_version !== row.redactedManifestVersion
    || redactedManifest.payload_schema !== row.payloadSchemaVersion
    || redactedManifest.adapter_identity !== row.adapterIdentity
    || redactedManifest.simulation_profile_version !== row.providerProfileVersion
    || !isDeepStrictEqual(redactedManifest.source_binding, {
      run_id: row.runId,
      run_manifest_hash: row.runManifestHash,
      run_cell_id: row.runCellId,
      cell_key: row.cellKey,
      training_task_spec_id: row.trainingTaskSpecId,
      training_task_spec_hash: row.trainingTaskSpecHash,
    })
    || !isDeepStrictEqual(redactedManifest.redacted_fields, [
      'canonical_payload_bytes',
      'profile.workspace_id',
      'simulated_job.arguments',
    ])
  ) {
    throw constraint(
      'PROVIDER_PAYLOAD_CONFLICT',
      'ProviderPayload fixed identity or redacted-manifest binding drifted.',
    );
  }
  const wireRecord = {
    provider_payload_id: row.id,
    materialization_key: row.materializationKey,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    cell_key: row.cellKey,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: row.trainingTaskSpecHash,
    payload_schema: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
    adapter_identity: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
    execution_mode: EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2[0],
    provenance: EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2[0],
    provider_profile_version: row.providerProfileVersion,
    redacted_manifest: redactedManifest,
    payload_hash: row.payloadHash,
    payload_byte_size: row.payloadByteSize,
    created_at: row.createdAt.toISOString(),
  };
  assertStoredExecutionValue(
    providerPayloadValidator,
    wireRecord,
    'ProviderPayload',
    'PROVIDER_PAYLOAD_CONFLICT',
  );
  return {
    id: row.id,
    materialization_key: row.materializationKey,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    cell_key: row.cellKey,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: row.trainingTaskSpecHash,
    payload_schema: EXPERIMENT_FOUNDATION_PROVIDER_PAYLOAD_SCHEMA_V2,
    adapter_identity: EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
    execution_mode: EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2[0],
    provenance: EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2[0],
    provider_profile_version: row.providerProfileVersion,
    redacted_manifest: redactedManifest,
    payload_hash: row.payloadHash,
    payload_byte_size: row.payloadByteSize,
    created_at: row.createdAt.toISOString(),
  };
}

function mapRealProviderPayload(row: PayloadRow): ExperimentFoundationProviderPayloadV2Record {
  const redactedManifest = decodeStoredExecutionSnapshot(
    realProviderPayloadManifestValidator,
    row.redactedManifestJson,
    'Real ProviderPayload redacted manifest',
    'PROVIDER_PAYLOAD_CONFLICT',
  ) as unknown as ExperimentFoundationAliyunRealProviderRedactedManifest;
  const source = redactedManifest.source_binding;
  const expectedRedactedFields = [
      'canonical_payload_bytes',
      'WorkspaceId',
      'ResourceId',
      'JobSpecs[0].Image',
      'UserCommand',
      'DataSources[*].Uri',
      'DataSources[*].MountPath',
      'DataSources[*].Options',
      'Envs',
      'CredentialConfig',
      'Settings.Tags',
  ];
  const bindingDrifts = [
    row.payloadSchemaVersion !== EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2
      && 'payload_schema_version',
    row.adapterIdentity !== EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2
      && 'adapter_identity',
    row.executionMode !== 'real_provider' && 'execution_mode',
    row.provenance !== 'real_provider' && 'provenance',
    !['v1', 'v2'].includes(row.redactedManifestVersion) && 'stored_manifest_version',
    redactedManifest.manifest_schema_version !== row.redactedManifestVersion
      && 'manifest_version',
    redactedManifest.payload_schema !== row.payloadSchemaVersion && 'manifest_payload_schema',
    redactedManifest.adapter_identity !== row.adapterIdentity && 'manifest_adapter_identity',
    redactedManifest.provider_profile_version !== row.providerProfileVersion
      && 'manifest_provider_profile',
    source.run_id !== row.runId && 'source_run_id',
    source.run_manifest_hash !== row.runManifestHash && 'source_run_manifest_hash',
    source.run_cell_id !== row.runCellId && 'source_run_cell_id',
    source.cell_key !== row.cellKey && 'source_cell_key',
    source.training_task_spec_id !== row.trainingTaskSpecId && 'source_task_spec_id',
    source.training_task_spec_hash !== row.trainingTaskSpecHash && 'source_task_spec_hash',
    !isDeepStrictEqual(redactedManifest.redacted_fields, expectedRedactedFields)
      && 'redacted_fields',
  ].filter((value): value is string => typeof value === 'string');
  if (bindingDrifts.length > 0) {
    throw constraint(
      'PROVIDER_PAYLOAD_CONFLICT',
      `Real ProviderPayload fixed identity or redacted-manifest binding drifted: ${bindingDrifts.join(',')}.`,
    );
  }
  const wireRecord = {
    provider_payload_id: row.id,
    materialization_key: row.materializationKey,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    cell_key: row.cellKey,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: row.trainingTaskSpecHash,
    payload_schema: EXPERIMENT_FOUNDATION_REAL_PROVIDER_PAYLOAD_SCHEMA_V2,
    adapter_identity: EXPERIMENT_FOUNDATION_REAL_PROVIDER_ADAPTER_IDENTITY_V2,
    execution_mode: 'real_provider' as const,
    provenance: 'real_provider' as const,
    provider_profile_version: row.providerProfileVersion,
    redacted_manifest: redactedManifest,
    payload_hash: row.payloadHash,
    payload_byte_size: row.payloadByteSize,
    created_at: row.createdAt.toISOString(),
  };
  assertStoredExecutionValue(
    providerPayloadValidator,
    wireRecord,
    'Real ProviderPayload',
    'PROVIDER_PAYLOAD_CONFLICT',
  );
  return {
    id: row.id,
    materialization_key: row.materializationKey,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    cell_key: row.cellKey,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: row.trainingTaskSpecHash,
    payload_schema: wireRecord.payload_schema,
    adapter_identity: wireRecord.adapter_identity,
    execution_mode: wireRecord.execution_mode,
    provenance: wireRecord.provenance,
    provider_profile_version: row.providerProfileVersion,
    redacted_manifest: redactedManifest,
    payload_hash: row.payloadHash,
    payload_byte_size: row.payloadByteSize,
    created_at: row.createdAt.toISOString(),
  };
}

function mapCycleActiveRealAttemptRef(row: {
  id: string;
  externalPiImplementationProjectId: string;
  externalPiValidationCycleId: string;
  externalPiBranchId: string;
  externalPiWorkOrderRevisionId: string;
  externalPiWorkOrderRevisionHash: string;
  externalPiRevisionSequence: number;
  runId: string;
  runManifestHash: string;
  runCellId: string;
  attemptSequence: number;
  stateVersion: number;
  executionMode: string;
  lifecycleState: string;
}): ExperimentFoundationCycleActiveRealAttemptRefV2 {
  if (row.executionMode !== 'real_provider' || !isActiveRealAttemptState(row.lifecycleState)) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      'Cycle active-real fence returned an invalid mode or non-active Attempt state.',
    );
  }
  return {
    execution_attempt_id: row.id,
    implementation_project_id: row.externalPiImplementationProjectId,
    validation_cycle_id: row.externalPiValidationCycleId,
    external_pi_branch_id: row.externalPiBranchId,
    external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
    external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
    external_pi_revision_sequence: row.externalPiRevisionSequence,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    attempt_sequence: row.attemptSequence,
    state_version: row.stateVersion,
    execution_mode: 'real_provider',
    lifecycle_state: row.lifecycleState,
  };
}

function isActiveRealAttemptState(
  value: string,
): value is ExperimentFoundationCycleActiveRealAttemptRefV2['lifecycle_state'] {
  return (EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2 as readonly string[])
    .includes(value);
}

function mapAttempt(row: AttemptRow): ExperimentFoundationExecutionAttemptV2Record {
  const externalJob = readExactExternalJobRef(
    row.externalJobRefJson,
    row.externalJobRefHash,
    'EXECUTION_SCOPE_DRIFT',
    'ExecutionAttempt',
  );
  if (
    (externalJob === null && row.externalJobRefSchemaVersion !== null)
    || (externalJob !== null && row.externalJobRefSchemaVersion !== STORED_SCHEMA_VERSION_V1)
  ) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      'ExecutionAttempt external job ref schema version drifted.',
    );
  }
  const executionMode = decodeStoredEnum(
    row.executionMode,
    EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2,
    'ExecutionAttempt execution mode',
    'EXECUTION_SCOPE_DRIFT',
  );
  const provenance = decodeStoredEnum(
    row.provenance,
    EXPERIMENT_FOUNDATION_EXECUTION_PROVENANCES_V2,
    'ExecutionAttempt provenance',
    'EXECUTION_SCOPE_DRIFT',
  );
  const lifecycleState = decodeStoredEnum(
    row.lifecycleState,
    EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2,
    'ExecutionAttempt lifecycle state',
    'EXECUTION_SCOPE_DRIFT',
  );
  const terminalReasonCode = row.terminalReasonCode === null
    ? null
    : decodeStoredEnum(
      row.terminalReasonCode,
      EXPERIMENT_FOUNDATION_EXECUTION_TERMINAL_REASON_CODES_V2,
      'ExecutionAttempt terminal reason',
      'EXECUTION_SCOPE_DRIFT',
    );
  const record: ExperimentFoundationExecutionAttemptV2Record = {
    id: row.id,
    implementation_project_id: row.externalPiImplementationProjectId,
    validation_cycle_id: row.externalPiValidationCycleId,
    external_pi_branch_id: row.externalPiBranchId,
    external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
    external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
    external_pi_revision_sequence: row.externalPiRevisionSequence,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    run_cell_id: row.runCellId,
    cell_key: row.cellKey,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: row.trainingTaskSpecHash,
    provider_payload_id: row.providerPayloadId,
    provider_payload_hash: row.providerPayloadHash,
    head_acknowledgement_inbox_id: row.headAcknowledgementInboxId,
    attempt_sequence: row.attemptSequence,
    workflow_business_key: row.workflowBusinessKey,
    workflow_request_hash: row.workflowRequestHash,
    execution_mode: executionMode,
    provenance,
    provider_idempotency_key: row.providerIdempotencyKey,
    lifecycle_state: lifecycleState,
    state_version: row.stateVersion,
    terminal_reason_code: terminalReasonCode,
    external_job_ref: externalJob?.id ?? null,
    external_job_ref_hash: row.externalJobRefHash,
    external_job_ref_type: externalJob?.type ?? null,
    external_job_ref_region_hash: externalJob?.regionHash ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    terminal_at: row.terminalAt?.toISOString() ?? null,
  };
  assertStoredExecutionValue(
    executionAttemptValidator,
    executionAttemptWireRecord(record),
    'ExecutionAttempt',
    'EXECUTION_SCOPE_DRIFT',
  );
  assertAttemptTerminalStateReasonPair(record);
  return record;
}

function mapEvent(row: EventRow): ExperimentFoundationExecutionAttemptEventV2Record {
  const externalJob = readExactExternalJobRef(
    row.externalJobRefJson,
    row.externalJobRefHash,
    'PROVIDER_RESPONSE_INVALID',
    'AttemptEvent',
  );
  const snapshot = decodeStoredExecutionSnapshot(
    attemptEventSnapshotValidator,
    row.eventSnapshotJson,
    'AttemptEvent snapshot',
  );
  assertStoredSchemaVersion(
    row.eventSchemaVersion,
    snapshot.snapshot_schema_version,
    'PROVIDER_RESPONSE_INVALID',
    'AttemptEvent snapshot',
  );
  const eventType = decodeStoredEnum(
    row.eventType,
    EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_EVENT_TYPES_V2,
    'AttemptEvent event type',
    'PROVIDER_RESPONSE_INVALID',
  );
  const priorState = row.priorState === null
    ? null
    : decodeStoredEnum(
      row.priorState,
      EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2,
      'AttemptEvent prior state',
      'PROVIDER_RESPONSE_INVALID',
    );
  const nextState = decodeStoredEnum(
    row.nextState,
    EXPERIMENT_FOUNDATION_EXECUTION_ATTEMPT_STATES_V2,
    'AttemptEvent next state',
    'PROVIDER_RESPONSE_INVALID',
  );
  const expectedHash = serverHashExperimentFoundationExecutionAttemptEventV2({
    execution_attempt_id: row.executionAttemptId,
    event_sequence: row.eventSequence,
    event_type: eventType,
    prior_state: priorState,
    next_state: nextState,
    provider_command_id: row.providerCommandId,
    payload_hash: row.providerPayloadHash,
    external_job_ref: externalJob?.id ?? null,
    external_job_ref_hash: row.externalJobRefHash,
    event_snapshot: snapshot,
    occurred_at: row.occurredAt.toISOString(),
  });
  if (row.eventHash !== expectedHash) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'AttemptEvent canonical hash drifted from its typed v1 snapshot.',
    );
  }
  const record: ExperimentFoundationExecutionAttemptEventV2Record = {
    id: row.id,
    execution_attempt_id: row.executionAttemptId,
    event_sequence: row.eventSequence,
    event_type: eventType,
    prior_state: priorState,
    next_state: nextState,
    provider_command_id: row.providerCommandId,
    payload_hash: row.providerPayloadHash,
    external_job_ref: externalJob?.id ?? null,
    external_job_ref_hash: row.externalJobRefHash,
    external_job_ref_type: externalJob?.type ?? null,
    external_job_ref_region_hash: externalJob?.regionHash ?? null,
    event_snapshot: snapshot,
    event_hash: row.eventHash,
    occurred_at: row.occurredAt.toISOString(),
  };
  assertStoredExecutionValue(
    attemptEventValidator,
    attemptEventWireRecord(record),
    'AttemptEvent',
    'PROVIDER_RESPONSE_INVALID',
  );
  assertAttemptEventStatePair(record);
  return record;
}

function mapCommand(
  row: CommandRow,
  owningAttempt: ExperimentFoundationExecutionAttemptV2Record,
): ExperimentFoundationProviderCommandV2Record {
  const externalJob = readExactExternalJobRef(
    row.externalJobRefJson,
    row.externalJobRefHash,
    'PROVIDER_RESPONSE_INVALID',
    'ProviderCommand',
  );
  const snapshot = decodeStoredExecutionSnapshot(
    providerCommandSnapshotValidator,
    row.commandSnapshotJson,
    'ProviderCommand snapshot',
  );
  assertStoredSchemaVersion(
    row.commandSchemaVersion,
    snapshot.command_schema_version,
    'PROVIDER_RESPONSE_INVALID',
    'ProviderCommand snapshot',
  );
  const operation = decodeStoredEnum(
    row.operation,
    EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_OPERATIONS_V2,
    'ProviderCommand operation',
    'PROVIDER_RESPONSE_INVALID',
  );
  const commandState = decodeStoredEnum(
    row.commandState,
    EXPERIMENT_FOUNDATION_PROVIDER_COMMAND_STATES_V2,
    'ProviderCommand state',
    'PROVIDER_RESPONSE_INVALID',
  );
  const expectedSnapshotExternalRef = externalJob?.wire ?? null;
  if (
    row.executionAttemptId !== owningAttempt.id
    || snapshot.operation !== operation
    || snapshot.provider_payload_id !== owningAttempt.provider_payload_id
    || snapshot.provider_payload_hash !== row.providerPayloadHash
    || snapshot.provider_payload_hash !== owningAttempt.provider_payload_hash
    || row.providerPayloadHash !== owningAttempt.provider_payload_hash
    || !isDeepStrictEqual(snapshot.external_job_ref, expectedSnapshotExternalRef)
    || (operation === 'cancel'
      ? snapshot.cancellation_reason !== 'operator_cancelled'
      : snapshot.cancellation_reason !== null)
  ) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'ProviderCommand typed snapshot drifted from its owning Attempt or cancellation contract.',
    );
  }
  const expectedHash = serverHashExperimentFoundationProviderCommandV2({
    provider_idempotency_key: row.providerIdempotencyKey,
    command_snapshot: snapshot,
  });
  if (row.commandHash !== expectedHash) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'ProviderCommand canonical hash drifted from its typed v1 snapshot.',
    );
  }
  const record: ExperimentFoundationProviderCommandV2Record = {
    id: row.id,
    execution_attempt_id: row.executionAttemptId,
    collection_attempt_id: row.collectionAttemptId,
    command_sequence: row.commandSequence,
    operation,
    command_snapshot: snapshot,
    command_hash: row.commandHash,
    response_hash: row.responseHash,
    provider_idempotency_key: row.providerIdempotencyKey,
    payload_hash: row.providerPayloadHash,
    external_job_ref: externalJob?.id ?? null,
    external_job_ref_hash: row.externalJobRefHash,
    external_job_ref_type: externalJob?.type ?? null,
    external_job_ref_region_hash: externalJob?.regionHash ?? null,
    state: commandState,
    lease_version: row.leaseVersion,
    lease_owner: row.leaseOwner,
    lease_expires_at: row.leaseExpiresAt?.toISOString() ?? null,
    last_heartbeat_at: row.heartbeatAt?.toISOString() ?? null,
    attempt_count: row.attemptCount,
    next_attempt_at: row.nextAttemptAt?.toISOString() ?? null,
    last_error_code: row.lastErrorCode,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    completed_at: row.terminalAt?.toISOString() ?? null,
  };
  assertStoredExecutionValue(
    providerCommandValidator,
    providerCommandWireRecord(record),
    'ProviderCommand',
    'PROVIDER_RESPONSE_INVALID',
  );
  assertProviderCommandStateShape(record);
  return record;
}

function mapCollection(row: CollectionRow): ExperimentFoundationCollectionAttemptV2Record {
  const externalJob = readExactExternalJobRef(
    row.externalJobRefJson,
    row.externalJobRefHash,
    'PROVIDER_RESPONSE_INVALID',
    'CollectionAttempt',
  );
  if (!externalJob) {
    throw constraint('PROVIDER_RESPONSE_INVALID', 'Collection external ref is missing.');
  }
  const collectionState = decodeStoredEnum(
    row.collectionState,
    EXPERIMENT_FOUNDATION_COLLECTION_ATTEMPT_STATES_V2,
    'CollectionAttempt state',
    'COLLECTION_ATTEMPT_CONFLICT',
  );
  const record: ExperimentFoundationCollectionAttemptV2Record = {
    id: row.id,
    execution_attempt_id: row.executionAttemptId,
    provider_payload_id: row.providerPayloadId,
    provider_payload_hash: row.providerPayloadHash,
    external_job_ref: externalJob.id,
    external_job_ref_hash: row.externalJobRefHash,
    external_job_ref_type: externalJob.type,
    external_job_ref_region_hash: externalJob.regionHash,
    business_idempotency_key: row.businessIdempotencyKey,
    request_hash: row.collectionRequestHash,
    collection_state: collectionState,
    state_version: row.stateVersion,
    created_at: row.preparedAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    terminal_at: row.collectedAt?.toISOString() ?? null,
  };
  assertStoredExecutionValue(
    collectionAttemptValidator,
    collectionAttemptWireRecord(record),
    'CollectionAttempt',
    'COLLECTION_ATTEMPT_CONFLICT',
  );
  if (
    (record.collection_state === 'prepared' && record.terminal_at !== null)
    || (record.collection_state !== 'prepared' && record.terminal_at === null)
  ) {
    throw constraint(
      'COLLECTION_ATTEMPT_CONFLICT',
      'CollectionAttempt state and terminal timestamp are not an exact pair.',
    );
  }
  return record;
}

function mapOutput(row: OutputRow): ExperimentFoundationProvisionalOutputV2Record {
  const outputKind = decodeStoredEnum(
    row.outputKind,
    EXPERIMENT_FOUNDATION_PROVISIONAL_OUTPUT_KINDS_V2,
    'ProvisionalOutput kind',
    'COLLECTION_ATTEMPT_CONFLICT',
  );
  if (row.outputClass !== 'diagnostic_only') {
    throw constraint(
      'COLLECTION_ATTEMPT_CONFLICT',
      'ProvisionalOutput class drifted from diagnostic_only.',
    );
  }
  const manifest = decodeStoredExecutionSnapshot(
    provisionalOutputManifestValidator,
    row.redactedManifestJson,
    'ProvisionalOutput manifest',
    'COLLECTION_ATTEMPT_CONFLICT',
  );
  const isSimulationOutput = outputKind !== 'real_provider_result_envelope'
    && outputKind !== 'real_provider_diagnostic_log';
  const expectedLocator = outputKind === 'real_provider_result_envelope'
    ? `result-manifest://${row.outputHash}`
    : `diagnostic://${row.outputHash}`;
  const expectedId = isSimulationOutput
    ? `fake_diagnostic_output_${row.outputHash.slice(
      'sha256:'.length,
      'sha256:'.length + 32,
    )}`
    : `real_provider_output_${row.outputHash.slice(
      'sha256:'.length,
      'sha256:'.length + 32,
    )}`;
  if (
    row.manifestSchemaVersion !== STORED_SCHEMA_VERSION_V1
    || manifest.manifest_schema_version !== row.manifestSchemaVersion
    || manifest.output_kind !== outputKind
    || manifest.output_class !== row.outputClass
    || manifest.redacted_locator !== expectedLocator
    || row.id !== expectedId
  ) {
    throw constraint(
      'COLLECTION_ATTEMPT_CONFLICT',
      'ProvisionalOutput typed manifest or output-hash binding drifted.',
    );
  }
  const record: ExperimentFoundationProvisionalOutputV2Record = {
    id: row.id,
    collection_attempt_id: row.collectionAttemptId,
    ordinal: row.ordinal,
    output_kind: outputKind,
    output_manifest_schema_version: row.manifestSchemaVersion,
    output_class: 'diagnostic_only',
    redacted_manifest: manifest,
    output_hash: row.outputHash,
    created_at: row.createdAt.toISOString(),
  };
  assertStoredExecutionValue(
    provisionalOutputValidator,
    provisionalOutputWireRecord(record),
    'ProvisionalOutput',
    'COLLECTION_ATTEMPT_CONFLICT',
  );
  return record;
}

function mapAcknowledgement(
  row: InboxRow,
  expectation: HeadAcknowledgementExpectation,
): ExperimentFoundationExecutionV2HeadAcknowledgement {
  let event;
  try {
    const storedOutcome = decodeExperimentV2InboxOutcome(row);
    if (storedOutcome.outcome !== 'processed') {
      throw new StoredExperimentV2EventIntegrityError(
        'Head acknowledgement does not have the processed outcome.',
      );
    }
    event = reconstructExperimentV2Event(row);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('EXECUTION_SCOPE_DRIFT', error.message);
    }
    throw error;
  }
  if (
    row.consumerName !== EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER
    || event.event_type !== 'BranchHeadAdvanced'
  ) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      'Stored execution acknowledgement is not the exact EF BranchHeadAdvanced receipt.',
    );
  }
  if (
    event.branch_id !== (expectation.kind === 'exact'
      ? expectation.run.externalPiBranchId
      : expectation.branch_id)
    || (expectation.kind === 'exact' && (
      event.work_order_revision_id !== expectation.run.externalPiWorkOrderRevisionId
      || event.work_order_revision_hash !== expectation.run.externalPiWorkOrderRevisionHash
      || event.branch_revision_sequence !== expectation.run.externalPiRevisionSequence
      || event.payload.run_id !== expectation.run.id
      || event.payload.run_manifest_hash !== expectation.run.runManifestHash
    ))
  ) {
    throw constraint(
      'EXECUTION_SCOPE_DRIFT',
      'Stored execution acknowledgement does not match the expected Run scope.',
    );
  }
  return {
    inbox_id: row.id,
    event_id: event.event_id,
    event_payload_hash: event.payload_hash,
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    revision_sequence: event.branch_revision_sequence,
    run_id: event.payload.run_id,
    run_manifest_hash: event.payload.run_manifest_hash,
    processed_at: row.processedAt.toISOString(),
  };
}

function executionAttemptWireRecord(
  record: ExperimentFoundationExecutionAttemptV2Record,
) {
  return {
    execution_attempt_id: record.id,
    external_pi_implementation_project_id: record.implementation_project_id,
    external_pi_validation_cycle_id: record.validation_cycle_id,
    external_pi_branch_id: record.external_pi_branch_id,
    external_pi_work_order_revision_id: record.external_pi_work_order_revision_id,
    external_pi_work_order_revision_hash: record.external_pi_work_order_revision_hash,
    external_pi_revision_sequence: record.external_pi_revision_sequence,
    run_id: record.run_id,
    run_manifest_hash: record.run_manifest_hash,
    run_cell_id: record.run_cell_id,
    cell_key: record.cell_key,
    training_task_spec_id: record.training_task_spec_id,
    training_task_spec_hash: record.training_task_spec_hash,
    provider_payload_id: record.provider_payload_id,
    provider_payload_hash: record.provider_payload_hash,
    head_acknowledgement_inbox_id: record.head_acknowledgement_inbox_id,
    attempt_sequence: record.attempt_sequence,
    workflow_business_key: record.workflow_business_key,
    workflow_request_hash: record.workflow_request_hash,
    execution_mode: record.execution_mode,
    provenance: record.provenance,
    provider_idempotency_key: record.provider_idempotency_key,
    lifecycle_state: record.lifecycle_state,
    state_version: record.state_version,
    terminal_reason_code: record.terminal_reason_code,
    external_job_ref: wireExternalRef(record),
    external_job_ref_hash: record.external_job_ref_hash,
    created_at: record.created_at,
    updated_at: record.updated_at,
    terminal_at: record.terminal_at,
  };
}

function attemptEventWireRecord(
  record: ExperimentFoundationExecutionAttemptEventV2Record,
) {
  return {
    attempt_event_id: record.id,
    execution_attempt_id: record.execution_attempt_id,
    event_sequence: record.event_sequence,
    event_type: record.event_type,
    prior_state: record.prior_state,
    next_state: record.next_state,
    provider_command_id: record.provider_command_id,
    provider_payload_hash: record.payload_hash,
    external_job_ref: wireExternalRef(record),
    external_job_ref_hash: record.external_job_ref_hash,
    event_snapshot: record.event_snapshot,
    event_hash: record.event_hash,
    occurred_at: record.occurred_at,
  };
}

function providerCommandWireRecord(
  record: ExperimentFoundationProviderCommandV2Record,
) {
  return {
    provider_command_id: record.id,
    execution_attempt_id: record.execution_attempt_id,
    collection_attempt_id: record.collection_attempt_id,
    command_sequence: record.command_sequence,
    operation: record.operation,
    command_snapshot: record.command_snapshot,
    command_hash: record.command_hash,
    response_hash: record.response_hash,
    provider_idempotency_key: record.provider_idempotency_key,
    provider_payload_hash: record.payload_hash,
    external_job_ref: wireExternalRef(record),
    external_job_ref_hash: record.external_job_ref_hash,
    command_state: record.state,
    lease_version: record.lease_version,
    lease_owner: record.lease_owner,
    lease_expires_at: record.lease_expires_at,
    heartbeat_at: record.last_heartbeat_at,
    attempt_count: record.attempt_count,
    next_attempt_at: record.next_attempt_at,
    last_error_code: record.last_error_code,
    created_at: record.created_at,
    updated_at: record.updated_at,
    terminal_at: record.completed_at,
  };
}

function collectionAttemptWireRecord(
  record: ExperimentFoundationCollectionAttemptV2Record,
) {
  return {
    collection_attempt_id: record.id,
    execution_attempt_id: record.execution_attempt_id,
    business_idempotency_key: record.business_idempotency_key,
    collection_request_hash: record.request_hash,
    provider_payload_id: record.provider_payload_id,
    provider_payload_hash: record.provider_payload_hash,
    external_job_ref: wireExternalRef(record),
    external_job_ref_hash: record.external_job_ref_hash,
    collection_state: record.collection_state,
    state_version: record.state_version,
    prepared_at: record.created_at,
    updated_at: record.updated_at,
    collected_at: record.terminal_at,
  };
}

function provisionalOutputWireRecord(
  record: ExperimentFoundationProvisionalOutputV2Record,
) {
  return {
    provisional_output_id: record.id,
    collection_attempt_id: record.collection_attempt_id,
    ordinal: record.ordinal,
    output_kind: record.output_kind,
    output_class: record.output_class,
    manifest: record.redacted_manifest,
    output_hash: record.output_hash,
    created_at: record.created_at,
  };
}

function assertProviderCommandStateShape(
  command: ExperimentFoundationProviderCommandV2Record,
): void {
  const noLease = command.lease_owner === null
    && command.lease_expires_at === null
    && command.last_heartbeat_at === null;
  const valid = command.state === 'pending'
    ? noLease && command.response_hash === null && command.completed_at === null
    : command.state === 'claimed'
      ? command.lease_owner !== null
        && command.lease_expires_at !== null
        && command.last_heartbeat_at !== null
        && command.response_hash === null
        && command.completed_at === null
      : command.state === 'succeeded'
        ? noLease
          && command.response_hash !== null
          && command.last_error_code === null
          && command.completed_at !== null
        : noLease && command.last_error_code !== null && command.completed_at !== null;
  if (!valid) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'ProviderCommand state, lease, response, and terminal fields are not an exact shape.',
    );
  }
}

type ExternalJobRefType = 'fake_aliyun_pai_dlc_job' | 'aliyun_pai_dlc_job';
type ExternalJobRefWire =
  | { ref_type: 'fake_aliyun_pai_dlc_job'; ref_id: string }
  | { ref_type: 'aliyun_pai_dlc_job'; job_id: string; region_id_hash: string };
interface DecodedExternalJobRef {
  id: string;
  type: ExternalJobRefType;
  regionHash: string | null;
  wire: ExternalJobRefWire;
}

function externalRefJson(
  ref: string | null,
  type: ExternalJobRefType,
  regionHash: string | null,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return ref === null
    ? Prisma.DbNull
    : externalRefRequiredJson(ref, type, regionHash);
}

function readExactExternalJobRef(
  value: Prisma.JsonValue | null,
  storedHash: string | null,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  recordKind: string,
): DecodedExternalJobRef | null {
  if (value === null && storedHash === null) return null;
  if (
    value === null
    || storedHash === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    throw constraint(reasonCode, `${recordKind} external job ref shape drifted.`);
  }
  let wire: ExternalJobRefWire;
  let id: string;
  let type: ExternalJobRefType;
  let regionHash: string | null;
  if (
    isDeepStrictEqual(Object.keys(value).sort(), ['ref_id', 'ref_type'])
    && value.ref_type === 'fake_aliyun_pai_dlc_job'
    && typeof value.ref_id === 'string'
    && value.ref_id.trim().length > 0
  ) {
    wire = { ref_type: 'fake_aliyun_pai_dlc_job', ref_id: value.ref_id };
    id = value.ref_id;
    type = 'fake_aliyun_pai_dlc_job';
    regionHash = null;
  } else if (
    isDeepStrictEqual(Object.keys(value).sort(), ['job_id', 'ref_type', 'region_id_hash'])
    && value.ref_type === 'aliyun_pai_dlc_job'
    && typeof value.job_id === 'string'
    && value.job_id.trim().length > 0
    && typeof value.region_id_hash === 'string'
    && /^sha256:[0-9a-f]{64}$/u.test(value.region_id_hash)
  ) {
    wire = {
      ref_type: 'aliyun_pai_dlc_job',
      job_id: value.job_id,
      region_id_hash: value.region_id_hash,
    };
    id = value.job_id;
    type = 'aliyun_pai_dlc_job';
    regionHash = value.region_id_hash;
  } else {
    throw constraint(reasonCode, `${recordKind} external job ref shape drifted.`);
  }
  const expectedHash = serverHashExperimentFoundationExternalJobRefV2(wire);
  if (storedHash !== expectedHash) {
    throw constraint(reasonCode, `${recordKind} external job ref hash drifted.`);
  }
  return { id, type, regionHash, wire };
}

function toJson(value: Readonly<Record<string, unknown>>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function fromJson<T = Readonly<Record<string, unknown>>>(
  value: Prisma.JsonValue,
): T {
  return value as T;
}

function externalRefRequiredJson(
  ref: string,
  type: ExternalJobRefType,
  regionHash: string | null,
): Prisma.InputJsonValue {
  if (type === 'fake_aliyun_pai_dlc_job') {
    if (regionHash !== null) {
      throw constraint('PROVIDER_RESPONSE_INVALID', 'Fake external job ref cannot bind a region hash.');
    }
    return { ref_type: type, ref_id: ref };
  }
  if (!regionHash) {
    throw constraint('PROVIDER_RESPONSE_INVALID', 'Real external job ref requires a region hash.');
  }
  return { ref_type: type, job_id: ref, region_id_hash: regionHash };
}

function wireExternalRef(record: {
  external_job_ref: string | null;
  external_job_ref_type?: ExternalJobRefType | null;
  external_job_ref_region_hash?: string | null;
}): ExternalJobRefWire | null {
  if (record.external_job_ref === null) return null;
  const type = record.external_job_ref_type ?? 'fake_aliyun_pai_dlc_job';
  if (type === 'fake_aliyun_pai_dlc_job') {
    return { ref_type: type, ref_id: record.external_job_ref };
  }
  if (!record.external_job_ref_region_hash) {
    throw constraint('PROVIDER_RESPONSE_INVALID', 'Real external job ref lost its region hash.');
  }
  return {
    ref_type: type,
    job_id: record.external_job_ref,
    region_id_hash: record.external_job_ref_region_hash,
  };
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function decodeStoredExecutionSnapshot(
  validator: ValidateFunction,
  value: Prisma.JsonValue,
  label: string,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0]
    = 'PROVIDER_RESPONSE_INVALID',
): Readonly<Record<string, unknown>> {
  assertStoredExecutionValue(validator, value, label, reasonCode);
  return value as Readonly<Record<string, unknown>>;
}

function assertStoredExecutionValue(
  validator: ValidateFunction,
  value: unknown,
  label: string,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
): void {
  if (validator(value)) return;
  const details = (validator.errors ?? [])
    .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
    .join('; ');
  throw constraint(
    reasonCode,
    `${label} does not match its closed typed schema${details ? `: ${details}` : ''}.`,
  );
}

function decodeStoredEnum<const Values extends readonly string[]>(
  value: string,
  allowed: Values,
  label: string,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
): Values[number] {
  if (!(allowed as readonly string[]).includes(value)) {
    throw constraint(reasonCode, `${label} is outside its runtime allowlist.`);
  }
  return value as Values[number];
}

function assertRecordSchemaVersion(
  snapshotVersion: unknown,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  label: string,
): void {
  if (snapshotVersion !== STORED_SCHEMA_VERSION_V1) {
    throw constraint(reasonCode, `${label} schema version drifted from v1.`);
  }
}

function assertStoredSchemaVersion(
  relationalVersion: string,
  snapshotVersion: unknown,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  label: string,
): void {
  if (
    relationalVersion !== STORED_SCHEMA_VERSION_V1
    || snapshotVersion !== STORED_SCHEMA_VERSION_V1
  ) {
    throw constraint(reasonCode, `${label} schema version drifted from v1.`);
  }
}

function exactRecord<T>(
  existing: T,
  incoming: T,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  message: string,
): T {
  if (!isDeepStrictEqual(existing, incoming)) throw constraint(reasonCode, message);
  return existing;
}

function constraint(
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  message: string,
) {
  return new ExperimentFoundationExecutionV2ConstraintError(reasonCode, message);
}

function mapWriteError(
  error: unknown,
  fallback: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
): unknown {
  if (error instanceof ExperimentFoundationExecutionV2ConstraintError) return error;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2002' || error.code === 'P2003' || error.code === 'P2025')
  ) {
    return constraint(fallback, `Pack B relational constraint rejected the write (${error.code}).`);
  }
  return error;
}
