import {
  Prisma,
  type ExperimentFoundationEvidenceCandidateV2 as EvidenceCandidateRow,
  type ExperimentFoundationExperimentResultV2 as ExperimentResultRow,
  type ExperimentFoundationScientificValidationReportV2 as ValidationReportRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv, type ValidateFunction } from 'ajv';
import {
  experimentResultCellV2Schema,
  scientificValidationReportV2Schema,
  type EvidenceCandidateV2,
  type ExperimentResultCellV2,
  type ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  experimentFoundationV2EvaluationProtocolRevisionContentV2Schema,
  type ExperimentFoundationRunCellV2,
  type ExperimentFoundationV2EvaluationProtocolRevisionContentV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentFoundationV2AssetRevision,
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificResult,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type ExperimentFoundationScientificValidationV2ExecutionAttempt,
  type ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  type ExperimentFoundationScientificValidationV2Protocol,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2Run,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
  type PersistExperimentFoundationScientificResultV2Input,
  type PersistExperimentFoundationScientificValidationV2Input,
} from '../experiment-foundation-scientific-validation-v2.repository.js';

type ScientificValidationClient = Pick<
  Prisma.TransactionClient,
  | 'experimentFoundationScientificValidationReportV2'
  | 'experimentFoundationEvidenceCandidateV2'
>;

const storedAjv = new Ajv({ allErrors: true, strict: false, removeAdditional: false });
const protocolValidator = storedAjv.compile<
  ExperimentFoundationV2EvaluationProtocolRevisionContentV2
>(experimentFoundationV2EvaluationProtocolRevisionContentV2Schema);
const resultValidator = storedAjv.compile<ExperimentResultCellV2>(experimentResultCellV2Schema);
const reportValidator = storedAjv.compile<ScientificValidationReportV2>(
  scientificValidationReportV2Schema,
);

function constraint(
  reasonCode: ConstructorParameters<
    typeof ExperimentFoundationScientificValidationV2ConstraintError
  >[0],
  message: string,
): ExperimentFoundationScientificValidationV2ConstraintError {
  return new ExperimentFoundationScientificValidationV2ConstraintError(reasonCode, message);
}

