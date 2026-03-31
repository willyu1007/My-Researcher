import { Prisma, type PrismaClient } from '@prisma/client';
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
} from '../../research-argument/graph-kinds.js';
import type {
  ResearchArgumentGraphObjectFilter,
  ResearchArgumentGraphObjectLookup,
  ResearchArgumentReportProjectionFilter,
  ResearchArgumentRepository,
} from '../research-argument.repository.js';
import {
  toBranchRecord,
  toDecisionRecord,
  toGraphObjectRecord,
  toGraphObjectWrite,
  toInputJsonValue,
  toLessonRecord,
  toReportProjectionRecord,
  toStateSnapshotRecord,
  toWorkspaceRecord,
} from './research-argument-prisma-mappers.js';

type PrismaDbClient = PrismaClient | Prisma.TransactionClient;

export class PrismaResearchArgumentRepository implements ResearchArgumentRepository {
  constructor(
    private readonly root: PrismaClient,
    private readonly db: PrismaDbClient = root,
  ) {}

  async withTransaction<T>(
    callback: (repository: ResearchArgumentRepository) => Promise<T>,
  ): Promise<T> {
    if (this.db !== this.root) {
      return callback(this);
    }

    return this.root.$transaction(async (transaction) =>
      callback(new PrismaResearchArgumentRepository(this.root, transaction)),
    );
  }

  async createWorkspace(
    workspace: ResearchArgumentWorkspace,
  ): Promise<ResearchArgumentWorkspace> {
    const created = await this.db.researchArgumentWorkspace.create({
      data: {
        id: workspace.workspace_id,
        titleCardId: workspace.title_card_id,
        workspaceStatus: workspace.workspace_status,
        activeBranchId: workspace.active_branch_id ?? null,
        currentStage: workspace.current_stage,
        sourceTraceRefs: toInputJsonValue(workspace.source_trace_refs),
        reportPointers: toInputJsonValue(workspace.report_pointers),
        paperId: workspace.paper_id ?? null,
        syncEligibility: workspace.sync_eligibility,
        authorizationMetadata: workspace.authorization_metadata
          ? toInputJsonValue(workspace.authorization_metadata)
          : Prisma.JsonNull,
        gitWeakMappingRefs: toInputJsonValue(workspace.git_weak_mapping_refs ?? []),
        auditRef: workspace.audit_ref ?? null,
        createdAt: new Date(workspace.created_at),
        updatedAt: new Date(workspace.updated_at),
      },
    });
    return toWorkspaceRecord(created);
  }

  async updateWorkspace(
    workspaceId: string,
    patch: Partial<ResearchArgumentWorkspace>,
  ): Promise<ResearchArgumentWorkspace> {
    const updated = await this.db.researchArgumentWorkspace.update({
      where: { id: workspaceId },
      data: {
        ...(patch.title_card_id !== undefined ? { titleCardId: patch.title_card_id } : {}),
        ...(patch.workspace_status !== undefined
          ? { workspaceStatus: patch.workspace_status }
          : {}),
        ...(patch.active_branch_id !== undefined
          ? { activeBranchId: patch.active_branch_id ?? null }
          : {}),
        ...(patch.current_stage !== undefined ? { currentStage: patch.current_stage } : {}),
        ...(patch.source_trace_refs !== undefined
          ? { sourceTraceRefs: toInputJsonValue(patch.source_trace_refs) }
          : {}),
        ...(patch.report_pointers !== undefined
          ? { reportPointers: toInputJsonValue(patch.report_pointers) }
          : {}),
        ...(patch.paper_id !== undefined ? { paperId: patch.paper_id ?? null } : {}),
        ...(patch.sync_eligibility !== undefined
          ? { syncEligibility: patch.sync_eligibility }
          : {}),
        ...(patch.authorization_metadata !== undefined
          ? {
              authorizationMetadata: patch.authorization_metadata
                ? toInputJsonValue(patch.authorization_metadata)
                : Prisma.JsonNull,
            }
          : {}),
        ...(patch.git_weak_mapping_refs !== undefined
          ? { gitWeakMappingRefs: toInputJsonValue(patch.git_weak_mapping_refs) }
          : {}),
        ...(patch.audit_ref !== undefined ? { auditRef: patch.audit_ref ?? null } : {}),
        ...(patch.updated_at !== undefined ? { updatedAt: new Date(patch.updated_at) } : {}),
      },
    });
    return toWorkspaceRecord(updated);
  }

  async findWorkspaceById(
    workspaceId: string,
  ): Promise<ResearchArgumentWorkspace | null> {
    const workspace = await this.db.researchArgumentWorkspace.findUnique({
      where: { id: workspaceId },
    });
    return workspace ? toWorkspaceRecord(workspace) : null;
  }

