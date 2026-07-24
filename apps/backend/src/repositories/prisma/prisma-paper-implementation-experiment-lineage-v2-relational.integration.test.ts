import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import type {
  Prisma,
  PrismaClient,
} from '@prisma/client';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import {
  buildExperimentFoundationD19TypedFixture,
} from '../../services/experiment-foundation-d19-fixture.js';
import {
  ExperimentFoundationV2AcknowledgementService,
} from '../../services/experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
} from '../../services/experiment-foundation-v2-materialization-service.js';
import {
  ExperimentFoundationV2Service,
} from '../../services/experiment-foundation-v2-service.js';
import {
  ExperimentV2IntegrationRelayService,
} from '../../services/experiment-v2-integration-relay-service.js';
import {
  PaperImplementationExperimentV2AdmissionService,
} from '../../services/paper-implementation-experiment-v2-admission-service.js';
import {
  PaperImplementationExperimentV2HeadService,
} from '../../services/paper-implementation-experiment-v2-head-service.js';
import {
  PrismaExperimentFoundationSpineV2Repository,
} from './prisma-experiment-foundation-spine-v2-repository.js';
import {
  PrismaExperimentFoundationV2Repository,
} from './prisma-experiment-foundation-v2-repository.js';
import {
  PrismaPaperImplementationExperimentLineageV2Repository,
} from './prisma-paper-implementation-experiment-lineage-v2-repository.js';
import {
  PrismaPaperImplementationExperimentSpineV2Repository,
} from './prisma-paper-implementation-experiment-spine-v2-repository.js';

const RUN_REAL_POSTGRES =
  process.env.PAPER_IMPLEMENTATION_EXPERIMENT_LINEAGE_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set PAPER_IMPLEMENTATION_EXPERIMENT_LINEAGE_V2_RELATIONAL_PRISMA=1 with EXPERIMENT_V2_TEST_DATABASE_URL and the randomized disposable database identity variables';
const FIXED_NOW = '2026-07-24T08:00:00.000Z';
const OPEN_CYCLE_LOOKUP = {
  async isCycleClosed() {
    return false;
  },
};

interface SeededProjectLineage {
  implementationProjectId: string;
  validationCycleId: string;
  branchId: string;
  revisionIds: [string, string];
  runIds: [string, string];
}

