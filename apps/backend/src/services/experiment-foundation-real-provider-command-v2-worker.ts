import { randomUUID } from 'node:crypto';

import type {
  ExperimentFoundationAliyunPaiDlcExecutionProfileV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-cloud-preflight-v2-contracts';
import type {
  ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
  ExperimentFoundationAliyunRealExternalJobRefV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  serverHashExperimentFoundationExternalJobRefV2,
  serverHashExperimentFoundationProviderControlV2Semantic,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  isExecutionAttemptTerminal,
} from '../repositories/experiment-foundation-execution-v2-invariants.js';
import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationCollectionAttemptV2Record,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2Repository,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProvisionalOutputV2Record,
  type ExperimentFoundationRealProviderExecutionV2Prerequisite,
} from '../repositories/experiment-foundation-execution-v2.repository.js';
import {
  ExperimentFoundationAliyunRealProviderTransportErrorV2,
  type ExperimentFoundationAliyunRealProviderTransportInputV2,
  type ExperimentFoundationAliyunRealProviderTransportV2,
} from './experiment-foundation-aliyun-real-provider-v2-transport.js';
import {
  createExecutionAttemptEventV2Record,
  createProviderCommandV2Record,
} from './experiment-foundation-execution-v2-service.js';
import type {
  ExperimentFoundationRealProviderExecutionBundleResolverV2,
} from './experiment-foundation-real-provider-intake-v2-service.js';
import {
  ExperimentFoundationRealProviderPayloadV2Service,
} from './experiment-foundation-real-provider-payload-v2-service.js';
import {
  incrementExperimentV2Int32Counter,
  nextExperimentV2Int32Sequence,
} from './experiment-v2-int32.js';

interface ExperimentFoundationRealProviderCommandV2WorkerOptions {
  repository: ExperimentFoundationExecutionV2Repository;
  transport: ExperimentFoundationAliyunRealProviderTransportV2;
  executionBundleResolver: ExperimentFoundationRealProviderExecutionBundleResolverV2;
  profileResolver: (
    prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
  ) => Promise<ExperimentFoundationAliyunPaiDlcExecutionProfileV2>;
  controlDrainEnabled: () => boolean;
  payloadService?: ExperimentFoundationRealProviderPayloadV2Service;
  leaseOwner?: string;
  leaseMs?: number;
  maximumCommandAttempts?: number;
  watchdogGraceMs?: number;
  now?: () => string;
  idGenerator?: (kind: 'event' | 'command' | 'collection') => string;
}

interface ExperimentFoundationRealProviderCommandV2WorkerResult {
  claimed_count: number;
  completed_count: number;
  released_count: number;
  terminal_count: number;
}

/**
 * M7 real-provider control-plane drain. It owns no provider credentials or
 * client construction; the injected transport is the sole SDK boundary.
 */
export class ExperimentFoundationRealProviderCommandV2Worker {
  private readonly repository: ExperimentFoundationExecutionV2Repository;
  private readonly transport: ExperimentFoundationAliyunRealProviderTransportV2;
  private readonly executionBundleResolver: ExperimentFoundationRealProviderExecutionBundleResolverV2;
  private readonly profileResolver: ExperimentFoundationRealProviderCommandV2WorkerOptions['profileResolver'];
  private readonly controlDrainEnabled: () => boolean;
  private readonly payloadService: ExperimentFoundationRealProviderPayloadV2Service;
  private readonly leaseOwner: string;
  private readonly leaseMs: number;
  private readonly maximumCommandAttempts: number;
  private readonly watchdogGraceMs: number;
  private readonly now: () => string;
  private readonly idGenerator: NonNullable<
    ExperimentFoundationRealProviderCommandV2WorkerOptions['idGenerator']
  >;

  constructor(options: ExperimentFoundationRealProviderCommandV2WorkerOptions) {
    this.repository = options.repository;
    this.transport = options.transport;
    this.executionBundleResolver = options.executionBundleResolver;
    this.profileResolver = options.profileResolver;
    this.controlDrainEnabled = options.controlDrainEnabled;
    this.payloadService = options.payloadService
      ?? new ExperimentFoundationRealProviderPayloadV2Service();
    this.leaseOwner = options.leaseOwner ?? `ef-v2-real-provider-worker-${randomUUID()}`;
    this.leaseMs = Math.max(1_000, options.leaseMs ?? 30_000);
    this.maximumCommandAttempts = Math.max(1, options.maximumCommandAttempts ?? 12);
    this.watchdogGraceMs = Math.max(0, options.watchdogGraceMs ?? 900_000);
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGenerator = options.idGenerator
      ?? ((kind) => `ef_v2_real_${kind}_${randomUUID()}`);
  }

