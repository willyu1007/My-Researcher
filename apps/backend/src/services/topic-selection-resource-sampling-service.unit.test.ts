import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResourceCandidateClassificationDraft,
  TopicSelectionResourceEvidencePolarity,
  TopicSelectionResourceSampleRole,
  TopicSelectionResourceSamplingLlmOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-resource-sampling-contracts';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionResourceSamplingRepository } from '../repositories/in-memory-topic-selection-resource-sampling-repository.js';
import { PrismaTopicSelectionResourceSamplingRepository } from '../repositories/prisma/prisma-topic-selection-resource-sampling-repository.js';
import type {
  LiteraturePipelineStateRecord,
  LiteratureRecord,
  LiteratureRepository,
  LiteratureSourceRecord,
  TopicLiteratureScopeRecord,
} from '../repositories/literature-repository.js';
import {
  type LlmCallTelemetry,
  type LlmStructuredOutputRequest,
} from './llm-gateway.js';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentOrchestratorLlmGateway,
} from './topic-selection-agent-orchestrator-service.js';
import {
  buildResourceSamplingClassificationSystemContent,
  TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID,
  TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
  TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
  TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY,
  TopicSelectionResourceSamplingService,
} from './topic-selection-resource-sampling-service.js';
import { sha256Text } from './literature-content-processing-utils.js';

const NOW = '2026-05-17T08:00:00.000Z';
const TOPIC_ID = 'ai-rag-finetuning-2022-2026';
const TITLE_CARD_ID = 'title_card_sampling_1';

function ref(id: string): TopicSelectionFunctionalRef {
  return {
    ref_type: 'literature_record',
    ref_id: id,
    title_card_id: TITLE_CARD_ID,
    version_id: null,
  };
}

function makeTelemetry(): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-5.5',
    profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY,
    prompt_template_id: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_ID,
    prompt_template_version: TOPIC_SELECTION_RESOURCE_SAMPLING_PROMPT_TEMPLATE_VERSION,
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: 100,
    output_tokens: 200,
    embedding_input_tokens: null,
    total_tokens: 300,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

class StubLlmGateway implements TopicSelectionAgentOrchestratorLlmGateway {
  calls: LlmStructuredOutputRequest[] = [];

  constructor(private readonly output: TopicSelectionResourceSamplingLlmOutput | Error) {}

  async createStructuredOutput<T>(request: LlmStructuredOutputRequest) {
    this.calls.push(request);
    if (this.output instanceof Error) {
      throw this.output;
    }
    return {
      parsed: this.output as T,
      raw: { output: this.output },
      telemetry: makeTelemetry(),
    };
  }
}

function batchAwareStructuredOutput<T>(request: LlmStructuredOutputRequest) {
  const payload = JSON.parse(request.messages[1]?.content ?? '{}') as {
    eligible_candidates?: Array<{ literature_ref: TopicSelectionFunctionalRef }>;
  };
  const candidates = payload.eligible_candidates ?? [];
  const output: TopicSelectionResourceSamplingLlmOutput = {
    classifications: candidates.map((candidate) => batchClassification(candidate.literature_ref)),
  };
  return {
    parsed: output as T,
    raw: { output },
    telemetry: {
      ...makeTelemetry(),
      input_tokens: candidates.length * 10,
      output_tokens: candidates.length * 20,
      total_tokens: candidates.length * 30,
    },
  };
}

class BatchAwareLlmGateway implements TopicSelectionAgentOrchestratorLlmGateway {
  calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(request: LlmStructuredOutputRequest) {
    this.calls.push(request);
    return batchAwareStructuredOutput<T>(request);
  }
}

/** BatchAware gateway that throws a synthetic transient failure on the given 1-based call
 *  numbers — retries shift call order deterministically, so fail-sets model per-attempt flakes. */
class FlakyBatchAwareLlmGateway implements TopicSelectionAgentOrchestratorLlmGateway {
  calls: LlmStructuredOutputRequest[] = [];

  constructor(private readonly failOnCalls: Set<number>) {}

  async createStructuredOutput<T>(request: LlmStructuredOutputRequest) {
    this.calls.push(request);
    if (this.failOnCalls.has(this.calls.length)) {
      throw new Error(`synthetic transient provider failure on call ${this.calls.length}`);
    }
    return batchAwareStructuredOutput<T>(request);
  }
}

