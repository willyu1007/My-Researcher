import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_BOUNDARY_DEBATE_SLOT_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
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
    prompt_template_version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
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
  // S3-α2 deepened contract: each role carries its structured section.
  const structured: Partial<PaperImplementationTraceIntegrityRoleOutput> =
    roleSlotId === 'trace_integrity_review.support_mapper_map'
      ? {
        per_statement_support_map: [{
          statement_ref: ref('reviewed_statement', 'statement_001'),
          support_kind: 'direct',
          cited_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
        }],
      }
      : roleSlotId === 'trace_integrity_review.skeptic_challenge'
        ? { challenge_findings: [] }
        : roleSlotId === 'trace_integrity_review.support_mapper_reconcile'
          ? { finding_dispositions: [] }
          : roleSlotId === 'trace_integrity_review.arbiter_final'
            ? {
              coverage: {
                statement_refs: [ref('reviewed_statement', 'statement_001')],
                finding_ids: [],
              },
            }
            : {};
  return {
    role_slot_id: roleSlotId as PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
    role_status: 'passed',
    summary: `No trace-integrity blocker found by ${roleSlotId}.`,
    reviewed_statement_refs: [ref('reviewed_statement', 'statement_001')],
    cited_source_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    blocker_codes: [],
    warning_codes: [],
    ...structured,
  };
}

function telemetry() {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID,
    prompt_template_id: 'paper-implementation-trace-integrity-boundary-debate',
    prompt_template_version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROMPT_TEMPLATE_VERSION,
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

type TraceInvocationCall = {
  node_id: string;
  execution_mode: string;
  invocation_attempt_id?: string | null;
};

class ScriptedTraceIntegrityAgentOrchestrator {
  readonly calls: TraceInvocationCall[] = [];

  constructor(
    private readonly script: (
      call: TraceInvocationCall,
      index: number,
    ) => TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>,
  ) {}

  async invokeStructuredOutput<T>(input: TraceInvocationCall): Promise<TopicSelectionAgentInvocationResult<T>> {
    this.calls.push(input);
    return this.script(input, this.calls.length - 1) as unknown as TopicSelectionAgentInvocationResult<T>;
  }
}

function scriptedServiceFixture(
  script: (
    call: TraceInvocationCall,
    index: number,
  ) => TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>,
  options: {
    repository?: InMemoryPaperImplementationRuntimeRepository;
    idPrefix?: string;
  } = {},
) {
  const repository = options.repository ?? new InMemoryPaperImplementationRuntimeRepository();
  let sequence = 0;
  const idFactory = (prefix: string) => `${options.idPrefix ?? ''}${prefix}_${++sequence}`;
  const runtimeAdmission = new PaperImplementationRuntimeAdmissionService({
    repository,
    idFactory,
    now: () => NOW,
  });
  const orchestrator = new ScriptedTraceIntegrityAgentOrchestrator(script);
  const service = new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: projectRepositoryFixture(implementationProjectFixture()),
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function failedInvocationResult(
  nodeId: string,
  errorCode: string,
): TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput> {
  const base = invocationResult<PaperImplementationTraceIntegrityRoleOutput | null>(null, nodeId, 'provider_llm');
  return {
    ...base,
    status: 'failed',
    structured_output: null,
    error_code: errorCode,
  } as unknown as TopicSelectionAgentInvocationResult<PaperImplementationTraceIntegrityRoleOutput>;
}

test('trace integrity debate runtime retries a wrong role_slot_id echo once and lands failed_runtime without HTTP error (S2-C C1)', async () => {
  // Both attempts of the first role echo a different (schema-legal) role slot.
  const { service, orchestrator } = scriptedServiceFixture((call) => invocationResult(
    { ...roleOutput(call.node_id), role_slot_id: 'trace_integrity_review.arbiter_final' },
    call.node_id,
    call.execution_mode,
  ));
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(orchestrator.calls[1]?.invocation_attempt_id?.endsWith('.retry-1'), true);
  assert.equal(result.runtime_artifacts.length, 1);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_status, 'failed_runtime');
  assert.equal(roleArtifact.runtime_failure_code, 'RUNTIME_ROLE_SLOT_ECHO_MISMATCH');
  assert.equal(roleArtifact.retry_attempt_index, 1);
  assert.equal(roleArtifact.provider_call_count, 2);
  assert.equal(roleArtifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  // No orphan gap: the failed role artifact and its (rejected) admission are
  // both recorded and returned instead of an HTTP 400.
  assert.equal(result.admission_records.length, 1);
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.final_runtime_artifact, null);
});

test('trace integrity debate runtime recovers when the role_slot_id echo is corrected on the retry (S2-C C1)', async () => {
  let firstRoleAttempts = 0;
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    if (call.node_id === 'trace_integrity_review.support_mapper_map') {
      firstRoleAttempts += 1;
      if (firstRoleAttempts === 1) {
        return invocationResult(
          { ...roleOutput(call.node_id), role_slot_id: 'trace_integrity_review.arbiter_final' },
          call.node_id,
          call.execution_mode,
        );
      }
    }
    return invocationResult(roleOutput(call.node_id), call.node_id, call.execution_mode);
  });
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'passed');
  assert.equal(orchestrator.calls.length, 5);
  const firstRole = result.runtime_artifacts[0]!;
  assert.equal(firstRole.runtime_status, 'passed');
  assert.equal(firstRole.retry_attempt_index, 1);
  assert.equal(firstRole.provider_call_count, 2);
  assert.equal(firstRole.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_RECOVERED'), true);
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
});

