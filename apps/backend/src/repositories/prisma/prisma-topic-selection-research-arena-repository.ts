import { Prisma, type PrismaClient } from '@prisma/client';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchArenaKind,
  TopicSelectionResearchArenaLoopDeltaRef,
  TopicSelectionResearchArenaRoleExecutionRecord,
  TopicSelectionResearchArenaSessionRecord,
  TopicSelectionResearchEvidenceQueryIntent,
  TopicSelectionResearchRetrievalProvenance,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import {
  TopicSelectionResearchArenaConflictError,
  type TopicSelectionResearchArenaRepository,
} from '../topic-selection-research-arena.repository.js';

type SessionRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchArenaSession']['findFirstOrThrow']>>;
type ExecutionRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchArenaRoleExecution']['findFirstOrThrow']>>;

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function asRef(value: Prisma.JsonValue): TopicSelectionFunctionalRef {
  return value as unknown as TopicSelectionFunctionalRef;
}

function asRefs(value: Prisma.JsonValue): TopicSelectionFunctionalRef[] {
  return Array.isArray(value) ? value as unknown as TopicSelectionFunctionalRef[] : [];
}

function targetRef(row: SessionRow): TopicSelectionFunctionalRef {
  return {
    ref_type: row.targetRefType,
    ref_id: row.targetRefId,
    version_id: row.targetVersionId,
    title_card_id: row.titleCardId,
  };
}

function toSession(row: SessionRow): TopicSelectionResearchArenaSessionRecord {
  return {
    schema_version: row.schemaVersion as 'TopicSelectionResearchArenaSession@v1',
    arena_session_id: row.id,
    session_key: row.sessionKey,
    current_arena_key: row.currentArenaKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    arena_kind: row.arenaKind as TopicSelectionResearchArenaSessionRecord['arena_kind'],
    target_ref: targetRef(row),
    input_snapshot_id: row.inputSnapshotId,
    input_snapshot_hash: row.inputSnapshotHash,
    participant_plan_hash: row.participantPlanHash,
    participant_roles: row.participantRoles as TopicSelectionResearchArenaSessionRecord['participant_roles'],
    execution_plan_ref: asRef(row.executionPlanRef),
    status: row.status as TopicSelectionResearchArenaSessionRecord['status'],
    termination_reason: row.terminationReason as TopicSelectionResearchArenaSessionRecord['termination_reason'],
    loop_transcript_ref: row.loopTranscriptRef ? asRef(row.loopTranscriptRef) : null,
    loop_transcript_hash: row.loopTranscriptHash,
    loop_delta_refs: row.loopDeltaRefs as unknown as TopicSelectionResearchArenaLoopDeltaRef[],
    support_only: true,
    supersedes_arena_session_id: row.supersedesArenaSessionId,
    superseded_by_arena_session_id: row.supersededByArenaSessionId,
    created_by: row.createdBy,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    synthesized_at: row.synthesizedAt?.toISOString() ?? null,
    superseded_at: row.supersededAt?.toISOString() ?? null,
  };
}

function toExecution(row: ExecutionRow): TopicSelectionResearchArenaRoleExecutionRecord {
  return {
    schema_version: row.schemaVersion as 'TopicSelectionResearchArenaRoleExecution@v1',
    arena_role_execution_id: row.id,
    arena_session_id: row.arenaSessionId,
    title_card_id: row.titleCardId,
    role_slot_id: row.roleSlotId,
    instance_index: row.instanceIndex,
    participant_role: row.participantRole as TopicSelectionResearchArenaRoleExecutionRecord['participant_role'],
    pass_kind: row.passKind as TopicSelectionResearchArenaRoleExecutionRecord['pass_kind'],
    input_snapshot_id: row.inputSnapshotId,
    input_snapshot_hash: row.inputSnapshotHash,
    query_intent: row.queryIntent as unknown as TopicSelectionResearchEvidenceQueryIntent,
    evidence_packet_artifact_ref: asRef(row.evidencePacketArtifactRef),
    evidence_packet_hash: row.evidencePacketHash,
    evidence_partition_refs: asRefs(row.evidencePartitionRefs),
    retrieval_provenance: row.retrievalProvenance as unknown as TopicSelectionResearchRetrievalProvenance,
    exposure_artifact_refs: asRefs(row.exposureArtifactRefs),
    exposure_set_hash: row.exposureSetHash,
    output_artifact_ref: asRef(row.outputArtifactRef),
    output_artifact_hash: row.outputArtifactHash,
    semantic_position_hash: row.semanticPositionHash,
    prior_role_hashes: row.priorRoleHashes,
    runtime_identity_hash: row.runtimeIdentityHash,
    created_at: row.createdAt.toISOString(),
  };
}

