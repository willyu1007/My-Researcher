import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ImplementationFeedbackEvent,
  ImplementationIntakeSnapshot,
  ImplementationProject,
  RecordImplementationFeedbackEventRequest,
  RecordImplementationFeedbackEventResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';
import type {
  ClaimTracePacket,
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateClaimCandidateRequest,
  CreateResultInterpretationPacketRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-result-claim-dossier-contracts';
import type {
  RunEvidenceUnit,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-workorder-contracts';
import type {
  ValidationCycle,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationResultClaimDossierRepository } from '../repositories/in-memory-paper-implementation-result-claim-dossier-repository.js';
import { InMemoryPaperImplementationTraceRepository } from '../repositories/in-memory-paper-implementation-trace-repository.js';
import {
  InMemoryPaperImplementationHumanConfirmationRepository,
} from '../repositories/in-memory-paper-implementation-human-confirmation-repository.js';
import type {
  PaperImplementationBootstrapPersistence,
  PaperImplementationBootstrapResult,
  PaperImplementationRepository,
} from '../repositories/paper-implementation.repository.js';
import type { PaperImplementationValidationRepository } from '../repositories/paper-implementation-validation.repository.js';
import type { PaperImplementationWorkOrderRepository } from '../repositories/paper-implementation-workorder.repository.js';
import { PaperImplementationResultClaimDossierService } from './paper-implementation-result-claim-dossier-service.js';

const NOW = '2026-05-21T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';
const VALIDATION_CYCLE_ID = 'validation_cycle_001';
const RUN_EVIDENCE_ID = 'run_evidence_unit_001';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: versionId,
  };
}

class StaticProjectRepository implements PaperImplementationRepository {
  readonly project: ImplementationProject = {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: 'intake_snapshot_001',
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    paper_project_bridge_id: 'paper_project_bridge_001',
    bridge_payload_hash: 'bridge_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: 'active',
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };

  async createBootstrap(
    persistence: PaperImplementationBootstrapPersistence,
  ): Promise<PaperImplementationBootstrapResult> {
    return { ...persistence, created: true };
  }

  async findProjectById(implementationProjectId: string): Promise<ImplementationProject | null> {
    return implementationProjectId === PROJECT_ID ? structuredClone(this.project) : null;
  }

