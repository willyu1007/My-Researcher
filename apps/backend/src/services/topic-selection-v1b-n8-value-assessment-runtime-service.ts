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
  type TopicSelectionCompressionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type {
  TopicSelectionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  type TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bTopicValueAssessmentDraftPayloadSchema,
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
  TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS,
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
  type TopicSelectionAgentRuntimeCompressionAttemptInput,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import type {
  TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity,
  TopicSelectionV1bN8ValueAssessmentSlotId,
} from './topic-selection-v1b-n8-value-assessment-admission-service.js';

type N8RuntimeSlotBinding = {
  slot_id: TopicSelectionV1bN8ValueAssessmentSlotId;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  schema: Record<string, unknown>;
};

export type TopicSelectionV1bN8RequiredStructureManifest = {
  schema_version: 'TopicSelectionV1bN8RequiredStructureManifest@v1';
  manifest_purpose: 'runtime_compression_and_admission_self_check';
  required_paths: string[];
  required_source_hashes: Record<string, string>;
  preserved_fact_kinds: string[];
  forbidden_authority_fields: string[];
  route_gate_semantics: {
    runtime_output_authority: 'non_authority_model_draft_for_gate';
    deterministic_gate_required: true;
    feedback_generation_owner: 'deterministic_harness';
  };
};

export type TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket@v1';
  node_id: 'topic-selection.v1b.assess-topic-value.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bN8ValueAssessmentSlotId;
  invocation_slot_id: string;
  prompt_variant_key: string;
  context_family: 'v1b_n8_topic_value_assessment';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bN8HarnessFrozenInputPayload;
  n7_to_n8_projection_ref: TopicSelectionFunctionalRef;
  n7_to_n8_projection_hash: string;
  n7_to_n8_projection: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
  required_structure_manifest: TopicSelectionV1bN8RequiredStructureManifest;
  decision_memory_packet_ref: TopicSelectionFunctionalRef | null;
  decision_memory_packet_hash: string | null;
  decision_memory: ResolvedTopicSelectionDecisionMemoryPacket['packet'] | null;
};

export type TopicSelectionV1bN8RuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
};

export type TopicSelectionV1bN8RuntimeCompressionAttempt = {
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  estimated_input_tokens_after_override?: number | null;
};

