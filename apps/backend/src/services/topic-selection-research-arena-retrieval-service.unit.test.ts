import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { TopicSelectionResearchArenaRetrievalService } from './topic-selection-research-arena-retrieval-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const NOW = '2026-08-28T00:00:00.000Z';

function ref(refType: string, refId: string, versionId?: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_1',
    version_id: versionId ?? null,
  };
}

function currentMap(): TopicSelectionEvidenceMapRecord {
  return {
    evidence_map_id: 'map_1', workspace_id: null, title_card_id: 'title_1', evidence_map_version: 'v1',
    status: 'ready', review_status: 'machine_checked', freshness_status: 'current',
    search_run_ref: ref('search_run', 'source_run'), search_plan_ref: ref('search_plan', 'plan_1'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_1'),
    unit_count: 1, support_unit_count: 1, challenge_unit_count: 0, baseline_unit_count: 0,
    context_unit_count: 0, digest_payload: {}, stale_reason_codes: [], artifact_refs: [],
    created_by: 'system', created_at: NOW,
  };
}

function evidenceUnit(): TopicSelectionEvidenceUnitRecord {
  return {
    evidence_unit_id: 'unit_1', workspace_id: null, title_card_id: 'title_1', evidence_map_id: 'map_1',
    evidence_map_version: 'v1', search_run_ref: ref('search_run', 'source_run'),
    search_plan_ref: ref('search_plan', 'plan_1'),
    literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_1'),
    coverage_row_intent_ref: null, literature_ref: ref('literature_record', 'lit_1'), source_refs: [],
    locator: {
      locator_type: 'paragraph', locator_ref: ref('fulltext_paragraph', 'paragraph_1'),
      literature_ref: ref('literature_record', 'lit_1'), source_ref: ref('literature_source', 'source_1'),
      paragraph_ref: ref('fulltext_paragraph', 'paragraph_1'),
    },
    evidence_role: 'support', source_attribution_kind: 'source_claim',
    source_statement: 'The mechanism separates adjacent effects.', interpretation_payload: {},
    extraction_confidence: 0.9, abstract_only: false, review_status: 'machine_checked',
    freshness_status: 'current', issue_codes: [], created_by: 'system', created_at: NOW,
  };
}

function retrieval(literatureId = 'lit_1'): LiteratureRetrieveResponse {
  return {
    items: [{
      literature_id: literatureId,
      canonical_work_key: `work:${literatureId}`,
      title: 'Retrieved work',
      embedding_version_id: 'embedding_v1',
      retrieval_profile: 'topic_exploration',
      is_stale: false,
      warnings: [],
      hybrid_score: 0.9,
      vector_score: 0.8,
      lexical_score: 0.7,
      evidence_chunks: [{
        chunk_id: 'chunk_1', chunk_type: 'fulltext_paragraph',
        text: 'The mechanism separates adjacent effects.', start_offset: 0, end_offset: 41,
        source_refs: [{ ref_type: 'paragraph', ref_id: 'paragraph_1', paragraph_id: 'paragraph_1' }],
        metadata: { paragraph_id: 'paragraph_1' }, hybrid_score: 0.9, vector_score: 0.8, lexical_score: 0.7,
        score_breakdown: { vector: 0.8, lexical: 0.7, metadata: 0.1, profile_boost: 0.05 },
      }],
    }],
    meta: {
      profile: 'topic_exploration', query_tokens: ['mechanism'], degraded_mode: false,
      freshness_warnings: [], profiles_used: [], skipped_profiles: [], query_embedding_telemetry: null,
    },
  };
}

function fixture(response: LiteratureRetrieveResponse, snapshotTitleCardId = 'title_1') {
  const recordedSearchRuns: Array<Record<string, unknown>> = [];
  const recordedArtifacts: Array<Record<string, unknown>> = [];
  const resolverInputs: Array<Record<string, unknown>> = [];
  const map = currentMap();
  const unit = evidenceUnit();
  const service = new TopicSelectionResearchArenaRetrievalService({
    snapshotReader: {
      getInputSnapshot: async () => ({
        input_snapshot_id: 'arena_snapshot_1', workspace_id: null,
        title_card_id: snapshotTitleCardId, target_ref: ref('validated_need', 'need_1'),
        context_policy_version_id: null, policy_version: null, snapshot_hash: 'a'.repeat(64),
        source_refs: [], permission_refs: [], payload: {}, created_by: 'system', created_at: NOW,
      }),
    },
    retriever: {
      retrieve: async (_request: LiteratureRetrieveRequest) => response,
    },
    evidenceMapRepository: {
      listEvidenceMapsByTitleCardId: async () => [map],
      listEvidenceUnitsByEvidenceMapId: async () => [unit],
    },
    searchRunRecorder: {
      recordSearchRun: async (input) => {
        recordedSearchRuns.push(input);
        return { search_run: {
          search_run_id: 'arena_search_run_1', workspace_id: null, title_card_id: 'title_1',
          search_plan_ref: ref('search_plan', 'plan_1'),
          literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'snapshot_1'),
          run_kind: 'planned_search', run_status: 'succeeded', query_provenance: [],
          result_accounting: { total_result_count: 1, unique_literature_count: 1, duplicate_result_count: 0, failed_source_count: 0, skipped_source_count: 0 },
          source_health_summary: {}, dedup_summary: {}, evidence_map_input_refs: [], artifact_refs: [],
          started_at: NOW, finished_at: NOW, created_by: 'system', created_at: NOW,
        } };
      },
    },
    evidencePacketResolver: {
      resolve: async (input) => {
        resolverInputs.push(input as unknown as Record<string, unknown>);
        const body = {
          schema_version: 'TopicSelectionResearchEvidencePacket@v1' as const,
          title_card_id: input.title_card_id,
          participant_role: input.participant_role,
          query_intent: input.query_intent,
          items: [{
            evidence_unit_ref: input.evidence_unit_refs[0]!,
            evidence_map_ref: ref('evidence_map', 'map_1', 'v1'),
            literature_ref: ref('literature_record', 'lit_1'), evidence_role: 'support' as const,
            relation_to_target_claim: 'supports' as const,
            source_statement: 'The mechanism separates adjacent effects.',
            resolved_excerpt: 'The mechanism separates adjacent effects.',
            excerpt_hash: sha256Text('The mechanism separates adjacent effects.'),
            resolved_locator: {
              locator_type: 'paragraph' as const, literature_id: 'lit_1', document_id: 'doc_1',
              content_row_id: 'paragraph_row_1', parser_ref_id: 'paragraph_1', checksum: null,
            },
            freshness: { status: 'current' as const, retrieval_readiness_reason: 'EVIDENCE_READY' },
            quote_integrity: 'exact_match' as const, issue_codes: [],
          }],
          source_refs: input.evidence_unit_refs,
          total_excerpt_chars: 41,
        };
        return { ...body, packet_hash: sha256Text(stableStringify(body)) };
      },
    },
    artifactRecorder: {
      recordArtifactRef: async (input) => {
        recordedArtifacts.push(input);
        return {
          artifact_ref_id: 'packet_artifact_1', workspace_id: null, title_card_id: 'title_1',
          artifact_kind: 'structured_output', storage_kind: 'inline', uri: null,
          payload: input.payload ?? null, checksum: input.checksum ?? null, byte_size: null,
          mime_type: 'application/json', workflow_run_id: null, input_snapshot_id: 'arena_snapshot_1',
          created_by: 'system', created_at: NOW,
        } satisfies TopicSelectionArtifactRefRecord;
      },
    },
  });
  return { recordedArtifacts, recordedSearchRuns, resolverInputs, service };
}

