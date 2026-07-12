import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID,
  PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
  type PaperImplementationP1RuntimeReviewRoleOutput,
  type RunPaperImplementationP1RuntimeReviewRequest,
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
import { PaperImplementationP1RuntimeReviewService } from './paper-implementation-p1-runtime-review-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_p1_runtime_001';
const TITLE_CARD_ID = 'title_card_p1_runtime_001';
const NOW = '2026-06-03T11:30:00.000Z';

class StubP1AgentOrchestrator {
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

test('P1 runtime review records claim-boundary role artifacts and admits final artifact', async () => {
  const { service, repository, orchestrator } = serviceFixture();
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID);
  assert.equal(result.workflow_type, 'claim_boundary_review');
  assert.equal(result.provider_call_count, 3);
  assert.equal(orchestrator.calls.length, 3);
  assert.deepEqual(orchestrator.calls.map((call) => call.node_id), [
    ...PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS,
  ]);
  assert.equal(orchestrator.calls.every((call) => call.feature_id === 'paper_implementation'), true);
  assert.equal(orchestrator.calls.every((call) => call.runtime_token_budget), true);
  assert.equal(orchestrator.calls.every((call) => call.debate_extension), true);
  assert.match(orchestrator.calls[0]?.messages[1]?.content ?? '', /"source_hash_bundle_hash"/);
  assert.equal(result.runtime_artifacts.length, 4);
  assert.equal(result.admission_records.length, 4);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request !== undefined, true);
  assert.equal(result.operational_telemetry.provider_call_count, 3);
  assert.equal(result.operational_telemetry.role_provider_call_count, 3);
  assert.equal(result.operational_telemetry.final_provider_call_count, 3);
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.runtime_artifact_count, 4);
  assert.equal(result.operational_telemetry.role_artifact_count, 3);
  assert.equal(result.operational_telemetry.final_artifact_count, 1);
  assert.equal(result.operational_telemetry.rejected_admission_count, 0);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 4);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 4);
  assert.deepEqual(
    storedArtifacts.filter((artifact) => artifact.artifact_scope === 'role').map((artifact) => artifact.role_slot_id),
    [...PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS],
  );
  assert.equal(storedArtifacts.every((artifact) => artifact.retrieval_packet_ref === null), true);
  assert.equal(storedArtifacts.every((artifact) => artifact.retrieval_packet_hash === null), true);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('rendered_prompt_text'), false);
});

test('P1 runtime review records dossier-readiness role artifacts and final scenario payload', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runDossierReadinessAudit(PROJECT_ID, providerRequest('dossier'));

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_SLOT_ID);
  assert.equal(result.workflow_type, 'dossier_readiness_prep');
  assert.equal(result.provider_call_count, 3);
  assert.deepEqual(orchestrator.calls.map((call) => call.node_id), [
    ...PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS,
  ]);
  assert.equal(result.final_runtime_artifact?.artifact_payload.scenario_outputs instanceof Array, true);
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.scenario_outputs as unknown[] | undefined)?.length,
    1,
  );
});

test('P1 runtime review records preflight blockers without provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    preflight_blocker_codes: ['claim_trace_packet_missing'],
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.deepEqual(result.blocker_codes, ['claim_trace_packet_missing']);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(result.final_runtime_artifact?.artifact_payload.domain_gate_request, null);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('P1 runtime review rejects slot profile and model option drift before provider calls', async () => {
  const { service, orchestrator } = serviceFixture();
  await assert.rejects(
    () => service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: 'claim_boundary_profile_mismatch_run_001',
      model_profile_id: PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
      model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
    }),
    /model_profile_id must match runtime slot profile/,
  );
  assert.equal(orchestrator.calls.length, 0);

  await assert.rejects(
    () => service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: 'claim_boundary_model_option_mismatch_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
    }),
    /model_option_id must belong to runtime slot profile/,
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('P1 runtime review rejects product fixture modes and provider fixture payloads', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: 'p1_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: p1RoleOutputs('claim'),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runDossierReadinessAudit(PROJECT_ID, {
      ...providerRequest('dossier'),
      run_id: 'p1_provider_fixture_payload_run_001',
      codex_role_outputs: p1RoleOutputs('dossier'),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  assert.equal(orchestrator.calls.length, 0);
});