test('trace integrity debate runtime retries blocked-without-codes once and lands failed_runtime before admission rejection (S2-C C1)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => invocationResult(
    { ...roleOutput(call.node_id), role_status: 'blocked', blocker_codes: [] },
    call.node_id,
    call.execution_mode,
  ));
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_status, 'failed_runtime');
  assert.equal(roleArtifact.runtime_failure_code, 'RUNTIME_ROLE_BLOCKED_CODES_MISSING');
  assert.equal(roleArtifact.retry_attempt_index, 1);
  assert.equal(roleArtifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), true);
  // The admission layer never sees a blocked artifact with an empty
  // blocker_codes list; the technical-failure classification runs first.
  assert.equal(result.admission_records[0]?.issue_codes.includes('RUNTIME_BLOCKER_CODES_MISSING'), false);
  assert.equal(result.admission_records[0]?.issue_codes.includes('RUNTIME_STATUS_FAILED_RUNTIME'), true);
});

test('trace integrity debate runtime does not retry gateway-final UpstreamError at the slot layer (S2-C C1)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => failedInvocationResult(call.node_id, 'UpstreamError'));
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  // The gateway already classified UpstreamError as non-retryable — exactly one
  // slot-level invocation, no full-price second attempt.
  assert.equal(orchestrator.calls.length, 1);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_failure_code, 'UpstreamError');
  assert.equal(roleArtifact.retry_attempt_index, 0);
  assert.equal(roleArtifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'), false);
});

test('trace integrity debate runtime rejects a same-run_id identity replay with 409 (S2-C C2)', async () => {
  const script = (call: TraceInvocationCall) => invocationResult(roleOutput(call.node_id), call.node_id, call.execution_mode);
  const fixture = scriptedServiceFixture(script);
  const first = await fixture.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(first.status, 'passed');

  // Same repository, same run_id, same inputs — the runtimeIdentityHash unique
  // constraint turns the replay into a 409 VERSION_CONFLICT instead of forking
  // a second row per artifact.
  const replayService = new PaperImplementationTraceIntegrityDebateRuntimeService({
    projectRepository: projectRepositoryFixture(implementationProjectFixture()),
    runtimeAdmission: new PaperImplementationRuntimeAdmissionService({
      repository: fixture.repository,
      idFactory: (prefix) => `${prefix}_replay_${Math.random().toString(16).slice(2)}`,
      now: () => NOW,
    }),
    agentOrchestrator: new ScriptedTraceIntegrityAgentOrchestrator(script),
    idFactory: (prefix) => `${prefix}_replay_${Math.random().toString(16).slice(2)}`,
    now: () => NOW,
  });
  await assert.rejects(
    () => replayService.runBoundaryDebate(PROJECT_ID, providerRequest()),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );

  // A fresh run_id (legitimate re-run / re-advance) never collides.
  const rerun = await replayService.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'trace_debate_run_002',
  });
  assert.equal(rerun.status, 'passed');
});

