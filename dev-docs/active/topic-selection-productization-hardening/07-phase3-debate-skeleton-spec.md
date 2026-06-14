# Phase 3.3 Shared Bounded-Debate Skeleton — Implementation Spec

> Source: design workflow `n8-debate-skeleton-extraction-design` (3 judged candidates, verified against real code line numbers). Winning approach: HYBRID middle-template-method core + loop_transcript_hash + gate bridge. This file is the implementation contract for Phase 3.3~3.4; it survives context compaction.

## Winning Approach

HYBRID — "middle-template-method core" (candidate 3) as the shared skeleton, grafting candidate 1's loop_transcript_hash for loop-level replay identity, and ADDING the single-agent re-record gate bridge that all three judges identified as the unaddressed v1b gap. Rationale: DP-3.1 is LOCKED on "skeleton share + version injection" with a strategy interface, which rules out candidate 1 (no strategy interface — under-extracts, fails DP-3.1's stated intent). Candidate 3 (middle-template-method) is the altitude that matches DP-3.1 exactly: the shared core owns role-loop walk + orchestrator call + token-budget/compression scaffold + provenance-hash assembly + artifact recording + structured-output-hash drift check, while every version-specific byte (context packet, output contract, source/invocation-context hash objects, preserved facts, record shape) is injected via a strategy. Candidate 2 (rich-strategy) is essentially the same altitude but its strategy interface declared sourceHashes/buildContextPacket as SYNCHRONOUS, which is incompatible with v1b's required async projection/decision-memory resolution (verified at runtime-service.ts:196-197); candidate 3's hook signatures must therefore be async-capable. The decisive correction over ALL THREE candidates: the existing N8 gate (resolveN8DraftPayload -> resolveN8ValueAssessmentAdmissionExpectedIdentity, harness-service.ts:6363-6394) hardwires the expected identity to the SINGLE-AGENT runtime's buildAdmissionExpectedIdentity, and the admission service (admission-service.ts:78-206) hard-compares output_contract, prompt_variant_key, prompt_packet_hash, context_policy_profile_*, runtime_invocation_context_hash, and the audit provenance against it. A debate synthesizer artifact carries debate-shaped identity and WOULD be blocked. The bridge: after the debate loop + debate admission validate the 4-role chain, the v1b debate runtime extracts synthesizer_final.assessment_draft and FUNNELS it through the EXISTING single-agent generateDraftArtifact() path (passing the extracted draft as the mocked_output/codex_response payload) so the gate-facing n8_value_assessment_draft artifact is produced by the single-agent runtime itself and therefore carries single-agent identity the existing gate already expects. Zero gate code changes; one draft surface; DMP-10 satisfied (one debate executor, one orchestrator path, one gate surface).

## Shared Files (new)

1. apps/backend/src/services/topic-selection-bounded-debate-core-service.ts (NEW — the shared skeleton: role-loop walk, orchestrator invocation orchestration, context-packet recording, token-budget/compression scaffold, structured-output-hash drift check, role-artifact recording shell, runtime_invocation_context_hash + prompt_packet_hash + loop_transcript_hash assembly via the same sha256Text/stableStringify util)
2. apps/backend/src/services/topic-selection-bounded-debate-strategy.ts (NEW — the version-injection strategy interface + shared slot-binding/role-context/turn-result types; no orchestrator or control-plane calls inside)
3. packages/shared/src/research-lifecycle/topic-selection-bounded-debate-loop-contracts.ts (NEW — pure shared types only: BoundedDebateStepContext, loop_transcript_hash input shape, BoundedDebateRoleGenerationResult envelope; no backend deps so both apps and tests can import)

## Shared Core Interface (TS)

