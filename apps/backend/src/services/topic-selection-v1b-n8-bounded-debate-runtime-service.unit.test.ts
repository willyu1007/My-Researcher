// T-123 Phase 3 (STEP 10) — runtime verification for the v1b N8 bounded-debate subsystem.
//
// Scope: the NEW debate code — the shared-core 4-role loop, the deterministic admission's
// byte-matching (per-role identity drift, prior-role hash chain, critic→repair resolution,
// loop-transcript fold), and the STEP-9 gate bridge — exercised through the REAL orchestrator,
// prompt-packet runtime, registries, and in-memory control plane. The expensive, already-tested
// N7→N8 resolution (resolveSharedN8RuntimeContext) is replaced by an injected stub returning a
// fixed, internally-consistent context: the runtime and the admission consume the SAME resolved
// handoff, so the admission re-derives each role's identity through the same strategy hooks the
// loop used — byte-matching is verified by construction here (not the projection validation, which
// the single-agent runtime owns and tests separately).

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN8BoundedDebateRoleSlotId,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionV1bN8ValueAssessmentRuntimeService } from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import {
  TopicSelectionV1bN8BoundedDebateRuntimeService,
  type GenerateTopicSelectionV1bN8DebateInput,
} from './topic-selection-v1b-n8-bounded-debate-runtime-service.js';

const OUTPUT_CONTRACT = TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'title_card_001', version_id: null };
}

// A fixed, internally-consistent N7→N8 context. Only the fields the debate strategy reads need to be
// present (baseSourceRefs / contextPacket); the stub bypasses the heavy projection validation.
const SHARED_CONTEXT = {
  frozenPayload: {
    n7_handoff_hash: 'a'.repeat(64),
    topic_question_ref: ref('topic_question', 'topic_question_001'),
    topic_question_contract_ref: ref('topic_question_contract', 'topic_question_contract_001'),
    answerability_plan_ref: ref('answerability_plan', 'answerability_plan_001'),
    trial_ledger_ref: ref('trial_ledger', 'trial_ledger_001'),
    topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
    active_candidate_ref: ref('topic_question_candidate', 'active_candidate_001'),
    selected_research_slice_ref: ref('selected_research_slice', 'research_slice_001'),
    n8_debate_admission_ref: ref('n8_debate_admission', 'n8_debate_admission_001'),
    candidate_grouping_ref: ref('candidate_grouping', 'candidate_grouping_001'),
  },
  projection: {
    ref: ref('n7_to_n8_projection', 'n7_to_n8_projection_001'),
    hash: 'b'.repeat(64),
    payload: {
      source_refs: [ref('projection_source', 'projection_source_001')],
      support_refs: [ref('projection_support', 'projection_support_001')],
      n7_handoff_ref: ref('n7_handoff', 'n7_handoff_001'),
    },
  },
  decisionMemory: null,
  sourceHashes: {
    frozen_input_hash: 'c'.repeat(64),
    n7_to_n8_projection_hash: 'b'.repeat(64),
    decision_memory_packet_hash: 'd'.repeat(64),
  },
  requiredStructureManifest: {
    schema_version: 'TopicSelectionV1bN8RequiredStructureManifest@v1',
    required_context_kinds: ['frozen_input_payload', 'n7_to_n8_projection'],
  },
};

type BridgeCall = {
  execution_mode: string;
  run_mode: string | null;
  codex_output: Record<string, unknown> | null;
  mocked_output: Record<string, unknown> | null;
};

// Stub single-agent runtime: reuse seam for the (already-tested) N7→N8 resolution + gate bridge.
function makeStubSingleAgent(): {
  runtime: TopicSelectionV1bN8ValueAssessmentRuntimeService;
  sharedContextCalls: number;
  gateBridgeDrafts: Record<string, unknown>[];
  bridgeCalls: BridgeCall[];
} {
  const state = {
    sharedContextCalls: 0,
    gateBridgeDrafts: [] as Record<string, unknown>[],
    bridgeCalls: [] as BridgeCall[],
  };
  const stub = {
    async resolveSharedN8RuntimeContext() {
      state.sharedContextCalls += 1;
      // Return a fresh structural clone so the runtime cannot mutate the shared fixture across runs.
      return JSON.parse(JSON.stringify(SHARED_CONTEXT));
    },
    async generateDraftArtifact(input: {
      execution_mode?: string;
      run_mode?: string | null;
      codex_response?: { output?: Record<string, unknown> } | null;
      mocked_output?: { output?: Record<string, unknown> } | null;
    }) {
      const output = input.codex_response?.output ?? input.mocked_output?.output ?? {};
      state.gateBridgeDrafts.push(output);
      state.bridgeCalls.push({
        execution_mode: input.execution_mode ?? '',
        run_mode: input.run_mode ?? null,
        codex_output: input.codex_response?.output ?? null,
        mocked_output: input.mocked_output?.output ?? null,
      });
      return {
        status: 'succeeded',
        semantic_artifact: { kind: 'stub' },
        structured_output: output,
        invocation_result: { status: 'succeeded' },
        context_packet_ref: ref('diagnostic', 'stub_context_packet'),
        context_packet_hash: 'e'.repeat(64),
      };
    },
  } as unknown as TopicSelectionV1bN8ValueAssessmentRuntimeService;
  return {
    runtime: stub,
    get sharedContextCalls() { return state.sharedContextCalls; },
    get gateBridgeDrafts() { return state.gateBridgeDrafts; },
    get bridgeCalls() { return state.bridgeCalls; },
  } as never;
}

