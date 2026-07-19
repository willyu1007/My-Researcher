import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2ArtifactContractRuleV1,
  ExperimentFoundationV2MetricContractRuleV1,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  BranchHeadAdvancedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../../errors/app-error.js';
import {
  requireDisposablePostgresDatabaseIdentity,
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import { InMemoryPaperImplementationExperimentSpineV2Repository } from '../in-memory-experiment-spine-v2-repository.js';
import type {
  ExperimentFoundationScientificValidationV2Repository,
} from '../experiment-foundation-scientific-validation-v2.repository.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
} from '../experiment-spine-v2.repository.js';
import { buildExperimentFoundationD19TypedFixture } from '../../services/experiment-foundation-d19-fixture.js';
import { ExperimentFoundationExecutionService } from '../../services/experiment-foundation-execution-service.js';
import { ExperimentFoundationService } from '../../services/experiment-foundation-service.js';
import { ExperimentFoundationV2MaterializationService } from '../../services/experiment-foundation-v2-materialization-service.js';
import {
  ExperimentFoundationV2ScientificValidationService,
  type RecordExperimentResultV2Input,
} from '../../services/experiment-foundation-v2-scientific-validation-service.js';
import { ExperimentFoundationV2Service } from '../../services/experiment-foundation-v2-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../../services/paper-implementation-experiment-v2-admission-service.js';
import { PrismaExperimentFoundationExecutionRepository } from './prisma-experiment-foundation-execution-repository.js';
import { PrismaExperimentFoundationRepository } from './prisma-experiment-foundation-repository.js';
import { PrismaExperimentFoundationScientificValidationV2Repository } from './prisma-experiment-foundation-scientific-validation-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATION_V2_RELATIONAL_PRISMA=1 with the Pack C randomized disposable database identity variables';
const FIXED_NOW = '2026-07-20T08:00:00.000Z';
const WRONG_HASH = `sha256:${'f'.repeat(64)}`;
let foundationFixturePromise: ReturnType<typeof buildExperimentFoundationD19TypedFixture> | null = null;

interface ScientificFixture {
  prefix: string;
  runId: string;
  runManifestHash: string;
  protocol: Awaited<ReturnType<PrismaExperimentFoundationScientificValidationV2Repository['resolveEvaluationProtocol']>> & {};
  repository: PrismaExperimentFoundationScientificValidationV2Repository;
  service: ExperimentFoundationV2ScientificValidationService;
  attempts: string[];
}

