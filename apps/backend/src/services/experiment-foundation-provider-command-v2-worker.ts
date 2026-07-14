import { randomUUID } from 'node:crypto';

import {
  EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2,
  type ExperimentFoundationProvisionalOutputKindV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import {
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationProviderControlV2Semantic,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  isExecutionAttemptTerminal,
} from '../repositories/experiment-foundation-execution-v2-invariants.js';
import type {
  ExperimentFoundationCollectionAttemptV2Record,
  ExperimentFoundationExecutionAttemptV2Record,
  ExperimentFoundationExecutionV2Prerequisite,
  ExperimentFoundationExecutionV2Repository,
  ExperimentFoundationProviderCommandV2Record,
  ExperimentFoundationProvisionalOutputV2Record,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import {
  ExperimentFoundationExecutionV2ConstraintError,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import {
  DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
  DeterministicFakeProviderFault,
  type ExperimentFoundationV2DiagnosticProvisionalOutput,
  type ExperimentFoundationV2FakeProviderResponse,
  type ExperimentFoundationV2ProviderTransport,
} from './experiment-foundation-v2-deterministic-fake-provider.js';
import {
  ExperimentFoundationV2ProviderPayloadService,
  hashProviderPayloadSemantic,
} from './experiment-foundation-v2-provider-payload-service.js';
import {
  createExecutionAttemptEventV2Record,
  createProviderCommandV2Record,
} from './experiment-foundation-execution-v2-service.js';
import {
  incrementExperimentV2Int32Counter,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

export interface ExperimentFoundationProviderCommandV2WorkerOptions {
  repository: ExperimentFoundationExecutionV2Repository;
  transport: ExperimentFoundationV2ProviderTransport;
  payloadService?: ExperimentFoundationV2ProviderPayloadService;
  leaseOwner?: string;
  leaseMs?: number;
  maximumCommandAttempts?: number;
  now?: () => string;
  idGenerator?: (
    kind: 'event' | 'command' | 'collection' | 'output',
  ) => string;
}

export interface ExperimentFoundationProviderCommandV2WorkerResult {
  claimed_count: number;
  completed_count: number;
  released_count: number;
  terminal_count: number;
}

export class ExperimentFoundationProviderCommandV2Worker {
  private readonly repository: ExperimentFoundationExecutionV2Repository;
  private readonly transport: ExperimentFoundationV2ProviderTransport;
  private readonly payloadService: ExperimentFoundationV2ProviderPayloadService;
  private readonly leaseOwner: string;
  private readonly leaseMs: number;
  private readonly maximumCommandAttempts: number;
  private readonly now: () => string;
  private readonly idGenerator: NonNullable<
    ExperimentFoundationProviderCommandV2WorkerOptions['idGenerator']
  >;

  constructor(options: ExperimentFoundationProviderCommandV2WorkerOptions) {
    this.repository = options.repository;
    this.transport = options.transport;
    this.payloadService = options.payloadService ?? new ExperimentFoundationV2ProviderPayloadService();
    this.leaseOwner = options.leaseOwner ?? `ef-v2-provider-worker-${randomUUID()}`;
    this.leaseMs = Math.max(1_000, options.leaseMs ?? 30_000);
    this.maximumCommandAttempts = Math.max(1, options.maximumCommandAttempts ?? 3);
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator
      ?? ((kind) => `ef_v2_${kind}_${randomUUID()}`);
  }

  async runOnce(limit = 25): Promise<ExperimentFoundationProviderCommandV2WorkerResult> {
    const claimedAt = this.now();
    const claimLimit = Math.max(1, Math.floor(limit));
    const cancellations = await this.repository.claimCommands({
      lease_owner: this.leaseOwner,
      claimed_at: claimedAt,
      lease_expires_at: addMilliseconds(claimedAt, this.leaseMs),
      limit: claimLimit,
      command_kinds: ['cancel'],
    });
    const remaining = Math.max(0, claimLimit - cancellations.length);
    const progressions = remaining === 0
      ? []
      : await this.repository.claimCommands({
        lease_owner: this.leaseOwner,
        claimed_at: claimedAt,
        lease_expires_at: addMilliseconds(claimedAt, this.leaseMs),
        limit: remaining,
        command_kinds: ['submit', 'sync', 'reconcile', 'collect'],
      });
    const commands = [...cancellations, ...progressions];
    const result: ExperimentFoundationProviderCommandV2WorkerResult = {
      claimed_count: commands.length,
      completed_count: 0,
      released_count: 0,
      terminal_count: 0,
    };

    for (const command of commands) {
      const outcome = await this.processClaimedCommand(command);
      result[`${outcome}_count`] += 1;
    }
    return result;
  }

  async drainUntilIdle(options: {
    limit?: number;
    max_passes?: number;
  } = {}): Promise<ExperimentFoundationProviderCommandV2WorkerResult> {
    const aggregate: ExperimentFoundationProviderCommandV2WorkerResult = {
      claimed_count: 0,
      completed_count: 0,
      released_count: 0,
      terminal_count: 0,
    };
    const maximumPasses = Math.max(1, Math.floor(options.max_passes ?? 100));
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const result = await this.runOnce(options.limit ?? 100);
      aggregate.claimed_count += result.claimed_count;
      aggregate.completed_count += result.completed_count;
      aggregate.released_count += result.released_count;
      aggregate.terminal_count += result.terminal_count;
      if (result.claimed_count === 0 || result.released_count > 0) {
        break;
      }
    }
    return aggregate;
  }

  private async processClaimedCommand(
    command: ExperimentFoundationProviderCommandV2Record,
  ): Promise<'completed' | 'released' | 'terminal'> {
    const attempt = await this.repository.findAttempt(command.execution_attempt_id);
    if (!attempt || command.state !== 'claimed' || command.lease_owner !== this.leaseOwner) {
      await this.repository.terminalizeCommand({
        command_id: command.id,
        lease_owner: command.lease_owner === this.leaseOwner ? this.leaseOwner : null,
        expected_lease_version:
          command.lease_owner === this.leaseOwner ? command.lease_version : null,
        terminal_at: this.now(),
        error_code: 'EXECUTION_SCOPE_DRIFT',
      });
      return 'terminal';
    }
    if (!commandCanRunFromAttempt(command, attempt)) {
      await this.repository.terminalizeCommand({
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        terminal_at: this.now(),
        error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
      });
      return 'terminal';
    }

    let exact;
    try {
      exact = await this.resolveExactPayload(attempt);
    } catch (error) {
      const errorCode = error instanceof ExperimentFoundationExecutionV2ConstraintError
        && error.reasonCode === 'EXECUTION_SCOPE_DRIFT'
        ? 'EXECUTION_SCOPE_DRIFT'
        : 'PROVIDER_PAYLOAD_CONFLICT';
      await this.commitTerminalFailure(
        command,
        attempt,
        errorCode,
        error,
      );
      return 'terminal';
    }

    let dispatchCommand: ExperimentFoundationProviderCommandV2Record;
    try {
      await this.assertPersistedCounterCapacity(command, attempt);
    } catch (error) {
      if (error instanceof WorkerCounterConflict) {
        await this.repository.terminalizeCommand({
          command_id: command.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: command.lease_version,
          terminal_at: this.now(),
          error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
        });
        return 'terminal';
      }
      throw error;
    }
    const heartbeatAt = this.now();
    try {
      dispatchCommand = await this.repository.heartbeatCommand({
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        heartbeat_at: heartbeatAt,
        lease_expires_at: addMilliseconds(heartbeatAt, this.leaseMs),
      });
    } catch (error) {
      if (
        error instanceof ExperimentFoundationExecutionV2ConstraintError
        && error.reasonCode === 'PROVIDER_COMMAND_LEASE_CONFLICT'
      ) {
        // The command is recoverable by its current/future lease owner. Never
        // dispatch provider work after this worker loses the durable fence.
        return 'released';
      }
      throw error;
    }

    let rawResponse: unknown;
    try {
      rawResponse = await this.transport[dispatchCommand.operation]({
        canonical_payload_bytes: exact.canonicalPayloadBytes,
        payload_hash: exact.payload.payload_hash,
        // The Attempt owns one stable provider identity across every operation.
        provider_idempotency_key: attempt.provider_idempotency_key,
        external_job_ref: attempt.external_job_ref,
        cancel_reason_code: dispatchCommand.operation === 'cancel'
          ? cancellationReason(dispatchCommand)
          : null,
      });
    } catch (error) {
      if (
        error instanceof DeterministicFakeProviderFault
        && error.retryable
        && dispatchCommand.attempt_count < this.maximumCommandAttempts
      ) {
        const now = this.now();
        await this.repository.releaseCommand({
          command_id: dispatchCommand.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: dispatchCommand.lease_version,
          released_at: now,
          next_attempt_at: addMilliseconds(now, retryDelayMs(dispatchCommand.attempt_count)),
          error_code: error.errorCode,
        });
        return 'released';
      }
      await this.commitTerminalFailure(
        dispatchCommand,
        attempt,
        error instanceof DeterministicFakeProviderFault
          ? error.errorCode
          : 'PROVIDER_RESPONSE_INVALID',
        error,
      );
      return 'terminal';
    }

    let response: ExperimentFoundationV2FakeProviderResponse;
    try {
      response = validateProviderResponse(
        dispatchCommand,
        attempt,
        rawResponse,
        exact.outputKeys,
      );
    } catch (error) {
      await this.commitTerminalFailure(
        dispatchCommand,
        attempt,
        'PROVIDER_RESPONSE_INVALID',
        error,
      );
      return 'terminal';
    }

    try {
      await this.commitSuccessfulResponse(
        dispatchCommand,
        attempt,
        response,
        exact.outputKeys,
      );
      return 'completed';
    } catch (error) {
      if (error instanceof WorkerCounterConflict) {
        await this.repository.terminalizeCommand({
          command_id: dispatchCommand.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: dispatchCommand.lease_version,
          terminal_at: this.now(),
          error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
        });
        return 'terminal';
      }
      const cancelRace = await this.resolveCancelProgressionRace(dispatchCommand, error);
      if (cancelRace === 'retry') {
        const retryAt = this.now();
        await this.repository.releaseCommand({
          command_id: dispatchCommand.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: dispatchCommand.lease_version,
          released_at: retryAt,
          next_attempt_at: retryAt,
          error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
        });
        return 'released';
      }
      if (cancelRace === 'terminal') {
        await this.repository.terminalizeCommand({
          command_id: dispatchCommand.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: dispatchCommand.lease_version,
          terminal_at: this.now(),
          error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
        });
        return 'terminal';
      }
      if (await this.commandMustYieldToCancellation(dispatchCommand, error)) {
        await this.repository.terminalizeCommand({
          command_id: dispatchCommand.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: dispatchCommand.lease_version,
          terminal_at: this.now(),
          error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
        });
        return 'terminal';
      }
      throw error;
    }
  }

  private async resolveCancelProgressionRace(
    command: ExperimentFoundationProviderCommandV2Record,
    error: unknown,
  ): Promise<'retry' | 'terminal' | null> {
    if (
      command.operation !== 'cancel'
      || !(error instanceof ExperimentFoundationExecutionV2ConstraintError)
      || error.reasonCode !== 'EXECUTION_ATTEMPT_STATE_CONFLICT'
    ) {
      return null;
    }
    const current = await this.repository.findAttempt(command.execution_attempt_id);
    if (!current) return 'terminal';
    if (current.lifecycle_state === 'submitted' || current.lifecycle_state === 'running') {
      // Another progression E3 won the Attempt CAS after this cancel read its
      // prior state. Requeue immediately under the same provider key; the fake
      // transport and eventual real adapter contract are idempotent.
      return 'retry';
    }
    return isExecutionAttemptTerminal(current.lifecycle_state) ? 'terminal' : null;
  }

  private async assertPersistedCounterCapacity(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
  ): Promise<void> {
    const [events, commands] = await Promise.all([
      this.repository.listAttemptEvents(attempt.id),
      this.repository.listAttemptCommands(attempt.id),
    ]);
    const nextEventSequence = nextWorkerSequence(
      events.map((event) => event.event_sequence),
      'Execution Attempt event sequence',
    );
    if (command.operation === 'reconcile') {
      incrementWorkerCounter(
        nextEventSequence,
        'Execution Attempt event sequence',
      );
    }
    if (command.operation !== 'collect') {
      incrementWorkerCounter(
        attempt.state_version,
        'Execution Attempt state version',
      );
    }
    if (
      command.operation === 'submit'
      || command.operation === 'sync'
      || command.operation === 'reconcile'
    ) {
      nextWorkerSequence(
        commands.map((candidate) => candidate.command_sequence),
        'Provider command sequence',
      );
    }
    if (command.operation === 'collect') {
      const collection = (await this.repository.listAttemptCollections(attempt.id)).find(
        (candidate) => candidate.id === command.collection_attempt_id,
      );
      if (collection) {
        incrementWorkerCounter(
          collection.state_version,
          'Collection Attempt state version',
        );
      }
    }
  }

  private async commandMustYieldToCancellation(
    command: ExperimentFoundationProviderCommandV2Record,
    error: unknown,
  ): Promise<boolean> {
    if (
      (command.operation !== 'sync' && command.operation !== 'reconcile')
      || !(error instanceof ExperimentFoundationExecutionV2ConstraintError)
      || (error.reasonCode !== 'EXECUTION_ATTEMPT_STATE_CONFLICT'
        && error.reasonCode !== 'COLLECTION_ATTEMPT_CONFLICT')
    ) {
      return false;
    }
    const [attempt, commands] = await Promise.all([
      this.repository.findAttempt(command.execution_attempt_id),
      this.repository.listAttemptCommands(command.execution_attempt_id),
    ]);
    return attempt?.lifecycle_state === 'cancelled'
      || commands.some((candidate) => (
        candidate.operation === 'cancel'
        && (candidate.state === 'pending'
          || candidate.state === 'claimed'
          || candidate.state === 'succeeded')
      ));
  }

  private async resolveExactPayload(attempt: ExperimentFoundationExecutionAttemptV2Record) {
    const prerequisite = await this.repository.resolveRunCellPrerequisite(
      attempt.run_id,
      attempt.run_cell_id,
    );
    if (!prerequisite) {
      throw new ExperimentFoundationExecutionV2ConstraintError(
        'EXECUTION_SCOPE_DRIFT',
        'RunCell prerequisite is missing while resolving a committed provider command.',
      );
    }
    assertAttemptStillExact(attempt, prerequisite);
    const cell = prerequisite.cells[0];
    if (
      prerequisite.cells.length !== 1
      || !cell
      || cell.run_cell.run_cell_id !== attempt.run_cell_id
    ) {
      throw new ExperimentFoundationExecutionV2ConstraintError(
        'EXECUTION_SCOPE_DRIFT',
        'Attempt RunCell is missing from its exact Run prerequisite.',
      );
    }
    const payload = await this.repository.findProviderPayload(attempt.provider_payload_id);
    if (!payload || payload.payload_hash !== attempt.provider_payload_hash) {
      throw new ExperimentFoundationExecutionV2ConstraintError(
        'PROVIDER_PAYLOAD_CONFLICT',
        'Attempt provider payload is missing or no longer matches its immutable hash.',
      );
    }
    const materialized = this.payloadService.rematerializeAndVerify(
      {
        run: prerequisite.run,
        run_cell: cell.run_cell,
        task_spec: cell.task_spec,
        head_acknowledgement: {
          inbox_id: prerequisite.head_acknowledgement.inbox_id,
          source_event_id: prerequisite.head_acknowledgement.event_id,
          run_id: prerequisite.head_acknowledgement.run_id,
          run_manifest_hash: prerequisite.head_acknowledgement.run_manifest_hash,
          payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
          processed_at: prerequisite.head_acknowledgement.processed_at,
        },
      },
      this.payloadService.toPersistenceRecord(payload),
    );
    return {
      prerequisite,
      payload,
      canonicalPayloadBytes: materialized.canonical_payload_bytes,
      outputKeys: [...cell.task_spec.io_snapshot.output_keys],
    };
  }

  private async commitSuccessfulResponse(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    response: ExperimentFoundationV2FakeProviderResponse,
    outputKeys: readonly ExperimentFoundationProvisionalOutputKindV2[],
  ): Promise<void> {
    const now = this.now();
    const [events, commands] = await Promise.all([
      this.repository.listAttemptEvents(attempt.id),
      this.repository.listAttemptCommands(attempt.id),
    ]);
    const eventSequence = nextWorkerSequence(
      events.map((event) => event.event_sequence),
      'Execution Attempt event sequence',
    );
    const commandSequence = nextWorkerSequence(
      commands.map((candidate) => candidate.command_sequence),
      'Provider command sequence',
    );
    const externalJobRef = response.external_job_ref;
    const externalJobRefHash = serverHashExperimentFoundationExternalJobRefV2(externalJobRef);

    if (command.operation === 'collect') {
      await this.commitCollection(
        command,
        attempt,
        response,
        outputKeys,
        now,
        eventSequence,
      );
      return;
    }

    if (command.operation === 'reconcile') {
      const nextAttempt = transitionAttempt(
        attempt,
        'succeeded',
        now,
        externalJobRef,
        externalJobRefHash,
        'simulation_succeeded',
      );
      const succeededEvent = createExecutionAttemptEventV2Record({
        id: this.idGenerator('event'),
        attempt: nextAttempt,
        sequence: eventSequence,
        eventType: 'succeeded',
        priorState: attempt.lifecycle_state,
        nextState: 'succeeded',
        commandId: command.id,
        reasonCode: 'simulation_succeeded',
        observedProviderState: response.provider_status,
        occurredAt: now,
      });
      const collectionId = this.idGenerator('collection');
      const collection: ExperimentFoundationCollectionAttemptV2Record = {
        id: collectionId,
        execution_attempt_id: attempt.id,
        provider_payload_id: attempt.provider_payload_id,
        provider_payload_hash: attempt.provider_payload_hash,
        external_job_ref: externalJobRef,
        external_job_ref_hash: externalJobRefHash,
        business_idempotency_key: `${attempt.id}:collection:1`,
        request_hash: serverHashExperimentFoundationProviderControlV2Semantic(
          'ExperimentFoundationCollectionRequestV2',
          {
            execution_attempt_id: attempt.id,
            external_job_ref: externalJobRef,
            provider_payload_hash: attempt.provider_payload_hash,
          },
        ),
        collection_state: 'prepared',
        state_version: 0,
        created_at: now,
        updated_at: now,
        terminal_at: null,
      };
      const collectionPreparedEvent = createExecutionAttemptEventV2Record({
        id: this.idGenerator('event'),
        attempt: nextAttempt,
        sequence: incrementWorkerCounter(
          eventSequence,
          'Execution Attempt event sequence',
        ),
        eventType: 'collection_prepared',
        priorState: 'succeeded',
        nextState: 'succeeded',
        commandId: null,
        reasonCode: null,
        observedProviderState: response.provider_status,
        occurredAt: now,
      });
      const collectCommand = createProviderCommandV2Record({
        id: this.idGenerator('command'),
        attempt: nextAttempt,
        sequence: commandSequence,
        operation: 'collect',
        providerIdempotencyKey: `${attempt.id}:collect:1`,
        externalJobRef,
        collectionAttemptId: collectionId,
        cancellationReason: null,
        now,
      });
      await this.repository.prepareCollection({
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        response_hash: response.response_hash,
        committed_at: now,
        expected_attempt_state_version: attempt.state_version,
        next_attempt: nextAttempt,
        succeeded_event: succeededEvent,
        collection,
        collection_prepared_event: collectionPreparedEvent,
        collect_command: collectCommand,
      });
      return;
    }

    const nextState = command.operation === 'submit'
      ? 'submitted'
      : command.operation === 'sync'
        ? 'running'
        : 'cancelled';
    const terminalReason = nextState === 'cancelled' ? 'operator_cancelled' : null;
    const nextAttempt = transitionAttempt(
      attempt,
      nextState,
      now,
      externalJobRef,
      externalJobRefHash,
      terminalReason,
    );
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: eventSequence,
      eventType: nextState,
      priorState: attempt.lifecycle_state,
      nextState,
      commandId: command.id,
      reasonCode: terminalReason,
      observedProviderState: response.provider_status,
      occurredAt: now,
    });
    const nextOperation = command.operation === 'submit'
      ? 'sync'
      : command.operation === 'sync'
        ? 'reconcile'
        : null;
    const nextCommand = nextOperation
      ? createProviderCommandV2Record({
        id: this.idGenerator('command'),
        attempt: nextAttempt,
        sequence: commandSequence,
        operation: nextOperation,
        providerIdempotencyKey: `${attempt.id}:${nextOperation}:1`,
        externalJobRef,
        collectionAttemptId: null,
        cancellationReason: null,
        now,
      })
      : undefined;
    await this.repository.commitCommandOutcome({
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      committed_at: now,
      response_hash: response.response_hash,
      expected_attempt_state_version: attempt.state_version,
      next_attempt: nextAttempt,
      event,
      next_command: nextCommand,
    });
  }

  private async commitCollection(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    response: ExperimentFoundationV2FakeProviderResponse,
    outputKeys: readonly ExperimentFoundationProvisionalOutputKindV2[],
    now: string,
    eventSequence: number,
  ): Promise<void> {
    const collections = await this.repository.listAttemptCollections(attempt.id);
    const collection = collections.find(
      (candidate) => candidate.id === command.collection_attempt_id,
    );
    if (!collection || collection.collection_state !== 'prepared') {
      throw new Error('COLLECTION_ATTEMPT_CONFLICT');
    }
    const nextCollection: ExperimentFoundationCollectionAttemptV2Record = {
      ...collection,
      collection_state: 'collected',
      state_version: incrementWorkerCounter(
        collection.state_version,
        'Collection Attempt state version',
      ),
      updated_at: now,
      terminal_at: now,
    };
    const outputs = response.provisional_outputs.map((output, index) =>
      toProvisionalOutput(collection.id, output, outputKeys[index], index, now));
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt,
      sequence: eventSequence,
      eventType: 'collection_collected',
      priorState: 'succeeded',
      nextState: 'succeeded',
      commandId: command.id,
      reasonCode: null,
      observedProviderState: response.provider_status,
      occurredAt: now,
    });
    await this.repository.commitCollectionCompletion({
      collection_id: collection.id,
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      response_hash: response.response_hash,
      committed_at: now,
      expected_collection_state_version: collection.state_version,
      next_collection: nextCollection,
      provisional_outputs: outputs,
      event,
    });
  }

  private async commitTerminalFailure(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    errorCode: string,
    error: unknown,
  ): Promise<void> {
    try {
      await this.commitTerminalFailureRecords(command, attempt, errorCode, error);
    } catch (commitError) {
      if (!(commitError instanceof WorkerCounterConflict)) throw commitError;
      await this.repository.terminalizeCommand({
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        terminal_at: this.now(),
        error_code: 'EXECUTION_ATTEMPT_STATE_CONFLICT',
      });
    }
  }

  private async commitTerminalFailureRecords(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    errorCode: string,
    error: unknown,
  ): Promise<void> {
    const now = this.now();
    const responseHash = serverHashExperimentFoundationProviderControlV2Semantic(
      'ExperimentFoundationProviderTerminalFailureV2',
      {
        command_hash: command.command_hash,
        error_code: errorCode,
        error_name: error instanceof Error ? error.name : 'UnknownError',
      },
    );
    const events = await this.repository.listAttemptEvents(attempt.id);
    if (command.operation === 'collect' && command.collection_attempt_id) {
      const collection = (await this.repository.listAttemptCollections(attempt.id)).find(
        (candidate) => candidate.id === command.collection_attempt_id,
      );
      if (!collection) {
        await this.repository.terminalizeCommand({
          command_id: command.id,
          lease_owner: this.leaseOwner,
          expected_lease_version: command.lease_version,
          terminal_at: now,
          error_code: errorCode,
        });
        return;
      }
      const nextCollection: ExperimentFoundationCollectionAttemptV2Record = {
        ...collection,
        collection_state: 'failed',
        state_version: incrementWorkerCounter(
          collection.state_version,
          'Collection Attempt state version',
        ),
        updated_at: now,
        terminal_at: null,
      };
      const event = createExecutionAttemptEventV2Record({
        id: this.idGenerator('event'),
        attempt,
        sequence: nextWorkerSequence(
          events.map((event) => event.event_sequence),
          'Execution Attempt event sequence',
        ),
        eventType: 'collection_failed',
        priorState: attempt.lifecycle_state,
        nextState: attempt.lifecycle_state,
        commandId: command.id,
        reasonCode: errorCode,
        observedProviderState: null,
        occurredAt: now,
      });
      await this.repository.commitCollectionCompletion({
        collection_id: collection.id,
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        response_hash: responseHash,
        command_terminal_error_code: errorCode,
        committed_at: now,
        expected_collection_state_version: collection.state_version,
        next_collection: nextCollection,
        provisional_outputs: [],
        event,
      });
      return;
    }
    if (isExecutionAttemptTerminal(attempt.lifecycle_state)) {
      await this.repository.terminalizeCommand({
        command_id: command.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: command.lease_version,
        terminal_at: now,
        error_code: errorCode,
      });
      return;
    }
    const terminalReason = errorCode === 'PROVIDER_RESPONSE_INVALID'
      ? 'provider_response_invalid'
      : 'simulation_failed';
    const nextAttempt = transitionAttempt(
      attempt,
      'failed',
      now,
      attempt.external_job_ref,
      attempt.external_job_ref_hash,
      terminalReason,
    );
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: nextWorkerSequence(
        events.map((event) => event.event_sequence),
        'Execution Attempt event sequence',
      ),
      eventType: 'failed',
      priorState: attempt.lifecycle_state,
      nextState: 'failed',
      commandId: command.id,
      reasonCode: errorCode,
      observedProviderState: null,
      occurredAt: now,
    });
    await this.repository.commitCommandOutcome({
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      committed_at: now,
      response_hash: responseHash,
      command_terminal_error_code: errorCode,
      expected_attempt_state_version: attempt.state_version,
      next_attempt: nextAttempt,
      event,
    });
  }
}

