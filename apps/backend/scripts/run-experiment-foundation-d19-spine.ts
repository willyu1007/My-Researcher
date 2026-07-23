import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2AssetRevisionRecord,
} from '../src/repositories/experiment-foundation-v2.repository.js';
import type {
  ExperimentFoundationExperimentSpineV2Repository,
  PaperImplementationExperimentSpineV2Repository,
} from '../src/repositories/experiment-spine-v2.repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  reconstructExperimentV2Event,
} from '../src/repositories/experiment-v2-stored-integration-event.js';
import { PaperImplementationExperimentV2Controller } from '../src/controllers/paper-implementation-experiment-v2-controller.js';
import { registerPaperImplementationExperimentV2Routes } from '../src/routes/paper-implementation-experiment-v2-routes.js';
import { AppError } from '../src/errors/app-error.js';
import { buildExperimentFoundationD19TypedFixture } from '../src/services/experiment-foundation-d19-fixture.js';
import {
  importExperimentFoundationD19TypedFixture,
} from '../src/services/experiment-foundation-d19-fixture-import-service.js';
import {
  digestExperimentFoundationD19SourcePolicyAttestation,
  EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST,
  parseExperimentFoundationD19SourcePolicyAttestation,
  type ExperimentFoundationD19SourcePolicyAttestation,
} from '../src/services/experiment-foundation-d19-source-policy.js';
import {
  ACKNOWLEDGEMENT_CONSUMER,
  ExperimentFoundationV2AcknowledgementService,
} from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  deriveExperimentFoundationV2RunManifestHash,
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import {
  ExperimentFoundationV2Service,
  type ExperimentFoundationV2CreateAssetDraftInput,
} from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../src/services/paper-implementation-experiment-v2-admission-service.js';
import {
  HEAD_CONSUMER,
  PaperImplementationExperimentV2HeadService,
} from '../src/services/paper-implementation-experiment-v2-head-service.js';
import Fastify from 'fastify';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
  serverHashExperimentV2SemanticContent,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import type {
  BranchHeadAdvancedEventV1,
  PaperImplementationExperimentV2AdmissionRequest,
  PaperImplementationExperimentV2AdmissionResponse,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  requireExperimentFoundationD19DisposableDatabaseIdentity,
  type ExperimentFoundationD19DisposableDatabaseIdentity,
} from './experiment-foundation-d19-disposable-database.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  '.ai/.tmp/experiment-foundation-productization',
);
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'prisma/migrations/20260713180000_add_experiment_foundation_d19_v2_spine/migration.sql',
);
const ADMISSION_PATH =
  '/paper-implementation/projects/d19-implementation-project/validation-cycles/d19-validation-cycle/experiment-work-orders/v2/admissions';
const SERVER_ACTOR = 'system:paper-implementation-experiment-v2-admission';
const HASH = `sha256:${'a'.repeat(64)}`;
const HASH_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);
const REQUIRED_CHECK_IDS = [
  'A01', 'A02', 'A03', 'A04',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10',
] as const;

type CheckId = (typeof REQUIRED_CHECK_IDS)[number];

interface ScriptArgs {
  outputPath: string;
}

interface CheckEvidence {
  status: 'passed';
  evidence_path: string;
  summary: string;
}

interface PaperImplementationV2Census {
  work_order_branch: number;
  work_order_revision: number;
  work_order_revision_cell: number;
  admission: number;
  integration_inbox: number;
  integration_outbox: number;
}

interface ExperimentFoundationV2Census {
  dataset_identity: number;
  dataset_revision: number;
  dataset_freeze_command_receipt: number;
  data_policy_identity: number;
  data_policy_revision: number;
  data_policy_freeze_command_receipt: number;
  metric_definition_identity: number;
  metric_definition_revision: number;
  metric_definition_freeze_command_receipt: number;
  benchmark_identity: number;
  benchmark_revision: number;
  benchmark_freeze_command_receipt: number;
  evaluation_protocol_identity: number;
  evaluation_protocol_revision: number;
  evaluation_protocol_freeze_command_receipt: number;
  evaluation_protocol_metric_dependency: number;
  lifecycle_event: number;
  lifecycle_projection: number;
  readiness_attestation: number;
  readiness_dependency: number;
  version_lock: number;
  version_lock_dependency: number;
  run_recipe: number;
  training_task_spec: number;
  run: number;
  run_cell: number;
  integration_inbox: number;
  integration_outbox: number;
  provider_payload: number;
  execution_attempt: number;
  execution_attempt_event: number;
  provider_command: number;
  collection_attempt: number;
  provisional_output: number;
}

interface V2Census {
  pi: PaperImplementationV2Census;
  ef: ExperimentFoundationV2Census;
  later_v2: Record<string, number>;
}

