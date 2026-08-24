// T-127 Phase 1 / W-05 — co-located unit test for the v1b N8 topic-value-assessment
// single-agent runtime service.
//
// Scope: drive the REAL generateDraftArtifact path through the real agent orchestrator,
// prompt-packet runtime, context/model profile registries, and an in-memory control plane.
// The expensive upstream N7 chain is NOT replayed — instead a single, internally-consistent
// N7->N8 runtime-context projection (mirroring the harness builder) is recorded in the control
// plane and frozen into the request's source_refs, so the heavy projection / source-hash /
// required-structure validation runs for real against a known-good fixture. The codex_assisted
// draft uses the same known-good TopicValueAssessmentDraft@v1 fixture the harness test uses.
//
// HAPPY PATH: codex_assisted draft succeeds -> non-authority model_draft_for_gate semantic
// artifact (runtime_verified) carrying the real structured output.
// NEGATIVE 1: a malformed frozen N8 payload (missing required hash) is rejected by the
// frozen-payload guard with INVALID_PAYLOAD.
// NEGATIVE 2: two N7->N8 projection artifacts in the source refs trip the "exactly one
// projection" invariant with INVALID_PAYLOAD.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import {
  TOPIC_SELECTION_VALUE_DIMENSIONS,
  TOPIC_SELECTION_VALUE_GATE_KEYS,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { sha256Text } from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionV1bN8ValueAssessmentRuntimeService,
  buildV1bN8ValueAssessmentSystemContent,
} from './topic-selection-v1b-n8-value-assessment-runtime-service.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;
const TITLE_CARD_ID = 'title_card_001';
const WORKSPACE_ID = 'workspace_001';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: TITLE_CARD_ID, version_id: null };
}

// Distinct deterministic 64-hex hashes so the projection / frozen-payload / source-hash maps
// can be wired to be mutually consistent (the runtime byte-matches them against each other).
function hex(seed: string): string {
  let value = 0;
  for (const char of seed) {
    value = (value * 31 + char.charCodeAt(0)) >>> 0;
  }
  const base = value.toString(16).padStart(8, '0');
  return base.repeat(8).slice(0, 64);
}

