import type {
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
import type {
  TopicSelectionExecutorKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import {
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ARBITER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS,
  type TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload,
  type TopicSelectionV1bN6RefinementDeltaDebateContext,
  type TopicSelectionV1bN6RefinementDeltaDebateRolePayload,
  type TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { AppError } from '../errors/app-error.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionModelProfileRegistryService,
} from './topic-selection-model-profile-registry-service.js';
import {
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import {
  TopicSelectionBoundedDebateCoreService,
  type BoundedDebateLoopResult,
} from './topic-selection-bounded-debate-core-service.js';
import type {
  BoundedDebateInvocationEnvelope,
  BoundedDebateRoleContext,
  BoundedDebateStrategy,
} from './topic-selection-bounded-debate-strategy.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import {
  TopicSelectionV1bN6RefinementDeltaDebateAdmissionService,
  type TopicSelectionV1bN6RefinementDeltaDebateAdmissionResult,
} from './topic-selection-v1b-n6-refinement-delta-debate-admission-service.js';

const N7_NODE_ID = 'topic-selection.v1b.materialize-topic-question-contract.v1' as const;
const OUTPUT_CONTRACT = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
const PROMPT_TEMPLATE_ID = 'topic-selection.v1b.n6.refinement-delta-debate.runtime-role' as const;
const PROMPT_TEMPLATE = defaultLlmConfig().getPrompt('topic-selection', PROMPT_TEMPLATE_ID);

const ROLE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['schema_version', 'role_slot'],
  properties: {
    schema_version: { const: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION },
    role_slot: { enum: [...TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER] },
  },
} as const;

type DeltaRoleOutput = Record<string, unknown> & TopicSelectionV1bN6RefinementDeltaDebateRolePayload;

export interface TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact {
  slot_id: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId;
  role_artifact_ref: TopicSelectionFunctionalRef;
  role_artifact_hash: string;
  normalized_output_ref: TopicSelectionFunctionalRef;
  normalized_output_hash: string;
  prompt_packet_hash: string;
  runtime_invocation_context_hash: string;
  runtime_audit_ref: TopicSelectionFunctionalRef;
  runtime_audit_hash: string;
  source_hashes: Record<string, string>;
  prior_role_artifact_hashes: Partial<Record<TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId, string>>;
  profile_id: string;
  model_option_id: string | null;
}

type DeltaRoleInputs = {
  codex_response: TopicSelectionCodexAssistedAgentOutput<DeltaRoleOutput> | null;
  mocked_output: TopicSelectionMockedAgentOutput<DeltaRoleOutput> | null;
};

type DeltaHandoff = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  context: TopicSelectionV1bN6RefinementDeltaDebateContext;
  base_source_refs: TopicSelectionFunctionalRef[];
};

type DeltaRoleContext = BoundedDebateRoleContext<
  DeltaHandoff,
  TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId,
  TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact,
  DeltaRoleInputs
>;

export type GenerateTopicSelectionV1bN6RefinementDeltaDebateInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  context: TopicSelectionV1bN6RefinementDeltaDebateContext;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm' | 'provider_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  role_outputs: Partial<Record<TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId, DeltaRoleInputs>>;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN6RefinementDeltaDebateRunResult =
  | {
    status: 'role_blocked';
    loop: BoundedDebateLoopResult<TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId, DeltaRoleOutput, TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact>;
  }
  | {
    status: 'admission_blocked';
    admission: TopicSelectionV1bN6RefinementDeltaDebateAdmissionResult;
  }
  | {
    status: 'completed' | 'blocked';
    admission: TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload;
    admission_hash: string;
    semantic_artifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef;
    replayed: boolean;
  };

