import assert from 'node:assert/strict';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { Prisma, type PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  BootstrapImplementationProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  PaperImplementationExperimentV2AdmissionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import {
  PAPER_IMPLEMENTATION_MOTIVE_BOARD_READINESS_STATUSES,
  PAPER_IMPLEMENTATION_MOTIVE_CHALLENGE_STATUSES,
  PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES,
  PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_STATES,
  type MotiveEvidenceBoardSummary,
  type AdmitCoreMotiveVersionResponse,
  type CoreMotiveDraftResponse,
  type CreateCoreMotiveDraftRequest,
  type CreateMotiveEvidenceBoardVersionRequest,
  type CreateMotiveEvidenceBoardVersionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  PAPER_IMPLEMENTATION_TRACE_STATUSES,
  type TraceLineageBundle,
  type TraceIntegrity,
  type TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateValidationCycleDraftRequest,
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import {
  TOPIC_SELECTION_ACTOR_TYPES,
  type TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { buildApp } from '../src/app.js';
import {
  EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER,
} from '../src/repositories/experiment-spine-v2.repository.js';
import { getPrismaClient } from '../src/repositories/prisma/prisma-client.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import {
  EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS,
  type ExperimentFoundationD19TypedFixture,
} from '../src/services/experiment-foundation-d19-fixture.js';
import {
  buildExperimentFoundationD19AdmissionRequestTemplate,
} from '../src/services/experiment-foundation-d19-fixture-import-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2HeadService } from '../src/services/paper-implementation-experiment-v2-head-service.js';
import {
  assertExperimentFoundationLiveNamedLocalTarget,
  assertExperimentFoundationNamedLocalDatabaseUrl,
  canonicalizeExperimentFoundationEvidenceJson,
  countExperimentFoundationNamedLocalTables,
  digestExperimentFoundationNamedLocalTables,
  type ExperimentFoundationNamedLocalRowDigest,
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

const MOTIVE_ID = 'core_motive_t132_packa_product_p313';
const MOTIVE_VERSION_ID = 'core_motive_version_t132_packa_product_p313_v1';
const ASSERTION_ID = 'motive_assertion_t132_packa_product_p313';
const BOARD_VERSION_ID = 'motive_evidence_board_t132_packa_product_p313_v1';
const EVIDENCE_BINDING_ID = 'evidence_binding_t132_packa_product_p313';
const VALIDATION_CYCLE_ID = 'validation_cycle_t132_packa_product_p313_v1';
const BRANCH_KEY = 'ragperf-primary';
const LEGACY_SENTINEL_TABLES = [
  'PaperImplementationResearchWorkOrder',
  'PaperImplementationWorkOrderHarnessRun',
  'ExperimentFoundationRecord',
  'ExperimentFoundationReadinessReport',
  'ExperimentFoundationExternalTrainingJob',
] as const;
const SCIENTIFIC_EXCLUDED_TABLES = [
  'PaperImplementationRunEvidenceUnit',
  'PaperImplementationResultInterpretationPacket',
  'PaperImplementationClaimCandidate',
  'PaperImplementationDossier',
] as const;
const PACK_B_TABLES = [
  'ExperimentFoundationProviderPayloadV2',
  'ExperimentFoundationExecutionAttemptV2',
  'ExperimentFoundationExecutionAttemptEventV2',
  'ExperimentFoundationProviderCommandV2',
  'ExperimentFoundationCollectionAttemptV2',
  'ExperimentFoundationProvisionalOutputV2',
] as const;

type ScriptMode = 'apply' | 'verify';

interface ScriptArgs {
  mode: ScriptMode;
  runId: string;
  bridgeId: string;
  bridgePayloadHash: string;
  paperProjectId: string;
  outputPath: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  assertExpectedConfig(args.mode);
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  assertExperimentFoundationNamedLocalDatabaseUrl(
    databaseUrl,
    REVIEWED_NAMED_LOCAL_TARGET,
    'PACK_A_PRODUCT_NAMED_LOCAL_TARGET_MISMATCH',
  );

  const prisma = getPrismaClient();
  await prisma.$connect();
  let app: ReturnType<typeof buildApp> | null = null;
  try {
    const target = await assertExperimentFoundationLiveNamedLocalTarget(
      prisma,
      REVIEWED_NAMED_LOCAL_TARGET,
    );
    const source = await requireReviewedProductSource(prisma, args);
    const fixture = await resolveExactD19Fixture(prisma);
    const legacyBefore = await digestTables(prisma, LEGACY_SENTINEL_TABLES);
    const excludedBefore = await digestTables(prisma, SCIENTIFIC_EXCLUDED_TABLES);
    const packBBefore = await countExperimentFoundationNamedLocalTables(prisma, PACK_B_TABLES);
    if (args.mode === 'apply') {
      assert.equal(
        sumCounts(packBBefore),
        0,
        'Pack B tables must be empty before Pack A product landing',
      );
    }

    let operation: Record<string, unknown> = { mode: args.mode, mutation_performed: false };
    if (args.mode === 'apply') {
      app = buildApp({ backgroundWorkEnabled: false });
      await app.ready();
      operation = await applyProductLanding(app, prisma, args, source, fixture);
    }

    const productState = await assertExactProductState(prisma, args, fixture);
    const legacyAfter = await digestTables(prisma, LEGACY_SENTINEL_TABLES);
    const excludedAfter = await digestTables(prisma, SCIENTIFIC_EXCLUDED_TABLES);
    const packBAfter = await countExperimentFoundationNamedLocalTables(prisma, PACK_B_TABLES);

    assert.deepEqual(legacyAfter, legacyBefore, 'Legacy authority rows changed');
    assert.deepEqual(excludedAfter, excludedBefore, 'Scientific result/evidence rows changed');
    assert.deepEqual(packBAfter, packBBefore, 'Pack B rows changed');
    if (args.mode === 'apply') {
      assert.equal(sumCounts(packBAfter), 0, 'Pack B rows must remain zero during Pack A apply');
    }

    const summary = {
      schema_version: 'experiment-foundation-packa-product-landing@v1',
      status: 'passed',
      mode: args.mode,
      run_id: args.runId,
      generated_at: new Date().toISOString(),
      target,
      source_scope: source,
      configuration: {
        cutover_committed: true,
        admission_enabled: args.mode === 'apply',
        workflow_simulation_enabled: false,
      },
      operation,
      exact_fixture: {
        evaluation_protocol: fixture.evaluation_protocol,
        readiness_attestation_id:
          fixture.evaluation_protocol_readiness.attestation.readiness_attestation_id,
        readiness_attestation_hash:
          fixture.evaluation_protocol_readiness.attestation.attestation_hash,
        dependency_count: fixture.evaluation_protocol_readiness.dependencies.length,
        active_metric_keys: EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS,
      },
      product_state: productState,
      forbidden_write_fences: {
        legacy_before: legacyBefore,
        legacy_after: legacyAfter,
        legacy_exact: true,
        scientific_before: excludedBefore,
        scientific_after: excludedAfter,
        scientific_exact: true,
        pack_b_before: packBBefore,
        pack_b_after: packBAfter,
        pack_b_total_rows: sumCounts(packBAfter),
      },
    };
    await writeJsonAtomic(args.outputPath, summary);
    process.stdout.write(`${JSON.stringify({ status: 'passed', output: path.relative(REPO_ROOT, args.outputPath) })}\n`);
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
  }
}

async function applyProductLanding(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  args: ScriptArgs,
  source: Awaited<ReturnType<typeof requireReviewedProductSource>>,
  fixture: ExperimentFoundationD19TypedFixture,
): Promise<Record<string, unknown>> {
  const bootstrap = await injectJson<BootstrapImplementationProjectResponse>(app, {
    method: 'POST',
    url: '/paper-implementation/projects/bootstrap',
    payload: {
      paper_project_bridge_id: args.bridgeId,
      bridge_payload_hash: args.bridgePayloadHash,
      created_by: 'system',
    },
    expectedStatuses: [200, 201],
  });
  const implementationProjectId = bootstrap.body.implementation_project.implementation_project_id;
  assert.equal(bootstrap.body.implementation_project.target_paper_project_ref?.ref_id, args.paperProjectId);
  assert.equal(bootstrap.body.implementation_project.lifecycle_status, 'active');

  const titleCardId = bootstrap.body.implementation_project.title_card_id;
  const humanDecisionRef = asFunctionalRef(source.human_confirmed_decision_ref);
  const literatureEvidenceRef = source.source_refs.find(
    (ref) => ref.ref_type === 'evidence_unit' || ref.ref_type === 'literature_evidence_unit',
  );
  assert.ok(literatureEvidenceRef, 'Reviewed product bridge has no literature evidence source ref');
  const topicPackageRef = functionalRef(
    'topic_package',
    source.topic_package_id,
    titleCardId,
    source.package_version,
  );
  const motiveRequest = productMotiveRequest(topicPackageRef, humanDecisionRef);
  let motiveCreated = false;
  let motiveVersion = await prisma.paperImplementationCoreMotiveVersion.findUnique({
    where: { id: MOTIVE_VERSION_ID },
  });
  if (!motiveVersion) {
    const created = await injectJson<CoreMotiveDraftResponse>(app, {
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}/core-motives/drafts`,
      payload: motiveRequest,
      expectedStatuses: [201],
    });
    assert.equal(created.body.core_motive_version.core_motive_version_id, MOTIVE_VERSION_ID);
    motiveCreated = true;
    motiveVersion = await prisma.paperImplementationCoreMotiveVersion.findUnique({
      where: { id: MOTIVE_VERSION_ID },
    });
  }
  assert.ok(motiveVersion);
  assert.equal(motiveVersion.implementationProjectId, implementationProjectId);
  assert.equal(motiveVersion.motiveId, MOTIVE_ID);
  assert.ok(['draft', 'admitted'].includes(motiveVersion.versionStatus));
  assert.deepEqual(motiveVersion.motiveContract, motiveRequest.motive_contract);
  assert.deepEqual(motiveVersion.scopeContract, motiveRequest.scope_contract);
  assert.deepEqual(motiveVersion.falsificationContract, motiveRequest.falsification_contract);
  assert.deepEqual(motiveVersion.claimBoundary, motiveRequest.claim_boundary);

  let motiveAdmitted = false;
  if (motiveVersion.versionStatus === 'draft') {
    const trace = await ensureCompleteTrace(app, prisma, {
      implementationProjectId,
      titleCardId,
      targetRefType: 'core_motive_version',
      targetRefId: MOTIVE_VERSION_ID,
      targetVersionId: 'v1',
      lineage: traceLineage({ humanDecisionRef, literatureEvidenceRef }),
    });
    const admitted = await injectJson<AdmitCoreMotiveVersionResponse>(app, {
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}`
        + `/core-motives/${encodeURIComponent(MOTIVE_ID)}/versions/${encodeURIComponent(MOTIVE_VERSION_ID)}/admit`,
      payload: {
        trace_manifest_id: trace.trace_manifest_id,
        portfolio_role: 'primary',
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        created_by: 'system',
      },
      expectedStatuses: [200],
    });
    assert.equal(admitted.body.core_motive_version.version_status, 'admitted');
    motiveAdmitted = true;
  }
  motiveVersion = await prisma.paperImplementationCoreMotiveVersion.findUnique({
    where: { id: MOTIVE_VERSION_ID },
  });
  assert.ok(motiveVersion);
  assert.equal(motiveVersion.versionStatus, 'admitted');
  assert.ok(motiveVersion.traceManifestId);
  const resolvedTraceRepairCount = await resolveSupersededTraceRepairs(app, prisma, {
    implementationProjectId,
    targetRefId: MOTIVE_VERSION_ID,
    authoritativeTraceManifestId: motiveVersion.traceManifestId,
  });

  const board = await ensureProductEvidenceBoard(app, prisma, {
    implementationProjectId,
    titleCardId,
    literatureEvidenceRef,
    humanDecisionRef,
  });

  const cycleRequest = productValidationCycleRequest(titleCardId, humanDecisionRef);
  let cycleCreated = false;
  let cycle = await prisma.paperImplementationValidationCycle.findUnique({
    where: { id: VALIDATION_CYCLE_ID },
  });
  if (!cycle) {
    const created = await injectJson<ValidationCycle>(app, {
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}/validation-cycles/drafts`,
      payload: cycleRequest,
      expectedStatuses: [201],
    });
    assert.equal(created.body.validation_cycle_id, VALIDATION_CYCLE_ID);
    cycleCreated = true;
    cycle = await prisma.paperImplementationValidationCycle.findUnique({
      where: { id: VALIDATION_CYCLE_ID },
    });
  }
  assert.ok(cycle);
  assert.equal(cycle.implementationProjectId, implementationProjectId);
  assert.ok(['proposed', 'admitted'].includes(cycle.cycleStatus));
  assert.equal(cycle.targetRefType, 'core_motive_version');
  assert.equal(cycle.targetRefId, MOTIVE_VERSION_ID);
  assert.deepEqual(cycle.validationFrame, cycleRequest.validation_frame);
  assert.deepEqual(cycle.criteria, cycleRequest.criteria);
  assert.deepEqual(cycle.budget, cycleRequest.budget);

  let cycleAdmitted = false;
  if (cycle.cycleStatus === 'proposed') {
    const trace = await ensureCompleteTrace(app, prisma, {
      implementationProjectId,
      titleCardId,
      targetRefType: 'validation_cycle',
      targetRefId: VALIDATION_CYCLE_ID,
      targetVersionId: 'v1',
      lineage: traceLineage({ humanDecisionRef }),
    });
    const admitted = await injectJson<ValidationCycle>(app, {
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}`
        + `/validation-cycles/${encodeURIComponent(VALIDATION_CYCLE_ID)}/admit`,
      payload: {
        trace_manifest_id: trace.trace_manifest_id,
        confirmation_level: 'human_confirmed',
        confirmed_by: 'human',
        created_by: 'system',
      },
      expectedStatuses: [200],
    });
    assert.equal(admitted.body.lifecycle_status, 'admitted');
    cycleAdmitted = true;
  }

  const admissionRequest = buildExperimentFoundationD19AdmissionRequestTemplate(fixture);
  const admission = await injectJson<PaperImplementationExperimentV2AdmissionResponse>(app, {
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(implementationProjectId)}`
      + `/validation-cycles/${encodeURIComponent(VALIDATION_CYCLE_ID)}`
      + '/experiment-work-orders/v2/admissions',
    payload: admissionRequest,
    expectedStatuses: [200, 201],
  });

  const relay = buildRelay(prisma);
  const relayOutcome = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
  assert.equal(relayOutcome.idle, true);
  assert.equal(relayOutcome.failures.length, 0);
  assert.equal(relayOutcome.terminalized, 0);
  assert.equal(relayOutcome.released, 0);

  return {
    mode: 'apply',
    mutation_performed: true,
    implementation_project_id: implementationProjectId,
    bootstrap_project_created: bootstrap.body.project_created,
    motive_created: motiveCreated,
    motive_admitted: motiveAdmitted,
    resolved_trace_repair_count: resolvedTraceRepairCount,
    validation_cycle_created: cycleCreated,
    validation_cycle_admitted: cycleAdmitted,
    motive_evidence_board_id: board.board_version_id,
    evidence_binding_id: EVIDENCE_BINDING_ID,
    admission_replayed: admission.body.replayed,
    admission_id: admission.body.admission.admission_id,
    work_order_revision_id: admission.body.revision.work_order_revision_id,
    relay: relayOutcome,
  };
}

async function resolveSupersededTraceRepairs(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  input: {
    implementationProjectId: string;
    targetRefId: string;
    authoritativeTraceManifestId: string;
  },
): Promise<number> {
  const repairs = await prisma.paperImplementationTraceRepairQueueItem.findMany({
    where: {
      implementationProjectId: input.implementationProjectId,
      targetRefId: input.targetRefId,
      status: 'open',
      traceManifestId: { not: input.authoritativeTraceManifestId },
    },
    orderBy: { createdAt: 'asc' },
  });
  for (const repair of repairs) {
    const resolved = await injectJson<{ status: string }>(app, {
      method: 'POST',
      url: `/paper-implementation/projects/${encodeURIComponent(input.implementationProjectId)}`
        + `/trace-repair-queue/${encodeURIComponent(repair.id)}/resolve`,
      payload: {
        resolution_note:
          `Superseded by complete ${input.authoritativeTraceManifestId}; no authority references the failed prefix.`,
        resolved_by: 'system',
      },
      expectedStatuses: [200],
    });
    assert.equal(resolved.body.status, 'resolved');
  }
  return repairs.length;
}

async function ensureProductEvidenceBoard(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  input: {
    implementationProjectId: string;
    titleCardId: string;
    literatureEvidenceRef: TopicSelectionFunctionalRef;
    humanDecisionRef: TopicSelectionFunctionalRef;
  },
): Promise<CreateMotiveEvidenceBoardVersionResponse['board_version']> {
  const existing = await prisma.paperImplementationMotiveEvidenceBoardVersion.findUnique({
    where: { id: BOARD_VERSION_ID },
  });
  if (existing) {
    assert.equal(existing.implementationProjectId, input.implementationProjectId);
    assert.equal(existing.motiveId, MOTIVE_ID);
    assert.equal(existing.coreMotiveVersionId, MOTIVE_VERSION_ID);
    assert.equal(existing.readinessStatus, 'evidence_ready');
    assert.equal(existing.blockerStatus, 'none');
    assert.equal(existing.freshnessStatus, 'fresh');
    const binding = await prisma.paperImplementationEvidenceBinding.findUnique({
      where: { id: EVIDENCE_BINDING_ID },
    });
    assert.ok(binding);
    assert.equal(binding.boardVersionId, BOARD_VERSION_ID);
    return {
      board_version_id: existing.id,
      implementation_project_id: existing.implementationProjectId,
      motive_id: existing.motiveId,
      core_motive_version_id: existing.coreMotiveVersionId,
      assertion_refs: asFunctionalRefArray(existing.assertionRefs),
      evidence_binding_refs: asFunctionalRefArray(existing.evidenceBindingRefs),
      board_summary: asMotiveEvidenceBoardSummary(existing.boardSummary),
      board_state: {
        readiness_status: asEnum(existing.readinessStatus, PAPER_IMPLEMENTATION_MOTIVE_BOARD_READINESS_STATUSES, 'board readiness status'),
        blocker_status: asEnum(existing.blockerStatus, ['none', 'soft_blocked', 'hard_blocked'] as const, 'board blocker status'),
        freshness_status: asEnum(existing.freshnessStatus, PAPER_IMPLEMENTATION_MOTIVE_FRESHNESS_STATUSES, 'board freshness status'),
        support_state: asEnum(existing.supportState, PAPER_IMPLEMENTATION_MOTIVE_SUPPORT_STATES, 'board support state'),
        challenge_status: asEnum(existing.challengeStatus, PAPER_IMPLEMENTATION_MOTIVE_CHALLENGE_STATUSES, 'board challenge status'),
        accepted_risk_refs: asFunctionalRefArray(existing.acceptedRiskRefs),
      },
      trace_manifest_ref: asFunctionalRef(existing.traceManifestRef),
      trace_manifest_id: existing.traceManifestId,
      created_by: asEnum(existing.createdBy, TOPIC_SELECTION_ACTOR_TYPES, 'board actor type'),
      created_at: existing.createdAt.toISOString(),
    };
  }

  const lineage = traceLineage({
    humanDecisionRef: input.humanDecisionRef,
    literatureEvidenceRef: input.literatureEvidenceRef,
  });
  const [boardTrace, bindingTrace] = await Promise.all([
    ensureCompleteTrace(app, prisma, {
      implementationProjectId: input.implementationProjectId,
      titleCardId: input.titleCardId,
      targetRefType: 'motive_evidence_board_version',
      targetRefId: BOARD_VERSION_ID,
      targetVersionId: 'v1',
      lineage,
    }),
    ensureCompleteTrace(app, prisma, {
      implementationProjectId: input.implementationProjectId,
      titleCardId: input.titleCardId,
      targetRefType: 'evidence_binding',
      targetRefId: EVIDENCE_BINDING_ID,
      targetVersionId: 'v1',
      lineage,
    }),
  ]);
  const request: CreateMotiveEvidenceBoardVersionRequest = {
    board_version_id: BOARD_VERSION_ID,
    motive_id: MOTIVE_ID,
    core_motive_version_id: MOTIVE_VERSION_ID,
    bindings: [{
      binding_id: EVIDENCE_BINDING_ID,
      assertion_id: ASSERTION_ID,
      evidence_ref: input.literatureEvidenceRef,
      role: 'support',
      scope: { method_scope: 'Pack A control-plane product lineage' },
      strength: {
        directness: 'moderate',
        reliability: 'high',
        reproducibility: 'reproduced',
        freshness: 'fresh',
      },
      support_state: 'weak',
      challenge_status: 'none',
      interpretation: {
        normalized_statement: 'The human-confirmed P313 source lineage supplies the bounded product scope for Pack A control-plane validation.',
        why_relevant_to_assertion: 'It anchors the PI motive to a real promoted PaperProject while the D-19 run remains non-scientific.',
        limitations: ['This source ref does not constitute scientific result evidence.'],
      },
      trace_manifest_id: bindingTrace.trace_manifest_id,
    }],
    board_summary: {
      current_support_summary: 'P313 has an active human-confirmed product bridge and reviewed D-19 typed readiness.',
      current_challenge_summary: 'Provider execution and scientific result evidence remain intentionally absent.',
      unresolved_conflicts: [],
      board_gap_summary: 'Only the bounded Pack A control-plane spine is eligible for this cycle.',
      next_evidence_needed: ['One exact T1 through T4 durable acknowledgement.'],
    },
    board_state: {
      readiness_status: 'evidence_ready',
      blocker_status: 'none',
      freshness_status: 'fresh',
      support_state: 'partial',
      challenge_status: 'none',
      accepted_risk_refs: [],
    },
    trace_manifest_id: boardTrace.trace_manifest_id,
    created_by: 'system',
  };
  const created = await injectJson<CreateMotiveEvidenceBoardVersionResponse>(app, {
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(input.implementationProjectId)}/motive-evidence-boards`,
    payload: request,
    expectedStatuses: [201],
  });
  assert.equal(created.body.board_version.board_version_id, BOARD_VERSION_ID);
  assert.equal(created.body.evidence_bindings.length, 1);
  return created.body.board_version;
}

