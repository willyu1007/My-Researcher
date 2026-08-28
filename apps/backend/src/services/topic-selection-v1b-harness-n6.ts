/**
 * W-12 / D-T127-01: v1b harness N6 (generate-topic-question-candidates) pure leaves, relocated
 * VERBATIM from the harness. `this`-free handoff/payload guards, loopback-triage policy + routing
 * helpers, and candidate-draft predicates. The N6 methods that take N6KnownContext / N6LoadedContext
 * / N6LoopbackPlan (n6FrameBlocker, n6Candidate*Blocker, n6KnownContext, validateAndBuildN6Candidates,
 * n6LoopbackWarnings) stay in the shell.
 */
import type {
  TopicSelectionV1bN5ToN6HandoffPayload,
  TopicSelectionV1bN6HarnessFrozenInputPayload,
  TopicSelectionV1bN6LoopbackTriageSupportPayload,
  TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  TopicSelectionV1bWorkflowHarnessNodeId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionTopicQuestionCandidateDraft,
  TopicSelectionTopicQuestionFalsificationConditionDraft,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import { hasOnlyKeys, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import { uniqueRefs, uniqueStrings } from './topic-selection-v1b-harness-dedup-utils.js';
import { refKey, refsEqual } from './topic-selection-v1b-harness-gate-utils.js';
import {
  isFunctionalRefArray,
  isN6AnswerabilityPlanDraft,
  isN6BoundaryCheckDraft,
  isN6CandidateRetryScope,
  isN6DebateEscalationPayload,
  isN6DraftPayload,
  isN6FalsificationConditionDraft,
  isN6TraceabilityCheckDraft,
  isN6UpstreamRollbackPayload,
  isN6UpstreamRollbackScope,
  isStringArray,
} from './topic-selection-v1b-harness-predicates.js';

export function n6HandoffPayloadMatches(
  payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  handoffPayload: TopicSelectionV1bN5ToN6HandoffPayload,
): boolean {
  return payload.constraint_profile_hash === handoffPayload.constraint_profile_hash
    && payload.intake_readiness_hash === handoffPayload.intake_readiness_hash
    && payload.research_slice_hash === handoffPayload.research_slice_hash
    && payload.research_slice_selection_hash === handoffPayload.research_slice_selection_hash
    && payload.research_slice_option_set_hash === handoffPayload.research_slice_option_set_hash
    && payload.selected_slice_option_hash === handoffPayload.selected_slice_option_hash
    && refsEqual(payload.constraint_profile_ref, handoffPayload.constraint_profile_ref)
    && refsEqual(payload.intake_readiness_ref, handoffPayload.intake_readiness_ref)
    && refsEqual(payload.research_slice_ref, handoffPayload.research_slice_ref)
    && refsEqual(payload.research_slice_selection_ref, handoffPayload.research_slice_selection_ref)
    && refsEqual(payload.research_slice_option_set_ref, handoffPayload.research_slice_option_set_ref)
    && refsEqual(payload.selected_slice_option_ref, handoffPayload.selected_slice_option_ref);
}

export function n6RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'N6_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function n6LoopbackTriagePolicyBlocker(
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
  frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
): { ok: false; code: string; message: string } | null {
  const affectedRefsBlocker = n6LoopbackTriageAffectedRefsBlocker(payload, frozenPayload);
  if (affectedRefsBlocker) {
    return affectedRefsBlocker;
  }
  if (payload.loopback_target_code === 'n6_debate_escalation') {
    if (!isN6CandidateRetryScope(payload.failure_scope)) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 debate escalation triage requires candidate-level or question-frame-level failure_scope.',
      };
    }
    if (!payload.debate_escalation || payload.upstream_rollback) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 debate escalation triage requires debate_escalation and forbids upstream_rollback.',
      };
    }
    return null;
  }
  if (payload.loopback_target_code === 'n6_loopback_to_n5_select_different_slice') {
    if (!isN6UpstreamRollbackScope(payload.failure_scope)) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 upstream rollback triage requires slice-level or upstream-context-level failure_scope.',
      };
    }
    if (!payload.upstream_rollback || payload.debate_escalation) {
      return {
        ok: false,
        code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
        message: 'N6 upstream rollback triage requires upstream_rollback and forbids debate_escalation.',
      };
    }
    return null;
  }
  if (!isN6CandidateRetryScope(payload.failure_scope)) {
    return {
      ok: false,
      code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
      message: 'N6 regeneration triage requires candidate-level or question-frame-level failure_scope.',
    };
  }
  if (payload.debate_escalation || payload.upstream_rollback) {
    return {
      ok: false,
      code: 'N6_LOOPBACK_TRIAGE_POLICY_MISMATCH',
      message: 'N6 regeneration triage must not include debate_escalation or upstream_rollback.',
    };
  }
  return null;
}

