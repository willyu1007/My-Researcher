import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  topicSelectionResearchArenaRoleExecutionSchema,
  topicSelectionResearchArenaSessionSchema,
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

test('arena session and role execution schemas preserve replay and independence evidence', async () => {
  const targetRef = {
    ref_type: 'validated_need',
    ref_id: 'need_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const artifactRef = (id: string) => ({
    ref_type: 'topic_selection_artifact_ref',
    ref_id: id,
    title_card_id: 'title_1',
  });
  const session = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_1',
    session_key: 'session-key-1',
    current_arena_key: 'title_1:gap_portfolio',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: targetRef,
    input_snapshot_id: 'snapshot_1',
    input_snapshot_hash: HASH,
    participant_plan_hash: HASH,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: artifactRef('execution_plan_1'),
    status: 'open',
    termination_reason: null,
    loop_transcript_ref: null,
    loop_transcript_hash: null,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: '2026-08-28T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
    synthesized_at: null,
    superseded_at: null,
  };
  assert.equal((await injectResponse(topicSelectionResearchArenaSessionSchema, session)).statusCode, 200);

  const roleExecution = {
    schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
    arena_role_execution_id: 'role_execution_1',
    arena_session_id: 'arena_1',
    title_card_id: 'title_1',
    role_slot_id: 'scout',
    instance_index: 0,
    participant_role: 'opportunity_scout',
    pass_kind: 'first_pass',
    input_snapshot_id: 'snapshot_1',
    input_snapshot_hash: HASH,
    query_intent: {
      intent_type: 'context',
      query: 'Which adjacent mechanisms are outside the current evidence basket?',
      rationale: 'Search outside the inherited framing.',
      target_claim: 'A distinct mechanism exists outside the current basket.',
    },
    evidence_packet_artifact_ref: artifactRef('evidence_packet_1'),
    evidence_packet_hash: HASH,
    evidence_partition_refs: [targetRef],
    retrieval_provenance: {
      participant_role: 'opportunity_scout',
      query_intent: {
        intent_type: 'context',
        query: 'Which adjacent mechanisms are outside the current evidence basket?',
        rationale: 'Search outside the inherited framing.',
        target_claim: 'A distinct mechanism exists outside the current basket.',
      },
      search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
      hits: [{
        literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
        embedding_version_id: 'embedding_v1',
        chunk_id: 'chunk_1',
        chunk_hash: HASH,
        rank: 1,
        hybrid_score: 0.92,
        vector_score: 0.9,
        lexical_score: 0.7,
        is_stale: false,
      }],
      provenance_hash: HASH,
    },
    exposure_artifact_refs: [artifactRef('evidence_packet_1')],
    exposure_set_hash: HASH,
    output_artifact_ref: artifactRef('role_output_1'),
    output_artifact_hash: HASH,
    semantic_position_hash: HASH,
    prior_role_hashes: [],
    runtime_identity_hash: HASH,
    created_at: '2026-08-28T00:01:00.000Z',
  };
  assert.equal((await injectResponse(topicSelectionResearchArenaRoleExecutionSchema, roleExecution)).statusCode, 200);

  const missingHits = structuredClone(roleExecution);
  missingHits.retrieval_provenance.hits = [];
  assert.equal((await injectRequest(topicSelectionResearchArenaRoleExecutionSchema, missingHits)).statusCode, 400);
});
