// T-127 W-07 (step f4) — v1b N6 DIVERGENT topic-question candidate debate STRATEGY. Concrete
// DivergentDebateStrategy for the shared bounded-debate core: 3 fan-out roles (explorer -> critic ->
// arbiter), driven by core.runDivergentLoop. Mirrors the shipped N8 bounded-debate strategy hook-for-hook
// but uses the N6 candidate-generation context (frozen N6 payload + mode-context projection, NOT N8's
// N7->N8 value-assessment projection), has variable fan-out arity, and folds priorRoleArtifactHashesAll +
// instance_index so the two same-slot explorer workers are individually addressable.
//
// This file ships the STRATEGY + constants + handoff/inputs types only. The runtime ENTRY
// (runDivergentDebate + arbiter unwrap + gate bridge) and the shared N6 context resolver are step f5.
// The deterministic admission is step f3 (topic-selection-v1b-n6-divergent-debate-admission-service.ts),
// whose RoleArtifact / AdmissionExpectedIdentity types this strategy returns. Prompts are SKELETON (D1);
// product-grade authoring is deferred to T-128.

import { AppError } from '../errors/app-error.js';
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
  TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';
import type { ResolvedTopicSelectionDecisionMemoryPacket } from './topic-selection-decision-memory-projection-service.js';
import type {
  TopicSelectionV1bN6DraftGenerationMode,
  TopicSelectionV1bN6DraftRuntimeModeContext,
} from './topic-selection-v1b-n6-draft-runtime-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
  type TopicSelectionResolvedContextPolicyProfile,
} from './topic-selection-context-policy-profile-registry-service.js';
import {
  TopicSelectionModelProfileRegistryService,
  type TopicSelectionResolvedModelProfile,
} from './topic-selection-model-profile-registry-service.js';
import {
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import type {
  BoundedDebateRoleContext,
  BoundedDebateInvocationEnvelope,
  DivergentDebateStrategy,
} from './topic-selection-bounded-debate-strategy.js';
import {
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS,
  type TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity,
  type TopicSelectionV1bN6DivergentDebateRoleArtifact,
  type TopicSelectionV1bN6DivergentDebateRoleOutput,
} from './topic-selection-v1b-n6-divergent-debate-admission-service.js';

const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const DEBATE_LOOP_ID = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID;
const DEBATE_POLICY_ID = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID;
const OUTPUT_CONTRACT = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;
const DEFAULT_POLICY_VERSION = TOPIC_SELECTION_V1B_NODE_POLICY_VERSION;

/** Minimal role-output schema (mirrors N8): the discriminated optional fields ride additionalProperties. */
const ROLE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['schema_version', 'role_slot'],
  properties: {
    schema_version: { type: 'string', minLength: 1 },
    role_slot: { enum: [...TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER] },
  },
} as const;

const CONTEXT_PROFILE_BY_SLOT: Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string> = {
  n6_debate_explorer: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.explorer,
  n6_debate_critic: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.critic,
  n6_debate_arbiter: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.arbiter,
};

const MODEL_PROFILE_BY_SLOT: Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string> = {
  n6_debate_explorer: TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
  n6_debate_critic: TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  n6_debate_arbiter: TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
};

// Per-role prompt template ids (registered in topic-selection-llm-invocation-registry + the scenario
// contract). A drift guard test pins these to the scenario's role_stage_slots[].prompt_template_id.
const PROMPT_TEMPLATE_ID_BY_SLOT: Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string> = {
  n6_debate_explorer: 'topic-selection-v1b-n6-debate-explorer',
  n6_debate_critic: 'topic-selection-v1b-n6-debate-critic',
  n6_debate_arbiter: 'topic-selection-v1b-n6-debate-arbiter',
};

/** Pre-resolved shared N6 context, resolved ONCE per run (f5) and threaded as the core's opaque handoff. */
export interface V1bN6DebateHandoff {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
  candidateGenerationMode: TopicSelectionV1bN6DraftGenerationMode;
  modeContext: TopicSelectionV1bN6DraftRuntimeModeContext;
  decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
  baseSourceHashes: Record<string, string>;
  baseSourceRefs: TopicSelectionFunctionalRef[];
}

export type V1bN6DebateInputs = {
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bN6DivergentDebateRoleOutput> | null;
  mocked_output: TopicSelectionMockedAgentOutput<TopicSelectionV1bN6DivergentDebateRoleOutput> | null;
  /** DIVERGENT-only: the per-stage fan-out worker index (core.runDivergentLoop perInstance) — folded into
   *  the invocation_attempt_id + the RIC so explorer_0 and explorer_1 are individually addressable. */
  instance_index: number;
};

