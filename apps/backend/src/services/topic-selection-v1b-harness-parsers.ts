/**
 * W-12 / D-T127-01 (slice 6): v1b harness frozen-input PARSER cluster, relocated VERBATIM from the
 * harness. Each parseN*Payload validates a node's frozen-input payload (shape + refs/hashes via the
 * pure-utils + predicate guards) and returns the typed payload or a structured {ok:false} error.
 * Pure / `this`-free. (parseN2 / parseN5 remain in the harness until their accepted*PayloadIsValid
 * validators are relocated; the larger N7–N11 parsers follow in a subsequent slice.)
 */
import type {
  TopicSelectionV1bN1HarnessFrozenInputPayload,
  TopicSelectionV1bN2HarnessFrozenInputPayload,
  TopicSelectionV1bN3HarnessFrozenInputPayload,
  TopicSelectionV1bN4HarnessFrozenInputPayload,
  TopicSelectionV1bN5HarnessFrozenInputPayload,
  TopicSelectionV1bN6HarnessFrozenInputPayload,
  TopicSelectionV1bN7HarnessFrozenInputPayload,
  TopicSelectionV1bN8HarnessFrozenInputPayload,
  TopicSelectionV1bN9HarnessFrozenInputPayload,
  TopicSelectionV1bN10HarnessFrozenInputPayload,
  TopicSelectionV1bN11HarnessFrozenInputPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { hasOnlyKeys, isHash, isRecord } from './topic-selection-v1b-harness-pure-utils.js';
import {
  isFunctionalRefArray,
  isFunctionalRefValue,
  isNullableFunctionalRefValue,
  isNullableHash,
  isNullableSliceLoopbackTarget,
  isNullableString,
  isRejectedOptionReasonArray,
  isSliceLoopbackTarget,
  isSliceSelectionDecision,
  isStringArray,
} from './topic-selection-v1b-harness-predicates.js';

export function parseN1Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN1HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = ['v1b_input_bundle_id', 'v1a_bundle_ref', 'v1a_bundle_hash', 'source_refs_hash'];
  if (!hasOnlyKeys(payload, allowedKeys)
    || typeof payload.v1b_input_bundle_id !== 'string'
    || !payload.v1b_input_bundle_id.trim()
    || !isHash(payload.v1a_bundle_hash)
    || !isHash(payload.source_refs_hash)
    || !isFunctionalRefValue(payload.v1a_bundle_ref)) {
    return {
      ok: false,
      code: 'N1_FROZEN_PAYLOAD_INVALID',
      message: 'N1 requires frozen v1b input bundle id and expected bundle/source hash metadata.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN1HarnessFrozenInputPayload,
  };
}

export function parseN3Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN3HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_snapshot_hash',
    'intake_snapshot_ref',
    'n2_handoff_hash',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.intake_snapshot_ref)
    || !isHash(payload.intake_snapshot_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isHash(payload.n2_handoff_hash)) {
    return {
      ok: false,
      code: 'N3_FROZEN_PAYLOAD_INVALID',
      message: 'N3 requires frozen N1/N2 authority refs and hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN3HarnessFrozenInputPayload,
  };
}

export function parseN4Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN4HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_readiness_hash',
    'intake_readiness_ref',
    'intake_snapshot_hash',
    'intake_snapshot_ref',
    'n2_handoff_hash',
    'n3_handoff_hash',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.intake_snapshot_ref)
    || !isHash(payload.intake_snapshot_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isFunctionalRefValue(payload.intake_readiness_ref)
    || !isHash(payload.intake_readiness_hash)
    || !isHash(payload.n2_handoff_hash)
    || !isHash(payload.n3_handoff_hash)) {
    return {
      ok: false,
      code: 'N4_FROZEN_PAYLOAD_INVALID',
      message: 'N4 requires frozen N1/N2/N3 authority refs and replay lineage hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN4HarnessFrozenInputPayload,
  };
}

