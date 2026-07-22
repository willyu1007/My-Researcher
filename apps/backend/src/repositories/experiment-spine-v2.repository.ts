import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunRecipeV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationVersionLockDependencyV2,
  ExperimentFoundationVersionLockV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  BranchHeadAdvancedEventV1,
  ExperimentFoundationIntegrationInboxV2,
  ExperimentFoundationIntegrationOutboxV2,
  ExperimentV2IntegrationEvent,
  PaperImplementationExperimentIntegrationInboxV2,
  PaperImplementationExperimentIntegrationOutboxV2,
  PaperImplementationExperimentWorkOrderAdmissionV2,
  PaperImplementationExperimentWorkOrderBranchV2,
  PaperImplementationExperimentWorkOrderRevisionCellV2,
  PaperImplementationExperimentWorkOrderRevisionV2,
  RunEvidenceUnitRegisteredEventV1,
  RunManifestFrozenEventV1,
  ValidationCycleClosedEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

export type ExperimentV2RelayDomain = 'PaperImplementation' | 'ExperimentFoundation';

export const EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER =
  'experiment-foundation-v2-head-acknowledger';
export const EXPERIMENT_FOUNDATION_V2_MATERIALIZATION_CONSUMER =
  'experiment-foundation-v2-materializer';
export const PAPER_IMPLEMENTATION_PROJECTION_FEED_V2_CONSUMER =
  'pi-projection-feed-v2';

export type PaperImplementationProjectionFeedV2Event =
  | RunEvidenceUnitRegisteredEventV1
  | ValidationCycleClosedEventV1;

export type PaperImplementationInboxSourceEventV2 =
  | RunManifestFrozenEventV1
  | PaperImplementationProjectionFeedV2Event;

export interface ExperimentV2RelayClaim {
  owner_domain: ExperimentV2RelayDomain;
  outbox_id: string;
  event: ExperimentV2IntegrationEvent;
  relay_attempt_count: number;
  lease_owner: string;
  lease_expires_at: string;
}

export interface ExperimentV2RelayClaimInput {
  lease_owner: string;
  claimed_at: string;
  lease_expires_at: string;
  limit: number;
}

export interface ExperimentV2RelayReleaseInput {
  outbox_id: string;
  lease_owner: string;
  error_code: string;
  next_attempt_at: string;
  released_at: string;
}

export interface ExperimentV2RelayTerminalInput {
  outbox_id: string;
  lease_owner: string;
  error_code: string;
  terminal_at: string;
}

export class ExperimentSpineV2RepositoryConstraintError extends Error {
  constructor(
    public readonly reasonCode:
      | 'ADMISSION_IDEMPOTENCY_CONFLICT'
      | 'BRANCH_SCOPE_CONFLICT'
      | 'BRANCH_REVISION_CONFLICT'
      | 'BRANCH_CAS_CONFLICT'
      | 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
      | 'INTEGRATION_PREREQUISITE_NOT_READY'
      | 'MATERIALIZATION_KEY_CONFLICT'
      | 'RUN_ALREADY_FROZEN'
      | 'RUN_MANIFEST_CONFLICT'
      | 'RUN_CELL_PARITY_MISMATCH'
      | 'READINESS_DEPENDENCY_DRIFT'
      | 'BRANCH_HEAD_SCOPE_CONFLICT'
      | 'BRANCH_HEAD_CAS_CONFLICT'
      | 'CYCLE_ALREADY_CLOSED'
      | 'OUTBOX_LEASE_CONFLICT',
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentSpineV2RepositoryConstraintError';
  }
}

export interface PaperImplementationExperimentV2AdmissionBundle {
  branch: PaperImplementationExperimentWorkOrderBranchV2;
  revision: PaperImplementationExperimentWorkOrderRevisionV2;
  cells: PaperImplementationExperimentWorkOrderRevisionCellV2[];
  admission: PaperImplementationExperimentWorkOrderAdmissionV2;
  outbox: PaperImplementationExperimentIntegrationOutboxV2 & {
    event: WorkOrderRevisionAdmittedEventV1;
  };
}

export interface PaperImplementationExperimentV2CommitAdmissionInput
  extends PaperImplementationExperimentV2AdmissionBundle {
  expected_branch_state_version: number | null;
}

export interface PaperImplementationExperimentV2CommitHeadInput {
  expected_branch_state_version: number;
  branch: PaperImplementationExperimentWorkOrderBranchV2;
  inbox: PaperImplementationExperimentIntegrationInboxV2;
  outbox: PaperImplementationExperimentIntegrationOutboxV2 & {
    event: BranchHeadAdvancedEventV1;
  };
}

export interface PaperImplementationExperimentSpineV2Repository {
  findBranch(
    implementationProjectId: string,
    validationCycleId: string,
    branchKey: string,
  ): Promise<PaperImplementationExperimentWorkOrderBranchV2 | null>;

