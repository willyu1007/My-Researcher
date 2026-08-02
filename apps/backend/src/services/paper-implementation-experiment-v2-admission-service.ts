import { randomUUID } from 'node:crypto';

import {
  serverHashExperimentV2EventPayload,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
  serverHashPaperImplementationExplorationAttachmentCommandV2,
  serverPaperImplementationExplorationAttachmentV2Id,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ExperimentFoundationExplorationSpecRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-exploration-spec-v2-contracts';
import type {
  PaperImplementationExplorationAttachmentV2,
  PaperImplementationExplorationAttachmentV2Response,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-exploration-attachment-v2-contracts';
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
  type PaperImplementationExplorationAttachmentV2Repository,
  type PaperImplementationExplorationAttachmentV2Bundle,
  type PaperImplementationExplorationAttachmentV2Commit,
  type PaperImplementationExplorationAttachmentV2CommandReceipt,
  type PaperImplementationExplorationAttachmentV2ReplayInput,
} from '../repositories/experiment-spine-v2.repository.js';
import type {
  PaperImplementationValidationCycleClosureV2Lookup,
} from '../repositories/paper-implementation-validation-cycle-closure-v2-lookup.js';
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
  explorationAttachmentRepository?: PaperImplementationExplorationAttachmentV2Repository;
  scopeReader: PaperImplementationExperimentV2ScopeReader;
  admissionEnabled: () => boolean;
  cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
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

export interface PaperImplementationExplorationAttachmentV2AdmissionInput {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_key: string;
  business_idempotency_key: string;
  source_revision: ExperimentFoundationExplorationSpecRevisionV2;
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
  if (error.reasonCode === 'CYCLE_ALREADY_CLOSED') {
    return cycleAlreadyClosed();
  }
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
  private readonly explorationAttachmentRepository?: PaperImplementationExplorationAttachmentV2Repository;
  private readonly scopeReader: PaperImplementationExperimentV2ScopeReader;
  private readonly admissionEnabled: () => boolean;
  private readonly cycleClosureLookup: PaperImplementationValidationCycleClosureV2Lookup;
  private readonly serverActorId: string;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => string;

  constructor(options: PaperImplementationExperimentV2AdmissionServiceOptions) {
    this.repository = options.repository;
    this.explorationAttachmentRepository = options.explorationAttachmentRepository;
    this.scopeReader = options.scopeReader;
    this.admissionEnabled = options.admissionEnabled;
    this.cycleClosureLookup = options.cycleClosureLookup;
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

  async replayExplorationAttachment(
    input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  ): Promise<PaperImplementationExplorationAttachmentV2Response | null> {
    this.assertAdmissionEnabled();
    this.assertServerActor(input.admitted_by);
    const repository = this.requireExplorationAttachmentRepository();
    const expected = deriveExplorationAttachmentExpectation(input);
    try {
      const byBusiness = await repository.findExplorationAttachmentByBusinessKey(
        input.business_idempotency_key,
      );
      if (byBusiness) {
        assertExplorationAttachmentReplay(byBusiness.attachment, expected);
        return explorationAttachmentResponse(byBusiness, true);
      }
      const bySpec = await repository.findExplorationAttachmentBySpecRevision(
        input.source_revision.revision_id,
      );
      if (!bySpec) return null;
      assertExplorationAttachmentReplay(bySpec.attachment, expected);
      const replay = await repository.recordExplorationAttachmentReplay({
        expected_attachment: expected,
        command_receipt: createExplorationAttachmentReceipt(
          bySpec.attachment.attachment_id,
          input,
          this.now(),
        ),
      });
      return explorationAttachmentResponse(replay, true);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw mapAdmissionRepositoryError(error);
      }
      throw error;
    }
  }

  async admitExplorationAttachment(
    input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  ): Promise<PaperImplementationExplorationAttachmentV2Response> {
    this.assertAdmissionEnabled();
    const repository = this.requireExplorationAttachmentRepository();
    const request: PaperImplementationExperimentV2AdmissionRequest = {
      branch_key: input.branch_key,
      branch_frame: input.source_revision.specification.proposed_branch_frame,
      work_order_revision: input.source_revision.specification.work_order_revision,
      exact_cells: input.source_revision.specification.exact_cells,
      business_idempotency_key: input.business_idempotency_key,
    };
    try {
      const admitted = await this.admitEnabled({
        implementation_project_id: input.implementation_project_id,
        validation_cycle_id: input.validation_cycle_id,
        request,
        admitted_by: input.admitted_by,
      }, input);
      const committed = await repository.findExplorationAttachmentByBusinessKey(
        input.business_idempotency_key,
      );
      if (!committed) {
        throw new ExperimentSpineV2RepositoryConstraintError(
          'INTEGRATION_PREREQUISITE_NOT_READY',
          'Committed exploration attachment could not be resolved.',
        );
      }
      assertExplorationAttachmentReplay(
        committed.attachment,
        deriveExplorationAttachmentExpectation(input),
      );
      return explorationAttachmentResponse(committed, admitted.replayed);
    } catch (error) {
      if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
        throw mapAdmissionRepositoryError(error);
      }
      throw error;
    }
  }

  private async admitEnabled(
    input: PaperImplementationExperimentV2AdmissionInput,
    explorationAttachment?: PaperImplementationExplorationAttachmentV2AdmissionInput,
  ): Promise<PaperImplementationExperimentV2AdmissionResponse> {
    this.assertServerActor(input.admitted_by);

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
      if (replay && !explorationAttachment) {
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

    // Exact committed admission replay remains valid after the immutable Cycle
    // closure. Only a genuinely new revision reaches the cheap closure fast path
    // and the repository's authoritative transaction-internal fence.
    if (
      !explorationAttachment
      && await this.cycleClosureLookup.isCycleClosed(input.validation_cycle_id)
    ) {
      throw cycleAlreadyClosed();
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
      exploration_attachment: explorationAttachment
        ? createExplorationAttachmentCommit(
          explorationAttachment,
          branch,
          revision,
          admission,
          createdAt,
        )
        : undefined,
    });
    return {
      branch: stored.branch,
      revision: stored.revision,
      cells: stored.cells,
      admission: stored.admission,
      replayed: stored.admission.admission_id !== admissionId,
    };
  }

  private assertAdmissionEnabled(): void {
    if (!this.admissionEnabled()) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'Experiment v2 admission is disabled.', {
        reason_code: 'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
      });
    }
  }

  private assertServerActor(admittedBy: string): void {
    if (admittedBy !== this.serverActorId) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Admission actor must be server injected.', {
        reason_code: 'V2_TYPED_SNAPSHOT_INVALID',
      });
    }
  }

  private requireExplorationAttachmentRepository(): PaperImplementationExplorationAttachmentV2Repository {
    if (!this.explorationAttachmentRepository) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        'Exploration attachment repository is not configured.',
        { reason_code: 'INTEGRATION_PREREQUISITE_NOT_READY' },
      );
    }
    return this.explorationAttachmentRepository;
  }
}