function makeSubject() {
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
    now: () => '2026-06-14T00:00:00.000Z',
  });
  const stub = makeStubSingleAgent();
  const runtime = new TopicSelectionV1bN8BoundedDebateRuntimeService(controlPlane, {
    singleAgentRuntime: stub.runtime,
  });
  return { runtime, stub };
}

function makeRequest(suffix = '001'): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: `workflow_run_n8_debate_${suffix}`,
    node_attempt_id: `node_attempt_n8_debate_${suffix}`,
    node_id: N8_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN7ToN8Handoff@v1',
      snapshot_kind: 'n8_frozen_input',
      source_refs: [ref('frozen_input_source', 'frozen_input_source_001')],
      payload: { kind: 'stub_frozen_input' },
    },
  };
}

const ASSESSMENT_DRAFT = {
  schema_version: 'TopicValueAssessmentDraft@v1',
  total_score: 70,
  confidence: 0.7,
  assessment_summary: 'Bounded value assessment draft preserves dimension coverage and source refs.',
  dimension_scores: [
    { dimension_key: 'novelty', score: 18 },
    { dimension_key: 'feasibility', score: 16 },
  ],
};

// Mocked role outputs for the 4-role chain. The synthesizer carries the assessment_draft the gate
// bridge funnels; the critic raises one material finding the repair resolves (so admission passes).
function roleOutput(
  slot: TopicSelectionV1bN8BoundedDebateRoleSlotId,
  options: { unresolvedFinding?: boolean } = {},
): Record<string, unknown> {
  const base = { schema_version: OUTPUT_CONTRACT, role_slot: slot };
  if (slot === 'n8_debate_assessor_draft') {
    return { ...base, assessment_draft: ASSESSMENT_DRAFT };
  }
  if (slot === 'n8_debate_value_critic') {
    return {
      ...base,
      critic_findings: [
        { finding_code: 'CF1', severity: 'material', dimension_key: 'novelty', statement: 'Novelty score needs a tighter evidence link.' },
        { finding_code: 'CF2', severity: 'note', statement: 'Consider noting the comparison baseline.' },
      ],
    };
  }
  if (slot === 'n8_debate_assessor_repair') {
    return {
      ...base,
      repair_actions: [
        { finding_code: 'CF1', action: 'Linked the novelty score to the selected research slice.', resolved: !options.unresolvedFinding },
      ],
    };
  }
  return { ...base, assessment_draft: ASSESSMENT_DRAFT, debate_summary: 'Synthesis preserves dimension coverage and resolves the material finding.' };
}

function debateInput(
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
  options: { unresolvedFinding?: boolean; executionMode?: 'mocked_llm' | 'codex_assisted' } = {},
): GenerateTopicSelectionV1bN8DebateInput {
  const executionMode = options.executionMode ?? 'mocked_llm';
  const role_outputs: GenerateTopicSelectionV1bN8DebateInput['role_outputs'] = {};
  for (const slot of TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER) {
    const output = roleOutput(slot, options);
    role_outputs[slot] = executionMode === 'codex_assisted'
      ? { codex_response: { output: output as never, operator_label: 'unit-test' }, mocked_output: null }
      : { codex_response: null, mocked_output: { fixture_id: `n8_debate_${slot}`, output: output as never } };
  }
  return {
    request,
    execution_mode: executionMode,
    // codex_assisted role invocations require an acceptance/product run mode on the model profile;
    // mocked_llm uses the request's 'test' mode.
    run_mode: executionMode === 'codex_assisted' ? 'acceptance' : null,
    role_outputs,
  };
}

