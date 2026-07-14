import { Ajv, type ValidateFunction } from 'ajv';

import {
  experimentFoundationBenchmarkRevisionV2Schema,
  experimentFoundationBenchmarkV2Schema,
  experimentFoundationDataPolicyRevisionV2Schema,
  experimentFoundationDataPolicyV2Schema,
  experimentFoundationV2BenchmarkDraftContentV1Schema,
  experimentFoundationV2DataPolicyDraftContentV1Schema,
  experimentFoundationV2DatasetDraftContentV1Schema,
  experimentFoundationV2EvaluationProtocolDraftContentV2Schema,
  experimentFoundationV2MetricDefinitionDraftContentV1Schema,
  experimentFoundationDatasetRevisionV2Schema,
  experimentFoundationDatasetV2Schema,
  experimentFoundationEvaluationProtocolRevisionV2Schema,
  experimentFoundationEvaluationProtocolV2Schema,
  experimentFoundationMetricDefinitionRevisionV2Schema,
  experimentFoundationMetricDefinitionV2Schema,
  experimentFoundationReadinessAttestationV2Schema,
  experimentFoundationReadinessDependencyV2Schema,
  experimentFoundationRunRecipeSnapshotV2Schema,
  experimentFoundationTrainingTaskSpecSnapshotV2Schema,
  type ExperimentFoundationRunRecipeSnapshotV2,
  type ExperimentFoundationReadinessAttestationV2,
  type ExperimentFoundationReadinessDependencyV2,
  type ExperimentFoundationTrainingTaskSpecSnapshotV2,
  type ExperimentFoundationV2AssetType,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2ReadinessAttestation,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import type {
  ExperimentFoundationV2AssetIdentityRecord,
  ExperimentFoundationV2AssetRevisionRecord,
} from './experiment-foundation-v2.repository.js';

const ajv = new Ajv({ allErrors: true, strict: false });

const assetRevisionValidators = {
  Dataset: ajv.compile(experimentFoundationDatasetRevisionV2Schema),
  DataPolicy: ajv.compile(experimentFoundationDataPolicyRevisionV2Schema),
  MetricDefinition: ajv.compile(experimentFoundationMetricDefinitionRevisionV2Schema),
  Benchmark: ajv.compile(experimentFoundationBenchmarkRevisionV2Schema),
  EvaluationProtocol: ajv.compile(experimentFoundationEvaluationProtocolRevisionV2Schema),
} satisfies Record<ExperimentFoundationV2AssetRevisionRecord['asset_type'], ValidateFunction>;

const assetIdentityValidators = {
  Dataset: ajv.compile(experimentFoundationDatasetV2Schema),
  DataPolicy: ajv.compile(experimentFoundationDataPolicyV2Schema),
  MetricDefinition: ajv.compile(experimentFoundationMetricDefinitionV2Schema),
  Benchmark: ajv.compile(experimentFoundationBenchmarkV2Schema),
  EvaluationProtocol: ajv.compile(experimentFoundationEvaluationProtocolV2Schema),
} satisfies Record<ExperimentFoundationV2AssetIdentityRecord['asset_type'], ValidateFunction>;

const assetDraftValidators = {
  Dataset: ajv.compile(experimentFoundationV2DatasetDraftContentV1Schema),
  DataPolicy: ajv.compile(experimentFoundationV2DataPolicyDraftContentV1Schema),
  MetricDefinition: ajv.compile(experimentFoundationV2MetricDefinitionDraftContentV1Schema),
  Benchmark: ajv.compile(experimentFoundationV2BenchmarkDraftContentV1Schema),
  EvaluationProtocol: ajv.compile(experimentFoundationV2EvaluationProtocolDraftContentV2Schema),
} satisfies Record<ExperimentFoundationV2AssetType, ValidateFunction>;

const runRecipeSnapshotValidator = ajv.compile(
  experimentFoundationRunRecipeSnapshotV2Schema,
);
const trainingTaskSpecSnapshotValidator = ajv.compile(
  experimentFoundationTrainingTaskSpecSnapshotV2Schema,
);
const readinessAttestationValidator = ajv.compile(
  experimentFoundationReadinessAttestationV2Schema,
);
const readinessDependencyValidator = ajv.compile(
  experimentFoundationReadinessDependencyV2Schema,
);

export class StoredExperimentFoundationV2SnapshotIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StoredExperimentFoundationV2SnapshotIntegrityError';
  }
}

export function assertStoredExperimentFoundationV2AssetIdentityIntegrity(
  record: ExperimentFoundationV2AssetIdentityRecord,
): void {
  assertSchema(
    assetIdentityValidators[record.asset_type],
    record.asset,
    `${record.asset_type} identity ${record.asset.logical_id}`,
  );
}

