import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import type { LiteratureRecord } from '../repositories/literature-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';

function makeService(options: ConstructorParameters<typeof TopicSelectionSearchResourceService>[4] = {}) {
  let sequence = 0;
  const now = () => '2026-05-13T00:00:00.000Z';
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literature = new InMemoryLiteratureRepository();
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, { idFactory, now });
  const searchResourceRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const service = new TopicSelectionSearchResourceService(
    searchResourceRepository,
    controlPlane,
    titleCards,
    literature,
    { idFactory, now, ...options },
  );
  return {
    controlPlaneRepository,
    literature,
    searchResourceRepository,
    service,
    titleCards,
  };
}

function ref(refType: string, refId: string, titleCardId = 'title_card_1'): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
  };
}

function makeLiterature(id: string): LiteratureRecord {
  return {
    id,
    title: `Paper ${id}`,
    abstractText: 'A paper about robust literature retrieval.',
    keyContentDigest: 'problem: brittle retrieval; contribution: robust evidence indexing',
    authors: ['A. Researcher'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: `paper ${id}`,
    titleAuthorsYearHash: `${id}-hash`,
    rightsClass: 'OA',
    tags: ['retrieval'],
    activeEmbeddingVersionId: null,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
  };
}

async function seedTitleCardWithLiterature(
  options: ConstructorParameters<typeof TopicSelectionSearchResourceService>[4] = {},
) {
  const ctx = makeService(options);
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Robust evidence retrieval',
    brief: 'Find unmet needs in evidence-grounded literature retrieval.',
  });
  await ctx.literature.createLiterature(makeLiterature('lit_001'));
  await ctx.literature.upsertLiteratureSource({
    id: 'source_001',
    literatureId: 'lit_001',
    provider: 'manual',
    sourceItemId: 'manual-lit-001',
    sourceUrl: 'file://lit_001.pdf',
    rawPayload: {},
    fetchedAt: '2026-05-13T00:00:00.000Z',
  });
  await ctx.literature.upsertPipelineState({
    id: 'pipeline_state_001',
    literatureId: 'lit_001',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: '2026-05-13T00:00:00.000Z',
  });
  await ctx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: ['lit_001'],
  });
  return { ...ctx, titleCard };
}

async function createBasePlan(
  options: ConstructorParameters<typeof TopicSelectionSearchResourceService>[4] = {},
) {
  const ctx = await seedTitleCardWithLiterature(options);
  const seed = await ctx.service.createTopicSeedFromTitleCard({
    title_card_id: ctx.titleCard.title_card_id,
    created_by: 'system',
  });
  const snapshot = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    created_by: 'system',
  });
  const plan = await ctx.service.createSearchPlan({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    literature_resource_pool_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
    query_intents: ['robust retrieval evidence gaps', 'baseline retrieval limitations'],
    must_check_constraints: ['include baseline and counter-evidence'],
    exclusion_rules: ['exclude non-CS papers'],
    coverage_intents: [
      {
        coverage_key: 'support-gap',
        intent_type: 'support',
        query: 'robust retrieval evidence gaps',
        expected_evidence_role: 'support',
      },
      {
        coverage_key: 'baseline-check',
        intent_type: 'baseline',
        query: 'baseline retrieval limitations',
        expected_evidence_role: 'baseline',
      },
    ],
    created_by: 'system',
  });
  return { ...ctx, plan, seed, snapshot };
}

