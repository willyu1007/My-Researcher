import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import {
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS,
  TopicSelectionV1bN6DivergentDebateAdmissionService,
  type TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentityBuilder,
  type TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate,
  type TopicSelectionV1bN6DivergentDebateRoleArtifact,
} from './topic-selection-v1b-n6-divergent-debate-admission-service.js';

// ---- deterministic fixtures: the artifact factory and the fake builder share the SAME derivation
//      functions, so a well-formed fan-out chain re-derives to a byte-matching expected identity. ----

const ref = (id: string) => ({ ref_type: 'artifact_ref' as const, ref_id: id, title_card_id: null });
const SOURCE_HASHES = { base_source_hash: 'src-1' } as const;
const cppId = (slot: string) => `topic-selection.v1b.n6.divergent-debate.${slot}.context-runtime@v1`;
const pphFor = (slot: string, idx: number) => `pph-${slot}-${idx}`;
const ricFor = (slot: string, idx: number, priorCount: number) => `ric-${slot}-${idx}-${priorCount}`;

function lastWins(
  prior: TopicSelectionV1bN6DivergentDebateRoleArtifact[],
): Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>> {
  const map: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>> = {};
  for (const artifact of prior) map[artifact.slot_id] = artifact.role_artifact_hash;
  return map;
}

function outputFor(slot: TopicSelectionV1bN6DivergentDebateRoleSlotId, idx: number): Record<string, unknown> {
  const base = { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot };
  if (slot === 'n6_debate_explorer') {
    return { ...base, candidate_seeds: [{ seed_id: `seed-${idx}`, question_framing: `framing ${idx}`, evidence_refs: [] }] };
  }
  if (slot === 'n6_debate_critic') {
    return { ...base, critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] };
  }
  return {
    ...base,
    synthesized_candidate_set: {
      candidates: [],
      generation_notes: [],
      human_review_triggers: [],
      portfolio_disposition: {
        outcome: 'none_viable',
        rationale: 'The fixture intentionally exercises an evidence-bounded empty portfolio.',
        confidence: 0.8,
        evidence_refs: [],
        rejection_reasons: [],
        reopening_conditions: ['Reopen when new candidate-supporting evidence is available.'],
        candidate_dispositions: [],
      },
      question_frame: {},
      recommended_candidate_keys: [],
    },
  };
}

function instanceFor(
  slot: TopicSelectionV1bN6DivergentDebateRoleSlotId,
  idx: number,
  prior: TopicSelectionV1bN6DivergentDebateRoleArtifact[],
): TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate {
  const output = outputFor(slot, idx);
  const payloadHash = canonicalHash(output);
  const artifact: TopicSelectionV1bN6DivergentDebateRoleArtifact = {
    slot_id: slot,
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    workflow_run_id: 'wfr-1',
    node_attempt_id: 'na-1',
    policy_version: 'pv-1',
    execution_mode: 'codex_assisted',
    run_mode: 'product',
    allowed_effect: 'support_only',
    role_artifact_ref: ref(`role-${slot}-${idx}`),
    role_artifact_hash: payloadHash,
    normalized_output_ref: ref(`role-${slot}-${idx}`),
    normalized_output_hash: payloadHash,
    output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
    profile_id: `topic-selection.v1b.n6-debate.${slot}.v1`,
    model_option_id: null,
    prompt_packet_hash: pphFor(slot, idx),
    structured_output_hash: payloadHash,
    context_policy_profile_id: cppId(slot),
    context_policy_profile_version: 'v1',
    context_policy_profile_hash: `cpph-${slot}`,
    prompt_variant_key: slot,
    runtime_invocation_context_hash: ricFor(slot, idx, prior.length),
    redaction_policy: 'redact-v1',
    source_hashes: { ...SOURCE_HASHES },
    prior_role_artifact_hashes: lastWins(prior),
    runtime_audit_ref: ref(`audit-${slot}-${idx}`),
    runtime_audit_hash: `ah-${slot}-${idx}`,
    provenance_ref: ref(`audit-${slot}-${idx}`),
    runtime_provenance_class: 'runtime_verified',
    compression_report_ref: null,
    compression_report_hash: null,
    compressed_context_hash: null,
  };
  return { artifact, structured_output: output as never };
}

/** explorerCount explorers, then critic_0, arbiter_0, in invocation order, prior accumulating. */
function buildChain(explorerCount = 2): TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[] {
  const order: Array<[TopicSelectionV1bN6DivergentDebateRoleSlotId, number]> = [];
  for (let i = 0; i < explorerCount; i += 1) order.push(['n6_debate_explorer', i]);
  order.push(['n6_debate_critic', 0]);
  order.push(['n6_debate_arbiter', 0]);
  const results: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[] = [];
  const prior: TopicSelectionV1bN6DivergentDebateRoleArtifact[] = [];
  for (const [slot, idx] of order) {
    const candidate = instanceFor(slot, idx, prior);
    results.push(candidate);
    prior.push(candidate.artifact);
  }
  return results;
}

