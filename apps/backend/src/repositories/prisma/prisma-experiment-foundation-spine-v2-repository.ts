import {
  ExperimentFoundationAssetTypeV2,
  Prisma,
  type ExperimentFoundationIntegrationInboxV2 as EfInboxRow,
  type ExperimentFoundationIntegrationOutboxV2 as EfOutboxRow,
  type ExperimentFoundationRunCellV2 as RunCellRow,
  type ExperimentFoundationRunRecipeV2 as RunRecipeRow,
  type ExperimentFoundationRunV2 as RunRow,
  type ExperimentFoundationTrainingTaskSpecV2 as TaskSpecRow,
  type ExperimentFoundationVersionLockDependencyV2 as VersionLockDependencyRow,
  type ExperimentFoundationVersionLockV2 as VersionLockRow,
  type PrismaClient,
} from '@prisma/client';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2RunRecipe,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashExperimentFoundationV2VersionLock,
  serverHashExperimentFoundationV2VersionLockDependencyManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
  verifyExperimentV2EventPayloadHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import {
  EXPERIMENT_V2_INT32_MAX,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import type {
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationReadinessBlockerV2,
  ExperimentFoundationReadinessDependencyV2,
  ExperimentFoundationReadinessQualificationSnapshotV2,
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunRecipeV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecSnapshotV2,
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationVersionLockDependencyV2,
  ExperimentFoundationVersionLockV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationExecutableRunRecipeV2,
  ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import type {
  BranchHeadAdvancedEventV1,
  ExperimentFoundationIntegrationInboxV2,
  ExperimentFoundationIntegrationOutboxV2,
  ExperimentV2IntegrationEvent,
  WorkOrderRevisionAdmittedCellV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  deriveExperimentFoundationV2MaterializationReadinessGuard,
  EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationExperimentSpineV2Repository,
  type ExperimentFoundationV2MaterializationBundle,
  type ExperimentV2RelayClaim,
  type ExperimentV2RelayClaimInput,
  type ExperimentV2RelayReleaseInput,
  type ExperimentV2RelayTerminalInput,
} from '../experiment-spine-v2.repository.js';
import {
  decodeExperimentV2InboxOutcome,
  encodeExperimentV2EventPayload,
  reconstructExperimentV2Event,
  StoredExperimentV2EventIntegrityError,
  type DecodedExperimentV2InboxOutcome,
  type StoredExperimentV2InboxOutcomeColumns,
} from '../experiment-v2-stored-integration-event.js';
import {
  assertStoredExperimentFoundationV2ReadinessIntegrity,
  decodeStoredExperimentFoundationV2RunRecipeSnapshot,
  decodeStoredExperimentFoundationV2TrainingTaskSpecSnapshot,
  StoredExperimentFoundationV2SnapshotIntegrityError,
} from '../experiment-foundation-v2-stored-snapshot-integrity.js';

type SpineClient = PrismaClient | Prisma.TransactionClient;
const STORED_SCHEMA_VERSION_V1 = 'v1';

export class PrismaExperimentFoundationSpineV2Repository
implements ExperimentFoundationExperimentSpineV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async findInboxByEvent(
    consumerName: string,
    eventId: string,
  ): Promise<ExperimentFoundationIntegrationInboxV2 | null> {
    const row = await this.prisma.experimentFoundationIntegrationInboxV2.findFirst({
      where: { consumerName, eventId },
    });
    return row ? mapEfInbox(row) : null;
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationIntegrationInboxV2 | null> {
    const row = await this.prisma.experimentFoundationIntegrationInboxV2.findFirst({
      where: {
        consumerName,
        implementationProjectId,
        validationCycleId,
        branchId,
        businessIdempotencyKey,
      },
    });
    return row ? mapEfInbox(row) : null;
  }

  async findMaterializationByRevision(
    workOrderRevisionId: string,
  ): Promise<ExperimentFoundationV2MaterializationBundle | null> {
    return loadVerifiedExperimentFoundationV2Materialization(
      this.prisma,
      workOrderRevisionId,
    );
  }

  async commitMaterialization(
    bundle: ExperimentFoundationV2MaterializationBundle,
    sourceEvent: WorkOrderRevisionAdmittedEventV1,
    serializationRetry = 0,
  ): Promise<ExperimentFoundationV2MaterializationBundle> {
    assertMaterializationParity(bundle, sourceEvent);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await loadVerifiedExperimentFoundationV2Materialization(
          transaction,
          sourceEvent.work_order_revision_id,
        );
        if (existing) {
          if (sameMaterialization(existing, bundle, sourceEvent)) {
            return existing;
          }
          throw constraint(
            'MATERIALIZATION_KEY_CONFLICT',
            'Admitted revision already has a changed VersionLock, recipe, tasks, Run, or event payload',
          );
        }

        const inboxReplay = await findEfInboxReplay(transaction, bundle.inbox, sourceEvent);
        if (inboxReplay) {
          throw constraint(
            'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
            'EF materialization inbox exists without its exact committed Run lineage',
          );
        }

        await assertCycleOpen(transaction, sourceEvent.validation_cycle_id);
        await assertExactMaterializationReadinessCurrent(
          transaction,
          bundle,
          sourceEvent,
        );

        await transaction.experimentFoundationIntegrationInboxV2.create({
          data: efInboxCreateData(bundle.inbox, sourceEvent),
        });
        await transaction.experimentFoundationVersionLockV2.create({
          data: {
            id: bundle.version_lock.version_lock_id,
            materializationKey: bundle.version_lock.materialization_key,
            readinessAttestationId: bundle.version_lock.readiness_attestation_id,
            readinessAttestationHash: bundle.version_lock.readiness_attestation_hash,
            externalPiWorkOrderRevisionId: sourceEvent.work_order_revision_id,
            externalPiWorkOrderRevisionHash: sourceEvent.work_order_revision_hash,
            externalPiApprovedPlanHash: sourceEvent.approved_plan_hash,
            dependencyManifestHash: bundle.version_lock.dependency_manifest_hash,
            dependencyCount: bundle.version_lock.dependency_count,
            lockHash: bundle.version_lock.lock_hash,
            createdAt: new Date(bundle.version_lock.created_at),
          },
        });
        if (bundle.version_lock_dependencies.length > 0) {
          await transaction.experimentFoundationVersionLockDependencyV2.createMany({
            data: ordered(bundle.version_lock_dependencies).map((dependency) => ({
              id: versionLockDependencyId(
                dependency.version_lock_id,
                dependency.ordinal,
              ),
              versionLockId: dependency.version_lock_id,
              ordinal: dependency.ordinal,
              dependencyRole: dependency.dependency.asset_type,
              dependencyAssetType: dependency.dependency.asset_type,
              dependencyAssetId: dependency.dependency.logical_id,
              dependencyRevisionId: dependency.dependency.revision_id,
              dependencyRevisionSequence: dependency.dependency.revision_sequence,
              dependencyRevisionHash: dependency.dependency.content_hash,
            })),
          });
        }

        await transaction.experimentFoundationRunRecipeV2.create({
          data: {
            id: bundle.run_recipe.run_recipe_id,
            materializationKey: bundle.run_recipe.materialization_key,
            versionLockId: bundle.run_recipe.version_lock_id,
            readinessAttestationId: bundle.run_recipe.readiness_attestation_id,
            externalPiWorkOrderRevisionId: sourceEvent.work_order_revision_id,
            externalPiWorkOrderRevisionHash: sourceEvent.work_order_revision_hash,
            recipeSchemaVersion: bundle.run_recipe.recipe_snapshot.recipe_schema_version,
            recipeSnapshotJson: toInputJson(bundle.run_recipe.recipe_snapshot),
            recipeHash: bundle.run_recipe.recipe_hash,
            executionBundleRevisionId:
              'execution_bundle' in bundle.run_recipe
                ? bundle.run_recipe.execution_bundle.execution_bundle_revision_id
                : null,
            executionBundleRevisionHash:
              'execution_bundle' in bundle.run_recipe
                ? bundle.run_recipe.execution_bundle.content_hash
                : null,
            createdAt: new Date(bundle.run_recipe.created_at),
          },
        });

        const sourceCells = new Map(
          sourceEvent.payload.exact_cells.map((cell) => [cell.work_order_cell_id, cell]),
        );
        await transaction.experimentFoundationTrainingTaskSpecV2.createMany({
          data: bundle.task_specs.map((taskSpec) => {
            const sourceCell = sourceCells.get(taskSpec.external_pi_cell_id);
            if (!sourceCell) {
              throw constraint(
                'RUN_CELL_PARITY_MISMATCH',
                `TaskSpec has no admitted PI cell: ${taskSpec.external_pi_cell_id}`,
              );
            }
            return {
              id: taskSpec.training_task_spec_id,
              runRecipeId: taskSpec.run_recipe_id,
              materializationKey: taskSpec.materialization_key,
              externalPiWorkOrderRevisionId: taskSpec.external_pi_work_order_revision_id,
              externalPiWorkOrderRevisionHash: taskSpec.external_pi_work_order_revision_hash,
              externalPiWorkOrderCellId: taskSpec.external_pi_cell_id,
              externalPiWorkOrderCellKey: sourceCell.cell_key,
              externalPiWorkOrderCellHash: taskSpec.external_pi_cell_hash,
              cellOrdinal: sourceCell.ordinal,
              taskSpecSchemaVersion:
                'execution_bundle' in taskSpec ? 'v2' : STORED_SCHEMA_VERSION_V1,
              taskSpecSnapshotJson: toInputJson(taskSpecSnapshot(taskSpec)),
              taskSpecHash: taskSpec.task_spec_hash,
              executionBundleRevisionId:
                'execution_bundle' in taskSpec
                  ? taskSpec.execution_bundle.execution_bundle_revision_id
                  : null,
              executionBundleRevisionHash:
                'execution_bundle' in taskSpec
                  ? taskSpec.execution_bundle.content_hash
                  : null,
              createdAt: new Date(taskSpec.created_at),
            };
          }),
        });

        await transaction.experimentFoundationRunV2.create({
          data: {
            id: bundle.run.run_id,
            runRecipeId: bundle.run_recipe.run_recipe_id,
            externalPiBranchId: sourceEvent.branch_id,
            externalPiWorkOrderRevisionId: bundle.run.external_pi_work_order_revision_id,
            externalPiWorkOrderRevisionHash: bundle.run.external_pi_work_order_revision_hash,
            externalPiRevisionSequence: bundle.run.external_pi_branch_revision_sequence,
            runManifestHash: bundle.run.run_manifest_hash,
            frozenAt: new Date(bundle.run.frozen_at),
          },
        });
        await transaction.experimentFoundationRunCellV2.createMany({
          data: ordered(bundle.run_cells).map((cell) => ({
            id: cell.run_cell_id,
            runId: cell.run_id,
            trainingTaskSpecId: cell.training_task_spec_id,
            ordinal: cell.ordinal,
            cellKey: cell.cell_key,
            externalPiWorkOrderCellId: cell.external_pi_cell_id,
            externalPiWorkOrderCellHash: cell.external_pi_cell_hash,
            seed: cell.seed,
            repeatIndex: cell.repeat_index,
            createdAt: new Date(bundle.run.frozen_at),
          })),
        });
        await transaction.experimentFoundationIntegrationOutboxV2.create({
          data: efOutboxCreateData(bundle.outbox),
        });

        const committed = await loadVerifiedExperimentFoundationV2Materialization(
          transaction,
          sourceEvent.work_order_revision_id,
        );
        if (!committed) {
          throw constraint(
            'INTEGRATION_PREREQUISITE_NOT_READY',
            'Committed EF materialization could not be read back inside its transaction',
          );
        }
        return committed;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
        && serializationRetry < 2
      ) {
        return this.commitMaterialization(bundle, sourceEvent, serializationRetry + 1);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw constraint(
          'MATERIALIZATION_KEY_CONFLICT',
          'Serializable materialization did not converge after bounded retry',
        );
      }
      throw mapEfWriteError(error, 'MATERIALIZATION_KEY_CONFLICT');
    }
  }

  async commitAcknowledgement(
    inbox: ExperimentFoundationIntegrationInboxV2,
    sourceEvent: BranchHeadAdvancedEventV1,
  ): Promise<ExperimentFoundationIntegrationInboxV2> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const replay = await findEfInboxReplay(transaction, inbox, sourceEvent);
        if (replay) {
          return replay;
        }

        const run = await transaction.experimentFoundationRunV2.findFirst({
          where: {
            id: sourceEvent.payload.run_id,
            externalPiBranchId: sourceEvent.branch_id,
            externalPiWorkOrderRevisionId: sourceEvent.work_order_revision_id,
            externalPiWorkOrderRevisionHash: sourceEvent.work_order_revision_hash,
            externalPiRevisionSequence: sourceEvent.branch_revision_sequence,
            runManifestHash: sourceEvent.payload.run_manifest_hash,
          },
        });
        if (!run) {
          throw constraint(
            'INTEGRATION_PREREQUISITE_NOT_READY',
            'EF Run prerequisite for BranchHeadAdvanced is not committed',
          );
        }
        if (sourceEvent.payload.accepted_revision_sequence !== sourceEvent.branch_revision_sequence) {
          throw constraint(
            'BRANCH_HEAD_SCOPE_CONFLICT',
            'BranchHeadAdvanced accepted sequence differs from its exact event scope',
          );
        }

        const row = await transaction.experimentFoundationIntegrationInboxV2.create({
          data: efInboxCreateData(inbox, sourceEvent),
        });
        return mapEfInbox(row);
      });
    } catch (error) {
      throw mapEfWriteError(error, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT');
    }
  }

  async claimOutbox(input: ExperimentV2RelayClaimInput): Promise<ExperimentV2RelayClaim[]> {
    const claimedAt = new Date(input.claimed_at);
    const leaseExpiresAt = new Date(input.lease_expires_at);
    return this.prisma.$transaction(async (transaction) => {
      const candidates = await transaction.experimentFoundationIntegrationOutboxV2.findMany({
        where: relayReadyWhere(claimedAt),
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: input.limit,
        select: { id: true },
      });
      const claims: ExperimentV2RelayClaim[] = [];
      for (const candidate of candidates) {
        const claimed = await transaction.experimentFoundationIntegrationOutboxV2.updateMany({
          where: { id: candidate.id, ...relayReadyWhere(claimedAt) },
          data: {
            relayStatus: 'leased',
            relayAttemptCount: { increment: 1 },
            relayLeaseOwner: input.lease_owner,
            relayLeaseExpiresAt: leaseExpiresAt,
            updatedAt: claimedAt,
          },
        });
        if (claimed.count !== 1) {
          continue;
        }
        const row = await transaction.experimentFoundationIntegrationOutboxV2.findUniqueOrThrow({
          where: { id: candidate.id },
        });
        try {
          claims.push(mapEfRelayClaim(row));
        } catch (error) {
          if (
            !(error instanceof ExperimentSpineV2RepositoryConstraintError)
            || error.reasonCode !== 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
          ) {
            throw error;
          }
          const terminalized = await transaction.experimentFoundationIntegrationOutboxV2.updateMany({
            where: {
              id: candidate.id,
              relayStatus: 'leased',
              relayLeaseOwner: input.lease_owner,
            },
            data: {
              relayStatus: 'terminal',
              relayLeaseOwner: null,
              relayLeaseExpiresAt: null,
              relayNextAttemptAt: null,
              lastRelayErrorCode: 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
              updatedAt: claimedAt,
            },
          });
          if (terminalized.count !== 1) {
            throw constraint(
              'OUTBOX_LEASE_CONFLICT',
              `EF invalid outbox could not be terminalized: ${candidate.id}`,
            );
          }
        }
      }
      return claims;
    });
  }

  async markOutboxDelivered(
    outboxId: string,
    leaseOwner: string,
    deliveredAt: string,
  ): Promise<void> {
    const timestamp = new Date(deliveredAt);
    const result = await this.prisma.experimentFoundationIntegrationOutboxV2.updateMany({
      where: {
        id: outboxId,
        relayLeaseOwner: leaseOwner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'delivered',
        publishedAt: timestamp,
        deliveredAt: timestamp,
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: null,
        lastRelayErrorCode: null,
        updatedAt: timestamp,
      },
    });
    if (result.count !== 1) {
      throw constraint('OUTBOX_LEASE_CONFLICT', `EF outbox lease was lost: ${outboxId}`);
    }
  }

  async markOutboxTerminal(input: ExperimentV2RelayTerminalInput): Promise<void> {
    const timestamp = new Date(input.terminal_at);
    const result = await this.prisma.experimentFoundationIntegrationOutboxV2.updateMany({
      where: {
        id: input.outbox_id,
        relayLeaseOwner: input.lease_owner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'terminal',
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: null,
        lastRelayErrorCode: input.error_code,
        updatedAt: timestamp,
      },
    });
    if (result.count !== 1) {
      throw constraint(
        'OUTBOX_LEASE_CONFLICT',
        `EF outbox lease cannot be terminalized: ${input.outbox_id}`,
      );
    }
  }

  async releaseOutbox(input: ExperimentV2RelayReleaseInput): Promise<void> {
    const releasedAt = new Date(input.released_at);
    const result = await this.prisma.experimentFoundationIntegrationOutboxV2.updateMany({
      where: {
        id: input.outbox_id,
        relayLeaseOwner: input.lease_owner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'pending',
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: new Date(input.next_attempt_at),
        lastRelayErrorCode: input.error_code,
        updatedAt: releasedAt,
      },
    });
    if (result.count !== 1) {
      throw constraint(
        'OUTBOX_LEASE_CONFLICT',
        `EF outbox lease cannot be released: ${input.outbox_id}`,
      );
    }
  }
}

