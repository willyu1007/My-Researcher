import assert from 'node:assert/strict';
import test from 'node:test';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceSourceLocator } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { HumanConfirmationInput } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import type { LiteratureFulltextExtractionBundle, LiteratureRecord } from '../repositories/literature-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import { TopicSelectionNeedValidationService } from './topic-selection-need-validation-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
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

function makeContext() {
  let sequence = 0;
  const now = () => '2026-05-13T00:00:00.000Z';
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literature = new InMemoryLiteratureRepository();
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, { idFactory, now });
  const searchResourceRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const needValidationRepository = new InMemoryTopicSelectionNeedValidationRepository();
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
    { idFactory, now },
  );
  const needService = new TopicSelectionNeedValidationService(
    needValidationRepository,
    controlPlane,
    evidenceService,
    searchService,
    { idFactory, now },
  );
  return {
    controlPlane,
    controlPlaneRepository,
    evidenceRepository,
    evidenceService,
    literature,
    needService,
    needValidationRepository,
    searchResourceRepository,
    searchService,
    titleCards,
  };
}

async function createSearchRunFixture() {
  const ctx = makeContext();
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
  const searchRun = await ctx.searchService.recordSearchRun({
    title_card_id: titleCardId,
    search_plan_id: plan.search_plan.search_plan_id,
    result_accounting: {
      total_result_count: 4,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {
      source_count: 1,
      warning_codes: [],
    },
    dedup_summary: {
      canonical_work_refs: [ref('literature_record', 'lit_001', titleCardId)],
    },
    evidence_map_input_refs: [
      ref('literature_record', 'lit_001', titleCardId),
      ref('literature_source', 'source_001', titleCardId),
      ...contentRefs,
    ],
    evidence_bindings: plan.coverage_row_intents.map((intent) => ({
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

type EvidenceMapFixtureOptions = {
  support?: 'section' | 'abstract' | 'none';
  includeChallenge?: boolean;
  includeBaseline?: boolean;
  includeContext?: boolean;
};

async function createEvidenceMapFixture(options: EvidenceMapFixtureOptions = {}) {
  const ctx = await createSearchRunFixture();
  const titleCardId = ctx.titleCard.title_card_id;
  const [supportRow, challengeRow, baselineRow, contextRow] = ctx.plan.coverage_row_intents;
  const support = options.support ?? 'section';
  const evidenceUnits = [];
  if (support !== 'none') {
    evidenceUnits.push({
      client_unit_key: 'support',
      coverage_row_intent_id: supportRow?.coverage_row_intent_id,
      evidence_role: 'support' as const,
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [ref('literature_source', 'source_001', titleCardId)],
      locator: support === 'abstract'
        ? locator('abstract', ref('literature_abstract', 'lit_001', titleCardId), titleCardId)
        : locator('section', ref('fulltext_section', 'section_001', titleCardId), titleCardId),
      source_statement: 'Robust retrieval evidence remains brittle.',
      normalized_statement: 'Retrieval evidence has robustness gaps.',
    });
  }
  if (options.includeChallenge ?? true) {
    evidenceUnits.push({
      client_unit_key: 'challenge',
      coverage_row_intent_id: challengeRow?.coverage_row_intent_id,
      evidence_role: 'challenge' as const,
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [ref('literature_source', 'source_001', titleCardId)],
      locator: locator('paragraph', ref('fulltext_paragraph', 'paragraph_001', titleCardId), titleCardId),
      source_statement: 'A counter example reports stable retrieval under curated sources.',
    });
  }
  if (options.includeBaseline ?? true) {
    evidenceUnits.push({
      client_unit_key: 'baseline',
      coverage_row_intent_id: baselineRow?.coverage_row_intent_id,
      evidence_role: 'baseline' as const,
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [ref('literature_source', 'source_001', titleCardId)],
      locator: locator('anchor', ref('fulltext_anchor', 'anchor_001', titleCardId), titleCardId),
      source_statement: 'Table 1 reports baseline retrieval failures.',
    });
  }
  if (options.includeContext ?? true) {
    evidenceUnits.push({
      client_unit_key: 'context',
      coverage_row_intent_id: contextRow?.coverage_row_intent_id,
      evidence_role: 'context' as const,
      literature_ref: ref('literature_record', 'lit_001', titleCardId),
      source_refs: [ref('literature_source', 'source_001', titleCardId)],
      locator: locator('manual', ref('manual_locator', 'manual_001', titleCardId), titleCardId),
      source_statement: 'The setting focuses on reviewer-aligned evidence workflows.',
    });
  }
  const map = await ctx.evidenceService.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: ctx.searchRun.search_run_id,
    evidence_units: evidenceUnits,
    conflict_sets: options.includeChallenge === false
      ? []
      : [
          {
            conflict_type: 'claim_conflict',
            severity: 'moderate',
            support_unit_keys: support === 'none' ? [] : ['support'],
            challenge_unit_keys: ['challenge'],
            issue_codes: ['COUNTER_EVIDENCE_PRESENT'],
          },
        ],
    created_by: 'system',
  });
  return { ...ctx, evidenceMap: map.evidence_map, evidenceUnits: map.evidence_units };
}

async function createCandidateFixture(options: EvidenceMapFixtureOptions & {
  speculative?: boolean;
  openRecheck?: boolean;
  unresolvedChallenge?: boolean;
  priorArtStatus?: 'unknown' | 'no_strong_solution_found' | 'already_solved';
  gapCodes?: string[];
} = {}) {
  const ctx = await createEvidenceMapFixture(options);
  const challengeUnit = ctx.evidenceUnits.find((unit) => unit.evidence_role === 'challenge');
  const candidate = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: ctx.titleCard.title_card_id,
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    candidate_need: 'Reviewer-aligned retrieval needs stronger evidence traceability.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'Evidence traceability remains brittle across retrieval and review.',
    scope_notes: 'CS literature assistant workflows that prepare reviewer-facing claims.',
    prior_art_status: options.priorArtStatus ?? 'no_strong_solution_found',
    speculative: options.speculative ?? false,
    open_recheck_request_refs: options.openRecheck
      ? [ref('search_plan_recheck_request', 'search_recheck_open', ctx.titleCard.title_card_id)]
      : [],
    unresolved_challenge_refs: options.unresolvedChallenge && challengeUnit
      ? [ref('evidence_unit', challengeUnit.evidence_unit_id, ctx.titleCard.title_card_id)]
      : [],
    gap_codes: options.gapCodes ?? [],
    created_by: 'system',
  });
  return { ...ctx, candidate };
}

async function createReadyPacketFixture() {
  const ctx = await createCandidateFixture();
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: ctx.candidate.need_candidate_id,
    assessed_by: 'system',
  });
  const packet = await ctx.needService.createValidationDecisionSupportPacket({
    need_candidate_id: ctx.candidate.need_candidate_id,
    readiness_assessment_id: readiness.readiness_assessment_id,
    created_by: 'system',
  });
  return { ...ctx, packet, readiness };
}

test('candidate creation from EvidenceMap stores hypothesis only', async () => {
  const ctx = await createCandidateFixture();

  assert.equal(ctx.candidate.decision_status, 'hypothesis');
  assert.equal(ctx.candidate.result_validated_need_id, null);
  assert.equal(ctx.candidate.evidence_map_ref.ref_id, ctx.evidenceMap.evidence_map_id);
  assert.ok(ctx.candidate.trace_snapshot_id);
});

test('candidate creation rejects selected EvidenceUnit ids outside the EvidenceMap role bundle', async () => {
  const ctx = await createEvidenceMapFixture();

  await assert.rejects(
    () => ctx.needService.createNeedCandidateFromEvidenceMap({
      title_card_id: ctx.titleCard.title_card_id,
      evidence_map_id: ctx.evidenceMap.evidence_map_id,
      candidate_need: 'Reviewer-aligned retrieval needs stronger evidence traceability.',
      scope_notes: 'CS literature assistant workflows that prepare reviewer-facing claims.',
      support_unit_ids: ['evidence_unit_missing'],
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('readiness handles an intentionally empty role bundle as blocked without strength assessment', async () => {
  const ctx = await createEvidenceMapFixture();
  const candidate = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: ctx.titleCard.title_card_id,
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    candidate_need: 'Reviewer-aligned retrieval needs stronger evidence traceability.',
    scope_notes: 'CS literature assistant workflows that prepare reviewer-facing claims.',
    support_unit_ids: [],
    challenge_unit_ids: [],
    baseline_unit_ids: [],
    context_unit_ids: [],
    created_by: 'system',
  });
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: candidate.need_candidate_id,
  });

  assert.equal(readiness.strength_assessment_ref, null);
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'SUPPORT_EVIDENCE_REQUIRED'));
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'DIRECT_NEIGHBOR_BASELINE_REQUIRED'));
  assert.ok(readiness.blockers.some((blocker) => blocker.code === 'DISCONFIRMING_EVIDENCE_REQUIRED'));
});

