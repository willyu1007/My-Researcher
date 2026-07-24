import type {
  ProjectValidationCyclesLineageV2Response,
  ValidationCycleExperimentLineageEffectiveHeadRunV2,
  ValidationCycleExperimentLineageV2Response,
  WorkOrderBranchRevisionHistoryV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

import type {
  PaperImplementationExperimentLineageV2BranchRecord,
  PaperImplementationExperimentLineageV2HeadRunRecord,
  PaperImplementationExperimentLineageV2Repository,
} from '../repositories/paper-implementation-experiment-lineage-v2.repository.js';

export type PaperImplementationExperimentLineageV2ServiceReasonCode =
  | 'IMPLEMENTATION_PROJECT_NOT_FOUND'
  | 'VALIDATION_CYCLE_NOT_FOUND'
  | 'WORK_ORDER_BRANCH_NOT_FOUND';

export class PaperImplementationExperimentLineageV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationExperimentLineageV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationExperimentLineageV2ServiceError';
  }
}

export interface PaperImplementationExperimentLineageV2ServiceOptions {
  repository: PaperImplementationExperimentLineageV2Repository;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isEffectiveHead(
  branch: PaperImplementationExperimentLineageV2BranchRecord,
  run: PaperImplementationExperimentLineageV2HeadRunRecord | null,
): run is PaperImplementationExperimentLineageV2HeadRunRecord {
  return run !== null
    && run.head_acknowledged
    && branch.head_revision_id === branch.current_admitted_revision_id
    && branch.head_revision_sequence === branch.current_admitted_revision_sequence
    && branch.head_run_id === run.run_id
    && branch.head_run_manifest_hash === run.run_manifest_hash
    && run.external_pi_branch_id === branch.branch_id
    && run.external_pi_work_order_revision_id === branch.current_admitted_revision_id
    && run.external_pi_work_order_revision_hash === branch.current_admitted_revision_hash
    && run.external_pi_revision_sequence === branch.current_admitted_revision_sequence;
}

function effectiveHeadResponse(
  run: PaperImplementationExperimentLineageV2HeadRunRecord,
): ValidationCycleExperimentLineageEffectiveHeadRunV2 {
  const cells = [...run.cells].sort((left, right) => (
    left.ordinal - right.ordinal
    || compareText(left.run_cell_id, right.run_cell_id)
  ));
  const ordinalByCellId = new Map(cells.map((cell) => [cell.run_cell_id, cell.ordinal]));
  const attempts = [...run.attempts].sort((left, right) => (
    (ordinalByCellId.get(left.run_cell_id) ?? Number.MAX_SAFE_INTEGER)
      - (ordinalByCellId.get(right.run_cell_id) ?? Number.MAX_SAFE_INTEGER)
    || left.attempt_sequence - right.attempt_sequence
    || compareText(left.execution_attempt_id, right.execution_attempt_id)
  ));
  return {
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    ordered_cells: cells.map((cell) => ({
      ordinal: cell.ordinal,
      cell_key: cell.cell_key,
      training_task_spec_id: cell.training_task_spec_id,
      training_task_spec_hash: cell.training_task_spec_hash,
    })),
    ordered_attempts: attempts.map((attempt) => ({
      execution_attempt_id: attempt.execution_attempt_id,
      attempt_sequence: attempt.attempt_sequence,
      execution_mode: attempt.execution_mode,
      lifecycle_state: attempt.lifecycle_state,
      terminal_reason_code: attempt.terminal_reason_code,
      updated_at: attempt.updated_at,
    })),
    collection_summaries: attempts
      .filter((attempt) => attempt.collection !== null)
      .map((attempt) => ({
        execution_attempt_id: attempt.execution_attempt_id,
        collection_state: attempt.collection!.collection_state,
        output_kinds: [...new Set(attempt.collection!.output_kinds)].sort(compareText),
      })),
  };
}

export class PaperImplementationExperimentLineageV2Service {
  constructor(
    private readonly options: PaperImplementationExperimentLineageV2ServiceOptions,
  ) {}

  async listProjectValidationCycles(
    implementationProjectId: string,
  ): Promise<ProjectValidationCyclesLineageV2Response> {
    const readModel = await this.options.repository.listProjectValidationCycles(
      implementationProjectId,
    );
    if (!readModel) {
      throw new PaperImplementationExperimentLineageV2ServiceError(
        'IMPLEMENTATION_PROJECT_NOT_FOUND',
        `ImplementationProject does not exist: ${implementationProjectId}`,
      );
    }
    return {
      implementation_project_id: readModel.implementation_project_id,
      validation_cycles: [...readModel.cycles]
        .sort((left, right) => (
          compareText(right.created_at, left.created_at)
          || compareText(left.validation_cycle_id, right.validation_cycle_id)
        ))
        .map((cycle) => ({
          validation_cycle_id: cycle.validation_cycle_id,
          status: cycle.lifecycle_status,
          target_ref: {
            type: cycle.target_ref_type,
            id: cycle.target_ref_id,
            version: cycle.target_version_id,
          },
          created_at: cycle.created_at,
          closure: cycle.closure,
          branch_count: cycle.branch_count,
          admitted_branch_count: cycle.admitted_branch_count,
          total_run_count: cycle.total_run_count,
          active_real_attempt_count: cycle.active_real_attempt_count,
        })),
    };
  }