test('trace integrity debate runtime token budget counts message-embedded context once (S2-A N3, compression wiring deferred to STEP-7 downstream)', async () => {
  const { service, orchestrator } = serviceFixture();
  await service.runBoundaryDebate(PROJECT_ID, providerRequest());

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

// ---------------------------------------------------------------------------
// T-124 S3-α2/α3: deepened role contract + semantic completeness (review N2)
// ---------------------------------------------------------------------------

function skepticFindingFixture() {
  return {
    finding_id: 'finding_001',
    severity: 'blocker' as const,
    blocker_code: 'semantic_support_gap',
    target_statement_ref: ref('reviewed_statement', 'statement_001'),
    cited_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
  };
}

test('trace integrity debate runtime retries a missing per_statement_support_map once and lands failed_runtime (S3-α2)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    const output = roleOutput(call.node_id);
    if (call.node_id === 'trace_integrity_review.support_mapper_map') {
      delete output.per_statement_support_map;
    }
    return invocationResult(output, call.node_id, call.execution_mode);
  });
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  const roleArtifact = result.runtime_artifacts[0]!;
  assert.equal(roleArtifact.runtime_failure_code, 'RUNTIME_ROLE_STRUCTURED_OUTPUT_INCOMPLETE');
  assert.equal(roleArtifact.retry_attempt_index, 1);
  assert.equal(result.final_runtime_artifact, null);
});

test('trace integrity debate runtime rejects cited refs outside the retrieval packet as retryable semantic failure (S3-α3)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    const output = roleOutput(call.node_id);
    if (call.node_id === 'trace_integrity_review.support_mapper_map') {
      output.cited_source_refs = [ref('run_evidence_unit', 'invented_evidence_999')];
    }
    return invocationResult(output, call.node_id, call.execution_mode);
  });
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 2);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'RUNTIME_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET');
});

test('trace integrity debate runtime requires exactly one reconcile disposition per skeptic finding (S3-α3)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    const output = roleOutput(call.node_id);
    if (call.node_id === 'trace_integrity_review.skeptic_challenge') {
      output.role_status = 'blocked';
      output.blocker_codes = ['semantic_support_gap'];
      output.challenge_findings = [skepticFindingFixture()];
    }
    // Reconcile keeps its default empty finding_dispositions — the skeptic
    // finding is silently dropped, which must fail the disposition check.
    return invocationResult(output, call.node_id, call.execution_mode);
  });
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  // Two roles executed cleanly, reconcile retried once then failed.
  assert.equal(orchestrator.calls.length, 4);
  const reconcileArtifact = result.runtime_artifacts[2]!;
  assert.equal(reconcileArtifact.role_slot_id, 'trace_integrity_review.support_mapper_reconcile');
  assert.equal(reconcileArtifact.runtime_failure_code, 'RUNTIME_ROLE_FINDING_DISPOSITION_INVALID');
  assert.equal(result.final_runtime_artifact, null);
});

test('trace integrity debate runtime runs structural checks on blocked outputs too (S3-α3, N2 bypass closed)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    const output = roleOutput(call.node_id);
    if (call.node_id === 'trace_integrity_review.skeptic_challenge') {
      // Blocked verdict with fabricated codes but ZERO structured findings —
      // previously this bypassed every structural constraint.
      output.role_status = 'blocked';
      output.blocker_codes = ['fabricated_blocker_code'];
      output.challenge_findings = [];
    }
    return invocationResult(output, call.node_id, call.execution_mode);
  });
  const result = await service.runBoundaryDebate(PROJECT_ID, providerRequest());

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 3);
  const skepticArtifact = result.runtime_artifacts[1]!;
  assert.equal(skepticArtifact.runtime_failure_code, 'RUNTIME_ROLE_STRUCTURED_OUTPUT_INCOMPLETE');
  assert.equal(skepticArtifact.runtime_status, 'failed_runtime');
  assert.equal(result.final_runtime_artifact, null);
});

