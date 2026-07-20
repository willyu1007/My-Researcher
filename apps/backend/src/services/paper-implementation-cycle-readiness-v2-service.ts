import type {
  ClosureCellAccountingV2,
  ValidationCycleClosureBranchEntryV2,
  ValidationCycleReadinessBlockerV2,
  ValidationCycleReadinessEvaluationV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import {
  serverHashPaperImplementationV2ClosureWatermark,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES,
  type PaperImplementationCycleReadinessV2Branch,
  type PaperImplementationCycleReadinessV2EvidenceUnit,
  type PaperImplementationCycleReadinessV2HeadReference,
  type PaperImplementationCycleReadinessV2HeadRun,
  type PaperImplementationCycleReadinessV2Repository,
} from '../repositories/paper-implementation-cycle-readiness-v2.repository.js';

export type PaperImplementationCycleReadinessV2ServiceReasonCode =
  | 'VALIDATION_CYCLE_NOT_FOUND'
  | 'VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES'
  | 'READINESS_SCOPE_INVALID';

export class PaperImplementationCycleReadinessV2ServiceError extends Error {
  constructor(
    public readonly reasonCode: PaperImplementationCycleReadinessV2ServiceReasonCode,
    message: string,
  ) {
    super(message);
    this.name = 'PaperImplementationCycleReadinessV2ServiceError';
  }
}

export interface PaperImplementationCycleReadinessV2ServiceOptions {
  repository: PaperImplementationCycleReadinessV2Repository;
}

const SCIENTIFIC_EXECUTION_NOT_STARTED = 'SCIENTIFIC_EXECUTION_NOT_STARTED';

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isCandidateHead(branch: PaperImplementationCycleReadinessV2Branch): branch is
  PaperImplementationCycleReadinessV2Branch & {
    head_revision_id: string;
    head_revision_sequence: number;
    head_run_id: string;
    head_run_manifest_hash: string;
  } {
  return branch.head_revision_id === branch.current_admitted_revision_id
    && branch.head_revision_sequence === branch.current_admitted_revision_sequence
    && branch.head_run_id !== null
    && branch.head_run_manifest_hash !== null;
}

function toHeadReference(
  implementationProjectId: string,
  validationCycleId: string,
  branch: PaperImplementationCycleReadinessV2Branch & {
    head_run_id: string;
    head_run_manifest_hash: string;
  },
): PaperImplementationCycleReadinessV2HeadReference {
  return {
    implementation_project_id: implementationProjectId,
    validation_cycle_id: validationCycleId,
    branch_id: branch.branch_id,
    branch_key: branch.branch_key,
    current_admitted_revision_id: branch.current_admitted_revision_id,
    current_admitted_revision_hash: branch.current_admitted_revision_hash,
    current_admitted_revision_sequence: branch.current_admitted_revision_sequence,
    head_run_id: branch.head_run_id,
    head_run_manifest_hash: branch.head_run_manifest_hash,
  };
}

function headMatchesCurrentScope(
  branch: PaperImplementationCycleReadinessV2Branch,
  run: PaperImplementationCycleReadinessV2HeadRun | undefined,
): run is PaperImplementationCycleReadinessV2HeadRun {
  return isCandidateHead(branch)
    && run !== undefined
    && run.head_acknowledged
    && run.run_id === branch.head_run_id
    && run.run_manifest_hash === branch.head_run_manifest_hash
    && run.external_pi_branch_id === branch.branch_id
    && run.external_pi_work_order_revision_id === branch.current_admitted_revision_id
    && run.external_pi_work_order_revision_hash === branch.current_admitted_revision_hash
    && run.external_pi_revision_sequence === branch.current_admitted_revision_sequence;
}

function evidenceMatchesCurrentHead(
  unit: PaperImplementationCycleReadinessV2EvidenceUnit,
  branch: PaperImplementationCycleReadinessV2Branch,
  run: PaperImplementationCycleReadinessV2HeadRun,
): boolean {
  return unit.branch_id === branch.branch_id
    && unit.work_order_revision_id === branch.current_admitted_revision_id
    && unit.work_order_revision_hash === branch.current_admitted_revision_hash
    && unit.branch_revision_sequence === branch.current_admitted_revision_sequence
    && unit.run_id === run.run_id
    && unit.run_manifest_hash === run.run_manifest_hash;
}

function orderedCells(run: PaperImplementationCycleReadinessV2HeadRun): ClosureCellAccountingV2[] {
  const cells = [...run.cells].sort((left, right) => (
    left.ordinal - right.ordinal || compareText(left.run_cell_id, right.run_cell_id)
  ));
  if (
    cells.length === 0
    || cells.some((cell, index) => cell.ordinal !== index + 1)
    || new Set(cells.map((cell) => cell.run_cell_id)).size !== cells.length
  ) {
    throw new PaperImplementationCycleReadinessV2ServiceError(
      'READINESS_SCOPE_INVALID',
      `Effective EF head Run cells are empty, duplicated, or non-contiguous: ${run.run_id}`,
    );
  }
  return cells.map((cell) => {
    const attempts = [...cell.attempts].sort((left, right) => (
      left.attempt_sequence - right.attempt_sequence
      || compareText(left.execution_attempt_id, right.execution_attempt_id)
    ));
    if (new Set(attempts.map((attempt) => attempt.execution_attempt_id)).size !== attempts.length) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'READINESS_SCOPE_INVALID',
        `Effective EF head Run cell has duplicate Attempt ids: ${cell.run_cell_id}`,
      );
    }
    const resultAttempt = cell.complete_result === null
      ? undefined
      : attempts.find((attempt) => (
        attempt.execution_attempt_id === cell.complete_result?.execution_attempt_id
      ));
    const hasCompleteRealResult = cell.complete_result !== null
      && cell.complete_result.provenance === 'real_provider'
      && resultAttempt?.lifecycle_state === 'succeeded'
      && resultAttempt.provenance === 'real_provider'
      && (PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES as readonly string[])
        .includes(resultAttempt.execution_mode);
    return {
      ordinal: cell.ordinal,
      run_cell_id: cell.run_cell_id,
      cell_key: cell.cell_key,
      ordered_attempts: attempts.map((attempt, index) => ({
        ordinal: index + 1,
        execution_attempt_id: attempt.execution_attempt_id,
        lifecycle_state: attempt.lifecycle_state,
        execution_mode: attempt.execution_mode,
        provenance: attempt.provenance,
      })),
      complete_result_ref: hasCompleteRealResult && cell.complete_result
        ? {
          result_id: cell.complete_result.result_id,
          result_content_hash: cell.complete_result.result_content_hash,
        }
        : null,
      eligibility_code: hasCompleteRealResult ? null : SCIENTIFIC_EXECUTION_NOT_STARTED,
    };
  });
}