  async getValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<ValidationCycleExperimentLineageV2Response> {
    const readModel = await this.options.repository.findValidationCycleExperimentLineage(
      implementationProjectId,
      validationCycleId,
    );
    if (!readModel) {
      throw new PaperImplementationExperimentLineageV2ServiceError(
        'VALIDATION_CYCLE_NOT_FOUND',
        `ValidationCycle does not exist in the requested project: ${validationCycleId}`,
      );
    }
    const branches = [...readModel.branches].sort((left, right) => (
      compareText(left.branch_key, right.branch_key)
      || compareText(left.branch_id, right.branch_id)
    ));
    return {
      implementation_project_id: readModel.implementation_project_id,
      validation_cycle: {
        validation_cycle_id: readModel.validation_cycle_id,
        status: readModel.lifecycle_status,
        target_ref: {
          type: readModel.target_ref_type,
          id: readModel.target_ref_id,
          version: readModel.target_version_id,
        },
        created_at: readModel.created_at,
        closure: readModel.closure,
      },
      branches: branches.map((branch, index) => {
        const common = {
          ordinal: index + 1,
          branch_id: branch.branch_id,
          branch_key: branch.branch_key,
          parent_branch_key: branch.parent_branch_key,
          current_admitted_revision: {
            work_order_revision_id: branch.current_admitted_revision_id,
            work_order_revision_hash: branch.current_admitted_revision_hash,
            revision_sequence: branch.current_admitted_revision_sequence,
          },
        };
        return isEffectiveHead(branch, branch.head_run)
          ? {
            ...common,
            effective_head_run: effectiveHeadResponse(branch.head_run),
            head_blocker: null,
          }
          : {
            ...common,
            effective_head_run: null,
            head_blocker: 'BRANCH_HEAD_NOT_FROZEN',
          };
      }),
    };
  }

  async getWorkOrderBranchRevisionHistory(
    implementationProjectId: string,
    branchId: string,
  ): Promise<WorkOrderBranchRevisionHistoryV2Response> {
    const readModel = await this.options.repository.findWorkOrderBranchRevisionHistory(
      implementationProjectId,
      branchId,
    );
    if (!readModel) {
      throw new PaperImplementationExperimentLineageV2ServiceError(
        'WORK_ORDER_BRANCH_NOT_FOUND',
        `WorkOrder branch does not exist in the requested project: ${branchId}`,
      );
    }
    return {
      implementation_project_id: readModel.implementation_project_id,
      validation_cycle_id: readModel.validation_cycle_id,
      branch_id: readModel.branch_id,
      branch_key: readModel.branch_key,
      parent_branch_key: readModel.parent_branch_key,
      history_includes_superseded_revisions: true,
      revisions: [...readModel.revisions]
        .sort((left, right) => (
          left.revision_sequence - right.revision_sequence
          || compareText(left.work_order_revision_id, right.work_order_revision_id)
        ))
        .map((revision) => {
          if (
            (revision.admitted_at === null)
            !== (revision.admission_business_idempotency_key === null)
          ) {
            throw new Error(
              `Revision admission metadata is partial: ${revision.work_order_revision_id}`,
            );
          }
          const isHeadRunSource = revision.run !== null
            && readModel.head_revision_id === revision.work_order_revision_id
            && readModel.head_revision_sequence === revision.revision_sequence
            && readModel.head_run_id === revision.run.run_id
            && readModel.head_run_manifest_hash === revision.run.run_manifest_hash;
          return {
            work_order_revision_id: revision.work_order_revision_id,
            revision_sequence: revision.revision_sequence,
            content_hash: revision.content_hash,
            parent_revision_id: revision.parent_revision_id,
            admission: revision.admitted_at === null
              ? null
              : {
                admitted_at: revision.admitted_at,
                business_idempotency_key:
                  revision.admission_business_idempotency_key!,
              },
            is_current_admitted:
              readModel.current_admitted_revision_id === revision.work_order_revision_id,
            is_head_run_source: isHeadRunSource,
            run_ref: revision.run,
            cell_count: revision.cell_count,
          };
        }),
    };
  }
}
