/**
 * W-12 / T-127 regression net for the v1b harness predicate cluster.
 *
 * Adversarial review found that the {ok:false}/false (REJECTION) branches of these
 * relocated pure guards had NO coverage — a mutation dropping an `isHash` check (so a
 * malformed payload ADMITS) stayed green. This co-located unit test exercises BOTH
 * branches of every exported guard, with the negatives heavily emphasized: missing
 * fields, wrong types, wrong enum members, and extra keys (hasOnlyKeys) are each
 * asserted to be REJECTED so a future divergence fails loudly.
 *
 * These are pure `value is T` guards — no deps to stub, no DB/network/LLM. Assertions
 * check the EXACT boolean each guard returns.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isClaimCeilingAlignment,
  isFunctionalRefArray,
  isFunctionalRefValue,
  isN6ToN7HandoffArtifactPayload,
  isN7CandidateGroupingSupportPayload,
  isN7DebateAdmissionSupportPayload,
  isN7FailedTrialSynthesisSupportPayload,
  isN8ToN7FeedbackPayload,
  isNullableFunctionalRefValue,
  isNullableHash,
  isNullableSliceLoopbackTarget,
  isNullableString,
  isRejectedOptionReasonArray,
  isRiskLevel,
  isSliceLoopbackTarget,
  isSliceSelectionDecision,
  isStringArray,
} from './topic-selection-v1b-harness-predicates.js';

// ---------------------------------------------------------------------------
// Helper factories
// ---------------------------------------------------------------------------

/** A syntactically-valid 64-hex sha256 hash (matches HASH_PATTERN /^[a-f0-9]{64}$/). */
const HASH = 'a'.repeat(64);

/** A valid TopicSelectionFunctionalRef (all required + optional nullable fields present). */
function validRef(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ref_type: 'topic_question_candidate',
    ref_id: 'tqc_1',
    version_id: null,
    title_card_id: null,
    ...overrides,
  };
}

/** A valid N8->N7 feedback payload (every required field correct). */
function validN8ToN7Feedback(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    affected_refs: [validRef()],
    failed_candidate_hash: HASH,
    failed_candidate_ref: validRef(),
    failed_topic_question_contract_hash: HASH,
    failed_topic_question_contract_ref: validRef(),
    failure_reason_code: 'duplicate_candidate',
    feedback_class: 'gate_rejected',
    feedback_summary: 'Candidate failed the admission gate.',
    n8_gate_result_hash: HASH,
    previous_n7_handoff_hash: HASH,
    previous_n7_handoff_ref: validRef(),
    previous_trial_ledger_hash: HASH,
    previous_trial_ledger_ref: validRef(),
    topic_question_candidate_set_hash: HASH,
    topic_question_candidate_set_ref: validRef(),
    value_assessment_hash: null,
    value_assessment_ref: null,
    ...overrides,
  };
}

/** A valid N7 candidate-grouping support payload. */
function validGroupingPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    candidate_relationships: {},
    duplicate_or_overlap_groups: [
      {
        group_key: 'g1',
        candidate_refs: [validRef()],
        canonical_candidate_ref: validRef(),
        rationale: 'overlapping scope',
      },
    ],
    grouping_summary: 'Two candidates overlap.',
    priority_order: [validRef()],
    selected_candidate_hash: HASH,
    selected_candidate_ref: validRef(),
    ...overrides,
  };
}

/** A valid N7 debate-admission support payload. */
function validDebatePayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    debate_level: 'compact_assessment_debate',
    high_value_signal_codes: ['hv1'],
    rationale: 'enough signal for a compact debate',
    recommended_profile_id: 'profile_a',
    risk_signal_codes: ['risk1'],
    ...overrides,
  };
}

/** A valid N7 failed-trial-synthesis support payload. */
function validFailedTrialPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    affected_refs: [validRef()],
    exhausted_candidate_refs: [validRef()],
    failure_reason_codes: ['no_viable_candidate'],
    n6_regeneration_hints: ['broaden scope'],
    synthesis_summary: 'All trials exhausted.',
    ...overrides,
  };
}

