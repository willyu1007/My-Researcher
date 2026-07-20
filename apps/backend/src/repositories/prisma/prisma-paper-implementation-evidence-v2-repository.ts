import {
  Prisma,
  type PaperImplementationEvidenceTraceManifestV2 as TraceRow,
  type PaperImplementationExperimentIntegrationInboxV2 as InboxRow,
  type PaperImplementationRunEvidenceUnitV2 as EvidenceRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv, type ValidateFunction } from 'ajv';
import {
  evidenceCandidateQualifiedV1Schema,
  type EvidenceCandidateQualifiedV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  paperImplementationEvidenceTraceManifestV2Schema,
  paperImplementationRunEvidenceUnitV2Schema,
  type PaperImplementationEvidenceTraceManifestV2,
  type PaperImplementationRunEvidenceUnitV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  assertExperimentV2EventPayloadHash,
  serverHashExperimentV2EventEnvelope,
  serverHashPaperImplementationV2EvidenceTraceManifest,
  serverHashPaperImplementationV2RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type { EvidenceCandidateQualifiedEventV1 } from '../experiment-foundation-scientific-validation-v2.repository.js';
import {
  assertEvidenceCommitInput,
  authorityMatchesQualifiedEvent,
  PaperImplementationEvidenceV2RepositoryConstraintError,
  sameStoredEvidence,
  type PaperImplementationEvidenceInboxReceiptV2,
  type PaperImplementationEvidenceOutboxV2,
  type PaperImplementationEvidenceV2Authority,
  type PaperImplementationEvidenceV2CommitInput,
  type PaperImplementationEvidenceV2CommitResult,
  type PaperImplementationEvidenceV2Repository,
  type PaperImplementationStoredEvidenceV2,
} from '../paper-implementation-evidence-v2.repository.js';

type EvidenceClient = PrismaClient | Prisma.TransactionClient;
type EvidenceWithTrace = EvidenceRow & { traceManifest: TraceRow | null };

const storedAjv = new Ajv({ allErrors: true, strict: false });
const candidatePayloadValidator = storedAjv.compile<EvidenceCandidateQualifiedV1>(
  evidenceCandidateQualifiedV1Schema,
);
const evidenceUnitValidator = storedAjv.compile<PaperImplementationRunEvidenceUnitV2>(
  paperImplementationRunEvidenceUnitV2Schema,
);
const traceManifestValidator = storedAjv.compile<PaperImplementationEvidenceTraceManifestV2>(
  paperImplementationEvidenceTraceManifestV2Schema,
);

function constraint(
  reasonCode: ConstructorParameters<typeof PaperImplementationEvidenceV2RepositoryConstraintError>[0],
  message: string,
): PaperImplementationEvidenceV2RepositoryConstraintError {
  return new PaperImplementationEvidenceV2RepositoryConstraintError(reasonCode, message);
}

export class PrismaPaperImplementationEvidenceV2Repository
implements PaperImplementationEvidenceV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async findInboxByEvent(consumerName: string, eventId: string) {
    const row = await this.prisma.paperImplementationExperimentIntegrationInboxV2.findUnique({
      where: { consumerName_eventId: { consumerName, eventId } },
    });
    return row ? mapInbox(row) : null;
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ) {
    const row = await this.prisma.paperImplementationExperimentIntegrationInboxV2.findUnique({
      where: {
        consumerName_implementationProjectId_validationCycleId_branchId_businessIdempotencyKey: {
          consumerName,
          implementationProjectId,
          validationCycleId,
          branchId,
          businessIdempotencyKey,
        },
      },
    });
    return row ? mapInbox(row) : null;
  }

  async findAuthority(branchId: string, workOrderRevisionId: string) {
    return loadAuthority(this.prisma, branchId, workOrderRevisionId);
  }

  async findEvidenceByCandidateId(evidenceCandidateId: string) {
    const row = await this.prisma.paperImplementationRunEvidenceUnitV2.findUnique({
      where: { evidenceCandidateId },
      include: { traceManifest: true },
    });
    return row ? mapStoredEvidence(row) : null;
  }

  async findEvidenceByIngestIdentity(
    evidenceCandidateId: string,
    businessIdempotencyKey: string,
  ) {
    const stored = await this.findEvidenceByCandidateId(evidenceCandidateId);
    if (!stored) return null;
    if (stored.ingest_idempotency_key === businessIdempotencyKey) return stored;
    const receipts = await this.prisma.paperImplementationExperimentIntegrationInboxV2.findMany({
      where: {
        consumerName: 'pi-evidence-trust-gateway-v2',
        eventType: 'EvidenceCandidateQualified',
        businessIdempotencyKey,
        outcome: 'processed',
      },
    });
    return receipts.some((row) => mapInbox(row).source_event.payload.candidate_id === evidenceCandidateId)
      ? stored
      : null;
  }

  async recordRejectedInbox(inbox: PaperImplementationEvidenceInboxReceiptV2) {
    if (inbox.outcome !== 'terminal_conflict' || inbox.reason_code === null) {
      throw constraint(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'Rejected PI evidence receipt must carry a terminal reason.',
      );
    }
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const replay = await findInboxReplay(transaction, inbox);
        if (replay) return replay;
        const row = await transaction.paperImplementationExperimentIntegrationInboxV2.create({
          data: inboxCreateData(inbox),
        });
        return mapInbox(row);
      });
    } catch (error) {
      throw mapWriteError(error);
    }
  }

  async commitEvidenceIngestion(
    input: PaperImplementationEvidenceV2CommitInput,
  ): Promise<PaperImplementationEvidenceV2CommitResult> {
    assertEvidenceCommitInput(input);
    try {
      return await this.commitOnce(input);
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        try {
          return await this.commitOnce(input);
        } catch (retryError) {
          throw mapWriteError(retryError);
        }
      }
      throw mapWriteError(error);
    }
  }

  private async commitOnce(
    input: PaperImplementationEvidenceV2CommitInput,
  ): Promise<PaperImplementationEvidenceV2CommitResult> {
    return this.prisma.$transaction(async (transaction) => {
      const replay = await findInboxReplay(transaction, input.inbox);
      if (replay) {
        if (replay.outcome !== 'processed') {
          throw constraint(
            'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
            'A rejected PI evidence receipt cannot replay as processed.',
          );
        }
        const stored = await loadEvidenceByCandidate(
          transaction,
          input.evidence.run_evidence_unit.evidence_candidate_id,
        );
        if (!stored || !sameStoredEvidence(stored, input.evidence)) {
          throw constraint(
            'EVIDENCE_INGESTION_CONFLICT',
            'Processed evidence receipt lost its exact REU/trace authority.',
          );
        }
        return { inbox: replay, evidence: stored, reused_existing_evidence: true };
      }

      const liveAuthority = await loadAuthority(
        transaction,
        input.authority.branch_id,
        input.authority.work_order_revision_id,
      );
      if (
        !liveAuthority
        || !authorityMatchesQualifiedEvent(liveAuthority, input.inbox.source_event)
      ) {
        throw constraint(
          'BRANCH_HEAD_SCOPE_CONFLICT',
          'Exact admitted PI branch/revision authority drifted before evidence commit.',
        );
      }

      const unit = input.evidence.run_evidence_unit;
      const existingRow = await transaction.paperImplementationRunEvidenceUnitV2.findFirst({
        where: {
          OR: [
            { runId: unit.run_id },
            { evidenceCandidateId: unit.evidence_candidate_id },
            { validationReportId: unit.validation_report_id },
            { ingestIdempotencyKey: input.evidence.ingest_idempotency_key },
          ],
        },
        include: { traceManifest: true },
      });

      const inboxRow = await transaction.paperImplementationExperimentIntegrationInboxV2.create({
        data: inboxCreateData(input.inbox),
      });
      if (existingRow) {
        const stored = mapStoredEvidence(existingRow);
        if (
          existingRow.evidenceCandidateId !== unit.evidence_candidate_id
          || !sameStoredEvidence(stored, input.evidence)
        ) {
          throw constraint(
            'EVIDENCE_INGESTION_CONFLICT',
            'REU uniqueness is already bound to different evidence authority.',
          );
        }
        return {
          inbox: mapInbox(inboxRow),
          evidence: stored,
          reused_existing_evidence: true,
        };
      }

      await transaction.paperImplementationRunEvidenceUnitV2.create({
        data: evidenceCreateData(input),
      });
      await transaction.paperImplementationEvidenceTraceManifestV2.create({
        data: traceCreateData(input),
      });
      await transaction.paperImplementationExperimentIntegrationOutboxV2.create({
        data: outboxCreateData(input.outbox),
      });
      return {
        inbox: mapInbox(inboxRow),
        evidence: input.evidence,
        reused_existing_evidence: false,
      };
    });
  }
}

