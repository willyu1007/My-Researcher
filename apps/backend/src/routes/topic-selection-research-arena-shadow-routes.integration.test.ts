import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionResearchArenaShadowController } from '../controllers/topic-selection-research-arena-shadow-controller.js';
import type { TopicSelectionResearchArenaShadowRunnerService } from '../services/topic-selection-research-arena-shadow-runner-service.js';
import { registerTopicSelectionResearchArenaShadowRoutes } from './topic-selection-research-arena-shadow-routes.js';

const HASH = 'a'.repeat(64);

function roleExecution(role: 'opportunity_scout' | 'prior_art_topic_killer', index: number) {
  const queryIntent = {
    intent_type: 'context' as const,
    query: 'Is it distinct?',
    rationale: 'Test value.',
    target_claim: 'It is distinct.',
  };
  const packetRef = { ref_type: 'artifact_ref', ref_id: `packet_${role}`, title_card_id: 'title_1' };
  return {
    schema_version: 'TopicSelectionResearchArenaRoleExecution@v1' as const,
    arena_role_execution_id: `execution_${role}`,
    arena_session_id: 'arena_1',
    title_card_id: 'title_1',
    role_slot_id: role,
    instance_index: index,
    participant_role: role,
    pass_kind: 'first_pass' as const,
    input_snapshot_id: 'snapshot_1',
    input_snapshot_hash: HASH,
    query_intent: queryIntent,
    evidence_packet_artifact_ref: packetRef,
    evidence_packet_hash: HASH,
    evidence_partition_refs: [{ ref_type: 'evidence_unit', ref_id: 'unit_1', title_card_id: 'title_1' }],
    retrieval_provenance: {
      participant_role: role,
      query_intent: queryIntent,
      search_run_ref: { ref_type: 'search_run', ref_id: `search_${role}`, title_card_id: 'title_1' },
      hits: [{
        literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
        embedding_version_id: 'embedding_v1', chunk_id: `chunk_${role}`, chunk_hash: HASH,
        rank: 1, hybrid_score: 0.9, vector_score: 0.8, lexical_score: 0.7, is_stale: false,
      }],
      provenance_hash: HASH,
    },
    exposure_artifact_refs: [packetRef],
    exposure_set_hash: HASH,
    output_artifact_ref: { ref_type: 'artifact_ref', ref_id: `output_${role}`, title_card_id: 'title_1' },
    output_artifact_hash: HASH,
    semantic_position_hash: HASH,
    prior_role_hashes: [],
    runtime_identity_hash: HASH,
    created_at: '2026-08-29T00:00:00.000Z',
  };
}

