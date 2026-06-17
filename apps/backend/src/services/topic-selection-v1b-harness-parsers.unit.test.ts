/**
 * W-12 / T-127 adversarial-review hardening: co-located unit coverage for the v1b harness frozen-input
 * PARSER cluster (relocated VERBATIM out of the harness in slices 6–9). The review found the
 * {ok:false}/false REJECTION branches of these pure functions had NO coverage — a mutation that drops
 * an isHash guard (admitting a malformed payload) stayed green. This suite exercises BOTH branches of
 * every parseN*Payload and both validators, asserting EXACT codes/booleans, so a future divergence
 * (a relaxed guard, a renamed/dropped code) fails loudly.
 *
 * Pure functions: no DB / network / LLM / `this`. We build small DRY payload factories that satisfy
 * hasOnlyKeys + every predicate, then break ONE field per negative case.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptedConstraintProfilePayloadIsValid,
  acceptedSliceSelectionPayloadIsValid,
  parseN1Payload,
  parseN2Payload,
  parseN3Payload,
  parseN4Payload,
  parseN5Payload,
  parseN6Payload,
  parseN7Payload,
  parseN8Payload,
  parseN9Payload,
  parseN10Payload,
  parseN11Payload,
} from './topic-selection-v1b-harness-parsers.js';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/** A valid 64-hex sha256-shaped hash (HASH_PATTERN: /^[a-f0-9]{64}$/). */
const HASH = 'a'.repeat(64);
/** A second distinct valid hash, to keep distinct fields visibly distinct. */
const HASH2 = 'b'.repeat(64);
/** A string that is NOT a valid hash (too short / not hex-64). */
const NOT_HASH = 'deadbeef';

/** A valid functional ref ({ref_type, ref_id, version_id:null, title_card_id:null}). */
function ref(refId = 'r-1'): Record<string, unknown> {
  return { ref_type: 'topic_selection_artifact', ref_id: refId, version_id: null, title_card_id: null };
}

/**
 * Generic assertion helpers. We assert on the discriminated union so that the
 * `value`/`code` accesses are sound, and so a wrong shape fails loudly.
 */
function expectOk(result: { ok: true; value: unknown } | { ok: false; code: string; message: string }): void {
  assert.equal(result.ok, true, `expected ok:true, got ${JSON.stringify(result)}`);
}
function expectErr(
  result: { ok: true; value: unknown } | { ok: false; code: string; message: string },
  code: string,
): void {
  assert.equal(result.ok, false, `expected ok:false (code ${code}), got ok:true`);
  if (result.ok === false) {
    assert.equal(result.code, code);
    assert.equal(typeof result.message, 'string');
    assert.ok(result.message.length > 0, 'error message must be non-empty');
  }
}

// ---------------------------------------------------------------------------
// N1
// ---------------------------------------------------------------------------

function n1(): Record<string, unknown> {
  return {
    v1b_input_bundle_id: 'bundle-1',
    v1a_bundle_ref: ref('v1a'),
    v1a_bundle_hash: HASH,
    source_refs_hash: HASH2,
  };
}

test('parseN1Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN1Payload(n1()));
});

test('parseN1Payload: rejects with N1_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN1Payload({ ...n1(), extra: 1 }), 'N1_FROZEN_PAYLOAD_INVALID'); // hasOnlyKeys
  expectErr(parseN1Payload({ ...n1(), v1b_input_bundle_id: 42 }), 'N1_FROZEN_PAYLOAD_INVALID'); // non-string id
  expectErr(parseN1Payload({ ...n1(), v1b_input_bundle_id: '   ' }), 'N1_FROZEN_PAYLOAD_INVALID'); // blank id
  expectErr(parseN1Payload({ ...n1(), v1a_bundle_hash: NOT_HASH }), 'N1_FROZEN_PAYLOAD_INVALID'); // bad hash
  expectErr(parseN1Payload({ ...n1(), source_refs_hash: NOT_HASH }), 'N1_FROZEN_PAYLOAD_INVALID'); // bad hash
  expectErr(parseN1Payload({ ...n1(), v1a_bundle_ref: { ref_type: '', ref_id: 'x' } }), 'N1_FROZEN_PAYLOAD_INVALID'); // bad ref
  expectErr(parseN1Payload({ ...n1(), v1a_bundle_ref: null }), 'N1_FROZEN_PAYLOAD_INVALID'); // null ref (not nullable here)
});

