import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  CreatePaperImplementationCoordinatorRunRequest,
  PaperImplementationCoordinatorRun,
  PaperImplementationCoordinatorRunWithSteps,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';
import type {
  CoreMotiveIdentity,
  CoreMotiveSet,
  CoreMotiveVersion,
  CoreMotiveVersionState,
  EvidenceBinding,
  MotiveAssertion,
  MotiveEvidenceBoardVersion,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-motive-contracts';
import {
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationValidationCycleCandidateProposal,
  type PaperImplementationValidationCyclePlanningArtifact,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TraceLineageBundle,
  TraceManifest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-trace-contracts';
import type {
  CreateValidationCycleDraftRequest,
  ValidationCycle,
  ValidationCycleInputSnapshot,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-validation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationValidationRepository } from '../repositories/in-memory-paper-implementation-validation-repository.js';
import { buildFinalRuntimeArtifactEnvelope } from './paper-implementation-acceptance-bridge-test-fixtures.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import { PaperImplementationValidationCycleHandoffService } from './paper-implementation-validation-cycle-handoff-service.js';
import { resolvePaperImplementationScientificContinuationStage } from './paper-implementation-scientific-continuation-stage-resolver.js';

const NOW = '2026-08-24T00:00:00.000Z';
const PROJECT_ID = 'implementation_project_t142';
const TITLE_CARD_ID = 'title_card_t142';
const MOTIVE_ID = 'core_motive_t142';
const VERSION_ID = 'core_motive_version_t142';
const ASSERTION_ID = 'motive_assertion_t142';
const BOARD_ID = 'motive_evidence_board_t142';
const BINDING_ID = 'evidence_binding_t142';
const EVIDENCE_ID = 'evidence_unit_t142';

function ref(refType: string, refId: string, versionId?: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    ...(versionId ? { version_id: versionId } : {}),
  };
}

function emptyLineage(): TraceLineageBundle {
  return {
    literature: { literature_evidence_refs: [], source_locator_refs: [], citation_candidate_refs: [] },
    experiment: {
      experiment_plan_refs: [], work_order_refs: [], run_refs: [], run_evidence_refs: [],
      result_packet_refs: [], metric_refs: [],
    },
    artifact: {
      dataset_refs: [], baseline_refs: [], code_version_refs: [],
      model_checkpoint_refs: [], config_refs: [], log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [], motive_evolution_decision_refs: [], gate_result_refs: [],
      human_decision_refs: [], accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [], llm_rationale_refs: [], board_summary_refs: [], non_citable_refs: [],
    },
  };
}

function completeTrace(
  traceManifestId: string,
  targetRef: TopicSelectionFunctionalRef = ref('motive_evidence_board_version', BOARD_ID),
): TraceManifest {
  return {
    trace_manifest_id: traceManifestId,
    implementation_project_id: PROJECT_ID,
    target_ref: targetRef,
    lineage: {
      ...emptyLineage(),
      literature: {
        literature_evidence_refs: [ref('evidence_unit', EVIDENCE_ID, 'v1')],
        source_locator_refs: [ref('source_locator', 'source_locator_t142')],
        citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_t142')],
      },
    },
    integrity: {
      broken_refs: [], stale_refs: [], missing_refs: [], non_citable_refs: [],
      invalidated_refs: [], partial_refs: [],
    },
    trace_status: 'complete',
    broken_ref_count: 0,
    stale_ref_count: 0,
    missing_ref_count: 0,
    non_citable_ref_count: 0,
    trace_policy_version_id: 'trace_policy_t142',
    created_by: 'system',
    created_at: NOW,
  };
}

function owners() {
  const motive: CoreMotiveIdentity = {
    motive_id: MOTIVE_ID,
    implementation_project_id: PROJECT_ID,
    current_version_id: VERSION_ID,
    origin: { source_topic_package_id: 'topic_t142', source_validated_need_ids: [], created_from_motive_ids: [] },
    portfolio_role: { role: 'primary', role_since: NOW },
    lifecycle_status: 'active',
    lineage: {
      merged_into_motive_id: null, split_into_motive_ids: [], superseded_by_motive_id: null,
      parent_motive_ids: [], child_motive_ids: [],
    },
    control: { owner: null, human_confirmation_required_for_major_change: true },
    policy_version_id: 'policy_t142',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
  const set: CoreMotiveSet = {
    motive_set_id: 'motive_set_t142', implementation_project_id: PROJECT_ID,
    active_motive_ids: [MOTIVE_ID], primary_motive_ids: [MOTIVE_ID], secondary_motive_ids: [],
    fallback_motive_ids: [], supporting_motive_ids: [], parked_motive_ids: [], abandoned_motive_ids: [],
    active_motive_count: 1, max_active_motives: 3, max_primary_motives: 1, max_parallel_routes: 2,
    latest_portfolio_decision_id: null, policy_version_id: 'policy_t142', created_at: NOW, updated_at: NOW,
  };
  const version: CoreMotiveVersion = {
    core_motive_version_id: VERSION_ID,
    motive_id: MOTIVE_ID,
    implementation_project_id: PROJECT_ID,
    version_number: 1,
    version_status: 'admitted',
    version_origin: { previous_version_id: null, derived_from_motive_version_ids: [], derivation_type: 'initial' },
    motive_contract: {
      short_name: 'Bounded validation route',
      motivation_claim: 'A controlled validation is needed.',
      problem_pressure: 'The board is pre-experimental.',
      current_solution_insufficiency: 'The assertion is not yet experimentally tested.',
      unmet_or_failure_mechanism: 'The route has not been isolated.',
      target_setting: 'One admitted benchmark.',
      expected_contribution_path: 'Test the bounded assertion.',
      why_this_is_not_trivial: 'Controls must stay fixed.',
      why_existing_baselines_do_not_already_solve_it: 'Existing results change multiple factors.',
      what_makes_this_researchable_now: 'The evidence board is trace complete.',
    },
    scope_contract: { included_scope: ['Admitted benchmark'], excluded_scope: [], non_goals: [] },
    boundary_to_upstream: { within_upstream_boundary: true, boundary_risk_notes: [], upstream_recheck_required: false },
    falsification_contract: {
      invalidation_conditions: ['No measurable effect.'], weakening_conditions: ['Small effect.'],
      minimum_evidence_to_continue: ['One controlled comparison.'], decisive_negative_conditions: ['Stable reversal.'],
    },
    claim_boundary: {
      maximum_allowed_claim: 'Only the admitted benchmark.',
      minimum_defensible_contribution_claim: 'Report the bounded comparison.',
      forbidden_overclaims: ['No universal claim.'], claim_types_allowed: ['empirical'],
    },
    route_interface: {
      plausible_route_families: ['controlled comparison'], disallowed_route_families: [],
      required_route_properties: ['trace complete'], cheapest_validation_route_hint: 'One bounded probe.',
    },
    source_refs: [ref('evidence_unit', EVIDENCE_ID, 'v1')],
    source_result_packet_refs: [], source_human_judgment_refs: [],
    trace_manifest_ref: ref('trace_manifest', 'trace_motive_t142'),
    trace_manifest_id: 'trace_motive_t142', admission_gate_result_id: 'gate_motive_t142',
    hypothesis_only: false, policy_version_id: 'policy_t142', created_by: 'system', created_at: NOW, admitted_at: NOW,
  };
  const state: CoreMotiveVersionState = {
    motive_version_state_id: 'motive_state_t142', implementation_project_id: PROJECT_ID,
    motive_id: MOTIVE_ID, core_motive_version_id: VERSION_ID, review_status: 'reviewed',
    freshness_status: 'fresh', maturity_level: 'L1_evidence_backed', board_readiness_status: 'evidence_ready',
    evidence_status: 'partial', feasibility_status: 'not_checked', result_status: 'no_results',
    current_board_version_id: BOARD_ID, latest_validation_cycle_id: null, latest_evolution_decision_id: null,
    blocker_refs: [], accepted_risk_refs: [], updated_at: NOW,
  };
  const assertion: MotiveAssertion = {
    assertion_id: ASSERTION_ID, implementation_project_id: PROJECT_ID, motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID, assertion_type: 'experimental_answerability',
    assertion_text: 'A controlled comparison can answer the bounded question.',
    importance: { role: 'core', must_hold_for_motive_to_continue: true },
    validation_requirements: {
      minimum_support_level: 'moderate', required_evidence_types: ['literature'], required_counter_evidence_check: true,
    },
    falsification: { what_would_contradict_this: ['No viable controls.'], what_would_weaken_this: ['High variance.'] },
    status: 'partially_supported', created_by: 'system', created_at: NOW,
  };
  const binding: EvidenceBinding = {
    binding_id: BINDING_ID, implementation_project_id: PROJECT_ID, motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID, board_version_id: BOARD_ID, assertion_id: ASSERTION_ID,
    evidence_ref: ref('evidence_unit', EVIDENCE_ID, 'v1'), role: 'support', scope: {},
    strength: { directness: 'moderate', reliability: 'medium', reproducibility: 'unknown', freshness: 'fresh' },
    support_state: 'partial', challenge_status: 'addressed', freshness_status: 'fresh',
    interpretation: {
      normalized_statement: 'Prior evidence supports a bounded controlled comparison.',
      why_relevant_to_assertion: 'It covers the admitted setting.', limitations: ['No experiment result yet.'],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_binding_t142'), trace_manifest_id: 'trace_binding_t142',
    created_by: 'system', created_at: NOW,
  };
  const board: MotiveEvidenceBoardVersion = {
    board_version_id: BOARD_ID, implementation_project_id: PROJECT_ID, motive_id: MOTIVE_ID,
    core_motive_version_id: VERSION_ID, assertion_refs: [ref('motive_assertion', ASSERTION_ID)],
    evidence_binding_refs: [ref('evidence_binding', BINDING_ID)],
    board_summary: {
      current_support_summary: 'The bounded assertion has literature support.',
      current_challenge_summary: 'Experimental support is still missing.', unresolved_conflicts: [],
      board_gap_summary: 'A validation cycle is needed.', next_evidence_needed: ['Controlled result.'],
    },
    board_state: {
      readiness_status: 'evidence_ready', blocker_status: 'none', freshness_status: 'fresh',
      support_state: 'partial', challenge_status: 'addressed', accepted_risk_refs: [],
    },
    trace_manifest_ref: ref('trace_manifest', 'trace_board_t142'), trace_manifest_id: 'trace_board_t142',
    created_by: 'system', created_at: NOW,
  };
  return { motive, set, version, state, assertion, binding, board };
}

class RuntimeReader {
  artifact: PaperImplementationRuntimeArtifactEnvelope | null = null;

  async findRuntimeArtifactById(projectId: string, artifactId: string) {
    return this.artifact?.implementation_project_id === projectId
      && this.artifact.runtime_artifact_id === artifactId
      ? structuredClone(this.artifact)
      : null;
  }
}

type CoordinatorStop =
  | 'waiting_review'
  | 'failed_runtime'
  | 'failed_runtime_once'
  | 'blocked'
  | 'terminal_failed'
  | 'budget_exhausted';

type CoordinatorRunDrift =
  | 'implementation_project_id'
  | 'execution_mode'
  | 'model_option_id'
  | 'budget_envelope';

type PlanningArtifactPayloadDrift = 'missing_candidates' | 'extra_field';

class Coordinator {
  createCalls = 0;
  advanceCalls = 0;
  private run: PaperImplementationCoordinatorRun | null = null;
  private steps: PaperImplementationCoordinatorRunWithSteps['steps'] = [];

  constructor(
    private readonly runtime: RuntimeReader,
    private stop: CoordinatorStop | undefined,
    private readonly driftCandidate = false,
    private readonly confirmatoryCandidate = false,
    private readonly iterationBudgetRef = false,
    private readonly duplicateSelectedStep = false,
    private readonly runDrift?: CoordinatorRunDrift,
    private readonly artifactPayloadDrift?: PlanningArtifactPayloadDrift,
  ) {}

  async createCoordinatorRun(projectId: string, request: CreatePaperImplementationCoordinatorRunRequest) {
    if (this.run) throw new AppError(409, 'VERSION_CONFLICT', 'run exists');
    this.createCalls += 1;
    this.run = {
      schema_version: 'PaperImplementationCoordinatorRun@v1',
      coordinator_run_id: request.coordinator_run_id!, implementation_project_id: projectId,
      lane_id: request.lane_id, run_status: 'created', run_mode: request.run_mode,
      execution_mode: request.execution_mode, model_profile_id: request.model_profile_id ?? null,
      model_option_id: null, budget_envelope: request.budget_envelope, consumed: { steps: 0, provider_calls: 0 },
      lease: null, slot_request_payloads: structuredClone(request.slot_request_payloads), created_at: NOW, updated_at: NOW,
    };
    if (this.runDrift === 'implementation_project_id') {
      this.run.implementation_project_id = 'implementation_project_run_drift';
    } else if (this.runDrift === 'execution_mode') {
      this.run.execution_mode = 'mocked_llm';
    } else if (this.runDrift === 'model_option_id') {
      this.run.model_option_id = 'model_option_run_drift';
    } else if (this.runDrift === 'budget_envelope') {
      this.run.budget_envelope = { max_steps: 40, max_provider_calls: 80 };
    }
    return structuredClone(this.run);
  }

  async getCoordinatorRun(): Promise<PaperImplementationCoordinatorRunWithSteps> {
    assert.ok(this.run);
    return { run: structuredClone(this.run), steps: structuredClone(this.steps) };
  }

  async advance(): Promise<PaperImplementationCoordinatorRunWithSteps> {
    assert.ok(this.run);
    if (this.run.run_status === 'advancing') {
      throw new AppError(409, 'CONCURRENT_ADVANCE', 'run is already advancing');
    }
    if (this.run.run_status === 'completed') return this.getCoordinatorRun();
    this.advanceCalls += 1;
    this.run = { ...this.run, run_status: 'advancing', updated_at: NOW };
    await Promise.resolve();
    if (this.stop) {
      const activeStop = this.stop;
      const outcome = activeStop === 'waiting_review'
        ? 'waiting_review'
        : activeStop === 'failed_runtime'
          || activeStop === 'failed_runtime_once'
          || activeStop === 'terminal_failed'
          ? 'failed_runtime'
          : 'blocked';
      this.steps = [{
        schema_version: 'PaperImplementationCoordinatorStep@v1', coordinator_step_id: 'step_stop_t142',
        coordinator_run_id: this.run.coordinator_run_id, implementation_project_id: PROJECT_ID,
        step_index: 1, slot_id: 'route_skeptic_review.route_risk_critique', node_attempt_id: 'attempt_stop_t142',
        runtime_artifact_ref: null, runtime_artifact_hash: null, runtime_artifact_id: null,
        admission_ref: null, decision_record: null, outcome, provider_call_count: 1,
        blocker_codes: [outcome === 'failed_runtime' ? 'PROVIDER_UNAVAILABLE' : 'ROUTE_REVIEW_REQUIRED'],
        created_at: NOW,
      }];
      this.run = {
        ...this.run,
        run_status: activeStop === 'waiting_review'
          ? 'waiting_review'
          : activeStop === 'terminal_failed'
            ? 'failed'
            : activeStop === 'budget_exhausted'
              ? 'budget_exhausted'
              : 'blocked',
        consumed: { steps: 1, provider_calls: 1 },
        updated_at: NOW,
      };
      if (activeStop === 'failed_runtime_once') this.stop = undefined;
      return this.getCoordinatorRun();
    }
    const targetRef = this.run.slot_request_payloads[PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID]
      ?.target_ref as TopicSelectionFunctionalRef;
    const selectedCandidate: PaperImplementationValidationCycleCandidateProposal = {
      candidate_key: 'cycle_candidate_t142',
      reviewed_route_candidate_key: 'route_candidate_t142',
      target_ref: this.driftCandidate ? ref('motive_evidence_board', 'different_board_t142') : targetRef,
      target_frame_summary: 'The board is ready for a bounded route-feasibility check.',
      cycle_type: 'route_feasibility',
      trigger_refs: [targetRef],
      validation_question: 'Can a controlled route answer the bounded assertion?',
      assumptions_under_test: ['Controls can remain fixed.'],
      assertion_refs_under_test: [ref('motive_assertion', ASSERTION_ID)],
      decision_if_pass: 'Continue to experiment specification.',
      decision_if_fail: 'Return a route blocker.',
      decision_if_inconclusive: 'Narrow the validation question.',
      expected_information_gain: 'high',
      criteria: {
        pass_conditions: ['A controlled route is viable.'],
        fail_conditions: ['No controlled route is viable.'],
        inconclusive_conditions: ['Feasibility remains ambiguous.'],
        stop_conditions: ['Stop after the bounded check.'],
        minimum_artifacts_required: ['Trace-complete feasibility evidence.'],
      },
      budget_envelope: {
        ...(this.iterationBudgetRef
          ? { iteration_budget_ref: ref('iteration_budget', 'llm_invented_budget_t143') }
          : {}),
        retry_budget: 0,
        max_runtime: 'PT4H',
        max_compute: 'local_cpu',
        max_human_review_count: 1,
      },
      included_context_refs: [targetRef],
      trace_refs: [ref('trace_manifest', 'trace_board_t142')],
      confirmatory_marker: this.confirmatoryCandidate,
      blocker_codes: [],
      warning_codes: [],
    };
    const alternativeCandidate: PaperImplementationValidationCycleCandidateProposal = {
      ...selectedCandidate,
      candidate_key: 'cycle_candidate_alternative_t144',
      target_ref: targetRef,
      validation_question: 'Can a smaller diagnostic check reduce the same uncertainty?',
      expected_information_gain: 'medium',
      confirmatory_marker: false,
    };
    const roleArtifactRef = ref('paper_implementation_runtime_artifact', 'cycle_role_artifact_t144');
    const rolePromptPacketRef = ref('paper_implementation_prompt_packet', 'cycle_prompt_packet_t144');
    const roleBudgetGateRef = ref('paper_implementation_token_budget_gate', 'cycle_budget_gate_t144');
    const artifactPayload: PaperImplementationValidationCyclePlanningArtifact = {
      status: 'passed',
      slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      workflow_type: 'validation_cycle_planning',
      target_ref: targetRef,
      preflight_blockers: [],
      role_summary: 'Two bounded cycle candidates were compared.',
      role_blocker_codes: [],
      role_warning_codes: [],
      blockers: [],
      warnings: [],
      runtime_failure_code: null,
      reviewed_route_proposal_ref: ref('paper_implementation_runtime_artifact', 'route_artifact_t142'),
      reviewed_route_proposal_hash: sha256Text('route_artifact_t142'),
      reviewed_route_skeptic_artifact_ref: ref('paper_implementation_runtime_artifact', 'skeptic_artifact_t142'),
      reviewed_route_skeptic_artifact_hash: sha256Text('skeptic_artifact_t142'),
      reviewed_candidate_keys: ['route_candidate_t142'],
      cycle_candidate_proposals: [selectedCandidate, alternativeCandidate],
      no_domain_gate_request: true,
      no_queue_side_effect: true,
      no_validation_cycle_side_effect: true,
      role_artifact_refs: [roleArtifactRef],
      role_artifact_hashes: [sha256Text('cycle_role_artifact_t144')],
      admitted_role_artifact_refs: [roleArtifactRef],
      admitted_role_artifact_hashes: [sha256Text('cycle_role_artifact_t144')],
      role_prompt_packet_refs: [rolePromptPacketRef],
      role_prompt_packet_hashes: [sha256Text('cycle_prompt_packet_t144')],
      role_token_budget_gate_result_refs: [roleBudgetGateRef],
      role_compression_report_refs: [],
      runtime_identity: {},
      cache_identity: {},
      source_refs: [targetRef],
      source_hash_bundle_hash: sha256Text('cycle_source_bundle_t144'),
    };
    let persistedPayload: Record<string, unknown> = { ...artifactPayload };
    if (this.artifactPayloadDrift === 'missing_candidates') {
      const { cycle_candidate_proposals: _omitted, ...withoutCandidates } = artifactPayload;
      persistedPayload = withoutCandidates;
    } else if (this.artifactPayloadDrift === 'extra_field') {
      persistedPayload = { ...artifactPayload, unexpected_authority_field: true };
    }
    const hash = sha256Text(stableStringify(persistedPayload));
    const finalArtifactRef = ref(
      'validation_cycle_planning_runtime_artifact',
      `${this.run.coordinator_run_id}.final`,
      hash,
    );
    this.runtime.artifact = {
      ...buildFinalRuntimeArtifactEnvelope({
        implementationProjectId: PROJECT_ID,
        workflowType: 'validation_cycle_planning',
        runtimeArtifactId: 'runtime_artifact_cycle_t142',
        titleCardId: TITLE_CARD_ID,
      }),
      slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      target_ref: targetRef,
      target_version_id: BOARD_ID,
      artifact_payload_ref: finalArtifactRef,
      final_artifact_ref: finalArtifactRef,
      run_mode: 'product',
      execution_mode: 'provider_llm',
      model_profile_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_PROFILE_ID,
      runtime_status: 'passed',
      source_hash_bundle_hash: artifactPayload.source_hash_bundle_hash,
      source_refs: [targetRef],
      source_hashes: [sha256Text(stableStringify(targetRef))],
      artifact_payload: persistedPayload,
      artifact_payload_hash: hash,
      final_artifact_hash: hash,
      output_hash: hash,
    };
    const selectedStep: PaperImplementationCoordinatorRunWithSteps['steps'][number] = {
      schema_version: 'PaperImplementationCoordinatorStep@v1', coordinator_step_id: 'step_cycle_t142',
      coordinator_run_id: this.run.coordinator_run_id, implementation_project_id: PROJECT_ID,
      step_index: 2, slot_id: PAPER_IMPLEMENTATION_VALIDATION_CYCLE_PLANNING_SLOT_ID,
      node_attempt_id: 'attempt_cycle_t142',
      runtime_artifact_ref: finalArtifactRef,
      runtime_artifact_hash: hash, runtime_artifact_id: this.runtime.artifact.runtime_artifact_id,
      admission_ref: {
        ref_type: 'paper_implementation_runtime_admission_record',
        ref_id: 'admission_cycle_t142',
        title_card_id: null,
        version_id: null,
      },
      decision_record: {
        policy_id: 'paper-implementation.coordinator.candidate-selection', policy_version: 'v1', inputs_hash: 'inputs_t142',
        candidate_projections: [
          { candidate_key: 'cycle_candidate_t142', expected_information_gain: 'high', blocker_codes: [] },
          {
            candidate_key: 'cycle_candidate_alternative_t144',
            expected_information_gain: 'medium',
            blocker_codes: [],
          },
        ],
        selected_candidate_key: 'cycle_candidate_t142', rationale_codes: ['max_expected_information_gain'],
      },
      outcome: 'passed', provider_call_count: 1, blocker_codes: [], created_at: NOW,
    };
    this.steps = this.duplicateSelectedStep
      ? [selectedStep, {
        ...structuredClone(selectedStep),
        coordinator_step_id: 'step_cycle_duplicate_t143',
        node_attempt_id: 'attempt_cycle_duplicate_t143',
        step_index: selectedStep.step_index + 1,
      }]
      : [selectedStep];
    this.run = { ...this.run, run_status: 'completed', consumed: { steps: 4, provider_calls: 4 }, updated_at: NOW };
    return this.getCoordinatorRun();
  }
}

async function makeHarness(options: {
  failFirstAdmission?: boolean;
  blockAdmission?: boolean;
  coordinatorStop?: CoordinatorStop;
  driftCandidate?: boolean;
  confirmatoryCandidate?: boolean;
  iterationBudgetRef?: boolean;
  duplicateSelectedStep?: boolean;
  coordinatorRunDrift?: CoordinatorRunDrift;
  artifactPayloadDrift?: PlanningArtifactPayloadDrift;
  ownerTraceDrift?: 'board' | 'binding';
  missingProject?: boolean;
  ownerDrift?: 'motive' | 'version' | 'state' | 'board' | 'binding';
} = {}) {
  const owner = owners();
  if (options.ownerDrift) {
    owner[options.ownerDrift].implementation_project_id = 'implementation_project_owner_drift';
  }
  const validationRepository = new InMemoryPaperImplementationValidationRepository();
  const traces = new Map([
    ['trace_board_t142', completeTrace(
      'trace_board_t142',
      ref(
        'motive_evidence_board_version',
        options.ownerTraceDrift === 'board' ? 'board_trace_owner_drift_t143' : BOARD_ID,
      ),
    )],
    ['trace_binding_t142', completeTrace(
      'trace_binding_t142',
      ref('evidence_binding', options.ownerTraceDrift === 'binding' ? 'binding_trace_owner_drift_t143' : BINDING_ID),
    )],
  ]);
  const runtime = new RuntimeReader();
  const coordinator = new Coordinator(
    runtime,
    options.coordinatorStop,
    options.driftCandidate,
    options.confirmatoryCandidate,
    options.iterationBudgetRef,
    options.duplicateSelectedStep,
    options.coordinatorRunDrift,
    options.artifactPayloadDrift,
  );
  let createCalls = 0;
  let admitCalls = 0;
  let failNextAdmission = options.failFirstAdmission === true;
  const cycleWriter = {
    createValidationCycleDraft: async (_projectId: string, request: CreateValidationCycleDraftRequest) => {
      createCalls += 1;
      const context = {
        ...request.context,
        implementation_project_id: PROJECT_ID,
        created_by: request.created_by ?? 'system',
        created_at: NOW,
      } as ValidationCycleInputSnapshot;
      const cycle: ValidationCycle = {
        validation_cycle_id: request.validation_cycle_id!, implementation_project_id: PROJECT_ID,
        input_snapshot_id: context.input_snapshot_id, target: request.target, trigger: request.trigger,
        cycle_type: request.cycle_type, validation_frame: request.validation_frame, context,
        criteria: request.criteria, budget: request.budget, lifecycle_status: 'proposed', execution_status: 'not_started',
        outputs: {
          evidence_unit_refs: [], evidence_binding_refs: [], board_update_refs: [], route_update_refs: [],
          work_order_result_refs: [], result_interpretation_packet_refs: [], quality_signal_refs: [],
          recommended_evolution_decision_refs: [],
        },
        cycle_assessment: null, trace_manifest_ref: null, trace_manifest_id: null, gate_result_id: null,
        decision_exit: null, confirmation_level: request.confirmation_level ?? 'not_required', confirmed_by: null,
        policy_version_id: request.policy_version_id ?? null,
        source_proposal_artifact_ref: request.source_proposal_artifact_ref ?? null,
        source_proposal_artifact_hash: request.source_proposal_artifact_hash ?? null,
        created_by: 'system', created_at: NOW, updated_at: NOW, admitted_at: null, completed_at: null,
      };
      await validationRepository.createValidationCycleDraft({ input_snapshot: context, validation_cycle: cycle });
      return cycle;
    },
    admitValidationCycle: async (_projectId: string, cycleId: string, request: { trace_manifest_id: string; gate_result_id?: string | null }) => {
      admitCalls += 1;
      if (options.blockAdmission) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'The selected cycle failed the admission gate.');
      }
      if (failNextAdmission) {
        failNextAdmission = false;
        throw new Error('simulated admission interruption');
      }
      const cycle = await validationRepository.findValidationCycleById(PROJECT_ID, cycleId);
      assert.ok(cycle);
      const admitted: ValidationCycle = {
        ...cycle, lifecycle_status: 'admitted', trace_manifest_id: request.trace_manifest_id,
        trace_manifest_ref: ref('trace_manifest', request.trace_manifest_id),
        gate_result_id: request.gate_result_id ?? null, admitted_at: NOW, updated_at: NOW,
      };
      return validationRepository.updateValidationCycle(admitted);
    },
  };
  const serviceOptions = {
    projectRepository: {
      findProjectById: async () => options.missingProject ? null : ({
        implementation_project_id: PROJECT_ID, intake_snapshot_id: 'intake_t142', workspace_id: 'workspace_t142',
        title_card_id: TITLE_CARD_ID, paper_project_bridge_id: 'bridge_t142', bridge_payload_hash: 'bridge_hash_t142',
        lifecycle_status: 'active', freshness_status: 'fresh', source_status: 'active', version_number: 1,
        policy_version_id: 'policy_t142', created_by: 'system', created_at: NOW, updated_at: NOW,
      }),
      findIntakeSnapshotByProjectId: async () => ({
        intake_snapshot_id: 'intake_t142', implementation_project_id: PROJECT_ID, workspace_id: 'workspace_t142',
        title_card_id: TITLE_CARD_ID, paper_project_bridge_id: 'bridge_t142',
        paper_project_bridge_ref: ref('paper_project_bridge', 'bridge_t142'), bridge_payload_hash: 'bridge_hash_t142',
        promotion_decision_id: 'promotion_t142', promotion_decision_ref: ref('promotion_decision', 'promotion_t142'),
        promotion_commitment_profile_id: 'profile_t142', promotion_commitment_profile_ref: ref('profile', 'profile_t142'),
        promotion_input_snapshot_id: 'promotion_input_t142', promotion_input_snapshot_ref: ref('snapshot', 'promotion_input_t142'),
        promotion_input_snapshot_hash: 'promotion_input_hash_t142', topic_package_id: 'topic_t142', package_version: 'v1',
        source_status: 'active', snapshot_hashes: {
          bundle_hash: 'bundle_t142', package_snapshot_hash: 'package_t142',
          package_draft_input_snapshot_hash: 'draft_t142', promotion_input_snapshot_hash: 'promotion_input_hash_t142',
        },
        source_refs: [ref('evidence_unit', EVIDENCE_ID, 'v1')], accepted_risk_refs: [], condition_refs: [],
        early_check_obligations: ['Keep the result claim bounded.'],
        working_copy_payload: {
          editable_title: 'Bounded validation', problem_statement: 'A controlled route is needed.',
          contribution_summary: 'One bounded comparison.', evaluation_plan: 'Run a controlled comparison.',
          initial_planning_notes: [], claim_ceiling: 'Only the admitted benchmark.', prohibited_claims: ['No universal claim.'],
          conditions: [], accepted_risk_refs: [], early_check_obligations: ['Keep the result claim bounded.'],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_t142', source_handoff: {} as never,
        intake_snapshot_hash: 'intake_hash_t142', policy_version_id: 'policy_t142', created_by: 'system', created_at: NOW,
      }),
    } as never,
    motiveRepository: {
      findMotiveSet: async () => owner.set,
      findMotiveIdentityById: async () => owner.motive,
      findCoreMotiveVersionById: async () => owner.version,
      findMotiveVersionStateByVersionId: async () => owner.state,
      listAssertionsByVersion: async () => [owner.assertion],
      findMotiveEvidenceBoardById: async () => owner.board,
      findEvidenceBindingById: async () => owner.binding,
    } as never,
    validationRepository,
    runtimeRepository: runtime,
    traceKernel: {
      getTraceManifest: async (_projectId: string, traceId: string) => {
        const trace = traces.get(traceId);
        if (!trace) throw new AppError(404, 'NOT_FOUND', 'trace missing');
        return structuredClone(trace);
      },
      ensureTraceManifest: async (_projectId: string, traceId: string, request: { target_ref: TopicSelectionFunctionalRef; lineage: TraceLineageBundle }) => {
        const existing = traces.get(traceId);
        if (existing) return { manifest: structuredClone(existing), created: false };
        const trace: TraceManifest = {
          ...completeTrace(traceId), target_ref: request.target_ref, lineage: request.lineage,
        };
        traces.set(traceId, trace);
        return { manifest: structuredClone(trace), created: true };
      },
    } as never,
    cycleWriter: cycleWriter as never,
    coordinator: coordinator as never,
  };
  const service = new PaperImplementationValidationCycleHandoffService(serviceOptions);
  return {
    service, validationRepository, coordinator,
    cloneService: () => new PaperImplementationValidationCycleHandoffService(serviceOptions),
    createCalls: () => createCalls, admitCalls: () => admitCalls, traceCount: () => traces.size,
    seedLegacyCycle: async (seed: {
      cycleId?: string;
      lifecycleStatus?: ValidationCycle['lifecycle_status'];
      createdAt?: string;
      traceTargetRef?: TopicSelectionFunctionalRef;
    } = {}) => {
      const cycleId = seed.cycleId ?? 'legacy_validation_cycle_t142';
      const createdAt = seed.createdAt ?? NOW;
      const lifecycleStatus = seed.lifecycleStatus ?? 'admitted';
      const traceId = `trace_${cycleId}`;
      const context: ValidationCycleInputSnapshot = {
        input_snapshot_id: `input_${cycleId}`, implementation_project_id: PROJECT_ID,
        context_policy_version_id: 'legacy_policy',
        included_refs: {
          motive_version_refs: [ref('core_motive_version', VERSION_ID, '1')],
          board_version_refs: [ref('motive_evidence_board_version', BOARD_ID)],
          evidence_refs: [ref('evidence_unit', EVIDENCE_ID, 'v1')], route_refs: [], work_order_refs: [],
          result_packet_refs: [], experiment_plan_light_refs: [],
        },
        excluded_context_notes: [], input_snapshot_hash: 'legacy_input_hash_t142',
        created_by: 'system', created_at: createdAt,
      };
      const cycle: ValidationCycle = {
        validation_cycle_id: cycleId, implementation_project_id: PROJECT_ID,
        input_snapshot_id: context.input_snapshot_id,
        target: { target_type: 'motive_evidence_board', target_id: BOARD_ID },
        trigger: { trigger_type: 'human_request', trigger_refs: [ref('motive_evidence_board', BOARD_ID)] },
        cycle_type: 'route_feasibility',
        validation_frame: {
          validation_question: 'Can the existing bounded route proceed?', assumptions_under_test: ['Controls exist.'],
          assertions_under_test: [ref('motive_assertion', ASSERTION_ID)], decision_if_pass: 'Proceed.',
          decision_if_fail: 'Stop.', decision_if_inconclusive: 'Review.', expected_information_gain: 'medium',
          why_this_cycle_now: 'Existing authority already admitted the cycle.',
        },
        context,
        criteria: {
          pass_conditions: ['Route is viable.'], fail_conditions: ['Route is not viable.'],
          inconclusive_conditions: ['Unknown.'], stop_conditions: ['Stop after check.'],
          minimum_artifacts_required: ['Trace.'],
        },
        budget: { budget_id: 'legacy_budget_t142', retry_budget: 0 },
        lifecycle_status: lifecycleStatus, execution_status: lifecycleStatus === 'completed' ? 'completed' : 'not_started',
        outputs: {
          evidence_unit_refs: [], evidence_binding_refs: [], board_update_refs: [], route_update_refs: [],
          work_order_result_refs: [], result_interpretation_packet_refs: [], quality_signal_refs: [],
          recommended_evolution_decision_refs: [],
        },
        cycle_assessment: null, trace_manifest_ref: ref('trace_manifest', traceId),
        trace_manifest_id: traceId, gate_result_id: `gate_${cycleId}`,
        decision_exit: null, confirmation_level: 'not_required', confirmed_by: null,
        policy_version_id: 'legacy_validation_policy', source_proposal_artifact_ref: null,
        source_proposal_artifact_hash: null, created_by: 'system', created_at: createdAt, updated_at: createdAt,
        admitted_at: createdAt, completed_at: lifecycleStatus === 'completed' ? createdAt : null,
      };
      traces.set(
        cycle.trace_manifest_id!,
        completeTrace(
          cycle.trace_manifest_id!,
          seed.traceTargetRef ?? ref('validation_cycle', cycle.validation_cycle_id),
        ),
      );
      await validationRepository.createValidationCycleDraft({ input_snapshot: context, validation_cycle: cycle });
    },
  };
}

test('ValidationCycle handoff persists one selected admitted cycle and replays without another LLM run', async () => {
  const harness = await makeHarness();
  const command = { implementation_project_id: PROJECT_ID };

  const first = await harness.service.continue(command);
  assert.equal(first.status, 'created');
  assert.equal(first.semantic_stage, 'validation_cycle_ready');
  assert.equal(first.semantic_context.validation_cycle?.lifecycle_status, 'admitted');
  assert.deepEqual(first.effects.performed, [
    'coordinator_run', 'validation_planning_artifacts', 'trace_manifest', 'validation_cycle',
  ]);
  assert.equal(first.next_action.action, 'continue_experiment_specification');
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  const coordinatorRun = await harness.coordinator.getCoordinatorRun();
  assert.deepEqual(Object.keys(coordinatorRun.run.slot_request_payloads).sort(), [
    'feasibility_planning.probe_plan_candidates',
    'route_architecture.route_candidates',
    'route_skeptic_review.route_risk_critique',
    'validation_cycle_planning.cycle_candidates',
  ]);
  for (const payload of Object.values(coordinatorRun.run.slot_request_payloads)) {
    assert.equal('run_id' in payload, false);
    assert.equal('run_mode' in payload, false);
    assert.equal('execution_mode' in payload, false);
    assert.equal('admitted_route_proposal_artifact_ref' in payload, false);
    const packets = payload.source_context_packets as Array<{ key_facts: string[] }>;
    assert.ok(packets[0]?.key_facts.some((fact) => fact.startsWith('maximum_allowed_claim=')));
    assert.ok(packets[0]?.key_facts.some((fact) => fact.startsWith(`required_assertion=${ASSERTION_ID}:`)));
  }

  const replay = await harness.service.continue(command);
  assert.equal(replay.status, 'resumed');
  assert.deepEqual(replay.lineage, first.lineage);
  assert.deepEqual(replay.effects.performed, []);
  assert.deepEqual(replay.effects.reused, [
    'coordinator_run', 'validation_planning_artifacts', 'trace_manifest', 'validation_cycle',
  ]);
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID)).length, 1);
  assert.equal(harness.createCalls(), 1);
  assert.equal(harness.admitCalls(), 1);
  assert.equal(harness.traceCount(), 3);
  const downstream = resolvePaperImplementationScientificContinuationStage({
    implementation_project_id: PROJECT_ID,
    project_lifecycle_status: 'active',
    has_admitted_motive: true,
    coordinator_runs: [{
      coordinator_run_id: first.lineage.coordinator_run_id!,
      lane_id: 'validation-planning',
      run_status: 'completed',
    }],
    active_validation_cycle_count: 1,
    validation_cycle_id: first.lineage.validation_cycle_id,
    validation_cycle_status: 'admitted',
    experiment: null,
    closure_id: null,
    result_packet_id: null,
    claim_id: null,
    claim_requires_human_confirmation: false,
    dossier_id: null,
    dossier_status: null,
    dossier_trace_status: null,
  });
  assert.equal(downstream.response.status, 'waiting_for_experiment_specification');
  assert.equal(downstream.response.semantic_stage, 'experiment_specification');
  assert.equal(downstream.automatic_action, null);
});

