import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchCheckpointController } from '../controllers/topic-selection-research-checkpoint-controller.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
import { sha256Text, stableStringify } from '../services/literature-content-processing-utils.js';
import { TopicSelectionResearchCheckpointService } from '../services/topic-selection-research-checkpoint-service.js';
import { registerTopicSelectionResearchCheckpointRoutes } from './topic-selection-research-checkpoint-routes.js';

const HASH = 'a'.repeat(64);

test('checkpoint HTTP APIs expose packet, history, decision, and research status', async () => {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_${++sequence}` },
  );
  const service = new TopicSelectionResearchCheckpointService(
    new InMemoryTopicSelectionResearchCheckpointRepository(),
    controlPlane,
    { idFactory: (prefix) => `${prefix}_${++sequence}` },
  );
  const artifact = await controlPlane.recordArtifactRef({
    title_card_id: 'title_route_1',
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    payload: { summary: 'Reviewer packet content.' },
    created_by: 'system',
  });
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_route_1',
    checkpoint_kind: 'question_contract',
    target_ref: {
      ref_type: 'topic_question_contract',
      ref_id: 'question_1',
      title_card_id: 'title_route_1',
    },
    target_snapshot_hash: HASH,
    allowed_actions: ['advance', 'loopback', 'reject'],
    packet_payload: { mechanism: 'intervention changes ranking stability' },
  });
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchCheckpointRoutes(
    app,
    new TopicSelectionResearchCheckpointController(service),
  );

  const packetResponse = await app.inject({
    method: 'GET',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/packet`,
  });
  assert.equal(packetResponse.statusCode, 200, packetResponse.body);
  assert.deepEqual(packetResponse.json().packet_payload, {
    mechanism: 'intervention changes ranking stability',
  });

  const invalidDecision = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/decisions`,
    payload: {
      decision_key: 'decision_invalid',
      decision: 'advance',
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      confirmed_snapshot_hash: HASH,
      rationale: 'reviewed',
      review_payload: questionReview(),
      bypass: true,
    },
  });
  assert.equal(invalidDecision.statusCode, 400);

  const decisionResponse = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/decisions`,
    payload: {
      decision_key: 'decision_1',
      decision: 'advance',
      actor: { actor_type: 'human', actor_id: 'researcher_1' },
      confirmed_snapshot_hash: HASH,
      rationale: 'The mechanism, proxy, confounds, falsification, and claim ceiling are explicit.',
      review_payload: questionReview(),
    },
  });
  assert.equal(decisionResponse.statusCode, 201, decisionResponse.body);

  const statusResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/research-status',
  });
  assert.equal(statusResponse.statusCode, 200, statusResponse.body);
  assert.equal(statusResponse.json().next_authorized_transition, null);
  assert.equal(statusResponse.json().checkpoint_chain.length, 1);

  const manifestResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/stage-manifest',
  });
  assert.equal(manifestResponse.statusCode, 200, manifestResponse.body);
  assert.equal(manifestResponse.json().schema_version, 'TopicSelectionResearchStageManifest@v1');
  assert.equal(manifestResponse.json().stages.length, 7);
  assert.equal(
    manifestResponse.json().stages.find((stage: { stage: string }) => stage.stage === 'research_question')
      ?.authority_ref.ref_id,
    'question_1',
  );

  const humanViewResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/stage-views/research_question?audience=human',
  });
  assert.equal(humanViewResponse.statusCode, 200, humanViewResponse.body);
  assert.equal(humanViewResponse.json().audience, 'human');
  assert.match(humanViewResponse.json().markdown, /研究问题/u);

  const llmViewResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/stage-views/research_question?audience=llm',
  });
  assert.equal(llmViewResponse.statusCode, 200, llmViewResponse.body);
  assert.equal(llmViewResponse.json().working_set.current_packet.target_ref.ref_id, 'question_1');

  const invalidViewResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/stage-views/research_question?audience=operator',
  });
  assert.equal(invalidViewResponse.statusCode, 400);

  const envelopeResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/continuation-envelope',
  });
  assert.equal(envelopeResponse.statusCode, 200, envelopeResponse.body);
  const envelope = envelopeResponse.json();
  const stoppedEvaluationResponse = await app.inject({
    method: 'POST',
    url: '/topic-selection/title-cards/title_route_1/continuation-envelope/evaluations',
    payload: {
      schema_version: 'TopicSelectionResearchContinuationEnvelopeEvaluationInput@v1',
      envelope_hash: envelope.envelope_hash,
      manifest_hash: envelope.manifest_hash,
      proposed_effects: ['provider_or_material_cost'],
    },
  });
  assert.equal(stoppedEvaluationResponse.statusCode, 200, stoppedEvaluationResponse.body);
  assert.equal(stoppedEvaluationResponse.json().decision, 'stop_for_human');

  const artifactResponse = await app.inject({
    method: 'GET',
    url: `/topic-selection/artifacts/${artifact.artifact_ref_id}`,
  });
  assert.equal(artifactResponse.statusCode, 200, artifactResponse.body);
  assert.deepEqual(artifactResponse.json().payload, { summary: 'Reviewer packet content.' });

  const listResponse = await app.inject({
    method: 'GET',
    url: '/topic-selection/title-cards/title_route_1/checkpoints',
  });
  assert.equal(listResponse.statusCode, 200, listResponse.body);
  assert.equal(listResponse.json()[0].status, 'decided');
  await app.close();
});