  async findProjectByBridgeId(): Promise<ImplementationProject | null> {
    return structuredClone(this.project);
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

class StaticFeedbackRecorder {
  readonly calls: RecordImplementationFeedbackEventRequest[] = [];

  async recordFeedbackEvent(
    _implementationProjectId: string,
    request: RecordImplementationFeedbackEventRequest,
  ): Promise<RecordImplementationFeedbackEventResponse> {
    this.calls.push(structuredClone(request));
    return {
      feedback_event: {
        feedback_event_id: 'implementation_feedback_event_001',
        implementation_project_id: PROJECT_ID,
        intake_snapshot_id: 'intake_snapshot_001',
        paper_project_bridge_id: 'paper_project_bridge_001',
        feedback_type: request.feedback_type,
        severity: request.severity,
        summary: request.summary,
        source_object_refs: request.source_object_refs ?? [],
        evidence_refs: request.evidence_refs ?? [],
        run_refs: request.run_refs ?? [],
        recommended_upstream_action: request.recommended_upstream_action ?? 'recheck_topic_selection',
        feedback_status: 'recheck_requested',
        downstream_topic_feedback_ref: null,
        downstream_recheck_request: null,
        downstream_impact_summary: null,
        artifact_refs: request.artifact_refs ?? [],
        payload: request.feedback_payload ?? {},
        policy_version_id: request.policy_version_id ?? null,
        created_by: request.created_by ?? 'system',
        created_at: NOW,
      },
      downstream_topic_feedback: null,
    };
  }
}

function emptyLineage(): TraceLineageBundle {
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

function traceManifest(id: string, targetType: string, targetId: string): TraceManifest {
  return {
    trace_manifest_id: id,
    implementation_project_id: PROJECT_ID,
    target_ref: ref(targetType, targetId),
    lineage: emptyLineage(),
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
    trace_policy_version_id: 'trace_policy_v1',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeRunEvidence(runStatus: RunEvidenceUnit['run_status'] = 'succeeded'): RunEvidenceUnit {
  return {
    run_evidence_unit_id: RUN_EVIDENCE_ID,
    implementation_project_id: PROJECT_ID,
    work_order_id: 'research_work_order_001',
    validation_cycle_id: VALIDATION_CYCLE_ID,
    experiment_plan_light_id: null,
    monitor_intake_id: 'run_monitor_intake_001',
    external_job_ref: ref('experiment_foundation_run', 'experiment_run_001'),
    external_job_hash: 'experiment_run_hash_001',
    run_type: 'confirmatory',
    run_status: runStatus,
    trusted_status: 'trusted',
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config', 'config_001')],
    result_ref: runStatus === 'succeeded' ? ref('result_artifact', 'result_001') : null,
    result_hash: runStatus === 'succeeded' ? 'result_hash_001' : null,
    result_validation_report_ref: runStatus === 'succeeded'
      ? ref('result_validation_report', 'result_validation_report_001')
      : null,
    result_validation_report_hash: runStatus === 'succeeded' ? 'result_validation_hash_001' : null,
    evidence_candidate_refs: [],
    evidence_candidate_hashes: [],
    failure_summary_id: runStatus === 'succeeded' ? null : 'failure_summary_001',
    failure_summary: runStatus === 'succeeded' ? null : 'Run did not support the expected result.',
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_run_001'),
    trace_manifest_id: 'trace_manifest_run_001',
    created_by: 'system',
    created_at: NOW,
  };
}

function makeValidationRepository(): PaperImplementationValidationRepository {
  return {
    findValidationCycleById: async () => ({
      validation_cycle_id: VALIDATION_CYCLE_ID,
      implementation_project_id: PROJECT_ID,
      input_snapshot_id: 'validation_input_snapshot_001',
      target: {
        target_type: 'core_motive_version',
        target_id: 'core_motive_version_001',
        target_version_id: '1',
      },
      trigger: {
        trigger_type: 'board_gap',
        trigger_refs: [],
      },
      cycle_type: 'probe_execution',
      validation_frame: {
        validation_question: 'Does evidence support the claim?',
        assumptions_under_test: ['Assumption.'],
        assertions_under_test: [ref('motive_assertion', 'motive_assertion_001')],
        decision_if_pass: 'Prepare claim.',
        decision_if_fail: 'Lower claim ceiling.',
        decision_if_inconclusive: 'Collect more evidence.',
        expected_information_gain: 'high',
        why_this_cycle_now: 'The board is ready.',
      },
      context: {
        input_snapshot_id: 'validation_input_snapshot_001',
        implementation_project_id: PROJECT_ID,
        context_policy_version_id: 'validation_context_v1',
        included_refs: {
          motive_version_refs: [],
          board_version_refs: [],
          evidence_refs: [],
          route_refs: [],
          work_order_refs: [],
          result_packet_refs: [],
          experiment_plan_light_refs: [],
        },
        excluded_context_notes: [],
        input_snapshot_hash: 'validation_input_hash_001',
        created_by: 'system',
        created_at: NOW,
      },
      criteria: {
        pass_conditions: ['Pass.'],
        fail_conditions: ['Fail.'],
        inconclusive_conditions: ['Inconclusive.'],
        stop_conditions: ['Stop.'],
        minimum_artifacts_required: ['Run evidence.'],
      },
      budget: {
        budget_id: 'validation_budget_001',
        max_runtime: 'PT1H',
        max_compute: 'local_cpu',
        max_human_review_count: 1,
        retry_budget: 0,
      },
      lifecycle_status: 'completed',
      execution_status: 'completed',
      outputs: {
        evidence_unit_refs: [],
        evidence_binding_refs: [],
        board_update_refs: [],
        route_update_refs: [],
        work_order_result_refs: [],
        result_interpretation_packet_refs: [],
        quality_signal_refs: [],
        recommended_evolution_decision_refs: [],
      },
      cycle_assessment: null,
      trace_manifest_ref: ref('trace_manifest', 'trace_manifest_validation_001'),
      trace_manifest_id: 'trace_manifest_validation_001',
      gate_result_id: 'validation_gate_result_001',
      decision_exit: null,
      confirmation_level: 'human_confirmed',
      confirmed_by: 'human',
      policy_version_id: 'policy_v1',
      created_by: 'system',
      created_at: NOW,
      updated_at: NOW,
      admitted_at: NOW,
      completed_at: NOW,
    } satisfies ValidationCycle),
    findExperimentPlanLightById: async () => null,
  } as unknown as PaperImplementationValidationRepository;
}

function makeWorkOrderRepository(runEvidence: RunEvidenceUnit): PaperImplementationWorkOrderRepository {
  return {
    findRunEvidenceUnitById: async (_implementationProjectId: string, runEvidenceUnitId: string) =>
      runEvidenceUnitId === runEvidence.run_evidence_unit_id ? structuredClone(runEvidence) : null,
  } as unknown as PaperImplementationWorkOrderRepository;
}

function validResultRequest(): CreateResultInterpretationPacketRequest {
  return {
    result_interpretation_packet_id: 'result_interpretation_packet_001',
    validation_cycle_id: VALIDATION_CYCLE_ID,
    source: {
      run_evidence_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      validation_report_refs: [ref('result_validation_report', 'result_validation_report_001')],
      metric_refs: [ref('metric', 'metric_001')],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary: 'The trusted run supports the bounded assertion.',
      supports_assertion_refs: [ref('motive_assertion', 'motive_assertion_001')],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [],
    },
    claim_implications: {
      allowed_claim_ceiling: 'moderate' as const,
      forbidden_overclaims: ['broad generalization'],
      recommended_claim_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'trace_manifest_result_001',
  };
}

function validClaimRequest(): CreateClaimCandidateRequest {
  return {
    claim_candidate_id: 'claim_candidate_001',
    claim_type: 'empirical_finding' as const,
    claim_statement: 'The method improves the admitted benchmark metric.',
    claim_strength: 'moderate' as const,
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    support_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
    challenge_refs: [],
    scope: {
      population_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      metric_scope: 'Primary metric.',
      negative_scope_notes: [],
      excluded_scope_notes: [],
    },
    boundary: {
      rationale: 'Bounded to the admitted benchmark.',
      forbidden_overclaims: ['broad generalization'],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
    },
    trace_manifest_id: 'trace_manifest_claim_001',
    claim_trace_packet_id: 'claim_trace_packet_001',
  };
}

function validDossierRequest() {
  return {
    dossier_id: 'implementation_dossier_001',
    dossier_status: 'ready_for_writing' as const,
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    claim_candidate_ids: ['claim_candidate_001'],
    claim_trace_packet_ids: ['claim_trace_packet_001'],
    experiment_section: {
      failed_run_refs: [] as TopicSelectionFunctionalRef[],
      inconclusive_run_refs: [] as TopicSelectionFunctionalRef[],
      negative_result_refs: [] as TopicSelectionFunctionalRef[],
      excluded_stale_or_invalidated_evidence_refs: [] as TopicSelectionFunctionalRef[],
      experiment_limitations: [] as string[],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_001')],
      rejected_claim_refs: [] as TopicSelectionFunctionalRef[],
      forbidden_overclaims: ['broad generalization'],
      claim_ceiling: 'moderate' as const,
    },
    readiness: {
      readiness_gate_result_id: 'dossier_readiness_gate_001',
      blocker_refs: [] as TopicSelectionFunctionalRef[],
      warning_refs: [] as TopicSelectionFunctionalRef[],
      readiness_notes: [] as string[],
    },
    trace_manifest_id: 'trace_manifest_dossier_001',
    projection_policy_version_id: 'writing_projection_policy_v1',
  };
}

async function setup(
  runStatus: RunEvidenceUnit['run_status'] = 'succeeded',
  runEvidenceOverrides: Partial<RunEvidenceUnit> = {},
) {
  const traceRepository = new InMemoryPaperImplementationTraceRepository();
  const resultClaimRepository = new InMemoryPaperImplementationResultClaimDossierRepository();
  const feedbackRecorder = new StaticFeedbackRecorder();
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_result_001', 'result_interpretation_packet', 'result_interpretation_packet_001'),
    [],
  );
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_claim_001', 'claim_candidate', 'claim_candidate_001'),
    [],
  );
  await traceRepository.createTraceManifest(
    traceManifest('trace_manifest_dossier_001', 'implementation_dossier', 'implementation_dossier_001'),
    [],
  );
  await traceRepository.createTraceGateResult({
    gate_result_id: 'dossier_readiness_gate_001',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: 'trace_manifest_dossier_001',
    gate_status: 'passed',
    trace_status: 'complete',
    blocker_codes: [],
    repair_queue_item_refs: [],
    created_at: NOW,
  });
  const claimTracePacket: ClaimTracePacket = {
    claim_trace_packet_id: 'claim_trace_packet_001',
    implementation_project_id: PROJECT_ID,
    claim_ref: ref('claim_candidate', 'claim_candidate_001'),
    claim_statement: 'The method improves the admitted benchmark metric.',
    trace_manifest_id: 'trace_manifest_claim_001',
    trace_manifest_ref: ref('trace_manifest', 'trace_manifest_claim_001'),
    lineage: emptyLineage(),
    challenge: {
      challenging_result_refs: [],
      counter_evidence_refs: [],
      unresolved_objections: [],
    },
    scope: {
      task_scope: 'Admitted benchmark.',
      method_scope: 'Configured method.',
      dataset_scope: 'Dataset v1.',
      evaluation_scope: 'Primary metric.',
      baseline_scope: null,
    },
    boundary: {
      forbidden_overclaims: ['broad generalization'],
      claim_strength: 'moderate',
      human_confirmation_required: false,
    },
    created_by: 'system',
    created_at: NOW,
  };
  await traceRepository.createClaimTracePacket(claimTracePacket);
  const confirmationRepository = new InMemoryPaperImplementationHumanConfirmationRepository();
  const service = new PaperImplementationResultClaimDossierService({
    projectRepository: new StaticProjectRepository(),
    resultClaimRepository,
    traceRepository,
    confirmationRepository,
    validationRepository: makeValidationRepository(),
    workOrderRepository: makeWorkOrderRepository({
      ...makeRunEvidence(runStatus),
      ...runEvidenceOverrides,
    }),
    feedbackRecorder,
    now: () => NOW,
    idFactory: (prefix) => `${prefix}_001`,
  });
  return { service, feedbackRecorder, confirmationRepository, traceRepository };
}

test('result interpretation blocks failed runs that are not retained and accounted for', async () => {
  const { service } = await setup('failed');
  const request = validResultRequest();
  request.result_summary.failed_runs_accounted_for = false;
  await assert.rejects(
    service.createResultInterpretationPacket(PROJECT_ID, request),
    (error) =>
      error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('accounted for'),
  );
});

test('result interpretation requires trusted run evidence and explicit validation outputs', async () => {
  const untrusted = await setup('succeeded', { trusted_status: 'needs_review' });
  await assert.rejects(
    untrusted.service.createResultInterpretationPacket(PROJECT_ID, validResultRequest()),
    (error) => error instanceof AppError && error.message.includes('trusted RunEvidenceUnit'),
  );

  const missingReport = await setup();
  const missingReportRequest = validResultRequest();
  missingReportRequest.source.validation_report_refs = [];
  await assert.rejects(
    missingReport.service.createResultInterpretationPacket(PROJECT_ID, missingReportRequest),
    (error) => error instanceof AppError && error.message.includes('validation_report_refs'),
  );

  const missingMetric = await setup();
  const missingMetricRequest = validResultRequest();
  missingMetricRequest.source.metric_refs = [];
  await assert.rejects(
    missingMetric.service.createResultInterpretationPacket(PROJECT_ID, missingMetricRequest),
    (error) => error instanceof AppError && error.message.includes('metric_refs'),
  );
});

test('result interpretation, claim, dossier, and writing packet close the ready path', async () => {
  const { service } = await setup('failed');
  const resultRequest = validResultRequest();
  resultRequest.source.failed_run_refs = [ref('run_evidence_unit', RUN_EVIDENCE_ID)];
  const resultPacket = await service.createResultInterpretationPacket(PROJECT_ID, resultRequest);
  assert.equal(resultPacket.interpretation_gate_status, 'passed_with_risk');

  const claim = await service.createClaimCandidate(PROJECT_ID, validClaimRequest());
  assert.equal(claim.claim_trace_packet_id, 'claim_trace_packet_001');
  assert.equal(claim.claim_status, 'supported');

  const dossier = await service.createImplementationDossier(PROJECT_ID, {
    dossier_id: 'implementation_dossier_001',
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    claim_candidate_ids: ['claim_candidate_001'],
    claim_trace_packet_ids: ['claim_trace_packet_001'],
    experiment_section: {
      failed_run_refs: [ref('run_evidence_unit', RUN_EVIDENCE_ID)],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: ['One failed run is retained as boundary evidence.'],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_001')],
      rejected_claim_refs: [],
      forbidden_overclaims: ['broad generalization'],
      claim_ceiling: 'moderate',
    },
    readiness: {
      readiness_gate_result_id: 'dossier_readiness_gate_001',
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [],
    },
    trace_manifest_id: 'trace_manifest_dossier_001',
    projection_policy_version_id: 'writing_projection_policy_v1',
  });
  assert.equal(dossier.dossier_status, 'ready_for_writing');
  assert.equal(dossier.failed_run_count, 1);

  const packet = await service.createWritingEntryPacket(PROJECT_ID, dossier.dossier_id, {
    projection_policy_version_id: 'writing_projection_policy_v1',
  });
  assert.equal(packet.dossier_hash, dossier.dossier_hash);
  assert.equal(packet.packet_status, 'current');
});

test('claim boundary blocks interpretation refs as support and forbidden overclaims', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());

  const memoSupport = validClaimRequest();
  memoSupport.support_refs = [ref('result_interpretation_packet', 'result_interpretation_packet_001')];
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, memoSupport),
    (error) => error instanceof AppError && error.message.includes('interpretation refs as evidence'),
  );

  const unsupportedSupport = validClaimRequest();
  unsupportedSupport.support_refs = [ref('validation_cycle', VALIDATION_CYCLE_ID)];
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, unsupportedSupport),
    (error) => error instanceof AppError && error.message.includes('support must point'),
  );

  for (const refType of ['literature_ref', 'source_ref', 'evidence_unit']) {
    const broadContextSupport = validClaimRequest();
    broadContextSupport.support_refs = [ref(refType, `${refType}_001`)];
    await assert.rejects(
      service.createClaimCandidate(PROJECT_ID, broadContextSupport),
      (error) => error instanceof AppError && error.message.includes('support must point'),
    );
  }

  const overclaim = validClaimRequest();
  overclaim.claim_statement = 'The method gives broad generalization across all tasks.';
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, overclaim),
    (error) => error instanceof AppError && error.message.includes('forbidden overclaim'),
  );

  const paraphraseOverclaim = validClaimRequest();
  paraphraseOverclaim.claim_statement = 'The method is universally reliable and globally superior across all datasets.';
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, paraphraseOverclaim),
    (error) => error instanceof AppError && error.message.includes('forbidden overclaim'),
  );
});

