import type {
  EvidenceCandidateV2,
  ExperimentFoundationScientificValidationReasonCodeV2,
  ExperimentResultCellV2,
  ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  EvidenceCandidateQualifiedEventV1 as SharedEvidenceCandidateQualifiedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

export class ExperimentFoundationScientificValidationV2ConstraintError extends Error {
  constructor(
    public readonly reasonCode: ExperimentFoundationScientificValidationReasonCodeV2,
    message: string,
  ) {
    super(message);
    this.name = 'ExperimentFoundationScientificValidationV2ConstraintError';
  }
}

export interface ExperimentFoundationScientificValidationV2Run {
  run_id: string;
  run_recipe_id: string;
  run_manifest_hash: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  ordered_cells: ExperimentFoundationRunCellV2[];
}

export interface ExperimentFoundationScientificValidationV2Protocol {
  evaluation_protocol: ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'EvaluationProtocol';
  };
  protocol_snapshot: ExperimentFoundationV2EvaluationProtocolRevisionContentV2;
}

export interface ExperimentFoundationScientificValidationV2HeadAcknowledgement {
  inbox_id: string;
  event_id: string;
  correlation_id: string;
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  work_order_revision_id: string;
  revision_sequence: number;
  work_order_revision_hash: string;
  cell_plan_hash: string;
  approved_plan_hash: string;
  run_id: string;
  run_manifest_hash: string;
}

/** Scientific-validation view of a durably verified simulation or real-provider Attempt. */
export interface ExperimentFoundationScientificValidationV2ExecutionAttempt {
  execution_attempt_id: string;
  run_id: string;
  run_manifest_hash: string;
  run_cell_id: string;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
  lifecycle_state: 'prepared' | 'submitted' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  execution_mode: 'simulation' | 'real_provider';
  provenance: 'non_production_fake_provider' | 'real_provider';
}

export type EvidenceCandidateQualifiedEventV1 =
  SharedEvidenceCandidateQualifiedEventV1;

export interface ExperimentFoundationScientificValidationV2Outbox {
  outbox_id: string;
  aggregate_type: 'ExperimentFoundationEvidenceCandidateV2';
  aggregate_id: string;
  transition_key: string;
  event: EvidenceCandidateQualifiedEventV1;
  event_envelope_hash: string;
  created_at: string;
}

export interface ExperimentFoundationScientificValidationV2StoredOutcome {
  report: ScientificValidationReportV2;
  evidence_candidate: EvidenceCandidateV2 | null;
  idempotency_key: string;
}

export interface PersistExperimentFoundationScientificResultV2Input {
  result: ExperimentResultCellV2;
  created_at: string;
}

export interface PersistExperimentFoundationScientificValidationV2Input {
  report: ScientificValidationReportV2;
  evidence_candidate: EvidenceCandidateV2 | null;
  outbox: ExperimentFoundationScientificValidationV2Outbox | null;
  idempotency_key: string;
  created_at: string;
}

export interface ExperimentFoundationScientificValidationV2Repository {
  loadRun(
    runId: string,
    expectedRunManifestHash: string,
  ): Promise<ExperimentFoundationScientificValidationV2Run | null>;

  resolveEvaluationProtocol(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2Protocol | null>;

  loadHeadAcknowledgement(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2HeadAcknowledgement | null>;

  loadExecutionAttempt(
    executionAttemptId: string,
  ): Promise<ExperimentFoundationScientificValidationV2ExecutionAttempt | null>;

  persistExperimentResult(
    input: PersistExperimentFoundationScientificResultV2Input,
  ): Promise<ExperimentResultCellV2>;

  loadRunResults(runId: string): Promise<ExperimentResultCellV2[]>;

  loadValidationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null>;

  loadValidationByRunId(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null>;

  persistValidationOutcome(
    input: PersistExperimentFoundationScientificValidationV2Input,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome>;
}