export function parseN6Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN6HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'constraint_profile_hash',
    'constraint_profile_ref',
    'intake_readiness_hash',
    'intake_readiness_ref',
    'n5_handoff_hash',
    'research_slice_hash',
    'research_slice_option_set_hash',
    'research_slice_option_set_ref',
    'research_slice_ref',
    'research_slice_selection_hash',
    'research_slice_selection_ref',
    'selected_slice_option_hash',
    'selected_slice_option_ref',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isHash(payload.n5_handoff_hash)
    || !isFunctionalRefValue(payload.constraint_profile_ref)
    || !isHash(payload.constraint_profile_hash)
    || !isFunctionalRefValue(payload.intake_readiness_ref)
    || !isHash(payload.intake_readiness_hash)
    || !isFunctionalRefValue(payload.research_slice_ref)
    || !isHash(payload.research_slice_hash)
    || !isFunctionalRefValue(payload.research_slice_selection_ref)
    || !isHash(payload.research_slice_selection_hash)
    || !isFunctionalRefValue(payload.research_slice_option_set_ref)
    || !isHash(payload.research_slice_option_set_hash)
    || !isFunctionalRefValue(payload.selected_slice_option_ref)
    || !isHash(payload.selected_slice_option_hash)) {
    return {
      ok: false,
      code: 'N6_FROZEN_PAYLOAD_INVALID',
      message: 'N6 requires a frozen N5 selected ResearchSlice handoff payload with explicit refs and hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload,
  };
}

export function parseN7Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN7HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const baseKeys = [
    'input_mode',
    'n6_handoff_hash',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'admissible_candidate_refs',
    'admissible_candidate_hashes',
    'selected_research_slice_ref',
    'selected_research_slice_hash',
    'generation_artifact_ref',
    'generation_artifact_hash',
    'candidate_gate_hash',
    'candidate_grouping_ref',
    'candidate_grouping_hash',
  ];
  const feedbackKeys = [
    ...baseKeys,
    'n8_feedback_ref',
    'n8_feedback_hash',
    'n8_feedback_payload_hash',
  ];
  const mode = payload.input_mode;
  const allowedKeys = mode === 'feedback_from_n8' ? feedbackKeys : baseKeys;
  if (!hasOnlyKeys(payload, allowedKeys)
    || (mode !== 'initial_from_n6' && mode !== 'feedback_from_n8')
    || !isHash(payload.n6_handoff_hash)
    || !isFunctionalRefValue(payload.topic_question_candidate_set_ref)
    || !isHash(payload.topic_question_candidate_set_hash)
    || !isFunctionalRefArray(payload.admissible_candidate_refs)
    || (payload.admissible_candidate_refs as unknown[]).length === 0
    || !isStringArray(payload.admissible_candidate_hashes)
    || !(payload.admissible_candidate_hashes as string[]).every((hash) => isHash(hash))
    || (payload.admissible_candidate_hashes as string[]).length !== (payload.admissible_candidate_refs as unknown[]).length
    || !isFunctionalRefValue(payload.selected_research_slice_ref)
    || !isHash(payload.selected_research_slice_hash)
    || !isFunctionalRefValue(payload.generation_artifact_ref)
    || !isHash(payload.generation_artifact_hash)
    || !isHash(payload.candidate_gate_hash)
    || !isNullableFunctionalRefValue(payload.candidate_grouping_ref)
    || !isNullableHash(payload.candidate_grouping_hash)) {
    return {
      ok: false,
      code: 'N7_FROZEN_PAYLOAD_INVALID',
      message: 'N7 requires frozen N6 candidate-set lineage refs, hashes, and candidate hash pairs.',
    };
  }
  if (mode === 'feedback_from_n8'
    && (!isFunctionalRefValue(payload.n8_feedback_ref)
      || !isHash(payload.n8_feedback_hash)
      || !isHash(payload.n8_feedback_payload_hash))) {
    return {
      ok: false,
      code: 'N7_FEEDBACK_PAYLOAD_INVALID',
      message: 'N7 feedback mode requires frozen N8 feedback refs and hashes.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN7HarnessFrozenInputPayload,
  };
}

