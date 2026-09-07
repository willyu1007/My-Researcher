import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type {
  TopicSelectionFunctionalRef,
} from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
} from './topic-selection-evidence-convergence-contracts.js';
import {
  TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION,
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
  type TopicSelectionSearchPlanBlueprint,
  type TopicSelectionSearchRunHandoff,
  type TopicSelectionSearchRunLoopbackSignal,
  type TopicSelectionSearchRunRecordBundle,
  topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
  topicSelectionSearchPlanBlueprintSchema,
  topicSelectionSearchPlanRecheckRequestRecordSchema,
  topicSelectionSearchRunHandoffSchema,
  topicSelectionSearchRunLoopbackSignalSchema,
  topicSelectionSearchRunRecordBundleSchema,
} from './topic-selection-search-resource-contracts.js';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: 'title_card_001',
  };
}

function validSearchPlanBlueprint(): TopicSelectionSearchPlanBlueprint {
  return {
    schema_version: TOPIC_SELECTION_SEARCH_PLAN_BLUEPRINT_SCHEMA_VERSION,
    blueprint_origin: 'workflow_scenario_fixture',
    blueprint_provenance_refs: [],
    title_card_ref: ref('title_card', 'title_card_001'),
    topic_seed_ref: ref('topic_seed', 'topic_seed_001', 'v1'),
    literature_resource_pool_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    expected_snapshot_hash: 'snapshot-hash-001',
    plan_version: 'v1',
    parent_search_plan_ref: null,
    recheck_request_ref: null,
    query_intents: ['RAG fine-tuning evidence'],
    coverage_intents: [{
      coverage_key: 'support-method',
      intent_type: 'support',
      query: 'RAG fine-tuning evidence',
      rationale: 'Find method evidence.',
      required: true,
      priority: 1,
      expected_evidence_role: 'support',
      target_source_types: ['paper'],
      refs: [],
    }],
    must_check_constraints: [],
    exclusion_rules: [],
    coverage_strategy: {
      method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
    },
    role_coverage_expectation: { support: 1 },
    method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function validBundle(): TopicSelectionSearchRunRecordBundle {
  const coverageRowRef = ref('coverage_row_intent', 'coverage_row_001');
  return {
    schema_version: TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
    title_card_ref: ref('title_card', 'title_card_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    literature_resource_pool_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    expected_literature_snapshot_hash: 'snapshot-hash-001',
    run_kind: 'planned_search',
    run_status: 'succeeded',
    query_provenance: [{ query: 'RAG fine-tuning evidence' }],
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: { source_count: 1, warning_codes: [] },
    dedup_summary: { duplicate_count: 0 },
    evidence_map_input_refs: [
      ref('literature_record', 'lit_001'),
      ref('literature_source', 'source_001'),
    ],
    coverage_observations: [{
      coverage_row_intent_ref: coverageRowRef,
      status: 'succeeded',
      result_count: 1,
      source_count: 1,
      missing_reason_codes: [],
      notes: null,
    }],
    evidence_bindings: [{
      coverage_row_intent_ref: coverageRowRef,
      literature_ref: ref('literature_record', 'lit_001'),
      source_refs: [ref('literature_source', 'source_001')],
      binding_kind: 'retrieval_hit',
      result_rank: 1,
    }],
    coverage_assessments: [{
      coverage_row_intent_ref: coverageRowRef,
      verdict: 'satisfied',
      issue_codes: [],
      confidence: 0.86,
      assessed_by: 'system',
    }],
    coverage_risk_acceptances: [],
    raw_log_artifact_ref: null,
    raw_log_artifact_payload: { provider: 'fixture', hit_count: 1 },
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function validHandoff(): TopicSelectionSearchRunHandoff {
  return {
    schema_version: TOPIC_SELECTION_SEARCH_RUN_HANDOFF_SCHEMA_VERSION,
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    literature_resource_pool_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    literature_snapshot_hash: 'snapshot-hash-001',
    coverage_row_intent_refs: [ref('coverage_row_intent', 'coverage_row_001')],
    coverage_role_expectations: [{
      coverage_row_intent_ref: ref('coverage_row_intent', 'coverage_row_001'),
      expected_evidence_role: 'support',
    }],
    method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
    evidence_map_input_refs: [ref('literature_record', 'lit_001')],
    coverage_binding_refs: [ref('coverage_evidence_binding', 'binding_001')],
    coverage_assessment_refs: [ref('coverage_assessment', 'assessment_001')],
    coverage_summary: { binding_count: 1 },
    source_health_summary: { source_count: 1, warning_codes: [] },
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    raw_log_artifact_refs: [ref('artifact_ref', 'raw_log_001')],
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function validLoopbackSignal(): TopicSelectionSearchRunLoopbackSignal {
  return {
    schema_version: TOPIC_SELECTION_SEARCH_RUN_LOOPBACK_SIGNAL_SCHEMA_VERSION,
    search_run_ref: ref('search_run', 'search_run_failed_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    literature_resource_pool_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_001', 'v1'),
    reason_codes: ['SEARCH_RUN_FAILED'],
    target_actions: ['upstream_search_execution_or_input_preparation'],
    repair_summary: 'Retry or repair upstream search execution before Node 5.',
    policy_version: 'v1',
    output_schema_version: 'v1',
  };
}

function validManagedLibrarySnapshot(): Record<string, unknown> {
  return {
    literature_resource_pool_snapshot_id: 'manifest_001',
    title_card_id: 'title_card_001',
    snapshot_version: 'v1',
    source_scope: 'managed_library',
    topic_seed_ref: ref('topic_seed', 'topic_seed_001', 'v1'),
    literature_refs: [ref('literature_record', 'lit_001')],
    content_source_refs: [ref('literature_source', 'source_001')],
    source_health_summary: {
      total_literature_count: 1,
      missing_literature_ids: [],
      rights_class_counts: { OA: 1 },
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
      literature_ref: ref('literature_record', 'lit_001'),
      embedding_version_ref: ref('literature_embedding_version', 'embedding_001'),
      input_checksum: 'input-checksum',
      index_artifact_checksum: 'index-checksum',
    }],
    retrieval_stack_identity: {
      index_kind: 'pgvector',
      embedding_profile_id: 'default',
      embedding_provider: 'openai',
      embedding_model: 'text-embedding-3-large',
      embedding_dimension: 3072,
      freshness_policy: 'current_only',
      retrieval_policy_version: 'literature-retrieval.v1',
      reranker_policy_version: 'hybrid-reranker.v1',
      candidate_window: {
        floor: 200,
        unscoped_ceiling: 1200,
        scoped_ceiling: 2000,
        profile_multipliers: { general: 8, topic_exploration: 10, writing_evidence: 10, paper_management: 12 },
        per_literature_cap_min: 4,
        per_literature_cap_max: 12,
        query_timeout_ms: 5000,
      },
      corpus_scope: { mode: 'full_managed_library', human_confirmation_ref: null },
    },
    snapshot_hash: 'manifest-hash-001',
    created_by: 'system',
    created_at: '2026-09-03T00:00:00.000Z',
  };
}

function validEvidenceConvergenceRecheckRequest(): Record<string, unknown> {
  return {
    search_plan_recheck_request_id: 'recheck_001',
    title_card_id: 'title_card_001',
    source_ref: ref('coverage_row_intent', 'coverage_challenge'),
    target_search_plan_ref: ref('search_plan', 'search_plan_001', 'v1'),
    target_literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'manifest_001', 'v1'),
    request_key: 'request-key-001',
    strategy_key: 'strategy-key-001',
    issue_ref: ref('coverage_row_intent', 'coverage_challenge'),
    originating_arena_session_ref: ref('research_arena_session', 'arena_001'),
    retrieval_intent: {
      search_intent: 'find direct counter evidence',
      candidate_queries: ['direct counter evidence'],
      corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_001', 'v1'),
      corpus_manifest_hash: 'manifest-hash-001',
      retrieval_parameters: {
        profile: 'topic_exploration',
        top_k: 10,
        evidence_per_literature: 3,
        include_stale: false,
      },
    },
    expected_decision_effect: 'Recheck missing challenge coverage.',
    execution_policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
    corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_001', 'v1'),
    corpus_manifest_hash: 'manifest-hash-001',
    supporting_artifact_refs: [],
    reason: 'Resolve missing challenge coverage.',
    gap_codes: ['REQUIRED_COVERAGE_MISSING'],
    requested_by: 'system',
    status: 'open',
    accepted_risk_refs: [],
    created_at: '2026-09-03T00:00:00.000Z',
  };
}

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

test('topic-selection SearchPlan blueprint schema requires method-family targets', async () => {
  assert.equal(await validatesBody(topicSelectionSearchPlanBlueprintSchema, validSearchPlanBlueprint()), true);

  const withoutTargets = { ...validSearchPlanBlueprint() } as Record<string, unknown>;
  delete withoutTargets.method_family_targets;
  assert.equal(await validatesBody(topicSelectionSearchPlanBlueprintSchema, withoutTargets), false);

  assert.equal(await validatesBody(topicSelectionSearchPlanBlueprintSchema, {
    ...validSearchPlanBlueprint(),
    method_family_targets: [],
  }), false);
});

test('topic-selection SearchRun bundle schema accepts normalized Node 4 input', async () => {
  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, validBundle()), true);
});

test('topic-selection SearchRun bundle schema rejects missing concrete result arrays', async () => {
  const bundle = validBundle() as unknown as Record<string, unknown>;
  delete bundle.coverage_observations;

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, bundle), false);
});

test('topic-selection SearchRun bundle schema rejects non-concrete authority refs', async () => {
  const bundle = validBundle();
  bundle.search_plan_ref = ref('search_plan', 'search_plan_001');

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, bundle), false);
});

