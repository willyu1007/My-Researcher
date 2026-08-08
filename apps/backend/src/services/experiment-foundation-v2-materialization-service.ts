import { randomUUID } from 'node:crypto';

import type {
  ExperimentFoundationReadinessAttestationV2,
  ExperimentFoundationRunRecipeSnapshotV2,
  ExperimentFoundationRunRecipeV2,
  ExperimentFoundationTrainingTaskIoSnapshotV2,
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationVersionLockDependencyV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationExecutableRunRecipeSnapshotV2,
  ExperimentFoundationExecutableRunRecipeV2,
  ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2,
  ExperimentFoundationExecutableTrainingTaskSpecV2,
  ExperimentFoundationExecutionBundleExactRevisionRefV2,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentFoundationV2ReadinessDependencyManifest,
  serverHashExperimentFoundationV2RunManifest,
  serverHashExperimentFoundationV2RunRecipe,
  serverHashExperimentFoundationV2TrainingTaskSpec,
  serverHashExperimentFoundationV2VersionLock,
  serverHashExperimentFoundationV2VersionLockDependencyManifest,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
  verifyExperimentV2EventPayloadHash,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ExperimentFoundationIntegrationInboxV2,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../errors/app-error.js';
import {
  EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationExperimentSpineV2Repository,
  type ExperimentFoundationV2MaterializationBundle,
} from '../repositories/experiment-spine-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
const D19_DEPENDENCY_COUNTS = {
  Dataset: 2,
  DataPolicy: 2,
  MetricDefinition: 17,
  Benchmark: 1,
  EvaluationProtocol: 1,
} as const;

export interface ExperimentFoundationV2ExactReadinessResolution {
  attestation: ExperimentFoundationReadinessAttestationV2;
  /** Exact ordered transitive manifest; the target protocol is excluded. */
  ordered_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
}

export interface ExperimentFoundationV2ReadinessResolver {
  resolvePassedExactReadiness(input: {
    readiness_attestation_id: string;
    readiness_attestation_hash: string;
    target: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'EvaluationProtocol' };
    /** Exact ordered transitive manifest; the target protocol is excluded. */
    ordered_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
  }): Promise<ExperimentFoundationV2ExactReadinessResolution | null>;
}