test('ValidationCycle handoff resumes a persisted proposed cycle after admission interruption', async () => {
  const harness = await makeHarness({ failFirstAdmission: true });
  const command = { implementation_project_id: PROJECT_ID };

  await assert.rejects(harness.service.continue(command), /simulated admission interruption/);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID))[0]?.lifecycle_status, 'proposed');

  const resumed = await harness.service.continue(command);
  assert.equal(resumed.status, 'resumed');
  assert.equal(resumed.semantic_context.validation_cycle?.lifecycle_status, 'admitted');
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal(harness.createCalls(), 1);
  assert.equal(harness.admitCalls(), 2);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID)).length, 1);
});

test('concurrent ValidationCycle handoffs converge within one service instance', async () => {
  const harness = await makeHarness();
  const responses = await Promise.all([
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
  ]);
  assert.deepEqual(responses[0], responses[1]);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID)).length, 1);
});

test('separate ValidationCycle handoff instances converge through shared durable authority', async () => {
  const harness = await makeHarness();
  const secondService = harness.cloneService();
  const responses = await Promise.all([
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
    secondService.continue({ implementation_project_id: PROJECT_ID }),
  ]);
  const ready = responses.find((response) => response.semantic_stage === 'validation_cycle_ready');
  const waiting = responses.find((response) => response.status === 'waiting_for_llm');
  assert.ok(ready?.lineage.validation_cycle_id);
  assert.equal(waiting?.blocker?.code, 'VALIDATION_PLANNING_IN_PROGRESS');
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID)).length, 1);

  const replay = await secondService.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(replay.lineage.validation_cycle_id, ready.lineage.validation_cycle_id);
  assert.equal(replay.status, 'resumed');
});

