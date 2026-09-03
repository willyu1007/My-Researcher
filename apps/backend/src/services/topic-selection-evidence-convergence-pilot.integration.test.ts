import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  LiteratureRetrieveRequest,
  LiteratureRetrieveResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceSourceLocator,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionEvidenceConvergenceRetrievalRequestIntent,
  TopicSelectionEvidenceConvergenceRoundRole,
  TopicSelectionEvidenceConvergenceRoundRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionResearchArenaSessionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionResearchCheckpointDecisionInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import type {
  LiteratureFulltextExtractionBundle,
  LiteratureRecord,
} from '../repositories/literature-repository.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionBoundedDebateCoreService } from './topic-selection-bounded-debate-core-service.js';
import { TopicSelectionContextPolicyProfileRegistryService } from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionEvidenceConvergenceCoordinatorService,
  type TopicSelectionExecuteEvidenceConvergenceRetrievalInput,
} from './topic-selection-evidence-convergence-coordinator-service.js';
import {
  TopicSelectionEvidenceConvergenceRoundService,
  type TopicSelectionRunEvidenceConvergenceRoundInput,
} from './topic-selection-evidence-convergence-round-service.js';
import { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';

const BASE_TIME_MS = Date.parse('2026-09-03T08:00:00.000Z');
const LITERATURE_ID = 'lit_pilot';
const SOURCE_ID = 'source_pilot';
const DOCUMENT_ID = 'document_pilot';
const SUPPORT_PARAGRAPH_ID = 'paragraph_support';
const CHALLENGE_PARAGRAPH_ID = 'paragraph_challenge';
const BASELINE_ANCHOR_ID = 'anchor_baseline';
const CHALLENGE_STATEMENT = 'The intervention fails under distribution shift.';

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId?: string | null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function literature(): LiteratureRecord {
  return {
    id: LITERATURE_ID,
    title: 'Bounded convergence pilot evidence',
    abstractText: 'A local study of evidence convergence under distribution shift.',
    keyContentDigest: 'support, nearest baseline, and direct counter-evidence',
    authors: ['Pilot Author'],
    year: 2026,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: 'bounded convergence pilot evidence',
    titleAuthorsYearHash: 'pilot-title-authors-year-hash',
    rightsClass: 'OA',
    tags: ['pilot'],
    activeEmbeddingVersionId: 'embedding_pilot',
    createdAt: '2026-09-03T07:00:00.000Z',
    updatedAt: '2026-09-03T07:00:00.000Z',
  };
}

function fulltext(): LiteratureFulltextExtractionBundle {
  return {
    document: {
      id: DOCUMENT_ID,
      literatureId: LITERATURE_ID,
      sourceAssetId: 'asset_pilot',
      normalizedText: [
        'The intervention improves evidence retrieval.',
        CHALLENGE_STATEMENT,
        'The nearest baseline omits reviewer-aligned evidence checks.',
      ].join(' '),
      normalizedTextPath: null,
      normalizedTextChecksum: 'pilot-document-checksum',
      parserName: 'pilot-fixture',
      parserVersion: '1',
      parserArtifactPath: null,
      parserArtifactMimeType: null,
      status: 'READY',
      diagnostics: [],
      createdAt: '2026-09-03T07:00:00.000Z',
      updatedAt: '2026-09-03T07:00:00.000Z',
    },
    sections: [{
      id: 'section_pilot',
      documentId: DOCUMENT_ID,
      sectionId: 'section:results',
      title: 'Results',
      level: 1,
      orderIndex: 1,
      startOffset: 0,
      endOffset: 160,
      pageStart: 1,
      pageEnd: 1,
      checksum: 'pilot-section-checksum',
      createdAt: '2026-09-03T07:00:00.000Z',
      updatedAt: '2026-09-03T07:00:00.000Z',
    }],
    paragraphs: [{
      id: SUPPORT_PARAGRAPH_ID,
      documentId: DOCUMENT_ID,
      paragraphId: 'paragraph:support',
      sectionId: 'section:results',
      orderIndex: 1,
      text: 'The intervention improves evidence retrieval.',
      startOffset: 0,
      endOffset: 45,
      pageNumber: 1,
      checksum: 'pilot-support-checksum',
      confidence: 0.99,
      createdAt: '2026-09-03T07:00:00.000Z',
      updatedAt: '2026-09-03T07:00:00.000Z',
    }, {
      id: CHALLENGE_PARAGRAPH_ID,
      documentId: DOCUMENT_ID,
      paragraphId: 'paragraph:challenge',
      sectionId: 'section:results',
      orderIndex: 2,
      text: CHALLENGE_STATEMENT,
      startOffset: 46,
      endOffset: 100,
      pageNumber: 1,
      checksum: 'pilot-challenge-checksum',
      confidence: 0.99,
      createdAt: '2026-09-03T07:00:00.000Z',
      updatedAt: '2026-09-03T07:00:00.000Z',
    }],
    anchors: [{
      id: BASELINE_ANCHOR_ID,
      documentId: DOCUMENT_ID,
      anchorId: 'table:baseline',
      anchorType: 'table',
      label: 'Table 1',
      text: 'The nearest baseline omits reviewer-aligned evidence checks.',
      pageNumber: 1,
      bbox: null,
      targetRefs: [],
      metadata: {},
      checksum: 'pilot-anchor-checksum',
      createdAt: '2026-09-03T07:00:00.000Z',
      updatedAt: '2026-09-03T07:00:00.000Z',
    }],
  };
}

function locator(
  locatorType: Extract<TopicSelectionEvidenceSourceLocator['locator_type'], 'paragraph' | 'anchor'>,
  locatorRef: TopicSelectionFunctionalRef,
  titleCardId: string,
): TopicSelectionEvidenceSourceLocator {
  return {
    locator_type: locatorType,
    locator_ref: locatorRef,
    literature_ref: ref('literature_record', LITERATURE_ID, titleCardId),
    source_ref: ref('literature_source', SOURCE_ID, titleCardId),
    content_ref: locatorRef,
    document_ref: null,
    section_ref: null,
    paragraph_ref: locatorType === 'paragraph' ? locatorRef : null,
    anchor_ref: locatorType === 'anchor' ? locatorRef : null,
    manual_label: null,
  };
}

function retrievalResponse(query: string): LiteratureRetrieveResponse {
  return {
    items: [{
      literature_id: LITERATURE_ID,
      canonical_work_key: `work:${LITERATURE_ID}`,
      title: 'Bounded convergence pilot evidence',
      embedding_version_id: 'embedding_pilot',
      retrieval_profile: 'topic_exploration',
      is_stale: false,
      warnings: [],
      hybrid_score: 0.95,
      vector_score: 0.9,
      lexical_score: 0.85,
      evidence_chunks: [{
        chunk_id: `chunk:${query}`,
        chunk_type: 'fulltext_paragraph',
        text: CHALLENGE_STATEMENT,
        start_offset: 0,
        end_offset: CHALLENGE_STATEMENT.length,
        source_refs: [{ ref_type: 'paragraph', ref_id: CHALLENGE_PARAGRAPH_ID }],
        metadata: { paragraph_id: CHALLENGE_PARAGRAPH_ID },
        hybrid_score: 0.95,
        vector_score: 0.9,
        lexical_score: 0.85,
        score_breakdown: { vector: 0.9, lexical: 0.85, metadata: 0.1, profile_boost: 0.05 },
      }],
    }],
    meta: {
      profile: 'topic_exploration',
      query_tokens: query.split(' '),
      degraded_mode: false,
      freshness_warnings: [],
      profiles_used: [],
      skipped_profiles: [],
      query_embedding_telemetry: {
        provider_id: 'pilot-provider',
        model_id: 'pilot-embedding',
        profile_id: 'default',
        prompt_template_id: null,
        prompt_template_version: null,
        elapsed_ms: 5,
        request_count: 1,
        retry_count: 0,
        timeout_count: 0,
        rate_limit_count: 0,
        input_tokens: null,
        output_tokens: null,
        embedding_input_tokens: 8,
        total_tokens: 8,
        cost_usd: 0.000125,
      },
    },
  };
}

function roleOutput(
  role: TopicSelectionEvidenceConvergenceRoundRole,
  issueRef: TopicSelectionFunctionalRef,
  evidenceMapRef: TopicSelectionFunctionalRef,
  evidenceDeltaRef: TopicSelectionFunctionalRef,
  evidenceUnitRef: TopicSelectionFunctionalRef,
): TopicSelectionEvidenceConvergenceRoundRoleOutput {
  return {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1',
    participant_role: role,
    issue_ref: issueRef,
    evidence_map_ref: evidenceMapRef,
    evidence_delta_ref: evidenceDeltaRef,
    semantic_position: {
      summary: `${role} supports a bounded recheck of the evidence-landscape gate.`,
      recommended_disposition: 'recheck_same_gate',
      confidence: 0.9,
    },
    cited_evidence_unit_refs: [evidenceUnitRef],
    unresolved_issue_codes: [],
    support_only: true,
  };
}

test('bounded local pilot completes retrieval -> admission -> successor -> linked round -> checkpoint', async () => {
  let sequence = 0;
  let timeSequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const now = () => new Date(BASE_TIME_MS + timeSequence++ * 1_000).toISOString();
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literatureRepository = new InMemoryLiteratureRepository();
  const controlRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(controlRepository, { idFactory, now });
  const searchRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const checkpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const checkpointService = new TopicSelectionResearchCheckpointService(
    checkpointRepository,
    controlPlane,
    { idFactory, now },
  );
  const searchService = new TopicSelectionSearchResourceService(
    searchRepository,
    controlPlane,
    titleCards,
    literatureRepository,
    {
      idFactory,
      now,
      managedLibraryEligibilityResolver: {
        resolveManagedLibraryEligibility: async () => ({
          eligible_embedding_versions: [{
            embedding_version_id: 'embedding_pilot',
            literature_id: LITERATURE_ID,
            input_checksum: 'pilot-input-checksum',
            index_artifact_checksum: 'pilot-index-checksum',
          }],
          retrieval_stack_identity: {
            index_kind: 'pgvector',
            embedding_profile_id: 'default',
            embedding_provider: 'openai',
            embedding_model: 'text-embedding-3-small',
            embedding_dimension: 1_536,
            freshness_policy: 'current_only',
            retrieval_policy_version: 'literature-retrieval.v1',
            reranker_policy_version: 'hybrid-reranker.v1',
            candidate_window: {
              floor: 200,
              unscoped_ceiling: 1_200,
              scoped_ceiling: 2_000,
              profile_multipliers: {
                general: 8,
                topic_exploration: 10,
                writing_evidence: 10,
                paper_management: 12,
              },
              per_literature_cap_min: 4,
              per_literature_cap_max: 12,
              query_timeout_ms: 5_000,
            },
            corpus_scope: { mode: 'full_managed_library', human_confirmation_ref: null },
          },
        }),
      },
    },
  );
  const evidenceService = new TopicSelectionEvidenceMapService(
    evidenceRepository,
    controlPlane,
    searchRepository,
    literatureRepository,
    { idFactory, now, checkpointControl: checkpointService },
  );
  const arenaService = new TopicSelectionResearchArenaService({
    arenaRepository,
    controlPlaneRepository: controlRepository,
  }, { idFactory, now });
  const packetService = new TopicSelectionResearchEvidencePacketService({
    evidenceMapRepository: evidenceRepository,
    literatureRepository,
    directEvidenceReadinessResolver: async () => new Map([[
      LITERATURE_ID,
      {
        ready: true,
        reason: 'EVIDENCE_READY',
        freshness: 'fresh',
        freshness_detail: null,
      },
    ]]),
  });

  const titleCard = await titleCards.createTitleCard({
    working_title: 'Bounded convergence pilot',
    brief: 'Verify one complete local evidence-convergence loop.',
  });
  const titleCardId = titleCard.title_card_id;
  await literatureRepository.createLiterature(literature());
  await literatureRepository.upsertLiteratureSource({
    id: SOURCE_ID,
    literatureId: LITERATURE_ID,
    provider: 'manual',
    sourceItemId: 'pilot-source-item',
    sourceUrl: 'file://pilot.pdf',
    rawPayload: {},
    fetchedAt: '2026-09-03T07:00:00.000Z',
  });
  await literatureRepository.upsertPipelineState({
    id: 'pipeline_pilot',
    literatureId: LITERATURE_ID,
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: '2026-09-03T07:00:00.000Z',
  });
  await literatureRepository.upsertFulltextExtractionBundle(fulltext());

  const seed = await searchService.createTopicSeedFromTitleCard({
    title_card_id: titleCardId,
    created_by: 'system',
  });
  const manifest = await searchService.createLiteratureResourcePoolSnapshot({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    source_scope: 'managed_library',
    created_by: 'system',
  });
  assert.equal(manifest.retrieval_stack_identity?.corpus_scope.mode, 'full_managed_library');
  assert.deepEqual(manifest.literature_refs.map((candidate) => candidate.ref_id), [LITERATURE_ID]);

  const initialPlan = await searchService.createSearchPlan({
    title_card_id: titleCardId,
    topic_seed_id: seed.topic_seed_id,
    literature_resource_pool_snapshot_id: manifest.literature_resource_pool_snapshot_id,
    query_intents: ['support evidence', 'distribution-shift challenge', 'nearest baseline'],
    coverage_intents: [{
      coverage_key: 'support',
      intent_type: 'support',
      query: 'support evidence',
      required: false,
      expected_evidence_role: 'support',
    }, {
      coverage_key: 'required-challenge',
      intent_type: 'challenge',
      query: 'distribution-shift challenge',
      rationale: 'A direct challenge claim is required before review.',
      required: true,
      expected_evidence_role: 'challenge',
    }, {
      coverage_key: 'baseline',
      intent_type: 'baseline',
      query: 'nearest baseline',
      required: false,
      expected_evidence_role: 'baseline',
    }],
    created_by: 'system',
  });
  const [supportRow, challengeRow, baselineRow] = initialPlan.coverage_row_intents;
  assert.ok(supportRow && challengeRow && baselineRow);
  const literatureRef = ref('literature_record', LITERATURE_ID, titleCardId);
  const sourceRef = ref('literature_source', SOURCE_ID, titleCardId);
  const supportParagraphRef = ref('fulltext_paragraph', SUPPORT_PARAGRAPH_ID, titleCardId);
  const challengeParagraphRef = ref('fulltext_paragraph', CHALLENGE_PARAGRAPH_ID, titleCardId);
  const baselineAnchorRef = ref('fulltext_anchor', BASELINE_ANCHOR_ID, titleCardId);
  const initialRun = await searchService.recordSearchRun({
    title_card_id: titleCardId,
    search_plan_id: initialPlan.search_plan.search_plan_id,
    run_status: 'succeeded',
    query_provenance: [],
    result_accounting: {
      total_result_count: 2,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: { warning_codes: [] },
    evidence_map_input_refs: [
      literatureRef,
      sourceRef,
      supportParagraphRef,
      challengeParagraphRef,
      baselineAnchorRef,
    ],
    evidence_bindings: [{
      coverage_row_intent_id: supportRow.coverage_row_intent_id,
      literature_ref: literatureRef,
      source_refs: [sourceRef, supportParagraphRef],
      binding_kind: 'retrieval_hit',
      result_rank: 1,
    }, {
      coverage_row_intent_id: baselineRow.coverage_row_intent_id,
      literature_ref: literatureRef,
      source_refs: [sourceRef, baselineAnchorRef],
      binding_kind: 'retrieval_hit',
      result_rank: 2,
    }],
    coverage_assessments: [{
      coverage_row_intent_id: supportRow.coverage_row_intent_id,
      verdict: 'satisfied',
      issue_codes: [],
      confidence: 0.9,
      assessed_by: 'system',
    }, {
      coverage_row_intent_id: challengeRow.coverage_row_intent_id,
      verdict: 'missing',
      issue_codes: ['NO_DIRECT_CHALLENGE_EVIDENCE'],
      confidence: 0.95,
      assessed_by: 'system',
    }, {
      coverage_row_intent_id: baselineRow.coverage_row_intent_id,
      verdict: 'satisfied',
      issue_codes: [],
      confidence: 0.9,
      assessed_by: 'system',
    }],
    created_by: 'system',
  });
  const initialMapResult = await evidenceService.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: initialRun.search_run.search_run_id,
    evidence_units: [{
      client_unit_key: 'support',
      coverage_row_intent_id: supportRow.coverage_row_intent_id,
      evidence_role: 'support',
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: locator('paragraph', supportParagraphRef, titleCardId),
      source_statement: 'The intervention improves evidence retrieval.',
    }, {
      client_unit_key: 'baseline',
      coverage_row_intent_id: baselineRow.coverage_row_intent_id,
      evidence_role: 'baseline',
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: locator('anchor', baselineAnchorRef, titleCardId),
      source_statement: 'The nearest baseline omits reviewer-aligned evidence checks.',
    }],
    created_by: 'system',
  });
  const initialMap = initialMapResult.evidence_map;
  const initialMapRef = ref(
    'evidence_map',
    initialMap.evidence_map_id,
    titleCardId,
    initialMap.evidence_map_version,
  );
  const initialCheckpoint = await checkpointRepository.findCurrentCheckpoint(
    titleCardId,
    'evidence_landscape',
  );
  assert.ok(initialCheckpoint);
  const initialCheckpointPacket = await checkpointService.getPacket(initialCheckpoint.research_checkpoint_id);
  assert.equal(initialCheckpointPacket.packet_payload.policy_result, 'loopback_required');
  const humanLoopbackInput = {
    decision_key: 'bounded-convergence-pilot-human-loopback-v1',
    decision: 'loopback',
    actor: { actor_type: 'human', actor_id: 'pilot-reviewer' },
    confirmed_snapshot_hash: initialCheckpoint.target_snapshot_hash,
    rationale: 'The required distribution-shift challenge row needs direct claim-bearing evidence.',
    review_payload: {
      review_kind: 'evidence_landscape',
      nearest_work_reviewed: true,
      disconfirming_evidence_reviewed: true,
      source_quality_reviewed: true,
      limitations: ['Direct challenge evidence is missing from the current frozen map.'],
    },
    required_action_refs: initialCheckpoint.required_action_refs,
    loopback_target: 'evidence_landscape',
    loopback_refs: [initialMapRef],
  } satisfies TopicSelectionResearchCheckpointDecisionInput;
  const humanLoopbackDecision = await checkpointService.recordDecision(
    initialCheckpoint.research_checkpoint_id,
    humanLoopbackInput,
  );
  assert.equal(humanLoopbackDecision.actor.actor_type, 'human');
  assert.equal(humanLoopbackDecision.decision, 'loopback');
  const parentSnapshot = await controlPlane.compileInputSnapshot({
    title_card_id: titleCardId,
    target_ref: initialMapRef,
    source_refs: [initialMap.search_run_ref],
    payload: { evidence_map_ref: initialMapRef },
    created_by: 'system',
  });
  const parentTranscriptPayload = {
    schema_version: 'TopicSelectionEvidenceConvergenceRoundTranscript@v1',
    arena_session_id: 'arena_parent_pilot',
    support_only: true,
  };
  const parentTranscriptHash = sha256Text(stableStringify(parentTranscriptPayload));
  const parentTranscriptArtifact = await controlPlane.recordArtifactRef({
    title_card_id: titleCardId,
    artifact_kind: 'structured_output',
    storage_kind: 'inline',
    workflow_run_id: 'workflow_parent_pilot',
    input_snapshot_id: parentSnapshot.input_snapshot_id,
    payload: parentTranscriptPayload,
    checksum: parentTranscriptHash,
    mime_type: 'application/json',
    created_by: 'system',
  });
  const parentCreatedAt = now();
  const parentArena = {
    schema_version: 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: 'arena_parent_pilot',
    session_key: 'arena-parent-pilot',
    current_arena_key: `${titleCardId}:evidence_landscape`,
    workspace_id: null,
    title_card_id: titleCardId,
    arena_kind: 'evidence_landscape',
    target_ref: initialMapRef,
    input_snapshot_id: parentSnapshot.input_snapshot_id,
    input_snapshot_hash: parentSnapshot.snapshot_hash,
    participant_plan_hash: sha256Text('pilot-parent-participant-plan'),
    participant_roles: ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'],
    execution_plan_ref: ref('artifact_ref', 'parent_plan_pilot', titleCardId),
    status: 'synthesized',
    termination_reason: 'evidence_expansion_required',
    loop_transcript_ref: ref(
      'artifact_ref',
      parentTranscriptArtifact.artifact_ref_id,
      titleCardId,
      parentTranscriptArtifact.checksum,
    ),
    loop_transcript_hash: parentTranscriptHash,
    loop_delta_refs: [],
    support_only: true,
    supersedes_arena_session_id: null,
    superseded_by_arena_session_id: null,
    created_by: 'system',
    created_at: parentCreatedAt,
    updated_at: parentCreatedAt,
    synthesized_at: parentCreatedAt,
    superseded_at: null,
  } satisfies TopicSelectionResearchArenaSessionRecord;
  await arenaRepository.replaceCurrentSession(parentArena);

  const retrievalCalls: LiteratureRetrieveRequest[] = [];
  let scopedRetrievalCalled = false;
  let retrievalClock = 10;
  const coordinator = new TopicSelectionEvidenceConvergenceCoordinatorService({
    searchResources: searchService,
    evidenceMapReader: evidenceRepository,
    retriever: {
      retrieve: async (request) => {
        retrievalCalls.push(request);
        return retrievalResponse(request.query);
      },
    },
    scopedRetriever: {
      retrieve: async () => {
        scopedRetrievalCalled = true;
        throw new Error('full managed-library retrieval must not use the narrowed retriever');
      },
    },
    nowMs: () => {
      const current = retrievalClock;
      retrievalClock += 15;
      return current;
    },
  });
  const issueRef = ref('coverage_row_intent', challengeRow.coverage_row_intent_id, titleCardId);
  const requestIntent: TopicSelectionEvidenceConvergenceRetrievalRequestIntent = {
    issue_ref: issueRef,
    originating_arena_session_ref: ref(
      'research_arena_session',
      parentArena.arena_session_id,
      titleCardId,
    ),
    search_intent: 'Find direct evidence that challenges the intervention under shift.',
    candidate_queries: ['distribution shift failure', 'intervention failure evidence'],
    expected_decision_effect: 'Satisfy the required challenge row and recheck the same gate.',
    corpus_manifest_ref: ref(
      'literature_resource_pool_snapshot',
      manifest.literature_resource_pool_snapshot_id,
      titleCardId,
      manifest.snapshot_version,
    ),
    corpus_manifest_hash: manifest.snapshot_hash,
  };
  const retrievalInput = {
    title_card_id: titleCardId,
    target_search_plan_id: initialPlan.search_plan.search_plan_id,
    predecessor_evidence_map_id: initialMap.evidence_map_id,
    role_requests: [
      { participant_role: 'opportunity_scout', intent: requestIntent },
      { participant_role: 'empirical_skeptic', intent: requestIntent },
      { participant_role: 'synthesis_arbiter', intent: requestIntent },
    ],
    accounting: {
      orchestration_steps: 0,
      linked_rounds: 0,
      elapsed_ms: 10,
      accumulated_cost_microusd: 0,
    },
  } satisfies TopicSelectionExecuteEvidenceConvergenceRetrievalInput;
  const retrieval = await coordinator.executeRoleRetrievalRequests(retrievalInput);
  assert.equal(retrieval.status, 'retrieval_ready');
  assert.equal(retrieval.requests.length, 1, 'equivalent role requests must share one durable execution');
  assert.equal(retrieval.executions.length, 1);
  assert.equal(retrieval.role_distributions.length, 3);
  assert.equal(retrievalCalls.length, 2);
  assert.equal(scopedRetrievalCalled, false);
  assert.equal(retrieval.requests[0]?.status, 'materialized');
  assert.deepEqual(retrieval.accounting, {
    orchestration_steps: 1,
    linked_rounds: 0,
    elapsed_ms: 25,
    accumulated_cost_microusd: 250,
  });
  const execution = retrieval.executions[0]!;
  const hit = execution.retrieval_hits[0]!;
  assert.equal(hit.source_text, CHALLENGE_STATEMENT);
  assert.equal(hit.chunk_ref.ref_id, CHALLENGE_PARAGRAPH_ID);
  assert.notEqual(execution.request_ref.ref_id, execution.search_run_ref.ref_id);
  const persistedRetrievalRun = await searchService.getSearchRunById(execution.search_run_ref.ref_id);
  assert.ok(persistedRetrievalRun);
  assert.equal(persistedRetrievalRun.query_provenance.length, 2);
  assert.ok(persistedRetrievalRun.query_provenance.every((entry) => {
    const retrievalMeta = entry.retrieval_meta as LiteratureRetrieveResponse['meta'] | undefined;
    return entry.request_key === retrieval.requests[0]?.request_key
      && entry.strategy_key === retrieval.requests[0]?.strategy_key
      && retrievalMeta?.query_embedding_telemetry?.provider_id === 'pilot-provider';
  }));
  const retrievalLogArtifacts = await controlPlane.listArtifactRefsByWorkflowRunId(
    persistedRetrievalRun.workflow_run_id!,
  );
  assert.ok(retrievalLogArtifacts.some((artifact) => (
    artifact.payload?.schema_version === 'TopicSelectionEvidenceConvergenceRetrievalLog@v1'
  )));
  const retrievalReplay = await coordinator.executeRoleRetrievalRequests(retrievalInput);
  assert.equal(retrievalReplay.status, 'retrieval_ready');
  assert.equal(retrievalReplay.executions[0]?.request_ref.ref_id, execution.request_ref.ref_id);
  assert.equal(retrievalReplay.executions[0]?.search_run_ref.ref_id, execution.search_run_ref.ref_id);
  assert.deepEqual(retrievalReplay.executions[0]?.retrieval_hits, execution.retrieval_hits);
  assert.equal(retrievalReplay.executions[0]?.reused, true);
  assert.ok(retrievalReplay.role_distributions.every((distribution) => distribution.reused));
  assert.deepEqual(retrievalReplay.accounting, {
    orchestration_steps: 0,
    linked_rounds: 0,
    elapsed_ms: 25,
    accumulated_cost_microusd: 0,
  });
  assert.equal(retrievalCalls.length, 2, 'retrieval replay must not call the provider again');

  const noHitCoordinator = new TopicSelectionEvidenceConvergenceCoordinatorService({
    searchResources: searchService,
    evidenceMapReader: evidenceRepository,
    retriever: {
      retrieve: async (request) => ({ ...retrievalResponse(request.query), items: [] }),
    },
    scopedRetriever: {
      retrieve: async () => { throw new Error('unexpected narrowed retrieval'); },
    },
    nowMs: () => 200,
  });
  const noHit = await noHitCoordinator.executeRoleRetrievalRequests({
    ...retrievalInput,
    role_requests: [{
      participant_role: 'empirical_skeptic',
      intent: {
        ...requestIntent,
        search_intent: 'Try a distinct invariance-failure strategy.',
        candidate_queries: ['invariance counterexample', 'shift brittleness boundary'],
      },
    }],
  });
  assert.equal(noHit.status, 'saturated_unresolved');
  assert.deepEqual(noHit.reason_codes, ['UNCHANGED_STRATEGY_NO_RETRIEVAL_HITS']);
  assert.equal(noHit.executions[0]?.retrieval_hit_count, 0);
  assert.notEqual(noHit.requests[0]?.request_key, retrieval.requests[0]?.request_key);
  assert.notEqual(noHit.requests[0]?.strategy_key, retrieval.requests[0]?.strategy_key);

  let staleRetrievalCalls = 0;
  const staleCoordinator = new TopicSelectionEvidenceConvergenceCoordinatorService({
    searchResources: searchService,
    evidenceMapReader: evidenceRepository,
    retriever: {
      retrieve: async (request) => {
        staleRetrievalCalls += 1;
        const response = retrievalResponse(request.query);
        return {
          ...response,
          items: response.items.map((item) => ({ ...item, is_stale: true })),
        };
      },
    },
    scopedRetriever: {
      retrieve: async () => { throw new Error('unexpected narrowed retrieval'); },
    },
  });
  await assert.rejects(staleCoordinator.executeRoleRetrievalRequests({
    ...retrievalInput,
    role_requests: [{
      participant_role: 'opportunity_scout',
      intent: {
        ...requestIntent,
        search_intent: 'Test a distinct stale-source recovery strategy.',
        candidate_queries: ['historical shift failure evidence'],
      },
    }],
  }), /returned stale evidence/u);
  assert.equal(staleRetrievalCalls, 1);

  const successor = await evidenceService.publishEvidenceConvergenceSuccessor({
    title_card_id: titleCardId,
    predecessor_evidence_map_id: initialMap.evidence_map_id,
    search_run_id: execution.search_run_ref.ref_id,
    issue_ref: issueRef,
    decision_relevance: 'The exact retrieved counter-claim fills the required challenge row.',
    claim_admissions: [{
      schema_version: 'TopicSelectionEvidenceConvergenceClaimAdmission@v1',
      request_ref: execution.request_ref,
      search_run_ref: execution.search_run_ref,
      query: hit.query,
      literature_ref: hit.literature_ref,
      chunk_ref: hit.chunk_ref,
      chunk_hash: hit.chunk_hash,
      evidence_role: 'challenge',
      source_statement: CHALLENGE_STATEMENT,
      normalized_statement: 'The intervention is brittle under distribution shift.',
      interpretation_payload: { admission_reason: 'Direct evidence for the required challenge row.' },
      extraction_confidence: 0.95,
    }],
    created_by: 'system',
  });
  assert.equal(successor.status, 'successor_published');
  assert.equal(successor.evidence_delta.material, true);
  assert.ok(successor.successor);
  const successorMap = successor.successor.evidence_map;
  const admittedUnitRef = successor.evidence_delta.admitted_evidence_unit_refs[0]!;
  const persistedPredecessor = await evidenceRepository.findEvidenceMapById(initialMap.evidence_map_id);
  assert.equal(persistedPredecessor?.freshness_status, 'superseded');
  assert.equal(successorMap.predecessor_evidence_map_ref?.ref_id, initialMap.evidence_map_id);
  assert.equal(successorMap.material_evidence_delta_ref?.ref_id, successor.evidence_delta_ref.ref_id);

  const roles = ['opportunity_scout', 'empirical_skeptic', 'synthesis_arbiter'] as const;
  const packetArtifacts = await Promise.all(roles.map(async (role) => {
    const packet = await packetService.resolve({
      schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1',
      title_card_id: titleCardId,
      participant_role: role,
      query_intent: {
        intent_type: 'challenge',
        query: 'Does the admitted claim resolve the distribution-shift challenge?',
        rationale: 'Recheck the same evidence-landscape gate after exact claim admission.',
        target_claim: CHALLENGE_STATEMENT,
      },
      evidence_unit_refs: [admittedUnitRef],
    });
    const artifact = await controlPlane.recordArtifactRef({
      title_card_id: titleCardId,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      input_snapshot_id: successorMap.input_snapshot_id!,
      workflow_run_id: successorMap.workflow_run_id!,
      payload: packet as unknown as Record<string, unknown>,
      checksum: packet.packet_hash,
      mime_type: 'application/json',
      created_by: 'system',
    });
    return {
      role,
      ref: ref('artifact_ref', artifact.artifact_ref_id, titleCardId, artifact.checksum),
    };
  }));
  const successorMapRef = ref(
    'evidence_map',
    successorMap.evidence_map_id,
    titleCardId,
    successorMap.evidence_map_version,
  );
  let elapsedClock = 100;
  const roundService = new TopicSelectionEvidenceConvergenceRoundService({
    controlPlane,
    evidenceMaps: evidenceRepository,
    searchResources: searchService,
    arena: arenaService,
    debateCore: new TopicSelectionBoundedDebateCoreService({
      controlPlane,
      agentOrchestrator: new TopicSelectionAgentOrchestratorService({ controlPlane, now }),
    }),
    contextProfiles: new TopicSelectionContextPolicyProfileRegistryService(),
    evidencePacketResolver: packetService,
    checkpoints: checkpointService,
    nowMs: () => {
      const current = elapsedClock;
      elapsedClock += 25;
      return current;
    },
  });
  const roundInput = {
    title_card_id: titleCardId,
    predecessor_arena_session_id: parentArena.arena_session_id,
    successor_evidence_map_id: successorMap.evidence_map_id,
    evidence_delta_ref: successor.evidence_delta_ref,
    issue_ref: issueRef,
    execution_mode: 'mocked_llm',
    role_inputs: packetArtifacts.map(({ role, ref: packetRef }) => ({
      participant_role: role,
      evidence_packet_artifact_ref: packetRef,
      structured_output: roleOutput(
        role,
        issueRef,
        successorMapRef,
        successor.evidence_delta_ref,
        admittedUnitRef,
      ),
      fixture_id: `pilot_${role}`,
      operator_label: null,
    })),
    accounting: retrieval.accounting,
  } satisfies TopicSelectionRunEvidenceConvergenceRoundInput;
  const round = await roundService.runLinkedRound(roundInput);

  assert.equal(round.status, 'linked_round_completed');
  assert.equal(round.arena_session.status, 'synthesized');
  assert.equal(round.arena_session.supersedes_arena_session_id, parentArena.arena_session_id);
  assert.equal(round.round_link.evidence_delta_ref.ref_id, successor.evidence_delta_ref.ref_id);
  assert.equal(round.round_link.parent_transcript_hash, parentTranscriptHash);
  assert.deepEqual(round.accounting, {
    orchestration_steps: 2,
    linked_rounds: 1,
    elapsed_ms: 50,
    accumulated_cost_microusd: 250,
  });
  const finalCheckpointPacket = await checkpointService.getPacket(round.checkpoint.research_checkpoint_id);
  assert.equal(finalCheckpointPacket.packet_payload.policy_result, 'eligible_for_human_review');
  assert.equal(round.checkpoint.checkpoint_kind, initialCheckpoint.checkpoint_kind);
  assert.equal(round.checkpoint.current_checkpoint_key, initialCheckpoint.current_checkpoint_key);
  assert.equal(round.checkpoint.target_ref.ref_id, successorMap.evidence_map_id);
  assert.notEqual(execution.request_ref.ref_id, successor.evidence_delta_ref.ref_id);
  assert.notEqual(successor.evidence_delta_ref.ref_id, round.round_link_ref.ref_id);
  assert.notEqual(round.round_link_ref.ref_id, round.transcript_ref.ref_id);
  const roundReplay = await roundService.runLinkedRound(roundInput);
  assert.deepEqual(roundReplay, round);
  assert.equal(
    (await arenaRepository.listRoleExecutionsBySessionId(round.arena_session.arena_session_id)).length,
    3,
  );
  assert.equal(
    (await checkpointService.getCheckpoint(initialCheckpoint.research_checkpoint_id)).status,
    'superseded',
  );
  const preservedHumanPacket = await checkpointService.getPacket(
    initialCheckpoint.research_checkpoint_id,
  );
  assert.deepEqual(preservedHumanPacket.decision, humanLoopbackDecision);
  assert.equal(finalCheckpointPacket.decision, null);
  assert.deepEqual(
    await checkpointService.recordDecision(initialCheckpoint.research_checkpoint_id, humanLoopbackInput),
    humanLoopbackDecision,
    'an exact Human-decision replay must remain available after successor checkpoint publication',
  );
  const completedRetrievalReplay = await coordinator.executeRoleRetrievalRequests(retrievalInput);
  assert.equal(completedRetrievalReplay.status, 'retrieval_ready');
  assert.equal(completedRetrievalReplay.executions[0]?.reused, true);
  assert.equal(
    completedRetrievalReplay.executions[0]?.search_run_ref.ref_id,
    execution.search_run_ref.ref_id,
    'the durable retrieval must remain replayable after its predecessor map is superseded',
  );
  assert.equal(retrievalCalls.length, 2);
  await assert.rejects(coordinator.executeRoleRetrievalRequests({
    ...retrievalInput,
    role_requests: [{
      participant_role: 'opportunity_scout',
      intent: {
        ...requestIntent,
        search_intent: 'A new strategy cannot start from historical evidence.',
        candidate_queries: ['new historical-map query'],
      },
    }],
  }), /superseded predecessor permits only an exact materialized retrieval replay/u);
  assert.equal(retrievalCalls.length, 2);
});
