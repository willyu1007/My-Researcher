import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceSourceLocator } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import type { LiteratureFulltextExtractionBundle, LiteratureRecord } from '../repositories/literature-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import type {
  MaterializeEvidenceLandscapeCheckpointInput,
  TopicSelectionResearchCheckpointService,
} from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';

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
    abstractText: 'Abstract states that retrieval evidence is brittle.',
    keyContentDigest: 'problem: brittle retrieval; limitation: missing counter-evidence',
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

function makeFulltextBundle(literatureId: string): LiteratureFulltextExtractionBundle {
  return {
    document: {
      id: 'doc_001',
      literatureId,
      sourceAssetId: 'asset_001',
      normalizedText: 'Robust retrieval evidence remains brittle. Baselines often fail.',
      normalizedTextPath: null,
      normalizedTextChecksum: 'doc-checksum',
      parserName: 'fixture',
      parserVersion: '1',
      parserArtifactPath: null,
      parserArtifactMimeType: null,
      status: 'READY',
      diagnostics: [],
      createdAt: '2026-05-13T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
    },
    sections: [
      {
        id: 'section_001',
        documentId: 'doc_001',
        sectionId: 'sec:intro',
        title: 'Introduction',
        level: 1,
        orderIndex: 1,
        startOffset: 0,
        endOffset: 48,
        pageStart: 1,
        pageEnd: 1,
        checksum: 'section-checksum',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
    ],
    paragraphs: [
      {
        id: 'paragraph_001',
        documentId: 'doc_001',
        paragraphId: 'para:intro:1',
        sectionId: 'sec:intro',
        orderIndex: 1,
        text: 'Robust retrieval evidence remains brittle.',
        startOffset: 0,
        endOffset: 43,
        pageNumber: 1,
        checksum: 'paragraph-checksum',
        confidence: 0.98,
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
    ],
    anchors: [
      {
        id: 'anchor_001',
        documentId: 'doc_001',
        anchorId: 'tbl:baseline',
        anchorType: 'table',
        label: 'Table 1',
        text: 'Baseline failures',
        pageNumber: 1,
        bbox: null,
        targetRefs: [],
        metadata: {},
        checksum: 'anchor-checksum',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
      },
    ],
  };
}

function makeContext(
  checkpointControl?: Pick<TopicSelectionResearchCheckpointService, 'materializeEvidenceLandscapeCheckpoint'>,
) {
  let sequence = 0;
  const now = () => '2026-05-13T00:00:00.000Z';
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literature = new InMemoryLiteratureRepository();
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, { idFactory, now });
  const searchResourceRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const searchService = new TopicSelectionSearchResourceService(
    searchResourceRepository,
    controlPlane,
    titleCards,
    literature,
    { idFactory, now },
  );
  const evidenceService = new TopicSelectionEvidenceMapService(
    evidenceRepository,
    controlPlane,
    searchResourceRepository,
    literature,
    { idFactory, now, checkpointControl },
  );
  return {
    evidenceRepository,
    evidenceService,
    literature,
    searchResourceRepository,
    searchService,
    titleCards,
  };
}

async function createSearchRunFixture(
  runStatus: 'succeeded' | 'partial' | 'failed' = 'succeeded',
  checkpointControl?: Pick<TopicSelectionResearchCheckpointService, 'materializeEvidenceLandscapeCheckpoint'>,
) {
  const ctx = makeContext(checkpointControl);
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Robust evidence retrieval',
    brief: 'Find unmet needs in evidence-grounded literature retrieval.',
  });
  const titleCardId = titleCard.title_card_id;
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
  await ctx.literature.upsertFulltextExtractionBundle(makeFulltextBundle('lit_001'));
  await ctx.titleCards.updateEvidenceBasket(titleCardId, {
    add_literature_ids: ['lit_001'],
  });
  const seed = await ctx.searchService.createTopicSeedFromTitleCard({
    title_card_id: titleCardId,
    created_by: 'system',
  });
  const snapshot = await ctx.searchService.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    created_by: 'system',
  });
  const plan = await ctx.searchService.createSearchPlan({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    literature_resource_pool_snapshot_id: snapshot.literature_resource_pool_snapshot_id,
    query_intents: [
      'support robust retrieval gap',
      'counter evidence robust retrieval gap',
      'baseline robust retrieval failures',
      'context robust retrieval setting',
    ],
    coverage_intents: [
      {
        coverage_key: 'support-gap',
        intent_type: 'support',
        query: 'support robust retrieval gap',
        expected_evidence_role: 'support',
      },
      {
        coverage_key: 'counter-evidence',
        intent_type: 'challenge',
        query: 'counter evidence robust retrieval gap',
        expected_evidence_role: 'challenge',
      },
      {
        coverage_key: 'baseline',
        intent_type: 'baseline',
        query: 'baseline robust retrieval failures',
        expected_evidence_role: 'baseline',
      },
      {
        coverage_key: 'context',
        intent_type: 'context',
        query: 'context robust retrieval setting',
        expected_evidence_role: 'context',
      },
    ],
    created_by: 'system',
  });
  const contentRefs = [
    ref('fulltext_section', 'section_001', titleCardId),
    ref('fulltext_paragraph', 'paragraph_001', titleCardId),
    ref('fulltext_anchor', 'anchor_001', titleCardId),
  ];
  const isFailedRun = runStatus === 'failed';
  const searchRun = await ctx.searchService.recordSearchRun({
    title_card_id: titleCardId,
    search_plan_id: plan.search_plan.search_plan_id,
    run_status: runStatus,
    result_accounting: isFailedRun
      ? {
          total_result_count: 0,
          unique_literature_count: 0,
          duplicate_result_count: 0,
          failed_source_count: 1,
          skipped_source_count: 0,
        }
      : {
          total_result_count: 4,
          unique_literature_count: 1,
          duplicate_result_count: 0,
          failed_source_count: 0,
          skipped_source_count: 0,
        },
    source_health_summary: isFailedRun
      ? {
          source_count: 1,
          failed_source_count: 1,
          error_codes: ['SEARCH_PROVIDER_FAILED'],
          failure_summary: 'Fixture search provider failed before returning usable literature.',
        }
      : {
          source_count: 1,
          warning_codes: [],
        },
    dedup_summary: {
      canonical_work_refs: [ref('literature_record', 'lit_001', titleCardId)],
    },
    evidence_map_input_refs: isFailedRun
      ? []
      : [
          ref('literature_record', 'lit_001', titleCardId),
          ref('literature_source', 'source_001', titleCardId),
          ...contentRefs,
        ],
    evidence_bindings: isFailedRun
      ? []
      : plan.coverage_row_intents.map((intent) => ({
          coverage_row_intent_id: intent.coverage_row_intent_id,
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [
            ref('literature_source', 'source_001', titleCardId),
            ...contentRefs,
          ],
          binding_kind: 'retrieval_hit' as const,
          result_rank: 1,
        })),
    created_by: 'system',
  });

  return { ...ctx, plan, searchRun: searchRun.search_run, snapshot, titleCard };
}

