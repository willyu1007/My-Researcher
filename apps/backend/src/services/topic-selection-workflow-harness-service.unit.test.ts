import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
  TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
  type HumanConfirmationSemanticReview,
  type HumanConfirmationSemanticReviewContextPacket,
  type HumanConfirmationInput,
  type TopicSelectionArtifactFunctionalRef,
  type TopicSelectionNeedAdjudicationDecision,
  type TopicSelectionNeedAdjudicationRecommendationPacket,
  type TopicSelectionNeedDiscoveryArbiterContextPayload,
  type TopicSelectionNeedDiscoveryDebateIssueFrame,
  type TopicSelectionNeedDiscoveryDeepCriticNotes,
  type TopicSelectionNeedDiscoveryExplorerNotes,
  type TopicSelectionNeedDiscoveryExplorationContextPayload,
  type TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
  type TopicSelectionSearchPlanBlueprint,
  type TopicSelectionSearchRunRecordBundle,
  type TopicSelectionSearchRunHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_PACKET_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
  type TopicSelectionEvidenceMapExtractionContextPacket,
  type TopicSelectionEvidenceMapExtractionDraft,
  type TopicSelectionEvidenceSourceLocator,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1a-workflow-harness-contracts';
import type {
  TopicSelectionV1cHarnessNodeResult,
} from './topic-selection-v1c-harness-adapter.js';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionEvidenceMapRepository } from '../repositories/in-memory-topic-selection-evidence-map-repository.js';
import { InMemoryLiteratureRepository } from '../repositories/in-memory-literature-repository.js';
import { InMemoryTitleCardManagementRepository } from '../repositories/title-card-management.repository.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { InMemoryTopicSelectionSearchResourceRepository } from '../repositories/in-memory-topic-selection-search-resource-repository.js';
import type { LiteratureRecord } from '../repositories/literature-repository.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  type LlmCallTelemetry,
  type LlmStructuredOutputRequest,
  type LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { TopicSelectionGenerateNeedCandidateOrchestratorAdapterService } from './topic-selection-generate-need-candidate-orchestrator-adapter-service.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import { TopicSelectionNeedDiscoveryContextCompilerService } from './topic-selection-need-discovery-context-compiler-service.js';
import { TopicSelectionContextPacketCacheService } from './topic-selection-context-packet-cache-service.js';
import {
  type CreateTopicSelectionCompressionReportInput,
  type TopicSelectionCompressionReportRuntimeResult,
  TopicSelectionCompressionRuntimeService,
} from './topic-selection-compression-runtime-service.js';
import { TopicSelectionPersistNeedCandidateBatchService } from './topic-selection-persist-need-candidate-batch-service.js';
import { TopicSelectionRankedCandidateDraftBatchValidatorService } from './topic-selection-ranked-candidate-draft-batch-validator-service.js';
import { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';
import {
  type TopicSelectionWorkflowHarnessCreateTopicSeedInput,
  type TopicSelectionWorkflowHarnessCreateSearchPlanInput,
  type TopicSelectionWorkflowHarnessBuildEvidenceMapInput,
  type TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
  type TopicSelectionWorkflowHarnessPublishV1bInputBundleInput,
  type TopicSelectionWorkflowHarnessRecordSearchRunInput,
  type TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput,
  type TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput,
  type TopicSelectionWorkflowHarnessGenerateNeedCandidateInput,
  TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER,
  TopicSelectionWorkflowHarnessService,
} from './topic-selection-workflow-harness-service.js';
import {
  type TopicSelectionEvidenceMapEvidenceUnitInput,
  TopicSelectionEvidenceMapService,
} from './topic-selection-evidence-map-service.js';
import { TopicSelectionEvidenceMapMaterializationService } from './topic-selection-evidence-map-materialization-service.js';
import { TopicSelectionNeedValidationService } from './topic-selection-need-validation-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';

class StubLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];
  private readonly outputsBySchemaName = new Map<
    string,
    unknown | ((request: LlmStructuredOutputRequest) => unknown)
  >();

  constructor(private readonly output: TopicSelectionRankedCandidateDraftBatch) {}

  setOutputForSchema(
    schemaName: string,
    output: unknown | ((request: LlmStructuredOutputRequest) => unknown),
  ): void {
    this.outputsBySchemaName.set(schemaName, output);
  }

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const configuredOutput = this.outputsBySchemaName.get(request.schemaName);
    const output = typeof configuredOutput === 'function'
      ? configuredOutput(request)
      : configuredOutput ?? this.output;
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetry(),
    };
  }
}

class ForcedStaleContextPacketCacheService extends TopicSelectionContextPacketCacheService {
  override async lookup(
    input: Parameters<TopicSelectionContextPacketCacheService['lookup']>[0],
  ): ReturnType<TopicSelectionContextPacketCacheService['lookup']> {
    return {
      cache_result: 'blocked_stale',
      artifact_ref: null,
      artifact_hash: null,
      cache_key_hash: sha256Text(stableStringify(input.cache_key)),
      context_family: input.cache_key.context_family,
      context_policy_profile_id: input.context_policy_profile.context_policy_profile_id,
      context_policy_profile_version: input.context_policy_profile.context_policy_profile_version,
      context_policy_profile_hash: input.context_policy_profile_hash,
      source_refs_hash: input.source_refs_hash ?? input.cache_key.input_refs_hash,
      freshness_status: 'stale',
      provenance_ref: input.provenance_ref,
    };
  }
}

class ForcedBlockedCompressionRuntime extends TopicSelectionCompressionRuntimeService {
  override createReport(
    input: CreateTopicSelectionCompressionReportInput,
  ): TopicSelectionCompressionReportRuntimeResult {
    const result = super.createReport(input);
    const blockerCodes = [...result.blocker_codes, 'COMPRESSION_FORCED_TEST_BLOCK'];
    return {
      ...result,
      quality_gate_result: 'blocked',
      blocker_codes: blockerCodes,
      report: {
        ...result.report,
        quality_gate_result: 'blocked',
        blocker_codes: blockerCodes,
      },
    };
  }
}

