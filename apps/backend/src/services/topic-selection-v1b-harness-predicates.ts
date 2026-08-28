/**
 * W-12 / D-T127-01 (slice 5): the v1b harness type-guard / predicate cluster, relocated VERBATIM
 * from the harness. Pure, `this`-free `value is T` guards that the parse-and-resolve cluster depends
 * on. Intra-cluster calls (isFunctionalRefArray -> isFunctionalRefValue, isNullableSliceLoopbackTarget
 * -> isSliceLoopbackTarget, isNullableFunctionalRefValue -> isFunctionalRefValue) resolve within this
 * module; isRecord / isHash / hasOnlyKeys come from the pure-utils module. New cross-node output
 * vocabulary belongs here when both N4 and N6 must parse the same additive contract.
 */
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES,
  TOPIC_SELECTION_CANDIDATE_PORTFOLIO_REASON_CODES,
  type TopicSelectionCandidatePortfolioDisposition,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionRejectedSliceOptionReason,
  TopicSelectionResearchSliceOptionDraft,
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionSliceLoopbackTarget,
  TopicSelectionSliceSelectionDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionTopicQuestionFalsificationConditionDraft,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
  TOPIC_SELECTION_VALUE_GATE_VERDICTS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionV1bCandidateGroupingSupportPayload,
  TopicSelectionV1bN6LoopbackTriageSupportPayload,
  TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  TopicSelectionV1bN8ToN7FeedbackPayload,
  TopicSelectionV1bWorkflowHarnessHandoff,
  TopicSelectionV1bWorkflowHarnessHandoffKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { hasOnlyKeys, isHash, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import type { TopicSelectionV1bIntakeReadinessClassificationSupportPayload } from './topic-selection-v1b-early-semantic-support-runtime-service.js';

export function isNullableHash(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || isHash(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isFunctionalRefArray(value: unknown): value is TopicSelectionFunctionalRef[] {
  return Array.isArray(value) && value.every((item) => isFunctionalRefValue(item));
}

export function isCandidatePortfolioDisposition(
  value: unknown,
): value is TopicSelectionCandidatePortfolioDisposition {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'candidate_dispositions',
    'confidence',
    'evidence_refs',
    'outcome',
    'rationale',
    'rejection_reasons',
    'reopening_conditions',
  ])) {
    return false;
  }
  const rejectionReasons = value.rejection_reasons;
  const candidateDispositions = value.candidate_dispositions;
  return TOPIC_SELECTION_CANDIDATE_PORTFOLIO_OUTCOMES.includes(
    value.outcome as TopicSelectionCandidatePortfolioDisposition['outcome'],
  )
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
    && typeof value.confidence === 'number'
    && Number.isFinite(value.confidence)
    && isFunctionalRefArray(value.evidence_refs)
    && isStringArray(value.reopening_conditions)
    && Array.isArray(rejectionReasons)
    && rejectionReasons.every((reason) => isRecord(reason)
      && hasOnlyKeys(reason, ['evidence_refs', 'reason_code', 'summary'])
      && TOPIC_SELECTION_CANDIDATE_PORTFOLIO_REASON_CODES.includes(
        reason.reason_code as (typeof TOPIC_SELECTION_CANDIDATE_PORTFOLIO_REASON_CODES)[number],
      )
      && typeof reason.summary === 'string'
      && reason.summary.trim().length > 0
      && isFunctionalRefArray(reason.evidence_refs))
    && Array.isArray(candidateDispositions)
    && candidateDispositions.every((candidate) => isRecord(candidate)
      && hasOnlyKeys(candidate, [
        'candidate_key',
        'disposition',
        'drop_reason_code',
        'evidence_refs',
        'rationale',
        'reopening_conditions',
      ])
      && typeof candidate.candidate_key === 'string'
      && candidate.candidate_key.trim().length > 0
      && TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS.includes(
        candidate.disposition as (typeof TOPIC_SELECTION_CANDIDATE_PORTFOLIO_DISPOSITIONS)[number],
      )
      && typeof candidate.rationale === 'string'
      && candidate.rationale.trim().length > 0
      && isFunctionalRefArray(candidate.evidence_refs)
      && isStringArray(candidate.reopening_conditions)
      && (
        candidate.drop_reason_code === undefined
        || candidate.drop_reason_code === null
        || TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES.includes(
          candidate.drop_reason_code as (typeof TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES)[number],
        )
      ));
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


/**
 * W-12 / D-T127-01 (slice 11): the v1b harness node-payload / draft / risk / human type-guard cluster,
 * relocated VERBATIM from the harness. Pure, `this`-free `value is T` (and boolean) guards. Intra-cluster
 * calls resolve within this module; isRecord / hasOnlyKeys come from pure-utils; isStringArray /
 * isFunctionalRefArray / isRiskLevel / isClaimCeilingAlignment are defined above in this module. The
 * VALUE constants and the N3 readiness-classification support payload type back the N8/N3 guards.
 * Behavior is identical.
 */

export function isN8ReasoningMemoDraft(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'cited_refs',
      'claim_leverage',
      'critic_triggers',
      'disposition_bridge',
      'effort_to_value',
      'evidence_backed_rationale',
      'negative_memory_check',
      'originality',
      'recommendation',
      'requires_critic_review',
      'reviewer_risks',
      'significance',
      'strategic_fit',
      'top_objections',
      'uncertainty',
      'value_thesis',
    ])
    && ['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
      .includes(value.recommendation as string)
    && typeof value.value_thesis === 'string'
    && typeof value.significance === 'string'
    && typeof value.originality === 'string'
    && typeof value.claim_leverage === 'string'
    && isStringArray(value.reviewer_risks)
    && typeof value.effort_to_value === 'string'
    && typeof value.strategic_fit === 'string'
    && typeof value.negative_memory_check === 'string'
    && typeof value.evidence_backed_rationale === 'string'
    && isStringArray(value.top_objections)
    && typeof value.uncertainty === 'string'
    && typeof value.disposition_bridge === 'string'
    && typeof value.requires_critic_review === 'boolean'
    && isStringArray(value.critic_triggers)
    && isFunctionalRefArray(value.cited_refs);
}

