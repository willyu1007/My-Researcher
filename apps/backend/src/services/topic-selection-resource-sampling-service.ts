import crypto from 'node:crypto';

import type {
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES,
  TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES,
  topicSelectionResourceSamplingLlmOutputSchema,
  type CreateTopicSelectionResourceSampleRequest,
  type TopicSelectionResourceCandidateClassificationDraft,
  type TopicSelectionResourceEvidencePolarity,
  type TopicSelectionResourceRoleCounts,
  type TopicSelectionResourceRoleScores,
  type TopicSelectionResourceRoleTargets,
  type TopicSelectionResourceSampleItemRecord,
  type TopicSelectionResourceSampleResult,
  type TopicSelectionResourceSampleRole,
  type TopicSelectionResourceSampleSetRecord,
  type TopicSelectionResourceSampleSetStatus,
  type TopicSelectionResourceSamplingAuditRecord,
  type TopicSelectionResourceSamplingLlmOutput,
  type TopicSelectionResourceSamplingModelRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-resource-sampling-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
  TopicLiteratureScopeRecord,
} from '../repositories/literature-repository.js';
import type { TopicSelectionResourceSamplingRepository } from '../repositories/topic-selection-resource-sampling.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import {
  LlmGatewayError,
  type LlmCallTelemetry,
  type LlmModelRef,
} from './llm-gateway.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionModelProfileRegistryService,
  TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeCompressionAttemptInput,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
} from './topic-selection-agent-orchestrator-service.js';

export const TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY =
  TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID;
export const TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID =
  'topic-selection-resource-sampling-classification' as const;
export const TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION = '1' as const;
export const TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID =
  'topic-selection.resource-sampling.create-sample-set.v1' as const;
const RESOURCE_SAMPLING_INVOCATION_SLOT_ID =
  TOPIC_SELECTION_RESOURCE_SAMPLING_INVOCATION_SLOT_IDS.literature_classification_batch;
export const TOPIC_SELECTION_RESOURCE_SAMPLING_OUTPUT_CONTRACT =
  'TopicSelectionResourceSamplingLlmOutput@v1' as const;
const DEFAULT_POLICY_VERSION = 'topic-resource-sampling-v1';
const DEFAULT_SAMPLE_SIZE = 16;
const TARGET_ROLES = [...TOPIC_SELECTION_RESOURCE_SAMPLE_TARGET_ROLES];

type IdFactory = (prefix: string) => string;

export type CreateTopicSelectionResourceSampleInput =
  Omit<CreateTopicSelectionResourceSampleRequest, 'model'> & {
    model?: LlmModelRef | TopicSelectionResourceSamplingModelRef | null;
  };

type ServiceOptions = {
  repository: TopicSelectionResourceSamplingRepository;
  literatureRepository: LiteratureRepository;
  controlPlaneService: TopicSelectionControlPlaneService;
  agentOrchestrator: TopicSelectionAgentOrchestratorService;
  contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
  modelProfileRegistry?: Pick<TopicSelectionModelProfileRegistryService, 'resolveProfile'>;
  idFactory?: IdFactory;
  now?: () => string;
  /** Per-batch classification retry knobs; tests inject backoffMs () => 0. */
  classificationRetryPolicy?: {
    maxRetriesPerBatch?: number;
    backoffMs?: (retryIndex: number) => number;
  };
};

type CandidateEligibilityStatus = 'eligible' | 'excluded';

type ResourceCandidate = {
  topic_id: string;
  title_card_id: string | null;
  workspace_id: string | null;
  literature_ref: TopicSelectionFunctionalRef;
  literature: LiteratureRecord;
  scope: TopicLiteratureScopeRecord;
  pipeline_state: LiteraturePipelineStateRecord | null;
  source_count: number;
  source_refs: TopicSelectionFunctionalRef[];
  eligibility_status: CandidateEligibilityStatus;
  exclusion_reason: string | null;
  text: string;
};

type GuardedClassification = {
  candidate: ResourceCandidate;
  selected_role: TopicSelectionResourceSampleRole;
  topic_relevance: number;
  evidence_polarity: TopicSelectionResourceEvidencePolarity;
  role_scores: TopicSelectionResourceRoleScores;
  confidence: number;
  classification_rationale: string;
  exclusion_reason: string | null;
  review_reason: string | null;
  guardrail_codes: string[];
  method_families: string[];
};

type RankedCandidate = GuardedClassification & {
  selected: boolean;
  rank: number;
};

type DeterministicRoleSignals = {
  topicCore: boolean;
  titleStrongTopicCore: boolean;
  hardChallenge: boolean;
  strongChallenge: boolean;
  riskHeavy: boolean;
  baseline: boolean;
  positiveMethod: boolean;
  benchmarkFirst: boolean;
  contextOrientation: boolean;
  broadFoundationOnly: boolean;
};

type ClassificationBatchStats = {
  batch_count: number;
  failed_batch_count: number;
  retried_batch_count: number;
  retry_attempt_count: number;
};

type ClassificationOutcome = {
  guarded: GuardedClassification[];
  llmOutput: TopicSelectionResourceSamplingLlmOutput;
  telemetry: LlmCallTelemetry | null;
  error: unknown | null;
  batchStats: ClassificationBatchStats;
};

type ResourceSamplingBatchRuntimeContext = {
  schema_version: 'TopicSelectionResourceSamplingBatchContext@v1';
  node_id: typeof TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID;
  invocation_slot_id: typeof RESOURCE_SAMPLING_INVOCATION_SLOT_ID;
  context_family: 'resource_sampling_literature_classification_batch';
  topic_id: string;
  sample_size: number;
  role_targets: TopicSelectionResourceRoleTargets;
  policy_version: string;
  batch: {
    index: number;
    count: number;
    candidate_count: number;
  };
  eligible_candidates: Array<{
    literature_ref: TopicSelectionFunctionalRef;
    title: string;
    abstract: string | null;
    key_content_digest: string | null;
    tags: string[];
    year: number | null;
    activation_score: number | null;
    activation_reason: string | null;
    source_count: number;
  }>;
};

type SampleAssembly = {
  status: TopicSelectionResourceSampleSetStatus;
  items: TopicSelectionResourceSampleItemRecord[];
  selectedItems: TopicSelectionResourceSampleItemRecord[];
  warnings: string[];
  roleCounts: TopicSelectionResourceRoleCounts;
  sampleHash: string;
  guardrailSummary: Record<string, unknown>;
};

const EMPTY_ROLE_COUNTS: TopicSelectionResourceRoleCounts = {
  support: 0,
  challenge: 0,
  baseline: 0,
  context: 0,
  review: 0,
  excluded: 0,
};

const ZERO_ROLE_SCORES: TopicSelectionResourceRoleScores = {
  support: 0,
  challenge: 0,
  baseline: 0,
  context: 0,
  review: 0,
  excluded: 0,
};

const RISK_HEAVY_PATTERN =
  /\b(adversarial|poison|poisoning|attack|jailbreak|backdoor|source verification|verification failure|misinformation|hallucination(?![- ]?free)|vulnerabilit(?:y|ies)|privacy|risks?|failure modes?|when retrieval hurts|stale context|knowledge conflict|leak(?:age)?|security|threat|degrad(?:e|es|ation)|underperform|obscur(?:e|es)|collaps(?:e|es)|diagnos(?:e|es|tic))\b/i;
const STRONG_CHALLENGE_PATTERN =
  /\b(adversarial|poison|poisoning|attack|jailbreak|backdoor|source verification|verification failure|cannot be reliably verified|not verified|factual reliability|factual accuracy|fact check|vulnerabilit(?:y|ies)|privacy|risks?|failure modes?|when retrieval hurts|stale context|knowledge conflict|leak(?:age)?|security|threat|degrad(?:e|es|ation)|underperform|obscur(?:e|es)|collaps(?:e|es))\b/i;
const HARD_CHALLENGE_PATTERN =
  /\b(poison|poisoning|attack|jailbreak|backdoor|source verification failure|cannot be reliably verified|not verified|vulnerabilit(?:y|ies)|privacy leak|leak(?:age)? attack|security threat|exfiltration|injection|knowledge conflict)\b/i;
const RISK_MITIGATION_ONLY_PATTERN =
  /\b(hallucination[- ]?free|addresses? the risks? of|mitigat(?:e|es|ed|ing)|reduc(?:e|es|ed|ing) hallucination|improv(?:e|es|ed|ing) faithfulness|leakage filters?)\b/i;
const ADVERSARIAL_CONVERSATION_PATTERN =
  /\bemotionally adversarial conversations?\b/i;
const BASELINE_PATTERN =
  /\b(benchmark|evaluation|evaluate|comparison|compare|baseline|dataset|leaderboard|ablation|empirical|metric)\b/i;
const FINE_TUNING_PATTERN = /\b(fine[- ]?tuning|finetun|instruction tuning|adapter|lora|qlora|peft)\b/i;
const TOPIC_CORE_PATTERN =
  /\b(rag|graphrag|retrieval[- ]?augmented|retrieval|fine[- ]?tuning|finetun|language model|llm|agentic|rerank(?:ing)?|embedding|vector database)\b/i;
