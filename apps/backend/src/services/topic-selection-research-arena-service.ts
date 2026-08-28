import crypto from 'node:crypto';
import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionFunctionalRef,
  TopicSelectionInputSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
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
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionResearchArenaRepository } from '../repositories/topic-selection-research-arena.repository.js';
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
  prior_role_hashes?: string[];
};

type SynthesizeSessionInput = {
  arena_session_id: string;
  termination_reason: TopicSelectionResearchArenaTerminationReason;
  loop_transcript_artifact_ref: TopicSelectionFunctionalRef;
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
    const current = await this.dependencies.arenaRepository.findCurrentSession(
      input.title_card_id,
      input.arena_kind,
    );
    if (current && loopDeltaRefs.length === 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'A repeated arena requires a recorded evidence, candidate, constraint, or human-objective delta.',
      );
    }
    const now = this.now();
    return this.dependencies.arenaRepository.replaceCurrentSession({
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
    });
  }

  async recordRoleExecution(
    input: RecordRoleExecutionInput,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if (session.status !== 'open' || !session.current_arena_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Role execution requires the current open arena.');
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
      evidence_packet_hash: evidencePacketHash,
      exposure_set_hash: exposureSetHash,
      input_snapshot_hash: session.input_snapshot_hash,
      instance_index: input.instance_index,
      participant_role: input.participant_role,
      prior_role_hashes: priorRoleHashes,
      role_slot_id: input.role_slot_id,
    }));
    const replay = await this.dependencies.arenaRepository.findRoleExecutionByRuntimeIdentityHash(runtimeIdentityHash);
    if (replay) return replay;
    return this.dependencies.arenaRepository.createRoleExecution({
      schema_version: 'TopicSelectionResearchArenaRoleExecution@v1',
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
      prior_role_hashes: priorRoleHashes,
      runtime_identity_hash: runtimeIdentityHash,
      created_at: this.now(),
    });
  }

  async synthesizeSession(input: SynthesizeSessionInput): Promise<TopicSelectionResearchArenaSessionRecord> {
    const session = await this.dependencies.arenaRepository.findSessionById(input.arena_session_id);
    if (!session) throw new AppError(404, 'NOT_FOUND', `ResearchArenaSession ${input.arena_session_id} was not found.`);
    if (session.status !== 'open' || !session.current_arena_key) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Only the current open arena can be synthesized.');
    }
    const executions = await this.dependencies.arenaRepository.listRoleExecutionsBySessionId(session.arena_session_id);
    const firstPassRoles = new Set(
      executions.filter((execution) => execution.pass_kind === 'first_pass')
        .map((execution) => execution.participant_role),
    );
    const requiredRoles = session.participant_roles.filter((role) => role !== 'synthesis_arbiter');
    if (requiredRoles.length < 2 || requiredRoles.some((role) => !firstPassRoles.has(role))) {
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
    const now = this.now();
    return this.dependencies.arenaRepository.updateSession({
      ...session,
      status: 'synthesized',
      termination_reason: input.termination_reason,
      loop_transcript_ref: input.loop_transcript_artifact_ref,
      loop_transcript_hash: transcriptHash,
      updated_at: now,
      synthesized_at: now,
    });
  }

  private assertSessionInput(input: OpenSessionInput): void {
    const roles = [...input.participant_roles];
    if (!input.session_key.trim() || !input.title_card_id.trim() || roles.length < 2
      || new Set(roles).size !== roles.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Arena requires a key, title card, and at least two distinct roles.');
    }
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
    if (artifact.title_card_id !== titleCardId || artifact.input_snapshot_id !== snapshot.input_snapshot_id) {
      throw new AppError(409, 'VERSION_CONFLICT', `ArtifactRef ${ref.ref_id} is outside the bound arena snapshot.`);
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