async function loadAuthority(
  client: EvidenceClient,
  branchId: string,
  workOrderRevisionId: string,
): Promise<PaperImplementationEvidenceV2Authority | null> {
  const row = await client.paperImplementationExperimentWorkOrderRevisionV2.findFirst({
    where: { id: workOrderRevisionId, branchId },
    include: { branch: true, admission: true },
  });
  if (!row || !row.admission) return null;
  if (row.approvedPlanHash !== row.admission.approvedPlanHash) {
    throw constraint(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      `Admitted revision plan binding drifted: ${row.id}`,
    );
  }
  return {
    implementation_project_id: row.branch.implementationProjectId,
    validation_cycle_id: row.branch.validationCycleId,
    branch_id: row.branchId,
    branch_key: row.branch.branchKey,
    work_order_revision_id: row.id,
    work_order_revision_hash: row.contentHash,
    branch_revision_sequence: row.revisionSequence,
    cell_plan_hash: row.cellPlanHash,
    approved_plan_hash: row.admission.approvedPlanHash,
  };
}

async function findInboxReplay(
  client: EvidenceClient,
  incoming: PaperImplementationEvidenceInboxReceiptV2,
): Promise<PaperImplementationEvidenceInboxReceiptV2 | null> {
  const event = incoming.source_event;
  const byEvent = await client.paperImplementationExperimentIntegrationInboxV2.findFirst({
    where: { consumerName: incoming.consumer_name, eventId: event.event_id },
  });
  const row = byEvent ?? await client.paperImplementationExperimentIntegrationInboxV2.findFirst({
    where: {
      consumerName: incoming.consumer_name,
      implementationProjectId: event.implementation_project_id,
      validationCycleId: event.validation_cycle_id,
      branchId: event.branch_id,
      businessIdempotencyKey: event.business_idempotency_key,
    },
  });
  if (!row) return null;
  const stored = mapInbox(row);
  if (
    stored.source_event.event_id !== event.event_id
    || stored.source_event_hash !== incoming.source_event_hash
    || stored.outcome !== incoming.outcome
    || stored.reason_code !== incoming.reason_code
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'PI evidence inbox event or business key was reused with changed content.',
    );
  }
  return stored;
}