export class PrismaExperimentFoundationScientificValidationV2Repository
implements ExperimentFoundationScientificValidationV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async loadRun(
    runId: string,
    expectedRunManifestHash: string,
  ): Promise<ExperimentFoundationScientificValidationV2Run | null> {
    const run = await this.prisma.experimentFoundationRunV2.findUnique({
      where: { id: runId },
    });
    if (!run || run.runManifestHash !== expectedRunManifestHash) return null;

    const cellRows = await this.prisma.experimentFoundationRunCellV2.findMany({
      where: { runId },
      include: {
        trainingTaskSpec: { select: { taskSpecHash: true } },
      },
      orderBy: { ordinal: 'asc' },
    });
    const orderedCells: ExperimentFoundationRunCellV2[] = cellRows.map((row) => ({
      run_cell_id: row.id,
      run_id: row.runId,
      ordinal: row.ordinal,
      cell_key: row.cellKey,
      external_pi_cell_id: row.externalPiWorkOrderCellId,
      external_pi_cell_hash: row.externalPiWorkOrderCellHash,
      training_task_spec_id: row.trainingTaskSpecId,
      training_task_spec_hash: row.trainingTaskSpec.taskSpecHash,
      seed: row.seed,
      repeat_index: row.repeatIndex,
    }));
    if (
      orderedCells.length === 0
      || orderedCells.some((cell, index) => cell.ordinal !== index + 1)
    ) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'Run cells are missing or are not an exact ordered 1..N batch.',
      );
    }

    return {
      run_id: run.id,
      run_recipe_id: run.runRecipeId,
      run_manifest_hash: run.runManifestHash,
      external_pi_branch_id: run.externalPiBranchId,
      external_pi_work_order_revision_id: run.externalPiWorkOrderRevisionId,
      external_pi_work_order_revision_hash: run.externalPiWorkOrderRevisionHash,
      external_pi_revision_sequence: run.externalPiRevisionSequence,
      ordered_cells: orderedCells,
    };
  }

  async resolveEvaluationProtocol(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2Protocol | null> {
    const run = await this.prisma.experimentFoundationRunV2.findUnique({
      where: { id: runId },
      select: { runRecipeId: true },
    });
    if (!run) return null;
    const recipe = await this.prisma.experimentFoundationRunRecipeV2.findUnique({
      where: { id: run.runRecipeId },
      select: { versionLockId: true },
    });
    if (!recipe) return null;
    const dependencies = await this.prisma.experimentFoundationVersionLockDependencyV2.findMany({
      where: {
        versionLockId: recipe.versionLockId,
        dependencyAssetType: 'EvaluationProtocol',
      },
      orderBy: { ordinal: 'asc' },
    });
    if (dependencies.length !== 1) {
      throw constraint(
        'VALIDATION_SUBJECT_INCOMPLETE',
        'Run VersionLock must resolve exactly one EvaluationProtocol revision.',
      );
    }
    const dependency = dependencies[0]!;
    const revision = await this.prisma.experimentFoundationEvaluationProtocolRevisionV2.findUnique({
      where: { id: dependency.dependencyRevisionId },
    });
    if (!revision) return null;

    const snapshot = parseStored(
      protocolValidator,
      revision.evaluationProtocolSnapshotJson,
      'EvaluationProtocol revision snapshot',
      'VALIDATION_SUBJECT_INCOMPLETE',
    );
    const canonicalHash = serverHashExperimentFoundationV2AssetRevision({
      asset_type: 'EvaluationProtocol',
      content: snapshot,
    });
    if (
      dependency.dependencyAssetId !== revision.evaluationProtocolId
      || dependency.dependencyRevisionSequence !== revision.revisionSequence
      || dependency.dependencyRevisionHash !== revision.contentHash
      || revision.schemaVersion !== 'v2'
      || revision.contentHash !== canonicalHash
    ) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'EvaluationProtocol VersionLock, revision columns, snapshot, or canonical hash drifted.',
      );
    }

    return {
      evaluation_protocol: {
        asset_type: 'EvaluationProtocol',
        logical_id: revision.evaluationProtocolId,
        revision_id: revision.id,
        revision_sequence: revision.revisionSequence,
        content_hash: revision.contentHash,
      },
      protocol_snapshot: snapshot,
    };
  }

  async loadHeadAcknowledgement(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2HeadAcknowledgement | null> {
    const run = await this.prisma.experimentFoundationRunV2.findUnique({ where: { id: runId } });
    if (!run) return null;
    const rows = await this.prisma.experimentFoundationIntegrationInboxV2.findMany({
      where: {
        runId,
        runManifestHash: run.runManifestHash,
        eventType: 'BranchHeadAdvanced',
        schemaVersion: 'v1',
        producerDomain: 'PaperImplementation',
        status: 'processed',
        outcome: 'processed',
      },
      orderBy: { processedAt: 'desc' },
    });
    if (rows.length === 0) return null;
    if (rows.length !== 1) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'Run has more than one durable head-acknowledgement receipt.',
      );
    }
    const row = rows[0]!;
    if (
      row.branchId !== run.externalPiBranchId
      || row.workOrderRevisionId !== run.externalPiWorkOrderRevisionId
      || row.workOrderRevisionHash !== run.externalPiWorkOrderRevisionHash
      || row.revisionSequence !== run.externalPiRevisionSequence
      || row.runId !== run.id
      || row.runManifestHash !== run.runManifestHash
    ) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'Head acknowledgement does not bind the exact Run and PI revision scope.',
      );
    }
    return {
      inbox_id: row.id,
      event_id: row.eventId,
      correlation_id: row.correlationId,
      implementation_project_id: row.implementationProjectId,
      validation_cycle_id: row.validationCycleId,
      branch_id: row.branchId,
      branch_key: row.branchKey,
      work_order_revision_id: row.workOrderRevisionId,
      revision_sequence: row.revisionSequence,
      work_order_revision_hash: row.workOrderRevisionHash,
      cell_plan_hash: row.cellPlanHash,
      approved_plan_hash: row.approvedPlanHash,
      run_id: row.runId,
      run_manifest_hash: row.runManifestHash,
    };
  }

  async loadExecutionAttempt(
    executionAttemptId: string,
  ): Promise<ExperimentFoundationScientificValidationV2ExecutionAttempt | null> {
    const row = await this.prisma.experimentFoundationExecutionAttemptV2.findUnique({
      where: { id: executionAttemptId },
    });
    if (!row) return null;
    if (!isAttemptState(row.lifecycleState)) {
      throw constraint('VALIDATION_SCOPE_DRIFT', 'Execution Attempt has an unknown lifecycle state.');
    }
    if (!isExecutionMode(row.executionMode) || !isExecutionProvenance(row.provenance)) {
      throw constraint(
        'EVIDENCE_PROVENANCE_REJECTED',
        'Execution Attempt has an unknown or ineligible provider provenance.',
      );
    }
    return {
      execution_attempt_id: row.id,
      run_id: row.runId,
      run_manifest_hash: row.runManifestHash,
      run_cell_id: row.runCellId,
      cell_key: row.cellKey,
      training_task_spec_id: row.trainingTaskSpecId,
      training_task_spec_hash: row.trainingTaskSpecHash,
      lifecycle_state: row.lifecycleState,
      execution_mode: row.executionMode,
      provenance: row.provenance,
    };
  }

  async persistExperimentResult(
    input: PersistExperimentFoundationScientificResultV2Input,
  ): Promise<ExperimentResultCellV2> {
    assertResultIntegrity(input.result);
    const existing = await this.prisma.experimentFoundationExperimentResultV2.findUnique({
      where: { runCellId: input.result.run_cell_id },
    });
    if (existing) return exactResultReplay(existing, input.result);

    try {
      const row = await this.prisma.experimentFoundationExperimentResultV2.create({
        data: {
          id: input.result.result_id,
          runId: input.result.run_id,
          runManifestHash: input.result.run_manifest_hash,
          runCellId: input.result.run_cell_id,
          cellKey: input.result.cell_key,
          trainingTaskSpecId: input.result.training_task_spec_id,
          trainingTaskSpecHash: input.result.training_task_spec_hash,
          executionAttemptId: input.result.execution_attempt_id,
          provenance: input.result.provenance,
          schemaVersion: input.result.schema_version,
          metricObservationCount: input.result.metric_observations.length,
          artifactObservationCount: input.result.artifact_observations.length,
          resultSnapshotJson: toInputJson(input.result),
          contentHash: input.result.content_hash,
          createdAt: new Date(input.created_at),
        },
      });
      return mapResult(row);
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        const replay = await this.prisma.experimentFoundationExperimentResultV2.findUnique({
          where: { runCellId: input.result.run_cell_id },
        });
        if (replay) return exactResultReplay(replay, input.result);
        throw constraint(
          'VALIDATION_RESULT_CONFLICT',
          'Scientific result uniqueness rejected a changed Attempt or identifier replay.',
        );
      }
      if (isPrismaForeignKeyConflict(error)) {
        throw constraint(
          'VALIDATION_SCOPE_DRIFT',
          'Scientific result lost an exact Run, cell, TaskSpec, or Attempt prerequisite.',
        );
      }
      throw error;
    }
  }

  async loadRunResults(runId: string): Promise<ExperimentResultCellV2[]> {
    const rows = await this.prisma.experimentFoundationExperimentResultV2.findMany({
      where: { runId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapResult);
  }

  async loadValidationByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null> {
    const report = await this.prisma.experimentFoundationScientificValidationReportV2.findUnique({
      where: { idempotencyKey },
    });
    return report ? loadStoredOutcome(this.prisma, report) : null;
  }

  async loadValidationByRunId(
    runId: string,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome | null> {
    const report = await this.prisma.experimentFoundationScientificValidationReportV2.findUnique({
      where: { runId },
    });
    return report ? loadStoredOutcome(this.prisma, report) : null;
  }

  async persistValidationOutcome(
    input: PersistExperimentFoundationScientificValidationV2Input,
  ): Promise<ExperimentFoundationScientificValidationV2StoredOutcome> {
    assertValidationPersistenceInput(input);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const byKey = await transaction.experimentFoundationScientificValidationReportV2.findUnique({
          where: { idempotencyKey: input.idempotency_key },
        });
        if (byKey) {
          const existing = await loadStoredOutcome(transaction, byKey);
          if (existing.report.validation_hash !== input.report.validation_hash) {
            throw constraint(
              'VALIDATION_IDEMPOTENCY_CONFLICT',
              'Scientific validation idempotency key was reused with changed content.',
            );
          }
          return existing;
        }

        const byRun = await transaction.experimentFoundationScientificValidationReportV2.findUnique({
          where: { runId: input.report.run_id },
        });
        if (byRun) {
          const existing = await loadStoredOutcome(transaction, byRun);
          if (existing.report.validation_hash !== input.report.validation_hash) {
            throw constraint(
              'VALIDATION_RESULT_CONFLICT',
              'Run already has a different scientific validation report.',
            );
          }
          return existing;
        }

        const reportRow = await transaction.experimentFoundationScientificValidationReportV2.create({
          data: {
            id: input.report.report_id,
            runId: input.report.run_id,
            runManifestHash: input.report.run_manifest_hash,
            evaluationProtocolId: input.report.evaluation_protocol.logical_id,
            evaluationProtocolRevisionId: input.report.evaluation_protocol.revision_id,
            evaluationProtocolRevisionSequence:
              input.report.evaluation_protocol.revision_sequence,
            evaluationProtocolContentHash: input.report.evaluation_protocol.content_hash,
            validatorProfileVersion: input.report.validator_profile_version,
            validatorProfileHash: input.report.validator_profile_hash,
            status: input.report.status,
            schemaVersion: input.report.schema_version,
            orderedCellResultCount: input.report.ordered_cell_results.length,
            orderedRuleResultCount: input.report.ordered_rule_results.length,
            reportSnapshotJson: toInputJson(input.report),
            validationHash: input.report.validation_hash,
            idempotencyKey: input.idempotency_key,
            createdAt: new Date(input.created_at),
          },
        });

        if (input.evidence_candidate && input.outbox) {
          await transaction.experimentFoundationEvidenceCandidateV2.create({
            data: {
              id: input.evidence_candidate.candidate_id,
              validationReportId: input.evidence_candidate.validation_report_id,
              validationHash: input.evidence_candidate.validation_hash,
              runId: input.evidence_candidate.run_id,
              runManifestHash: input.evidence_candidate.run_manifest_hash,
              schemaVersion: input.evidence_candidate.schema_version,
              contentHash: input.evidence_candidate.content_hash,
              createdAt: new Date(input.created_at),
            },
          });
          const event = input.outbox.event;
          await transaction.experimentFoundationIntegrationOutboxV2.create({
            data: {
              id: input.outbox.outbox_id,
              eventId: event.event_id,
              aggregateType: input.outbox.aggregate_type,
              aggregateId: input.outbox.aggregate_id,
              transitionKey: input.outbox.transition_key,
              eventType: event.event_type,
              schemaVersion: event.schema_version,
              producerDomain: event.producer_domain,
              occurredAt: new Date(event.occurred_at),
              correlationId: event.correlation_id,
              causationId: event.causation_id,
              businessIdempotencyKey: event.business_idempotency_key,
              implementationProjectId: event.implementation_project_id,
              validationCycleId: event.validation_cycle_id,
              branchId: event.branch_id,
              branchKey: event.branch_key,
              workOrderRevisionId: event.work_order_revision_id,
              revisionSequence: event.branch_revision_sequence,
              workOrderRevisionHash: event.work_order_revision_hash,
              cellPlanHash: event.cell_plan_hash,
              approvedPlanHash: event.approved_plan_hash,
              runId: event.payload.run_id,
              runManifestHash: event.payload.run_manifest_hash,
              eventPayloadJson: toInputJson(event.payload),
              payloadHash: event.payload_hash,
              eventEnvelopeHash: input.outbox.event_envelope_hash,
              relayStatus: 'pending',
              relayAttemptCount: 0,
              createdAt: new Date(input.outbox.created_at),
              updatedAt: new Date(input.outbox.created_at),
            },
          });
        }

        return loadStoredOutcome(transaction, reportRow);
      });
    } catch (error) {
      if (error instanceof ExperimentFoundationScientificValidationV2ConstraintError) throw error;
      if (isPrismaUniqueConflict(error)) {
        const byKey = await this.loadValidationByIdempotencyKey(input.idempotency_key);
        if (byKey) {
          if (byKey.report.validation_hash === input.report.validation_hash) return byKey;
          throw constraint(
            'VALIDATION_IDEMPOTENCY_CONFLICT',
            'Scientific validation idempotency key raced with changed content.',
          );
        }
        const byRun = await this.loadValidationByRunId(input.report.run_id);
        if (byRun?.report.validation_hash === input.report.validation_hash) return byRun;
        throw constraint(
          'VALIDATION_RESULT_CONFLICT',
          'Scientific validation uniqueness rejected a changed Run outcome.',
        );
      }
      if (isPrismaForeignKeyConflict(error)) {
        throw constraint(
          'VALIDATION_SCOPE_DRIFT',
          'Scientific validation lost an exact Run, protocol, report, or Candidate prerequisite.',
        );
      }
      throw error;
    }
  }
}

