import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  StartWorkflowSimulationV2Response,
  WorkflowSimulationStatusV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';

import { buildApp, resolveTitleCardManagementStoreConfig } from '../src/app.js';
import { getPrismaClient } from '../src/repositories/prisma/prisma-client.js';
import {
  PrismaExperimentFoundationExecutionV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.js';
import {
  PrismaExperimentFoundationV2Repository,
} from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import {
  ExperimentFoundationProviderCommandV2Worker,
} from '../src/services/experiment-foundation-provider-command-v2-worker.js';
import {
  DeterministicFakeAliyunPaiDlcTransport,
} from '../src/services/experiment-foundation-v2-deterministic-fake-provider.js';
import {
  ExperimentFoundationV2ProviderPayloadService,
} from '../src/services/experiment-foundation-v2-provider-payload-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTables,
} from './experiment-foundation-named-local-evidence.js';
import {
  sha256Bytes,
  writeJsonAtomic,
} from '../../../.ai/scripts/lib/experiment-v2-evidence.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const DURABLE_ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  'dev-docs/active/experiment-foundation-productization-closure/artifacts',
);
const REVIEWED_TARGET_FINGERPRINT =
  'sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0';
const REVIEWED_DATABASE = 'postgres';
const REVIEWED_SCHEMA = 'my_researcher_dev';
const REVIEWED_HOST = '127.0.0.1';
const REVIEWED_PORT = '5432';
const REVIEWED_NAMED_LOCAL_TARGET = Object.freeze({
  database: REVIEWED_DATABASE,
  schema: REVIEWED_SCHEMA,
  host: REVIEWED_HOST,
  port: REVIEWED_PORT,
  fingerprint: REVIEWED_TARGET_FINGERPRINT,
});
const BUSINESS_IDEMPOTENCY_KEY = 'packb-product-p313-two-cell-v1';

const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;

const PACK_A_V2_TABLES = [
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
] as const;

const PI_AUTHORITY_TABLES = Prisma.dmmf.datamodel.models
  .map((model) => model.dbName ?? model.name)
  .filter((tableName) => tableName.startsWith('PaperImplementation'));

const PRODUCT_SOURCE_TABLES = [
  'PaperProject',
  'TopicSelectionPaperProjectBridge',
] as const;

const LEGACY_TABLES = [
  'PaperImplementationResearchWorkOrder',
  'PaperImplementationWorkOrderHarnessRun',
  'ExperimentFoundationRecord',
  'ExperimentFoundationReadinessReport',
  'ExperimentFoundationExternalTrainingJob',
] as const;

const SCIENTIFIC_TABLES = [
  'PaperImplementationRunEvidenceUnit',
  'PaperImplementationResultInterpretationPacket',
  'PaperImplementationClaimCandidate',
  'PaperImplementationDossier',
] as const;

const PROTECTED_TABLES = [...new Set([
  ...PACK_A_V2_TABLES,
  ...PI_AUTHORITY_TABLES,
  ...PRODUCT_SOURCE_TABLES,
  ...LEGACY_TABLES,
  ...SCIENTIFIC_TABLES,
])];

type ScriptMode = 'apply' | 'verify';

interface ScriptArgs {
  mode: ScriptMode;
  runId: string;
  packAEvidencePath: string;
  outputPath: string;
}

interface PackAProductEvidence {
  status: 'passed';
  mode: 'verify';
  target: { fingerprint: string };
  configuration: {
    cutover_committed: true;
    admission_enabled: false;
    workflow_simulation_enabled: false;
  };
  source_scope: { paper_project_id: string };
  product_state: {
    implementation_project_id: string;
    validation_cycle_id: string;
    branch_id: string;
    work_order_revision_id: string;
    work_order_revision_hash: string;
    cell_count: number;
    cell_keys: string[];
    run_id: string;
    run_manifest_hash: string;
    acknowledgement_inbox_id: string;
    acknowledgement_count: number;
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  assertExpectedConfig(args.mode);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    REVIEWED_NAMED_LOCAL_TARGET,
    'PACK_B_PRODUCT_NAMED_LOCAL_TARGET_MISMATCH',
  );
  assert.equal(strictBoolean('AUTO_PULL_SCHEDULER_ENABLED'), false);

