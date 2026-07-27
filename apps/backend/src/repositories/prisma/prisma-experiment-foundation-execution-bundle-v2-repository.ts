import { isDeepStrictEqual } from 'node:util';

import {
  Prisma,
  type ExperimentFoundationExecutionBundleDraftV2 as DraftRow,
  type ExperimentFoundationExecutionBundleIdentityV2 as IdentityRow,
  type ExperimentFoundationExecutionBundleLifecycleEventV2 as EventRow,
  type ExperimentFoundationExecutionBundleLifecycleProjectionV2 as ProjectionRow,
  type ExperimentFoundationExecutionBundleReadinessV2 as ReadinessRow,
  type ExperimentFoundationExecutionBundleRevisionV2 as RevisionRow,
  type PrismaClient,
} from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
  type ExperimentFoundationExecutionBundleContent,
  type ExperimentFoundationExecutionBundleDraftV2,
  type ExperimentFoundationExecutionBundleIdentityV2,
  type ExperimentFoundationExecutionBundleLifecycleEventV2,
  type ExperimentFoundationExecutionBundleLifecycleProjectionV2,
  type ExperimentFoundationExecutionBundleReadinessV2,
  type ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';

import {
  ExperimentFoundationExecutionBundleV2ConstraintError,
  type ExperimentFoundationExecutionBundleDraftBundleV2,
  type ExperimentFoundationExecutionBundleFreezeInputV2,
  type ExperimentFoundationExecutionBundleFrozenBundleV2,
  type ExperimentFoundationExecutionBundlePutDraftInputV2,
  type ExperimentFoundationExecutionBundleV2Repository,
} from '../experiment-foundation-execution-bundle-v2.repository.js';

