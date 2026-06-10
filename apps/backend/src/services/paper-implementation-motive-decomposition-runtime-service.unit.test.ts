import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
  PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  type PaperImplementationMotiveDecompositionDraftAssertionCandidate,
  type PaperImplementationMotiveDecompositionRoleOutput,
  type RunPaperImplementationMotiveDecompositionRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { InMemoryPaperImplementationRuntimeRepository } from '../repositories/in-memory-paper-implementation-runtime-repository.js';
import { PaperImplementationRuntimeAdmissionService } from './paper-implementation-runtime-admission-service.js';
import { PaperImplementationMotiveDecompositionRuntimeService } from './paper-implementation-motive-decomposition-runtime-service.js';
import type {
  TopicSelectionAgentInvocationResult,
} from './topic-selection-agent-orchestrator-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

const PROJECT_ID = 'implementation_project_motive_decomposition_runtime_001';
const TITLE_CARD_ID = 'title_card_motive_decomposition_runtime_001';
const NOW = '2026-06-08T10:00:00.000Z';

type Outcome =
  | 'passed'
  | 'no_decomposition_needed'
  | 'blocked'
  | 'schema_failed'
  | 'missing_check'
  | 'invented_cited_source_ref'
  | 'invented_ref'
  | 'new_claim_without_gate'
  | 'boundary_blocker_missing'
  | 'side_effect_guard_missing'
  | 'authority_field'
  | 'blocked_authority_field';

