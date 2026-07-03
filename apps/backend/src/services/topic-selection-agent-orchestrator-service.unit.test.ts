import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { LlmGatewayError } from './llm-gateway.js';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentOrchestratorLlmGateway,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionPromptPacketCacheService } from './topic-selection-prompt-packet-cache-service.js';
import {
  TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import { TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID } from './topic-selection-model-profile-registry-service.js';
import type { LookupTopicSelectionPromptPacketCacheInput } from './topic-selection-prompt-packet-cache-service.js';

type CandidateDraftBatch = {
  batch_id: string;
  drafts: Array<{
    draft_id: string;
    candidate_need: string;
  }>;
};

const hashB = 'b'.repeat(64);
const hashC = 'c'.repeat(64);
const hashD = 'd'.repeat(64);

class StubLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(private readonly output: CandidateDraftBatch) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    return {
      parsed: this.output as T,
      raw: { output: this.output },
      telemetry: telemetry(),
    };
  }
}

class FailingLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    throw new LlmGatewayError(
      'InvalidRequestError',
      'Provider rejected request with Bearer sk-test-secret and api_key=local-secret: unsupported request option.',
      { statusCode: 400, telemetry: telemetry() },
    );
  }
}

class DriftedPromptPacketCache {
  async lookup(rawInput: unknown) {
    const input = rawInput as LookupTopicSelectionPromptPacketCacheInput;
    return {
      cache_result: 'hit' as const,
      prompt_packet_hash: input.identity.prompt_packet_hash,
      prompt_template_id: input.identity.prompt_template_id,
      prompt_template_version: input.identity.prompt_template_version,
      prompt_variant_key: input.identity.prompt_variant_key,
      invocation_slot_id: input.identity.invocation_slot_id,
      context_policy_profile_id: input.context_policy_profile.context_policy_profile_id,
      context_policy_profile_version: input.context_policy_profile.context_policy_profile_version,
      context_policy_profile_hash: input.context_policy_profile_hash,
      output_contract: input.identity.output_contract,
      redaction_policy: input.identity.redaction_policy,
      redacted_prompt_artifact_ref: {
        ref_type: 'artifact_ref' as const,
        ref_id: 'redacted_prompt_cached_stale_quality',
      },
      redacted_prompt_artifact_hash: hashB,
      prompt_quality_report_ref: {
        ref_type: 'artifact_ref' as const,
        ref_id: 'prompt_quality_cached_stale_quality',
      },
      prompt_quality_report_hash: hashC,
      quality_decision: 'pass' as const,
      freshness_status: 'fresh' as const,
      provenance_ref: input.provenance_ref,
      blocker_codes: [],
      warning_codes: [],
    };
  }

  async recordFreshArtifacts(): Promise<never> {
    throw new Error('drifted prompt cache fixture should not record artifacts');
  }
}

function makeOrchestrator(options: {
  llmGateway?: TopicSelectionAgentOrchestratorLlmGateway;
  promptPacketCache?: TopicSelectionPromptPacketCacheService | null;
} = {}) {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const orchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway: options.llmGateway,
    promptPacketCache: options.promptPacketCache,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  return { orchestrator, repository };
}

function telemetry(): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
    elapsed_ms: 10,
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

function output(): CandidateDraftBatch {
  return {
    batch_id: 'draft_batch_001',
    drafts: [
      {
        draft_id: 'draft_001',
        candidate_need: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
      },
    ],
  };
}

function schema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['batch_id', 'drafts'],
    properties: {
      batch_id: { type: 'string', minLength: 1 },
      drafts: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['draft_id', 'candidate_need'],
          properties: {
            draft_id: { type: 'string', minLength: 1 },
            candidate_need: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  };
}

function baseInvocation() {
  return {
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    executor_kind: 'single_agent' as const,
    run_mode: 'acceptance' as const,
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    output_contract: 'RankedCandidateDraftBatch@v1',
    prompt: {
      promptTemplateId: 'topic-selection-generate-need-candidate',
      version: 'v1',
    },
    schema_name: 'topic_selection_ranked_candidate_draft_batch',
    schema: schema(),
    messages: [
      {
        role: 'system' as const,
        content: 'Return a grounded ranked candidate draft batch.',
      },
      {
        role: 'user' as const,
        content: '{"context_packet_ref":"artifact_ref_001"}',
      },
    ],
    context_packet_refs: [
      {
        ref_type: 'artifact_ref' as const,
        ref_id: 'context_packet_001',
        title_card_id: 'title_card_001',
      },
    ],
  };
}

