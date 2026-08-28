import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchArenaRetrievalController } from '../controllers/topic-selection-research-arena-retrieval-controller.js';
import type { TopicSelectionResearchArenaRetrievalService } from '../services/topic-selection-research-arena-retrieval-service.js';
import { registerTopicSelectionResearchArenaRetrievalRoutes } from './topic-selection-research-arena-retrieval-routes.js';

const HASH = 'a'.repeat(64);

test('arena role-evidence route is strict and returns advisory materialization state', async () => {
  const service = {
    prepare: async (input: { title_card_id: string; query_intent: Record<string, unknown> }) => ({
      schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1' as const,
      status: 'requires_evidence_materialization' as const,
      title_card_id: input.title_card_id,
      participant_role: 'opportunity_scout' as const,
      query_intent: input.query_intent,
      evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: input.title_card_id, version_id: 'v1' },
      search_run_ref: { ref_type: 'search_run', ref_id: 'run_1', title_card_id: input.title_card_id, version_id: null },
      retrieval_provenance: {
        participant_role: 'opportunity_scout' as const,
        query_intent: input.query_intent,
        search_run_ref: { ref_type: 'search_run', ref_id: 'run_1', title_card_id: input.title_card_id, version_id: null },
        hits: [{
          literature_ref: { ref_type: 'literature_record', ref_id: 'lit_outside', title_card_id: input.title_card_id, version_id: null },
          embedding_version_id: 'embedding_v1', chunk_id: 'chunk_1', chunk_hash: HASH,
          rank: 1, hybrid_score: 0.9, vector_score: 0.8, lexical_score: 0.7, is_stale: false,
        }],
        provenance_hash: HASH,
      },
      selected_evidence_unit_refs: [],
      unresolved_literature_refs: [{
        ref_type: 'literature_record', ref_id: 'lit_outside', title_card_id: input.title_card_id, version_id: null,
      }],
      evidence_packet_artifact_ref: null,
      evidence_packet_hash: null,
    }),
  } as unknown as TopicSelectionResearchArenaRetrievalService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaRetrievalRoutes(
    app,
    new TopicSelectionResearchArenaRetrievalController(service),
  );
  const request = {
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_input_snapshot_id: 'arena_snapshot_1',
    participant_role: 'opportunity_scout',
    query_intent: {
      intent_type: 'context',
      query: 'Which adjacent mechanism is outside the inherited framing?',
      rationale: 'Search beyond the current EvidenceMap.',
      target_claim: 'A distinct mechanism is visible.',
    },
    search_plan_id: 'plan_1',
    literature_snapshot_id: 'snapshot_1',
    coverage_row_intent_id: 'coverage_1',
  };
  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/role-evidence/prepare',
    payload: request,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().status, 'requires_evidence_materialization');
  assert.deepEqual(response.json().unresolved_literature_refs.map((item: { ref_id: string }) => item.ref_id), ['lit_outside']);

  const invalid = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/role-evidence/prepare',
    payload: { ...request, human_decision: 'advance' },
  });
  assert.equal(invalid.statusCode, 400);
  await app.close();
});