const D19_CENSUS_MODEL_NAMES = [
  'PaperImplementationExperimentWorkOrderBranchV2',
  'PaperImplementationExperimentWorkOrderRevisionV2',
  'PaperImplementationExperimentWorkOrderRevisionCellV2',
  'PaperImplementationExperimentWorkOrderAdmissionV2',
  'PaperImplementationExperimentIntegrationInboxV2',
  'PaperImplementationExperimentIntegrationOutboxV2',
  'ExperimentFoundationDatasetV2',
  'ExperimentFoundationDatasetRevisionV2',
  'ExperimentFoundationDatasetFreezeCommandReceiptV2',
  'ExperimentFoundationDataPolicyV2',
  'ExperimentFoundationDataPolicyRevisionV2',
  'ExperimentFoundationDataPolicyFreezeCommandReceiptV2',
  'ExperimentFoundationMetricDefinitionV2',
  'ExperimentFoundationMetricDefinitionRevisionV2',
  'ExperimentFoundationMetricDefinitionFreezeCommandReceiptV2',
  'ExperimentFoundationBenchmarkV2',
  'ExperimentFoundationBenchmarkRevisionV2',
  'ExperimentFoundationBenchmarkFreezeCommandReceiptV2',
  'ExperimentFoundationEvaluationProtocolV2',
  'ExperimentFoundationEvaluationProtocolRevisionV2',
  'ExperimentFoundationEvaluationProtocolFreezeCommandReceiptV2',
  'ExperimentFoundationEvaluationProtocolMetricDependencyV2',
  'ExperimentFoundationAssetLifecycleEventV2',
  'ExperimentFoundationAssetLifecycleProjectionV2',
  'ExperimentFoundationReadinessAttestationV2',
  'ExperimentFoundationReadinessDependencyV2',
  'ExperimentFoundationVersionLockV2',
  'ExperimentFoundationVersionLockDependencyV2',
  'ExperimentFoundationRunRecipeV2',
  'ExperimentFoundationTrainingTaskSpecV2',
  'ExperimentFoundationRunV2',
  'ExperimentFoundationRunCellV2',
  'ExperimentFoundationIntegrationInboxV2',
  'ExperimentFoundationIntegrationOutboxV2',
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;

const V2_CENSUS_MODEL_NAMES = [
  ...D19_CENSUS_MODEL_NAMES,
  'PaperImplementationRunEvidenceUnitV2',
  'PaperImplementationEvidenceTraceManifestV2',
  'PaperImplementationValidationCycleClosureV2',
  'ExperimentFoundationExecutionBundleIdentityV2',
  'ExperimentFoundationExecutionBundleDraftV2',
  'ExperimentFoundationExecutionBundleRevisionV2',
  'ExperimentFoundationExecutionBundleLifecycleEventV2',
  'ExperimentFoundationExecutionBundleLifecycleProjectionV2',
  'ExperimentFoundationExecutionBundleReadinessV2',
  'ExperimentFoundationExperimentResultV2',
  'ExperimentFoundationScientificValidationReportV2',
  'ExperimentFoundationEvidenceCandidateV2',
] as const;

interface ExcludedTableSnapshot {
  count: number;
  digest: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const disposableDatabase =
    requireExperimentFoundationD19DisposableDatabaseIdentity(process.env);
  const outputRelativePath = path.relative(REPO_ROOT, args.outputPath);
  const prisma = new PrismaClient({
    datasources: { db: { url: disposableDatabase.databaseUrl } },
  });
  const app = Fastify({ logger: false });
  const externalRequestProbe = installExternalRequestProbe();

  try {
    await prisma.$connect();
    await assertFreshDisposableDatabase(prisma, disposableDatabase);
    await seedLegacySentinels(prisma);
    const legacyBefore = await legacyCensus(prisma);
    const excludedBefore = await excludedCensus(prisma);

    const clock = deterministicClock();
    const idFactory = deterministicIdFactory();
    const efAssetRepository = new PrismaExperimentFoundationV2Repository(prisma);
    const efAssetService = new ExperimentFoundationV2Service(efAssetRepository, {
      now: clock,
      idGenerator: (kind) => idFactory(`ef_asset_${kind}`),
    });
    const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const efSpineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
    const cycleClosureLookup = new PrismaPaperImplementationValidationCycleClosureV2Repository(
      prisma,
    );
    let admissionEnabled = false;
    const admissionService = new PaperImplementationExperimentV2AdmissionService({
      repository: piRepository,
      scopeReader: {
        async resolveExactScope(implementationProjectId, validationCycleId) {
          if (
            implementationProjectId === 'd19-implementation-project'
            && validationCycleId === 'd19-validation-cycle'
          ) {
            return {
              implementation_project_id: implementationProjectId,
              validation_cycle_id: validationCycleId,
              implementation_project_lifecycle_status: 'active',
              validation_cycle_lifecycle_status: 'admitted',
            };
          }
          return null;
        },
      },
      admissionEnabled: () => admissionEnabled,
      cycleClosureLookup,
      serverActorId: SERVER_ACTOR,
      idFactory,
      now: clock,
    });
    const readinessResolver: ExperimentFoundationV2ReadinessResolver = {
      async resolvePassedExactReadiness(input) {
        const result = await efAssetService.revalidateReadiness({
          target: input.target,
          readiness_attestation_id: input.readiness_attestation_id,
          expected_dependencies: input.ordered_dependencies,
        });
        if (
          result.attestation.attestation_hash !== input.readiness_attestation_hash
          || result.attestation.status !== 'passed'
        ) {
          return null;
        }
        return {
          attestation: result.attestation,
          ordered_dependencies: result.dependencies.map((row) => row.dependency),
        };
      },
    };
    const materializationService = new ExperimentFoundationV2MaterializationService({
      repository: efSpineRepository,
      readinessResolver,
      cycleClosureLookup,
      idFactory,
      now: clock,
    });
    const headService = new PaperImplementationExperimentV2HeadService({
      repository: piRepository,
      cycleClosureLookup,
      idFactory,
      now: clock,
    });
    const acknowledgementService = new ExperimentFoundationV2AcknowledgementService({
      repository: efSpineRepository,
      idFactory,
      now: clock,
    });

    await registerPaperImplementationExperimentV2Routes(
      app,
      new PaperImplementationExperimentV2Controller(admissionService),
    );
    await app.ready();

    // A01 precedes every v2 fixture write and proves the route guard performs
    // no repository read/write and never invokes a legacy writer.
    const offBefore = await v2Census(prisma);
    assertPackBZeroCensus(offBefore);
    const legacyOffBefore = await legacyCensus(prisma);
    const offResponse = await app.inject({
      method: 'POST',
      url: ADMISSION_PATH,
      payload: capabilityOffRequest(),
    });
    assert.equal(offResponse.statusCode, 409);
    assert.equal(offResponse.json().error?.details?.reason_code, 'PI_EXPERIMENT_V2_ADMISSION_DISABLED');
    assert.deepEqual(await v2Census(prisma), offBefore);
    assert.deepEqual(await legacyCensus(prisma), legacyOffBefore);

    const sourcePolicyAttestation = await loadD19SourcePolicyAttestation();
    let fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>;
    let fixtureImportConcurrency;
    if (sourcePolicyAttestation) {
      // Exercise the restart-safe importer against real PostgreSQL
      // concurrency, not only the globally serialized in-memory repository
      // used by unit tests.
      const [leftImport, rightImport] = await Promise.all([
        importExperimentFoundationD19TypedFixture(efAssetRepository, sourcePolicyAttestation),
        importExperimentFoundationD19TypedFixture(efAssetRepository, sourcePolicyAttestation),
      ]);
      fixture = leftImport.fixture;
      assert.deepEqual(
        exactFixtureRefs(rightImport.fixture),
        exactFixtureRefs(fixture),
      );
      assert.equal(
        rightImport.fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
        fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
      );
      const importReplay = await importExperimentFoundationD19TypedFixture(
        efAssetRepository,
        sourcePolicyAttestation,
      );
      assert.deepEqual(importReplay.counters, {
        asset_identities: { created: 0, exact_reused: 23 },
        asset_revisions: { created: 0, exact_reused: 23 },
        lifecycle_events: { created: 0, exact_reused: 48 },
        readiness_attestations: { created: 0, exact_reused: 23 },
      });
      fixtureImportConcurrency = {
        real_postgres_concurrent_imports: 2,
        left: leftImport.counters,
        right: rightImport.counters,
        replay: importReplay.counters,
        exact_ref_convergence: true,
      };
    } else {
      fixture = await buildExperimentFoundationD19TypedFixture(efAssetService, {
        sourcePolicyAttestation,
      });
      fixtureImportConcurrency = {
        real_postgres_concurrent_imports: 0,
        exact_ref_convergence: false,
        reason_code: 'SOURCE_POLICY_UNRESOLVED',
      };
    }
    const datasetPolicyBindings = await d19DatasetPolicyBindings(efAssetService, fixture);
    const transitiveDependencies = fixture.evaluation_protocol_readiness.dependencies.map(
      (row) => row.dependency,
    );
    const orderedDependencies = [fixture.evaluation_protocol, ...transitiveDependencies];
    assert.equal(orderedDependencies.length, 23);
    assert.deepEqual(assetCensus(orderedDependencies), {
      Dataset: 2,
      DataPolicy: 2,
      MetricDefinition: 17,
      Benchmark: 1,
      EvaluationProtocol: 1,
    });

    await verifyA02(efAssetService, fixture.data_policies[0]!, orderedDependencies);
    const a03BeforeAssetCensus = persistedTypedAssetCensus(await v2Census(prisma));
    assert.deepEqual(a03BeforeAssetCensus, {
      identities: {
        Dataset: 2,
        DataPolicy: 2,
        MetricDefinition: 17,
        Benchmark: 1,
        EvaluationProtocol: 1,
      },
      revisions: {
        Dataset: 2,
        DataPolicy: 2,
        MetricDefinition: 17,
        Benchmark: 1,
        EvaluationProtocol: 1,
      },
      freeze_command_receipts: {
        Dataset: 2,
        DataPolicy: 2,
        MetricDefinition: 17,
        Benchmark: 1,
        EvaluationProtocol: 1,
      },
      relational_dependencies: {
        EvaluationProtocolMetricDefinition: 17,
      },
    });
    await assertFreezeCommandReceiptPopulation(prisma, orderedDependencies, false);
    await verifyA03(efAssetService, orderedDependencies);
    const a03AfterAssetCensus = persistedTypedAssetCensus(await v2Census(prisma));
    assert.deepEqual(a03AfterAssetCensus.identities, a03BeforeAssetCensus.identities);
    assert.deepEqual(a03AfterAssetCensus.revisions, a03BeforeAssetCensus.revisions);
    assert.deepEqual(a03AfterAssetCensus.freeze_command_receipts, {
      Dataset: 3,
      DataPolicy: 3,
      MetricDefinition: 18,
      Benchmark: 2,
      EvaluationProtocol: 2,
    });
    assert.deepEqual(
      a03AfterAssetCensus.relational_dependencies,
      a03BeforeAssetCensus.relational_dependencies,
    );
    await assertFreezeCommandReceiptPopulation(prisma, orderedDependencies, true);
    await verifyA04PositiveAndDrift(efAssetService, fixture.evaluation_protocol, fixture);

    const admissionRequest = d19AdmissionRequest(
      fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
      fixture.evaluation_protocol_readiness.attestation.attestation_hash,
      orderedDependencies,
      fixture.metric_definitions.slice(0, 7),
    );

    admissionEnabled = true;
    const callerHashBefore = await v2Census(prisma);
    const callerHashResponse = await app.inject({
      method: 'POST',
      url: ADMISSION_PATH,
      payload: { ...admissionRequest, approved_plan_hash: HASH },
    });
    assert.equal(callerHashResponse.statusCode, 400);
    assert.equal(callerHashResponse.json().error?.details?.reason_code, 'V2_TYPED_SNAPSHOT_INVALID');
    assert.deepEqual(await v2Census(prisma), callerHashBefore);

    const t1Before = await v2Census(prisma);
    await withFailingInsertTrigger(
      prisma,
      'PaperImplementationExperimentIntegrationOutboxV2',
      'd19_fail_t1_outbox',
      async () => {
        const failed = await app.inject({
          method: 'POST',
          url: ADMISSION_PATH,
          payload: admissionRequest,
        });
        assert.equal(failed.statusCode, 500);
      },
    );
    assert.deepEqual(await v2Census(prisma), t1Before, 'T1 partial rows survived rollback');

    const concurrentAdmissionResponses = await Promise.all([
      app.inject({
        method: 'POST',
        url: ADMISSION_PATH,
        payload: admissionRequest,
      }),
      app.inject({
        method: 'POST',
        url: ADMISSION_PATH,
        payload: admissionRequest,
      }),
    ]);
    for (const response of concurrentAdmissionResponses) {
      assert.equal(response.statusCode, 201);
    }
    const concurrentAdmissions = concurrentAdmissionResponses.map(
      (response) => response.json() as PaperImplementationExperimentV2AdmissionResponse,
    );
    const freshAdmissions = concurrentAdmissions.filter((response) => !response.replayed);
    const replayedAdmissions = concurrentAdmissions.filter((response) => response.replayed);
    assert.equal(freshAdmissions.length, 1);
    assert.equal(replayedAdmissions.length, 1);
    const admitted = freshAdmissions[0]!;
    const concurrentReplay = replayedAdmissions[0]!;
    assert.deepEqual(concurrentReplay.branch, admitted.branch);
    assert.deepEqual(concurrentReplay.revision, admitted.revision);
    assert.deepEqual(concurrentReplay.admission, admitted.admission);
    assert.deepEqual(concurrentReplay.cells, admitted.cells);
    assert.equal(concurrentReplay.branch.branch_id, admitted.branch.branch_id);
    assert.equal(
      concurrentReplay.revision.work_order_revision_id,
      admitted.revision.work_order_revision_id,
    );
    assert.equal(concurrentReplay.admission.admission_id, admitted.admission.admission_id);
    assert.equal(admitted.cells.length, 2);

    const t1CommittedCensus = await v2Census(prisma);
    assert.deepEqual(t1CommittedCensus.pi, {
      ...t1Before.pi,
      work_order_branch: t1Before.pi.work_order_branch + 1,
      work_order_revision: t1Before.pi.work_order_revision + 1,
      work_order_revision_cell: t1Before.pi.work_order_revision_cell + 2,
      admission: t1Before.pi.admission + 1,
      integration_outbox: t1Before.pi.integration_outbox + 1,
    });
    assert.deepEqual(t1CommittedCensus.ef, t1Before.ef);
    const t1Replay = await app.inject({
      method: 'POST',
      url: ADMISSION_PATH,
      payload: admissionRequest,
    });
    assert.equal(t1Replay.statusCode, 201);
    assert.equal(t1Replay.json().replayed, true);
    assert.deepEqual(await v2Census(prisma), t1CommittedCensus);

    const changedReplay = structuredClone(admissionRequest);
    changedReplay.exact_cells[0]!.parameters[0]!.value = 999;
    const changedReplayResponse = await app.inject({
      method: 'POST',
      url: ADMISSION_PATH,
      payload: changedReplay,
    });
    assert.equal(changedReplayResponse.statusCode, 409);
    assert.equal(
      changedReplayResponse.json().error?.details?.reason_code,
      'ADMISSION_IDEMPOTENCY_CONFLICT',
    );
    assert.deepEqual(await v2Census(prisma), t1CommittedCensus);

    const admittedBundle = await piRepository.findRevisionBundle(
      admitted.branch.branch_id,
      admitted.revision.work_order_revision_id,
    );
    assert.ok(admittedBundle);
    const admittedOutboxEvent = admittedBundle.outbox.event;
    assert.equal(admittedOutboxEvent.event_type, 'WorkOrderRevisionAdmitted');
    const admittedEvent = admittedOutboxEvent as WorkOrderRevisionAdmittedEventV1;

    // Intake is disabled immediately after T1. The same materializer/head/ack
    // consumers and relay continue without consulting this capability.
    admissionEnabled = false;
    const disabledMidSagaBefore = await v2Census(prisma);
    const secondAdmission = await app.inject({
      method: 'POST',
      url: ADMISSION_PATH,
      payload: { ...admissionRequest, business_idempotency_key: 'd19-second-admission-blocked' },
    });
    assert.equal(secondAdmission.statusCode, 409);
    assert.equal(
      secondAdmission.json().error?.details?.reason_code,
      'PI_EXPERIMENT_V2_ADMISSION_DISABLED',
    );
    assert.deepEqual(await v2Census(prisma), disabledMidSagaBefore);

    const t2Before = materializationCensus(await v2Census(prisma));
    await withFailingInsertTrigger(
      prisma,
      'ExperimentFoundationIntegrationOutboxV2',
      'd19_fail_t2_outbox',
      async () => {
        await assert.rejects(() => materializationService.consume(admittedEvent));
      },
    );
    assert.deepEqual(
      materializationCensus(await v2Census(prisma)),
      t2Before,
      'T2 partial rows survived rollback',
    );
    const materialization = await materializationService.consume(admittedEvent);
    const runFrozenEvent = materialization.outbox.event;

    const t3Before = await t3State(prisma, admitted.branch.branch_id);
    await withFailingInsertTrigger(
      prisma,
      'PaperImplementationExperimentIntegrationOutboxV2',
      'd19_fail_t3_outbox',
      async () => {
        await assert.rejects(() => headService.consume(runFrozenEvent));
      },
    );
    assert.deepEqual(
      await t3State(prisma, admitted.branch.branch_id),
      t3Before,
      'T3 branch/inbox partial rows survived rollback',
    );

    const relay = new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: piRepository,
      experimentFoundationRepository: efSpineRepository,
      materializationConsumer: materializationService,
      headConsumer: headService,
      acknowledgementConsumer: acknowledgementService,
      workerId: 'd19-relay',
      now: clock,
      leaseDurationMs: 30_000,
      retryDelayMs: 0,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
    assert.equal(relayOutcome.idle, true);
    assert.equal(relayOutcome.failures.length, 0);
    assert.equal(relayOutcome.delivered, 3);

    const finalBranch = await piRepository.findBranch(
      admitted.branch.implementation_project_id,
      admitted.branch.validation_cycle_id,
      admitted.branch.branch_key,
    );
    assert.ok(finalBranch);
    assert.equal(finalBranch.head_run_id, materialization.run.run_id);
    assert.equal(finalBranch.head_run_manifest_hash, materialization.run.run_manifest_hash);

    const branchHeadAdvancedEvent = await loadStoredEvent<BranchHeadAdvancedEventV1>(
      prisma,
      'PaperImplementation',
      'BranchHeadAdvanced',
    );
    const acknowledgement = await efSpineRepository.findInboxByEvent(
      ACKNOWLEDGEMENT_CONSUMER,
      branchHeadAdvancedEvent.event_id,
    );
    assert.ok(acknowledgement);
    assert.equal(acknowledgement.outcome, 'processed');

    const replayBefore = await v2Census(prisma);
    await materializationService.consume(admittedEvent);
    await headService.consume(runFrozenEvent);
    await acknowledgementService.consume(branchHeadAdvancedEvent);
    assert.deepEqual(await v2Census(prisma), replayBefore);

    const b06 = await verifyB06(
      prisma,
      piRepository,
      efSpineRepository,
      headService,
      acknowledgementService,
      runFrozenEvent,
      branchHeadAdvancedEvent,
      finalBranch,
      idFactory,
      clock,
    );
    const b07Negatives = await verifyB07Negatives(
      piRepository,
      headService,
      runFrozenEvent,
    );
    await verifyB07Positive(prisma, admitted, materialization, orderedDependencies);

    // Revocation is deliberately tested after the T4 acknowledgement so the
    // negative readiness probe cannot be mistaken for source-policy evidence
    // or become an input to the successful saga.
    await efAssetService.appendLifecycleEvent({
      asset: fixture.metric_definitions[0]!,
      expected_projection_state_version: 2,
      event_type: 'revoked',
      reason_code: 'D19_POST_SAGA_REVOCATION_PROBE',
    });
    await expectReason(
      () => efAssetService.revalidateReadiness({
        target: fixture.evaluation_protocol,
        readiness_attestation_id:
          fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
        expected_dependencies: transitiveDependencies,
      }),
      'READINESS_DEPENDENCY_DRIFT',
    );

    const legacyAfter = await legacyCensus(prisma);
    assert.deepEqual(legacyAfter, legacyBefore);
    const excludedAfter = await excludedCensus(prisma);
    const excludedWriteCensus = excludedDelta(
      excludedBefore,
      excludedAfter,
      externalRequestProbe.fetchCallCount(),
    );
    assert.equal(excludedWriteCensus.total_write_delta, 0);
    assert.equal(excludedWriteCensus.changed_table_count, 0);
    assert.equal(excludedWriteCensus.external_request_probe.fetch_call_count, 0);
    const b09 = await verifyB09StaticBoundaries();
    const finalCensus = await v2Census(prisma);
    const packBZeroCensus = assertPackBZeroCensus(finalCensus);
    const persistedAssetCensus = persistedTypedAssetCensus(finalCensus);
    assert.deepEqual(persistedAssetCensus.identities, {
      Dataset: 2,
      DataPolicy: 2,
      MetricDefinition: 17,
      Benchmark: 1,
      EvaluationProtocol: 1,
    });
    assert.deepEqual(persistedAssetCensus.revisions, persistedAssetCensus.identities);
    assert.deepEqual(persistedAssetCensus.freeze_command_receipts, {
      Dataset: 3,
      DataPolicy: 3,
      MetricDefinition: 18,
      Benchmark: 2,
      EvaluationProtocol: 2,
    });
    assert.deepEqual(persistedAssetCensus.relational_dependencies, {
      EvaluationProtocolMetricDefinition: 17,
    });

    const acknowledgementRows = await prisma.experimentFoundationIntegrationInboxV2.count({
      where: { consumerName: ACKNOWLEDGEMENT_CONSUMER },
    });
    assert.equal(acknowledgementRows, 1);
    const acknowledgementOutboxRows = await prisma.experimentFoundationIntegrationOutboxV2.count({
      where: { eventType: 'BranchHeadAdvanced' },
    });
    assert.equal(acknowledgementOutboxRows, 0);

    const migrationDigest = await sha256File(MIGRATION_PATH);
    const checks = createChecks(outputRelativePath, {
      A01: 'Default-off admission returned PI_EXPERIMENT_V2_ADMISSION_DISABLED with zero DB delta.',
      A02: 'Five typed families server-hashed exactly; caller hash and exact-ref tamper were rejected.',
      A03: 'All five families rejected stale draft CAS; a second command key added one receipt per family while exact freeze replay added no revision.',
      A04: 'Exact target plus ordered 22 dependency readiness and 17 relational Protocol metric bindings passed; drift/latest/revocation failed.',
      B01: 'Injected final PI outbox failure rolled back branch, revision, cells, admission, and event.',
      B02: 'Injected final EF outbox failure rolled back inbox and the complete materialization lineage.',
      B03: 'Injected final PI head outbox failure rolled back inbox and head CAS.',
      B04: 'Exactly one processed EF BranchHeadAdvanced inbox is the durable acknowledgement.',
      B05: 'Two concurrent real-Postgres admissions returned one commit plus one exact replay with a single authority census; sequential T1-T4 replay also converged.',
      B06: `stale=${b06.stale}; same_sequence=${b06.same_sequence}; missing=${b06.missing}; payload=${b06.payload}.`,
      B07: `One 2-cell Run matched exactly; negative parity outcomes: ${b07Negatives.join(', ')}.`,
      B08: 'All five legacy digests and every non-v2 application-table digest were identical; instrumented fetch count was zero.',
      B09: `Static boundary census passed: ${JSON.stringify(b09)}.`,
      B10: 'Admission disabled after T1; relay still delivered all three events through T4 and rejected new intake.',
    });

    const evidence = {
      status: 'passed',
      database_safety: {
        explicit_d19_url_required: true,
        database_url_match_required: true,
        loopback_host_required: true,
        randomized_database_name_required: true,
        server_nonce_marker_required: true,
        database_name: disposableDatabase.databaseName,
        database_marker_sha256: `sha256:${crypto
          .createHash('sha256')
          .update(disposableDatabase.marker)
          .digest('hex')}`,
        database_url_stored: false,
      },
      fixture: {
        source_policy_evidence: sourcePolicyAttestation ? {
          mode: 'attested',
          attestation_digest:
            digestExperimentFoundationD19SourcePolicyAttestation(sourcePolicyAttestation),
          bindings: datasetPolicyBindings,
        } : {
          mode: 'synthetic_unresolved',
        },
        asset_census: assetCensus(orderedDependencies),
        importer_concurrency: fixtureImportConcurrency,
        persisted_asset_census: persistedAssetCensus,
        datasets: fixture.datasets.map(exactRefEvidence),
        data_policies: fixture.data_policies.map(exactRefEvidence),
        dataset_policy_bindings: datasetPolicyBindings,
        evaluation_protocol: exactRefEvidence(fixture.evaluation_protocol),
        readiness: {
          readiness_attestation_id:
            fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
          readiness_attestation_hash:
            fixture.evaluation_protocol_readiness.attestation.attestation_hash,
          dependency_manifest_hash:
            fixture.evaluation_protocol_readiness.attestation.dependency_manifest_hash,
          ordered_transitive_dependency_count: transitiveDependencies.length,
        },
        work_order_revision_id: admitted.revision.work_order_revision_id,
        work_order_revision_hash: admitted.revision.content_hash,
        admitted_cells: admitted.cells.map((cell) => ({
          ordinal: cell.ordinal,
          work_order_cell_id: cell.work_order_cell_id,
          cell_key: cell.cell_key,
          cell_hash: cell.cell_hash,
        })),
        version_lock_id: materialization.version_lock.version_lock_id,
        version_lock_hash: materialization.version_lock.lock_hash,
        run_recipe_id: materialization.run_recipe.run_recipe_id,
        run_recipe_hash: materialization.run_recipe.recipe_hash,
        task_specs: materialization.task_specs.map((task) => ({
          training_task_spec_id: task.training_task_spec_id,
          training_task_spec_hash: task.task_spec_hash,
        })),
        run_id: materialization.run.run_id,
        run_manifest_hash: materialization.run.run_manifest_hash,
        branch_id: finalBranch.branch_id,
        acknowledgement_inbox_id: acknowledgement.inbox_id,
      },
      four_uow_outcomes: [
        { uow: 'T1_PI_ADMISSION', rollback_probe: 'passed', outcome: 'committed' },
        { uow: 'T2_EF_MATERIALIZATION', rollback_probe: 'passed', outcome: 'committed' },
        { uow: 'T3_PI_HEAD_CAS', rollback_probe: 'passed', outcome: 'committed' },
        { uow: 'T4_EF_ACKNOWLEDGEMENT', rollback_probe: 'single_receipt_only', outcome: 'committed' },
      ],
      three_event_outcomes: [
        await eventEvidence(prisma, 'PaperImplementation', admittedEvent),
        await eventEvidence(prisma, 'ExperimentFoundation', runFrozenEvent),
        await eventEvidence(prisma, 'PaperImplementation', branchHeadAdvancedEvent),
      ],
      legacy_before: legacyBefore,
      legacy_after: legacyAfter,
      v2_write_census: finalCensus,
      pack_b_zero_census: packBZeroCensus,
      excluded_write_census: excludedWriteCensus,
      migration_digest: migrationDigest,
      checks,
    };

    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify({ status: 'passed', output: outputRelativePath })}\n`);
  } finally {
    externalRequestProbe.restore();
    await app.close();
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): ScriptArgs {
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      output = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!output) {
    throw new Error('--output is required');
  }
  const outputPath = path.resolve(REPO_ROOT, output);
  if (!outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('Output must be below .ai/.tmp/experiment-foundation-productization/');
  }
  return { outputPath };
}

function installExternalRequestProbe() {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('D19_EXTERNAL_REQUEST_BLOCKED');
  }) as typeof fetch;
  return {
    fetchCallCount: () => fetchCalls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

async function assertFreshDisposableDatabase(
  prisma: PrismaClient,
  expected: ExperimentFoundationD19DisposableDatabaseIdentity,
): Promise<void> {
  const identity = await prisma.$queryRaw<Array<{
    database_name: string;
    schema_name: string;
    database_marker: string | null;
  }>>`
    SELECT current_database() AS database_name,
           current_schema() AS schema_name,
           pg_catalog.shobj_description(database_row.oid, 'pg_database') AS database_marker
    FROM pg_catalog.pg_database AS database_row
    WHERE database_row.datname = current_database()
  `;
  if (
    identity.length !== 1
    || identity[0]?.database_name !== expected.databaseName
    || identity[0]?.schema_name !== 'public'
    || identity[0]?.database_marker !== expected.marker
  ) {
    throw new Error('D-19 PostgreSQL disposable database identity marker mismatch');
  }
  const v2 = await v2Census(prisma);
  assert.equal(sumNestedCounts(v2), 0, 'D-19 database already contains v2 rows');
  const legacy = await legacyCensus(prisma);
  assert.equal(legacy.aggregate_count, 0, 'D-19 database already contains legacy rows');
}

function deterministicClock(): () => string {
  let tick = 0;
  const base = Date.parse('2026-07-13T08:00:00.000Z');
  return () => new Date(base + tick++ * 1_000).toISOString();
}

function deterministicIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${String(next).padStart(4, '0')}`;
  };
}