test('trace integrity debate runtime requires arbiter coverage over every finding and accepted blockers in the final set (S3-α3)', async () => {
  const chainWithFinding = (arbiterMutation: (output: PaperImplementationTraceIntegrityRoleOutput) => void) =>
    scriptedServiceFixture((call) => {
      const output = roleOutput(call.node_id);
      if (call.node_id === 'trace_integrity_review.skeptic_challenge') {
        output.role_status = 'blocked';
        output.blocker_codes = ['semantic_support_gap'];
        output.challenge_findings = [skepticFindingFixture()];
      }
      if (call.node_id === 'trace_integrity_review.support_mapper_reconcile') {
        output.finding_dispositions = [{
          finding_id: 'finding_001',
          disposition: 'accepted_blocker',
          cited_refs: [],
        }];
      }
      if (call.node_id === 'trace_integrity_review.arbiter_final') {
        output.role_status = 'blocked';
        output.blocker_codes = ['semantic_support_gap'];
        output.coverage = {
          statement_refs: [ref('reviewed_statement', 'statement_001')],
          finding_ids: ['finding_001'],
        };
        arbiterMutation(output);
      }
      return invocationResult(output, call.node_id, call.execution_mode);
    });

  // Coverage missing the skeptic finding id.
  const missingCoverage = chainWithFinding((output) => {
    output.coverage = { statement_refs: [ref('reviewed_statement', 'statement_001')], finding_ids: [] };
  });
  const missingCoverageResult = await missingCoverage.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(missingCoverageResult.status, 'failed_runtime');
  assert.equal(missingCoverageResult.runtime_artifacts[3]?.runtime_failure_code, 'RUNTIME_ROLE_COVERAGE_INCOMPLETE');

  // Accepted blocker finding whose blocker_code is missing from the arbiter set.
  const droppedBlocker = chainWithFinding((output) => {
    output.blocker_codes = [];
    output.role_status = 'passed';
  });
  const droppedBlockerResult = await droppedBlocker.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(droppedBlockerResult.status, 'failed_runtime');
  assert.equal(droppedBlockerResult.runtime_artifacts[3]?.runtime_failure_code, 'RUNTIME_ROLE_COVERAGE_INCOMPLETE');

  // Structure-complete blocked chain still admits a blocked final.
  const completeBlocked = chainWithFinding(() => {});
  const blockedResult = await completeBlocked.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(blockedResult.status, 'blocked');
  assert.equal(blockedResult.final_admission_record?.admission_status, 'admitted');
  assert.equal(blockedResult.blocker_codes.includes('semantic_support_gap'), true);
});

// ---------------------------------------------------------------------------
// T-124 S3-α1: D9 resume contract
// ---------------------------------------------------------------------------

function successScript(call: TraceInvocationCall) {
  return invocationResult(roleOutput(call.node_id), call.node_id, call.execution_mode);
}

async function interruptedRunFixture() {
  // Roles 1-2 admitted; reconcile fails both attempts with a transient error.
  const first = scriptedServiceFixture((call) => {
    if (call.node_id === 'trace_integrity_review.support_mapper_reconcile') {
      return failedInvocationResult(call.node_id, 'TimeoutError');
    }
    return successScript(call);
  });
  const run = await first.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(run.status, 'failed_runtime');
  assert.equal(first.orchestrator.calls.length, 4);
  return { first, run };
}

test('trace integrity debate runtime resume reuses the admitted prefix without provider re-issue (S3-α1 D9)', async () => {
  const { first, run } = await interruptedRunFixture();
  const admittedPrefixIds = run.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id);

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_',
  });
  const resumed = await resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: null,
    resume_from_run_id: 'trace_debate_run_001',
  });

  assert.equal(resumed.status, 'passed');
  assert.equal(resumed.run_id, 'trace_debate_run_001');
  // Zero provider re-issue for the admitted prefix: only the two remaining roles run.
  assert.deepEqual(resumeFixture.orchestrator.calls.map((call) => call.node_id), [
    'trace_integrity_review.support_mapper_reconcile',
    'trace_integrity_review.arbiter_final',
  ]);
  // The reused prefix is the ORIGINAL artifacts — not rewritten.
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id),
    admittedPrefixIds,
  );
  // Newly executed roles take the run's next call indexes (failed reconcile held 3).
  const roleArtifacts = resumed.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.call_index), [1, 2, 4, 5]);
  assert.equal(resumed.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(resumed.final_admission_record?.admission_status, 'admitted');
  // The final chains exactly onto reused prefix + new roles.
  assert.deepEqual(
    resumed.final_runtime_artifact?.prior_role_artifact_hashes,
    roleArtifacts.map((artifact) => artifact.artifact_payload_hash),
  );
});