test(
  'Prisma M5-A1 lineage reads isolate overlapping projects and preserve superseded revisions',
  {
    skip: RUN_REAL_POSTGRES ? false : REAL_POSTGRES_SKIP_REASON,
    timeout: 180_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(
      process.env,
      'd19',
    );
    try {
      const foundationService = new ExperimentFoundationV2Service(
        new PrismaExperimentFoundationV2Repository(prisma),
      );
      const foundationFixture = await buildExperimentFoundationD19TypedFixture(
        foundationService,
      );
      const projectA = await seedProjectLineage(
        prisma,
        foundationService,
        foundationFixture,
        'project-a',
      );
      const projectB = await seedProjectLineage(
        prisma,
        foundationService,
        foundationFixture,
        'project-b',
      );
      const repository = new PrismaPaperImplementationExperimentLineageV2Repository(
        prisma,
      );

      const projectCycles = await repository.listProjectValidationCycles(
        projectA.implementationProjectId,
      );
      assert.ok(projectCycles);
      assert.deepEqual(
        projectCycles.cycles.map((cycle) => cycle.validation_cycle_id),
        [projectA.validationCycleId],
      );
      assert.equal(projectCycles.cycles[0]?.branch_count, 1);
      assert.equal(projectCycles.cycles[0]?.admitted_branch_count, 1);
      assert.equal(projectCycles.cycles[0]?.total_run_count, 2);
      assert.equal(
        JSON.stringify(projectCycles).includes(projectB.validationCycleId),
        false,
      );

      const cycleLineage = await repository.findValidationCycleExperimentLineage(
        projectA.implementationProjectId,
        projectA.validationCycleId,
      );
      assert.ok(cycleLineage);
      assert.deepEqual(
        cycleLineage.branches.map((branch) => branch.branch_id),
        [projectA.branchId],
      );
      assert.equal(cycleLineage.branches[0]?.head_run?.run_id, projectA.runIds[1]);
      assert.equal(
        JSON.stringify(cycleLineage).includes(projectB.branchId),
        false,
      );
      assert.equal(
        await repository.findValidationCycleExperimentLineage(
          projectB.implementationProjectId,
          projectA.validationCycleId,
        ),
        null,
      );

      const history = await repository.findWorkOrderBranchRevisionHistory(
        projectA.implementationProjectId,
        projectA.branchId,
      );
      assert.ok(history);
      assert.deepEqual(
        history.revisions.map((revision) => revision.work_order_revision_id),
        projectA.revisionIds,
      );
      assert.deepEqual(
        history.revisions.map((revision) => revision.run?.run_id),
        projectA.runIds,
      );
      assert.equal(
        JSON.stringify(history).includes(projectB.revisionIds[0]),
        false,
      );
      assert.equal(
        await repository.findWorkOrderBranchRevisionHistory(
          projectB.implementationProjectId,
          projectA.branchId,
        ),
        null,
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);

async function seedProjectLineage(
  prisma: PrismaClient,
  foundationService: ExperimentFoundationV2Service,
  foundationFixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
  label: string,
): Promise<SeededProjectLineage> {
  const namespace = `m5-a1-${label}-${randomUUID()}`;
  const implementationProjectId = `${namespace}:project`;
  const validationCycleId = `${namespace}:cycle`;
  await prisma.paperImplementationProject.create({
    data: projectData(implementationProjectId, namespace),
  });
  await prisma.paperImplementationValidationCycle.create({
    data: validationCycleData(implementationProjectId, validationCycleId),
  });

  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  let idSequence = 0;
  const admissionService = new PaperImplementationExperimentV2AdmissionService({
    repository: piRepository,
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
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    serverActorId: 'system:m5-a1-relational',
    idFactory: (prefix) => `${namespace}:${prefix}:${idSequence += 1}`,
    now: () => FIXED_NOW,
  });
  const materializer = new ExperimentFoundationV2MaterializationService({
    repository: efRepository,
    cycleClosureLookup: OPEN_CYCLE_LOOKUP,
    readinessResolver: exactReadinessResolver(foundationService),
    now: () => FIXED_NOW,
  });
  const relay = new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: piRepository,
    experimentFoundationRepository: efRepository,
    materializationConsumer: materializer,
    headConsumer: new PaperImplementationExperimentV2HeadService({
      repository: piRepository,
      cycleClosureLookup: OPEN_CYCLE_LOOKUP,
      now: () => FIXED_NOW,
    }),
    acknowledgementConsumer: new ExperimentFoundationV2AcknowledgementService({
      repository: efRepository,
      now: () => FIXED_NOW,
    }),
    evidenceTrustGatewayConsumer: { async consume() {} },
    runEvidenceProjectionConsumer: { async consume() {} },
    validationCycleClosedProjectionConsumer: { async consume() {} },
    workerId: `${namespace}:relay`,
    now: () => FIXED_NOW,
  });

  const baseRequest = admissionRequestFromD19(foundationFixture, namespace);
  const first = await admitAndDrain(
    admissionService,
    relay,
    efRepository,
    implementationProjectId,
    validationCycleId,
    baseRequest,
  );
  const second = await admitAndDrain(
    admissionService,
    relay,
    efRepository,
    implementationProjectId,
    validationCycleId,
    revisionRequest(baseRequest, namespace),
  );
  assert.equal(first.branchId, second.branchId);
  return {
    implementationProjectId,
    validationCycleId,
    branchId: second.branchId,
    revisionIds: [first.revisionId, second.revisionId],
    runIds: [first.runId, second.runId],
  };
}

async function admitAndDrain(
  admissionService: PaperImplementationExperimentV2AdmissionService,
  relay: ExperimentV2IntegrationRelayService,
  efRepository: PrismaExperimentFoundationSpineV2Repository,
  implementationProjectId: string,
  validationCycleId: string,
  request: PaperImplementationExperimentV2AdmissionRequest,
) {
  const admitted = await admissionService.admit({
    implementation_project_id: implementationProjectId,
    validation_cycle_id: validationCycleId,
    request,
    admitted_by: 'system:m5-a1-relational',
  });
  const drained = await relay.drainUntilIdle({ max_passes: 8 });
  assert.equal(drained.idle, true);
  assert.deepEqual(
    drained.failures.filter((failure) => (
      failure.event_type === 'WorkOrderRevisionAdmitted'
      || failure.event_type === 'RunManifestFrozen'
      || failure.event_type === 'BranchHeadAdvanced'
    )),
    [],
  );
  const materialization = await efRepository.findMaterializationByRevision(
    admitted.revision.work_order_revision_id,
  );
  assert.ok(materialization);
  return {
    branchId: admitted.branch.branch_id,
    revisionId: admitted.revision.work_order_revision_id,
    runId: materialization.run.run_id,
  };
}

function exactReadinessResolver(service: ExperimentFoundationV2Service) {
  return {
    async resolvePassedExactReadiness(input: {
      readiness_attestation_id: string;
      readiness_attestation_hash: string;
      target: Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]['target'];
      ordered_dependencies:
        Parameters<ExperimentFoundationV2Service['revalidateReadiness']>[0]['expected_dependencies'];
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
): PaperImplementationExperimentV2AdmissionRequest {
  const readiness = fixture.evaluation_protocol_readiness;
  const metric = fixture.metric_definitions[0]!;
  assert.equal(metric.asset_type, 'MetricDefinition');
  return {
    branch_key: 'main',
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'Shared-key M5-A1 relational branch',
      scientific_intent: 'Prove project-scoped experiment lineage isolation.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'M5-A1 lineage revision 1',
      objective: 'Materialize a complete project-scoped lineage.',
      readiness_attestation_id: readiness.attestation.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation.attestation_hash,
      asset_dependencies: [
        ...readiness.dependencies.map((row) => row.dependency),
        readiness.attestation.target,
      ],
      run_policy: {
        max_attempts_per_cell: 1,
        timeout_seconds: 60,
      },
    },
    exact_cells: [1, 2].map((ordinal) => ({
      cell_key: `shared-cell-${ordinal}`,
      seed: ordinal,
      repeat_index: ordinal - 1,
      parameters: [{ name: 'ordinal', value: ordinal }],
      required_result_contract: {
        metrics: [{
          metric_definition: {
            ...metric,
            asset_type: 'MetricDefinition' as const,
          },
          required_cardinality: 1,
        }],
        artifacts: [{
          artifact_kind: 'text_pipeline_stats',
          required_cardinality: 1,
        }],
      },
    })),
    business_idempotency_key: `${namespace}:admit:1`,
  };
}

function revisionRequest(
  base: PaperImplementationExperimentV2AdmissionRequest,
  namespace: string,
): PaperImplementationExperimentV2AdmissionRequest {
  return {
    ...structuredClone(base),
    work_order_revision: {
      ...structuredClone(base.work_order_revision),
      title: 'M5-A1 lineage revision 2',
    },
    exact_cells: base.exact_cells.map((cell) => ({
      ...structuredClone(cell),
      seed: cell.seed + 100,
    })),
    business_idempotency_key: `${namespace}:admit:2`,
  };
}

function projectData(
  implementationProjectId: string,
  namespace: string,
): Prisma.PaperImplementationProjectUncheckedCreateInput {
  return {
    id: implementationProjectId,
    intakeSnapshotId: `${namespace}:intake`,
    titleCardId: `${namespace}:title-card`,
    paperProjectBridgeId: `${namespace}:bridge`,
    bridgePayloadHash: hash('a'),
    lifecycleStatus: 'active',
    freshnessStatus: 'fresh',
    sourceStatus: 'active',
    versionNumber: 1,
    createdBy: 'm5-a1-relational-test',
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
  };
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
    targetRefId: 'shared-target',
    targetVersionId: 'shared-version',
    target: {},
    triggerType: 'integration_test',
    trigger: {},
    cycleType: 'experiment',
    validationQuestion: 'Does M5-A1 isolate project lineage reads?',
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
    createdBy: 'm5-a1-relational-test',
    createdAt: new Date(FIXED_NOW),
    updatedAt: new Date(FIXED_NOW),
    admittedAt: new Date(FIXED_NOW),
  };
}

function hash(character: string): string {
  return `sha256:${character.repeat(64)}`;
}