function assertAttemptStillExact(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  prerequisite: ExperimentFoundationExecutionV2Prerequisite,
): void {
  const acknowledgement = prerequisite.head_acknowledgement;
  if (
    attempt.run_id !== prerequisite.run.run_id
    || attempt.run_manifest_hash !== prerequisite.run.run_manifest_hash
    || attempt.external_pi_work_order_revision_id
      !== prerequisite.run.external_pi_work_order_revision_id
    || attempt.external_pi_work_order_revision_hash
      !== prerequisite.run.external_pi_work_order_revision_hash
    || attempt.external_pi_revision_sequence
      !== prerequisite.run.external_pi_branch_revision_sequence
    || attempt.implementation_project_id !== prerequisite.implementation_project_id
    || attempt.validation_cycle_id !== prerequisite.validation_cycle_id
    || attempt.external_pi_branch_id !== prerequisite.external_pi_branch_id
    || attempt.head_acknowledgement_inbox_id !== acknowledgement.inbox_id
  ) {
    throw new ExperimentFoundationExecutionV2ConstraintError(
      'EXECUTION_SCOPE_DRIFT',
      'Attempt scope no longer matches its exact Run and head acknowledgement.',
    );
  }
}

function transitionAttempt(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  nextState: ExperimentFoundationExecutionAttemptV2Record['lifecycle_state'],
  now: string,
  externalJobRef: string | null,
  externalJobRefHash: string | null,
  terminalReason: ExperimentFoundationExecutionAttemptV2Record['terminal_reason_code'],
): ExperimentFoundationExecutionAttemptV2Record {
  return {
    ...attempt,
    lifecycle_state: nextState,
    state_version: incrementWorkerCounter(
      attempt.state_version,
      'Execution Attempt state version',
    ),
    external_job_ref: externalJobRef,
    external_job_ref_hash: externalJobRefHash,
    terminal_reason_code: terminalReason,
    updated_at: now,
    terminal_at: isExecutionAttemptTerminal(nextState) ? now : null,
  };
}

