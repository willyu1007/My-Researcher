import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionAgentExecutionMode,
  TopicSelectionGenerateNeedCandidateNodeInput,
  TopicSelectionArtifactFunctionalRef,
  TopicSelectionNeedDiscoveryArbiterContextPayload,
  TopicSelectionNeedDiscoveryDebateIssueFrame,
  TopicSelectionNeedDiscoveryDeepCriticNotes,
  TopicSelectionNeedDiscoveryExplorerNotes,
  TopicSelectionNeedDiscoveryExplorationContextPayload,
  TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import { TopicSelectionNeedDiscoveryContextCompilerService } from './topic-selection-need-discovery-context-compiler-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';
import {
  type TopicSelectionNeedDiscoveryDebateMockedOutputs,
  TopicSelectionNeedDiscoveryDebateLoopService,
} from './topic-selection-need-discovery-debate-loop-service.js';
import {
  TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID,
  TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID,
} from './topic-selection-model-profile-registry-service.js';

class ThrowingLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    throw new Error('provider LLM should not be called by mocked debate tests');
  }
}

class ProviderDebateGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    const output = this.outputForSchema(request.schemaName);
    return {
      parsed: output as T,
      raw: { output },
      telemetry: telemetryForRequest(request),
    };
  }

  private outputForSchema(schemaName: string): unknown {
    if (schemaName === 'topic_selection_need_discovery_explorer_notes') {
      return explorerNotes(`explorer_${this.calls.length}`, `angle_${this.calls.length}`);
    }
    if (schemaName === 'topic_selection_need_discovery_deep_critic_notes') {
      return deepCriticNotes();
    }
    if (schemaName === 'topic_selection_need_discovery_debate_issue_frame') {
      return issueFrame();
    }
    if (schemaName === 'topic_selection_ranked_candidate_draft_batch') {
      return rankedBatch();
    }
    throw new Error(`unexpected schema: ${schemaName}`);
  }
}

