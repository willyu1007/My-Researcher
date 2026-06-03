import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  TopicSelectionResearchSliceOptionRecord,
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessRunRequest,
  TopicSelectionV1bWorkflowHarnessRunResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  canonicalHash,
  hashResearchSliceOptionAuthority,
  hashV1bFrozenInput,
  researchSliceOptionRef,
} from './topic-selection-v1b-harness-authority-hash.js';
import {
  V1bSliceHumanSelectionService,
  type V1bResearchSliceReadPort,
} from './topic-selection-v1b-slice-human-selection-service.js';

const OPTION_SET_ID = 'rsos_1';
const TITLE_CARD_ID = 'tc_1';
const AUTHORITY_HASH = 'a'.repeat(64);
const N4_HANDOFF_HASH = 'b'.repeat(64);

function makeOption(
  overrides: Partial<TopicSelectionResearchSliceOptionRecord> = {},
): TopicSelectionResearchSliceOptionRecord {
  return {
    research_slice_option_id: 'rso_1',
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    research_slice_option_set_id: OPTION_SET_ID,
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

function makeOptionSet(
  overrides: Partial<TopicSelectionResearchSliceOptionSetRecord> = {},
): TopicSelectionResearchSliceOptionSetRecord {
  return {
    research_slice_option_set_id: OPTION_SET_ID,
    workspace_id: null,
    title_card_id: TITLE_CARD_ID,
    plan_research_slice_run_id: 'plan_run_1',
    v1b_intake_readiness_assessment_id: 'ira_1',
    v1b_intake_snapshot_id: 'snap_1',
    research_constraint_profile_id: 'rcp_1',
    v1b_input_bundle_id: 'bundle_1',
    validated_need_ids: ['ln_1'],
    status: 'ready_for_selection',
    recommended_option_id: 'rso_1',
    selected_option_id: null,
    option_count: 2,
    high_risk_option_count: 0,
    requires_human_review: false,
    comparison_axes: ['scope', 'risk'],
    comparison_summary: 'Two viable slices.',
    missing_option_types: [],
    unresolved_disagreements: [],
    human_review_triggers: [],
    options_payload: {},
    comparison_payload: {
      authority_hash: AUTHORITY_HASH,
      n4_handoff_hash: N4_HANDOFF_HASH,
      constraint_profile_hash: 'c'.repeat(64),
      intake_readiness_hash: 'd'.repeat(64),
      n3_handoff_hash: 'e'.repeat(64),
    },
    input_snapshot_id: null,
    workflow_run_id: null,
    artifact_refs: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Read-port returning seeded records. */
function makeReadPort(
  optionSet: TopicSelectionResearchSliceOptionSetRecord | null,
  options: TopicSelectionResearchSliceOptionRecord[],
): V1bResearchSliceReadPort {
  return {
    findOptionSetById: async (id) =>
      optionSet && optionSet.research_slice_option_set_id === id ? optionSet : null,
    listOptionsByOptionSetId: async (id) =>
      options.filter((option) => option.research_slice_option_set_id === id),
  };
}

const HARNESS_RESULT_STUB = {
  gate_status: 'admitted',
  authority_ref: { ref_type: 'research_slice', ref_id: 'research_slice_1', version_id: 'v1', title_card_id: TITLE_CARD_ID },
} as unknown as TopicSelectionV1bWorkflowHarnessRunResult;

/** Captures the run-request the wrapper builds and returns a stub admitted result. */
function makeCapturingHarness(): {
  invokeNode: (input: TopicSelectionV1bWorkflowHarnessRunRequest) => Promise<TopicSelectionV1bWorkflowHarnessRunResult>;
  last: () => TopicSelectionV1bWorkflowHarnessRunRequest;
} {
  let captured: TopicSelectionV1bWorkflowHarnessRunRequest | null = null;
  return {
    invokeNode: async (input) => {
      captured = input;
      return HARNESS_RESULT_STUB;
    },
    last: () => {
      if (!captured) {
        throw new Error('invokeNode was not called.');
      }
      return captured;
    },
  };
}

const ACTOR = { actor_type: 'human' as const, actor_id: 'reviewer-1' };

test('selectSlice builds a self-consistent human_delegated N5 request from persisted state', async () => {
  const option = makeOption();
  const harness = makeCapturingHarness();
  const service = new V1bSliceHumanSelectionService(
    harness,
    makeReadPort(makeOptionSet(), [option, makeOption({ research_slice_option_id: 'rso_2', option_key: 'opt_b' })]),
    { idFactory: (prefix) => `${prefix}_test` },
  );

  const result = await service.selectSlice({
    research_slice_option_set_id: OPTION_SET_ID,
    selected_option_id: 'rso_1',
    selection_rationale: 'Strongest bounded fit.',
    actor: ACTOR,
    confidence: 0.82,
  });

  // Returns whatever the harness returned (the wrapper goes through invokeNode).
  assert.equal(result, HARNESS_RESULT_STUB);

  const req = harness.last();
  assert.equal(req.node_id, 'topic-selection.v1b.select-research-slice.v1');
  assert.equal(req.policy_version, 'topic-selection-v1b-node-policy-v1');
  assert.equal(req.created_by, 'human');
  assert.deepEqual(req.actor, ACTOR);
  assert.equal(req.title_card_id, TITLE_CARD_ID);

  const payload = req.frozen_input.payload as Record<string, unknown>;
  assert.equal(payload.authority_input_provider, 'human_delegated');
  assert.equal(payload.delegation_artifact_hash, null);
  // Hashes the persisted authority + handoff (read back verbatim; N5 compares these).
  assert.equal(payload.research_slice_option_set_hash, AUTHORITY_HASH);
  assert.equal(payload.n4_handoff_hash, N4_HANDOFF_HASH);

  const accepted = payload.accepted_selection_payload as Record<string, unknown>;
  assert.equal(accepted.decision, 'select');
  assert.deepEqual(accepted.selected_option_ref, researchSliceOptionRef(option));
  // selected_option_hash MUST equal the harness re-derivation (shared canonical module).
  assert.equal(accepted.selected_option_hash, hashResearchSliceOptionAuthority(option));
  assert.equal(accepted.confidence, 0.82);
  assert.equal(accepted.requires_human_review, false);

  // accepted_selection_payload_hash MUST equal hash(accepted) — N5 re-derives & compares.
  assert.equal(payload.accepted_selection_payload_hash, canonicalHash(accepted));
  // frozen_input_hash self-consistent with the canonical envelope hashing.
  assert.equal(
    req.frozen_input.frozen_input_hash,
    hashV1bFrozenInput({
      input_contract: req.frozen_input.input_contract,
      snapshot_kind: req.frozen_input.snapshot_kind,
      source_refs: req.frozen_input.source_refs,
      payload: req.frozen_input.payload,
    }),
  );
  // source_refs carries exactly the option-set ref.
  assert.equal(req.frozen_input.source_refs.length, 1);
  assert.deepEqual(req.frozen_input.source_refs[0], {
    ref_type: 'research_slice_option_set',
    ref_id: OPTION_SET_ID,
    version_id: null,
    title_card_id: TITLE_CARD_ID,
  });
});

test('selectSlice rejects when the N4 handoff hash is not persisted (Phase 2 prerequisite)', async () => {
  const optionSet = makeOptionSet({
    comparison_payload: { authority_hash: AUTHORITY_HASH }, // no n4_handoff_hash
  });
  const service = new V1bSliceHumanSelectionService(
    makeCapturingHarness(),
    makeReadPort(optionSet, [makeOption()]),
  );
  await assert.rejects(
    service.selectSlice({
      research_slice_option_set_id: OPTION_SET_ID,
      selected_option_id: 'rso_1',
      selection_rationale: 'x',
      actor: ACTOR,
    }),
    /n4_handoff_hash/,
  );
});

test('selectSlice rejects an unknown option set', async () => {
  const service = new V1bSliceHumanSelectionService(makeCapturingHarness(), makeReadPort(null, []));
  await assert.rejects(
    service.selectSlice({
      research_slice_option_set_id: 'missing',
      selected_option_id: 'rso_1',
      selection_rationale: 'x',
      actor: ACTOR,
    }),
    /ResearchSliceOptionSet missing not found/,
  );
});

test('selectSlice rejects an option not in the set', async () => {
  const service = new V1bSliceHumanSelectionService(
    makeCapturingHarness(),
    makeReadPort(makeOptionSet(), [makeOption()]),
  );
  await assert.rejects(
    service.selectSlice({
      research_slice_option_set_id: OPTION_SET_ID,
      selected_option_id: 'rso_999',
      selection_rationale: 'x',
      actor: ACTOR,
    }),
    /ResearchSliceOption rso_999 not found/,
  );
});

test('selectSlice rejects a non-human actor and an empty rationale', async () => {
  const service = new V1bSliceHumanSelectionService(
    makeCapturingHarness(),
    makeReadPort(makeOptionSet(), [makeOption()]),
  );
  await assert.rejects(
    service.selectSlice({
      research_slice_option_set_id: OPTION_SET_ID,
      selected_option_id: 'rso_1',
      selection_rationale: 'valid',
      actor: { actor_type: 'llm', actor_id: 'bot' },
    }),
    /human or hybrid actor/,
  );
  await assert.rejects(
    service.selectSlice({
      research_slice_option_set_id: OPTION_SET_ID,
      selected_option_id: 'rso_1',
      selection_rationale: '   ',
      actor: ACTOR,
    }),
    /non-empty selection_rationale/,
  );
});
