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
import {
  buildClaimCandidateProposal,
  buildDossierReadinessProposal,
} from './paper-implementation-p1-proposal-test-fixtures.js';
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
    // T-124 G4.6 structural context: every id the service assembles into the
    // Create*Request is a declared source ref (never LLM-transcribed).
    source_refs: claim
      ? [
        ref('result_interpretation_packet', 'result_packet_001'),
        ref('claim_trace_packet', 'claim_trace_packet_001'),
        ref('claim_candidate', 'claim_candidate_001'),
        ref('trace_manifest', 'trace_manifest_claim_001'),
        ref('human_confirmation_record', 'human_confirmation_001'),
        ref('run_evidence_unit', 'run_evidence_unit_001'),
      ]
      : [
        ref('claim_candidate', 'claim_candidate_001'),
        ref('claim_trace_packet', 'claim_trace_packet_001'),
        ref('result_interpretation_packet', 'result_packet_001'),
        ref('trace_manifest', 'trace_manifest_dossier_001'),
        ref('gate_result', 'gate_result_dossier_001'),
      ],
    source_hashes: claim
      ? [
        hash('result-packet'),
        hash('claim-trace-packet'),
        hash('claim-candidate'),
        hash('trace-manifest-claim'),
        hash('human-confirmation'),
        hash('run-evidence'),
      ]
      : [
        hash('claim-candidate'),
        hash('claim-trace-packet'),
        hash('result-packet'),
        hash('trace-manifest-dossier'),
        hash('gate-result'),
      ],
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
    // T-124 G4.6: the final adjudicator proposes typed SEMANTIC content only;
    // the service assembles the Create*Request from the request context.
    claim_proposal: final && claim ? claimProposal() : null,
    dossier_proposal: final && !claim ? dossierProposal() : null,
    scenario_outputs: final && !claim
      ? [{ scenario_id: 'ready_for_writing', disposition: 'preferred' }]
      : [],
  };
}

/** The claim adjudicator's typed semantic proposal (assembly input). */
function claimProposal(): NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['claim_proposal']> {
  return buildClaimCandidateProposal({
    claim_statement: 'Bounded parity claim within the probed scale and committed task set.',
    support_refs: [ref('run_evidence_unit', 'run_evidence_unit_001')],
    scope: {
      population_scope: 'RoBERTa-base class Transformer language model.',
      method_scope: 'Low-rank adaptation r=8 vs reproduced full fine-tuning.',
      dataset_scope: 'Committed GLUE subset.',
      metric_scope: 'Per-task primary metric, trainable parameter count, inference latency.',
      negative_scope_notes: [],
      excluded_scope_notes: ['No claim of superiority over other adaptation methods.'],
    },
    forbidden_overclaims: ['universal superiority over all adaptation methods on all tasks'],
  });
}

/** The dossier adjudicator's typed semantic proposal (assembly input). */
function dossierProposal(): NonNullable<PaperImplementationP1RuntimeReviewRoleOutput['dossier_proposal']> {
  return buildDossierReadinessProposal({
    experiment_limitations: ['Results are at the probed scale on the committed tasks only.'],
    admitted_claim_refs: [ref('claim_candidate', 'claim_candidate_001')],
    forbidden_overclaims: ['universal superiority over all adaptation methods on all tasks'],
    readiness_notes: ['Single confirmatory run set; nothing outstanding for N7 reconciliation.'],
  });
}

/**
 * T-124 S3 F5-1 (narrowed by G4.6): the provider wire shape — canonical role
 * output with `scenario_outputs` replaced by its JSON-string carrier. The typed
 * proposal blocks ride the wire directly. Pass `overrideScenarioJsons` to
 * inject malformed carriers.
 */
