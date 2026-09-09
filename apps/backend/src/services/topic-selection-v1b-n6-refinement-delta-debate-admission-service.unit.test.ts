import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  type TopicSelectionV1bN6RefinementDeltaDebateContext,
  type TopicSelectionV1bN6RefinementDeltaDebateRolePayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { TopicSelectionV1bN6RefinementDeltaDebateAdmissionService } from './topic-selection-v1b-n6-refinement-delta-debate-admission-service.js';

const ref = (refType: string, refId: string) => ({
  ref_type: refType,
  ref_id: refId,
  title_card_id: 'title_card_001',
  version_id: null,
});

const context: TopicSelectionV1bN6RefinementDeltaDebateContext = {
  source_kind: 'question_checkpoint_loopback',
  source_decision_ref: ref('research_checkpoint_decision', 'decision_001'),
  checkpoint_ref: ref('research_checkpoint', 'checkpoint_001'),
  previous_topic_question_contract_ref: ref('topic_question_contract', 'contract_previous'),
  previous_topic_question_contract_hash: 'a'.repeat(64),
  current_topic_question_contract_ref: ref('topic_question_contract', 'contract_current'),
  current_topic_question_contract_hash: 'b'.repeat(64),
  proposed_contract_semantic_hash: 'c'.repeat(64),
  refinement: {
    schema_version: 'TopicSelectionV1bN9QuestionRefinement@v1',
    refinement_id: 'refinement_001',
    actor: { actor_type: 'human', actor_id: 'researcher_001' },
    rationale: 'Freeze the exact evaluation contract.',
    updates: { metrics: ['Brier Score'], evaluation_setting: 'Paired same-query replacement evaluation.' },
  },
  refinement_hash: 'd'.repeat(64),
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

function output(
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
        { field: 'evaluation_setting', statement: 'The paired evaluation setting is explicit.' },
        { field: 'metrics', statement: 'The primary calibration metric is explicit.' },
      ],
    };
  }
  if (slot === 'n6_refinement_delta_critic') {
    return { ...base, critic_findings: [{ finding_code: 'C1', severity: 'note', field: 'evaluation_setting', statement: 'The paired evaluation remains within the frozen evidence ceiling.' }] };
  }
  return { ...base, decision: 'admit_unchanged', findings: [], summary: 'The Human-authored delta is internally coherent and remains unchanged.' };
}

function admissionInput(outputs = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map(output)) {
  const role_results = outputs.map((structured_output) => ({
    slot_id: structured_output.role_slot,
    role_artifact_hash: canonicalHash(structured_output),
    structured_output,
  }));
  return {
    workflow_run_id: 'workflow_run_001',
    policy_version: 'topic-selection-v1b-node-policy-v1',
    context,
    role_results,
    loop_transcript_hash: canonicalHash([
      TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID,
      [...TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER],
      role_results.map((result) => result.role_artifact_hash),
    ]),
  };
}

test('admits one canonical support-only refinement delta Debate without changing Human content', () => {
  const result = new TopicSelectionV1bN6RefinementDeltaDebateAdmissionService().admit(admissionInput());

  assert.equal(result.admitted, true);
  if (!result.admitted) return;
  assert.equal(result.payload.schema_version, TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION);
  assert.equal(result.payload.verdict, 'admit_unchanged');
  assert.equal(result.payload.refinement_hash, context.refinement_hash);
  assert.deepEqual(result.payload.changed_fields, context.changed_fields);
  assert.equal(result.payload.role_artifact_hashes.length, 3);
});

test('rejects recursive Human-field or authority mutation from every role', () => {
  const outputs = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map(output);
  outputs[0] = {
    ...outputs[0],
    review_points: [{
      field: 'metrics',
      statement: 'Looks sound.',
      main_question: 'A model-authored replacement is forbidden.',
    } as never],
  };
  const result = new TopicSelectionV1bN6RefinementDeltaDebateAdmissionService().admit(admissionInput(outputs));

  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_REFINEMENT_DELTA_DEBATE_FORBIDDEN_AUTHORITY_FIELD');
  assert.equal(result.blocker.details?.forbidden_key, 'main_question');
});

test('rejects an Explorer that does not cover the complete changed-field delta', () => {
  const outputs = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map(output);
  outputs[0] = {
    ...outputs[0],
    review_points: [{ field: 'metrics', statement: 'Only one of two changed fields was reviewed.' }],
  };
  const result = new TopicSelectionV1bN6RefinementDeltaDebateAdmissionService().admit(admissionInput(outputs));

  assert.equal(result.admitted, false);
  if (result.admitted) return;
  assert.equal(result.blocker.code, 'N6_REFINEMENT_DELTA_DEBATE_ROLE_STRUCTURE_INVALID');
});


test('rejects an Arbiter that erases or downgrades a material Critic finding', () => {
  const outputs = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER.map(output);
  outputs[1] = { ...outputs[1]!, critic_findings: [{ finding_code: 'missing_probabilities', severity: 'material', field: 'metrics',
    statement: 'The proposed Brier score cannot be calculated from the available labels alone.' }] };
  const service = new TopicSelectionV1bN6RefinementDeltaDebateAdmissionService();
  assert.equal(service.admit(admissionInput(outputs)).admitted, false);
  outputs[2] = { ...outputs[2]!, decision: 'block_with_findings', findings: outputs[1].critic_findings };
  const blocked = service.admit(admissionInput(outputs));
  assert.equal(blocked.admitted, true);
  if (blocked.admitted) assert.equal(blocked.payload.verdict, 'block_with_findings');
});