function makeIdFactory() {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${next}`;
  };
}

function literature(id: string, title: string, keyContentDigest: string, tags: string[] = []): LiteratureRecord {
  return {
    id,
    title,
    abstractText: keyContentDigest,
    keyContentDigest,
    authors: ['A. Author'],
    year: 2025,
    doiNormalized: null,
    arxivId: null,
    normalizedTitle: title.toLowerCase(),
    titleAuthorsYearHash: `${id}_hash`,
    rightsClass: 'OA',
    tags,
    activeEmbeddingVersionId: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function batchRoleForId(id: string): TopicSelectionResourceSampleRole {
  const index = Number(id.match(/(\d+)$/)?.[1] ?? '0');
  return (['support', 'challenge', 'baseline', 'context'] as const)[index % 4];
}

function batchEvidencePolarity(role: TopicSelectionResourceSampleRole): TopicSelectionResourceEvidencePolarity {
  if (role === 'challenge') {
    return 'risk_or_failure';
  }
  if (role === 'baseline') {
    return 'evaluation_baseline';
  }
  if (role === 'context') {
    return 'foundation_context';
  }
  return 'positive_method';
}

function batchClassification(refValue: TopicSelectionFunctionalRef): TopicSelectionResourceCandidateClassificationDraft {
  const role = batchRoleForId(refValue.ref_id);
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  return {
    literature_ref: refValue,
    primary_role: role,
    topic_relevance: role === 'context' ? 0.72 : 0.9,
    evidence_polarity: batchEvidencePolarity(role),
    role_scores: { ...scores, [role]: 0.9 },
    confidence: 0.86,
    classification_rationale: `${role} evidence for batched sampling.`,
    method_families: [role],
  };
}

function batchLiteratureRecords(count: number): LiteratureRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `lit_batch_${String(index).padStart(3, '0')}`;
    const role = batchRoleForId(id);
    const digestByRole: Record<string, string> = {
      support: 'Positive RAG method evidence with grounded generation improvements.',
      challenge: 'Adversarial attack, poisoning, and source verification risk evidence for RAG.',
      baseline: 'Benchmark evaluation, comparison dataset, and metric evidence for retrieval methods.',
      context: 'Foundation context and background material for retrieval augmented systems.',
    };
    const titleByRole: Record<string, string> = {
      support: `RAG support method ${index}`,
      challenge: `RAG poisoning challenge ${index}`,
      baseline: `RAG benchmark baseline ${index}`,
      context: `RAG foundation context ${index}`,
    };
    return literature(id, titleByRole[role]!, digestByRole[role]!, [role]);
  });
}

function scope(literatureId: string, activationScore = 0.8): TopicLiteratureScopeRecord {
  return {
    id: `scope_${literatureId}`,
    topicId: TOPIC_ID,
    literatureId,
    scopeStatus: 'in_scope',
    reason: null,
    activationStatus: 'active',
    activationReason: 'Activated for topic sampling.',
    activationScore,
    activatedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function pipeline(literatureId: string): LiteraturePipelineStateRecord {
  return {
    id: `pipeline_${literatureId}`,
    literatureId,
    citationComplete: true,
    abstractReady: true,
    keyContentReady: true,
    dedupStatus: 'unique',
    updatedAt: NOW,
  };
}

function source(literatureId: string): LiteratureSourceRecord {
  return {
    id: `source_${literatureId}`,
    literatureId,
    provider: 'manual',
    sourceItemId: `source_item_${literatureId}`,
    sourceUrl: `https://example.test/${literatureId}`,
    rawPayload: {},
    fetchedAt: NOW,
  };
}

function makeLiteratureRepository(records: LiteratureRecord[]): LiteratureRepository {
  const byId = new Map(records.map((record) => [record.id, record]));
  const scopes = records.map((record, index) => scope(record.id, 0.9 - index * 0.03));
  const pipelines = records.map((record) => pipeline(record.id));
  const sources = records.map((record) => source(record.id));
  return {
    listTopicScopesByTopicId: async (topicId: string) =>
      topicId === TOPIC_ID ? scopes : [],
    listLiteraturesByIds: async (ids: string[]) =>
      ids.map((id) => byId.get(id)).filter((record): record is LiteratureRecord => Boolean(record)),
    listPipelineStatesByLiteratureIds: async (ids: string[]) =>
      pipelines.filter((record) => ids.includes(record.literatureId)),
    listSourcesByLiteratureId: async (literatureId: string) =>
      sources.filter((record) => record.literatureId === literatureId),
  } as Partial<LiteratureRepository> as LiteratureRepository;
}

function makeLlmOutput(): TopicSelectionResourceSamplingLlmOutput {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  return {
    classifications: [
      {
        literature_ref: ref('lit_rag_positive'),
        primary_role: 'support',
        topic_relevance: 0.94,
        evidence_polarity: 'positive_method',
        role_scores: { ...scores, support: 0.95 },
        confidence: 0.9,
        classification_rationale: 'Shows a positive RAG method result.',
        method_families: ['rag'],
      },
      {
        literature_ref: ref('lit_poisoning_risk'),
        primary_role: 'support',
        topic_relevance: 0.9,
        evidence_polarity: 'risk_or_failure',
        role_scores: { ...scores, support: 0.92, challenge: 0.86 },
        confidence: 0.88,
        classification_rationale: 'Discusses poisoning attacks and source verification failure modes.',
        method_families: ['rag_security'],
      },
      {
        literature_ref: ref('lit_benchmark'),
        primary_role: 'baseline',
        topic_relevance: 0.86,
        evidence_polarity: 'evaluation_baseline',
        role_scores: { ...scores, baseline: 0.91 },
        confidence: 0.84,
        classification_rationale: 'Benchmark and comparison evidence for retrieval methods.',
        method_families: ['benchmark'],
      },
      {
        literature_ref: ref('lit_foundation'),
        primary_role: 'context',
        topic_relevance: 0.79,
        evidence_polarity: 'foundation_context',
        role_scores: { ...scores, context: 0.88 },
        confidence: 0.82,
        classification_rationale: 'Foundation context for retrieval augmented generation.',
        method_families: ['foundation'],
      },
      {
        literature_ref: ref('lit_topic_drift'),
        primary_role: 'excluded',
        topic_relevance: 0.1,
        evidence_polarity: 'topic_drift',
        role_scores: { ...scores, excluded: 0.9 },
        confidence: 0.92,
        classification_rationale: 'Drifts into unrelated wireless sensing.',
        exclusion_reason: 'TOPIC_DRIFT',
        method_families: [],
      },
      {
        literature_ref: ref('lit_lora_review'),
        primary_role: 'review',
        topic_relevance: 0.72,
        evidence_polarity: 'mixed',
        role_scores: { ...scores, review: 0.8 },
        confidence: 0.75,
        classification_rationale: 'LoRA fine-tuning evidence needs human review before sampling.',
        review_reason: 'FINE_TUNING_AMBIGUOUS',
        method_families: ['lora'],
      },
    ],
  };
}

function makeAgentOrchestrator(
  controlPlane: TopicSelectionControlPlaneService,
  llmGateway: TopicSelectionAgentOrchestratorLlmGateway,
): TopicSelectionAgentOrchestratorService {
  return new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
  });
}