function parseStored<T>(
  validator: ValidateFunction<T>,
  value: unknown,
  label: string,
  reasonCode: ConstructorParameters<
    typeof ExperimentFoundationScientificValidationV2ConstraintError
  >[0] = 'VALIDATION_SCOPE_DRIFT',
): T {
  if (!validator(value)) {
    throw constraint(reasonCode, `${label} does not match its shared typed contract.`);
  }
  return value;
}

function mapResult(row: ExperimentResultRow): ExperimentResultCellV2 {
  const result = parseStored(resultValidator, row.resultSnapshotJson, 'ExperimentResult snapshot');
  if (
    row.id !== result.result_id
    || row.runId !== result.run_id
    || row.runManifestHash !== result.run_manifest_hash
    || row.runCellId !== result.run_cell_id
    || row.cellKey !== result.cell_key
    || row.trainingTaskSpecId !== result.training_task_spec_id
    || row.trainingTaskSpecHash !== result.training_task_spec_hash
    || row.executionAttemptId !== result.execution_attempt_id
    || row.provenance !== result.provenance
    || row.schemaVersion !== result.schema_version
    || row.metricObservationCount !== result.metric_observations.length
    || row.artifactObservationCount !== result.artifact_observations.length
    || row.contentHash !== result.content_hash
  ) {
    throw constraint('VALIDATION_SCOPE_DRIFT', `ExperimentResult relational mirror drifted: ${row.id}`);
  }
  assertResultIntegrity(result);
  return result;
}

