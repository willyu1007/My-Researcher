#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import type { PrismaClient } from '@prisma/client';
import type {
  ExperimentFoundationV2ExactAssetRevisionRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  BootstrapImplementationProjectResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  PaperImplementationExperimentV2AdmissionRequest,
  PaperImplementationExperimentV2AdmissionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';
import type {
  AdmitCoreMotiveVersionResponse,
  CoreMotiveDraftResponse,
  CreateCoreMotiveDraftRequest,
  CreateEvidenceBindingInput,
  CreateMotiveEvidenceBoardVersionRequest,
  CreateMotiveEvidenceBoardVersionResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateValidationCycleDraftRequest,
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { buildApp } from '../src/app.js';
import { getPrismaClient } from '../src/repositories/prisma/prisma-client.js';
import { PrismaExperimentFoundationExecutionBundleV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-repository.js';
import { PrismaExperimentFoundationSpineV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-spine-v2-repository.js';
import { PrismaExperimentFoundationV2Repository } from '../src/repositories/prisma/prisma-experiment-foundation-v2-repository.js';
import { PrismaPaperImplementationExperimentSpineV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-experiment-spine-v2-repository.js';
import { PrismaPaperImplementationValidationCycleClosureV2Repository } from '../src/repositories/prisma/prisma-paper-implementation-validation-cycle-closure-v2-repository.js';
import { ExperimentFoundationExecutionBundleV2Service } from '../src/services/experiment-foundation-execution-bundle-v2-service.js';
import { ExperimentFoundationV2AcknowledgementService } from '../src/services/experiment-foundation-v2-acknowledgement-service.js';
import {
  ExperimentFoundationV2MaterializationService,
  type ExperimentFoundationV2ReadinessResolver,
} from '../src/services/experiment-foundation-v2-materialization-service.js';
import { ExperimentFoundationV2Service } from '../src/services/experiment-foundation-v2-service.js';
import { ExperimentV2IntegrationRelayService } from '../src/services/experiment-v2-integration-relay-service.js';
import { PaperImplementationExperimentV2HeadService } from '../src/services/paper-implementation-experiment-v2-head-service.js';
import {
  T137_RESEARCH_INTENT,
  T137_SEMANTIC_PROFILE_ID,
} from './t137-scientific-dossier-canary-profile.js';

const SCIENTIFIC_PROTOCOL_ID = 't136-p5-protocol-scifact-micro-recall';
const SCIENTIFIC_METRIC_ID = 't136-p5-metric-scifact-micro-recall-ppm';
const EXECUTION_BUNDLE_KEY = 't136-p5-scifact-scientific-v2';

interface Args {
  runId: string;
  bridgeId: string;
  bridgeHash: string;
  paperProjectId: string;
  outputPath: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const ids = scopedIds(args.runId);
  const prisma = getPrismaClient();
  await prisma.$connect();
  let app: ReturnType<typeof buildApp> | null = null;
  try {
    const source = await readSource(prisma, args);
    const scientific = await resolveScientificDependencies(prisma);
    app = buildApp({
      backgroundWorkEnabled: false,
      paperImplementationExperimentV2AdmissionEnabled: () => true,
      paperImplementationExperimentV2CutoverCommitted: () => true,
    });
    await app.ready();

    const bootstrap = await injectJson<BootstrapImplementationProjectResponse>(app, {
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: args.bridgeId,
        bridge_payload_hash: args.bridgeHash,
        created_by: 'system',
      },
      expectedStatuses: [200, 201],
    });
    const project = bootstrap.body.implementation_project;
    assert.equal(project.target_paper_project_ref?.ref_id, args.paperProjectId);
    assert.equal(project.lifecycle_status, 'active');

    const humanDecisionRef = asFunctionalRef(source.humanConfirmedDecisionRef);
    const literatureRefs = asFunctionalRefArray(source.sourceRefs).filter((ref) => (
      ref.ref_type === 'evidence_unit'
      || ref.ref_type === 'literature_evidence_unit'
      || ref.ref_type === 'literature_record'
    ));
    assert.ok(literatureRefs.length > 0, 'PaperProject bridge carries no literature lineage.');
    const topicPackageRef = functionalRef(
      'topic_package',
      source.topicPackageId,
      project.title_card_id,
      source.packageVersion,
    );

    const motiveRequest = motiveDraft(ids, topicPackageRef, humanDecisionRef, literatureRefs);
    let motiveVersion = await prisma.paperImplementationCoreMotiveVersion.findUnique({
      where: { id: ids.motiveVersionId },
    });
    if (!motiveVersion) {
      const created = await injectJson<CoreMotiveDraftResponse>(app, {
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(project.implementation_project_id)}/core-motives/drafts`,
        payload: motiveRequest,
        expectedStatuses: [201],
      });
      assert.equal(created.body.core_motive_version.core_motive_version_id, ids.motiveVersionId);
      motiveVersion = await prisma.paperImplementationCoreMotiveVersion.findUnique({
        where: { id: ids.motiveVersionId },
      });
    }
    assert.ok(motiveVersion);
    assert.equal(motiveVersion.implementationProjectId, project.implementation_project_id);
    if (motiveVersion.versionStatus === 'draft') {
      const trace = await ensureTrace(app, prisma, {
        implementationProjectId: project.implementation_project_id,
        titleCardId: project.title_card_id,
        targetType: 'core_motive_version',
        targetId: ids.motiveVersionId,
        targetVersionId: 'v1',
        lineage: traceLineage(literatureRefs, humanDecisionRef),
      });
      await injectJson<AdmitCoreMotiveVersionResponse>(app, {
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(project.implementation_project_id)}`
          + `/core-motives/${encodeURIComponent(ids.motiveId)}`
          + `/versions/${encodeURIComponent(ids.motiveVersionId)}/admit`,
        payload: {
          trace_manifest_id: trace.trace_manifest_id,
          portfolio_role: 'primary',
          confirmation_level: 'human_confirmed',
          confirmed_by: 'human',
          created_by: 'system',
        },
        expectedStatuses: [200],
      });
    }

    await ensureEvidenceBoard(app, prisma, {
      ids,
      implementationProjectId: project.implementation_project_id,
      titleCardId: project.title_card_id,
      literatureRefs,
      humanDecisionRef,
    });

    const cycleRequest = validationCycleDraft(ids, project.title_card_id, humanDecisionRef);
    let cycle = await prisma.paperImplementationValidationCycle.findUnique({
      where: { id: ids.validationCycleId },
    });
    if (!cycle) {
      await injectJson<ValidationCycle>(app, {
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(project.implementation_project_id)}/validation-cycles/drafts`,
        payload: cycleRequest,
        expectedStatuses: [201],
      });
      cycle = await prisma.paperImplementationValidationCycle.findUnique({
        where: { id: ids.validationCycleId },
      });
    }
    assert.ok(cycle);
    if (cycle.cycleStatus === 'proposed') {
      const trace = await ensureTrace(app, prisma, {
        implementationProjectId: project.implementation_project_id,
        titleCardId: project.title_card_id,
        targetType: 'validation_cycle',
        targetId: ids.validationCycleId,
        targetVersionId: 'v1',
        lineage: traceLineage(literatureRefs, humanDecisionRef),
      });
      await injectJson<ValidationCycle>(app, {
        method: 'POST',
        url: `/paper-implementation/projects/${encodeURIComponent(project.implementation_project_id)}`
          + `/validation-cycles/${encodeURIComponent(ids.validationCycleId)}/admit`,
        payload: {
          trace_manifest_id: trace.trace_manifest_id,
          confirmation_level: 'human_confirmed',
          confirmed_by: 'human',
          created_by: 'system',
        },
        expectedStatuses: [200],
      });
    }

    const admission = await ensureWorkOrderAdmission(app, prisma, {
      implementationProjectId: project.implementation_project_id,
      validationCycleId: ids.validationCycleId,
      request: workOrderRequest(ids, scientific),
    });

    const relay = buildRelay(prisma, ids.workerId);
    const relayOutcome = await relay.drainUntilIdle({ max_passes: 10, limit_per_domain: 10 });
    assert.equal(relayOutcome.idle, true);
    assert.deepEqual(relayOutcome.failures, []);

    const run = await prisma.experimentFoundationRunV2.findUnique({
      where: { externalPiWorkOrderRevisionId: admission.body.revision.work_order_revision_id },
      include: { cells: { orderBy: { ordinal: 'asc' } }, runRecipe: true },
    });
    assert.ok(run, 'Relay did not materialize the T-137 EF Run.');
    assert.equal(run.cells.length, 2);
    assert.equal(run.runRecipe.executionBundleRevisionId, scientific.bundle.revision.execution_bundle_revision_id);
    const taskSpecs = await prisma.experimentFoundationTrainingTaskSpecV2.findMany({
      where: { externalPiWorkOrderRevisionId: admission.body.revision.work_order_revision_id },
      orderBy: { cellOrdinal: 'asc' },
    });
    assert.equal(taskSpecs.length, 2);

    const prePaiCounts = await readPrePaiCounts(prisma, run.id);
    assert.deepEqual(prePaiCounts, {
      provider_payloads: 0,
      execution_attempts: 0,
      experiment_results: 0,
      scientific_validation_reports: 0,
      evidence_candidates: 0,
    });

    const summary = {
      schema_version: 't137-scientific-dossier-preflight@v1',
      status: 'passed',
      semantic_profile_id: T137_SEMANTIC_PROFILE_ID,
      run_id: args.runId,
      stopped_at: 'pre_pai',
      source: {
        paper_project_bridge_id: args.bridgeId,
        bridge_payload_hash: args.bridgeHash,
        paper_project_id: args.paperProjectId,
        title_card_id: project.title_card_id,
        literature_ref_count: literatureRefs.length,
      },
      paper_implementation: {
        implementation_project_id: project.implementation_project_id,
        project_created: bootstrap.body.project_created,
        motive_id: ids.motiveId,
        motive_version_id: ids.motiveVersionId,
        validation_cycle_id: ids.validationCycleId,
        work_order_revision_id: admission.body.revision.work_order_revision_id,
        work_order_revision_hash: admission.body.revision.content_hash,
        admission_replayed: admission.body.replayed,
        admission_source: admission.source,
      },
      experiment_foundation: {
        readiness_attestation_id: scientific.readiness.readiness_attestation_id,
        readiness_attestation_hash: scientific.readiness.attestation_hash,
        evaluation_protocol: scientific.protocol,
        metric_definition: scientific.metric,
        execution_bundle_revision_id: scientific.bundle.revision.execution_bundle_revision_id,
        execution_bundle_hash: scientific.bundle.revision.content_hash,
        run_id: run.id,
        run_manifest_hash: run.runManifestHash,
        run_cell_ids: run.cells.map((cell) => cell.id),
        training_task_spec_ids: taskSpecs.map((task) => task.id),
      },
      relay: relayOutcome,
      pre_pai_write_counts: prePaiCounts,
    };
    await fs.mkdir(path.dirname(args.outputPath), { recursive: true });
    await fs.writeFile(args.outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
  }
}

function motiveDraft(
  ids: ReturnType<typeof scopedIds>,
  topicPackageRef: TopicSelectionFunctionalRef,
  humanDecisionRef: TopicSelectionFunctionalRef,
  literatureRefs: TopicSelectionFunctionalRef[],
): CreateCoreMotiveDraftRequest {
  return {
    motive_id: ids.motiveId,
    core_motive_version_id: ids.motiveVersionId,
    motive_contract: {
      short_name: 'SciFact retrieval-depth evidence',
      motivation_claim: T137_RESEARCH_INTENT.goal,
      problem_pressure: 'Retrieval depth is often tuned without a bounded, reviewer-auditable measurement.',
      current_solution_insufficiency: 'The selected literature motivates the tradeoff but does not answer the fixed SciFact comparison.',
      unmet_or_failure_mechanism: 'A broader or mutable comparison would sever the topic-to-evidence meaning.',
      target_setting: 'SciFact positive-judgment exact-token retrieval evaluation.',
      expected_contribution_path: 'Produce one bounded empirical finding from the fixed two-cell comparison.',
      why_this_is_not_trivial: 'The evidence must preserve exact assets, metric ownership, cell difference, and claim ceiling.',
      why_existing_baselines_do_not_already_solve_it: 'The source lane provides motivation and constraints, not this exact controlled result.',
      what_makes_this_researchable_now: 'The admitted SciFact protocol and execution bundle are exact-ready.',
    },
    scope_contract: {
      included_scope: [...T137_RESEARCH_INTENT.fixed_inputs, 'retrieval_top_k 10 versus 5'],
      excluded_scope: [...T137_RESEARCH_INTENT.prohibited_claims],
      non_goals: [...T137_RESEARCH_INTENT.prohibited_claims],
      evaluation_scope: 'scifact_exact_token_two_cell',
    },
    falsification_contract: {
      invalidation_conditions: ['Either cell changes a non-top-k scientific input.'],
      weakening_conditions: ['The metric difference remains inside the +/-10,000 ppm inconclusive interval.'],
      minimum_evidence_to_continue: ['Two validated server-owned micro_recall_ppm observations.'],
      decisive_negative_conditions: ['top-k 10 minus top-k 5 is at most -10,000 ppm.'],
    },
    claim_boundary: {
      maximum_allowed_claim: T137_RESEARCH_INTENT.claim_ceiling,
      minimum_defensible_contribution_claim: 'The fixed two-cell comparison yields a traceable SciFact result.',
      forbidden_overclaims: [...T137_RESEARCH_INTENT.prohibited_claims],
      claim_types_allowed: ['bounded_empirical_finding'],
    },
    source_refs: [topicPackageRef, ...literatureRefs],
    source_human_judgment_refs: [humanDecisionRef],
    assertions: [{
      assertion_id: ids.assertionId,
      assertion_type: 'experimental_answerability',
      assertion_text: T137_RESEARCH_INTENT.question,
      importance: { role: 'core', must_hold_for_motive_to_continue: true },
      validation_requirements: {
        minimum_support_level: 'strong',
        required_evidence_types: ['experiment_result'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['The difference is at most -10,000 ppm.'],
        what_would_weaken_this: ['The difference is between -10,000 ppm and 10,000 ppm.'],
      },
      expected_initial_status: 'untested',
    }],
    hypothesis_only: true,
    created_by: 'system',
  };
}

function validationCycleDraft(
  ids: ReturnType<typeof scopedIds>,
  titleCardId: string,
  humanDecisionRef: TopicSelectionFunctionalRef,
): CreateValidationCycleDraftRequest {
  return {
    validation_cycle_id: ids.validationCycleId,
    target: {
      target_type: 'core_motive_version',
      target_id: ids.motiveVersionId,
      target_version_id: '1',
    },
    trigger: { trigger_type: 'human_request', trigger_refs: [humanDecisionRef] },
    cycle_type: 'probe_execution',
    validation_frame: {
      validation_question: T137_RESEARCH_INTENT.question,
      assumptions_under_test: [...T137_RESEARCH_INTENT.fixed_inputs],
      assertions_under_test: [functionalRef('motive_assertion', ids.assertionId, titleCardId)],
      decision_if_pass: 'Admit only the bounded positive SciFact finding.',
      decision_if_fail: 'Record contradiction and stop the positive claim path.',
      decision_if_inconclusive: 'Do not promote a directional claim.',
      expected_information_gain: 'high',
      why_this_cycle_now: 'The literature-backed topic and exact SciFact execution dependencies are ready.',
    },
    context: {
      included_refs: {
        motive_version_refs: [functionalRef('core_motive_version', ids.motiveVersionId, titleCardId, '1')],
        board_version_refs: [],
        evidence_refs: [],
        route_refs: [],
        work_order_refs: [],
        result_packet_refs: [],
        experiment_plan_light_refs: [],
      },
      excluded_context_notes: ['Historical T-136 runs, results, evidence, claims, and dossiers are not inputs.'],
    },
    criteria: {
      pass_conditions: ['top-k 10 minus top-k 5 is at least 10,000 ppm.'],
      fail_conditions: ['top-k 10 minus top-k 5 is at most -10,000 ppm.'],
      inconclusive_conditions: ['The difference is strictly between -10,000 ppm and 10,000 ppm.'],
      stop_conditions: ['Stop before provider payload materialization until the PAI continuation.'],
      minimum_artifacts_required: ['Two exact training task specs bound to one immutable Run.'],
    },
    budget: {
      budget_id: ids.budgetId,
      max_runtime: 'PT30M',
      max_compute: 'two_cpu_cells',
      max_human_review_count: 1,
      retry_budget: 0,
    },
    confirmation_level: 'human_confirmed',
    confirmed_by: 'human',
    created_by: 'system',
  };
}

function workOrderRequest(
  ids: ReturnType<typeof scopedIds>,
  scientific: Awaited<ReturnType<typeof resolveScientificDependencies>>,
): PaperImplementationExperimentV2AdmissionRequest {
  const request: PaperImplementationExperimentV2AdmissionRequest = {
    branch_key: ids.branchKey,
    branch_frame: {
      frame_schema_version: 'v1',
      display_name: 'T-137 SciFact retrieval-depth canary',
      scientific_intent: T137_RESEARCH_INTENT.goal,
      comparison_role: 'primary',
      parent_branch_key: null,
    },
    work_order_revision: {
      work_order_schema_version: 'v2',
      title: 'T-137 SciFact top-k 10 versus top-k 5',
      objective: `${T137_RESEARCH_INTENT.question} Stop at the pre-PAI boundary.`,
      readiness_attestation_id: scientific.readiness.readiness_attestation_id,
      readiness_attestation_hash: scientific.readiness.attestation_hash,
      asset_dependencies: [...scientific.dependencies, scientific.protocol],
      execution_bundle: {
        execution_bundle_id: scientific.bundle.revision.execution_bundle_id,
        execution_bundle_revision_id: scientific.bundle.revision.execution_bundle_revision_id,
        revision_sequence: scientific.bundle.revision.revision_sequence,
        content_hash: scientific.bundle.revision.content_hash,
      },
      resource_snapshot: { cpu_cores: 2, memory_mb: 8_192 },
      run_policy: { max_attempts_per_cell: 1, timeout_seconds: 1_800 },
    },
    exact_cells: [10, 5].map((topK) => ({
      cell_key: `retriever-top-k-${topK}`,
      seed: 42,
      repeat_index: 0,
      parameters: [
        { name: 'batch_size', value: 8 },
        { name: 'retrieval_top_k', value: topK },
      ],
      required_result_contract: {
        metrics: [{ metric_definition: typedMetricRef(scientific.metric), required_cardinality: 1 }],
        artifacts: [],
      },
    })),
    business_idempotency_key: ids.businessKey,
  };
  return request;
}

async function ensureWorkOrderAdmission(
  app: NonNullable<ReturnType<typeof buildApp>>,
  prisma: PrismaClient,
  input: {
    implementationProjectId: string;
    validationCycleId: string;
    request: PaperImplementationExperimentV2AdmissionRequest;
  },
): Promise<{
  body: PaperImplementationExperimentV2AdmissionResponse;
  source: 'http_writer' | 'persisted_owner_reader';
}> {
  const repository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const branch = await repository.findBranch(
    input.implementationProjectId,
    input.validationCycleId,
    input.request.branch_key,
  );
  const existing = branch
    ? await repository.findAdmissionByBusinessKey(
      branch.branch_id,
      input.request.business_idempotency_key,
    )
    : null;
  if (existing) {
    assert.deepEqual(existing.branch.branch_frame, input.request.branch_frame);
    assert.deepEqual(existing.revision.work_order_revision, input.request.work_order_revision);
    assert.deepEqual(
      [...existing.cells]
        .sort((left, right) => left.ordinal - right.ordinal)
        .map(({
          work_order_cell_id: _cellId,
          work_order_revision_id: _revisionId,
          ordinal: _ordinal,
          cell_hash: _cellHash,
          ...cell
        }) => cell),
      input.request.exact_cells,
    );
    return {
      body: {
        branch: existing.branch,
        revision: existing.revision,
        cells: existing.cells,
        admission: existing.admission,
        replayed: true,
      },
      source: 'persisted_owner_reader',
    };
  }

  const admitted = await injectJson<PaperImplementationExperimentV2AdmissionResponse>(app, {
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(input.implementationProjectId)}`
      + `/validation-cycles/${encodeURIComponent(input.validationCycleId)}`
      + '/experiment-work-orders/v2/admissions',
    payload: input.request,
    expectedStatuses: [201],
  });
  return { body: admitted.body, source: 'http_writer' };
}

async function resolveScientificDependencies(prisma: PrismaClient) {
  const readinessRow = await prisma.experimentFoundationReadinessAttestationV2.findFirst({
    where: {
      targetAssetType: 'EvaluationProtocol',
      targetAssetId: SCIENTIFIC_PROTOCOL_ID,
      outcome: 'passed',
    },
    include: { dependencies: { orderBy: { ordinal: 'asc' } } },
    orderBy: { attestedAt: 'desc' },
  });
  assert.ok(readinessRow, 'No passed exact SciFact protocol readiness exists.');
  const protocol = exactRef(
    readinessRow.targetAssetType,
    readinessRow.targetAssetId,
    readinessRow.targetRevisionId,
    readinessRow.targetRevisionSequence,
    readinessRow.targetRevisionHash,
  );
  const dependencies = readinessRow.dependencies.map((row) => exactRef(
    row.dependencyAssetType,
    row.dependencyAssetId,
    row.dependencyRevisionId,
    row.dependencyRevisionSequence,
    row.dependencyRevisionHash,
  ));
  const metric = dependencies.find((ref) => (
    ref.asset_type === 'MetricDefinition' && ref.logical_id === SCIENTIFIC_METRIC_ID
  ));
  assert.ok(metric, 'SciFact readiness does not include the server-owned micro_recall_ppm metric.');

  const assetService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  const readiness = await assetService.revalidateReadiness({
    target: protocol,
    readiness_attestation_id: readinessRow.id,
    expected_dependencies: dependencies,
  });
  assert.equal(readiness.attestation.status, 'passed');
  assert.equal(readiness.attestation.attestation_hash, readinessRow.attestationHash);

  const identity = await prisma.experimentFoundationExecutionBundleIdentityV2.findUnique({
    where: { bundleKey: EXECUTION_BUNDLE_KEY },
    include: {
      revisions: {
        where: {
          lifecycleProjection: { is: { lifecycleStatus: 'active' } },
          readinessRecords: { some: { outcome: 'passed' } },
        },
        orderBy: { revisionSequence: 'desc' },
      },
    },
  });
  const revision = identity?.revisions[0];
  assert.ok(revision, 'No active ready SciFact execution bundle revision exists.');
  const bundleService = new ExperimentFoundationExecutionBundleV2Service({
    repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
  });
  const bundle = await bundleService.resolveActiveReadyExact({
    execution_bundle_revision_id: revision.id,
    content_hash: revision.contentHash,
  });
  return { readiness: readiness.attestation, protocol, dependencies, metric, bundle };
}

function buildRelay(prisma: PrismaClient, workerId: string) {
  const assetService = new ExperimentFoundationV2Service(
    new PrismaExperimentFoundationV2Repository(prisma),
  );
  const bundleService = new ExperimentFoundationExecutionBundleV2Service({
    repository: new PrismaExperimentFoundationExecutionBundleV2Repository(prisma),
  });
  const piRepository = new PrismaPaperImplementationExperimentSpineV2Repository(prisma);
  const efRepository = new PrismaExperimentFoundationSpineV2Repository(prisma);
  const cycleClosureLookup = new PrismaPaperImplementationValidationCycleClosureV2Repository(prisma);
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
      cycleClosureLookup,
      executionBundleResolver: bundleService,
    }),
    headConsumer: new PaperImplementationExperimentV2HeadService({
      repository: piRepository,
      cycleClosureLookup,
    }),
    acknowledgementConsumer: new ExperimentFoundationV2AcknowledgementService({ repository: efRepository }),
    workerId,
    retryDelayMs: 0,
  });
}