function p1WireOutput(nodeId: string, overrideScenarioJsons?: string[]): Record<string, unknown> {
  const { scenario_outputs: scenarios, ...rest } = roleOutput(nodeId);
  return {
    ...rest,
    scenario_output_jsons: overrideScenarioJsons
      ?? (scenarios ?? []).map((scenario) => JSON.stringify(scenario)),
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
  schema_name?: string;
  messages?: Array<{ role: 'system' | 'user'; content: string }>;
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

test('T-124 G4.6: P1 assembles the domain_gate_request deterministically from request context + the adjudicator proposal', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => invocationResult(
    p1WireOutput(call.node_id) as unknown as PaperImplementationP1RuntimeReviewRoleOutput,
    call.node_id,
    call.execution_mode,
  ));
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'passed');
  // Provider mode still sends the wire schema (scenario_output_jsons carrier).
  assert.equal(orchestrator.calls[0]?.schema_name, 'paper_implementation_p1_runtime_review_role_wire');
  const finalDomainGate = result.final_runtime_artifact?.artifact_payload.domain_gate_request as Record<string, unknown> | null;
  assert.ok(finalDomainGate);
  // Structural fields come from the request context (declared source refs).
  assert.equal(finalDomainGate?.claim_candidate_id, 'claim_candidate_001');
  assert.equal(finalDomainGate?.trace_manifest_id, 'trace_manifest_claim_001');
  assert.equal(finalDomainGate?.claim_trace_packet_id, 'claim_trace_packet_001');
  assert.deepEqual(finalDomainGate?.result_interpretation_packet_ids, ['result_packet_001']);
  const boundary = finalDomainGate?.boundary as Record<string, unknown>;
  assert.equal((boundary.human_confirmation_ref as { ref_id: string }).ref_id, 'human_confirmation_001');
  // Semantic fields come verbatim from the adjudicator's typed proposal.
  assert.equal(finalDomainGate?.claim_statement, 'Bounded parity claim within the probed scale and committed task set.');
  assert.equal(finalDomainGate?.claim_strength, 'strong');
  assert.equal(finalDomainGate?.created_by, 'llm');
  // No wire residue leaks into the recorded artifacts.
  const serialized = stableStringify(result);
  assert.equal(serialized.includes('domain_gate_request_json'), false);
  assert.equal(serialized.includes('scenario_output_jsons'), false);
});

test('T-124 S3 F5-1: P1 fails closed when a provider wire scenario carrier cannot be parsed', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    if (call.node_id === 'dossier_readiness_prep.scenario_adjudicator_final') {
      return invocationResult(
        p1WireOutput(call.node_id, ['{ not valid json']) as unknown as PaperImplementationP1RuntimeReviewRoleOutput,
        call.node_id,
        call.execution_mode,
      );
    }
    return invocationResult(
      p1WireOutput(call.node_id) as unknown as PaperImplementationP1RuntimeReviewRoleOutput,
      call.node_id,
      call.execution_mode,
    );
  });
  const result = await service.runDossierReadinessAudit(PROJECT_ID, providerRequest('dossier'));

  // The two prefix roles canonicalize fine; the final role's malformed carrier
  // retries once (technical failure) then lands failed_runtime — never a 400.
  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 4);
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'RUNTIME_WIRE_JSON_DECODE_FAILED');
  assert.equal(failedArtifact?.retry_attempt_index, 1);
});

test('T-124 G4.6: P1 adjudicator fails closed (retryable) when a passed adjudicator omits its semantic proposal', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    if (call.node_id === 'claim_boundary_review.adjudicator_final') {
      return invocationResult(
        { ...roleOutput(call.node_id), claim_proposal: null },
        call.node_id,
        call.execution_mode,
      );
    }
    return p1SuccessScript(call);
  });
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  assert.equal(orchestrator.calls.length, 4);
  assert.equal(result.final_runtime_artifact, null);
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOMAIN_GATE_REQUEST_MISSING');
  assert.equal(failedArtifact?.retry_attempt_index, 1);
});