export function isN8ValueGateResult(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, ['gate_key', 'verdict', 'severity', 'overridable_with_risk', 'rationale', 'refs'])
    && (TOPIC_SELECTION_VALUE_GATE_KEYS as readonly string[]).includes(value.gate_key as string)
    && (TOPIC_SELECTION_VALUE_GATE_VERDICTS as readonly string[]).includes(value.verdict as string)
    && ['info', 'warning', 'blocking'].includes(value.severity as string)
    && typeof value.overridable_with_risk === 'boolean'
    && typeof value.rationale === 'string'
    && isFunctionalRefArray(value.refs);
}

export function isN8ValueDimensionScore(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, ['dimension_key', 'score', 'rationale', 'evidence_refs', 'uncertainty'])
    && (TOPIC_SELECTION_VALUE_DIMENSIONS as readonly string[]).includes(value.dimension_key as string)
    && typeof value.score === 'number'
    && Number.isFinite(value.score)
    && value.score >= 0
    && value.score <= 100
    && typeof value.rationale === 'string'
    && isFunctionalRefArray(value.evidence_refs)
    && typeof value.uncertainty === 'string';
}

export function isHandoffArtifactPayload(
  value: unknown,
  handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind,
): value is TopicSelectionV1bWorkflowHarnessHandoff {
  return isRecord(value)
    && isRecord(value.envelope)
    && value.envelope.handoff_kind === handoffKind
    && isRecord(value.payload);
}