function telemetryForRequest(request: LlmStructuredOutputRequest): LlmCallTelemetry {
  return {
    provider_id: request.model.providerId,
    model_id: request.model.modelId,
    profile_id: request.model.profileId ?? null,
    prompt_template_id: request.prompt.promptTemplateId,
    prompt_template_version: request.prompt.version,
    elapsed_ms: 12,
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

function lastUserPayload(request: LlmStructuredOutputRequest): Record<string, unknown> {
  return JSON.parse(request.messages.at(-1)?.content ?? '{}') as Record<string, unknown>;
}

async function makeRuntime(options: {
  llmGateway?: ThrowingLlmGateway | ProviderDebateGateway;
  executionMode?: TopicSelectionAgentExecutionMode;
} = {}) {
  const repository = new InMemoryTopicSelectionControlPlaneRepository();
  let sequence = 0;
  const controlPlane = new TopicSelectionControlPlaneService(repository, {
    idFactory: (prefix) => `${prefix}_${++sequence}`,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const artifactBoundary = new TopicSelectionNeedDiscoveryArtifactBoundaryService(controlPlane);
  const contextCompiler = new TopicSelectionNeedDiscoveryContextCompilerService(artifactBoundary, {
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const llmGateway = options.llmGateway ?? new ThrowingLlmGateway();
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const debateLoop = new TopicSelectionNeedDiscoveryDebateLoopService({
    agentOrchestrator,
    artifactBoundary,
  });
  const compiledContext = await contextCompiler.compileContextPair({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    workflow_run_id: 'workflow_run_001',
    input_snapshot_id: 'input_snapshot_001',
    node_attempt_id: 'node_attempt_001',
    input_refs: [
      ref('topic_scope', 'topic_scope_001'),
      ref('evidence_map', 'evidence_map_001'),
      ref('evidence_strength_assessment', 'strength_001'),
      ref('resource_sample_set', 'sample_set_001'),
    ],
    policy_version: 'v1',
    output_schema_version: 'v1',
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
    execution_mode: options.executionMode ?? 'mocked_llm',
    exploration_payload: explorationPayload(),
    arbiter_payload: arbiterPayload(),
    created_by: 'system',
  });

  return {
    debateLoop,
    repository,
    llmGateway,
    compiledContext,
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function artifactRef(refId: string): TopicSelectionArtifactFunctionalRef {
  return {
    ref_type: 'artifact_ref',
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function explorationPayload(): TopicSelectionNeedDiscoveryExplorationContextPayload {
  return {
    topic_scope: {
      title_card_id: 'title_card_001',
      domain: 'RAG fine-tuning safety',
    },
    evidence_signal_digest: {
      support_count: 2,
      challenge_count: 1,
    },
    resource_sample_digest: {
      sample_set_id: 'sample_set_001',
      role_counts: { support: 2, challenge: 1, baseline: 1 },
    },
    search_coverage_digest: {
      coverage: 'partial',
    },
    sibling_candidate_digest: {
      candidate_count: 0,
    },
    decision_memory_digest: {
      required_challenges: ['avoid pseudo-gap framing'],
    },
    exploration_prompts: ['Generate specific, evidence-grounded candidate needs.'],
    challenge_prompts: ['Identify prior-art conflicts and pseudo-gap risks.'],
    allowed_outputs: ['ranked_candidate_draft_batch'],
    forbidden_outputs: ['need_candidate_authority_write', 'validated_need_write'],
  };
}

function arbiterPayload(): TopicSelectionNeedDiscoveryArbiterContextPayload {
  return {
    node_policy_ref: ref('node_policy', 'generate_need_candidate_v1'),
    output_schema_ref: ref('schema', 'ranked_candidate_draft_batch_v1'),
    authority_boundary: {
      authority_object: 'NeedCandidate',
      forbidden: ['NeedCandidateSet', 'ValidatedNeed', 'TopicQuestionContract'],
    },
    max_persisted_candidates: 5,
    deterministic_gate_checklist: ['schema_validation', 'admission_gates'],
    role_level_summaries: [{ role: 'debate', summary: 'role-level summaries are artifact refs' }],
    candidate_pool_digest: { candidate_count: 0 },
    evidence_ref_table: [
      { evidence_ref: ref('evidence_unit', 'support_001'), role: 'support' },
      { evidence_ref: ref('evidence_unit', 'challenge_001'), role: 'challenge' },
      { evidence_ref: ref('evidence_unit', 'baseline_001'), role: 'baseline' },
      { evidence_ref: ref('evidence_conflict', 'conflict_001'), role: 'challenge' },
      { evidence_ref: ref('evidence_strength_assessment', 'strength_001'), role: 'strength' },
    ],
    rejected_framing_table: [],
    unresolved_points: [],
    batch_ranking_rules: ['rank grounded drafts first'],
    persistence_rules: ['artifact-only until admission gates'],
    failure_rules: ['block when malformed'],
  };
}

function nodeInput(
  compiledContext: Awaited<ReturnType<typeof makeRuntime>>['compiledContext'],
): TopicSelectionGenerateNeedCandidateNodeInput {
  return {
    schema_version: 'v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    topic_scope_ref: ref('topic_scope', 'topic_scope_001'),
    evidence_map_ref: ref('evidence_map', 'evidence_map_001'),
    evidence_strength_ref: ref('evidence_strength_assessment', 'strength_001'),
    resource_sample_set_ref: ref('resource_sample_set', 'sample_set_001'),
    candidate_pool_projection_ref: null,
    search_snapshot_refs: [ref('search_run', 'search_run_001')],
    resource_snapshot_refs: [ref('literature_snapshot', 'literature_snapshot_001')],
    exploration_context_ref: compiledContext.exploration_context_ref,
    arbiter_context_ref: compiledContext.arbiter_context_ref,
    execution_mode: 'mocked_llm',
    profile_id: TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID,
    policy_version: 'v1',
    operator_reuse_approval_ref: null,
  };
}

function explorerNotes(agentInstanceId: string, angleId: string): TopicSelectionNeedDiscoveryExplorerNotes {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'explorer',
    stage: 'round_1_discovery',
    agent_instance_id: agentInstanceId,
    candidate_angles: [
      {
        angle_id: angleId,
        summary: 'Evaluate RAG fine-tuning risk interactions.',
        candidate_need_hint: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
        evidence_refs: [ref('evidence_unit', 'support_001')],
      },
    ],
    evidence_refs: [ref('evidence_unit', 'support_001')],
    unresolved_questions: ['Which retrieval risks survive fine-tuning?'],
    warnings: [],
  };
}

function deepCriticNotes(): TopicSelectionNeedDiscoveryDeepCriticNotes {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'deep_critic',
    stage: 'round_1_discovery',
    agent_instance_id: 'deep_critic_1',
    critique_points: [
      {
        critique_id: 'critique_001',
        summary: 'Pseudo-gap risk unless challenge evidence is carried into evaluation.',
        severity: 'high',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
      },
    ],
    failure_modes: ['overstating novelty without benchmark comparison'],
    missing_evidence_questions: ['What benchmark baseline exists?'],
    evidence_refs: [ref('evidence_unit', 'challenge_001')],
    warnings: ['baseline coverage is thin'],
  };
}

function issueFrame(): TopicSelectionNeedDiscoveryDebateIssueFrame {
  return {
    schema_version: 'v1',
    debate_loop_id: 'debate_loop_001',
    round_index: 1,
    role: 'arbiter',
    stage: 'issue_framing',
    frame_id: 'issue_frame_001',
    focused_questions: ['Can the candidate need stay grounded while carrying the challenge evidence?'],
    requested_roles: ['explorer', 'deep_critic'],
    source_role_summary_refs: [artifactRef('role_summary_explorer'), artifactRef('role_summary_deep_critic')],
    stop_condition: null,
  };
}

function rankedBatch(): TopicSelectionRankedCandidateDraftBatch {
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      ranking_rationale: 'Arbiter selected the grounded need and retained risk evidence.',
      max_persisted_candidates: 5,
    },
    drafts: [
      {
        draft_id: 'draft_001',
        rank: 1,
        candidate_need: 'Need a risk-aware evaluation workflow for RAG fine-tuning.',
        unmet_need_statement: 'Existing studies do not isolate retrieval-risk effects during fine-tuning.',
        mechanism_type: 'evaluation_gap',
        mechanism_summary: 'Risk-aware evaluation gap.',
        mechanism_payload: { axis: 'retrieval-risk' },
        scope_notes: 'CS literature workflow only.',
        non_goal_notes: null,
        prior_art_status: 'partial_solution_known',
        evidence_role_bundle: {
          support_unit_refs: [ref('evidence_unit', 'support_001')],
          challenge_unit_refs: [ref('evidence_unit', 'challenge_001')],
          baseline_unit_refs: [ref('evidence_unit', 'baseline_001')],
          context_unit_refs: [],
        },
        conflict_refs: [ref('evidence_conflict', 'conflict_001')],
        strength_assessment_refs: [ref('evidence_strength_assessment', 'strength_001')],
        accepted_risk_refs: [],
        gap_codes: ['risk_evaluation_gap'],
        speculative: false,
        confidence: 0.82,
      },
    ],
    rejected_framings: [],
    unresolved_points: [],
  };
}

function debateMockedOutputs(
  overrides: Partial<TopicSelectionNeedDiscoveryDebateMockedOutputs> = {},
): TopicSelectionNeedDiscoveryDebateMockedOutputs {
  return {
    explorer: [
      { fixture_id: 'fixture_explorer_1', output: explorerNotes('explorer_1', 'angle_001') },
      { fixture_id: 'fixture_explorer_2', output: explorerNotes('explorer_2', 'angle_002') },
    ],
    deep_critic: [
      { fixture_id: 'fixture_deep_critic_1', output: deepCriticNotes() },
    ],
    arbiter_issue_frame: {
      fixture_id: 'fixture_arbiter_issue_frame',
      output: issueFrame(),
    },
    arbiter_final: {
      fixture_id: 'fixture_arbiter_final',
      output: rankedBatch(),
    },
    ...overrides,
  };
}

test('need-discovery debate loop records role outputs, summaries, issue frame, and final synthesis', async () => {
  const { debateLoop, repository, llmGateway, compiledContext } = await makeRuntime();
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    mocked_outputs: debateMockedOutputs(),
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.ranked_candidate_draft_batch?.drafts.length, 1);
  assert.equal(result.role_invocation_results.length, 4);
  assert.equal(result.role_output_artifacts.length, 3);
  assert.equal(result.role_level_summary_artifacts.length, 2);
  assert.equal(result.issue_frame_artifact?.artifact_key, 'debate_issue_frame');
  assert.equal(result.final_synthesis_artifact?.artifact_key, 'debate_final_synthesis');
  assert.equal(result.final_invocation_result.provenance.executor_kind, 'multi_agent_debate');
  assert.equal(result.final_invocation_result.provenance.debate_extension?.role, 'arbiter');
  assert.equal(result.final_invocation_result.provenance.debate_extension?.stage, 'final_synthesis');
  assert.deepEqual(
    result.final_invocation_result.provenance.debate_extension?.parent_invocation_attempt_ids,
    result.role_invocation_results.map((invocation) => invocation.provenance.invocation_attempt_id),
  );
  assert.equal(llmGateway.calls.length, 0);

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  const artifactPayloads = artifacts.map((artifact) => JSON.stringify(artifact.payload));
  assert.equal(artifactPayloads.some((payload) => payload.includes('"artifact_key":"debate_role_output"')), true);
  assert.equal(artifactPayloads.some((payload) => payload.includes('"artifact_key":"debate_role_level_summary"')), true);
  assert.equal(artifactPayloads.some((payload) => payload.includes('"artifact_key":"debate_issue_frame"')), true);
  assert.equal(artifactPayloads.some((payload) => payload.includes('"artifact_key":"debate_final_synthesis"')), true);
  assert.equal(artifactPayloads.some((payload) => payload.includes('hidden_reasoning')), false);
});

test('need-discovery debate loop uses contract defaults for provider role instances and model options', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.role_invocation_results.length, 4);
  assert.equal(llmGateway.calls.length, 5);
  assert.deepEqual(
    llmGateway.calls.map((call) => call.schemaName),
    [
      'topic_selection_need_discovery_explorer_notes',
      'topic_selection_need_discovery_explorer_notes',
      'topic_selection_need_discovery_deep_critic_notes',
      'topic_selection_need_discovery_debate_issue_frame',
      'topic_selection_ranked_candidate_draft_batch',
    ],
  );
  assert.equal(llmGateway.calls.every((call) => call.model.providerId === 'openai'), true);
  assert.equal(llmGateway.calls.every((call) => call.model.modelId === 'gpt-5.5'), true);
  assert.equal(
    llmGateway.calls.every((call) =>
      (call.normalizedParams as { reasoning_depth?: string } | undefined)?.reasoning_depth === 'high',
    ),
    true,
  );
  assert.equal(llmGateway.calls.every((call) => Object.keys(call.providerOverrides ?? {}).length === 0), true);

  const issueFramePayload = lastUserPayload(llmGateway.calls[3]);
  assert.deepEqual(
    (issueFramePayload.debate_payloads as { role_level_summaries?: Array<{ role: string }> }).role_level_summaries
      ?.map((summary) => summary.role),
    ['explorer', 'deep_critic'],
  );
  const finalPayload = lastUserPayload(llmGateway.calls[4]);
  assert.equal(
    (finalPayload.debate_payloads as { issue_frame?: { frame_id?: string } }).issue_frame?.frame_id,
    'issue_frame_001',
  );
  assert.deepEqual(
    (finalPayload.debate_payloads as { role_level_summaries?: Array<{ role: string }> }).role_level_summaries
      ?.map((summary) => summary.role),
    ['explorer', 'deep_critic'],
  );
  const roleRefConstraints = (finalPayload.output_constraints as {
    role_ref_constraints?: {
      support_unit_refs?: TopicSelectionFunctionalRef[];
      challenge_unit_refs?: TopicSelectionFunctionalRef[];
      baseline_unit_refs?: TopicSelectionFunctionalRef[];
      conflict_refs?: TopicSelectionFunctionalRef[];
      strength_assessment_refs?: TopicSelectionFunctionalRef[];
    };
  }).role_ref_constraints;
  assert.deepEqual(roleRefConstraints?.support_unit_refs?.map((item) => item.ref_id), ['support_001']);
  assert.deepEqual(roleRefConstraints?.challenge_unit_refs?.map((item) => item.ref_id), ['challenge_001']);
  assert.deepEqual(roleRefConstraints?.baseline_unit_refs?.map((item) => item.ref_id), ['baseline_001']);
  assert.deepEqual(roleRefConstraints?.conflict_refs?.map((item) => item.ref_id), ['conflict_001']);
  assert.deepEqual(roleRefConstraints?.strength_assessment_refs?.map((item) => item.ref_id), ['strength_001']);
});

// T-128 W-04 — prompt-body byte-identity drift anchors. Pin the rendered [system,user] message
// bytes for all four need-discovery debate roles (explorer, deep_critic, arbiter issue_framing,
// arbiter final_synthesis) so any change to a prompt body is a LOUD, intentional re-baseline rather
// than silent rendered_prompt_hash drift. No harness/replay/e2e guard pins these v1a prompt bodies,
// so these are their only drift coverage. The explorer/deep_critic anchors additionally prove the
// roleMessages role-branch did not silently collapse the two roles' bodies.
// Re-baseline ONLY for a deliberate, separately-justified wording change — NOT for mechanical edits.
const NEED_DISCOVERY_PROMPT_BODY_GOLDEN = {
  explorer: '4bd5b6ae88fe057c687d2eaa108f213f0b3c05fae55e97c8093216f414724a68',
  deep_critic: 'e66d5a6315e364d39a75cc64319ea250bc045a62eff37614129a8a8414003aec',
  arbiter_issue_frame: '1bdbef201cc484944ffe42542ee6cb35ce3813912c48355df3cf0a802dad1007',
  arbiter_final: '76f32df7c6d07da658766e535c1b097f46ba39274e7163221460d08c3d3fd60e',
};
test('need-discovery debate prompt bodies are byte-identity drift-anchored (T-128 W-04)', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
  });
  assert.equal(llmGateway.calls.length, 5);
  // calls[0,1] = explorer instances (identical body), calls[2] = deep_critic, calls[3] = arbiter
  // issue_framing, calls[4] = arbiter final_synthesis (schemaName ordering asserted in the
  // canonical-slot test above).
  assert.equal(
    sha256Text(stableStringify(llmGateway.calls[0].messages)),
    NEED_DISCOVERY_PROMPT_BODY_GOLDEN.explorer,
  );
  assert.equal(
    sha256Text(stableStringify(llmGateway.calls[2].messages)),
    NEED_DISCOVERY_PROMPT_BODY_GOLDEN.deep_critic,
  );
  assert.equal(
    sha256Text(stableStringify(llmGateway.calls[3].messages)),
    NEED_DISCOVERY_PROMPT_BODY_GOLDEN.arbiter_issue_frame,
  );
  assert.equal(
    sha256Text(stableStringify(llmGateway.calls[4].messages)),
    NEED_DISCOVERY_PROMPT_BODY_GOLDEN.arbiter_final,
  );

  // P0 (T-128 closure review) — arbiter final_synthesis is the debate path's only external
  // NeedCandidate feed and shares the single-agent generate-need-candidate validator+admission
  // pipeline, so its prompt must mirror those gates (not just the role-bundle safety clauses).
  // These substrings pin the draft-completeness contract added to close the prompt↔gate drift.
  const finalSystemBody = String(llmGateway.calls[4].messages[0]?.content ?? '');
  assert.match(
    finalSystemBody,
    /Echo node_input\.schema_version into the batch and node_input\.node_attempt_id into draft_batch\.node_attempt_id/,
  );
  assert.match(finalSystemBody, /only set terminal_result=finalize when at least one admissible draft exists/);
  assert.match(finalSystemBody, /include non-empty scope_notes/);
  assert.match(finalSystemBody, /set speculative=false unless the supplied evidence directly forces uncertainty/);
  assert.match(finalSystemBody, /Rank drafts contiguously from 1 with no gaps/);
  assert.match(
    finalSystemBody,
    /a distinct unmet_need_statement, a mechanism_type, a prior_art_status, and at least one gap_code/,
  );
  assert.match(finalSystemBody, /at least one evidence_strength_assessment ref in strength_assessment_refs/);
  assert.match(finalSystemBody, /drop drafts whose prior_art_status is already_solved or falsified/);
});

