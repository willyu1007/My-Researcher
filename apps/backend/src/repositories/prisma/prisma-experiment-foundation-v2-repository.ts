import {
  ExperimentFoundationAssetTypeV2,
  Prisma,
  type ExperimentFoundationAssetLifecycleEventV2 as LifecycleEventRow,
  type ExperimentFoundationAssetLifecycleProjectionV2 as LifecycleProjectionRow,
  type ExperimentFoundationBenchmarkRevisionV2 as BenchmarkRevisionRow,
  type ExperimentFoundationBenchmarkV2 as BenchmarkRow,
  type ExperimentFoundationDataPolicyRevisionV2 as DataPolicyRevisionRow,
  type ExperimentFoundationDataPolicyV2 as DataPolicyRow,
  type ExperimentFoundationDatasetRevisionV2 as DatasetRevisionRow,
  type ExperimentFoundationDatasetV2 as DatasetRow,
  type ExperimentFoundationEvaluationProtocolRevisionV2 as EvaluationProtocolRevisionRow,
  type ExperimentFoundationEvaluationProtocolMetricDependencyV2 as EvaluationProtocolMetricDependencyRow,
  type ExperimentFoundationEvaluationProtocolV2 as EvaluationProtocolRow,
  type ExperimentFoundationMetricDefinitionRevisionV2 as MetricDefinitionRevisionRow,
  type ExperimentFoundationMetricDefinitionV2 as MetricDefinitionRow,
  type ExperimentFoundationReadinessAttestationV2 as ReadinessAttestationRow,
  type ExperimentFoundationReadinessDependencyV2 as ReadinessDependencyRow,
  type PrismaClient,
} from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES,
  EXPERIMENT_FOUNDATION_V2_LIFECYCLE_STATUSES,
  EXPERIMENT_FOUNDATION_V2_READINESS_STATUSES,
  type ExperimentFoundationAssetLifecycleEventV2,
  type ExperimentFoundationAssetLifecycleProjectionV2,
  type ExperimentFoundationBenchmarkRevisionV2,
  type ExperimentFoundationBenchmarkV2,
  type ExperimentFoundationDataPolicyRevisionV2,
  type ExperimentFoundationDataPolicyV2,
  type ExperimentFoundationDatasetRevisionV2,
  type ExperimentFoundationDatasetV2,
  type ExperimentFoundationEvaluationProtocolRevisionV2,
  type ExperimentFoundationEvaluationProtocolV2,
  type ExperimentFoundationMetricDefinitionRevisionV2,
  type ExperimentFoundationMetricDefinitionV2,
  type ExperimentFoundationReadinessAttestationV2,
  type ExperimentFoundationReadinessDependencyV2,
  type ExperimentFoundationV2AssetType,
  type ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationV2RepositoryConstraintError,
  type ExperimentFoundationV2AssetIdentityRecord,
  type ExperimentFoundationV2AssetRevisionRecord,
  type ExperimentFoundationV2FreezeReplayRecord,
  type ExperimentFoundationV2ReadinessIdentity,
  type ExperimentFoundationV2ReadinessScope,
  type ExperimentFoundationV2Repository,
  type ExperimentFoundationV2UnitOfWork,
} from '../experiment-foundation-v2.repository.js';
import {
  ExperimentFoundationPromotionV2RepositoryConstraintError,
  type ExperimentFoundationPreparationCandidateV2Record,
  type ExperimentFoundationPromotionCommandReceiptV2Record,
  type ExperimentFoundationPromotionDecisionV2Record,
  type ExperimentFoundationPromotionOutboxV2Record,
  type ExperimentFoundationPromotionV2Repository,
  type ExperimentFoundationPromotionV2UnitOfWork,
} from '../experiment-foundation-promotion-v2.repository.js';
import {
  assertStoredExperimentFoundationV2AssetDraftIntegrity,
  assertStoredExperimentFoundationV2AssetIdentityIntegrity,
  assertStoredExperimentFoundationV2AssetRevisionIntegrity,
  assertStoredExperimentFoundationV2ReadinessIntegrity,
  StoredExperimentFoundationV2SnapshotIntegrityError,
} from '../experiment-foundation-v2-stored-snapshot-integrity.js';

const SERVER_ACTOR_TYPE = 'server';
const STORED_SCHEMA_VERSION_V1 = 'v1';

type TransactionClient = Prisma.TransactionClient;

export class PrismaExperimentFoundationV2Repository
implements ExperimentFoundationV2Repository, ExperimentFoundationPromotionV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      const unitOfWork = new PrismaExperimentFoundationV2UnitOfWork(transaction);
      const result = await operation(unitOfWork);
      unitOfWork.assertNoPendingFreezeReplay();
      return result;
    });
  }

  async runPromotionInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationPromotionV2UnitOfWork) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (transaction) => {
      const unitOfWork = new PrismaExperimentFoundationV2UnitOfWork(transaction);
      const result = await operation(unitOfWork);
      unitOfWork.assertNoPendingFreezeReplay();
      return result;
    });
  }
}