function capabilityOffRequest(): PaperImplementationExperimentV2AdmissionRequest {
  return {
    branch_key: 'capability-off-probe',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'Capability off probe',
      scientific_intent: 'Prove default-off zero-write behavior.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'Capability off probe',
      objective: 'Must be rejected before every repository read or write.',
      readiness_attestation_id: 'not-read',
      readiness_attestation_hash: HASH,
      asset_dependencies: [{
        asset_type: 'EvaluationProtocol',
        logical_id: 'not-read',
        revision_id: 'not-read',
        revision_sequence: 1,
        content_hash: HASH,
      }],
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 1 },
    },
    exact_cells: [{
      cell_key: 'not-read',
      seed: 1,
      repeat_index: 0,
      parameters: [],
      required_result_contract: { metrics: [], artifacts: [] },
    }],
    business_idempotency_key: 'capability-off-zero-write',
  };
}

function d19AdmissionRequest(
  readinessAttestationId: string,
  readinessAttestationHash: string,
  dependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
  activeMetrics: ExperimentFoundationV2ExactAssetRevisionRef[],
): PaperImplementationExperimentV2AdmissionRequest {
  const requiredResultContract = {
    metrics: activeMetrics.map((metric) => {
      assert.equal(metric.asset_type, 'MetricDefinition');
      return {
        metric_definition: { ...metric, asset_type: 'MetricDefinition' as const },
        required_cardinality: 1,
      };
    }),
    artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
  };
  return {
    branch_key: 'ragperf-primary',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'RAGPerf primary branch',
      scientific_intent: 'Measure an exact two-cell RAG evaluation plan.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'RAGPerf adapter-tier evaluation',
      objective: 'Freeze the exact D-19 two-cell authority lineage without execution.',
      readiness_attestation_id: readinessAttestationId,
      readiness_attestation_hash: readinessAttestationHash,
      asset_dependencies: dependencies,
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 300 },
    },
    exact_cells: [
      {
        cell_key: 'retriever-top-k-5',
        seed: 7,
        repeat_index: 0,
        parameters: [{ name: 'retriever_top_k', value: 5 }],
        required_result_contract: requiredResultContract,
      },
      {
        cell_key: 'retriever-top-k-10',
        seed: 11,
        repeat_index: 0,
        parameters: [{ name: 'retriever_top_k', value: 10 }],
        required_result_contract: requiredResultContract,
      },
    ],
    business_idempotency_key: 'd19-admit-ragperf-primary-r1',
  };
}