  async runOnce(limit = 25): Promise<ExperimentFoundationRealProviderCommandV2WorkerResult> {
    // Capability-off is deliberately first and therefore performs zero DB
    // reads, leases, provider calls, or writes.
    if (!this.controlDrainEnabled()) return emptyResult();
    const claimedAt = this.now();
    const claimLimit = Math.max(1, Math.floor(limit));
    const cancellations = await this.repository.claimCommands({
      lease_owner: this.leaseOwner,
      claimed_at: claimedAt,
      lease_expires_at: addMilliseconds(claimedAt, this.leaseMs),
      limit: claimLimit,
      command_kinds: ['cancel'],
      execution_modes: ['real_provider'],
    });
    const remaining = Math.max(0, claimLimit - cancellations.length);
    const progressions = remaining === 0 ? [] : await this.repository.claimCommands({
      lease_owner: this.leaseOwner,
      claimed_at: claimedAt,
      lease_expires_at: addMilliseconds(claimedAt, this.leaseMs),
      limit: remaining,
      command_kinds: ['submit', 'sync', 'reconcile', 'collect'],
      execution_modes: ['real_provider'],
    });
    const result = emptyResult();
    const commands = [...cancellations, ...progressions];
    result.claimed_count = commands.length;
    for (const command of commands) {
      const outcome = await this.process(command);
      result[`${outcome}_count`] += 1;
    }
    return result;
  }