test('v1b N8 bounded debate runtime drives the 4-role loop, admits, and bridges the gate draft', async () => {
  const { runtime, stub } = makeSubject();
  const request = makeRequest();

  const result = await runtime.runDebate(debateInput(request));

  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') {
    throw new Error('Expected the debate to complete.');
  }

  // 4 distinct roles, in canonical order, each runtime-verified and chained.
  const identity = result.admission.admission_identity;
  assert.deepEqual(Object.keys(identity.role_artifact_hashes), [...TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER]);
  assert.equal(identity.final_slot_id, 'n8_debate_synthesizer_final');
  assert.equal(identity.loop_transcript_hash, result.loop_transcript_hash);
  assert.match(result.loop_transcript_hash, /^[a-f0-9]{64}$/);
  assert.match(result.admission.admission_identity_hash, /^[a-f0-9]{64}$/);

  // The admitted assessment_draft is the synthesizer's draft, and the gate bridge ran on it once.
  assert.equal((result.admission.assessment_draft as { total_score?: number }).total_score, 70);
  assert.equal((stub as unknown as { gateBridgeDrafts: unknown[] }).gateBridgeDrafts.length, 1);
  assert.deepEqual((stub as unknown as { gateBridgeDrafts: Record<string, unknown>[] }).gateBridgeDrafts[0], ASSESSMENT_DRAFT);
  assert.equal(result.gate_draft.status, 'succeeded');
  // The bridge funnels through the single-agent path with the debate's REAL execution mode: a
  // mocked_llm debate bridges as mocked_output (not codex_response).
  const mockedBridge = (stub as unknown as { bridgeCalls: BridgeCall[] }).bridgeCalls;
  assert.equal(mockedBridge.length, 1);
  assert.equal(mockedBridge[0]!.execution_mode, 'mocked_llm');
  assert.deepEqual(mockedBridge[0]!.mocked_output, ASSESSMENT_DRAFT);
  assert.equal(mockedBridge[0]!.codex_output, null);

  // The expensive N7→N8 resolution runs exactly ONCE per debate (resolved then threaded as handoff).
  assert.equal((stub as unknown as { sharedContextCalls: number }).sharedContextCalls, 1);
});

test('v1b N8 bounded debate runtime: a concrete provider_diverse plan is DORMANT (replay-safe) for a codex debate (W-09 S4)', async () => {
  // T-127 W-09 S4 — fills the S1 "concrete per-role overrides are exercised in S4" obligation with the
  // HONEST result. N8 debates run codex_assisted | mocked_llm ONLY; the model-profile registry resolves a
  // model_option_id to a provider option ONLY for execution_mode 'provider_llm' (resolveProfile L1298-1300),
  // so for a codex debate the per-role option is dropped to null at profile resolution. The named plan is
  // therefore COMPLETELY DORMANT for codex|mocked debates: it is selectable + injectable but produces ZERO
  // observable effect (prompt-packet hashes, loop transcript, AND the artifact's resolved model_option_id
  // are all identical to a no-plan run). It activates only under provider_llm debate execution — OUT of W-09
  // scope. This test pins replay-safety: a provider_diverse plan can never silently perturb codex identity.
  const { selectN8DebateExecutionPlan } = await import('./topic-selection-debate-execution-plan-registry-service.js');
  const request = makeRequest();
  const codexInput = () => debateInput(request, { executionMode: 'codex_assisted' });

  const noPlan = await makeSubject().runtime.runDebate(codexInput());
  const compact = await makeSubject().runtime.runDebate({ ...codexInput(), execution_plan: selectN8DebateExecutionPlan('provider_compact') });
  const diverse = await makeSubject().runtime.runDebate({ ...codexInput(), execution_plan: selectN8DebateExecutionPlan('provider_diverse') });

  assert.equal(noPlan.status, 'completed');
  assert.equal(compact.status, 'completed');
  assert.equal(diverse.status, 'completed');
  if (noPlan.status !== 'completed' || compact.status !== 'completed' || diverse.status !== 'completed') return;

  for (const planned of [compact, diverse]) {
    // Dormant: the id-independent identity components reproduce the no-plan codex run byte-for-byte.
    assert.equal(planned.loop_transcript_hash, noPlan.loop_transcript_hash);
    assert.deepEqual(
      planned.admission.admission_identity.role_prompt_packet_hashes,
      noPlan.admission.admission_identity.role_prompt_packet_hashes,
    );
    assert.deepEqual(
      planned.admission.admission_identity.role_artifact_hashes,
      noPlan.admission.admission_identity.role_artifact_hashes,
    );
    // The resolved provenance option is null for a codex debate regardless of the plan (dropped at the
    // model profile — the plan does NOT select a live provider here).
    assert.equal(planned.admission.final_artifact.model_option_id, null);
    assert.equal(planned.admission.final_artifact.model_option_id, noPlan.admission.final_artifact.model_option_id);
  }
});

