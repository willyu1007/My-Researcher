import type {
  Prisma,
  PrismaClient,
} from '@prisma/client';
import {
  SCIENTIFIC_DISPOSITIONS_V2,
  VALIDATION_CYCLE_CLOSURE_KINDS_V2,
  type ScientificDispositionV2,
  type ValidationCycleClosureKindV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-evidence-v2-contracts';
import type {
  PaperImplementationExperimentLineageClosureStateV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-lineage-v2-contracts';

import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
} from '../experiment-spine-v2.repository.js';
import {
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES,
  PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES,
} from '../paper-implementation-cycle-readiness-v2.repository.js';
import type {
  PaperImplementationExperimentLineageV2BranchHistoryReadModel,
  PaperImplementationExperimentLineageV2BranchRecord,
  PaperImplementationExperimentLineageV2CycleSummaryRecord,
  PaperImplementationExperimentLineageV2HeadRunRecord,
  PaperImplementationExperimentLineageV2Repository,
  PaperImplementationExperimentLineageV2RevisionRunRecord,
} from '../paper-implementation-experiment-lineage-v2.repository.js';

class PaperImplementationExperimentLineageV2RepositoryIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaperImplementationExperimentLineageV2RepositoryIntegrityError';
  }
}

interface RunCountRow {
  validationCycleId: string;
  totalRunCount: number;
}

interface HeadRunRow {
  branchId: string;
  runId: string;
  runManifestHash: string;
  externalPiBranchId: string;
  externalPiWorkOrderRevisionId: string;
  externalPiWorkOrderRevisionHash: string;
  externalPiRevisionSequence: number;
  headAcknowledgementCount: number;
  runCellId: string | null;
  cellOrdinal: number | null;
  cellKey: string | null;
  trainingTaskSpecId: string | null;
  trainingTaskSpecHash: string | null;
}

interface RevisionRunRow {
  workOrderRevisionId: string;
  runId: string;
  runManifestHash: string;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parentBranchKey(branchId: string, value: Prisma.JsonValue): string | null {
  if (!isRecord(value)) {
    throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
      `Stored PI branch frame is not an object: ${branchId}`,
    );
  }
  const parent = value.parent_branch_key;
  if (parent === null) return null;
  if (typeof parent === 'string' && parent.length > 0) return parent;
  throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
    `Stored PI branch frame has invalid parent_branch_key: ${branchId}`,
  );
}

function isClosureKind(value: string): value is ValidationCycleClosureKindV2 {
  return (VALIDATION_CYCLE_CLOSURE_KINDS_V2 as readonly string[]).includes(value);
}

function isScientificDisposition(value: string): value is ScientificDispositionV2 {
  return (SCIENTIFIC_DISPOSITIONS_V2 as readonly string[]).includes(value);
}

function closedState(row: {
  closureKind: string;
  scientificDisposition: string | null;
  createdAt: Date;
} | undefined): PaperImplementationExperimentLineageClosureStateV2 {
  if (!row) {
    return {
      closed: false,
      kind: null,
      disposition: null,
      closed_at: null,
    };
  }
  if (!isClosureKind(row.closureKind)) {
    throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
      `Stored ValidationCycle closure kind is invalid: ${row.closureKind}`,
    );
  }
  if (
    row.scientificDisposition !== null
    && !isScientificDisposition(row.scientificDisposition)
  ) {
    throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
      `Stored ValidationCycle scientific disposition is invalid: ${row.scientificDisposition}`,
    );
  }
  return {
    closed: true,
    kind: row.closureKind,
    disposition: row.scientificDisposition,
    closed_at: row.createdAt.toISOString(),
  };
}