  const rawPackAEvidence = await fs.readFile(args.packAEvidencePath, 'utf8');
  const packAEvidence = parsePackAEvidence(JSON.parse(rawPackAEvidence) as unknown);
  const packAEvidenceSha256 = sha256Bytes(rawPackAEvidence);
  const storeConfig = resolveTitleCardManagementStoreConfig();
  assert.equal(storeConfig.paperImplementationStrategy, 'prisma');
  assert.equal(storeConfig.experimentFoundationStrategy, 'prisma');

  const prisma = getPrismaClient();
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  globalThis.fetch = (async () => {
    fetchCallCount += 1;
    throw new Error('PACK_B_PRODUCT_EXTERNAL_FETCH_DENIED');
  }) as typeof fetch;
  let app: ReturnType<typeof buildApp> | null = null;
  try {
    await prisma.$connect();
    const target = await assertExperimentFoundationLiveNamedLocalTarget(
      prisma,
      REVIEWED_NAMED_LOCAL_TARGET,
    );
    const executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
    const prerequisite = await executionRepository.resolveRunPrerequisite(
      packAEvidence.product_state.run_id,
    );
    assert.ok(prerequisite, 'Pack A product Run prerequisite is missing');
    assertExactPackAPrerequisite(packAEvidence, prerequisite);

    const assetService = new ExperimentFoundationV2Service(
      new PrismaExperimentFoundationV2Repository(prisma),
    );
    const readiness = await assetService.revalidateReadiness({
      target: prerequisite.readiness.target,
      readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
      expected_dependencies: prerequisite.readiness.ordered_dependencies.map(
        (entry) => entry.dependency,
      ),
    });
    assert.equal(readiness.attestation.status, 'passed');
    assert.equal(
      readiness.attestation.attestation_hash,
      prerequisite.readiness.readiness_attestation_hash,
    );

    await assertNoForeignPackBLineage(prisma, packAEvidence.product_state.run_id);
    const protectedBefore = await digestExperimentFoundationNamedLocalTables(
      prisma,
      PROTECTED_TABLES,
    );
    const packBBefore = await countExperimentFoundationNamedLocalTables(prisma, PACK_B_TABLES);

    app = buildApp({ backgroundWorkEnabled: false });
    await app.ready();
    let startResponse: StartWorkflowSimulationV2Response | null = null;
    let drainOutcomes: Array<Awaited<ReturnType<
      ExperimentFoundationProviderCommandV2Worker['runOnce']
    >>> = [];
    const transport = new DeterministicFakeAliyunPaiDlcTransport();
    if (args.mode === 'apply') {
      startResponse = await injectJson<StartWorkflowSimulationV2Response>(app, {
        method: 'POST',
        url: `/experiment-foundation/v2/runs/${encodeURIComponent(prerequisite.run.run_id)}`
          + '/workflow-simulations',
        payload: { business_idempotency_key: BUSINESS_IDEMPOTENCY_KEY },
        expectedStatuses: [200, 201],
      });
      assert.equal(startResponse.run_id, prerequisite.run.run_id);
      assert.equal(startResponse.run_manifest_hash, prerequisite.run.run_manifest_hash);
      assert.equal(startResponse.business_idempotency_key, BUSINESS_IDEMPOTENCY_KEY);
      assert.equal(startResponse.execution_attempts.length, prerequisite.cells.length);

      const worker = new ExperimentFoundationProviderCommandV2Worker({
        repository: executionRepository,
        transport,
        leaseOwner: `packb-product-${args.runId}`,
      });
      for (let pass = 0; pass < 30; pass += 1) {
        const outcome = await worker.runOnce(100);
        drainOutcomes.push(outcome);
        const remaining = await prisma.experimentFoundationProviderCommandV2.count({
          where: { commandState: { in: ['pending', 'claimed'] } },
        });
        if (remaining === 0) break;
      }
      assert.equal(
        await prisma.experimentFoundationProviderCommandV2.count({
          where: { commandState: { in: ['pending', 'claimed'] } },
        }),
        0,
        'Committed Pack B commands did not drain to a terminal state',
      );
    }

    const status = await injectJson<WorkflowSimulationStatusV2>(app, {
      method: 'GET',
      url: `/experiment-foundation/v2/runs/${encodeURIComponent(prerequisite.run.run_id)}`
        + '/workflow-simulation-status',
      expectedStatuses: [200],
    });
    assertFinalStatus(status, prerequisite.cells.map((cell) => cell.run_cell.cell_key));
    const exactState = await assertExactPackBState(
      prisma,
      executionRepository,
      prerequisite.run.run_id,
      prerequisite.implementation_project_id,
      prerequisite.validation_cycle_id,
    );
    const protectedAfter = await digestExperimentFoundationNamedLocalTables(
      prisma,
      PROTECTED_TABLES,
    );
    const packBAfter = await countExperimentFoundationNamedLocalTables(prisma, PACK_B_TABLES);
    assert.deepEqual(protectedAfter, protectedBefore, 'A protected authority table changed');
    assert.deepEqual(packBAfter, {
      ExperimentFoundationProviderPayloadV2: 2,
      ExperimentFoundationExecutionAttemptV2: 2,
      ExperimentFoundationExecutionAttemptEventV2: 12,
      ExperimentFoundationProviderCommandV2: 8,
      ExperimentFoundationCollectionAttemptV2: 2,
      ExperimentFoundationProvisionalOutputV2: 2,
    });
    await assertNoForeignPackBLineage(prisma, prerequisite.run.run_id);
    assert.equal(fetchCallCount, 0);
    assert.deepEqual(transport.getNetworkCensus(), {
      real_network_request_count: 0,
      create_job_call_count: 0,
    });

    const summary = {
      schema_version: 'experiment-foundation-packb-product-landing@v1',
      status: 'passed',
      mode: args.mode,
      run_id: args.runId,
      generated_at: new Date().toISOString(),
      target,
      source_pack_a_evidence: {
        path: path.relative(REPO_ROOT, args.packAEvidencePath),
        sha256: `sha256:${packAEvidenceSha256}`,
        status: packAEvidence.status,
        paper_project_id: packAEvidence.source_scope.paper_project_id,
      },
      configuration: {
        cutover_committed: true,
        admission_enabled: false,
        workflow_simulation_enabled: args.mode === 'apply',
        auto_pull_scheduler_enabled: false,
        background_work_enabled: false,
      },
      operation: {
        mutation_performed: args.mode === 'apply' && (
          startResponse?.replayed === false
          || drainOutcomes.some((outcome) => (
            outcome.completed_count + outcome.released_count + outcome.terminal_count > 0
          ))
        ),
        start_replayed: startResponse?.replayed ?? null,
        drain_outcomes: drainOutcomes,
      },
      exact_pack_a_prerequisite: {
        implementation_project_id: prerequisite.implementation_project_id,
        validation_cycle_id: prerequisite.validation_cycle_id,
        branch_id: prerequisite.external_pi_branch_id,
        work_order_revision_id: prerequisite.run.external_pi_work_order_revision_id,
        work_order_revision_hash: prerequisite.run.external_pi_work_order_revision_hash,
        run_id: prerequisite.run.run_id,
        run_manifest_hash: prerequisite.run.run_manifest_hash,
        run_cells: prerequisite.cells.map((cell) => ({
          ordinal: cell.run_cell.ordinal,
          run_cell_id: cell.run_cell.run_cell_id,
          cell_key: cell.run_cell.cell_key,
          training_task_spec_id: cell.task_spec.training_task_spec_id,
          training_task_spec_hash: cell.task_spec.task_spec_hash,
        })),
        acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
        readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
        dependency_manifest_hash: prerequisite.readiness.dependency_manifest_hash,
        ordered_dependency_count: prerequisite.readiness.ordered_dependencies.length,
      },
      workflow_simulation_status: status,
      exact_pack_b_state: exactState,
      pack_b_census_before: packBBefore,
      pack_b_write_census: packBAfter,
      protected_authority_fence: {
        table_count: PROTECTED_TABLES.length,
        changed_tables: [],
        before: protectedBefore,
        after: protectedAfter,
      },
      excluded_write_census: {
        pi_writes: 0,
        pack_a_authority_writes: 0,
        legacy_writes: 0,
        scientific_writes: 0,
        real_provider_requests: 0,
        create_job_calls: 0,
        fetch_calls: fetchCallCount,
        scientific_execution_status: status.scientific_execution_status,
        evidence_eligibility: status.evidence_eligibility,
      },
      fake_transport: {
        adapter_identity: 'deterministic_fake_aliyun_pai_dlc@v1',
        operation_ledger: transport.getOperationLedger(),
        network_census: transport.getNetworkCensus(),
      },
    };
    await writeJsonAtomic(args.outputPath, summary);
    process.stdout.write(`${JSON.stringify({
      status: 'passed',
      mode: args.mode,
      output: path.relative(REPO_ROOT, args.outputPath),
    })}\n`);
  } finally {
    if (app) await app.close();
    globalThis.fetch = originalFetch;
    await prisma.$disconnect();
  }
}

