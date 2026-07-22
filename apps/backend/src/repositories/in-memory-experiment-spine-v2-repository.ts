import type {
  ExperimentFoundationIntegrationInboxV2,
  ExperimentFoundationIntegrationOutboxV2,
  ExperimentV2IntegrationEvent,
  PaperImplementationExperimentIntegrationInboxV2,
  PaperImplementationExperimentIntegrationOutboxV2,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
  BranchHeadAdvancedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_INT32_MAX } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import {
  ExperimentSpineV2RepositoryConstraintError,
  deriveExperimentFoundationV2MaterializationReadinessGuard,
  type ExperimentFoundationExperimentSpineV2Repository,
  type ExperimentFoundationV2MaterializationReadinessGuard,
  type ExperimentFoundationV2MaterializationBundle,
  type ExperimentV2RelayClaim,
  type ExperimentV2RelayClaimInput,
  type ExperimentV2RelayReleaseInput,
  type ExperimentV2RelayTerminalInput,
  type PaperImplementationExperimentSpineV2Repository,
  type PaperImplementationExperimentV2AdmissionBundle,
  type PaperImplementationExperimentV2CommitAdmissionInput,
  type PaperImplementationExperimentV2CommitHeadInput,
  type PaperImplementationInboxSourceEventV2,
} from './experiment-spine-v2.repository.js';
import {
  decomposeExperimentV2Event,
  reconstructExperimentV2Event,
  StoredExperimentV2EventIntegrityError,
  type StoredExperimentV2EventColumns,
} from './experiment-v2-stored-integration-event.js';

type PiFaultOperation =
  | 'commitAdmission'
  | 'recordInboxOutcome'
  | 'commitHeadAdvance'
  | 'claimOutbox'
  | 'markOutboxDelivered'
  | 'markOutboxTerminal'
  | 'releaseOutbox';
type EfFaultOperation =
  | 'commitMaterialization'
  | 'commitAcknowledgement'
  | 'claimOutbox'
  | 'markOutboxDelivered'
  | 'markOutboxTerminal'
  | 'releaseOutbox';

type RelayStatus = 'pending' | 'leased' | 'retry' | 'delivered' | 'terminal';

type IntegrationOutbox =
  | PaperImplementationExperimentIntegrationOutboxV2
  | ExperimentFoundationIntegrationOutboxV2;

interface RelayRecord<TOutbox extends IntegrationOutbox> {
  outbox: Omit<TOutbox, 'event'>;
  stored_event: StoredExperimentV2EventColumns;
  status: RelayStatus;
  relay_attempt_count: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  next_attempt_at: string | null;
  delivered_at: string | null;
  last_error_code: string | null;
}

interface PiState {
  branchesByKey: Map<string, string>;
  branchesById: Map<string, PaperImplementationExperimentV2AdmissionBundle['branch']>;
  bundlesByRevision: Map<string, PaperImplementationExperimentV2AdmissionBundle>;
  admissionByBusiness: Map<string, string>;
  revisionBySequence: Map<string, string>;
  revisionByContent: Map<string, string>;
  admissionsByRevision: Map<string, string>;
  inboxesByEvent: Map<string, PaperImplementationExperimentIntegrationInboxV2>;
  inboxesByBusiness: Map<string, PaperImplementationExperimentIntegrationInboxV2>;
  inboxSourceEvents: Map<string, StoredExperimentV2EventColumns>;
  outboxes: Map<string, RelayRecord<PaperImplementationExperimentIntegrationOutboxV2>>;
  outboxByEvent: Map<string, string>;
  outboxByTransition: Map<string, string>;
}

interface EfState {
  materializationsByRevision: Map<string, ExperimentFoundationV2MaterializationBundle>;
  materializationByKey: Map<string, string>;
  runById: Map<string, string>;
  inboxesByEvent: Map<string, ExperimentFoundationIntegrationInboxV2>;
  inboxesByBusiness: Map<string, ExperimentFoundationIntegrationInboxV2>;
  outboxes: Map<string, RelayRecord<ExperimentFoundationIntegrationOutboxV2>>;
  outboxByEvent: Map<string, string>;
  outboxByTransition: Map<string, string>;
}

export interface InMemoryExperimentFoundationExperimentSpineV2RepositoryOptions {
  /** Test-only live-state fence invoked inside the fake's atomic commit boundary. */
  assertMaterializationReadinessCurrent?: (
    guard: ExperimentFoundationV2MaterializationReadinessGuard,
  ) => void | Promise<void>;
  initial_outboxes?: readonly ExperimentFoundationIntegrationOutboxV2[];
}

export interface InMemoryPaperImplementationExperimentSpineV2RepositoryOptions {
  initial_outboxes?: readonly PaperImplementationExperimentIntegrationOutboxV2[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source.entries()].map(([key, value]) => [key, clone(value)]));
}

function emptyPiState(): PiState {
  return {
    branchesByKey: new Map(),
    branchesById: new Map(),
    bundlesByRevision: new Map(),
    admissionByBusiness: new Map(),
    revisionBySequence: new Map(),
    revisionByContent: new Map(),
    admissionsByRevision: new Map(),
    inboxesByEvent: new Map(),
    inboxesByBusiness: new Map(),
    inboxSourceEvents: new Map(),
    outboxes: new Map(),
    outboxByEvent: new Map(),
    outboxByTransition: new Map(),
  };
}

function clonePiState(source: PiState): PiState {
  return {
    branchesByKey: new Map(source.branchesByKey),
    branchesById: cloneMap(source.branchesById),
    bundlesByRevision: cloneMap(source.bundlesByRevision),
    admissionByBusiness: new Map(source.admissionByBusiness),
    revisionBySequence: new Map(source.revisionBySequence),
    revisionByContent: new Map(source.revisionByContent),
    admissionsByRevision: new Map(source.admissionsByRevision),
    inboxesByEvent: cloneMap(source.inboxesByEvent),
    inboxesByBusiness: cloneMap(source.inboxesByBusiness),
    inboxSourceEvents: cloneMap(source.inboxSourceEvents),
    outboxes: cloneMap(source.outboxes),
    outboxByEvent: new Map(source.outboxByEvent),
    outboxByTransition: new Map(source.outboxByTransition),
  };
}

function emptyEfState(): EfState {
  return {
    materializationsByRevision: new Map(),
    materializationByKey: new Map(),
    runById: new Map(),
    inboxesByEvent: new Map(),
    inboxesByBusiness: new Map(),
    outboxes: new Map(),
    outboxByEvent: new Map(),
    outboxByTransition: new Map(),
  };
}