  findAdmissionByBusinessKey(
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle | null>;

  findRevisionBundle(
    branchId: string,
    workOrderRevisionId: string,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle | null>;

  commitAdmission(
    input: PaperImplementationExperimentV2CommitAdmissionInput,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle>;

  findInboxByEvent(
    consumerName: string,
    eventId: string,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2 | null>;

  findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2 | null>;

  verifyProcessedHeadReplay(
    consumerName: string,
    sourceEvent: RunManifestFrozenEventV1,
  ): Promise<PaperImplementationExperimentWorkOrderBranchV2>;

  recordInboxOutcome(
    inbox: PaperImplementationExperimentIntegrationInboxV2,
    sourceEvent: PaperImplementationInboxSourceEventV2,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2>;

  commitHeadAdvance(
    input: PaperImplementationExperimentV2CommitHeadInput,
    sourceEvent: RunManifestFrozenEventV1,
  ): Promise<PaperImplementationExperimentV2CommitHeadInput>;

  claimOutbox(input: ExperimentV2RelayClaimInput): Promise<ExperimentV2RelayClaim[]>;
  markOutboxDelivered(outboxId: string, leaseOwner: string, deliveredAt: string): Promise<void>;
  markOutboxTerminal(input: ExperimentV2RelayTerminalInput): Promise<void>;
  releaseOutbox(input: ExperimentV2RelayReleaseInput): Promise<void>;
}

export interface ExperimentFoundationV2MaterializationBundle {
  inbox: ExperimentFoundationIntegrationInboxV2;
  version_lock: ExperimentFoundationVersionLockV2;
  version_lock_dependencies: ExperimentFoundationVersionLockDependencyV2[];
  run_recipe: ExperimentFoundationRunRecipeV2;
  task_specs: ExperimentFoundationTrainingTaskSpecV2[];
  run: ExperimentFoundationRunV2;
  run_cells: ExperimentFoundationRunCellV2[];
  outbox: ExperimentFoundationIntegrationOutboxV2 & {
    event: RunManifestFrozenEventV1;
  };
}

export interface ExperimentFoundationV2MaterializationReadinessGuard {
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  target: ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'EvaluationProtocol' };
  /** Exact ordered transitive dependency manifest; excludes the target protocol. */
  ordered_dependencies: ExperimentFoundationV2ExactAssetRevisionRef[];
}

export function deriveExperimentFoundationV2MaterializationReadinessGuard(
  bundle: ExperimentFoundationV2MaterializationBundle,
  sourceEvent: WorkOrderRevisionAdmittedEventV1,
): ExperimentFoundationV2MaterializationReadinessGuard {
  const targets = sourceEvent.payload.asset_dependencies.filter(
    (dependency): dependency is ExperimentFoundationV2ExactAssetRevisionRef & {
      asset_type: 'EvaluationProtocol';
    } => dependency.asset_type === 'EvaluationProtocol',
  );
  if (
    targets.length !== 1
    || bundle.version_lock.readiness_attestation_id
      !== sourceEvent.payload.readiness_attestation_id
    || bundle.version_lock.readiness_attestation_hash
      !== sourceEvent.payload.readiness_attestation_hash
  ) {
    throw new ExperimentSpineV2RepositoryConstraintError(
      'READINESS_DEPENDENCY_DRIFT',
      'Materialization does not bind one exact EvaluationProtocol readiness attestation.',
    );
  }
  return {
    readiness_attestation_id: sourceEvent.payload.readiness_attestation_id,
    readiness_attestation_hash: sourceEvent.payload.readiness_attestation_hash,
    target: targets[0]!,
    ordered_dependencies: sourceEvent.payload.asset_dependencies.filter(
      (dependency) => dependency.asset_type !== 'EvaluationProtocol',
    ),
  };
}

export interface ExperimentFoundationExperimentSpineV2Repository {
  findInboxByEvent(
    consumerName: string,
    eventId: string,
  ): Promise<ExperimentFoundationIntegrationInboxV2 | null>;

  findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationIntegrationInboxV2 | null>;

  findMaterializationByRevision(
    workOrderRevisionId: string,
  ): Promise<ExperimentFoundationV2MaterializationBundle | null>;

  commitMaterialization(
    bundle: ExperimentFoundationV2MaterializationBundle,
    sourceEvent: WorkOrderRevisionAdmittedEventV1,
  ): Promise<ExperimentFoundationV2MaterializationBundle>;

  commitAcknowledgement(
    inbox: ExperimentFoundationIntegrationInboxV2,
    sourceEvent: BranchHeadAdvancedEventV1,
  ): Promise<ExperimentFoundationIntegrationInboxV2>;

  claimOutbox(input: ExperimentV2RelayClaimInput): Promise<ExperimentV2RelayClaim[]>;
  markOutboxDelivered(outboxId: string, leaseOwner: string, deliveredAt: string): Promise<void>;
  markOutboxTerminal(input: ExperimentV2RelayTerminalInput): Promise<void>;
  releaseOutbox(input: ExperimentV2RelayReleaseInput): Promise<void>;
}
