import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  type PaperImplementationTraceIntegrityRoleOutput,
  type RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
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
import {
  PaperImplementationTraceIntegrityDebateRuntimeService,
} from './paper-implementation-trace-integrity-debate-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_trace_debate_001';
const TITLE_CARD_ID = 'title_card_trace_debate_001';
const NOW = '2026-06-03T10:30:00.000Z';

class StubTraceIntegrityAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    run_mode: string;
    feature_id?: string | null;
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    runtime_token_budget?: unknown;
    debate_extension?: unknown;
  }> = [];

  async invokeStructuredOutput<T>(
    input: {
      node_id: string;
      execution_mode: string;
      run_mode: string;
      feature_id?: string | null;
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      runtime_token_budget?: unknown;
      debate_extension?: unknown;
    },
  ): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    const output = roleOutput(input.node_id);
    return invocationResult(output as T, input.node_id, input.execution_mode);
  }
}

test('trace integrity debate runtime records provider role artifacts and admits the final artifact', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID);
  assert.equal(result.provider_call_count, 4);
  assert.equal(orchestrator.calls.length, 4);
  assert.deepEqual(orchestrator.calls.map((call) => call.node_id), [
    ...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  ]);
  assert.equal(orchestrator.calls.every((call) => call.feature_id === 'paper_implementation'), true);
  assert.equal(orchestrator.calls.every((call) => call.runtime_token_budget), true);
  assert.equal(orchestrator.calls.every((call) => call.debate_extension), true);
  assert.match(orchestrator.calls[0]?.messages[1]?.content ?? '', /"retrieval_packet"/);
  assert.doesNotMatch(orchestrator.calls[0]?.messages[1]?.content ?? '', /"prior_role_outputs":\[[^\]]/);
  assert.match(orchestrator.calls[1]?.messages[1]?.content ?? '', /"prior_role_outputs":\[/);
  assert.equal(result.runtime_artifacts.length, 5);
  assert.equal(result.admission_records.length, 5);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_runtime_artifact?.provider_call_count, 4);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.final_runtime_artifact?.artifact_payload.retrieval_packet !== undefined, true);
  assert.equal(result.operational_telemetry.provider_call_count, 4);
  assert.equal(result.operational_telemetry.role_provider_call_count, 4);
  assert.equal(result.operational_telemetry.final_provider_call_count, 4);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.runtime_artifact_count, 5);
  assert.equal(result.operational_telemetry.role_artifact_count, 4);
  assert.equal(result.operational_telemetry.final_artifact_count, 1);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 5);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 5);
  const roleArtifacts = storedArtifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.equal(roleArtifacts.length, 4);
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.role_slot_id), [
    ...PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  ]);
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.call_index), [1, 2, 3, 4]);
  assert.equal(roleArtifacts.every((artifact) => artifact.artifact_payload.retrieval_packet !== undefined), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.token_budget_gate_result_hash === hash(tokenBudgetGateResult())), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.prompt_packet_cache_status === 'miss'), true);
  assert.equal(roleArtifacts.every((artifact) => artifact.prompt_packet_cache_result_hash === hash('prompt-cache-result')), true);
  assert.equal(storedArtifacts.filter((artifact) => artifact.artifact_scope === 'final').length, 1);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('rendered_prompt_text'), false);
});

test('trace integrity debate runtime records preflight blockers without provider calls', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const result = await service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    preflight_blocker_codes: ['trace_manifest_stale'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['trace_manifest_stale']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.runtime_artifacts[0]?.executor_kind, 'deterministic_preflight');
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.blocked_artifact_count, 2);
  assert.equal(result.operational_telemetry.non_provider_artifact_count, 0);
  assert.deepEqual(result.operational_telemetry.blocker_codes, ['trace_manifest_stale']);

  const admissions = await repository.listAdmissionRecords(PROJECT_ID);
  assert.equal(admissions.length, 2);
  assert.deepEqual(admissions.map((item) => item.admission_status), ['admitted', 'admitted']);
});