// ===========================================================================
// Simple boolean type guards
// ===========================================================================

test('isNullableHash: TRUE for undefined / null / valid hash; FALSE otherwise', () => {
  assert.equal(isNullableHash(undefined), true);
  assert.equal(isNullableHash(null), true);
  assert.equal(isNullableHash(HASH), true);
  // negatives
  assert.equal(isNullableHash('not-a-hash'), false);
  assert.equal(isNullableHash('A'.repeat(64)), false, 'uppercase hex must be rejected');
  assert.equal(isNullableHash('a'.repeat(63)), false, 'too-short hex must be rejected');
  assert.equal(isNullableHash(123), false);
});

test('isStringArray: TRUE for empty + all-string arrays; FALSE for non-array / non-string element', () => {
  assert.equal(isStringArray([]), true);
  assert.equal(isStringArray(['a', 'b']), true);
  // negatives
  assert.equal(isStringArray('a'), false, 'a bare string is not a string array');
  assert.equal(isStringArray(['a', 1]), false, 'a non-string element must be rejected');
  assert.equal(isStringArray([null]), false);
  assert.equal(isStringArray(null), false);
});

test('isNullableString: TRUE for undefined / null / string; FALSE for other types', () => {
  assert.equal(isNullableString(undefined), true);
  assert.equal(isNullableString(null), true);
  assert.equal(isNullableString(''), true);
  assert.equal(isNullableString('x'), true);
  // negatives
  assert.equal(isNullableString(0), false);
  assert.equal(isNullableString([]), false);
  assert.equal(isNullableString({}), false);
});

test('isRiskLevel: TRUE for the 4 enum members; FALSE for anything else', () => {
  for (const level of ['low', 'medium', 'high', 'unknown']) {
    assert.equal(isRiskLevel(level), true, `${level} is a valid risk level`);
  }
  // negatives
  assert.equal(isRiskLevel('critical'), false, 'wrong enum member must be rejected');
  assert.equal(isRiskLevel('Low'), false, 'case-sensitive enum');
  assert.equal(isRiskLevel(undefined), false);
  assert.equal(isRiskLevel(null), false);
});

test('isSliceSelectionDecision: TRUE for the 4 decisions; FALSE otherwise', () => {
  for (const d of ['select', 'request_more_options', 'park', 'reject']) {
    assert.equal(isSliceSelectionDecision(d), true, `${d} is valid`);
  }
  // negatives
  assert.equal(isSliceSelectionDecision('accept'), false, 'wrong enum member');
  assert.equal(isSliceSelectionDecision(''), false);
  assert.equal(isSliceSelectionDecision(null), false);
});

test('isSliceLoopbackTarget: TRUE for the 5 targets; FALSE otherwise', () => {
  for (const t of [
    'plan_research_slice_run',
    'research_constraint_profile',
    'validated_need',
    'evidence_map',
    'search_plan',
  ]) {
    assert.equal(isSliceLoopbackTarget(t), true, `${t} is valid`);
  }
  // negatives
  assert.equal(isSliceLoopbackTarget('search_plans'), false, 'near-miss enum member');
  assert.equal(isSliceLoopbackTarget(null), false, 'null is NOT a bare loopback target');
  assert.equal(isSliceLoopbackTarget(undefined), false);
});

test('isNullableSliceLoopbackTarget: TRUE for null + valid targets; FALSE for undefined / bad strings', () => {
  assert.equal(isNullableSliceLoopbackTarget(null), true);
  assert.equal(isNullableSliceLoopbackTarget('evidence_map'), true);
  // negatives — note: the guard accepts null but NOT undefined
  assert.equal(isNullableSliceLoopbackTarget(undefined), false, 'undefined is rejected (only null allowed)');
  assert.equal(isNullableSliceLoopbackTarget('nope'), false);
});

// ===========================================================================
// Functional-ref guards (complex — multiple false cases)
// ===========================================================================