export class PrismaPaperImplementationExperimentLineageV2Repository
implements PaperImplementationExperimentLineageV2Repository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  async listProjectValidationCycles(implementationProjectId: string) {
    const project = await this.prisma.paperImplementationProject.findFirst({
      where: { id: implementationProjectId },
      select: { id: true },
    });
    if (!project) return null;

    const [cycles, branches, closures, attempts, runCounts] = await Promise.all([
      this.prisma.paperImplementationValidationCycle.findMany({
        where: { implementationProjectId },
        select: {
          id: true,
          cycleStatus: true,
          targetRefType: true,
          targetRefId: true,
          targetVersionId: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.paperImplementationExperimentWorkOrderBranchV2.findMany({
        where: { implementationProjectId },
        select: {
          validationCycleId: true,
          currentRevisionId: true,
        },
        orderBy: [{ validationCycleId: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.paperImplementationValidationCycleClosureV2.findMany({
        where: { implementationProjectId },
        select: {
          validationCycleId: true,
          closureKind: true,
          scientificDisposition: true,
          createdAt: true,
        },
        orderBy: [{ validationCycleId: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.experimentFoundationExecutionAttemptV2.findMany({
        where: {
          externalPiImplementationProjectId: implementationProjectId,
          executionMode: {
            in: [...PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_REAL_EXECUTION_MODES],
          },
          provenance: 'real_provider',
          lifecycleState: {
            in: [...PAPER_IMPLEMENTATION_CYCLE_READINESS_V2_ACTIVE_ATTEMPT_STATES],
          },
        },
        select: {
          externalPiValidationCycleId: true,
          id: true,
        },
        orderBy: [{ externalPiValidationCycleId: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.$queryRaw<RunCountRow[]>`
        SELECT
          b."validationCycleId" AS "validationCycleId",
          COUNT(r.id)::int AS "totalRunCount"
        FROM "PaperImplementationExperimentWorkOrderBranchV2" b
        JOIN "PaperImplementationExperimentWorkOrderRevisionV2" revision
          ON revision."branchId" = b.id
        JOIN "ExperimentFoundationRunV2" r
          ON r."externalPiBranchId" = b.id
          AND r."externalPiWorkOrderRevisionId" = revision.id
          AND r."externalPiWorkOrderRevisionHash" = revision."contentHash"
          AND r."externalPiRevisionSequence" = revision."revisionSequence"
        WHERE b."implementationProjectId" = ${implementationProjectId}
        GROUP BY b."validationCycleId"
        ORDER BY b."validationCycleId" ASC
      `,
    ]);

    const branchCounts = new Map<string, { all: number; admitted: number }>();
    for (const branch of branches) {
      const counts = branchCounts.get(branch.validationCycleId) ?? { all: 0, admitted: 0 };
      counts.all += 1;
      if (branch.currentRevisionId !== null) counts.admitted += 1;
      branchCounts.set(branch.validationCycleId, counts);
    }
    const activeAttemptCounts = new Map<string, number>();
    for (const attempt of attempts) {
      activeAttemptCounts.set(
        attempt.externalPiValidationCycleId,
        (activeAttemptCounts.get(attempt.externalPiValidationCycleId) ?? 0) + 1,
      );
    }
    const closureByCycleId = new Map(closures.map((closure) => [
      closure.validationCycleId,
      closure,
    ]));
    if (closureByCycleId.size !== closures.length) {
      throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
        `Project has duplicate v2 ValidationCycle closure rows: ${implementationProjectId}`,
      );
    }
    const runCountByCycleId = new Map(runCounts.map((row) => [
      row.validationCycleId,
      row.totalRunCount,
    ]));

    const summaries: PaperImplementationExperimentLineageV2CycleSummaryRecord[] =
      cycles.map((cycle) => {
        const counts = branchCounts.get(cycle.id) ?? { all: 0, admitted: 0 };
        return {
          validation_cycle_id: cycle.id,
          lifecycle_status: cycle.cycleStatus,
          target_ref_type: cycle.targetRefType,
          target_ref_id: cycle.targetRefId,
          target_version_id: cycle.targetVersionId,
          created_at: cycle.createdAt.toISOString(),
          closure: closedState(closureByCycleId.get(cycle.id)),
          branch_count: counts.all,
          admitted_branch_count: counts.admitted,
          total_run_count: runCountByCycleId.get(cycle.id) ?? 0,
          active_real_attempt_count: activeAttemptCounts.get(cycle.id) ?? 0,
        };
      });

    return {
      implementation_project_id: project.id,
      cycles: summaries,
    };
  }

  async findValidationCycleExperimentLineage(
    implementationProjectId: string,
    validationCycleId: string,
  ) {
    const [cycle, closure, branchRows, headRunRows] = await Promise.all([
      this.prisma.paperImplementationValidationCycle.findFirst({
        where: {
          id: validationCycleId,
          implementationProjectId,
        },
        select: {
          id: true,
          implementationProjectId: true,
          cycleStatus: true,
          targetRefType: true,
          targetRefId: true,
          targetVersionId: true,
          createdAt: true,
        },
      }),
      this.prisma.paperImplementationValidationCycleClosureV2.findFirst({
        where: {
          implementationProjectId,
          validationCycleId,
        },
        select: {
          closureKind: true,
          scientificDisposition: true,
          createdAt: true,
        },
      }),
      this.prisma.paperImplementationExperimentWorkOrderBranchV2.findMany({
        where: {
          implementationProjectId,
          validationCycleId,
          currentRevisionId: { not: null },
        },
        select: {
          id: true,
          branchKey: true,
          branchFrameJson: true,
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
      }),
      this.prisma.$queryRaw<HeadRunRow[]>`
        SELECT
          b.id AS "branchId",
          r.id AS "runId",
          r."runManifestHash" AS "runManifestHash",
          r."externalPiBranchId" AS "externalPiBranchId",
          r."externalPiWorkOrderRevisionId" AS "externalPiWorkOrderRevisionId",
          r."externalPiWorkOrderRevisionHash" AS "externalPiWorkOrderRevisionHash",
          r."externalPiRevisionSequence" AS "externalPiRevisionSequence",
          (
            SELECT COUNT(*)::int
            FROM "ExperimentFoundationIntegrationInboxV2" acknowledgement
            WHERE acknowledgement."implementationProjectId" = ${implementationProjectId}
              AND acknowledgement."validationCycleId" = ${validationCycleId}
              AND acknowledgement."consumerName" =
                ${EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER}
              AND acknowledgement."eventType" = 'BranchHeadAdvanced'
              AND acknowledgement."schemaVersion" = 'v1'
              AND acknowledgement."producerDomain" = 'PaperImplementation'
              AND acknowledgement.status = 'processed'
              AND acknowledgement.outcome = 'processed'
              AND acknowledgement."branchId" = b.id
              AND acknowledgement."branchKey" = b."branchKey"
              AND acknowledgement."workOrderRevisionId" = b."currentRevisionId"
              AND acknowledgement."workOrderRevisionHash" =
                current_revision."contentHash"
              AND acknowledgement."revisionSequence" = b."currentRevisionSequence"
              AND acknowledgement."runId" = b."headRunId"
              AND acknowledgement."runManifestHash" = b."headRunManifestHash"
          ) AS "headAcknowledgementCount",
          cell.id AS "runCellId",
          cell.ordinal AS "cellOrdinal",
          cell."cellKey" AS "cellKey",
          task_spec.id AS "trainingTaskSpecId",
          task_spec."taskSpecHash" AS "trainingTaskSpecHash"
        FROM "PaperImplementationExperimentWorkOrderBranchV2" b
        JOIN "PaperImplementationExperimentWorkOrderRevisionV2" current_revision
          ON current_revision."branchId" = b.id
          AND current_revision.id = b."currentRevisionId"
          AND current_revision."revisionSequence" = b."currentRevisionSequence"
        JOIN "ExperimentFoundationRunV2" r
          ON r.id = b."headRunId"
        LEFT JOIN "ExperimentFoundationRunCellV2" cell
          ON cell."runId" = r.id
        LEFT JOIN "ExperimentFoundationTrainingTaskSpecV2" task_spec
          ON task_spec.id = cell."trainingTaskSpecId"
        WHERE b."implementationProjectId" = ${implementationProjectId}
          AND b."validationCycleId" = ${validationCycleId}
          AND b."currentRevisionId" IS NOT NULL
        ORDER BY b."branchKey" ASC, b.id ASC, cell.ordinal ASC, cell.id ASC
      `,
    ]);
    if (!cycle) return null;

    const headRunsByBranchId = this.mapHeadRuns(headRunRows);
    const candidateRunIds = [...new Set(
      [...headRunsByBranchId.values()].map((run) => run.run_id),
    )].sort(compareText);
    const attempts = candidateRunIds.length === 0
      ? []
      : await this.prisma.experimentFoundationExecutionAttemptV2.findMany({
        where: {
          externalPiImplementationProjectId: implementationProjectId,
          externalPiValidationCycleId: validationCycleId,
          runId: { in: candidateRunIds },
        },
        select: {
          id: true,
          runId: true,
          runCellId: true,
          attemptSequence: true,
          executionMode: true,
          lifecycleState: true,
          terminalReasonCode: true,
          updatedAt: true,
          collectionAttempt: {
            select: {
              collectionState: true,
              provisionalOutputs: {
                select: {
                  outputKind: true,
                },
                orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
        orderBy: [
          { runId: 'asc' },
          { runCellId: 'asc' },
          { attemptSequence: 'asc' },
          { id: 'asc' },
        ],
      });
    for (const attempt of attempts) {
      const run = [...headRunsByBranchId.values()].find((candidate) => (
        candidate.run_id === attempt.runId
      ));
      if (!run) {
        throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
          `Attempt resolved outside candidate head Runs: ${attempt.id}`,
        );
      }
      run.attempts.push({
        execution_attempt_id: attempt.id,
        run_cell_id: attempt.runCellId,
        attempt_sequence: attempt.attemptSequence,
        execution_mode: attempt.executionMode,
        lifecycle_state: attempt.lifecycleState,
        terminal_reason_code: attempt.terminalReasonCode,
        updated_at: attempt.updatedAt.toISOString(),
        collection: attempt.collectionAttempt
          ? {
            collection_state: attempt.collectionAttempt.collectionState,
            output_kinds: attempt.collectionAttempt.provisionalOutputs
              .map((output) => output.outputKind),
          }
          : null,
      });
    }

    const branches: PaperImplementationExperimentLineageV2BranchRecord[] =
      branchRows.map((branch) => {
        if (
          branch.currentRevisionId === null
          || branch.currentRevisionSequence === null
          || branch.currentRevision === null
          || branch.currentRevision.id !== branch.currentRevisionId
          || branch.currentRevision.revisionSequence !== branch.currentRevisionSequence
        ) {
          throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
            `Current admitted revision relation drifted for PI branch: ${branch.id}`,
          );
        }
        return {
          branch_id: branch.id,
          branch_key: branch.branchKey,
          parent_branch_key: parentBranchKey(branch.id, branch.branchFrameJson),
          current_admitted_revision_id: branch.currentRevision.id,
          current_admitted_revision_hash: branch.currentRevision.contentHash,
          current_admitted_revision_sequence: branch.currentRevision.revisionSequence,
          head_revision_id: branch.headRevisionId,
          head_revision_sequence: branch.headRevisionSequence,
          head_run_id: branch.headRunId,
          head_run_manifest_hash: branch.headRunManifestHash,
          head_run: headRunsByBranchId.get(branch.id) ?? null,
        };
      });

    return {
      implementation_project_id: cycle.implementationProjectId,
      validation_cycle_id: cycle.id,
      lifecycle_status: cycle.cycleStatus,
      target_ref_type: cycle.targetRefType,
      target_ref_id: cycle.targetRefId,
      target_version_id: cycle.targetVersionId,
      created_at: cycle.createdAt.toISOString(),
      closure: closedState(closure ?? undefined),
      branches,
    };
  }

  async findWorkOrderBranchRevisionHistory(
    implementationProjectId: string,
    branchId: string,
  ): Promise<PaperImplementationExperimentLineageV2BranchHistoryReadModel | null> {
    const [branch, runRows] = await Promise.all([
      this.prisma.paperImplementationExperimentWorkOrderBranchV2.findFirst({
        where: {
          id: branchId,
          implementationProjectId,
        },
        select: {
          id: true,
          implementationProjectId: true,
          validationCycleId: true,
          branchKey: true,
          branchFrameJson: true,
          currentRevisionId: true,
          headRevisionId: true,
          headRevisionSequence: true,
          headRunId: true,
          headRunManifestHash: true,
          revisions: {
            select: {
              id: true,
              revisionSequence: true,
              contentHash: true,
              parentRevisionId: true,
              admission: {
                select: {
                  admittedAt: true,
                  businessIdempotencyKey: true,
                },
              },
              _count: {
                select: {
                  cells: true,
                },
              },
            },
            orderBy: [{ revisionSequence: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      this.prisma.$queryRaw<RevisionRunRow[]>`
        SELECT
          revision.id AS "workOrderRevisionId",
          run.id AS "runId",
          run."runManifestHash" AS "runManifestHash"
        FROM "PaperImplementationExperimentWorkOrderBranchV2" branch
        JOIN "PaperImplementationExperimentWorkOrderRevisionV2" revision
          ON revision."branchId" = branch.id
        JOIN "ExperimentFoundationRunV2" run
          ON run."externalPiBranchId" = branch.id
          AND run."externalPiWorkOrderRevisionId" = revision.id
          AND run."externalPiWorkOrderRevisionHash" = revision."contentHash"
          AND run."externalPiRevisionSequence" = revision."revisionSequence"
        WHERE branch."implementationProjectId" = ${implementationProjectId}
          AND branch.id = ${branchId}
        ORDER BY revision."revisionSequence" ASC, revision.id ASC
      `,
    ]);
    if (!branch) return null;

    const runsByRevisionId = new Map<string, PaperImplementationExperimentLineageV2RevisionRunRecord>();
    for (const row of runRows) {
      if (runsByRevisionId.has(row.workOrderRevisionId)) {
        throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
          `PI WorkOrder revision has more than one materialized EF Run: ${row.workOrderRevisionId}`,
        );
      }
      runsByRevisionId.set(row.workOrderRevisionId, {
        run_id: row.runId,
        run_manifest_hash: row.runManifestHash,
      });
    }

    return {
      implementation_project_id: branch.implementationProjectId,
      validation_cycle_id: branch.validationCycleId,
      branch_id: branch.id,
      branch_key: branch.branchKey,
      parent_branch_key: parentBranchKey(branch.id, branch.branchFrameJson),
      current_admitted_revision_id: branch.currentRevisionId,
      head_revision_id: branch.headRevisionId,
      head_revision_sequence: branch.headRevisionSequence,
      head_run_id: branch.headRunId,
      head_run_manifest_hash: branch.headRunManifestHash,
      revisions: branch.revisions.map((revision) => ({
        work_order_revision_id: revision.id,
        revision_sequence: revision.revisionSequence,
        content_hash: revision.contentHash,
        parent_revision_id: revision.parentRevisionId,
        admitted_at: revision.admission?.admittedAt.toISOString() ?? null,
        admission_business_idempotency_key:
          revision.admission?.businessIdempotencyKey ?? null,
        cell_count: revision._count.cells,
        run: runsByRevisionId.get(revision.id) ?? null,
      })),
    };
  }

  private mapHeadRuns(rows: readonly HeadRunRow[]): Map<string, PaperImplementationExperimentLineageV2HeadRunRecord> {
    const runsByBranchId = new Map<string, PaperImplementationExperimentLineageV2HeadRunRecord>();
    for (const row of rows) {
      if (row.headAcknowledgementCount > 1) {
        throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
          `EF Run has more than one exact durable head acknowledgement: ${row.runId}`,
        );
      }
      const existing = runsByBranchId.get(row.branchId);
      const run = existing ?? {
        run_id: row.runId,
        run_manifest_hash: row.runManifestHash,
        external_pi_branch_id: row.externalPiBranchId,
        external_pi_work_order_revision_id: row.externalPiWorkOrderRevisionId,
        external_pi_work_order_revision_hash: row.externalPiWorkOrderRevisionHash,
        external_pi_revision_sequence: row.externalPiRevisionSequence,
        head_acknowledged: row.headAcknowledgementCount === 1,
        cells: [],
        attempts: [],
      };
      if (
        run.run_id !== row.runId
        || run.run_manifest_hash !== row.runManifestHash
        || run.head_acknowledged !== (row.headAcknowledgementCount === 1)
      ) {
        throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
          `PI branch resolved more than one candidate head Run: ${row.branchId}`,
        );
      }
      if (
        row.runCellId !== null
        && row.cellOrdinal !== null
        && row.cellKey !== null
        && row.trainingTaskSpecId !== null
        && row.trainingTaskSpecHash !== null
      ) {
        run.cells.push({
          run_cell_id: row.runCellId,
          ordinal: row.cellOrdinal,
          cell_key: row.cellKey,
          training_task_spec_id: row.trainingTaskSpecId,
          training_task_spec_hash: row.trainingTaskSpecHash,
        });
      } else if (
        row.runCellId !== null
        || row.cellOrdinal !== null
        || row.cellKey !== null
        || row.trainingTaskSpecId !== null
        || row.trainingTaskSpecHash !== null
      ) {
        throw new PaperImplementationExperimentLineageV2RepositoryIntegrityError(
          `EF head Run cell/task-spec relation is partial: ${row.runId}`,
        );
      }
      runsByBranchId.set(row.branchId, run);
    }
    return runsByBranchId;
  }
}
