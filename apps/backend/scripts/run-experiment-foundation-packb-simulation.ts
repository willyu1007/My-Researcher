import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import {
  EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-execution-v2-contracts';
import { canonicalizeExperimentV2Json } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import { EXPERIMENT_V2_HASH_PATTERN } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';

import { PrismaExperimentFoundationExecutionV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import {
  requireDisposablePostgresDatabaseIdentity,
} from '../src/test-support/disposable-postgres-test-database.js';
import { buildExperimentFoundationD19TypedFixture } from '../src/services/experiment-foundation-d19-fixture.js';
import { buildExperimentFoundationD19AdmissionRequestTemplate } from '../src/services/experiment-foundation-d19-fixture-import-service.js';
import { ExperimentFoundationExecutionV2Service } from '../src/services/experiment-foundation-execution-v2-service.js';
import { ExperimentFoundationProviderCommandV2Worker } from '../src/services/experiment-foundation-provider-command-v2-worker.js';
import { ExperimentFoundationV2AcknowledgementService } from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  DeterministicFakeAliyunPaiDlcTransport,
} from '../src/services/experiment-foundation-v2-deterministic-fake-provider.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2ProviderPayloadService } from '../src/services/experiment-foundation-v2-provider-payload-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2AdmissionService } from '../src/services/paper-implementation-experiment-v2-admission-service.js';
import { PaperImplementationExperimentV2HeadService } from '../src/services/paper-implementation-experiment-v2-head-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ARTIFACT_ROOT = path.join(REPO_ROOT, '.ai/.tmp/experiment-foundation-productization');
const SERVER_ACTOR = 'system:paper-implementation-experiment-v2-admission';
const IMPLEMENTATION_PROJECT_ID = 'd19-implementation-project';
const VALIDATION_CYCLE_ID = 'd19-validation-cycle';
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;
const PACK_B_CENSUS_KEYS = [
  'provider_payload',
  'execution_attempt',
  'execution_attempt_event',
  'provider_command',
  'collection_attempt',
  'provisional_output',
] as const;
const REQUIRED_PACK_A_CHECKS = [
  'A01', 'A02', 'A03', 'A04',
  'B01', 'B02', 'B03', 'B04', 'B05', 'B06', 'B07', 'B08', 'B09', 'B10',
] as const;
const REQUIRED_PACK_B_CHECKS = [
  'PB01', 'PB02', 'PB03', 'PB04', 'PB05', 'PB06', 'PB07', 'PB08',
  'PB09', 'PB10', 'PB11', 'PB12', 'PB13', 'PB14', 'PB15', 'PB16',
] as const;

interface ScriptArgs {
  outputPath: string;
  packAEvidencePath: string;
}

interface TableSnapshot {
  count: number;
  digest: string;
}

interface DisposableDatabaseIdentity {
  databaseUrl: string;
  expectedDatabaseName: string;
  expectedMarker: string;
}

type PackACheckId = (typeof REQUIRED_PACK_A_CHECKS)[number];
type PackBCensusKey = (typeof PACK_B_CENSUS_KEYS)[number];