export function assertStoredExperimentFoundationV2AssetRevisionIntegrity(
  record: ExperimentFoundationV2AssetRevisionRecord,
): void {
  assertSchema(
    assetRevisionValidators[record.asset_type],
    record.revision,
    `${record.asset_type} revision ${record.revision.revision_id}`,
  );

  const expectedHash = (() => {
    switch (record.asset_type) {
      case 'Dataset':
        return serverHashExperimentFoundationV2AssetRevision({
          asset_type: record.asset_type,
          content: record.revision.dataset_revision,
        });
      case 'DataPolicy':
        return serverHashExperimentFoundationV2AssetRevision({
          asset_type: record.asset_type,
          content: record.revision.data_policy_revision,
        });
      case 'MetricDefinition':
        return serverHashExperimentFoundationV2AssetRevision({
          asset_type: record.asset_type,
          content: record.revision.metric_definition_revision,
        });
      case 'Benchmark':
        return serverHashExperimentFoundationV2AssetRevision({
          asset_type: record.asset_type,
          content: record.revision.benchmark_revision,
        });
      case 'EvaluationProtocol':
        return serverHashExperimentFoundationV2AssetRevision({
          asset_type: record.asset_type,
          content: record.revision.evaluation_protocol_revision,
        });
    }
  })();

  if (expectedHash !== record.revision.content_hash) {
    throw new StoredExperimentFoundationV2SnapshotIntegrityError(
      `${record.asset_type} revision canonical hash mismatch: ${record.revision.revision_id}`,
    );
  }
}

export function assertStoredExperimentFoundationV2AssetDraftIntegrity(
  assetType: ExperimentFoundationV2AssetType,
  value: unknown,
  label: string,
): void {
  assertSchema(assetDraftValidators[assetType], value, label);
}

export function assertStoredExperimentFoundationV2ReadinessIntegrity(
  attestation: ExperimentFoundationReadinessAttestationV2,
  dependencies: ExperimentFoundationReadinessDependencyV2[],
): void {
  assertSchema(
    readinessAttestationValidator,
    attestation,
    `ReadinessAttestation ${attestation.readiness_attestation_id}`,
  );
  for (const dependency of dependencies) {
    assertSchema(
      readinessDependencyValidator,
      dependency,
      `ReadinessDependency ${attestation.readiness_attestation_id}:${dependency.ordinal}`,
    );
  }
  if (
    attestation.qualification_snapshot.dependency_count !== dependencies.length
    || dependencies.some((dependency, index) => (
      dependency.readiness_attestation_id !== attestation.readiness_attestation_id
      || dependency.ordinal !== index + 1
    ))
    || attestation.dependency_manifest_hash
      !== serverHashExperimentFoundationV2ReadinessDependencyManifest(
        dependencies.map((dependency) => dependency.dependency),
      )
    || attestation.attestation_hash
      !== serverHashExperimentFoundationV2ReadinessAttestation({
        target: attestation.target,
        status: attestation.status,
        evaluator_profile_version: attestation.evaluator_profile_version,
        evaluator_profile_hash: attestation.evaluator_profile_hash,
        dependency_manifest_hash: attestation.dependency_manifest_hash,
        qualification_snapshot: attestation.qualification_snapshot,
        blockers: attestation.blockers,
      })
  ) {
    throw new StoredExperimentFoundationV2SnapshotIntegrityError(
      `ReadinessAttestation ordered dependency manifest or canonical hash mismatch: ${attestation.readiness_attestation_id}`,
    );
  }
}

export function decodeStoredExperimentFoundationV2RunRecipeSnapshot(
  value: unknown,
  label: string,
): ExperimentFoundationRunRecipeSnapshotV2 {
  assertSchema(runRecipeSnapshotValidator, value, label);
  return value as ExperimentFoundationRunRecipeSnapshotV2;
}

export function decodeStoredExperimentFoundationV2TrainingTaskSpecSnapshot(
  value: unknown,
  label: string,
): ExperimentFoundationTrainingTaskSpecSnapshotV2 {
  assertSchema(trainingTaskSpecSnapshotValidator, value, label);
  return value as ExperimentFoundationTrainingTaskSpecSnapshotV2;
}

function assertSchema(
  validator: ValidateFunction,
  value: unknown,
  label: string,
): void {
  if (!validator(value)) {
    const details = (validator.errors ?? [])
      .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
      .join('; ');
    throw new StoredExperimentFoundationV2SnapshotIntegrityError(
      `${label} does not match its closed typed schema${details ? `: ${details}` : ''}`,
    );
  }
}
