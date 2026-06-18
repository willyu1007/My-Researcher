/**
 * W-12 / D-T127-01: v1b harness N7 (materialize-topic-question-contract) pure leaves, relocated
 * VERBATIM from the harness. `this`-free handoff/payload match, runtime-audit-drift factory,
 * candidate-admission gate, question-frame readers, and hard-gate/rejection summaries. The N7
 * methods taking N7LoadedContext / N7SupportContext / N7CandidateChoice (n7LineageBlocker,
 * chooseN7Candidate, materializeN7TopicQuestion, the projection builders, n7Support*) stay.
 */
import type {
  TopicSelectionV1bN6ToN7HandoffPayload,
  TopicSelectionV1bN7HarnessFrozenInputPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import type {
  TopicSelectionQuestionFrameRecord,
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import {
  nullableRefsEqual,
  refArraysEqual,
  refsEqual,
  stringArraysEqual,
} from './topic-selection-v1b-harness-gate-utils.js';

export function n7RuntimeAuditDrift(message: string): { ok: false; code: string; message: string } {
  return {
    ok: false,
    code: 'N7_SUPPORT_ARTIFACT_RUNTIME_CONTEXT_DRIFT',
    message,
  };
}

export function n7PayloadMatchesN6Handoff(
  payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  handoffPayload: TopicSelectionV1bN6ToN7HandoffPayload,
): boolean {
  return payload.topic_question_candidate_set_hash === handoffPayload.topic_question_candidate_set_hash
    && payload.selected_research_slice_hash === handoffPayload.selected_research_slice_hash
    && payload.generation_artifact_hash === handoffPayload.generation_artifact_hash
    && payload.candidate_gate_hash === handoffPayload.candidate_gate_hash
    && payload.candidate_grouping_hash === handoffPayload.candidate_grouping_hash
    && refsEqual(payload.topic_question_candidate_set_ref, handoffPayload.topic_question_candidate_set_ref)
    && refsEqual(payload.selected_research_slice_ref, handoffPayload.selected_research_slice_ref)
    && refsEqual(payload.generation_artifact_ref, handoffPayload.generation_artifact_ref)
    && nullableRefsEqual(payload.candidate_grouping_ref, handoffPayload.candidate_grouping_ref)
    && refArraysEqual(payload.admissible_candidate_refs, handoffPayload.admissible_candidate_refs)
    && stringArraysEqual(payload.admissible_candidate_hashes, handoffPayload.admissible_candidate_hashes);
}

export function n7FailedCandidateIdsFromCurrentState(
  candidates: TopicSelectionTopicQuestionCandidateRecord[],
): string[] {
  return candidates
    .filter((candidate) => candidate.status === 'rejected')
    .map((candidate) => candidate.topic_question_candidate_id);
}

export function n7CandidateAdmissionBlocker(
  candidate: TopicSelectionTopicQuestionCandidateRecord,
  frame: TopicSelectionQuestionFrameRecord,
): { code: string; message: string } | null {
  if (candidate.status === 'blocked' || candidate.blockers.length > 0) {
    return {
      code: 'N7_ACTIVE_CANDIDATE_BLOCKED',
      message: 'N7 active candidate is blocked and cannot be materialized.',
    };
  }
  if (candidate.boundary_check_payload.boundary_violations.length > 0) {
    return {
      code: 'N7_ACTIVE_CANDIDATE_BOUNDARY_VIOLATION',
      message: 'N7 active candidate has boundary violations.',
    };
  }
  if (candidate.answerability_verdict === 'not_answerable'
    || candidate.answerability_verdict === 'needs_slice_refinement') {
    return {
      code: 'N7_ACTIVE_CANDIDATE_NOT_ANSWERABLE',
      message: 'N7 active candidate is not answerable within the selected slice.',
    };
  }
  if (candidate.answerability_plan_payload.datasets_or_resources.length === 0
    || candidate.answerability_plan_payload.metrics.length === 0
    || candidate.answerability_plan_payload.baselines.length === 0
    || candidate.answerability_plan_payload.required_evidence_refs.length === 0
    || candidate.answerability_plan_payload.evaluation_setting.trim().length === 0) {
    return {
      code: 'N7_ACTIVE_CANDIDATE_ANSWERABILITY_PLAN_INVALID',
      message: 'N7 active candidate is missing a minimum answerability plan.',
    };
  }
  const claimCeiling = n7FrameClaimCeiling(frame);
  const claimText = [
    candidate.expected_claim,
    candidate.fallback_claim,
    candidate.max_claim_strength,
  ].join(' ').toLowerCase();
  if (claimCeiling.toLowerCase().includes('bounded') && /\bprove\b|\bguarantee\b|\balways\b/u.test(claimText)) {
    return {
      code: 'N7_ACTIVE_CANDIDATE_CLAIM_CEILING_DRIFT',
      message: 'N7 active candidate exceeds the frozen claim ceiling.',
    };
  }
  return null;
}

export function n7FrameClaimCeiling(frame: TopicSelectionQuestionFrameRecord): string {
  const value = frame.frame_payload.inherited_claim_ceiling;
  return typeof value === 'string' && value.trim().length > 0 ? value : 'Bounded workflow claim.';
}

export function n7FrameStringArray(frame: TopicSelectionQuestionFrameRecord, key: string): string[] {
  const value = frame.frame_payload[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function n7RequiredEvidenceCategories(evidenceRefs: TopicSelectionTopicQuestionEvidenceRefRecord[]): string[] {
  const roles = new Set(evidenceRefs.map((ref) => ref.evidence_role));
  return ['support', 'challenge', 'claim', 'baseline', 'context'].filter((role) =>
    roles.has(role as TopicSelectionTopicQuestionEvidenceRefRecord['evidence_role']));
}

export function n7HardGateResults(candidates: TopicSelectionTopicQuestionCandidateRecord[]): Record<string, unknown>[] {
  return candidates.map((candidate) => ({
    answerability_verdict: candidate.answerability_verdict,
    blockers: candidate.blockers,
    candidate_id: candidate.topic_question_candidate_id,
    passed: candidate.status !== 'blocked' && candidate.blockers.length === 0,
  }));
}

export function n7RejectedCandidateReasons(
  candidates: TopicSelectionTopicQuestionCandidateRecord[],
  admittedCandidates: TopicSelectionTopicQuestionCandidateRecord[],
  failedCandidateIds: string[],
): Record<string, unknown>[] {
  const admittedIds = new Set(admittedCandidates.map((candidate) => candidate.topic_question_candidate_id));
  const failedIds = new Set(failedCandidateIds);
  return candidates
    .filter((candidate) => !admittedIds.has(candidate.topic_question_candidate_id))
    .map((candidate) => ({
      candidate_id: candidate.topic_question_candidate_id,
      reason: failedIds.has(candidate.topic_question_candidate_id)
        ? 'Rejected by frozen N8 feedback.'
        : 'Preserved for possible later trial.',
    }));
}