test('isFunctionalRefValue: TRUE for a well-formed ref', () => {
  assert.equal(isFunctionalRefValue(validRef()), true);
  assert.equal(isFunctionalRefValue(validRef({ version_id: 'v1', title_card_id: 'tc_1' })), true);
  assert.equal(isFunctionalRefValue(validRef({ version_id: undefined, title_card_id: undefined })), true);
});

test('isFunctionalRefValue: FALSE — break a different required field/type per case', () => {
  assert.equal(isFunctionalRefValue(null), false, 'null is not a record');
  assert.equal(isFunctionalRefValue([]), false, 'array is not a record');
  assert.equal(isFunctionalRefValue(validRef({ ref_type: undefined })), false, 'missing ref_type');
  assert.equal(isFunctionalRefValue(validRef({ ref_type: '' })), false, 'empty ref_type');
  assert.equal(isFunctionalRefValue(validRef({ ref_type: '   ' })), false, 'whitespace-only ref_type');
  assert.equal(isFunctionalRefValue(validRef({ ref_type: 7 })), false, 'non-string ref_type');
  assert.equal(isFunctionalRefValue(validRef({ ref_id: undefined })), false, 'missing ref_id');
  assert.equal(isFunctionalRefValue(validRef({ ref_id: '' })), false, 'empty ref_id');
  assert.equal(isFunctionalRefValue(validRef({ ref_id: 9 })), false, 'non-string ref_id');
  assert.equal(isFunctionalRefValue(validRef({ version_id: 5 })), false, 'non-string/non-null version_id');
  assert.equal(isFunctionalRefValue(validRef({ title_card_id: 5 })), false, 'non-string/non-null title_card_id');
});

test('isFunctionalRefArray: TRUE for empty + all-valid; FALSE if any element is invalid', () => {
  assert.equal(isFunctionalRefArray([]), true);
  assert.equal(isFunctionalRefArray([validRef(), validRef()]), true);
  // negatives
  assert.equal(isFunctionalRefArray(validRef()), false, 'a single ref object is not an array');
  assert.equal(isFunctionalRefArray([validRef(), { ref_type: 'x' }]), false, 'one invalid element rejects whole array');
  assert.equal(isFunctionalRefArray([null]), false);
});

test('isNullableFunctionalRefValue: TRUE for undefined / null / valid ref; FALSE for malformed ref', () => {
  assert.equal(isNullableFunctionalRefValue(undefined), true);
  assert.equal(isNullableFunctionalRefValue(null), true);
  assert.equal(isNullableFunctionalRefValue(validRef()), true);
  // negatives
  assert.equal(isNullableFunctionalRefValue({ ref_type: 'x' }), false, 'malformed ref (missing ref_id) rejected');
  assert.equal(isNullableFunctionalRefValue(validRef({ ref_id: '' })), false);
});

// ===========================================================================
// isRejectedOptionReasonArray (complex — multiple false cases)
// ===========================================================================

test('isRejectedOptionReasonArray: TRUE for empty + valid entries across all reason_codes', () => {
  assert.equal(isRejectedOptionReasonArray([]), true, 'empty array is vacuously valid');
  for (const code of [
    'hard_blocker',
    'weaker_fit',
    'higher_risk',
    'duplicate',
    'out_of_scope',
    'insufficient_evidence',
    'resource_blocked',
    'baseline_blocked',
    'other',
  ]) {
    assert.equal(
      isRejectedOptionReasonArray([{ option_id: 'opt_1', reason: 'because', reason_code: code }]),
      true,
      `${code} is a valid reason_code`,
    );
  }
});

