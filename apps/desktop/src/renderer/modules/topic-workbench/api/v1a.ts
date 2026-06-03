/**
 * T-087 Phase 2 — v1a authority/workflow API client.
 *
 * Wraps the 4 read-only list-by-title-card endpoints added in Phase 1.6
 * (D1) and re-uses the existing `requestGovernance` transport. All endpoints
 * return `{ items: TopicSelectionXxxRecord[] }`, newest first.
 *
 * Backend SSOT:
 *  - `apps/backend/src/routes/topic-selection-v1a-routes.ts`
 *  - `docs/context/api/openapi.yaml` (operationIds: listTopicSelectionV1a*)
 */

import { requestGovernance } from '../../../literature/shared/api';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionActorRef,
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionNeedAdjudicationDecision,
  TopicSelectionNeedCandidateReadinessAssessmentRecord,
  TopicSelectionNeedCandidateRecord,
  TopicSelectionNeedLoopbackTarget,
  TopicSelectionNeedRejectedReason,
  TopicSelectionV1aToV1bInputBundleRecord,
  TopicSelectionValidatedNeedRecord,
  TopicSelectionValidateNeedAdjudicationResultRecord,
  TopicSelectionValidationDecisionSupportPacketRecord,
  TopicSelectionCandidateDecisionMemorySuggestionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionSearchPlanCoverageMatrix,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchPlanRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';

export type V1aListResponse<T> = { items: T[] };

export async function listSearchPlansByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionSearchPlanRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionSearchPlanRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/search-plans`,
  });
  return payload.items ?? [];
}

export async function listEvidenceMapsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionEvidenceMapRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionEvidenceMapRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/evidence-maps`,
  });
  return payload.items ?? [];
}

export async function listNeedCandidatesByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionNeedCandidateRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionNeedCandidateRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/need-candidates`,
  });
  return payload.items ?? [];
}

export async function listValidatedNeedsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionValidatedNeedRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionValidatedNeedRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/validated-needs`,
  });
  return payload.items ?? [];
}