export function isN3ReadinessClassificationSupportPayload(
  value: unknown,
): value is TopicSelectionV1bIntakeReadinessClassificationSupportPayload {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'blocker_codes',
      'cited_refs',
      'loopback_target_code',
      'no_authority_write_confirmed',
      'rationale',
      'readiness_recommendation',
      'schema_version',
      'warning_codes',
    ])
    && value.schema_version === 'IntakeReadinessClassificationSupport@v1'
    && ['ready', 'needs_refinement', 'blocked'].includes(value.readiness_recommendation as string)
    && isStringArray(value.blocker_codes)
    && isStringArray(value.warning_codes)
    && (
      value.loopback_target_code === null
      || value.loopback_target_code === 'n3_snapshot_refresh'
      || value.loopback_target_code === 'n3_profile_repair'
    )
    && isFunctionalRefArray(value.cited_refs)
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
    && value.no_authority_write_confirmed === true;
}

export function isN5ToN6HandoffArtifactPayload(value: unknown): value is TopicSelectionV1bWorkflowHarnessHandoff {
  if (!isRecord(value) || !isRecord(value.envelope) || !isRecord(value.payload)) {
    return false;
  }
  return value.envelope.handoff_kind === 'N5ToN6Handoff'
    && value.envelope.source_node_id === 'topic-selection.v1b.select-research-slice.v1'
    && value.target_node_id === 'topic-selection.v1b.generate-topic-question-candidates.v1';
}

export function isN6CandidateRetryScope(
  failureScope: TopicSelectionV1bN6LoopbackTriageSupportPayload['failure_scope'],
): boolean {
  return failureScope === 'candidate_level' || failureScope === 'question_frame_level';
}

export function isN6UpstreamRollbackScope(
  failureScope: TopicSelectionV1bN6LoopbackTriageSupportPayload['failure_scope'],
): boolean {
  return failureScope === 'slice_level' || failureScope === 'upstream_context_level';
}

export function isN6DebateEscalationPayload(
  value: unknown,
): value is TopicSelectionV1bN6LoopbackTriageSupportPayload['debate_escalation'] {
  return value === null || (
    isRecord(value)
    && hasOnlyKeys(value, ['debate_level', 'recommended_profile_id', 'sticky', 'rationale'])
    && ['mixed_cost_control', 'provider_diverse_deep'].includes(value.debate_level as string)
    && typeof value.recommended_profile_id === 'string'
    && value.recommended_profile_id.trim().length > 0
    && typeof value.sticky === 'boolean'
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
  );
}

export function isN6UpstreamRollbackPayload(
  value: unknown,
): value is TopicSelectionV1bN6LoopbackTriageSupportPayload['upstream_rollback'] {
  return value === null || (
    isRecord(value)
    && hasOnlyKeys(value, ['target_node_id', 'repair_action', 'rationale'])
    && value.target_node_id === 'topic-selection.v1b.select-research-slice.v1'
    && value.repair_action === 'select_different_slice'
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
  );
}

export function isN6DraftPayload(value: Record<string, unknown>): boolean {
  return hasOnlyKeys(value, [
    'candidates',
    'generation_notes',
    'human_review_triggers',
    'portfolio_disposition',
    'question_frame',
    'recommended_candidate_keys',
  ])
    && isRecord(value.question_frame)
    && isStringArray(value.recommended_candidate_keys)
    && isStringArray(value.generation_notes)
    && isStringArray(value.human_review_triggers)
    && (
      value.portfolio_disposition === undefined
      || value.portfolio_disposition === null
      || isCandidatePortfolioDisposition(value.portfolio_disposition)
    )
    && Array.isArray(value.candidates)
    && (value.candidates.length > 0 || isCandidatePortfolioDisposition(value.portfolio_disposition));
}

export function isN6QuestionFrameDraft(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'assumption_refs',
      'comparison_baseline',
      'evidence_refs',
      'frame_payload',
      'intervention_or_approach',
      'object_scope',
      'observable_outcome',
      'target_community',
      'target_setting',
      'task_scope',
    ])
    && typeof value.target_setting === 'string'
    && typeof value.target_community === 'string'
    && typeof value.object_scope === 'string'
    && typeof value.task_scope === 'string'
    && typeof value.intervention_or_approach === 'string'
    && typeof value.comparison_baseline === 'string'
    && typeof value.observable_outcome === 'string'
    && isFunctionalRefArray(value.assumption_refs)
    && isFunctionalRefArray(value.evidence_refs)
    && isRecord(value.frame_payload);
}

