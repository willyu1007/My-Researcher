import { randomUUID } from 'node:crypto';

import {
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  PaperImplementationExperimentV2AdmissionResponse,
  PaperImplementationExperimentV2ExactCellInput,
  PaperImplementationExperimentWorkOrderRevisionCellV2,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  PaperImplementationProjectLifecycleStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  PaperImplementationValidationCycleStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';

import { AppError } from '../errors/app-error.js';
import {
  ExperimentSpineV2RepositoryConstraintError,
  type PaperImplementationExperimentSpineV2Repository,
  type PaperImplementationExperimentV2AdmissionBundle,
} from '../repositories/experiment-spine-v2.repository.js';
import { incrementExperimentV2Int32Counter } from './experiment-v2-int32.js';

const DEFAULT_SERVER_ACTOR = 'system:paper-implementation-experiment-v2-admission';

export interface PaperImplementationExperimentV2ResolvedScope {
  implementation_project_id: string;
  implementation_project_lifecycle_status: PaperImplementationProjectLifecycleStatus;
  validation_cycle_id: string;
  validation_cycle_lifecycle_status: PaperImplementationValidationCycleStatus;
}

/**
 * Read-only PI adapter. The implementation must resolve the ValidationCycle
 * through its owning ImplementationProject; logical-id-only lookup is not
 * sufficient for admission.
 */
export interface PaperImplementationExperimentV2ScopeReader {
  resolveExactScope(
    implementationProjectId: string,
    validationCycleId: string,
  ): Promise<PaperImplementationExperimentV2ResolvedScope | null>;
}

export interface PaperImplementationExperimentV2AdmissionServiceOptions {
  repository: PaperImplementationExperimentSpineV2Repository;
  scopeReader: PaperImplementationExperimentV2ScopeReader;
  admissionEnabled: () => boolean;
  serverActorId?: string;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export interface PaperImplementationExperimentV2AdmissionInput {
  implementation_project_id: string;
  validation_cycle_id: string;
  request: PaperImplementationExperimentV2AdmissionRequest;
  admitted_by: string;
}

function assertExactCellPlan(cells: PaperImplementationExperimentV2ExactCellInput[]): void {
  if (cells.length === 0) {
    throw new AppError(400, 'INVALID_PAYLOAD', 'At least one exact cell is required.', {
      reason_code: 'WORK_ORDER_CELL_PLAN_INVALID',
    });
  }

  const cellKeys = new Set<string>();
  for (const cell of cells) {
    if (cellKeys.has(cell.cell_key)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Exact cell keys must be unique.', {
        reason_code: 'WORK_ORDER_CELL_PLAN_INVALID',
      });
    }
    cellKeys.add(cell.cell_key);

    const parameterNames = new Set<string>();
    for (const parameter of cell.parameters) {
      if (parameterNames.has(parameter.name)) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'Cell parameter names must be unique.', {
          reason_code: 'WORK_ORDER_CELL_PLAN_INVALID',
        });
      }
      parameterNames.add(parameter.name);
    }
  }
}

function exactAdmissionMatches(
  stored: PaperImplementationExperimentV2AdmissionBundle,
  expectedApprovedPlanHash: string,
): boolean {
  return stored.revision.approved_plan_hash === expectedApprovedPlanHash
    && stored.admission.approved_plan_hash === expectedApprovedPlanHash;
}

function mapAdmissionRepositoryError(error: ExperimentSpineV2RepositoryConstraintError): AppError {
  const concurrent = error.reasonCode === 'BRANCH_CAS_CONFLICT';
  const reasonCode = concurrent
    ? 'BRANCH_CURRENT_REVISION_CAS_CONFLICT'
    : error.reasonCode;
  return new AppError(
    409,
    concurrent ? 'CONCURRENT_ADVANCE' : 'VERSION_CONFLICT',
    error.message,
    { reason_code: reasonCode },
  );
}