function buildRelay(prisma: PrismaClient): ExperimentV2IntegrationRelayService {
  const assetService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
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
  return new ExperimentV2IntegrationRelayService({
    paperImplementationRepository: piRepository,
    experimentFoundationRepository: efRepository,
    materializationConsumer: new ExperimentFoundationV2MaterializationService({
      repository: efRepository,
      readinessResolver,
    }),
    headConsumer: new PaperImplementationExperimentV2HeadService({ repository: piRepository }),
    acknowledgementConsumer: new ExperimentFoundationV2AcknowledgementService({
      repository: efRepository,
    }),
    workerId: 't132-packa-product-landing-relay',
    retryDelayMs: 0,
  });
}

async function resolveExactD19Fixture(
  prisma: PrismaClient,
): Promise<ExperimentFoundationD19TypedFixture> {
  const readinessRows = await prisma.experimentFoundationReadinessAttestationV2.findMany({
    where: {
      targetAssetType: 'EvaluationProtocol',
      targetAssetId: 'd19-evaluation-protocol-ragperf-v2',
      outcome: 'passed',
    },
    include: { dependencies: { orderBy: { ordinal: 'asc' } } },
  });
  assert.equal(readinessRows.length, 1, 'Expected one exact D-19 EvaluationProtocol readiness');
  const readinessRow = readinessRows[0]!;
  const target = exactRef(
    readinessRow.targetAssetType,
    readinessRow.targetAssetId,
    readinessRow.targetRevisionId,
    readinessRow.targetRevisionSequence,
    readinessRow.targetRevisionHash,
  );
  assert.equal(target.asset_type, 'EvaluationProtocol');
  const dependencies = readinessRow.dependencies.map((row) => exactRef(
    row.dependencyAssetType,
    row.dependencyAssetId,
    row.dependencyRevisionId,
    row.dependencyRevisionSequence,
    row.dependencyRevisionHash,
  ));
  const service = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  const readiness = await service.revalidateReadiness({
    target,
    readiness_attestation_id: readinessRow.id,
    expected_dependencies: dependencies,
  });
  assert.equal(readiness.attestation.attestation_hash, readinessRow.attestationHash);
  const dataPolicies = dependencies.filter((ref) => ref.asset_type === 'DataPolicy');
  const datasets = dependencies.filter((ref) => ref.asset_type === 'Dataset');
  const metrics = dependencies.filter((ref) => ref.asset_type === 'MetricDefinition');
  const benchmarks = dependencies.filter((ref) => ref.asset_type === 'Benchmark');
  assert.equal(dataPolicies.length, 2);
  assert.equal(datasets.length, 2);
  assert.equal(metrics.length, 17);
  assert.equal(benchmarks.length, 1);
  assert.deepEqual(
    EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS.map((key) => `d19-metric-${key}`).filter(
      (logicalId) => metrics.some((metric) => metric.logical_id === logicalId),
    ),
    EXPERIMENT_FOUNDATION_D19_ACTIVE_METRIC_KEYS.map((key) => `d19-metric-${key}`),
  );
  return {
    source_policy_attestation: null,
    data_policies: dataPolicies,
    datasets,
    metric_definitions: metrics,
    benchmark: benchmarks[0]!,
    evaluation_protocol: target,
    evaluation_protocol_readiness: readiness,
  };
}