export function parseN8Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN8HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  if (!hasOnlyKeys(payload, [
    'n7_handoff_hash',
    'topic_question_ref',
    'topic_question_hash',
    'topic_question_contract_ref',
    'topic_question_contract_hash',
    'answerability_plan_ref',
    'answerability_plan_hash',
    'trial_ledger_ref',
    'trial_ledger_hash',
    'topic_question_candidate_set_ref',
    'topic_question_candidate_set_hash',
    'active_candidate_ref',
    'active_candidate_hash',
    'selected_research_slice_ref',
    'selected_research_slice_hash',
    'n8_debate_admission_ref',
    'n8_debate_admission_hash',
    'candidate_grouping_ref',
    'candidate_grouping_hash',
  ])
    || !isHash(payload.n7_handoff_hash)
    || !isFunctionalRefValue(payload.topic_question_ref)
    || !isHash(payload.topic_question_hash)
    || !isFunctionalRefValue(payload.topic_question_contract_ref)
    || !isHash(payload.topic_question_contract_hash)
    || !isFunctionalRefValue(payload.answerability_plan_ref)
    || !isHash(payload.answerability_plan_hash)
    || !isFunctionalRefValue(payload.trial_ledger_ref)
    || !isHash(payload.trial_ledger_hash)
    || !isFunctionalRefValue(payload.topic_question_candidate_set_ref)
    || !isHash(payload.topic_question_candidate_set_hash)
    || !isFunctionalRefValue(payload.active_candidate_ref)
    || !isHash(payload.active_candidate_hash)
    || !isFunctionalRefValue(payload.selected_research_slice_ref)
    || !isHash(payload.selected_research_slice_hash)
    || !isFunctionalRefValue(payload.n8_debate_admission_ref)
    || !isHash(payload.n8_debate_admission_hash)
    || !isNullableFunctionalRefValue(payload.candidate_grouping_ref)
    || !isNullableHash(payload.candidate_grouping_hash)) {
    return {
      ok: false,
      code: 'N8_FROZEN_PAYLOAD_INVALID',
      message: 'N8 requires a frozen N7-to-N8 handoff payload with contract, candidate, and debate admission hashes.',
    };
  }
  return { ok: true, value: payload as unknown as TopicSelectionV1bN8HarnessFrozenInputPayload };
}

export function parseN9Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN9HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  if (!hasOnlyKeys(payload, [
    'n8_handoff_hash',
    'topic_value_assessment_ref',
    'topic_value_assessment_hash',
    'topic_question_contract_ref',
    'topic_question_contract_hash',
    'value_reasoning_memo_ref',
    'value_reasoning_memo_hash',
    'recommended_disposition',
  ])
    || !isHash(payload.n8_handoff_hash)
    || !isFunctionalRefValue(payload.topic_value_assessment_ref)
    || !isHash(payload.topic_value_assessment_hash)
    || !isFunctionalRefValue(payload.topic_question_contract_ref)
    || !isHash(payload.topic_question_contract_hash)
    || !isFunctionalRefValue(payload.value_reasoning_memo_ref)
    || !isHash(payload.value_reasoning_memo_hash)
    || !['advance_to_package', 'refine_question', 'refine_slice', 'recheck_evidence_or_search', 'park', 'drop']
      .includes(payload.recommended_disposition as string)) {
    return {
      ok: false,
      code: 'N9_FROZEN_PAYLOAD_INVALID',
      message: 'N9 requires frozen N8 assessment, memo, and disposition hashes.',
    };
  }
  return { ok: true, value: payload as unknown as TopicSelectionV1bN9HarnessFrozenInputPayload };
}

export function parseN10Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN10HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  if (!hasOnlyKeys(payload, [
    'n9_handoff_hash',
    'value_disposition_ref',
    'value_disposition_hash',
    'advance_disposition',
    'topic_value_assessment_ref',
    'topic_value_assessment_hash',
  ])
    || !isHash(payload.n9_handoff_hash)
    || !isFunctionalRefValue(payload.value_disposition_ref)
    || !isHash(payload.value_disposition_hash)
    || payload.advance_disposition !== true
    || !isFunctionalRefValue(payload.topic_value_assessment_ref)
    || !isHash(payload.topic_value_assessment_hash)) {
    return {
      ok: false,
      code: 'N10_FROZEN_PAYLOAD_INVALID',
      message: 'N10 requires frozen advance disposition and value assessment lineage.',
    };
  }
  return { ok: true, value: payload as unknown as TopicSelectionV1bN10HarnessFrozenInputPayload };
}