async function verifyA02(
  service: ExperimentFoundationV2Service,
  policyRef: ExperimentFoundationV2ExactAssetRevisionRef,
  refs: ExperimentFoundationV2ExactAssetRevisionRef[],
): Promise<void> {
  for (const ref of refs) {
    const revision = await service.getExactAssetRevision(ref);
    assert.equal(revision.revision.content_hash, ref.content_hash);
    assert.match(ref.content_hash, HASH_PATTERN);
  }
  const policy = await service.getExactAssetRevision(policyRef);
  assert.equal(policy.asset_type, 'DataPolicy');
  const expectedHash = serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationDataPolicyRevisionV2',
    schema_version: 'v1',
    hash_profile: 'ef-asset-semantic-json@v1',
    content: policy.revision.data_policy_revision,
  });
  assert.equal(expectedHash, policyRef.content_hash);
  await expectReason(
    () => service.createAssetDraft({
      asset_type: 'DataPolicy',
      logical_id: 'd19-caller-hash-probe',
      draft_content: policy.revision.data_policy_revision,
      content_hash: HASH,
    } as ExperimentFoundationV2CreateAssetDraftInput),
    'SERVER_CANONICAL_HASH_MISMATCH',
  );
  await expectReason(
    () => service.getExactAssetRevision({ ...policyRef, content_hash: HASH }),
    'EXACT_REVISION_NOT_FOUND',
  );
}

async function verifyA03(
  service: ExperimentFoundationV2Service,
  refs: ExperimentFoundationV2ExactAssetRevisionRef[],
): Promise<void> {
  const representatives = ['Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol']
    .map((assetType) => refs.find((ref) => ref.asset_type === assetType))
    .filter((ref): ref is ExperimentFoundationV2ExactAssetRevisionRef => ref !== undefined);
  assert.equal(representatives.length, 5);
  for (const ref of representatives) {
    const revision = await service.getExactAssetRevision(ref);
    await expectReason(
      () => service.updateAssetDraft({
        ...draftInputFromRevision(revision),
        expected_state_version: 1,
      }),
      'ASSET_DRAFT_CAS_CONFLICT',
    );
    const replay = await service.freezeAssetDraft({
      asset_type: ref.asset_type,
      logical_id: ref.logical_id,
      expected_state_version: 2,
      business_idempotency_key: `d19-freeze-second-command:${ref.asset_type}:${ref.logical_id}`,
    });
    assert.equal(replay.replayed, true);
    assert.deepEqual(replay.exact_ref, ref);
  }
}

interface FreezeCommandReceiptRow {
  asset_type: ExperimentFoundationV2ExactAssetRevisionRef['asset_type'];
  logical_id: string;
  business_idempotency_key: string;
  revision_id: string;
  content_hash: string;
}

async function assertFreezeCommandReceiptPopulation(
  prisma: PrismaClient,
  refs: ExperimentFoundationV2ExactAssetRevisionRef[],
  includeSecondCommand: boolean,
): Promise<void> {
  const [datasets, policies, metrics, benchmarks, protocols] = await Promise.all([
    prisma.experimentFoundationDatasetFreezeCommandReceiptV2.findMany({
      select: {
        datasetId: true,
        businessIdempotencyKey: true,
        revisionId: true,
        contentHash: true,
      },
    }),
    prisma.experimentFoundationDataPolicyFreezeCommandReceiptV2.findMany({
      select: {
        dataPolicyId: true,
        businessIdempotencyKey: true,
        revisionId: true,
        contentHash: true,
      },
    }),
    prisma.experimentFoundationMetricDefinitionFreezeCommandReceiptV2.findMany({
      select: {
        metricDefinitionId: true,
        businessIdempotencyKey: true,
        revisionId: true,
        contentHash: true,
      },
    }),
    prisma.experimentFoundationBenchmarkFreezeCommandReceiptV2.findMany({
      select: {
        benchmarkId: true,
        businessIdempotencyKey: true,
        revisionId: true,
        contentHash: true,
      },
    }),
    prisma.experimentFoundationEvaluationProtocolFreezeCommandReceiptV2.findMany({
      select: {
        evaluationProtocolId: true,
        businessIdempotencyKey: true,
        revisionId: true,
        contentHash: true,
      },
    }),
  ]);
  const rows: FreezeCommandReceiptRow[] = [
    ...datasets.map((row) => ({
      asset_type: 'Dataset' as const,
      logical_id: row.datasetId,
      business_idempotency_key: row.businessIdempotencyKey,
      revision_id: row.revisionId,
      content_hash: row.contentHash,
    })),
    ...policies.map((row) => ({
      asset_type: 'DataPolicy' as const,
      logical_id: row.dataPolicyId,
      business_idempotency_key: row.businessIdempotencyKey,
      revision_id: row.revisionId,
      content_hash: row.contentHash,
    })),
    ...metrics.map((row) => ({
      asset_type: 'MetricDefinition' as const,
      logical_id: row.metricDefinitionId,
      business_idempotency_key: row.businessIdempotencyKey,
      revision_id: row.revisionId,
      content_hash: row.contentHash,
    })),
    ...benchmarks.map((row) => ({
      asset_type: 'Benchmark' as const,
      logical_id: row.benchmarkId,
      business_idempotency_key: row.businessIdempotencyKey,
      revision_id: row.revisionId,
      content_hash: row.contentHash,
    })),
    ...protocols.map((row) => ({
      asset_type: 'EvaluationProtocol' as const,
      logical_id: row.evaluationProtocolId,
      business_idempotency_key: row.businessIdempotencyKey,
      revision_id: row.revisionId,
      content_hash: row.contentHash,
    })),
  ];
  const representativeByFamily = new Map<string, string>();
  for (const ref of refs) {
    if (!representativeByFamily.has(ref.asset_type)) {
      representativeByFamily.set(ref.asset_type, ref.logical_id);
    }
  }
  assert.equal(representativeByFamily.size, 5);
  assert.equal(rows.length, refs.length + (includeSecondCommand ? 5 : 0));
  assert.equal(
    new Set(rows.map((row) => (
      `${row.asset_type}:${row.logical_id}:${row.business_idempotency_key}`
    ))).size,
    rows.length,
  );
  for (const ref of refs) {
    const expectedKeys = [`d19-freeze:${ref.asset_type}:${ref.logical_id}`];
    if (
      includeSecondCommand
      && representativeByFamily.get(ref.asset_type) === ref.logical_id
    ) {
      expectedKeys.push(`d19-freeze-second-command:${ref.asset_type}:${ref.logical_id}`);
    }
    const exactRows = rows.filter((row) => (
      row.asset_type === ref.asset_type && row.logical_id === ref.logical_id
    ));
    assert.deepEqual(
      exactRows.map((row) => row.business_idempotency_key).sort(),
      expectedKeys.sort(),
    );
    for (const row of exactRows) {
      assert.equal(row.revision_id, ref.revision_id);
      assert.equal(row.content_hash, ref.content_hash);
    }
  }
}

