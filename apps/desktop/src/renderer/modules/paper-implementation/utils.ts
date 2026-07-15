import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  DecisionWorkQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  ValidationPlanningReviewItem,
  ValidationUpstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  MotivePortfolioDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  AgentWorkflowHarnessRun,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  ClaimCandidate,
  ImplementationDossier,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  PaperImplementationQueueItem,
} from './types';
import type {
  PaperImplementationWorkbenchReadModels,
} from './api';
import {
  formatCurrency,
  formatTimestamp as formatLocaleTimestamp,
} from '../../literature/shared/formatters';

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败。';
}

/**
 * Readable Chinese labels for the full DecisionWorkQueue queue_type enum
 * (S4-D narrowed the classification, `unclassified` is the explicit residual
 * bucket for blocker codes outside the enum mapping tables).
 */
export const DECISION_QUEUE_TYPE_LABELS: Record<string, string> = {
  human_review: '人工评审',
  trace_repair: '溯源修复',
  gate_blocker: '闸门阻断',
  failed_workflow: '工作流失败',
  failed_run_review: '失败 run 评审',
  stale_evidence_recheck: '证据过期复检',
  accepted_risk_expiry: '风险接受到期',
  loop_budget_review: '循环预算评审',
  unclassified: '未分类（残余）',
};

export function decisionQueueTypeLabel(queueType: string): string {
  return DECISION_QUEUE_TYPE_LABELS[queueType] ?? queueType;
}

export function formatUsd(value: number | null | undefined): string {
  // Reuse the literature-shared currency formatter for the actual rendering
  // and `--` fallback; only normalize the extra undefined/NaN inputs this
  // module's telemetry aggregates can surface (formatCurrency accepts number | null).
  if (value === null || value === undefined || Number.isNaN(value)) {
    return formatCurrency(null);
  }
  return formatCurrency(value);
}

/** Renders a 0..1 rate as a percentage string, e.g. 0.4 -> "40.0%". */
export function formatRatePercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '--';
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function truncateHash(value: string | null | undefined, length = 16): string {
  if (!value) {
    return '--';
  }
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export function formatTimestamp(value: string | null | undefined): string {
  // Use the literature-shared locale formatter so timestamp display matches the
  // rest of the desktop (previously this rendered the raw ISO string). Tolerate
  // the null/undefined inputs this module's records can carry before delegating.
  if (!value) {
    return '--';
  }
  return formatLocaleTimestamp(value);
}

export function prettyJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

export function parseJsonObject(input: string): Record<string, unknown> {
  const parsed = JSON.parse(input) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON payload must be an object.');
  }
  return parsed as Record<string, unknown>;
}

export function formatRef(ref: TopicSelectionFunctionalRef | null | undefined): string {
  if (!ref) {
    return '--';
  }
  const version = ref.version_id ? `@${ref.version_id}` : '';
  return `${ref.ref_type}:${ref.ref_id}${version}`;
}

export function compactList(items: readonly string[], fallback = '--'): string {
  if (items.length === 0) {
    return fallback;
  }
  return items.join(', ');
}

export function statusTone(value: string | null | undefined): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (!value) {
    return 'neutral';
  }
  if ([
    'active',
    'fresh',
    'complete',
    'completed',
    'resolved',
    'ready_for_writing',
    'passed',
    'pass',
    'supported',
    'trusted',
    'succeeded',
    'accepted_by_state_writer',
    'dispatched',
    'applied',
  ].includes(value)) {
    return 'success';
  }
  if ([
    'blocked',
    'broken',
    'failed',
    'failed_runtime',
    'cancelled',
    'aborted',
    'rejected',
    'invalidated',
    'untrusted',
  ].includes(value)) {
    return 'danger';
  }
  if ([
    'stale',
    'partial',
    'open',
    'in_progress',
    'advancing',
    'needs_review',
    'needs_more_evidence',
    'trace_partial',
    'experiment_partial',
    'claim_partial',
    'warning',
    'inconclusive',
    'negative',
    'waiting_review',
    'budget_exhausted',
    'parked_with_reopen_condition',
  ].includes(value)) {
    return 'warning';
  }
  return 'info';
}

function mapDecisionWorkQueueItem(item: DecisionWorkQueueItem): PaperImplementationQueueItem {
  const traceRef = item.created_from_refs.find((ref) => ref.ref_type.includes('trace'));
  const gateRef = item.created_from_refs.find((ref) => ref.ref_type.includes('gate'));
  const riskRefs = item.created_from_refs.filter((ref) => ref.ref_type.includes('risk'));
  return {
    itemId: item.queue_item_id,
    source: 'decision_work_queue',
    type: item.queue_type,
    stage: item.stage,
    priority: item.priority,
    status: item.status,
    summary: item.recommended_actions[0] ?? item.dedup_key,
    targetRef: item.target_ref,
    sourceRefs: item.created_from_refs,
    traceManifestId: traceRef?.ref_id ?? null,
    gateResultId: gateRef?.ref_id ?? null,
    blockers: item.blocking_transition_keys,
    risks: riskRefs.map(formatRef),
    recommendedActions: item.recommended_actions,
    createdAt: item.created_at,
    raw: item,
  };
}

