import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceRoleBundle,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
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
import type {
  TopicSelectionV1bResearchSlicePlanningInput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-intake-contracts';
import {
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES,
  type TopicSelectionV1bN4HarnessFrozenInputPayload,
  type TopicSelectionV1bResearchSliceOptionSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS,
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
import {
  TopicSelectionPromptPacketRuntimeService,
} from './topic-selection-prompt-packet-runtime-service.js';
import type {
  TopicSelectionCompressionFactInventory,
} from './topic-selection-compression-runtime-service.js';
import type {
  TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity,
  TopicSelectionV1bN4ResearchSliceSlotId,
} from './topic-selection-v1b-n4-research-slice-admission-service.js';

type N4RuntimeSlotBinding = {
  slot_id: TopicSelectionV1bN4ResearchSliceSlotId;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;
  schema: Record<string, unknown>;
};

export type TopicSelectionV1bN4RequiredStructureManifest = {
  schema_version: 'TopicSelectionV1bN4RequiredStructureManifest@v1';
  manifest_purpose: 'runtime_compression_and_admission_self_check';
  required_paths: string[];
  required_source_hashes: Record<string, string>;
  preserved_fact_kinds: string[];
  forbidden_authority_fields: string[];
  route_gate_semantics: {
    runtime_output_authority: 'non_authority_model_draft_for_gate';
    deterministic_gate_required: true;
    option_materialization_owner: 'deterministic_harness';
  };
};

export type TopicSelectionV1bN4ResearchSliceRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bN4ResearchSliceRuntimeContextPacket@v1';
  node_id: 'topic-selection.v1b.generate-research-slice-options.v1';
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bN4ResearchSliceSlotId;
  invocation_slot_id: string;
  prompt_variant_key: string;
  context_family: 'v1b_n4_research_slice_option_generation';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bN4HarnessFrozenInputPayload;
  planning_input: TopicSelectionV1bResearchSlicePlanningInput;
  required_structure_manifest: TopicSelectionV1bN4RequiredStructureManifest;
};

export type TopicSelectionV1bN4RuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
};

export type TopicSelectionV1bN4RuntimeCompressionAttempt = {
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  estimated_input_tokens_after_override?: number | null;
};