function locator(
  locatorType: TopicSelectionEvidenceSourceLocator['locator_type'],
  locatorRef: TopicSelectionFunctionalRef,
  titleCardId: string,
): TopicSelectionEvidenceSourceLocator {
  return {
    locator_type: locatorType,
    locator_ref: locatorRef,
    literature_ref: ref('literature_record', 'lit_001', titleCardId),
    source_ref: ref('literature_source', 'source_001', titleCardId),
    content_ref: locatorType === 'manual' || locatorType === 'abstract' ? null : locatorRef,
    section_ref: locatorType === 'section' ? locatorRef : null,
    paragraph_ref: locatorType === 'paragraph' ? locatorRef : null,
    anchor_ref: locatorType === 'anchor' ? locatorRef : null,
    manual_label: locatorType === 'manual' ? 'manual note from reviewer' : null,
  };
}

async function createEvidenceMapFixture(
  checkpointControl?: Pick<TopicSelectionResearchCheckpointService, 'materializeEvidenceLandscapeCheckpoint'>,
) {
  const ctx = await createSearchRunFixture('succeeded', checkpointControl);
  const titleCardId = ctx.titleCard.title_card_id;
  const [supportRow, challengeRow, baselineRow, contextRow] = ctx.plan.coverage_row_intents;
  const map = await ctx.evidenceService.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: ctx.searchRun.search_run_id,
    evidence_units: [
      {
        client_unit_key: 'support',
        coverage_row_intent_id: supportRow?.coverage_row_intent_id,
        evidence_role: 'support',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        source_refs: [ref('literature_source', 'source_001', titleCardId)],
        locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
        source_statement: 'Robust retrieval evidence remains brittle.',
        normalized_statement: 'Retrieval evidence has robustness gaps.',
      },
      {
        client_unit_key: 'challenge',
        coverage_row_intent_id: challengeRow?.coverage_row_intent_id,
        evidence_role: 'challenge',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        source_refs: [ref('literature_source', 'source_001', titleCardId)],
        locator: locator('paragraph', ref('fulltext_paragraph', 'paragraph_001', titleCardId), titleCardId),
        source_statement: 'A counter example reports stable retrieval under curated sources.',
      },
      {
        client_unit_key: 'baseline',
        coverage_row_intent_id: baselineRow?.coverage_row_intent_id,
        evidence_role: 'baseline',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        source_refs: [ref('literature_source', 'source_001', titleCardId)],
        locator: locator('anchor', ref('fulltext_anchor', 'anchor_001', titleCardId), titleCardId),
        source_statement: 'Table 1 reports baseline retrieval failures.',
      },
      {
        client_unit_key: 'context',
        coverage_row_intent_id: contextRow?.coverage_row_intent_id,
        evidence_role: 'context',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        source_refs: [ref('literature_source', 'source_001', titleCardId)],
        locator: locator('manual', ref('manual_locator', 'manual_001', titleCardId), titleCardId),
        source_statement: 'The setting focuses on reviewer-aligned evidence workflows.',
      },
    ],
    conflict_sets: [
      {
        conflict_type: 'claim_conflict',
        severity: 'moderate',
        support_unit_keys: ['support'],
        challenge_unit_keys: ['challenge'],
        issue_codes: ['COUNTER_EVIDENCE_PRESENT'],
      },
    ],
    digest_payload: {
      view_only: true,
    },
    created_by: 'system',
  });
  return { ...ctx, evidenceMap: map.evidence_map, evidenceUnits: map.evidence_units };
}