function validateProviderResponse(
  command: ExperimentFoundationProviderCommandV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  value: unknown,
  expectedOutputKeys: readonly ExperimentFoundationProvisionalOutputKindV2[],
): ExperimentFoundationV2FakeProviderResponse {
  if (!isPlainObject(value)) {
    throw new Error('Provider response must be an object.');
  }
  const allowedKeys = new Set([
    'schema_version',
    'adapter_identity',
    'execution_mode',
    'provenance',
    'operation',
    'provider_idempotency_key',
    'payload_hash',
    'external_job_ref',
    'provider_status',
    'provisional_outputs',
    'response_hash',
  ]);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new Error('Provider response contains unsupported fields.');
  }
  const expectedStatus = command.operation === 'submit'
    ? 'submitted'
    : command.operation === 'sync'
      ? 'running'
      : command.operation === 'cancel'
        ? 'cancelled'
        : 'succeeded';
  if (
    value.schema_version !== DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION
    || value.adapter_identity !== EXPERIMENT_FOUNDATION_PROVIDER_ADAPTER_IDENTITY_V2
    || value.execution_mode !== 'simulation'
    || value.provenance !== 'non_production_fake_provider'
    || value.operation !== command.operation
    || value.provider_idempotency_key !== attempt.provider_idempotency_key
    || value.payload_hash !== attempt.provider_payload_hash
    || typeof value.external_job_ref !== 'string'
    || value.external_job_ref.length === 0
    || value.provider_status !== expectedStatus
    || !Array.isArray(value.provisional_outputs)
    || typeof value.response_hash !== 'string'
  ) {
    throw new Error('Provider response identity, scope, or state is invalid.');
  }
  const responseExternalJobRef = value.external_job_ref;
  const responseExternalJobRefHash = serverHashExperimentFoundationExternalJobRefV2(
    responseExternalJobRef,
  );
  if (command.operation === 'submit') {
    if (
      attempt.external_job_ref !== null
      || attempt.external_job_ref_hash !== null
      || command.external_job_ref !== null
      || command.external_job_ref_hash !== null
    ) {
      throw new Error('Submit response cannot replace an established provider identity.');
    }
  } else {
    const commandHasDeferredCancelIdentity = command.operation === 'cancel'
      && command.external_job_ref === null
      && command.external_job_ref_hash === null;
    if (
      attempt.external_job_ref === null
      || attempt.external_job_ref_hash === null
      || responseExternalJobRef !== attempt.external_job_ref
      || responseExternalJobRefHash !== attempt.external_job_ref_hash
      || (!commandHasDeferredCancelIdentity && (
        command.external_job_ref !== attempt.external_job_ref
        || command.external_job_ref_hash !== attempt.external_job_ref_hash
      ))
    ) {
      throw new Error('Provider response external job identity is not continuous.');
    }
  }
  if (
    value.provisional_outputs.length
      !== (command.operation === 'collect' ? expectedOutputKeys.length : 0)
    || value.provisional_outputs.some((output, index) => (
      !isDiagnosticOutput(output)
      || output.ordinal !== index + 1
      || output.output_key_hash !== hashProviderPayloadSemantic(
        'FakeAliyunPaiDlcDiagnosticOutputKey',
        'v1',
        expectedOutputKeys[index],
      )
      || output.diagnostic_manifest.payload_hash !== attempt.provider_payload_hash
      || output.diagnostic_manifest.external_job_ref !== value.external_job_ref
      || output.output_hash !== hashProviderPayloadSemantic(
        'FakeAliyunPaiDlcDiagnosticOutput',
        'v1',
        {
          classification: 'diagnostic_only',
          external_job_ref: value.external_job_ref,
          ordinal: output.ordinal,
          output_key_hash: output.output_key_hash,
          payload_hash: attempt.provider_payload_hash,
        },
      )
      || output.output_id !== `fake_diagnostic_output_${output.output_hash.slice(
        'sha256:'.length,
        'sha256:'.length + 32,
      )}`
    ))
  ) {
    throw new Error('Provider diagnostic output shape is invalid.');
  }
  const { response_hash: responseHash, ...withoutHash } = value;
  const expectedHash = hashProviderPayloadSemantic(
    'DeterministicFakeAliyunPaiDlcResponse',
    DETERMINISTIC_FAKE_PROVIDER_RESPONSE_SCHEMA_VERSION,
    withoutHash,
  );
  if (responseHash !== expectedHash) {
    throw new Error('Provider response hash is invalid.');
  }
  const provisionalOutputs = value.provisional_outputs.map((output) => {
    if (!isDiagnosticOutput(output)) {
      throw new Error('Provider diagnostic output shape is invalid.');
    }
    return {
      output_id: output.output_id,
      ordinal: output.ordinal,
      output_key_hash: output.output_key_hash,
      output_hash: output.output_hash,
      diagnostic_manifest: {
        schema_version: output.diagnostic_manifest.schema_version,
        classification: output.diagnostic_manifest.classification,
        payload_hash: output.diagnostic_manifest.payload_hash,
        external_job_ref: output.diagnostic_manifest.external_job_ref,
        byte_size: output.diagnostic_manifest.byte_size,
      },
    };
  });
  return {
    schema_version: value.schema_version,
    adapter_identity: value.adapter_identity,
    execution_mode: value.execution_mode,
    provenance: value.provenance,
    operation: command.operation,
    provider_idempotency_key: value.provider_idempotency_key,
    payload_hash: value.payload_hash,
    external_job_ref: value.external_job_ref,
    provider_status: expectedStatus,
    provisional_outputs: provisionalOutputs,
    response_hash: value.response_hash,
  };
}

