import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { PrismaClient } from '@prisma/client';
import {
  createTopicSelectionOfflineFrozenInputBundle,
  type TopicSelectionOfflineEvaluationObservedOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-offline-evaluation-replay-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceSourceLocator,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  LiteratureFulltextExtractionBundle,
  LiteratureRecord,
} from '../repositories/literature-repository.js';
import { PrismaLiteratureRepository } from '../repositories/prisma/prisma-literature-repository.js';
import { PrismaTitleCardManagementRepository } from '../repositories/prisma/prisma-title-card-management-repository.js';
import { PrismaTopicSelectionControlPlaneRepository } from '../repositories/prisma/prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionEvidenceMapRepository } from '../repositories/prisma/prisma-topic-selection-evidence-map-repository.js';
import { PrismaTopicSelectionNeedValidationRepository } from '../repositories/prisma/prisma-topic-selection-need-validation-repository.js';
import { PrismaTopicSelectionOfflineEvaluationReplayRepository } from '../repositories/prisma/prisma-topic-selection-offline-evaluation-replay-repository.js';
import { PrismaTopicSelectionRecheckRiskMemoryRepository } from '../repositories/prisma/prisma-topic-selection-recheck-risk-memory-repository.js';
import { PrismaTopicSelectionSearchResourceRepository } from '../repositories/prisma/prisma-topic-selection-search-resource-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import { TopicSelectionNeedValidationService } from './topic-selection-need-validation-service.js';
import { TopicSelectionOfflineEvaluationReplayService } from './topic-selection-offline-evaluation-replay-service.js';
import { TopicSelectionRecheckRiskMemoryService } from './topic-selection-recheck-risk-memory-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';

const RUN_PRISMA_E2E = process.env.RUN_TOPIC_SELECTION_V1A_PRISMA_E2E === '1';
const FIXED_NOW = '2026-05-13T00:00:00.000Z';

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
}