export interface ExperimentFoundationV2MaterializationServiceOptions {
  repository: ExperimentFoundationExperimentSpineV2Repository;
  readinessResolver: ExperimentFoundationV2ReadinessResolver;
  cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  executionBundleResolver?: ExperimentFoundationV2ExecutionBundleResolver;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export interface ExperimentFoundationV2ExecutionBundleResolver {
  resolveActiveReadyExact(input: {
    execution_bundle_revision_id: string;
    content_hash: string;
  }): Promise<{
    revision: ExperimentFoundationExecutionBundleRevisionV2;
  }>;
}

function integrationError(
  message: string,
  reasonCode: string,
  topLevel: 'INVALID_PAYLOAD' | 'VERSION_CONFLICT' | 'GATE_CONSTRAINT_FAILED' = 'VERSION_CONFLICT',
): AppError {
  const statusCode = topLevel === 'INVALID_PAYLOAD'
    ? 400
    : topLevel === 'GATE_CONSTRAINT_FAILED'
      ? 422
      : 409;
  return new AppError(statusCode, topLevel, message, {
    reason_code: reasonCode,
  });
}

function exactJsonEqual(left: unknown, right: unknown): boolean {
  return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
}

function scopeFromEvent(event: WorkOrderRevisionAdmittedEventV1) {
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

function assertWorkOrderRevisionAdmittedEventV1(
  event: WorkOrderRevisionAdmittedEventV1,
): void {
  if ((event as { event_type?: string }).event_type !== 'WorkOrderRevisionAdmitted') {
    throw integrationError(
      'Unsupported integration event type.',
      'INTEGRATION_EVENT_TYPE_UNSUPPORTED',
      'INVALID_PAYLOAD',
    );
  }
  if ((event as { schema_version?: string }).schema_version !== 'v1') {
    throw integrationError(
      'Unsupported integration event version.',
      'INTEGRATION_EVENT_VERSION_UNSUPPORTED',
      'INVALID_PAYLOAD',
    );
  }
  if ((event as { producer_domain?: string }).producer_domain !== 'PaperImplementation') {
    throw integrationError(
      'Integration event producer is invalid.',
      'INTEGRATION_EVENT_PRODUCER_INVALID',
      'INVALID_PAYLOAD',
    );
  }
  if (!verifyExperimentV2EventPayloadHash(event)) {
    throw integrationError(
      'Integration event payload hash does not match its payload.',
      'INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH',
    );
  }

  const revisionHash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    event.payload.work_order_revision,
  );
  if (revisionHash !== event.work_order_revision_hash) {
    throw integrationError('WorkOrder revision hash drifted.', 'SERVER_CANONICAL_HASH_MISMATCH');
  }
  if (
    event.payload.readiness_attestation_id
      !== event.payload.work_order_revision.readiness_attestation_id
    || event.payload.readiness_attestation_hash
      !== event.payload.work_order_revision.readiness_attestation_hash
    || !exactJsonEqual(
      event.payload.asset_dependencies,
      event.payload.work_order_revision.asset_dependencies,
    )
  ) {
    throw integrationError('Readiness binding drifted inside the event.', 'READINESS_DEPENDENCY_DRIFT');
  }
  if (event.payload.exact_cells.length === 0) {
    throw integrationError('Admitted event has no exact cells.', 'RUN_CELL_PARITY_MISMATCH');
  }

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const cellRows = event.payload.exact_cells.map((cell, index) => {
    if (
      cell.ordinal !== index + 1
      || seenIds.has(cell.work_order_cell_id)
      || seenKeys.has(cell.cell_key)
    ) {
      throw integrationError('Admitted cells are not a unique ordered 1..N list.', 'RUN_CELL_PARITY_MISMATCH');
    }
    seenIds.add(cell.work_order_cell_id);
    seenKeys.add(cell.cell_key);
    const cellHash = serverHashPaperImplementationExperimentV2Cell({
      cell_key: cell.cell_key,
      seed: cell.seed,
      repeat_index: cell.repeat_index,
      parameters: cell.parameters,
      required_result_contract: cell.required_result_contract,
    });
    if (cellHash !== cell.cell_hash) {
      throw integrationError('Admitted cell hash drifted.', 'SERVER_CANONICAL_HASH_MISMATCH');
    }
    return { ordinal: cell.ordinal, cell_hash: cell.cell_hash };
  });
  const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(cellRows);
  if (cellPlanHash !== event.cell_plan_hash) {
    throw integrationError('Admitted cell-plan hash drifted.', 'SERVER_CANONICAL_HASH_MISMATCH');
  }
  const approvedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: event.payload.branch_frame_hash,
    work_order_revision_hash: revisionHash,
    cell_plan_hash: cellPlanHash,
  });
  if (approvedPlanHash !== event.approved_plan_hash) {
    throw integrationError('Approved-plan hash drifted.', 'SERVER_CANONICAL_HASH_MISMATCH');
  }
}