test(
  'Pack C Prisma/PostgreSQL enforces unique, exact-scope FK and closed CHECK fences',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 180_000,
  },
  async () => {
    const { prisma } = await openPackCDatabase();
    try {
      const primary = await seedScientificFixture(prisma, 'fences-primary');
      const foreign = await seedScientificFixture(prisma, 'fences-foreign');
      const checks = await seedScientificFixture(prisma, 'fences-checks');

      const resultInput = await hydratedResultInput(primary, 1);
      const validResult = await primary.service.recordExperimentResult(resultInput);
      const persistedResult = await prisma.experimentFoundationExperimentResultV2
        .findUniqueOrThrow({ where: { id: validResult.result_id } });
      const resultCreateBase: Prisma.ExperimentFoundationExperimentResultV2UncheckedCreateInput = {
        ...persistedResult,
        resultSnapshotJson: persistedResult.resultSnapshotJson as Prisma.InputJsonValue,
      };
      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: {
          ...resultCreateBase,
          id: `${primary.prefix}-duplicate-result`,
          executionAttemptId: primary.attempts[1]!,
          contentHash: hash('duplicate-result'),
        },
      }), ['ef_experiment_result_run_cell_unique', 'runCellId']);

      const invalidResultBase = {
        ...resultCreateBase,
        id: `${primary.prefix}-invalid-result`,
        runCellId: (await primary.repository.loadRun(
          primary.runId,
          primary.runManifestHash,
        ))!.ordered_cells[1]!.run_cell_id,
        cellKey: (await primary.repository.loadRun(primary.runId, primary.runManifestHash))!.ordered_cells[1]!.cell_key,
        trainingTaskSpecId: (await primary.repository.loadRun(primary.runId, primary.runManifestHash))!.ordered_cells[1]!.training_task_spec_id,
        trainingTaskSpecHash: (await primary.repository.loadRun(primary.runId, primary.runManifestHash))!.ordered_cells[1]!.training_task_spec_hash,
        executionAttemptId: primary.attempts[1]!,
      };
      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: { ...invalidResultBase, runManifestHash: WRONG_HASH },
      }), 'ef_experiment_result_run_fkey');
      const foreignRun = await foreign.repository.loadRun(foreign.runId, foreign.runManifestHash);
      assert.ok(foreignRun);
      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: {
          ...invalidResultBase,
          runCellId: foreignRun.ordered_cells[0]!.run_cell_id,
          cellKey: foreignRun.ordered_cells[0]!.cell_key,
        },
      }), 'ef_experiment_result_run_cell_fkey');
      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: { ...invalidResultBase, trainingTaskSpecHash: WRONG_HASH },
      }), 'ef_experiment_result_task_spec_fkey');

      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: { ...invalidResultBase, provenance: 'non_production_fake_provider' },
      }), 'ef_experiment_result_provenance_check');
      await expectConstraint(prisma.experimentFoundationExperimentResultV2.create({
        data: { ...invalidResultBase, schemaVersion: 'v2' },
      }), 'ef_experiment_result_schema_version_check');

      await recordCompleteBatch(primary);
      const passed = await primary.service.validateScientificBatch({
        run_id: primary.runId,
        expected_run_manifest_hash: primary.runManifestHash,
        idempotency_key: `${primary.prefix}-passed`,
      });
      const reportRow = await prisma.experimentFoundationScientificValidationReportV2
        .findUniqueOrThrow({ where: { id: passed.report.report_id } });
      const reportCreateBase: Prisma.ExperimentFoundationScientificValidationReportV2UncheckedCreateInput = {
        ...reportRow,
        reportSnapshotJson: reportRow.reportSnapshotJson as Prisma.InputJsonValue,
      };
      await expectConstraint(prisma.experimentFoundationScientificValidationReportV2.create({
        data: {
          ...reportCreateBase,
          id: `${primary.prefix}-duplicate-report`,
          idempotencyKey: `${primary.prefix}-duplicate-report`,
        },
      }), ['ef_scientific_validation_run_unique', 'runId']);
      await expectConstraint(prisma.experimentFoundationScientificValidationReportV2.create({
        data: {
          ...reportCreateBase,
          id: `${foreign.prefix}-protocol-drift-report`,
          runId: foreign.runId,
          runManifestHash: foreign.runManifestHash,
          evaluationProtocolContentHash: WRONG_HASH,
          idempotencyKey: `${foreign.prefix}-protocol-drift-report`,
        },
      }), 'ef_scientific_validation_protocol_fkey');

      const candidateRow = await prisma.experimentFoundationEvidenceCandidateV2.findUniqueOrThrow({
        where: { validationReportId: passed.report.report_id },
      });
      await expectConstraint(prisma.experimentFoundationEvidenceCandidateV2.create({
        data: { ...candidateRow, id: `${primary.prefix}-duplicate-candidate` },
      }), ['ef_evidence_candidate_report_unique', 'validationReportId']);
      // A drifted-hash candidate against the already-candidated primary report
      // trips the report unique before the composite FK, so the FK fence is
      // exercised against a fresh candidate-less report on the foreign run.
      const foreignReport = await prisma.experimentFoundationScientificValidationReportV2.create({
        data: {
          ...reportCreateBase,
          id: `${foreign.prefix}-fk-fence-report`,
          runId: foreign.runId,
          runManifestHash: foreign.runManifestHash,
          status: 'failed',
          validationHash: hash(`${foreign.prefix}-fk-fence-report`),
          idempotencyKey: `${foreign.prefix}-fk-fence-report`,
        },
      });
      await expectConstraint(prisma.experimentFoundationEvidenceCandidateV2.create({
        data: {
          ...candidateRow,
          id: `${primary.prefix}-validation-drift-candidate`,
          validationReportId: foreignReport.id,
          runId: foreign.runId,
          runManifestHash: foreign.runManifestHash,
          validationHash: WRONG_HASH,
        },
      }), 'ef_evidence_candidate_report_fkey');

      const checksRun = await checks.repository.loadRun(checks.runId, checks.runManifestHash);
      assert.ok(checksRun);
      const checkReport = {
        ...reportCreateBase,
        id: `${checks.prefix}-check-report`,
        runId: checks.runId,
        runManifestHash: checks.runManifestHash,
        idempotencyKey: `${checks.prefix}-check-report`,
      };
      await expectConstraint(prisma.experimentFoundationScientificValidationReportV2.create({
        data: { ...checkReport, status: 'waived' },
      }), 'ef_scientific_validation_status_check');
      await expectConstraint(prisma.experimentFoundationScientificValidationReportV2.create({
        data: { ...checkReport, schemaVersion: 'v2' },
      }), 'ef_scientific_validation_schema_version_check');
      await prisma.experimentFoundationScientificValidationReportV2.create({ data: checkReport });
      await expectConstraint(prisma.experimentFoundationEvidenceCandidateV2.create({
        data: {
          ...candidateRow,
          id: `${checks.prefix}-schema-check-candidate`,
          validationReportId: checkReport.id,
          validationHash: checkReport.validationHash,
          runId: checks.runId,
          runManifestHash: checks.runManifestHash,
          schemaVersion: 'v2',
        },
      }), 'ef_evidence_candidate_schema_version_check');
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Pack C Prisma service commits passed report, Candidate and outbox atomically and rolls all three back on outbox failure',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 180_000,
  },
  async () => {
    const { prisma } = await openPackCDatabase();
    try {
      const passedFixture = await seedScientificFixture(prisma, 'atomic-pass');
      await recordCompleteBatch(passedFixture);
      const passed = await passedFixture.service.validateScientificBatch({
        run_id: passedFixture.runId,
        expected_run_manifest_hash: passedFixture.runManifestHash,
        idempotency_key: `${passedFixture.prefix}-validation`,
      });
      assert.equal(passed.report.status, 'passed');
      assert.ok(passed.evidence_candidate);
      assert.deepEqual(await scientificOutcomeCounts(prisma, passedFixture.runId), {
        reports: 1,
        candidates: 1,
        qualifiedOutboxes: 1,
      });

      const rollbackFixture = await seedScientificFixture(prisma, 'atomic-rollback');
      await recordCompleteBatch(rollbackFixture);
      await installOutboxFailureTrigger(prisma);
      try {
        await assert.rejects(rollbackFixture.service.validateScientificBatch({
          run_id: rollbackFixture.runId,
          expected_run_manifest_hash: rollbackFixture.runManifestHash,
          idempotency_key: `${rollbackFixture.prefix}-validation`,
        }), /PACKC_INJECTED_OUTBOX_FAILURE/);
      } finally {
        await removeOutboxFailureTrigger(prisma);
      }
      assert.deepEqual(await scientificOutcomeCounts(prisma, rollbackFixture.runId), {
        reports: 0,
        candidates: 0,
        qualifiedOutboxes: 0,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Pack C real persistence keeps failed and unsupported outcomes report-only',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 180_000,
  },
  async () => {
    const { prisma } = await openPackCDatabase();
    try {
      const failedFixture = await seedScientificFixture(prisma, 'report-only-failed');
      await recordCompleteBatch(failedFixture, true);
      const failed = await failedFixture.service.validateScientificBatch({
        run_id: failedFixture.runId,
        expected_run_manifest_hash: failedFixture.runManifestHash,
        idempotency_key: `${failedFixture.prefix}-validation`,
      });
      assert.equal(failed.report.status, 'failed');
      assert.equal(failed.evidence_candidate, null);
      assert.deepEqual(await scientificOutcomeCounts(prisma, failedFixture.runId), {
        reports: 1,
        candidates: 0,
        qualifiedOutboxes: 0,
      });

      const unsupportedFixture = await seedScientificFixture(prisma, 'report-only-unsupported');
      await recordCompleteBatch(unsupportedFixture);
      const unsupportedService = new ExperimentFoundationV2ScientificValidationService({
        repository: repositoryWithUnsupportedRule(unsupportedFixture),
        now: () => FIXED_NOW,
      });
      const stored = await unsupportedService.validateScientificBatch({
        run_id: unsupportedFixture.runId,
        expected_run_manifest_hash: unsupportedFixture.runManifestHash,
        idempotency_key: `${unsupportedFixture.prefix}-validation`,
      });
      assert.equal(stored.report.status, 'unsupported');
      assert.equal(stored.report.ordered_rule_results[0]?.detail_code, 'UNSUPPORTED_RULE');
      assert.equal(stored.evidence_candidate, null);
      assert.deepEqual(await scientificOutcomeCounts(prisma, unsupportedFixture.runId), {
        reports: 1,
        candidates: 0,
        qualifiedOutboxes: 0,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Pack C real Prisma composition permanently closes generic scientific create/upsert and collectJob',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 90_000,
  },
  async () => {
    const { prisma } = await openPackCDatabase();
    try {
      const registry = new ExperimentFoundationService(
        new PrismaExperimentFoundationRepository(prisma),
      );
      const execution = new ExperimentFoundationExecutionService(
        new PrismaExperimentFoundationExecutionRepository(prisma),
        registry,
      );
      for (const kind of [
        'experiment_result',
        'result_validation_report',
        'evidence_candidate',
      ] as const) {
        await assert.rejects(
          registry.createRecord({ record_kind: kind, payload: {} }),
          legacyWriterClosed,
        );
        await assert.rejects(
          registry.upsertRecord(kind, `${kind}-closed`, { record_kind: kind, payload: {} }),
          legacyWriterClosed,
        );
      }
      await assert.rejects(
        execution.collectJob('missing-job', { source_refs: [] }),
        legacyWriterClosed,
      );
      assert.equal(await prisma.experimentFoundationRecord.count({
        where: { recordKind: { in: [
          'experiment_result',
          'result_validation_report',
          'evidence_candidate',
        ] } },
      }), 0);
    } finally {
      await prisma.$disconnect();
    }
  },
);

async function openPackCDatabase(): Promise<{ prisma: PrismaClient }> {
  requireDisposablePostgresDatabaseIdentity(process.env, 'packc', {
    databaseUrlKey: 'EXPERIMENT_FOUNDATION_PACKC_DATABASE_URL',
    nonceKey: 'EXPERIMENT_FOUNDATION_PACKC_DISPOSABLE_NONCE',
  });
  return openVerifiedDisposablePostgresTestDatabase(process.env, 'packc');
}

async function seedScientificFixture(
  prisma: PrismaClient,
  purpose: string,
): Promise<ScientificFixture> {
  await widenAttemptFixtureChecks(prisma);
  const foundationService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  foundationFixturePromise ??= buildExperimentFoundationD19TypedFixture(foundationService);
  const fixture = await foundationFixturePromise;
  const namespace = `packc-${purpose}-${randomUUID()}`;
  let idSequence = 0;
  const nextId = (prefix: string) => `${namespace}:${prefix}:${++idSequence}`;
  const piRepository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const admissionService = new PaperImplementationExperimentV2AdmissionService({
    repository: piRepository,
    scopeReader: {
      async resolveExactScope(implementationProjectId, validationCycleId) {
        return {
          implementation_project_id: implementationProjectId,
          implementation_project_lifecycle_status: 'active',
          validation_cycle_id: validationCycleId,
          validation_cycle_lifecycle_status: 'admitted',
        };
      },
    },
    admissionEnabled: () => true,
    serverActorId: `system:${purpose}`,
    idFactory: nextId,
    now: () => FIXED_NOW,
  });
  await admissionService.admit({
    implementation_project_id: `${namespace}:project`,
    validation_cycle_id: `${namespace}:cycle`,
    request: materializationAdmissionRequest(fixture, namespace),
    admitted_by: `system:${purpose}`,
  });
  const sourceEvent = piRepository.snapshot().outboxes[0]!.outbox.event;
  assert.equal(sourceEvent.event_type, 'WorkOrderRevisionAdmitted');
  const spineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const materializer = new ExperimentFoundationV2MaterializationService({
    repository: spineRepository,
    readinessResolver: {
      async resolvePassedExactReadiness(input) {
        const resolved = await foundationService.revalidateReadiness({
          target: input.target,
          readiness_attestation_id: input.readiness_attestation_id,
          expected_dependencies: input.ordered_dependencies,
        });
        return {
          attestation: resolved.attestation,
          ordered_dependencies: resolved.dependencies.map((row) => row.dependency),
        };
      },
    },
    idFactory: nextId,
    now: () => FIXED_NOW,
  });
  const materialization = await materializer.consume(sourceEvent);
  const run = materialization.run;
  const frozenEvent = materialization.outbox.event;
  const headPayload: BranchHeadAdvancedEventV1['payload'] = {
    source_event_id: frozenEvent.event_id,
    run_id: run.run_id,
    run_manifest_hash: run.run_manifest_hash,
    accepted_revision_sequence: sourceEvent.branch_revision_sequence,
    branch_state_version: 2,
  };
  const headEvent: BranchHeadAdvancedEventV1 = {
    event_id: nextId('head-event'),
    event_type: 'BranchHeadAdvanced',
    schema_version: 'v1',
    producer_domain: 'PaperImplementation',
    occurred_at: FIXED_NOW,
    correlation_id: sourceEvent.correlation_id,
    causation_id: frozenEvent.event_id,
    business_idempotency_key: `${namespace}:head`,
    implementation_project_id: sourceEvent.implementation_project_id,
    validation_cycle_id: sourceEvent.validation_cycle_id,
    branch_id: sourceEvent.branch_id,
    branch_key: sourceEvent.branch_key,
    work_order_revision_id: sourceEvent.work_order_revision_id,
    work_order_revision_hash: sourceEvent.work_order_revision_hash,
    branch_revision_sequence: sourceEvent.branch_revision_sequence,
    cell_plan_hash: sourceEvent.cell_plan_hash,
    approved_plan_hash: sourceEvent.approved_plan_hash,
    payload_hash: serverHashExperimentV2EventPayload('BranchHeadAdvanced', 'v1', headPayload),
    payload: headPayload,
  };
  const acknowledgementId = nextId('head-ack');
  await spineRepository.commitAcknowledgement({
    inbox_id: acknowledgementId,
    consumer_name: EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
    source_event_id: headEvent.event_id,
    business_idempotency_key: headEvent.business_idempotency_key,
    payload_hash: headEvent.payload_hash,
    source_event_hash: serverHashExperimentV2EventEnvelope(headEvent),
    scope: {
      implementation_project_id: headEvent.implementation_project_id,
      validation_cycle_id: headEvent.validation_cycle_id,
      branch_id: headEvent.branch_id,
      branch_key: headEvent.branch_key,
      work_order_revision_id: headEvent.work_order_revision_id,
      work_order_revision_hash: headEvent.work_order_revision_hash,
      branch_revision_sequence: headEvent.branch_revision_sequence,
      cell_plan_hash: headEvent.cell_plan_hash,
      approved_plan_hash: headEvent.approved_plan_hash,
    },
    outcome: 'processed',
    reason_code: null,
    processed_at: FIXED_NOW,
  }, headEvent);

  const attempts: string[] = [];
  for (const cell of materialization.run_cells) {
    const payloadId = nextId('payload');
    const payloadHash = hash(`${namespace}:payload:${cell.ordinal}`);
    await prisma.experimentFoundationProviderPayloadV2.create({ data: {
      id: payloadId,
      materializationKey: `${namespace}:payload:${cell.ordinal}`,
      runId: run.run_id,
      runManifestHash: run.run_manifest_hash,
      runCellId: cell.run_cell_id,
      cellKey: cell.cell_key,
      trainingTaskSpecId: cell.training_task_spec_id,
      trainingTaskSpecHash: cell.training_task_spec_hash,
      payloadSchemaVersion: 'FakeAliyunPaiDlcSubmitPayload@v1',
      adapterIdentity: 'deterministic_fake_aliyun_pai_dlc@v1',
      executionMode: 'simulation',
      provenance: 'non_production_fake_provider',
      simulationProfileVersion: 'v1',
      redactedManifestVersion: 'v1',
      redactedManifestJson: { fixture: 'packc-real-provider-attempt-parent' },
      payloadHash,
      payloadByteSize: 1,
      createdAt: new Date(FIXED_NOW),
    } });
    const attemptId = nextId('attempt');
    attempts.push(attemptId);
    await prisma.experimentFoundationExecutionAttemptV2.create({ data: {
      id: attemptId,
      externalPiImplementationProjectId: headEvent.implementation_project_id,
      externalPiValidationCycleId: headEvent.validation_cycle_id,
      externalPiBranchId: headEvent.branch_id,
      externalPiWorkOrderRevisionId: headEvent.work_order_revision_id,
      externalPiWorkOrderRevisionHash: headEvent.work_order_revision_hash,
      externalPiRevisionSequence: headEvent.branch_revision_sequence,
      runId: run.run_id,
      runManifestHash: run.run_manifest_hash,
      runCellId: cell.run_cell_id,
      cellKey: cell.cell_key,
      trainingTaskSpecId: cell.training_task_spec_id,
      trainingTaskSpecHash: cell.training_task_spec_hash,
      providerPayloadId: payloadId,
      providerPayloadHash: payloadHash,
      headAcknowledgementInboxId: acknowledgementId,
      attemptSequence: 1,
      workflowBusinessKey: `${namespace}:workflow`,
      workflowRequestHash: hash(`${namespace}:workflow`),
      executionMode: 'real_provider',
      provenance: 'real_provider',
      providerIdempotencyKey: `${namespace}:provider:${cell.ordinal}`,
      lifecycleState: 'succeeded',
      stateVersion: 1,
      terminalReasonCode: 'simulation_succeeded',
      createdAt: new Date(FIXED_NOW),
      updatedAt: new Date(FIXED_NOW),
      terminalAt: new Date(FIXED_NOW),
    } });
  }
  const repository = new PrismaExperimentFoundationScientificValidationV2Repository(prisma);
  const protocol = await repository.resolveEvaluationProtocol(run.run_id);
  assert.ok(protocol);
  return {
    prefix: namespace,
    runId: run.run_id,
    runManifestHash: run.run_manifest_hash,
    protocol,
    repository,
    service: new ExperimentFoundationV2ScientificValidationService({
      repository,
      now: () => FIXED_NOW,
    }),
    attempts,
  };
}

function materializationAdmissionRequest(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
  namespace: string,
): PaperImplementationExperimentV2AdmissionRequest {
  const readiness = fixture.evaluation_protocol_readiness;
  const metric = fixture.metric_definitions[0]!;
  assert.equal(metric.asset_type, 'MetricDefinition');
  return {
    branch_key: `${namespace}:branch`,
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'Pack C disposable relational fixture',
      scientific_intent: 'Exercise exact-batch scientific validation on real PostgreSQL.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'Pack C relational fixture',
      objective: 'Prove Pack C relational and atomicity fences.',
      readiness_attestation_id: readiness.attestation.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation.attestation_hash,
      asset_dependencies: [
        ...readiness.dependencies.map((row) => row.dependency),
        readiness.attestation.target,
      ],
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 60 },
    },
    exact_cells: [1, 2].map((ordinal) => ({
      cell_key: `${namespace}:cell:${ordinal}`,
      seed: ordinal,
      repeat_index: ordinal - 1,
      parameters: [{ name: 'ordinal', value: ordinal }],
      required_result_contract: {
        metrics: [{
          metric_definition: { ...metric, asset_type: 'MetricDefinition' as const },
          required_cardinality: 1,
        }],
        artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
      },
    })),
    business_idempotency_key: `${namespace}:admit`,
  };
}

async function hydratedResultInput(
  fixture: ScientificFixture,
  ordinal: number,
  failMetrics = false,
): Promise<RecordExperimentResultV2Input> {
  const protocol = fixture.protocol;
  assert.ok(protocol);
  const rules = protocol.protocol_snapshot.required_rules;
  const metrics = rules.filter(isMetricRule).map((rule, index) => ({
    metric_key: rule.metric_key,
    split_key: rule.split_key,
    value: index + ordinal / 10,
    value_type: rule.value_type,
    unit: rule.unit,
  }));
  const artifacts = rules.filter(isArtifactRule).map((rule, index) => ({
    artifact_kind: rule.artifact_kind,
    file_name: rule.file_name,
    content_hash: hash(`${fixture.prefix}:artifact:${ordinal}:${index}`),
    byte_size: ordinal + index + 1,
    parser_binding: rule.parser_binding,
  }));
  const run = await fixture.repository.loadRun(fixture.runId, fixture.runManifestHash);
  assert.ok(run);
  const cell = run.ordered_cells[ordinal - 1]!;
  return {
    schema_version: 'v1',
    run_id: fixture.runId,
    run_manifest_hash: fixture.runManifestHash,
    run_cell_id: cell.run_cell_id,
    cell_key: cell.cell_key,
    training_task_spec_id: cell.training_task_spec_id,
    training_task_spec_hash: cell.training_task_spec_hash,
    execution_attempt_id: fixture.attempts[ordinal - 1]!,
    provenance: 'real_provider',
    metric_observations: failMetrics ? [] : metrics,
    artifact_observations: artifacts,
  };
}

async function recordCompleteBatch(
  fixture: ScientificFixture,
  failMetrics = false,
): Promise<void> {
  const run = await fixture.repository.loadRun(fixture.runId, fixture.runManifestHash);
  assert.ok(run);
  for (const cell of run.ordered_cells) {
    const existing = await prismaResultForCell(fixture, cell.run_cell_id);
    if (!existing) {
      await fixture.service.recordExperimentResult(
        await hydratedResultInput(fixture, cell.ordinal, failMetrics),
      );
    }
  }
}

async function prismaResultForCell(
  fixture: ScientificFixture,
  runCellId: string,
): Promise<unknown> {
  const results = await fixture.repository.loadRunResults(fixture.runId);
  return results.find((result) => result.run_cell_id === runCellId) ?? null;
}

function isMetricRule(
  rule: ExperimentFoundationV2RequiredRuleV1,
): rule is ExperimentFoundationV2MetricContractRuleV1 {
  return rule.rule_type === 'metric_contract@v1';
}

function isArtifactRule(
  rule: ExperimentFoundationV2RequiredRuleV1,
): rule is ExperimentFoundationV2ArtifactContractRuleV1 {
  return rule.rule_type === 'artifact_contract@v1';
}

function repositoryWithUnsupportedRule(
  fixture: ScientificFixture,
): ExperimentFoundationScientificValidationV2Repository {
  const supportedRule = fixture.protocol.protocol_snapshot.required_rules.find(isMetricRule);
  assert.ok(supportedRule);
  let ruleTypeReads = 0;
  const supportDriftRule = new Proxy(supportedRule, {
    get(target, property, receiver): unknown {
      if (property !== 'rule_type') return Reflect.get(target, property, receiver);
      ruleTypeReads += 1;
      return ruleTypeReads <= 3 ? 'support_drift_fixture@v1' : 'metric_contract@v1';
    },
  }) as ExperimentFoundationV2MetricContractRuleV1;
  return new Proxy(fixture.repository, {
    get(target, property, receiver): unknown {
      if (property === 'resolveEvaluationProtocol') {
        return async () => ({
          evaluation_protocol: fixture.protocol.evaluation_protocol,
          protocol_snapshot: {
            ...fixture.protocol.protocol_snapshot,
            required_rules: [supportDriftRule],
          },
        });
      }
      const value: unknown = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ExperimentFoundationScientificValidationV2Repository;
}

async function widenAttemptFixtureChecks(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ef_execution_attempt_mode_check') THEN
        ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
          DROP CONSTRAINT "ef_execution_attempt_mode_check";
        ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
          ADD CONSTRAINT "ef_execution_attempt_mode_check"
          CHECK ("executionMode" IN ('simulation', 'real_provider'));
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ef_execution_attempt_provenance_check') THEN
        ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
          DROP CONSTRAINT "ef_execution_attempt_provenance_check";
        ALTER TABLE "ExperimentFoundationExecutionAttemptV2"
          ADD CONSTRAINT "ef_execution_attempt_provenance_check"
          CHECK ("provenance" IN ('non_production_fake_provider', 'real_provider'));
      END IF;
    END $$;
  `);
}

async function installOutboxFailureTrigger(prisma: PrismaClient): Promise<void> {
  // One statement per call: PostgreSQL rejects multi-command prepared statements.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION packc_inject_outbox_failure() RETURNS trigger AS $$
    BEGIN
      IF NEW."eventType" = 'EvidenceCandidateQualified' THEN
        RAISE EXCEPTION 'PACKC_INJECTED_OUTBOX_FAILURE';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER packc_inject_outbox_failure_trigger
      BEFORE INSERT ON "ExperimentFoundationIntegrationOutboxV2"
      FOR EACH ROW EXECUTE FUNCTION packc_inject_outbox_failure();
  `);
}

async function removeOutboxFailureTrigger(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS packc_inject_outbox_failure_trigger
      ON "ExperimentFoundationIntegrationOutboxV2";
  `);
  await prisma.$executeRawUnsafe(`
    DROP FUNCTION IF EXISTS packc_inject_outbox_failure();
  `);
}

async function scientificOutcomeCounts(prisma: PrismaClient, runId: string) {
  const [reports, candidates, qualifiedOutboxes] = await Promise.all([
    prisma.experimentFoundationScientificValidationReportV2.count({ where: { runId } }),
    prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId } }),
    prisma.experimentFoundationIntegrationOutboxV2.count({
      where: { runId, eventType: 'EvidenceCandidateQualified' },
    }),
  ]);
  return { reports, candidates, qualifiedOutboxes };
}

function legacyWriterClosed(error: unknown): boolean {
  return error instanceof AppError
    && error.statusCode === 409
    && error.errorCode === 'GATE_CONSTRAINT_FAILED'
    && error.details?.reason_code === 'LEGACY_SCIENTIFIC_WRITER_CLOSED';
}

// Prisma renders P2002 unique violations with the field list rather than the
// mapped index name, so unique expectations pass the field fallback as well.
async function expectConstraint(
  operation: Promise<unknown>,
  constraintName: string | readonly string[],
): Promise<void> {
  const accepted = typeof constraintName === 'string' ? [constraintName] : constraintName;
  await assert.rejects(operation, (error) => {
    const rendered = renderError(error);
    return accepted.some((candidate) => rendered.includes(candidate));
  });
}

function renderError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details = error as Error & { code?: string; meta?: unknown };
  return `${details.name} ${details.message} ${details.code ?? ''} ${JSON.stringify(details.meta)}`;
}

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