// ---------------------------------------------------------------------------
// N3
// ---------------------------------------------------------------------------

function n3(): Record<string, unknown> {
  return {
    constraint_profile_hash: HASH,
    constraint_profile_ref: ref('cp'),
    intake_snapshot_hash: HASH2,
    intake_snapshot_ref: ref('intake'),
    n2_handoff_hash: HASH,
  };
}

test('parseN3Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN3Payload(n3()));
});

test('parseN3Payload: rejects with N3_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN3Payload({ ...n3(), extra: 1 }), 'N3_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN3Payload({ ...n3(), intake_snapshot_ref: null }), 'N3_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN3Payload({ ...n3(), intake_snapshot_hash: NOT_HASH }), 'N3_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN3Payload({ ...n3(), constraint_profile_ref: 'not-a-ref' }), 'N3_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN3Payload({ ...n3(), constraint_profile_hash: NOT_HASH }), 'N3_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN3Payload({ ...n3(), n2_handoff_hash: NOT_HASH }), 'N3_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N4
// ---------------------------------------------------------------------------

function n4(): Record<string, unknown> {
  return {
    constraint_profile_hash: HASH,
    constraint_profile_ref: ref('cp'),
    intake_readiness_hash: HASH,
    intake_readiness_ref: ref('readiness'),
    intake_snapshot_hash: HASH2,
    intake_snapshot_ref: ref('intake'),
    n2_handoff_hash: HASH,
    n3_handoff_hash: HASH2,
  };
}

test('parseN4Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN4Payload(n4()));
});

test('parseN4Payload: rejects with N4_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN4Payload({ ...n4(), extra: 1 }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), intake_snapshot_ref: null }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), intake_snapshot_hash: NOT_HASH }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), constraint_profile_ref: null }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), constraint_profile_hash: NOT_HASH }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), intake_readiness_ref: null }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), intake_readiness_hash: NOT_HASH }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), n2_handoff_hash: NOT_HASH }), 'N4_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN4Payload({ ...n4(), n3_handoff_hash: NOT_HASH }), 'N4_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N6
// ---------------------------------------------------------------------------

function n6(): Record<string, unknown> {
  return {
    constraint_profile_hash: HASH,
    constraint_profile_ref: ref('cp'),
    intake_readiness_hash: HASH,
    intake_readiness_ref: ref('readiness'),
    n5_handoff_hash: HASH,
    research_slice_hash: HASH,
    research_slice_option_set_hash: HASH,
    research_slice_option_set_ref: ref('option-set'),
    research_slice_ref: ref('slice'),
    research_slice_selection_hash: HASH,
    research_slice_selection_ref: ref('selection'),
    selected_slice_option_hash: HASH,
    selected_slice_option_ref: ref('selected-option'),
  };
}

test('parseN6Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN6Payload(n6()));
});