test('fake v1a slice creates seed, literature snapshot, SearchPlan, SearchRun, and matrix from child records', async () => {
  const ctx = await createBasePlan();
  const supportIntent = ctx.plan.coverage_row_intents[0]!;
  const searchRun = await ctx.service.recordSearchRun({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    result_accounting: {
      total_result_count: 3,
      unique_literature_count: 1,
      duplicate_result_count: 1,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {
      source_count: 1,
      degraded_source_count: 0,
      warning_codes: [],
    },
    dedup_summary: {
      canonical_work_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
    },
    evidence_map_input_refs: [
      ref('literature_record', 'lit_001', ctx.titleCard.title_card_id),
      ref('literature_source', 'source_001', ctx.titleCard.title_card_id),
    ],
    raw_log_artifact: {
      provider: 'fixture',
      hits: ['lit_001'],
    },
    coverage_observations: [
      {
        coverage_row_intent_id: supportIntent.coverage_row_intent_id,
        status: 'succeeded',
        result_count: 3,
        source_count: 1,
      },
    ],
    evidence_bindings: [
      {
        coverage_row_intent_id: supportIntent.coverage_row_intent_id,
        literature_ref: ref('literature_record', 'lit_001', ctx.titleCard.title_card_id),
        source_refs: [ref('literature_source', 'source_001', ctx.titleCard.title_card_id)],
        binding_kind: 'retrieval_hit',
        result_rank: 1,
      },
    ],
    coverage_assessments: [
      {
        coverage_row_intent_id: supportIntent.coverage_row_intent_id,
        verdict: 'satisfied',
        confidence: 0.82,
        assessed_by: 'system',
      },
    ],
    created_by: 'system',
  });

  const matrix = await ctx.service.getCoverageMatrix(ctx.plan.search_plan.search_plan_id);

  assert.equal(ctx.seed.title_card_id, ctx.titleCard.title_card_id);
  assert.equal(ctx.snapshot.literature_refs[0]?.ref_id, 'lit_001');
  assert.equal(ctx.plan.search_plan.literature_snapshot_ref.ref_id, ctx.snapshot.literature_resource_pool_snapshot_id);
  assert.equal(searchRun.search_run.search_plan_ref.ref_id, ctx.plan.search_plan.search_plan_id);
  assert.equal(searchRun.search_run.artifact_refs.length, 1);
  assert.equal(matrix.rows.length, 2);
  assert.equal(matrix.summary.satisfied_count, 1);
  assert.equal(matrix.summary.unassessed_count, 1);
  assert.equal(matrix.rows[0]?.evidence_bindings[0]?.literature_ref.ref_id, 'lit_001');
});

test('SearchPlan creation requires concrete seed and literature snapshot refs', async () => {
  const ctx = await seedTitleCardWithLiterature();

  await assert.rejects(
    () => ctx.service.createSearchPlan({
      title_card_id: ctx.titleCard.title_card_id,
      topic_seed_id: 'missing_seed',
      literature_resource_pool_snapshot_id: 'missing_snapshot',
      query_intents: ['gap query'],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 404
      && error.message.includes('TopicSeed missing_seed not found'),
  );
});

test('TopicSeed creation requires non-empty final intent summary', async () => {
  const ctx = makeService();
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Empty intent source',
    brief: '',
  });

  await assert.rejects(
    () => ctx.service.createTopicSeedFromTitleCard({
      title_card_id: titleCard.title_card_id,
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(await ctx.searchResourceRepository.findTopicSeedById('topic_seed_1'), null);
});

test('TopicSeed preserves semantic preparation refs in record and input snapshot', async () => {
  const ctx = makeService();
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Prepared intent source',
    brief: 'Use a prepared intent draft to seed topic selection.',
  });
  const preparationRef = ref('topic_seed_intent_draft', 'intent_draft_001', titleCard.title_card_id);

  const seed = await ctx.service.createTopicSeedFromTitleCard({
    title_card_id: titleCard.title_card_id,
    intent_summary: 'Prepared intent summary.',
    intent_preparation_refs: [preparationRef],
    created_by: 'system',
  });

  assert.equal(seed.source_refs.some((sourceRef) => sourceRef.ref_id === 'intent_draft_001'), true);
  const inputSnapshot = await ctx.controlPlaneRepository.findInputSnapshotById(seed.input_snapshot_id!);
  assert.equal(inputSnapshot?.source_refs.some((sourceRef) => sourceRef.ref_id === 'intent_draft_001'), true);
  assert.deepEqual(inputSnapshot?.payload?.intent_preparation_refs, [preparationRef]);
});

test('LiteratureResourcePoolSnapshot records maturity warnings without blocking traceable resources', async () => {
  const ctx = makeService();
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Immature resource pool',
    brief: 'Snapshot traceable but immature resources.',
  });
  await ctx.literature.createLiterature(makeLiterature('lit_immature'));
  const immature = (await ctx.literature.findLiteratureById('lit_immature'))!;
  await ctx.literature.updateLiterature({
    ...immature,
    abstractText: null,
    keyContentDigest: null,
  });
  await ctx.literature.upsertPipelineState({
    id: 'pipeline_state_immature',
    literatureId: 'lit_immature',
    citationComplete: false,
    abstractReady: false,
    keyContentReady: false,
    dedupStatus: 'duplicate',
    updatedAt: '2026-05-13T00:00:00.000Z',
  });
  await ctx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: ['lit_immature'],
  });
  const seed = await ctx.service.createTopicSeedFromTitleCard({
    title_card_id: titleCard.title_card_id,
    intent_summary: 'Trace immature resources without adjudicating quality.',
    policy_version_id: 'policy-v1',
  });

  const first = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    policy_version_id: 'policy-v1',
  });
  const second = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    policy_version_id: 'policy-v1',
  });

  assert.deepEqual(first.literature_refs.map((item) => item.ref_id), ['lit_immature']);
  assert.equal(first.content_source_refs.length, 0);
  assert.equal(first.source_health_summary.blocked_count, 0);
  assert.deepEqual(first.source_health_summary.warning_codes, [
    'INCOMPLETE_KEY_CONTENT_READY',
    'INCOMPLETE_ABSTRACT_READY',
    'LOW_SOURCE_COUNT',
    'INCOMPLETE_PIPELINE_READY',
    'STALE_OR_DUPLICATE_PIPELINE_STATUS',
    'INCOMPLETE_FULLTEXT_READY',
  ]);
  assert.equal(first.snapshot_hash, second.snapshot_hash);
  assert.notEqual(first.literature_resource_pool_snapshot_id, second.literature_resource_pool_snapshot_id);
});

