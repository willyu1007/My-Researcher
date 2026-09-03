import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { TopicSelectionEvidenceConvergenceController } from '../controllers/topic-selection-evidence-convergence-controller.js';
import type { TopicSelectionEvidenceConvergenceCoordinatorService } from '../services/topic-selection-evidence-convergence-coordinator-service.js';
import type { TopicSelectionEvidenceMapService } from '../services/topic-selection-evidence-map-service.js';
import type { TopicSelectionEvidenceConvergenceRoundService } from '../services/topic-selection-evidence-convergence-round-service.js';
import { registerTopicSelectionEvidenceConvergenceRoutes } from './topic-selection-evidence-convergence-routes.js';

test('evidence-convergence retrieval route keeps role intent and accounting ingress closed', async () => {
  let calls = 0;
  const service = {
    executeRoleRetrievalRequests: async () => {
      calls += 1;
      return {
        status: 'boundary_exhausted_unresolved' as const,
        reason_codes: ['MAX_ORCHESTRATION_STEPS_EXHAUSTED'],
        requests: [],
        executions: [],
        role_distributions: [],
      };
    },
  } as unknown as TopicSelectionEvidenceConvergenceCoordinatorService;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionEvidenceConvergenceRoutes(
    app,
    new TopicSelectionEvidenceConvergenceController(service),
  );
  const payload = {
    title_card_id: 'title_1',
    target_search_plan_id: 'plan_1',
    predecessor_evidence_map_id: 'map_1',
    role_requests: [{
      participant_role: 'prior_art_topic_killer',
      intent: {
        issue_ref: { ref_type: 'coverage_row_intent', ref_id: 'coverage_1', title_card_id: 'title_1' },
        originating_arena_session_ref: {
          ref_type: 'research_arena_session',
          ref_id: 'arena_1',
          title_card_id: 'title_1',
        },
        search_intent: 'Find direct challenge evidence.',
        candidate_queries: ['failure mode evidence'],
        expected_decision_effect: 'Recheck missing challenge coverage.',
        corpus_manifest_ref: {
          ref_type: 'literature_resource_pool_snapshot',
          ref_id: 'manifest_1',
          title_card_id: 'title_1',
        },
        corpus_manifest_hash: 'manifest-hash',
      },
    }],
    accounting: {
      orchestration_steps: 8,
      linked_rounds: 0,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  };
  const response = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/retrieval-executions',
    payload,
  });
  assert.equal(response.statusCode, 200, response.body);
  assert.equal(response.json().status, 'boundary_exhausted_unresolved');
  assert.equal(calls, 1);

  const invalid = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/retrieval-executions',
    payload: { ...payload, human_decision: 'advance' },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal(calls, 1);
  await app.close();
});

test('evidence-convergence successor route accepts only closed claim admissions', async () => {
  let calls = 0;
  const coordinator = {
    executeRoleRetrievalRequests: async () => ({
      status: 'saturated_unresolved' as const,
      reason_codes: [],
      requests: [],
      executions: [],
      role_distributions: [],
    }),
  } as unknown as TopicSelectionEvidenceConvergenceCoordinatorService;
  const evidenceMaps = {
    publishEvidenceConvergenceSuccessor: async () => {
      calls += 1;
      return { status: 'successor_published' as const };
    },
  } as unknown as Pick<TopicSelectionEvidenceMapService, 'publishEvidenceConvergenceSuccessor'>;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionEvidenceConvergenceRoutes(
    app,
    new TopicSelectionEvidenceConvergenceController(coordinator, evidenceMaps),
  );
  const titleRef = (ref_type: string, ref_id: string) => ({ ref_type, ref_id, title_card_id: 'title_1' });
  const payload = {
    title_card_id: 'title_1',
    predecessor_evidence_map_id: 'map_1',
    search_run_id: 'run_1',
    issue_ref: titleRef('coverage_row_intent', 'coverage_1'),
    decision_relevance: 'The exact challenge claim can satisfy required coverage.',
    claim_admissions: [{
      schema_version: 'TopicSelectionEvidenceConvergenceClaimAdmission@v1',
      request_ref: titleRef('search_plan_recheck_request', 'request_1'),
      search_run_ref: titleRef('search_run', 'run_1'),
      query: 'direct challenge evidence',
      literature_ref: titleRef('literature_record', 'lit_1'),
      chunk_ref: titleRef('fulltext_paragraph', 'paragraph_1'),
      chunk_hash: 'a'.repeat(64),
      evidence_role: 'challenge',
      source_statement: 'The reported failure persists under distribution shift.',
      normalized_statement: null,
      interpretation_payload: {},
      extraction_confidence: 0.9,
    }],
  };

  const accepted = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/evidence-map-successors',
    payload,
  });
  assert.equal(accepted.statusCode, 200, accepted.body);
  assert.equal(calls, 1);

  const rejected = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/evidence-map-successors',
    payload: {
      ...payload,
      claim_admissions: [{ ...payload.claim_admissions[0], request_key: 'role-authored-key' }],
    },
  });
  assert.equal(rejected.statusCode, 400);
  assert.equal(calls, 1);
  await app.close();
});

