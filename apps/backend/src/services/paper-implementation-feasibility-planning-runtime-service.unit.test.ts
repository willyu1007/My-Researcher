import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  type PaperImplementationFeasibilityPlanningRoleOutput,
  type PaperImplementationFeasibilityProbePlanCandidateProposal,
  type RunPaperImplementationFeasibilityPlanningRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationFeasibilityPlanningRuntimeService } from './paper-implementation-feasibility-planning-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_feasibility_planning_runtime_001';
const TITLE_CARD_ID = 'title_card_feasibility_planning_runtime_001';
const NOW = '2026-06-07T10:00:00.000Z';

type Outcome =
  | 'passed'
  | 'schema_failed'
  | 'incomplete_candidates'
  | 'validation_cycle_mismatch'
  | 'route_proposal_mismatch'
  | 'route_skeptic_mismatch'
  | 'cycle_candidate_key_mismatch'
  | 'route_candidate_key_mismatch'
  | 'high_cost_open_baseline';

class StubFeasibilityPlanningAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    input_refs?: TopicSelectionFunctionalRef[];
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(private readonly outcomes: Outcome[] = ['passed']) {}

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      executor_kind: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      input_refs?: TopicSelectionFunctionalRef[];
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_candidates') {
      return invocationResult(feasibilityPlanningRoleOutput({
        probe_plan_candidate_proposals: [feasibilityProbePlanCandidateProposal('single_probe_plan_candidate', false)],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'validation_cycle_mismatch') {
      return invocationResult(feasibilityPlanningRoleOutput({
        reviewed_validation_cycle_artifact_hash: hash('drifted-validation-cycle-final'),
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'route_proposal_mismatch') {
      return invocationResult(feasibilityPlanningRoleOutput({
        reviewed_route_proposal_hash: hash('drifted-route-architecture-final'),
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'route_skeptic_mismatch') {
      return invocationResult(feasibilityPlanningRoleOutput({
        reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'drifted_route_skeptic_final_001'),
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'cycle_candidate_key_mismatch') {
      return invocationResult(feasibilityPlanningRoleOutput({
        probe_plan_candidate_proposals: [
          {
            ...feasibilityProbePlanCandidateProposal('exploratory_probe_plan_candidate', false),
            reviewed_cycle_candidate_key: 'drifted_cycle_candidate',
          },
          feasibilityProbePlanCandidateProposal('confirmatory_probe_plan_candidate', true),
        ],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'route_candidate_key_mismatch') {
      return invocationResult(feasibilityPlanningRoleOutput({
        probe_plan_candidate_proposals: [
          {
            ...feasibilityProbePlanCandidateProposal('exploratory_probe_plan_candidate', false),
            reviewed_route_candidate_key: 'drifted_route_candidate',
          },
          feasibilityProbePlanCandidateProposal('confirmatory_probe_plan_candidate', true),
        ],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'high_cost_open_baseline') {
      return invocationResult(feasibilityPlanningRoleOutput({
        probe_plan_candidate_proposals: [
          feasibilityProbePlanCandidateProposal('exploratory_probe_plan_candidate', false),
          {
            ...feasibilityProbePlanCandidateProposal('confirmatory_probe_plan_candidate', true),
            baseline_gap_status: 'open',
            budget_envelope: {
              ...feasibilityProbePlanCandidateProposal('confirmatory_probe_plan_candidate', true).budget_envelope,
              estimated_cost_class: 'high',
            },
          },
        ],
      }) as T, input.node_id, input.execution_mode);
    }
    return invocationResult(feasibilityPlanningRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('feasibility planning runtime records proposal-only artifacts without probe, plan-light, cycle, queue, or Domain Gate writes', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed']);
  const result = await service.runProbePlanCandidates(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID);
  assert.equal(result.workflow_type, 'feasibility_planning');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /feasibility candidate planning/);
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], providerRequest().admitted_validation_cycle_artifact_ref),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], providerRequest().admitted_route_proposal_artifact_ref),
    true,
  );
  assert.equal(
    includesRef(orchestrator.calls[0]?.input_refs ?? [], providerRequest().admitted_route_skeptic_artifact_ref),
    true,
  );
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.probe_plan_candidate_proposals as unknown[] | undefined)?.length,
    2,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_feasibility_probe_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_experiment_plan_light_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_validation_cycle_side_effect, true);
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('feasibility_probe_id' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('experiment_plan_light_id' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('create_feasibility_probe_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('create_experiment_plan_light_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal('queue_action' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('create_feasibility_probe_request'), false);
  assert.equal(stableStringify(result).includes('create_experiment_plan_light_request'), false);
});

test('feasibility planning runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const result = await service.runProbePlanCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'feasibility_planning_preflight_blocked_run_001',
    preflight_blocker_codes: ['route_skeptic_artifact_not_admitted'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['route_skeptic_artifact_not_admitted']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('feasibility planning runtime fails closed after same-profile semantic retry exhaustion', async () => {
  const { service, orchestrator } = serviceFixture(['incomplete_candidates', 'incomplete_candidates']);
  const result = await service.runProbePlanCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'feasibility_planning_missing_candidates_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(
    result.runtime_artifacts[0]?.runtime_failure_code,
    'FEASIBILITY_PLANNING_CANDIDATE_SET_INCOMPLETE',
  );
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

for (const scenario of [
  {
    name: 'validation cycle artifact mismatch',
    outcome: 'validation_cycle_mismatch' as const,
    failureCode: 'FEASIBILITY_PLANNING_VALIDATION_CYCLE_MISMATCH',
  },
  {
    name: 'route proposal hash/ref mismatch',
    outcome: 'route_proposal_mismatch' as const,
    failureCode: 'FEASIBILITY_PLANNING_ROUTE_PROPOSAL_MISMATCH',
  },
  {
    name: 'route skeptic artifact mismatch',
    outcome: 'route_skeptic_mismatch' as const,
    failureCode: 'FEASIBILITY_PLANNING_ROUTE_SKEPTIC_MISMATCH',
  },
  {
    name: 'reviewed cycle candidate key mismatch',
    outcome: 'cycle_candidate_key_mismatch' as const,
    failureCode: 'FEASIBILITY_PLANNING_CYCLE_CANDIDATE_KEY_MISMATCH',
  },
  {
    name: 'reviewed route candidate key mismatch',
    outcome: 'route_candidate_key_mismatch' as const,
    failureCode: 'FEASIBILITY_PLANNING_ROUTE_CANDIDATE_KEY_MISMATCH',
  },
  {
    name: 'unblocked high-cost confirmatory open baseline gap',
    outcome: 'high_cost_open_baseline' as const,
    failureCode: 'FEASIBILITY_PLANNING_CONFIRMATORY_BASELINE_GAP_OPEN',
  },
]) {
  test(`feasibility planning runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator } = serviceFixture([scenario.outcome, scenario.outcome]);
    const result = await service.runProbePlanCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: `feasibility_planning_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 2);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('feasibility planning runtime rejects product fixture modes, provider fixtures, and missing primary inputs', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runProbePlanCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'feasibility_planning_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: feasibilityPlanningRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runProbePlanCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'feasibility_planning_provider_fixture_payload_run_001',
      codex_role_outputs: feasibilityPlanningRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runProbePlanCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'feasibility_planning_missing_validation_cycle_run_001',
      admitted_validation_cycle_artifact_ref: null as unknown as TopicSelectionFunctionalRef,
      admitted_validation_cycle_artifact_hash: null as unknown as string,
    }),
    /requires admitted_validation_cycle_artifact_ref/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

function serviceFixture(outcomes?: Outcome[]) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new StubFeasibilityPlanningAgentOrchestrator(outcomes);
  const service = new PaperImplementationFeasibilityPlanningRuntimeService({
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function feasibilityPlanningRoleOutputs():
  RunPaperImplementationFeasibilityPlanningRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID]: feasibilityPlanningRoleOutput(),
  };
}

function providerRequest(): RunPaperImplementationFeasibilityPlanningRuntimeRequest {
  return {
    run_id: 'feasibility_planning_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID}.openai-balanced`,
    target_ref: ref('technical_route_candidate', 'technical_route_candidate_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
      ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
      ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
      ref('trace_manifest', 'trace_manifest_001'),
    ],
    source_hashes: [
      hash('validation-cycle-final'),
      hash('route-architecture-final'),
      hash('route-skeptic-final'),
      hash('trace'),
    ],
    admitted_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
    admitted_validation_cycle_artifact_hash: hash('validation-cycle-final'),
    admitted_route_proposal_artifact_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    admitted_route_proposal_artifact_hash: hash('route-architecture-final'),
    admitted_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    admitted_route_skeptic_artifact_hash: hash('route-skeptic-final'),
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate'],
    secondary_route_candidate_refs: [
      ref('technical_route_candidate', 'technical_route_candidate_secondary_001'),
    ],
    secondary_validation_cycle_refs: [
      ref('validation_cycle', 'validation_cycle_secondary_001'),
    ],
    secondary_feasibility_probe_refs: [
      ref('feasibility_probe', 'feasibility_probe_secondary_001'),
    ],
    secondary_experiment_plan_light_refs: [
      ref('experiment_plan_light', 'experiment_plan_light_secondary_001'),
    ],
    preflight_blocker_codes: [],
  };
}

function feasibilityProbePlanCandidateProposal(
  candidateKey: string,
  confirmatoryMarker: boolean,
): PaperImplementationFeasibilityProbePlanCandidateProposal {
  return {
    candidate_key: candidateKey,
    reviewed_cycle_candidate_key: 'exploratory_cycle_candidate',
    reviewed_route_candidate_key: 'exploratory_route_candidate',
    probe_kind: confirmatoryMarker ? 'baseline_check' : 'data_feasibility',
    probe_question: `Can ${candidateKey} verify feasibility without creating persisted probe state?`,
    plan_summary: `${candidateKey} proposes bounded feasibility evidence for downstream deterministic creation.`,
    expected_information_gain: confirmatoryMarker ? 'medium' : 'high',
    baseline_gap_status: confirmatoryMarker ? 'resolved' : 'open',
    primary_metric_refs: [ref('metric', `metric_${candidateKey}`)],
    dataset_version_refs: [ref('dataset_version', `dataset_version_${candidateKey}`)],
    baseline_version_refs: [ref('baseline_version', `baseline_version_${candidateKey}`)],
    code_version_refs: [ref('code_version', `code_version_${candidateKey}`)],
    config_refs: [ref('config_snapshot', `config_snapshot_${candidateKey}`)],
    budget_envelope: {
      budget_ref: ref('validation_budget', `validation_budget_${candidateKey}`),
      iteration_budget_ref: ref('iteration_budget', `iteration_budget_${candidateKey}`),
      retry_budget: 1,
      estimated_cost_class: confirmatoryMarker ? 'medium' : 'low',
      max_runtime: '2h',
      max_compute: 'single-gpu-smoke',
      max_human_review_count: 1,
    },
    stop_condition_refs: [ref('stop_condition', `stop_condition_${candidateKey}`)],
    trace_refs: [ref('trace_manifest', `trace_manifest_${candidateKey}`)],
    confirmatory_marker: confirmatoryMarker,
    blocker_codes: [],
    warning_codes: [],
  };
}

function feasibilityPlanningRoleOutput(
  overrides: Partial<PaperImplementationFeasibilityPlanningRoleOutput> = {},
): PaperImplementationFeasibilityPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Feasibility planning proposed bounded probe and plan-light candidates.',
    cited_source_refs: [ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001')],
    blocker_codes: [],
    warning_codes: [],
    reviewed_validation_cycle_artifact_ref: ref('validation_cycle_planning_runtime_artifact', 'validation_cycle_final_001'),
    reviewed_validation_cycle_artifact_hash: hash('validation-cycle-final'),
    reviewed_route_proposal_ref: ref('route_architecture_runtime_artifact', 'route_architecture_final_001'),
    reviewed_route_proposal_hash: hash('route-architecture-final'),
    reviewed_route_skeptic_artifact_ref: ref('route_skeptic_review_runtime_artifact', 'route_skeptic_final_001'),
    reviewed_route_skeptic_artifact_hash: hash('route-skeptic-final'),
    reviewed_cycle_candidate_keys: ['exploratory_cycle_candidate'],
    reviewed_route_candidate_keys: ['exploratory_route_candidate'],
    probe_plan_candidate_proposals: [
      feasibilityProbePlanCandidateProposal('exploratory_probe_plan_candidate', false),
      feasibilityProbePlanCandidateProposal('confirmatory_probe_plan_candidate', true),
    ],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_feasibility_probe_side_effect: true,
    no_experiment_plan_light_side_effect: true,
    no_validation_cycle_side_effect: true,
    ...overrides,
  };
}

function invocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult({
    output,
    nodeId,
    executionMode,
    status: 'succeeded',
    errorCode: null,
    blockerCodes: [],
  });
}

function failedInvocationResult<T>(
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  return baseInvocationResult<T>({
    output: null,
    nodeId,
    executionMode,
    status: 'blocked',
    errorCode: 'SCHEMA_VALIDATION_FAILED',
    blockerCodes: ['SCHEMA_VALIDATION_FAILED'],
  });
}

function baseInvocationResult<T>(input: {
  output: T | null;
  nodeId: string;
  executionMode: string;
  status: 'succeeded' | 'blocked';
  errorCode: string | null;
  blockerCodes: string[];
}): TopicSelectionAgentInvocationResult<T> {
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const provenance = {
    workflow_run_id: 'feasibility_planning_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationFeasibilityPlanningRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-feasibility-planning-probe-plan-candidates',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_feasibility_planning_role_output',
    prompt_packet_hash: hash(`prompt:${input.nodeId}`),
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: null,
    prompt_packet_cache_result_hash: null,
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: input.executionMode === 'provider_llm' ? { request_count: 1 } : null,
  };
  return {
    schema_version: 'v1',
    node_id: input.nodeId,
    workflow_run_id: 'feasibility_planning_runtime_run_001',
    node_attempt_id: `${input.nodeId}.attempt-0`,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.nodeId,
      workflow_run_id: 'feasibility_planning_runtime_run_001',
      node_attempt_id: `${input.nodeId}.attempt-0`,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(),
      validation: input.status === 'succeeded'
        ? { valid: true, error_count: 0, errors: [] }
        : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
      warning_codes: [],
      blocker_codes: input.blockerCodes,
      error_code: input.errorCode,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as unknown as TopicSelectionAgentInvocationResult<T>;
}

function tokenBudgetGateResult() {
  return {
    provider_id: null,
    model_id: null,
    profile_id: PAPER_IMPLEMENTATION_FEASIBILITY_PLANNING_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1600,
    estimated_output_tokens: 3000,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1500,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-feasibility-planning-context-compression'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: 'v1',
  };
}

function includesRef(refs: TopicSelectionFunctionalRef[], expected: TopicSelectionFunctionalRef): boolean {
  const expectedKey = stableStringify(expected);
  return refs.some((item) => stableStringify(item) === expectedKey);
}

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}
