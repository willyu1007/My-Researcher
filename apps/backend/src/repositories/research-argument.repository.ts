import type {
  DecisionRecord,
  LessonRecord,
  ReportProjection,
  ResearchArgumentWorkspace,
  ResearchBranch,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type {
  ResearchArgumentGraphObject,
  ResearchArgumentGraphObjectKind,
  ResearchArgumentGraphObjectKindMap,
} from '../research-argument/graph-kinds.js';

export interface ResearchArgumentGraphObjectFilter {
  workspace_id: string;
  branch_id?: string;
  object_kinds?: ResearchArgumentGraphObjectKind[];
}

export interface ResearchArgumentGraphObjectLookup<
  K extends ResearchArgumentGraphObjectKind = ResearchArgumentGraphObjectKind,
> {
  workspace_id: string;
  branch_id: string;
  object_kind: K;
  object_id: string;
}

export interface ResearchArgumentReportProjectionFilter {
  workspace_id: string;
  branch_id?: string;
  report_kinds?: ReportProjection['report_kind'][];
}

export interface ResearchArgumentRepository {
  withTransaction<T>(
    callback: (repository: ResearchArgumentRepository) => Promise<T>,
  ): Promise<T>;

  createWorkspace(workspace: ResearchArgumentWorkspace): Promise<ResearchArgumentWorkspace>;
  updateWorkspace(
    workspaceId: string,
    patch: Partial<ResearchArgumentWorkspace>,
  ): Promise<ResearchArgumentWorkspace>;
  findWorkspaceById(workspaceId: string): Promise<ResearchArgumentWorkspace | null>;

  createBranch(branch: ResearchBranch): Promise<ResearchBranch>;
  updateBranch(
    branchId: string,
    patch: Partial<ResearchBranch>,
  ): Promise<ResearchBranch>;
  findBranchById(branchId: string): Promise<ResearchBranch | null>;
  listBranchesByWorkspaceId(workspaceId: string): Promise<ResearchBranch[]>;

  upsertGraphObject<K extends ResearchArgumentGraphObjectKind>(
    objectKind: K,
    object: ResearchArgumentGraphObjectKindMap[K],
  ): Promise<ResearchArgumentGraphObjectKindMap[K]>;
  findGraphObjectById<K extends ResearchArgumentGraphObjectKind>(
    lookup: ResearchArgumentGraphObjectLookup<K>,
  ): Promise<ResearchArgumentGraphObjectKindMap[K] | null>;
  listGraphObjects(
    filter: ResearchArgumentGraphObjectFilter,
  ): Promise<ResearchArgumentGraphObject[]>;

  appendStateSnapshot(snapshot: AbstractStateSnapshot): Promise<AbstractStateSnapshot>;
  findLatestStateSnapshot(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot | null>;
  listStateSnapshots(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot[]>;

  createDecisionRecord(decision: DecisionRecord): Promise<DecisionRecord>;
  listDecisionRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<DecisionRecord[]>;

  createLessonRecord(lesson: LessonRecord): Promise<LessonRecord>;
  listLessonRecords(workspaceId: string, branchId?: string): Promise<LessonRecord[]>;

  replaceReportProjections(
    workspaceId: string,
    branchId: string,
    projections: ReportProjection[],
  ): Promise<ReportProjection[]>;
  listReportProjections(
    filter: ResearchArgumentReportProjectionFilter,
  ): Promise<ReportProjection[]>;
}