test('parseN6Payload: rejects with N6_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN6Payload({ ...n6(), extra: 1 }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), n5_handoff_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), constraint_profile_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), constraint_profile_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), intake_readiness_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), intake_readiness_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_selection_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_selection_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_option_set_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), research_slice_option_set_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), selected_slice_option_ref: null }), 'N6_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN6Payload({ ...n6(), selected_slice_option_hash: NOT_HASH }), 'N6_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N7 (two modes: initial_from_n6 / feedback_from_n8)
// ---------------------------------------------------------------------------

function n7Base(): Record<string, unknown> {
  return {
    input_mode: 'initial_from_n6',
    n6_handoff_hash: HASH,
    topic_question_candidate_set_ref: ref('candidate-set'),
    topic_question_candidate_set_hash: HASH,
    admissible_candidate_refs: [ref('cand-1'), ref('cand-2')],
    admissible_candidate_hashes: [HASH, HASH2],
    selected_research_slice_ref: ref('slice'),
    selected_research_slice_hash: HASH,
    generation_artifact_ref: ref('gen'),
    generation_artifact_hash: HASH,
    candidate_gate_hash: HASH,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
  };
}

function n7Feedback(): Record<string, unknown> {
  return {
    ...n7Base(),
    input_mode: 'feedback_from_n8',
    n8_feedback_ref: ref('n8-feedback'),
    n8_feedback_hash: HASH,
    n8_feedback_payload_hash: HASH2,
  };
}

test('parseN7Payload: happy path admits initial_from_n6 mode', () => {
  expectOk(parseN7Payload(n7Base()));
});

test('parseN7Payload: happy path admits feedback_from_n8 mode (with N8 refs/hashes)', () => {
  expectOk(parseN7Payload(n7Feedback()));
});

test('parseN7Payload: happy path admits a populated candidate_grouping_ref/hash pair', () => {
  expectOk(parseN7Payload({ ...n7Base(), candidate_grouping_ref: ref('grouping'), candidate_grouping_hash: HASH }));
});

test('parseN7Payload: rejects base-shape breakage with N7_FROZEN_PAYLOAD_INVALID', () => {
  expectErr(parseN7Payload({ ...n7Base(), extra: 1 }), 'N7_FROZEN_PAYLOAD_INVALID'); // hasOnlyKeys
  expectErr(parseN7Payload({ ...n7Base(), input_mode: 'bogus_mode' }), 'N7_FROZEN_PAYLOAD_INVALID'); // bad mode
  expectErr(parseN7Payload({ ...n7Base(), n6_handoff_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), topic_question_candidate_set_ref: null }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), topic_question_candidate_set_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
  // admissible refs: not an array of refs
  expectErr(parseN7Payload({ ...n7Base(), admissible_candidate_refs: ['x'] }), 'N7_FROZEN_PAYLOAD_INVALID');
  // admissible refs: empty (.length === 0)
  expectErr(parseN7Payload({ ...n7Base(), admissible_candidate_refs: [], admissible_candidate_hashes: [] }), 'N7_FROZEN_PAYLOAD_INVALID');
  // admissible hashes: a non-hash string in the array
  expectErr(parseN7Payload({ ...n7Base(), admissible_candidate_hashes: [HASH, NOT_HASH] }), 'N7_FROZEN_PAYLOAD_INVALID');
  // length mismatch between refs and hashes
  expectErr(parseN7Payload({ ...n7Base(), admissible_candidate_hashes: [HASH] }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), selected_research_slice_ref: null }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), selected_research_slice_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), generation_artifact_ref: null }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), generation_artifact_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Base(), candidate_gate_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
  // candidate_grouping_ref present but not a valid ref (nullable, so a bad ref must fail)
  expectErr(parseN7Payload({ ...n7Base(), candidate_grouping_ref: 'bad' }), 'N7_FROZEN_PAYLOAD_INVALID');
  // candidate_grouping_hash present but not a hash
  expectErr(parseN7Payload({ ...n7Base(), candidate_grouping_hash: NOT_HASH }), 'N7_FROZEN_PAYLOAD_INVALID');
});