export function isN6AnswerabilityPlanDraft(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'ablations_or_comparisons',
      'baselines',
      'datasets_or_resources',
      'dependency_risks',
      'evaluation_setting',
      'known_gaps',
      'metrics',
      'open_dependencies',
      'required_evidence_refs',
    ])
    && isStringArray(value.datasets_or_resources)
    && isStringArray(value.metrics)
    && isStringArray(value.baselines)
    && isStringArray(value.ablations_or_comparisons)
    && typeof value.evaluation_setting === 'string'
    && isStringArray(value.dependency_risks)
    && isStringArray(value.open_dependencies)
    && isStringArray(value.known_gaps)
    && isFunctionalRefArray(value.required_evidence_refs);
}

export function isN6BoundaryCheckDraft(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'allowed_refinements',
      'boundary_violations',
      'excluded_boundary_refs',
      'preserved_boundary_refs',
      'prohibited_claims',
    ])
    && isFunctionalRefArray(value.preserved_boundary_refs)
    && isFunctionalRefArray(value.excluded_boundary_refs)
    && isStringArray(value.boundary_violations)
    && isStringArray(value.prohibited_claims)
    && isStringArray(value.allowed_refinements);
}

export function isN6TraceabilityCheckDraft(value: unknown): boolean {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'baseline_evidence_refs',
      'challenge_evidence_refs',
      'context_evidence_refs',
      'mapped_evidence_refs',
      'support_evidence_refs',
      'unmapped_assumptions',
    ])
    && isFunctionalRefArray(value.support_evidence_refs)
    && isFunctionalRefArray(value.challenge_evidence_refs)
    && isFunctionalRefArray(value.baseline_evidence_refs)
    && isFunctionalRefArray(value.context_evidence_refs)
    && isFunctionalRefArray(value.mapped_evidence_refs)
    && isStringArray(value.unmapped_assumptions);
}

export function isN6FalsificationConditionDraft(value: unknown): value is TopicSelectionTopicQuestionFalsificationConditionDraft {
  return isRecord(value)
    && hasOnlyKeys(value, [
      'check_timing',
      'condition_type',
      'confidence',
      'expected_action',
      'related_contract_fields',
      'severity',
      'statement',
      'trigger_evidence_refs',
      'trigger_source_refs',
    ])
    && [
      'solved_by_baseline',
      'contradicted_by_evidence',
      'out_of_boundary',
      'data_unavailable',
      'baseline_unreproducible',
      'metric_invalid',
      'evaluation_infeasible',
      'claim_overstrong',
      'resource_blocked',
      'need_invalidated',
    ].includes(value.condition_type as string)
    && ['hard', 'soft', 'answerability'].includes(value.severity as string)
    && typeof value.statement === 'string'
    && isFunctionalRefArray(value.trigger_evidence_refs)
    && isFunctionalRefArray(value.trigger_source_refs)
    && isStringArray(value.related_contract_fields)
    && ['revise_question', 'revise_slice', 'recheck_evidence', 'lower_claim_strength', 'park', 'drop'].includes(value.expected_action as string)
    && [
      'before_value_assessment',
      'during_value_assessment',
      'before_package',
      'before_promotion',
      'on_new_evidence',
    ].includes(value.check_timing as string)
    && ['low', 'medium', 'high'].includes(value.confidence as string);
}

export function isSpecificQuestion(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  if (normalized.length < 40 || !normalized.endsWith('?')) {
    return false;
  }
  const broadPatterns = [
    /^how can (ai|llms?|rag|systems?) (help|improve|impact|benefit)\b/u,
    /^what is the (impact|effect|role|future) of\b/u,
    /^can (ai|llms?|rag|systems?) improve\b/u,
  ];
  return !broadPatterns.some((pattern) => pattern.test(normalized));
}