function makeLiterature(literatureId: string, runKey: string): LiteratureRecord {
  return {
    id: literatureId,
    title: `Prisma E2E Evidence ${runKey}`,
    abstractText: 'Evidence-grounded literature workflows still miss reviewer-facing traceability needs.',
    keyContentDigest: 'problem: traceability gaps; limitation: weak counter-evidence accounting',
    authors: ['E2E Reviewer'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: `prisma e2e evidence ${runKey}`,
    titleAuthorsYearHash: `${runKey}-hash`,
    rightsClass: 'OA',
    tags: ['topic-selection', 'e2e'],
    activeEmbeddingVersionId: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };
}

function makeFulltextBundle(input: {
  literatureId: string;
  assetId: string;
  documentId: string;
  sectionId: string;
  paragraphId: string;
  anchorId: string;
}): LiteratureFulltextExtractionBundle {
  return {
    document: {
      id: input.documentId,
      literatureId: input.literatureId,
      sourceAssetId: input.assetId,
      normalizedText: 'Reviewer-aligned evidence workflows need stronger traceability. Baselines often miss provenance.',
      normalizedTextPath: null,
      normalizedTextChecksum: `doc-${input.documentId}`,
      parserName: 'fixture',
      parserVersion: '1',
      parserArtifactPath: null,
      parserArtifactMimeType: null,
      status: 'READY',
      diagnostics: [],
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    },
    sections: [
      {
        id: input.sectionId,
        documentId: input.documentId,
        sectionId: 'sec:intro',
        title: 'Introduction',
        level: 1,
        orderIndex: 1,
        startOffset: 0,
        endOffset: 63,
        pageStart: 1,
        pageEnd: 1,
        checksum: `section-${input.sectionId}`,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ],
    paragraphs: [
      {
        id: input.paragraphId,
        documentId: input.documentId,
        paragraphId: 'para:intro:1',
        sectionId: 'sec:intro',
        orderIndex: 1,
        text: 'Reviewer-aligned evidence workflows need stronger traceability.',
        startOffset: 0,
        endOffset: 63,
        pageNumber: 1,
        checksum: `paragraph-${input.paragraphId}`,
        confidence: 0.98,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ],
    anchors: [
      {
        id: input.anchorId,
        documentId: input.documentId,
        anchorId: 'tbl:baseline',
        anchorType: 'table',
        label: 'Table 1',
        text: 'Baseline provenance misses',
        pageNumber: 1,
        bbox: null,
        targetRefs: [],
        metadata: {},
        checksum: `anchor-${input.anchorId}`,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ],
  };
}

function locator(
  locatorType: TopicSelectionEvidenceSourceLocator['locator_type'],
  locatorRef: TopicSelectionFunctionalRef,
  titleCardId: string,
  literatureId: string,
  sourceId: string,
): TopicSelectionEvidenceSourceLocator {
  return {
    locator_type: locatorType,
    locator_ref: locatorRef,
    literature_ref: ref('literature_record', literatureId, titleCardId),
    source_ref: ref('literature_source', sourceId, titleCardId),
    content_ref: locatorType === 'manual' || locatorType === 'abstract' ? null : locatorRef,
    section_ref: locatorType === 'section' ? locatorRef : null,
    paragraph_ref: locatorType === 'paragraph' ? locatorRef : null,
    anchor_ref: locatorType === 'anchor' ? locatorRef : null,
    manual_label: locatorType === 'manual' ? 'Reviewer note from Prisma E2E smoke.' : null,
  };
}

test('v1a Prisma E2E smoke creates a traced human-confirmed ValidatedNeed and real replay baseline', {
  skip: RUN_PRISMA_E2E ? false : 'set RUN_TOPIC_SELECTION_V1A_PRISMA_E2E=1 with DATABASE_URL to run',
}, async () => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required for the Prisma E2E smoke test.');

  const prisma = new PrismaClient();
  const runKey = `v1a_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${runKey}_${++sequence}`;
  const now = () => FIXED_NOW;

  const titleCards = new PrismaTitleCardManagementRepository(prisma);
  const literature = new PrismaLiteratureRepository(prisma);
  const controlPlaneRepository = new PrismaTopicSelectionControlPlaneRepository(prisma);
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, { idFactory, now });
  const searchRepository = new PrismaTopicSelectionSearchResourceRepository(prisma);
  const evidenceRepository = new PrismaTopicSelectionEvidenceMapRepository(prisma);
  const needRepository = new PrismaTopicSelectionNeedValidationRepository(prisma);
  const recheckRepository = new PrismaTopicSelectionRecheckRiskMemoryRepository(prisma);
  const offlineRepository = new PrismaTopicSelectionOfflineEvaluationReplayRepository(prisma);
  const searchService = new TopicSelectionSearchResourceService(
    searchRepository,
    controlPlane,
    titleCards,
    literature,
    { idFactory, now },
  );
  const evidenceService = new TopicSelectionEvidenceMapService(
    evidenceRepository,
    controlPlane,
    searchRepository,
    literature,
    { idFactory, now },
  );
  const needService = new TopicSelectionNeedValidationService(
    needRepository,
    controlPlane,
    evidenceService,
    searchService,
    { idFactory, now },
  );
  const recheckService = new TopicSelectionRecheckRiskMemoryService(
    recheckRepository,
    controlPlane,
    searchRepository,
    needRepository,
    { idFactory, now },
  );
  const offlineService = new TopicSelectionOfflineEvaluationReplayService(offlineRepository, { idFactory, now });

  try {
    const titleCard = await titleCards.createTitleCard({
      working_title: `Prisma E2E Topic Selection ${runKey}`,
      brief: 'Validate a reviewer-aligned traceability need from concrete literature evidence.',
    });
    const titleCardId = titleCard.title_card_id;
    const literatureId = `lit_${runKey}`;
    const sourceId = `source_${runKey}`;
    const assetId = `asset_${runKey}`;
    const documentId = `doc_${runKey}`;
    const sectionId = `section_${runKey}`;
    const paragraphId = `paragraph_${runKey}`;
    const anchorId = `anchor_${runKey}`;

    await literature.createLiterature(makeLiterature(literatureId, runKey));
    await literature.upsertLiteratureSource({
      id: sourceId,
      literatureId,
      provider: 'manual',
      sourceItemId: `manual-${runKey}`,
      sourceUrl: `file://${runKey}.pdf`,
      rawPayload: { fixture: true },
      fetchedAt: FIXED_NOW,
    });
    await literature.upsertPipelineState({
      id: `pipeline_${runKey}`,
      literatureId,
      citationComplete: true,
      abstractReady: true,
      keyContentReady: true,
      dedupStatus: 'unique',
      updatedAt: FIXED_NOW,
    });
    await literature.upsertContentAsset({
      id: assetId,
      literatureId,
      assetKind: 'raw_fulltext',
      sourceKind: 'local_path',
      localPath: `/tmp/${assetId}.pdf`,
      checksum: `checksum-${assetId}`,
      mimeType: 'application/pdf',
      byteSize: 128,
      rightsClass: 'OA',
      status: 'ready',
      metadata: { fixture: true },
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    await literature.upsertFulltextExtractionBundle(makeFulltextBundle({
      literatureId,
      assetId,
      documentId,
      sectionId,
      paragraphId,
      anchorId,
    }));
    await titleCards.updateEvidenceBasket(titleCardId, {
      add_literature_ids: [literatureId],
    });

    const topicSeed = await searchService.createTopicSeedFromTitleCard({
      title_card_id: titleCardId,
      created_by: 'system',
    });
    const literatureSnapshot = await searchService.createLiteratureResourcePoolSnapshot({
      title_card_id: titleCardId,
      topic_seed_id: topicSeed.topic_seed_id,
      created_by: 'system',
    });
    const searchPlan = await searchService.createSearchPlan({
      title_card_id: titleCardId,
      topic_seed_id: topicSeed.topic_seed_id,
      literature_resource_pool_snapshot_id: literatureSnapshot.literature_resource_pool_snapshot_id,
      query_intents: [
        'support reviewer-aligned traceability need',
        'baseline provenance misses',
        'context CS paper engineering workflow',
      ],
      coverage_intents: [
        {
          coverage_key: 'support-traceability-gap',
          intent_type: 'support',
          query: 'support reviewer-aligned traceability need',
          expected_evidence_role: 'support',
        },
        {
          coverage_key: 'baseline-provenance-miss',
          intent_type: 'baseline',
          query: 'baseline provenance misses',
          expected_evidence_role: 'baseline',
        },
        {
          coverage_key: 'context-paper-engineering',
          intent_type: 'context',
          query: 'context CS paper engineering workflow',
          expected_evidence_role: 'context',
        },
      ],
      created_by: 'system',
    });
    const [supportRow, baselineRow, contextRow] = searchPlan.coverage_row_intents;
    assert.ok(supportRow);
    assert.ok(baselineRow);
    assert.ok(contextRow);

    const contentRefs = [
      ref('fulltext_section', sectionId, titleCardId),
      ref('fulltext_paragraph', paragraphId, titleCardId),
      ref('fulltext_anchor', anchorId, titleCardId),
    ];
    const searchRun = await searchService.recordSearchRun({
      title_card_id: titleCardId,
      search_plan_id: searchPlan.search_plan.search_plan_id,
      result_accounting: {
        total_result_count: 3,
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
        canonical_work_refs: [ref('literature_record', literatureId, titleCardId)],
      },
      evidence_map_input_refs: [
        ref('literature_record', literatureId, titleCardId),
        ref('literature_source', sourceId, titleCardId),
        ...contentRefs,
      ],
      raw_log_artifact: {
        provider: 'fixture',
        hits: [literatureId],
      },
      coverage_observations: searchPlan.coverage_row_intents.map((intent) => ({
        coverage_row_intent_id: intent.coverage_row_intent_id,
        status: 'succeeded',
        result_count: 1,
        source_count: 1,
      })),
      evidence_bindings: searchPlan.coverage_row_intents.map((intent, index) => ({
        coverage_row_intent_id: intent.coverage_row_intent_id,
        literature_ref: ref('literature_record', literatureId, titleCardId),
        source_refs: [
          ref('literature_source', sourceId, titleCardId),
          ...contentRefs,
        ],
        binding_kind: 'retrieval_hit',
        result_rank: index + 1,
      })),
      coverage_assessments: searchPlan.coverage_row_intents.map((intent) => ({
        coverage_row_intent_id: intent.coverage_row_intent_id,
        verdict: 'satisfied',
        confidence: 0.86,
        assessed_by: 'system',
      })),
      created_by: 'system',
    });
    const coverageMatrix = await searchService.getCoverageMatrix(searchPlan.search_plan.search_plan_id);
    assert.equal(coverageMatrix.summary.satisfied_count, 3);

    const evidenceMap = await evidenceService.createEvidenceMapFromSearchRun({
      title_card_id: titleCardId,
      search_run_id: searchRun.search_run.search_run_id,
      evidence_units: [
        {
          client_unit_key: 'support',
          coverage_row_intent_id: supportRow.coverage_row_intent_id,
          evidence_role: 'support',
          literature_ref: ref('literature_record', literatureId, titleCardId),
          source_refs: [ref('literature_source', sourceId, titleCardId)],
          locator: locator('section', ref('fulltext_section', sectionId, titleCardId), titleCardId, literatureId, sourceId),
          source_statement: 'Reviewer-aligned evidence workflows need stronger traceability.',
          normalized_statement: 'Reviewer-facing literature workflows have traceability gaps.',
        },
        {
          client_unit_key: 'baseline',
          coverage_row_intent_id: baselineRow.coverage_row_intent_id,
          evidence_role: 'baseline',
          literature_ref: ref('literature_record', literatureId, titleCardId),
          source_refs: [ref('literature_source', sourceId, titleCardId)],
          locator: locator('anchor', ref('fulltext_anchor', anchorId, titleCardId), titleCardId, literatureId, sourceId),
          source_statement: 'Table 1 reports baseline provenance misses.',
          normalized_statement: 'Existing baselines miss provenance in reviewer-facing evidence flows.',
        },
        {
          client_unit_key: 'context',
          coverage_row_intent_id: contextRow.coverage_row_intent_id,
          evidence_role: 'context',
          literature_ref: ref('literature_record', literatureId, titleCardId),
          source_refs: [ref('literature_source', sourceId, titleCardId)],
          locator: locator('manual', ref('manual_locator', `manual_${runKey}`, titleCardId), titleCardId, literatureId, sourceId),
          source_statement: 'The target workflow prepares CS paper engineering decisions for reviewer scrutiny.',
          normalized_statement: 'The need is scoped to CS paper engineering workflows.',
        },
      ],
      created_by: 'system',
    });
    assert.equal(evidenceMap.evidence_map.support_unit_count, 1);
    assert.equal(evidenceMap.evidence_map.baseline_unit_count, 1);
    assert.equal(evidenceMap.evidence_map.context_unit_count, 1);

    const candidate = await needService.createNeedCandidateFromEvidenceMap({
      title_card_id: titleCardId,
      evidence_map_id: evidenceMap.evidence_map.evidence_map_id,
      candidate_need: 'Reviewer-aligned topic selection needs stronger traceability from evidence to need.',
      mechanism_type: 'workflow_gap',
      mechanism_summary: 'Evidence-to-need decisions are hard to audit without explicit provenance and gates.',
      scope_notes: 'Local-first CS paper engineering assistant workflows.',
      prior_art_status: 'no_strong_solution_found',
      created_by: 'system',
    });
    const readiness = await needService.assessCandidateReadiness({
      need_candidate_id: candidate.need_candidate_id,
      assessed_by: 'system',
    });
    assert.equal(readiness.recommendation, 'ready_for_validation');
    assert.equal(readiness.blockers.length, 0);

    const packet = await needService.createValidationDecisionSupportPacket({
      need_candidate_id: candidate.need_candidate_id,
      readiness_assessment_id: readiness.readiness_assessment_id,
      created_by: 'system',
    });
    const adjudication = await needService.adjudicateNeed({
      need_candidate_id: candidate.need_candidate_id,
      support_packet_id: packet.validation_support_packet_id,
      final_decision: 'validate',
      rationale: 'Human reviewer confirms the unmet need and the trace boundary.',
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_prisma_e2e' },
    });
    assert.equal(adjudication.validated_need, null);
    assert.equal(adjudication.v1b_input_bundle, null);
    assert.ok(adjudication.adjudication_result.output_validated_need_id);
    assert.equal(adjudication.adjudication_result.human_decision_id, null);

    const confirm = () => needService.confirmValidatedNeed({
      adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
      human_actor: { actor_type: 'human' as const, actor_id: 'reviewer_prisma_e2e' },
      human_rationale: 'Validated after checking support, baseline, context, and handoff refs.',
    });
    const [confirmation, concurrentReplay] = await Promise.all([confirm(), confirm()]);
    assert.equal(
      concurrentReplay.validated_need.human_decision_id,
      confirmation.validated_need.human_decision_id,
    );
    const validatedNeed = confirmation.validated_need;
    const v1bInputBundle = await needService.publishV1bInputBundle({
      validated_need_id: validatedNeed.validated_need_id,
      created_by: 'system',
    });
    assert.equal(adjudication.adjudication_result.output_validated_need_id, validatedNeed.validated_need_id);
    assert.equal(v1bInputBundle.validated_need_id, validatedNeed.validated_need_id);

    const humanDecision = await controlPlaneRepository.findHumanConfirmedDecisionById(
      validatedNeed.human_decision_id,
    );
    assert.equal(humanDecision?.decision_type, 'confirm');
    assert.equal(await prisma.topicSelectionHumanConfirmedDecision.count({
      where: {
        targetRefType: 'validated_need',
        targetRefId: validatedNeed.validated_need_id,
      },
    }), 1);
    assert.equal(await prisma.topicSelectionValidatedNeed.count({
      where: { id: validatedNeed.validated_need_id },
    }), 1);

    const qualitySignal = await controlPlane.emitQualitySignal({
      title_card_id: titleCardId,
      target_ref: ref('validated_need', validatedNeed.validated_need_id, titleCardId),
      stage: 'v1a',
      check_type: 'trace_review',
      verdict: 'warn',
      issue_codes: ['TRACE_REVIEW_REQUIRED'],
      recommended_action: 'inspect_trace',
      refs: [
        ref('evidence_map', evidenceMap.evidence_map.evidence_map_id, titleCardId),
        ref('search_run', searchRun.search_run.search_run_id, titleCardId),
      ],
    });
    assert.equal(
      (await recheckService.listOpenQueueItems()).filter((item) => item.title_card_id === titleCardId).length,
      0,
    );
    const interpretedSignal = await recheckService.interpretQualitySignal({
      quality_signal_id: qualitySignal.quality_signal_id,
    });
    assert.equal(interpretedSignal.queue_item?.queue_item_type, 'recheck');

    const acceptedRisk = await recheckService.acceptRisk({
      title_card_id: titleCardId,
      risk_type: 'residual_coverage_gap',
      target_ref: ref('validated_need', validatedNeed.validated_need_id, titleCardId),
      scope_refs: [ref('search_plan', searchPlan.search_plan.search_plan_id, titleCardId, searchPlan.search_plan.plan_version)],
      affected_object_refs: [ref('validated_need', validatedNeed.validated_need_id, titleCardId)],
      rationale: 'Residual coverage risk is bounded for the E2E smoke case.',
      accepted_by: { actor_type: 'human', actor_id: 'reviewer_prisma_e2e' },
      recheck_condition: 'new counter-evidence appears',
    });
    assert.equal(acceptedRisk.status, 'active');

    const recheckCandidate = await needService.createNeedCandidateFromEvidenceMap({
      title_card_id: titleCardId,
      evidence_map_id: evidenceMap.evidence_map.evidence_map_id,
      candidate_need: 'Traceability should be rechecked with explicit counter-evidence search.',
      mechanism_type: 'workflow_gap',
      scope_notes: 'Secondary candidate for recheck path coverage.',
      prior_art_status: 'no_strong_solution_found',
      created_by: 'system',
    });
    const recheckReadiness = await needService.assessCandidateReadiness({
      need_candidate_id: recheckCandidate.need_candidate_id,
      assessed_by: 'system',
    });
    const recheckPacket = await needService.createValidationDecisionSupportPacket({
      need_candidate_id: recheckCandidate.need_candidate_id,
      readiness_assessment_id: recheckReadiness.readiness_assessment_id,
      created_by: 'system',
    });
    const recheckAdjudication = await needService.adjudicateNeed({
      need_candidate_id: recheckCandidate.need_candidate_id,
      support_packet_id: recheckPacket.validation_support_packet_id,
      final_decision: 'request_searchplan_recheck',
      rationale: 'Counter-evidence coverage should be expanded before validating this secondary candidate.',
      searchplan_recheck_gap_codes: ['COUNTER_EVIDENCE_COVERAGE_GAP'],
      memory_suggestion: {
        suggestion_type: 'recheck_learning',
        rationale: 'Record that counter-evidence coverage should be checked before validation.',
        suggestion_payload: { gap_code: 'COUNTER_EVIDENCE_COVERAGE_GAP' },
      },
      adjudicated_by: { actor_type: 'human', actor_id: 'reviewer_prisma_e2e' },
    });
    assert.equal(recheckAdjudication.adjudication_result.output_validated_need_id, null);
    assert.ok(recheckAdjudication.adjudication_result.output_searchplan_recheck_request_ref);
    const queuedRecheck = await recheckService.queueSearchPlanRecheckRequest({
      search_plan_recheck_request_id:
        recheckAdjudication.adjudication_result.output_searchplan_recheck_request_ref.ref_id,
    });
    assert.equal(queuedRecheck.queue_item?.handler_key, 'revise_search_plan');
    assert.ok(recheckAdjudication.memory_suggestion);
    const materializedMemory = await recheckService.materializeCandidateMemorySuggestion({
      memory_suggestion_id: recheckAdjudication.memory_suggestion.memory_suggestion_id,
    });
    assert.equal(materializedMemory.memory_entry.effect_policy, 'warn');

    const materializedRecheck = await searchService.resolveSearchPlanRecheckRequest({
      request_id: recheckAdjudication.adjudication_result.output_searchplan_recheck_request_ref.ref_id,
      outcome: 'materialized',
      decision_summary: 'Created revised counter-evidence SearchPlan and follow-up SearchRun.',
      revised_search_plan: {
        plan_version: `recheck-${runKey}`,
        query_intents: ['counter-evidence reviewer-aligned traceability already solved'],
        coverage_intents: [
          {
            coverage_key: 'counter-evidence',
            intent_type: 'challenge',
            query: 'counter-evidence reviewer-aligned traceability already solved',
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
          failure_summary: 'Recheck follow-up provider failed before returning consumable counter-evidence.',
        },
        evidence_map_input_refs: [],
        created_by: 'system',
      },
    });
    assert.equal(materializedRecheck.request.status, 'materialized');
    assert.equal(materializedRecheck.follow_up_search_run?.run_kind, 'recheck_followup');
    assert.equal(materializedRecheck.follow_up_search_run?.run_status, 'failed');

    const supportRefs = validatedNeed.evidence_role_bundle.support_unit_refs;
    const baselineRefs = validatedNeed.evidence_role_bundle.baseline_unit_refs;
    const contextRefs = validatedNeed.evidence_role_bundle.context_unit_refs;
    const traceRefs = [
      ...validatedNeed.trace_refs,
      ref('evidence_map', evidenceMap.evidence_map.evidence_map_id, titleCardId),
      ref('search_run', searchRun.search_run.search_run_id, titleCardId),
      ref('search_plan', searchPlan.search_plan.search_plan_id, titleCardId, searchPlan.search_plan.plan_version),
      ref(
        'literature_resource_pool_snapshot',
        literatureSnapshot.literature_resource_pool_snapshot_id,
        titleCardId,
        literatureSnapshot.snapshot_version,
      ),
    ];
    const observedOutput: TopicSelectionOfflineEvaluationObservedOutput = {
      final_decision: 'validate',
      readiness_recommendation: readiness.recommendation,
      readiness_passed: true,
      key_evidence_refs: [...supportRefs, ...baselineRefs],
      counter_evidence_refs: [],
      evidence_refs: [...supportRefs, ...baselineRefs, ...contextRefs],
      blocker_codes: [],
      trace_refs: traceRefs,
      trace_verdict: 'complete',
      human_override_refs: [],
      recheck_action_refs: [],
      memory_refs: [],
      memory_used_as_evidence_refs: [],
      downstream_rework_causes: [],
      payload: {
        validated_need_id: validatedNeed.validated_need_id,
        v1b_input_bundle_id: v1bInputBundle.v1b_input_bundle_id,
      },
    };
    const dataset = await offlineService.createDataset({
      dataset_key: `topic-selection-v1a-real-smoke-${runKey}`,
      dataset_version: 'v1',
      source: 'frozen_snapshot',
      status: 'active',
      description: 'Prisma E2E smoke dataset seeded from a real v1a vertical-slice output.',
      created_by: 'system',
    });
    const evaluationCase = await offlineService.addCase({
      dataset_id: dataset.offline_evaluation_dataset_id,
      title_card_id: titleCardId,
      case_key: `true-unmet-need-${runKey}`,
      case_type: 'true_unmet_need',
      frozen_input_bundle: createTopicSelectionOfflineFrozenInputBundle({
        frozen_at: FIXED_NOW,
        source_refs: traceRefs,
        stage_snapshots: {
          control_plane: {
            human_decision_id: validatedNeed.human_decision_id,
            quality_signal_id: qualitySignal.quality_signal_id,
          },
          search_resource: {
            topic_seed_id: topicSeed.topic_seed_id,
            literature_snapshot_id: literatureSnapshot.literature_resource_pool_snapshot_id,
            search_plan_id: searchPlan.search_plan.search_plan_id,
            search_run_id: searchRun.search_run.search_run_id,
          },
          evidence_map: {
            evidence_map_id: evidenceMap.evidence_map.evidence_map_id,
            evidence_unit_ids: evidenceMap.evidence_units.map((unit) => unit.evidence_unit_id),
          },
          need_validation: {
            need_candidate_id: candidate.need_candidate_id,
            readiness_assessment_id: readiness.readiness_assessment_id,
            support_packet_id: packet.validation_support_packet_id,
            adjudication_result_id: adjudication.adjudication_result.adjudication_result_id,
            validated_need_id: validatedNeed.validated_need_id,
            v1b_input_bundle_id: v1bInputBundle.v1b_input_bundle_id,
          },
          recheck_risk_memory: {
            accepted_risk_id: acceptedRisk.accepted_risk_id,
            queue_item_id: interpretedSignal.queue_item?.decision_work_queue_item_id,
          },
        },
        payload: {
          observed_output: observedOutput,
        },
      }),
      gold_expectation: {
        expected_unmet_need: true,
        expected_final_decision: 'validate',
        expected_readiness_passed: true,
        expected_key_evidence_refs: observedOutput.key_evidence_refs,
        expected_counter_evidence_refs: [],
        expected_blocker_codes: [],
        required_trace_refs: traceRefs,
        expected_trace_verdict: 'complete',
        expected_recheck_action_refs: [],
        expected_negative_memory_refs: [],
        expected_downstream_rework_causes: [],
        expected_baseline_solved: false,
        notes: ['Prisma E2E smoke true unmet need case.'],
      },
      tags: ['prisma-e2e', 'real-v1a-output'],
    });
    const replayRun = await offlineService.startRun({
      dataset_id: dataset.offline_evaluation_dataset_id,
      workflow_profile_key: 'topic-selection-v1a-prisma-e2e',
      workflow_profile_version: 'v1',
      model_profile_key: 'none-fixture',
      search_profile_key: 'prisma-fixture',
      policy_version_id: 'policy_prisma_e2e_v1',
      metric_keys: ['false_gap_rate', 'counter_evidence_recall', 'trace_completeness'],
    });
    await offlineService.recordFrozenCaseResult({
      run_id: replayRun.offline_evaluation_run_id,
      case_id: evaluationCase.offline_evaluation_case_id,
      observed_output: observedOutput,
    });
    const replayCompletion = await offlineService.completeRunAndCalculateMetrics({
      run_id: replayRun.offline_evaluation_run_id,
    });
    assert.equal(replayCompletion.run.status, 'completed');
    assert.equal(replayCompletion.metric_results.length, 3);
    assert.equal(
      replayCompletion.metric_results.find((metric) => metric.metric_key === 'trace_completeness')?.value,
      1,
    );

    const persistedCounts = await Promise.all([
      prisma.topicSelectionInputSnapshot.count({ where: { titleCardId } }),
      prisma.topicSelectionLlmWorkflowRun.count({ where: { titleCardId } }),
      prisma.topicSelectionReadinessGateResult.count({ where: { titleCardId } }),
      prisma.topicSelectionChainTransitionAttempt.count({ where: { titleCardId } }),
      prisma.topicSelectionTopicSeed.count({ where: { titleCardId } }),
      prisma.topicSelectionSearchRun.count({ where: { titleCardId } }),
      prisma.topicSelectionEvidenceMap.count({ where: { titleCardId } }),
      prisma.topicSelectionNeedCandidate.count({ where: { titleCardId } }),
      prisma.topicSelectionValidateNeedAdjudicationResult.count({ where: { titleCardId } }),
      prisma.topicSelectionValidatedNeed.count({ where: { titleCardId } }),
      prisma.topicSelectionHumanConfirmedDecision.count({ where: { titleCardId } }),
      prisma.topicSelectionDecisionWorkQueueItem.count({ where: { titleCardId } }),
      prisma.topicSelectionDecisionMemoryEntry.count({ where: { titleCardId } }),
      prisma.topicSelectionOfflineEvaluationRun.count({
        where: { datasetId: dataset.offline_evaluation_dataset_id },
      }),
    ]);
    assert.deepEqual(
      persistedCounts.map((count) => count > 0),
      Array.from({ length: persistedCounts.length }, () => true),
    );
  } finally {
    await prisma.$disconnect();
  }
});