async function makeRuntime(options: {
  contextPacketCache?: TopicSelectionContextPacketCacheService;
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(controlPlaneRepository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const titleCards = new InMemoryTitleCardManagementRepository();
  const literature = new InMemoryLiteratureRepository();
  const searchResourceRepository = new InMemoryTopicSelectionSearchResourceRepository();
  const searchResources = new TopicSelectionSearchResourceService(
    searchResourceRepository,
    controlPlane,
    titleCards,
    literature,
    {
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => '2026-05-19T00:00:00.000Z',
    },
  );
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const evidenceMaps = new TopicSelectionEvidenceMapService(
    evidenceRepository,
    controlPlane,
    searchResourceRepository,
    literature,
    {
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => '2026-05-19T00:00:00.000Z',
    },
  );
  const evidenceMapMaterializer = new TopicSelectionEvidenceMapMaterializationService();
  const artifactBoundary = new TopicSelectionNeedDiscoveryArtifactBoundaryService(controlPlane);
  const contextPacketCache = options.contextPacketCache ?? new TopicSelectionContextPacketCacheService();
  const contextCompiler = new TopicSelectionNeedDiscoveryContextCompilerService(artifactBoundary, {
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const needValidationRepository = new InMemoryTopicSelectionNeedValidationRepository();
  const needService = new TopicSelectionNeedValidationService(
    needValidationRepository,
    controlPlane,
    evidenceMaps,
    searchResources,
    {
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => '2026-05-19T00:00:00.000Z',
    },
  );
  const needCandidateBatchPersistence = new TopicSelectionPersistNeedCandidateBatchService(
    needValidationRepository,
    { now: () => '2026-05-19T00:00:00.000Z' },
  );
  const llmGateway = new StubLlmGateway(rankedBatch());
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const generateNeedCandidateAdapter = new TopicSelectionGenerateNeedCandidateOrchestratorAdapterService({
    contextCompiler,
    agentOrchestrator,
    artifactBoundary,
    draftBatchValidator: new TopicSelectionRankedCandidateDraftBatchValidatorService({
      now: () => '2026-05-19T00:00:00.000Z',
    }),
    needCandidateBatchPersistence,
  });
  const workflowHarness = new TopicSelectionWorkflowHarnessService({
    contextCompiler,
    generateNeedCandidateAdapter,
    artifactBoundary,
    contextPacketCache,
    controlPlane,
    searchResources,
    evidenceMaps,
    evidenceMapMaterializer,
    evidenceMapExtractionAgent: agentOrchestrator,
    needValidation: needService,
    needAdjudicationAgent: agentOrchestrator,
    compressionRuntime: options.compressionRuntime,
  }, {
    now: () => '2026-05-19T00:00:00.000Z',
  });

  return {
    workflowHarness,
    controlPlaneRepository,
    literature,
    evidenceRepository,
    evidenceMaps,
    evidenceMapMaterializer,
    needService,
    needValidationRepository,
    searchResourceRepository,
    searchResources,
    titleCards,
    llmGateway,
    contextPacketCache,
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function refForTitleCard(
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

function artifactRef(refId: string): TopicSelectionArtifactFunctionalRef {
  return {
    ref_type: 'artifact_ref',
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function v1cNodeResult(
  overrides: Partial<TopicSelectionV1cHarnessNodeResult> & Pick<TopicSelectionV1cHarnessNodeResult, 'node_id' | 'routing_outcome' | 'automation'>,
): TopicSelectionV1cHarnessNodeResult {
  const { node_id, routing_outcome, automation, ...rest } = overrides;
  return {
    node_id,
    node_name: `v1c-${node_id}`,
    routing_outcome,
    automation,
    authority_refs: [],
    diagnostic_refs: [],
    required_actions: [],
    loopback_hints: [],
    source_refs: [],
    snapshot_hashes: {},
    provider_involved: false,
    notes: [],
    ...rest,
  };
}

function assertScenarioPassed(result: {
  scenario_status: 'passed' | 'failed';
  assertions: Array<{ passed: boolean }>;
}): void {
  assert.equal(
    result.scenario_status,
    'passed',
    JSON.stringify(result.assertions.filter((assertion) => !assertion.passed), null, 2),
  );
}

function artifactSnapshotKey(record: { payload?: unknown }): string | null {
  const payload = record.payload;
  return payload && typeof payload === 'object' && 'artifact_key' in payload
    ? String((payload as { artifact_key?: unknown }).artifact_key ?? '')
    : null;
}

async function findAgentAuditSnapshot(input: {
  repository: InMemoryTopicSelectionControlPlaneRepository;
  refs: Array<TopicSelectionFunctionalRef | null | undefined>;
  nodeId: string;
}): Promise<{
  node_id: string;
  provenance?: { source_kind?: string | null; non_provider?: boolean | null } | null;
  token_budget_gate_result?: { decision?: string | null } | null;
}> {
  for (const refEntry of input.refs) {
    if (!refEntry || refEntry.ref_type !== 'artifact_ref') {
      continue;
    }
    const artifact = await input.repository.findArtifactRefById(refEntry.ref_id);
    const payload = artifact?.payload;
    if (!payload || typeof payload !== 'object') {
      continue;
    }
    const snapshot = payload as {
      schema_version?: string;
      node_id?: string;
      provenance?: { source_kind?: string | null; non_provider?: boolean | null } | null;
      token_budget_gate_result?: { decision?: string | null } | null;
    };
    if (
      snapshot.schema_version === 'topic-selection-agent-invocation-audit-v1'
      && snapshot.node_id === input.nodeId
    ) {
      return {
        node_id: snapshot.node_id,
        provenance: snapshot.provenance ?? null,
        token_budget_gate_result: snapshot.token_budget_gate_result ?? null,
      };
    }
  }
  throw new Error(`Agent audit snapshot for ${input.nodeId} not found.`);
}

function telemetry(): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    elapsed_ms: 12,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: null,
    output_tokens: null,
    embedding_input_tokens: null,
    total_tokens: null,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

function explorationPayload(): TopicSelectionNeedDiscoveryExplorationContextPayload {
  return {
    topic_scope: {
      title_card_id: 'title_card_001',
      domain: 'RAG fine-tuning safety',
    },
    evidence_signal_digest: {
      support_count: 2,
      challenge_count: 1,
    },
    resource_sample_digest: {
      sample_set_id: 'sample_set_001',
      role_counts: { support: 2, challenge: 1, baseline: 1 },
      topic_method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
    },
    search_coverage_digest: {
      coverage: 'partial',
      method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
    },
    sibling_candidate_digest: {
      candidate_count: 0,
    },
    decision_memory_digest: {
      required_challenges: ['avoid pseudo-gap framing'],
    },
    exploration_prompts: ['Generate specific, evidence-grounded candidate needs.'],
    challenge_prompts: ['Identify prior-art conflicts and pseudo-gap risks.'],
    allowed_outputs: ['ranked_candidate_draft_batch'],
    forbidden_outputs: ['need_candidate_authority_write', 'validated_need_write'],
  };
}

function arbiterPayload(): TopicSelectionNeedDiscoveryArbiterContextPayload {
  return {
    node_policy_ref: ref('node_policy', 'generate_need_candidate_v1'),
    output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1'),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
    role_level_summaries: [{ role: 'single_agent', summary: 'context-ready' }],
    candidate_pool_digest: { candidate_count: 0 },
    evidence_ref_table: [
      { evidence_ref: ref('evidence_unit', 'support_001'), role: 'support' },
      { evidence_ref: ref('evidence_unit', 'challenge_001'), role: 'challenge' },
      { evidence_ref: ref('evidence_unit', 'baseline_001'), role: 'baseline' },
      { evidence_ref: ref('evidence_conflict', 'conflict_001'), role: 'challenge' },
      { evidence_ref: ref('evidence_strength_assessment', 'strength_001'), role: 'strength' },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded drafts first'],
    persistence_rules: ['artifact-only until admission gates'],
    failure_rules: ['block when malformed'],
  };
}

function rankedBatch(nodeAttemptId = 'node_attempt_001'): TopicSelectionRankedCandidateDraftBatch {
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: nodeAttemptId === 'node_attempt_001' ? 'draft_batch_001' : `draft_batch_${nodeAttemptId}`,
      node_attempt_id: nodeAttemptId,
      terminal_result: 'finalize',
      ranking_rationale: 'Grounded in support and challenge evidence.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: 'draft_001',
        rank: 1,
        candidate_need: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
        unmet_need_statement: 'Existing studies do not isolate retrieval-risk effects during fine-tuning.',
        mechanism_type: 'evaluation_gap',
        mechanism_summary: 'Risk-aware evaluation gap.',
        mechanism_payload: { axis: 'retrieval-risk' },
        scope_notes: 'CS literature workflow only.',
        non_goal_notes: null,
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: [ref('evidence_unit', 'support_001')],
          challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
          baseline_unit_refs: [ref('evidence_unit', 'baseline_001')],
          context_unit_refs: [],
        },
        conflict_refs: [ref('evidence_conflict', 'conflict_001')],
        strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
        accepted_risk_refs: [],
        gap_codes: ['risk_evaluation_gap'],
        speculative: false,
        confidence: 0.82,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function explorerNotes(agentInstanceId: string, angleId: string): TopicSelectionNeedDiscoveryExplorerNotes {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'explorer',
    stage: 'round_1_discovery',
    agent_instance_id: agentInstanceId,
    candidate_angles: [
      {
        angle_id: angleId,
        summary: 'Evaluate RAG fine-tuning risk interactions.',
        candidate_need_hint: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
        evidence_refs: [ref('evidence_unit', 'support_001')],
      },
    ],
    evidence_refs: [ref('evidence_unit', 'support_001')],
    unresolved_questions: ['Which retrieval risks survive fine-tuning?'],
    warnings: [],
  };
}

function deepCriticNotes(): TopicSelectionNeedDiscoveryDeepCriticNotes {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'deep_critic',
    stage: 'round_1_discovery',
    agent_instance_id: 'deep_critic_1',
    critique_points: [
      {
        critique_id: 'critique_001',
        summary: 'Pseudo-gap risk unless challenge evidence is carried into evaluation.',
        severity: 'high',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
      },
    ],
    failure_modes: ['overstating novelty without benchmark comparison'],
    missing_evidence_questions: ['What benchmark baseline exists?'],
    evidence_refs: [ref('evidence_unit', 'challenge_001')],
    warnings: ['baseline coverage is thin'],
  };
}

function issueFrame(): TopicSelectionNeedDiscoveryDebateIssueFrame {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'arbiter',
    stage: 'issue_framing',
    frame_id: 'issue_frame_001',
    focused_questions: ['Can the candidate need stay grounded while carrying challenge evidence?'],
    requested_roles: ['explorer', 'deep_critic'],
    source_role_summary_refs: [artifactRef('role_summary_explorer'), artifactRef('role_summary_deep_critic')],
    stop_condition: null,
  };
}

function normalizedCandidateKey(batch = rankedBatch()): string {
  const draft = batch.drafts[0];
  return `${draft.candidate_need} ${draft.unmet_need_statement}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

function makeLiterature(id: string, overrides: Partial<LiteratureRecord> = {}): LiteratureRecord {
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
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    ...overrides,
  };
}

async function seedSnapshotRuntime(options: {
  mature?: boolean;
  missingLiterature?: boolean;
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await makeRuntime({
    compressionRuntime: options.compressionRuntime,
  });
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Risk-aware RAG adaptation',
    brief: 'Find a bounded research need for RAG and fine-tuning decisions.',
  });
  const literatureId = options.missingLiterature ? 'missing_lit_001' : 'lit_001';
  if (!options.missingLiterature) {
    const mature = options.mature !== false;
    await ctx.literature.createLiterature(makeLiterature('lit_001', mature
      ? {}
      : {
          abstractText: null,
          keyContentDigest: null,
        }));
    if (mature) {
      await ctx.literature.upsertLiteratureSource({
        id: 'source_001',
        literatureId: 'lit_001',
        provider: 'manual',
        sourceItemId: 'manual-lit-001',
        sourceUrl: 'file://lit_001.pdf',
        rawPayload: {},
        fetchedAt: '2026-05-19T00:00:00.000Z',
      });
    }
    await ctx.literature.upsertPipelineState({
      id: 'pipeline_state_001',
      literatureId: 'lit_001',
      citationComplete: mature,
      abstractReady: mature,
      keyContentReady: mature,
      dedupStatus: mature ? 'unique' : 'duplicate',
      updatedAt: '2026-05-19T00:00:00.000Z',
    });
  }
  await ctx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: [literatureId],
  });
  const topicSeed = await ctx.searchResources.createTopicSeedFromTitleCard({
    title_card_id: titleCard.title_card_id,
    intent_summary: 'Seed v1a with a bounded RAG/fine-tuning research intent.',
    scope_notes: 'Use only the current title-card topic scope.',
    created_by: 'system',
    policy_version_id: 'v1',
  });
  return {
    ...ctx,
    titleCard,
    topicSeed,
    topicSeedRef: {
      ref_type: 'topic_seed',
      ref_id: topicSeed.topic_seed_id,
      version_id: topicSeed.seed_version,
      title_card_id: titleCard.title_card_id,
    } satisfies TopicSelectionFunctionalRef,
  };
}

function snapshotScenarioInput(
  input: {
    title_card_id: string;
    topic_seed_ref: TopicSelectionFunctionalRef;
  },
  overrides: Partial<TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput> = {},
): TopicSelectionWorkflowHarnessSnapshotLiteratureResourcePoolInput {
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'snapshot-literature-resource-pool',
    title_card_id: input.title_card_id,
    workflow_run_id: 'workflow_run_snapshot_001',
    node_attempt_id: 'node_attempt_snapshot_001',
    topic_seed_ref: input.topic_seed_ref,
    source_scope: 'title_card_evidence_basket',
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'succeeded',
    },
    ...overrides,
  };
}

async function seedSearchPlanRuntime(options: {
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await seedSnapshotRuntime({
    compressionRuntime: options.compressionRuntime,
  });
  const snapshotResult = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    workflow_run_id: 'workflow_run_search_plan_snapshot',
    node_attempt_id: 'node_attempt_search_plan_snapshot',
  }));
  assert.equal(snapshotResult.node_result.status, 'succeeded');
  assert.ok(snapshotResult.node_result.literature_resource_pool_snapshot_ref);
  assert.ok(snapshotResult.node_result.snapshot_hash);
  return {
    ...ctx,
    literatureSnapshot: snapshotResult.node_result.literature_resource_pool_snapshot!,
    literatureSnapshotRef: snapshotResult.node_result.literature_resource_pool_snapshot_ref!,
    snapshotHash: snapshotResult.node_result.snapshot_hash!,
  };
}

function searchPlanBlueprint(input: {
  title_card_id: string;
  topic_seed_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  expected_snapshot_hash: string;
}, overrides: Partial<TopicSelectionSearchPlanBlueprint> = {}): TopicSelectionSearchPlanBlueprint {
  return {
    schema_version: 'TopicSelectionSearchPlanBlueprint@v1',
    blueprint_origin: 'workflow_scenario_fixture',
    blueprint_provenance_refs: [],
    title_card_ref: {
      ref_type: 'title_card',
      ref_id: input.title_card_id,
      title_card_id: input.title_card_id,
    },
    topic_seed_ref: input.topic_seed_ref,
    literature_resource_pool_snapshot_ref: input.literature_resource_pool_snapshot_ref,
    expected_snapshot_hash: input.expected_snapshot_hash,
    plan_version: 'v1',
    parent_search_plan_ref: null,
    recheck_request_ref: null,
    query_intents: [
      'risk-aware RAG fine-tuning evidence',
      'retrieval poisoning counter-evidence',
    ],
    coverage_intents: [
      {
        coverage_key: 'support-method',
        intent_type: 'support',
        query: 'risk-aware RAG fine-tuning evidence',
        rationale: 'Find method evidence supporting the scoped need.',
        required: true,
        priority: 1,
        expected_evidence_role: 'support',
        target_source_types: ['paper'],
        refs: [],
      },
      {
        coverage_key: 'challenge-risk',
        intent_type: 'challenge',
        query: 'retrieval poisoning counter-evidence',
        rationale: 'Find adversarial or poisoning evidence that can challenge the need.',
        required: true,
        priority: 2,
        expected_evidence_role: 'challenge',
        target_source_types: ['paper'],
        refs: [],
      },
    ],
    must_check_constraints: ['include challenge evidence before need generation'],
    exclusion_rules: ['exclude non-CS commentary'],
    coverage_strategy: { breadth: 'small', sequencing: ['support', 'challenge'] },
    role_coverage_expectation: { support: 1, challenge: 1 },
    method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
    policy_version: 'v1',
    output_schema_version: 'v1',
    ...overrides,
  };
}

function searchPlanScenarioInput(
  blueprint: TopicSelectionSearchPlanBlueprint | null,
  overrides: Partial<TopicSelectionWorkflowHarnessCreateSearchPlanInput> = {},
): TopicSelectionWorkflowHarnessCreateSearchPlanInput {
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'create-search-plan',
    title_card_id: blueprint?.title_card_ref.ref_id ?? 'title_card_001',
    workflow_run_id: 'workflow_run_search_plan_001',
    node_attempt_id: 'node_attempt_search_plan_001',
    blueprint,
    expectations: {
      status: 'succeeded',
      coverage_row_count: 2,
      plan_version: 'v1',
    },
    ...overrides,
  };
}

async function seedRecordSearchRunRuntime(options: {
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await seedSearchPlanRuntime({
    compressionRuntime: options.compressionRuntime,
  });
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  });
  const searchPlanResult = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_plan',
    node_attempt_id: 'node_attempt_record_search_plan',
  }));
  assert.equal(searchPlanResult.node_result.status, 'succeeded');
  assert.ok(searchPlanResult.node_result.search_plan_ref);
  assert.ok(searchPlanResult.node_result.coverage_row_intent_refs[0]);
  return {
    ...ctx,
    searchPlan: searchPlanResult.node_result.search_plan!,
    searchPlanRef: searchPlanResult.node_result.search_plan_ref!,
    coverageRowIntentRefs: searchPlanResult.node_result.coverage_row_intent_refs,
  };
}

function searchRunBundle(input: {
  title_card_id: string;
  search_plan_ref: TopicSelectionFunctionalRef;
  literature_resource_pool_snapshot_ref: TopicSelectionFunctionalRef;
  expected_literature_snapshot_hash: string;
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  literature_ref: TopicSelectionFunctionalRef;
  source_ref: TopicSelectionFunctionalRef;
  locator_ref?: TopicSelectionFunctionalRef | null;
}, overrides: Partial<TopicSelectionSearchRunRecordBundle> = {}): TopicSelectionSearchRunRecordBundle {
  return {
    schema_version: TOPIC_SELECTION_SEARCH_RUN_RECORD_BUNDLE_SCHEMA_VERSION,
    title_card_ref: {
      ref_type: 'title_card',
      ref_id: input.title_card_id,
      title_card_id: input.title_card_id,
    },
    search_plan_ref: input.search_plan_ref,
    literature_resource_pool_snapshot_ref: input.literature_resource_pool_snapshot_ref,
    expected_literature_snapshot_hash: input.expected_literature_snapshot_hash,
    run_kind: 'planned_search',
    run_status: 'succeeded',
    query_provenance: [{
      query: 'risk-aware RAG fine-tuning evidence',
      coverage_key: 'support-method',
      source: 'workflow_scenario_fixture',
    }],
    result_accounting: {
      total_result_count: 1,
      unique_literature_count: 1,
      duplicate_result_count: 0,
      failed_source_count: 0,
      skipped_source_count: 0,
    },
    source_health_summary: {
      source_count: 1,
      failed_source_count: 0,
      warning_codes: [],
    },
    dedup_summary: {
      duplicate_groups: 0,
    },
    evidence_map_input_refs: [
      input.literature_ref,
      input.source_ref,
      ...(input.locator_ref ? [input.locator_ref] : []),
    ],
    coverage_observations: [{
      coverage_row_intent_ref: input.coverage_row_intent_ref,
      status: 'succeeded',
      result_count: 1,
      source_count: 1,
      missing_reason_codes: [],
      notes: 'Fixture search run found one relevant paper.',
    }],
    evidence_bindings: [{
      coverage_row_intent_ref: input.coverage_row_intent_ref,
      literature_ref: input.literature_ref,
      source_refs: [input.source_ref],
      binding_kind: 'retrieval_hit',
      result_rank: 1,
    }],
    coverage_assessments: [{
      coverage_row_intent_ref: input.coverage_row_intent_ref,
      verdict: 'satisfied',
      issue_codes: [],
      confidence: 0.9,
      assessed_by: 'system',
    }],
    coverage_risk_acceptances: [],
    raw_log_artifact_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'raw_search_log_fixture_001',
      title_card_id: input.title_card_id,
    },
    raw_log_artifact_payload: {
      provider: 'fixture-search',
      result_ids: [input.literature_ref.ref_id],
    },
    policy_version: 'v1',
    output_schema_version: 'v1',
    ...overrides,
  };
}

async function seedBuildEvidenceMapRuntime() {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    locator_ref: {
      ref_type: 'literature_abstract',
      ref_id: `${ctx.literatureSnapshot.literature_refs[0]!.ref_id}_abstract`,
      title_card_id: ctx.titleCard.title_card_id,
    },
  });
  const searchRunResult = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-for-evidence-map',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_build_evidence_map_search_run',
    node_attempt_id: 'node_attempt_build_evidence_map_search_run',
    bundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: true,
      downstream_handoff_present: true,
    },
  });
  assert.equal(searchRunResult.node_result.status, 'succeeded');
  assert.ok(searchRunResult.node_result.downstream_handoff);
  return {
    ...ctx,
    searchRunHandoff: searchRunResult.node_result.downstream_handoff,
  };
}

function evidenceMapExtractionDraft(input: {
  title_card_id: string;
  handoff: TopicSelectionSearchRunHandoff;
  literature_ref: TopicSelectionFunctionalRef;
  source_ref: TopicSelectionFunctionalRef;
  coverage_row_intent_ref: TopicSelectionFunctionalRef;
  input_refs_hash: string;
}, overrides: Partial<TopicSelectionEvidenceMapExtractionDraft> = {}): TopicSelectionEvidenceMapExtractionDraft {
  return {
    schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_DRAFT_SCHEMA_VERSION,
    title_card_ref: {
      ref_type: 'title_card',
      ref_id: input.title_card_id,
      title_card_id: input.title_card_id,
    },
    search_run_ref: input.handoff.search_run_ref,
    search_plan_ref: input.handoff.search_plan_ref,
    literature_resource_pool_snapshot_ref: input.handoff.literature_resource_pool_snapshot_ref,
    literature_snapshot_hash: input.handoff.literature_snapshot_hash,
    producer_kind: 'fixture',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    input_refs_hash: input.input_refs_hash,
    draft_units: [{
      client_unit_key: 'unit_support_001',
      coverage_row_intent_ref: input.coverage_row_intent_ref,
      evidence_role: 'support',
      literature_ref: input.literature_ref,
      source_refs: [input.source_ref],
      locator: {
        locator_type: 'abstract',
        locator_ref: {
          ref_type: 'literature_abstract',
          ref_id: `${input.literature_ref.ref_id}_abstract`,
          title_card_id: input.title_card_id,
        },
        literature_ref: input.literature_ref,
        source_ref: input.source_ref,
      },
      source_statement: 'The paper reports a source-grounded RAG fine-tuning evaluation workflow.',
      source_attribution_kind: 'source_claim',
      normalized_statement: null,
      interpretation_payload: { role_hint: 'support' },
      confidence: 0.84,
      issue_codes: [],
    }],
    draft_links: [],
    draft_clusters: [],
    draft_patterns: [],
    draft_conflicts: [],
    warning_codes: [],
    policy_version: 'v1',
    output_schema_version: 'v1',
    ...overrides,
  };
}

function evidenceMapExtractionContextPacket(input: {
  workflow_run_id: string;
  node_attempt_id: string;
  handoff: TopicSelectionSearchRunHandoff;
  input_refs_hash: string;
  execution_mode?: 'mocked_llm' | 'codex_assisted' | 'provider_llm';
}): TopicSelectionEvidenceMapExtractionContextPacket {
  return {
    schema_version: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_CONTEXT_PACKET_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.build-evidence-map.v1',
    workflow_run_id: input.workflow_run_id,
    node_attempt_id: input.node_attempt_id,
    context_family: 'evidence_extraction_context',
    input_refs: [
      input.handoff.search_run_ref,
      input.handoff.search_plan_ref,
      input.handoff.literature_resource_pool_snapshot_ref,
    ],
    input_refs_hash: input.input_refs_hash,
    search_run_handoff_hash: 'search-run-handoff-hash-001',
    context_compiler_version: 'v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    execution_mode: input.execution_mode ?? 'mocked_llm',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    cache_key: 'evidence-extraction-cache-key-001',
    cache_hit: false,
    redaction_policy: 'topic_selection_evidence_map_extraction_context_redaction_v1',
    payload: {
      allowed_evidence_map_input_refs: input.handoff.evidence_map_input_refs,
      materialization_rules: ['source_claim_only', 'no_hidden_reasoning'],
    },
    created_at: '2026-05-19T00:00:00.000Z',
  };
}

function buildEvidenceMapScenarioInput(
  input: {
    title_card_id: string;
    handoff: TopicSelectionSearchRunHandoff;
    draft: TopicSelectionEvidenceMapExtractionDraft;
  },
  overrides: Partial<TopicSelectionWorkflowHarnessBuildEvidenceMapInput> = {},
): TopicSelectionWorkflowHarnessBuildEvidenceMapInput {
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'build-evidence-map',
    title_card_id: input.title_card_id,
    workflow_run_id: 'workflow_run_build_evidence_map_001',
    node_attempt_id: 'node_attempt_build_evidence_map_001',
    search_run_handoff: input.handoff,
    extraction_draft: input.draft,
    execution_mode: 'none',
    profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      evidence_unit_count: 1,
      downstream_handoff_present: true,
      warning_codes: ['ABSTRACT_ONLY_SUPPORT'],
    },
    ...overrides,
  };
}

function validationManualLocator(input: {
  title_card_id: string;
  literature_ref: TopicSelectionFunctionalRef;
  source_ref: TopicSelectionFunctionalRef;
  manual_ref: TopicSelectionFunctionalRef;
  manual_label: string;
}): TopicSelectionEvidenceSourceLocator {
  return {
    locator_type: 'manual',
    locator_ref: input.manual_ref,
    literature_ref: input.literature_ref,
    source_ref: input.source_ref,
    content_ref: null,
    document_ref: null,
    section_ref: null,
    paragraph_ref: null,
    anchor_ref: null,
    manual_label: input.manual_label,
  };
}

async function seedValidateNeedAdjudicationRuntime(options: {
  includeContext?: boolean;
  includeChallenge?: boolean;
  gapCodes?: string[];
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await seedRecordSearchRunRuntime({
    compressionRuntime: options.compressionRuntime,
  });
  const titleCardId = ctx.titleCard.title_card_id;
  const literatureRef = ctx.literatureSnapshot.literature_refs[0]!;
  const sourceRef = ctx.literatureSnapshot.content_source_refs[0]!;
  const manualLocatorRef = refForTitleCard('manual_locator', 'manual_validate_need_001', titleCardId);
  const bundle = searchRunBundle({
    title_card_id: titleCardId,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    locator_ref: manualLocatorRef,
  });
  const searchRunResult = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-for-validate-need',
    title_card_id: titleCardId,
    workflow_run_id: 'workflow_run_validate_need_search_run',
    node_attempt_id: 'node_attempt_validate_need_search_run',
    bundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: true,
      downstream_handoff_present: true,
    },
  });
  assertScenarioPassed(searchRunResult);
  assert.ok(searchRunResult.node_result.search_run_ref);
  const supportLocator = validationManualLocator({
    title_card_id: titleCardId,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    manual_ref: manualLocatorRef,
    manual_label: 'manual support provenance for validation fixture',
  });
  const evidenceUnits: TopicSelectionEvidenceMapEvidenceUnitInput[] = [
    {
      client_unit_key: 'support_ready',
      coverage_row_intent_id: ctx.coverageRowIntentRefs[0]?.ref_id,
      evidence_role: 'support' as const,
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: supportLocator,
      source_statement: 'The paper reports a traceable evidence workflow gap for risk-aware RAG adaptation.',
      normalized_statement: 'Risk-aware RAG adaptation lacks traceable validation workflows.',
    },
  ];
  if (options.includeContext !== false) {
    evidenceUnits.push({
      client_unit_key: 'context_ready',
      coverage_row_intent_id: null,
      evidence_role: 'context' as const,
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: validationManualLocator({
        title_card_id: titleCardId,
        literature_ref: literatureRef,
        source_ref: sourceRef,
        manual_ref: manualLocatorRef,
        manual_label: 'manual context provenance for validation fixture',
      }),
      source_statement: 'The workflow setting is local-first paper engineering with reviewer-facing evidence.',
      normalized_statement: 'The candidate is scoped to local-first reviewer-facing evidence workflows.',
    });
  }
  if (options.includeChallenge) {
    evidenceUnits.push({
      client_unit_key: 'challenge_ready',
      coverage_row_intent_id: null,
      evidence_role: 'challenge' as const,
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: validationManualLocator({
        title_card_id: titleCardId,
        literature_ref: literatureRef,
        source_ref: sourceRef,
        manual_ref: manualLocatorRef,
        manual_label: 'manual challenge provenance for validation fixture',
      }),
      source_statement: 'The same evidence notes that retrieval conflicts and source verification risks remain unresolved.',
      normalized_statement: 'Retrieval conflict and source verification risks must be carried forward.',
    });
  }
  const evidenceMapRecords = await ctx.evidenceMaps.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: searchRunResult.node_result.search_run_ref.ref_id,
    evidence_units: evidenceUnits,
    conflict_sets: options.includeChallenge
      ? [{
          conflict_type: 'claim_conflict',
          severity: 'moderate',
          support_unit_keys: ['support_ready'],
          challenge_unit_keys: ['challenge_ready'],
          issue_codes: ['RESIDUAL_RISK_PRESENT'],
        }]
      : [],
    created_by: 'system',
  });
  const candidate = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: titleCardId,
    evidence_map_id: evidenceMapRecords.evidence_map.evidence_map_id,
    candidate_need: 'Need traceable validation before promoting RAG adaptation topics.',
    unmet_need_statement: 'Existing workflows do not preserve enough evidence lineage before topic promotion.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'Validation lineage can be lost before v1b handoff.',
    scope_notes: 'Topic-selection v1a validation only.',
    prior_art_status: 'no_strong_solution_found',
    gap_codes: options.gapCodes ?? [],
    created_by: 'system',
  });
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: candidate.need_candidate_id,
    assessed_by: 'system',
  });
  const supportPacket = readiness.recommendation === 'ready_for_validation'
    ? await ctx.needService.createValidationDecisionSupportPacket({
        need_candidate_id: candidate.need_candidate_id,
        readiness_assessment_id: readiness.readiness_assessment_id,
        created_by: 'system',
      })
    : null;
  return {
    ...ctx,
    searchRunResult,
    evidenceMap: evidenceMapRecords.evidence_map,
    evidenceUnits: evidenceMapRecords.evidence_units,
    candidate,
    readiness,
    supportPacket,
  };
}

type ValidateNeedAdjudicationSeed = Awaited<ReturnType<typeof seedValidateNeedAdjudicationRuntime>>;

function needAdjudicationRecommendationPacket(
  ctx: ValidateNeedAdjudicationSeed,
  input: {
    workflow_run_id?: string;
    node_attempt_id?: string;
    final_decision?: TopicSelectionNeedAdjudicationDecision;
  } = {},
  overrides: Partial<TopicSelectionNeedAdjudicationRecommendationPacket> = {},
): TopicSelectionNeedAdjudicationRecommendationPacket {
  assert.ok(ctx.supportPacket);
  const workflowRunId = input.workflow_run_id ?? 'workflow_run_validate_need_001';
  const nodeAttemptId = input.node_attempt_id ?? 'node_attempt_validate_need_001';
  const finalDecision = input.final_decision ?? 'validate';
  const titleCardId = ctx.titleCard.title_card_id;
  return {
    schema_version: TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    recommendation_packet_id: `${nodeAttemptId}_recommendation`,
    need_candidate_ref: refForTitleCard('need_candidate', ctx.candidate.need_candidate_id, titleCardId, ctx.candidate.candidate_version),
    validation_support_packet_ref: refForTitleCard(
      'validation_decision_support_packet',
      ctx.supportPacket.validation_support_packet_id,
      titleCardId,
    ),
    readiness_assessment_ref: refForTitleCard('need_candidate_readiness', ctx.readiness.readiness_assessment_id, titleCardId),
    execution_mode: 'mocked_llm',
    profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
    final_decision: finalDecision,
    rationale: 'The support packet is sufficient for the requested adjudication route.',
    required_actions: finalDecision === 'return_to_candidate'
      ? ['revise candidate scope before another validation attempt']
      : ['route result according to deterministic node policy'],
    gap_codes: [],
    accepted_risk_refs: [],
    residual_risk_refs: ctx.supportPacket.residual_risk_refs,
    rejected_reason: finalDecision === 'reject' ? 'insufficient_evidence' : null,
    merge_target_need_candidate_ref: null,
    searchplan_recheck_reason: finalDecision === 'request_searchplan_recheck'
      ? 'Counter-evidence coverage should be refreshed before validation.'
      : null,
    searchplan_recheck_gap_codes: finalDecision === 'request_searchplan_recheck'
      ? ['COUNTER_EVIDENCE_COVERAGE_GAP']
      : [],
    source_refs: [
      refForTitleCard('need_candidate', ctx.candidate.need_candidate_id, titleCardId, ctx.candidate.candidate_version),
      refForTitleCard('need_candidate_readiness', ctx.readiness.readiness_assessment_id, titleCardId),
      refForTitleCard('validation_decision_support_packet', ctx.supportPacket.validation_support_packet_id, titleCardId),
    ],
    recommendation_payload: { confidence: 0.82 },
    policy_version: 'v1',
    output_schema_version: 'v1',
    ...overrides,
  };
}

function validateNeedAdjudicationScenarioInput(
  ctx: ValidateNeedAdjudicationSeed,
  packet: TopicSelectionNeedAdjudicationRecommendationPacket | null,
  overrides: Partial<TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput> = {},
): TopicSelectionWorkflowHarnessValidateNeedAdjudicationInput {
  const titleCardId = ctx.titleCard.title_card_id;
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'validate-need-adjudication',
    title_card_id: titleCardId,
    workflow_run_id: packet?.workflow_run_id ?? 'workflow_run_validate_need_001',
    node_attempt_id: packet?.node_attempt_id ?? 'node_attempt_validate_need_001',
    need_candidate_ref: refForTitleCard('need_candidate', ctx.candidate.need_candidate_id, titleCardId, ctx.candidate.candidate_version),
    evidence_map_ref: ctx.candidate.evidence_map_ref,
    search_run_ref: ctx.candidate.search_run_ref,
    search_plan_ref: ctx.candidate.search_plan_ref,
    literature_snapshot_ref: ctx.candidate.literature_snapshot_ref,
    readiness_assessment_ref: ctx.readiness
      ? refForTitleCard('need_candidate_readiness', ctx.readiness.readiness_assessment_id, titleCardId)
      : null,
    validation_support_packet_ref: ctx.supportPacket
      ? refForTitleCard('validation_decision_support_packet', ctx.supportPacket.validation_support_packet_id, titleCardId)
      : null,
    readiness_packet_mode: 'consume_explicit_ref',
    support_packet_mode: ctx.supportPacket ? 'consume_explicit_ref' : 'create_fresh',
    execution_mode: 'mocked_llm',
    run_mode: 'acceptance',
    profile_id: TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID,
    mocked_output: packet
      ? {
          fixture_id: `${packet.recommendation_packet_id}_fixture`,
          output: packet,
        }
      : null,
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: packet ? 'ready' : 'blocked',
      route_outcome: packet ? 'advance_to_human_confirmation' : 'blocked',
      final_decision: packet?.final_decision ?? null,
      adjudication_created: Boolean(packet),
    },
    ...overrides,
  };
}

function humanConfirmationInput(ctx: ValidateNeedAdjudicationSeed, overrides: Partial<HumanConfirmationInput> = {}): HumanConfirmationInput {
  assert.ok(ctx.supportPacket);
  const residualRiskRefs = ctx.supportPacket.residual_risk_refs;
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_INPUT_SCHEMA_VERSION,
    actor_mode: 'human',
    accountable_human_ref: { actor_type: 'human', actor_id: 'reviewer_1' },
    rationale: 'I reviewed the support packet, required checks, residual risks, and validate adjudication.',
    accepted_risk_refs: residualRiskRefs,
    required_check_results: ctx.supportPacket.required_human_checks.map((checkId) => ({
      check_id: checkId,
      result: 'accepted',
    })),
    delegated_executor: null,
    ...overrides,
  };
}

async function runValidateNeedForHumanConfirm(ctx: ValidateNeedAdjudicationSeed) {
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_human_confirm_prereq',
    node_attempt_id: 'node_attempt_human_confirm_prereq',
  });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet),
  );
  assertScenarioPassed(result);
  assert.ok(result.node_result.adjudication_result_ref);
  assert.ok(result.node_result.reserved_validated_need_ref);
  return result;
}

function humanConfirmNeedScenarioInput(
  ctx: ValidateNeedAdjudicationSeed,
  validateResult: Awaited<ReturnType<typeof runValidateNeedForHumanConfirm>>,
  overrides: Partial<TopicSelectionWorkflowHarnessHumanConfirmNeedInput> = {},
): TopicSelectionWorkflowHarnessHumanConfirmNeedInput {
  assert.ok(ctx.supportPacket);
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'human-confirm-need',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_human_confirm_need_001',
    node_attempt_id: 'node_attempt_human_confirm_need_001',
    adjudication_result_ref: validateResult.node_result.adjudication_result_ref!,
    need_candidate_ref: refForTitleCard('need_candidate', ctx.candidate.need_candidate_id, ctx.titleCard.title_card_id, ctx.candidate.candidate_version),
    validation_support_packet_ref: refForTitleCard(
      'validation_decision_support_packet',
      ctx.supportPacket.validation_support_packet_id,
      ctx.titleCard.title_card_id,
    ),
    reserved_validated_need_ref: validateResult.node_result.reserved_validated_need_ref!,
    confirmation_input: humanConfirmationInput(ctx),
    execution_mode: 'deterministic_parser',
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'ready',
      route_outcome: 'advance_to_publish_v1b_input_bundle',
      validated_need_created: true,
      v1b_bundle_created: false,
    },
    ...overrides,
  };
}

type HumanConfirmNeedScenarioResult = Awaited<ReturnType<TopicSelectionWorkflowHarnessService['runHumanConfirmNeedScenario']>>;

async function runHumanConfirmNeedForPublish(ctx: ValidateNeedAdjudicationSeed): Promise<HumanConfirmNeedScenarioResult> {
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_publish_prereq',
      node_attempt_id: 'node_attempt_publish_prereq',
    }),
  );
  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.ok(result.node_result.validated_need_ref);
  assert.ok(result.node_result.human_decision_ref);
  return result;
}

async function publishV1bInputBundleScenarioInput(
  ctx: ValidateNeedAdjudicationSeed,
  humanConfirmResult: HumanConfirmNeedScenarioResult,
  overrides: Partial<TopicSelectionWorkflowHarnessPublishV1bInputBundleInput> = {},
): Promise<TopicSelectionWorkflowHarnessPublishV1bInputBundleInput> {
  assert.ok(ctx.supportPacket);
  const titleCardId = ctx.titleCard.title_card_id;
  const validatedNeedId = humanConfirmResult.node_result.validated_need_ref!.ref_id;
  const validatedNeed = await ctx.needValidationRepository.findValidatedNeedById(validatedNeedId);
  assert.ok(validatedNeed);
  const memorySuggestions = await ctx.needValidationRepository.listCandidateDecisionMemorySuggestionsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  return {
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'publish-v1b-input-bundle',
    title_card_id: titleCardId,
    workflow_run_id: 'workflow_run_publish_v1b_input_bundle_001',
    node_attempt_id: 'node_attempt_publish_v1b_input_bundle_001',
    validated_need_ref: humanConfirmResult.node_result.validated_need_ref!,
    source_need_candidate_ref: refForTitleCard('need_candidate', ctx.candidate.need_candidate_id, titleCardId, ctx.candidate.candidate_version),
    adjudication_result_ref: humanConfirmResult.node_result.adjudication_result_ref!,
    support_packet_ref: humanConfirmResult.node_result.validation_support_packet_ref!,
    human_decision_ref: humanConfirmResult.node_result.human_decision_ref!,
    evidence_map_ref: validatedNeed.evidence_map_ref,
    search_run_ref: validatedNeed.search_run_ref,
    search_plan_ref: validatedNeed.search_plan_ref,
    literature_snapshot_ref: validatedNeed.literature_snapshot_ref,
    evidence_role_bundle: validatedNeed.evidence_role_bundle,
    risk_refs: [...validatedNeed.residual_risk_refs, ...validatedNeed.accepted_risk_refs],
    memory_suggestion_refs: memorySuggestions.map((suggestion) =>
      refForTitleCard('candidate_decision_memory_suggestion', suggestion.memory_suggestion_id, suggestion.title_card_id)
    ),
    recheck_request_refs: ctx.candidate.open_recheck_request_refs,
    expected_bundle_version: 'v1a-to-v1b-input-bundle-v1',
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'ready',
      route_outcome: 'published_v1b_input_bundle',
      idempotency_result: 'created_new_bundle',
      bundle_published: true,
    },
    ...overrides,
  };
}

function humanConfirmationSemanticReviewOutput(
  ctx: ValidateNeedAdjudicationSeed,
  input: TopicSelectionWorkflowHarnessHumanConfirmNeedInput,
  overrides: Partial<HumanConfirmationSemanticReview> = {},
): HumanConfirmationSemanticReview {
  return {
    schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    workflow_run_id: input.workflow_run_id,
    node_attempt_id: input.node_attempt_id,
    review_id: `${input.node_attempt_id}_semantic_review`,
    context_packet_ref: refForTitleCard('artifact_ref', 'semantic_context_fixture_001', ctx.titleCard.title_card_id),
    execution_mode: input.execution_mode ?? 'codex_assisted',
    profile_id: input.profile_id ?? TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
    status: 'pass',
    alignment_codes: ['validate_alignment_clear'],
    risk_coverage: 'complete',
    required_check_coverage: 'complete',
    scope_violations: [],
    rationale_summary: input.confirmation_input.rationale,
    provenance_ref: refForTitleCard('artifact_ref', 'semantic_review_fixture_001', ctx.titleCard.title_card_id),
    warning_codes: [],
    blocker_codes: [],
    review_reason_codes: [],
    policy_version: input.policy_version,
    output_schema_version: input.output_schema_version,
    ...overrides,
  };
}

function scenarioInput(
  overrides: Partial<TopicSelectionWorkflowHarnessGenerateNeedCandidateInput> = {},
): TopicSelectionWorkflowHarnessGenerateNeedCandidateInput {
  return {
    scenario_id: 'topic-selection.debate.v1a-need-discovery.v1',
    scenario_case_id: 'mocked-finalize-persist',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_001',
    input_snapshot_id: 'input_snapshot_001',
    node_attempt_id: 'node_attempt_001',
    topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
    resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
    candidate_pool_projection_ref: null,
    search_snapshot_refs: [ref('search_run', 'search_run_001')],
    resource_snapshot_refs: [ref('literature_snapshot', 'literature_snapshot_001')],
    policy_version: 'v1',
    output_schema_version: 'v1',
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    execution_mode: 'mocked_llm',
    run_mode: 'acceptance',
    exploration_payload: explorationPayload(),
    arbiter_payload: arbiterPayload(),
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: rankedBatch(),
    },
    persist_admitted_candidates: true,
    persistence_context: {
      search_run_ref: ref('search_run', 'search_run_001'),
      search_plan_ref: ref('search_plan', 'search_plan_001'),
      literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_001'),
    },
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 1,
      persistence: 'required',
    },
    ...overrides,
  };
}

test('workflow harness consumes v1c adapter node results through a forward-only native path', async () => {
  const { workflowHarness } = await makeRuntime();

  const result = workflowHarness.runV1cHarnessConsumptionScenario({
    scenario_id: 'topic-selection-v1c-native-consumption',
    scenario_case_id: 'happy-chain-to-bridge',
    workflow_run_id: 'workflow_run_v1c_001',
    node_attempt_id: 'node_attempt_v1c_001',
    node_results: [
      v1cNodeResult({ node_id: 'N1', routing_outcome: 'ready_for_gate', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N2', routing_outcome: 'support_ready', automation: 'advance', provider_involved: true }),
      v1cNodeResult({ node_id: 'N3', routing_outcome: 'ready_for_human_decision', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N4', routing_outcome: 'bridge_authorized', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N5', routing_outcome: 'bridge_ready', automation: 'stop' }),
    ],
    expectations: {
      status: 'passed',
      accepted_node_count: 5,
      terminal_node_id: 'N5',
      terminal_routing_outcome: 'bridge_ready',
      error_code: null,
    },
  });

  assert.equal(result.scenario_status, 'passed');
  assert.deepEqual(result.consumed_node_ids, ['N1', 'N2', 'N3', 'N4', 'N5']);
  assert.equal(result.terminal_node_id, 'N5');
  assert.equal(result.error_code, null);
  assert.equal(result.harness_trace_snapshot.payload_schema, 'WorkflowHarnessV1cConsumptionScenarioTrace@v1');
  assert.equal(result.harness_trace_snapshot.adapter_version, 'topic-selection-v1c-harness-adapter-v0');
});

test('workflow harness rejects v1c node progress after a stop result', async () => {
  const { workflowHarness } = await makeRuntime();

  const result = workflowHarness.runV1cHarnessConsumptionScenario({
    scenario_id: 'topic-selection-v1c-native-consumption',
    scenario_case_id: 'n3-action-required-stop',
    workflow_run_id: 'workflow_run_v1c_002',
    node_attempt_id: 'node_attempt_v1c_002',
    node_results: [
      v1cNodeResult({ node_id: 'N1', routing_outcome: 'ready_for_gate', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N2', routing_outcome: 'support_ready', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N3', routing_outcome: 'action_required', automation: 'stop' }),
      v1cNodeResult({ node_id: 'N4', routing_outcome: 'bridge_authorized', automation: 'advance' }),
    ],
    expectations: {
      status: 'failed',
      accepted_node_count: 3,
      terminal_node_id: 'N3',
      terminal_routing_outcome: 'action_required',
      error_code: 'node_after_terminal',
    },
  });

  assert.equal(result.scenario_status, 'failed');
  assert.equal(result.error_code, 'node_after_terminal');
  assert.deepEqual(result.consumed_node_ids, ['N1', 'N2', 'N3']);
});

test('workflow harness consumes v1c N6 as record-only downstream ingress without loopback automation', async () => {
  const { workflowHarness } = await makeRuntime();

  const result = workflowHarness.runV1cHarnessConsumptionScenario({
    scenario_id: 'topic-selection-v1c-native-consumption',
    scenario_case_id: 'bridge-then-downstream-feedback',
    workflow_run_id: 'workflow_run_v1c_003',
    node_attempt_id: 'node_attempt_v1c_003',
    node_results: [
      v1cNodeResult({ node_id: 'N4', routing_outcome: 'bridge_authorized', automation: 'advance' }),
      v1cNodeResult({ node_id: 'N5', routing_outcome: 'bridge_ready', automation: 'stop' }),
      v1cNodeResult({ node_id: 'N6', routing_outcome: 'recheck_opened', automation: 'record_only' }),
    ],
    expectations: {
      status: 'passed',
      accepted_node_count: 3,
      terminal_node_id: 'N6',
      terminal_routing_outcome: 'recheck_opened',
      error_code: null,
    },
  });

  assert.equal(result.scenario_status, 'passed');
  assert.deepEqual(result.consumed_node_ids, ['N4', 'N5', 'N6']);
  assert.equal(result.terminal_node_id, 'N6');
  assert.equal(result.terminal_automation, 'record_only');
});

test('workflow harness runs create-topic-seed through the search resource authority boundary', async () => {
  const { workflowHarness, controlPlaneRepository, searchResourceRepository, titleCards } = await makeRuntime();
  const titleCard = await titleCards.createTitleCard({
    working_title: 'Risk-aware RAG adaptation',
    brief: 'Find a bounded research need for RAG and fine-tuning decisions.',
  });

  const result = await workflowHarness.runCreateTopicSeedScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'topic-seed-happy-path',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_topic_seed_001',
    node_attempt_id: 'node_attempt_topic_seed_001',
    intent_summary: 'Seed v1a with a bounded RAG/fine-tuning research intent.',
    scope_notes: 'Use only the current title-card topic scope.',
    intent_preparation_refs: [{
      ref_type: 'topic_seed_intent_draft',
      ref_id: 'intent_draft_001',
      title_card_id: titleCard.title_card_id,
    }],
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'succeeded',
      seed_version: 'v1',
      intent_summary: 'Seed v1a with a bounded RAG/fine-tuning research intent.',
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.create-topic-seed.v1');
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.topic_seed?.seed_kind, 'title_card');
  assert.equal(result.node_result.topic_seed_ref?.version_id, 'v1');
  assert.equal(result.node_result.authority_refs.length, 1);
  assert.equal(result.node_result.audit_refs.length, 3);
  assert.equal(result.harness_trace_artifact.artifact_kind, 'trace');
  assert.equal(result.harness_trace_snapshot.node_status, 'succeeded');

  const persisted = await searchResourceRepository.findTopicSeedById(result.node_result.topic_seed!.topic_seed_id);
  assert.equal(persisted?.title_card_id, titleCard.title_card_id);
  assert.equal(persisted?.source_title_card_ref.ref_id, titleCard.title_card_id);
  const inputSnapshot = await controlPlaneRepository.findInputSnapshotById(persisted!.input_snapshot_id!);
  assert.equal(inputSnapshot?.source_refs.some((sourceRef) => sourceRef.ref_id === 'intent_draft_001'), true);
  assert.deepEqual(inputSnapshot?.payload?.intent_preparation_refs, [{
    ref_type: 'topic_seed_intent_draft',
    ref_id: 'intent_draft_001',
    title_card_id: titleCard.title_card_id,
  }]);

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_topic_seed_001');
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.payload?.payload_schema, 'WorkflowHarnessCreateTopicSeedScenarioTrace@v1');
});

test('workflow harness returns a blocked create-topic-seed result without authority on missing TitleCard', async () => {
  const { workflowHarness, controlPlaneRepository, searchResourceRepository } = await makeRuntime();

  const result = await workflowHarness.runCreateTopicSeedScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'topic-seed-missing-title-card',
    title_card_id: 'missing_title_card',
    workflow_run_id: 'workflow_run_topic_seed_missing',
    node_attempt_id: 'node_attempt_topic_seed_missing',
    intent_summary: 'This should not create authority.',
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'blocked',
      error_code: 'NOT_FOUND',
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.error_code, 'NOT_FOUND');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.node_result.topic_seed, null);
  assert.equal(await searchResourceRepository.findTopicSeedById('topic_seed_1'), null);

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_topic_seed_missing');
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.payload?.node_status, 'blocked');
  assert.deepEqual(artifacts[0]?.payload?.blocker_codes, ['NOT_FOUND']);
});

test('workflow harness snapshots literature resource pool through the search resource authority boundary', async () => {
  const ctx = await seedSnapshotRuntime();

  const result = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    resource_sample_set_provenance_ref: {
      ref_type: 'resource_sample_set',
      ref_id: 'sample_set_001',
      title_card_id: ctx.titleCard.title_card_id,
    },
    expectations: {
      status: 'succeeded',
      included_literature_count: 1,
      content_source_count: 1,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.snapshot-literature-resource-pool.v1');
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.literature_resource_pool_snapshot?.topic_seed_ref.ref_id, ctx.topicSeed.topic_seed_id);
  assert.equal(result.node_result.literature_resource_pool_snapshot_ref?.version_id, result.node_result.snapshot_version);
  assert.equal(result.node_result.snapshot_hash?.length, 64);
  assert.equal(result.node_result.included_literature_refs[0]?.ref_id, 'lit_001');
  assert.equal(result.node_result.content_source_refs[0]?.ref_id, 'source_001');
  assert.deepEqual(result.node_result.warning_codes, []);
  assert.equal(result.node_result.authority_refs.length, 1);
  assert.equal(result.node_result.audit_refs.length, 3);
  assert.equal(
    result.node_result.downstream_handoff?.literature_resource_pool_snapshot_ref.ref_id,
    result.node_result.literature_resource_pool_snapshot?.literature_resource_pool_snapshot_id,
  );
  assert.equal(result.harness_trace_artifact.artifact_kind, 'trace');
  assert.equal(
    result.harness_trace_snapshot.payload_schema,
    'WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1',
  );

  const persisted = await ctx.searchResourceRepository.findLiteratureResourcePoolSnapshotById(
    result.node_result.literature_resource_pool_snapshot!.literature_resource_pool_snapshot_id,
  );
  assert.equal(persisted?.snapshot_hash, result.node_result.snapshot_hash);
  const inputSnapshot = await ctx.controlPlaneRepository.findInputSnapshotById(persisted!.input_snapshot_id!);
  assert.equal(inputSnapshot?.source_refs.some((sourceRef) => sourceRef.ref_id === 'sample_set_001'), true);
  assert.deepEqual(inputSnapshot?.payload?.resource_sample_set_provenance_ref, {
    ref_type: 'resource_sample_set',
    ref_id: 'sample_set_001',
    title_card_id: ctx.titleCard.title_card_id,
  });

  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_snapshot_001');
  assert.equal(artifacts.length, 1);
  assert.equal(
    artifacts[0]?.payload?.payload_schema,
    'WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1',
  );
});

test('workflow harness blocks unsupported resource-pool source scopes before authority creation', async () => {
  const ctx = await seedSnapshotRuntime();

  const result = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    source_scope: 'manual_selection',
    workflow_run_id: 'workflow_run_snapshot_unsupported_scope',
    node_attempt_id: 'node_attempt_snapshot_unsupported_scope',
    expectations: {
      status: 'blocked',
      error_code: 'UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A',
      blocker_codes: ['UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A'],
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.error_code, 'UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A');
  assert.deepEqual(result.node_result.blocker_codes, ['UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A']);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.node_result.literature_resource_pool_snapshot, null);

  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_snapshot_unsupported_scope');
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0]?.payload?.node_status, 'blocked');
});

test('workflow harness preserves missing literature blocker codes without snapshot authority', async () => {
  const ctx = await seedSnapshotRuntime({ missingLiterature: true });

  const result = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    workflow_run_id: 'workflow_run_snapshot_missing_literature',
    node_attempt_id: 'node_attempt_snapshot_missing_literature',
    expectations: {
      status: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['MISSING_LITERATURE_RECORD'],
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.error_code, 'GATE_CONSTRAINT_FAILED');
  assert.deepEqual(result.node_result.blocker_codes, ['MISSING_LITERATURE_RECORD']);
  assert.deepEqual(result.node_result.source_health_summary?.missing_literature_ids, ['missing_lit_001']);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.deepEqual(result.node_result.audit_refs.map((ref) => ref.ref_type), [
    'input_snapshot',
    'readiness_gate_result',
    'chain_transition_attempt',
  ]);
  assert.equal(result.node_result.literature_resource_pool_snapshot, null);

  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(
    'workflow_run_snapshot_missing_literature',
  );
  assert.equal(artifacts.length, 1);
  assert.deepEqual((artifacts[0]?.payload?.audit_refs as TopicSelectionFunctionalRef[]).map((ref) => ref.ref_type), [
    'input_snapshot',
    'readiness_gate_result',
    'chain_transition_attempt',
  ]);
});

test('workflow harness rejects non-concrete topic seed refs before snapshot authority creation', async () => {
  const ctx = await seedSnapshotRuntime();

  await assert.rejects(
    () => ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
      title_card_id: ctx.titleCard.title_card_id,
      topic_seed_ref: {
        ref_type: 'topic_seed',
        ref_id: ctx.topicSeed.topic_seed_id,
        version_id: null,
        title_card_id: ctx.titleCard.title_card_id,
      },
    })),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('workflow harness keeps equivalent snapshot hashes stable while preserving append-only authority refs', async () => {
  const ctx = await seedSnapshotRuntime({ mature: false });
  const first = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    workflow_run_id: 'workflow_run_snapshot_repeat_1',
    node_attempt_id: 'node_attempt_snapshot_repeat_1',
    expectations: {
      status: 'succeeded',
      included_literature_count: 1,
      content_source_count: 0,
      warning_codes: [
        'INCOMPLETE_KEY_CONTENT_READY',
        'INCOMPLETE_ABSTRACT_READY',
        'LOW_SOURCE_COUNT',
        'INCOMPLETE_PIPELINE_READY',
        'STALE_OR_DUPLICATE_PIPELINE_STATUS',
        'INCOMPLETE_FULLTEXT_READY',
      ],
    },
  }));
  const second = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
  }, {
    workflow_run_id: 'workflow_run_snapshot_repeat_2',
    node_attempt_id: 'node_attempt_snapshot_repeat_2',
  }));

  assert.equal(first.scenario_status, 'passed');
  assert.equal(second.scenario_status, 'passed');
  assert.equal(first.node_result.status, 'succeeded');
  assert.equal(second.node_result.status, 'succeeded');
  assert.equal(first.node_result.snapshot_hash, second.node_result.snapshot_hash);
  assert.notEqual(
    first.node_result.literature_resource_pool_snapshot_ref?.ref_id,
    second.node_result.literature_resource_pool_snapshot_ref?.ref_id,
  );
  assert.ok(first.node_result.warning_codes.includes('INCOMPLETE_KEY_CONTENT_READY'));
  assert.ok(first.node_result.warning_codes.includes('LOW_SOURCE_COUNT'));
});

test('workflow harness creates SearchPlan from a strict blueprint without fallback semantics', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.create-search-plan.v1');
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.search_plan_ref?.version_id, 'v1');
  assert.equal(result.node_result.coverage_row_intents.length, 2);
  assert.equal(result.node_result.coverage_row_intents[0]?.coverage_key, 'support-method');
  assert.equal(result.node_result.coverage_row_intents[0]?.rationale, 'Find method evidence supporting the scoped need.');
  assert.equal(result.node_result.coverage_row_intents[0]?.priority, 1);
  assert.equal(result.node_result.coverage_row_intents[1]?.expected_evidence_role, 'challenge');
  assert.equal(result.node_result.authority_refs.length, 3);
  assert.equal(result.node_result.audit_refs.some((ref) => ref.ref_type === 'workflow_run'), true);
  assert.equal(result.harness_trace_snapshot.payload_schema, 'WorkflowHarnessCreateSearchPlanScenarioTrace@v1');
  assert.equal(result.harness_trace_snapshot.expected_snapshot_hash, ctx.snapshotHash);
  assert.equal(result.harness_trace_snapshot.resolved_snapshot_hash, ctx.snapshotHash);

  const persisted = await ctx.searchResourceRepository.findSearchPlanById(result.node_result.search_plan!.search_plan_id);
  assert.equal(persisted?.literature_snapshot_ref.ref_id, ctx.literatureSnapshot.literature_resource_pool_snapshot_id);
  const inputSnapshot = await ctx.controlPlaneRepository.findInputSnapshotById(
    result.node_result.search_plan!.input_snapshot_id!,
  );
  const frozenBlueprint = inputSnapshot?.payload?.search_plan_blueprint as TopicSelectionSearchPlanBlueprint | undefined;
  assert.equal(frozenBlueprint?.schema_version, 'TopicSelectionSearchPlanBlueprint@v1');
  assert.equal(frozenBlueprint?.expected_snapshot_hash, ctx.snapshotHash);
  assert.equal(frozenBlueprint?.coverage_intents[1]?.expected_evidence_role, 'challenge');
  assert.deepEqual(frozenBlueprint?.method_family_targets, ['retrieval_augmented_generation', 'fine_tuning']);
  assert.deepEqual(persisted?.coverage_strategy.method_family_targets, [
    'fine_tuning',
    'retrieval_augmented_generation',
  ]);
  const rows = await ctx.searchResourceRepository.listCoverageRowIntentsBySearchPlanId(
    result.node_result.search_plan!.search_plan_id,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1]?.coverage_key, 'challenge-risk');

  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_search_plan_001');
  assert.equal(
    artifacts.some((artifact) => artifact.payload?.payload_schema === 'WorkflowHarnessCreateSearchPlanScenarioTrace@v1'),
    true,
  );
});

test('workflow harness blocks missing SearchPlan blueprint without SearchPlan authority', async () => {
  const ctx = await seedSearchPlanRuntime();

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(null, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_missing_blueprint',
    node_attempt_id: 'node_attempt_search_plan_missing_blueprint',
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['MISSING_SEARCH_PLAN_BLUEPRINT'],
      coverage_row_count: 0,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.search_plan, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.deepEqual(result.node_result.blocker_codes, ['MISSING_SEARCH_PLAN_BLUEPRINT']);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_search_plan_missing_blueprint');
  assert.equal(artifacts[0]?.payload?.node_status, 'blocked');
});

test('workflow harness blocks malformed SearchPlan blueprint schema version', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  }, {
    schema_version: 'TopicSelectionSearchPlanBlueprint@v0',
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_bad_schema',
    node_attempt_id: 'node_attempt_search_plan_bad_schema',
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      coverage_row_count: 0,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks SearchPlan snapshot hash drift before authority creation', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: 'wrong-snapshot-hash',
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_hash_mismatch',
    node_attempt_id: 'node_attempt_search_plan_hash_mismatch',
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['SNAPSHOT_HASH_MISMATCH'],
      coverage_row_count: 0,
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.harness_trace_snapshot.resolved_snapshot_hash, ctx.snapshotHash);
  assert.deepEqual(result.node_result.blocker_codes, ['SNAPSHOT_HASH_MISMATCH']);
});

test('workflow harness blocks omitted coverage intents instead of using service fallback', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  }, {
    coverage_intents: [],
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_no_coverage',
    node_attempt_id: 'node_attempt_search_plan_no_coverage',
    expectations: {
      status: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['COVERAGE_INTENTS_REQUIRED'],
      coverage_row_count: 0,
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks SearchPlan blueprint without method-family targets', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  }, {
    method_family_targets: [],
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_no_method_targets',
    node_attempt_id: 'node_attempt_search_plan_no_method_targets',
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['MALFORMED_SEARCH_PLAN_BLUEPRINT'],
      coverage_row_count: 0,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks fallback-derived coverage row semantics before service call', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  }, {
    coverage_intents: [
      {
        coverage_key: 'support-method',
        intent_type: 'support',
        query: 'risk-aware RAG fine-tuning evidence',
        rationale: 'Find method evidence supporting the scoped need.',
        required: true,
        priority: 1,
        target_source_types: [],
        refs: [],
      } as unknown as TopicSelectionSearchPlanBlueprint['coverage_intents'][number],
    ],
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_fallback_semantics',
    node_attempt_id: 'node_attempt_search_plan_fallback_semantics',
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['COVERAGE_INTENT_FIELD_REQUIRED'],
      coverage_row_count: 0,
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.deepEqual(result.node_result.blocker_codes, ['COVERAGE_INTENT_FIELD_REQUIRED']);
});

test('workflow harness blocks non-object SearchPlan coverage intent before service call', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  }, {
    coverage_intents: [null] as unknown as TopicSelectionSearchPlanBlueprint['coverage_intents'],
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_non_object_coverage',
    node_attempt_id: 'node_attempt_search_plan_non_object_coverage',
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['COVERAGE_INTENT_FIELD_REQUIRED'],
      coverage_row_count: 0,
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks SearchPlan lineage mismatch before authority creation', async () => {
  const ctx = await seedSearchPlanRuntime();
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: {
      ...ctx.topicSeedRef,
      version_id: 'wrong-version',
    },
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  });

  const result = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_search_plan_lineage_mismatch',
    node_attempt_id: 'node_attempt_search_plan_lineage_mismatch',
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['TOPIC_SEED_LINEAGE_MISMATCH'],
      coverage_row_count: 0,
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.node_result.status, 'blocked');
  assert.deepEqual(result.node_result.blocker_codes, ['TOPIC_SEED_LINEAGE_MISMATCH']);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness records SearchRun and emits a Node 5 handoff for consumable output', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  });

  const result = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-handoff',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_run_001',
    node_attempt_id: 'node_attempt_record_search_run_001',
    bundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: true,
      downstream_handoff_present: true,
      loopback_signal_present: false,
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.record-search-run.v1');
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.search_run?.run_status, 'succeeded');
  assert.equal(result.node_result.consumable_for_evidence_map, true);
  assert.equal(result.node_result.downstream_handoff?.search_run_ref.ref_id, result.node_result.search_run_ref?.ref_id);
  assert.equal(result.node_result.downstream_handoff?.literature_snapshot_hash, ctx.snapshotHash);
  assert.deepEqual(result.node_result.downstream_handoff?.coverage_role_expectations, [{
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    expected_evidence_role: 'support',
  }]);
  assert.deepEqual(result.node_result.downstream_handoff?.method_family_targets, [
    'fine_tuning',
    'retrieval_augmented_generation',
  ]);
  assert.equal(result.node_result.loopback_signal, null);
  assert.equal(result.node_result.coverage_matrix_summary?.satisfied_count, 1);
  assert.equal(result.node_result.evidence_binding_refs.length, 1);
  assert.equal(result.node_result.coverage_assessment_refs.length, 1);
  assert.equal(result.node_result.authority_refs.some((ref) => ref.ref_type === 'search_run'), true);
  assert.equal(result.node_result.audit_refs.some((ref) => ref.ref_type === 'workflow_run'), true);
  assert.equal(result.harness_trace_snapshot.payload_schema, 'WorkflowHarnessRecordSearchRunScenarioTrace@v1');

  const persisted = await ctx.searchResourceRepository.findSearchRunById(result.node_result.search_run!.search_run_id);
  assert.equal(persisted?.literature_snapshot_ref.ref_id, ctx.literatureSnapshot.literature_resource_pool_snapshot_id);
  const inputSnapshot = await ctx.controlPlaneRepository.findInputSnapshotById(
    result.node_result.search_run!.input_snapshot_id!,
  );
  assert.equal(inputSnapshot?.source_refs.some((sourceRef) => sourceRef.ref_id === 'raw_search_log_fixture_001'), true);
});

test('workflow harness records failed SearchRun as audit-only loopback signal', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  }, {
    run_status: 'failed',
    result_accounting: {
      total_result_count: 0,
      unique_literature_count: 0,
      duplicate_result_count: 0,
      failed_source_count: 1,
      skipped_source_count: 0,
    },
    source_health_summary: {
      failure_summary: 'Search provider failed before returning usable results.',
      failed_source_count: 1,
      warning_codes: ['SEARCH_PROVIDER_FAILED'],
    },
    evidence_map_input_refs: [],
    coverage_observations: [{
      coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
      status: 'failed',
      result_count: 0,
      source_count: 1,
      missing_reason_codes: ['SEARCH_PROVIDER_FAILED'],
      notes: 'Fixture search provider failure.',
    }],
    evidence_bindings: [],
    coverage_assessments: [{
      coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
      verdict: 'missing',
      issue_codes: ['SEARCH_PROVIDER_FAILED'],
      confidence: 0.1,
      assessed_by: 'system',
    }],
  });

  const result = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-failed-loopback',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_run_failed',
    node_attempt_id: 'node_attempt_record_search_run_failed',
    bundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: true,
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.search_run?.run_status, 'failed');
  assert.equal(result.node_result.consumable_for_evidence_map, false);
  assert.equal(result.node_result.downstream_handoff, null);
  assert.ok(result.node_result.loopback_signal?.reason_codes.includes('SEARCH_RUN_FAILED'));
  assert.ok(result.node_result.loopback_signal?.target_actions.includes('upstream_search_execution_or_input_preparation'));
  assert.ok(result.node_result.warning_codes.includes('NON_CONSUMABLE_SEARCH_RUN'));
  assert.equal(result.node_result.authority_refs.some((ref) => ref.ref_type === 'search_run'), true);
});

test('workflow harness native runner routes failed SearchRun to N4 retry loopback', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  }, {
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
      warning_codes: [],
    },
    evidence_map_input_refs: [],
    coverage_observations: [{
      coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
      status: 'failed',
      result_count: 0,
      source_count: 1,
      missing_reason_codes: ['SEARCH_PROVIDER_FAILED'],
      notes: 'Fixture search provider failure.',
    }],
    evidence_bindings: [],
  });

  const result = await ctx.workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.record-search-run.v1',
    workflow_run_id: 'workflow_run_native_record_search_run_failed',
    node_attempt_id: 'node_attempt_native_record_search_run_failed',
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: ctx.titleCard.title_card_id,
    scenario_input: {
      scenario_id: 'topic-selection.native-runner.policy.v1',
      scenario_case_id: 'record-search-run-failed-loopback',
      title_card_id: ctx.titleCard.title_card_id,
      bundle,
      expectations: {
        status: 'succeeded',
        consumable_for_evidence_map: false,
        downstream_handoff_present: false,
        loopback_signal_present: true,
      },
    },
  });

  assert.equal(result.route_signal, 'search_execution_retry_required');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.route_target_node_id, 'topic-selection.v1a.record-search-run.v1');
  assert.equal(result.harness_trace_artifact_ref?.ref_type, 'artifact_ref');
});

test('workflow harness native runner routes source-health SearchRun failure to N2 snapshot loopback', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  }, {
    run_status: 'failed',
    source_health_summary: {
      failed_source_count: 1,
      warning_codes: ['SOURCE_STALE_OR_UNAVAILABLE'],
    },
    evidence_map_input_refs: [],
    evidence_bindings: [],
  });

  const result = await ctx.workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.record-search-run.v1',
    workflow_run_id: 'workflow_run_native_record_search_run_source_health',
    node_attempt_id: 'node_attempt_native_record_search_run_source_health',
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: ctx.titleCard.title_card_id,
    scenario_input: {
      scenario_id: 'topic-selection.native-runner.policy.v1',
      scenario_case_id: 'record-search-run-source-health-loopback',
      title_card_id: ctx.titleCard.title_card_id,
      bundle,
      expectations: {
        status: 'succeeded',
        consumable_for_evidence_map: false,
        downstream_handoff_present: false,
        loopback_signal_present: true,
      },
    },
  });

  assert.equal(result.route_signal, 'source_health_snapshot_refresh');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.route_target_node_id, 'topic-selection.v1a.snapshot-literature-resource-pool.v1');
});

test('workflow harness blocks SearchRun snapshot hash drift before authority creation', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: 'wrong-snapshot-hash',
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  });

  const result = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-hash-drift',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_run_hash_drift',
    node_attempt_id: 'node_attempt_record_search_run_hash_drift',
    bundle,
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: false,
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.search_run, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.node_result.error_code, 'VERSION_CONFLICT');
  assert.equal((await ctx.searchResourceRepository.listCoverageEvidenceBindingsBySearchPlanId(ctx.searchPlan.search_plan_id)).length, 0);
});

test('workflow harness replays N1-N4 producer attempts and blocks same-attempt drift', async () => {
  const ctx = await makeRuntime();
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: 'Risk-aware RAG adaptation',
    brief: 'Exercise v1a producer replay identity before LLM runtime consumption.',
  });
  const topicSeedInput = {
    scenario_id: 'topic-selection.v1a.producer-replay.v1',
    scenario_case_id: 'producer-replay-n1-topic-seed',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_producer_replay_n1',
    node_attempt_id: 'node_attempt_producer_replay_n1',
    intent_summary: 'Seed v1a with a stable producer replay fixture.',
    scope_notes: 'Replay should reuse the existing trace and not create authority.',
    intent_preparation_refs: [{
      ref_type: 'topic_seed_intent_draft',
      ref_id: 'producer_replay_intent_draft',
      title_card_id: titleCard.title_card_id,
    }],
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'succeeded',
      seed_version: 'v1',
    },
  } satisfies TopicSelectionWorkflowHarnessCreateTopicSeedInput;
  const topicSeed = await ctx.workflowHarness.runCreateTopicSeedScenario(topicSeedInput);
  const topicSeedReplay = await ctx.workflowHarness.runCreateTopicSeedScenario(topicSeedInput);
  assertScenarioPassed(topicSeed);
  assertScenarioPassed(topicSeedReplay);
  assert.equal(topicSeedReplay.node_result.replay_provenance?.replayed, true);
  assert.equal(topicSeedReplay.node_result.topic_seed_ref?.ref_id, topicSeed.node_result.topic_seed_ref?.ref_id);
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(topicSeedInput.workflow_run_id)).length, 1);
  const topicSeedDrift = await ctx.workflowHarness.runCreateTopicSeedScenario({
    ...topicSeedInput,
    output_schema_version: 'v1-replay-drift',
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
    },
  });
  assertScenarioPassed(topicSeedDrift);
  assert.deepEqual(topicSeedDrift.node_result.blocker_codes, ['REPLAY_INPUT_HASH_MISMATCH']);
  assert.equal(topicSeedDrift.node_result.authority_refs.length, 0);
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(topicSeedInput.workflow_run_id)).length, 2);

  await ctx.literature.createLiterature(makeLiterature('producer_replay_lit'));
  await ctx.literature.upsertLiteratureSource({
    id: 'producer_replay_source',
    literatureId: 'producer_replay_lit',
    provider: 'manual',
    sourceItemId: 'manual-producer-replay-lit',
    sourceUrl: 'file://producer_replay_lit.pdf',
    rawPayload: {},
    fetchedAt: '2026-05-19T00:00:00.000Z',
  });
  await ctx.literature.upsertPipelineState({
    id: 'producer_replay_pipeline',
    literatureId: 'producer_replay_lit',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: '2026-05-19T00:00:00.000Z',
  });
  await ctx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: ['producer_replay_lit'],
  });

  const snapshotInput = snapshotScenarioInput({
    title_card_id: titleCard.title_card_id,
    topic_seed_ref: topicSeed.node_result.topic_seed_ref!,
  }, {
    scenario_id: 'topic-selection.v1a.producer-replay.v1',
    scenario_case_id: 'producer-replay-n2-snapshot',
    workflow_run_id: 'workflow_run_producer_replay_n2',
    node_attempt_id: 'node_attempt_producer_replay_n2',
    resource_sample_set_provenance_ref: refForTitleCard(
      'resource_sample_set',
      'producer_replay_resource_sample_set',
      titleCard.title_card_id,
    ),
    expectations: {
      status: 'succeeded',
      included_literature_count: 1,
      content_source_count: 1,
    },
  });
  const snapshot = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotInput);
  const snapshotReplay = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotInput);
  assertScenarioPassed(snapshot);
  assertScenarioPassed(snapshotReplay);
  assert.equal(snapshotReplay.node_result.replay_provenance?.replayed, true);
  assert.equal(
    snapshotReplay.node_result.literature_resource_pool_snapshot_ref?.ref_id,
    snapshot.node_result.literature_resource_pool_snapshot_ref?.ref_id,
  );
  assert.equal(snapshotReplay.node_result.snapshot_hash, snapshot.node_result.snapshot_hash);
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(snapshotInput.workflow_run_id)).length, 1);
  const snapshotDrift = await ctx.workflowHarness.runSnapshotLiteratureResourcePoolScenario({
    ...snapshotInput,
    output_schema_version: 'v1-replay-drift',
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
    },
  });
  assertScenarioPassed(snapshotDrift);
  assert.deepEqual(snapshotDrift.node_result.blocker_codes, ['REPLAY_INPUT_HASH_MISMATCH']);
  assert.equal(snapshotDrift.node_result.authority_refs.length, 0);
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(snapshotInput.workflow_run_id)).length, 2);

  const producerSnapshotHash = snapshot.node_result.snapshot_hash;
  assert.ok(producerSnapshotHash);
  const blueprint = searchPlanBlueprint({
    title_card_id: titleCard.title_card_id,
    topic_seed_ref: topicSeed.node_result.topic_seed_ref!,
    literature_resource_pool_snapshot_ref: snapshot.node_result.literature_resource_pool_snapshot_ref!,
    expected_snapshot_hash: producerSnapshotHash,
  });
  const searchPlanInput = searchPlanScenarioInput(blueprint, {
    scenario_id: 'topic-selection.v1a.producer-replay.v1',
    scenario_case_id: 'producer-replay-n3-search-plan',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_producer_replay_n3',
    node_attempt_id: 'node_attempt_producer_replay_n3',
  });
  const searchPlan = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanInput);
  const searchPlanReplay = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanInput);
  assertScenarioPassed(searchPlan);
  assertScenarioPassed(searchPlanReplay);
  assert.equal(searchPlanReplay.node_result.replay_provenance?.replayed, true);
  assert.equal(searchPlanReplay.node_result.search_plan_ref?.ref_id, searchPlan.node_result.search_plan_ref?.ref_id);
  assert.deepEqual(
    searchPlanReplay.node_result.coverage_row_intent_refs.map((ref) => ref.ref_id),
    searchPlan.node_result.coverage_row_intent_refs.map((ref) => ref.ref_id),
  );
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(searchPlanInput.workflow_run_id)).length, 1);
  const searchPlanDrift = await ctx.workflowHarness.runCreateSearchPlanScenario({
    ...searchPlanInput,
    blueprint: {
      ...searchPlanInput.blueprint!,
      output_schema_version: 'v1-replay-drift',
    },
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
      coverage_row_count: 0,
    },
  });
  assertScenarioPassed(searchPlanDrift);
  assert.deepEqual(searchPlanDrift.node_result.blocker_codes, ['REPLAY_INPUT_HASH_MISMATCH']);
  assert.equal(searchPlanDrift.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listSearchPlansByTitleCardId(titleCard.title_card_id)).length, 1);
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(searchPlanInput.workflow_run_id)).length, 2);

  const bundle = searchRunBundle({
    title_card_id: titleCard.title_card_id,
    search_plan_ref: searchPlan.node_result.search_plan_ref!,
    literature_resource_pool_snapshot_ref: snapshot.node_result.literature_resource_pool_snapshot_ref!,
    expected_literature_snapshot_hash: producerSnapshotHash,
    coverage_row_intent_ref: searchPlan.node_result.coverage_row_intent_refs[0]!,
    literature_ref: snapshot.node_result.included_literature_refs[0]!,
    source_ref: snapshot.node_result.content_source_refs[0]!,
  });
  const searchRunInput = {
    scenario_id: 'topic-selection.v1a.producer-replay.v1',
    scenario_case_id: 'producer-replay-n4-search-run',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_producer_replay_n4',
    node_attempt_id: 'node_attempt_producer_replay_n4',
    bundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: true,
      downstream_handoff_present: true,
      loopback_signal_present: false,
    },
  } satisfies TopicSelectionWorkflowHarnessRecordSearchRunInput;
  const searchRun = await ctx.workflowHarness.runRecordSearchRunScenario(searchRunInput);
  const searchRunReplay = await ctx.workflowHarness.runRecordSearchRunScenario(searchRunInput);
  assertScenarioPassed(searchRun);
  assertScenarioPassed(searchRunReplay);
  assert.equal(searchRunReplay.node_result.replay_provenance?.replayed, true);
  assert.equal(searchRunReplay.node_result.search_run_ref?.ref_id, searchRun.node_result.search_run_ref?.ref_id);
  assert.deepEqual(
    searchRunReplay.node_result.evidence_binding_refs.map((ref) => ref.ref_id),
    searchRun.node_result.evidence_binding_refs.map((ref) => ref.ref_id),
  );
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(searchRunInput.workflow_run_id)).length, 1);
  const searchRunDrift = await ctx.workflowHarness.runRecordSearchRunScenario({
    ...searchRunInput,
    bundle: {
      ...searchRunInput.bundle,
      output_schema_version: 'v1-replay-drift',
    },
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: false,
    },
  });
  assertScenarioPassed(searchRunDrift);
  assert.deepEqual(searchRunDrift.node_result.blocker_codes, ['REPLAY_INPUT_HASH_MISMATCH']);
  assert.equal(searchRunDrift.node_result.authority_refs.length, 0);
  assert.equal(
    (await ctx.searchResourceRepository.listCoverageEvidenceBindingsBySearchPlanId(
      searchPlan.node_result.search_plan_ref!.ref_id,
    )).length,
    1,
  );
  assert.equal((await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(searchRunInput.workflow_run_id)).length, 2);
  assert.equal(ctx.llmGateway.calls.length, 0);
});

test('workflow harness stress-tests v1a context producers and publish boundary', async () => {
  const producerCtx = await makeRuntime();
  const titleCard = await producerCtx.titleCards.createTitleCard({
    working_title: 'Risk-aware RAG adaptation',
    brief: 'Stress context lineage before v1a LLM runtime consumption.',
  });
  const topicSeed = await producerCtx.workflowHarness.runCreateTopicSeedScenario({
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n1-topic-seed',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_context_stress_n1',
    node_attempt_id: 'node_attempt_context_stress_n1',
    intent_summary: 'Seed v1a with bounded RAG/fine-tuning context lineage.',
    scope_notes: 'Exercise deterministic context producers before LLM runtime nodes.',
    intent_preparation_refs: [{
      ref_type: 'topic_seed_intent_draft',
      ref_id: 'context_stress_intent_draft',
      title_card_id: titleCard.title_card_id,
    }],
    policy_version: 'v1',
    output_schema_version: 'v1',
    expectations: {
      status: 'succeeded',
      seed_version: 'v1',
      intent_summary: 'Seed v1a with bounded RAG/fine-tuning context lineage.',
    },
  });
  assertScenarioPassed(topicSeed);
  assert.ok(topicSeed.node_result.topic_seed_ref);

  await producerCtx.literature.createLiterature(makeLiterature('context_stress_lit'));
  await producerCtx.literature.upsertLiteratureSource({
    id: 'context_stress_source',
    literatureId: 'context_stress_lit',
    provider: 'manual',
    sourceItemId: 'manual-context-stress-lit',
    sourceUrl: 'file://context_stress_lit.pdf',
    rawPayload: {},
    fetchedAt: '2026-05-19T00:00:00.000Z',
  });
  await producerCtx.literature.upsertPipelineState({
    id: 'context_stress_pipeline',
    literatureId: 'context_stress_lit',
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: '2026-05-19T00:00:00.000Z',
  });
  await producerCtx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: ['context_stress_lit'],
  });
  const snapshot = await producerCtx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
    title_card_id: titleCard.title_card_id,
    topic_seed_ref: topicSeed.node_result.topic_seed_ref!,
  }, {
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n2-snapshot',
    workflow_run_id: 'workflow_run_context_stress_n2',
    node_attempt_id: 'node_attempt_context_stress_n2',
    resource_sample_set_provenance_ref: refForTitleCard(
      'resource_sample_set',
      'resource_sample_set_context_stress',
      titleCard.title_card_id,
    ),
    expectations: {
      status: 'succeeded',
      included_literature_count: 1,
      content_source_count: 1,
    },
  }));
  assertScenarioPassed(snapshot);
  assert.ok(snapshot.node_result.literature_resource_pool_snapshot_ref);
  assert.ok(snapshot.node_result.snapshot_hash);

  const blueprint = searchPlanBlueprint({
    title_card_id: titleCard.title_card_id,
    topic_seed_ref: topicSeed.node_result.topic_seed_ref!,
    literature_resource_pool_snapshot_ref: snapshot.node_result.literature_resource_pool_snapshot_ref!,
    expected_snapshot_hash: snapshot.node_result.snapshot_hash,
  });
  const searchPlan = await producerCtx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n3-search-plan',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_context_stress_n3',
    node_attempt_id: 'node_attempt_context_stress_n3',
    expectations: {
      status: 'succeeded',
      coverage_row_count: 2,
      plan_version: 'v1',
    },
  }));
  assertScenarioPassed(searchPlan);
  assert.ok(searchPlan.node_result.search_plan_ref);
  assert.equal(searchPlan.harness_trace_snapshot.expected_snapshot_hash, snapshot.node_result.snapshot_hash);
  assert.equal(searchPlan.harness_trace_snapshot.resolved_snapshot_hash, snapshot.node_result.snapshot_hash);

  const searchBundle = searchRunBundle({
    title_card_id: titleCard.title_card_id,
    search_plan_ref: searchPlan.node_result.search_plan_ref!,
    literature_resource_pool_snapshot_ref: snapshot.node_result.literature_resource_pool_snapshot_ref!,
    expected_literature_snapshot_hash: snapshot.node_result.snapshot_hash,
    coverage_row_intent_ref: searchPlan.node_result.coverage_row_intent_refs[0]!,
    literature_ref: snapshot.node_result.included_literature_refs[0]!,
    source_ref: snapshot.node_result.content_source_refs[0]!,
  }, {
    source_health_summary: {
      source_count: 1,
      failed_source_count: 0,
      warning_codes: ['SOURCE_RATE_LIMIT_RETRY'],
    },
  });
  const searchRun = await producerCtx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n4-search-run',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_context_stress_n4',
    node_attempt_id: 'node_attempt_context_stress_n4',
    bundle: searchBundle,
    expectations: {
      status: 'succeeded',
      consumable_for_evidence_map: true,
      downstream_handoff_present: true,
      loopback_signal_present: false,
    },
  });
  assertScenarioPassed(searchRun);
  assert.equal(searchRun.node_result.downstream_handoff?.literature_snapshot_hash, snapshot.node_result.snapshot_hash);
  assert.deepEqual(searchRun.node_result.downstream_handoff?.method_family_targets, [
    'fine_tuning',
    'retrieval_augmented_generation',
  ]);
  assert.ok(searchRun.node_result.warning_codes.includes('SOURCE_RATE_LIMIT_RETRY'));
  assert.deepEqual(
    searchRun.node_result.downstream_handoff?.source_health_summary.warning_codes,
    ['SOURCE_RATE_LIMIT_RETRY'],
  );
  assert.equal(producerCtx.llmGateway.calls.length, 0);

  await assert.rejects(
    () => producerCtx.workflowHarness.runSnapshotLiteratureResourcePoolScenario(snapshotScenarioInput({
      title_card_id: titleCard.title_card_id,
      topic_seed_ref: {
        ...topicSeed.node_result.topic_seed_ref!,
        version_id: null,
      },
    })),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  const searchPlanCountBeforeDrift = (await producerCtx.searchResources.listSearchPlansByTitleCardId(
    titleCard.title_card_id,
  )).length;
  const driftedPlan = await producerCtx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(
    searchPlanBlueprint({
      title_card_id: titleCard.title_card_id,
      topic_seed_ref: topicSeed.node_result.topic_seed_ref!,
      literature_resource_pool_snapshot_ref: snapshot.node_result.literature_resource_pool_snapshot_ref!,
      expected_snapshot_hash: 'drifted-context-snapshot-hash',
    }),
    {
      scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
      scenario_case_id: 'context-stress-n3-snapshot-drift',
      title_card_id: titleCard.title_card_id,
      workflow_run_id: 'workflow_run_context_stress_n3_drift',
      node_attempt_id: 'node_attempt_context_stress_n3_drift',
      expectations: {
        status: 'blocked',
        error_code: 'VERSION_CONFLICT',
        blocker_codes: ['SNAPSHOT_HASH_MISMATCH'],
        coverage_row_count: 0,
      },
    },
  ));
  assertScenarioPassed(driftedPlan);
  assert.equal(
    (await producerCtx.searchResources.listSearchPlansByTitleCardId(titleCard.title_card_id)).length,
    searchPlanCountBeforeDrift,
  );

  const searchRunHashDrift = await producerCtx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n4-snapshot-hash-drift',
    title_card_id: titleCard.title_card_id,
    workflow_run_id: 'workflow_run_context_stress_n4_drift',
    node_attempt_id: 'node_attempt_context_stress_n4_drift',
    bundle: {
      ...searchBundle,
      expected_literature_snapshot_hash: 'drifted-search-run-snapshot-hash',
    },
    expectations: {
      status: 'blocked',
      error_code: 'VERSION_CONFLICT',
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: false,
    },
  });
  assertScenarioPassed(searchRunHashDrift);
  assert.equal(searchRunHashDrift.node_result.authority_refs.length, 0);
  assert.equal(
    (await producerCtx.searchResourceRepository.listCoverageEvidenceBindingsBySearchPlanId(
      searchPlan.node_result.search_plan_ref!.ref_id,
    )).length,
    1,
  );

  const publishCtx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(publishCtx);
  const publishInput = await publishV1bInputBundleScenarioInput(publishCtx, humanConfirmResult, {
    scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
    scenario_case_id: 'context-stress-n9-publish',
    workflow_run_id: 'workflow_run_context_stress_n9_publish',
    node_attempt_id: 'node_attempt_context_stress_n9_publish',
  });
  const publish = await publishCtx.workflowHarness.runPublishV1bInputBundleScenario(publishInput);
  const replay = await publishCtx.workflowHarness.runPublishV1bInputBundleScenario(publishInput);
  assertScenarioPassed(publish);
  assertScenarioPassed(replay);
  assert.equal(publish.node_result.idempotency_result, 'created_new_bundle');
  assert.equal(replay.node_result.replay_provenance?.replayed, true);
  assert.equal(replay.node_result.v1b_input_bundle_ref?.ref_id, publish.node_result.v1b_input_bundle_ref?.ref_id);
  assert.equal(
    (await publishCtx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
      humanConfirmResult.node_result.validated_need_ref!.ref_id,
    )).length,
    1,
  );
  assert.equal(publishCtx.llmGateway.calls.length, 0);

  const driftCtx = await seedValidateNeedAdjudicationRuntime();
  const driftHumanConfirmResult = await runHumanConfirmNeedForPublish(driftCtx);
  const publishDrift = await driftCtx.workflowHarness.runPublishV1bInputBundleScenario(
    await publishV1bInputBundleScenarioInput(driftCtx, driftHumanConfirmResult, {
      scenario_id: 'topic-selection.v1a.context-lineage-stress.v1',
      scenario_case_id: 'context-stress-n9-lineage-drift',
      workflow_run_id: 'workflow_run_context_stress_n9_drift',
      node_attempt_id: 'node_attempt_context_stress_n9_drift',
      source_need_candidate_ref: refForTitleCard(
        'need_candidate',
        driftCtx.candidate.need_candidate_id,
        driftCtx.titleCard.title_card_id,
        'stale-candidate-version',
      ),
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        error_code: 'VERSION_CONFLICT',
        blocker_codes: ['VERSION_CONFLICT'],
        idempotency_result: 'not_applicable',
        bundle_published: false,
      },
    }),
  );
  assertScenarioPassed(publishDrift);
  assert.equal(publishDrift.node_result.v1b_input_bundle_ref, null);
  assert.equal(
    (await driftCtx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
      driftHumanConfirmResult.node_result.validated_need_ref!.ref_id,
    )).length,
    0,
  );
});

test('workflow harness blocks unsupported SearchRun authority refs before service persistence', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const unsupportedRef: TopicSelectionFunctionalRef = {
    ref_type: 'search_plan',
    ref_id: ctx.searchPlan.search_plan_id,
    version_id: ctx.searchPlan.plan_version,
    title_card_id: ctx.titleCard.title_card_id,
  };
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  }, {
    evidence_map_input_refs: [unsupportedRef],
  });

  const result = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-unsupported-authority-ref',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_run_unsupported_ref',
    node_attempt_id: 'node_attempt_record_search_run_unsupported_ref',
    bundle,
    expectations: {
      status: 'blocked',
      error_code: 'INVALID_PAYLOAD',
      blocker_codes: ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE'],
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: false,
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.deepEqual(result.node_result.blocker_codes, ['MALFORMED_SEARCH_RUN_RECORD_BUNDLE']);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listCoverageEvidenceBindingsBySearchPlanId(ctx.searchPlan.search_plan_id)).length, 0);
});

test('workflow harness blocks SearchRun refs outside the resolved literature snapshot', async () => {
  const ctx = await seedRecordSearchRunRuntime();
  const outsideLiteratureRef: TopicSelectionFunctionalRef = {
    ref_type: 'literature_record',
    ref_id: 'lit_outside',
    title_card_id: ctx.titleCard.title_card_id,
  };
  const bundle = searchRunBundle({
    title_card_id: ctx.titleCard.title_card_id,
    search_plan_ref: ctx.searchPlanRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_literature_snapshot_hash: ctx.snapshotHash,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    literature_ref: outsideLiteratureRef,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
  });

  const result = await ctx.workflowHarness.runRecordSearchRunScenario({
    scenario_id: 'topic-selection.real-e2e.canary.v1',
    scenario_case_id: 'record-search-run-outside-snapshot',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_run_outside_snapshot',
    node_attempt_id: 'node_attempt_record_search_run_outside_snapshot',
    bundle,
    expectations: {
      status: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['SNAPSHOT_OUTSIDE_LITERATURE_REF'],
      consumable_for_evidence_map: false,
      downstream_handoff_present: false,
      loopback_signal_present: false,
    },
  });

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.deepEqual(result.node_result.blocker_codes, ['SNAPSHOT_OUTSIDE_LITERATURE_REF']);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.searchResourceRepository.listCoverageEvidenceBindingsBySearchPlanId(ctx.searchPlan.search_plan_id)).length, 0);
});

test('workflow harness builds EvidenceMap from a normalized extraction draft and emits Node 6 handoff', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.build-evidence-map.v1');
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.materialization_report.status, 'ready_with_warning');
  assert.ok(result.node_result.warning_codes.includes('ABSTRACT_ONLY_SUPPORT'));
  assert.equal(result.node_result.evidence_map_ref?.ref_type, 'evidence_map');
  assert.equal(result.node_result.evidence_unit_refs.length, 1);
  assert.equal(result.node_result.downstream_handoff?.evidence_map_ref.ref_id, result.node_result.evidence_map_ref?.ref_id);
  assert.equal(result.node_result.downstream_handoff?.role_counts.support, 1);
  assert.equal(result.node_result.downstream_handoff?.abstract_only_support_count, 1);
  assert.deepEqual(result.node_result.downstream_handoff?.method_family_targets, ctx.searchRunHandoff.method_family_targets);
  assert.equal(result.harness_trace_snapshot.payload_schema, 'WorkflowHarnessBuildEvidenceMapScenarioTrace@v1');
  assert.equal(result.node_result.authority_refs.some((ref) => ref.ref_type === 'evidence_map'), true);
  assert.equal(result.node_result.audit_refs.some((ref) => ref.ref_type === 'workflow_run'), true);

  const persisted = await ctx.evidenceRepository.findEvidenceMapById(result.node_result.evidence_map_ref!.ref_id);
  assert.equal(persisted?.search_run_ref.ref_id, ctx.searchRunHandoff.search_run_ref.ref_id);
  const units = await ctx.evidenceRepository.listEvidenceUnitsByEvidenceMapId(result.node_result.evidence_map_ref!.ref_id);
  assert.equal(units.length, 1);
  assert.equal(units[0]?.issue_codes.includes('ABSTRACT_ONLY_SUPPORT'), true);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_build_evidence_map_001');
  assert.equal(
    artifacts.some((artifact) => artifact.payload?.payload_schema === 'WorkflowHarnessBuildEvidenceMapScenarioTrace@v1'),
    true,
  );
});

test('workflow harness blocks EvidenceMap materialization when draft uses llm_inference authority', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [{
      ...baseDraft.draft_units[0]!,
      source_attribution_kind: 'llm_inference',
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_blocked',
    node_attempt_id: 'node_attempt_build_evidence_map_blocked',
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      blocker_codes: ['LLM_INFERENCE_NOT_SOURCE_CLAIM'],
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.materialization_report.status, 'blocked');
  assert.ok(result.node_result.blocker_codes.includes('LLM_INFERENCE_NOT_SOURCE_CLAIM'));
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.node_result.downstream_handoff, null);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks incomplete EvidenceMap extraction before authority writes', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const missingLiteratureRef = refForTitleCard(
    'literature_record',
    'literature_missing_from_provider_output',
    ctx.titleCard.title_card_id,
  );
  const handoff = {
    ...ctx.searchRunHandoff,
    evidence_map_input_refs: [
      ...ctx.searchRunHandoff.evidence_map_input_refs,
      missingLiteratureRef,
    ],
  };
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(handoff);
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_incomplete_extraction',
    node_attempt_id: 'node_attempt_build_evidence_map_incomplete_extraction',
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      blocker_codes: ['EVIDENCE_UNIT_MISSING_FOR_INPUT_LITERATURE'],
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.ok(result.node_result.blocker_codes.includes('EVIDENCE_UNIT_MISSING_FOR_INPUT_LITERATURE'));
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks EvidenceMap draft when coverage row role and extracted role diverge', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [{
      ...baseDraft.draft_units[0]!,
      evidence_role: 'challenge',
      interpretation_payload: { role_hint: 'challenge' },
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_role_mismatch',
    node_attempt_id: 'node_attempt_build_evidence_map_role_mismatch',
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      blocker_codes: ['COVERAGE_ROW_ROLE_MISMATCH'],
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.ok(result.node_result.blocker_codes.includes('COVERAGE_ROW_ROLE_MISMATCH'));
  assert.deepEqual(result.node_result.materialization_report.rejection_reasons_by_client_unit_key.unit_support_001, [
    'COVERAGE_ROW_ROLE_MISMATCH',
  ]);
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness carries materialization-only warnings into EvidenceMap handoff', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [{
      ...baseDraft.draft_units[0]!,
      coverage_row_intent_ref: null,
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_missing_coverage_warning',
    node_attempt_id: 'node_attempt_build_evidence_map_missing_coverage_warning',
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      warning_codes: ['COVERAGE_ROW_INTENT_REF_MISSING'],
      evidence_unit_count: 1,
      downstream_handoff_present: true,
    },
  }));

  assertScenarioPassed(result);
  assert.ok(result.node_result.warning_codes.includes('COVERAGE_ROW_INTENT_REF_MISSING'));
  const warningSummary = result.node_result.downstream_handoff?.warning_summary as { warning_codes?: unknown } | undefined;
  const handoffWarningCodes = warningSummary?.warning_codes;
  assert.ok(Array.isArray(handoffWarningCodes));
  assert.ok(
    (handoffWarningCodes as string[])
      .includes('COVERAGE_ROW_INTENT_REF_MISSING'),
  );
});

test('workflow harness blocks EvidenceMap draft with locator provenance outside SearchRun handoff', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [{
      ...baseDraft.draft_units[0]!,
      locator: {
        ...baseDraft.draft_units[0]!.locator,
        locator_type: 'section',
        locator_ref: {
          ref_type: 'fulltext_section',
          ref_id: 'section_outside_handoff',
          title_card_id: ctx.titleCard.title_card_id,
        },
      },
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_locator_blocked',
    node_attempt_id: 'node_attempt_build_evidence_map_locator_blocked',
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      blocker_codes: ['LOCATOR_PROVENANCE_REF_OUTSIDE_HANDOFF'],
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness blocks EvidenceMap draft lineage when ref version drifts', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  }, {
    search_plan_ref: {
      ...ctx.searchRunHandoff.search_plan_ref,
      version_id: 'drifted-plan-version',
    },
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_lineage_blocked',
    node_attempt_id: 'node_attempt_build_evidence_map_lineage_blocked',
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      blocker_codes: ['EVIDENCE_MAP_EXTRACTION_LINEAGE_MISMATCH'],
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
});

test('workflow harness emits review package without authority on review-required EvidenceMap draft', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [{
      ...baseDraft.draft_units[0]!,
      confidence: 0.32,
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_review',
    node_attempt_id: 'node_attempt_build_evidence_map_review',
    expectations: {
      status: 'review_required',
      materialization_status: 'review_required',
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'review_required');
  assert.equal(result.node_result.materialization_report.status, 'review_required');
  assert.ok(result.node_result.materialization_report.review_codes.includes('LOW_CONFIDENCE_CORE_SUPPORT'));
  assert.equal(result.node_result.review_package?.schema_version, 'EvidenceMapExtractionReviewPackage@v1');
  assert.deepEqual(result.node_result.review_package?.allowed_revision_producers, [
    'human',
    'codex_assisted',
    'provider_llm',
  ]);
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal(result.node_result.downstream_handoff, null);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
});

test('workflow harness requires source-specific support/challenge conflict coverage', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const extraSourceRef: TopicSelectionFunctionalRef = {
    ref_type: 'literature_source',
    ref_id: 'source_other_review_only',
    title_card_id: ctx.titleCard.title_card_id,
  };
  const handoff: TopicSelectionSearchRunHandoff = {
    ...ctx.searchRunHandoff,
    coverage_row_intent_refs: [
      ...ctx.searchRunHandoff.coverage_row_intent_refs,
      ctx.coverageRowIntentRefs[1]!,
    ],
    coverage_role_expectations: [
      ...ctx.searchRunHandoff.coverage_role_expectations,
      {
        coverage_row_intent_ref: ctx.coverageRowIntentRefs[1]!,
        expected_evidence_role: 'challenge',
      },
    ],
    evidence_map_input_refs: [
      ...ctx.searchRunHandoff.evidence_map_input_refs,
      extraSourceRef,
    ],
  };
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(handoff);
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const supportUnit = baseDraft.draft_units[0]!;
  const sameSourceChallenge = {
    ...supportUnit,
    client_unit_key: 'unit_challenge_same_source_001',
    evidence_role: 'challenge' as const,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[1]!,
    source_statement: 'The same paper also reports a failure mode for this approach.',
    interpretation_payload: { role_hint: 'challenge' },
  };
  const otherSourceChallenge = {
    ...supportUnit,
    client_unit_key: 'unit_challenge_other_source_001',
    evidence_role: 'challenge' as const,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[1]!,
    source_refs: [extraSourceRef],
    locator: {
      ...supportUnit.locator,
      source_ref: extraSourceRef,
    },
    source_statement: 'Another source challenges the approach.',
    interpretation_payload: { role_hint: 'challenge_other_source' },
  };
  const draft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    draft_units: [supportUnit, sameSourceChallenge, otherSourceChallenge],
    draft_conflicts: [{
      conflict_type: 'claim_conflict',
      severity: 'moderate',
      support_unit_keys: [supportUnit.client_unit_key],
      challenge_unit_keys: [otherSourceChallenge.client_unit_key],
      baseline_unit_keys: [],
      context_unit_keys: [],
      issue_codes: [],
    }],
  };

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff,
    draft,
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_source_conflict_review',
    node_attempt_id: 'node_attempt_build_evidence_map_source_conflict_review',
    expectations: {
      status: 'review_required',
      materialization_status: 'review_required',
      evidence_unit_count: 0,
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.ok(result.node_result.materialization_report.review_codes.includes('SUPPORT_CHALLENGE_POLARITY_AMBIGUOUS'));
  assert.deepEqual(
    result.node_result.materialization_report.rejection_reasons_by_client_unit_key.unit_challenge_same_source_001,
    ['SUPPORT_CHALLENGE_POLARITY_AMBIGUOUS'],
  );
  assert.equal(result.node_result.evidence_map_ref, null);
  assert.equal(result.node_result.authority_refs.length, 0);
});

test('workflow harness runs mocked single-agent EvidenceMap extraction before materialization', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const workflowRunId = 'workflow_run_build_evidence_map_mocked';
  const nodeAttemptId = 'node_attempt_build_evidence_map_mocked';
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  }, {
    producer_kind: 'mocked_llm',
  });
  const contextPacket = evidenceMapExtractionContextPacket({
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    handoff: ctx.searchRunHandoff,
    input_refs_hash: inputRefsHash,
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    extraction_draft: null,
    execution_mode: 'mocked_llm',
    extraction_context_packet: contextPacket,
    extraction_context_packet_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'context_packet_mocked_001',
      title_card_id: ctx.titleCard.title_card_id,
    },
    mocked_output: {
      fixture_id: 'fixture_evidence_map_extraction_happy_path',
      output: draft,
    },
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      evidence_unit_count: 1,
      downstream_handoff_present: true,
      warning_codes: ['ABSTRACT_ONLY_SUPPORT'],
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(result.node_result.materialization_report.status, 'ready_with_warning');
  assert.equal(result.node_input.execution_mode, 'mocked_llm');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(result.node_result.agent_invocation_status, 'succeeded');
  assert.equal(result.node_result.agent_invocation_audit_ref?.ref_type, 'artifact_ref');
  assert.ok(result.node_result.artifact_refs.some(
    (artifactRefEntry) => artifactRefEntry.ref_id === result.node_result.agent_invocation_audit_ref?.ref_id,
  ));
  assert.ok(result.node_result.audit_refs.some(
    (auditRefEntry) => auditRefEntry.ref_id === result.node_result.agent_invocation_audit_ref?.ref_id,
  ));
  assert.equal(result.node_result.downstream_handoff?.evidence_unit_count, 1);
});

test('workflow harness runs provider single-agent EvidenceMap extraction through the same materialization gate', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const workflowRunId = 'workflow_run_build_evidence_map_provider';
  const nodeAttemptId = 'node_attempt_build_evidence_map_provider';
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  }, {
    producer_kind: 'provider_llm',
  });
  ctx.llmGateway.setOutputForSchema('TopicSelectionEvidenceMapExtractionDraft@v1', draft);
  const contextPacket = evidenceMapExtractionContextPacket({
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    handoff: ctx.searchRunHandoff,
    input_refs_hash: inputRefsHash,
    execution_mode: 'provider_llm',
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    extraction_draft: null,
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    extraction_context_packet: contextPacket,
    extraction_context_packet_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'context_packet_provider_001',
      title_card_id: ctx.titleCard.title_card_id,
    },
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      evidence_unit_count: 1,
      downstream_handoff_present: true,
      warning_codes: ['ABSTRACT_ONLY_SUPPORT'],
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_input.execution_mode, 'provider_llm');
  assert.equal(ctx.llmGateway.calls.length, 1);
  assert.equal(ctx.llmGateway.calls[0]?.schemaName, 'TopicSelectionEvidenceMapExtractionDraft@v1');
  assert.equal(ctx.llmGateway.calls[0]?.model.profileId, TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID);
  assert.equal(ctx.llmGateway.calls[0]?.model.modelId, 'gpt-5.5');
  assert.deepEqual(ctx.llmGateway.calls[0]?.normalizedParams, {
    creativity: 'low',
    reasoning_depth: 'high',
    output_budget: 'large',
    structured_output_required: true,
    output_format: 'json_schema',
  });
  assert.equal(
    Object.values(ctx.llmGateway.calls[0]?.schema.properties ?? {}).some((schemaValue) => schemaValue === false),
    false,
  );
  assert.equal(result.node_result.agent_invocation_status, 'succeeded');
  assert.equal(result.node_result.materialization_report.status, 'ready_with_warning');
  assert.equal(result.node_result.downstream_handoff?.evidence_unit_count, 1);
  assert.equal(result.node_result.authority_refs.some((refEntry) => refEntry.ref_type === 'evidence_map'), true);
  assert.equal(result.node_result.blocker_codes.length, 0);
});

test('workflow harness compresses over-target EvidenceMap extraction context and still applies materialization gates', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const workflowRunId = 'workflow_run_build_evidence_map_provider_compression';
  const nodeAttemptId = 'node_attempt_build_evidence_map_provider_compression';
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  }, {
    producer_kind: 'provider_llm',
  });
  ctx.llmGateway.setOutputForSchema('TopicSelectionEvidenceMapExtractionDraft@v1', draft);
  const contextPacket = evidenceMapExtractionContextPacket({
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    handoff: ctx.searchRunHandoff,
    input_refs_hash: inputRefsHash,
    execution_mode: 'provider_llm',
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    extraction_draft: null,
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    extraction_context_packet: {
      ...contextPacket,
      payload: {
        ...contextPacket.payload,
        source_health_warning_codes: ['SOURCE_HEALTH_RECHECK'],
        method_family_gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
        long_context_for_compression: 'compressible evidence extraction context '.repeat(500),
      },
    },
    extraction_context_packet_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'context_packet_provider_compression_001',
      title_card_id: ctx.titleCard.title_card_id,
    },
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 8_000,
    },
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      evidence_unit_count: 1,
      downstream_handoff_present: true,
      warning_codes: ['ABSTRACT_ONLY_SUPPORT', 'COMPRESSION_REPORT_RECORDED'],
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'succeeded');
  assert.equal(ctx.llmGateway.calls.length, 1);
  assert.ok(result.node_result.context_compression_report_ref);
  assert.ok(result.node_result.artifact_refs.some(
    (artifactRef) => artifactRef.ref_id === result.node_result.context_compression_report_ref?.ref_id,
  ));
  const compressionArtifact = await ctx.controlPlaneRepository.findArtifactRefById(
    result.node_result.context_compression_report_ref!.ref_id,
  );
  assert.equal(compressionArtifact?.payload?.artifact_key, 'context_compression_report');
  assert.equal(compressionArtifact?.payload?.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(
    (compressionArtifact?.payload?.report as { quality_gate_result?: string } | undefined)?.quality_gate_result,
    'passed',
  );
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.node_result.artifact_refs,
    nodeId: 'topic-selection.v1a.build-evidence-map.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'within_budget');
});

test('workflow harness blocks EvidenceMap extraction when compressed context remains over budget', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const workflowRunId = 'workflow_run_build_evidence_map_provider_compressed_over_budget';
  const nodeAttemptId = 'node_attempt_build_evidence_map_provider_compressed_over_budget';
  const draft = evidenceMapExtractionDraft({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
    source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  }, {
    producer_kind: 'provider_llm',
  });
  ctx.llmGateway.setOutputForSchema('TopicSelectionEvidenceMapExtractionDraft@v1', draft);
  const contextPacket = evidenceMapExtractionContextPacket({
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    handoff: ctx.searchRunHandoff,
    input_refs_hash: inputRefsHash,
    execution_mode: 'provider_llm',
  });

  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft,
  }, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    extraction_draft: null,
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    extraction_context_packet: contextPacket,
    extraction_context_packet_ref: {
      ref_type: 'artifact_ref',
      ref_id: 'context_packet_provider_compressed_over_budget_001',
      title_card_id: ctx.titleCard.title_card_id,
    },
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 200_000,
    },
    expectations: {
      status: 'blocked',
      materialization_status: 'blocked',
      error_code: 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION',
      blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'],
      downstream_handoff_present: false,
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.ok(result.node_result.context_compression_report_ref);
  assert.equal(result.node_result.authority_refs.length, 0);
  assert.equal((await ctx.evidenceRepository.listEvidenceMapsByTitleCardId(ctx.titleCard.title_card_id)).length, 0);
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.node_result.artifact_refs,
    nodeId: 'topic-selection.v1a.build-evidence-map.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'blocked_over_budget');
});

test('workflow harness carries a valid EvidenceMap handoff into generate-need-candidate input refs', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const evidenceMapResult = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft: evidenceMapExtractionDraft({
      title_card_id: ctx.titleCard.title_card_id,
      handoff: ctx.searchRunHandoff,
      literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
      source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
      coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
      input_refs_hash: inputRefsHash,
    }),
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_for_need',
    node_attempt_id: 'node_attempt_build_evidence_map_for_need',
  }));
  assertScenarioPassed(evidenceMapResult);
  const handoff = evidenceMapResult.node_result.downstream_handoff;
  assert.ok(handoff);
  const supportRef = evidenceMapResult.node_result.evidence_unit_refs[0]!;
  const strengthRef = refForTitleCard(
    'evidence_strength_assessment',
    'strength_from_handoff_001',
    ctx.titleCard.title_card_id,
  );
  const nodeAttemptId = 'node_attempt_need_from_evidence_map_handoff';
  const batch = rankedBatch(nodeAttemptId);
  batch.drafts[0] = {
    ...batch.drafts[0]!,
    evidence_role_bundle: {
      support_unit_refs: [supportRef],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [],
    },
    conflict_refs: [],
    strength_assessment_refs: [strengthRef],
  };
  const arbiterContext = {
    ...arbiterPayload(),
    node_policy_ref: refForTitleCard('node_policy', 'generate_need_candidate_v1', ctx.titleCard.title_card_id),
    output_schema_ref: refForTitleCard('schema', 'ranked_candidate_draft_batch_v1', ctx.titleCard.title_card_id),
    evidence_ref_table: [
      { evidence_ref: supportRef, role: 'support' },
      { evidence_ref: strengthRef, role: 'strength' },
    ],
  };
  const explorationContext = {
    ...explorationPayload(),
    topic_scope: {
      title_card_id: ctx.titleCard.title_card_id,
      domain: 'RAG fine-tuning safety',
    },
    evidence_signal_digest: {
      support_count: 1,
      challenge_count: 0,
    },
  };

  const result = await ctx.workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-need-from-evidence-map-handoff',
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_need_from_evidence_map_handoff',
    input_snapshot_id: null,
    node_attempt_id: nodeAttemptId,
    topic_scope_ref: ctx.topicSeedRef,
    evidence_map_ref: handoff.evidence_map_ref,
    evidence_strength_ref: strengthRef,
    resource_sample_set_ref: null,
    candidate_pool_projection_ref: null,
    evidence_map_handoff: handoff,
    search_snapshot_refs: [handoff.search_run_ref],
    resource_snapshot_refs: [handoff.literature_resource_pool_snapshot_ref],
    exploration_payload: explorationContext,
    arbiter_payload: arbiterContext,
    mocked_output: {
      fixture_id: 'fixture_need_from_evidence_map_handoff',
      output: batch,
    },
    persist_admitted_candidates: false,
    persistence_context: null,
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 0,
      persistence: 'forbidden',
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.node_input.evidence_map_ref.ref_id, handoff.evidence_map_ref.ref_id);
  assert.equal(result.node_input.search_snapshot_refs[0]?.ref_id, handoff.search_run_ref.ref_id);
  assert.equal(result.node_input.resource_snapshot_refs[0]?.ref_id, handoff.literature_resource_pool_snapshot_ref.ref_id);
  assert.equal(result.adapter_result.candidate_draft_admission_report?.draft_results[0]?.decision, 'admit');
  assert.ok(result.compiled_context.exploration_context_packet.input_refs.some(
    (inputRef) => inputRef.ref_type === 'workflow_handoff' && inputRef.ref_id === handoff.handoff_ref.ref_id,
  ));
});

test('workflow harness rejects generate-need-candidate when EvidenceMap handoff refs drift', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const evidenceMapResult = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: ctx.titleCard.title_card_id,
    handoff: ctx.searchRunHandoff,
    draft: evidenceMapExtractionDraft({
      title_card_id: ctx.titleCard.title_card_id,
      handoff: ctx.searchRunHandoff,
      literature_ref: ctx.literatureSnapshot.literature_refs[0]!,
      source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
      coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
      input_refs_hash: inputRefsHash,
    }),
  }, {
    workflow_run_id: 'workflow_run_build_evidence_map_handoff_drift',
    node_attempt_id: 'node_attempt_build_evidence_map_handoff_drift',
  }));
  assertScenarioPassed(evidenceMapResult);
  const handoff = evidenceMapResult.node_result.downstream_handoff;
  assert.ok(handoff);

  await assert.rejects(
    () => ctx.workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
      scenario_case_id: 'mocked-need-handoff-drift',
      title_card_id: ctx.titleCard.title_card_id,
      evidence_map_handoff: handoff,
      evidence_map_ref: {
        ...handoff.evidence_map_ref,
        ref_id: 'evidence_map_drifted',
      },
      search_snapshot_refs: [handoff.search_run_ref],
      resource_snapshot_refs: [handoff.literature_resource_pool_snapshot_ref],
    })),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
});

test('workflow harness rejects generate-need-candidate context refs that reuse EvidenceMap review artifacts', async () => {
  const reviewRef = refForTitleCard('evidence_map_review_package', 'review_package_001', 'title_card_001');

  await assert.rejects(
    async () => {
      const { workflowHarness } = await makeRuntime();
      await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
        scenario_case_id: 'mocked-review-package-as-need-input',
        context_input_refs: [
          ref('topic_scope', 'topic_scope_001'),
          ref('evidence_map', 'evidence_map_001'),
          reviewRef,
        ],
      }));
    },
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('workflow harness runs validate-need-adjudication to a Node 8 human-confirmation handoff', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx);
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.validate-need-adjudication.v1');
  assert.equal(result.node_result.status, 'ready');
  assert.equal(result.node_result.route_outcome, 'advance_to_human_confirmation');
  assert.equal(result.node_result.final_decision, 'validate');
  assert.equal(result.node_result.next_node_id, 'topic-selection.v1a.human-confirm-need.v1');
  assert.ok(result.node_result.adjudication_result_ref);
  assert.equal(result.node_result.reserved_validated_need_ref?.ref_type, 'validated_need');
  assert.ok(result.node_result.recommendation_packet_ref);
  assert.equal(result.node_result.replay_provenance, null);
  assert.equal(ctx.llmGateway.calls.length, 0);

  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 1);
  assert.equal(adjudications[0]?.final_decision, 'validate');
  assert.equal(result.node_result.reserved_validated_need_ref?.ref_id, adjudications[0]?.output_validated_need_id);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_validate_need_001');
  assert.equal(
    artifacts.some((artifact) => artifact.payload?.payload_schema === 'WorkflowHarnessValidateNeedAdjudicationScenarioTrace@v1'),
    true,
  );
});

test('workflow harness runs validate-need-adjudication through canonical execution_spec', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_execution_spec',
    node_attempt_id: 'node_attempt_validate_need_execution_spec',
  });

  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-execution-spec',
      workflow_run_id: 'workflow_run_validate_need_execution_spec',
      node_attempt_id: 'node_attempt_validate_need_execution_spec',
      execution_mode: 'mocked_llm',
      execution_spec: {
        execution_mode: 'mocked_llm',
      },
      run_mode: 'acceptance',
    }),
  );

  assertScenarioPassed(result);
  assert.deepEqual(result.node_input.execution_spec, { execution_mode: 'mocked_llm' });
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(result.node_result.status, 'ready');
});

test('workflow harness compresses over-target validate-need-adjudication context and still applies adjudication gates', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({
    includeChallenge: true,
    gapCodes: ['METHOD_FAMILY_COVERAGE_GAP'],
  });
  assert.ok(ctx.supportPacket);
  const workflowRunId = 'workflow_run_validate_need_provider_compression';
  const nodeAttemptId = 'node_attempt_validate_need_provider_compression';
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
  }, {
    execution_mode: 'provider_llm',
    required_actions: ['carry residual risks and method-family coverage gap into human confirmation'],
    residual_risk_refs: ctx.supportPacket.residual_risk_refs,
    gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    packet,
  );

  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-provider-compression',
      workflow_run_id: workflowRunId,
      node_attempt_id: nodeAttemptId,
      execution_mode: 'provider_llm',
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      },
      run_mode: 'product',
      mocked_output: null,
      model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      runtime_token_budget_overrides: {
        estimated_input_tokens_override: 80_000,
        estimated_input_tokens_after_compression_override: 12_000,
      },
      expectations: {
        status: 'ready',
        route_outcome: 'advance_to_human_confirmation',
        final_decision: 'validate',
        adjudication_created: true,
        warning_codes: [
          'METHOD_FAMILY_COVERAGE_GAP',
          'VALIDATE_WITH_RESIDUAL_RISK',
          'COMPRESSION_REPORT_RECORDED',
        ],
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.equal(ctx.llmGateway.calls.length, 1);
  assert.equal(result.node_result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'), true);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(workflowRunId);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.validate-need-adjudication.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(compressionArtifact.payload?.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
  assert.equal(
    (compressionArtifact.payload?.report as { quality_gate_result?: string } | undefined)?.quality_gate_result,
    'passed',
  );
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.validate-need-adjudication.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'within_budget');
});

test('workflow harness blocks validate-need-adjudication when compressed context remains over budget', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const workflowRunId = 'workflow_run_validate_need_provider_compressed_over_budget';
  const nodeAttemptId = 'node_attempt_validate_need_provider_compressed_over_budget';
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
  }, {
    execution_mode: 'provider_llm',
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    packet,
  );

  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-provider-compressed-over-budget',
      workflow_run_id: workflowRunId,
      node_attempt_id: nodeAttemptId,
      execution_mode: 'provider_llm',
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      },
      run_mode: 'product',
      mocked_output: null,
      model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      runtime_token_budget_overrides: {
        estimated_input_tokens_override: 80_000,
        estimated_input_tokens_after_compression_override: 200_000,
      },
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(
    (await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(ctx.candidate.need_candidate_id)).length,
    0,
  );
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(workflowRunId);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.validate-need-adjudication.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.validate-need-adjudication.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'blocked_over_budget');
});

test('workflow harness blocks validate-need-adjudication when compression quality gate fails', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({
    compressionRuntime: new ForcedBlockedCompressionRuntime(),
  });
  const workflowRunId = 'workflow_run_validate_need_provider_compression_quality_block';
  const nodeAttemptId = 'node_attempt_validate_need_provider_compression_quality_block';
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
  }, {
    execution_mode: 'provider_llm',
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    packet,
  );

  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-provider-compression-quality-block',
      workflow_run_id: workflowRunId,
      node_attempt_id: nodeAttemptId,
      execution_mode: 'provider_llm',
      execution_spec: {
        execution_mode: 'provider_llm',
        model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      },
      run_mode: 'product',
      mocked_output: null,
      model_option_id: `${TOPIC_SELECTION_NEED_ADJUDICATION_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
      runtime_token_budget_overrides: {
        estimated_input_tokens_override: 80_000,
        estimated_input_tokens_after_compression_override: 12_000,
      },
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['COMPRESSION_QUALITY_GATE_BLOCKED', 'COMPRESSION_FORCED_TEST_BLOCK'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(
    (await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(ctx.candidate.need_candidate_id)).length,
    0,
  );
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(workflowRunId);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.validate-need-adjudication.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(
    (compressionArtifact.payload?.report as { quality_gate_result?: string } | undefined)?.quality_gate_result,
    'blocked',
  );
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
});

test('workflow harness blocks validate-need-adjudication when validate drops residual risks', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({ includeChallenge: true });
  assert.ok(ctx.supportPacket);
  assert.ok(ctx.supportPacket.residual_risk_refs.length > 0);
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_dropped_risk',
    node_attempt_id: 'node_attempt_validate_need_dropped_risk',
  }, {
    residual_risk_refs: [],
    accepted_risk_refs: [],
  });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-dropped-risk',
      workflow_run_id: 'workflow_run_validate_need_dropped_risk',
      node_attempt_id: 'node_attempt_validate_need_dropped_risk',
      expectations: {
        status: 'blocked',
        blocker_codes: ['RESIDUAL_RISK_DROPPED'],
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.ok(result.node_result.blocker_codes.includes('RESIDUAL_RISK_DROPPED'));
  assert.equal(
    (await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(ctx.candidate.need_candidate_id)).length,
    0,
  );
});

test('workflow harness carries residual risk and method warnings on validate handoff', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({
    includeChallenge: true,
    gapCodes: ['METHOD_FAMILY_COVERAGE_GAP'],
  });
  assert.ok(ctx.supportPacket);
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_with_risk',
    node_attempt_id: 'node_attempt_validate_need_with_risk',
  }, {
    required_actions: ['carry residual risks and method-family coverage gap into human confirmation'],
    residual_risk_refs: ctx.supportPacket.residual_risk_refs,
  });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-with-risk',
      workflow_run_id: 'workflow_run_validate_need_with_risk',
      node_attempt_id: 'node_attempt_validate_need_with_risk',
      expectations: {
        status: 'ready',
        warning_codes: ['METHOD_FAMILY_COVERAGE_GAP', 'VALIDATE_WITH_RESIDUAL_RISK'],
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.ok(result.node_result.warning_codes.includes('METHOD_FAMILY_COVERAGE_GAP'));
  assert.ok(result.node_result.warning_codes.includes('VALIDATE_WITH_RESIDUAL_RISK'));
  assert.deepEqual(result.node_result.residual_risk_refs, ctx.supportPacket.residual_risk_refs);
});

test('workflow harness blocks clean validate when method-family coverage gap is not carried', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({
    gapCodes: ['METHOD_FAMILY_COVERAGE_GAP'],
  });
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_dropped_method_gap',
    node_attempt_id: 'node_attempt_validate_need_dropped_method_gap',
  }, {
    required_actions: ['route result according to deterministic node policy'],
    gap_codes: [],
  });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      scenario_case_id: 'validate-need-adjudication-dropped-method-gap',
      workflow_run_id: 'workflow_run_validate_need_dropped_method_gap',
      node_attempt_id: 'node_attempt_validate_need_dropped_method_gap',
      expectations: {
        status: 'blocked',
        blocker_codes: ['METHOD_FAMILY_COVERAGE_GAP_DROPPED'],
        warning_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.ok(result.node_result.blocker_codes.includes('METHOD_FAMILY_COVERAGE_GAP_DROPPED'));
});

test('workflow harness allows diagnostic adjudication prompts only in acceptance mode', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_diagnostic_product_guard',
    node_attempt_id: 'node_attempt_validate_need_diagnostic_product_guard',
  });

  await assert.rejects(
    () => ctx.workflowHarness.runValidateNeedAdjudicationScenario(
      validateNeedAdjudicationScenarioInput(ctx, packet, {
        execution_mode: 'provider_llm',
        run_mode: 'product',
        mocked_output: null,
        diagnostic_prompt_appendix: 'Diagnostic negative probe must not run in product mode.',
      }),
    ),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && /diagnostic_prompt_appendix/.test(error.message),
  );
});