async function verifyA04PositiveAndDrift(
  service: ExperimentFoundationV2Service,
  target: ExperimentFoundationV2ExactAssetRevisionRef,
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
): Promise<void> {
  const readinessId = fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id;
  const dependencies = fixture.evaluation_protocol_readiness.dependencies.map((row) => row.dependency);
  const exact = await service.revalidateReadiness({
    target,
    readiness_attestation_id: readinessId,
    expected_dependencies: dependencies,
  });
  assert.equal(exact.attestation.status, 'passed');
  await expectReason(
    () => service.revalidateReadiness({
      target: { ...target, content_hash: HASH },
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies,
    }),
    'READINESS_DEPENDENCY_DRIFT',
  );
  await expectReason(
    () => service.revalidateReadiness({
      target,
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies.slice(1),
    }),
    'READINESS_DEPENDENCY_DRIFT',
  );
  await expectReason(
    () => service.revalidateReadiness({
      target: { asset_type: target.asset_type, logical_id: target.logical_id },
      readiness_attestation_id: readinessId,
      expected_dependencies: dependencies,
    } as Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]),
    'EXACT_REVISION_REQUIRED',
  );
}

function draftInputFromRevision(
  record: ExperimentFoundationV2AssetRevisionRecord,
): ExperimentFoundationV2CreateAssetDraftInput {
  switch (record.asset_type) {
    case 'Dataset':
      return {
        asset_type: 'Dataset',
        logical_id: record.revision.logical_id,
        draft_content: record.revision.dataset_revision,
      };
    case 'DataPolicy':
      return {
        asset_type: 'DataPolicy',
        logical_id: record.revision.logical_id,
        draft_content: record.revision.data_policy_revision,
      };
    case 'MetricDefinition':
      return {
        asset_type: 'MetricDefinition',
        logical_id: record.revision.logical_id,
        draft_content: record.revision.metric_definition_revision,
      };
    case 'Benchmark':
      return {
        asset_type: 'Benchmark',
        logical_id: record.revision.logical_id,
        draft_content: record.revision.benchmark_revision,
      };
    case 'EvaluationProtocol':
      return {
        asset_type: 'EvaluationProtocol',
        logical_id: record.revision.logical_id,
        draft_content: record.revision.evaluation_protocol_revision,
      };
  }
}

async function verifyB06(
  prisma: PrismaClient,
  piRepository: PaperImplementationExperimentSpineV2Repository,
  efRepository: ExperimentFoundationExperimentSpineV2Repository,
  headService: PaperImplementationExperimentV2HeadService,
  acknowledgementService: ExperimentFoundationV2AcknowledgementService,
  runEvent: RunManifestFrozenEventV1,
  acknowledgementEvent: BranchHeadAdvancedEventV1,
  branch: NonNullable<Awaited<ReturnType<PaperImplementationExperimentSpineV2Repository['findBranch']>>>,
  idFactory: (prefix: string) => string,
  now: () => string,
): Promise<Record<string, string>> {
  const staleRepository = proxyRepository(piRepository, {
    async findBranch() {
      return { ...branch, current_admitted_revision_sequence: branch.current_admitted_revision_sequence! + 1 };
    },
  });
  const staleService = new PaperImplementationExperimentV2HeadService({
    repository: staleRepository,
    cycleClosureLookup: new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma),
    idFactory,
    now,
  });
  const staleEvent = cloneRunEvent(runEvent, 'stale-sequence');
  const stale = await staleService.consume(staleEvent);
  assert.equal(stale.inbox.outcome, 'ignored_stale');

  const changedRunEvent = cloneRunEvent(runEvent, 'same-sequence-different-run');
  changedRunEvent.payload.run_id = 'ef_run_v2_conflicting';
  changedRunEvent.payload_hash = serverHashExperimentV2EventPayload(
    'RunManifestFrozen',
    'v1',
    changedRunEvent.payload,
  );
  const changedRunBundle = await piRepository.findRevisionBundle(
    changedRunEvent.branch_id,
    changedRunEvent.work_order_revision_id,
  );
  assert.ok(changedRunBundle);
  assert.deepEqual(
    {
      branch_id: changedRunBundle.branch.branch_id,
      implementation_project_id: changedRunBundle.branch.implementation_project_id,
      validation_cycle_id: changedRunBundle.branch.validation_cycle_id,
      branch_key: changedRunBundle.branch.branch_key,
      revision_sequence: changedRunBundle.revision.revision_sequence,
      revision_hash: changedRunBundle.revision.content_hash,
      cell_plan_hash: changedRunBundle.revision.cell_plan_hash,
      approved_plan_hash: changedRunBundle.revision.approved_plan_hash,
      admission_plan_hash: changedRunBundle.admission.approved_plan_hash,
      source_event_id: changedRunBundle.outbox.event.event_id,
    },
    {
      branch_id: changedRunEvent.branch_id,
      implementation_project_id: changedRunEvent.implementation_project_id,
      validation_cycle_id: changedRunEvent.validation_cycle_id,
      branch_key: changedRunEvent.branch_key,
      revision_sequence: changedRunEvent.branch_revision_sequence,
      revision_hash: changedRunEvent.work_order_revision_hash,
      cell_plan_hash: changedRunEvent.cell_plan_hash,
      approved_plan_hash: changedRunEvent.approved_plan_hash,
      admission_plan_hash: changedRunEvent.approved_plan_hash,
      source_event_id: changedRunEvent.payload.source_event_id,
    },
  );
  const changedRun = await headService.consume(changedRunEvent);
  assert.equal(changedRun.inbox.outcome, 'terminal_conflict');
  assert.equal(changedRun.inbox.reason_code, 'BRANCH_HEAD_SCOPE_CONFLICT');

  const missingBefore = await prisma.paperImplementationExperimentIntegrationInboxV2.count();
  const missingEvent = cloneRunEvent(runEvent, 'missing-prerequisite');
  missingEvent.branch_id = 'missing-branch';
  missingEvent.branch_key = 'missing-branch';
  await expectReason(
    () => headService.consume(missingEvent),
    'INTEGRATION_PREREQUISITE_NOT_READY',
  );
  assert.equal(
    await prisma.paperImplementationExperimentIntegrationInboxV2.count(),
    missingBefore,
  );

  const payloadDrift = structuredClone(runEvent);
  payloadDrift.payload_hash = `sha256:${'0'.repeat(64)}`;
  await expectReason(
    () => headService.consume(payloadDrift),
    'INTEGRATION_EVENT_PAYLOAD_HASH_MISMATCH',
  );

  const eventConflict = structuredClone(acknowledgementEvent);
  eventConflict.payload.branch_state_version += 1;
  eventConflict.payload_hash = serverHashExperimentV2EventPayload(
    'BranchHeadAdvanced',
    'v1',
    eventConflict.payload,
  );
  await expectReason(
    () => acknowledgementService.consume(eventConflict),
    'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
  );

  const ackCount = await efRepository.findInboxByEvent(
    ACKNOWLEDGEMENT_CONSUMER,
    acknowledgementEvent.event_id,
  );
  assert.ok(ackCount);
  return {
    stale: stale.inbox.outcome,
    same_sequence: changedRun.inbox.outcome,
    missing: 'retryable_zero_write',
    payload: 'terminal_conflict',
  };
}

async function verifyB07Negatives(
  repository: PaperImplementationExperimentSpineV2Repository,
  service: PaperImplementationExperimentV2HeadService,
  event: RunManifestFrozenEventV1,
): Promise<string[]> {
  const outcomes: string[] = [];
  const extra = cloneRunEvent(event, 'extra-cell');
  extra.payload.task_spec_bindings.push({
    ...extra.payload.task_spec_bindings[0]!,
    ordinal: 3,
    work_order_cell_id: 'extra-cell',
    cell_key: 'extra-cell',
  });
  rehashRunEvent(extra);
  const extraOutcome = await service.consume(extra);
  assert.equal(extraOutcome.inbox.reason_code, 'RUN_CELL_PARITY_MISMATCH');
  outcomes.push('extra=terminal_conflict');

  const missing = cloneRunEvent(event, 'missing-cell');
  missing.payload.task_spec_bindings = missing.payload.task_spec_bindings.slice(0, 1);
  rehashRunEvent(missing);
  const missingOutcome = await service.consume(missing);
  assert.equal(missingOutcome.inbox.reason_code, 'RUN_CELL_PARITY_MISMATCH');
  outcomes.push('missing=terminal_conflict');

  const substituted = cloneRunEvent(event, 'substituted-cell');
  substituted.payload.task_spec_bindings[0]!.work_order_cell_id = 'substituted-cell';
  rehashRunEvent(substituted);
  const substitutedOutcome = await service.consume(substituted);
  assert.equal(substitutedOutcome.inbox.reason_code, 'RUN_CELL_PARITY_MISMATCH');
  outcomes.push('substituted=terminal_conflict');

  const reordered = cloneRunEvent(event, 'reordered-cells');
  reordered.payload.task_spec_bindings.reverse();
  rehashRunEvent(reordered);
  const reorderedOutcome = await service.consume(reordered);
  assert.equal(reorderedOutcome.inbox.reason_code, 'RUN_CELL_PARITY_MISMATCH');
  outcomes.push('reordered=terminal_conflict');

  const manifest = cloneRunEvent(event, 'changed-manifest');
  manifest.payload.run_manifest_hash = HASH;
  rehashRunEvent(manifest);
  const manifestOutcome = await service.consume(manifest);
  assert.equal(manifestOutcome.inbox.reason_code, 'RUN_MANIFEST_CONFLICT');
  outcomes.push('manifest=terminal_conflict');

  assert.ok(await repository.findInboxByEvent(HEAD_CONSUMER, extra.event_id));
  assert.ok(await repository.findInboxByEvent(HEAD_CONSUMER, missing.event_id));
  return outcomes;
}

