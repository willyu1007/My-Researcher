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
  experimentFoundationSourceBoundResultCellV2Schema,
  scientificSourceManifestV1Schema,
  type ExperimentFoundationSourceBoundResultCellV2,
  type ScientificSourceManifestV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import {
  experimentFoundationExecutableTrainingTaskSpecSnapshotV2Schema,
  type ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
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
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type ExperimentFoundationScientificValidationV2ExecutionAttempt,
  type ExperimentFoundationScientificValidationV2HeadAcknowledgement,
  type ExperimentFoundationScientificResultGenerationAuthorityV2,
  type ExperimentFoundationScientificValidationV2Protocol,
  type ExperimentFoundationScientificValidationV2Repository,
  type ExperimentFoundationScientificValidationV2Run,
  type ExperimentFoundationScientificValidationV2StoredOutcome,
  type PersistExperimentFoundationScientificResultV2Input,
  type PersistExperimentFoundationSourceBoundResultV2Input,
  type PersistExperimentFoundationScientificValidationV2Input,
} from '../experiment-foundation-scientific-validation-v2.repository.js';
import {
  ExperimentFoundationExecutionV2ConstraintError,
  type ExperimentFoundationExecutionAttemptEventV2Record,
  type ExperimentFoundationExecutionAttemptV2Record,
  type ExperimentFoundationProviderPayloadV2Record,
} from '../experiment-foundation-execution-v2.repository.js';
import {
  PrismaExperimentFoundationExecutionV2Repository,
} from './prisma-experiment-foundation-execution-v2-repository.js';

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
const sourceBoundResultValidator = storedAjv.compile<ExperimentFoundationSourceBoundResultCellV2>(
  experimentFoundationSourceBoundResultCellV2Schema,
);
const scientificSourceValidator = storedAjv.compile<ScientificSourceManifestV1>(
  scientificSourceManifestV1Schema,
);
const executableTaskSpecSnapshotValidator = storedAjv.compile<
  ExperimentFoundationExecutableTrainingTaskSpecSnapshotV2