test('trace integrity debate runtime rejects non-provider model options before invocation', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      execution_mode: 'codex_assisted',
      run_mode: 'dry_run',
      model_option_id: `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced`,
      codex_role_outputs: Object.fromEntries(
        PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS.map((slotId) => [
          slotId,
          roleOutput(slotId),
        ]),
      ),
    }),
    /model_option_id requires execution_mode=provider_llm/,
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('trace integrity debate runtime rejects slot profile and model option drift before provider calls', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'trace_debate_profile_mismatch_run_001',
      model_profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
      model_option_id: `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-balanced`,
    }),
    /model_profile_id must match runtime slot profile/,
  );
  assert.equal(orchestrator.calls.length, 0);

  await assert.rejects(
    () => service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'trace_debate_model_option_mismatch_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-balanced`,
    }),
    /model_option_id must belong to runtime slot profile/,
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('trace integrity debate runtime rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'trace_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: traceRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'trace_provider_fixture_payload_run_001',
      mocked_role_outputs: traceRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('trace integrity debate runtime rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(null);
  await assert.rejects(
    () => missingProject.service.runBoundaryDebate(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runBoundaryDebate(PROJECT_ID, providerRequest()),
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

function serviceFixture(project: ImplementationProject | null = implementationProjectFixture()) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new StubTraceIntegrityAgentOrchestrator();
  const service = new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function traceRoleOutputs(): RunPaperImplementationTraceIntegrityDebateRuntimeRequest['mocked_role_outputs'] {
  return Object.fromEntries(
    PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS.map((slotId) => [
      slotId,
      roleOutput(slotId),
    ]),
  ) as RunPaperImplementationTraceIntegrityDebateRuntimeRequest['mocked_role_outputs'];
}

function providerRequest(): RunPaperImplementationTraceIntegrityDebateRuntimeRequest {
  return {
    run_id: 'trace_debate_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced`,
    target_ref: ref('claim_candidate', 'claim_candidate_001'),
    target_version_id: 'claim_candidate_version_001',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    reviewed_statement_packet_ref: ref('trace_reviewed_statement_packet', 'statement_packet_001'),
    reviewed_statement_packet_hash: hash('statement-packet'),
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    reviewed_statement_packets: [{
      statement_ref: ref('reviewed_statement', 'statement_001'),
      statement_hash: hash('statement-text'),
      statement_text: 'Method A improves validation accuracy on benchmark B.',
      semantic_role: 'result_claim',
    }],
    source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    source_hashes: [hash('run-evidence-unit')],
    source_packets: [{
      source_ref: ref('run_evidence_unit', 'run_evidence_unit_001'),
      source_hash: hash('run-evidence-unit'),
      source_family: 'run_evidence',
      freshness_status: 'fresh',
      evidence_role: 'primary_result',
      content_summary: 'Benchmark B run evidence reports the validation accuracy improvement.',
      source_excerpt: 'accuracy improved against the configured baseline',
    }],
    preflight_blocker_codes: [],
  };
}

function invocationResult<T>(
  output: T,
  nodeId: string,
  executionMode: string,
): TopicSelectionAgentInvocationResult<T> {
  const provider = executionMode === 'provider_llm';
  const promptPacketHash = hash(`prompt:${nodeId}`);
  const outputHash = hash(output);
  const provenance = {
    workflow_run_id: 'trace_debate_run_001',
    node_id: nodeId,
    node_attempt_id: `${nodeId}.attempt-0`,
    invocation_attempt_id: `${nodeId}.call-1`,
    execution_mode: executionMode,
    executor_kind: 'multi_agent_debate',
    source_kind: provider ? 'provider_response' : 'mock_fixture',
    non_provider: !provider,
    run_mode: provider ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: provider ? `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced` : null,
    normalized_params_hash: provider ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'TraceIntegrityRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-trace-integrity-boundary-debate',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_trace_integrity_role_output',
    prompt_packet_hash: promptPacketHash,
    prompt_packet_cache_status: 'miss',
    prompt_packet_cache_result_ref: ref('runtime_prompt_packet_cache_result', `prompt-cache:${nodeId}`),
    prompt_packet_cache_result_hash: hash('prompt-cache-result'),
    response_hash: outputHash,
    structured_output_hash: outputHash,
    cache_status: 'not_applicable',
    response_reuse_ref: null,
    telemetry: provider ? telemetry() : null,
  };
  return {
    schema_version: 'v1',
    node_id: nodeId,
    workflow_run_id: 'trace_debate_run_001',
    node_attempt_id: `${nodeId}.attempt-0`,
    status: 'succeeded',
    structured_output: output,
    provenance,
    validation: { valid: true, error_count: 0, errors: [] },
    token_budget_gate_result: tokenBudgetGateResult(),
    warning_codes: [],
    blocker_codes: [],
    error_code: null,
    audit_snapshot: {
      schema_version: 'topic-selection-agent-invocation-audit-v1',
      node_id: nodeId,
      workflow_run_id: 'trace_debate_run_001',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(),
      validation: { valid: true, error_count: 0, errors: [] },
      warning_codes: [],
      blocker_codes: [],
      created_at: NOW,
    },
    audit_artifact_ref: null,
  } as TopicSelectionAgentInvocationResult<T>;
}

function roleOutput(roleSlotId: string): PaperImplementationTraceIntegrityRoleOutput {
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `No trace-integrity blocker found by ${roleSlotId}.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    cited_source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    blocker_codes: [],
    warning_codes: [],
  };
}

function telemetry() {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    prompt_template_id: 'paper-implementation-trace-integrity-boundary-debate',
    prompt_template_version: 'v1',
    elapsed_ms: 10,
    request_count: 1,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    input_tokens: null,
    output_tokens: null,
    embedding_input_tokens: null,
    total_tokens: null,
    cost_usd: null,
    provider_side_cache_hit: null,
    provider_side_cache_read_tokens: null,
    provider_side_cache_write_tokens: null,
  };
}

function tokenBudgetGateResult() {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced`,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 1800,
    context_window_tokens: 128000,
    schema_overhead_tokens: 800,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-trace-integrity-context-compression'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: TITLE_CARD_ID,
    version_id: `${refId}@v1`,
  };
}

function hash(value: unknown): string {
  return sha256Text(typeof value === 'string' ? value : stableStringify(value));
}