function assertResultIntegrity(result: ExperimentResultCellV2): void {
  const { content_hash: contentHash, ...hashInput } = result;
  if (serverHashExperimentFoundationV2ScientificResult(hashInput) !== contentHash) {
    throw constraint('VALIDATION_RESULT_CONFLICT', 'ExperimentResult canonical hash is invalid.');
  }
}

function exactResultReplay(
  row: ExperimentResultRow,
  incoming: ExperimentResultCellV2,
): ExperimentResultCellV2 {
  const existing = mapResult(row);
  if (existing.content_hash !== incoming.content_hash) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Run cell already has a result with different scientific content.',
    );
  }
  return existing;
}

async function loadStoredOutcome(
  client: ScientificValidationClient,
  row: ValidationReportRow,
): Promise<ExperimentFoundationScientificValidationV2StoredOutcome> {
  const report = mapReport(row);
  const candidateRow = await client.experimentFoundationEvidenceCandidateV2.findUnique({
    where: { validationReportId: row.id },
  });
  const candidate = candidateRow ? mapCandidate(candidateRow) : null;
  if ((report.status === 'passed') !== (candidate !== null)) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Stored report violates the passed-only EvidenceCandidate invariant.',
    );
  }
  if (
    candidate
    && (
      candidate.validation_report_id !== report.report_id
      || candidate.validation_hash !== report.validation_hash
      || candidate.run_id !== report.run_id
      || candidate.run_manifest_hash !== report.run_manifest_hash
    )
  ) {
    throw constraint('VALIDATION_SCOPE_DRIFT', 'Stored Candidate binding drifted from its report.');
  }
  return {
    report,
    evidence_candidate: candidate,
    idempotency_key: row.idempotencyKey,
  };
}

