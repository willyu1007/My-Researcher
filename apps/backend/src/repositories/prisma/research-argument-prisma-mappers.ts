import type { Prisma } from '@prisma/client';
import type {
  DecisionRecord,
  LessonRecord,
  ReportProjection,
  ResearchArgumentWorkspace,
  ResearchBranch,
} from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import type { AbstractStateSnapshot } from '@paper-engineering-assistant/shared/research-lifecycle/research-argument-contracts';
import {
  getResearchArgumentGraphObjectCreatedAt,
  getResearchArgumentGraphObjectId,
  getResearchArgumentGraphObjectUpdatedAt,
  type ResearchArgumentGraphObject,
  type ResearchArgumentGraphObjectKind,
  type ResearchArgumentGraphObjectKindMap,
} from '../../research-argument/graph-kinds.js';

export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toWorkspaceRecord(row: {
  id: string;
  titleCardId: string;
  workspaceStatus: string;
  activeBranchId: string | null;
  currentStage: string;
  sourceTraceRefs: Prisma.JsonValue;
  reportPointers: Prisma.JsonValue;
  paperId: string | null;
  syncEligibility: string;
  authorizationMetadata: Prisma.JsonValue | null;
  gitWeakMappingRefs: Prisma.JsonValue;
  auditRef: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ResearchArgumentWorkspace {
  return {
    workspace_id: row.id,
    title_card_id: row.titleCardId,
    workspace_status: row.workspaceStatus as ResearchArgumentWorkspace['workspace_status'],
    active_branch_id: row.activeBranchId ?? undefined,
    current_stage: row.currentStage as ResearchArgumentWorkspace['current_stage'],
    source_trace_refs: asArray(row.sourceTraceRefs),
    report_pointers: asArray(row.reportPointers),
    paper_id: row.paperId ?? undefined,
    sync_eligibility: row.syncEligibility as ResearchArgumentWorkspace['sync_eligibility'],
    authorization_metadata: asOptionalRecord(
      row.authorizationMetadata,
    ) as ResearchArgumentWorkspace['authorization_metadata'],
    git_weak_mapping_refs: asArray(row.gitWeakMappingRefs),
    audit_ref: row.auditRef ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toBranchRecord(row: {
  id: string;
  workspaceId: string;
  branchName: string;
  branchStatus: string;
  parentBranchId: string | null;
  hypothesisSummary: string | null;
  branchReason: string | null;
  decisionRefs: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ResearchBranch {
  return {
    branch_id: row.id,
    workspace_id: row.workspaceId,
    branch_name: row.branchName,
    branch_status: row.branchStatus as ResearchBranch['branch_status'],
    parent_branch_id: row.parentBranchId ?? undefined,
    hypothesis_summary: row.hypothesisSummary ?? undefined,
    branch_reason: row.branchReason ?? undefined,
    decision_refs: asStringArray(row.decisionRefs),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toStateSnapshotRecord(row: {
  id: string;
  workspaceId: string;
  branchId: string;
  stage: string;
  dimensions: Prisma.JsonValue;
  globalFlags: Prisma.JsonValue;
  derived: Prisma.JsonValue;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): AbstractStateSnapshot {
  return {
    snapshot_id: row.id,
    workspace_id: row.workspaceId,
    branch_id: row.branchId,
    stage: row.stage as AbstractStateSnapshot['stage'],
    dimensions: asRecord(row.dimensions) as AbstractStateSnapshot['dimensions'],
    global_flags: asRecord(row.globalFlags) as AbstractStateSnapshot['global_flags'],
    derived: asRecord(row.derived) as AbstractStateSnapshot['derived'],
    version: row.version,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toDecisionRecord(row: {
  id: string;
  workspaceId: string;
  branchId: string;
  action: string;
  reason: string;
  actor: string;
  humanConfirmed: boolean;
  confirmationNote: string | null;
  linkedObjectIds: Prisma.JsonValue;
  auditRef: string | null;
  createdAt: Date;
}): DecisionRecord {
  return {
    decision_id: row.id,
    workspace_id: row.workspaceId,
    branch_id: row.branchId,
    action: row.action as DecisionRecord['action'],
    reason: row.reason,
    actor: row.actor as DecisionRecord['actor'],
    human_confirmed: row.humanConfirmed,
    confirmation_note: row.confirmationNote ?? undefined,
    linked_object_ids: asStringArray(row.linkedObjectIds),
    audit_ref: row.auditRef ?? undefined,
    created_at: row.createdAt.toISOString(),
  };
}

export function toLessonRecord(row: {
  id: string;
  workspaceId: string;
  branchId: string;
  lessonType: string;
  summary: string;
  originDecisionId: string | null;
  originRunIds: Prisma.JsonValue;
  applicabilityTags: Prisma.JsonValue;
  reliability: number | null;
  createdAt: Date;
  updatedAt: Date;
}): LessonRecord {
  return {
    lesson_record_id: row.id,
    workspace_id: row.workspaceId,
    branch_id: row.branchId,
    lesson_type: row.lessonType as LessonRecord['lesson_type'],
    summary: row.summary,
    origin_decision_id: row.originDecisionId ?? undefined,
    origin_run_ids: asStringArray(row.originRunIds),
    applicability_tags: asStringArray(row.applicabilityTags),
    reliability: row.reliability ?? undefined,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toReportProjectionRecord(row: {
  id: string;
  workspaceId: string;
  branchId: string;
  reportKind: string;
  summary: string;
  objectPointers: Prisma.JsonValue;
  sourceTraceRefs: Prisma.JsonValue;
  reportPointers: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}): ReportProjection {
  return {
    report_projection_id: row.id,
    workspace_id: row.workspaceId,
    branch_id: row.branchId,
    report_kind: row.reportKind as ReportProjection['report_kind'],
    summary: row.summary,
    object_pointers: asArray(row.objectPointers),
    source_trace_refs: asArray(row.sourceTraceRefs),
    report_pointers: asArray(row.reportPointers),
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

export function toGraphObjectRecord<K extends ResearchArgumentGraphObjectKind>(
  objectKind: K,
  row: { payload: Prisma.JsonValue },
): ResearchArgumentGraphObjectKindMap[K] {
  void objectKind;
  return row.payload as unknown as ResearchArgumentGraphObjectKindMap[K];
}

export function toGraphObjectWrite(
  objectKind: ResearchArgumentGraphObjectKind,
  object: ResearchArgumentGraphObject,
): {
  objectId: string;
  workspaceId: string;
  branchId: string;
  objectKind: string;
  payload: Prisma.InputJsonValue;
  createdAt: Date;
  updatedAt: Date;
} {
  return {
    objectId: getResearchArgumentGraphObjectId(objectKind, object),
    workspaceId: object.workspace_id,
    branchId: object.branch_id,
    objectKind,
    payload: toInputJsonValue(object),
    createdAt: new Date(getResearchArgumentGraphObjectCreatedAt(objectKind, object)),
    updatedAt: new Date(getResearchArgumentGraphObjectUpdatedAt(objectKind, object)),
  };
}

function asStringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function asArray<T>(value: Prisma.JsonValue): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asOptionalRecord(value: Prisma.JsonValue | null): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  return asRecord(value);
}