test('Arena advisory review HTTP API records defer without advancing the checkpoint', async () => {
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: (prefix) => `${prefix}_arena_${++sequence}` },
  );
  const service = new TopicSelectionResearchCheckpointService(
    new InMemoryTopicSelectionResearchCheckpointRepository(),
    controlPlane,
    { idFactory: (prefix) => `${prefix}_arena_${++sequence}` },
  );
  const candidateRef = {
    ref_type: 'need_candidate',
    ref_id: 'candidate_route_1',
    version_id: 'v1',
    title_card_id: 'title_route_arena',
  };
  const rolePositions = [
    { participant_role: 'opportunity_scout' as const, recommended_disposition: 'parked' as const },
    { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: 'parked' as const },
  ];
  const advisory = {
    schema_version: 'TopicSelectionResearchGapArenaAdvisory@v1' as const,
    arena_session_ref: { ref_type: 'research_arena_session', ref_id: 'arena_route_1', title_card_id: 'title_route_arena' },
    arena_input_snapshot_ref: { ref_type: 'input_snapshot', ref_id: 'arena_input_route_1', title_card_id: 'title_route_arena' },
    arena_synthesis_ref: { ref_type: 'artifact_ref', ref_id: 'arena_synthesis_route_1', title_card_id: 'title_route_arena' },
    arena_synthesis_hash: 'b'.repeat(64),
    outcome: 'evidence_expansion_required' as const,
    summary: 'More direct evidence is required.',
    candidate_dispositions: [{
      candidate_ref: candidateRef,
      disposition: 'parked' as const,
      rationale: 'Evidence is not yet decisive.',
      drop_reason_code: null,
      reopening_conditions: ['Add a direct comparison.'],
      selected_against_candidate_ref: null,
      role_positions: rolePositions,
    }],
    risk_finding_refs: [],
    preserved_finding_ids: [],
    unresolved_dissent: [],
    required_next_delta: 'evidence' as const,
    support_only: true as const,
  };
  const checkpoint = await service.materializeCheckpoint({
    title_card_id: 'title_route_arena',
    checkpoint_kind: 'gap_selection',
    target_ref: { ref_type: 'need_candidate_arena', ref_id: 'arena_target_route_1', title_card_id: 'title_route_arena' },
    target_snapshot_hash: 'c'.repeat(64),
    source_refs: [candidateRef],
    allowed_actions: ['advance', 'hold'],
    packet_payload: {
      candidate_entries: [{ need_candidate_ref: candidateRef, semantic_group_key: 'group_1', machine_viable: true }],
      arena_advisory: advisory,
      arena_advisory_issue_codes: [],
    },
  });
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchCheckpointRoutes(
    app,
    new TopicSelectionResearchCheckpointController(service),
  );
  const payload = {
    idempotency_key: 'route_defer_once',
    actor: { actor_type: 'human', actor_id: 'researcher_1' },
    confirmed_input_snapshot_id: checkpoint.input_snapshot_id,
    confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
    advisory_snapshot_hash: sha256Text(stableStringify(advisory)),
    response: 'defer',
    rationale: 'I need to inspect the evidence first.',
    human_gap_selection_review: null,
  };
  const response = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/arena-advisory-reviews`,
    payload,
  });
  assert.equal(response.statusCode, 201, response.body);
  assert.equal(response.json().review.response, 'defer');
  const historyResponse = await app.inject({
    method: 'GET',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/arena-advisory-reviews`,
  });
  assert.equal(historyResponse.statusCode, 200, historyResponse.body);
  assert.equal(historyResponse.json().schema_version, 'TopicSelectionResearchArenaAdvisoryReviewHistory@v1');
  assert.deepEqual(historyResponse.json().reviews.map((item: { review: { response: string } }) => item.review.response), [
    'defer',
  ]);
  assert.equal((await service.getCheckpoint(checkpoint.research_checkpoint_id)).status, 'pending');
  const invalidActor = await app.inject({
    method: 'POST',
    url: `/topic-selection/checkpoints/${checkpoint.research_checkpoint_id}/arena-advisory-reviews`,
    payload: { ...payload, idempotency_key: 'agent_attempt', actor: { actor_type: 'agent', actor_id: 'agent_1' } },
  });
  assert.equal(invalidActor.statusCode, 400);
  await app.close();
});

function questionReview() {
  return {
    review_kind: 'question_contract',
    mechanism_identifiable: true,
    proxy_operationalized: true,
    confounds_reviewed: true,
    falsification_reviewed: true,
    claim_ceiling_reviewed: true,
    objections_reviewed: true,
    review_notes: [],
  } as const;
}
