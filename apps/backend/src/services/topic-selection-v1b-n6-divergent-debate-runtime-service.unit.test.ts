import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { createTopicSelectionV1bN6DivergentDebateScenarioContract } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { TopicSelectionContextPolicyProfileRegistryService } from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionModelProfileRegistryService } from './topic-selection-model-profile-registry-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import {
  PROMPT_TEMPLATE_ID_BY_SLOT,
  PROMPT_TEMPLATE_VERSION,
  V1bN6DivergentDebateStrategy,
  type V1bN6DebateHandoff,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import {
  TopicSelectionV1bN6DivergentDebateAdmissionService,
  type TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate,
  type TopicSelectionV1bN6DivergentDebateRoleArtifact,
} from './topic-selection-v1b-n6-divergent-debate-admission-service.js';

function makeStrategy(): V1bN6DivergentDebateStrategy {
  return new V1bN6DivergentDebateStrategy(
    new TopicSelectionContextPolicyProfileRegistryService(),
    new TopicSelectionModelProfileRegistryService(),
    new TopicSelectionPromptPacketRuntimeService(),
  );
}

const handoff: V1bN6DebateHandoff = {
  request: { workspace_id: 'ws-1', title_card_id: 'tc-1', policy_version: 'pv-1' } as unknown as TopicSelectionV1bWorkflowHarnessRunRequest,
  frozenPayload: { n5_handoff_hash: 'n5h' } as unknown as TopicSelectionV1bN6HarnessFrozenInputPayload,
  candidateGenerationMode: 'initial_from_n5',
  modeContext: { kind: 'initial_from_n5', n7_loopback_projection_ref: null, n7_loopback_projection_hash: null, n7_loopback_projection: null },
  decisionMemory: null,
  baseSourceHashes: { frozen_input_hash: 'fih', n5_handoff_hash: 'n5h' },
  baseSourceRefs: [],
};

const WFR = 'wfr-1';
const NA = 'na-1';
const PV = 'pv-1';
const EM = 'codex_assisted' as const;
const RM = 'product' as const;

test('f4 strategy: instanceCountFor returns the scenario defaults and the arbiter is a terminal singleton', () => {
  const strategy = makeStrategy();
  assert.equal(strategy.instanceCountFor('n6_debate_explorer'), 2);
  assert.equal(strategy.instanceCountFor('n6_debate_critic'), 1);
  assert.equal(strategy.instanceCountFor('n6_debate_arbiter'), 1);
  assert.deepEqual([...strategy.roleOrder], ['n6_debate_explorer', 'n6_debate_critic', 'n6_debate_arbiter']);
  assert.equal(strategy.debateLoopId, TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID);
});

test('f4 strategy: PROMPT_TEMPLATE_ID_BY_SLOT is single-sourced to the scenario role_stage_slots (drift guard)', () => {
  const scenario = createTopicSelectionV1bN6DivergentDebateScenarioContract();
  for (const slot of TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER) {
    const stageSlot = scenario.role_stage_slots.find((item) => item.slot_id === slot);
    assert.ok(stageSlot, `scenario has stage slot ${slot}`);
    assert.equal(PROMPT_TEMPLATE_ID_BY_SLOT[slot], stageSlot!.prompt_template_id);
    // also pin the version so a scenario version bump can't silently drift from the strategy.
    assert.equal(PROMPT_TEMPLATE_VERSION, stageSlot!.prompt_template_version);
  }
});

test('f4 strategy: instance_index is folded — two same-slot explorer workers get DISTINCT expected identities', async () => {
  const strategy = makeStrategy();
  const base = {
    slot_id: 'n6_debate_explorer' as const,
    prior_role_artifacts: [] as TopicSelectionV1bN6DivergentDebateRoleArtifact[],
    workflow_run_id: WFR, node_attempt_id: NA, policy_version: PV,
    execution_mode: EM, run_mode: RM, model_option_id: null,
    normalized_payload_hash: 'payload-hash',
  };
  const e0 = await strategy.buildAdmissionExpectedIdentityFor(handoff, { ...base, instance_index: 0 });
  const e1 = await strategy.buildAdmissionExpectedIdentityFor(handoff, { ...base, instance_index: 1 });
  const e0again = await strategy.buildAdmissionExpectedIdentityFor(handoff, { ...base, instance_index: 0 });
  // instance_index 0 vs 1 → distinct RIC + prompt packet (fan-out workers individually addressable)
  assert.notEqual(e0.runtime_invocation_context_hash, e1.runtime_invocation_context_hash);
  assert.notEqual(e0.prompt_packet_hash, e1.prompt_packet_hash);
  // same instance_index → identical (deterministic / replay-stable)
  assert.equal(e0.runtime_invocation_context_hash, e0again.runtime_invocation_context_hash);
  assert.equal(e0.prompt_packet_hash, e0again.prompt_packet_hash);
  // no prior → empty last-wins map
  assert.deepEqual(e0.prior_role_artifact_hashes, {});
});

test('f4 strategy: builder rebuilds prior_role_artifact_hashes as the last-wins map of the ordered prior', async () => {
  const strategy = makeStrategy();
  const prior = [
    { slot_id: 'n6_debate_explorer', role_artifact_hash: 'exp-0' },
    { slot_id: 'n6_debate_explorer', role_artifact_hash: 'exp-1' },
    { slot_id: 'n6_debate_critic', role_artifact_hash: 'crit-0' },
  ] as TopicSelectionV1bN6DivergentDebateRoleArtifact[];
  const arbiter = await strategy.buildAdmissionExpectedIdentityFor(handoff, {
    slot_id: 'n6_debate_arbiter', instance_index: 0, prior_role_artifacts: prior,
    workflow_run_id: WFR, node_attempt_id: NA, policy_version: PV, execution_mode: EM, run_mode: RM,
    model_option_id: null, normalized_payload_hash: 'arb-payload',
  });
  // last-wins: the SECOND explorer wins its slot, critic carries its own.
  assert.deepEqual(arbiter.prior_role_artifact_hashes, { n6_debate_explorer: 'exp-1', n6_debate_critic: 'crit-0' });
});

