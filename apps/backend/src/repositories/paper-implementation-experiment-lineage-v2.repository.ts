import type {
  PaperImplementationExperimentLineageClosureStateV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

export interface PaperImplementationExperimentLineageV2CycleSummaryRecord {
  validation_cycle_id: string;
  lifecycle_status: string;
  target_ref_type: string;
  target_ref_id: string;
  target_version_id: string | null;
  created_at: string;
  closure: PaperImplementationExperimentLineageClosureStateV2;
  branch_count: number;
  admitted_branch_count: number;
  total_run_count: number;
  active_real_attempt_count: number;
}

export interface PaperImplementationExperimentLineageV2ProjectCyclesReadModel {
  implementation_project_id: string;
  cycles: PaperImplementationExperimentLineageV2CycleSummaryRecord[];
}

export interface PaperImplementationExperimentLineageV2RunCellRecord {
  run_cell_id: string;
  ordinal: number;
  cell_key: string;
  training_task_spec_id: string;
  training_task_spec_hash: string;
}

export interface PaperImplementationExperimentLineageV2CollectionRecord {
  collection_state: string;
  output_kinds: string[];
}

export interface PaperImplementationExperimentLineageV2AttemptRecord {
  execution_attempt_id: string;
  run_cell_id: string;
  attempt_sequence: number;
  execution_mode: string;
  lifecycle_state: string;
  terminal_reason_code: string | null;
  updated_at: string;
  collection: PaperImplementationExperimentLineageV2CollectionRecord | null;
}

export interface PaperImplementationExperimentLineageV2HeadRunRecord {
  run_id: string;
  run_manifest_hash: string;
  external_pi_branch_id: string;
  external_pi_work_order_revision_id: string;
  external_pi_work_order_revision_hash: string;
  external_pi_revision_sequence: number;
  head_acknowledged: boolean;
  cells: PaperImplementationExperimentLineageV2RunCellRecord[];
  attempts: PaperImplementationExperimentLineageV2AttemptRecord[];
}

export interface PaperImplementationExperimentLineageV2BranchRecord {
  branch_id: string;
  branch_key: string;
  parent_branch_key: string | null;
  current_admitted_revision_id: string;
  current_admitted_revision_hash: string;
  current_admitted_revision_sequence: number;
  head_revision_id: string | null;
  head_revision_sequence: number | null;
  head_run_id: string | null;
  head_run_manifest_hash: string | null;
  head_run: PaperImplementationExperimentLineageV2HeadRunRecord | null;
}

export interface PaperImplementationExperimentLineageV2CycleReadModel {
  implementation_project_id: string;
  validation_cycle_id: string;
  lifecycle_status: string;
  target_ref_type: string;
  target_ref_id: string;
  target_version_id: string | null;
  created_at: string;
  closure: PaperImplementationExperimentLineageClosureStateV2;
  branches: PaperImplementationExperimentLineageV2BranchRecord[];
}

export interface PaperImplementationExperimentLineageV2RevisionRunRecord {
  run_id: string;
  run_manifest_hash: string;
}

export interface PaperImplementationExperimentLineageV2RevisionRecord {
  work_order_revision_id: string;
  revision_sequence: number;
  content_hash: string;
  parent_revision_id: string | null;
  admitted_at: string | null;
  admission_business_idempotency_key: string | null;
  cell_count: number;
  run: PaperImplementationExperimentLineageV2RevisionRunRecord | null;
}

export interface PaperImplementationExperimentLineageV2BranchHistoryReadModel {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  parent_branch_key: string | null;
  current_admitted_revision_id: string | null;
  head_revision_id: string | null;
  head_revision_sequence: number | null;
  head_run_id: string | null;
  head_run_manifest_hash: string | null;
  revisions: PaperImplementationExperimentLineageV2RevisionRecord[];
}

export interface PaperImplementationExperimentLineageV2Repository {
  listProjectValidationCycles(
    implementationProjectId: string,
  ): Promise<PaperImplementationExperimentLineageV2ProjectCyclesReadModel | null>;

  findValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<PaperImplementationExperimentLineageV2CycleReadModel | null>;

  findWorkOrderBranchRevisionHistory(
    implementationProjectId: string,
    branchId: string,
  ): Promise<PaperImplementationExperimentLineageV2BranchHistoryReadModel | null>;
}