export function n6LoopbackTriageRuntimeAuditDrift(
  message: string,
): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'N6_LOOPBACK_TRIAGE_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function n6LoopbackTriageAffectedRefsBlocker(
  payload: TopicSelectionV1bN6LoopbackTriageSupportPayload,
  frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
): { ok: false; code: string; message: string } | null {
  const allowedLineageRefs = uniqueRefs([
    frozenPayload.constraint_profile_ref,
    frozenPayload.intake_readiness_ref,
    frozenPayload.research_slice_ref,
    frozenPayload.research_slice_selection_ref,
    frozenPayload.research_slice_option_set_ref,
    frozenPayload.selected_slice_option_ref,
  ]);
  const allowedLineageRefKeys = new Set(allowedLineageRefs.map((ref) => refKey(ref)));
  const outsideLineageRef = payload.affected_refs
    .find((affectedRef) => !allowedLineageRefKeys.has(refKey(affectedRef)));
  const includesSelectedSlice = payload.affected_refs
    .some((affectedRef) => refsEqual(affectedRef, frozenPayload.research_slice_ref));
  if (outsideLineageRef || !includesSelectedSlice) {
    return {
      ok: false,
      code: 'N6_LOOPBACK_TRIAGE_AFFECTED_REFS_MISMATCH',
      message: 'N6 loopback triage affected_refs must stay within the frozen N6 lineage and include the selected ResearchSlice ref.',
    };
  }
  return null;
}

export function n6LoopbackRouteTargetNode(
  loopbackTargetCode: TopicSelectionV1bN6LoopbackTriageSupportPayload['loopback_target_code'],
): TopicSelectionV1bWorkflowHarnessNodeId {
  if (loopbackTargetCode === 'n6_loopback_to_n5_select_different_slice') {
    return 'topic-selection.v1b.select-research-slice.v1';
  }
  return 'topic-selection.v1b.generate-topic-question-candidates.v1';
}

export function n6LoopbackReasonCodes(blockedCandidateContexts: Record<string, unknown>[]): string[] {
  return uniqueStrings(
    blockedCandidateContexts
      .map((context) => typeof context.dominant_reason === 'string' ? context.dominant_reason : null)
      .filter((reason): reason is string => Boolean(reason)),
  );
}

export function isN6LoopbackTriageSupportPayload(value: unknown): value is TopicSelectionV1bN6LoopbackTriageSupportPayload {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'affected_refs',
    'debate_escalation',
    'dominant_reason_codes',
    'failure_scope',
    'loopback_target_code',
    'rationale',
    'regeneration_hints',
    'upstream_rollback',
  ])) {
    return false;
  }
  return [
    'n6_regenerate_candidates',
    'n6_debate_escalation',
    'n6_loopback_to_n5_select_different_slice',
  ].includes(value.loopback_target_code as string)
    && ['candidate_level', 'question_frame_level', 'slice_level', 'upstream_context_level'].includes(value.failure_scope as string)
    && isStringArray(value.dominant_reason_codes)
    && (value.dominant_reason_codes as string[]).length > 0
    && isFunctionalRefArray(value.affected_refs)
    && (value.affected_refs as unknown[]).length > 0
    && isStringArray(value.regeneration_hints)
    && typeof value.rationale === 'string'
    && value.rationale.trim().length > 0
    && isN6DebateEscalationPayload(value.debate_escalation)
    && isN6UpstreamRollbackPayload(value.upstream_rollback);
}

