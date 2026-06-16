// T-127 Phase 1 / W-05 — runtime verification for the v1b N6 topic-question candidate-set
// draft runtime service.
//
// Scope: TopicSelectionV1bN6DraftRuntimeService.generateDraftArtifact driven through the REAL
// agent orchestrator, prompt-packet runtime, registries, and an in-memory control plane. A
// mocked_llm fixture supplies the candidate-set draft so the run is deterministic (no network,
// no real LLM); the orchestrator still schema-validates the draft, records the context-packet +
// structured-output artifacts, and the service re-derives the runtime-verified semantic support
// artifact (allowed_effect / provenance class / output contract / source hashes). The negative
// case drives the frozen-payload invariant guard (assertN6FrozenPayload) and asserts the thrown
// AppError code, which the service owns deterministically without any LLM call.

import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionV1bN6DraftRuntimeService,
  type GenerateTopicSelectionV1bN6RuntimeDraftInput,
} from './topic-selection-v1b-n6-draft-runtime-service.js';

const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const TITLE_CARD_ID = 'title_card_001';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: TITLE_CARD_ID, version_id: null };
}

const hash = (seed: string): string => seed.repeat(64).slice(0, 64);

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
    now: () => '2026-06-16T00:00:00.000Z',
  });
  const runtime = new TopicSelectionV1bN6DraftRuntimeService(controlPlane);
  return { controlPlane, runtime };
}

function frozenPayload(): TopicSelectionV1bN6HarnessFrozenInputPayload {
  return {
    n5_handoff_hash: hash('a'),
    constraint_profile_ref: ref('research_constraint_profile', 'constraint_profile_001'),
    constraint_profile_hash: hash('b'),
    intake_readiness_ref: ref('readiness_assessment', 'intake_readiness_001'),
    intake_readiness_hash: hash('c'),
    research_slice_ref: ref('research_slice', 'research_slice_001'),
    research_slice_hash: hash('d'),
    research_slice_selection_ref: ref('research_slice_selection_decision', 'slice_selection_001'),
    research_slice_selection_hash: hash('e'),
    research_slice_option_set_ref: ref('research_slice_option_set', 'option_set_001'),
    research_slice_option_set_hash: hash('f'),
    selected_slice_option_ref: ref('research_slice_option', 'slice_option_001'),
    selected_slice_option_hash: hash('1'),
  };
}

function makeRequest(
  overrides: Partial<TopicSelectionV1bWorkflowHarnessRunRequest> = {},
): TopicSelectionV1bWorkflowHarnessRunRequest {
  const payload = frozenPayload();
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    workflow_run_id: 'workflow_run_v1b_n6_draft_001',
    node_attempt_id: 'node_attempt_v1b_n6_draft_001',
    node_id: N6_NODE_ID,
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'N5ToN6Handoff@v1',
      snapshot_kind: 'research_slice_selection_decision',
      source_refs: [
        ref('research_slice_selection_decision', 'slice_selection_001'),
        payload.research_slice_ref,
        payload.research_slice_selection_ref,
        payload.research_slice_option_set_ref,
        payload.selected_slice_option_ref,
        payload.constraint_profile_ref,
        payload.intake_readiness_ref,
      ],
      payload: payload as unknown as Record<string, unknown>,
    },
    ...overrides,
  };
}

const EVIDENCE_REF = ref('evidence_unit', 'evidence_unit_001');
const INCLUDED_BOUNDARY_REF = ref('research_slice_boundary', 'boundary_included_001');
const EXCLUDED_BOUNDARY_REF = ref('research_slice_boundary', 'boundary_excluded_001');
const NEED_REF = ref('validated_need', 'validated_need_001');

// A schema-valid TopicQuestionCandidateSetDraft@v1 the orchestrator can validate and the service
// can record. Mirrors the harness fixture but with literal refs so the test needs no DB seeding.
function candidateSetDraft(
  overrides: Partial<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> = {},
): TopicSelectionV1bTopicQuestionCandidateSetDraftPayload {
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
            trigger_source_refs: [ref('research_slice', 'research_slice_001')],
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
    ...overrides,
  };
}

function draftInput(
  request: TopicSelectionV1bWorkflowHarnessRunRequest,
  draft: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
): GenerateTopicSelectionV1bN6RuntimeDraftInput {
  return {
    request,
    generation_mode: 'initial_from_n5',
    execution_mode: 'mocked_llm',
    run_mode: 'test',
    mocked_output: {
      fixture_id: 'fixture_n6_question_candidate_draft_001',
      output: draft,
    },
    created_by: 'system',
  };
}