function assertExactPackAPrerequisite(
  evidence: PackAProductEvidence,
  prerequisite: NonNullable<Awaited<ReturnType<
    PrismaExperimentFoundationExecutionV2Repository['resolveRunPrerequisite']
  >>>,
): void {
  const state = evidence.product_state;
  assert.equal(prerequisite.implementation_project_id, state.implementation_project_id);
  assert.equal(prerequisite.validation_cycle_id, state.validation_cycle_id);
  assert.equal(prerequisite.external_pi_branch_id, state.branch_id);
  assert.equal(prerequisite.run.external_pi_work_order_revision_id, state.work_order_revision_id);
  assert.equal(prerequisite.run.external_pi_work_order_revision_hash, state.work_order_revision_hash);
  assert.equal(prerequisite.run.run_id, state.run_id);
  assert.equal(prerequisite.run.run_manifest_hash, state.run_manifest_hash);
  assert.equal(prerequisite.head_acknowledgement.inbox_id, state.acknowledgement_inbox_id);
  assert.equal(prerequisite.latest_branch_head_acknowledgement.inbox_id, state.acknowledgement_inbox_id);
  assert.equal(state.acknowledgement_count, 1);
  assert.equal(prerequisite.cells.length, state.cell_count);
  assert.deepEqual(
    prerequisite.cells.map((cell) => cell.run_cell.cell_key),
    state.cell_keys,
  );
  assert.equal(prerequisite.readiness.outcome, 'passed');
}