test('T-124 G5 FIX-A item 4: an adjudicator support selection of interpretation refs only fails closed (no REU floor)', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    if (call.node_id === 'claim_boundary_review.adjudicator_final') {
      // Run 012 live signature: the adjudicator cited only the interpretation
      // packet in support_refs. The retired REU floor no longer rescues it — the
      // service never endorses evidence, so the slot fails closed (retryable).
      return invocationResult(
        {
          ...roleOutput(call.node_id),
          claim_proposal: {
            ...claimProposal(),
            support_refs: [ref('result_interpretation_packet', 'result_packet_001')],
          },
        },
        call.node_id,
        call.execution_mode,
      );
    }
    return p1SuccessScript(call);
  });
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  // The adjudicator retries once then lands failed_runtime (2 prefix + 2 adjudicator).
  assert.equal(orchestrator.calls.length, 4);
  assert.equal(result.final_runtime_artifact, null);
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOMAIN_GATE_REQUEST_MISSING');
  assert.equal(failedArtifact?.retry_attempt_index, 1);
});

test('T-124 G4.5 Fix 2 (under G4.6 assembly): P1 adjudicator fails closed (retryable) when the ASSEMBLED request cannot satisfy the target Create schema', async () => {
  const { service, orchestrator } = scriptedServiceFixture((call) => {
    if (call.node_id === 'claim_boundary_review.adjudicator_final') {
      // Semantic content present but schema-invalid: empty claim_statement (with
      // a valid evidence support so the item-4 MISSING pre-check does not fire) —
      // the assembled request fails the ajv pre-check as MALFORMED.
      return invocationResult(
        {
          ...roleOutput(call.node_id),
          claim_proposal: { ...claimProposal(), claim_statement: '' },
        },
        call.node_id,
        call.execution_mode,
      );
    }
    return p1SuccessScript(call);
  });
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  // Prefix roles admit; the adjudicator retries once then lands failed_runtime.
  assert.equal(orchestrator.calls.length, 4);
  assert.equal(result.final_runtime_artifact, null);
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOMAIN_GATE_REQUEST_MALFORMED');
  assert.equal(failedArtifact?.retry_attempt_index, 1);
});

test('T-124 G5 FIX-A item 3: a claim proposal support ref outside the declared source refs fails closed (retryable)', async () => {
  const { service } = scriptedServiceFixture((call) => {
    if (call.node_id === 'claim_boundary_review.adjudicator_final') {
      return invocationResult(
        {
          ...roleOutput(call.node_id),
          claim_proposal: {
            ...claimProposal(),
            // A model-invented REU that is not among the declared source refs.
            support_refs: [ref('run_evidence_unit', 'phantom_reu_999')],
          },
        },
        call.node_id,
        call.execution_mode,
      );
    }
    return p1SuccessScript(call);
  });
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));

  assert.equal(result.status, 'failed_runtime');
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_CLAIM_PROPOSAL_REFS_UNFENCED');
});

test('T-124 G5 FIX-A item 2: a strong claim with no human-confirmation ref in the context fails closed (retryable)', async () => {
  const { service } = scriptedServiceFixture(p1SuccessScript);
  const request = providerRequest('claim');
  const confirmationIndex = request.source_refs.findIndex((item) => item.ref_type === 'human_confirmation_record');
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, {
    ...request,
    run_id: 'claim_boundary_strong_no_confirmation_run_001',
    source_refs: request.source_refs.filter((_, index) => index !== confirmationIndex),
    source_hashes: request.source_hashes.filter((_, index) => index !== confirmationIndex),
  });

  assert.equal(result.status, 'failed_runtime');
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_CLAIM_STRENGTH_CONFIRMATION_MISSING');
});

test('T-124 G5 FIX-A item 1: a parked dossier proposal with no reopen_condition fails closed (retryable)', async () => {
  const { service } = scriptedServiceFixture((call) => {
    if (call.node_id === 'dossier_readiness_prep.scenario_adjudicator_final') {
      return invocationResult(
        {
          ...roleOutput(call.node_id),
          dossier_proposal: {
            ...dossierProposal(),
            dossier_status: 'parked_with_reopen_condition',
            // reopen_condition intentionally omitted — inexpressible disposition.
          },
        },
        call.node_id,
        call.execution_mode,
      );
    }
    return p1SuccessScript(call);
  });
  const result = await service.runDossierReadinessAudit(PROJECT_ID, providerRequest('dossier'));

  assert.equal(result.status, 'failed_runtime');
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOSSIER_DISPOSITION_INCOMPLETE');
});