test('managed-library snapshot includes every retrieval-eligible member without requiring a title basket', async () => {
  const ctx = makeService({
    managedLibraryEligibilityResolver: {
      resolveManagedLibraryEligibility: async () => ({
        eligible_embedding_versions: [
          {
            embedding_version_id: 'embedding_2',
            literature_id: 'lit_002',
            input_checksum: 'input-2',
            index_artifact_checksum: 'index-2',
          },
          {
            embedding_version_id: 'embedding_1',
            literature_id: 'lit_001',
            input_checksum: 'input-1',
            index_artifact_checksum: 'index-1',
          },
        ],
        retrieval_stack_identity: {
          index_kind: 'pgvector',
          embedding_profile_id: 'default',
          embedding_provider: 'openai',
          embedding_model: 'text-embedding-3-small',
          embedding_dimension: 1536,
          freshness_policy: 'current_only',
          retrieval_policy_version: 'literature-retrieval.v1',
          reranker_policy_version: 'hybrid-reranker.v1',
        },
      }),
    },
  });
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Managed library manifest',
    brief: 'Use the full evidence-ready managed library.',
  });
  for (const literatureId of ['lit_001', 'lit_002']) {
    await ctx.literature.createLiterature(makeLiterature(literatureId));
    await ctx.literature.upsertPipelineState({
      id: `pipeline_${literatureId}`,
      literatureId,
      citationComplete: true,
      abstractReady: true,
      keyContentReady: true,
      dedupStatus: 'unique',
      updatedAt: '2026-05-13T00:00:00.000Z',
    });
  }
  const seed = await ctx.service.createTopicSeedFromTitleCard({
    title_card_id: titleCard.title_card_id,
  });

  const snapshot = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    source_scope: 'managed_library',
  });

  assert.deepEqual(snapshot.literature_refs.map((item) => item.ref_id), ['lit_001', 'lit_002']);
  assert.deepEqual(snapshot.corpus_manifest_members?.map((item) => item.embedding_version_ref.ref_id), [
    'embedding_1',
    'embedding_2',
  ]);
  assert.equal(snapshot.retrieval_stack_identity?.freshness_policy, 'current_only');
});

test('LiteratureResourcePoolSnapshot hash changes when policy version changes', async () => {
  const ctx = await seedTitleCardWithLiterature();
  const seed = await ctx.service.createTopicSeedFromTitleCard({
    title_card_id: ctx.titleCard.title_card_id,
    intent_summary: 'Policy-aware snapshot hash.',
    policy_version_id: 'policy-v1',
  });

  const first = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    policy_version_id: 'policy-v1',
  });
  const second = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_id: seed.topic_seed_id,
    policy_version_id: 'policy-v2',
  });

  assert.notEqual(first.snapshot_hash, second.snapshot_hash);
});

