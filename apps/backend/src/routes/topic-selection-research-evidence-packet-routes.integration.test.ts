import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchEvidencePacketController } from '../controllers/topic-selection-research-evidence-packet-controller.js';
import type { TopicSelectionResearchEvidencePacketService } from '../services/topic-selection-research-evidence-packet-service.js';
import { registerTopicSelectionResearchEvidencePacketRoutes } from './topic-selection-research-evidence-packet-routes.js';

const HASH = 'a'.repeat(64);

test('EvidencePacket HTTP route is strict and returns resolved model-visible content', async () => {
  const service = {
    resolve: async (input: { title_card_id: string }) => ({
      schema_version: 'TopicSelectionResearchEvidencePacket@v1' as const,
      title_card_id: input.title_card_id,
      participant_role: 'opportunity_scout' as const,
      query_intent: {
        intent_type: 'support' as const,
        query: 'mechanism query',
        rationale: 'resolve source text',
        target_claim: 'mechanism claim',
      },
      items: [{
        evidence_unit_ref: { ref_type: 'evidence_unit', ref_id: 'unit_1', title_card_id: input.title_card_id, version_id: 'v1' },
        evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: input.title_card_id, version_id: 'v1' },
        literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
        evidence_role: 'support' as const,
        relation_to_target_claim: 'supports' as const,
        source_statement: 'Source statement.',
        resolved_excerpt: 'Source statement. Full source context.',
        excerpt_hash: HASH,
        resolved_locator: {
          locator_type: 'paragraph' as const,
          literature_id: 'lit_1',
          document_id: 'document_1',
          content_row_id: 'paragraph_1',
          parser_ref_id: 'p1',
          checksum: HASH,
        },
        freshness: { status: 'current' as const, retrieval_readiness_reason: 'EVIDENCE_READY' },
        quote_integrity: 'exact_match' as const,
        issue_codes: [],
      }],
      source_refs: [{ ref_type: 'evidence_unit', ref_id: 'unit_1' }],
      total_excerpt_chars: 38,
      packet_hash: HASH,
    }),
  } as unknown as TopicSelectionResearchEvidencePacketService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchEvidencePacketRoutes(
    app,
    new TopicSelectionResearchEvidencePacketController(service),
  );
  const request = {
    schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1',
    title_card_id: 'title_1',
    participant_role: 'opportunity_scout',
    query_intent: {
      intent_type: 'support',
      query: 'mechanism query',
      rationale: 'resolve source text',
      target_claim: 'mechanism claim',
    },
    evidence_unit_refs: [{ ref_type: 'evidence_unit', ref_id: 'unit_1', title_card_id: 'title_1', version_id: 'v1' }],
  };
  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/evidence-packets/resolve',
    payload: request,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.match(response.json().items[0].resolved_excerpt, /Full source context/u);
  const invalid = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/evidence-packets/resolve',
    payload: { ...request, hidden_bypass: true },
  });
  assert.equal(invalid.statusCode, 400);
  await app.close();
});
