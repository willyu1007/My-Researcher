import type {
  ExperimentFoundationAssetLifecycleEventV2,
  ExperimentFoundationAssetLifecycleProjectionV2,
  ExperimentFoundationBenchmarkRevisionV2,
  ExperimentFoundationBenchmarkV2,
  ExperimentFoundationDataPolicyRevisionV2,
  ExperimentFoundationDataPolicyV2,
  ExperimentFoundationDatasetRevisionV2,
  ExperimentFoundationDatasetV2,
  ExperimentFoundationEvaluationProtocolRevisionV2,
  ExperimentFoundationEvaluationProtocolV2,
  ExperimentFoundationMetricDefinitionRevisionV2,
  ExperimentFoundationMetricDefinitionV2,
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationReadinessDependencyV2,
  ExperimentFoundationV2AssetType,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

export type ExperimentFoundationV2AssetIdentityRecord =
  | { asset_type: 'Dataset'; asset: ExperimentFoundationDatasetV2 }
  | { asset_type: 'DataPolicy'; asset: ExperimentFoundationDataPolicyV2 }
  | { asset_type: 'MetricDefinition'; asset: ExperimentFoundationMetricDefinitionV2 }
  | { asset_type: 'Benchmark'; asset: ExperimentFoundationBenchmarkV2 }
  | { asset_type: 'EvaluationProtocol'; asset: ExperimentFoundationEvaluationProtocolV2 };

export type ExperimentFoundationV2AssetRevisionRecord =
  | { asset_type: 'Dataset'; revision: ExperimentFoundationDatasetRevisionV2 }
  | { asset_type: 'DataPolicy'; revision: ExperimentFoundationDataPolicyRevisionV2 }
  | { asset_type: 'MetricDefinition'; revision: ExperimentFoundationMetricDefinitionRevisionV2 }
  | { asset_type: 'Benchmark'; revision: ExperimentFoundationBenchmarkRevisionV2 }
  | {
    asset_type: 'EvaluationProtocol';
    revision: ExperimentFoundationEvaluationProtocolRevisionV2;
  };

export interface ExperimentFoundationV2FreezeReplayRecord {
  asset_type: ExperimentFoundationV2AssetType;
  logical_id: string;
  business_idempotency_key: string;
  content_hash: string;
  revision_id: string;
}

export interface ExperimentFoundationV2ReadinessIdentity {
  target: ExperimentFoundationV2ExactAssetRevisionRef;
  evaluator_profile_hash: string;
  dependency_manifest_hash: string;
  attestation_hash: string;
}

export type ExperimentFoundationV2ReadinessScope = Omit<
  ExperimentFoundationV2ReadinessIdentity,
  'attestation_hash'
>;

export class ExperimentFoundationV2RepositoryConstraintError extends Error {
  constructor(
    public readonly reasonCode:
      | 'ASSET_IDENTITY_CONFLICT'
      | 'ASSET_REVISION_CONFLICT'
      | 'FREEZE_IDEMPOTENCY_CONFLICT'
      | 'LIFECYCLE_EVENT_CONFLICT'
      | 'LIFECYCLE_PROJECTION_CAS_CONFLICT'
      | 'READINESS_ATTESTATION_CONFLICT'
      | 'READINESS_DEPENDENCY_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationV2RepositoryConstraintError';
  }
}

/**
 * One EF-only authority transaction. Prisma implementations must bind every
 * method in this callback to one EF transaction client; callers must never
 * pass PI repositories into the callback.
 */
export interface ExperimentFoundationV2UnitOfWork {
  findAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetIdentityRecord | null>;
  insertAssetIdentity(record: ExperimentFoundationV2AssetIdentityRecord): Promise<void>;
  compareAndSwapAssetIdentity(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    expectedStateVersion: number,
    next: ExperimentFoundationV2AssetIdentityRecord,
  ): Promise<boolean>;

  findAssetRevisionById(
    assetType: ExperimentFoundationV2AssetType,
    revisionId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null>;
  findAssetRevisionByContentHash(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord | null>;
  listAssetRevisions(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
  ): Promise<ExperimentFoundationV2AssetRevisionRecord[]>;
  insertAssetRevision(record: ExperimentFoundationV2AssetRevisionRecord): Promise<void>;

  findFreezeReplay(
    assetType: ExperimentFoundationV2AssetType,
    logicalId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationV2FreezeReplayRecord | null>;
  insertFreezeReplay(record: ExperimentFoundationV2FreezeReplayRecord): Promise<void>;

  listLifecycleEvents(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleEventV2[]>;
  findLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
  ): Promise<ExperimentFoundationAssetLifecycleProjectionV2 | null>;
  appendLifecycleEvent(event: ExperimentFoundationAssetLifecycleEventV2): Promise<void>;
  compareAndSwapLifecycleProjection(
    asset: ExperimentFoundationV2ExactAssetRevisionRef,
    expectedStateVersion: number | null,
    next: ExperimentFoundationAssetLifecycleProjectionV2,
  ): Promise<boolean>;

  findReadinessAttestation(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null>;
  findReadinessAttestationByIdentity(
    identity: ExperimentFoundationV2ReadinessIdentity,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null>;
  findPassedReadinessAttestationForExactScope(
    scope: ExperimentFoundationV2ReadinessScope,
  ): Promise<ExperimentFoundationReadinessAttestationV2 | null>;
  listReadinessDependencies(
    readinessAttestationId: string,
  ): Promise<ExperimentFoundationReadinessDependencyV2[]>;
  insertReadinessAttestation(
    attestation: ExperimentFoundationReadinessAttestationV2,
    dependencies: ExperimentFoundationReadinessDependencyV2[],
  ): Promise<void>;
}

export interface ExperimentFoundationV2Repository {
  runInTransaction<T>(
    operation: (unitOfWork: ExperimentFoundationV2UnitOfWork) => Promise<T>,
  ): Promise<T>;
}