function cloneEfState(source: EfState): EfState {
  return {
    materializationsByRevision: cloneMap(source.materializationsByRevision),
    materializationByKey: new Map(source.materializationByKey),
    runById: new Map(source.runById),
    inboxesByEvent: cloneMap(source.inboxesByEvent),
    inboxesByBusiness: cloneMap(source.inboxesByBusiness),
    outboxes: cloneMap(source.outboxes),
    outboxByEvent: new Map(source.outboxByEvent),
    outboxByTransition: new Map(source.outboxByTransition),
  };
}

function branchKey(projectId: string, cycleId: string, key: string): string {
  return `${projectId}\u0000${cycleId}\u0000${key}`;
}

function admissionBusinessKey(branchId: string, businessKey: string): string {
  return `${branchId}\u0000${businessKey}`;
}

function revisionSequenceKey(branchId: string, sequence: number): string {
  return `${branchId}\u0000${sequence}`;
}

function revisionContentKey(branchId: string, contentHash: string): string {
  return `${branchId}\u0000${contentHash}`;
}

function inboxEventKey(consumer: string, eventId: string): string {
  return `${consumer}\u0000${eventId}`;
}

function inboxBusinessKey(
  consumer: string,
  projectId: string,
  cycleId: string,
  branchId: string,
  businessKey: string,
): string {
  return `${consumer}\u0000${projectId}\u0000${cycleId}\u0000${branchId}\u0000${businessKey}`;
}

function transitionKey(outbox: { aggregate_transition_key: string }): string {
  return outbox.aggregate_transition_key;
}

function exactPayloadOrConflict<TInbox extends { source_event_hash: string }>(
  existing: TInbox,
  incomingEventHash: string,
): TInbox {
  if (existing.source_event_hash !== incomingEventHash) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Integration event identity was reused with a changed payload.',
    );
  }
  return clone(existing);
}

function initialRelayRecord<TOutbox extends IntegrationOutbox>(
  outbox: TOutbox,
): RelayRecord<TOutbox> {
  const { event, ...metadata } = outbox;
  return {
    outbox: clone(metadata),
    stored_event: decomposeEventOrConflict(event),
    status: 'pending',
    relay_attempt_count: 0,
    lease_owner: null,
    lease_expires_at: null,
    next_attempt_at: null,
    delivered_at: null,
    last_error_code: null,
  };
}

function compareIso(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRelayReady<TOutbox extends IntegrationOutbox>(
  record: RelayRecord<TOutbox>,
  claimedAt: string,
): boolean {
  if (!canAdvanceRelayAttemptCount(record.relay_attempt_count)) {
    return false;
  }
  if (record.status === 'delivered' || record.status === 'terminal') {
    return false;
  }
  if (
    record.status === 'leased'
    && record.lease_expires_at
    && compareIso(record.lease_expires_at, claimedAt) > 0
  ) {
    return false;
  }
  return !record.next_attempt_at || compareIso(record.next_attempt_at, claimedAt) <= 0;
}

function canAdvanceRelayAttemptCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < EXPERIMENT_V2_INT32_MAX;
}

function nextRelayAttemptCount(value: number): number {
  if (!canAdvanceRelayAttemptCount(value)) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'OUTBOX_LEASE_CONFLICT',
      'Relay attempt count cannot advance within the PostgreSQL Int32 range.',
    );
  }
  return value + 1;
}

function relayRecordSnapshot<TOutbox extends IntegrationOutbox>(
  record: RelayRecord<TOutbox>,
) {
  const { stored_event: storedEvent, ...relay } = record;
  return {
    ...clone(relay),
    outbox: {
      ...clone(record.outbox),
      event: reconstructEventOrConflict(storedEvent),
    } as TOutbox,
  };
}

function decomposeEventOrConflict(
  event: ExperimentV2IntegrationEvent,
): StoredExperimentV2EventColumns {
  try {
    return decomposeExperimentV2Event(event);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
}

function reconstructEventOrConflict(
  stored: StoredExperimentV2EventColumns,
): ExperimentV2IntegrationEvent {
  try {
    return reconstructExperimentV2Event(stored);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
}

function sameSemanticJson(left: unknown, right: unknown): boolean {
  return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
}

function runEventScope(event: ExperimentV2IntegrationEvent) {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
  };
}

function assertInMemoryProcessedHeadSourceAuthority(
  state: PiState,
  branch: PaperImplementationExperimentV2AdmissionBundle['branch'],
  sourceEvent: RunManifestFrozenEventV1,
): void {
  if (
    branch.branch_id !== sourceEvent.branch_id
    || branch.implementation_project_id !== sourceEvent.implementation_project_id
    || branch.validation_cycle_id !== sourceEvent.validation_cycle_id
    || branch.branch_key !== sourceEvent.branch_key
    || branch.current_admitted_revision_sequence === null
    || branch.current_admitted_revision_sequence < sourceEvent.branch_revision_sequence
    || (
      branch.current_admitted_revision_sequence === sourceEvent.branch_revision_sequence
      && branch.current_admitted_revision_id !== sourceEvent.work_order_revision_id
    )
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head source no longer matches its branch lineage.',
    );
  }

  const bundle = state.bundlesByRevision.get(sourceEvent.work_order_revision_id);
  if (!bundle) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head source revision authority is missing.',
    );
  }
  assertInMemoryAdmissionAuthority(
    state,
    branch,
    bundle,
    sourceEvent.payload.source_event_id,
  );
  if (
    bundle.revision.revision_sequence !== sourceEvent.branch_revision_sequence
    || bundle.revision.content_hash !== sourceEvent.work_order_revision_hash
    || bundle.revision.cell_plan_hash !== sourceEvent.cell_plan_hash
    || bundle.revision.approved_plan_hash !== sourceEvent.approved_plan_hash
    || sourceEvent.payload.task_spec_bindings.length !== bundle.cells.length
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head source no longer matches its exact admitted revision.',
    );
  }

  let bindingDrift = false;
  const manifestRows = bundle.cells.map((cell, index) => {
    const binding = sourceEvent.payload.task_spec_bindings[index];
    if (
      !binding
      || binding.ordinal !== cell.ordinal
      || binding.work_order_cell_id !== cell.work_order_cell_id
      || binding.cell_key !== cell.cell_key
      || binding.cell_hash !== cell.cell_hash
    ) {
      bindingDrift = true;
    }
    return {
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      external_pi_cell_id: cell.work_order_cell_id,
      external_pi_cell_hash: cell.cell_hash,
      training_task_spec_id: binding?.training_task_spec_id ?? 'missing',
      training_task_spec_hash: binding?.training_task_spec_hash ?? 'missing',
      seed: cell.seed,
      repeat_index: cell.repeat_index,
    };
  });
  if (bindingDrift) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'RUN_CELL_PARITY_MISMATCH',
      'Processed PI head source no longer matches its exact ordered cells.',
    );
  }
  if (
    serverHashExperimentFoundationV2RunManifest(manifestRows)
      !== sourceEvent.payload.run_manifest_hash
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'RUN_MANIFEST_CONFLICT',
      'Processed PI head source Run manifest no longer matches its exact ordered cells.',
    );
  }
}