class PrismaExperimentFoundationV2UnitOfWork
implements ExperimentFoundationV2UnitOfWork, ExperimentFoundationPromotionV2UnitOfWork {
  private readonly pendingFreezeRevisions = new Set<string>();
  private readonly readinessDependencyCache = new Map<
    string,
    ExperimentFoundationReadinessDependencyV2[]
  >();

  constructor(private readonly transaction: TransactionClient) {}

  assertNoPendingFreezeReplay(): void {
    const [pending] = this.pendingFreezeRevisions;
    if (pending) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'FREEZE_IDEMPOTENCY_CONFLICT',
        `Immutable revision cannot commit before its freeze replay is bound: ${pending}`,
      );
    }
  }

  bindPromotionCanonicalRevision(
    assetType: ExperimentFoundationV2AssetType,
    revisionId: string,
  ): void {
    this.pendingFreezeRevisions.delete(freezeRevisionKey(assetType, revisionId));
  }

  async lockPreparationCandidate(candidateId: string, candidateRevision: number): Promise<void> {
    const rows = await this.transaction.$queryRaw<Array<{ locked: number }>>`
      SELECT 1::int AS locked
      FROM (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`${candidateId}:${candidateRevision}`}, 0)
        )
      ) AS acquired
    `;
    if (rows.length !== 1 || rows[0]?.locked !== 1) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_CANDIDATE_CONFLICT',
        `Unable to acquire promotion Candidate lock: ${candidateId}:${candidateRevision}`,
      );
    }
  }

  async findAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord | null> {
    switch (assetType) {
      case 'Dataset': {
        const row = await this.transaction.experimentFoundationDatasetV2.findUnique({
          where: { id: logicalId },
        });
        return row ? { asset_type: assetType, asset: mapDataset(row) } : null;
      }
      case 'DataPolicy': {
        const row = await this.transaction.experimentFoundationDataPolicyV2.findUnique({
          where: { id: logicalId },
        });
        return row ? { asset_type: assetType, asset: mapDataPolicy(row) } : null;
      }
      case 'MetricDefinition': {
        const row = await this.transaction.experimentFoundationMetricDefinitionV2.findUnique({
          where: { id: logicalId },
        });
        return row ? { asset_type: assetType, asset: mapMetricDefinition(row) } : null;
      }
      case 'Benchmark': {
        const row = await this.transaction.experimentFoundationBenchmarkV2.findUnique({
          where: { id: logicalId },
        });
        return row ? { asset_type: assetType, asset: mapBenchmark(row) } : null;
      }
      case 'EvaluationProtocol': {
        const row = await this.transaction.experimentFoundationEvaluationProtocolV2.findUnique({
          where: { id: logicalId },
        });
        return row ? { asset_type: assetType, asset: mapEvaluationProtocol(row) } : null;
      }
    }
  }

  async insertAssetIdentity(record: ExperimentFoundationV2AssetIdentityRecord): Promise<void> {
    try {
      assertAssetIdentityIntegrity(record);
      assertAssetIdentityKeyMatchesDraft(record);
      if (await findAssetIdentityByFamilyKey(this.transaction, record)) {
        throw new ExperimentFoundationV2RepositoryConstraintError(
          'ASSET_IDENTITY_CONFLICT',
          `Asset semantic family key already exists: ${record.asset_type}:${assetIdentityFamilyKey(record)}`,
        );
      }
      switch (record.asset_type) {
        case 'Dataset':
          await this.transaction.experimentFoundationDatasetV2.create({
            data: datasetIdentityCreateData(record.asset),
          });
          return;
        case 'DataPolicy':
          await this.transaction.experimentFoundationDataPolicyV2.create({
            data: dataPolicyIdentityCreateData(record.asset),
          });
          return;
        case 'MetricDefinition':
          await this.transaction.experimentFoundationMetricDefinitionV2.create({
            data: metricDefinitionIdentityCreateData(record.asset),
          });
          return;
        case 'Benchmark':
          await this.transaction.experimentFoundationBenchmarkV2.create({
            data: benchmarkIdentityCreateData(record.asset),
          });
          return;
        case 'EvaluationProtocol':
          await this.transaction.experimentFoundationEvaluationProtocolV2.create({
            data: evaluationProtocolIdentityCreateData(record.asset),
          });
          return;
      }
    } catch (error) {
      throw mapFoundationConstraint(
        error,
        'ASSET_IDENTITY_CONFLICT',
        `Asset identity already exists: ${record.asset_type}:${record.asset.logical_id}`,
      );
    }
  }

  async compareAndSwapAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationV2AssetIdentityRecord,
  ): Promise<boolean> {
    if (next.asset_type !== assetType || next.asset.logical_id !== logicalId) {
      return false;
    }

    try {
      assertAssetIdentityIntegrity(next);
      assertAssetIdentityKeyMatchesDraft(next);
      const current = await this.findAssetIdentity(assetType, logicalId);
      if (!current) {
        return false;
      }
      if (assetIdentityFamilyKey(current) !== assetIdentityFamilyKey(next)) {
        throw new ExperimentFoundationV2RepositoryConstraintError(
          'ASSET_IDENTITY_CONFLICT',
          `Asset semantic family key cannot be renamed: ${assetType}:${logicalId}`,
        );
      }
      switch (assetType) {
        case 'Dataset':
          return (await this.transaction.experimentFoundationDatasetV2.updateMany({
            where: {
              id: logicalId,
              datasetKey: (next.asset as ExperimentFoundationDatasetV2).dataset_key,
              draftStateVersion: expectedStateVersion,
            },
            data: datasetIdentityUpdateData(
              next.asset as ExperimentFoundationDatasetV2,
            ),
          })).count === 1;
        case 'DataPolicy':
          return (await this.transaction.experimentFoundationDataPolicyV2.updateMany({
            where: {
              id: logicalId,
              dataPolicyKey: (next.asset as ExperimentFoundationDataPolicyV2).policy_key,
              draftStateVersion: expectedStateVersion,
            },
            data: dataPolicyIdentityUpdateData(
              next.asset as ExperimentFoundationDataPolicyV2,
            ),
          })).count === 1;
        case 'MetricDefinition':
          return (await this.transaction.experimentFoundationMetricDefinitionV2.updateMany({
            where: {
              id: logicalId,
              metricDefinitionKey: (
                next.asset as ExperimentFoundationMetricDefinitionV2
              ).metric_key,
              draftStateVersion: expectedStateVersion,
            },
            data: metricDefinitionIdentityUpdateData(
              next.asset as ExperimentFoundationMetricDefinitionV2,
            ),
          })).count === 1;
        case 'Benchmark':
          return (await this.transaction.experimentFoundationBenchmarkV2.updateMany({
            where: {
              id: logicalId,
              benchmarkKey: (next.asset as ExperimentFoundationBenchmarkV2).benchmark_key,
              draftStateVersion: expectedStateVersion,
            },
            data: benchmarkIdentityUpdateData(
              next.asset as ExperimentFoundationBenchmarkV2,
            ),
          })).count === 1;
        case 'EvaluationProtocol':
          return (await this.transaction.experimentFoundationEvaluationProtocolV2.updateMany({
            where: {
              id: logicalId,
              evaluationProtocolKey: (
                next.asset as ExperimentFoundationEvaluationProtocolV2
              ).protocol_key,
              draftStateVersion: expectedStateVersion,
            },
            data: evaluationProtocolIdentityUpdateData(
              next.asset as ExperimentFoundationEvaluationProtocolV2,
            ),
          })).count === 1;
      }
    } catch (error) {
      throw mapFoundationConstraint(
        error,
        'ASSET_IDENTITY_CONFLICT',
        `Asset identity update conflicts with immutable history: ${assetType}:${logicalId}`,
      );
    }
  }

  async findAssetRevisionById(
    assetType: ExperimentFoundationV2AssetType,
    revisionId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null> {
    switch (assetType) {
      case 'Dataset': {
        const row = await this.transaction.experimentFoundationDatasetRevisionV2.findUnique({
          where: { id: revisionId },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapDatasetRevision(this.transaction, row),
        } : null;
      }
      case 'DataPolicy': {
        const row = await this.transaction.experimentFoundationDataPolicyRevisionV2.findUnique({
          where: { id: revisionId },
        });
        return row ? { asset_type: assetType, revision: mapDataPolicyRevision(row) } : null;
      }
      case 'MetricDefinition': {
        const row = await this.transaction.experimentFoundationMetricDefinitionRevisionV2.findUnique({
          where: { id: revisionId },
        });
        return row ? { asset_type: assetType, revision: mapMetricDefinitionRevision(row) } : null;
      }
      case 'Benchmark': {
        const row = await this.transaction.experimentFoundationBenchmarkRevisionV2.findUnique({
          where: { id: revisionId },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapBenchmarkRevision(this.transaction, row),
        } : null;
      }
      case 'EvaluationProtocol': {
        const row = await this.transaction.experimentFoundationEvaluationProtocolRevisionV2.findUnique({
          where: { id: revisionId },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapEvaluationProtocolRevision(this.transaction, row),
        } : null;
      }
    }
  }

  async findAssetRevisionByContentHash(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null> {
    switch (assetType) {
      case 'Dataset': {
        const row = await this.transaction.experimentFoundationDatasetRevisionV2.findFirst({
          where: { datasetId: logicalId, contentHash },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapDatasetRevision(this.transaction, row),
        } : null;
      }
      case 'DataPolicy': {
        const row = await this.transaction.experimentFoundationDataPolicyRevisionV2.findFirst({
          where: { dataPolicyId: logicalId, contentHash },
        });
        return row ? { asset_type: assetType, revision: mapDataPolicyRevision(row) } : null;
      }
      case 'MetricDefinition': {
        const row = await this.transaction.experimentFoundationMetricDefinitionRevisionV2.findFirst({
          where: { metricDefinitionId: logicalId, contentHash },
        });
        return row ? { asset_type: assetType, revision: mapMetricDefinitionRevision(row) } : null;
      }
      case 'Benchmark': {
        const row = await this.transaction.experimentFoundationBenchmarkRevisionV2.findFirst({
          where: { benchmarkId: logicalId, contentHash },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapBenchmarkRevision(this.transaction, row),
        } : null;
      }
      case 'EvaluationProtocol': {
        const row = await this.transaction.experimentFoundationEvaluationProtocolRevisionV2.findFirst({
          where: { evaluationProtocolId: logicalId, contentHash },
        });
        return row ? {
          asset_type: assetType,
          revision: await mapEvaluationProtocolRevision(this.transaction, row),
        } : null;
      }
    }
  }

  async listAssetRevisions(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord[]> {
    switch (assetType) {
      case 'Dataset': {
        const rows = await this.transaction.experimentFoundationDatasetRevisionV2.findMany({
          where: { datasetId: logicalId }, orderBy: { revisionSequence: 'asc' },
        });
        const policies = await this.transaction.experimentFoundationDataPolicyRevisionV2.findMany({
          where: { id: { in: rows.map((row) => row.dataPolicyRevisionId) } },
        });
        const policyById = new Map(policies.map((row) => [row.id, row]));
        return Promise.all(rows.map(async (row) => ({
          asset_type: assetType,
          revision: await mapDatasetRevision(
            this.transaction,
            row,
            policyById.get(row.dataPolicyRevisionId) ?? null,
          ),
        })));
      }
      case 'DataPolicy':
        return (await this.transaction.experimentFoundationDataPolicyRevisionV2.findMany({
          where: { dataPolicyId: logicalId }, orderBy: { revisionSequence: 'asc' },
        })).map((row) => ({ asset_type: assetType, revision: mapDataPolicyRevision(row) }));
      case 'MetricDefinition':
        return (await this.transaction.experimentFoundationMetricDefinitionRevisionV2.findMany({
          where: { metricDefinitionId: logicalId }, orderBy: { revisionSequence: 'asc' },
        })).map((row) => ({ asset_type: assetType, revision: mapMetricDefinitionRevision(row) }));
      case 'Benchmark': {
        const rows = await this.transaction.experimentFoundationBenchmarkRevisionV2.findMany({
          where: { benchmarkId: logicalId }, orderBy: { revisionSequence: 'asc' },
        });
        const datasetIds = rows.flatMap((row) => [
          row.corpusDatasetRevisionId,
          row.queryDatasetRevisionId,
        ]);
        const datasets = await this.transaction.experimentFoundationDatasetRevisionV2.findMany({
          where: { id: { in: datasetIds } },
        });
        const datasetById = new Map(datasets.map((row) => [row.id, row]));
        return Promise.all(rows.map(async (row) => ({
          asset_type: assetType,
          revision: await mapBenchmarkRevision(this.transaction, row, {
            corpus: datasetById.get(row.corpusDatasetRevisionId) ?? null,
            query: datasetById.get(row.queryDatasetRevisionId) ?? null,
          }),
        })));
      }
      case 'EvaluationProtocol': {
        const rows = await this.transaction.experimentFoundationEvaluationProtocolRevisionV2.findMany({
          where: { evaluationProtocolId: logicalId }, orderBy: { revisionSequence: 'asc' },
        });
        const [dependencyRows, benchmarkRows] = await Promise.all([
          this.transaction.experimentFoundationEvaluationProtocolMetricDependencyV2.findMany({
            where: { evaluationProtocolRevisionId: { in: rows.map((row) => row.id) } },
            orderBy: [{ evaluationProtocolRevisionId: 'asc' }, { ordinal: 'asc' }],
          }),
          this.transaction.experimentFoundationBenchmarkRevisionV2.findMany({
            where: { id: { in: rows.map((row) => row.benchmarkRevisionId) } },
          }),
        ]);
        const dependenciesByRevision = new Map<string, EvaluationProtocolMetricDependencyRow[]>();
        for (const dependency of dependencyRows) {
          const grouped = dependenciesByRevision.get(dependency.evaluationProtocolRevisionId) ?? [];
          grouped.push(dependency);
          dependenciesByRevision.set(dependency.evaluationProtocolRevisionId, grouped);
        }
        const benchmarkById = new Map(benchmarkRows.map((row) => [row.id, row]));
        return Promise.all(rows.map(async (row) => ({
          asset_type: assetType,
          revision: await mapEvaluationProtocolRevision(this.transaction, row, {
            metricDependencies: dependenciesByRevision.get(row.id) ?? [],
            benchmark: benchmarkById.get(row.benchmarkRevisionId) ?? null,
          }),
        })));
      }
    }
  }

  async insertAssetRevision(record: ExperimentFoundationV2AssetRevisionRecord): Promise<void> {
    try {
      assertAssetRevisionIntegrity(record);
      switch (record.asset_type) {
        case 'Dataset':
          await this.transaction.experimentFoundationDatasetRevisionV2.create({
            data: datasetRevisionCreateData(record.revision),
          });
          break;
        case 'DataPolicy':
          await this.transaction.experimentFoundationDataPolicyRevisionV2.create({
            data: dataPolicyRevisionCreateData(record.revision),
          });
          break;
        case 'MetricDefinition':
          await this.transaction.experimentFoundationMetricDefinitionRevisionV2.create({
            data: metricDefinitionRevisionCreateData(record.revision),
          });
          break;
        case 'Benchmark':
          await this.transaction.experimentFoundationBenchmarkRevisionV2.create({
            data: benchmarkRevisionCreateData(record.revision),
          });
          break;
        case 'EvaluationProtocol':
          await this.transaction.experimentFoundationEvaluationProtocolRevisionV2.create({
            data: evaluationProtocolRevisionCreateData(record.revision),
          });
          await this.transaction.experimentFoundationEvaluationProtocolMetricDependencyV2.createMany({
            data: evaluationProtocolMetricDependencyCreateData(record.revision),
          });
          break;
      }
      this.pendingFreezeRevisions.add(freezeRevisionKey(
        record.asset_type,
        record.revision.revision_id,
      ));
    } catch (error) {
      throw mapFoundationConstraint(
        error,
        'ASSET_REVISION_CONFLICT',
        `Asset revision conflicts with immutable history: ${record.asset_type}:${record.revision.revision_id}`,
      );
    }
  }

  async findFreezeReplay(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationV2FreezeReplayRecord | null> {
    const row = await findFreezeRevision(
      this.transaction,
      assetType,
      logicalId,
      businessIdempotencyKey,
    );
    return row ? {
      asset_type: assetType,
      logical_id: logicalId,
      business_idempotency_key: businessIdempotencyKey,
      content_hash: row.contentHash,
      revision_id: row.id,
    } : null;
  }

  async insertFreezeReplay(record: ExperimentFoundationV2FreezeReplayRecord): Promise<void> {
    const existing = await this.findFreezeReplay(
      record.asset_type,
      record.logical_id,
      record.business_idempotency_key,
    );
    if (existing) {
      if (
        existing.revision_id === record.revision_id
        && existing.content_hash === record.content_hash
      ) {
        return;
      }
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'FREEZE_IDEMPOTENCY_CONFLICT',
        `Freeze business key was reused with changed content: ${record.asset_type}:${record.logical_id}`,
      );
    }

    const revision = await this.findAssetRevisionById(record.asset_type, record.revision_id);
    if (
      !revision
      || revision.revision.logical_id !== record.logical_id
      || revision.revision.content_hash !== record.content_hash
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'FREEZE_IDEMPOTENCY_CONFLICT',
        `Freeze replay does not match its exact immutable revision: ${record.revision_id}`,
      );
    }

    try {
      await createFreezeCommandReceipt(this.transaction, record);
      this.pendingFreezeRevisions.delete(freezeRevisionKey(
        record.asset_type,
        record.revision_id,
      ));
    } catch (error) {
      if (error instanceof ExperimentFoundationV2RepositoryConstraintError) {
        throw error;
      }
      throw mapFoundationConstraint(
        error,
        'FREEZE_IDEMPOTENCY_CONFLICT',
        `Freeze business key conflicts with an immutable revision: ${record.business_idempotency_key}`,
      );
    }
  }

  async listLifecycleEvents(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleEventV2[]> {
    const rows = await this.transaction.experimentFoundationAssetLifecycleEventV2.findMany({
      where: {
        assetType: toPrismaAssetType(asset.asset_type),
        assetId: asset.logical_id,
        assetRevisionId: asset.revision_id,
        assetRevisionSequence: asset.revision_sequence,
        assetRevisionHash: asset.content_hash,
      },
      orderBy: { eventSequence: 'asc' },
    });
    return rows.map(mapLifecycleEvent);
  }

  async findLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleProjectionV2 | null> {
    const row = await this.transaction.experimentFoundationAssetLifecycleProjectionV2.findFirst({
      where: {
        assetType: toPrismaAssetType(asset.asset_type),
        assetId: asset.logical_id,
        currentRevisionId: asset.revision_id,
        currentRevisionSequence: asset.revision_sequence,
        currentRevisionHash: asset.content_hash,
      },
    });
    return row ? mapLifecycleProjection(row) : null;
  }

  async appendLifecycleEvent(event: ExperimentFoundationAssetLifecycleEventV2): Promise<void> {
    try {
      await this.transaction.experimentFoundationAssetLifecycleEventV2.create({
        data: {
          id: event.lifecycle_event_id,
          assetType: toPrismaAssetType(event.asset.asset_type),
          assetId: event.asset.logical_id,
          assetRevisionId: event.asset.revision_id,
          assetRevisionSequence: event.asset.revision_sequence,
          assetRevisionHash: event.asset.content_hash,
          eventSequence: event.lifecycle_sequence,
          eventType: event.event_type,
          eventSchemaVersion: STORED_SCHEMA_VERSION_V1,
          reasonCode: event.reason_code,
          note: event.note,
          actorType: SERVER_ACTOR_TYPE,
          actorId: null,
          occurredAt: new Date(event.occurred_at),
        },
      });
    } catch (error) {
      throw mapFoundationConstraint(
        error,
        'LIFECYCLE_EVENT_CONFLICT',
        `Lifecycle event conflicts with immutable history: ${event.lifecycle_event_id}`,
      );
    }
  }

  async compareAndSwapLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
    expectedStateVersion: number | null,
    next: ExperimentFoundationAssetLifecycleProjectionV2,
  ): Promise<boolean> {
    if (!sameExactRef(asset, next.asset)) {
      return false;
    }

    if (expectedStateVersion === null) {
      try {
        await this.transaction.experimentFoundationAssetLifecycleProjectionV2.create({
          data: lifecycleProjectionCreateData(next),
        });
        return true;
      } catch (error) {
        if (isUniqueConstraint(error)) {
          return false;
        }
        throw error;
      }
    }

    const result = await this.transaction.experimentFoundationAssetLifecycleProjectionV2.updateMany({
      where: {
        assetType: toPrismaAssetType(asset.asset_type),
        assetId: asset.logical_id,
        currentRevisionId: asset.revision_id,
        currentRevisionSequence: asset.revision_sequence,
        currentRevisionHash: asset.content_hash,
        stateVersion: expectedStateVersion,
      },
      data: lifecycleProjectionUpdateData(next),
    });
    return result.count === 1;
  }

  async findReadinessAttestation(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    const row = await this.transaction.experimentFoundationReadinessAttestationV2.findUnique({
      where: { id: readinessAttestationId },
    });
    return row ? this.mapAndCacheReadinessAttestation(row) : null;
  }

  async findReadinessAttestationByIdentity(
    identity: ExperimentFoundationV2ReadinessIdentity,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    const row = await this.transaction.experimentFoundationReadinessAttestationV2.findFirst({
      where: {
        ...readinessScopeWhere(identity),
        attestationHash: identity.attestation_hash,
      },
    });
    return row ? this.mapAndCacheReadinessAttestation(row) : null;
  }

  async findPassedReadinessAttestationForExactScope(
    scope: ExperimentFoundationV2ReadinessScope,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null> {
    const row = await this.transaction.experimentFoundationReadinessAttestationV2.findFirst({
      where: { ...readinessScopeWhere(scope), outcome: 'passed' },
      orderBy: [{ attestedAt: 'desc' }, { id: 'desc' }],
    });
    return row ? this.mapAndCacheReadinessAttestation(row) : null;
  }

  async listReadinessDependencies(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessDependencyV2[]> {
    const cached = this.readinessDependencyCache.get(readinessAttestationId);
    if (cached) {
      return cloneReadinessDependencies(cached);
    }
    const [attestation, rows] = await Promise.all([
      this.transaction.experimentFoundationReadinessAttestationV2.findUnique({
        where: { id: readinessAttestationId },
      }),
      this.transaction.experimentFoundationReadinessDependencyV2.findMany({
        where: { attestationId: readinessAttestationId },
        orderBy: { ordinal: 'asc' },
      }),
    ]);
    if (!attestation) {
      if (rows.length > 0) {
        throw new ExperimentFoundationV2RepositoryConstraintError(
          'READINESS_DEPENDENCY_CONFLICT',
          `Readiness dependencies have no owning attestation: ${readinessAttestationId}`,
        );
      }
      return [];
    }
    await mapReadinessAttestation(this.transaction, attestation, rows);
    const mapped = rows.map(mapReadinessDependency);
    this.readinessDependencyCache.set(readinessAttestationId, mapped);
    return cloneReadinessDependencies(mapped);
  }

  private async mapAndCacheReadinessAttestation(
    row: ReadinessAttestationRow,
  ): Promise<ExperimentFoundationReadinessAttestationV2> {
    const dependencyRows = await this.transaction.experimentFoundationReadinessDependencyV2
      .findMany({
        where: { attestationId: row.id },
        orderBy: { ordinal: 'asc' },
      });
    const mapped = await mapReadinessAttestation(this.transaction, row, dependencyRows);
    this.readinessDependencyCache.set(row.id, dependencyRows.map(mapReadinessDependency));
    return mapped;
  }

  async insertReadinessAttestation(
    attestation: ExperimentFoundationReadinessAttestationV2,
    dependencies: ExperimentFoundationReadinessDependencyV2[],
  ): Promise<void> {
    assertOrderedReadinessDependencies(attestation.readiness_attestation_id, dependencies);
    assertReadinessIntegrity(attestation, dependencies);
    try {
      await this.transaction.experimentFoundationReadinessAttestationV2.create({
        data: {
          id: attestation.readiness_attestation_id,
          targetAssetType: toPrismaAssetType(attestation.target.asset_type),
          targetAssetId: attestation.target.logical_id,
          targetRevisionId: attestation.target.revision_id,
          targetRevisionSequence: attestation.target.revision_sequence,
          targetRevisionHash: attestation.target.content_hash,
          evaluatorProfileVersion: attestation.evaluator_profile_version,
          evaluatorProfileHash: attestation.evaluator_profile_hash,
          dependencyManifestHash: attestation.dependency_manifest_hash,
          outcome: attestation.status,
          qualificationSnapshotJson: toInputJson(attestation.qualification_snapshot),
          blockerSnapshotJson: toInputJson(attestation.blockers),
          attestationHash: attestation.attestation_hash,
          attestedAt: new Date(attestation.created_at),
        },
      });
    } catch (error) {
      throw mapFoundationConstraint(
        error,
        'READINESS_ATTESTATION_CONFLICT',
        `Readiness attestation conflicts with exact history: ${attestation.readiness_attestation_id}`,
      );
    }

    if (dependencies.length > 0) {
      try {
        await this.transaction.experimentFoundationReadinessDependencyV2.createMany({
          data: dependencies.map((dependency) => ({
            id: readinessDependencyId(dependency.readiness_attestation_id, dependency.ordinal),
            attestationId: dependency.readiness_attestation_id,
            ordinal: dependency.ordinal,
            dependencyRole: dependency.dependency.asset_type,
            dependencyAssetType: toPrismaAssetType(dependency.dependency.asset_type),
            dependencyAssetId: dependency.dependency.logical_id,
            dependencyRevisionId: dependency.dependency.revision_id,
            dependencyRevisionSequence: dependency.dependency.revision_sequence,
            dependencyRevisionHash: dependency.dependency.content_hash,
          })),
        });
      } catch (error) {
        throw mapFoundationConstraint(
          error,
          'READINESS_DEPENDENCY_CONFLICT',
          `Readiness dependencies conflict with exact history: ${attestation.readiness_attestation_id}`,
        );
      }
    }
  }

  async findPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPreparationCandidateV2Record | null> {
    const row = await this.transaction.experimentFoundationPreparationCandidateV2.findFirst({
      where: { id: candidateId, candidateRevision },
    });
    if (!row) return null;
    const assetType = fromPrismaAssetType(row.assetType);
    const canonicalRevision = row.canonicalRevisionId
      ? await this.findAssetRevisionById(assetType, row.canonicalRevisionId)
      : null;
    if (
      (row.canonicalRevisionId && !canonicalRevision)
      || (canonicalRevision && canonicalRevision.revision.content_hash !== row.canonicalRevisionHash)
    ) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_CANDIDATE_CONFLICT',
        `Preparation candidate canonical ref has drifted: ${candidateId}:${candidateRevision}`,
      );
    }
    if (row.status !== 'pending' && row.status !== 'promoted' && row.status !== 'rejected') {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_CANDIDATE_CONFLICT',
        `Unsupported preparation candidate status: ${row.status}`,
      );
    }
    const candidateSnapshot = fromJson(row.candidateSnapshotJson);
    assertStoredExperimentFoundationV2AssetDraftIntegrity(
      assetType,
      candidateSnapshot,
      `Preparation Candidate ${candidateId}:${candidateRevision}`,
    );
    const expectedContentHash = serverHashExperimentV2SemanticContent({
      record_kind: `ExperimentFoundation${assetType}RevisionV2`,
      schema_version: row.contentSchemaVersion,
      hash_profile: 'ef-asset-semantic-json@v1',
      content: candidateSnapshot,
    });
    if (expectedContentHash !== row.contentHash) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_CANDIDATE_CONFLICT',
        `Preparation candidate canonical hash has drifted: ${candidateId}:${candidateRevision}`,
      );
    }
    return {
      candidate: {
        candidate_id: row.id,
        candidate_revision: row.candidateRevision,
        asset_type: assetType,
        logical_id: row.assetLogicalId,
        content_hash: row.contentHash,
        status: row.status,
        canonical_revision: canonicalRevision ? exactRefFromRecord(canonicalRevision) : null,
        created_at: row.createdAt.toISOString(),
        updated_at: row.updatedAt.toISOString(),
      },
      content_schema_version: row.contentSchemaVersion,
      candidate_snapshot: candidateSnapshot,
      state_version: row.stateVersion,
    };
  }

  async insertPreparationCandidate(
    record: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<void> {
    try {
      await this.transaction.experimentFoundationPreparationCandidateV2.create({
        data: {
          id: record.candidate.candidate_id,
          candidateRevision: record.candidate.candidate_revision,
          assetType: toPrismaAssetType(record.candidate.asset_type),
          assetLogicalId: record.candidate.logical_id,
          contentSchemaVersion: record.content_schema_version,
          candidateSnapshotJson: toInputJson(record.candidate_snapshot),
          contentHash: record.candidate.content_hash,
          status: record.candidate.status,
          stateVersion: record.state_version,
          canonicalRevisionId: record.candidate.canonical_revision?.revision_id ?? null,
          canonicalRevisionHash: record.candidate.canonical_revision?.content_hash ?? null,
          createdAt: new Date(record.candidate.created_at),
          updatedAt: new Date(record.candidate.updated_at),
        },
      });
    } catch (error) {
      throw mapPromotionConstraint(
        error,
        'PROMOTION_CANDIDATE_CONFLICT',
        `Preparation candidate already exists: ${record.candidate.candidate_id}`,
      );
    }
  }

  async compareAndSwapPreparationCandidate(
    candidateId: string,
    candidateRevision: number,
    expectedStateVersion: number,
    next: ExperimentFoundationPreparationCandidateV2Record,
  ): Promise<boolean> {
    try {
      return (await this.transaction.experimentFoundationPreparationCandidateV2.updateMany({
        where: {
          id: candidateId,
          candidateRevision,
          stateVersion: expectedStateVersion,
        },
        data: {
          status: next.candidate.status,
          stateVersion: next.state_version,
          canonicalRevisionId: next.candidate.canonical_revision?.revision_id ?? null,
          canonicalRevisionHash: next.candidate.canonical_revision?.content_hash ?? null,
          updatedAt: new Date(next.candidate.updated_at),
        },
      })).count === 1;
    } catch (error) {
      throw mapPromotionConstraint(
        error,
        'PROMOTION_CANDIDATE_CONFLICT',
        `Preparation candidate state conflicts: ${candidateId}:${candidateRevision}`,
      );
    }
  }

  async findPromotionDecisionByCandidate(
    candidateId: string,
    candidateRevision: number,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null> {
    const row = await this.transaction.experimentFoundationPromotionDecisionV2.findFirst({
      where: { candidateId, candidateRevision },
    });
    return row ? this.mapPromotionDecision(row.id) : null;
  }

  async findPromotionDecisionById(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null> {
    return this.mapPromotionDecision(promotionDecisionId);
  }

  private async mapPromotionDecision(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionDecisionV2Record | null> {
    const row = await this.transaction.experimentFoundationPromotionDecisionV2.findUnique({
      where: { id: promotionDecisionId },
    });
    if (!row) return null;
    const candidate = await this.findPreparationCandidate(row.candidateId, row.candidateRevision);
    if (!candidate) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_DECISION_CONFLICT',
        `Promotion decision has no exact candidate: ${row.id}`,
      );
    }
    if (row.decision !== 'promote' && row.decision !== 'reject') {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_DECISION_CONFLICT',
        `Unsupported promotion decision: ${row.decision}`,
      );
    }
    if (
      row.canonicalizationOutcome !== null
      && row.canonicalizationOutcome !== 'created'
      && row.canonicalizationOutcome !== 'reused'
    ) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_DECISION_CONFLICT',
        `Unsupported canonicalization outcome: ${row.canonicalizationOutcome}`,
      );
    }
    const canonical = candidate.candidate.canonical_revision;
    if (
      row.candidateContentHash !== candidate.candidate.content_hash
      || row.canonicalRevisionId !== (canonical?.revision_id ?? null)
      || row.canonicalRevisionHash !== (canonical?.content_hash ?? null)
    ) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_DECISION_CONFLICT',
        `Promotion decision no longer matches its exact Candidate outcome: ${row.id}`,
      );
    }
    return {
      decision: {
        promotion_decision_id: row.id,
        candidate_id: row.candidateId,
        candidate_revision: row.candidateRevision,
        decision: row.decision,
        canonicalization_outcome: row.canonicalizationOutcome,
        canonical_revision: candidate.candidate.canonical_revision,
        decided_at: row.decidedAt.toISOString(),
      },
      candidate_content_hash: row.candidateContentHash,
      command_hash: row.commandHash,
    };
  }

  async insertPromotionDecision(record: ExperimentFoundationPromotionDecisionV2Record): Promise<void> {
    try {
      await this.transaction.experimentFoundationPromotionDecisionV2.create({
        data: {
          id: record.decision.promotion_decision_id,
          candidateId: record.decision.candidate_id,
          candidateRevision: record.decision.candidate_revision,
          candidateContentHash: record.candidate_content_hash,
          decision: record.decision.decision,
          canonicalizationOutcome: record.decision.canonicalization_outcome,
          canonicalRevisionId: record.decision.canonical_revision?.revision_id ?? null,
          canonicalRevisionHash: record.decision.canonical_revision?.content_hash ?? null,
          commandHash: record.command_hash,
          decidedAt: new Date(record.decision.decided_at),
        },
      });
    } catch (error) {
      throw mapPromotionConstraint(
        error,
        'PROMOTION_DECISION_CONFLICT',
        `Promotion decision already exists: ${record.decision.promotion_decision_id}`,
      );
    }
  }

  async findPromotionCommandReceipt(
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationPromotionCommandReceiptV2Record | null> {
    const row = await this.transaction.experimentFoundationPromotionCommandReceiptV2.findUnique({
      where: { businessIdempotencyKey },
    });
    return row ? {
      receipt_id: row.id,
      business_idempotency_key: row.businessIdempotencyKey,
      command_hash: row.commandHash,
      promotion_decision_id: row.promotionDecisionId,
      created_at: row.createdAt.toISOString(),
    } : null;
  }

  async insertPromotionCommandReceipt(
    record: ExperimentFoundationPromotionCommandReceiptV2Record,
  ): Promise<void> {
    const existing = await this.findPromotionCommandReceipt(record.business_idempotency_key);
    if (existing) {
      if (
        existing.command_hash === record.command_hash
        && existing.promotion_decision_id === record.promotion_decision_id
      ) return;
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_IDEMPOTENCY_CONFLICT',
        `Promotion idempotency key has drifted: ${record.business_idempotency_key}`,
      );
    }
    try {
      await this.transaction.experimentFoundationPromotionCommandReceiptV2.create({
        data: {
          id: record.receipt_id,
          businessIdempotencyKey: record.business_idempotency_key,
          commandHash: record.command_hash,
          promotionDecisionId: record.promotion_decision_id,
          createdAt: new Date(record.created_at),
        },
      });
    } catch (error) {
      throw mapPromotionConstraint(
        error,
        'PROMOTION_IDEMPOTENCY_CONFLICT',
        `Promotion command receipt conflicts: ${record.business_idempotency_key}`,
      );
    }
  }

  async findPromotionOutboxByDecision(
    promotionDecisionId: string,
  ): Promise<ExperimentFoundationPromotionOutboxV2Record | null> {
    const row = await this.transaction.experimentFoundationPromotionOutboxV2.findUnique({
      where: { promotionDecisionId },
    });
    if (!row) return null;
    if (
      row.aggregateType !== 'ExperimentFoundationPreparationCandidateV2'
      || row.transitionKey !== 'terminal-promotion-decision'
      || row.eventType !== 'ExperimentFoundationPreparationCandidatePromotionDecidedV2'
      || row.schemaVersion !== 'v1'
      || row.producerDomain !== 'experiment-foundation'
    ) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_OUTBOX_CONFLICT',
        `Promotion outbox authority fields have drifted: ${row.id}`,
      );
    }
    const eventPayload = fromJson<ExperimentFoundationPromotionOutboxV2Record['event_payload']>(
      row.eventPayloadJson,
    );
    const expectedPayloadHash = serverHashExperimentV2EventPayload(
      row.eventType,
      row.schemaVersion,
      eventPayload,
    );
    const expectedEnvelopeHash = serverHashExperimentV2EventEnvelope({
      event_id: row.eventId,
      event_type: row.eventType,
      schema_version: row.schemaVersion,
      producer_domain: row.producerDomain,
      occurred_at: row.occurredAt.toISOString(),
      correlation_id: row.correlationId,
      causation_id: row.causationId,
      business_idempotency_key: row.businessIdempotencyKey,
      payload_hash: row.payloadHash,
      payload: eventPayload,
    });
    if (row.payloadHash !== expectedPayloadHash || row.eventEnvelopeHash !== expectedEnvelopeHash) {
      throw new ExperimentFoundationPromotionV2RepositoryConstraintError(
        'PROMOTION_OUTBOX_CONFLICT',
        `Promotion outbox canonical hashes have drifted: ${row.id}`,
      );
    }
    return {
      outbox_id: row.id,
      event_id: row.eventId,
      promotion_decision_id: row.promotionDecisionId,
      aggregate_type: 'ExperimentFoundationPreparationCandidateV2',
      aggregate_id: row.aggregateId,
      transition_key: 'terminal-promotion-decision',
      event_type: 'ExperimentFoundationPreparationCandidatePromotionDecidedV2',
      schema_version: 'v1',
      producer_domain: 'experiment-foundation',
      occurred_at: row.occurredAt.toISOString(),
      correlation_id: row.correlationId,
      causation_id: row.causationId,
      business_idempotency_key: row.businessIdempotencyKey,
      event_payload: eventPayload,
      payload_hash: row.payloadHash,
      event_envelope_hash: row.eventEnvelopeHash,
      created_at: row.createdAt.toISOString(),
      updated_at: row.updatedAt.toISOString(),
    };
  }

  async insertPromotionOutbox(record: ExperimentFoundationPromotionOutboxV2Record): Promise<void> {
    try {
      await this.transaction.experimentFoundationPromotionOutboxV2.create({
        data: {
          id: record.outbox_id,
          eventId: record.event_id,
          promotionDecisionId: record.promotion_decision_id,
          aggregateType: record.aggregate_type,
          aggregateId: record.aggregate_id,
          transitionKey: record.transition_key,
          eventType: record.event_type,
          schemaVersion: record.schema_version,
          producerDomain: record.producer_domain,
          occurredAt: new Date(record.occurred_at),
          correlationId: record.correlation_id,
          causationId: record.causation_id,
          businessIdempotencyKey: record.business_idempotency_key,
          eventPayloadJson: toInputJson(record.event_payload),
          payloadHash: record.payload_hash,
          eventEnvelopeHash: record.event_envelope_hash,
          createdAt: new Date(record.created_at),
          updatedAt: new Date(record.updated_at),
        },
      });
    } catch (error) {
      throw mapPromotionConstraint(
        error,
        'PROMOTION_OUTBOX_CONFLICT',
        `Promotion outbox conflicts: ${record.promotion_decision_id}`,
      );
    }
  }
}

