import {
  Prisma,
  type PaperImplementationValidationCycleClosureV2 as ClosureRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv } from 'ajv';
import {
  SCIENTIFIC_DISPOSITIONS_V2,
  VALIDATION_CYCLE_CLOSURE_KINDS_V2,
  validationCycleClosureWatermarkV2Schema,
  type ScientificDispositionV2,
  type ValidationCycleClosureKindV2,
  type ValidationCycleClosureV2,
  type ValidationCycleClosureWatermarkV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashPaperImplementationV2CycleClosure,
  serverHashPaperImplementationV2ClosureWatermark,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  PaperImplementationCycleReadinessV2HeadReference,
} from '../paper-implementation-cycle-readiness-v2.repository.js';
import {
  assertValidationCycleClosureCommit,
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationStoredValidationCycleClosureV2,
  type PaperImplementationValidationCycleClosureCommitV2,
  type PaperImplementationValidationCycleClosureV2Repository,
  type PaperImplementationValidationCycleClosureV2Transaction,
} from '../paper-implementation-validation-cycle-closure-v2.repository.js';
import {
  PrismaPaperImplementationCycleReadinessV2Repository,
} from './prisma-paper-implementation-cycle-readiness-v2-repository.js';

const ajv = new Ajv({ allErrors: true, strict: false });
const watermarkValidator = ajv.compile<ValidationCycleClosureWatermarkV2>(
  validationCycleClosureWatermarkV2Schema,
);

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class PrismaPaperImplementationValidationCycleClosureV2Repository
implements PaperImplementationValidationCycleClosureV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async isCycleClosed(validationCycleId: string): Promise<boolean> {
    const row = await this.prisma.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId },
      select: { id: true },
    });
    return row !== null;
  }

  async withTransaction<T>(
    operation: (transaction: PaperImplementationValidationCycleClosureV2Transaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (transaction) => operation(new PrismaClosureTransaction(transaction)),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}

class PrismaClosureTransaction
implements PaperImplementationValidationCycleClosureV2Transaction {
  private readonly readiness: PrismaPaperImplementationCycleReadinessV2Repository;

  constructor(private readonly transaction: Prisma.TransactionClient) {
    this.readiness = new PrismaPaperImplementationCycleReadinessV2Repository(transaction);
  }

  findValidationCycle(validationCycleId: string) {
    return this.readiness.findValidationCycle(validationCycleId);
  }

  listAdmittedBranches(validationCycleId: string) {
    return this.readiness.listAdmittedBranches(validationCycleId);
  }

  listHeadRunAccounting(references: readonly PaperImplementationCycleReadinessV2HeadReference[]) {
    return this.readiness.listHeadRunAccounting(references);
  }

  listCycleActiveRealAttempts(validationCycleId: string) {
    return this.readiness.listCycleActiveRealAttempts(validationCycleId);
  }

  listEligibleRunEvidenceUnits(validationCycleId: string) {
    return this.readiness.listEligibleRunEvidenceUnits(validationCycleId);
  }

  findCycleClosure(validationCycleId: string) {
    return this.readiness.findCycleClosure(validationCycleId);
  }

  async findStoredClosureByCycle(validationCycleId: string) {
    const row = await this.transaction.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId },
    });
    return row ? mapStoredClosure(row) : null;
  }

  async findStoredClosureByIdempotencyKey(idempotencyKey: string) {
    const row = await this.transaction.paperImplementationValidationCycleClosureV2.findUnique({
      where: { idempotencyKey },
    });
    return row ? mapStoredClosure(row) : null;
  }

  async commitClosure(input: PaperImplementationValidationCycleClosureCommitV2) {
    assertValidationCycleClosureCommit(input);
    const stored = input.stored_closure;
    const closure = stored.closure;
    const event = input.outbox.event;
    await this.transaction.paperImplementationValidationCycleClosureV2.create({
      data: {
        id: closure.closure_id,
        schemaVersion: closure.schema_version,
        validationCycleId: closure.validation_cycle_id,
        implementationProjectId: stored.implementation_project_id,
        cycleVersionAtClosure: closure.cycle_version_at_closure,
        closureKind: closure.closure_kind,
        scientificDisposition: closure.scientific_disposition,
        selectedExitKey: closure.selected_exit_key,
        acceptedProposalId: closure.accepted_proposal_id,
        acceptedProposalHash: closure.accepted_proposal_hash,
        orderedBranchCount: closure.closure_watermark.ordered_branches.length,
        closureWatermarkJson: jsonInput(closure.closure_watermark),
        closureInputHash: closure.closure_watermark.closure_input_hash,
        closureSnapshotHash: closure.closure_snapshot_hash,
        idempotencyKey: stored.idempotency_key,
        createdAt: new Date(stored.created_at),
      },
    });
    await this.transaction.paperImplementationExperimentIntegrationOutboxV2.create({
      data: {
        id: input.outbox.outbox_id,
        eventId: event.event_id,
        aggregateType: 'PaperImplementationValidationCycleClosureV2',
        aggregateId: closure.closure_id,
        transitionKey: input.outbox.aggregate_transition_key,
        eventType: event.event_type,
        schemaVersion: event.schema_version,
        producerDomain: event.producer_domain,
        occurredAt: new Date(event.occurred_at),
        correlationId: event.correlation_id,
        causationId: event.causation_id,
        businessIdempotencyKey: event.business_idempotency_key,
        implementationProjectId: stored.implementation_project_id,
        validationCycleId: closure.validation_cycle_id,
        // The Pack A PI outbox has non-null branch/revision mirrors. Closure
        // is Cycle-wide, so these slots carry explicit closure authority rather
        // than selecting one branch from the multi-branch watermark.
        branchId: `validation-cycle:${closure.validation_cycle_id}`,
        branchKey: 'validation-cycle-closure-v2',
        workOrderRevisionId: closure.closure_id,
        revisionSequence: closure.cycle_version_at_closure,
        workOrderRevisionHash: closure.closure_snapshot_hash,
        cellPlanHash: closure.closure_watermark.closure_input_hash,
        approvedPlanHash: closure.closure_snapshot_hash,
        runId: null,
        runManifestHash: null,
        eventPayloadJson: jsonInput(event.payload),
        payloadHash: event.payload_hash,
        eventEnvelopeHash: input.outbox.event_envelope_hash,
        relayStatus: 'pending',
        relayAttemptCount: 0,
        createdAt: new Date(input.outbox.created_at),
        updatedAt: new Date(input.outbox.created_at),
      },
    });
    return stored;
  }
}