test('workflow harness runs human-confirm-need and materializes reserved ValidatedNeed without v1b bundle', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.human-confirm-need.v1');
  assert.equal(result.node_result.status, 'ready');
  assert.equal(result.node_result.route_outcome, 'advance_to_publish_v1b_input_bundle');
  assert.equal(result.node_result.next_node_id, 'topic-selection.v1a.publish-v1b-input-bundle.v1');
  assert.equal(result.node_result.validated_need_ref?.ref_id, validateResult.node_result.reserved_validated_need_ref?.ref_id);
  assert.ok(result.node_result.human_decision_ref);
  assert.ok(result.node_result.semantic_review_context_packet_ref);
  assert.ok(result.node_result.semantic_review_ref);
  assert.equal(result.node_input.run_mode, 'acceptance');
  assert.equal(result.node_input.executor_kind, 'single_agent');
  assert.equal(result.node_input.model_option_id, null);
  assert.equal(result.node_input.execution_spec, null);
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    result.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 0);
});

test('workflow harness hashes human-confirm semantic context without volatile timestamps', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_human_confirm_context_hash_stability',
      node_attempt_id: 'node_attempt_human_confirm_context_hash_stability',
    }),
  );

  assertScenarioPassed(result);
  assert.ok(result.node_result.semantic_review_context_packet_ref);
  const contextArtifact = await ctx.controlPlaneRepository.findArtifactRefById(
    result.node_result.semantic_review_context_packet_ref.ref_id,
  );
  const payload = contextArtifact?.payload as {
    context_packet?: HumanConfirmationSemanticReviewContextPacket;
  } | null;
  const packet = payload?.context_packet;
  assert.ok(packet);
  const {
    context_packet_hash: contextPacketHash,
    created_at: createdAt,
    ...stablePayload
  } = packet;

  assert.equal(contextPacketHash, sha256Text(stableStringify(stablePayload)));
  assert.notEqual(
    contextPacketHash,
    sha256Text(stableStringify({ ...stablePayload, created_at: createdAt })),
  );
});