async function findAssetIdentityByFamilyKey(
  transaction: TransactionClient,
  record: ExperimentFoundationV2AssetIdentityRecord,
): Promise<boolean> {
  switch (record.asset_type) {
    case 'Dataset':
      return Boolean(await transaction.experimentFoundationDatasetV2.findUnique({
        where: { datasetKey: record.asset.dataset_key },
        select: { id: true },
      }));
    case 'DataPolicy':
      return Boolean(await transaction.experimentFoundationDataPolicyV2.findUnique({
        where: { dataPolicyKey: record.asset.policy_key },
        select: { id: true },
      }));
    case 'MetricDefinition':
      return Boolean(await transaction.experimentFoundationMetricDefinitionV2.findUnique({
        where: { metricDefinitionKey: record.asset.metric_key },
        select: { id: true },
      }));
    case 'Benchmark':
      return Boolean(await transaction.experimentFoundationBenchmarkV2.findUnique({
        where: { benchmarkKey: record.asset.benchmark_key },
        select: { id: true },
      }));
    case 'EvaluationProtocol':
      return Boolean(await transaction.experimentFoundationEvaluationProtocolV2.findUnique({
        where: { evaluationProtocolKey: record.asset.protocol_key },
        select: { id: true },
      }));
  }
}

function assetIdentityFamilyKey(record: ExperimentFoundationV2AssetIdentityRecord): string {
  switch (record.asset_type) {
    case 'Dataset': return record.asset.dataset_key;
    case 'DataPolicy': return record.asset.policy_key;
    case 'MetricDefinition': return record.asset.metric_key;
    case 'Benchmark': return record.asset.benchmark_key;
    case 'EvaluationProtocol': return record.asset.protocol_key;
  }
}

