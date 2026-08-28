import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { createTopicSelectionV1bN6DivergentDebateScenarioContract } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionContextPolicyProfileRegistryService } from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionModelProfileRegistryService } from './topic-selection-model-profile-registry-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import {
  PROMPT_TEMPLATE_ID_BY_SLOT,
  PROMPT_TEMPLATE_VERSION,
  TopicSelectionV1bN6DivergentDebateRuntimeService,
  V1bN6DivergentDebateStrategy,
  type V1bN6DebateHandoff,
  type V1bN6DebateInputs,
} from './topic-selection-v1b-n6-divergent-debate-runtime-service.js';
import {
  TopicSelectionV1bN6DivergentDebateAdmissionService,
  type TopicSelectionV1bN6DivergentDebateRoleAdmissionCandidate,
  type TopicSelectionV1bN6DivergentDebateRoleArtifact,
} from './topic-selection-v1b-n6-divergent-debate-admission-service.js';
import { selectN6DebateExecutionPlan } from './topic-selection-debate-execution-plan-registry-service.js';

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
  executionPlan: null,
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
    'candidates', 'generation_notes', 'human_review_triggers', 'portfolio_disposition', 'question_frame', 'recommended_candidate_keys',
  ]);
});

// ---- f5 e2e (the EXECUTABLE parity proof): a mocked_llm fan-out runs the real strategy through
// core.runDivergentLoop + the f3 admission + the gate bridge, against the real orchestrator/registries/
// in-memory control plane. status 'completed' means the core's [slot,arity] transcript fold == the
// admission re-fold AND every per-instance identity re-derived byte-identically (admission would block
// otherwise) — closing the f3/f4 executable-parity obligation. ----

const TITLE_CARD_ID = 'title_card_001';
const fref = (refType: string, refId: string): TopicSelectionFunctionalRef => ({ ref_type: refType, ref_id: refId, title_card_id: TITLE_CARD_ID, version_id: null });
const h64 = (seed: string): string => seed.repeat(64).slice(0, 64);
const EVIDENCE_REF = fref('evidence_unit', 'evidence_unit_001');
const INCLUDED_BOUNDARY_REF = fref('research_slice_boundary', 'boundary_included_001');
const EXCLUDED_BOUNDARY_REF = fref('research_slice_boundary', 'boundary_excluded_001');
const NEED_REF = fref('validated_need', 'validated_need_001');

function e2eFrozenPayload(): TopicSelectionV1bN6HarnessFrozenInputPayload {
  return {
    n5_handoff_hash: h64('a'),
    constraint_profile_ref: fref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: h64('b'),
    intake_readiness_ref: fref('readiness_assessment', 'intake_readiness_001'),
    intake_readiness_hash: h64('c'),
    research_slice_ref: fref('research_slice', 'research_slice_001'),
    research_slice_hash: h64('d'),
    research_slice_selection_ref: fref('research_slice_selection_decision', 'slice_selection_001'),
    research_slice_selection_hash: h64('e'),
    research_slice_option_set_ref: fref('research_slice_option_set', 'option_set_001'),
    research_slice_option_set_hash: h64('f'),
    selected_slice_option_ref: fref('research_slice_option', 'slice_option_001'),
    selected_slice_option_hash: h64('1'),
  };
}

function e2eRequest(): TopicSelectionV1bWorkflowHarnessRunRequest {
  const payload = e2eFrozenPayload();
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    workflow_run_id: 'workflow_run_v1b_n6_debate_001',
    node_attempt_id: 'node_attempt_v1b_n6_debate_001',
    node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'N5ToN6Handoff@v1',
      snapshot_kind: 'research_slice_selection_decision',
      source_refs: [
        fref('research_slice_selection_decision', 'slice_selection_001'),
        payload.research_slice_ref,
        payload.research_slice_selection_ref,
        payload.research_slice_option_set_ref,
        payload.selected_slice_option_ref,
        payload.constraint_profile_ref,
        payload.intake_readiness_ref,
      ],
      payload: payload as unknown as Record<string, unknown>,
    },
  } as unknown as TopicSelectionV1bWorkflowHarnessRunRequest;
}