export async function listSupportPacketsByNeedCandidate(
  needCandidateId: string,
): Promise<TopicSelectionValidationDecisionSupportPacketRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionValidationDecisionSupportPacketRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/need-candidates/${encodeURIComponent(needCandidateId)}/validation-support-packets`,
  });
  return payload.items ?? [];
}

/**
 * Phase 2.5 — adjudicate need candidate (POST).
 * Body fields mirror `apps/backend/src/routes/topic-selection-v1a-routes.ts:467`
 * (`adjudicationBody`). The 6-section human-confirm form in
 * `AdjudicationConfirmForm` is responsible for producing a valid payload.
 */
export type AdjudicateNeedRequest = {
  support_packet_id: string;
  final_decision: TopicSelectionNeedAdjudicationDecision;
  rationale: string;
  adjudicated_by?: TopicSelectionActorRef;
  human_actor?: TopicSelectionActorRef;
  human_rationale?: string | null;
  rejected_reason?: TopicSelectionNeedRejectedReason | null;
  loopback_target?: TopicSelectionNeedLoopbackTarget;
  required_actions?: string[];
  gap_codes?: string[];
  residual_risk_refs?: TopicSelectionFunctionalRef[];
  accepted_risk_refs?: TopicSelectionFunctionalRef[];
  merge_target_need_candidate_ref?: TopicSelectionFunctionalRef | null;
  searchplan_recheck_reason?: string;
  searchplan_recheck_gap_codes?: string[];
  decision_payload?: Record<string, unknown>;
};

export type AdjudicateNeedResponse = {
  adjudication_result: TopicSelectionValidateNeedAdjudicationResultRecord;
  need_candidate: TopicSelectionNeedCandidateRecord;
  validated_need?: TopicSelectionValidatedNeedRecord | null;
  memory_suggestion?: TopicSelectionCandidateDecisionMemorySuggestionRecord | null;
  v1b_input_bundle?: TopicSelectionV1aToV1bInputBundleRecord | null;
};

export async function adjudicateNeed(
  needCandidateId: string,
  body: AdjudicateNeedRequest,
): Promise<AdjudicateNeedResponse> {
  return requestGovernance<AdjudicateNeedResponse>({
    method: 'POST',
    path: `/topic-selection/v1a/need-candidates/${encodeURIComponent(needCandidateId)}/adjudications`,
    body,
  });
}

/**
 * Phase 2.5 — human-confirm a `validate` adjudication (N8).
 *
 * Materialises the ValidatedNeed from a `final_decision='validate'`
 * adjudication. `adjudicateNeed` (N7) only records the decision and leaves the
 * candidate at `needs_human_review`; this call records the accountable human
 * `confirm` decision and writes the ValidatedNeed.
 *
 * The desktop reviewer path posts a plain human payload (`human_actor` +
 * `human_rationale`); the workflow harness calls the same service in-process
 * with `human_delegated` authority. The two paths are compatible by design —
 * `blockWorkflowHarnessAutomationOnDirectWrite` only rejects payloads carrying
 * harness markers (scenario_id / node_id / harness schema_version).
 *
 * Body mirrors `apps/backend/src/routes/topic-selection-v1a-routes.ts:632`
 * (`humanConfirmationBody`: anyOf human_actor+human_rationale | confirmation_input).
 */
export type ConfirmValidatedNeedRequest = {
  human_actor: TopicSelectionActorRef;
  human_rationale: string;
  semantic_review_context_packet_ref?: TopicSelectionFunctionalRef | null;
  semantic_review_ref?: TopicSelectionFunctionalRef | null;
  artifact_refs?: TopicSelectionFunctionalRef[];
};

export type ConfirmValidatedNeedResponse = {
  validated_need: TopicSelectionValidatedNeedRecord;
  need_candidate: TopicSelectionNeedCandidateRecord;
  adjudication_result: TopicSelectionValidateNeedAdjudicationResultRecord;
};

export async function confirmValidatedNeed(
  adjudicationResultId: string,
  body: ConfirmValidatedNeedRequest,
): Promise<ConfirmValidatedNeedResponse> {
  return requestGovernance<ConfirmValidatedNeedResponse>({
    method: 'POST',
    path: `/topic-selection/v1a/adjudications/${encodeURIComponent(adjudicationResultId)}/human-confirmations`,
    body,
  });
}

/**
 * Phase 2.5 — publish a V1a→V1b input bundle for a validated need.
 * Required by v1a→v1b handoff (design-spec §147).
 */
export type PublishV1bInputBundleRequest = {
  validated_need_id: string;
  bundle_version?: string;
  created_by?: TopicSelectionActorType;
};

export async function publishV1bInputBundle(
  body: PublishV1bInputBundleRequest,
): Promise<TopicSelectionV1aToV1bInputBundleRecord> {
  return requestGovernance<TopicSelectionV1aToV1bInputBundleRecord>({
    method: 'POST',
    path: '/topic-selection/v1a/v1b-input-bundles',
    body,
  });
}

/**
 * Phase 2.4 — list CandidateDecisionMemorySuggestions for a candidate.
 * Powers the inline negative-memory section in NeedCandidateReviewCard.
 */
export async function listMemorySuggestionsByNeedCandidate(
  needCandidateId: string,
): Promise<TopicSelectionCandidateDecisionMemorySuggestionRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionCandidateDecisionMemorySuggestionRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/need-candidates/${encodeURIComponent(needCandidateId)}/memory-suggestions`,
  });
  return payload.items ?? [];
}

/**
 * Phase 2.4 — trigger AssessCandidateReadiness for a candidate.
 * Body is optional; backend fills defaults for assessment_workflow_version,
 * recheck/challenge refs and assessor identity when omitted.
 */