function runtimeTokenBudgetInput(overrides: {
  estimated_input_tokens_override?: number | null;
  compression_already_applied?: boolean;
  runtime_invocation_context_hash?: string | null;
} = {}) {
  const registry = new TopicSelectionContextPolicyProfileRegistryService();
  const resolvedProfile = registry.resolveProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.need_candidate_generation,
    invocation_slot_id:
      TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.need_candidate_generation,
  });
  return {
    context_policy_profile: resolvedProfile.profile,
    context_policy_profile_hash: resolvedProfile.profile_hash,
    ...overrides,
  };
}

test('agent orchestrator normalizes mocked, codex, and provider execution onto one result shape', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  const mocked = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
      mock_profile: 'happy_path',
    },
  });
  const codex = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'codex_assisted',
    codex_response: {
      output: output(),
      operator_label: 'codex-local',
    },
  });
  const provider = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });

  for (const result of [mocked, codex, provider]) {
    assert.equal(result.schema_version, 'v1');
    assert.equal(result.status, 'succeeded');
    assert.equal(result.validation.valid, true);
    assert.equal(result.structured_output?.drafts.length, 1);
    assert.equal(result.audit_snapshot.node_id, 'topic-selection.v1a.generate-need-candidate.v1');
    assert.equal(result.audit_artifact_ref?.ref_type, 'artifact_ref');
  }
  assert.equal(mocked.provenance.non_provider, true);
  assert.equal(codex.provenance.non_provider, true);
  assert.equal(provider.provenance.non_provider, false);
  assert.equal(provider.provenance.source_kind, 'provider_response');
  assert.equal(provider.provenance.profile_version, 'v1');
  assert.equal(provider.provenance.model_option_id, `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-balanced`);
  assert.equal(provider.provenance.invocation_attempt_id, 'node_attempt_001');
  assert.equal(provider.provenance.cache_status, 'not_applicable');
  assert.match(provider.provenance.profile_hash, /^[a-f0-9]{64}$/);
  assert.match(provider.provenance.normalized_params_hash ?? '', /^[a-f0-9]{64}$/);
  assert.match(provider.provenance.structured_output_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(providerGateway.calls.length, 1);
  assert.equal(providerGateway.calls[0]!.executionContext.feature, 'topic_selection');
  assert.equal(providerGateway.calls[0]!.schemaName, 'topic_selection_ranked_candidate_draft_batch');
  assert.deepEqual(providerGateway.calls[0]!.model, {
    providerId: 'openai',
    modelId: 'gpt-5.5',
    profileId: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
  });
  assert.equal(providerGateway.calls[0]!.policy?.timeoutMs, 180000);
  assert.equal(providerGateway.calls[0]!.policy?.maxRetries, 1);
  assert.deepEqual(providerGateway.calls[0]!.normalizedParams, {
    creativity: 'medium',
    reasoning_depth: 'high',
    output_budget: 'medium',
    structured_output_required: true,
    output_format: 'json_schema',
  });
});

test('agent orchestrator forwards caller-owned feature id to provider execution context', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    feature_id: 'paper_implementation',
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });

  assert.equal(providerGateway.calls.length, 1);
  assert.equal(providerGateway.calls[0]!.executionContext.feature, 'paper_implementation');
});

