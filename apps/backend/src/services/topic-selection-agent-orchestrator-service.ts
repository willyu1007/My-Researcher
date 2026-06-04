import {
  Ajv,
  type ErrorObject,
  type ValidateFunction,
} from 'ajv';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionMode,
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import {
  TOPIC_SELECTION_AGENT_RUN_MODES,
  type TopicSelectionAgentExecutionSpec,
  type TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
  TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION,
  type TopicSelectionCompressionExecutorKind,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionDynamicPromptMaterialRecord,
  type TopicSelectionExactResponseReuseProvenance,
  type TopicSelectionRuntimeCacheResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import {
  TOPIC_SELECTION_AGENT_EXECUTOR_KINDS,
  TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION,
  type TopicSelectionAgentInvocationAuditSnapshot,
  type TopicSelectionAgentInvocationProvenance,
  type TopicSelectionAgentInvocationStatus,
  type TopicSelectionAgentOutputSourceKind,
  type TopicSelectionAgentTokenBudgetGateResult,
  type TopicSelectionAgentDebateExtension,
  type TopicSelectionAgentValidationSummary,
  type TopicSelectionExecutorKind,
  topicSelectionAgentInvocationAuditSnapshotSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import { AppError } from '../errors/app-error.js';
import {
  BackendLlmGateway,
  LlmGatewayError,
  type LlmModelRef,
  type LlmPromptRef,
  type LlmRequestPolicy,
  type LlmStructuredOutputRequest,
} from './llm-gateway.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  type TopicSelectionResolvedModelProfile,
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionCompressionRuntimeService,
  type TopicSelectionCompressionFactInventory,
  type TopicSelectionCompressionReportRuntimeResult,
} from './topic-selection-compression-runtime-service.js';
import {
  TOPIC_SELECTION_REDACTED_PROMPT_PACKET_ARTIFACT_SCHEMA_VERSION,
  TopicSelectionPromptPacketRuntimeService,
  type TopicSelectionPromptPacketRuntimeResult,
} from './topic-selection-prompt-packet-runtime-service.js';
import { TopicSelectionPromptPacketCacheService } from './topic-selection-prompt-packet-cache-service.js';
import { TopicSelectionTokenBudgetGateService } from './topic-selection-token-budget-gate-service.js';

export type { TopicSelectionAgentRunMode } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
export type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
  TopicSelectionAgentInvocationStatus,
  TopicSelectionAgentOutputSourceKind,
  TopicSelectionAgentValidationSummary,
  TopicSelectionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';

const FORBIDDEN_OUTPUT_KEY_PATTERNS = [
  /hidden[_-]?reasoning/i,
  /chain[_-]?of[_-]?thought/i,
  /raw[_-]?provider[_-]?log/i,
  /raw[_-]?debate[_-]?transcript/i,
  /provider[_-]?secret/i,
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?token/i,
  /credential/i,
] as const;

export type TopicSelectionAgentOrchestratorLlmGateway = Pick<BackendLlmGateway, 'createStructuredOutput'>;

export type TopicSelectionMockedAgentOutput<T> = {
  fixture_id: string;
  output: T;
  fixture_hash?: string | null;
  mock_profile?: string | null;
};

export type TopicSelectionCodexAssistedAgentOutput<T> = {
  output: T;
  operator_label: string;
  response_hash?: string | null;
  prompt_packet_hash?: string | null;
  operator_approval_ref?: TopicSelectionFunctionalRef | null;
  local_approval_setting_ref?: string | null;
  response_source?: 'operator_supplied' | 'cached_exact_invocation';
  reuse_provenance?: TopicSelectionExactResponseReuseProvenance | null;
};

export type TopicSelectionAgentRuntimeTokenBudgetInput = {
  context_policy_profile: TopicSelectionContextPolicyProfile;
  context_policy_profile_hash: string;
  compression_strategy_ref?: TopicSelectionFunctionalRef | null;
  compression_already_applied?: boolean;
  compression_attempt?: TopicSelectionAgentRuntimeCompressionAttemptInput | null;
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compression_report_hash?: string | null;
  compressed_context_hash?: string | null;
  runtime_invocation_context_hash?: string | null;
  dynamic_material_refs?: TopicSelectionDynamicPromptMaterialRecord[];
  context_payloads?: unknown[];
  extra_payloads?: unknown[];
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
};

export type TopicSelectionAgentRuntimeCompressionAttemptInput = {
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  source_refs: TopicSelectionFunctionalRef[];
  input_context: unknown;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  required_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  redaction_policy?: string | null;
  estimated_input_tokens_before_override?: number | null;
  estimated_input_tokens_after_override?: number | null;
};

export type TopicSelectionAgentInvocationRequest<T> = {
  workspace_id?: string | null;
  feature_id?: string | null;
  title_card_id?: string | null;
  node_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  invocation_attempt_id?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  execution_spec?: TopicSelectionAgentExecutionSpec | null;
  executor_kind: TopicSelectionExecutorKind;
  run_mode: TopicSelectionAgentRunMode;
  profile_id: string;
  output_contract: string;
  model_option_id?: string | null;
  prompt: LlmPromptRef;
  prompt_variant_key?: string | null;
  schema_name: string;
  schema: Record<string, unknown>;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  input_refs?: TopicSelectionFunctionalRef[];
  context_packet_refs?: TopicSelectionArtifactFunctionalRef[];
  context_packet_hashes?: string[];
  runtime_token_budget?: TopicSelectionAgentRuntimeTokenBudgetInput | null;
  debate_extension?: TopicSelectionAgentDebateExtension | null;
  mocked_output?: TopicSelectionMockedAgentOutput<T> | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<T> | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
};

export type TopicSelectionAgentInvocationResult<T> = {
  schema_version: 'v1';
  node_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  status: TopicSelectionAgentInvocationStatus;
  structured_output: T | null;
  provenance: TopicSelectionAgentInvocationProvenance;
  validation: TopicSelectionAgentValidationSummary;
  token_budget_gate_result: TopicSelectionAgentTokenBudgetGateResult | null;
  warning_codes: string[];
  blocker_codes: string[];
  error_code?: string | null;
  audit_snapshot: TopicSelectionAgentInvocationAuditSnapshot;
  audit_artifact_ref?: TopicSelectionArtifactFunctionalRef | null;
};

type SourceExecution<T> = {
  output: T | null;
  provenance: TopicSelectionAgentInvocationProvenance;
  error_code?: string | null;
  blocker_codes?: string[];
  warning_codes?: string[];
  validation?: TopicSelectionAgentValidationSummary;
};

type PreparedPromptPacket = {
  promptPacketHash: string;
  promptPacketCacheStatus: TopicSelectionRuntimeCacheResult | null;
  promptPacketCacheResultRef: TopicSelectionFunctionalRef | null;
  promptPacketCacheResultHash: string | null;
  promptQualityReportRef: TopicSelectionFunctionalRef | null;
  redactedPromptArtifactRef: TopicSelectionFunctionalRef | null;
  blockerCodes: string[];
  warningCodes: string[];
};

export class TopicSelectionAgentOrchestratorService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly auditSnapshotValidator = this.ajv.compile(
    topicSelectionAgentInvocationAuditSnapshotSchema,
  );
  private readonly validators = new Map<string, ValidateFunction>();
  private readonly llmGateway: TopicSelectionAgentOrchestratorLlmGateway;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly tokenBudgetGate: TopicSelectionTokenBudgetGateService;
  private readonly compressionRuntime: TopicSelectionCompressionRuntimeService;
  private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService;
  private readonly promptPacketCache: TopicSelectionPromptPacketCacheService | null;
  private readonly now: () => string;

  constructor(options: {
    llmGateway?: TopicSelectionAgentOrchestratorLlmGateway;
    controlPlane?: TopicSelectionControlPlaneService;
    modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
    tokenBudgetGate?: TopicSelectionTokenBudgetGateService;
    compressionRuntime?: TopicSelectionCompressionRuntimeService;
    promptPacketRuntime?: TopicSelectionPromptPacketRuntimeService;
    promptPacketCache?: TopicSelectionPromptPacketCacheService | null;
    now?: () => string;
  } = {}) {
    this.llmGateway = options.llmGateway ?? new BackendLlmGateway();
    this.controlPlane = options.controlPlane ?? null;
    this.modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.tokenBudgetGate = options.tokenBudgetGate ?? new TopicSelectionTokenBudgetGateService();
    this.compressionRuntime = options.compressionRuntime ?? new TopicSelectionCompressionRuntimeService();
    this.promptPacketRuntime = options.promptPacketRuntime ?? new TopicSelectionPromptPacketRuntimeService();
    this.promptPacketCache = options.promptPacketCache === undefined
      ? new TopicSelectionPromptPacketCacheService()
      : options.promptPacketCache;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  private readonly controlPlane: TopicSelectionControlPlaneService | null;

  async invokeStructuredOutput<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    const effectiveInput = this.effectiveInvocationInput(input);
    this.assertInvocationInput(effectiveInput);
    const resolvedProfile = this.resolveInvocationProfile(effectiveInput);
    const preparedPromptPacket = await this.preparePromptPacket(effectiveInput, resolvedProfile);
    const promptPacketHash = preparedPromptPacket.promptPacketHash;
    const tokenBudgetPreflight = await this.preflightTokenBudget<T>(
      effectiveInput,
      resolvedProfile,
      promptPacketHash,
      preparedPromptPacket,
    );
    if (tokenBudgetPreflight.blockedSource) {
      const source = tokenBudgetPreflight.blockedSource;
      return this.buildResult(effectiveInput, {
        status: 'blocked',
        structuredOutput: null,
        provenance: source.provenance,
        validation: source.validation ?? this.validationSummary(null),
        tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
        warningCodes: this.uniqueStrings([
          ...preparedPromptPacket.warningCodes,
          ...tokenBudgetPreflight.warningCodes,
          ...(source.warning_codes ?? []),
        ]),
        blockerCodes: source.blocker_codes ?? ['AGENT_EXECUTION_FAILED'],
        errorCode: source.error_code ?? 'AGENT_EXECUTION_FAILED',
      });
    }

    if (preparedPromptPacket.blockerCodes.length > 0) {
      const source = this.blockedSource(
        effectiveInput,
        resolvedProfile,
        'PROMPT_QUALITY_GATE_BLOCKED',
        this.sourceKindForExecutionMode(effectiveInput),
        promptPacketHash,
        {
          blockerCodes: preparedPromptPacket.blockerCodes,
          warningCodes: preparedPromptPacket.warningCodes,
          validation: this.promptQualityValidationSummary(preparedPromptPacket.blockerCodes),
          promptQualityReportRef: preparedPromptPacket.promptQualityReportRef,
          redactedPromptArtifactRef: preparedPromptPacket.redactedPromptArtifactRef,
          promptPacketCacheStatus: preparedPromptPacket.promptPacketCacheStatus,
          promptPacketCacheResultRef: preparedPromptPacket.promptPacketCacheResultRef,
          promptPacketCacheResultHash: preparedPromptPacket.promptPacketCacheResultHash,
        },
      );
      return this.buildResult(effectiveInput, {
        status: 'blocked',
        structuredOutput: null,
        provenance: source.provenance,
        validation: source.validation ?? this.validationSummary(null),
        tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
        warningCodes: preparedPromptPacket.warningCodes,
        blockerCodes: source.blocker_codes ?? ['PROMPT_QUALITY_GATE_BLOCKED'],
        errorCode: source.error_code ?? 'PROMPT_QUALITY_GATE_BLOCKED',
      });
    }

    const source = await this.executeSource(
      effectiveInput,
      resolvedProfile,
      promptPacketHash,
      preparedPromptPacket,
    );
    if (source.output === null) {
      return this.buildResult(effectiveInput, {
        status: 'blocked',
        structuredOutput: null,
        provenance: source.provenance,
        validation: source.validation ?? this.validationSummary(null),
        tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
        warningCodes: this.uniqueStrings([
          ...preparedPromptPacket.warningCodes,
          ...tokenBudgetPreflight.warningCodes,
          ...(source.warning_codes ?? []),
        ]),
        blockerCodes: source.blocker_codes ?? ['AGENT_EXECUTION_FAILED'],
        errorCode: source.error_code ?? 'AGENT_EXECUTION_FAILED',
      });
    }

    const forbiddenPath = this.findForbiddenOutputPath(source.output);
    if (forbiddenPath) {
      return this.buildResult(effectiveInput, {
        status: 'blocked',
        structuredOutput: null,
        provenance: source.provenance,
        validation: this.validationSummary(null),
        tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
        warningCodes: this.uniqueStrings([
          ...preparedPromptPacket.warningCodes,
          ...tokenBudgetPreflight.warningCodes,
        ]),
        blockerCodes: ['FORBIDDEN_AGENT_OUTPUT_FIELD'],
        errorCode: 'FORBIDDEN_AGENT_OUTPUT_FIELD',
      });
    }

    const validation = this.validateStructuredOutput(effectiveInput.schema_name, effectiveInput.schema, source.output);
    if (!validation.valid) {
      return this.buildResult(effectiveInput, {
        status: 'blocked',
        structuredOutput: null,
        provenance: source.provenance,
        validation,
        tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
        warningCodes: this.uniqueStrings([
          ...preparedPromptPacket.warningCodes,
          ...tokenBudgetPreflight.warningCodes,
        ]),
        blockerCodes: ['SCHEMA_VALIDATION_FAILED'],
        errorCode: 'SCHEMA_VALIDATION_FAILED',
      });
    }

    return this.buildResult(effectiveInput, {
      status: 'succeeded',
      structuredOutput: source.output,
      provenance: source.provenance,
      validation,
      tokenBudgetGateResult: tokenBudgetPreflight.gateResult,
      warningCodes: this.uniqueStrings([
        ...preparedPromptPacket.warningCodes,
        ...tokenBudgetPreflight.warningCodes,
      ]),
      blockerCodes: [],
      errorCode: null,
    });
  }

  private effectiveInvocationInput<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
  ): TopicSelectionAgentInvocationRequest<T> {
    const spec = input.execution_spec;
    if (!spec) {
      return input;
    }
    if (input.execution_mode !== spec.execution_mode) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec.execution_mode must match execution_mode.');
    }
    const specModelOptionId = spec.model_option_id?.trim() || null;
    const inputModelOptionId = input.model_option_id?.trim() || null;
    if (inputModelOptionId && specModelOptionId && inputModelOptionId !== specModelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_spec.model_option_id must match model_option_id.');
    }
    if (spec.execution_mode !== 'provider_llm' && (specModelOptionId || inputModelOptionId)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'model_option_id requires execution_mode=provider_llm.');
    }
    return {
      ...input,
      execution_mode: spec.execution_mode,
      model_option_id: specModelOptionId ?? inputModelOptionId,
      execution_spec: {
        execution_mode: spec.execution_mode,
        ...(specModelOptionId ? { model_option_id: specModelOptionId } : {}),
      },
    };
  }

  private async executeSource<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
    promptPacketHash: string,
    preparedPromptPacket: PreparedPromptPacket,
  ): Promise<SourceExecution<T>> {
    const invocationAttemptId = this.invocationAttemptId(input);

    if (input.execution_mode === 'mocked_llm') {
      if (input.run_mode === 'product') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'mocked_llm cannot run in product mode.');
      }
      if (!input.mocked_output) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'mocked_output is required for mocked_llm.');
      }
      const responseHash = this.hash(input.mocked_output.output);
      const fixtureHash = input.mocked_output.fixture_hash?.trim() || responseHash;
      return {
        output: input.mocked_output.output,
        provenance: {
          workflow_run_id: input.workflow_run_id,
          node_id: input.node_id,
          node_attempt_id: input.node_attempt_id,
          invocation_attempt_id: invocationAttemptId,
          execution_mode: input.execution_mode,
          executor_kind: input.executor_kind,
          source_kind: 'mock_fixture',
          non_provider: true,
          run_mode: input.run_mode,
          profile_id: input.profile_id,
          profile_version: resolvedProfile.profile.profile_version,
          profile_hash: resolvedProfile.profile_hash,
          model_option_id: null,
          normalized_params_hash: null,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract,
          prompt_template_id: input.prompt.promptTemplateId,
          prompt_template_version: input.prompt.version,
          schema_name: input.schema_name,
          prompt_packet_hash: promptPacketHash,
          ...this.runtimePromptPacketProvenance(preparedPromptPacket),
          response_hash: responseHash,
          structured_output_hash: responseHash,
          cache_status: 'not_applicable',
          response_reuse_ref: null,
          ...this.runtimeCompressionProvenance(input),
          fixture_id: input.mocked_output.fixture_id,
          fixture_hash: fixtureHash,
          mock_profile: input.mocked_output.mock_profile ?? null,
          telemetry: null,
          ...this.debateExtensionProvenance(input),
        },
      };
    }

    if (input.execution_mode === 'codex_assisted') {
      if (!input.codex_response) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'codex_response is required for codex_assisted.');
      }
      const responseHash = input.codex_response.response_hash?.trim() || this.hash(input.codex_response.output);
      const responseSource = input.codex_response.response_source ?? 'operator_supplied';
      const localApprovalSettingRef = input.codex_response.local_approval_setting_ref?.trim() || null;
      if (
        responseSource === 'cached_exact_invocation'
        && !input.codex_response.operator_approval_ref
        && !localApprovalSettingRef
      ) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          'codex_assisted cached exact invocation reuse requires operator approval or local approval setting.',
        );
      }
      const responseReuseProvenance = responseSource === 'cached_exact_invocation'
        ? this.assertCodexReuseProvenance(
          input,
          resolvedProfile,
          responseHash,
          promptPacketHash,
          localApprovalSettingRef,
        )
        : null;
      const responseReuseRef = responseReuseProvenance
        ? await this.recordResponseReuseProvenance(input, responseReuseProvenance)
        : null;
      return {
        output: input.codex_response.output,
        provenance: {
          workflow_run_id: input.workflow_run_id,
          node_id: input.node_id,
          node_attempt_id: input.node_attempt_id,
          invocation_attempt_id: invocationAttemptId,
          execution_mode: input.execution_mode,
          executor_kind: input.executor_kind,
          source_kind: 'codex_response',
          non_provider: true,
          run_mode: input.run_mode,
          profile_id: input.profile_id,
          profile_version: resolvedProfile.profile.profile_version,
          profile_hash: resolvedProfile.profile_hash,
          model_option_id: null,
          normalized_params_hash: null,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract,
          prompt_template_id: input.prompt.promptTemplateId,
          prompt_template_version: input.prompt.version,
          schema_name: input.schema_name,
          prompt_packet_hash: promptPacketHash,
          ...this.runtimePromptPacketProvenance(preparedPromptPacket),
          response_hash: responseHash,
          structured_output_hash: responseHash,
          cache_status: responseSource === 'cached_exact_invocation' ? 'hit' : 'not_applicable',
          response_reuse_ref: responseReuseRef,
          ...this.runtimeCompressionProvenance(input),
          operator_label: input.codex_response.operator_label,
          operator_approval_ref: input.codex_response.operator_approval_ref ?? null,
          local_approval_setting_ref: localApprovalSettingRef,
          response_source: responseSource,
          telemetry: null,
          ...this.debateExtensionProvenance(input),
        },
      };
    }

    const model = this.modelRefForResolvedProfile(resolvedProfile);
    if (!model) {
      return this.blockedSource(
        input,
        resolvedProfile,
        'MISSING_PROVIDER_MODEL_OPTION',
        'provider_response',
        promptPacketHash,
        {
          promptQualityReportRef: preparedPromptPacket.promptQualityReportRef,
          redactedPromptArtifactRef: preparedPromptPacket.redactedPromptArtifactRef,
          promptPacketCacheStatus: preparedPromptPacket.promptPacketCacheStatus,
          promptPacketCacheResultRef: preparedPromptPacket.promptPacketCacheResultRef,
          promptPacketCacheResultHash: preparedPromptPacket.promptPacketCacheResultHash,
        },
      );
    }
    const requestPolicy = this.requestPolicyForResolvedProfile(resolvedProfile);

    try {
      const request: LlmStructuredOutputRequest = {
        executionContext: {
          feature: this.featureId(input),
          operation: input.node_id,
          traceId: invocationAttemptId,
          metadata: {
            workflow_run_id: input.workflow_run_id,
            execution_mode: input.execution_mode,
            executor_kind: input.executor_kind,
            profile_id: input.profile_id,
            profile_hash: resolvedProfile.profile_hash,
            model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
            normalized_params_hash: resolvedProfile.normalized_params_hash,
          },
        },
        model,
        prompt: input.prompt,
        messages: input.messages,
        schemaName: input.schema_name,
        schema: this.providerCompatibleSchema(input.schema),
        policy: requestPolicy,
        normalizedParams: resolvedProfile.selected_model_option?.normalized_params,
        providerOverrides: resolvedProfile.selected_model_option?.provider_overrides,
      };
      const response = await this.llmGateway.createStructuredOutput<T>(request);
      const responseHash = this.hash(response.parsed);
      return {
        output: response.parsed,
        provenance: {
          workflow_run_id: input.workflow_run_id,
          node_id: input.node_id,
          node_attempt_id: input.node_attempt_id,
          invocation_attempt_id: invocationAttemptId,
          execution_mode: input.execution_mode,
          executor_kind: input.executor_kind,
          source_kind: 'provider_response',
          non_provider: false,
          run_mode: input.run_mode,
          profile_id: input.profile_id,
          profile_version: resolvedProfile.profile.profile_version,
          profile_hash: resolvedProfile.profile_hash,
          model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
          normalized_params_hash: resolvedProfile.normalized_params_hash,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract,
          prompt_template_id: input.prompt.promptTemplateId,
          prompt_template_version: input.prompt.version,
          schema_name: input.schema_name,
          prompt_packet_hash: promptPacketHash,
          ...this.runtimePromptPacketProvenance(preparedPromptPacket),
          response_hash: responseHash,
          structured_output_hash: responseHash,
          cache_status: 'not_applicable',
          response_reuse_ref: null,
          ...this.runtimeCompressionProvenance(input),
          provider_id: model.providerId,
          model_id: model.modelId,
          telemetry: response.telemetry,
          ...this.debateExtensionProvenance(input),
        },
      };
    } catch (error) {
      const llmError = error instanceof LlmGatewayError ? error : null;
      return {
        output: null,
        provenance: {
          workflow_run_id: input.workflow_run_id,
          node_id: input.node_id,
          node_attempt_id: input.node_attempt_id,
          invocation_attempt_id: invocationAttemptId,
          execution_mode: input.execution_mode,
          executor_kind: input.executor_kind,
          source_kind: 'provider_response',
          non_provider: false,
          run_mode: input.run_mode,
          profile_id: input.profile_id,
          profile_version: resolvedProfile.profile.profile_version,
          profile_hash: resolvedProfile.profile_hash,
          model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
          normalized_params_hash: resolvedProfile.normalized_params_hash,
          capability_degraded: false,
          capability_degrade_reason: null,
          output_contract: input.output_contract,
          prompt_template_id: input.prompt.promptTemplateId,
          prompt_template_version: input.prompt.version,
          schema_name: input.schema_name,
          prompt_packet_hash: promptPacketHash,
          ...this.runtimePromptPacketProvenance(preparedPromptPacket),
          response_hash: null,
          structured_output_hash: null,
          cache_status: 'not_applicable',
          response_reuse_ref: null,
          ...this.runtimeCompressionProvenance(input),
          provider_id: model.providerId,
          model_id: model.modelId,
          telemetry: llmError?.telemetry ?? null,
          ...this.debateExtensionProvenance(input),
        },
        error_code: llmError?.code ?? 'PROVIDER_EXECUTION_FAILED',
        blocker_codes: [llmError?.code ?? 'PROVIDER_EXECUTION_FAILED'],
        validation: this.providerFailureValidationSummary(llmError),
      };
    }
  }

  private providerCompatibleSchema(schema: Record<string, unknown>): Record<string, unknown> {
    return this.toProviderCompatibleSchema(schema) as Record<string, unknown>;
  }

  private assertCodexReuseProvenance<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
    responseHash: string,
    promptPacketHash: string,
    localApprovalSettingRef: string | null,
  ): TopicSelectionExactResponseReuseProvenance {
    const provenance = input.codex_response?.reuse_provenance ?? null;
    if (!provenance) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'codex_assisted cached exact invocation reuse requires reuse provenance.',
      );
    }
    if (provenance.non_provider !== true || provenance.source_execution_mode === 'provider_llm') {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'codex_assisted cached exact invocation reuse provenance must be non-provider.',
      );
    }
    if (provenance.response_hash !== responseHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted reuse response hash drift detected.');
    }
    if (provenance.prompt_packet_hash !== promptPacketHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted reuse prompt packet hash drift detected.');
    }
    if (provenance.profile_hash !== resolvedProfile.profile_hash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted reuse profile hash drift detected.');
    }
    const approvalRef = input.codex_response?.operator_approval_ref ?? null;
    if (approvalRef) {
      if (provenance.approval_ref?.ref_id !== approvalRef.ref_id) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted reuse approval ref drift detected.');
      }
      return provenance;
    }
    if (!localApprovalSettingRef || provenance.local_approval_setting_ref !== localApprovalSettingRef) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted reuse local approval setting drift detected.');
    }
    return provenance;
  }

  private async recordResponseReuseProvenance<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    provenance: TopicSelectionExactResponseReuseProvenance,
  ): Promise<string> {
    if (!this.controlPlane) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'codex_assisted exact response reuse requires control-plane artifact recording.',
      );
    }
    const artifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload: {
        payload_schema: 'TopicSelectionExactResponseReuseProvenance@v1',
        provenance,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return artifact.artifact_ref_id;
  }

  private toProviderCompatibleSchema(value: unknown, parentKey: string | null = null): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.toProviderCompatibleSchema(item));
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const record = value as Record<string, unknown>;
    const allOf = Array.isArray(record.allOf)
      ? record.allOf.map((item) => this.toProviderCompatibleSchema(item))
      : null;
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(record)) {
      if (parentKey === 'properties' && child === false) {
        continue;
      }
      if (key === 'allOf') {
        continue;
      }
      if (key === 'not' || key === 'propertyNames') {
        continue;
      }
      if (
        key === 'if'
        || key === 'then'
        || key === 'else'
        || key === 'dependentRequired'
        || key === 'dependentSchemas'
      ) {
        continue;
      }
      output[key] = this.toProviderCompatibleSchema(child, key);
    }
    if (allOf) {
      return this.mergeProviderCompatibleSchemas([...allOf, output]);
    }
    return output;
  }

  private mergeProviderCompatibleSchemas(schemas: unknown[]): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const schema of schemas) {
      if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
        continue;
      }
      for (const [key, value] of Object.entries(schema)) {
        if (key === 'required' && Array.isArray(value)) {
          merged.required = this.uniqueStrings([
            ...this.stringArrayValue(merged.required),
            ...this.stringArrayValue(value),
          ]);
          continue;
        }
        if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
          merged.properties = {
            ...(merged.properties && typeof merged.properties === 'object' && !Array.isArray(merged.properties)
              ? merged.properties
              : {}),
            ...value,
          };
          continue;
        }
        if (key === 'additionalProperties') {
          merged.additionalProperties = merged.additionalProperties === false || value === false
            ? false
            : value;
          continue;
        }
        merged[key] = value;
      }
    }
    return merged;
  }

  private async buildResult<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    value: {
      status: TopicSelectionAgentInvocationStatus;
      structuredOutput: T | null;
      provenance: TopicSelectionAgentInvocationProvenance;
      validation: TopicSelectionAgentValidationSummary;
      tokenBudgetGateResult?: TopicSelectionAgentTokenBudgetGateResult | null;
      warningCodes?: string[];
      blockerCodes: string[];
      errorCode?: string | null;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    const warningCodes = this.uniqueStrings(value.warningCodes ?? []);
    const auditSnapshot: TopicSelectionAgentInvocationAuditSnapshot = {
      schema_version: TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION,
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: value.status,
      provenance: value.provenance,
      token_budget_gate_result: value.tokenBudgetGateResult ?? null,
      validation: value.validation,
      warning_codes: warningCodes,
      blocker_codes: value.blockerCodes,
      created_at: this.now(),
    };
    this.assertAuditSnapshot(auditSnapshot);
    const auditArtifact = await this.recordAuditArtifact(input, auditSnapshot);
    return {
      schema_version: 'v1',
      node_id: input.node_id,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status: value.status,
      structured_output: value.structuredOutput,
      provenance: value.provenance,
      validation: value.validation,
      token_budget_gate_result: value.tokenBudgetGateResult ?? null,
      warning_codes: warningCodes,
      blocker_codes: value.blockerCodes,
      error_code: value.errorCode ?? null,
      audit_snapshot: auditSnapshot,
      audit_artifact_ref: auditArtifact ? this.toArtifactFunctionalRef(auditArtifact) : null,
    };
  }

  private assertAuditSnapshot(snapshot: TopicSelectionAgentInvocationAuditSnapshot): void {
    const valid = this.auditSnapshotValidator(snapshot);
    if (valid) {
      return;
    }
    const message = (this.auditSnapshotValidator.errors ?? [])
      .map((error: ErrorObject) => `${error.instancePath || '/'} ${error.message ?? 'schema validation failed'}`)
      .join('; ');
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `Agent invocation audit snapshot violated shared contract: ${message}`,
    );
  }

  private async recordAuditArtifact(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    auditSnapshot: TopicSelectionAgentInvocationAuditSnapshot,
  ): Promise<TopicSelectionArtifactRefRecord | null> {
    if (!this.controlPlane) {
      return null;
    }
    return this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload: auditSnapshot as unknown as Record<string, unknown>,
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
  }

  private async preparePromptPacket<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
  ): Promise<PreparedPromptPacket> {
    const runtime = input.runtime_token_budget;
    if (!runtime) {
      return {
        promptPacketHash: this.promptPacketHash(input, resolvedProfile),
        promptPacketCacheStatus: null,
        promptPacketCacheResultRef: null,
        promptPacketCacheResultHash: null,
        promptQualityReportRef: null,
        redactedPromptArtifactRef: null,
        blockerCodes: [],
        warningCodes: [],
      };
    }

    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(input, runtime);
    const promptVariantKey = input.prompt_variant_key?.trim()
      || runtime.context_policy_profile.invocation_slot_id;
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: input.title_card_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_id: input.node_id,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: input.prompt.promptTemplateId,
      prompt_template_version: input.prompt.version,
      prompt_variant_key: promptVariantKey,
      invocation_slot_id: runtime.context_policy_profile.invocation_slot_id,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      messages: input.messages,
      source_refs: this.promptSourceRefs(input),
      context_packet_hashes: this.promptContextPacketHashes(input),
      compression_report_ref: runtime.compression_report_ref ?? null,
      compression_report_hash: runtime.compression_report_hash ?? null,
      compressed_context_hash: runtime.compressed_context_hash ?? null,
      dynamic_material_refs: runtime.dynamic_material_refs ?? [],
      output_contract: input.output_contract,
      context_policy_profile: runtime.context_policy_profile,
      context_policy_profile_hash: runtime.context_policy_profile_hash,
      model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
      normalized_params_hash: resolvedProfile.normalized_params_hash,
      runtime_modifiers_hash: this.hash({
        compression_already_applied: runtime.compression_already_applied ?? false,
        runtime_invocation_context_hash: runtimeInvocationContextHash,
        execution_mode: input.execution_mode,
        executor_kind: input.executor_kind,
        run_mode: input.run_mode,
      }),
      redaction_policy: runtime.context_policy_profile.redaction_policy,
    });
    const suppliedHash = input.codex_response?.prompt_packet_hash?.trim() || null;
    if (suppliedHash && suppliedHash !== promptPacket.identity.prompt_packet_hash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted prompt packet hash drift detected.');
    }

    const cachedPromptPacket = await this.lookupPromptPacketCache(promptPacket, runtime);
    if (cachedPromptPacket) {
      return cachedPromptPacket;
    }

    const artifactRefs = await this.recordPromptPacketArtifacts(input, promptPacket);
    const recordedPromptPacket = await this.recordPromptPacketCache(
      promptPacket,
      runtime,
      artifactRefs,
    );
    return {
      promptPacketHash: suppliedHash ?? promptPacket.identity.prompt_packet_hash,
      promptPacketCacheStatus: recordedPromptPacket.promptPacketCacheStatus,
      promptPacketCacheResultRef: recordedPromptPacket.promptPacketCacheResultRef,
      promptPacketCacheResultHash: recordedPromptPacket.promptPacketCacheResultHash,
      promptQualityReportRef: recordedPromptPacket.promptQualityReportRef,
      redactedPromptArtifactRef: recordedPromptPacket.redactedPromptArtifactRef,
      blockerCodes: recordedPromptPacket.blockerCodes,
      warningCodes: recordedPromptPacket.warningCodes,
    };
  }

  private async lookupPromptPacketCache(
    promptPacket: TopicSelectionPromptPacketRuntimeResult,
    runtime: TopicSelectionAgentRuntimeTokenBudgetInput,
  ): Promise<PreparedPromptPacket | null> {
    if (!this.promptPacketCache) {
      return null;
    }
    const result = await this.promptPacketCache.lookup({
      identity: promptPacket.identity,
      context_policy_profile: runtime.context_policy_profile,
      context_policy_profile_hash: runtime.context_policy_profile_hash,
      provenance_ref: promptPacket.identity.provenance_ref,
    });
    if (result.cache_result === 'hit') {
      if (!this.promptCacheQualityMatchesCurrentRuntime(result, promptPacket)) {
        return {
          promptPacketHash: promptPacket.identity.prompt_packet_hash,
          promptPacketCacheStatus: result.cache_result,
          promptPacketCacheResultRef: result.provenance_ref,
          promptPacketCacheResultHash: this.hash(result),
          promptQualityReportRef: null,
          redactedPromptArtifactRef: null,
          blockerCodes: ['PROMPT_PACKET_CACHE_BLOCKED_DRIFT'],
          warningCodes: this.uniqueStrings([
            ...result.warning_codes,
            ...promptPacket.warning_codes,
          ]),
        };
      }
      return {
        promptPacketHash: result.prompt_packet_hash,
        promptPacketCacheStatus: result.cache_result,
        promptPacketCacheResultRef: result.provenance_ref,
        promptPacketCacheResultHash: this.hash(result),
        promptQualityReportRef: result.prompt_quality_report_ref,
        redactedPromptArtifactRef: result.redacted_prompt_artifact_ref,
        blockerCodes: promptPacket.prompt_quality_report.quality_decision === 'block'
          && promptPacket.blocker_codes.length === 0
          ? ['PROMPT_QUALITY_GATE_BLOCKED']
          : promptPacket.blocker_codes,
        warningCodes: promptPacket.warning_codes,
      };
    }
    if (result.cache_result === 'blocked_stale' || result.cache_result === 'blocked_drift') {
      return {
        promptPacketHash: promptPacket.identity.prompt_packet_hash,
        promptPacketCacheStatus: result.cache_result,
        promptPacketCacheResultRef: result.provenance_ref,
        promptPacketCacheResultHash: this.hash(result),
        promptQualityReportRef: null,
        redactedPromptArtifactRef: null,
        blockerCodes: [
          result.cache_result === 'blocked_stale'
            ? 'PROMPT_PACKET_CACHE_BLOCKED_STALE'
            : 'PROMPT_PACKET_CACHE_BLOCKED_DRIFT',
        ],
        warningCodes: result.warning_codes,
      };
    }
    return null;
  }

  private promptCacheQualityMatchesCurrentRuntime(
    cached: {
      quality_decision: string | null;
      blocker_codes: string[];
      warning_codes: string[];
    },
    promptPacket: TopicSelectionPromptPacketRuntimeResult,
  ): boolean {
    return cached.quality_decision === promptPacket.prompt_quality_report.quality_decision
      && this.sameStringSet(cached.blocker_codes, promptPacket.blocker_codes)
      && this.sameStringSet(cached.warning_codes, promptPacket.warning_codes);
  }

  private async recordPromptPacketCache(
    promptPacket: TopicSelectionPromptPacketRuntimeResult,
    runtime: TopicSelectionAgentRuntimeTokenBudgetInput,
    artifactRefs: {
      promptQualityReportRef: TopicSelectionFunctionalRef;
      promptQualityReportHash: string;
      redactedPromptArtifactRef: TopicSelectionFunctionalRef;
      redactedPromptArtifactHash: string;
    },
  ): Promise<{
    promptPacketCacheStatus: TopicSelectionRuntimeCacheResult | null;
    promptPacketCacheResultRef: TopicSelectionFunctionalRef | null;
    promptPacketCacheResultHash: string | null;
    promptQualityReportRef: TopicSelectionFunctionalRef;
    redactedPromptArtifactRef: TopicSelectionFunctionalRef;
    blockerCodes: string[];
    warningCodes: string[];
  }> {
    if (!this.promptPacketCache) {
      return {
        promptPacketCacheStatus: 'bypassed',
        promptPacketCacheResultRef: null,
        promptPacketCacheResultHash: null,
        promptQualityReportRef: artifactRefs.promptQualityReportRef,
        redactedPromptArtifactRef: artifactRefs.redactedPromptArtifactRef,
        blockerCodes: promptPacket.blocker_codes,
        warningCodes: promptPacket.warning_codes,
      };
    }
    const recorded = await this.promptPacketCache.recordFreshArtifacts({
      identity: promptPacket.identity,
      context_policy_profile: runtime.context_policy_profile,
      context_policy_profile_hash: runtime.context_policy_profile_hash,
      redacted_prompt_artifact_ref: artifactRefs.redactedPromptArtifactRef,
      redacted_prompt_artifact_hash: artifactRefs.redactedPromptArtifactHash,
      prompt_quality_report_ref: artifactRefs.promptQualityReportRef,
      prompt_quality_report_hash: artifactRefs.promptQualityReportHash,
      quality_decision: promptPacket.prompt_quality_report.quality_decision,
      provenance_ref: promptPacket.identity.provenance_ref,
      blocker_codes: promptPacket.blocker_codes,
      warning_codes: promptPacket.warning_codes,
    });
    return {
      promptPacketCacheStatus: recorded.inserted ? 'miss' : 'hit',
      promptPacketCacheResultRef: recorded.entry.provenance_ref,
      promptPacketCacheResultHash: this.hash({
        cache_result: recorded.inserted ? 'miss' : 'hit',
        prompt_packet_hash: recorded.entry.prompt_packet_hash,
        context_policy_profile_hash: recorded.entry.context_policy_profile_hash,
        provenance_ref: recorded.entry.provenance_ref,
      }),
      promptQualityReportRef: recorded.entry.prompt_quality_report_ref,
      redactedPromptArtifactRef: recorded.entry.redacted_prompt_artifact_ref,
      blockerCodes: recorded.entry.blocker_codes,
      warningCodes: recorded.entry.warning_codes,
    };
  }

  private async recordPromptPacketArtifacts<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    promptPacket: TopicSelectionPromptPacketRuntimeResult,
  ): Promise<{
    promptQualityReportRef: TopicSelectionFunctionalRef;
    promptQualityReportHash: string;
    redactedPromptArtifactRef: TopicSelectionFunctionalRef;
    redactedPromptArtifactHash: string;
  }> {
    if (!this.controlPlane) {
      return {
        promptQualityReportRef: promptPacket.prompt_quality_report.prompt_quality_report_ref,
        promptQualityReportHash: this.hash(promptPacket.prompt_quality_report),
        redactedPromptArtifactRef: promptPacket.redacted_prompt_artifact.artifact_ref,
        redactedPromptArtifactHash: this.hash(promptPacket.redacted_prompt_artifact),
      };
    }
    const redactedPromptArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload: {
        payload_schema: TOPIC_SELECTION_REDACTED_PROMPT_PACKET_ARTIFACT_SCHEMA_VERSION,
        artifact: promptPacket.redacted_prompt_artifact,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    const redactedPromptArtifactRef = this.toArtifactFunctionalRef(redactedPromptArtifact);
    const promptQualityReportArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload: {
        payload_schema: TOPIC_SELECTION_PROMPT_QUALITY_REPORT_SCHEMA_VERSION,
        report: promptPacket.prompt_quality_report,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return {
      promptQualityReportRef: this.toArtifactFunctionalRef(promptQualityReportArtifact),
      promptQualityReportHash: this.requiredChecksum(promptQualityReportArtifact),
      redactedPromptArtifactRef,
      redactedPromptArtifactHash: this.requiredChecksum(redactedPromptArtifact),
    };
  }

  private promptSourceRefs(input: TopicSelectionAgentInvocationRequest<unknown>): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...(input.input_refs ?? []),
      ...(input.context_packet_refs ?? []),
    ]);
  }

  private promptContextPacketHashes(input: TopicSelectionAgentInvocationRequest<unknown>): string[] {
    const explicitHashes = this.uniqueStrings(input.context_packet_hashes ?? []);
    if (explicitHashes.length > 0) {
      return explicitHashes;
    }
    if (!input.context_packet_refs?.length) {
      return [];
    }
    return [this.hash(input.context_packet_refs)];
  }

  private runtimeInvocationContextHash(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    runtime: TopicSelectionAgentRuntimeTokenBudgetInput,
  ): string {
    const suppliedHash = runtime.runtime_invocation_context_hash?.trim();
    if (suppliedHash) {
      return suppliedHash;
    }

    const debateExtension = input.debate_extension ?? null;
    const dynamicMaterialRefsHash = runtime.dynamic_material_refs?.length
      ? this.hash(runtime.dynamic_material_refs)
      : null;
    const debateDynamicMaterialRefsHash = debateExtension
      ? this.hash({
        dynamic_material_refs_hash: dynamicMaterialRefsHash,
        role_level_summary_ref: debateExtension.role_level_summary_ref ?? null,
        arbiter_issue_frame_ref: debateExtension.arbiter_issue_frame_ref ?? null,
        arbiter_final_artifact_ref: debateExtension.arbiter_final_artifact_ref ?? null,
      })
      : null;

    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: runtime.context_policy_profile.invocation_slot_id,
      scenario_context: {
        identity_policy: 'not_semantic',
        scenario_id: null,
        scenario_case_id: null,
        semantic_scenario_key: null,
      },
      loop_context: debateExtension
        ? {
          loop_kind: 'debate_round',
          loop_stage: debateExtension.stage,
          current_round_index: debateExtension.round_index,
          remaining_round_budget: null,
          loopback_source_node_id: null,
          repair_origin_ref: null,
          repair_origin_hash: null,
        }
        : {
          loop_kind: 'not_applicable',
          loop_stage: null,
          current_round_index: null,
          remaining_round_budget: null,
          loopback_source_node_id: null,
          repair_origin_ref: null,
          repair_origin_hash: null,
        },
      debate_context: debateExtension
        ? {
          debate_loop_id: debateExtension.debate_loop_id,
          debate_policy_id: debateExtension.debate_policy_id,
          round_index: debateExtension.round_index,
          role: debateExtension.role,
          stage: debateExtension.stage,
          agent_instance_id: debateExtension.agent_instance_id,
          parent_invocation_attempt_ids_hash: debateExtension.parent_invocation_attempt_ids.length > 0
            ? this.hash(debateExtension.parent_invocation_attempt_ids)
            : null,
          dynamic_material_refs_hash: debateDynamicMaterialRefsHash,
        }
        : {
          debate_loop_id: null,
          debate_policy_id: null,
          round_index: null,
          role: null,
          stage: null,
          agent_instance_id: null,
          parent_invocation_attempt_ids_hash: null,
          dynamic_material_refs_hash: dynamicMaterialRefsHash,
        },
    });
  }

  private blockedSource<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
    errorCode: string,
    sourceKind: TopicSelectionAgentOutputSourceKind,
    promptPacketHash: string,
    options: {
      blockerCodes?: string[];
      warningCodes?: string[];
      validation?: TopicSelectionAgentValidationSummary;
      compressionReportRef?: TopicSelectionFunctionalRef | null;
      compressionReportHash?: string | null;
      compressedContextHash?: string | null;
      promptQualityReportRef?: TopicSelectionFunctionalRef | null;
      redactedPromptArtifactRef?: TopicSelectionFunctionalRef | null;
      promptPacketCacheStatus?: TopicSelectionRuntimeCacheResult | null;
      promptPacketCacheResultRef?: TopicSelectionFunctionalRef | null;
      promptPacketCacheResultHash?: string | null;
    } = {},
  ): SourceExecution<T> {
    const model = this.modelRefForResolvedProfile(resolvedProfile);
    const mockResponseHash = input.mocked_output ? this.hash(input.mocked_output.output) : null;
    return {
      output: null,
      provenance: {
        workflow_run_id: input.workflow_run_id,
        node_id: input.node_id,
        node_attempt_id: input.node_attempt_id,
        invocation_attempt_id: this.invocationAttemptId(input),
        execution_mode: input.execution_mode,
        executor_kind: input.executor_kind,
        source_kind: sourceKind,
        non_provider: sourceKind !== 'provider_response',
        run_mode: input.run_mode,
        profile_id: input.profile_id,
        profile_version: resolvedProfile.profile.profile_version,
        profile_hash: resolvedProfile.profile_hash,
        model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
        normalized_params_hash: resolvedProfile.normalized_params_hash,
        capability_degraded: false,
        capability_degrade_reason: null,
        output_contract: input.output_contract,
        prompt_template_id: input.prompt.promptTemplateId,
        prompt_template_version: input.prompt.version,
        schema_name: input.schema_name,
        prompt_packet_hash: promptPacketHash,
        ...this.runtimePromptPacketProvenance({
          promptPacketHash,
          promptPacketCacheStatus: options.promptPacketCacheStatus ?? null,
          promptPacketCacheResultRef: options.promptPacketCacheResultRef ?? null,
          promptPacketCacheResultHash: options.promptPacketCacheResultHash ?? null,
          promptQualityReportRef: options.promptQualityReportRef ?? null,
          redactedPromptArtifactRef: options.redactedPromptArtifactRef ?? null,
          blockerCodes: [],
          warningCodes: [],
        }),
        response_hash: null,
        structured_output_hash: null,
        cache_status: 'not_applicable',
        response_reuse_ref: null,
        ...this.runtimeCompressionProvenance(input, {
          compressionReportRef: options.compressionReportRef,
          compressionReportHash: options.compressionReportHash,
          compressedContextHash: options.compressedContextHash,
        }),
        telemetry: null,
        ...(sourceKind === 'provider_response' && model ? {
          provider_id: model.providerId,
          model_id: model.modelId,
        } : {}),
        ...(sourceKind === 'mock_fixture' && input.mocked_output ? {
          fixture_id: input.mocked_output.fixture_id,
          fixture_hash: input.mocked_output.fixture_hash?.trim() || mockResponseHash,
          mock_profile: input.mocked_output.mock_profile ?? null,
        } : {}),
        ...(sourceKind === 'codex_response' && input.codex_response ? {
          operator_label: input.codex_response.operator_label,
          operator_approval_ref: input.codex_response.operator_approval_ref ?? null,
          local_approval_setting_ref: input.codex_response.local_approval_setting_ref?.trim() || null,
          response_source: input.codex_response.response_source ?? 'operator_supplied',
        } : {}),
        ...this.debateExtensionProvenance(input),
      },
      error_code: errorCode,
      blocker_codes: options.blockerCodes ?? [errorCode],
      warning_codes: options.warningCodes ?? [],
      validation: options.validation,
    };
  }

  private async preflightTokenBudget<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
    promptPacketHash: string,
    preparedPromptPacket: PreparedPromptPacket,
  ): Promise<{
    blockedSource: SourceExecution<T> | null;
    warningCodes: string[];
    gateResult: TopicSelectionAgentTokenBudgetGateResult | null;
  }> {
    const runtime = input.runtime_token_budget;
    if (!runtime) {
      return {
        blockedSource: null,
        warningCodes: [],
        gateResult: null,
      };
    }

    this.assertModeSourceInput(input);
    this.assertNonEmpty(runtime.context_policy_profile_hash, 'runtime_token_budget.context_policy_profile_hash');
    if (runtime.context_policy_profile_hash !== this.hash(runtime.context_policy_profile)) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'runtime_token_budget.context_policy_profile_hash drift detected.',
      );
    }
    const selectedOption = resolvedProfile.selected_model_option;
    const evaluation = this.tokenBudgetGate.evaluate({
      context_policy_profile: runtime.context_policy_profile,
      provider_id: selectedOption?.provider_id ?? null,
      model_id: selectedOption?.model_id ?? null,
      model_profile_id: resolvedProfile.profile.profile_id,
      model_option_id: selectedOption?.option_id ?? null,
      messages: input.messages,
      context_payloads: runtime.context_payloads ?? [],
      schema: input.schema,
      extra_payloads: runtime.extra_payloads ?? [],
      compression_strategy_ref: runtime.compression_strategy_ref
        ?? this.compressionStrategyRef(runtime.context_policy_profile),
      compression_already_applied: runtime.compression_already_applied ?? false,
      estimated_input_tokens_override: runtime.estimated_input_tokens_override,
      schema_overhead_tokens_override: runtime.schema_overhead_tokens_override,
    });

    if (
      evaluation.result.decision === 'within_budget'
      || evaluation.result.decision === 'budget_unknown_allow_with_warning'
    ) {
      return {
        blockedSource: null,
        warningCodes: evaluation.result.warning_codes,
        gateResult: evaluation.result,
      };
    }

    if (evaluation.result.decision === 'requires_compression' && runtime.compression_attempt) {
      return this.blockForCompressionAttempt(
        input,
        resolvedProfile,
        promptPacketHash,
        runtime,
        evaluation.result,
        preparedPromptPacket,
      );
    }

    const errorCode = evaluation.result.decision === 'requires_compression'
      ? 'TOKEN_BUDGET_REQUIRES_COMPRESSION'
      : evaluation.result.blocker_codes[0] ?? 'TOKEN_BUDGET_BLOCKED_OVER_BUDGET';
    const blockerCodes = this.uniqueStrings([
      errorCode,
      ...evaluation.result.blocker_codes,
    ]);
    const warningCodes = this.uniqueStrings(evaluation.result.warning_codes);

    return {
      blockedSource: this.blockedSource(
        input,
        resolvedProfile,
        errorCode,
        this.sourceKindForExecutionMode(input),
        promptPacketHash,
        {
          blockerCodes,
          warningCodes,
          validation: this.runtimeGateValidationSummary(errorCode, evaluation.result.decision),
          promptQualityReportRef: preparedPromptPacket.promptQualityReportRef,
          redactedPromptArtifactRef: preparedPromptPacket.redactedPromptArtifactRef,
          promptPacketCacheStatus: preparedPromptPacket.promptPacketCacheStatus,
          promptPacketCacheResultRef: preparedPromptPacket.promptPacketCacheResultRef,
          promptPacketCacheResultHash: preparedPromptPacket.promptPacketCacheResultHash,
        },
      ),
      warningCodes,
      gateResult: evaluation.result,
    };
  }

  private async blockForCompressionAttempt<T>(
    input: TopicSelectionAgentInvocationRequest<T>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
    promptPacketHash: string,
    runtime: TopicSelectionAgentRuntimeTokenBudgetInput,
    gateResult: TopicSelectionAgentTokenBudgetGateResult,
    preparedPromptPacket: PreparedPromptPacket,
  ): Promise<{
    blockedSource: SourceExecution<T>;
    warningCodes: string[];
    gateResult: TopicSelectionAgentTokenBudgetGateResult;
  }> {
    const compression = await this.createCompressionReport(input, runtime);
    const warningCodes = this.uniqueStrings([
      ...gateResult.warning_codes,
      ...compression.result.warning_codes,
      'COMPRESSION_REPORT_RECORDED',
    ]);
    const blockerCodes = compression.result.quality_gate_result === 'blocked'
      ? this.uniqueStrings([
        'COMPRESSION_QUALITY_GATE_BLOCKED',
        ...compression.result.blocker_codes,
      ])
      : ['TOKEN_BUDGET_REQUIRES_COMPRESSION'];
    const errorCode = blockerCodes[0] ?? 'TOKEN_BUDGET_REQUIRES_COMPRESSION';

    return {
      blockedSource: this.blockedSource(
        input,
        resolvedProfile,
        errorCode,
        this.sourceKindForExecutionMode(input),
        promptPacketHash,
        {
          blockerCodes,
          warningCodes,
          compressionReportRef: compression.artifact_ref,
          compressionReportHash: compression.artifact_hash,
          compressedContextHash: compression.result.report.compressed_context_hash,
          promptQualityReportRef: preparedPromptPacket.promptQualityReportRef,
          redactedPromptArtifactRef: preparedPromptPacket.redactedPromptArtifactRef,
          promptPacketCacheStatus: preparedPromptPacket.promptPacketCacheStatus,
          promptPacketCacheResultRef: preparedPromptPacket.promptPacketCacheResultRef,
          promptPacketCacheResultHash: preparedPromptPacket.promptPacketCacheResultHash,
          validation: this.runtimeGateValidationSummary(
            errorCode,
            compression.result.quality_gate_result === 'blocked'
              ? 'compression_quality_gate_blocked'
              : 'requires_compression',
          ),
        },
      ),
      warningCodes,
      gateResult,
    };
  }

  private async createCompressionReport(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    runtime: TopicSelectionAgentRuntimeTokenBudgetInput,
  ): Promise<{
    artifact_ref: TopicSelectionFunctionalRef;
    artifact_hash: string;
    result: TopicSelectionCompressionReportRuntimeResult;
  }> {
    const attempt = runtime.compression_attempt;
    if (!attempt) {
      throw new AppError(500, 'INTERNAL_ERROR', 'compression attempt input is required.');
    }
    if (!this.controlPlane) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'compression report recording requires control-plane artifact recording.',
      );
    }

    const result = this.compressionRuntime.createReport({
      context_policy_profile: runtime.context_policy_profile,
      context_policy_profile_hash: runtime.context_policy_profile_hash,
      compression_report_ref: attempt.compression_report_ref ?? this.syntheticCompressionReportRef(input, attempt),
      source_refs: attempt.source_refs,
      input_context: attempt.input_context,
      compressed_context: attempt.compressed_context,
      summary: attempt.summary,
      compression_executor_kind: attempt.compression_executor_kind,
      required_preserved_facts: attempt.required_preserved_facts ?? null,
      compressed_preserved_facts: attempt.compressed_preserved_facts ?? null,
      redaction_policy: attempt.redaction_policy ?? null,
      estimated_input_tokens_before_override: attempt.estimated_input_tokens_before_override,
      estimated_input_tokens_after_override: attempt.estimated_input_tokens_after_override,
    });
    const artifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      payload: {
        payload_schema: 'TopicSelectionCompressionReportEnvelope@v1',
        report: result.report,
      },
      workflow_run_id: input.workflow_run_id,
      created_by: input.created_by ?? 'system',
    });
    return {
      artifact_ref: this.toArtifactFunctionalRef(artifact),
      artifact_hash: this.requiredChecksum(artifact),
      result,
    };
  }

  private syntheticCompressionReportRef(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    attempt: TopicSelectionAgentRuntimeCompressionAttemptInput,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: 'compression_report',
      ref_id: `compression_report_${this.hash({
        node_attempt_id: input.node_attempt_id,
        source_refs: attempt.source_refs,
        compressed_context: attempt.compressed_context,
        summary: attempt.summary,
      }).slice(0, 32)}`,
      title_card_id: input.title_card_id ?? null,
    };
  }

  private compressionStrategyRef(
    profile: TopicSelectionContextPolicyProfile,
  ): TopicSelectionFunctionalRef | null {
    const strategyId = profile.compression_policy.compression_strategy_id?.trim();
    const strategyVersion = profile.compression_policy.compression_strategy_version?.trim();
    if (!strategyId || !strategyVersion) {
      return null;
    }
    return {
      ref_type: 'compression_strategy',
      ref_id: strategyId,
      version_id: strategyVersion,
    };
  }

  private promptPacketHash(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    resolvedProfile: TopicSelectionResolvedModelProfile,
  ): string {
    const computedHash = this.hash({
      context_packet_refs: input.context_packet_refs ?? [],
      input_refs: input.input_refs ?? [],
      messages: input.messages,
      compression_identity: this.runtimeCompressionIdentity(input),
      model_option_id: resolvedProfile.selected_model_option?.option_id ?? null,
      prompt: input.prompt,
      profile_id: input.profile_id,
      profile_hash: resolvedProfile.profile_hash,
      schema_name: input.schema_name,
    });
    const suppliedHash = input.codex_response?.prompt_packet_hash?.trim() || null;
    if (suppliedHash && suppliedHash !== computedHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_assisted prompt packet hash drift detected.');
    }
    return suppliedHash ?? computedHash;
  }

  private sourceKindForExecutionMode(
    input: TopicSelectionAgentInvocationRequest<unknown>,
  ): TopicSelectionAgentOutputSourceKind {
    if (input.execution_mode === 'mocked_llm') {
      return 'mock_fixture';
    }
    if (input.execution_mode === 'codex_assisted') {
      return 'codex_response';
    }
    return 'provider_response';
  }

  private assertModeSourceInput(input: TopicSelectionAgentInvocationRequest<unknown>): void {
    if (input.execution_mode === 'mocked_llm') {
      if (input.run_mode === 'product') {
        throw new AppError(400, 'INVALID_PAYLOAD', 'mocked_llm cannot run in product mode.');
      }
      if (!input.mocked_output) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'mocked_output is required for mocked_llm.');
      }
    }
    if (input.execution_mode === 'codex_assisted' && !input.codex_response) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'codex_response is required for codex_assisted.');
    }
  }

  private runtimeGateValidationSummary(
    errorCode: string,
    decision: string,
  ): TopicSelectionAgentValidationSummary {
    return {
      valid: false,
      error_count: 1,
      errors: [`${errorCode}: token budget gate decision ${decision}`],
    };
  }

  private invocationAttemptId(input: TopicSelectionAgentInvocationRequest<unknown>): string {
    return input.invocation_attempt_id?.trim() || input.node_attempt_id;
  }

  private featureId(input: TopicSelectionAgentInvocationRequest<unknown>): string {
    return input.feature_id?.trim() || 'topic_selection';
  }

  private debateExtensionProvenance(
    input: TopicSelectionAgentInvocationRequest<unknown>,
  ): Pick<TopicSelectionAgentInvocationProvenance, 'debate_extension'> | Record<string, never> {
    return input.debate_extension ? { debate_extension: input.debate_extension } : {};
  }

  private runtimeCompressionIdentity(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    overrides: {
      compressionReportRef?: TopicSelectionFunctionalRef | null;
      compressionReportHash?: string | null;
      compressedContextHash?: string | null;
    } = {},
  ): {
    compression_report_ref: TopicSelectionFunctionalRef | null;
    compression_report_hash: string | null;
    compressed_context_hash: string | null;
  } {
    const runtime = input.runtime_token_budget;
    return {
      compression_report_ref:
        overrides.compressionReportRef !== undefined
          ? overrides.compressionReportRef
          : runtime?.compression_report_ref ?? null,
      compression_report_hash:
        overrides.compressionReportHash !== undefined
          ? overrides.compressionReportHash
          : runtime?.compression_report_hash ?? null,
      compressed_context_hash:
        overrides.compressedContextHash !== undefined
          ? overrides.compressedContextHash
          : runtime?.compressed_context_hash ?? null,
    };
  }

  private runtimeCompressionProvenance(
    input: TopicSelectionAgentInvocationRequest<unknown>,
    overrides: {
      compressionReportRef?: TopicSelectionFunctionalRef | null;
      compressionReportHash?: string | null;
      compressedContextHash?: string | null;
    } = {},
  ): Pick<
    TopicSelectionAgentInvocationProvenance,
    'compression_report_ref' | 'compression_report_hash' | 'compressed_context_hash'
  > | Record<string, never> {
    const identity = this.runtimeCompressionIdentity(input, overrides);
    if (
      !identity.compression_report_ref
      && !identity.compression_report_hash
      && !identity.compressed_context_hash
    ) {
      return {};
    }
    return identity;
  }

  private requiredChecksum(record: TopicSelectionArtifactRefRecord): string {
    if (!record.checksum) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Recorded artifact is missing checksum.');
    }
    return record.checksum;
  }

  private validateStructuredOutput(
    schemaName: string,
    schema: Record<string, unknown>,
    output: unknown,
  ): TopicSelectionAgentValidationSummary {
    const validator = this.validatorFor(schemaName, schema);
    const valid = validator(output);
    if (valid) {
      return this.validationSummary([]);
    }
    return this.validationSummary(validator.errors ?? []);
  }

  private validatorFor(schemaName: string, schema: Record<string, unknown>): ValidateFunction {
    const schemaHash = this.hash(schema);
    const key = `${schemaName}:${schemaHash}`;
    const existing = this.validators.get(key);
    if (existing) {
      return existing;
    }
    const validator = this.ajv.compile(schema);
    this.validators.set(key, validator);
    return validator;
  }

  private validationSummary(errors: ErrorObject[] | null): TopicSelectionAgentValidationSummary {
    if (errors === null) {
      return {
        valid: false,
        error_count: 1,
        errors: ['output unavailable'],
      };
    }
    return {
      valid: errors.length === 0,
      error_count: errors.length,
      errors: errors.map((error) => `${error.instancePath || '/'} ${error.message ?? 'schema validation failed'}`),
    };
  }

  private providerFailureValidationSummary(error: LlmGatewayError | null): TopicSelectionAgentValidationSummary {
    if (!error) {
      return this.validationSummary(null);
    }
    const statusSuffix = error.statusCode ? ` status=${error.statusCode}` : '';
    return {
      valid: false,
      error_count: 1,
      errors: [
        `${error.code}${statusSuffix}: ${this.sanitizeProviderErrorMessage(error.message)}`,
      ],
    };
  }

  private sanitizeProviderErrorMessage(message: string): string {
    return message
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/giu, 'Bearer [REDACTED]')
      .replace(/sk-[A-Za-z0-9_-]+/giu, '[REDACTED_API_KEY]')
      .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;}]+/giu, '$1[REDACTED]')
      .replace(/(access[_-]?token\s*[:=]\s*)[^\s,;}]+/giu, '$1[REDACTED]')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 500);
  }

  private promptQualityValidationSummary(blockerCodes: string[]): TopicSelectionAgentValidationSummary {
    const blockers = this.uniqueStrings(blockerCodes);
    return {
      valid: false,
      error_count: blockers.length || 1,
      errors: blockers.length > 0
        ? blockers.map((code) => `PROMPT_QUALITY_GATE_BLOCKED: ${code}`)
        : ['PROMPT_QUALITY_GATE_BLOCKED'],
    };
  }

  private runtimePromptPacketProvenance(
    preparedPromptPacket: PreparedPromptPacket,
  ): Pick<
    TopicSelectionAgentInvocationProvenance,
    | 'prompt_packet_cache_status'
    | 'prompt_packet_cache_result_ref'
    | 'prompt_packet_cache_result_hash'
    | 'redacted_prompt_artifact_ref'
    | 'prompt_quality_report_ref'
  > | Record<string, never> {
    if (
      preparedPromptPacket.promptPacketCacheStatus === null
      && !preparedPromptPacket.promptPacketCacheResultRef
      && !preparedPromptPacket.promptPacketCacheResultHash
      && !preparedPromptPacket.redactedPromptArtifactRef
      && !preparedPromptPacket.promptQualityReportRef
    ) {
      return {};
    }
    return {
      prompt_packet_cache_status: preparedPromptPacket.promptPacketCacheStatus,
      prompt_packet_cache_result_ref: preparedPromptPacket.promptPacketCacheResultRef,
      prompt_packet_cache_result_hash: preparedPromptPacket.promptPacketCacheResultHash,
      redacted_prompt_artifact_ref: preparedPromptPacket.redactedPromptArtifactRef,
      prompt_quality_report_ref: preparedPromptPacket.promptQualityReportRef,
    };
  }

  private findForbiddenOutputPath(value: unknown, path: string[] = ['structured_output']): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const child = this.findForbiddenOutputPath(item, [...path, String(index)]);
        if (child) {
          return child;
        }
      }
      return null;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = [...path, key];
      if (FORBIDDEN_OUTPUT_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        return childPath.join('.');
      }
      const found = this.findForbiddenOutputPath(child, childPath);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private assertInvocationInput(input: TopicSelectionAgentInvocationRequest<unknown>): void {
    this.assertNonEmpty(input.node_id, 'node_id');
    this.assertNonEmpty(input.workflow_run_id, 'workflow_run_id');
    this.assertNonEmpty(input.node_attempt_id, 'node_attempt_id');
    if (input.invocation_attempt_id !== undefined && input.invocation_attempt_id !== null) {
      this.assertNonEmpty(input.invocation_attempt_id, 'invocation_attempt_id');
    }
    this.assertNonEmpty(input.profile_id, 'profile_id');
    this.assertNonEmpty(input.output_contract, 'output_contract');
    this.assertNonEmpty(input.prompt.promptTemplateId, 'prompt.promptTemplateId');
    this.assertNonEmpty(input.prompt.version, 'prompt.version');
    if (input.prompt_variant_key !== undefined && input.prompt_variant_key !== null) {
      this.assertNonEmpty(input.prompt_variant_key, 'prompt_variant_key');
    }
    this.assertNonEmpty(input.schema_name, 'schema_name');
    if (!['mocked_llm', 'codex_assisted', 'provider_llm'].includes(input.execution_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'execution_mode is not supported.');
    }
    if (!TOPIC_SELECTION_AGENT_EXECUTOR_KINDS.includes(input.executor_kind)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'executor_kind is not supported.');
    }
    if (!TOPIC_SELECTION_AGENT_RUN_MODES.includes(input.run_mode)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'run_mode is not supported.');
    }
    if (!input.schema || typeof input.schema !== 'object' || Array.isArray(input.schema)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'schema must be an object.');
    }
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'messages must contain at least one message.');
    }
  }

  private toArtifactFunctionalRef(record: TopicSelectionArtifactRefRecord): TopicSelectionArtifactFunctionalRef {
    return {
      ref_type: 'artifact_ref',
      ref_id: record.artifact_ref_id,
      title_card_id: record.title_card_id ?? null,
    };
  }

  private assertNonEmpty(value: string, fieldName: string): void {
    if (!value.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${fieldName} cannot be empty.`);
    }
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private stringArrayValue(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private sameStringSet(left: string[], right: string[]): boolean {
    const normalizedLeft = this.uniqueStrings(left).sort();
    const normalizedRight = this.uniqueStrings(right).sort();
    return stableStringify(normalizedLeft) === stableStringify(normalizedRight);
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = stableStringify({
        ref_type: ref.ref_type,
        ref_id: ref.ref_id,
        version_id: ref.version_id ?? null,
        title_card_id: ref.title_card_id ?? null,
      });
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(ref);
    }
    return unique;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private resolveInvocationProfile(
    input: TopicSelectionAgentInvocationRequest<unknown>,
  ): TopicSelectionResolvedModelProfile {
    const resolved = this.modelProfileRegistry.resolveProfile({
      profile_id: input.profile_id,
      execution_mode: input.execution_mode,
      run_mode: input.run_mode,
      model_option_id: input.model_option_id ?? null,
    });
    if (resolved.profile.output_contract !== input.output_contract) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'output_contract is not allowed by model profile.');
    }
    return resolved;
  }

  private modelRefForResolvedProfile(
    resolvedProfile: TopicSelectionResolvedModelProfile,
  ): LlmModelRef | null {
    const option = resolvedProfile.selected_model_option;
    if (!option || !this.isProviderId(option.provider_id)) {
      return null;
    }
    return {
      providerId: option.provider_id,
      modelId: option.model_id,
      profileId: resolvedProfile.profile.profile_id,
    };
  }

  private requestPolicyForResolvedProfile(
    resolvedProfile: TopicSelectionResolvedModelProfile,
  ): LlmRequestPolicy {
    const option = resolvedProfile.selected_model_option;
    const retryPolicy = resolvedProfile.profile.failure_handling_policy.technical_retry;
    return {
      ...(option?.request_policy?.timeout_ms
        ? { timeoutMs: option.request_policy.timeout_ms }
        : {}),
      maxRetries: retryPolicy.enabled
        ? Math.max(0, retryPolicy.max_provider_call_attempts - 1)
        : 0,
    };
  }

  private isProviderId(value: string): value is LlmModelRef['providerId'] {
    return value === 'openai' || value === 'dashscope' || value === 'deepseek';
  }
}