export class TopicSelectionV1bN6RefinementDeltaDebateRuntimeService {
  private readonly contextProfiles: TopicSelectionContextPolicyProfileRegistryService;
  private readonly strategy: RefinementDeltaDebateStrategy;
  private readonly core: TopicSelectionBoundedDebateCoreService;

  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: {
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      promptPacketRuntime?: TopicSelectionPromptPacketRuntimeService;
      agentOrchestrator?: TopicSelectionAgentOrchestratorService;
    } = {},
  ) {
    this.contextProfiles = options.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    const modelProfiles = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    const agentOrchestrator = options.agentOrchestrator ?? new TopicSelectionAgentOrchestratorService({
      controlPlane,
      modelProfileRegistry: modelProfiles,
    });
    this.core = new TopicSelectionBoundedDebateCoreService({ controlPlane, agentOrchestrator });
    this.strategy = new RefinementDeltaDebateStrategy(this.contextProfiles);
  }

  async runDebate(
    input: GenerateTopicSelectionV1bN6RefinementDeltaDebateInput,
  ): Promise<TopicSelectionV1bN6RefinementDeltaDebateRunResult> {
    if (input.execution_mode === 'provider_llm') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'The v1b N6 refinement-delta provider Debate path is dormant; use Codex-assisted or mocked role outputs.',
      );
    }
    this.assertInput(input);
    const runMode = input.run_mode ?? input.request.run_mode
      ?? (input.execution_mode === 'mocked_llm' ? 'test' : 'acceptance');
    const routeKey = canonicalHash([
      input.request.workflow_run_id,
      input.context.source_kind,
      input.context.source_decision_ref,
      input.context.delta_hash,
    ]);
    const stableKey = `topic-selection.v1b.n6-refinement-delta-debate.${routeKey}`;
    const replay = await this.controlPlane.getArtifactRefByStableKey(stableKey);
    if (replay) {
      const admission = this.readPersistedAdmission(replay.payload ?? null, replay.checksum ?? null, input, routeKey);
      return this.resultFromAdmission(input, runMode, admission, replay.artifact_ref_id, replay.title_card_id ?? null, true);
    }

    const handoff: DeltaHandoff = {
      request: input.request,
      context: input.context,
      base_source_refs: this.strategy.baseSourceRefs(input.context),
    };
    const loop = await this.core.runLoop(
      this.strategy,
      {
        handoff,
        workflowRunId: input.request.workflow_run_id,
        nodeAttemptId: input.request.node_attempt_id,
        executionMode: input.execution_mode,
        runMode,
        policyVersion: input.request.policy_version,
        modelOptionId: null,
        createdBy: input.created_by ?? input.request.created_by ?? 'system',
      },
      (slot) => input.role_outputs[slot] ?? { codex_response: null, mocked_output: null },
    );
    if (loop.status !== 'completed') return { status: 'role_blocked', loop };

    const admission = new TopicSelectionV1bN6RefinementDeltaDebateAdmissionService().admit({
      workflow_run_id: input.request.workflow_run_id,
      policy_version: input.request.policy_version,
      context: input.context,
      role_results: loop.ordered_role_artifacts.map((artifact, index) => ({
        slot_id: artifact.slot_id,
        role_artifact_hash: artifact.role_artifact_hash,
        structured_output: loop.turns[index]!.structured_output,
      })),
      loop_transcript_hash: loop.loop_transcript_hash,
    });
    if (!admission.admitted) return { status: 'admission_blocked', admission };

    const artifact = await this.controlPlane.recordArtifactRef({
      stable_key: stableKey,
      workspace_id: input.request.workspace_id ?? null,
      title_card_id: input.request.title_card_id ?? null,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: input.request.workflow_run_id,
      payload: admission.payload as unknown as Record<string, unknown>,
      checksum: admission.payload_hash,
      created_by: input.created_by ?? input.request.created_by ?? 'system',
    });
    return this.resultFromAdmission(
      input,
      runMode,
      admission,
      artifact.artifact_ref_id,
      artifact.title_card_id ?? null,
      false,
    );
  }

  private assertInput(input: GenerateTopicSelectionV1bN6RefinementDeltaDebateInput): void {
    if (input.request.node_id !== N7_NODE_ID) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Refinement delta Debate must run at the N7 recovery frontier.');
    }
    if (input.context.refinement.actor.actor_type !== 'human') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Refinement delta Debate requires an exact Human-authored payload.');
    }
    if (canonicalHash(input.context.refinement) !== input.context.refinement_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Refinement payload hash does not match the frozen delta context.');
    }
    if (input.context.changed_fields.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Substantive refinement delta Debate requires at least one changed field.');
    }
  }

  private readPersistedAdmission(
    payload: Record<string, unknown> | null,
    checksum: string | null,
    input: GenerateTopicSelectionV1bN6RefinementDeltaDebateInput,
    routeKey: string,
  ): { payload: TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload; payload_hash: string } {
    if (!payload
      || payload.schema_version !== TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION
      || payload.workflow_run_id !== input.request.workflow_run_id
      || payload.delta_hash !== input.context.delta_hash
      || canonicalHash([
        payload.workflow_run_id,
        payload.source_kind,
        payload.source_decision_ref,
        payload.delta_hash,
      ]) !== routeKey) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Persisted refinement delta Debate replay binding is invalid.');
    }
    const payloadHash = canonicalHash(payload);
    if (!checksum || checksum !== payloadHash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Persisted refinement delta Debate admission checksum drifted.');
    }
    return {
      payload: payload as unknown as TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload,
      payload_hash: payloadHash,
    };
  }

  private resultFromAdmission(
    input: GenerateTopicSelectionV1bN6RefinementDeltaDebateInput,
    runMode: TopicSelectionAgentRunMode,
    admission: { payload: TopicSelectionV1bN6RefinementDeltaDebateAdmissionPayload; payload_hash: string },
    artifactRefId: string,
    titleCardId: string | null,
    replayed: boolean,
  ): Extract<TopicSelectionV1bN6RefinementDeltaDebateRunResult, { status: 'completed' | 'blocked' }> {
    const artifactRef: TopicSelectionArtifactFunctionalRef = {
      ref_type: 'artifact_ref',
      ref_id: artifactRefId,
      title_card_id: titleCardId ?? input.request.title_card_id ?? null,
      version_id: null,
    };
    const runtimeProfile = this.contextProfiles.resolveProfile({
      context_policy_profile_id:
        TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.arbiter,
      invocation_slot_id:
        TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_INVOCATION_SLOT_IDS.arbiter,
    });
    const slot = TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS.find((candidate) =>
      candidate.slot_id === 'n7_n6_refinement_delta_admission')!;
    const sourceHashes = this.strategy.baseSourceHashes(input.context, {});
    const semanticArtifact: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef = {
      slot_id: 'n7_n6_refinement_delta_admission',
      node_id: N7_NODE_ID,
      execution_mode: input.execution_mode,
      run_mode: runMode,
      allowed_effect: 'support_only',
      support_artifact_ref: artifactRef,
      support_artifact_hash: admission.payload_hash,
      normalized_output_ref: artifactRef,
      normalized_output_hash: admission.payload_hash,
      output_contract: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ADMISSION_SCHEMA_VERSION,
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n7_n6_refinement_delta_admission,
      model_option_id: null,
      input_hash: input.request.frozen_input.frozen_input_hash ?? canonicalHash(input.request.frozen_input),
      prompt_packet_hash: canonicalHash({ kind: 'refinement_delta_debate_admission', admission_hash: admission.payload_hash }),
      structured_output_hash: admission.payload_hash,
      adapter_policy_version: input.request.policy_version,
      slot_spec_hash: canonicalHash(slot),
      provenance_ref: artifactRef,
      runtime_provenance_class: 'runtime_verified',
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_INVOCATION_SLOT_IDS.arbiter,
      runtime_invocation_context_hash: canonicalHash(input.context),
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      runtime_audit_ref: artifactRef,
      runtime_audit_hash: admission.payload_hash,
      compression_report_ref: null,
      compression_report_hash: null,
      compressed_context_hash: null,
    };
    return {
      status: admission.payload.verdict === 'admit_unchanged' ? 'completed' : 'blocked',
      admission: admission.payload,
      admission_hash: admission.payload_hash,
      semantic_artifact: semanticArtifact,
      replayed,
    };
  }
}

