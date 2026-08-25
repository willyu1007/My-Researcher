import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchCheckpointDecisionRecord,
  TopicSelectionResearchCheckpointRecord,
  TopicSelectionResearchObjectionRecord,
  TopicSelectionResearchObjectionResolutionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import {
  TopicSelectionResearchCheckpointCurrentConflictError,
  type TopicSelectionResearchCheckpointDecisionPersistence,
  type TopicSelectionResearchCheckpointRepository,
} from '../topic-selection-research-checkpoint.repository.js';

type CheckpointRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchCheckpoint']['findFirstOrThrow']>>;
type DecisionRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchCheckpointDecision']['findFirstOrThrow']>>;
type ObjectionRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchObjection']['findFirstOrThrow']>>;
type ResolutionRow = Awaited<ReturnType<PrismaClient['topicSelectionResearchObjectionResolution']['findFirstOrThrow']>>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function jsonOrNull(value: unknown | null | undefined): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined ? Prisma.DbNull : toJsonValue(value);
}

function asRefs(value: Prisma.JsonValue): TopicSelectionFunctionalRef[] {
  return Array.isArray(value) ? value as unknown as TopicSelectionFunctionalRef[] : [];
}

function asRef(value: Prisma.JsonValue | null): TopicSelectionFunctionalRef | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as unknown as TopicSelectionFunctionalRef
    : null;
}

function targetRef(row: {
  targetRefType: string;
  targetRefId: string;
  targetVersionId: string | null;
  titleCardId: string;
}): TopicSelectionFunctionalRef {
  return {
    ref_type: row.targetRefType,
    ref_id: row.targetRefId,
    version_id: row.targetVersionId,
    title_card_id: row.titleCardId,
  };
}

function toCheckpoint(row: CheckpointRow): TopicSelectionResearchCheckpointRecord {
  return {
    research_checkpoint_id: row.id,
    checkpoint_key: row.checkpointKey,
    current_checkpoint_key: row.currentCheckpointKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    checkpoint_kind: row.checkpointKind as TopicSelectionResearchCheckpointRecord['checkpoint_kind'],
    contract_version: row.contractVersion as TopicSelectionResearchCheckpointRecord['contract_version'],
    provenance_class: row.provenanceClass as TopicSelectionResearchCheckpointRecord['provenance_class'],
    policy_version_id: row.policyVersionId,
    target_ref: targetRef(row),
    target_snapshot_hash: row.targetSnapshotHash,
    packet_hash: row.packetHash,
    input_snapshot_id: row.inputSnapshotId,
    source_refs: asRefs(row.sourceRefs),
    allowed_actions: row.allowedActions as TopicSelectionResearchCheckpointRecord['allowed_actions'],
    required_action_refs: asRefs(row.requiredActionRefs),
    decision_authority_ref: asRef(row.decisionAuthorityRef),
    status: row.status as TopicSelectionResearchCheckpointRecord['status'],
    supersedes_checkpoint_id: row.supersedesCheckpointId,
    superseded_by_checkpoint_id: row.supersededByCheckpointId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    decided_at: row.decidedAt?.toISOString() ?? null,
    superseded_at: row.supersededAt?.toISOString() ?? null,
  };
}