test('P1 runtime review rejects missing or inactive implementation project before provider calls', async () => {
  const missingProject = serviceFixture(null);
  await assert.rejects(
    () => missingProject.service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim')),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );
  assert.equal(missingProject.orchestrator.calls.length, 0);

  const inactiveProject = serviceFixture(implementationProjectFixture('archived'));
  await assert.rejects(
    () => inactiveProject.service.runDossierReadinessAudit(PROJECT_ID, providerRequest('dossier')),
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
  const orchestrator = new StubP1AgentOrchestrator();
  const service = new PaperImplementationP1RuntimeReviewService({
    projectRepository: projectRepositoryFixture(project),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function p1RoleOutputs(
  kind: 'claim' | 'dossier',
): RunPaperImplementationP1RuntimeReviewRequest['mocked_role_outputs'] {
  const roleSlotIds = kind === 'claim'
    ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_REVIEW_ROLE_SLOT_IDS
    : PAPER_IMPLEMENTATION_DOSSIER_READINESS_REVIEW_ROLE_SLOT_IDS;
  return Object.fromEntries(
    roleSlotIds.map((slotId) => [
      slotId,
      roleOutput(slotId),
    ]),
  ) as RunPaperImplementationP1RuntimeReviewRequest['mocked_role_outputs'];
}

function providerRequest(kind: 'claim' | 'dossier'): RunPaperImplementationP1RuntimeReviewRequest {
  const claim = kind === 'claim';
  return {
    run_id: claim ? 'claim_boundary_run_001' : 'dossier_readiness_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: claim
      ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
      : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
    model_option_id: claim
      ? `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-balanced`
      : `${PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID}.openai-balanced`,
    target_ref: claim
      ? ref('result_interpretation_packet', 'result_packet_001')
      : ref('implementation_dossier', 'dossier_001'),
    target_version_id: 'v1',
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: claim
      ? [ref('result_interpretation_packet', 'result_packet_001'), ref('claim_trace_packet', 'claim_trace_packet_001')]
      : [ref('claim_candidate', 'claim_candidate_001'), ref('claim_trace_packet', 'claim_trace_packet_001')],
    source_hashes: claim
      ? [hash('result-packet'), hash('claim-trace-packet')]
      : [hash('claim-candidate'), hash('claim-trace-packet')],
    preflight_blocker_codes: [],
  };
}

function roleOutput(nodeId: string): PaperImplementationP1RuntimeReviewRoleOutput {
  const final = nodeId.endsWith('final');
  const claim = nodeId.startsWith('claim_boundary_review');
  return {
    role_slot_id: nodeId as PaperImplementationP1RuntimeReviewRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `P1 role ${nodeId} passed.`,
    cited_source_refs: claim
      ? [ref('result_interpretation_packet', 'result_packet_001')]
      : [ref('claim_candidate', 'claim_candidate_001')],
    blocker_codes: [],
    warning_codes: [],
    domain_gate_request: final
      ? claim ? { claim_candidate_id: 'claim_candidate_001' } : { dossier_id: 'dossier_001' }
      : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
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
    workflow_run_id: 'p1_runtime_run_001',
    node_id: nodeId,
    node_attempt_id: `${nodeId}.attempt-0`,
    invocation_attempt_id: `${nodeId}.call-1`,
    execution_mode: executionMode,
    executor_kind: 'multi_agent_debate',
    source_kind: provider ? 'provider_response' : 'mock_fixture',
    non_provider: !provider,
    run_mode: provider ? 'product' : 'acceptance',
    profile_id: nodeId.startsWith('claim_boundary_review')
      ? PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID
      : PAPER_IMPLEMENTATION_DOSSIER_READINESS_AUDIT_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: provider ? 'openai-balanced' : null,
    normalized_params_hash: provider ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationP1RuntimeReviewRoleArtifact@v1',
    prompt_template_id: nodeId.startsWith('claim_boundary_review')
      ? 'paper-implementation-claim-boundary-debate'
      : 'paper-implementation-dossier-readiness-audit',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_p1_runtime_review_role_output',
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
    workflow_run_id: 'p1_runtime_run_001',
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
      workflow_run_id: 'p1_runtime_run_001',
      node_attempt_id: `${nodeId}.attempt-0`,
      status: 'succeeded',
      provenance,
      token_budget_gate_result: tokenBudgetGateResult(),
      validation: { valid: true, error_count: 0, errors: [] },
      warning_codes: [],
      blocker_codes: [],
      error_code: null,
      created_at: NOW,
    },
    created_at: NOW,
    audit_artifact_ref: null,
  } as TopicSelectionAgentInvocationResult<T>;
}

function tokenBudgetGateResult() {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-balanced`,
    estimated_input_tokens: 1200,
    estimated_output_tokens: 1800,
    context_window_tokens: 128000,
    schema_overhead_tokens: 800,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-p1-context-compression'),
    blocker_codes: [],
    warning_codes: [],
  };
}

function telemetry() {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
    prompt_template_id: 'paper-implementation-claim-boundary-debate',
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

type P1InvocationCall = {
  node_id: string;
  execution_mode: string;
  invocation_attempt_id?: string | null;
};

class ScriptedP1AgentOrchestrator {
  readonly calls: P1InvocationCall[] = [];

  constructor(
    private readonly script: (
      call: P1InvocationCall,
      index: number,
    ) => TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>,
  ) {}

  async invokeStructuredOutput<T>(input: P1InvocationCall): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    return this.script(input, this.calls.length - 1) as unknown as TopicSelectionAgentInvocationResult<T>;
  }
}

function scriptedServiceFixture(
  script: (
    call: P1InvocationCall,
    index: number,
  ) => TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>,
) {
  const repository = new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new ScriptedP1AgentOrchestrator(script);
  const service = new PaperImplementationP1RuntimeReviewService({
    projectRepository: projectRepositoryFixture(implementationProjectFixture()),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

test('P1 runtime review retries a wrong role_slot_id echo once and lands failed_runtime without HTTP error (S2-C C1)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => invocationResult(
    { ...roleOutput(call.node_id), role_slot_id: 'claim_boundary_review.adjudicator_final' },
    call.node_id,
    call.execution_mode,
  ));
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(orchestrator.calls[1]?.invocation_attempt_id?.endsWith('.retry-1'), true);
  assert.equal(result.runtime_artifacts.length, 1);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_status, 'failed_runtime');
  assert.equal(roleArtifact.runtime_failure_code, 'RUNTIME_ROLE_SLOT_ECHO_MISMATCH');
  assert.equal(roleArtifact.retry_attempt_index, 1);
  assert.equal(roleArtifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.final_runtime_artifact, null);
});

test('P1 runtime review retries blocked-without-codes once and lands failed_runtime before admission rejection (S2-C C1)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => invocationResult(
    { ...roleOutput(call.node_id), role_status: 'blocked', blocker_codes: [] },
    call.node_id,
    call.execution_mode,
  ));
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_status, 'failed_runtime');
  assert.equal(roleArtifact.runtime_failure_code, 'RUNTIME_ROLE_BLOCKED_CODES_MISSING');
  assert.equal(result.admission_records[0]?.issue_codes.includes('RUNTIME_BLOCKER_CODES_MISSING'), false);
  assert.equal(result.admission_records[0]?.issue_codes.includes('RUNTIME_STATUS_FAILED_RUNTIME'), true);
});

test('P1 runtime review token budget counts message-embedded context once (S2-A N3, compression wiring deferred to STEP-7 downstream)', async () => {
  const { service, orchestrator } = serviceFixture();
  await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(orchestrator.calls.length > 0, true);
  for (const call of orchestrator.calls) {
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
  }
});