test('parseN7Payload: feedback mode rejects missing/bad N8 refs with N7_FEEDBACK_PAYLOAD_INVALID', () => {
  // Bad N8 feedback ref (base shape stays valid -> we reach the feedback-mode branch).
  expectErr(parseN7Payload({ ...n7Feedback(), n8_feedback_ref: 'bad' }), 'N7_FEEDBACK_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Feedback(), n8_feedback_hash: NOT_HASH }), 'N7_FEEDBACK_PAYLOAD_INVALID');
  expectErr(parseN7Payload({ ...n7Feedback(), n8_feedback_payload_hash: NOT_HASH }), 'N7_FEEDBACK_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N8
// ---------------------------------------------------------------------------

function n8(): Record<string, unknown> {
  return {
    n7_handoff_hash: HASH,
    topic_question_ref: ref('tq'),
    topic_question_hash: HASH,
    topic_question_contract_ref: ref('contract'),
    topic_question_contract_hash: HASH,
    answerability_plan_ref: ref('plan'),
    answerability_plan_hash: HASH,
    trial_ledger_ref: ref('ledger'),
    trial_ledger_hash: HASH,
    topic_question_candidate_set_ref: ref('set'),
    topic_question_candidate_set_hash: HASH,
    active_candidate_ref: ref('active'),
    active_candidate_hash: HASH,
    selected_research_slice_ref: ref('slice'),
    selected_research_slice_hash: HASH,
    n8_debate_admission_ref: ref('admission'),
    n8_debate_admission_hash: HASH,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
  };
}

test('parseN8Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN8Payload(n8()));
});

test('parseN8Payload: happy path admits a populated candidate_grouping pair', () => {
  expectOk(parseN8Payload({ ...n8(), candidate_grouping_ref: ref('grouping'), candidate_grouping_hash: HASH }));
});

test('parseN8Payload: rejects with N8_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN8Payload({ ...n8(), extra: 1 }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), n7_handoff_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_contract_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_contract_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), answerability_plan_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), answerability_plan_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), trial_ledger_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), trial_ledger_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_candidate_set_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), topic_question_candidate_set_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), active_candidate_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), active_candidate_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), selected_research_slice_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), selected_research_slice_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), n8_debate_admission_ref: null }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), n8_debate_admission_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), candidate_grouping_ref: 'bad' }), 'N8_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN8Payload({ ...n8(), candidate_grouping_hash: NOT_HASH }), 'N8_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N9 (the function the adversarial mutation targeted)
// ---------------------------------------------------------------------------

function n9(): Record<string, unknown> {
  return {
    n8_handoff_hash: HASH,
    topic_value_assessment_ref: ref('assessment'),
    topic_value_assessment_hash: HASH,
    topic_question_contract_ref: ref('contract'),
    topic_question_contract_hash: HASH,
    value_reasoning_memo_ref: ref('memo'),
    value_reasoning_memo_hash: HASH,
    recommended_disposition: 'advance_to_package',
  };
}

test('parseN9Payload: happy path admits each valid recommended_disposition', () => {
  for (const disposition of [
    'advance_to_package',
    'refine_question',
    'refine_slice',
    'recheck_evidence_or_search',
    'park',
    'drop',
  ]) {
    expectOk(parseN9Payload({ ...n9(), recommended_disposition: disposition }));
  }
});

test('parseN9Payload: rejects with N9_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN9Payload({ ...n9(), extra: 1 }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), n8_handoff_hash: NOT_HASH }), 'N9_FROZEN_PAYLOAD_INVALID');
  // The exact mutation the review caught: a malformed assessment hash MUST be rejected.
  expectErr(parseN9Payload({ ...n9(), topic_value_assessment_ref: null }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), topic_value_assessment_hash: NOT_HASH }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), topic_question_contract_ref: null }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), topic_question_contract_hash: NOT_HASH }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), value_reasoning_memo_ref: null }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), value_reasoning_memo_hash: NOT_HASH }), 'N9_FROZEN_PAYLOAD_INVALID');
  // disposition not in the allow-list
  expectErr(parseN9Payload({ ...n9(), recommended_disposition: 'not_a_disposition' }), 'N9_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN9Payload({ ...n9(), recommended_disposition: null }), 'N9_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N10
// ---------------------------------------------------------------------------

function n10(): Record<string, unknown> {
  return {
    n9_handoff_hash: HASH,
    value_disposition_ref: ref('disposition'),
    value_disposition_hash: HASH,
    advance_disposition: true,
    topic_value_assessment_ref: ref('assessment'),
    topic_value_assessment_hash: HASH,
  };
}

test('parseN10Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN10Payload(n10()));
});

test('parseN10Payload: rejects with N10_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN10Payload({ ...n10(), extra: 1 }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), n9_handoff_hash: NOT_HASH }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), value_disposition_ref: null }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), value_disposition_hash: NOT_HASH }), 'N10_FROZEN_PAYLOAD_INVALID');
  // advance_disposition must be the literal `true` (not merely truthy)
  expectErr(parseN10Payload({ ...n10(), advance_disposition: false }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), advance_disposition: 'true' }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), topic_value_assessment_ref: null }), 'N10_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN10Payload({ ...n10(), topic_value_assessment_hash: NOT_HASH }), 'N10_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// N11
// ---------------------------------------------------------------------------

function n11(): Record<string, unknown> {
  return {
    n10_handoff_hash: HASH,
    draft_topic_package_ref: ref('package'),
    draft_topic_package_hash: HASH,
    value_disposition_ref: ref('disposition'),
    value_disposition_hash: HASH,
    v1c_input_bundle_ref: ref('v1c'),
    v1c_input_bundle_hash: HASH,
  };
}

