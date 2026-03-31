import type {
  DecisionRecord,
  LessonRecord,
  ReportProjection,
  ResearchArgumentWorkspace,
  ResearchBranch,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import {
  getResearchArgumentGraphObjectId,
  type ResearchArgumentGraphObject,
  type ResearchArgumentGraphObjectKind,
  type ResearchArgumentGraphObjectKindMap,
} from '../research-argument/graph-kinds.js';
import type {
  ResearchArgumentGraphObjectFilter,
  ResearchArgumentGraphObjectLookup,
  ResearchArgumentReportProjectionFilter,
  ResearchArgumentRepository,
} from './research-argument.repository.js';

type InMemoryResearchArgumentStore = {
  workspaces: Map<string, ResearchArgumentWorkspace>;
  branches: Map<string, ResearchBranch>;
  graphObjects: Map<string, { object_kind: ResearchArgumentGraphObjectKind; object: ResearchArgumentGraphObject }>;
  snapshots: Map<string, AbstractStateSnapshot>;
  decisions: Map<string, DecisionRecord>;
  lessons: Map<string, LessonRecord>;
  reportProjections: Map<string, ReportProjection>;
};

export class InMemoryResearchArgumentRepository
  implements ResearchArgumentRepository
{
  constructor(
    private store: InMemoryResearchArgumentStore = createEmptyStore(),
    private readonly transactional = false,
  ) {}

  async withTransaction<T>(
    callback: (repository: ResearchArgumentRepository) => Promise<T>,
  ): Promise<T> {
    if (this.transactional) {
      return callback(this);
    }

    const transactionalRepository = new InMemoryResearchArgumentRepository(
      cloneStore(this.store),
      true,
    );
    const result = await callback(transactionalRepository);
    this.store = transactionalRepository.store;
    return result;
  }

  async createWorkspace(
    workspace: ResearchArgumentWorkspace,
  ): Promise<ResearchArgumentWorkspace> {
    this.store.workspaces.set(workspace.workspace_id, structuredClone(workspace));
    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    patch: Partial<ResearchArgumentWorkspace>,
  ): Promise<ResearchArgumentWorkspace> {
    const current = this.store.workspaces.get(workspaceId);
    if (!current) {
      throw new Error(`Research argument workspace ${workspaceId} not found.`);
    }

    const next = {
      ...current,
      ...structuredClone(patch),
    };
    this.store.workspaces.set(workspaceId, next);
    return structuredClone(next);
  }

  async findWorkspaceById(
    workspaceId: string,
  ): Promise<ResearchArgumentWorkspace | null> {
    const workspace = this.store.workspaces.get(workspaceId);
    return workspace ? structuredClone(workspace) : null;
  }

  async createBranch(branch: ResearchBranch): Promise<ResearchBranch> {
    this.store.branches.set(branch.branch_id, structuredClone(branch));
    return branch;
  }

  async updateBranch(
    branchId: string,
    patch: Partial<ResearchBranch>,
  ): Promise<ResearchBranch> {
    const current = this.store.branches.get(branchId);
    if (!current) {
      throw new Error(`Research argument branch ${branchId} not found.`);
    }

    const next = {
      ...current,
      ...structuredClone(patch),
    };
    this.store.branches.set(branchId, next);
    return structuredClone(next);
  }

  async findBranchById(branchId: string): Promise<ResearchBranch | null> {
    const branch = this.store.branches.get(branchId);
    return branch ? structuredClone(branch) : null;
  }

  async listBranchesByWorkspaceId(workspaceId: string): Promise<ResearchBranch[]> {
    return [...this.store.branches.values()]
      .filter((branch) => branch.workspace_id === workspaceId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .map((branch) => structuredClone(branch));
  }

  async upsertGraphObject<K extends ResearchArgumentGraphObjectKind>(
    objectKind: K,
    object: ResearchArgumentGraphObjectKindMap[K],
  ): Promise<ResearchArgumentGraphObjectKindMap[K]> {
    const objectId = getResearchArgumentGraphObjectId(objectKind, object);
    this.store.graphObjects.set(buildGraphObjectStoreKey(
      object.workspace_id,
      object.branch_id,
      objectId,
    ), {
      object_kind: objectKind,
      object: structuredClone(object),
    });
    return structuredClone(object);
  }

  async findGraphObjectById<K extends ResearchArgumentGraphObjectKind>(
    lookup: ResearchArgumentGraphObjectLookup<K>,
  ): Promise<ResearchArgumentGraphObjectKindMap[K] | null> {
    const row = this.store.graphObjects.get(
      buildGraphObjectStoreKey(
        lookup.workspace_id,
        lookup.branch_id,
        lookup.object_id,
      ),
    );
    if (!row || row.object_kind !== lookup.object_kind) {
      return null;
    }

    return structuredClone(row.object) as ResearchArgumentGraphObjectKindMap[K];
  }

  async listGraphObjects(
    filter: ResearchArgumentGraphObjectFilter,
  ): Promise<ResearchArgumentGraphObject[]> {
    return [...this.store.graphObjects.values()]
      .filter((row) => row.object.workspace_id === filter.workspace_id)
      .filter((row) => (filter.branch_id ? row.object.branch_id === filter.branch_id : true))
      .filter((row) =>
        filter.object_kinds ? filter.object_kinds.includes(row.object_kind) : true,
      )
      .map((row) => structuredClone(row.object));
  }

  async appendStateSnapshot(
    snapshot: AbstractStateSnapshot,
  ): Promise<AbstractStateSnapshot> {
    this.store.snapshots.set(snapshot.snapshot_id, structuredClone(snapshot));
    return snapshot;
  }

  async findLatestStateSnapshot(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot | null> {
    const snapshots = await this.listStateSnapshots(workspaceId, branchId);
    return snapshots[0] ?? null;
  }

  async listStateSnapshots(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot[]> {
    return [...this.store.snapshots.values()]
      .filter((snapshot) => snapshot.workspace_id === workspaceId)
      .filter((snapshot) => (branchId ? snapshot.branch_id === branchId : true))
      .sort(compareSnapshotsDesc)
      .map((snapshot) => structuredClone(snapshot));
  }

  async createDecisionRecord(decision: DecisionRecord): Promise<DecisionRecord> {
    this.store.decisions.set(decision.decision_id, structuredClone(decision));
    return decision;
  }

  async listDecisionRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<DecisionRecord[]> {
    return [...this.store.decisions.values()]
      .filter((decision) => decision.workspace_id === workspaceId)
      .filter((decision) => (branchId ? decision.branch_id === branchId : true))
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .map((decision) => structuredClone(decision));
  }

  async createLessonRecord(lesson: LessonRecord): Promise<LessonRecord> {
    this.store.lessons.set(lesson.lesson_record_id, structuredClone(lesson));
    return lesson;
  }

  async listLessonRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<LessonRecord[]> {
    return [...this.store.lessons.values()]
      .filter((lesson) => lesson.workspace_id === workspaceId)
      .filter((lesson) => (branchId ? lesson.branch_id === branchId : true))
      .sort((left, right) => left.created_at.localeCompare(right.created_at))
      .map((lesson) => structuredClone(lesson));
  }

  async replaceReportProjections(
    workspaceId: string,
    branchId: string,
    projections: ReportProjection[],
  ): Promise<ReportProjection[]> {
    const projectionKinds = new Set(projections.map((projection) => projection.report_kind));
    for (const [projectionId, projection] of this.store.reportProjections.entries()) {
      if (
        projection.workspace_id === workspaceId
        && projection.branch_id === branchId
        && projectionKinds.has(projection.report_kind)
      ) {
        this.store.reportProjections.delete(projectionId);
      }
    }

    for (const projection of projections) {
      this.store.reportProjections.set(
        projection.report_projection_id,
        structuredClone(projection),
      );
    }
    return projections.map((projection) => structuredClone(projection));
  }

  async listReportProjections(
    filter: ResearchArgumentReportProjectionFilter,
  ): Promise<ReportProjection[]> {
    return [...this.store.reportProjections.values()]
      .filter((projection) => projection.workspace_id === filter.workspace_id)
      .filter((projection) => (filter.branch_id ? projection.branch_id === filter.branch_id : true))
      .filter((projection) =>
        filter.report_kinds ? filter.report_kinds.includes(projection.report_kind) : true,
      )
      .sort((left, right) => left.updated_at.localeCompare(right.updated_at))
      .map((projection) => structuredClone(projection));
  }
}

function createEmptyStore(): InMemoryResearchArgumentStore {
  return {
    workspaces: new Map(),
    branches: new Map(),
    graphObjects: new Map(),
    snapshots: new Map(),
    decisions: new Map(),
    lessons: new Map(),
    reportProjections: new Map(),
  };
}

function cloneStore(store: InMemoryResearchArgumentStore): InMemoryResearchArgumentStore {
  return {
    workspaces: cloneMap(store.workspaces),
    branches: cloneMap(store.branches),
    graphObjects: cloneMap(store.graphObjects),
    snapshots: cloneMap(store.snapshots),
    decisions: cloneMap(store.decisions),
    lessons: cloneMap(store.lessons),
    reportProjections: cloneMap(store.reportProjections),
  };
}

function cloneMap<T>(source: Map<string, T>): Map<string, T> {
  return new Map(
    [...source.entries()].map(([key, value]) => [key, structuredClone(value)]),
  );
}

function buildGraphObjectStoreKey(
  workspaceId: string,
  branchId: string,
  objectId: string,
): string {
  return `${workspaceId}:${branchId}:${objectId}`;
}

function compareSnapshotsDesc(
  left: AbstractStateSnapshot,
  right: AbstractStateSnapshot,
): number {
  const updatedAtCompare = right.updated_at.localeCompare(left.updated_at);
  if (updatedAtCompare !== 0) {
    return updatedAtCompare;
  }
  return right.version - left.version;
}