export type GenerateTopicSelectionV1bN8RuntimeDraftInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  runtime_token_budget_overrides?: TopicSelectionV1bN8RuntimeTokenBudgetOverrides | null;
  compression_attempt?: TopicSelectionV1bN8RuntimeCompressionAttempt | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN8RuntimeDraftGenerationResult =
  | {
    status: 'succeeded';
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    structured_output: TopicSelectionV1bTopicValueAssessmentDraftPayload;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicValueAssessmentDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicValueAssessmentDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

const NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;
const PROMPT_VARIANT_KEY = 'n8_value_assessment_draft.initial_from_n7' as const;

export class TopicSelectionV1bN8ValueAssessmentRuntimeService {
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

  /**
   * T-123 Phase 3 (STEP 5 reuse seam) — resolve the shared v1b N8 runtime context (frozen
   * payload, N7→N8 projection, decision memory, source hashes, required-structure manifest)
   * that BOTH the single-agent draft path and the bounded-debate roles consume, so the two
   * paths share ONE implementation of the (complex, heavily-validated) resolution (DMP-10).
   * Behavior-preserving: generateDraftArtifact / buildAdmissionExpectedIdentity call it with
   * the exact same computations in the same order they used inline before.
   */
  async resolveSharedN8RuntimeContext(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    frozenPayloadOverride?: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): Promise<{
    frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload;
    projection: { ref: TopicSelectionFunctionalRef; hash: string; payload: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection };
    decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
    sourceHashes: Record<string, string>;
    requiredStructureManifest: TopicSelectionV1bN8RequiredStructureManifest;
  }> {
    const frozenPayload = frozenPayloadOverride ?? this.assertN8FrozenPayload(request);
    const projection = await this.resolveN7ToN8Projection(request, frozenPayload);
    const decisionMemory = await this.resolveDecisionMemoryPacket(request);
    const sourceHashes = this.sourceHashes(request, frozenPayload, projection.hash, projection.payload, decisionMemory?.hash ?? null);
    const requiredStructureManifest = this.requiredStructureManifest(sourceHashes);
    return { frozenPayload, projection, decisionMemory, sourceHashes, requiredStructureManifest };
  }

  // NOTE (STEP 7): the bounded-debate strategy reuses resolveSharedN8RuntimeContext (above) for
  // the expensive N7→N8 projection / decision-memory / source-hash / manifest resolution, and builds
  // its OWN sourceRefs inline (like v1c N2's debate runtime). The debate path's requiredCompressionFacts
  // (= the single-agent base facts + critic_finding/critic_resolution_map from prior-role artifacts)
  // is a DEFERRED STEP-7 obligation: the shipped debate runtime passes compression_attempt: null (the
  // single-agent default when no compression is requested) and exposes no compression input, so the
  // fact builder is not yet wired — see the V1bN8DebateStrategy header in the debate runtime. Per-version
  // source-refs/fact builders are NOT shared — only the debate executor core and the costly resolution
  // are (DMP-10). No premature wrapper seams are exposed here.

  async generateDraftArtifact(
    input: GenerateTopicSelectionV1bN8RuntimeDraftInput,
  ): Promise<TopicSelectionV1bN8RuntimeDraftGenerationResult> {
    const binding = this.slotBinding();
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const { frozenPayload, projection, decisionMemory, sourceHashes, requiredStructureManifest } =
      await this.resolveSharedN8RuntimeContext(input.request);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      requiredStructureManifest,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      projection,
      requiredStructureManifest,
      decisionMemory,
    });
    this.assertRequiredStructureManifest(contextPacket);
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
    const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload>({
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
      runtime_token_budget: this.runtimeTokenBudget({
        runtimeProfile,
        runtimeInvocationContextHash,
        contextPacket,
        compressionAttempt: input.compression_attempt ?? null,
        overrides: input.runtime_token_budget_overrides ?? null,
      }),
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
    frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): Promise<TopicSelectionV1bN8ValueAssessmentAdmissionExpectedIdentity> {
    const binding = this.slotBinding();
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N8 value draft profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N8 value draft first slice does not allow provider model options.');
    }
    const { projection, decisionMemory, sourceHashes, requiredStructureManifest } =
      await this.resolveSharedN8RuntimeContext(input.request, input.frozenPayload);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      requiredStructureManifest,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload: input.frozenPayload,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      projection,
      requiredStructureManifest,
      decisionMemory,
    });
    this.assertRequiredStructureManifest(contextPacket);
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
      run_mode: input.runMode,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      normalized_payload_hash: input.normalizedPayloadHash,
    };
  }

  private async recordSemanticDraftArtifact(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    binding: N8RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    structuredOutput: TopicSelectionV1bTopicValueAssessmentDraftPayload;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bTopicValueAssessmentDraftPayload>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    createdBy: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
  }): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N8 value draft requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N8 runtime value draft structured output hash drift detected.');
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
    frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload;
    binding: N8RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    projection: {
      ref: TopicSelectionFunctionalRef;
      hash: string;
      payload: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
    };
    requiredStructureManifest: TopicSelectionV1bN8RequiredStructureManifest;
    decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
  }): TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      prompt_variant_key: input.binding.prompt_variant_key,
      context_family: 'v1b_n8_topic_value_assessment',
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload, input.projection.payload, input.projection.ref),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
      n7_to_n8_projection_ref: input.projection.ref,
      n7_to_n8_projection_hash: input.projection.hash,
      n7_to_n8_projection: input.projection.payload,
      required_structure_manifest: input.requiredStructureManifest,
      decision_memory_packet_ref: input.decisionMemory?.ref ?? null,
      decision_memory_packet_hash: input.decisionMemory?.hash ?? null,
      decision_memory: input.decisionMemory?.packet ?? null,
    };
  }

  private messages(
    binding: N8RuntimeSlotBinding,
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Generate a non-authority topic value assessment draft for v1b N8.',
          'Use only the supplied refs, hashes, context packet, and required structure manifest.',
          'Do not create TopicValueAssessment, N8ToN9 handoff, N8ToN7 feedback, route decisions, trial ledger changes, candidate changes, package, recheck, or authority records.',
          'Do not override deterministic N8 gates, feedback boundaries, executable prompts, or ref/hash lineage.',
          'Return only JSON matching TopicValueAssessmentDraft@v1.',
        ].join(' ') + (contextPacket.decision_memory
          ? ' context_packet.decision_memory lists this title card\'s historical negative decisions (rejections, parks, drops, accepted risks); ground the negative_memory_check dimension and reviewer-risk reasoning in these entries and cite conflicts in risk_notes.'
          : ''),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          slot_id: binding.slot_id,
          prompt_variant_key: binding.prompt_variant_key,
          context_packet: contextPacket,
          output_boundary: 'model_draft_before_deterministic_value_gate',
        }),
      },
    ];
  }

  private runtimeTokenBudget(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket;
    compressionAttempt: TopicSelectionV1bN8RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1bN8RuntimeTokenBudgetOverrides | null;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const compressionAttempt = this.runtimeCompressionAttempt({
      runtimeProfile: input.runtimeProfile,
      contextPacket: input.contextPacket,
      compressionAttempt: input.compressionAttempt,
      overrides: input.overrides,
    });
    return {
      context_policy_profile: input.runtimeProfile.profile,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      context_payloads: [input.contextPacket],
      compression_attempt: compressionAttempt,
      estimated_input_tokens_override: input.overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: input.overrides?.schema_overhead_tokens_override,
    };
  }

  private runtimeCompressionAttempt(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket;
    compressionAttempt: TopicSelectionV1bN8RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1bN8RuntimeTokenBudgetOverrides | null;
  }): TopicSelectionAgentRuntimeCompressionAttemptInput | null {
    const shouldBuildAttempt = Boolean(input.compressionAttempt)
      || input.overrides?.estimated_input_tokens_after_compression_override !== undefined;
    if (!shouldBuildAttempt) {
      return null;
    }
    const requiredPreservedFacts = this.requiredCompressionFacts(input.contextPacket);
    const defaultAttempt = this.defaultRuntimeCompressionAttempt(input.contextPacket, requiredPreservedFacts);
    const attempt = input.compressionAttempt;
    return {
      compression_report_ref: attempt?.compression_report_ref ?? null,
      source_refs: input.contextPacket.source_refs,
      input_context: input.contextPacket,
      compressed_context: attempt?.compressed_context ?? defaultAttempt.compressed_context,
      summary: attempt?.summary ?? defaultAttempt.summary,
      // F-10 normalization: the default executor kind comes from the profile's compression policy
      // (SSOT, allowed_executor_kinds primary) rather than a hardcoded literal — byte-identical today
      // (every profile declares deterministic_structural primary) but now profile-configurable.
      compression_executor_kind: attempt?.compression_executor_kind
        ?? input.runtimeProfile.profile.compression_policy.allowed_executor_kinds[0]
        ?? 'deterministic_structural',
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
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket,
    requiredPreservedFacts: TopicSelectionCompressionFactInventory,
  ): Pick<TopicSelectionAgentRuntimeCompressionAttemptInput, 'compressed_context' | 'summary'> {
    return {
      compressed_context: {
        schema_version: 'TopicSelectionV1bN8CompressedRuntimeContext@v1',
        node_id: contextPacket.node_id,
        workflow_run_id: contextPacket.workflow_run_id,
        node_attempt_id: contextPacket.node_attempt_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        source_context_packet_hash: this.hash(contextPacket),
        source_refs: contextPacket.source_refs,
        source_hashes: contextPacket.source_hashes,
        n7_to_n8_projection_ref: contextPacket.n7_to_n8_projection_ref,
        n7_to_n8_projection_hash: contextPacket.n7_to_n8_projection_hash,
        frozen_input_payload: contextPacket.frozen_input_payload,
        required_structure_manifest: contextPacket.required_structure_manifest,
        required_preserved_facts: requiredPreservedFacts,
      },
      summary: {
        schema_version: 'TopicSelectionV1bN8CompressionSummary@v1',
        node_id: contextPacket.node_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        preserved_fact_kinds: contextPacket.required_structure_manifest.preserved_fact_kinds,
        route_gate_semantics: contextPacket.required_structure_manifest.route_gate_semantics,
      },
    };
  }

  private requiredCompressionFacts(
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const sourceHashes = contextPacket.source_hashes;
    const projection = contextPacket.n7_to_n8_projection;
    const requiredFacts: TopicSelectionCompressionFactInventory = {
      blocker: this.factIds(sourceHashes.n8_debate_admission_hash),
      residual_risk: this.factIds(sourceHashes.topic_question_contract_hash),
      accepted_risk: this.factIds(sourceHashes.topic_question_contract_hash),
      recheck_hint: this.factIds(sourceHashes.projection_preserved_fact_kinds_hash),
      n7_handoff: this.factIds(sourceHashes.n7_handoff_hash),
      n7_to_n8_projection: this.factIds(sourceHashes.n7_to_n8_projection_hash),
      topic_question: this.factIds(sourceHashes.topic_question_hash),
      topic_question_contract: this.factIds(sourceHashes.topic_question_contract_hash),
      active_candidate_identity: this.factIds(sourceHashes.active_candidate_hash),
      answerability_plan: this.factIds(sourceHashes.answerability_plan_hash),
      trial_ledger: this.factIds(sourceHashes.trial_ledger_hash),
      selected_slice_identity: this.factIds(sourceHashes.selected_research_slice_hash),
      candidate_set_identity: this.factIds(sourceHashes.topic_question_candidate_set_hash),
      value_rationale: this.factIds(sourceHashes.projection_support_hashes_hash),
      support_quality: this.factIds(sourceHashes.projection_support_hashes_hash),
      reviewer_uncertainty: this.factIds(sourceHashes.projection_support_hashes_hash),
      risk_gap_blocker_fact: this.factIds(sourceHashes.projection_preserved_fact_kinds_hash),
      feedback_recheck_hint: this.factIds(sourceHashes.projection_preserved_fact_kinds_hash),
    };
    if (sourceHashes.candidate_grouping_hash) {
      requiredFacts.candidate_grouping = this.factIds(sourceHashes.candidate_grouping_hash);
    }
    for (const [supportKind, supportHash] of Object.entries(projection.support_hashes)) {
      if (typeof supportHash === 'string' && supportHash.trim().length > 0) {
        requiredFacts[`n7_support_${supportKind}`] = this.factIds(supportHash);
      }
    }
    return Object.fromEntries(
      Object.entries(requiredFacts)
        .map(([factKind, factIds]) => [factKind, this.uniqueStrings(factIds ?? [])] as const)
        .filter(([, factIds]) => factIds.length > 0),
    );
  }

  private factIds(...values: Array<string | null | undefined>): string[] {
    return this.uniqueStrings(values.filter((value): value is string => Boolean(value?.trim())));
  }

  private sourceHashes(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
    projectionHash: string,
    projection: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
    decisionMemoryPacketHash: string | null,
  ): Record<string, string> {
    const sourceHashes: Record<string, string> = {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
      n7_handoff_hash: payload.n7_handoff_hash,
      n7_to_n8_projection_hash: projectionHash,
      topic_question_hash: payload.topic_question_hash,
      topic_question_contract_hash: payload.topic_question_contract_hash,
      answerability_plan_hash: payload.answerability_plan_hash,
      trial_ledger_hash: payload.trial_ledger_hash,
      topic_question_candidate_set_hash: payload.topic_question_candidate_set_hash,
      active_candidate_hash: payload.active_candidate_hash,
      selected_research_slice_hash: payload.selected_research_slice_hash,
      n8_debate_admission_hash: payload.n8_debate_admission_hash,
      projection_source_hashes_hash: this.hash(projection.source_hashes),
      projection_support_hashes_hash: this.hash(projection.support_hashes),
      projection_preserved_fact_kinds_hash: this.hash(projection.preserved_fact_kinds),
    };
    if (payload.candidate_grouping_hash) {
      sourceHashes.candidate_grouping_hash = payload.candidate_grouping_hash;
    }
    if (decisionMemoryPacketHash) {
      sourceHashes.decision_memory_packet_hash = decisionMemoryPacketHash;
    }
    return sourceHashes;
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN8HarnessFrozenInputPayload,
    projection: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
    projectionRef: TopicSelectionFunctionalRef,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      projectionRef,
      ...projection.source_refs,
      ...projection.support_refs,
      projection.n7_handoff_ref,
      payload.topic_question_ref,
      payload.topic_question_contract_ref,
      payload.answerability_plan_ref,
      payload.trial_ledger_ref,
      payload.topic_question_candidate_set_ref,
      payload.active_candidate_ref,
      payload.selected_research_slice_ref,
      payload.n8_debate_admission_ref,
      payload.candidate_grouping_ref,
    ]);
  }

  private requiredStructureManifest(
    sourceHashes: Record<string, string>,
  ): TopicSelectionV1bN8RequiredStructureManifest {
    return {
      schema_version: 'TopicSelectionV1bN8RequiredStructureManifest@v1',
      manifest_purpose: 'runtime_compression_and_admission_self_check',
      required_paths: [
        'frozen_input_payload.n7_handoff_hash',
        'frozen_input_payload.topic_question_ref',
        'frozen_input_payload.topic_question_hash',
        'frozen_input_payload.topic_question_contract_ref',
        'frozen_input_payload.topic_question_contract_hash',
        'frozen_input_payload.answerability_plan_ref',
        'frozen_input_payload.answerability_plan_hash',
        'frozen_input_payload.trial_ledger_ref',
        'frozen_input_payload.trial_ledger_hash',
        'frozen_input_payload.active_candidate_ref',
        'frozen_input_payload.active_candidate_hash',
        'n7_to_n8_projection.n7_handoff_ref',
        'n7_to_n8_projection.n7_handoff_hash',
        'n7_to_n8_projection.topic_question_contract_ref',
        'n7_to_n8_projection.topic_question_contract_hash',
        'n7_to_n8_projection.answerability_plan_ref',
        'n7_to_n8_projection.answerability_plan_hash',
        'n7_to_n8_projection.trial_ledger_ref',
        'n7_to_n8_projection.trial_ledger_hash',
        'n7_to_n8_projection.active_candidate_ref',
        'n7_to_n8_projection.active_candidate_hash',
        'source_hashes.n7_to_n8_projection_hash',
        'source_hashes.trial_ledger_hash',
      ],
      required_source_hashes: sourceHashes,
      preserved_fact_kinds: [
        'n7_handoff',
        'n7_to_n8_projection',
        'topic_question',
        'topic_question_contract',
        'active_candidate_identity',
        'answerability_plan',
        'trial_ledger',
        'value_rationale',
        'support_quality',
        'reviewer_uncertainty',
        'risk_gap_blocker_fact',
        'feedback_recheck_hint',
      ],
      forbidden_authority_fields: [
        'topic_value_assessment_ref',
        'topic_value_assessment_hash',
        'value_reasoning_memo_ref',
        'value_reasoning_memo_hash',
        'n8_to_n9_handoff',
        'n8_to_n7_feedback',
        'created_authority_refs',
        'trial_ledger_update',
        'candidate_mutation',
      ],
      route_gate_semantics: {
        runtime_output_authority: 'non_authority_model_draft_for_gate',
        deterministic_gate_required: true,
        feedback_generation_owner: 'deterministic_harness',
      },
    };
  }

  private assertRequiredStructureManifest(
    contextPacket: TopicSelectionV1bN8ValueAssessmentRuntimeContextPacket,
  ): void {
    const manifest = contextPacket.required_structure_manifest;
    for (const requiredPath of manifest.required_paths) {
      if (!this.hasPath(contextPacket, requiredPath)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `N8 compressed/runtime context missing required structure path: ${requiredPath}.`);
      }
    }
    const actualSourceHashes = contextPacket.source_hashes;
    const requiredKeys = Object.keys(manifest.required_source_hashes).sort();
    const actualKeys = Object.keys(actualSourceHashes).sort();
    if (
      requiredKeys.length !== actualKeys.length
      || !requiredKeys.every((key, index) => actualKeys[index] === key && actualSourceHashes[key] === manifest.required_source_hashes[key])
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N8 compressed/runtime context source hashes drift from required structure manifest.');
    }
    const forbiddenPath = this.findForbiddenAuthorityField(contextPacket, manifest.forbidden_authority_fields);
    if (forbiddenPath) {
      throw new AppError(400, 'INVALID_PAYLOAD', `N8 runtime context contains forbidden authority field: ${forbiddenPath}.`);
    }
    if (
      contextPacket.non_authority !== true
      || contextPacket.n7_to_n8_projection.non_authority !== true
      || contextPacket.n7_to_n8_projection.context_authority !== 'non_authority_runtime_context'
      || contextPacket.n7_to_n8_projection.route_decision !== 'invoke_next'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N8 runtime context must remain non-authority invoke-next context.');
    }
  }

  private runtimeInvocationContextHash(
    binding: N8RuntimeSlotBinding,
    sourceHashes: Record<string, string>,
    manifest: TopicSelectionV1bN8RequiredStructureManifest,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n8_topic_value_assessment',
        scenario_case_id: 'initial_from_n7',
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'initial',
        loop_stage: 'n8_initial_from_n7',
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
      required_structure_manifest_hash: this.hash(manifest),
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

  private async resolveDecisionMemoryPacket(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): Promise<ResolvedTopicSelectionDecisionMemoryPacket | null> {
    return resolveDecisionMemoryPacketFromSourceRefs({
      sourceRefs: request.frozen_input.source_refs,
      getArtifactRef: (refId) => this.controlPlane.getArtifactRef(refId),
      expectedTitleCardId: request.title_card_id ?? null,
    });
  }

  private async resolveN7ToN8Projection(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): Promise<{
    ref: TopicSelectionFunctionalRef;
    hash: string;
    payload: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
  }> {
    let resolved: {
      ref: TopicSelectionFunctionalRef;
      hash: string;
      payload: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
    } | null = null;
    for (const sourceRef of request.frozen_input.source_refs) {
      if (sourceRef.ref_type !== 'artifact_ref') {
        continue;
      }
      const artifact = await this.controlPlane.getArtifactRef(sourceRef.ref_id);
      if (
        !this.isRecord(artifact?.payload)
        || artifact.payload.projection_kind !== 'v1b_n7_to_n8_topic_question_contract_context'
      ) {
        continue;
      }
      if (resolved) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N8 value assessment accepts exactly one N7-to-N8 runtime context projection artifact.');
      }
      const projectionHash = this.hash(artifact.payload);
      if (!artifact.checksum || artifact.checksum !== projectionHash) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N8 N7-to-N8 projection checksum is missing or drifted.');
      }
      const projection = this.n7ToN8ProjectionPayload(artifact.payload);
      this.assertN7ToN8ProjectionPolicy(request, projection, frozenPayload);
      resolved = {
        ref: sourceRef,
        hash: projectionHash,
        payload: projection,
      };
    }
    if (!resolved) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N8 value assessment requires exactly one N7-to-N8 runtime context projection artifact.');
    }
    return resolved;
  }

  private assertN7ToN8ProjectionPolicy(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    projection: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
    frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload,
  ): void {
    if (
      projection.non_authority !== true
      || projection.context_authority !== 'non_authority_runtime_context'
      || projection.route_decision !== 'invoke_next'
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection must remain non-authority invoke-next context.');
    }
    const requestSourceRefKeys = new Set(request.frozen_input.source_refs.map((sourceRef) => this.refKey(sourceRef)));
    if (!requestSourceRefKeys.has(this.refKey(projection.n7_handoff_ref))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection N7 handoff ref is not frozen in the N8 input source refs.');
    }
    if (
      projection.n7_handoff_hash !== frozenPayload.n7_handoff_hash
      || projection.topic_question_hash !== frozenPayload.topic_question_hash
      || projection.topic_question_contract_hash !== frozenPayload.topic_question_contract_hash
      || projection.answerability_plan_hash !== frozenPayload.answerability_plan_hash
      || projection.trial_ledger_hash !== frozenPayload.trial_ledger_hash
      || projection.topic_question_candidate_set_hash !== frozenPayload.topic_question_candidate_set_hash
      || projection.active_candidate_hash !== frozenPayload.active_candidate_hash
      || projection.selected_research_slice_hash !== frozenPayload.selected_research_slice_hash
      || projection.n8_debate_admission_hash !== frozenPayload.n8_debate_admission_hash
      || (projection.candidate_grouping_hash ?? null) !== (frozenPayload.candidate_grouping_hash ?? null)
      || !this.sameRefObject(projection.topic_question_ref, frozenPayload.topic_question_ref)
      || !this.sameRefObject(projection.topic_question_contract_ref, frozenPayload.topic_question_contract_ref)
      || !this.sameRefObject(projection.answerability_plan_ref, frozenPayload.answerability_plan_ref)
      || !this.sameRefObject(projection.trial_ledger_ref, frozenPayload.trial_ledger_ref)
      || !this.sameRefObject(projection.topic_question_candidate_set_ref, frozenPayload.topic_question_candidate_set_ref)
      || !this.sameRefObject(projection.active_candidate_ref, frozenPayload.active_candidate_ref)
      || !this.sameRefObject(projection.selected_research_slice_ref, frozenPayload.selected_research_slice_ref)
      || !this.sameRefObject(projection.n8_debate_admission_ref, frozenPayload.n8_debate_admission_ref)
      || !this.nullableRefsEqual(projection.candidate_grouping_ref, frozenPayload.candidate_grouping_ref)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection source hashes drift from frozen N8 lineage.');
    }
    if (
      !this.hasExactHashKeys(projection.source_hashes, [
        'frozen_input_hash',
        'n6_handoff_hash',
        'n7_handoff_hash',
        'topic_question_hash',
        'topic_question_contract_hash',
        'answerability_plan_hash',
        'trial_ledger_hash',
        'topic_question_candidate_set_hash',
        'active_candidate_hash',
        'selected_research_slice_hash',
        'n8_debate_admission_hash',
      ], projection.candidate_grouping_hash ? ['candidate_grouping_hash'] : [])
      || projection.source_hashes.n7_handoff_hash !== frozenPayload.n7_handoff_hash
      || projection.source_hashes.topic_question_hash !== frozenPayload.topic_question_hash
      || projection.source_hashes.topic_question_contract_hash !== frozenPayload.topic_question_contract_hash
      || projection.source_hashes.answerability_plan_hash !== frozenPayload.answerability_plan_hash
      || projection.source_hashes.trial_ledger_hash !== frozenPayload.trial_ledger_hash
      || projection.source_hashes.topic_question_candidate_set_hash !== frozenPayload.topic_question_candidate_set_hash
      || projection.source_hashes.active_candidate_hash !== frozenPayload.active_candidate_hash
      || projection.source_hashes.selected_research_slice_hash !== frozenPayload.selected_research_slice_hash
      || projection.source_hashes.n8_debate_admission_hash !== frozenPayload.n8_debate_admission_hash
      || (projection.candidate_grouping_hash && projection.source_hashes.candidate_grouping_hash !== projection.candidate_grouping_hash)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection source hash map drifts from frozen N8 lineage.');
    }
    const sourceRefKeys = new Set(projection.source_refs.map((sourceRef) => this.refKey(sourceRef)));
    const requiredRefs = [
      projection.n7_handoff_ref,
      projection.topic_question_ref,
      projection.topic_question_contract_ref,
      projection.answerability_plan_ref,
      projection.trial_ledger_ref,
      projection.topic_question_candidate_set_ref,
      projection.active_candidate_ref,
      projection.selected_research_slice_ref,
      projection.n8_debate_admission_ref,
    ];
    if (requiredRefs.some((requiredRef) => !sourceRefKeys.has(this.refKey(requiredRef)))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection does not preserve required N8 lineage refs.');
    }
    if (
      !projection.preserved_fact_kinds.includes('topic_question_contract')
      || !projection.preserved_fact_kinds.includes('answerability_plan')
      || !projection.preserved_fact_kinds.includes('trial_ledger')
      || !projection.preserved_fact_kinds.includes('risk_gap_recheck_hints')
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection dropped required N8 preserved fact kinds.');
    }
  }

  private n7ToN8ProjectionPayload(
    value: Record<string, unknown>,
  ): TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection {
    if (
      value.schema_version !== 'TopicSelectionV1bN7RuntimeContextProjection@v1'
      || value.projection_kind !== 'v1b_n7_to_n8_topic_question_contract_context'
      || value.node_id !== 'topic-selection.v1b.materialize-topic-question-contract.v1'
      || value.route_decision !== 'invoke_next'
      || value.non_authority !== true
      || value.context_cache_scope !== 'process_local_runtime_only'
      || value.context_authority !== 'non_authority_runtime_context'
      || !Array.isArray(value.source_refs)
      || !this.isRecord(value.source_hashes)
      || !Array.isArray(value.support_refs)
      || !this.isRecord(value.support_hashes)
      || !this.isStringArray(value.preserved_fact_kinds)
      || !this.isFunctionalRefValue(value.n7_handoff_ref)
      || !this.isHash(value.n7_handoff_hash)
      || !this.isFunctionalRefValue(value.topic_question_ref)
      || !this.isHash(value.topic_question_hash)
      || !this.isFunctionalRefValue(value.topic_question_contract_ref)
      || !this.isHash(value.topic_question_contract_hash)
      || !this.isFunctionalRefValue(value.answerability_plan_ref)
      || !this.isHash(value.answerability_plan_hash)
      || !this.isFunctionalRefValue(value.trial_ledger_ref)
      || !this.isHash(value.trial_ledger_hash)
      || !this.isFunctionalRefValue(value.topic_question_candidate_set_ref)
      || !this.isHash(value.topic_question_candidate_set_hash)
      || !this.isFunctionalRefValue(value.active_candidate_ref)
      || !this.isHash(value.active_candidate_hash)
      || !this.isFunctionalRefValue(value.selected_research_slice_ref)
      || !this.isHash(value.selected_research_slice_hash)
      || !this.isFunctionalRefValue(value.n8_debate_admission_ref)
      || !this.isHash(value.n8_debate_admission_hash)
      || !this.isNullableFunctionalRefValue(value.candidate_grouping_ref)
      || !this.isNullableHash(value.candidate_grouping_hash)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N7-to-N8 projection payload is malformed.');
    }
    return value as unknown as TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
  }

  private resolveRuntimeProfile(binding: N8RuntimeSlotBinding): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: N8RuntimeSlotBinding,
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

  private slotBinding(): N8RuntimeSlotBinding {
    const slot = this.slotPolicy();
    return {
      slot_id: 'n8_value_assessment_draft',
      invocation_slot_id: TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS.value_assessment_draft,
      context_policy_profile_id: TOPIC_SELECTION_V1B_N8_CONTEXT_RUNTIME_PROFILE_IDS.value_assessment_draft,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: 'topic-selection.v1b.n8.topic-value-assessment.runtime-draft',
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      prompt_variant_key: PROMPT_VARIANT_KEY,
      schema: topicSelectionV1bTopicValueAssessmentDraftPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private slotPolicy() {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
      .find((item) => item.node_id === NODE_ID);
    const slot = policy?.semantic_support_slots.find((item) => item.slot_id === 'n8_value_assessment_draft');
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported v1b N8 value assessment slot.');
    }
    return slot;
  }

  private assertN8FrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): TopicSelectionV1bN8HarnessFrozenInputPayload {
    if (request.node_id !== NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N8 value runtime requires the v1b N8 node id.');
    }
    const payload = request.frozen_input.payload as Partial<TopicSelectionV1bN8HarnessFrozenInputPayload>;
    if (
      !this.isHash(payload.n7_handoff_hash)
      || !this.isFunctionalRefValue(payload.topic_question_ref)
      || !this.isHash(payload.topic_question_hash)
      || !this.isFunctionalRefValue(payload.topic_question_contract_ref)
      || !this.isHash(payload.topic_question_contract_hash)
      || !this.isFunctionalRefValue(payload.answerability_plan_ref)
      || !this.isHash(payload.answerability_plan_hash)
      || !this.isFunctionalRefValue(payload.trial_ledger_ref)
      || !this.isHash(payload.trial_ledger_hash)
      || !this.isFunctionalRefValue(payload.topic_question_candidate_set_ref)
      || !this.isHash(payload.topic_question_candidate_set_hash)
      || !this.isFunctionalRefValue(payload.active_candidate_ref)
      || !this.isHash(payload.active_candidate_hash)
      || !this.isFunctionalRefValue(payload.selected_research_slice_ref)
      || !this.isHash(payload.selected_research_slice_hash)
      || !this.isFunctionalRefValue(payload.n8_debate_admission_ref)
      || !this.isHash(payload.n8_debate_admission_hash)
      || !this.isNullableFunctionalRefValue(payload.candidate_grouping_ref)
      || !this.isNullableHash(payload.candidate_grouping_hash)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N8 value runtime requires a frozen N7-to-N8 handoff payload.');
    }
    return payload as TopicSelectionV1bN8HarnessFrozenInputPayload;
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

  private requiredChecksum(artifact: TopicSelectionArtifactRefRecord | null, label: string): string {
    if (!artifact?.checksum) {
      throw new AppError(500, 'INTERNAL_ERROR', `${label} checksum is required.`);
    }
    return artifact.checksum;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private uniqueRefs(refs: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
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
      version_id: ref.version_id ?? null,
      title_card_id: ref.title_card_id ?? null,
    });
  }

  private sameRefObject(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private nullableRefsEqual(
    left: TopicSelectionFunctionalRef | null,
    right: TopicSelectionFunctionalRef | null,
  ): boolean {
    return left === null && right === null
      ? true
      : Boolean(left && right && this.sameRefObject(left, right));
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

  private hasPath(value: unknown, path: string): boolean {
    let current: unknown = value;
    for (const segment of path.split('.')) {
      if (!this.isRecord(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
        return false;
      }
      current = current[segment];
    }
    return current !== undefined;
  }

  private findForbiddenAuthorityField(
    value: unknown,
    forbiddenFields: string[],
    path: string[] = [],
  ): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const found = this.findForbiddenAuthorityField(item, forbiddenFields, [...path, String(index)]);
        if (found) return found;
      }
      return null;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = [...path, key];
      if (forbiddenFields.includes(key)) {
        return childPath.join('.');
      }
      const found = this.findForbiddenAuthorityField(child, forbiddenFields, childPath);
      if (found) return found;
    }
    return null;
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

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
  }

  private isFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef {
    return this.isRecord(value)
      && typeof value.ref_type === 'string'
      && typeof value.ref_id === 'string'
      && (value.title_card_id === null || value.title_card_id === undefined || typeof value.title_card_id === 'string')
      && (value.version_id === null || value.version_id === undefined || typeof value.version_id === 'string');
  }

  private isNullableFunctionalRefValue(value: unknown): value is TopicSelectionFunctionalRef | null {
    return value === null || this.isFunctionalRefValue(value);
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