interface ValidatedPackAEvidence {
  status: 'passed';
  checks: Record<PackACheckId, { status: 'passed' }>;
  pack_b_zero_census: Record<PackBCensusKey, number>;
  migration_digest: string;
  fixture: {
    branch_id: string;
    work_order_revision_id: string;
    work_order_revision_hash: string;
    version_lock_id: string;
    version_lock_hash: string;
    run_recipe_id: string;
    run_recipe_hash: string;
    run_id: string;
    run_manifest_hash: string;
    acknowledgement_inbox_id: string;
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const disposableIdentity = requireDisposableDatabaseIdentity();
  const outputRelativePath = path.relative(REPO_ROOT, args.outputPath);
  const rawPackAEvidence: unknown = JSON.parse(
    await fs.readFile(args.packAEvidencePath, 'utf8'),
  );
  const packAEvidence = parsePackAEvidence(rawPackAEvidence);

  const prisma = new PrismaClient({
    datasources: { db: { url: disposableIdentity.databaseUrl } },
  });
  const networkProbe = installExternalRequestProbe();
  try {
    await prisma.$connect();
    const databaseMarkerHash = await assertFreshDisposableDatabase(
      prisma,
      disposableIdentity,
    );
    const simulationOnlyDomains = await assertSimulationOnlyPersistenceDomains(prisma);

    const clock = controllableClock();
    const idFactory = deterministicIdFactory();
    const assetRepository = new PrismaExperimentFoundationV2Repository(prisma);
    const assetService = new ExperimentFoundationV2Service(assetRepository, {
      now: clock.now,
      idGenerator: (kind) => idFactory(`packb_asset_${kind}`),
    });
    const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
    const efSpineRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
    const executionRepository = new PrismaExperimentFoundationExecutionV2Repository(prisma);
    const cycleClosureLookup = new PrismaPaperImplementationValidationCycleClosureV2Repository(
      prisma,
    );

    const fixture = await buildExperimentFoundationD19TypedFixture(assetService);
    const admissionRequest = buildExperimentFoundationD19AdmissionRequestTemplate(fixture);
    const admissionService = new PaperImplementationExperimentV2AdmissionService({
      repository: piRepository,
      scopeReader: {
        async resolveExactScope(implementationProjectId, validationCycleId) {
          return implementationProjectId === IMPLEMENTATION_PROJECT_ID
            && validationCycleId === VALIDATION_CYCLE_ID
            ? {
              implementation_project_id: implementationProjectId,
              validation_cycle_id: validationCycleId,
              implementation_project_lifecycle_status: 'active',
              validation_cycle_lifecycle_status: 'admitted',
            }
            : null;
        },
      },
      admissionEnabled: () => true,
      cycleClosureLookup,
      serverActorId: SERVER_ACTOR,
      idFactory,
      now: clock.now,
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
      repository: efSpineRepository,
      readinessResolver,
      cycleClosureLookup,
      idFactory,
      now: clock.now,
    });
    const headService = new PaperImplementationExperimentV2HeadService({
      repository: piRepository,
      cycleClosureLookup,
      idFactory,
      now: clock.now,
    });
    const acknowledgementService = new ExperimentFoundationV2AcknowledgementService({
      repository: efSpineRepository,
      idFactory,
      now: clock.now,
    });

    const admitted = await admissionService.admit({
      implementation_project_id: IMPLEMENTATION_PROJECT_ID,
      validation_cycle_id: VALIDATION_CYCLE_ID,
      request: admissionRequest,
      admitted_by: SERVER_ACTOR,
    });
    const relay = new ExperimentV2IntegrationRelayService({
      paperImplementationRepository: piRepository,
      experimentFoundationRepository: efSpineRepository,
      materializationConsumer: materializationService,
      headConsumer: headService,
      acknowledgementConsumer: acknowledgementService,
      workerId: 'packb-prerequisite-relay',
      now: clock.now,
      leaseDurationMs: 30_000,
      retryDelayMs: 0,
    });
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
    assert.equal(relayOutcome.idle, true);
    assert.equal(relayOutcome.failures.length, 0);
    assert.equal(relayOutcome.delivered, 3);

    const materialization = await efSpineRepository.findMaterializationByRevision(
      admitted.revision.work_order_revision_id,
    );
    assert.ok(materialization);
    assert.equal(materialization.run_cells.length, 2);
    const prerequisite = await executionRepository.resolveRunPrerequisite(materialization.run.run_id);
    assert.ok(prerequisite);
    assert.equal(prerequisite.cells.length, 2);
    assert.equal(prerequisite.head_acknowledgement.run_id, materialization.run.run_id);
    assert.equal(prerequisite.head_acknowledgement.run_manifest_hash, materialization.run.run_manifest_hash);
    assert.equal(prerequisite.readiness.outcome, 'passed');
    await assetService.revalidateReadiness({
      target: prerequisite.readiness.target,
      readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
      expected_dependencies: prerequisite.readiness.ordered_dependencies.map(
        (row) => row.dependency,
      ),
    });

    const authorityBefore = await snapshotNonPackBTables(prisma);
    const packBBefore = await packBCensus(prisma);
    assert.equal(sumCounts(packBBefore), 0);

    let intakeEnabled = false;
    const providerPayloadService = new ExperimentFoundationV2ProviderPayloadService();
    const executionService = new ExperimentFoundationExecutionV2Service({
      repository: executionRepository,
      readinessRevalidator: assetService,
      intakeEnabled: () => intakeEnabled,
      cycleClosureLookup,
      payloadService: providerPayloadService,
      now: clock.now,
      idGenerator: (kind) => idFactory(`packb_${kind}`),
    });
    const transport = new DeterministicFakeAliyunPaiDlcTransport([
      {
        operation: 'submit',
        invocation: 1,
        kind: 'retryable_after_acceptance',
        error_code: 'PACKB_ACCEPTED_RESPONSE_LOST_PROBE',
      },
    ]);

    await expectReason(
      () => executionService.startWorkflowSimulation(materialization.run.run_id, {
        business_idempotency_key: 'packb-capability-off',
      }),
      'EF_V2_WORKFLOW_SIMULATION_DISABLED',
    );
    assert.deepEqual(await packBCensus(prisma), packBBefore);
    assert.equal(transport.getOperationLedger().length, 0);

    intakeEnabled = true;
    const start = await executionService.startWorkflowSimulation(materialization.run.run_id, {
      business_idempotency_key: 'packb-d19-two-cell-simulation-v1',
    });
    assert.equal(start.replayed, false);
    assert.equal(start.provider_payloads.length, 2);
    assert.equal(start.execution_attempts.length, 2);
    assert.deepEqual(
      start.execution_attempts.map((attempt) => attempt.cell_key),
      prerequisite.cells.map((cell) => cell.run_cell.cell_key),
    );
    const afterStart = await packBCensus(prisma);
    const replay = await executionService.startWorkflowSimulation(materialization.run.run_id, {
      business_idempotency_key: 'packb-d19-two-cell-simulation-v1',
    });
    assert.equal(replay.replayed, true);
    assert.deepEqual(await packBCensus(prisma), afterStart);

    const leaseEvidence = await exerciseLeaseFencing(executionRepository, clock);
    const crashBeforeTransport = await packBCensus(prisma);
    assert.equal(crashBeforeTransport.provider_command, 2);
    assert.equal(transport.getOperationLedger().length, 0);

    intakeEnabled = false;
    await expectReason(
      () => executionService.startWorkflowSimulation(materialization.run.run_id, {
        business_idempotency_key: 'packb-disabled-after-commit',
      }),
      'EF_V2_WORKFLOW_SIMULATION_DISABLED',
    );

    const worker = new ExperimentFoundationProviderCommandV2Worker({
      repository: executionRepository,
      transport,
      payloadService: providerPayloadService,
      leaseOwner: 'packb-provider-worker',
      leaseMs: 10_000,
      maximumCommandAttempts: 10,
      now: clock.now,
      idGenerator: (kind) => idFactory(`packb_${kind}`),
    });
    await installSingleFailureTrigger(prisma);
    try {
      await assert.rejects(() => worker.runOnce(100));
    } finally {
      await dropSingleFailureTrigger(prisma);
    }
    const postCommitFailureCensus = await packBCensus(prisma);
    assert.equal(postCommitFailureCensus.execution_attempt_event, 2);
    clock.advance(60_000);

    const drainOutcomes = [];
    for (let pass = 0; pass < 30; pass += 1) {
      const outcome = await worker.runOnce(100);
      drainOutcomes.push(outcome);
      const remaining = await prisma.experimentFoundationProviderCommandV2.count({
        where: { commandState: { in: ['pending', 'claimed'] } },
      });
      if (remaining === 0) break;
      clock.advance(60_000);
    }
    assert.equal(
      await prisma.experimentFoundationProviderCommandV2.count({
        where: { commandState: { in: ['pending', 'claimed'] } },
      }),
      0,
    );

    const finalStatus = await executionService.getWorkflowSimulationStatus(materialization.run.run_id);
    assert.equal(finalStatus.workflow_simulation_status, 'workflow_simulation_passed');
    assert.equal(finalStatus.required_cell_count, 2);
    assert.equal(finalStatus.terminal_cell_count, 2);
    assert.equal(finalStatus.collected_cell_count, 2);
    assert.equal(finalStatus.scientific_execution_status, 'not_started');
    assert.equal(finalStatus.evidence_eligibility, false);

    const attempts = await executionRepository.listRunAttempts(materialization.run.run_id);
    assert.equal(attempts.length, 2);
    assert.ok(attempts.every((attempt) => attempt.lifecycle_state === 'succeeded'));
    const attemptEvidence = [];
    for (const attempt of attempts) {
      const [events, commands, collections, outputs] = await Promise.all([
        executionRepository.listAttemptEvents(attempt.id),
        executionRepository.listAttemptCommands(attempt.id),
        executionRepository.listAttemptCollections(attempt.id),
        prisma.experimentFoundationProvisionalOutputV2.findMany({
          where: { collectionAttempt: { executionAttemptId: attempt.id } },
          orderBy: [{ ordinal: 'asc' }, { id: 'asc' }],
        }),
      ]);
      assert.deepEqual(events.map((event) => event.event_sequence), [1, 2, 3, 4, 5, 6]);
      assert.equal(new Set(events.map((event) => event.event_hash)).size, events.length);
      assert.equal(commands.length, 4);
      assert.ok(commands.every((command) => command.state === 'succeeded'));
      assert.equal(collections.length, 1);
      assert.equal(collections[0]!.collection_state, 'collected');
      assert.equal(outputs.length, 1);
      assert.ok(outputs.every((output) => output.outputClass === 'diagnostic_only'));
      attemptEvidence.push({
        execution_attempt_id: attempt.id,
        run_cell_id: attempt.run_cell_id,
        cell_key: attempt.cell_key,
        provider_payload_id: attempt.provider_payload_id,
        provider_payload_hash: attempt.provider_payload_hash,
        provider_idempotency_key: attempt.provider_idempotency_key,
        external_job_ref: attempt.external_job_ref,
        event_refs: events.map((event) => ({
          id: event.id,
          sequence: event.event_sequence,
          type: event.event_type,
          hash: event.event_hash,
        })),
        command_refs: commands.map((command) => ({
          id: command.id,
          sequence: command.command_sequence,
          operation: command.operation,
          hash: command.command_hash,
          response_hash: command.response_hash,
          attempt_count: command.attempt_count,
        })),
        collection: {
          id: collections[0]!.id,
          request_hash: collections[0]!.request_hash,
          state: collections[0]!.collection_state,
        },
        provisional_outputs: outputs.map((output) => ({
          id: output.id,
          ordinal: output.ordinal,
          kind: output.outputKind,
          class: output.outputClass,
          hash: output.outputHash,
        })),
      });
    }

    const activeRealAttemptRefs = await executionRepository.listCycleActiveRealAttemptRefs({
      implementation_project_id: IMPLEMENTATION_PROJECT_ID,
      validation_cycle_id: VALIDATION_CYCLE_ID,
    });
    assert.deepEqual(activeRealAttemptRefs, []);
    assert.deepEqual([...EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2], ['simulation']);
    const cycleActiveRealAttemptFence = {
      repository_query_invoked: true,
      query_scope: {
        implementation_project_id: IMPLEMENTATION_PROJECT_ID,
        validation_cycle_id: VALIDATION_CYCLE_ID,
        execution_mode: 'real',
        lifecycle_states: ['prepared', 'submitted', 'running'],
        run_filter: null,
        head_filter: null,
      },
      active_real_attempt_count: activeRealAttemptRefs.length,
      active_real_attempt_refs: activeRealAttemptRefs,
      pack_b_writer_execution_modes: [...EXPERIMENT_FOUNDATION_EXECUTION_MODES_V2],
      attempt_persistence_execution_mode: simulationOnlyDomains.attempt_execution_mode,
      attempt_persistence_provenance: simulationOnlyDomains.attempt_provenance,
    } as const;

    const payloads = await executionRepository.listRunPayloads(materialization.run.run_id);
    assert.equal(payloads.length, 2);
    assert.ok(payloads.every((payload) => (
      payload.execution_mode === 'simulation'
      && payload.provenance === 'non_production_fake_provider'
      && !(
        'canonical_payload_bytes' in providerPayloadService.parseRedactedManifest(
          payload.redacted_manifest,
        )
      )
    )));
    const ledger = transport.getOperationLedger();
    assert.ok(ledger.some((entry) => entry.outcome === 'fault_after_acceptance'));
    assert.ok(ledger.length > 8);
    for (const attempt of attempts) {
      const entries = ledger.filter(
        (entry) => entry.provider_idempotency_key === attempt.provider_idempotency_key,
      );
      assert.ok(entries.length >= 4);
      assert.deepEqual([...new Set(entries.map((entry) => entry.payload_hash))], [
        attempt.provider_payload_hash,
      ]);
      assert.equal(new Set(entries.map((entry) => entry.payload_byte_size)).size, 1);
      assert.equal(new Set(entries.map((entry) => entry.external_job_ref)).size, 1);
    }
    assert.deepEqual(transport.getNetworkCensus(), {
      real_network_request_count: 0,
      create_job_call_count: 0,
    });
    assert.equal(networkProbe.fetchCallCount(), 0);

    const finalCensus = await packBCensus(prisma);
    assert.deepEqual(finalCensus, {
      provider_payload: 2,
      execution_attempt: 2,
      execution_attempt_event: 12,
      provider_command: 8,
      collection_attempt: 2,
      provisional_output: 2,
    });
    const authorityAfter = await snapshotNonPackBTables(prisma);
    assert.deepEqual(authorityAfter, authorityBefore);
    const checks = createChecks(outputRelativePath, {
      PB01: 'Two exact canonical payload hashes and redacted manifests survived re-materialization; invalid/caller-authored cases are covered by the targeted contract/materializer tests.',
      PB02: 'The outer gate statically approved exactly six Pack B families and the additive migration boundary.',
      PB03: 'Default-off intake produced zero Pack B rows and zero fake/network transport; strict configuration is covered by the targeted composition tests.',
      PB04: 'A fresh D-19 Pack A Run, exact two-cell manifest, processed final head receipt and exact readiness were revalidated before E1.',
      PB05: 'E1 committed two payload/Attempt/event/submit-command bundles atomically and exact replay added zero rows.',
      PB06: `Concurrent claim, expiry reclaim and stale-owner fencing passed: ${JSON.stringify(leaseEvidence)}.`,
      PB07: 'Crash-before-transport, fake accepted-response loss and injected event-commit failure converged to two Attempts and two stable fake job identities.',
      PB08: 'Every submit/sync/reconcile/collect ledger entry reused its Attempt payload hash, byte size and provider idempotency identity.',
      PB09: 'Each Attempt rebuilt as created->submitted->running->succeeded->collection_prepared->collection_collected with no duplicate hash.',
      PB10: 'Pre-submit cancellation/restart convergence is covered by targeted tests; golden intake remained disabled after E1 while committed commands drained.',
      PB11: 'Exactly two stable CollectionAttempts and two immutable diagnostic-only outputs were committed without scientific publication.',
      PB12: 'Event-only two-cell projection passed and every non-Pack-B table digest, including Run/RunCell/TaskSpec, stayed unchanged after E1.',
      PB13: 'All non-Pack-B application-table digests stayed unchanged; fetch/network/CreateJob counters are zero.',
      PB14: 'The Cycle-wide repository fence queried active real Attempts without Run/head filtering and returned empty; Pack B writer contracts and PostgreSQL domains remain simulation-only.',
      PB15: 'Capability disable rejected new E1 while all already-committed commands drained through collection.',
      PB16: 'Disposable real PostgreSQL finished with two payloads, two Attempts, two Collections and a terminal passed projection.',
    });

    const evidence = {
      status: 'passed',
      database_safety: {
        explicit_packb_url_required: true,
        database_url_match_required: true,
        loopback_host_required: true,
        dynamic_database_name_verified: true,
        server_marker_verified: true,
        server_marker_hash: databaseMarkerHash,
        database_url_stored: false,
      },
      pack_a_prerequisite: {
        d19_scenario_status: packAEvidence.status,
        required_checks: Object.fromEntries(
          REQUIRED_PACK_A_CHECKS.map((id) => [id, packAEvidence.checks?.[id]?.status]),
        ),
        implementation_project_id: IMPLEMENTATION_PROJECT_ID,
        validation_cycle_id: VALIDATION_CYCLE_ID,
        branch_id: admitted.branch.branch_id,
        work_order_revision_id: admitted.revision.work_order_revision_id,
        work_order_revision_hash: admitted.revision.content_hash,
        run_id: materialization.run.run_id,
        run_manifest_hash: materialization.run.run_manifest_hash,
        run_cells: materialization.run_cells.map((cell) => ({
          ordinal: cell.ordinal,
          run_cell_id: cell.run_cell_id,
          cell_key: cell.cell_key,
          training_task_spec_id: cell.training_task_spec_id,
          training_task_spec_hash: cell.training_task_spec_hash,
        })),
        acknowledgement_inbox_id: prerequisite.head_acknowledgement.inbox_id,
        acknowledgement_event_id: prerequisite.head_acknowledgement.event_id,
        acknowledgement_payload_hash: prerequisite.head_acknowledgement.event_payload_hash,
        readiness_attestation_id: prerequisite.readiness.readiness_attestation_id,
        readiness_attestation_hash: prerequisite.readiness.readiness_attestation_hash,
        dependency_manifest_hash: prerequisite.readiness.dependency_manifest_hash,
        ordered_dependency_count: prerequisite.readiness.ordered_dependencies.length,
      },
      provider_payloads: payloads.map((payload) => ({
        provider_payload_id: payload.id,
        materialization_key: payload.materialization_key,
        run_cell_id: payload.run_cell_id,
        training_task_spec_id: payload.training_task_spec_id,
        payload_hash: payload.payload_hash,
        payload_byte_size: payload.payload_byte_size,
        redacted_manifest: payload.redacted_manifest,
      })),
      attempts: attemptEvidence,
      command_drain: {
        lease_evidence: leaseEvidence,
        crash_before_transport_census: crashBeforeTransport,
        response_commit_failure_census: postCommitFailureCensus,
        drain_outcomes: drainOutcomes,
        transport_ledger: ledger,
      },
      workflow_simulation_status: finalStatus,
      pack_b_write_census: finalCensus,
      unchanged_non_pack_b_table_census: summarizeUnchanged(authorityBefore, authorityAfter),
      excluded_write_census: {
        changed_non_pack_b_tables: [],
        real_provider_requests: 0,
        create_job_calls: 0,
        fetch_calls: 0,
        scientific_execution_status: 'not_started',
        evidence_eligibility: false,
        legacy_writes: 0,
        scientific_writes: 0,
      },
      simulation_only_persistence_domains: simulationOnlyDomains,
      cycle_active_real_attempt_fence: cycleActiveRealAttemptFence,
      checks,
    };
    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify({ status: 'passed', output: outputRelativePath })}\n`);
  } finally {
    networkProbe.restore();
    await prisma.$disconnect();
  }
}

function parseArgs(argv: string[]): ScriptArgs {
  let output: string | null = null;
  let packAEvidence: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--output') {
      output = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argv[index] === '--pack-a-evidence') {
      packAEvidence = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!output || !packAEvidence) {
    throw new Error('--output and --pack-a-evidence are required');
  }
  const outputPath = path.resolve(REPO_ROOT, output);
  const packAEvidencePath = path.resolve(REPO_ROOT, packAEvidence);
  for (const candidate of [outputPath, packAEvidencePath]) {
    if (!candidate.startsWith(`${ARTIFACT_ROOT}${path.sep}`)) {
      throw new Error('Pack B evidence paths must be below .ai/.tmp/experiment-foundation-productization/');
    }
  }
  return { outputPath, packAEvidencePath };
}

function requireDisposableDatabaseIdentity(): DisposableDatabaseIdentity {
  const identity = requireDisposablePostgresDatabaseIdentity(process.env, 'packb', {
    databaseUrlKey: 'EXPERIMENT_FOUNDATION_PACKB_DATABASE_URL',
    nonceKey: 'EXPERIMENT_FOUNDATION_PACKB_DISPOSABLE_NONCE',
  });
  return {
    databaseUrl: identity.database_url,
    expectedDatabaseName: identity.database_name,
    expectedMarker: identity.marker,
  };
}

function parsePackAEvidence(evidence: unknown): ValidatedPackAEvidence {
  assertPlainObject(evidence, 'Pack A evidence');
  assert.equal(evidence.status, 'passed', 'Pack A evidence status is not passed');

  const checks = evidence.checks;
  assertPlainObject(checks, 'Pack A checks');
  assertExactKeys(checks, REQUIRED_PACK_A_CHECKS, 'Pack A checks');
  const validatedChecks = {} as ValidatedPackAEvidence['checks'];
  for (const id of REQUIRED_PACK_A_CHECKS) {
    const check: unknown = checks[id];
    assertPlainObject(check, `Pack A check ${id}`);
    assert.equal(check.status, 'passed', `Pack A check ${id} is not passed`);
    validatedChecks[id] = { status: 'passed' };
  }

  const zeroCensus = evidence.pack_b_zero_census;
  assertPlainObject(zeroCensus, 'Pack A Pack B zero census');
  assertExactKeys(zeroCensus, PACK_B_CENSUS_KEYS, 'Pack A Pack B zero census');
  const validatedZeroCensus = {} as ValidatedPackAEvidence['pack_b_zero_census'];
  for (const key of PACK_B_CENSUS_KEYS) {
    const count: unknown = zeroCensus[key];
    assert.ok(
      Number.isSafeInteger(count) && Number(count) >= 0,
      `Pack A Pack B zero census ${key} must be a nonnegative integer`,
    );
    assert.equal(count, 0, `Pack A Pack B zero census ${key} is not zero`);
    validatedZeroCensus[key] = Number(count);
  }

  const migrationDigest = requireSha256Ref(
    evidence.migration_digest,
    'Pack A migration_digest',
  );
  const fixture = evidence.fixture;
  assertPlainObject(fixture, 'Pack A fixture');
  const validatedFixture = {
    branch_id: requireIdentity(fixture.branch_id, 'Pack A fixture.branch_id'),
    work_order_revision_id: requireIdentity(
      fixture.work_order_revision_id,
      'Pack A fixture.work_order_revision_id',
    ),
    work_order_revision_hash: requireSha256Ref(
      fixture.work_order_revision_hash,
      'Pack A fixture.work_order_revision_hash',
    ),
    version_lock_id: requireIdentity(fixture.version_lock_id, 'Pack A fixture.version_lock_id'),
    version_lock_hash: requireSha256Ref(
      fixture.version_lock_hash,
      'Pack A fixture.version_lock_hash',
    ),
    run_recipe_id: requireIdentity(fixture.run_recipe_id, 'Pack A fixture.run_recipe_id'),
    run_recipe_hash: requireSha256Ref(
      fixture.run_recipe_hash,
      'Pack A fixture.run_recipe_hash',
    ),
    run_id: requireIdentity(fixture.run_id, 'Pack A fixture.run_id'),
    run_manifest_hash: requireSha256Ref(
      fixture.run_manifest_hash,
      'Pack A fixture.run_manifest_hash',
    ),
    acknowledgement_inbox_id: requireIdentity(
      fixture.acknowledgement_inbox_id,
      'Pack A fixture.acknowledgement_inbox_id',
    ),
  };

  return {
    status: 'passed',
    checks: validatedChecks,
    pack_b_zero_census: validatedZeroCensus,
    migration_digest: migrationDigest,
    fixture: validatedFixture,
  };
}

function assertPlainObject(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  assert.ok(
    typeof value === 'object'
      && value !== null
      && !Array.isArray(value)
      && (Object.getPrototypeOf(value) === Object.prototype
        || Object.getPrototypeOf(value) === null),
    `${label} must be a plain object`,
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  assert.deepEqual(
    Object.keys(value).sort(),
    [...expectedKeys].sort(),
    `${label} keys drifted`,
  );
}

function requireIdentity(value: unknown, label: string): string {
  assert.ok(
    typeof value === 'string' && value.length > 0 && value.trim() === value,
    `${label} must be a non-empty canonical identity`,
  );
  return value;
}

const SHA256_REF_PATTERN = new RegExp(EXPERIMENT_V2_HASH_PATTERN);

function requireSha256Ref(value: unknown, label: string): string {
  assert.ok(
    typeof value === 'string' && SHA256_REF_PATTERN.test(value),
    `${label} must be a canonical sha256 ref`,
  );
  return value;
}

async function assertFreshDisposableDatabase(
  prisma: PrismaClient,
  expected: DisposableDatabaseIdentity,
): Promise<string> {
  const identity = await prisma.$queryRaw<Array<{
    database_name: string;
    schema_name: string;
    database_marker: string | null;
  }>>`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      shobj_description(oid, 'pg_database') AS database_marker
    FROM pg_database
    WHERE datname = current_database()
  `;
  assert.deepEqual(identity, [{
    database_name: expected.expectedDatabaseName,
    schema_name: 'public',
    database_marker: expected.expectedMarker,
  }]);
  const applicationRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  assert.ok(Number(applicationRows[0]?.count ?? 0) > 0);
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT tablename AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
  for (const { table_name: tableName } of tables) {
    assert.match(tableName, /^[A-Za-z0-9_]+$/);
    const rows = await prisma.$queryRawUnsafe<Array<{ row_count: bigint }>>(
      `SELECT COUNT(*) AS row_count FROM "${tableName}"`,
    );
    assert.equal(
      Number(rows[0]?.row_count ?? 0),
      0,
      `Pack B disposable database is not fresh: ${tableName}`,
    );
  }
  return `sha256:${crypto.createHash('sha256').update(expected.expectedMarker).digest('hex')}`;
}

async function assertSimulationOnlyPersistenceDomains(prisma: PrismaClient) {
  const constraints = await prisma.$queryRaw<Array<{
    table_name: string;
    constraint_name: string;
    definition: string;
  }>>`
    SELECT
      class_row.relname AS table_name,
      constraint_row.conname AS constraint_name,
      pg_get_constraintdef(constraint_row.oid) AS definition
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS class_row ON class_row.oid = constraint_row.conrelid
    JOIN pg_namespace AS namespace_row ON namespace_row.oid = class_row.relnamespace
    WHERE namespace_row.nspname = 'public'
      AND class_row.relname IN (
        'ExperimentFoundationProviderPayloadV2',
        'ExperimentFoundationExecutionAttemptV2'
      )
      AND constraint_row.contype = 'c'
  `;
  const definitions = new Map(
    constraints.map((row) => [row.constraint_name, row.definition]),
  );
  const normalizeCheckDefinition = (definition: string | undefined) => (definition ?? '')
    .replaceAll('"', '')
    .replaceAll('::text', '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  assert.equal(
    normalizeCheckDefinition(definitions.get('ef_provider_payload_mode_check')),
    "CHECK executionMode = 'simulation'",
  );
  assert.equal(
    normalizeCheckDefinition(definitions.get('ef_provider_payload_provenance_check')),
    "CHECK provenance = 'non_production_fake_provider'",
  );
  assert.equal(
    normalizeCheckDefinition(definitions.get('ef_execution_attempt_mode_check')),
    "CHECK executionMode = 'simulation'",
  );
  assert.equal(
    normalizeCheckDefinition(definitions.get('ef_execution_attempt_provenance_check')),
    "CHECK provenance = 'non_production_fake_provider'",
  );
  return {
    payload_execution_mode: 'simulation',
    payload_provenance: 'non_production_fake_provider',
    attempt_execution_mode: 'simulation',
    attempt_provenance: 'non_production_fake_provider',
  } as const;
}

async function packBCensus(prisma: PrismaClient) {
  const counts = await Promise.all([
    prisma.experimentFoundationProviderPayloadV2.count(),
    prisma.experimentFoundationExecutionAttemptV2.count(),
    prisma.experimentFoundationExecutionAttemptEventV2.count(),
    prisma.experimentFoundationProviderCommandV2.count(),
    prisma.experimentFoundationCollectionAttemptV2.count(),
    prisma.experimentFoundationProvisionalOutputV2.count(),
  ]);
  return {
    provider_payload: counts[0],
    execution_attempt: counts[1],
    execution_attempt_event: counts[2],
    provider_command: counts[3],
    collection_attempt: counts[4],
    provisional_output: counts[5],
  };
}

async function exerciseLeaseFencing(
  repository: PrismaExperimentFoundationExecutionV2Repository,
  clock: ReturnType<typeof controllableClock>,
) {
  const concurrentClaimedAt = clock.now();
  const concurrentLeaseExpiresAt = new Date(
    Date.parse(concurrentClaimedAt) + 30_000,
  ).toISOString();
  const [left, right] = await Promise.all([
    repository.claimCommands({
      lease_owner: 'packb-lease-left',
      claimed_at: concurrentClaimedAt,
      lease_expires_at: concurrentLeaseExpiresAt,
      limit: 10,
    }),
    repository.claimCommands({
      lease_owner: 'packb-lease-right',
      claimed_at: concurrentClaimedAt,
      lease_expires_at: concurrentLeaseExpiresAt,
      limit: 10,
    }),
  ]);
  const concurrentlyClaimed = [...left, ...right];
  assert.equal(concurrentlyClaimed.length, 2);
  assert.equal(new Set(concurrentlyClaimed.map((command) => command.id)).size, 2);
  for (const command of concurrentlyClaimed) {
    await repository.releaseCommand({
      command_id: command.id,
      lease_owner: command.lease_owner!,
      expected_lease_version: command.lease_version,
      released_at: clock.now(),
      next_attempt_at: clock.now(),
      error_code: 'PACKB_LEASE_CONCURRENCY_PROBE',
    });
  }

  const expiredClaimedAt = clock.now();
  const expiredLeaseExpiresAt = new Date(Date.parse(expiredClaimedAt) + 2_000).toISOString();
  const expired = await repository.claimCommands({
    lease_owner: 'packb-expired-owner',
    claimed_at: expiredClaimedAt,
    lease_expires_at: expiredLeaseExpiresAt,
    limit: 10,
  });
  assert.equal(expired.length, 2);
  clock.advance(5_000);
  const reclaimedAt = clock.now();
  const reclaimed = await repository.claimCommands({
    lease_owner: 'packb-reclaim-owner',
    claimed_at: reclaimedAt,
    lease_expires_at: new Date(Date.parse(reclaimedAt) + 30_000).toISOString(),
    limit: 10,
  });
  assert.deepEqual(
    reclaimed.map((command) => command.id).sort(),
    expired.map((command) => command.id).sort(),
  );
  await assert.rejects(() => repository.heartbeatCommand({
    command_id: reclaimed[0]!.id,
    lease_owner: 'packb-expired-owner',
    expected_lease_version: expired.find(
      (command) => command.id === reclaimed[0]!.id,
    )!.lease_version,
    heartbeat_at: clock.now(),
    lease_expires_at: new Date(Date.parse(clock.now()) + 30_000).toISOString(),
  }));
  for (const command of reclaimed) {
    await repository.releaseCommand({
      command_id: command.id,
      lease_owner: 'packb-reclaim-owner',
      expected_lease_version: command.lease_version,
      released_at: clock.now(),
      next_attempt_at: clock.now(),
      error_code: 'PACKB_LEASE_RECLAIM_PROBE',
    });
  }
  return {
    concurrent_claimed_count: concurrentlyClaimed.length,
    concurrent_unique_count: new Set(concurrentlyClaimed.map((command) => command.id)).size,
    expired_claimed_count: expired.length,
    reclaimed_count: reclaimed.length,
    stale_owner_rejected: true,
  };
}

async function installSingleFailureTrigger(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION packb_fail_attempt_event_once() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'PACKB_INJECTED_ATTEMPT_EVENT_FAILURE';
    END;
    $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER packb_fail_attempt_event_once
    BEFORE INSERT ON "ExperimentFoundationExecutionAttemptEventV2"
    FOR EACH ROW EXECUTE FUNCTION packb_fail_attempt_event_once()
  `);
}

