import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  type TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionCoverageRowIntentRecord,
  TopicSelectionLiteratureResourcePoolSnapshotRecord,
  TopicSelectionSearchPlanRecord,
  TopicSelectionSearchPlanRecheckRequestRecord,
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TopicSelectionEvidenceConvergenceCoordinatorService,
} from './topic-selection-evidence-convergence-coordinator-service.js';

const NOW = '2026-09-03T00:00:00.000Z';

function ref(refType: string, refId: string, titleCardId = 'title_1', versionId?: string) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function intent(): TopicSelectionEvidenceConvergenceRetrievalRequestIntent {
  return {
    issue_ref: ref('coverage_row_intent', 'coverage_missing'),
    originating_arena_session_ref: ref('research_arena_session', 'arena_1'),
    search_intent: 'Find direct challenge evidence',
    candidate_queries: ['direct challenge evidence', 'failure mode evidence'],
    expected_decision_effect: 'Recheck missing challenge coverage',
    corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_1', 'title_1', 'v1'),
    corpus_manifest_hash: 'manifest-hash',
  };
}

function requestRecord(): TopicSelectionSearchPlanRecheckRequestRecord {
  return {
    search_plan_recheck_request_id: 'request_1',
    workspace_id: null,
    title_card_id: 'title_1',
    source_ref: ref('coverage_row_intent', 'coverage_missing'),
    target_search_plan_ref: ref('search_plan', 'plan_1', 'title_1', 'v1'),
    target_literature_snapshot_ref: ref(
      'literature_resource_pool_snapshot',
      'manifest_1',
      'title_1',
      'v1',
    ),
    request_key: 'request-key',
    strategy_key: 'strategy-key',
    issue_ref: ref('coverage_row_intent', 'coverage_missing'),
    originating_arena_session_ref: ref('research_arena_session', 'arena_1'),
    retrieval_intent: {
      search_intent: 'find direct challenge evidence',
      candidate_queries: ['direct challenge evidence', 'failure mode evidence'],
      corpus_manifest_ref: ref(
        'literature_resource_pool_snapshot',
        'manifest_1',
        'title_1',
        'v1',
      ),
      corpus_manifest_hash: 'manifest-hash',
      retrieval_parameters: {
        profile: 'topic_exploration',
        top_k: 10,
        evidence_per_literature: 3,
        include_stale: false,
      },
    },
    expected_decision_effect: 'recheck missing challenge coverage',
    execution_policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
    corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_1', 'title_1', 'v1'),
    corpus_manifest_hash: 'manifest-hash',
    supporting_artifact_refs: [],
    reason: 'Resolve required coverage.',
    gap_codes: ['REQUIRED_COVERAGE_MISSING'],
    requested_by: 'system',
    status: 'open',
    decision_summary: null,
    policy_version_id: null,
    accepted_risk_refs: [],
    resulting_search_plan_ref: null,
    resulting_search_run_ref: null,
    created_at: NOW,
    resolved_at: null,
  };
}

