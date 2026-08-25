import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { TopicSelectionFunctionalRef } from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
  TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION,
  TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION,
  type HumanConfirmationInput,
  type HumanConfirmationSemanticReview,
  type HumanConfirmationSemanticReviewContextPacket,
  type PublishV1bInputBundleNodeInput,
  type TopicSelectionNeedAdjudicationRecommendationPacket,
  type TopicSelectionHumanConfirmNeedNodeResult,
  type TopicSelectionPublishV1bInputBundleNodeResult,
  type TopicSelectionValidateNeedAdjudicationNodeResult,
  humanConfirmationInputSchema,
  humanConfirmationSemanticReviewContextPacketSchema,
  humanConfirmationSemanticReviewSchema,
  publishV1bInputBundleNodeInputSchema,
  topicSelectionNeedAdjudicationRecommendationPacketSchema,
  topicSelectionHumanConfirmNeedNodeResultSchema,
  topicSelectionPublishV1bInputBundleNodeResultSchema,
  topicSelectionValidateNeedAdjudicationNodeResultSchema,
} from './topic-selection-need-validation-contracts.js';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: 'title_card_001',
  };
}

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify({
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

function recommendationPacket(): TopicSelectionNeedAdjudicationRecommendationPacket {
  return {
    schema_version: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    recommendation_packet_id: 'recommendation_packet_001',
    need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    validation_support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    readiness_assessment_ref: ref('need_candidate_readiness', 'readiness_001'),
    execution_mode: 'mocked_llm',
    profile_id: 'topic-selection.need-adjudication.single-agent.v1',
    final_decision: 'validate',
    rationale: 'The support packet is sufficient for human confirmation handoff.',
    required_actions: ['route_to_human_confirmation'],
    gap_codes: [],
    accepted_risk_refs: [],
    residual_risk_refs: [ref('accepted_risk', 'risk_001')],
    rejected_reason: null,
    merge_target_need_candidate_ref: null,
    searchplan_recheck_reason: null,
    searchplan_recheck_gap_codes: [],
    source_refs: [
      ref('need_candidate', 'need_candidate_001', 'v1'),
      ref('validation_decision_support_packet', 'support_packet_001'),
    ],
    recommendation_payload: { confidence: 0.82 },
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function nodeResult(): TopicSelectionValidateNeedAdjudicationNodeResult {
  return {
    schema_version: TOPIC_SELECTION_VALIDATE_NEED_ADJUDICATION_NODE_RESULT_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    status: 'ready',
    route_outcome: 'advance_to_human_confirmation',
    need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    readiness_assessment_ref: ref('need_candidate_readiness', 'readiness_001'),
    validation_support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    adjudication_result_ref: ref('validate_need_adjudication_result', 'adjudication_001'),
    reserved_validated_need_ref: ref('validated_need', 'validated_need_001'),
    next_node_id: 'topic-selection.v1a.human-confirm-need.v1',
    repair_target: null,
    final_decision: 'validate',
    required_actions: ['route_to_human_confirmation'],
    blocker_codes: [],
    warning_codes: [],
    review_reason_codes: [],
    accepted_risk_refs: [],
    residual_risk_refs: [ref('accepted_risk', 'risk_001')],
    merge_target_need_candidate_ref: null,
    recheck_request_ref: null,
    memory_suggestion_ref: null,
    recommendation_packet_ref: ref('artifact_ref', 'recommendation_packet_001'),
    harness_trace_artifact_ref: ref('artifact_ref', 'trace_001'),
    replay_provenance: null,
    duplicate_adjudication_ref: null,
    error_code: null,
    error_message: null,
  };
}

function humanConfirmationInput(): HumanConfirmationInput {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
    actor_mode: 'human_delegated',
    accountable_human_ref: { actor_type: 'human', actor_id: 'reviewer_001' },
    rationale: 'The support packet checks and residual risks have been reviewed for confirmation.',
    accepted_risk_refs: [ref('accepted_risk', 'risk_001')],
    required_check_results: [
      { check_id: 'scope_lineage_reviewed', result: 'accepted' },
    ],
    delegated_executor: {
      executor_type: 'codex',
      provenance_ref: ref('artifact_ref', 'delegated_executor_output_001'),
      policy_id: 'n8-validate-only-delegation-v1',
    },
  };
}

function semanticContextPacket(): HumanConfirmationSemanticReviewContextPacket {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_CONTEXT_PACKET_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    context_packet_id: 'semantic_context_001',
    adjudication_result_ref: ref('validate_need_adjudication_result', 'adjudication_001'),
    validation_support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    output_validated_need_ref: ref('validated_need', 'validated_need_001'),
    final_decision: 'validate',
    adjudication_rationale: 'The candidate is ready for human confirmation.',
    need_candidate_summary: 'Need traceable validation before topic promotion.',
    required_human_checks: ['scope_lineage_reviewed'],
    residual_risk_refs: [ref('accepted_risk', 'risk_001')],
    accepted_risk_refs: [ref('accepted_risk', 'risk_001')],
    confirmation_input: humanConfirmationInput(),
    policy_version: 'v1',
    output_schema_version: 'v1',
    context_packet_hash: 'sha256:context',
    created_at: '2026-05-23T00:00:00.000Z',
  };
}

function semanticReview(): HumanConfirmationSemanticReview {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    review_id: 'semantic_review_001',
    context_packet_ref: ref('artifact_ref', 'semantic_context_001'),
    execution_mode: 'mocked_llm',
    profile_id: 'topic-selection.confirmation-semantic-review.single-agent.v1',
    status: 'pass',
    alignment_codes: ['validate_alignment_clear'],
    risk_coverage: 'complete',
    required_check_coverage: 'complete',
    scope_violations: [],
    rationale_summary: 'Confirmation aligns with the validate adjudication.',
    provenance_ref: ref('artifact_ref', 'semantic_review_invocation_001'),
    warning_codes: [],
    blocker_codes: [],
    review_reason_codes: [],
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function humanConfirmNeedResult(): TopicSelectionHumanConfirmNeedNodeResult {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRM_NEED_NODE_RESULT_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.human-confirm-need.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    status: 'ready',
    route_outcome: 'advance_to_publish_v1b_input_bundle',
    adjudication_result_ref: ref('validate_need_adjudication_result', 'adjudication_001'),
    need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    validation_support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    human_decision_ref: ref('human_confirmed_decision', 'human_decision_001'),
    validated_need_ref: ref('validated_need', 'validated_need_001'),
    semantic_review_context_packet_ref: ref('artifact_ref', 'semantic_context_001'),
    semantic_review_ref: ref('artifact_ref', 'semantic_review_001'),
    confirmation_input_hash: 'sha256:confirmation',
    accepted_risk_refs: [ref('accepted_risk', 'risk_001')],
    residual_risk_refs: [ref('accepted_risk', 'risk_001')],
    required_check_results_snapshot: [
      { check_id: 'scope_lineage_reviewed', result: 'accepted' },
    ],
    blocker_codes: [],
    warning_codes: [],
    review_reason_codes: [],
    next_node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
    harness_trace_artifact_ref: ref('artifact_ref', 'trace_001'),
    replay_provenance: null,
    error_code: null,
    error_message: null,
  };
}

function evidenceRoleBundle() {
  return {
    support_unit_refs: [ref('evidence_unit', 'support_unit_001')],
    challenge_unit_refs: [ref('evidence_unit', 'challenge_unit_001')],
    baseline_unit_refs: [ref('evidence_unit', 'baseline_unit_001')],
    context_unit_refs: [ref('evidence_unit', 'context_unit_001')],
  };
}

function publishV1bInputBundleNodeInput(): PublishV1bInputBundleNodeInput {
  return {
    schema_version: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_INPUT_SCHEMA_VERSION,
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    title_card_ref: ref('title_card', 'title_card_001'),
    validated_need_ref: ref('validated_need', 'validated_need_001'),
    source_need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    adjudication_result_ref: ref('validate_need_adjudication_result', 'adjudication_001'),
    support_packet_ref: ref('validation_decision_support_packet', 'support_packet_001'),
    human_decision_ref: ref('human_confirmed_decision', 'human_decision_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'literature_snapshot_001'),
    evidence_role_bundle: evidenceRoleBundle(),
    risk_refs: [ref('accepted_risk', 'risk_001')],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    expected_bundle_version: 'v1a-to-v1b-input-bundle-v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    created_by: 'system',
  };
}

function publishV1bInputBundleNodeResult(): TopicSelectionPublishV1bInputBundleNodeResult {
  return {
    schema_version: TOPIC_SELECTION_PUBLISH_V1B_INPUT_BUNDLE_NODE_RESULT_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.publish-v1b-input-bundle.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    status: 'ready',
    route_outcome: 'published_v1b_input_bundle',
    validated_need_ref: ref('validated_need', 'validated_need_001'),
    v1b_input_bundle_ref: ref('v1b_input_bundle', 'v1b_input_bundle_001', 'v1a-to-v1b-input-bundle-v1'),
    bundle_version: 'v1a-to-v1b-input-bundle-v1',
    bundle_payload_hash: 'sha256:bundle',
    idempotency_result: 'created_new_bundle',
    carried_authority_refs: [
      ref('validated_need', 'validated_need_001'),
      ref('v1b_input_bundle', 'v1b_input_bundle_001', 'v1a-to-v1b-input-bundle-v1'),
    ],
    risk_refs: [ref('accepted_risk', 'risk_001')],
    memory_suggestion_refs: [],
    recheck_request_refs: [],
    blocker_codes: [],
    warning_codes: [],
    harness_trace_artifact_ref: ref('artifact_ref', 'trace_001'),
    replay_provenance: null,
    error_code: null,
    error_message: null,
  };
}

test('topic-selection NeedAdjudication recommendation packet schema accepts whitelist packet', async () => {
  assert.equal(await validatesBody(topicSelectionNeedAdjudicationRecommendationPacketSchema, recommendationPacket()), true);
});

test('topic-selection NeedAdjudication recommendation packet rejects orchestration drift', async () => {
  const packet = recommendationPacket() as unknown as Record<string, unknown>;
  packet.route_outcome = 'advance_to_human_confirmation';
  packet.next_node_id = 'topic-selection.v1a.human-confirm-need.v1';

  assert.equal(await validatesBody(topicSelectionNeedAdjudicationRecommendationPacketSchema, packet), false);
});

test('topic-selection ValidateNeedAdjudication node result schema accepts automation handoff', async () => {
  assert.equal(await validatesBody(topicSelectionValidateNeedAdjudicationNodeResultSchema, nodeResult()), true);
});

test('topic-selection ValidateNeedAdjudication node result schema rejects status expansion', async () => {
  const result = nodeResult() as unknown as Record<string, unknown>;
  result.status = 'ready_with_warning';

  assert.equal(await validatesBody(topicSelectionValidateNeedAdjudicationNodeResultSchema, result), false);
});

test('topic-selection HumanConfirmationInput schema accepts delegated fixed-policy input', async () => {
  assert.equal(await validatesBody(humanConfirmationInputSchema, humanConfirmationInput()), true);
});

test('topic-selection HumanConfirmationInput schema accepts a snapshot-bound competitive gap review', async () => {
  const input = humanConfirmationInput();
  input.gap_selection_review = {
    research_checkpoint_id: 'research_checkpoint_gap_001',
    confirmed_candidate_pool_hash: 'a'.repeat(64),
    selected_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
    direct_prior_art_pressure_reviewed: true,
    disconfirming_evidence_reviewed: true,
    candidate_reviews: [
      {
        need_candidate_ref: ref('need_candidate', 'need_candidate_001', 'v1'),
        disposition: 'selected',
        distinct_from_selected_axes: [],
        rationale: 'Selected after direct comparison.',
      },
      {
        need_candidate_ref: ref('need_candidate', 'need_candidate_002', 'v1'),
        disposition: 'viable_alternative',
        distinct_from_selected_axes: ['mechanism'],
        rationale: 'Changes the causal mechanism.',
      },
    ],
  };
  assert.equal(await validatesBody(humanConfirmationInputSchema, input), true);

  input.gap_selection_review.candidate_reviews = [input.gap_selection_review.candidate_reviews[0]!];
  assert.equal(await validatesBody(humanConfirmationInputSchema, input), false);
});

test('topic-selection HumanConfirmationInput schema rejects delegated input without fixed policy', async () => {
  const input = humanConfirmationInput() as unknown as Record<string, unknown>;
  input.delegated_executor = {
    executor_type: 'codex',
    provenance_ref: ref('artifact_ref', 'delegated_executor_output_001'),
    policy_id: 'caller-defined-policy',
  };

  assert.equal(await validatesBody(humanConfirmationInputSchema, input), false);
});

test('topic-selection HumanConfirmationInput schema rejects delegated executor on non-delegated actor modes', async () => {
  const input = {
    ...humanConfirmationInput(),
    actor_mode: 'human',
  };

  assert.equal(await validatesBody(humanConfirmationInputSchema, input), false);
});

test('topic-selection HumanConfirmationSemanticReview context and result schemas accept N8 artifacts', async () => {
  assert.equal(
    await validatesBody(humanConfirmationSemanticReviewContextPacketSchema, semanticContextPacket()),
    true,
  );
  assert.equal(await validatesBody(humanConfirmationSemanticReviewSchema, semanticReview()), true);
});

test('topic-selection HumanConfirmNeed node result schema accepts automation handoff', async () => {
  assert.equal(await validatesBody(topicSelectionHumanConfirmNeedNodeResultSchema, humanConfirmNeedResult()), true);
});

test('topic-selection HumanConfirmNeed node result schema rejects status expansion', async () => {
  const result = humanConfirmNeedResult() as unknown as Record<string, unknown>;
  result.status = 'ready_with_warning';

  assert.equal(await validatesBody(topicSelectionHumanConfirmNeedNodeResultSchema, result), false);
});

test('topic-selection PublishV1bInputBundle node input schema accepts explicit handoff refs', async () => {
  assert.equal(await validatesBody(publishV1bInputBundleNodeInputSchema, publishV1bInputBundleNodeInput()), true);
});

test('topic-selection PublishV1bInputBundle node input schema requires expected bundle version', async () => {
  const input = publishV1bInputBundleNodeInput() as unknown as Record<string, unknown>;
  delete input.expected_bundle_version;

  assert.equal(await validatesBody(publishV1bInputBundleNodeInputSchema, input), false);
});

test('topic-selection PublishV1bInputBundle node result schema accepts terminal v1a handoff', async () => {
  assert.equal(
    await validatesBody(topicSelectionPublishV1bInputBundleNodeResultSchema, publishV1bInputBundleNodeResult()),
    true,
  );
});

test('topic-selection PublishV1bInputBundle node result schema rejects next-node drift', async () => {
  const result = publishV1bInputBundleNodeResult() as unknown as Record<string, unknown>;
  result.next_node_id = 'topic-selection.v1b.some-node.v1';

  assert.equal(await validatesBody(topicSelectionPublishV1bInputBundleNodeResultSchema, result), false);
});