test('claim without claim trace stays pending and cannot be admitted to ready dossier', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());

  const pendingRequest = validClaimRequest();
  delete (pendingRequest as Partial<CreateClaimCandidateRequest>).claim_trace_packet_id;
  const pending = await service.createClaimCandidate(PROJECT_ID, pendingRequest);
  assert.equal(pending.claim_status, 'support_pending_trace');
  assert.equal(pending.claim_trace_packet_id, null);

  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, validDossierRequest()),
    (error) => error instanceof AppError && error.message.includes('supported trace-ready status'),
  );
});

test('ready dossier rejects blockers and unresolved admitted claim disposition', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  await service.createClaimCandidate(PROJECT_ID, validClaimRequest());

  const blocked = validDossierRequest();
  blocked.readiness.blocker_refs = [ref('gate_result', 'unresolved_blocker_001')];
  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, blocked),
    (error) => error instanceof AppError && error.message.includes('blocker_refs'),
  );

  const emptyAdmitted = validDossierRequest();
  emptyAdmitted.claim_section.admitted_claim_refs = [];
  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, emptyAdmitted),
    (error) => error instanceof AppError && error.message.includes('admitted claim ref'),
  );

  const mismatchedAdmitted = validDossierRequest();
  mismatchedAdmitted.claim_section.admitted_claim_refs = [ref('claim_candidate', 'claim_candidate_missing')];
  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, mismatchedAdmitted),
    (error) => error instanceof AppError && error.message.includes('included ClaimCandidate'),
  );
});