async function assertExactPackBState(
  prisma: PrismaClient,
  repository: PrismaExperimentFoundationExecutionV2Repository,
  runId: string,
  implementationProjectId: string,
  validationCycleId: string,
) {
  const payloadService = new ExperimentFoundationV2ProviderPayloadService();
  const payloads = await repository.listRunPayloads(runId);
  const attempts = await repository.listRunAttempts(runId);
  assert.equal(payloads.length, 2);
  assert.equal(attempts.length, 2);
  assert.equal(new Set(payloads.map((payload) => payload.run_cell_id)).size, 2);
  assert.ok(payloads.every((payload) => (
    payload.execution_mode === 'simulation'
    && payload.provenance === 'non_production_fake_provider'
    && payload.adapter_identity === 'deterministic_fake_aliyun_pai_dlc@v1'
    && !('canonical_payload_bytes' in payloadService.parseRedactedManifest(payload.redacted_manifest))
  )));

  const attemptEvidence = [];
  for (const attempt of attempts) {
    assert.equal(attempt.workflow_business_key, BUSINESS_IDEMPOTENCY_KEY);
    assert.equal(attempt.execution_mode, 'simulation');
    assert.equal(attempt.provenance, 'non_production_fake_provider');
    assert.equal(attempt.lifecycle_state, 'succeeded');
    const [events, commands, collections, outputs] = await Promise.all([
      repository.listAttemptEvents(attempt.id),
      repository.listAttemptCommands(attempt.id),
      repository.listAttemptCollections(attempt.id),
      prisma.experimentFoundationProvisionalOutputV2.findMany({
        where: { collectionAttempt: { executionAttemptId: attempt.id } },
        orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
      }),
    ]);
    assert.deepEqual(events.map((event) => event.event_sequence), [1, 2, 3, 4, 5, 6]);
    assert.deepEqual(events.map((event) => event.event_type), [
      'created',
      'submitted',
      'running',
      'succeeded',
      'collection_prepared',
      'collection_collected',
    ]);
    assert.equal(new Set(events.map((event) => event.event_hash)).size, 6);
    assert.deepEqual(commands.map((command) => command.command_sequence), [1, 2, 3, 4]);
    assert.deepEqual(commands.map((command) => command.operation), [
      'submit',
      'sync',
      'reconcile',
      'collect',
    ]);
    assert.ok(commands.every((command) => command.state === 'succeeded'));
    assert.equal(collections.length, 1);
    assert.equal(collections[0]?.collection_state, 'collected');
    assert.equal(outputs.length, 1);
    assert.equal(outputs[0]?.outputClass, 'diagnostic_only');
    attemptEvidence.push({
      execution_attempt_id: attempt.id,
      run_cell_id: attempt.run_cell_id,
      cell_key: attempt.cell_key,
      provider_payload_id: attempt.provider_payload_id,
      provider_payload_hash: attempt.provider_payload_hash,
      external_job_ref: attempt.external_job_ref,
      events: events.map((event) => ({
        id: event.id,
        sequence: event.event_sequence,
        type: event.event_type,
        hash: event.event_hash,
      })),
      commands: commands.map((command) => ({
        id: command.id,
        sequence: command.command_sequence,
        operation: command.operation,
        hash: command.command_hash,
        response_hash: command.response_hash,
        attempt_count: command.attempt_count,
      })),
      collection: {
        id: collections[0]?.id,
        state: collections[0]?.collection_state,
        request_hash: collections[0]?.request_hash,
      },
      provisional_output: {
        id: outputs[0]?.id,
        ordinal: outputs[0]?.ordinal,
        kind: outputs[0]?.outputKind,
        class: outputs[0]?.outputClass,
        hash: outputs[0]?.outputHash,
      },
    });
  }

  const activeRealAttemptRefs = await repository.listCycleActiveRealAttemptRefs({
    implementation_project_id: implementationProjectId,
    validation_cycle_id: validationCycleId,
  });
  assert.deepEqual(activeRealAttemptRefs, []);
  return {
    business_idempotency_key: BUSINESS_IDEMPOTENCY_KEY,
    provider_payload_count: payloads.length,
    attempts: attemptEvidence,
    cycle_active_real_attempt_count: activeRealAttemptRefs.length,
  };
}

