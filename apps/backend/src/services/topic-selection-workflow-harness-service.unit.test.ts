import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TopicSelectionCodexCliRunnerService } from './topic-selection-codex-cli-runner-service.js';
import { TopicSelectionV1aCodexContextService } from './topic-selection-v1a-codex-context-service.js';
import { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import { TopicSelectionResearchGapProjectionService } from './topic-selection-research-gap-projection-service.js';
import { InMemoryTopicSelectionResearchCheckpointRepository } from '../repositories/in-memory-topic-selection-research-checkpoint-repository.js';
import { InMemoryTopicSelectionResearchArenaRepository } from '../repositories/in-memory-topic-selection-research-arena-repository.js';
import { TopicSelectionModelProfileRegistryService } from './topic-selection-model-profile-registry-service.js';
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
  productCheckpoints?: boolean;
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
  const checkpointRepository = new InMemoryTopicSelectionResearchCheckpointRepository();
  const arenaRepository = new InMemoryTopicSelectionResearchArenaRepository();
  const checkpoints = new TopicSelectionResearchCheckpointService(checkpointRepository, controlPlane, { arenaRepository });
  const evidenceRepository = new InMemoryTopicSelectionEvidenceMapRepository();
  const evidenceMaps = new TopicSelectionEvidenceMapService(
    evidenceRepository,
    controlPlane,
    searchResourceRepository,
    literature,
    {
      checkpointControl: options.productCheckpoints ? checkpoints : undefined,
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
      checkpointGuard: options.productCheckpoints ? checkpoints : undefined,
      gapCheckpointProjector: options.productCheckpoints ? new TopicSelectionResearchGapProjectionService({ arenaRepository,
        candidateRepository: needValidationRepository, checkpointService: checkpoints, controlPlane }) : undefined,
      idFactory: (prefix) => `${prefix}_${++sequence}`,
      now: () => '2026-05-19T00:00:00.000Z',
    },
  );
  const needCandidateBatchPersistence = new TopicSelectionPersistNeedCandidateBatchService(
    needValidationRepository,
    { now: () => '2026-05-19T00:00:00.000Z', checkpointGuard: options.productCheckpoints ? checkpoints : undefined },
  );
  const llmGateway = new StubLlmGateway(rankedBatch());
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const buildHarness = (agentOrchestrator: TopicSelectionAgentOrchestratorService, modelProfileRegistry?: TopicSelectionModelProfileRegistryService) => {
    const generateNeedCandidateAdapter = new TopicSelectionGenerateNeedCandidateOrchestratorAdapterService({
    contextCompiler,
    agentOrchestrator,
    artifactBoundary,
    draftBatchValidator: new TopicSelectionRankedCandidateDraftBatchValidatorService({
      now: () => '2026-05-19T00:00:00.000Z',
    }),
    needCandidateBatchPersistence,
  });
  return new TopicSelectionWorkflowHarnessService({
    modelProfileRegistry,
    contextCompiler,
    generateNeedCandidateAdapter,
    artifactBoundary,
    contextPacketCache,
    controlPlane,
    searchResources,
    evidenceMaps,
    evidenceMapMaterializer,
    evidenceMapExtractionAgent: agentOrchestrator,
    codexContext: new TopicSelectionV1aCodexContextService({ literature, searchResources, evidenceMaps,
      researchEvidence: new TopicSelectionResearchEvidencePacketService({ literatureRepository: literature, evidenceMapRepository: evidenceRepository,
        directEvidenceReadinessResolver: async ids => new Map(ids.map(id => [id, { ready: true, reason: 'EVIDENCE_READY' as const,
          freshness: 'fresh' as const, freshness_detail: null }])) }) }),
    needValidation: needService,
    needAdjudicationAgent: agentOrchestrator,
    compressionRuntime: options.compressionRuntime,
  }, {
    now: () => '2026-05-19T00:00:00.000Z',
  });
  };
  const workflowHarness = buildHarness(agentOrchestrator);

  return {
    checkpoints, checkpointRepository,
    buildCliHarness: (runner: TopicSelectionCodexCliRunnerService, modelProfileRegistry: TopicSelectionModelProfileRegistryService) =>
      buildHarness(new TopicSelectionAgentOrchestratorService({ controlPlane, llmGateway, modelProfileRegistry,
        codexCliRunner: runner, codexCliModelId: runner.executionIdentity.model }), modelProfileRegistry),
    controlPlane,
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

type OriginalSourceFixture = { title: string; url: string; text: string; paragraphs?: string[] };

async function seedSnapshotRuntime(options: {
  productCheckpoints?: boolean;
  sources?: OriginalSourceFixture[];
  mature?: boolean;
  missingLiterature?: boolean;
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await makeRuntime({
    ...options,
  });
  const titleCard = await ctx.titleCards.createTitleCard({
    working_title: options.sources ? 'Reliable retrieval and context use' : 'Risk-aware RAG adaptation',
    brief: options.sources ? 'Compare source-tested retrieval and context-use capability needs.' : 'Find a bounded research need for RAG and fine-tuning decisions.',
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
    if (mature && !options.sources) {
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
  for (const [index, source] of (options.sources ?? []).entries()) {
    const id = `lit_00${index + 1}`;
    const record = makeLiterature(id, { title: source.title, abstractText: null, keyContentDigest: null });
    if (index > 0) await ctx.literature.createLiterature(record);
    else await ctx.literature.updateLiterature(record);
    await ctx.literature.upsertLiteratureSource({ id: `source_00${index + 1}`, literatureId: id, provider: 'arxiv',
      sourceItemId: source.url, sourceUrl: source.url, rawPayload: { source_hash: sha256Text(source.text) }, fetchedAt: '2026-09-10T00:00:00.000Z' });
    await ctx.literature.upsertPipelineState({ id: `pipeline_state_00${index + 1}`, literatureId: id,
      citationComplete: true, abstractReady: true, keyContentReady: true, dedupStatus: 'unique', updatedAt: '2026-09-10T00:00:00.000Z' });
  }
  await ctx.titleCards.updateEvidenceBasket(titleCard.title_card_id, {
    add_literature_ids: options.sources?.map((_, index) => `lit_00${index + 1}`) ?? [literatureId],
  });
  const topicSeed = await ctx.searchResources.createTopicSeedFromTitleCard({
    title_card_id: titleCard.title_card_id,
    intent_summary: options.sources ? 'Compare bounded retrieval and context-use capability needs in the supplied original studies.' : 'Seed v1a with a bounded RAG/fine-tuning research intent.',
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

async function seedSearchPlanRuntime(options: Parameters<typeof seedSnapshotRuntime>[0] = {}) {
  const ctx = await seedSnapshotRuntime({
    ...options,
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

async function seedRecordSearchRunRuntime(options: Parameters<typeof seedSnapshotRuntime>[0] = {}) {
  const ctx = await seedSearchPlanRuntime({
    ...options,
  });
  const blueprint = searchPlanBlueprint({
    title_card_id: ctx.titleCard.title_card_id,
    topic_seed_ref: ctx.topicSeedRef,
    literature_resource_pool_snapshot_ref: ctx.literatureSnapshotRef,
    expected_snapshot_hash: ctx.snapshotHash,
  });
  if (options?.productCheckpoints) {
    blueprint.query_intents = ['Source-tested retrieval and context-use limitations', 'Known baselines and disconfirming findings'];
    blueprint.method_family_targets = ['information_retrieval', 'multi_document_question_answering'];
    blueprint.coverage_intents = (['support', 'baseline', 'challenge'] as const).map((role, index) => ({
      coverage_key: role, intent_type: role, query: `${role} evidence for source-tested retrieval and context-use capabilities`,
      rationale: `Inspect original ${role} findings before comparing research needs.`, required: true, priority: index + 1,
      expected_evidence_role: role, target_source_types: ['paper'], refs: [],
    }));
    blueprint.role_coverage_expectation = { support: 1, baseline: 1, challenge: 1 };
  }
  const searchPlanResult = await ctx.workflowHarness.runCreateSearchPlanScenario(searchPlanScenarioInput(blueprint, {
    title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: 'workflow_run_record_search_plan',
    node_attempt_id: 'node_attempt_record_search_plan',
    expectations: { status: 'succeeded', coverage_row_count: blueprint.coverage_intents.length, plan_version: 'v1' },
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

async function seedNeedValidationSearchRuntime(options: {
  productCheckpoints?: boolean;
  sources?: OriginalSourceFixture[];
  originalFulltext?: string;
  candidateNeed?: string;
  unmetNeed?: string;
  mechanismSummary?: string;
  scopeNotes?: string;
  includeContext?: boolean;
  includeChallenge?: boolean;
  gapCodes?: string[];
  compressionRuntime?: TopicSelectionCompressionRuntimeService;
} = {}) {
  const ctx = await seedRecordSearchRunRuntime({
    ...options,
  });
  const titleCardId = ctx.titleCard.title_card_id;
  const literatureRef = ctx.literatureSnapshot.literature_refs[0]!;
  const sourceRef = ctx.literatureSnapshot.content_source_refs[0]!;
  const manualLocatorRef = options.originalFulltext || options.sources?.length
    ? refForTitleCard('fulltext_paragraph', 'paragraph_001', titleCardId)
    : refForTitleCard('manual_locator', 'manual_validate_need_001', titleCardId);
  const paragraphRefs: TopicSelectionFunctionalRef[] = [];
  const originalSources: Pick<OriginalSourceFixture, 'text' | 'paragraphs'>[] = options.sources ?? (options.originalFulltext ? [{ text: options.originalFulltext }] : []);
  for (const [index, source] of originalSources.entries()) {
    const text = source.text;
    const suffix = `00${index + 1}`;
    const dates = { createdAt: '2026-05-19T00:00:00.000Z', updatedAt: '2026-05-19T00:00:00.000Z' };
    await ctx.literature.upsertFulltextExtractionBundle({
      document: { id: `document_${suffix}`, literatureId: `lit_${suffix}`, sourceAssetId: `asset_${suffix}`, normalizedText: text,
        normalizedTextPath: null, normalizedTextChecksum: sha256Text(text), parserName: 'controlled-test', parserVersion: 'v1',
        parserArtifactPath: null, parserArtifactMimeType: null, status: 'READY', diagnostics: [], ...dates },
      sections: [{ id: `section_${suffix}`, documentId: `document_${suffix}`, sectionId: `section_${suffix}`, title: 'Results', level: 1,
        orderIndex: 1, startOffset: 0, endOffset: text.length, pageStart: 1, pageEnd: 1, checksum: sha256Text(text), ...dates }],
      paragraphs: (source.paragraphs ?? [text]).map((paragraph, paragraphIndex) => {
        const start = text.indexOf(paragraph);
        assert.ok(paragraph.trim() && start >= 0, 'Every selected paragraph must be an exact original-source substring.');
        const id = `paragraph_${suffix}${paragraphIndex ? `_${paragraphIndex + 1}` : ''}`;
        paragraphRefs.push(refForTitleCard('fulltext_paragraph', id, titleCardId));
        return { id, documentId: `document_${suffix}`, paragraphId: id, sectionId: `section_${suffix}`,
          orderIndex: paragraphIndex + 1, text: paragraph, startOffset: start, endOffset: start + paragraph.length,
          pageNumber: 1, checksum: sha256Text(paragraph), confidence: 1, ...dates };
      }),
      anchors: [],
    });
  }
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
  if (options.sources?.length) {
    const bindings = ctx.coverageRowIntentRefs.flatMap(row => ctx.literatureSnapshot.literature_refs.map((literature, index) => ({
      coverage_row_intent_ref: row, literature_ref: literature, source_refs: [ctx.literatureSnapshot.content_source_refs[index]!],
      binding_kind: 'retrieval_hit' as const, result_rank: index + 1,
    })));
    bundle.evidence_map_input_refs = [...ctx.literatureSnapshot.literature_refs, ...ctx.literatureSnapshot.content_source_refs,
      ...paragraphRefs];
    bundle.evidence_bindings = bindings;
    bundle.coverage_observations = ctx.coverageRowIntentRefs.map(row => ({ coverage_row_intent_ref: row, status: 'succeeded',
      result_count: options.sources!.length, source_count: options.sources!.length, missing_reason_codes: [], notes: 'Controlled retrieval of pinned original sections.' }));
    bundle.coverage_assessments = ctx.coverageRowIntentRefs.map(row => ({ coverage_row_intent_ref: row, verdict: 'satisfied',
      issue_codes: [], confidence: 0.9, assessed_by: 'system' }));
    bundle.result_accounting = { ...bundle.result_accounting, total_result_count: options.sources.length, unique_literature_count: options.sources.length };
    bundle.source_health_summary = { ...bundle.source_health_summary, source_count: options.sources.length };
    bundle.query_provenance = ctx.searchPlan.query_intents.map(query => ({ query, source: 'controlled-source-fixture' }));
  }
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
  assert.equal(searchRunResult.node_result.status, 'succeeded', JSON.stringify(searchRunResult.node_result));
  assertScenarioPassed(searchRunResult);
  assert.ok(searchRunResult.node_result.search_run_ref);
  return { ...ctx, searchRunResult, literatureRef, sourceRef, manualLocatorRef };
}

async function createControlledNeedEvidenceMap(
  ctx: Awaited<ReturnType<typeof seedNeedValidationSearchRuntime>>,
  options: Parameters<typeof seedNeedValidationSearchRuntime>[0] = {},
) {
  const { literatureRef, sourceRef, manualLocatorRef, searchRunResult } = ctx;
  assert.ok(searchRunResult.node_result.search_run_ref);
  const titleCardId = ctx.titleCard.title_card_id;
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
    {
      client_unit_key: 'baseline_ready',
      coverage_row_intent_id: null,
      evidence_role: 'baseline' as const,
      literature_ref: literatureRef,
      source_refs: [sourceRef],
      locator: validationManualLocator({
        title_card_id: titleCardId,
        literature_ref: literatureRef,
        source_ref: sourceRef,
        manual_ref: refForTitleCard('manual_locator', 'manual_validate_need_baseline_001', titleCardId),
        manual_label: 'manual direct-neighbor baseline provenance for validation fixture',
      }),
      source_statement: 'The closest workflow baseline exposes the same topic-selection validation boundary.',
      normalized_statement: 'The direct-neighbor baseline lacks checkpoint-governed validation lineage.',
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
  if (options.includeChallenge !== false) {
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
  if (options.originalFulltext) {
    for (const unit of evidenceUnits) {
      unit.source_statement = options.originalFulltext;
      unit.normalized_statement = options.originalFulltext;
      unit.locator = { locator_type: 'paragraph', literature_ref: literatureRef, source_ref: sourceRef,
        document_ref: refForTitleCard('fulltext_document', 'document_001', titleCardId),
        locator_ref: refForTitleCard('fulltext_paragraph', 'paragraph_001', titleCardId),
        paragraph_ref: refForTitleCard('fulltext_paragraph', 'paragraph_001', titleCardId) };
    }
  }
  const evidenceMapRecords = await ctx.evidenceMaps.createEvidenceMapFromSearchRun({
    title_card_id: titleCardId,
    search_run_id: searchRunResult.node_result.search_run_ref.ref_id,
    evidence_units: evidenceUnits,
    conflict_sets: options.includeChallenge === true
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
  return { evidenceMap: evidenceMapRecords.evidence_map, evidenceUnits: evidenceMapRecords.evidence_units };
}

async function seedNeedValidationEvidenceRuntime(options: Parameters<typeof seedNeedValidationSearchRuntime>[0] = {}) {
  const ctx = await seedNeedValidationSearchRuntime(options);
  return { ...ctx, ...await createControlledNeedEvidenceMap(ctx, options) };
}

async function seedValidateNeedAdjudicationRuntime(options: Parameters<typeof seedNeedValidationEvidenceRuntime>[0] = {}) {
  const ctx = await seedNeedValidationEvidenceRuntime(options);
  const titleCardId = ctx.titleCard.title_card_id;
  const candidate = await ctx.needService.createNeedCandidateFromEvidenceMap({
    title_card_id: titleCardId,
    evidence_map_id: ctx.evidenceMap.evidence_map_id,
    candidate_need: options.candidateNeed ?? 'Need traceable validation before promoting RAG adaptation topics.',
    unmet_need_statement: options.unmetNeed ?? 'Existing workflows do not preserve enough evidence lineage before topic promotion.',
    mechanism_type: 'workflow_gap',
    mechanism_summary: options.mechanismSummary ?? 'Validation lineage can be lost before v1b handoff.',
    scope_notes: options.scopeNotes ?? 'Topic-selection v1a validation only.',
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

test('Codex upstream qualification extracts pinned sources and runs single-agent and Debate need discovery', {
  skip: process.env.TOPIC_SELECTION_CODEX_QUALIFICATION !== 'live',
}, async t => {
  const { qualificationSources } = await import('./test-fixtures/topic-selection-codex-qualification-sources.js');
  const { qualificationRunner } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_SOURCES;
  const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  if (!sourceFile || !outputRoot || !model || !home || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit live upstream qualification configuration is required.');
  const ctx = await seedBuildEvidenceMapRuntime();
  await qualificationSources(sourceFile, ctx.titleCard.title_card_id);
  const sources = JSON.parse(await fs.readFile(sourceFile, 'utf8')) as Array<{ id: string; url: string; abstract: string }>;
  const sourceId = process.env.TOPIC_SELECTION_QUALIFICATION_SOURCE_ID ?? '2004.04906v3';
  assert.ok(['2004.04906v3', '2307.03172v3'].includes(sourceId), 'This qualification case supports DPR or Lost in the Middle.');
  const source = sources.find(s => s.id === sourceId);
  assert.ok(source, 'Select one of the verified original source pins.');
  const intent = sourceId === '2307.03172v3'
    ? 'Identify a bounded need for robust use of relevant information across context positions, grounded in the documented failures in Lost in the Middle. Distinguish advertised context length from demonstrated utilization; novelty, implementation access and any proposed repair remain unverified.'
    : 'Identify bounded unmet retrieval-evaluation needs; one original DPR abstract only. Novelty, data access and fine-tuning effects are unknown.';
  await ctx.literature.upsertLiteratureSource({ id: 'source_001', literatureId: 'lit_001', provider: 'arxiv',
    sourceItemId: source.id, sourceUrl: source.url, rawPayload: { abstract: source.abstract }, fetchedAt: '2026-09-09T00:00:00.000Z' });
  await ctx.literature.upsertAbstractProfile({ id: 'lit_001_abstract', literatureId: 'lit_001', abstractText: source.abstract,
    abstractSource: 'collection_metadata', sourceRef: { ref_type: 'literature_source', source_id: 'source_001', source_url: source.url }, checksum: sha256Text(source.abstract), language: 'en',
    confidence: 1, reasonCodes: ['PINNED_ORIGINAL_ABSTRACT'], generated: false,
    createdAt: '2026-09-09T00:00:00.000Z', updatedAt: '2026-09-09T00:00:00.000Z' });
  const limits = { attempts: null, tokens: null, duration_ms: null, attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) };
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY, timeout_ms: limits.attempt_ms }, outputRoot, limits);
  t.after(() => runner.shutdown());
  t.after(() => budget?.close());
  await fs.writeFile(join(directory, `${runId}-manifest.json`), JSON.stringify({ kind: 'upstream', source: source.url,
    source_hash: sha256Text(source.abstract), isolated_search_run_and_coverage_fixture: true, model, limits,
    started_at: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  const profiles = new TopicSelectionModelProfileRegistryService();
  const harness = ctx.buildCliHarness(runner, profiles);
  const extractionInput: TopicSelectionWorkflowHarnessBuildEvidenceMapInput = {
    scenario_id: 'topic-selection.real-e2e.canary.v1', title_card_id: ctx.titleCard.title_card_id,
    workflow_run_id: `${runId}_extraction`, node_attempt_id: `${runId}_extraction`, search_run_handoff: ctx.searchRunHandoff,
    execution_mode: 'codex_cli', run_mode: 'product', policy_version: 'v1', output_schema_version: 'v1',
  };
  try {
    const extracted = await harness.runBuildEvidenceMapScenario(extractionInput);
    await fs.writeFile(join(directory, `${runId}-extraction.json`), JSON.stringify(extracted, null, 2), { mode: 0o600 });
    assert.equal(extracted.node_result.status, 'succeeded', JSON.stringify(extracted.node_result));
    assert.ok(extracted.node_result.warning_codes.includes('ABSTRACT_ONLY_SUPPORT'));
    const count = budget!.snapshot().attempts.length;
    assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(extractionInput), extracted);
    assert.equal(budget!.snapshot().attempts.length, count);
    const mapRef = extracted.node_result.evidence_map_ref!;
    await ctx.evidenceMaps.assessEvidenceStrength({ evidence_map_id: mapRef.ref_id, target_ref: mapRef, purpose: 'need_validation',
      role_bundle: { support_unit_ids: extracted.node_result.evidence_unit_refs.map(ref => ref.ref_id) }, assessment_workflow_version: 'v1', policy_version_id: 'v1' });
    const bundle = await ctx.evidenceMaps.getNeedValidationEvidenceBundle(mapRef.ref_id);
    for (const kind of ['single_agent', 'multi_agent_debate'] as const) {
      await t.test(kind, async () => {
      const id = `${runId}_${kind}`;
      const request = scenarioInput({ title_card_id: ctx.titleCard.title_card_id, workspace_id: null, node_attempt_id: id, workflow_run_id: id,
        topic_scope_ref: ctx.topicSeedRef, evidence_map_ref: mapRef, evidence_strength_ref: bundle.strength_assessment_refs[0]!,
        execution_mode: 'codex_cli', run_mode: 'product', executor_kind: kind, mocked_output: null, persist_admitted_candidates: false,
        persistence_context: null, resource_sample_set_ref: null, candidate_pool_projection_ref: null,
        search_snapshot_refs: [bundle.search_run_ref], resource_snapshot_refs: [bundle.literature_snapshot_ref], expectations: {},
        exploration_payload: { ...explorationPayload(),
          topic_scope: { intent },
          resource_sample_digest: { status: 'not_supplied' },
          search_coverage_digest: { status: 'one_original_abstract', limitations: ['No verified prior-art coverage or challenge evidence.'] },
        },
        arbiter_payload: { ...arbiterPayload(), role_level_summaries: [] },
      });
      const result = await harness.runGenerateNeedCandidateScenario(request);
      await fs.writeFile(join(directory, `${id}.json`), JSON.stringify(result, null, 2), { mode: 0o600 });
      assert.equal(result.adapter_result.invocation_result.status, 'succeeded', JSON.stringify(result.adapter_result));
      const adapter = result.adapter_result;
      assert.equal(adapter.minimum_schema_validation_report?.valid, true, JSON.stringify(adapter.minimum_schema_validation_report));
      assert.ok(adapter.candidate_draft_admission_report);
      for (const result of adapter.candidate_draft_admission_report.draft_results) {
        assert.ok(!result.reason_codes.some(code => code === 'UNRESOLVED_CANDIDATE_DRAFT_REFS' || code.startsWith('ROLE_BUNDLE_')), JSON.stringify(result));
      }
      const routing = adapter.supplemental_round_routing_decision?.routing_decision;
      const ranked = adapter.ranked_candidate_draft_batch!;
      const { TopicSelectionRankedCandidateDraftBatchValidatorService } = await import('./topic-selection-ranked-candidate-draft-batch-validator-service.js');
      const allowedRefs: TopicSelectionFunctionalRef[] = [];
      const collectRefs = (value: unknown): void => {
        if (Array.isArray(value)) { value.forEach(collectRefs); return; }
        if (!value || typeof value !== 'object') return;
        const record = value as Record<string, unknown>;
        if (typeof record.ref_type === 'string' && typeof record.ref_id === 'string') allowedRefs.push(record as unknown as TopicSelectionFunctionalRef);
        else Object.values(record).forEach(collectRefs);
      };
      collectRefs(bundle);
      collectRefs(result.node_input);
      collectRefs(adapter.debate_result?.role_level_summary_artifacts.map(artifact => artifact.artifact_ref));
      collectRefs(adapter.debate_result?.issue_frame_artifact?.artifact_ref);
      if (adapter.arbiter_context_packet.context_family === 'arbiter_context') collectRefs(adapter.arbiter_context_packet.payload.evidence_ref_table);
      assert.equal(new TopicSelectionRankedCandidateDraftBatchValidatorService().validate({ node_input: result.node_input,
        ranked_candidate_draft_batch: ranked, allowed_refs: allowedRefs }).valid, true, JSON.stringify(ranked));
      assert.ok(['finalize_with_admitted_batch', 'expand_evidence', 'stop_without_candidate', 'reframe_scope', 'require_human_review'].includes(routing ?? '')
        || (routing === 'block' && ranked.draft_batch.terminal_result === 'blocked' && ranked.drafts.length === 0), JSON.stringify(adapter));
      for (const draft of ranked.drafts) {
        for (const [role, refs] of Object.entries(draft.evidence_role_bundle)) {
          const allowed = role === 'support_unit_refs' ? bundle.support_units : role === 'challenge_unit_refs' ? bundle.challenge_units
            : role === 'baseline_unit_refs' ? bundle.baseline_units : bundle.context_units;
          for (const ref of refs) assert.ok(allowed.some(unit => ref.ref_type === 'evidence_unit' && ref.ref_id === unit.evidence_unit_id
            && ref.title_card_id === unit.title_card_id && ref.version_id === unit.evidence_map_version), JSON.stringify(ref));
        }
        for (const ref of draft.strength_assessment_refs) assert.ok(bundle.strength_assessment_refs.some(allowed =>
          ref.ref_type === allowed.ref_type && ref.ref_id === allowed.ref_id && ref.title_card_id === allowed.title_card_id
          && (ref.version_id ?? null) === (allowed.version_id ?? null)), JSON.stringify(ref));
      }
      if (routing === 'finalize_with_admitted_batch') {
        assert.equal(adapter.status, 'succeeded');
        assert.ok(adapter.candidate_draft_admission_report.valid_draft_count > 0);
        assert.deepEqual(adapter.candidate_draft_admission_report.blocking_reason_codes, []);
      }
      if (kind === 'multi_agent_debate') {
        const debate = adapter.debate_result!;
        assert.equal(debate.status, 'succeeded');
        assert.equal(debate.role_invocation_results.length, 4); // Two Explorers, one Critic and issue framing; final is separate.
        assert.ok(debate.issue_frame_artifact && debate.final_synthesis_artifact);
        assert.equal(debate.role_level_summary_artifacts.length, 2);
        for (const invocation of [...debate.role_invocation_results, debate.final_invocation_result]) {
          assert.equal(invocation.status, 'succeeded');
          assert.equal(invocation.provenance.source_kind, 'codex_cli_response');
          assert.ok(invocation.audit_artifact_ref);
        }
      }
      assert.equal(ctx.llmGateway.calls.length, 0);
      const attempts = budget!.snapshot().attempts.length;
      assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runGenerateNeedCandidateScenario(request), result);
      assert.equal(budget!.snapshot().attempts.length, attempts);
      assert.equal(result.adapter_result.persist_need_candidate_batch_result, null);
      });
    }
  } finally {
    for (const id of [`${runId}_extraction`, `${runId}_single_agent`, `${runId}_multi_agent_debate`]) {
      await fs.writeFile(join(directory, `${id}-artifacts.json`), JSON.stringify(await ctx.controlPlane.listArtifactRefsByWorkflowRunId(id), null, 2), { mode: 0o600 });
    }
  }
});

function useJsonArtifactStorage(ctx: Pick<ValidateNeedAdjudicationSeed, 'controlPlaneRepository'>) {
  const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
  ctx.controlPlaneRepository.createArtifactRef = record => create(JSON.parse(JSON.stringify(record)));
}

test('checkpoint-bound source extraction enforces evidence review and substantive candidate alternatives', async t => {
  const sources = [{ title: 'Controlled QA study', url: 'https://example.test/qa', text: 'Middle-position answers fail. The baseline uses edge positions. The finding is limited to tested models.' },
    { title: 'Controlled retrieval study', url: 'https://example.test/retrieval', text: 'Cross-domain retrieval degrades. A separate source paragraph.', paragraphs: ['Cross-domain retrieval degrades.', 'A separate source paragraph.'] }];
  const ctx = await seedNeedValidationSearchRuntime({ sources, productCheckpoints: true });
  const title = ctx.titleCard.title_card_id;
  const handoff = ctx.searchRunResult.node_result.downstream_handoff!;
  assert.equal(handoff.evidence_map_input_refs.filter(ref => ref.ref_type === 'fulltext_paragraph').length, 3);
  const home = await fs.mkdtemp(join(tmpdir(), 'checkpoint-cli-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const draft = evidenceMapExtractionDraft({ title_card_id: title, handoff, literature_ref: ctx.literatureRef,
    source_ref: ctx.sourceRef, coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(handoff) }, { producer_kind: 'codex_cli' });
  draft.draft_units = (['support', 'baseline', 'challenge'] as const).map((role, index) => ({ ...draft.draft_units[0]!,
    client_unit_key: role, evidence_role: role, coverage_row_intent_ref: ctx.coverageRowIntentRefs[index]!,
    locator: { locator_type: 'paragraph', locator_ref: ctx.manualLocatorRef, paragraph_ref: ctx.manualLocatorRef,
      literature_ref: ctx.literatureRef, source_ref: ctx.sourceRef }, source_statement: sources[0]!.text.split('. ')[index]!.replace(/\.$/, '') + '.',
  }));
  const alternativeRef = ctx.literatureSnapshot.literature_refs[1]!;
  const alternativeSourceRef = ctx.literatureSnapshot.content_source_refs[1]!;
  const alternativeParagraphRef = refForTitleCard('fulltext_paragraph', 'paragraph_002', title);
  draft.draft_units.push({ ...draft.draft_units[0]!, client_unit_key: 'retrieval_support', literature_ref: alternativeRef,
    source_refs: [alternativeSourceRef], source_statement: sources[1]!.paragraphs![0]!,
    locator: { locator_type: 'paragraph', locator_ref: alternativeParagraphRef, paragraph_ref: alternativeParagraphRef,
      literature_ref: alternativeRef, source_ref: alternativeSourceRef } });
  draft.draft_links = [{ source_unit_key: 'support', target_unit_key: 'challenge', link_type: 'refines', rationale: 'The limitation bounds the reported position failure.' }];
  let calls = 0;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async args => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'checkpoint-test-thread' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(draft) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const profiles = new TopicSelectionModelProfileRegistryService();
  const extracted = await ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario({ scenario_id: 'topic-selection.real-e2e.canary.v1',
    title_card_id: title, workflow_run_id: 'checkpoint-extraction', node_attempt_id: 'checkpoint-extraction', search_run_handoff: handoff,
    execution_mode: 'codex_cli', run_mode: 'product', policy_version: 'v1', output_schema_version: 'v1' });
  assert.equal(extracted.node_result.status, 'succeeded', JSON.stringify(extracted.node_result));
  assert.equal(calls, 1);
  const mapRef = extracted.node_result.evidence_map_ref!;
  await ctx.evidenceMaps.assessEvidenceStrength({ evidence_map_id: mapRef.ref_id, target_ref: mapRef, purpose: 'need_validation',
    role_bundle: { support_unit_ids: extracted.node_result.evidence_map_records!.evidence_units.filter(unit => unit.evidence_role === 'support').map(unit => unit.evidence_unit_id) }, assessment_workflow_version: 'v1', policy_version_id: 'v1' });
  const bundle = await ctx.evidenceMaps.getNeedValidationEvidenceBundle(mapRef.ref_id);
  const compiler = new TopicSelectionV1aCodexContextService({ literature: ctx.literature, searchResources: ctx.searchResources,
    evidenceMaps: ctx.evidenceMaps, researchEvidence: new TopicSelectionResearchEvidencePacketService({ literatureRepository: ctx.literature,
      evidenceMapRepository: ctx.evidenceRepository, directEvidenceReadinessResolver: async ids => new Map(ids.map(id => [id,
        { ready: true, reason: 'EVIDENCE_READY' as const, freshness: 'fresh' as const, freshness_detail: null }])) }) });
  const discoveryInput = scenarioInput({
      title_card_id: title, topic_scope_ref: ctx.topicSeedRef, evidence_map_ref: mapRef, evidence_strength_ref: bundle.strength_assessment_refs[0]!,
      search_snapshot_refs: [bundle.search_run_ref], resource_snapshot_refs: [bundle.literature_snapshot_ref], persist_admitted_candidates: false,
    });
  const compiled = await compiler.discovery(discoveryInput);
  assert.equal(JSON.stringify(compiled).split(sources[0]!.text).length - 1, 1, 'The single agent receives each original excerpt once across its two context packets.');
  const debate = await compiler.discovery({ ...discoveryInput, executor_kind: 'multi_agent_debate' });
  for (const payload of [debate.exploration_payload, debate.arbiter_payload]) {
    const serialized = JSON.stringify(payload);
    assert.equal(serialized.split(sources[0]!.text).length - 1, 1, 'Repeated evidence units share one intact original excerpt in each role context.');
    assert.ok(serialized.includes('The finding is limited to tested models.'));
    assert.ok(serialized.includes('Cross-domain retrieval degrades.'));
  }

  const input = { title_card_id: title, evidence_map_id: mapRef.ref_id, candidate_need: 'Reliable QA', unmet_need_statement: 'Source-tested QA fails in the middle.',
    mechanism_type: 'method_gap' as const, scope_notes: 'Controlled source-tested models only.', prior_art_status: 'unknown' as const, mechanism_payload: {} };
  await assert.rejects(ctx.needService.createNeedCandidateFromEvidenceMap(input), /has not advanced/);
  assert.deepEqual(await ctx.needValidationRepository.listNeedCandidatesByTitleCardId(title), []);
  const checkpoint = await ctx.checkpointRepository.findCurrentCheckpoint(title, 'evidence_landscape');
  assert.ok(checkpoint);
  assert.ok(checkpoint.allowed_actions.includes('advance'));
  await ctx.checkpoints.recordDecision(checkpoint.research_checkpoint_id, { decision_key: 'controlled-evidence-review', decision: 'advance',
    actor: { actor_type: 'human', actor_id: 'controlled_fixture' }, confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
    rationale: 'Controlled Human reviewed the exact source and its limitation.', review_payload: { review_kind: 'evidence_landscape',
      nearest_work_reviewed: true, disconfirming_evidence_reviewed: true, source_quality_reviewed: true, limitations: ['Synthetic source fixture.'] } });
  const first = await ctx.needService.createNeedCandidateFromEvidenceMap(input);
  await ctx.needService.createNeedCandidateFromEvidenceMap({ ...input, candidate_need: 'Reliable QA reworded', unmet_need_statement: 'The same source-tested position failure.' });
  const duplicateCheckpoint = await ctx.checkpointRepository.findCurrentCheckpoint(title, 'gap_selection');
  assert.ok(duplicateCheckpoint);
  assert.equal(duplicateCheckpoint.allowed_actions.includes('advance'), false, 'Two empty mechanism payloads cannot establish distinct alternatives.');
  await ctx.needService.createNeedCandidateFromEvidenceMap({ ...input, candidate_need: 'Reliable cross-domain retrieval',
    unmet_need_statement: 'Source-tested cross-domain retrieval degrades.', mechanism_payload: { research_object: 'retrieval', comparison: 'across domains', outcome: 'relevance' } });
  const gap = await ctx.checkpointRepository.findCurrentCheckpoint(title, 'gap_selection');
  assert.ok(gap);
  assert.ok(gap.allowed_actions.includes('advance'));
  assert.notEqual(gap.target_snapshot_hash, duplicateCheckpoint.target_snapshot_hash);
  await assert.rejects(ctx.checkpoints.assertGapSelectionConfirmation({ title_card_id: title, selected_candidate: first, review: {
    research_checkpoint_id: duplicateCheckpoint.research_checkpoint_id, confirmed_candidate_pool_hash: duplicateCheckpoint.target_snapshot_hash,
    selected_candidate_ref: refForTitleCard('need_candidate', first.need_candidate_id, title, first.candidate_version),
    direct_prior_art_pressure_reviewed: true, disconfirming_evidence_reviewed: true, candidate_reviews: [],
  } }), /current|superseded|stale/);
});

test('Codex discovery qualification persists its actual candidate through frozen v1b lineage', {
  skip: process.env.TOPIC_SELECTION_CODEX_LINEAGE_QUALIFICATION !== 'live',
}, async t => {
  const { qualificationRunner } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_FULLTEXT;
  const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  if (!sourceFile || !outputRoot || !model || !home || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit live lineage qualification configuration is required.');
  const selectedCase = process.env.TOPIC_SELECTION_QUALIFICATION_CASE ?? 'bounded_capability';
  assert.ok(['bounded_capability', 'evaluation_overlap', 'extracted_capability', 'checkpoint_comparison', 'checkpoint_debate'].includes(selectedCase));
  const source = JSON.parse(await fs.readFile(sourceFile, 'utf8')) as { url: string; text: string };
  assert.equal(source.url, 'https://arxiv.org/html/2307.03172v3#S2.SS3');
  assert.equal(sha256Text(source.text), '137142ef95c94e507f94143696032678652f761aa8fa2fdcaa1493d2d9285e21');
  const productCheckpoints = selectedCase.startsWith('checkpoint_');
  const useExtraction = selectedCase === 'extracted_capability' || productCheckpoints;
  const sources: OriginalSourceFixture[] = [{ ...source, title: 'Lost in the Middle: How Language Models Use Long Contexts' }];
  if (productCheckpoints) {
    const alternativeFile = process.env.TOPIC_SELECTION_QUALIFICATION_ALTERNATIVE_FULLTEXT;
    assert.ok(alternativeFile, 'Comparative qualification requires a pinned independent original source.');
    const alternative = JSON.parse(await fs.readFile(alternativeFile, 'utf8')) as OriginalSourceFixture;
    assert.equal(alternative.url, 'https://arxiv.org/html/2104.08663v4#S5');
    assert.equal(sha256Text(alternative.text), '9857965c203b4935ec628a8ff203f3fe6666580d12d12f63607ca618c31b7070');
    assert.ok(alternative.paragraphs?.length, 'The comparative fixture must preserve original paragraph boundaries.');
    assert.ok([
      '2024b3b422976030b018733e711bff634697eb3eb6e3828b3b2e62a69defff72', // complete S5/S6 prose selection
      '9d80cb9b51e5c5dba197970aa95c551881edc2cee2518dd7ee66372a122d9647', // focused comparison, costs and annotation-bias selection
      '4e78146c033b185700e9afcafd43d6d207d6861e1f13530e9709c7aeaac17f7f', // same focused selection plus the explicit BM25 baseline paragraph
    ].includes(sha256Text(JSON.stringify(alternative.paragraphs))));
    sources.push(alternative);
  }
  const seed = await seedNeedValidationSearchRuntime({ originalFulltext: source.text, productCheckpoints,
    sources: productCheckpoints ? sources : undefined });
  useJsonArtifactStorage(seed);
  const title = seed.titleCard.title_card_id;
  assert.deepEqual(await seed.needValidationRepository.listNeedCandidatesByTitleCardId(title), []);
  if (!productCheckpoints) await seed.literature.upsertLiteratureSource({ id: 'source_001', literatureId: 'lit_001', provider: 'arxiv', sourceItemId: '2307.03172v3',
    sourceUrl: source.url, rawPayload: { source_hash: sha256Text(source.text) }, fetchedAt: '2026-09-10T00:00:00.000Z' });
  const limits = { attempts: null, tokens: null, duration_ms: null, attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) };
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY, timeout_ms: limits.attempt_ms }, outputRoot, limits);
  t.after(() => runner.shutdown());
  t.after(() => budget?.close());
  const save = async (name: string, value: unknown) => fs.writeFile(join(directory, `${runId}-${name}.json`), JSON.stringify(value, null, 2), { mode: 0o600 });
  await fs.writeFile(join(directory, `${runId}-manifest.json`), JSON.stringify({ kind: 'discovery-to-v1b', source: source.url,
    source_hash: sha256Text(source.text), controlled_search: true, evidence_roles: useExtraction ? 'model_extracted' : 'controlled', source_count: sources.length, sources: sources.map(source => ({ url: source.url, hash: sha256Text(source.text), selected_paragraph_count: source.paragraphs?.length ?? 1, selected_paragraphs_hash: sha256Text(JSON.stringify(source.paragraphs ?? [source.text])) })),
    selected_case: selectedCase, controlled_human_research_preference: productCheckpoints ? 'historical retrieval capability in lit_002' : 'model-preferred candidate', candidate_is_model_generated: true, controlled_human_input: true, actual_human_decision: false,
    app_checkpoint_guard_not_exercised: !productCheckpoints, repositories: 'in-memory with JSON artifact storage', model, limits,
    started_at: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  const profiles = new TopicSelectionModelProfileRegistryService();
  const harness = seed.buildCliHarness(runner, profiles);
  const id = (stage: string) => `${runId}_${stage}`;
  try {
    let evidence: Awaited<ReturnType<typeof createControlledNeedEvidenceMap>>;
    if (useExtraction) {
      const extractionInput: TopicSelectionWorkflowHarnessBuildEvidenceMapInput = {
        scenario_id: 'topic-selection.real-e2e.canary.v1', title_card_id: title,
        workflow_run_id: id('extraction'), node_attempt_id: id('extraction'),
        search_run_handoff: seed.searchRunResult.node_result.downstream_handoff!,
        execution_mode: 'codex_cli', run_mode: 'product', policy_version: 'v1', output_schema_version: 'v1',
      };
      const extracted = await harness.runBuildEvidenceMapScenario(extractionInput);
      await save('extraction', extracted);
      assert.equal(extracted.node_result.status, 'succeeded', JSON.stringify(extracted.node_result));
      const extractionAttempts = budget!.snapshot().attempts.length;
      assert.deepEqual(await seed.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(extractionInput), extracted);
      assert.equal(budget!.snapshot().attempts.length, extractionAttempts);
      const evidenceMap = await seed.evidenceRepository.findEvidenceMapById(extracted.node_result.evidence_map_ref!.ref_id);
      assert.ok(evidenceMap);
      const evidenceUnits = await seed.evidenceRepository.listEvidenceUnitsByEvidenceMapId(evidenceMap.evidence_map_id);
      evidence = { evidenceMap, evidenceUnits };
    } else {
      evidence = await createControlledNeedEvidenceMap(seed, { originalFulltext: source.text });
    }
  const mapRef = refForTitleCard('evidence_map', evidence.evidenceMap.evidence_map_id, title, evidence.evidenceMap.evidence_map_version);
  await seed.evidenceMaps.assessEvidenceStrength({ evidence_map_id: mapRef.ref_id, target_ref: mapRef, purpose: 'need_validation',
    role_bundle: {
      support_unit_ids: evidence.evidenceUnits.filter(unit => unit.evidence_role === 'support').map(unit => unit.evidence_unit_id),
      challenge_unit_ids: evidence.evidenceUnits.filter(unit => unit.evidence_role === 'challenge').map(unit => unit.evidence_unit_id),
      baseline_unit_ids: evidence.evidenceUnits.filter(unit => unit.evidence_role === 'baseline').map(unit => unit.evidence_unit_id),
      context_unit_ids: evidence.evidenceUnits.filter(unit => unit.evidence_role === 'context').map(unit => unit.evidence_unit_id),
    }, assessment_workflow_version: 'v1', policy_version_id: 'v1' });
  const bundle = await seed.evidenceMaps.getNeedValidationEvidenceBundle(mapRef.ref_id);
    await save('evidence', { search_run: seed.searchRunResult, evidence_map: evidence.evidenceMap, evidence_units: evidence.evidenceUnits, bundle });
    if (productCheckpoints) {
      const checkpoint = await seed.checkpointRepository.findCurrentCheckpoint(title, 'evidence_landscape');
      assert.ok(checkpoint);
      const packet = await seed.checkpoints.getPacket(checkpoint.research_checkpoint_id);
      await save('evidence-checkpoint', { checkpoint, packet });
      assert.ok(checkpoint.allowed_actions.includes('advance'), JSON.stringify(packet.packet_payload));
      const decision = { decision_key: id('evidence_review'), decision: 'advance' as const,
        actor: { actor_type: 'human' as const, actor_id: 'controlled_comparison_fixture' }, confirmed_snapshot_hash: checkpoint.target_snapshot_hash,
        rationale: 'Controlled Human fixture reviewed original source findings, their baselines and scope limitations. Historical studies establish bounded capability observations, not current-model failure or solution novelty.',
        review_payload: { review_kind: 'evidence_landscape' as const, nearest_work_reviewed: true,
          disconfirming_evidence_reviewed: true, source_quality_reviewed: true,
          limitations: ['Controlled retrieval and parser; incomplete broader prior art, no verification of current models or proposed repairs.'] } };
      await save('evidence-human-input', decision);
      await save('evidence-decision', await seed.checkpoints.recordDecision(checkpoint.research_checkpoint_id, decision));
    }
    const request = scenarioInput({ title_card_id: title, workspace_id: null, input_snapshot_id: evidence.evidenceMap.input_snapshot_id,
      workflow_run_id: id('discovery'), node_attempt_id: id('discovery'), topic_scope_ref: seed.topicSeedRef,
      evidence_map_ref: mapRef, evidence_strength_ref: bundle.strength_assessment_refs[0]!,
      execution_mode: 'codex_cli', run_mode: 'product', executor_kind: selectedCase === 'checkpoint_debate' ? 'multi_agent_debate' : 'single_agent', mocked_output: null,
      resource_sample_set_ref: null, candidate_pool_projection_ref: null,
      search_snapshot_refs: [bundle.search_run_ref], resource_snapshot_refs: [bundle.literature_snapshot_ref],
      persist_admitted_candidates: true, persistence_context: { search_run_ref: bundle.search_run_ref,
        search_plan_ref: bundle.search_plan_ref, literature_snapshot_ref: bundle.literature_snapshot_ref }, expectations: {},
      exploration_payload: { ...explorationPayload(), topic_scope: {
        intent: productCheckpoints
          ? 'Compare bounded unmet capabilities in reliable information retrieval and context use, confined to the historical configurations and conditions actually tested by the supplied studies. Inspect source-tested retrieval robustness across domains and multi-document QA with relevant information in the middle. These are candidate need directions, not claims that a new benchmark is missing or that a proposed repair is novel. Retain substantively distinct viable alternatives when the evidence supports them; the researcher will compare them. Account for BEIR annotation-selection bias when interpreting retrieval scores. Do not force advancement or assert current-model failures.'
          : selectedCase === 'evaluation_overlap'
          ? 'Discover a bounded need for position-sensitive evaluation before selecting long-context QA configurations. The source documents failures to use relevant middle-position information. Inspect whether that supports a need; do not claim a novel repair or force advancement.'
          : 'Discover a bounded unmet capability in reliable multi-document question answering when the answer-bearing document is in the middle of context, confined to the model configurations and conditions actually tested in this source. Distinguish the documented capability failure from the already-published evaluation method. A candidate research need is not a claim to a novel solution, nor evidence that current models still fail. Do not force advancement if the supplied findings do not support this need.',
        evidence_boundary: productCheckpoints
          ? 'Two original studies, with model-extracted units; each source retains its own model, task, metric and annotation boundaries. Multiple units from one paper are not independent corroboration. No comprehensive current prior-art search, data-access verification or repair validation is claimed.'
          : useExtraction
          ? 'Evidence units were extracted by the model from one original results section. Multiple units are not independent sources. Broader prior art, current model behavior, dataset access and repair efficacy are unverified.'
          : 'One original results section reused in four controlled role slots. These are not independent sources. Broader prior art, current model behavior, dataset access and efficacy of any repair are unverified.',
      }, resource_sample_digest: { status: 'not_supplied' }, search_coverage_digest: { status: productCheckpoints ? 'two_original_studies' : 'one_original_results_section',
        limitations: [useExtraction ? 'Controlled retrieval; no independent prior-art coverage.' : 'Controlled retrieval and role assignments; no independent prior-art coverage.'] } },
      arbiter_payload: { ...arbiterPayload(), ...(productCheckpoints ? { max_persisted_candidates: 2 } : {}), role_level_summaries: [] },
    });
    const discovered = await harness.runGenerateNeedCandidateScenario(request);
    await save('discovery', discovered);
    assert.equal(discovered.adapter_result.invocation_result.status, 'succeeded', JSON.stringify({ blocker_codes: discovered.adapter_result.blocker_codes, error_code: discovered.adapter_result.error_code }));
    const persistence = discovered.adapter_result.persist_need_candidate_batch_result;
    const attemptCount = budget!.snapshot().attempts.length;
    assert.deepEqual(await seed.buildCliHarness(runner, profiles).runGenerateNeedCandidateScenario(request), discovered);
    assert.equal(budget!.snapshot().attempts.length, attemptCount);
    if (selectedCase === 'evaluation_overlap') {
      assert.equal(discovered.adapter_result.supplemental_round_routing_decision?.routing_decision, 'expand_evidence');
      assert.equal(persistence, null);
      assert.deepEqual(await seed.needValidationRepository.listNeedCandidatesByTitleCardId(title), []);
      return;
    }
    assert.ok(persistence?.persisted_candidates.length, JSON.stringify({ routing: discovered.adapter_result.supplemental_round_routing_decision, batch: discovered.adapter_result.ranked_candidate_draft_batch }));
    if (productCheckpoints) assert.ok(persistence.persisted_candidates.length >= 2, 'Product gap review requires two genuinely distinct viable candidates.');
    else assert.equal(persistence.persisted_candidates.length, 1);
    const batch = discovered.adapter_result.ranked_candidate_draft_batch!;
    const selectedDraftId = batch.portfolio_disposition?.candidate_dispositions.find(item => item.disposition === 'selected')?.candidate_key;
    const retrievalSupport = new Set(evidence.evidenceUnits.filter(unit => unit.evidence_role === 'support'
      && unit.literature_ref.ref_id === 'lit_002').map(unit => unit.evidence_unit_id));
    const preferredDrafts = batch.drafts.filter(draft => draft.evidence_role_bundle.support_unit_refs.some(ref => retrievalSupport.has(ref.ref_id)));
    if (productCheckpoints) assert.equal(preferredDrafts.length, 1, 'The fixed Human retrieval preference requires one unambiguous actual candidate.');
    const draft = productCheckpoints ? preferredDrafts[0]!
      : batch.drafts.find(draft => draft.draft_id === selectedDraftId) ?? batch.drafts[0]!;
    const candidate = persistence.persisted_candidates.find(candidate => candidate.candidate_need === draft.candidate_need)!;
    assert.ok(candidate);
    await save('candidate-selection', { controlled_human_input: true, actual_human_decision: false,
      preference: productCheckpoints ? 'historical retrieval capability in lit_002' : 'model-preferred candidate',
      model_preferred_draft_id: selectedDraftId, selected_draft_id: draft.draft_id, selected_candidate: candidate });
    assert.equal(candidate.candidate_need, draft.candidate_need);
    assert.equal(candidate.unmet_need_statement, draft.unmet_need_statement);
    assert.deepEqual(candidate.evidence_role_bundle, draft.evidence_role_bundle);
    assert.deepEqual(candidate.evidence_map_ref, mapRef);
    assert.equal((await seed.needValidationRepository.listNeedCandidatesByTitleCardId(title)).length, persistence.persisted_candidates.length);
    const readiness = await seed.needService.assessCandidateReadiness({ need_candidate_id: candidate.need_candidate_id, assessed_by: 'system' });
    await save('readiness', readiness);
    assert.equal(readiness.recommendation, 'ready_for_validation', JSON.stringify(readiness));
    const supportPacket = await seed.needService.createValidationDecisionSupportPacket({ need_candidate_id: candidate.need_candidate_id,
      readiness_assessment_id: readiness.readiness_assessment_id, created_by: 'system' });
    const ctx = { ...seed, ...evidence, candidate, readiness, supportPacket };
    await save('support-packet', supportPacket);
    const adjudicationInput = validateNeedAdjudicationScenarioInput(ctx, null, { execution_mode: 'codex_cli', run_mode: 'product',
      mocked_output: null, workflow_run_id: id('adjudication'), node_attempt_id: id('adjudication'), expectations: {} });
    const adjudicated = await harness.runValidateNeedAdjudicationScenario(adjudicationInput);
    await save('adjudication', adjudicated);
    assert.equal(adjudicated.node_result.final_decision, 'validate', JSON.stringify(adjudicated.node_result));
    assert.ok(adjudicated.node_result.adjudication_result_ref);
    const afterAdjudication = budget!.snapshot().attempts.length;
    assert.deepEqual(await seed.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(adjudicationInput), adjudicated);
    assert.equal(budget!.snapshot().attempts.length, afterAdjudication);
    // An explicit controlled Human input follows actual N7 output. No model may author this decision.
    const confirmation = humanConfirmationInput(ctx, { accountable_human_ref: { actor_type: 'human', actor_id: 'controlled_lineage_fixture' },
      rationale: `Controlled Human fixture: I accept the exact candidate and validate adjudication at the stated evidence boundary. Checks reviewed: ${supportPacket.required_human_checks.join(', ')}. I accept exactly the listed residual risks, including single-source coverage and unverified novelty, data access and repair efficacy. This is not an actual research approval.` });
    if (productCheckpoints) {
      const checkpoint = await seed.checkpointRepository.findCurrentCheckpoint(title, 'gap_selection');
      assert.ok(checkpoint);
      await save('gap-checkpoint', { checkpoint, packet: await seed.checkpoints.getPacket(checkpoint.research_checkpoint_id) });
      assert.ok(checkpoint.allowed_actions.includes('advance'));
      confirmation.gap_selection_review = {
        research_checkpoint_id: checkpoint.research_checkpoint_id, confirmed_candidate_pool_hash: checkpoint.target_snapshot_hash,
        selected_candidate_ref: refForTitleCard('need_candidate', candidate.need_candidate_id, title, candidate.candidate_version),
        direct_prior_art_pressure_reviewed: true, disconfirming_evidence_reviewed: true,
        candidate_reviews: persistence.persisted_candidates.map(item => ({
          need_candidate_ref: refForTitleCard('need_candidate', item.need_candidate_id, title, item.candidate_version),
          disposition: item.need_candidate_id === candidate.need_candidate_id ? 'selected' : 'viable_alternative',
          distinct_from_selected_axes: item.need_candidate_id === candidate.need_candidate_id ? [] : ['research_object', 'comparison', 'outcome'],
          rationale: 'Controlled Human comparison fixture: source-tested retrieval ranking across domains and QA answer generation under context-position changes target different research objects, comparisons and outcomes. Preference is limited to this fixture; neither study proves current-model failure or a novel solution.',
          rejection_reason: null,
        })),
      };
      await assert.rejects(seed.checkpoints.assertGapSelectionConfirmation({ title_card_id: title, selected_candidate: candidate,
        review: { ...confirmation.gap_selection_review, confirmed_candidate_pool_hash: '0'.repeat(64) } }), /stale/);
      await assert.rejects(seed.checkpoints.assertGapSelectionConfirmation({ title_card_id: title, selected_candidate: candidate,
        review: { ...confirmation.gap_selection_review, candidate_reviews: confirmation.gap_selection_review.candidate_reviews.filter(review => review.disposition === 'selected') } }), /every candidate/);
    }
    const confirmationInput = humanConfirmNeedScenarioInput(ctx, adjudicated, { execution_mode: 'codex_cli', run_mode: 'product',
      workflow_run_id: id('confirmation'), node_attempt_id: id('confirmation'), confirmation_input: confirmation, expectations: {} });
    await save('human-input', confirmationInput);
    const confirmed = await harness.runHumanConfirmNeedScenario(confirmationInput);
    await save('confirmation', confirmed);
    assert.equal(confirmed.node_result.status, 'ready', JSON.stringify(confirmed.node_result));
    if (productCheckpoints) {
      const checkpoint = await seed.checkpoints.assertTransitionAllowed({ title_card_id: title, checkpoint_kind: 'gap_selection' });
      assert.equal(checkpoint.decision_authority_ref?.ref_type, 'human_confirmed_decision');
      await save('gap-decision', checkpoint);
    }
    const afterConfirmation = budget!.snapshot().attempts.length;
    assert.deepEqual(await seed.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario(confirmationInput), confirmed);
    assert.equal(budget!.snapshot().attempts.length, afterConfirmation);
    const publishInput = await publishV1bInputBundleScenarioInput(ctx, confirmed, {
      workflow_run_id: id('publish'), node_attempt_id: id('publish'), expectations: {} });
    const published = await harness.runPublishV1bInputBundleScenario(publishInput);
    await save('published', published);
    assert.equal(published.node_result.status, 'ready', JSON.stringify(published.node_result));
    const replay = await seed.buildCliHarness(runner, profiles).runPublishV1bInputBundleScenario(publishInput);
    assert.equal(replay.node_result.v1b_input_bundle_ref?.ref_id, published.node_result.v1b_input_bundle_ref?.ref_id);
    const frozen = await seed.needValidationRepository.listV1aToV1bInputBundlesByValidatedNeedId(confirmed.node_result.validated_need_ref!.ref_id);
    await save('frozen-bundles', frozen);
    assert.equal(frozen.length, 1);
    assert.equal(frozen[0]!.source_need_candidate_ref.ref_id, candidate.need_candidate_id);
    assert.deepEqual(frozen[0]!.evidence_map_ref, mapRef);
    assert.deepEqual(frozen[0]!.evidence_role_bundle, candidate.evidence_role_bundle);
    assert.equal(budget!.snapshot().attempts.length, afterConfirmation);
    assert.equal(seed.llmGateway.calls.length, 0);
  } finally {
    for (const stage of ['extraction', 'discovery', 'adjudication', 'confirmation', 'publish']) {
      const artifacts = await seed.controlPlaneRepository.listArtifactRefsByWorkflowRunId(id(stage));
      await save(`${stage}-artifacts`, artifacts);
      for (const artifact of artifacts) if (artifact.payload && artifact.checksum) {
        assert.equal(sha256Text(stableStringify(artifact.payload)), artifact.checksum, `Persisted artifact ${artifact.stable_key} checksum`);
      }
    }
    await save('candidates', await seed.needValidationRepository.listNeedCandidatesByTitleCardId(title));
  }
});

test('Codex validation qualification adjudicates original fulltext and reviews fixed Human inputs', {
  skip: process.env.TOPIC_SELECTION_CODEX_VALIDATION_QUALIFICATION !== 'live',
}, async t => {
  const { qualificationRunner } = await import('./test-fixtures/topic-selection-codex-qualification-runner.js');
  const sourceFile = process.env.TOPIC_SELECTION_QUALIFICATION_FULLTEXT;
  const outputRoot = process.env.TOPIC_SELECTION_QUALIFICATION_OUTPUT;
  const model = process.env.TOPIC_SELECTION_CODEX_MODEL;
  const home = process.env.TOPIC_SELECTION_CODEX_HOME;
  const runId = process.env.TOPIC_SELECTION_QUALIFICATION_RUN_ID;
  const selectedCase = process.env.TOPIC_SELECTION_QUALIFICATION_CASE ?? 'all';
  assert.ok(['all', 'bounded', 'overclaim', 'human-complete', 'human-incomplete'].includes(selectedCase));
  if (!sourceFile || !outputRoot || !model || !home || !runId || !/^[a-zA-Z0-9_-]{1,40}$/.test(runId)
    || process.env.TOPIC_SELECTION_QUALIFICATION_UNCAPPED !== '1') throw new Error('Explicit live validation qualification configuration is required.');
  const source = JSON.parse(await fs.readFile(sourceFile, 'utf8')) as { url: string; text: string; hash: string };
  assert.equal(source.url, 'https://arxiv.org/html/2307.03172v3#S2.SS3');
  assert.equal(sha256Text(source.text), '137142ef95c94e507f94143696032678652f761aa8fa2fdcaa1493d2d9285e21');
  const limits = { attempts: null, tokens: null, duration_ms: null, attempt_ms: Number(process.env.TOPIC_SELECTION_QUALIFICATION_ATTEMPT_MS) };
  const { runner, budget, directory } = qualificationRunner({ codex_home: home, model, reasoning_effort: 'high',
    transport: 'app_server', binary: process.env.TOPIC_SELECTION_CODEX_BINARY, timeout_ms: limits.attempt_ms }, outputRoot, limits);
  t.after(() => runner.shutdown());
  t.after(() => budget?.close());
  await fs.writeFile(join(directory, `${runId}-manifest.json`), JSON.stringify({ kind: 'need-validation', source: source.url,
    source_hash: sha256Text(source.text), controlled_candidate_readiness_and_evidence_roles: true,
    controlled_human_input: true, actual_human_decision: false, app_checkpoint_guard_not_exercised: true, model, limits,
    selected_case: selectedCase, started_at: new Date().toISOString() }, null, 2), { mode: 0o600, flag: 'wx' });
  const profiles = new TopicSelectionModelProfileRegistryService();
  const contexts: ValidateNeedAdjudicationSeed[] = [];
  const save = async (name: string, value: unknown) => fs.writeFile(join(directory, `${runId}-${name}.json`), JSON.stringify(value, null, 2), { mode: 0o600 });
  try {
    for (const overclaim of [false, true]) {
      const label = overclaim ? 'overclaim' : 'bounded';
      if (selectedCase !== 'all' && selectedCase !== label) continue;
      const ctx = await seedValidateNeedAdjudicationRuntime({ originalFulltext: source.text,
        candidateNeed: overclaim ? 'Fine-tuning eliminates position bias in all long-context models.' : 'Need to evaluate sensitivity to evidence position before selecting long-context QA configurations.',
        unmetNeed: overclaim ? 'The supplied study proves our fine-tuning method solves long-context retrieval.' : 'Advertised context length alone does not demonstrate robust use of relevant middle-position evidence.',
        mechanismSummary: 'The source reports position-dependent QA performance; it does not evaluate a proposed repair.',
        scopeNotes: 'Controlled candidate/readiness fixture. One original results section is reused in four role slots; role assignment is not independent evidence. Novelty, broader prior-art coverage, data access and efficacy of any proposed repair are unverified.' });
      contexts.push(ctx);
      useJsonArtifactStorage(ctx);
      await ctx.literature.upsertLiteratureSource({ id: 'source_001', literatureId: 'lit_001', provider: 'arxiv', sourceItemId: '2307.03172v3',
        sourceUrl: source.url, rawPayload: { source_hash: sha256Text(source.text) }, fetchedAt: '2026-09-10T00:00:00.000Z' });
      const input = validateNeedAdjudicationScenarioInput(ctx, null, { execution_mode: 'codex_cli', run_mode: 'product', mocked_output: null,
        workflow_run_id: `${runId}_${label}`, node_attempt_id: `${runId}_${label}`, expectations: {} });
      const result = await ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(input);
      await save(label, result);
      assert.ok(result.node_result.recommendation_packet_ref, JSON.stringify(result.node_result));
      assert.ok(['ready', 'require_human_review'].includes(result.node_result.status), JSON.stringify(result.node_result));
      if (overclaim) assert.notEqual(result.node_result.final_decision, 'validate', 'Overclaim must not advance to Human confirmation.');
      const count = budget!.snapshot().attempts.length;
      assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(input), result);
      assert.equal(budget!.snapshot().attempts.length, count);
      assert.equal(ctx.llmGateway.calls.length, 0);
    }
    for (const complete of [true, false]) {
      const label = complete ? 'human-complete' : 'human-incomplete';
      if (selectedCase !== 'all' && selectedCase !== label) continue;
      const ctx = await seedValidateNeedAdjudicationRuntime();
      contexts.push(ctx);
      useJsonArtifactStorage(ctx);
      const adjudication = await runValidateNeedForHumanConfirm(ctx);
      const confirmation = humanConfirmationInput(ctx, { rationale: complete
        ? `Controlled Human fixture: I confirm this candidate only at its stated scope. Checks reviewed: ${ctx.supportPacket!.required_human_checks.join(', ')}. I explicitly accept the listed residual risks; no additional empirical success or novelty is claimed.`
        : 'Controlled Human fixture: I have not reviewed or accepted the residual risks; do not confirm the candidate.',
        ...(!complete ? { accepted_risk_refs: [], required_check_results: [] } : {}) });
      const input = humanConfirmNeedScenarioInput(ctx, adjudication, { execution_mode: 'codex_cli', run_mode: 'product',
        workflow_run_id: `${runId}_${label}`, node_attempt_id: `${runId}_${label}`, confirmation_input: confirmation, expectations: {} });
      const result = await ctx.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario(input);
      await save(label, result);
      assert.ok(result.node_result.semantic_review_ref, JSON.stringify(result.node_result));
      if (complete) assert.equal(result.node_result.status, 'ready', JSON.stringify(result.node_result));
      else {
        assert.notEqual(result.node_result.status, 'ready');
        assert.equal(result.node_result.human_decision_ref, null);
      }
      const count = budget!.snapshot().attempts.length;
      assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario(input), result);
      assert.equal(budget!.snapshot().attempts.length, count);
      assert.equal(ctx.llmGateway.calls.length, 0);
    }
  } finally {
    for (const [index, ctx] of contexts.entries()) {
      for (const workflow of [`${runId}_bounded`, `${runId}_overclaim`, `${runId}_human-complete`, `${runId}_human-incomplete`]) {
        const artifacts = await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(workflow);
        if (artifacts.length) {
          await save(`artifacts-${index}`, artifacts);
          for (const artifact of artifacts) {
            if (artifact.payload && artifact.checksum) assert.equal(sha256Text(stableStringify(artifact.payload)), artifact.checksum,
              `Persisted artifact ${artifact.stable_key ?? artifact.artifact_ref_id} must retain its checksum.`);
          }
        }
      }
    }
  }
});

test('product CLI adjudication blocks invented evidence before domain writes', async t => {
  const ctx = await seedValidateNeedAdjudicationRuntime({ originalFulltext: 'Controlled source fixture: risk review is necessary.' });
  const home = await fs.mkdtemp(join(tmpdir(), 'v1a-cli-refs-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const packet = needAdjudicationRecommendationPacket(ctx, {}, { execution_mode: 'codex_cli',
    source_refs: [refForTitleCard('evidence_unit', 'invented', ctx.titleCard.title_card_id)] });
  let calls = 0;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async args => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'ref-test' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(packet) } })].join('\n'),
      stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const input = validateNeedAdjudicationScenarioInput(ctx, packet, { execution_mode: 'codex_cli', run_mode: 'product', mocked_output: null, expectations: {} });
  const result = await ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService()).runValidateNeedAdjudicationScenario(input);
  assert.equal(result.node_result.status, 'blocked', JSON.stringify(result.node_result));
  assert.equal(result.node_result.error_code, 'VERSION_CONFLICT', JSON.stringify(result.node_result));
  assert.equal(result.node_result.adjudication_result_ref, null);
  assert.deepEqual(await ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService()).runValidateNeedAdjudicationScenario(input), result);
  assert.equal(calls, 1);
});

test('product CLI adjudication and Human review replay completed submissions', async t => {
  const original = 'Controlled source fixture: retrieval conflicts require explicit risk review.';
  const ctx = await seedValidateNeedAdjudicationRuntime({ originalFulltext: original });
  useJsonArtifactStorage(ctx);
  assert.ok(ctx.supportPacket, JSON.stringify(ctx.readiness));
  const home = await fs.mkdtemp(join(tmpdir(), 'v1a-cli-adjudication-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const packet = needAdjudicationRecommendationPacket(ctx, {}, { execution_mode: 'codex_cli' });
  let calls = 0;
  let reviewInput: TopicSelectionWorkflowHarnessHumanConfirmNeedInput | null = null;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    let output: unknown = packet;
    if (reviewInput) {
      const context = JSON.parse(options.stdin.split('[user]\n')[1]!) as { output_lineage: Partial<HumanConfirmationSemanticReview> };
      assert.ok(options.stdin.includes(reviewInput.confirmation_input.rationale));
      output = humanConfirmationSemanticReviewOutput(ctx, reviewInput, context.output_lineage);
    } else {
      assert.ok(options.stdin.includes(original), 'Adjudication reads the original evidence, not just its reference.');
      assert.ok(options.stdin.includes('strength_assessments'));
    }
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'adjudication-thread' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const profiles = new TopicSelectionModelProfileRegistryService();
  const input = validateNeedAdjudicationScenarioInput(ctx, packet, { execution_mode: 'codex_cli', run_mode: 'product', mocked_output: null,
    runtime_token_budget_overrides: { estimated_input_tokens_override: 80_000, estimated_input_tokens_after_compression_override: 4_000 } });
  const submissions = await Promise.allSettled([ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(input),
    ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(input)]);
  assert.equal(submissions.filter(result => result.status === 'fulfilled').length, 1);
  const completed = submissions.find(result => result.status === 'fulfilled');
  assert.ok(completed?.status === 'fulfilled');
  const result = completed.value;
  assert.equal(result.node_result.status, 'ready', JSON.stringify(result.node_result));
  assert.equal(result.node_result.route_outcome, 'advance_to_human_confirmation');
  assert.equal(result.node_result.final_decision, 'validate');
  assert.ok(result.node_result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'));
  const adjudication = await ctx.needService.getAdjudicationResultById(result.node_result.adjudication_result_ref!.ref_id);
  assert.equal(adjudication?.adjudicated_by.actor_type, 'llm');
  assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario(input), result);
  assert.equal(calls, 1);
  assert.equal(ctx.llmGateway.calls.length, 0);
  await assert.rejects(ctx.buildCliHarness(runner, profiles).runValidateNeedAdjudicationScenario({ ...input, policy_version: 'drift' }), /different input/);
  reviewInput = humanConfirmNeedScenarioInput(ctx, result, { execution_mode: 'codex_cli', run_mode: 'product', expectations: {} });
  const confirmed = await ctx.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario(reviewInput);
  assert.equal(confirmed.node_result.status, 'ready', JSON.stringify(confirmed.node_result));
  assert.deepEqual(confirmed.node_result.required_check_results_snapshot, reviewInput.confirmation_input.required_check_results);
  assert.equal(confirmed.node_result.confirmation_input_hash, sha256Text(stableStringify(reviewInput.confirmation_input)));
  const decision = await ctx.controlPlane.getHumanDecision(confirmed.node_result.human_decision_ref!.ref_id);
  assert.equal(decision?.rationale, reviewInput.confirmation_input.rationale);
  assert.deepEqual(decision?.actor, reviewInput.confirmation_input.accountable_human_ref);
  assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario(reviewInput), confirmed);
  assert.equal(calls, 2);
  for (const artifact of await ctx.controlPlaneRepository.listArtifactRefsByWorkflowRunId(reviewInput.workflow_run_id)) {
    if (artifact.payload && artifact.checksum) assert.equal(sha256Text(stableStringify(artifact.payload)), artifact.checksum,
      `Persisted artifact ${artifact.stable_key ?? artifact.artifact_ref_id} must retain its checksum.`);
  }
  await assert.rejects(ctx.buildCliHarness(runner, profiles).runHumanConfirmNeedScenario({ ...reviewInput,
    confirmation_input: { ...reviewInput.confirmation_input, rationale: 'A different Human decision.' } }), /different input/);
});

test('product CLI validation preserves risk and Human gates and blocks unsafe retries', async t => {
  const home = await fs.mkdtemp(join(tmpdir(), 'v1a-cli-gates-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  for (const failure of ['risk_drop', 'high_risk', 'reference_version', 'unreadable_source'] as const) {
    await t.test(`adjudication ${failure}`, async () => {
      const ctx = await seedValidateNeedAdjudicationRuntime(failure === 'unreadable_source' ? {} : {
        originalFulltext: 'Controlled section fixture: unresolved risk. '.repeat(failure === 'risk_drop' ? 65 : 1) });
      const packet = needAdjudicationRecommendationPacket(ctx, { final_decision: failure === 'high_risk' ? 'reject' : 'validate' }, { execution_mode: 'codex_cli' });
      if (failure === 'risk_drop') packet.residual_risk_refs = [];
      if (failure === 'reference_version') packet.source_refs[0]!.version_id = 'invented-version';
      let calls = 0;
      const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async args => {
        if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
        calls++;
        return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'gates-thread' }),
          JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(packet) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
      });
      t.after(() => runner.shutdown());
      const harness = ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService());
      const input = validateNeedAdjudicationScenarioInput(ctx, packet, { execution_mode: 'codex_cli', run_mode: 'product', mocked_output: null, expectations: {} });
      for (const override of [{ fixture_human_decision: true }, { adjudication_actor: { actor_type: 'human' as const } },
        { mocked_output: { fixture_id: 'forbidden-cli', output: packet } }, { executor_kind: 'multi_agent_debate' as const }]) {
        await assert.rejects(harness.runValidateNeedAdjudicationScenario({ ...input, ...override }), /without caller outputs or Human authority/);
      }
      assert.equal(calls, 0);
      const result = await harness.runValidateNeedAdjudicationScenario(input);
      assert.equal(result.node_result.status, failure === 'high_risk' ? 'require_human_review' : 'blocked', JSON.stringify(result.node_result));
      assert.equal(result.node_result.adjudication_result_ref, null);
      if (failure === 'risk_drop') assert.ok(result.node_result.blocker_codes.includes('RESIDUAL_RISK_DROPPED'));
      if (failure === 'reference_version') assert.equal(result.node_result.error_code, 'VERSION_CONFLICT');
      assert.equal(calls, failure === 'unreadable_source' ? 0 : 1);
      assert.deepEqual(await ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService()).runValidateNeedAdjudicationScenario(input), result);
    });
  }
  for (const failure of ['incomplete_human', 'review_lineage', 'input_scope', 'receipt_interruption'] as const) {
    await t.test(`confirmation ${failure}`, async () => {
      const ctx = await seedValidateNeedAdjudicationRuntime();
      const adjudicated = await runValidateNeedForHumanConfirm(ctx);
      const input = humanConfirmNeedScenarioInput(ctx, adjudicated, { execution_mode: 'codex_cli', run_mode: 'product', expectations: {} });
      if (failure === 'incomplete_human') input.confirmation_input.accepted_risk_refs = [];
      if (failure === 'input_scope') input.adjudication_result_ref = { ...input.adjudication_result_ref, title_card_id: 'another-title' };
      let calls = 0;
      const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
        if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
        calls++;
        const context = JSON.parse(options.stdin.split('[user]\n')[1]!) as { output_lineage: Partial<HumanConfirmationSemanticReview> };
        const review = humanConfirmationSemanticReviewOutput(ctx, input, context.output_lineage);
        if (failure === 'review_lineage') review.context_packet_ref = { ...review.context_packet_ref, version_id: 'invented' };
        return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'review-thread' }),
          JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(review) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
      });
      t.after(() => runner.shutdown());
      const harness = ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService());
      if (failure === 'receipt_interruption') {
        const create = ctx.controlPlaneRepository.createArtifactRef.bind(ctx.controlPlaneRepository);
        ctx.controlPlaneRepository.createArtifactRef = async record => {
          if (record.stable_key?.startsWith('v1a-codex-submission:') && record.stable_key.endsWith(':result')) throw new Error('Receipt storage unavailable');
          return create(record);
        };
        await assert.rejects(harness.runHumanConfirmNeedScenario(input), /Receipt storage unavailable/);
        ctx.controlPlaneRepository.createArtifactRef = create;
        assert.ok(await ctx.needService.getValidatedNeedById(input.reserved_validated_need_ref.ref_id));
        await assert.rejects(ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService()).runHumanConfirmNeedScenario(input), /running or interrupted/);
      } else {
        const result = await harness.runHumanConfirmNeedScenario(input);
        assert.notEqual(result.node_result.status, 'ready', JSON.stringify(result.node_result));
        assert.equal(result.node_result.human_decision_ref, null);
        assert.equal(await ctx.needService.getValidatedNeedById(input.reserved_validated_need_ref.ref_id), null);
        assert.deepEqual(await ctx.buildCliHarness(runner, new TopicSelectionModelProfileRegistryService()).runHumanConfirmNeedScenario(input), result);
      }
      assert.equal(calls, failure === 'input_scope' ? 0 : 1);
    });
  }
});

for (const storage of ['inline', 'file'] as const) test(`product CLI extraction reads bound original paragraphs from ${storage} and refuses source or locator drift`, async t => {
  const original = 'The supplied answer document is less useful in the middle of the context.';
  const ctx = await seedNeedValidationSearchRuntime({ originalFulltext: original });
  const unselected = 'UNSELECTED_FRAGMENT must remain outside the model packet.';
  const initialDocument = (await ctx.literature.listFulltextDocumentsByLiteratureId('lit_001'))[0]!;
  const initialParagraphs = await ctx.literature.listFulltextParagraphsByDocumentId(initialDocument.id);
  const fullText = `${original}\n\n${unselected}`;
  const home = await fs.mkdtemp(join(tmpdir(), 'v1a-paragraph-cli-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const textPath = join(home, 'normalized.txt');
  if (storage === 'file') await fs.writeFile(textPath, fullText);
  await ctx.literature.upsertFulltextExtractionBundle({ document: { ...initialDocument, normalizedText: storage === 'inline' ? fullText : null, normalizedTextPath: storage === 'file' ? textPath : null, normalizedTextChecksum: sha256Text(fullText) },
    sections: [], anchors: [], paragraphs: [...initialParagraphs, { ...initialParagraphs[0]!, id: 'paragraph_unselected', paragraphId: 'paragraph_unselected',
      text: unselected, checksum: sha256Text(unselected), orderIndex: 2, startOffset: original.length + 2, endOffset: fullText.length }] });
  const handoff = ctx.searchRunResult.node_result.downstream_handoff!;
  const draft = evidenceMapExtractionDraft({ title_card_id: ctx.titleCard.title_card_id, handoff,
    literature_ref: ctx.literatureRef, source_ref: ctx.sourceRef, coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(handoff) }, { producer_kind: 'codex_cli' });
  draft.draft_units[0]!.source_statement = original;
  draft.draft_units[0]!.locator = { locator_type: 'paragraph', locator_ref: ctx.manualLocatorRef,
    paragraph_ref: ctx.manualLocatorRef, literature_ref: ctx.literatureRef, source_ref: ctx.sourceRef };
  let calls = 0;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    assert.ok(options.stdin.includes(original));
    assert.equal(options.stdin.includes(unselected), false, 'Unbound paragraph text stays outside the model context.');
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'paragraph-test' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(draft) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const profiles = new TopicSelectionModelProfileRegistryService();
  const request = buildEvidenceMapScenarioInput({ title_card_id: ctx.titleCard.title_card_id, handoff, draft }, {
    extraction_draft: null, execution_mode: 'codex_cli', run_mode: 'product', node_attempt_id: 'cli-paragraph-extraction', expectations: {} });
  const result = await ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(request);
  assert.equal(result.node_result.status, 'succeeded', JSON.stringify(result.node_result));
  const evidence = await ctx.evidenceMaps.getNeedValidationEvidenceBundle(result.node_result.evidence_map_ref!.ref_id);
  assert.equal(evidence.support_units[0]!.abstract_only, false);
  assert.equal(evidence.support_units[0]!.source_statement, original);
  assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(request), result);
  assert.equal(calls, 1);
  draft.draft_units[0]!.locator.paragraph_ref = { ...ctx.manualLocatorRef, version_id: 'forged' };
  await assert.rejects(ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'cli-paragraph-forged' }), /quote or locator/);
  assert.equal(calls, 2);
  if (storage === 'file') {
    await fs.writeFile(textPath, fullText + ' tampered');
    await assert.rejects(ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'file-drift' }), /original paragraph/);
    await fs.rm(textPath);
    await assert.rejects(ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'file-missing' }), /original paragraph/);
    assert.equal(calls, 2, 'Missing or drifted managed text is rejected before a model call.');
    await fs.writeFile(textPath, fullText);
  }
  const document = (await ctx.literature.listFulltextDocumentsByLiteratureId('lit_001'))[0]!;
  const paragraphs = await ctx.literature.listFulltextParagraphsByDocumentId(document.id);
  await ctx.literature.upsertFulltextExtractionBundle({ document, sections: [], anchors: [],
    paragraphs: paragraphs.map(paragraph => ({ ...paragraph, text: 'Changed without updating its checksum.' })) });
  await assert.rejects(ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'cli-paragraph-source-drift' }), /original paragraph/);
  assert.equal(calls, 2, 'Source drift is rejected before model work.');
});