test('workflow harness hydrates mocked human-confirm semantic review with runtime context ref', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_mocked_semantic_review',
    node_attempt_id: 'node_attempt_human_confirm_mocked_semantic_review',
    execution_mode: 'mocked_llm',
  });
  const runtimeContextPlaceholder = refForTitleCard(
    'artifact_ref',
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER,
    ctx.titleCard.title_card_id,
  );
  input.mocked_output = {
    fixture_id: 'fixture_human_confirm_mocked_semantic_review',
    output: humanConfirmationSemanticReviewOutput(ctx, input, {
      context_packet_ref: runtimeContextPlaceholder,
      provenance_ref: runtimeContextPlaceholder,
      execution_mode: 'mocked_llm',
    }),
  };

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.ok(result.node_result.semantic_review_context_packet_ref);
  assert.ok(result.node_result.semantic_review_ref);
  const reviewArtifact = await ctx.controlPlaneRepository.findArtifactRefById(
    result.node_result.semantic_review_ref.ref_id,
  );
  const reviewPayload = reviewArtifact?.payload as {
    semantic_review?: HumanConfirmationSemanticReview;
  } | null;
  const semanticReview = reviewPayload?.semantic_review;
  assert.ok(semanticReview);
  assert.deepEqual(semanticReview.context_packet_ref, result.node_result.semantic_review_context_packet_ref);
  assert.deepEqual(semanticReview.provenance_ref, result.node_result.semantic_review_context_packet_ref);
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.human-confirm-need.v1',
  });
  assert.equal(audit.provenance?.source_kind, 'mock_fixture');
  assert.equal(audit.provenance?.non_provider, true);
  assert.equal(audit.token_budget_gate_result?.decision, 'within_budget');
});