export class PrismaExperimentFoundationExecutionBundleV2Repository
implements ExperimentFoundationExecutionBundleV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async findDraftByBundleKey(
    bundleKey: string,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2 | null> {
    const identity = await this.prisma.experimentFoundationExecutionBundleIdentityV2.findUnique({
      where: { bundleKey },
      include: { draft: true },
    });
    if (!identity?.draft) return null;
    return {
      identity: mapIdentity(identity),
      draft: mapDraft(identity.draft),
      replayed: false,
    };
  }

  async putDraft(
    input: ExperimentFoundationExecutionBundlePutDraftInputV2,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await transaction.experimentFoundationExecutionBundleIdentityV2
          .findUnique({
            where: { bundleKey: input.identity.bundle_key },
            include: { draft: true },
          });
        if (!existing) {
          if (input.expected_draft_version !== null || input.draft.draft_version !== 1) {
            throw conflict('A new ExecutionBundle draft must start at version 1.');
          }
          const identity = await transaction.experimentFoundationExecutionBundleIdentityV2.create({
            data: {
              id: input.identity.execution_bundle_id,
              bundleKey: input.identity.bundle_key,
              displayName: input.identity.display_name,
              stateVersion: 0,
              createdAt: new Date(input.identity.created_at),
              updatedAt: new Date(input.identity.created_at),
              draft: {
                create: {
                  draftVersion: 1,
                  schemaVersion:
                    input.draft.draft_content.execution_bundle_schema_version,
                  draftSnapshotJson: toJson(input.draft.draft_content),
                  updatedAt: new Date(input.draft.updated_at),
                },
              },
            },
            include: { draft: true },
          });
          return {
            identity: mapIdentity(identity),
            draft: mapDraft(identity.draft!),
            replayed: false,
          };
        }
        if (
          !existing.draft
          || existing.id !== input.identity.execution_bundle_id
          || existing.displayName !== input.identity.display_name
        ) {
          throw conflict('ExecutionBundle identity was reused with changed immutable fields.');
        }
        const existingDraft = mapDraft(existing.draft);
        if (input.expected_draft_version === null) {
          if (!isDeepStrictEqual(existingDraft.draft_content, input.draft.draft_content)) {
            throw conflict('ExecutionBundle create replay changed draft content.');
          }
          return {
            identity: mapIdentity(existing),
            draft: existingDraft,
            replayed: true,
          };
        }
        if (
          existing.draft.draftVersion !== input.expected_draft_version
          || input.draft.draft_version !== input.expected_draft_version + 1
        ) {
          throw conflict('ExecutionBundle draft expected-version CAS failed.');
        }
        const updated = await transaction.experimentFoundationExecutionBundleIdentityV2.update({
          where: { id: existing.id, stateVersion: existing.stateVersion },
          data: {
            stateVersion: { increment: 1 },
            updatedAt: new Date(input.draft.updated_at),
            draft: {
              update: {
                draftVersion: input.draft.draft_version,
                schemaVersion:
                  input.draft.draft_content.execution_bundle_schema_version,
                draftSnapshotJson: toJson(input.draft.draft_content),
                updatedAt: new Date(input.draft.updated_at),
              },
            },
          },
          include: { draft: true },
        });
        return {
          identity: mapIdentity(updated),
          draft: mapDraft(updated.draft!),
          replayed: false,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      throw mapConstraint(error, 'ExecutionBundle draft commit failed.');
    }
  }

  async freezeActiveRevision(
    input: ExperimentFoundationExecutionBundleFreezeInputV2,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const identity = await transaction.experimentFoundationExecutionBundleIdentityV2
          .findUnique({ where: { id: input.execution_bundle_id }, include: { draft: true } });
        if (!identity?.draft) throw conflict('ExecutionBundle draft was not found.');

        const replay = await transaction.experimentFoundationExecutionBundleRevisionV2
          .findFirst({
            where: {
              executionBundleId: input.execution_bundle_id,
              contentHash: input.revision.content_hash,
            },
          });
        if (replay) {
          const frozen = await readFrozen(transaction, replay.id, replay.contentHash);
          if (!frozen) throw conflict('ExecutionBundle same-content replay is incomplete.');
          return { ...frozen, replayed: true };
        }
        if (
          identity.stateVersion !== input.expected_identity_state_version
          || identity.draft.draftVersion !== input.expected_draft_version
          || input.revision.execution_bundle_id !== identity.id
          || !isDeepStrictEqual(
            mapDraft(identity.draft).draft_content,
            input.revision.revision_content,
          )
        ) {
          throw conflict('ExecutionBundle freeze CAS or exact draft binding failed.');
        }
        const priorCount = await transaction.experimentFoundationExecutionBundleRevisionV2.count({
          where: { executionBundleId: identity.id },
        });
        const revision = {
          ...input.revision,
          revision_sequence: priorCount + 1,
        };
        await transaction.experimentFoundationExecutionBundleRevisionV2.create({
          data: revisionCreateData(revision),
        });
        await transaction.experimentFoundationExecutionBundleLifecycleEventV2.create({
          data: eventCreateData(input.lifecycle_event),
        });
        await transaction.experimentFoundationExecutionBundleLifecycleProjectionV2.create({
          data: projectionCreateData(input.lifecycle_projection),
        });
        await transaction.experimentFoundationExecutionBundleReadinessV2.create({
          data: readinessCreateData(input.readiness),
        });
        const update = await transaction.experimentFoundationExecutionBundleIdentityV2.updateMany({
          where: { id: identity.id, stateVersion: input.expected_identity_state_version },
          data: { stateVersion: { increment: 1 }, updatedAt: new Date(input.readiness.evaluated_at) },
        });
        if (update.count !== 1) throw conflict('ExecutionBundle identity CAS failed.');
        const frozen = await readFrozen(
          transaction,
          input.revision.execution_bundle_revision_id,
          input.revision.content_hash,
        );
        if (!frozen) throw conflict('ExecutionBundle freeze did not become readable.');
        return { ...frozen, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      throw mapConstraint(error, 'ExecutionBundle freeze failed.');
    }
  }

  async findActiveReadyExact(
    executionBundleRevisionId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2 | null> {
    return readFrozen(this.prisma, executionBundleRevisionId, contentHash);
  }
}

type BundleReader = Pick<Prisma.TransactionClient,
  | 'experimentFoundationExecutionBundleRevisionV2'
  | 'experimentFoundationExecutionBundleIdentityV2'
>;

async function readFrozen(
  reader: BundleReader,
  revisionId: string,
  contentHash: string,
): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2 | null> {
  const revision = await reader.experimentFoundationExecutionBundleRevisionV2.findUnique({
    where: { id_contentHash: { id: revisionId, contentHash } },
    include: {
      executionBundle: { include: { draft: true } },
      lifecycleEvents: { orderBy: { eventSequence: 'desc' }, take: 1 },
      lifecycleProjection: true,
      readinessRecords: {
        where: { outcome: 'passed' },
        orderBy: { evaluatedAt: 'desc' },
        take: 1,
      },
    },
  });
  const event = revision?.lifecycleEvents[0];
  const readiness = revision?.readinessRecords[0];
  if (
    !revision
    || !revision.executionBundle.draft
    || !event
    || !revision.lifecycleProjection
    || !readiness
    || revision.lifecycleProjection.lifecycleStatus !== 'active'
    || readiness.lifecycleEventHash !== event.eventHash
  ) return null;
  return {
    identity: mapIdentity(revision.executionBundle),
    draft: mapDraft(revision.executionBundle.draft),
    revision: mapRevision(revision),
    lifecycle_event: mapEvent(event),
    lifecycle_projection: mapProjection(revision.lifecycleProjection),
    readiness: mapReadiness(readiness),
    replayed: false,
  };
}

function mapIdentity(row: IdentityRow): ExperimentFoundationExecutionBundleIdentityV2 {
  return {
    execution_bundle_id: row.id,
    bundle_key: row.bundleKey,
    display_name: row.displayName,
    state_version: row.stateVersion,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapDraft(row: DraftRow): ExperimentFoundationExecutionBundleDraftV2 {
  const draftContent = structuredClone(
    row.draftSnapshotJson,
  ) as unknown as ExperimentFoundationExecutionBundleContent;
  if (row.schemaVersion !== draftContent.execution_bundle_schema_version) {
    throw conflict('ExecutionBundle draft schema version drifted from stored content.');
  }
  return {
    execution_bundle_id: row.executionBundleId,
    draft_version: row.draftVersion,
    draft_content: draftContent,
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapRevision(row: RevisionRow): ExperimentFoundationExecutionBundleRevisionV2 {
  const revisionContent = structuredClone(
    row.revisionJson,
  ) as unknown as ExperimentFoundationExecutionBundleContent;
  if (
    (row.schemaVersion !== 'v1' && row.schemaVersion !== 'v2')
    || row.schemaVersion !== revisionContent.execution_bundle_schema_version
    || row.hashProfile !== EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2
  ) {
    throw conflict('ExecutionBundle revision schema/hash profile drifted from stored content.');
  }
  return {
    execution_bundle_revision_id: row.id,
    execution_bundle_id: row.executionBundleId,
    revision_sequence: row.revisionSequence,
    schema_version: row.schemaVersion,
    hash_profile: EXPERIMENT_FOUNDATION_EXECUTION_BUNDLE_HASH_PROFILE_V2,
    content_hash: row.contentHash,
    revision_content: revisionContent,
    created_at: row.createdAt.toISOString(),
  };
}

function mapEvent(row: EventRow): ExperimentFoundationExecutionBundleLifecycleEventV2 {
  return {
    lifecycle_event_id: row.id,
    execution_bundle_revision_id: row.executionBundleRevisionId,
    event_sequence: row.eventSequence,
    status: row.lifecycleStatus as ExperimentFoundationExecutionBundleLifecycleEventV2['status'],
    reason_code: row.reasonCode,
    event_hash: row.eventHash,
    occurred_at: row.occurredAt.toISOString(),
  };
}

function mapProjection(
  row: ProjectionRow,
): ExperimentFoundationExecutionBundleLifecycleProjectionV2 {
  return {
    execution_bundle_revision_id: row.executionBundleRevisionId,
    current_status: row.lifecycleStatus as ExperimentFoundationExecutionBundleLifecycleProjectionV2['current_status'],
    latest_event_sequence: row.latestEventSequence,
    latest_event_hash: row.latestEventHash,
    state_version: row.stateVersion,
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapReadiness(row: ReadinessRow): ExperimentFoundationExecutionBundleReadinessV2 {
  return {
    execution_bundle_readiness_id: row.id,
    execution_bundle_revision_id: row.executionBundleRevisionId,
    execution_bundle_revision_hash: row.executionBundleRevisionHash,
    lifecycle_event_hash: row.lifecycleEventHash,
    outcome: row.outcome as ExperimentFoundationExecutionBundleReadinessV2['outcome'],
    reason_codes: structuredClone(row.reasonCodesJson) as string[],
    readiness_hash: row.readinessHash,
    evaluated_at: row.evaluatedAt.toISOString(),
  };
}

function revisionCreateData(
  record: ExperimentFoundationExecutionBundleRevisionV2,
): Prisma.ExperimentFoundationExecutionBundleRevisionV2UncheckedCreateInput {
  return {
    id: record.execution_bundle_revision_id,
    executionBundleId: record.execution_bundle_id,
    revisionSequence: record.revision_sequence,
    schemaVersion: record.schema_version,
    hashProfile: record.hash_profile,
    contentHash: record.content_hash,
    revisionJson: toJson(record.revision_content),
    createdAt: new Date(record.created_at),
  };
}

function eventCreateData(
  record: ExperimentFoundationExecutionBundleLifecycleEventV2,
): Prisma.ExperimentFoundationExecutionBundleLifecycleEventV2UncheckedCreateInput {
  return {
    id: record.lifecycle_event_id,
    executionBundleRevisionId: record.execution_bundle_revision_id,
    eventSequence: record.event_sequence,
    lifecycleStatus: record.status,
    reasonCode: record.reason_code,
    eventHash: record.event_hash,
    occurredAt: new Date(record.occurred_at),
  };
}

function projectionCreateData(
  record: ExperimentFoundationExecutionBundleLifecycleProjectionV2,
): Prisma.ExperimentFoundationExecutionBundleLifecycleProjectionV2UncheckedCreateInput {
  return {
    executionBundleRevisionId: record.execution_bundle_revision_id,
    lifecycleStatus: record.current_status,
    latestEventSequence: record.latest_event_sequence,
    latestEventHash: record.latest_event_hash,
    stateVersion: record.state_version,
    updatedAt: new Date(record.updated_at),
  };
}

function readinessCreateData(
  record: ExperimentFoundationExecutionBundleReadinessV2,
): Prisma.ExperimentFoundationExecutionBundleReadinessV2UncheckedCreateInput {
  return {
    id: record.execution_bundle_readiness_id,
    executionBundleRevisionId: record.execution_bundle_revision_id,
    executionBundleRevisionHash: record.execution_bundle_revision_hash,
    lifecycleEventHash: record.lifecycle_event_hash,
    outcome: record.outcome,
    reasonCodesJson: toJson(record.reason_codes),
    readinessHash: record.readiness_hash,
    evaluatedAt: new Date(record.evaluated_at),
  };
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return structuredClone(value) as Prisma.InputJsonValue;
}

function conflict(message: string): ExperimentFoundationExecutionBundleV2ConstraintError {
  return new ExperimentFoundationExecutionBundleV2ConstraintError(
    'EXECUTION_BUNDLE_CONFLICT',
    message,
  );
}

function mapConstraint(error: unknown, message: string): Error {
  if (error instanceof ExperimentFoundationExecutionBundleV2ConstraintError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return conflict(message);
  return error instanceof Error ? error : conflict(message);
}