function sessionData(record: TopicSelectionResearchArenaSessionRecord) {
  return {
    id: record.arena_session_id,
    schemaVersion: record.schema_version,
    sessionKey: record.session_key,
    currentArenaKey: record.current_arena_key,
    workspaceId: record.workspace_id,
    titleCardId: record.title_card_id,
    arenaKind: record.arena_kind,
    targetRefType: record.target_ref.ref_type,
    targetRefId: record.target_ref.ref_id,
    targetVersionId: record.target_ref.version_id ?? null,
    inputSnapshotId: record.input_snapshot_id,
    inputSnapshotHash: record.input_snapshot_hash,
    participantPlanHash: record.participant_plan_hash,
    participantRoles: record.participant_roles,
    executionPlanRef: toJson(record.execution_plan_ref),
    status: record.status,
    terminationReason: record.termination_reason,
    loopTranscriptRef: record.loop_transcript_ref ? toJson(record.loop_transcript_ref) : Prisma.DbNull,
    loopTranscriptHash: record.loop_transcript_hash,
    loopDeltaRefs: toJson(record.loop_delta_refs),
    supportOnly: record.support_only,
    supersedesArenaSessionId: record.supersedes_arena_session_id,
    supersededByArenaSessionId: record.superseded_by_arena_session_id,
    createdBy: record.created_by,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    synthesizedAt: record.synthesized_at ? new Date(record.synthesized_at) : null,
    supersededAt: record.superseded_at ? new Date(record.superseded_at) : null,
  };
}

