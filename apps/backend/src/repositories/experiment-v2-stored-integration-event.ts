import { Ajv, type ValidateFunction } from 'ajv';
import {
  serverHashExperimentV2EventEnvelope,
  verifyExperimentV2EventPayloadHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import {
  EXPERIMENT_V2_INTEGRATION_OUTCOMES,
  EXPERIMENT_V2_REASON_CODES,
  experimentV2IntegrationEventSchema,
  type ExperimentV2IntegrationOutcome,
  type ExperimentV2IntegrationEvent,
  type ExperimentV2ReasonCode,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateIntegrationEvent = ajv.compile(
  experimentV2IntegrationEventSchema,
) as ValidateFunction<ExperimentV2IntegrationEvent>;
const integrationOutcomes = new Set<string>(EXPERIMENT_V2_INTEGRATION_OUTCOMES);
const integrationReasonCodes = new Set<string>(EXPERIMENT_V2_REASON_CODES);

export interface StoredExperimentV2EventColumns {
  eventId: string;
  eventType: string;
  schemaVersion: string;
  producerDomain: string;
  occurredAt: Date;
  correlationId: string;
  causationId: string;
  businessIdempotencyKey: string;
  implementationProjectId: string;
  validationCycleId: string;
  branchId: string;
  branchKey: string;
  workOrderRevisionId: string;
  revisionSequence: number;
  workOrderRevisionHash: string;
  cellPlanHash: string;
  approvedPlanHash: string;
  runId: string | null;
  runManifestHash: string | null;
  eventPayloadJson: unknown;
  payloadHash: string;
  eventEnvelopeHash: string;
}

export interface StoredExperimentV2InboxOutcomeColumns {
  status: string;
  outcome: string;
  reasonCode: string | null;
}

export interface DecodedExperimentV2InboxOutcome {
  status: 'processed' | 'retryable';
  outcome: ExperimentV2IntegrationOutcome;
  reason_code: ExperimentV2ReasonCode | null;
}

export class StoredExperimentV2EventIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoredExperimentV2EventIntegrityError';
  }
}

export function decodeExperimentV2InboxOutcome(
  row: StoredExperimentV2InboxOutcomeColumns,
): DecodedExperimentV2InboxOutcome {
  if (!isIntegrationOutcome(row.outcome)) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration inbox outcome is unsupported.',
    );
  }
  const outcome = row.outcome;
  const expectedStatus = outcome === 'retryable' ? 'retryable' : 'processed';
  if (row.status !== expectedStatus) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration inbox status does not match its outcome.',
    );
  }
  if (
    row.reasonCode !== null
    && !isIntegrationReasonCode(row.reasonCode)
  ) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration inbox reason code is unsupported.',
    );
  }
  if ((outcome === 'processed') !== (row.reasonCode === null)) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration inbox outcome and reason code are inconsistent.',
    );
  }
  return {
    status: expectedStatus,
    outcome,
    reason_code: row.reasonCode,
  };
}

function isIntegrationOutcome(value: string): value is ExperimentV2IntegrationOutcome {
  return integrationOutcomes.has(value);
}

function isIntegrationReasonCode(value: string): value is ExperimentV2ReasonCode {
  return integrationReasonCodes.has(value);
}

export function encodeExperimentV2EventPayload(
  event: ExperimentV2IntegrationEvent,
): {
  payload: ExperimentV2IntegrationEvent['payload'];
  envelope_hash: string;
} {
  assertTypedEvent(event);
  assertCanonicalTimestamp(event.occurred_at);
  return {
    payload: event.payload,
    envelope_hash: serverHashExperimentV2EventEnvelope(event),
  };
}