function e2eCandidateSetDraft(): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload {
  return {
    question_frame: {
      target_setting: 'Local-first CS paper engineering assistant workflows.',
      target_community: 'CS paper engineering researchers',
      object_scope: 'v1b harness-native topic selection candidate generation',
      task_scope: 'candidate generation, deterministic gates, and replay drift checks',
      intervention_or_approach: 'WorkflowHarness-native candidate-set gate with frozen semantic artifacts',
      comparison_baseline: 'route-only smoke tests without harness-level product acceptance',
      observable_outcome: 'stable candidate-set refs and replay hashes',
      assumption_refs: [],
      evidence_refs: [EVIDENCE_REF],
      frame_payload: { fixture: true },
    },
    recommended_candidate_keys: ['harness_candidate'],
    generation_notes: ['Candidate stays inside the selected ResearchSlice and preserves N5 lineage.'],
    human_review_triggers: [],
    candidates: [
      {
        candidate_key: 'harness_candidate',
        main_question: 'How can a WorkflowHarness-native candidate gate improve replayable v1b topic selection?',
        sub_questions: ['Which N5 lineage hashes must remain frozen before N7 admission?'],
        question_type: 'system',
        contribution_hypothesis: 'system',
        source_validated_need_refs: [NEED_REF],
        answerability_plan: {
          datasets_or_resources: ['v1b harness trace fixtures'],
          metrics: ['hash drift detection rate'],
          baselines: ['route-only smoke coverage'],
          ablations_or_comparisons: ['without frozen semantic artifact admission'],
          evaluation_setting: 'local deterministic harness acceptance tests',
          dependency_risks: ['provider canary behavior is not exercised in this fixture'],
          open_dependencies: [],
          known_gaps: [],
          required_evidence_refs: [EVIDENCE_REF],
        },
        answerability_verdict: 'answerable',
        expected_claim: 'A harness-native candidate gate improves replayable v1b topic selection.',
        fallback_claim: 'The gate preserves candidate lineage for downstream review.',
        max_claim_strength: 'Bounded workflow claim about candidate lineage and replay.',
        observable_success_criteria: ['N6 emits candidate set refs and hashes.'],
        boundary_check: {
          preserved_boundary_refs: [INCLUDED_BOUNDARY_REF],
          excluded_boundary_refs: [EXCLUDED_BOUNDARY_REF],
          boundary_violations: [],
          prohibited_claims: ['promotion decision'],
          allowed_refinements: ['tighten candidate wording'],
        },
        traceability_check: {
          support_evidence_refs: [EVIDENCE_REF],
          challenge_evidence_refs: [EVIDENCE_REF],
          baseline_evidence_refs: [EVIDENCE_REF],
          context_evidence_refs: [EVIDENCE_REF],
          mapped_evidence_refs: [EVIDENCE_REF],
          unmapped_assumptions: [],
        },
        falsification_conditions: [
          {
            condition_type: 'claim_overstrong',
            severity: 'hard',
            statement: 'If changed frozen N5 lineage hashes are not detected, the candidate claim must be lowered.',
            trigger_evidence_refs: [EVIDENCE_REF],
            trigger_source_refs: [fref('research_slice', 'research_slice_001')],
            related_contract_fields: ['expected_claim'],
            expected_action: 'lower_claim_strength',
            check_timing: 'before_value_assessment',
            confidence: 'high',
          },
        ],
        risk_notes: [],
        blockers: [],
        objections: [],
        human_review_triggers: [],
        confidence: 0.84,
      },
    ],
  };
}

function mockedRole(slot: TopicSelectionV1bN6DivergentDebateRoleSlotId, idx: number, body: Record<string, unknown>): V1bN6DebateInputs {
  return {
    codex_response: null,
    mocked_output: {
      fixture_id: `n6_debate_${slot}_${idx}`,
      output: { schema_version: 'TopicSelectionV1bN6DivergentDebateRoleOutput@v1', role_slot: slot, ...body },
    } as never,
    instance_index: idx,
  };
}

test('f5 runtime: a mocked_llm fan-out debate runs through core + admission + gate bridge to completed', async () => {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (() => {
      const counts = new Map<string, number>();
      return (prefix: string) => {
        const next = (counts.get(prefix) ?? 0) + 1;
        counts.set(prefix, next);
        return `${prefix}_${String(next).padStart(3, '0')}`;
      };
    })(),
    now: () => '2026-06-16T00:00:00.000Z',
  });
  const runtime = new TopicSelectionV1bN6DivergentDebateRuntimeService(controlPlane);

  const result = await runtime.runDivergentDebate({
    request: e2eRequest(),
    generation_mode: 'initial_from_n5',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    role_outputs: {
      n6_debate_explorer: [
        mockedRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedRole('n6_debate_arbiter', 0, { synthesized_candidate_set: e2eCandidateSetDraft() }),
      ],
    },
    created_by: 'system',
  });

  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') return;
  assert.match(result.loop_transcript_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.gate_draft.status, 'succeeded');
  if (result.gate_draft.status !== 'succeeded') return;
  // The bridged draft carries single-agent gate identity (model_draft_for_gate), not a debate role artifact.
  assert.equal(result.gate_draft.semantic_artifact.allowed_effect, 'model_draft_for_gate');
  // The admission surfaced the arbiter's bare 5-key draft (what the gate bridge funnelled through).
  assert.deepEqual(Object.keys(result.admission.synthesized_candidate_set).sort(), [
    'candidates', 'generation_notes', 'human_review_triggers', 'question_frame', 'recommended_candidate_keys',
  ]);
  // Byte pass-through: the bridged gate draft IS the arbiter's exact synthesized draft (not a substitute).
  assert.deepEqual(result.gate_draft.structured_output, result.admission.synthesized_candidate_set);
  assert.deepEqual(result.gate_draft.structured_output, e2eCandidateSetDraft());
});

