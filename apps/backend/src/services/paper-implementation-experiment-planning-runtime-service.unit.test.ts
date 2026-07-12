import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  type PaperImplementationExperimentPlanningRoleOutput,
  type PaperImplementationExperimentWorkOrderDraftCandidate,
  type RunPaperImplementationExperimentPlanningRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import type {
  ImplementationProject,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-contracts';

import { AppError } from '../errors/app-error.js';
import { InMemoryPaperImplementationRepository } from '../repositories/in-memory-paper-implementation-repository.js';
import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationExperimentPlanningRuntimeService } from './paper-implementation-experiment-planning-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_experiment_planning_runtime_001';
const TITLE_CARD_ID = 'title_card_experiment_planning_runtime_001';
const NOW = '2026-06-04T10:00:00.000Z';

type Outcome = 'passed_design' | 'passed_critique' | 'schema_failed' | 'incomplete_design' | 'incomplete_critique';

class StubExperimentPlanningAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(private readonly outcomes: Outcome[] = ['passed_design']) {}

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      executor_kind: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const outcome = this.outcomes.shift() ?? 'passed_design';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_design') {
      return invocationResult(experimentDesignRoleOutput({
        work_order_draft_candidates: [experimentDraftCandidate('single_candidate', false)],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_critique') {
      return invocationResult(experimentCritiqueRoleOutput({
        checked_dimensions: ['compute_budget'],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'passed_critique') {
      return invocationResult(experimentCritiqueRoleOutput() as T, input.node_id, input.execution_mode);
    }
    return invocationResult(experimentDesignRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('experiment design runtime records WorkOrder draft proposal artifact without Domain Gate payload', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed_design']);
  const result = await service.runExperimentDesign(PROJECT_ID, providerRequest('design'));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID);
  assert.equal(result.workflow_type, 'experiment_design');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /WorkOrder draft candidates/);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.work_order_draft_candidates as unknown[] | undefined)?.length,
    2,
  );
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_execution_side_effect, true);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('rendered_prompt_text'), false);
});