export function isN4DraftOption(value: unknown): value is TopicSelectionResearchSliceOptionDraft {
  if (!isRecord(value)) {
    return false;
  }
  return hasOnlyKeys(value, [
    'baseline_assumptions',
    'baseline_evidence_refs',
    'baseline_risk',
    'challenge_evidence_refs',
    'claim_ceiling_alignment',
    'confidence',
    'context_evidence_refs',
    'contribution_type_candidate',
    'data_assumptions',
    'dependency_risks',
    'details_payload',
    'evaluation_path',
    'excluded_boundaries',
    'execution_risk',
    'expected_claim',
    'fallback_claim',
    'hard_blockers',
    'human_review_triggers',
    'included_boundaries',
    'main_risks',
    'observable_success_criteria',
    'option_key',
    'problem_space',
    'requires_human_review',
    'resource_assumptions',
    'scope_risk',
    'slice_budget',
    'slice_statement',
    'source_validated_need_refs',
    'support_evidence_refs',
    'target_community',
    'target_setting',
  ])
    && typeof value.option_key === 'string'
    && value.option_key.trim().length > 0
    && isFunctionalRefArray(value.source_validated_need_refs)
    && typeof value.slice_statement === 'string'
    && value.slice_statement.trim().length > 0
    && typeof value.problem_space === 'string'
    && value.problem_space.trim().length > 0
    && typeof value.target_setting === 'string'
    && value.target_setting.trim().length > 0
    && typeof value.target_community === 'string'
    && value.target_community.trim().length > 0
    && isStringArray(value.included_boundaries)
    && isStringArray(value.excluded_boundaries)
    && typeof value.contribution_type_candidate === 'string'
    && value.contribution_type_candidate.trim().length > 0
    && isFunctionalRefArray(value.support_evidence_refs)
    && isFunctionalRefArray(value.challenge_evidence_refs)
    && isFunctionalRefArray(value.baseline_evidence_refs)
    && isFunctionalRefArray(value.context_evidence_refs)
    && isStringArray(value.resource_assumptions)
    && isStringArray(value.data_assumptions)
    && typeof value.evaluation_path === 'string'
    && value.evaluation_path.trim().length > 0
    && isStringArray(value.baseline_assumptions)
    && isStringArray(value.hard_blockers)
    && isStringArray(value.dependency_risks)
    && isRecord(value.slice_budget)
    && typeof value.expected_claim === 'string'
    && value.expected_claim.trim().length > 0
    && typeof value.fallback_claim === 'string'
    && value.fallback_claim.trim().length > 0
    && isStringArray(value.observable_success_criteria)
    && isStringArray(value.main_risks)
    && isRiskLevel(value.baseline_risk)
    && isRiskLevel(value.execution_risk)
    && isRiskLevel(value.scope_risk)
    && isClaimCeilingAlignment(value.claim_ceiling_alignment)
    && (value.confidence === null || value.confidence === undefined || typeof value.confidence === 'number')
    && typeof value.requires_human_review === 'boolean'
    && isStringArray(value.human_review_triggers)
    && isRecord(value.details_payload);
}

export function isHumanDecisionRef(ref: TopicSelectionFunctionalRef): boolean {
  return ref.ref_type === 'human_confirmed_decision' || ref.ref_type === 'human_decision';
}

export function isHumanActor(actorType: string): boolean {
  return actorType === 'human' || actorType === 'hybrid';
}

export function isHighRiskDraft(draft: TopicSelectionResearchSliceOptionDraft): boolean {
  return draft.baseline_risk === 'high'
    || draft.execution_risk === 'high'
    || draft.scope_risk === 'high';
}

export function isHighRiskOption(option: TopicSelectionResearchSliceOptionRecord): boolean {
  return option.baseline_risk === 'high'
    || option.execution_risk === 'high'
    || option.scope_risk === 'high';
}