class StubMotiveDecompositionAgentOrchestrator {
  readonly calls: Array<{
    node_id: string;
    execution_mode: string;
    executor_kind: string;
    feature_id?: string | null;
    profile_id?: string;
    model_option_id?: string | null;
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
      profile_id?: string;
      model_option_id?: string | null;
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
    if (outcome === 'no_decomposition_needed') {
      return invocationResult(motiveRoleOutput({
        decomposition_result_status: 'no_decomposition_needed',
        draft_assertion_candidates: [],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'blocked') {
      return invocationResult(motiveRoleOutput({
        role_status: 'blocked',
        decomposition_result_status: 'blocked',
        draft_assertion_candidates: [],
        blocker_codes: ['source_assertion_requires_human_review'],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'missing_check') {
      return invocationResult(motiveRoleOutput({
        draft_assertion_candidates: [{
          ...draftAssertionCandidate('split_child_001'),
          decomposition_check: null as unknown as PaperImplementationMotiveDecompositionDraftAssertionCandidate['decomposition_check'],
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'invented_cited_source_ref') {
      return invocationResult(motiveRoleOutput({
        cited_source_refs: [ref('source_locator', 'invented_source_locator_001')],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'invented_ref') {
      return invocationResult(motiveRoleOutput({
        draft_assertion_candidates: [{
          ...draftAssertionCandidate('split_child_001'),
          source_assertion_ref: ref('motive_assertion', 'invented_assertion_001'),
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'new_claim_without_gate') {
      return invocationResult(motiveRoleOutput({
        draft_assertion_candidates: [{
          ...draftAssertionCandidate('split_child_001'),
          decomposition_check: {
            ...draftAssertionCandidate('split_child_001').decomposition_check,
            scope_change_status: 'new_claim_risk',
            new_claim_risk: true,
            human_confirmation_required: false,
            recommended_next_gate: 'none',
          },
          recommended_next_gate: 'none',
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'boundary_blocker_missing') {
      return invocationResult(motiveRoleOutput({
        draft_assertion_candidates: [{
          ...draftAssertionCandidate('split_child_001'),
          decomposition_check: {
            ...draftAssertionCandidate('split_child_001').decomposition_check,
            evidence_coverage_status: 'missing',
            trace_alignment_status: 'drift',
            blocking_reason_codes: [],
            recommended_next_gate: 'none',
          },
          blocker_codes: [],
          recommended_next_gate: 'none',
        }],
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'side_effect_guard_missing') {
      return invocationResult(motiveRoleOutput({
        no_motive_write_side_effect: false as unknown as true,
      }) as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'authority_field') {
      return invocationResult({
        ...motiveRoleOutput(),
        create_motive_assertion_input: { text: 'must not be accepted' },
      } as unknown as T, input.node_id, input.execution_mode);
    }
    if (outcome === 'blocked_authority_field') {
      return invocationResult({
        ...motiveRoleOutput({
          role_status: 'blocked',
          decomposition_result_status: 'blocked',
          draft_assertion_candidates: [],
          blocker_codes: ['blocked_but_still_forbidden'],
        }),
        domain_gate_request: { request_id: 'must_not_exist' },
      } as unknown as T, input.node_id, input.execution_mode);
    }
    return invocationResult(motiveRoleOutput() as T, input.node_id, input.execution_mode);
  }
}

test('motive decomposition runtime records draft assertion candidates without domain writes', async () => {
  const { service, repository, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runDraftAssertionCandidates(PROJECT_ID, request);

  assert.equal(result.status, 'passed');
  assert.equal(result.slot_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID);
  assert.equal(result.workflow_type, 'motive_decomposition');
  assert.equal(result.provider_call_count, 1);
  assert.equal(orchestrator.calls.length, 1);
  assert.equal(orchestrator.calls[0]?.node_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID);
  assert.equal(orchestrator.calls[0]?.executor_kind, 'single_agent');
  assert.equal(orchestrator.calls[0]?.feature_id, 'paper_implementation');
  assert.equal(orchestrator.calls[0]?.profile_id, PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID);
  assert.equal(
    orchestrator.calls[0]?.model_option_id,
    `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
  );
  assert.equal(Boolean(orchestrator.calls[0]?.runtime_token_budget), true);
  assert.equal(orchestrator.calls[0]?.debate_extension, null);
  assert.match(orchestrator.calls[0]?.messages[0]?.content ?? '', /draft assertion candidate generation/);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.target_assertion_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.source_locator_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.citation_candidate_refs[0]), true);
  assert.equal(includesRef(orchestrator.calls[0]?.input_refs ?? [], request.evidence_refs[0]), true);
  assert.equal(result.runtime_artifacts.length, 2);
  assert.equal(result.final_runtime_artifact?.artifact_scope, 'final');
  assert.equal(result.final_admission_record?.admission_status, 'admitted');
  assert.equal(
    (result.final_runtime_artifact?.artifact_payload.draft_assertion_candidates as unknown[] | undefined)?.length,
    1,
  );
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_domain_gate_request, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_queue_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_motive_write_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_motive_evolution_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_board_write_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_evidence_binding_side_effect, true);
  assert.equal(result.final_runtime_artifact?.artifact_payload.no_trace_repair_queue_side_effect, true);
  for (const forbiddenField of [
    'source_assertion_reviews',
    'assertion_id',
    'candidate_assertion_ref',
    'create_motive_assertion_input',
    'motive_assertion_create_request',
    'core_motive_version_patch',
    'motive_evolution_decision_request',
    'domain_gate_request',
    'queue_action',
    'board_draft',
    'create_evidence_binding_request',
    'trace_repair_queue_item',
    'rendered_prompt_text',
    'raw_provider_output',
  ]) {
    assert.equal(forbiddenField in (result.final_runtime_artifact?.artifact_payload ?? {}), false);
  }
  assert.equal(result.operational_telemetry.provider_call_count_consistent, true);
  assert.equal(result.operational_telemetry.response_reuse_status_counts.miss, 2);

  const storedArtifacts = await repository.listRuntimeArtifacts(PROJECT_ID, {
    slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_SLOT_ID,
  });
  assert.equal(storedArtifacts.length, 2);
  assert.equal(stableStringify(result).includes('raw_provider_response'), false);
  assert.equal(stableStringify(result).includes('create_motive_assertion_input'), false);
});

test('motive decomposition runtime admits no-decomposition-needed and semantic blocked outputs', async () => {
  const noDecomposition = serviceFixture(['no_decomposition_needed']);
  const noDecompositionResult = await noDecomposition.service.runDraftAssertionCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_decomposition_no_decomposition_needed_run_001',
  });

  assert.equal(noDecompositionResult.status, 'passed');
  assert.equal(noDecompositionResult.runtime_artifacts.length, 2);
  assert.equal(noDecompositionResult.final_admission_record?.admission_status, 'admitted');
  assert.equal(noDecompositionResult.final_runtime_artifact?.artifact_payload.decomposition_result_status, 'no_decomposition_needed');
  assert.equal(
    (noDecompositionResult.final_runtime_artifact?.artifact_payload.draft_assertion_candidates as unknown[] | undefined)?.length,
    0,
  );

  const blocked = serviceFixture(['blocked']);
  const blockedResult = await blocked.service.runDraftAssertionCandidates(PROJECT_ID, {
    ...providerRequest(),
    run_id: 'motive_decomposition_semantic_blocked_run_001',
  });

  assert.equal(blockedResult.status, 'blocked');
  assert.equal(blocked.orchestrator.calls.length, 1);
  assert.equal(blockedResult.runtime_artifacts.length, 2);
  assert.equal(blockedResult.final_runtime_artifact?.runtime_status, 'blocked');
  assert.equal(blockedResult.final_runtime_artifact?.runtime_failure_code, null);
  assert.equal(blockedResult.final_admission_record?.admission_status, 'admitted');
});

test('motive decomposition runtime preflight blocks memo refs and uncovered assertion packets before provider calls', async () => {
  const { service, orchestrator } = serviceFixture(['passed']);
  const request = providerRequest();
  const result = await service.runDraftAssertionCandidates(PROJECT_ID, {
    ...request,
    run_id: 'motive_decomposition_preflight_run_001',
    source_refs: [
      ...request.source_refs,
      ref('assertion_summary_memo', 'memo_001'),
    ],
    source_hashes: [
      ...request.source_hashes,
      hash('memo'),
    ],
    assertion_context_packets: [{
      ...request.assertion_context_packets[0],
      covered_evidence_refs: [],
      covered_trace_manifest_refs: [],
      covered_source_refs: [],
    }],
  });

  assert.equal(result.status, 'failed_runtime');
  assert.equal(result.provider_call_count, 0);
  assert.equal(orchestrator.calls.length, 0);
  assert.equal(result.final_runtime_artifact, null);
  assert.equal(result.runtime_artifacts.length, 1);
  assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, 'MOTIVE_DECOMPOSITION_PREFLIGHT_BLOCKED');
  assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  assert.equal(result.blocker_codes.includes('MOTIVE_DECOMPOSITION_MEMO_LIKE_REF_REJECTED'), true);
  assert.equal(result.blocker_codes.includes('MOTIVE_DECOMPOSITION_ASSERTION_CONTEXT_PACKET_UNCOVERED'), true);
});

for (const scenario of [
  {
    name: 'schema failure',
    outcome: 'schema_failed' as const,
    failureCode: 'SCHEMA_VALIDATION_FAILED',
  },
  {
    name: 'missing decomposition check',
    outcome: 'missing_check' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_DECOMPOSITION_CHECK_MISSING',
  },
  {
    name: 'invented cited source ref',
    outcome: 'invented_cited_source_ref' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_REF_MISMATCH',
  },
  {
    name: 'invented request-owned ref',
    outcome: 'invented_ref' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_REF_MISMATCH',
  },
  {
    name: 'new-claim candidate without required gate',
    outcome: 'new_claim_without_gate' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_NEW_CLAIM_GATE_MISSING',
  },
  {
    name: 'trace or evidence gap without blocker',
    outcome: 'boundary_blocker_missing' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_BOUNDARY_BLOCKER_MISSING',
  },
  {
    name: 'missing side-effect guard',
    outcome: 'side_effect_guard_missing' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_SIDE_EFFECT_GUARD_MISSING',
  },
  {
    name: 'authority field in output',
    outcome: 'authority_field' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_AUTHORITY_FIELD_PRESENT',
  },
  {
    name: 'authority field in blocked output',
    outcome: 'blocked_authority_field' as const,
    failureCode: 'MOTIVE_DECOMPOSITION_AUTHORITY_FIELD_PRESENT',
  },
]) {
  test(`motive decomposition runtime rejects ${scenario.name} before final admission`, async () => {
    const { service, orchestrator } = serviceFixture([scenario.outcome, scenario.outcome]);
    const result = await service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: `motive_decomposition_${scenario.outcome}_run_001`,
    });

    assert.equal(result.status, 'failed_runtime');
    assert.equal(orchestrator.calls.length, 2);
    assert.equal(result.provider_call_count, 2);
    assert.equal(result.runtime_artifacts.length, 1);
    assert.equal(result.final_runtime_artifact, null);
    assert.equal(result.runtime_artifacts[0]?.runtime_failure_code, scenario.failureCode);
    assert.equal(result.runtime_artifacts[0]?.retry_attempt_index, 1);
    assert.equal(result.admission_records[0]?.admission_status, 'rejected');
  });
}

test('motive decomposition runtime rejects product fixture modes, provider fixtures, model drift, and harness primary refs', async () => {
  const { service, orchestrator } = serviceFixture();

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_product_mocked_mode_run_001',
      execution_mode: 'mocked_llm',
      model_option_id: null,
      mocked_role_outputs: motiveRoleOutputs(),
    }),
    /product run_mode requires execution_mode=provider_llm/,
  );

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_provider_fixture_payload_run_001',
      codex_role_outputs: motiveRoleOutputs(),
    }),
    /provider_llm runtime requests must not include mocked_role_outputs or codex_role_outputs/,
  );

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_model_option_drift_run_001',
      model_option_id: 'paper-implementation.cross-board-synthesis.merge-split-reuse-scenarios.v1.openai-balanced',
    }),
    /model_option_id must be defined by runtime slot profile/,
  );

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_unknown_same_profile_model_option_run_001',
      model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.unknown-provider-option`,
    }),
    /model_option_id must be defined by runtime slot profile/,
  );

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_harness_id_field_run_001',
      agent_workflow_harness_run_id: 'harness_run_001',
    } as unknown as RunPaperImplementationMotiveDecompositionRuntimeRequest),
    /must not include production authority or raw-provider fields/,
  );

  await assert.rejects(
    () => service.runDraftAssertionCandidates(PROJECT_ID, {
      ...providerRequest(),
      run_id: 'motive_decomposition_harness_primary_ref_run_001',
      admitted_upstream_artifact_refs: [ref('agent_workflow_harness_run', 'harness_run_001')],
      admitted_upstream_artifact_hashes: [hash('harness')],
    }),
    /forbids primary input ref_type=agent_workflow_harness_run/,
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
  const orchestrator = new StubMotiveDecompositionAgentOrchestrator(outcomes);
  const service = new PaperImplementationMotiveDecompositionRuntimeService({
    runtimeAdmission,
    agentOrchestrator: orchestrator,
    idFactory,
    now: () => NOW,
  });
  return { service, repository, orchestrator };
}

function motiveRoleOutputs():
  RunPaperImplementationMotiveDecompositionRuntimeRequest['mocked_role_outputs'] {
  return {
    [PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID]: motiveRoleOutput(),
  };
}

function providerRequest(): RunPaperImplementationMotiveDecompositionRuntimeRequest {
  return {
    run_id: 'motive_decomposition_runtime_run_001',
    run_mode: 'product',
    execution_mode: 'provider_llm',
    model_profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    model_option_id: `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`,
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_version_id: 'v1',
    target_motive_ref: ref('core_motive', 'core_motive_001'),
    target_core_motive_version_ref: ref('core_motive_version', 'core_motive_version_001'),
    target_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    input_snapshot_ref: ref('implementation_input_snapshot', 'input_snapshot_001'),
    input_snapshot_hash: hash('input-snapshot'),
    source_refs: [
      ref('source_locator', 'source_locator_001'),
      ref('citation_candidate', 'citation_candidate_001'),
      ref('evidence_unit', 'evidence_001'),
    ],
    source_hashes: [
      hash('source-locator-001'),
      hash('citation-candidate-001'),
      hash('evidence-001'),
    ],
    assertion_context_packets: [{
      packet_ref: ref('assertion_context_packet', 'assertion_context_packet_001'),
      packet_hash: hash('assertion-context-packet-001'),
      assertion_ref: ref('motive_assertion', 'assertion_001'),
      assertion_hash: hash('assertion-001'),
      assertion_text: 'The method reduces retrieval error by grounding each generated section in source-backed evidence.',
      scope_boundary_summary: 'Only claims directly supported by source locators and trace manifests are in scope.',
      covered_evidence_refs: [ref('evidence_unit', 'evidence_001')],
      covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
      covered_source_refs: [ref('source_locator', 'source_locator_001')],
    }],
    trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    trace_manifest_hashes: [hash('trace-manifest-001')],
    source_locator_refs: [ref('source_locator', 'source_locator_001')],
    citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    evidence_refs: [ref('evidence_unit', 'evidence_001')],
    accepted_risk_refs: [ref('accepted_risk', 'accepted_risk_001')],
    admitted_upstream_artifact_refs: [ref('paper_implementation_runtime_artifact', 'admitted_upstream_runtime_artifact_001')],
    admitted_upstream_artifact_hashes: [hash('admitted-upstream-runtime-artifact-001')],
    preflight_blocker_codes: [],
  };
}

function draftAssertionCandidate(candidateKey: string): PaperImplementationMotiveDecompositionDraftAssertionCandidate {
  return {
    candidate_key: candidateKey,
    source_assertion_ref: ref('motive_assertion', 'assertion_001'),
    candidate_kind: 'split_child',
    draft_assertion_text: 'The retrieval grounding component reduces unsupported generated claims.',
    scope_boundary_summary: 'Scope is limited to the retrieval grounding component and source-backed evidence.',
    support_obligation_summary: 'Requires source locator, citation candidate, evidence unit, and trace manifest coverage.',
    covered_evidence_refs: [ref('evidence_unit', 'evidence_001')],
    covered_source_refs: [ref('source_locator', 'source_locator_001')],
    covered_source_locator_refs: [ref('source_locator', 'source_locator_001')],
    covered_citation_candidate_refs: [ref('citation_candidate', 'citation_candidate_001')],
    covered_trace_manifest_refs: [ref('trace_manifest', 'trace_manifest_001')],
    decomposition_check: {
      compoundness_status: 'multiple_obligations',
      scope_change_status: 'split',
      evidence_coverage_status: 'full',
      trace_alignment_status: 'aligned',
      new_claim_risk: false,
      human_confirmation_required: false,
      blocking_reason_codes: [],
      recommended_next_gate: 'motive_assertion_review',
    },
    blocker_codes: [],
    warning_codes: [],
    recommended_next_gate: 'motive_assertion_review',
  };
}

function motiveRoleOutput(
  overrides: Partial<PaperImplementationMotiveDecompositionRoleOutput> = {},
): PaperImplementationMotiveDecompositionRoleOutput {
  return {
    role_slot_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_ROLE_SLOT_ID,
    role_status: 'passed',
    summary: 'Motive decomposition proposed draft assertion candidates for deterministic review.',
    cited_source_refs: [ref('source_locator', 'source_locator_001')],
    decomposition_result_status: 'candidates_proposed',
    reviewed_assertion_refs: [ref('motive_assertion', 'assertion_001')],
    draft_assertion_candidates: [draftAssertionCandidate('split_child_001')],
    blocker_codes: [],
    warning_codes: [],
    no_domain_gate_request: true,
    no_queue_side_effect: true,
    no_motive_write_side_effect: true,
    no_motive_evolution_side_effect: true,
    no_board_write_side_effect: true,
    no_evidence_binding_side_effect: true,
    no_trace_repair_queue_side_effect: true,
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
    workflow_run_id: 'motive_decomposition_runtime_run_001',
    node_id: input.nodeId,
    node_attempt_id: `${input.nodeId}.attempt-0`,
    invocation_attempt_id: `${input.nodeId}.call-1`,
    execution_mode: input.executionMode,
    executor_kind: 'single_agent',
    source_kind: input.executionMode === 'provider_llm' ? 'provider_response' : 'mock_fixture',
    non_provider: input.executionMode !== 'provider_llm',
    run_mode: input.executionMode === 'provider_llm' ? 'product' : 'acceptance',
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    profile_version: 'v1',
    profile_hash: hash('profile'),
    model_option_id: input.executionMode === 'provider_llm'
      ? `${PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID}.openai-balanced`
      : null,
    normalized_params_hash: input.executionMode === 'provider_llm' ? hash('normalized-params') : null,
    capability_degraded: false,
    capability_degrade_reason: null,
    output_contract: 'PaperImplementationMotiveDecompositionRoleArtifact@v1',
    prompt_template_id: 'paper-implementation-motive-decomposition-draft-assertion-candidates',
    prompt_template_version: 'v1',
    schema_name: 'paper_implementation_motive_decomposition_role_output',
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
    workflow_run_id: 'motive_decomposition_runtime_run_001',
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
      workflow_run_id: 'motive_decomposition_runtime_run_001',
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
    profile_id: PAPER_IMPLEMENTATION_MOTIVE_DECOMPOSITION_PROFILE_ID,
    model_option_id: null,
    estimated_input_tokens: 1300,
    estimated_output_tokens: 4096,
    context_window_tokens: 128000,
    schema_overhead_tokens: 1500,
    decision: 'within_budget',
    compression_strategy_ref: ref('compression_strategy', 'paper-implementation-motive-decomposition-context-compression'),
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