async function assertExactProductState(
  prisma: PrismaClient,
  args: ScriptArgs,
  fixture: ExperimentFoundationD19TypedFixture,
): Promise<Record<string, unknown>> {
  const project = await prisma.paperImplementationProject.findUnique({
    where: { paperProjectBridgeId: args.bridgeId },
  });
  assert.ok(project, 'Formal PI ImplementationProject is missing');
  assert.equal(project.lifecycleStatus, 'active');
  assert.equal(project.bridgePayloadHash, args.bridgePayloadHash);
  assert.equal(asObject(project.targetPaperProjectRef).ref_id, args.paperProjectId);

  const motive = await prisma.paperImplementationCoreMotiveVersion.findUnique({
    where: { id: MOTIVE_VERSION_ID },
  });
  assert.ok(motive);
  assert.equal(motive.implementationProjectId, project.id);
  assert.equal(motive.versionStatus, 'admitted');

  const cycle = await prisma.paperImplementationValidationCycle.findUnique({
    where: { id: VALIDATION_CYCLE_ID },
  });
  assert.ok(cycle);
  assert.equal(cycle.implementationProjectId, project.id);
  assert.equal(cycle.cycleStatus, 'admitted');
  assert.equal(cycle.executionStatus, 'not_started');

  const branches = await prisma.paperImplementationExperimentWorkOrderBranchV2.findMany({
    where: { implementationProjectId: project.id, validationCycleId: VALIDATION_CYCLE_ID },
  });
  assert.equal(branches.length, 1);
  const branch = branches[0]!;
  assert.equal(branch.branchKey, BRANCH_KEY);
  assert.equal(branch.currentRevisionId, branch.headRevisionId);
  assert.equal(branch.currentRevisionSequence, 1);
  assert.equal(branch.headRevisionSequence, 1);
  assert.ok(branch.headRunId);
  assert.ok(branch.headRunManifestHash);

  const revisions = await prisma.paperImplementationExperimentWorkOrderRevisionV2.findMany({
    where: { branchId: branch.id },
  });
  assert.equal(revisions.length, 1);
  const revision = revisions[0]!;
  const [cells, admissions] = await Promise.all([
    prisma.paperImplementationExperimentWorkOrderRevisionCellV2.findMany({
      where: { revisionId: revision.id },
      orderBy: { ordinal: 'asc' },
    }),
    prisma.paperImplementationExperimentWorkOrderAdmissionV2.findMany({
      where: { branchId: branch.id },
    }),
  ]);
  assert.deepEqual(cells.map((cell) => cell.cellKey), ['retriever-top-k-5', 'retriever-top-k-10']);
  assert.equal(admissions.length, 1);

  const [versionLocks, recipes, taskSpecs, runs] = await Promise.all([
    prisma.experimentFoundationVersionLockV2.findMany({
      where: { externalPiWorkOrderRevisionId: revision.id },
    }),
    prisma.experimentFoundationRunRecipeV2.findMany({
      where: { externalPiWorkOrderRevisionId: revision.id },
    }),
    prisma.experimentFoundationTrainingTaskSpecV2.findMany({
      where: { externalPiWorkOrderRevisionId: revision.id },
      orderBy: { cellOrdinal: 'asc' },
    }),
    prisma.experimentFoundationRunV2.findMany({
      where: { externalPiWorkOrderRevisionId: revision.id },
    }),
  ]);
  assert.equal(versionLocks.length, 1);
  assert.equal(recipes.length, 1);
  assert.equal(taskSpecs.length, 2);
  assert.equal(runs.length, 1);
  const run = runs[0]!;
  assert.equal(run.id, branch.headRunId);
  assert.equal(run.runManifestHash, branch.headRunManifestHash);
  const [lockDependencies, runCells, piInboxes, piOutboxes, efInboxes, efOutboxes] = await Promise.all([
    prisma.experimentFoundationVersionLockDependencyV2.findMany({
      where: { versionLockId: versionLocks[0]!.id },
      orderBy: { ordinal: 'asc' },
    }),
    prisma.experimentFoundationRunCellV2.findMany({
      where: { runId: run.id },
      orderBy: { ordinal: 'asc' },
    }),
    prisma.paperImplementationExperimentIntegrationInboxV2.findMany({
      where: { branchId: branch.id },
    }),
    prisma.paperImplementationExperimentIntegrationOutboxV2.findMany({
      where: { branchId: branch.id },
    }),
    prisma.experimentFoundationIntegrationInboxV2.findMany({
      where: { branchId: branch.id },
    }),
    prisma.experimentFoundationIntegrationOutboxV2.findMany({
      where: { branchId: branch.id },
    }),
  ]);
  assert.equal(lockDependencies.length, fixture.evaluation_protocol_readiness.dependencies.length + 1);
  assert.deepEqual(runCells.map((cell) => cell.cellKey), cells.map((cell) => cell.cellKey));
  assert.equal(piInboxes.length, 1);
  assert.equal(piOutboxes.length, 2);
  assert.equal(efInboxes.length, 2);
  assert.equal(efOutboxes.length, 1);
  assert.ok([...piOutboxes, ...efOutboxes].every((outbox) => outbox.relayStatus === 'delivered'));
  const acknowledgements = efInboxes.filter((inbox) => (
    inbox.consumerName === EXPERIMENT_FOUNDATION_V2_HEAD_ACKNOWLEDGEMENT_CONSUMER
    && inbox.eventType === 'BranchHeadAdvanced'
    && inbox.status === 'processed'
    && inbox.outcome === 'processed'
  ));
  assert.equal(acknowledgements.length, 1);
  assert.equal(acknowledgements[0]!.runId, run.id);
  assert.equal(acknowledgements[0]!.runManifestHash, run.runManifestHash);
  const [failedTraceCount, openTraceRepairs] = await Promise.all([
    prisma.paperImplementationTraceManifest.count({
      where: {
        implementationProjectId: project.id,
        traceStatus: { not: 'complete' },
      },
    }),
    prisma.paperImplementationTraceRepairQueueItem.findMany({
      where: {
        implementationProjectId: project.id,
        status: 'open',
      },
    }),
  ]);
  assert.equal(openTraceRepairs.length, 0, 'Formal PI product scope has open trace repairs');

  return {
    implementation_project_id: project.id,
    motive_id: MOTIVE_ID,
    motive_version_id: MOTIVE_VERSION_ID,
    validation_cycle_id: VALIDATION_CYCLE_ID,
    branch_id: branch.id,
    work_order_revision_id: revision.id,
    work_order_revision_hash: revision.contentHash,
    cell_count: cells.length,
    cell_keys: cells.map((cell) => cell.cellKey),
    admission_id: admissions[0]!.id,
    version_lock_id: versionLocks[0]!.id,
    version_lock_hash: versionLocks[0]!.lockHash,
    version_lock_dependency_count: lockDependencies.length,
    run_recipe_id: recipes[0]!.id,
    run_recipe_hash: recipes[0]!.recipeHash,
    training_task_spec_count: taskSpecs.length,
    run_id: run.id,
    run_manifest_hash: run.runManifestHash,
    run_cell_count: runCells.length,
    pi_branch_head_run_id: branch.headRunId,
    acknowledgement_inbox_id: acknowledgements[0]!.id,
    acknowledgement_count: acknowledgements.length,
    retained_failed_trace_count: failedTraceCount,
    open_trace_repair_count: openTraceRepairs.length,
    integration_event_counts: {
      pi_inbox: piInboxes.length,
      pi_outbox: piOutboxes.length,
      ef_inbox: efInboxes.length,
      ef_outbox: efOutboxes.length,
    },
  };
}

