import {
  TOPIC_SELECTION_HUMAN_CONFIRM_NEED_INTENT_SCHEMA_VERSION,
  type HumanConfirmationInput,
  type TopicSelectionGapSelectionReview,
  type TopicSelectionHumanConfirmNeedIntentInput,
  type TopicSelectionHumanConfirmNeedIntentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const refKey = (ref: TopicSelectionFunctionalRef): string =>
  `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;

const normalizeRef = (ref: TopicSelectionFunctionalRef): TopicSelectionFunctionalRef => ({
  ref_type: ref.ref_type,
  ref_id: ref.ref_id,
  version_id: ref.version_id ?? null,
  title_card_id: ref.title_card_id ?? null,
});

const normalizeRefs = (refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] => {
  const byKey = new Map(refs.map((ref) => [refKey(ref), normalizeRef(ref)]));
  return [...byKey.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, ref]) => ref);
};

export const normalizeTopicSelectionGapSelectionReview = (
  review: TopicSelectionGapSelectionReview,
): TopicSelectionGapSelectionReview => ({
  ...review,
  selected_candidate_ref: normalizeRef(review.selected_candidate_ref),
  candidate_reviews: review.candidate_reviews.map((candidateReview) => ({
    ...candidateReview,
    need_candidate_ref: normalizeRef(candidateReview.need_candidate_ref),
    distinct_from_selected_axes: [...new Set(candidateReview.distinct_from_selected_axes)].sort(),
    rationale: candidateReview.rationale.trim(),
    rejection_reason: candidateReview.rejection_reason?.trim() || null,
  })).sort((left, right) => refKey(left.need_candidate_ref).localeCompare(refKey(right.need_candidate_ref))),
});

export const normalizeHumanConfirmNeedConfirmationInput = (
  input: HumanConfirmationInput,
): HumanConfirmationInput => ({
  ...input,
  accountable_human_ref: {
    ...input.accountable_human_ref,
    actor_id: input.accountable_human_ref.actor_id?.trim() ?? null,
  },
  rationale: input.rationale.trim(),
  accepted_risk_refs: normalizeRefs(input.accepted_risk_refs),
  required_check_results: [...input.required_check_results]
    .map((check) => ({ ...check, check_id: check.check_id.trim() }))
    .sort((left, right) => left.check_id.localeCompare(right.check_id)
      || left.result.localeCompare(right.result)),
  delegated_executor: input.delegated_executor ?? null,
  gap_selection_review: input.gap_selection_review
    ? normalizeTopicSelectionGapSelectionReview(input.gap_selection_review)
    : null,
  arena_advisory_review_ref: null,
});

export const buildTopicSelectionHumanConfirmNeedIntent = (
  input: TopicSelectionHumanConfirmNeedIntentInput,
): TopicSelectionHumanConfirmNeedIntentRecord => {
  const body: TopicSelectionHumanConfirmNeedIntentInput = {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_INTENT_SCHEMA_VERSION,
    adjudication_result_ref: normalizeRef(input.adjudication_result_ref),
    output_validated_need_ref: normalizeRef(input.output_validated_need_ref),
    confirmation_input: normalizeHumanConfirmNeedConfirmationInput(input.confirmation_input),
  };
  return {
    ...body,
    intent_hash: sha256Text(stableStringify(body)),
  };
};

export const topicSelectionHumanConfirmNeedIntentStableKey = (
  intent: TopicSelectionHumanConfirmNeedIntentRecord,
): string => `topic-selection-human-confirm-need-intent:${sha256Text(stableStringify({
  adjudication_result_ref: intent.adjudication_result_ref,
  output_validated_need_ref: intent.output_validated_need_ref,
}))}`;

export const topicSelectionHumanConfirmedDecisionId = (
  intent: TopicSelectionHumanConfirmNeedIntentRecord,
): string => `human_decision_human_confirm_need_${intent.intent_hash}`;
