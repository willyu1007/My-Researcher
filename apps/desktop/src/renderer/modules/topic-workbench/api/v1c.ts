/**
 * T-087 Phase 4 — v1c authority/workflow API client.
 *
 * Wraps the 3 read-only list-by-title-card endpoints added in Phase 4 and
 * the existing v1c write endpoints (HumanPromotionDecision /
 * PaperProjectBridge / DownstreamFeedback). The reviewer workbench v1c
 * surfaces consume this client to render GateCheck / Decision / Commitment
 * / Bridge / Downstream cards plus their inline forms.
 *
 * Backend SSOT:
 *  - `apps/backend/src/routes/topic-selection-v1c-routes.ts`
 *  - `docs/context/api/openapi.yaml` (operationIds: listTopicSelectionV1c*)
 */
import { requestGovernance } from '../../../literature/shared/api';
import type {
  TopicSelectionActorRef,
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArgumentReadinessMiniCheckRecord,
  TopicSelectionPromotionDecisionSupportRecord,
  TopicSelectionPromotionGateCheckRecord,
  TopicSelectionPromotionGateRequiredAction,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionHumanPromotionDecisionKind,
  TopicSelectionHumanPromotionDecisionRecord,
  TopicSelectionPromotionCommitmentProfileRecord,
  TopicSelectionPromotionCondition,
  TopicSelectionPromotionDecisionBundle,
  TopicSelectionPromotionDecisionRecord,
  TopicSelectionPromotionLoopbackTarget,
  TopicSelectionAllowedPromotionRefinement,
  TopicSelectionPromotionStopOrReopenCondition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPaperProjectBridgeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import type {
  TopicSelectionDownstreamTopicFeedbackRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';

export type V1cListResponse<T> = { items: T[] };

export async function listPromotionGateChecksByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionPromotionGateCheckRecord[]> {
  const payload = await requestGovernance<V1cListResponse<TopicSelectionPromotionGateCheckRecord>>({
    method: 'GET',
    path: `/topic-selection/v1c/title-cards/${encodeURIComponent(titleCardId)}/promotion-gate-checks`,
  });
  return payload.items ?? [];
}

/**
 * T-115 (v1c decision-support) — fetch the N2 argument-readiness mini-check by id
 * (the 6 per-check verdicts behind a GateCheck's `argument_readiness_mini_check_id`).
 * Returns the bare record (controller `reply.send(result)`).
 */
export async function getArgumentReadinessMiniCheck(
  miniCheckId: string,
): Promise<TopicSelectionArgumentReadinessMiniCheckRecord> {
  return requestGovernance<TopicSelectionArgumentReadinessMiniCheckRecord>({
    method: 'GET',
    path: `/topic-selection/v1c/argument-readiness-mini-checks/${encodeURIComponent(miniCheckId)}`,
  });
}

/**
 * T-115 (v1c decision-support) — fetch the N2 promotion decision-support packet by id
 * (summary / reviewer_questions / risk_notes behind a GateCheck's `promotion_decision_support_id`).
 */
export async function getPromotionDecisionSupport(
  supportId: string,
): Promise<TopicSelectionPromotionDecisionSupportRecord> {
  return requestGovernance<TopicSelectionPromotionDecisionSupportRecord>({
    method: 'GET',
    path: `/topic-selection/v1c/promotion-decision-support/${encodeURIComponent(supportId)}`,
  });
}

export async function listPromotionDecisionsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionPromotionDecisionRecord[]> {
  const payload = await requestGovernance<V1cListResponse<TopicSelectionPromotionDecisionRecord>>({
    method: 'GET',
    path: `/topic-selection/v1c/title-cards/${encodeURIComponent(titleCardId)}/promotion-decisions`,
  });
  return payload.items ?? [];
}

export async function listPaperProjectBridgesByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionPaperProjectBridgeRecord[]> {
  const payload = await requestGovernance<V1cListResponse<TopicSelectionPaperProjectBridgeRecord>>({
    method: 'GET',
    path: `/topic-selection/v1c/title-cards/${encodeURIComponent(titleCardId)}/paper-project-bridges`,
  });
  return payload.items ?? [];
}

export async function getPromotionDecisionBundle(
  promotionDecisionId: string,
): Promise<TopicSelectionPromotionDecisionBundle> {
  return requestGovernance<TopicSelectionPromotionDecisionBundle>({
    method: 'GET',
    path: `/topic-selection/v1c/promotion-decisions/${encodeURIComponent(promotionDecisionId)}/bundle`,
  });
}

export async function getPromotionCommitmentProfile(
  commitmentProfileId: string,
): Promise<TopicSelectionPromotionCommitmentProfileRecord> {
  return requestGovernance<TopicSelectionPromotionCommitmentProfileRecord>({
    method: 'GET',
    path: `/topic-selection/v1c/promotion-commitment-profiles/${encodeURIComponent(commitmentProfileId)}`,
  });
}

export async function listDownstreamFeedbackByBridge(
  bridgeId: string,
): Promise<TopicSelectionDownstreamTopicFeedbackRecord[]> {
  const payload = await requestGovernance<V1cListResponse<TopicSelectionDownstreamTopicFeedbackRecord>>({
    method: 'GET',
    path: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/downstream-feedback`,
  });
  return payload.items ?? [];
}

/**
 * Phase 4 — record a HumanPromotionDecision. Body mirrors `humanPromotionDecisionBody`
 * in v1c-routes.ts. `decision_class === 'promote_*'` paths require
 * commitment-related fields (conditions / allowed_refinements / stop /
 * reopen conditions); the UI form enforces that downstream.
 */
export type RecordHumanPromotionDecisionRequest = {
  promotion_gate_check_id: string;
  decision: TopicSelectionHumanPromotionDecisionKind;
  human_actor: TopicSelectionActorRef;
  rationale: string;
  confirmed_snapshot_hash: string;
  decision_timestamp?: string | null;
  conditions?: TopicSelectionPromotionCondition[];
  required_actions?: TopicSelectionPromotionGateRequiredAction[];
  loopback_target?: TopicSelectionPromotionLoopbackTarget | null;
  allowed_refinements?: TopicSelectionAllowedPromotionRefinement[];
  stop_conditions?: TopicSelectionPromotionStopOrReopenCondition[];
  reopen_conditions?: TopicSelectionPromotionStopOrReopenCondition[];
};

export type RecordHumanPromotionDecisionResponse = {
  human_promotion_decision: TopicSelectionHumanPromotionDecisionRecord;
  promotion_decision: TopicSelectionPromotionDecisionRecord;
  promotion_commitment_profile?: TopicSelectionPromotionCommitmentProfileRecord | null;
};

export async function recordHumanPromotionDecision(
  body: RecordHumanPromotionDecisionRequest,
): Promise<RecordHumanPromotionDecisionResponse> {
  return requestGovernance<RecordHumanPromotionDecisionResponse>({
    method: 'POST',
    path: '/topic-selection/v1c/promotion-decisions',
    body,
  });
}

/**
 * Phase 4 — create a PaperProjectBridge from an eligible promote-class
 * PromotionDecision. Body fields mirror
 * `topicSelectionPaperProjectBridgeCreateInputSchema`.
 */
export type CreatePaperProjectBridgeRequest = {
  promotion_decision_id: string;
  created_by?: TopicSelectionActorType;
};

export async function createPaperProjectBridge(
  body: CreatePaperProjectBridgeRequest,
): Promise<TopicSelectionPaperProjectBridgeRecord> {
  return requestGovernance<TopicSelectionPaperProjectBridgeRecord>({
    method: 'POST',
    path: '/topic-selection/v1c/paper-project-bridges',
    body,
  });
}

/**
 * Phase 4 — create the downstream PaperProjectIntake hand-off (one-shot;
 * idempotent on subsequent calls).
 */
export type CreatePaperProjectIntakeRequest = {
  bridge_payload_hash: string;
  title?: string | null;
  research_direction?: string | null;
  created_by?: { actor_type: TopicSelectionActorType; actor_id?: string | null };
};

export async function createPaperProjectIntakeFromBridge(
  bridgeId: string,
  body: CreatePaperProjectIntakeRequest,
): Promise<{ paper_project_bridge: TopicSelectionPaperProjectBridgeRecord; paper_project_intake_ref: TopicSelectionFunctionalRef }> {
  return requestGovernance({
    method: 'POST',
    path: `/topic-selection/v1c/paper-project-bridges/${encodeURIComponent(bridgeId)}/paper-project-intake`,
    body,
  });
}
