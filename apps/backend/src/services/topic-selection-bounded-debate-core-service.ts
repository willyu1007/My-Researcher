// T-123 Phase 3 (DP-3.1 / DMP-13) — shared bounded-debate skeleton (single implementation).
// Owns ONE role turn (the shared body of v1c generateRoleArtifact / v1b debate role generation):
// assert -> source hashes -> runtime-invocation-context hash -> context packet -> record context
// artifact -> orchestrator invocation -> audit/hash-drift check -> record output artifact ->
// assemble role artifact; plus the fixed role-order walk (runLoop) that threads prior-role
// artifacts append-only and folds a loop_transcript_hash. Every byte-bearing value comes from a
// strategy hook (BoundedDebateStrategy), so hashes stay version-local and byte-identical to each
// version's pre-extraction behavior. The core calls hooks in a FIXED order and uses ONE hash util.

import { AppError } from '../errors/app-error.js';
import type {
  TopicSelectionArtifactRefRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionArtifactFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  TopicSelectionAgentOrchestratorService,
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import type {
  BoundedDebateRoleContext,
  BoundedDebateStrategy,
  DivergentDebateStrategy,
} from './topic-selection-bounded-debate-strategy.js';

export type BoundedDebateRoleGenerationResult<TOut, TArtifact> =
  | {
    status: 'succeeded';
    role_artifact: TArtifact;
    structured_output: TOut;
    invocation_result: TopicSelectionAgentInvocationResult<TOut>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  }
  | {
    status: 'blocked';
    invocation_result: TopicSelectionAgentInvocationResult<TOut>;
    context_packet_ref: TopicSelectionArtifactFunctionalRef;
    context_packet_hash: string;
  };

export type BoundedDebateLoopResult<TRole extends string, TOut, TArtifact> =
  | {
    status: 'completed';
    ordered_role_artifacts: TArtifact[];
    final_role_artifact: TArtifact;
    final_structured_output: TOut;
    turns: Array<Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'succeeded' }>>;
    /** sha256(stableStringify([debate_loop_id, role_order, ordered role hashes])) — whole-loop replay identity. */
    loop_transcript_hash: string;
  }
  | {
    status: 'blocked';
    failed_slot: TRole;
    turn: Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'blocked' }>;
    ordered_role_artifacts: TArtifact[];
  };

/** T-127 W-07 — divergent fan-out loop result. Parallel to BoundedDebateLoopResult but the transcript
 *  hash folds the variable-arity [slot, arity] stage structure + every role artifact (fan-out included). */
export type DivergentDebateLoopResult<TRole extends string, TOut, TArtifact> =
  | {
    status: 'completed';
    ordered_role_artifacts: TArtifact[];
    final_role_artifact: TArtifact;
    final_structured_output: TOut;
    turns: Array<Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'succeeded' }>>;
    /** sha256(stableStringify([debate_loop_id, [[slot, arity], ...], ordered role hashes])) — whole-loop
     *  replay identity over the variable-arity fan-out (explorer_1..N, critic_1..M, arbiter stages). */
    loop_transcript_hash: string;
  }
  | {
    status: 'blocked';
    failed_slot: TRole;
    failed_instance_index: number;
    turn: Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'blocked' }>;
    ordered_role_artifacts: TArtifact[];
  };

export interface BoundedDebateCoreDeps {
  controlPlane: TopicSelectionControlPlaneService;
  agentOrchestrator: TopicSelectionAgentOrchestratorService;
}

export class TopicSelectionBoundedDebateCoreService {
  constructor(private readonly deps: BoundedDebateCoreDeps) {}

  // Single-source with the harness + human-path services (D1 consolidation) so the core's
  // loop_transcript_hash / context_packet_hash can never drift from the admission side.
  private hash(value: unknown): string {
    return canonicalHash(value);
  }