  async createBranch(branch: ResearchBranch): Promise<ResearchBranch> {
    const created = await this.db.researchArgumentBranch.create({
      data: {
        id: branch.branch_id,
        workspaceId: branch.workspace_id,
        branchName: branch.branch_name,
        branchStatus: branch.branch_status,
        parentBranchId: branch.parent_branch_id ?? null,
        hypothesisSummary: branch.hypothesis_summary ?? null,
        branchReason: branch.branch_reason ?? null,
        decisionRefs: toInputJsonValue(branch.decision_refs ?? []),
        createdAt: new Date(branch.created_at),
        updatedAt: new Date(branch.updated_at),
      },
    });
    return toBranchRecord(created);
  }

  async updateBranch(
    branchId: string,
    patch: Partial<ResearchBranch>,
  ): Promise<ResearchBranch> {
    const updated = await this.db.researchArgumentBranch.update({
      where: { id: branchId },
      data: {
        ...(patch.workspace_id !== undefined ? { workspaceId: patch.workspace_id } : {}),
        ...(patch.branch_name !== undefined ? { branchName: patch.branch_name } : {}),
        ...(patch.branch_status !== undefined ? { branchStatus: patch.branch_status } : {}),
        ...(patch.parent_branch_id !== undefined
          ? { parentBranchId: patch.parent_branch_id ?? null }
          : {}),
        ...(patch.hypothesis_summary !== undefined
          ? { hypothesisSummary: patch.hypothesis_summary ?? null }
          : {}),
        ...(patch.branch_reason !== undefined
          ? { branchReason: patch.branch_reason ?? null }
          : {}),
        ...(patch.decision_refs !== undefined
          ? { decisionRefs: toInputJsonValue(patch.decision_refs) }
          : {}),
        ...(patch.updated_at !== undefined ? { updatedAt: new Date(patch.updated_at) } : {}),
      },
    });
    return toBranchRecord(updated);
  }

  async findBranchById(branchId: string): Promise<ResearchBranch | null> {
    const branch = await this.db.researchArgumentBranch.findUnique({
      where: { id: branchId },
    });
    return branch ? toBranchRecord(branch) : null;
  }

