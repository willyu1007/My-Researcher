import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionMode,
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import {
  TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import {
  type TopicSelectionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  type TopicSelectionV1bCandidateGroupingSupportPayload,
  type TopicSelectionV1bN7HarnessFrozenInputPayload,
  type TopicSelectionV1bN8DebateAdmissionReviewSupportPayload,
  type TopicSelectionV1bN8FailedTrialSynthesisSupportPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bCandidateGroupingSupportPayloadSchema,
  topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema,
  topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionModelProfileRegistryService,
  type TopicSelectionResolvedModelProfile,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import {
  TopicSelectionPromptPacketRuntimeService,
} from './topic-selection-prompt-packet-runtime-service.js';
import type {
  TopicSelectionV1bN7SupportAdmissionExpectedIdentity,
  TopicSelectionV1bN7SupportSlotId,
} from './topic-selection-v1b-n7-support-admission-service.js';

export type TopicSelectionV1bN7RuntimeSupportPayload =
  | TopicSelectionV1bCandidateGroupingSupportPayload
  | TopicSelectionV1bN8FailedTrialSynthesisSupportPayload
  | TopicSelectionV1bN8DebateAdmissionReviewSupportPayload;

export type TopicSelectionV1bN7SupportRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bN7SupportRuntimeContextPacket@v1';
  node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bN7SupportSlotId;
  invocation_slot_id: string;
  context_family: 'v1b_n7_topic_question_hardening';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bN7HarnessFrozenInputPayload;
};

export type GenerateTopicSelectionV1bN7RuntimeSupportInput<T extends TopicSelectionV1bN7RuntimeSupportPayload> = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  slot_id: TopicSelectionV1bN7SupportSlotId;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<T> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<T> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN7RuntimeSupportGenerationResult<T extends TopicSelectionV1bN7RuntimeSupportPayload> =
  | {
    status: 'succeeded';
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    structured_output: T;
    invocation_result: TopicSelectionAgentInvocationResult<T>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<T>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

type N7RuntimeSlotBinding = {
  slot_id: TopicSelectionV1bN7SupportSlotId;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  schema: Record<string, unknown>;
};

const NODE_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1' as const;
const PROMPT_TEMPLATE_IDS: Record<TopicSelectionV1bN7SupportSlotId, string> = {
  n7_candidate_grouping:
    'topic-selection.v1b.n7.candidate-grouping.runtime-support',
  n7_failed_trial_synthesis:
    'topic-selection.v1b.n7.failed-trial-synthesis.runtime-support',
  n7_n8_debate_admission_review:
    'topic-selection.v1b.n7.n8-debate-admission-review.runtime-support',
};

function configuredPrompt(slotId: TopicSelectionV1bN7SupportSlotId) {
  return defaultLlmConfig().getPrompt('topic-selection', PROMPT_TEMPLATE_IDS[slotId]);
}

/**
 * Product-grade v1b N7 support system prompt (W-05 Commit 5, SPLIT-2). Exported as a config-backed,
 * slot-keyed renderer so each support slot gets its own SHA-256 drift anchor (there is no
 * harness/replay golden over these bodies). Each catalog entry carries the per-slot role, field
 * contract, and shared support-only / no-authority / no-gate-override / JSON-only boundary.
 * The n8_debate_admission_review slot pins BOTH debate_level enum literals verbatim
 * (compact_assessment_debate / provider_diverse_deep_debate) because those values drive the real N8
 * execution-plan cost (debateLevelToExecutionPlanName), so a prose/enum drift here is high-value.
 */
export function buildV1bN7SupportSystemContent(
  slotId: TopicSelectionV1bN7SupportSlotId,
): string {
  return configuredPrompt(slotId).system;
}

export class TopicSelectionV1bN7SupportRuntimeService {
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

  async generateSupportArtifact<T extends TopicSelectionV1bN7RuntimeSupportPayload>(
    input: GenerateTopicSelectionV1bN7RuntimeSupportInput<T>,
  ): Promise<TopicSelectionV1bN7RuntimeSupportGenerationResult<T>> {
    const frozenPayload = this.assertN7FrozenPayload(input.request);
    const binding = this.slotBinding(input.slot_id);
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, frozenPayload, sourceHashes);
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    const contextPacketHash = this.hash(contextPacket);
    const contextArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: input.request.workflow_run_id,
      payload: contextPacket as unknown as Record<string, unknown>,
      checksum: contextPacketHash,
      created_by: input.created_by ?? input.request.created_by ?? 'system',
    });
    const contextPacketRef = this.toArtifactFunctionalRef(contextArtifact);
    const invocation = await this.agentOrchestrator.invokeStructuredOutput<T>({
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      node_id: input.request.node_id,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      invocation_attempt_id: `${input.request.node_attempt_id}.${input.slot_id}.runtime_support`,
      execution_mode: input.execution_mode,
      executor_kind: this.executorKind(input.execution_mode),
      run_mode: runMode,
      profile_id: binding.model_profile_id,
      output_contract: binding.output_contract,
      model_option_id: null,
      prompt: {
        promptTemplateId: binding.prompt_template_id,
        version: binding.prompt_template_version,
      },
      schema_name: binding.output_contract,
      schema: binding.schema,
      messages: this.messages(binding, contextPacket),
      input_refs: contextPacket.source_refs,
      context_packet_refs: [contextPacketRef],
      context_packet_hashes: [contextPacketHash],
      runtime_token_budget: {
        context_policy_profile: runtimeProfile.profile,
        context_policy_profile_hash: runtimeProfile.profile_hash,
        runtime_invocation_context_hash: runtimeInvocationContextHash,
        context_payloads: [contextPacket],
      },
      codex_response: input.codex_response ?? null,
      mocked_output: input.mocked_output ?? null,
      created_by: input.created_by ?? input.request.created_by ?? 'system',
    });

    if (invocation.status !== 'succeeded' || !invocation.structured_output) {
      return {
        status: 'blocked',
        invocation_result: invocation,
        context_packet_ref: contextPacketRef,
        context_packet_hash: contextPacketHash,
      };
    }

    const semanticArtifact = await this.recordSemanticSupportArtifact({
      request: input.request,
      binding,
      runMode,
      executionMode: input.execution_mode,
      structuredOutput: invocation.structured_output,
      invocation,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      createdBy: input.created_by ?? input.request.created_by ?? 'system',
    });
    return {
      status: 'succeeded',
      semantic_artifact: semanticArtifact,
      structured_output: invocation.structured_output,
      invocation_result: invocation,
      context_packet_ref: contextPacketRef,
      context_packet_hash: contextPacketHash,
    };
  }

  buildAdmissionExpectedIdentity(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN7HarnessFrozenInputPayload;
    slotId: TopicSelectionV1bN7SupportSlotId;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): TopicSelectionV1bN7SupportAdmissionExpectedIdentity {
    const binding = this.slotBinding(input.slotId);
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N7 support profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N7 support runtime does not allow provider model options.');
    }
    const sourceHashes = this.sourceHashes(input.request, input.frozenPayload);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      input.frozenPayload,
      sourceHashes,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload: input.frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    const modelProfile = this.resolveModelProfile(binding, input.executionMode, input.runMode);
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: input.request.title_card_id ?? null,
      workflow_run_id: input.request.workflow_run_id,
      node_id: input.request.node_id,
      node_attempt_id: input.request.node_attempt_id,
      prompt_template_id: binding.prompt_template_id,
      prompt_template_version: binding.prompt_template_version,
      prompt_variant_key: binding.invocation_slot_id,
      invocation_slot_id: binding.invocation_slot_id,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      messages: this.messages(binding, contextPacket),
      source_refs: contextPacket.source_refs,
      context_packet_hashes: [this.hash(contextPacket)],
      output_contract: binding.output_contract,
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      model_option_id: modelProfile.selected_model_option?.option_id ?? null,
      normalized_params_hash: modelProfile.normalized_params_hash,
      runtime_modifiers_hash: this.runtimeModifiersHash({
        executionMode: input.executionMode,
        executorKind: this.executorKind(input.executionMode),
        runMode: input.runMode,
        runtimeInvocationContextHash,
      }),
      redaction_policy: runtimeProfile.profile.redaction_policy,
    });
    return {
      slot_id: input.slotId,
      output_contract: binding.output_contract,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: binding.invocation_slot_id,
      prompt_packet_hash: promptPacket.identity.prompt_packet_hash,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      normalized_payload_hash: input.normalizedPayloadHash,
    };
  }

  private async recordSemanticSupportArtifact<T extends TopicSelectionV1bN7RuntimeSupportPayload>(
    input: {
      request: TopicSelectionV1bWorkflowHarnessRunRequest;
      binding: N7RuntimeSlotBinding;
      runMode: TopicSelectionAgentRunMode;
      executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
      structuredOutput: T;
      invocation: TopicSelectionAgentInvocationResult<T>;
      runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
      runtimeInvocationContextHash: string;
      sourceHashes: Record<string, string>;
      createdBy: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
    },
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N7 support requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N7 runtime support structured output hash drift detected.');
    }
    const outputArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: input.request.workflow_run_id,
      payload: input.structuredOutput as unknown as Record<string, unknown>,
      checksum: outputHash,
      created_by: input.createdBy ?? 'system',
    });
    const outputRef = this.toArtifactFunctionalRef(outputArtifact);
    return {
      slot_id: input.binding.slot_id,
      node_id: NODE_ID,
      execution_mode: input.executionMode,
      run_mode: input.runMode,
      allowed_effect: 'support_only',
      support_artifact_ref: outputRef,
      support_artifact_hash: outputHash,
      normalized_output_ref: outputRef,
      normalized_output_hash: outputHash,
      output_contract: input.binding.output_contract,
      profile_id: input.binding.model_profile_id as TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['profile_id'],
      model_option_id: input.invocation.provenance.model_option_id,
      input_hash: input.request.frozen_input.frozen_input_hash ?? this.hash(input.request.frozen_input),
      prompt_packet_hash: input.invocation.provenance.prompt_packet_hash,
      structured_output_hash: outputHash,
      adapter_policy_version: input.request.policy_version,
      slot_spec_hash: this.hash(this.slotPolicy(input.binding.slot_id)),
      provenance_ref: input.invocation.audit_artifact_ref,
      runtime_provenance_class: 'runtime_verified',
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      prompt_variant_key: input.binding.invocation_slot_id,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      redaction_policy: input.runtimeProfile.profile.redaction_policy,
      source_hashes: input.sourceHashes,
      runtime_audit_ref: input.invocation.audit_artifact_ref,
      runtime_audit_hash: auditHash,
      compression_report_ref: input.invocation.provenance.compression_report_ref ?? null,
      compression_report_hash: input.invocation.provenance.compression_report_hash ?? null,
      compressed_context_hash: input.invocation.provenance.compressed_context_hash ?? null,
    };
  }

  private buildContextPacket(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN7HarnessFrozenInputPayload;
    binding: N7RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): TopicSelectionV1bN7SupportRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bN7SupportRuntimeContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      context_family: 'v1b_n7_topic_question_hardening',
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
    };
  }

  private messages(
    binding: N7RuntimeSlotBinding,
    contextPacket: TopicSelectionV1bN7SupportRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1bN7SupportSystemContent(binding.slot_id),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          slot_id: binding.slot_id,
          context_packet: contextPacket,
          output_boundary: 'support_only_non_authority',
        }),
      },
    ];
  }

  private sourceHashes(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  ): Record<string, string> {
    const sourceHashes: Record<string, string> = {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
      n6_handoff_hash: payload.n6_handoff_hash,
      topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
      admissible_candidate_refs_hash: this.hash(payload.admissible_candidate_refs),
      admissible_candidate_hashes_hash: this.hash(payload.admissible_candidate_hashes),
      selected_research_slice_hash: payload.selected_research_slice_hash,
      generation_artifact_hash: payload.generation_artifact_hash,
      candidate_gate_hash: payload.candidate_gate_hash,
    };
    if (payload.candidate_grouping_hash) {
      sourceHashes.candidate_grouping_hash = payload.candidate_grouping_hash;
    }
    if (payload.input_mode === 'feedback_from_n8') {
      sourceHashes.n8_feedback_hash = payload.n8_feedback_hash;
      sourceHashes.n8_feedback_payload_hash = payload.n8_feedback_payload_hash;
    }
    return sourceHashes;
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      payload.topic_question_candidate_set_ref,
      ...payload.admissible_candidate_refs,
      payload.selected_research_slice_ref,
      payload.generation_artifact_ref,
      payload.candidate_grouping_ref,
      payload.input_mode === 'feedback_from_n8' ? payload.n8_feedback_ref : null,
    ]);
  }

  private runtimeInvocationContextHash(
    binding: N7RuntimeSlotBinding,
    payload: TopicSelectionV1bN7HarnessFrozenInputPayload,
    sourceHashes: Record<string, string>,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n7_topic_question_hardening',
        scenario_case_id: binding.slot_id,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: payload.input_mode === 'feedback_from_n8'
        ? {
          loop_kind: 'repair_from_node',
          loop_stage: 'n7_feedback_from_n8',
          current_round_index: 1,
          remaining_round_budget: null,
          loopback_source_node_id: 'topic-selection.v1b.assess-topic-value.v1',
          repair_origin_ref: payload.n8_feedback_ref,
          repair_origin_hash: payload.n8_feedback_hash,
        }
        : {
          loop_kind: 'initial',
          loop_stage: 'n7_initial_from_n6',
          current_round_index: 1,
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

  private runtimeModifiersHash(input: {
    executionMode: TopicSelectionAgentExecutionMode;
    executorKind: TopicSelectionExecutorKind;
    runMode: TopicSelectionAgentRunMode;
    runtimeInvocationContextHash: string;
  }): string {
    return this.hash({
      compression_already_applied: false,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      execution_mode: input.executionMode,
      executor_kind: input.executorKind,
      run_mode: input.runMode,
    });
  }

  private resolveRuntimeProfile(binding: N7RuntimeSlotBinding): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: N7RuntimeSlotBinding,
    executionMode: TopicSelectionAgentExecutionMode,
    runMode: TopicSelectionAgentRunMode,
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: binding.model_profile_id,
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: null,
    });
  }

  private slotBinding(slotId: TopicSelectionV1bN7SupportSlotId): N7RuntimeSlotBinding {
    const slot = this.slotPolicy(slotId);
    if (slotId === 'n7_candidate_grouping') {
      const prompt = configuredPrompt(slotId);
      return {
        slot_id: slotId,
        invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.candidate_grouping,
        context_policy_profile_id: TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.candidate_grouping,
        output_contract: slot.output_contract,
        model_profile_id: slot.default_profile_id,
        prompt_template_id: prompt.id,
        prompt_template_version: prompt.version,
        schema: topicSelectionV1bCandidateGroupingSupportPayloadSchema as unknown as Record<string, unknown>,
      };
    }
    if (slotId === 'n7_failed_trial_synthesis') {
      const prompt = configuredPrompt(slotId);
      return {
        slot_id: slotId,
        invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.failed_trial_synthesis,
        context_policy_profile_id: TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.failed_trial_synthesis,
        output_contract: slot.output_contract,
        model_profile_id: slot.default_profile_id,
        prompt_template_id: prompt.id,
        prompt_template_version: prompt.version,
        schema: topicSelectionV1bN8FailedTrialSynthesisSupportPayloadSchema as unknown as Record<string, unknown>,
      };
    }
    const prompt = configuredPrompt(slotId);
    return {
      slot_id: slotId,
      invocation_slot_id: TOPIC_SELECTION_V1B_N7_INVOCATION_SLOT_IDS.n8_debate_admission_review,
      context_policy_profile_id: TOPIC_SELECTION_V1B_N7_CONTEXT_RUNTIME_PROFILE_IDS.n8_debate_admission_review,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: prompt.id,
      prompt_template_version: prompt.version,
      schema: topicSelectionV1bN8DebateAdmissionReviewSupportPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private slotPolicy(slotId: TopicSelectionV1bN7SupportSlotId) {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
      .find((item) => item.node_id === NODE_ID);
    const slot = policy?.semantic_support_slots.find((item) => item.slot_id === slotId);
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported v1b N7 support slot: ${slotId}.`);
    }
    return slot;
  }

  private assertN7FrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): TopicSelectionV1bN7HarnessFrozenInputPayload {
    if (request.node_id !== NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 support runtime requires the v1b N7 node id.');
    }
    const payload = request.frozen_input.payload as Partial<TopicSelectionV1bN7HarnessFrozenInputPayload>;
    if (
      (payload.input_mode !== 'initial_from_n6' && payload.input_mode !== 'feedback_from_n8')
      || !payload.n6_handoff_hash
      || !payload.topic_question_candidate_set_ref
      || !payload.topic_question_candidate_set_hash
      || !Array.isArray(payload.admissible_candidate_refs)
      || !Array.isArray(payload.admissible_candidate_hashes)
      || !payload.selected_research_slice_ref
      || !payload.selected_research_slice_hash
      || !payload.generation_artifact_ref
      || !payload.generation_artifact_hash
      || !payload.candidate_gate_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 support runtime requires a complete N7 frozen payload.');
    }
    return payload as TopicSelectionV1bN7HarnessFrozenInputPayload;
  }

  private defaultRunMode(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionAgentRunMode {
    return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
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

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
