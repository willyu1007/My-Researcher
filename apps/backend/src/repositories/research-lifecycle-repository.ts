import type {
  AnalysisContract,
  CreatedByMode,
  ModuleId,
  ValueJudgementPayload,
} from '@paper-engineering-assistant/shared';

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

export interface ResearchLifecycleRepository {
  countPapers(): Promise<number>;
  countNodes(): Promise<number>;
  countSnapshots(): Promise<number>;

  createPaperProject(record: PaperProjectRecord): Promise<PaperProjectRecord>;
  findPaperById(paperId: string): Promise<PaperProjectRecord | null>;
  updatePaperPointers(
    paperId: string,
    update: { paperActiveSpFull?: string | null; paperActiveSpPartial?: string | null },
  ): Promise<PaperProjectRecord>;

  createNode(record: StageNodeRecord): Promise<StageNodeRecord>;
  findNodeById(nodeId: string): Promise<StageNodeRecord | null>;
  updateNodeStatus(nodeId: string, status: StageNodeRecord['nodeStatus']): Promise<StageNodeRecord>;

  createSnapshot(record: SnapshotRecord): Promise<SnapshotRecord>;
  findSnapshotById(snapshotId: string): Promise<SnapshotRecord | null>;
}