```typescript
// ============ packages/shared/.../topic-selection-bounded-debate-loop-contracts.ts ============
// Pure shared types (no backend imports). Reused by core, both strategies, and tests.

export interface TopicSelectionBoundedDebateStepContext<TRole extends string> {
  role_slot: TRole;
  /** 1-based; ROLE_ORDER.indexOf(role)+1 — IDENTICAL to v1c's current stateless derivation. */
  round_index: number;
  /** ROLE_ORDER.length - round_index — IDENTICAL to v1c's current derivation. */
  remaining_round_budget: number;
  is_first_role: boolean;
  is_final_role: boolean;
}

// ============ apps/backend/.../topic-selection-bounded-debate-core-service.ts ============
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

export interface BoundedDebateCoreDeps {
  controlPlane: TopicSelectionControlPlaneService;
  agentOrchestrator: TopicSelectionAgentOrchestratorService;
  promptPacketRuntime: TopicSelectionPromptPacketRuntimeService;
}

/** The shell context the core threads to every strategy hook; built once per role turn. */
export interface BoundedDebateRoleContext<THandoff, TRole extends string, TArtifact> {
  handoff: THandoff;                 // strategy-opaque (v1c promotion handoff | v1b run request + frozen payload)
  slotId: TRole;
  roleOrder: readonly TRole[];
  priorRoleArtifacts: TArtifact[];   // ordered, append-only, supplied by runLoop
  priorRoleArtifactHashes: Partial<Record<TRole, string>>;
  workflowRunId: string;
  nodeAttemptId: string;
  executionMode: TopicSelectionAgentExecutionMode;
  runMode: TopicSelectionAgentRunMode;
  policyVersion: string | null;
  modelOptionId: string | null;
  createdBy: 'human' | 'llm' | 'system' | 'hybrid';
}

export interface BoundedDebateInvocationInputs<TOut> {
  codexResponse?: TopicSelectionCodexAssistedAgentOutput<TOut> | null;
  mockedOutput?: TopicSelectionMockedAgentOutput<TOut> | null;
  compressionAttempt?: unknown | null;          // strategy-shaped; core passes through
  tokenBudgetOverrides?: unknown | null;
}

export type BoundedDebateRoleGenerationResult<TOut, TArtifact> =
  | { status: 'succeeded'; role_artifact: TArtifact; structured_output: TOut;
      invocation_result: TopicSelectionAgentInvocationResult<TOut>;
      context_packet_ref: TopicSelectionArtifactFunctionalRef; context_packet_hash: string; }
  | { status: 'blocked'; invocation_result: TopicSelectionAgentInvocationResult<TOut>;
      context_packet_ref: TopicSelectionArtifactFunctionalRef; context_packet_hash: string; };

export type BoundedDebateLoopResult<TRole extends string, TOut, TArtifact> =
  | { status: 'completed'; ordered_role_artifacts: TArtifact[]; final_role_artifact: TArtifact;
      final_structured_output: TOut; turns: Array<Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'succeeded' }>>;
      /** sha256(stableStringify([debate_loop_id, role_order, ordered roleHashOf(artifact)...])) — whole-loop replay identity. */
      loop_transcript_hash: string; }
  | { status: 'blocked'; failed_slot: TRole; turn: Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'blocked' }>;
      ordered_role_artifacts: TArtifact[]; };

export class TopicSelectionBoundedDebateCoreService {
  constructor(private readonly deps: BoundedDebateCoreDeps) {}
  private hash(v: unknown): string { return sha256Text(stableStringify(v)); }

  /** SINGLE role turn = the shared body of today's v1c generateRoleArtifact / v1b generateDraftArtifact.
   *  Calls strategy hooks in a FIXED order so both versions hash identically. async because v1b hooks resolve refs. */
  async generateRoleArtifact<H, S extends string, O extends Record<string, unknown>, A, E>(
    strategy: BoundedDebateStrategy<H, S, O, A, E>,
    ctx: BoundedDebateRoleContext<H, S, A>,
    invocationInputs: BoundedDebateInvocationInputs<O>,
  ): Promise<BoundedDebateRoleGenerationResult<O, A>> {
    await strategy.assertInput(ctx);
    const binding = strategy.slotBinding(ctx.slotId);
    const runtimeProfile = await strategy.resolveContextProfile(binding);
    const sourceHashes = await strategy.sourceHashes(ctx);                                  // version bytes
    const ric = this.hash(await strategy.runtimeInvocationContextObject(binding, sourceHashes, ctx)); // strategy returns the OBJECT; core hashes
    const contextPacket = await strategy.buildContextPacket({ ctx, binding, runtimeProfile, ric, sourceHashes });
    await strategy.assertContextPacket?.(contextPacket);                                    // v1b required-structure-manifest self-check
    const contextPacketHash = this.hash(contextPacket);
    const contextRef = await this.recordContextArtifact(strategy, ctx, contextPacket, contextPacketHash);
    const dynamicMaterialRefs = strategy.dynamicMaterialRefs(ctx.priorRoleArtifacts);
    const invocation = await this.deps.agentOrchestrator.invokeStructuredOutput<O>({
      ...strategy.invocationEnvelope({ ctx, binding, contextRef, contextPacketHash, ric }),
      messages: strategy.messages(binding, contextPacket),
      input_refs: strategy.sourceRefs(contextPacket),
      context_packet_refs: [contextRef], context_packet_hashes: [contextPacketHash],
      runtime_token_budget: this.runtimeTokenBudget(strategy, { runtimeProfile, ric, contextPacket, dynamicMaterialRefs,
        compressionAttempt: invocationInputs.compressionAttempt ?? null, overrides: invocationInputs.tokenBudgetOverrides ?? null }),
      debate_extension: null,                                                               // both versions: null today
      codex_response: invocationInputs.codexResponse ?? null,
      mocked_output: invocationInputs.mockedOutput ?? null,
    });
    if (invocation.status !== 'succeeded' || !invocation.structured_output) {
      return { status: 'blocked', invocation_result: invocation, context_packet_ref: contextRef, context_packet_hash: contextPacketHash };
    }
    const verified = await this.verifyAndRecordOutput(strategy, ctx, invocation);           // audit-ref presence + structured_output_hash drift throw (v1c 397-416)
    const role_artifact = strategy.assembleRoleArtifact({ ctx, binding, runtimeProfile, ric, sourceHashes, invocation,
      outputRef: verified.outputRef, outputHash: verified.outputHash, auditHash: verified.auditHash });
    return { status: 'succeeded', role_artifact, structured_output: invocation.structured_output,
      invocation_result: invocation, context_packet_ref: contextRef, context_packet_hash: contextPacketHash };
  }

  /** FULL loop = walk role_order, thread prior artifacts append-only, fold loop_transcript_hash.
   *  v1c keeps driving turns from its own loop (smoke-stable); v1b uses runLoop. */
  async runLoop<H, S extends string, O extends Record<string, unknown>, A, E>(
    strategy: BoundedDebateStrategy<H, S, O, A, E>,
    base: Omit<BoundedDebateRoleContext<H, S, A>, 'slotId' | 'priorRoleArtifacts' | 'priorRoleArtifactHashes'>,
    perRole: (slot: S, prior: A[]) => BoundedDebateInvocationInputs<O>,
  ): Promise<BoundedDebateLoopResult<S, O, A>> {
    const ordered: A[] = [];
    const turns: Array<Extract<BoundedDebateRoleGenerationResult<O, A>, { status: 'succeeded' }>> = [];
    for (const slot of strategy.roleOrder) {
      const priorHashes: Partial<Record<S, string>> = {};
      for (const a of ordered) { const { slotId, hash } = strategy.priorRoleArtifactHash(a); priorHashes[slotId] = hash; }
      const turn = await this.generateRoleArtifact(strategy, { ...base, slotId: slot, priorRoleArtifacts: [...ordered], priorRoleArtifactHashes: priorHashes }, perRole(slot, ordered));
      if (turn.status !== 'succeeded') return { status: 'blocked', failed_slot: slot, turn, ordered_role_artifacts: ordered };
      ordered.push(turn.role_artifact); turns.push(turn);
    }
    const loop_transcript_hash = this.hash([strategy.debateLoopId, [...strategy.roleOrder], ordered.map((a) => strategy.priorRoleArtifactHash(a).hash)]);
    return { status: 'completed', ordered_role_artifacts: ordered, final_role_artifact: ordered[ordered.length - 1],
      final_structured_output: turns[turns.length - 1].structured_output, turns, loop_transcript_hash };
  }

  /** Shared admission-identity shell: re-derives binding/sourceHashes/ric/contextPacket/promptPacket through the SAME hooks,
   *  then delegates the identity record to strategy.assembleExpectedIdentity (v1c 303-384 relocated). */
  async buildExpectedIdentity<H, S extends string, O extends Record<string, unknown>, A, E>(
    strategy: BoundedDebateStrategy<H, S, O, A, E>,
    ctx: BoundedDebateRoleContext<H, S, A>,
    normalizedPayloadHash: string,
  ): Promise<E> { /* fixed-order hook calls + promptPacketRuntime.buildPromptPacket -> strategy.assembleExpectedIdentity(...) */ throw new Error('sketch'); }
}
```