export class PaperImplementationCycleReadinessV2Service {
  private readonly repository: PaperImplementationCycleReadinessV2Repository;

  constructor(options: PaperImplementationCycleReadinessV2ServiceOptions) {
    this.repository = options.repository;
  }

  async evaluate(validationCycleId: string): Promise<ValidationCycleReadinessEvaluationV2> {
    const cycle = await this.repository.findValidationCycle(validationCycleId);
    if (!cycle) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'VALIDATION_CYCLE_NOT_FOUND',
        `ValidationCycle does not exist: ${validationCycleId}`,
      );
    }
    if (
      !Number.isSafeInteger(cycle.expected_cycle_version)
      || cycle.expected_cycle_version < 0
    ) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'READINESS_SCOPE_INVALID',
        `ValidationCycle version is not a non-negative safe integer: ${validationCycleId}`,
      );
    }

    const [branchRows, activeRealAttempts, evidenceUnits, closure] = await Promise.all([
      this.repository.listAdmittedBranches(validationCycleId),
      this.repository.listCycleActiveRealAttempts(validationCycleId),
      this.repository.listEligibleRunEvidenceUnits(validationCycleId),
      this.repository.findCycleClosure(validationCycleId),
    ]);
    const branches = [...branchRows].sort((left, right) => (
      compareText(left.branch_key, right.branch_key)
      || compareText(left.branch_id, right.branch_id)
    ));
    if (branches.length === 0) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'VALIDATION_CYCLE_HAS_NO_ADMITTED_BRANCHES',
        `ValidationCycle has no admitted WorkOrder branch and cannot form a v1 watermark: ${validationCycleId}`,
      );
    }
    if (
      new Set(branches.map((branch) => branch.branch_id)).size !== branches.length
      || new Set(branches.map((branch) => branch.branch_key)).size !== branches.length
      || branches.some((branch) => (
        !Number.isSafeInteger(branch.current_admitted_revision_sequence)
        || branch.current_admitted_revision_sequence < 1
      ))
    ) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'READINESS_SCOPE_INVALID',
        `ValidationCycle admitted branch membership is duplicated or invalid: ${validationCycleId}`,
      );
    }

    const headReferences = branches
      .filter(isCandidateHead)
      .map((branch) => toHeadReference(
        cycle.implementation_project_id,
        validationCycleId,
        branch,
      ));
    const headRuns = await this.repository.listHeadRunAccounting(headReferences);
    const headRunsById = new Map(headRuns.map((run) => [run.run_id, run]));
    if (headRunsById.size !== headRuns.length) {
      throw new PaperImplementationCycleReadinessV2ServiceError(
        'READINESS_SCOPE_INVALID',
        `EF head Run read returned duplicate Run ids: ${validationCycleId}`,
      );
    }

    const blockedBranchIds: string[] = [];
    let eligibleRunEvidenceUnitCount = 0;
    const orderedBranches: ValidationCycleClosureBranchEntryV2[] = branches.map((branch, index) => {
      const run = branch.head_run_id === null
        ? undefined
        : headRunsById.get(branch.head_run_id);
      if (!headMatchesCurrentScope(branch, run)) {
        blockedBranchIds.push(branch.branch_id);
        return {
          ordinal: index + 1,
          branch_id: branch.branch_id,
          branch_key: branch.branch_key,
          current_admitted_revision_id: branch.current_admitted_revision_id,
          current_admitted_revision_hash: branch.current_admitted_revision_hash,
          branch_revision_sequence: branch.current_admitted_revision_sequence,
          effective_head_run_id: null,
          effective_head_run_manifest_hash: null,
          head_blocker: 'BRANCH_HEAD_NOT_FROZEN',
          ordered_cells: [],
          eligible_run_evidence_unit_refs: [],
        };
      }
      const eligibleRefs = evidenceUnits
        .filter((unit) => evidenceMatchesCurrentHead(unit, branch, run))
        .sort((left, right) => (
          compareText(left.run_evidence_unit_id, right.run_evidence_unit_id)
          || compareText(left.content_hash, right.content_hash)
        ))
        .map((unit) => ({
          run_evidence_unit_id: unit.run_evidence_unit_id,
          content_hash: unit.content_hash,
        }));
      eligibleRunEvidenceUnitCount += eligibleRefs.length;
      return {
        ordinal: index + 1,
        branch_id: branch.branch_id,
        branch_key: branch.branch_key,
        current_admitted_revision_id: branch.current_admitted_revision_id,
        current_admitted_revision_hash: branch.current_admitted_revision_hash,
        branch_revision_sequence: branch.current_admitted_revision_sequence,
        effective_head_run_id: run.run_id,
        effective_head_run_manifest_hash: run.run_manifest_hash,
        head_blocker: null,
        ordered_cells: orderedCells(run),
        eligible_run_evidence_unit_refs: eligibleRefs,
      };
    });

    const watermarkWithoutHash = {
      schema_version: 'v1' as const,
      validation_cycle_id: validationCycleId,
      expected_cycle_version: cycle.expected_cycle_version,
      ordered_branches: orderedBranches,
      active_real_attempt_count: activeRealAttempts.length,
    };
    const watermark = {
      ...watermarkWithoutHash,
      closure_input_hash: serverHashPaperImplementationV2ClosureWatermark(watermarkWithoutHash),
    };

    const blockersWithoutOrdinals: Array<
      Omit<ValidationCycleReadinessBlockerV2, 'ordinal'>
    > = [
      ...blockedBranchIds.map((branchId) => ({
        code: 'BRANCH_HEAD_NOT_FROZEN' as const,
        branch_id: branchId,
      })),
      ...(activeRealAttempts.length > 0
        ? [{ code: 'CYCLE_ACTIVE_REAL_ATTEMPT' as const, branch_id: null }]
        : []),
      ...(closure
        ? [{ code: 'CYCLE_ALREADY_CLOSED' as const, branch_id: null }]
        : []),
    ];
    const orderedBlockers = blockersWithoutOrdinals.map((blocker, index) => ({
      ordinal: index + 1,
      ...blocker,
    }));

    return {
      schema_version: 'v1',
      validation_cycle_id: validationCycleId,
      status: orderedBlockers.length > 0
        ? 'blocked'
        : eligibleRunEvidenceUnitCount > 0
          ? 'ready_with_evidence'
          : 'ready_no_evidence',
      ordered_blockers: orderedBlockers,
      watermark,
      eligible_run_evidence_unit_count: eligibleRunEvidenceUnitCount,
    };
  }
}