async function verifyB07Positive(
  prisma: PrismaClient,
  admission: PaperImplementationExperimentV2AdmissionResponse,
  materialization: Awaited<ReturnType<ExperimentFoundationV2MaterializationService['consume']>>,
  orderedDependencies: ExperimentFoundationV2ExactAssetRevisionRef[],
): Promise<void> {
  assert.equal(await prisma.paperImplementationExperimentWorkOrderRevisionV2.count(), 1);
  assert.equal(await prisma.paperImplementationExperimentWorkOrderRevisionCellV2.count(), 2);
  assert.equal(await prisma.paperImplementationExperimentWorkOrderAdmissionV2.count(), 1);
  assert.equal(await prisma.experimentFoundationVersionLockV2.count(), 1);
  assert.equal(await prisma.experimentFoundationRunRecipeV2.count(), 1);
  assert.equal(await prisma.experimentFoundationTrainingTaskSpecV2.count(), 2);
  assert.equal(await prisma.experimentFoundationRunV2.count(), 1);
  assert.equal(await prisma.experimentFoundationRunCellV2.count(), 2);
  assert.equal(materialization.version_lock_dependencies.length, 23);
  assert.deepEqual(
    materialization.version_lock_dependencies.map((row) => row.dependency),
    orderedDependencies,
  );
  assert.deepEqual(
    materialization.run_cells.map((cell) => cell.external_pi_cell_id),
    admission.cells.map((cell) => cell.work_order_cell_id),
  );
  assert.equal(
    deriveExperimentFoundationV2RunManifestHash(materialization.run_cells),
    materialization.run.run_manifest_hash,
  );
}

function cloneRunEvent(
  event: RunManifestFrozenEventV1,
  suffix: string,
): RunManifestFrozenEventV1 {
  const clone = structuredClone(event);
  clone.event_id = `${event.event_id}:${suffix}`;
  clone.business_idempotency_key = `${event.business_idempotency_key}:${suffix}`;
  clone.occurred_at = new Date(Date.parse(event.occurred_at) + 60_000).toISOString();
  return clone;
}

function rehashRunEvent(event: RunManifestFrozenEventV1): void {
  event.payload_hash = serverHashExperimentV2EventPayload(
    'RunManifestFrozen',
    'v1',
    event.payload,
  );
}

function proxyRepository<T extends object>(target: T, overrides: Partial<T>): T {
  return new Proxy(target, {
    get(object, property, receiver) {
      if (Object.prototype.hasOwnProperty.call(overrides, property)) {
        const override = Reflect.get(overrides, property, receiver) as unknown;
        return typeof override === 'function' ? override.bind(overrides) : override;
      }
      const value = Reflect.get(object, property, receiver) as unknown;
      return typeof value === 'function' ? value.bind(object) : value;
    },
  });
}

async function expectReason(
  operation: () => Promise<unknown>,
  reasonCode: string,
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AppError, `Expected AppError, received ${String(error)}`);
    assert.equal(error.details?.reason_code, reasonCode);
    return true;
  });
}

async function withFailingInsertTrigger(
  prisma: PrismaClient,
  tableName: string,
  triggerName: string,
  operation: () => Promise<void>,
): Promise<void> {
  assert.match(tableName, /^[A-Za-z0-9_]+$/);
  assert.match(triggerName, /^[a-z0-9_]+$/);
  const functionName = `${triggerName}_fn`;
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'D19_INJECTED_OUTBOX_FAILURE'; END; $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "${tableName}" FOR EACH ROW EXECUTE FUNCTION "${functionName}"()`,
  );
  try {
    await operation();
  } finally {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${tableName}"`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
  }
}

async function t3State(prisma: PrismaClient, branchId: string) {
  const branch = await prisma.paperImplementationExperimentWorkOrderBranchV2.findUniqueOrThrow({
    where: { id: branchId },
  });
  return {
    state_version: branch.stateVersion,
    head_version: branch.headVersion,
    head_revision_id: branch.headRevisionId,
    head_run_id: branch.headRunId,
    head_manifest_hash: branch.headRunManifestHash,
    inbox_count: await prisma.paperImplementationExperimentIntegrationInboxV2.count(),
    outbox_count: await prisma.paperImplementationExperimentIntegrationOutboxV2.count(),
  };
}

function materializationCensus(census: V2Census): Record<string, number> {
  return {
    inbox: census.ef.integration_inbox ?? 0,
    version_lock: census.ef.version_lock ?? 0,
    version_lock_dependency: census.ef.version_lock_dependency ?? 0,
    run_recipe: census.ef.run_recipe ?? 0,
    training_task_spec: census.ef.training_task_spec ?? 0,
    run: census.ef.run ?? 0,
    run_cell: census.ef.run_cell ?? 0,
    outbox: census.ef.integration_outbox ?? 0,
  };
}

async function loadStoredEvent<T>(
  prisma: PrismaClient,
  domain: 'PaperImplementation' | 'ExperimentFoundation',
  eventType: string,
): Promise<T> {
  const row = domain === 'PaperImplementation'
    ? await prisma.paperImplementationExperimentIntegrationOutboxV2.findFirstOrThrow({
      where: { eventType },
      orderBy: { occurredAt: 'asc' },
    })
    : await prisma.experimentFoundationIntegrationOutboxV2.findFirstOrThrow({
      where: { eventType },
      orderBy: { occurredAt: 'asc' },
    });
  return reconstructExperimentV2Event(row) as T;
}

async function eventEvidence(
  prisma: PrismaClient,
  domain: 'PaperImplementation' | 'ExperimentFoundation',
  event: WorkOrderRevisionAdmittedEventV1 | RunManifestFrozenEventV1 | BranchHeadAdvancedEventV1,
) {
  const row = domain === 'PaperImplementation'
    ? await prisma.paperImplementationExperimentIntegrationOutboxV2.findFirstOrThrow({
      where: { eventId: event.event_id },
    })
    : await prisma.experimentFoundationIntegrationOutboxV2.findFirstOrThrow({
      where: { eventId: event.event_id },
    });
  const reconstructed = reconstructExperimentV2Event(row);
  assert.equal(
    canonicalizeExperimentV2Json(row.eventPayloadJson),
    canonicalizeExperimentV2Json(event.payload),
    `Stored ${domain} event JSON must contain only the typed payload: ${event.event_id}`,
  );
  const computedPayloadHash = serverHashExperimentV2EventPayload(
    event.event_type,
    event.schema_version,
    row.eventPayloadJson,
  );
  assert.equal(
    computedPayloadHash,
    row.payloadHash,
    `Stored ${domain} event payload hash drifted: ${event.event_id}`,
  );
  assert.equal(
    row.payloadHash,
    event.payload_hash,
    `Stored ${domain} event payload hash differs from the emitted event: ${event.event_id}`,
  );
  const computedEnvelopeHash = serverHashExperimentV2EventEnvelope(reconstructed);
  assert.equal(
    computedEnvelopeHash,
    row.eventEnvelopeHash,
    `Stored ${domain} event envelope hash drifted: ${event.event_id}`,
  );
  assert.equal(
    canonicalizeExperimentV2Json(reconstructed),
    canonicalizeExperimentV2Json(event),
    `Stored ${domain} event envelope drifted: ${event.event_id}`,
  );
  return {
    event_id: event.event_id,
    event_type: event.event_type,
    payload_hash: event.payload_hash,
    event_envelope_hash: row.eventEnvelopeHash,
    payload_only_storage: true,
    payload_hash_verified: true,
    envelope_hash_verified: true,
    owner_domain: domain,
    relay_status: row.relayStatus,
    relay_attempt_count: row.relayAttemptCount,
    delivered: row.deliveredAt !== null,
  };
}

async function seedLegacySentinels(prisma: PrismaClient): Promise<void> {
  const at = new Date('2026-07-13T07:00:00.000Z');
  await prisma.paperImplementationResearchWorkOrder.create({
    data: {
      id: 'd19-legacy-work-order',
      implementationProjectId: 'd19-legacy-project',
      validationCycleId: 'd19-legacy-cycle',
      runType: 'legacy_sentinel',
      workOrderStatus: 'failed',
      runPolicyId: 'legacy-policy',
      retryBudget: 0,
      autotunePolicy: 'disabled',
      runRecipeRef: { id: 'legacy-recipe' },
      runRecipeRefType: 'legacy',
      runRecipeRefId: 'legacy-recipe',
      runRecipeHash: HASH,
      traceManifestId: 'legacy-trace',
      traceManifestRef: { id: 'legacy-trace' },
      createdBy: 'd19-sentinel',
      createdAt: at,
      updatedAt: at,
    },
  });
  await prisma.paperImplementationWorkOrderHarnessRun.create({
    data: {
      id: 'd19-legacy-harness-run',
      implementationProjectId: 'd19-legacy-project',
      workOrderId: 'd19-legacy-work-order',
      runStatus: 'submitted',
      runAttempt: 1,
      idempotencyKey: 'd19-legacy-harness-run',
      externalJobRef: { id: 'legacy-job' },
      externalJobRefType: 'legacy',
      externalJobRefId: 'legacy-job',
      externalJobHash: HASH,
      submittedAt: at,
      createdBy: 'd19-sentinel',
      createdAt: at,
    },
  });
  await prisma.experimentFoundationRecord.create({
    data: {
      id: 'd19-legacy-ef-record',
      recordKind: 'LegacySentinel',
      recordId: 'd19-legacy-ef-record',
      recordHash: HASH,
      status: 'frozen',
      payload: { sentinel: true },
      createdAt: at,
      updatedAt: at,
    },
  });
  await prisma.experimentFoundationReadinessReport.create({
    data: {
      id: 'd19-legacy-readiness',
      targetKind: 'LegacySentinel',
      targetId: 'd19-legacy-ef-record',
      readinessStatus: 'blocked',
      readinessHash: HASH,
      blockers: [{ reason: 'sentinel' }],
      checkedAt: at,
      createdAt: at,
    },
  });
  await prisma.experimentFoundationExternalTrainingJob.create({
    data: {
      id: 'd19-legacy-external-job',
      externalJobId: 'd19-legacy-external-job',
      trainingTaskSpecId: 'legacy-task',
      trainingTaskSpecHash: HASH,
      materializationResultId: 'legacy-materialization',
      materializationResultHash: HASH,
      adapterKind: 'legacy',
      adapterVersion: 'v1',
      platformKind: 'legacy',
      platformId: 'legacy',
      idempotencyKey: 'd19-legacy-external-job',
      externalJobRef: { id: 'd19-legacy-external-job' },
      externalJobHash: HASH,
      jobStatus: 'running',
      submittedAt: at,
      payload: { sentinel: true },
      createdAt: at,
      updatedAt: at,
    },
  });
}

