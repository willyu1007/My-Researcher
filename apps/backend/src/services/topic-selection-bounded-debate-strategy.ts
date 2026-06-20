// T-123 Phase 3 (DP-3.1) — version-injection strategy for the shared bounded-debate skeleton.
// One implementation per version (v1c N2 / v1b N8). Every hook returns version-specific BYTES
// (objects/values, not hashes); the core never inspects packet internals, so hashes stay
// version-local and byte-identical to each version's pre-extraction behavior.
// Hooks that resolve control-plane refs are async (load-bearing for v1b projection/decision-memory);
// the core awaits every hook, so v1c's synchronous bodies relocate verbatim.

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionAgentRunMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionAgentInvocationRequest,
  TopicSelectionAgentInvocationResult,
  TopicSelectionAgentRuntimeTokenBudgetInput,
} from './topic-selection-agent-orchestrator-service.js';

/** The shell the core threads to every strategy hook; built once per role turn by the core.
 *  TInputs carries the version-specific per-invocation bag (codex/mock/compression/overrides). */
export interface BoundedDebateRoleContext<THandoff, TRole extends string, TArtifact, TInputs> {
  handoff: THandoff; // strategy-opaque to the core
  slotId: TRole;
  priorRoleArtifacts: TArtifact[];
  /** Per-slot LATEST-instance hash (1 per slot). For bounded_sequence (runLoop, arity 1) this is the
   *  complete prior-role identity. ⚠ Under fan-out (runDivergentLoop) a stage with arity > 1 collapses
   *  to its LAST instance here — to fold COMPLETE worker identity (every explorer/critic instance) into
   *  a context hash / admission re-derivation, use `priorRoleArtifactHashesAll` (or iterate
   *  `priorRoleArtifacts` via `priorRoleArtifactHashOf`), NEVER this last-wins map. */
  priorRoleArtifactHashes: Partial<Record<TRole, string>>;
  /** ALL prior-role-artifact hashes per slot, in invocation order — populated by runDivergentLoop so
   *  divergent fan-out strategies fold every worker instance. Undefined for bounded_sequence (runLoop),
   *  which is arity-1 (the last-wins map above already carries the complete identity there). */
  priorRoleArtifactHashesAll?: Partial<Record<TRole, string[]>>;
  invocationInputs: TInputs;
  workflowRunId: string;
  nodeAttemptId: string;
  executionMode: TopicSelectionAgentExecutionMode;
  runMode: TopicSelectionAgentRunMode;
  policyVersion: string | null;
  modelOptionId: string | null;
  createdBy: 'human' | 'llm' | 'system' | 'hybrid';
}

/** Inline diagnostic artifact the core records for the context packet (version supplies scope). */
export interface BoundedDebateContextArtifactInput {
  workspace_id: string | null;
  title_card_id: string | null;
}

/** The orchestrator request fields the version owns; the core merges in the loop-owned fields
 *  (messages, input_refs, context_packet_refs/hashes, runtime_token_budget, debate_extension,
 *  codex_response, mocked_output) so the assembled envelope is byte-identical to today. */
export type BoundedDebateInvocationEnvelope<TOut> = Omit<
  TopicSelectionAgentInvocationRequest<TOut>,
  'messages' | 'input_refs' | 'context_packet_refs' | 'context_packet_hashes'
  | 'runtime_token_budget' | 'debate_extension' | 'mocked_output' | 'codex_response'
>;

/** One implementation per version. Generic over handoff, role-slot, output, artifact, identity. */
export interface BoundedDebateStrategy<
  THandoff,
  TRole extends string,
  TOut extends Record<string, unknown>,
  TArtifact,
  TInputs,