/** Fold the transcript over the ACTUAL observed [slot,arity] structure (matches core.runDivergentLoop). */
function transcriptFor(results: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[]): string {
  const counts = {} as Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>;
  for (const result of results) {
    counts[result.artifact.slot_id] = (counts[result.artifact.slot_id] ?? 0) + 1;
  }
  const stageArities = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER.map(
    (slot) => [slot, counts[slot] ?? 0] as [TopicSelectionV1bN6DivergentDebateRoleSlotId, number],
  );
  return canonicalHash([
    TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
    stageArities,
    results.map((result) => result.artifact.role_artifact_hash),
  ]);
}

const fakeBuilder: TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentityBuilder = {
  async buildAdmissionExpectedIdentity(input) {
    return {
      slot_id: input.slot_id,
      output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
      context_policy_profile_id: cppId(input.slot_id),
      context_policy_profile_version: 'v1',
      context_policy_profile_hash: `cpph-${input.slot_id}`,
      prompt_variant_key: input.slot_id,
      prompt_packet_hash: pphFor(input.slot_id, input.instance_index),
      runtime_invocation_context_hash: ricFor(input.slot_id, input.instance_index, input.prior_role_artifacts.length),
      redaction_policy: 'redact-v1',
      source_hashes: { ...SOURCE_HASHES },
      prior_role_artifact_hashes: lastWins(input.prior_role_artifacts),
      normalized_payload_hash: input.normalized_payload_hash,
    };
  },
};

const service = () => new TopicSelectionV1bN6DivergentDebateAdmissionService(fakeBuilder);
const clone = (results: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[]) =>
  structuredClone(results) as TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[];

test('N6 divergent debate admission: scenario arity defaults are explorer 2 / critic 1 / arbiter 1', () => {
  assert.deepEqual(TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS, {
    n6_debate_explorer: 2,
    n6_debate_critic: 1,
    n6_debate_arbiter: 1,
  });
});

test('N6 divergent debate admission: admits a well-formed fan-out chain and surfaces the arbiter draft', async () => {
  const results = buildChain();
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, true);
  if (!result.admitted) return;
  assert.equal(result.final_artifact.slot_id, 'n6_debate_arbiter');
  assert.equal(result.admission_identity.final_slot_id, 'n6_debate_arbiter');
  assert.deepEqual(result.admission_identity.stage_arities, [
    ['n6_debate_explorer', 2], ['n6_debate_critic', 1], ['n6_debate_arbiter', 1],
  ]);
  assert.equal(result.admission_identity.ordered_role_artifact_hashes.length, 4);
  // synthesized_candidate_set surfaced as a bare empty-portfolio draft for the f5 gate bridge.
  assert.deepEqual(Object.keys(result.synthesized_candidate_set).sort(), [
    'candidates', 'generation_notes', 'human_review_triggers', 'portfolio_disposition', 'question_frame', 'recommended_candidate_keys',
  ]);
});

test('N6 divergent debate admission: blocks a missing stage', async () => {
  const results = buildChain().filter((c) => c.artifact.slot_id !== 'n6_debate_critic');
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_REQUIRED_ROLE_MISSING');
});

test('N6 divergent debate admission: admits a 3-explorer fan-out (within max) — variable arity, not pinned to default', async () => {
  const results = buildChain(3);
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, true);
  if (!result.admitted) return;
  assert.deepEqual(result.admission_identity.stage_arities, [
    ['n6_debate_explorer', 3], ['n6_debate_critic', 1], ['n6_debate_arbiter', 1],
  ]);
  assert.equal(result.admission_identity.ordered_role_artifact_hashes.length, 5);
});

test('N6 divergent debate admission: admits a single-explorer fan-out (min)', async () => {
  const results = buildChain(1);
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, true);
});

test('N6 divergent debate admission: blocks stage arity outside [min,max] (four explorers > max 3)', async () => {
  const results = buildChain(4);
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_STAGE_ARITY_DRIFT');
});

test('N6 divergent debate admission: blocks a non-singleton terminal arbiter', async () => {
  const results = buildChain();
  const prior = results.map((c) => c.artifact);
  results.push(instanceFor('n6_debate_arbiter', 1, prior)); // a second arbiter
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_TERMINAL_NOT_SINGLETON');
});