function makeControlPlane(): TopicSelectionControlPlaneService {
  return new TopicSelectionControlPlaneService(new InMemoryTopicSelectionControlPlaneRepository(), {
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
}

// Refs shared between the frozen N8 payload and the N7->N8 projection. Identity must match
// exactly (the runtime cross-checks ref objects), so both consume this single map.
const FROZEN_REFS = {
  topic_question_ref: ref('topic_question', 'topic_question_001'),
  topic_question_contract_ref: ref('topic_question_contract', 'topic_question_contract_001'),
  answerability_plan_ref: ref('answerability_plan', 'answerability_plan_001'),
  trial_ledger_ref: ref('trial_ledger', 'trial_ledger_001'),
  topic_question_candidate_set_ref: ref('topic_question_candidate_set', 'candidate_set_001'),
  active_candidate_ref: ref('topic_question_candidate', 'active_candidate_001'),
  selected_research_slice_ref: ref('selected_research_slice', 'research_slice_001'),
  n8_debate_admission_ref: ref('n8_debate_admission', 'n8_debate_admission_001'),
} as const;

const N7_HANDOFF_REF = ref('n7_handoff', 'n7_handoff_001');

const FROZEN_HASHES = {
  n7_handoff_hash: hex('n7_handoff'),
  topic_question_hash: hex('topic_question'),
  topic_question_contract_hash: hex('topic_question_contract'),
  answerability_plan_hash: hex('answerability_plan'),
  trial_ledger_hash: hex('trial_ledger'),
  topic_question_candidate_set_hash: hex('candidate_set'),
  active_candidate_hash: hex('active_candidate'),
  selected_research_slice_hash: hex('research_slice'),
  n8_debate_admission_hash: hex('n8_debate_admission'),
} as const;

function frozenPayload(): TopicSelectionV1bN8HarnessFrozenInputPayload {
  return {
    n7_handoff_hash: FROZEN_HASHES.n7_handoff_hash,
    topic_question_ref: FROZEN_REFS.topic_question_ref,
    topic_question_hash: FROZEN_HASHES.topic_question_hash,
    topic_question_contract_ref: FROZEN_REFS.topic_question_contract_ref,
    topic_question_contract_hash: FROZEN_HASHES.topic_question_contract_hash,
    answerability_plan_ref: FROZEN_REFS.answerability_plan_ref,
    answerability_plan_hash: FROZEN_HASHES.answerability_plan_hash,
    trial_ledger_ref: FROZEN_REFS.trial_ledger_ref,
    trial_ledger_hash: FROZEN_HASHES.trial_ledger_hash,
    topic_question_candidate_set_ref: FROZEN_REFS.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: FROZEN_HASHES.topic_question_candidate_set_hash,
    active_candidate_ref: FROZEN_REFS.active_candidate_ref,
    active_candidate_hash: FROZEN_HASHES.active_candidate_hash,
    selected_research_slice_ref: FROZEN_REFS.selected_research_slice_ref,
    selected_research_slice_hash: FROZEN_HASHES.selected_research_slice_hash,
    n8_debate_admission_ref: FROZEN_REFS.n8_debate_admission_ref,
    n8_debate_admission_hash: FROZEN_HASHES.n8_debate_admission_hash,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
  };
}

// Mirrors TopicSelectionV1bWorkflowHarnessService.buildN7ToN8TopicQuestionContractContextProjection
// closely enough to pass the runtime's assertN7ToN8ProjectionPolicy: non-authority invoke-next,
// every frozen hash/ref preserved, an exact source-hash key set, every required ref present in
// source_refs, and the required preserved_fact_kinds retained.
function projectionPayload(
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
): TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection {
  const payload = frozenPayload();
  return {
    schema_version: TOPIC_SELECTION_V1B_N7_RUNTIME_CONTEXT_PROJECTION_SCHEMA_VERSION,
    projection_kind: 'v1b_n7_to_n8_topic_question_contract_context',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    workflow_run_id: request.workflow_run_id,
    node_attempt_id: request.node_attempt_id,
    route_decision: 'invoke_next',
    non_authority: true,
    context_cache_scope: 'process_local_runtime_only',
    context_authority: 'non_authority_runtime_context',
    source_refs: [
      N7_HANDOFF_REF,
      payload.topic_question_ref,
      payload.topic_question_contract_ref,
      payload.answerability_plan_ref,
      payload.trial_ledger_ref,
      payload.topic_question_candidate_set_ref,
      payload.active_candidate_ref,
      payload.selected_research_slice_ref,
      payload.n8_debate_admission_ref,
    ],
    source_hashes: {
      frozen_input_hash: hex('frozen_input'),
      n6_handoff_hash: hex('n6_handoff'),
      n7_handoff_hash: payload.n7_handoff_hash,
      topic_question_hash: payload.topic_question_hash,
      topic_question_contract_hash: payload.topic_question_contract_hash,
      answerability_plan_hash: payload.answerability_plan_hash,
      trial_ledger_hash: payload.trial_ledger_hash,
      topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
      active_candidate_hash: payload.active_candidate_hash,
      selected_research_slice_hash: payload.selected_research_slice_hash,
      n8_debate_admission_hash: payload.n8_debate_admission_hash,
    },
    support_refs: [],
    support_hashes: {},
    preserved_fact_kinds: [
      'topic_question_contract',
      'answerability_plan',
      'active_candidate_identity',
      'candidate_set_identity',
      'trial_ledger',
      'n8_debate_admission',
      'accepted_risk_refs',
      'risk_gap_recheck_hints',
    ],
    n7_handoff_ref: N7_HANDOFF_REF,
    n7_handoff_hash: payload.n7_handoff_hash,
    topic_question_ref: payload.topic_question_ref,
    topic_question_hash: payload.topic_question_hash,
    topic_question_contract_ref: payload.topic_question_contract_ref,
    topic_question_contract_hash: payload.topic_question_contract_hash,
    answerability_plan_ref: payload.answerability_plan_ref,
    answerability_plan_hash: payload.answerability_plan_hash,
    trial_ledger_ref: payload.trial_ledger_ref,
    trial_ledger_hash: payload.trial_ledger_hash,
    topic_question_candidate_set_ref: payload.topic_question_candidate_set_ref,
    topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
    active_candidate_ref: payload.active_candidate_ref,
    active_candidate_hash: payload.active_candidate_hash,
    selected_research_slice_ref: payload.selected_research_slice_ref,
    selected_research_slice_hash: payload.selected_research_slice_hash,
    n8_debate_admission_ref: payload.n8_debate_admission_ref,
    n8_debate_admission_hash: payload.n8_debate_admission_hash,
    candidate_grouping_ref: null,
    candidate_grouping_hash: null,
  };
}

// Known-good TopicValueAssessmentDraft@v1 (every gate key + every dimension key present) — the
// orchestrator validates this against the real draft schema before it can succeed.
function valueDraft(
  overrides: Partial<TopicSelectionV1bTopicValueAssessmentDraftPayload> = {},
): TopicSelectionV1bTopicValueAssessmentDraftPayload {
  const evidenceRef = FROZEN_REFS.topic_question_contract_ref;
  const hardGates = TOPIC_SELECTION_VALUE_GATE_KEYS.map((gateKey) => ({
    gate_key: gateKey,
    verdict: 'pass' as const,
    severity: 'info' as const,
    overridable_with_risk: false,
    rationale: `${gateKey} passes in the deterministic value fixture.`,
    refs: [evidenceRef],
  }));
  const dimensionScores = TOPIC_SELECTION_VALUE_DIMENSIONS.map((dimensionKey) => ({
    dimension_key: dimensionKey,
    score: dimensionKey === 'reviewer_risk' ? 72 : 84,
    rationale: `${dimensionKey} is sufficiently supported for the fixture.`,
    evidence_refs: [evidenceRef],
    uncertainty: 'medium',
  }));
  return {
    readiness_status: 'ready',
    strongest_claim_if_success: 'A harness-native topic-selection flow preserves replayable authority boundaries.',
    fallback_claim_if_success: 'Harness-level acceptance exposes route-only smoke gaps.',
    hard_gates: hardGates,
    dimension_scores: dimensionScores,
    risk_penalty: { residual_risk: 'bounded' },
    reviewer_objections: ['Provider canary behavior is outside this fixture run.'],
    ceiling_case: 'The topic can support a bounded workflow claim with deterministic trace evidence.',
    base_case: 'The topic supports harness-native acceptance and replay validation.',
    floor_case: 'The topic still yields useful negative gate coverage.',
    recommended_disposition: 'advance_to_package',
    total_score: 83,
    value_summary: 'The active TopicQuestionContract has enough value and answerability for draft packaging.',
    confidence: 0.82,
    accepted_risk_refs: [],
    blocker_refs: [],
    risk_notes: ['Provider canary and output quality review remain downstream checks.'],
    reasoning_memo: {
      recommendation: 'advance_to_package',
      value_thesis: 'Harness-native v1b topic selection is valuable because it closes automation, replay, and authority boundaries.',
      significance: 'It turns route-testable workflow fragments into a product-level repeatable process.',
      originality: 'The contribution is a deterministic gate and handoff workflow around LLM-assisted semantic drafts.',
      claim_leverage: 'The claim remains bounded to workflow robustness and replay evidence.',
      reviewer_risks: ['The implementation needs downstream provider canary validation.'],
      effort_to_value: 'The fixture chain gives high value for moderate implementation effort.',
      strategic_fit: 'It aligns with reviewer-aligned paper engineering workflows.',
      negative_memory_check: 'No prior negative memory blocks this topic.',
      evidence_backed_rationale: 'The N7 contract and candidate lineage provide frozen trace evidence.',
      top_objections: ['The fixture does not prove live provider quality.'],
      uncertainty: 'Medium uncertainty until provider canary is added.',
      disposition_bridge: 'Advance to package with residual risks carried into v1c.',
      requires_critic_review: false,
      critic_triggers: [],
      cited_refs: [evidenceRef],
    },
    ...overrides,
  };
}

function makeRequest(
  overrides: {
    extraSourceRefs?: TopicSelectionFunctionalRef[];
    payload?: Record<string, unknown>;
    projectionRef?: TopicSelectionFunctionalRef | null;
  } = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const sourceRefs: TopicSelectionFunctionalRef[] = [
    ref('frozen_input_source', 'frozen_input_source_001'),
    // The N7->N8 projection's required lineage refs must be frozen into the N8 input source refs
    // (assertN7ToN8ProjectionPolicy cross-checks this), so the request carries them too.
    N7_HANDOFF_REF,
    ...Object.values(FROZEN_REFS),
    ...(overrides.projectionRef ? [overrides.projectionRef] : []),
    ...(overrides.extraSourceRefs ?? []),
  ];
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: WORKSPACE_ID,
    title_card_id: TITLE_CARD_ID,
    workflow_run_id: 'workflow_run_n8_value_001',
    node_attempt_id: 'node_attempt_n8_value_001',
    node_id: N8_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'acceptance',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN7ToN8Handoff@v1',
      snapshot_kind: 'n8_frozen_input',
      source_refs: sourceRefs,
      payload: overrides.payload ?? (frozenPayload() as unknown as Record<string, unknown>),
    },
  } as unknown as TopicSelectionV1bWorkflowHarnessRunRequest;
}