test('need-discovery debate loop preserves mocked fixture count under canonical slot execution plan', async () => {
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime();
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    execution_plan: {
      slots: {
        'explorer.round_1_discovery': { execution_mode: 'mocked_llm' },
        'deep_critic.round_1_discovery': { execution_mode: 'mocked_llm' },
        'arbiter.issue_framing': { execution_mode: 'mocked_llm' },
        'arbiter.final_synthesis': { execution_mode: 'mocked_llm' },
      },
    },
    mocked_outputs: debateMockedOutputs({
      explorer: [
        { fixture_id: 'fixture_explorer_1', output: explorerNotes('explorer_1', 'angle_001') },
      ],
    }),
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.role_invocation_results.length, 3);
  assert.equal(llmGateway.calls.length, 0);
});

test('need-discovery debate loop supports slot-level provider model option overrides', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    slot_model_option_overrides: {
      'explorer.round_1_discovery': `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-budget`,
      'deep_critic.round_1_discovery': `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.deepseek-v4-thinking`,
      'arbiter.issue_framing': `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID}.dashscope-budget`,
      'arbiter.final_synthesis': `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-balanced`,
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.deepEqual(
    llmGateway.calls.map((call) => call.model.providerId),
    ['dashscope', 'dashscope', 'deepseek', 'dashscope', 'openai'],
  );
  assert.deepEqual(
    result.role_invocation_results.map((invocation) => invocation.provenance.model_option_id),
    [
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-budget`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-budget`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.deepseek-v4-thinking`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID}.dashscope-budget`,
    ],
  );
  assert.equal(
    result.final_invocation_result.provenance.model_option_id,
    `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-balanced`,
  );
  assert.deepEqual(
    [
      ...result.role_invocation_results.map((invocation) => invocation.token_budget_gate_result?.decision),
      result.final_invocation_result.token_budget_gate_result?.decision,
    ],
    ['within_budget', 'within_budget', 'within_budget', 'within_budget', 'within_budget'],
  );
  assert.equal((llmGateway.calls[0]?.providerOverrides as { enable_thinking?: boolean }).enable_thinking, true);
  assert.deepEqual(llmGateway.calls[2]?.providerOverrides, {
    thinking: { type: 'enabled' },
    reasoning_effort: 'high',
  });
});