>(experimentFoundationExecutableTrainingTaskSpecSnapshotV2Schema);
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
  private readonly executionRepository: PrismaExperimentFoundationExecutionV2Repository;

  constructor(private readonly prisma: PrismaClient) {
    this.executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
  }

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
    let attempt: ExperimentFoundationExecutionAttemptV2Record | null;
    let payload: ExperimentFoundationProviderPayloadV2Record | null;
    let events: ExperimentFoundationExecutionAttemptEventV2Record[];
    try {
      attempt = await this.executionRepository.findAttempt(executionAttemptId);
      if (!attempt) return null;
      [payload, events] = await Promise.all([
        this.executionRepository.findProviderPayload(attempt.provider_payload_id),
        this.executionRepository.listAttemptEvents(attempt.id),
      ]);
    } catch (error) {
      if (error instanceof ExperimentFoundationExecutionV2ConstraintError) {
        throw constraint(
          'VALIDATION_SCOPE_DRIFT',
          `Execution lineage failed durable integrity verification: ${error.message}`,
        );
      }
      throw error;
    }
    assertExactAttemptPayload(attempt, payload);
    if (attempt.execution_mode === 'real_provider' || attempt.provenance === 'real_provider') {
      assertExactRealProviderEventLineage(attempt, events);
    }
    return {
      execution_attempt_id: attempt.id,
      run_id: attempt.run_id,
      run_manifest_hash: attempt.run_manifest_hash,
      run_cell_id: attempt.run_cell_id,
      cell_key: attempt.cell_key,
      training_task_spec_id: attempt.training_task_spec_id,
      training_task_spec_hash: attempt.training_task_spec_hash,
      lifecycle_state: attempt.lifecycle_state,
      execution_mode: attempt.execution_mode,
      provenance: attempt.provenance,
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
      where: { runId, schemaVersion: 'v1' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapResult);
  }

  async loadSourceBoundRunResults(
    runId: string,
  ): Promise<ExperimentFoundationSourceBoundResultCellV2[]> {
    const rows = await this.prisma.experimentFoundationExperimentResultV2.findMany({
      where: { runId, schemaVersion: 'v2' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map(mapSourceBoundResult);
  }

  async loadScientificResultGenerationAuthority(
    runCellId: string,
    sourceOutputId: string,
  ): Promise<ExperimentFoundationScientificResultGenerationAuthorityV2 | null> {
    const source = await this.prisma.experimentFoundationProvisionalOutputV2.findUnique({
      where: { id: sourceOutputId },
      include: {
        collectionAttempt: {
          include: { executionAttempt: { include: { trainingTaskSpec: true } } },
        },
      },
    });
    if (!source || source.collectionAttempt.executionAttempt.runCellId !== runCellId) return null;
    const manifest = parseStored(
      scientificSourceValidator,
      source.redactedManifestJson,
      'ScientificSource manifest',
    );
    const collection = source.collectionAttempt;
    const attempt = collection.executionAttempt;
    const taskSpec = attempt.trainingTaskSpec;
    const taskSnapshot = parseStored(
      executableTaskSpecSnapshotValidator,
      taskSpec.taskSpecSnapshotJson,
      'ScientificSource TrainingTaskSpec snapshot',
    );
    const expectedHash = serverHashExperimentV2SemanticContent({
      record_kind: 'ExperimentFoundationScientificSourceManifest',
      schema_version: 'ExperimentFoundationScientificSourceManifest@v1',
      hash_profile: 'ef-scientific-source-json@v1',
      content: manifest,
    });
    if (
      source.outputKind !== 'scientific_result_manifest'
      || source.outputClass !== 'scientific_source'
      || source.id !== `scientific_source_${collection.id}`
      || source.manifestSchemaVersion !== 'ExperimentFoundationScientificSourceManifest@v1'
      || source.outputHash !== expectedHash
      || source.ordinal !== 2
      || collection.collectionState !== 'collected'
      || attempt.lifecycleState !== 'succeeded'
      || attempt.executionMode !== 'real_provider'
      || attempt.provenance !== 'real_provider'
      || manifest.authority.collection_attempt_id !== collection.id
      || manifest.authority.execution_attempt_id !== attempt.id
      || manifest.execution_lineage.run_id !== attempt.runId
      || manifest.execution_lineage.run_manifest_hash !== attempt.runManifestHash
      || manifest.execution_lineage.run_cell_id !== attempt.runCellId
      || manifest.execution_lineage.cell_key !== attempt.cellKey
      || manifest.execution_lineage.training_task_spec_id !== attempt.trainingTaskSpecId
      || manifest.execution_lineage.training_task_spec_hash !== attempt.trainingTaskSpecHash
      || manifest.execution_lineage.cell_ordinal !== taskSpec.cellOrdinal
      || manifest.execution_lineage.execution_bundle_revision_id
        !== taskSpec.executionBundleRevisionId
      || manifest.execution_lineage.execution_bundle_revision_hash
        !== taskSpec.executionBundleRevisionHash
      || taskSnapshot.execution_bundle.execution_bundle_revision_id
        !== manifest.execution_lineage.execution_bundle_revision_id
      || taskSnapshot.execution_bundle.content_hash
        !== manifest.execution_lineage.execution_bundle_revision_hash
      || taskSnapshot.io_snapshot.result_envelope_schema
        !== manifest.interpretation_binding.provider_result_envelope_schema
      || taskSnapshot.io_snapshot.parser_profile_version
        !== manifest.interpretation_binding.parser_profile_version
      || taskSnapshot.io_snapshot.parser_profile_hash
        !== manifest.interpretation_binding.parser_profile_hash
      || taskSnapshot.io_snapshot.scientific_result_schema_version
        !== manifest.interpretation_binding.scientific_result_schema_version
      || taskSnapshot.io_snapshot.scientific_result_schema_hash
        !== manifest.interpretation_binding.scientific_result_schema_hash
    ) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'Scientific source lost its exact collected real-provider authority.',
      );
    }
    return {
      source_output_id: source.id,
      source_output_hash: source.outputHash,
      collection_attempt_id: collection.id,
      execution_attempt_id: attempt.id,
      run_id: attempt.runId,
      run_manifest_hash: attempt.runManifestHash,
      run_cell_id: attempt.runCellId,
      cell_key: attempt.cellKey,
      training_task_spec_id: attempt.trainingTaskSpecId,
      training_task_spec_hash: attempt.trainingTaskSpecHash,
      source_manifest: manifest,
    };
  }

  async persistSourceBoundExperimentResult(
    input: PersistExperimentFoundationSourceBoundResultV2Input,
  ): Promise<ExperimentFoundationSourceBoundResultCellV2> {
    assertSourceBoundResultIntegrity(input.result);
    const existing = await this.prisma.experimentFoundationExperimentResultV2.findUnique({
      where: { runCellId: input.result.run_cell_id },
    });
    if (existing) return exactSourceBoundResultReplay(existing, input.result);
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
          collectionAttemptId: input.result.collection_attempt_id,
          sourceOutputId: input.result.source_output_id,
          sourceOutputHash: input.result.source_output_hash,
          sourceOutputKind: input.result.source_output_kind,
          sourceOutputClass: input.result.source_output_class,
          parserProfileVersion: input.result.parser_profile_version,
          parserProfileHash: input.result.parser_profile_hash,
          derivationHash: input.result.derivation_hash,
          provenance: input.result.provenance,
          schemaVersion: input.result.schema_version,
          metricObservationCount: input.result.metric_observations.length,
          artifactObservationCount: input.result.artifact_observations.length,
          resultSnapshotJson: toInputJson(input.result),
          contentHash: input.result.content_hash,
          createdAt: new Date(input.created_at),
        },
      });
      return mapSourceBoundResult(row);
    } catch (error) {
      if (isPrismaUniqueConflict(error)) {
        const replay = await this.prisma.experimentFoundationExperimentResultV2.findUnique({
          where: { runCellId: input.result.run_cell_id },
        });
        if (replay) return exactSourceBoundResultReplay(replay, input.result);
        throw constraint(
          'VALIDATION_RESULT_CONFLICT',
          'Source-bound Result uniqueness rejected a changed identity replay.',
        );
      }
      if (isPrismaForeignKeyConflict(error)) {
        throw constraint(
          'VALIDATION_SCOPE_DRIFT',
          'Source-bound Result lost its exact source/collection/Attempt lineage.',
        );
      }
      throw error;
    }
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