export class PaperImplementationExperimentV2AdmissionService {
  private readonly repository: PaperImplementationExperimentSpineV2Repository;
  private readonly scopeReader: PaperImplementationExperimentV2ScopeReader;
  private readonly admissionEnabled: () => boolean;
  private readonly serverActorId: string;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: PaperImplementationExperimentV2AdmissionServiceOptions) {
    this.repository = options.repository;
    this.scopeReader = options.scopeReader;
    this.admissionEnabled = options.admissionEnabled;
    this.serverActorId = options.serverActorId ?? DEFAULT_SERVER_ACTOR;
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async admit(
    input: PaperImplementationExperimentV2AdmissionInput,
  ): Promise<PaperImplementationExperimentV2AdmissionResponse> {
    // A01: this check intentionally precedes every scope/repository read.
    if (!this.admissionEnabled()) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Experiment v2 admission is disabled.', {
        reason_code: 'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
      });
    }
    try {
      return await this.admitEnabled(input);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw mapAdmissionRepositoryError(error);
      }
      throw error;
    }
  }

  private async admitEnabled(
    input: PaperImplementationExperimentV2AdmissionInput,
  ): Promise<PaperImplementationExperimentV2AdmissionResponse> {
    if (input.admitted_by !== this.serverActorId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Admission actor must be server injected.', {
        reason_code: 'V2_TYPED_SNAPSHOT_INVALID',
      });
    }

    const resolvedScope = await this.scopeReader.resolveExactScope(
      input.implementation_project_id,
      input.validation_cycle_id,
    );
    if (
      !resolvedScope
      || resolvedScope.implementation_project_id !== input.implementation_project_id
      || resolvedScope.validation_cycle_id !== input.validation_cycle_id
    ) {
      throw new AppError(404, 'NOT_FOUND', 'ImplementationProject/ValidationCycle scope not found.', {
        reason_code: 'BRANCH_SCOPE_CONFLICT',
      });
    }
    if (
      resolvedScope.implementation_project_lifecycle_status !== 'active'
      || resolvedScope.validation_cycle_lifecycle_status !== 'admitted'
    ) {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        'Experiment v2 admission requires an active ImplementationProject and admitted ValidationCycle.',
        { reason_code: 'BRANCH_SCOPE_CONFLICT' },
      );
    }

    assertExactCellPlan(input.request.exact_cells);

    const branchFrameHash = serverHashPaperImplementationExperimentV2BranchFrame(
      input.request.branch_frame,
    );
    const revisionContentHash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
      input.request.work_order_revision,
    );

    const existingBranch = await this.repository.findBranch(
      input.implementation_project_id,
      input.validation_cycle_id,
      input.request.branch_key,
    );
    if (existingBranch && existingBranch.branch_frame_hash !== branchFrameHash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Branch key was reused with a changed frame.', {
        reason_code: 'BRANCH_SCOPE_CONFLICT',
      });
    }

    const branchId = existingBranch?.branch_id ?? this.idFactory('pi_experiment_branch_v2');
    const workOrderRevisionId = this.idFactory('pi_experiment_revision_v2');
    const createdAt = this.now();
    const cells: PaperImplementationExperimentWorkOrderRevisionCellV2[] =
      input.request.exact_cells.map((cell, index) => ({
        ...cell,
        work_order_cell_id: this.idFactory('pi_experiment_cell_v2'),
        work_order_revision_id: workOrderRevisionId,
        ordinal: index + 1,
        cell_hash: serverHashPaperImplementationExperimentV2Cell(cell),
      }));
    const duplicateCellHash = new Set(cells.map((cell) => cell.cell_hash)).size !== cells.length;
    if (duplicateCellHash) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Exact cell values must be unique.', {
        reason_code: 'WORK_ORDER_CELL_PLAN_INVALID',
      });
    }

    const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(cells);
    const approvedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
      branch_frame_hash: branchFrameHash,
      work_order_revision_hash: revisionContentHash,
      cell_plan_hash: cellPlanHash,
    });

    if (existingBranch) {
      const replay = await this.repository.findAdmissionByBusinessKey(
        existingBranch.branch_id,
        input.request.business_idempotency_key,
      );
      if (replay) {
        if (!exactAdmissionMatches(replay, approvedPlanHash)) {
          throw new AppError(409, 'VERSION_CONFLICT', 'Admission idempotency key changed payload.', {
            reason_code: 'ADMISSION_IDEMPOTENCY_CONFLICT',
          });
        }
        return {
          branch: replay.branch,
          revision: replay.revision,
          cells: replay.cells,
          admission: replay.admission,
          replayed: true,
        };
      }
    }

    const revisionSequence = incrementExperimentV2Int32Counter(
      existingBranch?.current_admitted_revision_sequence ?? 0,
      'WorkOrder branch revision sequence',
      branchAdvanceError,
    );
    const admissionId = this.idFactory('pi_experiment_admission_v2');
    const nextBranchStateVersion = incrementExperimentV2Int32Counter(
      existingBranch?.state_version ?? 0,
      'WorkOrder branch state version',
      branchAdvanceError,
    );
    const branch = {
      branch_id: branchId,
      implementation_project_id: input.implementation_project_id,
      validation_cycle_id: input.validation_cycle_id,
      branch_key: input.request.branch_key,
      branch_frame: input.request.branch_frame,
      branch_frame_hash: branchFrameHash,
      state_version: nextBranchStateVersion,
      current_admitted_revision_id: workOrderRevisionId,
      current_admitted_revision_sequence: revisionSequence,
      head_run_id: existingBranch?.head_run_id ?? null,
      head_run_manifest_hash: existingBranch?.head_run_manifest_hash ?? null,
      head_source_event_id: existingBranch?.head_source_event_id ?? null,
      created_at: existingBranch?.created_at ?? createdAt,
      updated_at: createdAt,
    } as const;
    const revision = {
      work_order_revision_id: workOrderRevisionId,
      branch_id: branchId,
      revision_sequence: revisionSequence,
      work_order_revision: input.request.work_order_revision,
      content_hash: revisionContentHash,
      cell_plan_hash: cellPlanHash,
      approved_plan_hash: approvedPlanHash,
      created_at: createdAt,
    };
    const admission = {
      admission_id: admissionId,
      work_order_revision_id: workOrderRevisionId,
      approved_plan_hash: approvedPlanHash,
      business_idempotency_key: input.request.business_idempotency_key,
      admitted_by: this.serverActorId,
      admitted_at: createdAt,
    };
    const eventPayload: WorkOrderRevisionAdmittedEventV1['payload'] = {
      admission_id: admissionId,
      branch_frame_hash: branchFrameHash,
      work_order_revision: input.request.work_order_revision,
      readiness_attestation_id: input.request.work_order_revision.readiness_attestation_id,
      readiness_attestation_hash: input.request.work_order_revision.readiness_attestation_hash,
      asset_dependencies: input.request.work_order_revision.asset_dependencies,
      exact_cells: cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      })),
    };
    const eventId = this.idFactory('pi_experiment_event_v2');
    const event: WorkOrderRevisionAdmittedEventV1 = {
      event_id: eventId,
      event_type: 'WorkOrderRevisionAdmitted',
      schema_version: 'v1',
      producer_domain: 'PaperImplementation',
      occurred_at: createdAt,
      correlation_id: admissionId,
      causation_id: admissionId,
      business_idempotency_key: input.request.business_idempotency_key,
      implementation_project_id: input.implementation_project_id,
      validation_cycle_id: input.validation_cycle_id,
      branch_id: branchId,
      branch_key: input.request.branch_key,
      work_order_revision_id: workOrderRevisionId,
      work_order_revision_hash: revisionContentHash,
      branch_revision_sequence: revisionSequence,
      cell_plan_hash: cellPlanHash,
      approved_plan_hash: approvedPlanHash,
      payload_hash: serverHashExperimentV2EventPayload(
        'WorkOrderRevisionAdmitted',
        'v1',
        eventPayload,
      ),
      payload: eventPayload,
    };
    const outbox = {
      outbox_id: this.idFactory('pi_experiment_outbox_v2'),
      aggregate_transition_key: `${branchId}:revision:${revisionSequence}:admitted`,
      event,
      created_at: createdAt,
    };

    const stored = await this.repository.commitAdmission({
      expected_branch_state_version: existingBranch?.state_version ?? null,
      branch,
      revision,
      cells,
      admission,
      outbox,
    });
    return {
      branch: stored.branch,
      revision: stored.revision,
      cells: stored.cells,
      admission: stored.admission,
      replayed: stored.admission.admission_id !== admissionId,
    };
  }
}

function branchAdvanceError(message: string): AppError {
  return new AppError(
    409,
    'CONCURRENT_ADVANCE',
    message,
    { reason_code: 'BRANCH_CURRENT_REVISION_CAS_CONFLICT' },
  );
}