test('strong claim requires explicit human confirmation', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  const strongClaim = validClaimRequest();
  strongClaim.claim_strength = 'strong';
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, strongClaim),
    (error) => error instanceof AppError && error.message.includes('human confirmation'),
  );
});

test('writing packet cannot be projected from a non-ready dossier', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  const dossier = await service.createImplementationDossier(PROJECT_ID, {
    dossier_id: 'implementation_dossier_001',
    dossier_status: 'draft',
    result_interpretation_packet_ids: ['result_interpretation_packet_001'],
    claim_candidate_ids: [],
    claim_trace_packet_ids: [],
    experiment_section: {
      failed_run_refs: [],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [],
    },
    claim_section: {
      admitted_claim_refs: [],
      rejected_claim_refs: [],
      forbidden_overclaims: [],
      claim_ceiling: 'tentative',
    },
    readiness: {
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [],
    },
    trace_manifest_id: 'trace_manifest_dossier_001',
  });
  await assert.rejects(
    service.createWritingEntryPacket(PROJECT_ID, dossier.dossier_id, {}),
    (error) => error instanceof AppError && error.message.includes('ready_for_writing'),
  );
});

test('result claim feedback delegates to T-093 implementation feedback authority', async () => {
  const { service, feedbackRecorder } = await setup();
  const result = await service.recordResultClaimFeedbackEvent(PROJECT_ID, {
    feedback_trigger: 'lower_claim_ceiling',
    severity: 'warning',
    summary: 'Result evidence lowers the claim ceiling.',
  });
  assert.equal(result.feedback_event.feedback_type, 'lower_claim_ceiling');
  assert.equal(feedbackRecorder.calls[0]?.recommended_upstream_action, 'recheck_topic_selection');
});