function assertInMemoryAdmissionAuthority(
  state: PiState,
  branch: PaperImplementationExperimentV2AdmissionBundle['branch'],
  bundle: PaperImplementationExperimentV2AdmissionBundle,
  expectedAdmissionEventId: string,
): void {
  const { revision, admission } = bundle;
  const cells = [...bundle.cells].sort((left, right) => left.ordinal - right.ordinal);
  if (
    serverHashPaperImplementationExperimentV2BranchFrame(branch.branch_frame)
      !== branch.branch_frame_hash
    || revision.branch_id !== branch.branch_id
    || serverHashPaperImplementationExperimentV2WorkOrderRevision(revision.work_order_revision)
      !== revision.content_hash
    || cells.length === 0
    || cells.some((cell, index) => (
      cell.work_order_revision_id !== revision.work_order_revision_id
      || cell.ordinal !== index + 1
      || serverHashPaperImplementationExperimentV2Cell({
        cell_key: cell.cell_key,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      }) !== cell.cell_hash
    ))
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head admission snapshot authority drifted.',
    );
  }

  const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(cells);
  const approvedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: branch.branch_frame_hash,
    work_order_revision_hash: revision.content_hash,
    cell_plan_hash: cellPlanHash,
  });
  if (
    revision.cell_plan_hash !== cellPlanHash
    || revision.approved_plan_hash !== approvedPlanHash
    || admission.work_order_revision_id !== revision.work_order_revision_id
    || admission.approved_plan_hash !== approvedPlanHash
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head admission plan authority drifted.',
    );
  }

  const admissionOutboxId = state.outboxByEvent.get(expectedAdmissionEventId);
  const admissionRecord = admissionOutboxId
    ? state.outboxes.get(admissionOutboxId)
    : undefined;
  const admissionEvent = admissionRecord
    ? reconstructEventOrConflict(admissionRecord.stored_event)
    : null;
  if (
    !admissionEvent
    || admissionEvent.event_type !== 'WorkOrderRevisionAdmitted'
    || admissionEvent.event_id !== expectedAdmissionEventId
    || bundle.outbox.outbox_id !== admissionOutboxId
    || bundle.outbox.aggregate_transition_key !== admissionRecord?.outbox.aggregate_transition_key
    || serverHashExperimentV2EventEnvelope(bundle.outbox.event)
      !== serverHashExperimentV2EventEnvelope(admissionEvent)
    || admissionEvent.business_idempotency_key !== admission.business_idempotency_key
    || admissionEvent.implementation_project_id !== branch.implementation_project_id
    || admissionEvent.validation_cycle_id !== branch.validation_cycle_id
    || admissionEvent.branch_id !== branch.branch_id
    || admissionEvent.branch_key !== branch.branch_key
    || admissionEvent.work_order_revision_id !== revision.work_order_revision_id
    || admissionEvent.work_order_revision_hash !== revision.content_hash
    || admissionEvent.branch_revision_sequence !== revision.revision_sequence
    || admissionEvent.cell_plan_hash !== revision.cell_plan_hash
    || admissionEvent.approved_plan_hash !== revision.approved_plan_hash
    || !sameSemanticJson(admissionEvent.payload, {
      admission_id: admission.admission_id,
      branch_frame_hash: branch.branch_frame_hash,
      work_order_revision: revision.work_order_revision,
      readiness_attestation_id: revision.work_order_revision.readiness_attestation_id,
      readiness_attestation_hash: revision.work_order_revision.readiness_attestation_hash,
      asset_dependencies: revision.work_order_revision.asset_dependencies,
      exact_cells: cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      })),
    })
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Processed PI head admission outbox authority drifted.',
    );
  }
}

function assertInMemoryHeadAdvanceOutbox(
  state: PiState,
  sourceEvent: RunManifestFrozenEventV1,
): void {
  const expectedTransition = `${sourceEvent.branch_id}:revision:${sourceEvent.branch_revision_sequence}:head`;
  const outboxId = state.outboxByTransition.get(expectedTransition);
  const record = outboxId ? state.outboxes.get(outboxId) : undefined;
  const event = record ? reconstructEventOrConflict(record.stored_event) : null;
  if (
    !event
    || event.event_type !== 'BranchHeadAdvanced'
    || event.causation_id !== sourceEvent.event_id
    || event.correlation_id !== sourceEvent.correlation_id
    || event.business_idempotency_key !== sourceEvent.business_idempotency_key
    || event.implementation_project_id !== sourceEvent.implementation_project_id
    || event.validation_cycle_id !== sourceEvent.validation_cycle_id
    || event.branch_id !== sourceEvent.branch_id
    || event.branch_key !== sourceEvent.branch_key
    || event.work_order_revision_id !== sourceEvent.work_order_revision_id
    || event.work_order_revision_hash !== sourceEvent.work_order_revision_hash
    || event.branch_revision_sequence !== sourceEvent.branch_revision_sequence
    || event.cell_plan_hash !== sourceEvent.cell_plan_hash
    || event.approved_plan_hash !== sourceEvent.approved_plan_hash
    || event.payload.source_event_id !== sourceEvent.event_id
    || event.payload.run_id !== sourceEvent.payload.run_id
    || event.payload.run_manifest_hash !== sourceEvent.payload.run_manifest_hash
    || event.payload.accepted_revision_sequence !== sourceEvent.branch_revision_sequence
    || !Number.isInteger(event.payload.branch_state_version)
    || event.payload.branch_state_version < 1
    || event.payload.branch_state_version > EXPERIMENT_V2_INT32_MAX
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Processed PI BranchHeadAdvanced outbox authority drifted.',
    );
  }
}

