import type {
  AuthorizationMetadata,
  ClaimEvidenceCoverageRow,
  DecisionRecord,
  DecisionTimelineEntry,
  GitWeakMappingRef,
  LessonRecord,
  ProtocolBaselineReproReadiness,
  ReportPointer,
  ReportProjection,
  ResearchArgumentWorkspace,
  ResearchBranch,
  SourceTraceRef,
  SyncEligibility,
  WorkspaceSummary,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import {
  buildResearchArgumentBranchGraph,
  type ResearchArgumentBranchGraph,
} from '../research-argument/branch-graph.js';
import {
  buildCoverageProjection,
  buildDecisionTimelineProjection,
  buildReadinessProjection,
} from '../research-argument/projection-builders.js';
import {
  buildClaimEvidenceCoverageRows,
  buildDecisionTimelineEntries,
  buildProtocolBaselineReproReadiness,
  buildWorkspaceSummary,
} from '../research-argument/read-models.js';
import { synthesizeAbstractStateSnapshot } from '../research-argument/state-synthesizer.js';
import { dedupeStrings } from '../research-argument/support.js';
import type {
  ResearchArgumentGraphObject,
  ResearchArgumentGraphObjectKind,
  ResearchArgumentGraphObjectKindMap,
} from '../research-argument/graph-kinds.js';
import type { ResearchArgumentRepository } from '../repositories/research-argument.repository.js';

export interface CreateResearchArgumentWorkspaceInput {
  workspace_id?: string;
  branch_id?: string;
  title_card_id: string;
  branch_name?: string;
  source_trace_refs?: SourceTraceRef[];
  sync_eligibility?: SyncEligibility;
  authorization_metadata?: AuthorizationMetadata;
  git_weak_mapping_refs?: GitWeakMappingRef[];
  audit_ref?: string;
}

export interface CreateResearchArgumentBranchInput {
  workspace_id: string;
  branch_id?: string;
  branch_name: string;
  parent_branch_id?: string;
  hypothesis_summary?: string;
  branch_reason?: string;
  activate?: boolean;
}

export interface RecordResearchArgumentDecisionInput {
  decision_id?: string;
  workspace_id: string;
  branch_id: string;
  action: DecisionRecord['action'];
  reason: string;
  actor: DecisionRecord['actor'];
  human_confirmed: boolean;
  confirmation_note?: string;
  linked_object_ids?: string[];
  audit_ref?: string;
}

export interface RecordResearchArgumentLessonInput {
  lesson_record_id?: string;
  workspace_id: string;
  branch_id: string;
  lesson_type: LessonRecord['lesson_type'];
  summary: string;
  origin_decision_id?: string;
  origin_run_ids?: string[];
  applicability_tags?: string[];
  reliability?: number;
}

export interface ResearchArgumentRecomputeResult {
  workspace: ResearchArgumentWorkspace;
  branch: ResearchBranch;
  snapshot: AbstractStateSnapshot;
  summary: WorkspaceSummary;
  coverage_rows: ClaimEvidenceCoverageRow[];
  protocol_baseline_repro_readiness: ProtocolBaselineReproReadiness;
  decision_timeline: DecisionTimelineEntry[];
  report_projections: ReportProjection[];
}

export class ResearchArgumentService {
  constructor(private readonly repository: ResearchArgumentRepository) {}

  async createWorkspaceSkeleton(
    input: CreateResearchArgumentWorkspaceInput,
  ): Promise<ResearchArgumentRecomputeResult> {
    return this.repository.withTransaction(async (repository) => {
      const now = nowIso();
      const workspaceId = input.workspace_id ?? buildId('ra_ws');
      const branchId = input.branch_id ?? buildId('ra_branch');

      const workspace: ResearchArgumentWorkspace = {
        workspace_id: workspaceId,
        title_card_id: input.title_card_id,
        workspace_status: 'active',
        active_branch_id: branchId,
        current_stage: 'Stage1_WorthContinuing',
        source_trace_refs: input.source_trace_refs ?? [],
        report_pointers: [],
        sync_eligibility: input.sync_eligibility ?? 'local_only',
        authorization_metadata: input.authorization_metadata,
        git_weak_mapping_refs: input.git_weak_mapping_refs,
        audit_ref: input.audit_ref,
        created_at: now,
        updated_at: now,
      };
      const branch: ResearchBranch = {
        branch_id: branchId,
        workspace_id: workspaceId,
        branch_name: input.branch_name ?? 'main',
        branch_status: 'active',
        decision_refs: [],
        created_at: now,
        updated_at: now,
      };

      await repository.createWorkspace(workspace);
      await repository.createBranch(branch);
      return this.recomputeInternal(repository, workspaceId, branchId, now);
    });
  }

  async updateWorkspace(
    workspaceId: string,
    patch: Partial<ResearchArgumentWorkspace>,
  ): Promise<ResearchArgumentWorkspace> {
    return this.repository.withTransaction(async (repository) => {
      const workspace = await mustFindWorkspace(repository, workspaceId);
      const nextPatch: Partial<ResearchArgumentWorkspace> = {
        ...patch,
        updated_at: patch.updated_at ?? nowIso(),
      };

      if (patch.active_branch_id !== undefined) {
        const activeBranch = await mustFindBranchInWorkspace(
          repository,
          workspaceId,
          patch.active_branch_id,
        );
        const snapshot = await repository.findLatestStateSnapshot(
          workspaceId,
          activeBranch.branch_id,
        );
        const reportProjections = await repository.listReportProjections({
          workspace_id: workspaceId,
          branch_id: activeBranch.branch_id,
        });
        nextPatch.current_stage = snapshot?.stage ?? workspace.current_stage;
        nextPatch.report_pointers = mergeProjectionReportPointers(
          workspace.report_pointers,
          reportProjections,
        );
      }

      return repository.updateWorkspace(workspaceId, nextPatch);
    });
  }

  async createBranch(input: CreateResearchArgumentBranchInput): Promise<ResearchBranch> {
    return this.repository.withTransaction(async (repository) => {
      const workspace = await mustFindWorkspace(repository, input.workspace_id);
      const now = nowIso();
      const branch: ResearchBranch = {
        branch_id: input.branch_id ?? buildId('ra_branch'),
        workspace_id: input.workspace_id,
        branch_name: input.branch_name,
        branch_status: 'active',
        parent_branch_id: input.parent_branch_id,
        hypothesis_summary: input.hypothesis_summary,
        branch_reason: input.branch_reason,
        decision_refs: [],
        created_at: now,
        updated_at: now,
      };
      const created = await repository.createBranch(branch);
      if (input.activate || !workspace.active_branch_id) {
        await repository.updateWorkspace(workspace.workspace_id, {
          active_branch_id: created.branch_id,
          updated_at: now,
        });
      }
      const recompute = await this.recomputeInternal(
        repository,
        input.workspace_id,
        created.branch_id,
        now,
      );
      return recompute.branch;
    });
  }

  async updateBranch(
    branchId: string,
    patch: Partial<ResearchBranch>,
  ): Promise<ResearchBranch> {
    return this.repository.withTransaction(async (repository) => {
      const current = await mustFindBranch(repository, branchId);
      if (
        patch.workspace_id !== undefined
        && patch.workspace_id !== current.workspace_id
      ) {
        throw new Error(
          `Research argument branch ${branchId} cannot be moved across workspaces.`,
        );
      }
      return repository.updateBranch(branchId, {
        ...patch,
        workspace_id: current.workspace_id,
        updated_at: patch.updated_at ?? nowIso(),
      });
    });
  }

  async upsertGraphObject<K extends ResearchArgumentGraphObjectKind>(
    objectKind: K,
    object: ResearchArgumentGraphObjectKindMap[K],
  ): Promise<ResearchArgumentRecomputeResult> {
    return this.repository.withTransaction(async (repository) => {
      await mustFindWorkspace(repository, object.workspace_id);
      await mustFindBranchInWorkspace(
        repository,
        object.workspace_id,
        object.branch_id,
      );
      await repository.upsertGraphObject(objectKind, object);
      return this.recomputeInternal(
        repository,
        object.workspace_id,
        object.branch_id,
        nowIso(),
      );
    });
  }

  async recordDecision(
    input: RecordResearchArgumentDecisionInput,
  ): Promise<{ decision: DecisionRecord; result: ResearchArgumentRecomputeResult }> {
    return this.repository.withTransaction(async (repository) => {
      const workspace = await mustFindWorkspace(repository, input.workspace_id);
      const branch = await mustFindBranchInWorkspace(
        repository,
        input.workspace_id,
        input.branch_id,
      );
      const now = nowIso();
      const decision: DecisionRecord = {
        decision_id: input.decision_id ?? buildId('ra_decision'),
        workspace_id: input.workspace_id,
        branch_id: input.branch_id,
        action: input.action,
        reason: input.reason,
        actor: input.actor,
        human_confirmed: input.human_confirmed,
        confirmation_note: input.confirmation_note,
        linked_object_ids: input.linked_object_ids,
        audit_ref: input.audit_ref,
        created_at: now,
      };

      await repository.createDecisionRecord(decision);

      const nextDecisionRefs = dedupeStrings([
        ...(branch.decision_refs ?? []),
        decision.decision_id,
      ]);
      await repository.updateBranch(branch.branch_id, {
        branch_status: branchStatusForDecision(branch.branch_status, input.action),
        decision_refs: nextDecisionRefs,
        updated_at: now,
      });

      const workspacePatch = workspacePatchForDecision(
        workspace,
        branch.branch_id,
        input.action,
        now,
      );
      if (workspacePatch) {
        await repository.updateWorkspace(workspace.workspace_id, workspacePatch);
      }

      const result = await this.recomputeInternal(
        repository,
        input.workspace_id,
        input.branch_id,
        now,
      );
      return { decision, result };
    });
  }

  async recordLesson(input: RecordResearchArgumentLessonInput): Promise<LessonRecord> {
    return this.repository.withTransaction(async (repository) => {
      await mustFindWorkspace(repository, input.workspace_id);
      await mustFindBranchInWorkspace(
        repository,
        input.workspace_id,
        input.branch_id,
      );
      const now = nowIso();
      const lesson: LessonRecord = {
        lesson_record_id: input.lesson_record_id ?? buildId('ra_lesson'),
        workspace_id: input.workspace_id,
        branch_id: input.branch_id,
        lesson_type: input.lesson_type,
        summary: input.summary,
        origin_decision_id: input.origin_decision_id,
        origin_run_ids: input.origin_run_ids,
        applicability_tags: input.applicability_tags,
        reliability: input.reliability,
        created_at: now,
        updated_at: now,
      };
      return repository.createLessonRecord(lesson);
    });
  }

  async recompute(
    workspaceId: string,
    branchId?: string,
  ): Promise<ResearchArgumentRecomputeResult> {
    return this.repository.withTransaction(async (repository) => {
      const workspace = await mustFindWorkspace(repository, workspaceId);
      const resolvedBranchId = branchId ?? workspace.active_branch_id;
      if (!resolvedBranchId) {
        throw new Error(`Workspace ${workspaceId} has no active branch to recompute.`);
      }
      return this.recomputeInternal(repository, workspaceId, resolvedBranchId, nowIso());
    });
  }

  async getWorkspaceSummary(workspaceId: string): Promise<WorkspaceSummary> {
    const workspace = await mustFindWorkspace(this.repository, workspaceId);
    const branchId = await resolveBranchId(this.repository, workspace, undefined);
    const context = await this.loadBranchContext(workspaceId, branchId);
    return buildWorkspaceSummary(context);
  }

  async getLatestAbstractStateSnapshot(
    workspaceId: string,
    branchId?: string,
  ): Promise<AbstractStateSnapshot | null> {
    const workspace = await mustFindWorkspace(this.repository, workspaceId);
    const resolvedBranchId = await resolveBranchId(this.repository, workspace, branchId);
    return this.repository.findLatestStateSnapshot(workspaceId, resolvedBranchId);
  }

  async listClaimEvidenceCoverageRows(
    workspaceId: string,
    branchId?: string,
  ): Promise<ClaimEvidenceCoverageRow[]> {
    const context = await this.loadBranchContextForQuery(workspaceId, branchId);
    return buildClaimEvidenceCoverageRows(context.graph);
  }

  async getProtocolBaselineReproReadiness(
    workspaceId: string,
    branchId?: string,
  ): Promise<ProtocolBaselineReproReadiness> {
    const context = await this.loadBranchContextForQuery(workspaceId, branchId);
    if (!context.snapshot) {
      throw new Error(`Workspace ${workspaceId} does not have a state snapshot yet.`);
    }
    return buildProtocolBaselineReproReadiness({
      workspace_id: workspaceId,
      branch_id: context.branch.branch_id,
      graph: context.graph,
      snapshot: context.snapshot,
    });
  }

  async listDecisionTimelineEntries(
    workspaceId: string,
    branchId?: string,
  ): Promise<DecisionTimelineEntry[]> {
    const context = await this.loadBranchContextForQuery(workspaceId, branchId);
    return buildDecisionTimelineEntries(context.decisions, context.graph);
  }

  async listLessonRecords(
    workspaceId: string,
    branchId?: string,
  ): Promise<LessonRecord[]> {
    const workspace = await mustFindWorkspace(this.repository, workspaceId);
    const resolvedBranchId = await resolveBranchId(this.repository, workspace, branchId);
    return this.repository.listLessonRecords(workspaceId, resolvedBranchId);
  }

  async listReportProjections(
    workspaceId: string,
    branchId?: string,
  ): Promise<ReportProjection[]> {
    const workspace = await mustFindWorkspace(this.repository, workspaceId);
    const resolvedBranchId = await resolveBranchId(this.repository, workspace, branchId);
    return this.repository.listReportProjections({
      workspace_id: workspaceId,
      branch_id: resolvedBranchId,
    });
  }

  private async recomputeInternal(
    repository: ResearchArgumentRepository,
    workspaceId: string,
    branchId: string,
    now: string,
  ): Promise<ResearchArgumentRecomputeResult> {
    const context = await this.loadBranchContextFromRepository(
      repository,
      workspaceId,
      branchId,
    );
    const snapshot = synthesizeAbstractStateSnapshot({
      workspace_id: workspaceId,
      branch_id: branchId,
      graph: context.graph,
      previous_snapshot: context.snapshot,
      snapshot_id: buildId('ra_snapshot'),
      now,
    });
    await repository.appendStateSnapshot(snapshot);

    const decisionTimeline = buildDecisionTimelineEntries(context.decisions, context.graph);
    const coverageRows = buildClaimEvidenceCoverageRows(context.graph);
    const readiness = buildProtocolBaselineReproReadiness({
      workspace_id: workspaceId,
      branch_id: branchId,
      graph: context.graph,
      snapshot,
    });

    const projections = await repository.replaceReportProjections(workspaceId, branchId, [
      buildCoverageProjection({
        workspace_id: workspaceId,
        branch_id: branchId,
        rows: coverageRows,
        now,
      }),
      buildReadinessProjection({
        snapshot,
        readiness,
        analysis_finding_ids: context.graph.analysis_findings.map(
          (finding) => finding.analysis_finding_id,
        ),
        now,
      }),
      buildDecisionTimelineProjection({
        workspace_id: workspaceId,
        branch_id: branchId,
        timeline: decisionTimeline,
        now,
      }),
    ]);

    const shouldRefreshWorkspaceSurface =
      !context.workspace.active_branch_id
      || context.workspace.active_branch_id === branchId;
    const updatedWorkspace = shouldRefreshWorkspaceSurface
      ? await repository.updateWorkspace(workspaceId, {
          active_branch_id: context.workspace.active_branch_id ?? branchId,
          current_stage: snapshot.stage,
          report_pointers: mergeProjectionReportPointers(
            context.workspace.report_pointers,
            projections,
          ),
          updated_at: now,
        })
      : context.workspace;
    const updatedBranch = await repository.updateBranch(branchId, {
      updated_at: now,
    });
    const summaryContext = shouldRefreshWorkspaceSurface
      ? {
          graph: context.graph,
          snapshot,
          reportProjections: projections,
        }
      : await this.loadSummaryContextForActiveBranch(repository, updatedWorkspace);

    return {
      workspace: updatedWorkspace,
      branch: updatedBranch,
      snapshot,
      summary: buildWorkspaceSummary({
        workspace: updatedWorkspace,
        graph: summaryContext.graph,
        snapshot: summaryContext.snapshot,
        reportProjections: summaryContext.reportProjections,
      }),
      coverage_rows: coverageRows,
      protocol_baseline_repro_readiness: readiness,
      decision_timeline: decisionTimeline,
      report_projections: projections,
    };
  }

  private async loadBranchContext(
    workspaceId: string,
    branchId: string,
  ): Promise<{
    workspace: ResearchArgumentWorkspace;
    branch: ResearchBranch;
    graph: ResearchArgumentBranchGraph;
    snapshot: AbstractStateSnapshot | null;
    decisions: DecisionRecord[];
    reportProjections: ReportProjection[];
  }> {
    return this.loadBranchContextFromRepository(this.repository, workspaceId, branchId);
  }

  private async loadBranchContextForQuery(
    workspaceId: string,
    branchId?: string,
  ): Promise<{
    workspace: ResearchArgumentWorkspace;
    branch: ResearchBranch;
    graph: ResearchArgumentBranchGraph;
    snapshot: AbstractStateSnapshot | null;
    decisions: DecisionRecord[];
    reportProjections: ReportProjection[];
  }> {
    const workspace = await mustFindWorkspace(this.repository, workspaceId);
    const resolvedBranchId = await resolveBranchId(this.repository, workspace, branchId);
    return this.loadBranchContext(workspaceId, resolvedBranchId);
  }

  private async loadSummaryContextForActiveBranch(
    repository: ResearchArgumentRepository,
    workspace: ResearchArgumentWorkspace,
  ): Promise<{
    graph: ResearchArgumentBranchGraph;
    snapshot: AbstractStateSnapshot | null;
    reportProjections: ReportProjection[];
  }> {
    if (!workspace.active_branch_id) {
      return {
        graph: buildResearchArgumentBranchGraph([]),
        snapshot: null,
        reportProjections: [],
      };
    }

    const context = await this.loadBranchContextFromRepository(
      repository,
      workspace.workspace_id,
      workspace.active_branch_id,
    );
    return {
      graph: context.graph,
      snapshot: context.snapshot,
      reportProjections: context.reportProjections,
    };
  }

  private async loadBranchContextFromRepository(
    repository: ResearchArgumentRepository,
    workspaceId: string,
    branchId: string,
  ): Promise<{
    workspace: ResearchArgumentWorkspace;
    branch: ResearchBranch;
    graph: ResearchArgumentBranchGraph;
    snapshot: AbstractStateSnapshot | null;
    decisions: DecisionRecord[];
    reportProjections: ReportProjection[];
  }> {
    const workspace = await mustFindWorkspace(repository, workspaceId);
    const branch = await mustFindBranch(repository, branchId);
    if (branch.workspace_id !== workspaceId) {
      throw new Error(`Branch ${branchId} does not belong to workspace ${workspaceId}.`);
    }
    const [objects, snapshot, decisions, reportProjections] = await Promise.all([
      repository.listGraphObjects({ workspace_id: workspaceId, branch_id: branchId }),
      repository.findLatestStateSnapshot(workspaceId, branchId),
      repository.listDecisionRecords(workspaceId, branchId),
      repository.listReportProjections({ workspace_id: workspaceId, branch_id: branchId }),
    ]);
    return {
      workspace,
      branch,
      graph: buildResearchArgumentBranchGraph(objects as ResearchArgumentGraphObject[]),
      snapshot,
      decisions,
      reportProjections,
    };
  }
}

async function mustFindWorkspace(
  repository: ResearchArgumentRepository,
  workspaceId: string,
): Promise<ResearchArgumentWorkspace> {
  const workspace = await repository.findWorkspaceById(workspaceId);
  if (!workspace) {
    throw new Error(`Research argument workspace ${workspaceId} not found.`);
  }
  return workspace;
}

async function mustFindBranch(
  repository: ResearchArgumentRepository,
  branchId: string,
): Promise<ResearchBranch> {
  const branch = await repository.findBranchById(branchId);
  if (!branch) {
    throw new Error(`Research argument branch ${branchId} not found.`);
  }
  return branch;
}

async function mustFindBranchInWorkspace(
  repository: ResearchArgumentRepository,
  workspaceId: string,
  branchId: string | undefined,
): Promise<ResearchBranch> {
  if (!branchId) {
    throw new Error(`Research argument workspace ${workspaceId} is missing a branch id.`);
  }
  const branch = await mustFindBranch(repository, branchId);
  if (branch.workspace_id !== workspaceId) {
    throw new Error(`Research argument branch ${branchId} does not belong to workspace ${workspaceId}.`);
  }
  return branch;
}

async function resolveBranchId(
  repository: ResearchArgumentRepository,
  workspace: ResearchArgumentWorkspace,
  branchId?: string,
): Promise<string> {
  if (branchId) {
    return branchId;
  }
  if (workspace.active_branch_id) {
    return workspace.active_branch_id;
  }
  const branches = await repository.listBranchesByWorkspaceId(workspace.workspace_id);
  const firstActiveBranch = branches.find((branch) => branch.branch_status === 'active');
  if (!firstActiveBranch) {
    throw new Error(`Workspace ${workspace.workspace_id} has no active branch.`);
  }
  return firstActiveBranch.branch_id;
}

function mergeProjectionReportPointers(
  currentPointers: ReportPointer[],
  projections: ReportProjection[],
): ReportPointer[] {
  const projectionKinds = new Set<string>(
    projections.map((projection) => projection.report_kind),
  );
  const retained = currentPointers.filter(
    (pointer) => !projectionKinds.has(pointer.report_kind),
  );
  return [
    ...retained,
    ...projections.map((projection) => ({
      report_kind: projection.report_kind,
      report_id: projection.report_projection_id,
      summary: projection.summary,
      object_pointers: projection.object_pointers,
    })),
  ];
}

function branchStatusForDecision(
  currentStatus: ResearchBranch['branch_status'],
  action: DecisionRecord['action'],
): ResearchBranch['branch_status'] {
  switch (action) {
    case 'archive':
      return 'archived';
    case 'kill':
      return 'killed';
    case 'merge':
      return 'merged';
    case 'reopen':
      return 'active';
    default:
      return currentStatus;
  }
}

function workspacePatchForDecision(
  workspace: ResearchArgumentWorkspace,
  branchId: string,
  action: DecisionRecord['action'],
  now: string,
): Partial<ResearchArgumentWorkspace> | null {
  if (workspace.active_branch_id && workspace.active_branch_id !== branchId) {
    return null;
  }

  switch (action) {
    case 'archive':
      return { workspace_status: 'archived', updated_at: now };
    case 'kill':
      return { workspace_status: 'killed', updated_at: now };
    case 'reopen':
      return {
        workspace_status: 'active',
        active_branch_id: branchId,
        updated_at: now,
      };
    default:
      return { updated_at: now };
  }
}

function buildId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso(): string {
  return new Date().toISOString();
}