test('need-discovery debate loop supports canonical execution plan with instance-level model specs', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    execution_plan: {
      slots: {
        'explorer.round_1_discovery': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-thinking-budget`,
        },
        'deep_critic.round_1_discovery': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.openai-deep-reasoning`,
        },
        'arbiter.issue_framing': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID}.openai-quality`,
        },
        'arbiter.final_synthesis': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-deep-reasoning`,
        },
      },
      instances: {
        'explorer.round_1_discovery#explorer_2': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-quality`,
        },
      },
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.deepEqual(
    llmGateway.calls.map((call) => `${call.model.providerId}:${call.model.modelId}`),
    [
      'dashscope:qwen3.6-plus',
      'openai:gpt-5.5',
      'openai:gpt-5.5',
      'openai:gpt-5.5',
      'openai:gpt-5.5',
    ],
  );
  assert.deepEqual(
    llmGateway.calls.map((call) =>
      (call.normalizedParams as { reasoning_depth?: string } | undefined)?.reasoning_depth,
    ),
    ['high', 'high', 'high', 'high', 'high'],
  );
  assert.deepEqual(
    result.role_invocation_results.map((invocation) => invocation.provenance.model_option_id),
    [
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-thinking-budget`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-quality`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.openai-deep-reasoning`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FRAMING_PROFILE_ID}.openai-quality`,
    ],
  );
  assert.equal(
    result.final_invocation_result.provenance.model_option_id,
    `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-deep-reasoning`,
  );
});

test('need-discovery debate loop supports mixed-cost-control profile materialization semantics', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    execution_plan: {
      slots: {
        'explorer.round_1_discovery': { execution_mode: 'codex_assisted' },
        'deep_critic.round_1_discovery': { execution_mode: 'codex_assisted' },
        'arbiter.issue_framing': { execution_mode: 'codex_assisted' },
        'arbiter.final_synthesis': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-quality`,
        },
      },
    },
    codex_responses: {
      explorer: [{
        operator_label: 'codex_explorer_1',
        output: explorerNotes('explorer_1', 'angle_codex_001'),
      }],
      deep_critic: [{
        operator_label: 'codex_deep_critic_1',
        output: deepCriticNotes(),
      }],
      arbiter_issue_frame: {
        operator_label: 'codex_issue_frame',
        output: issueFrame(),
      },
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.deepEqual(
    result.role_invocation_results.map((invocation) => invocation.provenance.execution_mode),
    ['codex_assisted', 'codex_assisted', 'codex_assisted'],
  );
  assert.deepEqual(
    llmGateway.calls.map((call) => `${call.model.providerId}:${call.model.modelId}`),
    ['openai:gpt-5.5'],
  );
  assert.equal(
    result.final_invocation_result.provenance.model_option_id,
    `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-quality`,
  );
});

