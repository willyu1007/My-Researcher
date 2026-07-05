/**
 * T-087 Phase 3.1 — v1b authority/workflow read-only API client.
 *
 * Wraps the 4 list-by-title-card endpoints added in Phase 3.1 backend so the
 * reviewer workbench v1b Stage view can render the SliceOptionSet /
 * QuestionCandidateSet / ValueAssessment / TopicPackage surfaces.
 *
 * Backend SSOT:
 *  - `apps/backend/src/routes/topic-selection-v1b-routes.ts`
 *  - `docs/context/api/openapi.yaml` (operationIds: listTopicSelectionV1b*)
 */
import { requestGovernance } from '../../../literature/shared/api';
import type {
  TopicSelectionActorRef,
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionLoopbackBudgetRaise,
  TopicSelectionProvisionalRunOverrideSignOff,
  TopicSelectionV1bWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionV1bIntakeSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import type {
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionTopicValueAssessmentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionTopicPackageRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';

export type V1bListResponse<T> = { items: T[] };

export async function listResearchSliceOptionSetsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionResearchSliceOptionSetRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionResearchSliceOptionSetRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/research-slice-option-sets`,
  });
  return payload.items ?? [];
}

export async function listTopicQuestionCandidateSetsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionTopicQuestionCandidateSetRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionTopicQuestionCandidateSetRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/topic-question-candidate-sets`,
  });
  return payload.items ?? [];
}

export async function listTopicValueAssessmentsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionTopicValueAssessmentRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionTopicValueAssessmentRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/topic-value-assessments`,
  });
  return payload.items ?? [];
}

export async function listTopicPackagesByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionTopicPackageRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionTopicPackageRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/topic-packages`,
  });
  return payload.items ?? [];
}

/**
 * Phase 3.2 — list ResearchSliceOptions for an OptionSet (picker driver).
 */
export async function listResearchSliceOptionsByOptionSet(
  optionSetId: string,
): Promise<TopicSelectionResearchSliceOptionRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionResearchSliceOptionRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/options`,
  });
  return payload.items ?? [];
}

/**
 * T-115 Phase 2 — human-authority N5 select-research-slice.
 *
 * POSTs a human selection that the backend turns into a `human_delegated`
 * workflow-harness invocation (through the harness, not a legacy direct write).
 * Returns the harness run result; `gate_status` is `admitted`/`admitted_with_warnings`
 * on success or `blocked` with blockers when the gate rejects.
 */
export type SelectResearchSliceHumanRequest = {
  selected_option_id: string;
  selection_rationale: string;
  actor: TopicSelectionActorRef;
  confidence?: number | null;
  decision_basis?: Record<string, unknown>;
  required_actions?: string[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
};

export async function selectResearchSliceHuman(
  optionSetId: string,
  body: SelectResearchSliceHumanRequest,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  return requestGovernance<TopicSelectionV1bWorkflowHarnessRunResult>({
    method: 'POST',
    path: `/topic-selection/v1b/research-slice-option-sets/${encodeURIComponent(optionSetId)}/human-selection`,
    body,
  });
}

/**
 * T-115 — list intake snapshots for a title-card (N2 constraint-profile picker).
 */
export async function listIntakeSnapshotsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionV1bIntakeSnapshotRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionV1bIntakeSnapshotRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/title-cards/${encodeURIComponent(titleCardId)}/intake-snapshots`,
  });
  return payload.items ?? [];
}

/**
 * T-115 — human-authority N2 record-research-constraint-profile. The researcher
 * authors the profile; the backend runs it through the harness in human_delegated mode.
 */
export type RecordConstraintProfileHumanRequest = {
  actor: TopicSelectionActorRef;
  profile: {
    target_community: string;
    claim_ceiling: string;
    target_venue_class?: string | null;
    intended_contribution_style?: string | null;
    method_constraints?: string[];
    resource_constraints?: string[];
    available_assets?: string[];
    feasibility_budget?: Record<string, unknown>;
    non_goals?: string[];
    human_constraint_notes?: string | null;
    constraint_payload?: Record<string, unknown>;
  };
};

export async function recordConstraintProfileHuman(
  intakeSnapshotId: string,
  body: RecordConstraintProfileHumanRequest,
): Promise<TopicSelectionV1bWorkflowHarnessRunResult> {
  return requestGovernance<TopicSelectionV1bWorkflowHarnessRunResult>({
    method: 'POST',
    path: `/topic-selection/v1b/intake-snapshots/${encodeURIComponent(intakeSnapshotId)}/constraint-profile/human`,
    body,
  });
}