test('trace integrity debate runtime resume rejects identity drift with 409 and no provider calls (S3-α1 D9)', async () => {
  const { first } = await interruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_drift_',
  });

  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: null,
      resume_from_run_id: 'trace_debate_run_001',
      source_hashes: [hash('drifted-run-evidence-unit')],
      source_packets: undefined,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('trace integrity debate runtime resume rejects unknown runs, foreign run ids, and run_id conflicts (S3-α1 D9)', async () => {
  const { first } = await interruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_reject_',
  });

  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: null,
      resume_from_run_id: 'trace_debate_run_does_not_exist',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );

  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'a_different_run_id',
      resume_from_run_id: 'trace_debate_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 400
      && error.errorCode === 'INVALID_PAYLOAD',
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('trace integrity debate runtime resume of a completed run returns the original final idempotently (S3-α1 D9)', async () => {
  const first = scriptedServiceFixture(successScript);
  const run = await first.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(run.status, 'passed');

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_idempotent_',
  });
  const resumed = await resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: null,
    resume_from_run_id: 'trace_debate_run_001',
  });

  assert.equal(resumeFixture.orchestrator.calls.length, 0);
  assert.equal(resumed.status, 'passed');
  assert.equal(
    resumed.final_runtime_artifact?.runtime_artifact_id,
    run.final_runtime_artifact?.runtime_artifact_id,
  );
  assert.equal(
    resumed.final_admission_record?.admission_record_id,
    run.final_admission_record?.admission_record_id,
  );
  assert.equal(resumed.runtime_artifacts.length, 5);
});

// ---------------------------------------------------------------------------
// T-124 S3 F1: resume hardening (run-ownership, model-option, version pinning,
// fail-closed chain)
// ---------------------------------------------------------------------------

type StoredRuntimeArtifactMap = Map<string, {
  artifact_scope: string;
  prompt_template_version_id: string;
  prior_role_artifact_hashes: string[];
  artifact_payload_ref: { ref_id: string };
}>;

function storedRuntimeArtifacts(repository: InMemoryPaperImplementationRuntimeRepository): StoredRuntimeArtifactMap {
  return (repository as unknown as { runtimeArtifacts: StoredRuntimeArtifactMap }).runtimeArtifacts;
}

function rewriteStoredPromptVersion(
  repository: InMemoryPaperImplementationRuntimeRepository,
  runId: string,
  version: string,
): void {
  let rewritten = 0;
  for (const artifact of storedRuntimeArtifacts(repository).values()) {
    if (artifact.artifact_payload_ref.ref_id.startsWith(`${runId}.`)) {
      artifact.prompt_template_version_id = version;
      rewritten += 1;
    }
  }
  assert.ok(rewritten > 0, 'expected at least one stored artifact to rewrite');
}

function corruptFinalChain(repository: InMemoryPaperImplementationRuntimeRepository, runId: string): void {
  const final = [...storedRuntimeArtifacts(repository).values()].find(
    (artifact) => artifact.artifact_scope === 'final' && artifact.artifact_payload_ref.ref_id === `${runId}.final`,
  );
  assert.ok(final, 'expected a stored final artifact for the run');
  final.prior_role_artifact_hashes = [...final.prior_role_artifact_hashes, 'bogus-unresolvable-role-hash'];
}

function resumeIssueCodes(error: unknown): string[] {
  if (error instanceof AppError && error.details && Array.isArray(error.details.resume_issue_codes)) {
    return error.details.resume_issue_codes as string[];
  }
  return [];
}

