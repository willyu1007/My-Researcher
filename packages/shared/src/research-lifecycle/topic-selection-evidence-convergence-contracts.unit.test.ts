import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import type { TopicSelectionFunctionalRef } from './topic-selection-control-plane-contracts.js';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION,
  TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION,
  canonicalizeEvidenceConvergenceRequest,
  evaluateEvidenceConvergenceBoundary,
  topicSelectionEvidenceConvergenceClaimAdmissionSchema,
  topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema,
  topicSelectionEvidenceConvergenceRoundLinkSchema,
  topicSelectionEvidenceConvergenceRoundRoleOutputSchema,
  type TopicSelectionEvidenceDeltaArtifact,
  type TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
  type TopicSelectionEvidenceConvergenceRoundLink,
  type TopicSelectionResolutionRouteArtifact,
} from './topic-selection-evidence-convergence-contracts.js';

async function validates(schema: object, payload: unknown): Promise<boolean> {
  const app = Fastify({ ajv: { customOptions: { removeAdditional: false } } });
  app.post('/', { schema: { body: schema } }, async () => ({ ok: true }));
  const response = await app.inject({
    method: 'POST',
    url: '/',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(payload),
  });
  await app.close();
  return response.statusCode === 200;
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_1',
  };
}

test('coordinator canonicalization makes equivalent retrieval intents share request and strategy payloads', () => {
  const input: TopicSelectionEvidenceConvergenceRetrievalRequestIntent = {
    issue_ref: ref('coverage_row_intent', 'coverage_challenge'),
    originating_arena_session_ref: ref('research_arena_session', 'arena_1'),
    search_intent: '  Find   direct counter evidence ',
    candidate_queries: ['failure mode', ' direct counter evidence ', 'failure mode'],
    expected_decision_effect: ' Recheck required challenge coverage ',
    corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_1'),
    corpus_manifest_hash: 'manifest-hash-1',
  };

  const canonical = canonicalizeEvidenceConvergenceRequest(input);
  const reordered = canonicalizeEvidenceConvergenceRequest({
    ...input,
    search_intent: 'find direct counter evidence',
    candidate_queries: ['direct counter evidence', 'failure mode'],
    expected_decision_effect: 'recheck required challenge coverage',
  });
  const explicitNullVersions = canonicalizeEvidenceConvergenceRequest({
    ...input,
    issue_ref: { ...input.issue_ref, version_id: null },
    originating_arena_session_ref: { ...input.originating_arena_session_ref, version_id: null },
    corpus_manifest_ref: { ...input.corpus_manifest_ref, version_id: null },
  });

  assert.deepEqual(canonical, reordered);
  assert.deepEqual(canonical, explicitNullVersions);
  assert.deepEqual(canonical.strategy_identity_payload.candidate_queries, [
    'direct counter evidence',
    'failure mode',
  ]);
  assert.deepEqual(
    (canonical.strategy_identity_payload as unknown as Record<string, unknown>).retrieval_parameters,
    {
      profile: 'topic_exploration',
      top_k: 10,
      evidence_per_literature: 3,
      include_stale: false,
    },
  );
  assert.equal('request_key' in input, false, 'role-authored input must not carry coordinator identities');
});