async function requireReviewedProductSource(prisma: PrismaClient, args: ScriptArgs) {
  const [bridge, paperProject] = await Promise.all([
    prisma.topicSelectionPaperProjectBridge.findUnique({ where: { id: args.bridgeId } }),
    prisma.paperProject.findUnique({ where: { id: args.paperProjectId } }),
  ]);
  assert.ok(bridge, 'Reviewed PaperProjectBridge is missing');
  assert.ok(paperProject, 'Reviewed PaperProject is missing');
  assert.equal(bridge.bridgeStatus, 'active');
  assert.equal(bridge.bridgePayloadHash, args.bridgePayloadHash);
  assert.equal(asObject(bridge.targetPaperProjectRef).ref_id, args.paperProjectId);
  assert.equal(paperProject.status, 'active');
  const humanDecisionRef = asObject(bridge.humanConfirmedDecisionRef);
  assert.equal(typeof humanDecisionRef.ref_id, 'string');
  return {
    paper_project_id: paperProject.id,
    paper_project_title: paperProject.title,
    paper_project_status: paperProject.status,
    paper_project_bridge_id: bridge.id,
    bridge_status: bridge.bridgeStatus,
    bridge_payload_hash: bridge.bridgePayloadHash,
    title_card_id: bridge.titleCardId,
    topic_package_id: bridge.topicPackageId,
    package_version: bridge.packageVersion,
    paper_project_intake_ref: bridge.paperProjectIntakeRef,
    target_paper_project_ref: bridge.targetPaperProjectRef,
    human_confirmed_decision_ref: bridge.humanConfirmedDecisionRef,
    source_refs: asFunctionalRefArray(bridge.sourceRefs),
  };
}