test('agent orchestrator sends provider-compatible schema while preserving internal validation schema', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    schema: {
      type: 'object',
      additionalProperties: false,
      propertyNames: { not: { enum: ['hidden_reasoning'] } },
      required: ['batch_id', 'drafts'],
      properties: {
        batch_id: { type: 'string', minLength: 1 },
        drafts: {
          type: 'array',
          minItems: 1,
          items: {
            allOf: [
              {
                type: 'object',
                additionalProperties: false,
                required: ['draft_id', 'candidate_need'],
                properties: {
                  draft_id: { type: 'string', minLength: 1 },
                  candidate_need: { type: 'string', minLength: 1 },
                },
              },
              {
                not: {
                  type: 'object',
                  required: ['legacy_wrapper'],
                },
              },
              {
                if: {
                  properties: { status: { const: 'passed' } },
                  required: ['status'],
                },
                then: {
                  required: ['domain_gate_request'],
                },
                else: {
                  properties: {
                    domain_gate_request: { type: 'null' },
                  },
                },
              },
            ],
          },
        },
      },
      dependentRequired: {
        batch_id: ['drafts'],
      },
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(providerGateway.calls.length, 1);
  const providerSchema = providerGateway.calls[0]!.schema as {
    propertyNames?: unknown;
    not?: unknown;
    if?: unknown;
    then?: unknown;
    else?: unknown;
    dependentRequired?: unknown;
    properties?: {
      drafts?: {
        items?: {
          allOf?: unknown;
          not?: unknown;
          if?: unknown;
          then?: unknown;
          else?: unknown;
          type?: string;
          properties?: Record<string, unknown>;
        };
      };
    };
  };
  assert.equal(providerSchema.propertyNames, undefined);
  assert.equal(providerSchema.not, undefined);
  assert.equal(providerSchema.if, undefined);
  assert.equal(providerSchema.then, undefined);
  assert.equal(providerSchema.else, undefined);
  assert.equal(providerSchema.dependentRequired, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.allOf, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.not, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.if, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.then, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.else, undefined);
  assert.equal(providerSchema.properties?.drafts?.items?.type, 'object');
  assert.deepEqual(Object.keys(providerSchema.properties?.drafts?.items?.properties ?? {}), [
    'draft_id',
    'candidate_need',
  ]);
});

test('agent orchestrator blocks invalid structured output without mode-specific result shape', async () => {
  const { orchestrator } = makeOrchestrator();
  const result = await orchestrator.invokeStructuredOutput<Record<string, unknown>>({
    ...baseInvocation(),
    execution_mode: 'codex_assisted',
    codex_response: {
      output: {
        batch_id: 'draft_batch_001',
        drafts: [],
      },
      operator_label: 'codex-local',
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.structured_output, null);
  assert.equal(result.error_code, 'SCHEMA_VALIDATION_FAILED');
  assert.deepEqual(result.blocker_codes, ['SCHEMA_VALIDATION_FAILED']);
  assert.equal(result.provenance.execution_mode, 'codex_assisted');
  assert.equal(result.validation.valid, false);
});

test('agent orchestrator binds compression identity into prompt packet hash and provenance', async () => {
  const { orchestrator } = makeOrchestrator();
  const compressionReportRef = {
    ref_type: 'artifact_ref' as const,
    ref_id: 'compression_report_001',
    title_card_id: 'title_card_001',
  };
  const baseRuntime = runtimeTokenBudgetInput({
    estimated_input_tokens_override: 1000,
    compression_already_applied: true,
  });

  const first = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: {
      ...baseRuntime,
      compression_report_ref: compressionReportRef,
      compression_report_hash: hashB,
      compressed_context_hash: hashC,
    },
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });
  const driftedCompressionReportHash = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: {
      ...baseRuntime,
      compression_report_ref: compressionReportRef,
      compression_report_hash: hashD,
      compressed_context_hash: hashC,
    },
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });

  assert.equal(first.status, 'succeeded');
  assert.equal(first.provenance.compression_report_ref?.ref_id, 'compression_report_001');
  assert.equal(first.provenance.compression_report_hash, hashB);
  assert.equal(first.provenance.compressed_context_hash, hashC);
  assert.notEqual(
    first.provenance.prompt_packet_hash,
    driftedCompressionReportHash.provenance.prompt_packet_hash,
  );
});

