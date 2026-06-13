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
  priorRoleArtifactHashes: Partial<Record<TRole, string>>;
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