test('product CLI extracts repository quotes, discovers a need and replays each node without more model work', async t => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const home = await fs.mkdtemp(join(tmpdir(), 'v1a-cli-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const original = 'The paper reports a source-grounded RAG fine-tuning evaluation workflow.';
  await ctx.literature.upsertAbstractProfile({ id: 'lit_001_abstract', literatureId: 'lit_001', abstractText: original,
    abstractSource: 'collection_metadata', sourceRef: { ref_type: 'literature_source', source_id: 'source_001', source_url: 'file://lit_001.pdf' }, checksum: sha256Text(original), language: 'en',
    confidence: 1, reasonCodes: [], generated: false, createdAt: '2026-05-19T00:00:00.000Z', updatedAt: '2026-05-19T00:00:00.000Z' });
  const draft = evidenceMapExtractionDraft({ title_card_id: ctx.titleCard.title_card_id, handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!, source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff) }, { producer_kind: 'codex_cli' });
  let output: unknown = draft;
  let calls = 0;
  const runner = new TopicSelectionCodexCliRunnerService({ codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'exec' }, async (args, options) => {
    if (args[0] === '--version') return { stdout: 'test-cli', stderr: '', exit_code: 0, timed_out: false };
    calls++;
    assert.ok(options.stdin.includes(original), 'The actual original source crosses the model boundary.');
    if (calls === 2) {
      const schemaPath = args[args.indexOf('--output-schema') + 1]!;
      const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
      const mechanism = schema.properties.drafts.items.properties.mechanism_payload.anyOf[0];
      assert.deepEqual(Object.keys(mechanism.properties).sort(), ['comparison', 'intervention', 'mechanism', 'outcome', 'research_object']);
      assert.equal(mechanism.additionalProperties, false);
    }
    return { stdout: [JSON.stringify({ type: 'thread.started', thread_id: 'v1a-test-thread' }),
      JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(output) } })].join('\n'), stderr: '', exit_code: 0, timed_out: false };
  });
  t.after(() => runner.shutdown());
  const profiles = new TopicSelectionModelProfileRegistryService();
  const harness = ctx.buildCliHarness(runner, profiles);
  const request = buildEvidenceMapScenarioInput({ title_card_id: ctx.titleCard.title_card_id, handoff: ctx.searchRunHandoff, draft }, {
    extraction_draft: null, execution_mode: 'codex_cli', run_mode: 'product', node_attempt_id: 'cli-extraction-1', expectations: {} });
  const simultaneous = await Promise.allSettled([harness.runBuildEvidenceMapScenario(request),
    ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(request)]);
  assert.equal(simultaneous.filter(result => result.status === 'fulfilled').length, 1);
  const completed = simultaneous.find(result => result.status === 'fulfilled');
  assert.ok(completed?.status === 'fulfilled');
  const extracted = completed.value;
  assert.equal(extracted.node_result.status, 'succeeded', JSON.stringify(extracted.node_result));
  assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(request), extracted);
  assert.equal(calls, 1);
  const evidenceMapRef = extracted.node_result.evidence_map_ref!;
  await ctx.evidenceMaps.assessEvidenceStrength({ evidence_map_id: evidenceMapRef.ref_id, target_ref: evidenceMapRef,
    purpose: 'need_validation', role_bundle: { support_unit_ids: extracted.node_result.evidence_unit_refs.map(ref => ref.ref_id) },
    assessment_workflow_version: 'v1', policy_version_id: 'v1' });
  const bundle = await ctx.evidenceMaps.getNeedValidationEvidenceBundle(evidenceMapRef.ref_id);
  const batch = rankedBatch('cli-need-1');
  batch.drafts[0]!.evidence_role_bundle = { support_unit_refs: extracted.node_result.evidence_unit_refs, challenge_unit_refs: [], baseline_unit_refs: [], context_unit_refs: [] };
  batch.drafts[0]!.strength_assessment_refs = [bundle.strength_assessment_refs[0]!];
  batch.drafts[0]!.conflict_refs = [];
  batch.drafts[0]!.mechanism_payload = { research_object: 'RAG generation', mechanism: 'position sensitivity', intervention: null, comparison: 'edge vs middle context', outcome: 'answer accuracy' };
  batch.drafts.push({ ...batch.drafts[0]!, draft_id: 'draft_002', rank: 2,
    candidate_need: 'Improve cross-domain retrieval robustness.', unmet_need_statement: 'The tested retriever does not generalize across source-tested domains.',
    mechanism_payload: { research_object: 'retrieval', mechanism: 'domain shift', intervention: null, comparison: 'BM25 vs dense retrieval', outcome: 'retrieval relevance' } });
  batch.portfolio_disposition = { outcome: 'selected', rationale: 'Controlled fixture preserves a comparison of two viable needs.', confidence: 0.8,
    evidence_refs: extracted.node_result.evidence_unit_refs, rejection_reasons: [], reopening_conditions: [],
    candidate_dispositions: batch.drafts.map((draft, index) => ({ candidate_key: draft.draft_id,
      disposition: index === 0 ? 'selected' : 'parked', rationale: 'Controlled comparative priority.', evidence_refs: extracted.node_result.evidence_unit_refs,
      drop_reason_code: null, reopening_conditions: index === 0 ? [] : ['Reconsider retrieval priority after researcher comparison.'] })) };
  output = batch;
  const discovery = scenarioInput({ title_card_id: ctx.titleCard.title_card_id, node_attempt_id: 'cli-need-1',
    workflow_run_id: 'cli-need-workflow', topic_scope_ref: ctx.topicSeedRef, evidence_map_ref: evidenceMapRef,
    evidence_strength_ref: bundle.strength_assessment_refs[0]!, execution_mode: 'codex_cli', run_mode: 'product',
    mocked_output: null, persist_admitted_candidates: true, persistence_context: { search_run_ref: bundle.search_run_ref,
      search_plan_ref: bundle.search_plan_ref, literature_snapshot_ref: bundle.literature_snapshot_ref }, expectations: {},
    resource_sample_set_ref: null, search_snapshot_refs: [bundle.search_run_ref], resource_snapshot_refs: [bundle.literature_snapshot_ref] });
  const result = await harness.runGenerateNeedCandidateScenario(discovery);
  assert.equal(result.adapter_result.status, 'succeeded');
  assert.deepEqual(result.adapter_result.persist_need_candidate_batch_result?.persisted_candidates.map(candidate => candidate.mechanism_payload), batch.drafts.map(draft => draft.mechanism_payload));
  assert.equal(result.adapter_result.persist_need_candidate_batch_result?.persisted_candidates.length, 2);
  assert.deepEqual(await ctx.buildCliHarness(runner, profiles).runGenerateNeedCandidateScenario(discovery), result);
  assert.equal(calls, 2);
  assert.equal((await ctx.needValidationRepository.listNeedCandidatesByTitleCardId(ctx.titleCard.title_card_id)).length, 2);
  assert.equal(ctx.llmGateway.calls.length, 0);
  const persistenceContext = { search_run_ref: bundle.search_run_ref, search_plan_ref: bundle.search_plan_ref,
    literature_snapshot_ref: bundle.literature_snapshot_ref };
  for (const [field, value] of [['ref_id', 'foreign-search'], ['version_id', 'stale'], ['title_card_id', 'foreign-title'], ['legacy_ref', 'foreign-legacy']] as const) {
    await assert.rejects(harness.runGenerateNeedCandidateScenario({ ...discovery, node_attempt_id: `cli-need-persistence-${field}`,
      persist_admitted_candidates: true, persistence_context: { ...persistenceContext,
        search_plan_ref: { ...persistenceContext.search_plan_ref, [field]: value } } }), /persistence lineage/);
  }
  await assert.rejects(harness.runGenerateNeedCandidateScenario({ ...discovery, node_attempt_id: 'cli-need-persistence-missing',
    persist_admitted_candidates: true, persistence_context: null }), /persistence lineage/);
  assert.equal(calls, 2, 'Reject invalid persistence lineage before charging a model call.');
  await assert.rejects(harness.runBuildEvidenceMapScenario({ ...request, policy_version: 'changed' }), /different input/);
  output = { schema_version: 'v1', debate_loop_id: 'invented-loop', round_index: 1, role: 'explorer',
    stage: 'round_1_discovery', agent_instance_id: 'explorer_1', candidate_angles: [], evidence_refs: [],
    unresolved_questions: ['Need more evidence.'], warnings: [] };
  await assert.rejects(harness.runGenerateNeedCandidateScenario({ ...discovery, node_attempt_id: 'cli-role-identity',
    executor_kind: 'multi_agent_debate' }), /role output identity differs/);
  assert.equal(calls, 3);

  output = { ...draft, draft_units: draft.draft_units.map(unit => ({ ...unit, source_statement: 'An invented empirical result.' })) };
  await assert.rejects(harness.runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'cli-extraction-forged-quote' }), /quote or locator/);
  await assert.rejects(harness.runBuildEvidenceMapScenario({ ...request, extraction_draft: draft }), /compiles its own context/);
  assert.equal(calls, 4);
  output = draft;
  const record = ctx.controlPlane.recordArtifactRef.bind(ctx.controlPlane);
  ctx.controlPlane.recordArtifactRef = async input => {
    if (input.stable_key?.startsWith('v1a-codex-submission:') && input.stable_key.endsWith(':result')) throw new Error('Completion receipt unavailable');
    return record(input);
  };
  const interrupted = { ...request, node_attempt_id: 'cli-extraction-interrupted' };
  await assert.rejects(harness.runBuildEvidenceMapScenario(interrupted), /Completion receipt unavailable/);
  ctx.controlPlane.recordArtifactRef = record;
  assert.equal(calls, 5);
  await assert.rejects(ctx.buildCliHarness(runner, profiles).runBuildEvidenceMapScenario(interrupted), /running or interrupted/);
  assert.equal(calls, 5);
  const stored = await ctx.literature.findAbstractProfileByLiteratureId('lit_001');
  await ctx.literature.upsertLiteratureSource({ id: 'unselected-source', literatureId: 'lit_001', provider: 'manual',
    sourceItemId: 'other', sourceUrl: 'https://example.test/other', rawPayload: { abstract: original }, fetchedAt: stored!.updatedAt });
  await ctx.literature.upsertAbstractProfile({ ...stored!, sourceRef: { ref_type: 'literature_source', source_id: 'unselected-source', source_url: 'https://example.test/other' } });
  await assert.rejects(harness.runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'cli-extraction-wrong-source' }), /source bound to this search run/);
  assert.equal(calls, 5);
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