test('T-124 G5 FIX-A item 2: a ready dossier with no readiness gate ref in the context fails closed (retryable)', async () => {
  const { service } = scriptedServiceFixture(p1SuccessScript);
  const request = providerRequest('dossier');
  const gateIndex = request.source_refs.findIndex((item) => item.ref_type === 'gate_result');
  const result = await service.runDossierReadinessAudit(PROJECT_ID, {
    ...request,
    run_id: 'dossier_readiness_no_gate_run_001',
    source_refs: request.source_refs.filter((_, index) => index !== gateIndex),
    source_hashes: request.source_hashes.filter((_, index) => index !== gateIndex),
  });

  assert.equal(result.status, 'failed_runtime');
  const failedArtifact = result.runtime_artifacts.find((artifact) => artifact.runtime_status === 'failed_runtime');
  assert.equal(failedArtifact?.runtime_failure_code, 'P1_DOSSIER_READINESS_GATE_MISSING');
});

test('T-124 G4.6: P1 rejects an incomplete Domain Gate structural context with 400 before any provider call', async () => {
  const { service, orchestrator } = scriptedServiceFixture(p1SuccessScript);
  const request = providerRequest('claim');
  await assert.rejects(
    () => service.runClaimBoundaryDebate(PROJECT_ID, {
      ...request,
      run_id: 'claim_boundary_missing_context_run_001',
      source_refs: request.source_refs.filter((item) => item.ref_type !== 'claim_candidate'),
      source_hashes: request.source_hashes.slice(0, request.source_refs.length - 1),
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /claim_candidate/.test(error.message),
  );
  const dossierRequest = providerRequest('dossier');
  await assert.rejects(
    () => service.runDossierReadinessAudit(PROJECT_ID, {
      ...dossierRequest,
      run_id: 'dossier_missing_context_run_001',
      target_ref: ref('claim_candidate', 'claim_candidate_001'),
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /implementation_dossier/.test(error.message),
  );
  assert.equal(orchestrator.calls.length, 0);
});

test('T-124 G4.5 Fix 1: P1 injects hash-fenced source_context_packets and target-schema guidance into the role prompt', async () => {
  const { service, orchestrator } = scriptedServiceFixture(p1SuccessScript);
  const request = providerRequest('claim');
  const result = await service.runClaimBoundaryDebate(PROJECT_ID, {
    ...request,
    source_context_packets: [
      {
        source_ref: request.source_refs[0]!,
        source_hash: request.source_hashes[0]!,
        evidence_kind: 'result_interpretation_packet',
        content_summary: 'Materialized packet: bounded parity claim ceiling strong.',
        key_facts: ['allowed_claim_ceiling strong', 'forbidden overclaims present'],
      },
    ],
  });

  assert.equal(result.status, 'passed');
  const userMessage = orchestrator.calls[0]?.messages?.find((message) => message.role === 'user')?.content ?? '';
  assert.match(userMessage, /source_context_packets/);
  assert.match(userMessage, /bounded parity claim ceiling strong/);
  const systemMessage = orchestrator.calls[0]?.messages?.[0]?.content ?? '';
  assert.match(systemMessage, /claim_proposal/);
  assert.match(systemMessage, /Do not emit a request envelope/);
});

test('T-124 G4.5 Fix 1: P1 rejects a source_context_packet whose hash does not match the declared source', async () => {
  const { service } = scriptedServiceFixture(p1SuccessScript);
  const request = providerRequest('claim');
  await assert.rejects(
    () => service.runClaimBoundaryDebate(PROJECT_ID, {
      ...request,
      source_context_packets: [
        {
          source_ref: request.source_refs[0]!,
          source_hash: hash('a-different-body'),
          evidence_kind: 'result_interpretation_packet',
          content_summary: 'body',
          key_facts: [],
        },
      ],
    }),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /source_hash .* does not match/.test(error.message),
  );
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

// ---------------------------------------------------------------------------
// T-124 S3-α1: D9 resume contract (P1 review, 3-role chain)
// ---------------------------------------------------------------------------

function p1SuccessScript(call: P1InvocationCall) {
  return invocationResult(roleOutput(call.node_id), call.node_id, call.execution_mode);
}

function p1FailedInvocationResult(
  nodeId: string,
  errorCode: string,
): TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput> {
  const base = invocationResult<PaperImplementationP1RuntimeReviewRoleOutput | null>(null, nodeId, 'provider_llm');
  return {
    ...base,
    status: 'failed',
    structured_output: null,
    error_code: errorCode,
  } as unknown as TopicSelectionAgentInvocationResult<PaperImplementationP1RuntimeReviewRoleOutput>;
}

async function p1InterruptedRunFixture() {
  // Roles 1-2 admitted; the adjudicator fails both attempts transiently.
  const first = scriptedServiceFixture((call) => {
    if (call.node_id === 'claim_boundary_review.adjudicator_final') {
      return p1FailedInvocationResult(call.node_id, 'TimeoutError');
    }
    return p1SuccessScript(call);
  });
  const run = await first.service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));
  assert.equal(run.status, 'failed_runtime');
  assert.equal(first.orchestrator.calls.length, 4);
  return { first, run };
}

test('P1 runtime review resume reuses the admitted prefix without provider re-issue (S3-α1 D9)', async () => {
  const { first, run } = await p1InterruptedRunFixture();
  const admittedPrefixIds = run.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id);

  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_',
  });
  const resumed = await resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    run_id: null,
    resume_from_run_id: 'claim_boundary_run_001',
  });

  assert.equal(resumed.status, 'passed');
  assert.equal(resumed.run_id, 'claim_boundary_run_001');
  assert.deepEqual(resumeFixture.orchestrator.calls.map((call) => call.node_id), [
    'claim_boundary_review.adjudicator_final',
  ]);
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id),
    admittedPrefixIds,
  );
  const roleArtifacts = resumed.runtime_artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  // Failed adjudicator held call index 3 — the resumed one takes 4.
  assert.deepEqual(roleArtifacts.map((artifact) => artifact.call_index), [1, 2, 4]);
  assert.equal(resumed.final_admission_record?.admission_status, 'admitted');
  assert.deepEqual(
    resumed.final_runtime_artifact?.prior_role_artifact_hashes,
    roleArtifacts.map((artifact) => artifact.artifact_payload_hash),
  );
});

