import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteratureContentProcessingBatchItemRecord,
  LiteratureContentProcessingBatchItemStatus,
  LiteratureContentProcessingBatchJobRecord,
} from '../../literature-repository.js';
import {
  toContentProcessingBatchItemRecord,
  toContentProcessingBatchJobRecord,
} from './prisma-literature-record-mappers.js';

export class PrismaLiteratureBatchStore {
  constructor(private readonly prisma: PrismaClient) {}

  async createContentProcessingBatchJob(
    record: LiteratureContentProcessingBatchJobRecord,
    items: LiteratureContentProcessingBatchItemRecord[],
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    const created = await this.prisma.$transaction(async (tx) => {
      const job = await tx.literatureContentProcessingBatchJob.create({
        data: {
          id: record.id,
          status: record.status,
          targetStage: record.targetStage,
          workset: record.workset as Prisma.InputJsonValue,
          options: record.options as Prisma.InputJsonValue,
          dryRunEstimate: record.dryRunEstimate as Prisma.InputJsonValue,
          totals: record.totals as Prisma.InputJsonValue,
          errorCode: record.errorCode,
          errorMessage: record.errorMessage,
          createdAt: new Date(record.createdAt),
          startedAt: record.startedAt ? new Date(record.startedAt) : null,
          pausedAt: record.pausedAt ? new Date(record.pausedAt) : null,
          canceledAt: record.canceledAt ? new Date(record.canceledAt) : null,
          finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
          updatedAt: new Date(record.updatedAt),
        },
      });
      if (items.length > 0) {
        await tx.literatureContentProcessingBatchItem.createMany({
          data: items.map((item) => ({
            id: item.id,
            jobId: item.jobId,
            literatureId: item.literatureId,
            status: item.status,
            requestedStages: item.requestedStages,
            nextStageIndex: item.nextStageIndex,
            pipelineRunId: item.pipelineRunId,
            attemptCount: item.attemptCount,
            errorCode: item.errorCode,
            errorMessage: item.errorMessage,
            blockerCode: item.blockerCode,
            retryable: item.retryable,
            checkpoint: item.checkpoint as Prisma.InputJsonValue,
            createdAt: new Date(item.createdAt),
            startedAt: item.startedAt ? new Date(item.startedAt) : null,
            finishedAt: item.finishedAt ? new Date(item.finishedAt) : null,
            updatedAt: new Date(item.updatedAt),
          })),
        });
      }
      return job;
    });
    return toContentProcessingBatchJobRecord(created);
  }

  async findContentProcessingBatchJobById(
    jobId: string,
  ): Promise<LiteratureContentProcessingBatchJobRecord | null> {
    const row = await this.prisma.literatureContentProcessingBatchJob.findUnique({
      where: { id: jobId },
    });
    return row ? toContentProcessingBatchJobRecord(row) : null;
  }

  async listContentProcessingBatchJobs(limit?: number): Promise<LiteratureContentProcessingBatchJobRecord[]> {
    const rows = await this.prisma.literatureContentProcessingBatchJob.findMany({
      orderBy: { createdAt: 'desc' },
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    });
    return rows.map((row) => toContentProcessingBatchJobRecord(row));
  }

  async updateContentProcessingBatchJob(
    jobId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchJobRecord, 'id' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchJobRecord> {
    const updated = await this.prisma.literatureContentProcessingBatchJob.update({
      where: { id: jobId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.targetStage !== undefined ? { targetStage: patch.targetStage } : {}),
        ...(patch.workset !== undefined ? { workset: patch.workset as Prisma.InputJsonValue } : {}),
        ...(patch.options !== undefined ? { options: patch.options as Prisma.InputJsonValue } : {}),
        ...(patch.dryRunEstimate !== undefined ? { dryRunEstimate: patch.dryRunEstimate as Prisma.InputJsonValue } : {}),
        ...(patch.totals !== undefined ? { totals: patch.totals as Prisma.InputJsonValue } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null } : {}),
        ...(patch.pausedAt !== undefined ? { pausedAt: patch.pausedAt ? new Date(patch.pausedAt) : null } : {}),
        ...(patch.canceledAt !== undefined ? { canceledAt: patch.canceledAt ? new Date(patch.canceledAt) : null } : {}),
        ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null } : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toContentProcessingBatchJobRecord(updated);
  }

  async deleteContentProcessingBatchJob(jobId: string): Promise<void> {
    await this.prisma.literatureContentProcessingBatchJob.delete({
      where: { id: jobId },
    });
  }

  async listContentProcessingBatchItemsByJobId(jobId: string): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    const rows = await this.prisma.literatureContentProcessingBatchItem.findMany({
      where: { jobId },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
    return rows.map((row) => toContentProcessingBatchItemRecord(row));
  }

  async listContentProcessingBatchItemsByJobIdAndStatuses(
    jobId: string,
    statuses: LiteratureContentProcessingBatchItemStatus[],
    limit?: number,
  ): Promise<LiteratureContentProcessingBatchItemRecord[]> {
    if (statuses.length === 0) {
      return [];
    }
    const rows = await this.prisma.literatureContentProcessingBatchItem.findMany({
      where: {
        jobId,
        status: {
          in: statuses,
        },
      },
      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    });
    return rows.map((row) => toContentProcessingBatchItemRecord(row));
  }

  async updateContentProcessingBatchItem(
    itemId: string,
    patch: Partial<Omit<LiteratureContentProcessingBatchItemRecord, 'id' | 'jobId' | 'literatureId' | 'createdAt'>>,
  ): Promise<LiteratureContentProcessingBatchItemRecord> {
    const updated = await this.prisma.literatureContentProcessingBatchItem.update({
      where: { id: itemId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.requestedStages !== undefined ? { requestedStages: patch.requestedStages } : {}),
        ...(patch.nextStageIndex !== undefined ? { nextStageIndex: patch.nextStageIndex } : {}),
        ...(patch.pipelineRunId !== undefined ? { pipelineRunId: patch.pipelineRunId } : {}),
        ...(patch.attemptCount !== undefined ? { attemptCount: patch.attemptCount } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.blockerCode !== undefined ? { blockerCode: patch.blockerCode } : {}),
        ...(patch.retryable !== undefined ? { retryable: patch.retryable } : {}),
        ...(patch.checkpoint !== undefined ? { checkpoint: patch.checkpoint as Prisma.InputJsonValue } : {}),
        ...(patch.startedAt !== undefined ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null } : {}),
        ...(patch.finishedAt !== undefined ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null } : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toContentProcessingBatchItemRecord(updated);
  }
}