test('isRejectedOptionReasonArray: FALSE — break a different required field/type per case', () => {
  assert.equal(isRejectedOptionReasonArray({}), false, 'non-array rejected');
  assert.equal(isRejectedOptionReasonArray([null]), false, 'non-record element rejected');
  assert.equal(
    isRejectedOptionReasonArray([{ reason: 'r', reason_code: 'other' }]),
    false,
    'missing option_id',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: '', reason: 'r', reason_code: 'other' }]),
    false,
    'empty option_id',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: '   ', reason: 'r', reason_code: 'other' }]),
    false,
    'whitespace-only option_id',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: 'o', reason_code: 'other' }]),
    false,
    'missing reason',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: 'o', reason: '   ', reason_code: 'other' }]),
    false,
    'whitespace-only reason',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: 'o', reason: 'r', reason_code: 'not_a_code' }]),
    false,
    'wrong reason_code enum member',
  );
  assert.equal(
    isRejectedOptionReasonArray([{ option_id: 'o', reason: 'r' }]),
    false,
    'missing reason_code',
  );
  assert.equal(
    isRejectedOptionReasonArray([
      { option_id: 'o', reason: 'r', reason_code: 'other' },
      { option_id: 'o2', reason: 'r2', reason_code: 'bad' },
    ]),
    false,
    'one invalid element rejects whole array',
  );
});

// ===========================================================================
// isClaimCeilingAlignment (complex — multiple false cases, extra-key check)
// ===========================================================================

test('isClaimCeilingAlignment: TRUE across statuses + nullable confidence', () => {
  for (const status of ['aligned', 'uncertain', 'exceeds']) {
    assert.equal(
      isClaimCeilingAlignment({ status, rationale: 'r', confidence: 0.5 }),
      true,
      `${status} with numeric confidence`,
    );
  }
  assert.equal(isClaimCeilingAlignment({ status: 'aligned', rationale: 'r', confidence: null }), true);
  assert.equal(isClaimCeilingAlignment({ status: 'aligned', rationale: 'r', confidence: undefined }), true);
  assert.equal(isClaimCeilingAlignment({ status: 'aligned', rationale: 'r' }), true, 'confidence omitted is allowed');
});

test('isClaimCeilingAlignment: FALSE — break a different required field/type per case', () => {
  assert.equal(isClaimCeilingAlignment(null), false, 'null is not a record');
  assert.equal(isClaimCeilingAlignment([]), false, 'array is not a record');
  assert.equal(
    isClaimCeilingAlignment({ status: 'aligned', rationale: 'r', confidence: 0.5, extra: 1 }),
    false,
    'EXTRA key must be rejected (hasOnlyKeys)',
  );
  assert.equal(
    isClaimCeilingAlignment({ status: 'bogus', rationale: 'r', confidence: 0.5 }),
    false,
    'wrong status enum member',
  );
  assert.equal(
    isClaimCeilingAlignment({ rationale: 'r', confidence: 0.5 }),
    false,
    'missing status',
  );
  assert.equal(
    isClaimCeilingAlignment({ status: 'aligned', confidence: 0.5 }),
    false,
    'missing rationale',
  );
  assert.equal(
    isClaimCeilingAlignment({ status: 'aligned', rationale: '   ', confidence: 0.5 }),
    false,
    'whitespace-only rationale',
  );
  assert.equal(
    isClaimCeilingAlignment({ status: 'aligned', rationale: 5, confidence: 0.5 }),
    false,
    'non-string rationale',
  );
  assert.equal(
    isClaimCeilingAlignment({ status: 'aligned', rationale: 'r', confidence: 'high' }),
    false,
    'non-number/non-null confidence',
  );
});

// ===========================================================================
// N7 support-payload guards (PRIORITIZED — multiple false cases each)
// ===========================================================================

test('isN6ToN7HandoffArtifactPayload: TRUE for well-formed envelope+payload', () => {
  assert.equal(
    isN6ToN7HandoffArtifactPayload({
      envelope: { handoff_kind: 'N6ToN7Handoff' },
      payload: {},
    }),
    true,
  );
});

test('isN6ToN7HandoffArtifactPayload: FALSE — break a different field per case', () => {
  assert.equal(isN6ToN7HandoffArtifactPayload(null), false, 'null is not a record');
  assert.equal(
    isN6ToN7HandoffArtifactPayload({ payload: {} }),
    false,
    'missing envelope',
  );
  assert.equal(
    isN6ToN7HandoffArtifactPayload({ envelope: null, payload: {} }),
    false,
    'envelope is not a record',
  );
  assert.equal(
    isN6ToN7HandoffArtifactPayload({ envelope: { handoff_kind: 'N5ToN6Handoff' }, payload: {} }),
    false,
    'wrong handoff_kind',
  );
  assert.equal(
    isN6ToN7HandoffArtifactPayload({ envelope: { handoff_kind: 'N6ToN7Handoff' } }),
    false,
    'missing payload',
  );
  assert.equal(
    isN6ToN7HandoffArtifactPayload({ envelope: { handoff_kind: 'N6ToN7Handoff' }, payload: 'x' }),
    false,
    'payload is not a record',
  );
});

