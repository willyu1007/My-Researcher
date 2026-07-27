import assert from 'node:assert/strict';
import process from 'node:process';

import { PrismaClient } from '@prisma/client';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  CreateValidationCycleDraftRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';

import { PrismaExperimentFoundationExecutionBundleV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationMotiveRepository } from '../src/repositories/prisma/prisma-paper-implementation-motive-repository.js';
import { PrismaPaperImplementationRepository } from '../src/repositories/prisma/prisma-paper-implementation-repository.js';
import { PrismaPaperImplementationTraceRepository } from '../src/repositories/prisma/prisma-paper-implementation-trace-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import { PrismaPaperImplementationValidationRepository } from '../src/repositories/prisma/prisma-paper-implementation-validation-repository.js';
import { ExperimentFoundationExecutionBundleV2Service } from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../src/services/paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from '../src/services/paper-implementation-experiment-v2-head-service.js';
import { PaperImplementationTraceKernelService } from '../src/services/paper-implementation-trace-kernel-service.js';
import { PaperImplementationValidationCyclePlanningService } from '../src/services/paper-implementation-validation-cycle-planning-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  canonicalizeExperimentFoundationEvidenceJson,
  changedExperimentFoundationNamedLocalTables,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTableRowVersions,
  listExperimentFoundationNamedLocalApplicationTables,
} from './experiment-foundation-named-local-evidence.js';

const AUTHORIZATION_ENV = 'T132_M7_EXECUTABLE_LINEAGE_APPLY_AUTHORIZATION';
const AUTHORIZATION_VALUE =
  'authorized-2026-07-28-p313-m7-l1-vcycle-executable-lineage-max44-no-cloud';
const TARGET = Object.freeze({
  database: 'postgres',
  schema: 'my_researcher_dev',
  host: '127.0.0.1',
  port: '5432',
  fingerprint: 'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0',
});
const PROJECT_ID = 'implementation_project_642a1879-1137-40f5-b340-330b66509975';
const HISTORICAL_CYCLE_ID = 'validation_cycle_t132_packa_product_p313_v1';
const HISTORICAL_BRANCH_ID = 'pi_experiment_branch_v2_82dfdc10-858a-4e19-955b-e265a420418c';
const HISTORICAL_REVISION_ID = 'pi_experiment_revision_v2_fed4f563-4717-4bb3-89d6-1295a1b751db';
const HISTORICAL_RUN_ID = 'ef_run_v2_c4ab7919-2d7b-415c-ab53-201b11464aca';
const NEW_CYCLE_ID = 'validation_cycle_t132_m7_l1_p313_v1';
const NEW_INPUT_SNAPSHOT_ID = 'validation_input_snapshot_t132_m7_l1_p313_v1';
const NEW_TRACE_ID = 'trace_manifest_t132_m7_l1_p313_v1';
const BRANCH_KEY = 'ragperf-primary';
const BUSINESS_KEY = 't132-m7-l1-executable-lineage-p313-v1';
const BUNDLE_REVISION_ID =
  'ef_execution_bundle_revision_2c60e151719be2e109e4b2d3964aaa8c315e0b48';
const BUNDLE_REVISION_HASH =
  'sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e';
const EXPECTED_WRITE_TABLE_DELTAS = Object.freeze({
  PaperImplementationValidationCycleInputSnapshot: 1,
  PaperImplementationValidationCycle: 1,
  PaperImplementationTraceManifest: 1,
  PaperImplementationExperimentWorkOrderBranchV2: 1,
  PaperImplementationExperimentWorkOrderRevisionV2: 1,
  PaperImplementationExperimentWorkOrderRevisionCellV2: 2,
  PaperImplementationExperimentWorkOrderAdmissionV2: 1,
  PaperImplementationExperimentIntegrationOutboxV2: 2,
  PaperImplementationExperimentIntegrationInboxV2: 1,
  ExperimentFoundationIntegrationInboxV2: 2,
  ExperimentFoundationVersionLockV2: 1,
  ExperimentFoundationVersionLockDependencyV2: 23,
  ExperimentFoundationRunRecipeV2: 1,
  ExperimentFoundationTrainingTaskSpecV2: 2,
  ExperimentFoundationRunV2: 1,
  ExperimentFoundationRunCellV2: 2,
  ExperimentFoundationIntegrationOutboxV2: 1,
});
const EXPECTED_TOTAL_DELTA = 44;
const CAPABILITY_KEYS = [
  'PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_INTAKE_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_REAL_PROVIDER_CONTROL_DRAIN_ENABLED',
  'EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED',
] as const;