test('readiness blocks no support, abstract-only support, stale EvidenceMap, speculative candidates, open recheck, and strong unresolved challenge', async () => {
  const noSupport = await createCandidateFixture({ support: 'none', includeChallenge: false });
  const noSupportReadiness = await noSupport.needService.assessCandidateReadiness({
    need_candidate_id: noSupport.candidate.need_candidate_id,
  });
  assert.ok(noSupportReadiness.blockers.some((blocker) => blocker.code === 'SUPPORT_EVIDENCE_REQUIRED'));

  const abstractOnly = await createCandidateFixture({ support: 'abstract', includeChallenge: false });
  const abstractReadiness = await abstractOnly.needService.assessCandidateReadiness({
    need_candidate_id: abstractOnly.candidate.need_candidate_id,
  });
  assert.ok(abstractReadiness.blockers.some((blocker) => blocker.code === 'SECTION_BACKED_SUPPORT_REQUIRED'));

  const stale = await createCandidateFixture({ includeChallenge: false });
  await stale.evidenceService.markEvidenceMapStale({
    evidence_map_id: stale.evidenceMap.evidence_map_id,
    stale_reason_codes: ['SEARCH_RUN_SUPERSEDED'],
  });
  const staleReadiness = await stale.needService.assessCandidateReadiness({
    need_candidate_id: stale.candidate.need_candidate_id,
  });
  assert.ok(staleReadiness.blockers.some((blocker) => blocker.code === 'EVIDENCE_MAP_CURRENT_REQUIRED'));

  const speculative = await createCandidateFixture({ speculative: true, includeChallenge: false });
  const speculativeReadiness = await speculative.needService.assessCandidateReadiness({
    need_candidate_id: speculative.candidate.need_candidate_id,
  });
  assert.ok(speculativeReadiness.blockers.some((blocker) => blocker.code === 'SPECULATIVE_CANDIDATE_SCOPE_REVISION_REQUIRED'));

  const recheck = await createCandidateFixture({ openRecheck: true, includeChallenge: false });
  const recheckReadiness = await recheck.needService.assessCandidateReadiness({
    need_candidate_id: recheck.candidate.need_candidate_id,
  });
  assert.ok(recheckReadiness.blockers.some((blocker) => blocker.code === 'OPEN_HIGH_PRIORITY_RECHECK'));

  const challenge = await createCandidateFixture({ unresolvedChallenge: true });
  const challengeReadiness = await challenge.needService.assessCandidateReadiness({
    need_candidate_id: challenge.candidate.need_candidate_id,
  });
  assert.ok(challengeReadiness.blockers.some((blocker) => blocker.code === 'STRONG_UNRESOLVED_CHALLENGE'));
});