test('topic-selection SearchRun bundle schema rejects raw-log and risk ref drift', async () => {
  const rawDrift = validBundle();
  rawDrift.raw_log_artifact_ref = ref('literature_record', 'lit_001');

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, rawDrift), false);

  const riskDrift = validBundle();
  riskDrift.coverage_risk_acceptances = [{
    coverage_row_intent_ref: ref('coverage_row_intent', 'coverage_row_001'),
    accepted_risk_ref: ref('coverage_row_intent', 'coverage_row_001'),
    accepted_by: { actor_type: 'human', actor_id: 'reviewer_001' },
    rationale: 'This must cite a search-coverage accepted risk, not a coverage row.',
  }];

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, riskDrift), false);
});

test('topic-selection SearchRun bundle schema rejects unsupported EvidenceMap authority refs', async () => {
  const evidenceInputDrift = validBundle();
  evidenceInputDrift.evidence_map_input_refs = [ref('search_plan', 'search_plan_001', 'v1')];

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, evidenceInputDrift), false);

  const literatureBindingDrift = validBundle();
  literatureBindingDrift.evidence_bindings = [{
    ...literatureBindingDrift.evidence_bindings[0]!,
    literature_ref: ref('literature_source', 'source_001'),
  }];

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, literatureBindingDrift), false);

  const sourceBindingDrift = validBundle();
  sourceBindingDrift.evidence_bindings = [{
    ...sourceBindingDrift.evidence_bindings[0]!,
    source_refs: [ref('search_plan', 'search_plan_001', 'v1')],
  }];

  assert.equal(await validatesBody(topicSelectionSearchRunRecordBundleSchema, sourceBindingDrift), false);
});