function mapInbox(row: InboxRow): PaperImplementationEvidenceInboxReceiptV2 {
  const payload = parseStored(
    candidatePayloadValidator,
    row.eventPayloadJson,
    `PI evidence inbox payload ${row.id}`,
  );
  const event: EvidenceCandidateQualifiedEventV1 = {
    event_id: row.eventId,
    event_type: 'EvidenceCandidateQualified',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: row.occurredAt.toISOString(),
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
    payload,
  };
  if (
    row.eventType !== event.event_type
    || row.schemaVersion !== event.schema_version
    || row.producerDomain !== event.producer_domain
    || row.runId !== payload.run_id
    || row.runManifestHash !== payload.run_manifest_hash
    || row.eventEnvelopeHash !== serverHashExperimentV2EventEnvelope(event)
    || row.consumerName !== 'pi-evidence-trust-gateway-v2'
    || row.status !== 'processed'
    || (row.outcome !== 'processed' && row.outcome !== 'terminal_conflict')
    || (row.outcome === 'processed') !== (row.reasonCode === null)
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `PI evidence inbox relational mirror drifted: ${row.id}`,
    );
  }
  assertExperimentV2EventPayloadHash(event);
  return {
    inbox_id: row.id,
    consumer_name: 'pi-evidence-trust-gateway-v2',
    source_event: event,
    source_event_hash: row.eventEnvelopeHash,
    outcome: row.outcome,
    reason_code: decodeReasonCode(row.reasonCode),
    processed_at: row.processedAt.toISOString(),
  };
}