function isDiagnosticOutput(value: unknown): value is ExperimentFoundationV2DiagnosticProvisionalOutput {
  if (!isPlainObject(value)) {
    return false;
  }
  const allowed = new Set([
    'output_id',
    'ordinal',
    'output_key_hash',
    'output_hash',
    'diagnostic_manifest',
  ]);
  if (
    Object.keys(value).some((key) => !allowed.has(key))
    || typeof value.output_id !== 'string'
    || !Number.isInteger(value.ordinal)
    || Number(value.ordinal) < 1
    || typeof value.output_key_hash !== 'string'
    || typeof value.output_hash !== 'string'
    || !isPlainObject(value.diagnostic_manifest)
  ) {
    return false;
  }
  const manifest = value.diagnostic_manifest;
  return Object.keys(manifest).every((key) => [
    'schema_version',
    'classification',
    'payload_hash',
    'external_job_ref',
    'byte_size',
  ].includes(key))
    && manifest.schema_version === 'FakeAliyunPaiDlcDiagnosticOutput@v1'
    && manifest.classification === 'diagnostic_only'
    && typeof manifest.payload_hash === 'string'
    && typeof manifest.external_job_ref === 'string'
    && Number.isInteger(manifest.byte_size)
    && Number(manifest.byte_size) >= 0;
}