test('topic-selection SearchRun handoff and loopback schemas accept routing surfaces', async () => {
  assert.equal(await validatesBody(topicSelectionSearchRunHandoffSchema, validHandoff()), true);
  assert.equal(await validatesBody(topicSelectionSearchRunLoopbackSignalSchema, validLoopbackSignal()), true);
});

test('topic-selection SearchRun loopback schema rejects unknown target actions', async () => {
  const signal = validLoopbackSignal() as unknown as Record<string, unknown>;
  signal.target_actions = ['node5'];

  assert.equal(await validatesBody(topicSelectionSearchRunLoopbackSignalSchema, signal), false);
});

test('managed-library snapshot schema requires reconstructable corpus and retrieval identities', async () => {
  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    validManagedLibrarySnapshot(),
  ), true);

  const withoutManifest = validManagedLibrarySnapshot();
  delete withoutManifest.corpus_manifest_members;
  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    withoutManifest,
  ), false);

  const withoutStackIdentity = validManagedLibrarySnapshot();
  delete withoutStackIdentity.retrieval_stack_identity;
  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    withoutStackIdentity,
  ), false);

  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    { ...validManagedLibrarySnapshot(), corpus_manifest_members: [] },
  ), false);

  const invalidWindow = structuredClone(validManagedLibrarySnapshot());
  const stack = invalidWindow.retrieval_stack_identity as {
    candidate_window: { floor: number };
  };
  stack.candidate_window.floor = 0;
  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    invalidWindow,
  ), false);

  const invalidHumanScopeRef = structuredClone(validManagedLibrarySnapshot());
  const scopedStack = invalidHumanScopeRef.retrieval_stack_identity as {
    corpus_scope: Record<string, unknown>;
  };
  scopedStack.corpus_scope = {
    mode: 'human_confirmed_subset',
    human_confirmation_ref: ref('artifact_ref', 'not-a-human-decision'),
  };
  assert.equal(await validatesBody(
    topicSelectionLiteratureResourcePoolSnapshotRecordSchema,
    invalidHumanScopeRef,
  ), false);
});

test('keyed convergence recheck schema requires the complete exact contract', async () => {
  assert.equal(await validatesBody(
    topicSelectionSearchPlanRecheckRequestRecordSchema,
    validEvidenceConvergenceRecheckRequest(),
  ), true);

  const incomplete = validEvidenceConvergenceRecheckRequest();
  delete incomplete.strategy_key;
  delete incomplete.issue_ref;
  delete incomplete.execution_policy;
  assert.equal(await validatesBody(topicSelectionSearchPlanRecheckRequestRecordSchema, incomplete), false);

  const looseIntent = validEvidenceConvergenceRecheckRequest();
  looseIntent.retrieval_intent = { invented_field: true };
  assert.equal(await validatesBody(topicSelectionSearchPlanRecheckRequestRecordSchema, looseIntent), false);

  const partialWithoutKey = {
    ...validEvidenceConvergenceRecheckRequest(),
    request_key: null,
    strategy_key: null,
    issue_ref: null,
    originating_arena_session_ref: null,
    retrieval_intent: null,
    execution_policy: null,
    corpus_manifest_ref: null,
    corpus_manifest_hash: null,
  };
  assert.equal(await validatesBody(
    topicSelectionSearchPlanRecheckRequestRecordSchema,
    partialWithoutKey,
  ), false);
});