function mapSourceBoundResult(
  row: ExperimentResultRow,
): ExperimentFoundationSourceBoundResultCellV2 {
  const result = parseStored(
    sourceBoundResultValidator,
    row.resultSnapshotJson,
    'Source-bound ExperimentResult snapshot',
  );
  if (
    row.id !== result.result_id
    || row.runId !== result.run_id
    || row.runManifestHash !== result.run_manifest_hash
    || row.runCellId !== result.run_cell_id
    || row.cellKey !== result.cell_key
    || row.trainingTaskSpecId !== result.training_task_spec_id
    || row.trainingTaskSpecHash !== result.training_task_spec_hash
    || row.executionAttemptId !== result.execution_attempt_id
    || row.collectionAttemptId !== result.collection_attempt_id
    || row.sourceOutputId !== result.source_output_id
    || row.sourceOutputHash !== result.source_output_hash
    || row.sourceOutputKind !== result.source_output_kind
    || row.sourceOutputClass !== result.source_output_class
    || row.parserProfileVersion !== result.parser_profile_version
    || row.parserProfileHash !== result.parser_profile_hash
    || row.derivationHash !== result.derivation_hash
    || row.provenance !== result.provenance
    || row.schemaVersion !== result.schema_version
    || row.metricObservationCount !== result.metric_observations.length
    || row.artifactObservationCount !== result.artifact_observations.length
    || row.contentHash !== result.content_hash
  ) {
    throw constraint(
      'VALIDATION_SCOPE_DRIFT',
      `Source-bound ExperimentResult relational mirror drifted: ${row.id}`,
    );
  }
  assertSourceBoundResultIntegrity(result);
  return result;
}

function assertSourceBoundResultIntegrity(
  result: ExperimentFoundationSourceBoundResultCellV2,
): void {
  if (!sourceBoundResultValidator(result)) {
    throw constraint(
      'VALIDATION_SCOPE_DRIFT',
      'Source-bound ExperimentResult does not match its closed shared contract.',
    );
  }
  const { content_hash: contentHash, ...hashInput } = result;
  const expected = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationExperimentResultV2',
    schema_version: 'v2',
    hash_profile: 'ef-scientific-result-json@v1',
    content: hashInput,
  });
  if (expected !== contentHash) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Source-bound ExperimentResult canonical hash is invalid.',
    );
  }
}

