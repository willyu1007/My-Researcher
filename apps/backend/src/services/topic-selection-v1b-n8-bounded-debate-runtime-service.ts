// T-123 Phase 3 (STEP 7 + 9) — v1b N8 bounded-debate runtime: drives the shared bounded-debate
// CORE over the 4 N8 roles (assessor_draft -> value_critic -> assessor_repair -> synthesizer_final),
// then BRIDGES the synthesizer's assessment_draft through the EXISTING single-agent draft path so
// the gate-facing n8_value_assessment_draft carries single-agent identity (the deterministic N8
// gate stays untouched). The expensive N7->N8 resolution is reused from the single-agent runtime
// (resolveSharedN8RuntimeContext); the per-role context/refs are built inline (v1c pattern).
// Compression facts are not yet wired on this path (deferred STEP-7 obligation — see the strategy).

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
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_LOOP_ID,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS,
  type TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection,
  type TopicSelectionV1bN8BoundedDebateRoleSlotId,
  type TopicSelectionV1bN8HarnessFrozenInputPayload,
  type TopicSelectionV1bTopicValueAssessmentDraftPayload,
  type TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { ResolvedTopicSelectionDecisionMemoryPacket } from './topic-selection-decision-memory-projection-service.js';
import {
  TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS,
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
  type BoundedDebateLoopResult,
} from './topic-selection-bounded-debate-core-service.js';
import type {
  BoundedDebateRoleContext,
  BoundedDebateStrategy,
  BoundedDebateInvocationEnvelope,
} from './topic-selection-bounded-debate-strategy.js';
import {
  TopicSelectionV1bN8ValueAssessmentRuntimeService,
} from './topic-selection-v1b-n8-value-assessment-runtime-service.js';
import {
  TopicSelectionV1bN8BoundedDebateAdmissionService,
  type TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity,
  type TopicSelectionV1bN8BoundedDebateAdmissionResult,
  type TopicSelectionV1bN8BoundedDebateRoleArtifact,
  type TopicSelectionV1bN8BoundedDebateRoleOutput,
} from './topic-selection-v1b-n8-bounded-debate-admission-service.js';

const N8_NODE_ID = 'topic-selection.v1b.assess-topic-value.v1' as const;
const DEBATE_LOOP_ID = TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_LOOP_ID;
const DEBATE_POLICY_ID = 'topic-selection.v1b.n8.bounded-micro-debate.v1' as const;
const OUTPUT_CONTRACT = TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION;
const PROMPT_TEMPLATE_ID = 'topic-selection.v1b.n8.bounded-micro-debate.runtime-role' as const;
const PROMPT_TEMPLATE_VERSION = 'v1' as const;
const DEFAULT_POLICY_VERSION = 'topic-selection-v1b-node-policy-v1' as const;

const ROLE_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: true,
  required: ['schema_version', 'role_slot'],
  properties: {
    schema_version: { type: 'string', minLength: 1 },
    role_slot: { enum: [...TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER] },
  },
} as const;

const CONTEXT_PROFILE_BY_SLOT: Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string> = {
  n8_debate_assessor_draft: TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.assessor_draft,
  n8_debate_value_critic: TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.value_critic,
  n8_debate_assessor_repair: TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.assessor_repair,
  n8_debate_synthesizer_final: TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS.synthesizer_final,
};

/** Pre-resolved shared N8 context, resolved ONCE per run and threaded as the core's opaque handoff. */
interface V1bN8DebateHandoff {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  frozenPayload: TopicSelectionV1bN8HarnessFrozenInputPayload;
  projectionRef: TopicSelectionFunctionalRef;
  projectionHash: string;
  projection: TopicSelectionV1bN7ToN8TopicQuestionContractContextProjection;
  decisionMemory: ResolvedTopicSelectionDecisionMemoryPacket | null;
  baseSourceHashes: Record<string, string>;
  requiredStructureManifest: unknown;
  requiredStructureManifestHash: string;
  baseSourceRefs: TopicSelectionFunctionalRef[];
}

type V1bN8DebateInputs = {
  codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bN8BoundedDebateRoleOutput> | null;
  mocked_output: TopicSelectionMockedAgentOutput<TopicSelectionV1bN8BoundedDebateRoleOutput> | null;
};

type V1bN8DebateRoleContext = BoundedDebateRoleContext<
  V1bN8DebateHandoff,
  TopicSelectionV1bN8BoundedDebateRoleSlotId,
  TopicSelectionV1bN8BoundedDebateRoleArtifact,
  V1bN8DebateInputs
