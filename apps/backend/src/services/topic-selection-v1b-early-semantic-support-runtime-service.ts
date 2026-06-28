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
  type TopicSelectionV1bAcceptedConstraintProfilePayload,
  type TopicSelectionV1bAcceptedSliceSelectionPayload,
  type TopicSelectionV1bN2HarnessFrozenInputPayload,
  type TopicSelectionV1bN3HarnessFrozenInputPayload,
  type TopicSelectionV1bN5HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessNodeId,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  topicSelectionV1bAcceptedConstraintProfilePayloadSchema,
  topicSelectionV1bAcceptedSliceSelectionPayloadSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS,
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
  TopicSelectionV1bEarlySemanticSupportAdmissionExpectedIdentity,
  TopicSelectionV1bEarlySemanticSupportSlotId,
} from './topic-selection-v1b-early-semantic-support-admission-service.js';

export type TopicSelectionV1bIntakeReadinessClassificationSupportPayload = {
  schema_version: 'IntakeReadinessClassificationSupport@v1';
  readiness_recommendation: 'ready' | 'needs_refinement' | 'blocked';
  blocker_codes: string[];
  warning_codes: string[];
  loopback_target_code: 'n3_snapshot_refresh' | 'n3_profile_repair' | null;
  cited_refs: TopicSelectionFunctionalRef[];
  rationale: string;
  no_authority_write_confirmed: true;
};

export type TopicSelectionV1bEarlySemanticSupportPayload =
  | TopicSelectionV1bAcceptedConstraintProfilePayload
  | TopicSelectionV1bIntakeReadinessClassificationSupportPayload
  | TopicSelectionV1bAcceptedSliceSelectionPayload;

type TopicSelectionV1bEarlyFrozenPayload =
  | TopicSelectionV1bN2HarnessFrozenInputPayload
  | TopicSelectionV1bN3HarnessFrozenInputPayload
  | TopicSelectionV1bN5HarnessFrozenInputPayload;

type EarlyRuntimeSlotBinding = {
  slot_id: TopicSelectionV1bEarlySemanticSupportSlotId;
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  context_family:
    | 'v1b_constraint_profile_context'
    | 'v1b_intake_readiness_context'
    | 'v1b_slice_selection_context';
  allowed_effect: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef['allowed_effect'];
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  schema: Record<string, unknown>;
};

export type TopicSelectionV1bEarlySemanticRuntimeContextPacket = {
  schema_version: 'TopicSelectionV1bEarlySemanticRuntimeContextPacket@v1';
  node_id: TopicSelectionV1bWorkflowHarnessNodeId;
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: TopicSelectionV1bEarlySemanticSupportSlotId;
  invocation_slot_id: string;
  context_family: EarlyRuntimeSlotBinding['context_family'];
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  frozen_input_payload: TopicSelectionV1bEarlyFrozenPayload;
};

export type GenerateTopicSelectionV1bEarlySemanticSupportInput<T extends TopicSelectionV1bEarlySemanticSupportPayload> = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  slot_id: TopicSelectionV1bEarlySemanticSupportSlotId;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<T> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<T> | null;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bEarlySemanticSupportGenerationResult<T extends TopicSelectionV1bEarlySemanticSupportPayload> =
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

const PROMPT_TEMPLATE_VERSION = 'v1' as const;

const intakeReadinessClassificationSupportPayloadSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'readiness_recommendation',
    'blocker_codes',
    'warning_codes',
    'loopback_target_code',
    'cited_refs',
    'rationale',
    'no_authority_write_confirmed',
  ],
  properties: {
    schema_version: { const: 'IntakeReadinessClassificationSupport@v1' },
    readiness_recommendation: { enum: ['ready', 'needs_refinement', 'blocked'] },
    blocker_codes: { type: 'array', items: { type: 'string' } },
    warning_codes: { type: 'array', items: { type: 'string' } },
    loopback_target_code: { enum: ['n3_snapshot_refresh', 'n3_profile_repair', null] },
    cited_refs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['ref_type', 'ref_id'],
        properties: {
          ref_type: { type: 'string' },
          ref_id: { type: 'string' },
          title_card_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          version_id: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
      },
    },
    rationale: { type: 'string' },
    no_authority_write_confirmed: { const: true },
  },
} as const;