test('fake slice creates EvidenceMap, role-separated bundle, and demand-driven strength assessment', async () => {
  const ctx = await createEvidenceMapFixture();
  const bundle = await ctx.evidenceService.getNeedValidationEvidenceBundle(ctx.evidenceMap.evidence_map_id);
  const assessment = await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    target_ref: ref('need_candidate', 'need_001', ctx.titleCard.title_card_id),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [bundle.support_units[0]!.evidence_unit_id],
      challenge_unit_ids: [bundle.challenge_units[0]!.evidence_unit_id],
      baseline_unit_ids: [bundle.baseline_units[0]!.evidence_unit_id],
      context_unit_ids: [bundle.context_units[0]!.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });

  assert.equal(ctx.evidenceMap.search_run_ref.ref_id, ctx.searchRun.search_run_id);
  assert.equal(bundle.support_units.length, 1);
  assert.equal(bundle.challenge_units.length, 1);
  assert.equal(bundle.baseline_units.length, 1);
  assert.equal(bundle.context_units.length, 1);
  assert.equal(assessment.strength_verdict, 'mixed');
  assert.equal(assessment.target_ref.ref_id, 'need_001');
});

test('EvidenceMap checkpoint materialization receives persisted coverage assessments', async () => {
  const captured: MaterializeEvidenceLandscapeCheckpointInput[] = [];
  const ctx = await createSearchRunFixture('succeeded', {
    materializeEvidenceLandscapeCheckpoint: async (input) => {
      captured.push(input);
      return { research_checkpoint_id: 'captured_checkpoint' } as Awaited<
        ReturnType<TopicSelectionResearchCheckpointService['materializeEvidenceLandscapeCheckpoint']>
      >;
    },
  });
  const titleCardId = ctx.titleCard.title_card_id;
  const supportRow = ctx.plan.coverage_row_intents[0]!;
  await ctx.searchResourceRepository.createCoverageAssessment({
    coverage_assessment_id: 'coverage_assessment_persisted',
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    coverage_row_intent_id: supportRow.coverage_row_intent_id,
    verdict: 'missing',
    issue_codes: ['NO_DIRECT_EVIDENCE'],
    confidence: 0.8,
    assessed_by: 'system',
    created_at: '2026-05-13T01:00:00.000Z',
  });

  await ctx.evidenceService.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: ctx.searchRun.search_run_id,
    evidence_units: [{
      coverage_row_intent_id: supportRow.coverage_row_intent_id,
      evidence_role: 'support',
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [ref('literature_source', 'source_001', titleCardId)],
      locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
      source_statement: 'Robust retrieval evidence remains brittle.',
    }],
    created_by: 'system',
  });

  assert.deepEqual(captured[0]?.coverage_assessments, [{
    coverage_assessment_id: 'coverage_assessment_persisted',
    search_plan_id: ctx.plan.search_plan.search_plan_id,
    coverage_row_intent_id: supportRow.coverage_row_intent_id,
    verdict: 'missing',
    issue_codes: ['NO_DIRECT_EVIDENCE'],
    confidence: 0.8,
    assessed_by: 'system',
    created_at: '2026-05-13T01:00:00.000Z',
  }]);
});