function explorationAttachmentCommandContent(
  input: PaperImplementationExplorationAttachmentV2AdmissionInput,
) {
  return {
    spec_id: input.source_revision.spec_id,
    spec_revision: input.source_revision.spec_revision,
    spec_revision_id: input.source_revision.revision_id,
    spec_content_hash: input.source_revision.content_hash,
    implementation_project_id: input.implementation_project_id,
    validation_cycle_id: input.validation_cycle_id,
    branch_key: input.branch_key,
  };
}

function deriveExplorationAttachmentExpectation(
  input: PaperImplementationExplorationAttachmentV2AdmissionInput,
): PaperImplementationExplorationAttachmentV2ReplayInput['expected_attachment'] {
  const specification = input.source_revision.specification;
  const branchFrameHash = serverHashPaperImplementationExperimentV2BranchFrame(
    specification.proposed_branch_frame,
  );
  const workOrderRevisionHash = serverHashPaperImplementationExperimentV2WorkOrderRevision(
    specification.work_order_revision,
  );
  const cellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(
    specification.exact_cells.map((cell, index) => ({
      ordinal: index + 1,
      cell_hash: serverHashPaperImplementationExperimentV2Cell(cell),
    })),
  );
  return {
    ...explorationAttachmentCommandContent(input),
    approved_plan_hash: serverHashPaperImplementationExperimentV2ApprovedPlan({
      branch_frame_hash: branchFrameHash,
      work_order_revision_hash: workOrderRevisionHash,
      cell_plan_hash: cellPlanHash,
    }),
  };
}