test('workflow harness stamps provider human-confirm semantic review lineage before authority writes', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_provider_lineage_stamp',
    node_attempt_id: 'node_attempt_human_confirm_provider_lineage_stamp',
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    mocked_output: null,
    model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    humanConfirmationSemanticReviewOutput(ctx, input, {
      workflow_run_id: 'stale_workflow_run',
      node_attempt_id: 'stale_node_attempt',
      review_id: 'stale_semantic_review',
      context_packet_ref: refForTitleCard('artifact_ref', 'stale_context_packet', ctx.titleCard.title_card_id),
      provenance_ref: refForTitleCard('artifact_ref', 'stale_provider_provenance', ctx.titleCard.title_card_id),
      execution_mode: 'provider_llm',
      profile_id: 'topic-selection.confirmation-semantic-review.legacy-profile.v0',
      review_reason_codes: ['human_confirmation_received'],
      policy_version: 'stale-policy',
      output_schema_version: 'stale-schema',
    }),
  );

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.equal(
    result.node_result.warning_codes.includes('SEMANTIC_REVIEW_RUNTIME_LINEAGE_STAMPED'),
    true,
  );
  assert.ok(result.node_result.semantic_review_ref);
  assert.ok(result.node_result.semantic_review_context_packet_ref);
  const reviewArtifact = await ctx.controlPlaneRepository.findArtifactRefById(
    result.node_result.semantic_review_ref.ref_id,
  );
  const reviewPayload = reviewArtifact?.payload as {
    semantic_review?: HumanConfirmationSemanticReview;
  } | null;
  const semanticReview = reviewPayload?.semantic_review;
  assert.ok(semanticReview);
  assert.equal(semanticReview.workflow_run_id, input.workflow_run_id);
  assert.equal(semanticReview.node_attempt_id, input.node_attempt_id);
  assert.equal(semanticReview.review_id, `${input.node_attempt_id}_semantic_review`);
  assert.equal(semanticReview.execution_mode, 'provider_llm');
  assert.equal(semanticReview.profile_id, TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID);
  assert.equal(semanticReview.policy_version, input.policy_version);
  assert.equal(semanticReview.output_schema_version, input.output_schema_version);
  assert.deepEqual(semanticReview.context_packet_ref, result.node_result.semantic_review_context_packet_ref);
  assert.deepEqual(semanticReview.provenance_ref, result.node_result.semantic_review_context_packet_ref);
  assert.equal(
    semanticReview.warning_codes.includes('SEMANTIC_REVIEW_RUNTIME_LINEAGE_STAMPED'),
    true,
  );
  assert.equal(
    semanticReview.warning_codes.includes('SEMANTIC_REVIEW_PASS_REASON_CODES_IGNORED'),
    true,
  );
  assert.deepEqual(semanticReview.review_reason_codes, []);
});