test('claim admission publishes a material successor for the linked same-gate round', async () => {
  const checkpoints: MaterializeEvidenceLandscapeCheckpointInput[] = [];
  const ctx = await createEvidenceMapFixture({
    materializeEvidenceLandscapeCheckpoint: async (input) => {
      checkpoints.push(input);
      return { research_checkpoint_id: `checkpoint_${checkpoints.length}` } as Awaited<
        ReturnType<TopicSelectionResearchCheckpointService['materializeEvidenceLandscapeCheckpoint']>
      >;
    },
  });
  checkpoints.length = 0;
  const titleCardId = ctx.titleCard.title_card_id;
  const parentChallengeRow = ctx.plan.coverage_row_intents.find((row) => row.coverage_key === 'counter-evidence')!;
  const childPlan = await ctx.searchService.createSearchPlan({
    title_card_id: titleCardId,
    topic_seed_id: ctx.plan.search_plan.topic_seed_ref.ref_id,
    literature_resource_pool_snapshot_id: ctx.snapshot.literature_resource_pool_snapshot_id,
    query_intents: ['new direct counter evidence'],
    coverage_intents: ctx.plan.coverage_row_intents.map((row) => ({
      coverage_key: row.coverage_key,
      intent_type: row.intent_type,
      query: row.query,
      rationale: row.rationale,
      required: row.required,
      priority: row.priority,
      target_source_types: row.target_source_types,
      expected_evidence_role: row.expected_evidence_role,
      refs: row.refs,
    })),
    parent_search_plan_ref: ref('search_plan', ctx.plan.search_plan.search_plan_id, titleCardId),
    recheck_request_ref: ref('search_plan_recheck_request', 'request_1', titleCardId),
    created_by: 'system',
  });
  const childChallengeRow = childPlan.coverage_row_intents.find((row) => row.coverage_key === 'counter-evidence')!;
  const paragraphRef = ref('fulltext_paragraph', 'paragraph_001', titleCardId);
  const chunkText = 'Robust retrieval evidence remains brittle.';
  const childRun = await ctx.searchService.recordSearchRun({
    title_card_id: titleCardId,
    search_plan_id: childPlan.search_plan.search_plan_id,
    run_kind: 'recheck_followup',
    run_status: 'succeeded',
    query_provenance: [{
      query: 'new direct counter evidence',
      hits: [{
        query: 'new direct counter evidence',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        embedding_version_id: 'embedding_001',
        chunk_ref: paragraphRef,
        chunk_hash: '1db8210e0d2d5bdee76f1973bfac7863de581d94695f524aa0fcae9521f64df1',
        source_text: chunkText,
        rank: 1,
      }, {
        query: 'new direct counter evidence',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        embedding_version_id: 'embedding_001',
        chunk_ref: paragraphRef,
        chunk_hash: 'd12329d83f07ef9e1f15fb7c0487c9143ccea49920cfa5ea7ed35876418891bc',
        source_text: 'A counter example reports stable retrieval under curated sources.',
        rank: 2,
      }],
    }],
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: { warning_codes: [] },
    evidence_map_input_refs: [
      ref('literature_record', 'lit_001', titleCardId),
      ref('literature_source', 'source_001', titleCardId),
      ref('fulltext_section', 'section_001', titleCardId),
      paragraphRef,
      ref('fulltext_anchor', 'anchor_001', titleCardId),
      ref('manual_locator', 'manual_001', titleCardId),
    ],
    evidence_bindings: [{
      coverage_row_intent_id: childChallengeRow.coverage_row_intent_id,
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [paragraphRef],
      binding_kind: 'retrieval_hit',
      result_rank: 1,
    }],
    created_by: 'system',
  });

  const baseInput = {
    title_card_id: titleCardId,
    predecessor_evidence_map_id: ctx.evidenceMap.evidence_map_id,
    search_run_id: childRun.search_run.search_run_id,
    issue_ref: ref('coverage_row_intent', parentChallengeRow.coverage_row_intent_id, titleCardId),
    decision_relevance: 'The admitted counter-claim resolves the missing challenge row.',
    created_by: 'system' as const,
  };
  const materialAdmission = {
      schema_version: 'TopicSelectionEvidenceConvergenceClaimAdmission@v1',
      request_ref: ref('search_plan_recheck_request', 'request_1', titleCardId),
      search_run_ref: ref('search_run', childRun.search_run.search_run_id, titleCardId),
      query: 'new direct counter evidence',
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      chunk_ref: paragraphRef,
      chunk_hash: '1db8210e0d2d5bdee76f1973bfac7863de581d94695f524aa0fcae9521f64df1',
      evidence_role: 'challenge',
      source_statement: chunkText,
      normalized_statement: 'Retrieval remains brittle under the tested conditions.',
      interpretation_payload: { admission_reason: 'Direct counter evidence for the required row.' },
      extraction_confidence: 0.95,
  } as const;

  await assert.rejects(ctx.evidenceService.publishEvidenceConvergenceSuccessor({
    ...baseInput,
    claim_admissions: [{ ...materialAdmission, source_statement: 'A tampered quote.' }],
  }), (error: unknown) => error instanceof AppError
    && error.statusCode === 422
    && error.errorCode === 'GATE_CONSTRAINT_FAILED');

  await assert.rejects(ctx.evidenceService.publishEvidenceConvergenceSuccessor({
    ...baseInput,
    workspace_id: 'workspace_other',
    claim_admissions: [materialAdmission],
  }), /workspace scope/u);

  const noDelta = await ctx.evidenceService.publishEvidenceConvergenceSuccessor({
    ...baseInput,
    claim_admissions: [{
      ...materialAdmission,
      chunk_hash: 'd12329d83f07ef9e1f15fb7c0487c9143ccea49920cfa5ea7ed35876418891bc',
      source_statement: 'A counter example reports stable retrieval under curated sources.',
      normalized_statement: null,
    }],
  });
  assert.equal(noDelta.status, 'no_material_delta');
  assert.equal(noDelta.evidence_delta.material, false);
  assert.equal(noDelta.successor, null);
  assert.equal((await ctx.evidenceRepository.findEvidenceMapById(ctx.evidenceMap.evidence_map_id))?.freshness_status, 'current');
  assert.equal(checkpoints.length, 0);

  const createCoverageAssessment = ctx.searchResourceRepository.createCoverageAssessment.bind(
    ctx.searchResourceRepository,
  );
  ctx.searchResourceRepository.createCoverageAssessment = async () => {
    throw new Error('simulated assessment persistence failure');
  };
  await assert.rejects(ctx.evidenceService.publishEvidenceConvergenceSuccessor({
    ...baseInput,
    claim_admissions: [materialAdmission],
  }), /simulated assessment persistence failure/u);
  assert.equal(
    (await ctx.evidenceRepository.findEvidenceMapById(ctx.evidenceMap.evidence_map_id))?.freshness_status,
    'current',
    'a failed coverage assessment must not advance the EvidenceMap head',
  );
  ctx.searchResourceRepository.createCoverageAssessment = createCoverageAssessment;

  const result = await ctx.evidenceService.publishEvidenceConvergenceSuccessor({
    ...baseInput,
    claim_admissions: [materialAdmission],
  });

  assert.equal(result.status, 'successor_published');
  assert.equal(result.evidence_delta.material, true);
  assert.equal(result.evidence_delta.admitted_evidence_unit_refs.length, 1);
  assert.equal(result.successor?.evidence_map.predecessor_evidence_map_ref?.ref_id, ctx.evidenceMap.evidence_map_id);
  assert.equal(result.successor?.evidence_map.material_evidence_delta_ref?.ref_id, result.evidence_delta_ref.ref_id);
  assert.equal(result.successor?.evidence_units.length, ctx.evidenceUnits.length + 1);
  assert.equal(
    result.successor?.evidence_units.some((unit) => unit.normalized_statement === 'Retrieval remains brittle under the tested conditions.'),
    true,
  );
  const predecessor = await ctx.evidenceRepository.findEvidenceMapById(ctx.evidenceMap.evidence_map_id);
  assert.equal(predecessor?.freshness_status, 'superseded');
  const matrix = await ctx.searchService.getCoverageMatrix(childPlan.search_plan.search_plan_id);
  assert.equal(
    matrix.rows.find((row) => row.coverage_row_intent.coverage_key === 'counter-evidence')?.latest_assessment?.verdict,
    'satisfied',
  );
  assert.equal(checkpoints.length, 0, 'the fresh checkpoint must wait for the linked Debate round');
});

