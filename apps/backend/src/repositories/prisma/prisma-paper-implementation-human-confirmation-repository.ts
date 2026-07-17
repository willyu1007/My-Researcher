import type {
  PaperImplementationHumanConfirmationRecord as HumanConfirmationRecordRow,
  PrismaClient,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import type {
  HumanConfirmationRecord,
  HumanConfirmationReviewedSource,
  PaperImplementationHumanConfirmationScope,
  PaperImplementationHumanConfirmationStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import type {
  HumanConfirmationConsumption,
  PaperImplementationHumanConfirmationRepository,
} from '../paper-implementation-human-confirmation.repository.js';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNullableFunctionalRef(value: unknown): TopicSelectionFunctionalRef | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as TopicSelectionFunctionalRef;
  }
  return null;
}

function toRecord(row: HumanConfirmationRecordRow): HumanConfirmationRecord {
  return {
    confirmation_record_id: row.id,
    implementation_project_id: row.implementationProjectId,
    confirmation_scope: row.confirmationScope as PaperImplementationHumanConfirmationScope,
    target_refs: asArray<TopicSelectionFunctionalRef>(row.targetRefs),
    reviewed_sources: asArray<HumanConfirmationReviewedSource>(row.reviewedSources),
    transition_attempt_ref: asNullableFunctionalRef(row.transitionAttemptRef),
    gate_result_refs: asArray<TopicSelectionFunctionalRef>(row.gateResultRefs),
    rationale: row.rationale,
    reviewed_claim_statement_hash: row.reviewedClaimStatementHash ?? null,
    confirmed_by_actor_type: row.confirmedByActorType as TopicSelectionActorType,
    confirmed_by_actor_id: row.confirmedByActorId ?? null,
    policy_version_id: row.policyVersionId ?? null,
    status: row.status as PaperImplementationHumanConfirmationStatus,
    status_reason: row.statusReason ?? null,
    consumed_at: row.consumedAt ? row.consumedAt.toISOString() : null,
    consumed_by_ref: asNullableFunctionalRef(row.consumedByRef),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

function toCreateInput(record: HumanConfirmationRecord): Prisma.PaperImplementationHumanConfirmationRecordCreateInput {
  return {
    id: record.confirmation_record_id,
    implementationProjectId: record.implementation_project_id,
    confirmationScope: record.confirmation_scope,
    targetRefs: toJsonValue(record.target_refs),
    reviewedSources: toJsonValue(record.reviewed_sources),
    transitionAttemptRef: record.transition_attempt_ref
      ? toJsonValue(record.transition_attempt_ref)
      : Prisma.DbNull,
    gateResultRefs: toJsonValue(record.gate_result_refs),
    rationale: record.rationale,
    reviewedClaimStatementHash: record.reviewed_claim_statement_hash ?? null,
    confirmedByActorType: record.confirmed_by_actor_type,
    confirmedByActorId: record.confirmed_by_actor_id ?? null,
    policyVersionId: record.policy_version_id ?? null,
    status: record.status,
    statusReason: record.status_reason ?? null,
    consumedAt: record.consumed_at ? new Date(record.consumed_at) : null,
    consumedByRef: record.consumed_by_ref
      ? toJsonValue(record.consumed_by_ref)
      : Prisma.DbNull,
    createdAt: new Date(record.created_at),
    updatedAt: record.updated_at ? new Date(record.updated_at) : null,
  };
}

export class PrismaPaperImplementationHumanConfirmationRepository
implements PaperImplementationHumanConfirmationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createHumanConfirmationRecord(
    record: HumanConfirmationRecord,
  ): Promise<HumanConfirmationRecord> {
    try {
      const created = await this.prisma.paperImplementationHumanConfirmationRecord.create({
        data: toCreateInput(record),
      });
      return toRecord(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `HumanConfirmationRecord ${record.confirmation_record_id} already exists.`,
        );
      }
      throw error;
    }
  }

  async findHumanConfirmationRecordById(
    implementationProjectId: string,
    confirmationRecordId: string,
  ): Promise<HumanConfirmationRecord | null> {
    const row = await this.prisma.paperImplementationHumanConfirmationRecord.findUnique({
      where: { id: confirmationRecordId },
    });
    if (!row || row.implementationProjectId !== implementationProjectId) {
      return null;
    }
    return toRecord(row);
  }

  async listHumanConfirmationRecords(
    implementationProjectId: string,
  ): Promise<HumanConfirmationRecord[]> {
    const rows = await this.prisma.paperImplementationHumanConfirmationRecord.findMany({
      where: { implementationProjectId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toRecord(row));
  }

  async consumeHumanConfirmationRecord(
    implementationProjectId: string,
    confirmationRecordId: string,
    consumption: HumanConfirmationConsumption,
  ): Promise<HumanConfirmationRecord> {
    const consumedAt = new Date(consumption.consumed_at);
    const updated = await this.prisma.paperImplementationHumanConfirmationRecord.updateMany({
      where: {
        id: confirmationRecordId,
        implementationProjectId,
        status: 'active',
        consumedAt: null,
      },
      data: {
        consumedAt,
        consumedByRef: toJsonValue(consumption.consumed_by_ref),
        updatedAt: consumedAt,
      },
    });
    if (updated.count === 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `HumanConfirmationRecord ${confirmationRecordId} cannot be consumed: it is missing, not active, or already consumed.`,
        { confirmation_record_id: confirmationRecordId },
      );
    }
    const row = await this.prisma.paperImplementationHumanConfirmationRecord.findUnique({
      where: { id: confirmationRecordId },
    });
    if (!row) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `HumanConfirmationRecord ${confirmationRecordId} disappeared during consumption.`,
        { confirmation_record_id: confirmationRecordId },
      );
    }
    return toRecord(row);
  }
}