test('workflow harness blocks provider human-confirm semantic review with incomplete coverage despite pass status', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_provider_coverage_gate',
    node_attempt_id: 'node_attempt_human_confirm_provider_coverage_gate',
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    mocked_output: null,
    model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['MISSING_ACCEPTED_RISK_COVERAGE'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    (request: LlmStructuredOutputRequest) => {
      const payload = JSON.parse(request.messages[1]?.content ?? '{}') as {
        context_packet_ref?: TopicSelectionFunctionalRef;
      };
      assert.ok(payload.context_packet_ref);
      return humanConfirmationSemanticReviewOutput(ctx, input, {
        context_packet_ref: payload.context_packet_ref,
        provenance_ref: payload.context_packet_ref,
        execution_mode: 'provider_llm',
        risk_coverage: 'missing_required_acceptance',
      });
    },
  );

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(result.node_result.validated_need_ref, null);
  assert.deepEqual(result.node_result.blocker_codes, ['MISSING_ACCEPTED_RISK_COVERAGE']);
});

test('workflow harness compresses over-target human-confirm semantic review context and still applies human authority gates', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    scenario_case_id: 'human-confirm-need-provider-compression',
    workflow_run_id: 'workflow_run_human_confirm_provider_compression',
    node_attempt_id: 'node_attempt_human_confirm_provider_compression',
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    mocked_output: null,
    model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 8_000,
    },
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    (request: LlmStructuredOutputRequest) => {
      const payload = JSON.parse(request.messages[1]?.content ?? '{}') as {
        context_packet_ref?: TopicSelectionFunctionalRef;
      };
      assert.ok(payload.context_packet_ref);
      return humanConfirmationSemanticReviewOutput(ctx, input, {
        context_packet_ref: payload.context_packet_ref,
        provenance_ref: payload.context_packet_ref,
        execution_mode: 'provider_llm',
      });
    },
  );

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.ok(result.node_result.validated_need_ref);
  assert.equal(ctx.llmGateway.calls.length, 1);
  assert.equal(result.node_result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'), true);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.human-confirm-need.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(compressionArtifact.payload?.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.human-confirm-need.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'within_budget');
});

test('workflow harness blocks human-confirm semantic review when compressed context remains over budget', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    scenario_case_id: 'human-confirm-need-provider-compressed-over-budget',
    workflow_run_id: 'workflow_run_human_confirm_provider_compressed_over_budget',
    node_attempt_id: 'node_attempt_human_confirm_provider_compressed_over_budget',
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    mocked_output: null,
    model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 200_000,
    },
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    humanConfirmationSemanticReviewOutput(ctx, input, { execution_mode: 'provider_llm' }),
  );

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(result.node_result.validated_need_ref, null);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.human-confirm-need.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
  const audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: result.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.human-confirm-need.v1',
  });
  assert.equal(audit.token_budget_gate_result?.decision, 'blocked_over_budget');
});

test('workflow harness blocks human-confirm semantic review when compression quality gate fails', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({
    compressionRuntime: new ForcedBlockedCompressionRuntime(),
  });
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    scenario_case_id: 'human-confirm-need-provider-compression-quality-block',
    workflow_run_id: 'workflow_run_human_confirm_provider_compression_quality_block',
    node_attempt_id: 'node_attempt_human_confirm_provider_compression_quality_block',
    execution_mode: 'provider_llm',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    },
    run_mode: 'product',
    mocked_output: null,
    model_option_id: `${TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID}.openai-quality`,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 8_000,
    },
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['COMPRESSION_QUALITY_GATE_BLOCKED', 'COMPRESSION_FORCED_TEST_BLOCK'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'blocked');
  assert.equal(ctx.llmGateway.calls.length, 0);
  assert.equal(result.node_result.validated_need_ref, null);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  const compressionArtifact = artifacts.find((artifact) =>
    artifact.payload?.artifact_key === 'context_compression_report'
      && artifact.payload?.node_id === 'topic-selection.v1a.human-confirm-need.v1'
  );
  assert.ok(compressionArtifact);
  assert.equal(
    (compressionArtifact.payload?.report as { quality_gate_result?: string } | undefined)?.quality_gate_result,
    'blocked',
  );
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_type === 'artifact_ref' && refEntry.ref_id === compressionArtifact.artifact_ref_id,
    ),
    true,
  );
});

test('workflow harness publishes v1b input bundle as terminal v1a handoff', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const input = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult);
  const result = await ctx.workflowHarness.runPublishV1bInputBundleScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_id, 'topic-selection.v1a.publish-v1b-input-bundle.v1');
  assert.equal(result.node_result.status, 'ready');
  assert.equal(result.node_result.route_outcome, 'published_v1b_input_bundle');
  assert.equal(result.node_result.idempotency_result, 'created_new_bundle');
  assert.equal(result.node_result.bundle_version, 'v1a-to-v1b-input-bundle-v1');
  assert.ok(result.node_result.v1b_input_bundle_ref);
  assert.equal(result.node_input.created_by, 'system');
  assert.equal('next_node_id' in (result.node_result as unknown as Record<string, unknown>), false);
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    humanConfirmResult.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 1);
  assert.equal(bundles[0]?.v1b_input_bundle_id, result.node_result.v1b_input_bundle_ref?.ref_id);
  const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(input.workflow_run_id);
  assert.equal(
    artifacts.some((artifact) => artifact.payload?.payload_schema === 'WorkflowHarnessPublishV1bInputBundleScenarioTrace@v1'),
    true,
  );
});

test('workflow harness reuses existing v1b input bundle for same expected version', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const firstInput = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
    workflow_run_id: 'workflow_run_publish_reuse',
    node_attempt_id: 'node_attempt_publish_reuse_first',
  });
  const first = await ctx.workflowHarness.runPublishV1bInputBundleScenario(firstInput);
  const secondInput = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
    workflow_run_id: 'workflow_run_publish_reuse',
    node_attempt_id: 'node_attempt_publish_reuse_second',
    expectations: {
      status: 'ready',
      route_outcome: 'published_v1b_input_bundle',
      idempotency_result: 'reused_existing_bundle',
      bundle_published: true,
    },
  });
  const second = await ctx.workflowHarness.runPublishV1bInputBundleScenario(secondInput);

  assertScenarioPassed(first);
  assertScenarioPassed(second);
  assert.equal(second.node_result.idempotency_result, 'reused_existing_bundle');
  assert.equal(second.node_result.v1b_input_bundle_ref?.ref_id, first.node_result.v1b_input_bundle_ref?.ref_id);
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    humanConfirmResult.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 1);
});

test('workflow harness replays identical publish-v1b-input-bundle attempt', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const input = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
    workflow_run_id: 'workflow_run_publish_replay',
    node_attempt_id: 'node_attempt_publish_replay',
  });
  const first = await ctx.workflowHarness.runPublishV1bInputBundleScenario(input);
  const replay = await ctx.workflowHarness.runPublishV1bInputBundleScenario(input);

  assertScenarioPassed(first);
  assertScenarioPassed(replay);
  assert.equal(replay.node_result.replay_provenance?.replayed, true);
  assert.equal(replay.node_result.v1b_input_bundle_ref?.ref_id, first.node_result.v1b_input_bundle_ref?.ref_id);
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    humanConfirmResult.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 1);
});

test('workflow harness blocks changed publish attempt input for same node_attempt_id', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const input = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
    workflow_run_id: 'workflow_run_publish_hash_mismatch',
    node_attempt_id: 'node_attempt_publish_hash_mismatch',
  });
  const first = await ctx.workflowHarness.runPublishV1bInputBundleScenario(input);
  const mismatch = await ctx.workflowHarness.runPublishV1bInputBundleScenario({
    ...input,
    expected_bundle_version: 'v1a-to-v1b-input-bundle-v2',
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
      idempotency_result: 'not_applicable',
      bundle_published: false,
    },
  });

  assertScenarioPassed(first);
  assertScenarioPassed(mismatch);
  assert.equal(mismatch.node_result.error_code, 'VERSION_CONFLICT');
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    humanConfirmResult.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 1);
});

test('workflow harness blocks publish-v1b-input-bundle lineage drift without creating bundle', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const input = await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
    workflow_run_id: 'workflow_run_publish_lineage_drift',
    node_attempt_id: 'node_attempt_publish_lineage_drift',
    source_need_candidate_ref: refForTitleCard(
      'need_candidate',
      ctx.candidate.need_candidate_id,
      ctx.titleCard.title_card_id,
      'stale-candidate-version',
    ),
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['VERSION_CONFLICT'],
      idempotency_result: 'not_applicable',
      bundle_published: false,
    },
  });
  const result = await ctx.workflowHarness.runPublishV1bInputBundleScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.v1b_input_bundle_ref, null);
  const bundles = await ctx.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(
    humanConfirmResult.node_result.validated_need_ref!.ref_id,
  );
  assert.equal(bundles.length, 0);
});

test('workflow harness blocks publish-v1b-input-bundle without expected bundle version', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const humanConfirmResult = await runHumanConfirmNeedForPublish(ctx);
  const result = await ctx.workflowHarness.runPublishV1bInputBundleScenario(
    await publishV1bInputBundleScenarioInput(ctx, humanConfirmResult, {
      workflow_run_id: 'workflow_run_publish_missing_version',
      node_attempt_id: 'node_attempt_publish_missing_version',
      expected_bundle_version: '',
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        error_code: 'INVALID_PAYLOAD',
        blocker_codes: ['INVALID_PAYLOAD'],
        idempotency_result: 'not_applicable',
        bundle_published: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.v1b_input_bundle_ref, null);
});

test('workflow harness accepts human_delegated confirmation only with fixed policy provenance', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      confirmation_input: humanConfirmationInput(ctx, {
        actor_mode: 'human_delegated',
        delegated_executor: {
          executor_type: 'codex',
          provenance_ref: refForTitleCard('artifact_ref', 'codex_confirmation_review_001', ctx.titleCard.title_card_id),
          policy_id: 'n8-validate-only-delegation-v1',
        },
      }),
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
});

test('workflow harness blocks human confirmation when required residual risk is not accepted', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  assert.ok(ctx.supportPacket);
  ctx.supportPacket.residual_risk_refs = [
    refForTitleCard('accepted_risk', 'risk_missing_acceptance_001', ctx.titleCard.title_card_id),
  ];
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_human_confirm_missing_risk',
      node_attempt_id: 'node_attempt_human_confirm_missing_risk',
      confirmation_input: humanConfirmationInput(ctx, {
        accepted_risk_refs: [],
      }),
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['MISSING_ACCEPTED_RISK_COVERAGE'],
        validated_need_created: false,
        v1b_bundle_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.validated_need_ref, null);
});

test('workflow harness blocks human-confirm semantic review lineage drift before authority writes', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_review_drift',
    node_attempt_id: 'node_attempt_human_confirm_review_drift',
    execution_mode: 'mocked_llm',
    mocked_output: null,
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['SEMANTIC_REVIEW_LINEAGE_MISMATCH'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });
  input.mocked_output = {
    fixture_id: 'fixture_human_confirm_review_profile_drift',
    output: humanConfirmationSemanticReviewOutput(ctx, input, {
      profile_id: 'topic-selection.confirmation-semantic-review.legacy-profile.v0',
      execution_mode: 'mocked_llm',
    }),
  };

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.validated_need_ref, null);
  assert.equal(result.node_result.human_decision_ref, null);
  const validatedNeeds = await ctx.needValidationRepository.listValidatedNeedsByTitleCardId(ctx.titleCard.title_card_id);
  assert.equal(validatedNeeds.length, 0);
});

test('workflow harness blocks human-confirm semantic review provenance drift before authority writes', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_review_provenance_drift',
    node_attempt_id: 'node_attempt_human_confirm_review_provenance_drift',
    execution_mode: 'mocked_llm',
    mocked_output: null,
    expectations: {
      status: 'blocked',
      route_outcome: 'blocked',
      error_code: 'VERSION_CONFLICT',
      blocker_codes: ['SEMANTIC_REVIEW_LINEAGE_MISMATCH'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });
  const runtimeContextPlaceholder = refForTitleCard(
    'artifact_ref',
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER,
    ctx.titleCard.title_card_id,
  );
  input.mocked_output = {
    fixture_id: 'fixture_human_confirm_review_provenance_drift',
    output: humanConfirmationSemanticReviewOutput(ctx, input, {
      context_packet_ref: runtimeContextPlaceholder,
      provenance_ref: refForTitleCard('artifact_ref', 'wrong_semantic_review_provenance', ctx.titleCard.title_card_id),
      execution_mode: 'mocked_llm',
    }),
  };

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.validated_need_ref, null);
  assert.equal(result.node_result.human_decision_ref, null);
  const validatedNeeds = await ctx.needValidationRepository.listValidatedNeedsByTitleCardId(ctx.titleCard.title_card_id);
  assert.equal(validatedNeeds.length, 0);
});

test('workflow harness preserves human-confirm semantic review failure reasons on review routing', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_review_failure_reason',
    node_attempt_id: 'node_attempt_human_confirm_review_failure_reason',
    execution_mode: 'mocked_llm',
    mocked_output: null,
    expectations: {
      status: 'require_human_review',
      route_outcome: 'require_human_review',
      error_code: 'GATE_CONSTRAINT_FAILED',
      blocker_codes: ['SCHEMA_VALIDATION_FAILED'],
      review_reason_codes: ['SEMANTIC_REVIEW_FAILED'],
      validated_need_created: false,
      v1b_bundle_created: false,
    },
  });
  const runtimeContextPlaceholder = refForTitleCard(
    'artifact_ref',
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_RUNTIME_CONTEXT_REF_PLACEHOLDER,
    ctx.titleCard.title_card_id,
  );
  const malformedReview = humanConfirmationSemanticReviewOutput(ctx, input, {
    context_packet_ref: runtimeContextPlaceholder,
    provenance_ref: runtimeContextPlaceholder,
    execution_mode: 'mocked_llm',
  }) as unknown as Record<string, unknown>;
  delete malformedReview.status;
  input.mocked_output = {
    fixture_id: 'fixture_human_confirm_review_schema_failure',
    output: malformedReview as unknown as HumanConfirmationSemanticReview,
  };

  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'require_human_review');
  assert.deepEqual(result.node_result.review_reason_codes, ['SEMANTIC_REVIEW_FAILED']);
  assert.equal(result.node_result.validated_need_ref, null);
  assert.equal(result.node_result.human_decision_ref, null);
});

test('workflow harness replays identical human-confirm-need attempt before duplicate guard', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const input = humanConfirmNeedScenarioInput(ctx, validateResult, {
    workflow_run_id: 'workflow_run_human_confirm_replay',
    node_attempt_id: 'node_attempt_human_confirm_replay',
  });
  const first = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);
  const replay = await ctx.workflowHarness.runHumanConfirmNeedScenario(input);

  assertScenarioPassed(first);
  assertScenarioPassed(replay);
  assert.equal(replay.node_result.replay_provenance?.replayed, true);
  assert.equal(replay.node_result.validated_need_ref?.ref_id, first.node_result.validated_need_ref?.ref_id);
  const validatedNeeds = await ctx.needValidationRepository.listValidatedNeedsByTitleCardId(ctx.titleCard.title_card_id);
  assert.equal(validatedNeeds.length, 1);
});

test('workflow harness blocks new human-confirm-need attempt when reserved id is already materialized', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  const first = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_human_confirm_duplicate',
      node_attempt_id: 'node_attempt_human_confirm_duplicate_first',
    }),
  );
  const duplicate = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_human_confirm_duplicate',
      node_attempt_id: 'node_attempt_human_confirm_duplicate_second',
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['DUPLICATE_VALIDATED_NEED'],
        validated_need_created: false,
        v1b_bundle_created: false,
      },
    }),
  );

  assertScenarioPassed(first);
  assertScenarioPassed(duplicate);
  assert.equal(duplicate.node_result.validated_need_ref, null);
});

test('workflow harness blocks partial human confirmation write without automatic backfill', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const validateResult = await runValidateNeedForHumanConfirm(ctx);
  await ctx.controlPlaneRepository.createHumanConfirmedDecision({
    human_confirmed_decision_id: 'human_decision_partial_001',
    workspace_id: null,
    title_card_id: ctx.titleCard.title_card_id,
    target_ref: validateResult.node_result.reserved_validated_need_ref!,
    decision_type: 'confirm',
    actor: { actor_type: 'human', actor_id: 'reviewer_1' },
    rationale: 'Partial write fixture.',
    artifact_refs: [],
    policy_version_id: 'v1',
    resulting_authority_refs: [validateResult.node_result.reserved_validated_need_ref!],
    created_at: '2026-05-19T00:00:00.000Z',
  });
  const result = await ctx.workflowHarness.runHumanConfirmNeedScenario(
    humanConfirmNeedScenarioInput(ctx, validateResult, {
      workflow_run_id: 'workflow_run_human_confirm_partial',
      node_attempt_id: 'node_attempt_human_confirm_partial',
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['PARTIAL_CONFIRMATION_WRITE'],
        validated_need_created: false,
        v1b_bundle_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.validated_need_ref, null);
});

test('workflow harness routes high-risk model-only adjudication to human review without authority writes', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'reject' });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      workflow_run_id: packet.workflow_run_id,
      node_attempt_id: packet.node_attempt_id,
      expectations: {
        status: 'require_human_review',
        route_outcome: 'require_human_review',
        final_decision: 'reject',
        review_reason_codes: ['HIGH_RISK_DECISION_REQUIRES_HUMAN_ACCEPTANCE'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'require_human_review');
  assert.equal(result.node_result.adjudication_result_ref, null);
  assert.deepEqual(result.node_result.review_reason_codes, ['HIGH_RISK_DECISION_REQUIRES_HUMAN_ACCEPTANCE']);
  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 0);
});

test('workflow harness persists high-risk adjudication only with explicit human acceptance', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'reject' });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      adjudication_actor: { actor_type: 'human', actor_id: 'reviewer_1' },
      expectations: {
        status: 'ready',
        route_outcome: 'stop_rejected',
        final_decision: 'reject',
        adjudication_created: true,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
  assert.equal(result.node_result.route_outcome, 'stop_rejected');
  assert.equal(result.node_result.reserved_validated_need_ref, null);
  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 1);
  assert.equal(adjudications[0]?.final_decision, 'reject');
});

test('workflow harness creates typed SearchPlan recheck route without mutating SearchPlan', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'request_searchplan_recheck' });
  const planBefore = await ctx.searchResourceRepository.findSearchPlanById(ctx.candidate.search_plan_ref.ref_id);
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      expectations: {
        status: 'ready',
        route_outcome: 'repair_search_plan',
        final_decision: 'request_searchplan_recheck',
        adjudication_created: true,
      },
    }),
  );
  const planAfter = await ctx.searchResourceRepository.findSearchPlanById(ctx.candidate.search_plan_ref.ref_id);

  assertScenarioPassed(result);
  assert.equal(result.node_result.repair_target, 'search_plan');
  assert.equal(result.node_result.recheck_request_ref?.ref_type, 'search_plan_recheck_request');
  assert.deepEqual(planAfter, planBefore);
});

test('workflow harness blocks return-to-candidate recommendation without actionable repair actions', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'return_to_candidate' }, {
    required_actions: [],
  });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: 'return_to_candidate',
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['REQUIRED_ACTIONS_MISSING'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.adjudication_result_ref, null);
});

test('workflow harness native runner routes N7 return-to-candidate to N6 repair loopback', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'return_to_candidate' }, {
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  });
  const result = await ctx.workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    workflow_run_id: packet.workflow_run_id,
    node_attempt_id: packet.node_attempt_id,
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: ctx.titleCard.title_card_id,
    scenario_input: validateNeedAdjudicationScenarioInput(ctx, packet, {
      expectations: {
        status: 'ready',
        route_outcome: 'repair_need_candidate',
        final_decision: 'return_to_candidate',
        adjudication_created: true,
      },
    }),
  });

  assert.equal(result.route_signal, 'need_candidate_repair_required');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.route_target_node_id, 'topic-selection.v1a.generate-need-candidate.v1');
});

