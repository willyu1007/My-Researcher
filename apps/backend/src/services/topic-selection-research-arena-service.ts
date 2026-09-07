import crypto from 'node:crypto';
import type {
  TopicSelectionAgentInvocationAuditSnapshot,
  TopicSelectionAgentInvocationProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-invocation-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY,
  TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION,
  type TopicSelectionEvidenceConvergenceRoundLink,
  type TopicSelectionEvidenceConvergenceRoundRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-convergence-contracts';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaCandidateProjection,
  TopicSelectionResearchArenaKind,
  TopicSelectionResearchArenaLoopDeltaRef,
  TopicSelectionResearchArenaParticipantRole,
  TopicSelectionResearchArenaPassKind,
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
  TopicSelectionResearchArenaTerminationReason,
  TopicSelectionResearchEvidencePacket,
  TopicSelectionResearchRetrievalProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionResearchArenaConflictError,
  type TopicSelectionResearchArenaRepository,
} from '../repositories/topic-selection-research-arena.repository.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

type ControlPlaneReads = {
  findInputSnapshotById(inputSnapshotId: string): Promise<TopicSelectionInputSnapshotRecord | null>;
  findArtifactRefById(artifactRefId: string): Promise<TopicSelectionArtifactRefRecord | null>;
};

type OpenSessionInput = {
  session_key: string;
  workspace_id?: string | null;
  title_card_id: string;
  arena_kind: TopicSelectionResearchArenaKind;
  target_ref: TopicSelectionFunctionalRef;
  input_snapshot_id: string;
  participant_roles: readonly TopicSelectionResearchArenaParticipantRole[];
  execution_plan_ref: TopicSelectionFunctionalRef;
  loop_delta_refs?: TopicSelectionResearchArenaLoopDeltaRef[];
  created_by?: string;
};

type RecordRoleExecutionInput = {
  arena_session_id: string;
  role_slot_id: string;
  instance_index: number;
  participant_role: TopicSelectionResearchArenaParticipantRole;
  pass_kind: TopicSelectionResearchArenaPassKind;
  evidence_packet_artifact_ref: TopicSelectionFunctionalRef;
  retrieval_provenance: Omit<TopicSelectionResearchRetrievalProvenance, 'provenance_hash'>;
  exposure_artifact_refs: TopicSelectionFunctionalRef[];
  output_artifact_ref: TopicSelectionFunctionalRef;
  agent_invocation_audit_artifact_ref: TopicSelectionFunctionalRef;
  execution_provenance: TopicSelectionAgentInvocationProvenance;
  prior_role_hashes?: string[];
};

type SynthesizeSessionInput = {
  arena_session_id: string;
  termination_reason: TopicSelectionResearchArenaTerminationReason;
  loop_transcript_artifact_ref: TopicSelectionFunctionalRef;
  candidate_projections: TopicSelectionResearchArenaCandidateProjection[];
};

type SynthesizeEvidenceLandscapeSessionInput = {
  arena_session_id: string;
  loop_transcript_artifact_ref: TopicSelectionFunctionalRef;
  round_link_artifact_ref: TopicSelectionFunctionalRef;
};

type RecordBlockedEvidenceLandscapeSessionInput = {
  arena_session_id: string;
  blocked_transcript_artifact_ref: TopicSelectionFunctionalRef;
};

type ServiceOptions = {
  idFactory?: (prefix: string) => string;
  now?: () => string;
};