test('workflow harness admits explicit same-source scope refinements without inventing a claim conflict', async () => {
  const ctx = await seedBuildEvidenceMapRuntime();
  const draft = evidenceMapExtractionDraft({ title_card_id: ctx.titleCard.title_card_id, handoff: ctx.searchRunHandoff,
    literature_ref: ctx.literatureSnapshot.literature_refs[0]!, source_ref: ctx.literatureSnapshot.content_source_refs[0]!,
    coverage_row_intent_ref: ctx.coverageRowIntentRefs[0]!,
    input_refs_hash: ctx.evidenceMapMaterializer.inputRefsHashForSearchRunHandoff(ctx.searchRunHandoff) });
  const support = draft.draft_units[0]!;
  support.source_statement = 'Model accuracy degrades at middle positions.';
  const challenge = { ...support, client_unit_key: 'boundary', evidence_role: 'challenge' as const,
    coverage_row_intent_ref: null, source_statement: 'An extended context window alone does not improve context use.' };
  draft.draft_units.push(challenge);
  draft.draft_links = [{ link_type: 'refines', source_unit_key: challenge.client_unit_key, target_unit_key: support.client_unit_key,
    rationale: 'This constrains a possible window-expansion remedy; it does not contradict the observed position-sensitive deficit.', confidence: null }];
  const request = buildEvidenceMapScenarioInput({ title_card_id: ctx.titleCard.title_card_id, handoff: ctx.searchRunHandoff, draft }, { expectations: {} });
  const result = await ctx.workflowHarness.runBuildEvidenceMapScenario(request);
  assert.equal(result.node_result.status, 'succeeded', JSON.stringify(result.node_result.materialization_report));
  assert.equal(result.node_result.evidence_unit_refs.length, 2);
  assert.deepEqual(result.node_result.evidence_map_records!.conflict_sets, []);
  assert.equal(result.node_result.evidence_map_records!.typed_links[0]!.link_type, 'refines');
  draft.draft_units.push({ ...support, client_unit_key: 'support_boundary', source_statement: challenge.source_statement },
    { ...challenge, client_unit_key: 'challenge_original', source_statement: support.source_statement });
  draft.draft_links.push({ ...draft.draft_links[0]!, source_unit_key: 'support_boundary', target_unit_key: 'challenge_original' });
  const crossed = await ctx.workflowHarness.runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'crossed-duplicate-claims' });
  assert.equal(crossed.node_result.status, 'review_required', 'Cross-linking duplicate claims must not hide opposite role assignments.');
  draft.draft_units.splice(2);
  draft.draft_links.splice(1);
  challenge.source_statement = support.source_statement;
  const duplicated = await ctx.workflowHarness.runBuildEvidenceMapScenario({ ...request, node_attempt_id: 'same-claim-two-roles' });
  assert.equal(duplicated.node_result.status, 'review_required');
  assert.ok(duplicated.node_result.materialization_report.review_codes.includes('SUPPORT_CHALLENGE_POLARITY_AMBIGUOUS'));
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
  assert.equal(ctx.llmGateway.calls[0]?.model.modelId, 'gpt-5.6-sol');
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