test('isN8ToN7FeedbackPayload: TRUE for a fully-valid payload', () => {
  assert.equal(isN8ToN7FeedbackPayload(validN8ToN7Feedback()), true);
  for (const fc of ['semantic_candidate_failure', 'gate_rejected', 'technical_failure']) {
    assert.equal(
      isN8ToN7FeedbackPayload(validN8ToN7Feedback({ feedback_class: fc })),
      true,
      `feedback_class ${fc} is valid`,
    );
  }
  // value_assessment_* may be a real ref+hash too
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ value_assessment_ref: validRef(), value_assessment_hash: HASH })),
    true,
  );
});

test('isN8ToN7FeedbackPayload: FALSE — break a different field/hash/ref per case', () => {
  assert.equal(isN8ToN7FeedbackPayload(null), false, 'null is not a record');
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ extra_field: 1 })),
    false,
    'EXTRA key must be rejected (hasOnlyKeys)',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ feedback_class: 'unknown_class' })),
    false,
    'wrong feedback_class enum member',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ failure_reason_code: '' })),
    false,
    'empty failure_reason_code',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ feedback_summary: '   ' })),
    false,
    'whitespace-only feedback_summary',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ affected_refs: [] })),
    false,
    'affected_refs must be non-empty',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ affected_refs: [{ ref_type: 'x' }] })),
    false,
    'affected_refs element malformed',
  );
  // This is the exact mutation class the review flagged: dropping an isHash check
  // would let a malformed hash ADMIT. Assert each hash field is enforced.
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ previous_n7_handoff_hash: 'not-a-hash' })),
    false,
    'previous_n7_handoff_hash must be a valid 64-hex hash',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ n8_gate_result_hash: HASH.slice(0, 63) })),
    false,
    'n8_gate_result_hash too short must be rejected',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ failed_candidate_hash: 'A'.repeat(64) })),
    false,
    'uppercase hex rejected for failed_candidate_hash',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ previous_n7_handoff_ref: { ref_type: 'x' } })),
    false,
    'previous_n7_handoff_ref must be a valid functional ref',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ value_assessment_hash: 'bad' })),
    false,
    'value_assessment_hash, if present, must be a valid hash (nullable)',
  );
  assert.equal(
    isN8ToN7FeedbackPayload(validN8ToN7Feedback({ value_assessment_ref: { ref_type: 'x' } })),
    false,
    'value_assessment_ref, if present, must be a valid ref (nullable)',
  );
});

test('isN7CandidateGroupingSupportPayload: TRUE for a fully-valid payload', () => {
  assert.equal(isN7CandidateGroupingSupportPayload(validGroupingPayload()), true);
  // empty groups array is allowed (every() is vacuously true), other fields still required
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ duplicate_or_overlap_groups: [] })),
    true,
  );
});