test('ValidationCycle handoff reuses existing admitted authority without starting an LLM run', async () => {
  const harness = await makeHarness();
  await harness.seedLegacyCycle();

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'resumed');
  assert.equal(response.lineage.validation_cycle_id, 'legacy_validation_cycle_t142');
  assert.equal(response.lineage.coordinator_run_id, null);
  assert.deepEqual(response.effects.reused, ['trace_manifest', 'validation_cycle']);
  assert.equal(harness.coordinator.createCalls, 0);
  assert.equal(harness.coordinator.advanceCalls, 0);
});

test('ValidationCycle handoff deterministically reuses the newest completed owner cycle', async () => {
  const harness = await makeHarness();
  await harness.seedLegacyCycle({
    cycleId: 'legacy_completed_old_t142',
    lifecycleStatus: 'completed',
    createdAt: '2026-08-22T00:00:00.000Z',
  });
  await harness.seedLegacyCycle({
    cycleId: 'legacy_completed_new_t142',
    lifecycleStatus: 'completed',
    createdAt: '2026-08-23T00:00:00.000Z',
  });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.lineage.validation_cycle_id, 'legacy_completed_new_t142');
  assert.equal(harness.coordinator.createCalls, 0);
  assert.equal(harness.coordinator.advanceCalls, 0);
});