  /**
   * SINGLE role turn — the shared body both versions use. The hook call order is FIXED and
   * matches v1c's current generateRoleArtifact so relocated literals hash byte-identically.
   */
  async generateRoleArtifact<
    THandoff,
    TRole extends string,
    TOut extends Record<string, unknown>,
    TArtifact,
    TInputs,
  >(
    strategy: BoundedDebateStrategy<THandoff, TRole, TOut, TArtifact, TInputs>,
    ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
  ): Promise<BoundedDebateRoleGenerationResult<TOut, TArtifact>> {
    await strategy.assertInput(ctx);
    const sourceHashes = await strategy.sourceHashes(ctx);
    const runtimeInvocationContextHash = this.hash(
      await strategy.runtimeInvocationContextObject(ctx, sourceHashes),
    );
    const contextPacket = await strategy.buildContextPacket({ ctx, runtimeInvocationContextHash, sourceHashes });
    const contextPacketHash = this.hash(contextPacket);
    const scope = strategy.contextArtifactScope(ctx);
    const contextArtifact = await this.deps.controlPlane.recordArtifactRef({
      workspace_id: scope.workspace_id,
      title_card_id: scope.title_card_id,
      artifact_kind: 'diagnostic',
      storage_kind: 'inline',
      workflow_run_id: ctx.workflowRunId,
      payload: contextPacket,
      checksum: contextPacketHash,
      created_by: ctx.createdBy,
    });
    const contextPacketRef = this.toArtifactFunctionalRef(contextArtifact);

    const passthrough = strategy.invocationPassthrough(ctx);
    const invocation = await this.deps.agentOrchestrator.invokeStructuredOutput<TOut>({
      ...strategy.invocationEnvelope({ ctx, contextRef: contextPacketRef, contextPacketHash, runtimeInvocationContextHash }),
      messages: strategy.messages(ctx, contextPacket),
      input_refs: strategy.sourceRefs(contextPacket),
      context_packet_refs: [contextPacketRef],
      context_packet_hashes: [contextPacketHash],
      runtime_token_budget: strategy.runtimeTokenBudget({ ctx, runtimeInvocationContextHash, contextPacket }),
      debate_extension: null,
      codex_response: passthrough.codex_response ?? null,
      mocked_output: passthrough.mocked_output ?? null,
    });

    if (invocation.status !== 'succeeded' || !invocation.structured_output) {
      return {
        status: 'blocked',
        invocation_result: invocation,
        context_packet_ref: contextPacketRef,
        context_packet_hash: contextPacketHash,
      };
    }

    const structuredOutput = invocation.structured_output;
    if (!invocation.audit_artifact_ref) {
      throw new AppError(500, 'INTERNAL_ERROR', `runtime-verified ${strategy.debateLoopId} role requires an audit artifact ref.`);
    }
    const auditArtifact = await this.deps.controlPlane.getArtifactRef(invocation.audit_artifact_ref.ref_id);
    const auditHash = this.requiredChecksum(auditArtifact, `${strategy.debateLoopId} runtime audit artifact`);
    const outputHash = this.hash(structuredOutput);
    if (invocation.provenance.structured_output_hash !== outputHash) {
      throw new AppError(500, 'INTERNAL_ERROR', `${strategy.debateLoopId} structured output hash drift detected.`);
    }
    const outputScope = strategy.outputArtifactScope(ctx);
    const outputArtifact = await this.deps.controlPlane.recordArtifactRef({
      workspace_id: outputScope.workspace_id,
      title_card_id: outputScope.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: ctx.workflowRunId,
      payload: structuredOutput,
      checksum: outputHash,
      created_by: ctx.createdBy,
    });
    const outputRef = this.toArtifactFunctionalRef(outputArtifact);
    const role_artifact = strategy.assembleRoleArtifact({
      ctx,
      structuredOutput,
      invocation,
      runtimeInvocationContextHash,
      sourceHashes,
      outputRef,
      outputHash,
      auditHash,
    });
    return {
      status: 'succeeded',
      role_artifact,
      structured_output: structuredOutput,
      invocation_result: invocation,
      context_packet_ref: contextPacketRef,
      context_packet_hash: contextPacketHash,
    };
  }