function makeService(
  output: TopicSelectionResourceSamplingLlmOutput | Error,
  records: LiteratureRecord[] = [
    literature('lit_rag_positive', 'RAG improves answer grounding', 'Retrieval augmented generation improves factual grounding.', ['rag']),
    literature('lit_poisoning_risk', 'Poisoning attacks against RAG', 'Adversarial poisoning and source verification failures in RAG.', ['security']),
    literature('lit_benchmark', 'RAG benchmark comparison', 'Benchmark evaluation and comparison dataset for retrieval methods.', ['benchmark']),
    literature('lit_foundation', 'Foundation overview for RAG', 'Foundation context and background for retrieval augmented systems.', ['context']),
    literature('lit_topic_drift', 'Wireless sensor routing', 'Wireless routing unrelated to RAG and fine-tuning.', ['drift']),
    literature('lit_lora_review', 'LoRA fine-tuning for RAG', 'LoRA fine-tuning adapter evidence for RAG workflows.', ['fine-tuning']),
  ],
) {
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: makeIdFactory(), now: () => NOW },
  );
  const llmGateway = new StubLlmGateway(output);
  return new TopicSelectionResourceSamplingService({
    repository: new InMemoryTopicSelectionResourceSamplingRepository(),
    literatureRepository: makeLiteratureRepository(records),
    controlPlaneService: controlPlane,
    agentOrchestrator: makeAgentOrchestrator(controlPlane, llmGateway),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
}

function bulkLiterature(count: number): LiteratureRecord[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `lit_bulk_${String(index + 1).padStart(2, '0')}`;
    return literature(
      id,
      `Bulk retrieval paper ${index + 1}`,
      `Digest for bulk paper ${index + 1} covering retrieval augmented generation evidence.`,
      ['bulk'],
    );
  });
}

function makeRetryService(gateway: TopicSelectionAgentOrchestratorLlmGateway, records: LiteratureRecord[]) {
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: makeIdFactory(), now: () => NOW },
  );
  const orchestrator = makeAgentOrchestrator(controlPlane, gateway);
  const invocationAttemptIds: string[] = [];
  const originalInvoke = orchestrator.invokeStructuredOutput.bind(orchestrator);
  orchestrator.invokeStructuredOutput = (async (
    request: Parameters<TopicSelectionAgentOrchestratorService['invokeStructuredOutput']>[0],
  ) => {
    invocationAttemptIds.push(request.invocation_attempt_id ?? '');
    return originalInvoke(request);
  }) as TopicSelectionAgentOrchestratorService['invokeStructuredOutput'];
  const service = new TopicSelectionResourceSamplingService({
    repository: new InMemoryTopicSelectionResourceSamplingRepository(),
    literatureRepository: makeLiteratureRepository(records),
    controlPlaneService: controlPlane,
    agentOrchestrator: orchestrator,
    idFactory: makeIdFactory(),
    now: () => NOW,
    classificationRetryPolicy: { backoffMs: () => 0 },
  });
  return { service, invocationAttemptIds };
}

