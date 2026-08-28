import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  topicSelectionResearchArenaRoleOutputSchema,
  topicSelectionResearchArenaRoleEvidencePreparationRequestSchema,
  topicSelectionResearchArenaRoleEvidencePreparationSchema,
  topicSelectionResearchArenaRoleExecutionSchema,
  topicSelectionResearchArenaSessionSchema,
  topicSelectionResearchArenaShadowRunRequestSchema,
  topicSelectionResearchArenaShadowRunResponseSchema,
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

test('role evidence preparation schemas expose only advisory retrieval and evidence-materialization state', async () => {
  const queryIntent = {
    intent_type: 'context',
    query: 'Which adjacent mechanism is outside the inherited framing?',
    rationale: 'Search beyond the current EvidenceMap.',
    target_claim: 'A distinct mechanism is visible.',
  };
  const request = {
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1',
    workspace_id: null,
    title_card_id: 'title_1',
    arena_input_snapshot_id: 'arena_snapshot_1',
    participant_role: 'opportunity_scout',
    query_intent: queryIntent,
    search_plan_id: 'plan_1',
    literature_snapshot_id: 'snapshot_1',
    coverage_row_intent_id: 'coverage_1',
    top_k: 12,
    evidence_per_literature: 3,
  };
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaRoleEvidencePreparationRequestSchema, request)).statusCode,
    200,
  );
  assert.equal(
    (await injectRequest(topicSelectionResearchArenaRoleEvidencePreparationRequestSchema, {
      ...request,
      hidden_authority_write: true,
    })).statusCode,
    400,
  );

  const response = {
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1',
    status: 'requires_evidence_materialization',
    title_card_id: 'title_1',
    participant_role: 'opportunity_scout',
    query_intent: queryIntent,
    evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: 'title_1', version_id: 'v1' },
    search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
    retrieval_provenance: {
      participant_role: 'opportunity_scout',
      query_intent: queryIntent,
      search_run_ref: { ref_type: 'search_run', ref_id: 'search_run_1', title_card_id: 'title_1' },
      hits: [{
        literature_ref: { ref_type: 'literature_record', ref_id: 'lit_outside', title_card_id: 'title_1' },
        embedding_version_id: 'embedding_v1',
        chunk_id: 'chunk_1',
        chunk_hash: HASH,
        rank: 1,
        hybrid_score: 0.9,
        vector_score: 0.8,
        lexical_score: 0.7,
        is_stale: false,
      }],
      provenance_hash: HASH,
    },
    selected_evidence_unit_refs: [],
    unresolved_literature_refs: [{
      ref_type: 'literature_record', ref_id: 'lit_outside', title_card_id: 'title_1', version_id: null,
    }],
    evidence_packet_artifact_ref: null,
    evidence_packet_hash: null,
  };
  assert.equal(
    (await injectResponse(topicSelectionResearchArenaRoleEvidencePreparationSchema, response)).statusCode,
    200,
  );
});

test('arena role output requires evidence-grounded complete candidate reviews and keeps proposals role-visible', async () => {
  const candidateRef = {
    ref_type: 'topic_question_candidate',
    ref_id: 'candidate_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const evidenceUnitRef = {
    ref_type: 'evidence_unit',
    ref_id: 'unit_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const roleOutput = {
    schema_version: 'TopicSelectionResearchArenaRoleOutput@v1',
    participant_role: 'opportunity_scout',
    semantic_position: {
      recommended_set_outcome: 'evidence_expansion_required',
      summary: 'The current candidate is plausible, but the neighboring mechanism needs direct comparison.',
      confidence: 0.63,
    },
    candidate_reviews: [{
      candidate_ref: candidateRef,
      recommended_disposition: 'parked',
      rationale: 'The packet supports the mechanism but does not separate the adjacent alternative.',
      evidence_unit_refs: [evidenceUnitRef],
      drop_reason_code: null,
      reopening_conditions: ['Materialize direct-comparison evidence.'],
    }],
    findings: [{
      finding_id: 'finding_1',
      kind: 'adjacent_opportunity',
      severity: 'material',
      statement: 'A neighboring mechanism remains outside the current comparison set.',
      evidence_unit_refs: [evidenceUnitRef],
      literature_refs: [{ ref_type: 'literature_record', ref_id: 'lit_1' }],
    }],
    new_candidate_proposals: [{
      proposal_key: 'neighboring-mechanism',
      semantic_group_key: 'signed-intervention',
      title: 'Separate the neighboring signed mechanism',
      research_object: 'Adjacent-depth intervention effects',
      mechanism: 'Signed local intervention',
      expected_contribution: 'Disentangle two currently conflated mechanisms.',
      falsification_condition: 'The intervention has no distinct effect under the matched control.',
      evidence_unit_refs: [evidenceUnitRef],
    }],
    concessions: ['The current candidate already captures the main empirical setting.'],
    unresolved_minority_report: null,
  };

  assert.equal((await injectRequest(topicSelectionResearchArenaRoleOutputSchema, roleOutput)).statusCode, 200);
  assert.equal((await injectRequest(topicSelectionResearchArenaRoleOutputSchema, {
    ...roleOutput,
    findings: [],
  })).statusCode, 200, 'an honest role must not be forced to manufacture a finding');
  assert.equal((await injectRequest(topicSelectionResearchArenaRoleOutputSchema, {
    ...roleOutput,
    candidate_reviews: [{ ...roleOutput.candidate_reviews[0], evidence_unit_refs: [] }],
  })).statusCode, 400);
});