test('agent orchestrator records prompt quality artifacts on runtime-enabled invocations', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator, repository } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(providerGateway.calls.length, 1);
  assert.equal(result.provenance.prompt_quality_report_ref?.ref_type, 'artifact_ref');
  assert.equal(result.provenance.redacted_prompt_artifact_ref?.ref_type, 'artifact_ref');

  const redactedPromptArtifact = await repository.findArtifactRefById(
    result.provenance.redacted_prompt_artifact_ref!.ref_id,
  );
  const promptQualityArtifact = await repository.findArtifactRefById(
    result.provenance.prompt_quality_report_ref!.ref_id,
  );
  assert.equal(
    (redactedPromptArtifact?.payload as { payload_schema?: string } | null)?.payload_schema,
    'TopicSelectionRedactedPromptPacketArtifact@v1',
  );
  assert.equal(
    (promptQualityArtifact?.payload as { payload_schema?: string } | null)?.payload_schema,
    'TopicSelectionPromptQualityReport@v1',
  );
  const serializedPromptArtifact = JSON.stringify(redactedPromptArtifact?.payload);
  assert.equal(serializedPromptArtifact.includes('Return a grounded ranked candidate draft batch'), false);
  assert.equal(serializedPromptArtifact.includes('context_packet_ref'), false);
});

test('agent orchestrator reuses prompt packet artifacts without reusing provider responses', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator, repository } = makeOrchestrator({ llmGateway: providerGateway });

  const first = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
  });
  const second = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
  });

  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  assert.equal(providerGateway.calls.length, 2);
  assert.equal(second.provenance.prompt_packet_hash, first.provenance.prompt_packet_hash);
  assert.equal(
    second.provenance.redacted_prompt_artifact_ref?.ref_id,
    first.provenance.redacted_prompt_artifact_ref?.ref_id,
  );
  assert.equal(
    second.provenance.prompt_quality_report_ref?.ref_id,
    first.provenance.prompt_quality_report_ref?.ref_id,
  );
  assert.equal(second.provenance.cache_status, 'not_applicable');
  assert.equal(second.provenance.response_hash, first.provenance.response_hash);

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  const promptArtifacts = artifacts.filter((artifact) =>
    (artifact.payload as { payload_schema?: string } | null)?.payload_schema
      === 'TopicSelectionRedactedPromptPacketArtifact@v1',
  );
  const qualityReports = artifacts.filter((artifact) =>
    (artifact.payload as { payload_schema?: string } | null)?.payload_schema
      === 'TopicSelectionPromptQualityReport@v1',
  );
  assert.equal(promptArtifacts.length, 1);
  assert.equal(qualityReports.length, 1);
});

test('agent orchestrator binds explicit context packet hashes instead of ref hashes', async () => {
  const { orchestrator } = makeOrchestrator();

  const first = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
    context_packet_refs: [
      {
        ref_type: 'artifact_ref',
        ref_id: 'stable_context_ref',
        title_card_id: 'title_card_001',
      },
    ],
    context_packet_hashes: [hashB],
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });
  const driftedContextHash = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
    context_packet_refs: [
      {
        ref_type: 'artifact_ref',
        ref_id: 'stable_context_ref',
        title_card_id: 'title_card_001',
      },
    ],
    context_packet_hashes: [hashC],
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });

  assert.equal(first.status, 'succeeded');
  assert.equal(driftedContextHash.status, 'succeeded');
  assert.notEqual(
    first.provenance.prompt_packet_hash,
    driftedContextHash.provenance.prompt_packet_hash,
  );
});

test('agent orchestrator binds runtime invocation context hash into prompt packet identity', async () => {
  const { orchestrator } = makeOrchestrator();

  const initial = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
      runtime_invocation_context_hash: hashB,
    }),
    context_packet_hashes: [hashB],
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });
  const supplemental = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
      runtime_invocation_context_hash: hashC,
    }),
    context_packet_hashes: [hashB],
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });

  assert.equal(initial.status, 'succeeded');
  assert.equal(supplemental.status, 'succeeded');
  assert.notEqual(initial.provenance.prompt_packet_hash, supplemental.provenance.prompt_packet_hash);
});

test('agent orchestrator blocks prompt quality failures before provider calls', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    messages: [
      {
        role: 'system',
        content: 'Return JSON only.',
      },
      {
        role: 'user',
        content: 'raw_provider_log includes api_key=local-secret and must be blocked.',
      },
    ],
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'PROMPT_QUALITY_GATE_BLOCKED');
  assert.deepEqual(result.blocker_codes, ['PROMPT_FORBIDDEN_SECRET_OR_RAW_LOG']);
  assert.equal(result.provenance.prompt_quality_report_ref?.ref_type, 'artifact_ref');
  assert.equal(providerGateway.calls.length, 0);
});