test('ValidationCycle handoff returns a semantic cycle-write blocker when T-095 admission rejects', async () => {
  const harness = await makeHarness({ blockAdmission: true });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'cycle_write');
  assert.equal(response.blocker?.code, 'VALIDATION_CYCLE_ADMISSION_BLOCKED');
  assert.equal(response.blocker?.source, 'domain');
  assert.equal(response.next_action.action, 'resolve_blocker');
  assert.equal(response.semantic_context.validation_cycle?.lifecycle_status, 'proposed');
  assert.ok(response.lineage.trace_manifest_id);
  assert.deepEqual(response.effects.performed, [
    'coordinator_run', 'validation_planning_artifacts', 'trace_manifest', 'validation_cycle',
  ]);
});

test('ValidationCycle handoff reports unresolved owner eligibility before planning', async () => {
  for (const ownerDrift of ['motive', 'version', 'state', 'board'] as const) {
    const harness = await makeHarness({ ownerDrift });
    const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
    assert.equal(response.status, 'blocked', ownerDrift);
    assert.equal(response.semantic_stage, 'owner_resolution', ownerDrift);
    assert.equal(response.blocker?.source, 'owner_state', ownerDrift);
    assert.equal(response.next_action.action, 'resolve_blocker', ownerDrift);
    assert.equal(response.semantic_context.admitted_core_motive, null, ownerDrift);
    assert.equal(response.lineage.core_motive_version_id, null, ownerDrift);
    assert.equal(harness.coordinator.createCalls, 0);
  }
});