async function legacyCensus(prisma: PrismaClient) {
  const rows = {
    PaperImplementationResearchWorkOrder:
      await prisma.paperImplementationResearchWorkOrder.findMany({ orderBy: { id: 'asc' } }),
    PaperImplementationWorkOrderHarnessRun:
      await prisma.paperImplementationWorkOrderHarnessRun.findMany({ orderBy: { id: 'asc' } }),
    ExperimentFoundationRecord:
      await prisma.experimentFoundationRecord.findMany({ orderBy: { id: 'asc' } }),
    ExperimentFoundationReadinessReport:
      await prisma.experimentFoundationReadinessReport.findMany({ orderBy: { id: 'asc' } }),
    ExperimentFoundationExternalTrainingJob:
      await prisma.experimentFoundationExternalTrainingJob.findMany({ orderBy: { id: 'asc' } }),
  };
  const tables = Object.fromEntries(Object.entries(rows).map(([name, tableRows]) => [name, {
    count: tableRows.length,
    digest: digestJson(tableRows),
  }]));
  return {
    tables,
    aggregate_count: Object.values(rows).reduce((sum, tableRows) => sum + tableRows.length, 0),
    aggregate_digest: digestJson(tables),
  };
}

async function excludedCensus(
  prisma: PrismaClient,
): Promise<Record<string, ExcludedTableSnapshot>> {
  const population = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT tablename AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
      AND right(tablename, 2) <> 'V2'
    ORDER BY tablename
  `;
  const entries: Array<[string, ExcludedTableSnapshot]> = [];
  for (const { table_name: tableName } of population) {
    assert.match(tableName, /^[A-Za-z0-9_]+$/);
    const rows = await prisma.$queryRawUnsafe<Array<{ row_json: unknown }>>(
      `SELECT to_jsonb(t) AS row_json FROM "${tableName}" AS t ORDER BY to_jsonb(t)::text`,
    );
    entries.push([tableName, { count: rows.length, digest: digestJson(rows) }]);
  }
  return Object.fromEntries(entries);
}

function excludedDelta(
  before: Record<string, ExcludedTableSnapshot>,
  after: Record<string, ExcludedTableSnapshot>,
  fetchCallCount: number,
) {
  assert.deepEqual(Object.keys(after), Object.keys(before));
  const tables = Object.fromEntries(Object.keys(before).map((name) => {
    const beforeTable = before[name]!;
    const afterTable = after[name]!;
    return [name, {
      before_count: beforeTable.count,
      after_count: afterTable.count,
      row_count_delta: afterTable.count - beforeTable.count,
      before_digest: beforeTable.digest,
      after_digest: afterTable.digest,
      digest_unchanged: beforeTable.digest === afterTable.digest,
    }];
  }));
  const changedTables = Object.entries(tables)
    .filter(([, row]) => !row.digest_unchanged || row.row_count_delta !== 0)
    .map(([name]) => name);
  return {
    population_rule: 'all public application tables whose names do not end in V2',
    measured_table_count: Object.keys(tables).length,
    tables,
    changed_tables: changedTables,
    changed_table_count: changedTables.length,
    total_write_delta: changedTables.length,
    external_request_probe: {
      fetch_call_count: fetchCallCount,
      blocked_on_first_call: true,
    },
  };
}

async function v2Census(prisma: PrismaClient): Promise<V2Census> {
  const databaseV2Tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT tablename AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename LIKE '%V2'
    ORDER BY tablename ASC
  `;
  assert.deepEqual(
    databaseV2Tables.map((row) => row.table_name),
    [...V2_CENSUS_MODEL_NAMES].sort(),
    'V2 census model population drifted from the disposable database',
  );
  const d19ModelNames = new Set<string>(D19_CENSUS_MODEL_NAMES);
  const laterV2Entries: Array<[string, number]> = [];
  for (const { table_name: tableName } of databaseV2Tables) {
    if (d19ModelNames.has(tableName)) continue;
    assert.match(tableName, /^[A-Za-z0-9_]+V2$/);
    const rows = await prisma.$queryRawUnsafe<Array<{ row_count: bigint }>>(
      `SELECT COUNT(*) AS row_count FROM "${tableName}"`,
    );
    laterV2Entries.push([tableName, Number(rows[0]?.row_count ?? 0)]);
  }
  const counts = await Promise.all([
    prisma.paperImplementationExperimentWorkOrderBranchV2.count(),
    prisma.paperImplementationExperimentWorkOrderRevisionV2.count(),
    prisma.paperImplementationExperimentWorkOrderRevisionCellV2.count(),
    prisma.paperImplementationExperimentWorkOrderAdmissionV2.count(),
    prisma.paperImplementationExperimentIntegrationInboxV2.count(),
    prisma.paperImplementationExperimentIntegrationOutboxV2.count(),
    prisma.experimentFoundationDatasetV2.count(),
    prisma.experimentFoundationDatasetRevisionV2.count(),
    prisma.experimentFoundationDatasetFreezeCommandReceiptV2.count(),
    prisma.experimentFoundationDataPolicyV2.count(),
    prisma.experimentFoundationDataPolicyRevisionV2.count(),
    prisma.experimentFoundationDataPolicyFreezeCommandReceiptV2.count(),
    prisma.experimentFoundationMetricDefinitionV2.count(),
    prisma.experimentFoundationMetricDefinitionRevisionV2.count(),
    prisma.experimentFoundationMetricDefinitionFreezeCommandReceiptV2.count(),
    prisma.experimentFoundationBenchmarkV2.count(),
    prisma.experimentFoundationBenchmarkRevisionV2.count(),
    prisma.experimentFoundationBenchmarkFreezeCommandReceiptV2.count(),
    prisma.experimentFoundationEvaluationProtocolV2.count(),
    prisma.experimentFoundationEvaluationProtocolRevisionV2.count(),
    prisma.experimentFoundationEvaluationProtocolFreezeCommandReceiptV2.count(),
    prisma.experimentFoundationEvaluationProtocolMetricDependencyV2.count(),
    prisma.experimentFoundationAssetLifecycleEventV2.count(),
    prisma.experimentFoundationAssetLifecycleProjectionV2.count(),
    prisma.experimentFoundationReadinessAttestationV2.count(),
    prisma.experimentFoundationReadinessDependencyV2.count(),
    prisma.experimentFoundationVersionLockV2.count(),
    prisma.experimentFoundationVersionLockDependencyV2.count(),
    prisma.experimentFoundationRunRecipeV2.count(),
    prisma.experimentFoundationTrainingTaskSpecV2.count(),
    prisma.experimentFoundationRunV2.count(),
    prisma.experimentFoundationRunCellV2.count(),
    prisma.experimentFoundationIntegrationInboxV2.count(),
    prisma.experimentFoundationIntegrationOutboxV2.count(),
    prisma.experimentFoundationProviderPayloadV2.count(),
    prisma.experimentFoundationExecutionAttemptV2.count(),
    prisma.experimentFoundationExecutionAttemptEventV2.count(),
    prisma.experimentFoundationProviderCommandV2.count(),
    prisma.experimentFoundationCollectionAttemptV2.count(),
    prisma.experimentFoundationProvisionalOutputV2.count(),
  ]);
  const [
    branch, revision, cell, admission, piInbox, piOutbox,
    dataset, datasetRevision, datasetFreezeReceipt,
    policy, policyRevision, policyFreezeReceipt,
    metric, metricRevision, metricFreezeReceipt,
    benchmark, benchmarkRevision, benchmarkFreezeReceipt,
    protocol, protocolRevision, protocolFreezeReceipt, protocolMetricDependency,
    lifecycleEvent, lifecycleProjection, readiness, readinessDependency,
    versionLock, versionLockDependency, runRecipe, taskSpec, run, runCell,
    efInbox, efOutbox, providerPayload, executionAttempt, executionAttemptEvent,
    providerCommand, collectionAttempt, provisionalOutput,
  ] = counts;
  assert.equal(counts.length, D19_CENSUS_MODEL_NAMES.length);
  return {
    pi: {
      work_order_branch: branch!,
      work_order_revision: revision!,
      work_order_revision_cell: cell!,
      admission: admission!,
      integration_inbox: piInbox!,
      integration_outbox: piOutbox!,
    },
    ef: {
      dataset_identity: dataset!,
      dataset_revision: datasetRevision!,
      dataset_freeze_command_receipt: datasetFreezeReceipt!,
      data_policy_identity: policy!,
      data_policy_revision: policyRevision!,
      data_policy_freeze_command_receipt: policyFreezeReceipt!,
      metric_definition_identity: metric!,
      metric_definition_revision: metricRevision!,
      metric_definition_freeze_command_receipt: metricFreezeReceipt!,
      benchmark_identity: benchmark!,
      benchmark_revision: benchmarkRevision!,
      benchmark_freeze_command_receipt: benchmarkFreezeReceipt!,
      evaluation_protocol_identity: protocol!,
      evaluation_protocol_revision: protocolRevision!,
      evaluation_protocol_freeze_command_receipt: protocolFreezeReceipt!,
      evaluation_protocol_metric_dependency: protocolMetricDependency!,
      lifecycle_event: lifecycleEvent!,
      lifecycle_projection: lifecycleProjection!,
      readiness_attestation: readiness!,
      readiness_dependency: readinessDependency!,
      version_lock: versionLock!,
      version_lock_dependency: versionLockDependency!,
      run_recipe: runRecipe!,
      training_task_spec: taskSpec!,
      run: run!,
      run_cell: runCell!,
      integration_inbox: efInbox!,
      integration_outbox: efOutbox!,
      provider_payload: providerPayload!,
      execution_attempt: executionAttempt!,
      execution_attempt_event: executionAttemptEvent!,
      provider_command: providerCommand!,
      collection_attempt: collectionAttempt!,
      provisional_output: provisionalOutput!,
    },
    later_v2: Object.fromEntries(laterV2Entries),
  };
}