test('strong claim confirmation ref must resolve to an active strong-claim-scope record', async () => {
  const { service, confirmationRepository } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  const strongClaim = validClaimRequest();
  strongClaim.claim_strength = 'strong';
  strongClaim.boundary = {
    ...strongClaim.boundary,
    human_confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_fabricated'),
  };
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, strongClaim),
    (error) => error instanceof AppError
      && error.message.includes('must resolve to an existing HumanConfirmationRecord'),
  );

  await confirmationRepository.createHumanConfirmationRecord({
    confirmation_record_id: 'pi_human_confirmation_wrong_scope',
    implementation_project_id: PROJECT_ID,
    confirmation_scope: 'motive_portfolio_decision',
    target_refs: [ref('claim_candidate', 'claim_candidate_001')],
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed the portfolio impact.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    created_at: NOW,
    updated_at: null,
  });
  strongClaim.boundary = {
    ...strongClaim.boundary,
    human_confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_wrong_scope'),
  };
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, strongClaim),
    (error) => error instanceof AppError
      && error.message.includes('scope strong_claim_acceptance'),
  );

  await confirmationRepository.createHumanConfirmationRecord({
    confirmation_record_id: 'pi_human_confirmation_strong_001',
    implementation_project_id: PROJECT_ID,
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [ref('claim_candidate', 'claim_candidate_001')],
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed run evidence and boundary before accepting the strong claim.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    created_at: NOW,
    updated_at: null,
  });
  strongClaim.boundary = {
    ...strongClaim.boundary,
    human_confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_strong_001'),
  };
  const created = await service.createClaimCandidate(PROJECT_ID, strongClaim);
  assert.equal(created.claim_strength, 'strong');
  assert.equal(created.human_confirmation_required, true);
});