function mapStoredEvidence(row: EvidenceWithTrace): PaperImplementationStoredEvidenceV2 {
  if (!row.traceManifest) {
    throw constraint('EVIDENCE_INGESTION_CONFLICT', `REU trace manifest is missing: ${row.id}`);
  }
  const unit: PaperImplementationRunEvidenceUnitV2 = {
    run_evidence_unit_id: row.id,
    schema_version: 'v1',
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    branch_id: row.branchId,
    work_order_revision_id: row.workOrderRevisionId,
    work_order_revision_hash: row.workOrderRevisionHash,
    branch_revision_sequence: row.branchRevisionSequence,
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    evidence_candidate_id: row.evidenceCandidateId,
    evidence_candidate_content_hash: row.evidenceCandidateContentHash,
    validation_report_id: row.validationReportId,
    validation_hash: row.validationHash,
    evaluation_protocol_revision_id: row.evaluationProtocolRevisionId,
    evaluation_protocol_content_hash: row.evaluationProtocolContentHash,
    content_hash: row.contentHash,
  };
  const trace: PaperImplementationEvidenceTraceManifestV2 = {
    trace_manifest_id: row.traceManifest.id,
    schema_version: 'v1',
    run_evidence_unit_id: row.traceManifest.runEvidenceUnitId,
    ordered_trace_refs: parseTraceRefs(row.traceManifest.traceRefsJson),
    content_hash: row.traceManifest.contentHash,
  };
  const { content_hash: unitHash, ...unitHashInput } = unit;
  const { content_hash: traceHash, ...traceHashInput } = trace;
  if (
    row.schemaVersion !== 'v1'
    || row.traceManifest.schemaVersion !== 'v1'
    || row.traceManifest.orderedTraceRefCount !== trace.ordered_trace_refs.length
    || !evidenceUnitValidator(unit)
    || !traceManifestValidator(trace)
    || unitHash !== serverHashPaperImplementationV2RunEvidenceUnit(unitHashInput)
    || traceHash !== serverHashPaperImplementationV2EvidenceTraceManifest(traceHashInput)
  ) {
    throw constraint('EVIDENCE_INGESTION_CONFLICT', `Stored PI evidence drifted: ${row.id}`);
  }
  return {
    run_evidence_unit: unit,
    trace_manifest: trace,
    ingest_idempotency_key: row.ingestIdempotencyKey,
  };
}

async function loadEvidenceByCandidate(
  client: EvidenceClient,
  candidateId: string,
): Promise<PaperImplementationStoredEvidenceV2 | null> {
  const row = await client.paperImplementationRunEvidenceUnitV2.findUnique({
    where: { evidenceCandidateId: candidateId },
    include: { traceManifest: true },
  });
  return row ? mapStoredEvidence(row) : null;
}

function inboxCreateData(inbox: PaperImplementationEvidenceInboxReceiptV2) {
  const event = inbox.source_event;
  if (inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
    throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'Inbox source envelope hash is invalid.');
  }
  return {
    id: inbox.inbox_id,
    consumerName: inbox.consumer_name,
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
    runId: event.payload.run_id,
    runManifestHash: event.payload.run_manifest_hash,
    eventPayloadJson: toInputJson(event.payload),
    payloadHash: event.payload_hash,
    eventEnvelopeHash: inbox.source_event_hash,
    status: 'processed',
    outcome: inbox.outcome,
    reasonCode: inbox.reason_code,
    receivedAt: new Date(inbox.processed_at),
    processedAt: new Date(inbox.processed_at),
  } satisfies Prisma.PaperImplementationExperimentIntegrationInboxV2UncheckedCreateInput;
}