test('readiness pass updates candidate to ready_for_validation through T-048 gate and transition', async () => {
  const ctx = await createCandidateFixture();
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: ctx.candidate.need_candidate_id,
    assessed_by: 'system',
  });
  const updated = await ctx.needValidationRepository.findNeedCandidateById(ctx.candidate.need_candidate_id);

  assert.equal(readiness.recommendation, 'ready_for_validation');
  assert.equal(readiness.blockers.length, 0);
  assert.equal(updated?.decision_status, 'ready_for_validation');
  assert.ok(readiness.gate_result_id);
  assert.ok(readiness.transition_attempt_id);
});

test('support packet creation rejects readiness assessment from a different NeedCandidate', async () => {
  const ctx = await createCandidateFixture();
  const firstReadiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: ctx.candidate.need_candidate_id,
  });
  const secondCandidate = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: ctx.titleCard.title_card_id,
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    candidate_need: 'A second candidate uses the same EvidenceMap.',
    scope_notes: 'Same evidence map, different hypothesis.',
    prior_art_status: 'no_strong_solution_found',
    created_by: 'system',
  });
  const secondReadiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: secondCandidate.need_candidate_id,
  });

  await assert.rejects(
    () => ctx.needService.createValidationDecisionSupportPacket({
      need_candidate_id: ctx.candidate.need_candidate_id,
      readiness_assessment_id: secondReadiness.readiness_assessment_id,
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  const firstPacket = await ctx.needService.createValidationDecisionSupportPacket({
    need_candidate_id: ctx.candidate.need_candidate_id,
    readiness_assessment_id: firstReadiness.readiness_assessment_id,
    created_by: 'system',
  });
  assert.equal(firstPacket.readiness_assessment_id, firstReadiness.readiness_assessment_id);
});

test('support packet carries challenge and conflict refs as default residual risks', async () => {
  const ctx = await createCandidateFixture({ includeChallenge: true });
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: ctx.candidate.need_candidate_id,
  });
  const packet = await ctx.needService.createValidationDecisionSupportPacket({
    need_candidate_id: ctx.candidate.need_candidate_id,
    readiness_assessment_id: readiness.readiness_assessment_id,
    created_by: 'system',
  });
  const explicitPacket = await ctx.needService.createValidationDecisionSupportPacket({
    need_candidate_id: ctx.candidate.need_candidate_id,
    readiness_assessment_id: readiness.readiness_assessment_id,
    residual_risk_refs: [],
    created_by: 'system',
  });

  assert.ok(packet.residual_risk_refs.some((item) => item.ref_type === 'evidence_unit'));
  assert.ok(packet.residual_risk_refs.some((item) => item.ref_type === 'evidence_conflict_set'));
  assert.deepEqual(explicitPacket.residual_risk_refs, []);
});