function searchPlan(id = 'plan_1'): TopicSelectionSearchPlanRecord {
  return {
    search_plan_id: id,
    workspace_id: null,
    title_card_id: 'title_1',
    plan_version: 'v1',
    status: 'ready',
    topic_seed_ref: ref('topic_seed', 'seed_1'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_1'),
    parent_search_plan_ref: null,
    recheck_request_ref: null,
    query_intents: ['initial query'],
    must_check_constraints: [],
    exclusion_rules: [],
    coverage_strategy: {},
    input_snapshot_id: 'snapshot_plan_1',
    workflow_run_id: 'workflow_plan_1',
    gate_result_id: 'gate_plan_1',
    transition_attempt_id: 'transition_plan_1',
    artifact_refs: [],
    created_by: 'system',
    created_at: NOW,
  };
}

function coverageRow(id = 'coverage_missing'): TopicSelectionCoverageRowIntentRecord {
  return {
    coverage_row_intent_id: id,
    search_plan_id: id === 'coverage_missing' ? 'plan_1' : 'plan_2',
    workspace_id: null,
    title_card_id: 'title_1',
    coverage_key: 'challenge-gap',
    intent_type: 'challenge',
    query: 'direct challenge evidence',
    rationale: 'Resolve the required challenge row.',
    required: true,
    priority: 0,
    target_source_types: [],
    expected_evidence_role: 'challenge',
    refs: [],
    created_at: NOW,
  };
}

function manifest(): TopicSelectionLiteratureResourcePoolSnapshotRecord {
  return {
    literature_resource_pool_snapshot_id: 'manifest_1',
    workspace_id: null,
    title_card_id: 'title_1',
    snapshot_version: 'v1',
    source_scope: 'managed_library',
    topic_seed_ref: ref('topic_seed', 'seed_1'),
    literature_refs: [ref('literature_record', 'lit_1')],
    content_source_refs: [],
    source_health_summary: {
      total_literature_count: 1,
      missing_literature_ids: [],
      rights_class_counts: {},
      pipeline_ready_count: 1,
      abstract_ready_count: 1,
      key_content_ready_count: 1,
      fulltext_ready_count: 1,
      source_count: 1,
      stale_count: 0,
      blocked_count: 0,
      warning_codes: [],
    },
    corpus_manifest_members: [{
      literature_ref: ref('literature_record', 'lit_1'),
      embedding_version_ref: ref('literature_embedding_version', 'embedding_1'),
      input_checksum: 'input-1',
      index_artifact_checksum: 'index-1',
    }],
    retrieval_stack_identity: {
      index_kind: 'pgvector',
      embedding_profile_id: 'default',
      embedding_provider: 'openai',
      embedding_model: 'text-embedding-3-small',
      embedding_dimension: 1536,
      freshness_policy: 'current_only',
      retrieval_policy_version: 'literature-retrieval.v1',
      reranker_policy_version: 'hybrid-reranker.v1',
      candidate_window: {
        floor: 200,
        unscoped_ceiling: 1200,
        scoped_ceiling: 2000,
        profile_multipliers: {
          general: 8,
          topic_exploration: 10,
          writing_evidence: 10,
          paper_management: 12,
        },
        per_literature_cap_min: 4,
        per_literature_cap_max: 12,
        query_timeout_ms: 5000,
      },
      corpus_scope: { mode: 'full_managed_library', human_confirmation_ref: null },
    },
    snapshot_hash: 'manifest-hash',
    input_snapshot_id: 'manifest_input',
    gate_result_id: 'manifest_gate',
    transition_attempt_id: 'manifest_transition',
    created_by: 'system',
    created_at: NOW,
  };
}

function response(query: string): LiteratureRetrieveResponse {
  return {
    items: [{
      literature_id: 'lit_1',
      canonical_work_key: 'work:lit_1',
      title: 'Retrieved work',
      embedding_version_id: 'embedding_1',
      retrieval_profile: 'topic_exploration',
      is_stale: false,
      warnings: [],
      hybrid_score: 0.9,
      vector_score: 0.8,
      lexical_score: 0.7,
      evidence_chunks: [{
        chunk_id: `chunk:${query}`,
        chunk_type: 'fulltext_paragraph',
        text: 'The reported failure mode directly challenges the proposed mechanism.',
        start_offset: 0,
        end_offset: 69,
        source_refs: [{ ref_type: 'paragraph', ref_id: 'paragraph_1' }],
        metadata: { paragraph_id: 'paragraph_1' },
        hybrid_score: 0.9,
        vector_score: 0.8,
        lexical_score: 0.7,
        score_breakdown: { vector: 0.8, lexical: 0.7, metadata: 0.1, profile_boost: 0.05 },
      }],
    }],
    meta: {
      profile: 'topic_exploration',
      query_tokens: query.split(' '),
      degraded_mode: false,
      freshness_warnings: [],
      profiles_used: [],
      skipped_profiles: [],
      query_embedding_telemetry: null,
    },
  };
}

test('coordinator merges equivalent role requests, persists execution before distribution, and reuses it', async () => {
  const calls: string[] = [];
  let durableRequest = requestRecord();
  const run: TopicSelectionSearchRunRecord = {
    search_run_id: 'run_1',
    workspace_id: null,
    title_card_id: 'title_1',
    search_plan_ref: ref('search_plan', 'plan_2', 'title_1', 'v2'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'manifest_1', 'title_1', 'v1'),
    run_kind: 'recheck_followup',
    run_status: 'succeeded',
    query_provenance: [{
      hits: [
        {
          query: 'direct challenge evidence',
          literature_ref: ref('literature_record', 'lit_1'),
          embedding_version_id: 'embedding_1',
          chunk_ref: ref('fulltext_paragraph', 'paragraph_1'),
          chunk_hash: 'a'.repeat(64),
          rank: 1,
        },
        {
          query: 'failure mode evidence',
          literature_ref: ref('literature_record', 'lit_1'),
          embedding_version_id: 'embedding_1',
          chunk_ref: ref('fulltext_paragraph', 'paragraph_1'),
          chunk_hash: 'a'.repeat(64),
          rank: 1,
        },
      ],
    }],
    result_accounting: {
      total_result_count: 2,
      unique_literature_count: 1,
      duplicate_result_count: 1,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: { degraded_mode: false },
    dedup_summary: { duplicate_result_count: 1 },
    evidence_map_input_refs: [ref('literature_record', 'lit_1'), ref('fulltext_paragraph', 'paragraph_1')],
    artifact_refs: [],
    input_snapshot_id: 'run_input',
    workflow_run_id: 'run_workflow',
    gate_result_id: 'run_gate',
    transition_attempt_id: 'run_transition',
    started_at: NOW,
    finished_at: NOW,
    created_by: 'system',
    created_at: NOW,
  };
  const service = new TopicSelectionEvidenceConvergenceCoordinatorService({
    searchResources: {
      createSearchPlanRecheckRequest: async () => durableRequest,
      getSearchPlanById: async (id) => id === 'plan_1' ? searchPlan() : { ...searchPlan('plan_2'), plan_version: 'v2' },
      getLiteratureResourcePoolSnapshotById: async () => manifest(),
      getCoverageMatrix: async (id) => ({
        search_plan_ref: ref('search_plan', id),
        generated_at: NOW,
        rows: [{ coverage_row_intent: id === 'plan_1' ? coverageRow() : coverageRow('coverage_child'), evidence_bindings: [], risk_acceptances: [] }],
        summary: { row_count: 1, satisfied_count: 0, partial_count: 0, missing_count: 1, accepted_risk_count: 0, unassessed_count: 0 },
      }),
      createSearchPlan: async () => ({
        search_plan: { ...searchPlan('plan_2'), plan_version: 'v2' },
        coverage_row_intents: [coverageRow('coverage_child_1'), coverageRow('coverage_child_2')],
      }),
      recordSearchRun: async () => {
        calls.push('persist-run');
        return { search_run: run, observations: [], evidence_bindings: [], assessments: [], risk_acceptances: [] };
      },
      completeEvidenceConvergenceRecheckRequest: async () => {
        calls.push('complete-request');
        durableRequest = {
          ...durableRequest,
          status: 'materialized',
          resulting_search_plan_ref: run.search_plan_ref,
          resulting_search_run_ref: ref('search_run', run.search_run_id),
        };
        return durableRequest;
      },
      getSearchRunById: async () => run,
      getSearchPlanRecheckRequestById: async () => durableRequest,
    },
    retriever: {
      retrieve: async (request: LiteratureRetrieveRequest) => {
        calls.push(`retrieve:${request.query}`);
        return response(request.query);
      },
    },
    scopedRetriever: {
      retrieve: async () => {
        throw new Error('full managed-library requests must use the global retriever');
      },
    },
    evidenceMapReader: {
      findEvidenceMapById: async () => ({
        evidence_map_id: 'map_1', workspace_id: null, title_card_id: 'title_1', evidence_map_version: 'v1',
        status: 'ready', review_status: 'machine_checked', freshness_status: 'current',
        search_run_ref: ref('search_run', 'run_0'), search_plan_ref: ref('search_plan', 'plan_1'),
        literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_1'),
        unit_count: 0, support_unit_count: 0, challenge_unit_count: 0, baseline_unit_count: 0,
        context_unit_count: 0, digest_payload: {}, stale_reason_codes: [], artifact_refs: [],
        predecessor_evidence_map_ref: null, successor_evidence_map_ref: null,
        material_evidence_delta_ref: null, lineage_revision: 0, created_by: 'system', created_at: NOW,
      }),
      listEvidenceUnitsByEvidenceMapId: async () => [],
    },
  });

  const roleRequests = [
    { participant_role: 'opportunity_scout' as const, intent: intent() },
    {
      participant_role: 'prior_art_topic_killer' as const,
      intent: {
        ...intent(),
        search_intent: ' find  direct challenge evidence ',
        candidate_queries: ['failure mode evidence', 'direct challenge evidence'],
      },
    },
  ];
  await assert.rejects(service.executeRoleRetrievalRequests({
    workspace_id: 'workspace_other',
    title_card_id: 'title_1',
    target_search_plan_id: 'plan_1',
    predecessor_evidence_map_id: 'map_1',
    role_requests: roleRequests,
    accounting: {
      orchestration_steps: 0,
      linked_rounds: 0,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  }), /workspace scope/u);
  assert.deepEqual(calls, []);

  const first = await service.executeRoleRetrievalRequests({
    title_card_id: 'title_1',
    target_search_plan_id: 'plan_1',
    predecessor_evidence_map_id: 'map_1',
    role_requests: roleRequests,
    accounting: {
      orchestration_steps: 0,
      linked_rounds: 0,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  });

  assert.equal(first.status, 'retrieval_ready');
  assert.equal(first.executions.length, 1);
  assert.equal(first.executions[0]?.reused, false);
  assert.equal(first.executions[0]?.retrieval_hit_count, 2);
  assert.equal(first.role_distributions.length, 2);
  assert.equal(first.requests[0]?.status, 'materialized');
  assert.deepEqual(calls, [
    'retrieve:direct challenge evidence',
    'retrieve:failure mode evidence',
    'persist-run',
    'complete-request',
  ]);

  calls.length = 0;
  const replay = await service.executeRoleRetrievalRequests({
    title_card_id: 'title_1',
    target_search_plan_id: 'plan_1',
    predecessor_evidence_map_id: 'map_1',
    role_requests: roleRequests,
    accounting: {
      orchestration_steps: 1,
      linked_rounds: 0,
      elapsed_ms: 100,
      accumulated_cost_microusd: 0,
    },
  });
  assert.equal(replay.status, 'retrieval_ready');
  assert.equal(replay.executions[0]?.reused, true);
  assert.deepEqual(calls, []);
});

test('coordinator halts exhausted work unresolved before retrieval', async () => {
  let called = false;
  const service = new TopicSelectionEvidenceConvergenceCoordinatorService({
    searchResources: {
      createSearchPlanRecheckRequest: async () => {
        called = true;
        return requestRecord();
      },
      getSearchPlanById: async () => searchPlan(),
      getLiteratureResourcePoolSnapshotById: async () => manifest(),
      getCoverageMatrix: async () => { throw new Error('unreachable'); },
      createSearchPlan: async () => { throw new Error('unreachable'); },
      recordSearchRun: async () => { throw new Error('unreachable'); },
      completeEvidenceConvergenceRecheckRequest: async () => { throw new Error('unreachable'); },
      getSearchRunById: async () => null,
      getSearchPlanRecheckRequestById: async () => null,
    },
    retriever: { retrieve: async () => { throw new Error('unreachable'); } },
    scopedRetriever: { retrieve: async () => { throw new Error('unreachable'); } },
    evidenceMapReader: {
      findEvidenceMapById: async () => { throw new Error('unreachable'); },
      listEvidenceUnitsByEvidenceMapId: async () => { throw new Error('unreachable'); },
    },
  });
  const result = await service.executeRoleRetrievalRequests({
    title_card_id: 'title_1',
    target_search_plan_id: 'plan_1',
    predecessor_evidence_map_id: 'map_1',
    role_requests: [{ participant_role: 'opportunity_scout', intent: intent() }],
    accounting: {
      orchestration_steps: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_orchestration_steps_per_issue,
      linked_rounds: 0,
      elapsed_ms: 0,
      accumulated_cost_microusd: 0,
    },
  });
  assert.equal(result.status, 'boundary_exhausted_unresolved');
  assert.deepEqual(result.reason_codes, ['MAX_ORCHESTRATION_STEPS_EXHAUSTED']);
  assert.equal(called, false);
});
