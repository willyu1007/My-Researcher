import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  LiteraturePipelineArtifactRecord,
  LiteraturePipelineRunRecord,
  LiteraturePipelineRunStepRecord,
  LiteraturePipelineStageStateRecord,
  LiteraturePipelineStateRecord,
} from '../../literature-repository.js';
import {
  toPipelineArtifactRecord,
  toPipelineRunRecord,
  toPipelineRunStepRecord,
  toPipelineStageStateRecord,
  toPipelineStateRecord,
} from './prisma-literature-record-mappers.js';

export class PrismaLiteraturePipelineStore {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertPipelineState(
    record: LiteraturePipelineStateRecord,
  ): Promise<{ record: LiteraturePipelineStateRecord; created: boolean }> {
    const existing = await this.prisma.literaturePipelineState.findUnique({
      where: { literatureId: record.literatureId },
    });

    if (existing) {
      const updated = await this.prisma.literaturePipelineState.update({
        where: { id: existing.id },
        data: {
          citationComplete: record.citationComplete,
          abstractReady: record.abstractReady,
          keyContentReady: record.keyContentReady,
          dedupStatus: record.dedupStatus,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPipelineStateRecord(updated), created: false };
    }

    const created = await this.prisma.literaturePipelineState.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        citationComplete: record.citationComplete,
        abstractReady: record.abstractReady,
        keyContentReady: record.keyContentReady,
        dedupStatus: record.dedupStatus,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPipelineStateRecord(created), created: true };
  }

  async findPipelineStateByLiteratureId(literatureId: string): Promise<LiteraturePipelineStateRecord | null> {
    const row = await this.prisma.literaturePipelineState.findUnique({
      where: { literatureId },
    });
    return row ? toPipelineStateRecord(row) : null;
  }

  async listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStateRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }

