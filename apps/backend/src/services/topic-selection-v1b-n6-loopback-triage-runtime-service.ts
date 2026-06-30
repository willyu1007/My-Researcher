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
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN6LoopbackTriageSupportPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bN6LoopbackTriageSupportPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS,
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
  TopicSelectionV1bN6LoopbackTriageAdmissionExpectedIdentity,
  TopicSelectionV1bN6LoopbackTriageSlotId,
} from './topic-selection-v1b-n6-loopback-triage-admission-service.js';

export type TopicSelectionV1bN6LoopbackTriageRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bN6LoopbackTriageRuntimeContextPacket@v1';
  node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bN6LoopbackTriageSlotId;
  invocation_slot_id: string;
  context_family: 'v1b_n6_loopback_triage_context';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bN6HarnessFrozenInputPayload;
  failed_draft_artifact_ref: TopicSelectionFunctionalRef;
  failed_draft_hash: string;
};

export type GenerateTopicSelectionV1bN6LoopbackTriageRuntimeInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  failed_draft_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
  failed_draft_hash: string;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bN6LoopbackTriageSupportPayload> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1bN6LoopbackTriageSupportPayload> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN6LoopbackTriageRuntimeGenerationResult =
  | {
    status: 'succeeded';
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    structured_output: TopicSelectionV1bN6LoopbackTriageSupportPayload;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bN6LoopbackTriageSupportPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bN6LoopbackTriageSupportPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

type N6LoopbackTriageRuntimeSlotBinding = {
  slot_id: TopicSelectionV1bN6LoopbackTriageSlotId;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  schema: Record<string, unknown>;
};

const NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;

/**
 * Product-grade v1b N6 loopback-triage support system prompt (W-05 Commit 4). Exported as a pure,
 * input-free builder so the unit test can pin a single SHA-256 drift anchor over the rendered body —
 * there is no harness/replay golden over this single-slot prompt, so the anchor is its only drift
 * guard. The prose mirrors the N6LoopbackTriageSupport@v1 schema, including its conditional allOf
 * branches: each loopback_target_code locks a failure_scope subset and the object-vs-null shape of
 * debate_escalation / upstream_rollback.
 */
export function buildV1bN6LoopbackTriageSystemContent(): string {
  return [
    'You are producing a non-authority loopback-triage support recommendation for a v1b N6 topic-question candidate draft that failed its deterministic N6 gate: diagnose the failure from the supplied failed-draft identity and context packet, and recommend exactly one recovery route for a downstream deterministic N6 gate and human reviewer to act on.',
    'Use only the supplied refs, hashes, failed-draft identity, and context packet; cite only refs present in the context packet and never invent refs or hashes.',
    'Set loopback_target_code to one of n6_regenerate_candidates, n6_debate_escalation, or n6_loopback_to_n5_select_different_slice, set failure_scope to one of candidate_level, question_frame_level, slice_level, or upstream_context_level, give at least one dominant_reason_codes entry and at least one affected_refs drawn from the supplied refs, and list regeneration_hints.',
    'When loopback_target_code is n6_regenerate_candidates, set failure_scope to candidate_level or question_frame_level and set both debate_escalation and upstream_rollback to null, because the failed draft is recoverable by regenerating candidates in place.',
    'When loopback_target_code is n6_debate_escalation, set failure_scope to candidate_level or question_frame_level, set upstream_rollback to null, and provide a debate_escalation object with debate_level (mixed_cost_control or provider_diverse_deep), recommended_profile_id, sticky, and rationale.',
    'When loopback_target_code is n6_loopback_to_n5_select_different_slice, set failure_scope to slice_level or upstream_context_level, set debate_escalation to null, and provide an upstream_rollback object whose target_node_id is topic-selection.v1b.select-research-slice.v1, whose repair_action is select_different_slice, and with a rationale.',
    'Provide an overall rationale for the recommended recovery route.',
    'Do not create candidates, research slice selections, handoffs, rechecks, packages, or authority records.',
    'Do not override deterministic N6 gates, route policy, executable prompts, or ref/hash lineage.',
    'Return only JSON matching N6LoopbackTriageSupport@v1.',
  ].join(' ');
}

export class TopicSelectionV1bN6LoopbackTriageRuntimeService {
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

  async generateSupportArtifact(
    input: GenerateTopicSelectionV1bN6LoopbackTriageRuntimeInput,
  ): Promise<TopicSelectionV1bN6LoopbackTriageRuntimeGenerationResult> {
    const frozenPayload = this.assertN6FrozenPayload(input.request);
    this.assertFailedDraftArtifact(input.failed_draft_artifact, input.failed_draft_hash);
    const binding = this.slotBinding();
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload, input.failed_draft_artifact, input.failed_draft_hash);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      input.failed_draft_artifact,
      input.failed_draft_hash,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      failedDraftArtifact: input.failed_draft_artifact,
      failedDraftHash: input.failed_draft_hash,
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
    const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1bN6LoopbackTriageSupportPayload>({
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      node_id: input.request.node_id,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      invocation_attempt_id: `${input.request.node_attempt_id}.${binding.invocation_slot_id}.runtime_support`,
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
      prompt_variant_key: binding.invocation_slot_id,
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
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    failedDraftHash: string;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): TopicSelectionV1bN6LoopbackTriageAdmissionExpectedIdentity {
    const binding = this.slotBinding();
    this.assertFailedDraftArtifact(input.failedDraftArtifact, input.failedDraftHash);
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N6 loopback triage profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N6 loopback triage runtime does not allow provider model options.');
    }
    const sourceHashes = this.sourceHashes(input.request, input.frozenPayload, input.failedDraftArtifact, input.failedDraftHash);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      input.failedDraftArtifact,
      input.failedDraftHash,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload: input.frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      failedDraftArtifact: input.failedDraftArtifact,
      failedDraftHash: input.failedDraftHash,
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
      normalized_payload_hash: input.normalizedPayloadHash,
    };
  }

  private async recordSemanticSupportArtifact(
    input: {
      request: TopicSelectionV1bWorkflowHarnessRunRequest;
      binding: N6LoopbackTriageRuntimeSlotBinding;
      runMode: TopicSelectionAgentRunMode;
      executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
      structuredOutput: TopicSelectionV1bN6LoopbackTriageSupportPayload;
      invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bN6LoopbackTriageSupportPayload>;
      runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
      runtimeInvocationContextHash: string;
      sourceHashes: Record<string, string>;
      createdBy: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
    },
  ): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N6 loopback triage requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N6 loopback triage structured output hash drift detected.');
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
      slot_spec_hash: this.hash(this.slotPolicy()),
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
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    binding: N6LoopbackTriageRuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    failedDraftHash: string;
  }): TopicSelectionV1bN6LoopbackTriageRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bN6LoopbackTriageRuntimeContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      context_family: 'v1b_n6_loopback_triage_context',
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload, input.failedDraftArtifact),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
      failed_draft_artifact_ref: this.failedDraftOutputRef(input.failedDraftArtifact),
      failed_draft_hash: input.failedDraftHash,
    };
  }

  private messages(
    binding: N6LoopbackTriageRuntimeSlotBinding,
    contextPacket: TopicSelectionV1bN6LoopbackTriageRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1bN6LoopbackTriageSystemContent(),
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
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
    failedDraftHash: string,
  ): Record<string, string> {
    return {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
      n5_handoff_hash: payload.n5_handoff_hash,
      constraint_profile_hash: payload.constraint_profile_hash,
      intake_readiness_hash: payload.intake_readiness_hash,
      research_slice_hash: payload.research_slice_hash,
      research_slice_selection_hash: payload.research_slice_selection_hash,
      research_slice_option_set_hash: payload.research_slice_option_set_hash,
      selected_slice_option_hash: payload.selected_slice_option_hash,
      failed_draft_hash: failedDraftHash,
      failed_draft_prompt_packet_hash: failedDraftArtifact.prompt_packet_hash,
      failed_draft_source_hashes_hash: this.hash(failedDraftArtifact.source_hashes),
    };
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      payload.constraint_profile_ref,
      payload.intake_readiness_ref,
      payload.research_slice_ref,
      payload.research_slice_selection_ref,
      payload.research_slice_option_set_ref,
      payload.selected_slice_option_ref,
      failedDraftArtifact.support_artifact_ref,
      failedDraftArtifact.normalized_output_ref,
      failedDraftArtifact.provenance_ref,
    ]);
  }

  private runtimeInvocationContextHash(
    binding: N6LoopbackTriageRuntimeSlotBinding,
    sourceHashes: Record<string, string>,
    failedDraftArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
    failedDraftHash: string,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n6_loopback_triage',
        scenario_case_id: binding.slot_id,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'repair_from_node',
        loop_stage: 'n6_gate_failure_triage',
        current_round_index: 1,
        remaining_round_budget: null,
        loopback_source_node_id: NODE_ID,
        repair_origin_ref: this.failedDraftOutputRef(failedDraftArtifact),
        repair_origin_hash: failedDraftHash,
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

  private resolveRuntimeProfile(
    binding: N6LoopbackTriageRuntimeSlotBinding,
  ): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: N6LoopbackTriageRuntimeSlotBinding,
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

  private slotBinding(): N6LoopbackTriageRuntimeSlotBinding {
    const slot = this.slotPolicy();
    return {
      slot_id: 'n6_loopback_triage',
      invocation_slot_id: TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.loopback_triage,
      context_policy_profile_id: TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.loopback_triage,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: 'topic-selection.v1b.n6.loopback-triage.runtime-support',
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      schema: topicSelectionV1bN6LoopbackTriageSupportPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private slotPolicy() {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
      .find((item) => item.node_id === NODE_ID);
    const slot = policy?.semantic_support_slots.find((item) => item.slot_id === 'n6_loopback_triage');
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported v1b N6 loopback triage slot.');
    }
    return slot;
  }

  private assertN6FrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): TopicSelectionV1bN6HarnessFrozenInputPayload {
    if (request.node_id !== NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage runtime requires the v1b N6 node id.');
    }
    const payload = request.frozen_input.payload as Partial<TopicSelectionV1bN6HarnessFrozenInputPayload>;
    if (
      !payload.n5_handoff_hash
      || !payload.constraint_profile_ref
      || !payload.constraint_profile_hash
      || !payload.intake_readiness_ref
      || !payload.intake_readiness_hash
      || !payload.research_slice_ref
      || !payload.research_slice_hash
      || !payload.research_slice_selection_ref
      || !payload.research_slice_selection_hash
      || !payload.research_slice_option_set_ref
      || !payload.research_slice_option_set_hash
      || !payload.selected_slice_option_ref
      || !payload.selected_slice_option_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage runtime requires frozen N5-to-N6 lineage.');
    }
    return payload as TopicSelectionV1bN6HarnessFrozenInputPayload;
  }

  private assertFailedDraftArtifact(
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
    failedDraftHash: string,
  ): void {
    if (
      artifact.node_id !== NODE_ID
      || artifact.slot_id !== 'n6_question_candidate_draft'
      || artifact.allowed_effect !== 'model_draft_for_gate'
      || artifact.output_contract !== 'TopicQuestionCandidateSetDraft@v1'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage runtime requires a failed N6 draft artifact.');
    }
    if (!artifact.normalized_output_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage runtime requires a ref-backed failed draft output.');
    }
    if (
      artifact.support_artifact_hash !== failedDraftHash
      || artifact.normalized_output_hash !== failedDraftHash
      || artifact.structured_output_hash !== failedDraftHash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage failed draft artifact hash does not match failed draft payload hash.');
    }
  }

  private failedDraftOutputRef(
    artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): TopicSelectionFunctionalRef {
    if (!artifact.normalized_output_ref) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 loopback triage runtime requires a normalized failed draft output ref.');
    }
    return artifact.normalized_output_ref;
  }

  private defaultRunMode(
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>,
  ): TopicSelectionAgentRunMode {
    return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
  }

  private executorKind(
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>,
  ): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
  }

  private toArtifactFunctionalRef(artifact: TopicSelectionArtifactRefRecord): TopicSelectionArtifactFunctionalRef {
    return {
      ref_type: 'artifact_ref',
      ref_id: artifact.artifact_ref_id,
      title_card_id: artifact.title_card_id ?? null,
      version_id: null,
    };
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>):
    TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const result: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      if (!ref) continue;
      const key = this.refKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return stableStringify({
      ref_type: ref.ref_type,
      ref_id: ref.ref_id,
      title_card_id: ref.title_card_id ?? null,
      version_id: ref.version_id ?? null,
    });
  }

  private requiredChecksum(artifact: TopicSelectionArtifactRefRecord | null, label: string): string {
    if (!artifact?.checksum) {
      throw new AppError(500, 'INTERNAL_ERROR', `Missing checksum for ${label}.`);
    }
    return artifact.checksum;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