function evidenceCreateData(input: PaperImplementationEvidenceV2CommitInput) {
  const unit = input.evidence.run_evidence_unit;
  return {
    id: unit.run_evidence_unit_id,
    schemaVersion: unit.schema_version,
    implementationProjectId: unit.implementation_project_id,
    validationCycleId: unit.validation_cycle_id,
    branchId: unit.branch_id,
    workOrderRevisionId: unit.work_order_revision_id,
    workOrderRevisionHash: unit.work_order_revision_hash,
    branchRevisionSequence: unit.branch_revision_sequence,
    runId: unit.run_id,
    runManifestHash: unit.run_manifest_hash,
    evidenceCandidateId: unit.evidence_candidate_id,
    evidenceCandidateContentHash: unit.evidence_candidate_content_hash,
    validationReportId: unit.validation_report_id,
    validationHash: unit.validation_hash,
    evaluationProtocolRevisionId: unit.evaluation_protocol_revision_id,
    evaluationProtocolContentHash: unit.evaluation_protocol_content_hash,
    ingestIdempotencyKey: input.evidence.ingest_idempotency_key,
    contentHash: unit.content_hash,
    createdAt: new Date(input.created_at),
  } satisfies Prisma.PaperImplementationRunEvidenceUnitV2UncheckedCreateInput;
}

function traceCreateData(input: PaperImplementationEvidenceV2CommitInput) {
  const trace = input.evidence.trace_manifest;
  return {
    id: trace.trace_manifest_id,
    schemaVersion: trace.schema_version,
    runEvidenceUnitId: trace.run_evidence_unit_id,
    orderedTraceRefCount: trace.ordered_trace_refs.length,
    traceRefsJson: toInputJson(trace.ordered_trace_refs),
    contentHash: trace.content_hash,
    createdAt: new Date(input.created_at),
  } satisfies Prisma.PaperImplementationEvidenceTraceManifestV2UncheckedCreateInput;
}

function outboxCreateData(outbox: PaperImplementationEvidenceOutboxV2) {
  const event = outbox.event;
  return {
    id: outbox.outbox_id,
    eventId: event.event_id,
    aggregateType: outbox.aggregate_type,
    aggregateId: outbox.aggregate_id,
    transitionKey: outbox.transition_key,
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
    runId: event.payload.run_id,
    runManifestHash: event.payload.run_manifest_hash,
    eventPayloadJson: toInputJson(event.payload),
    payloadHash: event.payload_hash,
    eventEnvelopeHash: outbox.event_envelope_hash,
    relayStatus: 'pending',
    relayAttemptCount: 0,
    createdAt: new Date(outbox.created_at),
    updatedAt: new Date(outbox.created_at),
  } satisfies Prisma.PaperImplementationExperimentIntegrationOutboxV2UncheckedCreateInput;
}

function parseStored<T>(
  validator: ValidateFunction<T>,
  value: unknown,
  label: string,
): T {
  if (!validator(value)) {
    throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', `${label} is not contract-valid.`);
  }
  return value;
}

function parseTraceRefs(value: unknown): PaperImplementationEvidenceTraceManifestV2['ordered_trace_refs'] {
  const candidate = {
    trace_manifest_id: 'validation-only',
    schema_version: 'v1' as const,
    run_evidence_unit_id: 'validation-only',
    ordered_trace_refs: value,
    content_hash: `sha256:${'0'.repeat(64)}`,
  };
  if (!traceManifestValidator(candidate)) {
    throw constraint('EVIDENCE_INGESTION_CONFLICT', 'Stored trace refs are not contract-valid.');
  }
  return candidate.ordered_trace_refs;
}

function decodeReasonCode(value: string | null): PaperImplementationEvidenceInboxReceiptV2['reason_code'] {
  if (
    value === null
    || value === 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE'
    || value === 'EVIDENCE_PROVENANCE_REJECTED'
    || value === 'BRANCH_HEAD_SCOPE_CONFLICT'
    || value === 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
  ) return value;
  throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', `Unknown PI evidence reason: ${value}`);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isPrismaForeignKeyConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}

function mapWriteError(error: unknown): Error {
  if (error instanceof PaperImplementationEvidenceV2RepositoryConstraintError) return error;
  if (isPrismaForeignKeyConflict(error)) {
    return constraint(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      'Exact admitted PI branch/revision authority disappeared during evidence commit.',
    );
  }
  if (isPrismaUniqueConflict(error)) {
    return constraint(
      'EVIDENCE_INGESTION_CONFLICT',
      'PI evidence or inbox uniqueness rejected changed content.',
    );
  }
  return error instanceof Error ? error : new Error('UNKNOWN_PI_EVIDENCE_WRITE_FAILURE');
}
