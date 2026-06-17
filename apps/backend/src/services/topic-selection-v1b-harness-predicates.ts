/**
 * W-12 / D-T127-01 (slice 5): the v1b harness type-guard / predicate cluster, relocated VERBATIM
 * from the harness. Pure, `this`-free `value is T` guards that the parse-and-resolve cluster depends
 * on. Intra-cluster calls (isFunctionalRefArray -> isFunctionalRefValue, isNullableSliceLoopbackTarget
 * -> isSliceLoopbackTarget, isNullableFunctionalRefValue -> isFunctionalRefValue) resolve within this
 * module; isRecord / isHash / hasOnlyKeys come from the pure-utils module. Behavior is identical.
 */
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceOptionDraft,
  TopicSelectionSliceLoopbackTarget,
  TopicSelectionSliceSelectionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionV1bCandidateGroupingSupportPayload,
  TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  TopicSelectionV1bN8ToN7FeedbackPayload,
  TopicSelectionV1bWorkflowHarnessHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { hasOnlyKeys, isHash, isRecord } from './topic-selection-v1b-harness-pure-utils.js';

export function isNullableHash(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isHash(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isFunctionalRefArray(value: unknown): value is TopicSelectionFunctionalRef[] {
  return Array.isArray(value) && value.every((item) => isFunctionalRefValue(item));
}

export function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

export function isRiskLevel(value: unknown): value is TopicSelectionResearchSliceOptionDraft['baseline_risk'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'unknown';
}

export function isSliceSelectionDecision(value: unknown): value is TopicSelectionSliceSelectionDecision {
  return value === 'select' || value === 'request_more_options' || value === 'park' || value === 'reject';
}

export function isSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget {
  return value === 'plan_research_slice_run'
    || value === 'research_constraint_profile'
    || value === 'validated_need'
    || value === 'evidence_map'
    || value === 'search_plan';
}

export function isNullableSliceLoopbackTarget(value: unknown): value is TopicSelectionSliceLoopbackTarget | null {
  return value === null || isSliceLoopbackTarget(value);
}

export function isRejectedOptionReasonArray(value: unknown): value is TopicSelectionRejectedSliceOptionReason[] {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.option_id === 'string'
    && item.option_id.trim().length > 0
    && typeof item.reason === 'string'
    && item.reason.trim().length > 0
    && (
      item.reason_code === 'hard_blocker'
      || item.reason_code === 'weaker_fit'
      || item.reason_code === 'higher_risk'
      || item.reason_code === 'duplicate'
      || item.reason_code === 'out_of_scope'
      || item.reason_code === 'insufficient_evidence'
      || item.reason_code === 'resource_blocked'
      || item.reason_code === 'baseline_blocked'
      || item.reason_code === 'other'
    ));
}

export function isClaimCeilingAlignment(value: unknown): value is TopicSelectionResearchSliceOptionDraft['claim_ceiling_alignment'] {
  if (!isRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, ['confidence', 'rationale', 'status'])
    && (value.status === 'aligned' || value.status === 'uncertain' || value.status === 'exceeds')
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
    && (value.confidence === null || value.confidence === undefined || typeof value.confidence === 'number');
}

export function isFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef {
  return isRecord(value)
    && typeof value.ref_type === 'string'
    && value.ref_type.trim().length > 0
    && typeof value.ref_id === 'string'
    && value.ref_id.trim().length > 0
    && (value.version_id === undefined || value.version_id === null || typeof value.version_id === 'string')
    && (value.title_card_id === undefined || value.title_card_id === null || typeof value.title_card_id === 'string');
}

export function isNullableFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef | null | undefined {
  return value === undefined || value === null || isFunctionalRefValue(value);
}

// W-12 (slice 9): N7 input/support-payload type guards, relocated verbatim from the harness.
export function isN6ToN7HandoffArtifactPayload(value: unknown): value is TopicSelectionV1bWorkflowHarnessHandoff {
  return isRecord(value)
    && isRecord(value.envelope)
    && value.envelope.handoff_kind === 'N6ToN7Handoff'
    && isRecord(value.payload);
}

export function isN8ToN7FeedbackPayload(value: unknown): value is TopicSelectionV1bN8ToN7FeedbackPayload {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'affected_refs',
      'failed_candidate_hash',
      'failed_candidate_ref',
      'failed_topic_question_contract_hash',
      'failed_topic_question_contract_ref',
      'failure_reason_code',
      'feedback_class',
      'feedback_summary',
      'n8_gate_result_hash',
      'previous_n7_handoff_hash',
      'previous_n7_handoff_ref',
      'previous_trial_ledger_hash',
      'previous_trial_ledger_ref',
      'topic_question_candidate_set_hash',
      'topic_question_candidate_set_ref',
      'value_assessment_hash',
      'value_assessment_ref',
    ])
    && ['semantic_candidate_failure', 'gate_rejected', 'technical_failure'].includes(value.feedback_class as string)
    && typeof value.failure_reason_code === 'string'
    && value.failure_reason_code.trim().length > 0
    && typeof value.feedback_summary === 'string'
    && value.feedback_summary.trim().length > 0
    && isFunctionalRefArray(value.affected_refs)
    && (value.affected_refs as unknown[]).length > 0
    && isFunctionalRefValue(value.previous_n7_handoff_ref)
    && isHash(value.previous_n7_handoff_hash)
    && isFunctionalRefValue(value.previous_trial_ledger_ref)
    && isHash(value.previous_trial_ledger_hash)
    && isFunctionalRefValue(value.failed_topic_question_contract_ref)
    && isHash(value.failed_topic_question_contract_hash)
    && isFunctionalRefValue(value.failed_candidate_ref)
    && isHash(value.failed_candidate_hash)
    && isFunctionalRefValue(value.topic_question_candidate_set_ref)
    && isHash(value.topic_question_candidate_set_hash)
    && isHash(value.n8_gate_result_hash)
    && isNullableFunctionalRefValue(value.value_assessment_ref)
    && isNullableHash(value.value_assessment_hash);
}