function mapReport(row: ValidationReportRow): ScientificValidationReportV2 {
  const report = parseStored(
    reportValidator,
    row.reportSnapshotJson,
    'ScientificValidationReport snapshot',
  );
  if (
    row.id !== report.report_id
    || row.runId !== report.run_id
    || row.runManifestHash !== report.run_manifest_hash
    || row.evaluationProtocolId !== report.evaluation_protocol.logical_id
    || row.evaluationProtocolRevisionId !== report.evaluation_protocol.revision_id
    || row.evaluationProtocolRevisionSequence !== report.evaluation_protocol.revision_sequence
    || row.evaluationProtocolContentHash !== report.evaluation_protocol.content_hash
    || row.validatorProfileVersion !== report.validator_profile_version
    || row.validatorProfileHash !== report.validator_profile_hash
    || row.status !== report.status
    || row.schemaVersion !== report.schema_version
    || row.orderedCellResultCount !== report.ordered_cell_results.length
    || row.orderedRuleResultCount !== report.ordered_rule_results.length
    || row.validationHash !== report.validation_hash
  ) {
    throw constraint('VALIDATION_SCOPE_DRIFT', `Validation report relational mirror drifted: ${row.id}`);
  }
  assertReportIntegrity(report);
  return report;
}

function assertReportIntegrity(report: ScientificValidationReportV2): void {
  const expected = serverHashExperimentFoundationV2ScientificValidation({
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    ordered_cell_results: report.ordered_cell_results,
    evaluation_protocol: report.evaluation_protocol,
    validator_profile_version: report.validator_profile_version,
    validator_profile_hash: report.validator_profile_hash,
    ordered_rule_results: report.ordered_rule_results,
    status: report.status,
  });
  if (expected !== report.validation_hash) {
    throw constraint('VALIDATION_RESULT_CONFLICT', 'Validation report canonical hash is invalid.');
  }
}