export function extractN6DraftPayload(
  payload: Record<string, unknown> | null | undefined,
): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload | null {
  if (!isRecord(payload)) {
    return null;
  }
  const candidate = isRecord(payload.normalized_output)
    ? payload.normalized_output
    : payload;
  return isN6DraftPayload(candidate)
    ? candidate as unknown as TopicSelectionV1bTopicQuestionCandidateSetDraftPayload
    : null;
}

export function n6NonSelectedPortfolioBlocker(
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  knownEvidenceIds: Set<string>,
): { code: string; message: string } | null {
  const portfolio = draft.portfolio_disposition;
  if (!portfolio || portfolio.outcome === 'selected') {
    return null;
  }
  const candidateKeys = new Set(draft.candidates.map((candidate) => candidate.candidate_key));
  const dispositionKeys = portfolio.candidate_dispositions.map((candidate) => candidate.candidate_key);
  const citedRefs = [
    ...portfolio.evidence_refs,
    ...portfolio.rejection_reasons.flatMap((reason) => reason.evidence_refs),
    ...portfolio.candidate_dispositions.flatMap((candidate) => candidate.evidence_refs),
  ];
  const valid = draft.recommended_candidate_keys.length === 0
    && portfolio.confidence >= 0
    && portfolio.confidence <= 1
    && portfolio.evidence_refs.length > 0
    && portfolio.rejection_reasons.length > 0
    && portfolio.reopening_conditions.length > 0
    && portfolio.rejection_reasons.every((reason) => reason.evidence_refs.length > 0)
    && citedRefs.every((ref) => knownEvidenceIds.has(ref.ref_id))
    && candidateKeys.size === draft.candidates.length
    && dispositionKeys.length === candidateKeys.size
    && new Set(dispositionKeys).size === dispositionKeys.length
    && dispositionKeys.every((candidateKey) => candidateKeys.has(candidateKey))
    && portfolio.candidate_dispositions.every((candidate) =>
      candidate.disposition !== 'selected'
      && candidate.evidence_refs.length > 0
      && (candidate.disposition === 'dropped') === Boolean(candidate.drop_reason_code)
      && (candidate.disposition !== 'parked' || candidate.reopening_conditions.length > 0)
    )
    && (portfolio.outcome !== 'none_viable' || draft.candidates.length === 0);
  return valid
    ? null
    : {
        code: 'N6_NON_SELECTED_PORTFOLIO_INVALID',
        message: 'N6 non-selected portfolios require frozen evidence-backed rejection reasons, bounded confidence, reopening conditions, and no recommended downstream candidate.',
      };
}

export function n6SelectedPortfolioBlocker(
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  knownEvidenceIds: Set<string>,
): { code: string; message: string } | null {
  const portfolio = draft.portfolio_disposition;
  if (portfolio?.outcome !== 'selected') {
    return null;
  }
  const candidateKeys = new Set(draft.candidates.map((candidate) => candidate.candidate_key));
  const dispositionKeys = portfolio.candidate_dispositions.map((candidate) => candidate.candidate_key);
  const selected = portfolio.candidate_dispositions.filter((candidate) => candidate.disposition === 'selected');
  const citedRefs = [
    ...portfolio.evidence_refs,
    ...portfolio.rejection_reasons.flatMap((reason) => reason.evidence_refs),
    ...portfolio.candidate_dispositions.flatMap((candidate) => candidate.evidence_refs),
  ];
  const valid = portfolio.confidence >= 0
    && portfolio.confidence <= 1
    && portfolio.evidence_refs.length > 0
    && draft.candidates.length > 0
    && selected.length === 1
    && draft.recommended_candidate_keys.length === 1
    && draft.recommended_candidate_keys[0] === selected[0]?.candidate_key
    && dispositionKeys.length === candidateKeys.size
    && new Set(dispositionKeys).size === dispositionKeys.length
    && dispositionKeys.every((candidateKey) => candidateKeys.has(candidateKey))
    && citedRefs.every((ref) => knownEvidenceIds.has(ref.ref_id))
    && portfolio.rejection_reasons.every((reason) => reason.evidence_refs.length > 0)
    && portfolio.candidate_dispositions.every((candidate) =>
      candidate.evidence_refs.length > 0
      && (candidate.disposition === 'dropped') === Boolean(candidate.drop_reason_code)
      && (candidate.disposition !== 'parked' || candidate.reopening_conditions.length > 0)
    );
  return valid
    ? null
    : {
        code: 'N6_SELECTED_PORTFOLIO_INVALID',
        message: 'N6 selected portfolios require exactly one recommended selected candidate, complete grounded dispositions, drop reasons, and parked reopening conditions.',
      };
}