/**
 * Phase 3.3 — list TopicQuestionCandidates for a CandidateSet (picker driver).
 */
export async function listTopicQuestionCandidatesByCandidateSet(
  candidateSetId: string,
): Promise<TopicSelectionTopicQuestionCandidateRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionTopicQuestionCandidateRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/topic-question-candidate-sets/${encodeURIComponent(candidateSetId)}/candidates`,
  });
  return payload.items ?? [];
}

// ---------------------------------------------------------------------------
// T-128 W-15 S3 — run-operations surface (run state + operator records + trace).

/**
 * Read-side view models for the run-state projection. The projection types are
 * deliberately COORDINATOR-LOCAL on the backend (D-T128-00 boundary discipline:
 * not a shared contract), so the workbench mirrors ONLY the fields it renders —
 * additive backend fields never break this surface.
 */
export type V1bRunAttemptSnapshotView = {
  node_attempt_id: string;
  gate_status: string;
  route_decision: string;
  trace_snapshot_ref: TopicSelectionFunctionalRef | null;
  authority_hash: string | null;
  handoff_hash: string | null;
  replayed: boolean;
  created_at: string;
  seq: number;
  blockers: Array<{ code: string; message: string }>;
  warnings: Array<{ code: string; message: string }>;
};

export type V1bRunNodeStateView = {
  node_id: string;
  node_index: number;
  attempt_count: number;
  loopback_count: number;
  latest: V1bRunAttemptSnapshotView | null;
  latest_admitted: V1bRunAttemptSnapshotView | null;
  /** W-15 D1(c) sign-off anchor: newest tripwire-carrying attempt (N8 → admitted attempt,
   *  N6 → escalation-loopback attempt). Null when the node never tripwired (all non-product runs). */
  latest_provisional_tripwire: V1bRunAttemptSnapshotView | null;
};

export type V1bRunStateView = {
  workflow_run_id: string;
  nodes: V1bRunNodeStateView[];
  last_completed_node_id: string | null;
  next_node_id: string | null;
  run_complete: boolean;
};

export async function getWorkflowRunState(workflowRunId: string): Promise<V1bRunStateView> {
  return requestGovernance<V1bRunStateView>({
    method: 'GET',
    path: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(workflowRunId)}/state`,
  });
}

export async function listWorkflowRunArtifacts(
  workflowRunId: string,
): Promise<TopicSelectionArtifactRefRecord[]> {
  const payload = await requestGovernance<V1bListResponse<TopicSelectionArtifactRefRecord>>({
    method: 'GET',
    path: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(workflowRunId)}/artifacts`,
  });
  return payload.items ?? [];
}

export async function getWorkflowTraceSnapshot(
  traceSnapshotId: string,
): Promise<TopicSelectionTraceSnapshotRecord> {
  return requestGovernance<TopicSelectionTraceSnapshotRecord>({
    method: 'GET',
    path: `/topic-selection/v1b/workflow-harness/trace-snapshots/${encodeURIComponent(traceSnapshotId)}`,
  });
}

/**
 * W-15 O-1 — record a provisional-thresholds run-override sign-off. The backend re-validates
 * strictly (W-09 pattern) and anchors the target to the run's CURRENT provisional-tripwire
 * attempt; recording an identical sign-off again is idempotent (already_recorded: true).
 */
export async function recordProvisionalSignOff(
  workflowRunId: string,
  body: TopicSelectionProvisionalRunOverrideSignOff,
): Promise<{ artifact_ref_id: string; already_recorded: boolean }> {
  return requestGovernance<{ artifact_ref_id: string; already_recorded: boolean }>({
    method: 'POST',
    path: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(workflowRunId)}/sign-offs`,
    body,
  });
}

/**
 * W-15 O-2 — record an audited loopback-budget raise for (run, node). Schema-capped at 5;
 * the coordinator's effective budget is max(call parameter, highest recorded raise).
 */
export async function recordLoopbackBudgetRaise(
  workflowRunId: string,
  body: TopicSelectionLoopbackBudgetRaise,
): Promise<{ artifact_ref_id: string }> {
  return requestGovernance<{ artifact_ref_id: string }>({
    method: 'POST',
    path: `/topic-selection/v1b/workflow-runs/${encodeURIComponent(workflowRunId)}/loopback-budget-raises`,
    body,
  });
}
