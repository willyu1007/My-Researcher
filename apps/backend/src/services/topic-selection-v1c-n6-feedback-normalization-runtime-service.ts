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
  TopicSelectionPaperProjectBridgeHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import {
  topicSelectionV1cDownstreamFeedbackCandidateSchema,
  type TopicSelectionV1cDownstreamFeedbackCandidate,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-downstream-feedback-recheck-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
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
  TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentity,
  TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact,
  TopicSelectionV1cN6FeedbackNormalizationSourceInput,
} from './topic-selection-v1c-n6-feedback-normalization-admission-service.js';

export interface TopicSelectionV1cN6FeedbackNormalizationContextPacket {
  schema_version: 'TopicSelectionV1cN6FeedbackNormalizationContextPacket@v1';
  node_id: typeof NODE_ID;
  workflow_run_id: string;
  node_attempt_id: string;
  slot_id: typeof SLOT_ID;
  invocation_slot_id: typeof SLOT_ID;
  context_family: 'v1c_n6_downstream_feedback_normalization';
  policy_version: string;
  context_policy_profile_id: string;
  context_policy_profile_version: string;
  context_policy_profile_hash: string;
  redaction_policy: typeof TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY;
  non_authority: true;
  record_only: true;
  paper_project_bridge_id: string;
  paper_project_bridge_ref: TopicSelectionFunctionalRef;
  bridge_payload_hash: string;
  working_copy_payload_hash: string;
  source_promotion_decision_ref: TopicSelectionFunctionalRef;
  promotion_commitment_profile_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_ref: TopicSelectionFunctionalRef;
  promotion_input_snapshot_hash: string;
  topic_package_id: string;
  package_version: string;
  downstream_source_kind: string;
  downstream_source_ref: TopicSelectionFunctionalRef;
  source_feedback_refs: TopicSelectionFunctionalRef[];
  observed_blocker_refs: TopicSelectionFunctionalRef[];
  artifact_refs: TopicSelectionFunctionalRef[];
  raw_feedback_text: string;
  raw_feedback_hash: string;
  allowed_refs: TopicSelectionFunctionalRef[];
  source_refs: TopicSelectionFunctionalRef[];
  source_hashes: Record<string, string>;
  no_upstream_mutation_boundary: {
    n6_automation: 'record_only';
    forbidden_workflow_advance: true;
    forbidden_n1_to_n5_loopback_automation: true;
    feedback_recheck_side_effect_owner: 'TopicSelectionV1cDownstreamFeedbackRecheckService';
  };
}

export type TopicSelectionV1cN6RuntimeTokenBudgetOverrides = {
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
  estimated_input_tokens_after_compression_override?: number | null;
};

export type TopicSelectionV1cN6RuntimeCompressionAttempt = {
  compression_report_ref?: TopicSelectionFunctionalRef | null;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  estimated_input_tokens_after_override?: number | null;
};

export interface GenerateTopicSelectionV1cN6FeedbackCandidateInput {
  bridge_handoff: TopicSelectionPaperProjectBridgeHandoff;
  source: TopicSelectionV1cN6FeedbackNormalizationSourceInput;
  workflow_run_id: string;
  node_attempt_id: string;
  policy_version?: string | null;
  execution_mode: TopicSelectionAgentExecutionMode;
  run_mode?: TopicSelectionAgentRunMode | null;
  model_option_id?: string | null;
  runtime_token_budget_overrides?: TopicSelectionV1cN6RuntimeTokenBudgetOverrides | null;
  compression_attempt?: TopicSelectionV1cN6RuntimeCompressionAttempt | null;
  codex_response?: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1cDownstreamFeedbackCandidate> | null;
  mocked_output?: TopicSelectionMockedAgentOutput<TopicSelectionV1cDownstreamFeedbackCandidate> | null;
  created_by?: 'human' | 'llm' | 'system' | 'hybrid';
}

