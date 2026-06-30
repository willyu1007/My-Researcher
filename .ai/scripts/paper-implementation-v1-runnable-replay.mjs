#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerPaperImplementationRoutes } from '../../apps/backend/src/routes/paper-implementation-routes.ts';
import { PaperImplementationController } from '../../apps/backend/src/controllers/paper-implementation-controller.ts';
import { AppError } from '../../apps/backend/src/errors/app-error.ts';
import { InMemoryPaperImplementationRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-repository.ts';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-ai-workflow-harness-repository.ts';
import { InMemoryPaperImplementationMotiveRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-motive-repository.ts';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-result-claim-dossier-repository.ts';
import { InMemoryPaperImplementationRuntimeRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-runtime-repository.ts';
import { InMemoryPaperImplementationTraceRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-trace-repository.ts';
import { InMemoryPaperImplementationValidationRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-validation-repository.ts';
import { InMemoryPaperImplementationWorkOrderRepository } from '../../apps/backend/src/repositories/in-memory-paper-implementation-workorder-repository.ts';
import { PaperImplementationIntakeBootstrapService } from '../../apps/backend/src/services/paper-implementation-intake-bootstrap-service.ts';
import { PaperImplementationAiWorkflowHarnessService } from '../../apps/backend/src/services/paper-implementation-ai-workflow-harness-service.ts';
import { PaperImplementationLiveExperimentAdapterService } from '../../apps/backend/src/services/paper-implementation-live-experiment-adapter-service.ts';
import { PaperImplementationMotiveEvidenceBoardService } from '../../apps/backend/src/services/paper-implementation-motive-evidence-board-service.ts';
import { PaperImplementationProviderVarianceEvaluationService } from '../../apps/backend/src/services/paper-implementation-provider-variance-evaluation-service.ts';
import { PaperImplementationResultClaimDossierService } from '../../apps/backend/src/services/paper-implementation-result-claim-dossier-service.ts';
import { PaperImplementationRuntimeAdmissionService } from '../../apps/backend/src/services/paper-implementation-runtime-admission-service.ts';
import { PaperImplementationTraceIntegrityDebateRuntimeService } from '../../apps/backend/src/services/paper-implementation-trace-integrity-debate-runtime-service.ts';
import { PaperImplementationTraceKernelService } from '../../apps/backend/src/services/paper-implementation-trace-kernel-service.ts';
import { PaperImplementationValidationCyclePlanningService } from '../../apps/backend/src/services/paper-implementation-validation-cycle-planning-service.ts';
import { PaperImplementationWorkOrderExperimentBridgeService } from '../../apps/backend/src/services/paper-implementation-workorder-experiment-bridge-service.ts';
import { PaperImplementationP1RuntimeReviewService } from '../../apps/backend/src/services/paper-implementation-p1-runtime-review-service.ts';
import { PaperImplementationResultAnalysisRuntimeService } from '../../apps/backend/src/services/paper-implementation-result-analysis-runtime-service.ts';
import { PaperImplementationExperimentPlanningRuntimeService } from '../../apps/backend/src/services/paper-implementation-experiment-planning-runtime-service.ts';
import { PaperImplementationRoutePlanningRuntimeService } from '../../apps/backend/src/services/paper-implementation-route-planning-runtime-service.ts';
import { PaperImplementationValidationCyclePlanningRuntimeService } from '../../apps/backend/src/services/paper-implementation-validation-cycle-planning-runtime-service.ts';
import { PaperImplementationFeasibilityPlanningRuntimeService } from '../../apps/backend/src/services/paper-implementation-feasibility-planning-runtime-service.ts';
import { PaperImplementationCrossBoardSynthesisRuntimeService } from '../../apps/backend/src/services/paper-implementation-cross-board-synthesis-runtime-service.ts';
import { PaperImplementationEvidenceBoardCurationRuntimeService } from '../../apps/backend/src/services/paper-implementation-evidence-board-curation-runtime-service.ts';
import { PaperImplementationMotiveDecompositionRuntimeService } from '../../apps/backend/src/services/paper-implementation-motive-decomposition-runtime-service.ts';
import { PaperImplementationMotiveEvolutionRuntimeService } from '../../apps/backend/src/services/paper-implementation-motive-evolution-runtime-service.ts';
import { PaperImplementationRuntimeDomainGateService } from '../../apps/backend/src/services/paper-implementation-runtime-domain-gate-service.ts';
import { writeReplayArtifacts } from './paper-implementation-v1-runnable-artifacts.mjs';
import {
  findResearchArgumentAuthorityFindings,
  summarizeWritingEntryPacket,
} from './paper-implementation-v1-runnable-evidence.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const backendRequire = createRequire(path.join(REPO_ROOT, 'apps/backend/package.json'));
const Fastify = backendRequire('fastify');
const RUNNER_ID = 'paper-implementation-v1-runnable-replay';
const RUNNER_VERSION = 't109-phase2-route-replay-v1';
const NOW = '2026-05-27T00:00:00.000Z';
const DEFAULT_RUN_ID_PREFIX = 'paper-implementation-v1-runnable';

const IDS = {
  bridge: 'paper_project_bridge_t109_001',
  project: null,
  motive: 'core_motive_t109_001',
  motiveVersion: 'core_motive_version_t109_001',
  motiveAssertion: 'motive_assertion_t109_001',
  board: 'motive_evidence_board_t109_001',
  binding: 'evidence_binding_t109_001',
  validation: 'validation_cycle_t109_001',
  experimentPlan: 'experiment_plan_light_t109_001',
  workOrder: 'research_work_order_t109_001',
  externalJob: 'external_training_job_t109_001',
  runEvidence: 'run_evidence_unit_external_training_job_t109_001',
  resultPacket: 'result_interpretation_packet_t109_001',
  claim: 'claim_candidate_t109_001',
  pendingClaim: 'claim_candidate_pending_trace_t109_001',
  dossier: 'implementation_dossier_t109_001',
  harness: 'ai_harness_t109_001',
  inputSnapshot: 'ai_input_snapshot_t109_001',
};

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const runId = args.runId ?? `${DEFAULT_RUN_ID_PREFIX}-${timestamp()}`;
const artifactDir = path.resolve(
  args.artifactDir ?? path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-v1-runnable-closure', runId),
);

const state = {
  runId,
  artifactDir,
  startedAt: new Date().toISOString(),
  completedAt: null,
  status: 'running',
  steps: [],
  blockedPaths: [],
  linkedLoop: {
    status: 'not_run',
    assertions: [],
    refs: {},
  },
  writingPacket: null,
  uiBoundary: null,
  residualRisks: [],
  authorityBoundaryFindings: [],
  authorityPayloadChecks: 0,
  refs: {},
  blockers: [],
};

async function main() {
  try {
    await fs.mkdir(artifactDir, { recursive: true });
    await runReplay(state);
    state.status = state.blockers.length > 0 ? 'failed' : 'passed';
  } catch (error) {
    state.status = 'failed';
    state.blockers.push(errorSummary(error));
  } finally {
    state.completedAt = new Date().toISOString();
    await writeReplayArtifacts({
      repoRoot: REPO_ROOT,
      runnerId: RUNNER_ID,
      runnerVersion: RUNNER_VERSION,
      state,
    });
  }

  const summary = {
    runner_id: RUNNER_ID,
    runner_version: RUNNER_VERSION,
    run_id: runId,
    status: state.status,
    artifact_dir: relativePath(artifactDir),
    blockers: state.blockers,
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(state.status === 'passed' ? 0 : 1);
}


function parseArgs(rawArgs) {
  const parsed = {
    artifactDir: null,
    help: false,
    runId: null,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    const next = rawArgs[index + 1];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--run-id' && next) {
      parsed.runId = next;
      index += 1;
    } else if (arg.startsWith('--run-id=')) {
      parsed.runId = arg.slice('--run-id='.length);
    } else if (arg === '--artifact-dir' && next) {
      parsed.artifactDir = next;
      index += 1;
    } else if (arg.startsWith('--artifact-dir=')) {
      parsed.artifactDir = arg.slice('--artifact-dir='.length);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (parsed.runId !== null && !/^[A-Za-z0-9._-]+$/.test(parsed.runId)) {
    throw new Error('--run-id may only contain letters, numbers, dot, underscore, and hyphen.');
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/paper-implementation-v1-runnable-replay.mjs [options]

Options:
  --run-id <id>         Stable run id for artifact directory naming.
  --artifact-dir <dir>  Override artifact output directory.
  -h, --help            Show this help.

Default artifact root:
  .ai/.tmp/paper-implementation-v1-runnable-closure/<run-id>
`);
}

async function runReplay(state) {
  const harness = makeReplayHarness();
  const { app, fakeExecution, downstreamFeedback } = harness;
  try {
    await registerPaperImplementationRoutes(app, harness.controller);

    const bootstrap = await inject(state, app, {
      stepId: '01-bootstrap',
      method: 'POST',
      url: '/paper-implementation/projects/bootstrap',
      payload: {
        paper_project_bridge_id: IDS.bridge,
        bridge_payload_hash: 'bridge_payload_hash_t109_001',
      },
      expectedStatus: 201,
      artifactRefs: ['HP-ROUTE-001'],
    });
    const projectId = bootstrap.implementation_project.implementation_project_id;
    IDS.project = projectId;
    state.refs.implementation_project_id = projectId;
    state.refs.intake_snapshot_id = bootstrap.intake_snapshot.intake_snapshot_id;

    await expectBlockedPath(state, 'BP0-01', async () => {
      const response = await inject(state, app, {
        stepId: 'bp0-01-hash-drift',
        method: 'POST',
        url: '/paper-implementation/projects/bootstrap',
        payload: {
          paper_project_bridge_id: IDS.bridge,
          bridge_payload_hash: 'changed_bridge_payload_hash_t109',
        },
        expectedStatus: 409,
        artifactRefs: ['BP0-HASH-DRIFT-001'],
      });
      return response.error?.code === 'VERSION_CONFLICT';
    });

    const motiveDraft = await inject(state, app, {
      stepId: '02-core-motive-draft',
      method: 'POST',
      url: projectUrl(projectId, '/core-motives/drafts'),
      payload: motiveDraftPayload(),
      expectedStatus: 201,
      artifactRefs: ['HP-ROUTE-001'],
    });
    state.refs.core_motive_version_id = motiveDraft.current_version_id;

    const motiveTrace = await createTrace(state, app, projectId, {
      stepId: '03-core-motive-trace',
      targetRef: ref('core_motive_version', IDS.motiveVersion, 'v1'),
      lineage: traceLineageWithLiterature(),
    });

    await inject(state, app, {
      stepId: '04-core-motive-admit',
      method: 'POST',
      url: projectUrl(projectId, `/core-motives/${IDS.motive}/versions/${IDS.motiveVersion}/admit`),
      payload: { trace_manifest_id: motiveTrace.trace_manifest_id },
      expectedStatus: 200,
      artifactRefs: ['HP-ROUTE-001'],
    });

    const boardTrace = await createTrace(state, app, projectId, {
      stepId: '05-board-trace',
      targetRef: ref('motive_evidence_board_version', IDS.board, 'v1'),
      lineage: traceLineageWithLiterature(),
    });
    const bindingTrace = await createTrace(state, app, projectId, {
      stepId: '06-binding-trace',
      targetRef: ref('evidence_binding', IDS.binding, 'v1'),
      lineage: traceLineageWithLiterature(),
    });

    await inject(state, app, {
      stepId: '07-motive-evidence-board',
      method: 'POST',
      url: projectUrl(projectId, '/motive-evidence-boards'),
      payload: boardPayload(boardTrace.trace_manifest_id, bindingTrace.trace_manifest_id),
      expectedStatus: 201,
      artifactRefs: ['HP-ROUTE-001'],
    });

    await expectBlockedPath(state, 'BP0-02', async () => {
      const brokenTrace = await createTrace(state, app, projectId, {
        stepId: 'bp0-02-broken-result-trace',
        targetRef: ref('result_interpretation_packet', 'result_interpretation_packet_broken_t109', 'v1'),
        lineage: emptyTraceLineage(),
        artifactRefs: ['BP0-MISSING-TRACE-001'],
      });
      const gate = await inject(state, app, {
        stepId: 'bp0-02-trace-gate',
        method: 'POST',
        url: projectUrl(projectId, '/trace-gates/evaluate'),
        payload: { trace_manifest_id: brokenTrace.trace_manifest_id },
        expectedStatus: 200,
        artifactRefs: ['BP0-MISSING-TRACE-001'],
      });
      return brokenTrace.trace_status !== 'complete'
        || gate.gate_status === 'blocked'
        || gate.gate_status === 'failed';
    });

    await expectBlockedPath(state, 'BP0-03', async () => {
      const response = await inject(state, app, {
        stepId: 'bp0-03-memo-as-citation',
        method: 'POST',
        url: projectUrl(projectId, '/natural-language-field-roles'),
        payload: {
          field_owner_ref: ref('result_interpretation_packet', 'result_interpretation_packet_broken_t109'),
          field_name: 'rationale',
          field_role: 'rationale_memo',
          can_feed_workflow: true,
          can_feed_hard_gate: true,
          can_be_cited: true,
        },
        expectedStatus: 409,
        artifactRefs: ['BP0-MEMO-AS-EVIDENCE-001'],
      });
      return response.error?.code === 'GATE_CONSTRAINT_FAILED';
    });

    await createValidationAndWorkOrder(state, app, projectId);
    const liveSubmit = await inject(state, app, {
      stepId: '13-live-submit',
      method: 'POST',
      url: projectUrl(projectId, `/research-work-orders/${IDS.workOrder}/live-experiment-runs/submit`),
      payload: { idempotency_key: 't109_work_order_attempt_001' },
      expectedStatus: 201,
      artifactRefs: ['ADJ-T104-FAKE-001', 'HP-ROUTE-001'],
    });
    state.refs.external_job_id = liveSubmit.external_job.external_job_id;
    state.refs.harness_run_id = liveSubmit.harness_run?.harness_run_id ?? null;

    await expectBlockedPath(state, 'BP0-04', async () => {
      const beforeSync = fakeExecution.syncJobIds.length;
      const response = await inject(state, app, {
        stepId: 'bp0-04-wrong-external-job',
        method: 'POST',
        url: projectUrl(
          projectId,
          `/research-work-orders/${IDS.workOrder}/live-experiment-runs/external_training_job_wrong_t109/sync`,
        ),
        payload: {},
        expectedStatus: 409,
        artifactRefs: ['BP0-ORPHAN-MONITOR-001'],
      });
      return response.error?.code === 'GATE_CONSTRAINT_FAILED'
        && fakeExecution.syncJobIds.length === beforeSync;
    });

    const liveSync = await inject(state, app, {
      stepId: '14-live-sync-non-final',
      method: 'POST',
      url: projectUrl(projectId, `/research-work-orders/${IDS.workOrder}/live-experiment-runs/${liveSubmit.external_job.external_job_id}/sync`),
      payload: {},
      expectedStatus: 200,
      artifactRefs: ['ADJ-T104-FAKE-001', 'LL-FAILED-RUN-001'],
    });
    if (liveSync.terminal_evidence_recorded !== false || liveSync.run_evidence_unit !== null) {
      throw new Error('T-104 sync created trusted run evidence unexpectedly.');
    }

    await expectBlockedPath(state, 'BP0-05', async () => {
      const response = await inject(state, app, {
        stepId: 'bp0-05-final-monitor-without-run-evidence-trace',
        method: 'POST',
        url: projectUrl(projectId, '/run-monitor-intakes'),
        payload: {
          work_order_id: IDS.workOrder,
          run_evidence_unit_id: 'run_evidence_unit_missing_trace_t109',
          external_job_ref: ref('local_script_job', 'local_job_t109_001'),
          external_job_hash: 'external_job_hash_t109_001',
          monitor_event_kind: 'failed',
          run_status: 'failed',
          failure_summary: 'Missing target-specific trace must block final evidence.',
        },
        expectedStatus: 409,
        artifactRefs: ['BP0-RUN-EVIDENCE-TRACE-001'],
      });
      return response.error?.code === 'GATE_CONSTRAINT_FAILED';
    });

    const liveCollect = await inject(state, app, {
      stepId: '15-live-collect-final-evidence',
      method: 'POST',
      url: projectUrl(projectId, `/research-work-orders/${IDS.workOrder}/live-experiment-runs/${liveSubmit.external_job.external_job_id}/collect`),
      payload: {
        run_evidence_unit_id: IDS.runEvidence,
        failure_summary: 'The deterministic fake external run failed under scoped conditions.',
      },
      expectedStatus: 200,
      artifactRefs: ['ADJ-T104-FAKE-001', 'LL-FAILED-RUN-001', 'HP-ROUTE-001'],
    });
    if (!liveCollect.terminal_evidence_recorded || liveCollect.run_evidence_unit?.trace_manifest_id !== liveCollect.trace_manifest?.trace_manifest_id) {
      throw new Error('T-104 collect did not create trusted target-specific run evidence.');
    }
    state.refs.run_evidence_unit_id = liveCollect.run_evidence_unit.run_evidence_unit_id;
    state.refs.run_evidence_trace_manifest_id = liveCollect.trace_manifest.trace_manifest_id;

    const resultPacket = await createResultClaimDossierAndWriting(state, app, projectId);
    await runLinkedLoopAndFeedback(state, app, projectId, downstreamFeedback, resultPacket);
    await runProviderAndAiBoundary(state, app, projectId);
    await runUiBoundaryProof(state);
    assertNoBlockerFailures(state);
  } finally {
    await app.close();
  }
}

function makeReplayHarness() {
  const app = Fastify({ logger: false });
  const repository = new InMemoryPaperImplementationRepository();
  const motiveRepository = new InMemoryPaperImplementationMotiveRepository();
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const workOrderRepository = new InMemoryPaperImplementationWorkOrderRepository();
  const resultClaimRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const runtimeRepository = new InMemoryPaperImplementationRuntimeRepository();
  const downstreamFeedback = new RecordingDownstreamFeedbackService();
  const idFactory = makeIdFactory();
  const intakeBootstrap = new PaperImplementationIntakeBootstrapService({
    repository,
    paperProjectBridgeService: new StubBridgeService(),
    downstreamFeedbackService: downstreamFeedback,
    idFactory,
    now: () => NOW,
  });
  const traceKernel = new PaperImplementationTraceKernelService({
    projectRepository: repository,
    traceRepository,
    idFactory,
    now: () => NOW,
  });
  const motiveEvidenceBoard = new PaperImplementationMotiveEvidenceBoardService({
    projectRepository: repository,
    motiveRepository,
    traceRepository,
    idFactory,
    now: () => NOW,
  });
  const validationCyclePlanning = new PaperImplementationValidationCyclePlanningService({
    projectRepository: repository,
    motiveRepository,
    traceRepository,
    validationRepository,
    feedbackRecorder: intakeBootstrap,
    idFactory,
    now: () => NOW,
  });
  const workOrderExperimentBridge = new PaperImplementationWorkOrderExperimentBridgeService({
    projectRepository: repository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    idFactory,
    now: () => NOW,
  });
  const resultClaimDossier = new PaperImplementationResultClaimDossierService({
    projectRepository: repository,
    resultClaimRepository,
    traceRepository,
    validationRepository,
    workOrderRepository,
    feedbackRecorder: intakeBootstrap,
    idFactory,
    now: () => NOW,
  });
  const aiWorkflowHarness = new PaperImplementationAiWorkflowHarnessService({
    projectRepository: repository,
    traceRepository,
    harnessRepository,
    idFactory,
    now: () => NOW,
  });
  const fakeExecution = new FakeExperimentExecution();
  const liveExperimentAdapter = new PaperImplementationLiveExperimentAdapterService({
    experimentExecution: fakeExecution,
    experimentRecords: new FakeExperimentRecords(),
    workOrderService: workOrderExperimentBridge,
    traceKernel,
    workOrderRepository,
  });
  const providerVarianceEvaluation = new PaperImplementationProviderVarianceEvaluationService({
    aiWorkflowHarness,
    idFactory,
    now: () => NOW,
  });
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: runtimeRepository,
    idFactory,
    now: () => NOW,
  });
  const traceIntegrityDebateRuntime = new PaperImplementationTraceIntegrityDebateRuntimeService({
    runtimeAdmission,
    agentOrchestrator: {
      invokeStructuredOutput: async () => {
        throw new Error('trace integrity debate runtime is not used by the V1 runnable replay.');
      },
    },
    idFactory,
    now: () => NOW,
  });
  // Runtime AI nodes (P1 review / planning / motive / synthesis / domain gate) are not exercised by
  // the V1 route-level replay, so they share one throwing stub orchestrator: the controller needs the
  // dependencies to construct, but the replay never reaches an endpoint that invokes them.
  const unusedRuntimeAgentOrchestrator = {
    invokeStructuredOutput: async () => {
      throw new Error('runtime agent orchestration is not exercised by the V1 runnable replay.');
    },
  };
  const p1RuntimeReview = new PaperImplementationP1RuntimeReviewService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const resultAnalysisRuntime = new PaperImplementationResultAnalysisRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const experimentPlanningRuntime = new PaperImplementationExperimentPlanningRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const routePlanningRuntime = new PaperImplementationRoutePlanningRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const validationCyclePlanningRuntime = new PaperImplementationValidationCyclePlanningRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const feasibilityPlanningRuntime = new PaperImplementationFeasibilityPlanningRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const crossBoardSynthesisRuntime = new PaperImplementationCrossBoardSynthesisRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const evidenceBoardCurationRuntime = new PaperImplementationEvidenceBoardCurationRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const motiveDecompositionRuntime = new PaperImplementationMotiveDecompositionRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const motiveEvolutionRuntime = new PaperImplementationMotiveEvolutionRuntimeService({
    runtimeAdmission,
    agentOrchestrator: unusedRuntimeAgentOrchestrator,
  });
  const runtimeDomainGate = new PaperImplementationRuntimeDomainGateService({
    runtimeAdmission,
    resultClaimDossier,
  });
  const controller = new PaperImplementationController({
    intakeBootstrap,
    traceKernel,
    motiveEvidenceBoard,
    validationCyclePlanning,
    workOrderExperimentBridge,
    resultClaimDossier,
    aiWorkflowHarness,
    runtimeAdmission,
    traceIntegrityDebateRuntime,
    p1RuntimeReview,
    resultAnalysisRuntime,
    experimentPlanningRuntime,
    routePlanningRuntime,
    validationCyclePlanningRuntime,
    feasibilityPlanningRuntime,
    crossBoardSynthesisRuntime,
    evidenceBoardCurationRuntime,
    motiveDecompositionRuntime,
    motiveEvolutionRuntime,
    runtimeDomainGate,
    liveExperimentAdapter,
    providerVarianceEvaluation,
  });
  return { app, controller, fakeExecution, downstreamFeedback };
}

async function createValidationAndWorkOrder(state, app, projectId) {
  const validationDraft = await inject(state, app, {
    stepId: '08-validation-cycle-draft',
    method: 'POST',
    url: projectUrl(projectId, '/validation-cycles/drafts'),
    payload: validationDraftPayload(),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  state.refs.validation_cycle_id = validationDraft.validation_cycle_id;

  const validationTrace = await createTrace(state, app, projectId, {
    stepId: '09-validation-cycle-trace',
    targetRef: ref('validation_cycle', IDS.validation, 'v1'),
    lineage: {
      ...emptyTraceLineage(),
      decision: {
        ...emptyTraceLineage().decision,
        human_decision_refs: [ref('human_decision', 'human_decision_t109_validation_admit')],
      },
    },
  });
  state.refs.validation_trace_manifest_id = validationTrace.trace_manifest_id;
  await inject(state, app, {
    stepId: '10-validation-cycle-admit',
    method: 'POST',
    url: projectUrl(projectId, `/validation-cycles/${IDS.validation}/admit`),
    payload: { trace_manifest_id: validationTrace.trace_manifest_id },
    expectedStatus: 200,
    artifactRefs: ['HP-ROUTE-001'],
  });

  const experimentPlanTrace = await createTrace(state, app, projectId, {
    stepId: '11-experiment-plan-trace',
    targetRef: ref('experiment_plan_light', IDS.experimentPlan, 'v1'),
    lineage: {
      ...emptyTraceLineage(),
      experiment: {
        ...emptyTraceLineage().experiment,
        metric_refs: [ref('metric', 'claim_conflation_rate_t109')],
      },
      artifact: {
        ...emptyTraceLineage().artifact,
        dataset_refs: [ref('dataset_version', 'dataset_version_t109_001')],
        baseline_refs: [ref('baseline_version', 'baseline_version_t109_001')],
        code_version_refs: [ref('code_version', 'code_version_t109_001')],
        config_refs: [ref('config', 'config_t109_001')],
      },
      decision: {
        ...emptyTraceLineage().decision,
        validation_cycle_refs: [ref('validation_cycle', IDS.validation)],
      },
    },
  });
  await inject(state, app, {
    stepId: '12-experiment-plan-light',
    method: 'POST',
    url: projectUrl(projectId, '/experiment-plan-lights'),
    payload: experimentPlanPayload(experimentPlanTrace.trace_manifest_id),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });

  const workOrderTrace = await createTrace(state, app, projectId, {
    stepId: '13-work-order-trace',
    targetRef: ref('research_work_order', IDS.workOrder, 'v1'),
    lineage: {
      ...emptyTraceLineage(),
      experiment: {
        ...emptyTraceLineage().experiment,
        experiment_plan_refs: [ref('experiment_plan_light', IDS.experimentPlan)],
      },
      decision: {
        ...emptyTraceLineage().decision,
        validation_cycle_refs: [ref('validation_cycle', IDS.validation)],
      },
    },
  });
  await inject(state, app, {
    stepId: '14-work-order-draft',
    method: 'POST',
    url: projectUrl(projectId, '/research-work-orders/drafts'),
    payload: workOrderDraftPayload(workOrderTrace.trace_manifest_id),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  await inject(state, app, {
    stepId: '15-work-order-admit',
    method: 'POST',
    url: projectUrl(projectId, `/research-work-orders/${IDS.workOrder}/admit`),
    payload: { admission_gate_result_id: 'work_order_gate_result_t109_001' },
    expectedStatus: 200,
    artifactRefs: ['HP-ROUTE-001'],
  });
}

async function createResultClaimDossierAndWriting(state, app, projectId) {
  const resultTrace = await createTrace(state, app, projectId, {
    stepId: '16-result-packet-trace',
    targetRef: ref('result_interpretation_packet', IDS.resultPacket, 'v1'),
    lineage: {
      ...emptyTraceLineage(),
      experiment: {
        ...emptyTraceLineage().experiment,
        run_evidence_refs: [ref('run_evidence_unit', state.refs.run_evidence_unit_id)],
        metric_refs: [ref('metric', 'claim_conflation_rate_t109')],
      },
    },
  });
  const resultPacket = await inject(state, app, {
    stepId: '17-result-interpretation-packet',
    method: 'POST',
    url: projectUrl(projectId, '/result-interpretation-packets'),
    payload: resultPacketPayload(resultTrace.trace_manifest_id, state.refs.run_evidence_unit_id),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001', 'LL-FAILED-RUN-001'],
  });
  state.refs.result_interpretation_packet_id = resultPacket.result_interpretation_packet_id;

  const claimTrace = await createTrace(state, app, projectId, {
    stepId: '18-claim-trace-manifest',
    targetRef: ref('claim_candidate', IDS.claim, 'v1'),
    lineage: claimLineage(state.refs.run_evidence_unit_id),
  });
  const claimTracePacket = await inject(state, app, {
    stepId: '19-claim-trace-packet',
    method: 'POST',
    url: projectUrl(projectId, '/claim-trace-packets'),
    payload: claimTracePacketPayload(claimTrace.trace_manifest_id, state.refs.run_evidence_unit_id),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  state.refs.claim_trace_packet_id = claimTracePacket.claim_trace_packet_id;

  await expectBlockedPath(state, 'BP0-06', async () => {
    const pendingClaimTrace = await createTrace(state, app, projectId, {
      stepId: 'bp0-06-pending-claim-trace',
      targetRef: ref('claim_candidate', IDS.pendingClaim, 'v1'),
      lineage: claimLineage(state.refs.run_evidence_unit_id),
      artifactRefs: ['BP0-CLAIM-PENDING-TRACE-001'],
    });
    const pending = await inject(state, app, {
      stepId: 'bp0-06-claim-without-trace',
      method: 'POST',
      url: projectUrl(projectId, '/claim-candidates'),
      payload: {
        ...claimCandidatePayload(pendingClaimTrace.trace_manifest_id, null, IDS.pendingClaim, state.refs.run_evidence_unit_id),
        claim_statement: 'The run suggests only a trace-pending bounded failure case.',
      },
      expectedStatus: 201,
      artifactRefs: ['BP0-CLAIM-PENDING-TRACE-001'],
    });
    const blockedDossier = await inject(state, app, {
      stepId: 'bp0-06-ready-dossier-rejects-pending-claim',
      method: 'POST',
      url: projectUrl(projectId, '/implementation-dossiers'),
      payload: dossierPayload('implementation_dossier_pending_claim_t109', claimTrace.trace_manifest_id, IDS.pendingClaim, []),
      expectedStatus: 409,
      artifactRefs: ['BP0-CLAIM-PENDING-TRACE-001'],
    });
    return pending.claim_status === 'support_pending_trace'
      && blockedDossier.error?.code === 'GATE_CONSTRAINT_FAILED';
  });

  await expectBlockedPath(state, 'BP0-07', async () => {
    const response = await inject(state, app, {
      stepId: 'bp0-07-overclaim',
      method: 'POST',
      url: projectUrl(projectId, '/claim-candidates'),
      payload: {
        ...claimCandidatePayload(claimTrace.trace_manifest_id, claimTracePacket.claim_trace_packet_id, 'claim_candidate_overclaim_t109', state.refs.run_evidence_unit_id),
        claim_statement: 'The method delivers universal reliability and broad model superiority.',
      },
      expectedStatus: 409,
      artifactRefs: ['BP0-OVERCLAIM-001'],
    });
    return response.error?.code === 'GATE_CONSTRAINT_FAILED';
  });

  const claimCandidate = await inject(state, app, {
    stepId: '20-claim-candidate',
    method: 'POST',
    url: projectUrl(projectId, '/claim-candidates'),
    payload: claimCandidatePayload(
      claimTrace.trace_manifest_id,
      claimTracePacket.claim_trace_packet_id,
      IDS.claim,
      state.refs.run_evidence_unit_id,
    ),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  if (claimCandidate.claim_status !== 'supported') {
    throw new Error(`Expected supported claim, got ${claimCandidate.claim_status}`);
  }
  state.refs.claim_candidate_id = claimCandidate.claim_candidate_id;

  const dossierTrace = await createTrace(state, app, projectId, {
    stepId: '21-dossier-trace',
    targetRef: ref('implementation_dossier', IDS.dossier, 'v1'),
    lineage: claimLineage(state.refs.run_evidence_unit_id),
  });
  const dossier = await inject(state, app, {
    stepId: '22-implementation-dossier',
    method: 'POST',
    url: projectUrl(projectId, '/implementation-dossiers'),
    payload: dossierPayload(IDS.dossier, dossierTrace.trace_manifest_id, IDS.claim, [claimTracePacket.claim_trace_packet_id]),
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  state.refs.implementation_dossier_id = dossier.dossier_id;

  const writingPacket = await inject(state, app, {
    stepId: '23-writing-entry-packet',
    method: 'POST',
    url: projectUrl(projectId, `/implementation-dossiers/${IDS.dossier}/writing-entry-packets`),
    payload: { projection_policy_version_id: 'writing_projection_policy_t109_v1' },
    expectedStatus: 201,
    artifactRefs: ['HP-ROUTE-001'],
  });
  state.refs.writing_entry_packet_id = writingPacket.writing_entry_packet_id;
  state.writingPacket = summarizeWritingEntryPacket(writingPacket);
  if (
    !state.writingPacket.trace_manifest_id
    || state.writingPacket.admitted_claim_ref_count < 1
    || state.writingPacket.claim_trace_packet_ref_count < 1
  ) {
    throw new Error('WritingEntryPacket summary did not preserve trace-ready supported claim evidence.');
  }
  return resultPacket;
}

async function runLinkedLoopAndFeedback(state, app, projectId, downstreamFeedback, resultPacket) {
  const completed = await inject(state, app, {
    stepId: '24-validation-complete-low-info',
    method: 'POST',
    url: projectUrl(projectId, `/validation-cycles/${IDS.validation}/complete`),
    payload: {
      cycle_assessment: {
        outcome: 'inconclusive',
        information_gain_realized: 'low',
        residual_uncertainties: ['The failed run requires a narrower follow-up route.'],
        recommended_next_action: 'Create a narrower follow-up validation cycle or dispatch upstream feedback.',
        rationale: 'The deterministic fake external run did not reduce the uncertainty enough.',
      },
    },
    expectedStatus: 200,
    artifactRefs: ['LL-FAILED-RUN-001', 'LL-FOLLOWUP-PLAN-001'],
  });
  const reviewItems = await inject(state, app, {
    stepId: '25-validation-review-items',
    method: 'GET',
    url: projectUrl(projectId, '/validation-planning-review-items'),
    expectedStatus: 200,
    artifactRefs: ['LL-FAILED-RUN-001'],
  });
  const feedbackCandidate = await inject(state, app, {
    stepId: '26-validation-feedback-candidate',
    method: 'POST',
    url: projectUrl(projectId, '/validation-upstream-feedback-candidates'),
    payload: {
      validation_cycle_id: IDS.validation,
      source_object_refs: [
        ref('validation_cycle', IDS.validation),
        ref('result_interpretation_packet', resultPacket.result_interpretation_packet_id),
      ],
      feedback_type: 'infeasible_route',
      severity: 'blocking',
      summary: 'The deterministic linked-loop run requires route narrowing before the next push.',
    },
    expectedStatus: 201,
    artifactRefs: ['LL-FAILED-RUN-001'],
  });
  const dispatched = await inject(state, app, {
    stepId: '27-validation-feedback-dispatch',
    method: 'POST',
    url: projectUrl(projectId, `/validation-upstream-feedback-candidates/${feedbackCandidate.candidate_id}/dispatch`),
    payload: {},
    expectedStatus: 200,
    artifactRefs: ['LL-FAILED-RUN-001'],
  });
  state.linkedLoop = {
    status: 'passed',
    assertions: [
      'trusted run evidence was created through T-104 collect',
      'failed/inconclusive evidence was retained in result packet',
      'validation completion recorded a low-information assessment',
      'feedback dispatch used paper_implementation source kind',
      'next-step progression is explicit through feedback/review, not implicit authority overwrite',
    ],
    refs: {
      validation_cycle_id: completed.validation_cycle_id,
      review_item_count: reviewItems.items?.length ?? 0,
      feedback_candidate_id: feedbackCandidate.candidate_id,
      downstream_source_kind: downstreamFeedback.calls[0]?.downstream_source_kind ?? null,
      recheck_request_id:
        dispatched.feedback_dispatch?.feedback_event?.downstream_recheck_request?.downstream_recheck_request_id ?? null,
    },
  };
  if (downstreamFeedback.calls[0]?.downstream_source_kind !== 'paper_implementation') {
    throw new Error('Linked-loop feedback did not dispatch as paper_implementation.');
  }
}

async function runProviderAndAiBoundary(state, app, projectId) {
  const targetRef = ref('validation_cycle', IDS.validation, 'v1');
  await inject(state, app, {
    stepId: '28-implementation-harness',
    method: 'POST',
    url: projectUrl(projectId, '/implementation-harnesses'),
    payload: aiHarnessPayload(),
    expectedStatus: 201,
    artifactRefs: ['BP0-AI-DIRECT-MUTATION-001', 'BP0-PROVIDER-LIVE-CONFUSION-001'],
  });
  await inject(state, app, {
    stepId: '29-implementation-input-snapshot',
    method: 'POST',
    url: projectUrl(projectId, '/implementation-input-snapshots'),
    payload: aiInputSnapshotPayload(targetRef, state.refs.validation_trace_manifest_id),
    expectedStatus: 201,
    artifactRefs: ['BP0-AI-DIRECT-MUTATION-001', 'BP0-PROVIDER-LIVE-CONFUSION-001'],
  });
  await expectBlockedPath(state, 'BP0-08', async () => {
    const response = await inject(state, app, {
      stepId: 'bp0-08-provider-variance-direct-mutation',
      method: 'POST',
      url: projectUrl(projectId, '/provider-variance-evaluations/run'),
      payload: providerVariancePayload(targetRef, state.refs.validation_trace_manifest_id, 'direct_authority_mutation'),
      expectedStatus: 201,
      artifactRefs: ['BP0-AI-DIRECT-MUTATION-001'],
    });
    return response.case_results.some((item) => item.authority_violation === true
      && item.run_status === 'blocked');
  });
  await expectBlockedPath(state, 'BP0-09', async () => {
    const response = await inject(state, app, {
      stepId: 'bp0-09-provider-live-preflight',
      method: 'POST',
      url: projectUrl(projectId, '/provider-variance-evaluations/run'),
      payload: providerVariancePayload(targetRef, state.refs.validation_trace_manifest_id, 'happy_path'),
      expectedStatus: 201,
      artifactRefs: ['BP0-PROVIDER-LIVE-CONFUSION-001'],
    });
    return response.preflight_results.some((item) => item.profile_id === 'provider_live_t109'
      && item.status === 'blocked')
      && response.case_results.some((item) => item.profile_id === 'provider_live_t109'
        && item.run_status === 'skipped');
  });
}

async function runUiBoundaryProof(state) {
  const uiFiles = [
    'apps/desktop/src/renderer/modules/PaperModule.tsx',
    'apps/desktop/src/renderer/modules/paper-implementation/PaperImplementationWorkbench.tsx',
    'apps/desktop/src/renderer/modules/paper-implementation/api.ts',
    'apps/desktop/src/renderer/modules/paper-implementation/types.ts',
    'apps/desktop/src/renderer/modules/paper-implementation/usePaperImplementationWorkbenchController.ts',
    'apps/desktop/src/renderer/modules/paper-implementation/utils.ts',
  ];
  const findings = [];
  const endpointHits = [];
  for (const relativeFile of uiFiles) {
    const absoluteFile = path.join(REPO_ROOT, relativeFile);
    let content = '';
    try {
      content = await fs.readFile(absoluteFile, 'utf8');
    } catch {
      findings.push({ severity: 'error', file: relativeFile, message: 'Expected UI file is missing.' });
      continue;
    }
    if (/research-argument|researchArgument/.test(content)) {
      findings.push({ severity: 'error', file: relativeFile, message: 'research-argument reference found in PaperImplementation UI path.' });
    }
    if (/client-only readiness|mock-only readiness|local readiness/i.test(content)) {
      findings.push({ severity: 'warning', file: relativeFile, message: 'Potential client-local readiness wording found.' });
    }
    const matches = content.match(/\/paper-implementation\/[^'"`)\s]+/g) ?? [];
    endpointHits.push(...matches.map((endpoint) => ({ file: relativeFile, endpoint })));
  }
  const retiredStyleLayer = await pathExists(path.join(REPO_ROOT, 'apps/desktop/src/renderer/styles'));
  if (retiredStyleLayer) {
    findings.push({ severity: 'error', file: 'apps/desktop/src/renderer/styles', message: 'Retired desktop style layer exists.' });
  }
  findings.push(...state.authorityBoundaryFindings);
  findings.push(...findResearchArgumentAuthorityFindings({
    refs: state.refs,
    linked_loop: state.linkedLoop,
    writing_packet: state.writingPacket,
  }, 'runtime_state'));
  await expectBlockedPath(state, 'BP0-10', async () => !findings.some((item) => item.severity === 'error'));
  state.uiBoundary = {
    status: findings.some((item) => item.severity === 'error') ? 'failed' : 'passed',
    checked_files: uiFiles,
    endpoint_hits: endpointHits,
    findings,
    authority_boundary: {
      replay_request_payloads_checked: state.authorityPayloadChecks,
      runtime_state_checked: true,
      research_argument_authority_findings: state.authorityBoundaryFindings.length,
    },
    browser_smoke: 'not_run_by_design',
  };
  if (state.uiBoundary.status !== 'passed') {
    throw new Error('UI boundary proof failed.');
  }
}

async function createTrace(state, app, projectId, input) {
  return inject(state, app, {
    stepId: input.stepId,
    method: 'POST',
    url: projectUrl(projectId, '/trace-manifests'),
    payload: {
      target_ref: input.targetRef,
      lineage: input.lineage,
      integrity: input.integrity ?? {},
    },
    expectedStatus: input.expectedStatus ?? 201,
    artifactRefs: input.artifactRefs ?? ['HP-ROUTE-001'],
  });
}

async function inject(state, app, input) {
  state.authorityPayloadChecks += 1;
  state.authorityBoundaryFindings.push(
    ...findResearchArgumentAuthorityFindings(input.payload, `request:${input.stepId}`),
  );
  const response = await app.inject({
    method: input.method,
    url: input.url,
    payload: input.payload,
  });
  const body = parseJson(response.body);
  const expected = Array.isArray(input.expectedStatus) ? input.expectedStatus : [input.expectedStatus];
  state.steps.push({
    step_id: input.stepId,
    method: input.method,
    url: redactProjectUrl(input.url),
    expected_status: expected,
    status_code: response.statusCode,
    ok: expected.includes(response.statusCode),
    artifact_refs: input.artifactRefs ?? [],
    response_summary: summarizeResponse(body),
  });
  if (!expected.includes(response.statusCode)) {
    throw new Error(`Step ${input.stepId} expected ${expected.join('/')} but got ${response.statusCode}: ${response.body}`);
  }
  return body;
}

async function expectBlockedPath(state, blockedPathId, action) {
  try {
    const passed = await action();
    state.blockedPaths.push({
      id: blockedPathId,
      status: passed ? 'passed' : 'failed',
    });
    if (!passed) {
      state.blockers.push(`${blockedPathId} did not prove the expected blocked-path behavior.`);
    }
  } catch (error) {
    state.blockedPaths.push({
      id: blockedPathId,
      status: 'failed',
      error: errorSummary(error),
    });
    state.blockers.push(`${blockedPathId}: ${errorSummary(error)}`);
  }
}

function assertNoBlockerFailures(state) {
  const failed = state.blockedPaths.filter((item) => item.status !== 'passed');
  if (failed.length > 0) {
    throw new Error(`Blocked path checks failed: ${failed.map((item) => item.id).join(', ')}`);
  }
}

function projectUrl(projectId, suffix) {
  return `/paper-implementation/projects/${encodeURIComponent(projectId)}${suffix}`;
}

function ref(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_t109_001',
    version_id: versionId,
  };
}

function experimentRef(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map();
  return (prefix) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}

function emptyTraceLineage() {
  return {
    literature: {
      literature_evidence_refs: [],
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
      human_decision_refs: [],
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

function traceLineageWithLiterature() {
  return {
    ...emptyTraceLineage(),
    literature: {
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_t109_001')],
      source_locator_refs: [ref('source_locator', 'source_locator_t109_001')],
      citation_candidate_refs: [],
    },
  };
}

function claimLineage(runEvidenceUnitId) {
  return {
    ...emptyTraceLineage(),
    literature: {
      ...emptyTraceLineage().literature,
      literature_evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_t109_001')],
    },
    experiment: {
      ...emptyTraceLineage().experiment,
      run_evidence_refs: [ref('run_evidence_unit', runEvidenceUnitId)],
      result_packet_refs: [ref('result_interpretation_packet', IDS.resultPacket)],
    },
  };
}

function motiveDraftPayload() {
  return {
    motive_id: IDS.motive,
    core_motive_version_id: IDS.motiveVersion,
    motive_contract: {
      short_name: 'Evidence synthesis conflation',
      motivation_claim: 'Evidence synthesis can conflate adjacent claims.',
      problem_pressure: 'False gap judgments affect paper planning.',
      current_solution_insufficiency: 'Retrieval-only systems do not address synthesis conflation.',
      unmet_or_failure_mechanism: 'Adjacent non-equivalent claims are compressed into one statement.',
      target_setting: 'CS paper evidence synthesis.',
      expected_contribution_path: 'Make claim conflation measurable and reducible.',
      why_this_is_not_trivial: 'The failure appears after retrieval.',
      why_existing_baselines_do_not_already_solve_it: 'Baselines optimize relevance, not claim equivalence.',
      what_makes_this_researchable_now: 'Evidence locator infrastructure exists.',
    },
    scope_contract: {
      included_scope: ['cross-paper synthesis'],
      excluded_scope: ['general web QA'],
      non_goals: ['broad model reliability'],
    },
    falsification_contract: {
      invalidation_conditions: ['Controlled synthesis preserves distinct claims.'],
      weakening_conditions: ['Only low-severity conflation remains.'],
      minimum_evidence_to_continue: ['At least one literature or probe signal.'],
      decisive_negative_conditions: ['Retrieval alone fully explains the issue.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'The method reduces scoped claim conflation.',
      minimum_defensible_contribution_claim: 'The analysis identifies a measurable failure mode.',
      forbidden_overclaims: ['Do not claim broad model reliability.'],
      claim_types_allowed: ['analysis_claim'],
    },
    source_refs: [ref('topic_package', 'topic_package_t109_001', 'v1')],
    assertions: [{
      assertion_id: IDS.motiveAssertion,
      assertion_type: 'failure_mechanism',
      assertion_text: 'Claim conflation is a synthesis-level failure mechanism.',
      importance: {
        role: 'core',
        must_hold_for_motive_to_continue: true,
      },
      validation_requirements: {
        minimum_support_level: 'weak',
        required_evidence_types: ['literature'],
        required_counter_evidence_check: true,
      },
      falsification: {
        what_would_contradict_this: ['Equivalent claims are always preserved.'],
        what_would_weaken_this: ['Conflation is limited to missing abstracts.'],
      },
      expected_initial_status: 'untested',
    }],
  };
}

function boardPayload(boardTraceManifestId, bindingTraceManifestId) {
  return {
    board_version_id: IDS.board,
    motive_id: IDS.motive,
    core_motive_version_id: IDS.motiveVersion,
    trace_manifest_id: boardTraceManifestId,
    board_summary: {
      current_support_summary: 'Literature provides an initial signal.',
      current_challenge_summary: 'No direct counter-evidence yet.',
      unresolved_conflicts: [],
      board_gap_summary: 'Needs validation probe.',
      next_evidence_needed: ['Run a controlled synthesis probe.'],
    },
    bindings: [{
      binding_id: IDS.binding,
      assertion_id: IDS.motiveAssertion,
      evidence_ref: ref('literature_evidence_unit', 'literature_evidence_unit_t109_001'),
      role: 'support',
      scope: { dataset_scope: 'CS papers' },
      strength: {
        directness: 'moderate',
        reliability: 'medium',
        reproducibility: 'unknown',
        freshness: 'fresh',
      },
      support_state: 'weak',
      challenge_status: 'none',
      interpretation: {
        normalized_statement: 'Prior work reports related synthesis conflation.',
        why_relevant_to_assertion: 'It supports the failure mechanism.',
        limitations: ['Different benchmark setting.'],
      },
      trace_manifest_id: bindingTraceManifestId,
    }],
  };
}

function validationDraftPayload() {
  return {
    validation_cycle_id: IDS.validation,
    target: {
      target_type: 'core_motive_version',
      target_id: IDS.motiveVersion,
      target_version_id: '1',
    },
    trigger: {
      trigger_type: 'board_gap',
      trigger_refs: [ref('motive_evidence_board_version', IDS.board)],
    },
    cycle_type: 'route_feasibility',
    validation_frame: {
      validation_question: 'Can a low-cost probe answer the failure mechanism assertion?',
      assumptions_under_test: ['The scoped route can isolate synthesis conflation.'],
      assertions_under_test: [ref('motive_assertion', IDS.motiveAssertion)],
      decision_if_pass: 'Create a work-order-ready route plan.',
      decision_if_fail: 'Emit upstream feedback or narrow the motive.',
      decision_if_inconclusive: 'Narrow the validation question.',
      expected_information_gain: 'medium',
      why_this_cycle_now: 'The admitted board has a route gap.',
    },
    context: {
      included_refs: {
        motive_version_refs: [ref('core_motive_version', IDS.motiveVersion, '1')],
        board_version_refs: [ref('motive_evidence_board_version', IDS.board)],
        evidence_refs: [ref('literature_evidence_unit', 'literature_evidence_unit_t109_001')],
        route_refs: [],
        work_order_refs: [],
        result_packet_refs: [],
        experiment_plan_light_refs: [],
      },
      excluded_context_notes: [],
    },
    criteria: {
      pass_conditions: ['The route can isolate synthesis conflation.'],
      fail_conditions: ['The route cannot answer the assertion.'],
      inconclusive_conditions: ['The route remains ambiguous.'],
      stop_conditions: ['Stop after one failed feasibility check.'],
      minimum_artifacts_required: ['Trace-ready validation memo.'],
    },
    budget: {
      budget_id: 'validation_budget_t109_001',
      max_runtime: 'PT4H',
      max_compute: 'local_cpu',
      max_human_review_count: 1,
      retry_budget: 0,
    },
  };
}

function experimentPlanPayload(traceManifestId) {
  return {
    experiment_plan_light_id: IDS.experimentPlan,
    validation_cycle_id: IDS.validation,
    run_mode: 'confirmatory',
    plan_summary: 'Run a controlled synthesis conflation check.',
    estimated_cost_class: 'medium',
    baseline_gap_status: 'resolved',
    primary_metric_refs: [ref('metric', 'claim_conflation_rate_t109')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_t109_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_t109_001')],
    code_version_refs: [ref('code_version', 'code_version_t109_001')],
    config_refs: [ref('config', 'config_t109_001')],
    budget_id: 'validation_budget_t109_001',
    stop_condition_refs: [ref('stop_rule', 'stop_rule_t109_001')],
    trace_manifest_id: traceManifestId,
  };
}

function workOrderDraftPayload(traceManifestId) {
  return {
    work_order_id: IDS.workOrder,
    validation_cycle_id: IDS.validation,
    experiment_plan_light_id: IDS.experimentPlan,
    run_type: 'confirmatory',
    run_policy: {
      run_policy_id: 'run_policy_t109_001',
      retry_budget: 0,
      stop_condition_refs: [ref('stop_rule', 'stop_rule_t109_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('experiment_run_recipe', 'run_recipe_t109_001', 'v1'),
      run_recipe_hash: 'run_recipe_hash_t109_001',
      version_lock_hash: 'version_lock_hash_t109_001',
      config_snapshot_hash: 'config_snapshot_hash_t109_001',
      materialization_result_ref: ref('training_task_materialization_result', 'materialization_result_t109_001'),
      materialization_result_hash: 'materialization_result_hash_t109_001',
      training_task_spec_ref: ref('training_task_spec', 'training_task_spec_t109_001'),
      training_task_spec_hash: 'training_task_spec_hash_t109_001',
      result_validation_policy_ref: ref('result_validation_policy', 'result_validation_policy_t109_001'),
    },
    trace_manifest_id: traceManifestId,
  };
}

function resultPacketPayload(traceManifestId, runEvidenceUnitId) {
  return {
    result_interpretation_packet_id: IDS.resultPacket,
    validation_cycle_id: IDS.validation,
    experiment_plan_light_id: IDS.experimentPlan,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', runEvidenceUnitId)],
      validation_report_refs: [],
      metric_refs: [ref('metric', 'claim_conflation_rate_t109')],
      failed_run_refs: [ref('run_evidence_unit', runEvidenceUnitId)],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The deterministic fake external run failed, so the claim must stay bounded.',
      supports_assertion_refs: [],
      challenges_assertion_refs: [ref('motive_assertion', IDS.motiveAssertion)],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: ['Failed run retained as boundary evidence.'],
    },
    claim_implications: {
      allowed_claim_ceiling: 'tentative',
      forbidden_overclaims: ['broad model reliability'],
      recommended_claim_refs: [],
      required_followup_refs: [ref('validation_cycle', `${IDS.validation}_followup_candidate`)],
    },
    trace_manifest_id: traceManifestId,
  };
}

function claimTracePacketPayload(traceManifestId, runEvidenceUnitId) {
  return {
    claim_ref: ref('claim_candidate', IDS.claim),
    claim_statement: 'The run exposes a bounded failure case.',
    trace_manifest_id: traceManifestId,
    lineage: claimLineage(runEvidenceUnitId),
    challenge: {
      challenging_result_refs: [ref('run_evidence_unit', runEvidenceUnitId)],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      dataset_scope: 'T-109 route dataset version.',
      task_scope: 'Controlled synthesis conflation check.',
      baseline_scope: 'T-109 route baseline.',
      method_scope: 'Configured route method.',
      evaluation_scope: 'claim_conflation_rate metric.',
    },
    boundary: {
      forbidden_overclaims: ['broad model reliability'],
      claim_strength: 'tentative',
      human_confirmation_required: false,
    },
  };
}

function claimCandidatePayload(traceManifestId, claimTracePacketId, claimCandidateId, runEvidenceUnitId) {
  return {
    claim_candidate_id: claimCandidateId,
    claim_type: 'negative_result_claim',
    claim_statement: 'The run exposes a bounded failure case.',
    claim_strength: 'tentative',
    result_interpretation_packet_ids: [IDS.resultPacket],
    support_refs: [ref('run_evidence_unit', runEvidenceUnitId)],
    challenge_refs: [],
    scope: {
      population_scope: 'Controlled synthesis conflation check.',
      method_scope: 'Configured route method.',
      dataset_scope: 'T-109 route dataset version.',
      metric_scope: 'claim_conflation_rate metric.',
      negative_scope_notes: ['Run failed before trusted positive evidence.'],
      excluded_scope_notes: ['No broad model reliability claim.'],
    },
    boundary: {
      rationale: 'The failed run supports only a bounded negative result.',
      forbidden_overclaims: ['broad model reliability'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [ref('validation_cycle', `${IDS.validation}_followup_candidate`)],
    },
    trace_manifest_id: traceManifestId,
    claim_trace_packet_id: claimTracePacketId,
  };
}

function dossierPayload(dossierId, traceManifestId, claimCandidateId, claimTracePacketIds) {
  return {
    dossier_id: dossierId,
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: [IDS.resultPacket],
    claim_candidate_ids: [claimCandidateId],
    claim_trace_packet_ids: claimTracePacketIds,
    experiment_section: {
      failed_run_refs: [ref('run_evidence_unit', IDS.runEvidence)],
      inconclusive_run_refs: [],
      negative_result_refs: [ref('run_evidence_unit', IDS.runEvidence)],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: ['Failed run limits the claim ceiling.'],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', claimCandidateId)],
      rejected_claim_refs: [],
      forbidden_overclaims: ['broad model reliability'],
      claim_ceiling: 'tentative',
    },
    readiness: {
      readiness_gate_result_id: `${dossierId}_readiness_gate`,
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: ['Ready as bounded negative result dossier.'],
    },
    trace_manifest_id: traceManifestId,
    projection_policy_version_id: 'writing_projection_policy_t109_v1',
  };
}

function aiHarnessPayload() {
  return {
    harness_id: IDS.harness,
    policy_pack: {
      context_policy_version_id: 'context_policy_t109_v1',
      trace_policy_version_id: 'trace_policy_t109_v1',
      evidence_policy_version_id: 'evidence_policy_t109_v1',
      experiment_policy_version_id: 'experiment_policy_t109_v1',
      retention_policy_version_id: 'retention_policy_t109_v1',
      evaluation_policy_version_id: 'evaluation_policy_t109_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_t109_001',
      artifact_store_ref: ref('artifact_store', 'artifact_store_t109_001'),
      evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_t109_001'),
      work_order_broker_ref: ref('work_order_broker', 'work_order_broker_t109_001'),
      run_monitor_ref: ref('run_monitor', 'run_monitor_t109_001'),
    },
    invariants: {
      require_input_snapshot: true,
      require_trace_manifest: true,
      require_artifact_refs: true,
      forbid_untraced_claims: true,
      forbid_memo_as_evidence: true,
      retain_failed_runs: true,
      separate_exploratory_and_confirmatory: true,
    },
    created_by: 'system',
  };
}

function aiInputSnapshotPayload(targetRef, traceManifestId) {
  return {
    input_snapshot_id: IDS.inputSnapshot,
    target_ref: targetRef,
    workflow_type: 'validation_cycle_planning',
    context_policy_version_id: 'context_policy_t109_v1',
    included_context: {
      motive_version_refs: [ref('core_motive_version', IDS.motiveVersion)],
      board_version_refs: [ref('motive_evidence_board_version', IDS.board)],
      assertion_refs: [ref('motive_assertion', IDS.motiveAssertion)],
      evidence_binding_refs: [ref('evidence_binding', IDS.binding)],
      route_refs: [],
      probe_refs: [],
      experiment_plan_refs: [ref('experiment_plan_light', IDS.experimentPlan)],
      work_order_refs: [ref('research_work_order', IDS.workOrder)],
      run_evidence_refs: [ref('run_evidence_unit', IDS.runEvidence)],
      result_packet_refs: [ref('result_interpretation_packet', IDS.resultPacket)],
      accepted_risk_refs: [],
      human_decision_refs: [],
      trace_manifest_refs: [ref('trace_manifest', traceManifestId)],
    },
    excluded_context: {
      excluded_refs: [],
      exclusion_reasons: [],
    },
    freshness_constraints: {
      exclude_stale_evidence: true,
      exclude_invalidated_refs: true,
    },
    evidence_rules: {
      memo_as_evidence_forbidden: true,
      citation_requires_source_locator: true,
    },
    source_hashes: ['sha256:t109-ai-context'],
    created_by: 'system',
  };
}

function providerVariancePayload(targetRef, traceManifestId, caseKind) {
  return {
    evaluation_run_id: `provider_variance_eval_t109_${caseKind}`,
    harness_id: IDS.harness,
    input_snapshot_id: IDS.inputSnapshot,
    workflow_type: 'validation_cycle_planning',
    workflow_version: 'validation_cycle_planning.t109.v1',
    prompt_template_version_id: 'prompt_template_t109_v1',
    output_schema_version_id: 'validation_cycle_planning_output_t109_v1',
    repeat_count: 1,
    profiles: [
      {
        profile_id: 'provider_fake_t109',
        profile_mode: 'deterministic_fake',
        model_profile_id: 'mock.paper_implementation.t109',
        execution_mode: 'mocked_llm',
        run_mode: 'mock',
      },
      {
        profile_id: 'provider_live_t109',
        profile_mode: 'live_provider_preflight',
        model_profile_id: 'live.paper_implementation.t109',
        execution_mode: 'provider_llm',
        run_mode: 'product',
        live_provider_enabled: true,
      },
    ],
    cases: [{
      case_id: `provider_variance_case_t109_${caseKind}`,
      case_kind: caseKind,
      target_ref: targetRef,
      source_refs: [ref('run_evidence_unit', IDS.runEvidence)],
      trace_manifest_refs: [ref('trace_manifest', traceManifestId)],
      expected_handoff_ready: caseKind === 'happy_path',
    }],
    created_by: 'system',
  };
}

function makeBridgeHandoff() {
  const sourceRefs = [
    ref('topic_package', 'topic_package_t109_001', 'v1'),
    ref('evidence_unit', 'evidence_unit_t109_001'),
  ];
  const workingCopy = {
    editable_title: 'T-109 working paper title',
    problem_statement: 'Problem statement.',
    contribution_summary: 'Contribution summary.',
    evaluation_plan: 'Evaluation plan.',
    initial_planning_notes: [],
    claim_ceiling: 'Bounded claim ceiling.',
    prohibited_claims: [],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [],
    source_lineage_summary: {
      topic_package_id: 'topic_package_t109_001',
    },
  };
  const bridge = {
    paper_project_bridge_id: IDS.bridge,
    bridge_status: 'active',
    workspace_id: 'workspace_t109_001',
    title_card_id: 'title_card_t109_001',
    source_promotion_decision_id: 'promotion_decision_t109_001',
    source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_t109_001'),
    human_promotion_decision_ref: ref('human_promotion_decision', 'human_promotion_decision_t109_001'),
    human_confirmed_decision_ref: ref('human_confirmed_decision', 'human_confirmed_decision_t109_001'),
    promotion_commitment_profile_id: 'promotion_commitment_profile_t109_001',
    promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_t109_001'),
    promotion_gate_check_ref: ref('promotion_gate_check', 'promotion_gate_check_t109_001'),
    promotion_input_snapshot_id: 'promotion_input_snapshot_t109_001',
    promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_t109_001'),
    promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t109_001',
    topic_package_id: 'topic_package_t109_001',
    package_version: 'v1',
    decision: 'promote_to_paper_project',
    conditions: [],
    accepted_risk_refs: [],
    allowed_refinements: [],
    early_check_obligations: [],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: {
      bundle_hash: 'bundle_hash_t109_001',
      package_snapshot_hash: 'package_snapshot_hash_t109_001',
      package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_t109_001',
      promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t109_001',
    },
    working_copy_payload: workingCopy,
    working_copy_payload_hash: 'working_copy_payload_hash_t109_001',
    bridge_payload_hash: 'bridge_payload_hash_t109_001',
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: {},
    artifact_refs: [],
    policy_version_id: 'policy_t109_v1',
    created_by: 'system',
    created_at: NOW,
  };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
    bridge_status: 'active',
    source_promotion_decision_id: bridge.source_promotion_decision_id,
    source_promotion_decision_ref: bridge.source_promotion_decision_ref,
    promotion_commitment_profile_ref: bridge.promotion_commitment_profile_ref,
    promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
    promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    topic_package_id: bridge.topic_package_id,
    package_version: bridge.package_version,
    decision: bridge.decision,
    working_copy_payload: bridge.working_copy_payload,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    bridge_payload_hash: bridge.bridge_payload_hash,
    conditions: bridge.conditions,
    accepted_risk_refs: bridge.accepted_risk_refs,
    allowed_refinements: bridge.allowed_refinements,
    early_check_obligations: bridge.early_check_obligations,
    stop_conditions: bridge.stop_conditions,
    reopen_conditions: bridge.reopen_conditions,
    source_refs: bridge.source_refs,
    snapshot_hashes: bridge.snapshot_hashes,
    paper_project_intake_ref: bridge.paper_project_intake_ref,
    target_paper_project_ref: bridge.target_paper_project_ref,
    bridge,
    source_promotion_handoff: bridge.source_promotion_handoff,
  };
}

class StubBridgeService {
  handoff = makeBridgeHandoff();

  async getPaperProjectBridgeHandoff(paperProjectBridgeId) {
    if (paperProjectBridgeId !== this.handoff.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return structuredClone(this.handoff);
  }
}

class RecordingDownstreamFeedbackService {
  calls = [];

  async recordDownstreamTopicFeedback(input) {
    this.calls.push(structuredClone(input));
    const feedbackId = `downstream_topic_feedback_t109_${String(this.calls.length).padStart(3, '0')}`;
    return {
      downstream_topic_feedback: {
        downstream_topic_feedback_id: feedbackId,
        feedback_fingerprint: `fingerprint_t109_${this.calls.length}`,
        workspace_id: input.workspace_id ?? null,
        title_card_id: 'title_card_t109_001',
        paper_project_bridge_id: input.paper_project_bridge_id,
        paper_project_bridge_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
        source_promotion_decision_ref: ref('promotion_decision', 'promotion_decision_t109_001'),
        promotion_commitment_profile_ref: ref('promotion_commitment_profile', 'promotion_commitment_profile_t109_001'),
        promotion_input_snapshot_id: 'promotion_input_snapshot_t109_001',
        promotion_input_snapshot_ref: ref('promotion_input_snapshot', 'promotion_input_snapshot_t109_001'),
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_t109_001',
        topic_package_id: 'topic_package_t109_001',
        package_version: 'v1',
        downstream_source_kind: input.downstream_source_kind,
        downstream_source_ref: input.downstream_source_ref,
        source_feedback_refs: input.source_feedback_refs ?? [],
        observed_blocker_refs: input.observed_blocker_refs ?? [],
        feedback_signal: input.feedback_signal,
        severity: input.severity,
        summary: input.summary,
        required_action: input.required_action ?? null,
        classification: {
          loopback_target: 'paper_project_bridge',
          loopback_cause: input.feedback_signal,
          severity: input.severity,
          requires_recheck: true,
          affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
          affected_stage: 'paper_project_bridge',
          source_refs: [input.downstream_source_ref],
          rationale: 'T-109 deterministic linked-loop classification.',
          required_actions: input.required_action ? [input.required_action] : [],
        },
        recheck_request: {
          downstream_recheck_request_id: `downstream_recheck_request_t109_${this.calls.length}`,
          feedback_ref: ref('downstream_topic_feedback', feedbackId),
          loopback_target: 'paper_project_bridge',
          loopback_cause: input.feedback_signal,
          affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
          required_actions: input.required_action ? [input.required_action] : [],
          reason_codes: [input.feedback_signal],
          source_refs: [input.downstream_source_ref],
          created_at: NOW,
        },
        impact_summary: {
          impact_level: 'recheck_required',
          severity: input.severity,
          loopback_target: 'paper_project_bridge',
          loopback_cause: input.feedback_signal,
          requires_recheck: true,
          affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
          summary: 'T-109 route replay impact.',
        },
        recheck_event_ref: null,
        recheck_impact_ref: null,
        decision_work_queue_item_ref: null,
        artifact_refs: input.artifact_refs ?? [],
        payload: input.feedback_payload ?? {},
        policy_version_id: input.policy_version_id ?? null,
        created_by: input.created_by ?? 'system',
        created_at: NOW,
      },
      classification: {
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        severity: input.severity,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
        affected_stage: 'paper_project_bridge',
        source_refs: [input.downstream_source_ref],
        rationale: 'T-109 deterministic linked-loop classification.',
        required_actions: input.required_action ? [input.required_action] : [],
      },
      recheck_request: {
        downstream_recheck_request_id: `downstream_recheck_request_t109_${this.calls.length}`,
        feedback_ref: ref('downstream_topic_feedback', feedbackId),
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
        required_actions: input.required_action ? [input.required_action] : [],
        reason_codes: [input.feedback_signal],
        source_refs: [input.downstream_source_ref],
        created_at: NOW,
      },
      impact_summary: {
        impact_level: 'recheck_required',
        severity: input.severity,
        loopback_target: 'paper_project_bridge',
        loopback_cause: input.feedback_signal,
        requires_recheck: true,
        affected_ref: ref('paper_project_bridge', input.paper_project_bridge_id, 'bridge_payload_hash_t109_001'),
        summary: 'T-109 route replay impact.',
      },
    };
  }
}

class FakeExperimentExecution {
  submitInputs = [];
  syncJobIds = [];
  collectJobIds = [];
  cancelJobIds = [];
  job = {
    external_job_id: IDS.externalJob,
    training_task_spec_ref: experimentRef('training_task_spec', 'training_task_spec_t109_001'),
    training_task_spec_hash: 'training_task_spec_hash_t109_001',
    materialization_result_ref: experimentRef('training_task_materialization_result', 'materialization_result_t109_001'),
    materialization_result_hash: 'materialization_result_hash_t109_001',
    adapter_kind: 'local_script',
    adapter_version: 'local_script_t109_v1',
    platform_ref: {
      platform_id: 'training_platform_local_t109_001',
      platform_kind: 'local_script',
      adapter_kind: 'local_script',
      adapter_version: 'local_script_t109_v1',
      capability_refs: [],
    },
    idempotency_key: 't109_work_order_attempt_001',
    external_job_ref: experimentRef('local_script_job', 'local_job_t109_001'),
    external_job_hash: 'external_job_hash_t109_001',
    job_status: 'submitted',
    submitted_at: NOW,
    last_synced_at: null,
    completed_at: null,
    stage_event_refs: [],
    partial_result_refs: [],
    result_refs: [],
    adapter_metadata_refs: [],
    adapter_metadata_hashes: [],
    traceability_refs: [],
    created_at: NOW,
    updated_at: NOW,
  };
  wrongJob = {
    ...this.job,
    external_job_id: 'external_training_job_wrong_t109',
    idempotency_key: 'wrong_attempt_t109',
    external_job_ref: experimentRef('local_script_job', 'local_job_wrong_t109'),
    external_job_hash: 'external_job_hash_wrong_t109',
  };

  async submitJob(input) {
    this.submitInputs.push(structuredClone(input));
    this.job = {
      ...this.job,
      idempotency_key: input.idempotency_key,
      training_task_spec_ref: input.training_task_spec_ref,
      training_task_spec_hash: input.training_task_spec_hash,
      materialization_result_ref: input.materialization_result_ref,
      materialization_result_hash: input.materialization_result_hash,
    };
    return { external_job: structuredClone(this.job) };
  }

  async getJob(externalJobId) {
    if (externalJobId === this.job.external_job_id) {
      return { external_job: structuredClone(this.job) };
    }
    if (externalJobId === this.wrongJob.external_job_id) {
      return { external_job: structuredClone(this.wrongJob) };
    }
    throw new AppError(404, 'NOT_FOUND', `External job ${externalJobId} not found.`);
  }

  async getJobByIdempotencyKey(idempotencyKey) {
    if (this.job.idempotency_key !== idempotencyKey) {
      throw new AppError(404, 'NOT_FOUND', `External job ${idempotencyKey} not found.`);
    }
    return { external_job: structuredClone(this.job) };
  }

  async syncJob(externalJobId) {
    this.syncJobIds.push(externalJobId);
    this.job = {
      ...this.job,
      job_status: 'running',
      last_synced_at: NOW,
      updated_at: NOW,
    };
    return { external_job: structuredClone(this.job) };
  }

  async collectJob(externalJobId) {
    this.collectJobIds.push(externalJobId);
    this.job = {
      ...this.job,
      job_status: 'failed',
      completed_at: NOW,
      partial_result_refs: [experimentRef('training_task_partial_result_ref', 'partial_result_t109_001')],
      result_refs: [],
      updated_at: NOW,
    };
    return { external_job: structuredClone(this.job) };
  }

  async cancelJob(externalJobId, input) {
    this.cancelJobIds.push(externalJobId);
    this.job = {
      ...this.job,
      job_status: 'cancelled',
      completed_at: NOW,
      adapter_metadata_hashes: [input.idempotency_key],
      updated_at: NOW,
    };
    return { external_job: structuredClone(this.job) };
  }
}

class FakeExperimentRecords {
  async getRecord(recordKind, recordId) {
    return {
      id: `${recordKind}:${recordId}`,
      record_kind: recordKind,
      record_id: recordId,
      record_hash: `${recordId}_hash_t109`,
      status: null,
      family: null,
      parent_record_kind: null,
      parent_record_id: null,
      owner_ref_type: null,
      owner_ref_id: null,
      payload: {},
      source_refs: [],
      traceability_refs: [],
      created_at: NOW,
      updated_at: NOW,
    };
  }
}

function parseJson(body) {
  if (!body) {
    return null;
  }
  try {
    return JSON.parse(body);
  } catch {
    return { raw_body: body.slice(0, 200) };
  }
}

function summarizeResponse(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  return {
    ids: collectIds(body),
    statuses: collectStatuses(body),
    error_code: body.error?.code ?? null,
  };
}

function collectIds(value, result = {}, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) {
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectIds(item, result, depth + 1);
    }
    return result;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key.endsWith('_id') && typeof nested === 'string') {
      result[key] ??= [];
      if (!result[key].includes(nested)) {
        result[key].push(nested);
      }
    } else if (key === 'ref_id' && typeof nested === 'string') {
      result.ref_id ??= [];
      if (!result.ref_id.includes(nested)) {
        result.ref_id.push(nested);
      }
    } else {
      collectIds(nested, result, depth + 1);
    }
  }
  return result;
}

function collectStatuses(value, result = {}, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) {
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStatuses(item, result, depth + 1);
    }
    return result;
  }
  for (const [key, nested] of Object.entries(value)) {
    if ((key.endsWith('_status') || key === 'status' || key === 'outcome') && typeof nested === 'string') {
      result[key] ??= [];
      if (!result[key].includes(nested)) {
        result[key].push(nested);
      }
    } else {
      collectStatuses(nested, result, depth + 1);
    }
  }
  return result;
}

function redactProjectUrl(url) {
  return url.replace(/implementation_project_[A-Za-z0-9_-]+/g, ':implementation_project_id');
}

function errorSummary(error) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function relativePath(absolutePath) {
  return path.relative(REPO_ROOT, absolutePath) || '.';
}

async function pathExists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

await main();