test('adjudication rejects stale support packet lineage before persistence', async () => {
  const ctx = await createReadyPacketFixture();
  const packet = await ctx.needValidationRepository.findValidationDecisionSupportPacketById(
    ctx.packet.validation_support_packet_id,
  );
  assert.ok(packet);
  packet.evidence_map_ref = ref('evidence_map', 'evidence_map_stale', ctx.titleCard.title_card_id);

  await assert.rejects(
    () => ctx.needService.adjudicateNeed({
      need_candidate_id: ctx.candidate.need_candidate_id,
      support_packet_id: ctx.packet.validation_support_packet_id,
      final_decision: 'validate',
      rationale: 'Stale support packet lineage must not create an adjudication authority.',
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  const results = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(results.length, 0);
});

test('non-validate adjudication persists result with null output_validated_need_id', async () => {
  const ctx = await createReadyPacketFixture();
  const result = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'reject',
    rejected_reason: 'insufficient_evidence',
    rationale: 'The support is not strong enough for validation.',
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });

  assert.equal(result.adjudication_result.final_decision, 'reject');
  assert.equal(result.adjudication_result.output_validated_need_id, null);
  assert.equal(result.validated_need, null);
  assert.equal(result.need_candidate.decision_status, 'rejected');
  assert.equal(result.memory_suggestion?.status, 'suggested');
});

test('validate adjudication requires explicit human confirmation before ValidatedNeed and v1b bundle publication', async () => {
  const ctx = await createReadyPacketFixture();
  const adjudication = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'validate',
    rationale: 'Reviewer confirms the unmet need and evidence boundary.',
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });

  assert.equal(adjudication.adjudication_result.final_decision, 'validate');
  assert.ok(adjudication.adjudication_result.output_validated_need_id);
  assert.equal(adjudication.adjudication_result.human_decision_id, null);
  assert.equal(adjudication.validated_need, null);
  assert.equal(adjudication.v1b_input_bundle, null);
  assert.equal(adjudication.need_candidate.result_adjudication_id, adjudication.adjudication_result.adjudication_result_id);
  assert.equal(adjudication.need_candidate.result_validated_need_id, null);
  assert.equal(adjudication.need_candidate.decision_status, 'ready_for_validation');
  assert.equal(adjudication.need_candidate.review_status, 'needs_human_review');

  const confirmation = await ctx.needService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    human_rationale: 'Validated after reviewing support, prior art, and scope.',
  });
  const humanDecision = await ctx.controlPlaneRepository.findHumanConfirmedDecisionById(
    confirmation.validated_need.human_decision_id,
  );
  const bundle = await ctx.needService.publishV1bInputBundle({
    validated_need_id: confirmation.validated_need.validated_need_id,
    created_by: 'system',
  });
  const bundleAgain = await ctx.needService.publishV1bInputBundle({
    validated_need_id: confirmation.validated_need.validated_need_id,
    created_by: 'system',
  });

  assert.equal(confirmation.validated_need.validated_need_id, adjudication.adjudication_result.output_validated_need_id);
  assert.equal(confirmation.need_candidate.result_validated_need_id, confirmation.validated_need.validated_need_id);
  assert.equal(confirmation.validated_need.source_need_candidate_id, ctx.candidate.need_candidate_id);
  assert.equal(bundle.validated_need_id, confirmation.validated_need.validated_need_id);
  assert.equal(bundle.support_packet_id, ctx.packet.validation_support_packet_id);
  assert.equal(bundleAgain.v1b_input_bundle_id, bundle.v1b_input_bundle_id);
  assert.equal(humanDecision?.decision_type, 'confirm');
});