async function recordProjectionRef(
  controlPlane: TopicSelectionControlPlaneService,
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
): Promise<TopicSelectionFunctionalRef> {
  // No explicit checksum: the control plane auto-computes sha256(stableStringify(payload)),
  // which is exactly the hash the runtime re-derives and byte-matches against.
  const artifact = await controlPlane.recordArtifactRef({
    workspace_id: WORKSPACE_ID,
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: request.workflow_run_id,
    payload: projectionPayload(request) as unknown as Record<string, unknown>,
    created_by: 'system',
  });
  return { ref_type: 'artifact_ref', ref_id: artifact.artifact_ref_id, title_card_id: TITLE_CARD_ID, version_id: null };
}

const N8_VALUE_ASSESSMENT_SYSTEM_BODY_GOLDEN = {
  without_decision_memory: 'a64b22f2f0dac6e0724ab38ff67612e4961ea5ce68e1f748f4ad221c0e408eda',
  with_decision_memory: '00babb8cfb2bed6c2ddaa5f65fec44c48fa27837a430d95aaebbd53f8ed8e72f',
} as const;

const N8_VALUE_ASSESSMENT_DECISION_MEMORY_CLAUSE =
  "context_packet.decision_memory lists this title card's historical negative decisions (rejections, parks, drops, accepted risks); ground the negative_memory_check dimension and reviewer-risk reasoning in these entries and cite conflicts in risk_notes.";