export function decomposeExperimentV2Event(
  event: ExperimentV2IntegrationEvent,
): StoredExperimentV2EventColumns {
  const stored = encodeExperimentV2EventPayload(event);
  const runId = event.event_type === 'WorkOrderRevisionAdmitted'
    ? null
    : event.payload.run_id;
  const runManifestHash = event.event_type === 'WorkOrderRevisionAdmitted'
    ? null
    : event.payload.run_manifest_hash;
  const columns: StoredExperimentV2EventColumns = {
    eventId: event.event_id,
    eventType: event.event_type,
    schemaVersion: event.schema_version,
    producerDomain: event.producer_domain,
    occurredAt: new Date(event.occurred_at),
    correlationId: event.correlation_id,
    causationId: event.causation_id,
    businessIdempotencyKey: event.business_idempotency_key,
    implementationProjectId: event.implementation_project_id,
    validationCycleId: event.validation_cycle_id,
    branchId: event.branch_id,
    branchKey: event.branch_key,
    workOrderRevisionId: event.work_order_revision_id,
    revisionSequence: event.branch_revision_sequence,
    workOrderRevisionHash: event.work_order_revision_hash,
    cellPlanHash: event.cell_plan_hash,
    approvedPlanHash: event.approved_plan_hash,
    runId,
    runManifestHash,
    eventPayloadJson: structuredClone(stored.payload),
    payloadHash: event.payload_hash,
    eventEnvelopeHash: stored.envelope_hash,
  };
  assertRunBinding(columns, event);
  return columns;
}

export function reconstructExperimentV2Event(
  row: StoredExperimentV2EventColumns,
): ExperimentV2IntegrationEvent {
  let occurredAt: string;
  try {
    occurredAt = row.occurredAt.toISOString();
  } catch {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration event timestamp is invalid.',
    );
  }
  const candidate = {
    event_id: row.eventId,
    event_type: row.eventType,
    schema_version: row.schemaVersion,
    producer_domain: row.producerDomain,
    occurred_at: occurredAt,
    correlation_id: row.correlationId,
    causation_id: row.causationId,
    business_idempotency_key: row.businessIdempotencyKey,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    branch_id: row.branchId,
    branch_key: row.branchKey,
    work_order_revision_id: row.workOrderRevisionId,
    work_order_revision_hash: row.workOrderRevisionHash,
    branch_revision_sequence: row.revisionSequence,
    cell_plan_hash: row.cellPlanHash,
    approved_plan_hash: row.approvedPlanHash,
    payload_hash: row.payloadHash,
    payload: row.eventPayloadJson,
  };
  assertTypedEvent(candidate);
  const event = candidate as ExperimentV2IntegrationEvent;
  assertRunBinding(row, event);
  if (serverHashExperimentV2EventEnvelope(event) !== row.eventEnvelopeHash) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration event envelope hash does not match its structural columns.',
    );
  }
  return event;
}

function assertTypedEvent(value: unknown): asserts value is ExperimentV2IntegrationEvent {
  if (!validateIntegrationEvent(value)) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration event type, version, producer, scope, or typed payload is invalid.',
    );
  }
  if (!verifyExperimentV2EventPayloadHash(value)) {
    throw new StoredExperimentV2EventIntegrityError(
      'Stored integration event payload hash does not match its typed payload.',
    );
  }
}

function assertCanonicalTimestamp(timestamp: string): void {
  let canonical: string;
  try {
    canonical = new Date(timestamp).toISOString();
  } catch {
    throw new StoredExperimentV2EventIntegrityError(
      'Integration event timestamp is invalid.',
    );
  }
  if (canonical !== timestamp) {
    throw new StoredExperimentV2EventIntegrityError(
      'Integration event timestamp must use canonical ISO representation.',
    );
  }
}

function assertRunBinding(
  row: StoredExperimentV2EventColumns,
  event: ExperimentV2IntegrationEvent,
): void {
  if (event.event_type === 'WorkOrderRevisionAdmitted') {
    if (row.runId !== null || row.runManifestHash !== null) {
      throw new StoredExperimentV2EventIntegrityError(
        'Admission event must not carry Run structural columns.',
      );
    }
    return;
  }
  if (
    row.runId !== event.payload.run_id
    || row.runManifestHash !== event.payload.run_manifest_hash
  ) {
    throw new StoredExperimentV2EventIntegrityError(
      'Integration event Run structural columns do not match its typed payload.',
    );
  }
  if (
    event.event_type === 'BranchHeadAdvanced'
    && event.payload.accepted_revision_sequence !== event.branch_revision_sequence
  ) {
    throw new StoredExperimentV2EventIntegrityError(
      'Branch-head event sequence does not match its structural scope.',
    );
  }
}