test('EvidenceUnit locator provenance keeps section, paragraph, anchor, and manual refs traceable', async () => {
  const ctx = await createEvidenceMapFixture();
  const units = await ctx.evidenceRepository.listEvidenceUnitsByEvidenceMapId(ctx.evidenceMap.evidence_map_id);

  assert.ok(units.some((unit) => unit.locator.section_ref?.ref_id === 'section_001'));
  assert.ok(units.some((unit) => unit.locator.paragraph_ref?.ref_id === 'paragraph_001'));
  assert.ok(units.some((unit) => unit.locator.anchor_ref?.ref_id === 'anchor_001'));
  assert.ok(units.some((unit) => unit.locator.manual_label === 'manual note from reviewer'));
  assert.ok(units.every((unit) => unit.literature_ref.ref_id === 'lit_001'));
});

test('abstract-only support is flagged and cannot produce strong support', async () => {
  const ctx = await createSearchRunFixture();
  const titleCardId = ctx.titleCard.title_card_id;
  const map = await ctx.evidenceService.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: ctx.searchRun.search_run_id,
    evidence_units: [
      {
        client_unit_key: 'abstract-support',
        evidence_role: 'support',
        literature_ref: ref('literature_record', 'lit_001', titleCardId),
        source_refs: [],
        locator: {
          locator_type: 'abstract',
          locator_ref: ref('literature_abstract', 'lit_001', titleCardId),
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_ref: ref('literature_source', 'source_001', titleCardId),
        },
        source_statement: 'The abstract says retrieval evidence is brittle.',
      },
    ],
    created_by: 'system',
  });
  const unit = map.evidence_units[0]!;
  const assessment = await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: map.evidence_map.evidence_map_id,
    target_ref: ref('need_candidate', 'need_abstract', titleCardId),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [unit.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });

  assert.equal(unit.abstract_only, true);
  assert.ok(unit.source_refs.some((sourceRef) => sourceRef.ref_id === 'source_001'));
  assert.ok(unit.issue_codes.includes('ABSTRACT_ONLY_SUPPORT'));
  assert.notEqual(assessment.strength_verdict, 'strong_support');
  assert.ok(assessment.gap_codes.includes('ABSTRACT_ONLY_SUPPORT'));
});