function verifyInMemoryProcessedHeadReplayState(
  state: PiState,
  consumerName: string,
  sourceEvent: RunManifestFrozenEventV1,
): PaperImplementationExperimentV2AdmissionBundle['branch'] {
  const sourceKey = inboxEventKey(consumerName, sourceEvent.event_id);
  const inbox = state.inboxesByEvent.get(sourceKey);
  const storedSource = state.inboxSourceEvents.get(sourceKey);
  if (!inbox || inbox.outcome !== 'processed' || !storedSource) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head receipt is missing during replay.',
    );
  }
  const reconstructedSource = reconstructEventOrConflict(storedSource);
  if (
    reconstructedSource.event_type !== 'RunManifestFrozen'
    || inbox.source_event_id !== sourceEvent.event_id
    || inbox.business_idempotency_key !== sourceEvent.business_idempotency_key
    || inbox.payload_hash !== sourceEvent.payload_hash
    || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(sourceEvent)
    || !sameSemanticJson(inbox.scope, runEventScope(sourceEvent))
    || serverHashExperimentV2EventEnvelope(reconstructedSource)
      !== serverHashExperimentV2EventEnvelope(sourceEvent)
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'Processed PI head receipt no longer binds its exact source event.',
    );
  }

  const branch = state.branchesById.get(sourceEvent.branch_id);
  if (!branch) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head branch is missing during replay.',
    );
  }
  assertInMemoryProcessedHeadSourceAuthority(state, branch, sourceEvent);
  assertInMemoryHeadAdvanceOutbox(state, sourceEvent);

  if (branch.head_source_event_id === sourceEvent.event_id) {
    if (
      branch.head_run_id !== sourceEvent.payload.run_id
      || branch.head_run_manifest_hash !== sourceEvent.payload.run_manifest_hash
    ) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'BRANCH_HEAD_SCOPE_CONFLICT',
        'Processed PI head replay no longer matches the current branch head.',
      );
    }
    return branch;
  }

  if (!branch.head_source_event_id) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Processed PI head replay has no durable current head event.',
    );
  }
  const laterKey = inboxEventKey(consumerName, branch.head_source_event_id);
  const laterInbox = state.inboxesByEvent.get(laterKey);
  const storedLaterSource = state.inboxSourceEvents.get(laterKey);
  if (!laterInbox || laterInbox.outcome !== 'processed' || !storedLaterSource) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Later processed PI head receipt is missing during replay.',
    );
  }
  const laterSource = reconstructEventOrConflict(storedLaterSource);
  if (
    laterSource.event_type !== 'RunManifestFrozen'
    || laterInbox.source_event_id !== laterSource.event_id
    || laterInbox.business_idempotency_key !== laterSource.business_idempotency_key
    || laterInbox.payload_hash !== laterSource.payload_hash
    || laterInbox.source_event_hash !== serverHashExperimentV2EventEnvelope(laterSource)
    || !sameSemanticJson(laterInbox.scope, runEventScope(laterSource))
    || laterSource.branch_id !== branch.branch_id
    || laterSource.branch_revision_sequence <= sourceEvent.branch_revision_sequence
    || branch.head_run_id !== laterSource.payload.run_id
    || branch.head_run_manifest_hash !== laterSource.payload.run_manifest_hash
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Later processed PI head receipt no longer matches the current branch head.',
    );
  }
  assertInMemoryProcessedHeadSourceAuthority(state, branch, laterSource);
  assertInMemoryHeadAdvanceOutbox(state, laterSource);
  return branch;
}

/**
 * Injection-only PI fake. Every authoritative commit mutates a private copy
 * and publishes it only after all invariant checks and injected faults pass.
 */