function assertD19DependencyParity(
  eventDependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
  readiness: ExperimentFoundationV2ExactReadinessResolution,
): string {
  if (eventDependencies.length !== 23 || readiness.ordered_dependencies.length !== 22) {
    throw integrationError(
      'D-19 requires exactly 23 locked dependencies.',
      'READINESS_DEPENDENCY_DRIFT',
      'GATE_CONSTRAINT_FAILED',
    );
  }
  const protocolTargets = eventDependencies.filter(
    (dependency): dependency is ExperimentFoundationV2ExactAssetRevisionRef & {
      asset_type: 'EvaluationProtocol';
    } => dependency.asset_type === 'EvaluationProtocol',
  );
  const transitiveDependencies = eventDependencies.filter(
    (dependency) => dependency.asset_type !== 'EvaluationProtocol',
  );
  if (
    protocolTargets.length !== 1
    || !exactJsonEqual(readiness.attestation.target, protocolTargets[0])
    || !exactJsonEqual(transitiveDependencies, readiness.ordered_dependencies)
  ) {
    throw integrationError(
      'Readiness and WorkOrder ordered dependency manifests differ.',
      'READINESS_DEPENDENCY_DRIFT',
      'GATE_CONSTRAINT_FAILED',
    );
  }

  const counts = new Map<string, number>();
  for (const dependency of eventDependencies) {
    counts.set(dependency.asset_type, (counts.get(dependency.asset_type) ?? 0) + 1);
  }
  for (const [assetType, expectedCount] of Object.entries(D19_DEPENDENCY_COUNTS)) {
    if (counts.get(assetType) !== expectedCount) {
      throw integrationError(
        `D-19 dependency count mismatch for ${assetType}.`,
        'READINESS_DEPENDENCY_DRIFT',
        'GATE_CONSTRAINT_FAILED',
      );
    }
  }

  const readinessDependencyManifestHash =
    serverHashExperimentFoundationV2ReadinessDependencyManifest(transitiveDependencies);
  if (readiness.attestation.dependency_manifest_hash !== readinessDependencyManifestHash) {
    throw integrationError(
      'Readiness dependency manifest hash drifted.',
      'READINESS_DEPENDENCY_DRIFT',
      'GATE_CONSTRAINT_FAILED',
    );
  }
  // VersionLock includes the protocol target plus all 22 transitive refs.
  return serverHashExperimentFoundationV2VersionLockDependencyManifest(eventDependencies);
}

export function deriveExperimentFoundationV2RunManifestHash(
  rows: Array<{
    ordinal: number;
    cell_key: string;
    external_pi_cell_id: string;
    external_pi_cell_hash: string;
    training_task_spec_id: string;
    training_task_spec_hash: string;
    seed: number;
    repeat_index: number;
  }>,
): string {
  return serverHashExperimentFoundationV2RunManifest(rows);
}

function mapRepositoryError(error: ExperimentSpineV2RepositoryConstraintError): AppError {
  if (
    error.reasonCode === 'READINESS_DEPENDENCY_DRIFT'
    || error.reasonCode === 'CYCLE_ALREADY_CLOSED'
  ) {
    return new AppError(422, 'GATE_CONSTRAINT_FAILED', error.message, {
      reason_code: error.reasonCode,
    });
  }
  return new AppError(409, 'VERSION_CONFLICT', error.message, {
    reason_code: error.reasonCode,
  });
}