test('research arena shadow route rejects provider execution and returns support-only synthesis', async () => {
  const service = {
    run: async () => ({
      schema_version: 'TopicSelectionResearchArenaShadowRunResponse@v1' as const,
      arena_session: {
        schema_version: 'TopicSelectionResearchArenaSession@v1' as const,
        arena_session_id: 'arena_1',
        session_key: 'arena-key',
        current_arena_key: null,
        workspace_id: null,
        title_card_id: 'title_1',
        arena_kind: 'gap_portfolio' as const,
        target_ref: { ref_type: 'validated_need', ref_id: 'need_1', title_card_id: 'title_1', version_id: 'v1' },
        input_snapshot_id: 'snapshot_1',
        input_snapshot_hash: HASH,
        participant_plan_hash: HASH,
        participant_roles: ['opportunity_scout', 'prior_art_topic_killer'] as const,
        execution_plan_ref: { ref_type: 'artifact_ref', ref_id: 'plan_1', title_card_id: 'title_1' },
        status: 'synthesized' as const,
        termination_reason: 'evidence_expansion_required' as const,
        loop_transcript_ref: { ref_type: 'artifact_ref', ref_id: 'transcript_1', title_card_id: 'title_1' },
        loop_transcript_hash: HASH,
        loop_delta_refs: [],
        support_only: true as const,
        supersedes_arena_session_id: null,
        superseded_by_arena_session_id: null,
        created_by: 'system',
        created_at: '2026-08-29T00:00:00.000Z',
        updated_at: '2026-08-29T00:00:00.000Z',
        synthesized_at: '2026-08-29T00:00:00.000Z',
        superseded_at: null,
      },
      role_executions: [
        roleExecution('opportunity_scout', 0),
        roleExecution('prior_art_topic_killer', 1),
      ],
      synthesis_artifact_ref: { ref_type: 'artifact_ref', ref_id: 'transcript_1', title_card_id: 'title_1' },
      synthesis_artifact_hash: HASH,
      advisory_synthesis: {
        schema_version: 'TopicSelectionResearchArenaAdvisorySynthesis@v1' as const,
        outcome: 'evidence_expansion_required' as const,
        summary: 'Conflict prevents advisory selection.',
        candidate_dispositions: [{
          candidate_ref: { ref_type: 'topic_question_candidate', ref_id: 'candidate_1', title_card_id: 'title_1' },
          disposition: 'parked' as const,
          rationale: 'The roles disagree.',
          drop_reason_code: null,
          reopening_conditions: ['Add direct comparison evidence.'],
          role_positions: [
            { participant_role: 'opportunity_scout' as const, recommended_disposition: 'selected' as const },
            { participant_role: 'prior_art_topic_killer' as const, recommended_disposition: 'dropped' as const },
          ],
        }],
        preserved_finding_ids: ['scout_1', 'killer_1'],
        unresolved_dissent: ['candidate_1 conflict'],
        required_next_delta: 'evidence' as const,
        support_only: true as const,
      },
      support_only: true as const,
    }),
  } as unknown as TopicSelectionResearchArenaShadowRunnerService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionResearchArenaShadowRoutes(
    app,
    new TopicSelectionResearchArenaShadowController(service),
  );
  const candidateRef = {
    ref_type: 'topic_question_candidate', ref_id: 'candidate_1', title_card_id: 'title_1', version_id: 'v1',
  };
  const evidenceUnitRef = {
    ref_type: 'evidence_unit', ref_id: 'unit_1', title_card_id: 'title_1', version_id: 'v1',
  };
  const queryIntent = {
    intent_type: 'context', query: 'Is it distinct?', rationale: 'Test value.', target_claim: 'It is distinct.',
  };
  const roleInput = (role: 'opportunity_scout' | 'prior_art_topic_killer') => ({
    role_slot_id: role,
    participant_role: role,
    evidence_preparation: {
      schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparation@v1',
      status: 'ready',
      title_card_id: 'title_1',
      participant_role: role,
      query_intent: queryIntent,
      evidence_map_ref: { ref_type: 'evidence_map', ref_id: 'map_1', title_card_id: 'title_1' },
      search_run_ref: { ref_type: 'search_run', ref_id: `search_${role}`, title_card_id: 'title_1' },
      retrieval_provenance: {
        participant_role: role,
        query_intent: queryIntent,
        search_run_ref: { ref_type: 'search_run', ref_id: `search_${role}`, title_card_id: 'title_1' },
        hits: [{
          literature_ref: { ref_type: 'literature_record', ref_id: 'lit_1' },
          embedding_version_id: 'embedding_v1', chunk_id: 'chunk_1', chunk_hash: HASH,
          rank: 1, hybrid_score: 0.9, vector_score: 0.8, lexical_score: 0.7, is_stale: false,
        }],
        provenance_hash: HASH,
      },
      selected_evidence_unit_refs: [evidenceUnitRef],
      unresolved_literature_refs: [],
      evidence_packet_artifact_ref: { ref_type: 'artifact_ref', ref_id: `packet_${role}`, title_card_id: 'title_1' },
      evidence_packet_hash: HASH,
    },
    structured_output: {
      schema_version: 'TopicSelectionResearchArenaRoleOutput@v1',
      participant_role: role,
      semantic_position: {
        recommended_set_outcome: 'evidence_expansion_required', summary: 'More evidence.', confidence: 0.7,
      },
      candidate_reviews: [{
        candidate_ref: candidateRef,
        recommended_disposition: 'parked',
        rationale: 'More evidence.',
        evidence_unit_refs: [evidenceUnitRef],
        drop_reason_code: null,
        reopening_conditions: [],
      }],
      findings: [{
        finding_id: `finding_${role}`,
        kind: 'coverage',
        severity: 'material',
        statement: 'Coverage is incomplete.',
        evidence_unit_refs: [evidenceUnitRef],
        literature_refs: [{ ref_type: 'literature_record', ref_id: 'lit_1' }],
      }],
      new_candidate_proposals: [],
      concessions: [],
      unresolved_minority_report: null,
    },
    fixture_id: `fixture_${role}`,
    operator_label: null,
  });
  const request = {
    schema_version: 'TopicSelectionResearchArenaShadowRunRequest@v1',
    arena_session_id: 'arena_1',
    workflow_run_id: 'workflow_1',
    node_attempt_id: 'attempt_1',
    execution_mode: 'mocked_llm',
    candidate_refs: [candidateRef],
    role_inputs: [roleInput('opportunity_scout'), roleInput('prior_art_topic_killer')],
  };
  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/shadow/run',
    payload: request,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().support_only, true);
  assert.equal(response.json().advisory_synthesis.outcome, 'evidence_expansion_required');

  const provider = await app.inject({
    method: 'POST',
    url: '/topic-selection/research/arena/shadow/run',
    payload: { ...request, execution_mode: 'provider_llm' },
  });
  assert.equal(provider.statusCode, 400);
  await app.close();
});
