import { isDeepStrictEqual } from 'node:util';

import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationCollectionAttemptV2Record,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptStateV2,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationExecutionV2CommitCollectionInput,
  type ExperimentFoundationExecutionV2PrepareCollectionInput,
  type ExperimentFoundationExecutionV2StartInput,
  type ExperimentFoundationProviderCommandV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
  type ExperimentFoundationProvisionalOutputV2Record,
} from './experiment-foundation-execution-v2.repository.js';

export function indexWorkflowStartRecords(
  input: Pick<
    ExperimentFoundationExecutionV2StartInput,
    'payloads' | 'events' | 'commands'
  >,
): {
    payloadByRunCellId: Map<string, ExperimentFoundationProviderPayloadV2Record>;
    eventByAttemptId: Map<string, ExperimentFoundationExecutionAttemptEventV2Record>;
    commandByAttemptId: Map<string, ExperimentFoundationProviderCommandV2Record>;
  } {
  return {
    payloadByRunCellId: indexUnique(
      input.payloads,
      (payload) => payload.run_cell_id,
      'provider payload RunCell',
    ),
    eventByAttemptId: indexUnique(
      input.events,
      (event) => event.execution_attempt_id,
      'initial event Attempt',
    ),
    commandByAttemptId: indexUnique(
      input.commands,
      (command) => command.execution_attempt_id,
      'initial command Attempt',
    ),
  };
}

export function isExecutionAttemptTerminal(
  state: ExperimentFoundationExecutionAttemptStateV2,
): boolean {
  return state === 'succeeded' || state === 'failed' || state === 'cancelled';
}

export function assertValidAttemptUpdate(
  current: ExperimentFoundationExecutionAttemptV2Record,
  expectedVersion: number,
  next: ExperimentFoundationExecutionAttemptV2Record,
  event: ExperimentFoundationExecutionAttemptEventV2Record,
  expectedCommandId: string,
): void {
  assertAttemptTerminalStateReasonPair(next);
  if (
    current.state_version !== expectedVersion
    || next.id !== current.id
    || next.state_version !== current.state_version + 1
    || !sameAttemptImmutableScope(current, next)
    || !validAttemptTransition(current.lifecycle_state, next.lifecycle_state)
    || event.execution_attempt_id !== current.id
    || event.prior_state !== current.lifecycle_state
    || event.next_state !== next.lifecycle_state
    || event.event_type !== next.lifecycle_state
    || event.provider_command_id !== expectedCommandId
    || event.payload_hash !== current.provider_payload_hash
    || !sameExternalJobRef(event, next)
  ) {
    throw constraint(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Attempt lifecycle CAS or event transition failed.',
    );
  }
}

export function assertAttemptTerminalStateReasonPair(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
): void {
  const valid = attempt.lifecycle_state === 'succeeded'
    ? attempt.terminal_reason_code === (attempt.execution_mode === 'real_provider'
      ? 'real_provider_succeeded'
      : 'simulation_succeeded') && attempt.terminal_at !== null
    : attempt.lifecycle_state === 'cancelled'
      ? attempt.terminal_reason_code === 'operator_cancelled' && attempt.terminal_at !== null
      : attempt.lifecycle_state === 'failed'
        ? (attempt.execution_mode === 'real_provider'
          ? [
            'real_provider_failed',
            'provider_response_invalid',
            'real_provider_timeout',
            'real_provider_cleanup_unverified',
          ].includes(attempt.terminal_reason_code ?? '')
          : (
            attempt.terminal_reason_code === 'simulation_failed'
            || attempt.terminal_reason_code === 'provider_response_invalid'
          )) && attempt.terminal_at !== null
        : attempt.terminal_reason_code === null && attempt.terminal_at === null;
  if (!valid) {
    throw constraint(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Attempt lifecycle state, terminal reason, and terminal timestamp are not an exact pair.',
    );
  }
}

export function assertAttemptEventStatePair(
  event: ExperimentFoundationExecutionAttemptEventV2Record,
): void {
  const collectionEvent = event.event_type === 'collection_prepared'
    || event.event_type === 'collection_collected'
    || event.event_type === 'collection_failed';
  let valid: boolean;
  if (event.event_type === 'created') {
    valid = event.prior_state === null && event.next_state === 'prepared';
  } else if (collectionEvent) {
    valid = event.prior_state === 'succeeded' && event.next_state === 'succeeded';
  } else {
    valid = event.prior_state !== null
      && event.event_type === event.next_state
      && validAttemptTransition(event.prior_state, event.next_state);
  }
  if (!valid) {
    throw constraint(
      'PROVIDER_RESPONSE_INVALID',
      'AttemptEvent type, prior state, and next state are not an exact transition.',
    );
  }
}