test('workflow harness native runner routes N7 park to hold without auto-advance', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'park' }, {
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  });
  const result = await ctx.workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    workflow_run_id: packet.workflow_run_id,
    node_attempt_id: packet.node_attempt_id,
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: ctx.titleCard.title_card_id,
    scenario_input: validateNeedAdjudicationScenarioInput(ctx, packet, {
      adjudication_actor: { actor_type: 'human', actor_id: 'reviewer_park' },
      expectations: {
        status: 'ready',
        route_outcome: 'hold_candidate',
        final_decision: 'park',
        adjudication_created: true,
      },
    }),
  });

  assert.equal(result.route_signal, 'candidate_parked');
  assert.equal(result.route_decision, 'hold');
  assert.equal(result.route_target_node_id, null);
});

test('workflow harness native runner routes N7 merge to stop-no-advance', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const mergeTarget = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: ctx.titleCard.title_card_id,
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    candidate_need: 'Related need that should absorb the duplicate candidate.',
    unmet_need_statement: 'A nearby validated workflow gap already covers this candidate.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: 'Duplicate evidence lineage can be consolidated.',
    scope_notes: 'Merge target fixture.',
    prior_art_status: 'no_strong_solution_found',
    gap_codes: [],
    created_by: 'system',
  });
  const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: 'merge' }, {
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    merge_target_need_candidate_ref: refForTitleCard(
      'need_candidate',
      mergeTarget.need_candidate_id,
      mergeTarget.title_card_id,
      mergeTarget.candidate_version,
    ),
  });
  const result = await ctx.workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.validate-need-adjudication.v1',
    workflow_run_id: packet.workflow_run_id,
    node_attempt_id: packet.node_attempt_id,
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: ctx.titleCard.title_card_id,
    scenario_input: validateNeedAdjudicationScenarioInput(ctx, packet, {
      adjudication_actor: { actor_type: 'human', actor_id: 'reviewer_merge' },
      expectations: {
        status: 'ready',
        route_outcome: 'stop_merged',
        final_decision: 'merge',
        adjudication_created: true,
      },
    }),
  });

  assert.equal(result.route_signal, 'candidate_merged');
  assert.equal(result.route_decision, 'stop_no_advance');
  assert.equal(result.route_target_node_id, null);
});

test('workflow harness blocks recommendation packets that try to carry orchestration fields', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx);
  const malformedPacket = {
    ...packet,
    route_outcome: 'advance_to_human_confirmation',
    next_node_id: 'topic-selection.v1a.human-confirm-need.v1',
  } as unknown as TopicSelectionNeedAdjudicationRecommendationPacket;
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, malformedPacket, {
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['SCHEMA_VALIDATION_FAILED'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.error_code, 'GATE_CONSTRAINT_FAILED');
  assert.ok(result.node_result.blocker_codes.includes('SCHEMA_VALIDATION_FAILED'));
  assert.equal(result.node_result.recommendation_packet_ref, null);
  assert.equal(result.node_result.adjudication_result_ref, null);
});

test('workflow harness blocks recommendation profile and policy drift before authority writes', async () => {
  for (const [caseId, overrides] of [
    ['profile', { profile_id: 'topic-selection.need-adjudication.drifted.v1' }],
    ['policy', { policy_version: 'drifted-policy' }],
    ['output-schema', { output_schema_version: 'drifted-schema' }],
  ] as const) {
    const ctx = await seedValidateNeedAdjudicationRuntime();
    const packet = needAdjudicationRecommendationPacket(ctx, {
      workflow_run_id: `workflow_run_validate_need_${caseId}_drift`,
      node_attempt_id: `node_attempt_validate_need_${caseId}_drift`,
    }, overrides);
    const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
      validateNeedAdjudicationScenarioInput(ctx, packet, {
        expectations: {
          status: 'blocked',
          route_outcome: 'blocked',
          final_decision: null,
          error_code: 'VERSION_CONFLICT',
          blocker_codes: ['VERSION_CONFLICT'],
          adjudication_created: false,
        },
      }),
    );

    assertScenarioPassed(result);
    assert.equal(result.node_result.recommendation_packet_ref, null);
    assert.equal(result.node_result.adjudication_result_ref, null);
    const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
      ctx.candidate.need_candidate_id,
    );
    assert.equal(adjudications.length, 0);
  }
});

test('workflow harness blocks validate-need-adjudication before support packet creation when readiness is not ready', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime({ includeContext: false });
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, null, {
      workflow_run_id: 'workflow_run_validate_need_readiness_blocked',
      node_attempt_id: 'node_attempt_validate_need_readiness_blocked',
      validation_support_packet_ref: null,
      support_packet_mode: 'create_fresh',
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['READINESS_EVIDENCE_GAP'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.validation_support_packet_ref, null);
  assert.deepEqual(result.node_result.blocker_codes, ['READINESS_EVIDENCE_GAP']);
  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 0);
});

test('workflow harness treats readiness reject, merge-required, and park as gate findings only', async () => {
  for (const [recommendation, blockerCode] of [
    ['reject', 'READINESS_REJECT'],
    ['merge_required', 'READINESS_MERGE_REQUIRED'],
    ['park', 'READINESS_PARK'],
  ] as const) {
    const ctx = await seedValidateNeedAdjudicationRuntime();
    ctx.readiness.recommendation = recommendation;
    const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
      validateNeedAdjudicationScenarioInput(ctx, null, {
        workflow_run_id: `workflow_run_validate_need_readiness_${recommendation}`,
        node_attempt_id: `node_attempt_validate_need_readiness_${recommendation}`,
        validation_support_packet_ref: ctx.supportPacket
          ? refForTitleCard(
              'validation_decision_support_packet',
              ctx.supportPacket.validation_support_packet_id,
              ctx.titleCard.title_card_id,
            )
          : null,
        expectations: {
          status: 'blocked',
          route_outcome: 'blocked',
          final_decision: null,
          error_code: 'GATE_CONSTRAINT_FAILED',
          blocker_codes: [blockerCode],
          adjudication_created: false,
        },
      }),
    );

    assertScenarioPassed(result);
    assert.equal(result.node_result.adjudication_result_ref, null);
    const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
      ctx.candidate.need_candidate_id,
    );
    assert.equal(adjudications.length, 0);
  }
});

test('workflow harness consumes frozen support packet after upstream evidence freshness changes', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  await ctx.evidenceMaps.markEvidenceMapStale({
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    stale_reason_codes: ['UPSTREAM_SEARCH_REFRESHED_AFTER_SUPPORT_PACKET'],
  });
  const packet = needAdjudicationRecommendationPacket(ctx);
  const result = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      workflow_run_id: 'workflow_run_validate_need_frozen_support',
      node_attempt_id: 'node_attempt_validate_need_frozen_support',
      mocked_output: {
        fixture_id: 'fixture_frozen_support_after_upstream_mutation',
        output: {
          ...packet,
          workflow_run_id: 'workflow_run_validate_need_frozen_support',
          node_attempt_id: 'node_attempt_validate_need_frozen_support',
          recommendation_packet_id: 'node_attempt_validate_need_frozen_support_recommendation',
        },
      },
      expectations: {
        status: 'ready',
        route_outcome: 'advance_to_human_confirmation',
        final_decision: 'validate',
        adjudication_created: true,
      },
    }),
  );

  assertScenarioPassed(result);
  assert.equal(result.node_result.status, 'ready');
});

test('workflow harness blocks duplicate adjudication attempts with existing adjudication ref', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const firstPacket = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_duplicate',
    node_attempt_id: 'node_attempt_validate_need_duplicate_first',
  });
  const first = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, firstPacket),
  );
  const secondPacket = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_duplicate',
    node_attempt_id: 'node_attempt_validate_need_duplicate_second',
  });
  const second = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, secondPacket, {
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'GATE_CONSTRAINT_FAILED',
        blocker_codes: ['DUPLICATE_OR_PENDING_ADJUDICATION'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(first);
  assertScenarioPassed(second);
  assert.equal(second.node_result.duplicate_adjudication_ref?.ref_id, first.node_result.adjudication_result_ref?.ref_id);
  assert.equal(second.node_result.reserved_validated_need_ref?.ref_id, first.node_result.reserved_validated_need_ref?.ref_id);
  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 1);
});

test('workflow harness replays identical validate-need-adjudication attempt and blocks changed attempt input', async () => {
  const ctx = await seedValidateNeedAdjudicationRuntime();
  const packet = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: 'workflow_run_validate_need_replay',
    node_attempt_id: 'node_attempt_validate_need_replay',
  });
  const input = validateNeedAdjudicationScenarioInput(ctx, packet);
  const first = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(input);
  const replay = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(input);
  const replayWithChangedExpectations = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, packet, {
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        adjudication_created: false,
      },
    }),
  );
  const changedPacket = needAdjudicationRecommendationPacket(ctx, {
    workflow_run_id: packet.workflow_run_id,
    node_attempt_id: packet.node_attempt_id,
    final_decision: 'return_to_candidate',
  });
  const mismatch = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(ctx, changedPacket, {
      expectations: {
        status: 'blocked',
        route_outcome: 'blocked',
        final_decision: null,
        error_code: 'VERSION_CONFLICT',
        blocker_codes: ['REPLAY_INPUT_HASH_MISMATCH'],
        adjudication_created: false,
      },
    }),
  );

  assertScenarioPassed(first);
  assert.equal(replay.node_result.replay_provenance?.replayed, true);
  assert.equal(replay.node_result.adjudication_result_ref?.ref_id, first.node_result.adjudication_result_ref?.ref_id);
  assert.equal(replay.node_result.reserved_validated_need_ref?.ref_id, first.node_result.reserved_validated_need_ref?.ref_id);
  assert.equal(replayWithChangedExpectations.node_result.replay_provenance?.replayed, true);
  assert.equal(replayWithChangedExpectations.scenario_status, 'failed');
  assert.equal(
    replayWithChangedExpectations.assertions.some((assertion) =>
      assertion.assertion_id === 'expected_node_status' && assertion.passed === false,
    ),
    true,
  );
  assertScenarioPassed(mismatch);
  assert.equal(mismatch.node_result.status, 'blocked');
  assert.deepEqual(mismatch.node_result.blocker_codes, ['REPLAY_INPUT_HASH_MISMATCH']);
  const adjudications = await ctx.needValidationRepository.listAdjudicationResultsByNeedCandidateId(
    ctx.candidate.need_candidate_id,
  );
  assert.equal(adjudications.length, 1);
});

test('workflow harness runs generate-need-candidate finalize scenario through persistence boundary', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput());

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'succeeded');
  assert.equal(
    result.adapter_result.supplemental_round_routing_decision?.routing_decision,
    'finalize_with_admitted_batch',
  );
  assert.equal(result.adapter_result.persist_need_candidate_batch_result?.persisted_candidate_refs.length, 1);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);
  assert.equal(result.harness_trace_artifact.artifact_key, 'discovery_audit');
  assert.equal(
    result.harness_trace_snapshot.authority_refs[0]?.ref_type,
    'need_candidate',
  );
  assert.equal(llmGateway.calls.length, 0);

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"payload_schema":"WorkflowHarnessGenerateNeedCandidateScenarioTrace@v1"'),
    ),
    true,
  );
});

test('workflow harness blocks over-budget generate-need-candidate provider scenario before gateway or authority writes', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'provider-over-budget-runtime-block',
    workflow_run_id: 'workflow_run_n6_over_budget',
    input_snapshot_id: 'input_snapshot_n6_over_budget',
    node_attempt_id: 'node_attempt_n6_over_budget',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 200_000,
      compression_already_applied: true,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'blocked',
      routing_decision: null,
      persisted_candidate_count: 0,
      error_code: 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION',
      blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'],
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'blocked');
  assert.equal(result.adapter_result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.adapter_result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.adapter_result.minimum_schema_validation_report_artifact, null);
  assert.equal(result.adapter_result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.adapter_result.supplemental_round_routing_decision_artifact, null);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_id === result.compiled_context.exploration_context_ref.ref_id
        || refEntry.ref_id === result.compiled_context.arbiter_context_ref.ref_id,
    ),
    true,
  );

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_n6_over_budget');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'),
    ),
    true,
  );
});

test('workflow harness compresses over-target generate-need-candidate context and still applies gates', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'provider-over-target-compression-rerender',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 1,
      persistence: 'required',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'succeeded');
  assert.equal(result.adapter_result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(result.adapter_result.invocation_result.token_budget_gate_result?.decision, 'within_budget');
  assert.equal(llmGateway.calls.length, 1);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_id === result.adapter_result.context_compression_report_artifact?.artifact_ref.ref_id,
    ),
    true,
  );

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"context_compression_report"')
        && JSON.stringify(artifact.payload).includes('"payload_schema":"TopicSelectionCompressionReportEnvelope@v1"'),
    ),
    true,
  );
});

test('workflow harness blocks generate-need-candidate when compressed context remains over budget', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'provider-compressed-context-still-over-budget',
    workflow_run_id: 'workflow_run_n6_compressed_over_budget',
    input_snapshot_id: 'input_snapshot_n6_compressed_over_budget',
    node_attempt_id: 'node_attempt_n6_compressed_over_budget',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 200_000,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'blocked',
      routing_decision: null,
      persisted_candidate_count: 0,
      error_code: 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION',
      blocker_codes: ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'],
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'blocked');
  assert.equal(result.adapter_result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.adapter_result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(result.adapter_result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.adapter_result.minimum_schema_validation_report_artifact, null);
  assert.equal(result.adapter_result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.adapter_result.supplemental_round_routing_decision_artifact, null);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((refEntry) =>
      refEntry.ref_id === result.adapter_result.context_compression_report_artifact?.artifact_ref.ref_id,
    ),
    true,
  );

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId(
    'workflow_run_n6_compressed_over_budget',
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"context_compression_report"'),
    ),
    true,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
});

test('workflow harness stress-tests v1a N6 runtime cache boundaries', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const rankedSchemaName = 'topic_selection_ranked_candidate_draft_batch';
  const baseProviderInput = (caseId: string, nodeAttemptId: string, workflowRunId: string) =>
    scenarioInput({
      scenario_case_id: caseId,
      workflow_run_id: workflowRunId,
      node_attempt_id: nodeAttemptId,
      execution_mode: 'provider_llm',
      run_mode: 'product',
      mocked_output: null,
      persist_admitted_candidates: false,
      persistence_context: null,
      expectations: {
        status: 'succeeded',
        routing_decision: 'finalize_with_admitted_batch',
        admitted_draft_count: 1,
        persisted_candidate_count: 0,
        persistence: 'forbidden',
      },
    });

  const warmInput = baseProviderInput(
    'runtime-stress-n6-cache-warm',
    'node_attempt_runtime_stress_cache_warm',
    'workflow_run_runtime_stress_cache_warm',
  );
  llmGateway.setOutputForSchema(rankedSchemaName, rankedBatch(warmInput.node_attempt_id));
  const warm = await workflowHarness.runGenerateNeedCandidateScenario(warmInput);

  const exactHitInput = baseProviderInput(
    'runtime-stress-n6-cache-exact-hit',
    'node_attempt_runtime_stress_cache_hit',
    'workflow_run_runtime_stress_cache_hit',
  );
  llmGateway.setOutputForSchema(rankedSchemaName, rankedBatch(exactHitInput.node_attempt_id));
  const exactHit = await workflowHarness.runGenerateNeedCandidateScenario(exactHitInput);

  const driftMissInput = {
    ...baseProviderInput(
      'runtime-stress-n6-cache-profile-drift-miss',
      'node_attempt_runtime_stress_cache_drift',
      'workflow_run_runtime_stress_cache_drift',
    ),
    model_option_id: `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.dashscope-thinking-budget`,
  };
  llmGateway.setOutputForSchema(rankedSchemaName, rankedBatch(driftMissInput.node_attempt_id));
  const driftMiss = await workflowHarness.runGenerateNeedCandidateScenario(driftMissInput);

  const supplementalRoundInput = {
    ...baseProviderInput(
      'runtime-stress-n6-cache-supplemental-runtime-miss',
      'node_attempt_runtime_stress_cache_supplemental',
      'workflow_run_runtime_stress_cache_supplemental',
    ),
    current_round_index: 2,
    remaining_round_budget: 0,
  };
  llmGateway.setOutputForSchema(rankedSchemaName, rankedBatch(supplementalRoundInput.node_attempt_id));
  const supplementalRound = await workflowHarness.runGenerateNeedCandidateScenario(supplementalRoundInput);

  const semanticScenarioInput = baseProviderInput(
    'semantic-runtime-identity.n6-cache-miss',
    'node_attempt_runtime_stress_cache_semantic_scenario',
    'workflow_run_runtime_stress_cache_semantic_scenario',
  );
  llmGateway.setOutputForSchema(rankedSchemaName, rankedBatch(semanticScenarioInput.node_attempt_id));
  const semanticScenario = await workflowHarness.runGenerateNeedCandidateScenario(semanticScenarioInput);

  assertScenarioPassed(warm);
  assertScenarioPassed(exactHit);
  assertScenarioPassed(driftMiss);
  assertScenarioPassed(supplementalRound);
  assertScenarioPassed(semanticScenario);
  assert.equal(warm.compiled_context.exploration_context_packet.cache_hit, false);
  assert.equal(warm.compiled_context.arbiter_context_packet.cache_hit, false);
  assert.equal(exactHit.compiled_context.exploration_context_packet.cache_hit, true);
  assert.equal(exactHit.compiled_context.arbiter_context_packet.cache_hit, true);
  assert.equal(
    exactHit.compiled_context.exploration_context_ref.ref_id,
    warm.compiled_context.exploration_context_ref.ref_id,
  );
  assert.equal(
    exactHit.compiled_context.arbiter_context_ref.ref_id,
    warm.compiled_context.arbiter_context_ref.ref_id,
  );
  assert.equal(driftMiss.compiled_context.exploration_context_packet.cache_hit, false);
  assert.equal(driftMiss.compiled_context.arbiter_context_packet.cache_hit, false);
  assert.equal(supplementalRound.compiled_context.exploration_context_packet.cache_hit, false);
  assert.equal(supplementalRound.compiled_context.arbiter_context_packet.cache_hit, false);
  assert.equal(semanticScenario.compiled_context.exploration_context_packet.cache_hit, false);
  assert.equal(semanticScenario.compiled_context.arbiter_context_packet.cache_hit, false);
  assert.notEqual(
    driftMiss.compiled_context.exploration_context_ref.ref_id,
    warm.compiled_context.exploration_context_ref.ref_id,
  );
  assert.notEqual(
    driftMiss.compiled_context.arbiter_context_ref.ref_id,
    warm.compiled_context.arbiter_context_ref.ref_id,
  );
  assert.notEqual(
    supplementalRound.compiled_context.exploration_context_ref.ref_id,
    warm.compiled_context.exploration_context_ref.ref_id,
  );
  assert.notEqual(
    semanticScenario.compiled_context.arbiter_context_ref.ref_id,
    warm.compiled_context.arbiter_context_ref.ref_id,
  );
  assert.equal(llmGateway.calls.length, 5);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);

  const exactHitArtifactKeys = (await controlPlaneRepository.listArtifactRefsByWorkflowRunId(
    exactHitInput.workflow_run_id,
  )).map(artifactSnapshotKey);
  assert.equal(exactHitArtifactKeys.includes('exploration_context_packet'), false);
  assert.equal(exactHitArtifactKeys.includes('arbiter_context_packet'), false);
  assert.equal(exactHitArtifactKeys.includes('ranked_candidate_draft_batch'), true);
  assert.equal(exactHitArtifactKeys.includes('minimum_schema_validation_report'), true);
  assert.equal(exactHitArtifactKeys.includes('candidate_draft_admission_report'), true);
  assert.equal(exactHitArtifactKeys.includes('supplemental_round_routing_decision'), true);

  const staleRuntime = await makeRuntime({
    contextPacketCache: new ForcedStaleContextPacketCacheService(),
  });
  await assert.rejects(
    () => staleRuntime.workflowHarness.runGenerateNeedCandidateScenario(baseProviderInput(
      'runtime-stress-n6-cache-stale-block',
      'node_attempt_runtime_stress_cache_stale',
      'workflow_run_runtime_stress_cache_stale',
    )),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.equal(staleRuntime.llmGateway.calls.length, 0);
  assert.equal(
    (await staleRuntime.needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length,
    0,
  );
});

test('workflow harness stress-tests v1a LLM runtime gates from N5 through N8', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const titleCardId = ctx.titleCard.title_card_id;
  const inputRefsHash = ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff);
  const literatureRef = ctx.literatureSnapshot.literature_refs[0]!;
  const sourceRef = ctx.literatureSnapshot.content_source_refs[0]!;
  const supportLocator = validationManualLocator({
    title_card_id: titleCardId,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    manual_ref: refForTitleCard('manual_locator', 'runtime_stress_support_locator', titleCardId),
    manual_label: 'runtime stress support locator',
  });
  const contextLocator = validationManualLocator({
    title_card_id: titleCardId,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    manual_ref: refForTitleCard('manual_locator', 'runtime_stress_context_locator', titleCardId),
    manual_label: 'runtime stress context locator',
  });
  const baseDraft = evidenceMapExtractionDraft({
    title_card_id: titleCardId,
    handoff: ctx.searchRunHandoff,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: inputRefsHash,
  });
  const supportDraftUnit = {
    ...baseDraft.draft_units[0]!,
    locator: supportLocator,
    source_statement: 'The paper reports section-backed evidence for traceable RAG adaptation validation.',
    normalized_statement: 'Traceable RAG adaptation validation needs section-backed evidence.',
  };
  const providerDraft: TopicSelectionEvidenceMapExtractionDraft = {
    ...baseDraft,
    producer_kind: 'provider_llm',
    draft_units: [
      supportDraftUnit,
      {
        ...supportDraftUnit,
        client_unit_key: 'unit_context_001',
        coverage_row_intent_ref: null,
        evidence_role: 'context',
        locator: contextLocator,
        source_statement: 'The workflow context is local-first paper engineering with reviewer evidence.',
        normalized_statement: 'The candidate is scoped to local-first reviewer-facing evidence workflows.',
        interpretation_payload: { role_hint: 'context' },
        confidence: 0.8,
        issue_codes: [],
      },
    ],
    warning_codes: ['COVERAGE_ROW_INTENT_REF_MISSING'],
  };
  ctx.llmGateway.setOutputForSchema('TopicSelectionEvidenceMapExtractionDraft@v1', providerDraft);
  const n5 = await ctx.workflowHarness.runBuildEvidenceMapScenario(buildEvidenceMapScenarioInput({
    title_card_id: titleCardId,
    handoff: ctx.searchRunHandoff,
    draft: providerDraft,
  }, {
    scenario_case_id: 'runtime-stress-n5-provider-context',
    workflow_run_id: 'workflow_run_runtime_stress_n5',
    node_attempt_id: 'node_attempt_runtime_stress_n5',
    extraction_draft: null,
    extraction_context_packet: evidenceMapExtractionContextPacket({
      workflow_run_id: 'workflow_run_runtime_stress_n5',
      node_attempt_id: 'node_attempt_runtime_stress_n5',
      handoff: ctx.searchRunHandoff,
      input_refs_hash: inputRefsHash,
      execution_mode: 'provider_llm',
    }),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    expectations: {
      status: 'succeeded',
      materialization_status: 'ready_with_warning',
      evidence_unit_count: 2,
      downstream_handoff_present: true,
      warning_codes: ['COVERAGE_ROW_INTENT_REF_MISSING'],
    },
  }));
  assertScenarioPassed(n5);
  assert.equal(n5.node_result.agent_invocation_status, 'succeeded');
  const n5Audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: [n5.node_result.agent_invocation_audit_ref],
    nodeId: 'topic-selection.v1a.build-evidence-map.v1',
  });
  assert.equal(n5Audit.token_budget_gate_result?.decision, 'within_budget');

  const evidenceUnits = n5.node_result.evidence_map_records?.evidence_units ?? [];
  const supportUnit = evidenceUnits.find((unit) => unit.evidence_role === 'support');
  const contextUnit = evidenceUnits.find((unit) => unit.evidence_role === 'context');
  assert.ok(supportUnit);
  assert.ok(contextUnit);
  const supportRef = refForTitleCard('evidence_unit', supportUnit.evidence_unit_id, titleCardId);
  const contextRef = refForTitleCard('evidence_unit', contextUnit.evidence_unit_id, titleCardId);
  const strengthRef = refForTitleCard('evidence_strength_assessment', 'runtime_stress_strength', titleCardId);
  const n6NodeAttemptId = 'node_attempt_runtime_stress_n6';
  const n6Batch = rankedBatch(n6NodeAttemptId);
  n6Batch.drafts[0] = {
    ...n6Batch.drafts[0]!,
    evidence_role_bundle: {
      support_unit_refs: [supportRef],
      challenge_unit_refs: [],
      baseline_unit_refs: [],
      context_unit_refs: [contextRef],
    },
    conflict_refs: [],
    strength_assessment_refs: [strengthRef],
  };
  const handoff = n5.node_result.downstream_handoff;
  assert.ok(handoff);
  ctx.llmGateway.setOutputForSchema('topic_selection_ranked_candidate_draft_batch', n6Batch);
  const n6 = await ctx.workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'runtime-stress-n6-provider-compression',
    title_card_id: titleCardId,
    workflow_run_id: 'workflow_run_runtime_stress_n6',
    input_snapshot_id: null,
    node_attempt_id: n6NodeAttemptId,
    topic_scope_ref: ctx.topicSeedRef,
    evidence_map_ref: handoff.evidence_map_ref,
    evidence_strength_ref: strengthRef,
    resource_sample_set_ref: null,
    candidate_pool_projection_ref: null,
    evidence_map_handoff: handoff,
    search_snapshot_refs: [handoff.search_run_ref],
    resource_snapshot_refs: [handoff.literature_resource_pool_snapshot_ref],
    exploration_payload: {
      ...explorationPayload(),
      topic_scope: {
        title_card_id: titleCardId,
        domain: 'RAG fine-tuning safety',
      },
      evidence_signal_digest: {
        support_count: 1,
        challenge_count: 0,
      },
      resource_sample_digest: {
        sample_set_id: handoff.literature_resource_pool_snapshot_ref.ref_id,
        role_counts: { support: 1, context: 1 },
        topic_method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
      },
    },
    arbiter_payload: {
      ...arbiterPayload(),
      node_policy_ref: refForTitleCard('node_policy', 'generate_need_candidate_v1', titleCardId),
      output_schema_ref: refForTitleCard('schema', 'ranked_candidate_draft_batch_v1', titleCardId),
      evidence_ref_table: [
        { evidence_ref: supportRef, role: 'support' },
        { evidence_ref: contextRef, role: 'context' },
        { evidence_ref: strengthRef, role: 'strength' },
      ],
    },
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
    persist_admitted_candidates: true,
    persistence_context: {
      search_run_ref: handoff.search_run_ref,
      search_plan_ref: handoff.search_plan_ref,
      literature_snapshot_ref: handoff.literature_resource_pool_snapshot_ref,
    },
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 1,
      persistence: 'required',
    },
  }));
  assertScenarioPassed(n6);
  assert.equal(n6.adapter_result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(n6.adapter_result.invocation_result.token_budget_gate_result?.decision, 'within_budget');
  assert.equal(n6.adapter_result.invocation_result.token_budget_gate_result?.estimated_input_tokens, 12_000);

  const candidateRef = n6.adapter_result.persist_need_candidate_batch_result?.persisted_candidate_refs[0];
  assert.ok(candidateRef);
  const candidate = await ctx.needValidationRepository.findNeedCandidateById(candidateRef.ref_id);
  assert.ok(candidate);
  const readiness = await ctx.needService.assessCandidateReadiness({
    need_candidate_id: candidate.need_candidate_id,
    assessed_by: 'system',
  });
  assert.equal(readiness.recommendation, 'ready_for_validation');
  const supportPacket = await ctx.needService.createValidationDecisionSupportPacket({
    need_candidate_id: candidate.need_candidate_id,
    readiness_assessment_id: readiness.readiness_assessment_id,
    created_by: 'system',
  });
  const adjudicationCtx = {
    ...ctx,
    evidenceMap: n5.node_result.evidence_map_records!.evidence_map,
    evidenceUnits,
    candidate,
    readiness,
    supportPacket,
  } as unknown as ValidateNeedAdjudicationSeed;
  const n7Packet = needAdjudicationRecommendationPacket(adjudicationCtx, {
    workflow_run_id: 'workflow_run_runtime_stress_n7',
    node_attempt_id: 'node_attempt_runtime_stress_n7',
  }, {
    execution_mode: 'provider_llm',
    gap_codes: ['METHOD_FAMILY_COVERAGE_GAP'],
    required_actions: ['carry method-family coverage gap into human confirmation and v1b handoff'],
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    n7Packet,
  );
  const n7 = await ctx.workflowHarness.runValidateNeedAdjudicationScenario(
    validateNeedAdjudicationScenarioInput(adjudicationCtx, n7Packet, {
      scenario_case_id: 'runtime-stress-n7-provider-adjudication',
      workflow_run_id: 'workflow_run_runtime_stress_n7',
      node_attempt_id: 'node_attempt_runtime_stress_n7',
      execution_mode: 'provider_llm',
      run_mode: 'product',
      mocked_output: null,
      expectations: {
        status: 'ready',
        route_outcome: 'advance_to_human_confirmation',
        final_decision: 'validate',
        adjudication_created: true,
      },
    }),
  );
  assertScenarioPassed(n7);
  const n7Audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: n7.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.validate-need-adjudication.v1',
  });
  assert.equal(n7Audit.token_budget_gate_result?.decision, 'within_budget');

  const n8Input = humanConfirmNeedScenarioInput(adjudicationCtx, n7, {
    scenario_case_id: 'runtime-stress-n8-provider-semantic-review',
    workflow_run_id: 'workflow_run_runtime_stress_n8',
    node_attempt_id: 'node_attempt_runtime_stress_n8',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
  });
  ctx.llmGateway.setOutputForSchema(
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
    (request: LlmStructuredOutputRequest) => {
      const payload = JSON.parse(request.messages[1]?.content ?? '{}') as {
        context_packet_ref: TopicSelectionFunctionalRef;
      };
      return {
        schema_version: TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
        workflow_run_id: n8Input.workflow_run_id,
        node_attempt_id: n8Input.node_attempt_id,
        review_id: `${n8Input.node_attempt_id}_semantic_review`,
        context_packet_ref: payload.context_packet_ref,
        execution_mode: 'provider_llm',
        profile_id: TOPIC_SELECTION_CONFIRMATION_SEMANTIC_REVIEW_SINGLE_AGENT_PROFILE_ID,
        status: 'pass',
        alignment_codes: ['validate_alignment_clear'],
        risk_coverage: 'complete',
        required_check_coverage: 'complete',
        scope_violations: [],
        rationale_summary: n8Input.confirmation_input.rationale,
        provenance_ref: payload.context_packet_ref,
        warning_codes: [],
        blocker_codes: [],
        review_reason_codes: [],
        policy_version: n8Input.policy_version,
        output_schema_version: n8Input.output_schema_version,
      } satisfies HumanConfirmationSemanticReview;
    },
  );
  const n8 = await ctx.workflowHarness.runHumanConfirmNeedScenario(n8Input);
  assertScenarioPassed(n8);
  const n8Audit = await findAgentAuditSnapshot({
    repository: ctx.controlPlaneRepository,
    refs: n8.harness_trace_snapshot.artifact_refs,
    nodeId: 'topic-selection.v1a.human-confirm-need.v1',
  });
  assert.equal(n8Audit.token_budget_gate_result?.decision, 'within_budget');

  const publish = await ctx.workflowHarness.runPublishV1bInputBundleScenario(
    await publishV1bInputBundleScenarioInput(adjudicationCtx, n8, {
      scenario_case_id: 'runtime-stress-publish-v1b-bundle',
      workflow_run_id: 'workflow_run_runtime_stress_publish',
      node_attempt_id: 'node_attempt_runtime_stress_publish',
    }),
  );
  assertScenarioPassed(publish);
  assert.equal(publish.node_result.route_outcome, 'published_v1b_input_bundle');
  assert.deepEqual(ctx.llmGateway.calls.map((call) => call.schemaName), [
    'TopicSelectionEvidenceMapExtractionDraft@v1',
    'topic_selection_ranked_candidate_draft_batch',
    TOPIC_SELECTION_NEED_ADJUDICATION_RECOMMENDATION_PACKET_SCHEMA_VERSION,
    TOPIC_SELECTION_HUMAN_CONFIRMATION_SEMANTIC_REVIEW_SCHEMA_VERSION,
  ]);
});