async function main(): Promise<void> {
  requireAuthorization();
  assertCapabilitiesRemainDisabled();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    TARGET,
    'T132_M7_EXECUTABLE_LINEAGE_TARGET_MISMATCH',
  );

  const prisma = new PrismaClient();
  await prisma.$connect();
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(prisma, TARGET);
    const writeTables = Object.keys(EXPECTED_WRITE_TABLE_DELTAS);
    const applicationTables =
      await listExperimentFoundationNamedLocalApplicationTables(prisma, writeTables);
    const protectedTables = applicationTables.filter((table) => !writeTables.includes(table.name));
    const beforeProtected =
      await digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables);
    const beforeCounts = await countExperimentFoundationNamedLocalTables(prisma, writeTables);
    const historicalBefore = await historicalSentinels(prisma);
    const authorizedPrefixBefore = await authorizedPrefixCensus(prisma);

    const repositories = buildRepositories(prisma);
    const historical = await requireHistoricalAuthority(repositories);
    const frozenBundle = await repositories.bundleService.resolveActiveReadyExact({
      execution_bundle_revision_id: BUNDLE_REVISION_ID,
      content_hash: BUNDLE_REVISION_HASH,
    });
    const project = await repositories.projectRepository.findProjectById(PROJECT_ID);
    assert.ok(project);
    assert.equal(project.lifecycle_status, 'active');

    const cycleRequest = buildCycleRequest(historical.cycle);
    let cycle = await repositories.validationRepository.findValidationCycleById(
      PROJECT_ID,
      NEW_CYCLE_ID,
    );
    if (!cycle) {
      cycle = await repositories.validationService.createValidationCycleDraft(
        PROJECT_ID,
        cycleRequest,
      );
    }
    assert.equal(cycle.lifecycle_status === 'proposed' || cycle.lifecycle_status === 'admitted', true);
    assert.equal(canonicalizeExperimentFoundationEvidenceJson(cycle.target),
      canonicalizeExperimentFoundationEvidenceJson(cycleRequest.target));
    assert.equal(canonicalizeExperimentFoundationEvidenceJson(cycle.validation_frame),
      canonicalizeExperimentFoundationEvidenceJson(cycleRequest.validation_frame));
    assert.equal(canonicalizeExperimentFoundationEvidenceJson(cycle.criteria),
      canonicalizeExperimentFoundationEvidenceJson(cycleRequest.criteria));
    assert.equal(canonicalizeExperimentFoundationEvidenceJson(cycle.budget),
      canonicalizeExperimentFoundationEvidenceJson(cycleRequest.budget));

    let trace = await repositories.traceRepository.findTraceManifestById(
      PROJECT_ID,
      NEW_TRACE_ID,
    );
    if (!trace) {
      trace = await repositories.traceService.createTraceManifest(PROJECT_ID, {
        target_ref: {
          ...historical.trace.target_ref,
          ref_type: 'validation_cycle',
          ref_id: NEW_CYCLE_ID,
          title_card_id: project.title_card_id,
          version_id: '1',
        },
        lineage: structuredClone(historical.trace.lineage),
        trace_policy_version_id: historical.trace.trace_policy_version_id,
        created_by: 'system',
      });
    }
    assert.equal(trace.trace_manifest_id, NEW_TRACE_ID);
    assert.equal(trace.trace_status, 'complete');
    assert.equal(trace.broken_ref_count, 0);
    assert.equal(trace.stale_ref_count, 0);
    assert.equal(trace.missing_ref_count, 0);

    if (cycle.lifecycle_status === 'proposed') {
      cycle = await repositories.validationService.admitValidationCycle(
        PROJECT_ID,
        NEW_CYCLE_ID,
        {
          trace_manifest_id: trace.trace_manifest_id,
          confirmation_level: 'human_confirmed',
          confirmed_by: 'human',
          created_by: 'system',
        },
      );
    }
    assert.equal(cycle.lifecycle_status, 'admitted');
    assert.equal(cycle.execution_status, 'not_started');
    assert.equal(cycle.trace_manifest_id, NEW_TRACE_ID);

    const request: PaperImplementationExperimentV2AdmissionRequest = {
      branch_key: BRANCH_KEY,
      branch_frame: {
        ...structuredClone(historical.admission.branch.branch_frame),
        display_name: 'RAGPerf M7-L1 diagnostic branch',
        scientific_intent: 'Run the bounded SciFact M7-L1 provider diagnostic without evidence promotion.',
      },
      work_order_revision: {
        ...structuredClone(historical.admission.revision.work_order_revision),
        work_order_schema_version: 'v2',
        title: 'T-132 M7-L1 SciFact PAI diagnostic',
        objective: 'Freeze one exact two-cell executable diagnostic lineage; live execution remains separately authorized.',
        run_policy: {
          max_attempts_per_cell: 1,
          timeout_seconds: 1800,
        },
        execution_bundle: {
          execution_bundle_id: frozenBundle.revision.execution_bundle_id,
          execution_bundle_revision_id: frozenBundle.revision.execution_bundle_revision_id,
          revision_sequence: frozenBundle.revision.revision_sequence,
          content_hash: frozenBundle.revision.content_hash,
        },
      },
      exact_cells: historical.admission.cells.map((cell) => ({
        cell_key: cell.cell_key,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: structuredClone(cell.parameters),
        required_result_contract: structuredClone(cell.required_result_contract),
      })),
      business_idempotency_key: BUSINESS_KEY,
    };

    const admitted = await repositories.admissionService.admit({
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: NEW_CYCLE_ID,
      request,
      admitted_by: 'system',
    });
    const relay = buildRelay(repositories);
    const applyRelay = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
    assert.equal(applyRelay.idle, true);
    assert.deepEqual(applyRelay.failures, []);
    assert.equal(applyRelay.terminalized, 0);
    assert.equal(applyRelay.released, 0);

    const finalState = await requireExecutableFinalState(prisma, admitted.revision.work_order_revision_id);
    const afterCounts = await countExperimentFoundationNamedLocalTables(prisma, writeTables);
    assertExactDeltas(beforeCounts, afterCounts, authorizedPrefixBefore);
    const afterProtected =
      await digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables);
    assert.deepEqual(
      changedExperimentFoundationNamedLocalTables(beforeProtected, afterProtected),
      [],
    );
    assert.deepEqual(await historicalSentinels(prisma), historicalBefore);

    const replayed = await repositories.admissionService.admit({
      implementation_project_id: PROJECT_ID,
      validation_cycle_id: NEW_CYCLE_ID,
      request,
      admitted_by: 'system',
    });
    assert.equal(replayed.replayed, true);
    assert.equal(replayed.revision.work_order_revision_id, admitted.revision.work_order_revision_id);
    const replayRelay = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
    assert.equal(replayRelay.idle, true);
    assert.deepEqual(replayRelay.failures, []);

    const replayCounts = await countExperimentFoundationNamedLocalTables(prisma, writeTables);
    assert.deepEqual(replayCounts, afterCounts);
    const replayProtected =
      await digestExperimentFoundationNamedLocalTableRowVersions(prisma, protectedTables);
    assert.deepEqual(
      changedExperimentFoundationNamedLocalTables(afterProtected, replayProtected),
      [],
    );
    assert.deepEqual(await historicalSentinels(prisma), historicalBefore);
    assertCapabilitiesRemainDisabled();

    console.log(JSON.stringify({
      schema_version: 't132-m7-executable-lineage-apply@v1',
      status: 'passed',
      target,
      authorization: {
        named_local_apply: true,
        maximum_new_rows: EXPECTED_TOTAL_DELTA,
        cloud_access: false,
        capability_enable: false,
        create_job: false,
        scientific_evidence_write: false,
      },
      new_scope: {
        implementation_project_id: PROJECT_ID,
        validation_cycle_id: NEW_CYCLE_ID,
        trace_manifest_id: NEW_TRACE_ID,
        branch_id: admitted.branch.branch_id,
        work_order_revision_id: admitted.revision.work_order_revision_id,
        revision_sequence: admitted.revision.revision_sequence,
        run_id: finalState.run.id,
        run_manifest_hash: finalState.run.runManifestHash,
        execution_bundle_revision_id: BUNDLE_REVISION_ID,
        execution_bundle_revision_hash: BUNDLE_REVISION_HASH,
      },
      apply: {
        admission_replayed: admitted.replayed,
        relay: applyRelay,
        row_deltas: rowDeltas(beforeCounts, afterCounts),
        preexisting_authorized_rows: authorizedPrefixBefore.total,
        new_rows_this_invocation: totalDelta(beforeCounts, afterCounts),
        total_authorized_rows: authorizedPrefixBefore.total
          + totalDelta(beforeCounts, afterCounts),
        protected_table_count: protectedTables.length,
        protected_changed_tables: [],
        historical_authority_unchanged: true,
      },
      replay: {
        admission_replayed: replayed.replayed,
        relay: replayRelay,
        new_rows: 0,
        protected_changed_tables: [],
        historical_authority_unchanged: true,
      },
      prohibited_effects: {
        cloud_provider_calls: 0,
        capability_changes: 0,
        create_job_calls: 0,
        billable_jobs: 0,
        experiment_results: 0,
        evidence_candidates: 0,
        run_evidence_units: 0,
      },
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function buildRepositories(prisma: PrismaClient) {
  const projectRepository = new PrismaPaperImplementationRepository(prisma);
  const motiveRepository = new PrismaPaperImplementationMotiveRepository(prisma);
  const traceRepository = new PrismaPaperImplementationTraceRepository(prisma);
  const validationRepository = new PrismaPaperImplementationValidationRepository(prisma);
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const assetService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  const cycleClosureLookup =
    new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
  const bundleService = new ExperimentFoundationExecutionBundleV2Service({
    repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
  });
  const ids = deterministicIdFactory();
  const now = () => new Date().toISOString();
  const traceService = new PaperImplementationTraceKernelService({
    projectRepository,
    traceRepository,
    idFactory: (prefix) => prefix === 'trace_manifest'
      ? NEW_TRACE_ID
      : `${prefix}_t132_m7_l1_p313_v1`,
    now,
  });
  const validationService = new PaperImplementationValidationCyclePlanningService({
    projectRepository,
    motiveRepository,
    traceRepository,
    validationRepository,
    idFactory: (prefix) => prefix === 'validation_input_snapshot'
      ? NEW_INPUT_SNAPSHOT_ID
      : `${prefix}_t132_m7_l1_p313_v1`,
    now,
  });
  const admissionService = new PaperImplementationExperimentV2AdmissionService({
    repository: piRepository,
    scopeReader: {
      async resolveExactScope(implementationProjectId, validationCycleId) {
        const [project, cycle] = await Promise.all([
          projectRepository.findProjectById(implementationProjectId),
          validationRepository.findValidationCycleById(
            implementationProjectId,
            validationCycleId,
          ),
        ]);
        if (!project || !cycle) return null;
        return {
          implementation_project_id: implementationProjectId,
          validation_cycle_id: validationCycleId,
          implementation_project_lifecycle_status: project.lifecycle_status,
          validation_cycle_lifecycle_status: cycle.lifecycle_status,
        };
      },
    },
    admissionEnabled: () => true,
    cycleClosureLookup,
    serverActorId: 'system',
    idFactory: ids,
    now,
  });
  const readinessResolver: ExperimentFoundationV2ReadinessResolver = {
    async resolvePassedExactReadiness(input) {
      const result = await assetService.revalidateReadiness({
        target: input.target,
        readiness_attestation_id: input.readiness_attestation_id,
        expected_dependencies: input.ordered_dependencies,
      });
      if (
        result.attestation.status !== 'passed'
        || result.attestation.attestation_hash !== input.readiness_attestation_hash
      ) return null;
      return {
        attestation: result.attestation,
        ordered_dependencies: result.dependencies.map((row) => row.dependency),
      };
    },
  };
  const materializationService = new ExperimentFoundationV2MaterializationService({
    repository: efRepository,
    readinessResolver,
    cycleClosureLookup,
    executionBundleResolver: bundleService,
    idFactory: ids,
    now,
  });
  const headService = new PaperImplementationExperimentV2HeadService({
    repository: piRepository,
    cycleClosureLookup,
    idFactory: ids,
    now,
  });
  const acknowledgementService = new ExperimentFoundationV2AcknowledgementService({
    repository: efRepository,
    idFactory: ids,
    now,
  });
  return {
    projectRepository,
    traceRepository,
    validationRepository,
    piRepository,
    efRepository,
    cycleClosureLookup,
    bundleService,
    traceService,
    validationService,
    admissionService,
    materializationService,
    headService,
    acknowledgementService,
  };
}

function buildRelay(repositories: ReturnType<typeof buildRepositories>) {
  return new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: repositories.piRepository,
    experimentFoundationRepository: repositories.efRepository,
    materializationConsumer: repositories.materializationService,
    headConsumer: repositories.headService,
    acknowledgementConsumer: repositories.acknowledgementService,
    workerId: 't132-m7-l1-executable-lineage-relay',
    retryDelayMs: 0,
  });
}

async function requireHistoricalAuthority(
  repositories: ReturnType<typeof buildRepositories>,
) {
  const cycle = await repositories.validationRepository.findValidationCycleById(
    PROJECT_ID,
    HISTORICAL_CYCLE_ID,
  );
  assert.ok(cycle);
  assert.equal(cycle.lifecycle_status, 'completed');
  assert.ok(cycle.trace_manifest_id);
  const trace = await repositories.traceRepository.findTraceManifestById(
    PROJECT_ID,
    cycle.trace_manifest_id,
  );
  assert.ok(trace);
  assert.equal(trace.trace_status, 'complete');
  const admission = await repositories.piRepository.findRevisionBundle(
    HISTORICAL_BRANCH_ID,
    HISTORICAL_REVISION_ID,
  );
  assert.ok(admission);
  assert.equal(admission.revision.revision_sequence, 1);
  assert.equal(admission.revision.work_order_revision.work_order_schema_version, 'v1');
  return { cycle, trace, admission };
}

function buildCycleRequest(
  historical: Awaited<ReturnType<typeof requireHistoricalAuthority>>['cycle'],
): CreateValidationCycleDraftRequest {
  return {
    validation_cycle_id: NEW_CYCLE_ID,
    target: structuredClone(historical.target),
    trigger: structuredClone(historical.trigger),
    cycle_type: 'probe_execution',
    validation_frame: {
      ...structuredClone(historical.validation_frame),
      validation_question:
        'Can the exact two-cell SciFact M7-L1 executable lineage reach one acknowledged Run before any provider submit?',
      assumptions_under_test: [
        'The reviewed exact D-19 readiness remains current.',
        'The frozen ExecutionBundle v2 is active and passed.',
      ],
      decision_if_pass:
        'Permit only the separately authorized two-job diagnostic window after fresh cloud preflight.',
      decision_if_fail:
        'Stop before provider submission and preserve the failed-closed lineage evidence.',
      decision_if_inconclusive:
        'Keep real-provider capabilities off and repeat only after a new authority review.',
      expected_information_gain: 'high',
      why_this_cycle_now:
        'The historical control-flow Cycle is closed; M7-L1 requires a new immutable executable lineage.',
    },
    context: {
      input_snapshot_id: NEW_INPUT_SNAPSHOT_ID,
      context_policy_version_id: historical.context.context_policy_version_id,
      included_refs: structuredClone(historical.context.included_refs),
      excluded_context_notes: [
        'Historical Cycle/closure/branch/Run are immutable and excluded from mutation.',
        'Provider submission, scientific results, evidence promotion and M7-L2 are excluded.',
      ],
    },
    criteria: {
      pass_conditions: [
        'Exactly one WorkOrder v2 produces one acknowledged two-cell executable Run.',
        'The exact frozen ExecutionBundle revision/hash is preserved through T1-T4.',
      ],
      fail_conditions: [
        'Any cell, bundle, hash, sequence or authority count drifts.',
        'Any historical or prohibited table changes.',
      ],
      inconclusive_conditions: [
        'Named-local readiness, bundle or Cycle prerequisites cannot be verified exactly.',
      ],
      stop_conditions: [
        'Stop before all T1-T4 and replay invariants pass.',
        'Stop before any cloud provider call.',
      ],
      minimum_artifacts_required: [
        'Sanitized M7-L1 executable-lineage apply and replay summary.',
      ],
    },
    budget: {
      ...structuredClone(historical.budget),
      budget_id: 'validation_budget_t132_m7_l1_p313_v1',
      max_runtime: 'PT30M',
      max_compute: '2x1CPU-4GiB',
      retry_budget: 0,
    },
    confirmation_level: 'human_confirmed',
    confirmed_by: 'human',
    policy_version_id: historical.policy_version_id,
    created_by: 'system',
  };
}

function deterministicIdFactory(): (prefix: string) => string {
  const counters = new Map<string, number>();
  return (prefix) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_t132_m7_l1_p313_v1_${next}`;
  };
}

async function requireExecutableFinalState(prisma: PrismaClient, revisionId: string) {
  const revision = await prisma.paperImplementationExperimentWorkOrderRevisionV2.findUnique({
    where: { id: revisionId },
    include: { cells: { orderBy: { ordinal: 'asc' } }, admission: true },
  });
  assert.ok(revision);
  assert.equal(revision.revisionSequence, 1);
  assert.equal((revision.workOrderSnapshotJson as { work_order_schema_version?: string })
    .work_order_schema_version, 'v2');
  assert.equal(revision.cells.length, 2);
  assert.ok(revision.admission);
  const run = await prisma.experimentFoundationRunV2.findUnique({
    where: { externalPiWorkOrderRevisionId: revisionId },
    include: {
      runRecipe: true,
      cells: { orderBy: { ordinal: 'asc' } },
    },
  });
  assert.ok(run);
  assert.equal(run.runRecipe.recipeSchemaVersion, 'v2');
  assert.equal(run.runRecipe.executionBundleRevisionId, BUNDLE_REVISION_ID);
  assert.equal(run.runRecipe.executionBundleRevisionHash, BUNDLE_REVISION_HASH);
  assert.equal(run.cells.length, 2);
  const branch = await prisma.paperImplementationExperimentWorkOrderBranchV2.findUnique({
    where: { id: revision.branchId },
  });
  assert.ok(branch);
  assert.equal(branch.validationCycleId, NEW_CYCLE_ID);
  assert.equal(branch.currentRevisionId, revisionId);
  assert.equal(branch.headRevisionId, revisionId);
  assert.equal(branch.headRunId, run.id);
  const finalAck = await prisma.experimentFoundationIntegrationInboxV2.findFirst({
    where: {
      workOrderRevisionId: revisionId,
      eventType: 'BranchHeadAdvanced',
      status: 'processed',
      outcome: 'processed',
    },
  });
  assert.ok(finalAck);
  return { revision, run, branch, finalAck };
}

async function historicalSentinels(prisma: PrismaClient): Promise<unknown> {
  return JSON.parse(JSON.stringify({
    cycle: await prisma.paperImplementationValidationCycle.findUnique({
      where: { id: HISTORICAL_CYCLE_ID },
    }),
    closure: await prisma.paperImplementationValidationCycleClosureV2.findUnique({
      where: { validationCycleId: HISTORICAL_CYCLE_ID },
    }),
    branch: await prisma.paperImplementationExperimentWorkOrderBranchV2.findUnique({
      where: { id: HISTORICAL_BRANCH_ID },
    }),
    revision: await prisma.paperImplementationExperimentWorkOrderRevisionV2.findUnique({
      where: { id: HISTORICAL_REVISION_ID },
      include: { cells: { orderBy: { ordinal: 'asc' } }, admission: true },
    }),
    run: await prisma.experimentFoundationRunV2.findUnique({
      where: { id: HISTORICAL_RUN_ID },
      include: {
        runRecipe: true,
        cells: { orderBy: { ordinal: 'asc' } },
      },
    }),
  }));
}

function assertExactDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
  authorizedPrefixBefore: Awaited<ReturnType<typeof authorizedPrefixCensus>>,
): void {
  const expected = {
    ...EXPECTED_WRITE_TABLE_DELTAS,
    PaperImplementationValidationCycleInputSnapshot:
      1 - authorizedPrefixBefore.inputSnapshot,
    PaperImplementationValidationCycle:
      1 - authorizedPrefixBefore.cycle,
    PaperImplementationTraceManifest:
      1 - authorizedPrefixBefore.trace,
  };
  assert.deepEqual(rowDeltas(before, after), expected);
  assert.equal(
    authorizedPrefixBefore.total + totalDelta(before, after),
    EXPECTED_TOTAL_DELTA,
  );
}

async function authorizedPrefixCensus(prisma: PrismaClient): Promise<{
  inputSnapshot: number;
  cycle: number;
  trace: number;
  total: number;
}> {
  const [inputSnapshot, cycle, trace] = await Promise.all([
    prisma.paperImplementationValidationCycleInputSnapshot.count({
      where: { id: NEW_INPUT_SNAPSHOT_ID },
    }),
    prisma.paperImplementationValidationCycle.count({
      where: { id: NEW_CYCLE_ID },
    }),
    prisma.paperImplementationTraceManifest.count({
      where: { id: NEW_TRACE_ID },
    }),
  ]);
  assert.ok(inputSnapshot === 0 || inputSnapshot === 1);
  assert.ok(cycle === 0 || cycle === 1);
  assert.ok(trace === 0 || trace === 1);
  return {
    inputSnapshot,
    cycle,
    trace,
    total: inputSnapshot + cycle + trace,
  };
}

function rowDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    Object.keys(EXPECTED_WRITE_TABLE_DELTAS).map((table) => [
      table,
      (after[table] ?? 0) - (before[table] ?? 0),
    ]),
  );
}

function totalDelta(before: Record<string, number>, after: Record<string, number>): number {
  return Object.values(rowDeltas(before, after)).reduce((sum, delta) => sum + delta, 0);
}

function requireAuthorization(): void {
  if (process.env[AUTHORIZATION_ENV] !== AUTHORIZATION_VALUE) {
    throw new Error(
      `${AUTHORIZATION_ENV} must equal the exact reviewed 2026-07-28 max-44 token`,
    );
  }
}

function assertCapabilitiesRemainDisabled(): void {
  for (const key of CAPABILITY_KEYS) {
    const value = process.env[key];
    if (value !== undefined && value !== 'false' && value !== '0') {
      throw new Error(`Capability must remain disabled: ${key}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