const TITLE_STRONG_TOPIC_CORE_PATTERN =
  /\b(rag|graphrag|retrieval[- ]?augmented|retrieval|fine[- ]?tuning|finetun|rerank(?:ing)?|embedding|vector database)\b/i;
const POSITIVE_METHOD_PATTERN =
  /\b(propos(?:e|es|ed)|introduc(?:e|es|ed)|present(?:s|ed)?|framework|system|method|protocol|architecture|algorithm|approach|improv(?:e|es|ed|ement)|gain|outperform|guarantee|distillation|rerank(?:ing)?)\b/i;
const BENCHMARK_FIRST_PATTERN =
  /\b(benchmark|dataset|leaderboard|empirical study|empirical analysis|comparative study|compar(?:e|ing|ison)|assessment|evaluation suite)\b/i;
const CONTEXT_ORIENTATION_PATTERN =
  /\b(background|foundation|foundational|survey|overview|theoretical|theory|analytical|not to demonstrate|not deployment-ready|out of scope)\b/i;
const BROAD_FOUNDATION_TAGS = new Set(['foundational-ai', 'background-literature', 'auto-screened-context']);
const TARGET_ROLE_RELEVANCE_FLOOR = 0.7;
const LLM_CLASSIFICATION_BATCH_SIZE = 24;
// Per-batch retry for transient provider failures (W-10 run5: one 5xx killed all 18 batches —
// the gateway's own retry window is too short for a sustained provider incident, and losing a
// single batch must not discard every other batch's paid classification).
const CLASSIFICATION_BATCH_MAX_RETRIES = 2;
const CLASSIFICATION_BATCH_RETRY_BACKOFF_MS = 1500;
// Deterministic pre-provider blocks re-fail identically on retry (review finding): the token-budget
// gate and the compression quality gate are pure functions of the batch input — retrying burns backoff
// time (and, for nothing, gate evaluations) without a provider call ever happening. Provider-side and
// schema-validation failures stay retryable (LLM nondeterminism is the whole point of the retry).
const NON_RETRYABLE_CLASSIFICATION_BLOCKER_PREFIXES = ['TOKEN_BUDGET_', 'COMPRESSION_QUALITY_GATE_'] as const;

export function buildResourceSamplingClassificationSystemContent(): string {
  return [
    'You are classifying a batch of topic-scoped literature into a role-balanced topic-selection resource sample, working only from the supplied batch so a deterministic sampler can later assemble the set.',
    'Emit a TopicSelectionResourceSamplingLlmOutput object whose classifications array holds exactly one classification per eligible literature_ref in this batch, copying each literature_ref verbatim and neither adding, dropping, nor merging candidates.',
    'Set primary_role to one of support, challenge, baseline, context, review, or excluded: support is positive method or enabling evidence; challenge is risks, attacks, poisoning, failures, or source-verification issues; baseline is evaluation, benchmark, comparison, dataset, leaderboard, or metric material; context is foundation or background material; review is genuinely mixed or uncertain material that needs human judgement before sampling; excluded is off-topic or topic-drift material that is not usable for this topic.',
    'Set role_scores to a 0-to-1 score for every role (support, challenge, baseline, context, review, excluded) and make primary_role the highest-scoring role.',
    'Set topic_relevance and confidence each as a 0-to-1 number, where topic_relevance is how on-topic the item is and confidence is your certainty in the classification.',
    'Set evidence_polarity to one of positive_method, risk_or_failure, evaluation_baseline, foundation_context, topic_drift, mixed, or unknown, aligned with the primary_role.',
    'Provide a brief classification_rationale and never expose hidden chain-of-thought; supply exclusion_reason when the role is excluded, supply review_reason when the role is review, and list method_families only when the method semantics are clear.',
    'Use only the supplied batch fields (title, abstract, key_content_digest, tags, year, activation score and reason, source_count) and never invent literature, refs, or facts not present in the batch.',
    'Return only JSON matching TopicSelectionResourceSamplingLlmOutput@v1.',
  ].join(' ');
}