export function assertCommandOutcomeTransition(
  command: ExperimentFoundationProviderCommandV2Record,
  current: ExperimentFoundationExecutionAttemptV2Record,
  next: ExperimentFoundationExecutionAttemptV2Record,
  terminalErrorCode?: string,
): void {
  const failed = next.lifecycle_state === 'failed';
  const expectedState = command.operation === 'submit'
    ? 'submitted'
    : command.operation === 'sync'
      ? 'running'
      : command.operation === 'cancel'
        ? 'cancelled'
        : null;
  if (
    command.execution_attempt_id !== current.id
    || command.payload_hash !== current.provider_payload_hash
    || command.operation === 'collect'
    || failed !== Boolean(terminalErrorCode)
    || (!failed && next.lifecycle_state !== expectedState)
  ) {
    throw constraint(
      'EXECUTION_ATTEMPT_STATE_CONFLICT',
      'Provider command operation does not match its Attempt transition.',
    );
  }
}

export function sameControlCommandIntent(
  existing: ExperimentFoundationProviderCommandV2Record,
  incoming: ExperimentFoundationProviderCommandV2Record,
): boolean {
  return isDeepStrictEqual(
    controlCommandIntent(existing),
    controlCommandIntent(incoming),
  );
}

export function assertCollectionPreparationShape(
  current: ExperimentFoundationExecutionAttemptV2Record,
  reconcileCommand: ExperimentFoundationProviderCommandV2Record,
  input: ExperimentFoundationExecutionV2PrepareCollectionInput,
): void {
  if (
    reconcileCommand.operation !== 'reconcile'
    || reconcileCommand.execution_attempt_id !== current.id
    || reconcileCommand.payload_hash !== current.provider_payload_hash
    || !sameExternalJobRef(reconcileCommand, current)
    || input.next_attempt.lifecycle_state !== 'succeeded'
    || input.succeeded_event.event_type !== 'succeeded'
    || input.succeeded_event.provider_command_id !== reconcileCommand.id
    || input.collection.execution_attempt_id !== current.id
    || input.collection.collection_state !== 'prepared'
    || input.collection.state_version !== 0
    || input.collection.provider_payload_id !== current.provider_payload_id
    || input.collection.provider_payload_hash !== current.provider_payload_hash
    || !sameExternalJobRef(input.collection, input.next_attempt)
    || input.collection_prepared_event.execution_attempt_id !== current.id
    || input.collection_prepared_event.event_type !== 'collection_prepared'
    || input.collection_prepared_event.prior_state !== 'succeeded'
    || input.collection_prepared_event.next_state !== 'succeeded'
    || input.collect_command.operation !== 'collect'
    || input.collect_command.state !== 'pending'
    || input.collect_command.execution_attempt_id !== current.id
    || input.collect_command.collection_attempt_id !== input.collection.id
    || input.collect_command.payload_hash !== current.provider_payload_hash
    || !sameExternalJobRef(input.collect_command, input.next_attempt)
  ) {
    throw constraint(
      'COLLECTION_ATTEMPT_CONFLICT',
      'Atomic reconcile/collection records are not exact.',
    );
  }
}

export function assertCollectionCompletionShape(
  collection: ExperimentFoundationCollectionAttemptV2Record,
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  collectCommand: ExperimentFoundationProviderCommandV2Record,
  input: ExperimentFoundationExecutionV2CommitCollectionInput,
): void {
  const failed = input.next_collection.collection_state === 'failed';
  if (
    collectCommand.operation !== 'collect'
    || collectCommand.collection_attempt_id !== collection.id
    || collectCommand.execution_attempt_id !== collection.execution_attempt_id
    || collectCommand.payload_hash !== attempt.provider_payload_hash
    || !sameExternalJobRef(collectCommand, attempt)
    || collection.state_version !== input.expected_collection_state_version
    || input.next_collection.id !== collection.id
    || input.next_collection.state_version !== collection.state_version + 1
    || !sameCollectionImmutableScope(collection, input.next_collection)
    || (!failed && input.next_collection.collection_state !== 'collected')
    || failed !== Boolean(input.command_terminal_error_code)
    || (failed && input.provisional_outputs.length > 0)
    || input.provisional_outputs.some((output) => output.collection_attempt_id !== collection.id)
    || input.event.execution_attempt_id !== collection.execution_attempt_id
    || input.event.event_type !== (failed ? 'collection_failed' : 'collection_collected')
    || input.event.provider_command_id !== collectCommand.id
    || input.event.prior_state !== 'succeeded'
    || input.event.next_state !== 'succeeded'
    || input.event.payload_hash !== attempt.provider_payload_hash
    || !sameExternalJobRef(input.event, attempt)
  ) {
    throw constraint('COLLECTION_ATTEMPT_CONFLICT', 'Collection completion scope drifted.');
  }
  assertExactProvisionalOutputs(collection.id, !failed, input.provisional_outputs);
}