function exactSourceBoundResultReplay(
  row: ExperimentResultRow,
  incoming: ExperimentFoundationSourceBoundResultCellV2,
): ExperimentFoundationSourceBoundResultCellV2 {
  if (row.schemaVersion !== 'v2') {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Run cell already has a legacy caller-authored Result.',
    );
  }
  const existing = mapSourceBoundResult(row);
  if (existing.content_hash !== incoming.content_hash) {
    throw constraint(
      'VALIDATION_RESULT_CONFLICT',
      'Run cell already has a different source-bound Result.',
    );
  }
  return existing;
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
    ...(report.ordered_comparison_results
      ? { ordered_comparison_results: report.ordered_comparison_results }
      : {}),
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

function assertExactAttemptPayload(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  payload: ExperimentFoundationProviderPayloadV2Record | null,
): asserts payload is ExperimentFoundationProviderPayloadV2Record {
  if (
    !payload
    || payload.id !== attempt.provider_payload_id
    || payload.payload_hash !== attempt.provider_payload_hash
    || payload.run_id !== attempt.run_id
    || payload.run_manifest_hash !== attempt.run_manifest_hash
    || payload.run_cell_id !== attempt.run_cell_id
    || payload.cell_key !== attempt.cell_key
    || payload.training_task_spec_id !== attempt.training_task_spec_id
    || payload.training_task_spec_hash !== attempt.training_task_spec_hash
    || payload.execution_mode !== attempt.execution_mode
    || payload.provenance !== attempt.provenance
  ) {
    throw constraint(
      'EVIDENCE_PROVENANCE_REJECTED',
      'Execution Attempt does not bind an exact ProviderPayload provenance tuple.',
    );
  }
  if (
    attempt.execution_mode === 'real_provider'
    && (
      payload.payload_schema !== 'AliyunPaiDlcCreateJobPayload@v1'
      || payload.adapter_identity !== 'aliyun_pai_dlc_official_sdk@v1'
      || attempt.provenance !== 'real_provider'
    )
  ) {
    throw constraint(
      'EVIDENCE_PROVENANCE_REJECTED',
      'Scientific evidence requires the exact official real-provider payload tuple.',
    );
  }
}

function assertExactRealProviderEventLineage(
  attempt: ExperimentFoundationExecutionAttemptV2Record,
  events: readonly ExperimentFoundationExecutionAttemptEventV2Record[],
): void {
  const first = events[0];
  const last = events.at(-1);
  if (
    !first
    || !last
    || first.event_sequence !== 1
    || first.event_type !== 'created'
    || first.prior_state !== null
    || first.next_state !== 'prepared'
    || last.next_state !== attempt.lifecycle_state
    || last.external_job_ref !== attempt.external_job_ref
    || last.external_job_ref_hash !== attempt.external_job_ref_hash
  ) {
    throw constraint(
      'VALIDATION_SCOPE_DRIFT',
      'Real-provider Attempt has no exact durable event-chain boundary.',
    );
  }
  for (const [index, event] of events.entries()) {
    const prior = events[index - 1];
    if (
      event.execution_attempt_id !== attempt.id
      || event.event_sequence !== index + 1
      || event.payload_hash !== attempt.provider_payload_hash
      || (prior && event.prior_state !== prior.next_state)
    ) {
      throw constraint(
        'VALIDATION_SCOPE_DRIFT',
        'Real-provider Attempt events are missing, reordered, or scope-drifted.',
      );
    }
  }
  const stateEvents = events.filter((event) => (
    event.event_type === 'created'
    || event.event_type === 'submitted'
    || event.event_type === 'running'
    || event.event_type === 'succeeded'
    || event.event_type === 'failed'
    || event.event_type === 'cancelled'
  ));
  const terminal = stateEvents.at(-1);
  const reasonCode = terminal?.event_snapshot.reason_code;
  if (
    stateEvents.length !== attempt.state_version + 1
    || !terminal
    || terminal.next_state !== attempt.lifecycle_state
    || (
      attempt.lifecycle_state === 'succeeded'
      && (
        terminal.event_type !== 'succeeded'
        || reasonCode !== attempt.terminal_reason_code
        || attempt.terminal_reason_code !== 'real_provider_succeeded'
        || attempt.external_job_ref_type !== 'aliyun_pai_dlc_job'
      )
    )
  ) {
    throw constraint(
      'VALIDATION_SCOPE_DRIFT',
      'Real-provider Attempt state, terminal reason, or event lineage is inconsistent.',
    );
  }
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