test('N6 divergent debate admission: blocks a non-canonical fan-out order', async () => {
  const results = buildChain();
  const reordered = [results[0]!, results[2]!, results[1]!, results[3]!]; // explorer, critic, explorer, arbiter
  const result = await service().admit({ role_results: reordered, loop_transcript_hash: transcriptFor(reordered) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ROLE_ORDER_INVALID');
});

test('N6 divergent debate admission: blocks a forbidden authority field in a role output', async () => {
  const results = clone(buildChain());
  const arbiter = results[3]!;
  (arbiter.structured_output as Record<string, unknown>).route_decision = 'advance';
  const rehash = canonicalHash(arbiter.structured_output);
  arbiter.artifact.role_artifact_hash = rehash;
  arbiter.artifact.normalized_output_hash = rehash;
  arbiter.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_FORBIDDEN_AUTHORITY_FIELD');
});

test('N6 divergent debate admission: blocks a role output whose role_slot does not match its runtime slot', async () => {
  const results = clone(buildChain());
  const critic = results[2]!; // explorer_0, explorer_1, critic_0, arbiter_0
  (critic.structured_output as Record<string, unknown>).role_slot = 'n6_debate_explorer'; // wrong slot
  const rehash = canonicalHash(critic.structured_output);
  critic.artifact.role_artifact_hash = rehash;
  critic.artifact.normalized_output_hash = rehash;
  critic.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_MISMATCH');
});

test('N6 divergent debate admission: blocks a role output with a drifted schema_version', async () => {
  const results = clone(buildChain());
  const critic = results[2]!; // explorer_0, explorer_1, critic_0, arbiter_0
  // role_slot stays correct; only the model output's self-declared schema_version drifts off-contract.
  (critic.structured_output as Record<string, unknown>).schema_version = 'TopicSelectionV1bN6DivergentDebateRoleOutput@v0';
  const rehash = canonicalHash(critic.structured_output);
  critic.artifact.role_artifact_hash = rehash;
  critic.artifact.normalized_output_hash = rehash;
  critic.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION');
});

// NOTE (intentional cross-node divergence): N6 divergent-debate admission pins the model's
// self-declared schema_version, unlike its N8 / v1c-N2 bounded-debate siblings which currently check
// only role_slot. These cases lock that extra guard so it cannot be silently dropped. The "missing"
// case is the exact scenario the dedicated blocker code was added for (a role output carrying a
// wrong/MISSING schema_version must not be admitted).
test('N6 divergent debate admission: blocks a role output with a missing schema_version', async () => {
  const results = clone(buildChain());
  const critic = results[2]!; // explorer_0, explorer_1, critic_0, arbiter_0
  delete (critic.structured_output as Record<string, unknown>).schema_version; // missing entirely
  const rehash = canonicalHash(critic.structured_output);
  critic.artifact.role_artifact_hash = rehash;
  critic.artifact.normalized_output_hash = rehash;
  critic.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION');
});

test('N6 divergent debate admission: blocks a role output with an empty-string schema_version', async () => {
  const results = clone(buildChain());
  const critic = results[2]!;
  (critic.structured_output as Record<string, unknown>).schema_version = ''; // present but empty
  const rehash = canonicalHash(critic.structured_output);
  critic.artifact.role_artifact_hash = rehash;
  critic.artifact.normalized_output_hash = rehash;
  critic.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION');
});

test('N6 divergent debate admission: blocks an arbiter output missing synthesized_candidate_set', async () => {
  const results = clone(buildChain());
  const arbiter = results[3]!;
  arbiter.structured_output = { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: 'n6_debate_arbiter' } as never;
  const rehash = canonicalHash(arbiter.structured_output);
  arbiter.artifact.role_artifact_hash = rehash;
  arbiter.artifact.normalized_output_hash = rehash;
  arbiter.artifact.structured_output_hash = rehash;
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ARBITER_OUTPUT_NOT_N6_DRAFT');
});

test('N6 divergent debate admission: blocks per-instance profile drift', async () => {
  const results = clone(buildChain());
  results[2]!.artifact.context_policy_profile_hash = 'cpph-tampered';
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_ARTIFACT_PROFILE_DRIFT');
});

test('N6 divergent debate admission: blocks a tampered prior-role hash chain', async () => {
  const results = clone(buildChain());
  results[3]!.artifact.prior_role_artifact_hashes = { n6_debate_explorer: 'wrong', n6_debate_critic: 'wrong' };
  const result = await service().admit({ role_results: results, loop_transcript_hash: transcriptFor(results) });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_PRIOR_ROLE_HASH_DRIFT');
});

test('N6 divergent debate admission: blocks loop transcript drift', async () => {
  const results = buildChain();
  const result = await service().admit({ role_results: results, loop_transcript_hash: 'not-the-real-transcript' });
  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_DIVERGENT_DEBATE_TRANSCRIPT_DRIFT');
});