test('v1b N8 value-assessment system prompt is byte-stable for both decision-memory branches', () => {
  const withoutMemory = buildV1bN8ValueAssessmentSystemContent(false);
  const withMemory = buildV1bN8ValueAssessmentSystemContent(true);

  assert.equal(
    sha256Text(withoutMemory),
    N8_VALUE_ASSESSMENT_SYSTEM_BODY_GOLDEN.without_decision_memory,
  );
  assert.equal(
    sha256Text(withMemory),
    N8_VALUE_ASSESSMENT_SYSTEM_BODY_GOLDEN.with_decision_memory,
  );
  assert.equal(
    withMemory.slice(withoutMemory.length),
    ' ' + N8_VALUE_ASSESSMENT_DECISION_MEMORY_CLAUSE,
  );
});

test('v1b N8 value runtime generates a non-authority model_draft_for_gate from a codex_assisted draft', async () => {
  const controlPlane = makeControlPlane();
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane);
  const baseRequest = makeRequest();
  const projectionRef = await recordProjectionRef(controlPlane, baseRequest);
  const request = makeRequest({ projectionRef });

  const result = await runtime.generateDraftArtifact({
    request,
    execution_mode: 'codex_assisted',
    run_mode: 'acceptance',
    codex_response: {
      output: valueDraft(),
      operator_label: 'unit-test-runtime',
    },
    created_by: 'system',
  });

  assert.equal(result.status, 'succeeded');
  if (result.status !== 'succeeded') {
    throw new Error('Expected the N8 value runtime draft to succeed.');
  }

  // The model output is a non-authority draft handed to the deterministic gate (never authority).
  assert.equal(result.semantic_artifact.slot_id, 'n8_value_assessment_draft');
  assert.equal(result.semantic_artifact.node_id, N8_NODE_ID);
  assert.equal(result.semantic_artifact.allowed_effect, 'model_draft_for_gate');
  assert.equal(result.semantic_artifact.runtime_provenance_class, 'runtime_verified');
  assert.equal(result.semantic_artifact.output_contract, 'TopicValueAssessmentDraft@v1');
  assert.equal(result.semantic_artifact.prompt_variant_key, 'n8_value_assessment_draft.initial_from_n7');

  // The real structured output is threaded back unchanged, and its hash is wired consistently.
  assert.equal(result.structured_output.recommended_disposition, 'advance_to_package');
  assert.equal(result.structured_output.readiness_status, 'ready');
  assert.equal(result.structured_output.total_score, 83);
  assert.equal(result.semantic_artifact.structured_output_hash, result.semantic_artifact.support_artifact_hash);
  assert.match(result.semantic_artifact.structured_output_hash, /^[a-f0-9]{64}$/);

  // The recorded context packet is non-authority and hash-stamped.
  assert.equal(result.context_packet_ref.ref_type, 'artifact_ref');
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.invocation_result.status, 'succeeded');
});