export type TopicSelectionV1cN6FeedbackCandidateGenerationResult =
  | {
    status: 'succeeded';
    candidate_artifact: TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact;
    structured_output: TopicSelectionV1cDownstreamFeedbackCandidate;
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1cDownstreamFeedbackCandidate>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TopicSelectionV1cDownstreamFeedbackCandidate>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

type N6RuntimeSlotBinding = {
  slot_id: typeof SLOT_ID;
  invocation_slot_id: typeof SLOT_ID;
  context_policy_profile_id: typeof TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization;
  output_contract: typeof OUTPUT_CONTRACT;
  model_profile_id: typeof TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID;
  prompt_template_id: typeof PROMPT_TEMPLATE_ID;
  prompt_template_version: typeof PROMPT_TEMPLATE_VERSION;
  schema: Record<string, unknown>;
};

const NODE_ID = TOPIC_SELECTION_V1C_NODE_ID.n6_downstream_feedback_recheck;
const SLOT_ID = TOPIC_SELECTION_V1C_N6_INVOCATION_SLOT_IDS.downstream_feedback_normalization;
const OUTPUT_CONTRACT = 'TopicSelectionV1cDownstreamFeedbackCandidate@v1' as const;
const PROMPT_TEMPLATE_ID = 'topic-selection-v1c-downstream-feedback-normalization' as const;
const PROMPT_TEMPLATE_VERSION = '1' as const;
const DEFAULT_POLICY_VERSION = 'topic-selection-v1c-n6-feedback-normalization-runtime-v1' as const;

export function buildV1cN6FeedbackNormalizationSystemContent(): string {
  return [
    'You are normalizing semi-structured downstream feedback into a single record-only TopicSelectionV1cDownstreamFeedbackCandidate for Topic Selection v1c N6 downstream ingress, so that a deterministic N6 service and a human reviewer can later decide any recheck.',
    'Emit a TopicSelectionV1cDownstreamFeedbackCandidate JSON object: set schema_version exactly as the schema fixes it, preserve paper_project_bridge_id, downstream_source_ref, and bridge/source identity exactly, and set no_upstream_mutation_confirmed to true to affirm record-only ingress.',
    'Set downstream_source_kind to one of paper_project, paper_implementation, writing, research_argument, reviewer_check, or manual, and set severity to one of info, warning, blocking, or critical.',
    'Set feedback_signal to one of stale_evidence, overclaim, unanswerable_question, boundary_drift, need_invalidated, package_narrative_gap, promotion_authorization_gap, bridge_trace_gap, commitment_gap, merge_candidate_conflict, paper_project_constraint_conflict, downstream_mutation_attempt, or no_recheck_needed, choosing the cause that best matches the observed feedback.',
    'Write summary as a faithful normalization of the raw downstream feedback, set required_action to a single action string or null, and copy source_feedback_refs, observed_blocker_refs, artifact_refs, and cited_refs only from the supplied refs, citing only refs present in the context packet and never inventing refs or hashes.',
    'Carry the raw evidence into feedback_payload, and populate normalization_hints with requires_recheck_hint (boolean), loopback_target_hint (a downstream loopback target or null), affected_ref_hint (a supplied ref or null), and reason_codes; these are advisory hints only and never trigger a recheck.',
    'Do not create downstream_topic_feedback, recheck_request, recheck_event, queue items, bridge patches, promotion patches, or workflow automation commands.',
    'N6 is record-only downstream ingress: never advance the workflow and never re-enter N1 through N5 automatically.',
    'Return only JSON matching TopicSelectionV1cDownstreamFeedbackCandidate@v1.',
  ].join(' ');
}

export class TopicSelectionV1cN6FeedbackNormalizationRuntimeService {
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
    input: GenerateTopicSelectionV1cN6FeedbackCandidateInput,
  ): Promise<TopicSelectionV1cN6FeedbackCandidateGenerationResult> {
    this.assertBridgeAndSource(input.bridge_handoff, input.source);
    const binding = this.slotBinding();
    const runMode = input.run_mode ?? this.defaultRunMode(input.execution_mode);
    const sourceHashes = this.sourceHashes(input.bridge_handoff, input.source);
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
      workspace_id: input.bridge_handoff.bridge.workspace_id ?? null,
      title_card_id: input.bridge_handoff.bridge.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: input.workflow_run_id,
      payload: contextPacket as unknown as Record<string, unknown>,
      checksum: contextPacketHash,
      created_by: input.created_by ?? 'system',
    });
    const contextPacketRef = this.toArtifactFunctionalRef(contextArtifact);

    const invocation = await this.agentOrchestrator.invokeStructuredOutput<TopicSelectionV1cDownstreamFeedbackCandidate>({
      workspace_id: input.bridge_handoff.bridge.workspace_id ?? null,
      title_card_id: input.bridge_handoff.bridge.title_card_id,
      node_id: NODE_ID,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      invocation_attempt_id: `${input.node_attempt_id}.${binding.invocation_slot_id}.runtime_candidate`,
      execution_mode: input.execution_mode,
      executor_kind: this.executorKind(input.execution_mode),
      run_mode: runMode,
      profile_id: binding.model_profile_id,
      output_contract: binding.output_contract,
      model_option_id: input.model_option_id ?? null,
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
      runtime_token_budget: this.runtimeTokenBudget({
        runtimeProfile,
        runtimeInvocationContextHash,
        contextPacket,
        compressionAttempt: input.compression_attempt ?? null,
        overrides: input.runtime_token_budget_overrides ?? null,
      }),
      codex_response: input.codex_response ?? null,
      mocked_output: input.mocked_output ?? null,
      created_by: input.created_by ?? 'system',
    });

    if (invocation.status !== 'succeeded' || !invocation.structured_output) {
      return {
        status: 'blocked',
        invocation_result: invocation,
        context_packet_ref: contextPacketRef,
        context_packet_hash: contextPacketHash,
      };
    }

    const candidateArtifact = await this.recordCandidateArtifact({
      input,
      binding,
      runMode,
      structuredOutput: invocation.structured_output,
      invocation,
      runtimeProfile,
      runtimeInvocationContextHash,
      sourceHashes,
    });
    return {
      status: 'succeeded',
      candidate_artifact: candidateArtifact,
      structured_output: invocation.structured_output,
      invocation_result: invocation,
      context_packet_ref: contextPacketRef,
      context_packet_hash: contextPacketHash,
    };
  }

  buildAdmissionExpectedIdentity(input: {
    bridge_handoff: TopicSelectionPaperProjectBridgeHandoff;
    source: TopicSelectionV1cN6FeedbackNormalizationSourceInput;
    workflow_run_id: string;
    node_attempt_id: string;
    policy_version?: string | null;
    execution_mode: TopicSelectionAgentExecutionMode;
    run_mode: TopicSelectionAgentRunMode;
    model_option_id?: string | null;
    normalized_payload_hash: string;
  }): TopicSelectionV1cN6FeedbackNormalizationAdmissionExpectedIdentity {
    const binding = this.slotBinding();
    const sourceHashes = this.sourceHashes(input.bridge_handoff, input.source);
    const runtimeProfile = this.resolveRuntimeProfile(binding);
    const runtimeInvocationContextHash = this.runtimeInvocationContextHash(binding, sourceHashes);
    const contextPacket = this.buildContextPacket({
      input: {
        bridge_handoff: input.bridge_handoff,
        source: input.source,
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
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: input.bridge_handoff.bridge.title_card_id,
      workflow_run_id: input.workflow_run_id,
      node_id: NODE_ID,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: binding.prompt_template_id,
      prompt_template_version: binding.prompt_template_version,
      prompt_variant_key: binding.invocation_slot_id,
      invocation_slot_id: binding.invocation_slot_id,
      runtime_invocation_context_hash: runtimeInvocationContextHash,
      messages: this.messages(binding, contextPacket),
      source_refs: contextPacket.source_refs,
      context_packet_hashes: [this.hash(contextPacket)],
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
    input: GenerateTopicSelectionV1cN6FeedbackCandidateInput;
    binding: N6RuntimeSlotBinding;
    runMode: TopicSelectionAgentRunMode;
    structuredOutput: TopicSelectionV1cDownstreamFeedbackCandidate;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1cDownstreamFeedbackCandidate>;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Promise<TopicSelectionV1cN6FeedbackNormalizationCandidateArtifact> {
    if (!input.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'runtime-verified N6 feedback candidate requires an audit artifact ref.');
    }
    const auditArtifact = await this.controlPlane.getArtifactRef(input.invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, 'runtime audit artifact');
    const outputHash = this.hash(input.structuredOutput);
    if (input.invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', 'N6 feedback candidate structured output hash drift detected.');
    }
    const outputArtifact = await this.controlPlane.recordArtifactRef({
      workspace_id: input.input.bridge_handoff.bridge.workspace_id ?? null,
      title_card_id: input.input.bridge_handoff.bridge.title_card_id,
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
      allowed_effect: 'feedback_candidate_only',
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

  private buildContextPacket(input: {
    input: Pick<GenerateTopicSelectionV1cN6FeedbackCandidateInput, 'bridge_handoff' | 'source' | 'workflow_run_id' | 'node_attempt_id' | 'policy_version'>;
    binding: N6RuntimeSlotBinding;
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): TopicSelectionV1cN6FeedbackNormalizationContextPacket {
    const handoff = input.input.bridge_handoff;
    const source = input.input.source;
    const allowedRefs = this.allowedRefs(handoff, source);
    return {
      schema_version: 'TopicSelectionV1cN6FeedbackNormalizationContextPacket@v1',
      node_id: NODE_ID,
      workflow_run_id: input.input.workflow_run_id,
      node_attempt_id: input.input.node_attempt_id,
      slot_id: input.binding.slot_id,
      invocation_slot_id: input.binding.invocation_slot_id,
      context_family: 'v1c_n6_downstream_feedback_normalization',
      policy_version: input.input.policy_version ?? DEFAULT_POLICY_VERSION,
      context_policy_profile_id: input.runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: input.runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      record_only: true,
      paper_project_bridge_id: handoff.paper_project_bridge_id,
      paper_project_bridge_ref: handoff.paper_project_bridge_ref,
      bridge_payload_hash: handoff.bridge_payload_hash,
      working_copy_payload_hash: handoff.working_copy_payload_hash,
      source_promotion_decision_ref: handoff.source_promotion_decision_ref,
      promotion_commitment_profile_ref: handoff.promotion_commitment_profile_ref,
      promotion_input_snapshot_ref: handoff.promotion_input_snapshot_ref,
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      topic_package_id: handoff.topic_package_id,
      package_version: handoff.package_version,
      downstream_source_kind: source.downstream_source_kind,
      downstream_source_ref: source.downstream_source_ref,
      source_feedback_refs: source.source_feedback_refs ?? [],
      observed_blocker_refs: source.observed_blocker_refs ?? [],
      artifact_refs: source.artifact_refs ?? [],
      raw_feedback_text: source.raw_feedback_text,
      raw_feedback_hash: this.hash(source.raw_feedback_text),
      allowed_refs: allowedRefs,
      source_refs: allowedRefs,
      source_hashes: input.sourceHashes,
      no_upstream_mutation_boundary: {
        n6_automation: 'record_only',
        forbidden_workflow_advance: true,
        forbidden_n1_to_n5_loopback_automation: true,
        feedback_recheck_side_effect_owner: 'TopicSelectionV1cDownstreamFeedbackRecheckService',
      },
    };
  }

  private messages(
    binding: N6RuntimeSlotBinding,
    contextPacket: TopicSelectionV1cN6FeedbackNormalizationContextPacket,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: buildV1cN6FeedbackNormalizationSystemContent(),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: binding.output_contract,
          role_slot: binding.slot_id,
          context_packet: contextPacket,
          output_boundary: 'record_only_candidate_non_authority',
        }),
      },
    ];
  }

  private sourceHashes(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
    source: TopicSelectionV1cN6FeedbackNormalizationSourceInput,
  ): Record<string, string> {
    return {
      bridge_payload_hash: handoff.bridge_payload_hash,
      working_copy_payload_hash: handoff.working_copy_payload_hash,
      promotion_input_snapshot_hash: handoff.promotion_input_snapshot_hash,
      paper_project_bridge_ref_hash: this.hash(handoff.paper_project_bridge_ref),
      source_promotion_decision_ref_hash: this.hash(handoff.source_promotion_decision_ref),
      promotion_commitment_profile_ref_hash: this.hash(handoff.promotion_commitment_profile_ref),
      promotion_input_snapshot_ref_hash: this.hash(handoff.promotion_input_snapshot_ref),
      bridge_source_refs_hash: this.hash(handoff.source_refs),
      downstream_source_kind_hash: this.hash(source.downstream_source_kind),
      downstream_source_ref_hash: this.hash(source.downstream_source_ref),
      source_feedback_refs_hash: this.hash(source.source_feedback_refs ?? []),
      observed_blocker_refs_hash: this.hash(source.observed_blocker_refs ?? []),
      artifact_refs_hash: this.hash(source.artifact_refs ?? []),
      raw_feedback_hash: this.hash(source.raw_feedback_text),
      allowed_refs_hash: this.hash(this.allowedRefs(handoff, source)),
      no_upstream_mutation_boundary_hash: this.hash('record_only_no_n1_to_n5_auto_loop'),
    };
  }

  private runtimeTokenBudget(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    runtimeInvocationContextHash: string;
    contextPacket: TopicSelectionV1cN6FeedbackNormalizationContextPacket;
    compressionAttempt: TopicSelectionV1cN6RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1cN6RuntimeTokenBudgetOverrides | null;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const compressionAttempt = this.runtimeCompressionAttempt({
      runtimeProfile: input.runtimeProfile,
      contextPacket: input.contextPacket,
      compressionAttempt: input.compressionAttempt,
      overrides: input.overrides,
    });
    const dynamicMaterialRefs: TopicSelectionDynamicPromptMaterialRecord[] = [];
    return {
      context_policy_profile: input.runtimeProfile.profile,
      context_policy_profile_hash: input.runtimeProfile.profile_hash,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      dynamic_material_refs: dynamicMaterialRefs,
      context_payloads: [input.contextPacket],
      compression_attempt: compressionAttempt,
      estimated_input_tokens_override: input.overrides?.estimated_input_tokens_override,
      schema_overhead_tokens_override: input.overrides?.schema_overhead_tokens_override,
    };
  }

  private runtimeCompressionAttempt(input: {
    runtimeProfile: TopicSelectionResolvedContextPolicyProfile;
    contextPacket: TopicSelectionV1cN6FeedbackNormalizationContextPacket;
    compressionAttempt: TopicSelectionV1cN6RuntimeCompressionAttempt | null;
    overrides: TopicSelectionV1cN6RuntimeTokenBudgetOverrides | null;
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
    contextPacket: TopicSelectionV1cN6FeedbackNormalizationContextPacket,
    requiredPreservedFacts: TopicSelectionCompressionFactInventory,
  ): Pick<TopicSelectionAgentRuntimeCompressionAttemptInput, 'compressed_context' | 'summary'> {
    return {
      compressed_context: {
        schema_version: 'TopicSelectionV1cN6FeedbackNormalizationCompressedRuntimeContext@v1',
        node_id: contextPacket.node_id,
        workflow_run_id: contextPacket.workflow_run_id,
        node_attempt_id: contextPacket.node_attempt_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        record_only: true,
        source_context_packet_hash: this.hash(contextPacket),
        source_refs: contextPacket.source_refs,
        source_hashes: contextPacket.source_hashes,
        required_preserved_facts: requiredPreservedFacts,
      },
      summary: {
        schema_version: 'TopicSelectionV1cN6FeedbackNormalizationCompressionSummary@v1',
        node_id: contextPacket.node_id,
        slot_id: contextPacket.slot_id,
        context_family: contextPacket.context_family,
        non_authority: true,
        record_only: true,
        preserved_fact_kinds: Object.keys(requiredPreservedFacts),
      },
    };
  }

  private requiredCompressionFacts(
    contextPacket: TopicSelectionV1cN6FeedbackNormalizationContextPacket,
  ): TopicSelectionCompressionFactInventory {
    const sourceHashes = contextPacket.source_hashes;
    const requiredFacts: TopicSelectionCompressionFactInventory = {
      paper_project_bridge: this.factIds(sourceHashes.bridge_payload_hash, sourceHashes.paper_project_bridge_ref_hash),
      source_promotion_decision: this.factIds(sourceHashes.source_promotion_decision_ref_hash),
      promotion_commitment_profile: this.factIds(sourceHashes.promotion_commitment_profile_ref_hash),
      promotion_input_snapshot: this.factIds(sourceHashes.promotion_input_snapshot_hash),
      downstream_source_ref: this.factIds(sourceHashes.downstream_source_ref_hash),
      source_feedback_ref: this.factIds(sourceHashes.source_feedback_refs_hash),
      feedback_signal: this.factIds(sourceHashes.raw_feedback_hash),
      required_action: this.factIds(sourceHashes.raw_feedback_hash),
      affected_ref: this.factIds(sourceHashes.allowed_refs_hash),
      loopback_target: this.factIds(sourceHashes.raw_feedback_hash, sourceHashes.allowed_refs_hash),
      severity: this.factIds(sourceHashes.raw_feedback_hash),
      no_upstream_mutation_boundary: this.factIds(sourceHashes.no_upstream_mutation_boundary_hash),
      allowed_ref_manifest: this.factIds(sourceHashes.allowed_refs_hash),
    };
    return Object.fromEntries(
      Object.entries(requiredFacts)
        .map(([factKind, factIds]) => [factKind, this.uniqueStrings(factIds ?? [])] as const)
        .filter(([, factIds]) => factIds.length > 0),
    );
  }

  private runtimeInvocationContextHash(
    binding: N6RuntimeSlotBinding,
    sourceHashes: Record<string, string>,
  ): string {
    return this.hash({
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: binding.invocation_slot_id,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1c_n6_downstream_feedback_normalization',
        scenario_case_id: binding.slot_id,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'downstream_record_only_ingress',
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
  }): string {
    return this.hash({
      compression_already_applied: false,
      runtime_invocation_context_hash: input.runtimeInvocationContextHash,
      execution_mode: input.executionMode,
      executor_kind: input.executorKind,
      run_mode: input.runMode,
    });
  }

  private allowedRefs(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
    source: TopicSelectionV1cN6FeedbackNormalizationSourceInput,
  ): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      handoff.paper_project_bridge_ref,
      handoff.source_promotion_decision_ref,
      handoff.promotion_commitment_profile_ref,
      handoff.promotion_input_snapshot_ref,
      handoff.paper_project_intake_ref ?? null,
      handoff.target_paper_project_ref ?? null,
      ...handoff.source_refs,
      ...handoff.accepted_risk_refs,
      source.downstream_source_ref,
      ...(source.source_feedback_refs ?? []),
      ...(source.observed_blocker_refs ?? []),
      ...(source.artifact_refs ?? []),
    ]);
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
    modelOptionId: string | null,
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: binding.model_profile_id,
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: modelOptionId,
    });
  }

  private slotBinding(): N6RuntimeSlotBinding {
    return {
      slot_id: SLOT_ID,
      invocation_slot_id: SLOT_ID,
      context_policy_profile_id:
        TOPIC_SELECTION_V1C_N6_CONTEXT_RUNTIME_PROFILE_IDS.downstream_feedback_normalization,
      output_contract: OUTPUT_CONTRACT,
      model_profile_id: TOPIC_SELECTION_V1C_DOWNSTREAM_FEEDBACK_NORMALIZATION_PROFILE_ID,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      schema: topicSelectionV1cDownstreamFeedbackCandidateSchema as unknown as Record<string, unknown>,
    };
  }

  private assertBridgeAndSource(
    handoff: TopicSelectionPaperProjectBridgeHandoff,
    source: TopicSelectionV1cN6FeedbackNormalizationSourceInput,
  ): void {
    if (
      handoff.bridge_status !== 'active'
      || handoff.bridge.bridge_status !== 'active'
      || handoff.paper_project_bridge_id !== handoff.bridge.paper_project_bridge_id
    ) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'N6 feedback normalization requires an active PaperProjectBridge handoff.');
    }
    if (source.paper_project_bridge_id !== handoff.paper_project_bridge_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'N6 feedback normalization source bridge id does not match the handoff.');
    }
    const bridgeWorkspaceId = handoff.bridge.workspace_id ?? null;
    if (source.workspace_id && source.workspace_id !== bridgeWorkspaceId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'N6 feedback normalization source workspace does not match the handoff.');
    }
    if (!source.raw_feedback_text.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'N6 feedback normalization requires non-empty raw feedback text.');
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