  async listBranchesByWorkspaceId(workspaceId: string): Promise<ResearchBranch[]> {
    const rows = await this.db.researchArgumentBranch.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toBranchRecord(row));
  }

  async upsertGraphObject<K extends ResearchArgumentGraphObjectKind>(
    objectKind: K,
    object: ResearchArgumentGraphObjectKindMap[K],
  ): Promise<ResearchArgumentGraphObjectKindMap[K]> {
    const payload = toGraphObjectWrite(objectKind, object as ResearchArgumentGraphObject);
    const updated = await this.db.researchArgumentGraphObject.upsert({
      where: {
        workspaceId_branchId_objectId: {
          workspaceId: payload.workspaceId,
          branchId: payload.branchId,
          objectId: payload.objectId,
        },
      },
      update: {
        workspaceId: payload.workspaceId,
        branchId: payload.branchId,
        objectKind: payload.objectKind,
        payload: payload.payload,
        updatedAt: payload.updatedAt,
      },
      create: payload,
    });
    return toGraphObjectRecord(objectKind, updated);
  }

  async findGraphObjectById<K extends ResearchArgumentGraphObjectKind>(
    lookup: ResearchArgumentGraphObjectLookup<K>,
  ): Promise<ResearchArgumentGraphObjectKindMap[K] | null> {
    const row = await this.db.researchArgumentGraphObject.findUnique({
      where: {
        workspaceId_branchId_objectId: {
          workspaceId: lookup.workspace_id,
          branchId: lookup.branch_id,
          objectId: lookup.object_id,
        },
      },
    });
    if (!row || row.objectKind !== lookup.object_kind) {
      return null;
    }
    return toGraphObjectRecord(lookup.object_kind, row);
  }

  async listGraphObjects(
    filter: ResearchArgumentGraphObjectFilter,
  ): Promise<ResearchArgumentGraphObject[]> {
    const rows = await this.db.researchArgumentGraphObject.findMany({
      where: {
        workspaceId: filter.workspace_id,
        ...(filter.branch_id ? { branchId: filter.branch_id } : {}),
        ...(filter.object_kinds
          ? { objectKind: { in: filter.object_kinds as string[] } }
          : {}),
      },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) =>
      toGraphObjectRecord(
        row.objectKind as ResearchArgumentGraphObjectKind,
        row,
      ) as ResearchArgumentGraphObject,
    );
  }

  async appendStateSnapshot(
    snapshot: AbstractStateSnapshot,
  ): Promise<AbstractStateSnapshot> {
    const created = await this.db.researchArgumentStateSnapshot.create({
      data: {
        id: snapshot.snapshot_id,
        workspaceId: snapshot.workspace_id,
        branchId: snapshot.branch_id,
        stage: snapshot.stage,
        dimensions: toInputJsonValue(snapshot.dimensions),
        globalFlags: toInputJsonValue(snapshot.global_flags),
        derived: toInputJsonValue(snapshot.derived),
        version: snapshot.version,
        createdAt: new Date(snapshot.created_at),
        updatedAt: new Date(snapshot.updated_at),
      },
    });
    return toStateSnapshotRecord(created);
  }

  async findLatestStateSnapshot(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot | null> {
    const row = await this.db.researchArgumentStateSnapshot.findFirst({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { version: 'desc' }],
    });
    return row ? toStateSnapshotRecord(row) : null;
  }

  async listStateSnapshots(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot[]> {
    const rows = await this.db.researchArgumentStateSnapshot.findMany({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { version: 'desc' }],
    });
    return rows.map((row) => toStateSnapshotRecord(row));
  }

  async createDecisionRecord(decision: DecisionRecord): Promise<DecisionRecord> {
    const created = await this.db.researchArgumentDecisionRecord.create({
      data: {
        id: decision.decision_id,
        workspaceId: decision.workspace_id,
        branchId: decision.branch_id,
        action: decision.action,
        reason: decision.reason,
        actor: decision.actor,
        humanConfirmed: decision.human_confirmed,
        confirmationNote: decision.confirmation_note ?? null,
        linkedObjectIds: toInputJsonValue(decision.linked_object_ids ?? []),
        auditRef: decision.audit_ref ?? null,
        createdAt: new Date(decision.created_at),
      },
    });
    return toDecisionRecord(created);
  }

  async listDecisionRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<DecisionRecord[]> {
    const rows = await this.db.researchArgumentDecisionRecord.findMany({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => toDecisionRecord(row));
  }

  async createLessonRecord(lesson: LessonRecord): Promise<LessonRecord> {
    const created = await this.db.researchArgumentLessonRecord.create({
      data: {
        id: lesson.lesson_record_id,
        workspaceId: lesson.workspace_id,
        branchId: lesson.branch_id,
        lessonType: lesson.lesson_type,
        summary: lesson.summary,
        originDecisionId: lesson.origin_decision_id ?? null,
        originRunIds: toInputJsonValue(lesson.origin_run_ids ?? []),
        applicabilityTags: toInputJsonValue(lesson.applicability_tags ?? []),
        reliability: lesson.reliability ?? null,
        createdAt: new Date(lesson.created_at),
        updatedAt: new Date(lesson.updated_at),
      },
    });
    return toLessonRecord(created);
  }

  async listLessonRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<LessonRecord[]> {
    const rows = await this.db.researchArgumentLessonRecord.findMany({
      where: {
        workspaceId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toLessonRecord(row));
  }

  async replaceReportProjections(
    workspaceId: string,
    branchId: string,
    projections: ReportProjection[],
  ): Promise<ReportProjection[]> {
    const results: ReportProjection[] = [];
    for (const projection of projections) {
      const upserted = await this.db.researchArgumentReportProjection.upsert({
        where: {
          workspaceId_branchId_reportKind: {
            workspaceId,
            branchId,
            reportKind: projection.report_kind,
          },
        },
        update: {
          summary: projection.summary,
          objectPointers: toInputJsonValue(projection.object_pointers),
          sourceTraceRefs: toInputJsonValue(projection.source_trace_refs),
          reportPointers: toInputJsonValue(projection.report_pointers ?? []),
          createdAt: new Date(projection.created_at),
          updatedAt: new Date(projection.updated_at),
        },
        create: {
          id: projection.report_projection_id,
          workspaceId: projection.workspace_id,
          branchId: projection.branch_id,
          reportKind: projection.report_kind,
          summary: projection.summary,
          objectPointers: toInputJsonValue(projection.object_pointers),
          sourceTraceRefs: toInputJsonValue(projection.source_trace_refs),
          reportPointers: toInputJsonValue(projection.report_pointers ?? []),
          createdAt: new Date(projection.created_at),
          updatedAt: new Date(projection.updated_at),
        },
      });
      results.push(toReportProjectionRecord(upserted));
    }
    return results;
  }

  async listReportProjections(
    filter: ResearchArgumentReportProjectionFilter,
  ): Promise<ReportProjection[]> {
    const rows = await this.db.researchArgumentReportProjection.findMany({
      where: {
        workspaceId: filter.workspace_id,
        ...(filter.branch_id ? { branchId: filter.branch_id } : {}),
        ...(filter.report_kinds
          ? { reportKind: { in: filter.report_kinds as string[] } }
          : {}),
      },
      orderBy: { updatedAt: 'asc' },
    });
    return rows.map((row) => toReportProjectionRecord(row));
  }
}