test('f5 runtime: a W-09 execution_plan with no per-role override is byte-identical (no-plan === empty-plan)', async () => {
  // T-127 W-09 (S2): the execution_plan threads additively into the N6 divergent debate; a plan that
  // supplies no per-role model_option_id resolves (per ROLE FAMILY) to null -> the base ctx.modelOptionId
  // (null), so the loop transcript + the id-INDEPENDENT admission-identity components are byte-identical to
  // a run with no plan at all. The plan does NOT change fan-out arity (that stays strategy.instanceCountFor).
  // Concrete per-family overrides are exercised in S4.
  const makeRuntime = () => {
    const repository = new InMemoryTopicSelectionControlPlaneRepository();
    const controlPlane = new TopicSelectionControlPlaneService(repository, {
      idFactory: (() => {
        const counts = new Map<string, number>();
        return (prefix: string) => {
          const next = (counts.get(prefix) ?? 0) + 1;
          counts.set(prefix, next);
          return `${prefix}_${String(next).padStart(3, '0')}`;
        };
      })(),
      now: () => '2026-06-16T00:00:00.000Z',
    });
    return new TopicSelectionV1bN6DivergentDebateRuntimeService(controlPlane);
  };

  const baseInput = () => ({
    request: e2eRequest(),
    generation_mode: 'initial_from_n5' as const,
    execution_mode: 'mocked_llm' as const,
    run_mode: 'test' as const,
    role_outputs: {
      n6_debate_explorer: [
        mockedRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedRole('n6_debate_arbiter', 0, { synthesized_candidate_set: e2eCandidateSetDraft() }),
      ],
    } as Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, V1bN6DebateInputs[]>>,
    created_by: 'system' as const,
  });

  const noPlan = await makeRuntime().runDivergentDebate(baseInput());
  const emptyPlan = await makeRuntime().runDivergentDebate({
    ...baseInput(),
    execution_plan: { name: 'codex_assisted' },
  });

  assert.equal(noPlan.status, 'completed');
  assert.equal(emptyPlan.status, 'completed');
  if (noPlan.status !== 'completed' || emptyPlan.status !== 'completed') return;

  // Compare the id-INDEPENDENT identity components (the N6 admission identity has no role-keyed hash maps;
  // its final_*_ref / *_audit_* fields + admission_identity_hash fold idFactory-bearing refs, so they are
  // NOT compared). An empty plan leaves the transcript chain + source/prior hashes byte-identical.
  assert.equal(emptyPlan.loop_transcript_hash, noPlan.loop_transcript_hash);
  assert.deepEqual(
    emptyPlan.admission.admission_identity.ordered_role_artifact_hashes,
    noPlan.admission.admission_identity.ordered_role_artifact_hashes,
  );
  assert.deepEqual(
    emptyPlan.admission.admission_identity.source_hashes,
    noPlan.admission.admission_identity.source_hashes,
  );
  assert.deepEqual(
    emptyPlan.admission.admission_identity.prior_role_artifact_hashes,
    noPlan.admission.admission_identity.prior_role_artifact_hashes,
  );
  assert.deepEqual(
    emptyPlan.admission.admission_identity.stage_arities,
    noPlan.admission.admission_identity.stage_arities,
  );
});