test('experiment critique runtime records independent critique coverage', async () => {
  const { service, orchestrator } = serviceFixture(['passed_critique']);
  const result = await service.runExperimentCritique(PROJECT_ID, providerRequest('critique'));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_SLOT_ID);
  assert.equal(result.workflow_type, 'experiment_critique');
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(result.runtime_artifacts[0]?.executor_kind, 'single_agent');
  assert.deepEqual(
    result.final_runtime_artifact?.artifact_payload.checked_dimensions,
    [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.critique_decision !== null, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_execution_side_effect, true);
  assert.equal('domain_gate_request' in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
});

test('experiment planning runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed_design']);
  const result = await service.runExperimentDesign(PROJECT_ID, {
    ...providerRequest('design'),
    run_id: 'experiment_design_preflight_blocked_run_001',
    preflight_blocker_codes: ['route_refs_missing'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['route_refs_missing']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('experiment planning runtime fails closed after same-profile semantic retry exhaustion', async () => {
  const design = serviceFixture(['incomplete_design', 'incomplete_design']);
  const designResult = await design.service.runExperimentDesign(PROJECT_ID, {
    ...providerRequest('design'),
    run_id: 'experiment_design_missing_candidate_run_001',
  });

  assert.equal(designResult.status, 'failed_runtime');
  assert.equal(design.orchestrator.calls.length, 2);
  assert.equal(designResult.provider_call_count, 2);
  assert.equal(designResult.runtime_artifacts.length, 1);
  assert.equal(designResult.final_runtime_artifact, null);
  assert.equal(designResult.runtime_artifacts[0]?.runtime_failure_code, 'EXPERIMENT_DESIGN_CANDIDATE_SET_INCOMPLETE');
  assert.equal(designResult.admission_records[0]?.admission_status, 'rejected');

  const critique = serviceFixture(['incomplete_critique', 'incomplete_critique']);
  const critiqueResult = await critique.service.runExperimentCritique(PROJECT_ID, {
    ...providerRequest('critique'),
    run_id: 'experiment_critique_missing_dimension_run_001',
  });

  assert.equal(critiqueResult.status, 'failed_runtime');
  assert.equal(critique.orchestrator.calls.length, 2);
  assert.equal(critiqueResult.provider_call_count, 2);
  assert.equal(critiqueResult.runtime_artifacts[0]?.runtime_failure_code, 'EXPERIMENT_CRITIQUE_DIMENSION_COVERAGE_INCOMPLETE');
  assert.equal(critiqueResult.admission_records[0]?.admission_status, 'rejected');
});

test('experiment planning runtime rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runExperimentDesign(PROJECT_ID, {
      ...providerRequest('design'),
      run_id: 'experiment_design_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: experimentPlanningRoleOutputs('design'),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runExperimentCritique(PROJECT_ID, {
      ...providerRequest('critique'),
      run_id: 'experiment_critique_provider_fixture_payload_run_001',
      codex_role_outputs: experimentPlanningRoleOutputs('critique'),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('experiment planning runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runExperimentDesign(PROJECT_ID, providerRequest('design')),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runExperimentCritique(PROJECT_ID, providerRequest('critique')),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'GATE_CONSTRAINT_FAILED',
  );
  assert.equal(inactiveProject.orchestrator.calls.length, 0);
});

function implementationProjectFixture(
  lifecycleStatus: ImplementationProject['lifecycle_status'] = 'active',
): ImplementationProject {
  return {
    implementation_project_id: PROJECT_ID,
    intake_snapshot_id: `${PROJECT_ID}_intake_snapshot`,
    workspace_id: 'workspace_001',
    title_card_id: TITLE_CARD_ID,
    paper_project_bridge_id: `${PROJECT_ID}_bridge`,
    bridge_payload_hash: 'bridge_payload_hash_001',
    target_paper_project_ref: null,
    lifecycle_status: lifecycleStatus,
    freshness_status: 'fresh',
    source_status: 'active',
    version_number: 1,
    policy_version_id: 'policy_v1',
    created_by: 'system',
    created_at: NOW,
    updated_at: NOW,
  };
}

function projectRepositoryFixture(
  project: ImplementationProject | null,
): InMemoryPaperImplementationRepository {
  const repository = new InMemoryPaperImplementationRepository();
  if (project) {
    void repository.createBootstrap({
      implementation_project: project,
      intake_snapshot: {
        intake_snapshot_id: project.intake_snapshot_id,
        implementation_project_id: project.implementation_project_id,
        workspace_id: project.workspace_id,
        title_card_id: project.title_card_id,
        paper_project_bridge_id: project.paper_project_bridge_id,
        paper_project_bridge_ref: {
          ref_type: 'paper_project_bridge',
          ref_id: project.paper_project_bridge_id,
          title_card_id: project.title_card_id,
          version_id: null,
        },
        bridge_payload_hash: project.bridge_payload_hash,
        promotion_decision_id: 'promotion_decision_001',
        promotion_decision_ref: {
          ref_type: 'promotion_decision',
          ref_id: 'promotion_decision_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_commitment_profile_id: 'promotion_commitment_profile_001',
        promotion_commitment_profile_ref: {
          ref_type: 'promotion_commitment_profile',
          ref_id: 'promotion_commitment_profile_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_id: 'promotion_input_snapshot_001',
        promotion_input_snapshot_ref: {
          ref_type: 'promotion_input_snapshot',
          ref_id: 'promotion_input_snapshot_001',
          title_card_id: project.title_card_id,
          version_id: null,
        },
        promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        topic_package_id: 'topic_package_001',
        package_version: 'v1',
        source_status: 'active',
        snapshot_hashes: {
          bundle_hash: 'bundle_hash_001',
          package_snapshot_hash: 'package_snapshot_hash_001',
          package_draft_input_snapshot_hash: 'package_draft_input_snapshot_hash_001',
          promotion_input_snapshot_hash: 'promotion_input_snapshot_hash_001',
        },
        source_refs: [],
        accepted_risk_refs: [],
        condition_refs: [],
        early_check_obligations: [],
        working_copy_payload: {
          editable_title: 'Working paper title',
          problem_statement: 'Problem statement.',
          contribution_summary: 'Contribution summary.',
          evaluation_plan: 'Evaluation plan.',
          initial_planning_notes: [],
          claim_ceiling: 'Bounded claim ceiling.',
          prohibited_claims: [],
          conditions: [],
          accepted_risk_refs: [],
          early_check_obligations: [],
          source_lineage_summary: {},
        },
        working_copy_payload_hash: 'working_copy_payload_hash_001',
        source_handoff: {} as never,
        target_paper_project_ref: null,
        intake_snapshot_hash: 'intake_snapshot_hash_001',
        policy_version_id: 'policy_v1',
        created_by: 'system',
        created_at: NOW,
      },
    });
  }
  return repository;
}

function serviceFixture(
  outcomes?: Outcome[],
  project: ImplementationProject | null = implementationProjectFixture(),
) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new StubExperimentPlanningAgentOrchestrator(outcomes);
  const service = new PaperImplementationExperimentPlanningRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function experimentPlanningRoleOutputs(
  slot: 'design' | 'critique',
): RunPaperImplementationExperimentPlanningRuntimeRequest['mocked_role_outputs'] {
  if (slot === 'design') {
    return {
      [PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID]: experimentDesignRoleOutput(),
    };
  }
  return {
    [PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID]: experimentCritiqueRoleOutput(),
  };
}

function providerRequest(slot: 'design' | 'critique'): RunPaperImplementationExperimentPlanningRuntimeRequest {
  const profileId = slot === 'design'
    ? PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID
    : PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID;
  return {
    run_id: `${slot}_runtime_run_001`,
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: profileId,
    model_option_id: `${profileId}.openai-balanced`,
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('technical_route_candidate', 'route_candidate_001'),
      ref('feasibility_probe', 'feasibility_probe_001'),
      ref('experiment_plan_light', 'experiment_plan_light_001'),
    ],
    source_hashes: [hash('route'), hash('probe'), hash('plan')],
    preflight_blocker_codes: [],
  };
}

function experimentDraftCandidate(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate {
  return {
    candidate_id: candidateId,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    plan_summary: `${candidateId} proposes a bounded experiment plan.`,
    route_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    feasibility_probe_refs: [ref('feasibility_probe', 'feasibility_probe_001')],
    primary_metric_refs: [ref('metric', 'metric_001')],
    secondary_metric_refs: [ref('metric', 'metric_secondary_001')],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config_snapshot', 'config_snapshot_001')],
    run_policy_ref: ref('run_policy', 'run_policy_001'),
    budget_ref: ref('validation_budget', 'budget_001'),
    stop_condition_refs: [ref('stop_condition', 'stop_condition_001')],
    estimated_cost_class: confirmatoryMarker ? 'high' : 'medium',
    confirmatory_marker: confirmatoryMarker,
    work_order_draft_request: workOrderDraftRequest(candidateId, confirmatoryMarker),
  };
}

function workOrderDraftRequest(
  candidateId: string,
  confirmatoryMarker: boolean,
): PaperImplementationExperimentWorkOrderDraftCandidate['work_order_draft_request'] {
  return {
    work_order_id: `${candidateId}_work_order_draft`,
    validation_cycle_id: 'validation_cycle_001',
    experiment_plan_light_id: `experiment_plan_${candidateId}`,
    run_type: confirmatoryMarker ? 'confirmatory' : 'exploratory',
    run_policy: {
      run_policy_id: `run_policy_${candidateId}`,
      retry_budget: 1,
      compute_limit_ref: ref('compute_limit', `compute_limit_${candidateId}`),
      stop_condition_refs: [ref('stop_condition', 'stop_condition_001')],
      allowed_mutation_refs: [],
      autotune_policy: 'disabled',
    },
    experiment_bridge: {
      run_recipe_ref: ref('run_recipe', `run_recipe_${candidateId}`),
      run_recipe_hash: hash(`run_recipe_${candidateId}`),
      version_lock_hash: hash(`version_lock_${candidateId}`),
      config_snapshot_hash: hash(`config_snapshot_${candidateId}`),
      materialization_result_ref: null,
      materialization_result_hash: null,
      training_task_spec_ref: null,
      training_task_spec_hash: null,
      external_job_ref: null,
      external_job_hash: null,
      result_validation_policy_ref: null,
    },
    motive_refs: [],
    assertion_refs: [],
    dataset_version_refs: [ref('dataset_version', 'dataset_version_001')],
    baseline_version_refs: [ref('baseline_version', 'baseline_version_001')],
    code_version_refs: [ref('code_version', 'code_version_001')],
    config_refs: [ref('config_snapshot', 'config_snapshot_001')],
    trace_manifest_id: `trace_manifest_${candidateId}`,
    policy_version_id: 'policy_v1',
    created_by: 'system',
  };
}

function experimentDesignRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Experiment design proposed WorkOrder draft alternatives.',
    cited_source_refs: [ref('technical_route_candidate', 'route_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    work_order_draft_candidates: [
      experimentDraftCandidate('exploratory_candidate', false),
      experimentDraftCandidate('confirmatory_candidate', true),
    ],
    ...overrides,
  };
}

function experimentCritiqueRoleOutput(
  overrides: Partial<PaperImplementationExperimentPlanningRoleOutput> = {},
): PaperImplementationExperimentPlanningRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Independent critique covered experiment-planning risks.',
    cited_source_refs: [ref('experiment_plan_light', 'experiment_plan_light_001')],
    blocker_codes: [],
    warning_codes: [],
    checked_dimensions: [...PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_DIMENSIONS],
    critique_findings: [{
      finding_id: 'critique_finding_budget_001',
      critique_dimension: 'compute_budget',
      severity: 'warning',
      summary: 'Budget is bounded but should remain visible before WorkOrder admission.',
      evidence_refs: [ref('validation_budget', 'budget_001')],
      required_revision_refs: [],
      blocks_work_order: false,
    }],
    critique_decision: {
      decision: 'approve_for_work_order_draft',
      rationale: 'No blocking execution risk remains after the bounded critique.',
      required_revision_refs: [],
      no_execution_side_effect: true,
    },
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
  const profileId = input.nodeId === PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID
    ? PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_PROFILE_ID
    : PAPER_IMPLEMENTATION_EXPERIMENT_DESIGN_PROFILE_ID;
  const outputHash = input.output ? hash(input.output) : hash(input.errorCode);
  const provenance = {
    workflow_run_id: 'experiment_planning_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: profileId,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${profileId}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationExperimentPlanningRoleArtifact@v1',
    prompt_template_id: input.nodeId === PAPER_IMPLEMENTATION_EXPERIMENT_CRITIQUE_ROLE_SLOT_ID
      ? 'paper-implementation-experiment-critique-plan-critique'
      : 'paper-implementation-experiment-design-work-order-draft',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_experiment_planning_role_output',
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
    workflow_run_id: 'experiment_planning_runtime_run_001',
    node_attempt_id: `${input.nodeId}.attempt-0`,
    status: input.status,
    structured_output: input.output,
    provenance,
    validation: input.status === 'succeeded'
      ? { valid: true, error_count: 0, errors: [] }
      : { valid: false, error_count: 1, errors: [{ keyword: 'required' }] },
    token_budget_gate_result: tokenBudgetGateResult(profileId),
    warning_codes: [],
    blocker_codes: input.blockerCodes,
    error_code: input.errorCode,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: input.nodeId,
      workflow_run_id: 'experiment_planning_runtime_run_001',
      node_attempt_id: `${input.nodeId}.attempt-0`,
      status: input.status,
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(profileId),
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

function tokenBudgetGateResult(profileId: string) {
  return {
    provider_id: null,
    model_id: null,
    profile_id: profileId,
    model_option_id: null,
    estimated_input_tokens: 1400,
    estimated_output_tokens: 2400,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1200,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-experiment-planning-context-compression'),
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

function hash(value: unknown): string {
  return sha256Text(stableStringify(value));
}

test('experiment planning runtime token budget counts message-embedded context once and wires the compression attempt (S2-A)', async () => {
  const fatText = 'Neutral benchmark evidence sentence with cited source support and no secrets. '.repeat(200);
  const { service, orchestrator } = serviceFixture(['passed_design']);
  const base = providerRequest('design');
  const request = {
    ...base,
    run_id: 'experiment_design_token_budget_run_001',
    source_context_packets: [{
      source_ref: base.source_refs[0],
      evidence_kind: 'admitted_upstream_proposal',
      content_summary: fatText,
      key_facts: [fatText, 'bounded key fact with cited source support.'],
    }],
  };
  await service.runExperimentDesign(PROJECT_ID, request);

  const call = orchestrator.calls[0];
  assert.ok(call);
  const budget = call.runtime_token_budget as {
    context_payloads: unknown[];
    estimated_input_tokens_override: number;
    compression_attempt?: {
      compression_executor_kind: string;
      compressed_messages?: Array<{ role: string; content: string }> | null;
    } | null;
  };
  const messages = call.messages;
  // N3 single-source estimate: exactly the messages that will be sent, counted once.
  assert.equal(
    budget.estimated_input_tokens_override,
    Math.ceil(stableStringify({ messages }).length / 4),
  );
  assert.deepEqual(budget.context_payloads, []);
  // Re-carrying the embedded packet bodies (the pre-fix shape) would roughly double
  // the estimate for packet-dominated inputs.
  const doubleCounted = Math.ceil(stableStringify({
    messages,
    context_payloads: [{ source_context_packets: request.source_context_packets }],
  }).length / 4);
  assert.equal(budget.estimated_input_tokens_override <= Math.ceil(doubleCounted * 0.6), true);
  // PC-S2/PC-S3: a packet face yields a caller-supplied deterministic attempt.
  assert.ok(budget.compression_attempt);
  assert.equal(budget.compression_attempt.compression_executor_kind, 'deterministic_structural');
  assert.equal((budget.compression_attempt.compressed_messages?.length ?? 0) > 0, true);

  const noPackets = serviceFixture(['passed_design']);
  await noPackets.service.runExperimentDesign(PROJECT_ID, {
    ...providerRequest('design'),
    run_id: 'experiment_design_token_budget_run_002',
  });
  const noPacketBudget = noPackets.orchestrator.calls[0]?.runtime_token_budget as {
    compression_attempt?: unknown;
  };
  assert.equal(noPacketBudget.compression_attempt ?? null, null);
});