export function isN7CandidateGroupingSupportPayload(value: unknown): value is TopicSelectionV1bCandidateGroupingSupportPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'candidate_relationships',
    'duplicate_or_overlap_groups',
    'grouping_summary',
    'priority_order',
    'selected_candidate_hash',
    'selected_candidate_ref',
  ])) {
    return false;
  }
  const groups = value.duplicate_or_overlap_groups;
  return isFunctionalRefValue(value.selected_candidate_ref)
    && isHash(value.selected_candidate_hash)
    && isFunctionalRefArray(value.priority_order)
    && (value.priority_order as unknown[]).length > 0
    && Array.isArray(groups)
    && groups.every((group) => isRecord(group)
      && hasOnlyKeys(group, ['group_key', 'candidate_refs', 'canonical_candidate_ref', 'rationale'])
      && typeof group.group_key === 'string'
      && isFunctionalRefArray(group.candidate_refs)
      && isFunctionalRefValue(group.canonical_candidate_ref)
      && typeof group.rationale === 'string')
    && isRecord(value.candidate_relationships)
    && typeof value.grouping_summary === 'string';
}

export function isN7DebateAdmissionSupportPayload(value: unknown): value is TopicSelectionV1bN8DebateAdmissionReviewSupportPayload {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'debate_level',
      'high_value_signal_codes',
      'rationale',
      'recommended_profile_id',
      'risk_signal_codes',
    ])
    && ['compact_assessment_debate', 'provider_diverse_deep_debate'].includes(value.debate_level as string)
    && typeof value.recommended_profile_id === 'string'
    && isStringArray(value.high_value_signal_codes)
    && isStringArray(value.risk_signal_codes)
    && typeof value.rationale === 'string';
}

export function isN7FailedTrialSynthesisSupportPayload(value: unknown): value is TopicSelectionV1bN8FailedTrialSynthesisSupportPayload {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'affected_refs',
      'exhausted_candidate_refs',
      'failure_reason_codes',
      'n6_regeneration_hints',
      'synthesis_summary',
    ])
    && isFunctionalRefArray(value.exhausted_candidate_refs)
    && (value.exhausted_candidate_refs as unknown[]).length > 0
    && isStringArray(value.failure_reason_codes)
    && typeof value.synthesis_summary === 'string'
    && isStringArray(value.n6_regeneration_hints)
    && isFunctionalRefArray(value.affected_refs)
    && (value.affected_refs as unknown[]).length > 0;
}