async function ensureCompleteTrace(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  input: {
    implementationProjectId: string;
    titleCardId: string;
    targetRefType: string;
    targetRefId: string;
    targetVersionId: string;
    lineage: TraceLineageBundle;
  },
): Promise<TraceManifest> {
  const existing = await prisma.paperImplementationTraceManifest.findMany({
    where: {
      implementationProjectId: input.implementationProjectId,
      targetRefType: input.targetRefType,
      targetRefId: input.targetRefId,
      traceStatus: 'complete',
    },
    orderBy: { createdAt: 'asc' },
  });
  const exact = existing.find((row) => (
    row.targetVersionId === input.targetVersionId
    && canonicalizeExperimentFoundationEvidenceJson(traceRowLineage(row))
      === canonicalizeExperimentFoundationEvidenceJson(input.lineage)
  ));
  if (exact) {
    return {
      trace_manifest_id: exact.id,
      implementation_project_id: exact.implementationProjectId,
      target_ref: asFunctionalRef(exact.targetRef),
      lineage: traceRowLineage(exact),
      integrity: asTraceIntegrity(exact.integrity),
      trace_status: asEnum(exact.traceStatus, PAPER_IMPLEMENTATION_TRACE_STATUSES, 'trace status'),
      broken_ref_count: exact.brokenRefCount,
      stale_ref_count: exact.staleRefCount,
      missing_ref_count: exact.missingRefCount,
      non_citable_ref_count: exact.nonCitableRefCount,
      trace_policy_version_id: exact.tracePolicyVersionId,
      created_by: asEnum(exact.createdBy, TOPIC_SELECTION_ACTOR_TYPES, 'trace actor type'),
      created_at: exact.createdAt.toISOString(),
    };
  }
  const created = await injectJson<TraceManifest>(app, {
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(input.implementationProjectId)}/trace-manifests`,
    payload: {
      target_ref: functionalRef(
        input.targetRefType,
        input.targetRefId,
        input.titleCardId,
        input.targetVersionId,
      ),
      lineage: input.lineage,
      created_by: 'system',
    },
    expectedStatuses: [201],
  });
  assert.equal(created.body.trace_status, 'complete');
  return created.body;
}

function productMotiveRequest(
  topicPackageRef: TopicSelectionFunctionalRef,
  humanDecisionRef: TopicSelectionFunctionalRef,
): CreateCoreMotiveDraftRequest {
  return {
    motive_id: MOTIVE_ID,
    core_motive_version_id: MOTIVE_VERSION_ID,
    motive_contract: {
      short_name: 'Reviewer-aligned experiment-control validation',
      motivation_claim: 'Exact PI to EF control-plane lineage must be reproducible before scientific execution.',
      problem_pressure: 'Mutable or ambiguous experiment authority weakens reviewer-facing evidence provenance.',
      current_solution_insufficiency: 'Legacy singular WorkOrder and generic EF records do not preserve exact two-cell lineage.',
      unmet_or_failure_mechanism: 'Admission, materialization, head advance, and acknowledgement can otherwise drift across authorities.',
      target_setting: 'Local-first CS paper engineering with a bounded RAGPerf two-cell control-plane plan.',
      expected_contribution_path: 'Establish one immutable and crash-recoverable PI to EF to PI product spine.',
      why_this_is_not_trivial: 'The chain crosses domain-local transactions and must converge under replay without dual writes.',
      why_existing_baselines_do_not_already_solve_it: 'Legacy job-shaped writers lack branch sequence, exact readiness, and durable acknowledgement.',
      what_makes_this_researchable_now: 'Reviewed D-19 typed assets and readiness are already present in named-local storage.',
    },
    scope_contract: {
      included_scope: ['PI admission', 'EF exact materialization', 'PI head CAS', 'EF acknowledgement'],
      excluded_scope: ['provider execution', 'scientific results', 'evidence generation', 'promotion'],
      non_goals: ['benchmark quality claims', 'cloud training', 'product UI'],
      evaluation_scope: 'control_plane_only',
    },
    falsification_contract: {
      invalidation_conditions: ['The admitted cells cannot materialize one exact immutable Run manifest.'],
      weakening_conditions: ['Replay requires duplicate authority rows or a legacy fallback.'],
      minimum_evidence_to_continue: ['One exact two-cell T1 through T4 durable lineage.'],
      decisive_negative_conditions: ['Any provider, result, evidence, Pack B, or legacy WorkOrder write occurs.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The bounded Pack A control-plane product spine lands exactly and replays safely.',
      minimum_defensible_contribution_claim: 'The named-local product chain preserves exact authority lineage.',
      forbidden_overclaims: ['No scientific performance claim.', 'No provider readiness claim.'],
      claim_types_allowed: ['engineering_validation_claim'],
    },
    source_refs: [topicPackageRef],
    source_human_judgment_refs: [humanDecisionRef],
    assertions: [{
      assertion_id: ASSERTION_ID,
      assertion_type: 'experimental_answerability',
      assertion_text: 'The exact two-cell RAGPerf plan can complete T1 through T4 without excluded writes.',
      importance: { role: 'core', must_hold_for_motive_to_continue: true },
      validation_requirements: {
        minimum_support_level: 'weak',
        required_evidence_types: ['probe_result'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['Any T1 through T4 transaction fails to converge exactly.'],
        what_would_weaken_this: ['The chain depends on manual legacy repair.'],
      },
      expected_initial_status: 'untested',
    }],
    hypothesis_only: true,
    created_by: 'system',
  };
}

function productValidationCycleRequest(
  titleCardId: string,
  humanDecisionRef: TopicSelectionFunctionalRef,
): CreateValidationCycleDraftRequest {
  const motiveVersionRef = functionalRef(
    'core_motive_version',
    MOTIVE_VERSION_ID,
    titleCardId,
    '1',
  );
  return {
    validation_cycle_id: VALIDATION_CYCLE_ID,
    target: {
      target_type: 'core_motive_version',
      target_id: MOTIVE_VERSION_ID,
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'human_request',
      trigger_refs: [humanDecisionRef],
    },
    cycle_type: 'probe_execution',
    validation_frame: {
      validation_question: 'Can the exact two-cell RAGPerf plan materialize one immutable Run and head acknowledgement without provider or scientific writes?',
      assumptions_under_test: ['Reviewed exact readiness remains current for all ordered dependencies.'],
      assertions_under_test: [functionalRef('motive_assertion', ASSERTION_ID, titleCardId)],
      decision_if_pass: 'Retain the Pack A product spine and keep new admission closed after landing.',
      decision_if_fail: 'Stop the product landing and preserve the failed closed evidence.',
      decision_if_inconclusive: 'Keep admission closed and repeat only after a new readiness review.',
      expected_information_gain: 'high',
      why_this_cycle_now: 'Pack A code, schema, migration, and reviewed typed fixture are ready for formal PI product scope.',
    },
    context: {
      included_refs: {
        motive_version_refs: [motiveVersionRef],
        board_version_refs: [],
        evidence_refs: [],
        route_refs: [],
        work_order_refs: [],
        result_packet_refs: [],
        experiment_plan_light_refs: [],
      },
      excluded_context_notes: ['Provider execution, scientific results, evidence, promotion, and UI remain out of scope.'],
    },
    criteria: {
      pass_conditions: ['Exactly one admitted revision produces one two-cell Run and one durable EF acknowledgement.'],
      fail_conditions: ['Any cell, hash, sequence, or authority count drifts.'],
      inconclusive_conditions: ['Named-local prerequisites cannot be verified exactly.'],
      stop_conditions: ['Stop before provider or Pack B intake.'],
      minimum_artifacts_required: ['Sanitized Pack A product landing summary.'],
    },
    budget: {
      budget_id: 'validation_budget_t132_packa_product_p313_v1',
      max_runtime: 'PT10M',
      max_compute: 'control_plane_only',
      max_human_review_count: 1,
      retry_budget: 0,
    },
    confirmation_level: 'human_confirmed',
    confirmed_by: 'human',
    created_by: 'system',
  };
}

function traceLineage(input: {
  humanDecisionRef: TopicSelectionFunctionalRef;
  literatureEvidenceRef?: TopicSelectionFunctionalRef;
}): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: input.literatureEvidenceRef ? [input.literatureEvidenceRef] : [],
      source_locator_refs: [],
      citation_candidate_refs: [],
    },
    experiment: {
      experiment_plan_refs: [],
      work_order_refs: [],
      run_refs: [],
      run_evidence_refs: [],
      result_packet_refs: [],
      metric_refs: [],
    },
    artifact: {
      dataset_refs: [],
      baseline_refs: [],
      code_version_refs: [],
      model_checkpoint_refs: [],
      config_refs: [],
      log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [],
      motive_evolution_decision_refs: [],
      gate_result_refs: [],
      human_decision_refs: [input.humanDecisionRef],
      accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [],
      llm_rationale_refs: [],
      board_summary_refs: [],
      non_citable_refs: [],
    },
  };
}

function exactRef(
  assetType: string,
  logicalId: string,
  revisionId: string,
  revisionSequence: number,
  contentHash: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  if (!['Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol'].includes(assetType)) {
    throw new Error(`Unsupported exact asset type: ${assetType}`);
  }
  return {
    asset_type: assetType as ExperimentFoundationV2ExactAssetRevisionRef['asset_type'],
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: revisionSequence,
    content_hash: contentHash,
  };
}

function functionalRef(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId,
  };
}

function asFunctionalRef(value: unknown): TopicSelectionFunctionalRef {
  const row = asObject(value);
  const refType = row.ref_type;
  const refId = row.ref_id;
  const titleCardId = row.title_card_id;
  const versionId = row.version_id;
  if (
    typeof refType !== 'string'
    || typeof refId !== 'string'
    || typeof titleCardId !== 'string'
    || (versionId !== undefined && versionId !== null && typeof versionId !== 'string')
  ) {
    throw new Error('Invalid functional ref JSON');
  }
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: titleCardId,
    version_id: versionId ?? null,
  };
}

function asFunctionalRefArray(value: unknown): TopicSelectionFunctionalRef[] {
  if (!Array.isArray(value)) throw new Error('Expected functional ref array JSON');
  return value.map((entry) => asFunctionalRef(entry));
}

function traceRowLineage(row: {
  literatureLineage: Prisma.JsonValue;
  experimentLineage: Prisma.JsonValue;
  artifactLineage: Prisma.JsonValue;
  decisionLineage: Prisma.JsonValue;
  internalInterpretationLineage: Prisma.JsonValue;
}): TraceLineageBundle {
  return {
    literature: asTraceLiteratureLineage(row.literatureLineage),
    experiment: asTraceExperimentLineage(row.experimentLineage),
    artifact: asTraceArtifactLineage(row.artifactLineage),
    decision: asTraceDecisionLineage(row.decisionLineage),
    internal_interpretation: asTraceInternalInterpretationLineage(
      row.internalInterpretationLineage,
    ),
  };
}

function asTraceLiteratureLineage(value: unknown): TraceLineageBundle['literature'] {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'literature_evidence_refs',
    'source_locator_refs',
    'citation_candidate_refs',
  ], 'trace literature lineage');
  return {
    literature_evidence_refs: asFunctionalRefArray(row.literature_evidence_refs),
    source_locator_refs: asFunctionalRefArray(row.source_locator_refs),
    citation_candidate_refs: asFunctionalRefArray(row.citation_candidate_refs),
  };
}

function asTraceExperimentLineage(value: unknown): TraceLineageBundle['experiment'] {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'experiment_plan_refs',
    'work_order_refs',
    'run_refs',
    'run_evidence_refs',
    'result_packet_refs',
    'metric_refs',
  ], 'trace experiment lineage');
  return {
    experiment_plan_refs: asFunctionalRefArray(row.experiment_plan_refs),
    work_order_refs: asFunctionalRefArray(row.work_order_refs),
    run_refs: asFunctionalRefArray(row.run_refs),
    run_evidence_refs: asFunctionalRefArray(row.run_evidence_refs),
    result_packet_refs: asFunctionalRefArray(row.result_packet_refs),
    metric_refs: asFunctionalRefArray(row.metric_refs),
  };
}

function asTraceArtifactLineage(value: unknown): TraceLineageBundle['artifact'] {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'dataset_refs',
    'baseline_refs',
    'code_version_refs',
    'model_checkpoint_refs',
    'config_refs',
    'log_artifact_refs',
  ], 'trace artifact lineage');
  return {
    dataset_refs: asFunctionalRefArray(row.dataset_refs),
    baseline_refs: asFunctionalRefArray(row.baseline_refs),
    code_version_refs: asFunctionalRefArray(row.code_version_refs),
    model_checkpoint_refs: asFunctionalRefArray(row.model_checkpoint_refs),
    config_refs: asFunctionalRefArray(row.config_refs),
    log_artifact_refs: asFunctionalRefArray(row.log_artifact_refs),
  };
}

function asTraceDecisionLineage(value: unknown): TraceLineageBundle['decision'] {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'validation_cycle_refs',
    'motive_evolution_decision_refs',
    'gate_result_refs',
    'human_decision_refs',
    'accepted_risk_refs',
  ], 'trace decision lineage');
  return {
    validation_cycle_refs: asFunctionalRefArray(row.validation_cycle_refs),
    motive_evolution_decision_refs: asFunctionalRefArray(row.motive_evolution_decision_refs),
    gate_result_refs: asFunctionalRefArray(row.gate_result_refs),
    human_decision_refs: asFunctionalRefArray(row.human_decision_refs),
    accepted_risk_refs: asFunctionalRefArray(row.accepted_risk_refs),
  };
}

function asTraceInternalInterpretationLineage(
  value: unknown,
): TraceLineageBundle['internal_interpretation'] {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'result_interpretation_refs',
    'llm_rationale_refs',
    'board_summary_refs',
    'non_citable_refs',
  ], 'trace internal interpretation lineage');
  return {
    result_interpretation_refs: asFunctionalRefArray(row.result_interpretation_refs),
    llm_rationale_refs: asFunctionalRefArray(row.llm_rationale_refs),
    board_summary_refs: asFunctionalRefArray(row.board_summary_refs),
    non_citable_refs: asFunctionalRefArray(row.non_citable_refs),
  };
}

function asTraceIntegrity(value: unknown): TraceIntegrity {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'missing_refs',
    'broken_refs',
    'stale_refs',
    'invalidated_refs',
    'non_citable_refs',
    'partial_refs',
  ], 'trace integrity');
  return {
    missing_refs: asFunctionalRefArray(row.missing_refs),
    broken_refs: asFunctionalRefArray(row.broken_refs),
    stale_refs: asFunctionalRefArray(row.stale_refs),
    invalidated_refs: asFunctionalRefArray(row.invalidated_refs),
    non_citable_refs: asFunctionalRefArray(row.non_citable_refs),
    partial_refs: asFunctionalRefArray(row.partial_refs),
  };
}

function asMotiveEvidenceBoardSummary(value: unknown): MotiveEvidenceBoardSummary {
  const row = asObject(value);
  assertExactJsonKeys(row, [
    'current_support_summary',
    'current_challenge_summary',
    'unresolved_conflicts',
    'board_gap_summary',
    'next_evidence_needed',
  ], 'motive evidence board summary');
  return {
    current_support_summary: asString(row.current_support_summary, 'current_support_summary'),
    current_challenge_summary: asString(row.current_challenge_summary, 'current_challenge_summary'),
    unresolved_conflicts: asStringArray(row.unresolved_conflicts, 'unresolved_conflicts'),
    board_gap_summary: asString(row.board_gap_summary, 'board_gap_summary'),
    next_evidence_needed: asStringArray(row.next_evidence_needed, 'next_evidence_needed'),
  };
}

function asEnum<const T extends readonly string[]>(
  value: string,
  allowed: T,
  label: string,
): T[number] {
  if (!allowed.includes(value)) throw new Error(`Invalid ${label}: ${value}`);
  return value as T[number];
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}`);
  return value;
}

function asStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function assertExactJsonKeys(
  row: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(row).sort();
  const orderedExpected = [...expected].sort();
  assert.deepEqual(actual, orderedExpected, `Invalid ${label} keys`);
}

function asObject(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

async function injectJson<T>(
  app: ReturnType<typeof buildApp>,
  input: {
    method: 'POST';
    url: string;
    payload: unknown;
    expectedStatuses: number[];
  },
): Promise<{ statusCode: number; body: T }> {
  const response = await app.inject({
    method: 'POST',
    url: input.url,
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(input.payload),
  });
  if (!input.expectedStatuses.includes(response.statusCode)) {
    throw new Error(`Product route failed ${response.statusCode} ${input.url}: ${response.body}`);
  }
  return { statusCode: response.statusCode, body: response.json() as T };
}

async function digestTables(
  prisma: PrismaClient,
  tableNames: readonly string[],
): Promise<{
  algorithm: string;
  aggregate_count: number;
  aggregate_digest: string;
  tables: Record<string, ExperimentFoundationNamedLocalRowDigest>;
}> {
  const tables = await digestExperimentFoundationNamedLocalTables(prisma, tableNames);
  return {
    algorithm: 'id-ordered-row-json-sha256@v1',
    aggregate_count: Object.values(tables).reduce((sum, row) => sum + row.count, 0),
    aggregate_digest: `sha256:${sha256Bytes(
      canonicalizeExperimentFoundationEvidenceJson(tables),
    )}`,
    tables,
  };
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}


function assertExpectedConfig(mode: ScriptMode): void {
  assert.equal(strictBoolean('PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED'), true);
  assert.equal(
    strictBoolean('PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED'),
    mode === 'apply',
  );
  assert.equal(strictBoolean('EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED'), false);
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
  let bridgeId: string | null = null;
  let bridgePayloadHash: string | null = null;
  let paperProjectId: string | null = null;
  let output: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1] ?? null;
    if (key === '--mode') {
      if (value !== 'apply' && value !== 'verify') throw new Error('--mode must be apply or verify');
      mode = value;
    } else if (key === '--run-id') {
      runId = value;
    } else if (key === '--bridge-id') {
      bridgeId = value;
    } else if (key === '--bridge-payload-hash') {
      bridgePayloadHash = value;
    } else if (key === '--paper-project-id') {
      paperProjectId = value;
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
  if (!bridgeId || !bridgePayloadHash || !paperProjectId) {
    throw new Error('--bridge-id, --bridge-payload-hash, and --paper-project-id are required');
  }
  if (!/^[a-f0-9]{64}$/.test(bridgePayloadHash)) {
    throw new Error('--bridge-payload-hash must be a lowercase sha256 hex digest');
  }
  const outputPath = output
    ? path.resolve(REPO_ROOT, output)
    : path.join(ARTIFACT_ROOT, runId, 'packa-product-landing.json');
  if (
    !outputPath.startsWith(`${ARTIFACT_ROOT}${path.sep}`)
    && !outputPath.startsWith(`${DURABLE_ARTIFACT_ROOT}${path.sep}`)
  ) {
    throw new Error('--output must stay under the Pack A temporary or durable artifact root');
  }
  return { mode, runId, bridgeId, bridgePayloadHash, paperProjectId, outputPath };
}

await main();
