import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma, PrismaClient } from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  type EvidenceCandidateV2,
  type ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  serverHashExperimentFoundationV2EvidenceCandidate,
  serverHashExperimentFoundationV2ScientificValidation,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../../errors/app-error.js';
import type { EvidenceCandidateQualifiedEventV1 } from '../experiment-foundation-scientific-validation-v2.repository.js';
import type { PaperImplementationEvidenceV2Authority } from '../paper-implementation-evidence-v2.repository.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
  requireDisposablePostgresDatabaseIdentity,
} from '../../test-support/disposable-postgres-test-database.js';
import { buildExperimentFoundationD19TypedFixture } from '../../services/experiment-foundation-d19-fixture.js';
import { ExperimentFoundationExecutionV2Service } from '../../services/experiment-foundation-execution-v2-service.js';
import { ExperimentFoundationService } from '../../services/experiment-foundation-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../../services/experiment-foundation-v2-acknowledgement-service.js';
import { ExperimentFoundationV2MaterializationService } from '../../services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../../services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../../services/experiment-v2-integration-relay-service.js';
import { PaperImplementationCycleReadinessV2Service } from '../../services/paper-implementation-cycle-readiness-v2-service.js';
import { PaperImplementationEvidenceTrustGatewayService } from '../../services/paper-implementation-evidence-trust-gateway-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../../services/paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from '../../services/paper-implementation-experiment-v2-head-service.js';
import { PaperImplementationValidationCycleClosureV2Service } from '../../services/paper-implementation-validation-cycle-closure-v2-service.js';
import { PrismaExperimentFoundationExecutionV2Repository } from './prisma-experiment-foundation-execution-v2-repository.js';
import { PrismaExperimentFoundationRepository } from './prisma-experiment-foundation-repository.js';
import { PrismaExperimentFoundationScientificValidationV2Repository } from './prisma-experiment-foundation-scientific-validation-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationCycleReadinessV2Repository } from './prisma-paper-implementation-cycle-readiness-v2-repository.js';
import { PrismaPaperImplementationEvidenceV2Repository } from './prisma-paper-implementation-evidence-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from './prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from './prisma-paper-implementation-validation-cycle-closure-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.PAPER_IMPLEMENTATION_EVIDENCE_CLOSURE_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set PAPER_IMPLEMENTATION_EVIDENCE_CLOSURE_V2_RELATIONAL_PRISMA=1 with the Pack C-PI randomized disposable database identity variables';
const FIXED_NOW = '2026-07-21T08:00:00.000Z';
const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};
let foundationFixturePromise: ReturnType<typeof buildExperimentFoundationD19TypedFixture> | null = null;

interface AcknowledgedRunFixture {
  namespace: string;
  implementationProjectId: string;
  validationCycleId: string;
  branchKey: string;
  admissionRequest: PaperImplementationExperimentV2AdmissionRequest;
  admissionEvent: WorkOrderRevisionAdmittedEventV1;
  frozenEvent: RunManifestFrozenEventV1;
  runId: string;
  runManifestHash: string;
  foundationService: ExperimentFoundationV2Service;
  piRepository: PrismaPaperImplementationExperimentSpineV2Repository;
  efRepository: PrismaExperimentFoundationSpineV2Repository;
}

type AcknowledgedRunSeedContext = Omit<
  AcknowledgedRunFixture,
  'admissionEvent' | 'frozenEvent' | 'runId' | 'runManifestHash'
>;