test('resource sampling classifies roles, applies guardrails, and emits coverage warnings', async () => {
  const service = makeService(makeLlmOutput());

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: {
      support: 1,
      challenge: 1,
      baseline: 1,
      context: 1,
    },
  });

  assert.equal(result.sample_set.status, 'ready_with_warning');
  assert.equal(result.selected_items.length, 4);
  assert.deepEqual(result.sample_set.role_counts, {
    support: 1,
    challenge: 1,
    baseline: 1,
    context: 1,
    review: 0,
    excluded: 0,
  });
  const poisoning = result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_poisoning_risk');
  assert.equal(poisoning?.selected_role, 'challenge');
  assert.equal(poisoning?.selected, true);
  assert.ok(poisoning?.guardrail_codes.includes('RISK_HEAVY_NOT_SUPPORT'));
  assert.equal(result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_benchmark')?.selected_role, 'baseline');
  assert.equal(result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_foundation')?.selected_role, 'context');
  assert.equal(result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_topic_drift')?.selected_role, 'excluded');
  assert.ok(result.sample_set.warnings.includes('FINE_TUNING_UNDERCOVERED'));
  assert.equal(result.audit.eligible_count, 6);
  assert.equal(result.audit.selected_count, 4);
});

test('resource sampling routes provider batches through runtime audit and token budget gate', async () => {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(
    controlPlaneRepository,
    { idFactory: makeIdFactory(), now: () => NOW },
  );
  const llmGateway = new StubLlmGateway(makeLlmOutput());
  const service = new TopicSelectionResourceSamplingService({
    repository: new InMemoryTopicSelectionResourceSamplingRepository(),
    literatureRepository: makeLiteratureRepository([
      literature('lit_rag_positive', 'RAG improves answer grounding', 'Retrieval augmented generation improves factual grounding.', ['rag']),
      literature('lit_poisoning_risk', 'Poisoning attacks against RAG', 'Adversarial poisoning and source verification failures in RAG.', ['security']),
      literature('lit_benchmark', 'RAG benchmark comparison', 'Benchmark evaluation and comparison dataset for retrieval methods.', ['benchmark']),
      literature('lit_foundation', 'Foundation overview for RAG', 'Foundation context and background for retrieval augmented systems.', ['context']),
    ]),
    controlPlaneService: controlPlane,
    agentOrchestrator: makeAgentOrchestrator(controlPlane, llmGateway),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
  });

  assert.equal(llmGateway.calls.length, 1);
  assert.equal(llmGateway.calls[0]!.model.providerId, 'openai');
  assert.equal(llmGateway.calls[0]!.model.modelId, 'gpt-5.5');
  assert.equal(llmGateway.calls[0]!.model.profileId, TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY);
  assert.equal(
    llmGateway.calls[0]!.executionContext.metadata?.model_option_id,
    `${TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY}.openai-balanced`,
  );
  assert.equal(result.sample_set.workflow_run_id?.startsWith('workflow_run_'), true);
  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(result.sample_set.workflow_run_id!);
  const runtimeAudit = artifacts.find((artifact) => {
    const payload = artifact.payload as Record<string, unknown> | null;
    return payload?.schema_version === 'topic-selection-agent-invocation-audit-v1';
  });
  assert.ok(runtimeAudit);
  const auditPayload = runtimeAudit.payload as {
    node_id: string;
    provenance: {
      prompt_packet_hash: string;
      prompt_quality_report_ref?: TopicSelectionFunctionalRef | null;
      redacted_prompt_artifact_ref?: TopicSelectionFunctionalRef | null;
      source_kind: string;
      non_provider: boolean;
      cache_status: string;
    };
    token_budget_gate_result: { decision: string } | null;
  };
  assert.equal(auditPayload.node_id, TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_ID);
  assert.equal(auditPayload.provenance.source_kind, 'provider_response');
  assert.equal(auditPayload.provenance.non_provider, false);
  assert.equal(auditPayload.provenance.cache_status, 'not_applicable');
  assert.equal(auditPayload.provenance.prompt_packet_hash.length, 64);
  assert.equal(auditPayload.provenance.prompt_quality_report_ref?.ref_type, 'artifact_ref');
  assert.equal(auditPayload.provenance.redacted_prompt_artifact_ref?.ref_type, 'artifact_ref');
  assert.equal(auditPayload.token_budget_gate_result?.decision, 'within_budget');
  assert.equal(
    artifacts.some((artifact) =>
      (artifact.payload as Record<string, unknown> | null)?.payload_schema
        === 'TopicSelectionPromptQualityReport@v1'),
    true,
  );
  assert.equal(
    artifacts.some((artifact) =>
      (artifact.payload as Record<string, unknown> | null)?.payload_schema
        === 'TopicSelectionRedactedPromptPacketArtifact@v1'),
    true,
  );
});

test('resource sampling rejects providers outside registered runtime options', async () => {
  const service = makeService(makeLlmOutput());

  await assert.rejects(
    () => service.createResourceSampleSet({
      topic_id: TOPIC_ID,
      title_card_id: TITLE_CARD_ID,
      sample_size: 4,
      model: {
        provider_id: 'deepseek',
        model_id: 'deepseek-v4-pro',
        profile_id: TOPIC_SELECTION_RESOURCE_SAMPLING_WORKFLOW_PROFILE_KEY,
      } as never,
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message.includes('registered runtime model option'),
  );
});

test('resource sampling keeps low-relevance target-role candidates out of the selected sample', async () => {
  const output = makeLlmOutput();
  output.classifications = output.classifications.map((classification) =>
    classification.literature_ref.ref_id === 'lit_lora_review'
      ? {
          ...classification,
          primary_role: 'context',
          topic_relevance: 0.55,
          evidence_polarity: 'foundation_context',
          role_scores: { ...classification.role_scores, context: 0.85, review: 0 },
          review_reason: undefined,
        }
      : classification,
  );
  const service = makeService(output);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: {
      support: 1,
      challenge: 1,
      baseline: 1,
      context: 1,
    },
  });

  const lora = result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_lora_review');
  assert.equal(lora?.selected_role, 'review');
  assert.equal(lora?.selected, false);
  assert.ok(lora?.guardrail_codes.includes('TARGET_ROLE_RELEVANCE_TOO_LOW'));
});

test('resource sampling returns ready_with_warning when role targets and sample size are underfilled', async () => {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  const records = [
    literature('lit_support_only', 'RAG support method', 'Positive retrieval augmented generation method evidence.', ['rag']),
    literature('lit_challenge_only', 'RAG poisoning risk', 'Adversarial poisoning and source verification risk evidence for RAG.', ['security']),
  ];
  const service = makeService({
    classifications: [
      {
        literature_ref: ref('lit_support_only'),
        primary_role: 'support',
        topic_relevance: 0.9,
        evidence_polarity: 'positive_method',
        role_scores: { ...scores, support: 0.9 },
        confidence: 0.86,
        classification_rationale: 'Supportive RAG method evidence.',
        method_families: ['rag'],
      },
      {
        literature_ref: ref('lit_challenge_only'),
        primary_role: 'challenge',
        topic_relevance: 0.9,
        evidence_polarity: 'risk_or_failure',
        role_scores: { ...scores, challenge: 0.9 },
        confidence: 0.86,
        classification_rationale: 'Challenge evidence for poisoning and source verification risk.',
        method_families: ['rag_security'],
      },
    ],
  }, records);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: {
      support: 1,
      challenge: 1,
      baseline: 1,
      context: 1,
    },
  });

  assert.equal(result.sample_set.status, 'ready_with_warning');
  assert.equal(result.selected_items.length, 2);
  assert.deepEqual(result.sample_set.role_counts, {
    support: 1,
    challenge: 1,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  });
  assert.ok(result.sample_set.warnings.includes('ROLE_TARGET_UNDERFILLED_BASELINE'));
  assert.ok(result.sample_set.warnings.includes('ROLE_TARGET_UNDERFILLED_CONTEXT'));
  assert.ok(result.sample_set.warnings.includes('SAMPLE_SIZE_UNDERFILLED'));
});

test('resource sampling produces stable sample hash for identical input and policy', async () => {
  const first = await makeService(makeLlmOutput()).createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    seed: 'deterministic-seed',
  });
  const second = await makeService(makeLlmOutput()).createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    seed: 'deterministic-seed',
  });

  assert.equal(first.sample_set.sample_hash, second.sample_set.sample_hash);
});