test('HumanConfirmNeed advances only the reviewed current candidate-pool checkpoint', async () => {
  const ctx = await createReadyPacketFixture();
  const adjudication = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'validate',
    rationale: 'The selected gap remains credible after candidate competition review.',
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });
  let sequence = 0;
  const checkpointService = new TopicSelectionResearchCheckpointService(
    new InMemoryTopicSelectionResearchCheckpointRepository(),
    ctx.controlPlane,
    {
      idFactory: (prefix) => `${prefix}_guarded_${++sequence}`,
      now: () => '2026-05-13T00:00:00.000Z',
    },
  );
  const selectedCandidate = adjudication.need_candidate;
  const alternative = {
    ...selectedCandidate,
    need_candidate_id: 'need_candidate_alternative',
    candidate_version: 'v-alt',
    candidate_need: 'Test an adaptive evidence-routing intervention.',
    unmet_need_statement: 'Adaptive routing remains untested under reviewer-facing constraints.',
    mechanism_type: 'system_gap' as const,
    mechanism_payload: { intervention: 'adaptive evidence routing' },
  };
  await ctx.needValidationRepository.createNeedCandidate(alternative);
  const checkpoint = await checkpointService.materializeGapSelectionCheckpoint({
    title_card_id: ctx.titleCard.title_card_id,
    evidence_map_ref: selectedCandidate.evidence_map_ref,
    candidates: [selectedCandidate, alternative],
  });
  const guardedNeedService = new TopicSelectionNeedValidationService(
    ctx.needValidationRepository,
    ctx.controlPlane,
    ctx.evidenceService,
    ctx.searchService,
    { checkpointGuard: checkpointService },
  );
  const candidateRef = ref('need_candidate', selectedCandidate.need_candidate_id, ctx.titleCard.title_card_id);
  candidateRef.version_id = selectedCandidate.candidate_version;
  const alternativeRef = ref('need_candidate', alternative.need_candidate_id, ctx.titleCard.title_card_id);
  alternativeRef.version_id = alternative.candidate_version;

  const confirmationInput: HumanConfirmationInput = {
    schema_version: 'HumanConfirmationInput@v1',
      actor_mode: 'human',
      accountable_human_ref: { actor_type: 'human', actor_id: 'reviewer_1' },
      rationale: 'Selected after comparing a substantively different intervention path.',
      accepted_risk_refs: ctx.packet.residual_risk_refs,
      required_check_results: ctx.packet.required_human_checks.map((checkId) => ({ check_id: checkId, result: 'accepted' })),
      delegated_executor: null,
      gap_selection_review: {
        research_checkpoint_id: checkpoint.research_checkpoint_id,
        confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
        selected_candidate_ref: candidateRef,
        direct_prior_art_pressure_reviewed: true,
        disconfirming_evidence_reviewed: true,
        candidate_reviews: [
          {
            need_candidate_ref: candidateRef,
            disposition: 'selected',
            distinct_from_selected_axes: [],
            rationale: 'Best identifiable evaluation object.',
          },
          {
            need_candidate_ref: alternativeRef,
            disposition: 'viable_alternative',
            distinct_from_selected_axes: ['intervention'],
            rationale: 'Changes the intervention and remains academically viable.',
          },
        ],
      },
  };
  const confirmation = await guardedNeedService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    confirmation_input: confirmationInput,
  });
  const advanced = await checkpointService.assertTransitionAllowed({
    title_card_id: ctx.titleCard.title_card_id,
    checkpoint_kind: 'gap_selection',
  });
  assert.equal(advanced.decision_authority_ref?.ref_id, confirmation.validated_need.human_decision_id);
  const replay = await guardedNeedService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    confirmation_input: confirmationInput,
  });
  assert.equal(replay.validated_need.validated_need_id, confirmation.validated_need.validated_need_id);
  const bundle = await guardedNeedService.publishV1bInputBundle({
    validated_need_id: confirmation.validated_need.validated_need_id,
  });
  assert.equal(bundle.validated_need_id, confirmation.validated_need.validated_need_id);
});

