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
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
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