test('P1 runtime review resume rejects identity drift, unknown runs, and slot mismatch (S3-α1 D9)', async () => {
  const { first } = await p1InterruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_reject_',
  });

  // Identity drift: different source hashes -> 409, zero provider calls.
  await assert.rejects(
    () => resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: null,
      resume_from_run_id: 'claim_boundary_run_001',
      source_hashes: [
        hash('drifted-result-packet'),
        hash('claim-trace-packet'),
        hash('claim-candidate'),
        hash('trace-manifest-claim'),
        hash('human-confirmation'),
        hash('run-evidence'),
      ],
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );

  // Unknown run -> 404.
  await assert.rejects(
    () => resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: null,
      resume_from_run_id: 'p1_run_that_never_existed',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 404
      && error.errorCode === 'NOT_FOUND',
  );

  // Slot mismatch: resuming a claim-boundary run through the dossier endpoint -> 409.
  await assert.rejects(
    () => resumeFixture.service.runDossierReadinessAudit(PROJECT_ID, {
      ...providerRequest('dossier'),
      run_id: null,
      resume_from_run_id: 'claim_boundary_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('P1 runtime review resume of a completed run returns the original final idempotently (S3-α1 D9)', async () => {
  const first = scriptedServiceFixture(p1SuccessScript);
  const run = await first.service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));
  assert.equal(run.status, 'passed');

  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_idempotent_',
  });
  const resumed = await resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    run_id: null,
    resume_from_run_id: 'claim_boundary_run_001',
  });

  assert.equal(resumeFixture.orchestrator.calls.length, 0);
  assert.equal(resumed.status, 'passed');
  assert.equal(
    resumed.final_runtime_artifact?.runtime_artifact_id,
    run.final_runtime_artifact?.runtime_artifact_id,
  );
  assert.equal(resumed.runtime_artifacts.length, 4);
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