test('parseN11Payload: happy path admits a fully-valid payload', () => {
  expectOk(parseN11Payload(n11()));
});

test('parseN11Payload: rejects with N11_FROZEN_PAYLOAD_INVALID on each broken field', () => {
  expectErr(parseN11Payload({ ...n11(), extra: 1 }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), n10_handoff_hash: NOT_HASH }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), draft_topic_package_ref: null }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), draft_topic_package_hash: NOT_HASH }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), value_disposition_ref: null }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), value_disposition_hash: NOT_HASH }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), v1c_input_bundle_ref: null }), 'N11_FROZEN_PAYLOAD_INVALID');
  expectErr(parseN11Payload({ ...n11(), v1c_input_bundle_hash: NOT_HASH }), 'N11_FROZEN_PAYLOAD_INVALID');
});

// ---------------------------------------------------------------------------
// acceptedConstraintProfilePayloadIsValid validator
// ---------------------------------------------------------------------------

function constraintProfile(): Record<string, unknown> {
  return {
    available_assets: ['gpu-cluster'],
    claim_ceiling: 'empirical',
    constraint_payload: { note: 'x' },
    feasibility_budget: { compute: 'limited' },
    human_constraint_notes: null,
    intended_contribution_style: null,
    method_constraints: ['no human subjects'],
    non_goals: ['theory'],
    resource_constraints: ['single node'],
    target_community: 'ml-systems',
    target_venue_class: null,
  };
}

test('acceptedConstraintProfilePayloadIsValid: valid payload -> true', () => {
  assert.equal(acceptedConstraintProfilePayloadIsValid(constraintProfile()), true);
});

test('acceptedConstraintProfilePayloadIsValid: each broken field -> false', () => {
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), extra: 1 }), false); // hasOnlyKeys
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), target_community: 42 }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), target_venue_class: 7 }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), intended_contribution_style: 7 }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), method_constraints: 'x' }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), resource_constraints: [1] }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), available_assets: [{}] }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), feasibility_budget: [] }), false); // array, not record
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), non_goals: 'x' }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), claim_ceiling: 99 }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), human_constraint_notes: 7 }), false);
  assert.equal(acceptedConstraintProfilePayloadIsValid({ ...constraintProfile(), constraint_payload: 'x' }), false);
});

// ---------------------------------------------------------------------------
// acceptedSliceSelectionPayloadIsValid validator
// ---------------------------------------------------------------------------

function sliceSelectionSelect(): Record<string, unknown> {
  return {
    accepted_risk_refs: [ref('risk')],
    confidence: 0.8,
    decision: 'select',
    decision_basis: { rubric: 'fit' },
    human_review_reason: null,
    loopback_reason_code: null,
    loopback_target: null,
    loopback_target_ref: null,
    rejected_option_reasons: [
      { option_id: 'opt-2', reason: 'weaker fit', reason_code: 'weaker_fit' },
    ],
    required_actions: ['proceed'],
    requires_human_review: false,
    selected_option_hash: HASH,
    selected_option_ref: ref('selected'),
    selection_rationale: 'best balance of risk and value',
  };
}

function sliceSelectionRequestMore(): Record<string, unknown> {
  return {
    ...sliceSelectionSelect(),
    decision: 'request_more_options',
    selected_option_ref: null,
    selected_option_hash: null,
    loopback_target: 'plan_research_slice_run',
    loopback_reason_code: 'need_more_candidates',
  };
}

test('acceptedSliceSelectionPayloadIsValid: valid select payload -> true', () => {
  assert.equal(acceptedSliceSelectionPayloadIsValid(sliceSelectionSelect()), true);
});

test('acceptedSliceSelectionPayloadIsValid: valid request_more_options payload -> true', () => {
  assert.equal(acceptedSliceSelectionPayloadIsValid(sliceSelectionRequestMore()), true);
});

test('acceptedSliceSelectionPayloadIsValid: valid park payload (no option, no loopback required) -> true', () => {
  const park = {
    ...sliceSelectionSelect(),
    decision: 'park',
    selected_option_ref: null,
    selected_option_hash: null,
    loopback_target: null,
    loopback_reason_code: null,
  };
  assert.equal(acceptedSliceSelectionPayloadIsValid(park), true);
});

