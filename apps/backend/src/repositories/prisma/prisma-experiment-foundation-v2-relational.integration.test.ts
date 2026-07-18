import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { Prisma, PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import {
  serverHashExperimentV2EventEnvelope,
  serverHashExperimentV2EventPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  RunManifestFrozenEventV1,
  WorkOrderRevisionAdmittedEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import { AppError } from '../../errors/app-error.js';
import {
  openVerifiedDisposablePostgresTestDatabase,
} from '../../test-support/disposable-postgres-test-database.js';
import { InMemoryPaperImplementationExperimentSpineV2Repository } from '../in-memory-experiment-spine-v2-repository.js';
import {
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentFoundationV2MaterializationBundle,
} from '../experiment-spine-v2.repository.js';
import { buildExperimentFoundationD19TypedFixture } from '../../services/experiment-foundation-d19-fixture.js';
import { ExperimentFoundationV2MaterializationService } from '../../services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../../services/experiment-foundation-v2-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../../services/paper-implementation-experiment-v2-admission-service.js';
import { PrismaExperimentFoundationSpineV2Repository } from './prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from './prisma-experiment-foundation-v2-repository.js';

const RUN_REAL_POSTGRES = process.env.EXPERIMENT_FOUNDATION_V2_RELATIONAL_PRISMA === '1';
const REAL_POSTGRES_SKIP_REASON =
  'set EXPERIMENT_FOUNDATION_V2_RELATIONAL_PRISMA=1 with the explicit randomized disposable database identity variables';
const WRONG_HASH = `sha256:${'f'.repeat(64)}`;
let relationalFixturePromise: ReturnType<typeof buildExperimentFoundationD19TypedFixture> | null = null;

test(
  'Prisma EF v2 enforces freeze receipts, exact hash refs, Dataset roles, and ordered Protocol metrics',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 120_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const repository = new PrismaExperimentFoundationV2Repository(prisma);
    const service = new ExperimentFoundationV2Service(repository);

    try {
      const fixture = await getRelationalFixture(service);
      const policy = fixture.data_policies[0]!;
      const secondCommandKey = `relational-replay-${randomUUID()}`;

      const replay = await service.freezeAssetDraft({
        asset_type: 'DataPolicy',
        logical_id: policy.logical_id,
        expected_state_version: 2,
        business_idempotency_key: secondCommandKey,
      });
      assert.equal(replay.replayed, true);
      assert.equal(replay.exact_ref.revision_id, policy.revision_id);
      assert.equal(await prisma.experimentFoundationDataPolicyRevisionV2.count({
        where: { dataPolicyId: policy.logical_id },
      }), 1);
      assert.equal(await prisma.experimentFoundationDataPolicyFreezeCommandReceiptV2.count({
        where: { dataPolicyId: policy.logical_id, revisionId: policy.revision_id },
      }), 2);

      const otherPolicy = fixture.data_policies[1]!;
      await expectDatabaseConstraint(
        prisma.$transaction(async (transaction) => {
          await transaction.experimentFoundationDataPolicyV2.update({
            where: { id: otherPolicy.logical_id },
            data: { currentRevisionId: null },
          });
          await transaction.experimentFoundationDataPolicyV2.update({
            where: { id: policy.logical_id },
            data: { currentRevisionId: otherPolicy.revision_id },
          });
        }),
        'foreign key',
      );

      const policyRevision = await service.getExactAssetRevision(policy);
      assert.equal(policyRevision.asset_type, 'DataPolicy');
      if (policyRevision.asset_type !== 'DataPolicy') {
        throw new Error('Expected DataPolicy fixture revision');
      }
      await service.updateAssetDraft({
        asset_type: 'DataPolicy',
        logical_id: policy.logical_id,
        expected_state_version: 2,
        draft_content: {
          ...policyRevision.revision.data_policy_revision,
          display_name: 'changed after the exact replay receipt was committed',
        },
      });
      await assert.rejects(
        service.freezeAssetDraft({
          asset_type: 'DataPolicy',
          logical_id: policy.logical_id,
          expected_state_version: 3,
          business_idempotency_key: secondCommandKey,
        }),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'ASSET_FREEZE_IDEMPOTENCY_CONFLICT',
      );

      const corpus = asDatasetRef(fixture.datasets[0]!);
      const queryWorkload = asDatasetRef(fixture.datasets[1]!);
      const reversedBenchmarkId = `reversed-benchmark-${randomUUID()}`;
      await service.createAssetDraft({
        asset_type: 'Benchmark',
        logical_id: reversedBenchmarkId,
        draft_content: {
          schema_version: 'v1',
          benchmark_key: reversedBenchmarkId,
          display_name: 'Reversed Dataset role negative fixture',
          description: 'Must fail before an immutable Benchmark revision is written.',
          corpus_dataset: queryWorkload,
          query_workload_dataset: corpus,
        },
      });
      await assert.rejects(
        service.freezeAssetDraft({
          asset_type: 'Benchmark',
          logical_id: reversedBenchmarkId,
          expected_state_version: 1,
          business_idempotency_key: `freeze-${reversedBenchmarkId}`,
        }),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'V2_TYPED_SNAPSHOT_INVALID',
      );
      assert.equal(await prisma.experimentFoundationBenchmarkRevisionV2.count({
        where: { benchmarkId: reversedBenchmarkId },
      }), 0);

      await expectDatabaseConstraint(
        prisma.experimentFoundationBenchmarkRevisionV2.update({
          where: { id: fixture.benchmark.revision_id },
          data: { corpusDatasetRevisionHash: WRONG_HASH },
        }),
        'foreign key',
      );
      await expectDatabaseConstraint(
        prisma.experimentFoundationEvaluationProtocolRevisionV2.update({
          where: { id: fixture.evaluation_protocol.revision_id },
          data: { benchmarkRevisionHash: WRONG_HASH },
        }),
        'foreign key',
      );

      const dependencies = await prisma.experimentFoundationEvaluationProtocolMetricDependencyV2
        .findMany({
          where: { evaluationProtocolRevisionId: fixture.evaluation_protocol.revision_id },
          orderBy: { ordinal: 'asc' },
        });
      assert.equal(dependencies.length, 17);
      assert.deepEqual(dependencies.map((dependency) => dependency.ordinal), [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
      ]);

      const first = dependencies[0]!;
      await expectDatabaseConstraint(
        prisma.experimentFoundationEvaluationProtocolMetricDependencyV2.update({
          where: { id: first.id },
          data: { metricDefinitionRevisionId: `missing-${randomUUID()}` },
        }),
        'foreign key',
      );

      const extraMetricId = `extra-metric-${randomUUID()}`;
      await service.createAssetDraft({
        asset_type: 'MetricDefinition',
        logical_id: extraMetricId,
        draft_content: {
          schema_version: 'v1',
          metric_key: extraMetricId,
          display_name: 'Extra metric substitution negative fixture',
          direction: 'informational',
          value_type: 'number',
          unit: 'count',
          evaluator_binding: {
            evaluator_key: 'relational-negative-fixture',
            evaluator_version: 'v1',
          },
        },
      });
      const extraMetric = await service.freezeAssetDraft({
        asset_type: 'MetricDefinition',
        logical_id: extraMetricId,
        expected_state_version: 1,
        business_idempotency_key: `freeze-${extraMetricId}`,
      });
      await expectDatabaseConstraint(
        prisma.experimentFoundationEvaluationProtocolMetricDependencyV2.update({
          where: { id: first.id },
          data: {
            metricDefinitionId: extraMetric.exact_ref.logical_id,
            metricDefinitionRevisionId: extraMetric.exact_ref.revision_id,
            metricDefinitionRevisionSequence: extraMetric.exact_ref.revision_sequence,
            metricDefinitionRevisionHash: extraMetric.exact_ref.content_hash,
          },
        }),
        'metric dependency rows do not match the typed snapshot',
      );

      await expectDatabaseConstraint(
        prisma.experimentFoundationEvaluationProtocolMetricDependencyV2.update({
          where: { id: first.id },
          data: { ordinal: 999 },
        }),
        'metric dependency rows do not match the typed snapshot',
      );
    } finally {
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma T2 rechecks readiness after preflight and rolls back every family after lifecycle revoke',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 120_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const foundationService = new ExperimentFoundationV2Service(
      new PrismaExperimentFoundationV2Repository(prisma),
    );
    let projectionBefore: Awaited<ReturnType<
      typeof prisma.experimentFoundationAssetLifecycleProjectionV2.findFirst
    >> = null;
    let revokedEventId: string | null = null;

    try {
      const fixture = await getRelationalFixture(foundationService);
      const dependencyToRevoke = fixture.metric_definitions[0]!;
      projectionBefore = await prisma.experimentFoundationAssetLifecycleProjectionV2.findFirst({
        where: exactProjectionWhere(dependencyToRevoke),
      });
      assert.ok(projectionBefore, 'active dependency projection must exist before preflight');

      const piRepository = new InMemoryPaperImplementationExperimentSpineV2Repository();
      const namespace = randomUUID();
      let idSequence = 0;
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
        serverActorId: 'system:t2-readiness-race-test',
        idFactory: (prefix) => `${namespace}:${prefix}:${++idSequence}`,
        now: () => '2026-07-14T19:00:00.000Z',
      });
      const admitted = await admissionService.admit({
        implementation_project_id: `${namespace}:project`,
        validation_cycle_id: `${namespace}:cycle`,
        request: materializationAdmissionRequest(fixture),
        admitted_by: 'system:t2-readiness-race-test',
      });
      const sourceEvent = piRepository.snapshot().outboxes[0]!.outbox.event;
      assert.equal(sourceEvent.event_type, 'WorkOrderRevisionAdmitted');
      const before = await t2ScopeCounts(prisma, admitted.revision.work_order_revision_id);

      let hookRan = false;
      class RevokeAfterPreflightRepository extends PrismaExperimentFoundationSpineV2Repository {
        override async commitMaterialization(
          bundle: ExperimentFoundationV2MaterializationBundle,
          event: WorkOrderRevisionAdmittedEventV1,
        ): Promise<ExperimentFoundationV2MaterializationBundle> {
          if (!hookRan) {
            hookRan = true;
            const revoked = await foundationService.appendLifecycleEvent({
              asset: dependencyToRevoke,
              expected_projection_state_version: projectionBefore!.stateVersion,
              event_type: 'revoked',
              reason_code: 'T2_RELATIONAL_TOCTOU_NEGATIVE',
            });
            revokedEventId = revoked.event.lifecycle_event_id;
          }
          return super.commitMaterialization(bundle, event);
        }
      }
      const materializer = new ExperimentFoundationV2MaterializationService({
        repository: new RevokeAfterPreflightRepository(prisma),
        readinessResolver: {
          async resolvePassedExactReadiness(input) {
            const resolved = await foundationService.revalidateReadiness({
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
        },
        idFactory: (prefix) => `${namespace}:${prefix}:${++idSequence}`,
        now: () => '2026-07-14T19:00:01.000Z',
      });

      await assert.rejects(
        materializer.consume(sourceEvent),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'READINESS_DEPENDENCY_DRIFT',
      );
      assert.equal(hookRan, true, 'lifecycle revoke must happen after service preflight');
      assert.deepEqual(
        await t2ScopeCounts(prisma, admitted.revision.work_order_revision_id),
        before,
        'T2 inbox/lock/recipe/task/run/cell/outbox families must remain unchanged',
      );
    } finally {
      if (projectionBefore && revokedEventId) {
        await prisma.$transaction(async (transaction) => {
          await transaction.experimentFoundationAssetLifecycleProjectionV2.update({
            where: { id: projectionBefore!.id },
            data: {
              lifecycleSequence: projectionBefore!.lifecycleSequence,
              lifecycleStatus: projectionBefore!.lifecycleStatus,
              locationAvailable: projectionBefore!.locationAvailable,
              stateVersion: projectionBefore!.stateVersion,
              lastEventId: projectionBefore!.lastEventId,
              updatedAt: projectionBefore!.updatedAt,
            },
          });
          await transaction.experimentFoundationAssetLifecycleEventV2.delete({
            where: { id: revokedEventId! },
          });
        });
      }
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma T2 rejects typed readiness snapshot drift inside its transaction with zero writes',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 120_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    const foundationService = new ExperimentFoundationV2Service(
      new PrismaExperimentFoundationV2Repository(prisma),
    );
    let originalQualification: Prisma.JsonValue | null = null;
    let readinessId: string | null = null;

    try {
      const fixture = await getRelationalFixture(foundationService);
      readinessId = fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id;
      const storedReadiness = await prisma.experimentFoundationReadinessAttestationV2
        .findUniqueOrThrow({ where: { id: readinessId } });
      originalQualification = structuredClone(storedReadiness.qualificationSnapshotJson);
      const admission = await createRelationalAdmission(fixture, 'typed-readiness-drift');
      const before = await t2ScopeCounts(prisma, admission.workOrderRevisionId);
      let tampered = false;

      class TamperReadinessAfterPreflightRepository
      extends PrismaExperimentFoundationSpineV2Repository {
        override async commitMaterialization(
          bundle: ExperimentFoundationV2MaterializationBundle,
          event: WorkOrderRevisionAdmittedEventV1,
        ): Promise<ExperimentFoundationV2MaterializationBundle> {
          if (!tampered) {
            tampered = true;
            await withUserTriggersDisabled(
              prisma,
              'ExperimentFoundationReadinessAttestationV2',
              async () => {
                await prisma.experimentFoundationReadinessAttestationV2.update({
                  where: { id: readinessId! },
                  data: {
                    qualificationSnapshotJson: {
                      ...(originalQualification as Prisma.JsonObject),
                      unexpected: true,
                    },
                  },
                });
              },
            );
          }
          return super.commitMaterialization(bundle, event);
        }
      }
      const materializer = new ExperimentFoundationV2MaterializationService({
        repository: new TamperReadinessAfterPreflightRepository(prisma),
        readinessResolver: {
          async resolvePassedExactReadiness() {
            return {
              attestation: fixture.evaluation_protocol_readiness.attestation,
              ordered_dependencies: fixture.evaluation_protocol_readiness.dependencies.map(
                (dependency) => dependency.dependency,
              ),
            };
          },
        },
        idFactory: admission.nextId,
        now: () => '2026-07-14T19:10:01.000Z',
      });

      await assert.rejects(
        materializer.consume(admission.sourceEvent),
        (error) => error instanceof AppError
          && error.details?.reason_code === 'READINESS_DEPENDENCY_DRIFT',
      );
      assert.equal(tampered, true);
      assert.deepEqual(
        await t2ScopeCounts(prisma, admission.workOrderRevisionId),
        before,
        'typed readiness drift must leave every T2 family unchanged',
      );
    } finally {
      if (readinessId && originalQualification) {
        await withUserTriggersDisabled(
          prisma,
          'ExperimentFoundationReadinessAttestationV2',
          async () => {
            await prisma.experimentFoundationReadinessAttestationV2.update({
              where: { id: readinessId! },
              data: { qualificationSnapshotJson: originalQualification as Prisma.InputJsonValue },
            });
          },
        );
      }
      await prisma.$disconnect();
    }
  },
);

test(
  'Prisma materialization read rejects self-hashed RunManifestFrozen binding drift without writes',
  {
    skip: RUN_REAL_POSTGRES
      ? false
      : REAL_POSTGRES_SKIP_REASON,
    timeout: 120_000,
  },
  async () => {
    const { prisma } = await openVerifiedDisposablePostgresTestDatabase(process.env, 'd19');
    let originalOutbox: {
      eventPayloadJson: Prisma.JsonValue;
      payloadHash: string;
      eventEnvelopeHash: string;
    } | null = null;
    let outboxId: string | null = null;

    try {
      const foundationService = new ExperimentFoundationV2Service(
        new PrismaExperimentFoundationV2Repository(prisma),
      );
      const fixture = await getRelationalFixture(foundationService);
      const admission = await createRelationalAdmission(fixture, 'frozen-binding-drift');
      const repository = new PrismaExperimentFoundationSpineV2Repository(prisma);
      const materializer = new ExperimentFoundationV2MaterializationService({
        repository,
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
        idFactory: admission.nextId,
        now: () => '2026-07-14T19:20:01.000Z',
      });
      const materialization = await materializer.consume(admission.sourceEvent);
      outboxId = materialization.outbox.outbox_id;
      const storedOutbox = await prisma.experimentFoundationIntegrationOutboxV2.findUniqueOrThrow({
        where: { id: outboxId },
      });
      originalOutbox = {
        eventPayloadJson: structuredClone(storedOutbox.eventPayloadJson),
        payloadHash: storedOutbox.payloadHash,
        eventEnvelopeHash: storedOutbox.eventEnvelopeHash,
      };
      const payload = structuredClone(
        materialization.outbox.event.payload,
      ) as RunManifestFrozenEventV1['payload'];
      payload.task_spec_bindings.reverse();
      const payloadHash = serverHashExperimentV2EventPayload('RunManifestFrozen', 'v1', payload);
      const event = {
        ...materialization.outbox.event,
        payload,
        payload_hash: payloadHash,
      };
      await withUserTriggersDisabled(
        prisma,
        'ExperimentFoundationIntegrationOutboxV2',
        async () => {
          await prisma.experimentFoundationIntegrationOutboxV2.update({
            where: { id: outboxId! },
            data: {
              eventPayloadJson: payload as unknown as Prisma.InputJsonValue,
              payloadHash,
              eventEnvelopeHash: serverHashExperimentV2EventEnvelope(event),
            },
          });
        },
      );
      const before = await t2ScopeCounts(prisma, admission.workOrderRevisionId);

      await assert.rejects(
        repository.findMaterializationByRevision(admission.workOrderRevisionId),
        (error) => error instanceof ExperimentSpineV2RepositoryConstraintError
          && error.reasonCode === 'RUN_CELL_PARITY_MISMATCH',
      );
      assert.deepEqual(
        await t2ScopeCounts(prisma, admission.workOrderRevisionId),
        before,
        'failed materialization read must not mutate any T2 family',
      );
    } finally {
      if (outboxId && originalOutbox) {
        await withUserTriggersDisabled(
          prisma,
          'ExperimentFoundationIntegrationOutboxV2',
          async () => {
            await prisma.experimentFoundationIntegrationOutboxV2.update({
              where: { id: outboxId! },
              data: {
                eventPayloadJson: originalOutbox!.eventPayloadJson as Prisma.InputJsonValue,
                payloadHash: originalOutbox!.payloadHash,
                eventEnvelopeHash: originalOutbox!.eventEnvelopeHash,
              },
            });
          },
        );
      }
      await prisma.$disconnect();
    }
  },
);

function getRelationalFixture(service: ExperimentFoundationV2Service) {
  relationalFixturePromise ??= buildExperimentFoundationD19TypedFixture(service);
  return relationalFixturePromise;
}

async function createRelationalAdmission(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
  purpose: string,
) {
  const repository = new InMemoryPaperImplementationExperimentSpineV2Repository();
  const namespace = `${purpose}:${randomUUID()}`;
  let idSequence = 0;
  const nextId = (prefix: string) => `${namespace}:${prefix}:${++idSequence}`;
  const service = new PaperImplementationExperimentV2AdmissionService({
    repository,
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
    now: () => '2026-07-14T19:10:00.000Z',
  });
  const admitted = await service.admit({
    implementation_project_id: `${namespace}:project`,
    validation_cycle_id: `${namespace}:cycle`,
    request: materializationAdmissionRequest(fixture),
    admitted_by: `system:${purpose}`,
  });
  const sourceEvent = repository.snapshot().outboxes[0]!.outbox.event;
  assert.equal(sourceEvent.event_type, 'WorkOrderRevisionAdmitted');
  return {
    nextId,
    sourceEvent,
    workOrderRevisionId: admitted.revision.work_order_revision_id,
  };
}

async function withUserTriggersDisabled<T>(
  prisma: PrismaClient,
  table:
    | 'ExperimentFoundationReadinessAttestationV2'
    | 'ExperimentFoundationIntegrationOutboxV2',
  operation: () => Promise<T>,
): Promise<T> {
  await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" DISABLE TRIGGER USER`);
  try {
    return await operation();
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE TRIGGER USER`);
  }
}

function materializationAdmissionRequest(
  fixture: Awaited<ReturnType<typeof buildExperimentFoundationD19TypedFixture>>,
): PaperImplementationExperimentV2AdmissionRequest {
  const readiness = fixture.evaluation_protocol_readiness;
  const metric = fixture.metric_definitions[0]!;
  assert.equal(metric.asset_type, 'MetricDefinition');
  const metricDefinition = { ...metric, asset_type: 'MetricDefinition' as const };
  return {
    branch_key: `t2-readiness-race-${randomUUID()}`,
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'T2 readiness race fixture',
      scientific_intent: 'Reject materialization after exact readiness lifecycle drift.',
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v1',
      title: 'T2 readiness transaction fence',
      objective: 'Prove zero partial T2 writes after post-preflight lifecycle revoke.',
      readiness_attestation_id: readiness.attestation.readiness_attestation_id,
      readiness_attestation_hash: readiness.attestation.attestation_hash,
      asset_dependencies: [
        ...readiness.dependencies.map((dependency) => dependency.dependency),
        readiness.attestation.target,
      ],
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 60 },
    },
    exact_cells: [1, 2].map((ordinal) => ({
      cell_key: `t2-readiness-cell-${ordinal}`,
      seed: ordinal,
      repeat_index: ordinal - 1,
      parameters: [{ name: 'top_k', value: ordinal * 5 }],
      required_result_contract: {
        metrics: [{ metric_definition: metricDefinition, required_cardinality: 1 }],
        artifacts: [{ artifact_kind: 'text_pipeline_stats', required_cardinality: 1 }],
      },
    })),
    business_idempotency_key: `t2-readiness-race-${randomUUID()}`,
  };
}

function exactProjectionWhere(ref: ExperimentFoundationV2ExactAssetRevisionRef) {
  return {
    assetType: ref.asset_type,
    assetId: ref.logical_id,
    currentRevisionId: ref.revision_id,
    currentRevisionSequence: ref.revision_sequence,
    currentRevisionHash: ref.content_hash,
  };
}

async function t2ScopeCounts(prisma: PrismaClient, workOrderRevisionId: string) {
  const [inbox, versionLock, versionLockDependency, recipe, taskSpec, run, runCell, outbox] =
    await Promise.all([
      prisma.experimentFoundationIntegrationInboxV2.count({ where: { workOrderRevisionId } }),
      prisma.experimentFoundationVersionLockV2.count({
        where: { externalPiWorkOrderRevisionId: workOrderRevisionId },
      }),
      prisma.experimentFoundationVersionLockDependencyV2.count({
        where: { versionLock: { externalPiWorkOrderRevisionId: workOrderRevisionId } },
      }),
      prisma.experimentFoundationRunRecipeV2.count({
        where: { externalPiWorkOrderRevisionId: workOrderRevisionId },
      }),
      prisma.experimentFoundationTrainingTaskSpecV2.count({
        where: { externalPiWorkOrderRevisionId: workOrderRevisionId },
      }),
      prisma.experimentFoundationRunV2.count({
        where: { externalPiWorkOrderRevisionId: workOrderRevisionId },
      }),
      prisma.experimentFoundationRunCellV2.count({
        where: { run: { externalPiWorkOrderRevisionId: workOrderRevisionId } },
      }),
      prisma.experimentFoundationIntegrationOutboxV2.count({ where: { workOrderRevisionId } }),
    ]);
  return { inbox, versionLock, versionLockDependency, recipe, taskSpec, run, runCell, outbox };
}

function asDatasetRef(
  ref: ExperimentFoundationV2ExactAssetRevisionRef,
): ExperimentFoundationV2ExactAssetRevisionRef & { asset_type: 'Dataset' } {
  assert.equal(ref.asset_type, 'Dataset');
  return { ...ref, asset_type: 'Dataset' };
}

async function expectDatabaseConstraint(
  operation: Promise<unknown>,
  evidence: string,
): Promise<void> {
  await assert.rejects(operation, (error) => {
    const rendered = renderError(error).toLowerCase();
    return rendered.includes(evidence.toLowerCase())
      || (evidence === 'foreign key' && rendered.includes('p2003'));
  });
}

function renderError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const details = error as Error & { code?: string; meta?: unknown };
  return `${details.name} ${details.message} ${details.code ?? ''} ${JSON.stringify(details.meta)}`;
}