export function parseN11Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN11HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  if (!hasOnlyKeys(payload, [
    'n10_handoff_hash',
    'draft_topic_package_ref',
    'draft_topic_package_hash',
    'value_disposition_ref',
    'value_disposition_hash',
    'v1c_input_bundle_ref',
    'v1c_input_bundle_hash',
  ])
    || !isHash(payload.n10_handoff_hash)
    || !isFunctionalRefValue(payload.draft_topic_package_ref)
    || !isHash(payload.draft_topic_package_hash)
    || !isFunctionalRefValue(payload.value_disposition_ref)
    || !isHash(payload.value_disposition_hash)
    || !isFunctionalRefValue(payload.v1c_input_bundle_ref)
    || !isHash(payload.v1c_input_bundle_hash)) {
    return {
      ok: false,
      code: 'N11_FROZEN_PAYLOAD_INVALID',
      message: 'N11 requires frozen package, disposition, and v1c input bundle refs and hashes.',
    };
  }
  return { ok: true, value: payload as unknown as TopicSelectionV1bN11HarnessFrozenInputPayload };
}

// N2 / N5 accepted-payload validators (used by parseN2/parseN5 and by one harness gate site each).
export function acceptedConstraintProfilePayloadIsValid(value: Record<string, unknown>): boolean {
  return hasOnlyKeys(value, [
    'available_assets',
    'claim_ceiling',
    'constraint_payload',
    'feasibility_budget',
    'human_constraint_notes',
    'intended_contribution_style',
    'method_constraints',
    'non_goals',
    'resource_constraints',
    'target_community',
    'target_venue_class',
  ])
    && typeof value.target_community === 'string'
    && isNullableString(value.target_venue_class)
    && isNullableString(value.intended_contribution_style)
    && isStringArray(value.method_constraints)
    && isStringArray(value.resource_constraints)
    && isStringArray(value.available_assets)
    && isRecord(value.feasibility_budget)
    && isStringArray(value.non_goals)
    && typeof value.claim_ceiling === 'string'
    && isNullableString(value.human_constraint_notes)
    && isRecord(value.constraint_payload);
}

export function acceptedSliceSelectionPayloadIsValid(value: Record<string, unknown>): boolean {
  if (!hasOnlyKeys(value, [
    'accepted_risk_refs',
    'confidence',
    'decision',
    'decision_basis',
    'human_review_reason',
    'loopback_reason_code',
    'loopback_target',
    'loopback_target_ref',
    'rejected_option_reasons',
    'required_actions',
    'requires_human_review',
    'selected_option_hash',
    'selected_option_ref',
    'selection_rationale',
  ])
    || !isSliceSelectionDecision(value.decision)
    || !isNullableFunctionalRefValue(value.selected_option_ref)
    || !isNullableHash(value.selected_option_hash)
    || typeof value.selection_rationale !== 'string'
    || value.selection_rationale.trim().length === 0
    || !isRecord(value.decision_basis)
    || !isRejectedOptionReasonArray(value.rejected_option_reasons)
    || !isStringArray(value.required_actions)
    || !isFunctionalRefArray(value.accepted_risk_refs)
    || !(value.confidence === null || typeof value.confidence === 'number')
    || typeof value.requires_human_review !== 'boolean'
    || !isNullableString(value.human_review_reason)
    || !isNullableSliceLoopbackTarget(value.loopback_target)
    || !isNullableFunctionalRefValue(value.loopback_target_ref)
    || !isNullableString(value.loopback_reason_code)) {
    return false;
  }
  if (value.decision === 'select') {
    return isFunctionalRefValue(value.selected_option_ref)
      && isHash(value.selected_option_hash)
      && value.loopback_target === null
      && value.loopback_target_ref === null
      && value.loopback_reason_code === null;
  }
  if (value.selected_option_ref !== null || value.selected_option_hash !== null) {
    return false;
  }
  if (value.decision === 'request_more_options') {
    return isSliceLoopbackTarget(value.loopback_target)
      && typeof value.loopback_reason_code === 'string'
      && value.loopback_reason_code.trim().length > 0;
  }
  return true;
}

