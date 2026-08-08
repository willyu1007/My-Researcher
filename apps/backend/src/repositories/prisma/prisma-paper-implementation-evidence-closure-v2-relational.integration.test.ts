import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2ArtifactContractRuleV1,
  ExperimentFoundationV2ExactAssetRevisionRef,
  ExperimentFoundationV2MetricContractRuleV1,
  ExperimentFoundationV2RequiredRuleV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationAliyunRealProviderProfileV2,
  ExperimentFoundationExecutionBundleRevisionV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-real-provider-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_EVIDENCE_CANDIDATE_QUALIFIED_EVENT_V2,
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  type EvidenceCandidateV2,
  type ScientificComparisonFactV1,
  type ScientificValidationReportV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import type {
  ExperimentFoundationSourceBoundResultCellV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
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
import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  type PaperImplementationResultAnalysisRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import {
  ExperimentFoundationScientificValidationV2ConstraintError,
  type EvidenceCandidateQualifiedEventV1,
} from '../experiment-foundation-scientific-validation-v2.repository.js';
import type { PaperImplementationEvidenceV2Authority } from '../paper-implementation-evidence-v2.repository.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
  requireDisposablePostgresDatabaseIdentity,
} from '../../test-support/disposable-postgres-test-database.js';
import {
  createPersistedRealProviderBundleV2,
  runSucceededRealProviderExecutionV2,
} from '../../test-support/experiment-foundation-real-provider-v2-test-support.js';
import { buildExperimentFoundationD19TypedFixture } from '../../services/experiment-foundation-d19-fixture.js';
import { executeScientificComparisonsV1 } from '../../services/experiment-foundation-v2-scientific-comparison-engine.js';
import { ExperimentFoundationExplorationSpecV2Service } from '../../services/experiment-foundation-exploration-spec-v2-service.js';
import { ExperimentFoundationExecutionV2Service } from '../../services/experiment-foundation-execution-v2-service.js';
import { ExperimentFoundationService } from '../../services/experiment-foundation-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../../services/experiment-foundation-v2-acknowledgement-service.js';
import { ExperimentFoundationV2MaterializationService } from '../../services/experiment-foundation-v2-materialization-service.js';
import {
  ExperimentFoundationV2ScientificValidationService,
  type RecordExperimentResultV2Input,
} from '../../services/experiment-foundation-v2-scientific-validation-service.js';
import { ExperimentFoundationV2Service } from '../../services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../../services/experiment-v2-integration-relay-service.js';
import { PaperImplementationCycleReadinessV2Service } from '../../services/paper-implementation-cycle-readiness-v2-service.js';
import { PaperImplementationEvidenceTrustGatewayService } from '../../services/paper-implementation-evidence-trust-gateway-service.js';
import { PaperImplementationExplorationAttachmentV2Service } from '../../services/paper-implementation-exploration-attachment-v2-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../../services/paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from '../../services/paper-implementation-experiment-v2-head-service.js';
import { PaperImplementationRuntimeAdmissionService } from '../../services/paper-implementation-runtime-admission-service.js';
import {
  PaperImplementationResultAnalysisRuntimeService,
  type PaperImplementationResultAnalysisAgentOrchestrator,
} from '../../services/paper-implementation-result-analysis-runtime-service.js';
import { PaperImplementationScientificClosureContextService } from '../../services/paper-implementation-scientific-closure-context-service.js';
import { PaperImplementationResultPacketV2Materializer } from '../../services/paper-implementation-result-packet-v2-materializer.js';
import { PaperImplementationValidationCycleClosureV2Service } from '../../services/paper-implementation-validation-cycle-closure-v2-service.js';
import type {
  TopicSelectionAgentInvocationRequest,
  TopicSelectionAgentInvocationResult,
} from '../../services/topic-selection-agent-orchestrator-service.js';
import { stableStringify } from '../../services/literature-content-processing-utils.js';
import { PrismaExperimentFoundationExecutionV2Repository } from './prisma-experiment-foundation-execution-v2-repository.js';
import { PrismaExperimentFoundationExplorationSpecV2Repository } from './prisma-experiment-foundation-exploration-spec-v2-repository.js';
import { PrismaExperimentFoundationRepository } from './prisma-experiment-foundation-repository.js';
import { PrismaExperimentFoundationScientificValidationV2Repository } from './prisma-experiment-foundation-scientific-validation-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationCycleReadinessV2Repository } from './prisma-paper-implementation-cycle-readiness-v2-repository.js';
import { PrismaPaperImplementationEvidenceV2Repository } from './prisma-paper-implementation-evidence-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from './prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationRepository } from './prisma-paper-implementation-repository.js';
import { PrismaPaperImplementationRuntimeRepository } from './prisma-paper-implementation-runtime-repository.js';
import { PrismaPaperImplementationResultClaimDossierRepository } from './prisma-paper-implementation-result-claim-dossier-repository.js';
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

interface AttachedAcknowledgedRunFixture extends AcknowledgedRunFixture {
  attachmentWorkOrderRevisionId: string;
  realProvider: {
    revision: ExperimentFoundationExecutionBundleRevisionV2;
    profile: ExperimentFoundationAliyunRealProviderProfileV2;
  } | null;
}

type AcknowledgedRunSeedContext = Omit<
  AcknowledgedRunFixture,
  'admissionEvent' | 'frozenEvent' | 'runId' | 'runManifestHash'
