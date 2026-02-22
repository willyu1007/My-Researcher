import type {
  PaperProjectRecord,
  ResearchLifecycleRepository,
  SnapshotRecord,
  StageNodeRecord,
} from './research-lifecycle-repository.js';

export class InMemoryResearchLifecycleRepository implements ResearchLifecycleRepository {
  private readonly papers = new Map<string, PaperProjectRecord>();
  private readonly nodes = new Map<string, StageNodeRecord>();
  private readonly snapshots = new Map<string, SnapshotRecord>();

  async countPapers(): Promise<number> {
    return this.papers.size;
  }

  async countNodes(): Promise<number> {
    return this.nodes.size;
  }

  async countSnapshots(): Promise<number> {
    return this.snapshots.size;
  }

  async createPaperProject(record: PaperProjectRecord): Promise<PaperProjectRecord> {
    this.papers.set(record.id, record);
    return record;
  }

  async findPaperById(paperId: string): Promise<PaperProjectRecord | null> {
    return this.papers.get(paperId) ?? null;
  }

  async updatePaperPointers(
    paperId: string,
    update: { paperActiveSpFull?: string | null; paperActiveSpPartial?: string | null },
  ): Promise<PaperProjectRecord> {
    const paper = this.papers.get(paperId);
    if (!paper) {
      throw new Error(`Paper ${paperId} not found.`);
    }

    const next: PaperProjectRecord = {
      ...paper,
      paperActiveSpFull:
        update.paperActiveSpFull === undefined ? paper.paperActiveSpFull : update.paperActiveSpFull,
      paperActiveSpPartial:
        update.paperActiveSpPartial === undefined
          ? paper.paperActiveSpPartial
          : update.paperActiveSpPartial,
    };

    this.papers.set(paperId, next);
    return next;
  }

  async createNode(record: StageNodeRecord): Promise<StageNodeRecord> {
    this.nodes.set(record.id, record);
    return record;
  }

  async findNodeById(nodeId: string): Promise<StageNodeRecord | null> {
    return this.nodes.get(nodeId) ?? null;
  }

  async updateNodeStatus(
    nodeId: string,
    status: StageNodeRecord['nodeStatus'],
  ): Promise<StageNodeRecord> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found.`);
    }

    const next: StageNodeRecord = {
      ...node,
      nodeStatus: status,
    };

    this.nodes.set(nodeId, next);
    return next;
  }

  async createSnapshot(record: SnapshotRecord): Promise<SnapshotRecord> {
    this.snapshots.set(record.id, record);
    return record;
  }

  async findSnapshotById(snapshotId: string): Promise<SnapshotRecord | null> {
    return this.snapshots.get(snapshotId) ?? null;
  }
}