export type GenerateTopicSelectionV1bN4RuntimeDraftInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  planning_input: TopicSelectionV1bResearchSlicePlanningInput;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  runtime_token_budget_overrides?: TopicSelectionV1bN4RuntimeTokenBudgetOverrides | null;
  compression_attempt?: TopicSelectionV1bN4RuntimeCompressionAttempt | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bResearchSliceOptionSetDraftPayload> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1bResearchSliceOptionSetDraftPayload> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN4RuntimeDraftGenerationResult =
  | {
    status: 'succeeded';
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    structured_output: TopicSelectionV1bResearchSliceOptionSetDraftPayload;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bResearchSliceOptionSetDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1bResearchSliceOptionSetDraftPayload>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

const NODE_ID = 'topic-selection.v1b.generate-research-slice-options.v1' as const;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;
const PROMPT_VARIANT_KEY = 'n4_research_slice_option_draft.initial_from_n3' as const;

// Product-grade N4 research-slice option-set draft system prompt (T-128 W-05). N4 has a single
// dedicated slot, so this is a no-branch builder; it is exported as a pure function so the prompt body
// is drift-anchored directly in the unit test. The output is a NON-AUTHORITY comparative option set —
// a deterministic gate + human reviewer select among the options downstream; it never writes authority.
export function buildV1bN4ResearchSliceSystemContent(): string {
  return [
    'You are drafting a non-authority comparative research-slice option set for v1b N4: propose multiple distinct, executable research slices that satisfy the validated need within the stated constraints, for a downstream deterministic gate and human reviewer to select among.',
    'Use only the supplied refs, hashes, planning input, context packet, and required structure manifest.',
    'Emit options (at least one), each a self-contained slice with an option_key, slice_statement, problem_space, target_setting, target_community, included_boundaries and excluded_boundaries, contribution_type_candidate, role-specific support/challenge/baseline/context evidence refs, expected_claim and fallback_claim, observable_success_criteria, baseline_risk/execution_risk/scope_risk (low, medium, high, or unknown), and claim_ceiling_alignment.status with a rationale; set requires_human_review with its human_review_triggers and a confidence (which may be null) per option.',
    'Set recommended_option_key to one option_key or null when there is no clear winner; give comparison_axes and a comparison_summary of how the options differ; list missing_option_types, unresolved_disagreements, and top-level human_review_triggers.',
    'Cite only refs present in context_packet.source_refs; every evidence ref must be a supplied ref and you must not invent refs or hashes; respect context_packet.planning_input.non_goals and context_packet.planning_input.claim_ceiling as hard ceilings.',
    "Every option's source_validated_need_refs must include context_packet.planning_input.validated_need_ref; keep both included_boundaries and excluded_boundaries non-empty; echo context_packet.planning_input.target_community rather than drifting to a new community; keep each claim_ceiling_alignment.status off exceeds; and restate every context_packet.planning_input.non_goal inside excluded_boundaries.",
    'Do not create ResearchSliceOptionSet, ResearchSliceOption, PlanResearchSliceRun, N4ToN5 handoff, selection decisions, packages, rechecks, or authority records.',
    'Do not override deterministic N4 gates, executable prompts, frozen input lineage, claim ceiling, non-goals, or evidence boundaries.',
    'Return only JSON matching ResearchSliceOptionSetDraft@v1.',
  ].join(' ');
}

export class TopicSelectionV1bN4ResearchSliceRuntimeService {
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
    input: GenerateTopicSelectionV1bN4RuntimeDraftInput,
  ): Promise<TopicSelectionV1bN4RuntimeDraftGenerationResult> {
    const frozenPayload = this.assertN4FrozenPayload(input.request);
    this.assertPlanningInput(input.planning_input, frozenPayload);
    const binding = this.slotBinding();
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload, input.planning_input);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const requiredStructureManifest = this.requiredStructureManifest(sourceHashes);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      requiredStructureManifest,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
      planningInput: input.planning_input,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      requiredStructureManifest,
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
    const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1bResearchSliceOptionSetDraftPayload>({
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

  buildAdmissionExpectedIdentity(input: {
    request: TopicSelectionV1bWorkflowHarnessRunRequest;
    frozenPayload: TopicSelectionV1bN4HarnessFrozenInputPayload;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): TopicSelectionV1bN4ResearchSliceAdmissionExpectedIdentity {
    const binding = this.slotBinding();
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N4 research-slice draft profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b N4 research-slice draft first slice does not allow provider model options.');
    }
    this.assertPlanningInput(input.planningInput, input.frozenPayload);
    const sourceHashes = this.sourceHashes(input.request, input.frozenPayload, input.planningInput);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const requiredStructureManifest = this.requiredStructureManifest(sourceHashes);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(
      binding,
      sourceHashes,
      requiredStructureManifest,
    );
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload: input.frozenPayload,
      planningInput: input.planningInput,
      binding,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
      requiredStructureManifest,
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
    binding: N4RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    structuredOutput: TopicSelectionV1bResearchSliceOptionSetDraftPayload;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bResearchSliceOptionSetDraftPayload>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    createdBy: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
  }): Promise<TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N4 research-slice draft requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N4 runtime research-slice draft structured output hash drift detected.');
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
    frozenPayload: TopicSelectionV1bN4HarnessFrozenInputPayload;
    planningInput: TopicSelectionV1bResearchSlicePlanningInput;
    binding: N4RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    requiredStructureManifest: TopicSelectionV1bN4RequiredStructureManifest;
  }): TopicSelectionV1bN4ResearchSliceRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bN4ResearchSliceRuntimeContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      prompt_variant_key: input.binding.prompt_variant_key,
      context_family: 'v1b_n4_research_slice_option_generation',
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload, input.planningInput),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
      planning_input: input.planningInput,
      required_structure_manifest: input.requiredStructureManifest,
    };
  }

  private messages(
    binding: N4RuntimeSlotBinding,
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1bN4ResearchSliceSystemContent(),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          slot_id: binding.slot_id,
          prompt_variant_key: binding.prompt_variant_key,
          context_packet: contextPacket,
          output_boundary: 'model_draft_before_deterministic_research_slice_gate',
        }),
      },
    ];
  }

  private runtimeTokenBudget(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket;
    compressionAttempt: TopicSelectionV1bN4RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1bN4RuntimeTokenBudgetOverrides | null;
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
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket;
    compressionAttempt: TopicSelectionV1bN4RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1bN4RuntimeTokenBudgetOverrides | null;
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
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket,
    requiredPreservedFacts: TopicSelectionCompressionFactInventory,
  ): Pick<TopicSelectionAgentRuntimeCompressionAttemptInput, 'compressed_context' | 'summary'> {
    return {
      compressed_context: {
        schema_version: 'TopicSelectionV1bN4CompressedRuntimeContext@v1',
        node_id: contextPacket.node_id,
        workflow_run_id: contextPacket.workflow_run_id,
        node_attempt_id: contextPacket.node_attempt_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        source_context_packet_hash: this.hash(contextPacket),
        source_refs: contextPacket.source_refs,
        source_hashes: contextPacket.source_hashes,
        frozen_input_payload: contextPacket.frozen_input_payload,
        planning_input: contextPacket.planning_input,
        required_structure_manifest: contextPacket.required_structure_manifest,
        required_preserved_facts: requiredPreservedFacts,
      },
      summary: {
        schema_version: 'TopicSelectionV1bN4CompressionSummary@v1',
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
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const sourceHashes = contextPacket.source_hashes;
    const requiredFacts: TopicSelectionCompressionFactInventory = {
      n3_handoff: this.factIds(sourceHashes.n3_handoff_hash),
      intake_snapshot_identity: this.factIds(sourceHashes.intake_snapshot_hash),
      constraint_profile: this.factIds(sourceHashes.constraint_profile_hash, sourceHashes.constraint_digest_hash),
      intake_readiness: this.factIds(sourceHashes.intake_readiness_hash),
      validated_need: this.factIds(sourceHashes.validated_need_ref_hash),
      evidence_role_bundle: this.factIds(sourceHashes.evidence_role_bundle_hash),
      evidence_ref: this.factIds(sourceHashes.evidence_refs_hash),
      claim_ceiling: this.factIds(sourceHashes.claim_ceiling_hash),
      non_goal: this.factIds(sourceHashes.non_goals_hash),
      accepted_risk: this.factIds(sourceHashes.accepted_risk_refs_hash),
      risk_gap_blocker_fact: this.factIds(sourceHashes.gap_codes_hash, sourceHashes.recheck_request_refs_hash),
      recheck_hint: this.factIds(sourceHashes.recheck_request_refs_hash),
      memory_suggestion: this.factIds(sourceHashes.memory_suggestion_refs_hash),
      source_health_warning: this.factIds(sourceHashes.handoff_payload_hash),
      planning_input: this.factIds(sourceHashes.planning_input_hash),
    };
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
    payload: TopicSelectionV1bN4HarnessFrozenInputPayload,
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
  ): Record<string, string> {
    return {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
      intake_snapshot_hash: payload.intake_snapshot_hash,
      constraint_profile_hash: payload.constraint_profile_hash,
      intake_readiness_hash: payload.intake_readiness_hash,
      n2_handoff_hash: payload.n2_handoff_hash,
      n3_handoff_hash: payload.n3_handoff_hash,
      planning_input_hash: this.hash(planningInput),
      evidence_role_bundle_hash: this.hash(planningInput.evidence_role_bundle),
      evidence_refs_hash: this.hash(this.evidenceRoleBundleRefs(planningInput.evidence_role_bundle)),
      validated_need_ref_hash: this.hash(planningInput.validated_need_ref),
      constraint_digest_hash: this.hash({
        target_community: planningInput.target_community,
        target_venue_class: planningInput.target_venue_class,
        intended_contribution_style: planningInput.intended_contribution_style,
        method_constraints: planningInput.method_constraints,
        resource_constraints: planningInput.resource_constraints,
        available_assets: planningInput.available_assets,
        feasibility_budget: planningInput.feasibility_budget,
      }),
      claim_ceiling_hash: this.hash(planningInput.claim_ceiling),
      non_goals_hash: this.hash(planningInput.non_goals),
      accepted_risk_refs_hash: this.hash(planningInput.accepted_risk_refs),
      gap_codes_hash: this.hash(planningInput.gap_codes),
      memory_suggestion_refs_hash: this.hash(planningInput.memory_suggestion_refs),
      recheck_request_refs_hash: this.hash(planningInput.recheck_request_refs),
      handoff_payload_hash: this.hash(planningInput.handoff_payload),
    };
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bN4HarnessFrozenInputPayload,
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      payload.intake_snapshot_ref,
      payload.constraint_profile_ref,
      payload.intake_readiness_ref,
      planningInput.v1b_input_bundle_ref,
      planningInput.v1b_intake_snapshot_ref,
      planningInput.research_constraint_profile_ref,
      planningInput.readiness_assessment_ref,
      planningInput.validated_need_ref,
      planningInput.evidence_map_ref,
      planningInput.search_run_ref,
      planningInput.search_plan_ref,
      planningInput.literature_snapshot_ref,
      ...this.evidenceRoleBundleRefs(planningInput.evidence_role_bundle),
      ...planningInput.accepted_risk_refs,
      ...planningInput.memory_suggestion_refs,
      ...planningInput.recheck_request_refs,
    ]);
  }

  private requiredStructureManifest(
    sourceHashes: Record<string, string>,
  ): TopicSelectionV1bN4RequiredStructureManifest {
    return {
      schema_version: 'TopicSelectionV1bN4RequiredStructureManifest@v1',
      manifest_purpose: 'runtime_compression_and_admission_self_check',
      required_paths: [
        'frozen_input_payload.intake_snapshot_ref',
        'frozen_input_payload.intake_snapshot_hash',
        'frozen_input_payload.constraint_profile_ref',
        'frozen_input_payload.constraint_profile_hash',
        'frozen_input_payload.intake_readiness_ref',
        'frozen_input_payload.intake_readiness_hash',
        'frozen_input_payload.n2_handoff_hash',
        'frozen_input_payload.n3_handoff_hash',
        'planning_input.validated_need_ref',
        'planning_input.evidence_role_bundle',
        'planning_input.target_community',
        'planning_input.non_goals',
        'planning_input.claim_ceiling',
        'source_hashes.n3_handoff_hash',
        'source_hashes.planning_input_hash',
        'source_hashes.evidence_refs_hash',
      ],
      required_source_hashes: sourceHashes,
      preserved_fact_kinds: [
        'n3_handoff',
        'intake_snapshot_identity',
        'constraint_profile',
        'intake_readiness',
        'validated_need',
        'evidence_role_bundle',
        'evidence_ref',
        'claim_ceiling',
        'non_goal',
        'accepted_risk',
        'risk_gap_blocker_fact',
        'recheck_hint',
        'memory_suggestion',
        'source_health_warning',
        'planning_input',
      ],
      forbidden_authority_fields: [
        'research_slice_option_set_id',
        'research_slice_option_id',
        'plan_research_slice_run_id',
        'research_slice_option_set_ref',
        'research_slice_option_set_hash',
        'n4_to_n5_handoff',
        'created_authority_refs',
        'selected_option_ref',
        'selection_decision_ref',
      ],
      route_gate_semantics: {
        runtime_output_authority: 'non_authority_model_draft_for_gate',
        deterministic_gate_required: true,
        option_materialization_owner: 'deterministic_harness',
      },
    };
  }

  private assertRequiredStructureManifest(
    contextPacket: TopicSelectionV1bN4ResearchSliceRuntimeContextPacket,
  ): void {
    const manifest = contextPacket.required_structure_manifest;
    for (const requiredPath of manifest.required_paths) {
      if (!this.hasPath(contextPacket, requiredPath)) {
        throw new AppError(400, 'INVALID_PAYLOAD', `N4 compressed/runtime context missing required structure path: ${requiredPath}.`);
      }
    }
    const actualSourceHashes = contextPacket.source_hashes;
    const requiredKeys = Object.keys(manifest.required_source_hashes).sort();
    const actualKeys = Object.keys(actualSourceHashes).sort();
    if (
      requiredKeys.length !== actualKeys.length
      || !requiredKeys.every((key, index) =>
        actualKeys[index] === key && actualSourceHashes[key] === manifest.required_source_hashes[key]
      )
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 compressed/runtime context source hashes drift from required structure manifest.');
    }
    const forbiddenPath = this.findForbiddenAuthorityField(contextPacket, manifest.forbidden_authority_fields);
    if (forbiddenPath) {
      throw new AppError(400, 'INVALID_PAYLOAD', `N4 runtime context contains forbidden authority field: ${forbiddenPath}.`);
    }
    if (contextPacket.non_authority !== true) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 runtime context must remain non-authority.');
    }
  }

  private runtimeInvocationContextHash(
    binding: N4RuntimeSlotBinding,
    sourceHashes: Record<string, string>,
    manifest: TopicSelectionV1bN4RequiredStructureManifest,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n4_research_slice_option_generation',
        scenario_case_id: 'initial_from_n3',
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'initial',
        loop_stage: 'n4_initial_from_n3',
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
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: binding.model_profile_id,
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: null,
    });
  }

  private slotBinding(): N4RuntimeSlotBinding {
    const slot = this.slotPolicy();
    return {
      slot_id: 'n4_research_slice_option_draft',
      invocation_slot_id: TOPIC_SELECTION_V1B_N4_INVOCATION_SLOT_IDS.research_slice_option_draft,
      context_policy_profile_id: TOPIC_SELECTION_V1B_N4_CONTEXT_RUNTIME_PROFILE_IDS.research_slice_option_draft,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: 'topic-selection.v1b.n4.research-slice-options.runtime-draft',
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      prompt_variant_key: PROMPT_VARIANT_KEY,
      schema: topicSelectionV1bResearchSliceOptionSetDraftPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private slotPolicy() {
    const policy = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES
      .find((item) => item.node_id === NODE_ID);
    const slot = policy?.semantic_support_slots.find((item) =>
      item.slot_id === 'n4_research_slice_option_draft'
    );
    if (!slot) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Unsupported v1b N4 research-slice draft slot.');
    }
    return slot;
  }

  private assertN4FrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
  ): TopicSelectionV1bN4HarnessFrozenInputPayload {
    if (request.node_id !== NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 research-slice runtime requires the v1b N4 node id.');
    }
    const payload = request.frozen_input.payload as Partial<TopicSelectionV1bN4HarnessFrozenInputPayload>;
    if (
      !payload.intake_snapshot_ref
      || !payload.intake_snapshot_hash
      || !payload.constraint_profile_ref
      || !payload.constraint_profile_hash
      || !payload.intake_readiness_ref
      || !payload.intake_readiness_hash
      || !payload.n2_handoff_hash
      || !payload.n3_handoff_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 research-slice runtime requires frozen N1/N2/N3 lineage.');
    }
    return payload as TopicSelectionV1bN4HarnessFrozenInputPayload;
  }

  private assertPlanningInput(
    planningInput: TopicSelectionV1bResearchSlicePlanningInput,
    frozenPayload: TopicSelectionV1bN4HarnessFrozenInputPayload,
  ): void {
    if (
      !this.refsEqual(planningInput.v1b_intake_snapshot_ref, frozenPayload.intake_snapshot_ref)
      || !this.refsEqual(planningInput.research_constraint_profile_ref, frozenPayload.constraint_profile_ref)
      || !this.refsEqual(planningInput.readiness_assessment_ref, frozenPayload.intake_readiness_ref)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 planning input refs do not match frozen N4 input lineage.');
    }
    if (
      !planningInput.validated_need_ref
      || !planningInput.evidence_role_bundle
      || !planningInput.target_community
      || !planningInput.claim_ceiling
      || !Array.isArray(planningInput.non_goals)
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N4 planning input is missing required slice-planning facts.');
    }
  }

  private defaultRunMode(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionAgentRunMode {
    return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
  }

  private evidenceRoleBundleRefs(bundle: TopicSelectionEvidenceRoleBundle): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...bundle.support_unit_refs,
      ...bundle.challenge_unit_refs,
      ...bundle.baseline_unit_refs,
      ...bundle.context_unit_refs,
    ]);
  }

  private hasPath(value: unknown, path: string): boolean {
    let cursor: unknown = value;
    for (const part of path.split('.')) {
      if (!this.isRecord(cursor) || !(part in cursor)) {
        return false;
      }
      cursor = cursor[part];
      if (cursor === null || cursor === undefined) {
        return false;
      }
    }
    return true;
  }

  private findForbiddenAuthorityField(value: unknown, fieldNames: string[], path = ''): string | null {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = this.findForbiddenAuthorityField(value[index], fieldNames, `${path}[${index}]`);
        if (found) {
          return found;
        }
      }
      return null;
    }
    if (!this.isRecord(value)) {
      return null;
    }
    for (const [key, item] of Object.entries(value)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (fieldNames.includes(key) && item !== null && item !== undefined) {
        return currentPath;
      }
      const found = this.findForbiddenAuthorityField(item, fieldNames, currentPath);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private toArtifactFunctionalRef(record: TopicSelectionArtifactRefRecord): TopicSelectionArtifactFunctionalRef {
    return {
      ref_type: 'artifact_ref',
      ref_id: record.artifact_ref_id,
      title_card_id: record.title_card_id ?? null,
      version_id: null,
    };
  }

  private requiredChecksum(record: TopicSelectionArtifactRefRecord | null, label: string): string {
    if (!record?.checksum) {
      throw new AppError(500, 'INTERNAL_ERROR', `${label} checksum is required.`);
    }
    return record.checksum;
  }

  private uniqueRefs(
    refs: Array<TopicSelectionFunctionalRef | null | undefined>,
  ): TopicSelectionFunctionalRef[] {
    const result: TopicSelectionFunctionalRef[] = [];
    const seen = new Set<string>();
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      const key = [ref.ref_type, ref.ref_id, ref.title_card_id ?? '', ref.version_id ?? ''].join(':');
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(ref);
    }
    return result;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (left.title_card_id ?? null) === (right.title_card_id ?? null);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private hash(value: unknown): string {
    return sha256Text(typeof value === 'string' ? value : stableStringify(value));
  }
}