test('role ingress rejects coordinator identities and linked rounds require both replay hashes', async () => {
  const intent = {
    issue_ref: ref('coverage_row_intent', 'coverage_challenge'),
    originating_arena_session_ref: ref('research_arena_session', 'arena_1'),
    search_intent: 'Find direct counter evidence',
    candidate_queries: ['direct counter evidence'],
    expected_decision_effect: 'Recheck required challenge coverage',
    corpus_manifest_ref: ref('literature_resource_pool_snapshot', 'manifest_1'),
    corpus_manifest_hash: 'manifest-hash-1',
  };
  assert.equal(await validates(topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema, intent), true);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema, {
    ...intent,
    request_key: 'role-authored-key',
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema, {
    ...intent,
    corpus_manifest_ref: ref('artifact_ref', 'manifest_1'),
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema, {
    ...intent,
    originating_arena_session_ref: ref('artifact_ref', 'arena_1'),
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRetrievalRequestIntentSchema, {
    ...intent,
    issue_ref: { ref_type: 'coverage_row_intent', ref_id: 'coverage_challenge' },
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRoundLinkSchema, {
    schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
    arena_session_ref: ref('research_arena_session', 'arena_2'),
    supersedes_arena_session_ref: ref('research_arena_session', 'arena_1'),
    evidence_delta_ref: ref('artifact_ref', 'delta_1'),
    evidence_delta_hash: 'delta-hash-1',
  }), false);
});

test('claim admission requires exact request, run, source hash, and closed claim fields', async () => {
  const admission = {
    schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CLAIM_ADMISSION_SCHEMA_VERSION,
    request_ref: ref('search_plan_recheck_request', 'request_1'),
    search_run_ref: ref('search_run', 'run_1'),
    query: 'direct counter evidence',
    literature_ref: ref('literature_record', 'lit_1'),
    chunk_ref: ref('fulltext_paragraph', 'paragraph_1'),
    chunk_hash: 'a'.repeat(64),
    evidence_role: 'challenge',
    source_statement: 'The reported failure persists under distribution shift.',
    normalized_statement: null,
    interpretation_payload: {},
    extraction_confidence: 0.9,
  };

  assert.equal(await validates(topicSelectionEvidenceConvergenceClaimAdmissionSchema, admission), true);
  assert.equal(await validates(topicSelectionEvidenceConvergenceClaimAdmissionSchema, {
    ...admission,
    request_key: 'role-authored-key',
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceClaimAdmissionSchema, {
    ...admission,
    chunk_hash: 'not-a-sha256',
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceClaimAdmissionSchema, {
    ...admission,
    search_run_ref: ref('artifact_ref', 'run_1'),
  }), false);
});

test('linked-round role output is support-only and cannot author Human or gate state', async () => {
  const output = {
    schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLE_OUTPUT_SCHEMA_VERSION,
    participant_role: 'synthesis_arbiter',
    issue_ref: ref('coverage_row_intent', 'coverage_challenge'),
    evidence_map_ref: ref('evidence_map', 'map_2'),
    evidence_delta_ref: ref('artifact_ref', 'delta_1'),
    semantic_position: {
      summary: 'The new claim is relevant enough to re-run the same deterministic gate.',
      recommended_disposition: 'recheck_same_gate',
      confidence: 0.8,
    },
    cited_evidence_unit_refs: [ref('evidence_unit', 'unit_2')],
    unresolved_issue_codes: [],
    support_only: true,
  };

  assert.equal(await validates(topicSelectionEvidenceConvergenceRoundRoleOutputSchema, output), true);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRoundRoleOutputSchema, {
    ...output,
    human_decision: 'advance',
  }), false);
  assert.equal(await validates(topicSelectionEvidenceConvergenceRoundRoleOutputSchema, {
    ...output,
    semantic_position: { ...output.semantic_position, recommended_disposition: 'pass_gate' },
  }), false);
});

test('execution boundaries and unchanged no-delta strategies halt unresolved, never pass a gate', () => {
  assert.deepEqual(evaluateEvidenceConvergenceBoundary({
    policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
    orchestration_steps: 1,
    linked_rounds: 1,
    elapsed_ms: 10,
    accumulated_cost_microusd: 1,
    execution_completed: true,
    material_delta: false,
    strategy_changed: false,
  }), {
    disposition: 'saturated_unresolved',
    reason_codes: ['UNCHANGED_STRATEGY_NO_MATERIAL_DELTA'],
  });

  const exhausted = evaluateEvidenceConvergenceBoundary({
    policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
    orchestration_steps: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_orchestration_steps_per_issue,
    linked_rounds: 1,
    elapsed_ms: 10,
    accumulated_cost_microusd: 1,
    execution_completed: false,
    material_delta: false,
    strategy_changed: true,
  });
  assert.equal(exhausted.disposition, 'boundary_exhausted_unresolved');
  assert.deepEqual(exhausted.reason_codes, ['MAX_ORCHESTRATION_STEPS_EXHAUSTED']);
  assert.equal('pass' in exhausted, false);

  const boundaryCases = [
    {
      override: { linked_rounds: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_linked_rounds_per_issue },
      reason: 'MAX_LINKED_ROUNDS_EXHAUSTED',
    },
    {
      override: { elapsed_ms: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_elapsed_ms_per_issue },
      reason: 'MAX_ELAPSED_TIME_EXHAUSTED',
    },
    {
      override: {
        accumulated_cost_microusd:
          TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_accumulated_cost_microusd_per_issue,
      },
      reason: 'MAX_ACCUMULATED_COST_EXHAUSTED',
    },
  ] as const;
  for (const boundaryCase of boundaryCases) {
    const result = evaluateEvidenceConvergenceBoundary({
      policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
      orchestration_steps: 1,
      linked_rounds: 1,
      elapsed_ms: 10,
      accumulated_cost_microusd: 1,
      execution_completed: false,
      material_delta: false,
      strategy_changed: true,
      ...boundaryCase.override,
    });
    assert.equal(result.disposition, 'boundary_exhausted_unresolved');
    assert.deepEqual(result.reason_codes, [boundaryCase.reason]);
    assert.equal('pass' in result, false);
  }
});

test('delta, route, and linked-round contracts preserve immutable replay lineage', () => {
  const delta: TopicSelectionEvidenceDeltaArtifact = {
    schema_version: TOPIC_SELECTION_EVIDENCE_DELTA_SCHEMA_VERSION,
    issue_refs: [ref('coverage_row_intent', 'coverage_challenge')],
    predecessor_evidence_map_ref: ref('evidence_map', 'map_1'),
    admitted_evidence_unit_refs: [ref('evidence_unit', 'unit_2')],
    changed_claim_refs: [ref('evidence_claim', 'claim_2')],
    negative_coverage_changes: [],
    source_health_changes: [],
    conflict_changes: [ref('evidence_conflict_set', 'conflict_2')],
    decision_relevance: 'May satisfy required challenge coverage.',
    material: true,
  };
  const route: TopicSelectionResolutionRouteArtifact = {
    schema_version: TOPIC_SELECTION_RESOLUTION_ROUTE_SCHEMA_VERSION,
    issue_ref: ref('coverage_row_intent', 'coverage_challenge'),
    owning_stage: 'evidence_landscape',
    route_kind: 'retrieve_and_recheck',
    target_ref: ref('search_plan', 'search_plan_1'),
    required_delta: 'Admit direct counter evidence for the missing required row.',
    recheck_gate_key: 'topic-selection.evidence-landscape-ready',
    authority_boundary: 'deterministic_gate_then_strict_human',
  };
  const round: TopicSelectionEvidenceConvergenceRoundLink = {
    schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
    arena_session_ref: ref('research_arena_session', 'arena_2'),
    supersedes_arena_session_ref: ref('research_arena_session', 'arena_1'),
    parent_transcript_hash: 'transcript-hash-1',
    evidence_delta_ref: ref('artifact_ref', 'delta_1'),
    evidence_delta_hash: 'delta-hash-1',
  };

  assert.equal(delta.material, true);
  assert.equal(route.owning_stage, 'evidence_landscape');
  assert.equal(round.supersedes_arena_session_ref.ref_id, 'arena_1');
  assert.equal(round.parent_transcript_hash, 'transcript-hash-1');
});