function assertAssetIdentityKeyMatchesDraft(
  record: ExperimentFoundationV2AssetIdentityRecord,
): void {
  switch (record.asset_type) {
    case 'Dataset':
      assertPersistedIdentityKey(
        record.asset_type,
        record.asset.logical_id,
        record.asset.dataset_key,
        record.asset.dataset_draft?.dataset_key,
      );
      return;
    case 'DataPolicy':
      assertPersistedIdentityKey(
        record.asset_type,
        record.asset.logical_id,
        record.asset.policy_key,
        record.asset.data_policy_draft?.policy_key,
      );
      return;
    case 'MetricDefinition':
      assertPersistedIdentityKey(
        record.asset_type,
        record.asset.logical_id,
        record.asset.metric_key,
        record.asset.metric_definition_draft?.metric_key,
      );
      return;
    case 'Benchmark':
      assertPersistedIdentityKey(
        record.asset_type,
        record.asset.logical_id,
        record.asset.benchmark_key,
        record.asset.benchmark_draft?.benchmark_key,
      );
      return;
    case 'EvaluationProtocol':
      assertPersistedIdentityKey(
        record.asset_type,
        record.asset.logical_id,
        record.asset.protocol_key,
        record.asset.evaluation_protocol_draft?.protocol_key,
      );
  }
}