function mapStoredClosure(row: ClosureRow): PaperImplementationStoredValidationCycleClosureV2 {
  if (
    row.schemaVersion !== 'v1'
    || !isClosureKind(row.closureKind)
    || !isScientificDispositionOrNull(row.scientificDisposition)
    || !watermarkValidator(row.closureWatermarkJson)
  ) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      `Stored Cycle closure watermark is invalid: ${row.id}`,
    );
  }
  const watermark = structuredClone(row.closureWatermarkJson) as ValidationCycleClosureWatermarkV2;
  const closure: ValidationCycleClosureV2 = {
    closure_id: row.id,
    schema_version: 'v1',
    validation_cycle_id: row.validationCycleId,
    cycle_version_at_closure: row.cycleVersionAtClosure,
    closure_kind: row.closureKind,
    scientific_disposition: row.scientificDisposition,
    selected_exit_key: row.selectedExitKey,
    accepted_proposal_id: row.acceptedProposalId,
    accepted_proposal_hash: row.acceptedProposalHash,
    closure_watermark: watermark,
    closure_snapshot_hash: row.closureSnapshotHash,
  };
  const { closure_input_hash: closureInputHash, ...watermarkHashInput } = watermark;
  const { closure_snapshot_hash: closureSnapshotHash, ...closureHashInput } = closure;
  const controlOnly = closure.closure_kind === 'control_flow_validated_no_paper_evidence';
  if (
    row.orderedBranchCount !== watermark.ordered_branches.length
    || row.closureInputHash !== closureInputHash
    || closureInputHash !== serverHashPaperImplementationV2ClosureWatermark(watermarkHashInput)
    || closureSnapshotHash !== serverHashPaperImplementationV2CycleClosure(closureHashInput)
    || (controlOnly && (
      closure.scientific_disposition !== null
      || closure.selected_exit_key !== null
      || closure.accepted_proposal_id !== null
      || closure.accepted_proposal_hash !== null
    ))
  ) {
    throw new PaperImplementationValidationCycleClosureV2RepositoryError(
      'CLOSURE_INVARIANT_INVALID',
      `Stored Cycle closure authority drifted: ${row.id}`,
    );
  }
  return {
    implementation_project_id: row.implementationProjectId,
    closure,
    idempotency_key: row.idempotencyKey,
    created_at: row.createdAt.toISOString(),
  };
}

function isClosureKind(value: string): value is ValidationCycleClosureKindV2 {
  return (VALIDATION_CYCLE_CLOSURE_KINDS_V2 as readonly string[]).includes(value);
}

function isScientificDispositionOrNull(
  value: string | null,
): value is ScientificDispositionV2 | null {
  return value === null || (SCIENTIFIC_DISPOSITIONS_V2 as readonly string[]).includes(value);
}

function mapPrismaError(error: unknown): unknown {
  if (error instanceof PaperImplementationValidationCycleClosureV2RepositoryError) {
    return error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2034') {
      return new PaperImplementationValidationCycleClosureV2RepositoryError(
        'CLOSURE_CONCURRENT_CONFLICT',
        'Cycle closure transaction conflicted with a concurrent scope write.',
      );
    }
    if (error.code === 'P2002') {
      const target = JSON.stringify(error.meta?.target ?? '');
      if (target.includes('validationCycleId') || target.includes('pi_cycle_closure_cycle_unique')) {
        return new PaperImplementationValidationCycleClosureV2RepositoryError(
          'CYCLE_ALREADY_CLOSED',
          'ValidationCycle already has a v2 closure.',
        );
      }
      if (target.includes('idempotencyKey') || target.includes('pi_cycle_closure_idempotency_unique')) {
        return new PaperImplementationValidationCycleClosureV2RepositoryError(
          'CLOSURE_IDEMPOTENCY_CONFLICT',
          'Cycle closure idempotency key is already bound.',
        );
      }
    }
  }
  return error;
}