test('workflow harness reuses persisted NeedCandidate refs when generate-need-candidate attempt is replayed', async () => {
  const { workflowHarness, needValidationRepository, llmGateway } = await makeRuntime();
  const input = scenarioInput({
    workflow_run_id: 'workflow_run_generate_need_replay',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
  });
  const first = await workflowHarness.runGenerateNeedCandidateScenario(input);
  const replay = await workflowHarness.runGenerateNeedCandidateScenario(input);

  assert.equal(first.scenario_status, 'passed');
  assert.equal(replay.scenario_status, 'passed');
  assert.equal(first.adapter_result.persist_need_candidate_batch_result?.replayed, false);
  assert.equal(replay.adapter_result.replay_provenance?.replayed, true);
  assert.deepEqual(
    replay.adapter_result.persist_need_candidate_batch_result?.persisted_candidate_refs,
    first.adapter_result.persist_need_candidate_batch_result?.persisted_candidate_refs,
  );
  assert.equal(llmGateway.calls.length, 1);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);
});

test('workflow harness rejects changed generate-need-candidate input for an existing attempt', async () => {
  const { workflowHarness, needValidationRepository, llmGateway } = await makeRuntime();
  const input = scenarioInput({
    workflow_run_id: 'workflow_run_generate_need_hash_mismatch',
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
  });
  const first = await workflowHarness.runGenerateNeedCandidateScenario(input);

  await assert.rejects(
    () => workflowHarness.runGenerateNeedCandidateScenario({
      ...input,
      model_option_id: `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.dashscope-thinking-budget`,
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );

  assert.equal(first.scenario_status, 'passed');
  assert.equal(llmGateway.calls.length, 1);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);
});

test('workflow harness supports bounded generate-need-candidate count expectations', async () => {
  const { workflowHarness } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      min_admitted_draft_count: 1,
      max_admitted_draft_count: 5,
      min_persisted_candidate_count: 1,
      max_persisted_candidate_count: 5,
      persistence: 'required',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(
    result.assertions.some((assertion) =>
      assertion.assertion_id === 'expected_min_admitted_draft_count' && assertion.passed,
    ),
    true,
  );
  assert.equal(
    result.assertions.some((assertion) =>
      assertion.assertion_id === 'expected_max_persisted_candidate_count' && assertion.passed,
    ),
    true,
  );
});

test('workflow harness can drive mocked multi-agent debate without authority persistence', async () => {
  const { workflowHarness, controlPlaneRepository, needValidationRepository, llmGateway } = await makeRuntime();
  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-debate-finalize-artifact-only',
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
    executor_kind: 'multi_agent_debate',
    debate_loop_id: 'debate_loop_001',
    mocked_output: null,
    debate_mocked_outputs: {
      explorer: [
        { fixture_id: 'fixture_explorer_1', output: explorerNotes('explorer_1', 'angle_001') },
        { fixture_id: 'fixture_explorer_2', output: explorerNotes('explorer_2', 'angle_002') },
      ],
      deep_critic: [
        { fixture_id: 'fixture_deep_critic_1', output: deepCriticNotes() },
      ],
      arbiter_issue_frame: {
        fixture_id: 'fixture_arbiter_issue_frame',
        output: issueFrame(),
      },
      arbiter_final: {
        fixture_id: 'fixture_arbiter_final',
        output: rankedBatch(),
      },
    },
    persist_admitted_candidates: false,
    expectations: {
      status: 'succeeded',
      routing_decision: 'finalize_with_admitted_batch',
      admitted_draft_count: 1,
      persisted_candidate_count: 0,
      persistence: 'forbidden',
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.adapter_result.debate_result?.status, 'succeeded');
  assert.equal(result.adapter_result.debate_result?.role_invocation_results.length, 4);
  assert.equal(result.adapter_result.debate_result?.role_output_artifacts.length, 3);
  assert.equal(result.adapter_result.debate_result?.role_level_summary_artifacts.length, 2);
  assert.equal(result.adapter_result.debate_result?.issue_frame_artifact?.artifact_key, 'debate_issue_frame');
  assert.equal(result.adapter_result.debate_result?.final_synthesis_artifact?.artifact_key, 'debate_final_synthesis');
  assert.equal(result.adapter_result.invocation_result.provenance.executor_kind, 'multi_agent_debate');
  assert.equal(result.adapter_result.invocation_result.provenance.debate_extension?.role, 'arbiter');
  assert.equal(result.adapter_result.persist_need_candidate_batch_result, null);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal(
    result.harness_trace_snapshot.artifact_refs.some((ref) =>
      ref.ref_id === result.adapter_result.debate_result?.final_synthesis_artifact?.artifact_ref.ref_id,
    ),
    true,
  );

  const artifacts = await controlPlaneRepository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  const payloads = artifacts.map((artifact) => JSON.stringify(artifact.payload));
  assert.equal(payloads.some((payload) => payload.includes('"artifact_key":"debate_role_output"')), true);
  assert.equal(payloads.some((payload) => payload.includes('"artifact_key":"debate_final_synthesis"')), true);
});

test('workflow harness can route supplemental rounds without authority persistence', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const supplementalBatch = rankedBatch();
  supplementalBatch.drafts[0] = {
    ...supplementalBatch.drafts[0],
    speculative: true,
    scope_notes: null,
    non_goal_notes: null,
    conflict_refs: [],
    evidence_role_bundle: {
      ...supplementalBatch.drafts[0].evidence_role_bundle,
      challenge_unit_refs: [],
    },
  };

  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-supplemental-routing',
    mocked_output: {
      fixture_id: 'fixture_supplemental_round_candidate',
      output: supplementalBatch,
    },
    current_round_index: 1,
    remaining_round_budget: 1,
    persist_admitted_candidates: true,
    expectations: {
      status: 'succeeded',
      routing_decision: 'run_supplemental_round',
      admitted_draft_count: 0,
      persisted_candidate_count: 0,
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.candidate_draft_admission_report?.draft_results[0]?.decision, 'return_for_supplemental_round');
  assert.equal(result.adapter_result.supplemental_round_routing_decision?.routing_decision, 'run_supplemental_round');
  assert.deepEqual(result.adapter_result.supplemental_round_routing_decision?.allowed_roles, ['explorer', 'deep_critic']);
  assert.equal(result.adapter_result.persist_need_candidate_batch_command, null);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('workflow harness native runner maps N6 supplemental output to policy loopback', async () => {
  const { workflowHarness } = await makeRuntime();
  const nodeAttemptId = 'node_attempt_native_n6_supplemental';
  const supplementalBatch = rankedBatch(nodeAttemptId);
  supplementalBatch.drafts[0] = {
    ...supplementalBatch.drafts[0],
    speculative: true,
    scope_notes: null,
    non_goal_notes: null,
    conflict_refs: [],
    evidence_role_bundle: {
      ...supplementalBatch.drafts[0].evidence_role_bundle,
      challenge_unit_refs: [],
    },
  };

  const result = await workflowHarness.invokeNode({
    schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    workflow_run_id: 'workflow_run_native_n6_supplemental',
    node_attempt_id: nodeAttemptId,
    policy_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
    title_card_id: 'title_card_001',
    scenario_input: scenarioInput({
      scenario_case_id: 'native-n6-supplemental-loopback',
      workflow_run_id: 'ignored_by_envelope',
      node_attempt_id: 'ignored_by_envelope',
      policy_version: 'scenario-input-policy-should-not-win',
      mocked_output: {
        fixture_id: 'fixture_native_supplemental_round_candidate',
        output: supplementalBatch,
      },
      current_round_index: 1,
      remaining_round_budget: 1,
      persist_admitted_candidates: true,
      expectations: {
        status: 'succeeded',
        routing_decision: 'run_supplemental_round',
        admitted_draft_count: 0,
        persisted_candidate_count: 0,
        persistence: 'forbidden',
      },
    }),
  });

  assert.equal(result.route_signal, 'need_candidate_supplemental_round');
  assert.equal(result.route_decision, 'loopback');
  assert.equal(result.route_target_node_id, 'topic-selection.v1a.generate-need-candidate.v1');
  assert.equal(result.harness_trace_artifact_ref?.ref_type, 'artifact_ref');
  assert.equal(
    (result.scenario_result as any).node_input.policy_version,
    TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_POLICY_VERSION,
  );
});

test('workflow harness native runner rejects unsupported route policy versions before node execution', async () => {
  const { workflowHarness } = await makeRuntime();

  await assert.rejects(
    () => workflowHarness.invokeNode({
      schema_version: TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_RUN_REQUEST_SCHEMA_VERSION,
      node_id: 'topic-selection.v1a.generate-need-candidate.v1',
      workflow_run_id: 'workflow_run_native_unsupported_policy',
      node_attempt_id: 'node_attempt_native_unsupported_policy',
      policy_version: 'topic-selection-v1a-workflow-route-policy-v0' as any,
      title_card_id: 'title_card_001',
      scenario_input: scenarioInput(),
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('workflow harness captures negative admission blockers and stops before persistence', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const unresolvedBatch = rankedBatch();
  unresolvedBatch.drafts[0] = {
    ...unresolvedBatch.drafts[0],
    evidence_role_bundle: {
      ...unresolvedBatch.drafts[0].evidence_role_bundle,
      support_unit_refs: [ref('evidence_unit', 'support_missing')],
    },
  };

  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-admission-blocked',
    mocked_output: {
      fixture_id: 'fixture_unresolved_admission_ref',
      output: unresolvedBatch,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'blocked',
      routing_decision: 'block',
      admitted_draft_count: 0,
      persisted_candidate_count: 0,
      error_code: 'NO_ADMISSIBLE_NEED_CANDIDATE',
      blocker_codes: ['NO_ADMISSIBLE_NEED_CANDIDATE'],
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'blocked');
  assert.equal(result.adapter_result.candidate_draft_admission_report?.draft_results[0]?.decision, 'reject_artifact_only');
  assert.equal(result.adapter_result.supplemental_round_routing_decision?.routing_decision, 'block');
  assert.equal(result.adapter_result.persist_need_candidate_batch_result, null);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('workflow harness keeps duplicate candidates as merge hints without persistence', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const batch = rankedBatch();
  const duplicateArbiterPayload = arbiterPayload();
  duplicateArbiterPayload.candidate_pool_digest = {
    candidate_count: 1,
    candidate_entries: [
      {
        normalized_candidate_key: normalizedCandidateKey(batch),
        candidate_ref: ref('need_candidate', 'need_candidate_existing'),
      },
    ],
  };

  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-duplicate-merge-hint',
    arbiter_payload: duplicateArbiterPayload,
    mocked_output: {
      fixture_id: 'fixture_duplicate_need_candidate',
      output: batch,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'blocked',
      routing_decision: 'block',
      admitted_draft_count: 0,
      persisted_candidate_count: 0,
      error_code: 'NO_ADMISSIBLE_NEED_CANDIDATE',
      blocker_codes: ['NO_ADMISSIBLE_NEED_CANDIDATE'],
      persistence: 'forbidden',
    },
  }));

  assertScenarioPassed(result);
  assert.equal(result.adapter_result.candidate_draft_admission_report?.draft_results[0]?.decision, 'merge_hint_only');
  assert.equal(
    result.adapter_result.candidate_draft_admission_report?.draft_results[0]?.merge_target_ref?.ref_id,
    'need_candidate_existing',
  );
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('workflow harness blocks malformed structured output before downstream artifacts', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const malformed = {
    schema_version: 'v1',
    draft_batch: {
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      ranking_rationale: 'Malformed missing required arrays.',
      max_persisted_candidates: 5,
    },
    drafts: [],
    rejected_framings: [],
  } as unknown as TopicSelectionRankedCandidateDraftBatch;

  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-malformed-schema-blocked',
    mocked_output: {
      fixture_id: 'fixture_malformed_ranked_batch',
      output: malformed,
    },
    persist_admitted_candidates: true,
    expectations: {
      status: 'blocked',
      routing_decision: null,
      persisted_candidate_count: 0,
      error_code: 'SCHEMA_VALIDATION_FAILED',
      blocker_codes: ['SCHEMA_VALIDATION_FAILED'],
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.adapter_result.minimum_schema_validation_report_artifact, null);
  assert.equal(result.adapter_result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.adapter_result.supplemental_round_routing_decision_artifact, null);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('workflow harness preserves result shape across mocked, codex, and provider execution modes', async () => {
  const modes = ['mocked_llm', 'codex_assisted', 'provider_llm'] as const;
  for (const mode of modes) {
    const { workflowHarness, llmGateway } = await makeRuntime();
    const batch = rankedBatch();
    const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
      scenario_case_id: `shape-${mode}`,
      execution_mode: mode,
      run_mode: mode === 'provider_llm' ? 'product' : 'acceptance',
      executor_kind: mode === 'codex_assisted' ? 'codex_assisted' : 'single_agent',
      persist_admitted_candidates: false,
      mocked_output: mode === 'mocked_llm'
        ? { fixture_id: 'fixture_generate_need_candidate_happy_path', output: batch }
        : null,
      codex_response: mode === 'codex_assisted'
        ? { output: batch, operator_label: 'codex-local' }
        : null,
      expectations: {
        status: 'succeeded',
        routing_decision: 'finalize_with_admitted_batch',
        admitted_draft_count: 1,
        persisted_candidate_count: 0,
        persistence: 'forbidden',
      },
    }));

    assert.equal(result.scenario_status, 'passed');
    assert.equal(result.schema_version, 'v1');
    assert.equal(result.adapter_result.invocation_result.provenance.execution_mode, mode);
    assert.equal(result.adapter_result.ranked_candidate_draft_batch?.drafts.length, 1);
    assert.equal(result.adapter_result.persist_need_candidate_batch_result, null);
    assert.equal(llmGateway.calls.length, mode === 'provider_llm' ? 1 : 0);
    if (mode === 'provider_llm') {
      assert.equal(llmGateway.calls[0]?.model.profileId, TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID);
      assert.equal(
        result.adapter_result.invocation_result.provenance.model_option_id,
        `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-balanced`,
      );
    }
  }
});

test('workflow harness persistence conflict does not leave a partial duplicate batch', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const first = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput());
  assert.equal(first.scenario_status, 'passed');
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);

  await assert.rejects(
    () => workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
      scenario_case_id: 'mocked-persistence-conflict',
      workflow_run_id: 'workflow_run_002',
      input_snapshot_id: 'input_snapshot_002',
      node_attempt_id: 'node_attempt_002',
      mocked_output: {
        fixture_id: 'fixture_duplicate_persistence_conflict',
        output: rankedBatch('node_attempt_002'),
      },
    })),
    (error: unknown) => error instanceof AppError && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);
});

// --- D-29 (T-089 ⑤): bounded supplemental auto re-entry chain -----------------

function speculativeSupplementalBatch(nodeAttemptId: string) {
  const batch = rankedBatch(nodeAttemptId);
  batch.drafts[0] = {
    ...batch.drafts[0],
    speculative: true,
    scope_notes: null,
    non_goal_notes: null,
    conflict_refs: [],
    evidence_role_bundle: {
      ...batch.drafts[0].evidence_role_bundle,
      challenge_unit_refs: [],
    },
  };
  return batch;
}

function chainProviderInput(
  caseId: string,
  nodeAttemptId: string,
  workflowRunId: string,
  overrides: Partial<TopicSelectionWorkflowHarnessGenerateNeedCandidateInput> = {},
) {
  return scenarioInput({
    scenario_case_id: caseId,
    workflow_run_id: workflowRunId,
    node_attempt_id: nodeAttemptId,
    execution_mode: 'provider_llm',
    run_mode: 'product',
    mocked_output: null,
    persist_admitted_candidates: false,
    persistence_context: null,
    expectations: undefined,
    ...overrides,
  });
}

test('supplemental chain auto re-enters once and stops on finalize routing', async () => {
  const { workflowHarness, llmGateway, needValidationRepository } = await makeRuntime();
  const baseAttemptId = 'node_attempt_chain_finalize';
  let call = 0;
  llmGateway.setOutputForSchema('topic_selection_ranked_candidate_draft_batch', () => {
    call += 1;
    return call === 1
      ? speculativeSupplementalBatch(baseAttemptId)
      : rankedBatch(`${baseAttemptId}__r2`);
  });

  const chain = await workflowHarness.runGenerateNeedCandidateSupplementalChain(
    chainProviderInput('supplemental-chain-finalize', baseAttemptId, 'workflow_run_chain_finalize', {
      expectations: {
        status: 'succeeded',
        routing_decision: 'run_supplemental_round',
        admitted_draft_count: 0,
        persisted_candidate_count: 0,
        persistence: 'forbidden',
      },
    }),
  );

  assert.equal(chain.rounds.length, 2);
  assert.equal(chain.rounds[0]?.node_attempt_id, baseAttemptId);
  assert.equal(chain.rounds[0]?.routing_decision, 'run_supplemental_round');
  assert.equal(chain.rounds[0]?.scenario_status, 'passed');
  assert.equal(chain.rounds[1]?.node_attempt_id, `${baseAttemptId}__r2`);
  assert.equal(chain.rounds[1]?.routing_decision, 'finalize_with_admitted_batch');
  assert.equal(chain.stop_reason, 'terminal_routing');
  assert.equal(chain.final.scenario_status, 'passed');
  assert.equal(chain.final.node_attempt_id, `${baseAttemptId}__r2`);
  assert.equal(llmGateway.calls.length, 2);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('supplemental chain is hard-bounded at three total rounds', async () => {
  const { workflowHarness, llmGateway } = await makeRuntime();
  const baseAttemptId = 'node_attempt_chain_bounded';
  const attemptIdForRound = (round: number) => (round === 1 ? baseAttemptId : `${baseAttemptId}__r${round}`);
  let call = 0;
  llmGateway.setOutputForSchema('topic_selection_ranked_candidate_draft_batch', () => {
    call += 1;
    return speculativeSupplementalBatch(attemptIdForRound(call));
  });

  const chain = await workflowHarness.runGenerateNeedCandidateSupplementalChain(
    chainProviderInput('supplemental-chain-bounded', baseAttemptId, 'workflow_run_chain_bounded'),
  );

  assert.equal(chain.rounds.length, 3);
  assert.equal(chain.rounds[0]?.routing_decision, 'run_supplemental_round');
  assert.equal(chain.rounds[1]?.routing_decision, 'run_supplemental_round');
  assert.notEqual(chain.rounds[2]?.routing_decision, 'run_supplemental_round');
  assert.deepEqual(
    chain.rounds.map((round) => round.node_attempt_id),
    [baseAttemptId, `${baseAttemptId}__r2`, `${baseAttemptId}__r3`],
  );
  assert.equal(llmGateway.calls.length, 3);
});

test('supplemental chain stops immediately on terminal routing without re-entry', async () => {
  const { workflowHarness, llmGateway } = await makeRuntime();
  const baseAttemptId = 'node_attempt_chain_terminal';
  llmGateway.setOutputForSchema('topic_selection_ranked_candidate_draft_batch', () => rankedBatch(baseAttemptId));

  const chain = await workflowHarness.runGenerateNeedCandidateSupplementalChain(
    chainProviderInput('supplemental-chain-terminal', baseAttemptId, 'workflow_run_chain_terminal'),
  );

  assert.equal(chain.rounds.length, 1);
  assert.equal(chain.rounds[0]?.node_attempt_id, baseAttemptId);
  assert.equal(chain.rounds[0]?.routing_decision, 'finalize_with_admitted_batch');
  assert.equal(chain.stop_reason, 'terminal_routing');
  assert.equal(llmGateway.calls.length, 1);
});

test('supplemental chain respects a caller max_total_rounds below the hard cap', async () => {
  const { workflowHarness, llmGateway } = await makeRuntime();
  const baseAttemptId = 'node_attempt_chain_capped';
  let call = 0;
  llmGateway.setOutputForSchema('topic_selection_ranked_candidate_draft_batch', () => {
    call += 1;
    return speculativeSupplementalBatch(call === 1 ? baseAttemptId : `${baseAttemptId}__r${call}`);
  });

  const chain = await workflowHarness.runGenerateNeedCandidateSupplementalChain(
    chainProviderInput('supplemental-chain-capped', baseAttemptId, 'workflow_run_chain_capped'),
    { max_total_rounds: 2 },
  );

  assert.equal(chain.rounds.length, 2);
  assert.equal(chain.rounds[0]?.routing_decision, 'run_supplemental_round');
  assert.notEqual(chain.rounds[1]?.routing_decision, 'run_supplemental_round');
  assert.equal(llmGateway.calls.length, 2);
});