  async drainUntilIdle(options: { limit?: number; max_passes?: number } = {}) {
    const aggregate = emptyResult();
    const maximumPasses = Math.max(1, Math.floor(options.max_passes ?? 100));
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const result = await this.runOnce(options.limit ?? 100);
      aggregate.claimed_count += result.claimed_count;
      aggregate.completed_count += result.completed_count;
      aggregate.released_count += result.released_count;
      aggregate.terminal_count += result.terminal_count;
      if (result.claimed_count === 0 || result.released_count > 0) break;
    }
    return aggregate;
  }

  private async process(
    claimed: ExperimentFoundationProviderCommandV2Record,
  ): Promise<'completed' | 'released' | 'terminal'> {
    const attempt = await this.repository.findAttempt(claimed.execution_attempt_id);
    if (
      !attempt
      || attempt.execution_mode !== 'real_provider'
      || attempt.provenance !== 'real_provider'
      || claimed.state !== 'claimed'
      || claimed.lease_owner !== this.leaseOwner
      || !commandCanRun(claimed, attempt)
    ) {
      await this.terminalize(claimed, 'EXECUTION_ATTEMPT_STATE_CONFLICT');
      return 'terminal';
    }

    let command: ExperimentFoundationProviderCommandV2Record;
    try {
      const heartbeatAt = this.now();
      command = await this.repository.heartbeatCommand({
        command_id: claimed.id,
        lease_owner: this.leaseOwner,
        expected_lease_version: claimed.lease_version,
        heartbeat_at: heartbeatAt,
        lease_expires_at: addMilliseconds(heartbeatAt, this.leaseMs),
      });
    } catch (error) {
      if (isLeaseConflict(error)) return 'released';
      throw error;
    }

    let exact: Awaited<ReturnType<ExperimentFoundationRealProviderCommandV2Worker['resolveExact']>>;
    try {
      exact = await this.resolveExact(attempt);
    } catch (error) {
      await this.commitFailure(command, attempt, 'REAL_PROVIDER_PAYLOAD_CONFLICT', error);
      return 'terminal';
    }

    const transportInput: ExperimentFoundationAliyunRealProviderTransportInputV2 = {
      materialized: exact.materialized,
      task_spec: exact.cell.task_spec,
      provider_idempotency_key: attempt.provider_idempotency_key,
      create_permitted: command.operation === 'submit' && command.attempt_count === 1,
      external_job_ref: externalRef(attempt),
    };

    let outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1;
    try {
      outcome = await this.transport[command.operation](transportInput);
    } catch (error) {
      if (
        error instanceof ExperimentFoundationAliyunRealProviderTransportErrorV2
        && error.retryable
        && (
          command.attempt_count < this.maximumCommandAttempts
          || this.withinWatchdogDeadline(command, attempt, exact.cell.task_spec)
        )
      ) {
        await this.release(command, error.reasonCode);
        return 'released';
      }
      const terminalReason = error instanceof ExperimentFoundationAliyunRealProviderTransportErrorV2
        && (error.reasonCode === 'REAL_PROVIDER_CLEANUP_UNVERIFIED'
          || error.reasonCode === 'REAL_PROVIDER_RECOVERY_NOT_FOUND')
        ? 'real_provider_cleanup_unverified'
        : 'provider_response_invalid';
      await this.commitFailure(
        command,
        attempt,
        error instanceof ExperimentFoundationAliyunRealProviderTransportErrorV2
          ? error.reasonCode
          : 'REAL_PROVIDER_RESPONSE_INVALID',
        error,
        terminalReason,
      );
      return 'terminal';
    }

    try {
      if (command.operation === 'collect') {
        await this.commitCollection(command, attempt, outcome);
        return 'completed';
      }
      if (command.operation === 'cancel') {
        if (outcome.normalized_state === 'cancelled') {
          await this.commitTransition(command, attempt, outcome, 'cancelled', null);
          return 'completed';
        }
        if (outcome.normalized_state === 'failed') {
          await this.commitFailure(command, attempt, 'REAL_PROVIDER_JOB_FAILED', null);
        } else {
          await this.terminalize(command, 'EXECUTION_ATTEMPT_STATE_CONFLICT');
        }
        return 'terminal';
      }
      if (outcome.normalized_state === 'failed' || outcome.normalized_state === 'cancelled') {
        await this.commitFailure(command, attempt, 'REAL_PROVIDER_JOB_FAILED', null);
        return 'terminal';
      }
      if (command.operation === 'reconcile') {
        if (outcome.normalized_state === 'succeeded') {
          await this.prepareCollection(command, attempt, outcome);
          return 'completed';
        }
        // The local watchdog is wall-clock against the frozen TaskSpec
        // timeout, never a poll-attempt count: a healthy nonterminal job keeps
        // polling until the deadline expires, then cancel-on-timeout runs.
        if (this.withinWatchdogDeadline(command, attempt, exact.cell.task_spec)) {
          await this.release(command, 'REAL_PROVIDER_NOT_TERMINAL');
          return 'released';
        }
        await this.cleanupAfterTimeout(command, attempt, transportInput);
        return 'terminal';
      }
      // Submit always establishes the durable provider identity first. A sync
      // observation is represented as running. Both paths converge through a
      // reconcile command, which alone may freeze successful collection.
      const nextState = command.operation === 'submit' ? 'submitted' : 'running';
      await this.commitTransition(command, attempt, outcome, nextState, 'reconcile');
      return 'completed';
    } catch (error) {
      if (isLeaseConflict(error)) return 'released';
      if (error instanceof ExperimentFoundationExecutionV2ConstraintError) {
        await this.terminalize(command, error.reasonCode);
        return 'terminal';
      }
      throw error;
    }
  }

  private withinWatchdogDeadline(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    taskSpec: ExperimentFoundationRealProviderExecutionV2Prerequisite['cells'][number]['task_spec'],
  ): boolean {
    if (command.operation !== 'sync' && command.operation !== 'reconcile') return false;
    const deadline = Date.parse(attempt.created_at)
      + (taskSpec.retry_snapshot.timeout_seconds * 1_000)
      + this.watchdogGraceMs;
    return Date.parse(this.now()) < deadline;
  }

  private async resolveExact(attempt: ExperimentFoundationExecutionAttemptV2Record) {
    const prerequisite = await this.repository.resolveRealProviderRunCellPrerequisite(
      attempt.run_id,
      attempt.run_cell_id,
    );
    if (!prerequisite || prerequisite.cells.length !== 1 || !prerequisite.cells[0]) {
      throw scopeDrift('Exact real-provider RunCell prerequisite is missing.');
    }
    assertAttemptStillExact(attempt, prerequisite);
    const cell = prerequisite.cells[0];
    const persisted = await this.repository.findProviderPayload(attempt.provider_payload_id);
    if (!persisted || persisted.payload_hash !== attempt.provider_payload_hash) {
      throw scopeDrift('Committed real-provider payload is missing or drifted.');
    }
    const bundleRef = cell.task_spec.execution_bundle;
    const [bundle, profile] = await Promise.all([
      this.executionBundleResolver.resolveActiveReadyExact({
        execution_bundle_revision_id: bundleRef.execution_bundle_revision_id,
        content_hash: bundleRef.content_hash,
      }),
      this.profileResolver(prerequisite),
    ]);
    const materialized = this.payloadService.rematerializeAndVerify({
      run: prerequisite.run,
      run_cell: cell.run_cell,
      task_spec: cell.task_spec,
      execution_bundle_revision: bundle.revision,
      provider_idempotency_key: attempt.provider_idempotency_key,
    }, profile, persisted);
    return { prerequisite, cell, materialized };
  }

  private async commitTransition(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
    nextState: 'submitted' | 'running' | 'cancelled',
    nextOperation: 'reconcile' | null,
  ): Promise<void> {
    const now = this.now();
    const [events, commands] = await Promise.all([
      this.repository.listAttemptEvents(attempt.id),
      this.repository.listAttemptCommands(attempt.id),
    ]);
    const nextAttempt = transitionAttempt(
      attempt,
      nextState,
      now,
      requireExternalRef(outcome),
      nextState === 'cancelled' ? 'operator_cancelled' : null,
    );
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: nextSequence(events.map((item) => item.event_sequence), 'event'),
      eventType: nextState,
      priorState: attempt.lifecycle_state,
      nextState,
      commandId: command.id,
      reasonCode: nextState === 'cancelled' ? 'operator_cancelled' : null,
      observedProviderState: outcome.provider_status,
      occurredAt: now,
    });
    const nextCommand = nextOperation ? createProviderCommandV2Record({
      id: this.idGenerator('command'),
      attempt: nextAttempt,
      sequence: nextSequence(commands.map((item) => item.command_sequence), 'command'),
      operation: nextOperation,
      providerIdempotencyKey: `${attempt.id}:${nextOperation}:1`,
      externalJobRef: nextAttempt.external_job_ref,
      collectionAttemptId: null,
      cancellationReason: null,
      now,
    }) : undefined;
    await this.repository.commitCommandOutcome({
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      committed_at: now,
      response_hash: outcome.response_hash,
      expected_attempt_state_version: attempt.state_version,
      next_attempt: nextAttempt,
      event,
      next_command: nextCommand,
    });
  }

  private async prepareCollection(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
  ): Promise<void> {
    const now = this.now();
    const external = requireExternalRef(outcome);
    const externalHash = serverHashExperimentFoundationExternalJobRefV2(external);
    const [events, commands] = await Promise.all([
      this.repository.listAttemptEvents(attempt.id),
      this.repository.listAttemptCommands(attempt.id),
    ]);
    const eventSequence = nextSequence(events.map((item) => item.event_sequence), 'event');
    const nextAttempt = transitionAttempt(
      attempt,
      'succeeded',
      now,
      external,
      'real_provider_succeeded',
    );
    const succeededEvent = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: eventSequence,
      eventType: 'succeeded',
      priorState: attempt.lifecycle_state,
      nextState: 'succeeded',
      commandId: command.id,
      reasonCode: 'real_provider_succeeded',
      observedProviderState: outcome.provider_status,
      occurredAt: now,
    });
    const collectionId = this.idGenerator('collection');
    const collection: ExperimentFoundationCollectionAttemptV2Record = {
      id: collectionId,
      execution_attempt_id: attempt.id,
      provider_payload_id: attempt.provider_payload_id,
      provider_payload_hash: attempt.provider_payload_hash,
      external_job_ref: external.job_id,
      external_job_ref_hash: externalHash,
      external_job_ref_type: external.ref_type,
      external_job_ref_region_hash: external.region_id_hash,
      business_idempotency_key: `${attempt.id}:collection:1`,
      request_hash: serverHashExperimentFoundationProviderControlV2Semantic(
        'ExperimentFoundationRealProviderCollectionRequestV2',
        {
          execution_attempt_id: attempt.id,
          external_job_ref: external,
          provider_payload_hash: attempt.provider_payload_hash,
        },
      ),
      collection_state: 'prepared',
      state_version: 0,
      created_at: now,
      updated_at: now,
      terminal_at: null,
    };
    const preparedEvent = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: increment(eventSequence, 'event'),
      eventType: 'collection_prepared',
      priorState: 'succeeded',
      nextState: 'succeeded',
      commandId: null,
      reasonCode: null,
      observedProviderState: outcome.provider_status,
      occurredAt: now,
    });
    const collectCommand = createProviderCommandV2Record({
      id: this.idGenerator('command'),
      attempt: nextAttempt,
      sequence: nextSequence(commands.map((item) => item.command_sequence), 'command'),
      operation: 'collect',
      providerIdempotencyKey: `${attempt.id}:collect:1`,
      externalJobRef: external.job_id,
      collectionAttemptId: collectionId,
      cancellationReason: null,
      now,
    });
    await this.repository.prepareCollection({
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      response_hash: outcome.response_hash,
      committed_at: now,
      expected_attempt_state_version: attempt.state_version,
      next_attempt: nextAttempt,
      succeeded_event: succeededEvent,
      collection,
      collection_prepared_event: preparedEvent,
      collect_command: collectCommand,
    });
  }

  private async commitCollection(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
  ): Promise<void> {
    if (outcome.normalized_state !== 'succeeded' || !outcome.result_manifest_hash) {
      throw new Error('Real-provider collection returned no exact result manifest.');
    }
    const collection = (await this.repository.listAttemptCollections(attempt.id)).find(
      (item) => item.id === command.collection_attempt_id,
    );
    if (!collection || collection.collection_state !== 'prepared') {
      throw new Error('Real-provider CollectionAttempt is absent or not prepared.');
    }
    const now = this.now();
    const outputHash = outcome.result_manifest_hash;
    const output: ExperimentFoundationProvisionalOutputV2Record = {
      id: `real_provider_output_${outputHash.slice('sha256:'.length, 'sha256:'.length + 32)}`,
      collection_attempt_id: collection.id,
      ordinal: 1,
      output_kind: 'real_provider_result_envelope',
      output_manifest_schema_version: 'v1',
      output_class: 'diagnostic_only',
      redacted_manifest: {
        manifest_schema_version: 'v1',
        output_class: 'diagnostic_only',
        output_kind: 'real_provider_result_envelope',
        media_type: 'application/json',
        redacted_locator: `result-manifest://${outputHash}`,
      },
      output_hash: outputHash,
      created_at: now,
    };
    const nextCollection: ExperimentFoundationCollectionAttemptV2Record = {
      ...collection,
      collection_state: 'collected',
      state_version: increment(collection.state_version, 'collection'),
      updated_at: now,
      terminal_at: now,
    };
    const events = await this.repository.listAttemptEvents(attempt.id);
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt,
      sequence: nextSequence(events.map((item) => item.event_sequence), 'event'),
      eventType: 'collection_collected',
      priorState: 'succeeded',
      nextState: 'succeeded',
      commandId: command.id,
      reasonCode: null,
      observedProviderState: outcome.provider_status,
      occurredAt: now,
    });
    await this.repository.commitCollectionCompletion({
      collection_id: collection.id,
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      response_hash: outcome.response_hash,
      committed_at: now,
      expected_collection_state_version: collection.state_version,
      next_collection: nextCollection,
      provisional_outputs: [output],
      event,
    });
  }

  private async cleanupAfterTimeout(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    input: ExperimentFoundationAliyunRealProviderTransportInputV2,
  ): Promise<void> {
    if (!input.external_job_ref) {
      await this.commitFailure(
        command,
        attempt,
        'REAL_PROVIDER_CLEANUP_UNVERIFIED',
        null,
        'real_provider_cleanup_unverified',
      );
      return;
    }
    try {
      const cleanup = await this.transport.cancel(input);
      if (cleanup.normalized_state !== 'cancelled') throw new Error('Cleanup did not stop the job.');
      await this.commitFailure(
        command,
        attempt,
        'REAL_PROVIDER_TIMEOUT',
        null,
        'real_provider_timeout',
        cleanup.response_hash,
      );
    } catch (error) {
      await this.commitFailure(
        command,
        attempt,
        'REAL_PROVIDER_CLEANUP_UNVERIFIED',
        error,
        'real_provider_cleanup_unverified',
      );
    }
  }

  private async commitFailure(
    command: ExperimentFoundationProviderCommandV2Record,
    attempt: ExperimentFoundationExecutionAttemptV2Record,
    errorCode: string,
    error: unknown,
    terminalReason: ExperimentFoundationExecutionAttemptV2Record['terminal_reason_code'] =
      'real_provider_failed',
    responseHash?: string,
  ): Promise<void> {
    const now = this.now();
    const resolvedResponseHash = responseHash
      ?? serverHashExperimentFoundationProviderControlV2Semantic(
        'ExperimentFoundationRealProviderTerminalFailureV2',
        {
          command_hash: command.command_hash,
          error_code: errorCode,
          error_name: error instanceof Error ? error.name : 'UnknownError',
        },
      );
    if (command.operation === 'collect' && command.collection_attempt_id) {
      const collection = (await this.repository.listAttemptCollections(attempt.id)).find(
        (item) => item.id === command.collection_attempt_id,
      );
      if (!collection) {
        await this.terminalize(command, errorCode);
        return;
      }
      const events = await this.repository.listAttemptEvents(attempt.id);
      const nextCollection: ExperimentFoundationCollectionAttemptV2Record = {
        ...collection,
        collection_state: 'failed',
        state_version: increment(collection.state_version, 'collection'),
        updated_at: now,
        terminal_at: now,
      };
      const event = createExecutionAttemptEventV2Record({
        id: this.idGenerator('event'),
        attempt,
        sequence: nextSequence(events.map((item) => item.event_sequence), 'event'),
        eventType: 'collection_failed',
        priorState: 'succeeded',
        nextState: 'succeeded',
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
        response_hash: resolvedResponseHash,
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
      await this.terminalize(command, errorCode);
      return;
    }
    const nextAttempt = transitionAttempt(
      attempt,
      'failed',
      now,
      externalRef(attempt),
      terminalReason,
    );
    const events = await this.repository.listAttemptEvents(attempt.id);
    const event = createExecutionAttemptEventV2Record({
      id: this.idGenerator('event'),
      attempt: nextAttempt,
      sequence: nextSequence(events.map((item) => item.event_sequence), 'event'),
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
      response_hash: resolvedResponseHash,
      command_terminal_error_code: errorCode,
      expected_attempt_state_version: attempt.state_version,
      next_attempt: nextAttempt,
      event,
    });
  }

  private async release(command: ExperimentFoundationProviderCommandV2Record, errorCode: string) {
    const now = this.now();
    await this.repository.releaseCommand({
      command_id: command.id,
      lease_owner: this.leaseOwner,
      expected_lease_version: command.lease_version,
      released_at: now,
      next_attempt_at: addMilliseconds(now, retryDelayMs(command.attempt_count)),
      error_code: errorCode,
    });
  }

  private async terminalize(command: ExperimentFoundationProviderCommandV2Record, errorCode: string) {
    await this.repository.terminalizeCommand({
      command_id: command.id,
      lease_owner: command.lease_owner === this.leaseOwner ? this.leaseOwner : null,
      expected_lease_version: command.lease_owner === this.leaseOwner
        ? command.lease_version
        : null,
      terminal_at: this.now(),
      error_code: errorCode,
    });
  }
}

function assertAttemptStillExact(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
): void {
  const cell = prerequisite.cells[0];
  if (
    !cell
    || attempt.run_id !== prerequisite.run.run_id
    || attempt.run_manifest_hash !== prerequisite.run.run_manifest_hash
    || attempt.run_cell_id !== cell.run_cell.run_cell_id
    || attempt.cell_key !== cell.run_cell.cell_key
    || attempt.training_task_spec_id !== cell.task_spec.training_task_spec_id
    || attempt.training_task_spec_hash !== cell.task_spec.task_spec_hash
    || attempt.external_pi_work_order_revision_id
      !== prerequisite.run.external_pi_work_order_revision_id
    || attempt.external_pi_work_order_revision_hash
      !== prerequisite.run.external_pi_work_order_revision_hash
    || attempt.external_pi_revision_sequence
      !== prerequisite.run.external_pi_branch_revision_sequence
    || attempt.implementation_project_id !== prerequisite.implementation_project_id
    || attempt.validation_cycle_id !== prerequisite.validation_cycle_id
    || attempt.external_pi_branch_id !== prerequisite.external_pi_branch_id
    || attempt.head_acknowledgement_inbox_id !== prerequisite.head_acknowledgement.inbox_id
  ) {
    throw scopeDrift('Real-provider Attempt no longer matches its exact RunCell lineage.');
  }
}

function transitionAttempt(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  nextState: ExperimentFoundationExecutionAttemptV2Record['lifecycle_state'],
  now: string,
  ref: ExperimentFoundationAliyunRealExternalJobRefV1 | null,
  terminalReason: ExperimentFoundationExecutionAttemptV2Record['terminal_reason_code'],
): ExperimentFoundationExecutionAttemptV2Record {
  return {
    ...attempt,
    lifecycle_state: nextState,
    state_version: increment(attempt.state_version, 'attempt'),
    external_job_ref: ref?.job_id ?? null,
    external_job_ref_hash: ref ? serverHashExperimentFoundationExternalJobRefV2(ref) : null,
    external_job_ref_type: ref?.ref_type ?? null,
    external_job_ref_region_hash: ref?.region_id_hash ?? null,
    terminal_reason_code: terminalReason,
    updated_at: now,
    terminal_at: isExecutionAttemptTerminal(nextState) ? now : null,
  };
}

function externalRef(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): ExperimentFoundationAliyunRealExternalJobRefV1 | null {
  if (
    attempt.external_job_ref === null
    && attempt.external_job_ref_hash === null
    && (attempt.external_job_ref_type === null || attempt.external_job_ref_type === undefined)
    && (attempt.external_job_ref_region_hash === null
      || attempt.external_job_ref_region_hash === undefined)
  ) return null;
  if (
    !attempt.external_job_ref
    || attempt.external_job_ref_type !== 'aliyun_pai_dlc_job'
    || !attempt.external_job_ref_region_hash
  ) throw scopeDrift('Real-provider external job reference is partial or has the wrong type.');
  const ref: ExperimentFoundationAliyunRealExternalJobRefV1 = {
    ref_type: 'aliyun_pai_dlc_job',
    job_id: attempt.external_job_ref,
    region_id_hash: attempt.external_job_ref_region_hash,
  };
  if (serverHashExperimentFoundationExternalJobRefV2(ref) !== attempt.external_job_ref_hash) {
    throw scopeDrift('Real-provider external job reference hash drifted.');
  }
  return ref;
}

function requireExternalRef(
  outcome: ExperimentFoundationAliyunNormalizedProviderOutcomeV1,
): ExperimentFoundationAliyunRealExternalJobRefV1 {
  if (!outcome.external_job_ref) throw new Error('Provider outcome has no external job reference.');
  return outcome.external_job_ref;
}

function commandCanRun(
  command: ExperimentFoundationProviderCommandV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): boolean {
  if (command.operation === 'submit') return attempt.lifecycle_state === 'prepared';
  if (command.operation === 'sync') return attempt.lifecycle_state === 'submitted';
  if (command.operation === 'reconcile' || command.operation === 'cancel') {
    return attempt.lifecycle_state === 'submitted' || attempt.lifecycle_state === 'running';
  }
  return command.operation === 'collect' && attempt.lifecycle_state === 'succeeded';
}

function emptyResult(): ExperimentFoundationRealProviderCommandV2WorkerResult {
  return { claimed_count: 0, completed_count: 0, released_count: 0, terminal_count: 0 };
}

function retryDelayMs(attemptCount: number): number {
  return Math.min(30_000, 1_000 * (2 ** Math.max(0, attemptCount - 1)));
}

function addMilliseconds(timestamp: string, milliseconds: number): string {
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

function increment(current: number, label: string): number {
  return incrementExperimentV2Int32Counter(
    current,
    `Real-provider ${label} counter`,
    (message) => new ExperimentFoundationExecutionV2ConstraintError(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      message,
    ),
  );
}

function nextSequence(values: readonly number[], label: string): number {
  return nextExperimentV2Int32Sequence(
    values,
    `Real-provider ${label} sequence`,
    (message) => new ExperimentFoundationExecutionV2ConstraintError(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      message,
    ),
  );
}

function scopeDrift(message: string): ExperimentFoundationExecutionV2ConstraintError {
  return new ExperimentFoundationExecutionV2ConstraintError('EXECUTION_SCOPE_DRIFT', message);
}

function isLeaseConflict(error: unknown): boolean {
  return error instanceof ExperimentFoundationExecutionV2ConstraintError
    && error.reasonCode === 'PROVIDER_COMMAND_LEASE_CONFLICT';
}