// ---- the round-trip / replay-parity guard (closes the f3-review obligation at the identity level):
// build a full fan-out chain's identities via the strategy, synthesize matching artifacts, and prove the
// f3 admission (driven by the SAME strategy as its builder) ADMITS them. The transcript is folded exactly
// as core.runDivergentLoop folds it, so a real run would re-derive byte-identically. ----

function outputFor(slot: TopicSelectionV1bN6DivergentDebateRoleSlotId, idx: number): Record<string, unknown> {
  const base = { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot };
  if (slot === 'n6_debate_explorer') return { ...base, candidate_seeds: [{ seed_id: `s-${idx}`, question_framing: `f-${idx}`, evidence_refs: [] }] };
  if (slot === 'n6_debate_critic') return { ...base, critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin' }] };
  return { ...base, synthesized_candidate_set: { candidates: [], generation_notes: [], human_review_triggers: [], question_frame: {}, recommended_candidate_keys: [] } };
}

const ref = (id: string) => ({ ref_type: 'artifact_ref' as const, ref_id: id, title_card_id: null });

test('f4 strategy + f3 admission round-trip: a strategy-built fan-out chain ADMITS (replay parity at identity level)', async () => {
  const strategy = makeStrategy();
  const builder = { buildAdmissionExpectedIdentity: (input: Parameters<typeof strategy.buildAdmissionExpectedIdentityFor>[1]) => strategy.buildAdmissionExpectedIdentityFor(handoff, input) };

  const order: Array<[TopicSelectionV1bN6DivergentDebateRoleSlotId, number]> = [
    ['n6_debate_explorer', 0], ['n6_debate_explorer', 1], ['n6_debate_critic', 0], ['n6_debate_arbiter', 0],
  ];
  const results: TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate[] = [];
  const prior: TopicSelectionV1bN6DivergentDebateRoleArtifact[] = [];
  for (const [slot, idx] of order) {
    const output = outputFor(slot, idx);
    const payloadHash = canonicalHash(output);
    const expected = await strategy.buildAdmissionExpectedIdentityFor(handoff, {
      slot_id: slot, instance_index: idx, prior_role_artifacts: [...prior],
      workflow_run_id: WFR, node_attempt_id: NA, policy_version: PV, execution_mode: EM, run_mode: RM,
      model_option_id: null, normalized_payload_hash: payloadHash,
    });
    const artifact: TopicSelectionV1bN6DivergentDebateRoleArtifact = {
      slot_id: slot,
      node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
      workflow_run_id: WFR, node_attempt_id: NA, policy_version: PV, execution_mode: EM, run_mode: RM,
      allowed_effect: 'support_only',
      role_artifact_ref: ref(`role-${slot}-${idx}`),
      role_artifact_hash: payloadHash,
      normalized_output_ref: ref(`role-${slot}-${idx}`),
      normalized_output_hash: payloadHash,
      output_contract: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1',
      profile_id: `p-${slot}`,
      model_option_id: null,
      prompt_packet_hash: expected.prompt_packet_hash!,
      structured_output_hash: payloadHash,
      context_policy_profile_id: expected.context_policy_profile_id,
      context_policy_profile_version: expected.context_policy_profile_version,
      context_policy_profile_hash: expected.context_policy_profile_hash,
      prompt_variant_key: expected.prompt_variant_key,
      runtime_invocation_context_hash: expected.runtime_invocation_context_hash,
      redaction_policy: expected.redaction_policy,
      source_hashes: expected.source_hashes,
      prior_role_artifact_hashes: expected.prior_role_artifact_hashes,
      runtime_audit_ref: ref(`audit-${slot}-${idx}`),
      runtime_audit_hash: `ah-${slot}-${idx}`,
      provenance_ref: ref(`audit-${slot}-${idx}`),
      runtime_provenance_class: 'runtime_verified',
      compression_report_ref: null, compression_report_hash: null, compressed_context_hash: null,
    };
    results.push({ artifact, structured_output: output as never });
    prior.push(artifact);
  }

  const counts = {} as Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, number>;
  for (const r of results) counts[r.artifact.slot_id] = (counts[r.artifact.slot_id] ?? 0) + 1;
  const stageArities = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER.map(
    (slot) => [slot, counts[slot] ?? 0] as [TopicSelectionV1bN6DivergentDebateRoleSlotId, number],
  );
  const transcript = canonicalHash([
    TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
    stageArities,
    results.map((r) => r.artifact.role_artifact_hash),
  ]);

  const admission = new TopicSelectionV1bN6DivergentDebateAdmissionService(builder);
  const result = await admission.admit({ role_results: results, loop_transcript_hash: transcript });
  assert.equal(result.admitted, true);
  if (!result.admitted) return;
  assert.equal(result.final_artifact.slot_id, 'n6_debate_arbiter');
  assert.deepEqual(Object.keys(result.synthesized_candidate_set).sort(), [
    'candidates', 'generation_notes', 'human_review_triggers', 'question_frame', 'recommended_candidate_keys',
  ]);
});