function createExplorationAttachmentReceipt(
  attachmentId: string,
  input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  createdAt: string,
): PaperImplementationExplorationAttachmentV2CommandReceipt {
  const commandContent = explorationAttachmentCommandContent(input);
  return {
    receipt_id: serverPaperImplementationExplorationAttachmentV2Id('receipt', {
      business_idempotency_key: input.business_idempotency_key,
    }),
    business_idempotency_key: input.business_idempotency_key,
    command_hash: serverHashPaperImplementationExplorationAttachmentCommandV2(commandContent),
    attachment_id: attachmentId,
    spec_revision_id: input.source_revision.revision_id,
    created_at: createdAt,
  };
}

function createExplorationAttachmentCommit(
  input: PaperImplementationExplorationAttachmentV2AdmissionInput,
  branch: PaperImplementationExperimentV2AdmissionBundle['branch'],
  revision: PaperImplementationExperimentV2AdmissionBundle['revision'],
  admission: PaperImplementationExperimentV2AdmissionBundle['admission'],
  attachedAt: string,
): PaperImplementationExplorationAttachmentV2Commit {
  const commandContent = explorationAttachmentCommandContent(input);
  const attachment: PaperImplementationExplorationAttachmentV2 = {
    attachment_id: serverPaperImplementationExplorationAttachmentV2Id(
      'attachment',
      commandContent,
    ),
    spec_id: input.source_revision.spec_id,
    spec_revision: input.source_revision.spec_revision,
    spec_revision_id: input.source_revision.revision_id,
    spec_content_hash: input.source_revision.content_hash,
    implementation_project_id: input.implementation_project_id,
    validation_cycle_id: input.validation_cycle_id,
    branch_id: branch.branch_id,
    branch_key: branch.branch_key,
    work_order_revision_id: revision.work_order_revision_id,
    admission_id: admission.admission_id,
    approved_plan_hash: revision.approved_plan_hash,
    attached_at: attachedAt,
  };
  return {
    attachment,
    command_receipt: createExplorationAttachmentReceipt(
      attachment.attachment_id,
      input,
      attachedAt,
    ),
  };
}

function assertExplorationAttachmentReplay(
  attachment: PaperImplementationExplorationAttachmentV2,
  expected: PaperImplementationExplorationAttachmentV2ReplayInput['expected_attachment'],
): void {
  if (
    attachment.spec_id !== expected.spec_id
    || attachment.spec_revision !== expected.spec_revision
    || attachment.spec_revision_id !== expected.spec_revision_id
    || attachment.spec_content_hash !== expected.spec_content_hash
    || attachment.implementation_project_id !== expected.implementation_project_id
    || attachment.validation_cycle_id !== expected.validation_cycle_id
    || attachment.branch_key !== expected.branch_key
    || attachment.approved_plan_hash !== expected.approved_plan_hash
  ) {
    throw new AppError(
      409,
      'VERSION_CONFLICT',
      'Exploration specification revision is already attached to another PI scope or plan.',
      { reason_code: 'EXPLORATION_ATTACHMENT_SCOPE_CONFLICT' },
    );
  }
}

function explorationAttachmentResponse(
  bundle: PaperImplementationExplorationAttachmentV2Bundle,
  replayed: boolean,
): PaperImplementationExplorationAttachmentV2Response {
  return {
    attachment: structuredClone(bundle.attachment),
    branch: structuredClone(bundle.branch),
    revision: structuredClone(bundle.revision),
    cells: structuredClone(bundle.cells),
    admission: structuredClone(bundle.admission),
    replayed,
  };
}


function cycleAlreadyClosed(): AppError {
  return new AppError(
    409,
    'GATE_CONSTRAINT_FAILED',
    'A closed ValidationCycle cannot admit another WorkOrder revision.',
    { reason_code: 'CYCLE_ALREADY_CLOSED' },
  );
}

function branchAdvanceError(message: string): AppError {
  return new AppError(
    409,
    'CONCURRENT_ADVANCE',
    message,
    { reason_code: 'BRANCH_CURRENT_REVISION_CAS_CONFLICT' },
  );
}
