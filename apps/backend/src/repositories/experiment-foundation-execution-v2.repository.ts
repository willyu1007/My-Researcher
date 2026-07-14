import type {
  ExperimentFoundationCollectionAttemptStateV2 as SharedCollectionAttemptStateV2,
  ExperimentFoundationExecutionAttemptEventTypeV2,
  ExperimentFoundationExecutionAttemptStateV2 as SharedExecutionAttemptStateV2,
  ExperimentFoundationExecutionModeV2,
  ExperimentFoundationExecutionProvenanceV2,
  ExperimentFoundationExecutionReasonCodeV2,
  ExperimentFoundationExecutionTerminalReasonCodeV2,
  ExperimentFoundationProviderCommandOperationV2,
  ExperimentFoundationProviderCommandStateV2 as SharedProviderCommandStateV2,
  ExperimentFoundationProvisionalOutputKindV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import type {
  ExperimentFoundationReadinessDependencyV2,
  ExperimentFoundationRunCellV2,
  ExperimentFoundationRunV2,
  ExperimentFoundationTrainingTaskSpecV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';

export type ExperimentFoundationExecutionAttemptStateV2 = SharedExecutionAttemptStateV2;
export type ExperimentFoundationCollectionAttemptStateV2 = SharedCollectionAttemptStateV2;
export type ExperimentFoundationProviderCommandKindV2 =
  ExperimentFoundationProviderCommandOperationV2;
export type ExperimentFoundationProviderCommandStateV2 = SharedProviderCommandStateV2;

export type ExperimentFoundationExecutionV2ReasonCode =
  ExperimentFoundationExecutionReasonCodeV2;

export class ExperimentFoundationExecutionV2ConstraintError extends Error {
  constructor(
    public readonly reasonCode: ExperimentFoundationExecutionV2ReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationExecutionV2ConstraintError';
  }
}

export interface ExperimentFoundationExecutionV2HeadAcknowledgement {
  inbox_id: string;
  event_id: string;
  event_payload_hash: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  work_order_revision_id: string;
  work_order_revision_hash: string;
  revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  processed_at: string;
}

export interface ExperimentFoundationExecutionV2Readiness {
  readiness_attestation_id: string;
  readiness_attestation_hash: string;
  target: ExperimentFoundationV2ExactAssetRevisionRef;
  ordered_dependencies: ExperimentFoundationReadinessDependencyV2[];
  evaluator_profile_version: string;
  evaluator_profile_hash: string;
  dependency_manifest_hash: string;
  outcome: string;
}

export interface ExperimentFoundationExecutionV2PrerequisiteCell {
  run_cell: ExperimentFoundationRunCellV2;
  task_spec: ExperimentFoundationTrainingTaskSpecV2;
  retry_ceiling: number;
}

export interface ExperimentFoundationExecutionV2Prerequisite {
  run: ExperimentFoundationRunV2;
  run_recipe_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  external_pi_branch_id: string;
  readiness: ExperimentFoundationExecutionV2Readiness;
  head_acknowledgement: ExperimentFoundationExecutionV2HeadAcknowledgement;
  latest_branch_head_acknowledgement: ExperimentFoundationExecutionV2HeadAcknowledgement;
  cells: ExperimentFoundationExecutionV2PrerequisiteCell[];
}

export interface ExperimentFoundationProviderPayloadV2Record {
  id: string;
  materialization_key: string;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  payload_schema: 'FakeAliyunPaiDlcSubmitPayload@v1';
  adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1';
  execution_mode: 'simulation';
  provenance: 'non_production_fake_provider';
  simulation_profile_version: string;
  /** Untrusted JSON read from persistence; services must validate it before use. */
  redacted_manifest: unknown;
  payload_hash: string;
  payload_byte_size: number;
  created_at: string;
}

export interface ExperimentFoundationExecutionAttemptV2Record {
  id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  provider_payload_id: string;
  provider_payload_hash: string;
  head_acknowledgement_inbox_id: string;
  attempt_sequence: number;
  workflow_business_key: string;
  workflow_request_hash: string;
  execution_mode: ExperimentFoundationExecutionModeV2;
  provenance: ExperimentFoundationExecutionProvenanceV2;
  provider_idempotency_key: string;
  lifecycle_state: ExperimentFoundationExecutionAttemptStateV2;
  state_version: number;
  external_job_ref: string | null;
  external_job_ref_hash: string | null;
  terminal_reason_code: ExperimentFoundationExecutionTerminalReasonCodeV2 | null;
  created_at: string;
  updated_at: string;
  terminal_at: string | null;
}

export interface ExperimentFoundationExecutionAttemptEventV2Record {
  id: string;
  execution_attempt_id: string;
  event_sequence: number;
  event_type: ExperimentFoundationExecutionAttemptEventTypeV2;
  prior_state: ExperimentFoundationExecutionAttemptStateV2 | null;
  next_state: ExperimentFoundationExecutionAttemptStateV2;
  provider_command_id: string | null;
  payload_hash: string;
  external_job_ref: string | null;
  external_job_ref_hash: string | null;
  event_snapshot: Readonly<Record<string, unknown>>;
  event_hash: string;
  occurred_at: string;
}

export interface ExperimentFoundationProviderCommandV2Record {
  id: string;
  execution_attempt_id: string;
  collection_attempt_id: string | null;
  command_sequence: number;
  operation: ExperimentFoundationProviderCommandKindV2;
  command_snapshot: Readonly<Record<string, unknown>>;
  command_hash: string;
  provider_idempotency_key: string;
  payload_hash: string;
  external_job_ref: string | null;
  external_job_ref_hash: string | null;
  state: ExperimentFoundationProviderCommandStateV2;
  lease_version: number;
  lease_owner: string | null;
  lease_expires_at: string | null;
  last_heartbeat_at: string | null;
  attempt_count: number;
  next_attempt_at: string | null;
  response_hash: string | null;
  last_error_code: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ExperimentFoundationCollectionAttemptV2Record {
  id: string;
  execution_attempt_id: string;
  provider_payload_id: string;
  provider_payload_hash: string;
  external_job_ref: string;
  external_job_ref_hash: string;
  business_idempotency_key: string;
  request_hash: string;
  collection_state: ExperimentFoundationCollectionAttemptStateV2;
  state_version: number;
  created_at: string;
  updated_at: string;
  terminal_at: string | null;
}

export interface ExperimentFoundationProvisionalOutputV2Record {
  id: string;
  collection_attempt_id: string;
  ordinal: number;
  output_kind: ExperimentFoundationProvisionalOutputKindV2;
  output_manifest_schema_version: string;
  output_class: 'diagnostic_only';
  redacted_manifest: Readonly<Record<string, unknown>>;
  output_hash: string;
  created_at: string;
}

export interface ExperimentFoundationExecutionV2StartInput {
  run_id: string;
  business_idempotency_key: string;
  request_hash: string;
  expected_run_manifest_hash: string;
  expected_head_acknowledgement_inbox_id: string;
  expected_head_acknowledgement_payload_hash: string;
  expected_readiness_attestation_id: string;
  expected_readiness_attestation_hash: string;
  payloads: ExperimentFoundationProviderPayloadV2Record[];
  attempts: ExperimentFoundationExecutionAttemptV2Record[];
  events: ExperimentFoundationExecutionAttemptEventV2Record[];
  commands: ExperimentFoundationProviderCommandV2Record[];
}

export interface ExperimentFoundationExecutionV2StartOutcome {
  prerequisite: ExperimentFoundationExecutionV2Prerequisite;
  payloads: ExperimentFoundationProviderPayloadV2Record[];
  attempts: ExperimentFoundationExecutionAttemptV2Record[];
  events: ExperimentFoundationExecutionAttemptEventV2Record[];
  commands: ExperimentFoundationProviderCommandV2Record[];
  replayed: boolean;
}

export interface ExperimentFoundationExecutionV2RunProjectionFacts {
  attempts: ExperimentFoundationExecutionAttemptV2Record[];
  events: ExperimentFoundationExecutionAttemptEventV2Record[];
  collections: ExperimentFoundationCollectionAttemptV2Record[];
}

export const EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2 = [
  'prepared',
  'submitted',
  'running',
] as const;

export type ExperimentFoundationActiveRealAttemptStateV2 =
  (typeof EXPERIMENT_FOUNDATION_ACTIVE_REAL_ATTEMPT_STATES_V2)[number];

export interface ExperimentFoundationCycleActiveRealAttemptFenceInputV2 {
  implementation_project_id: string;
  validation_cycle_id: string;
}

/**
 * Minimal exact lineage returned by the D-18/PB14 Cycle-wide read fence.
 * This read model deliberately admits `real` while every Pack B write contract
 * remains simulation-only.
 */
export interface ExperimentFoundationCycleActiveRealAttemptRefV2 {
  execution_attempt_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  attempt_sequence: number;
  state_version: number;
  execution_mode: 'real';
  lifecycle_state: ExperimentFoundationActiveRealAttemptStateV2;
}

export interface ExperimentFoundationExecutionV2CommandClaimInput {
  lease_owner: string;
  claimed_at: string;
  lease_expires_at: string;
  limit: number;
  command_kinds?: ExperimentFoundationProviderCommandKindV2[];
}

export interface ExperimentFoundationExecutionV2CommandHeartbeatInput {
  command_id: string;
  lease_owner: string;
  expected_lease_version: number;
  heartbeat_at: string;
  lease_expires_at: string;
}

export interface ExperimentFoundationExecutionV2CommitCommandOutcomeInput {
  command_id: string;
  lease_owner: string;
  expected_lease_version: number;
  committed_at: string;
  response_hash: string;
  command_terminal_error_code?: string;
  expected_attempt_state_version: number;
  next_attempt: ExperimentFoundationExecutionAttemptV2Record;
  event: ExperimentFoundationExecutionAttemptEventV2Record;
  next_command?: ExperimentFoundationProviderCommandV2Record;
}

export interface ExperimentFoundationExecutionV2ReleaseCommandInput {
  command_id: string;
  lease_owner: string;
  expected_lease_version: number;
  released_at: string;
  next_attempt_at: string;
  error_code: string;
}

export interface ExperimentFoundationExecutionV2TerminalizeCommandInput {
  command_id: string;
  lease_owner: string | null;
  expected_lease_version: number | null;
  terminal_at: string;
  error_code: string;
}

export interface ExperimentFoundationExecutionV2EnqueueControlCommandInput {
  attempt_id: string;
  expected_attempt_state_version: number;
  command: ExperimentFoundationProviderCommandV2Record;
  event?: ExperimentFoundationExecutionAttemptEventV2Record;
  next_attempt?: ExperimentFoundationExecutionAttemptV2Record;
}

export interface ExperimentFoundationExecutionV2PrepareCollectionInput {
  command_id: string;
  lease_owner: string;
  expected_lease_version: number;
  response_hash: string;
  committed_at: string;
  expected_attempt_state_version: number;
  next_attempt: ExperimentFoundationExecutionAttemptV2Record;
  succeeded_event: ExperimentFoundationExecutionAttemptEventV2Record;
  collection: ExperimentFoundationCollectionAttemptV2Record;
  collection_prepared_event: ExperimentFoundationExecutionAttemptEventV2Record;
  collect_command: ExperimentFoundationProviderCommandV2Record;
}

export interface ExperimentFoundationExecutionV2CommitCollectionInput {
  collection_id: string;
  command_id: string;
  lease_owner: string;
  expected_lease_version: number;
  response_hash: string;
  command_terminal_error_code?: string;
  committed_at: string;
  expected_collection_state_version: number;
  next_collection: ExperimentFoundationCollectionAttemptV2Record;
  provisional_outputs: ExperimentFoundationProvisionalOutputV2Record[];
  event: ExperimentFoundationExecutionAttemptEventV2Record;
}

export interface ExperimentFoundationExecutionV2Repository {
  resolveRunPrerequisite(
    runId: string,
  ): Promise<ExperimentFoundationExecutionV2Prerequisite | null>;

  resolveRunCellPrerequisite(
    runId: string,
    runCellId: string,
  ): Promise<ExperimentFoundationExecutionV2Prerequisite | null>;

  findWorkflowSimulationStart(
    runId: string,
    businessIdempotencyKey: string,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome | null>;

  startWorkflowSimulation(
    input: ExperimentFoundationExecutionV2StartInput,
  ): Promise<ExperimentFoundationExecutionV2StartOutcome>;

  findAttempt(
    attemptId: string,
  ): Promise<ExperimentFoundationExecutionAttemptV2Record | null>;

  findProviderPayload(
    providerPayloadId: string,
  ): Promise<ExperimentFoundationProviderPayloadV2Record | null>;

  listRunAttempts(
    runId: string,
  ): Promise<ExperimentFoundationExecutionAttemptV2Record[]>;

  listCycleActiveRealAttemptRefs(
    input: ExperimentFoundationCycleActiveRealAttemptFenceInputV2,
  ): Promise<ExperimentFoundationCycleActiveRealAttemptRefV2[]>;

  listAttemptEvents(
    attemptId: string,
  ): Promise<ExperimentFoundationExecutionAttemptEventV2Record[]>;

  readRunProjectionFacts(
    runId: string,
  ): Promise<ExperimentFoundationExecutionV2RunProjectionFacts>;

  listAttemptCollections(
    attemptId: string,
  ): Promise<ExperimentFoundationCollectionAttemptV2Record[]>;

  listRunPayloads(
    runId: string,
  ): Promise<ExperimentFoundationProviderPayloadV2Record[]>;

  listAttemptCommands(
    attemptId: string,
  ): Promise<ExperimentFoundationProviderCommandV2Record[]>;

  claimCommands(
    input: ExperimentFoundationExecutionV2CommandClaimInput,
  ): Promise<ExperimentFoundationProviderCommandV2Record[]>;

  heartbeatCommand(
    input: ExperimentFoundationExecutionV2CommandHeartbeatInput,
  ): Promise<ExperimentFoundationProviderCommandV2Record>;

  commitCommandOutcome(
    input: ExperimentFoundationExecutionV2CommitCommandOutcomeInput,
  ): Promise<ExperimentFoundationExecutionAttemptV2Record>;

  releaseCommand(
    input: ExperimentFoundationExecutionV2ReleaseCommandInput,
  ): Promise<ExperimentFoundationProviderCommandV2Record>;

  terminalizeCommand(
    input: ExperimentFoundationExecutionV2TerminalizeCommandInput,
  ): Promise<ExperimentFoundationProviderCommandV2Record>;

  enqueueControlCommand(
    input: ExperimentFoundationExecutionV2EnqueueControlCommandInput,
  ): Promise<ExperimentFoundationProviderCommandV2Record>;

  prepareCollection(
    input: ExperimentFoundationExecutionV2PrepareCollectionInput,
  ): Promise<ExperimentFoundationCollectionAttemptV2Record>;

  commitCollectionCompletion(
    input: ExperimentFoundationExecutionV2CommitCollectionInput,
  ): Promise<ExperimentFoundationCollectionAttemptV2Record>;

}