test('v1b input bundle publication rejects non-confirm human decision before persistence', async () => {
  const ctx = await createReadyPacketFixture();
  const adjudication = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'validate',
    rationale: 'Reviewer routes the validated need toward v1b after confirmation.',
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });
  const confirmation = await ctx.needService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    human_rationale: 'Validated after reviewing support, prior art, and scope.',
  });
  const humanDecision = await ctx.controlPlaneRepository.findHumanConfirmedDecisionById(
    confirmation.validated_need.human_decision_id,
  );
  assert.ok(humanDecision);
  humanDecision.decision_type = 'reject';

  await assert.rejects(
    () => ctx.needService.publishV1bInputBundle({
      validated_need_id: confirmation.validated_need.validated_need_id,
      created_by: 'system',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    confirmation.validated_need.validated_need_id,
  );
  assert.equal(bundles.length, 0);
});

test('validate adjudication rejects non-human confirmation actor before persistence', async () => {
  const ctx = await createReadyPacketFixture();
  const adjudication = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'validate',
    rationale: 'System-only adjudication can only request human review, not confirmation.',
    adjudicated_by: { actor_type: 'system' },
  });

  await assert.rejects(
    () => ctx.needService.confirmValidatedNeed({
      adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
      human_actor: { actor_type: 'system' },
      human_rationale: 'System-only confirmation should not materialize a ValidatedNeed.',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
  const validatedNeed = adjudication.adjudication_result.output_validated_need_id
    ? await ctx.needValidationRepository.findValidatedNeedById(adjudication.adjudication_result.output_validated_need_id)
    : null;
  const results = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(ctx.candidate.need_candidate_id);
  assert.equal(results.length, 1);
  assert.equal(validatedNeed, null);
});

test('validate confirmation rejects invalid legacy actor before missing adjudication lookup', async () => {
  const ctx = await createReadyPacketFixture();

  await assert.rejects(
    () => ctx.needService.confirmValidatedNeed({
      adjudication_result_id: 'missing-adjudication',
      human_actor: { actor_type: 'system' },
      human_rationale: 'Invalid actor should fail before lookup.',
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('validated candidate cannot be re-adjudicated and confirmation replay is content-bound', async () => {
  const ctx = await createReadyPacketFixture();
  const adjudication = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'validate',
    rationale: 'Reviewer confirms the unmet need and evidence boundary.',
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });
  let pendingAdjudicationError: unknown;
  try {
    await ctx.needService.adjudicateNeed({
      need_candidate_id: ctx.candidate.need_candidate_id,
      support_packet_id: ctx.packet.validation_support_packet_id,
      final_decision: 'validate',
      rationale: 'A second pending validate attempt should be rejected.',
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
    });
  } catch (error) {
    pendingAdjudicationError = error;
  }
  assert.ok(pendingAdjudicationError instanceof AppError);
  assert.equal(pendingAdjudicationError.statusCode, 409);
  assert.equal(pendingAdjudicationError.errorCode, 'GATE_CONSTRAINT_FAILED');

  const first = await ctx.needService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    human_rationale: 'Validated after reviewing support, prior art, and scope.',
  });
  const replay = await ctx.needService.confirmValidatedNeed({
    adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
    human_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    human_rationale: 'Validated after reviewing support, prior art, and scope.',
  });
  assert.equal(replay.validated_need.validated_need_id, first.validated_need.validated_need_id);

  let duplicateConfirmationError: unknown;
  try {
    await ctx.needService.confirmValidatedNeed({
      adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
      human_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
      human_rationale: 'A second confirmation should be rejected.',
    });
  } catch (error) {
    duplicateConfirmationError = error;
  }
  assert.ok(duplicateConfirmationError instanceof AppError);
  assert.equal(duplicateConfirmationError.statusCode, 409);
  assert.equal(duplicateConfirmationError.errorCode, 'VERSION_CONFLICT');

  let duplicateAdjudicationError: unknown;
  try {
    await ctx.needService.adjudicateNeed({
      need_candidate_id: ctx.candidate.need_candidate_id,
      support_packet_id: ctx.packet.validation_support_packet_id,
      final_decision: 'validate',
      rationale: 'A second validate attempt should be rejected.',
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
    });
  } catch (error) {
    duplicateAdjudicationError = error;
  }
  assert.ok(duplicateAdjudicationError instanceof AppError);
  assert.equal(duplicateAdjudicationError.statusCode, 409);
  assert.equal(duplicateAdjudicationError.errorCode, 'GATE_CONSTRAINT_FAILED');
  assert.ok(first.validated_need.validated_need_id);
});

test('request_searchplan_recheck emits T-052 request without mutating SearchPlan', async () => {
  const ctx = await createReadyPacketFixture();
  const planBefore = await ctx.searchResourceRepository.findSearchPlanById(ctx.plan.search_plan.search_plan_id);
  const result = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'request_searchplan_recheck',
    rationale: 'Need more counter-evidence coverage before validation.',
    searchplan_recheck_gap_codes: ['COUNTER_EVIDENCE_COVERAGE_GAP'],
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });
  const recheckRef = result.adjudication_result.output_searchplan_recheck_request_ref;
  const recheck = recheckRef
    ? await ctx.searchResourceRepository.findSearchPlanRecheckRequestById(recheckRef.ref_id)
    : null;
  const planAfter = await ctx.searchResourceRepository.findSearchPlanById(ctx.plan.search_plan.search_plan_id);

  assert.equal(result.adjudication_result.output_validated_need_id, null);
  assert.equal(recheck?.status, 'open');
  assert.equal(recheck?.source_ref.ref_id, ctx.candidate.need_candidate_id);
  assert.deepEqual(planAfter, planBefore);
});