test('SearchRun cannot become consumable without source health and result accounting', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: Number.NaN,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {},
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('raw search logs cannot be used as EvidenceMap authority refs', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('artifact_ref', 'raw_log_001', ctx.titleCard.title_card_id)],
      raw_log_artifact: { hits: ['lit_001'] },
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('SearchRun raw_log_artifact_ref must stay audit-only', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      raw_log_artifact_ref: ref('literature_record', 'lit_001', ctx.titleCard.title_card_id),
      coverage_observations: [{
        coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
        status: 'succeeded',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && Array.isArray((error.details as Record<string, unknown>)?.blocker_codes)
      && ((error.details as Record<string, unknown>).blocker_codes as string[])
        .includes('RAW_LOG_ARTIFACT_REF_INVALID'),
  );
});

test('SearchRun concrete refs and snapshot hash must match resolved authorities', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      search_plan_ref: {
        ref_type: 'search_plan',
        ref_id: ctx.plan.search_plan.search_plan_id,
        version_id: ctx.plan.search_plan.plan_version,
        title_card_id: ctx.titleCard.title_card_id,
      },
      literature_resource_pool_snapshot_ref: {
        ref_type: 'literature_resource_pool_snapshot',
        ref_id: ctx.snapshot.literature_resource_pool_snapshot_id,
        version_id: ctx.snapshot.snapshot_version,
        title_card_id: ctx.titleCard.title_card_id,
      },
      expected_literature_snapshot_hash: 'stale-snapshot-hash',
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      coverage_observations: [{
        coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
        status: 'succeeded',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('SearchRun blocks snapshot-outside literature refs in consumable input', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_outside_snapshot', ctx.titleCard.title_card_id)],
      coverage_observations: [{
        coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
        status: 'succeeded',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && Array.isArray((error.details as Record<string, unknown>)?.blocker_codes)
      && ((error.details as Record<string, unknown>).blocker_codes as string[])
        .includes('SNAPSHOT_OUTSIDE_LITERATURE_REF'),
  );
});

test('SearchRun permits locator provenance refs without treating them as raw authority', async () => {
  const ctx = await createBasePlan();

  const result = await ctx.service.recordSearchRun({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {
      source_count: 1,
    },
    evidence_map_input_refs: [
      ref('literature_record', 'lit_001', ctx.titleCard.title_card_id),
      ref('literature_source', 'source_001', ctx.titleCard.title_card_id),
      ref('fulltext_section', 'section_001', ctx.titleCard.title_card_id),
    ],
    coverage_observations: [{
      coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
      status: 'succeeded',
    }],
    evidence_bindings: [{
      coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
      literature_ref: ref('literature_record', 'lit_001', ctx.titleCard.title_card_id),
      source_refs: [
        ref('literature_source', 'source_001', ctx.titleCard.title_card_id),
        ref('fulltext_section', 'section_001', ctx.titleCard.title_card_id),
      ],
      binding_kind: 'retrieval_hit',
    }],
    created_by: 'system',
  });

  assert.equal(result.search_run.run_status, 'succeeded');
  assert.ok(result.search_run.evidence_map_input_refs.some((inputRef) => inputRef.ref_type === 'fulltext_section'));
});

test('SearchRun rejects unsupported EvidenceMap authority ref types explicitly', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('search_plan', ctx.plan.search_plan.search_plan_id, ctx.titleCard.title_card_id)],
      coverage_observations: [{
        coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
        status: 'succeeded',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && Array.isArray((error.details as Record<string, unknown>)?.blocker_codes)
      && ((error.details as Record<string, unknown>).blocker_codes as string[])
        .includes('SEARCH_RUN_UNSUPPORTED_EVIDENCE_MAP_INPUT_REF'),
  );
});

test('SearchRun coverage risk acceptances use explicit search-coverage risk refs', async () => {
  const ctx = await createBasePlan();
  const coverageRowId = ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id;

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      coverage_observations: [{
        coverage_row_intent_id: coverageRowId,
        status: 'succeeded',
      }],
      coverage_risk_acceptances: [{
        coverage_row_intent_id: coverageRowId,
        accepted_risk_ref: ref('coverage_row_intent', coverageRowId, ctx.titleCard.title_card_id),
        accepted_by: { actor_type: 'human', actor_id: 'reviewer_1' },
        rationale: 'Invalid: a coverage row is not a search-coverage risk authority.',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && Array.isArray((error.details as Record<string, unknown>)?.blocker_codes)
      && ((error.details as Record<string, unknown>).blocker_codes as string[])
        .includes('SEARCH_COVERAGE_RISK_REF_REQUIRED'),
  );

  const result = await ctx.service.recordSearchRun({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {
      source_count: 1,
    },
    evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
    coverage_observations: [{
      coverage_row_intent_id: coverageRowId,
      status: 'succeeded',
    }],
    coverage_risk_acceptances: [{
      coverage_row_intent_id: coverageRowId,
      accepted_risk_ref: ref('accepted_risk', 'accepted_risk_search_coverage_001', ctx.titleCard.title_card_id),
      accepted_by: { actor_type: 'human', actor_id: 'reviewer_1' },
      rationale: 'Proceed with explicit search coverage risk acceptance.',
    }],
    created_by: 'system',
  });

  assert.equal(result.risk_acceptances.length, 1);
  assert.equal(result.risk_acceptances[0]?.accepted_risk_ref.ref_type, 'accepted_risk');
});

test('SearchRun result accounting must reconcile unique and duplicate counts', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 1,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      coverage_observations: [{
        coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
        status: 'succeeded',
      }],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && Array.isArray((error.details as Record<string, unknown>)?.blocker_codes)
      && ((error.details as Record<string, unknown>).blocker_codes as string[])
        .includes('SEARCH_RUN_RESULT_ACCOUNTING_INCONSISTENT'),
  );
});

test('partial SearchRun accepts structured source-health warning codes', async () => {
  const ctx = await createBasePlan();

  const result = await ctx.service.recordSearchRun({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    run_status: 'partial',
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 1,
    },
    source_health_summary: {
      source_count: 1,
      warning_codes: ['LOW_SOURCE_COUNT'],
    },
    evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
    coverage_observations: [{
      coverage_row_intent_id: ctx.plan.coverage_row_intents[0]!.coverage_row_intent_id,
      status: 'partial',
      result_count: 1,
      source_count: 1,
      missing_reason_codes: ['LOW_SOURCE_COUNT'],
    }],
    created_by: 'system',
  });

  assert.equal(result.search_run.run_status, 'partial');
  assert.deepEqual(result.search_run.source_health_summary.warning_codes, ['LOW_SOURCE_COUNT']);
});

test('failed SearchRun persists as audit-only authority without EvidenceMap input refs', async () => {
  const ctx = await createBasePlan();

  const result = await ctx.service.recordSearchRun({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    run_status: 'failed',
    result_accounting: {
      total_result_count: 0,
      unique_literature_count: 0,
      duplicate_result_count: 0,
      failed_source_count: 1,
      skipped_source_count: 0,
    },
    source_health_summary: {
      failed_source_count: 1,
      error_codes: ['SEARCH_PROVIDER_FAILED'],
      failure_summary: 'Search provider failed before returning usable literature.',
    },
    evidence_map_input_refs: [],
    raw_log_artifact: {
      error_code: 'SEARCH_PROVIDER_FAILED',
    },
    created_by: 'system',
  });

  assert.equal(result.search_run.run_status, 'failed');
  assert.deepEqual(result.search_run.evidence_map_input_refs, []);
  assert.equal(result.search_run.artifact_refs.length, 1);
  const transition = await ctx.controlPlaneRepository.findChainTransitionAttemptById(
    result.search_run.transition_attempt_id!,
  );
  assert.equal(transition?.result, 'passed');
  assert.equal(transition?.state_write_intents[0]?.next_value, 'audit_only');
});

test('SearchRun coverage records must reference rows owned by the SearchPlan', async () => {
  const ctx = await createBasePlan();

  await assert.rejects(
    () => ctx.service.recordSearchRun({
      title_card_id: ctx.titleCard.title_card_id,
      search_plan_id: ctx.plan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 1,
        unique_literature_count: 1,
        duplicate_result_count: 0,
        failed_source_count: 0,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
      },
      evidence_map_input_refs: [ref('literature_record', 'lit_001', ctx.titleCard.title_card_id)],
      coverage_observations: [
        {
          coverage_row_intent_id: 'coverage_intent_from_another_plan',
          status: 'succeeded',
          result_count: 1,
          source_count: 1,
        },
      ],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && error.message.includes('coverage_intent_from_another_plan'),
  );
});

test('SearchPlanRecheckRequest accepted, reject, accepted-risk, and materialized outcomes remain traceable', async () => {
  const ctx = await createBasePlan();
  const sourceRef = ref('need_candidate', 'need_candidate_001', ctx.titleCard.title_card_id);
  const accepted = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: sourceRef,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Candidate found a useful optional expansion.',
    gap_codes: ['OPTIONAL_EXPANSION'],
  });
  const acceptedResult = await ctx.service.resolveSearchPlanRecheckRequest({
    request_id: accepted.search_plan_recheck_request_id,
    outcome: 'accepted',
    decision_summary: 'Accepted as a terminal note; no revised plan is required.',
  });
  assert.equal(acceptedResult.request.status, 'accepted');
  assert.equal(acceptedResult.request.resulting_search_plan_ref, null);
  await assert.rejects(
    () => ctx.service.resolveSearchPlanRecheckRequest({
      request_id: accepted.search_plan_recheck_request_id,
      outcome: 'materialized',
      decision_summary: 'Should not re-resolve an accepted request.',
      revised_search_plan: {
        plan_version: 'illegal-reopen',
        query_intents: ['illegal reopen'],
      },
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );

  const rejected = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: sourceRef,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Candidate found weak baseline coverage.',
    gap_codes: ['BASELINE_GAP'],
  });
  const rejectedResult = await ctx.service.resolveSearchPlanRecheckRequest({
    request_id: rejected.search_plan_recheck_request_id,
    outcome: 'rejected',
    decision_summary: 'Existing baseline row is sufficient for v1a.',
  });
  assert.equal(rejectedResult.request.status, 'rejected');
  assert.equal(rejectedResult.request.resulting_search_plan_ref, null);

  const acceptedRisk = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: sourceRef,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Coverage source is temporarily unavailable.',
    gap_codes: ['SOURCE_UNAVAILABLE'],
  });
  const acceptedRiskResult = await ctx.service.resolveSearchPlanRecheckRequest({
    request_id: acceptedRisk.search_plan_recheck_request_id,
    outcome: 'accepted_risk',
    decision_summary: 'Proceed with an explicit source-availability risk.',
    accepted_risk_refs: [ref('accepted_risk', 'risk_001', ctx.titleCard.title_card_id)],
  });
  assert.equal(acceptedRiskResult.request.status, 'accepted_risk');
  assert.equal(acceptedRiskResult.request.accepted_risk_refs[0]?.ref_id, 'risk_001');

  const materialized = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: sourceRef,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Need validation requires counter-evidence coverage.',
    gap_codes: ['COUNTER_EVIDENCE_GAP'],
  });
  const materializedResult = await ctx.service.resolveSearchPlanRecheckRequest({
    request_id: materialized.search_plan_recheck_request_id,
    outcome: 'materialized',
    decision_summary: 'Created a revised plan and follow-up SearchRun.',
    revised_search_plan: {
      plan_version: 'recheck-v1',
      query_intents: ['counter evidence robust retrieval failures'],
      coverage_intents: [
        {
          coverage_key: 'counter-evidence',
          intent_type: 'challenge',
          query: 'counter evidence robust retrieval failures',
          expected_evidence_role: 'challenge',
        },
      ],
      created_by: 'system',
    },
    follow_up_search_run: {
      run_status: 'failed',
      result_accounting: {
        total_result_count: 0,
        unique_literature_count: 0,
        duplicate_result_count: 0,
        failed_source_count: 1,
        skipped_source_count: 0,
      },
      source_health_summary: {
        source_count: 1,
        failed_source_count: 1,
        error_codes: ['SEARCH_PROVIDER_FAILED'],
        failure_summary: 'Recheck follow-up search provider failed before returning usable literature.',
      },
      evidence_map_input_refs: [],
      created_by: 'system',
    },
  });

  assert.equal(materializedResult.request.status, 'materialized');
  assert.equal(materializedResult.request.resulting_search_plan_ref?.ref_id, materializedResult.revised_search_plan?.search_plan_id);
  assert.equal(materializedResult.request.resulting_search_run_ref?.ref_id, materializedResult.follow_up_search_run?.search_run_id);
  assert.equal(materializedResult.revised_search_plan?.parent_search_plan_ref?.ref_id, ctx.plan.search_plan.search_plan_id);
  assert.equal(materializedResult.revised_search_plan?.recheck_request_ref?.ref_id, materialized.search_plan_recheck_request_id);
  assert.equal(materializedResult.follow_up_search_run?.run_kind, 'recheck_followup');
  assert.equal(materializedResult.follow_up_search_run?.run_status, 'failed');
});

