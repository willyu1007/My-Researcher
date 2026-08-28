import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { LiteratureRecord } from '../repositories/literature-repository.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';
import { TopicSelectionResearchArenaRetrievalService } from './topic-selection-research-arena-retrieval-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const NOW = '2026-08-29T00:00:00.000Z';

test('role evidence preparation composes with the real SearchRun gate for ready and out-of-map results', async () => {
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const now = () => NOW;
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literature = new InMemoryLiteratureRepository();
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, { idFactory, now });
  const searchRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const searchResources = new TopicSelectionSearchResourceService(
    searchRepository,
    controlPlane,
    titleCards,
    literature,
    { idFactory, now },
  );
  const evidenceMaps = new InMemoryTopicSelectionEvidenceMapRepository();
  const titleCard = await titleCards.createTitleCard({
    working_title: 'Arena retrieval integration',
    brief: 'Verify role-specific retrieval against the canonical SearchRun gate.',
  });
  const titleCardId = titleCard.title_card_id;
  const ref = (refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef => ({
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  });
  const record: LiteratureRecord = {
    id: 'lit_1', title: 'Mapped work', abstractText: 'Mapped claim.', keyContentDigest: 'Mapped claim.',
    authors: ['A. Researcher'], year: 2026, doiNormalized: null, arxivId: null,
    normalizedTitle: 'mapped work', titleAuthorsYearHash: 'mapped-work-hash', rightsClass: 'OA',
    tags: ['arena'], activeEmbeddingVersionId: null, createdAt: NOW, updatedAt: NOW,
  };
  await literature.createLiterature(record);
  await literature.upsertLiteratureSource({
    id: 'source_1', literatureId: 'lit_1', provider: 'manual', sourceItemId: 'source-item-1',
    sourceUrl: 'file://mapped.pdf', rawPayload: {}, fetchedAt: NOW,
  });
  await literature.upsertPipelineState({
    id: 'pipeline_1', literatureId: 'lit_1', citationComplete: true, abstractReady: true,
    keyContentReady: true, dedupStatus: 'unique', updatedAt: NOW,
  });
  await titleCards.updateEvidenceBasket(titleCardId, { add_literature_ids: ['lit_1'] });
  const seed = await searchResources.createTopicSeedFromTitleCard({ title_card_id: titleCardId });
  const snapshot = await searchResources.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
  });
  const plan = await searchResources.createSearchPlan({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    literature_resource_pool_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
    query_intents: ['Find adjacent mechanisms.'],
    coverage_intents: [{
      coverage_key: 'arena-scout', intent_type: 'context', query: 'Find adjacent mechanisms.',
      expected_evidence_role: 'context',
    }],
  });
  await evidenceMaps.createEvidenceMapWithRecords({
    evidence_map: {
      evidence_map_id: 'map_1', workspace_id: null, title_card_id: titleCardId, evidence_map_version: 'v1',
      status: 'ready', review_status: 'machine_checked', freshness_status: 'current',
      search_run_ref: ref('search_run', 'source_run'), search_plan_ref: ref('search_plan', plan.search_plan.search_plan_id),
      literature_snapshot_ref: ref('literature_resource_pool_snapshot', snapshot.literature_resource_pool_snapshot_id),
      unit_count: 1, support_unit_count: 1, challenge_unit_count: 0, baseline_unit_count: 0,
      context_unit_count: 0, digest_payload: {}, stale_reason_codes: [], artifact_refs: [],
      created_by: 'system', created_at: NOW,
    },
    evidence_units: [{
      evidence_unit_id: 'unit_1', workspace_id: null, title_card_id: titleCardId,
      evidence_map_id: 'map_1', evidence_map_version: 'v1',
      search_run_ref: ref('search_run', 'source_run'), search_plan_ref: ref('search_plan', plan.search_plan.search_plan_id),
      literature_snapshot_ref: ref('literature_resource_pool_snapshot', snapshot.literature_resource_pool_snapshot_id),
      coverage_row_intent_ref: null, literature_ref: ref('literature_record', 'lit_1'), source_refs: [],
      locator: {
        locator_type: 'paragraph', locator_ref: ref('fulltext_paragraph', 'paragraph_1'),
        literature_ref: ref('literature_record', 'lit_1'), source_ref: ref('literature_source', 'source_1'),
        paragraph_ref: ref('fulltext_paragraph', 'paragraph_1'),
      },
      evidence_role: 'support', source_attribution_kind: 'source_claim', source_statement: 'Mapped claim.',
      interpretation_payload: {}, extraction_confidence: 0.9, abstract_only: false,
      review_status: 'machine_checked', freshness_status: 'current', issue_codes: [],
      created_by: 'system', created_at: NOW,
    }],
    typed_links: [], clusters: [], patterns: [], conflict_sets: [],
  });
  const arenaSnapshot = await controlPlane.compileInputSnapshot({
    title_card_id: titleCardId,
    target_ref: ref('validated_need', 'need_1'),
    source_refs: [ref('evidence_map', 'map_1', 'v1')],
    payload: { arena_kind: 'gap_portfolio' },
  });
  const retrievalFor = (literatureId: string) => ({
    items: [{
      literature_id: literatureId, canonical_work_key: `work:${literatureId}`, title: 'Retrieved work',
      embedding_version_id: 'embedding_v1', retrieval_profile: 'topic_exploration' as const,
      is_stale: false, warnings: [], hybrid_score: 0.9, vector_score: 0.8, lexical_score: 0.7,
      evidence_chunks: [{
        chunk_id: `chunk_${literatureId}`, chunk_type: 'fulltext_paragraph' as const, text: 'Mapped claim.',
        start_offset: 0, end_offset: 13,
        source_refs: [{ ref_type: 'paragraph', ref_id: 'paragraph_1', paragraph_id: 'paragraph_1' }],
        metadata: { paragraph_id: 'paragraph_1' }, hybrid_score: 0.9,
        vector_score: 0.8, lexical_score: 0.7,
        score_breakdown: { vector: 0.8, lexical: 0.7, metadata: 0.1, profile_boost: 0.05 },
      }],
    }],
    meta: {
      profile: 'topic_exploration' as const, query_tokens: ['mechanism'], degraded_mode: false,
      freshness_warnings: [], profiles_used: [], skipped_profiles: [], query_embedding_telemetry: null,
    },
  });
  let retrievedLiteratureId = 'lit_1';
  const service = new TopicSelectionResearchArenaRetrievalService({
    retriever: { retrieve: async () => retrievalFor(retrievedLiteratureId) },
    snapshotReader: controlPlane,
    evidenceMapRepository: evidenceMaps,
    searchRunRecorder: searchResources,
    evidencePacketResolver: {
      resolve: async (input) => {
        const body = {
          schema_version: 'TopicSelectionResearchEvidencePacket@v1' as const,
          title_card_id: titleCardId, participant_role: input.participant_role,
          query_intent: input.query_intent, items: [{
            evidence_unit_ref: input.evidence_unit_refs[0]!, evidence_map_ref: ref('evidence_map', 'map_1', 'v1'),
            literature_ref: ref('literature_record', 'lit_1'), evidence_role: 'support' as const,
            relation_to_target_claim: 'supports' as const, source_statement: 'Mapped claim.',
            resolved_excerpt: 'Mapped claim.', excerpt_hash: sha256Text('Mapped claim.'),
            resolved_locator: {
              locator_type: 'paragraph' as const, literature_id: 'lit_1', document_id: 'document_1',
              content_row_id: 'paragraph_row_1', parser_ref_id: 'paragraph_1', checksum: null,
            },
            freshness: { status: 'current' as const, retrieval_readiness_reason: 'EVIDENCE_READY' },
            quote_integrity: 'exact_match' as const, issue_codes: [],
          }], source_refs: input.evidence_unit_refs, total_excerpt_chars: 13,
        };
        return { ...body, packet_hash: sha256Text(stableStringify(body)) };
      },
    },
    artifactRecorder: controlPlane,
  });
  const request = {
    schema_version: 'TopicSelectionResearchArenaRoleEvidencePreparationRequest@v1' as const,
    title_card_id: titleCardId, arena_input_snapshot_id: arenaSnapshot.input_snapshot_id,
    participant_role: 'opportunity_scout' as const,
    query_intent: {
      intent_type: 'context' as const, query: 'Find adjacent mechanisms.',
      rationale: 'Search beyond the inherited framing.', target_claim: 'A distinct mechanism exists.',
    },
    search_plan_id: plan.search_plan.search_plan_id,
    literature_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
    coverage_row_intent_id: plan.coverage_row_intents[0]!.coverage_row_intent_id,
  };

  const ready = await service.prepare(request);
  assert.equal(ready.status, 'ready');
  assert.equal((await searchRepository.findSearchRunById(ready.search_run_ref.ref_id))?.run_status, 'succeeded');

  retrievedLiteratureId = 'lit_outside';
  const materialization = await service.prepare(request);
  assert.equal(materialization.status, 'requires_evidence_materialization');
  assert.equal((await searchRepository.findSearchRunById(materialization.search_run_ref.ref_id))?.run_status, 'partial');
});
