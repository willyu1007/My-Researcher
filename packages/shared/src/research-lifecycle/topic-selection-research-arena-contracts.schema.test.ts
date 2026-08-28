import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  topicSelectionResearchEvidencePacketRequestSchema,
  topicSelectionResearchEvidencePacketSchema,
} from './topic-selection-research-arena-contracts.js';

const HASH = 'a'.repeat(64);

async function injectRequest(schema: object, payload: object) {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/', { schema: { body: schema } }, async () => ({ ok: true }));
  const response = await app.inject({ method: 'POST', url: '/', payload });
  await app.close();
  return response;
}

async function injectResponse(schema: object, payload: object) {
  const app = Fastify();
  app.get('/', { schema: { response: { 200: schema } } }, async () => payload);
  const response = await app.inject({ method: 'GET', url: '/' });
  await app.close();
  return response;
}

test('EvidencePacket schemas require role, query intent, resolved excerpt, freshness, and quote integrity', async () => {
  const evidenceUnitRef = {
    ref_type: 'evidence_unit',
    ref_id: 'unit_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const request = {
    schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1',
    title_card_id: 'title_1',
    participant_role: 'opportunity_scout',
    query_intent: {
      intent_type: 'support',
      query: 'Which mechanism produces the observed effect?',
      rationale: 'Find claim-bearing evidence for a distinct mechanism.',
      target_claim: 'The signed intervention separates adjacent-depth effects.',
    },
    evidence_unit_refs: [evidenceUnitRef],
  };
  assert.equal((await injectRequest(topicSelectionResearchEvidencePacketRequestSchema, request)).statusCode, 200);

  const packet = {
    schema_version: 'TopicSelectionResearchEvidencePacket@v1',
    title_card_id: 'title_1',
    participant_role: 'opportunity_scout',
    query_intent: request.query_intent,
    items: [{
      evidence_unit_ref: evidenceUnitRef,
      evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: 'title_1', version_id: 'v1' },
      literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
      evidence_role: 'support',
      relation_to_target_claim: 'supports',
      source_statement: 'Signed intervention separates adjacent-depth effects.',
      resolved_excerpt: 'The signed intervention separates adjacent-depth effects under local perturbations.',
      excerpt_hash: HASH,
      resolved_locator: {
        locator_type: 'paragraph',
        literature_id: 'lit_1',
        document_id: 'document_1',
        content_row_id: 'paragraph_row_1',
        parser_ref_id: 'paragraph_parser_1',
        checksum: HASH,
      },
      freshness: {
        status: 'current',
        retrieval_readiness_reason: 'EVIDENCE_READY',
      },
      quote_integrity: 'exact_match',
      issue_codes: [],
    }],
    source_refs: [evidenceUnitRef],
    total_excerpt_chars: 86,
    packet_hash: HASH,
  };
  assert.equal((await injectResponse(topicSelectionResearchEvidencePacketSchema, packet)).statusCode, 200);
});