function assertPackBZeroCensus(census: V2Census) {
  const packB = {
    provider_payload: census.ef.provider_payload,
    execution_attempt: census.ef.execution_attempt,
    execution_attempt_event: census.ef.execution_attempt_event,
    provider_command: census.ef.provider_command,
    collection_attempt: census.ef.collection_attempt,
    provisional_output: census.ef.provisional_output,
  };
  assert.deepEqual(packB, {
    provider_payload: 0,
    execution_attempt: 0,
    execution_attempt_event: 0,
    provider_command: 0,
    collection_attempt: 0,
    provisional_output: 0,
  }, 'Pack A D-19 run must not write any Pack B provider-control lineage');
  return packB;
}

async function verifyB09StaticBoundaries() {
  const [schema, migration, piRepository, efRepository] = await Promise.all([
    fs.readFile(path.join(REPO_ROOT, 'prisma/schema.prisma'), 'utf8'),
    fs.readFile(MIGRATION_PATH, 'utf8'),
    fs.readFile(
      path.join(
        REPO_ROOT,
        'apps/backend/src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.ts',
      ),
      'utf8',
    ),
    fs.readFile(
      path.join(
        REPO_ROOT,
        'apps/backend/src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.ts',
      ),
      'utf8',
    ),
  ]);
  const v2Blocks = [...schema.matchAll(/model\s+([A-Za-z0-9_]+V2)\s*\{([\s\S]*?)\n\}/g)];
  const piBlocks = v2Blocks.filter((match) => match[1]!.startsWith('PaperImplementation'));
  const efBlocks = v2Blocks.filter((match) => match[1]!.startsWith('ExperimentFoundation'));
  const schemaV2ModelNames = new Set(v2Blocks.map((match) => match[1]!));
  const measuredV2ModelNames = new Set<string>(V2_CENSUS_MODEL_NAMES);
  const result = {
    v2_census_population_drift_count:
      [...schemaV2ModelNames].filter((name) => !measuredV2ModelNames.has(name)).length
      + [...measuredV2ModelNames].filter((name) => !schemaV2ModelNames.has(name)).length,
    cross_domain_schema_relation_count:
      piBlocks.filter((match) => /^\s*\w+\s+ExperimentFoundation\w+V2\b/m.test(match[2]!)).length
      + efBlocks.filter((match) => /^\s*\w+\s+PaperImplementation\w+V2\b/m.test(match[2]!)).length,
    cross_domain_migration_fk_count:
      countMatches(migration, /ALTER TABLE "PaperImplementation[^\n]+REFERENCES "ExperimentFoundation/gs)
      + countMatches(migration, /ALTER TABLE "ExperimentFoundation[^\n]+REFERENCES "PaperImplementation/gs),
    legacy_alter_count: countMatches(
      migration,
      /ALTER TABLE "(?:PaperImplementationResearchWorkOrder|PaperImplementationWorkOrderHarnessRun|ExperimentFoundationRecord|ExperimentFoundationReadinessReport|ExperimentFoundationExternalTrainingJob)"/g,
    ),
    generic_v2_table_count: v2Blocks.filter((match) => /(?:Record|Generic|Eav)V2/.test(match[1]!)).length,
    persisted_capability_count: v2Blocks.filter((match) => /(?:dispatchEligible|admissionEnabled|capability|eligibility)/i.test(match[2]!)).length,
    shared_prisma_writer_count:
      countMatches(piRepository, /this\.prisma\.experimentFoundation/g)
      + countMatches(efRepository, /this\.prisma\.paperImplementation/g),
  };
  assert.ok(Object.values(result).every((count) => count === 0), JSON.stringify(result));
  return result;
}

function countMatches(value: string, pattern: RegExp): number {
  return [...value.matchAll(pattern)].length;
}

function exactFixtureRefs(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
) {
  return [
    ...fixture.data_policies,
    ...fixture.datasets,
    ...fixture.metric_definitions,
    fixture.benchmark,
    fixture.evaluation_protocol,
  ].map(exactRefEvidence);
}

function assetCensus(refs: ExperimentFoundationV2ExactAssetRevisionRef[]) {
  const census = {
    Dataset: 0,
    DataPolicy: 0,
    MetricDefinition: 0,
    Benchmark: 0,
    EvaluationProtocol: 0,
  };
  for (const ref of refs) census[ref.asset_type] += 1;
  return census;
}

function persistedTypedAssetCensus(census: V2Census) {
  return {
    identities: {
      Dataset: census.ef.dataset_identity ?? 0,
      DataPolicy: census.ef.data_policy_identity ?? 0,
      MetricDefinition: census.ef.metric_definition_identity ?? 0,
      Benchmark: census.ef.benchmark_identity ?? 0,
      EvaluationProtocol: census.ef.evaluation_protocol_identity ?? 0,
    },
    revisions: {
      Dataset: census.ef.dataset_revision ?? 0,
      DataPolicy: census.ef.data_policy_revision ?? 0,
      MetricDefinition: census.ef.metric_definition_revision ?? 0,
      Benchmark: census.ef.benchmark_revision ?? 0,
      EvaluationProtocol: census.ef.evaluation_protocol_revision ?? 0,
    },
    freeze_command_receipts: {
      Dataset: census.ef.dataset_freeze_command_receipt,
      DataPolicy: census.ef.data_policy_freeze_command_receipt,
      MetricDefinition: census.ef.metric_definition_freeze_command_receipt,
      Benchmark: census.ef.benchmark_freeze_command_receipt,
      EvaluationProtocol: census.ef.evaluation_protocol_freeze_command_receipt,
    },
    relational_dependencies: {
      EvaluationProtocolMetricDefinition:
        census.ef.evaluation_protocol_metric_dependency,
    },
  };
}

function exactRefEvidence(ref: ExperimentFoundationV2ExactAssetRevisionRef) {
  return {
    asset_type: ref.asset_type,
    logical_id: ref.logical_id,
    revision_id: ref.revision_id,
    revision_sequence: ref.revision_sequence,
    content_hash: ref.content_hash,
  };
}

async function d19DatasetPolicyBindings(
  service: ExperimentFoundationV2Service,
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
) {
  const bindings = [];
  for (const [index, datasetRef] of fixture.datasets.entries()) {
    const dataset = await service.getExactAssetRevision(datasetRef);
    assert.equal(dataset.asset_type, 'Dataset');
    const policyRef = dataset.revision.dataset_revision.data_policy;
    const policy = await service.getExactAssetRevision(policyRef);
    assert.equal(policy.asset_type, 'DataPolicy');
    const sourcePolicyEntry = fixture.source_policy_attestation?.dataset_policies[index] ?? null;
    bindings.push({
      slot: sourcePolicyEntry?.fixture_slot ?? (
        index === 0 ? 'wikipedia_corpus' : 'natural_questions_query_workload'
      ),
      dataset_ref: exactRefEvidence(datasetRef),
      data_policy_ref: exactRefEvidence(policyRef),
      dataset: {
        dataset_key: dataset.revision.dataset_revision.dataset_key,
        dataset_role: dataset.revision.dataset_revision.dataset_role,
        source_name: dataset.revision.dataset_revision.source_identity.source_name,
        source_revision: dataset.revision.dataset_revision.source_identity.source_revision,
        source_uri: dataset.revision.dataset_revision.source_identity.source_uri,
        version_label: dataset.revision.dataset_revision.version_label,
        checksum_manifest: dataset.revision.dataset_revision.checksum_manifest,
        split_protocol: dataset.revision.dataset_revision.split_protocol,
      },
      policy: {
        policy_key: policy.revision.data_policy_revision.policy_key,
        display_name: policy.revision.data_policy_revision.display_name,
        license_expression: policy.revision.data_policy_revision.license_expression,
        access_level: policy.revision.data_policy_revision.access_level,
        source_terms_uri: policy.revision.data_policy_revision.source_terms_uri,
        redistribution_allowed: policy.revision.data_policy_revision.redistribution_allowed,
        commercial_use_allowed: policy.revision.data_policy_revision.commercial_use_allowed,
        use_constraints: policy.revision.data_policy_revision.use_constraints,
      },
      provenance: sourcePolicyEntry?.provenance ?? null,
    });
  }
  return bindings;
}

async function loadD19SourcePolicyAttestation(): Promise<
  ExperimentFoundationD19SourcePolicyAttestation | null
> {
  const configuredPath =
    process.env.EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH?.trim();
  if (!configuredPath) return null;
  if (path.isAbsolute(configuredPath)) {
    throw new Error('D-19 source-policy attestation path must be repository-relative');
  }
  const resolved = path.resolve(REPO_ROOT, configuredPath);
  if (!resolved.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error('D-19 source-policy attestation path must remain inside the repository');
  }
  const parsed = JSON.parse(await fs.readFile(resolved, 'utf8')) as unknown;
  const attestation = parseExperimentFoundationD19SourcePolicyAttestation(parsed);
  if (
    digestExperimentFoundationD19SourcePolicyAttestation(attestation)
    !== EXPERIMENT_FOUNDATION_D19_REVIEWED_SOURCE_POLICY_DIGEST
  ) {
    throw new Error('D-19 source-policy attestation does not match the reviewed Pack A digest');
  }
  return attestation;
}

function createChecks(
  outputRelativePath: string,
  summaries: Record<CheckId, string>,
): Record<CheckId, CheckEvidence> {
  return Object.fromEntries(REQUIRED_CHECK_IDS.map((id) => [id, {
    status: 'passed',
    evidence_path: `${outputRelativePath}#${id}`,
    summary: summaries[id],
  }])) as Record<CheckId, CheckEvidence>;
}

function digestJson(value: unknown): string {
  const normalized = JSON.parse(JSON.stringify(value)) as unknown;
  const canonical = canonicalizeExperimentV2Json(normalized);
  return `sha256:${crypto.createHash('sha256').update(canonical).digest('hex')}`;
}

async function sha256File(filePath: string): Promise<string> {
  return `sha256:${crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex')}`;
}

function sumNestedCounts(census: V2Census): number {
  return [
    ...Object.values(census.pi),
    ...Object.values(census.ef),
    ...Object.values(census.later_v2),
  ]
    .reduce((sum, count) => sum + count, 0);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