export function missingN6TraceabilityEvidenceRoles(candidate: TopicSelectionTopicQuestionCandidateDraft): string[] {
  const refsByRole = {
    baseline: candidate.traceability_check.baseline_evidence_refs,
    challenge: candidate.traceability_check.challenge_evidence_refs,
    context: candidate.traceability_check.context_evidence_refs,
    support: candidate.traceability_check.support_evidence_refs,
  };
  return (['support', 'challenge', 'baseline', 'context'] as const)
    .filter((role) => refsByRole[role].length === 0);
}

export function n6FalsificationConditionWeak(condition: TopicSelectionTopicQuestionFalsificationConditionDraft): boolean {
  return condition.statement.trim().length < 24
    || (
      condition.trigger_evidence_refs.length === 0
      && condition.trigger_source_refs.length === 0
    )
    || condition.related_contract_fields.length === 0
    || condition.expected_action.trim().length === 0;
}

export function isN6CandidateDraft(value: unknown): value is TopicSelectionTopicQuestionCandidateDraft {
  if (!isRecord(value) || !hasOnlyKeys(value, [
    'answerability_plan',
    'answerability_verdict',
    'blockers',
    'boundary_check',
    'candidate_key',
    'confidence',
    'contribution_hypothesis',
    'expected_claim',
    'fallback_claim',
    'falsification_conditions',
    'human_review_triggers',
    'main_question',
    'max_claim_strength',
    'observable_success_criteria',
    'objections',
    'question_type',
    'risk_notes',
    'source_validated_need_refs',
    'sub_questions',
    'traceability_check',
  ])) {
    return false;
  }
  return typeof value.candidate_key === 'string'
    && typeof value.main_question === 'string'
    && isStringArray(value.sub_questions)
    && ['method', 'benchmark', 'analysis', 'resource', 'system'].includes(value.question_type as string)
    && ['method', 'benchmark', 'analysis', 'resource', 'system'].includes(value.contribution_hypothesis as string)
    && isFunctionalRefArray(value.source_validated_need_refs)
    && isN6AnswerabilityPlanDraft(value.answerability_plan)
    && ['answerable', 'answerable_with_risk', 'needs_slice_refinement', 'not_answerable'].includes(value.answerability_verdict as string)
    && typeof value.expected_claim === 'string'
    && typeof value.fallback_claim === 'string'
    && typeof value.max_claim_strength === 'string'
    && isStringArray(value.observable_success_criteria)
    && isN6BoundaryCheckDraft(value.boundary_check)
    && isN6TraceabilityCheckDraft(value.traceability_check)
    && Array.isArray(value.falsification_conditions)
    && value.falsification_conditions.every((condition) => isN6FalsificationConditionDraft(condition))
    && isStringArray(value.risk_notes)
    && isStringArray(value.blockers)
    && isStringArray(value.objections)
    && isStringArray(value.human_review_triggers)
    && (value.confidence === null || typeof value.confidence === 'number');
}
