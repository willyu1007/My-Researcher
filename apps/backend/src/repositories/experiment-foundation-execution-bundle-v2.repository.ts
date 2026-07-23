import type {
  ExperimentFoundationExecutionBundleDraftV2,
  ExperimentFoundationExecutionBundleIdentityV2,
  ExperimentFoundationExecutionBundleLifecycleEventV2,
  ExperimentFoundationExecutionBundleLifecycleProjectionV2,
  ExperimentFoundationExecutionBundleReadinessV2,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';

type ExperimentFoundationExecutionBundleV2ReasonCode =
  | 'EXECUTION_BUNDLE_INVALID'
  | 'EXECUTION_BUNDLE_CONFLICT'
  | 'EXECUTION_BUNDLE_NOT_READY'
  | 'EXECUTION_BUNDLE_SCOPE_DRIFT';

export class ExperimentFoundationExecutionBundleV2ConstraintError extends Error {
  constructor(
    public readonly reasonCode: ExperimentFoundationExecutionBundleV2ReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationExecutionBundleV2ConstraintError';
  }
}

export interface ExperimentFoundationExecutionBundleDraftBundleV2 {
  identity: ExperimentFoundationExecutionBundleIdentityV2;
  draft: ExperimentFoundationExecutionBundleDraftV2;
  replayed: boolean;
}

export interface ExperimentFoundationExecutionBundleFrozenBundleV2 {
  identity: ExperimentFoundationExecutionBundleIdentityV2;
  draft: ExperimentFoundationExecutionBundleDraftV2;
  revision: ExperimentFoundationExecutionBundleRevisionV2;
  lifecycle_event: ExperimentFoundationExecutionBundleLifecycleEventV2;
  lifecycle_projection: ExperimentFoundationExecutionBundleLifecycleProjectionV2;
  readiness: ExperimentFoundationExecutionBundleReadinessV2;
  replayed: boolean;
}

export interface ExperimentFoundationExecutionBundlePutDraftInputV2 {
  identity: ExperimentFoundationExecutionBundleIdentityV2;
  draft: ExperimentFoundationExecutionBundleDraftV2;
  expected_draft_version: number | null;
}

export interface ExperimentFoundationExecutionBundleFreezeInputV2 {
  execution_bundle_id: string;
  expected_identity_state_version: number;
  expected_draft_version: number;
  revision: ExperimentFoundationExecutionBundleRevisionV2;
  lifecycle_event: ExperimentFoundationExecutionBundleLifecycleEventV2;
  lifecycle_projection: ExperimentFoundationExecutionBundleLifecycleProjectionV2;
  readiness: ExperimentFoundationExecutionBundleReadinessV2;
}

export interface ExperimentFoundationExecutionBundleV2Repository {
  findDraftByBundleKey(
    bundleKey: string,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2 | null>;

  putDraft(
    input: ExperimentFoundationExecutionBundlePutDraftInputV2,
  ): Promise<ExperimentFoundationExecutionBundleDraftBundleV2>;

  freezeActiveRevision(
    input: ExperimentFoundationExecutionBundleFreezeInputV2,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2>;

  findActiveReadyExact(
    executionBundleRevisionId: string,
    contentHash: string,
  ): Promise<ExperimentFoundationExecutionBundleFrozenBundleV2 | null>;
}