// Per-slot product-grade system prompt content (T-128 W-05). The three early-semantic-support slots
// (N2 constraint-profile / N3 intake-readiness / N5 slice-selection) share one runtime constructor but
// emit DIFFERENT support payloads, so the role + per-field contract + context refs branch on slot_id
// while the non-authority / no-mutate / no-override / JSON-only safety lines stay shared verbatim. All
// three are commentary-only over an ALREADY-accepted authority artifact — they never write or re-decide
// it. Exported as a pure function so the prompt body is drift-anchored directly in the unit test.
export function buildV1bEarlySemanticSupportSystemContent(
  slotId: TopicSelectionV1bEarlySemanticSupportSlotId,
): string {
  const slotLines = slotId === 'n2_constraint_profile_semantic_support'
    ? [
        'You are the N2 non-authority constraint-profile semantic-support reviewer; the ResearchConstraintProfile is already accepted by the authority provider, so produce commentary-only structured support and never the profile itself.',
        'Restate the accepted target_community and claim_ceiling faithfully from accepted_constraint_profile_payload; give method_constraints, resource_constraints, available_assets, and non_goals as ref-grounded string arrays; keep feasibility_budget and constraint_payload keys traceable to the cited source.',
        'Ground every field in the supplied intake_snapshot, v1a_bundle, accepted_constraint_profile_payload, and any delegation_artifact or previous_profile refs.',
      ]
    : slotId === 'n3_readiness_classification'
      ? [
          'You are the N3 intake-readiness classification support analyst over the accepted profile and intake snapshot; you classify readiness and never write the IntakeReadinessAssessment.',
          'Set readiness_recommendation to ready, needs_refinement, or blocked; populate blocker_codes only when blocked and warning_codes for soft gaps; set loopback_target_code to n3_snapshot_refresh, n3_profile_repair, or null, keeping it null when ready; cite every supporting ref in cited_refs and confirm no_authority_write_confirmed.',
          'Ground the classification in the supplied intake snapshot, constraint profile, and N3 handoff refs.',
        ]
      : [
          'You are the N5 slice-selection decision support reviewer mirroring an already-accepted ResearchSliceSelectionDecision; you reflect the decision and never re-decide it.',
          'Set decision to select, request_more_options, park, or reject to match accepted_selection_payload; on select set selected_option_ref and selected_option_hash and null the loopback fields; on request_more_options set a loopback_target with a non-empty loopback_reason_code; give rejected_option_reasons with a valid reason_code, carry accepted_risk_refs, and set requires_human_review with an honest human_review_reason.',
          'Ground the decision in the supplied research_slice_option_set, N4 handoff, accepted_selection_payload, selected_option, and accepted_risk_refs.',
        ];
  return [
    ...slotLines,
    'Use only the supplied refs, hashes, and context packet.',
    'Do not create or mutate ResearchConstraintProfile, IntakeReadinessAssessment, ResearchSliceSelectionDecision, ResearchSlice, option sets, topic questions, packages, or bridges.',
    'Do not override deterministic gates, route policy, executable prompts, or ref/hash lineage.',
    'Return only JSON matching the requested support output contract.',
  ].join(' ');
}

export class TopicSelectionV1bEarlySemanticSupportRuntimeService {
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