test('agent orchestrator blocks prompt cache hits when cached quality report drifts from current runtime', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({
    llmGateway: providerGateway,
    promptPacketCache: new DriftedPromptPacketCache() as unknown as TopicSelectionPromptPacketCacheService,
  });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    messages: [
      {
        role: 'system',
        content: 'Return JSON only.',
      },
      {
        role: 'user',
        content: 'raw_provider_log includes api_key=local-secret and must be blocked.',
      },
    ],
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 1000,
    }),
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'PROMPT_QUALITY_GATE_BLOCKED');
  assert.deepEqual(result.blocker_codes, ['PROMPT_PACKET_CACHE_BLOCKED_DRIFT']);
  assert.equal(result.provenance.prompt_quality_report_ref ?? null, null);
  assert.equal(providerGateway.calls.length, 0);
});

test('agent orchestrator rejects supplied codex prompt hash when compression identity drifts', async () => {
  const { orchestrator } = makeOrchestrator();
  const source = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'codex_assisted',
    codex_response: {
      output: output(),
      operator_label: 'codex-local',
    },
  });
  const compressionReportRef = {
    ref_type: 'artifact_ref' as const,
    ref_id: 'compression_report_001',
    title_card_id: 'title_card_001',
  };

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'codex_assisted',
      runtime_token_budget: {
        ...runtimeTokenBudgetInput({
          estimated_input_tokens_override: 1000,
          compression_already_applied: true,
        }),
        compression_report_ref: compressionReportRef,
        compression_report_hash: hashB,
        compressed_context_hash: hashC,
      },
      codex_response: {
        output: output(),
        operator_label: 'codex-local',
        prompt_packet_hash: source.provenance.prompt_packet_hash,
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('agent orchestrator rejects mocked product execution and forbidden raw output fields', async () => {
  const { orchestrator } = makeOrchestrator();
  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'mocked_llm',
      run_mode: 'product',
      mocked_output: {
        fixture_id: 'fixture_generate_need_candidate_happy_path',
        output: output(),
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'mocked_llm',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'codex_assisted',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  const forbidden = await orchestrator.invokeStructuredOutput<Record<string, unknown>>({
    ...baseInvocation(),
    execution_mode: 'mocked_llm',
    mocked_output: {
      fixture_id: 'fixture_bad_raw_material',
      output: {
        ...output(),
        hidden_reasoning: 'do not persist this',
      },
    },
  });
  assert.equal(forbidden.status, 'blocked');
  assert.equal(forbidden.error_code, 'FORBIDDEN_AGENT_OUTPUT_FIELD');
  assert.equal(forbidden.structured_output, null);
});

test('agent orchestrator enforces profile output contract and explicit provider option selection', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'provider_llm',
      run_mode: 'product',
      output_contract: 'NeedDiscoveryExplorerNotes@v1',
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  const dashscope = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    model_option_id: `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.dashscope-thinking-budget`,
  });

  assert.equal(dashscope.status, 'succeeded');
  assert.equal(providerGateway.calls.at(-1)?.model.providerId, 'dashscope');
  assert.equal(providerGateway.calls.at(-1)?.model.modelId, 'qwen3.6-plus');
  assert.deepEqual(providerGateway.calls.at(-1)?.providerOverrides, { enable_thinking: true });
});