test('ValidationCycle handoff rejects immutable EvidenceBinding owner drift before planning', async () => {
  const harness = await makeHarness({ ownerDrift: 'binding' });
  await assert.rejects(
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(harness.coordinator.createCalls, 0);
});

test('ValidationCycle handoff reports coordinator review, provider, and domain stops truthfully', async () => {
  const reviewHarness = await makeHarness({ coordinatorStop: 'waiting_review' });
  const review = await reviewHarness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(review.status, 'waiting_for_human_confirmation');
  assert.equal(review.next_action.action, 'provide_human_confirmation');
  assert.equal(review.blocker?.code, 'VALIDATION_PLANNING_REVIEW_REQUIRED');

  const providerHarness = await makeHarness({ coordinatorStop: 'failed_runtime' });
  const provider = await providerHarness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(provider.status, 'waiting_for_llm');
  assert.equal(provider.next_action.action, 'configure_llm');
  assert.equal(provider.blocker?.source, 'provider');

  const domainHarness = await makeHarness({ coordinatorStop: 'blocked' });
  const domain = await domainHarness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(domain.status, 'blocked');
  assert.equal(domain.next_action.action, 'resolve_blocker');
  assert.equal(domain.blocker?.source, 'domain');
  assert.deepEqual(await domainHarness.validationRepository.listValidationCycles(PROJECT_ID), []);
});

test('ValidationCycle handoff rejects a selected proposal whose target drifts from owner state', async () => {
  const harness = await makeHarness({ driftCandidate: true });
  await assert.rejects(
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.deepEqual(await harness.validationRepository.listValidationCycles(PROJECT_ID), []);
});

test('ValidationCycle handoff rejects hash-consistent planning artifacts outside the persisted schema', async () => {
  for (const artifactPayloadDrift of ['missing_candidates', 'extra_field'] as const) {
    const harness = await makeHarness({ artifactPayloadDrift });
    await assert.rejects(
      harness.service.continue({ implementation_project_id: PROJECT_ID }),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'VERSION_CONFLICT',
      artifactPayloadDrift,
    );
    assert.deepEqual(
      await harness.validationRepository.listValidationCycles(PROJECT_ID),
      [],
      artifactPayloadDrift,
    );
    assert.equal(harness.createCalls(), 0, artifactPayloadDrift);
    assert.equal(harness.admitCalls(), 0, artifactPayloadDrift);
    assert.equal(harness.traceCount(), 2, artifactPayloadDrift);
  }
});

test('ValidationCycle handoff stops a confirmatory proposal before trace or cycle authority is written', async () => {
  const harness = await makeHarness({ confirmatoryCandidate: true });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'waiting_for_human_confirmation');
  assert.equal(response.semantic_stage, 'cycle_write');
  assert.equal(response.blocker?.code, 'VALIDATION_CYCLE_CONFIRMATORY_REVIEW_REQUIRED');
  assert.equal(response.next_action.action, 'provide_human_confirmation');
  assert.equal(response.next_action.requires_human_confirmation, true);
  assert.equal(response.lineage.validation_cycle_id, null);
  assert.deepEqual(response.effects.performed, ['coordinator_run', 'validation_planning_artifacts']);
  assert.deepEqual(await harness.validationRepository.listValidationCycles(PROJECT_ID), []);
  assert.equal(harness.createCalls(), 0);
  assert.equal(harness.admitCalls(), 0);
  assert.equal(harness.traceCount(), 2);
});

test('ValidationCycle handoff never persists an unresolved model-authored iteration budget id', async () => {
  const harness = await makeHarness({ iterationBudgetRef: true });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  const cycle = await harness.validationRepository.findValidationCycleById(
    PROJECT_ID,
    response.lineage.validation_cycle_id!,
  );
  assert.ok(cycle);
  assert.equal(cycle.budget.iteration_budget_id, null);
  assert.notEqual(cycle.budget.budget_id, 'llm_invented_budget_t143');
});

test('ValidationCycle handoff resumes a retryable provider stop through the same deterministic run', async () => {
  const harness = await makeHarness({ coordinatorStop: 'failed_runtime_once' });
  const command = { implementation_project_id: PROJECT_ID };

  const waiting = await harness.service.continue(command);
  assert.equal(waiting.status, 'waiting_for_llm');
  assert.equal(waiting.blocker?.retryable, true);
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 1);

  const resumed = await harness.service.continue(command);
  assert.equal(resumed.status, 'created');
  assert.equal(resumed.semantic_stage, 'validation_cycle_ready');
  assert.equal(harness.coordinator.createCalls, 1);
  assert.equal(harness.coordinator.advanceCalls, 2);
  assert.equal((await harness.validationRepository.listValidationCycles(PROJECT_ID)).length, 1);
});