  /**
   * FULL fixed-order role walk: thread prior artifacts append-only, fold loop_transcript_hash.
   * Used by v1b N8; v1c continues driving turns from its own loop in this phase (smoke-stable).
   */
  async runLoop<
    THandoff,
    TRole extends string,
    TOut extends Record<string, unknown>,
    TArtifact,
    TInputs,
  >(
    strategy: BoundedDebateStrategy<THandoff, TRole, TOut, TArtifact, TInputs>,
    base: Omit<
      BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
      'slotId' | 'priorRoleArtifacts' | 'priorRoleArtifactHashes' | 'invocationInputs'
    >,
    perRole: (slot: TRole, prior: TArtifact[]) => TInputs,
  ): Promise<BoundedDebateLoopResult<TRole, TOut, TArtifact>> {
    if (strategy.roleOrder.length === 0) {
      throw new AppError(500, 'INTERNAL_ERROR', `bounded debate ${strategy.debateLoopId} has an empty role order.`);
    }
    if (new Set(strategy.roleOrder).size !== strategy.roleOrder.length) {
      // prior-role hashes are keyed by slotId; duplicate slots would silently collapse the
      // threaded map while the transcript hash still counts both — reject the misconfiguration.
      throw new AppError(500, 'INTERNAL_ERROR', `bounded debate ${strategy.debateLoopId} role order has duplicate slot ids.`);
    }
    const ordered: TArtifact[] = [];
    const turns: Array<Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'succeeded' }>> = [];
    for (const slot of strategy.roleOrder) {
      const priorRoleArtifactHashes: Partial<Record<TRole, string>> = {};
      for (const artifact of ordered) {
        const { slotId, hash } = strategy.priorRoleArtifactHashOf(artifact);
        priorRoleArtifactHashes[slotId] = hash;
      }
      const ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs> = {
        ...base,
        slotId: slot,
        priorRoleArtifacts: [...ordered],
        priorRoleArtifactHashes,
        invocationInputs: perRole(slot, [...ordered]),
      };
      const turn = await this.generateRoleArtifact(strategy, ctx);
      if (turn.status !== 'succeeded') {
        return { status: 'blocked', failed_slot: slot, turn, ordered_role_artifacts: ordered };
      }
      ordered.push(turn.role_artifact);
      turns.push(turn);
    }
    const loop_transcript_hash = this.hash([
      strategy.debateLoopId,
      [...strategy.roleOrder],
      ordered.map((artifact) => strategy.priorRoleArtifactHashOf(artifact).hash),
    ]);
    return {
      status: 'completed',
      ordered_role_artifacts: ordered,
      final_role_artifact: ordered[ordered.length - 1]!,
      final_structured_output: turns[turns.length - 1]!.structured_output,
      turns,
      loop_transcript_hash,
    };
  }

  /**
   * DIVERGENT fan-out walk (T-127 W-07, ADDITIVE — runLoop + generateRoleArtifact are untouched, so
   * N8 / v1c-N2 bounded_sequence stay byte-identical by construction). Each stage slot in roleOrder
   * runs `strategy.instanceCountFor(slot)` turns (arity >= 1) through the SAME generateRoleArtifact;
   * all prior role artifacts thread append-only into every later turn (the arbiter's strategy hooks
   * aggregate them — worker summaries are a strategy concern, not the core's). Folds a
   * loop_transcript_hash over the [slot, arity] structure + the full ordered artifact set. Divergent
   * strategies reach this method only; bounded consumers never call it. DMP-10: one core, one
   * role-turn primitive (generateRoleArtifact), one hash util.
   */
  async runDivergentLoop<
    THandoff,
    TRole extends string,
    TOut extends Record<string, unknown>,
    TArtifact,
    TInputs,
  >(
    strategy: DivergentDebateStrategy<THandoff, TRole, TOut, TArtifact, TInputs>,
    base: Omit<
      BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs>,
      'slotId' | 'priorRoleArtifacts' | 'priorRoleArtifactHashes' | 'invocationInputs'
    >,
    perInstance: (slot: TRole, instanceIndex: number, prior: TArtifact[]) => TInputs,
  ): Promise<DivergentDebateLoopResult<TRole, TOut, TArtifact>> {
    if (strategy.roleOrder.length === 0) {
      throw new AppError(500, 'INTERNAL_ERROR', `divergent debate ${strategy.debateLoopId} has an empty role order.`);
    }
    if (new Set(strategy.roleOrder).size !== strategy.roleOrder.length) {
      // prior-role hashes are keyed by slotId; duplicate stage slots would silently collapse the
      // threaded map while the transcript still folds every artifact — reject the misconfiguration.
      throw new AppError(500, 'INTERNAL_ERROR', `divergent debate ${strategy.debateLoopId} role order has duplicate stage slots.`);
    }
    const stageArities: Array<[TRole, number]> = [];
    const ordered: TArtifact[] = [];
    const turns: Array<Extract<BoundedDebateRoleGenerationResult<TOut, TArtifact>, { status: 'succeeded' }>> = [];
    for (const slot of strategy.roleOrder) {
      const arity = strategy.instanceCountFor(slot);
      if (!Number.isInteger(arity) || arity < 1) {
        throw new AppError(500, 'INTERNAL_ERROR', `divergent debate ${strategy.debateLoopId} stage ${slot} has invalid instance count ${arity}.`);
      }
      stageArities.push([slot, arity]);
      for (let instanceIndex = 0; instanceIndex < arity; instanceIndex += 1) {
        const priorRoleArtifactHashes: Partial<Record<TRole, string>> = {};
        for (const artifact of ordered) {
          const { slotId, hash } = strategy.priorRoleArtifactHashOf(artifact);
          priorRoleArtifactHashes[slotId] = hash;
        }
        const ctx: BoundedDebateRoleContext<THandoff, TRole, TArtifact, TInputs> = {
          ...base,
          slotId: slot,
          priorRoleArtifacts: [...ordered],
          priorRoleArtifactHashes,
          invocationInputs: perInstance(slot, instanceIndex, [...ordered]),
        };
        const turn = await this.generateRoleArtifact(strategy, ctx);
        if (turn.status !== 'succeeded') {
          return { status: 'blocked', failed_slot: slot, failed_instance_index: instanceIndex, turn, ordered_role_artifacts: ordered };
        }
        ordered.push(turn.role_artifact);
        turns.push(turn);
      }
    }
    const loop_transcript_hash = this.hash([
      strategy.debateLoopId,
      stageArities,
      ordered.map((artifact) => strategy.priorRoleArtifactHashOf(artifact).hash),
    ]);
    return {
      status: 'completed',
      ordered_role_artifacts: ordered,
      final_role_artifact: ordered[ordered.length - 1]!,
      final_structured_output: turns[turns.length - 1]!.structured_output,
      turns,
      loop_transcript_hash,
    };
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
}