export class TopicSelectionResearchArenaService {
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(
    private readonly dependencies: {
      arenaRepository: TopicSelectionResearchArenaRepository;
      controlPlaneRepository: ControlPlaneReads;
    },
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async openSession(input: OpenSessionInput): Promise<TopicSelectionResearchArenaSessionRecord> {
    const replay = await this.dependencies.arenaRepository.findSessionByKey(input.session_key);
    this.assertSessionInput(input);
    const snapshot = await this.requireSnapshot(input.input_snapshot_id, input.title_card_id);
    if (input.workspace_id !== undefined
      && (input.workspace_id ?? null) !== (snapshot.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena workspace scope does not match the bound InputSnapshot.');
    }
    if (!this.sameRef(snapshot.target_ref, input.target_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena target does not match the bound InputSnapshot target.');
    }
    const executionPlan = await this.requireArtifact(input.execution_plan_ref, input.title_card_id, snapshot);
    const executionPlanHash = this.requireArtifactHash(executionPlan, 'Arena execution plan');
    const participantPlanHash = sha256Text(stableStringify({
      execution_plan_checksum: executionPlanHash,
      execution_plan_ref: input.execution_plan_ref,
      participant_roles: [...input.participant_roles],
    }));
    const loopDeltaRefs = input.loop_delta_refs ?? [];
    if (replay) {
      return this.assertExactSessionReplay(replay, input, snapshot, participantPlanHash, loopDeltaRefs);
    }
    const current = await this.dependencies.arenaRepository.findCurrentSession(
      input.title_card_id,
      input.arena_kind,
    );
    await this.assertRetryBoundary(current, snapshot, loopDeltaRefs);
    const now = this.now();
    const record: TopicSelectionResearchArenaSessionRecord = {
      schema_version: 'TopicSelectionResearchArenaSession@v1',
      arena_session_id: this.idFactory('research_arena'),
      session_key: input.session_key,
      current_arena_key: `${input.title_card_id}:${input.arena_kind}`,
      workspace_id: input.workspace_id ?? snapshot.workspace_id ?? null,
      title_card_id: input.title_card_id,
      arena_kind: input.arena_kind,
      target_ref: input.target_ref,
      input_snapshot_id: snapshot.input_snapshot_id,
      input_snapshot_hash: snapshot.snapshot_hash,
      participant_plan_hash: participantPlanHash,
      participant_roles: [...input.participant_roles],
      execution_plan_ref: input.execution_plan_ref,
      status: 'open',
      termination_reason: null,
      loop_transcript_ref: null,
      loop_transcript_hash: null,
      loop_delta_refs: loopDeltaRefs,
      support_only: true,
      supersedes_arena_session_id: current?.arena_session_id ?? null,
      superseded_by_arena_session_id: null,
      created_by: input.created_by?.trim() || 'system',
      created_at: now,
      updated_at: now,
      synthesized_at: null,
      superseded_at: null,
    };
    try {
      const persisted = await this.dependencies.arenaRepository.replaceCurrentSession(record);
      return this.assertExactSessionReplay(
        persisted,
        input,
        snapshot,
        participantPlanHash,
        loopDeltaRefs,
      );
    } catch (error) {
      if (!(error instanceof TopicSelectionResearchArenaConflictError)) throw error;
      const concurrent = await this.dependencies.arenaRepository.findSessionByKey(input.session_key);
      if (concurrent) {
        return this.assertExactSessionReplay(
          concurrent,
          input,
          snapshot,
          participantPlanHash,
          loopDeltaRefs,
        );
      }
      throw new AppError(409, 'VERSION_CONFLICT', error.message);
    }
  }

  private assertExactSessionReplay(
    replay: TopicSelectionResearchArenaSessionRecord,
    input: OpenSessionInput,
    snapshot: TopicSelectionInputSnapshotRecord,
    participantPlanHash: string,
    loopDeltaRefs: TopicSelectionResearchArenaLoopDeltaRef[],
  ): TopicSelectionResearchArenaSessionRecord {
    if (replay.title_card_id !== input.title_card_id
      || replay.arena_kind !== input.arena_kind
      || replay.input_snapshot_id !== snapshot.input_snapshot_id
      || replay.input_snapshot_hash !== snapshot.snapshot_hash
      || replay.participant_plan_hash !== participantPlanHash
      || !this.sameRef(replay.target_ref, input.target_ref)
      || !this.sameRef(replay.execution_plan_ref, input.execution_plan_ref)
      || stableStringify(replay.loop_delta_refs) !== stableStringify(loopDeltaRefs)) {
      throw new AppError(409, 'VERSION_CONFLICT', `Arena session key ${input.session_key} identifies different content.`);
    }
    return replay;
  }

  async getSession(arenaSessionId: string): Promise<TopicSelectionResearchArenaSessionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(arenaSessionId);
    if (!session) {
      throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${arenaSessionId} was not found.`);
    }
    return session;
  }

  async getSessionByKey(sessionKey: string): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    return this.dependencies.arenaRepository.findSessionByKey(sessionKey);
  }

  async claimSessionExecution(
    arenaSessionId: string,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const session = await this.getSession(arenaSessionId);
    if (session.status !== 'open' || !session.current_arena_key) return null;
    return this.dependencies.arenaRepository.claimSessionExecution(arenaSessionId);
  }

  async getCurrentSession(
    titleCardId: string,
    arenaKind: TopicSelectionResearchArenaKind,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    return this.dependencies.arenaRepository.findCurrentSession(titleCardId, arenaKind);
  }

  async listRoleExecutions(
    arenaSessionId: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord[]> {
    await this.getSession(arenaSessionId);
    return this.dependencies.arenaRepository.listRoleExecutionsBySessionId(arenaSessionId);
  }

  async recordRoleExecution(
    input: RecordRoleExecutionInput,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if (!['open', 'executing'].includes(session.status) || !session.current_arena_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Role execution requires the current executable arena.');
    }
    if (!session.participant_roles.includes(input.participant_role)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Participant role is outside the arena execution plan.');
    }
    if (!Number.isInteger(input.instance_index) || input.instance_index < 0 || !input.role_slot_id.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Role slot and non-negative instance index are required.');
    }
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    if (snapshot.snapshot_hash !== session.input_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena InputSnapshot hash no longer matches its bound identity.');
    }
    const evidencePacketArtifact = await this.requireArtifact(
      input.evidence_packet_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const packet = this.readEvidencePacket(evidencePacketArtifact);
    this.assertPacketMatchesRole(packet, session, input);
    const outputArtifact = await this.requireArtifact(input.output_artifact_ref, session.title_card_id, snapshot);
    const outputArtifactHash = this.requireArtifactHash(outputArtifact, 'Role output');
    const semanticPosition = this.readSemanticPosition(outputArtifact);
    const evidencePacketHash = this.requireArtifactHash(evidencePacketArtifact, 'EvidencePacket');
    if (evidencePacketHash !== packet.packet_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'EvidencePacket artifact checksum does not match packet_hash.');
    }
    const invocationAuditArtifact = await this.requireArtifact(
      input.agent_invocation_audit_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const invocationAuditArtifactHash = this.requireArtifactHash(invocationAuditArtifact, 'Agent invocation audit');
    const invocationAudit = this.readInvocationAudit(invocationAuditArtifact);
    if (invocationAuditArtifact.workflow_run_id !== invocationAudit.workflow_run_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Agent invocation audit artifact has a different workflow identity.');
    }
    this.assertInvocationAudit(
      invocationAudit,
      input.execution_provenance,
      input.participant_role,
      outputArtifactHash,
    );
    const executionProvenanceHash = sha256Text(stableStringify(input.execution_provenance));

    this.assertRetrieval(input, packet);
    const priorExecutions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(session.arena_session_id);
    const exposureKeys = new Set(input.exposure_artifact_refs.map((ref) => this.refKey(ref)));
    if (!exposureKeys.has(this.refKey(input.evidence_packet_artifact_ref))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Role exposure must include its exact EvidencePacket artifact.');
    }
    if (input.pass_kind === 'first_pass') {
      const peerOutputKeys = new Set(priorExecutions.map((record) => this.refKey(record.output_artifact_ref)));
      if ([...exposureKeys].some((key) => peerOutputKeys.has(key))) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'First-pass exposure contains a same-stage peer output.');
      }
      if ((input.prior_role_hashes ?? []).length > 0) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'First-pass execution cannot declare prior role hashes.');
      }
    }

    const evidencePartitionRefs = packet.items.map((item) => item.evidence_unit_ref);
    if (evidencePartitionRefs.length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Role execution cannot be admitted without claim-bearing evidence.');
    }
    const retrievalBody = input.retrieval_provenance;
    const retrievalProvenance = {
      ...retrievalBody,
      provenance_hash: sha256Text(stableStringify(retrievalBody)),
    };
    const exposureArtifactRefs = this.uniqueSortedRefs(input.exposure_artifact_refs);
    const exposureSetHash = sha256Text(stableStringify(exposureArtifactRefs));
    const priorRoleHashes = [...new Set(input.prior_role_hashes ?? [])].sort();
    const semanticPositionHash = sha256Text(stableStringify(semanticPosition));
    const runtimeIdentityHash = sha256Text(stableStringify({
      arena_session_id: session.arena_session_id,
      agent_invocation_audit_artifact_hash: invocationAuditArtifactHash,
      agent_invocation_audit_artifact_ref: input.agent_invocation_audit_artifact_ref,
      evidence_packet_hash: evidencePacketHash,
      evidence_packet_artifact_ref: input.evidence_packet_artifact_ref,
      execution_provenance_hash: executionProvenanceHash,
      exposure_set_hash: exposureSetHash,
      input_snapshot_hash: session.input_snapshot_hash,
      instance_index: input.instance_index,
      output_artifact_hash: outputArtifactHash,
      output_artifact_ref: input.output_artifact_ref,
      participant_role: input.participant_role,
      pass_kind: input.pass_kind,
      prior_role_hashes: priorRoleHashes,
      retrieval_provenance_hash: retrievalProvenance.provenance_hash,
      role_slot_id: input.role_slot_id,
      semantic_position_hash: semanticPositionHash,
    }));
    const record: TopicSelectionResearchArenaRoleExecutionRecord = {
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v2',
      execution_identity_status: 'product_invocation_verified',
      arena_role_execution_id: this.idFactory('arena_role_execution'),
      arena_session_id: session.arena_session_id,
      title_card_id: session.title_card_id,
      role_slot_id: input.role_slot_id,
      instance_index: input.instance_index,
      participant_role: input.participant_role,
      pass_kind: input.pass_kind,
      input_snapshot_id: session.input_snapshot_id,
      input_snapshot_hash: session.input_snapshot_hash,
      query_intent: input.retrieval_provenance.query_intent,
      evidence_packet_artifact_ref: input.evidence_packet_artifact_ref,
      evidence_packet_hash: evidencePacketHash,
      evidence_partition_refs: evidencePartitionRefs,
      retrieval_provenance: retrievalProvenance,
      exposure_artifact_refs: exposureArtifactRefs,
      exposure_set_hash: exposureSetHash,
      output_artifact_ref: input.output_artifact_ref,
      output_artifact_hash: outputArtifactHash,
      semantic_position_hash: semanticPositionHash,
      agent_invocation_audit_artifact_ref: input.agent_invocation_audit_artifact_ref,
      agent_invocation_audit_artifact_hash: invocationAuditArtifactHash,
      execution_provenance_hash: executionProvenanceHash,
      prior_role_hashes: priorRoleHashes,
      runtime_identity_hash: runtimeIdentityHash,
      created_at: this.now(),
    };
    const replay = await this.dependencies.arenaRepository.findRoleExecutionBySlot(
      session.arena_session_id,
      input.role_slot_id,
      input.instance_index,
    );
    if (replay) return this.assertExactRoleExecutionReplay(replay, record);
    try {
      const persisted = await this.dependencies.arenaRepository.createRoleExecution(record);
      return this.assertExactRoleExecutionReplay(persisted, record);
    } catch (error) {
      if (!(error instanceof TopicSelectionResearchArenaConflictError)) throw error;
      const concurrent = await this.dependencies.arenaRepository.findRoleExecutionBySlot(
        session.arena_session_id,
        input.role_slot_id,
        input.instance_index,
      );
      if (concurrent) return this.assertExactRoleExecutionReplay(concurrent, record);
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena role execution changed concurrently.');
    }
  }

  async synthesizeSession(input: SynthesizeSessionInput): Promise<TopicSelectionResearchArenaSessionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if (session.status !== 'open' || !session.current_arena_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only the current open arena can be synthesized.');
    }
    const executions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(session.arena_session_id);
    const firstPassExecutions = executions.filter((execution) => (
      execution.pass_kind === 'first_pass'
      && execution.schema_version === 'TopicSelectionResearchArenaRoleExecution@v2'
    ));
    const allFirstPassExecutions = executions.filter((execution) => execution.pass_kind === 'first_pass');
    const firstPassRoles = new Set(firstPassExecutions.map((execution) => execution.participant_role));
    const requiredRoles = session.participant_roles.filter((role) => role !== 'synthesis_arbiter');
    if (requiredRoles.length < 2
      || allFirstPassExecutions.length !== firstPassExecutions.length
      || firstPassExecutions.length !== requiredRoles.length
      || requiredRoles.some((role) => !firstPassRoles.has(role))) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Arena synthesis requires independent durable first-pass output from every substantive role.',
      );
    }
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    const transcriptArtifact = await this.requireArtifact(
      input.loop_transcript_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const transcriptHash = this.requireArtifactHash(transcriptArtifact, 'Arena transcript');
    this.assertTranscriptExecutions(transcriptArtifact, firstPassExecutions);
    this.assertCandidateProjections(
      input.candidate_projections,
      transcriptArtifact,
      transcriptHash,
      session,
      snapshot,
      input.termination_reason,
    );
    const now = this.now();
    try {
      return await this.dependencies.arenaRepository.synthesizeSessionWithCandidateProjections({
        ...session,
        status: 'synthesized',
        termination_reason: input.termination_reason,
        loop_transcript_ref: input.loop_transcript_artifact_ref,
        loop_transcript_hash: transcriptHash,
        updated_at: now,
        synthesized_at: now,
      }, input.candidate_projections);
    } catch (error) {
      if (error instanceof TopicSelectionResearchArenaConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async synthesizeEvidenceLandscapeSession(
    input: SynthesizeEvidenceLandscapeSessionInput,
  ): Promise<TopicSelectionResearchArenaSessionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if (session.arena_kind !== 'evidence_landscape') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Evidence convergence can synthesize only an evidence-landscape arena.');
    }
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    const transcriptArtifact = await this.requireArtifact(
      input.loop_transcript_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const transcriptHash = this.requireArtifactHash(transcriptArtifact, 'Evidence-convergence transcript');
    const synthesizedReplay = session.status === 'synthesized' || session.status === 'superseded';
    if (synthesizedReplay && (!session.loop_transcript_ref
      || !this.sameRef(session.loop_transcript_ref, input.loop_transcript_artifact_ref)
      || session.loop_transcript_hash !== transcriptHash)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Synthesized evidence-convergence arena has a different transcript.');
    }
    if (!synthesizedReplay
      && (!['open', 'executing'].includes(session.status) || !session.current_arena_key)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only the current executable evidence-convergence arena can be synthesized.');
    }

    const executions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(
      session.arena_session_id,
    );
    const requiredFirstPassRoles = session.participant_roles.filter((role) => role !== 'synthesis_arbiter');
    const firstPasses = executions.filter((execution) => execution.pass_kind === 'first_pass');
    const synthesisExecutions = executions.filter((execution) => execution.pass_kind === 'synthesis');
    if (requiredFirstPassRoles.length < 2
      || firstPasses.length !== requiredFirstPassRoles.length
      || requiredFirstPassRoles.some((role) => !firstPasses.some((execution) => execution.participant_role === role))
      || synthesisExecutions.length !== 1
      || synthesisExecutions[0]?.participant_role !== 'synthesis_arbiter'
      || executions.length !== firstPasses.length + 1) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Evidence-convergence synthesis requires two independent first passes and one synthesis arbiter execution.',
      );
    }
    this.assertTranscriptExecutions(transcriptArtifact, firstPasses);
    const transcript = transcriptArtifact.payload;
    if (transcript?.schema_version !== 'TopicSelectionEvidenceConvergenceRoundTranscript@v1'
      || transcript.arena_session_id !== session.arena_session_id
      || transcript.input_snapshot_id !== session.input_snapshot_id
      || transcript.support_only !== true
      || stableStringify(transcript.synthesis_execution)
        !== stableStringify(this.transcriptExecutionIdentity(synthesisExecutions[0]!))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Evidence-convergence transcript does not bind the exact synthesis execution.');
    }

    const roundLinkArtifact = await this.requireArtifact(
      input.round_link_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    this.requireArtifactHash(roundLinkArtifact, 'Evidence-convergence round link');
    const roundLink = roundLinkArtifact.payload as unknown as TopicSelectionEvidenceConvergenceRoundLink;
    const parentSessionId = session.supersedes_arena_session_id;
    const parent = parentSessionId
      ? await this.dependencies.arenaRepository.findSessionById(parentSessionId)
      : null;
    if (!parent || !parent.loop_transcript_hash
      || !parent.loop_transcript_ref
      || roundLink.schema_version !== TOPIC_SELECTION_EVIDENCE_CONVERGENCE_ROUND_LINK_SCHEMA_VERSION
      || roundLink.arena_session_ref.ref_type !== 'research_arena_session'
      || roundLink.arena_session_ref.ref_id !== session.arena_session_id
      || roundLink.supersedes_arena_session_ref.ref_type !== 'research_arena_session'
      || roundLink.supersedes_arena_session_ref.ref_id !== parent.arena_session_id
      || roundLink.parent_transcript_hash !== parent.loop_transcript_hash
      || roundLink.evidence_delta_ref.ref_type !== 'artifact_ref'
      || !session.loop_delta_refs.some((delta) => this.sameRef(delta.ref, roundLink.evidence_delta_ref))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence round link does not match the parent transcript and session lineage.');
    }
    const parentTranscriptArtifact = await this.requireLineageArtifact(
      parent.loop_transcript_ref,
      parent,
      'Parent arena transcript',
    );
    if (this.requireArtifactHash(parentTranscriptArtifact, 'Parent arena transcript')
      !== parent.loop_transcript_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Parent arena transcript no longer matches its frozen hash.');
    }
    const deltaArtifact = await this.requireSnapshotSourceArtifact(
      roundLink.evidence_delta_ref,
      session.title_card_id,
      snapshot,
    );
    if (this.requireArtifactHash(deltaArtifact, 'EvidenceDelta') !== roundLink.evidence_delta_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence round link carries a different EvidenceDelta hash.');
    }
    const synthesisExecution = synthesisExecutions[0]!;
    const synthesisArtifact = await this.requireArtifact(
      synthesisExecution.output_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const synthesisOutput = synthesisArtifact.payload as unknown as TopicSelectionEvidenceConvergenceRoundRoleOutput;
    const issueRefs = Array.isArray(deltaArtifact.payload?.issue_refs)
      ? deltaArtifact.payload.issue_refs
      : [];
    if (this.requireArtifactHash(synthesisArtifact, 'Evidence-convergence synthesis output')
        !== synthesisExecution.output_artifact_hash
      || synthesisOutput.schema_version !== 'TopicSelectionEvidenceConvergenceRoundRoleOutput@v1'
      || synthesisOutput.participant_role !== 'synthesis_arbiter'
      || synthesisOutput.support_only !== true
      || !this.sameRef(synthesisOutput.evidence_map_ref, session.target_ref)
      || !this.sameRef(synthesisOutput.evidence_delta_ref, roundLink.evidence_delta_ref)
      || !issueRefs.some((issueRef) => this.isSameRefValue(issueRef, synthesisOutput.issue_ref))
      || !['recheck_same_gate', 'remain_unresolved'].includes(
        synthesisOutput.semantic_position?.recommended_disposition,
      )) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence synthesis output is outside the frozen round authority.');
    }
    const terminationReason: TopicSelectionResearchArenaTerminationReason =
      synthesisOutput.semantic_position.recommended_disposition === 'recheck_same_gate'
        ? 'recommendation_ready'
        : 'evidence_expansion_required';
    if (synthesizedReplay) {
      if (session.termination_reason !== terminationReason) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Synthesized evidence-convergence arena has a different disposition.');
      }
      return session;
    }

    const now = this.now();
    try {
      const completed = {
        ...session,
        status: 'synthesized',
        termination_reason: terminationReason,
        loop_transcript_ref: input.loop_transcript_artifact_ref,
        loop_transcript_hash: transcriptHash,
        updated_at: now,
        synthesized_at: now,
      } as const;
      return await (session.status === 'executing'
        ? this.dependencies.arenaRepository.completeClaimedSession(completed)
        : this.dependencies.arenaRepository.updateSession(completed));
    } catch (error) {
      if (error instanceof TopicSelectionResearchArenaConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async recordBlockedEvidenceLandscapeSession(
    input: RecordBlockedEvidenceLandscapeSessionInput,
  ): Promise<TopicSelectionResearchArenaSessionRecord> {
    const session = await this.getSession(input.arena_session_id);
    if (session.arena_kind !== 'evidence_landscape'
      || session.status !== 'executing'
      || !session.current_arena_key) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'Only a claimed evidence-landscape arena can record a blocked terminal outcome.',
      );
    }
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    const artifact = await this.requireArtifact(
      input.blocked_transcript_artifact_ref,
      session.title_card_id,
      snapshot,
    );
    const payload = artifact.payload;
    const artifactHash = this.requireArtifactHash(artifact, 'Blocked evidence-convergence transcript');
    if (payload?.schema_version !== 'TopicSelectionEvidenceConvergenceRoundBlocked@v1'
      || payload.arena_session_id !== session.arena_session_id
      || payload.input_snapshot_id !== session.input_snapshot_id
      || payload.support_only !== true) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Blocked evidence-convergence transcript does not bind the claimed arena.',
      );
    }
    const now = this.now();
    try {
      return await this.dependencies.arenaRepository.completeClaimedSession({
        ...session,
        status: 'blocked',
        termination_reason: 'policy_blocked',
        loop_transcript_ref: input.blocked_transcript_artifact_ref,
        loop_transcript_hash: artifactHash,
        updated_at: now,
      });
    } catch (error) {
      if (error instanceof TopicSelectionResearchArenaConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  private assertTranscriptExecutions(
    transcriptArtifact: TopicSelectionArtifactRefRecord,
    executions: TopicSelectionResearchArenaRoleExecutionRecord[],
  ): void {
    const recorded = transcriptArtifact.payload?.independent_first_pass;
    if (!Array.isArray(recorded)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript omits independent first-pass identity.');
    }
    const expected = executions.map((execution) => ({
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
    }));
    const byExecutionId = (left: unknown, right: unknown) => {
      const id = (value: unknown) => (
        value && typeof value === 'object' && !Array.isArray(value)
          && 'arena_role_execution_id' in value && typeof value.arena_role_execution_id === 'string'
          ? value.arena_role_execution_id
          : ''
      );
      return id(left).localeCompare(id(right));
    };
    if (recorded.length !== expected.length
      || stableStringify([...recorded].sort(byExecutionId))
        !== stableStringify(expected.sort(byExecutionId))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena transcript does not identify the exact audited first passes.');
    }
  }

  private assertCandidateProjections(
    projections: TopicSelectionResearchArenaCandidateProjection[],
    transcriptArtifact: TopicSelectionArtifactRefRecord,
    transcriptHash: string,
    session: TopicSelectionResearchArenaSessionRecord,
    snapshot: TopicSelectionInputSnapshotRecord,
    terminationReason: TopicSelectionResearchArenaTerminationReason,
  ): void {
    const transcript = transcriptArtifact.payload;
    const synthesis = transcript?.advisory_synthesis;
    if (transcript?.schema_version !== 'TopicSelectionResearchArenaLoopTranscript@v2'
      || transcript.arena_session_id !== session.arena_session_id
      || transcript.input_snapshot_id !== session.input_snapshot_id
      || transcript.support_only !== true
      || !synthesis
      || typeof synthesis !== 'object'
      || Array.isArray(synthesis)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript cannot authorize candidate advisory projection.');
    }
    const synthesisRecord = synthesis as Record<string, unknown>;
    if (synthesisRecord.support_only !== true || !Array.isArray(synthesisRecord.candidate_dispositions)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript cannot authorize candidate advisory projection.');
    }
    const terminationByOutcome = {
      selected: 'recommendation_ready',
      none_viable: 'none_viable',
      evidence_expansion_required: 'evidence_expansion_required',
      reframe_required: 'reframe_required',
    } as const;
    const outcome = typeof synthesisRecord.outcome === 'string'
      ? synthesisRecord.outcome as keyof typeof terminationByOutcome
      : null;
    const expectedTerminationReason = outcome ? terminationByOutcome[outcome] : undefined;
    if (!expectedTerminationReason || expectedTerminationReason !== terminationReason) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena termination reason contradicts its support-only synthesis.');
    }
    const dispositions = new Map<string, Record<string, unknown>>();
    for (const value of synthesisRecord.candidate_dispositions) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !this.isRef(value.candidate_ref, 'need_candidate')) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript candidate disposition is malformed.');
      }
      const disposition = value as Record<string, unknown>;
      const dispositionKind = disposition.disposition;
      const dropReason = disposition.drop_reason_code;
      const reopeningConditions = disposition.reopening_conditions;
      const selectedAgainst = disposition.selected_against_candidate_ref;
      const hasValidDropReason = typeof dropReason === 'string'
        && TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES.includes(
          dropReason as (typeof TOPIC_SELECTION_CANDIDATE_DROP_REASON_CODES)[number],
        );
      if (!['selected', 'parked', 'dropped'].includes(String(dispositionKind))
        || !Array.isArray(reopeningConditions)
        || reopeningConditions.some((condition) => typeof condition !== 'string' || !condition.trim())
        || (dispositionKind !== 'selected' && reopeningConditions.length === 0)
        || ((dispositionKind === 'dropped') !== hasValidDropReason)
        || (selectedAgainst !== null && !this.isRef(selectedAgainst, 'need_candidate'))
        || (dispositionKind !== 'parked' && selectedAgainst !== null)) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript candidate disposition is inconsistent.');
      }
      const key = this.refKey(disposition.candidate_ref as TopicSelectionFunctionalRef);
      if (dispositions.has(key)) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena transcript repeats a candidate disposition.');
      }
      dispositions.set(key, disposition);
    }
    const selected = [...dispositions.values()].filter((value) => value.disposition === 'selected');
    const selectedRef = selected.length === 1
      ? selected[0]?.candidate_ref as TopicSelectionFunctionalRef
      : null;
    const selectedRefKey = selectedRef ? this.refKey(selectedRef) : null;
    const selectedAgainstIsConsistent = [...dispositions.values()].every((value) => {
      const selectedAgainst = value.selected_against_candidate_ref;
      if (outcome !== 'selected') return selectedAgainst === null;
      if (value.disposition !== 'parked') return selectedAgainst === null;
      return this.isRef(selectedAgainst, 'need_candidate')
        && this.refKey(selectedAgainst) === selectedRefKey;
    });
    if ((outcome === 'selected' && selected.length !== 1)
      || (outcome === 'none_viable' && [...dispositions.values()].some((value) => value.disposition !== 'dropped'))
      || (outcome === 'reframe_required' && selected.length > 0)
      || !selectedAgainstIsConsistent) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena portfolio outcome contradicts its candidate dispositions.');
    }
    const snapshotRefs = new Set([...snapshot.source_refs, snapshot.target_ref].map((ref) => this.refKey(ref)));
    if (projections.length === 0 || projections.length !== dispositions.size) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Arena candidate projections must cover the exact synthesized portfolio.');
    }
    const projectionKeys = new Set<string>();
    for (const projection of projections) {
      const key = this.refKey(projection.candidate_ref);
      const disposition = dispositions.get(key);
      const advisory = projection.advisory;
      if (projection.candidate_ref.ref_type !== 'need_candidate'
        || projection.candidate_ref.title_card_id !== session.title_card_id
        || typeof projection.candidate_ref.version_id !== 'string'
        || !projection.candidate_ref.version_id
        || !snapshotRefs.has(key)
        || projectionKeys.has(key)
        || !/^[a-f0-9]{64}$/u.test(projection.semantic_group_key)
        || !disposition
        || advisory.support_only !== true
        || advisory.arena_session_id !== session.arena_session_id
        || advisory.arena_synthesis_ref.ref_type !== 'artifact_ref'
        || advisory.arena_synthesis_ref.ref_id !== transcriptArtifact.artifact_ref_id
        || advisory.arena_synthesis_hash !== transcriptHash
        || advisory.disposition !== disposition.disposition
        || advisory.rationale !== disposition.rationale
        || advisory.drop_reason_code !== disposition.drop_reason_code
        || stableStringify(advisory.reopening_conditions) !== stableStringify(disposition.reopening_conditions)
        || stableStringify(advisory.selected_against_candidate_ref) !== stableStringify(
          disposition.selected_against_candidate_ref,
        )) {
        throw new AppError(409, 'VERSION_CONFLICT', 'Arena candidate projection does not match the exact support-only synthesis.');
      }
      projectionKeys.add(key);
    }
  }

  private assertSessionInput(input: OpenSessionInput): void {
    const roles = [...input.participant_roles];
    if (!input.session_key.trim() || !input.title_card_id.trim() || roles.length < 2
      || new Set(roles).size !== roles.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena requires a key, title card, and at least two distinct roles.');
    }
  }

  private async assertRetryBoundary(
    current: TopicSelectionResearchArenaSessionRecord | null,
    snapshot: TopicSelectionInputSnapshotRecord,
    loopDeltaRefs: TopicSelectionResearchArenaLoopDeltaRef[],
  ): Promise<void> {
    if (!current) {
      if (loopDeltaRefs.length > 0) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          'An initial arena cannot claim a retry delta without a superseded session.',
        );
      }
      return;
    }
    if (current.status === 'open' || current.status === 'executing') {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        'An active arena must reach a terminal state before a retry can replace it.',
      );
    }
    if (loopDeltaRefs.length === 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'A repeated arena requires a recorded evidence, candidate, constraint, or human-objective delta.',
      );
    }
    if (current.supersedes_arena_session_id && current.arena_kind !== 'evidence_landscape') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'The shadow arena admits at most one typed-delta retry.',
      );
    }
    if (current.arena_kind === 'evidence_landscape') {
      const incomingIssueKeys = await this.evidenceDeltaIssueKeys(
        loopDeltaRefs,
        snapshot,
      );
      const linkedRoundCounts = new Map([...incomingIssueKeys].map((key) => [key, 0]));
      let cursor: TopicSelectionResearchArenaSessionRecord | null = current;
      const visited = new Set<string>();
      while (cursor) {
        if (visited.has(cursor.arena_session_id)) {
          throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence arena lineage contains a cycle.');
        }
        visited.add(cursor.arena_session_id);
        const roundIssueKeys = await this.persistedEvidenceDeltaIssueKeys(cursor);
        for (const issueKey of incomingIssueKeys) {
          if (roundIssueKeys.has(issueKey)) {
            linkedRoundCounts.set(issueKey, (linkedRoundCounts.get(issueKey) ?? 0) + 1);
          }
        }
        if (!cursor.supersedes_arena_session_id) break;
        const parent = await this.dependencies.arenaRepository.findSessionById(
          cursor.supersedes_arena_session_id,
        );
        if (!parent) {
          throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence arena lineage has a missing parent.');
        }
        cursor = parent;
      }
      if ([...linkedRoundCounts.values()].some((count) => (
        count >= TOPIC_SELECTION_EVIDENCE_CONVERGENCE_EXECUTION_POLICY.max_linked_rounds_per_issue
      ))) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Evidence-convergence linked-round boundary is exhausted.');
      }
    }
    if (snapshot.snapshot_hash === current.input_snapshot_hash) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'A retry delta must be bound to a changed InputSnapshot.',
      );
    }
    const boundRefKeys = new Set(
      [...snapshot.source_refs, snapshot.target_ref].map((candidate) => this.refKey(candidate)),
    );
    if (loopDeltaRefs.some((delta) => !boundRefKeys.has(this.refKey(delta.ref)))) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Every retry delta ref must be present in the changed InputSnapshot.',
      );
    }
  }

  private async evidenceDeltaIssueKeys(
    loopDeltaRefs: TopicSelectionResearchArenaLoopDeltaRef[],
    snapshot: TopicSelectionInputSnapshotRecord,
  ): Promise<Set<string>> {
    if (!snapshot.title_card_id) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Evidence-convergence InputSnapshot has no title-card scope.');
    }
    const issueKeys = new Set<string>();
    for (const delta of loopDeltaRefs.filter((candidate) => candidate.delta_type === 'evidence')) {
      const artifact = await this.requireSnapshotSourceArtifact(delta.ref, snapshot.title_card_id, snapshot);
      this.requireArtifactHash(artifact, 'EvidenceDelta');
      for (const issueRef of this.readEvidenceDeltaIssueRefs(artifact)) {
        issueKeys.add(this.refKey(issueRef));
      }
    }
    if (issueKeys.size === 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'An evidence-convergence retry requires a material EvidenceDelta with at least one issue ref.',
      );
    }
    return issueKeys;
  }

  private async persistedEvidenceDeltaIssueKeys(
    session: TopicSelectionResearchArenaSessionRecord,
  ): Promise<Set<string>> {
    const snapshot = await this.requireSnapshot(session.input_snapshot_id, session.title_card_id);
    if ((snapshot.workspace_id ?? null) !== (session.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Historical evidence-convergence snapshot crossed workspace scope.');
    }
    const issueKeys = new Set<string>();
    for (const delta of session.loop_delta_refs.filter((candidate) => candidate.delta_type === 'evidence')) {
      const artifact = await this.requireSnapshotSourceArtifact(
        delta.ref,
        session.title_card_id,
        snapshot,
      );
      this.requireArtifactHash(artifact, 'Historical EvidenceDelta');
      for (const issueRef of this.readEvidenceDeltaIssueRefs(artifact)) {
        issueKeys.add(this.refKey(issueRef));
      }
    }
    return issueKeys;
  }

  private readEvidenceDeltaIssueRefs(
    artifact: TopicSelectionArtifactRefRecord,
  ): TopicSelectionFunctionalRef[] {
    const payload = artifact.payload;
    if (payload?.schema_version !== 'TopicSelectionEvidenceDelta@v1'
      || payload.material !== true
      || !Array.isArray(payload.issue_refs)
      || payload.issue_refs.length === 0
      || payload.issue_refs.some((value) => !this.isRef(value, 'coverage_row_intent'))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'EvidenceDelta issue lineage is malformed or non-material.');
    }
    return payload.issue_refs as unknown as TopicSelectionFunctionalRef[];
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

  private async requireSnapshot(snapshotId: string, titleCardId: string): Promise<TopicSelectionInputSnapshotRecord> {
    const snapshot = await this.dependencies.controlPlaneRepository.findInputSnapshotById(snapshotId);
    if (!snapshot) throw new AppError(404, 'NOT_FOUND', `InputSnapshot ${snapshotId} was not found.`);
    if (snapshot.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', `InputSnapshot ${snapshotId} is outside the arena title card.`);
    }
    return snapshot;
  }

  private async requireArtifact(
    ref: TopicSelectionFunctionalRef,
    titleCardId: string,
    snapshot: TopicSelectionInputSnapshotRecord,
  ): Promise<TopicSelectionArtifactRefRecord> {
    if (ref.ref_type !== 'artifact_ref') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena artifacts require artifact_ref refs.');
    }
    const artifact = await this.dependencies.controlPlaneRepository.findArtifactRefById(ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `ArtifactRef ${ref.ref_id} was not found.`);
    if (artifact.title_card_id !== titleCardId
      || (artifact.workspace_id ?? null) !== (snapshot.workspace_id ?? null)
      || artifact.input_snapshot_id !== snapshot.input_snapshot_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} is outside the bound arena snapshot.`);
    }
    if (ref.version_id && artifact.checksum !== ref.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} no longer matches its referenced version.`);
    }
    return artifact;
  }

  private async requireSnapshotSourceArtifact(
    ref: TopicSelectionFunctionalRef,
    titleCardId: string,
    snapshot: TopicSelectionInputSnapshotRecord,
  ): Promise<TopicSelectionArtifactRefRecord> {
    if (ref.ref_type !== 'artifact_ref'
      || !snapshot.source_refs.some((sourceRef) => this.sameRef(sourceRef, ref))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena source artifact is absent from the frozen InputSnapshot.');
    }
    const artifact = await this.dependencies.controlPlaneRepository.findArtifactRefById(ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `ArtifactRef ${ref.ref_id} was not found.`);
    if (artifact.title_card_id !== titleCardId
      || (artifact.workspace_id ?? null) !== (snapshot.workspace_id ?? null)) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} is outside the arena title card.`);
    }
    if (ref.version_id && artifact.checksum !== ref.version_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} no longer matches its referenced version.`);
    }
    return artifact;
  }

  private async requireLineageArtifact(
    ref: TopicSelectionFunctionalRef,
    session: TopicSelectionResearchArenaSessionRecord,
    label: string,
  ): Promise<TopicSelectionArtifactRefRecord> {
    if (ref.ref_type !== 'artifact_ref') {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} is not an artifact ref.`);
    }
    const artifact = await this.dependencies.controlPlaneRepository.findArtifactRefById(ref.ref_id);
    if (!artifact) throw new AppError(404, 'NOT_FOUND', `ArtifactRef ${ref.ref_id} was not found.`);
    if (artifact.title_card_id !== session.title_card_id
      || (artifact.workspace_id ?? null) !== (session.workspace_id ?? null)
      || artifact.input_snapshot_id !== session.input_snapshot_id
      || (ref.version_id && artifact.checksum !== ref.version_id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} is outside its arena lineage.`);
    }
    return artifact;
  }

  private requireArtifactHash(artifact: TopicSelectionArtifactRefRecord, label: string): string {
    if (!artifact.checksum || !/^[a-f0-9]{64}$/.test(artifact.checksum)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${label} artifact requires a sha256 checksum.`);
    }
    if (artifact.storage_kind === 'inline' && artifact.payload) {
      const payload = artifact.payload;
      const canonicalPayload = payload.schema_version === 'TopicSelectionResearchEvidencePacket@v1'
        ? Object.fromEntries(Object.entries(payload).filter(([key]) => key !== 'packet_hash'))
        : payload;
      if (sha256Text(stableStringify(canonicalPayload)) !== artifact.checksum) {
        throw new AppError(409, 'VERSION_CONFLICT', `${label} artifact checksum does not match its inline payload.`);
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

  private readInvocationAudit(
    artifact: TopicSelectionArtifactRefRecord,
  ): TopicSelectionAgentInvocationAuditSnapshot {
    const value = artifact.payload;
    if (artifact.artifact_kind !== 'diagnostic'
      || !value
      || value.schema_version !== 'topic-selection-agent-invocation-audit-v1'
      || value.status !== 'succeeded'
      || !value.provenance
      || typeof value.provenance !== 'object'
      || Array.isArray(value.provenance)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Agent invocation audit is not a succeeded product audit snapshot.');
    }
    return value as unknown as TopicSelectionAgentInvocationAuditSnapshot;
  }

  private assertInvocationAudit(
    audit: TopicSelectionAgentInvocationAuditSnapshot,
    provenance: TopicSelectionAgentInvocationProvenance,
    participantRole: TopicSelectionResearchArenaParticipantRole,
    outputArtifactHash: string,
  ): void {
    const expectedNodeId = `topic_selection_research_arena_${participantRole}`;
    if (audit.node_id !== expectedNodeId
      || audit.provenance.node_id !== expectedNodeId
      || audit.workflow_run_id !== provenance.workflow_run_id
      || audit.node_attempt_id !== provenance.node_attempt_id
      || audit.provenance.executor_kind !== 'multi_agent_debate'
      || audit.provenance.run_mode !== 'acceptance'
      || audit.provenance.structured_output_hash !== outputArtifactHash
      || stableStringify(audit.provenance) !== stableStringify(provenance)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Agent invocation audit does not identify the admitted role output.');
    }
  }

  private assertExactRoleExecutionReplay(
    existing: TopicSelectionResearchArenaRoleExecutionRecord,
    requested: TopicSelectionResearchArenaRoleExecutionRecord,
  ): TopicSelectionResearchArenaRoleExecutionRecord {
    const replayIdentity = (record: TopicSelectionResearchArenaRoleExecutionRecord) => ({
      ...record,
      arena_role_execution_id: null,
      created_at: null,
      // The hash profile was tightened after v2 shipped; source identity fields remain authoritative.
      runtime_identity_hash: null,
    });
    if (stableStringify(replayIdentity(existing)) !== stableStringify(replayIdentity(requested))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Arena role slot already identifies a different audited execution.');
    }
    return existing;
  }

  private readEvidencePacket(artifact: TopicSelectionArtifactRefRecord): TopicSelectionResearchEvidencePacket {
    const value = artifact.payload;
    if (!value || value.schema_version !== 'TopicSelectionResearchEvidencePacket@v1'
      || typeof value.title_card_id !== 'string' || typeof value.participant_role !== 'string'
      || !value.query_intent || !Array.isArray(value.items) || value.items.length === 0
      || value.items.some((item) => !item || typeof item !== 'object' || Array.isArray(item)
        || !this.isRef(item.evidence_unit_ref, 'evidence_unit')
        || !this.isRef(item.literature_ref, 'literature_record'))
      || typeof value.packet_hash !== 'string') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'EvidencePacket artifact does not contain a resolved packet.');
    }
    return value as unknown as TopicSelectionResearchEvidencePacket;
  }

  private readSemanticPosition(artifact: TopicSelectionArtifactRefRecord): Record<string, unknown> {
    const semanticPosition = artifact.payload?.semantic_position;
    if (!semanticPosition || typeof semanticPosition !== 'object' || Array.isArray(semanticPosition)
      || Object.keys(semanticPosition).length === 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Role output requires a non-empty semantic_position payload.');
    }
    return semanticPosition as Record<string, unknown>;
  }

  private assertPacketMatchesRole(
    packet: TopicSelectionResearchEvidencePacket,
    session: TopicSelectionResearchArenaSessionRecord,
    input: RecordRoleExecutionInput,
  ): void {
    if (packet.title_card_id !== session.title_card_id
      || packet.participant_role !== input.participant_role
      || stableStringify(packet.query_intent) !== stableStringify(input.retrieval_provenance.query_intent)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'EvidencePacket role/query intent does not match role execution.');
    }
  }

  private assertRetrieval(input: RecordRoleExecutionInput, packet: TopicSelectionResearchEvidencePacket): void {
    const provenance = input.retrieval_provenance;
    if (provenance.participant_role !== input.participant_role
      || provenance.search_run_ref.ref_type !== 'search_run'
      || provenance.hits.length === 0
      || provenance.hits.some((hit) => hit.is_stale || !hit.chunk_id.trim()
        || !/^[a-f0-9]{64}$/.test(hit.chunk_hash))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Role retrieval provenance is missing, stale, or not chunk-addressable.');
    }
    const literatureIds = new Set(packet.items.map((item) => item.literature_ref.ref_id));
    const retrievedLiteratureIds = new Set(provenance.hits.map((hit) => hit.literature_ref.ref_id));
    if ([...literatureIds].some((literatureId) => !retrievedLiteratureIds.has(literatureId))) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Every EvidencePacket source must be grounded in the recorded retrieval hits.');
    }
  }

  private sameRef(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private isRef(value: unknown, refType: string): value is TopicSelectionFunctionalRef {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value)
      && 'ref_type' in value && value.ref_type === refType
      && 'ref_id' in value && typeof value.ref_id === 'string' && value.ref_id.length > 0);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private uniqueSortedRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((ref) => [this.refKey(ref), ref])).values()]
      .sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }
}