> {
  readonly roleOrder: readonly TRole[];
  readonly debateLoopId: string;

  /** = v1c assertHandoff; async-capable (v1b awaits projection/decision-memory resolution). */
  assertInput(ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>): Promise<void> | void;

  /** version source hashes; the core folds these into ric + the context packet. */
  sourceHashes(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
  ): Promise<Record<string, string>> | Record<string, string>;

  /** LOAD-BEARING: returns the FULL runtime_invocation_context object literal; the core hashes it.
   *  v1c returns the verbatim {schema_version, invocation_slot_id, scenario_context, loop_context, debate_context}. */
  runtimeInvocationContextObject(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
    sourceHashes: Record<string, string>,
  ): Promise<unknown> | unknown;

  /** version context packet (the core threads it back as opaque `unknown`). */
  buildContextPacket(args: {
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Promise<Record<string, unknown>> | Record<string, unknown>;

  /** scope (workspace/title-card) for the recorded inline context artifact. */
  contextArtifactScope(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
  ): BoundedDebateContextArtifactInput;

  /** prompt messages over the built context packet. */
  messages(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
    contextPacket: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user'; content: string }>;

  /** input_refs for the orchestrator request (v1c: contextPacket.source_refs). */
  sourceRefs(contextPacket: Record<string, unknown>): TopicSelectionFunctionalRef[];

  /** version-keyed orchestrator request fields (the core merges the loop-owned fields). */
  invocationEnvelope(args: {
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>;
    contextRef: TopicSelectionArtifactFunctionalRef;
    contextPacketHash: string;
    runtimeInvocationContextHash: string;
  }): BoundedDebateInvocationEnvelope<TOut>;

  /** version token budget (v1c: runtimeTokenBudget incl. compression scaffold). */
  runtimeTokenBudget(args: {
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>;
    runtimeInvocationContextHash: string;
    contextPacket: Record<string, unknown>;
  }): TopicSelectionAgentRuntimeTokenBudgetInput;

  /** version codex/mock pass-through (kept on the strategy so v1c/v1b shape their own inputs). */
  invocationPassthrough(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
  ): {
    codex_response?: TopicSelectionAgentInvocationRequest<TOut>['codex_response'];
    mocked_output?: TopicSelectionAgentInvocationRequest<TOut>['mocked_output'];
  };

  /** scope for the recorded structured-output artifact (workspace/title-card). */
  outputArtifactScope(
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
  ): BoundedDebateContextArtifactInput;

  /** assemble the version role artifact from the verified output + identity pieces. */
  assembleRoleArtifact(args: {
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>;
    structuredOutput: TOut;
    invocation: TopicSelectionAgentInvocationResult<TOut>;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
    outputRef: TopicSelectionArtifactFunctionalRef;
    outputHash: string;
    auditHash: string;
  }): TArtifact;

  /** pull the slot + stable hash off a role artifact so the loop can thread + fold the transcript. */
  priorRoleArtifactHashOf(artifact: TArtifact): { slotId: TRole; hash: string };
}

/**
 * T-127 W-07 (D-T127-02) — divergent-loop variant for generative nodes (v1b N6). Worker stages fan
 * out (arity >= 1: e.g. multiple explorer framings, multiple critics) then arbiter stages aggregate
 * (issue-frame -> final-synthesis subset). It REUSES the entire BoundedDebateStrategy per-turn hook
 * contract verbatim — so the core's `generateRoleArtifact` consumes a DivergentDebateStrategy
 * unchanged (it IS-A BoundedDebateStrategy) — and adds ONLY the per-stage fan-out arity. `roleOrder`
 * is the ordered stage-slot list (each slot visited `instanceCountFor(slot)` times). Worker
 * aggregation/summaries are a strategy concern (the arbiter's per-turn hooks read priorRoleArtifacts);
 * the core stays a topology-orchestration shell. DMP-10: one core, one role-turn primitive, one hash.
 *
 * Contract (enforced by runDivergentLoop):
 *  - the TERMINAL roleOrder stage MUST be a singleton (instanceCountFor === 1): the core returns its
 *    sole turn as final_role_artifact / final_structured_output (the arbiter synthesizer);
 *  - `debateLoopId` MUST be unique per (logical debate, supplemental round) so the loop_transcript_hash
 *    never collides across rounds, and `instanceCountFor` MUST key to FROZEN inputs only (replay-
 *    deterministic) — a run-varying arity or a reused debateLoopId breaks replay identity.
 */
export interface DivergentDebateStrategy<
  THandoff,
  TRole extends string,
  TOut extends Record<string, unknown>,
  TArtifact,
  TInputs,
> extends BoundedDebateStrategy<THandoff, TRole, TOut, TArtifact, TInputs> {
  /** Deterministic fan-out arity for a stage slot (>= 1). bounded_sequence is the implicit arity-1
   *  case (runLoop); divergent worker stages return > 1. MUST be replay-deterministic — the loop
   *  transcript hash folds the [slot, arity] structure, so a run-varying arity breaks replay identity. */
  instanceCountFor(slot: TRole): number;
}
