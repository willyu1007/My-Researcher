import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLES,
  evaluateEvidenceConvergenceBoundary,
  topicSelectionEvidenceConvergenceRoundRoleOutputSchema,
  type TopicSelectionEvidenceConvergenceRoundLink,
  type TopicSelectionEvidenceConvergenceRoundRole,
  type TopicSelectionEvidenceConvergenceRoundRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
  TopicSelectionResearchEvidencePacket,
  TopicSelectionResearchRetrievalHitProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import type {
  TopicSelectionSearchRunRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import type {
  TopicSelectionAgentInvocationProvenance,
  TopicSelectionAgentInvocationResult,
  TopicSelectionCodexAssistedAgentOutput,
  TopicSelectionMockedAgentOutput,
} from './topic-selection-agent-orchestrator-service.js';
import type { TopicSelectionBoundedDebateCoreService } from './topic-selection-bounded-debate-core-service.js';
import type {
  BoundedDebateInvocationEnvelope,
  BoundedDebateRoleContext,
  BoundedDebateStrategy,
} from './topic-selection-bounded-debate-strategy.js';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_INVOCATION_SLOT_IDS,
  type TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import { defaultLlmConfig } from './llm-config-loader.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_PROFILE_IDS,
} from './topic-selection-model-profile-registry-service.js';
import type { TopicSelectionResearchArenaService } from './topic-selection-research-arena-service.js';
import type { TopicSelectionResearchCheckpointService } from './topic-selection-research-checkpoint-service.js';
import type { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import type { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';

const PROMPT_TEMPLATE_ID = 'topic-selection.evidence-convergence.runtime-role' as const;
const OUTPUT_CONTRACT = 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1' as const;
const ROLE_ORDER = TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLES;

type RuntimeAccounting = {
  orchestration_steps: number;
  linked_rounds: number;
  elapsed_ms: number;
  accumulated_cost_microusd: number;
};

export type TopicSelectionEvidenceConvergenceRoundRoleInput = {
  participant_role: TopicSelectionEvidenceConvergenceRoundRole;
  evidence_packet_artifact_ref: TopicSelectionFunctionalRef;
  structured_output: TopicSelectionEvidenceConvergenceRoundRoleOutput;
  fixture_id: string | null;
  operator_label: string | null;
};

export type TopicSelectionRunEvidenceConvergenceRoundInput = {
  workspace_id?: string | null;
  title_card_id: string;
  predecessor_arena_session_id: string;
  successor_evidence_map_id: string;
  evidence_delta_ref: TopicSelectionFunctionalRef;
  issue_ref: TopicSelectionFunctionalRef;
  execution_mode: 'mocked_llm' | 'codex_assisted';
  role_inputs: TopicSelectionEvidenceConvergenceRoundRoleInput[];
  accounting: RuntimeAccounting;
  policy_version_id?: string | null;
};

export type TopicSelectionRunEvidenceConvergenceRoundResult =
  | {
    status: 'boundary_exhausted_unresolved';
    reason_codes: string[];
    accounting: RuntimeAccounting;
  }
  | {
    status: 'role_blocked_unresolved';
    reason_codes: string[];
    accounting: RuntimeAccounting;
    arena_session: TopicSelectionResearchArenaSessionRecord;
  }
  | {
    status: 'linked_round_completed';
    reason_codes: string[];
    accounting: RuntimeAccounting;
    arena_session: TopicSelectionResearchArenaSessionRecord;
    role_executions: TopicSelectionResearchArenaRoleExecutionRecord[];
    round_link: TopicSelectionEvidenceConvergenceRoundLink;
    round_link_ref: TopicSelectionFunctionalRef;
    transcript_ref: TopicSelectionFunctionalRef;
    checkpoint: Awaited<ReturnType<
      TopicSelectionResearchCheckpointService['materializeEvidenceLandscapeCheckpoint']
    >>;
  };

type PersistedHit = {
  query: string;
  literature_ref: TopicSelectionFunctionalRef;
  embedding_version_id: string;
  chunk_ref: TopicSelectionFunctionalRef;
  chunk_id?: string;
  chunk_hash: string;
  hybrid_score?: number;
  vector_score?: number;
  lexical_score?: number;
  is_stale?: boolean;
  rank: number;
};

type FrozenRolePacket = {
  ref: TopicSelectionFunctionalRef;
  hash: string;
  packet: TopicSelectionResearchEvidencePacket;
};

type RoundHandoff = {
  workspace_id: string | null;
  title_card_id: string;
  input_snapshot_id: string;
  input_snapshot_hash: string;
  issue_ref: TopicSelectionFunctionalRef;
  evidence_map_ref: TopicSelectionFunctionalRef;
  evidence_delta_ref: TopicSelectionFunctionalRef;
  evidence_delta_hash: string;
  predecessor_arena_session_ref: TopicSelectionFunctionalRef;
  parent_transcript_hash: string;
  search_run_ref: TopicSelectionFunctionalRef;
  packets: Record<TopicSelectionEvidenceConvergenceRoundRole, FrozenRolePacket>;
};

type RoundRoleArtifact = {
  participant_role: TopicSelectionEvidenceConvergenceRoundRole;
  output_ref: TopicSelectionFunctionalRef;
  output_hash: string;
  audit_ref: TopicSelectionFunctionalRef;
  audit_hash: string;
  execution_provenance: TopicSelectionAgentInvocationProvenance;
};

type RoundInvocationInputs = {
  role_input: TopicSelectionEvidenceConvergenceRoundRoleInput;
};

type RoundRoleContext = BoundedDebateRoleContext<
  RoundHandoff,
  TopicSelectionEvidenceConvergenceRoundRole,
  RoundRoleArtifact,
  RoundInvocationInputs
>;

class EvidenceConvergenceRoundStrategy implements BoundedDebateStrategy<
  RoundHandoff,
  TopicSelectionEvidenceConvergenceRoundRole,
  TopicSelectionEvidenceConvergenceRoundRoleOutput,
  RoundRoleArtifact,
  RoundInvocationInputs
> {
  readonly roleOrder = ROLE_ORDER;
  readonly debateLoopId: string;
  private readonly prompt = defaultLlmConfig().getPrompt('topic-selection', PROMPT_TEMPLATE_ID);

  constructor(
    roundId: string,
    private readonly contextProfiles: TopicSelectionContextPolicyProfileRegistryService,
  ) {
    this.debateLoopId = `evidence_convergence:${roundId}`;
  }

  assertInput(ctx: RoundRoleContext): void {
    const output = ctx.invocationInputs.role_input.structured_output;
    const packet = ctx.handoff.packets[ctx.slotId].packet;
    const cited = new Set(packet.items.map((item) => this.refKey(item.evidence_unit_ref)));
    if (ctx.invocationInputs.role_input.participant_role !== ctx.slotId
      || output.schema_version !== TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_ROLE_OUTPUT_SCHEMA_VERSION
      || output.participant_role !== ctx.slotId
      || !this.sameRef(output.issue_ref, ctx.handoff.issue_ref)
      || !this.sameRef(output.evidence_map_ref, ctx.handoff.evidence_map_ref)
      || !this.sameRef(output.evidence_delta_ref, ctx.handoff.evidence_delta_ref)
      || output.support_only !== true
      || output.cited_evidence_unit_refs.some((ref) => !cited.has(this.refKey(ref)))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Evidence-convergence role ${ctx.slotId} escaped its frozen support boundary.`);
    }
  }

  sourceHashes(ctx: RoundRoleContext): Record<string, string> {
    return {
      input_snapshot_hash: ctx.handoff.input_snapshot_hash,
      evidence_delta_hash: ctx.handoff.evidence_delta_hash,
      evidence_packet_hash: ctx.handoff.packets[ctx.slotId].hash,
      parent_transcript_hash: ctx.handoff.parent_transcript_hash,
      ...(ctx.slotId === 'synthesis_arbiter'
        ? Object.fromEntries(Object.entries(ctx.priorRoleArtifactHashes).map(([role, hash]) => [
            `prior_role:${role}`,
            hash,
          ]))
        : {}),
    };
  }

  runtimeInvocationContextObject(
    ctx: RoundRoleContext,
    sourceHashes: Record<string, string>,
  ): unknown {
    return {
      schema_version: 'TopicSelectionEvidenceConvergenceRuntimeInvocationContext@v1',
      invocation_slot_id: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_INVOCATION_SLOT_IDS[ctx.slotId],
      issue_ref: ctx.handoff.issue_ref,
      evidence_map_ref: ctx.handoff.evidence_map_ref,
      source_hashes: sourceHashes,
      prior_role_artifact_hashes: ctx.slotId === 'synthesis_arbiter'
        ? ctx.priorRoleArtifactHashes
        : {},
      support_only: true,
    };
  }

  buildContextPacket(args: {
    ctx: RoundRoleContext;
    runtimeInvocationContextHash: string;
    sourceHashes: Record<string, string>;
  }): Record<string, unknown> {
    return {
      schema_version: 'TopicSelectionEvidenceConvergenceRoundContext@v1',
      participant_role: args.ctx.slotId,
      issue_ref: args.ctx.handoff.issue_ref,
      evidence_map_ref: args.ctx.handoff.evidence_map_ref,
      evidence_delta_ref: args.ctx.handoff.evidence_delta_ref,
      predecessor_arena_session_ref: args.ctx.handoff.predecessor_arena_session_ref,
      evidence_packet: args.ctx.handoff.packets[args.ctx.slotId].packet,
      prior_role_outputs: args.ctx.slotId === 'synthesis_arbiter'
        ? args.ctx.priorRoleArtifacts.map((artifact) => ({
            participant_role: artifact.participant_role,
            output_ref: artifact.output_ref,
            output_hash: artifact.output_hash,
          }))
        : [],
      source_hashes: args.sourceHashes,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      support_only: true,
    };
  }

  contextArtifactScope(ctx: RoundRoleContext) {
    return {
      workspace_id: ctx.handoff.workspace_id,
      title_card_id: ctx.handoff.title_card_id,
      input_snapshot_id: ctx.handoff.input_snapshot_id,
    };
  }

  outputArtifactScope(ctx: RoundRoleContext) {
    return this.contextArtifactScope(ctx);
  }

  messages(
    _ctx: RoundRoleContext,
    contextPacket: Record<string, unknown>,
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      { role: 'system', content: this.prompt.system },
      { role: 'user', content: `<evidence_convergence_round>\n${stableStringify(contextPacket)}\n</evidence_convergence_round>` },
    ];
  }

  sourceRefs(contextPacket: Record<string, unknown>): TopicSelectionFunctionalRef[] {
    const packet = contextPacket.evidence_packet as TopicSelectionResearchEvidencePacket;
    return this.uniqueRefs([
      contextPacket.issue_ref as TopicSelectionFunctionalRef,
      contextPacket.evidence_map_ref as TopicSelectionFunctionalRef,
      contextPacket.evidence_delta_ref as TopicSelectionFunctionalRef,
      ...packet.source_refs,
      ...((contextPacket.prior_role_outputs as Array<{ output_ref: TopicSelectionFunctionalRef }>)
        .map((output) => output.output_ref)),
    ]);
  }

  invocationEnvelope(args: {
    ctx: RoundRoleContext;
  }): BoundedDebateInvocationEnvelope<TopicSelectionEvidenceConvergenceRoundRoleOutput> {
    const ctx = args.ctx;
    return {
      workspace_id: ctx.handoff.workspace_id,
      title_card_id: ctx.handoff.title_card_id,
      node_id: `topic_selection_research_arena_${ctx.slotId}`,
      workflow_run_id: ctx.workflowRunId,
      node_attempt_id: `${ctx.nodeAttemptId}:${ctx.slotId}`,
      input_snapshot_id: ctx.handoff.input_snapshot_id,
      invocation_attempt_id: `${ctx.nodeAttemptId}:${ctx.slotId}:invocation`,
      execution_mode: ctx.executionMode,
      executor_kind: 'multi_agent_debate',
      run_mode: 'acceptance',
      profile_id: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_PROFILE_IDS[ctx.slotId],
      output_contract: OUTPUT_CONTRACT,
      model_option_id: null,
      prompt: { promptTemplateId: PROMPT_TEMPLATE_ID, version: this.prompt.version },
      prompt_variant_key: ctx.slotId,
      schema_name: OUTPUT_CONTRACT,
      schema: topicSelectionEvidenceConvergenceRoundRoleOutputSchema as unknown as Record<string, unknown>,
      created_by: ctx.createdBy,
    };
  }

  runtimeTokenBudget(args: {
    ctx: RoundRoleContext;
    runtimeInvocationContextHash: string;
    contextPacket: Record<string, unknown>;
  }) {
    const role = args.ctx.slotId;
    const runtimeProfile = this.contextProfiles.resolveProfile({
      context_policy_profile_id: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_CONTEXT_RUNTIME_PROFILE_IDS[role],
      invocation_slot_id: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_INVOCATION_SLOT_IDS[role],
    });
    return {
      context_policy_profile: runtimeProfile.profile,
      context_policy_profile_hash: runtimeProfile.profile_hash,
      runtime_invocation_context_hash: args.runtimeInvocationContextHash,
      context_payloads: [args.contextPacket],
    };
  }

  invocationPassthrough(ctx: RoundRoleContext): {
    codex_response: TopicSelectionCodexAssistedAgentOutput<TopicSelectionEvidenceConvergenceRoundRoleOutput> | null;
    mocked_output: TopicSelectionMockedAgentOutput<TopicSelectionEvidenceConvergenceRoundRoleOutput> | null;
  } {
    const roleInput = ctx.invocationInputs.role_input;
    return ctx.executionMode === 'mocked_llm'
      ? {
          mocked_output: {
            fixture_id: roleInput.fixture_id!,
            output: roleInput.structured_output,
            mock_profile: 'evidence_convergence_round_v1',
          },
          codex_response: null,
        }
      : {
          codex_response: {
            output: roleInput.structured_output,
            operator_label: roleInput.operator_label!,
          },
          mocked_output: null,
        };
  }

  assembleRoleArtifact(args: {
    ctx: RoundRoleContext;
    structuredOutput: TopicSelectionEvidenceConvergenceRoundRoleOutput;
    invocation: TopicSelectionAgentInvocationResult<TopicSelectionEvidenceConvergenceRoundRoleOutput>;
    outputRef: TopicSelectionFunctionalRef;
    outputHash: string;
    auditHash: string;
  }): RoundRoleArtifact {
    return {
      participant_role: args.ctx.slotId,
      output_ref: args.outputRef,
      output_hash: args.outputHash,
      audit_ref: args.invocation.audit_artifact_ref!,
      audit_hash: args.auditHash,
      execution_provenance: args.invocation.provenance,
    };
  }

  priorRoleArtifactHashOf(artifact: RoundRoleArtifact) {
    return { slotId: artifact.participant_role, hash: artifact.output_hash };
  }

  private sameRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((ref) => [this.refKey(ref), ref])).values()];
  }
}

export class TopicSelectionEvidenceConvergenceRoundService {
  constructor(private readonly dependencies: {
    controlPlane: TopicSelectionControlPlaneService;
    evidenceMaps: Pick<
      TopicSelectionEvidenceMapRepository,
      | 'findEvidenceMapById'
      | 'listEvidenceUnitsByEvidenceMapId'
      | 'listConflictSetsByEvidenceMapId'
    >;
    searchResources: Pick<
      TopicSelectionSearchResourceService,
      | 'getSearchRunById'
      | 'getCoverageMatrix'
    >;
    arena: Pick<
      TopicSelectionResearchArenaService,
      | 'getSession'
      | 'getSessionByKey'
      | 'getCurrentSession'
      | 'listRoleExecutions'
      | 'openSession'
      | 'recordRoleExecution'
      | 'synthesizeEvidenceLandscapeSession'
    >;
    debateCore: TopicSelectionBoundedDebateCoreService;
    contextProfiles: TopicSelectionContextPolicyProfileRegistryService;
    evidencePacketResolver: Pick<TopicSelectionResearchEvidencePacketService, 'resolve'>;
    checkpoints: Pick<
      TopicSelectionResearchCheckpointService,
      'materializeEvidenceLandscapeCheckpoint'
    >;
    nowMs?: () => number;
  }) {}

  async runLinkedRound(
    input: TopicSelectionRunEvidenceConvergenceRoundInput,
  ): Promise<TopicSelectionRunEvidenceConvergenceRoundResult> {
    this.assertInput(input);
    const boundary = evaluateEvidenceConvergenceBoundary({
      policy: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
      ...input.accounting,
      execution_completed: false,
      material_delta: false,
      strategy_changed: false,
    });
    if (boundary.disposition === 'boundary_exhausted_unresolved') {
      return {
        status: 'boundary_exhausted_unresolved',
        reason_codes: boundary.reason_codes,
        accounting: input.accounting,
      };
    }
    const startedAt = (this.dependencies.nowMs ?? Date.now)();
    const [evidenceMap, parentSession, deltaArtifact] = await Promise.all([
      this.requireEvidenceMap(input.successor_evidence_map_id, input.title_card_id),
      this.dependencies.arena.getSession(input.predecessor_arena_session_id),
      this.requireArtifact(input.evidence_delta_ref, input.title_card_id),
    ]);
    this.assertAuthorities(input, evidenceMap, parentSession, deltaArtifact);
    const parentTranscriptArtifact = await this.requireArtifact(
      parentSession.loop_transcript_ref!,
      input.title_card_id,
    );
    if (parentTranscriptArtifact.input_snapshot_id !== parentSession.input_snapshot_id
      || (parentTranscriptArtifact.workspace_id ?? null) !== (parentSession.workspace_id ?? null)
      || this.requireChecksum(parentTranscriptArtifact, 'Parent arena transcript')
        !== parentSession.loop_transcript_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Parent arena transcript no longer matches its frozen hash.');
    }
    const inputSnapshotId = evidenceMap.input_snapshot_id;
    const workflowRunId = evidenceMap.workflow_run_id;
    if (!inputSnapshotId || !workflowRunId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Successor EvidenceMap lacks runtime lineage.');
    }
    const snapshot = await this.dependencies.controlPlane.getInputSnapshot(inputSnapshotId);
    if (!snapshot || snapshot.title_card_id !== input.title_card_id
      || (snapshot.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null)
      || !this.sameRef(snapshot.target_ref, this.evidenceMapRef(evidenceMap))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Successor EvidenceMap has no exact frozen InputSnapshot.');
    }
    const searchRun = await this.dependencies.searchResources.getSearchRunById(
      evidenceMap.search_run_ref.ref_id,
    );
    if (!searchRun || searchRun.title_card_id !== input.title_card_id
      || (searchRun.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null)
      || searchRun.search_run_id !== evidenceMap.search_run_ref.ref_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Successor EvidenceMap SearchRun is unavailable.');
    }
    const evidenceUnits = await this.dependencies.evidenceMaps.listEvidenceUnitsByEvidenceMapId(
      evidenceMap.evidence_map_id,
    );
    if (evidenceUnits.some((unit) => (unit.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Successor EvidenceMap units cross the workspace scope.');
    }
    const packets = await this.loadPackets(input, snapshot.input_snapshot_id, evidenceMap, evidenceUnits);
    const evidenceDeltaHash = this.requireChecksum(deltaArtifact, 'EvidenceDelta');
    const planPayload = {
      schema_version: 'TopicSelectionEvidenceConvergenceRoundExecutionPlan@v1',
      issue_ref: input.issue_ref,
      evidence_map_ref: this.evidenceMapRef(evidenceMap),
      evidence_delta_ref: input.evidence_delta_ref,
      predecessor_arena_session_ref: this.ref('research_arena_session', parentSession.arena_session_id, input.title_card_id),
      participant_roles: [...ROLE_ORDER],
      role_evidence_packet_refs: ROLE_ORDER.map((role) => packets[role].ref),
      support_only: true,
    };
    const planHash = sha256Text(stableStringify(planPayload));
    const sessionKey = `evidence-convergence:${sha256Text(stableStringify({
      predecessor_arena_session_id: parentSession.arena_session_id,
      parent_transcript_hash: parentSession.loop_transcript_hash,
      evidence_delta_hash: evidenceDeltaHash,
      evidence_map_ref: this.evidenceMapRef(evidenceMap),
      input_snapshot_hash: snapshot.snapshot_hash,
    }))}`;
    const requestIdentityHash = this.requestIdentityHash(input);
    const existingSession = await this.dependencies.arena.getSessionByKey(sessionKey);
    if (!existingSession) {
      const currentArena = await this.dependencies.arena.getCurrentSession(
        input.title_card_id,
        'evidence_landscape',
      );
      if (parentSession.status !== 'synthesized'
        || currentArena?.arena_session_id !== parentSession.arena_session_id) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Requested parent arena is not the current synthesized evidence-landscape round.');
      }
    }
    const planArtifact = await this.dependencies.controlPlane.recordArtifactRef({
      stable_key: `evidence-convergence-round-plan:${planHash}`,
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: workflowRunId,
      input_snapshot_id: snapshot.input_snapshot_id,
      payload: planPayload,
      checksum: planHash,
      mime_type: 'application/json',
      created_by: 'system',
    });
    const session = await this.dependencies.arena.openSession({
      session_key: sessionKey,
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: input.title_card_id,
      arena_kind: 'evidence_landscape',
      target_ref: this.evidenceMapRef(evidenceMap),
      input_snapshot_id: snapshot.input_snapshot_id,
      participant_roles: ROLE_ORDER,
      execution_plan_ref: this.artifactRef(planArtifact, input.title_card_id),
      loop_delta_refs: [{
        delta_type: 'evidence',
        ref: input.evidence_delta_ref,
        rationale: 'A material admitted EvidenceDelta requires a frozen successor round.',
      }],
      created_by: 'system',
    });
    if (existingSession) {
      return this.replayCompletedRound({
        input,
        evidenceMap,
        evidenceUnits,
        parentSession,
        session,
        requestIdentityHash,
        evidenceDeltaHash,
      });
    }
    if (session.supersedes_arena_session_id !== parentSession.arena_session_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Linked round did not supersede the requested parent arena.');
    }
    const handoff: RoundHandoff = {
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: input.title_card_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      input_snapshot_hash: snapshot.snapshot_hash,
      issue_ref: input.issue_ref,
      evidence_map_ref: this.evidenceMapRef(evidenceMap),
      evidence_delta_ref: input.evidence_delta_ref,
      evidence_delta_hash: evidenceDeltaHash,
      predecessor_arena_session_ref: this.ref('research_arena_session', parentSession.arena_session_id, input.title_card_id),
      parent_transcript_hash: parentSession.loop_transcript_hash!,
      search_run_ref: evidenceMap.search_run_ref,
      packets,
    };
    const inputsByRole = new Map(input.role_inputs.map((roleInput) => [roleInput.participant_role, roleInput]));
    const loop = await this.dependencies.debateCore.runLoop(
      new EvidenceConvergenceRoundStrategy(session.arena_session_id, this.dependencies.contextProfiles),
      {
        handoff,
        workflowRunId,
        nodeAttemptId: `evidence_convergence_round:${session.arena_session_id}`,
        executionMode: input.execution_mode,
        runMode: 'acceptance',
        policyVersion: input.policy_version_id ?? null,
        modelOptionId: null,
        createdBy: input.execution_mode === 'codex_assisted' ? 'hybrid' : 'system',
      },
      (role) => ({ role_input: inputsByRole.get(role)! }),
    );
    const accounting = {
      ...input.accounting,
      orchestration_steps: input.accounting.orchestration_steps + 1,
      linked_rounds: input.accounting.linked_rounds + 1,
      elapsed_ms: input.accounting.elapsed_ms + Math.max(
        0,
        (this.dependencies.nowMs ?? Date.now)() - startedAt,
      ),
    };
    if (loop.status === 'blocked') {
      return {
        status: 'role_blocked_unresolved',
        reason_codes: ['EVIDENCE_CONVERGENCE_ROLE_BLOCKED'],
        accounting,
        arena_session: session,
      };
    }

    const retrievalHits = this.retrievalHits(searchRun);
    const roleExecutions: TopicSelectionResearchArenaRoleExecutionRecord[] = [];
    for (const turn of loop.turns) {
      const role = turn.role_artifact.participant_role;
      const packet = packets[role];
      roleExecutions.push(await this.dependencies.arena.recordRoleExecution({
        arena_session_id: session.arena_session_id,
        role_slot_id: role,
        instance_index: 0,
        participant_role: role,
        pass_kind: role === 'synthesis_arbiter' ? 'synthesis' : 'first_pass',
        evidence_packet_artifact_ref: packet.ref,
        retrieval_provenance: {
          participant_role: role,
          query_intent: packet.packet.query_intent,
          search_run_ref: evidenceMap.search_run_ref,
          hits: retrievalHits,
        },
        exposure_artifact_refs: role === 'synthesis_arbiter'
          ? [packet.ref, ...roleExecutions.map((execution) => execution.output_artifact_ref)]
          : [packet.ref],
        output_artifact_ref: turn.role_artifact.output_ref,
        agent_invocation_audit_artifact_ref: turn.role_artifact.audit_ref,
        execution_provenance: turn.role_artifact.execution_provenance,
        prior_role_hashes: role === 'synthesis_arbiter'
          ? roleExecutions.map((execution) => execution.output_artifact_hash)
          : [],
      }));
    }
    const firstPasses = roleExecutions.filter((execution) => execution.pass_kind === 'first_pass');
    const synthesis = roleExecutions.find((execution) => execution.pass_kind === 'synthesis')!;
    const transcriptPayload = {
      schema_version: 'TopicSelectionEvidenceConvergenceRoundTranscript@v1',
      arena_session_id: session.arena_session_id,
      input_snapshot_id: snapshot.input_snapshot_id,
      request_identity_hash: requestIdentityHash,
      result_accounting: accounting,
      core_loop_transcript_hash: loop.loop_transcript_hash,
      independent_first_pass: firstPasses.map((execution) => this.transcriptExecutionIdentity(execution)),
      synthesis_execution: this.transcriptExecutionIdentity(synthesis),
      support_only: true,
    };
    const transcriptHash = sha256Text(stableStringify(transcriptPayload));
    const transcriptArtifact = await this.dependencies.controlPlane.recordArtifactRef({
      stable_key: `evidence-convergence-round-transcript:${transcriptHash}`,
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: workflowRunId,
      input_snapshot_id: snapshot.input_snapshot_id,
      payload: transcriptPayload,
      checksum: transcriptHash,
      mime_type: 'application/json',
      created_by: 'system',
    });
    const roundLink: TopicSelectionEvidenceConvergenceRoundLink = {
      schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
      arena_session_ref: this.ref('research_arena_session', session.arena_session_id, input.title_card_id),
      supersedes_arena_session_ref: this.ref('research_arena_session', parentSession.arena_session_id, input.title_card_id),
      parent_transcript_hash: parentSession.loop_transcript_hash!,
      evidence_delta_ref: input.evidence_delta_ref,
      evidence_delta_hash: evidenceDeltaHash,
    };
    const roundLinkHash = sha256Text(stableStringify(roundLink));
    const roundLinkArtifact = await this.dependencies.controlPlane.recordArtifactRef({
      stable_key: `evidence-convergence-round-link:${roundLinkHash}`,
      workspace_id: input.workspace_id ?? evidenceMap.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      storage_kind: 'inline',
      workflow_run_id: workflowRunId,
      input_snapshot_id: snapshot.input_snapshot_id,
      payload: roundLink as unknown as Record<string, unknown>,
      checksum: roundLinkHash,
      mime_type: 'application/json',
      created_by: 'system',
    });
    const synthesized = await this.dependencies.arena.synthesizeEvidenceLandscapeSession({
      arena_session_id: session.arena_session_id,
      loop_transcript_artifact_ref: this.artifactRef(transcriptArtifact, input.title_card_id),
      round_link_artifact_ref: this.artifactRef(roundLinkArtifact, input.title_card_id),
    });
    const [conflicts, coverage] = await Promise.all([
      this.dependencies.evidenceMaps.listConflictSetsByEvidenceMapId(evidenceMap.evidence_map_id),
      this.dependencies.searchResources.getCoverageMatrix(evidenceMap.search_plan_ref.ref_id),
    ]);
    const checkpoint = await this.dependencies.checkpoints.materializeEvidenceLandscapeCheckpoint({
      evidence_map: evidenceMap,
      evidence_units: evidenceUnits,
      conflict_sets: conflicts,
      coverage_row_intents: coverage.rows.map((row) => row.coverage_row_intent),
      coverage_assessments: coverage.rows.flatMap((row) => row.latest_assessment ? [row.latest_assessment] : []),
      policy_version_id: input.policy_version_id ?? null,
    });
    const roundLinkRef = this.artifactRef(roundLinkArtifact, input.title_card_id);
    const transcriptRef = this.artifactRef(transcriptArtifact, input.title_card_id);
    return {
      status: 'linked_round_completed',
      reason_codes: [],
      accounting,
      arena_session: synthesized,
      role_executions: roleExecutions,
      round_link: roundLink,
      round_link_ref: roundLinkRef,
      transcript_ref: transcriptRef,
      checkpoint,
    };
  }

  private async replayCompletedRound(args: {
    input: TopicSelectionRunEvidenceConvergenceRoundInput;
    evidenceMap: TopicSelectionEvidenceMapRecord;
    evidenceUnits: TopicSelectionEvidenceUnitRecord[];
    parentSession: TopicSelectionResearchArenaSessionRecord;
    session: TopicSelectionResearchArenaSessionRecord;
    requestIdentityHash: string;
    evidenceDeltaHash: string;
  }): Promise<TopicSelectionRunEvidenceConvergenceRoundResult> {
    const session = args.session;
    if (session.supersedes_arena_session_id !== args.parentSession.arena_session_id
      || args.parentSession.superseded_by_arena_session_id !== session.arena_session_id
      || !['synthesized', 'superseded'].includes(session.status)
      || !session.loop_transcript_ref
      || !session.loop_transcript_hash
      || session.loop_transcript_hash !== session.loop_transcript_ref.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Completed linked round no longer matches the synthesized Arena lineage.');
    }
    const transcriptArtifact = await this.requireArtifact(
      session.loop_transcript_ref,
      args.input.title_card_id,
    );
    const transcript = transcriptArtifact.payload;
    const accounting = transcript?.result_accounting;
    if (transcriptArtifact.input_snapshot_id !== args.evidenceMap.input_snapshot_id
      || (transcriptArtifact.workspace_id ?? null) !== (args.evidenceMap.workspace_id ?? null)
      || transcript?.schema_version !== 'TopicSelectionEvidenceConvergenceRoundTranscript@v1'
      || transcript.arena_session_id !== session.arena_session_id
      || transcript.input_snapshot_id !== session.input_snapshot_id
      || transcript.request_identity_hash !== args.requestIdentityHash
      || !this.isRuntimeAccounting(accounting)
      || this.requireChecksum(transcriptArtifact, 'Completed linked-round transcript')
        !== session.loop_transcript_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Completed linked-round transcript identifies a different request or accounting result.');
    }
    const roundLink: TopicSelectionEvidenceConvergenceRoundLink = {
      schema_version: TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
      arena_session_ref: this.ref('research_arena_session', session.arena_session_id, args.input.title_card_id),
      supersedes_arena_session_ref: this.ref(
        'research_arena_session',
        args.parentSession.arena_session_id,
        args.input.title_card_id,
      ),
      parent_transcript_hash: args.parentSession.loop_transcript_hash!,
      evidence_delta_ref: args.input.evidence_delta_ref,
      evidence_delta_hash: args.evidenceDeltaHash,
    };
    const roundLinkHash = sha256Text(stableStringify(roundLink));
    const roundLinkArtifact = await this.dependencies.controlPlane.getArtifactRefByStableKey(
      `evidence-convergence-round-link:${roundLinkHash}`,
    );
    if (!roundLinkArtifact
      || roundLinkArtifact.input_snapshot_id !== args.evidenceMap.input_snapshot_id
      || (roundLinkArtifact.workspace_id ?? null) !== (args.evidenceMap.workspace_id ?? null)
      || this.requireChecksum(roundLinkArtifact, 'Completed linked-round link') !== roundLinkHash
      || stableStringify(roundLinkArtifact.payload) !== stableStringify(roundLink)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Completed linked round has no exact durable round link.');
    }
    const roundLinkRef = this.artifactRef(roundLinkArtifact, args.input.title_card_id);
    const synthesized = await this.dependencies.arena.synthesizeEvidenceLandscapeSession({
      arena_session_id: session.arena_session_id,
      loop_transcript_artifact_ref: session.loop_transcript_ref,
      round_link_artifact_ref: roundLinkRef,
    });
    const [roleExecutions, conflicts, coverage] = await Promise.all([
      this.dependencies.arena.listRoleExecutions(session.arena_session_id),
      this.dependencies.evidenceMaps.listConflictSetsByEvidenceMapId(args.evidenceMap.evidence_map_id),
      this.dependencies.searchResources.getCoverageMatrix(args.evidenceMap.search_plan_ref.ref_id),
    ]);
    if (roleExecutions.length !== ROLE_ORDER.length
      || ROLE_ORDER.some((role) => !roleExecutions.some((execution) => execution.participant_role === role))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Completed linked round no longer matches its role executions.');
    }
    const checkpoint = await this.dependencies.checkpoints.materializeEvidenceLandscapeCheckpoint({
      evidence_map: args.evidenceMap,
      evidence_units: args.evidenceUnits,
      conflict_sets: conflicts,
      coverage_row_intents: coverage.rows.map((row) => row.coverage_row_intent),
      coverage_assessments: coverage.rows.flatMap((row) => row.latest_assessment ? [row.latest_assessment] : []),
      policy_version_id: args.input.policy_version_id ?? null,
    });
    return {
      status: 'linked_round_completed',
      reason_codes: [],
      accounting,
      arena_session: synthesized,
      role_executions: roleExecutions,
      round_link: roundLink,
      round_link_ref: roundLinkRef,
      transcript_ref: session.loop_transcript_ref,
      checkpoint,
    };
  }

  private requestIdentityHash(input: TopicSelectionRunEvidenceConvergenceRoundInput): string {
    return sha256Text(stableStringify({
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      predecessor_arena_session_id: input.predecessor_arena_session_id,
      successor_evidence_map_id: input.successor_evidence_map_id,
      evidence_delta_ref: input.evidence_delta_ref,
      issue_ref: input.issue_ref,
      execution_mode: input.execution_mode,
      role_inputs: input.role_inputs,
      accounting: input.accounting,
      policy_version_id: input.policy_version_id ?? null,
    }));
  }

  private isRuntimeAccounting(value: unknown): value is RuntimeAccounting {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const accounting = value as Partial<RuntimeAccounting>;
    return [
      accounting.orchestration_steps,
      accounting.linked_rounds,
      accounting.elapsed_ms,
      accounting.accumulated_cost_microusd,
    ].every((candidate) => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0);
  }

  private assertInput(input: TopicSelectionRunEvidenceConvergenceRoundInput): void {
    const roles = input.role_inputs.map((roleInput) => roleInput.participant_role);
    if (!input.title_card_id.trim() || !input.predecessor_arena_session_id.trim()
      || !input.successor_evidence_map_id.trim()
      || input.issue_ref.ref_type !== 'coverage_row_intent'
      || input.issue_ref.title_card_id !== input.title_card_id
      || input.evidence_delta_ref.ref_type !== 'artifact_ref'
      || input.evidence_delta_ref.title_card_id !== input.title_card_id
      || stableStringify(roles) !== stableStringify(ROLE_ORDER)
      || input.role_inputs.some((roleInput) => (
        roleInput.evidence_packet_artifact_ref.ref_type !== 'artifact_ref'
        || roleInput.evidence_packet_artifact_ref.title_card_id !== input.title_card_id
        || (input.execution_mode === 'mocked_llm' && !roleInput.fixture_id?.trim())
        || (input.execution_mode === 'codex_assisted' && !roleInput.operator_label?.trim())
      ))) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Evidence-convergence linked round input is incomplete or out of order.');
    }
  }

  private assertAuthorities(
    input: TopicSelectionRunEvidenceConvergenceRoundInput,
    evidenceMap: TopicSelectionEvidenceMapRecord,
    parentSession: TopicSelectionResearchArenaSessionRecord,
    deltaArtifact: TopicSelectionArtifactRefRecord,
  ): void {
    const delta = deltaArtifact.payload;
    if ((input.workspace_id !== undefined
        && (input.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null))
      || (parentSession.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null)
      || (deltaArtifact.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null)
      || evidenceMap.status !== 'ready' || evidenceMap.freshness_status !== 'current'
      || !evidenceMap.predecessor_evidence_map_ref
      || !evidenceMap.material_evidence_delta_ref
      || !this.sameRef(evidenceMap.material_evidence_delta_ref, input.evidence_delta_ref)
      || !this.sameRef(parentSession.target_ref, evidenceMap.predecessor_evidence_map_ref)
      || delta?.schema_version !== 'TopicSelectionEvidenceDelta@v1'
      || delta.material !== true
      || !Array.isArray(delta.issue_refs)
      || !delta.issue_refs.some((issueRef) => this.isSameRefValue(issueRef, input.issue_ref))
      || !this.isSameRefValue(delta.predecessor_evidence_map_ref, evidenceMap.predecessor_evidence_map_ref)
      || parentSession.title_card_id !== input.title_card_id
      || parentSession.arena_kind !== 'evidence_landscape'
      || !['synthesized', 'superseded'].includes(parentSession.status)
      || !parentSession.loop_transcript_ref
      || !parentSession.loop_transcript_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Linked round workspace scope, material successor, or synthesized parent arena lineage is invalid.');
    }
  }

  private async loadPackets(
    input: TopicSelectionRunEvidenceConvergenceRoundInput,
    inputSnapshotId: string,
    evidenceMap: TopicSelectionEvidenceMapRecord,
    evidenceUnits: TopicSelectionEvidenceUnitRecord[],
  ): Promise<Record<TopicSelectionEvidenceConvergenceRoundRole, FrozenRolePacket>> {
    const evidenceMapRef = this.evidenceMapRef(evidenceMap);
    const evidenceUnitKeys = new Set(evidenceUnits.map((unit) => this.refKey(
      this.ref('evidence_unit', unit.evidence_unit_id, unit.title_card_id, unit.evidence_map_version),
    )));
    const entries = await Promise.all(input.role_inputs.map(async (roleInput) => {
      const artifact = await this.requireArtifact(roleInput.evidence_packet_artifact_ref, input.title_card_id);
      const packet = artifact.payload as unknown as TopicSelectionResearchEvidencePacket;
      const authoritativePacket = packet?.items
        ? await this.dependencies.evidencePacketResolver.resolve({
            schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1',
            title_card_id: input.title_card_id,
            participant_role: roleInput.participant_role,
            query_intent: packet.query_intent,
            evidence_unit_refs: packet.items.map((item) => item.evidence_unit_ref),
          })
        : null;
      if (artifact.input_snapshot_id !== inputSnapshotId
        || (artifact.workspace_id ?? null) !== (evidenceMap.workspace_id ?? null)
        || packet.schema_version !== 'TopicSelectionResearchEvidencePacket@v1'
        || packet.title_card_id !== input.title_card_id
        || packet.participant_role !== roleInput.participant_role
        || !Array.isArray(packet.items)
        || packet.items.length === 0
        || packet.items.some((item) => (
          !this.sameRef(item.evidence_map_ref, evidenceMapRef)
          || !evidenceUnitKeys.has(this.refKey(item.evidence_unit_ref))
        ))
        || packet.packet_hash !== artifact.checksum
        || !authoritativePacket
        || stableStringify(authoritativePacket) !== stableStringify(packet)) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Role packet ${roleInput.participant_role} is outside the frozen successor snapshot or does not match its current evidence authority.`,
        );
      }
      return [roleInput.participant_role, {
        ref: roleInput.evidence_packet_artifact_ref,
        hash: this.requireChecksum(artifact, 'EvidencePacket'),
        packet,
      }] as const;
    }));
    return Object.fromEntries(entries) as Record<TopicSelectionEvidenceConvergenceRoundRole, FrozenRolePacket>;
  }

  private retrievalHits(searchRun: TopicSelectionSearchRunRecord): TopicSelectionResearchRetrievalHitProvenance[] {
    const hits = searchRun.query_provenance.flatMap((entry) => {
      if (!Array.isArray(entry.hits)) return [];
      return entry.hits.filter((value): value is PersistedHit => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        const hit = value as Partial<PersistedHit>;
        return typeof hit.embedding_version_id === 'string'
          && typeof hit.chunk_hash === 'string'
          && typeof hit.rank === 'number'
          && Boolean(hit.literature_ref)
          && Boolean(hit.chunk_ref);
      });
    }).map((hit) => ({
      literature_ref: hit.literature_ref,
      embedding_version_id: hit.embedding_version_id,
      chunk_id: hit.chunk_id ?? hit.chunk_ref.ref_id,
      chunk_hash: hit.chunk_hash,
      rank: hit.rank,
      hybrid_score: hit.hybrid_score ?? 0,
      vector_score: hit.vector_score ?? 0,
      lexical_score: hit.lexical_score ?? 0,
      is_stale: hit.is_stale ?? false,
    }));
    if (hits.length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Linked round requires persisted chunk-level retrieval provenance.');
    }
    return hits;
  }

  private async requireEvidenceMap(id: string, titleCardId: string): Promise<TopicSelectionEvidenceMapRecord> {
    const map = await this.dependencies.evidenceMaps.findEvidenceMapById(id);
    if (!map) throw new AppError(404, 'NOT_FOUND', `EvidenceMap ${id} was not found.`);
    if (map.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', `EvidenceMap ${id} is outside the title card.`);
    }
    return map;
  }

  private async requireArtifact(
    ref: TopicSelectionFunctionalRef,
    titleCardId: string,
  ): Promise<TopicSelectionArtifactRefRecord> {
    const artifact = await this.dependencies.controlPlane.getArtifactRef(ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `Artifact ${ref.ref_id} was not found.`);
    if (artifact.title_card_id !== titleCardId || ref.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', `Artifact ${ref.ref_id} is outside the title card.`);
    }
    if (ref.version_id && artifact.checksum !== ref.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `Artifact ${ref.ref_id} no longer matches its referenced version.`);
    }
    return artifact;
  }

  private transcriptExecutionIdentity(execution: TopicSelectionResearchArenaRoleExecutionRecord) {
    return {
      arena_role_execution_id: execution.arena_role_execution_id,
      participant_role: execution.participant_role,
      evidence_packet_artifact_ref: execution.evidence_packet_artifact_ref,
      evidence_packet_hash: execution.evidence_packet_hash,
      exposure_set_hash: execution.exposure_set_hash,
      output_artifact_ref: execution.output_artifact_ref,
      output_artifact_hash: execution.output_artifact_hash,
      agent_invocation_audit_artifact_ref: execution.agent_invocation_audit_artifact_ref,
      agent_invocation_audit_artifact_hash: execution.agent_invocation_audit_artifact_hash,
      execution_provenance_hash: execution.execution_provenance_hash,
      prior_role_hashes: execution.prior_role_hashes,
    };
  }

  private evidenceMapRef(map: TopicSelectionEvidenceMapRecord): TopicSelectionFunctionalRef {
    return this.ref('evidence_map', map.evidence_map_id, map.title_card_id, map.evidence_map_version);
  }

  private artifactRef(artifact: TopicSelectionArtifactRefRecord, titleCardId: string): TopicSelectionFunctionalRef {
    return this.ref('artifact_ref', artifact.artifact_ref_id, titleCardId, artifact.checksum ?? undefined);
  }

  private requireChecksum(artifact: TopicSelectionArtifactRefRecord, label: string): string {
    if (!artifact.checksum || !/^[a-f0-9]{64}$/u.test(artifact.checksum)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} has no replay checksum.`);
    }
    if (artifact.payload) {
      const canonicalPayload = artifact.payload.schema_version === 'TopicSelectionResearchEvidencePacket@v1'
        ? Object.fromEntries(Object.entries(artifact.payload).filter(([key]) => key !== 'packet_hash'))
        : artifact.payload;
      if (sha256Text(stableStringify(canonicalPayload)) !== artifact.checksum) {
        throw new AppError(409, 'VERSION_CONFLICT', `${label} checksum does not match its inline payload.`);
      }
    }
    return artifact.checksum;
  }

  private isSameRefValue(value: unknown, expected: TopicSelectionFunctionalRef): boolean {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value)
      && 'ref_type' in value && value.ref_type === expected.ref_type
      && 'ref_id' in value && value.ref_id === expected.ref_id
      && 'title_card_id' in value && value.title_card_id === expected.title_card_id
      && ('version_id' in value ? value.version_id : undefined) === expected.version_id);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private sameRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return `${left.ref_type}:${left.ref_id}:${left.version_id ?? ''}:${left.title_card_id ?? ''}`
      === `${right.ref_type}:${right.ref_id}:${right.version_id ?? ''}:${right.title_card_id ?? ''}`;
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId: string,
    versionId?: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      ...(versionId ? { version_id: versionId } : {}),
    };
  }
}