test('isN7CandidateGroupingSupportPayload: FALSE — break a different field per case', () => {
  assert.equal(isN7CandidateGroupingSupportPayload(null), false, 'null is not a record');
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ extra: 1 })),
    false,
    'EXTRA key must be rejected (hasOnlyKeys)',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ selected_candidate_ref: { ref_type: 'x' } })),
    false,
    'selected_candidate_ref malformed',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ selected_candidate_hash: 'nope' })),
    false,
    'selected_candidate_hash must be a valid hash',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ priority_order: [] })),
    false,
    'priority_order must be non-empty',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ duplicate_or_overlap_groups: 'x' })),
    false,
    'duplicate_or_overlap_groups must be an array',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(
      validGroupingPayload({
        duplicate_or_overlap_groups: [
          { group_key: 'g', candidate_refs: [validRef()], canonical_candidate_ref: validRef(), rationale: 'r', extra: 1 },
        ],
      }),
    ),
    false,
    'group EXTRA key must be rejected (hasOnlyKeys on group)',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(
      validGroupingPayload({
        duplicate_or_overlap_groups: [
          { group_key: 7, candidate_refs: [validRef()], canonical_candidate_ref: validRef(), rationale: 'r' },
        ],
      }),
    ),
    false,
    'group_key must be a string',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(
      validGroupingPayload({
        duplicate_or_overlap_groups: [
          { group_key: 'g', candidate_refs: [{ ref_type: 'x' }], canonical_candidate_ref: validRef(), rationale: 'r' },
        ],
      }),
    ),
    false,
    'group candidate_refs element malformed',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(
      validGroupingPayload({
        duplicate_or_overlap_groups: [
          { group_key: 'g', candidate_refs: [validRef()], canonical_candidate_ref: { ref_type: 'x' }, rationale: 'r' },
        ],
      }),
    ),
    false,
    'group canonical_candidate_ref malformed',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ candidate_relationships: 'x' })),
    false,
    'candidate_relationships must be a record',
  );
  assert.equal(
    isN7CandidateGroupingSupportPayload(validGroupingPayload({ grouping_summary: 5 })),
    false,
    'grouping_summary must be a string',
  );
});

test('isN7DebateAdmissionSupportPayload: TRUE for a fully-valid payload', () => {
  assert.equal(isN7DebateAdmissionSupportPayload(validDebatePayload()), true);
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ debate_level: 'provider_diverse_deep_debate' })),
    true,
  );
  // empty signal-code arrays are allowed
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ high_value_signal_codes: [], risk_signal_codes: [] })),
    true,
  );
});

test('isN7DebateAdmissionSupportPayload: FALSE — break a different field per case', () => {
  assert.equal(isN7DebateAdmissionSupportPayload(null), false, 'null is not a record');
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ extra: 1 })),
    false,
    'EXTRA key must be rejected (hasOnlyKeys)',
  );
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ debate_level: 'shallow_debate' })),
    false,
    'wrong debate_level enum member',
  );
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ recommended_profile_id: 5 })),
    false,
    'recommended_profile_id must be a string',
  );
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ high_value_signal_codes: [1] })),
    false,
    'high_value_signal_codes must be a string array',
  );
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ risk_signal_codes: 'x' })),
    false,
    'risk_signal_codes must be a string array',
  );
  assert.equal(
    isN7DebateAdmissionSupportPayload(validDebatePayload({ rationale: 5 })),
    false,
    'rationale must be a string',
  );
});

test('isN7FailedTrialSynthesisSupportPayload: TRUE for a fully-valid payload', () => {
  assert.equal(isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload()), true);
  // empty string-code/hint arrays are allowed; ref arrays are not
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(
      validFailedTrialPayload({ failure_reason_codes: [], n6_regeneration_hints: [] }),
    ),
    true,
  );
});

test('isN7FailedTrialSynthesisSupportPayload: FALSE — break a different field per case', () => {
  assert.equal(isN7FailedTrialSynthesisSupportPayload(null), false, 'null is not a record');
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ extra: 1 })),
    false,
    'EXTRA key must be rejected (hasOnlyKeys)',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ exhausted_candidate_refs: [] })),
    false,
    'exhausted_candidate_refs must be non-empty',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ exhausted_candidate_refs: [{ ref_type: 'x' }] })),
    false,
    'exhausted_candidate_refs element malformed',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ failure_reason_codes: [1] })),
    false,
    'failure_reason_codes must be a string array',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ synthesis_summary: 5 })),
    false,
    'synthesis_summary must be a string',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ n6_regeneration_hints: 'x' })),
    false,
    'n6_regeneration_hints must be a string array',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ affected_refs: [] })),
    false,
    'affected_refs must be non-empty',
  );
  assert.equal(
    isN7FailedTrialSynthesisSupportPayload(validFailedTrialPayload({ affected_refs: [{ ref_type: 'x' }] })),
    false,
    'affected_refs element malformed',
  );
});