function assertExactProvisionalOutputs(
  collectionId: string,
  collected: boolean,
  outputs: ExperimentFoundationProvisionalOutputV2Record[],
): void {
  const ordinals = new Set<number>();
  const kinds = new Set<string>();
  const hashes = new Set<string>();
  if ((collected && outputs.length === 0) || (!collected && outputs.length > 0)) {
    throw constraint(
      'COLLECTION_ATTEMPT_CONFLICT',
      'Collected completion requires diagnostic outputs and failed completion forbids them.',
    );
  }
  for (const [index, output] of outputs.entries()) {
    if (
      output.collection_attempt_id !== collectionId
      || output.ordinal !== index + 1
      || output.output_class !== 'diagnostic_only'
      || ordinals.has(output.ordinal)
      || kinds.has(output.output_kind)
      || hashes.has(output.output_hash)
    ) {
      throw constraint(
        'COLLECTION_ATTEMPT_CONFLICT',
        'Provisional output manifest set is not exact, ordered, or diagnostic-only.',
      );
    }
    ordinals.add(output.ordinal);
    kinds.add(output.output_kind);
    hashes.add(output.output_hash);
  }
}

function validAttemptTransition(
  prior: ExperimentFoundationExecutionAttemptStateV2,
  next: ExperimentFoundationExecutionAttemptStateV2,
): boolean {
  if (prior === next) return prior === 'submitted' || prior === 'running';
  if (prior === 'prepared') return ['submitted', 'failed', 'cancelled'].includes(next);
  if (prior === 'submitted') {
    return ['running', 'succeeded', 'failed', 'cancelled'].includes(next);
  }
  if (prior === 'running') return ['succeeded', 'failed', 'cancelled'].includes(next);
  return false;
}

function controlCommandIntent(command: ExperimentFoundationProviderCommandV2Record) {
  return {
    execution_attempt_id: command.execution_attempt_id,
    collection_attempt_id: command.collection_attempt_id,
    operation: command.operation,
    command_snapshot: command.command_snapshot,
    command_hash: command.command_hash,
    provider_idempotency_key: command.provider_idempotency_key,
    payload_hash: command.payload_hash,
    external_job_ref: command.external_job_ref,
    external_job_ref_hash: command.external_job_ref_hash,
    external_job_ref_type: command.external_job_ref_type ?? null,
    external_job_ref_region_hash: command.external_job_ref_region_hash ?? null,
  };
}

function sameAttemptImmutableScope(
  current: ExperimentFoundationExecutionAttemptV2Record,
  next: ExperimentFoundationExecutionAttemptV2Record,
): boolean {
  return isDeepStrictEqual(attemptImmutableScope(current), attemptImmutableScope(next));
}

function attemptImmutableScope(record: ExperimentFoundationExecutionAttemptV2Record) {
  const {
    lifecycle_state: _lifecycleState,
    state_version: _stateVersion,
    external_job_ref: _externalJobRef,
    external_job_ref_hash: _externalJobRefHash,
    external_job_ref_type: _externalJobRefType,
    external_job_ref_region_hash: _externalJobRefRegionHash,
    terminal_reason_code: _terminalReasonCode,
    updated_at: _updatedAt,
    terminal_at: _terminalAt,
    ...scope
  } = record;
  return scope;
}

function sameExternalJobRef(
  left: {
    external_job_ref: string | null;
    external_job_ref_hash: string | null;
    external_job_ref_type?: 'fake_aliyun_pai_dlc_job' | 'aliyun_pai_dlc_job' | null;
    external_job_ref_region_hash?: string | null;
  },
  right: {
    external_job_ref: string | null;
    external_job_ref_hash: string | null;
    external_job_ref_type?: 'fake_aliyun_pai_dlc_job' | 'aliyun_pai_dlc_job' | null;
    external_job_ref_region_hash?: string | null;
  },
): boolean {
  return left.external_job_ref === right.external_job_ref
    && left.external_job_ref_hash === right.external_job_ref_hash
    && (left.external_job_ref_type ?? null) === (right.external_job_ref_type ?? null)
    && (left.external_job_ref_region_hash ?? null)
      === (right.external_job_ref_region_hash ?? null);
}

function sameCollectionImmutableScope(
  current: ExperimentFoundationCollectionAttemptV2Record,
  next: ExperimentFoundationCollectionAttemptV2Record,
): boolean {
  const mutableKeys = new Set(['collection_state', 'state_version', 'updated_at', 'terminal_at']);
  return isDeepStrictEqual(
    Object.fromEntries(Object.entries(current).filter(([key]) => !mutableKeys.has(key))),
    Object.fromEntries(Object.entries(next).filter(([key]) => !mutableKeys.has(key))),
  );
}

function constraint(
  reasonCode: ConstructorParameters<typeof ExperimentFoundationExecutionV2ConstraintError>[0],
  message: string,
) {
  return new ExperimentFoundationExecutionV2ConstraintError(reasonCode, message);
}

function indexUnique<T>(
  records: readonly T[],
  keyOf: (record: T) => string,
  label: string,
): Map<string, T> {
  const index = new Map<string, T>();
  for (const record of records) {
    const key = keyOf(record);
    if (index.has(key)) {
      throw constraint(
        'EXECUTION_SCOPE_DRIFT',
        `E1 contains a duplicate ${label} binding: ${key}`,
      );
    }
    index.set(key, record);
  }
  return index;
}
