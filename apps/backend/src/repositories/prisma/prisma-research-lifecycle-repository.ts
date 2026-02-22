import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  PaperProjectRecord,
  ResearchLifecycleRepository,
  SnapshotRecord,
  StageNodeRecord,
} from '../research-lifecycle-repository.js';

function toPaperRecord(row: {
  id: string;
  topicId: string;
  title: string;
  researchDirection: string;
  status: string;
  paperActiveSpFull: string | null;
  paperActiveSpPartial: string | null;
  createdAt: Date;
}): PaperProjectRecord {
  return {
    id: row.id,
    topicId: row.topicId,
    title: row.title,
    researchDirection: row.researchDirection,
    status: row.status as PaperProjectRecord['status'],
    paperActiveSpFull: row.paperActiveSpFull,
    paperActiveSpPartial: row.paperActiveSpPartial,
    createdAt: row.createdAt.toISOString(),
  };
}

function toNodeRecord(row: {
  id: string;
  paperId: string;
  stageId: string;
  moduleId: string;
  versionId: string;
  parentVersionId: string | null;
  parentNodeIds: string[];
  runId: string;
  laneId: string;
  attemptId: string;
  createdBy: string;
  createdAt: Date;
  payloadRef: string;
  nodeStatus: string;
  valueJudgement: unknown;
}): StageNodeRecord {
  return {
    id: row.id,
    paperId: row.paperId,
    stageId: row.stageId,
    moduleId: row.moduleId as StageNodeRecord['moduleId'],
    versionId: row.versionId,
    parentVersionId: row.parentVersionId ?? undefined,
    parentNodeIds: row.parentNodeIds,
    runId: row.runId,
    laneId: row.laneId,
    attemptId: row.attemptId,
    createdBy: row.createdBy as StageNodeRecord['createdBy'],
    createdAt: row.createdAt.toISOString(),
    payloadRef: row.payloadRef,
    nodeStatus: row.nodeStatus as StageNodeRecord['nodeStatus'],
    valueJudgementPayload: (row.valueJudgement as StageNodeRecord['valueJudgementPayload']) ?? undefined,
  };
}

function toSnapshotRecord(row: {
  id: string;
  paperId: string;
  snapshotType: string;
  spineType: string | null;
  nodeRefs: string[];
  claimSetHash: string;
  problemScopeHash: string;
  datasetProtocolHash: string;
  evaluationProtocolHash: string;
  createdAt: Date;
  createdBy: string;
}): SnapshotRecord {
  return {
    id: row.id,
    paperId: row.paperId,
    snapshotType: row.snapshotType as SnapshotRecord['snapshotType'],
    spineType: (row.spineType as SnapshotRecord['spineType']) ?? undefined,
    nodeRefs: row.nodeRefs,
    claimSetHash: row.claimSetHash,
    problemScopeHash: row.problemScopeHash,
    datasetProtocolHash: row.datasetProtocolHash,
    evaluationProtocolHash: row.evaluationProtocolHash,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy as SnapshotRecord['createdBy'],
  };
}

export class PrismaResearchLifecycleRepository implements ResearchLifecycleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countPapers(): Promise<number> {
    return this.prisma.paperProject.count();
  }

  async countNodes(): Promise<number> {
    return this.prisma.stageNode.count();
  }

  async countSnapshots(): Promise<number> {
    return this.prisma.snapshot.count();
  }

  async createPaperProject(record: PaperProjectRecord): Promise<PaperProjectRecord> {
    const created = await this.prisma.paperProject.create({
      data: {
        id: record.id,
        topicId: record.topicId,
        title: record.title,
        researchDirection: record.researchDirection,
        status: record.status,
        paperActiveSpFull: record.paperActiveSpFull,
        paperActiveSpPartial: record.paperActiveSpPartial,
        createdAt: new Date(record.createdAt),
      },
    });

    return toPaperRecord(created);
  }

  async findPaperById(paperId: string): Promise<PaperProjectRecord | null> {
    const found = await this.prisma.paperProject.findUnique({
      where: { id: paperId },
    });

    return found ? toPaperRecord(found) : null;
  }

  async updatePaperPointers(
    paperId: string,
    update: { paperActiveSpFull?: string | null; paperActiveSpPartial?: string | null },
  ): Promise<PaperProjectRecord> {
    const updated = await this.prisma.paperProject.update({
      where: { id: paperId },
      data: {
        ...(update.paperActiveSpFull !== undefined
          ? { paperActiveSpFull: update.paperActiveSpFull }
          : {}),
        ...(update.paperActiveSpPartial !== undefined
          ? { paperActiveSpPartial: update.paperActiveSpPartial }
          : {}),
      },
    });

    return toPaperRecord(updated);
  }

  async createNode(record: StageNodeRecord): Promise<StageNodeRecord> {
    const created = await this.prisma.stageNode.create({
      data: {
        id: record.id,
        paperId: record.paperId,
        stageId: record.stageId,
        moduleId: record.moduleId,
        versionId: record.versionId,
        parentVersionId: record.parentVersionId ?? null,
        parentNodeIds: record.parentNodeIds,
        runId: record.runId,
        laneId: record.laneId,
        attemptId: record.attemptId,
        createdBy: record.createdBy,
        createdAt: new Date(record.createdAt),
        payloadRef: record.payloadRef,
        nodeStatus: record.nodeStatus,
        valueJudgement: record.valueJudgementPayload as Prisma.InputJsonValue | undefined,
      },
    });

    return toNodeRecord(created);
  }

  async findNodeById(nodeId: string): Promise<StageNodeRecord | null> {
    const found = await this.prisma.stageNode.findUnique({
      where: { id: nodeId },
    });

    return found ? toNodeRecord(found) : null;
  }

  async updateNodeStatus(
    nodeId: string,
    status: StageNodeRecord['nodeStatus'],
  ): Promise<StageNodeRecord> {
    const updated = await this.prisma.stageNode.update({
      where: { id: nodeId },
      data: {
        nodeStatus: status,
      },
    });

    return toNodeRecord(updated);
  }

  async createSnapshot(record: SnapshotRecord): Promise<SnapshotRecord> {
    const created = await this.prisma.snapshot.create({
      data: {
        id: record.id,
        paperId: record.paperId,
        snapshotType: record.snapshotType,
        spineType: record.spineType ?? null,
        nodeRefs: record.nodeRefs,
        claimSetHash: record.claimSetHash,
        problemScopeHash: record.problemScopeHash,
        datasetProtocolHash: record.datasetProtocolHash,
        evaluationProtocolHash: record.evaluationProtocolHash,
        createdAt: new Date(record.createdAt),
        createdBy: record.createdBy,
      },
    });

    return toSnapshotRecord(created);
  }

  async findSnapshotById(snapshotId: string): Promise<SnapshotRecord | null> {
    const found = await this.prisma.snapshot.findUnique({
      where: { id: snapshotId },
    });

    return found ? toSnapshotRecord(found) : null;
  }
}