test('strong claim confirmation is target-bound and consumed exactly once', async () => {
  const { service, confirmationRepository } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());

  // A record whose target_refs do not cover this claim candidate is rejected.
  await confirmationRepository.createHumanConfirmationRecord({
    confirmation_record_id: 'pi_human_confirmation_other_target',
    implementation_project_id: PROJECT_ID,
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [ref('claim_candidate', 'claim_candidate_unrelated')],
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed a different claim.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    created_at: NOW,
    updated_at: null,
  });
  const strongClaim = validClaimRequest();
  strongClaim.claim_strength = 'strong';
  strongClaim.boundary = {
    ...strongClaim.boundary,
    human_confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_other_target'),
  };
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, strongClaim),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('target_refs must cover the authorized object'),
  );

  // A record covering the claim is consumed by the successful create.
  await confirmationRepository.createHumanConfirmationRecord({
    confirmation_record_id: 'pi_human_confirmation_consumable',
    implementation_project_id: PROJECT_ID,
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [ref('claim_candidate', 'claim_candidate_001')],
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed the strong claim.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    created_at: NOW,
    updated_at: null,
  });
  strongClaim.boundary = {
    ...strongClaim.boundary,
    human_confirmation_ref: ref('human_confirmation_record', 'pi_human_confirmation_consumable'),
  };
  const created = await service.createClaimCandidate(PROJECT_ID, strongClaim);
  assert.equal(created.claim_strength, 'strong');
  const consumedRecord = await confirmationRepository.findHumanConfirmationRecordById(
    PROJECT_ID,
    'pi_human_confirmation_consumable',
  );
  assert.equal(consumedRecord?.consumed_at, NOW);
  assert.equal(consumedRecord?.consumed_by_ref?.ref_type, 'claim_candidate');
  assert.equal(consumedRecord?.consumed_by_ref?.ref_id, 'claim_candidate_001');

  // Reusing the consumed record for another decision is rejected.
  await assert.rejects(
    service.createClaimCandidate(PROJECT_ID, strongClaim),
    (error) => error instanceof AppError
      && error.errorCode === 'GATE_CONSTRAINT_FAILED'
      && error.message.includes('already been consumed'),
  );
});