function toProvisionalOutput(
  collectionId: string,
  output: ExperimentFoundationV2DiagnosticProvisionalOutput,
  outputKind: ExperimentFoundationProvisionalOutputKindV2 | undefined,
  index: number,
  now: string,
): ExperimentFoundationProvisionalOutputV2Record {
  if (!outputKind) {
    throw new Error('Provider returned an unbound diagnostic output.');
  }
  return {
    id: output.output_id,
    collection_attempt_id: collectionId,
    ordinal: index + 1,
    output_kind: outputKind,
    output_manifest_schema_version: 'v1',
    output_class: 'diagnostic_only',
    redacted_manifest: {
      manifest_schema_version: 'v1',
      output_class: 'diagnostic_only',
      output_kind: outputKind,
      media_type: 'application/json',
      redacted_locator: `diagnostic://${output.output_hash}`,
    },
    output_hash: output.output_hash,
    created_at: now,
  };
}

function cancellationReason(command: ExperimentFoundationProviderCommandV2Record): string {
  const reason = command.command_snapshot.cancellation_reason;
  if (command.operation !== 'cancel' || reason !== 'operator_cancelled') {
    throw new ExperimentFoundationExecutionV2ConstraintError(
      'PROVIDER_RESPONSE_INVALID',
      'Provider cancel command lost its exact operator_cancelled reason.',
    );
  }
  return reason;
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(30_000, 1_000 * (2 ** Math.max(0, attemptCount - 1)));
}

function incrementWorkerCounter(current: number, label: string): number {
  return incrementExperimentV2Int32Counter(
    current,
    label,
    (message) => new WorkerCounterConflict(message),
  );
}

function nextWorkerSequence(persisted: readonly number[], label: string): number {
  return nextExperimentV2Int32Sequence(
    persisted,
    label,
    (message) => new WorkerCounterConflict(message),
  );
}

class WorkerCounterConflict extends ExperimentFoundationExecutionV2ConstraintError {
  constructor(message: string) {
    super('EXECUTION_ATTEMPT_STATE_CONFLICT', message);
    this.name = 'WorkerCounterConflict';
  }
}

function commandCanRunFromAttempt(
  command: ExperimentFoundationProviderCommandV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): boolean {
  if (command.operation === 'submit') {
    return attempt.lifecycle_state === 'prepared';
  }
  if (command.operation === 'sync') {
    return attempt.lifecycle_state === 'submitted';
  }
  if (command.operation === 'reconcile' || command.operation === 'cancel') {
    return attempt.lifecycle_state === 'submitted' || attempt.lifecycle_state === 'running';
  }
  return command.operation === 'collect' && attempt.lifecycle_state === 'succeeded';
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype
      || Object.getPrototypeOf(value) === null);
}
