import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { TOPIC_SELECTION_V1C_NODE_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-node-ids';
import type {
  TopicSelectionAgentExecutionMode,
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
  type TopicSelectionCompressionExecutorKind,
  type TopicSelectionDynamicPromptMaterialRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import type {
  TopicSelectionPromotionGateHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import {
  topicSelectionV1cDelegatedPromotionDecisionCandidateSchema,
  type TopicSelectionV1cDelegatedPromotionDecisionCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
  TopicSelectionModelProfileRegistryService,
  type TopicSelectionResolvedModelProfile,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentRuntimeCompressionAttemptInput,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionPromptPacketRuntimeService,
} from './topic-selection-prompt-packet-runtime-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import type {
  TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity,
  TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact,
} from './topic-selection-v1c-n4-delegated-promotion-decision-admission-service.js';

export interface TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket {
  schema_version: 'TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket@v1';
  node_id: typeof NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: typeof SLOT_ID;
  invocation_slot_id: typeof SLOT_ID;
  context_family: 'v1c_n4_delegated_promotion_decision';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  delegated_candidate_only: true;
  human_review_required: true;
  promotion_gate_check_id: string;
  promotion_gate_check_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_id: string;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  gate_disposition: string;
  promote_allowed: boolean;
  required_actions: TopicSelectionPromotionGateHandoff['required_actions'];
  loopback_hints: TopicSelectionPromotionGateHandoff['loopback_hints'];
  accepted_risk_refs: TopicSelectionFunctionalRef[];
  blocker_refs: TopicSelectionFunctionalRef[];
  recheck_request_refs: TopicSelectionFunctionalRef[];
  memory_suggestion_refs: TopicSelectionFunctionalRef[];
  snapshot_hashes: TopicSelectionPromotionGateHandoff['snapshot_hashes'];
  allowed_refs: TopicSelectionFunctionalRef[];
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  human_authority_boundary: {
    candidate_cannot_supply_human_actor: true;
    explicit_human_acceptance_required: true;
    authority_writer: 'TopicSelectionV1cHumanPromotionDecisionService.recordHumanPromotionDecision';
  };
  no_bridge_creation_boundary: {
    forbidden_n5_bridge_creation: true;
    bridge_owner: 'TopicSelectionV1cPaperProjectBridgeService.createPaperProjectBridge';
  };
}

export type TopicSelectionV1cN4RuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
};

export type TopicSelectionV1cN4RuntimeCompressionAttempt = {
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compression_report_hash?: string | null;
  compressed_context_hash?: string | null;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  estimated_input_tokens_after_override?: number | null;
};

export interface GenerateTopicSelectionV1cN4DelegatedPromotionDecisionCandidateInput {
  gate_handoff: TopicSelectionPromotionGateHandoff;
  workflow_run_id: string;
  node_attempt_id: string;
  policy_version?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode?: TopicSelectionAgentRunMode | null;
  model_option_id?: string | null;
  runtime_token_budget_overrides?: TopicSelectionV1cN4RuntimeTokenBudgetOverrides | null;
  compression_attempt?: TopicSelectionV1cN4RuntimeCompressionAttempt | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1cDelegatedPromotionDecisionCandidate> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1cDelegatedPromotionDecisionCandidate> | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
}

export type TopicSelectionV1cN4DelegatedPromotionDecisionCandidateGenerationResult =
  | {
    status: 'succeeded';
    candidate_artifact: TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact;
    structured_output: TopicSelectionV1cDelegatedPromotionDecisionCandidate;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1cDelegatedPromotionDecisionCandidate>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1cDelegatedPromotionDecisionCandidate>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

type N4RuntimeSlotBinding = {
  slot_id: typeof SLOT_ID;
  invocation_slot_id: typeof SLOT_ID;
  context_policy_profile_id: typeof TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate;
  output_contract: typeof OUTPUT_CONTRACT;
  model_profile_id: typeof TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID;
  prompt_template_id: typeof PROMPT_TEMPLATE_ID;
  prompt_template_version: typeof PROMPT_TEMPLATE_VERSION;
  schema: Record<string, unknown>;
};

const NODE_ID = TOPIC_SELECTION_V1C_NODE_ID.n4_record_human_promotion_decision;
const SLOT_ID = TOPIC_SELECTION_V1C_N4_INVOCATION_SLOT_IDS.delegated_promotion_decision_candidate;
const OUTPUT_CONTRACT = 'TopicSelectionV1cDelegatedPromotionDecisionCandidate@v1' as const;
const PROMPT_TEMPLATE_ID = 'topic-selection-v1c-delegated-promotion-decision' as const;
const PROMPT_TEMPLATE = defaultLlmConfig().getPrompt('topic-selection', PROMPT_TEMPLATE_ID);
const PROMPT_TEMPLATE_VERSION = PROMPT_TEMPLATE.version;
const DEFAULT_POLICY_VERSION = 'topic-selection-v1c-n4-delegated-promotion-decision-runtime-v1' as const;

type N4CompressionAppliedRuntime = {
  compression_report_ref: TopicSelectionFunctionalRef;
  compression_report_hash: string;
  compressed_context_hash: string;
  compressed_context: unknown;
};

export function buildV1cN4DelegatedPromotionDecisionSystemContent(): string {
  return PROMPT_TEMPLATE.system;
}

export class TopicSelectionV1cN4DelegatedPromotionDecisionRuntimeService {
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService;
  private readonly agentOrchestrator: TopicSelectionAgentOrchestratorService;

  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: {
      agentOrchestrator?: TopicSelectionAgentOrchestratorService;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      promptPacketRuntime?: TopicSelectionPromptPacketRuntimeService;
    } = {},
  ) {
    this.contextPolicyProfileRegistry = options.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.promptPacketRuntime = options.promptPacketRuntime ?? new TopicSelectionPromptPacketRuntimeService();
    this.agentOrchestrator = options.agentOrchestrator ?? new TopicSelectionAgentOrchestratorService({
      controlPlane,
      modelProfileRegistry: this.modelProfileRegistry,
    });
  }

  async generateCandidate(
    input: GenerateTopicSelectionV1cN4DelegatedPromotionDecisionCandidateInput,
  ): Promise<TopicSelectionV1cN4DelegatedPromotionDecisionCandidateGenerationResult> {
    this.assertGateHandoff(input.gate_handoff);
    const binding = this.slotBinding();
    const runMode = input.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.gate_handoff);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes);
    const contextPacket = this.buildContextPacket({
      input,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    const contextPacketHash = this.hash(contextPacket);
    const contextArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.gate_handoff.gate_check.workspace_id ?? null,
      title_card_id: input.gate_handoff.gate_check.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      payload: contextPacket as unknown as Record<string, unknown>,
      checksum: contextPacketHash,
      created_by: input.created_by ?? 'system',
    });
    const contextPacketRef = this.toArtifactFunctionalRef(contextArtifact);

    const baseCompressionAttempt = this.runtimeCompressionAttempt({
      runtimeProfile,
      contextPacket,
      compressionAttempt: input.compression_attempt ?? null,
      overrides: input.runtime_token_budget_overrides ?? null,
    });
    const invocation = await this.invokeCandidate({
      input,
      binding,
      runMode,
      contextPacket,
      contextPacketRef,
      contextPacketHash,
      runtimeProfile,
      runtimeInvocationContextHash,
      compressionAttempt: baseCompressionAttempt,
      compressionApplied: null,
      invocationAttemptSuffix: 'runtime_candidate',
    });

    const compressionApplied = this.compressionAppliedFromBlockedInvocation(invocation, baseCompressionAttempt);
    const finalInvocation = compressionApplied
      ? await this.invokeCandidate({
          input,
          binding,
          runMode,
          contextPacket,
          contextPacketRef,
          contextPacketHash,
          runtimeProfile,
          runtimeInvocationContextHash,
          compressionAttempt: null,
          compressionApplied,
          invocationAttemptSuffix: 'runtime_candidate.compressed',
        })
      : invocation;

    if (finalInvocation.status !== 'succeeded' || !finalInvocation.structured_output) {
      return {
        status: 'blocked',
        invocation_result: finalInvocation,
        context_packet_ref: contextPacketRef,
        context_packet_hash: contextPacketHash,
      };
    }

    const candidateArtifact = await this.recordCandidateArtifact({
      input,
      binding,
      runMode,
      structuredOutput: finalInvocation.structured_output,
      invocation: finalInvocation,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    return {
      status: 'succeeded',
      candidate_artifact: candidateArtifact,
      structured_output: finalInvocation.structured_output,
      invocation_result: finalInvocation,
      context_packet_ref: contextPacketRef,
      context_packet_hash: contextPacketHash,
    };
  }

  buildAdmissionExpectedIdentity(input: {
    gate_handoff: TopicSelectionPromotionGateHandoff;
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version?: string | null;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id?: string | null;
    normalized_payload_hash: string;
    compression_report_ref?: TopicSelectionFunctionalRef | null;
    compression_report_hash?: string | null;
    compressed_context_hash?: string | null;
  }): TopicSelectionV1cN4DelegatedPromotionDecisionAdmissionExpectedIdentity {
    const binding = this.slotBinding();
    const sourceHashes = this.sourceHashes(input.gate_handoff);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes);
    const contextPacket = this.buildContextPacket({
      input: {
        gate_handoff: input.gate_handoff,
        workflow_run_id: input.workflow_run_id,
        node_attempt_id: input.node_attempt_id,
        policy_version: input.policy_version,
      },
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    const modelProfile = this.resolveModelProfile(
      binding,
      input.execution_mode,
      input.run_mode,
      input.model_option_id ?? null,
    );
    const compressionApplied = this.defaultCompressionAppliedForExpectedIdentity({
      contextPacket,
      compressionReportRef: input.compression_report_ref ?? null,
      compressionReportHash: input.compression_report_hash ?? null,
      compressedContextHash: input.compressed_context_hash ?? null,
    });
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: input.gate_handoff.gate_check.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_id: NODE_ID,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: binding.prompt_template_id,
      prompt_template_version: binding.prompt_template_version,
      prompt_variant_key: binding.invocation_slot_id,
      invocation_slot_id: binding.invocation_slot_id,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      messages: this.messages(binding, contextPacket, compressionApplied?.compressed_context ?? null),
      source_refs: contextPacket.source_refs,
      context_packet_hashes: [this.hash(contextPacket)],
      compression_report_ref: input.compression_report_ref ?? null,
      compression_report_hash: input.compression_report_hash ?? null,
      compressed_context_hash: input.compressed_context_hash ?? null,
      dynamic_material_refs: [],
      output_contract: binding.output_contract,
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      model_option_id: modelProfile.selected_model_option?.option_id ?? null,
      normalized_params_hash: modelProfile.normalized_params_hash,
      runtime_modifiers_hash: this.runtimeModifiersHash({
        executionMode: input.execution_mode,
        executorKind: this.executorKind(input.execution_mode),
        runMode: input.run_mode,
        runtimeInvocationContextHash,
        compressionAlreadyApplied: Boolean(compressionApplied),
      }),
      redaction_policy: runtimeProfile.profile.redaction_policy,
    });
    return {
      slot_id: binding.slot_id,
      output_contract: binding.output_contract,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: binding.invocation_slot_id,
      prompt_packet_hash: promptPacket.identity.prompt_packet_hash,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      normalized_payload_hash: input.normalized_payload_hash,
    };
  }

  private async recordCandidateArtifact(input: {
    input: GenerateTopicSelectionV1cN4DelegatedPromotionDecisionCandidateInput;
    binding: N4RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    structuredOutput: TopicSelectionV1cDelegatedPromotionDecisionCandidate;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1cDelegatedPromotionDecisionCandidate>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Promise<TopicSelectionV1cN4DelegatedPromotionDecisionCandidateArtifact> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N4 delegated decision candidate requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N4 delegated decision candidate structured output hash drift detected.');
    }
    const outputArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.input.gate_handoff.gate_check.workspace_id ?? null,
      title_card_id: input.input.gate_handoff.gate_check.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: input.input.workflow_run_id,
      payload: input.structuredOutput as unknown as Record<string, unknown>,
      checksum: outputHash,
      created_by: input.input.created_by ?? 'system',
    });
    const outputRef = this.toArtifactFunctionalRef(outputArtifact);
    return {
      slot_id: input.binding.slot_id,
      node_id: NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      policy_version: input.input.policy_version ?? DEFAULT_POLICY_VERSION,
      execution_mode: input.input.execution_mode,
      run_mode: input.runMode,
      allowed_effect: 'delegated_promotion_decision_candidate_only',
      candidate_artifact_ref: outputRef,
      candidate_artifact_hash: outputHash,
      normalized_output_ref: outputRef,
      normalized_output_hash: outputHash,
      output_contract: input.binding.output_contract,
      profile_id: input.binding.model_profile_id,
      model_option_id: input.invocation.provenance.model_option_id,
      prompt_packet_hash: input.invocation.provenance.prompt_packet_hash,
      structured_output_hash: outputHash,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      prompt_variant_key: input.binding.invocation_slot_id,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      redaction_policy: input.runtimeProfile.profile.redaction_policy,
      source_hashes: input.sourceHashes,
      runtime_audit_ref: input.invocation.audit_artifact_ref,
      runtime_audit_hash: auditHash,
      provenance_ref: input.invocation.audit_artifact_ref,
      runtime_provenance_class: 'runtime_verified',
      compression_report_ref: input.invocation.provenance.compression_report_ref ?? null,
      compression_report_hash: input.invocation.provenance.compression_report_hash ?? null,
      compressed_context_hash: input.invocation.provenance.compressed_context_hash ?? null,
    };
  }

  private async invokeCandidate(input: {
    input: GenerateTopicSelectionV1cN4DelegatedPromotionDecisionCandidateInput;
    binding: N4RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket;
    contextPacketRef: TopicSelectionArtifactFunctionalRef;
    contextPacketHash: string;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    compressionAttempt: TopicSelectionAgentRuntimeCompressionAttemptInput | null;
    compressionApplied: N4CompressionAppliedRuntime | null;
    invocationAttemptSuffix: string;
  }): Promise<TopicSelectionAgentInvocationResult<TopicSelectionV1cDelegatedPromotionDecisionCandidate>> {
    return this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1cDelegatedPromotionDecisionCandidate>({
      workspace_id: input.input.gate_handoff.gate_check.workspace_id ?? null,
      title_card_id: input.input.gate_handoff.gate_check.title_card_id,
      node_id: NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      invocation_attempt_id: `${input.input.node_attempt_id}.${input.binding.invocation_slot_id}.${input.invocationAttemptSuffix}`,
      execution_mode: input.input.execution_mode,
      executor_kind: this.executorKind(input.input.execution_mode),
      run_mode: input.runMode,
      profile_id: input.binding.model_profile_id,
      output_contract: input.binding.output_contract,
      model_option_id: input.input.model_option_id ?? null,
      prompt: {
        promptTemplateId: input.binding.prompt_template_id,
        version: input.binding.prompt_template_version,
      },
      prompt_variant_key: input.binding.invocation_slot_id,
      schema_name: input.binding.output_contract,
      schema: input.binding.schema,
      messages: this.messages(
        input.binding,
        input.contextPacket,
        input.compressionApplied?.compressed_context ?? null,
      ),
      input_refs: input.contextPacket.source_refs,
      context_packet_refs: [input.contextPacketRef],
      context_packet_hashes: [input.contextPacketHash],
      runtime_token_budget: this.runtimeTokenBudget({
        runtimeProfile: input.runtimeProfile,
        runtimeInvocationContextHash: input.runtimeInvocationContextHash,
        contextPacket: input.contextPacket,
        compressionAttempt: input.compressionAttempt,
        compressionApplied: input.compressionApplied,
        overrides: input.input.runtime_token_budget_overrides ?? null,
      }),
      codex_response: input.input.codex_response ?? null,
      mocked_output: input.input.mocked_output ?? null,
      created_by: input.input.created_by ?? 'system',
    });
  }

  private compressionAppliedFromBlockedInvocation(
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1cDelegatedPromotionDecisionCandidate>,
    compressionAttempt: TopicSelectionAgentRuntimeCompressionAttemptInput | null,
  ): N4CompressionAppliedRuntime | null {
    if (
      invocation.status !== 'blocked'
      || invocation.error_code !== 'TOKEN_BUDGET_REQUIRES_COMPRESSION'
      || !compressionAttempt
      || !invocation.provenance.compression_report_ref
      || !invocation.provenance.compression_report_hash
      || !invocation.provenance.compressed_context_hash
    ) {
      return null;
    }
    return {
      compression_report_ref: invocation.provenance.compression_report_ref,
      compression_report_hash: invocation.provenance.compression_report_hash,
      compressed_context_hash: invocation.provenance.compressed_context_hash,
      compressed_context: compressionAttempt.compressed_context,
    };
  }

  private defaultCompressionAppliedForExpectedIdentity(input: {
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket;
    compressionReportRef: TopicSelectionFunctionalRef | null;
    compressionReportHash: string | null;
    compressedContextHash: string | null;
  }): N4CompressionAppliedRuntime | null {
    if (!input.compressionReportRef || !input.compressionReportHash || !input.compressedContextHash) {
      return null;
    }
    const requiredPreservedFacts = this.requiredCompressionFacts(input.contextPacket);
    const defaultAttempt = this.defaultRuntimeCompressionAttempt(input.contextPacket, requiredPreservedFacts);
    if (this.hash(defaultAttempt.compressed_context) !== input.compressedContextHash) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'N4 delegated decision compressed context hash does not match deterministic runtime compression.',
      );
    }
    return {
      compression_report_ref: input.compressionReportRef,
      compression_report_hash: input.compressionReportHash,
      compressed_context_hash: input.compressedContextHash,
      compressed_context: defaultAttempt.compressed_context,
    };
  }

  private buildContextPacket(input: {
    input: Pick<
      GenerateTopicSelectionV1cN4DelegatedPromotionDecisionCandidateInput,
      'gate_handoff' | 'workflow_run_id' | 'node_attempt_id' | 'policy_version'
    >;
    binding: N4RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket {
    const handoff = input.input.gate_handoff;
    const allowedRefs = this.allowedRefs(handoff);
    return {
      schema_version: 'TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      context_family: 'v1c_n4_delegated_promotion_decision',
      policy_version: input.input.policy_version ?? DEFAULT_POLICY_VERSION,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      delegated_candidate_only: true,
      human_review_required: true,
      promotion_gate_check_id: handoff.promotion_gate_check_id,
      promotion_gate_check_ref: handoff.promotion_gate_check_ref,
      promotion_input_snapshot_id: handoff.promotion_input_snapshot_id,
      promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      gate_disposition: handoff.disposition,
      promote_allowed: handoff.promote_allowed,
      required_actions: handoff.required_actions,
      loopback_hints: handoff.loopback_hints,
      accepted_risk_refs: handoff.accepted_risk_refs,
      blocker_refs: handoff.blocker_refs,
      recheck_request_refs: handoff.recheck_request_refs,
      memory_suggestion_refs: handoff.memory_suggestion_refs,
      snapshot_hashes: handoff.snapshot_hashes,
      allowed_refs: allowedRefs,
      source_refs: allowedRefs,
      source_hashes: input.sourceHashes,
      human_authority_boundary: {
        candidate_cannot_supply_human_actor: true,
        explicit_human_acceptance_required: true,
        authority_writer: 'TopicSelectionV1cHumanPromotionDecisionService.recordHumanPromotionDecision',
      },
      no_bridge_creation_boundary: {
        forbidden_n5_bridge_creation: true,
        bridge_owner: 'TopicSelectionV1cPaperProjectBridgeService.createPaperProjectBridge',
      },
    };
  }

  private messages(
    binding: N4RuntimeSlotBinding,
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket,
    compressedContext: unknown | null = null,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1cN4DelegatedPromotionDecisionSystemContent(),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          role_slot: binding.slot_id,
          context_packet: compressedContext ?? contextPacket,
          source_context_packet_hash: compressedContext ? this.hash(contextPacket) : null,
          output_boundary: 'human_review_input_candidate_only_non_authority',
        }),
      },
    ];
  }

  private sourceHashes(handoff: TopicSelectionPromotionGateHandoff): Record<string, string> {
    return {
      promotion_gate_check_ref_hash: this.hash(handoff.promotion_gate_check_ref),
      promotion_decision_support_ref_hash: this.hash(handoff.promotion_decision_support_ref),
      promotion_dossier_ref_hash: this.hash(handoff.promotion_dossier_ref),
      argument_readiness_mini_check_ref_hash: this.hash(handoff.argument_readiness_mini_check_ref),
      promotion_input_snapshot_ref_hash: this.hash(handoff.promotion_input_snapshot_ref),
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      snapshot_hashes_hash: this.hash(handoff.snapshot_hashes),
      gate_disposition_hash: this.hash(handoff.disposition),
      promote_allowed_hash: this.hash(handoff.promote_allowed),
      required_actions_hash: this.hash(handoff.required_actions),
      loopback_hints_hash: this.hash(handoff.loopback_hints),
      accepted_risk_refs_hash: this.hash(handoff.accepted_risk_refs),
      blocker_refs_hash: this.hash(handoff.blocker_refs),
      recheck_request_refs_hash: this.hash(handoff.recheck_request_refs),
      memory_suggestion_refs_hash: this.hash(handoff.memory_suggestion_refs),
      support_source_refs_hash: this.hash(handoff.support.source_refs),
      dossier_source_refs_hash: this.hash(handoff.dossier.source_refs),
      readiness_source_refs_hash: this.hash(handoff.argument_readiness_mini_check.source_refs),
      allowed_refs_hash: this.hash(this.allowedRefs(handoff)),
      human_authority_boundary_hash: this.hash('explicit_human_acceptance_required'),
      no_bridge_creation_boundary_hash: this.hash('n4_runtime_admission_cannot_create_n5_bridge'),
    };
  }

  private runtimeTokenBudget(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket;
    compressionAttempt: TopicSelectionAgentRuntimeCompressionAttemptInput | null;
    compressionApplied: N4CompressionAppliedRuntime | null;
    overrides: TopicSelectionV1cN4RuntimeTokenBudgetOverrides | null;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const dynamicMaterialRefs: TopicSelectionDynamicPromptMaterialRecord[] = [];
    return {
      context_policy_profile: input.runtimeProfile.profile,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      dynamic_material_refs: dynamicMaterialRefs,
      context_payloads: [input.compressionApplied?.compressed_context ?? input.contextPacket],
      compression_attempt: input.compressionApplied ? null : input.compressionAttempt,
      compression_already_applied: Boolean(input.compressionApplied),
      compression_report_ref: input.compressionApplied?.compression_report_ref ?? null,
      compression_report_hash: input.compressionApplied?.compression_report_hash ?? null,
      compressed_context_hash: input.compressionApplied?.compressed_context_hash ?? null,
      estimated_input_tokens_override: input.compressionApplied
        ? input.overrides?.estimated_input_tokens_after_compression_override
        : input.overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: input.overrides?.schema_overhead_tokens_override,
    };
  }

  private runtimeCompressionAttempt(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket;
    compressionAttempt: TopicSelectionV1cN4RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1cN4RuntimeTokenBudgetOverrides | null;
  }): TopicSelectionAgentRuntimeCompressionAttemptInput | null {
    const requiredPreservedFacts = this.requiredCompressionFacts(input.contextPacket);
    const defaultAttempt = this.defaultRuntimeCompressionAttempt(input.contextPacket, requiredPreservedFacts);
    const attempt = input.compressionAttempt;
    return {
      compression_report_ref: attempt?.compression_report_ref ?? null,
      source_refs: input.contextPacket.source_refs,
      input_context: input.contextPacket,
      compressed_context: attempt?.compressed_context ?? defaultAttempt.compressed_context,
      summary: attempt?.summary ?? defaultAttempt.summary,
      compression_executor_kind: attempt?.compression_executor_kind ?? 'deterministic_structural',
      required_preserved_facts: requiredPreservedFacts,
      compressed_preserved_facts: attempt
        ? attempt.compressed_preserved_facts ?? null
        : requiredPreservedFacts,
      redaction_policy: input.runtimeProfile.profile.redaction_policy,
      estimated_input_tokens_before_override: input.overrides?.estimated_input_tokens_override,
      estimated_input_tokens_after_override:
        attempt?.estimated_input_tokens_after_override
        ?? input.overrides?.estimated_input_tokens_after_compression_override,
    };
  }

  private defaultRuntimeCompressionAttempt(
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket,
    requiredPreservedFacts: TopicSelectionCompressionFactInventory,
  ): Pick<TopicSelectionAgentRuntimeCompressionAttemptInput, 'compressed_context' | 'summary'> {
    return {
      compressed_context: {
        schema_version: 'TopicSelectionV1cN4DelegatedPromotionDecisionCompressedRuntimeContext@v1',
        node_id: contextPacket.node_id,
        workflow_run_id: contextPacket.workflow_run_id,
        node_attempt_id: contextPacket.node_attempt_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        delegated_candidate_only: true,
        source_context_packet_hash: this.hash(contextPacket),
        source_refs: contextPacket.source_refs,
        source_hashes: contextPacket.source_hashes,
        required_preserved_facts: requiredPreservedFacts,
      },
      summary: {
        schema_version: 'TopicSelectionV1cN4DelegatedPromotionDecisionCompressionSummary@v1',
        node_id: contextPacket.node_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        delegated_candidate_only: true,
        preserved_fact_kinds: Object.keys(requiredPreservedFacts),
      },
    };
  }

  private requiredCompressionFacts(
    contextPacket: TopicSelectionV1cN4DelegatedPromotionDecisionContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const sourceHashes = contextPacket.source_hashes;
    const requiredFacts: TopicSelectionCompressionFactInventory = {
      promotion_gate_handoff: this.factIds(sourceHashes.promotion_gate_check_ref_hash),
      promotion_input_snapshot: this.factIds(sourceHashes.promotion_input_snapshot_hash),
      promotion_gate_disposition: this.factIds(sourceHashes.gate_disposition_hash, sourceHashes.promote_allowed_hash),
      promote_allowed: this.factIds(sourceHashes.promote_allowed_hash),
      promotion_decision_support: this.factIds(sourceHashes.promotion_decision_support_ref_hash),
      promotion_dossier: this.factIds(sourceHashes.promotion_dossier_ref_hash),
      argument_readiness_mini_check: this.factIds(sourceHashes.argument_readiness_mini_check_ref_hash),
      required_action: this.factIds(sourceHashes.required_actions_hash),
      loopback_hint: this.factIds(sourceHashes.loopback_hints_hash),
      accepted_risk: this.factIds(sourceHashes.accepted_risk_refs_hash),
      allowed_ref_manifest: this.factIds(sourceHashes.allowed_refs_hash),
      human_authority_boundary: this.factIds(sourceHashes.human_authority_boundary_hash),
      no_bridge_creation_boundary: this.factIds(sourceHashes.no_bridge_creation_boundary_hash),
    };
    return Object.fromEntries(
      Object.entries(requiredFacts)
        .map(([factKind, factIds]) => [factKind, this.uniqueStrings(factIds ?? [])] as const)
        .filter(([, factIds]) => factIds.length > 0),
    );
  }

  private runtimeInvocationContextHash(
    binding: N4RuntimeSlotBinding,
    sourceHashes: Record<string, string>,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1c_n4_delegated_promotion_decision',
        scenario_case_id: binding.slot_id,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'human_authority_candidate',
        loop_stage: binding.slot_id,
        current_round_index: 1,
        remaining_round_budget: 0,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: null,
    });
  }

  private runtimeModifiersHash(input: {
    executionMode: TopicSelectionAgentExecutionMode;
    executorKind: TopicSelectionExecutorKind;
    runMode: TopicSelectionAgentRunMode;
    runtimeInvocationContextHash: string;
    compressionAlreadyApplied?: boolean;
  }): string {
    return this.hash({
      compression_already_applied: input.compressionAlreadyApplied ?? false,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      execution_mode: input.executionMode,
      executor_kind: input.executorKind,
      run_mode: input.runMode,
    });
  }

  private allowedRefs(handoff: TopicSelectionPromotionGateHandoff): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.promotion_gate_check_ref,
      handoff.promotion_decision_support_ref,
      handoff.promotion_dossier_ref,
      handoff.argument_readiness_mini_check_ref,
      handoff.promotion_input_snapshot_ref,
      ...handoff.required_actions.flatMap((action) => action.refs),
      ...handoff.loopback_hints.flatMap((hint) => [
        ...hint.refs,
        ...hint.required_actions.flatMap((action) => action.refs),
      ]),
      ...handoff.accepted_risk_refs,
      ...handoff.blocker_refs,
      ...handoff.recheck_request_refs,
      ...handoff.memory_suggestion_refs,
      ...handoff.support.source_refs,
      ...handoff.support.artifact_refs,
      ...handoff.dossier.source_refs,
      ...handoff.dossier.artifact_refs,
      ...handoff.argument_readiness_mini_check.source_refs,
      ...handoff.argument_readiness_mini_check.artifact_refs,
      ...handoff.gate_check.source_refs,
      ...handoff.gate_check.artifact_refs,
    ]);
  }

  private resolveRuntimeProfile(binding: N4RuntimeSlotBinding): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: N4RuntimeSlotBinding,
    executionMode: TopicSelectionAgentExecutionMode,
    runMode: TopicSelectionAgentRunMode,
    modelOptionId: string | null,
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: binding.model_profile_id,
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: modelOptionId,
    });
  }

  private slotBinding(): N4RuntimeSlotBinding {
    return {
      slot_id: SLOT_ID,
      invocation_slot_id: SLOT_ID,
      context_policy_profile_id:
        TOPIC_SELECTION_V1C_N4_CONTEXT_RUNTIME_PROFILE_IDS.delegated_promotion_decision_candidate,
      output_contract: OUTPUT_CONTRACT,
      model_profile_id: TOPIC_SELECTION_V1C_DELEGATED_PROMOTION_DECISION_PROFILE_ID,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      schema: topicSelectionV1cDelegatedPromotionDecisionCandidateSchema as unknown as Record<string, unknown>,
    };
  }

  private assertGateHandoff(handoff: TopicSelectionPromotionGateHandoff): void {
    if (
      !handoff.promotion_gate_check_id
      || !handoff.promotion_input_snapshot_id
      || !handoff.promotion_input_snapshot_hash
      || !handoff.gate_check?.title_card_id
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 delegated decision runtime requires a complete N3 promotion gate handoff.');
    }
  }

  private defaultRunMode(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionAgentRunMode {
    return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    if (executionMode === 'codex_assisted') {
      return 'codex_assisted';
    }
    return 'single_agent';
  }

  private toArtifactFunctionalRef(record: TopicSelectionArtifactRefRecord): TopicSelectionArtifactFunctionalRef {
    return {
      ref_type: 'artifact_ref',
      ref_id: record.artifact_ref_id,
      title_card_id: record.title_card_id ?? null,
    };
  }

  private requiredChecksum(record: TopicSelectionArtifactRefRecord | null, label: string): string {
    if (!record?.checksum) {
      throw new AppError(500, 'INTERNAL_ERROR', `${label} checksum is required.`);
    }
    return record.checksum;
  }

  private factIds(...values: Array<string | null | undefined>): string[] {
    return this.uniqueStrings(values.filter((value): value is string => Boolean(value?.trim())));
  }

  private uniqueRefs(values: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const refs: TopicSelectionFunctionalRef[] = [];
    for (const ref of values) {
      if (!ref) {
        continue;
      }
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
      refs.push(ref);
    }
    return refs;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