function mapTraceRepairQueueItem(item: TraceRepairQueueItem): PaperImplementationQueueItem {
  return {
    itemId: item.queue_item_id,
    source: 'trace_repair_queue',
    type: 'trace_repair',
    stage: item.lineage_type,
    priority: item.severity === 'critical' ? 'critical' : item.severity === 'blocking' ? 'high' : 'medium',
    status: item.status,
    summary: item.blocker_code,
    targetRef: item.target_ref,
    sourceRefs: item.source_ref ? [item.source_ref] : [],
    traceManifestId: item.trace_manifest_id,
    gateResultId: null,
    blockers: [item.blocker_code],
    risks: [],
    recommendedActions: ['resolve trace repair item after backend authority has been corrected'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapValidationReviewItem(item: ValidationPlanningReviewItem): PaperImplementationQueueItem {
  return {
    itemId: item.review_item_id,
    source: 'validation_review',
    type: item.item_kind,
    stage: item.validation_cycle_id ?? 'validation_planning',
    priority: item.severity === 'critical' ? 'critical' : item.severity === 'blocking' ? 'high' : 'medium',
    status: item.status,
    summary: item.summary,
    targetRef: item.validation_cycle_id
      ? { ref_type: 'validation_cycle', ref_id: item.validation_cycle_id }
      : null,
    sourceRefs: item.source_refs,
    traceManifestId: null,
    gateResultId: null,
    blockers: item.blocker_code ? [item.blocker_code] : [],
    risks: [],
    recommendedActions: ['review validation budget or loop condition in backend workflow'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapUpstreamFeedbackCandidate(item: ValidationUpstreamFeedbackCandidate): PaperImplementationQueueItem {
  return {
    itemId: item.candidate_id,
    source: 'upstream_feedback',
    type: item.feedback_type,
    stage: item.validation_cycle_id ?? 'upstream_feedback',
    priority: item.severity === 'critical' ? 'critical' : item.severity === 'blocking' ? 'high' : 'medium',
    status: item.candidate_status,
    summary: item.summary,
    targetRef: item.feedback_event_ref ?? null,
    sourceRefs: [...item.source_object_refs, ...item.evidence_refs],
    traceManifestId: null,
    gateResultId: null,
    blockers: item.recommended_upstream_action === 'none' ? [] : [item.recommended_upstream_action],
    risks: [],
    recommendedActions: ['dispatch upstream feedback through T-093 feedback service'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapPortfolioDecision(item: MotivePortfolioDecision): PaperImplementationQueueItem | null {
  if (item.applied_at) {
    return null;
  }
  return {
    itemId: item.portfolio_decision_id,
    source: 'portfolio_decision',
    type: 'portfolio_decision',
    stage: 'motive_portfolio',
    priority: item.confirmation_level === 'human_confirmed' ? 'medium' : 'high',
    status: item.applied_at ? 'applied' : 'pending',
    summary: `primary=${item.motive_roles_after_decision.primary_motive_ids.length}, active=${item.active_motive_count}`,
    targetRef: { ref_type: 'motive_portfolio_decision', ref_id: item.portfolio_decision_id },
    sourceRefs: [],
    traceManifestId: null,
    gateResultId: null,
    blockers: item.confirmed_by ? [] : ['confirmation_required'],
    risks: Object.values(item.rationale).filter(Boolean),
    recommendedActions: ['apply portfolio decision through backend command'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapFailedWorkflow(item: AgentWorkflowHarnessRun): PaperImplementationQueueItem | null {
  if (!['failed', 'blocked', 'retried'].includes(item.run_status)) {
    return null;
  }
  return {
    itemId: item.harness_run_id,
    source: 'failed_workflow',
    type: item.workflow_type,
    stage: 'agent_workflow_harness',
    priority: item.run_status === 'failed' ? 'high' : 'medium',
    status: item.run_status,
    summary: compactList(item.blocked_reasons, item.workflow_type),
    targetRef: { ref_type: 'agent_workflow_harness_run', ref_id: item.harness_run_id },
    sourceRefs: item.raw_output_artifact_ref ? [item.raw_output_artifact_ref] : [],
    traceManifestId: null,
    gateResultId: item.gate_result_id ?? null,
    blockers: item.blocked_reasons,
    risks: item.memo_as_evidence_detected ? ['memo_as_evidence_detected'] : [],
    recommendedActions: ['review proposal artifacts and rerun through backend harness'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapFailedRun(item: RunEvidenceUnit): PaperImplementationQueueItem | null {
  if (!['failed', 'cancelled', 'inconclusive', 'negative'].includes(item.run_status)) {
    return null;
  }
  return {
    itemId: item.run_evidence_unit_id,
    source: 'failed_run',
    type: item.run_type,
    stage: item.validation_cycle_id,
    priority: item.run_status === 'failed' ? 'high' : 'medium',
    status: item.run_status,
    summary: item.failure_summary ?? `${item.run_type} ${item.run_status}`,
    targetRef: { ref_type: 'run_evidence_unit', ref_id: item.run_evidence_unit_id },
    sourceRefs: [
      { ref_type: 'research_work_order', ref_id: item.work_order_id },
      ...item.evidence_candidate_refs,
    ],
    traceManifestId: item.trace_manifest_id,
    gateResultId: null,
    blockers: item.failure_summary_id ? [item.failure_summary_id] : [],
    risks: item.trusted_status === 'trusted' ? [] : [item.trusted_status],
    recommendedActions: ['review failed or negative run before claim/dossier admission'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapClaimBoundary(item: ClaimCandidate): PaperImplementationQueueItem | null {
  if (![
    'request_scope_narrowing',
    'request_additional_evidence',
    'request_reinterpretation',
    'blocked',
  ].includes(item.boundary_gate_status)) {
    return null;
  }
  return {
    itemId: item.claim_candidate_id,
    source: 'claim_boundary',
    type: item.claim_type,
    stage: 'claim_boundary',
    priority: item.boundary_gate_status === 'blocked' ? 'high' : 'medium',
    status: item.boundary_gate_status,
    summary: item.claim_statement,
    targetRef: { ref_type: 'claim_candidate', ref_id: item.claim_candidate_id },
    sourceRefs: [...item.support_refs, ...item.challenge_refs],
    traceManifestId: item.trace_manifest_id,
    gateResultId: item.boundary.boundary_gate_result_id ?? null,
    blockers: item.boundary.forbidden_overclaims,
    risks: item.boundary.required_followup_refs.map(formatRef),
    recommendedActions: ['resolve claim boundary through backend claim/dossier flow'],
    createdAt: item.created_at,
    raw: item,
  };
}

function mapDossierReadiness(item: ImplementationDossier): PaperImplementationQueueItem | null {
  if (!['blocked', 'trace_partial', 'experiment_partial', 'claim_partial', 'parked_with_reopen_condition'].includes(item.dossier_status)) {
    return null;
  }
  return {
    itemId: item.dossier_id,
    source: 'dossier_readiness',
    type: 'implementation_dossier',
    stage: 'dossier_readiness',
    priority: item.dossier_status === 'blocked' ? 'high' : 'medium',
    status: item.dossier_status,
    summary: compactList(item.readiness.readiness_notes, `dossier ${item.dossier_status}`),
    targetRef: { ref_type: 'implementation_dossier', ref_id: item.dossier_id, version_id: String(item.dossier_version) },
    sourceRefs: item.readiness.blocker_refs,
    traceManifestId: item.trace_manifest_id,
    gateResultId: item.readiness_gate_result_id ?? item.readiness.readiness_gate_result_id ?? null,
    blockers: item.readiness.blocker_refs.map(formatRef),
    risks: item.readiness.warning_refs.map(formatRef),
    recommendedActions: ['resolve dossier blockers before writing entry projection'],
    createdAt: item.created_at,
    raw: item,
  };
}

export function buildPaperImplementationQueue(
  readModels: PaperImplementationWorkbenchReadModels,
): PaperImplementationQueueItem[] {
  const items: PaperImplementationQueueItem[] = [
    ...readModels.decisionWorkQueue.map(mapDecisionWorkQueueItem),
    ...readModels.traceRepairQueue.map(mapTraceRepairQueueItem),
    ...readModels.validationPlanningReviewItems.map(mapValidationReviewItem),
    ...readModels.validationUpstreamFeedbackCandidates.map(mapUpstreamFeedbackCandidate),
    ...readModels.motivePortfolioDecisions.map(mapPortfolioDecision).filter((item): item is PaperImplementationQueueItem => item !== null),
    ...readModels.agentWorkflowHarnessRuns.map(mapFailedWorkflow).filter((item): item is PaperImplementationQueueItem => item !== null),
    ...readModels.runEvidenceUnits.map(mapFailedRun).filter((item): item is PaperImplementationQueueItem => item !== null),
    ...readModels.claimCandidates.map(mapClaimBoundary).filter((item): item is PaperImplementationQueueItem => item !== null),
    ...readModels.implementationDossiers.map(mapDossierReadiness).filter((item): item is PaperImplementationQueueItem => item !== null),
  ];

  const priorityRank: Record<PaperImplementationQueueItem['priority'], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return items.sort((left, right) => {
    const priorityDelta = priorityRank[left.priority] - priorityRank[right.priority];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? ''));
  });
}
