/**
 * W-12 / D-T127-01: v1b harness N8 (assess-topic-value) pure leaves, relocated VERBATIM from the
 * harness. `this`-free handoff/payload match, runtime-audit-drift factory, value-draft
 * predicate/extraction, and the quality-flag + research-slice-snapshot summaries. The N8 methods
 * taking N8DraftResolution / N8LoadedContext / idFactory / now stay in the shell.
 */
import type {
  TopicSelectionV1bN7ToN8HandoffPayload,
  TopicSelectionV1bN8HarnessFrozenInputPayload,
  TopicSelectionV1bTopicValueAssessmentDraftPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type { TopicSelectionAssessTopicValueLlmOutput } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type { TopicSelectionResearchSliceRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import { hasOnlyKeys, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import { isFunctionalRefArray, isN8ReasoningMemoDraft, isStringArray } from './topic-selection-v1b-harness-predicates.js';
import { uniqueStrings } from './topic-selection-v1b-harness-dedup-utils.js';
import { nullableRefsEqual, refsEqual } from './topic-selection-v1b-harness-gate-utils.js';

export function n8PayloadMatchesN7Handoff(
  payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  handoffPayload: TopicSelectionV1bN7ToN8HandoffPayload,
): boolean {
  return payload.topic_question_hash === handoffPayload.topic_question_hash
    && payload.topic_question_contract_hash === handoffPayload.topic_question_contract_hash
    && payload.answerability_plan_hash === handoffPayload.answerability_plan_hash
    && payload.trial_ledger_hash === handoffPayload.trial_ledger_hash
    && payload.topic_question_candidate_set_hash === handoffPayload.topic_question_candidate_set_hash
    && payload.active_candidate_hash === handoffPayload.active_candidate_hash
    && payload.selected_research_slice_hash === handoffPayload.selected_research_slice_hash
    && payload.n8_debate_admission_hash === handoffPayload.n8_debate_admission_hash
    && payload.candidate_grouping_hash === handoffPayload.candidate_grouping_hash
    && refsEqual(payload.topic_question_ref, handoffPayload.topic_question_ref)
    && refsEqual(payload.topic_question_contract_ref, handoffPayload.topic_question_contract_ref)
    && refsEqual(payload.answerability_plan_ref, handoffPayload.answerability_plan_ref)
    && refsEqual(payload.trial_ledger_ref, handoffPayload.trial_ledger_ref)
    && refsEqual(payload.topic_question_candidate_set_ref, handoffPayload.topic_question_candidate_set_ref)
    && refsEqual(payload.active_candidate_ref, handoffPayload.active_candidate_ref)
    && refsEqual(payload.selected_research_slice_ref, handoffPayload.selected_research_slice_ref)
    && refsEqual(payload.n8_debate_admission_ref, handoffPayload.n8_debate_admission_ref)
    && nullableRefsEqual(payload.candidate_grouping_ref, handoffPayload.candidate_grouping_ref);
}

export function n8RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function extractN8DraftPayload(
  payload: Record<string, unknown> | null | undefined,
): TopicSelectionV1bTopicValueAssessmentDraftPayload | null {
  if (!isRecord(payload)) {
    return null;
  }
  const candidate = isRecord(payload.normalized_output)
    ? payload.normalized_output
    : payload;
  return isN8DraftPayload(candidate)
    ? candidate as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload
    : null;
}

export function isN8DraftPayload(value: Record<string, unknown>): boolean {
  return hasOnlyKeys(value, [
    'accepted_risk_refs',
    'base_case',
    'blocker_refs',
    'ceiling_case',
    'confidence',
    'dimension_scores',
    'fallback_claim_if_success',
    'floor_case',
    'hard_gates',
    'readiness_status',
    'reasoning_memo',
    'recommended_disposition',
    'reviewer_objections',
    'risk_notes',
    'risk_penalty',
    'strongest_claim_if_success',
    'total_score',
    'value_summary',
  ])
    && ['ready', 'ready_with_accepted_risk', 'needs_refinement', 'recheck_required', 'blocked', 'parked', 'dropped']
      .includes(value.readiness_status as string)
    && typeof value.strongest_claim_if_success === 'string'
    && (value.fallback_claim_if_success === null || value.fallback_claim_if_success === undefined || typeof value.fallback_claim_if_success === 'string')
    && Array.isArray(value.hard_gates)
    && Array.isArray(value.dimension_scores)
    && isRecord(value.risk_penalty)
    && isStringArray(value.reviewer_objections)
    && typeof value.ceiling_case === 'string'
    && typeof value.base_case === 'string'
    && typeof value.floor_case === 'string'
    && ['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
      .includes(value.recommended_disposition as string)
    && typeof value.total_score === 'number'
    && typeof value.value_summary === 'string'
    && typeof value.confidence === 'number'
    && isFunctionalRefArray(value.accepted_risk_refs)
    && isFunctionalRefArray(value.blocker_refs)
    && isStringArray(value.risk_notes)
    && isN8ReasoningMemoDraft(value.reasoning_memo);
}

export function n8QualityFlags(draft: TopicSelectionAssessTopicValueLlmOutput): string[] {
  return uniqueStrings([
    draft.readiness_status !== 'ready' ? `readiness:${draft.readiness_status}` : '',
    draft.recommended_disposition !== 'advance_to_package' ? `disposition:${draft.recommended_disposition}` : '',
    ...draft.hard_gates.filter((gate) => gate.verdict !== 'pass').map((gate) => `gate:${gate.gate_key}:${gate.verdict}`),
  ].filter(Boolean));
}

export function n8ResearchSliceSnapshot(slice: TopicSelectionResearchSliceRecord): Record<string, unknown> {
  return {
    research_slice_id: slice.research_slice_id,
    slice_version: slice.slice_version,
    slice_statement: slice.slice_statement,
    target_setting: slice.target_setting,
    target_community: slice.target_community,
    contribution_type_candidate: slice.preferred_contribution_type ?? slice.candidate_contribution_types[0] ?? null,
    evaluation_path: slice.evaluation_path,
    expected_claim: slice.expected_claim,
    fallback_claim: slice.fallback_claim,
    accepted_risk_refs: slice.accepted_risk_refs,
    memory_suggestion_refs: slice.memory_suggestion_refs,
    recheck_request_refs: slice.recheck_request_refs,
    non_goals: slice.non_goals,
  };
}