> & {
  executionBundleResolver?: Awaited<ReturnType<
    typeof createPersistedRealProviderBundleV2
  >>['resolver'];
};

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
  'P3 scientific Closure and P4 Packet materialization reread exact authority in PostgreSQL',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 180_000 },
  async () => {
    const { prisma } = await openPackCPiDatabase();
    try {
      const fixture = await seedAcknowledgedRun(
        prisma,
        'scientific-closure',
        { scientificBinding: true },
      );
      const scientificRepository = new PrismaExperimentFoundationScientificValidationV2Repository(
        prisma,
      );
      const event = await seedScientificGatewayFixture(
        prisma,
        scientificRepository,
        fixture,
        authorityFromEvent(fixture.admissionEvent),
      );
      const gateway = await new PaperImplementationEvidenceTrustGatewayService({
        repository: new PrismaPaperImplementationEvidenceV2Repository(prisma),
        scientificValidationReadRepository: scientificRepository,
        now: () => FIXED_NOW,
      }).consume(event);
      assert.equal(gateway.inbox.outcome, 'processed');
      assert.ok(gateway.run_evidence_unit);

      const validation = await scientificRepository.loadValidationByRunId(fixture.runId);
      const primaryFact = validation?.report.ordered_comparison_results?.[0]?.fact;
      assert.ok(primaryFact);
      assert.equal(primaryFact.registered_relation, 'supports_registered_expectation');

      const readiness = await evaluateCycle(prisma, fixture.validationCycleId);
      assert.equal(readiness.status, 'ready_with_evidence');
      const proposal = await runScientificClosureProposal(prisma, {
        fixture,
        closureInputHash: readiness.watermark.closure_input_hash,
        runEvidenceUnitId: gateway.run_evidence_unit.run_evidence_unit_id,
        runEvidenceUnitHash: gateway.run_evidence_unit.content_hash,
        primaryFact,
      });
      const request = {
        validation_cycle_id: fixture.validationCycleId,
        expected_cycle_version: readiness.watermark.expected_cycle_version,
        expected_closure_input_hash: readiness.watermark.closure_input_hash,
        closure_kind: 'scientific_evidence_assessed' as const,
        accepted_proposal_id: proposal.proposalId,
        expected_proposal_hash: proposal.proposalHash,
        idempotency_key: `${fixture.namespace}:scientific-close`,
      };
      const service = closureServiceFor(
        new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
      );
      const [runtimeArtifact, runtimeAdmission] = await Promise.all([
        prisma.paperImplementationRuntimeArtifact.findUniqueOrThrow({
          where: { id: proposal.proposalId },
        }),
        prisma.paperImplementationRuntimeAdmissionRecord.findUniqueOrThrow({
          where: { id: proposal.admissionId },
        }),
      ]);
      assert.equal(runtimeArtifact.runMode, 'product');
      assert.equal(runtimeArtifact.executionMode, 'provider_llm');
      assert.equal(
        runtimeAdmission.admissionPolicyId,
        `paper-implementation.${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID}.final-admission`,
      );

      await prisma.paperImplementationRuntimeAdmissionRecord.update({
        where: { id: proposal.admissionId },
        data: { admissionPolicyId: 'generic-runtime-admission' },
      });
      await assert.rejects(service.close(request), appReason('CLOSURE_PROPOSAL_STALE'));
      assert.deepEqual(await closureCounts(prisma, fixture.validationCycleId), {
        closures: 0,
        closedOutboxes: 0,
      });
      await prisma.paperImplementationRuntimeAdmissionRecord.update({
        where: { id: proposal.admissionId },
        data: {
          admissionPolicyId:
            `paper-implementation.${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID}.final-admission`,
        },
      });

      const admissionBeforePayloadTamper = await prisma
        .paperImplementationRuntimeAdmissionRecord.findUniqueOrThrow({
          where: { id: proposal.admissionId },
          select: { recordPayload: true },
        });
      const tamperedAdmissionPayload = structuredClone(
        admissionBeforePayloadTamper.recordPayload,
      ) as Record<string, unknown>;
      tamperedAdmissionPayload.expected_output_schema_id = 'tampered-output-schema';
      await prisma.paperImplementationRuntimeAdmissionRecord.update({
        where: { id: proposal.admissionId },
        data: { recordPayload: jsonInput(tamperedAdmissionPayload) },
      });
      await assert.rejects(service.close(request), appReason('CLOSURE_PROPOSAL_STALE'));
      assert.deepEqual(await closureCounts(prisma, fixture.validationCycleId), {
        closures: 0,
        closedOutboxes: 0,
      });
      await prisma.paperImplementationRuntimeAdmissionRecord.update({
        where: { id: proposal.admissionId },
        data: { recordPayload: jsonInput(admissionBeforePayloadTamper.recordPayload) },
      });

      const evidenceBeforeTamper = await prisma.paperImplementationRunEvidenceUnitV2
        .findUniqueOrThrow({
          where: { id: gateway.run_evidence_unit.run_evidence_unit_id },
          select: { evidenceCandidateContentHash: true },
        });
      await prisma.paperImplementationRunEvidenceUnitV2.update({
        where: { id: gateway.run_evidence_unit.run_evidence_unit_id },
        data: { evidenceCandidateContentHash: hash('drifted-evidence-candidate') },
      });
      await assert.rejects(service.close(request), appReason('CLOSURE_PROPOSAL_STALE'));
      assert.deepEqual(await closureCounts(prisma, fixture.validationCycleId), {
        closures: 0,
        closedOutboxes: 0,
      });
      await prisma.paperImplementationRunEvidenceUnitV2.update({
        where: { id: gateway.run_evidence_unit.run_evidence_unit_id },
        data: {
          evidenceCandidateContentHash: evidenceBeforeTamper.evidenceCandidateContentHash,
        },
      });

      const closed = await service.close(request);
      assert.equal(closed.closure.closure_kind, 'scientific_evidence_assessed');
      assert.equal(closed.closure.scientific_disposition, 'positive');
      assert.equal(closed.closure.selected_exit_key, 'continue-positive');
      assert.equal(
        closed.closure.scientific_authority?.primary_comparison_fact_hash,
        primaryFact.comparison_fact_hash,
      );
      assert.equal(
        closed.closure.scientific_authority?.evaluation_protocol_content_hash,
        validation?.report.evaluation_protocol.content_hash,
      );
      assert.deepEqual(await service.close(request), closed);
      assert.deepEqual(await closureCounts(prisma, fixture.validationCycleId), {
        closures: 1,
        closedOutboxes: 1,
      });
      const closureClaim = (await fixture.piRepository.claimOutbox({
        lease_owner: `${fixture.namespace}:p4-materializer`,
        claimed_at: FIXED_NOW,
        lease_expires_at: '2026-07-21T08:01:00.000Z',
        limit: 100,
      })).find((claim) => claim.event.event_type === 'ValidationCycleClosed@v1');
      if (!closureClaim || closureClaim.event.event_type !== 'ValidationCycleClosed@v1') {
        assert.fail('ValidationCycleClosed@v1 outbox event was not claimable');
      }
      const materializer = new PaperImplementationResultPacketV2Materializer(
        new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
        new PrismaPaperImplementationResultClaimDossierRepository(prisma),
      );
      const packet = await materializer.consume(closureClaim.event);
      assert.ok(packet);
      assert.equal(packet.closure_id, closed.closure.closure_id);
      assert.equal(packet.closure_snapshot_hash, closed.closure.closure_snapshot_hash);
      assert.equal(packet.source.run_evidence_refs[0]?.ref_id, gateway.run_evidence_unit.run_evidence_unit_id);
      assert.equal(packet.source.metric_refs[0]?.ref_id, primaryFact.comparison_fact_id);
      assert.deepEqual(await materializer.consume(closureClaim.event), packet);
      assert.equal(await prisma.paperImplementationResultInterpretationPacket.count({
        where: { closureId: closed.closure.closure_id },
      }), 1);
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

test(
  'T-134 Phase 3C trusts only a newly materialized PI Run from an exploration attachment',
  { skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON, timeout: 240_000 },
  async () => {
    const { prisma } = await openPackCPiDatabase();
    try {
      const fixture = await seedAttachedAcknowledgedRun(prisma, 'phase3c-trust');
      assert.deepEqual(await attachedRunCounts(prisma, fixture), {
        taskSpecs: fixture.admissionRequest.exact_cells.length,
        runs: 1,
        results: 0,
        validationReports: 0,
        evidenceCandidates: 0,
        qualifiedOutboxes: 0,
        gatewayInboxes: 0,
        evidenceUnits: 0,
        traceManifests: 0,
        registeredOutboxes: 0,
      });

      const scientificRepository = new PrismaExperimentFoundationScientificValidationV2Repository(
        prisma,
      );
      const scientificService = new ExperimentFoundationV2ScientificValidationService({
        repository: scientificRepository,
        enabled: () => true,
        legacyObservationWriterEnabled: () => true,
        now: () => FIXED_NOW,
      });
      assert.ok(fixture.realProvider);
      const realAttemptIds = await runSucceededRealProviderExecutionV2({
        repository: new PrismaExperimentFoundationExecutionV2Repository(prisma),
        runId: fixture.runId,
        businessIdempotencyKey: `${fixture.namespace}:real-provider`,
        bundle: fixture.realProvider.revision,
        profile: fixture.realProvider.profile,
        now: FIXED_NOW,
      });
      const callerSubstituted = await scientificResultInput(
        scientificRepository,
        fixture,
        realAttemptIds,
        1,
      );
      callerSubstituted.execution_attempt_id = `${fixture.namespace}:caller-substituted-attempt`;
      await assert.rejects(
        scientificService.recordExperimentResult(callerSubstituted),
        appReason('VALIDATION_SUBJECT_INCOMPLETE'),
      );
      assert.deepEqual(await attachedRunCounts(prisma, fixture), {
        taskSpecs: fixture.admissionRequest.exact_cells.length,
        runs: 1,
        results: 0,
        validationReports: 0,
        evidenceCandidates: 0,
        qualifiedOutboxes: 0,
        gatewayInboxes: 0,
        evidenceUnits: 0,
        traceManifests: 0,
        registeredOutboxes: 0,
      });

      for (let ordinal = 1; ordinal <= realAttemptIds.length; ordinal += 1) {
        await scientificService.recordExperimentResult(await scientificResultInput(
          scientificRepository,
          fixture,
          realAttemptIds,
          ordinal,
        ));
      }
      const validated = await scientificService.validateScientificBatch({
        run_id: fixture.runId,
        expected_run_manifest_hash: fixture.runManifestHash,
        idempotency_key: `${fixture.namespace}:scientific-validation`,
      });
      assert.equal(validated.report.status, 'passed');
      assert.ok(validated.evidence_candidate);
      assert.deepEqual(await gatewayCounts(prisma, fixture.validationCycleId), {
        inboxes: 0,
        evidenceUnits: 0,
        traceManifests: 0,
        registeredOutboxes: 0,
      });

      await drainEvidenceGateway(prisma, fixture);
      assert.deepEqual(await gatewayCounts(prisma, fixture.validationCycleId), {
        inboxes: 1,
        evidenceUnits: 1,
        traceManifests: 1,
        registeredOutboxes: 1,
      });
      const evidenceUnit = await prisma.paperImplementationRunEvidenceUnitV2.findFirstOrThrow({
        where: { validationCycleId: fixture.validationCycleId },
      });
      assert.equal(evidenceUnit.implementationProjectId, fixture.implementationProjectId);
      assert.equal(evidenceUnit.branchId, fixture.admissionEvent.branch_id);
      assert.equal(
        evidenceUnit.workOrderRevisionId,
        fixture.attachmentWorkOrderRevisionId,
      );
      assert.equal(evidenceUnit.runId, fixture.runId);
      assert.equal(evidenceUnit.runManifestHash, fixture.runManifestHash);

      const succeededEvent = await prisma.experimentFoundationExecutionAttemptEventV2
        .findFirstOrThrow({
          where: {
            executionAttemptId: realAttemptIds[0],
            eventType: 'succeeded',
          },
        });
      await prisma.experimentFoundationExecutionAttemptEventV2.delete({
        where: { id: succeededEvent.id },
      });
      await assert.rejects(
        scientificRepository.loadExecutionAttempt(realAttemptIds[0]!),
        scientificReason('VALIDATION_SCOPE_DRIFT'),
      );

      const simulation = await seedAttachedAcknowledgedRun(
        prisma,
        'phase3c-simulation',
        { executable: false },
      );
      const simulated = await new ExperimentFoundationExecutionV2Service({
        repository: new PrismaExperimentFoundationExecutionV2Repository(prisma),
        readinessRevalidator: simulation.foundationService,
        intakeEnabled: () => true,
        cycleClosureLookup: OPEN_CYCLE_LOOKUP,
        now: () => FIXED_NOW,
      }).startWorkflowSimulation(simulation.runId, {
        business_idempotency_key: `${simulation.namespace}:simulation`,
      });
      const firstSimulationAttempt = simulated.execution_attempts[0];
      assert.ok(firstSimulationAttempt);
      await prisma.experimentFoundationExecutionAttemptV2.update({
        where: { id: firstSimulationAttempt.execution_attempt_id },
        data: {
          // Model the cross-table drift that PostgreSQL cannot express as a
          // CHECK: a fake simulation payload parent with real-provider claims.
          executionMode: 'real_provider',
          provenance: 'real_provider',
          lifecycleState: 'succeeded',
          stateVersion: firstSimulationAttempt.state_version + 1,
          terminalReasonCode: 'real_provider_succeeded',
          terminalAt: new Date(FIXED_NOW),
          updatedAt: new Date(FIXED_NOW),
        },
      });
      const simulationRepository = new PrismaExperimentFoundationScientificValidationV2Repository(
        prisma,
      );
      const simulationInput = await scientificResultInput(
        simulationRepository,
        simulation,
        simulated.execution_attempts.map((attempt) => attempt.execution_attempt_id),
        1,
      );
      await assert.rejects(
        new ExperimentFoundationV2ScientificValidationService({
          repository: simulationRepository,
          enabled: () => true,
          legacyObservationWriterEnabled: () => true,
          now: () => FIXED_NOW,
        }).recordExperimentResult(simulationInput),
        appReason('EVIDENCE_PROVENANCE_REJECTED'),
      );
      assert.deepEqual(await attachedRunCounts(prisma, simulation), {
        taskSpecs: simulation.admissionRequest.exact_cells.length,
        runs: 1,
        results: 0,
        validationReports: 0,
        evidenceCandidates: 0,
        qualifiedOutboxes: 0,
        gatewayInboxes: 0,
        evidenceUnits: 0,
        traceManifests: 0,
        registeredOutboxes: 0,
      });
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
  options: { scientificBinding?: boolean } = {},
): Promise<AcknowledgedRunFixture> {
  const namespace = `packc-pi-${purpose}-${randomUUID()}`;
  const implementationProjectId = `${namespace}:project`;
  const validationCycleId = `${namespace}:cycle`;
  const branchKey = `${namespace}:main`;
  await prisma.paperImplementationProject.create({
    data: implementationProjectData(implementationProjectId, namespace),
  });
  await prisma.paperImplementationValidationCycle.create({
    data: validationCycleData(implementationProjectId, validationCycleId),
  });
  const foundationService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  foundationFixturePromise ??= buildExperimentFoundationD19TypedFixture(foundationService);
  const baseFoundationFixture = await foundationFixturePromise;
  const scientificProtocol = options.scientificBinding
    ? await createScientificProtocolFixture(
      foundationService,
      baseFoundationFixture,
      namespace,
    )
    : null;
  const foundationFixture = scientificProtocol
    ? {
      ...baseFoundationFixture,
      evaluation_protocol: scientificProtocol.exactRef,
      evaluation_protocol_readiness: scientificProtocol.readiness,
    }
    : baseFoundationFixture;
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

async function createScientificProtocolFixture(
  service: ExperimentFoundationV2Service,
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
  namespace: string,
) {
  const metricDefinition = fixture.metric_definitions[0];
  if (!metricDefinition || metricDefinition.asset_type !== 'MetricDefinition') {
    throw new Error('Expected a typed MetricDefinition dependency.');
  }
  if (fixture.benchmark.asset_type !== 'Benchmark') {
    throw new Error('Expected a typed Benchmark dependency.');
  }
  const exactMetricDefinition = metricDefinition as ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'MetricDefinition';
  };
  const exactMetricDefinitions = fixture.metric_definitions.map((definition) => {
    if (definition.asset_type !== 'MetricDefinition') {
      throw new Error('Expected every metric dependency to be typed.');
    }
    return definition as ExperimentFoundationV2ExactAssetRevisionRef & {
      asset_type: 'MetricDefinition';
    };
  });
  const exactBenchmark = fixture.benchmark as ExperimentFoundationV2ExactAssetRevisionRef & {
    asset_type: 'Benchmark';
  };
  const logicalId = `${namespace}:scientific-protocol`;
  await service.createAssetDraft({
    asset_type: 'EvaluationProtocol',
    logical_id: logicalId,
    draft_content: {
      schema_version: 'v2',
      protocol_key: `${namespace}:cmp-b1`,
      display_name: 'Pack C-PI P3 scientific protocol',
      benchmark_dependency: exactBenchmark,
      metric_dependencies: exactMetricDefinitions,
      required_rules: [{
        rule_id: 'metric_contract@v1:embedding_time_ns',
        rule_type: 'metric_contract@v1',
        metric_definition: exactMetricDefinition,
        metric_key: 'embedding_time_ns',
        required_cardinality: 1,
        split_key: 'query',
        value_type: 'duration_ns',
        unit: 'ns',
        finite_required: true,
      }],
      scientific_contract: {
        schema_version: 'ExperimentFoundationScientificProtocol@v1',
        observation_slots: [{
          observation_key: 'embedding-time',
          ordinal: 1,
          metric_key: 'embedding_time_ns',
          split_key: 'query',
          value_type: 'duration_ns',
          unit: 'ns',
          statistic: { kind: 'point' },
          uncertainty: { kind: 'none' },
        }],
        artifact_slots: [],
        comparison_rules: [{
          comparison_key: 'primary-embedding-time',
          ordinal: 1,
          left_cell_ordinal: 1,
          right_cell_ordinal: 2,
          observation_key: 'embedding-time',
          effect_kind: 'absolute_difference',
          direction: 'lower_is_support',
          support_min: 0.05,
          contradiction_max: -0.05,
          uncertainty_policy: { kind: 'not_required_by_protocol' },
        }],
        primary_comparison_key: 'primary-embedding-time',
        decision_if_positive: 'continue-positive',
        decision_if_negative: 'continue-negative',
        decision_if_inconclusive: 'continue-inconclusive',
      },
    },
  });
  const frozen = await service.freezeAssetDraft({
    asset_type: 'EvaluationProtocol',
    logical_id: logicalId,
    expected_state_version: 1,
    business_idempotency_key: `${namespace}:freeze-scientific-protocol`,
  });
  const registered = await service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: null,
    event_type: 'registered',
    reason_code: 'PACK_C_PI_P3_REGISTERED',
  });
  await service.appendLifecycleEvent({
    asset: frozen.exact_ref,
    expected_projection_state_version: registered.projection.projection_state_version,
    event_type: 'activated',
    reason_code: 'PACK_C_PI_P3_ACTIVATED',
  });
  const readiness = await service.createReadinessAttestation({
    target: frozen.exact_ref,
  });
  return { exactRef: frozen.exact_ref, readiness };
}

async function seedAttachedAcknowledgedRun(
  prisma: PrismaClient,
  purpose: string,
  options: { executable?: boolean } = {},
): Promise<AttachedAcknowledgedRunFixture> {
  const namespace = `packc-pi-${purpose}-${randomUUID()}`;
  const implementationProjectId = `${namespace}:project`;
  const validationCycleId = `${namespace}:cycle`;
  const branchKey = `${namespace}:attached`;
  await prisma.paperImplementationProject.create({
    data: implementationProjectData(implementationProjectId, namespace),
  });
  await prisma.paperImplementationValidationCycle.create({
    data: validationCycleData(implementationProjectId, validationCycleId),
  });

  const foundationService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  foundationFixturePromise ??= buildExperimentFoundationD19TypedFixture(foundationService);
  const foundationFixture = await foundationFixturePromise;
  const realProvider = options.executable === false
    ? null
    : await createPersistedRealProviderBundleV2({ prisma, namespace, now: FIXED_NOW });
  const admissionRequest = admissionRequestFromD19(
    foundationFixture,
    namespace,
    branchKey,
    realProvider?.revision,
  );
  const specRepository = new PrismaExperimentFoundationExplorationSpecV2Repository(prisma);
  const spec = await new ExperimentFoundationExplorationSpecV2Service(specRepository, {
    enabled: () => true,
    now: () => FIXED_NOW,
  }).createRevision(`${namespace}:exploration-spec`, {
    expected_state_version: 0,
    business_idempotency_key: `${namespace}:spec-command`,
    specification: {
      schema_version: 'v1',
      proposed_branch_frame: structuredClone(admissionRequest.branch_frame),
      work_order_revision: structuredClone(admissionRequest.work_order_revision),
      exact_cells: structuredClone(admissionRequest.exact_cells),
    },
  });
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const admission = admissionServiceFor(
    piRepository,
    implementationProjectId,
    validationCycleId,
    namespace,
    OPEN_CYCLE_LOOKUP,
    'system:paper-implementation-experiment-v2-admission',
  );
  const attached = await new PaperImplementationExplorationAttachmentV2Service({
    specReader: specRepository,
    readinessRevalidator: {
      async revalidate(input) {
        const resolved = await foundationService.revalidateReadiness({
          target: input.target,
          readiness_attestation_id: input.readiness_attestation_id,
          expected_dependencies: input.ordered_dependencies,
        });
        return resolved.attestation.attestation_hash === input.readiness_attestation_hash;
      },
    },
    admission,
    enabled: () => true,
  }).attach({
    implementation_project_id: implementationProjectId,
    validation_cycle_id: validationCycleId,
    spec_id: spec.identity.spec_id,
    spec_revision: spec.revision.spec_revision,
  }, {
    branch_key: branchKey,
    business_idempotency_key: `${namespace}:attach`,
  });

  const attachmentOnlyCounts = await Promise.all([
    prisma.experimentFoundationTrainingTaskSpecV2.count({
      where: { externalPiWorkOrderRevisionId: attached.revision.work_order_revision_id },
    }),
    prisma.experimentFoundationRunV2.count({
      where: { externalPiWorkOrderRevisionId: attached.revision.work_order_revision_id },
    }),
    prisma.paperImplementationRunEvidenceUnitV2.count({
      where: { implementationProjectId },
    }),
  ]);
  assert.deepEqual(attachmentOnlyCounts, [0, 0, 0]);

  const context: AcknowledgedRunSeedContext = {
    namespace,
    implementationProjectId,
    validationCycleId,
    branchKey,
    admissionRequest,
    foundationService,
    piRepository,
    efRepository,
    executionBundleResolver: realProvider?.resolver,
  };
  const seeded = await drainAdmittedRevision(
    context,
    attached.branch.branch_id,
    attached.revision.work_order_revision_id,
  );
  return {
    ...context,
    ...seeded,
    attachmentWorkOrderRevisionId: attached.attachment.work_order_revision_id,
    realProvider: realProvider
      ? { revision: realProvider.revision, profile: realProvider.profile }
      : null,
  };
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
  return drainAdmittedRevision(
    fixture,
    admitted.branch.branch_id,
    admitted.revision.work_order_revision_id,
  );
}

async function drainAdmittedRevision(
  fixture: AcknowledgedRunSeedContext,
  branchId: string,
  workOrderRevisionId: string,
): Promise<Pick<
  AcknowledgedRunFixture,
  'admissionEvent' | 'frozenEvent' | 'runId' | 'runManifestHash'
>> {
  const admissionBundle = await fixture.piRepository.findRevisionBundle(
    branchId,
    workOrderRevisionId,
  );
  assert.ok(admissionBundle);
  const materializer = new ExperimentFoundationV2MaterializationService({
    repository: fixture.efRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: exactReadinessResolver(fixture.foundationService),
    executionBundleResolver: fixture.executionBundleResolver,
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
    workerId: `${fixture.namespace}:relay:${workOrderRevisionId}`,
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
    workOrderRevisionId,
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
  serverActorId = `system:${namespace}`,
) {
  const nextSequence = (): number => {
    const next = (admissionIdSequences.get(namespace) ?? 0) + 1;
    admissionIdSequences.set(namespace, next);
    return next;
  };
  return new PaperImplementationExperimentV2AdmissionService({
    repository,
    explorationAttachmentRepository: repository,
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
    serverActorId,
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
  executionBundle?: ExperimentFoundationExecutionBundleRevisionV2,
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
      ...(executionBundle ? {
        work_order_schema_version: 'v2' as const,
        execution_bundle: {
          execution_bundle_id: executionBundle.execution_bundle_id,
          execution_bundle_revision_id: executionBundle.execution_bundle_revision_id,
          revision_sequence: executionBundle.revision_sequence,
          content_hash: executionBundle.content_hash,
        },
        resource_snapshot: { cpu_cores: 1, memory_mb: 1024 },
      } : {
        work_order_schema_version: 'v1' as const,
      }),
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
      cell_key: `${namespace}-cell-${ordinal}`,
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
  const scientificContract = protocol.protocol_snapshot.scientific_contract;
  const comparisonInputs: ExperimentFoundationSourceBoundResultCellV2[] = scientificContract
    ? run.ordered_cells.map((cell) => ({
      result_id: `${fixture.namespace}:fixture-result:${cell.ordinal}`,
      schema_version: 'v2',
      run_id: fixture.runId,
      run_manifest_hash: fixture.runManifestHash,
      run_cell_id: cell.run_cell_id,
      cell_key: cell.cell_key,
      training_task_spec_id: cell.training_task_spec_id,
      training_task_spec_hash: cell.training_task_spec_hash,
      execution_attempt_id: `${fixture.namespace}:fixture-attempt:${cell.ordinal}`,
      collection_attempt_id: `${fixture.namespace}:fixture-collection:${cell.ordinal}`,
      source_output_id: `${fixture.namespace}:fixture-source:${cell.ordinal}`,
      source_output_hash: hash(`${fixture.namespace}:fixture-source:${cell.ordinal}`),
      source_output_kind: 'scientific_result_manifest',
      source_output_class: 'scientific_source',
      parser_profile_version: 'pack-c-pi-fixture-parser@v1',
      parser_profile_hash: hash(`${fixture.namespace}:fixture-parser`),
      evaluation_protocol: protocol.evaluation_protocol,
      provenance: 'real_provider',
      metric_observations: scientificContract.observation_slots.map((slot) => ({
        observation_id: `${fixture.namespace}:${cell.ordinal}:${slot.observation_key}`,
        ordinal: slot.ordinal,
        observation_key: slot.observation_key,
        metric_key: slot.metric_key,
        split_key: slot.split_key,
        value: 1 + cell.ordinal / 10,
        value_type: slot.value_type,
        unit: slot.unit,
        statistic: { kind: 'point', sample_size: 1 },
        uncertainty: { kind: 'none', reason: 'not_required_by_protocol' },
      })),
      artifact_observations: [],
      derivation_hash: hash(`${fixture.namespace}:fixture-derivation:${cell.ordinal}`),
      content_hash: hash(`${fixture.namespace}:fixture-result:${cell.ordinal}`),
    }))
    : [];
  const comparisonEvaluation = scientificContract?.comparison_rules?.length
    ? executeScientificComparisonsV1({
      run_id: fixture.runId,
      evaluation_protocol_revision_hash: protocol.evaluation_protocol.content_hash,
      ordered_cells: run.ordered_cells,
      ordered_cell_results: comparisonInputs,
      observation_slots: scientificContract.observation_slots,
      comparison_rules: scientificContract.comparison_rules,
    })
    : null;
  const reportWithoutHash: Omit<ScientificValidationReportV2, 'validation_hash'> = {
    report_id: `${fixture.namespace}:report`,
    schema_version: 'v1',
    run_id: fixture.runId,
    run_manifest_hash: fixture.runManifestHash,
    ordered_cell_results: run.ordered_cells.map((cell, index) => ({
      ordinal: cell.ordinal,
      run_cell_id: cell.run_cell_id,
      cell_key: cell.cell_key,
      result_id: comparisonInputs[index]?.result_id
        ?? `${fixture.namespace}:fixture-result:${cell.ordinal}`,
      result_content_hash: comparisonInputs[index]?.content_hash
        ?? hash(`${fixture.namespace}:fixture-result:${cell.ordinal}`),
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
    ...(comparisonEvaluation
      ? { ordered_comparison_results: comparisonEvaluation.ordered_comparison_results }
      : {}),
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
      ...(reportWithoutHash.ordered_comparison_results
        ? { ordered_comparison_results: reportWithoutHash.ordered_comparison_results }
        : {}),
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

async function scientificResultInput(
  repository: PrismaExperimentFoundationScientificValidationV2Repository,
  fixture: AcknowledgedRunFixture,
  attemptIds: readonly string[],
  ordinal: number,
): Promise<RecordExperimentResultV2Input> {
  const [run, protocol] = await Promise.all([
    repository.loadRun(fixture.runId, fixture.runManifestHash),
    repository.resolveEvaluationProtocol(fixture.runId),
  ]);
  assert.ok(run);
  assert.ok(protocol);
  const cell = run.ordered_cells[ordinal - 1];
  const executionAttemptId = attemptIds[ordinal - 1];
  assert.ok(cell);
  assert.ok(executionAttemptId);
  return {
    schema_version: 'v1',
    run_id: fixture.runId,
    run_manifest_hash: fixture.runManifestHash,
    run_cell_id: cell.run_cell_id,
    cell_key: cell.cell_key,
    training_task_spec_id: cell.training_task_spec_id,
    training_task_spec_hash: cell.training_task_spec_hash,
    execution_attempt_id: executionAttemptId,
    provenance: 'real_provider',
    metric_observations: protocol.protocol_snapshot.required_rules
      .filter(isMetricRule)
      .map((rule, index) => ({
        metric_key: rule.metric_key,
        split_key: rule.split_key,
        value: ordinal + index / 10,
        value_type: rule.value_type,
        unit: rule.unit,
      })),
    artifact_observations: protocol.protocol_snapshot.required_rules
      .filter(isArtifactRule)
      .map((rule, index) => ({
        artifact_kind: rule.artifact_kind,
        file_name: rule.file_name,
        content_hash: hash(`${fixture.namespace}:artifact:${ordinal}:${index}`),
        byte_size: ordinal + index + 1,
        parser_binding: rule.parser_binding,
      })),
  };
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

async function drainEvidenceGateway(
  prisma: PrismaClient,
  fixture: AttachedAcknowledgedRunFixture,
): Promise<void> {
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: fixture.piRepository,
    experimentFoundationRepository: fixture.efRepository,
    materializationConsumer: new ExperimentFoundationV2MaterializationService({
      repository: fixture.efRepository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      readinessResolver: exactReadinessResolver(fixture.foundationService),
      now: () => FIXED_NOW,
    }),
    headConsumer: new PaperImplementationExperimentV2HeadService({
      repository: fixture.piRepository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      now: () => FIXED_NOW,
    }),
    acknowledgementConsumer: new ExperimentFoundationV2AcknowledgementService({
      repository: fixture.efRepository,
      now: () => FIXED_NOW,
    }),
    evidenceTrustGatewayConsumer: new PaperImplementationEvidenceTrustGatewayService({
      repository: new PrismaPaperImplementationEvidenceV2Repository(prisma),
      scientificValidationReadRepository:
        new PrismaExperimentFoundationScientificValidationV2Repository(prisma),
      now: () => FIXED_NOW,
    }),
    runEvidenceProjectionConsumer: { async consume() {} },
    validationCycleClosedProjectionConsumer: { async consume() {} },
    workerId: `${fixture.namespace}:phase3c-gateway-relay`,
    now: () => FIXED_NOW,
  });
  const drained = await relay.drainUntilIdle({ max_passes: 8 });
  assert.equal(drained.idle, true);
  assert.deepEqual(drained.failures.filter((failure) => (
    failure.event_type === 'EvidenceCandidateQualified'
  )), []);
}

async function attachedRunCounts(
  prisma: PrismaClient,
  fixture: AttachedAcknowledgedRunFixture,
) {
  const [
    taskSpecs,
    runs,
    results,
    validationReports,
    evidenceCandidates,
    qualifiedOutboxes,
    gateway,
  ] =
    await Promise.all([
      prisma.experimentFoundationTrainingTaskSpecV2.count({
        where: { externalPiWorkOrderRevisionId: fixture.attachmentWorkOrderRevisionId },
      }),
      prisma.experimentFoundationRunV2.count({
        where: { externalPiWorkOrderRevisionId: fixture.attachmentWorkOrderRevisionId },
      }),
      prisma.experimentFoundationExperimentResultV2.count({ where: { runId: fixture.runId } }),
      prisma.experimentFoundationScientificValidationReportV2.count({
        where: { runId: fixture.runId },
      }),
      prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId: fixture.runId } }),
      prisma.experimentFoundationIntegrationOutboxV2.count({
        where: { runId: fixture.runId, eventType: 'EvidenceCandidateQualified' },
      }),
      gatewayCounts(prisma, fixture.validationCycleId),
    ]);
  return {
    taskSpecs,
    runs,
    results,
    validationReports,
    evidenceCandidates,
    qualifiedOutboxes,
    gatewayInboxes: gateway.inboxes,
    evidenceUnits: gateway.evidenceUnits,
    traceManifests: gateway.traceManifests,
    registeredOutboxes: gateway.registeredOutboxes,
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

function implementationProjectData(
  implementationProjectId: string,
  namespace: string,
): Prisma.PaperImplementationProjectUncheckedCreateInput {
  return {
    id: implementationProjectId,
    intakeSnapshotId: `${namespace}:intake`,
    titleCardId: `${namespace}:title-card`,
    paperProjectBridgeId: `${namespace}:bridge`,
    bridgePayloadHash: hash(`${namespace}:bridge`),
    lifecycleStatus: 'active',
    freshnessStatus: 'fresh',
    sourceStatus: 'active',
    versionNumber: 1,
    createdBy: 't134-phase3c-relational-test',
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
  };
}

async function runScientificClosureProposal(
  prisma: PrismaClient,
  input: {
    fixture: AcknowledgedRunFixture;
    closureInputHash: string;
    runEvidenceUnitId: string;
    runEvidenceUnitHash: string;
    primaryFact: ScientificComparisonFactV1;
  },
): Promise<{ proposalId: string; proposalHash: string; admissionId: string }> {
  const titleCardId = `${input.fixture.namespace}:title-card`;
  const resultPacketId = `${input.fixture.namespace}:result-interpretation-packet`;
  const resultTraceId = `${input.fixture.namespace}:result-analysis-trace`;
  const evidenceRef: TopicSelectionFunctionalRef = {
    ...runtimeRef('run_evidence_unit', input.runEvidenceUnitId, titleCardId),
    version_id: input.runEvidenceUnitHash,
  };
  const runtimeRepository = new PrismaPaperImplementationRuntimeRepository(prisma);
  await prisma.paperImplementationTraceManifest.create({
    data: {
      id: resultTraceId,
      implementationProjectId: input.fixture.implementationProjectId,
      targetRefType: 'result_interpretation_packet',
      targetRefId: resultPacketId,
      targetVersionId: null,
      targetRef: jsonInput(runtimeRef('result_interpretation_packet', resultPacketId, titleCardId)),
      literatureLineage: jsonInput({}),
      experimentLineage: jsonInput({}),
      artifactLineage: jsonInput({}),
      decisionLineage: jsonInput({}),
      internalInterpretationLineage: jsonInput({}),
      integrity: jsonInput({}),
      traceStatus: 'complete',
      brokenRefCount: 0,
      staleRefCount: 0,
      missingRefCount: 0,
      nonCitableRefCount: 0,
      tracePolicyVersionId: 'packc-pi-p4-trace-v1',
      createdBy: 'packc-pi-p4-relational',
      createdAt: new Date(FIXED_NOW),
    },
  });
  let idSequence = 0;
  const idFactory = (prefix: string) => (
    `${input.fixture.namespace}:${prefix}:${++idSequence}`
  );
  const admission = new PaperImplementationRuntimeAdmissionService({
    repository: runtimeRepository,
    idFactory,
    now: () => FIXED_NOW,
  });
  const orchestrator: PaperImplementationResultAnalysisAgentOrchestrator = {
    invokeStructuredOutput: async <T>(request: TopicSelectionAgentInvocationRequest<T>) => scientificInvocationResult(
      scientificResultAnalysisRoleOutput(input.fixture.namespace, evidenceRef) as unknown as T,
      request.node_id,
      request.execution_mode,
    ),
  };
  const runtime = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository: new PrismaPaperImplementationRepository(prisma),
    runtimeAdmission: admission,
    agentOrchestrator: orchestrator,
    scientificClosureContextResolver: new PaperImplementationScientificClosureContextService(
      new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
    ),
    idFactory,
    now: () => FIXED_NOW,
  });
  const result = await runtime.runInterpretationScenarios(
    input.fixture.implementationProjectId,
    {
      run_id: `${input.fixture.namespace}:result-analysis-product-run`,
      run_mode: 'product',
      execution_mode: 'provider_llm',
      model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
      model_option_id: `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.relational-stub`,
      target_ref: runtimeRef(
        'Validation-Cycle',
        input.fixture.validationCycleId,
        titleCardId,
      ),
      target_version_id: 'runtime-input-snapshot-version-13',
      input_snapshot_ref: runtimeRef(
        'implementation_input_snapshot',
        `${input.fixture.namespace}:result-analysis-input`,
        titleCardId,
      ),
      input_snapshot_hash: runtimeHash(`${input.fixture.namespace}:result-analysis-input`),
      source_refs: [
        runtimeRef(
          'result_interpretation_packet',
          resultPacketId,
          titleCardId,
        ),
        runtimeRef(
          'trace_manifest',
          resultTraceId,
          titleCardId,
        ),
      ],
      source_hashes: [
        runtimeHash(`${input.fixture.namespace}:result-interpretation-packet`),
        runtimeHash(`${input.fixture.namespace}:result-analysis-trace`),
      ],
      scientific_closure_intent: {
        schema_version: 'PaperImplementationScientificClosureIntent@v1',
        expected_closure_watermark_hash: input.closureInputHash,
      },
    },
  );
  const artifact = result.final_runtime_artifact;
  const admitted = result.final_admission_record;
  assert.ok(artifact);
  assert.ok(admitted);
  assert.equal(result.status, 'passed');
  assert.equal(
    artifact.output_schema_id,
    PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SCIENTIFIC_CLOSURE_OUTPUT_SCHEMA_ID,
  );
  assert.equal(admitted.admission_status, 'admitted');
  assert.equal(artifact.run_mode, 'product');
  assert.equal(artifact.execution_mode, 'provider_llm');
  assert.equal(artifact.target_ref.ref_type, 'validation_cycle');
  assert.equal(artifact.target_ref.version_id, 'v1');
  assert.equal(artifact.target_version_id, 'runtime-input-snapshot-version-13');
  assert.equal(admitted.target_ref.ref_type, 'validation_cycle');
  assert.equal(admitted.target_ref.version_id, 'v1');
  const { artifact_identity_hash: artifactIdentityHash, ...artifactIdentityInput } = artifact;
  assert.equal(artifactIdentityHash, runtimeHash(artifactIdentityInput));
  const proposal = artifact.artifact_payload.scientific_closure_proposal;
  assert.ok(proposal && typeof proposal === 'object');
  assert.deepEqual(
    (proposal as { primary_comparison_fact_ref: unknown }).primary_comparison_fact_ref,
    {
      comparison_fact_id: input.primaryFact.comparison_fact_id,
      comparison_fact_hash: input.primaryFact.comparison_fact_hash,
    },
  );
  assert.equal(artifact.final_artifact_hash, artifact.artifact_payload_hash);
  return {
    proposalId: artifact.runtime_artifact_id,
    proposalHash: artifact.final_artifact_hash!,
    admissionId: admitted.admission_record_id,
  };
}

function scientificResultAnalysisRoleOutput(
  namespace: string,
  evidenceRef: TopicSelectionFunctionalRef,
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'The registered primary comparison supports the preregistered expectation.',
    cited_source_refs: [evidenceRef],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: [
      'positive',
      'negative',
      'inconclusive',
      'failed_run',
    ].map((scenarioKind) => ({
      scenario_id: `${namespace}:${scenarioKind}`,
      scenario_kind: scenarioKind as 'positive' | 'negative' | 'inconclusive' | 'failed_run',
      summary: `${scenarioKind} bounded interpretation.`,
      support_refs: [evidenceRef],
      challenge_refs: [],
      limitation_refs: [],
      forbidden_overclaims: ['Do not generalize beyond the registered protocol.'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    })),
    interpretation: {
      result_summary:
        'The trusted result supports the preregistered expectation within its protocol scope.',
      supports_assertion_refs: [],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: ['Bounded to one exact registered comparison.'],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: ['Do not generalize beyond the registered protocol.'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
  };
}

function scientificInvocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  const outputHash = runtimeHash(output);
  const tokenBudget = {
    provider_id: null,
    model_id: null,
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1_200,
    estimated_output_tokens: 1_800,
    context_window_tokens: 128_000,
    schema_overhead_tokens: 1_000,
    decision: 'within_budget',
    compression_strategy_ref: runtimeRef(
      'compression_strategy',
      'result-analysis-relational-compression',
      'relational-title-card',
    ),
    blocker_codes: [],
    warning_codes: [],
  };
  const provenance = {
    workflow_run_id: 'result-analysis-relational-run',
    node_id: nodeId,
    node_attempt_id: `${nodeId}.attempt-0`,
    invocation_attempt_id: `${nodeId}.call-1`,
    execution_mode: executionMode,
    executor_kind: 'single_agent',
    source_kind: 'provider_response',
    non_provider: false,
    run_mode: 'product',
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: runtimeHash('result-analysis-profile'),
    model_option_id: `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.relational-stub`,
    normalized_params_hash: runtimeHash('result-analysis-params'),
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationResultAnalysisRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-result-analysis-scenarios',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_result_analysis_role_output',
    prompt_packet_hash: runtimeHash(`prompt:${nodeId}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: { request_count: 1 },
  };
  return {
    schema_version: 'v1',
    node_id: nodeId,
    workflow_run_id: 'result-analysis-relational-run',
    node_attempt_id: `${nodeId}.attempt-0`,
    status: 'succeeded',
    structured_output: output,
    provenance,
    validation: { valid: true, error_count: 0, errors: [] },
    token_budget_gate_result: tokenBudget,
    warning_codes: [],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: nodeId,
      workflow_run_id: 'result-analysis-relational-run',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance,
      token_budget_gate_result: tokenBudget,
      validation: { valid: true, error_count: 0, errors: [] },
      warning_codes: [],
      blocker_codes: [],
      error_code: null,
      created_at: FIXED_NOW,
    },
    created_at: FIXED_NOW,
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function runtimeRef(
  refType: string,
  refId: string,
  titleCardId: string,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: 'v1',
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
    providerProfileVersion: 'v1',
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

function scientificReason(
  reasonCode: ExperimentFoundationScientificValidationV2ConstraintError['reasonCode'],
): (error: unknown) => boolean {
  return (error) => (
    error instanceof ExperimentFoundationScientificValidationV2ConstraintError
    && error.reasonCode === reasonCode
  );
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

function runtimeHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