test('evidence-convergence recheck requests derive coordinator identities and reuse equivalent durable work', async () => {
  const ctx = await createBasePlan({
    managedLibraryEligibilityResolver: {
      resolveManagedLibraryEligibility: async () => ({
        eligible_embedding_versions: [{
          embedding_version_id: 'embedding_1',
          literature_id: 'lit_001',
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
        },
      }),
    },
  });
  const manifest = await ctx.service.createLiteratureResourcePoolSnapshot({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_id: ctx.seed.topic_seed_id,
    source_scope: 'managed_library',
  });
  const intent = {
    issue_ref: ref('coverage_row_intent', 'coverage_challenge', ctx.titleCard.title_card_id),
    originating_arena_session_ref: ref('research_arena_session', 'arena_1', ctx.titleCard.title_card_id),
    search_intent: 'Find direct counter evidence',
    candidate_queries: ['failure mode', 'direct counter evidence'],
    expected_decision_effect: 'Recheck required challenge coverage',
    corpus_manifest_ref: ref(
      'literature_resource_pool_snapshot',
      manifest.literature_resource_pool_snapshot_id,
      ctx.titleCard.title_card_id,
    ),
    corpus_manifest_hash: manifest.snapshot_hash,
  };

  await assert.rejects(
    () => ctx.service.createSearchPlanRecheckRequest({
      title_card_id: ctx.titleCard.title_card_id,
      source_ref: intent.issue_ref,
      target_search_plan_id: ctx.plan.search_plan.search_plan_id,
      reason: 'An empty strategy must not become durable work.',
      evidence_convergence_intent: {
        ...intent,
        search_intent: '   ',
        candidate_queries: ['  '],
        expected_decision_effect: '   ',
      },
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );

  const first = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: intent.issue_ref,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Resolve missing challenge coverage.',
    evidence_convergence_intent: intent,
  });
  const replay = await ctx.service.createSearchPlanRecheckRequest({
    title_card_id: ctx.titleCard.title_card_id,
    source_ref: intent.issue_ref,
    target_search_plan_id: ctx.plan.search_plan.search_plan_id,
    reason: 'Equivalent wording should reuse the durable request.',
    evidence_convergence_intent: {
      ...intent,
      search_intent: ' find   direct counter evidence ',
      candidate_queries: ['direct counter evidence', 'failure mode', 'failure mode'],
      expected_decision_effect: ' recheck required challenge coverage ',
    },
  });

  assert.equal(replay.search_plan_recheck_request_id, first.search_plan_recheck_request_id);
  assert.match(first.request_key ?? '', /^[a-f0-9]{64}$/u);
  assert.match(first.strategy_key ?? '', /^[a-f0-9]{64}$/u);
  assert.equal(first.issue_ref?.ref_id, 'coverage_challenge');
  assert.equal(first.execution_policy?.policy_key, 'evidence-landscape-convergence.v1');
  assert.deepEqual(first.supporting_artifact_refs, []);

  const materialized = await ctx.service.resolveSearchPlanRecheckRequest({
    request_id: first.search_plan_recheck_request_id,
    outcome: 'materialized',
    decision_summary: 'Persist the replayable execution lineage.',
    revised_search_plan: {
      query_intents: ['direct counter evidence'],
      created_by: 'system',
    },
    follow_up_search_run: {
      run_status: 'failed',
      result_accounting: {
        total_result_count: 0,
        unique_literature_count: 0,
        duplicate_result_count: 0,
        failed_source_count: 1,
        skipped_source_count: 0,
      },
      source_health_summary: { error_codes: ['FIXTURE_FAILURE'] },
      evidence_map_input_refs: [],
      created_by: 'system',
    },
  });
  assert.equal(
    materialized.revised_search_plan?.literature_snapshot_ref.ref_id,
    manifest.literature_resource_pool_snapshot_id,
  );
  assert.equal(materialized.request.resulting_search_run_ref?.ref_id, materialized.follow_up_search_run?.search_run_id);
});