test('ValidationCycle handoff does not advertise terminal or budget-exhausted coordinator runs as retryable', async () => {
  for (const coordinatorStop of ['terminal_failed', 'budget_exhausted'] as const) {
    const harness = await makeHarness({ coordinatorStop });
    const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
    assert.equal(response.status, 'blocked', coordinatorStop);
    assert.equal(response.next_action.action, 'resolve_blocker', coordinatorStop);
    assert.equal(response.blocker?.retryable, false, coordinatorStop);
    assert.equal(
      response.blocker?.code,
      coordinatorStop === 'terminal_failed'
        ? 'VALIDATION_PLANNING_TERMINAL_FAILED'
        : 'VALIDATION_PLANNING_BUDGET_EXHAUSTED',
      coordinatorStop,
    );
  }
});

test('ValidationCycle handoff rejects deterministic coordinator authority drift before advance', async () => {
  for (const coordinatorRunDrift of [
    'implementation_project_id', 'execution_mode', 'model_option_id', 'budget_envelope',
  ] as const) {
    const harness = await makeHarness({ coordinatorRunDrift });
    await assert.rejects(
      harness.service.continue({ implementation_project_id: PROJECT_ID }),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'VERSION_CONFLICT',
      coordinatorRunDrift,
    );
    assert.equal(harness.coordinator.advanceCalls, 0, coordinatorRunDrift);
  }
});