test('f5 runtime: a concrete provider_diverse plan is DORMANT (replay-safe) for a mocked/codex N6 debate (W-09 S4)', async () => {
  // T-127 W-09 S4: the per-FAMILY provider_diverse plan (explorer/critic dashscope, arbiter openai-quality)
  // is selectable + injectable, but N6 debates run codex_assisted | mocked_llm only and the model-profile
  // registry resolves a model_option_id to a provider option ONLY for execution_mode 'provider_llm'. So for
  // a mocked/codex N6 debate the per-family option is dropped at profile resolution -> the plan is COMPLETELY
  // DORMANT (zero observable identity effect), exactly like an empty plan. Replay-safety: a provider_diverse
  // plan can never silently perturb the divergent debate identity. (Live effect awaits provider_llm — OOS.)
  const makeRuntime = () => {
    const repository = new InMemoryTopicSelectionControlPlaneRepository();
    const controlPlane = new TopicSelectionControlPlaneService(repository, {
      idFactory: (() => {
        const counts = new Map<string, number>();
        return (prefix: string) => {
          const next = (counts.get(prefix) ?? 0) + 1;
          counts.set(prefix, next);
          return `${prefix}_${String(next).padStart(3, '0')}`;
        };
      })(),
      now: () => '2026-06-16T00:00:00.000Z',
    });
    return new TopicSelectionV1bN6DivergentDebateRuntimeService(controlPlane);
  };
  const baseInput = () => ({
    request: e2eRequest(),
    generation_mode: 'initial_from_n5' as const,
    execution_mode: 'mocked_llm' as const,
    run_mode: 'test' as const,
    role_outputs: {
      n6_debate_explorer: [
        mockedRole('n6_debate_explorer', 0, { candidate_seeds: [{ seed_id: 's0', question_framing: 'framing 0', evidence_refs: [] }] }),
        mockedRole('n6_debate_explorer', 1, { candidate_seeds: [{ seed_id: 's1', question_framing: 'framing 1', evidence_refs: [] }] }),
      ],
      n6_debate_critic: [
        mockedRole('n6_debate_critic', 0, { critic_findings: [{ finding_code: 'weak_topic_question_candidate_set', severity: 'note', statement: 'thin set' }] }),
      ],
      n6_debate_arbiter: [
        mockedRole('n6_debate_arbiter', 0, { synthesized_candidate_set: e2eCandidateSetDraft() }),
      ],
    } as Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, V1bN6DebateInputs[]>>,
    created_by: 'system' as const,
  });

  const noPlan = await makeRuntime().runDivergentDebate(baseInput());
  const diverse = await makeRuntime().runDivergentDebate({
    ...baseInput(),
    execution_plan: selectN6DebateExecutionPlan('provider_diverse'),
  });

  assert.equal(noPlan.status, 'completed');
  assert.equal(diverse.status, 'completed');
  if (noPlan.status !== 'completed' || diverse.status !== 'completed') return;
  assert.equal(diverse.loop_transcript_hash, noPlan.loop_transcript_hash);
  assert.deepEqual(
    diverse.admission.admission_identity.ordered_role_artifact_hashes,
    noPlan.admission.admission_identity.ordered_role_artifact_hashes,
  );
  assert.deepEqual(
    diverse.admission.admission_identity.source_hashes,
    noPlan.admission.admission_identity.source_hashes,
  );
});

test('f5 runtime: rejects a named execution_plan co-supplied with a legacy model_option_id (W-09 pre-provider_llm hardening)', async () => {
  // T-127 W-09: the per-family named plan is the SOLE override channel — co-supplying it with the legacy
  // per-loop model_option_id is rejected up front (the plan's default tail would shadow the legacy id). The
  // guard is inert today (no caller supplies a legacy id) but fires the moment a live provider_llm path lands.
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix: string) => `${prefix}_001`,
    now: () => '2026-06-16T00:00:00.000Z',
  });
  const runtime = new TopicSelectionV1bN6DivergentDebateRuntimeService(controlPlane);
  await assert.rejects(
    runtime.runDivergentDebate({
      request: e2eRequest(),
      generation_mode: 'initial_from_n5',
      execution_mode: 'mocked_llm',
      run_mode: 'test',
      role_outputs: {},
      execution_plan: selectN6DebateExecutionPlan('provider_compact'),
      model_option_id: 'legacy-per-loop-option',
    }),
    /named debate execution_plan cannot be combined with a legacy per-loop model_option_id/,
  );
  // The reject fires before any role/context artifacts are recorded (no debate loop ran).
  assert.equal((await controlPlane.listArtifactRefsByWorkflowRunId(e2eRequest().workflow_run_id)).length, 0);
});

// T-128 W-14: mirror of the N8 dormancy-gate pin — provider_llm divergent debate is representable
// but rejected at entry while the shared const says dormant (W-19 flips it; D8: no auto-flip).
test('W-14 dormancy gate: provider_llm N6 divergent debate rejects at entry (409, zero control-plane writes)', async () => {
  assert.equal(TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant, true);

  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository);
  const runtime = new TopicSelectionV1bN6DivergentDebateRuntimeService(controlPlane);
  const request = e2eRequest();
  await assert.rejects(
    runtime.runDivergentDebate({
      request,
      generation_mode: 'initial_from_n5',
      execution_mode: 'provider_llm',
      role_outputs: {},
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && /DORMANT/.test(error.message)
      && /calibration_gate_release/.test(error.message)
      && /W-19/.test(error.message),
  );
  assert.deepEqual(
    await controlPlane.listArtifactRefsByWorkflowRunId(request.workflow_run_id),
    [],
    'the guard fires before any control-plane write',
  );
});