test('v1b N8 bounded debate runtime: a W-09 execution_plan with no per-role override is byte-identical (no-plan === empty-plan)', async () => {
  // T-127 W-09: the execution_plan threads additively; a plan that supplies no per-role model_option_id
  // resolves to null -> the base ctx.modelOptionId (null), so the loop transcript + admission identity
  // are byte-identical to a run with no plan at all. (Concrete per-role overrides are exercised in S4.)
  const request = makeRequest();
  const noPlan = await makeSubject().runtime.runDebate(debateInput(request));
  const emptyPlan = await makeSubject().runtime.runDebate({
    ...debateInput(request),
    execution_plan: { name: 'codex_assisted' },
  });
  assert.equal(noPlan.status, 'completed');
  assert.equal(emptyPlan.status, 'completed');
  if (noPlan.status !== 'completed' || emptyPlan.status !== 'completed') return;
  // Compare the id-INDEPENDENT identity components (as the replay test does — the top-level
  // admission_identity_hash folds idFactory-bearing refs). An empty plan leaves them byte-identical.
  assert.equal(emptyPlan.loop_transcript_hash, noPlan.loop_transcript_hash);
  assert.deepEqual(
    emptyPlan.admission.admission_identity.role_prompt_packet_hashes,
    noPlan.admission.admission_identity.role_prompt_packet_hashes,
  );
  assert.deepEqual(
    emptyPlan.admission.admission_identity.role_artifact_hashes,
    noPlan.admission.admission_identity.role_artifact_hashes,
  );
});

test('v1b N8 bounded debate runtime bridges a codex_assisted debate as codex_response (not a mock fixture)', async () => {
  const { runtime, stub } = makeSubject();
  const result = await runtime.runDebate(debateInput(makeRequest(), { executionMode: 'codex_assisted' }));
  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') {
    throw new Error('Expected the codex_assisted debate to complete.');
  }
  // The gate bridge must thread the REAL execution_mode so the gate-facing draft carries
  // codex provenance — not silently re-record it as a mock fixture (the previous hardcoded bug).
  const bridgeCalls = (stub as unknown as { bridgeCalls: BridgeCall[] }).bridgeCalls;
  assert.equal(bridgeCalls.length, 1);
  assert.equal(bridgeCalls[0]!.execution_mode, 'codex_assisted');
  assert.deepEqual(bridgeCalls[0]!.codex_output, ASSESSMENT_DRAFT);
  assert.equal(bridgeCalls[0]!.mocked_output, null);
});

test('v1b N8 bounded debate runtime is byte-stable across runs with identical fixed ids', async () => {
  const first = await makeSubject().runtime.runDebate(debateInput(makeRequest()));
  const second = await makeSubject().runtime.runDebate(debateInput(makeRequest()));
  assert.equal(first.status, 'completed');
  assert.equal(second.status, 'completed');
  if (first.status !== 'completed' || second.status !== 'completed') {
    throw new Error('Expected both runs to complete.');
  }
  // role artifact hashes + prompt packet hashes + loop transcript are independent of the
  // incrementing control-plane ref ids, so a fresh control plane reproduces them byte-for-byte.
  assert.equal(first.loop_transcript_hash, second.loop_transcript_hash);
  assert.deepEqual(
    first.admission.admission_identity.role_artifact_hashes,
    second.admission.admission_identity.role_artifact_hashes,
  );
  assert.deepEqual(
    first.admission.admission_identity.role_prompt_packet_hashes,
    second.admission.admission_identity.role_prompt_packet_hashes,
  );
});

test('v1b N8 bounded debate runtime blocks admission when a material critic finding is unresolved', async () => {
  const { runtime } = makeSubject();
  const result = await runtime.runDebate(debateInput(makeRequest(), { unresolvedFinding: true }));
  assert.equal(result.status, 'admission_blocked');
  if (result.status !== 'admission_blocked') {
    throw new Error('Expected the debate admission to be blocked.');
  }
  assert.equal(result.admission.admitted, false);
  if (result.admission.admitted) {
    throw new Error('Expected admission to be blocked.');
  }
  assert.equal(result.admission.blocker.code, 'N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED');
});