function mapCandidate(row: EvidenceCandidateRow): EvidenceCandidateV2 {
  const candidate: EvidenceCandidateV2 = {
    candidate_id: row.id,
    schema_version: 'v1',
    run_id: row.runId,
    run_manifest_hash: row.runManifestHash,
    validation_report_id: row.validationReportId,
    validation_hash: row.validationHash,
    content_hash: row.contentHash,
  };
  if (
    row.schemaVersion !== candidate.schema_version
    || serverHashExperimentFoundationV2EvidenceCandidate({
      run_id: candidate.run_id,
      run_manifest_hash: candidate.run_manifest_hash,
      validation_report_id: candidate.validation_report_id,
      validation_hash: candidate.validation_hash,
    }) !== candidate.content_hash
  ) {
    throw constraint('VALIDATION_RESULT_CONFLICT', `EvidenceCandidate integrity drifted: ${row.id}`);
  }
  return candidate;
}

function assertValidationPersistenceInput(
  input: PersistExperimentFoundationScientificValidationV2Input,
): void {
  assertReportIntegrity(input.report);
  const passed = input.report.status === 'passed';
  if (
    passed !== (input.evidence_candidate !== null)
    || passed !== (input.outbox !== null)
  ) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Only passed validation may atomically persist a Candidate and outbox.',
    );
  }
  if (!input.evidence_candidate || !input.outbox) return;
  const candidate = input.evidence_candidate;
  const event = input.outbox.event;
  const candidateHash = serverHashExperimentFoundationV2EvidenceCandidate({
    run_id: candidate.run_id,
    run_manifest_hash: candidate.run_manifest_hash,
    validation_report_id: candidate.validation_report_id,
    validation_hash: candidate.validation_hash,
  });
  if (
    candidateHash !== candidate.content_hash
    || candidate.validation_report_id !== input.report.report_id
    || candidate.validation_hash !== input.report.validation_hash
    || candidate.run_id !== input.report.run_id
    || candidate.run_manifest_hash !== input.report.run_manifest_hash
    || input.outbox.aggregate_id !== candidate.candidate_id
    || event.payload.candidate_id !== candidate.candidate_id
    || event.payload.candidate_content_hash !== candidate.content_hash
    || event.payload.validation_report_id !== input.report.report_id
    || event.payload.validation_hash !== input.report.validation_hash
    || serverHashExperimentV2EventPayload(event.event_type, event.schema_version, event.payload)
      !== event.payload_hash
    || serverHashExperimentV2EventEnvelope(event) !== input.outbox.event_envelope_hash
  ) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Candidate, report, payload, or outbox exact hash binding is invalid.',
    );
  }
}

function isAttemptState(
  value: string,
): value is ExperimentFoundationScientificValidationV2ExecutionAttempt['lifecycle_state'] {
  return ['prepared', 'submitted', 'running', 'succeeded', 'failed', 'cancelled'].includes(value);
}

function isExecutionMode(
  value: string,
): value is ExperimentFoundationScientificValidationV2ExecutionAttempt['execution_mode'] {
  return value === 'simulation' || value === 'real_provider';
}

function isExecutionProvenance(
  value: string,
): value is ExperimentFoundationScientificValidationV2ExecutionAttempt['provenance'] {
  return value === 'non_production_fake_provider' || value === 'real_provider';
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isPrismaForeignKeyConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