const request = {
  schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1' as const,
  title_card_id: 'title_1',
  arena_input_snapshot_id: 'arena_snapshot_1',
  participant_role: 'opportunity_scout' as const,
  query_intent: {
    intent_type: 'context' as const,
    query: 'Which adjacent mechanism is outside the inherited framing?',
    rationale: 'Search beyond the current summary.',
    target_claim: 'A distinct mechanism is visible.',
  },
  search_plan_id: 'plan_1',
  literature_snapshot_id: 'snapshot_1',
  coverage_row_intent_id: 'coverage_1',
};

test('role retrieval records chunk-level SearchRun provenance and materializes an exact EvidencePacket artifact', async () => {
  const { recordedArtifacts, recordedSearchRuns, resolverInputs, service } = fixture(retrieval());
  const result = await service.prepare(request);
  assert.equal(result.status, 'ready');
  assert.equal(result.search_run_ref.ref_id, 'arena_search_run_1');
  assert.equal(result.retrieval_provenance?.hits[0]?.chunk_id, 'chunk_1');
  assert.equal(result.evidence_packet_artifact_ref?.ref_id, 'packet_artifact_1');
  assert.deepEqual((resolverInputs[0]?.evidence_unit_refs as TopicSelectionFunctionalRef[]).map((item) => item.ref_id), ['unit_1']);
  assert.equal(recordedSearchRuns[0]?.query_provenance !== undefined, true);
  assert.equal(recordedSearchRuns[0]?.run_status, 'succeeded');
  assert.deepEqual(
    (recordedSearchRuns[0]?.evidence_map_input_refs as TopicSelectionFunctionalRef[]).map((item) => item.ref_type),
    ['fulltext_paragraph'],
  );
  assert.deepEqual(recordedSearchRuns[0]?.coverage_observations, [{
    coverage_row_intent_id: 'coverage_1',
    status: 'succeeded',
    result_count: 1,
    source_count: 1,
    missing_reason_codes: [],
    notes: 'Arena role-specific product retrieval.',
  }]);
  assert.equal(recordedArtifacts[0]?.checksum, result.evidence_packet_hash);
});