export function parseN2Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN2HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'accepted_constraint_profile_payload',
    'accepted_constraint_profile_payload_hash',
    'authority_input_provider',
    'delegation_artifact_hash',
    'intake_snapshot_hash',
    'intake_snapshot_ref',
    'previous_profile_hash',
    'previous_profile_ref',
    'v1a_bundle_hash',
    'v1a_bundle_ref',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.intake_snapshot_ref)
    || !isHash(payload.intake_snapshot_hash)
    || !isFunctionalRefValue(payload.v1a_bundle_ref)
    || !isHash(payload.v1a_bundle_hash)
    || !['human_delegated', 'codex_delegated', 'fixture'].includes(payload.authority_input_provider as string)
    || !isRecord(payload.accepted_constraint_profile_payload)
    || !isHash(payload.accepted_constraint_profile_payload_hash)
    || !isNullableHash(payload.delegation_artifact_hash)
    || !isNullableFunctionalRefValue(payload.previous_profile_ref)
    || !isNullableHash(payload.previous_profile_hash)) {
    return {
      ok: false,
      code: 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID',
      message: 'N2 requires a frozen accepted ResearchConstraintProfile payload with refs and hashes.',
    };
  }
  const accepted = payload.accepted_constraint_profile_payload;
  if (!acceptedConstraintProfilePayloadIsValid(accepted)) {
    return {
      ok: false,
      code: 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID',
      message: 'N2 accepted ResearchConstraintProfile payload is malformed.',
    };
  }
  if (payload.authority_input_provider === 'codex_delegated' && !isHash(payload.delegation_artifact_hash)) {
    return {
      ok: false,
      code: 'N2_CODEX_DELEGATION_ARTIFACT_REQUIRED',
      message: 'N2 codex_delegated authority input requires frozen matching semantic artifact provenance.',
    };
  }
  if (payload.authority_input_provider !== 'codex_delegated' && payload.delegation_artifact_hash !== null) {
    return {
      ok: false,
      code: 'N2_DELEGATION_ARTIFACT_NOT_ALLOWED',
      message: 'N2 non-Codex delegated authority input must not carry delegation_artifact_hash.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN2HarnessFrozenInputPayload,
  };
}

export function parseN5Payload(
  payload: Record<string, unknown>,
): { ok: true; value: TopicSelectionV1bN5HarnessFrozenInputPayload } | { ok: false; code: string; message: string } {
  const allowedKeys = [
    'accepted_selection_payload',
    'accepted_selection_payload_hash',
    'authority_input_provider',
    'delegation_artifact_hash',
    'n4_handoff_hash',
    'research_slice_option_set_hash',
    'research_slice_option_set_ref',
  ];
  if (!hasOnlyKeys(payload, allowedKeys)
    || !isFunctionalRefValue(payload.research_slice_option_set_ref)
    || !isHash(payload.research_slice_option_set_hash)
    || !isHash(payload.n4_handoff_hash)
    || !['human_delegated', 'codex_delegated', 'fixture'].includes(payload.authority_input_provider as string)
    || !isRecord(payload.accepted_selection_payload)
    || !isHash(payload.accepted_selection_payload_hash)
    || !isNullableHash(payload.delegation_artifact_hash)) {
    return {
      ok: false,
      code: 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID',
      message: 'N5 requires a frozen accepted ResearchSlice selection payload with option-set refs and hashes.',
    };
  }
  if (!acceptedSliceSelectionPayloadIsValid(payload.accepted_selection_payload)) {
    return {
      ok: false,
      code: 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID',
      message: 'N5 accepted ResearchSlice selection payload is malformed.',
    };
  }
  if (payload.authority_input_provider === 'codex_delegated' && !isHash(payload.delegation_artifact_hash)) {
    return {
      ok: false,
      code: 'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED',
      message: 'N5 codex_delegated authority input requires frozen matching semantic artifact provenance.',
    };
  }
  if (payload.authority_input_provider !== 'codex_delegated' && payload.delegation_artifact_hash !== null) {
    return {
      ok: false,
      code: 'N5_DELEGATION_ARTIFACT_NOT_ALLOWED',
      message: 'N5 non-Codex delegated authority input must not carry delegation_artifact_hash.',
    };
  }
  return {
    ok: true,
    value: payload as unknown as TopicSelectionV1bN5HarnessFrozenInputPayload,
  };
}