test('v1b N6 draft runtime generates a runtime-verified candidate-set draft from a mocked invocation', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest();
  const draft = candidateSetDraft();

  const result = await runtime.generateDraftArtifact(draftInput(request, draft));

  assert.equal(result.status, 'succeeded');
  if (result.status !== 'succeeded') {
    throw new Error('Expected N6 runtime draft generation to succeed.');
  }

  // The orchestrator validated + threaded the SAME structured draft the fixture supplied.
  assert.deepEqual(result.structured_output, draft);
  assert.equal(result.invocation_result.status, 'succeeded');

  // The non-authority context packet was recorded and addressable by ref + hash.
  assert.equal(result.context_packet_ref.ref_type, 'artifact_ref');
  assert.match(result.context_packet_hash, /^[a-f0-9]{64}$/);

  // The re-derived semantic support artifact is the runtime-verified, gate-bound model draft.
  const semantic = result.semantic_artifact;
  assert.equal(semantic.slot_id, 'n6_question_candidate_draft');
  assert.equal(semantic.node_id, N6_NODE_ID);
  assert.equal(semantic.allowed_effect, 'model_draft_for_gate');
  assert.equal(semantic.runtime_provenance_class, 'runtime_verified');
  assert.equal(semantic.output_contract, 'TopicQuestionCandidateSetDraft@v1');
  assert.equal(semantic.execution_mode, 'mocked_llm');
  assert.equal(semantic.run_mode, 'test');

  // The structured-output hash is byte-derived from the draft and consistent across the artifact.
  assert.match(semantic.structured_output_hash, /^[a-f0-9]{64}$/);
  assert.equal(semantic.normalized_output_hash, semantic.structured_output_hash);
  assert.equal(semantic.support_artifact_hash, semantic.structured_output_hash);

  // Source-hash lineage carries the frozen N6 hashes the draft was bound to.
  assert.equal(semantic.source_hashes.n5_handoff_hash, request.frozen_input.payload.n5_handoff_hash);
  assert.equal(semantic.source_hashes.research_slice_hash, hash('d'));
});

test('v1b N6 draft runtime is byte-stable across runs with identical fixed inputs', async () => {
  const first = await makeSubject().runtime.generateDraftArtifact(draftInput(makeRequest(), candidateSetDraft()));
  const second = await makeSubject().runtime.generateDraftArtifact(draftInput(makeRequest(), candidateSetDraft()));

  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  if (first.status !== 'succeeded' || second.status !== 'succeeded') {
    throw new Error('Expected both runs to succeed.');
  }

  // Identity hashes are independent of the incrementing control-plane ref ids: a fresh control
  // plane reproduces the structured-output hash, prompt packet hash, and context packet hash.
  assert.equal(first.semantic_artifact.structured_output_hash, second.semantic_artifact.structured_output_hash);
  assert.equal(first.semantic_artifact.prompt_packet_hash, second.semantic_artifact.prompt_packet_hash);
  assert.equal(first.semantic_artifact.runtime_invocation_context_hash, second.semantic_artifact.runtime_invocation_context_hash);
  assert.equal(first.context_packet_hash, second.context_packet_hash);
});

test('v1b N6 draft runtime rejects an incomplete N6 frozen payload (invariant guard)', async () => {
  const { runtime } = makeSubject();
  const incompletePayload = frozenPayload() as Partial<TopicSelectionV1bN6HarnessFrozenInputPayload>;
  // Drop a required frozen N6 lineage field — the deterministic guard must refuse to draft.
  delete incompletePayload.research_slice_ref;
  const request = makeRequest({
    frozen_input: {
      input_contract: 'N5ToN6Handoff@v1',
      snapshot_kind: 'research_slice_selection_decision',
      source_refs: [ref('research_slice_selection_decision', 'slice_selection_001')],
      payload: incompletePayload as unknown as Record<string, unknown>,
    },
  });

  await assert.rejects(
    () => runtime.generateDraftArtifact(draftInput(request, candidateSetDraft())),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /complete N6 frozen payload/);
      return true;
    },
  );
});

test('v1b N6 draft runtime rejects a request that is not the v1b N6 node', async () => {
  const { runtime } = makeSubject();
  const request = makeRequest({
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1' as TopicSelectionV1bWorkflowHarnessRunRequest['node_id'],
  });

  await assert.rejects(
    () => runtime.generateDraftArtifact(draftInput(request, candidateSetDraft())),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      assert.match(error.message, /v1b N6 node id/);
      return true;
    },
  );
});

test('v1b N6 draft runtime refuses initial_from_n5 when a loopback projection is present in source refs', async () => {
  const { controlPlane, runtime } = makeSubject();
  // Record an N7→N6 loopback projection artifact and reference it from the frozen input. The
  // initial_from_n5 mode must not consume loopback/retry projection context.
  const projection = await controlPlane.recordArtifactRef({
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    artifact_kind: 'diagnostic',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_run_v1b_n6_draft_001',
    payload: { projection_kind: 'v1b_n7_to_n6_failed_trial_loopback_context' },
    created_by: 'system',
  });
  const request = makeRequest();
  request.frozen_input.source_refs = [
    ...request.frozen_input.source_refs,
    { ref_type: 'artifact_ref', ref_id: projection.artifact_ref_id, title_card_id: TITLE_CARD_ID, version_id: null },
  ];

  await assert.rejects(
    () => runtime.generateDraftArtifact(draftInput(request, candidateSetDraft())),
    (error: unknown) => {
      assert.ok(error instanceof AppError, 'Expected an AppError.');
      assert.equal(error.statusCode, 400);
      assert.equal(error.errorCode, 'INVALID_PAYLOAD');
      return true;
    },
  );
});
