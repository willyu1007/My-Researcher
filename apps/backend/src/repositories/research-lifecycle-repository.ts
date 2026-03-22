import type {
  AnalysisContract,
  CreatedByMode,
  ModuleId,
  ValueJudgementPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-lifecycle-core-contracts';
import type {
  ArtifactBundle,
  PaperRuntimeMetric,
  ReleaseReviewDecision,
  TimelineSeverity,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-project-contracts';

export type PaperProjectRecord = {
  id: string;
  topicId: string;
  title: string;
  researchDirection: string;
  status: 'active';
  paperActiveSpFull: string | null;
  paperActiveSpPartial: string | null;
  createdAt: string;
};

export type StageNodeRecord = {
  id: string;
  paperId: string;
  stageId: string;
  moduleId: ModuleId;
  versionId: string;
  parentVersionId?: string;
  parentNodeIds: string[];
  runId: string;
  laneId: string;
  attemptId: string;
  createdBy: CreatedByMode;
  createdAt: string;
  payloadRef: string;
  nodeStatus: 'draft' | 'candidate' | 'promoted' | 'hold' | 'rejected' | 'superseded';
  valueJudgementPayload?: ValueJudgementPayload;
};

export type SnapshotRecord = {
  id: string;
  paperId: string;
  snapshotType: 'SP-partial' | 'SP-full';
  spineType?: AnalysisContract;
  nodeRefs: string[];
  claimSetHash: string;
  problemScopeHash: string;
  datasetProtocolHash: string;
  evaluationProtocolHash: string;
  createdAt: string;
  createdBy: CreatedByMode;
};

export type TimelineEventRecord = {
  id: string;
  paperId: string;
  eventType: string;
  moduleId?: ModuleId;
  timestamp: string;
  nodeId?: string;
  summary: string;
  severity?: TimelineSeverity;
  payload?: Record<string, unknown>;
};

export type ReleaseReviewRecord = {
  id: string;
  paperId: string;
  reviewers: string[];
  decision: ReleaseReviewDecision;
  riskFlags: string[];
  labelPolicy: string;
  comment?: string;
  reviewedAt: string;
  auditRef: string;
};

export interface ResearchLifecycleRepository {
  countPapers(): Promise<number>;
  countNodes(): Promise<number>;
  countSnapshots(): Promise<number>;

  createPaperProject(record: PaperProjectRecord): Promise<PaperProjectRecord>;
  deletePaperProject(paperId: string): Promise<void>;
  findPaperById(paperId: string): Promise<PaperProjectRecord | null>;
  updatePaperPointers(
    paperId: string,
    update: { paperActiveSpFull?: string | null; paperActiveSpPartial?: string | null },
  ): Promise<PaperProjectRecord>;

  createNode(record: StageNodeRecord): Promise<StageNodeRecord>;
  findNodeById(nodeId: string): Promise<StageNodeRecord | null>;
  listNodesByPaperId(paperId: string): Promise<StageNodeRecord[]>;
  updateNodeStatus(nodeId: string, status: StageNodeRecord['nodeStatus']): Promise<StageNodeRecord>;

  createSnapshot(record: SnapshotRecord): Promise<SnapshotRecord>;
  findSnapshotById(snapshotId: string): Promise<SnapshotRecord | null>;

  appendTimelineEvent(record: TimelineEventRecord): Promise<TimelineEventRecord>;
  listTimelineEventsByPaperId(paperId: string): Promise<TimelineEventRecord[]>;

  upsertArtifactBundle(paperId: string, patch: Partial<ArtifactBundle>): Promise<ArtifactBundle>;
  findArtifactBundleByPaperId(paperId: string): Promise<ArtifactBundle | null>;

  createReleaseReview(record: ReleaseReviewRecord): Promise<ReleaseReviewRecord>;
  listReleaseReviewsByPaperId(paperId: string): Promise<ReleaseReviewRecord[]>;

  upsertPaperRuntimeMetric(paperId: string, metric: PaperRuntimeMetric): Promise<PaperRuntimeMetric>;
  findPaperRuntimeMetricByPaperId(paperId: string): Promise<PaperRuntimeMetric | null>;
}
