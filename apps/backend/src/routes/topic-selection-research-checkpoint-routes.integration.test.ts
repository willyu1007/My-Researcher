import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchCheckpointController } from '../controllers/topic-selection-research-checkpoint-controller.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { TopicSelectionControlPlaneService } from '../services/topic-selection-control-plane-service.js';
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