test('workflow harness rejects a drifted replay after a partial human confirmation write', async () => {
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
        error_code: 'VERSION_CONFLICT',
        blocker_codes: ['VERSION_CONFLICT'],
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
  const ctx = await seedValidateNeedAdjudicationRuntime({ includeChallenge: false });
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

test('workflow harness records none-viable generation as a successful terminal route without authority writes', async () => {
  const { workflowHarness, needValidationRepository } = await makeRuntime();
  const batch = rankedBatch('node_attempt_n6_none_viable');
  batch.drafts = [];
  batch.rejected_framings = [
    {
      framing_id: 'framing_none_viable_001',
      reason_code: 'near_isomorphic_prior_art',
      summary: 'The framing has no mechanism-level contribution difference.',
      refs: [ref('evidence_unit', 'challenge_001')],
    },
  ];
  batch.portfolio_disposition = {
    outcome: 'none_viable',
    rationale: 'All inspected framings collide with direct prior art.',
    confidence: 0.88,
    evidence_refs: [ref('evidence_unit', 'challenge_001')],
    rejection_reasons: [
      {
        reason_code: 'near_isomorphic_prior_art',
        summary: 'No mechanism-level difference remains.',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
      },
    ],
    reopening_conditions: ['New claim-bearing evidence establishes a mechanism-level difference.'],
    candidate_dispositions: [],
  };

  const result = await workflowHarness.runGenerateNeedCandidateScenario(scenarioInput({
    scenario_case_id: 'mocked-none-viable-stop',
    workflow_run_id: 'workflow_run_n6_none_viable',
    input_snapshot_id: 'input_snapshot_n6_none_viable',
    node_attempt_id: 'node_attempt_n6_none_viable',
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_none_viable',
      output: batch,
    },
    expectations: {
      status: 'succeeded',
      routing_decision: 'stop_without_candidate',
      admitted_draft_count: 0,
      persisted_candidate_count: 0,
      persistence: 'forbidden',
    },
  }));

  assert.equal(result.scenario_status, 'passed');
  assert.equal(result.adapter_result.status, 'succeeded');
  assert.equal(result.adapter_result.error_code, null);
  assert.equal(result.adapter_result.supplemental_round_routing_decision?.routing_decision, 'stop_without_candidate');
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
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
  const challengeLocator = validationManualLocator({
    title_card_id: titleCardId,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    manual_ref: refForTitleCard('manual_locator', 'runtime_stress_challenge_locator', titleCardId),
    manual_label: 'runtime stress challenge locator',
  });
  const baselineLocator = validationManualLocator({
    title_card_id: titleCardId,
    literature_ref: literatureRef,
    source_ref: sourceRef,
    manual_ref: refForTitleCard('manual_locator', 'runtime_stress_baseline_locator', titleCardId),
    manual_label: 'runtime stress direct-neighbor baseline locator',
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
      {
        ...supportDraftUnit,
        client_unit_key: 'unit_challenge_001',
        coverage_row_intent_ref: null,
        evidence_role: 'challenge',
        locator: challengeLocator,
        source_statement: 'The paper reports a competing explanation that challenges the proposed workflow mechanism.',
        normalized_statement: 'A competing explanation could account for the observed validation gap.',
        source_attribution_kind: 'counter_evidence',
        interpretation_payload: { role_hint: 'challenge' },
        confidence: 0.81,
        issue_codes: [],
      },
      {
        ...supportDraftUnit,
        client_unit_key: 'unit_baseline_001',
        coverage_row_intent_ref: null,
        evidence_role: 'baseline',
        locator: baselineLocator,
        source_statement: 'The closest workflow baseline exposes the same traceability boundary.',
        normalized_statement: 'The direct-neighbor baseline lacks checkpoint-governed validation lineage.',
        interpretation_payload: { role_hint: 'baseline' },
        confidence: 0.83,
        issue_codes: [],
      },
    ],
    draft_conflicts: [{
      conflict_type: 'claim_conflict',
      severity: 'moderate',
      support_unit_keys: [supportDraftUnit.client_unit_key],
      challenge_unit_keys: ['unit_challenge_001'],
      baseline_unit_keys: [],
      context_unit_keys: [],
      issue_codes: ['RESIDUAL_RISK_PRESENT'],
    }],
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
      evidence_unit_count: 4,
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
  const challengeUnit = evidenceUnits.find((unit) => unit.evidence_role === 'challenge');
  const baselineUnit = evidenceUnits.find((unit) => unit.evidence_role === 'baseline');
  assert.ok(supportUnit);
  assert.ok(contextUnit);
  assert.ok(challengeUnit);
  assert.ok(baselineUnit);
  const supportRef = refForTitleCard('evidence_unit', supportUnit.evidence_unit_id, titleCardId);
  const contextRef = refForTitleCard('evidence_unit', contextUnit.evidence_unit_id, titleCardId);
  const challengeRef = refForTitleCard('evidence_unit', challengeUnit.evidence_unit_id, titleCardId);
  const baselineRef = refForTitleCard('evidence_unit', baselineUnit.evidence_unit_id, titleCardId);
  const strengthRef = refForTitleCard('evidence_strength_assessment', 'runtime_stress_strength', titleCardId);
  const n6NodeAttemptId = 'node_attempt_runtime_stress_n6';
  const n6Batch = rankedBatch(n6NodeAttemptId);
  n6Batch.drafts[0] = {
    ...n6Batch.drafts[0]!,
    evidence_role_bundle: {
      support_unit_refs: [supportRef],
      challenge_unit_refs: [challengeRef],
      baseline_unit_refs: [baselineRef],
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
        challenge_count: 1,
      },
      resource_sample_digest: {
        sample_set_id: handoff.literature_resource_pool_snapshot_ref.ref_id,
        role_counts: { support: 1, challenge: 1, baseline: 1, context: 1 },
        topic_method_family_targets: ['retrieval_augmented_generation', 'fine_tuning'],
      },
    },
    arbiter_payload: {
      ...arbiterPayload(),
      node_policy_ref: refForTitleCard('node_policy', 'generate_need_candidate_v1', titleCardId),
      output_schema_ref: refForTitleCard('schema', 'ranked_candidate_draft_batch_v1', titleCardId),
      evidence_ref_table: [
        { evidence_ref: supportRef, role: 'support' },
        { evidence_ref: challengeRef, role: 'challenge' },
        { evidence_ref: baselineRef, role: 'baseline' },
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