test('missing SearchRun, non-consumable SearchRun, missing locator, and outside source refs are rejected', async () => {
  const ctx = await createSearchRunFixture();
  const titleCardId = ctx.titleCard.title_card_id;
  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: 'missing_search_run',
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [ref('literature_source', 'source_001', titleCardId)],
          locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
          source_statement: 'Robust retrieval evidence remains brittle.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );

  const failed = await createSearchRunFixture('failed');
  await assert.rejects(
    () => failed.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: failed.titleCard.title_card_id,
      search_run_id: failed.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', failed.titleCard.title_card_id),
          source_refs: [ref('literature_source', 'source_001', failed.titleCard.title_card_id)],
          locator: locator('section', ref('fulltext_section', 'section_001', failed.titleCard.title_card_id), failed.titleCard.title_card_id),
          source_statement: 'Robust retrieval evidence remains brittle.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );

  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: ctx.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [ref('literature_source', 'source_001', titleCardId)],
          locator: null as unknown as TopicSelectionEvidenceSourceLocator,
          source_statement: 'Robust retrieval evidence remains brittle.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: ctx.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [ref('literature_source', 'source_outside', titleCardId)],
          locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
          source_statement: 'Robust retrieval evidence remains brittle.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('EvidenceUnit rejects missing source provenance and malformed source_statement', async () => {
  const ctx = await createSearchRunFixture();
  const titleCardId = ctx.titleCard.title_card_id;
  const locatorWithoutSourceRef = locator('abstract', ref('literature_abstract', 'lit_001', titleCardId), titleCardId);
  delete (locatorWithoutSourceRef as Partial<TopicSelectionEvidenceSourceLocator>).source_ref;

  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: ctx.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [],
          locator: locatorWithoutSourceRef,
          source_statement: 'The abstract says retrieval evidence is brittle.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: ctx.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [ref('literature_source', 'source_001', titleCardId)],
          locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
          source_statement: undefined as unknown as string,
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('LLM inference cannot be stored as source-claim authority', async () => {
  const ctx = await createSearchRunFixture();
  const titleCardId = ctx.titleCard.title_card_id;

  await assert.rejects(
    () => ctx.evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: ctx.searchRun.search_run_id,
      evidence_units: [
        {
          evidence_role: 'support',
          literature_ref: ref('literature_record', 'lit_001', titleCardId),
          source_refs: [ref('literature_source', 'source_001', titleCardId)],
          locator: locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
          source_attribution_kind: 'llm_inference',
          source_statement: 'The model inferred an unmet need from adjacent claims.',
        },
      ],
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
});

test('strength assessment cache is target-specific and reused for the same fresh cache key', async () => {
  const ctx = await createEvidenceMapFixture();
  const supportUnit = ctx.evidenceUnits.find((unit) => unit.evidence_role === 'support')!;
  const first = await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    target_ref: ref('need_candidate', 'need_001', ctx.titleCard.title_card_id),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [supportUnit.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });
  const reused = await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    target_ref: ref('need_candidate', 'need_001', ctx.titleCard.title_card_id),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [supportUnit.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });
  const secondTarget = await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    target_ref: ref('need_candidate', 'need_002', ctx.titleCard.title_card_id),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [supportUnit.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });

  assert.equal(reused.evidence_strength_assessment_id, first.evidence_strength_assessment_id);
  assert.notEqual(secondTarget.cache_key, first.cache_key);
});

test('stale methods mark map and assessments without rewriting historical units', async () => {
  const ctx = await createEvidenceMapFixture();
  const supportUnit = ctx.evidenceUnits.find((unit) => unit.evidence_role === 'support')!;
  await ctx.evidenceService.assessEvidenceStrength({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    target_ref: ref('need_candidate', 'need_001', ctx.titleCard.title_card_id),
    purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: [supportUnit.evidence_unit_id],
    },
    assessment_workflow_version: 'v1',
  });
  const unitsBefore = await ctx.evidenceRepository.listEvidenceUnitsByEvidenceMapId(ctx.evidenceMap.evidence_map_id);
  const staleMap = await ctx.evidenceService.markEvidenceMapStale({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    stale_reason_codes: ['SEARCH_RUN_SUPERSEDED'],
  });
  const staleCount = await ctx.evidenceService.markEvidenceStrengthAssessmentsStale({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    stale_reason_codes: ['SEARCH_RUN_SUPERSEDED'],
  });
  const unitsAfter = await ctx.evidenceRepository.listEvidenceUnitsByEvidenceMapId(ctx.evidenceMap.evidence_map_id);
  const assessments = await ctx.evidenceRepository.listEvidenceStrengthAssessmentsByEvidenceMapId(ctx.evidenceMap.evidence_map_id);

  assert.equal(staleMap.freshness_status, 'stale');
  assert.equal(staleCount, 1);
  assert.equal(assessments[0]?.freshness_status, 'recheck_required');
  assert.deepEqual(unitsAfter, unitsBefore);
});
