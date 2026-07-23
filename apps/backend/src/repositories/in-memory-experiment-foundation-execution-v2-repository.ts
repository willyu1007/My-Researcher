import { isDeepStrictEqual } from 'node:util';

import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import {
  assertAttemptTerminalStateReasonPair,
  assertCollectionCompletionShape,
  assertCollectionPreparationShape,
  assertCommandOutcomeTransition,
  assertValidAttemptUpdate,
  indexWorkflowStartRecords,
  isExecutionAttemptTerminal,
  sameControlCommandIntent,
} from './experiment-foundation-execution-v2-invariants.js';
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
  type ExperimentFoundationExecutionV2ReleaseCommandInput,
  type ExperimentFoundationExecutionV2Repository,
  type ExperimentFoundationExecutionV2StartInput,
  type ExperimentFoundationExecutionV2StartOutcome,
  type ExperimentFoundationExecutionV2TerminalizeCommandInput,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
  type ExperimentFoundationProvisionalOutputV2Record,
} from './experiment-foundation-execution-v2.repository.js';

type FaultOperation =
  | 'startWorkflowSimulation'
  | 'commitCommandOutcome'
  | 'enqueueControlCommand'
  | 'prepareCollection'
  | 'commitCollectionCompletion';

interface StartReceipt {
  run_id: string;
  business_idempotency_key: string;
  request_hash: string;
  payload_ids: string[];
  attempt_ids: string[];
  event_ids: string[];
  command_ids: string[];
}

interface State {
  payloads: Map<string, ExperimentFoundationProviderPayloadV2Record>;
  payloadByMaterializationKey: Map<string, string>;
  attempts: Map<string, ExperimentFoundationExecutionAttemptV2Record>;
  attemptByWorkflowKey: Map<string, string>;
  attemptByCellSequence: Map<string, string>;
  events: Map<string, ExperimentFoundationExecutionAttemptEventV2Record>;
  eventByAttemptSequence: Map<string, string>;
  commands: Map<string, ExperimentFoundationProviderCommandV2Record>;
  commandByAttemptSequence: Map<string, string>;
  commandByProviderIdempotencyKey: Map<string, string>;
  collections: Map<string, ExperimentFoundationCollectionAttemptV2Record>;
  collectionByAttempt: Map<string, string>;
  outputs: Map<string, ExperimentFoundationProvisionalOutputV2Record>;
  outputByCollectionOrdinal: Map<string, string>;
  startReceipts: Map<string, StartReceipt>;
}

export interface InMemoryExperimentFoundationExecutionV2RepositoryOptions {
  prerequisites?: ExperimentFoundationExecutionV2Prerequisite[];
  realProviderPrerequisites?: ExperimentFoundationRealProviderExecutionV2Prerequisite[];
  activeRealAttemptRefs?: readonly ExperimentFoundationCycleActiveRealAttemptRefV2[];
  prerequisiteResolver?: (
    runId: string,
  ) => Promise<ExperimentFoundationExecutionV2Prerequisite | null>;
  realProviderPrerequisiteResolver?: (
    runId: string,
  ) => Promise<ExperimentFoundationRealProviderExecutionV2Prerequisite | null>;
}

function emptyState(): State {
  return {
    payloads: new Map(),
    payloadByMaterializationKey: new Map(),
    attempts: new Map(),
    attemptByWorkflowKey: new Map(),
    attemptByCellSequence: new Map(),
    events: new Map(),
    eventByAttemptSequence: new Map(),
    commands: new Map(),
    commandByAttemptSequence: new Map(),
    commandByProviderIdempotencyKey: new Map(),
    collections: new Map(),
    collectionByAttempt: new Map(),
    outputs: new Map(),
    outputByCollectionOrdinal: new Map(),
    startReceipts: new Map(),
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source.entries()].map(([key, value]) => [key, clone(value)]));
}

function cloneState(source: State): State {
  return {
    payloads: cloneMap(source.payloads),
    payloadByMaterializationKey: new Map(source.payloadByMaterializationKey),
    attempts: cloneMap(source.attempts),
    attemptByWorkflowKey: new Map(source.attemptByWorkflowKey),
    attemptByCellSequence: new Map(source.attemptByCellSequence),
    events: cloneMap(source.events),
    eventByAttemptSequence: new Map(source.eventByAttemptSequence),
    commands: cloneMap(source.commands),
    commandByAttemptSequence: new Map(source.commandByAttemptSequence),
    commandByProviderIdempotencyKey: new Map(source.commandByProviderIdempotencyKey),
    collections: cloneMap(source.collections),
    collectionByAttempt: new Map(source.collectionByAttempt),
    outputs: cloneMap(source.outputs),
    outputByCollectionOrdinal: new Map(source.outputByCollectionOrdinal),
    startReceipts: cloneMap(source.startReceipts),
  };
}

function startReceiptKey(runId: string, businessKey: string): string {
  return `${runId}\u0000${businessKey}`;
}

function attemptWorkflowKey(runCellId: string, businessKey: string): string {
  return `${runCellId}\u0000${businessKey}`;
}

function attemptCellSequenceKey(runCellId: string, sequence: number): string {
  return `${runCellId}\u0000${sequence}`;
}

function attemptSequenceKey(attemptId: string, sequence: number): string {
  return `${attemptId}\u0000${sequence}`;
}

function collectionOrdinalKey(collectionId: string, ordinal: number): string {
  return `${collectionId}\u0000${ordinal}`;
}