export class PrismaTopicSelectionResearchArenaRepository
implements TopicSelectionResearchArenaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async replaceCurrentSession(
    record: TopicSelectionResearchArenaSessionRecord,
  ): Promise<TopicSelectionResearchArenaSessionRecord> {
    const replay = await this.prisma.topicSelectionResearchArenaSession.findUnique({
      where: { sessionKey: record.session_key },
    });
    if (replay) return toSession(replay);
    const currentKey = record.current_arena_key;
    if (!currentKey) throw new TopicSelectionResearchArenaConflictError('A new arena requires current_arena_key.');
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const previous = await transaction.topicSelectionResearchArenaSession.findUnique({
          where: { currentArenaKey: currentKey },
        });
        if (previous) {
          await transaction.topicSelectionResearchArenaSession.update({
            where: { id: previous.id },
            data: {
              currentArenaKey: null,
              status: 'superseded',
              supersededByArenaSessionId: record.arena_session_id,
              updatedAt: new Date(record.created_at),
              supersededAt: new Date(record.created_at),
            },
          });
        }
        const row = await transaction.topicSelectionResearchArenaSession.create({
          data: { ...sessionData(record), supersedesArenaSessionId: previous?.id ?? null },
        });
        return toSession(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        const repeated = await this.prisma.topicSelectionResearchArenaSession.findUnique({
          where: { sessionKey: record.session_key },
        });
        if (repeated) return toSession(repeated);
        throw new TopicSelectionResearchArenaConflictError(`Arena current key ${currentKey} changed concurrently.`);
      }
      throw error;
    }
  }

  async findSessionById(sessionId: string): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const row = await this.prisma.topicSelectionResearchArenaSession.findUnique({ where: { id: sessionId } });
    return row ? toSession(row) : null;
  }

  async findSessionByKey(sessionKey: string): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const row = await this.prisma.topicSelectionResearchArenaSession.findUnique({ where: { sessionKey } });
    return row ? toSession(row) : null;
  }

  async findCurrentSession(
    titleCardId: string,
    arenaKind: TopicSelectionResearchArenaKind,
  ): Promise<TopicSelectionResearchArenaSessionRecord | null> {
    const row = await this.prisma.topicSelectionResearchArenaSession.findUnique({
      where: { currentArenaKey: `${titleCardId}:${arenaKind}` },
    });
    return row ? toSession(row) : null;
  }

  async updateSession(record: TopicSelectionResearchArenaSessionRecord): Promise<TopicSelectionResearchArenaSessionRecord> {
    const claimed = await this.prisma.topicSelectionResearchArenaSession.updateMany({
      where: { id: record.arena_session_id, currentArenaKey: record.current_arena_key, status: 'open' },
      data: {
        status: record.status,
        terminationReason: record.termination_reason,
        loopTranscriptRef: record.loop_transcript_ref ? toJson(record.loop_transcript_ref) : Prisma.DbNull,
        loopTranscriptHash: record.loop_transcript_hash,
        updatedAt: new Date(record.updated_at),
        synthesizedAt: record.synthesized_at ? new Date(record.synthesized_at) : null,
      },
    });
    if (claimed.count !== 1) throw new TopicSelectionResearchArenaConflictError('Arena changed concurrently.');
    const row = await this.prisma.topicSelectionResearchArenaSession.findUniqueOrThrow({
      where: { id: record.arena_session_id },
    });
    return toSession(row);
  }

  async createRoleExecution(
    record: TopicSelectionResearchArenaRoleExecutionRecord,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord> {
    try {
      const row = await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.topicSelectionResearchArenaSession.updateMany({
          where: {
            id: record.arena_session_id,
            currentArenaKey: { not: null },
            status: 'open',
          },
          data: { status: 'open' },
        });
        if (claimed.count !== 1) {
          throw new TopicSelectionResearchArenaConflictError('Arena is not current and open.');
        }
        return transaction.topicSelectionResearchArenaRoleExecution.create({ data: {
          id: record.arena_role_execution_id,
          schemaVersion: record.schema_version,
          arenaSessionId: record.arena_session_id,
          titleCardId: record.title_card_id,
          roleSlotId: record.role_slot_id,
          instanceIndex: record.instance_index,
          participantRole: record.participant_role,
          passKind: record.pass_kind,
          inputSnapshotId: record.input_snapshot_id,
          inputSnapshotHash: record.input_snapshot_hash,
          queryIntent: toJson(record.query_intent),
          evidencePacketArtifactRef: toJson(record.evidence_packet_artifact_ref),
          evidencePacketHash: record.evidence_packet_hash,
          evidencePartitionRefs: toJson(record.evidence_partition_refs),
          retrievalProvenance: toJson(record.retrieval_provenance),
          exposureArtifactRefs: toJson(record.exposure_artifact_refs),
          exposureSetHash: record.exposure_set_hash,
          outputArtifactRef: toJson(record.output_artifact_ref),
          outputArtifactHash: record.output_artifact_hash,
          semanticPositionHash: record.semantic_position_hash,
          priorRoleHashes: record.prior_role_hashes,
          runtimeIdentityHash: record.runtime_identity_hash,
          createdAt: new Date(record.created_at),
        } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return toExecution(row);
    } catch (error) {
      if (error instanceof TopicSelectionResearchArenaConflictError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.findRoleExecutionByRuntimeIdentityHash(record.runtime_identity_hash);
        if (replay) return replay;
        throw new TopicSelectionResearchArenaConflictError('Arena role execution identity already exists.');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new TopicSelectionResearchArenaConflictError('Arena changed concurrently with role admission.');
      }
      throw error;
    }
  }

  async findRoleExecutionByRuntimeIdentityHash(
    runtimeIdentityHash: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord | null> {
    const row = await this.prisma.topicSelectionResearchArenaRoleExecution.findUnique({
      where: { runtimeIdentityHash },
    });
    return row ? toExecution(row) : null;
  }

  async listRoleExecutionsBySessionId(
    sessionId: string,
  ): Promise<TopicSelectionResearchArenaRoleExecutionRecord[]> {
    const rows = await this.prisma.topicSelectionResearchArenaRoleExecution.findMany({
      where: { arenaSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toExecution);
  }
}
