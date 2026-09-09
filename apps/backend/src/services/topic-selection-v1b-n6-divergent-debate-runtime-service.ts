// N6 candidate review uses the existing bounded core: two Explorers, one Critic and one Arbiter.
// Role admission produces a non-authority draft for the existing N6 candidate gate. A completed
// receipt binds the frozen input, role audits, transcript and bridge draft for exact replay.
// Provider execution remains dormant; .ai/llm owns the configured prompts and model routes.

import { AppError } from '../errors/app-error.js';
import {
  topicSelectionFunctionalRefSchema,
  type TopicSelectionFunctionalRef,
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
  debateExecutionPlanMixingError,
  resolveDebateExecutionModelOptionId,
  type TopicSelectionNamedDebateExecutionPlan,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-execution-plan-contracts';
import {
  TOPIC_SELECTION_V1B_NODE_POLICY_VERSION,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH,
  TOPIC_SELECTION_V1B_N6_DEBATE_EXPLORER_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_V1B_N6_DEBATE_ARBITER_PROFILE_ID,
  topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema,
  type TopicSelectionV1bN6DivergentDebateRoleSlotId,
  type TopicSelectionV1bN6HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicQuestionCandidateSetDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
  type TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-debate-scenario-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import { recordDebateDerivedDraft } from './topic-selection-debate-draft-derivation-service.js';
import { resolveDebatePriorOutputs } from './topic-selection-debate-role-context.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { ResolvedTopicSelectionDecisionMemoryPacket } from './topic-selection-decision-memory-projection-service.js';
import {
  TopicSelectionV1bN6DraftRuntimeService,
  type TopicSelectionV1bN6DraftGenerationMode,
  type TopicSelectionV1bN6DraftRuntimeModeContext,
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
  TopicSelectionAgentOrchestratorService,
  type TopicSelectionAgentInvocationResult,
  type TopicSelectionAgentRuntimeTokenBudgetInput,
  type TopicSelectionCodexAssistedAgentOutput,
  type TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionPromptPacketRuntimeService } from './topic-selection-prompt-packet-runtime-service.js';
import {
  TopicSelectionBoundedDebateCoreService,
  type DivergentDebateLoopResult,
} from './topic-selection-bounded-debate-core-service.js';
import type {
  BoundedDebateRoleContext,
  BoundedDebateInvocationEnvelope,
  DivergentDebateStrategy,
} from './topic-selection-bounded-debate-strategy.js';
import {
  TopicSelectionV1bN6DivergentDebateAdmissionService,
  TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS,
  type TopicSelectionV1bN6DivergentDebateAdmissionExpectedIdentity,
  type TopicSelectionV1bN6DivergentDebateAdmissionResult,
  type TopicSelectionV1bN6DivergentDebateRoleArtifact,
  type TopicSelectionV1bN6DivergentDebateRoleOutput,
} from './topic-selection-v1b-n6-divergent-debate-admission-service.js';

const N6_NODE_ID = 'topic-selection.v1b.generate-topic-question-candidates.v1' as const;
const DEBATE_LOOP_ID = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_LOOP_ID;
const DEBATE_POLICY_ID = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_POLICY_ID;
const OUTPUT_CONTRACT = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
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

function cliRoleSchema(slot: TopicSelectionV1bN6DivergentDebateRoleSlotId): Record<string, unknown> {
  const fields: Record<string, unknown> = slot === 'n6_debate_explorer'
    ? { candidate_seeds: { type: 'array', items: {
      type: 'object', additionalProperties: false, required: ['seed_id', 'question_framing', 'evidence_refs'],
      properties: {
        seed_id: { type: 'string' }, question_framing: { type: 'string' },
        evidence_refs: { type: 'array', items: topicSelectionFunctionalRefSchema },
      },
    } } }
    : slot === 'n6_debate_critic'
      ? { critic_findings: { type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['finding_code', 'severity', 'statement'],
        properties: { finding_code: { type: 'string' }, severity: { enum: ['note', 'material', 'blocking'] }, statement: { type: 'string' } },
      } } }
      : { synthesized_candidate_set: topicSelectionV1bTopicQuestionCandidateSetDraftPayloadSchema };
  return {
    type: 'object', additionalProperties: false,
    required: ['schema_version', 'role_slot', ...Object.keys(fields)],
    properties: { schema_version: { const: OUTPUT_CONTRACT }, role_slot: { const: slot }, ...fields },
  };
}

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

function configuredPrompt(slotId: TopicSelectionV1bN6DivergentDebateRoleSlotId) {
  return defaultLlmConfig().getPrompt('topic-selection', PROMPT_TEMPLATE_ID_BY_SLOT[slotId]);
}

const PROMPT_TEMPLATE_VERSION = configuredPrompt('n6_debate_explorer').version;

/** Pre-resolved shared N6 context, resolved ONCE per run (f5) and threaded as the core's opaque handoff. */
export interface V1bN6DebateHandoff {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  frozenPayload: TopicSelectionV1bN6HarnessFrozenInputPayload;
  candidateGenerationMode: TopicSelectionV1bN6DraftGenerationMode;
  modeContext: TopicSelectionV1bN6DraftRuntimeModeContext;
  decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
  baseSourceHashes: Record<string, string>;
  researchContext?: Record<string, unknown>;
  baseSourceRefs: TopicSelectionFunctionalRef[];
  /** T-127 W-09 (DP-3.5): optional provider-diverse execution plan keyed by debate ROLE FAMILY
   *  (explorer/critic/arbiter) — all fan-out instances of a family share the family's spec. Absent
   *  (null) -> the resolver returns null -> the base modelOptionId (null), i.e. byte-identical to pre-W09. */
  executionPlan: TopicSelectionNamedDebateExecutionPlan<TopicSelectionV1bN6DivergentDebateRoleSlotId> | null;
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
    private readonly controlPlane?: TopicSelectionControlPlaneService,
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

  async buildContextPacket(args: {
    ctx: V1bN6DebateRoleContext;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Promise<Record<string, unknown>> {
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
      ...(ctx.handoff.researchContext ? { research_context: ctx.handoff.researchContext } : {}),
      mode_context: ctx.handoff.modeContext,
      decision_memory_packet_ref: ctx.handoff.decisionMemory?.ref ?? null,
      decision_memory_packet_hash: ctx.handoff.decisionMemory?.hash ?? null,
      decision_memory: ctx.handoff.decisionMemory?.packet ?? null,
      prior_role_artifact_hashes: ctx.priorRoleArtifactHashes,
      prior_role_artifact_hashes_all: ctx.priorRoleArtifactHashesAll ?? {},
      ...(ctx.executionMode === 'codex_cli' ? {
        prior_role_outputs: await resolveDebatePriorOutputs(this.controlPlane, {
          workflow_run_id: ctx.workflowRunId, title_card_id: ctx.handoff.request.title_card_id ?? null,
        }, ctx.slotId === 'n6_debate_explorer' ? [] : ctx.priorRoleArtifacts),
      } : {}),
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
    return [
      {
        role: 'system',
        content: configuredPrompt(ctx.slotId).system,
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
      // T-127 W-09: per-role-FAMILY model_option_id from the named execution plan (ctx.slotId IS the
      // family — fan-out instances share it; instance_index disambiguates only the attempt id). Falls
      // back to the base ctx.modelOptionId; absent a plan the resolver returns null -> ctx.modelOptionId
      // (null today), so this is byte-identical to the pre-W09 single-profile behavior.
      model_option_id: resolveDebateExecutionModelOptionId(ctx.handoff.executionPlan, ctx.slotId) ?? ctx.modelOptionId,
      prompt: {
        promptTemplateId: PROMPT_TEMPLATE_ID_BY_SLOT[ctx.slotId],
        version: configuredPrompt(ctx.slotId).version,
      },
      prompt_variant_key: ctx.slotId,
      schema_name: OUTPUT_CONTRACT,
      schema: ctx.executionMode === 'codex_cli' ? cliRoleSchema(ctx.slotId) : ROLE_OUTPUT_SCHEMA,
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
      // The CLI message already contains the complete context packet.
      context_payloads: args.ctx.executionMode === 'codex_cli' ? [] : [args.contextPacket],
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
    const contextPacket = await this.buildContextPacket({ ctx, runtimeInvocationContextHash: ric, sourceHashes });
    const runtimeProfile = this.resolveRuntimeProfile(input.slot_id);
    const modelProfile = this.resolveModelProfile(input.slot_id, input.execution_mode, input.run_mode, input.model_option_id);
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: handoff.request.title_card_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_id: N6_NODE_ID,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: PROMPT_TEMPLATE_ID_BY_SLOT[input.slot_id],
      prompt_template_version: configuredPrompt(input.slot_id).version,
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

// ============================================================================
// f5 (T-127 W-07) — N6 divergent-debate RUNTIME ENTRY: drives the shared core over the 3 fan-out roles
// via core.runDivergentLoop, runs the f3 deterministic admission, then BRIDGES the arbiter's unwrapped
// synthesized_candidate_set through the EXISTING N6 single-agent draft path so the gate-facing draft
// carries single-agent identity (the deterministic N6 candidate-set gate stays untouched; it is wired
// in f6). Mirrors the N8 bounded-debate runtime entry (runDebate). The harness is NOT touched here.
// ============================================================================

export type GenerateTopicSelectionV1bN6DivergentDebateInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  generation_mode: TopicSelectionV1bN6DraftGenerationMode;
  /** T-128 W-14: `provider_llm` is REPRESENTABLE (pre-wired: per-family model_option_id already
   *  threads from a named execution plan) but DORMANT — the runDivergentDebate entry guard rejects
   *  it while TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant holds. Live wiring lands with W-19. */
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_cli' | 'codex_assisted' | 'mocked_llm' | 'provider_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  /** per-role, per-instance codex/mock fixtures: role_outputs[slot][instanceIndex] (fan-out). */
  role_outputs?: Partial<Record<TopicSelectionV1bN6DivergentDebateRoleSlotId, V1bN6DebateInputs[]>>;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
  /** T-127 W-09: optional provider-diverse execution plan (role-family-keyed). Absent -> byte-identical. */
  execution_plan?: TopicSelectionNamedDebateExecutionPlan<TopicSelectionV1bN6DivergentDebateRoleSlotId> | null;
  /** Legacy per-loop model_option_id channel: the single fallback option applied to EVERY role family with
   *  no per-family plan entry (it becomes the base ctx.modelOptionId). Mutually exclusive with execution_plan
   *  (the plan is the sole override channel) — co-supplying both is rejected up front (pre-provider_llm
   *  hardening; inert today because no caller supplies a legacy id). Absent (null) -> base ctx.modelOptionId
   *  stays null, i.e. byte-identical to pre-W09. */
  model_option_id?: string | null;
};

export type TopicSelectionV1bN6DivergentDebateRunResult =
  | {
    status: 'role_blocked';
    loop: DivergentDebateLoopResult<TopicSelectionV1bN6DivergentDebateRoleSlotId, TopicSelectionV1bN6DivergentDebateRoleOutput, TopicSelectionV1bN6DivergentDebateRoleArtifact>;
  }
  | { status: 'admission_blocked'; admission: TopicSelectionV1bN6DivergentDebateAdmissionResult }
  | {
    status: 'completed';
    admission: Extract<TopicSelectionV1bN6DivergentDebateAdmissionResult, { admitted: true }>;
    /** The semantic-support draft the harness N6 gate consumes (single-agent identity). */
    gate_draft: Awaited<ReturnType<TopicSelectionV1bN6DraftRuntimeService['generateDraftArtifact']>> | Awaited<ReturnType<typeof recordDebateDerivedDraft>>;
    loop_transcript_hash: string;
  };

type NonProviderN6DebateInput = GenerateTopicSelectionV1bN6DivergentDebateInput & {
  execution_mode: 'codex_cli' | 'codex_assisted' | 'mocked_llm';
};

type CompletedN6Debate = Extract<TopicSelectionV1bN6DivergentDebateRunResult, { status: 'completed' }>;
type N6DebateReceipt = {
  schema_version: 'TopicSelectionV1bN6DebateReceipt@v1';
  request_hash: string;
  input_hash: string;
  generation_mode: TopicSelectionV1bN6DraftGenerationMode;
  role_artifacts: TopicSelectionV1bN6DivergentDebateRoleArtifact[];
  result: CompletedN6Debate;
};

function debateReceiptKey(request: TopicSelectionV1bWorkflowHarnessRunRequest): string {
  return `topic-selection.v1b.n6-debate.${canonicalHash([request.workflow_run_id, request.node_id, request.node_attempt_id])}`;
}

function debateRequestHash(request: TopicSelectionV1bWorkflowHarnessRunRequest): string {
  return canonicalHash({
    workflow_run_id: request.workflow_run_id, node_id: request.node_id,
    node_attempt_id: request.node_attempt_id, policy_version: request.policy_version,
    workspace_id: request.workspace_id ?? null, title_card_id: request.title_card_id ?? null,
    frozen_input: request.frozen_input,
  });
}

export class TopicSelectionV1bN6DivergentDebateRuntimeService {
  private static readonly activeRuns = new WeakMap<TopicSelectionControlPlaneService, Map<string, {
    inputHash: string;
    result: Promise<TopicSelectionV1bN6DivergentDebateRunResult>;
  }>>();
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService;
  private readonly agentOrchestrator: TopicSelectionAgentOrchestratorService;
  private readonly core: TopicSelectionBoundedDebateCoreService;
  private readonly resolveResearchContext: ((request: TopicSelectionV1bWorkflowHarnessRunRequest) => Promise<Record<string, unknown>>) | undefined;
  private readonly singleAgent: TopicSelectionV1bN6DraftRuntimeService;
  private readonly strategy: V1bN6DivergentDebateStrategy;

  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: {
      agentOrchestrator?: TopicSelectionAgentOrchestratorService;
      resolveResearchContext?: (request: TopicSelectionV1bWorkflowHarnessRunRequest) => Promise<Record<string, unknown>>;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      promptPacketRuntime?: TopicSelectionPromptPacketRuntimeService;
      singleAgentRuntime?: TopicSelectionV1bN6DraftRuntimeService;
    } = {},
  ) {
    this.resolveResearchContext = options.resolveResearchContext;
    this.contextPolicyProfileRegistry = options.contextPolicyProfileRegistry
      ?? new TopicSelectionContextPolicyProfileRegistryService();
    this.modelProfileRegistry = options.modelProfileRegistry ?? new TopicSelectionModelProfileRegistryService();
    this.promptPacketRuntime = options.promptPacketRuntime ?? new TopicSelectionPromptPacketRuntimeService();
    this.agentOrchestrator = options.agentOrchestrator ?? new TopicSelectionAgentOrchestratorService({
      controlPlane,
      modelProfileRegistry: this.modelProfileRegistry,
    });
    this.core = new TopicSelectionBoundedDebateCoreService({
      controlPlane: this.controlPlane,
      agentOrchestrator: this.agentOrchestrator,
    });
    this.singleAgent = options.singleAgentRuntime ?? new TopicSelectionV1bN6DraftRuntimeService(controlPlane, {
      agentOrchestrator: this.agentOrchestrator,
      contextPolicyProfileRegistry: this.contextPolicyProfileRegistry,
      modelProfileRegistry: this.modelProfileRegistry,
      promptPacketRuntime: this.promptPacketRuntime,
    });
    this.strategy = new V1bN6DivergentDebateStrategy(
      this.contextPolicyProfileRegistry,
      this.modelProfileRegistry,
      this.promptPacketRuntime,
      this.controlPlane,
    );
  }

  /** T-128 W-14 dormancy gate: throws 409 while the shared const says dormant (D8: opened only by
   *  the W-19 code change after the calibration_gate_release sign-off — never a runtime artifact check). */
  private assertProviderDebatePathOpen(): void {
    if (TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED',
        `N6 divergent-debate provider_llm execution is pre-wired but DORMANT (T-128 W-14): debate prompts are pre-calibration skeletons and the path opens only via the W-19 turn-on after a ${TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.release_sign_off_scope} sign-off (${TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.release_sign_off_contract}). Run the debate with codex_assisted or mocked_llm role outputs instead.`);
    }
  }

  async runDivergentDebate(
    input: GenerateTopicSelectionV1bN6DivergentDebateInput,
  ): Promise<TopicSelectionV1bN6DivergentDebateRunResult> {
    // Fail closed before replay or writes until the provider path has its live output/bridge wiring.
    if (input.execution_mode === 'provider_llm') {
      this.assertProviderDebatePathOpen();
      throw new AppError(500, 'INTERNAL_ERROR',
        'provider_llm N6 divergent-debate turn-on (W-19) must wire live role outputs, the gate-bridge provenance, and the runMode default before lifting the dormancy guard.');
    }
    if (input.execution_mode === 'codex_cli' && (input.role_outputs != null
      || input.execution_plan != null || input.model_option_id != null)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Codex CLI generates its own role outputs and does not accept external answers or gateway model options.');
    }
    const mixingError = debateExecutionPlanMixingError(input.execution_plan ?? null, input.model_option_id);
    if (mixingError) throw new AppError(400, 'INVALID_PAYLOAD', mixingError);
    if (input.execution_mode !== 'codex_cli' && input.generation_mode === 'initial_from_n5') {
      const slots = TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER;
      if (!input.role_outputs || Object.keys(input.role_outputs).some((slot) => !slots.some((known) => known === slot))) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Regular N6 Debate requires the configured Explorer/Critic/Arbiter outputs.');
      }
      for (const slot of slots) {
        const outputs = input.role_outputs?.[slot];
        if (!Array.isArray(outputs) || outputs.length !== TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_DEFAULT_INSTANCE_COUNTS[slot]
          || outputs.some((output, index) => !output || (output.instance_index != null && output.instance_index !== index)
            || (input.execution_mode === 'codex_assisted'
              ? !output.codex_response || output.mocked_output != null
              : input.execution_mode !== 'mocked_llm' || !output.mocked_output || output.codex_response != null))) {
          throw new AppError(400, 'INVALID_PAYLOAD', `Regular N6 Debate ${slot} requires its exact bounded instance count and matching ${input.execution_mode} responses.`);
        }
      }
    }
    const runMode = input.run_mode ?? input.request.run_mode ?? (input.execution_mode === 'mocked_llm' ? 'test' : input.execution_mode === 'codex_cli' ? 'product' : 'acceptance');
    if (input.execution_mode === 'codex_cli' && !this.resolveResearchContext) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Codex Debate requires the product frozen-research context resolver.');
    }
    const researchContext = input.execution_mode === 'codex_cli' ? await this.resolveResearchContext!(input.request) : undefined;
    const inputHash = canonicalHash({
      ...(input.execution_mode === 'codex_cli' ? {
        research_context_hash: canonicalHash(researchContext), runner: this.agentOrchestrator.codexCliExecutionIdentity,
        roles: TOPIC_SELECTION_V1B_N6_DIVERGENT_DEBATE_ROLE_ORDER.map(slot => ({
          prompt: configuredPrompt(slot), schema: cliRoleSchema(slot),
          model_profile_hash: this.modelProfileRegistry.resolveProfile({
            profile_id: MODEL_PROFILE_BY_SLOT[slot], execution_mode: 'codex_cli', run_mode: runMode, model_option_id: null,
          }).profile_hash,
          context_profile_hash: this.contextPolicyProfileRegistry.resolveProfile({
            context_policy_profile_id: CONTEXT_PROFILE_BY_SLOT[slot], invocation_slot_id: slot,
          }).profile_hash,
        })),
      } : {}),
      request_hash: debateRequestHash(input.request),
      generation_mode: input.generation_mode, execution_mode: input.execution_mode, run_mode: runMode,
      profile_id: input.request.profile_id ?? null,
      execution_spec: input.request.execution_spec ?? null,
      execution_plan: input.execution_plan ?? null, model_option_id: input.model_option_id ?? null,
      role_outputs: input.role_outputs,
    });
    const key = debateReceiptKey(input.request);
    let active = TopicSelectionV1bN6DivergentDebateRuntimeService.activeRuns.get(this.controlPlane);
    if (!active) {
      active = new Map();
      TopicSelectionV1bN6DivergentDebateRuntimeService.activeRuns.set(this.controlPlane, active);
    }
    const pending = active.get(key);
    if (pending) {
      if (pending.inputHash !== inputHash) throw new AppError(409, 'VERSION_CONFLICT', 'N6 Debate attempt is executing different frozen input or role outputs.');
      return pending.result;
    }
    const result = this.resumeOrRun({ ...input, execution_mode: input.execution_mode }, inputHash, researchContext);
    active.set(key, { inputHash, result });
    try { return await result; } finally { active.delete(key); }
  }

  private async readReceipt(request: TopicSelectionV1bWorkflowHarnessRunRequest): Promise<N6DebateReceipt | null> {
    const artifact = await this.controlPlane.getArtifactRefByStableKey(debateReceiptKey(request));
    if (!artifact) return null;
    const receipt = artifact.payload as N6DebateReceipt | null;
    if (!receipt || receipt.schema_version !== 'TopicSelectionV1bN6DebateReceipt@v1'
      || artifact.artifact_kind !== 'diagnostic' || artifact.workflow_run_id !== request.workflow_run_id
      || artifact.checksum !== canonicalHash(receipt)
      || receipt.request_hash !== debateRequestHash(request)
      || receipt.result?.status !== 'completed' || receipt.result.gate_draft.status !== 'succeeded') {
      throw new AppError(409, 'VERSION_CONFLICT', 'N6 Debate receipt does not match the frozen attempt.');
    }
    return receipt;
  }

  /** The existing product gate uses this support-only receipt to bind regular review to its exact draft. */
  async hasInitialDebateDraft(
    request: TopicSelectionV1bWorkflowHarnessRunRequest,
    draft: TopicSelectionV1bWorkflowHarnessSemanticSupportArtifactRef,
  ): Promise<boolean> {
    const receipt = await this.readReceipt(request);
    return receipt?.generation_mode === 'initial_from_n5'
      && receipt.result.gate_draft.status === 'succeeded'
      && canonicalHash(receipt.result.gate_draft.semantic_artifact) === canonicalHash(draft);
  }

  private async resumeOrRun(
    input: NonProviderN6DebateInput,
    inputHash: string,
    researchContext?: Record<string, unknown>,
  ): Promise<TopicSelectionV1bN6DivergentDebateRunResult> {
    const receipt = await this.readReceipt(input.request);
    if (receipt) {
      if (receipt.input_hash !== inputHash) throw new AppError(409, 'VERSION_CONFLICT', 'N6 Debate replay requires the original frozen input, execution settings and role outputs.');
      return receipt.result;
    }
    return this.executeDebate(input, inputHash, researchContext);
  }

  private async executeDebate(
    input: NonProviderN6DebateInput,
    inputHash: string,
    researchContext?: Record<string, unknown>,
  ): Promise<TopicSelectionV1bN6DivergentDebateRunResult> {
    const runMode = input.run_mode ?? input.request.run_mode ?? (input.execution_mode === 'mocked_llm' ? 'test' : input.execution_mode === 'codex_cli' ? 'product' : 'acceptance');
    // Shared N6 context resolved via the SAME public resolver the single-agent draft path uses
    // (resolveSharedN6RuntimeContext — DMP-10 one resolution method). The gate bridge below re-invokes
    // generateDraftArtifact, which resolves it AGAIN from the same request+mode; that re-resolution is
    // deterministic (pure reads + canonicalHash, no control-plane writes within a run), so the bridged
    // draft's sourceHashes lineage matches the debate roles'. (Threading `shared` into the bridge to
    // skip the second resolve is a possible optimization, not a correctness requirement.)
    const shared = await this.singleAgent.resolveSharedN6RuntimeContext(input.request, input.generation_mode);
    const handoff: V1bN6DebateHandoff = {
      request: input.request,
      frozenPayload: shared.frozenPayload,
      candidateGenerationMode: shared.generationMode,
      modeContext: shared.modeContext,
      decisionMemory: shared.decisionMemory,
      researchContext,
      baseSourceHashes: { ...shared.sourceHashes, ...(researchContext ? { research_context_hash: canonicalHash(researchContext) } : {}) },
      baseSourceRefs: shared.sourceRefs,
      executionPlan: input.execution_plan ?? null,
    };

    const loop = await this.core.runDivergentLoop<
      V1bN6DebateHandoff,
      TopicSelectionV1bN6DivergentDebateRoleSlotId,
      TopicSelectionV1bN6DivergentDebateRoleOutput,
      TopicSelectionV1bN6DivergentDebateRoleArtifact,
      V1bN6DebateInputs
    >(
      this.strategy,
      {
        handoff,
        workflowRunId: input.request.workflow_run_id,
        nodeAttemptId: input.request.node_attempt_id,
        executionMode: input.execution_mode,
        runMode,
        policyVersion: input.request.policy_version,
        // Legacy per-loop fallback option (null today); the plan resolver takes precedence per role family.
        modelOptionId: input.model_option_id ?? null,
        createdBy: input.created_by ?? input.request.created_by ?? 'system',
      },
      // perInstance ALWAYS sets instance_index to the core's fan-out index (the sole worker
      // disambiguator — the strategy throws if it is missing); per-instance fixtures ride role_outputs.
      (slot, instanceIndex) => {
        const fixture = (input.role_outputs?.[slot] ?? [])[instanceIndex];
        return {
          codex_response: fixture?.codex_response ?? null,
          mocked_output: fixture?.mocked_output ?? null,
          instance_index: instanceIndex,
        };
      },
    );
    if (loop.status !== 'completed') {
      return { status: 'role_blocked', loop };
    }

    // Admission's expected-identity builder is bound to THIS run's resolved handoff so it re-derives each
    // fan-out instance's identity through the same hooks the runtime used (byte-consistent by construction).
    const admission = new TopicSelectionV1bN6DivergentDebateAdmissionService({
      buildAdmissionExpectedIdentity: (admissionInput) => this.strategy.buildAdmissionExpectedIdentityFor(handoff, admissionInput),
    });
    const admissionResult = await admission.admit({
      role_results: loop.ordered_role_artifacts.map((artifact, index) => ({
        artifact,
        structured_output: loop.turns[index]!.structured_output,
      })),
      loop_transcript_hash: loop.loop_transcript_hash,
    });
    if (!admissionResult.admitted) {
      return { status: 'admission_blocked', admission: admissionResult };
    }

    // GATE BRIDGE: the arbiter's synthesized_candidate_set is already a bare candidate-set draft
    // (admission enforced isN6DraftPayload). Funnel it through the EXISTING single-agent draft path so
    // the gate-facing draft carries single-agent identity — threading the debate's REAL execution_mode as
    // codex_response (codex) or mocked_output (mocked), never silently re-recording one as the other.
    const draftPayload = admissionResult.synthesized_candidate_set as unknown as TopicSelectionV1bTopicQuestionCandidateSetDraftPayload;
    const bridgeFixtureId = `n6_debate_bridge_${input.request.node_attempt_id}`;
    const gateDraft = input.execution_mode === 'codex_cli'
      ? await recordDebateDerivedDraft(this.controlPlane, {
        request: input.request, slot_id: 'n6_question_candidate_draft', final_role: loop.final_role_artifact,
        loop_transcript_hash: loop.loop_transcript_hash,
      })
      : await this.singleAgent.generateDraftArtifact({
      request: input.request,
      generation_mode: handoff.candidateGenerationMode,
      execution_mode: input.execution_mode,
      run_mode: runMode,
      codex_response: input.execution_mode === 'codex_assisted'
        ? {
          output: draftPayload,
          operator_label: bridgeFixtureId,
          response_hash: canonicalHash(draftPayload),
        } as unknown as TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>
        : null,
      mocked_output: input.execution_mode === 'mocked_llm'
        ? {
          output: draftPayload,
          fixture_id: bridgeFixtureId,
          fixture_hash: canonicalHash(draftPayload),
        } as unknown as TopicSelectionMockedAgentOutput<TopicSelectionV1bTopicQuestionCandidateSetDraftPayload>
        : null,
      created_by: input.created_by ?? input.request.created_by ?? 'system',
    });
    const result: CompletedN6Debate = {
      status: 'completed',
      admission: admissionResult,
      gate_draft: gateDraft,
      loop_transcript_hash: loop.loop_transcript_hash,
    };
    if (gateDraft.status === 'succeeded') {
      const receipt: N6DebateReceipt = {
        schema_version: 'TopicSelectionV1bN6DebateReceipt@v1',
        request_hash: debateRequestHash(input.request), input_hash: inputHash,
        generation_mode: input.generation_mode,
        role_artifacts: loop.ordered_role_artifacts,
        result,
      };
      await this.controlPlane.recordArtifactRef({
        stable_key: debateReceiptKey(input.request),
        workspace_id: input.request.workspace_id ?? null, title_card_id: input.request.title_card_id ?? null,
        workflow_run_id: input.request.workflow_run_id, artifact_kind: 'diagnostic', storage_kind: 'inline',
        payload: receipt as unknown as Record<string, unknown>, checksum: canonicalHash(receipt),
        created_by: input.created_by ?? input.request.created_by ?? 'system',
      });
    }
    return result;
  }
}