test('P1 runtime review resume does not absorb a sibling run whose id extends this run id (S3 F1-1)', async () => {
  const { first, run } = await p1InterruptedRunFixture();
  const parentPrefixIds = run.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id);

  const siblingFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'sibling_',
  });
  const sibling = await siblingFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    run_id: 'claim_boundary_run_001.retry',
    resume_from_run_id: null,
  });
  assert.equal(sibling.status, 'passed');

  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_sibling_',
  });
  const resumed = await resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    run_id: null,
    resume_from_run_id: 'claim_boundary_run_001',
  });

  assert.equal(resumed.status, 'passed');
  // Only the parent's remaining adjudicator role runs — the sibling is not pulled in.
  assert.deepEqual(resumeFixture.orchestrator.calls.map((call) => call.node_id), [
    'claim_boundary_review.adjudicator_final',
  ]);
  assert.deepEqual(
    resumed.runtime_artifacts.slice(0, 2).map((artifact) => artifact.runtime_artifact_id),
    parentPrefixIds,
  );
});

test('P1 runtime review resume rejects an explicit model option that drifts from the recorded run (S3 F1-2)', async () => {
  const { first } = await p1InterruptedRunFixture();
  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_optdrift_',
  });

  await assert.rejects(
    () => resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: null,
      resume_from_run_id: 'claim_boundary_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_CLAIM_BOUNDARY_DEBATE_PROFILE_ID}.openai-fast`,
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && resumeIssueCodes(error).includes('RESUME_MODEL_OPTION_DRIFT'),
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});

test('P1 runtime review resume of a run completed under an earlier prompt version replays idempotently (S3 F1-3)', async () => {
  const first = scriptedServiceFixture(p1SuccessScript);
  const run = await first.service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));
  assert.equal(run.status, 'passed');

  rewriteStoredPromptVersion(first.repository, 'claim_boundary_run_001', 'v0-legacy');

  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_v0_',
  });
  const resumed = await resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
    ...providerRequest('claim'),
    run_id: null,
    resume_from_run_id: 'claim_boundary_run_001',
  });

  assert.equal(resumeFixture.orchestrator.calls.length, 0);
  assert.equal(resumed.status, 'passed');
  assert.equal(
    resumed.final_runtime_artifact?.runtime_artifact_id,
    run.final_runtime_artifact?.runtime_artifact_id,
  );
});

test('P1 runtime review resume of a completed run whose final chain no longer resolves fails closed (S3 F1-4)', async () => {
  const first = scriptedServiceFixture(p1SuccessScript);
  const run = await first.service.runClaimBoundaryDebate(PROJECT_ID, providerRequest('claim'));
  assert.equal(run.status, 'passed');
  corruptFinalChain(first.repository, 'claim_boundary_run_001');

  const resumeFixture = scriptedServiceFixture(p1SuccessScript, {
    repository: first.repository,
    idPrefix: 'resume_broken_',
  });
  await assert.rejects(
    () => resumeFixture.service.runClaimBoundaryDebate(PROJECT_ID, {
      ...providerRequest('claim'),
      run_id: null,
      resume_from_run_id: 'claim_boundary_run_001',
    }),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && resumeIssueCodes(error).includes('RESUME_FINAL_CHAIN_BROKEN'),
  );
  assert.equal(resumeFixture.orchestrator.calls.length, 0);
});
