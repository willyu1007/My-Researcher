import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
  type TopicSelectionV1bN6RefinementDeltaDebateContext,
  type TopicSelectionV1bN6RefinementDeltaDebateRolePayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionV1bN6RefinementDeltaDebateRuntimeService } from './topic-selection-v1b-n6-refinement-delta-debate-runtime-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

const ref = (refType: string, refId: string) => ({
  ref_type: refType,
  ref_id: refId,
  title_card_id: 'title_card_001',
  version_id: null,
});

const refinement: TopicSelectionV1bN6RefinementDeltaDebateContext['refinement'] = {
  schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
  refinement_id: 'refinement_001',
  actor: { actor_type: 'human', actor_id: 'researcher_001' },
  rationale: 'Freeze the exact evaluation contract.',
  updates: { metrics: ['Brier Score'], evaluation_setting: 'Paired same-query replacement evaluation.' },
};

const context: TopicSelectionV1bN6RefinementDeltaDebateContext = {
  source_kind: 'question_checkpoint_loopback',
  source_decision_ref: ref('research_checkpoint_decision', 'decision_001'),
  checkpoint_ref: ref('research_checkpoint', 'checkpoint_001'),
  previous_topic_question_contract_ref: ref('topic_question_contract', 'contract_previous'),
  previous_topic_question_contract_hash: 'a'.repeat(64),
  current_topic_question_contract_ref: ref('topic_question_contract', 'contract_current'),
  current_topic_question_contract_hash: 'b'.repeat(64),
  proposed_contract_semantic_hash: 'c'.repeat(64),
  refinement,
  refinement_hash: canonicalHash(refinement),
  delta_hash: 'e'.repeat(64),
  changed_fields: ['evaluation_setting', 'metrics'],
  selected_candidate_ref: ref('topic_question_candidate', 'candidate_001'),
  selected_candidate_hash: 'f'.repeat(64),
  selected_research_slice_ref: ref('research_slice', 'slice_001'),
  selected_research_slice_hash: '1'.repeat(64),
  evidence_ceiling_refs: [ref('evidence_map', 'evidence_001')],
  evidence_ceiling_hash: '2'.repeat(64),
  source_refs: [ref('artifact_ref', 'trace_001')],
};

function makeRequest(): TopicSelectionV1bWorkflowHarnessRunRequest {
  return {
    schema_version: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_delta_001',
    node_attempt_id: 'node_attempt_delta_001',
    node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    run_mode: 'test',
    created_by: 'system',
    frozen_input: {
      input_contract: 'TopicSelectionV1bN7ReviewedRefinement@v1',
      snapshot_kind: 'n7_reviewed_refinement',
      source_refs: context.source_refs,
      payload: { input_mode: 'reviewed_refinement' },
    },
  };
}

function roleOutput(
  slot: (typeof TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER)[number],
): TopicSelectionV1bN6RefinementDeltaDebateRolePayload {
  const base = {
    schema_version: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
    role_slot: slot,
  } as const;
  if (slot === 'n6_refinement_delta_explorer') {
    return {
      ...base,
      review_points: [
        { field: 'evaluation_setting', statement: 'The evaluation setting is explicit.' },
        { field: 'metrics', statement: 'The metric is explicit.' },
      ],
    };
  }
  if (slot === 'n6_refinement_delta_critic') {
    return { ...base, critic_findings: [{ finding_code: 'C1', severity: 'note', field: 'metrics', statement: 'No material contradiction found.' }] };
  }
  return { ...base, decision: 'admit_unchanged', findings: [], summary: 'Admit the exact Human delta unchanged.' };
}

function makeSubject() {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (() => {
      let count = 0;
      return (prefix: string) => `${prefix}_${++count}`;
    })(),
    now: () => '2026-09-02T00:00:00.000Z',
  });
  return {
    controlPlane,
    runtime: new TopicSelectionV1bN6RefinementDeltaDebateRuntimeService(controlPlane),
  };
}

function input() {
  return {
    request: makeRequest(),
    context,
    execution_mode: 'mocked_llm' as const,
    role_outputs: Object.fromEntries(TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map((slot) => [
      slot,
      { mocked_output: { fixture_id: `delta_${slot}`, output: roleOutput(slot) }, codex_response: null },
    ])),
  };
}

test('runs one Explorer/Critic/Arbiter pass and records an N7 support-only admission', async () => {
  const { runtime } = makeSubject();
  const result = await runtime.runDebate(input());

  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') return;
  assert.equal(result.replayed, false);
  assert.equal(result.admission.verdict, 'admit_unchanged');
  assert.equal(result.semantic_artifact.slot_id, 'n7_n6_refinement_delta_admission');
  assert.equal(result.semantic_artifact.allowed_effect, 'support_only');
  assert.equal(result.semantic_artifact.support_artifact_hash, result.admission_hash);
});

test('reuses the exact route-source plus delta result without spending another Debate pass', async () => {
  const { runtime, controlPlane } = makeSubject();
  const first = await runtime.runDebate(input());
  assert.equal(first.status, 'completed');
  const countAfterFirst = (await controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_delta_001')).length;

  const replay = await runtime.runDebate(input());
  const countAfterReplay = (await controlPlane.listArtifactRefsByWorkflowRunId('workflow_run_delta_001')).length;

  assert.equal(replay.status, 'completed');
  if (replay.status !== 'completed') return;
  assert.equal(replay.replayed, true);
  assert.equal(countAfterReplay, countAfterFirst);
  assert.equal(replay.admission_hash, first.status === 'completed' ? first.admission_hash : null);
});
