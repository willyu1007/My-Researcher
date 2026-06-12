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
  type TopicSelectionV1bN6GateFailureRetryContextProjection,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  resolveDecisionMemoryPacketFromSourceRefs,
  type ResolvedTopicSelectionDecisionMemoryPacket,
} from './topic-selection-decision-memory-projection-service.js';
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
  TopicSelectionV1bN6DraftAdmissionExpectedIdentity,
  TopicSelectionV1bN6DraftSlotId,
} from './topic-selection-v1b-n6-draft-admission-service.js';

export type TopicSelectionV1bN6DraftGenerationMode =
  | 'initial_from_n5'
  | 'regeneration_after_n7_loopback'
  | 'regeneration_after_n6_gate_failure';

type TopicSelectionV1bN6DraftRuntimeModeContext =
  | {
    kind: 'initial_from_n5';
    n7_loopback_projection_ref: null;
    n7_loopback_projection_hash: null;
    n7_loopback_projection: null;
  }
  | {
    kind: 'regeneration_after_n7_loopback';
    n7_loopback_projection_ref: TopicSelectionFunctionalRef;
    n7_loopback_projection_hash: string;
    n7_loopback_projection: TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection;
  }
  | {
    kind: 'regeneration_after_n6_gate_failure';
    n6_gate_failure_projection_ref: TopicSelectionFunctionalRef;
    n6_gate_failure_projection_hash: string;
    n6_gate_failure_projection: TopicSelectionV1bN6GateFailureRetryContextProjection;
  };

export type TopicSelectionV1bN6DraftRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bN6DraftRuntimeContextPacket@v1';
  node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bN6DraftSlotId;
  invocation_slot_id: string;
  generation_mode: TopicSelectionV1bN6DraftGenerationMode;
  context_family: 'v1b_n6_topic_question_generation';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bN6HarnessFrozenInputPayload;
  mode_context: TopicSelectionV1bN6DraftRuntimeModeContext;
  decision_memory_packet_ref: TopicSelectionFunctionalRef | null;
  decision_memory_packet_hash: string | null;
  decision_memory: ResolvedTopicSelectionDecisionMemoryPacket['packet'] | null;
};