export class ExperimentFoundationV2MaterializationService {
  private readonly repository: ExperimentFoundationExperimentSpineV2Repository;
  private readonly readinessResolver: ExperimentFoundationV2ReadinessResolver;
  private readonly cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  private readonly executionBundleResolver?: ExperimentFoundationV2ExecutionBundleResolver;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: ExperimentFoundationV2MaterializationServiceOptions) {
    this.repository = options.repository;
    this.readinessResolver = options.readinessResolver;
    this.cycleClosureLookup = options.cycleClosureLookup;
    this.executionBundleResolver = options.executionBundleResolver;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async consume(
    event: WorkOrderRevisionAdmittedEventV1,
  ): Promise<ExperimentFoundationV2MaterializationBundle> {
    try {
      return await this.consumeValidated(event);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw mapRepositoryError(error);
      }
      throw error;
    }
  }

  private async consumeValidated(
    event: WorkOrderRevisionAdmittedEventV1,
  ): Promise<ExperimentFoundationV2MaterializationBundle> {
    assertWorkOrderRevisionAdmittedEventV1(event);

    const eventReplay = await this.repository.findInboxByEvent(
      EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
      event.event_id,
    );
    if (eventReplay) {
      if (eventReplay.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
        throw integrationError(
          'Integration event id was reused with a changed payload.',
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        );
      }
      const stored = await this.repository.findMaterializationByRevision(
        event.work_order_revision_id,
      );
      if (!stored) {
        throw integrationError(
          'Processed materialization inbox has no durable materialization.',
          'INTEGRATION_PREREQUISITE_NOT_READY',
        );
      }
      return stored;
    }

    const businessReplay = await this.repository.findInboxByBusinessKey(
      EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
      event.implementation_project_id,
      event.validation_cycle_id,
      event.branch_id,
      event.business_idempotency_key,
    );
    if (businessReplay) {
      if (businessReplay.source_event_hash !== serverHashExperimentV2EventEnvelope(event)) {
        throw integrationError(
          'Integration business idempotency key was reused with a changed payload.',
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        );
      }
      const stored = await this.repository.findMaterializationByRevision(
        event.work_order_revision_id,
      );
      if (stored) {
        return stored;
      }
    }

    // Inbox-backed materialization replay remains valid after Cycle closure.
    // Only a first materialization delivery reaches this fast path and the
    // repository's transaction-internal closure fence.
    if (await this.cycleClosureLookup.isCycleClosed(event.validation_cycle_id)) {
      throw integrationError(
        'A closed ValidationCycle cannot materialize another EF Run lineage.',
        'CYCLE_ALREADY_CLOSED',
        'GATE_CONSTRAINT_FAILED',
      );
    }

    const protocolTargets = event.payload.asset_dependencies.filter(
      (dependency): dependency is ExperimentFoundationV2ExactAssetRevisionRef & {
        asset_type: 'EvaluationProtocol';
      } => dependency.asset_type === 'EvaluationProtocol',
    );
    if (protocolTargets.length !== 1) {
      throw integrationError(
        'D-19 requires one exact EvaluationProtocol readiness target.',
        'READINESS_DEPENDENCY_DRIFT',
        'GATE_CONSTRAINT_FAILED',
      );
    }
    const transitiveDependencies = event.payload.asset_dependencies.filter(
      (dependency) => dependency.asset_type !== 'EvaluationProtocol',
    );
    const readiness = await this.readinessResolver.resolvePassedExactReadiness({
      readiness_attestation_id: event.payload.readiness_attestation_id,
      readiness_attestation_hash: event.payload.readiness_attestation_hash,
      target: protocolTargets[0]!,
      ordered_dependencies: transitiveDependencies,
    });
    if (
      !readiness
      || readiness.attestation.readiness_attestation_id
        !== event.payload.readiness_attestation_id
      || readiness.attestation.attestation_hash !== event.payload.readiness_attestation_hash
      || readiness.attestation.status !== 'passed'
    ) {
      throw integrationError(
        'Exact passed readiness attestation is not available.',
        'READINESS_DEPENDENCY_DRIFT',
        'GATE_CONSTRAINT_FAILED',
      );
    }
    const executableWorkOrder = event.payload.work_order_revision.work_order_schema_version === 'v2'
      ? event.payload.work_order_revision
      : null;
    if (executableWorkOrder && event.payload.exact_cells.length !== 2) {
      throw integrationError(
        'M7 executable WorkOrders require the exact reviewed two-cell batch.',
        'RUN_CELL_PARITY_MISMATCH',
        'GATE_CONSTRAINT_FAILED',
      );
    }
    if (executableWorkOrder && !this.executionBundleResolver) {
      throw integrationError(
        'ExecutionBundle resolver is unavailable for executable WorkOrder materialization.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        'GATE_CONSTRAINT_FAILED',
      );
    }
    const executionBundle = executableWorkOrder
      ? await this.executionBundleResolver!.resolveActiveReadyExact({
        execution_bundle_revision_id:
          executableWorkOrder.execution_bundle.execution_bundle_revision_id,
        content_hash: executableWorkOrder.execution_bundle.content_hash,
      })
      : null;
    if (
      executableWorkOrder
      && (
        executionBundle!.revision.execution_bundle_id
          !== executableWorkOrder.execution_bundle.execution_bundle_id
        || executionBundle!.revision.revision_sequence
          !== executableWorkOrder.execution_bundle.revision_sequence
      )
    ) {
      throw integrationError(
        'ExecutionBundle exact identity/sequence binding drifted.',
        'INTEGRATION_PREREQUISITE_NOT_READY',
        'GATE_CONSTRAINT_FAILED',
      );
    }
    const dependencyManifestHash = assertD19DependencyParity(
      event.payload.asset_dependencies,
      readiness,
    );

    const createdAt = this.now();
    const materializationKey = `${event.work_order_revision_id}:${event.approved_plan_hash}`;
    const versionLockId = this.idFactory('ef_version_lock_v2');
    const lockContent = {
      materialization_key: materializationKey,
      readiness_attestation_id: event.payload.readiness_attestation_id,
      readiness_attestation_hash: event.payload.readiness_attestation_hash,
      dependency_manifest_hash: dependencyManifestHash,
      dependencies: event.payload.asset_dependencies.map((dependency, index) => ({
        ordinal: index + 1,
        dependency,
      })),
    };
    const versionLockHash = serverHashExperimentFoundationV2VersionLock(lockContent);
    const versionLock = {
      version_lock_id: versionLockId,
      materialization_key: materializationKey,
      readiness_attestation_id: event.payload.readiness_attestation_id,
      readiness_attestation_hash: event.payload.readiness_attestation_hash,
      dependency_manifest_hash: dependencyManifestHash,
      dependency_count: event.payload.asset_dependencies.length,
      lock_hash: versionLockHash,
      created_at: createdAt,
    };
    const versionLockDependencies: ExperimentFoundationVersionLockDependencyV2[] =
      event.payload.asset_dependencies.map((dependency, index) => ({
        version_lock_id: versionLockId,
        ordinal: index + 1,
        dependency,
      }));

    const runRecipeId = this.idFactory('ef_run_recipe_v2');
    const executionBundleRef: ExperimentFoundationExecutionBundleExactRevisionRefV2 | null =
      executableWorkOrder ? structuredClone(executableWorkOrder.execution_bundle) : null;
    const executableRecipeSnapshot: ExperimentFoundationExecutableRunRecipeSnapshotV2 | null =
      executionBundleRef && executionBundle
      ? {
        recipe_schema_version: 'v2' as const,
        execution_bundle: executionBundleRef,
        entrypoint: executionBundle.revision.revision_content.entrypoint,
        arguments: [...executionBundle.revision.revision_content.arguments],
        dependency_lock_digest:
          executionBundle.revision.revision_content.dependency_lock_digest,
        environment_keys: [],
        output_contract: structuredClone(
          executionBundle.revision.revision_content.output_contract,
        ),
      }
      : null;
    const simulationRecipeSnapshot: ExperimentFoundationRunRecipeSnapshotV2 = {
      recipe_schema_version: 'v1',
      entrypoint: 'experiment-foundation-v2://d19/materialize-only',
      arguments: [],
      environment_keys: [],
    };
    const recipeSnapshot = executableRecipeSnapshot ?? simulationRecipeSnapshot;
    const recipeHash = serverHashExperimentFoundationV2RunRecipe({
      materialization_key: materializationKey,
      version_lock_id: versionLockId,
      readiness_attestation_id: event.payload.readiness_attestation_id,
      recipe_snapshot: recipeSnapshot,
    });
    const runRecipe: ExperimentFoundationRunRecipeV2
      | ExperimentFoundationExecutableRunRecipeV2 =
      executionBundleRef && executableRecipeSnapshot ? {
      run_recipe_id: runRecipeId,
      materialization_key: materializationKey,
      version_lock_id: versionLockId,
      readiness_attestation_id: event.payload.readiness_attestation_id,
      recipe_snapshot: executableRecipeSnapshot,
      recipe_hash: recipeHash,
      created_at: createdAt,
      execution_bundle: executionBundleRef,
    } : {
      run_recipe_id: runRecipeId,
      materialization_key: materializationKey,
      version_lock_id: versionLockId,
      readiness_attestation_id: event.payload.readiness_attestation_id,
      recipe_snapshot: simulationRecipeSnapshot,
      recipe_hash: recipeHash,
      created_at: createdAt,
    };

    const taskSpecs: Array<
      ExperimentFoundationTrainingTaskSpecV2 | ExperimentFoundationExecutableTrainingTaskSpecV2
    > = event.payload.exact_cells.map((cell) => {
      const trainingTaskSpecId = this.idFactory('ef_training_task_spec_v2');
      const taskMaterializationKey = `${materializationKey}:cell:${cell.ordinal}`;
      const resourceSnapshot = executableWorkOrder?.resource_snapshot
        ?? { cpu_cores: 1, memory_mb: 512 };
      if (executionBundleRef && executionBundle) {
        const commandSnapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['command_snapshot'] = {
          command: executionBundle.revision.revision_content.entrypoint,
          arguments: [
            ...executionBundle.revision.revision_content.arguments,
            `--cell-key=${cell.cell_key}`,
          ],
        };
        const scientificSchemaVersion = executionBundle.revision.revision_content
          .output_contract.scientific_result_schema_version;
        const scientificSchemaHash = executionBundle.revision.revision_content
          .output_contract.scientific_result_schema_hash;
        if ((scientificSchemaVersion === undefined) !== (scientificSchemaHash === undefined)) {
          throw new Error('ExecutionBundle scientific result-schema binding is partial.');
        }
        const ioSnapshot: ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2['io_snapshot'] = {
          input_keys: [
            'version_lock',
            'admitted_cell',
            ...executionBundle.revision.revision_content.dataset_mirrors.map(
              (mirror) => `dataset_mirror:${mirror.ordinal}`,
            ),
          ],
          output_keys: ['real_provider_result_envelope'],
          input_mirror_ordinals:
            executionBundle.revision.revision_content.dataset_mirrors.map(
              (mirror) => mirror.ordinal,
            ),
          result_object_name:
            executionBundle.revision.revision_content.output_contract.result_object_name,
          result_envelope_schema:
            executionBundle.revision.revision_content.output_contract.result_envelope_schema,
          parser_profile_version:
            executionBundle.revision.revision_content.output_contract.parser_profile_version,
          parser_profile_hash:
            executionBundle.revision.revision_content.output_contract.parser_profile_hash,
          ...(scientificSchemaVersion && scientificSchemaHash
            ? {
              scientific_result_schema_version: scientificSchemaVersion,
              scientific_result_schema_hash: scientificSchemaHash,
            }
            : {}),
        };
        const retrySnapshot = {
          max_attempts: event.payload.work_order_revision.run_policy.max_attempts_per_cell,
          timeout_seconds: event.payload.work_order_revision.run_policy.timeout_seconds,
        };
        const taskSpecHash = serverHashExperimentFoundationV2TrainingTaskSpec({
          task_spec_schema_version: 'v2',
          execution_bundle: executionBundleRef,
          materialization_key: taskMaterializationKey,
          run_recipe_id: runRecipeId,
          external_pi_work_order_revision_id: event.work_order_revision_id,
          external_pi_work_order_revision_hash: event.work_order_revision_hash,
          external_pi_cell_id: cell.work_order_cell_id,
          external_pi_cell_hash: cell.cell_hash,
          admitted_cell: cell,
          command_snapshot: commandSnapshot,
          io_snapshot: ioSnapshot,
          resource_snapshot: resourceSnapshot,
          retry_snapshot: retrySnapshot,
        });
        return {
          training_task_spec_id: trainingTaskSpecId,
          materialization_key: taskMaterializationKey,
          run_recipe_id: runRecipeId,
          external_pi_work_order_revision_id: event.work_order_revision_id,
          external_pi_work_order_revision_hash: event.work_order_revision_hash,
          external_pi_cell_id: cell.work_order_cell_id,
          external_pi_cell_hash: cell.cell_hash,
          execution_bundle: executionBundleRef,
          command_snapshot: commandSnapshot,
          io_snapshot: ioSnapshot,
          resource_snapshot: resourceSnapshot,
          retry_snapshot: retrySnapshot,
          task_spec_hash: taskSpecHash,
          created_at: createdAt,
        };
      }

      const commandSnapshot = {
        command: 'experiment-foundation-v2:materialize-cell',
        arguments: [cell.cell_key],
      };
      const ioSnapshot: ExperimentFoundationTrainingTaskIoSnapshotV2 = {
        input_keys: ['version_lock', 'admitted_cell'],
        output_keys: ['simulation_lifecycle_trace'],
      };
      const retrySnapshot = {
        max_attempts: event.payload.work_order_revision.run_policy.max_attempts_per_cell,
      };
      const taskSpecHash = serverHashExperimentFoundationV2TrainingTaskSpec({
        materialization_key: taskMaterializationKey,
        run_recipe_id: runRecipeId,
        external_pi_work_order_revision_id: event.work_order_revision_id,
        external_pi_work_order_revision_hash: event.work_order_revision_hash,
        external_pi_cell_id: cell.work_order_cell_id,
        external_pi_cell_hash: cell.cell_hash,
        admitted_cell: cell,
        command_snapshot: commandSnapshot,
        io_snapshot: ioSnapshot,
        resource_snapshot: resourceSnapshot,
        retry_snapshot: retrySnapshot,
      });
      return {
        training_task_spec_id: trainingTaskSpecId,
        materialization_key: taskMaterializationKey,
        run_recipe_id: runRecipeId,
        external_pi_work_order_revision_id: event.work_order_revision_id,
        external_pi_work_order_revision_hash: event.work_order_revision_hash,
        external_pi_cell_id: cell.work_order_cell_id,
        external_pi_cell_hash: cell.cell_hash,
        command_snapshot: commandSnapshot,
        io_snapshot: ioSnapshot,
        resource_snapshot: resourceSnapshot,
        retry_snapshot: retrySnapshot,
        task_spec_hash: taskSpecHash,
        created_at: createdAt,
      };
    });

    const runId = this.idFactory('ef_run_v2');
    const runCells = event.payload.exact_cells.map((cell, index) => ({
      run_cell_id: this.idFactory('ef_run_cell_v2'),
      run_id: runId,
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      external_pi_cell_id: cell.work_order_cell_id,
      external_pi_cell_hash: cell.cell_hash,
      training_task_spec_id: taskSpecs[index]!.training_task_spec_id,
      training_task_spec_hash: taskSpecs[index]!.task_spec_hash,
      seed: cell.seed,
      repeat_index: cell.repeat_index,
    }));
    const runManifestHash = deriveExperimentFoundationV2RunManifestHash(runCells);
    const run = {
      run_id: runId,
      external_pi_work_order_revision_id: event.work_order_revision_id,
      external_pi_work_order_revision_hash: event.work_order_revision_hash,
      external_pi_branch_revision_sequence: event.branch_revision_sequence,
      run_manifest_hash: runManifestHash,
      cell_count: runCells.length,
      frozen_at: createdAt,
    };

    const inbox: ExperimentFoundationIntegrationInboxV2 = {
      inbox_id: this.idFactory('ef_integration_inbox_v2'),
      consumer_name: EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER,
      source_event_id: event.event_id,
      business_idempotency_key: event.business_idempotency_key,
      payload_hash: event.payload_hash,
      source_event_hash: serverHashExperimentV2EventEnvelope(event),
      scope: scopeFromEvent(event),
      outcome: 'processed',
      reason_code: null,
      processed_at: createdAt,
    };
    const frozenPayload: RunManifestFrozenEventV1['payload'] = {
      source_event_id: event.event_id,
      version_lock_id: versionLockId,
      version_lock_hash: versionLockHash,
      run_recipe_id: runRecipeId,
      run_recipe_hash: recipeHash,
      run_id: runId,
      run_manifest_hash: runManifestHash,
      task_spec_bindings: runCells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.external_pi_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.external_pi_cell_hash,
        training_task_spec_id: cell.training_task_spec_id,
        training_task_spec_hash: cell.training_task_spec_hash,
      })),
    };
    const frozenEvent: RunManifestFrozenEventV1 = {
      event_id: this.idFactory('ef_integration_event_v2'),
      event_type: 'RunManifestFrozen',
      schema_version: 'v1',
      producer_domain: 'ExperimentFoundation',
      occurred_at: createdAt,
      correlation_id: event.correlation_id,
      causation_id: event.event_id,
      business_idempotency_key: event.business_idempotency_key,
      ...scopeFromEvent(event),
      payload_hash: serverHashExperimentV2EventPayload('RunManifestFrozen', 'v1', frozenPayload),
      payload: frozenPayload,
    };
    const bundle: ExperimentFoundationV2MaterializationBundle = {
      inbox,
      version_lock: versionLock,
      version_lock_dependencies: versionLockDependencies,
      run_recipe: runRecipe,
      task_specs: taskSpecs,
      run,
      run_cells: runCells,
      outbox: {
        outbox_id: this.idFactory('ef_integration_outbox_v2'),
        aggregate_transition_key: `${event.work_order_revision_id}:run-manifest-frozen`,
        event: frozenEvent,
        created_at: createdAt,
      },
    };

    return this.repository.commitMaterialization(bundle, event);
  }
}