test('resource sampling keeps deterministic sample identity when LLM role and relevance drift', async () => {
  const firstOutput = makeLlmOutput();
  const secondOutput = makeLlmOutput();
  secondOutput.classifications = secondOutput.classifications.map((classification) => {
    if (classification.literature_ref.ref_id === 'lit_poisoning_risk') {
      return {
        ...classification,
        primary_role: 'review',
        topic_relevance: 0.52,
        evidence_polarity: 'mixed',
        role_scores: { ...classification.role_scores, support: 0, challenge: 0.2, review: 0.8 },
        review_reason: 'LLM_UNCERTAIN_RISK_ROLE',
      };
    }
    if (classification.literature_ref.ref_id === 'lit_benchmark') {
      return {
        ...classification,
        primary_role: 'support',
        topic_relevance: 0.56,
        evidence_polarity: 'positive_method',
        role_scores: { ...classification.role_scores, support: 0.76, baseline: 0.2 },
      };
    }
    if (classification.literature_ref.ref_id === 'lit_foundation') {
      return {
        ...classification,
        primary_role: 'review',
        topic_relevance: 0.54,
        evidence_polarity: 'mixed',
        role_scores: { ...classification.role_scores, context: 0.2, review: 0.78 },
        review_reason: 'LLM_UNCERTAIN_CONTEXT_ROLE',
      };
    }
    return classification;
  });

  const first = await makeService(firstOutput).createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    seed: 'deterministic-seed',
  });
  const second = await makeService(secondOutput).createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    seed: 'deterministic-seed',
  });
  const selectedSignature = (result: Awaited<ReturnType<TopicSelectionResourceSamplingService['createResourceSampleSet']>>) =>
    result.selected_items.map((item) => `${item.rank}:${item.literature_ref.ref_id}:${item.selected_role}`);

  assert.deepEqual(selectedSignature(second), selectedSignature(first));
  assert.equal(second.sample_set.sample_hash, first.sample_set.sample_hash);
  assert.ok(
    second.candidate_items
      .find((item) => item.literature_ref.ref_id === 'lit_poisoning_risk')
      ?.guardrail_codes.includes('DETERMINISTIC_RELEVANCE_FLOOR_CHALLENGE'),
  );
});

test('resource sampling keeps benchmark-first hallucination evaluation in baseline role', async () => {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  const records = [
    literature('lit_rag_positive', 'RAG improves answer grounding', 'Retrieval augmented generation improves factual grounding.', ['rag']),
    literature('lit_poisoning_risk', 'Poisoning attacks against RAG', 'Adversarial poisoning and source verification failures in RAG.', ['security']),
    literature(
      'lit_hallucination_benchmark',
      'RAG hallucination benchmark for abstract QA',
      'Benchmark evaluation dataset with explicit hallucination coverage metrics and retrieval comparison.',
      ['benchmark'],
    ),
    literature('lit_foundation', 'Foundation overview for RAG', 'Foundation context and background for retrieval augmented systems.', ['context']),
  ];
  const service = makeService({
    classifications: [
      {
        literature_ref: ref('lit_rag_positive'),
        primary_role: 'support',
        topic_relevance: 0.9,
        evidence_polarity: 'positive_method',
        role_scores: { ...scores, support: 0.9 },
        confidence: 0.9,
        classification_rationale: 'Positive RAG method evidence.',
        method_families: ['rag'],
      },
      {
        literature_ref: ref('lit_poisoning_risk'),
        primary_role: 'challenge',
        topic_relevance: 0.9,
        evidence_polarity: 'risk_or_failure',
        role_scores: { ...scores, challenge: 0.9 },
        confidence: 0.9,
        classification_rationale: 'Poisoning and source verification failures.',
        method_families: ['rag_security'],
      },
      {
        literature_ref: ref('lit_hallucination_benchmark'),
        primary_role: 'challenge',
        topic_relevance: 0.9,
        evidence_polarity: 'risk_or_failure',
        role_scores: { ...scores, challenge: 0.86, baseline: 0.7 },
        confidence: 0.88,
        classification_rationale: 'LLM classified hallucination diagnostics as a challenge resource.',
        method_families: ['benchmark'],
      },
      {
        literature_ref: ref('lit_foundation'),
        primary_role: 'context',
        topic_relevance: 0.8,
        evidence_polarity: 'foundation_context',
        role_scores: { ...scores, context: 0.86 },
        confidence: 0.85,
        classification_rationale: 'Foundation context.',
        method_families: ['foundation'],
      },
    ],
  }, records);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
  });

  const benchmark = result.candidate_items.find((item) => item.literature_ref.ref_id === 'lit_hallucination_benchmark');
  assert.equal(benchmark?.selected_role, 'baseline');
  assert.ok(benchmark?.guardrail_codes.includes('DETERMINISTIC_ROLE_CANONICALIZED_BASELINE'));
  assert.equal(result.sample_set.role_counts.baseline, 1);
});

test('resource sampling lets baseline-oriented LLM evidence override generic risk words', async () => {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  const records = [
    literature(
      'lit_robust_eval',
      'RAG benchmark generation with leakage filters',
      'Benchmark generation pipeline with leakage filters, robust evaluation metrics, and comparison baselines.',
      ['rag', 'benchmark'],
    ),
  ];
  const service = makeService({
    classifications: [{
      literature_ref: ref('lit_robust_eval'),
      primary_role: 'challenge',
      topic_relevance: 0.9,
      evidence_polarity: 'risk_or_failure',
      role_scores: { ...scores, challenge: 0.82, baseline: 0.91 },
      confidence: 0.88,
      classification_rationale: 'Primarily baseline/evaluation material despite leakage-filter terminology.',
      method_families: ['benchmark'],
    }],
  }, records);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 1,
  });

  const item = result.candidate_items.find((candidate) => candidate.literature_ref.ref_id === 'lit_robust_eval');
  assert.equal(item?.selected_role, 'baseline');
  assert.ok(item?.guardrail_codes.includes('DETERMINISTIC_ROLE_CANONICALIZED_BASELINE'));
});