export class InMemoryPaperImplementationExperimentSpineV2Repository
implements PaperImplementationExperimentSpineV2Repository {
  private state = emptyPiState();
  private transactionTail: Promise<void> = Promise.resolve();
  private readonly faults = new Map<PiFaultOperation, Error[]>();

  constructor(
    options: InMemoryPaperImplementationExperimentSpineV2RepositoryOptions = {},
  ) {
    for (const outbox of options.initial_outboxes ?? []) {
      this.insertPiOutbox(this.state, outbox);
    }
  }

  failNext(operation: PiFaultOperation, error = new Error(`INJECTED_${operation}`)): void {
    const queued = this.faults.get(operation) ?? [];
    queued.push(error);
    this.faults.set(operation, queued);
  }

  snapshot() {
    return {
      branches: [...this.state.branchesById.values()].map(clone),
      admission_bundles: [...this.state.bundlesByRevision.values()].map((bundle) =>
        this.withCurrentBranch(bundle)),
      inboxes: [...this.state.inboxesByEvent.values()].map(clone),
      outboxes: [...this.state.outboxes.values()].map(relayRecordSnapshot),
    };
  }

  async findBranch(implementationProjectId: string, validationCycleId: string, key: string) {
    const id = this.state.branchesByKey.get(branchKey(implementationProjectId, validationCycleId, key));
    return id ? clone(this.state.branchesById.get(id) ?? null) : null;
  }

  async findAdmissionByBusinessKey(branchId: string, businessIdempotencyKey: string) {
    const revisionId = this.state.admissionByBusiness.get(
      admissionBusinessKey(branchId, businessIdempotencyKey),
    );
    if (!revisionId) {
      return null;
    }
    const bundle = this.state.bundlesByRevision.get(revisionId);
    return bundle ? this.withCurrentBranch(bundle) : null;
  }

  async findRevisionBundle(branchId: string, workOrderRevisionId: string) {
    const bundle = this.state.bundlesByRevision.get(workOrderRevisionId);
    return bundle?.revision.branch_id === branchId ? this.withCurrentBranch(bundle) : null;
  }

  async commitAdmission(input: PaperImplementationExperimentV2CommitAdmissionInput) {
    return this.transact('commitAdmission', (state) => {
      const scopeKey = branchKey(
        input.branch.implementation_project_id,
        input.branch.validation_cycle_id,
        input.branch.branch_key,
      );
      const existingBranchId = state.branchesByKey.get(scopeKey);
      const existingBranch = existingBranchId
        ? state.branchesById.get(existingBranchId)
        : undefined;
      const businessKey = admissionBusinessKey(
        existingBranch?.branch_id ?? input.branch.branch_id,
        input.admission.business_idempotency_key,
      );
      const replayRevisionId = state.admissionByBusiness.get(businessKey);
      if (replayRevisionId) {
        const replay = state.bundlesByRevision.get(replayRevisionId)!;
        if (
          replay.branch.implementation_project_id !== input.branch.implementation_project_id
          || replay.branch.validation_cycle_id !== input.branch.validation_cycle_id
          || replay.branch.branch_key !== input.branch.branch_key
          || replay.branch.branch_frame_hash !== input.branch.branch_frame_hash
          || replay.revision.revision_sequence !== input.revision.revision_sequence
          || replay.revision.content_hash !== input.revision.content_hash
          || replay.revision.cell_plan_hash !== input.revision.cell_plan_hash
          || replay.revision.approved_plan_hash !== input.revision.approved_plan_hash
          || replay.admission.approved_plan_hash !== input.admission.approved_plan_hash
          || replay.cells.length !== input.cells.length
          || replay.cells.some((cell, index) => {
            const candidate = input.cells[index];
            return !candidate
              || cell.ordinal !== candidate.ordinal
              || cell.cell_key !== candidate.cell_key
              || cell.cell_hash !== candidate.cell_hash;
          })
        ) {
          throw new ExperimentSpineV2RepositoryConstraintError(
            'ADMISSION_IDEMPOTENCY_CONFLICT',
            'Admission idempotency key was reused with changed content.',
          );
        }
        return this.withCurrentBranch(replay, state);
      }

      if (input.expected_branch_state_version === null) {
        if (existingBranch) {
          throw new ExperimentSpineV2RepositoryConstraintError(
            'BRANCH_CAS_CONFLICT',
            'Branch was created concurrently.',
          );
        }
      } else if (
        !existingBranch
        || existingBranch.branch_id !== input.branch.branch_id
        || existingBranch.state_version !== input.expected_branch_state_version
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_CAS_CONFLICT',
          'Branch current-revision CAS failed.',
        );
      }
      if (
        existingBranch
        && (
          existingBranch.implementation_project_id !== input.branch.implementation_project_id
          || existingBranch.validation_cycle_id !== input.branch.validation_cycle_id
          || existingBranch.branch_key !== input.branch.branch_key
          || existingBranch.branch_frame_hash !== input.branch.branch_frame_hash
        )
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_SCOPE_CONFLICT',
          'Branch immutable scope/frame changed.',
        );
      }
      if (!existingBranch && state.branchesById.has(input.branch.branch_id)) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_SCOPE_CONFLICT',
          'Branch id is already bound to another scope.',
        );
      }
      if (
        input.branch.state_version !== (input.expected_branch_state_version ?? 0) + 1
        || input.branch.current_admitted_revision_id !== input.revision.work_order_revision_id
        || input.branch.current_admitted_revision_sequence !== input.revision.revision_sequence
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_REVISION_CONFLICT',
          'Branch current revision does not match the admitted revision.',
        );
      }

      const sequenceKey = revisionSequenceKey(
        input.revision.branch_id,
        input.revision.revision_sequence,
      );
      const contentKey = revisionContentKey(input.revision.branch_id, input.revision.content_hash);
      if (
        state.bundlesByRevision.has(input.revision.work_order_revision_id)
        || state.revisionBySequence.has(sequenceKey)
        || state.revisionByContent.has(contentKey)
        || state.admissionsByRevision.has(input.revision.work_order_revision_id)
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_REVISION_CONFLICT',
          'WorkOrder revision uniqueness conflict.',
        );
      }
      if (
        input.cells.length === 0
        || input.cells.some((cell, index) => (
          cell.work_order_revision_id !== input.revision.work_order_revision_id
          || cell.ordinal !== index + 1
        ))
        || new Set(input.cells.map((cell) => cell.cell_key)).size !== input.cells.length
        || new Set(input.cells.map((cell) => cell.cell_hash)).size !== input.cells.length
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'RUN_CELL_PARITY_MISMATCH',
          'Revision cells must be a unique ordered 1..N list.',
        );
      }
      this.insertPiOutbox(state, input.outbox);

      const bundle: PaperImplementationExperimentV2AdmissionBundle = {
        branch: clone(input.branch),
        revision: clone(input.revision),
        cells: clone(input.cells),
        admission: clone(input.admission),
        outbox: clone(input.outbox),
      };
      state.branchesByKey.set(scopeKey, input.branch.branch_id);
      state.branchesById.set(input.branch.branch_id, clone(input.branch));
      state.bundlesByRevision.set(input.revision.work_order_revision_id, bundle);
      state.admissionByBusiness.set(businessKey, input.revision.work_order_revision_id);
      state.revisionBySequence.set(sequenceKey, input.revision.work_order_revision_id);
      state.revisionByContent.set(contentKey, input.revision.work_order_revision_id);
      state.admissionsByRevision.set(
        input.revision.work_order_revision_id,
        input.admission.admission_id,
      );
      return this.withCurrentBranch(bundle, state);
    });
  }

  async findInboxByEvent(consumerName: string, eventId: string) {
    return clone(this.state.inboxesByEvent.get(inboxEventKey(consumerName, eventId)) ?? null);
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ) {
    return clone(this.state.inboxesByBusiness.get(inboxBusinessKey(
      consumerName,
      implementationProjectId,
      validationCycleId,
      branchId,
      businessIdempotencyKey,
    )) ?? null);
  }

  async verifyProcessedHeadReplay(
    consumerName: string,
    sourceEvent: RunManifestFrozenEventV1,
  ) {
    return clone(verifyInMemoryProcessedHeadReplayState(this.state, consumerName, sourceEvent));
  }

  async recordInboxOutcome(
    inbox: PaperImplementationExperimentIntegrationInboxV2,
    sourceEvent: PaperImplementationInboxSourceEventV2,
  ) {
    return this.transact('recordInboxOutcome', (state) =>
      this.insertPiInbox(state, inbox, sourceEvent));
  }

  async commitHeadAdvance(
    input: PaperImplementationExperimentV2CommitHeadInput,
    sourceEvent: RunManifestFrozenEventV1,
  ) {
    return this.transact('commitHeadAdvance', (state) => {
      const eventKey = inboxEventKey(input.inbox.consumer_name, input.inbox.source_event_id);
      const replay = state.inboxesByEvent.get(eventKey);
      if (replay) {
        exactPayloadOrConflict(replay, input.inbox.source_event_hash);
        const currentBranch = verifyInMemoryProcessedHeadReplayState(
          state,
          input.inbox.consumer_name,
          sourceEvent,
        );
        return {
          ...clone(input),
          branch: clone(currentBranch),
          inbox: clone(replay),
        };
      }

      const current = state.branchesById.get(input.branch.branch_id);
      if (!current) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'INTEGRATION_PREREQUISITE_NOT_READY',
          'Head branch prerequisite is missing.',
        );
      }
      if (current.state_version !== input.expected_branch_state_version) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_HEAD_CAS_CONFLICT',
          'Branch-head state-version CAS failed.',
        );
      }
      if (
        input.branch.state_version !== current.state_version + 1
        || input.branch.current_admitted_revision_id !== sourceEvent.work_order_revision_id
        || input.branch.current_admitted_revision_sequence !== sourceEvent.branch_revision_sequence
        || input.branch.head_run_id !== sourceEvent.payload.run_id
        || input.branch.head_run_manifest_hash !== sourceEvent.payload.run_manifest_hash
        || input.branch.head_source_event_id !== sourceEvent.event_id
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'BRANCH_HEAD_SCOPE_CONFLICT',
          'Branch-head update does not match the source event.',
        );
      }
      const storedInbox = this.insertPiInbox(state, input.inbox, sourceEvent);
      this.insertPiOutbox(state, input.outbox);
      state.branchesById.set(input.branch.branch_id, clone(input.branch));
      return {
        ...clone(input),
        inbox: storedInbox,
      };
    });
  }

  async claimOutbox(input: ExperimentV2RelayClaimInput) {
    return this.transact('claimOutbox', (state) => {
      const ready = [...state.outboxes.entries()]
        .filter(([, record]) => isRelayReady(record, input.claimed_at))
        .sort(([, left], [, right]) => (
          left.outbox.created_at.localeCompare(right.outbox.created_at)
          || left.outbox.outbox_id.localeCompare(right.outbox.outbox_id)
        ))
        .slice(0, Math.max(0, input.limit));
      return ready.flatMap(([id, record]) => {
        record.status = 'leased';
        record.relay_attempt_count = nextRelayAttemptCount(record.relay_attempt_count);
        record.lease_owner = input.lease_owner;
        record.lease_expires_at = input.lease_expires_at;
        record.next_attempt_at = null;
        state.outboxes.set(id, record);
        let event: ExperimentV2IntegrationEvent;
        try {
          event = reconstructEventOrConflict(record.stored_event);
        } catch (error) {
          if (
            !(error instanceof ExperimentSpineV2RepositoryConstraintError)
            || error.reasonCode !== 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
          ) {
            throw error;
          }
          record.status = 'terminal';
          record.lease_owner = null;
          record.lease_expires_at = null;
          record.last_error_code = 'INTEGRATION_EVENT_PAYLOAD_CONFLICT';
          state.outboxes.set(id, record);
          return [];
        }
        return {
          owner_domain: 'PaperImplementation' as const,
          outbox_id: id,
          event,
          relay_attempt_count: record.relay_attempt_count,
          lease_owner: input.lease_owner,
          lease_expires_at: input.lease_expires_at,
        };
      });
    });
  }

  async markOutboxDelivered(outboxId: string, leaseOwner: string, deliveredAt: string) {
    await this.transact('markOutboxDelivered', (state) => {
      const record = this.requirePiLease(state, outboxId, leaseOwner);
      record.status = 'delivered';
      record.delivered_at = deliveredAt;
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = null;
      state.outboxes.set(outboxId, record);
    });
  }

  async markOutboxTerminal(input: ExperimentV2RelayTerminalInput) {
    await this.transact('markOutboxTerminal', (state) => {
      const record = this.requirePiLease(state, input.outbox_id, input.lease_owner);
      record.status = 'terminal';
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = null;
      record.last_error_code = input.error_code;
      state.outboxes.set(input.outbox_id, record);
    });
  }

  async releaseOutbox(input: ExperimentV2RelayReleaseInput) {
    await this.transact('releaseOutbox', (state) => {
      const record = this.requirePiLease(state, input.outbox_id, input.lease_owner);
      record.status = 'retry';
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = input.next_attempt_at;
      record.last_error_code = input.error_code;
      state.outboxes.set(input.outbox_id, record);
    });
  }

  private withCurrentBranch(
    bundle: PaperImplementationExperimentV2AdmissionBundle,
    state = this.state,
  ): PaperImplementationExperimentV2AdmissionBundle {
    return {
      ...clone(bundle),
      branch: clone(state.branchesById.get(bundle.branch.branch_id) ?? bundle.branch),
    };
  }

  private insertPiInbox(
    state: PiState,
    inbox: PaperImplementationExperimentIntegrationInboxV2,
    sourceEvent: PaperImplementationInboxSourceEventV2,
  ): PaperImplementationExperimentIntegrationInboxV2 {
    if (
      inbox.source_event_id !== sourceEvent.event_id
      || inbox.business_idempotency_key !== sourceEvent.business_idempotency_key
      || inbox.payload_hash !== sourceEvent.payload_hash
      || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(sourceEvent)
      || !sameSemanticJson(inbox.scope, runEventScope(sourceEvent))
    ) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'PI inbox does not bind the source event exactly.',
      );
    }
    const eventKey = inboxEventKey(inbox.consumer_name, inbox.source_event_id);
    const existingEvent = state.inboxesByEvent.get(eventKey);
    if (existingEvent) {
      const storedSource = state.inboxSourceEvents.get(eventKey);
      if (
        !storedSource
        || serverHashExperimentV2EventEnvelope(reconstructEventOrConflict(storedSource))
          !== inbox.source_event_hash
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
          'PI inbox source-event storage drifted from its receipt.',
        );
      }
      return exactPayloadOrConflict(existingEvent, inbox.source_event_hash);
    }
    const businessKey = inboxBusinessKey(
      inbox.consumer_name,
      inbox.scope.implementation_project_id,
      inbox.scope.validation_cycle_id,
      inbox.scope.branch_id,
      inbox.business_idempotency_key,
    );
    const existingBusiness = state.inboxesByBusiness.get(businessKey);
    if (existingBusiness) {
      return exactPayloadOrConflict(existingBusiness, inbox.source_event_hash);
    }
    state.inboxesByEvent.set(eventKey, clone(inbox));
    state.inboxesByBusiness.set(businessKey, clone(inbox));
    state.inboxSourceEvents.set(eventKey, decomposeEventOrConflict(sourceEvent));
    return clone(inbox);
  }

  private insertPiOutbox(
    state: PiState,
    outbox: PaperImplementationExperimentIntegrationOutboxV2,
  ): void {
    if (
      state.outboxes.has(outbox.outbox_id)
      || state.outboxByEvent.has(outbox.event.event_id)
      || state.outboxByTransition.has(transitionKey(outbox))
    ) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'PI outbox uniqueness conflict.',
      );
    }
    state.outboxes.set(outbox.outbox_id, initialRelayRecord(outbox));
    state.outboxByEvent.set(outbox.event.event_id, outbox.outbox_id);
    state.outboxByTransition.set(transitionKey(outbox), outbox.outbox_id);
  }

  private requirePiLease(state: PiState, outboxId: string, leaseOwner: string) {
    const record = state.outboxes.get(outboxId);
    if (!record || record.status !== 'leased' || record.lease_owner !== leaseOwner) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'OUTBOX_LEASE_CONFLICT',
        'PI outbox lease is not owned by this relay.',
      );
    }
    return record;
  }

  private async transact<T>(operation: PiFaultOperation, mutate: (state: PiState) => T | Promise<T>) {
    let release: () => void = () => undefined;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const working = clonePiState(this.state);
      const result = await mutate(working);
      this.throwInjected(operation);
      this.state = working;
      return clone(result);
    } finally {
      release();
    }
  }

  private throwInjected(operation: PiFaultOperation): void {
    const queued = this.faults.get(operation);
    const error = queued?.shift();
    if (queued?.length === 0) {
      this.faults.delete(operation);
    }
    if (error) {
      throw error;
    }
  }
}