export async function assessNeedCandidateReadiness(
  needCandidateId: string,
): Promise<TopicSelectionNeedCandidateReadinessAssessmentRecord> {
  return requestGovernance<TopicSelectionNeedCandidateReadinessAssessmentRecord>({
    method: 'POST',
    path: `/topic-selection/v1a/need-candidates/${encodeURIComponent(needCandidateId)}/readiness-assessments`,
    body: {},
  });
}

/**
 * Phase 2.4 — create a ValidationDecisionSupportPacket for a candidate.
 */
export type CreateSupportPacketRequest = {
  need_candidate_id: string;
  readiness_assessment_id?: string | null;
  required_human_checks?: string[];
};

export async function createValidationSupportPacket(
  body: CreateSupportPacketRequest,
): Promise<TopicSelectionValidationDecisionSupportPacketRecord> {
  return requestGovernance<TopicSelectionValidationDecisionSupportPacketRecord>({
    method: 'POST',
    path: '/topic-selection/v1a/validation-support-packets',
    body,
  });
}

/**
 * Phase 2.2 — list SearchPlanRecheckRequests for a title-card.
 */
export async function listSearchPlanRecheckRequestsByTitleCard(
  titleCardId: string,
): Promise<TopicSelectionSearchPlanRecheckRequestRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionSearchPlanRecheckRequestRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/title-cards/${encodeURIComponent(titleCardId)}/search-plan-recheck-requests`,
  });
  return payload.items ?? [];
}

/**
 * Phase 2.2 — fetch coverage matrix for a SearchPlan.
 */
export async function getSearchPlanCoverageMatrix(
  searchPlanId: string,
): Promise<TopicSelectionSearchPlanCoverageMatrix> {
  return requestGovernance<TopicSelectionSearchPlanCoverageMatrix>({
    method: 'GET',
    path: `/topic-selection/v1a/search-plans/${encodeURIComponent(searchPlanId)}/coverage-matrix`,
  });
}

/**
 * Phase 2.2 — create a SearchPlanRecheckRequest.
 * Body fields mirror `apps/backend/src/routes/topic-selection-v1a-routes.ts:260` (`searchPlanRecheckBody`).
 */
export type CreateSearchPlanRecheckRequestBody = {
  title_card_id: string;
  source_ref: TopicSelectionFunctionalRef;
  target_search_plan_id: string;
  reason: string;
  gap_codes?: string[];
};

export async function createSearchPlanRecheckRequest(
  body: CreateSearchPlanRecheckRequestBody,
): Promise<TopicSelectionSearchPlanRecheckRequestRecord> {
  return requestGovernance<TopicSelectionSearchPlanRecheckRequestRecord>({
    method: 'POST',
    path: '/topic-selection/v1a/search-plan-recheck-requests',
    body,
  });
}

/**
 * Phase 2.3 — list EvidenceUnits for an EvidenceMap (drilldown driver).
 */
export async function listEvidenceUnitsByEvidenceMap(
  evidenceMapId: string,
): Promise<TopicSelectionEvidenceUnitRecord[]> {
  const payload = await requestGovernance<V1aListResponse<TopicSelectionEvidenceUnitRecord>>({
    method: 'GET',
    path: `/topic-selection/v1a/evidence-maps/${encodeURIComponent(evidenceMapId)}/units`,
  });
  return payload.items ?? [];
}

/**
 * Phase 2.3 — mark an EvidenceMap stale.
 */
export type MarkEvidenceMapStaleBody = {
  stale_reason_codes: string[];
};

export async function markEvidenceMapStale(
  evidenceMapId: string,
  body: MarkEvidenceMapStaleBody,
): Promise<TopicSelectionEvidenceMapRecord> {
  return requestGovernance<TopicSelectionEvidenceMapRecord>({
    method: 'POST',
    path: `/topic-selection/v1a/evidence-maps/${encodeURIComponent(evidenceMapId)}/stale`,
    body,
  });
}