test('resource sampling rewrites rationale and method family when guardrails canonicalize support', async () => {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  const records = [
    literature(
      'lit_self_verifying_rag',
      'Agentic Retrieval-Augmented Generation for Financial Document Question Answering',
      'We propose an agentic RAG framework with iterative retrieval-reasoning loops and self-verification for financial numerical reasoning.',
      ['rag'],
    ),
  ];
  const service = makeService({
    classifications: [{
      literature_ref: ref('lit_self_verifying_rag'),
      primary_role: 'challenge',
      topic_relevance: 0.86,
      evidence_polarity: 'risk_or_failure',
      role_scores: { ...scores, support: 0.12, challenge: 0.92 },
      confidence: 0.84,
      classification_rationale: 'Risk or failure-mode evidence for the topic-selection challenge role.',
      method_families: ['risk_analysis'],
    }],
  }, records);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 1,
  });

  const item = result.candidate_items.find((candidate) => candidate.literature_ref.ref_id === 'lit_self_verifying_rag');
  assert.equal(item?.selected_role, 'support');
  assert.equal(item?.evidence_polarity, 'positive_method');
  assert.ok(item?.guardrail_codes.includes('DETERMINISTIC_ROLE_CANONICALIZED_SUPPORT'));
  assert.equal(item?.classification_rationale.includes('risk'), false);
  assert.equal(item?.classification_rationale.includes('failure'), false);
  assert.equal(item?.method_families.includes('risk_analysis'), false);
  assert.ok(item?.method_families.includes('retrieval_augmented_generation'));
});

test('resource sampling does not force mitigation or emotional-memory papers into challenge', async () => {
  const scores = {
    support: 0,
    challenge: 0,
    baseline: 0,
    context: 0,
    review: 0,
    excluded: 0,
  };
  const records = [
    literature(
      'lit_grounded_tutor',
      'Grounded RAG tutoring system',
      'A RAG tutoring system delivers hallucination-free education and addresses the risks of misinformation through teacher-provided materials.',
      ['rag'],
    ),
    literature(
      'lit_emotional_memory',
      'Emotion-attended stateful memory',
      'A stateful memory architecture improves personalized conversations and remains effective in emotionally adversarial conversations.',
      ['rag', 'fine-tuning'],
    ),
  ];
  const service = makeService({
    classifications: [
      {
        literature_ref: ref('lit_grounded_tutor'),
        primary_role: 'support',
        topic_relevance: 0.88,
        evidence_polarity: 'positive_method',
        role_scores: { ...scores, support: 0.92 },
        confidence: 0.86,
        classification_rationale: 'Supportive grounded RAG system.',
        method_families: ['rag'],
      },
      {
        literature_ref: ref('lit_emotional_memory'),
        primary_role: 'context',
        topic_relevance: 0.82,
        evidence_polarity: 'foundation_context',
        role_scores: { ...scores, context: 0.9 },
        confidence: 0.84,
        classification_rationale: 'Memory architecture context rather than a risk paper.',
        method_families: ['stateful memory'],
      },
    ],
  }, records);

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 2,
  });

  const tutor = result.candidate_items.find((candidate) => candidate.literature_ref.ref_id === 'lit_grounded_tutor');
  const memory = result.candidate_items.find((candidate) => candidate.literature_ref.ref_id === 'lit_emotional_memory');
  assert.equal(tutor?.selected_role, 'support');
  assert.equal(memory?.selected_role, 'context');
  assert.ok(!tutor?.guardrail_codes.includes('RISK_HEAVY_NOT_SUPPORT'));
  assert.ok(!memory?.guardrail_codes.includes('DETERMINISTIC_ROLE_CANONICALIZED_CHALLENGE'));
});

test('resource sampling chunks large candidate pools before LLM classification', async () => {
  const llmGateway = new BatchAwareLlmGateway();
  const controlPlane = new TopicSelectionControlPlaneService(
    new InMemoryTopicSelectionControlPlaneRepository(),
    { idFactory: makeIdFactory(), now: () => NOW },
  );
  const service = new TopicSelectionResourceSamplingService({
    repository: new InMemoryTopicSelectionResourceSamplingRepository(),
    literatureRepository: makeLiteratureRepository(batchLiteratureRecords(60)),
    controlPlaneService: controlPlane,
    agentOrchestrator: makeAgentOrchestrator(controlPlane, llmGateway),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 16,
  });

  const batchPayloads = llmGateway.calls.map((call) =>
    JSON.parse(call.messages[1]?.content ?? '{}') as {
      eligible_candidates: Array<{ literature_ref: TopicSelectionFunctionalRef }>;
    },
  );
  assert.deepEqual(batchPayloads.map((payload) => payload.eligible_candidates.length), [24, 24, 12]);
  assert.equal(new Set(
    batchPayloads.flatMap((payload) =>
      payload.eligible_candidates.map((candidate) => candidate.literature_ref.ref_id),
    ),
  ).size, 60);
  assert.notEqual(result.sample_set.status, 'blocked');
  assert.equal(result.audit.eligible_count, 60);
  assert.equal((result.audit.llm_structured_output.classifications as unknown[]).length, 60);
  assert.deepEqual(result.sample_set.role_counts, {
    support: 4,
    challenge: 4,
    baseline: 4,
    context: 4,
    review: 0,
    excluded: 0,
  });
});

test('resource sampling blocks instead of falling back when LLM classification fails', async () => {
  const service = makeService(new Error('provider unavailable'));

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
  });

  assert.equal(result.sample_set.status, 'blocked');
  assert.equal(result.selected_items.length, 0);
  assert.ok(result.sample_set.warnings.includes('LLM_CLASSIFICATION_FAILED'));
  assert.ok(result.candidate_items.every((item) => item.selected_role === 'review'));
});