  async generateSupportArtifact<T extends TopicSelectionV1bEarlySemanticSupportPayload>(
    input: GenerateTopicSelectionV1bEarlySemanticSupportInput<T>,
  ): Promise<TopicSelectionV1bEarlySemanticSupportGenerationResult<T>> {
    const binding = this.slotBinding(input.slot_id);
    const frozenPayload = this.assertFrozenPayload(input.request, binding);
    const runMode = input.run_mode ?? input.request.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload, binding);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes);
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
    slotId: TopicSelectionV1bEarlySemanticSupportSlotId;
    normalizedPayloadHash: string;
    executionMode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
    runMode: TopicSelectionAgentRunMode;
    profileId: string;
    modelOptionId: string | null;
  }): TopicSelectionV1bEarlySemanticSupportAdmissionExpectedIdentity {
    const binding = this.slotBinding(input.slotId);
    if (input.profileId !== binding.model_profile_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b early semantic support profile does not match runtime slot binding.');
    }
    if (input.modelOptionId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b early semantic support runtime does not allow provider model options.');
    }
    const frozenPayload = this.assertFrozenPayload(input.request, binding);
    const sourceHashes = this.sourceHashes(input.request, frozenPayload, binding);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes);
    const contextPacket = this.buildContextPacket({
      request: input.request,
      frozenPayload,
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
      allowed_effect: binding.allowed_effect,
      output_contract: binding.output_contract,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: binding.invocation_slot_id,
      prompt_packet_hash: promptPacket.identity.prompt_packet_hash,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      run_mode: input.runMode,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      normalized_payload_hash: input.normalizedPayloadHash,
    };
  }

  private async recordSemanticSupportArtifact<T extends TopicSelectionV1bEarlySemanticSupportPayload>(
    input: {
      request: TopicSelectionV1bWorkflowHarnessRunRequest;
      binding: EarlyRuntimeSlotBinding;
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
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified early semantic support requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'v1b early semantic support structured output hash drift detected.');
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
      node_id: input.binding.node_id,
      execution_mode: input.executionMode,
      run_mode: input.runMode,
      allowed_effect: input.binding.allowed_effect,
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
    frozenPayload: TopicSelectionV1bEarlyFrozenPayload;
    binding: EarlyRuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): TopicSelectionV1bEarlySemanticRuntimeContextPacket {
    return {
      schema_version: 'TopicSelectionV1bEarlySemanticRuntimeContextPacket@v1',
      node_id: input.binding.node_id,
      workflow_run_id: input.request.workflow_run_id,
      node_attempt_id: input.request.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      context_family: input.binding.context_family,
      policy_version: input.request.policy_version,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.sourceRefs(input.request, input.frozenPayload, input.binding),
      source_hashes: input.sourceHashes,
      frozen_input_payload: input.frozenPayload,
    };
  }

  private messages(
    binding: EarlyRuntimeSlotBinding,
    contextPacket: TopicSelectionV1bEarlySemanticRuntimeContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1bEarlySemanticSupportSystemContent(binding.slot_id),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          slot_id: binding.slot_id,
          context_packet: contextPacket,
          output_boundary: binding.allowed_effect,
        }),
      },
    ];
  }

  private sourceHashes(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bEarlyFrozenPayload,
    binding: EarlyRuntimeSlotBinding,
  ): Record<string, string> {
    const base = {
      frozen_input_hash: request.frozen_input.frozen_input_hash ?? this.hash(request.frozen_input),
    };
    if (binding.slot_id === 'n2_constraint_profile_semantic_support') {
      const value = payload as TopicSelectionV1bN2HarnessFrozenInputPayload;
      const sourceHashes: Record<string, string> = {
        ...base,
        intake_snapshot_hash: value.intake_snapshot_hash,
        v1a_bundle_hash: value.v1a_bundle_hash,
        accepted_constraint_profile_payload_hash: value.accepted_constraint_profile_payload_hash,
      };
      if (value.delegation_artifact_hash) {
        sourceHashes.delegation_artifact_hash = value.delegation_artifact_hash;
      }
      if (value.previous_profile_hash) {
        sourceHashes.previous_profile_hash = value.previous_profile_hash;
      }
      return sourceHashes;
    }
    if (binding.slot_id === 'n3_readiness_classification') {
      const value = payload as TopicSelectionV1bN3HarnessFrozenInputPayload;
      return {
        ...base,
        intake_snapshot_hash: value.intake_snapshot_hash,
        constraint_profile_hash: value.constraint_profile_hash,
        n2_handoff_hash: value.n2_handoff_hash,
      };
    }
    const value = payload as TopicSelectionV1bN5HarnessFrozenInputPayload;
    const sourceHashes: Record<string, string> = {
      ...base,
      research_slice_option_set_hash: value.research_slice_option_set_hash,
      n4_handoff_hash: value.n4_handoff_hash,
      accepted_selection_payload_hash: value.accepted_selection_payload_hash,
    };
    if (value.delegation_artifact_hash) {
      sourceHashes.delegation_artifact_hash = value.delegation_artifact_hash;
    }
    if (value.accepted_selection_payload.selected_option_hash) {
      sourceHashes.selected_option_hash = value.accepted_selection_payload.selected_option_hash;
    }
    if (value.accepted_selection_payload.loopback_target) {
      sourceHashes.loopback_target_hash = this.hash(value.accepted_selection_payload.loopback_target);
    }
    return sourceHashes;
  }

  private sourceRefs(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    payload: TopicSelectionV1bEarlyFrozenPayload,
    binding: EarlyRuntimeSlotBinding,
  ): TopicSelectionFunctionalRef[] {
    if (binding.slot_id === 'n2_constraint_profile_semantic_support') {
      const value = payload as TopicSelectionV1bN2HarnessFrozenInputPayload;
      return this.uniqueRefs([
        ...request.frozen_input.source_refs,
        value.intake_snapshot_ref,
        value.v1a_bundle_ref,
        value.previous_profile_ref,
      ]);
    }
    if (binding.slot_id === 'n3_readiness_classification') {
      const value = payload as TopicSelectionV1bN3HarnessFrozenInputPayload;
      return this.uniqueRefs([
        ...request.frozen_input.source_refs,
        value.intake_snapshot_ref,
        value.constraint_profile_ref,
      ]);
    }
    const value = payload as TopicSelectionV1bN5HarnessFrozenInputPayload;
    return this.uniqueRefs([
      ...request.frozen_input.source_refs,
      value.research_slice_option_set_ref,
      value.accepted_selection_payload.selected_option_ref,
      value.accepted_selection_payload.loopback_target_ref,
      ...value.accepted_selection_payload.accepted_risk_refs,
    ]);
  }

  private runtimeInvocationContextHash(
    binding: EarlyRuntimeSlotBinding,
    sourceHashes: Record<string, string>,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: binding.context_family,
        scenario_case_id: binding.slot_id,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'initial',
        loop_stage: binding.slot_id,
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

  private resolveRuntimeProfile(binding: EarlyRuntimeSlotBinding): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: binding.context_policy_profile_id,
      invocation_slot_id: binding.invocation_slot_id,
    });
  }

  private resolveModelProfile(
    binding: EarlyRuntimeSlotBinding,
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

  private slotBinding(slotId: TopicSelectionV1bEarlySemanticSupportSlotId): EarlyRuntimeSlotBinding {
    const slot = this.slotPolicy(slotId);
    if (slotId === 'n2_constraint_profile_semantic_support') {
      return {
        slot_id: slotId,
        node_id: slot.node_id,
        invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.constraint_profile_support,
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.constraint_profile_support,
        context_family: 'v1b_constraint_profile_context',
        allowed_effect: slot.allowed_effect,
        output_contract: slot.output_contract,
        model_profile_id: slot.default_profile_id,
        prompt_template_id: 'topic-selection.v1b.n2.constraint-profile.runtime-support',
        prompt_template_version: PROMPT_TEMPLATE_VERSION,
        schema: topicSelectionV1bAcceptedConstraintProfilePayloadSchema as unknown as Record<string, unknown>,
      };
    }
    if (slotId === 'n3_readiness_classification') {
      return {
        slot_id: slotId,
        node_id: slot.node_id,
        invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.intake_readiness_support,
        context_policy_profile_id:
          TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.intake_readiness_support,
        context_family: 'v1b_intake_readiness_context',
        allowed_effect: slot.allowed_effect,
        output_contract: slot.output_contract,
        model_profile_id: slot.default_profile_id,
        prompt_template_id: 'topic-selection.v1b.n3.intake-readiness.runtime-support',
        prompt_template_version: PROMPT_TEMPLATE_VERSION,
        schema: intakeReadinessClassificationSupportPayloadSchema as unknown as Record<string, unknown>,
      };
    }
    return {
      slot_id: slotId,
      node_id: slot.node_id,
      invocation_slot_id: TOPIC_SELECTION_V1B_EARLY_SEMANTIC_INVOCATION_SLOT_IDS.slice_selection_support,
      context_policy_profile_id:
        TOPIC_SELECTION_V1B_EARLY_SEMANTIC_CONTEXT_RUNTIME_PROFILE_IDS.slice_selection_support,
      context_family: 'v1b_slice_selection_context',
      allowed_effect: slot.allowed_effect,
      output_contract: slot.output_contract,
      model_profile_id: slot.default_profile_id,
      prompt_template_id: 'topic-selection.v1b.n5.slice-selection.runtime-support',
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      schema: topicSelectionV1bAcceptedSliceSelectionPayloadSchema as unknown as Record<string, unknown>,
    };
  }

  private slotPolicy(slotId: TopicSelectionV1bEarlySemanticSupportSlotId) {
    for (const policy of TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES) {
      const slot = policy.semantic_support_slots.find((item) => item.slot_id === slotId);
      if (slot) {
        return slot;
      }
    }
    throw new AppError(400, 'INVALID_PAYLOAD', `Unsupported v1b early semantic support slot: ${slotId}.`);
  }

  private assertFrozenPayload(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    binding: EarlyRuntimeSlotBinding,
  ): TopicSelectionV1bEarlyFrozenPayload {
    if (request.node_id !== binding.node_id) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'v1b early semantic support runtime node_id does not match slot binding.');
    }
    const payload = request.frozen_input.payload as Partial<TopicSelectionV1bEarlyFrozenPayload>;
    if (binding.slot_id === 'n2_constraint_profile_semantic_support') {
      const value = payload as Partial<TopicSelectionV1bN2HarnessFrozenInputPayload>;
      if (
        !value.intake_snapshot_ref
        || !value.intake_snapshot_hash
        || !value.v1a_bundle_ref
        || !value.v1a_bundle_hash
        || !value.accepted_constraint_profile_payload
        || !value.accepted_constraint_profile_payload_hash
      ) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N2 early semantic runtime requires a complete N2 frozen payload.');
      }
      return value as TopicSelectionV1bN2HarnessFrozenInputPayload;
    }
    if (binding.slot_id === 'n3_readiness_classification') {
      const value = payload as Partial<TopicSelectionV1bN3HarnessFrozenInputPayload>;
      if (
        !value.intake_snapshot_ref
        || !value.intake_snapshot_hash
        || !value.constraint_profile_ref
        || !value.constraint_profile_hash
        || !value.n2_handoff_hash
      ) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'N3 early semantic runtime requires a complete N3 frozen payload.');
      }
      return value as TopicSelectionV1bN3HarnessFrozenInputPayload;
    }
    const value = payload as Partial<TopicSelectionV1bN5HarnessFrozenInputPayload>;
    if (
      !value.research_slice_option_set_ref
      || !value.research_slice_option_set_hash
      || !value.n4_handoff_hash
      || !value.accepted_selection_payload
      || !value.accepted_selection_payload_hash
    ) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N5 early semantic runtime requires a complete N5 frozen payload.');
    }
    return value as TopicSelectionV1bN5HarnessFrozenInputPayload;
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
