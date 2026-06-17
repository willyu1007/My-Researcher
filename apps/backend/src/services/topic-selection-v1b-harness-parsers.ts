/**
 * W-12 / D-T127-01 (slice 6): v1b harness frozen-input PARSER cluster, relocated VERBATIM from the
 * harness. Each parseN*Payload validates a node's frozen-input payload (shape + refs/hashes via the
 * pure-utils + predicate guards) and returns the typed payload or a structured {ok:false} error.
 * Pure / `this`-free. (parseN2 / parseN5 remain in the harness until their accepted*PayloadIsValid
 * validators are relocated; the larger N7–N11 parsers follow in a subsequent slice.)
 */
import type {
  TopicSelectionV1bN1HarnessFrozenInputPayload,
  TopicSelectionV1bN3HarnessFrozenInputPayload,
  TopicSelectionV1bN4HarnessFrozenInputPayload,
  TopicSelectionV1bN6HarnessFrozenInputPayload,
  TopicSelectionV1bN7HarnessFrozenInputPayload,
  TopicSelectionV1bN8HarnessFrozenInputPayload,
  TopicSelectionV1bN9HarnessFrozenInputPayload,
  TopicSelectionV1bN10HarnessFrozenInputPayload,
  TopicSelectionV1bN11HarnessFrozenInputPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { hasOnlyKeys, isHash } from './topic-selection-v1b-harness-pure-utils.js';
import {
  isFunctionalRefArray,
  isFunctionalRefValue,
  isNullableFunctionalRefValue,
  isNullableHash,
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