export type GenerateTopicSelectionV1bN6RuntimeDraftInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  generation_mode: TopicSelectionV1bN6DraftGenerationMode;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN6RuntimeDraftGenerationResult =
  | {
    status: 'succeeded';
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    structured_output: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

type N6RuntimeSlotBinding = {
  slot_id: TopicSelectionV1bN6DraftSlotId;
  invocation_slot_id: string;
  generation_mode: TopicSelectionV1bN6DraftGenerationMode;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  schema: Record<string, unknown>;
};

const NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;

export class TopicSelectionV1bN6DraftRuntimeService {
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

  async generateDraftArtifact(
    input: GenerateTopicSelectionV1bN6RuntimeDraftInput,
  ): Promise<TopicSelectionV1bN6RuntimeDraftGenerationResult> {
    const frozenPayload = this.assertN6FrozenPayload(input.request);
    const binding = this.slotBinding(input.generation_mode);
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const modeContext = await this.resolveModeContext(input.request, frozenPayload, input.generation_mode);
    const decisionMemory = await this.resolveDecisionMemoryPacket(input.request);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload, modeContext, decisionMemory?.hash ?? null);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes, modeContext);
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      modeContext,
      decisionMemory,
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
    const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>({
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      node_id: input.request.node_id,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      invocation_attempt_id: `${input.request.node_attempt_id}.${binding.prompt_variant_key}.runtime_draft`,
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
      prompt_variant_key: binding.prompt_variant_key,
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

    const semanticArtifact = await this.recordSemanticDraftArtifact({
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

  async buildAdmissionExpectedIdentity(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
    generationMode: TopicSelectionV1bN6DraftGenerationMode;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): Promise<TopicSelectionV1bN6DraftAdmissionExpectedIdentity> {
    const binding = this.slotBinding(input.generationMode);
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N6 draft profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N6 draft first slice does not allow provider model options.');
    }
    const modeContext = await this.resolveModeContext(input.request, input.frozenPayload, input.generationMode);
    const decisionMemory = await this.resolveDecisionMemoryPacket(input.request);
    const sourceHashes = this.sourceHashes(input.request, input.frozenPayload, modeContext, decisionMemory?.hash ?? null);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes, modeContext);
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload: input.frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      modeContext,
      decisionMemory,
    });
    const modelProfile = this.resolveModelProfile(binding, input.executionMode, input.runMode);
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: input.request.title_card_id ?? null,
      workflow_run_id: input.request.workflow_run_id,
      node_id: input.request.node_id,
      node_attempt_id: input.request.node_attempt_id,
      prompt_template_id: binding.prompt_template_id,
      prompt_template_version: binding.prompt_template_version,
      prompt_variant_key: binding.prompt_variant_key,
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
      prompt_variant_key: binding.prompt_variant_key,
      prompt_packet_hash: promptPacket.identity.prompt_packet_hash,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      normalized_payload_hash: input.normalizedPayloadHash,
    };
  }

  private async recordSemanticDraftArtifact(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    binding: N6RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    structuredOutput: TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    createdBy: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
  }): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N6 draft requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N6 runtime draft structured output hash drift detected.');
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
      allowed_effect: 'model_draft_for_gate',
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
      prompt_variant_key: input.binding.prompt_variant_key,
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
    binding: N6RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    modeContext: TopicSelectionV1bN6DraftRuntimeModeContext;
    decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
  }): TopicSelectionV1bN6DraftRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bN6DraftRuntimeContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      generation_mode: input.binding.generation_mode,
      context_family: 'v1b_n6_topic_question_generation',
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload, input.modeContext),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
      mode_context: input.modeContext,
      decision_memory_packet_ref: input.decisionMemory?.ref ?? null,
      decision_memory_packet_hash: input.decisionMemory?.hash ?? null,
      decision_memory: input.decisionMemory?.packet ?? null,
    };
  }

  private messages(
    binding: N6RuntimeSlotBinding,
    contextPacket: TopicSelectionV1bN6DraftRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Generate a non-authority topic-question candidate draft for v1b N6.',
          'Use only the supplied refs, hashes, and context packet.',
          'Do not create QuestionFrame, TopicQuestionCandidate, CandidateSet, N6ToN7 handoff, package, recheck, or authority records.',
          'Do not override deterministic N6 gates, route policy, executable prompts, or ref/hash lineage.',
          'Return only JSON matching TopicQuestionCandidateSetDraft@v1.',
        ].join(' ') + (contextPacket.decision_memory
          ? ' context_packet.decision_memory lists previously rejected/parked/duplicate directions for this title card; do not regenerate equivalent candidates, and if intentionally revisiting one, justify it explicitly in the candidate rationale.'
          : ''),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          slot_id: binding.slot_id,
          generation_mode: binding.generation_mode,
          context_packet: contextPacket,
          output_boundary: 'model_draft_before_deterministic_gate',
        }),
      },
    ];
  }

  private sourceHashes(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    modeContext: TopicSelectionV1bN6DraftRuntimeModeContext,
    decisionMemoryPacketHash: string | null,
  ): Record<string, string> {
    const sourceHashes: Record<string, string> = {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
      n5_handoff_hash: payload.n5_handoff_hash,
      constraint_profile_hash: payload.constraint_profile_hash,
      intake_readiness_hash: payload.intake_readiness_hash,
      research_slice_hash: payload.research_slice_hash,
      research_slice_selection_hash: payload.research_slice_selection_hash,
      research_slice_option_set_hash: payload.research_slice_option_set_hash,
      selected_slice_option_hash: payload.selected_slice_option_hash,
    };
    if (modeContext.kind === 'regeneration_after_n7_loopback') {
      const projection = modeContext.n7_loopback_projection;
      sourceHashes.n7_loopback_projection_hash = modeContext.n7_loopback_projection_hash;
      sourceHashes.n7_loopback_n6_handoff_hash = projection.n6_handoff_hash;
      sourceHashes.n7_loopback_candidate_set_hash = projection.topic_question_candidate_set_hash;
      sourceHashes.n7_loopback_failed_trial_synthesis_hash = projection.failed_trial_synthesis_hash;
      sourceHashes.n7_loopback_exhausted_candidate_hashes_hash = this.hash(projection.exhausted_candidate_hashes);
      sourceHashes.n7_loopback_failure_reason_codes_hash = this.hash(projection.failure_reason_codes);
      sourceHashes.n7_loopback_regeneration_hints_hash = this.hash(projection.n6_regeneration_hints);
      if (projection.n8_feedback_hash) {
        sourceHashes.n7_loopback_n8_feedback_hash = projection.n8_feedback_hash;
      }
    }
    if (modeContext.kind === 'regeneration_after_n6_gate_failure') {
      const projection = modeContext.n6_gate_failure_projection;
      sourceHashes.n6_gate_failure_projection_hash = modeContext.n6_gate_failure_projection_hash;
      sourceHashes.n6_gate_failure_failed_draft_hash = projection.failed_draft_hash;
      sourceHashes.n6_gate_failure_failed_draft_prompt_packet_hash = projection.failed_draft_prompt_packet_hash;
      sourceHashes.n6_gate_failure_failed_draft_source_hashes_hash = projection.failed_draft_source_hashes_hash;
      sourceHashes.n6_gate_failure_blocked_candidate_context_hash = projection.blocked_candidate_context_hash;
      sourceHashes.n6_gate_failure_reason_codes_hash = this.hash(projection.failure_reason_codes);
      sourceHashes.n6_gate_failure_regeneration_hints_hash = this.hash(projection.regeneration_hints);
      if (projection.triage_payload_hash) {
        sourceHashes.n6_gate_failure_triage_payload_hash = projection.triage_payload_hash;
      }
    }
    if (decisionMemoryPacketHash) {
      sourceHashes.decision_memory_packet_hash = decisionMemoryPacketHash;
    }
    return sourceHashes;
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    modeContext?: TopicSelectionV1bN6DraftRuntimeModeContext,
  ): TopicSelectionFunctionalRef[] {
    const loopbackRefs = modeContext?.kind === 'regeneration_after_n7_loopback'
      ? [
        modeContext.n7_loopback_projection_ref,
        ...modeContext.n7_loopback_projection.source_refs,
        modeContext.n7_loopback_projection.topic_question_candidate_set_ref,
        modeContext.n7_loopback_projection.failed_trial_synthesis_ref,
        ...modeContext.n7_loopback_projection.exhausted_candidate_refs,
      ]
      : [];
    const gateFailureRefs = modeContext?.kind === 'regeneration_after_n6_gate_failure'
      ? [
        modeContext.n6_gate_failure_projection_ref,
        ...modeContext.n6_gate_failure_projection.source_refs,
        ...modeContext.n6_gate_failure_projection.support_refs,
        modeContext.n6_gate_failure_projection.failed_draft_ref,
        modeContext.n6_gate_failure_projection.triage_artifact_ref,
      ]
      : [];
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      payload.constraint_profile_ref,
      payload.intake_readiness_ref,
      payload.research_slice_ref,
      payload.research_slice_selection_ref,
      payload.research_slice_option_set_ref,
      payload.selected_slice_option_ref,
      ...loopbackRefs,
      ...gateFailureRefs,
    ]);
  }

  private runtimeInvocationContextHash(
    binding: N6RuntimeSlotBinding,
    sourceHashes: Record<string, string>,
    modeContext: TopicSelectionV1bN6DraftRuntimeModeContext,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n6_topic_question_generation',
        scenario_case_id: binding.generation_mode,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: modeContext.kind === 'regeneration_after_n7_loopback'
        ? {
          loop_kind: 'repair_from_node',
          loop_stage: 'n6_regeneration_after_n7_loopback',
          current_round_index: 1,
          remaining_round_budget: null,
          loopback_source_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
          repair_origin_ref: modeContext.n7_loopback_projection_ref,
          repair_origin_hash: modeContext.n7_loopback_projection_hash,
        }
        : modeContext.kind === 'regeneration_after_n6_gate_failure'
          ? {
            loop_kind: 'repair_from_node',
            loop_stage: 'n6_regeneration_after_n6_gate_failure',
            current_round_index: 2,
            remaining_round_budget: null,
            loopback_source_node_id: NODE_ID,
            repair_origin_ref: modeContext.n6_gate_failure_projection_ref,
            repair_origin_hash: modeContext.n6_gate_failure_projection_hash,
          }
        : {
          loop_kind: 'initial',
          loop_stage: 'n6_initial_from_n5',
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

  private resolveRuntimeProfile(binding: N6RuntimeSlotBinding): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: N6RuntimeSlotBinding,
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

  private slotBinding(generationMode: TopicSelectionV1bN6DraftGenerationMode): N6RuntimeSlotBinding {
    const slot = this.slotPolicy();
    return {
      slot_id: 'n6_question_candidate_draft',
      invocation_slot_id: TOPIC_SELECTION_V1B_N6_INVOCATION_SLOT_IDS.question_candidate_draft,
      generation_mode: generationMode,
      context_policy_profile_id: TOPIC_SELECTION_V1B_N6_CONTEXT_RUNTIME_PROFILE_IDS.question_candidate_draft,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: 'topic-selection.v1b.n6.question-candidate-draft.runtime-initial',
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      prompt_variant_key: `n6_question_candidate_draft.${generationMode}`,
      schema: topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private async resolveModeContext(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
    generationMode: TopicSelectionV1bN6DraftGenerationMode,
  ): Promise<TopicSelectionV1bN6DraftRuntimeModeContext> {
    const n7Projection = await this.resolveN7LoopbackProjection(request, frozenPayload);
    const n6GateFailureProjection = await this.resolveN6GateFailureProjection(request, frozenPayload);
    if (generationMode === 'initial_from_n5') {
      if (n7Projection || n6GateFailureProjection) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          'N6 initial_from_n5 runtime draft must not consume loopback or retry projection context.',
        );
      }
      return {
        kind: 'initial_from_n5',
        n7_loopback_projection: null,
        n7_loopback_projection_hash: null,
        n7_loopback_projection_ref: null,
      };
    }
    if (generationMode === 'regeneration_after_n7_loopback') {
      if (!n7Projection || n6GateFailureProjection) {
        throw new AppError(
          400,
          'INVALID_PAYLOAD',
          'N6 regeneration_after_n7_loopback runtime draft requires an N7 failed-trial loopback projection source artifact, exactly one, and no N6 gate-failure retry projection.',
        );
      }
      return {
        kind: 'regeneration_after_n7_loopback',
        n7_loopback_projection: n7Projection.payload,
        n7_loopback_projection_hash: n7Projection.hash,
        n7_loopback_projection_ref: n7Projection.ref,
      };
    }
    if (!n6GateFailureProjection || n7Projection) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'N6 regeneration_after_n6_gate_failure runtime draft requires exactly one N6 gate-failure retry projection and no N7 failed-trial loopback projection.',
      );
    }
    return {
      kind: 'regeneration_after_n6_gate_failure',
      n6_gate_failure_projection: n6GateFailureProjection.payload,
      n6_gate_failure_projection_hash: n6GateFailureProjection.hash,
      n6_gate_failure_projection_ref: n6GateFailureProjection.ref,
    };
  }

  private async resolveDecisionMemoryPacket(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<ResolvedTopicSelectionDecisionMemoryPacket | null> {
    return resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: request.frozen_input.source_refs,
      getArtifactRef: (refId) => this.controlPlane.getArtifactRef(refId),
      expectedTitleCardId: request.title_card_id ?? null,
    });
  }

  private async resolveN7LoopbackProjection(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): Promise<{
    ref: TopicSelectionFunctionalRef;
    hash: string;
    payload: TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection;
  } | null> {
    let resolved: {
      ref: TopicSelectionFunctionalRef;
      hash: string;
      payload: TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection;
    } | null = null;
    for (const sourceRef of request.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (
        !this.isRecord(artifact?.payload)
        || artifact.payload.projection_kind !== 'v1b_n7_to_n6_failed_trial_loopback_context'
      ) {
        continue;
      }
      if (resolved) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N6 regeneration accepts exactly one N7 loopback projection artifact.');
      }
      const projectionHash = this.hash(artifact.payload);
      if (!artifact.checksum || artifact.checksum !== projectionHash) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection checksum is missing or drifted.');
      }
      const projection = this.n7LoopbackProjectionPayload(artifact.payload);
      this.assertN7LoopbackProjectionPolicy(projection, frozenPayload);
      resolved = {
        ref: sourceRef,
        hash: projectionHash,
        payload: projection,
      };
    }
    return resolved;
  }

  private async resolveN6GateFailureProjection(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): Promise<{
    ref: TopicSelectionFunctionalRef;
    hash: string;
    payload: TopicSelectionV1bN6GateFailureRetryContextProjection;
  } | null> {
    let resolved: {
      ref: TopicSelectionFunctionalRef;
      hash: string;
      payload: TopicSelectionV1bN6GateFailureRetryContextProjection;
    } | null = null;
    for (const sourceRef of request.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (
        !this.isRecord(artifact?.payload)
        || artifact.payload.projection_kind !== 'v1b_n6_gate_failure_retry_context'
      ) {
        continue;
      }
      if (resolved) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N6 regeneration accepts exactly one N6 gate-failure retry projection artifact.');
      }
      const projectionHash = this.hash(artifact.payload);
      if (!artifact.checksum || artifact.checksum !== projectionHash) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection checksum is missing or drifted.');
      }
      const projection = this.n6GateFailureProjectionPayload(artifact.payload);
      this.assertN6GateFailureProjectionPolicy(projection, frozenPayload);
      resolved = {
        ref: sourceRef,
        hash: projectionHash,
        payload: projection,
      };
    }
    return resolved;
  }

  private assertN6GateFailureProjectionPolicy(
    projection: TopicSelectionV1bN6GateFailureRetryContextProjection,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): void {
    if (
      projection.non_authority !== true
      || projection.context_authority !== 'non_authority_runtime_context'
      || projection.route_decision !== 'loopback'
      || projection.loopback_target_code !== 'n6_regenerate_candidates'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection must remain non-authority regeneration context.');
    }
    const hasTriageRef = projection.triage_artifact_ref !== null;
    if (
      !this.hasExactHashKeys(projection.source_hashes, [
        'frozen_input_hash',
        'n5_handoff_hash',
        'selected_research_slice_hash',
        'failed_draft_hash',
        'failed_draft_prompt_packet_hash',
        'failed_draft_source_hashes_hash',
        'blocked_candidate_context_hash',
        'failure_reason_codes_hash',
        'regeneration_hints_hash',
      ], hasTriageRef ? ['triage_payload_hash'] : [])
      || !this.hasExactHashKeys(projection.support_hashes, [
        'failed_draft_hash',
        'failed_draft_prompt_packet_hash',
        'failed_draft_source_hashes_hash',
        'blocked_candidate_context_hash',
      ], hasTriageRef ? ['triage_artifact_hash', 'triage_payload_hash'] : [])
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection hash maps contain non-hash or unexpected keys.');
    }
    if (
      !this.sameRefObject(projection.selected_research_slice_ref, frozenPayload.research_slice_ref)
      || projection.selected_research_slice_hash !== frozenPayload.research_slice_hash
      || projection.n5_handoff_hash !== frozenPayload.n5_handoff_hash
      || projection.source_hashes.selected_research_slice_hash !== frozenPayload.research_slice_hash
      || projection.source_hashes.n5_handoff_hash !== frozenPayload.n5_handoff_hash
      || projection.source_hashes.failed_draft_hash !== projection.failed_draft_hash
      || projection.source_hashes.failed_draft_prompt_packet_hash !== projection.failed_draft_prompt_packet_hash
      || projection.source_hashes.failed_draft_source_hashes_hash !== projection.failed_draft_source_hashes_hash
      || projection.source_hashes.blocked_candidate_context_hash !== projection.blocked_candidate_context_hash
      || projection.source_hashes.failure_reason_codes_hash !== this.hash(projection.failure_reason_codes)
      || projection.source_hashes.regeneration_hints_hash !== this.hash(projection.regeneration_hints)
      || projection.support_hashes.failed_draft_hash !== projection.failed_draft_hash
      || projection.support_hashes.failed_draft_prompt_packet_hash !== projection.failed_draft_prompt_packet_hash
      || projection.support_hashes.failed_draft_source_hashes_hash !== projection.failed_draft_source_hashes_hash
      || projection.support_hashes.blocked_candidate_context_hash !== projection.blocked_candidate_context_hash
      || this.hash(projection.blocked_candidate_context) !== projection.blocked_candidate_context_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection source hashes drift from frozen N6 lineage.');
    }
    const sourceRefKeys = new Set(projection.source_refs.map((sourceRef) => this.refKey(sourceRef)));
    if (
      !sourceRefKeys.has(this.refKey(frozenPayload.research_slice_ref))
      || !sourceRefKeys.has(this.refKey(frozenPayload.research_slice_selection_ref))
      || !sourceRefKeys.has(this.refKey(projection.failed_draft_ref))
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection does not preserve required N6 lineage refs.');
    }
    if (projection.blocked_candidate_context.length === 0 || projection.failure_reason_codes.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection must preserve blocked candidate context and failure reasons.');
    }
    const hasTriageHash = projection.triage_artifact_hash !== null || projection.triage_payload_hash !== null;
    if (hasTriageRef !== hasTriageHash || (hasTriageRef && (!projection.triage_artifact_hash || !projection.triage_payload_hash))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection triage identity is incomplete.');
    }
    if (projection.triage_artifact_ref) {
      if (!sourceRefKeys.has(this.refKey(projection.triage_artifact_ref))) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection does not preserve required triage lineage refs.');
      }
      if (
        projection.source_hashes.triage_payload_hash !== projection.triage_payload_hash
        || projection.support_hashes.triage_artifact_hash !== projection.triage_artifact_hash
        || projection.support_hashes.triage_payload_hash !== projection.triage_payload_hash
      ) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection triage hashes drift.');
      }
    } else if (
      projection.source_hashes.triage_payload_hash !== undefined
      || projection.support_hashes.triage_artifact_hash !== undefined
      || projection.support_hashes.triage_payload_hash !== undefined
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection triage hashes drift.');
    }
  }

  private assertN7LoopbackProjectionPolicy(
    projection: TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection,
    frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload,
  ): void {
    if (
      projection.non_authority !== true
      || projection.context_authority !== 'non_authority_runtime_context'
      || projection.route_decision !== 'loopback'
      || projection.loopback_target_code !== 'n7_loopback_to_n6'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection must remain non-authority loopback context.');
    }
    if (!projection.source_refs.some((sourceRef) =>
      this.sameRefObject(sourceRef, frozenPayload.research_slice_ref)
      || this.sameRefObject(sourceRef, frozenPayload.research_slice_selection_ref))) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'N7 loopback projection does not belong to the current frozen N6 ResearchSlice lineage.',
      );
    }
    if (
      projection.source_hashes.failed_trial_synthesis_hash !== projection.failed_trial_synthesis_hash
      || projection.source_hashes.topic_question_candidate_set_hash !== projection.topic_question_candidate_set_hash
      || projection.source_hashes.n6_handoff_hash !== projection.n6_handoff_hash
      || projection.source_hashes.selected_research_slice_hash !== frozenPayload.research_slice_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection source hashes drift from projection payload.');
    }
    if (
      projection.exhausted_candidate_refs.length === 0
      || projection.exhausted_candidate_refs.length !== projection.exhausted_candidate_hashes.length
      || projection.failure_reason_codes.length === 0
      || projection.n6_regeneration_hints.length === 0
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection must preserve exhausted candidates, failure reasons, and regeneration hints.');
    }
    const sourceRefKeys = new Set(projection.source_refs.map((sourceRef) => this.refKey(sourceRef)));
    const unknownExhaustedRef = projection.exhausted_candidate_refs.find((candidateRef) =>
      !sourceRefKeys.has(this.refKey(candidateRef)));
    if (unknownExhaustedRef) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection contains an unknown exhausted candidate ref.');
    }
  }

  private n6GateFailureProjectionPayload(
    value: Record<string, unknown>,
  ): TopicSelectionV1bN6GateFailureRetryContextProjection {
    if (
      value.schema_version !== 'TopicSelectionV1bN6RuntimeContextProjection@v1'
      || value.projection_kind !== 'v1b_n6_gate_failure_retry_context'
      || value.node_id !== NODE_ID
      || value.route_decision !== 'loopback'
      || value.loopback_target_code !== 'n6_regenerate_candidates'
      || value.non_authority !== true
      || value.context_cache_scope !== 'process_local_runtime_only'
      || value.context_authority !== 'non_authority_runtime_context'
      || !this.isFunctionalRefArray(value.source_refs)
      || !this.isRecord(value.source_hashes)
      || !this.isFunctionalRefArray(value.support_refs)
      || !this.isRecord(value.support_hashes)
      || !this.isStringArray(value.preserved_fact_kinds)
      || !this.isFunctionalRefValue(value.selected_research_slice_ref)
      || !this.isHash(value.selected_research_slice_hash)
      || !this.isHash(value.n5_handoff_hash)
      || !this.isFunctionalRefValue(value.failed_draft_ref)
      || !this.isHash(value.failed_draft_hash)
      || !this.isHash(value.failed_draft_prompt_packet_hash)
      || !this.isHash(value.failed_draft_source_hashes_hash)
      || !Array.isArray(value.blocked_candidate_context)
      || !value.blocked_candidate_context.every((item) => this.isRecord(item))
      || !this.isHash(value.blocked_candidate_context_hash)
      || !this.isStringArray(value.failure_reason_codes)
      || !this.isStringArray(value.regeneration_hints)
      || !this.isNullableFunctionalRefValue(value.triage_artifact_ref)
      || !this.isNullableHash(value.triage_artifact_hash)
      || !this.isNullableHash(value.triage_payload_hash)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 gate-failure retry projection payload is malformed.');
    }
    return value as unknown as TopicSelectionV1bN6GateFailureRetryContextProjection;
  }

  private n7LoopbackProjectionPayload(
    value: Record<string, unknown>,
  ): TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection {
    if (
      value.schema_version !== 'TopicSelectionV1bN7RuntimeContextProjection@v1'
      || value.projection_kind !== 'v1b_n7_to_n6_failed_trial_loopback_context'
      || value.node_id !== 'topic-selection.v1b.materialize-topic-question-contract.v1'
      || value.route_decision !== 'loopback'
      || value.non_authority !== true
      || value.context_cache_scope !== 'process_local_runtime_only'
      || value.context_authority !== 'non_authority_runtime_context'
      || value.loopback_target_code !== 'n7_loopback_to_n6'
      || !this.isFunctionalRefArray(value.source_refs)
      || !this.isRecord(value.source_hashes)
      || !this.isFunctionalRefArray(value.support_refs)
      || !this.isRecord(value.support_hashes)
      || !this.isStringArray(value.preserved_fact_kinds)
      || !this.isFunctionalRefValue(value.topic_question_candidate_set_ref)
      || !this.isHash(value.topic_question_candidate_set_hash)
      || !this.isHash(value.n6_handoff_hash)
      || !this.isNullableFunctionalRefValue(value.n8_feedback_ref)
      || !this.isNullableHash(value.n8_feedback_hash)
      || !this.isFunctionalRefValue(value.failed_trial_synthesis_ref)
      || !this.isHash(value.failed_trial_synthesis_hash)
      || !this.isFunctionalRefArray(value.exhausted_candidate_refs)
      || !this.isHashArray(value.exhausted_candidate_hashes)
      || !this.isStringArray(value.failure_reason_codes)
      || !this.isStringArray(value.n6_regeneration_hints)
      || typeof value.synthesis_summary !== 'string'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7 loopback projection payload is malformed.');
    }
    return value as unknown as TopicSelectionV1bN7ToN6FailedTrialLoopbackContextProjection;
  }

  private slotPolicy() {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
      .find((item) => item.node_id === NODE_ID);
    const slot = policy?.semantic_support_slots.find((item) => item.slot_id === 'n6_question_candidate_draft');
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported v1b N6 draft slot.');
    }
    return slot;
  }

  private assertN6FrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): TopicSelectionV1bN6HarnessFrozenInputPayload {
    if (request.node_id !== NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 draft runtime requires the v1b N6 node id.');
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
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 draft runtime requires a complete N6 frozen payload.');
    }
    return payload as TopicSelectionV1bN6HarnessFrozenInputPayload;
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

  private sameRefObject(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return stableStringify({
      ref_type: ref.ref_type,
      ref_id: ref.ref_id,
      version_id: ref.version_id ?? null,
      title_card_id: ref.title_card_id ?? null,
    });
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private isHash(value: unknown): value is string {
    return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  }

  private isNullableHash(value: unknown): value is string | null {
    return value === null || this.isHash(value);
  }

  private hasExactHashKeys(
    value: Record<string, unknown>,
    requiredKeys: string[],
    optionalKeys: string[] = [],
  ): value is Record<string, string> {
    const allowedKeys = new Set([...requiredKeys, ...optionalKeys]);
    const actualKeys = Object.keys(value);
    if (actualKeys.some((key) => !allowedKeys.has(key) || !this.isHash(value[key]))) {
      return false;
    }
    return requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
      && optionalKeys.every((key) => !Object.prototype.hasOwnProperty.call(value, key) || this.isHash(value[key]));
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  private isHashArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => this.isHash(item));
  }

  private isFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isRecord(value)
      && typeof value.ref_type === 'string'
      && typeof value.ref_id === 'string'
      && (value.title_card_id === null || typeof value.title_card_id === 'string' || value.title_card_id === undefined)
      && (value.version_id === null || typeof value.version_id === 'string' || value.version_id === undefined);
  }

  private isNullableFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef | null {
    return value === null || this.isFunctionalRefValue(value);
  }

  private isFunctionalRefArray(value: unknown): value is TopicSelectionFunctionalRef[] {
    return Array.isArray(value) && value.every((item) => this.isFunctionalRefValue(item));
  }
}