type V1bN6DebateRoleContext = BoundedDebateRoleContext<
  V1bN6DebateHandoff,
  TopicSelectionV1bN6DivergentDebateRoleSlotId,
  TopicSelectionV1bN6DivergentDebateRoleArtifact,
  V1bN6DebateInputs
>;

export class V1bN6DivergentDebateStrategy implements DivergentDebateStrategy<
  V1bN6DebateHandoff,
  TopicSelectionV1bN6DivergentDebateRoleSlotId,
  TopicSelectionV1bN6DivergentDebateRoleOutput,
  TopicSelectionV1bN6DivergentDebateRoleArtifact,
  V1bN6DebateInputs
> {
  readonly roleOrder = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER;
  readonly debateLoopId = DEBATE_LOOP_ID;

  constructor(
    private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService,
    private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService,
    private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService,
  ) {}

  // ---------------------------------------------------------------- divergent fan-out arity

  /** v1 fan-out arity = the frozen scenario default (explorer 2 / critic 1 / arbiter 1). Deterministic
   *  (no run-varying state) so the [slot,arity] transcript fold is replay-stable; admission accepts any
   *  count within the scenario [min,max], so this can later grow to a frozen per-run override. */
  instanceCountFor(slot: TopicSelectionV1bN6DivergentDebateRoleSlotId): number {
    return TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS[slot];
  }

  // ---------------------------------------------------------------- shared-core hooks

  assertInput(): void {
    // shared N6 context already validated when resolved (f5 resolver); no-op.
  }

  sourceHashes(ctx: V1bN6DebateRoleContext): Record<string, string> {
    return {
      ...ctx.handoff.baseSourceHashes,
      prior_role_artifact_hashes_hash: this.hash(ctx.priorRoleArtifactHashes),
      // Fan-out: fold EVERY prior worker instance (not the last-wins map) so all explorer/critic
      // instances bind into the arbiter's identity (BoundedDebateRoleContext docs / strategy.ts:38-41).
      prior_role_artifact_hashes_all_hash: this.hash(ctx.priorRoleArtifactHashesAll ?? {}),
    };
  }

  runtimeInvocationContextObject(ctx: V1bN6DebateRoleContext, sourceHashes: Record<string, string>): unknown {
    const index = this.roleOrder.indexOf(ctx.slotId);
    const instanceIndex = ctx.invocationInputs.instance_index;
    if (!Number.isInteger(instanceIndex) || instanceIndex < 0) {
      // Loud failure if f5's perInstance ever forgets to thread the fan-out index — a missing index
      // would silently produce a stable-but-wrong identity that admission (using the SAME hook as its
      // builder) would still self-accept while diverging from a correctly-threaded real run.
      throw new AppError(500, 'INTERNAL_ERROR', `N6 divergent debate ${ctx.slotId} turn is missing a valid fan-out instance_index.`);
    }
    return {
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: ctx.slotId,
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n6_topic_question_generation',
        scenario_case_id: ctx.slotId,
        semantic_scenario_key: this.hash(sourceHashes),
      },
      loop_context: {
        loop_kind: 'debate_round',
        loop_stage: ctx.slotId,
        current_round_index: index + 1,
        remaining_round_budget: this.roleOrder.length - index - 1,
        loopback_source_node_id: null,
        repair_origin_ref: null,
        repair_origin_hash: null,
      },
      debate_context: {
        debate_loop_id: DEBATE_LOOP_ID,
        debate_policy_id: DEBATE_POLICY_ID,
        round_index: index + 1,
        role: null,
        stage: ctx.slotId,
        // Contract-conformant STRING id (TopicSelectionRuntimeDebateContext.agent_instance_id is
        // string|null — N8 + N6-single-agent emit null; a numeric value would fail the published RIC
        // schema). String(index) still makes explorer_0 vs explorer_1 produce distinct RIC hashes.
        agent_instance_id: String(instanceIndex),
        parent_invocation_attempt_ids_hash: this.hash(ctx.priorRoleArtifactHashesAll ?? {}),
        dynamic_material_refs_hash: this.hash(ctx.priorRoleArtifactHashesAll ?? {}),
      },
      // N6 omits N8's required_structure_manifest_hash (matches the N6 single-agent draft RIC shape).
    };
  }

  buildContextPacket(args: {
    ctx: V1bN6DebateRoleContext;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Record<string, unknown> {
    const { ctx, sourceHashes } = args;
    const runtimeProfile = this.resolveRuntimeProfile(ctx.slotId);
    return {
      schema_version: 'TopicSelectionV1bN6DivergentDebateRoleContextPacket@v1',
      node_id: N6_NODE_ID,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: ctx.nodeAttemptId,
      slot_id: ctx.slotId,
      invocation_slot_id: ctx.slotId,
      generation_mode: ctx.handoff.candidateGenerationMode,
      context_family: 'v1b_n6_topic_question_generation',
      policy_version: ctx.handoff.request.policy_version,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: ctx.handoff.baseSourceRefs,
      source_hashes: sourceHashes,
      frozen_input_payload: ctx.handoff.frozenPayload,
      mode_context: ctx.handoff.modeContext,
      decision_memory_packet_ref: ctx.handoff.decisionMemory?.ref ?? null,
      decision_memory_packet_hash: ctx.handoff.decisionMemory?.hash ?? null,
      decision_memory: ctx.handoff.decisionMemory?.packet ?? null,
      prior_role_artifact_hashes: ctx.priorRoleArtifactHashes,
      prior_role_artifact_hashes_all: ctx.priorRoleArtifactHashesAll ?? {},
    };
  }

  contextArtifactScope(ctx: V1bN6DebateRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return { workspace_id: ctx.handoff.request.workspace_id ?? null, title_card_id: ctx.handoff.request.title_card_id ?? null };
  }

  outputArtifactScope(ctx: V1bN6DebateRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return this.contextArtifactScope(ctx);
  }

  messages(
    ctx: V1bN6DebateRoleContext,
    contextPacket: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    // SKELETON role instructions (D1) — enough to drive a mocked/codex end-to-end and pin the
    // prompt_packet_hash; product-grade authoring is T-128.
    const roleInstruction = ctx.slotId === 'n6_debate_explorer'
      ? 'You are the EXPLORER. Emit candidate_seeds: multiple non-overlapping topic-question framings that widen the candidate set. Do not produce authority records.'
      : ctx.slotId === 'n6_debate_critic'
        ? 'You are the CRITIC. Emit critic_findings: weak-set / duplicate-overlap challenges and objections over the prior explorer seeds. Do not produce authority records.'
        : 'You are the ARBITER. Synthesize the prior explorer seeds and critic findings into synthesized_candidate_set, a TopicQuestionCandidateSet draft (TopicQuestionCandidateSetDraft@v1). Do not produce authority records.';
    return [
      {
        role: 'system',
        content: [
          'Act as exactly one fixed role in the Topic Selection v1b N6 divergent candidate-generation debate.',
          'Use only the supplied frozen N6 refs, hashes, context packet, mode context, and prior role artifact hashes.',
          'Do not output TopicQuestionCandidate/CandidateSet/Contract authority, ResearchSlice, N6ToN7 handoff, route decisions, gate status, or candidate mutations.',
          roleInstruction,
          'Return only JSON matching the requested role output contract.',
        ].join(' '),
      },
      {
        role: 'user',
        content: stableStringify({
          output_contract: OUTPUT_CONTRACT,
          role_slot: ctx.slotId,
          context_packet: contextPacket,
          output_boundary: 'support_only_non_authority',
        }),
      },
    ];
  }

  sourceRefs(contextPacket: Record<string, unknown>): TopicSelectionFunctionalRef[] {
    return (contextPacket.source_refs as TopicSelectionFunctionalRef[]) ?? [];
  }

  invocationEnvelope(args: {
    ctx: V1bN6DebateRoleContext;
  }): BoundedDebateInvocationEnvelope<TopicSelectionV1bN6DivergentDebateRoleOutput> {
    const { ctx } = args;
    return {
      workspace_id: ctx.handoff.request.workspace_id ?? null,
      title_card_id: ctx.handoff.request.title_card_id ?? null,
      node_id: N6_NODE_ID,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: ctx.nodeAttemptId,
      // instance_index disambiguates fan-out workers — without it two same-slot turns collide.
      invocation_attempt_id: `${ctx.nodeAttemptId}.${ctx.slotId}.${ctx.invocationInputs.instance_index}.runtime_role`,
      execution_mode: ctx.executionMode,
      executor_kind: this.executorKind(ctx.executionMode),
      run_mode: ctx.runMode,
      profile_id: MODEL_PROFILE_BY_SLOT[ctx.slotId],
      output_contract: OUTPUT_CONTRACT,
      model_option_id: ctx.modelOptionId,
      prompt: { promptTemplateId: PROMPT_TEMPLATE_ID_BY_SLOT[ctx.slotId], version: PROMPT_TEMPLATE_VERSION },
      prompt_variant_key: ctx.slotId,
      schema_name: OUTPUT_CONTRACT,
      schema: ROLE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      created_by: ctx.createdBy,
    };
  }

  runtimeTokenBudget(args: {
    ctx: V1bN6DebateRoleContext;
    runtimeInvocationContextHash: string;
    contextPacket: Record<string, unknown>;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const runtimeProfile = this.resolveRuntimeProfile(args.ctx.slotId);
    return {
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      context_payloads: [args.contextPacket],
      // No compression on the debate path yet (matches the N6 single-agent default); deferred.
      compression_attempt: null,
    };
  }

  invocationPassthrough(ctx: V1bN6DebateRoleContext): {
    codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bN6DivergentDebateRoleOutput> | null;
    mocked_output: TopicSelectionMockedAgentOutput<TopicSelectionV1bN6DivergentDebateRoleOutput> | null;
  } {
    return {
      codex_response: ctx.invocationInputs.codex_response ?? null,
      mocked_output: ctx.invocationInputs.mocked_output ?? null,
    };
  }

  assembleRoleArtifact(args: {
    ctx: V1bN6DebateRoleContext;
    structuredOutput: TopicSelectionV1bN6DivergentDebateRoleOutput;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bN6DivergentDebateRoleOutput>;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    outputRef: TopicSelectionArtifactFunctionalRef;
    outputHash: string;
    auditHash: string;
  }): TopicSelectionV1bN6DivergentDebateRoleArtifact {
    const runtimeProfile = this.resolveRuntimeProfile(args.ctx.slotId);
    return {
      slot_id: args.ctx.slotId,
      node_id: N6_NODE_ID,
      workflow_run_id: args.ctx.workflowRunId,
      node_attempt_id: args.ctx.nodeAttemptId,
      policy_version: args.ctx.policyVersion ?? DEFAULT_POLICY_VERSION,
      execution_mode: args.ctx.executionMode,
      run_mode: args.ctx.runMode,
      // ALL three N6 roles are support_only — the arbiter draft is unwrapped + funnelled through the
      // EXISTING N6 gate by f5 (single-agent identity); it is NOT a gate-authority artifact here.
      allowed_effect: 'support_only',
      role_artifact_ref: args.outputRef,
      role_artifact_hash: args.outputHash,
      normalized_output_ref: args.outputRef,
      normalized_output_hash: args.outputHash,
      output_contract: OUTPUT_CONTRACT,
      profile_id: MODEL_PROFILE_BY_SLOT[args.ctx.slotId],
      model_option_id: args.invocation.provenance.model_option_id,
      prompt_packet_hash: args.invocation.provenance.prompt_packet_hash,
      structured_output_hash: args.outputHash,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: args.ctx.slotId,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: args.sourceHashes,
      // last-wins per-slot map (fan-out worker identity is bound via the RIC's All-fold).
      prior_role_artifact_hashes: args.ctx.priorRoleArtifactHashes,
      runtime_audit_ref: args.invocation.audit_artifact_ref!,
      runtime_audit_hash: args.auditHash,
      provenance_ref: args.invocation.audit_artifact_ref!,
      runtime_provenance_class: 'runtime_verified',
      compression_report_ref: args.invocation.provenance.compression_report_ref ?? null,
      compression_report_hash: args.invocation.provenance.compression_report_hash ?? null,
      compressed_context_hash: args.invocation.provenance.compressed_context_hash ?? null,
    };
  }

  priorRoleArtifactHashOf(
    artifact: TopicSelectionV1bN6DivergentDebateRoleArtifact,
  ): { slotId: TopicSelectionV1bN6DivergentDebateRoleSlotId; hash: string } {
    return { slotId: artifact.slot_id, hash: artifact.role_artifact_hash };
  }

  // ---------------------------------------------------------------- admission expected identity

  /** Re-derives a single fan-out instance's expected identity through the SAME hooks the runtime used,
   *  so admission re-verification byte-matches by construction. Bound to the resolved handoff per run
   *  (f5). priorRoleArtifactHashes + priorRoleArtifactHashesAll are rebuilt from the ordered prior
   *  artifacts EXACTLY as core.runDivergentLoop builds them (core-service.ts:309-315). */
  async buildAdmissionExpectedIdentityFor(
    handoff: V1bN6DebateHandoff,
    input: {
      slot_id: TopicSelectionV1bN6DivergentDebateRoleSlotId;
      instance_index: number;
      prior_role_artifacts: TopicSelectionV1bN6DivergentDebateRoleArtifact[];
      workflow_run_id: string;
      node_attempt_id: string;
      policy_version: string;
      execution_mode: TopicSelectionAgentExecutionMode;
      run_mode: TopicSelectionAgentRunMode;
      model_option_id: string | null;
      normalized_payload_hash: string;
    },
  ): Promise<TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity> {
    const priorRoleArtifactHashes: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string>> = {};
    const priorRoleArtifactHashesAll: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, string[]>> = {};
    for (const artifact of input.prior_role_artifacts) {
      priorRoleArtifactHashes[artifact.slot_id] = artifact.role_artifact_hash;
      (priorRoleArtifactHashesAll[artifact.slot_id] ??= []).push(artifact.role_artifact_hash);
    }
    const ctx: V1bN6DebateRoleContext = {
      handoff,
      slotId: input.slot_id,
      priorRoleArtifacts: input.prior_role_artifacts,
      priorRoleArtifactHashes,
      priorRoleArtifactHashesAll,
      invocationInputs: { codex_response: null, mocked_output: null, instance_index: input.instance_index },
      workflowRunId: input.workflow_run_id,
      nodeAttemptId: input.node_attempt_id,
      executionMode: input.execution_mode,
      runMode: input.run_mode,
      policyVersion: input.policy_version,
      modelOptionId: input.model_option_id,
      createdBy: 'system',
    };
    const sourceHashes = this.sourceHashes(ctx);
    const ric = this.hash(this.runtimeInvocationContextObject(ctx, sourceHashes));
    const contextPacket = this.buildContextPacket({ ctx, runtimeInvocationContextHash: ric, sourceHashes });
    const runtimeProfile = this.resolveRuntimeProfile(input.slot_id);
    const modelProfile = this.resolveModelProfile(input.slot_id, input.execution_mode, input.run_mode, input.model_option_id);
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: handoff.request.title_card_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_id: N6_NODE_ID,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: PROMPT_TEMPLATE_ID_BY_SLOT[input.slot_id],
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      prompt_variant_key: input.slot_id,
      invocation_slot_id: input.slot_id,
      runtime_invocation_context_hash: ric,
      messages: this.messages(ctx, contextPacket),
      source_refs: this.sourceRefs(contextPacket),
      context_packet_hashes: [this.hash(contextPacket)],
      output_contract: OUTPUT_CONTRACT,
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      model_option_id: modelProfile.selected_model_option?.option_id ?? null,
      normalized_params_hash: modelProfile.normalized_params_hash,
      runtime_modifiers_hash: this.runtimeModifiersHash({
        executionMode: input.execution_mode,
        executorKind: this.executorKind(input.execution_mode),
        runMode: input.run_mode,
        runtimeInvocationContextHash: ric,
      }),
      redaction_policy: runtimeProfile.profile.redaction_policy,
    });
    return {
      slot_id: input.slot_id,
      output_contract: OUTPUT_CONTRACT,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: input.slot_id,
      prompt_packet_hash: promptPacket.identity.prompt_packet_hash,
      runtime_invocation_context_hash: ric,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: sourceHashes,
      prior_role_artifact_hashes: priorRoleArtifactHashes,
      normalized_payload_hash: input.normalized_payload_hash,
    };
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

  // ---------------------------------------------------------------- internals

  private resolveRuntimeProfile(slotId: TopicSelectionV1bN6DivergentDebateRoleSlotId): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: CONTEXT_PROFILE_BY_SLOT[slotId],
      invocation_slot_id: slotId,
    });
  }

  private resolveModelProfile(
    slotId: TopicSelectionV1bN6DivergentDebateRoleSlotId,
    executionMode: TopicSelectionAgentExecutionMode,
    runMode: TopicSelectionAgentRunMode,
    modelOptionId: string | null,
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: MODEL_PROFILE_BY_SLOT[slotId],
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: modelOptionId,
    });
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
  }

  private hash(value: unknown): string {
    return canonicalHash(value);
  }
}

// Re-exported so f5 (runtime entry) and the f4 unit test can reference the constant maps without
// re-literalizing the byte-bearing ids.
export {
  N6_NODE_ID,
  DEBATE_LOOP_ID,
  DEBATE_POLICY_ID,
  OUTPUT_CONTRACT,
  PROMPT_TEMPLATE_VERSION,
  PROMPT_TEMPLATE_ID_BY_SLOT,
  CONTEXT_PROFILE_BY_SLOT,
  MODEL_PROFILE_BY_SLOT,
  ROLE_OUTPUT_SCHEMA,
};