test('trace integrity debate runtime resume does not absorb a sibling run whose id extends this run id (S3 F1-1)', async () => {
  const { first, run } = await interruptedRunFixture();
  const parentPrefixIds = run.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id);

  // A sibling run whose id starts with `${parent}.` (run_id dots are legal) is
  // completed on the SAME repository. A bare prefix match would let the parent
  // absorb the sibling's same-role artifacts; the dotless-suffix ownership rule
  // keeps the two runs separate.
  const siblingFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'sibling_',
  });
  const sibling = await siblingFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'trace_debate_run_001.retry',
    resume_from_run_id: null,
  });
  assert.equal(sibling.status, 'passed');

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_sibling_',
  });
  const resumed = await resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: null,
    resume_from_run_id: 'trace_debate_run_001',
  });

  assert.equal(resumed.status, 'passed');
  // Only the parent's two remaining roles run — the sibling is never pulled in.
  assert.deepEqual(resumeFixture.orchestrator.calls.map((call) => call.node_id), [
    'trace_integrity_review.support_mapper_reconcile',
    'trace_integrity_review.arbiter_final',
  ]);
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id),
    parentPrefixIds,
  );
});

test('trace integrity debate runtime resume inherits the recorded model option when omitted (S3 F1-2)', async () => {
  const { first } = await interruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_inherit_',
  });
  const resumed = await resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: null,
    resume_from_run_id: 'trace_debate_run_001',
    model_option_id: null,
  });

  assert.equal(resumed.status, 'passed');
  const recordedOption = `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-balanced`;
  // Newly executed roles inherit the recorded run's option rather than drifting to null.
  const optionsSeen = resumeFixture.orchestrator.calls.map(
    (call) => (call as unknown as { model_option_id?: string | null }).model_option_id,
  );
  assert.deepEqual(optionsSeen, [recordedOption, recordedOption]);
});

test('trace integrity debate runtime resume rejects an explicit model option that drifts from the recorded run (S3 F1-2)', async () => {
  const { first } = await interruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_optdrift_',
  });

  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: null,
      resume_from_run_id: 'trace_debate_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_PROFILE_ID}.openai-fast`,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && resumeIssueCodes(error).includes('RESUME_MODEL_OPTION_DRIFT'),
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('trace integrity debate runtime resume of a run completed under an earlier prompt version replays idempotently (S3 F1-3)', async () => {
  const first = scriptedServiceFixture(successScript);
  const run = await first.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(run.status, 'passed');

  // Simulate a run recorded under an earlier prompt template version: the
  // idempotent replay path must not pin to the current constant, only require the
  // reused chain to share the final's (older) prompt identity.
  rewriteStoredPromptVersion(first.repository, 'trace_debate_run_001', 'v0-legacy');

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_v0_',
  });
  const resumed = await resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
    ...providerRequest(),
    run_id: null,
    resume_from_run_id: 'trace_debate_run_001',
  });

  assert.equal(resumeFixture.orchestrator.calls.length, 0);
  assert.equal(resumed.status, 'passed');
  assert.equal(
    resumed.final_runtime_artifact?.runtime_artifact_id,
    run.final_runtime_artifact?.runtime_artifact_id,
  );
});

test('trace integrity debate runtime resume of a partial prefix under an earlier prompt version is rejected on continue (S3 F1-3)', async () => {
  const { first } = await interruptedRunFixture();
  // The continue-execution path still pins prompt identity to the current constant,
  // so a v1-prefix + v2-suffix mixed chain is rejected before any provider call.
  rewriteStoredPromptVersion(first.repository, 'trace_debate_run_001', 'v0-legacy');

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_v0prefix_',
  });
  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: null,
      resume_from_run_id: 'trace_debate_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && resumeIssueCodes(error).includes('RESUME_PROMPT_IDENTITY_DRIFT'),
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('trace integrity debate runtime resume of a completed run whose final chain no longer resolves fails closed (S3 F1-4)', async () => {
  const first = scriptedServiceFixture(successScript);
  const run = await first.service.runBoundaryDebate(PROJECT_ID, providerRequest());
  assert.equal(run.status, 'passed');
  corruptFinalChain(first.repository, 'trace_debate_run_001');

  const resumeFixture = scriptedServiceFixture(successScript, {
    repository: first.repository,
    idPrefix: 'resume_broken_',
  });
  await assert.rejects(
    () => resumeFixture.service.runBoundaryDebate(PROJECT_ID, {
      ...providerRequest(),
      run_id: null,
      resume_from_run_id: 'trace_debate_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && resumeIssueCodes(error).includes('RESUME_FINAL_CHAIN_BROKEN'),
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});