/** EF-local injection fake; it never receives or mutates PI authority state. */
export class InMemoryExperimentFoundationExperimentSpineV2Repository
implements ExperimentFoundationExperimentSpineV2Repository {
  private state = emptyEfState();
  private transactionTail: Promise<void> = Promise.resolve();
  private readonly faults = new Map<EfFaultOperation, Error[]>();
  private readonly assertMaterializationReadinessCurrent: (
    guard: ExperimentFoundationV2MaterializationReadinessGuard,
  ) => void | Promise<void>;

  constructor(
    options: InMemoryExperimentFoundationExperimentSpineV2RepositoryOptions = {},
  ) {
    this.assertMaterializationReadinessCurrent =
      options.assertMaterializationReadinessCurrent ?? (() => undefined);
    for (const outbox of options.initial_outboxes ?? []) {
      this.insertEfOutbox(this.state, outbox);
    }
  }

  failNext(operation: EfFaultOperation, error = new Error(`INJECTED_${operation}`)): void {
    const queued = this.faults.get(operation) ?? [];
    queued.push(error);
    this.faults.set(operation, queued);
  }

  snapshot() {
    return {
      materializations: [...this.state.materializationsByRevision.values()].map(clone),
      inboxes: [...this.state.inboxesByEvent.values()].map(clone),
      outboxes: [...this.state.outboxes.values()].map(relayRecordSnapshot),
    };
  }

  async findInboxByEvent(consumerName: string, eventId: string) {
    return clone(this.state.inboxesByEvent.get(inboxEventKey(consumerName, eventId)) ?? null);
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ) {
    return clone(this.state.inboxesByBusiness.get(inboxBusinessKey(
      consumerName,
      implementationProjectId,
      validationCycleId,
      branchId,
      businessIdempotencyKey,
    )) ?? null);
  }

  async findMaterializationByRevision(workOrderRevisionId: string) {
    return clone(this.state.materializationsByRevision.get(workOrderRevisionId) ?? null);
  }

  async commitMaterialization(
    bundle: ExperimentFoundationV2MaterializationBundle,
    sourceEvent: WorkOrderRevisionAdmittedEventV1,
  ) {
    return this.transact('commitMaterialization', async (state) => {
      const eventKey = inboxEventKey(bundle.inbox.consumer_name, bundle.inbox.source_event_id);
      const replayInbox = state.inboxesByEvent.get(eventKey);
      if (replayInbox) {
        exactPayloadOrConflict(replayInbox, bundle.inbox.source_event_hash);
        const replay = state.materializationsByRevision.get(sourceEvent.work_order_revision_id);
        if (!replay) {
          throw new ExperimentSpineV2RepositoryConstraintError(
            'INTEGRATION_PREREQUISITE_NOT_READY',
            'Materialization replay inbox has no durable bundle.',
          );
        }
        return clone(replay);
      }
      this.assertEfInboxSource(bundle.inbox, sourceEvent);

      const businessKey = inboxBusinessKey(
        bundle.inbox.consumer_name,
        bundle.inbox.scope.implementation_project_id,
        bundle.inbox.scope.validation_cycle_id,
        bundle.inbox.scope.branch_id,
        bundle.inbox.business_idempotency_key,
      );
      const businessReplay = state.inboxesByBusiness.get(businessKey);
      if (businessReplay) {
        exactPayloadOrConflict(businessReplay, bundle.inbox.source_event_hash);
        const replay = state.materializationsByRevision.get(sourceEvent.work_order_revision_id);
        if (replay) {
          return clone(replay);
        }
      }

      const existing = state.materializationsByRevision.get(sourceEvent.work_order_revision_id);
      if (existing) {
        if (
          existing.run.run_manifest_hash === bundle.run.run_manifest_hash
          && existing.version_lock.lock_hash === bundle.version_lock.lock_hash
          && existing.run_recipe.recipe_hash === bundle.run_recipe.recipe_hash
        ) {
          return clone(existing);
        }
        throw new ExperimentSpineV2RepositoryConstraintError(
          'RUN_ALREADY_FROZEN',
          'WorkOrder revision already has a different frozen Run.',
        );
      }
      await this.assertMaterializationReadinessCurrent(
        deriveExperimentFoundationV2MaterializationReadinessGuard(bundle, sourceEvent),
      );
      const materializedRevision = state.materializationByKey.get(bundle.version_lock.materialization_key);
      if (materializedRevision && materializedRevision !== sourceEvent.work_order_revision_id) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'MATERIALIZATION_KEY_CONFLICT',
          'Materialization key is already bound to another WorkOrder revision.',
        );
      }
      if (state.runById.has(bundle.run.run_id)) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'RUN_ALREADY_FROZEN',
          'Run id already exists.',
        );
      }
      if (
        bundle.version_lock_dependencies.length !== bundle.version_lock.dependency_count
        || bundle.version_lock_dependencies.some((dependency, index) => (
          dependency.version_lock_id !== bundle.version_lock.version_lock_id
          || dependency.ordinal !== index + 1
        ))
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'MATERIALIZATION_KEY_CONFLICT',
          'VersionLock dependency parity failed.',
        );
      }
      if (
        bundle.task_specs.length === 0
        || bundle.task_specs.length !== bundle.run_cells.length
        || bundle.run.cell_count !== bundle.run_cells.length
        || bundle.run_cells.some((cell, index) => (
          cell.run_id !== bundle.run.run_id
          || cell.ordinal !== index + 1
          || cell.training_task_spec_id !== bundle.task_specs[index]?.training_task_spec_id
          || cell.training_task_spec_hash !== bundle.task_specs[index]?.task_spec_hash
        ))
        || new Set(bundle.run_cells.map((cell) => cell.cell_key)).size !== bundle.run_cells.length
      ) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'RUN_CELL_PARITY_MISMATCH',
          'Run cells and TaskSpecs are not exact ordered 1..N bindings.',
        );
      }
      if (bundle.run.run_manifest_hash !== bundle.outbox.event.payload.run_manifest_hash) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'RUN_MANIFEST_CONFLICT',
          'Run and outbox manifest hashes differ.',
        );
      }
      this.insertEfOutbox(state, bundle.outbox);
      state.inboxesByEvent.set(eventKey, clone(bundle.inbox));
      state.inboxesByBusiness.set(businessKey, clone(bundle.inbox));
      state.materializationsByRevision.set(sourceEvent.work_order_revision_id, clone(bundle));
      state.materializationByKey.set(
        bundle.version_lock.materialization_key,
        sourceEvent.work_order_revision_id,
      );
      state.runById.set(bundle.run.run_id, sourceEvent.work_order_revision_id);
      return clone(bundle);
    });
  }

  async commitAcknowledgement(
    inbox: ExperimentFoundationIntegrationInboxV2,
    sourceEvent: BranchHeadAdvancedEventV1,
  ) {
    return this.transact('commitAcknowledgement', (state) => {
      this.assertEfInboxSource(inbox, sourceEvent);
      const eventKey = inboxEventKey(inbox.consumer_name, inbox.source_event_id);
      const existingEvent = state.inboxesByEvent.get(eventKey);
      if (existingEvent) {
        return exactPayloadOrConflict(existingEvent, inbox.source_event_hash);
      }
      const businessKey = inboxBusinessKey(
        inbox.consumer_name,
        inbox.scope.implementation_project_id,
        inbox.scope.validation_cycle_id,
        inbox.scope.branch_id,
        inbox.business_idempotency_key,
      );
      const existingBusiness = state.inboxesByBusiness.get(businessKey);
      if (existingBusiness) {
        return exactPayloadOrConflict(existingBusiness, inbox.source_event_hash);
      }
      state.inboxesByEvent.set(eventKey, clone(inbox));
      state.inboxesByBusiness.set(businessKey, clone(inbox));
      return clone(inbox);
    });
  }

  async claimOutbox(input: ExperimentV2RelayClaimInput): Promise<ExperimentV2RelayClaim[]> {
    return this.transact('claimOutbox', (state) => {
      const ready = [...state.outboxes.entries()]
        .filter(([, record]) => isRelayReady(record, input.claimed_at))
        .sort(([, left], [, right]) => (
          left.outbox.created_at.localeCompare(right.outbox.created_at)
          || left.outbox.outbox_id.localeCompare(right.outbox.outbox_id)
        ))
        .slice(0, Math.max(0, input.limit));
      return ready.flatMap(([id, record]) => {
        record.status = 'leased';
        record.relay_attempt_count = nextRelayAttemptCount(record.relay_attempt_count);
        record.lease_owner = input.lease_owner;
        record.lease_expires_at = input.lease_expires_at;
        record.next_attempt_at = null;
        state.outboxes.set(id, record);
        let event: ExperimentV2IntegrationEvent;
        try {
          event = reconstructEventOrConflict(record.stored_event);
        } catch (error) {
          if (
            !(error instanceof ExperimentSpineV2RepositoryConstraintError)
            || error.reasonCode !== 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
          ) {
            throw error;
          }
          record.status = 'terminal';
          record.lease_owner = null;
          record.lease_expires_at = null;
          record.last_error_code = 'INTEGRATION_EVENT_PAYLOAD_CONFLICT';
          state.outboxes.set(id, record);
          return [];
        }
        return {
          owner_domain: 'ExperimentFoundation' as const,
          outbox_id: id,
          event,
          relay_attempt_count: record.relay_attempt_count,
          lease_owner: input.lease_owner,
          lease_expires_at: input.lease_expires_at,
        };
      });
    });
  }

  async markOutboxDelivered(outboxId: string, leaseOwner: string, deliveredAt: string) {
    await this.transact('markOutboxDelivered', (state) => {
      const record = this.requireEfLease(state, outboxId, leaseOwner);
      record.status = 'delivered';
      record.delivered_at = deliveredAt;
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = null;
      state.outboxes.set(outboxId, record);
    });
  }

  async markOutboxTerminal(input: ExperimentV2RelayTerminalInput) {
    await this.transact('markOutboxTerminal', (state) => {
      const record = this.requireEfLease(state, input.outbox_id, input.lease_owner);
      record.status = 'terminal';
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = null;
      record.last_error_code = input.error_code;
      state.outboxes.set(input.outbox_id, record);
    });
  }

  async releaseOutbox(input: ExperimentV2RelayReleaseInput) {
    await this.transact('releaseOutbox', (state) => {
      const record = this.requireEfLease(state, input.outbox_id, input.lease_owner);
      record.status = 'retry';
      record.lease_owner = null;
      record.lease_expires_at = null;
      record.next_attempt_at = input.next_attempt_at;
      record.last_error_code = input.error_code;
      state.outboxes.set(input.outbox_id, record);
    });
  }

  private assertEfInboxSource(
    inbox: ExperimentFoundationIntegrationInboxV2,
    sourceEvent: WorkOrderRevisionAdmittedEventV1 | BranchHeadAdvancedEventV1,
  ): void {
    if (
      inbox.source_event_id !== sourceEvent.event_id
      || inbox.payload_hash !== sourceEvent.payload_hash
      || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(sourceEvent)
    ) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'EF inbox does not bind the source event exactly.',
      );
    }
  }

  private insertEfOutbox(state: EfState, outbox: ExperimentFoundationIntegrationOutboxV2): void {
    if (
      state.outboxes.has(outbox.outbox_id)
      || state.outboxByEvent.has(outbox.event.event_id)
      || state.outboxByTransition.has(transitionKey(outbox))
    ) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'EF outbox uniqueness conflict.',
      );
    }
    state.outboxes.set(outbox.outbox_id, initialRelayRecord(outbox));
    state.outboxByEvent.set(outbox.event.event_id, outbox.outbox_id);
    state.outboxByTransition.set(transitionKey(outbox), outbox.outbox_id);
  }

  private requireEfLease(state: EfState, outboxId: string, leaseOwner: string) {
    const record = state.outboxes.get(outboxId);
    if (!record || record.status !== 'leased' || record.lease_owner !== leaseOwner) {
      throw new ExperimentSpineV2RepositoryConstraintError(
        'OUTBOX_LEASE_CONFLICT',
        'EF outbox lease is not owned by this relay.',
      );
    }
    return record;
  }

  private async transact<T>(operation: EfFaultOperation, mutate: (state: EfState) => T | Promise<T>) {
    let release: () => void = () => undefined;
    const previous = this.transactionTail;
    this.transactionTail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const working = cloneEfState(this.state);
      const result = await mutate(working);
      this.throwInjected(operation);
      this.state = working;
      return clone(result);
    } finally {
      release();
    }
  }

  private throwInjected(operation: EfFaultOperation): void {
    const queued = this.faults.get(operation);
    const error = queued?.shift();
    if (queued?.length === 0) {
      this.faults.delete(operation);
    }
    if (error) {
      throw error;
    }
  }
}