test('evidence-convergence linked-round route rejects gate or Human authority fields', async () => {
  let calls = 0;
  const coordinator = {
    executeRoleRetrievalRequests: async () => ({
      status: 'saturated_unresolved' as const,
      reason_codes: [],
      requests: [],
      executions: [],
      role_distributions: [],
    }),
  } as unknown as TopicSelectionEvidenceConvergenceCoordinatorService;
  const rounds = {
    runLinkedRound: async () => {
      calls += 1;
      return {
        status: 'boundary_exhausted_unresolved' as const,
        reason_codes: ['MAX_LINKED_ROUNDS_EXHAUSTED'],
        accounting: {
          orchestration_steps: 1,
          linked_rounds: 4,
          elapsed_ms: 0,
          accumulated_cost_microusd: 0,
        },
      };
    },
  } as unknown as Pick<TopicSelectionEvidenceConvergenceRoundService, 'runLinkedRound'>;
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  await registerTopicSelectionEvidenceConvergenceRoutes(
    app,
    new TopicSelectionEvidenceConvergenceController(coordinator, undefined, rounds),
  );
  const scopedRef = (ref_type: string, ref_id: string) => ({
    ref_type,
    ref_id,
    title_card_id: 'title_1',
  });
  const issueRef = scopedRef('coverage_row_intent', 'coverage_1');
  const mapRef = scopedRef('evidence_map', 'map_2');
  const deltaRef = scopedRef('artifact_ref', 'delta_1');
  const roles = ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'] as const;
  const payload = {
    title_card_id: 'title_1',
    predecessor_arena_session_id: 'arena_1',
    successor_evidence_map_id: 'map_2',
    evidence_delta_ref: deltaRef,
    issue_ref: issueRef,
    execution_mode: 'mocked_llm',
    role_inputs: roles.map((role) => ({
      participant_role: role,
      evidence_packet_artifact_ref: scopedRef('artifact_ref', `packet_${role}`),
      structured_output: {
        schema_version: 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1',
        participant_role: role,
        issue_ref: issueRef,
        evidence_map_ref: mapRef,
        evidence_delta_ref: deltaRef,
        semantic_position: {
          summary: 'Recheck the same deterministic gate.',
          recommended_disposition: 'recheck_same_gate',
          confidence: 0.8,
        },
        cited_evidence_unit_refs: [scopedRef('evidence_unit', 'unit_1')],
        unresolved_issue_codes: [],
        support_only: true,
      },
      fixture_id: `fixture_${role}`,
      operator_label: null,
    })),
    accounting: {
      orchestration_steps: 1,
      linked_rounds: 4,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  };

  const accepted = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/linked-rounds',
    payload,
  });
  assert.equal(accepted.statusCode, 200, accepted.body);
  assert.equal(calls, 1);

  const rejected = await app.inject({
    method: 'POST',
    url: '/topic-selection/evidence-convergence/linked-rounds',
    payload: {
      ...payload,
      role_inputs: payload.role_inputs.map((roleInput, index) => index === 2
        ? { ...roleInput, structured_output: { ...roleInput.structured_output, human_decision: 'advance' } }
        : roleInput),
    },
  });
  assert.equal(rejected.statusCode, 400);
  assert.equal(calls, 1);
  await app.close();
});