test('role retrieval stops for EvidenceMap materialization when out-of-map hits have no reviewed EvidenceUnits', async () => {
  const { recordedArtifacts, recordedSearchRuns, resolverInputs, service } = fixture(retrieval('lit_outside'));
  const result = await service.prepare(request);
  assert.equal(result.status, 'requires_evidence_materialization');
  assert.deepEqual(result.unresolved_literature_refs.map((item) => item.ref_id), ['lit_outside']);
  assert.equal(recordedSearchRuns[0]?.run_status, 'partial');
  assert.equal(resolverInputs.length, 0);
  assert.equal(recordedArtifacts.length, 0);
});

test('role retrieval rejects literature hits without claim-bearing chunk provenance', async () => {
  const response = retrieval();
  response.items[0]!.evidence_chunks = [];
  const { recordedArtifacts, resolverInputs, service } = fixture(response);
  await assert.rejects(
    service.prepare(request),
    (error: unknown) => error instanceof Error && /claim-bearing chunks/u.test(error.message),
  );
  assert.equal(resolverInputs.length, 0);
  assert.equal(recordedArtifacts.length, 0);
});

test('role retrieval does not substitute an unrelated EvidenceUnit from the same literature', async () => {
  const response = retrieval();
  response.items[0]!.evidence_chunks[0]!.text = 'A different result from another paragraph.';
  response.items[0]!.evidence_chunks[0]!.source_refs = [{
    ref_type: 'paragraph', ref_id: 'paragraph_other', paragraph_id: 'paragraph_other',
  }];
  response.items[0]!.evidence_chunks[0]!.metadata = { paragraph_id: 'paragraph_other' };
  const { recordedArtifacts, resolverInputs, service } = fixture(response);
  const result = await service.prepare(request);
  assert.equal(result.status, 'requires_evidence_materialization');
  assert.deepEqual(result.unresolved_literature_refs.map((item) => item.ref_id), ['lit_1']);
  assert.equal(resolverInputs.length, 0);
  assert.equal(recordedArtifacts.length, 0);
});

test('role retrieval records degraded product retrieval as a partial SearchRun', async () => {
  const response = retrieval();
  response.meta.degraded_mode = true;
  const { recordedSearchRuns, service } = fixture(response);
  const result = await service.prepare(request);
  assert.equal(result.status, 'ready');
  assert.equal(recordedSearchRuns[0]?.run_status, 'partial');
  assert.deepEqual(
    (recordedSearchRuns[0]?.coverage_observations as Array<{ missing_reason_codes: string[] }>)[0]?.missing_reason_codes,
    ['RETRIEVAL_DEGRADED'],
  );
});

test('role retrieval rejects an arena input snapshot from another title-card scope', async () => {
  const { service } = fixture(retrieval(), 'title_other');
  await assert.rejects(
    service.prepare(request),
    (error: unknown) => error instanceof Error && /different scope/u.test(error.message),
  );
});
