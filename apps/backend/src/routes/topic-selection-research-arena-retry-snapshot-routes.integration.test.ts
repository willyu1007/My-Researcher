import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchArenaRetrySnapshotController } from '../controllers/topic-selection-research-arena-retry-snapshot-controller.js';
import type {
  TopicSelectionResearchArenaRetrySnapshotService,
} from '../services/topic-selection-research-arena-retry-snapshot-service.js';
import { registerTopicSelectionResearchArenaRetrySnapshotRoutes } from './topic-selection-research-arena-retry-snapshot-routes.js';

const HASH = 'a'.repeat(64);

test('arena retry-snapshot route returns one support-only evidence delta and rejects authority fields', async () => {
  const service = {
    prepare: async (input: { title_card_id: string; evidence_map_id: string }) => ({
      schema_version: 'TopicSelectionResearchArenaRetrySnapshot@v1' as const,
      input_snapshot_id: 'snapshot_retry_1',
      input_snapshot_hash: HASH,
      target_ref: {
        ref_type: 'need_candidate_arena',
        ref_id: 'candidate_arena_1',
        title_card_id: input.title_card_id,
        version_id: 'v1',
      },
      execution_plan_ref: {
        ref_type: 'artifact_ref',
        ref_id: 'retry_plan_1',
        title_card_id: input.title_card_id,
      },
      loop_delta_refs: [{
        delta_type: 'evidence' as const,
        ref: {
          ref_type: 'evidence_map',
          ref_id: input.evidence_map_id,
          title_card_id: input.title_card_id,
          version_id: 'v2',
        },
        rationale: 'Repaired reviewed evidence replaces the blocked map.',
      }],
      support_only: true as const,
    }),
  } as unknown as TopicSelectionResearchArenaRetrySnapshotService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaRetrySnapshotRoutes(
    app,
    new TopicSelectionResearchArenaRetrySnapshotController(service),
  );
  const request = {
    schema_version: 'TopicSelectionResearchArenaRetrySnapshotRequest@v1',
    arena_session_id: 'arena_session_1',
    title_card_id: 'title_1',
    evidence_map_id: 'evidence_map_2',
    candidate_refs: [{
      ref_type: 'need_candidate',
      ref_id: 'candidate_1',
      title_card_id: 'title_1',
      version_id: 'v1',
    }],
  };

  const created = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/retry-snapshots',
    payload: request,
  });
  assert.equal(created.statusCode, 201, created.body);
  assert.equal(created.json().support_only, true);
  assert.deepEqual(created.json().loop_delta_refs.map((item: { delta_type: string }) => item.delta_type), ['evidence']);

  const invalid = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/retry-snapshots',
    payload: { ...request, human_decision: 'advance' },
  });
  assert.equal(invalid.statusCode, 400);
  await app.close();
});
