import type { PrismaClient } from '@prisma/client';

import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
} from '../experiment-spine-v2.repository.js';
import {
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES,
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_INITIAL_VERSION,
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES,
  PaperImplementationCycleReadinessV2RepositoryIntegrityError,
  type PaperImplementationCycleReadinessV2ActiveRealAttempt,
  type PaperImplementationCycleReadinessV2HeadReference,
  type PaperImplementationCycleReadinessV2Repository,
} from '../paper-implementation-cycle-readiness-v2.repository.js';

function headAcknowledgementKey(input: {
  implementation_project_id: string;
  validation_cycle_id: string;
  branch_id: string;
  branch_key: string;
  current_admitted_revision_id: string;
  current_admitted_revision_hash: string;
  current_admitted_revision_sequence: number;
  head_run_id: string;
  head_run_manifest_hash: string;
}): string {
  return [
    input.implementation_project_id,
    input.validation_cycle_id,
    input.branch_id,
    input.branch_key,
    input.current_admitted_revision_id,
    input.current_admitted_revision_hash,
    input.current_admitted_revision_sequence,
    input.head_run_id,
    input.head_run_manifest_hash,
  ].join('\0');
}

export class PrismaPaperImplementationCycleReadinessV2Repository
implements PaperImplementationCycleReadinessV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async findValidationCycle(validationCycleId: string) {
    const row = await this.prisma.paperImplementationValidationCycle.findUnique({
      where: { id: validationCycleId },
      select: {
        id: true,
        implementationProjectId: true,
        cycleStatus: true,
      },
    });
    if (!row) return null;
    return {
      validation_cycle_id: row.id,
      implementation_project_id: row.implementationProjectId,
      lifecycle_status: row.cycleStatus,
      // The additive v2 closure family has no mutable Cycle counter. Absence of
      // its unique closure row is the initial/only closable v2 CAS generation.
      expected_cycle_version: PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_INITIAL_VERSION,
    };
  }

  async listAdmittedBranches(validationCycleId: string) {
    const rows = await this.prisma.paperImplementationExperimentWorkOrderBranchV2.findMany({
      where: {
        validationCycleId,
        currentRevisionId: { not: null },
      },
      select: {
        id: true,
        branchKey: true,
        currentRevisionId: true,
        currentRevisionSequence: true,
        headRevisionId: true,
        headRevisionSequence: true,
        headRunId: true,
        headRunManifestHash: true,
        currentRevision: {
          select: {
            id: true,
            revisionSequence: true,
            contentHash: true,
          },
        },
      },
      orderBy: [{ branchKey: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => {
      if (
        row.currentRevisionId === null
        || row.currentRevisionSequence === null
        || row.currentRevision === null
        || row.currentRevision.id !== row.currentRevisionId
        || row.currentRevision.revisionSequence !== row.currentRevisionSequence
      ) {
        throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
          `Current admitted revision relation drifted for PI branch: ${row.id}`,
        );
      }
      return {
        branch_id: row.id,
        branch_key: row.branchKey,
        current_admitted_revision_id: row.currentRevisionId,
        current_admitted_revision_hash: row.currentRevision.contentHash,
        current_admitted_revision_sequence: row.currentRevisionSequence,
        head_revision_id: row.headRevisionId,
        head_revision_sequence: row.headRevisionSequence,
        head_run_id: row.headRunId,
        head_run_manifest_hash: row.headRunManifestHash,
      };
    });
  }

  async listHeadRunAccounting(
    references: readonly PaperImplementationCycleReadinessV2HeadReference[],
  ) {
    if (references.length === 0) return [];
    const referenceByRunId = new Map<string, PaperImplementationCycleReadinessV2HeadReference>();
    for (const reference of references) {
      if (referenceByRunId.has(reference.head_run_id)) {
        throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
          `More than one current PI head references EF Run: ${reference.head_run_id}`,
        );
      }
      referenceByRunId.set(reference.head_run_id, reference);
    }
    const runIds = [...referenceByRunId.keys()].sort();
    const [runs, acknowledgements] = await Promise.all([
      this.prisma.experimentFoundationRunV2.findMany({
        where: { id: { in: runIds } },
        select: {
          id: true,
          runManifestHash: true,
          externalPiBranchId: true,
          externalPiWorkOrderRevisionId: true,
          externalPiWorkOrderRevisionHash: true,
          externalPiRevisionSequence: true,
          cells: {
            select: {
              id: true,
              ordinal: true,
              cellKey: true,
              executionAttempts: {
                select: {
                  id: true,
                  attemptSequence: true,
                  lifecycleState: true,
                  executionMode: true,
                  provenance: true,
                },
                orderBy: [{ attemptSequence: 'asc' }, { id: 'asc' }],
              },
              experimentResults: {
                select: {
                  id: true,
                  contentHash: true,
                  executionAttemptId: true,
                  provenance: true,
                },
                orderBy: { id: 'asc' },
              },
            },
            orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.experimentFoundationIntegrationInboxV2.findMany({
        where: {
          consumerName: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
          eventType: 'BranchHeadAdvanced',
          schemaVersion: 'v1',
          producerDomain: 'PaperImplementation',
          status: 'processed',
          outcome: 'processed',
          runId: { in: runIds },
        },
        select: {
          implementationProjectId: true,
          validationCycleId: true,
          branchId: true,
          branchKey: true,
          workOrderRevisionId: true,
          workOrderRevisionHash: true,
          revisionSequence: true,
          runId: true,
          runManifestHash: true,
        },
        orderBy: [{ runId: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const acknowledgementCounts = new Map<string, number>();
    for (const row of acknowledgements) {
      if (row.runId === null || row.runManifestHash === null) continue;
      const key = headAcknowledgementKey({
        implementation_project_id: row.implementationProjectId,
        validation_cycle_id: row.validationCycleId,
        branch_id: row.branchId,
        branch_key: row.branchKey,
        current_admitted_revision_id: row.workOrderRevisionId,
        current_admitted_revision_hash: row.workOrderRevisionHash,
        current_admitted_revision_sequence: row.revisionSequence,
        head_run_id: row.runId,
        head_run_manifest_hash: row.runManifestHash,
      });
      acknowledgementCounts.set(key, (acknowledgementCounts.get(key) ?? 0) + 1);
    }

    return runs.map((run) => {
      const reference = referenceByRunId.get(run.id);
      if (!reference) {
        throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
          `Unexpected EF Run returned for PI head accounting: ${run.id}`,
        );
      }
      const acknowledgementCount = acknowledgementCounts.get(
        headAcknowledgementKey(reference),
      ) ?? 0;
      if (acknowledgementCount > 1) {
        throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
          `EF Run has more than one exact durable head acknowledgement: ${run.id}`,
        );
      }
      return {
        run_id: run.id,
        run_manifest_hash: run.runManifestHash,
        external_pi_branch_id: run.externalPiBranchId,
        external_pi_work_order_revision_id: run.externalPiWorkOrderRevisionId,
        external_pi_work_order_revision_hash: run.externalPiWorkOrderRevisionHash,
        external_pi_revision_sequence: run.externalPiRevisionSequence,
        head_acknowledged: acknowledgementCount === 1,
        cells: run.cells.map((cell) => {
          if (cell.experimentResults.length > 1) {
            throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
              `EF Run cell has more than one complete ExperimentResult: ${cell.id}`,
            );
          }
          const result = cell.experimentResults[0] ?? null;
          return {
            ordinal: cell.ordinal,
            run_cell_id: cell.id,
            cell_key: cell.cellKey,
            attempts: cell.executionAttempts.map((attempt) => ({
              execution_attempt_id: attempt.id,
              attempt_sequence: attempt.attemptSequence,
              lifecycle_state: attempt.lifecycleState,
              execution_mode: attempt.executionMode,
              provenance: attempt.provenance,
            })),
            complete_result: result
              ? {
                result_id: result.id,
                result_content_hash: result.contentHash,
                execution_attempt_id: result.executionAttemptId,
                provenance: result.provenance,
              }
              : null,
          };
        }),
      };
    });
  }

  async listCycleActiveRealAttempts(
    validationCycleId: string,
  ): Promise<PaperImplementationCycleReadinessV2ActiveRealAttempt[]> {
    const rows = await this.prisma.experimentFoundationExecutionAttemptV2.findMany({
      where: {
        externalPiValidationCycleId: validationCycleId,
        executionMode: { in: [...PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES] },
        provenance: 'real_provider',
        lifecycleState: {
          in: [...PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES],
        },
      },
      select: {
        id: true,
        externalPiValidationCycleId: true,
        runId: true,
        executionMode: true,
        provenance: true,
        lifecycleState: true,
      },
      orderBy: [{ runId: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => {
      if (
        !isRealExecutionMode(row.executionMode)
        || row.provenance !== 'real_provider'
        || !isActiveAttemptState(row.lifecycleState)
      ) {
        throw new PaperImplementationCycleReadinessV2RepositoryIntegrityError(
          `Cycle active-real Attempt query returned invalid facts: ${row.id}`,
        );
      }
      return {
        execution_attempt_id: row.id,
        validation_cycle_id: row.externalPiValidationCycleId,
        run_id: row.runId,
        execution_mode: row.executionMode,
        provenance: row.provenance,
        lifecycle_state: row.lifecycleState,
      };
    });
  }

  async listEligibleRunEvidenceUnits(validationCycleId: string) {
    const rows = await this.prisma.paperImplementationRunEvidenceUnitV2.findMany({
      where: { validationCycleId },
      select: {
        validationCycleId: true,
        branchId: true,
        workOrderRevisionId: true,
        workOrderRevisionHash: true,
        branchRevisionSequence: true,
        runId: true,
        runManifestHash: true,
        id: true,
        contentHash: true,
      },
      orderBy: [{ branchId: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => ({
      validation_cycle_id: row.validationCycleId,
      branch_id: row.branchId,
      work_order_revision_id: row.workOrderRevisionId,
      work_order_revision_hash: row.workOrderRevisionHash,
      branch_revision_sequence: row.branchRevisionSequence,
      run_id: row.runId,
      run_manifest_hash: row.runManifestHash,
      run_evidence_unit_id: row.id,
      content_hash: row.contentHash,
    }));
  }

  async findCycleClosure(validationCycleId: string) {
    const row = await this.prisma.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId },
      select: {
        id: true,
        validationCycleId: true,
        cycleVersionAtClosure: true,
        closureInputHash: true,
      },
    });
    return row
      ? {
        closure_id: row.id,
        validation_cycle_id: row.validationCycleId,
        cycle_version_at_closure: row.cycleVersionAtClosure,
        closure_input_hash: row.closureInputHash,
      }
      : null;
  }
}

function isActiveAttemptState(
  value: string,
): value is PaperImplementationCycleReadinessV2ActiveRealAttempt['lifecycle_state'] {
  return (PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES as readonly string[])
    .includes(value);
}

function isRealExecutionMode(
  value: string,
): value is PaperImplementationCycleReadinessV2ActiveRealAttempt['execution_mode'] {
  return (PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES as readonly string[])
    .includes(value);
}