test('Prisma resource sampling repository round-trips sample set, items, audit, and hash counts', async () => {
  const source = await makeService(makeLlmOutput()).createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
  });
  const fake = new FakeResourceSamplingPrismaClient();
  const repository = new PrismaTopicSelectionResourceSamplingRepository(fake.client);

  const persisted = await repository.createResourceSampleSet({
    sample_set: source.sample_set,
    items: source.candidate_items,
    audit: source.audit,
  });
  const readBack = await repository.findResourceSampleSetById(source.sample_set.resource_sample_set_id);

  assert.equal(persisted.sample_set.sample_hash, source.sample_set.sample_hash);
  assert.deepEqual(persisted.sample_set.role_counts, source.sample_set.role_counts);
  assert.equal(readBack?.sample_set.sample_hash, source.sample_set.sample_hash);
  assert.equal(readBack?.candidate_items.length, source.candidate_items.length);
  assert.equal(readBack?.audit.selected_count, source.audit.selected_count);
});

test('resource sampling migration declares sample set, item, audit persistence', async () => {
  const sql = await fs.readFile(
    new URL('../../../../prisma/migrations/20260517120000_add_topic_selection_resource_sampling/migration.sql', import.meta.url),
    'utf8',
  );

  assert.match(sql, /CREATE TABLE "TopicSelectionResourceSampleSet"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionResourceSampleItem"/);
  assert.match(sql, /CREATE TABLE "TopicSelectionResourceSamplingAudit"/);
  assert.match(sql, /"sampleHash" TEXT NOT NULL/);
  assert.match(sql, /"roleCounts" JSONB NOT NULL/);
  assert.match(sql, /"llmStructuredOutput" JSONB NOT NULL/);
  assert.match(sql, /ON DELETE CASCADE ON UPDATE CASCADE/);
});

class FakeResourceSamplingPrismaClient {
  private readonly sampleSets = new Map<string, Record<string, unknown>>();
  private readonly items = new Map<string, Record<string, unknown>>();
  private readonly audits = new Map<string, Record<string, unknown>>();

  readonly client = {
    $transaction: async <T>(callback: (tx: FakeResourceSamplingPrismaClient['client']) => Promise<T>) =>
      callback(this.client),
    topicSelectionResourceSampleSet: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.sampleSets.set(String(data.id), data);
        return data;
      },
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => this.sampleSetWithRelations(where.id),
      findUnique: async ({ where }: { where: { id: string } }) =>
        this.sampleSets.has(where.id) ? this.sampleSetWithRelations(where.id) : null,
    },
    topicSelectionResourceSampleItem: {
      createMany: async ({ data }: { data: Array<Record<string, unknown>> }) => {
        for (const row of data) {
          this.items.set(String(row.id), row);
        }
        return { count: data.length };
      },
    },
    topicSelectionResourceSamplingAudit: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        this.audits.set(String(data.id), data);
        return data;
      },
    },
  } as any;

  private sampleSetWithRelations(id: string) {
    const sampleSet = this.sampleSets.get(id);
    if (!sampleSet) {
      throw new Error(`Missing sample set ${id}.`);
    }
    return {
      ...sampleSet,
      items: [...this.items.values()]
        .filter((item) => item.sampleSetId === id)
        .sort((left, right) =>
          Number(left.rank) - Number(right.rank) || String(left.id).localeCompare(String(right.id)),
        ),
      audits: [...this.audits.values()]
        .filter((audit) => audit.sampleSetId === id)
        .sort((left, right) =>
          String(right.createdAt).localeCompare(String(left.createdAt)),
        ),
    };
  }
}

const RESOURCE_SAMPLING_CLASSIFICATION_SYSTEM_BODY_GOLDEN =
  'a91aac9cb43d326129db323884f46ba0fe36d8195a8b95dce6a72ca6bf112a50';

test('resource-sampling classification system prompt is product-grade and byte-stable (golden anchor)', () => {
  const body = buildResourceSamplingClassificationSystemContent();
  assert.equal(buildResourceSamplingClassificationSystemContent(), body);
  assert.equal(sha256Text(body), RESOURCE_SAMPLING_CLASSIFICATION_SYSTEM_BODY_GOLDEN);

  assert.match(body, /TopicSelectionResourceSamplingLlmOutput@v1/);

  assert.match(body, /Set primary_role to one of support, challenge, baseline, context, review, or excluded/);
  assert.match(body, /review is genuinely mixed or uncertain material that needs human judgement before sampling/);
  assert.match(body, /excluded is off-topic or topic-drift material that is not usable for this topic/);

  assert.match(body, /Set role_scores to a 0-to-1 score for every role \(support, challenge, baseline, context, review, excluded\) and make primary_role the highest-scoring role/);

  assert.match(body, /Set topic_relevance and confidence each as a 0-to-1 number/);

  assert.match(body, /Set evidence_polarity to one of positive_method, risk_or_failure, evaluation_baseline, foundation_context, topic_drift, mixed, or unknown, aligned with the primary_role/);

  assert.match(body, /brief classification_rationale and never expose hidden chain-of-thought/);
  assert.match(body, /supply exclusion_reason when the role is excluded, supply review_reason when the role is review, and list method_families only when the method semantics are clear/);

  assert.match(body, /exactly one classification per eligible literature_ref in this batch, copying each literature_ref verbatim and neither adding, dropping, nor merging candidates/);

  assert.match(body, /never invent literature, refs, or facts not present in the batch/);
});