function assertFinalStatus(status: WorkflowSimulationStatusV2, cellKeys: string[]): void {
  assert.equal(status.workflow_simulation_status, 'workflow_simulation_passed');
  assert.equal(status.required_cell_count, 2);
  assert.equal(status.terminal_cell_count, 2);
  assert.equal(status.collected_cell_count, 2);
  assert.equal(status.scientific_execution_status, 'not_started');
  assert.equal(status.evidence_eligibility, false);
  assert.deepEqual(status.cells.map((cell) => cell.cell_key), cellKeys);
  assert.ok(status.cells.every((cell) => (
    cell.latest_attempt_state === 'succeeded'
    && cell.latest_collection_state === 'collected'
  )));
}

async function assertNoForeignPackBLineage(prisma: PrismaClient, runId: string): Promise<void> {
  const counts = await Promise.all([
    prisma.experimentFoundationProviderPayloadV2.count({ where: { runId: { not: runId } } }),
    prisma.experimentFoundationExecutionAttemptV2.count({ where: { runId: { not: runId } } }),
    prisma.experimentFoundationExecutionAttemptEventV2.count({
      where: { executionAttempt: { runId: { not: runId } } },
    }),
    prisma.experimentFoundationProviderCommandV2.count({
      where: { executionAttempt: { runId: { not: runId } } },
    }),
    prisma.experimentFoundationCollectionAttemptV2.count({
      where: { executionAttempt: { runId: { not: runId } } },
    }),
    prisma.experimentFoundationProvisionalOutputV2.count({
      where: { collectionAttempt: { executionAttempt: { runId: { not: runId } } } },
    }),
    prisma.experimentFoundationExecutionAttemptV2.count({
      where: { runId, workflowBusinessKey: { not: BUSINESS_IDEMPOTENCY_KEY } },
    }),
  ]);
  assert.ok(counts.every((count) => count === 0), `Foreign Pack B lineage detected: ${counts}`);
}