/**
 * Locks and revalidates the exact readiness scope inside the T2 transaction.
 * Readiness rows are immutable and receive compatible SHARE locks, while the
 * ordered projection SHARE locks fence lifecycle revoke/replace updates until
 * T2 commits without serializing unrelated materializations on one attestation.
 */
async function assertExactMaterializationReadinessCurrent(
  transaction: Prisma.TransactionClient,
  bundle: ExperimentFoundationV2MaterializationBundle,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): Promise<void> {
  const guard = deriveExperimentFoundationV2MaterializationReadinessGuard(bundle, sourceEvent);
  await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "ExperimentFoundationReadinessAttestationV2"
    WHERE "id" = ${guard.readiness_attestation_id}
    FOR SHARE
  `);
  const attestation = await transaction.experimentFoundationReadinessAttestationV2.findUnique({
    where: { id: guard.readiness_attestation_id },
  });
  const expectedDependencyManifestHash =
    serverHashExperimentFoundationV2ReadinessDependencyManifest(
      guard.ordered_dependencies,
    );
  if (
    !attestation
    || attestation.attestationHash !== guard.readiness_attestation_hash
    || attestation.outcome !== 'passed'
    || attestation.targetAssetType !== ExperimentFoundationAssetTypeV2.EvaluationProtocol
    || attestation.targetAssetId !== guard.target.logical_id
    || attestation.targetRevisionId !== guard.target.revision_id
    || attestation.targetRevisionSequence !== guard.target.revision_sequence
    || attestation.targetRevisionHash !== guard.target.content_hash
    || attestation.dependencyManifestHash !== expectedDependencyManifestHash
  ) {
    throw readinessDrift('Exact passed readiness attestation drifted before T2 commit.');
  }

  await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "ExperimentFoundationReadinessDependencyV2"
    WHERE "attestationId" = ${guard.readiness_attestation_id}
    ORDER BY "ordinal", "id"
    FOR SHARE
  `);
  const dependencies = await transaction.experimentFoundationReadinessDependencyV2.findMany({
    where: { attestationId: guard.readiness_attestation_id },
    orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
  });
  if (
    dependencies.length !== guard.ordered_dependencies.length
    || dependencies.some((dependency, index) => {
      const expected = guard.ordered_dependencies[index];
      return !expected
        || dependency.ordinal !== index + 1
        || dependency.dependencyRole !== dependency.dependencyAssetType
        || dependency.dependencyAssetType !== toPrismaAssetType(expected.asset_type)
        || dependency.dependencyAssetId !== expected.logical_id
        || dependency.dependencyRevisionId !== expected.revision_id
        || dependency.dependencyRevisionSequence !== expected.revision_sequence
        || dependency.dependencyRevisionHash !== expected.content_hash;
    })
  ) {
    throw readinessDrift('Ordered readiness dependency manifest drifted before T2 commit.');
  }
  const mappedAttestation: ExperimentFoundationReadinessAttestationV2 = {
    readiness_attestation_id: attestation.id,
    target: {
      asset_type: attestation.targetAssetType,
      logical_id: attestation.targetAssetId,
      revision_id: attestation.targetRevisionId,
      revision_sequence: attestation.targetRevisionSequence,
      content_hash: attestation.targetRevisionHash,
    },
    status: attestation.outcome as ExperimentFoundationReadinessAttestationV2['status'],
    evaluator_profile_version: attestation.evaluatorProfileVersion,
    evaluator_profile_hash: attestation.evaluatorProfileHash,
    dependency_manifest_hash: attestation.dependencyManifestHash,
    qualification_snapshot: attestation.qualificationSnapshotJson as unknown as
      ExperimentFoundationReadinessQualificationSnapshotV2,
    blockers: attestation.blockerSnapshotJson as unknown as
      ExperimentFoundationReadinessBlockerV2[],
    attestation_hash: attestation.attestationHash,
    created_at: attestation.attestedAt.toISOString(),
  };
  const mappedDependencies: ExperimentFoundationReadinessDependencyV2[] = dependencies.map(
    (dependency) => ({
      readiness_attestation_id: dependency.attestationId,
      ordinal: dependency.ordinal,
      dependency: {
        asset_type: dependency.dependencyAssetType,
        logical_id: dependency.dependencyAssetId,
        revision_id: dependency.dependencyRevisionId,
        revision_sequence: dependency.dependencyRevisionSequence,
        content_hash: dependency.dependencyRevisionHash,
      },
    }),
  );
  try {
    assertStoredExperimentFoundationV2ReadinessIntegrity(
      mappedAttestation,
      mappedDependencies,
    );
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw readinessDrift(
        `Exact readiness typed snapshot or canonical hash drifted before T2 commit: ${error.message}`,
      );
    }
    throw error;
  }

  const refs = [guard.target, ...guard.ordered_dependencies];
  const uniqueRefs = new Map(refs.map((ref) => [exactAssetRefKey(ref), ref]));
  if (uniqueRefs.size !== refs.length) {
    throw readinessDrift('Readiness lifecycle scope contains duplicate exact revisions.');
  }
  const exactConditions = refs.map((ref) => Prisma.sql`(
    "assetType" = CAST(${ref.asset_type} AS "ExperimentFoundationAssetTypeV2")
    AND "assetId" = ${ref.logical_id}
    AND "currentRevisionId" = ${ref.revision_id}
    AND "currentRevisionSequence" = ${ref.revision_sequence}
    AND "currentRevisionHash" = ${ref.content_hash}
  )`);
  await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "ExperimentFoundationAssetLifecycleProjectionV2"
    WHERE ${Prisma.join(exactConditions, ' OR ')}
    ORDER BY "id"
    FOR SHARE
  `);
  const projections = await transaction.experimentFoundationAssetLifecycleProjectionV2.findMany({
    where: {
      OR: refs.map((ref) => ({
        assetType: toPrismaAssetType(ref.asset_type),
        assetId: ref.logical_id,
        currentRevisionId: ref.revision_id,
        currentRevisionSequence: ref.revision_sequence,
        currentRevisionHash: ref.content_hash,
      })),
    },
  });
  const projectionByRef = new Map(projections.map((projection) => [
    exactAssetRefKey({
      asset_type: projection.assetType,
      logical_id: projection.assetId,
      revision_id: projection.currentRevisionId,
      revision_sequence: projection.currentRevisionSequence,
      content_hash: projection.currentRevisionHash,
    }),
    projection,
  ]));
  if (refs.some((ref) => {
    const projection = projectionByRef.get(exactAssetRefKey(ref));
    return !projection
      || projection.lifecycleStatus !== 'active'
      || (ref.asset_type === 'Dataset' && projection.locationAvailable !== true);
  })) {
    throw readinessDrift(
      'Target or dependency lifecycle projection is not exact, active, and location-available where required.',
    );
  }
}

function readinessDrift(message: string): ExperimentSpineV2RepositoryConstraintError {
  return constraint('READINESS_DEPENDENCY_DRIFT', message);
}

function exactAssetRefKey(ref: ExperimentFoundationV2ExactAssetRevisionRef): string {
  return [
    ref.asset_type,
    ref.logical_id,
    ref.revision_id,
    ref.revision_sequence,
    ref.content_hash,
  ].join('\u0000');
}

function toPrismaAssetType(assetType: ExperimentFoundationV2ExactAssetRevisionRef['asset_type']) {
  return ExperimentFoundationAssetTypeV2[assetType];
}

export async function loadVerifiedExperimentFoundationV2Materialization(
  client: SpineClient,
  workOrderRevisionId: string,
): Promise<ExperimentFoundationV2MaterializationBundle | null> {
  const run = await client.experimentFoundationRunV2.findFirst({
    where: { externalPiWorkOrderRevisionId: workOrderRevisionId },
  });
  if (!run) {
    return null;
  }
  const [recipe, cells, inbox, outbox] = await Promise.all([
    client.experimentFoundationRunRecipeV2.findUnique({ where: { id: run.runRecipeId } }),
    client.experimentFoundationRunCellV2.findMany({
      where: { runId: run.id }, orderBy: { ordinal: 'asc' },
    }),
    client.experimentFoundationIntegrationInboxV2.findFirst({
      where: {
        workOrderRevisionId,
        eventType: 'WorkOrderRevisionAdmitted',
        consumerName: EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
        status: 'processed',
        outcome: 'processed',
        reasonCode: null,
      },
    }),
    client.experimentFoundationIntegrationOutboxV2.findFirst({
      where: { workOrderRevisionId, eventType: 'RunManifestFrozen' },
    }),
  ]);
  if (!recipe || !inbox || !outbox || cells.length === 0) {
    return null;
  }
  const sourceEvent = storedEvent(inbox);
  if (sourceEvent.event_type !== 'WorkOrderRevisionAdmitted') {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `Materialization source inbox is not WorkOrderRevisionAdmitted: ${inbox.id}`,
    );
  }
  assertStoredWorkOrderRevisionAdmittedAuthority(sourceEvent);
  const [versionLock, dependencies, taskSpecs] = await Promise.all([
    client.experimentFoundationVersionLockV2.findUnique({ where: { id: recipe.versionLockId } }),
    client.experimentFoundationVersionLockDependencyV2.findMany({
      where: { versionLockId: recipe.versionLockId }, orderBy: { ordinal: 'asc' },
    }),
    client.experimentFoundationTrainingTaskSpecV2.findMany({
      where: { runRecipeId: recipe.id }, orderBy: { cellOrdinal: 'asc' },
    }),
  ]);
  if (!versionLock || taskSpecs.length === 0) {
    return null;
  }
  const taskSpecById = new Map(taskSpecs.map((taskSpec) => [taskSpec.id, taskSpec]));
  if (cells.some((cell) => !taskSpecById.has(cell.trainingTaskSpecId))) {
    return null;
  }
  const mappedDependencies = dependencies.map(mapVersionLockDependency);
  const mappedVersionLock = mapVersionLock(versionLock, mappedDependencies, sourceEvent);
  const mappedRecipe = mapRunRecipe(recipe);
  assertRunRecipeBinding(recipe, mappedRecipe, versionLock, sourceEvent);
  const admittedCellsById = exactAdmittedCellsById(sourceEvent);
  const mappedTaskSpecs = taskSpecs.map((taskSpec) => {
    const admittedCell = admittedCellsById.get(taskSpec.externalPiWorkOrderCellId);
    if (!admittedCell) {
      throw constraint(
        'MATERIALIZATION_KEY_CONFLICT',
        `TrainingTaskSpec has no exact admitted source cell: ${taskSpec.id}`,
      );
    }
    return mapTaskSpec(taskSpec, admittedCell, versionLock, recipe, sourceEvent);
  });
  const mappedRunCells = cells.map((cell) => (
    mapRunCell(cell, taskSpecById.get(cell.trainingTaskSpecId)!)
  ));
  const mappedRun = mapRun(run, cells.length);
  assertRunAndManifestIntegrity(run, mappedRunCells, sourceEvent, recipe);
  const mappedOutbox = mapEfOutbox(outbox);
  if (mappedOutbox.event.event_type !== 'RunManifestFrozen') {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `Stored materialization outbox has the wrong event type: ${mappedOutbox.outbox_id}`,
    );
  }
  const bundle: ExperimentFoundationV2MaterializationBundle = {
    inbox: mapEfInbox(inbox),
    version_lock: mappedVersionLock,
    version_lock_dependencies: mappedDependencies,
    run_recipe: mappedRecipe,
    task_specs: mappedTaskSpecs,
    run: mappedRun,
    run_cells: mappedRunCells,
    outbox: { ...mappedOutbox, event: mappedOutbox.event },
  };
  assertMaterializationParity(bundle, sourceEvent);
  return bundle;
}

function mapVersionLock(
  row: VersionLockRow,
  dependencies: ExperimentFoundationVersionLockDependencyV2[],
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): ExperimentFoundationVersionLockV2 {
  const mapped = {
    version_lock_id: row.id,
    materialization_key: row.materializationKey,
    readiness_attestation_id: row.readinessAttestationId,
    readiness_attestation_hash: row.readinessAttestationHash,
    dependency_manifest_hash: row.dependencyManifestHash,
    dependency_count: row.dependencyCount,
    lock_hash: row.lockHash,
    created_at: row.createdAt.toISOString(),
  };
  const orderedDependencies = ordered(dependencies);
  const dependencyRefs = orderedDependencies.map((dependency) => dependency.dependency);
  if (
    row.materializationKey
      !== `${sourceEvent.work_order_revision_id}:${sourceEvent.approved_plan_hash}`
    || row.readinessAttestationId !== sourceEvent.payload.readiness_attestation_id
    || row.readinessAttestationHash !== sourceEvent.payload.readiness_attestation_hash
    || row.externalPiWorkOrderRevisionId !== sourceEvent.work_order_revision_id
    || row.externalPiWorkOrderRevisionHash !== sourceEvent.work_order_revision_hash
    || row.externalPiApprovedPlanHash !== sourceEvent.approved_plan_hash
    || row.dependencyCount !== orderedDependencies.length
    || orderedDependencies.some((dependency, index) => (
      dependency.version_lock_id !== row.id || dependency.ordinal !== index + 1
    ))
    || row.dependencyManifestHash
      !== serverHashExperimentFoundationV2VersionLockDependencyManifest(dependencyRefs)
    || row.lockHash !== serverHashExperimentFoundationV2VersionLock({
      materialization_key: row.materializationKey,
      readiness_attestation_id: row.readinessAttestationId,
      readiness_attestation_hash: row.readinessAttestationHash,
      dependency_manifest_hash: row.dependencyManifestHash,
      dependencies: orderedDependencies.map(({ ordinal, dependency }) => ({
        ordinal,
        dependency,
      })),
    })
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `VersionLock immutable binding or canonical hash drifted: ${row.id}`,
    );
  }
  return mapped;
}

function mapVersionLockDependency(
  row: VersionLockDependencyRow,
): ExperimentFoundationVersionLockDependencyV2 {
  if (row.dependencyRole !== row.dependencyAssetType) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `VersionLock dependency role drifted: ${row.id}`,
    );
  }
  return {
    version_lock_id: row.versionLockId,
    ordinal: row.ordinal,
    dependency: {
      asset_type: row.dependencyAssetType,
      logical_id: row.dependencyAssetId,
      revision_id: row.dependencyRevisionId,
      revision_sequence: row.dependencyRevisionSequence,
      content_hash: row.dependencyRevisionHash,
    },
  };
}

function mapRunRecipe(
  row: RunRecipeRow,
): ExperimentFoundationRunRecipeV2 | ExperimentFoundationExecutableRunRecipeV2 {
  const snapshot = decodeStoredSnapshot(
    () => decodeStoredExperimentFoundationV2RunRecipeSnapshot(
      row.recipeSnapshotJson,
      `EF RunRecipe ${row.id}`,
    ),
  );
  assertStoredSchemaVersion(row.recipeSchemaVersion, snapshot.recipe_schema_version, 'EF RunRecipe');
  const mapped = snapshot.recipe_schema_version === 'v2'
    ? {
      run_recipe_id: row.id,
      materialization_key: row.materializationKey,
      version_lock_id: row.versionLockId,
      readiness_attestation_id: row.readinessAttestationId,
      recipe_snapshot: snapshot,
      recipe_hash: row.recipeHash,
      created_at: row.createdAt.toISOString(),
      execution_bundle: snapshot.execution_bundle,
    }
    : {
      run_recipe_id: row.id,
      materialization_key: row.materializationKey,
      version_lock_id: row.versionLockId,
      readiness_attestation_id: row.readinessAttestationId,
      recipe_snapshot: snapshot,
      recipe_hash: row.recipeHash,
      created_at: row.createdAt.toISOString(),
    };
  if (
    (snapshot.recipe_schema_version === 'v1'
      && (row.executionBundleRevisionId !== null || row.executionBundleRevisionHash !== null))
    || (snapshot.recipe_schema_version === 'v2'
      && (
        row.executionBundleRevisionId !== snapshot.execution_bundle.execution_bundle_revision_id
        || row.executionBundleRevisionHash !== snapshot.execution_bundle.content_hash
      ))
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `RunRecipe ExecutionBundle tuple drifted: ${row.id}`,
    );
  }
  if (row.recipeHash !== serverHashExperimentFoundationV2RunRecipe({
    materialization_key: row.materializationKey,
    version_lock_id: row.versionLockId,
    readiness_attestation_id: row.readinessAttestationId,
    recipe_snapshot: snapshot,
  })) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `RunRecipe canonical hash drifted: ${row.id}`,
    );
  }
  return mapped;
}

function mapTaskSpec(
  row: TaskSpecRow,
  admittedCell: WorkOrderRevisionAdmittedCellV1,
  versionLock: VersionLockRow,
  recipe: RunRecipeRow,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): ExperimentFoundationTrainingTaskSpecV2 | ExperimentFoundationExecutableTrainingTaskSpecV2 {
  const snapshot = decodeStoredSnapshot(
    () => decodeStoredExperimentFoundationV2TrainingTaskSpecSnapshot(
      row.taskSpecSnapshotJson,
      `EF TrainingTaskSpec ${row.id}`,
    ),
  );
  assertStoredSchemaVersion(
    row.taskSpecSchemaVersion,
    snapshot.schema_version,
    'EF TrainingTaskSpec',
  );
  const mapped = snapshot.schema_version === 'v2'
    ? {
      training_task_spec_id: row.id,
      materialization_key: row.materializationKey,
      run_recipe_id: row.runRecipeId,
      external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
      external_pi_cell_id: row.externalPiWorkOrderCellId,
      external_pi_cell_hash: row.externalPiWorkOrderCellHash,
      command_snapshot: snapshot.command_snapshot,
      io_snapshot: snapshot.io_snapshot,
      resource_snapshot: snapshot.resource_snapshot,
      retry_snapshot: snapshot.retry_snapshot,
      task_spec_hash: row.taskSpecHash,
      created_at: row.createdAt.toISOString(),
      execution_bundle: snapshot.execution_bundle,
    }
    : {
      training_task_spec_id: row.id,
      materialization_key: row.materializationKey,
      run_recipe_id: row.runRecipeId,
      external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
      external_pi_cell_id: row.externalPiWorkOrderCellId,
      external_pi_cell_hash: row.externalPiWorkOrderCellHash,
      command_snapshot: snapshot.command_snapshot,
      io_snapshot: snapshot.io_snapshot,
      resource_snapshot: snapshot.resource_snapshot,
      retry_snapshot: snapshot.retry_snapshot,
      task_spec_hash: row.taskSpecHash,
      created_at: row.createdAt.toISOString(),
    };
  if (
    row.runRecipeId !== recipe.id
    || row.materializationKey !== `${versionLock.materializationKey}:cell:${admittedCell.ordinal}`
    || row.externalPiWorkOrderRevisionId !== sourceEvent.work_order_revision_id
    || row.externalPiWorkOrderRevisionHash !== sourceEvent.work_order_revision_hash
    || row.externalPiWorkOrderCellId !== admittedCell.work_order_cell_id
    || row.externalPiWorkOrderCellKey !== admittedCell.cell_key
    || row.externalPiWorkOrderCellHash !== admittedCell.cell_hash
    || row.cellOrdinal !== admittedCell.ordinal
    || (snapshot.schema_version === 'v1'
      && (row.executionBundleRevisionId !== null || row.executionBundleRevisionHash !== null))
    || (snapshot.schema_version === 'v2'
      && (
        row.executionBundleRevisionId !== snapshot.execution_bundle.execution_bundle_revision_id
        || row.executionBundleRevisionHash !== snapshot.execution_bundle.content_hash
      ))
    || row.taskSpecHash !== serverHashExperimentFoundationV2TrainingTaskSpec({
      ...(snapshot.schema_version === 'v2'
        ? {
          task_spec_schema_version: 'v2' as const,
          execution_bundle: snapshot.execution_bundle,
        }
        : {}),
      materialization_key: row.materializationKey,
      run_recipe_id: row.runRecipeId,
      external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
      external_pi_cell_id: row.externalPiWorkOrderCellId,
      external_pi_cell_hash: row.externalPiWorkOrderCellHash,
      admitted_cell: admittedCell,
      command_snapshot: snapshot.command_snapshot,
      io_snapshot: snapshot.io_snapshot,
      resource_snapshot: snapshot.resource_snapshot,
      retry_snapshot: snapshot.retry_snapshot,
    })
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `TrainingTaskSpec immutable binding or canonical hash drifted: ${row.id}`,
    );
  }
  return mapped;
}

function mapRun(row: RunRow, cellCount: number): ExperimentFoundationRunV2 {
  return {
    run_id: row.id,
    external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
    external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
    external_pi_branch_revision_sequence: row.externalPiRevisionSequence,
    run_manifest_hash: row.runManifestHash,
    cell_count: cellCount,
    frozen_at: row.frozenAt.toISOString(),
  };
}

function mapRunCell(row: RunCellRow, taskSpec: TaskSpecRow): ExperimentFoundationRunCellV2 {
  return {
    run_cell_id: row.id,
    run_id: row.runId,
    ordinal: row.ordinal,
    cell_key: row.cellKey,
    external_pi_cell_id: row.externalPiWorkOrderCellId,
    external_pi_cell_hash: row.externalPiWorkOrderCellHash,
    training_task_spec_id: row.trainingTaskSpecId,
    training_task_spec_hash: taskSpec.taskSpecHash,
    seed: row.seed,
    repeat_index: row.repeatIndex,
  };
}

function assertRunRecipeBinding(
  row: RunRecipeRow,
  mapped: ExperimentFoundationRunRecipeV2 | ExperimentFoundationExecutableRunRecipeV2,
  versionLock: VersionLockRow,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): void {
  if (
    mapped.materialization_key !== versionLock.materializationKey
    || mapped.version_lock_id !== versionLock.id
    || mapped.readiness_attestation_id !== versionLock.readinessAttestationId
    || row.externalPiWorkOrderRevisionId !== sourceEvent.work_order_revision_id
    || row.externalPiWorkOrderRevisionHash !== sourceEvent.work_order_revision_hash
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `RunRecipe exact VersionLock or PI revision binding drifted: ${row.id}`,
    );
  }
}

function exactAdmittedCellsById(
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): Map<string, WorkOrderRevisionAdmittedCellV1> {
  const result = new Map<string, WorkOrderRevisionAdmittedCellV1>();
  for (let index = 0; index < sourceEvent.payload.exact_cells.length; index += 1) {
    const cell = sourceEvent.payload.exact_cells[index]!;
    if (
      cell.ordinal !== index + 1
      || result.has(cell.work_order_cell_id)
    ) {
      throw constraint(
        'MATERIALIZATION_KEY_CONFLICT',
        `Stored WorkOrderRevisionAdmitted exact cell manifest is not unique ordered 1..N: ${sourceEvent.event_id}`,
      );
    }
    result.set(cell.work_order_cell_id, cell);
  }
  return result;
}

function assertStoredWorkOrderRevisionAdmittedAuthority(
  event: WorkOrderRevisionAdmittedEventV1,
): void {
  const revisionHash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    event.payload.work_order_revision,
  );
  const seenCellIds = new Set<string>();
  const seenCellKeys = new Set<string>();
  const cellPlanRows = event.payload.exact_cells.map((cell, index) => {
    const semanticCell = {
      cell_key: cell.cell_key,
      seed: cell.seed,
      repeat_index: cell.repeat_index,
      parameters: cell.parameters,
      required_result_contract: cell.required_result_contract,
    };
    if (
      cell.ordinal !== index + 1
      || seenCellIds.has(cell.work_order_cell_id)
      || seenCellKeys.has(cell.cell_key)
      || cell.cell_hash !== serverHashPaperImplementationExperimentV2Cell(semanticCell)
    ) {
      throw constraint(
        'MATERIALIZATION_KEY_CONFLICT',
        `Stored WorkOrderRevisionAdmitted cell authority drifted: ${event.event_id}`,
      );
    }
    seenCellIds.add(cell.work_order_cell_id);
    seenCellKeys.add(cell.cell_key);
    return { ordinal: cell.ordinal, cell_hash: cell.cell_hash };
  });
  const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(cellPlanRows);
  const approvedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: event.payload.branch_frame_hash,
    work_order_revision_hash: revisionHash,
    cell_plan_hash: cellPlanHash,
  });
  if (
    event.schema_version !== STORED_SCHEMA_VERSION_V1
    || event.producer_domain !== 'PaperImplementation'
    || !verifyExperimentV2EventPayloadHash(event)
    || event.payload.exact_cells.length === 0
    || revisionHash !== event.work_order_revision_hash
    || cellPlanHash !== event.cell_plan_hash
    || approvedPlanHash !== event.approved_plan_hash
    || event.payload.readiness_attestation_id
      !== event.payload.work_order_revision.readiness_attestation_id
    || event.payload.readiness_attestation_hash
      !== event.payload.work_order_revision.readiness_attestation_hash
    || canonicalizeExperimentV2Json(event.payload.asset_dependencies)
      !== canonicalizeExperimentV2Json(event.payload.work_order_revision.asset_dependencies)
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `Stored WorkOrderRevisionAdmitted semantic authority drifted: ${event.event_id}`,
    );
  }
}

function assertRunAndManifestIntegrity(
  row: RunRow,
  cells: ExperimentFoundationRunCellV2[],
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
  recipe: RunRecipeRow,
): void {
  const orderedCells = ordered(cells);
  const admittedCells = sourceEvent.payload.exact_cells;
  if (
    row.runRecipeId !== recipe.id
    || row.externalPiBranchId !== sourceEvent.branch_id
    || row.externalPiWorkOrderRevisionId !== sourceEvent.work_order_revision_id
    || row.externalPiWorkOrderRevisionHash !== sourceEvent.work_order_revision_hash
    || row.externalPiRevisionSequence !== sourceEvent.branch_revision_sequence
    || orderedCells.length !== admittedCells.length
    || orderedCells.some((cell, index) => {
      const admitted = admittedCells[index];
      return !admitted
        || cell.run_id !== row.id
        || cell.ordinal !== index + 1
        || cell.ordinal !== admitted.ordinal
        || cell.cell_key !== admitted.cell_key
        || cell.external_pi_cell_id !== admitted.work_order_cell_id
        || cell.external_pi_cell_hash !== admitted.cell_hash
        || cell.seed !== admitted.seed
        || cell.repeat_index !== admitted.repeat_index;
    })
    || row.runManifestHash !== serverHashExperimentFoundationV2RunManifest(orderedCells)
  ) {
    throw constraint(
      'RUN_MANIFEST_CONFLICT',
      `Run exact PI binding or derived manifest hash drifted: ${row.id}`,
    );
  }
}

function mapEfInbox(row: EfInboxRow): ExperimentFoundationIntegrationInboxV2 {
  const event = storedEvent(row);
  const storedOutcome = storedInboxOutcome(row);
  if (event.event_type === 'RunManifestFrozen') {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `EF inbox contains an EF-owned event: ${row.id}`,
    );
  }
  return {
    inbox_id: row.id,
    consumer_name: row.consumerName,
    source_event_id: row.eventId,
    business_idempotency_key: row.businessIdempotencyKey,
    payload_hash: row.payloadHash,
    source_event_hash: serverHashExperimentV2EventEnvelope(event),
    scope: eventScope(event),
    outcome: storedOutcome.outcome,
    reason_code: storedOutcome.reason_code,
    processed_at: row.processedAt.toISOString(),
  };
}

function mapEfOutbox(row: EfOutboxRow): ExperimentFoundationIntegrationOutboxV2 {
  const event = storedEvent(row);
  if (
    event.event_type !== 'RunManifestFrozen'
    && event.event_type !== 'EvidenceCandidateQualified'
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `EF outbox contains a non-EF event: ${row.id}`,
    );
  }
  const aggregate = event.event_type === 'RunManifestFrozen'
    ? { type: 'ExperimentFoundationRunV2', id: event.payload.run_id }
    : {
      type: 'ExperimentFoundationEvidenceCandidateV2',
      id: event.payload.candidate_id,
    };
  if (row.aggregateType !== aggregate.type || row.aggregateId !== aggregate.id) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `EF outbox aggregate binding drifted: ${row.id}`,
    );
  }
  return {
    outbox_id: row.id,
    aggregate_transition_key: row.transitionKey,
    event,
    created_at: row.createdAt.toISOString(),
  };
}

function efInboxCreateData(
  inbox: ExperimentFoundationIntegrationInboxV2,
  sourceEvent: WorkOrderRevisionAdmittedEventV1 | BranchHeadAdvancedEventV1,
) {
  assertInboxMatchesEvent(inbox, sourceEvent);
  const stored = encodedEvent(sourceEvent);
  const storedOutcome = storedInboxOutcome({
    status: inbox.outcome === 'retryable' ? 'retryable' : 'processed',
    outcome: inbox.outcome,
    reasonCode: inbox.reason_code,
  });
  const runId = sourceEvent.event_type === 'BranchHeadAdvanced'
    ? sourceEvent.payload.run_id
    : null;
  const runManifestHash = sourceEvent.event_type === 'BranchHeadAdvanced'
    ? sourceEvent.payload.run_manifest_hash
    : null;
  return {
    id: inbox.inbox_id,
    consumerName: inbox.consumer_name,
    eventId: sourceEvent.event_id,
    eventType: sourceEvent.event_type,
    schemaVersion: sourceEvent.schema_version,
    producerDomain: sourceEvent.producer_domain,
    occurredAt: new Date(sourceEvent.occurred_at),
    correlationId: sourceEvent.correlation_id,
    causationId: sourceEvent.causation_id,
    businessIdempotencyKey: sourceEvent.business_idempotency_key,
    implementationProjectId: sourceEvent.implementation_project_id,
    validationCycleId: sourceEvent.validation_cycle_id,
    branchId: sourceEvent.branch_id,
    branchKey: sourceEvent.branch_key,
    workOrderRevisionId: sourceEvent.work_order_revision_id,
    revisionSequence: sourceEvent.branch_revision_sequence,
    workOrderRevisionHash: sourceEvent.work_order_revision_hash,
    cellPlanHash: sourceEvent.cell_plan_hash,
    approvedPlanHash: sourceEvent.approved_plan_hash,
    runId,
    runManifestHash,
    eventPayloadJson: toInputJson(stored.payload),
    payloadHash: sourceEvent.payload_hash,
    eventEnvelopeHash: stored.envelope_hash,
    status: storedOutcome.status,
    outcome: storedOutcome.outcome,
    reasonCode: storedOutcome.reason_code,
    receivedAt: new Date(inbox.processed_at ?? sourceEvent.occurred_at),
    processedAt: new Date(inbox.processed_at ?? sourceEvent.occurred_at),
  } satisfies Prisma.ExperimentFoundationIntegrationInboxV2UncheckedCreateInput;
}

function efOutboxCreateData(outbox: ExperimentFoundationIntegrationOutboxV2) {
  const event = outbox.event;
  const stored = encodedEvent(event);
  return {
    id: outbox.outbox_id,
    eventId: event.event_id,
    aggregateType: 'ExperimentFoundationRunV2',
    aggregateId: event.payload.run_id,
    transitionKey: outbox.aggregate_transition_key,
    eventType: event.event_type,
    schemaVersion: event.schema_version,
    producerDomain: event.producer_domain,
    occurredAt: new Date(event.occurred_at),
    correlationId: event.correlation_id,
    causationId: event.causation_id,
    businessIdempotencyKey: event.business_idempotency_key,
    implementationProjectId: event.implementation_project_id,
    validationCycleId: event.validation_cycle_id,
    branchId: event.branch_id,
    branchKey: event.branch_key,
    workOrderRevisionId: event.work_order_revision_id,
    revisionSequence: event.branch_revision_sequence,
    workOrderRevisionHash: event.work_order_revision_hash,
    cellPlanHash: event.cell_plan_hash,
    approvedPlanHash: event.approved_plan_hash,
    runId: event.payload.run_id,
    runManifestHash: event.payload.run_manifest_hash,
    eventPayloadJson: toInputJson(stored.payload),
    payloadHash: event.payload_hash,
    eventEnvelopeHash: stored.envelope_hash,
    relayStatus: 'pending',
    relayAttemptCount: 0,
    createdAt: new Date(outbox.created_at),
    updatedAt: new Date(outbox.created_at),
  } satisfies Prisma.ExperimentFoundationIntegrationOutboxV2UncheckedCreateInput;
}

async function findEfInboxReplay(
  client: SpineClient,
  inbox: ExperimentFoundationIntegrationInboxV2,
  sourceEvent: WorkOrderRevisionAdmittedEventV1 | BranchHeadAdvancedEventV1,
): Promise<ExperimentFoundationIntegrationInboxV2 | null> {
  const byEvent = await client.experimentFoundationIntegrationInboxV2.findFirst({
    where: { consumerName: inbox.consumer_name, eventId: sourceEvent.event_id },
  });
  const byBusiness = byEvent ?? await client.experimentFoundationIntegrationInboxV2.findFirst({
    where: {
      consumerName: inbox.consumer_name,
      implementationProjectId: sourceEvent.implementation_project_id,
      validationCycleId: sourceEvent.validation_cycle_id,
      branchId: sourceEvent.branch_id,
      businessIdempotencyKey: sourceEvent.business_idempotency_key,
    },
  });
  if (!byBusiness) {
    return null;
  }
  if (
    byBusiness.eventId !== sourceEvent.event_id
    || serverHashExperimentV2EventEnvelope(storedEvent(byBusiness))
      !== serverHashExperimentV2EventEnvelope(sourceEvent)
    || byBusiness.outcome !== inbox.outcome
    || byBusiness.reasonCode !== inbox.reason_code
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'EF inbox event or business key was reused with changed payload/outcome',
    );
  }
  return mapEfInbox(byBusiness);
}

function assertMaterializationParity(
  bundle: ExperimentFoundationV2MaterializationBundle,
  event: WorkOrderRevisionAdmittedEventV1,
): void {
  const dependencies = ordered(bundle.version_lock_dependencies);
  const cells = ordered(bundle.run_cells);
  const eventCells = ordered(event.payload.exact_cells);
  const taskSpecsById = new Map(
    bundle.task_specs.map((taskSpec) => [taskSpec.training_task_spec_id, taskSpec]),
  );
  const expectedMaterializationSchema =
    event.payload.work_order_revision.work_order_schema_version;
  if (
    bundle.run_recipe.recipe_snapshot.recipe_schema_version !== expectedMaterializationSchema
    || bundle.inbox.source_event_id !== event.event_id
    || bundle.inbox.payload_hash !== event.payload_hash
    || bundle.version_lock.readiness_attestation_id !== event.payload.readiness_attestation_id
    || bundle.version_lock.readiness_attestation_hash !== event.payload.readiness_attestation_hash
    || bundle.version_lock.dependency_count !== dependencies.length
    || bundle.run_recipe.version_lock_id !== bundle.version_lock.version_lock_id
    || bundle.run_recipe.readiness_attestation_id !== event.payload.readiness_attestation_id
    || bundle.run.external_pi_work_order_revision_id !== event.work_order_revision_id
    || bundle.run.external_pi_work_order_revision_hash !== event.work_order_revision_hash
    || bundle.run.external_pi_branch_revision_sequence !== event.branch_revision_sequence
    || bundle.run.cell_count !== cells.length
    || eventCells.length !== cells.length
    || bundle.task_specs.length !== cells.length
    || bundle.outbox.event.work_order_revision_id !== event.work_order_revision_id
    || bundle.outbox.event.payload.source_event_id !== event.event_id
    || bundle.outbox.event.payload.version_lock_id !== bundle.version_lock.version_lock_id
    || bundle.outbox.event.payload.version_lock_hash !== bundle.version_lock.lock_hash
    || bundle.outbox.event.payload.run_recipe_id !== bundle.run_recipe.run_recipe_id
    || bundle.outbox.event.payload.run_recipe_hash !== bundle.run_recipe.recipe_hash
    || bundle.outbox.event.payload.run_id !== bundle.run.run_id
    || bundle.outbox.event.payload.run_manifest_hash !== bundle.run.run_manifest_hash
    || bundle.outbox.event.payload.task_spec_bindings.length !== cells.length
  ) {
    throw constraint('RUN_CELL_PARITY_MISMATCH', 'EF materialization bundle scope or counts do not match admission');
  }
  for (let index = 0; index < eventCells.length; index += 1) {
    const admitted = eventCells[index];
    const runCell = cells[index];
    const taskSpec = taskSpecsById.get(runCell.training_task_spec_id);
    const frozenBinding = bundle.outbox.event.payload.task_spec_bindings[index];
    if (
      admitted.ordinal !== index + 1
      || runCell.ordinal !== admitted.ordinal
      || runCell.external_pi_cell_id !== admitted.work_order_cell_id
      || runCell.cell_key !== admitted.cell_key
      || runCell.external_pi_cell_hash !== admitted.cell_hash
      || runCell.seed !== admitted.seed
      || runCell.repeat_index !== admitted.repeat_index
      || !taskSpec
      || taskSpec.external_pi_cell_id !== admitted.work_order_cell_id
      || taskSpec.external_pi_cell_hash !== admitted.cell_hash
      || taskSpec.external_pi_work_order_revision_id !== event.work_order_revision_id
      || taskSpec.external_pi_work_order_revision_hash !== event.work_order_revision_hash
      || taskSpec.run_recipe_id !== bundle.run_recipe.run_recipe_id
      || runCell.training_task_spec_hash !== taskSpec.task_spec_hash
      || !frozenBinding
      || frozenBinding.ordinal !== runCell.ordinal
      || frozenBinding.work_order_cell_id !== runCell.external_pi_cell_id
      || frozenBinding.cell_key !== runCell.cell_key
      || frozenBinding.cell_hash !== runCell.external_pi_cell_hash
      || frozenBinding.training_task_spec_id !== runCell.training_task_spec_id
      || frozenBinding.training_task_spec_hash !== runCell.training_task_spec_hash
    ) {
      throw constraint('RUN_CELL_PARITY_MISMATCH', `EF cell parity failed at ordinal ${index + 1}`);
    }
  }
  for (let index = 0; index < dependencies.length; index += 1) {
    const dependency = dependencies[index];
    const admitted = event.payload.asset_dependencies[index];
    if (
      dependency.ordinal !== index + 1
      || !admitted
      || !sameJson(dependency.dependency, admitted)
    ) {
      throw constraint('MATERIALIZATION_KEY_CONFLICT', `VersionLock dependency drift at ordinal ${index + 1}`);
    }
  }
  if (dependencies.length !== event.payload.asset_dependencies.length) {
    throw constraint('MATERIALIZATION_KEY_CONFLICT', 'VersionLock dependency count differs from admission');
  }
}

function sameMaterialization(
  stored: ExperimentFoundationV2MaterializationBundle,
  expected: ExperimentFoundationV2MaterializationBundle,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): boolean {
  try {
    assertMaterializationParity(stored, sourceEvent);
  } catch {
    return false;
  }
  const storedCells = ordered(stored.run_cells);
  const expectedCells = ordered(expected.run_cells);
  const storedTasks = [...stored.task_specs].sort((left, right) => (
    left.external_pi_cell_id.localeCompare(right.external_pi_cell_id)
  ));
  const expectedTasks = [...expected.task_specs].sort((left, right) => (
    left.external_pi_cell_id.localeCompare(right.external_pi_cell_id)
  ));
  return stored.version_lock.materialization_key === expected.version_lock.materialization_key
    && stored.version_lock.lock_hash === expected.version_lock.lock_hash
    && stored.version_lock.dependency_manifest_hash === expected.version_lock.dependency_manifest_hash
    && stored.run_recipe.materialization_key === expected.run_recipe.materialization_key
    && stored.run_recipe.recipe_hash === expected.run_recipe.recipe_hash
    && stored.run.run_id === expected.run.run_id
    && stored.run.run_manifest_hash === expected.run.run_manifest_hash
    && storedCells.length === expectedCells.length
    && storedCells.every((cell, index) => {
      const candidate = expectedCells[index];
      return candidate !== undefined
        && cell.ordinal === candidate.ordinal
        && cell.external_pi_cell_id === candidate.external_pi_cell_id
        && cell.external_pi_cell_hash === candidate.external_pi_cell_hash
        && cell.training_task_spec_id === candidate.training_task_spec_id
        && cell.training_task_spec_hash === candidate.training_task_spec_hash;
    })
    && storedTasks.length === expectedTasks.length
    && storedTasks.every((task, index) => {
      const candidate = expectedTasks[index];
      return candidate !== undefined
        && task.training_task_spec_id === candidate.training_task_spec_id
        && task.external_pi_cell_hash === candidate.external_pi_cell_hash
        && task.task_spec_hash === candidate.task_spec_hash;
    })
    && stored.outbox.event.event_id === expected.outbox.event.event_id
    && stored.outbox.event.payload_hash === expected.outbox.event.payload_hash;
}

function assertInboxMatchesEvent(
  inbox: ExperimentFoundationIntegrationInboxV2,
  event: WorkOrderRevisionAdmittedEventV1 | BranchHeadAdvancedEventV1,
): void {
  if (
    inbox.source_event_id !== event.event_id
    || inbox.business_idempotency_key !== event.business_idempotency_key
    || inbox.payload_hash !== event.payload_hash
    || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(event)
    || !sameJson(inbox.scope, eventScope(event))
  ) {
    throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'EF inbox receipt does not match its source event');
  }
}

function taskSpecSnapshot(
  taskSpec: ExperimentFoundationTrainingTaskSpecV2 | ExperimentFoundationExecutableTrainingTaskSpecV2,
): ExperimentFoundationTrainingTaskSpecSnapshotV2
  | ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2 {
  return 'execution_bundle' in taskSpec ? {
    schema_version: 'v2',
    execution_bundle: taskSpec.execution_bundle,
    command_snapshot: taskSpec.command_snapshot,
    io_snapshot: taskSpec.io_snapshot,
    resource_snapshot: taskSpec.resource_snapshot,
    retry_snapshot: taskSpec.retry_snapshot,
  } : {
    schema_version: STORED_SCHEMA_VERSION_V1,
    command_snapshot: taskSpec.command_snapshot,
    io_snapshot: taskSpec.io_snapshot,
    resource_snapshot: taskSpec.resource_snapshot,
    retry_snapshot: taskSpec.retry_snapshot,
  };
}

function eventScope(event: ExperimentV2IntegrationEvent) {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
  };
}

function relayReadyWhere(claimedAt: Date) {
  return {
    deliveredAt: null,
    relayAttemptCount: { lt: EXPERIMENT_V2_INT32_MAX },
    relayStatus: { in: ['pending', 'leased'] },
    AND: [
      {
        OR: [
          { relayNextAttemptAt: null },
          { relayNextAttemptAt: { lte: claimedAt } },
        ],
      },
      {
        OR: [
          { relayLeaseOwner: null },
          { relayLeaseExpiresAt: { lte: claimedAt } },
        ],
      },
    ],
  } satisfies Prisma.ExperimentFoundationIntegrationOutboxV2WhereInput;
}

function mapEfRelayClaim(row: EfOutboxRow): ExperimentV2RelayClaim {
  if (!row.relayLeaseOwner || !row.relayLeaseExpiresAt) {
    throw constraint('OUTBOX_LEASE_CONFLICT', `EF outbox was not leased: ${row.id}`);
  }
  const event = mapEfOutbox(row).event;
  return {
    owner_domain: 'ExperimentFoundation',
    outbox_id: row.id,
    event,
    relay_attempt_count: row.relayAttemptCount,
    lease_owner: row.relayLeaseOwner,
    lease_expires_at: row.relayLeaseExpiresAt.toISOString(),
  };
}

function encodedEvent(event: ExperimentV2IntegrationEvent) {
  try {
    return encodeExperimentV2EventPayload(event);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function storedEvent(row: EfInboxRow | EfOutboxRow): ExperimentV2IntegrationEvent {
  try {
    return reconstructExperimentV2Event(row);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function storedInboxOutcome(
  row: StoredExperimentV2InboxOutcomeColumns,
): DecodedExperimentV2InboxOutcome {
  try {
    return decodeExperimentV2InboxOutcome(row);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function ordered<T extends { ordinal: number }>(values: T[]): T[] {
  return [...values].sort((left, right) => left.ordinal - right.ordinal);
}

function versionLockDependencyId(versionLockId: string, ordinal: number): string {
  return `${versionLockId}:dependency:${ordinal}`;
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function decodeStoredSnapshot<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw constraint('MATERIALIZATION_KEY_CONFLICT', error.message);
    }
    throw error;
  }
}

function assertStoredSchemaVersion(
  relationalVersion: string,
  snapshotVersion: unknown,
  label: string,
): void {
  if (
    relationalVersion !== snapshotVersion
    || !isStoredMaterializationSchemaVersion(relationalVersion)
  ) {
    throw constraint(
      'MATERIALIZATION_KEY_CONFLICT',
      `${label} schema version must bind exact v1/v2 content`,
    );
  }
}

function isStoredMaterializationSchemaVersion(value: unknown): value is 'v1' | 'v2' {
  return value === STORED_SCHEMA_VERSION_V1 || value === 'v2';
}

function constraint(
  reasonCode: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
  message: string,
): ExperimentSpineV2RepositoryConstraintError {
  return new ExperimentSpineV2RepositoryConstraintError(reasonCode, message);
}

async function assertCycleOpen(client: SpineClient, validationCycleId: string): Promise<void> {
  const closure = await client.paperImplementationValidationCycleClosureV2.findUnique({
    where: { validationCycleId },
    select: { id: true },
  });
  if (closure) {
    throw constraint(
      'CYCLE_ALREADY_CLOSED',
      `ValidationCycle already has an immutable v2 closure: ${validationCycleId}`,
    );
  }
}

function mapEfWriteError(
  error: unknown,
  fallback: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
): Error {
  if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
    return error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(', ')
        : typeof error.meta?.target === 'string'
          ? error.meta.target
          : 'unknown unique target';
      return constraint(
        fallback,
        `EF v2 uniqueness constraint rejected a changed replay (${target})`,
      );
    }
    if (error.code === 'P2003') {
      return constraint(
        'INTEGRATION_PREREQUISITE_NOT_READY',
        'EF v2 transaction prerequisite is not committed',
      );
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