export class TopicSelectionResourceSamplingService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;
  private readonly agentOrchestrator: TopicSelectionAgentOrchestratorService;
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: Pick<TopicSelectionModelProfileRegistryService, 'resolveProfile'>;
  private readonly classificationRetry: {
    maxRetriesPerBatch: number;
    backoffMs: (retryIndex: number) => number;
  };

  constructor(private readonly options: ServiceOptions) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
    this.contextPolicyProfileRegistry = options.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.agentOrchestrator = options.agentOrchestrator;
    this.classificationRetry = {
      maxRetriesPerBatch: Math.max(0, Math.trunc(
        options.classificationRetryPolicy?.maxRetriesPerBatch ?? CLASSIFICATION_BATCH_MAX_RETRIES,
      )),
      backoffMs: options.classificationRetryPolicy?.backoffMs
        ?? ((retryIndex) => CLASSIFICATION_BATCH_RETRY_BACKOFF_MS * 2 ** (retryIndex - 1)),
    };
  }

  async createResourceSampleSet(
    input: CreateTopicSelectionResourceSampleInput,
  ): Promise<TopicSelectionResourceSampleResult> {
    const sampleSize = this.normalizeSampleSize(input.sample_size);
    const roleTargets = this.normalizeRoleTargets(sampleSize, input.role_targets);
    const policyVersion = input.policy_version ?? DEFAULT_POLICY_VERSION;
    const createdBy = input.created_by ?? 'system';
    const model = this.normalizeModel(input.model);
    const modelRef = this.modelRef(model);
    const sampleSetId = this.idFactory('resource_sample_set');
    const auditId = this.idFactory('resource_sampling_audit');
    const sampleSetRef = this.ref('resource_sample_set', sampleSetId, input.title_card_id ?? null, policyVersion);
    const auditRef = this.ref('resource_sampling_audit', auditId, input.title_card_id ?? null, policyVersion);

    const candidates = await this.buildCandidatePool(input);
    const inputSnapshot = await this.options.controlPlaneService.compileInputSnapshot({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      target_ref: sampleSetRef,
      source_refs: candidates.map((candidate) => candidate.literature_ref),
      payload: {
        topic_id: input.topic_id,
        sample_size: sampleSize,
        role_targets: roleTargets,
        policy_version: policyVersion,
        seed: input.seed ?? null,
        candidates: candidates.map((candidate) => this.candidateSnapshot(candidate)),
      },
      policy_version: policyVersion,
      created_by: createdBy,
    });

    const eligibleCandidates = candidates.filter((candidate) => candidate.eligibility_status === 'eligible');
    const workflow = await this.options.controlPlaneService.recordWorkflowRun({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      workflow_key: 'topic-selection.resource-sampling-classification',
      workflow_profile_key: TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      status: 'running',
      provider_id: model.providerId,
      model_id: model.modelId,
      prompt_template_id: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
      prompt_template_version: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
      telemetry: {},
      output_summary: {
        status: 'running',
        candidate_count: candidates.length,
        eligible_count: eligibleCandidates.length,
      },
      created_by: createdBy,
    });
    const classification = await this.classifyCandidates({
      input,
      candidates,
      eligibleCandidates,
      sampleSetId,
      workflowRunId: workflow.workflow_run.workflow_run_id,
      model,
      policyVersion,
      roleTargets,
      sampleSize,
      createdBy,
    });
    const assembly = this.assembleSample({
      candidates,
      eligibleCandidates,
      classification,
      sampleSetId,
      sampleSetRef,
      auditRef,
      input,
      sampleSize,
      roleTargets,
      policyVersion,
      modelRef,
    });

    await this.options.controlPlaneService.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'structured_output',
      workflow_run_id: workflow.workflow_run.workflow_run_id,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      payload: {
        llm_structured_output: classification.llmOutput,
        guardrail_summary: assembly.guardrailSummary,
      },
      created_by: createdBy,
    });
    const updatedWorkflow = await this.options.controlPlaneService.updateWorkflowRun(
      workflow.workflow_run.workflow_run_id,
      {
        status: classification.error ? 'failed' : 'succeeded',
        finished_at: this.now(),
        telemetry: classification.telemetry ? { ...classification.telemetry } : {},
        output_summary: {
          status: assembly.status,
          candidate_count: candidates.length,
          eligible_count: eligibleCandidates.length,
          selected_count: assembly.selectedItems.length,
          warning_codes: assembly.warnings,
          classification_batches: classification.batchStats,
        },
        error_code: classification.error ? 'LLM_CLASSIFICATION_FAILED' : null,
        error_message: classification.error ? this.errorMessage(classification.error) : null,
      },
    );
    const workflowArtifactRefs = await this.options.controlPlaneService.listArtifactRefsByWorkflowRunId(
      workflow.workflow_run.workflow_run_id,
    );
    const artifactRefs = workflowArtifactRefs.map((artifact) =>
      this.ref('artifact_ref', artifact.artifact_ref_id, artifact.title_card_id ?? input.title_card_id ?? null),
    );

    const blockers = assembly.status === 'blocked'
      ? [this.gateIssue('RESOURCE_SAMPLE_BLOCKED', 'Resource sampling did not produce a usable sample set.', 'blocking')]
      : [];
    const gate = await this.options.controlPlaneService.runDeterministicGate({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      gate_key: 'topic-selection.resource-sample-ready',
      target_ref: sampleSetRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: updatedWorkflow.workflow_run_id,
      policy_version_id: policyVersion,
      blockers,
      warnings: assembly.warnings.map((warning) =>
        this.gateIssue(warning, `Resource sampling warning: ${warning}`, 'warning'),
      ),
      created_by: createdBy,
    });

    const sampleSet: TopicSelectionResourceSampleSetRecord = {
      resource_sample_set_id: sampleSetId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      topic_id: input.topic_id,
      sample_size: sampleSize,
      policy_version: policyVersion,
      status: assembly.status,
      role_targets: roleTargets,
      role_counts: assembly.roleCounts,
      warnings: assembly.warnings,
      sample_hash: assembly.sampleHash,
      model: modelRef,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      workflow_run_id: updatedWorkflow.workflow_run_id,
      gate_result_id: gate.readiness_gate_result_id,
      audit_ref: auditRef,
      created_by: createdBy,
      created_at: this.now(),
    };
    const audit: TopicSelectionResourceSamplingAuditRecord = {
      resource_sampling_audit_id: auditId,
      sample_set_id: sampleSetId,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      topic_id: input.topic_id,
      policy_version: policyVersion,
      prompt_template_id: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
      prompt_template_version: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
      model: modelRef,
      candidate_count: candidates.length,
      eligible_count: eligibleCandidates.length,
      selected_count: assembly.selectedItems.length,
      excluded_count: assembly.items.filter((item) => item.selected_role === 'excluded').length,
      warning_codes: assembly.warnings,
      guardrail_summary: assembly.guardrailSummary,
      artifact_refs: artifactRefs,
      llm_structured_output: classification.llmOutput as unknown as Record<string, unknown>,
      created_at: this.now(),
    };

    return this.options.repository.createResourceSampleSet({
      sample_set: sampleSet,
      items: assembly.items,
      audit,
    });
  }

  async getResourceSampleSet(sampleSetId: string): Promise<TopicSelectionResourceSampleResult> {
    const result = await this.options.repository.findResourceSampleSetById(sampleSetId);
    if (!result) {
      throw new AppError(404, 'NOT_FOUND', `Resource sample set ${sampleSetId} not found.`);
    }
    return result;
  }

  private async buildCandidatePool(input: CreateTopicSelectionResourceSampleInput): Promise<ResourceCandidate[]> {
    const scopes = await this.options.literatureRepository.listTopicScopesByTopicId(input.topic_id);
    const literatureIds = [...new Set(scopes.map((scope) => scope.literatureId))];
    const literatures = await this.options.literatureRepository.listLiteraturesByIds(literatureIds);
    const literatureById = new Map(literatures.map((literature) => [literature.id, literature]));
    const pipelineStates = await this.options.literatureRepository.listPipelineStatesByLiteratureIds(literatureIds);
    const pipelineByLiteratureId = new Map(pipelineStates.map((state) => [state.literatureId, state]));
    const candidates: ResourceCandidate[] = [];

    for (const scope of scopes.sort((left, right) => left.literatureId.localeCompare(right.literatureId))) {
      const literature = literatureById.get(scope.literatureId);
      if (!literature) {
        continue;
      }
      const sources = await this.options.literatureRepository.listSourcesByLiteratureId(scope.literatureId);
      const pipelineState = pipelineByLiteratureId.get(scope.literatureId) ?? null;
      const exclusionReason = this.eligibilityExclusionReason(scope, literature, pipelineState, sources.length);
      const literatureRef = this.ref('literature_record', literature.id, input.title_card_id ?? null);
      candidates.push({
        topic_id: input.topic_id,
        workspace_id: input.workspace_id ?? null,
        title_card_id: input.title_card_id ?? null,
        literature_ref: literatureRef,
        literature,
        scope,
        pipeline_state: pipelineState,
        source_count: sources.length,
        source_refs: sources.map((source) => this.ref('literature_source', source.id, input.title_card_id ?? null)),
        eligibility_status: exclusionReason ? 'excluded' : 'eligible',
        exclusion_reason: exclusionReason,
        text: [
          literature.title,
          literature.abstractText,
          literature.keyContentDigest,
          literature.tags.join(' '),
          scope.activationReason,
        ].filter(Boolean).join('\n'),
      });
    }
    return candidates;
  }

  private eligibilityExclusionReason(
    scope: TopicLiteratureScopeRecord,
    literature: LiteratureRecord,
    pipelineState: LiteraturePipelineStateRecord | null,
    sourceCount: number,
  ): string | null {
    if (scope.scopeStatus !== 'in_scope') {
      return 'TOPIC_SCOPE_EXCLUDED';
    }
    if (scope.activationStatus !== 'active' && scope.activationStatus !== 'eligible') {
      return `ACTIVATION_${scope.activationStatus.toUpperCase()}`;
    }
    if (!pipelineState?.keyContentReady && !literature.keyContentDigest) {
      return 'KEY_CONTENT_NOT_READY';
    }
    if (sourceCount < 1) {
      return 'SOURCE_MISSING';
    }
    return null;
  }

  private async classifyCandidates(input: {
    input: CreateTopicSelectionResourceSampleInput;
    candidates: ResourceCandidate[];
    eligibleCandidates: ResourceCandidate[];
    sampleSetId: string;
    workflowRunId: string;
    model: LlmModelRef;
    policyVersion: string;
    roleTargets: TopicSelectionResourceRoleTargets;
    sampleSize: number;
    createdBy: 'human' | 'llm' | 'system' | 'hybrid';
  }): Promise<ClassificationOutcome> {
    if (input.eligibleCandidates.length === 0) {
      return {
        guarded: [],
        llmOutput: { classifications: [] },
        telemetry: null,
        error: null,
        batchStats: { batch_count: 0, failed_batch_count: 0, retried_batch_count: 0, retry_attempt_count: 0 },
      };
    }
    const batches = this.chunkCandidates(input.eligibleCandidates, LLM_CLASSIFICATION_BATCH_SIZE);
    const classifications: TopicSelectionResourceCandidateClassificationDraft[] = [];
    const telemetry: LlmCallTelemetry[] = [];
    // W-10 run5 lesson: a batch failure must stay a BATCH failure. Each batch gets bounded
    // retries with backoff; a batch that still fails only blocks its own candidates, and the
    // all-batches-failed case keeps the legacy whole-classification-failed semantics.
    const failedLiteratureIds = new Set<string>();
    let failedBatchCount = 0;
    let retriedBatchCount = 0;
    let retryAttemptCount = 0;
    let lastBatchError: unknown = null;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batchCandidates = batches[batchIndex]!;
      const request = this.classificationRequest({
        input: input.input,
        policyVersion: input.policyVersion,
        roleTargets: input.roleTargets,
        sampleSize: input.sampleSize,
        batchCandidates,
        batchIndex,
        batchCount: batches.length,
      });
      const runtimeContext = this.resourceSamplingBatchRuntimeContext({
        ...input,
        batchCandidates,
        batchIndex,
        batchCount: batches.length,
      });
      const runtimeProfile = this.resolveResourceSamplingRuntimeProfile();
      const runtimeInvocationContextHash = this.resourceSamplingRuntimeInvocationContextHash({
        topicId: input.input.topic_id,
        policyVersion: input.policyVersion,
        roleTargets: input.roleTargets,
        sampleSize: input.sampleSize,
        batchContext: runtimeContext,
        batchIndex,
        batchCount: batches.length,
      });
      const contextPacketHash = this.hash(runtimeContext);

      let batchSucceeded = false;
      for (let retry = 0; retry <= this.classificationRetry.maxRetriesPerBatch; retry += 1) {
        // Retries are distinct attempts end to end: fresh node/invocation attempt ids keep
        // control-plane provenance rows unique and every paid call auditable.
        const attemptSuffix = retry > 0 ? `.retry_${retry}` : '';
        let attemptError: unknown = null;
        try {
          const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionResourceSamplingLlmOutput>({
            workspace_id: input.input.workspace_id ?? null,
            title_card_id: input.input.title_card_id ?? null,
            node_id: TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID,
            workflow_run_id: input.workflowRunId,
            node_attempt_id: `${input.sampleSetId}.batch_${batchIndex + 1}${attemptSuffix}`,
            invocation_attempt_id: `${input.sampleSetId}.${RESOURCE_SAMPLING_INVOCATION_SLOT_ID}.batch_${batchIndex + 1}${attemptSuffix}`,
            execution_mode: 'provider_llm',
            executor_kind: 'single_agent',
            run_mode: 'product',
            profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
            output_contract: TOPIC_SELECTION_RESOURCE_SAMPLING_OUTPUT_CONTRACT,
            model_option_id: this.modelOptionIdForModel(input.model),
            prompt: request.prompt,
            prompt_variant_key: RESOURCE_SAMPLING_INVOCATION_SLOT_ID,
            schema_name: request.schemaName,
            schema: request.schema,
            messages: request.messages,
            input_refs: this.resourceSamplingInputRefs(batchCandidates),
            context_packet_hashes: [contextPacketHash],
            runtime_token_budget: this.resourceSamplingRuntimeTokenBudget({
              runtimeProfile,
              runtimeInvocationContextHash,
              batchContext: runtimeContext,
              compressionAttempt: this.resourceSamplingCompressionAttempt({
                input: input.input,
                policyVersion: input.policyVersion,
                roleTargets: input.roleTargets,
                batchCandidates,
                batchIndex,
                batchCount: batches.length,
                batchContext: runtimeContext,
              }),
            }),
            created_by: input.createdBy,
          });
          const invocationTelemetry = this.gatewayTelemetryFromInvocation(invocation);
          if (invocationTelemetry) {
            telemetry.push(invocationTelemetry);
          }
          let deterministicallyBlocked = false;
          if (invocation.status !== 'succeeded' || !invocation.structured_output) {
            attemptError = this.invocationError(invocation);
            const blockerCodes = invocation.blocker_codes ?? [];
            deterministicallyBlocked = blockerCodes.length > 0 && blockerCodes.every((code) =>
              NON_RETRYABLE_CLASSIFICATION_BLOCKER_PREFIXES.some((prefix) => code.startsWith(prefix)));
          } else {
            classifications.push(...invocation.structured_output.classifications);
            batchSucceeded = true;
            if (retry > 0) {
              retriedBatchCount += 1;
            }
            break;
          }
          if (deterministicallyBlocked) {
            // A pure gate block re-fails identically — record the failure and skip the retries.
            lastBatchError = attemptError;
            break;
          }
        } catch (error) {
          attemptError = error;
          const failedTelemetry = this.errorTelemetry(error);
          if (failedTelemetry) {
            telemetry.push(failedTelemetry);
          }
        }
        lastBatchError = attemptError;
        if (retry < this.classificationRetry.maxRetriesPerBatch) {
          retryAttemptCount += 1;
          await this.sleepMs(this.classificationRetry.backoffMs(retry + 1));
        }
      }
      if (!batchSucceeded) {
        failedBatchCount += 1;
        for (const candidate of batchCandidates) {
          failedLiteratureIds.add(candidate.literature_ref.ref_id);
        }
      }
    }

    const batchStats: ClassificationBatchStats = {
      batch_count: batches.length,
      failed_batch_count: failedBatchCount,
      retried_batch_count: retriedBatchCount,
      retry_attempt_count: retryAttemptCount,
    };
    if (failedBatchCount === batches.length) {
      // Legacy semantics preserved: nothing classified → whole classification failed.
      return {
        guarded: input.eligibleCandidates.map((candidate) => this.blockedClassification(candidate, 'LLM_CLASSIFICATION_FAILED')),
        llmOutput: { classifications: [] },
        telemetry: this.aggregateTelemetry(input.model, telemetry),
        error: lastBatchError ?? new AppError(500, 'INTERNAL_ERROR', 'Resource sampling classification failed for every batch.'),
        batchStats,
      };
    }
    const llmOutput: TopicSelectionResourceSamplingLlmOutput = { classifications };
    const classificationsByLiteratureId = new Map(
      llmOutput.classifications.map((classification) => [
        classification.literature_ref.ref_id,
        classification,
      ]),
    );
    return {
      guarded: input.eligibleCandidates.map((candidate) =>
        failedLiteratureIds.has(candidate.literature_ref.ref_id)
          ? this.blockedClassification(candidate, 'LLM_CLASSIFICATION_FAILED')
          : this.applyGuardrails(candidate, classificationsByLiteratureId.get(candidate.literature_ref.ref_id))),
      llmOutput,
      telemetry: this.aggregateTelemetry(input.model, telemetry),
      error: null,
      batchStats,
    };
  }

  private async sleepMs(ms: number): Promise<void> {
    if (!Number.isFinite(ms) || ms <= 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private classificationRequest(input: {
    input: CreateTopicSelectionResourceSampleInput;
    policyVersion: string;
    roleTargets: TopicSelectionResourceRoleTargets;
    sampleSize: number;
    batchCandidates: ResourceCandidate[];
    batchIndex: number;
    batchCount: number;
  }) {
    return {
      prompt: {
        promptTemplateId: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
        version: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
      },
      messages: this.classificationMessages(input, { includeDigest: true }),
      schemaName: 'topic_selection_resource_sampling_classification',
      schema: topicSelectionResourceSamplingLlmOutputSchema as unknown as Record<string, unknown>,
    };
  }

  /** Shared message builder for the classification batch. The compressed form (D-T128-02)
   *  is the SAME request with `key_content_digest` dropped per candidate — classification can
   *  degrade to title+abstract+tags, so the digest is the one deterministic trim level. */
  private classificationMessages(
    input: {
      input: CreateTopicSelectionResourceSampleInput;
      policyVersion: string;
      roleTargets: TopicSelectionResourceRoleTargets;
      batchCandidates: ResourceCandidate[];
      batchIndex: number;
      batchCount: number;
    },
    options: { includeDigest: boolean },
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system' as const,
        content: buildResourceSamplingClassificationSystemContent(),
      },
      {
        role: 'user' as const,
        content: stableStringify({
          topic_id: input.input.topic_id,
          policy_version: input.policyVersion,
          role_targets: input.roleTargets,
          batch: {
            index: input.batchIndex + 1,
            count: input.batchCount,
          },
          eligible_candidates: input.batchCandidates.map((candidate) => ({
            literature_ref: candidate.literature_ref,
            title: candidate.literature.title,
            abstract: candidate.literature.abstractText,
            key_content_digest: options.includeDigest
              ? candidate.literature.keyContentDigest
              : null,
            tags: candidate.literature.tags,
            year: candidate.literature.year,
            activation_score: candidate.scope.activationScore,
            activation_reason: candidate.scope.activationReason,
            source_count: candidate.source_count,
          })),
        }),
      },
    ];
  }

  private resourceSamplingBatchRuntimeContext(input: {
    input: CreateTopicSelectionResourceSampleInput;
    policyVersion: string;
    roleTargets: TopicSelectionResourceRoleTargets;
    sampleSize: number;
    batchCandidates: ResourceCandidate[];
    batchIndex: number;
    batchCount: number;
  }): ResourceSamplingBatchRuntimeContext {
    return {
      schema_version: 'TopicSelectionResourceSamplingBatchContext@v1',
      node_id: TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID,
      invocation_slot_id: RESOURCE_SAMPLING_INVOCATION_SLOT_ID,
      context_family: 'resource_sampling_literature_classification_batch',
      topic_id: input.input.topic_id,
      sample_size: input.sampleSize,
      role_targets: input.roleTargets,
      policy_version: input.policyVersion,
      batch: {
        index: input.batchIndex + 1,
        count: input.batchCount,
        candidate_count: input.batchCandidates.length,
      },
      eligible_candidates: input.batchCandidates.map((candidate) => ({
        literature_ref: candidate.literature_ref,
        title: candidate.literature.title,
        abstract: candidate.literature.abstractText ?? null,
        key_content_digest: candidate.literature.keyContentDigest ?? null,
        tags: [...candidate.literature.tags],
        year: candidate.literature.year ?? null,
        activation_score: candidate.scope.activationScore ?? null,
        activation_reason: candidate.scope.activationReason ?? null,
        source_count: candidate.source_count,
      })),
    };
  }

  private resolveResourceSamplingRuntimeProfile(): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id:
        TOPIC_SELECTION_RESOURCE_SAMPLING_CONTEXT_RUNTIME_PROFILE_IDS.literature_classification_batch,
      invocation_slot_id: RESOURCE_SAMPLING_INVOCATION_SLOT_ID,
    });
  }

  private resourceSamplingRuntimeInvocationContextHash(input: {
    topicId: string;
    policyVersion: string;
    roleTargets: TopicSelectionResourceRoleTargets;
    sampleSize: number;
    batchContext: ResourceSamplingBatchRuntimeContext;
    batchIndex: number;
    batchCount: number;
  }): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: RESOURCE_SAMPLING_INVOCATION_SLOT_ID,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: input.topicId,
        scenario_case_id: null,
        semantic_scenario_key: this.hash({
          topic_id: input.topicId,
          policy_version: input.policyVersion,
          sample_size: input.sampleSize,
          role_targets: input.roleTargets,
          batch_index: input.batchIndex + 1,
          batch_count: input.batchCount,
          batch_context_hash: this.hash(input.batchContext),
        }),
      },
      loop_context: {
        loop_kind: 'not_applicable',
        loop_stage: null,
        current_round_index: null,
        remaining_round_budget: null,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: {
        debate_loop_id: null,
        debate_policy_id: null,
        round_index: null,
        role: null,
        stage: null,
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: null,
        dynamic_material_refs_hash: null,
      },
    });
  }

  private resourceSamplingRuntimeTokenBudget(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    batchContext: ResourceSamplingBatchRuntimeContext;
    compressionAttempt?: TopicSelectionAgentRuntimeCompressionAttemptInput | null;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    return {
      context_policy_profile: input.runtimeProfile.profile,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      context_payloads: [input.batchContext],
      extra_payloads: [
        {
          output_contract: TOPIC_SELECTION_RESOURCE_SAMPLING_OUTPUT_CONTRACT,
          batch_candidate_count: input.batchContext.batch.candidate_count,
        },
      ],
      compression_attempt: input.compressionAttempt ?? null,
    };
  }

  /** D-T128-02: deterministic structural compression attempt for a classification batch.
   *  One trim level — drop `key_content_digest` per candidate; titles/abstracts/tags/refs are
   *  preserved and DECLARED preserved, the digest is deliberately NOT listed as required.
   *  Within budget the orchestrator ignores this entirely; over budget it validates, records
   *  the report, re-gates the compressed form, and continues instead of fail-closing. */
  private resourceSamplingCompressionAttempt(input: {
    input: CreateTopicSelectionResourceSampleInput;
    policyVersion: string;
    roleTargets: TopicSelectionResourceRoleTargets;
    batchCandidates: ResourceCandidate[];
    batchIndex: number;
    batchCount: number;
    batchContext: ResourceSamplingBatchRuntimeContext;
  }): TopicSelectionAgentRuntimeCompressionAttemptInput {
    const compressedContext: ResourceSamplingBatchRuntimeContext = {
      ...input.batchContext,
      eligible_candidates: input.batchContext.eligible_candidates.map((candidate) => ({
        ...candidate,
        key_content_digest: null,
      })),
    };
    const literatureRefIds = input.batchCandidates.map((candidate) => candidate.literature_ref.ref_id);
    const titleFactIds = input.batchCandidates
      .filter((candidate) => (candidate.literature.title ?? '').trim().length > 0)
      .map((candidate) => candidate.literature_ref.ref_id);
    const preservedFacts = {
      topic_id: [input.input.topic_id],
      sample_role_targets: Object.keys(input.roleTargets),
      literature_ref: literatureRefIds,
      candidate_title: titleFactIds,
      candidate_abstract: input.batchCandidates
        .filter((candidate) => (candidate.literature.abstractText ?? '').trim().length > 0)
        .map((candidate) => candidate.literature_ref.ref_id),
    };
    return {
      source_refs: this.resourceSamplingInputRefs(input.batchCandidates),
      input_context: input.batchContext,
      compressed_context: compressedContext,
      summary: {
        schema_version: 'TopicSelectionResourceSamplingCompressionSummary@v1',
        dropped_fields: ['key_content_digest'],
        candidate_count: input.batchCandidates.length,
        preserved_fields: [
          'literature_ref',
          'title',
          'abstract',
          'tags',
          'year',
          'activation_score',
          'activation_reason',
          'source_count',
        ],
      },
      compressed_messages: this.classificationMessages(input, { includeDigest: false }),
      compression_executor_kind: 'deterministic_structural',
      required_preserved_facts: preservedFacts,
      compressed_preserved_facts: preservedFacts,
    };
  }

  private resourceSamplingInputRefs(candidates: ResourceCandidate[]): TopicSelectionFunctionalRef[] {
    const refs = candidates.flatMap((candidate) => [
      candidate.literature_ref,
      ...candidate.source_refs,
    ]);
    return this.uniqueRefs(refs);
  }

  private modelOptionIdForModel(model: LlmModelRef): string {
    if (model.providerId !== 'openai' && model.providerId !== 'dashscope') {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'resource sampling model.provider_id must match a registered runtime model option.',
      );
    }
    return this.modelOptionIdForProvider(model.providerId);
  }

  private modelOptionIdForProvider(providerId: 'openai' | 'dashscope'): string {
    return providerId === 'dashscope'
      ? `${TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID}.dashscope-thinking-budget`
      : `${TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID}.openai-balanced`;
  }

  private registeredModelForProvider(providerId: 'openai' | 'dashscope'): LlmModelRef {
    const resolved = this.modelProfileRegistry.resolveProfile({
      profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID,
      execution_mode: 'provider_llm',
      run_mode: 'product',
      model_option_id: this.modelOptionIdForProvider(providerId),
    });
    const option = resolved.selected_model_option;
    if (!option) {
      throw new AppError(500, 'INTERNAL_ERROR', 'resource sampling model profile did not resolve a provider model option.');
    }
    return {
      providerId: option.provider_id,
      modelId: option.model_id,
      profileId: resolved.profile.profile_id,
    };
  }

  private invocationError(
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionResourceSamplingLlmOutput>,
  ): AppError {
    return new AppError(
      400,
      'INVALID_PAYLOAD',
      `Resource sampling runtime invocation failed: ${
        invocation.blocker_codes[0] ?? invocation.error_code ?? invocation.status
      }.`,
    );
  }

  private gatewayTelemetryFromInvocation(
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionResourceSamplingLlmOutput>,
  ): LlmCallTelemetry | null {
    const telemetry = invocation.provenance.telemetry;
    if (!telemetry) {
      return null;
    }
    if (
      telemetry.provider_id !== 'openai'
      && telemetry.provider_id !== 'dashscope'
      && telemetry.provider_id !== 'deepseek'
    ) {
      return null;
    }
    return {
      provider_id: telemetry.provider_id,
      model_id: telemetry.model_id,
      profile_id: telemetry.profile_id,
      prompt_template_id: telemetry.prompt_template_id,
      prompt_template_version: telemetry.prompt_template_version,
      elapsed_ms: telemetry.elapsed_ms,
      request_count: telemetry.request_count,
      retry_count: telemetry.retry_count,
      timeout_count: telemetry.timeout_count,
      rate_limit_count: telemetry.rate_limit_count,
      input_tokens: telemetry.input_tokens,
      output_tokens: telemetry.output_tokens,
      embedding_input_tokens: telemetry.embedding_input_tokens,
      total_tokens: telemetry.total_tokens,
      cost_usd: telemetry.cost_usd,
      provider_side_cache_hit: telemetry.provider_side_cache_hit,
      provider_side_cache_read_tokens: telemetry.provider_side_cache_read_tokens,
      provider_side_cache_write_tokens: telemetry.provider_side_cache_write_tokens,
    };
  }

  private chunkCandidates(candidates: ResourceCandidate[], size: number): ResourceCandidate[][] {
    const chunks: ResourceCandidate[][] = [];
    for (let index = 0; index < candidates.length; index += size) {
      chunks.push(candidates.slice(index, index + size));
    }
    return chunks;
  }

  private aggregateTelemetry(model: LlmModelRef, telemetry: LlmCallTelemetry[]): LlmCallTelemetry | null {
    if (telemetry.length === 0) {
      return null;
    }
    return {
      provider_id: model.providerId,
      model_id: model.modelId,
      profile_id: model.profileId ?? null,
      prompt_template_id: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
      prompt_template_version: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
      elapsed_ms: telemetry.reduce((sum, item) => sum + item.elapsed_ms, 0),
      request_count: telemetry.reduce((sum, item) => sum + item.request_count, 0),
      retry_count: telemetry.reduce((sum, item) => sum + item.retry_count, 0),
      timeout_count: telemetry.reduce((sum, item) => sum + item.timeout_count, 0),
      rate_limit_count: telemetry.reduce((sum, item) => sum + item.rate_limit_count, 0),
      input_tokens: this.sumTelemetryValues(telemetry, 'input_tokens'),
      output_tokens: this.sumTelemetryValues(telemetry, 'output_tokens'),
      embedding_input_tokens: this.sumTelemetryValues(telemetry, 'embedding_input_tokens'),
      total_tokens: this.sumTelemetryValues(telemetry, 'total_tokens'),
      cost_usd: this.sumTelemetryValues(telemetry, 'cost_usd'),
      provider_side_cache_hit: this.anyProviderSideCacheHit(telemetry),
      provider_side_cache_read_tokens: this.sumTelemetryValues(telemetry, 'provider_side_cache_read_tokens'),
      provider_side_cache_write_tokens: this.sumTelemetryValues(telemetry, 'provider_side_cache_write_tokens'),
    };
  }

  private sumTelemetryValues(
    telemetry: LlmCallTelemetry[],
    key:
      | 'input_tokens'
      | 'output_tokens'
      | 'embedding_input_tokens'
      | 'total_tokens'
      | 'cost_usd'
      | 'provider_side_cache_read_tokens'
      | 'provider_side_cache_write_tokens',
  ): number | null {
    let total = 0;
    let seen = false;
    for (const item of telemetry) {
      const value = item[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        total += value;
        seen = true;
      }
    }
    return seen ? total : null;
  }

  private anyProviderSideCacheHit(telemetry: LlmCallTelemetry[]): boolean | null {
    let seen = false;
    for (const item of telemetry) {
      if (item.provider_side_cache_hit === true) {
        return true;
      }
      if (item.provider_side_cache_hit === false) {
        seen = true;
      }
    }
    return seen ? false : null;
  }

  private errorTelemetry(error: unknown): LlmCallTelemetry | null {
    if (error instanceof LlmGatewayError) {
      return error.telemetry ?? null;
    }
    return null;
  }

  private applyGuardrails(
    candidate: ResourceCandidate,
    draft: TopicSelectionResourceCandidateClassificationDraft | undefined,
  ): GuardedClassification {
    const guardrailCodes: string[] = [];
    if (!draft) {
      guardrailCodes.push('LLM_MISSING_CLASSIFICATION');
      return {
        candidate,
        selected_role: 'review',
        topic_relevance: 0,
        evidence_polarity: 'unknown',
        role_scores: { ...ZERO_ROLE_SCORES, review: 1 },
        confidence: 0,
        classification_rationale: 'No LLM classification was returned for this candidate.',
        exclusion_reason: null,
        review_reason: 'LLM_MISSING_CLASSIFICATION',
        guardrail_codes: guardrailCodes,
        method_families: [],
      };
    }

    let selectedRole = this.normalizeRole(draft.primary_role);
    let roleScores = this.normalizeRoleScores(draft.role_scores);
    let evidencePolarity = this.normalizeEvidencePolarity(draft.evidence_polarity);
    let classificationRationale = draft.classification_rationale;
    let methodFamilies = draft.method_families ?? [];
    const deterministicSignals = this.detectDeterministicRoleSignals(candidate);
    let topicRelevance = this.clampUnit(draft.topic_relevance);
    let exclusionReason = draft.exclusion_reason ?? null;
    let reviewReason = draft.review_reason ?? null;
    let preferredRole = this.deterministicPreferredRole(deterministicSignals);
    if (this.shouldPreferBaselineRole({
      signals: deterministicSignals,
      selectedRole,
      evidencePolarity,
      roleScores,
      draft,
    })) {
      preferredRole = 'baseline';
    }
    let topicDriftBlocked = false;

    if (
      TARGET_ROLES.includes(selectedRole as typeof TARGET_ROLES[number])
      && deterministicSignals.broadFoundationOnly
    ) {
      selectedRole = 'review';
      reviewReason = reviewReason ?? 'FOUNDATIONAL_CONTEXT_TOO_GENERAL';
      guardrailCodes.push('FOUNDATIONAL_CONTEXT_TOO_GENERAL');
    }

    if (topicRelevance < 0.2 || evidencePolarity === 'topic_drift') {
      selectedRole = topicRelevance < 0.2 ? 'excluded' : 'review';
      evidencePolarity = evidencePolarity === 'topic_drift' ? 'topic_drift' : evidencePolarity;
      exclusionReason = selectedRole === 'excluded' ? exclusionReason ?? 'TOPIC_RELEVANCE_TOO_LOW' : exclusionReason;
      reviewReason = selectedRole === 'review' ? reviewReason ?? 'TOPIC_DRIFT_REVIEW' : reviewReason;
      guardrailCodes.push(selectedRole === 'excluded' ? 'TOPIC_RELEVANCE_EXCLUDED' : 'TOPIC_DRIFT_REVIEW');
      topicDriftBlocked = true;
    }

    if (!topicDriftBlocked && preferredRole) {
      const deterministicRelevance = this.deterministicTopicRelevance(deterministicSignals, preferredRole);
      if (topicRelevance < deterministicRelevance) {
        topicRelevance = deterministicRelevance;
        guardrailCodes.push(`DETERMINISTIC_RELEVANCE_FLOOR_${preferredRole.toUpperCase()}`);
      }
      if (selectedRole !== preferredRole) {
        const previousRole = selectedRole;
        selectedRole = preferredRole;
        evidencePolarity = this.evidencePolarityForRole(preferredRole, evidencePolarity);
        roleScores = this.boostRoleScore(roleScores, preferredRole);
        classificationRationale = this.classificationRationaleForCanonicalRole(preferredRole);
        methodFamilies = this.methodFamiliesForCanonicalRole(preferredRole, candidate, methodFamilies);
        exclusionReason = null;
        reviewReason = null;
        guardrailCodes.push(previousRole === 'support' && preferredRole === 'challenge'
          ? 'RISK_HEAVY_NOT_SUPPORT'
          : `DETERMINISTIC_ROLE_CANONICALIZED_${preferredRole.toUpperCase()}`);
      }
    }

    if (
      TARGET_ROLES.includes(selectedRole as typeof TARGET_ROLES[number])
      && topicRelevance < TARGET_ROLE_RELEVANCE_FLOOR
    ) {
      selectedRole = 'review';
      reviewReason = reviewReason ?? 'TARGET_ROLE_RELEVANCE_TOO_LOW';
      guardrailCodes.push('TARGET_ROLE_RELEVANCE_TOO_LOW');
    }

    if (
      selectedRole === 'baseline'
      && (
        !deterministicSignals.topicCore
        || (evidencePolarity !== 'evaluation_baseline' && !deterministicSignals.baseline)
      )
    ) {
      selectedRole = 'review';
      reviewReason = reviewReason ?? (
        deterministicSignals.topicCore
          ? 'BASELINE_REQUIRES_EVALUATION_SEMANTICS'
          : 'BASELINE_REQUIRES_TOPIC_CORE_SEMANTICS'
      );
      guardrailCodes.push(deterministicSignals.topicCore
        ? 'BASELINE_REQUIRES_EVALUATION_SEMANTICS'
        : 'BASELINE_REQUIRES_TOPIC_CORE_SEMANTICS');
    }

    if (selectedRole === 'excluded' && !exclusionReason) {
      exclusionReason = 'LLM_CLASSIFIED_EXCLUDED';
    }
    if (selectedRole === 'review' && !reviewReason) {
      reviewReason = 'LLM_CLASSIFIED_REVIEW';
    }

    return {
      candidate,
      selected_role: selectedRole,
      topic_relevance: topicRelevance,
      evidence_polarity: evidencePolarity,
      role_scores: roleScores,
      confidence: this.clampUnit(draft.confidence),
      classification_rationale: classificationRationale,
      exclusion_reason: exclusionReason,
      review_reason: reviewReason,
      guardrail_codes: guardrailCodes,
      method_families: methodFamilies,
    };
  }

  private classificationRationaleForCanonicalRole(role: typeof TARGET_ROLES[number]): string {
    return {
      support: 'Deterministic guardrails selected support because the resource has topic-core positive method signals.',
      challenge: 'Deterministic guardrails selected challenge because the resource has hard risk or failure-mode signals.',
      baseline: 'Deterministic guardrails selected baseline because the resource has benchmark, evaluation, or comparison semantics.',
      context: 'Deterministic guardrails selected context because the resource is useful for foundation or background framing.',
    }[role];
  }

  private methodFamiliesForCanonicalRole(
    role: typeof TARGET_ROLES[number],
    candidate: ResourceCandidate,
    existingFamilies: string[],
  ): string[] {
    const cleanedFamilies = existingFamilies.filter((family) =>
      !/risk|attack|security|poison|failure/i.test(family));
    const literatureText = [
      candidate.literature.title,
      candidate.literature.abstractText,
      candidate.literature.keyContentDigest,
      candidate.literature.tags.join(' '),
    ].filter(Boolean).join('\n');
    const canonicalFamily = {
      support: FINE_TUNING_PATTERN.test(literatureText)
        ? 'fine_tuning'
        : 'retrieval_augmented_generation',
      challenge: 'risk_analysis',
      baseline: 'evaluation',
      context: 'foundation_context',
    }[role];
    return [...new Set([...cleanedFamilies, canonicalFamily])];
  }

  private assembleSample(input: {
    candidates: ResourceCandidate[];
    eligibleCandidates: ResourceCandidate[];
    classification: ClassificationOutcome;
    sampleSetId: string;
    sampleSetRef: TopicSelectionFunctionalRef;
    auditRef: TopicSelectionFunctionalRef;
    input: CreateTopicSelectionResourceSampleInput;
    sampleSize: number;
    roleTargets: TopicSelectionResourceRoleTargets;
    policyVersion: string;
    modelRef: TopicSelectionResourceSamplingModelRef;
  }): SampleAssembly {
    const warnings = new Set<string>();
    if (input.classification.error) {
      warnings.add('LLM_CLASSIFICATION_FAILED');
    } else if (input.classification.batchStats.failed_batch_count > 0) {
      // Some batches failed after retries but the rest classified: their candidates are
      // review-blocked individually and the run continues on the surviving classifications.
      warnings.add('LLM_CLASSIFICATION_PARTIAL');
    }
    if (input.eligibleCandidates.length === 0) {
      warnings.add('NO_ELIGIBLE_RESOURCE_CANDIDATES');
    }

    const guarded = [
      ...input.classification.guarded,
      ...input.candidates
        .filter((candidate) => candidate.eligibility_status === 'excluded')
        .map((candidate) => this.excludedEligibilityClassification(candidate)),
    ];
    const selectedRanked = input.classification.error
      ? []
      : this.selectRoleBalancedCandidates(guarded, input.roleTargets, input.sampleSize, warnings);
    const selectedIds = new Set(selectedRanked.map((candidate) => candidate.candidate.literature_ref.ref_id));
    const ranked: RankedCandidate[] = [
      ...selectedRanked.map((candidate, index) => ({ ...candidate, selected: true, rank: index + 1 })),
      ...guarded
        .filter((candidate) => !selectedIds.has(candidate.candidate.literature_ref.ref_id))
        .sort((left, right) => this.compareCandidates(left, right, left.selected_role))
        .map((candidate, index) => ({
          ...candidate,
          selected: false,
          rank: input.sampleSize + index + 1,
        })),
    ];
    const items = ranked.map((candidate) => this.toItemRecord(input.sampleSetId, candidate));
    const selectedItems = items.filter((item) => item.selected);
    const roleCounts = selectedItems.reduce<TopicSelectionResourceRoleCounts>((counts, item) => {
      counts[item.selected_role] += 1;
      return counts;
    }, { ...EMPTY_ROLE_COUNTS });
    for (const role of TARGET_ROLES) {
      if (roleCounts[role] < input.roleTargets[role]) {
        warnings.add(`ROLE_TARGET_UNDERFILLED_${role.toUpperCase()}`);
      }
    }
    if (selectedItems.length < input.sampleSize) {
      warnings.add('SAMPLE_SIZE_UNDERFILLED');
    }
    if (this.requiresFineTuningWarning(input.candidates, ranked)) {
      warnings.add('FINE_TUNING_UNDERCOVERED');
    }
    if (ranked.some((candidate) => candidate.selected_role === 'context' && !candidate.selected)) {
      warnings.add('CONTEXT_CAP_APPLIED');
    }
    const status: TopicSelectionResourceSampleSetStatus =
      input.classification.error || selectedItems.length === 0 || input.eligibleCandidates.length === 0
        ? 'blocked'
        : warnings.size > 0
          ? 'ready_with_warning'
          : 'ready';
    const sampleHash = sha256Text(stableStringify({
      policy_version: input.policyVersion,
      topic_id: input.input.topic_id,
      sample_size: input.sampleSize,
      role_targets: input.roleTargets,
      seed: input.input.seed ?? null,
      selected_items: selectedItems.map((item) => ({
        literature_ref: item.literature_ref,
        selected_role: item.selected_role,
        rank: item.rank,
      })),
    }));

    return {
      status,
      items,
      selectedItems,
      warnings: [...warnings].sort(),
      roleCounts,
      sampleHash,
      guardrailSummary: {
        target_ref: input.sampleSetRef,
        audit_ref: input.auditRef,
        policy_version: input.policyVersion,
        role_targets: input.roleTargets,
        guardrail_counts: this.countGuardrails(items),
        eligibility: {
          candidate_count: input.candidates.length,
          eligible_count: input.eligibleCandidates.length,
          excluded_count: input.candidates.length - input.eligibleCandidates.length,
        },
      },
    };
  }

  private selectRoleBalancedCandidates(
    guarded: GuardedClassification[],
    roleTargets: TopicSelectionResourceRoleTargets,
    sampleSize: number,
    warnings: Set<string>,
  ): GuardedClassification[] {
    const selected: GuardedClassification[] = [];
    const selectedIds = new Set<string>();
    for (const role of TARGET_ROLES) {
      const candidates = guarded
        .filter((candidate) => candidate.selected_role === role)
        .sort((left, right) => this.compareCandidates(left, right, role));
      const target = roleTargets[role];
      for (const candidate of candidates.slice(0, target)) {
        selected.push(candidate);
        selectedIds.add(candidate.candidate.literature_ref.ref_id);
      }
      if (role === 'context' && candidates.length > target) {
        warnings.add('CONTEXT_CAP_APPLIED');
      }
    }
    if (selected.length >= sampleSize) {
      return selected.slice(0, sampleSize);
    }
    const fillCandidates = guarded
      .filter((candidate) =>
        TARGET_ROLES.includes(candidate.selected_role as typeof TARGET_ROLES[number])
        && !selectedIds.has(candidate.candidate.literature_ref.ref_id)
        && candidate.selected_role !== 'context')
      .sort((left, right) => this.compareCandidates(left, right, left.selected_role));
    for (const candidate of fillCandidates) {
      selected.push(candidate);
      if (selected.length >= sampleSize) {
        break;
      }
    }
    return selected;
  }

  private compareCandidates(
    left: GuardedClassification,
    right: GuardedClassification,
    role: TopicSelectionResourceSampleRole,
  ): number {
    return this.selectionScore(right, role) - this.selectionScore(left, role)
      || (right.candidate.scope.activationScore ?? 0) - (left.candidate.scope.activationScore ?? 0)
      || (right.candidate.literature.year ?? 0) - (left.candidate.literature.year ?? 0)
      || left.candidate.literature.title.localeCompare(right.candidate.literature.title)
      || left.candidate.literature.id.localeCompare(right.candidate.literature.id);
  }

  private selectionScore(candidate: GuardedClassification, role: TopicSelectionResourceSampleRole): number {
    const signals = this.detectDeterministicRoleSignals(candidate.candidate);
    let score = 0;
    if (signals.topicCore) {
      score += 3;
    }
    if (role === 'challenge' && signals.strongChallenge) {
      score += 6;
    }
    if (role === 'challenge' && signals.riskHeavy) {
      score += 3;
    }
    if (role === 'support' && signals.positiveMethod) {
      score += 5;
    }
    if (role === 'baseline' && signals.baseline) {
      score += 5;
    }
    if (role === 'context' && signals.topicCore) {
      score += 4;
    }
    if (role === 'context' && signals.positiveMethod && !signals.titleStrongTopicCore) {
      score -= 2;
    }
    if (signals.broadFoundationOnly) {
      score -= 10;
    }
    return score + Math.min(candidate.candidate.source_count, 5) * 0.05;
  }

  private detectDeterministicRoleSignals(candidate: ResourceCandidate): DeterministicRoleSignals {
    const candidateText = [
      candidate.text,
      candidate.literature.title,
      candidate.literature.abstractText,
      candidate.literature.keyContentDigest,
      candidate.literature.tags.join(' '),
    ].filter(Boolean).join('\n');
    const topicCore = TOPIC_CORE_PATTERN.test(candidateText);
    const hasBroadFoundationTag = candidate.literature.tags.some((tag) => BROAD_FOUNDATION_TAGS.has(tag));
    const hardChallenge = HARD_CHALLENGE_PATTERN.test(candidateText);
    const mitigationOnly = RISK_MITIGATION_ONLY_PATTERN.test(candidateText) && !hardChallenge;
    const adversarialConversationOnly = ADVERSARIAL_CONVERSATION_PATTERN.test(candidateText) && !hardChallenge;
    const challengeSuppressed = mitigationOnly || adversarialConversationOnly;
    return {
      topicCore,
      titleStrongTopicCore: TITLE_STRONG_TOPIC_CORE_PATTERN.test(candidate.literature.title),
      hardChallenge,
      strongChallenge: STRONG_CHALLENGE_PATTERN.test(candidateText) && !challengeSuppressed,
      riskHeavy: RISK_HEAVY_PATTERN.test(candidateText) && !challengeSuppressed,
      baseline: BASELINE_PATTERN.test(candidateText),
      positiveMethod: POSITIVE_METHOD_PATTERN.test(candidateText),
      benchmarkFirst: BENCHMARK_FIRST_PATTERN.test(candidate.literature.title),
      contextOrientation: CONTEXT_ORIENTATION_PATTERN.test(candidateText),
      broadFoundationOnly: hasBroadFoundationTag && !topicCore,
    };
  }

  private shouldPreferBaselineRole(input: {
    signals: DeterministicRoleSignals;
    selectedRole: TopicSelectionResourceSampleRole;
    evidencePolarity: TopicSelectionResourceEvidencePolarity;
    roleScores: TopicSelectionResourceRoleScores;
    draft: TopicSelectionResourceCandidateClassificationDraft;
  }): boolean {
    if (
      !input.signals.topicCore
      || !input.signals.baseline
      || !input.signals.benchmarkFirst
      || input.signals.hardChallenge
    ) {
      return false;
    }
    const rationale = [
      input.draft.classification_rationale,
      ...(input.draft.method_families ?? []),
    ].join(' ');
    const llmBaselineSignal =
      input.selectedRole === 'baseline'
      || input.evidencePolarity === 'evaluation_baseline'
      || input.roleScores.baseline >= 0.7
      || /\b(benchmark|evaluation|baseline|comparison|compare|metric|dataset|leaderboard|empirical)\b/i.test(rationale);
    return llmBaselineSignal;
  }

  private deterministicPreferredRole(
    signals: DeterministicRoleSignals,
  ): typeof TARGET_ROLES[number] | null {
    if (signals.topicCore && signals.benchmarkFirst && signals.baseline && !signals.strongChallenge) {
      return 'baseline';
    }
    if (signals.riskHeavy) {
      return 'challenge';
    }
    if (signals.topicCore && signals.contextOrientation && !signals.benchmarkFirst) {
      return 'context';
    }
    if (signals.topicCore && signals.positiveMethod && signals.titleStrongTopicCore) {
      return 'support';
    }
    if (signals.topicCore && signals.positiveMethod && !signals.titleStrongTopicCore) {
      return 'context';
    }
    if (signals.topicCore && signals.baseline) {
      return 'baseline';
    }
    return null;
  }

  private deterministicTopicRelevance(
    signals: DeterministicRoleSignals,
    role: typeof TARGET_ROLES[number],
  ): number {
    let relevance = role === 'context' ? 0.78 : 0.86;
    if (signals.titleStrongTopicCore) {
      relevance += 0.06;
    }
    if (signals.riskHeavy || signals.benchmarkFirst) {
      relevance += 0.04;
    }
    if (signals.broadFoundationOnly) {
      return 0;
    }
    return Math.min(0.98, relevance);
  }

  private evidencePolarityForRole(
    role: TopicSelectionResourceSampleRole,
    current: TopicSelectionResourceEvidencePolarity,
  ): TopicSelectionResourceEvidencePolarity {
    if (role === 'challenge') {
      return 'risk_or_failure';
    }
    if (role === 'baseline') {
      return 'evaluation_baseline';
    }
    if (role === 'context') {
      return 'foundation_context';
    }
    if (role === 'support') {
      return 'positive_method';
    }
    return current;
  }

  private boostRoleScore(
    roleScores: TopicSelectionResourceRoleScores,
    role: TopicSelectionResourceSampleRole,
  ): TopicSelectionResourceRoleScores {
    const boosted = { ...roleScores };
    const maxScore = Math.max(...TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES.map((sampleRole) => roleScores[sampleRole]));
    boosted[role] = Math.max(roleScores[role], maxScore, 1);
    return boosted;
  }

  private toItemRecord(sampleSetId: string, candidate: RankedCandidate): TopicSelectionResourceSampleItemRecord {
    return {
      resource_sample_item_id: this.idFactory('resource_sample_item'),
      sample_set_id: sampleSetId,
      workspace_id: candidate.candidate.workspace_id,
      title_card_id: candidate.candidate.title_card_id,
      topic_id: candidate.candidate.topic_id,
      literature_ref: candidate.candidate.literature_ref,
      selected_role: candidate.selected_role,
      selected: candidate.selected,
      rank: candidate.rank,
      topic_relevance: candidate.topic_relevance,
      evidence_polarity: candidate.evidence_polarity,
      role_scores: candidate.role_scores,
      confidence: candidate.confidence,
      classification_rationale: candidate.classification_rationale,
      exclusion_reason: candidate.exclusion_reason,
      review_reason: candidate.review_reason,
      guardrail_codes: candidate.guardrail_codes,
      method_families: candidate.method_families,
      created_at: this.now(),
    };
  }

  private excludedEligibilityClassification(candidate: ResourceCandidate): GuardedClassification {
    return {
      candidate,
      selected_role: 'excluded',
      topic_relevance: 0,
      evidence_polarity: 'unknown',
      role_scores: { ...ZERO_ROLE_SCORES, excluded: 1 },
      confidence: 1,
      classification_rationale: 'Excluded by deterministic eligibility gate.',
      exclusion_reason: candidate.exclusion_reason ?? 'ELIGIBILITY_EXCLUDED',
      review_reason: null,
      guardrail_codes: ['ELIGIBILITY_GATE_EXCLUDED'],
      method_families: [],
    };
  }

  private blockedClassification(candidate: ResourceCandidate, reason: string): GuardedClassification {
    return {
      candidate,
      selected_role: 'review',
      topic_relevance: 0,
      evidence_polarity: 'unknown',
      role_scores: { ...ZERO_ROLE_SCORES, review: 1 },
      confidence: 0,
      classification_rationale: 'Candidate requires review because semantic classification failed.',
      exclusion_reason: null,
      review_reason: reason,
      guardrail_codes: [reason],
      method_families: [],
    };
  }

  private normalizeSampleSize(sampleSize: number | undefined): number {
    const value = sampleSize ?? DEFAULT_SAMPLE_SIZE;
    if (!Number.isFinite(value) || value < 1) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'sample_size must be a positive number.');
    }
    return Math.trunc(value);
  }

  private normalizeRoleTargets(
    sampleSize: number,
    inputTargets?: Partial<TopicSelectionResourceRoleTargets>,
  ): TopicSelectionResourceRoleTargets {
    const base = Math.floor(sampleSize / TARGET_ROLES.length);
    const targets: TopicSelectionResourceRoleTargets = {
      support: base,
      challenge: base,
      baseline: base,
      context: base,
    };
    let remaining = sampleSize - base * TARGET_ROLES.length;
    for (const role of TARGET_ROLES) {
      if (remaining <= 0) {
        break;
      }
      targets[role] += 1;
      remaining -= 1;
    }
    for (const role of TARGET_ROLES) {
      const override = inputTargets?.[role];
      if (override !== undefined && Number.isFinite(override) && override >= 0) {
        targets[role] = Math.trunc(override);
      }
    }
    let total = TARGET_ROLES.reduce((sum, role) => sum + targets[role], 0);
    while (total > sampleSize) {
      const role = TARGET_ROLES
        .slice()
        .reverse()
        .find((candidateRole) => targets[candidateRole] > 0);
      if (!role) {
        break;
      }
      targets[role] -= 1;
      total -= 1;
    }
    let cursor = 0;
    while (total < sampleSize) {
      targets[TARGET_ROLES[cursor % TARGET_ROLES.length]!] += 1;
      total += 1;
      cursor += 1;
    }
    return targets;
  }

  private normalizeModel(raw: CreateTopicSelectionResourceSampleInput['model']): LlmModelRef {
    if (!raw) {
      return this.registeredModelForProvider('openai');
    }
    const record = raw as Record<string, unknown>;
    const providerId = record.providerId ?? record.provider_id;
    const modelId = record.modelId ?? record.model_id;
    const profileId = record.profileId ?? record.profile_id;
    if (
      typeof profileId === 'string'
      && profileId
      && profileId !== TOPIC_SELECTION_RESOURCE_SAMPLING_CLASSIFICATION_PROFILE_ID
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'resource sampling model.profile_id must match the registered runtime profile.',
      );
    }
    const normalizedProviderInput = typeof providerId === 'string' ? providerId.trim() : null;
    if (
      providerId !== undefined
      && providerId !== null
      && normalizedProviderInput !== 'openai'
      && normalizedProviderInput !== 'dashscope'
    ) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'resource sampling model.provider_id must match a registered runtime model option.',
      );
    }
    const normalizedProviderId = normalizedProviderInput === 'dashscope' ? 'dashscope' : 'openai';
    const registeredModel = this.registeredModelForProvider(normalizedProviderId);
    if (typeof modelId === 'string' && modelId && modelId !== registeredModel.modelId) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'resource sampling model.model_id must match a registered runtime model option.',
      );
    }
    return registeredModel;
  }

  private modelRef(model: LlmModelRef): TopicSelectionResourceSamplingModelRef {
    return {
      provider_id: model.providerId,
      model_id: model.modelId,
      profile_id: model.profileId ?? null,
    };
  }

  private normalizeRole(role: unknown): TopicSelectionResourceSampleRole {
    return typeof role === 'string' && TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES.includes(role as TopicSelectionResourceSampleRole)
      ? role as TopicSelectionResourceSampleRole
      : 'review';
  }

  private normalizeEvidencePolarity(value: unknown): TopicSelectionResourceEvidencePolarity {
    const allowed = new Set<TopicSelectionResourceEvidencePolarity>([
      'positive_method',
      'risk_or_failure',
      'evaluation_baseline',
      'foundation_context',
      'topic_drift',
      'mixed',
      'unknown',
    ]);
    return typeof value === 'string' && allowed.has(value as TopicSelectionResourceEvidencePolarity)
      ? value as TopicSelectionResourceEvidencePolarity
      : 'unknown';
  }

  private normalizeRoleScores(value: Partial<TopicSelectionResourceRoleScores> | undefined): TopicSelectionResourceRoleScores {
    return TOPIC_SELECTION_RESOURCE_SAMPLE_ROLES.reduce<TopicSelectionResourceRoleScores>((scores, role) => {
      scores[role] = this.clampUnit(value?.[role] ?? 0);
      return scores;
    }, { ...ZERO_ROLE_SCORES });
  }

  private clampUnit(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return 0;
    }
    return Math.min(1, Math.max(0, value));
  }

  private candidateSnapshot(candidate: ResourceCandidate): Record<string, unknown> {
    return {
      literature_ref: candidate.literature_ref,
      title: candidate.literature.title,
      year: candidate.literature.year,
      activation_status: candidate.scope.activationStatus,
      activation_score: candidate.scope.activationScore,
      pipeline_key_content_ready: candidate.pipeline_state?.keyContentReady ?? false,
      source_count: candidate.source_count,
      eligibility_status: candidate.eligibility_status,
      exclusion_reason: candidate.exclusion_reason,
    };
  }

  private requiresFineTuningWarning(candidates: ResourceCandidate[], ranked: RankedCandidate[]): boolean {
    const topicHasFineTuningSignal = candidates.some((candidate) => FINE_TUNING_PATTERN.test(candidate.text));
    const selectedHasFineTuningSignal = ranked.some((candidate) =>
      candidate.selected
      && (
        FINE_TUNING_PATTERN.test(candidate.candidate.text)
        || candidate.method_families.some((family) => FINE_TUNING_PATTERN.test(family))
      ));
    return topicHasFineTuningSignal && !selectedHasFineTuningSignal;
  }

  private countGuardrails(items: TopicSelectionResourceSampleItemRecord[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      for (const code of item.guardrail_codes) {
        counts[code] = (counts[code] ?? 0) + 1;
      }
    }
    return counts;
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string | null,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId ?? null,
      version_id: versionId ?? null,
    };
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const output: TopicSelectionFunctionalRef[] = [];
    for (const refValue of refs) {
      const key = this.hash(refValue);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      output.push(refValue);
    }
    return output;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private gateIssue(code: string, message: string, severity: TopicSelectionGateIssue['severity']): TopicSelectionGateIssue {
    return { code, message, severity, refs: [] };
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