function parsePackAEvidence(value: unknown): PackAProductEvidence {
  const root = asObject(value, 'Pack A evidence');
  const target = asObject(root.target, 'Pack A target');
  const configuration = asObject(root.configuration, 'Pack A configuration');
  const sourceScope = asObject(root.source_scope, 'Pack A source_scope');
  const state = asObject(root.product_state, 'Pack A product_state');
  assert.equal(root.status, 'passed');
  assert.equal(root.mode, 'verify');
  assert.equal(target.fingerprint, REVIEWED_TARGET_FINGERPRINT);
  assert.equal(configuration.cutover_committed, true);
  assert.equal(configuration.admission_enabled, false);
  assert.equal(configuration.workflow_simulation_enabled, false);
  assert.equal(state.acknowledgement_count, 1);
  assert.equal(state.cell_count, 2);
  if (!Array.isArray(state.cell_keys) || state.cell_keys.some((entry) => typeof entry !== 'string')) {
    throw new Error('Pack A product_state.cell_keys is invalid');
  }
  return {
    status: 'passed',
    mode: 'verify',
    target: { fingerprint: asString(target.fingerprint, 'target.fingerprint') },
    configuration: {
      cutover_committed: true,
      admission_enabled: false,
      workflow_simulation_enabled: false,
    },
    source_scope: {
      paper_project_id: asString(sourceScope.paper_project_id, 'paper_project_id'),
    },
    product_state: {
      implementation_project_id: asString(state.implementation_project_id, 'implementation_project_id'),
      validation_cycle_id: asString(state.validation_cycle_id, 'validation_cycle_id'),
      branch_id: asString(state.branch_id, 'branch_id'),
      work_order_revision_id: asString(state.work_order_revision_id, 'work_order_revision_id'),
      work_order_revision_hash: asString(state.work_order_revision_hash, 'work_order_revision_hash'),
      cell_count: state.cell_count as number,
      cell_keys: [...state.cell_keys] as string[],
      run_id: asString(state.run_id, 'run_id'),
      run_manifest_hash: asString(state.run_manifest_hash, 'run_manifest_hash'),
      acknowledgement_inbox_id: asString(state.acknowledgement_inbox_id, 'acknowledgement_inbox_id'),
      acknowledgement_count: state.acknowledgement_count as number,
    },
  };
}

async function injectJson<T>(
  app: ReturnType<typeof buildApp>,
  input: {
    method: 'GET' | 'POST';
    url: string;
    payload?: unknown;
    expectedStatuses: number[];
  },
): Promise<T> {
  const response = await app.inject({
    method: input.method,
    url: input.url,
    headers: input.payload === undefined ? undefined : { 'content-type': 'application/json' },
    payload: input.payload === undefined ? undefined : JSON.stringify(input.payload),
  });
  if (!input.expectedStatuses.includes(response.statusCode)) {
    throw new Error(`Product route failed ${response.statusCode} ${input.url}: ${response.body}`);
  }
  return response.json() as T;
}

function assertExpectedConfig(mode: ScriptMode): void {
  assert.equal(strictBoolean('PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED'), true);
  assert.equal(strictBoolean('PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED'), false);
  assert.equal(
    strictBoolean('EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED'),
    mode === 'apply',
  );
}

function strictBoolean(key: string): boolean {
  const raw = process.env[key]?.trim().toLowerCase();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`${key} must be explicitly true or false`);
}

function parseArgs(argv: string[]): ScriptArgs {
  let mode: ScriptMode | null = null;
  let runId: string | null = null;
  let packAEvidence: string | null = null;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1] ?? null;
    if (key === '--mode') {
      if (value !== 'apply' && value !== 'verify') throw new Error('--mode must be apply or verify');
      mode = value;
    } else if (key === '--run-id') {
      runId = value;
    } else if (key === '--pack-a-evidence') {
      packAEvidence = value;
    } else if (key === '--output') {
      output = value;
    } else {
      throw new Error(`Unknown argument: ${key}`);
    }
    index += 1;
  }
  if (!mode) throw new Error('--mode is required');
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(runId)) {
    throw new Error('--run-id must contain 1..64 safe filename characters');
  }
  if (!packAEvidence) throw new Error('--pack-a-evidence is required');
  const packAEvidencePath = path.resolve(REPO_ROOT, packAEvidence);
  const outputPath = output
    ? path.resolve(REPO_ROOT, output)
    : path.join(ARTIFACT_ROOT, runId, 'packb-product-landing.json');
  if (
    !outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)
    && !outputPath.startsWith(`${DURABLE_ARTIFACT_ROOT}${path.sep}`)
  ) {
    throw new Error('--output must stay under the Pack B temporary or durable artifact root');
  }
  if (!packAEvidencePath.startsWith(`${DURABLE_ARTIFACT_ROOT}${path.sep}`)) {
    throw new Error('--pack-a-evidence must stay under the durable T-132 artifact root');
  }
  return { mode, runId, packAEvidencePath, outputPath };
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} must be a string`);
  return value;
}

await main();
