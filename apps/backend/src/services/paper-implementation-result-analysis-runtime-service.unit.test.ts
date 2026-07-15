import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  type PaperImplementationResultAnalysisRoleOutput,
  type RunPaperImplementationResultAnalysisRuntimeRequest,
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
import { PaperImplementationResultAnalysisRuntimeService } from './paper-implementation-result-analysis-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_result_analysis_runtime_001';
const TITLE_CARD_ID = 'title_card_result_analysis_runtime_001';
const NOW = '2026-06-04T09:00:00.000Z';

class StubResultAnalysisAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  constructor(
    private readonly outcomes: Array<
      'passed'
      | 'schema_failed'
      | 'incomplete_scenarios'
      | 'missing_domain_gate_request'
      | 'wire_passed'
      | 'wire_decode_failed'
    > = ['passed'],
  ) {}

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
    const outcome = this.outcomes.shift() ?? 'passed';
    if (outcome === 'schema_failed') {
      return failedInvocationResult(input.node_id, input.execution_mode);
    }
    if (outcome === 'incomplete_scenarios') {
      return invocationResult(roleOutput({
        scenario_outputs: [resultAnalysisScenarioOutput('positive')],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_domain_gate_request') {
      return invocationResult(roleOutput({
        domain_gate_request: undefined,
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'wire_passed') {
      // T-124 S3 F5-1: a provider wire output carries the domain-gate request as
      // a JSON string; the service must canonicalize it back into the object.
      return invocationResult(wireRoleOutput() as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'wire_decode_failed') {
      return invocationResult(wireRoleOutput('{ not valid json') as T, input.node_id, input.execution_mode);
    }
    return invocationResult(roleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('result analysis runtime records role and final artifacts with telemetry', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const result = await service.runInterpretationScenarios(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID);
  assert.equal(result.workflow_type, 'result_analysis');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /Interpretations are not evidence/);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.admission_records.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.scenario_outputs as unknown[] | undefined)?.length,
    4,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request !== null, true);
  assert.equal(result.operational_telemetry.provider_call_count, 1);
  assert.equal(result.operational_telemetry.role_provider_call_count, 1);
  assert.equal(result.operational_telemetry.final_provider_call_count, 1);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.runtime_artifact_count, 2);
  assert.equal(result.operational_telemetry.role_artifact_count, 1);
  assert.equal(result.operational_telemetry.final_artifact_count, 1);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('rendered_prompt_text'), false);
});

test('T-124 S3 F5-1: result analysis canonicalizes the provider wire domain-gate JSON string into the canonical object', async () => {
  const { service, orchestrator } = serviceFixture(['wire_passed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(orchestrator.calls.length, 1);
  // Provider mode sent the wire schema and instructed the JSON-string carrier.
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /domain_gate_request_json/);
  // The recorded artifact carries the canonical object — no wire residue anywhere.
  const domainGate = result.final_runtime_artifact?.artifact_payload.domain_gate_request as Record<string, unknown> | null;
  assert.equal(domainGate !== null, true);
  assert.equal(domainGate?.result_interpretation_packet_id, 'result_interpretation_packet_001');
  const serialized = stableStringify(result);
  assert.equal(serialized.includes('domain_gate_request_json'), false);
  assert.equal(serialized.includes('{ not valid json'), false);
});

test('T-124 S3 F5-1: result analysis fails closed when the provider wire JSON carrier cannot be parsed', async () => {
  const { service, orchestrator } = serviceFixture(['wire_decode_failed', 'wire_decode_failed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, providerRequest());

  // One retryable technical retry, then terminal failed_runtime — never a 400.
  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.blocker_codes.includes('RUNTIME_WIRE_JSON_DECODE_FAILED'), true);
});

test('result analysis runtime records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_preflight_blocked_run_001',
    preflight_blocker_codes: ['run_evidence_missing'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['run_evidence_missing']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('result analysis runtime fails closed after same-profile provider retry exhaustion', async () => {
  const { service, orchestrator } = serviceFixture(['schema_failed', 'schema_failed']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_retry_exhausted_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.operational_telemetry.runtime_failure_codes, ['SCHEMA_VALIDATION_FAILED']);
  assert.deepEqual(result.operational_telemetry.warning_codes, ['RUNTIME_TECHNICAL_RETRY_EXHAUSTED']);
});

test('result analysis runtime fails closed when passed output omits required scenario kinds', async () => {
  const { service, orchestrator } = serviceFixture(['incomplete_scenarios', 'incomplete_scenarios']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_missing_scenarios_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.deepEqual(result.operational_telemetry.runtime_failure_codes, [
    'RESULT_ANALYSIS_SCENARIO_SET_INCOMPLETE',
  ]);
});

test('result analysis runtime fails closed when passed output omits domain gate request', async () => {
  const { service, orchestrator } = serviceFixture(['missing_domain_gate_request', 'missing_domain_gate_request']);
  const result = await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_missing_domain_gate_run_001',
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.provider_call_count, 2);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RESULT_ANALYSIS_DOMAIN_GATE_REQUEST_MISSING');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
});

test('result analysis runtime rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'result_analysis_product_codex_mode_run_001',
      execution_mode: 'codex_assisted',
      model_option_id: null,
      codex_role_outputs: resultAnalysisRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runInterpretationScenarios(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'result_analysis_provider_fixture_payload_run_001',
      mocked_role_outputs: resultAnalysisRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('result analysis runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(undefined, null);
  await assert.rejects(
    () => missingProject.service.runInterpretationScenarios(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(undefined, implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runInterpretationScenarios(PROJECT_ID, providerRequest()),
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
  outcomes?: Array<
    'passed'
    | 'schema_failed'
    | 'incomplete_scenarios'
    | 'missing_domain_gate_request'
    | 'wire_passed'
    | 'wire_decode_failed'
  >,
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
  const orchestrator = new StubResultAnalysisAgentOrchestrator(outcomes);
  const service = new PaperImplementationResultAnalysisRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function resultAnalysisRoleOutputs(): RunPaperImplementationResultAnalysisRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID]: roleOutput(),
  };
}

function providerRequest(): RunPaperImplementationResultAnalysisRuntimeRequest {
  return {
    run_id: 'result_analysis_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.openai-balanced`,
    target_ref: ref('validation_cycle', 'validation_cycle_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
    ],
    source_hashes: [hash('run-evidence'), hash('validation-report')],
    preflight_blocker_codes: [],
  };
}

function resultAnalysisScenarioOutput(
  kind: PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number]['scenario_kind'],
): PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number] {
  return {
    scenario_id: `${kind}_scenario`,
    scenario_kind: kind,
    summary: `${kind} interpretation with bounded claim implications.`,
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    challenge_refs: [ref('result_validation_report', 'result_validation_report_001')],
    limitation_refs: [ref('limitation', 'limitation_001')],
    forbidden_overclaims: ['broad generalization'],
    recommended_claim_refs: [ref('claim_candidate', `${kind}_claim_candidate_001`)],
    required_followup_refs: [ref('validation_feedback_item', `${kind}_followup_001`)],
  };
}

function roleOutput(
  overrides: Partial<PaperImplementationResultAnalysisRoleOutput> = {},
): PaperImplementationResultAnalysisRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Result analysis scenarios passed.',
    cited_source_refs: [
      ref('run_evidence_unit', 'run_evidence_unit_001'),
      ref('result_validation_report', 'result_validation_report_001'),
    ],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) =>
      resultAnalysisScenarioOutput(kind as PaperImplementationResultAnalysisRoleOutput['scenario_outputs'][number]['scenario_kind'])),
    domain_gate_request: {
      result_interpretation_packet_id: 'result_interpretation_packet_001',
      validation_cycle_id: 'validation_cycle_001',
      source: {
        run_evidence_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
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
        limitation_refs: [ref('limitation', 'limitation_001')],
        reliability_notes: [],
      },
      claim_implications: {
        allowed_claim_ceiling: 'moderate',
        forbidden_overclaims: ['broad generalization'],
        recommended_claim_refs: [],
        required_followup_refs: [],
      },
      trace_manifest_id: 'trace_manifest_result_001',
      created_by: 'system',
    },
    ...overrides,
  };
}

/**
 * T-124 S3 F5-1: the provider wire shape — canonical role output with
 * `domain_gate_request` replaced by the `domain_gate_request_json` string
 * carrier. Pass `overrideJson` to inject a malformed carrier.
 */
function wireRoleOutput(overrideJson?: string): Record<string, unknown> {
  const { domain_gate_request: domainGate, ...rest } = roleOutput();
  return {
    ...rest,
    domain_gate_request_json: overrideJson ?? JSON.stringify(domainGate),
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
    workflow_run_id: 'result_analysis_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationResultAnalysisRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-result-analysis-scenarios',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_result_analysis_role_output',
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
    workflow_run_id: 'result_analysis_runtime_run_001',
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
      workflow_run_id: 'result_analysis_runtime_run_001',
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
    profile_id: PAPER_IMPLEMENTATION_RESULT_ANALYSIS_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 1800,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1000,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-result-analysis-context-compression'),
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

test('result analysis runtime token budget counts message-embedded context once (S2-A N3)', async () => {
  const { service, orchestrator } = serviceFixture();
  await service.runInterpretationScenarios(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'result_analysis_token_budget_run_001',
  });

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
  assert.equal(
    budget.estimated_input_tokens_override,
    Math.ceil(stableStringify({ messages }).length / 4),
  );
  assert.deepEqual(budget.context_payloads, []);
  assert.equal(budget.compression_attempt ?? null, null);
});