test('ValidationCycle handoff rejects ambiguous selected coordinator steps', async () => {
  const harness = await makeHarness({ duplicateSelectedStep: true });
  await assert.rejects(
    harness.service.continue({ implementation_project_id: PROJECT_ID }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.deepEqual(await harness.validationRepository.listValidationCycles(PROJECT_ID), []);
});

test('ValidationCycle handoff returns a semantic owner blocker for a missing project root', async () => {
  const harness = await makeHarness({ missingProject: true });

  const response = await harness.service.continue({ implementation_project_id: PROJECT_ID });
  assert.equal(response.status, 'blocked');
  assert.equal(response.semantic_stage, 'owner_resolution');
  assert.equal(response.blocker?.code, 'VALIDATION_CYCLE_OWNER_NOT_FOUND');
  assert.equal(response.blocker?.source, 'owner_state');
  assert.equal(response.blocker?.retryable, false);
  assert.equal(response.semantic_context.admitted_core_motive, null);
  assert.equal(response.semantic_context.evidence_board, null);
  assert.equal(response.lineage.implementation_project_id, PROJECT_ID);
  assert.equal(response.lineage.intake_snapshot_id, null);
  assert.equal(harness.coordinator.createCalls, 0);
});

test('ValidationCycle handoff rejects board, binding, and cycle trace owner drift', async () => {
  for (const ownerTraceDrift of ['board', 'binding'] as const) {
    const harness = await makeHarness({ ownerTraceDrift });
    await assert.rejects(
      harness.service.continue({ implementation_project_id: PROJECT_ID }),
      (error) => error instanceof AppError
        && error.statusCode === 409
        && error.errorCode === 'VERSION_CONFLICT',
      ownerTraceDrift,
    );
  }

  const cycleHarness = await makeHarness();
  await cycleHarness.seedLegacyCycle({
    traceTargetRef: ref('validation_cycle', 'different_validation_cycle_t143'),
  });
  await assert.rejects(
    cycleHarness.service.continue({ implementation_project_id: PROJECT_ID }),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
});