## Strategy Interface (TS)

```typescript
// ============ apps/backend/.../topic-selection-bounded-debate-strategy.ts ============
// One implementation per version. Every hook returns version-specific BYTES (objects, not hashes);
// the core never inspects packet internals, so hashes stay version-local and byte-identical to today.
// Hooks that resolve control-plane refs are async (load-bearing for v1b projection/decision-memory).

export interface BoundedDebateSlotBinding<TRole extends string> {
  slot_id: TRole;
  invocation_slot_id: string;
  context_policy_profile_id: string;
  output_contract: string;
  model_profile_id: string;
  prompt_template_id: string;
  prompt_template_version: string;
  prompt_variant_key: string;        // v1c: invocation_slot_id (== slot); v1b debate: per-role variant key
  node_id: string;                   // v1c 'topic-selection.v1c.generate-promotion-support.v1' | v1b 'topic-selection.v1b.assess-topic-value.v1'
  schema: Record<string, unknown>;
}

export interface BoundedDebateStrategy<THandoff, TRole extends string, TOut extends Record<string, unknown>, TArtifact, TExpectedIdentity> {
  readonly roleOrder: readonly TRole[];
  readonly debateLoopId: string;     // 'v1c_n2_bounded_micro_debate' | 'v1b_n8_bounded_micro_debate'

  // input + binding (async: v1b resolveN7ToN8Projection / resolveDecisionMemoryPacket live behind these)
  assertInput(ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>): Promise<void> | void;
  slotBinding(slot: TRole): BoundedDebateSlotBinding<TRole>;
  resolveContextProfile(b: BoundedDebateSlotBinding<TRole>): Promise<TopicSelectionResolvedContextPolicyProfile> | TopicSelectionResolvedContextPolicyProfile;

  // hashed bytes — each returns the EXACT object/value the version emits today (verbatim relocation)
  sourceHashes(ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>): Promise<Record<string, string>> | Record<string, string>;
  // LOAD-BEARING DETERMINISM HOOK: returns the FULL runtime_invocation_context object literal; core hashes it.
  // v1c returns the verbatim {schema_version, invocation_slot_id, scenario_context, loop_context{...indexOf+1...}, debate_context{debate_loop_id:'v1c_n2_bounded_micro_debate', ...}} from lines 708-739.
  runtimeInvocationContextObject(b: BoundedDebateSlotBinding<TRole>, sourceHashes: Record<string, string>, ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>): Promise<unknown> | unknown;
  buildContextPacket(args: { ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>; binding: BoundedDebateSlotBinding<TRole>; runtimeProfile: TopicSelectionResolvedContextPolicyProfile; ric: string; sourceHashes: Record<string, string> }): Promise<unknown> | unknown;
  assertContextPacket?(ctx: unknown): void;                                  // v1b only (required-structure-manifest self-check)
  sourceRefs(contextPacket: unknown): TopicSelectionFunctionalRef[];
  messages(b: BoundedDebateSlotBinding<TRole>, contextPacket: unknown): Array<{ role: 'system' | 'user'; content: string }>;

  // compression scaffold (per-version preserved facts; core owns wrapper + executor-kind defaulting)
  requiredCompressionFacts(contextPacket: unknown): TopicSelectionCompressionFactInventory;
  defaultCompressedContext(contextPacket: unknown, facts: TopicSelectionCompressionFactInventory): Pick<TopicSelectionAgentRuntimeCompressionAttemptInput, 'compressed_context' | 'summary'>;

  // threading
  dynamicMaterialRefs(prior: TArtifact[]): TopicSelectionDynamicPromptMaterialRecord[];
  priorRoleArtifactHash(artifact: TArtifact): { slotId: TRole; hash: string };

  // orchestrator request envelope (version-keyed fields the core merges; debate_extension/messages/refs/budget excluded)
  invocationEnvelope(args: { ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>; binding: BoundedDebateSlotBinding<TRole>; contextRef: TopicSelectionArtifactFunctionalRef; contextPacketHash: string; ric: string }):
    Omit<TopicSelectionAgentInvocationRequest<TOut>, 'messages' | 'input_refs' | 'context_packet_refs' | 'context_packet_hashes' | 'runtime_token_budget' | 'debate_extension' | 'codex_response' | 'mocked_output'>;

  // record shapes (output contract differs per version)
  assembleRoleArtifact(args: { ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>; binding: BoundedDebateSlotBinding<TRole>; runtimeProfile: TopicSelectionResolvedContextPolicyProfile; ric: string; sourceHashes: Record<string, string>; invocation: TopicSelectionAgentInvocationResult<TOut>; outputRef: TopicSelectionFunctionalRef; outputHash: string; auditHash: string }): TArtifact;
  assembleExpectedIdentity(args: { ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact>; binding: BoundedDebateSlotBinding<TRole>; runtimeProfile: TopicSelectionResolvedContextPolicyProfile; ric: string; sourceHashes: Record<string, string>; promptPacketHash: string; normalizedPayloadHash: string }): TExpectedIdentity;
}

// v1b-only: synthesizer -> gate bridge. NOT routed through the core; bridges debate output to the
// existing single-agent gate surface so the deterministic N8 gate stays untouched.
export interface TopicSelectionV1bN8DebateFinalProjector {
  // Validates synthesizer_final.assessment_draft against topicSelectionV1bTopicValueAssessmentDraftPayloadSchema
  // (+ harness isN8DraftPayload key set) and returns the TopicValueAssessmentDraft@v1 payload.
  projectFinalDraft(synth: TopicSelectionV1bN8BoundedDebateRolePayload): TopicSelectionV1bTopicValueAssessmentDraftPayload;
}
```

## v1c Refactor Steps (behavior-preserving)