test('resource sampling recovers over-budget classification batches by dropping digests (D-T128-02)', async () => {
  const controlPlaneRepository = new InMemoryTopicSelectionControlPlaneRepository();
  const controlPlane = new TopicSelectionControlPlaneService(
    controlPlaneRepository,
    { idFactory: makeIdFactory(), now: () => NOW },
  );
  const llmGateway = new BatchAwareLlmGateway();
  // Two ~200k-char digests push the uncompressed batch far over the 40k-token profile target;
  // before D-T128-02 this fail-closed the whole sample as LLM_CLASSIFICATION_FAILED (W-10 run3).
  const fatDigest = 'retrieval budget evidence detail '.repeat(6000);
  const service = new TopicSelectionResourceSamplingService({
    repository: new InMemoryTopicSelectionResourceSamplingRepository(),
    literatureRepository: makeLiteratureRepository([
      {
        ...literature('lit_fat_digest_1', 'Adaptive RAG allocation study', 'Adaptive retrieval evidence for RAG.', ['rag']),
        keyContentDigest: fatDigest,
      },
      {
        ...literature('lit_fat_digest_2', 'RAG serving benchmark', 'Benchmark comparison for RAG serving.', ['benchmark']),
        keyContentDigest: fatDigest,
      },
    ]),
    controlPlaneService: controlPlane,
    agentOrchestrator: makeAgentOrchestrator(controlPlane, llmGateway),
    idFactory: makeIdFactory(),
    now: () => NOW,
  });

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 2,
  });

  assert.equal(result.sample_set.warnings.includes('LLM_CLASSIFICATION_FAILED'), false);
  assert.notEqual(result.sample_set.status, 'blocked');
  assert.equal(llmGateway.calls.length, 1);
  const sentPayload = JSON.parse(llmGateway.calls[0]!.messages[1]!.content ?? '{}') as {
    eligible_candidates: Array<{ key_content_digest: string | null }>;
  };
  assert.equal(sentPayload.eligible_candidates.length, 2);
  assert.equal(
    sentPayload.eligible_candidates.every((candidate) => candidate.key_content_digest === null),
    true,
    'the provider must receive the digest-stripped compressed form',
  );

  const artifacts = await controlPlane.listArtifactRefsByWorkflowRunId(result.sample_set.workflow_run_id!);
  const compressionReport = artifacts.find((artifact) => {
    const payload = artifact.payload as { payload_schema?: string } | null;
    return payload?.payload_schema === 'TopicSelectionCompressionReportEnvelope@v1';
  });
  assert.ok(compressionReport, 'expected the compression report artifact to be recorded');
});

test('resource sampling retries a transient batch failure and recovers with no partial warning', async () => {
  // 26 eligible candidates -> 2 batches (24 + 2). Call 1 (batch 1, attempt 1) throws a
  // synthetic transient failure; the bounded per-batch retry must recover it (W-10 run5:
  // one transient 5xx must not discard every batch).
  const gateway = new FlakyBatchAwareLlmGateway(new Set([1]));
  const { service, invocationAttemptIds } = makeRetryService(gateway, bulkLiterature(26));

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: { support: 1, challenge: 1, baseline: 1, context: 1 },
  });

  assert.equal(gateway.calls.length, 3);
  assert.ok(
    invocationAttemptIds[1]?.endsWith('.batch_1.retry_1'),
    `retry attempt must carry a distinct .retry_ suffix, got ${invocationAttemptIds[1]}`,
  );
  assert.ok(!result.sample_set.warnings.includes('LLM_CLASSIFICATION_FAILED'));
  assert.ok(!result.sample_set.warnings.includes('LLM_CLASSIFICATION_PARTIAL'));
  assert.notEqual(result.sample_set.status, 'blocked');
  assert.equal(result.selected_items.length, 4);
});

test('resource sampling tolerates a permanently failed batch and continues on surviving batches', async () => {
  // Batch 1 fails its initial attempt and both retries (calls 1-3); batch 2 (call 4)
  // succeeds. The failed batch blocks only its own candidates; the run degrades to
  // LLM_CLASSIFICATION_PARTIAL instead of discarding the surviving classifications.
  const gateway = new FlakyBatchAwareLlmGateway(new Set([1, 2, 3]));
  const { service } = makeRetryService(gateway, bulkLiterature(26));

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: { support: 1, challenge: 1, baseline: 1, context: 1 },
  });

  assert.equal(gateway.calls.length, 4);
  assert.ok(result.sample_set.warnings.includes('LLM_CLASSIFICATION_PARTIAL'));
  assert.ok(!result.sample_set.warnings.includes('LLM_CLASSIFICATION_FAILED'));
  assert.equal(result.sample_set.status, 'ready_with_warning');
  // Batch 2 holds only 2 candidates, so the sample underfills but is NOT hard-blocked.
  assert.equal(result.selected_items.length, 2);
  assert.ok(result.sample_set.warnings.includes('SAMPLE_SIZE_UNDERFILLED'));
});

test('resource sampling keeps whole-classification-failed semantics when every batch fails', async () => {
  // Both batches exhaust initial+2 retries (6 calls, all failing): legacy fail-closed
  // shape is preserved — blocked status + LLM_CLASSIFICATION_FAILED, no partial warning.
  const gateway = new FlakyBatchAwareLlmGateway(new Set([1, 2, 3, 4, 5, 6]));
  const { service } = makeRetryService(gateway, bulkLiterature(26));

  const result = await service.createResourceSampleSet({
    topic_id: TOPIC_ID,
    title_card_id: TITLE_CARD_ID,
    sample_size: 4,
    role_targets: { support: 1, challenge: 1, baseline: 1, context: 1 },
  });

  assert.equal(gateway.calls.length, 6);
  assert.equal(result.sample_set.status, 'blocked');
  assert.ok(result.sample_set.warnings.includes('LLM_CLASSIFICATION_FAILED'));
  assert.ok(!result.sample_set.warnings.includes('LLM_CLASSIFICATION_PARTIAL'));
  assert.equal(result.selected_items.length, 0);
});