test('acceptedSliceSelectionPayloadIsValid: base-shape breakage -> false', () => {
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), extra: 1 }), false); // hasOnlyKeys
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), decision: 'bogus' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), selected_option_ref: 'bad' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), selected_option_hash: NOT_HASH }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), selection_rationale: '   ' }), false); // blank
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), selection_rationale: 42 }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), decision_basis: 'x' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), rejected_option_reasons: [{ option_id: '', reason: 'r', reason_code: 'other' }] }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), rejected_option_reasons: [{ option_id: 'o', reason: 'r', reason_code: 'bogus_code' }] }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), required_actions: [1] }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), accepted_risk_refs: ['x'] }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), confidence: 'high' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), requires_human_review: 'no' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), human_review_reason: 7 }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), loopback_target: 'not_a_target' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), loopback_target_ref: 'bad' }), false);
  assert.equal(acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), loopback_reason_code: 7 }), false);
});

test('acceptedSliceSelectionPayloadIsValid: decision-specific invariants -> false', () => {
  // decision=select but selected option ref/hash missing
  assert.equal(
    acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), selected_option_ref: null, selected_option_hash: null }),
    false,
  );
  // decision=select but a loopback target is set (must be null on select)
  assert.equal(
    acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionSelect(), loopback_target: 'plan_research_slice_run' }),
    false,
  );
  // non-select decision but a selected option is still present
  assert.equal(
    acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionRequestMore(), selected_option_ref: ref('x'), selected_option_hash: HASH }),
    false,
  );
  // request_more_options but no loopback target / reason code
  assert.equal(
    acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionRequestMore(), loopback_target: null }),
    false,
  );
  assert.equal(
    acceptedSliceSelectionPayloadIsValid({ ...sliceSelectionRequestMore(), loopback_reason_code: '   ' }),
    false,
  );
});

// ---------------------------------------------------------------------------
// N2 (accepted ConstraintProfile + delegation-artifact sub-branches)
// ---------------------------------------------------------------------------

function n2(): Record<string, unknown> {
  return {
    accepted_constraint_profile_payload: constraintProfile(),
    accepted_constraint_profile_payload_hash: HASH,
    authority_input_provider: 'human_delegated',
    delegation_artifact_hash: null,
    intake_snapshot_hash: HASH,
    intake_snapshot_ref: ref('intake'),
    previous_profile_hash: null,
    previous_profile_ref: null,
    v1a_bundle_hash: HASH,
    v1a_bundle_ref: ref('v1a'),
  };
}

test('parseN2Payload: happy path admits human_delegated (no delegation artifact)', () => {
  expectOk(parseN2Payload(n2()));
});

test('parseN2Payload: happy path admits codex_delegated with a delegation artifact', () => {
  expectOk(parseN2Payload({ ...n2(), authority_input_provider: 'codex_delegated', delegation_artifact_hash: HASH }));
});

test('parseN2Payload: shape/ref breakage -> N2_ACCEPTED_PROFILE_PAYLOAD_INVALID', () => {
  expectErr(parseN2Payload({ ...n2(), extra: 1 }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), intake_snapshot_ref: null }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), intake_snapshot_hash: NOT_HASH }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), v1a_bundle_ref: null }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), v1a_bundle_hash: NOT_HASH }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), authority_input_provider: 'bogus' }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), accepted_constraint_profile_payload: [] }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID'); // not a record
  expectErr(parseN2Payload({ ...n2(), accepted_constraint_profile_payload_hash: NOT_HASH }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), delegation_artifact_hash: NOT_HASH }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID'); // bad nullable hash
  expectErr(parseN2Payload({ ...n2(), previous_profile_ref: 'bad' }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
  expectErr(parseN2Payload({ ...n2(), previous_profile_hash: NOT_HASH }), 'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID');
});

test('parseN2Payload: malformed accepted profile body -> N2_ACCEPTED_PROFILE_PAYLOAD_INVALID', () => {
  // Outer shape is valid; the inner accepted profile fails acceptedConstraintProfilePayloadIsValid.
  expectErr(
    parseN2Payload({ ...n2(), accepted_constraint_profile_payload: { ...constraintProfile(), target_community: 42 } }),
    'N2_ACCEPTED_PROFILE_PAYLOAD_INVALID',
  );
});