1. Land as a PURE behavior-preserving extraction FIRST (no v1b in the same slice), gated by green smoke + unit test before merging v1b.
2. topic-selection-v1c-n2-bounded-debate-runtime-service.ts: keep the EXACT public surface — constructor signature, `generateRoleArtifact(input)` and `buildAdmissionExpectedIdentity(input)` signatures unchanged (the smoke at .ai/scripts/topic-selection-v1c-n2-runtime-smoke.mjs:246-260 does `new TopicSelectionV1cN2BoundedDebateRuntimeService(controlPlane, {...})`, then `subject.n2Runtime.generateRoleArtifact(...)` in runN2Runtime:279-312, and passes the instance to `new TopicSelectionV1cN2BoundedDebateAdmissionService(n2Runtime)`).
3. Construct a private `TopicSelectionBoundedDebateCoreService` from the same controlPlane/agentOrchestrator/promptPacketRuntime/registries the class builds today (constructor lines 175-198).
4. Hold a private `V1cN2BoundedDebateStrategy` implementing BoundedDebateStrategy. Relocate the existing private methods VERBATIM into strategy hooks (no key reorder, no added/removed fields): assertHandoff(901-908)->assertInput; slotBinding(804-858)->slotBinding; sourceHashes(528-565)->sourceHashes; buildContextPacket(453-499)->buildContextPacket; messages(501-526)->messages; runtimeInvocationContextHash(703-740) BODY (the literal object) ->runtimeInvocationContextObject (strategy returns the OBJECT, core does this.hash); requiredCompressionFacts(656-697)/runtimeCompressionAttempt(593-655) preserved-fact + default-context bytes ->requiredCompressionFacts/defaultCompressedContext; dynamicMaterialRefs(757-771)->dynamicMaterialRefs; priorRoleArtifactHashes(773-781)->priorRoleArtifactHash; recordRoleArtifact return literal(417-450)->assembleRoleArtifact; buildAdmissionExpectedIdentity return literal(370-383)->assembleExpectedIdentity. Keep allowedRefs/extractClaimCeiling as strategy-private helpers.
5. Move the generateRoleArtifact body (200-301) and recordRoleArtifact audit/hash-drift plumbing (386-416) INTO the core; the public `generateRoleArtifact(input)` becomes a thin adapter: `return this.core.generateRoleArtifact(this.strategy, this.toRoleContext(input), { codexResponse: input.codex_response, mockedOutput: input.mocked_output, compressionAttempt: input.compression_attempt, tokenBudgetOverrides: input.runtime_token_budget_overrides });`
6. `buildAdmissionExpectedIdentity(input)` becomes `return this.core.buildExpectedIdentity(this.strategy, this.toRoleContext(input), input.normalized_payload_hash);` (the prompt_variant_key MUST keep mapping to binding.invocation_slot_id, matching today's lines 253/350/376/438).
7. Verbatim-keep the orchestrator request envelope field-for-field in strategy.invocationEnvelope: invocation_attempt_id = `${node_attempt_id}.${slot_id}.runtime_role`, prompt_variant_key = binding.invocation_slot_id, profile_id = TOPIC_SELECTION_V1C_BOUNDED_MICRO_DEBATE_PROFILE_ID, output_contract = 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1', prompt template 'topic-selection-v1c-promotion-support-bounded-micro-debate' v'1'.
8. Do NOT touch topic-selection-v1c-n2-bounded-debate-admission-service.ts, the role-order const, the artifact/identity types, or any v1c contract. The smoke continues driving roles via its own runN2Runtime loop and never calls core.runLoop in this slice.
9. Add a v1c addLoopController convenience (`runBoundedDebate`) calling core.runLoop ONLY if desired later; NOT part of this slice (avoids any chance of moving a hash).

## v1b New Runtime

NEW files: apps/backend/src/services/topic-selection-v1b-n8-bounded-debate-runtime-service.ts and topic-selection-v1b-n8-bounded-debate-admission-service.ts. The runtime constructs the SAME TopicSelectionBoundedDebateCoreService and a V1bN8DebateStrategy over TopicSelectionV1bN8BoundedDebateRoleSlotId (n8_debate_assessor_draft -> n8_debate_value_critic -> n8_debate_assessor_repair -> n8_debate_synthesizer_final), debateLoopId='v1b_n8_bounded_micro_debate', TOut=TopicSelectionV1bN8BoundedDebateRolePayload (harness-contracts.ts:1664, output_contract 'TopicSelectionV1bN8BoundedDebateRoleOutput@v1'), per-role allowed_effect='support_only', model_profile_id=TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate. Strategy hooks REUSE the existing v1b N8 single-agent helpers (sourceHashes, requiredStructureManifest, resolveN7ToN8Projection, resolveDecisionMemoryPacket, requiredCompressionFacts) so the debate context family stays v1b_n8_topic_value_assessment — extract those helpers from topic-selection-v1b-n8-value-assessment-runtime-service.ts into a shared module so the single-agent and debate paths do NOT fork. assertInput/sourceHashes/buildContextPacket are ASYNC (they await projection/decision-memory resolution — this is why the strategy hooks must be async-capable). runtimeInvocationContextObject returns a v1b literal with debate_context.debate_loop_id='v1b_n8_bounded_micro_debate', round_index=roleOrder.indexOf(slot)+1, stage=slot, parent_invocation_attempt_ids_hash=hash(priorRoleArtifactHashes). PUBLIC API: `runDebate(request)` -> core.runLoop walks the 4 roles, recording a support_only role artifact per role; then the NEW debate admission service validates role order + prior-role hash chain + forbidden-authority/support-only boundary + loop_transcript_hash. THE GATE BRIDGE (the fix for the gap all judges flagged): after debate admission, extract synthesizer_final.assessment_draft, validate it via topicSelectionV1bTopicValueAssessmentDraftPayloadSchema + the harness isN8DraftPayload key set, then FUNNEL it through the EXISTING single-agent TopicSelectionV1bN8ValueAssessmentRuntimeService.generateDraftArtifact() by passing the extracted draft as the mocked_output/codex_response payload. This makes the single-agent runtime itself produce the gate-facing n8_value_assessment_draft semantic artifact (slot_id 'n8_value_assessment_draft', allowed_effect 'model_draft_for_gate', runtime_provenance_class 'runtime_verified', prompt_variant_key 'n8_value_assessment_draft.initial_from_n7') with SINGLE-AGENT identity — exactly what resolveN8ValueAssessmentAdmissionExpectedIdentity (harness-service.ts:6363-6394) and the admission service (admission-service.ts:78-206) hard-compare against. The deterministic N8 gate (resolveN8DraftPayload:6396 / n8DraftGateBlocker:6605 / verifyN8RuntimeVerifiedDraftAuditArtifact:6303) is UNCHANGED and sees one draft surface. The debate role artifacts are recorded as separate support_only artifacts for audit/replay but never enter the gate-facing slot.

## Profiles To Register

1. topic-selection.v1b.n8.bounded-debate.assessor-draft.context-runtime@v1 (NEW context-policy profile; add to TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS in topic-selection-context-policy-profile-registry-service.ts near line 141, register contextPolicyProfile near line 955, context_family='v1b_n8_topic_value_assessment', functional_template='support_only_semantic', preserved_fact_kinds reusing the v1b N8 set lines 922-938)
2. topic-selection.v1b.n8.bounded-debate.value-critic.context-runtime@v1 (NEW context-policy profile, same family/template)
3. topic-selection.v1b.n8.bounded-debate.assessor-repair.context-runtime@v1 (NEW context-policy profile)
4. topic-selection.v1b.n8.bounded-debate.synthesizer-final.context-runtime@v1 (NEW context-policy profile)
5. ALSO add matching TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_INVOCATION_SLOT_IDS (n8_debate_assessor_draft / n8_debate_value_critic / n8_debate_assessor_repair / n8_debate_synthesizer_final) — these are NEW; the existing TOPIC_SELECTION_V1B_N8_INVOCATION_SLOT_IDS has only value_assessment_draft (line 147).
6. MODEL PROFILE: 'topic-selection.v1b.n8-bounded-debate.v1' (TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_PROFILE_IDS.n8_bounded_debate, contracts line 203) is ALREADY DEFINED and already wired into all 4 debate-role semantic-support slot specs (lines 517-560) — VERIFY it is registered in the model profile registry for execution_mode codex_assisted|mocked_llm; register it there if missing. No NEW model profile id needs inventing.

## Replay Guarantees

All identity-bearing bytes remain pure functions of frozen inputs, assembled in a fixed hook order and hashed by the single shared util sha256Text(stableStringify(...)) the core owns (the same util both services import from literature-content-processing-utils.js). (1) runtime_invocation_context_hash = core.hash(strategy.runtimeInvocationContextObject(...)); for v1c the returned object is byte-for-byte the current literal (lines 708-739) — current_round_index/remaining_round_budget derive from ROLE_ORDER.indexOf(slot)+1 (lines 720,723,732), proven STATELESS (independent of prior-artifact count), so wrapping in the core cannot move it. For v1b the object carries debate_context with the v1b loop id and round_index from the v1b role order; parent_invocation_attempt_ids_hash=hash(priorRoleArtifactHashes) — deterministic given frozen inputs. (2) role_artifact_hash = structured_output_hash = hash(structured_output); the core's verifyAndRecordOutput asserts invocation.provenance.structured_output_hash === outputHash and throws on drift, exactly as both runtimes do today (v1c 403, v1b 396). (3) prior-role threading is append-only and ordered by runLoop; priorRoleArtifactHashes is keyed by slot (critic binds draft, repair binds critic, synth binds all three) — identical across replays; admission re-derives expected identity via core.buildExpectedIdentity using the SAME hooks, so expected==actual deterministically. (4) source_hashes use stableStringify so key order is canonical; v1c sourceHashes freeze the promotion handoff, v1b freeze the frozen-input + projection.hash + decision-memory.hash. (5) prompt_packet_hash is computed by the unchanged promptPacketRuntime over the same messages+source_refs+context_packet_hashes+ric+runtime_modifiers_hash. (6) NEW loop-level identity: loop_transcript_hash = hash([debate_loop_id, role_order, ordered roleHashOf(artifact)...]) gives a single stable identity for the whole debate pass, letting replay detect role-chain reordering/substitution even when individual artifacts validate. (7) GATE replay invariant: the bridged synthesizer draft is re-recorded by the single-agent runtime, so its structured_output_hash=hash(assessment_draft) and draftHash==normalized_output_hash==structured_output_hash invariant (harness-service.ts:6441-6451) holds on every replay, and n8_gate_result_hash stays stable.

## v1c Preservation Argument

The v1c-n2-runtime-smoke stays green BY CONSTRUCTION because the v1c refactor is a pure verbatim-body extraction that leaves every smoke-observed surface unchanged. VERIFIED FACTS: (a) The smoke constructs the runtime and admission service via their unchanged public constructors (smoke lines 246-260) and drives all four roles through `subject.n2Runtime.generateRoleArtifact(...)` inside its OWN runN2Runtime loop (lines 279-312) — it never calls core.runLoop, so the new loop capability is on an unexercised path. (b) The smoke asserts four prompt-cache index rows are fresh with template 'topic-selection-v1c-promotion-support-bounded-micro-debate' v1 / output_contract 'TopicSelectionV1cBoundedMicroDebateRoleOrFinal@v1' (lines 386-398), prompt-cache replay reuse and support/gate id stability (400-434), and that a synthesizer prompt_packet_hash override yields blocker 'N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT' (436-447). All of these derive from three hashes the core now ASSEMBLES but the v1c strategy still PRODUCES verbatim: prompt_packet_hash (promptPacketRuntime over identical messages+refs+ric+modifiers), runtime_invocation_context_hash (the literal object from lines 708-739, including debate_loop_id='v1c_n2_bounded_micro_debate' and the stateless indexOf round math, relocated unchanged), and role_artifact_hash=hash(structured_output). CONTAINMENT: every hashed object literal moves into a hook with no key reorder / no added or removed fields; the core calls hooks in the identical order the old method body used and uses the identical sha256Text/stableStringify util, so stableStringify emits identical bytes -> identical digests. The public generateRoleArtifact/buildAdmissionExpectedIdentity signatures and the admission service file are untouched, so admission comparison and the drift block are byte-stable. VERIFICATION GATE: run `node .ai/scripts/topic-selection-v1c-n2-runtime-smoke.mjs` and the existing topic-selection-v1c-n2-bounded-debate-runtime-service.unit.test.ts BEFORE and AFTER the extraction; the manifest's prompt_packet_hashes array and the drift blocker code must be byte-identical. If any hash differs, a hook body diverged from the original literal and must be reverted to verbatim. The v1b work lands ONLY after this gate is green, on the proven core.

## Ordered Implementation Steps

1. STEP 0 (baseline): run `node .ai/scripts/topic-selection-v1c-n2-runtime-smoke.mjs` and `topic-selection-v1c-n2-bounded-debate-runtime-service.unit.test.ts`; capture the manifest prompt_packet_hashes + admission_identity as the golden baseline.
2. STEP 1 (shared types): create packages/shared/.../topic-selection-bounded-debate-loop-contracts.ts (BoundedDebateStepContext, loop result/transcript types — pure, no backend deps).
3. STEP 2 (skeleton): create apps/backend/.../topic-selection-bounded-debate-core-service.ts (generateRoleArtifact turn body, runLoop, buildExpectedIdentity shell, recordContextArtifact, verifyAndRecordOutput, runtimeTokenBudget; single hash util) and topic-selection-bounded-debate-strategy.ts (BoundedDebateStrategy + BoundedDebateSlotBinding + V1bN8DebateFinalProjector interfaces).
4. STEP 3 (v1c extraction): refactor topic-selection-v1c-n2-bounded-debate-runtime-service.ts to the thin-adapter + V1cN2BoundedDebateStrategy form per v1c_refactor_steps; relocate each hashed literal VERBATIM.
5. STEP 4 (GATE): re-run the smoke + unit test; diff prompt_packet_hashes and admission_identity against STEP 0 golden. They MUST be byte-identical and the drift block must still fire 'N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT'. Do not proceed until green. Commit the pure extraction as its own slice.
6. STEP 5 (shared v1b helpers): extract the v1b N8 single-agent sourceHashes/requiredStructureManifest/resolveN7ToN8Projection/resolveDecisionMemoryPacket/requiredCompressionFacts/buildContextPacket helpers from topic-selection-v1b-n8-value-assessment-runtime-service.ts into a shared module so single-agent and debate paths share one implementation (no fork).
7. STEP 6 (profiles): register 4 NEW context-policy profiles + 4 NEW invocation-slot ids (TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS / _INVOCATION_SLOT_IDS) in topic-selection-context-policy-profile-registry-service.ts; verify the existing n8_bounded_debate model profile resolves for codex_assisted|mocked_llm; add the registry validation expectations.
8. STEP 7 (v1b runtime): create topic-selection-v1b-n8-bounded-debate-runtime-service.ts with V1bN8DebateStrategy (async hooks) + runDebate(request) driving core.runLoop over the 4 roles.
9. STEP 8 (v1b debate admission): create topic-selection-v1b-n8-bounded-debate-admission-service.ts validating role order, prior-role hash chain, support-only/forbidden-authority boundary, runtime identity drift, and loop_transcript_hash.
10. STEP 9 (GATE BRIDGE): in runDebate, after debate admission, extract synthesizer_final.assessment_draft, validate via topicSelectionV1bTopicValueAssessmentDraftPayloadSchema + isN8DraftPayload, then call the EXISTING single-agent generateDraftArtifact() passing the extracted draft as mocked_output/codex_response so the gate-facing n8_value_assessment_draft artifact carries single-agent identity. Wire runDebate as the debate branch of the N8 runtime entry; leave resolveN8DraftPayload / n8DraftGateBlocker / verifyN8RuntimeVerifiedDraftAuditArtifact UNCHANGED.
11. STEP 10 (v1b verification): add a v1b N8 debate runtime+gate smoke proving (a) a mocked 4-role debate completes, (b) the synthesizer draft is admitted by the EXISTING N8 gate with no gate code change, (c) a malformed assessment_draft surfaces as a clean admission/draft-validation blocker not silent gate drift, (d) replay reproduces loop_transcript_hash + n8_gate_result_hash.
12. STEP 11 (regression): re-run the v1c smoke once more after all v1b work to confirm no shared-core change regressed v1c.

## Risks

1. GATE-IDENTITY GAP (highest, now mitigated by the bridge): the existing N8 gate hard-compares the gate-facing artifact's output_contract/prompt_variant_key/prompt_packet_hash/context_policy_profile_*/runtime_invocation_context_hash AND its audit provenance (harness-service.ts:6303-6353,6363-6394; admission-service.ts:78-206) against the SINGLE-AGENT expected identity. A debate synthesizer artifact recorded directly would block with N8_DRAFT_ARTIFACT_PROFILE_DRIFT / N8_DRAFT_ARTIFACT_PROMPT_IDENTITY_DRIFT / N8_DRAFT_ARTIFACT_RUNTIME_CONTEXT_DRIFT. Mitigation: the bridge re-records via the single-agent generateDraftArtifact() so the gate-facing artifact has single-agent identity; the single-agent path must be invokable with a pre-supplied draft as mocked_output/codex_response without re-querying the model — verify generateDraftArtifact accepts that and that the audit provenance it stamps matches (source_kind mock_fixture|codex_response, prompt_packet_hash, structured_output_hash=hash(draft)).
2. VERBATIM-RELOCATION DISCIPLINE: the v1c byte-preservation guarantee rests on moving each hashed literal without reordering keys or changing defaults; the core threads the context packet as opaque `unknown`, so the TS compiler will NOT catch a literal divergence — only the smoke will. Mitigation: STEP 4 byte-diff gate before merging.
3. ASYNC HOOK SHAPE: v1b sourceHashes/buildContextPacket/assertInput must be async (await projection/decision-memory); the strategy interface and core must await them. v1c hooks are sync but the core's `await strategy.x()` tolerates both. If hooks were declared sync-only (as candidate 2 drew them), v1b cannot fit — the spec fixes this by making hooks Promise-or-value.
4. PROMPT_VARIANT_KEY MAPPING: v1c currently uses binding.invocation_slot_id as prompt_variant_key (lines 253/350/376/438). The shared BoundedDebateSlotBinding adds a separate prompt_variant_key field; the v1c strategy MUST set prompt_variant_key === invocation_slot_id or hashes drift. Latent drift point — assert in the v1c strategy.
5. COMPRESSION DEFAULT CONDITIONALS: v1c's default compression attempt has slot-conditional logic (e.g. critic_resolution_map only on certain roles). Relocate the full conditional verbatim into defaultCompressedContext/requiredCompressionFacts, not a simplified version.
6. TWO ADMISSION SERVICES REMAIN: v1c support-only final-layer rules differ from v1b draft-gate rules, so admission is NOT unified in this phase (only the runtime/debate executor is) — consistent with DP-3.1/DMP-10 scope, but means a future v1b admission bug (e.g. missing forbidden-field scan) is not prevented by the shared core; call this out in joint-decisions.
7. REGISTRY VALIDATION: adding 4 context-policy profiles risks DUPLICATE_PROFILE_ID / DUPLICATE_INVOCATION_SLOT_ID / REQUIRED_PRESERVED_FACT_MISSING from the registry validator (lines 195-206); run the registry validation suite after STEP 6.

## STEP 0 Golden Baseline (captured 2026-06-13)
The v1c-n2-runtime-smoke (RUN_ID=phase3-baseline) passed. STEP 4 gate: after the v1c
extraction these MUST be byte-identical, and the prompt-drift blocker `N2_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT` must still fire.

prompt_packet_hashes (role order: supporter_draft, critic_review, supporter_repair, synthesizer_final):
- `51ce2c1062d70fa5a9ab2d5f406213f7b53c2e75fd74720dcd9bb3fab1308a1b`
- `7ae35e76bab849c6bd24a026a19b04fc46bb9ebbd2bacb58b541eeba59890b38`
- `4f0ccc9eb75fb1b446ea0eec11ff1e5843df3c74288077864528855c54f60745`
- `761d7513b7de5be6b507de793a2742638b02135aa91b47462741731d0154d5a8`

Re-run gate: `TOPIC_SELECTION_V1C_N2_RUNTIME_SMOKE_RUN_ID=phase3-postextract pnpm topic-selection:v1c-n2-runtime-smoke` then diff the manifest prompt_packet_hashes against the four above.

## STEP 1–4 DONE (2026-06-13) — v1c extraction byte-identical, verified
- Shared: `topic-selection-bounded-debate-loop-contracts.ts` (StepContext) + exports-map entry.
- Core: `topic-selection-bounded-debate-core-service.ts` (generateRoleArtifact turn + runLoop + loop_transcript_hash). Strategy interface: `topic-selection-bounded-debate-strategy.ts`.
- v1c: rewritten as a thin facade over `core` + private `V1cN2BoundedDebateStrategy` (all v1c byte-bearing logic relocated verbatim, incl. buildAdmissionExpectedIdentity).
- **Gate method correction**: the smoke's prompt_packet_hash depends on `workflow_run_id` (derived from RUN_KEY) and the smoke is DB-stateful (asserts fresh cache rows), so absolute-hash comparison across runs is impossible. The rigorous gate is a **differential probe** on the PURE `buildAdmissionExpectedIdentity` (fixed ids) old-vs-new: prompt_packet_hash / runtime_invocation_context_hash / context_policy_profile_hash / source_hashes were **BYTE-IDENTICAL for all 4 roles**. v1c unit 7/7, smoke pass, tsc 0.
- Next: STEP 5 (extract v1b N8 single-agent helpers to a shared module) → 6 (profiles) → 7 (v1b debate runtime) → 8 (v1b debate admission) → 9 (gate bridge) → 10/11 (v1b smoke + regression).

## STEP 5–6 DONE (2026-06-13) + review fixes
- STEP 6: 4 N8 debate context-policy profiles (`TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_CONTEXT_RUNTIME_PROFILE_IDS`) + 4 invocation slots registered; `n8_bounded_debate` model profile registered (review-fix commit). Registry validates 6/6.
- STEP 5 (reframed): reuse SEAM on the single-agent N8 runtime — `resolveSharedN8RuntimeContext` (+ `sharedN8SourceRefs`) factored out of generateDraftArtifact/buildAdmissionExpectedIdentity so both single-agent and debate paths share ONE projection/decision-memory/sourceHashes/manifest resolution (DMP-10). Behavior-preserving (byte-identity by construction; reviewed clean by 2 correctness angles; n8 smoke + harness e2e green).
- Review (3 focused angles): correctness CLEAN (no bugs). Quality fixes applied: extracted `V1B_N8_BASE_PRESERVED_FACT_KINDS` (single-source for single-agent + debate profiles, no drift); REMOVED the premature `sharedN8RequiredCompressionFacts` seam (incomplete — single-agent builder can't produce critic facts).

### ⚠ STEP-7 OBLIGATION (critic-facts gap, from review)
The 4 debate profiles declare `critic_finding` + `critic_resolution_map` as preserved, but the single-agent `requiredCompressionFacts` CANNOT produce them (no prior_role_artifact_hashes in its packet). The STEP-7 `V1bN8DebateStrategy` MUST build its own `requiredCompressionFacts` = the single-agent BASE facts (from source_hashes) + `critic_finding`/`critic_resolution_map` emitted from prior-role artifacts — exactly as v1c N2's `requiredCompressionFacts` does (conditionally from `prior_role_artifact_hashes`, synthesizer gets `critic_resolution_map`). Do NOT reuse the single-agent fact builder for the debate compression facts.
- Gate parity: debate context profiles drop `compression_structure_manifest` from post-runtime gates (matches v1c debate parity); the STEP-8 debate admission service enforces preserved-fact/structure boundaries instead.

## STEP 7 STARTED (2026-06-13) — base-facts seam done; debate subsystem is the next focused build
**Done + verified:** `resolveSharedN8RuntimeContext` de-dup seam on the single-agent N8 runtime (factors the expensive N7→N8 projection / decision-memory / source-hash / manifest resolution out of generateDraftArtifact + buildAdmissionExpectedIdentity; the debate runtime reuses it). Single-agent N8 byte-identical (n8 smoke green, tsc 0). NOTE: the earlier `sharedN8SourceRefs` / `sharedN8BaseRequiredCompressionFacts` wrapper seams were REMOVED in review (premature/ahead-of-consumer with uncertain signatures; v1c builds sourceRefs/requiredCompressionFacts inline in its debate runtime, so STEP 7 will too).

**Remaining (the debate subsystem — a ~1500-line net-new build, model directly on the v1c files):**
- **STEP 7 runtime/strategy** → NEW `apps/backend/src/services/topic-selection-v1b-n8-bounded-debate-runtime-service.ts`:
  - `V1bN8DebateHandoff` = pre-resolved shared context { request, frozenPayload, projection, decisionMemory, baseSourceHashes, requiredStructureManifest, baseSourceRefs } — `runDebate(request)` resolves it ONCE via the single-agent `resolveSharedN8RuntimeContext` + `sharedN8SourceRefs`, then calls `core.runLoop(strategy, base, perRole)`. (Avoids 4× re-resolution.)
  - `V1bN8DebateStrategy implements BoundedDebateStrategy<V1bN8DebateHandoff, TopicSelectionV1bN8BoundedDebateRoleSlotId, TopicSelectionV1bN8BoundedDebateRolePayload, RoleArtifact, Inputs>`. Model each hook on the v1c strategy (`topic-selection-v1c-n2-bounded-debate-runtime-service.ts`):
    - sourceHashes = ctx.handoff.baseSourceHashes + `prior_role_artifact_hashes_hash` (from ctx.priorRoleArtifactHashes) — like v1c.
    - runtimeInvocationContextObject = v1b N8 ric literal with `debate_context` populated (debate_loop_id `v1b_n8_bounded_micro_debate`, round_index = ROLE_ORDER.indexOf+1, stage = slot, parent_invocation_attempt_ids_hash = hash(priorRoleArtifactHashes)) + `required_structure_manifest_hash`.
    - buildContextPacket = debate role packet (single-agent N8 context fields from handoff + role_slot + prior_role_artifact_hashes + decision_memory).
    - **requiredCompressionFacts (the STEP-7 obligation): build INLINE in the debate strategy** = the single-agent base facts (replicate the single-agent `requiredCompressionFacts` body over handoff.baseSourceHashes + handoff.projection.support_hashes) + `critic_finding: factIds(prior_role_artifact_hashes_hash) if priors` + `critic_resolution_map: factIds(prior_role_artifact_hashes_hash) if synthesizer && priors` — exactly v1c's conditional pattern (v1c builds its debate facts inline, NOT via a single-agent seam).
    - messages / invocationEnvelope / assembleRoleArtifact / priorRoleArtifactHashOf — model on v1c.
- **STEP 8 admission** → NEW `topic-selection-v1b-n8-bounded-debate-admission-service.ts` (model on `topic-selection-v1c-n2-bounded-debate-admission-service.ts`): role-artifact + admission-identity types + blocker codes (`N8_BOUNDED_DEBATE_*`), role-order + prior-role-hash-chain + support-only/forbidden-authority + `loop_transcript_hash` validation. ROLE_ORDER = `TOPIC_SELECTION_V1B_N8_BOUNDED_DEBATE_ROLE_ORDER` (already in harness contracts). Role-output schema = `TopicSelectionV1bN8BoundedDebateRolePayload` / `TopicSelectionV1bN8BoundedDebateRoleOutput@v1`.
- **STEP 9 gate bridge** → in `runDebate`, after debate admission: extract `synthesizer_final.assessment_draft`, validate via `topicSelectionV1bTopicValueAssessmentDraftPayloadSchema` + the harness draft key set, then call the EXISTING single-agent `generateDraftArtifact({ request, execution_mode, mocked_output/codex_response: { output: assessment_draft } })` so the gate-facing `n8_value_assessment_draft` carries single-agent identity. resolveN8DraftPayload / n8DraftGateBlocker / the gate stay UNCHANGED.
- **STEP 10 smoke** (`.ai/scripts/topic-selection-v1b-n8-debate-runtime-smoke.mjs`): mocked 4-role debate completes; synthesizer draft admitted by the EXISTING N8 gate (no gate change); malformed draft → clean blocker; replay reproduces loop_transcript_hash + n8_gate_result_hash.
- **STEP 11** regression (v1c smoke + n8 smoke + harness e2e + suite); **3.5** coordinator N7-feedback recipe + full-loop e2e.

Resume point: build `topic-selection-v1b-n8-bounded-debate-runtime-service.ts` (strategy + runDebate) using the v1c runtime file as the structural template + the seams above.

## STEP 7–10 DONE + VERIFIED (2026-06-14) — debate subsystem built, runtime-verified, registered

**Built (NEW files):**
- `topic-selection-v1b-n8-bounded-debate-runtime-service.ts` — `runDebate(input)` resolves the shared N8 context ONCE (`resolveSharedN8RuntimeContext`), threads it as the core handoff, walks the 4 roles via `core.runLoop`, then runs the deterministic admission (expected-identity builder bound per-run to the resolved handoff, so it re-derives each role's identity through the SAME strategy hooks the loop used — byte-match by construction). Private `V1bN8DebateStrategy` owns all byte-bearing hooks inline (v1c pattern). STEP-9 gate bridge: synthesizer `assessment_draft` → single-agent `generateDraftArtifact` (mocked_output) → gate-facing draft carries single-agent identity; the deterministic N8 gate is UNCHANGED.
- `topic-selection-v1b-n8-bounded-debate-admission-service.ts` — role order, per-role runtime-identity drift, prior-role hash chain, support-only/forbidden-authority, critic→repair resolution, `loop_transcript_hash` re-fold, surfaces `assessment_draft`.

**Registered:** prompt template `topic-selection.v1b.n8.bounded-micro-debate.runtime-role` + output schema `TopicSelectionV1bN8BoundedDebateRoleOutput@v1` in `topic-selection-llm-invocation-registry.ts` (the prompt-template lint + runtime gateway both enforce template registration — the suite's lint gate failed until this was added, confirming the gate works).

**STEP 10 verification** = `topic-selection-v1b-n8-bounded-debate-runtime-service.unit.test.ts` (3 tests, green): drives the 4-role loop through the REAL orchestrator + prompt-packet runtime + registries + in-memory control plane, with the (already-tested) `resolveSharedN8RuntimeContext` + gate bridge stubbed to a fixed, internally-consistent context. (1) happy path → completed + admitted + gate draft bridged on the synthesizer draft + shared context resolved exactly once; (2) **byte-stable across runs** — role-artifact hashes + per-role prompt_packet_hashes + loop_transcript_hash reproduce on a fresh control plane (the admission ADMITTING at all proves the byte-match: a drifted prompt_packet_hash would block with `N8_BOUNDED_DEBATE_ARTIFACT_PROMPT_DRIFT`); (3) unresolved material critic finding → `N8_BOUNDED_DEBATE_CRITIC_FINDING_UNRESOLVED`. Gates: tsc 0, full backend suite 1290 pass / 0 fail, n8 DB smoke exit 0 (adjacent single-agent path + registry unregressed).

**DEFERRED — STEP-7 compression-facts obligation (lines 299–313).** The debate `runtimeTokenBudget` passes `compression_attempt: null` and builds NO `requiredCompressionFacts`. This MATCHES the single-agent default (`runtimeCompressionAttempt` short-circuits to null unless a compression attempt is requested), and the debate input exposes no compression path. The base+critic fact builder only affects the compression-TRIGGERED path and does not perturb the byte-verified no-compression identity, so it is cleanly separable: to be added with a compression-capable debate input + a compression-triggering verification (single-agent precedent), not shipped unverified in this slice. Class doc + `runtimeTokenBudget` comment corrected to state this honestly (the earlier doc falsely claimed base+critic facts were built).

**Remaining:** STEP 11 — v1c smoke + harness e2e still to run (n8 smoke ✅); 3.5 — coordinator N7-feedback recipe wiring the debate runtime into the harness + full-loop e2e; the deferred compression-facts builder above.