test('shadow run contracts admit exactly two non-provider first-pass roles and expose support-only synthesis', async () => {
  const candidateRef = {
    ref_type: 'topic_question_candidate',
    ref_id: 'candidate_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const evidenceUnitRef = {
    ref_type: 'evidence_unit',
    ref_id: 'unit_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const queryIntent = {
    intent_type: 'context',
    query: 'Which adjacent mechanism changes the candidate value?',
    rationale: 'Test the candidate against the local evidence landscape.',
    target_claim: 'The candidate isolates a distinct mechanism.',
  };
  const preparation = (participantRole: 'opportunity_scout' | 'prior_art_topic_killer') => ({
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1',
    status: 'ready',
    title_card_id: 'title_1',
    participant_role: participantRole,
    query_intent: queryIntent,
    evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: 'title_1', version_id: 'v1' },
    search_run_ref: { ref_type: 'search_run', ref_id: `search_${participantRole}`, title_card_id: 'title_1' },
    retrieval_provenance: {
      participant_role: participantRole,
      query_intent: queryIntent,
      search_run_ref: { ref_type: 'search_run', ref_id: `search_${participantRole}`, title_card_id: 'title_1' },
      hits: [{
        literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
        embedding_version_id: 'embedding_v1',
        chunk_id: 'chunk_1',
        chunk_hash: HASH,
        rank: 1,
        hybrid_score: 0.9,
        vector_score: 0.8,
        lexical_score: 0.7,
        is_stale: false,
      }],
      provenance_hash: HASH,
    },
    selected_evidence_unit_refs: [evidenceUnitRef],
    unresolved_literature_refs: [],
    evidence_packet_artifact_ref: {
      ref_type: 'artifact_ref',
      ref_id: `packet_${participantRole}`,
      title_card_id: 'title_1',
    },
    evidence_packet_hash: HASH,
  });
  const output = (participantRole: 'opportunity_scout' | 'prior_art_topic_killer') => ({
    schema_version: 'TopicSelectionResearchArenaRoleOutput@v1',
    participant_role: participantRole,
    semantic_position: {
      recommended_set_outcome: 'evidence_expansion_required',
      summary: 'More discriminating evidence is required.',
      confidence: 0.7,
    },
    candidate_reviews: [{
      candidate_ref: candidateRef,
      recommended_disposition: 'parked',
      rationale: 'The current evidence does not distinguish the nearest alternative.',
      evidence_unit_refs: [evidenceUnitRef],
      drop_reason_code: null,
      reopening_conditions: ['Add a direct nearest-prior-art comparison.'],
    }],
    findings: [{
      finding_id: `finding_${participantRole}`,
      kind: 'evidence_boundary',
      severity: 'material',
      statement: 'The discriminating comparison is absent.',
      evidence_unit_refs: [evidenceUnitRef],
      literature_refs: [{ ref_type: 'literature_record', ref_id: 'lit_1' }],
    }],
    new_candidate_proposals: [],
    concessions: [],
    unresolved_minority_report: null,
  });
  const request = {
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_1',
    node_attempt_id: 'attempt_1',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [
      {
        role_slot_id: 'scout',
        participant_role: 'opportunity_scout',
        evidence_preparation: preparation('opportunity_scout'),
        structured_output: output('opportunity_scout'),
        fixture_id: 'fixture_scout',
        operator_label: null,
      },
      {
        role_slot_id: 'killer',
        participant_role: 'prior_art_topic_killer',
        evidence_preparation: preparation('prior_art_topic_killer'),
        structured_output: output('prior_art_topic_killer'),
        fixture_id: 'fixture_killer',
        operator_label: null,
      },
    ],
  };
  assert.equal((await injectRequest(topicSelectionResearchArenaShadowRunRequestSchema, request)).statusCode, 200);
  assert.equal((await injectRequest(topicSelectionResearchArenaShadowRunRequestSchema, {
    ...request,
    execution_mode: 'provider_llm',
  })).statusCode, 400);

  const session = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_1',
    session_key: 'session-key-1',
    current_arena_key: null,
    workspace_id: null,
    title_card_id: 'title_1',
    arena_kind: 'gap_portfolio',
    target_ref: { ref_type: 'validated_need', ref_id: 'need_1', title_card_id: 'title_1', version_id: 'v1' },
    input_snapshot_id: 'snapshot_1',
    input_snapshot_hash: HASH,
    participant_plan_hash: HASH,
    participant_roles: ['opportunity_scout', 'prior_art_topic_killer'],
    execution_plan_ref: { ref_type: 'artifact_ref', ref_id: 'plan_1', title_card_id: 'title_1' },
    status: 'synthesized',
    termination_reason: 'evidence_expansion_required',
    loop_transcript_ref: { ref_type: 'artifact_ref', ref_id: 'transcript_1', title_card_id: 'title_1' },
    loop_transcript_hash: HASH,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: '2026-08-28T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
    synthesized_at: '2026-08-28T00:00:00.000Z',
    superseded_at: null,
  };
  const response = {
    schema_version: 'TopicSelectionResearchArenaShadowRunResponse@v1',
    arena_session: session,
    role_executions: (['opportunity_scout', 'prior_art_topic_killer'] as const).map((role, index) => ({
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
      arena_role_execution_id: `execution_${role}`,
      arena_session_id: 'arena_1',
      title_card_id: 'title_1',
      role_slot_id: role,
      instance_index: index,
      participant_role: role,
      pass_kind: 'first_pass',
      input_snapshot_id: 'snapshot_1',
      input_snapshot_hash: HASH,
      query_intent: queryIntent,
      evidence_packet_artifact_ref: { ref_type: 'artifact_ref', ref_id: `packet_${role}`, title_card_id: 'title_1' },
      evidence_packet_hash: HASH,
      evidence_partition_refs: [evidenceUnitRef],
      retrieval_provenance: preparation(role).retrieval_provenance,
      exposure_artifact_refs: [{ ref_type: 'artifact_ref', ref_id: `packet_${role}`, title_card_id: 'title_1' }],
      exposure_set_hash: HASH,
      output_artifact_ref: { ref_type: 'artifact_ref', ref_id: `output_${role}`, title_card_id: 'title_1' },
      output_artifact_hash: HASH,
      semantic_position_hash: HASH,
      prior_role_hashes: [],
      runtime_identity_hash: HASH,
      created_at: '2026-08-28T00:00:00.000Z',
    })),
    synthesis_artifact_ref: { ref_type: 'artifact_ref', ref_id: 'transcript_1', title_card_id: 'title_1' },
    synthesis_artifact_hash: HASH,
    advisory_synthesis: {
      schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1',
      outcome: 'evidence_expansion_required',
      summary: 'The roles agree that the nearest comparison remains unresolved.',
      candidate_dispositions: [{
        candidate_ref: candidateRef,
        disposition: 'parked',
        rationale: 'Do not select while the direct comparison is missing.',
        drop_reason_code: null,
        reopening_conditions: ['Materialize and review direct-comparison evidence.'],
        role_positions: [
          { participant_role: 'opportunity_scout', recommended_disposition: 'parked' },
          { participant_role: 'prior_art_topic_killer', recommended_disposition: 'parked' },
        ],
      }],
      preserved_finding_ids: ['finding_opportunity_scout', 'finding_prior_art_topic_killer'],
      unresolved_dissent: [],
      required_next_delta: 'evidence',
      support_only: true,
    },
    execution_accounting: {
      non_provider_role_invocation_count: 2,
      provider_call_count: 0,
      retrieval_run_count: 2,
      retrieval_hit_count: 2,
      evidence_excerpt_chars: 40,
      duration_ms: 25,
    },
    support_only: true,
  };
  assert.equal((await injectResponse(topicSelectionResearchArenaShadowRunResponseSchema, response)).statusCode, 200);
  const missingAccounting = structuredClone(response) as Record<string, unknown>;
  delete missingAccounting.execution_accounting;
  assert.equal((await injectResponse(topicSelectionResearchArenaShadowRunResponseSchema, missingAccounting)).statusCode, 500);
});

test('arena session and role execution schemas preserve replay and independence evidence', async () => {
  const targetRef = {
    ref_type: 'validated_need',
    ref_id: 'need_1',
    title_card_id: 'title_1',
    version_id: 'v1',
  };
  const artifactRef = (id: string) => ({
    ref_type: 'artifact_ref',
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