function assertPersistedIdentityKey(
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  relationalKey: unknown,
  draftKey: unknown,
): asserts relationalKey is string {
  if (
    typeof relationalKey !== 'string'
    || relationalKey.length === 0
    || (
      draftKey !== undefined
      && (
        typeof draftKey !== 'string'
        || draftKey.length === 0
        || relationalKey !== draftKey
      )
    )
  ) {
    throw new ExperimentFoundationV2RepositoryConstraintError(
      'ASSET_IDENTITY_CONFLICT',
      `Persisted asset semantic family key disagrees with its typed draft: ${assetType}:${logicalId}`,
    );
  }
}

function mapDataset(row: DatasetRow): ExperimentFoundationDatasetV2 {
  const draft = emptyJsonIsNull<ExperimentFoundationDatasetV2['dataset_draft']>(
    row.datasetDraftJson,
  );
  assertAssetDraftIntegrity('Dataset', draft, row.id);
  assertPersistedIdentityKey('Dataset', row.id, row.datasetKey, draft?.dataset_key);
  const mapped: ExperimentFoundationDatasetV2 = {
    logical_id: row.id,
    dataset_key: row.datasetKey,
    draft_state_version: row.draftStateVersion,
    current_revision_id: row.currentRevisionId,
    dataset_draft: draft,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
  assertAssetIdentityIntegrity({ asset_type: 'Dataset', asset: mapped });
  return mapped;
}

function mapDataPolicy(row: DataPolicyRow): ExperimentFoundationDataPolicyV2 {
  const draft = emptyJsonIsNull<ExperimentFoundationDataPolicyV2['data_policy_draft']>(
    row.dataPolicyDraftJson,
  );
  assertAssetDraftIntegrity('DataPolicy', draft, row.id);
  assertPersistedIdentityKey('DataPolicy', row.id, row.dataPolicyKey, draft?.policy_key);
  const mapped: ExperimentFoundationDataPolicyV2 = {
    logical_id: row.id,
    policy_key: row.dataPolicyKey,
    draft_state_version: row.draftStateVersion,
    current_revision_id: row.currentRevisionId,
    data_policy_draft: draft,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
  assertAssetIdentityIntegrity({ asset_type: 'DataPolicy', asset: mapped });
  return mapped;
}

function mapMetricDefinition(row: MetricDefinitionRow): ExperimentFoundationMetricDefinitionV2 {
  const draft = emptyJsonIsNull<
    ExperimentFoundationMetricDefinitionV2['metric_definition_draft']
  >(row.metricDefinitionDraftJson);
  assertAssetDraftIntegrity('MetricDefinition', draft, row.id);
  assertPersistedIdentityKey(
    'MetricDefinition',
    row.id,
    row.metricDefinitionKey,
    draft?.metric_key,
  );
  const mapped: ExperimentFoundationMetricDefinitionV2 = {
    logical_id: row.id,
    metric_key: row.metricDefinitionKey,
    draft_state_version: row.draftStateVersion,
    current_revision_id: row.currentRevisionId,
    metric_definition_draft: draft,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
  assertAssetIdentityIntegrity({ asset_type: 'MetricDefinition', asset: mapped });
  return mapped;
}

function mapBenchmark(row: BenchmarkRow): ExperimentFoundationBenchmarkV2 {
  const draft = emptyJsonIsNull<ExperimentFoundationBenchmarkV2['benchmark_draft']>(
    row.benchmarkDraftJson,
  );
  assertAssetDraftIntegrity('Benchmark', draft, row.id);
  assertPersistedIdentityKey('Benchmark', row.id, row.benchmarkKey, draft?.benchmark_key);
  const mapped: ExperimentFoundationBenchmarkV2 = {
    logical_id: row.id,
    benchmark_key: row.benchmarkKey,
    draft_state_version: row.draftStateVersion,
    current_revision_id: row.currentRevisionId,
    benchmark_draft: draft,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
  assertAssetIdentityIntegrity({ asset_type: 'Benchmark', asset: mapped });
  return mapped;
}

function mapEvaluationProtocol(row: EvaluationProtocolRow): ExperimentFoundationEvaluationProtocolV2 {
  const draft = emptyJsonIsNull<
    ExperimentFoundationEvaluationProtocolV2['evaluation_protocol_draft']
  >(row.evaluationProtocolDraftJson);
  assertAssetDraftIntegrity('EvaluationProtocol', draft, row.id);
  assertPersistedIdentityKey(
    'EvaluationProtocol',
    row.id,
    row.evaluationProtocolKey,
    draft?.protocol_key,
  );
  const mapped: ExperimentFoundationEvaluationProtocolV2 = {
    logical_id: row.id,
    protocol_key: row.evaluationProtocolKey,
    draft_state_version: row.draftStateVersion,
    current_revision_id: row.currentRevisionId,
    evaluation_protocol_draft: draft,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
  assertAssetIdentityIntegrity({ asset_type: 'EvaluationProtocol', asset: mapped });
  return mapped;
}

function assertAssetIdentityIntegrity(
  record: ExperimentFoundationV2AssetIdentityRecord,
): void {
  try {
    assertStoredExperimentFoundationV2AssetIdentityIntegrity(record);
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'ASSET_IDENTITY_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
}

function assertAssetDraftIntegrity(
  assetType: ExperimentFoundationV2AssetType,
  draft: unknown,
  logicalId: string,
): void {
  // An empty persisted object is the explicit no-draft representation for an
  // identity that only points at immutable revisions. Validate only when a
  // draft is actually present.
  if (draft === null) {
    return;
  }
  try {
    assertStoredExperimentFoundationV2AssetDraftIntegrity(
      assetType,
      draft,
      `${assetType} draft ${logicalId}`,
    );
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'ASSET_IDENTITY_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
}

async function mapDatasetRevision(
  transaction: TransactionClient,
  row: DatasetRevisionRow,
  loadedPolicyRevision?: DataPolicyRevisionRow | null,
): Promise<ExperimentFoundationDatasetRevisionV2> {
  const revision = revisionBase(row.datasetId, row, {
    dataset_revision: fromJson<ExperimentFoundationDatasetRevisionV2['dataset_revision']>(
      row.datasetSnapshotJson,
    ),
  });
  assertAssetRevisionIntegrity({ asset_type: 'Dataset', revision });
  const policy = revision.dataset_revision.data_policy;
  const policyRevision = loadedPolicyRevision === undefined
    ? await transaction.experimentFoundationDataPolicyRevisionV2.findUnique({
      where: { id: row.dataPolicyRevisionId },
    })
    : loadedPolicyRevision;
  if (
    row.dataPolicyRevisionId !== policy.revision_id
    || row.dataPolicyRevisionHash !== policy.content_hash
    || !policyRevision
    || policy.asset_type !== 'DataPolicy'
    || policy.logical_id !== policyRevision.dataPolicyId
    || policy.revision_id !== policyRevision.id
    || policy.revision_sequence !== policyRevision.revisionSequence
    || policy.content_hash !== policyRevision.contentHash
  ) {
    throw assetRevisionIntegrityError(
      `Dataset relational policy binding drifted: ${row.id}`,
    );
  }
  return revision;
}

function mapDataPolicyRevision(row: DataPolicyRevisionRow): ExperimentFoundationDataPolicyRevisionV2 {
  const revision = revisionBase(row.dataPolicyId, row, {
    data_policy_revision: fromJson<ExperimentFoundationDataPolicyRevisionV2['data_policy_revision']>(
      row.dataPolicySnapshotJson,
    ),
  });
  assertAssetRevisionIntegrity({ asset_type: 'DataPolicy', revision });
  return revision;
}

function mapMetricDefinitionRevision(
  row: MetricDefinitionRevisionRow,
): ExperimentFoundationMetricDefinitionRevisionV2 {
  const revision = revisionBase(row.metricDefinitionId, row, {
    metric_definition_revision: fromJson<
      ExperimentFoundationMetricDefinitionRevisionV2['metric_definition_revision']
    >(row.metricDefinitionSnapshotJson),
  });
  assertAssetRevisionIntegrity({ asset_type: 'MetricDefinition', revision });
  return revision;
}

async function mapBenchmarkRevision(
  transaction: TransactionClient,
  row: BenchmarkRevisionRow,
  loadedDatasets?: {
    corpus: DatasetRevisionRow | null;
    query: DatasetRevisionRow | null;
  },
): Promise<ExperimentFoundationBenchmarkRevisionV2> {
  const revision = revisionBase(row.benchmarkId, row, {
    benchmark_revision: fromJson<ExperimentFoundationBenchmarkRevisionV2['benchmark_revision']>(
      row.benchmarkSnapshotJson,
    ),
  });
  assertAssetRevisionIntegrity({ asset_type: 'Benchmark', revision });
  const corpus = revision.benchmark_revision.corpus_dataset;
  const query = revision.benchmark_revision.query_workload_dataset;
  const datasetRevisions = loadedDatasets ?? {
    corpus: await transaction.experimentFoundationDatasetRevisionV2.findUnique({
      where: { id: row.corpusDatasetRevisionId },
    }),
    query: await transaction.experimentFoundationDatasetRevisionV2.findUnique({
      where: { id: row.queryDatasetRevisionId },
    }),
  };
  if (
    row.corpusDatasetRevisionId !== corpus.revision_id
    || row.corpusDatasetRevisionHash !== corpus.content_hash
    || row.queryDatasetRevisionId !== query.revision_id
    || row.queryDatasetRevisionHash !== query.content_hash
    || !datasetRevisionMatchesExactRef(datasetRevisions.corpus, corpus)
    || !datasetRevisionMatchesExactRef(datasetRevisions.query, query)
    || row.datasetDependencyManifestHash !== dependencyManifestHash(
      'BenchmarkDatasetDependencyManifest',
      [corpus, query],
    )
  ) {
    throw assetRevisionIntegrityError(
      `Benchmark relational dataset binding drifted: ${row.id}`,
    );
  }
  return revision;
}

async function mapEvaluationProtocolRevision(
  transaction: TransactionClient,
  row: EvaluationProtocolRevisionRow,
  loadedRelations?: {
    metricDependencies: EvaluationProtocolMetricDependencyRow[];
    benchmark: BenchmarkRevisionRow | null;
  },
): Promise<ExperimentFoundationEvaluationProtocolRevisionV2> {
  const revision = revisionBase(row.evaluationProtocolId, row, {
    evaluation_protocol_revision: fromJson<
      ExperimentFoundationEvaluationProtocolRevisionV2['evaluation_protocol_revision']
    >(row.evaluationProtocolSnapshotJson),
  });
  assertAssetRevisionIntegrity({ asset_type: 'EvaluationProtocol', revision });
  const benchmark = revision.evaluation_protocol_revision.benchmark_dependency;
  const metrics = revision.evaluation_protocol_revision.metric_dependencies;
  const [dependencyRows, benchmarkRevision] = loadedRelations
    ? [loadedRelations.metricDependencies, loadedRelations.benchmark] as const
    : await Promise.all([
      transaction.experimentFoundationEvaluationProtocolMetricDependencyV2.findMany({
        where: { evaluationProtocolRevisionId: row.id },
        orderBy: { ordinal: 'asc' },
      }),
      transaction.experimentFoundationBenchmarkRevisionV2.findUnique({
        where: { id: row.benchmarkRevisionId },
      }),
    ]);
  if (
    row.benchmarkRevisionId !== benchmark.revision_id
    || row.benchmarkRevisionHash !== benchmark.content_hash
    || !benchmarkRevisionMatchesExactRef(benchmarkRevision, benchmark)
    || row.metricDependencyCount !== metrics.length
    || row.metricDependencyManifestHash !== dependencyManifestHash(
      'EvaluationProtocolMetricDependencyManifest',
      metrics,
    )
    || !protocolMetricDependenciesMatch(row.id, metrics, dependencyRows)
  ) {
    throw assetRevisionIntegrityError(
      `EvaluationProtocol relational dependency binding drifted: ${row.id}`,
    );
  }
  return revision;
}

function datasetRevisionMatchesExactRef(
  row: DatasetRevisionRow | null,
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
): boolean {
  return row !== null
    && ref.asset_type === 'Dataset'
    && ref.logical_id === row.datasetId
    && ref.revision_id === row.id
    && ref.revision_sequence === row.revisionSequence
    && ref.content_hash === row.contentHash;
}

function benchmarkRevisionMatchesExactRef(
  row: BenchmarkRevisionRow | null,
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
): boolean {
  return row !== null
    && ref.asset_type === 'Benchmark'
    && ref.logical_id === row.benchmarkId
    && ref.revision_id === row.id
    && ref.revision_sequence === row.revisionSequence
    && ref.content_hash === row.contentHash;
}

function protocolMetricDependenciesMatch(
  revisionId: string,
  metrics: ExperimentFoundationV2ExactAssetRevisionRef[],
  rows: EvaluationProtocolMetricDependencyRow[],
): boolean {
  return rows.length === metrics.length && rows.every((row, index) => {
    const metric = metrics[index];
    return metric !== undefined
      && row.evaluationProtocolRevisionId === revisionId
      && row.ordinal === index + 1
      && row.metricDefinitionId === metric.logical_id
      && row.metricDefinitionRevisionId === metric.revision_id
      && row.metricDefinitionRevisionSequence === metric.revision_sequence
      && row.metricDefinitionRevisionHash === metric.content_hash;
  });
}

function assertAssetRevisionIntegrity(
  record: ExperimentFoundationV2AssetRevisionRecord,
): void {
  try {
    assertStoredExperimentFoundationV2AssetRevisionIntegrity(record);
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw assetRevisionIntegrityError(error.message);
    }
    throw error;
  }
}

function assetRevisionIntegrityError(
  message: string,
): ExperimentFoundationV2RepositoryConstraintError {
  return new ExperimentFoundationV2RepositoryConstraintError(
    'ASSET_REVISION_CONFLICT',
    message,
  );
}

function revisionBase<T extends object>(
  logicalId: string,
  row: {
    id: string;
    revisionSequence: number;
    schemaVersion: string;
    hashProfile: string;
    contentHash: string;
    frozenByActorType: string;
    frozenByActorId: string | null;
    frozenAt: Date;
  },
  content: T,
) {
  if (row.frozenByActorType !== SERVER_ACTOR_TYPE || row.frozenByActorId !== null) {
    throw assetRevisionIntegrityError(
      `Immutable revision is not server-frozen: ${row.id}`,
    );
  }
  return {
    logical_id: logicalId,
    revision_id: row.id,
    revision_sequence: row.revisionSequence,
    schema_version: row.schemaVersion,
    hash_profile: row.hashProfile as 'ef-asset-semantic-json@v1',
    content_hash: row.contentHash,
    created_at: row.frozenAt.toISOString(),
    ...content,
  };
}

function datasetIdentityCreateData(asset: ExperimentFoundationDatasetV2) {
  assertPersistedIdentityKey('Dataset', asset.logical_id, asset.dataset_key, asset.dataset_draft?.dataset_key);
  return {
    id: asset.logical_id,
    datasetKey: asset.dataset_key,
    ...datasetIdentityUpdateData(asset),
    createdAt: new Date(asset.created_at),
  } satisfies Prisma.ExperimentFoundationDatasetV2UncheckedCreateInput;
}

function datasetIdentityUpdateData(asset: ExperimentFoundationDatasetV2) {
  return identityMutableData(asset, {
    datasetDraftJson: toInputJson(asset.dataset_draft ?? {}),
  });
}

function dataPolicyIdentityCreateData(asset: ExperimentFoundationDataPolicyV2) {
  assertPersistedIdentityKey('DataPolicy', asset.logical_id, asset.policy_key, asset.data_policy_draft?.policy_key);
  return {
    id: asset.logical_id,
    dataPolicyKey: asset.policy_key,
    ...dataPolicyIdentityUpdateData(asset),
    createdAt: new Date(asset.created_at),
  } satisfies Prisma.ExperimentFoundationDataPolicyV2UncheckedCreateInput;
}

function dataPolicyIdentityUpdateData(asset: ExperimentFoundationDataPolicyV2) {
  return identityMutableData(asset, {
    dataPolicyDraftJson: toInputJson(asset.data_policy_draft ?? {}),
  });
}

function metricDefinitionIdentityCreateData(asset: ExperimentFoundationMetricDefinitionV2) {
  assertPersistedIdentityKey(
    'MetricDefinition',
    asset.logical_id,
    asset.metric_key,
    asset.metric_definition_draft?.metric_key,
  );
  return {
    id: asset.logical_id,
    metricDefinitionKey: asset.metric_key,
    ...metricDefinitionIdentityUpdateData(asset),
    createdAt: new Date(asset.created_at),
  } satisfies Prisma.ExperimentFoundationMetricDefinitionV2UncheckedCreateInput;
}

function metricDefinitionIdentityUpdateData(asset: ExperimentFoundationMetricDefinitionV2) {
  return identityMutableData(
    asset,
    { metricDefinitionDraftJson: toInputJson(asset.metric_definition_draft ?? {}) },
  );
}

function benchmarkIdentityCreateData(asset: ExperimentFoundationBenchmarkV2) {
  assertPersistedIdentityKey(
    'Benchmark',
    asset.logical_id,
    asset.benchmark_key,
    asset.benchmark_draft?.benchmark_key,
  );
  return {
    id: asset.logical_id,
    benchmarkKey: asset.benchmark_key,
    ...benchmarkIdentityUpdateData(asset),
    createdAt: new Date(asset.created_at),
  } satisfies Prisma.ExperimentFoundationBenchmarkV2UncheckedCreateInput;
}

function benchmarkIdentityUpdateData(asset: ExperimentFoundationBenchmarkV2) {
  return identityMutableData(asset, {
    benchmarkDraftJson: toInputJson(asset.benchmark_draft ?? {}),
  });
}

function evaluationProtocolIdentityCreateData(asset: ExperimentFoundationEvaluationProtocolV2) {
  assertPersistedIdentityKey(
    'EvaluationProtocol',
    asset.logical_id,
    asset.protocol_key,
    asset.evaluation_protocol_draft?.protocol_key,
  );
  return {
    id: asset.logical_id,
    evaluationProtocolKey: asset.protocol_key,
    ...evaluationProtocolIdentityUpdateData(asset),
    createdAt: new Date(asset.created_at),
  } satisfies Prisma.ExperimentFoundationEvaluationProtocolV2UncheckedCreateInput;
}

function evaluationProtocolIdentityUpdateData(asset: ExperimentFoundationEvaluationProtocolV2) {
  return identityMutableData(
    asset,
    { evaluationProtocolDraftJson: toInputJson(asset.evaluation_protocol_draft ?? {}) },
  );
}

function identityMutableData<T extends { draft_state_version: number; current_revision_id: string | null; updated_at: string }>(
  asset: T,
  jsonField: Record<string, Prisma.InputJsonValue>,
) {
  return {
    draftStateVersion: asset.draft_state_version,
    ...jsonField,
    currentRevisionId: asset.current_revision_id,
    updatedAt: new Date(asset.updated_at),
  };
}

function datasetRevisionCreateData(revision: ExperimentFoundationDatasetRevisionV2) {
  return {
    ...revisionCommonCreateData(revision),
    datasetId: revision.logical_id,
    datasetSnapshotJson: toInputJson(revision.dataset_revision),
    dataPolicyRevisionId: revision.dataset_revision.data_policy.revision_id,
    dataPolicyRevisionHash: revision.dataset_revision.data_policy.content_hash,
  } satisfies Prisma.ExperimentFoundationDatasetRevisionV2UncheckedCreateInput;
}

function dataPolicyRevisionCreateData(revision: ExperimentFoundationDataPolicyRevisionV2) {
  return {
    ...revisionCommonCreateData(revision),
    dataPolicyId: revision.logical_id,
    dataPolicySnapshotJson: toInputJson(revision.data_policy_revision),
  } satisfies Prisma.ExperimentFoundationDataPolicyRevisionV2UncheckedCreateInput;
}

function metricDefinitionRevisionCreateData(revision: ExperimentFoundationMetricDefinitionRevisionV2) {
  return {
    ...revisionCommonCreateData(revision),
    metricDefinitionId: revision.logical_id,
    metricDefinitionSnapshotJson: toInputJson(revision.metric_definition_revision),
  } satisfies Prisma.ExperimentFoundationMetricDefinitionRevisionV2UncheckedCreateInput;
}

function benchmarkRevisionCreateData(revision: ExperimentFoundationBenchmarkRevisionV2) {
  const corpus = revision.benchmark_revision.corpus_dataset;
  const query = revision.benchmark_revision.query_workload_dataset;
  return {
    ...revisionCommonCreateData(revision),
    benchmarkId: revision.logical_id,
    benchmarkSnapshotJson: toInputJson(revision.benchmark_revision),
    corpusDatasetRevisionId: corpus.revision_id,
    corpusDatasetRevisionHash: corpus.content_hash,
    queryDatasetRevisionId: query.revision_id,
    queryDatasetRevisionHash: query.content_hash,
    datasetDependencyManifestHash: dependencyManifestHash(
      'BenchmarkDatasetDependencyManifest',
      [corpus, query],
    ),
  } satisfies Prisma.ExperimentFoundationBenchmarkRevisionV2UncheckedCreateInput;
}

function evaluationProtocolRevisionCreateData(
  revision: ExperimentFoundationEvaluationProtocolRevisionV2,
) {
  const benchmark = revision.evaluation_protocol_revision.benchmark_dependency;
  const metrics = revision.evaluation_protocol_revision.metric_dependencies;
  return {
    ...revisionCommonCreateData(revision),
    evaluationProtocolId: revision.logical_id,
    evaluationProtocolSnapshotJson: toInputJson(revision.evaluation_protocol_revision),
    benchmarkRevisionId: benchmark.revision_id,
    benchmarkRevisionHash: benchmark.content_hash,
    metricDependencyCount: metrics.length,
    metricDependencyManifestHash: dependencyManifestHash(
      'EvaluationProtocolMetricDependencyManifest',
      metrics,
    ),
  } satisfies Prisma.ExperimentFoundationEvaluationProtocolRevisionV2UncheckedCreateInput;
}

function evaluationProtocolMetricDependencyCreateData(
  revision: ExperimentFoundationEvaluationProtocolRevisionV2,
): Prisma.ExperimentFoundationEvaluationProtocolMetricDependencyV2CreateManyInput[] {
  return revision.evaluation_protocol_revision.metric_dependencies.map((metric, index) => ({
    id: `${revision.revision_id}:metric:${index + 1}`,
    evaluationProtocolRevisionId: revision.revision_id,
    ordinal: index + 1,
    metricDefinitionId: metric.logical_id,
    metricDefinitionRevisionId: metric.revision_id,
    metricDefinitionRevisionSequence: metric.revision_sequence,
    metricDefinitionRevisionHash: metric.content_hash,
  }));
}

function revisionCommonCreateData(
  revision: {
    revision_id: string;
    revision_sequence: number;
    schema_version: string;
    hash_profile: string;
    content_hash: string;
    created_at: string;
  },
) {
  return {
    id: revision.revision_id,
    revisionSequence: revision.revision_sequence,
    schemaVersion: revision.schema_version,
    hashProfile: revision.hash_profile,
    contentHash: revision.content_hash,
    frozenByActorType: SERVER_ACTOR_TYPE,
    frozenByActorId: null,
    frozenAt: new Date(revision.created_at),
  };
}

function mapLifecycleEvent(row: LifecycleEventRow): ExperimentFoundationAssetLifecycleEventV2 {
  if (row.eventSchemaVersion !== STORED_SCHEMA_VERSION_V1) {
    throw new ExperimentFoundationV2RepositoryConstraintError(
      'LIFECYCLE_EVENT_CONFLICT',
      `Lifecycle event schema version drifted from v1: ${row.id}`,
    );
  }
  return {
    lifecycle_event_id: row.id,
    asset: exactRef(
      row.assetType,
      row.assetId,
      row.assetRevisionId,
      row.assetRevisionSequence,
      row.assetRevisionHash,
    ),
    lifecycle_sequence: row.eventSequence,
    event_type: decodeStoredAllowlistedValue(
      row.eventType,
      EXPERIMENT_FOUNDATION_V2_LIFECYCLE_EVENT_TYPES,
      'LIFECYCLE_EVENT_CONFLICT',
      `Lifecycle event type ${row.id}`,
    ),
    reason_code: row.reasonCode,
    note: row.note,
    occurred_at: row.occurredAt.toISOString(),
  };
}

function mapLifecycleProjection(
  row: LifecycleProjectionRow,
): ExperimentFoundationAssetLifecycleProjectionV2 {
  return {
    asset: exactRef(
      row.assetType,
      row.assetId,
      row.currentRevisionId,
      row.currentRevisionSequence,
      row.currentRevisionHash,
    ),
    projection_state_version: row.stateVersion,
    lifecycle_sequence: row.lifecycleSequence,
    lifecycle_status: decodeStoredAllowlistedValue(
      row.lifecycleStatus,
      EXPERIMENT_FOUNDATION_V2_LIFECYCLE_STATUSES,
      'LIFECYCLE_PROJECTION_CAS_CONFLICT',
      `Lifecycle projection status ${row.id}`,
    ),
    location_available: row.locationAvailable,
    source_event_id: row.lastEventId,
    updated_at: row.updatedAt.toISOString(),
  };
}

function lifecycleProjectionCreateData(next: ExperimentFoundationAssetLifecycleProjectionV2) {
  return {
    id: lifecycleProjectionId(
      next.asset.asset_type,
      next.asset.logical_id,
      next.asset.revision_id,
    ),
    assetType: toPrismaAssetType(next.asset.asset_type),
    assetId: next.asset.logical_id,
    ...lifecycleProjectionUpdateData(next),
  } satisfies Prisma.ExperimentFoundationAssetLifecycleProjectionV2UncheckedCreateInput;
}

function lifecycleProjectionUpdateData(next: ExperimentFoundationAssetLifecycleProjectionV2) {
  return {
    currentRevisionId: next.asset.revision_id,
    currentRevisionSequence: next.asset.revision_sequence,
    currentRevisionHash: next.asset.content_hash,
    lifecycleSequence: next.lifecycle_sequence,
    lifecycleStatus: next.lifecycle_status,
    locationAvailable: next.location_available,
    stateVersion: next.projection_state_version,
    lastEventId: next.source_event_id,
    updatedAt: new Date(next.updated_at),
  };
}

async function mapReadinessAttestation(
  transaction: TransactionClient,
  row: ReadinessAttestationRow,
  loadedDependencyRows?: ReadinessDependencyRow[],
): Promise<ExperimentFoundationReadinessAttestationV2> {
  const mapped = {
    readiness_attestation_id: row.id,
    target: exactRef(
      row.targetAssetType,
      row.targetAssetId,
      row.targetRevisionId,
      row.targetRevisionSequence,
      row.targetRevisionHash,
    ),
    status: decodeStoredAllowlistedValue(
      row.outcome,
      EXPERIMENT_FOUNDATION_V2_READINESS_STATUSES,
      'READINESS_ATTESTATION_CONFLICT',
      `Readiness outcome ${row.id}`,
    ),
    evaluator_profile_version: row.evaluatorProfileVersion,
    evaluator_profile_hash: row.evaluatorProfileHash,
    dependency_manifest_hash: row.dependencyManifestHash,
    qualification_snapshot: fromJson<
      ExperimentFoundationReadinessAttestationV2['qualification_snapshot']
    >(row.qualificationSnapshotJson),
    blockers: fromJson<ExperimentFoundationReadinessAttestationV2['blockers']>(
      row.blockerSnapshotJson,
    ),
    attestation_hash: row.attestationHash,
    created_at: row.attestedAt.toISOString(),
  };
  const dependencyRows = loadedDependencyRows
    ?? await transaction.experimentFoundationReadinessDependencyV2.findMany({
      where: { attestationId: row.id },
      orderBy: { ordinal: 'asc' },
    });
  const dependencies = dependencyRows.map(mapReadinessDependency);
  try {
    assertStoredExperimentFoundationV2ReadinessIntegrity(mapped, dependencies);
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'READINESS_ATTESTATION_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
  return mapped;
}

function mapReadinessDependency(
  row: ReadinessDependencyRow,
): ExperimentFoundationReadinessDependencyV2 {
  if (row.dependencyRole !== row.dependencyAssetType) {
    throw new ExperimentFoundationV2RepositoryConstraintError(
      'READINESS_DEPENDENCY_CONFLICT',
      `Readiness dependency role drifted: ${row.id}`,
    );
  }
  return {
    readiness_attestation_id: row.attestationId,
    ordinal: row.ordinal,
    dependency: exactRef(
      row.dependencyAssetType,
      row.dependencyAssetId,
      row.dependencyRevisionId,
      row.dependencyRevisionSequence,
      row.dependencyRevisionHash,
    ),
  };
}

function cloneReadinessDependencies(
  dependencies: ExperimentFoundationReadinessDependencyV2[],
): ExperimentFoundationReadinessDependencyV2[] {
  return dependencies.map((dependency) => ({
    ...dependency,
    dependency: { ...dependency.dependency },
  }));
}

function assertReadinessIntegrity(
  attestation: ExperimentFoundationReadinessAttestationV2,
  dependencies: ExperimentFoundationReadinessDependencyV2[],
): void {
  try {
    assertStoredExperimentFoundationV2ReadinessIntegrity(attestation, dependencies);
  } catch (error) {
    if (error instanceof StoredExperimentFoundationV2SnapshotIntegrityError) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'READINESS_ATTESTATION_CONFLICT',
        error.message,
      );
    }
    throw error;
  }
}

function decodeStoredAllowlistedValue<const TValues extends readonly string[]>(
  value: string,
  allowedValues: TValues,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationV2RepositoryConstraintError>[0],
  label: string,
): TValues[number] {
  if (!(allowedValues as readonly string[]).includes(value)) {
    throw new ExperimentFoundationV2RepositoryConstraintError(
      reasonCode,
      `${label} is outside the closed v2 vocabulary: ${value}`,
    );
  }
  return value as TValues[number];
}

function readinessScopeWhere(scope: ExperimentFoundationV2ReadinessScope) {
  return {
    targetAssetType: toPrismaAssetType(scope.target.asset_type),
    targetAssetId: scope.target.logical_id,
    targetRevisionId: scope.target.revision_id,
    targetRevisionSequence: scope.target.revision_sequence,
    targetRevisionHash: scope.target.content_hash,
    evaluatorProfileHash: scope.evaluator_profile_hash,
    dependencyManifestHash: scope.dependency_manifest_hash,
  };
}

function assertOrderedReadinessDependencies(
  attestationId: string,
  dependencies: ExperimentFoundationReadinessDependencyV2[],
): void {
  const exactRefs = new Set<string>();
  for (let index = 0; index < dependencies.length; index += 1) {
    const dependency = dependencies[index];
    const exactKey = exactRefKey(dependency.dependency);
    if (
      dependency.readiness_attestation_id !== attestationId
      || dependency.ordinal !== index + 1
      || exactRefs.has(exactKey)
    ) {
      throw new ExperimentFoundationV2RepositoryConstraintError(
        'READINESS_DEPENDENCY_CONFLICT',
        `Invalid readiness dependency at position ${index + 1}`,
      );
    }
    exactRefs.add(exactKey);
  }
}

async function findFreezeRevision(
  transaction: TransactionClient,
  assetType: ExperimentFoundationV2AssetType,
  logicalId: string,
  businessIdempotencyKey: string,
): Promise<{ id: string; contentHash: string } | null> {
  switch (assetType) {
    case 'Dataset':
      return transaction.experimentFoundationDatasetFreezeCommandReceiptV2.findFirst({
        where: { datasetId: logicalId, businessIdempotencyKey },
        select: { revisionId: true, contentHash: true },
      }).then(mapFreezeReceipt);
    case 'DataPolicy':
      return transaction.experimentFoundationDataPolicyFreezeCommandReceiptV2.findFirst({
        where: { dataPolicyId: logicalId, businessIdempotencyKey },
        select: { revisionId: true, contentHash: true },
      }).then(mapFreezeReceipt);
    case 'MetricDefinition':
      return transaction.experimentFoundationMetricDefinitionFreezeCommandReceiptV2.findFirst({
        where: { metricDefinitionId: logicalId, businessIdempotencyKey },
        select: { revisionId: true, contentHash: true },
      }).then(mapFreezeReceipt);
    case 'Benchmark':
      return transaction.experimentFoundationBenchmarkFreezeCommandReceiptV2.findFirst({
        where: { benchmarkId: logicalId, businessIdempotencyKey },
        select: { revisionId: true, contentHash: true },
      }).then(mapFreezeReceipt);
    case 'EvaluationProtocol':
      return transaction.experimentFoundationEvaluationProtocolFreezeCommandReceiptV2.findFirst({
        where: { evaluationProtocolId: logicalId, businessIdempotencyKey },
        select: { revisionId: true, contentHash: true },
      }).then(mapFreezeReceipt);
  }
}

function mapFreezeReceipt(
  row: { revisionId: string; contentHash: string } | null,
): { id: string; contentHash: string } | null {
  return row ? { id: row.revisionId, contentHash: row.contentHash } : null;
}

async function createFreezeCommandReceipt(
  transaction: TransactionClient,
  record: ExperimentFoundationV2FreezeReplayRecord,
): Promise<void> {
  const common = {
    id: freezeCommandReceiptId(record),
    businessIdempotencyKey: record.business_idempotency_key,
    revisionId: record.revision_id,
    contentHash: record.content_hash,
  };
  switch (record.asset_type) {
    case 'Dataset':
      await transaction.experimentFoundationDatasetFreezeCommandReceiptV2.create({
        data: { ...common, datasetId: record.logical_id },
      });
      return;
    case 'DataPolicy':
      await transaction.experimentFoundationDataPolicyFreezeCommandReceiptV2.create({
        data: { ...common, dataPolicyId: record.logical_id },
      });
      return;
    case 'MetricDefinition':
      await transaction.experimentFoundationMetricDefinitionFreezeCommandReceiptV2.create({
        data: { ...common, metricDefinitionId: record.logical_id },
      });
      return;
    case 'Benchmark':
      await transaction.experimentFoundationBenchmarkFreezeCommandReceiptV2.create({
        data: { ...common, benchmarkId: record.logical_id },
      });
      return;
    case 'EvaluationProtocol':
      await transaction.experimentFoundationEvaluationProtocolFreezeCommandReceiptV2.create({
        data: { ...common, evaluationProtocolId: record.logical_id },
      });
      return;
  }
}

function freezeCommandReceiptId(
  record: ExperimentFoundationV2FreezeReplayRecord,
): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: `ExperimentFoundation${record.asset_type}FreezeCommandReceiptV2`,
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: {
      logical_id: record.logical_id,
      business_idempotency_key: record.business_idempotency_key,
    },
  });
}

function toPrismaAssetType(assetType: ExperimentFoundationV2AssetType) {
  return ExperimentFoundationAssetTypeV2[assetType];
}

function fromPrismaAssetType(
  assetType: ExperimentFoundationAssetTypeV2,
): ExperimentFoundationV2AssetType {
  return assetType;
}

function exactRefFromRecord(
  record: ExperimentFoundationV2AssetRevisionRecord,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: record.asset_type,
    logical_id: record.revision.logical_id,
    revision_id: record.revision.revision_id,
    revision_sequence: record.revision.revision_sequence,
    content_hash: record.revision.content_hash,
  };
}

function exactRef(
  assetType: ExperimentFoundationAssetTypeV2,
  logicalId: string,
  revisionId: string,
  revisionSequence: number,
  contentHash: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  return {
    asset_type: assetType,
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: revisionSequence,
    content_hash: contentHash,
  };
}

function sameExactRef(
  left: ExperimentFoundationV2ExactAssetRevisionRef,
  right: ExperimentFoundationV2ExactAssetRevisionRef,
): boolean {
  return exactRefKey(left) === exactRefKey(right);
}

function exactRefKey(ref: ExperimentFoundationV2ExactAssetRevisionRef): string {
  return [
    ref.asset_type,
    ref.logical_id,
    ref.revision_id,
    ref.revision_sequence,
    ref.content_hash,
  ].join('\u0000');
}

function dependencyManifestHash(recordKind: string, dependencies: unknown[]): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: recordKind,
    schema_version: 'v1',
    hash_profile: 'ef-readiness-dependency-manifest-json@v1',
    content: dependencies,
  });
}