async function ensureTrace(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  input: {
    implementationProjectId: string;
    titleCardId: string;
    targetType: string;
    targetId: string;
    targetVersionId: string;
    lineage: TraceLineageBundle;
  },
) {
  const existing = await prisma.paperImplementationTraceManifest.findFirst({
    where: {
      implementationProjectId: input.implementationProjectId,
      targetRefType: input.targetType,
      targetRefId: input.targetId,
      targetVersionId: input.targetVersionId,
      traceStatus: 'complete',
    },
  });
  if (existing) {
    return { trace_manifest_id: existing.id };
  }
  const created = await injectJson<TraceManifest>(app, {
    method: 'POST',
    url: `/paper-implementation/projects/${encodeURIComponent(input.implementationProjectId)}/trace-manifests`,
    payload: {
      target_ref: functionalRef(
        input.targetType,
        input.targetId,
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

function traceLineage(
  literatureRefs: TopicSelectionFunctionalRef[],
  humanDecisionRef: TopicSelectionFunctionalRef,
): TraceLineageBundle {
  return {
    literature: {
      literature_evidence_refs: literatureRefs,
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
      human_decision_refs: [humanDecisionRef],
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

async function ensureEvidenceBoard(
  app: ReturnType<typeof buildApp>,
  prisma: PrismaClient,
  input: {
    ids: ReturnType<typeof scopedIds>;
    implementationProjectId: string;
    titleCardId: string;
    literatureRefs: TopicSelectionFunctionalRef[];
    humanDecisionRef: TopicSelectionFunctionalRef;
  },
) {
  const existing = await prisma.paperImplementationMotiveEvidenceBoardVersion.findUnique({
    where: { id: input.ids.boardVersionId },
  });
  if (existing) {
    assert.equal(existing.implementationProjectId, input.implementationProjectId);
    assert.equal(existing.readinessStatus, 'evidence_ready');
    return;
  }
  const evidenceUnits = await prisma.topicSelectionEvidenceUnit.findMany({
    where: { id: { in: input.literatureRefs.map((ref) => ref.ref_id) } },
  });
  const roleById = new Map(evidenceUnits.map((unit) => [unit.id, unit.evidenceRole]));
  const lineage = traceLineage(input.literatureRefs, input.humanDecisionRef);
  const boardTrace = await ensureTrace(app, prisma, {
    implementationProjectId: input.implementationProjectId,
    titleCardId: input.titleCardId,
    targetType: 'motive_evidence_board_version',
    targetId: input.ids.boardVersionId,
    targetVersionId: 'v1',
    lineage,
  });
  const bindings = await Promise.all(input.literatureRefs.map(async (
    evidenceRef,
    index,
  ): Promise<CreateEvidenceBindingInput> => {
    const bindingId = input.ids.bindingId(index + 1);
    const bindingTrace = await ensureTrace(app, prisma, {
      implementationProjectId: input.implementationProjectId,
      titleCardId: input.titleCardId,
      targetType: 'evidence_binding',
      targetId: bindingId,
      targetVersionId: 'v1',
      lineage,
    });
    const evidenceRole = roleById.get(evidenceRef.ref_id);
    assert.ok(evidenceRole, `Missing evidence role for ${evidenceRef.ref_id}`);
    const bindingRole = ({
      support: 'support',
      challenge: 'challenge',
      baseline: 'qualify',
      context: 'contextualize',
    } as const)[evidenceRole as 'support' | 'challenge' | 'baseline' | 'context'];
    assert.ok(bindingRole, `Unsupported evidence role ${evidenceRole}`);
    return {
      binding_id: bindingId,
      assertion_id: input.ids.assertionId,
      evidence_ref: evidenceRef,
      role: bindingRole,
      scope: { method_scope: 'fixed SciFact exact-token retrieval-depth comparison' },
      strength: {
        directness: 'moderate',
        reliability: 'high',
        reproducibility: 'partial',
        freshness: 'fresh',
      },
      support_state: 'weak',
      challenge_status: evidenceRole === 'challenge' ? 'addressed' : 'none',
      interpretation: {
        normalized_statement: `The ${evidenceRole} source constrains the fixed T-137 retrieval-depth question.`,
        why_relevant_to_assertion: 'It anchors the executable comparison to the promoted literature-backed topic.',
        limitations: ['Literature context is not scientific result evidence for the new EF Run.'],
      },
      trace_manifest_id: bindingTrace.trace_manifest_id,
    };
  }));
  const request: CreateMotiveEvidenceBoardVersionRequest = {
    board_version_id: input.ids.boardVersionId,
    motive_id: input.ids.motiveId,
    core_motive_version_id: input.ids.motiveVersionId,
    bindings,
    board_summary: {
      current_support_summary: 'The fixed four-source lane supports one bounded SciFact retrieval-depth comparison.',
      current_challenge_summary: 'Nearest-neighbor and measurement limits are carried into the claim ceiling.',
      unresolved_conflicts: [],
      board_gap_summary: 'Fresh provider-produced scientific observations remain intentionally absent before PAI.',
      next_evidence_needed: ['Two validated server-owned micro_recall_ppm observations.'],
    },
    board_state: {
      readiness_status: 'evidence_ready',
      blocker_status: 'none',
      freshness_status: 'fresh',
      support_state: 'partial',
      challenge_status: 'addressed',
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
  assert.equal(created.body.board_version.board_version_id, input.ids.boardVersionId);
  assert.equal(created.body.evidence_bindings.length, input.literatureRefs.length);
}

async function readPrePaiCounts(prisma: PrismaClient, runId: string) {
  const [providerPayloads, attempts, results, reports, candidates] = await Promise.all([
    prisma.experimentFoundationProviderPayloadV2.count({ where: { runId } }),
    prisma.experimentFoundationExecutionAttemptV2.count({ where: { runId } }),
    prisma.experimentFoundationExperimentResultV2.count({ where: { runId } }),
    prisma.experimentFoundationScientificValidationReportV2.count({ where: { runId } }),
    prisma.experimentFoundationEvidenceCandidateV2.count({ where: { runId } }),
  ]);
  return {
    provider_payloads: providerPayloads,
    execution_attempts: attempts,
    experiment_results: results,
    scientific_validation_reports: reports,
    evidence_candidates: candidates,
  };
}

async function readSource(prisma: PrismaClient, args: Args) {
  const [bridge, paperProject] = await Promise.all([
    prisma.topicSelectionPaperProjectBridge.findUnique({ where: { id: args.bridgeId } }),
    prisma.paperProject.findUnique({ where: { id: args.paperProjectId } }),
  ]);
  assert.ok(bridge, 'T-137 PaperProjectBridge is missing.');
  assert.ok(paperProject, 'T-137 PaperProject is missing.');
  assert.equal(bridge.bridgeStatus, 'active');
  assert.equal(bridge.bridgePayloadHash, args.bridgeHash);
  assert.equal(asObject(bridge.targetPaperProjectRef).ref_id, args.paperProjectId);
  assert.equal(paperProject.status, 'active');
  return bridge;
}

function exactRef(
  assetType: string,
  logicalId: string,
  revisionId: string,
  revisionSequence: number,
  contentHash: string,
): ExperimentFoundationV2ExactAssetRevisionRef {
  assert.ok(['Dataset', 'DataPolicy', 'MetricDefinition', 'Benchmark', 'EvaluationProtocol'].includes(assetType));
  return {
    asset_type: assetType as ExperimentFoundationV2ExactAssetRevisionRef['asset_type'],
    logical_id: logicalId,
    revision_id: revisionId,
    revision_sequence: revisionSequence,
    content_hash: contentHash,
  };
}

function typedMetricRef(ref: ExperimentFoundationV2ExactAssetRevisionRef) {
  assert.equal(ref.asset_type, 'MetricDefinition');
  return { ...ref, asset_type: 'MetricDefinition' as const };
}

function functionalRef(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: titleCardId, version_id: versionId };
}

function asFunctionalRef(value: unknown): TopicSelectionFunctionalRef {
  const row = asObject(value);
  const refType = row.ref_type;
  const refId = row.ref_id;
  const titleCardId = row.title_card_id;
  const versionId = row.version_id;
  if (typeof refType !== 'string' || typeof refId !== 'string' || typeof titleCardId !== 'string') {
    throw new Error('Invalid functional ref.');
  }
  if (versionId !== undefined && versionId !== null && typeof versionId !== 'string') {
    throw new Error('Invalid functional ref version.');
  }
  return functionalRef(
    refType,
    refId,
    titleCardId,
    typeof versionId === 'string' ? versionId : null,
  );
}

function asFunctionalRefArray(value: unknown): TopicSelectionFunctionalRef[] {
  assert.ok(Array.isArray(value));
  return value.map((item) => asFunctionalRef(item));
}

function asObject(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}

function scopedIds(runId: string) {
  const scope = runId.replace(/[^a-zA-Z0-9]+/gu, '_').replace(/^_+|_+$/gu, '').toLowerCase();
  assert.ok(scope.length > 0, 'run id must contain at least one alphanumeric character');
  return {
    motiveId: `core_motive_t137_${scope}`,
    motiveVersionId: `core_motive_version_t137_${scope}_v1`,
    assertionId: `motive_assertion_t137_${scope}`,
    validationCycleId: `validation_cycle_t137_${scope}_v1`,
    boardVersionId: `motive_evidence_board_t137_${scope}_v1`,
    bindingId: (ordinal: number) => `evidence_binding_t137_${scope}_${ordinal}`,
    budgetId: `validation_budget_t137_${scope}_v1`,
    branchKey: `t137-scifact-${scope}`,
    businessKey: `t137-scifact-two-cell-${scope}`,
    workerId: `t137-preflight-${scope}`,
  };
}

async function injectJson<T>(
  app: ReturnType<typeof buildApp>,
  input: {
    method: 'POST';
    url: string;
    payload: unknown;
    expectedStatuses: number[];
  },
): Promise<{ body: T; statusCode: number }> {
  const response = await app.inject({
    method: input.method,
    url: input.url,
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(input.payload),
  });
  if (!input.expectedStatuses.includes(response.statusCode)) {
    throw new Error(`${input.method} ${input.url} returned ${response.statusCode}: ${response.body}`);
  }
  return { body: response.json() as T, statusCode: response.statusCode };
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Invalid argument near ${key ?? '<end>'}`);
    values.set(key, value);
  }
  const required = (key: string) => {
    const value = values.get(key)?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  return {
    runId: required('--run-id'),
    bridgeId: required('--bridge-id'),
    bridgeHash: required('--bridge-hash'),
    paperProjectId: required('--paper-project-id'),
    outputPath: path.resolve(required('--output')),
  };
}

await main();