test('agent orchestrator accepts canonical execution_spec and rejects ambiguous dual-track values', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    execution_spec: {
      execution_mode: 'provider_llm',
      model_option_id: `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-deep-reasoning`,
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.provenance.model_option_id,
    `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-deep-reasoning`,
  );
  assert.equal(providerGateway.calls.at(-1)?.model.modelId, 'gpt-5.5');
  assert.equal(
    (providerGateway.calls.at(-1)?.normalizedParams as { reasoning_depth?: string } | undefined)?.reasoning_depth,
    'high',
  );

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'provider_llm',
      run_mode: 'product',
      execution_spec: {
        execution_mode: 'codex_assisted',
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'codex_assisted',
      execution_spec: {
        execution_mode: 'codex_assisted',
        model_option_id: `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-balanced`,
      },
      codex_response: {
        operator_label: 'codex-local',
        output: output(),
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('agent orchestrator blocks over-budget provider invocation before gateway call', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator, repository } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: runtimeTokenBudgetInput({
      estimated_input_tokens_override: 200_000,
      compression_already_applied: true,
    }),
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.structured_output, null);
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
  assert.equal(result.token_budget_gate_result?.decision, 'blocked_over_budget');
  assert.equal(result.token_budget_gate_result?.estimated_input_tokens, 200_000);
  assert.equal(result.audit_snapshot.token_budget_gate_result?.decision, 'blocked_over_budget');
  assert.equal(result.provenance.source_kind, 'provider_response');
  assert.equal(result.provenance.provider_id, 'openai');
  assert.equal(result.provenance.model_id, 'gpt-5.5');
  assert.equal(providerGateway.calls.length, 0);
  assert.match(result.validation.errors[0] ?? '', /token budget gate decision blocked_over_budget/);

  const artifact = await repository.findArtifactRefById(result.audit_artifact_ref!.ref_id);
  assert.equal(artifact?.artifact_kind, 'diagnostic');
  assert.equal(
    JSON.stringify(artifact?.payload).includes('TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'),
    true,
  );
});

test('agent orchestrator rejects drifted runtime token-budget profile hash', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'provider_llm',
      run_mode: 'product',
      runtime_token_budget: {
        ...runtimeTokenBudgetInput(),
        context_policy_profile_hash: 'a'.repeat(64),
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.equal(providerGateway.calls.length, 0);
});

test('agent orchestrator records compression report when budget requires compression', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator, repository } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: {
      ...runtimeTokenBudgetInput({
        estimated_input_tokens_override: 40_000,
      }),
      compression_attempt: {
        source_refs: [
          {
            ref_type: 'artifact_ref',
            ref_id: 'context_packet_001',
            title_card_id: 'title_card_001',
          },
        ],
        input_context: { token_budget_fixture: 'long exploration and arbiter context' },
        compressed_context: { preserved_refs: ['context_packet_001'] },
        summary: { summary: 'Compressed context preserving source refs and known risks.' },
        compression_executor_kind: 'deterministic_structural',
        estimated_input_tokens_before_override: 40_000,
        estimated_input_tokens_after_override: 12_000,
      },
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_REQUIRES_COMPRESSION');
  assert.equal(result.token_budget_gate_result?.decision, 'requires_compression');
  assert.equal(result.provenance.compression_report_ref?.ref_type, 'artifact_ref');
  assert.equal(providerGateway.calls.length, 0);
  assert.equal(result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'), true);

  const compressionArtifact = await repository.findArtifactRefById(
    result.provenance.compression_report_ref!.ref_id,
  );
  const payload = compressionArtifact?.payload as {
    payload_schema?: string;
    report?: { quality_gate_result?: string };
  } | null;
  assert.equal(payload?.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(payload?.report?.quality_gate_result, 'passed');
});

test('agent orchestrator blocks compression attempts that drop required preserved facts', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });
  const runtime = runtimeTokenBudgetInput({
    estimated_input_tokens_override: 40_000,
  });
  const requiredFactKind = runtime.context_policy_profile.compression_policy.preserved_fact_kinds[0]!;

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: {
      ...runtime,
      compression_attempt: {
        source_refs: [
          {
            ref_type: 'artifact_ref',
            ref_id: 'context_packet_001',
          },
        ],
        input_context: { token_budget_fixture: 'long exploration and arbiter context' },
        compressed_context: { preserved_refs: ['context_packet_001'] },
        summary: { summary: 'Compressed context with a dropped required fact.' },
        compression_executor_kind: 'deterministic_structural',
        required_preserved_facts: { [requiredFactKind]: ['required_fact_001'] },
        compressed_preserved_facts: { [requiredFactKind]: [] },
        estimated_input_tokens_before_override: 40_000,
        estimated_input_tokens_after_override: 12_000,
      },
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.equal(result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'), true);
  assert.equal(result.provenance.compression_report_ref?.ref_type, 'artifact_ref');
  assert.equal(providerGateway.calls.length, 0);
});

// --- D-T128-02: compress→re-gate→continue recovery branch -----------------------------------