function compareIso(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareActiveRealAttemptRefs(
  left: ExperimentFoundationCycleActiveRealAttemptRefV2,
  right: ExperimentFoundationCycleActiveRealAttemptRefV2,
): number {
  return left.external_pi_branch_id.localeCompare(right.external_pi_branch_id)
    || left.external_pi_revision_sequence - right.external_pi_revision_sequence
    || left.run_id.localeCompare(right.run_id)
    || left.run_cell_id.localeCompare(right.run_cell_id)
    || left.attempt_sequence - right.attempt_sequence
    || left.execution_attempt_id.localeCompare(right.execution_attempt_id);
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

function exactOrConflict<T>(
  existing: T,
  incoming: T,
  reasonCode:
    | 'PROVIDER_PAYLOAD_CONFLICT'
    | 'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT'
    | 'EXECUTION_ATTEMPT_STATE_CONFLICT'
    | 'COLLECTION_ATTEMPT_CONFLICT',
  message: string,
): T {
  if (!isDeepStrictEqual(existing, incoming)) {
    throw constraint(reasonCode, message);
  }
  return existing;
}

function constraint(
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  message: string,
): ExperimentFoundationExecutionV2ConstraintError {
  return new ExperimentFoundationExecutionV2ConstraintError(reasonCode, message);
}

export class InMemoryExperimentFoundationExecutionV2Repository
implements ExperimentFoundationExecutionV2Repository {
  private state = emptyState();
  private readonly prerequisites = new Map<string, ExperimentFoundationExecutionV2Prerequisite>();
  private readonly prerequisiteCells = new Map<
    string,
    Map<string, ExperimentFoundationExecutionV2Prerequisite['cells'][number]>
  >();
  private readonly realProviderPrerequisites = new Map<
    string,
    ExperimentFoundationRealProviderExecutionV2Prerequisite
  >();
  private readonly realProviderPrerequisiteCells = new Map<
    string,
    Map<string, ExperimentFoundationRealProviderExecutionV2Prerequisite['cells'][number]>
  >();
  private readonly activeRealAttemptRefs: ExperimentFoundationCycleActiveRealAttemptRefV2[];
  private readonly faults = new Map<FaultOperation, Error[]>();
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly options: InMemoryExperimentFoundationExecutionV2RepositoryOptions = {},
  ) {
    this.activeRealAttemptRefs = clone([...(options.activeRealAttemptRefs ?? [])]);
    for (const prerequisite of options.prerequisites ?? []) {
      this.storePrerequisite(prerequisite);
    }
    for (const prerequisite of options.realProviderPrerequisites ?? []) {
      this.storeRealProviderPrerequisite(prerequisite);
    }
  }

  seedPrerequisite(prerequisite: ExperimentFoundationExecutionV2Prerequisite): void {
    this.storePrerequisite(prerequisite);
  }

  seedRealProviderPrerequisite(
    prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
  ): void {
    this.storeRealProviderPrerequisite(prerequisite);
  }

  failNext(operation: FaultOperation, error = new Error(`INJECTED_${operation}`)): void {
    const queued = this.faults.get(operation) ?? [];
    queued.push(error);
    this.faults.set(operation, queued);
  }

  snapshot() {
    return {
      payloads: [...this.state.payloads.values()].map(clone),
      attempts: [...this.state.attempts.values()].map(clone),
      events: [...this.state.events.values()].map(clone),
      commands: [...this.state.commands.values()].map(clone),
      collections: [...this.state.collections.values()].map(clone),
      outputs: [...this.state.outputs.values()].map(clone),
      start_receipts: [...this.state.startReceipts.values()].map(clone),
    };
  }

  async resolveRunPrerequisite(
    runId: string,
  ): Promise<ExperimentFoundationExecutionV2Prerequisite | null> {
    const resolved = this.options.prerequisiteResolver
      ? await this.options.prerequisiteResolver(runId)
      : this.prerequisites.get(runId) ?? null;
    return resolved ? clone(resolved) : null;
  }

  async resolveRunCellPrerequisite(
    runId: string,
    runCellId: string,
  ): Promise<ExperimentFoundationExecutionV2Prerequisite | null> {
    const resolved = this.options.prerequisiteResolver
      ? await this.options.prerequisiteResolver(runId)
      : this.prerequisites.get(runId) ?? null;
    if (!resolved) return null;
    const cell = this.options.prerequisiteResolver
      ? new Map(resolved.cells.map((candidate) => [
        candidate.run_cell.run_cell_id,
        candidate,
      ])).get(runCellId)
      : this.prerequisiteCells.get(runId)?.get(runCellId);
    return cell ? clone({ ...resolved, cells: [cell] }) : null;
  }

  async resolveRealProviderRunPrerequisite(
    runId: string,
  ): Promise<ExperimentFoundationRealProviderExecutionV2Prerequisite | null> {
    const resolved = this.options.realProviderPrerequisiteResolver
      ? await this.options.realProviderPrerequisiteResolver(runId)
      : this.realProviderPrerequisites.get(runId) ?? null;
    return resolved ? clone(resolved) : null;
  }

  async resolveRealProviderRunCellPrerequisite(
    runId: string,
    runCellId: string,
  ): Promise<ExperimentFoundationRealProviderExecutionV2Prerequisite | null> {
    const resolved = await this.resolveRealProviderRunPrerequisite(runId);
    if (!resolved) return null;
    const cell = this.options.realProviderPrerequisiteResolver
      ? new Map(resolved.cells.map((candidate) => [
        candidate.run_cell.run_cell_id,
        candidate,
      ])).get(runCellId)
      : this.realProviderPrerequisiteCells.get(runId)?.get(runCellId);
    return cell ? clone({ ...resolved, cells: [cell] }) : null;
  }

  private storePrerequisite(prerequisite: ExperimentFoundationExecutionV2Prerequisite): void {
    const stored = clone(prerequisite);
    this.prerequisites.set(stored.run.run_id, stored);
    this.prerequisiteCells.set(
      stored.run.run_id,
      new Map(stored.cells.map((cell) => [cell.run_cell.run_cell_id, cell])),
    );
  }

  private storeRealProviderPrerequisite(
    prerequisite: ExperimentFoundationRealProviderExecutionV2Prerequisite,
  ): void {
    const stored = clone(prerequisite);
    this.realProviderPrerequisites.set(stored.run.run_id, stored);
    this.realProviderPrerequisiteCells.set(
      stored.run.run_id,
      new Map(stored.cells.map((cell) => [cell.run_cell.run_cell_id, cell])),
    );
  }

  async findWorkflowSimulationStart(runId: string, businessIdempotencyKey: string) {
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
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite
  > | null> {
    return this.withTransaction(undefined, async (draft) => {
      const receipt = draft.startReceipts.get(startReceiptKey(runId, businessIdempotencyKey));
      if (!receipt) return null;
      const prerequisite = executionMode === 'real_provider'
        ? await this.resolveRealProviderRunPrerequisite(runId)
        : await this.resolveRunPrerequisite(runId);
      if (!prerequisite) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Committed workflow start lost its prerequisite.');
      }
      return this.startOutcomeFromReceipt(draft, prerequisite, receipt, true);
    });
  }

  async startWorkflowSimulation(
    input: ExperimentFoundationExecutionV2StartInput,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome> {
    return this.startExecution(input, 'simulation') as Promise<
      ExperimentFoundationExecutionV2StartOutcome
    >;
  }

  async startRealProviderExecution(
    input: ExperimentFoundationExecutionV2StartInput,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationRealProviderExecutionV2Prerequisite
  >> {
    return this.startExecution(input, 'real_provider') as Promise<
      ExperimentFoundationExecutionV2StartOutcome<
        ExperimentFoundationRealProviderExecutionV2Prerequisite
      >
    >;
  }

  private async startExecution(
    input: ExperimentFoundationExecutionV2StartInput,
    executionMode: 'simulation' | 'real_provider',
  ): Promise<ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite
  >> {
    return this.withTransaction('startWorkflowSimulation', async (draft) => {
      const prerequisite = executionMode === 'real_provider'
        ? await this.resolveRealProviderRunPrerequisite(input.run_id)
        : await this.resolveRunPrerequisite(input.run_id);
      if (!prerequisite) {
        throw constraint('EXECUTION_SCOPE_DRIFT', `Run prerequisite not found: ${input.run_id}`);
      }

      const receiptKey = startReceiptKey(input.run_id, input.business_idempotency_key);
      const receipt = draft.startReceipts.get(receiptKey);
      if (receipt) {
        if (receipt.request_hash !== input.request_hash) {
          throw constraint(
            'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
            'Workflow business key was reused with a changed request hash.',
          );
        }
        return this.startOutcomeFromReceipt(draft, prerequisite, receipt, true);
      }

      this.assertStartPrerequisite(prerequisite, input);
      this.assertStartShape(draft, prerequisite, input, executionMode);

      const payloadIds = input.payloads.map((payload) => {
        const existingId = draft.payloadByMaterializationKey.get(payload.materialization_key);
        if (existingId) {
          const existing = draft.payloads.get(existingId)!;
          exactOrConflict(
            existing,
            payload,
            'PROVIDER_PAYLOAD_CONFLICT',
            'Provider payload materialization key was reused with changed content.',
          );
          return existing.id;
        }
        const sameId = draft.payloads.get(payload.id);
        if (sameId) {
          exactOrConflict(
            sameId,
            payload,
            'PROVIDER_PAYLOAD_CONFLICT',
            'Provider payload id was reused with changed content.',
          );
          return sameId.id;
        }
        draft.payloads.set(payload.id, clone(payload));
        draft.payloadByMaterializationKey.set(payload.materialization_key, payload.id);
        return payload.id;
      });

      for (const attempt of input.attempts) {
        this.insertAttempt(draft, attempt);
      }
      for (const event of input.events) {
        this.insertEvent(draft, event);
      }
      for (const command of input.commands) {
        this.insertCommand(draft, command);
      }

      const startReceipt: StartReceipt = {
        run_id: input.run_id,
        business_idempotency_key: input.business_idempotency_key,
        request_hash: input.request_hash,
        payload_ids: payloadIds,
        attempt_ids: input.attempts.map((attempt) => attempt.id),
        event_ids: input.events.map((event) => event.id),
        command_ids: input.commands.map((command) => command.id),
      };
      draft.startReceipts.set(receiptKey, startReceipt);
      return this.startOutcomeFromReceipt(draft, prerequisite, startReceipt, false);
    });
  }

  async findAttempt(attemptId: string) {
    return clone(this.state.attempts.get(attemptId) ?? null);
  }

  async findProviderPayload(providerPayloadId: string) {
    return clone(this.state.payloads.get(providerPayloadId) ?? null);
  }

  async listRunAttempts(runId: string) {
    return [...this.state.attempts.values()]
      .filter((attempt) => attempt.run_id === runId)
      .sort((left, right) =>
        left.run_cell_id.localeCompare(right.run_cell_id)
        || left.attempt_sequence - right.attempt_sequence
        || left.id.localeCompare(right.id))
      .map(clone);
  }

  async listCycleActiveRealAttemptRefs(
    input: ExperimentFoundationCycleActiveRealAttemptFenceInputV2,
  ) {
    const activeStates = new Set<string>(EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2);
    return this.activeRealAttemptRefs
      .filter((attempt) => (
        attempt.implementation_project_id === input.implementation_project_id
        && attempt.validation_cycle_id === input.validation_cycle_id
        && attempt.execution_mode === 'real_provider'
        && activeStates.has(attempt.lifecycle_state)
      ))
      .sort(compareActiveRealAttemptRefs)
      .map(clone);
  }

  async listAttemptEvents(attemptId: string) {
    return [...this.state.events.values()]
      .filter((event) => event.execution_attempt_id === attemptId)
      .sort((left, right) => left.event_sequence - right.event_sequence
        || left.id.localeCompare(right.id))
      .map(clone);
  }

  async readRunProjectionFacts(runId: string) {
    return this.withTransaction(undefined, async (draft) => {
      const attempts = [...draft.attempts.values()]
        .filter((attempt) => attempt.run_id === runId)
        .sort((left, right) => left.run_cell_id.localeCompare(right.run_cell_id)
          || left.attempt_sequence - right.attempt_sequence
          || left.id.localeCompare(right.id));
      const attemptIds = new Set(attempts.map((attempt) => attempt.id));
      const events = [...draft.events.values()]
        .filter((event) => attemptIds.has(event.execution_attempt_id))
        .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at)
          || left.execution_attempt_id.localeCompare(right.execution_attempt_id)
          || left.event_sequence - right.event_sequence);
      const collections = [...draft.collections.values()]
        .filter((collection) => attemptIds.has(collection.execution_attempt_id))
        .sort((left, right) => left.execution_attempt_id.localeCompare(right.execution_attempt_id)
          || left.id.localeCompare(right.id));
      return { attempts, events, collections };
    });
  }

  async listAttemptCollections(attemptId: string) {
    return [...this.state.collections.values()]
      .filter((collection) => collection.execution_attempt_id === attemptId)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(clone);
  }

  async listRunPayloads(runId: string) {
    return [...this.state.payloads.values()]
      .filter((payload) => payload.run_id === runId)
      .sort((left, right) => left.run_cell_id.localeCompare(right.run_cell_id)
        || left.id.localeCompare(right.id))
      .map(clone);
  }

  async listAttemptCommands(attemptId: string) {
    return [...this.state.commands.values()]
      .filter((command) => command.execution_attempt_id === attemptId)
      .sort((left, right) => left.command_sequence - right.command_sequence
        || left.id.localeCompare(right.id))
      .map(clone);
  }

  async claimCommands(input: ExperimentFoundationExecutionV2CommandClaimInput) {
    return this.withTransaction(undefined, async (draft) => {
      if (compareIso(input.lease_expires_at, input.claimed_at) <= 0) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command lease must expire after claim time.');
      }
      const claimed = [...draft.commands.values()]
        .filter((command) => {
          if (input.command_kinds && !input.command_kinds.includes(command.operation)) {
            return false;
          }
          const attempt = draft.attempts.get(command.execution_attempt_id);
          if (input.execution_modes && (
            !attempt || !input.execution_modes.includes(attempt.execution_mode)
          )) {
            return false;
          }
          // A cancellation requested after submit was leased is durable, but
          // it must wait until that submit outcome converges. While the
          // Attempt remains prepared there may already be an accepted provider
          // job, so claiming cancel would either issue it without an external
          // ref or terminalize the intent prematurely.
          if (
            command.operation === 'cancel'
            && attempt?.lifecycle_state === 'prepared'
          ) {
            return false;
          }
          if (command.state === 'pending') {
            return !command.next_attempt_at || compareIso(command.next_attempt_at, input.claimed_at) <= 0;
          }
          return command.state === 'claimed'
            && !!command.lease_expires_at
            && compareIso(command.lease_expires_at, input.claimed_at) <= 0;
        })
        .sort((left, right) =>
          (left.next_attempt_at ?? left.created_at).localeCompare(right.next_attempt_at ?? right.created_at)
          || left.created_at.localeCompare(right.created_at)
          || left.id.localeCompare(right.id))
        .slice(0, Math.max(0, input.limit));

      for (const command of claimed) {
        if (
          !Number.isInteger(command.lease_version)
          || command.lease_version < 0
          || command.lease_version >= EXPERIMENT_V2_INT32_MAX
          || !Number.isInteger(command.attempt_count)
          || command.attempt_count < 0
          || command.attempt_count >= EXPERIMENT_V2_INT32_MAX
        ) {
          throw constraint(
            'PROVIDER_COMMAND_LEASE_CONFLICT',
            'Provider command claim counter cannot advance within the PostgreSQL Int32 range.',
          );
        }
        draft.commands.set(command.id, {
          ...command,
          state: 'claimed',
          lease_version: command.lease_version + 1,
          lease_owner: input.lease_owner,
          lease_expires_at: input.lease_expires_at,
          last_heartbeat_at: input.claimed_at,
          attempt_count: command.attempt_count + 1,
          updated_at: input.claimed_at,
        });
      }
      return claimed.map((command) => clone(
        draft.commands.get(command.id)!,
      ));
    });
  }

  async heartbeatCommand(input: ExperimentFoundationExecutionV2CommandHeartbeatInput) {
    return this.withTransaction(undefined, async (draft) => {
      if (compareIso(input.lease_expires_at, input.heartbeat_at) <= 0) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command lease must extend past heartbeat time.');
      }
      const command = this.requireClaimedCommand(
        draft,
        input.command_id,
        input.lease_owner,
        input.expected_lease_version,
        input.heartbeat_at,
      );
      const next = {
        ...command,
        lease_expires_at: input.lease_expires_at,
        last_heartbeat_at: input.heartbeat_at,
        updated_at: input.heartbeat_at,
      };
      draft.commands.set(command.id, next);
      return clone(next);
    });
  }

  async commitCommandOutcome(input: ExperimentFoundationExecutionV2CommitCommandOutcomeInput) {
    return this.withTransaction('commitCommandOutcome', async (draft) => {
      const existingCommand = draft.commands.get(input.command_id);
      if (!existingCommand) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', `Provider command not found: ${input.command_id}`);
      }
      const currentAttempt = draft.attempts.get(existingCommand.execution_attempt_id);
      if (!currentAttempt) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Provider command has no owning Attempt.');
      }

      if (existingCommand.state === 'succeeded' || existingCommand.state === 'terminal') {
        if (
          existingCommand.response_hash !== input.response_hash
          || existingCommand.last_error_code !== (input.command_terminal_error_code ?? null)
          || !isDeepStrictEqual(currentAttempt, input.next_attempt)
        ) {
          throw constraint('PROVIDER_RESPONSE_INVALID', 'Committed provider response replay drifted.');
        }
        this.assertExistingEventAndNextCommand(draft, input.event, input.next_command);
        return clone(currentAttempt);
      }

      const command = this.requireClaimedCommand(
        draft,
        input.command_id,
        input.lease_owner,
        input.expected_lease_version,
        input.committed_at,
      );
      if (command.operation === 'reconcile' && input.next_attempt.lifecycle_state === 'succeeded') {
        throw constraint(
          'EXECUTION_ATTEMPT_STATE_CONFLICT',
          'A successful reconcile must be committed through prepareCollection atomically.',
        );
      }
      if (
        input.command_terminal_error_code
        && (input.next_attempt.lifecycle_state !== 'failed' || input.next_command)
      ) {
        throw constraint(
          'PROVIDER_RESPONSE_INVALID',
          'A terminal provider command must atomically fail its Attempt without a next command.',
        );
      }
      assertValidAttemptUpdate(
        currentAttempt,
        input.expected_attempt_state_version,
        input.next_attempt,
        input.event,
        command.id,
      );
      assertCommandOutcomeTransition(
        command,
        currentAttempt,
        input.next_attempt,
        input.command_terminal_error_code,
      );

      draft.attempts.set(currentAttempt.id, clone(input.next_attempt));
      this.insertEvent(draft, input.event);
      if (input.next_command) {
        this.insertCommand(draft, input.next_command);
      }
      draft.commands.set(command.id, {
        ...command,
        state: input.command_terminal_error_code ? 'terminal' : 'succeeded',
        lease_owner: null,
        lease_expires_at: null,
        last_heartbeat_at: null,
        response_hash: input.response_hash,
        last_error_code: input.command_terminal_error_code ?? null,
        updated_at: input.committed_at,
        completed_at: input.committed_at,
      });
      return clone(input.next_attempt);
    });
  }

  async releaseCommand(input: ExperimentFoundationExecutionV2ReleaseCommandInput) {
    return this.withTransaction(undefined, async (draft) => {
      const command = this.requireClaimedCommand(
        draft,
        input.command_id,
        input.lease_owner,
        input.expected_lease_version,
        input.released_at,
      );
      const next: ExperimentFoundationProviderCommandV2Record = {
        ...command,
        state: 'pending',
        lease_owner: null,
        lease_expires_at: null,
        last_heartbeat_at: null,
        next_attempt_at: input.next_attempt_at,
        last_error_code: input.error_code,
        updated_at: input.released_at,
      };
      draft.commands.set(command.id, next);
      return clone(next);
    });
  }

  async terminalizeCommand(input: ExperimentFoundationExecutionV2TerminalizeCommandInput) {
    return this.withTransaction(undefined, async (draft) => {
      const command = draft.commands.get(input.command_id);
      if (!command) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', `Provider command not found: ${input.command_id}`);
      }
      if (command.state === 'terminal') {
        if (command.last_error_code !== input.error_code) {
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Terminal command replay drifted.');
        }
        return clone(command);
      }
      if (command.state === 'claimed') {
        this.requireClaimedCommand(
          draft,
          input.command_id,
          input.lease_owner ?? '',
          input.expected_lease_version ?? -1,
          input.terminal_at,
        );
      } else if (
        command.state !== 'pending'
        || input.lease_owner !== null
        || input.expected_lease_version !== null
      ) {
        throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Command cannot be terminalized by this owner.');
      }
      const next: ExperimentFoundationProviderCommandV2Record = {
        ...command,
        state: 'terminal',
        lease_owner: null,
        lease_expires_at: null,
        last_heartbeat_at: null,
        last_error_code: input.error_code,
        updated_at: input.terminal_at,
        completed_at: input.terminal_at,
      };
      draft.commands.set(command.id, next);
      return clone(next);
    });
  }

  async enqueueControlCommand(input: ExperimentFoundationExecutionV2EnqueueControlCommandInput) {
    return this.withTransaction('enqueueControlCommand', async (draft) => {
      const existingId = draft.commandByProviderIdempotencyKey.get(
        input.command.provider_idempotency_key,
      );
      if (existingId) {
        const existing = draft.commands.get(existingId)!;
        if (!sameControlCommandIntent(existing, input.command)) {
          throw constraint(
            'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
            'Provider control idempotency key was reused with changed semantic intent.',
          );
        }
        return clone(existing);
      }

      const attempt = draft.attempts.get(input.attempt_id);
      if (!attempt || attempt.state_version !== input.expected_attempt_state_version) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt changed before control command enqueue.');
      }

      if (
        input.command.operation === 'cancel'
        && attempt.lifecycle_state === 'prepared'
        && attempt.external_job_ref === null
      ) {
        const submit = [...draft.commands.values()].find((command) =>
          command.execution_attempt_id === attempt.id
          && command.operation === 'submit'
          && (command.state === 'pending' || command.state === 'claimed'));
        if (!submit) {
          throw constraint(
            'PROVIDER_COMMAND_LEASE_CONFLICT',
            'Prepared Attempt has no pending or leased submit command.',
          );
        }
        if (submit.state === 'claimed') {
          // E2 changes only command lease state. Persist the cancellation
          // intent now; the worker will not claim it until E3 (or submit lease
          // recovery) moves the Attempt beyond prepared.
          this.insertCommand(draft, input.command);
          return clone(input.command);
        }
        if (!input.event || !input.next_attempt) {
          throw constraint(
            'EXECUTION_ATTEMPT_STATE_CONFLICT',
            'Pending-submit cancellation requires its atomic Attempt transition and event.',
          );
        }
        assertValidAttemptUpdate(
          attempt,
          input.expected_attempt_state_version,
          input.next_attempt,
          input.event,
          input.command.id,
        );
        const at = input.event.occurred_at;
        draft.commands.set(submit.id, {
          ...submit,
          state: 'terminal',
          last_error_code: 'cancelled_before_submit',
          updated_at: at,
          completed_at: at,
        });
        const completedCancel: ExperimentFoundationProviderCommandV2Record = {
          ...input.command,
          state: input.command.state === 'terminal' ? 'terminal' : 'succeeded',
          response_hash: input.command.response_hash ?? input.event.event_hash,
          updated_at: at,
          completed_at: at,
        };
        draft.attempts.set(attempt.id, clone(input.next_attempt));
        this.insertEvent(draft, input.event);
        this.insertCommand(draft, completedCancel);
        return clone(completedCancel);
      }

      this.insertCommand(draft, input.command);
      return clone(input.command);
    });
  }

  async prepareCollection(input: ExperimentFoundationExecutionV2PrepareCollectionInput) {
    return this.withTransaction('prepareCollection', async (draft) => {
      const reconcileCommand = draft.commands.get(input.command_id);
      if (!reconcileCommand || reconcileCommand.operation !== 'reconcile') {
        throw constraint(
          'COLLECTION_ATTEMPT_CONFLICT',
          'Collection preparation requires its exact reconcile command.',
        );
      }
      const currentAttempt = draft.attempts.get(reconcileCommand.execution_attempt_id);
      if (!currentAttempt || input.collection.execution_attempt_id !== currentAttempt.id) {
        throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection Attempt scope drifted.');
      }

      const existingCollectionId = draft.collectionByAttempt.get(currentAttempt.id);
      if (reconcileCommand.state === 'succeeded' && existingCollectionId) {
        const existing = draft.collections.get(existingCollectionId)!;
        if (
          reconcileCommand.response_hash !== input.response_hash
          || !isDeepStrictEqual(currentAttempt, input.next_attempt)
        ) {
          throw constraint('PROVIDER_RESPONSE_INVALID', 'Collection preparation replay drifted.');
        }
        exactOrConflict(
          existing,
          input.collection,
          'COLLECTION_ATTEMPT_CONFLICT',
          'Collection replay drifted.',
        );
        this.assertExistingEventAndNextCommand(draft, input.succeeded_event);
        this.assertExistingEventAndNextCommand(
          draft,
          input.collection_prepared_event,
          input.collect_command,
        );
        return clone(existing);
      }

      const activeCancel = [...draft.commands.values()].find((candidate) =>
        candidate.execution_attempt_id === currentAttempt.id
        && candidate.operation === 'cancel'
        && (candidate.state === 'pending' || candidate.state === 'claimed'));
      if (activeCancel) {
        throw constraint(
          'EXECUTION_ATTEMPT_STATE_CONFLICT',
          'Successful reconcile cannot overtake a durable cancellation intent.',
        );
      }

      const command = this.requireClaimedCommand(
        draft,
        input.command_id,
        input.lease_owner,
        input.expected_lease_version,
        input.committed_at,
      );
      assertValidAttemptUpdate(
        currentAttempt,
        input.expected_attempt_state_version,
        input.next_attempt,
        input.succeeded_event,
        command.id,
      );
      assertCollectionPreparationShape(currentAttempt, command, input);
      if (existingCollectionId) {
        throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Attempt already has a CollectionAttempt.');
      }

      draft.attempts.set(currentAttempt.id, clone(input.next_attempt));
      this.insertEvent(draft, input.succeeded_event);
      draft.collections.set(input.collection.id, clone(input.collection));
      draft.collectionByAttempt.set(currentAttempt.id, input.collection.id);
      this.insertEvent(draft, input.collection_prepared_event);
      this.insertCommand(draft, input.collect_command);
      draft.commands.set(command.id, {
        ...command,
        state: 'succeeded',
        lease_owner: null,
        lease_expires_at: null,
        last_heartbeat_at: null,
        response_hash: input.response_hash,
        last_error_code: null,
        updated_at: input.committed_at,
        completed_at: input.committed_at,
      });
      return clone(input.collection);
    });
  }

  async commitCollectionCompletion(input: ExperimentFoundationExecutionV2CommitCollectionInput) {
    return this.withTransaction('commitCollectionCompletion', async (draft) => {
      const collection = draft.collections.get(input.collection_id);
      const command = draft.commands.get(input.command_id);
      const attempt = collection
        ? draft.attempts.get(collection.execution_attempt_id)
        : undefined;
      if (!collection || !command || command.collection_attempt_id !== collection.id) {
        throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection command scope is missing or drifted.');
      }
      if (!attempt) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Collection Attempt owner is missing.');
      }

      if (collection.collection_state === input.next_collection.collection_state) {
        const expectedCommandState = input.command_terminal_error_code ? 'terminal' : 'succeeded';
        if (
          !isDeepStrictEqual(collection, input.next_collection)
          || command.state !== expectedCommandState
          || command.response_hash !== input.response_hash
          || command.last_error_code !== (input.command_terminal_error_code ?? null)
        ) {
          throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection completion replay drifted.');
        }
        this.assertExistingEventAndOutputs(draft, input.event, input.provisional_outputs);
        return clone(collection);
      }

      this.requireClaimedCommand(
        draft,
        input.command_id,
        input.lease_owner,
        input.expected_lease_version,
        input.committed_at,
      );
      assertCollectionCompletionShape(collection, attempt, command, input);
      for (const output of input.provisional_outputs) {
        this.insertOutput(draft, output);
      }
      this.insertEvent(draft, input.event);
      draft.collections.set(collection.id, clone(input.next_collection));
      draft.commands.set(command.id, {
        ...command,
        state: input.command_terminal_error_code ? 'terminal' : 'succeeded',
        lease_owner: null,
        lease_expires_at: null,
        last_heartbeat_at: null,
        response_hash: input.response_hash,
        last_error_code: input.command_terminal_error_code ?? null,
        updated_at: input.committed_at,
        completed_at: input.committed_at,
      });
      return clone(input.next_collection);
    });
  }

  private async withTransaction<T>(
    faultOperation: FaultOperation | undefined,
    operation: (draft: State) => Promise<T>,
  ): Promise<T> {
    let release!: () => void;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const draft = cloneState(this.state);
      const result = await operation(draft);
      if (faultOperation) {
        this.maybeFail(faultOperation);
      }
      this.state = draft;
      return clone(result);
    } finally {
      release();
    }
  }

  private maybeFail(operation: FaultOperation): void {
    const queued = this.faults.get(operation);
    const error = queued?.shift();
    if (queued && queued.length === 0) {
      this.faults.delete(operation);
    }
    if (error) {
      throw error;
    }
  }

  private assertStartPrerequisite(
    prerequisite:
      | ExperimentFoundationExecutionV2Prerequisite
      | ExperimentFoundationRealProviderExecutionV2Prerequisite,
    input: ExperimentFoundationExecutionV2StartInput,
  ): void {
    if (prerequisite.run.run_manifest_hash !== input.expected_run_manifest_hash) {
      throw constraint('EXECUTION_SCOPE_DRIFT', 'Run manifest changed before Attempt creation.');
    }
    if (!prerequisite.head_acknowledgement) {
      throw constraint('EXECUTION_HEAD_ACK_REQUIRED', 'Exact durable head acknowledgement is required.');
    }
    if (
      prerequisite.head_acknowledgement.inbox_id !== input.expected_head_acknowledgement_inbox_id
      || prerequisite.head_acknowledgement.event_payload_hash
        !== input.expected_head_acknowledgement_payload_hash
    ) {
      throw constraint(
        'EXECUTION_HEAD_ACK_REQUIRED',
        'Head acknowledgement hash or identity drifted.',
      );
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
      || prerequisite.head_acknowledgement.run_manifest_hash
        !== prerequisite.run.run_manifest_hash
      || !isDeepStrictEqual(
        prerequisite.latest_branch_head_acknowledgement,
        prerequisite.head_acknowledgement,
      )
    ) {
      throw constraint('EXECUTION_RUN_NOT_CURRENT_HEAD', 'Run is no longer the latest acknowledged branch head.');
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
      throw constraint('EXECUTION_READINESS_DRIFT', 'Readiness is missing, blocked, or changed.');
    }
  }

  private assertStartShape(
    state: State,
    prerequisite:
      | ExperimentFoundationExecutionV2Prerequisite
      | ExperimentFoundationRealProviderExecutionV2Prerequisite,
    input: ExperimentFoundationExecutionV2StartInput,
    executionMode: 'simulation' | 'real_provider',
  ): void {
    const requiredCells = new Map(
      prerequisite.cells.map((cell) => [cell.run_cell.run_cell_id, cell]),
    );
    const latestByCell = new Map<string, ExperimentFoundationExecutionAttemptV2Record>();
    for (const candidate of state.attempts.values()) {
      if (!requiredCells.has(candidate.run_cell_id)) continue;
      const current = latestByCell.get(candidate.run_cell_id);
      if (!current || candidate.attempt_sequence > current.attempt_sequence) {
        latestByCell.set(candidate.run_cell_id, candidate);
      }
    }
    const expectedCells = new Map(requiredCells);
    if (latestByCell.size > 0) {
      expectedCells.clear();
      for (const [runCellId, cell] of requiredCells) {
        const latest = latestByCell.get(runCellId);
        if (!latest) {
          throw constraint('EXECUTION_SCOPE_DRIFT', 'Retry lineage is missing a required cell Attempt.');
        }
        if (!isExecutionAttemptTerminal(latest.lifecycle_state)) {
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Retry is blocked by a nonterminal latest Attempt.');
        }
        if (latest.lifecycle_state === 'succeeded') continue;
        if (latest.attempt_sequence >= cell.retry_ceiling) {
          throw constraint('EXECUTION_ATTEMPT_LIMIT_EXHAUSTED', 'TaskSpec retry ceiling is exhausted.');
        }
        expectedCells.set(runCellId, cell);
      }
      if (expectedCells.size === 0) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'All required cells already succeeded.');
      }
    }
    if (
      input.payloads.length !== expectedCells.size
      || input.attempts.length !== expectedCells.size
      || input.events.length !== expectedCells.size
      || input.commands.length !== expectedCells.size
    ) {
      throw constraint('EXECUTION_SCOPE_DRIFT', 'E1 records do not match the exact initial/retry cell subset.');
    }
    const startRecords = indexWorkflowStartRecords(input);
    const seenCells = new Set<string>();
    for (const attempt of input.attempts) {
      const required = expectedCells.get(attempt.run_cell_id);
      if (!required || seenCells.has(attempt.run_cell_id)) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'Attempt cell set does not exactly match the Run manifest.');
      }
      seenCells.add(attempt.run_cell_id);
      const previous = latestByCell.get(attempt.run_cell_id);
      if (previous) {
        if (previous.lifecycle_state !== 'failed' && previous.lifecycle_state !== 'cancelled') {
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Only failed or cancelled Attempts may be retried.');
        }
        if (attempt.attempt_sequence !== previous.attempt_sequence + 1) {
          throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt sequence did not advance exactly once.');
        }
      } else if (attempt.attempt_sequence !== 1) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'First cell Attempt must use sequence one.');
      }
      if (attempt.attempt_sequence > required.retry_ceiling) {
        throw constraint('EXECUTION_ATTEMPT_LIMIT_EXHAUSTED', 'TrainingTaskSpec retry ceiling is exhausted.');
      }
      const payload = startRecords.payloadByRunCellId.get(attempt.run_cell_id);
      const event = startRecords.eventByAttemptId.get(attempt.id);
      const command = startRecords.commandByAttemptId.get(attempt.id);
      assertAttemptTerminalStateReasonPair(attempt);
      if (
        !payload
        || payload.id !== attempt.provider_payload_id
        || payload.payload_hash !== attempt.provider_payload_hash
        || payload.run_id !== prerequisite.run.run_id
        || payload.run_manifest_hash !== prerequisite.run.run_manifest_hash
        || payload.training_task_spec_id !== required.task_spec.training_task_spec_id
        || payload.training_task_spec_hash !== required.task_spec.task_spec_hash
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
        || attempt.cell_key !== required.run_cell.cell_key
        || attempt.training_task_spec_id !== required.task_spec.training_task_spec_id
        || attempt.training_task_spec_hash !== required.task_spec.task_spec_hash
        || attempt.head_acknowledgement_inbox_id !== prerequisite.head_acknowledgement.inbox_id
        || attempt.workflow_business_key !== input.business_idempotency_key
        || attempt.workflow_request_hash !== input.request_hash
        || attempt.lifecycle_state !== 'prepared'
        || attempt.state_version !== 0
        || !event
        || event.event_sequence !== 1
        || event.event_type !== 'created'
        || event.next_state !== 'prepared'
        || event.prior_state !== null
        || event.provider_command_id !== null
        || event.payload_hash !== payload.payload_hash
        || !command
        || command.command_sequence !== 1
        || command.operation !== 'submit'
        || command.execution_attempt_id !== attempt.id
        || command.collection_attempt_id !== null
        || command.state !== 'pending'
        || command.payload_hash !== payload.payload_hash
      ) {
        throw constraint('EXECUTION_SCOPE_DRIFT', 'E1 payload, Attempt, event, or command exact scope drifted.');
      }
    }
  }

  private insertAttempt(state: State, attempt: ExperimentFoundationExecutionAttemptV2Record): void {
    const workflowKey = attemptWorkflowKey(attempt.run_cell_id, attempt.workflow_business_key);
    const existingWorkflowId = state.attemptByWorkflowKey.get(workflowKey);
    if (existingWorkflowId) {
      exactOrConflict(
        state.attempts.get(existingWorkflowId)!,
        attempt,
        'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
        'Attempt workflow key was reused with changed input.',
      );
      return;
    }
    const sequenceKey = attemptCellSequenceKey(attempt.run_cell_id, attempt.attempt_sequence);
    if (state.attemptByCellSequence.has(sequenceKey) || state.attempts.has(attempt.id)) {
      throw constraint('EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT', 'Attempt identity or cell sequence already exists.');
    }
    state.attempts.set(attempt.id, clone(attempt));
    state.attemptByWorkflowKey.set(workflowKey, attempt.id);
    state.attemptByCellSequence.set(sequenceKey, attempt.id);
  }

  private insertEvent(state: State, event: ExperimentFoundationExecutionAttemptEventV2Record): void {
    const existing = state.events.get(event.id);
    if (existing) {
      exactOrConflict(existing, event, 'EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt event id replay drifted.');
      return;
    }
    const key = attemptSequenceKey(event.execution_attempt_id, event.event_sequence);
    if (state.eventByAttemptSequence.has(key)) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt event sequence already exists.');
    }
    const previousCount = [...state.events.values()].filter(
      (candidate) => candidate.execution_attempt_id === event.execution_attempt_id,
    ).length;
    if (event.event_sequence !== previousCount + 1) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Attempt event sequence must be contiguous.');
    }
    state.events.set(event.id, clone(event));
    state.eventByAttemptSequence.set(key, event.id);
  }

  private insertCommand(state: State, command: ExperimentFoundationProviderCommandV2Record): void {
    const existing = state.commands.get(command.id);
    if (existing) {
      exactOrConflict(existing, command, 'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT', 'Provider command id replay drifted.');
      return;
    }
    const idempotentId = state.commandByProviderIdempotencyKey.get(command.provider_idempotency_key);
    if (idempotentId) {
      exactOrConflict(
        state.commands.get(idempotentId)!,
        command,
        'EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT',
        'Provider idempotency key was reused with changed command.',
      );
      return;
    }
    const sequenceKey = attemptSequenceKey(command.execution_attempt_id, command.command_sequence);
    if (state.commandByAttemptSequence.has(sequenceKey)) {
      throw constraint('EXECUTION_ATTEMPT_IDEMPOTENCY_CONFLICT', 'Provider command sequence already exists.');
    }
    const previousCount = [...state.commands.values()].filter(
      (candidate) => candidate.execution_attempt_id === command.execution_attempt_id,
    ).length;
    if (command.command_sequence !== previousCount + 1) {
      throw constraint(
        'EXECUTION_ATTEMPT_STATE_CONFLICT',
        'Provider command sequence must be contiguous within its Attempt.',
      );
    }
    state.commands.set(command.id, clone(command));
    state.commandByAttemptSequence.set(sequenceKey, command.id);
    state.commandByProviderIdempotencyKey.set(command.provider_idempotency_key, command.id);
  }

  private insertOutput(state: State, output: ExperimentFoundationProvisionalOutputV2Record): void {
    const existing = state.outputs.get(output.id);
    if (existing) {
      exactOrConflict(existing, output, 'COLLECTION_ATTEMPT_CONFLICT', 'Output identity replay drifted.');
      return;
    }
    const key = collectionOrdinalKey(output.collection_attempt_id, output.ordinal);
    if (state.outputByCollectionOrdinal.has(key)) {
      throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection output ordinal already exists.');
    }
    state.outputs.set(output.id, clone(output));
    state.outputByCollectionOrdinal.set(key, output.id);
  }

  private requireClaimedCommand(
    state: State,
    commandId: string,
    leaseOwner: string,
    expectedLeaseVersion: number,
    at: string,
  ): ExperimentFoundationProviderCommandV2Record {
    const command = state.commands.get(commandId);
    if (
      !command
      || command.state !== 'claimed'
      || command.lease_owner !== leaseOwner
      || command.lease_version !== expectedLeaseVersion
      || !command.lease_expires_at
      || compareIso(command.lease_expires_at, at) <= 0
    ) {
      throw constraint('PROVIDER_COMMAND_LEASE_CONFLICT', 'Provider command lease is absent, expired, or owned by another worker.');
    }
    return command;
  }

  private assertExistingEventAndNextCommand(
    state: State,
    event: ExperimentFoundationExecutionAttemptEventV2Record,
    command?: ExperimentFoundationProviderCommandV2Record,
  ): void {
    const existingEvent = state.events.get(event.id);
    if (!existingEvent || !isDeepStrictEqual(existingEvent, event)) {
      throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Committed Attempt event replay drifted.');
    }
    if (command) {
      const existingCommand = state.commands.get(command.id);
      if (!existingCommand || !isDeepStrictEqual(existingCommand, command)) {
        throw constraint('EXECUTION_ATTEMPT_STATE_CONFLICT', 'Committed next command replay drifted.');
      }
    }
  }

  private assertExistingEventAndOutputs(
    state: State,
    event: ExperimentFoundationExecutionAttemptEventV2Record,
    outputs: ExperimentFoundationProvisionalOutputV2Record[],
  ): void {
    this.assertExistingEventAndNextCommand(state, event);
    for (const output of outputs) {
      const existing = state.outputs.get(output.id);
      if (!existing || !isDeepStrictEqual(existing, output)) {
        throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Committed provisional output replay drifted.');
      }
    }
  }

  private startOutcomeFromReceipt(
    state: State,
    prerequisite:
      | ExperimentFoundationExecutionV2Prerequisite
      | ExperimentFoundationRealProviderExecutionV2Prerequisite,
    receipt: StartReceipt,
    replayed: boolean,
  ): ExperimentFoundationExecutionV2StartOutcome<
    ExperimentFoundationExecutionV2Prerequisite
    | ExperimentFoundationRealProviderExecutionV2Prerequisite
  > {
    return {
      prerequisite: clone(prerequisite),
      payloads: receipt.payload_ids.map((id) => clone(state.payloads.get(id)!)),
      attempts: receipt.attempt_ids.map((id) => clone(state.attempts.get(id)!)),
      events: receipt.event_ids.map((id) => clone(state.events.get(id)!)),
      commands: receipt.command_ids.map((id) => clone(state.commands.get(id)!)),
      replayed,
    };
  }
}