test(
  'Pack C-PI real reads are deterministic and control-only closure is atomic, idempotent, drift-fenced, and rollback-safe',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 240_000 },
  async () => {
    const { prisma } = await openPackCPiDatabase();
    try {
      const happy = await seedAcknowledgedRun(prisma, 'closure-happy');
      const readinessRepository = new PrismaPaperImplementationCycleReadinessV2Repository(prisma);
      const evaluator = new PaperImplementationCycleReadinessV2Service({
        repository: readinessRepository,
      });
      const firstEvaluation = await evaluator.evaluate(happy.validationCycleId);
      const secondEvaluation = await evaluator.evaluate(happy.validationCycleId);
      assert.deepEqual(secondEvaluation, firstEvaluation);
      assert.equal(firstEvaluation.status, 'ready_no_evidence');
      assert.equal(firstEvaluation.eligible_run_evidence_unit_count, 0);
      assert.match(firstEvaluation.watermark.closure_input_hash, /^sha256:[0-9a-f]{64}$/u);
      const noEvidenceBefore = await noEvidenceScientificCounts(prisma, happy);
      assert.deepEqual(noEvidenceBefore, {
        cycleLifecycleStatus: 'admitted',
        cycleExecutionStatus: 'not_started',
        cycleCompletedAt: null,
        experimentResults: 0,
        validationReports: 0,
        evidenceCandidates: 0,
        runEvidenceUnits: 0,
      });

      const closureRepository = new PrismaPaperImplementationValidationCycleClosureV2Repository(
        prisma,
      );
      const closureService = closureServiceFor(closureRepository);
      const request = controlOnlyClosureRequest(
        happy.validationCycleId,
        firstEvaluation.watermark.expected_cycle_version,
        firstEvaluation.watermark.closure_input_hash,
        `${happy.namespace}:close`,
      );
      const closed = await closureService.close(request);
      assert.equal(closed.closure.closure_kind, 'control_flow_validated_no_paper_evidence');
      assert.equal(closed.closure.scientific_disposition, null);
      assert.deepEqual(await closureCounts(prisma, happy.validationCycleId), {
        closures: 1,
        closedOutboxes: 1,
      });
      assert.deepEqual(await closureService.close(request), closed);
      assert.deepEqual(await closureCounts(prisma, happy.validationCycleId), {
        closures: 1,
        closedOutboxes: 1,
      });
      assert.deepEqual(await noEvidenceScientificCounts(prisma, happy), {
        ...noEvidenceBefore,
        cycleLifecycleStatus: 'completed',
        cycleExecutionStatus: 'completed',
        cycleCompletedAt: FIXED_NOW,
      });

      const noHead = await seedAcknowledgedRun(prisma, 'readiness-no-head');
      await prisma.paperImplementationExperimentWorkOrderBranchV2.updateMany({
        where: { validationCycleId: noHead.validationCycleId },
        data: {
          headRevisionId: null,
          headRevisionSequence: null,
          headRunId: null,
          headRunManifestHash: null,
          headEventId: null,
        },
      });
      const noHeadEvaluation = await evaluator.evaluate(noHead.validationCycleId);
      assert.equal(noHeadEvaluation.status, 'blocked');
      assert.deepEqual(noHeadEvaluation.ordered_blockers.map((row) => row.code), [
        'BRANCH_HEAD_NOT_FROZEN',
      ]);

      const activeReal = await seedAcknowledgedRun(prisma, 'readiness-active-real');
      await seedActiveRealAttempt(prisma, activeReal);
      const activeEvaluation = await evaluator.evaluate(activeReal.validationCycleId);
      assert.equal(activeEvaluation.status, 'blocked');
      assert.equal(activeEvaluation.watermark.active_real_attempt_count, 1);
      assert.deepEqual(activeEvaluation.ordered_blockers.map((row) => row.code), [
        'CYCLE_ACTIVE_REAL_ATTEMPT',
      ]);

      const drift = await seedAcknowledgedRun(prisma, 'closure-drift');
      const driftEvaluation = await evaluator.evaluate(drift.validationCycleId);
      await admitAndDrainRevision(drift, 2);
      const beforeDrift = await closureCounts(prisma, drift.validationCycleId);
      await assert.rejects(
        closureService.close(controlOnlyClosureRequest(
          drift.validationCycleId,
          driftEvaluation.watermark.expected_cycle_version,
          driftEvaluation.watermark.closure_input_hash,
          `${drift.namespace}:close`,
        )),
        appReason('CYCLE_CLOSURE_SCOPE_DRIFT'),
      );
      assert.deepEqual(await closureCounts(prisma, drift.validationCycleId), beforeDrift);

      const rollback = await seedAcknowledgedRun(prisma, 'closure-rollback');
      const rollbackEvaluation = await evaluator.evaluate(rollback.validationCycleId);
      await installClosureOutboxFailureTrigger(prisma);
      try {
        await assert.rejects(
          closureService.close(controlOnlyClosureRequest(
            rollback.validationCycleId,
            rollbackEvaluation.watermark.expected_cycle_version,
            rollbackEvaluation.watermark.closure_input_hash,
            `${rollback.namespace}:close`,
          )),
          /PACKC_PI_INJECTED_OUTBOX_FAILURE/u,
        );
      } finally {
        await removeClosureOutboxFailureTrigger(prisma);
      }
      assert.deepEqual(await closureCounts(prisma, rollback.validationCycleId), {
        closures: 0,
        closedOutboxes: 0,
      });
      assert.deepEqual(await noEvidenceScientificCounts(prisma, rollback), {
        cycleLifecycleStatus: 'admitted',
        cycleExecutionStatus: 'not_started',
        cycleCompletedAt: null,
        experimentResults: 0,
        validationReports: 0,
        evidenceCandidates: 0,
        runEvidenceUnits: 0,
      });

      const alreadyTerminal = await seedAcknowledgedRun(prisma, 'closure-terminal');
      const terminalEvaluation = await evaluator.evaluate(alreadyTerminal.validationCycleId);
      await prisma.paperImplementationValidationCycle.update({
        where: { id: alreadyTerminal.validationCycleId },
        data: {
          cycleStatus: 'aborted',
          executionStatus: 'failed',
          updatedAt: new Date(FIXED_NOW),
          completedAt: new Date(FIXED_NOW),
        },
      });
      await assert.rejects(
        closureService.close(controlOnlyClosureRequest(
          alreadyTerminal.validationCycleId,
          terminalEvaluation.watermark.expected_cycle_version,
          terminalEvaluation.watermark.closure_input_hash,
          `${alreadyTerminal.namespace}:close`,
        )),
        appReason('CYCLE_ALREADY_CLOSED'),
      );
      assert.deepEqual(await closureCounts(prisma, alreadyTerminal.validationCycleId), {
        closures: 0,
        closedOutboxes: 0,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Pack C-PI real closure composition seals new admission/execution while exact head/materialization replay converges',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 180_000 },
  async () => {
    const { prisma } = await openPackCPiDatabase();
    try {
      const fixture = await seedAcknowledgedRun(prisma, 'seal');
      const closureRepository = new PrismaPaperImplementationValidationCycleClosureV2Repository(
        prisma,
      );
      const evaluation = await new PaperImplementationCycleReadinessV2Service({
        repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
      }).evaluate(fixture.validationCycleId);
      await closureServiceFor(closureRepository).close(controlOnlyClosureRequest(
        fixture.validationCycleId,
        evaluation.watermark.expected_cycle_version,
        evaluation.watermark.closure_input_hash,
        `${fixture.namespace}:close`,
      ));

      const before = await sealWriteCounts(prisma, fixture.validationCycleId);
      const admission = admissionServiceFor(
        fixture.piRepository,
        fixture.implementationProjectId,
        fixture.validationCycleId,
        fixture.namespace,
        OPEN_CYCLE_LOOKUP,
      );
      await assert.rejects(
        admission.admit({
          implementation_project_id: fixture.implementationProjectId,
          validation_cycle_id: fixture.validationCycleId,
          request: revisionRequest(fixture.admissionRequest, fixture.namespace, 2),
          admitted_by: `system:${fixture.namespace}`,
        }),
        appReason('CYCLE_ALREADY_CLOSED'),
      );

      const headReplay = await new PaperImplementationExperimentV2HeadService({
        repository: fixture.piRepository,
        cycleClosureLookup: closureRepository,
      }).consume(fixture.frozenEvent);
      assert.equal(headReplay.inbox.outcome, 'processed');
      assert.equal(headReplay.emitted_branch_head_advanced, true);
      const materializationReplay = await new ExperimentFoundationV2MaterializationService({
        repository: fixture.efRepository,
        readinessResolver: exactReadinessResolver(fixture.foundationService),
        cycleClosureLookup: closureRepository,
      }).consume(fixture.admissionEvent);
      assert.equal(materializationReplay.run.run_id, fixture.runId);
      await assert.rejects(
        new ExperimentFoundationExecutionV2Service({
          repository: new PrismaExperimentFoundationExecutionV2Repository(prisma),
          readinessRevalidator: fixture.foundationService,
          intakeEnabled: () => true,
          cycleClosureLookup: OPEN_CYCLE_LOOKUP,
        }).startWorkflowSimulation(fixture.runId, {
          business_idempotency_key: `${fixture.namespace}:sealed-simulation`,
        }),
        appReason('CYCLE_ALREADY_CLOSED'),
      );

      const generic = new ExperimentFoundationService(
        new PrismaExperimentFoundationRepository(prisma),
      );
      await assert.rejects(
        generic.createRecord({ record_kind: 'paper_experiment_sidecar', payload: {} }),
        appReason('LEGACY_SCIENTIFIC_WRITER_CLOSED'),
      );
      await assert.rejects(
        generic.upsertRecord(
          'paper_experiment_sidecar',
          `${fixture.namespace}:sidecar`,
          { record_kind: 'paper_experiment_sidecar', payload: {} },
        ),
        appReason('LEGACY_SCIENTIFIC_WRITER_CLOSED'),
      );
      assert.deepEqual(await sealWriteCounts(prisma, fixture.validationCycleId), before);
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Pack C-PI two-client Serializable races preserve closure-vs-writer final-state invariants',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 300_000 },
  async () => {
    const first = await openPackCPiDatabase();
    const second = await openPackCPiDatabase();
    const firstClient = first.prisma;
    const secondClient = second.prisma;
    try {
      for (let iteration = 1; iteration <= 4; iteration += 1) {
        await assertClosureVsAdmissionRace(firstClient, secondClient, iteration);
        await assertClosureVsSimulationStartRace(firstClient, secondClient, iteration);
        await assertClosureVsGatewayRace(firstClient, secondClient, iteration);
      }
    } finally {
      await Promise.all([firstClient.$disconnect(), secondClient.$disconnect()]);
    }
  },
);

test(
  'Pack C-PI gateway commits atomically, converges duplicates, rejects tamper, and PostgreSQL enforces PI evidence fences',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 180_000 },
  async () => {
    const { prisma } = await openPackCPiDatabase();
    try {
      const fixture = await seedAcknowledgedRun(prisma, 'gateway');
      const authority = authorityFromEvent(fixture.admissionEvent);
      const scientificRepository = new PrismaExperimentFoundationScientificValidationV2Repository(
        prisma,
      );
      const event = await seedScientificGatewayFixture(
        prisma,
        scientificRepository,
        fixture,
        authority,
      );
      const service = new PaperImplementationEvidenceTrustGatewayService({
        repository: new PrismaPaperImplementationEvidenceV2Repository(prisma),
        scientificValidationReadRepository: scientificRepository,
        now: () => FIXED_NOW,
      });

      const first = await service.consume(event);
      assert.equal(first.inbox.outcome, 'processed');
      assert.ok(first.run_evidence_unit);
      assert.ok(first.trace_manifest);
      assert.deepEqual(await gatewayCounts(prisma, fixture.validationCycleId), {
        inboxes: 1,
        evidenceUnits: 1,
        traceManifests: 1,
        registeredOutboxes: 1,
      });
      const replay = await service.consume(event);
      assert.equal(replay.replayed, true);
      assert.equal(replay.run_evidence_unit?.run_evidence_unit_id,
        first.run_evidence_unit.run_evidence_unit_id);
      assert.deepEqual(await gatewayCounts(prisma, fixture.validationCycleId), {
        inboxes: 1,
        evidenceUnits: 1,
        traceManifests: 1,
        registeredOutboxes: 1,
      });

      const beforeTamper = await gatewayCounts(prisma, fixture.validationCycleId);
      const tampered = structuredClone(event);
      tampered.event_id = `${event.event_id}:tampered`;
      tampered.payload.candidate_id = `${event.payload.candidate_id}:tampered`;
      await assert.rejects(service.consume(tampered), appReason('INTEGRATION_EVENT_PAYLOAD_CONFLICT'));
      assert.deepEqual(await gatewayCounts(prisma, fixture.validationCycleId), beforeTamper);

      const row = await prisma.paperImplementationRunEvidenceUnitV2.findUniqueOrThrow({
        where: { id: first.run_evidence_unit.run_evidence_unit_id },
      });
      const base: Prisma.PaperImplementationRunEvidenceUnitV2UncheckedCreateInput = { ...row };
      await expectConstraint(prisma.paperImplementationRunEvidenceUnitV2.create({
        data: uniqueEvidenceRow(base, 'same-run', { runId: row.runId }),
      }), ['pi_reu_run_unique', 'runId']);
      await expectConstraint(prisma.paperImplementationRunEvidenceUnitV2.create({
        data: uniqueEvidenceRow(base, 'same-candidate', {
          evidenceCandidateId: row.evidenceCandidateId,
        }),
      }), ['pi_reu_candidate_unique', 'evidenceCandidateId']);
      await expectConstraint(prisma.paperImplementationRunEvidenceUnitV2.create({
        data: uniqueEvidenceRow(base, 'same-report', { validationReportId: row.validationReportId }),
      }), ['pi_reu_report_unique', 'validationReportId']);
      await expectConstraint(prisma.paperImplementationRunEvidenceUnitV2.create({
        data: uniqueEvidenceRow(base, 'revision-drift', {
          branchRevisionSequence: row.branchRevisionSequence + 1,
        }),
      }), 'pi_reu_revision_exact_fkey');

      const trace = await prisma.paperImplementationEvidenceTraceManifestV2.findUniqueOrThrow({
        where: { runEvidenceUnitId: row.id },
      });
      await expectConstraint(prisma.paperImplementationEvidenceTraceManifestV2.create({
        data: {
          ...trace,
          id: `${trace.id}:duplicate`,
          traceRefsJson: trace.traceRefsJson as Prisma.InputJsonValue,
          contentHash: hash(`${trace.id}:duplicate`),
        },
      }), ['pi_evidence_trace_reu_unique', 'runEvidenceUnitId']);

      const superseded = await seedAcknowledgedRun(prisma, 'gateway-superseded');
      const supersededEvent = await seedScientificGatewayFixture(
        prisma,
        scientificRepository,
        superseded,
        authorityFromEvent(superseded.admissionEvent),
      );
      await admitAndDrainRevision(superseded, 2);
      await assertGatewayAuthorityRejection(
        prisma,
        scientificRepository,
        supersededEvent,
        /no longer the branch's current admitted revision/u,
      );

      const headAdvanced = await seedAcknowledgedRun(prisma, 'gateway-head-advanced');
      const headAdvancedEvent = await seedScientificGatewayFixture(
        prisma,
        scientificRepository,
        headAdvanced,
        authorityFromEvent(headAdvanced.admissionEvent),
      );
      await prisma.paperImplementationExperimentWorkOrderBranchV2.update({
        where: { id: headAdvanced.admissionEvent.branch_id },
        data: {
          headRunId: `${headAdvanced.runId}:advanced`,
          headRunManifestHash: hash(`${headAdvanced.runManifestHash}:advanced`),
        },
      });
      await assertGatewayAuthorityRejection(
        prisma,
        scientificRepository,
        headAdvancedEvent,
        /no longer the branch head Run/u,
      );

      const postClosure = await seedAcknowledgedRun(prisma, 'gateway-post-closure');
      const postClosureEvent = await seedScientificGatewayFixture(
        prisma,
        scientificRepository,
        postClosure,
        authorityFromEvent(postClosure.admissionEvent),
      );
      const postClosureEvaluation = await new PaperImplementationCycleReadinessV2Service({
        repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
      }).evaluate(postClosure.validationCycleId);
      await closureServiceFor(
        new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
      ).close(controlOnlyClosureRequest(
        postClosure.validationCycleId,
        postClosureEvaluation.watermark.expected_cycle_version,
        postClosureEvaluation.watermark.closure_input_hash,
        `${postClosure.namespace}:close`,
      ));
      await assertGatewayAuthorityRejection(
        prisma,
        scientificRepository,
        postClosureEvent,
        /already has immutable v2 closure/u,
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);

async function openPackCPiDatabase(): Promise<{ prisma: PrismaClient }> {
  requireDisposablePostgresDatabaseIdentity(process.env, 'packc_pi', {
    databaseUrlKey: 'PAPER_IMPLEMENTATION_PACKC_PI_DATABASE_URL',
    nonceKey: 'PAPER_IMPLEMENTATION_PACKC_PI_DISPOSABLE_NONCE',
  });
  return openVerifiedDisposablePostgresTestDatabase(process.env, 'packc_pi');
}

async function assertClosureVsAdmissionRace(
  closureClient: PrismaClient,
  writerClient: PrismaClient,
  iteration: number,
): Promise<void> {
  const fixture = await seedAcknowledgedRun(closureClient, `race-admission-${iteration}`);
  const evaluation = await evaluateCycle(closureClient, fixture.validationCycleId);
  const closure = closureServiceFor(
    new PrismaPaperImplementationValidationCycleClosureV2Repository(closureClient),
  );
  const request = revisionRequest(fixture.admissionRequest, fixture.namespace, 2);
  const admission = admissionServiceFor(
    new PrismaPaperImplementationExperimentSpineV2Repository(writerClient),
    fixture.implementationProjectId,
    fixture.validationCycleId,
    fixture.namespace,
    OPEN_CYCLE_LOOKUP,
  );

  const [closureResult, admissionResult] = await Promise.allSettled([
    closure.close(controlOnlyClosureRequest(
      fixture.validationCycleId,
      evaluation.watermark.expected_cycle_version,
      evaluation.watermark.closure_input_hash,
      `${fixture.namespace}:close-race`,
    )),
    admission.admit({
      implementation_project_id: fixture.implementationProjectId,
      validation_cycle_id: fixture.validationCycleId,
      request,
      admitted_by: `system:${fixture.namespace}`,
    }),
  ]);
  const [closures, newAdmissions, cycle] = await Promise.all([
    closureClient.paperImplementationValidationCycleClosureV2.count({
      where: { validationCycleId: fixture.validationCycleId },
    }),
    closureClient.paperImplementationExperimentWorkOrderAdmissionV2.count({
      where: {
        businessIdempotencyKey: request.business_idempotency_key,
        branch: { validationCycleId: fixture.validationCycleId },
      },
    }),
    closureClient.paperImplementationValidationCycle.findUniqueOrThrow({
      where: { id: fixture.validationCycleId },
      select: { cycleStatus: true },
    }),
  ]);

  assert.equal(closures + newAdmissions, 1, `admission race ${iteration} has one authority winner`);
  if (closures === 1) {
    assert.equal(cycle.cycleStatus, 'completed');
    assert.equal(closureResult.status, 'fulfilled');
    assert.equal(settledReason(admissionResult), 'CYCLE_ALREADY_CLOSED');
  } else {
    assert.equal(cycle.cycleStatus, 'admitted');
    assert.equal(admissionResult.status, 'fulfilled');
    assert.equal(settledReason(closureResult), 'CYCLE_CLOSURE_SCOPE_DRIFT');
  }
}

async function assertClosureVsSimulationStartRace(
  closureClient: PrismaClient,
  writerClient: PrismaClient,
  iteration: number,
): Promise<void> {
  const fixture = await seedAcknowledgedRun(closureClient, `race-simulation-${iteration}`);
  const evaluation = await evaluateCycle(closureClient, fixture.validationCycleId);
  const businessKey = `${fixture.namespace}:simulation-race`;
  const [closureResult, simulationResult] = await Promise.allSettled([
    closureServiceFor(
      new PrismaPaperImplementationValidationCycleClosureV2Repository(closureClient),
    ).close(controlOnlyClosureRequest(
      fixture.validationCycleId,
      evaluation.watermark.expected_cycle_version,
      evaluation.watermark.closure_input_hash,
      `${fixture.namespace}:close-race`,
    )),
    new ExperimentFoundationExecutionV2Service({
      repository: new PrismaExperimentFoundationExecutionV2Repository(writerClient),
      readinessRevalidator: fixture.foundationService,
      intakeEnabled: () => true,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      now: () => FIXED_NOW,
    }).startWorkflowSimulation(fixture.runId, {
      business_idempotency_key: businessKey,
    }),
  ]);
  const [closures, attempts] = await Promise.all([
    closureClient.paperImplementationValidationCycleClosureV2.count({
      where: { validationCycleId: fixture.validationCycleId },
    }),
    closureClient.experimentFoundationExecutionAttemptV2.count({
      where: {
        externalPiValidationCycleId: fixture.validationCycleId,
        workflowBusinessKey: businessKey,
      },
    }),
  ]);

  assert.equal(closures === 1 && attempts > 0, false,
    `simulation race ${iteration} cannot persist post-closure Attempts`);
  assert.equal(closures === 1 || attempts > 0, true,
    `simulation race ${iteration} has one authority winner`);
  if (closures === 1) {
    assert.equal(closureResult.status, 'fulfilled');
    assert.equal(settledReason(simulationResult), 'CYCLE_ALREADY_CLOSED');
  } else {
    assert.equal(simulationResult.status, 'fulfilled');
    assert.equal(settledReason(closureResult), 'CYCLE_CLOSURE_SCOPE_DRIFT');
  }
}

async function assertClosureVsGatewayRace(
  closureClient: PrismaClient,
  writerClient: PrismaClient,
  iteration: number,
): Promise<void> {
  const fixture = await seedAcknowledgedRun(closureClient, `race-gateway-${iteration}`);
  const scientificWriter = new PrismaExperimentFoundationScientificValidationV2Repository(
    closureClient,
  );
  const event = await seedScientificGatewayFixture(
    closureClient,
    scientificWriter,
    fixture,
    authorityFromEvent(fixture.admissionEvent),
  );
  const evaluation = await evaluateCycle(closureClient, fixture.validationCycleId);
  const gateway = new PaperImplementationEvidenceTrustGatewayService({
    repository: new PrismaPaperImplementationEvidenceV2Repository(writerClient),
    scientificValidationReadRepository:
      new PrismaExperimentFoundationScientificValidationV2Repository(writerClient),
    now: () => FIXED_NOW,
  });
  const [closureResult, gatewayResult] = await Promise.allSettled([
    closureServiceFor(
      new PrismaPaperImplementationValidationCycleClosureV2Repository(closureClient),
    ).close(controlOnlyClosureRequest(
      fixture.validationCycleId,
      evaluation.watermark.expected_cycle_version,
      evaluation.watermark.closure_input_hash,
      `${fixture.namespace}:close-race`,
    )),
    gateway.consume(event),
  ]);
  const [closures, evidenceUnits] = await Promise.all([
    closureClient.paperImplementationValidationCycleClosureV2.count({
      where: { validationCycleId: fixture.validationCycleId },
    }),
    closureClient.paperImplementationRunEvidenceUnitV2.count({
      where: { validationCycleId: fixture.validationCycleId },
    }),
  ]);

  assert.equal(closures === 1 && evidenceUnits > 0, false,
    `gateway race ${iteration} cannot coexist with a control-only closure`);
  assert.equal(closures === 1 || evidenceUnits > 0, true,
    `gateway race ${iteration} has one authority winner`);
  if (closures === 1) {
    assert.equal(closureResult.status, 'fulfilled');
    assert.equal(gatewayResult.status, 'fulfilled');
    if (gatewayResult.status === 'fulfilled') {
      assert.equal(gatewayResult.value.inbox.outcome, 'terminal_conflict');
      assert.equal(gatewayResult.value.run_evidence_unit, null);
    }
  } else {
    assert.equal(gatewayResult.status, 'fulfilled');
    if (gatewayResult.status === 'fulfilled') {
      assert.equal(gatewayResult.value.inbox.outcome, 'processed');
      assert.ok(gatewayResult.value.run_evidence_unit);
    }
    assert.equal(settledReason(closureResult), 'CYCLE_CLOSURE_SCOPE_DRIFT');
  }
}

async function evaluateCycle(prisma: PrismaClient, validationCycleId: string) {
  return new PaperImplementationCycleReadinessV2Service({
    repository: new PrismaPaperImplementationCycleReadinessV2Repository(prisma),
  }).evaluate(validationCycleId);
}

function settledReason(result: PromiseSettledResult<unknown>): string | undefined {
  return result.status === 'rejected' && result.reason instanceof AppError
    ? result.reason.details?.reason_code as string | undefined
    : undefined;
}

async function seedAcknowledgedRun(
  prisma: PrismaClient,
  purpose: string,
): Promise<AcknowledgedRunFixture> {
  const namespace = `packc-pi-${purpose}-${randomUUID()}`;
  const implementationProjectId = `${namespace}:project`;
  const validationCycleId = `${namespace}:cycle`;
  const branchKey = `${namespace}:main`;
  await prisma.paperImplementationValidationCycle.create({
    data: validationCycleData(implementationProjectId, validationCycleId),
  });
  const foundationService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  foundationFixturePromise ??= buildExperimentFoundationD19TypedFixture(foundationService);
  const foundationFixture = await foundationFixturePromise;
  const admissionRequest = admissionRequestFromD19(foundationFixture, namespace, branchKey);
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const context: AcknowledgedRunSeedContext = {
    namespace,
    implementationProjectId,
    validationCycleId,
    branchKey,
    admissionRequest,
    foundationService,
    piRepository,
    efRepository,
  };
  const seeded = await admitAndDrainRevision(context, 1);
  return { ...context, ...seeded };
}

async function admitAndDrainRevision(
  fixture: AcknowledgedRunSeedContext,
  revision: number,
): Promise<Pick<
  AcknowledgedRunFixture,
  'admissionEvent' | 'frozenEvent' | 'runId' | 'runManifestHash'
>> {
  const request = revision === 1
    ? fixture.admissionRequest
    : revisionRequest(fixture.admissionRequest, fixture.namespace, revision);
  const admission = admissionServiceFor(
    fixture.piRepository,
    fixture.implementationProjectId,
    fixture.validationCycleId,
    fixture.namespace,
  );
  const admitted = await admission.admit({
    implementation_project_id: fixture.implementationProjectId,
    validation_cycle_id: fixture.validationCycleId,
    request,
    admitted_by: `system:${fixture.namespace}`,
  });
  const admissionBundle = await fixture.piRepository.findRevisionBundle(
    admitted.branch.branch_id,
    admitted.revision.work_order_revision_id,
  );
  assert.ok(admissionBundle);
  const materializer = new ExperimentFoundationV2MaterializationService({
    repository: fixture.efRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: exactReadinessResolver(fixture.foundationService),
    now: () => FIXED_NOW,
  });
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: fixture.piRepository,
    experimentFoundationRepository: fixture.efRepository,
    materializationConsumer: materializer,
    headConsumer: new PaperImplementationExperimentV2HeadService({
      repository: fixture.piRepository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      now: () => FIXED_NOW,
    }),
    acknowledgementConsumer: new ExperimentFoundationV2AcknowledgementService({
      repository: fixture.efRepository,
      now: () => FIXED_NOW,
    }),
    evidenceTrustGatewayConsumer: { async consume() {} },
    runEvidenceProjectionConsumer: { async consume() {} },
    validationCycleClosedProjectionConsumer: { async consume() {} },
    workerId: `${fixture.namespace}:relay:${revision}`,
    now: () => FIXED_NOW,
  });
  const drained = await relay.drainUntilIdle({ max_passes: 8 });
  assert.equal(drained.idle, true);
  assert.deepEqual(drained.failures.filter((failure) => (
    failure.event_type === 'WorkOrderRevisionAdmitted'
    || failure.event_type === 'RunManifestFrozen'
    || failure.event_type === 'BranchHeadAdvanced'
  )), []);
  const materialization = await fixture.efRepository.findMaterializationByRevision(
    admitted.revision.work_order_revision_id,
  );
  assert.ok(materialization);
  assert.equal(admissionBundle.outbox.event.event_type, 'WorkOrderRevisionAdmitted');
  return {
    admissionEvent: admissionBundle.outbox.event as WorkOrderRevisionAdmittedEventV1,
    frozenEvent: materialization.outbox.event,
    runId: materialization.run.run_id,
    runManifestHash: materialization.run.run_manifest_hash,
  };
}

// Server-derived ids must stay unique across service instantiations for the
// same namespace (the drift scenario re-admits revision 2 on one fixture), so
// the factory sequence is monotonic per namespace rather than per instance.
const admissionIdSequences = new Map<string, number>();

function admissionServiceFor(
  repository: PrismaPaperImplementationExperimentSpineV2Repository,
  implementationProjectId: string,
  validationCycleId: string,
  namespace: string,
  cycleClosureLookup:
    | PrismaPaperImplementationValidationCycleClosureV2Repository
    | typeof OPEN_CYCLE_LOOKUP = OPEN_CYCLE_LOOKUP,
) {
  const nextSequence = (): number => {
    const next = (admissionIdSequences.get(namespace) ?? 0) + 1;
    admissionIdSequences.set(namespace, next);
    return next;
  };
  return new PaperImplementationExperimentV2AdmissionService({
    repository,
    scopeReader: {
      async resolveExactScope(projectId, cycleId) {
        return projectId === implementationProjectId && cycleId === validationCycleId
          ? {
            implementation_project_id: implementationProjectId,
            implementation_project_lifecycle_status: 'active',
            validation_cycle_id: validationCycleId,
            validation_cycle_lifecycle_status: 'admitted',
          }
          : null;
      },
    },
    admissionEnabled: () => true,
    cycleClosureLookup,
    serverActorId: `system:${namespace}`,
    idFactory: (prefix) => `${namespace}:${prefix}:${nextSequence()}`,
    now: () => FIXED_NOW,
  });
}

function exactReadinessResolver(service: ExperimentFoundationV2Service) {
  return {
    async resolvePassedExactReadiness(input: {
      readiness_attestation_id: string;
      readiness_attestation_hash: string;
      target: Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]['target'];
      ordered_dependencies: Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]['expected_dependencies'];
    }) {
      const resolved = await service.revalidateReadiness({
        target: input.target,
        readiness_attestation_id: input.readiness_attestation_id,
        expected_dependencies: input.ordered_dependencies,
      });
      return resolved.attestation.attestation_hash === input.readiness_attestation_hash
        ? {
          attestation: resolved.attestation,
          ordered_dependencies: resolved.dependencies.map((row) => row.dependency),
        }
        : null;
    },
  };
}

function admissionRequestFromD19(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
  namespace: string,
  branchKey: string,
): PaperImplementationExperimentV2AdmissionRequest {
  const readiness = fixture.evaluation_protocol_readiness;
  const metric = fixture.metric_definitions[0]!;
  assert.equal(metric.asset_type, 'MetricDefinition');
  return {
    branch_key: branchKey,
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'Pack C-PI disposable relational fixture',
      scientific_intent: 'Exercise PI evidence, D-18 readiness, closure, and seals.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'Pack C-PI relational fixture',
      objective: 'Prove C-PI authority on disposable PostgreSQL.',
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
    business_idempotency_key: `${namespace}:admit:1`,
  };
}

function revisionRequest(
  base: PaperImplementationExperimentV2AdmissionRequest,
  namespace: string,
  revision: number,
): PaperImplementationExperimentV2AdmissionRequest {
  return {
    ...structuredClone(base),
    work_order_revision: {
      ...structuredClone(base.work_order_revision),
      title: `Pack C-PI relational fixture revision ${revision}`,
    },
    exact_cells: base.exact_cells.map((cell) => ({
      ...structuredClone(cell),
      seed: cell.seed + revision * 100,
    })),
    business_idempotency_key: `${namespace}:admit:${revision}`,
  };
}

async function seedScientificGatewayFixture(
  prisma: PrismaClient,
  repository: PrismaExperimentFoundationScientificValidationV2Repository,
  fixture: AcknowledgedRunFixture,
  authority: PaperImplementationEvidenceV2Authority,
): Promise<EvidenceCandidateQualifiedEventV1> {
  const protocol = await repository.resolveEvaluationProtocol(fixture.runId);
  const run = await repository.loadRun(fixture.runId, fixture.runManifestHash);
  assert.ok(protocol);
  assert.ok(run);
  const firstRule = protocol.protocol_snapshot.required_rules[0];
  assert.ok(firstRule);
  const reportWithoutHash: Omit<ScientificValidationReportV2, 'validation_hash'> = {
    report_id: `${fixture.namespace}:report`,
    schema_version: 'v1',
    run_id: fixture.runId,
    run_manifest_hash: fixture.runManifestHash,
    ordered_cell_results: run.ordered_cells.map((cell) => ({
      ordinal: cell.ordinal,
      run_cell_id: cell.run_cell_id,
      cell_key: cell.cell_key,
      result_id: `${fixture.namespace}:fixture-result:${cell.ordinal}`,
      result_content_hash: hash(`${fixture.namespace}:fixture-result:${cell.ordinal}`),
    })),
    evaluation_protocol: protocol.evaluation_protocol,
    validator_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
    validator_profile_hash: hash(`${fixture.namespace}:validator-profile`),
    ordered_rule_results: [{
      ordinal: 1,
      rule_id: firstRule.rule_id,
      rule_type: firstRule.rule_type,
      status: 'passed',
      detail_code: null,
    }],
    status: 'passed',
  };
  const report: ScientificValidationReportV2 = {
    ...reportWithoutHash,
    validation_hash: serverHashExperimentFoundationV2ScientificValidation({
      run_id: reportWithoutHash.run_id,
      run_manifest_hash: reportWithoutHash.run_manifest_hash,
      ordered_cell_results: reportWithoutHash.ordered_cell_results,
      evaluation_protocol: reportWithoutHash.evaluation_protocol,
      validator_profile_version: reportWithoutHash.validator_profile_version,
      validator_profile_hash: reportWithoutHash.validator_profile_hash,
      ordered_rule_results: reportWithoutHash.ordered_rule_results,
      status: reportWithoutHash.status,
    }),
  };
  const candidateWithoutHash = {
    schema_version: 'v1' as const,
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
  };
  const candidate: EvidenceCandidateV2 = {
    candidate_id: `${fixture.namespace}:candidate`,
    ...candidateWithoutHash,
    content_hash: serverHashExperimentFoundationV2EvidenceCandidate({
      run_id: candidateWithoutHash.run_id,
      run_manifest_hash: candidateWithoutHash.run_manifest_hash,
      validation_report_id: candidateWithoutHash.validation_report_id,
      validation_hash: candidateWithoutHash.validation_hash,
    }),
  };

  // Fixture boundary: Pack B cannot produce real-provider EF scientific rows.
  // These report/Candidate rows are therefore inserted directly, while the
  // gateway and every PI write below still use the production Prisma services.
  await prisma.experimentFoundationScientificValidationReportV2.create({ data: {
    id: report.report_id,
    runId: report.run_id,
    runManifestHash: report.run_manifest_hash,
    evaluationProtocolId: report.evaluation_protocol.logical_id,
    evaluationProtocolRevisionId: report.evaluation_protocol.revision_id,
    evaluationProtocolRevisionSequence: report.evaluation_protocol.revision_sequence,
    evaluationProtocolContentHash: report.evaluation_protocol.content_hash,
    validatorProfileVersion: report.validator_profile_version,
    validatorProfileHash: report.validator_profile_hash,
    status: report.status,
    schemaVersion: report.schema_version,
    orderedCellResultCount: report.ordered_cell_results.length,
    orderedRuleResultCount: report.ordered_rule_results.length,
    reportSnapshotJson: jsonInput(report),
    validationHash: report.validation_hash,
    idempotencyKey: `${fixture.namespace}:validation`,
    createdAt: new Date(FIXED_NOW),
  } });
  await prisma.experimentFoundationEvidenceCandidateV2.create({ data: {
    id: candidate.candidate_id,
    validationReportId: candidate.validation_report_id,
    validationHash: candidate.validation_hash,
    runId: candidate.run_id,
    runManifestHash: candidate.run_manifest_hash,
    schemaVersion: candidate.schema_version,
    contentHash: candidate.content_hash,
    createdAt: new Date(FIXED_NOW),
  } });
  return evidenceEvent(authority, report, candidate, fixture.namespace);
}

function evidenceEvent(
  authority: PaperImplementationEvidenceV2Authority,
  report: ScientificValidationReportV2,
  candidate: EvidenceCandidateV2,
  namespace: string,
): EvidenceCandidateQualifiedEventV1 {
  const payload = {
    event_schema: EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
    candidate_id: candidate.candidate_id,
    candidate_content_hash: candidate.content_hash,
    validation_report_id: report.report_id,
    validation_hash: report.validation_hash,
    run_id: report.run_id,
    run_manifest_hash: report.run_manifest_hash,
    evaluation_protocol_revision_id: report.evaluation_protocol.revision_id,
    evaluation_protocol_content_hash: report.evaluation_protocol.content_hash,
  };
  return {
    event_id: `${namespace}:qualified-event`,
    event_type: 'EvidenceCandidateQualified',
    schema_version: 'v1',
    producer_domain: 'ExperimentFoundation',
    occurred_at: FIXED_NOW,
    correlation_id: `${namespace}:correlation`,
    causation_id: `${namespace}:validation-event`,
    business_idempotency_key: `${namespace}:ingest`,
    implementation_project_id: authority.implementation_project_id,
    validation_cycle_id: authority.validation_cycle_id,
    branch_id: authority.branch_id,
    branch_key: authority.branch_key,
    work_order_revision_id: authority.work_order_revision_id,
    work_order_revision_hash: authority.work_order_revision_hash,
    branch_revision_sequence: authority.branch_revision_sequence,
    cell_plan_hash: authority.cell_plan_hash,
    approved_plan_hash: authority.approved_plan_hash,
    payload_hash: serverHashExperimentV2EventPayload(
      'EvidenceCandidateQualified',
      'v1',
      payload,
    ),
    payload,
  };
}

function authorityFromEvent(
  event: WorkOrderRevisionAdmittedEventV1,
): PaperImplementationEvidenceV2Authority {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
    current_work_order_revision_id: event.work_order_revision_id,
    current_branch_revision_sequence: event.branch_revision_sequence,
    head_work_order_revision_id: event.work_order_revision_id,
    head_branch_revision_sequence: event.branch_revision_sequence,
    head_run_id: null,
    head_run_manifest_hash: null,
    validation_cycle_closure_id: null,
  };
}

async function assertGatewayAuthorityRejection(
  prisma: PrismaClient,
  scientificRepository: PrismaExperimentFoundationScientificValidationV2Repository,
  event: EvidenceCandidateQualifiedEventV1,
  expectedMessage: RegExp,
): Promise<void> {
  const service = new PaperImplementationEvidenceTrustGatewayService({
    repository: new PrismaPaperImplementationEvidenceV2Repository(prisma),
    scientificValidationReadRepository: scientificRepository,
    now: () => FIXED_NOW,
  });
  const first = await service.consume(event);
  assert.equal(first.inbox.outcome, 'terminal_conflict');
  assert.equal(first.inbox.reason_code, 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE');
  assert.match(first.rejection_message ?? '', expectedMessage);
  assert.equal(first.run_evidence_unit, null);
  assert.equal(first.trace_manifest, null);
  assert.deepEqual(await gatewayCounts(prisma, event.validation_cycle_id), {
    inboxes: 1,
    evidenceUnits: 0,
    traceManifests: 0,
    registeredOutboxes: 0,
  });

  const replay = await service.consume(event);
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.inbox, first.inbox);
  assert.deepEqual(await gatewayCounts(prisma, event.validation_cycle_id), {
    inboxes: 1,
    evidenceUnits: 0,
    traceManifests: 0,
    registeredOutboxes: 0,
  });
}

function validationCycleData(
  implementationProjectId: string,
  validationCycleId: string,
): Prisma.PaperImplementationValidationCycleUncheckedCreateInput {
  return {
    id: validationCycleId,
    implementationProjectId,
    inputSnapshotId: `${validationCycleId}:input`,
    targetRefType: 'paper_project',
    targetRefId: `${validationCycleId}:target`,
    target: {},
    triggerType: 'integration_test',
    trigger: {},
    cycleType: 'experiment',
    validationQuestion: 'Does the Pack C-PI relational authority close correctly?',
    validationFrame: {},
    context: {},
    criteria: {},
    budgetId: `${validationCycleId}:budget`,
    budget: {},
    expectedInformationGain: 'medium',
    cycleStatus: 'admitted',
    executionStatus: 'not_started',
    outputs: {},
    confirmationLevel: 'confirmed',
    createdBy: 'packc-pi-relational-test',
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
    admittedAt: new Date(FIXED_NOW),
  };
}

function closureServiceFor(
  repository: PrismaPaperImplementationValidationCycleClosureV2Repository,
) {
  return new PaperImplementationValidationCycleClosureV2Service({
    repository,
    enabled: () => true,
    now: () => FIXED_NOW,
  });
}

function controlOnlyClosureRequest(
  validationCycleId: string,
  expectedCycleVersion: number,
  expectedClosureInputHash: string,
  idempotencyKey: string,
) {
  return {
    validation_cycle_id: validationCycleId,
    expected_cycle_version: expectedCycleVersion,
    expected_closure_input_hash: expectedClosureInputHash,
    closure_kind: 'control_flow_validated_no_paper_evidence' as const,
    accepted_proposal_id: null,
    expected_proposal_hash: null,
    corrected_scientific_disposition: null,
    idempotency_key: idempotencyKey,
  };
}

async function closureCounts(prisma: PrismaClient, validationCycleId: string) {
  const [closures, closedOutboxes] = await Promise.all([
    prisma.paperImplementationValidationCycleClosureV2.count({ where: { validationCycleId } }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { validationCycleId, eventType: 'ValidationCycleClosed@v1' },
    }),
  ]);
  return { closures, closedOutboxes };
}

async function gatewayCounts(prisma: PrismaClient, validationCycleId: string) {
  const units = await prisma.paperImplementationRunEvidenceUnitV2.findMany({
    where: { validationCycleId },
    select: { id: true },
  });
  const unitIds = units.map((row) => row.id);
  const [inboxes, traceManifests, registeredOutboxes] = await Promise.all([
    prisma.paperImplementationExperimentIntegrationInboxV2.count({
      where: { validationCycleId, consumerName: 'pi-evidence-trust-gateway-v2' },
    }),
    prisma.paperImplementationEvidenceTraceManifestV2.count({
      where: { runEvidenceUnitId: { in: unitIds } },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { validationCycleId, eventType: 'RunEvidenceUnitRegistered' },
    }),
  ]);
  return {
    inboxes,
    evidenceUnits: units.length,
    traceManifests,
    registeredOutboxes,
  };
}

async function noEvidenceScientificCounts(
  prisma: PrismaClient,
  fixture: AcknowledgedRunFixture,
) {
  const [cycle, experimentResults, validationReports, evidenceCandidates, runEvidenceUnits] =
    await Promise.all([
      prisma.paperImplementationValidationCycle.findUniqueOrThrow({
        where: { id: fixture.validationCycleId },
        select: { cycleStatus: true, executionStatus: true, completedAt: true },
      }),
      prisma.experimentFoundationExperimentResultV2.count({
        where: { runId: fixture.runId },
      }),
      prisma.experimentFoundationScientificValidationReportV2.count({
        where: { runId: fixture.runId },
      }),
      prisma.experimentFoundationEvidenceCandidateV2.count({
        where: { runId: fixture.runId },
      }),
      prisma.paperImplementationRunEvidenceUnitV2.count({
        where: { runId: fixture.runId },
      }),
    ]);
  return {
    cycleLifecycleStatus: cycle.cycleStatus,
    cycleExecutionStatus: cycle.executionStatus,
    cycleCompletedAt: cycle.completedAt?.toISOString() ?? null,
    experimentResults,
    validationReports,
    evidenceCandidates,
    runEvidenceUnits,
  };
}

async function seedActiveRealAttempt(
  prisma: PrismaClient,
  fixture: AcknowledgedRunFixture,
): Promise<void> {
  await widenAttemptFixtureChecks(prisma);
  const cell = await prisma.experimentFoundationRunCellV2.findFirstOrThrow({
    where: { runId: fixture.runId },
    include: { trainingTaskSpec: { select: { taskSpecHash: true } } },
    orderBy: { ordinal: 'asc' },
  });
  const acknowledgement = await prisma.experimentFoundationIntegrationInboxV2.findFirstOrThrow({
    where: {
      validationCycleId: fixture.validationCycleId,
      runId: fixture.runId,
      eventType: 'BranchHeadAdvanced',
      outcome: 'processed',
    },
  });
  const payloadId = `${fixture.namespace}:active-real-payload`;
  const payloadHash = hash(payloadId);
  await prisma.experimentFoundationProviderPayloadV2.create({ data: {
    id: payloadId,
    materializationKey: `${payloadId}:materialization`,
    runId: fixture.runId,
    runManifestHash: fixture.runManifestHash,
    runCellId: cell.id,
    cellKey: cell.cellKey,
    trainingTaskSpecId: cell.trainingTaskSpecId,
    trainingTaskSpecHash: cell.trainingTaskSpec.taskSpecHash,
    payloadSchemaVersion: 'FakeAliyunPaiDlcSubmitPayload@v1',
    adapterIdentity: 'deterministic_fake_aliyun_pai_dlc@v1',
    executionMode: 'simulation',
    provenance: 'non_production_fake_provider',
    simulationProfileVersion: 'v1',
    redactedManifestVersion: 'v1',
    redactedManifestJson: { fixture: 'packc-pi-active-real-parent' },
    payloadHash,
    payloadByteSize: 1,
    createdAt: new Date(FIXED_NOW),
  } });
  await prisma.experimentFoundationExecutionAttemptV2.create({ data: {
    id: `${fixture.namespace}:active-real-attempt`,
    externalPiImplementationProjectId: fixture.implementationProjectId,
    externalPiValidationCycleId: fixture.validationCycleId,
    externalPiBranchId: fixture.admissionEvent.branch_id,
    externalPiWorkOrderRevisionId: fixture.admissionEvent.work_order_revision_id,
    externalPiWorkOrderRevisionHash: fixture.admissionEvent.work_order_revision_hash,
    externalPiRevisionSequence: fixture.admissionEvent.branch_revision_sequence,
    runId: fixture.runId,
    runManifestHash: fixture.runManifestHash,
    runCellId: cell.id,
    cellKey: cell.cellKey,
    trainingTaskSpecId: cell.trainingTaskSpecId,
    trainingTaskSpecHash: cell.trainingTaskSpec.taskSpecHash,
    providerPayloadId: payloadId,
    providerPayloadHash: payloadHash,
    headAcknowledgementInboxId: acknowledgement.id,
    attemptSequence: 1,
    workflowBusinessKey: `${fixture.namespace}:active-real-workflow`,
    workflowRequestHash: hash(`${fixture.namespace}:active-real-workflow`),
    executionMode: 'real_provider',
    provenance: 'real_provider',
    providerIdempotencyKey: `${fixture.namespace}:active-real-provider`,
    lifecycleState: 'running',
    stateVersion: 1,
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
  } });
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

async function sealWriteCounts(prisma: PrismaClient, validationCycleId: string) {
  const branchRows = await prisma.paperImplementationExperimentWorkOrderBranchV2.findMany({
    where: { validationCycleId },
    select: { id: true },
  });
  const runs = await prisma.experimentFoundationRunV2.findMany({
    where: { externalPiBranchId: { in: branchRows.map((row) => row.id) } },
    select: { id: true },
  });
  const runIds = runs.map((row) => row.id);
  const [branches, revisions, admissions, piInboxes, piOutboxes, efInboxes, efOutboxes,
    attempts, sidecars] = await Promise.all([
    prisma.paperImplementationExperimentWorkOrderBranchV2.count({ where: { validationCycleId } }),
    prisma.paperImplementationExperimentWorkOrderRevisionV2.count({
      where: { branch: { validationCycleId } },
    }),
    prisma.paperImplementationExperimentWorkOrderAdmissionV2.count({
      where: { branch: { validationCycleId } },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.count({
      where: { validationCycleId },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count({
      where: { validationCycleId },
    }),
    prisma.experimentFoundationIntegrationInboxV2.count({ where: { validationCycleId } }),
    prisma.experimentFoundationIntegrationOutboxV2.count({ where: { validationCycleId } }),
    prisma.experimentFoundationExecutionAttemptV2.count({ where: { runId: { in: runIds } } }),
    prisma.experimentFoundationRecord.count({
      where: { recordKind: 'paper_experiment_sidecar' },
    }),
  ]);
  return {
    branches,
    revisions,
    admissions,
    piInboxes,
    piOutboxes,
    efInboxes,
    efOutboxes,
    runs: runs.length,
    attempts,
    sidecars,
  };
}

function uniqueEvidenceRow(
  base: Prisma.PaperImplementationRunEvidenceUnitV2UncheckedCreateInput,
  suffix: string,
  preserved: Partial<Prisma.PaperImplementationRunEvidenceUnitV2UncheckedCreateInput>,
): Prisma.PaperImplementationRunEvidenceUnitV2UncheckedCreateInput {
  return {
    ...base,
    id: `${base.id}:${suffix}`,
    runId: `${base.runId}:${suffix}`,
    evidenceCandidateId: `${base.evidenceCandidateId}:${suffix}`,
    validationReportId: `${base.validationReportId}:${suffix}`,
    ingestIdempotencyKey: `${base.ingestIdempotencyKey}:${suffix}`,
    contentHash: hash(`${base.id}:${suffix}`),
    ...preserved,
  };
}

async function installClosureOutboxFailureTrigger(prisma: PrismaClient): Promise<void> {
  // One statement per call: PostgreSQL rejects multi-command prepared statements.
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION packc_pi_inject_outbox_failure() RETURNS trigger AS $$
    BEGIN
      IF NEW."eventType" = 'ValidationCycleClosed@v1' THEN
        RAISE EXCEPTION 'PACKC_PI_INJECTED_OUTBOX_FAILURE';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER packc_pi_inject_outbox_failure_trigger
      BEFORE INSERT ON "PaperImplementationExperimentIntegrationOutboxV2"
      FOR EACH ROW EXECUTE FUNCTION packc_pi_inject_outbox_failure();
  `);
}

async function removeClosureOutboxFailureTrigger(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS packc_pi_inject_outbox_failure_trigger
      ON "PaperImplementationExperimentIntegrationOutboxV2";
  `);
  await prisma.$executeRawUnsafe(`
    DROP FUNCTION IF EXISTS packc_pi_inject_outbox_failure();
  `);
}

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

function appReason(reasonCode: string): (error: unknown) => boolean {
  return (error) => error instanceof AppError && error.details?.reason_code === reasonCode;
}

function renderError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details = error as Error & { code?: string; meta?: unknown };
  return `${details.name} ${details.message} ${details.code ?? ''} ${JSON.stringify(details.meta)}`;
}

function jsonInput(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function hash(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}