async function dropSingleFailureTrigger(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS packb_fail_attempt_event_once
      ON "ExperimentFoundationExecutionAttemptEventV2"
  `);
  await prisma.$executeRawUnsafe(`
    DROP FUNCTION IF EXISTS packb_fail_attempt_event_once()
  `);
}

async function snapshotNonPackBTables(
  prisma: PrismaClient,
): Promise<Record<string, TableSnapshot>> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT tablename AS table_name
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;
  const snapshots: Array<[string, TableSnapshot]> = [];
  for (const { table_name: tableName } of tables) {
    if ((PACK_B_TABLES as readonly string[]).includes(tableName)) continue;
    assert.match(tableName, /^[A-Za-z0-9_]+$/);
    const rows = await prisma.$queryRawUnsafe<Array<{ row_json: unknown }>>(
      `SELECT to_jsonb(t) AS row_json FROM "${tableName}" t ORDER BY to_jsonb(t)::text`,
    );
    snapshots.push([tableName, {
      count: rows.length,
      digest: digestJson(rows),
    }]);
  }
  return Object.fromEntries(snapshots);
}

function summarizeUnchanged(
  before: Record<string, TableSnapshot>,
  after: Record<string, TableSnapshot>,
) {
  assert.deepEqual(Object.keys(after), Object.keys(before));
  const requiredImmutableTables = [
    'ExperimentFoundationRunV2',
    'ExperimentFoundationRunCellV2',
    'ExperimentFoundationTrainingTaskSpecV2',
    'ExperimentFoundationIntegrationInboxV2',
  ];
  for (const table of requiredImmutableTables) {
    assert.deepEqual(after[table], before[table]);
  }
  return {
    measured_table_count: Object.keys(before).length,
    changed_table_count: 0,
    changed_tables: [],
    required_immutable_tables: Object.fromEntries(
      requiredImmutableTables.map((table) => [table, before[table]]),
    ),
    legacy_and_scientific_digest_unchanged: true,
  };
}

function createChecks(
  evidencePath: string,
  summaries: Record<(typeof REQUIRED_PACK_B_CHECKS)[number], string>,
) {
  return Object.fromEntries(REQUIRED_PACK_B_CHECKS.map((id) => [id, {
    status: 'passed',
    evidence_path: evidencePath,
    summary: summaries[id],
  }]));
}

function controllableClock() {
  let current = Date.parse('2026-07-13T14:00:00.000Z');
  return {
    now() {
      const value = new Date(current).toISOString();
      current += 100;
      return value;
    },
    advance(milliseconds: number) {
      current += milliseconds;
    },
  };
}

function deterministicIdFactory() {
  const counters = new Map<string, number>();
  return (prefix: string) => {
    const next = (counters.get(prefix) ?? 0) + 1;
    counters.set(prefix, next);
    return `${prefix}_${String(next).padStart(4, '0')}`;
  };
}

function installExternalRequestProbe() {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls += 1;
    throw new Error('PACKB_EXTERNAL_REQUEST_BLOCKED');
  }) as typeof fetch;
  return {
    fetchCallCount: () => fetchCalls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

async function expectReason(action: () => Promise<unknown>, reasonCode: string): Promise<void> {
  await assert.rejects(action, (error: unknown) => (
    typeof error === 'object'
    && error !== null
    && 'details' in error
    && (error as { details?: { reason_code?: string } }).details?.reason_code === reasonCode
  ));
}

function digestJson(value: unknown): string {
  return `sha256:${crypto.createHash('sha256')
    .update(canonicalizeExperimentV2Json(value))
    .digest('hex')}`;
}

function sumCounts(value: Record<string, number>): number {
  return Object.values(value).reduce((sum, count) => sum + count, 0);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