test('parseN2Payload: codex_delegated without artifact -> N2_CODEX_DELEGATION_ARTIFACT_REQUIRED', () => {
  expectErr(
    parseN2Payload({ ...n2(), authority_input_provider: 'codex_delegated', delegation_artifact_hash: null }),
    'N2_CODEX_DELEGATION_ARTIFACT_REQUIRED',
  );
});

test('parseN2Payload: non-codex provider carrying an artifact -> N2_DELEGATION_ARTIFACT_NOT_ALLOWED', () => {
  expectErr(
    parseN2Payload({ ...n2(), authority_input_provider: 'human_delegated', delegation_artifact_hash: HASH }),
    'N2_DELEGATION_ARTIFACT_NOT_ALLOWED',
  );
  expectErr(
    parseN2Payload({ ...n2(), authority_input_provider: 'fixture', delegation_artifact_hash: HASH }),
    'N2_DELEGATION_ARTIFACT_NOT_ALLOWED',
  );
});

// ---------------------------------------------------------------------------
// N5 (accepted SliceSelection + delegation-artifact sub-branches)
// ---------------------------------------------------------------------------

function n5(): Record<string, unknown> {
  return {
    accepted_selection_payload: sliceSelectionSelect(),
    accepted_selection_payload_hash: HASH,
    authority_input_provider: 'human_delegated',
    delegation_artifact_hash: null,
    n4_handoff_hash: HASH,
    research_slice_option_set_hash: HASH,
    research_slice_option_set_ref: ref('option-set'),
  };
}

test('parseN5Payload: happy path admits human_delegated (no delegation artifact)', () => {
  expectOk(parseN5Payload(n5()));
});

test('parseN5Payload: happy path admits codex_delegated with a delegation artifact', () => {
  expectOk(parseN5Payload({ ...n5(), authority_input_provider: 'codex_delegated', delegation_artifact_hash: HASH }));
});

test('parseN5Payload: shape/ref breakage -> N5_ACCEPTED_SELECTION_PAYLOAD_INVALID', () => {
  expectErr(parseN5Payload({ ...n5(), extra: 1 }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), research_slice_option_set_ref: null }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), research_slice_option_set_hash: NOT_HASH }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), n4_handoff_hash: NOT_HASH }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), authority_input_provider: 'bogus' }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), accepted_selection_payload: [] }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID'); // not a record
  expectErr(parseN5Payload({ ...n5(), accepted_selection_payload_hash: NOT_HASH }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID');
  expectErr(parseN5Payload({ ...n5(), delegation_artifact_hash: NOT_HASH }), 'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID'); // bad nullable hash
});

test('parseN5Payload: malformed accepted selection body -> N5_ACCEPTED_SELECTION_PAYLOAD_INVALID', () => {
  // Outer shape valid; inner selection fails acceptedSliceSelectionPayloadIsValid (select w/o option).
  expectErr(
    parseN5Payload({
      ...n5(),
      accepted_selection_payload: { ...sliceSelectionSelect(), selected_option_ref: null, selected_option_hash: null },
    }),
    'N5_ACCEPTED_SELECTION_PAYLOAD_INVALID',
  );
});

test('parseN5Payload: codex_delegated without artifact -> N5_CODEX_DELEGATION_ARTIFACT_REQUIRED', () => {
  expectErr(
    parseN5Payload({ ...n5(), authority_input_provider: 'codex_delegated', delegation_artifact_hash: null }),
    'N5_CODEX_DELEGATION_ARTIFACT_REQUIRED',
  );
});

test('parseN5Payload: non-codex provider carrying an artifact -> N5_DELEGATION_ARTIFACT_NOT_ALLOWED', () => {
  expectErr(
    parseN5Payload({ ...n5(), authority_input_provider: 'human_delegated', delegation_artifact_hash: HASH }),
    'N5_DELEGATION_ARTIFACT_NOT_ALLOWED',
  );
  expectErr(
    parseN5Payload({ ...n5(), authority_input_provider: 'fixture', delegation_artifact_hash: HASH }),
    'N5_DELEGATION_ARTIFACT_NOT_ALLOWED',
  );
});