>;

export type GenerateTopicSelectionV1bN8DebateInput = {
  request: TopicSelectionV1bWorkflowHarnessRunRequest;
  execution_mode: Extract<TopicSelectionAgentExecutionMode, 'codex_assisted' | 'mocked_llm'>;
  run_mode?: TopicSelectionAgentRunMode | null;
  /** per-role codex/mock outputs (keyed by role slot id). */
  role_outputs: Partial<Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, V1bN8DebateInputs>>;
  created_by?: TopicSelectionV1bWorkflowHarnessRunRequest['created_by'];
};

export type TopicSelectionV1bN8DebateRunResult =
  | { status: 'role_blocked'; loop: BoundedDebateLoopResult<TopicSelectionV1bN8BoundedDebateRoleSlotId, TopicSelectionV1bN8BoundedDebateRoleOutput, TopicSelectionV1bN8BoundedDebateRoleArtifact> }
  | { status: 'admission_blocked'; admission: TopicSelectionV1bN8BoundedDebateAdmissionResult }
  | {
    status: 'completed';
    admission: Extract<TopicSelectionV1bN8BoundedDebateAdmissionResult, { admitted: true }>;
    /** The semantic-support artifact the harness gate consumes (single-agent identity). */
    gate_draft: Awaited<ReturnType<TopicSelectionV1bN8ValueAssessmentRuntimeService['generateDraftArtifact']>>;
    loop_transcript_hash: string;
  };

export class TopicSelectionV1bN8BoundedDebateRuntimeService {
  private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService;
  private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService;
  private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService;
  private readonly agentOrchestrator: TopicSelectionAgentOrchestratorService;
  private readonly core: TopicSelectionBoundedDebateCoreService;
  private readonly singleAgent: TopicSelectionV1bN8ValueAssessmentRuntimeService;
  private readonly strategy: V1bN8DebateStrategy;

