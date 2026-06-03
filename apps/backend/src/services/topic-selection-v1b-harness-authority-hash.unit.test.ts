import test from 'node:test';
import assert from 'node:assert/strict';
import type { TopicSelectionResearchSliceOptionRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import {
  canonicalHash,
  hashResearchSliceOptionAuthority,
  hashV1bFrozenInput,
  researchSliceOptionRef,
} from './topic-selection-v1b-harness-authority-hash.js';

function makeOption(
  overrides: Partial<TopicSelectionResearchSliceOptionRecord> = {},
): TopicSelectionResearchSliceOptionRecord {
  return {
    research_slice_option_id: 'rso_1',
    workspace_id: null,
    title_card_id: 'tc_1',
    research_slice_option_set_id: 'rsos_1',
    option_ordinal: 0,
    option_key: 'opt_a',
    status: 'recommended',
    source_validated_need_refs: [],
    slice_statement: 'A traceable workflow slice.',
    problem_space: 'workflow gaps',
    target_setting: 'offline batch',
    target_community: 'SE researchers',
    included_boundaries: ['in-1'],
    excluded_boundaries: ['out-1'],
    contribution_type_candidate: 'method',
    support_evidence_refs: [],
    challenge_evidence_refs: [],
    baseline_evidence_refs: [],
    context_evidence_refs: [],
    resource_assumptions: [],
    data_assumptions: [],
    evaluation_path: 'offline eval on benchmark X',
    baseline_assumptions: [],
    hard_blockers: [],
    dependency_risks: ['dep-1'],
    slice_budget: {},
    expected_claim: 'improves recall',
    fallback_claim: 'matches baseline',
    observable_success_criteria: [],
    main_risks: ['risk-1'],
    baseline_risk: 'low',
    execution_risk: 'medium',
    scope_risk: 'low',
    claim_ceiling_alignment: { status: 'aligned', rationale: 'within claim ceiling', confidence: 0.7 },
    confidence: 0.8,
    requires_human_review: false,
    human_review_triggers: [],
    details_payload: {},
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Golden recorded from the canonical authority shape (see module). Locks the
// module's hashed field set against accidental drift from the harness service's
// private `hashResearchSliceOptionAuthority`. The authoritative harness-identity
// proof is the Phase 1c integration test (an admitted N5 means every hash the
// caller supplied matched the harness re-derivation).
const OPTION_AUTHORITY_GOLDEN = 'b7f43aa312392b1f06f160cc01a4b811c4f756fcf7c3e95d3573f8779509f13e';

test('canonicalHash is deterministic and key-order independent', () => {
  assert.equal(canonicalHash({ a: 1, b: 2 }), canonicalHash({ b: 2, a: 1 }));
  assert.match(canonicalHash({ a: 1 }), /^[0-9a-f]{64}$/);
});

test('hashResearchSliceOptionAuthority is deterministic + matches golden', () => {
  const h1 = hashResearchSliceOptionAuthority(makeOption());
  const h2 = hashResearchSliceOptionAuthority(makeOption());
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.equal(h1, OPTION_AUTHORITY_GOLDEN);
});

test('hashResearchSliceOptionAuthority changes when a hashed authority field changes', () => {
  const base = hashResearchSliceOptionAuthority(makeOption());
  assert.notEqual(base, hashResearchSliceOptionAuthority(makeOption({ slice_statement: 'different' })));
  assert.notEqual(base, hashResearchSliceOptionAuthority(makeOption({ expected_claim: 'different' })));
  assert.notEqual(base, hashResearchSliceOptionAuthority(makeOption({ scope_risk: 'high' })));
  assert.notEqual(base, hashResearchSliceOptionAuthority(makeOption({ research_slice_option_id: 'rso_2' })));
  assert.notEqual(base, hashResearchSliceOptionAuthority(makeOption({ hard_blockers: ['b'] })));
});

test('hashResearchSliceOptionAuthority ignores non-authority fields', () => {
  const base = hashResearchSliceOptionAuthority(makeOption());
  assert.equal(base, hashResearchSliceOptionAuthority(makeOption({ option_ordinal: 9 })));
  assert.equal(base, hashResearchSliceOptionAuthority(makeOption({ confidence: 0.1 })));
  assert.equal(base, hashResearchSliceOptionAuthority(makeOption({ created_at: '2030-12-31T00:00:00.000Z' })));
  assert.equal(base, hashResearchSliceOptionAuthority(makeOption({ requires_human_review: true })));
  assert.equal(base, hashResearchSliceOptionAuthority(makeOption({ details_payload: { x: 1 } })));
});

test('researchSliceOptionRef matches the harness ref shape', () => {
  assert.deepEqual(researchSliceOptionRef(makeOption()), {
    ref_type: 'research_slice_option',
    ref_id: 'rso_1',
    version_id: null,
    title_card_id: 'tc_1',
  });
});

test('hashV1bFrozenInput is deterministic and ignores fields outside the envelope', () => {
  const envelope = {
    input_contract: 'N4ToN5Handoff@v1',
    snapshot_kind: 'research_slice_option_set',
    source_refs: [
      { ref_type: 'research_slice_option_set', ref_id: 'rsos_1', version_id: null, title_card_id: 'tc_1' },
    ],
    payload: { a: 1 },
  };
  const h1 = hashV1bFrozenInput(envelope);
  const h2 = hashV1bFrozenInput({ ...envelope, frozen_input_hash: 'zzz' } as typeof envelope & {
    frozen_input_hash: string;
  });
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
});