class RefinementDeltaDebateStrategy implements BoundedDebateStrategy<
  DeltaHandoff,
  TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId,
  DeltaRoleOutput,
  TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact,
  DeltaRoleInputs
> {
  readonly roleOrder = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ROLE_ORDER;
  readonly debateLoopId = TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_LOOP_ID;

  constructor(private readonly contextProfiles: TopicSelectionContextPolicyProfileRegistryService) {}

  assertInput(): void {}

  sourceHashes(ctx: DeltaRoleContext): Record<string, string> {
    return this.baseSourceHashes(ctx.handoff.context, ctx.priorRoleArtifactHashes);
  }

  baseSourceHashes(
    context: TopicSelectionV1bN6RefinementDeltaDebateContext,
    priorRoleArtifactHashes: Partial<Record<TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId, string>>,
  ): Record<string, string> {
    return {
      source_decision_ref_hash: canonicalHash(context.source_decision_ref),
      previous_topic_question_contract_hash: context.previous_topic_question_contract_hash,
      current_topic_question_contract_hash: context.current_topic_question_contract_hash,
      proposed_contract_semantic_hash: context.proposed_contract_semantic_hash,
      refinement_hash: context.refinement_hash,
      delta_hash: context.delta_hash,
      selected_candidate_hash: context.selected_candidate_hash,
      selected_research_slice_hash: context.selected_research_slice_hash,
      evidence_ceiling_hash: context.evidence_ceiling_hash,
      prior_role_artifact_hashes_hash: canonicalHash(priorRoleArtifactHashes),
    };
  }

  runtimeInvocationContextObject(ctx: DeltaRoleContext, sourceHashes: Record<string, string>): unknown {
    const index = this.roleOrder.indexOf(ctx.slotId);
    return {
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: this.invocationSlotId(ctx.slotId),
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n6_refinement_delta_review',
        scenario_case_id: ctx.slotId,
        semantic_scenario_key: canonicalHash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'debate_round',
        loop_stage: ctx.slotId,
        current_round_index: index + 1,
        remaining_round_budget: this.roleOrder.length - index - 1,
        loopback_source_node_id: N7_NODE_ID,
        repair_origin_ref: ctx.handoff.context.source_decision_ref,
        repair_origin_hash: canonicalHash(ctx.handoff.context.source_decision_ref),
      },
      debate_context: {
        debate_loop_id: this.debateLoopId,
        debate_policy_id: 'topic-selection.v1b.n6.refinement-delta-debate.v1',
        round_index: index + 1,
        role: ctx.slotId,
        stage: ctx.slotId,
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: canonicalHash(ctx.priorRoleArtifactHashes),
        dynamic_material_refs_hash: canonicalHash(ctx.priorRoleArtifactHashes),
      },
      required_structure_manifest_hash: canonicalHash({ changed_fields: ctx.handoff.context.changed_fields }),
    };
  }

  buildContextPacket(args: {
    ctx: DeltaRoleContext;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Record<string, unknown> {
    const runtimeProfile = this.runtimeProfile(args.ctx.slotId);
    return {
      schema_version: 'TopicSelectionV1bN6RefinementDeltaDebateRoleContextPacket@v1',
      node_id: N7_NODE_ID,
      workflow_run_id: args.ctx.workflowRunId,
      node_attempt_id: args.ctx.nodeAttemptId,
      role_slot: args.ctx.slotId,
      invocation_slot_id: this.invocationSlotId(args.ctx.slotId),
      context_family: 'v1b_n6_refinement_delta_review',
      policy_version: args.ctx.policyVersion,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: this.uniqueRefs([
        ...args.ctx.handoff.base_source_refs,
        ...args.ctx.priorRoleArtifacts.map((artifact) => artifact.normalized_output_ref),
      ]),
      source_hashes: args.sourceHashes,
      refinement_delta_context: args.ctx.handoff.context,
      prior_role_artifact_hashes: args.ctx.priorRoleArtifactHashes,
    };
  }

  contextArtifactScope(ctx: DeltaRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return {
      workspace_id: ctx.handoff.request.workspace_id ?? null,
      title_card_id: ctx.handoff.request.title_card_id ?? null,
    };
  }

  outputArtifactScope(ctx: DeltaRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return this.contextArtifactScope(ctx);
  }

  messages(ctx: DeltaRoleContext, contextPacket: Record<string, unknown>): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      { role: 'system', content: PROMPT_TEMPLATE.system },
      {
        role: 'user',
        content: stableStringify({
          output_contract: OUTPUT_CONTRACT,
          role_slot: ctx.slotId,
          context_packet: contextPacket,
          output_boundary: 'support_only_human_payload_immutable',
        }),
      },
    ];
  }

  sourceRefs(contextPacket: Record<string, unknown>): TopicSelectionFunctionalRef[] {
    return contextPacket.source_refs as TopicSelectionFunctionalRef[];
  }

  invocationEnvelope(args: { ctx: DeltaRoleContext }): BoundedDebateInvocationEnvelope<DeltaRoleOutput> {
    const ctx = args.ctx;
    return {
      workspace_id: ctx.handoff.request.workspace_id ?? null,
      title_card_id: ctx.handoff.request.title_card_id ?? null,
      node_id: N7_NODE_ID,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: ctx.nodeAttemptId,
      invocation_attempt_id: `${ctx.nodeAttemptId}.${ctx.slotId}.runtime_role`,
      execution_mode: ctx.executionMode,
      executor_kind: this.executorKind(ctx.executionMode),
      run_mode: ctx.runMode,
      profile_id: this.profileId(ctx.slotId),
      output_contract: OUTPUT_CONTRACT,
      model_option_id: ctx.modelOptionId,
      prompt: { promptTemplateId: PROMPT_TEMPLATE_ID, version: PROMPT_TEMPLATE.version },
      prompt_variant_key: this.invocationSlotId(ctx.slotId),
      schema_name: OUTPUT_CONTRACT,
      schema: ROLE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      created_by: ctx.createdBy,
    };
  }

  runtimeTokenBudget(args: {
    ctx: DeltaRoleContext;
    runtimeInvocationContextHash: string;
    contextPacket: Record<string, unknown>;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const runtimeProfile = this.runtimeProfile(args.ctx.slotId);
    return {
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      context_payloads: [args.contextPacket],
      compression_attempt: null,
    };
  }

  invocationPassthrough(ctx: DeltaRoleContext): DeltaRoleInputs {
    return ctx.invocationInputs;
  }

  assembleRoleArtifact(args: {
    ctx: DeltaRoleContext;
    structuredOutput: DeltaRoleOutput;
    invocation: TopicSelectionAgentInvocationResult<DeltaRoleOutput>;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    outputRef: TopicSelectionArtifactFunctionalRef;
    outputHash: string;
    auditHash: string;
  }): TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact {
    if (!args.invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', 'Refinement delta Debate role is missing runtime audit provenance.');
    }
    return {
      slot_id: args.ctx.slotId,
      role_artifact_ref: args.outputRef,
      role_artifact_hash: args.outputHash,
      normalized_output_ref: args.outputRef,
      normalized_output_hash: args.outputHash,
      prompt_packet_hash: args.invocation.provenance.prompt_packet_hash,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      runtime_audit_ref: args.invocation.audit_artifact_ref,
      runtime_audit_hash: args.auditHash,
      source_hashes: args.sourceHashes,
      prior_role_artifact_hashes: args.ctx.priorRoleArtifactHashes,
      profile_id: this.profileId(args.ctx.slotId),
      model_option_id: args.invocation.provenance.model_option_id,
    };
  }

  priorRoleArtifactHashOf(artifact: TopicSelectionV1bN6RefinementDeltaDebateRoleArtifact): {
    slotId: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId;
    hash: string;
  } {
    return { slotId: artifact.slot_id, hash: artifact.role_artifact_hash };
  }

  baseSourceRefs(context: TopicSelectionV1bN6RefinementDeltaDebateContext): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs([
      ...context.source_refs,
      context.source_decision_ref,
      context.checkpoint_ref,
      context.previous_topic_question_contract_ref,
      context.current_topic_question_contract_ref,
      context.selected_candidate_ref,
      context.selected_research_slice_ref,
      ...context.evidence_ceiling_refs,
    ]);
  }

  private runtimeProfile(slot: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId): TopicSelectionResolvedContextPolicyProfile {
    const key = slot === 'n6_refinement_delta_explorer' ? 'explorer'
      : slot === 'n6_refinement_delta_critic' ? 'critic' : 'arbiter';
    return this.contextProfiles.resolveProfile({
      context_policy_profile_id:
        TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS[key],
      invocation_slot_id: TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_INVOCATION_SLOT_IDS[key],
    });
  }

  private invocationSlotId(slot: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId): string {
    return slot;
  }

  private profileId(slot: TopicSelectionV1bN6RefinementDeltaDebateRoleSlotId): string {
    if (slot === 'n6_refinement_delta_explorer') {
      return TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_EXPLORER_PROFILE_ID;
    }
    if (slot === 'n6_refinement_delta_critic') {
      return TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_CRITIC_PROFILE_ID;
    }
    return TOPIC_SELECTION_V1B_N6_REFINEMENT_DELTA_DEBATE_ARBITER_PROFILE_ID;
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
  }

  private uniqueRefs(values: Array<TopicSelectionFunctionalRef | null>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return values.filter((ref): ref is TopicSelectionFunctionalRef => {
      if (!ref) return false;
      const key = stableStringify(ref);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