  constructor(
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: {
      agentOrchestrator?: TopicSelectionAgentOrchestratorService;
      contextPolicyProfileRegistry?: TopicSelectionContextPolicyProfileRegistryService;
      modelProfileRegistry?: TopicSelectionModelProfileRegistryService;
      promptPacketRuntime?: TopicSelectionPromptPacketRuntimeService;
      singleAgentRuntime?: TopicSelectionV1bN8ValueAssessmentRuntimeService;
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
    this.core = new TopicSelectionBoundedDebateCoreService({
      controlPlane: this.controlPlane,
      agentOrchestrator: this.agentOrchestrator,
    });
    this.singleAgent = options.singleAgentRuntime ?? new TopicSelectionV1bN8ValueAssessmentRuntimeService(controlPlane, {
      agentOrchestrator: this.agentOrchestrator,
      contextPolicyProfileRegistry: this.contextPolicyProfileRegistry,
      modelProfileRegistry: this.modelProfileRegistry,
      promptPacketRuntime: this.promptPacketRuntime,
    });
    this.strategy = new V1bN8DebateStrategy(
      this.contextPolicyProfileRegistry,
      this.modelProfileRegistry,
      this.promptPacketRuntime,
    );
  }

  async runDebate(input: GenerateTopicSelectionV1bN8DebateInput): Promise<TopicSelectionV1bN8DebateRunResult> {
    const runMode = input.run_mode ?? input.request.run_mode ?? (input.execution_mode === 'mocked_llm' ? 'test' : 'acceptance');
    const shared = await this.singleAgent.resolveSharedN8RuntimeContext(input.request);
    const handoff: V1bN8DebateHandoff = {
      request: input.request,
      frozenPayload: shared.frozenPayload,
      projectionRef: shared.projection.ref,
      projectionHash: shared.projection.hash,
      projection: shared.projection.payload,
      decisionMemory: shared.decisionMemory,
      baseSourceHashes: shared.sourceHashes,
      requiredStructureManifest: shared.requiredStructureManifest,
      requiredStructureManifestHash: canonicalHash(shared.requiredStructureManifest),
      baseSourceRefs: this.strategy.baseSourceRefs(input.request, shared.frozenPayload, shared.projection.payload, shared.projection.ref),
    };

    const loop = await this.core.runLoop<
      V1bN8DebateHandoff,
      TopicSelectionV1bN8BoundedDebateRoleSlotId,
      TopicSelectionV1bN8BoundedDebateRoleOutput,
      TopicSelectionV1bN8BoundedDebateRoleArtifact,
      V1bN8DebateInputs
    >(
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
    if (loop.status !== 'completed') {
      return { status: 'role_blocked', loop };
    }

    // Admission's expected-identity builder is bound to THIS run's resolved handoff so it re-derives
    // each role's identity through the same hooks the runtime used (byte-consistent by construction).
    const admission = new TopicSelectionV1bN8BoundedDebateAdmissionService({
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

    // STEP 9 gate bridge: funnel the synthesizer's assessment_draft through the EXISTING single-agent
    // draft path so the gate-facing n8_value_assessment_draft artifact carries single-agent identity.
    // Thread the debate's REAL execution_mode (07-spec STEP 9) so a codex_assisted debate is bridged
    // as codex_response (correct provenance), not silently re-recorded as a mock fixture; only a
    // mocked_llm debate uses mocked_output. (A mocked_llm debate in product run_mode is rejected by the
    // orchestrator by design — the honest mocked-cannot-run-in-product invariant, DMP-09.)
    const draftPayload = admissionResult.assessment_draft as unknown as TopicSelectionV1bTopicValueAssessmentDraftPayload;
    const bridgeFixtureId = `n8_debate_bridge_${input.request.node_attempt_id}`;
    const gateDraft = await this.singleAgent.generateDraftArtifact({
      request: input.request,
      execution_mode: input.execution_mode,
      run_mode: runMode,
      codex_response: input.execution_mode === 'codex_assisted'
        ? {
          output: draftPayload,
          operator_label: bridgeFixtureId,
          response_hash: canonicalHash(draftPayload),
        } as unknown as TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload>
        : null,
      mocked_output: input.execution_mode === 'mocked_llm'
        ? {
          output: draftPayload,
          fixture_id: bridgeFixtureId,
          fixture_hash: canonicalHash(draftPayload),
        } as unknown as TopicSelectionMockedAgentOutput<TopicSelectionV1bTopicValueAssessmentDraftPayload>
        : null,
      created_by: input.created_by ?? input.request.created_by ?? 'system',
    });
    return {
      status: 'completed',
      admission: admissionResult,
      gate_draft: gateDraft,
      loop_transcript_hash: loop.loop_transcript_hash,
    };
  }
}

/**
 * v1b N8 bounded-debate strategy: owns the per-role byte-bearing computation. Reuses the
 * single-agent base context (threaded via the handoff) and builds debate sourceHashes / ric /
 * context packet / role artifact inline (v1c pattern). Compression is NOT wired on this path yet:
 * runtimeTokenBudget passes compression_attempt: null (the single-agent's own default when no
 * compression attempt is requested — runtime-service.ts runtimeCompressionAttempt short-circuits to
 * null), and the debate input exposes no compression path. The base+critic required-compression-fact
 * builder (spec STEP-7 obligation) is deferred to a compression-capable debate input — it only
 * affects the compression-triggered path and does NOT perturb the byte-verified no-compression
 * identity (see the runtimeTokenBudget note below).
 *
 * Prior-role binding: unlike v1c's debate strategy, this path deliberately does NOT thread a
 * prompt-packet-level dynamic_material_refs (so the prompt packet records dynamic_material_refs_hash:
 * null + a PROMPT_DYNAMIC_MATERIAL_NOT_APPLICABLE note). The prior-role chain is still fully
 * identity-bound three other ways — the RIC's debate_context.dynamic_material_refs_hash and
 * parent_invocation_attempt_ids_hash (both folded from priorRoleArtifactHashes), the source_hashes
 * prior_role_artifact_hashes_hash, and admission's validatePriorRoleHashes chain check — so the
 * omission is an intentional identity-shape divergence from v1c, not a copy-paste gap. Adding the
 * prompt-packet refs would be a byte-bearing change (re-baselines every v1b N8 debate prompt_packet_hash)
 * and is only warranted if prompt-packet parity with v1c becomes a product requirement.
 */
class V1bN8DebateStrategy implements BoundedDebateStrategy<
  V1bN8DebateHandoff,
  TopicSelectionV1bN8BoundedDebateRoleSlotId,
  TopicSelectionV1bN8BoundedDebateRoleOutput,
  TopicSelectionV1bN8BoundedDebateRoleArtifact,
  V1bN8DebateInputs
> {
  readonly roleOrder = TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER;
  readonly debateLoopId = DEBATE_LOOP_ID;

  constructor(
    private readonly contextPolicyProfileRegistry: TopicSelectionContextPolicyProfileRegistryService,
    private readonly modelProfileRegistry: TopicSelectionModelProfileRegistryService,
    private readonly promptPacketRuntime: TopicSelectionPromptPacketRuntimeService,
  ) {}

  // ---------------------------------------------------------------- shared-core hooks

  assertInput(): void {
    // shared N8 context already validated when resolved (resolveSharedN8RuntimeContext); no-op.
  }

  sourceHashes(ctx: V1bN8DebateRoleContext): Record<string, string> {
    return {
      ...ctx.handoff.baseSourceHashes,
      prior_role_artifact_hashes_hash: this.hash(ctx.priorRoleArtifactHashes),
    };
  }

  runtimeInvocationContextObject(ctx: V1bN8DebateRoleContext, sourceHashes: Record<string, string>): unknown {
    const index = this.roleOrder.indexOf(ctx.slotId);
    return {
      schema_version: TOPIC_SELECTION_RUNTIME_INVOCATION_CONTEXT_SCHEMA_VERSION,
      invocation_slot_id: this.invocationSlotId(ctx.slotId),
      scenario_context: {
        identity_policy: 'semantic_identity',
        scenario_id: 'v1b_n8_topic_value_assessment',
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
        agent_instance_id: null,
        parent_invocation_attempt_ids_hash: this.hash(ctx.priorRoleArtifactHashes),
        dynamic_material_refs_hash: this.hash(ctx.priorRoleArtifactHashes),
      },
      required_structure_manifest_hash: ctx.handoff.requiredStructureManifestHash,
    };
  }

  buildContextPacket(args: {
    ctx: V1bN8DebateRoleContext;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Record<string, unknown> {
    const { ctx, sourceHashes } = args;
    const runtimeProfile = this.resolveRuntimeProfile(ctx.slotId);
    return {
      schema_version: 'TopicSelectionV1bN8BoundedDebateRoleContextPacket@v1',
      node_id: N8_NODE_ID,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: ctx.nodeAttemptId,
      slot_id: ctx.slotId,
      invocation_slot_id: this.invocationSlotId(ctx.slotId),
      context_family: 'v1b_n8_topic_value_assessment',
      policy_version: ctx.handoff.request.policy_version,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      redaction_policy: TOPIC_SELECTION_CONTEXT_RUNTIME_REDACTION_POLICY,
      non_authority: true,
      source_refs: ctx.handoff.baseSourceRefs,
      source_hashes: sourceHashes,
      frozen_input_payload: ctx.handoff.frozenPayload,
      n7_to_n8_projection_ref: ctx.handoff.projectionRef,
      n7_to_n8_projection_hash: ctx.handoff.projectionHash,
      n7_to_n8_projection: ctx.handoff.projection,
      required_structure_manifest: ctx.handoff.requiredStructureManifest,
      decision_memory_packet_ref: ctx.handoff.decisionMemory?.ref ?? null,
      decision_memory_packet_hash: ctx.handoff.decisionMemory?.hash ?? null,
      decision_memory: ctx.handoff.decisionMemory?.packet ?? null,
      prior_role_artifact_hashes: ctx.priorRoleArtifactHashes,
    };
  }

  contextArtifactScope(ctx: V1bN8DebateRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return { workspace_id: ctx.handoff.request.workspace_id ?? null, title_card_id: ctx.handoff.request.title_card_id ?? null };
  }

  outputArtifactScope(ctx: V1bN8DebateRoleContext): { workspace_id: string | null; title_card_id: string | null } {
    return this.contextArtifactScope(ctx);
  }

  messages(
    ctx: V1bN8DebateRoleContext,
    contextPacket: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content: [
          'Act as exactly one fixed role in the Topic Selection v1b N8 bounded value-assessment debate.',
          'Use only the supplied frozen N7->N8 refs, hashes, context packet, and prior role artifact hashes.',
          'Do not output TopicValueAssessment authority, N8ToN9 handoff, N8ToN7 feedback, route decisions, gate disposition, trial ledger changes, or candidate changes.',
          'assessor_draft/assessor_repair/synthesizer_final carry assessment_draft (TopicValueAssessmentDraft@v1); value_critic carries critic_findings; the synthesizer is the only gate-facing output after deterministic admission.',
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
    ctx: V1bN8DebateRoleContext;
  }): BoundedDebateInvocationEnvelope<TopicSelectionV1bN8BoundedDebateRoleOutput> {
    const { ctx } = args;
    return {
      workspace_id: ctx.handoff.request.workspace_id ?? null,
      title_card_id: ctx.handoff.request.title_card_id ?? null,
      node_id: N8_NODE_ID,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: ctx.nodeAttemptId,
      invocation_attempt_id: `${ctx.nodeAttemptId}.${ctx.slotId}.runtime_role`,
      execution_mode: ctx.executionMode,
      executor_kind: this.executorKind(ctx.executionMode),
      run_mode: ctx.runMode,
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
      output_contract: OUTPUT_CONTRACT,
      model_option_id: ctx.modelOptionId,
      prompt: { promptTemplateId: PROMPT_TEMPLATE_ID, version: PROMPT_TEMPLATE_VERSION },
      prompt_variant_key: this.invocationSlotId(ctx.slotId),
      schema_name: OUTPUT_CONTRACT,
      schema: ROLE_OUTPUT_SCHEMA as unknown as Record<string, unknown>,
      created_by: ctx.createdBy,
    };
  }

  runtimeTokenBudget(args: {
    ctx: V1bN8DebateRoleContext;
    runtimeInvocationContextHash: string;
    contextPacket: Record<string, unknown>;
  }): TopicSelectionAgentRuntimeTokenBudgetInput {
    const runtimeProfile = this.resolveRuntimeProfile(args.ctx.slotId);
    return {
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      context_payloads: [args.contextPacket],
      // No compression on the debate path yet (matches the single-agent default: it also emits a
      // null compression_attempt unless one is requested). The base+critic required-compression-fact
      // builder is the deferred STEP-7 obligation; it would only populate this when a compression
      // attempt is supplied, so leaving it null preserves the byte-verified no-compression identity.
      compression_attempt: null,
    };
  }

  invocationPassthrough(ctx: V1bN8DebateRoleContext): {
    codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionV1bN8BoundedDebateRoleOutput> | null;
    mocked_output: TopicSelectionMockedAgentOutput<TopicSelectionV1bN8BoundedDebateRoleOutput> | null;
  } {
    return {
      codex_response: ctx.invocationInputs.codex_response ?? null,
      mocked_output: ctx.invocationInputs.mocked_output ?? null,
    };
  }

  assembleRoleArtifact(args: {
    ctx: V1bN8DebateRoleContext;
    structuredOutput: TopicSelectionV1bN8BoundedDebateRoleOutput;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionV1bN8BoundedDebateRoleOutput>;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    outputRef: TopicSelectionArtifactFunctionalRef;
    outputHash: string;
    auditHash: string;
  }): TopicSelectionV1bN8BoundedDebateRoleArtifact {
    const runtimeProfile = this.resolveRuntimeProfile(args.ctx.slotId);
    return {
      slot_id: args.ctx.slotId,
      node_id: N8_NODE_ID,
      workflow_run_id: args.ctx.workflowRunId,
      node_attempt_id: args.ctx.nodeAttemptId,
      policy_version: args.ctx.policyVersion ?? DEFAULT_POLICY_VERSION,
      execution_mode: args.ctx.executionMode,
      run_mode: args.ctx.runMode,
      allowed_effect: 'support_only',
      role_artifact_ref: args.outputRef,
      role_artifact_hash: args.outputHash,
      normalized_output_ref: args.outputRef,
      normalized_output_hash: args.outputHash,
      output_contract: OUTPUT_CONTRACT,
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
      model_option_id: args.invocation.provenance.model_option_id,
      prompt_packet_hash: args.invocation.provenance.prompt_packet_hash,
      structured_output_hash: args.outputHash,
      context_policy_profile_id: runtimeProfile.profile.context_policy_profile_id,
      context_policy_profile_version: runtimeProfile.profile.context_policy_profile_version,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      prompt_variant_key: this.invocationSlotId(args.ctx.slotId),
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      redaction_policy: runtimeProfile.profile.redaction_policy,
      source_hashes: args.sourceHashes,
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
    artifact: TopicSelectionV1bN8BoundedDebateRoleArtifact,
  ): { slotId: TopicSelectionV1bN8BoundedDebateRoleSlotId; hash: string } {
    return { slotId: artifact.slot_id, hash: artifact.role_artifact_hash };
  }

  // ---------------------------------------------------------------- admission expected identity

  /** Bound to the resolved handoff per-run (see expectedIdentityBuilderFor); re-derives the role's
   *  expected identity through the SAME hooks the runtime used, so it byte-matches by construction. */
  async buildAdmissionExpectedIdentityFor(
    handoff: V1bN8DebateHandoff,
    input: {
      slot_id: TopicSelectionV1bN8BoundedDebateRoleSlotId;
      prior_role_artifacts: TopicSelectionV1bN8BoundedDebateRoleArtifact[];
      workflow_run_id: string;
      node_attempt_id: string;
      policy_version: string;
      execution_mode: TopicSelectionAgentExecutionMode;
      run_mode: TopicSelectionAgentRunMode;
      model_option_id: string | null;
      normalized_payload_hash: string;
    },
  ): Promise<TopicSelectionV1bN8BoundedDebateAdmissionExpectedIdentity> {
    const priorRoleArtifactHashes: Partial<Record<TopicSelectionV1bN8BoundedDebateRoleSlotId, string>> = {};
    for (const artifact of input.prior_role_artifacts) {
      priorRoleArtifactHashes[artifact.slot_id] = artifact.role_artifact_hash;
    }
    const ctx: V1bN8DebateRoleContext = {
      handoff,
      slotId: input.slot_id,
      priorRoleArtifacts: input.prior_role_artifacts,
      priorRoleArtifactHashes,
      invocationInputs: { codex_response: null, mocked_output: null },
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
    const modelProfile = this.resolveModelProfile(input.execution_mode, input.run_mode, input.model_option_id);
    const promptPacket = this.promptPacketRuntime.buildPromptPacket({
      title_card_id: handoff.request.title_card_id ?? null,
      workflow_run_id: input.workflow_run_id,
      node_id: N8_NODE_ID,
      node_attempt_id: input.node_attempt_id,
      prompt_template_id: PROMPT_TEMPLATE_ID,
      prompt_template_version: PROMPT_TEMPLATE_VERSION,
      prompt_variant_key: this.invocationSlotId(input.slot_id),
      invocation_slot_id: this.invocationSlotId(input.slot_id),
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
      prompt_variant_key: this.invocationSlotId(input.slot_id),
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

  // ---------------------------------------------------------------- reuse seam (source refs)

  /** Built inline (v1c pattern): the validated N7->N8 source refs (frozen + projection). */
  baseSourceRefs(
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

  // ---------------------------------------------------------------- internals

  private resolveRuntimeProfile(slotId: TopicSelectionV1bN8BoundedDebateRoleSlotId): TopicSelectionResolvedContextPolicyProfile {
    return this.contextPolicyProfileRegistry.resolveProfile({
      context_policy_profile_id: CONTEXT_PROFILE_BY_SLOT[slotId],
      invocation_slot_id: this.invocationSlotId(slotId),
    });
  }

  private resolveModelProfile(
    executionMode: TopicSelectionAgentExecutionMode,
    runMode: TopicSelectionAgentRunMode,
    modelOptionId: string | null,
  ): TopicSelectionResolvedModelProfile {
    return this.modelProfileRegistry.resolveProfile({
      profile_id: TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate,
      execution_mode: executionMode,
      run_mode: runMode,
      model_option_id: modelOptionId,
    });
  }

  private invocationSlotId(slotId: TopicSelectionV1bN8BoundedDebateRoleSlotId): string {
    return TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS[
      slotId === 'n8_debate_assessor_draft' ? 'assessor_draft'
        : slotId === 'n8_debate_value_critic' ? 'value_critic'
          : slotId === 'n8_debate_assessor_repair' ? 'assessor_repair'
            : 'synthesizer_final'
    ];
  }

  private executorKind(executionMode: TopicSelectionAgentExecutionMode): TopicSelectionExecutorKind {
    return executionMode === 'codex_assisted' ? 'codex_assisted' : 'single_agent';
  }

  private uniqueRefs(values: Array<TopicSelectionFunctionalRef | null | undefined>): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const out: TopicSelectionFunctionalRef[] = [];
    for (const ref of values) {
      if (!ref) continue;
      const key = stableStringify({ ref_type: ref.ref_type, ref_id: ref.ref_id, version_id: ref.version_id ?? null, title_card_id: ref.title_card_id ?? null });
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(ref);
    }
    return out;
  }

  private hash(value: unknown): string {
    return canonicalHash(value);
  }
}