test('need-discovery debate loop supports provider-diverse-deep profile materialization semantics', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    execution_plan: {
      slots: {
        'explorer.round_1_discovery': { execution_mode: 'codex_assisted' },
        'deep_critic.round_1_discovery': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.openai-deep-reasoning`,
        },
        'arbiter.issue_framing': { execution_mode: 'codex_assisted' },
        'arbiter.final_synthesis': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-deep-reasoning`,
        },
      },
      instances: {
        'explorer.round_1_discovery#explorer_2': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-quality`,
        },
        'explorer.round_1_discovery#explorer_3': {
          execution_mode: 'provider_llm',
          model_option_id: `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-thinking-budget`,
        },
        'deep_critic.round_1_discovery#deep_critic_2': { execution_mode: 'codex_assisted' },
      },
    },
    codex_responses: {
      explorer: [{
        operator_label: 'codex_explorer_1',
        output: explorerNotes('explorer_1', 'angle_codex_001'),
      }],
      deep_critic: [
        null,
        {
          operator_label: 'codex_deep_critic_2',
          output: {
            ...deepCriticNotes(),
            agent_instance_id: 'deep_critic_2',
          },
        },
      ] as never,
      arbiter_issue_frame: {
        operator_label: 'codex_issue_frame',
        output: issueFrame(),
      },
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.deepEqual(
    result.role_invocation_results.map((invocation) => invocation.provenance.execution_mode),
    [
      'codex_assisted',
      'provider_llm',
      'provider_llm',
      'provider_llm',
      'codex_assisted',
      'codex_assisted',
    ],
  );
  assert.deepEqual(
    llmGateway.calls.map((call) => `${call.model.providerId}:${call.model.modelId}`),
    [
      'openai:gpt-5.5',
      'dashscope:qwen3.6-plus',
      'openai:gpt-5.5',
      'openai:gpt-5.5',
    ],
  );
  assert.equal(
    llmGateway.calls.some((call) => call.model.providerId === 'deepseek'),
    false,
  );
  assert.deepEqual(
    result.role_invocation_results.map((invocation) => invocation.provenance.model_option_id),
    [
      null,
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-quality`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.dashscope-thinking-budget`,
      `${TOPIC_SELECTION_NEED_DISCOVERY_DEEP_CRITIC_PROFILE_ID}.openai-deep-reasoning`,
      null,
      null,
    ],
  );
  assert.equal(
    result.final_invocation_result.provenance.model_option_id,
    `${TOPIC_SELECTION_NEED_DISCOVERY_ARBITER_FINAL_PROFILE_ID}.openai-deep-reasoning`,
  );
});

test('need-discovery debate loop supports slot-level Codex substitution while final synthesis stays provider-backed', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, llmGateway, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  const result = await debateLoop.runNeedDiscoveryDebate({
    workspace_id: 'workspace_001',
    title_card_id: 'title_card_001',
    node_input: {
      ...nodeInput(compiledContext),
      execution_mode: 'provider_llm',
    },
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    slot_execution_overrides: {
      'explorer.round_1_discovery': 'codex_assisted',
    },
    codex_responses: {
      explorer: [
        {
          operator_label: 'codex_local_explorer',
          output: explorerNotes('explorer_1', 'angle_codex_001'),
        },
      ],
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.role_invocation_results.length, 3);
  assert.equal(result.role_invocation_results[0]?.provenance.execution_mode, 'codex_assisted');
  assert.equal(result.role_invocation_results[0]?.provenance.source_kind, 'codex_response');
  assert.equal(result.final_invocation_result.provenance.execution_mode, 'provider_llm');
  assert.equal(result.final_invocation_result.provenance.source_kind, 'provider_response');
  assert.deepEqual(
    llmGateway.calls.map((call) => call.schemaName),
    [
      'topic_selection_need_discovery_deep_critic_notes',
      'topic_selection_need_discovery_debate_issue_frame',
      'topic_selection_ranked_candidate_draft_batch',
    ],
  );
});

test('need-discovery debate loop rejects model option override on non-provider slot', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      node_input: {
        ...nodeInput(compiledContext),
        execution_mode: 'provider_llm',
      },
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      slot_execution_overrides: {
        'explorer.round_1_discovery': 'codex_assisted',
      },
      slot_model_option_overrides: {
        'explorer.round_1_discovery': `${TOPIC_SELECTION_NEED_DISCOVERY_EXPLORER_PROFILE_ID}.openai-balanced`,
      },
      codex_responses: {
        explorer: [
          {
            operator_label: 'codex_local_explorer',
            output: explorerNotes('explorer_1', 'angle_codex_001'),
          },
        ],
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('need-discovery debate loop rejects malformed slot model option override values', async () => {
  const providerGateway = new ProviderDebateGateway();
  const { debateLoop, compiledContext } = await makeRuntime({
    llmGateway: providerGateway,
    executionMode: 'provider_llm',
  });
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      node_input: {
        ...nodeInput(compiledContext),
        execution_mode: 'provider_llm',
      },
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      slot_model_option_overrides: {
        'deep_critic.round_1_discovery': 42,
      } as never,
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('need-discovery debate loop rejects mixed execution_plan and legacy slot overrides', async () => {
  const { debateLoop, compiledContext } = await makeRuntime({
    executionMode: 'provider_llm',
  });
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      workspace_id: 'workspace_001',
      title_card_id: 'title_card_001',
      node_input: {
        ...nodeInput(compiledContext),
        execution_mode: 'provider_llm',
      },
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      execution_plan: {
        slots: {
          'explorer.round_1_discovery': {
            execution_mode: 'provider_llm',
          },
        },
      },
      slot_execution_overrides: {
        'explorer.round_1_discovery': 'codex_assisted',
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('need-discovery debate loop forbids Codex substitution for final synthesis slot', async () => {
  const { debateLoop, compiledContext } = await makeRuntime();
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      title_card_id: 'title_card_001',
      node_input: nodeInput(compiledContext),
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      slot_execution_overrides: {
        'arbiter.final_synthesis': 'codex_assisted',
      },
      mocked_outputs: debateMockedOutputs(),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('need-discovery debate loop requires every mandatory mocked role', async () => {
  const { debateLoop, compiledContext } = await makeRuntime();
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      title_card_id: 'title_card_001',
      node_input: nodeInput(compiledContext),
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      mocked_outputs: debateMockedOutputs({ deep_critic: [] }),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('need-discovery debate loop keeps blocked arbiter issue-frame invocation in role results', async () => {
  const { debateLoop, compiledContext } = await makeRuntime();
  const malformedIssueFrame = {
    ...issueFrame(),
    requested_roles: ['grounding_auditor'],
  } as unknown as TopicSelectionNeedDiscoveryDebateIssueFrame;

  const result = await debateLoop.runNeedDiscoveryDebate({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    exploration_context_packet: compiledContext.exploration_context_packet,
    arbiter_context_packet: compiledContext.arbiter_context_packet,
    debate_loop_id: 'debate_loop_001',
    mocked_outputs: debateMockedOutputs({
      arbiter_issue_frame: {
        fixture_id: 'fixture_malformed_arbiter_issue_frame',
        output: malformedIssueFrame,
      },
    }),
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'SCHEMA_VALIDATION_FAILED');
  assert.equal(result.role_invocation_results.length, 4);
  assert.equal(result.role_invocation_results.at(-1)?.provenance.debate_extension?.stage, 'issue_framing');
  assert.equal(result.role_output_artifacts.length, 3);
  assert.equal(result.role_level_summary_artifacts.length, 2);
  assert.equal(result.issue_frame_artifact, null);
  assert.equal(result.final_synthesis_artifact, null);
});

test('need-discovery debate loop enforces round boundary', async () => {
  const { debateLoop, compiledContext } = await makeRuntime();
  await assert.rejects(
    () => debateLoop.runNeedDiscoveryDebate({
      title_card_id: 'title_card_001',
      node_input: nodeInput(compiledContext),
      run_mode: 'acceptance',
      exploration_context_packet: compiledContext.exploration_context_packet,
      arbiter_context_packet: compiledContext.arbiter_context_packet,
      debate_loop_id: 'debate_loop_001',
      round_index: 4,
      mocked_outputs: debateMockedOutputs(),
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});