test('v1b N8 value runtime rejects a malformed frozen N8 payload', async () => {
  const controlPlane = makeControlPlane();
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane);

  // Drop a required hash from the frozen payload — the frozen-payload guard must reject before
  // any projection resolution.
  const malformedPayload = frozenPayload() as unknown as Record<string, unknown>;
  delete malformedPayload.n7_handoff_hash;
  const request = makeRequest({ payload: malformedPayload });

  await assert.rejects(
    () => runtime.generateDraftArtifact({
      request,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: { output: valueDraft(), operator_label: 'unit-test-runtime' },
      created_by: 'system',
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /frozen N7-to-N8 handoff payload/);
      return true;
    },
  );
});

test('v1b N8 value runtime rejects more than one N7-to-N8 projection in the frozen source refs', async () => {
  const controlPlane = makeControlPlane();
  const runtime = new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane);
  const baseRequest = makeRequest();
  const firstProjectionRef = await recordProjectionRef(controlPlane, baseRequest);
  const secondProjectionRef = await recordProjectionRef(controlPlane, baseRequest);
  const request = makeRequest({
    projectionRef: firstProjectionRef,
    extraSourceRefs: [secondProjectionRef],
  });

  await assert.rejects(
    () => runtime.generateDraftArtifact({
      request,
      execution_mode: 'codex_assisted',
      run_mode: 'acceptance',
      codex_response: { output: valueDraft(), operator_label: 'unit-test-runtime' },
      created_by: 'system',
    }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /accepts exactly one N7-to-N8/);
      return true;
    },
  );
});
