import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';
import type {
  CreateImplementationHarnessRequest,
  CreateImplementationInputSnapshotRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-ai-workflow-harness-contracts';
import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ProviderVarianceCaseInput,
  RunProviderVarianceEvaluationRequest,
  RunProviderVarianceEvaluationResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-provider-variance-contracts';
import type {
  CitationCandidate,
  ClaimTracePacket,
  NaturalLanguageFieldRoleRecord,
  TraceManifest,
  TraceRepairQueueItem,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { PaperImplementationController } from '../controllers/paper-implementation-controller.js';
import { InMemoryPaperImplementationAiWorkflowHarnessRepository } from '../repositories/in-memory-paper-implementation-ai-workflow-harness-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationTraceRepository } from '../repositories/paper-implementation-trace.repository.js';
import { registerPaperImplementationRoutes } from '../routes/paper-implementation-routes.js';
import { PaperImplementationAiWorkflowHarnessService } from './paper-implementation-ai-workflow-harness-service.js';
import { PaperImplementationProviderVarianceEvaluationService } from './paper-implementation-provider-variance-evaluation-service.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationTraceIntegrityDebateRuntimeService } from './paper-implementation-trace-integrity-debate-runtime-service.js';

const NOW = '2026-05-24T08:00:00.000Z';
const PROJECT_ID = 'impl_project_provider_variance_001';
const TRACE_MANIFEST_ID = 'trace_manifest_provider_variance_001';
const HARNESS_ID = 'ai_harness_provider_variance_001';
const INPUT_SNAPSHOT_ID = 'ai_input_snapshot_provider_variance_001';
const TARGET_REF = ref('claim_candidate', 'claim_candidate_provider_variance_001');
const SOURCE_REF = ref('run_evidence_unit', 'run_evidence_unit_provider_variance_001');
const TRACE_REF = ref('trace_manifest', TRACE_MANIFEST_ID);

class StaticProjectRepository implements PaperImplementationRepository {
  constructor(private readonly project: ImplementationProject) {}

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return {
      ...persistence,
      created: true,
    };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return this.project.implementation_project_id === implementationProjectId
      ? structuredClone(this.project)
      : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return null;
  }

  async findIntakeSnapshotById(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async findIntakeSnapshotByProjectId(): Promise<ImplementationIntakeSnapshot | null> {
    return null;
  }

  async createFeedbackEvent(event: ImplementationFeedbackEvent): Promise<ImplementationFeedbackEvent> {
    return structuredClone(event);
  }
}

class StaticTraceRepository implements PaperImplementationTraceRepository {
  private readonly manifests = new Map<string, TraceManifest>();

  addTraceManifest(manifest: TraceManifest): void {
    this.manifests.set(manifest.trace_manifest_id, structuredClone(manifest));
  }

  async createTraceManifest(): Promise<TraceManifest> {
    throw new Error('not implemented');
  }

  async findTraceManifestById(
    implementationProjectId: string,
    traceManifestId: string,
  ): Promise<TraceManifest | null> {
    const manifest = this.manifests.get(traceManifestId);
    if (!manifest || manifest.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(manifest);
  }

  async listTraceManifests(): Promise<TraceManifest[]> {
    return [...this.manifests.values()].map((manifest) => structuredClone(manifest));
  }

  async createCitationCandidate(candidate: CitationCandidate): Promise<CitationCandidate> {
    return structuredClone(candidate);
  }

  async listCitationCandidates(): Promise<CitationCandidate[]> {
    return [];
  }

  async createClaimTracePacket(packet: ClaimTracePacket): Promise<ClaimTracePacket> {
    return structuredClone(packet);
  }

  async listClaimTracePackets(): Promise<ClaimTracePacket[]> {
    return [];
  }

  async createNaturalLanguageFieldRole(
    record: NaturalLanguageFieldRoleRecord,
  ): Promise<NaturalLanguageFieldRoleRecord> {
    return structuredClone(record);
  }

  async findNaturalLanguageFieldRoleByIdentity(): Promise<NaturalLanguageFieldRoleRecord | null> {
    return null;
  }

  async listTraceRepairQueueItems(): Promise<TraceRepairQueueItem[]> {
    return [];
  }

  async listTraceRepairQueueItemsByManifest(): Promise<TraceRepairQueueItem[]> {
    return [];
  }

  async resolveTraceRepairQueueItem(): Promise<TraceRepairQueueItem> {
    throw new Error('not implemented');
  }
}

function buildService() {
  const project = makeProject();
  const traceRepository = new StaticTraceRepository();
  traceRepository.addTraceManifest(makeTraceManifest(project.implementation_project_id));
  const harnessRepository = new InMemoryPaperImplementationAiWorkflowHarnessRepository();
  const aiWorkflowHarness = new PaperImplementationAiWorkflowHarnessService({
    projectRepository: new StaticProjectRepository(project),
    traceRepository,
    harnessRepository,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  const service = new PaperImplementationProviderVarianceEvaluationService({
    aiWorkflowHarness,
    idFactory: makeIdFactory(),
    now: () => NOW,
  });
  return { aiWorkflowHarness, harnessRepository, project, service };
}

test('provider variance evaluation deterministically replays fake provider cases and materializes harness signals', async () => {
  const { aiWorkflowHarness, project, service } = buildService();
  await seedHarnessContext(aiWorkflowHarness, project.implementation_project_id);

  const response = await service.runProviderVarianceEvaluation(
    project.implementation_project_id,
    makeEvaluationRequest({
      cases: [
        makeCase('case_happy', 'happy_path'),
        makeCase('case_overclaim', 'overclaim_drift', { expected_handoff_ready: false }),
      ],
      repeat_count: 2,
    }),
  );

  assert.equal(response.case_results.length, 4);
  assert.equal(response.preflight_results[0]?.status, 'passed');
  assert.equal(response.case_results.filter((result) => result.case_kind === 'happy_path' && result.handoff_ready).length, 2);
  assert.equal(response.case_results.filter((result) => result.case_kind === 'overclaim_drift' && result.claim_safety_violation).length, 2);
  assert.ok(response.case_results
    .filter((result) => result.case_kind === 'overclaim_drift')
    .every((result) => result.quality_signal_refs.length > 0 && result.queue_item_refs.length > 0));

  assertMetric(response, 'claim_safety_violation_rate', { numerator: 2, denominator: 4, value: 0.5 });
  assertMetric(response, 'workflow_stability_rate', { numerator: 2, denominator: 2, value: 1 });
  const claimMetric = response.metrics.find((metric) => metric.metric === 'claim_safety_violation_rate');
  assert.match(claimMetric?.consumer ?? '', /ClaimBoundaryGate/);
  assert.equal(response.recommendations[0]?.recommendation, 'demote_to_human_review');
});

test('provider variance evaluation reports live provider profiles without executing live calls', async () => {
  const { aiWorkflowHarness, project, service } = buildService();
  await seedHarnessContext(aiWorkflowHarness, project.implementation_project_id);

  const skipped = await service.runProviderVarianceEvaluation(
    project.implementation_project_id,
    makeEvaluationRequest({
      profiles: [{
        profile_id: 'live_profile_disabled',
        profile_mode: 'live_provider_preflight',
        model_profile_id: 'provider.live.disabled',
        execution_mode: 'provider_llm',
        run_mode: 'dry_run',
        live_provider_enabled: false,
      }],
      cases: [makeCase('case_happy', 'happy_path')],
    }),
  );
  assert.equal(skipped.preflight_results[0]?.status, 'skipped');
  assert.equal(skipped.case_results[0]?.run_status, 'skipped');
  assert.equal((await aiWorkflowHarness.listAgentWorkflowHarnessRuns(project.implementation_project_id)).length, 0);

  const blocked = await service.runProviderVarianceEvaluation(
    project.implementation_project_id,
    makeEvaluationRequest({
      profiles: [{
        profile_id: 'live_profile_enabled',
        profile_mode: 'live_provider_preflight',
        model_profile_id: 'provider.live.enabled',
        execution_mode: 'provider_llm',
        run_mode: 'dry_run',
        live_provider_enabled: true,
      }],
      cases: [makeCase('case_happy', 'happy_path')],
    }),
  );
  assert.equal(blocked.preflight_results[0]?.status, 'blocked');
  assert.match(blocked.preflight_results[0]?.reason ?? '', /not implemented/);
  assert.equal(blocked.recommendations[0]?.recommendation, 'pause');
});

test('provider variance evaluation covers schema trace authority and handoff guardrails', async () => {
  const { aiWorkflowHarness, project, service } = buildService();
  await seedHarnessContext(aiWorkflowHarness, project.implementation_project_id);

  const response = await service.runProviderVarianceEvaluation(
    project.implementation_project_id,
    makeEvaluationRequest({
      cases: [
        makeCase('case_invalid_contract', 'invalid_contract', { expected_handoff_ready: false }),
        makeCase('case_missing_trace', 'missing_trace', { expected_handoff_ready: false }),
        makeCase('case_direct_authority', 'direct_authority_mutation', { expected_handoff_ready: false }),
        makeCase('case_handoff_gap', 'handoff_gap', { expected_handoff_ready: false }),
      ],
    }),
  );

  const invalidContract = requireCase(response, 'case_invalid_contract');
  assert.equal(invalidContract.contract_valid, false);
  assert.ok(invalidContract.blocked_reasons.includes('proposal_artifact_required'));

  const missingTrace = requireCase(response, 'case_missing_trace');
  assert.equal(missingTrace.traceability_violation, true);
  assert.ok(missingTrace.blocked_reasons.includes('proposal_trace_manifest_required'));

  const directAuthority = requireCase(response, 'case_direct_authority');
  assert.equal(directAuthority.authority_violation, true);
  assert.ok(directAuthority.quality_signal_refs.length > 0);
  assert.ok(directAuthority.queue_item_refs.length > 0);

  const handoffGap = requireCase(response, 'case_handoff_gap');
  assert.equal(handoffGap.handoff_ready, false);
  assert.ok(handoffGap.blocked_reasons.includes('provider_variance_handoff_gap'));

  assertMetric(response, 'authority_violation_rate', { numerator: 1, denominator: 4, value: 0.25 });
  assertMetric(response, 'traceability_violation_rate', { numerator: 1, denominator: 4, value: 0.25 });
  assert.equal(response.recommendations[0]?.recommendation, 'demote_to_human_review');
});

test('provider variance evaluation exposes evaluation-only refs without runtime admission or Domain Gate authority', async () => {
  const { aiWorkflowHarness, project, service } = buildService();
  await seedHarnessContext(aiWorkflowHarness, project.implementation_project_id);

  const response = await service.runProviderVarianceEvaluation(
    project.implementation_project_id,
    makeEvaluationRequest({
      cases: [makeCase('case_happy', 'happy_path')],
    }),
  );

  assert.equal(response.preflight_results[0]?.status, 'passed');
  assert.equal(response.case_results.length, 1);
  assert.deepEqual(
    refTypesFromEvaluationResponse(response),
    [
      'agent_workflow_harness_run',
      'implementation_proposal_artifact',
    ],
  );
  assertNoRuntimeAuthorityRefs(response);
  assert.equal(response.recommendations[0]?.recommendation, 'enable');
  assert.match(
    response.recommendations[0]?.reasons.join('\n') ?? '',
    /does not satisfy product runtime\/provider canary or Domain Gate admission/,
  );
});

test('provider variance evaluation route validates payloads and returns aggregate report', async () => {
  const { aiWorkflowHarness, project, service } = buildService();
  await seedHarnessContext(aiWorkflowHarness, project.implementation_project_id);
  const app = Fastify();
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository: new InMemoryPaperImplementationRuntimeRepository(),
  });
  const controller = new PaperImplementationController({
    intakeBootstrap: {} as never,
    traceKernel: {} as never,
    motiveEvidenceBoard: {} as never,
    validationCyclePlanning: {} as never,
    workOrderExperimentBridge: {} as never,
    resultClaimDossier: {} as never,
    aiWorkflowHarness,
    runtimeAdmission,
    traceIntegrityDebateRuntime: new PaperImplementationTraceIntegrityDebateRuntimeService({
      runtimeAdmission,
      agentOrchestrator: {
        invokeStructuredOutput: async () => {
          throw new Error('trace integrity debate runtime is not used by this route test');
        },
      },
    }),
    p1RuntimeReview: {} as never,
    resultAnalysisRuntime: {} as never,
    experimentPlanningRuntime: {} as never,
    routePlanningRuntime: {} as never,
    validationCyclePlanningRuntime: {} as never,
    feasibilityPlanningRuntime: {} as never,
    crossBoardSynthesisRuntime: {} as never,
    evidenceBoardCurationRuntime: {} as never,
    motiveDecompositionRuntime: {} as never,
    motiveEvolutionRuntime: {} as never,
    runtimeDomainGate: {} as never,
    providerVarianceEvaluation: service,
  });
  registerPaperImplementationRoutes(app, controller);
  await app.ready();

  const invalid = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${project.implementation_project_id}/provider-variance-evaluations/run`,
    payload: {},
  });
  assert.equal(invalid.statusCode, 400);

  const valid = await app.inject({
    method: 'POST',
    url: `/paper-implementation/projects/${project.implementation_project_id}/provider-variance-evaluations/run`,
    payload: makeEvaluationRequest({
      cases: [makeCase('case_happy', 'happy_path')],
    }),
  });
  assert.equal(valid.statusCode, 201, valid.body);
  const body = valid.json<RunProviderVarianceEvaluationResponse>();
  assert.equal(body.implementation_project_id, project.implementation_project_id);
  assert.ok(body.metrics.some((metric) => metric.metric === 'provider_operability_rate'));

  await app.close();
});

async function seedHarnessContext(
  aiWorkflowHarness: PaperImplementationAiWorkflowHarnessService,
  implementationProjectId: string,
): Promise<void> {
  await aiWorkflowHarness.createImplementationHarness(
    implementationProjectId,
    makeHarnessRequest(),
  );
  await aiWorkflowHarness.createImplementationInputSnapshot(
    implementationProjectId,
    makeInputSnapshotRequest(),
  );
}

function makeEvaluationRequest(
  overrides: Partial<RunProviderVarianceEvaluationRequest> = {},
): RunProviderVarianceEvaluationRequest {
  return {
    evaluation_run_id: 'provider_variance_eval_001',
    harness_id: HARNESS_ID,
    input_snapshot_id: INPUT_SNAPSHOT_ID,
    workflow_type: 'claim_boundary_review',
    workflow_version: 'claim_boundary_review.v1',
    prompt_template_version_id: 'prompt_template_provider_variance_v1',
    output_schema_version_id: 'provider_variance_output_v1',
    repeat_count: 1,
    profiles: [{
      profile_id: 'fake_profile_001',
      profile_mode: 'deterministic_fake',
      model_profile_id: 'mock.paper-implementation.provider-variance.v1',
      execution_mode: 'mocked_llm',
      run_mode: 'mock',
    }],
    cases: [makeCase('case_happy', 'happy_path')],
    created_by: 'system',
    ...overrides,
  };
}

function makeCase(
  caseId: string,
  caseKind: ProviderVarianceCaseInput['case_kind'],
  overrides: Partial<ProviderVarianceCaseInput> = {},
): ProviderVarianceCaseInput {
  return {
    case_id: caseId,
    case_kind: caseKind,
    target_ref: TARGET_REF,
    source_refs: [SOURCE_REF],
    trace_manifest_refs: [TRACE_REF],
    artifact_ref: ref('artifact', `${caseId}_artifact`),
    expected_handoff_ready: caseKind === 'happy_path',
    ...overrides,
  };
}

function makeHarnessRequest(): CreateImplementationHarnessRequest {
  return {
    harness_id: HARNESS_ID,
    policy_pack: {
      context_policy_version_id: 'context_policy_provider_variance_v1',
      trace_policy_version_id: 'trace_policy_provider_variance_v1',
      evidence_policy_version_id: 'evidence_policy_provider_variance_v1',
      experiment_policy_version_id: 'experiment_policy_provider_variance_v1',
      retention_policy_version_id: 'retention_policy_provider_variance_v1',
      evaluation_policy_version_id: 'evaluation_policy_provider_variance_v1',
    },
    runtime_bindings: {
      control_plane_id: 'control_plane_provider_variance_001',
      artifact_store_ref: ref('artifact_store', 'artifact_store_provider_variance_001'),
      evidence_ledger_ref: ref('evidence_ledger', 'evidence_ledger_provider_variance_001'),
      work_order_broker_ref: ref('work_order_broker', 'work_order_broker_provider_variance_001'),
      run_monitor_ref: ref('run_monitor', 'run_monitor_provider_variance_001'),
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

function makeInputSnapshotRequest(): CreateImplementationInputSnapshotRequest {
  return {
    input_snapshot_id: INPUT_SNAPSHOT_ID,
    target_ref: TARGET_REF,
    workflow_type: 'claim_boundary_review',
    context_policy_version_id: 'context_policy_provider_variance_v1',
    included_context: {
      motive_version_refs: [],
      board_version_refs: [],
      assertion_refs: [],
      evidence_binding_refs: [],
      route_refs: [],
      probe_refs: [],
      experiment_plan_refs: [],
      work_order_refs: [],
      run_evidence_refs: [SOURCE_REF],
      result_packet_refs: [],
      accepted_risk_refs: [],
      human_decision_refs: [],
      trace_manifest_refs: [TRACE_REF],
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
    source_hashes: ['sha256:provider-variance-input'],
    created_by: 'system',
  };
}

function makeProject(): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: 'intake_snapshot_provider_variance_001',
    workspace_id: 'workspace_provider_variance_001',
    title_card_id: 'title_card_provider_variance_001',
    paper_project_bridge_id: 'paper_project_bridge_provider_variance_001',
    bridge_payload_hash: 'sha256:provider-variance-bridge',
    target_paper_project_ref: null,
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_provider_variance_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeTraceManifest(implementationProjectId: string): TraceManifest {
  return {
    trace_manifest_id: TRACE_MANIFEST_ID,
    implementation_project_id: implementationProjectId,
    target_ref: TARGET_REF,
    lineage: {
      literature: {
        literature_evidence_refs: [],
        source_locator_refs: [],
        citation_candidate_refs: [],
      },
      experiment: {
        experiment_plan_refs: [],
        work_order_refs: [],
        run_refs: [],
        run_evidence_refs: [SOURCE_REF],
        result_packet_refs: [],
        metric_refs: [],
      },
      artifact: {
        dataset_refs: [],
        baseline_refs: [],
        code_version_refs: [],
        model_checkpoint_refs: [],
        config_refs: [],
        log_artifact_refs: [ref('artifact', 'provider_variance_report_artifact_001')],
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
    },
    integrity: {
      missing_refs: [],
      broken_refs: [],
      stale_refs: [],
      invalidated_refs: [],
      non_citable_refs: [],
      partial_refs: [],
    },
    trace_status: 'complete',
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: 0,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace_policy_provider_variance_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function assertMetric(
  response: RunProviderVarianceEvaluationResponse,
  metricName: string,
  expected: { numerator: number; denominator: number; value: number },
): void {
  const metric = response.metrics.find((candidate) => candidate.metric === metricName);
  assert.ok(metric, `missing metric ${metricName}`);
  assert.equal(metric.numerator, expected.numerator);
  assert.equal(metric.denominator, expected.denominator);
  assert.equal(metric.value, expected.value);
}

function requireCase(
  response: RunProviderVarianceEvaluationResponse,
  caseId: string,
) {
  const result = response.case_results.find((candidate) => candidate.case_id === caseId);
  assert.ok(result, `missing case result ${caseId}`);
  return result;
}

function refTypesFromEvaluationResponse(response: RunProviderVarianceEvaluationResponse): string[] {
  const refs = response.case_results.flatMap((result) => [
    result.harness_run_ref,
    ...result.proposal_artifact_refs,
    ...result.quality_signal_refs,
    ...result.queue_item_refs,
  ]);
  return [...new Set(refs
    .filter((candidate): candidate is TopicSelectionFunctionalRef => Boolean(candidate))
    .map((candidate) => candidate.ref_type))]
    .sort();
}

function assertNoRuntimeAuthorityRefs(response: RunProviderVarianceEvaluationResponse): void {
  const forbiddenRefTypes = new Set([
    'paper_implementation_runtime_artifact',
    'paper_implementation_runtime_admission',
    'paper_implementation_runtime_admission_record',
    'runtime_artifact',
    'runtime_admission',
    'runtime_admission_record',
    'domain_gate_materialization',
    'claim_candidate',
    'implementation_dossier',
    'result_interpretation_packet',
    'research_work_order',
    'experiment_run',
    'run_evidence_unit',
  ]);
  const observedForbiddenRefs = response.case_results.flatMap((result) => [
    result.harness_run_ref,
    ...result.proposal_artifact_refs,
    ...result.quality_signal_refs,
    ...result.queue_item_refs,
  ])
    .filter((candidate): candidate is TopicSelectionFunctionalRef => Boolean(candidate))
    .filter((candidate) => forbiddenRefTypes.has(candidate.ref_type));
  assert.deepEqual(observedForbiddenRefs, []);
}

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
  };
}

function makeIdFactory() {
  const counts = new Map<string, number>();
  return (prefix: string) => {
    const next = (counts.get(prefix) ?? 0) + 1;
    counts.set(prefix, next);
    return `${prefix}_${String(next).padStart(3, '0')}`;
  };
}