test('merge without target is rejected before adjudication persistence', async () => {
  const ctx = await createReadyPacketFixture();

  await assert.rejects(
    () => ctx.needService.adjudicateNeed({
      need_candidate_id: ctx.candidate.need_candidate_id,
      support_packet_id: ctx.packet.validation_support_packet_id,
      final_decision: 'merge',
      rationale: 'This should require a merge target.',
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
  const results = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(ctx.candidate.need_candidate_id);
  assert.equal(results.length, 0);
});

test('memory suggestions remain suggestions only', async () => {
  const ctx = await createReadyPacketFixture();
  const result = await ctx.needService.adjudicateNeed({
    need_candidate_id: ctx.candidate.need_candidate_id,
    support_packet_id: ctx.packet.validation_support_packet_id,
    final_decision: 'park',
    rationale: 'Promising but not enough evidence yet.',
    memory_suggestion: {
      suggestion_type: 'parked_candidate',
      rationale: 'Remember this as a parked hypothesis, not durable policy memory.',
      suggestion_payload: { candidate_status: 'parked' },
    },
    adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_1' },
  });
  const suggestions = await ctx.needValidationRepository.listCandidateDecisionMemorySuggestionsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );

  assert.equal(result.memory_suggestion?.status, 'suggested');
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.status, 'suggested');
  assert.equal(result.v1b_input_bundle, null);
});