test('ready dossier rejects unresolvable readiness gate results', async () => {
  const { service } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  await service.createClaimCandidate(PROJECT_ID, validClaimRequest());
  const request = validDossierRequest();
  request.readiness = {
    ...request.readiness,
    readiness_gate_result_id: 'dossier_readiness_gate_missing',
  };
  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, request),
    (error) => error instanceof AppError
      && error.message.includes('must resolve to a persisted TraceGateResult'),
  );
});

test('ready dossier rejects readiness gate results targeting a different trace manifest', async () => {
  const { service, traceRepository } = await setup();
  await service.createResultInterpretationPacket(PROJECT_ID, validResultRequest());
  await service.createClaimCandidate(PROJECT_ID, validClaimRequest());
  await traceRepository.createTraceGateResult({
    gate_result_id: 'dossier_readiness_gate_other_manifest',
    implementation_project_id: PROJECT_ID,
    trace_manifest_id: 'trace_manifest_claim_001',
    gate_status: 'passed',
    trace_status: 'complete',
    blocker_codes: [],
    repair_queue_item_refs: [],
    created_at: NOW,
  });
  const request = validDossierRequest();
  request.readiness = {
    ...request.readiness,
    readiness_gate_result_id: 'dossier_readiness_gate_other_manifest',
  };
  await assert.rejects(
    service.createImplementationDossier(PROJECT_ID, request),
    (error) => error instanceof AppError
      && error.message.includes('must target the expected trace manifest'),
  );
});