function compressionRecoveryAttempt(overrides: {
  compressed_messages?: Array<{ role: 'system' | 'user'; content: string }> | null;
  required_preserved_facts?: Record<string, string[]>;
  compressed_preserved_facts?: Record<string, string[]>;
} = {}) {
  return {
    source_refs: [
      {
        ref_type: 'artifact_ref',
        ref_id: 'context_packet_001',
        title_card_id: 'title_card_001',
      },
    ],
    input_context: { token_budget_fixture: 'long exploration and arbiter context' },
    compressed_context: { preserved_refs: ['context_packet_001'] },
    summary: { summary: 'Compressed context preserving source refs and known risks.' },
    compression_executor_kind: 'deterministic_structural' as const,
    estimated_input_tokens_before_override: 40_000,
    estimated_input_tokens_after_override: 12_000,
    ...overrides,
  };
}

test('agent orchestrator continues with compressed messages when a valid attempt fits the budget', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator, repository } = makeOrchestrator({ llmGateway: providerGateway });
  const compressedMessages = [
    { role: 'system' as const, content: 'Compressed system guidance.' },
    { role: 'user' as const, content: 'Compressed user payload preserving context_packet_001.' },
  ];

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: {
      ...runtimeTokenBudgetInput({ estimated_input_tokens_override: 40_000 }),
      compression_attempt: compressionRecoveryAttempt({ compressed_messages: compressedMessages }),
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(providerGateway.calls.length, 1);
  assert.deepEqual(providerGateway.calls[0]!.messages, compressedMessages);
  assert.equal(result.warning_codes.includes('COMPRESSION_APPLIED'), true);
  assert.equal(result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'), true);
  assert.equal(result.warning_codes.includes('TOKEN_BUDGET_REQUIRES_COMPRESSION'), true);
  assert.equal(result.token_budget_gate_result?.decision, 'within_budget');
  assert.equal(result.provenance.compression_report_ref?.ref_type, 'artifact_ref');
  assert.equal(typeof result.provenance.compressed_context_hash, 'string');

  const compressionArtifact = await repository.findArtifactRefById(
    result.provenance.compression_report_ref!.ref_id,
  );
  const payload = compressionArtifact?.payload as {
    payload_schema?: string;
    report?: { quality_gate_result?: string };
  } | null;
  assert.equal(payload?.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(payload?.report?.quality_gate_result, 'passed');
});

test('agent orchestrator blocks after compression when the compressed form still exceeds the budget', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });
  // ~50k-token compressed user message: still far over the profile's input target, so the
  // post-compression gate must hard-block with the loop-safe after-compression code.
  const oversizedCompressedMessages = [
    { role: 'system' as const, content: 'Compressed system guidance.' },
    { role: 'user' as const, content: 'x'.repeat(200_000) },
  ];

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: {
      ...runtimeTokenBudgetInput({ estimated_input_tokens_override: 40_000 }),
      compression_attempt: compressionRecoveryAttempt({
        compressed_messages: oversizedCompressedMessages,
      }),
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.equal(result.blocker_codes.includes('TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'), true);
  assert.equal(providerGateway.calls.length, 0);
  assert.equal(result.provenance.compression_report_ref?.ref_type, 'artifact_ref');
  assert.equal(result.warning_codes.includes('COMPRESSION_REPORT_RECORDED'), true);
});

test('agent orchestrator keeps the quality-gate block when compressed messages are supplied', async () => {
  const providerGateway = new StubLlmGateway(output());
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });
  const runtime = runtimeTokenBudgetInput({ estimated_input_tokens_override: 40_000 });
  const requiredFactKind = runtime.context_policy_profile.compression_policy.preserved_fact_kinds[0]!;

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
    runtime_token_budget: {
      ...runtime,
      compression_attempt: compressionRecoveryAttempt({
        compressed_messages: [
          { role: 'system' as const, content: 'Compressed system guidance.' },
          { role: 'user' as const, content: 'Compressed user payload.' },
        ],
        required_preserved_facts: { [requiredFactKind]: ['required_fact_001'] },
        compressed_preserved_facts: { [requiredFactKind]: [] },
      }),
    },
  });

  // A blocked compression quality gate must NEVER be recovered over, even when the caller
  // supplied a fitting compressed form — dropped required facts stay fail-closed.
  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.equal(providerGateway.calls.length, 0);
});