    const rows = await this.prisma.literaturePipelineState.findMany({
      where: {
        literatureId: {
          in: literatureIds,
        },
      },
    });
    return rows.map((row) => toPipelineStateRecord(row));
  }

  async upsertPipelineStageState(
    record: LiteraturePipelineStageStateRecord,
  ): Promise<{ record: LiteraturePipelineStageStateRecord; created: boolean }> {
    const existing = await this.prisma.literaturePipelineStageState.findUnique({
      where: {
        literatureId_stageCode: {
          literatureId: record.literatureId,
          stageCode: record.stageCode,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.literaturePipelineStageState.update({
        where: { id: existing.id },
        data: {
          status: record.status,
          lastRunId: record.lastRunId,
          detail: record.detail as Prisma.InputJsonValue,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPipelineStageStateRecord(updated), created: false };
    }

    const created = await this.prisma.literaturePipelineStageState.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        stageCode: record.stageCode,
        status: record.status,
        lastRunId: record.lastRunId,
        detail: record.detail as Prisma.InputJsonValue,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPipelineStageStateRecord(created), created: true };
  }

  async listPipelineStageStatesByLiteratureId(literatureId: string): Promise<LiteraturePipelineStageStateRecord[]> {
    const rows = await this.prisma.literaturePipelineStageState.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toPipelineStageStateRecord(row));
  }

  async listPipelineStageStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineStageStateRecord[]> {
    if (literatureIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.literaturePipelineStageState.findMany({
      where: {
        literatureId: {
          in: literatureIds,
        },
      },
    });
    return rows.map((row) => toPipelineStageStateRecord(row));
  }

  async upsertPipelineArtifact(
    record: LiteraturePipelineArtifactRecord,
  ): Promise<{ record: LiteraturePipelineArtifactRecord; created: boolean }> {
    const existing = await this.prisma.literaturePipelineArtifact.findUnique({
      where: {
        literatureId_stageCode_artifactType: {
          literatureId: record.literatureId,
          stageCode: record.stageCode,
          artifactType: record.artifactType,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.literaturePipelineArtifact.update({
        where: { id: existing.id },
        data: {
          payload: record.payload as Prisma.InputJsonValue,
          checksum: record.checksum,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toPipelineArtifactRecord(updated), created: false };
    }

    const created = await this.prisma.literaturePipelineArtifact.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        stageCode: record.stageCode,
        artifactType: record.artifactType,
        payload: record.payload as Prisma.InputJsonValue,
        checksum: record.checksum,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toPipelineArtifactRecord(created), created: true };
  }

  async findPipelineArtifact(
    literatureId: string,
    stageCode: LiteraturePipelineArtifactRecord['stageCode'],
    artifactType: LiteraturePipelineArtifactRecord['artifactType'],
  ): Promise<LiteraturePipelineArtifactRecord | null> {
    const row = await this.prisma.literaturePipelineArtifact.findUnique({
      where: {
        literatureId_stageCode_artifactType: {
          literatureId,
          stageCode,
          artifactType,
        },
      },
    });
    return row ? toPipelineArtifactRecord(row) : null;
  }

  async listPipelineArtifactsByLiteratureId(literatureId: string): Promise<LiteraturePipelineArtifactRecord[]> {
    const rows = await this.prisma.literaturePipelineArtifact.findMany({
      where: { literatureId },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toPipelineArtifactRecord(row));
  }

  async createPipelineRun(record: LiteraturePipelineRunRecord): Promise<LiteraturePipelineRunRecord> {
    const created = await this.prisma.literaturePipelineRun.create({
      data: {
        id: record.id,
        literatureId: record.literatureId,
        triggerSource: record.triggerSource,
        status: record.status,
        requestedStages: record.requestedStages,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        createdAt: new Date(record.createdAt),
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
        updatedAt: new Date(record.updatedAt),
      },
    });
    return toPipelineRunRecord(created);
  }

  async findPipelineRunById(runId: string): Promise<LiteraturePipelineRunRecord | null> {
    const row = await this.prisma.literaturePipelineRun.findUnique({
      where: { id: runId },
    });
    return row ? toPipelineRunRecord(row) : null;
  }

  async listInFlightPipelineRunsByLiteratureId(literatureId: string): Promise<LiteraturePipelineRunRecord[]> {
    const rows = await this.prisma.literaturePipelineRun.findMany({
      where: {
        literatureId,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => toPipelineRunRecord(row));
  }

  async listPipelineRunsByLiteratureId(literatureId: string, limit?: number): Promise<LiteraturePipelineRunRecord[]> {
    const rows = await this.prisma.literaturePipelineRun.findMany({
      where: { literatureId },
      orderBy: { createdAt: 'desc' },
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    });
    return rows.map((row) => toPipelineRunRecord(row));
  }

  async updatePipelineRun(
    runId: string,
    patch: Partial<Omit<LiteraturePipelineRunRecord, 'id' | 'literatureId' | 'triggerSource' | 'createdAt'>>,
  ): Promise<LiteraturePipelineRunRecord> {
    const updated = await this.prisma.literaturePipelineRun.update({
      where: { id: runId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.requestedStages !== undefined ? { requestedStages: patch.requestedStages } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
          : {}),
        ...(patch.finishedAt !== undefined
          ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
          : {}),
        ...(patch.updatedAt !== undefined ? { updatedAt: new Date(patch.updatedAt) } : {}),
      },
    });
    return toPipelineRunRecord(updated);
  }

  async createPipelineRunStep(record: LiteraturePipelineRunStepRecord): Promise<LiteraturePipelineRunStepRecord> {
    const created = await this.prisma.literaturePipelineRunStep.create({
      data: {
        id: record.id,
        runId: record.runId,
        stageCode: record.stageCode,
        status: record.status,
        inputRef: record.inputRef as Prisma.InputJsonValue,
        outputRef: record.outputRef as Prisma.InputJsonValue,
        errorCode: record.errorCode,
        errorMessage: record.errorMessage,
        startedAt: record.startedAt ? new Date(record.startedAt) : null,
        finishedAt: record.finishedAt ? new Date(record.finishedAt) : null,
      },
    });
    return toPipelineRunStepRecord(created);
  }

  async updatePipelineRunStep(
    stepId: string,
    patch: Partial<Omit<LiteraturePipelineRunStepRecord, 'id' | 'runId' | 'stageCode'>>,
  ): Promise<LiteraturePipelineRunStepRecord> {
    const updated = await this.prisma.literaturePipelineRunStep.update({
      where: { id: stepId },
      data: {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.inputRef !== undefined ? { inputRef: patch.inputRef as Prisma.InputJsonValue } : {}),
        ...(patch.outputRef !== undefined ? { outputRef: patch.outputRef as Prisma.InputJsonValue } : {}),
        ...(patch.errorCode !== undefined ? { errorCode: patch.errorCode } : {}),
        ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
        ...(patch.startedAt !== undefined
          ? { startedAt: patch.startedAt ? new Date(patch.startedAt) : null }
          : {}),
        ...(patch.finishedAt !== undefined
          ? { finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : null }
          : {}),
      },
    });
    return toPipelineRunStepRecord(updated);
  }

  async listPipelineRunStepsByRunId(runId: string): Promise<LiteraturePipelineRunStepRecord[]> {
    const rows = await this.prisma.literaturePipelineRunStep.findMany({
      where: { runId },
      orderBy: [
        { startedAt: 'asc' },
        { id: 'asc' },
      ],
    });
    return rows.map((row) => toPipelineRunStepRecord(row));
  }
}
