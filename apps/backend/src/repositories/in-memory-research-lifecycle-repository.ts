import type {
  ReleaseReviewRecord,
  TimelineEventRecord,
  PaperProjectRecord,
  ResearchLifecycleRepository,
  SnapshotRecord,
  StageNodeRecord,
} from './research-lifecycle-repository.js';
import type {
  ArtifactBundle,
  PaperRuntimeMetric,
} from '@paper-engineering-assistant/shared';

export class InMemoryResearchLifecycleRepository implements ResearchLifecycleRepository {
  private readonly papers = new Map<string, PaperProjectRecord>();
  private readonly nodes = new Map<string, StageNodeRecord>();
  private readonly snapshots = new Map<string, SnapshotRecord>();
  private readonly timelineEvents = new Map<string, TimelineEventRecord[]>();
  private readonly artifactBundles = new Map<string, ArtifactBundle>();
  private readonly releaseReviews = new Map<string, ReleaseReviewRecord[]>();
  private readonly runtimeMetrics = new Map<string, PaperRuntimeMetric>();

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

  async listNodesByPaperId(paperId: string): Promise<StageNodeRecord[]> {
    return [...this.nodes.values()].filter((node) => node.paperId === paperId);
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

  async appendTimelineEvent(record: TimelineEventRecord): Promise<TimelineEventRecord> {
    const current = this.timelineEvents.get(record.paperId) ?? [];
    this.timelineEvents.set(record.paperId, [...current, record]);
    return record;
  }

  async listTimelineEventsByPaperId(paperId: string): Promise<TimelineEventRecord[]> {
    return this.timelineEvents.get(paperId) ?? [];
  }

  async upsertArtifactBundle(
    paperId: string,
    patch: Partial<ArtifactBundle>,
  ): Promise<ArtifactBundle> {
    const current: ArtifactBundle = this.artifactBundles.get(paperId) ?? {
      proposal_url: null,
      paper_url: null,
      repo_url: null,
      review_url: null,
    };

    const next: ArtifactBundle = {
      ...current,
      ...patch,
    };

    this.artifactBundles.set(paperId, next);
    return next;
  }

  async findArtifactBundleByPaperId(paperId: string): Promise<ArtifactBundle | null> {
    return this.artifactBundles.get(paperId) ?? null;
  }

  async createReleaseReview(record: ReleaseReviewRecord): Promise<ReleaseReviewRecord> {
    const current = this.releaseReviews.get(record.paperId) ?? [];
    this.releaseReviews.set(record.paperId, [...current, record]);
    return record;
  }

  async listReleaseReviewsByPaperId(paperId: string): Promise<ReleaseReviewRecord[]> {
    return this.releaseReviews.get(paperId) ?? [];
  }

  async upsertPaperRuntimeMetric(
    paperId: string,
    metric: PaperRuntimeMetric,
  ): Promise<PaperRuntimeMetric> {
    this.runtimeMetrics.set(paperId, metric);
    return metric;
  }

  async findPaperRuntimeMetricByPaperId(paperId: string): Promise<PaperRuntimeMetric | null> {
    return this.runtimeMetrics.get(paperId) ?? null;
  }
}