test('agent orchestrator requires approval for codex exact response reuse', async () => {
  const { orchestrator, repository } = makeOrchestrator();

  await assert.rejects(
    () => orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
      ...baseInvocation(),
      execution_mode: 'codex_assisted',
      codex_response: {
        operator_label: 'codex-local',
        output: output(),
        response_source: 'cached_exact_invocation',
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );

  const source = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'codex_assisted',
    codex_response: {
      operator_label: 'codex-local',
      output: output(),
      response_source: 'operator_supplied',
    },
  });
  assert.ok(source.provenance.response_hash);
  assert.ok(source.provenance.profile_hash);

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'codex_assisted',
    codex_response: {
      operator_label: 'codex-local',
      output: output(),
      response_source: 'cached_exact_invocation',
      local_approval_setting_ref: 'local-setting:t112-codex-exact-reuse-approved',
      reuse_provenance: {
        source_workflow_run_id: source.workflow_run_id,
        source_node_id: source.node_id,
        source_node_attempt_id: source.node_attempt_id,
        source_execution_mode: 'codex_assisted',
        reuse_source_kind: 'codex_assisted',
        response_hash: source.provenance.response_hash,
        prompt_packet_hash: source.provenance.prompt_packet_hash,
        context_packet_hashes: ['b'.repeat(64)],
        schema_version: 'topic_selection_ranked_candidate_draft_batch',
        profile_hash: source.provenance.profile_hash,
        policy_version: 'v1',
        approval_status: 'approved_by_local_setting',
        approval_ref: null,
        local_approval_setting_ref: 'local-setting:t112-codex-exact-reuse-approved',
        non_provider: true,
      },
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.provenance.non_provider, true);
  assert.equal(result.provenance.cache_status, 'hit');
  assert.match(result.provenance.response_reuse_ref ?? '', /^artifact_ref_/);
  assert.equal(result.provenance.local_approval_setting_ref, 'local-setting:t112-codex-exact-reuse-approved');

  const reuseArtifact = await repository.findArtifactRefById(result.provenance.response_reuse_ref!);
  assert.equal(reuseArtifact?.artifact_kind, 'diagnostic');
  assert.equal(
    (reuseArtifact?.payload as { payload_schema?: string } | null)?.payload_schema,
    'TopicSelectionExactResponseReuseProvenance@v1',
  );
});

test('agent orchestrator records a sanitized provider failure summary for blocked invocations', async () => {
  const providerGateway = new FailingLlmGateway();
  const { orchestrator } = makeOrchestrator({ llmGateway: providerGateway });

  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    execution_mode: 'provider_llm',
    run_mode: 'product',
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.structured_output, null);
  assert.equal(result.error_code, 'InvalidRequestError');
  assert.deepEqual(result.blocker_codes, ['InvalidRequestError']);
  assert.equal(result.validation.valid, false);
  assert.equal(result.validation.error_count, 1);
  assert.match(result.validation.errors[0] ?? '', /^InvalidRequestError status=400:/);
  assert.equal(JSON.stringify(result.validation).includes('sk-test-secret'), false);
  assert.equal(JSON.stringify(result.validation).includes('local-secret'), false);
  assert.equal(result.audit_snapshot.validation.errors[0], result.validation.errors[0]);
});

test('agent orchestrator audit artifact stores hashes and provenance but not full structured output', async () => {
  const { orchestrator, repository } = makeOrchestrator();
  const result = await orchestrator.invokeStructuredOutput<CandidateDraftBatch>({
    ...baseInvocation(),
    title_card_id: 'title_card_001',
    execution_mode: 'mocked_llm',
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: output(),
    },
  });

  const artifact = await repository.findArtifactRefById(result.audit_artifact_ref!.ref_id);
  assert.equal(artifact?.artifact_kind, 'diagnostic');
  assert.equal(artifact?.workflow_run_id, 'workflow_run_001');
  const serialized = JSON.stringify(artifact?.payload);
  assert.equal(serialized.includes('Need a risk-aware evaluation workflow'), false);
  assert.equal(serialized.includes('invocation_attempt_id'), true);
  assert.equal(serialized.includes('response_hash'), true);
  assert.equal(serialized.includes('fixture_generate_need_candidate_happy_path'), true);
});