function freezeRevisionKey(assetType: ExperimentFoundationV2AssetType, revisionId: string): string {
  return `${assetType}\u0000${revisionId}`;
}

function lifecycleProjectionId(
  assetType: string,
  logicalId: string,
  revisionId: string,
): string {
  return `ef_lifecycle_projection:${assetType}:${logicalId}:${revisionId}`;
}

function readinessDependencyId(attestationId: string, ordinal: number): string {
  return `${attestationId}:dependency:${ordinal}`;
}

function emptyJsonIsNull<T>(value: Prisma.JsonValue): T | null {
  if (
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === 0
  ) {
    return null;
  }
  return value as T;
}

function fromJson<T>(value: Prisma.JsonValue): T {
  return value as T;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isKnownConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2002' || error.code === 'P2003');
}

function isUniqueConstraint(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002';
}

function mapFoundationConstraint(
  error: unknown,
  reasonCode: ConstructorParameters<typeof ExperimentFoundationV2RepositoryConstraintError>[0],
  message: string,
): Error {
  if (error instanceof ExperimentFoundationV2RepositoryConstraintError) {
    return error;
  }
  if (isKnownConstraint(error)) {
    return new ExperimentFoundationV2RepositoryConstraintError(reasonCode, message);
  }
  return error instanceof Error ? error : new Error(String(error));
}

function mapPromotionConstraint(
  error: unknown,
  reasonCode: ConstructorParameters<
    typeof ExperimentFoundationPromotionV2RepositoryConstraintError
  >[0],
  message: string,
): Error {
  if (error instanceof ExperimentFoundationPromotionV2RepositoryConstraintError) {
    return error;
  }
  if (isKnownConstraint(error)) {
    return new ExperimentFoundationPromotionV2RepositoryConstraintError(reasonCode, message);
  }
  return error instanceof Error ? error : new Error(String(error));
}