function toDecision(row: DecisionRow): TopicSelectionResearchCheckpointDecisionRecord {
  return {
    research_checkpoint_decision_id: row.id,
    decision_key: row.decisionKey,
    research_checkpoint_id: row.researchCheckpointId,
    human_confirmed_decision_id: row.humanConfirmedDecisionId,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    checkpoint_kind: row.checkpointKind as TopicSelectionResearchCheckpointDecisionRecord['checkpoint_kind'],
    decision_kind: row.decisionKind as TopicSelectionResearchCheckpointDecisionRecord['decision_kind'],
    decision: row.decision as TopicSelectionResearchCheckpointDecisionRecord['decision'],
    actor: { actor_type: 'human', actor_id: row.actorId },
    confirmed_snapshot_hash: row.confirmedSnapshotHash,
    rationale: row.rationale,
    review_payload: row.reviewPayload as unknown as TopicSelectionResearchCheckpointDecisionRecord['review_payload'],
    required_action_refs: asRefs(row.requiredActionRefs),
    loopback_target: row.loopbackTarget,
    loopback_refs: asRefs(row.loopbackRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function toObjection(row: ObjectionRow): TopicSelectionResearchObjectionRecord {
  return {
    research_objection_id: row.id,
    objection_key: row.objectionKey,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    research_checkpoint_id: row.researchCheckpointId,
    checkpoint_kind: row.checkpointKind as TopicSelectionResearchObjectionRecord['checkpoint_kind'],
    target_ref: targetRef(row),
    target_snapshot_hash: row.targetSnapshotHash,
    severity: row.severity as TopicSelectionResearchObjectionRecord['severity'],
    summary: row.summary,
    rationale: row.rationale,
    required_loopback: row.requiredLoopback,
    source_refs: asRefs(row.sourceRefs),
    actor: { actor_type: 'human', actor_id: row.actorId },
    created_at: row.createdAt.toISOString(),
  };
}

function toResolution(row: ResolutionRow): TopicSelectionResearchObjectionResolutionRecord {
  return {
    research_objection_resolution_id: row.id,
    resolution_key: row.resolutionKey,
    research_objection_id: row.researchObjectionId,
    workspace_id: row.workspaceId,
    title_card_id: row.titleCardId,
    resolution_type: row.resolutionType as TopicSelectionResearchObjectionResolutionRecord['resolution_type'],
    actor: { actor_type: 'human', actor_id: row.actorId },
    resolved_snapshot_hash: row.resolvedSnapshotHash,
    rationale: row.rationale,
    output_refs: asRefs(row.outputRefs),
    created_at: row.createdAt.toISOString(),
  };
}

function checkpointData(record: TopicSelectionResearchCheckpointRecord) {
  return {
    id: record.research_checkpoint_id,
    checkpointKey: record.checkpoint_key,
    currentCheckpointKey: record.current_checkpoint_key ?? null,
    workspaceId: record.workspace_id ?? null,
    titleCardId: record.title_card_id,
    checkpointKind: record.checkpoint_kind,
    contractVersion: record.contract_version,
    provenanceClass: record.provenance_class,
    policyVersionId: record.policy_version_id ?? null,
    targetRefType: record.target_ref.ref_type,
    targetRefId: record.target_ref.ref_id,
    targetVersionId: record.target_ref.version_id ?? null,
    targetSnapshotHash: record.target_snapshot_hash,
    packetHash: record.packet_hash,
    inputSnapshotId: record.input_snapshot_id,
    sourceRefs: toJsonValue(record.source_refs),
    allowedActions: record.allowed_actions,
    requiredActionRefs: toJsonValue(record.required_action_refs),
    decisionAuthorityRef: jsonOrNull(record.decision_authority_ref),
    status: record.status,
    supersedesCheckpointId: record.supersedes_checkpoint_id ?? null,
    supersededByCheckpointId: record.superseded_by_checkpoint_id ?? null,
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at),
    decidedAt: record.decided_at ? new Date(record.decided_at) : null,
    supersededAt: record.superseded_at ? new Date(record.superseded_at) : null,
  };
}

function humanDecisionData(record: TopicSelectionHumanConfirmedDecisionRecord) {
  return {
    id: record.human_confirmed_decision_id,
    workspaceId: record.workspace_id ?? null,
    titleCardId: record.title_card_id ?? null,
    targetRefType: record.target_ref.ref_type,
    targetRefId: record.target_ref.ref_id,
    targetVersionId: record.target_ref.version_id ?? null,
    decisionType: record.decision_type,
    actorType: record.actor.actor_type,
    actorId: record.actor.actor_id ?? null,
    rationale: record.rationale ?? null,
    artifactRefs: toJsonValue(record.artifact_refs),
    policyVersionId: record.policy_version_id ?? null,
    resultingAuthorityRefs: toJsonValue(record.resulting_authority_refs),
    createdAt: new Date(record.created_at),
  };
}

export class PrismaTopicSelectionResearchCheckpointRepository
implements TopicSelectionResearchCheckpointRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async replaceCurrentCheckpoint(
    record: TopicSelectionResearchCheckpointRecord,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const byKey = await this.prisma.topicSelectionResearchCheckpoint.findUnique({
      where: { checkpointKey: record.checkpoint_key },
    });
    if (byKey) return toCheckpoint(byKey);
    const currentKey = record.current_checkpoint_key;
    if (!currentKey) throw new Error('A new ResearchCheckpoint requires current_checkpoint_key.');
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const replay = await transaction.topicSelectionResearchCheckpoint.findUnique({
          where: { checkpointKey: record.checkpoint_key },
        });
        if (replay) return toCheckpoint(replay);
        const previous = await transaction.topicSelectionResearchCheckpoint.findUnique({
          where: { currentCheckpointKey: currentKey },
        });
        if (previous) {
          await transaction.topicSelectionResearchCheckpoint.update({
            where: { id: previous.id },
            data: {
              currentCheckpointKey: null,
              status: 'superseded',
              supersededByCheckpointId: record.research_checkpoint_id,
              supersededAt: new Date(record.created_at),
              updatedAt: new Date(record.created_at),
            },
          });
        }
        const row = await transaction.topicSelectionResearchCheckpoint.create({
          data: {
            ...checkpointData(record),
            supersedesCheckpointId: previous?.id ?? null,
          },
        });
        return toCheckpoint(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        const replay = await this.prisma.topicSelectionResearchCheckpoint.findUnique({
          where: { checkpointKey: record.checkpoint_key },
        });
        if (replay) return toCheckpoint(replay);
        throw new TopicSelectionResearchCheckpointCurrentConflictError(currentKey);
      }
      throw error;
    }
  }

  async findCheckpointById(checkpointId: string): Promise<TopicSelectionResearchCheckpointRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpoint.findUnique({ where: { id: checkpointId } });
    return row ? toCheckpoint(row) : null;
  }

  async findCheckpointByKey(checkpointKey: string): Promise<TopicSelectionResearchCheckpointRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpoint.findUnique({ where: { checkpointKey } });
    return row ? toCheckpoint(row) : null;
  }

  async findCurrentCheckpoint(
    titleCardId: string,
    checkpointKind: TopicSelectionResearchCheckpointRecord['checkpoint_kind'],
  ): Promise<TopicSelectionResearchCheckpointRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpoint.findUnique({
      where: { currentCheckpointKey: `${titleCardId}:${checkpointKind}` },
    });
    return row ? toCheckpoint(row) : null;
  }

  async listCheckpointsByTitleCardId(titleCardId: string): Promise<TopicSelectionResearchCheckpointRecord[]> {
    const rows = await this.prisma.topicSelectionResearchCheckpoint.findMany({
      where: { titleCardId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCheckpoint);
  }

  async createDecision(
    persistence: TopicSelectionResearchCheckpointDecisionPersistence,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord> {
    const { checkpoint, decision, human_confirmed_decision: humanDecision } = persistence;
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.topicSelectionResearchCheckpoint.updateMany({
          where: {
            id: checkpoint.research_checkpoint_id,
            currentCheckpointKey: checkpoint.current_checkpoint_key,
            status: 'pending',
          },
          data: {
            status: checkpoint.status,
            decisionAuthorityRef: jsonOrNull(checkpoint.decision_authority_ref),
            requiredActionRefs: toJsonValue(checkpoint.required_action_refs),
            decidedAt: checkpoint.decided_at ? new Date(checkpoint.decided_at) : null,
            updatedAt: new Date(checkpoint.updated_at),
          },
        });
        if (claimed.count !== 1) {
          throw new TopicSelectionResearchCheckpointCurrentConflictError(
            checkpoint.current_checkpoint_key ?? `${checkpoint.title_card_id}:${checkpoint.checkpoint_kind}`,
          );
        }
        await transaction.topicSelectionHumanConfirmedDecision.create({
          data: humanDecisionData(humanDecision),
        });
        const row = await transaction.topicSelectionResearchCheckpointDecision.create({
          data: {
            id: decision.research_checkpoint_decision_id,
            decisionKey: decision.decision_key,
            researchCheckpointId: decision.research_checkpoint_id,
            humanConfirmedDecisionId: decision.human_confirmed_decision_id,
            workspaceId: decision.workspace_id ?? null,
            titleCardId: decision.title_card_id,
            checkpointKind: decision.checkpoint_kind,
            decisionKind: decision.decision_kind,
            decision: decision.decision,
            actorType: decision.actor.actor_type,
            actorId: decision.actor.actor_id,
            confirmedSnapshotHash: decision.confirmed_snapshot_hash,
            rationale: decision.rationale,
            reviewPayload: toJsonValue(decision.review_payload),
            requiredActionRefs: toJsonValue(decision.required_action_refs),
            loopbackTarget: decision.loopback_target ?? null,
            loopbackRefs: toJsonValue(decision.loopback_refs),
            createdAt: new Date(decision.created_at),
          },
        });
        return toDecision(row);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) {
        const replay = await this.findDecisionByKey(decision.decision_key);
        if (replay) return replay;
        throw new TopicSelectionResearchCheckpointCurrentConflictError(
          checkpoint.current_checkpoint_key ?? `${checkpoint.title_card_id}:${checkpoint.checkpoint_kind}`,
        );
      }
      throw error;
    }
  }

  async advanceWithExistingAuthority(
    checkpoint: TopicSelectionResearchCheckpointRecord,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const claimed = await this.prisma.topicSelectionResearchCheckpoint.updateMany({
      where: {
        id: checkpoint.research_checkpoint_id,
        currentCheckpointKey: checkpoint.current_checkpoint_key,
        status: 'pending',
      },
      data: {
        status: checkpoint.status,
        decisionAuthorityRef: jsonOrNull(checkpoint.decision_authority_ref),
        requiredActionRefs: toJsonValue(checkpoint.required_action_refs),
        decidedAt: checkpoint.decided_at ? new Date(checkpoint.decided_at) : null,
        updatedAt: new Date(checkpoint.updated_at),
      },
    });
    if (claimed.count !== 1) {
      throw new TopicSelectionResearchCheckpointCurrentConflictError(
        checkpoint.current_checkpoint_key ?? `${checkpoint.title_card_id}:${checkpoint.checkpoint_kind}`,
      );
    }
    const row = await this.prisma.topicSelectionResearchCheckpoint.findUniqueOrThrow({
      where: { id: checkpoint.research_checkpoint_id },
    });
    return toCheckpoint(row);
  }

  async findDecisionById(decisionId: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpointDecision.findUnique({ where: { id: decisionId } });
    return row ? toDecision(row) : null;
  }

  async findDecisionByKey(decisionKey: string): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpointDecision.findUnique({ where: { decisionKey } });
    return row ? toDecision(row) : null;
  }

  async findDecisionByCheckpointId(
    checkpointId: string,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord | null> {
    const row = await this.prisma.topicSelectionResearchCheckpointDecision.findUnique({
      where: { researchCheckpointId: checkpointId },
    });
    return row ? toDecision(row) : null;
  }

  async createObjection(record: TopicSelectionResearchObjectionRecord): Promise<TopicSelectionResearchObjectionRecord> {
    try {
      const row = await this.prisma.topicSelectionResearchObjection.create({
        data: {
        id: record.research_objection_id,
        objectionKey: record.objection_key,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id,
        researchCheckpointId: record.research_checkpoint_id,
        checkpointKind: record.checkpoint_kind,
        targetRefType: record.target_ref.ref_type,
        targetRefId: record.target_ref.ref_id,
        targetVersionId: record.target_ref.version_id ?? null,
        targetSnapshotHash: record.target_snapshot_hash,
        severity: record.severity,
        summary: record.summary,
        rationale: record.rationale,
        requiredLoopback: record.required_loopback ?? null,
        sourceRefs: toJsonValue(record.source_refs),
        actorType: record.actor.actor_type,
        actorId: record.actor.actor_id,
        createdAt: new Date(record.created_at),
        },
      });
      return toObjection(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.findObjectionByKey(record.objection_key);
        if (replay) return replay;
      }
      throw error;
    }
  }

  async findObjectionById(objectionId: string): Promise<TopicSelectionResearchObjectionRecord | null> {
    const row = await this.prisma.topicSelectionResearchObjection.findUnique({ where: { id: objectionId } });
    return row ? toObjection(row) : null;
  }

  async findObjectionByKey(objectionKey: string): Promise<TopicSelectionResearchObjectionRecord | null> {
    const row = await this.prisma.topicSelectionResearchObjection.findUnique({ where: { objectionKey } });
    return row ? toObjection(row) : null;
  }

  async listObjectionsByCheckpointId(checkpointId: string): Promise<TopicSelectionResearchObjectionRecord[]> {
    const rows = await this.prisma.topicSelectionResearchObjection.findMany({
      where: { researchCheckpointId: checkpointId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toObjection);
  }

  async createObjectionResolution(
    record: TopicSelectionResearchObjectionResolutionRecord,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord> {
    try {
      const row = await this.prisma.topicSelectionResearchObjectionResolution.create({
        data: {
        id: record.research_objection_resolution_id,
        resolutionKey: record.resolution_key,
        researchObjectionId: record.research_objection_id,
        workspaceId: record.workspace_id ?? null,
        titleCardId: record.title_card_id,
        resolutionType: record.resolution_type,
        actorType: record.actor.actor_type,
        actorId: record.actor.actor_id,
        resolvedSnapshotHash: record.resolved_snapshot_hash,
        rationale: record.rationale,
        outputRefs: toJsonValue(record.output_refs),
        createdAt: new Date(record.created_at),
        },
      });
      return toResolution(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.findObjectionResolutionByKey(record.resolution_key);
        if (replay) return replay;
      }
      throw error;
    }
  }

  async findObjectionResolutionByKey(
    resolutionKey: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null> {
    const row = await this.prisma.topicSelectionResearchObjectionResolution.findUnique({
      where: { resolutionKey },
    });
    return row ? toResolution(row) : null;
  }

  async findObjectionResolutionByObjectionId(
    objectionId: string,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord | null> {
    const row = await this.prisma.topicSelectionResearchObjectionResolution.findUnique({
      where: { researchObjectionId: objectionId },
    });
    return row ? toResolution(row) : null;
  }
}
