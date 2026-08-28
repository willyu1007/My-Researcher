import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionNeedDiscoveryArbiterContextPayload,
  TopicSelectionNeedDiscoveryExplorationContextPayload,
  TopicSelectionRankedCandidateDraftBatch,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';
import { InMemoryTopicSelectionControlPlaneRepository } from '../repositories/in-memory-topic-selection-control-plane-repository.js';
import { InMemoryTopicSelectionNeedValidationRepository } from '../repositories/in-memory-topic-selection-need-validation-repository.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type {
  LlmCallTelemetry,
  LlmStructuredOutputRequest,
  LlmStructuredOutputResponse,
} from './llm-gateway.js';
import { TopicSelectionAgentOrchestratorService } from './topic-selection-agent-orchestrator-service.js';
import { TopicSelectionGenerateNeedCandidateOrchestratorAdapterService } from './topic-selection-generate-need-candidate-orchestrator-adapter-service.js';
import { sha256Text } from './literature-content-processing-utils.js';
import { TopicSelectionCompressionRuntimeService } from './topic-selection-compression-runtime-service.js';
import { TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID } from './topic-selection-model-profile-registry-service.js';
import { TopicSelectionNeedDiscoveryArtifactBoundaryService } from './topic-selection-need-discovery-artifact-boundary-service.js';
import { TopicSelectionNeedDiscoveryContextCompilerService } from './topic-selection-need-discovery-context-compiler-service.js';
import { TopicSelectionPersistNeedCandidateBatchService } from './topic-selection-persist-need-candidate-batch-service.js';
import { TopicSelectionRankedCandidateDraftBatchValidatorService } from './topic-selection-ranked-candidate-draft-batch-validator-service.js';

class StubLlmGateway {
  readonly calls: LlmStructuredOutputRequest[] = [];

  constructor(private readonly output: TopicSelectionRankedCandidateDraftBatch) {}

  async createStructuredOutput<T>(
    request: LlmStructuredOutputRequest,
  ): Promise<LlmStructuredOutputResponse<T>> {
    this.calls.push(request);
    return {
      parsed: this.output as T,
      raw: { output: this.output },
      telemetry: telemetry(),
    };
  }
}

class DroppingRequiredFactsCompressionRuntime extends TopicSelectionCompressionRuntimeService {
  override createReport(
    input: Parameters<TopicSelectionCompressionRuntimeService['createReport']>[0],
  ): ReturnType<TopicSelectionCompressionRuntimeService['createReport']> {
    return super.createReport({
      ...input,
      compressed_preserved_facts: {},
    });
  }
}

async function makeHarness(
  executionMode: 'mocked_llm' | 'codex_assisted' | 'provider_llm',
  overrides: {
    exploration_payload?: TopicSelectionNeedDiscoveryExplorationContextPayload;
    arbiter_payload?: TopicSelectionNeedDiscoveryArbiterContextPayload;
    compression_runtime?: TopicSelectionCompressionRuntimeService;
  } = {},
) {
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
  const needValidationRepository = new InMemoryTopicSelectionNeedValidationRepository();
  const needCandidateBatchPersistence = new TopicSelectionPersistNeedCandidateBatchService(
    needValidationRepository,
    { now: () => '2026-05-19T00:00:00.000Z' },
  );
  const llmGateway = new StubLlmGateway(rankedBatch());
  const agentOrchestrator = new TopicSelectionAgentOrchestratorService({
    controlPlane,
    llmGateway,
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const draftBatchValidator = new TopicSelectionRankedCandidateDraftBatchValidatorService({
    now: () => '2026-05-19T00:00:00.000Z',
  });
  const adapter = new TopicSelectionGenerateNeedCandidateOrchestratorAdapterService({
    contextCompiler,
    agentOrchestrator,
    artifactBoundary,
    draftBatchValidator,
    needCandidateBatchPersistence,
    compressionRuntime: overrides.compression_runtime,
  });
  const compiledContext = await contextCompiler.compileContextPair({
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
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    execution_mode: executionMode,
    exploration_payload: overrides.exploration_payload ?? explorationPayload(),
    arbiter_payload: overrides.arbiter_payload ?? arbiterPayload(),
  });

  return {
    adapter,
    compiledContext,
    llmGateway,
    needValidationRepository,
    repository,
  };
}

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
  };
}

function telemetry(): LlmCallTelemetry {
  return {
    provider_id: 'openai',
    model_id: 'gpt-test',
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    prompt_template_id: 'topic-selection-generate-need-candidate',
    prompt_template_version: 'v1',
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
      method_family_counts: {
        retrieval_augmented_generation: 1,
        fine_tuning: 1,
        risk_analysis: 1,
      },
      covered_method_families: ['fine_tuning', 'retrieval_augmented_generation', 'risk_analysis'],
      topic_method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
    },
    search_coverage_digest: {
      coverage: 'partial',
      method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
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
    role_level_summaries: [{ role: 'single_agent', summary: 'context-ready' }],
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

function rankedBatch(): TopicSelectionRankedCandidateDraftBatch {
  return {
    schema_version: 'v1',
    draft_batch: {
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      ranking_rationale: 'Grounded in support and challenge evidence.',
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

function noneViableBatch(): TopicSelectionRankedCandidateDraftBatch {
  const batch = rankedBatch();
  batch.drafts = [];
  batch.rejected_framings = [
    {
      framing_id: 'framing_001',
      reason_code: 'near_isomorphic_prior_art',
      summary: 'The inspected framing does not establish a contribution difference.',
      refs: [ref('evidence_unit', 'challenge_001')],
    },
  ];
  batch.portfolio_disposition = {
    outcome: 'none_viable',
    rationale: 'Every inspected framing collides with direct prior art.',
    confidence: 0.88,
    evidence_refs: [ref('evidence_unit', 'challenge_001')],
    rejection_reasons: [
      {
        reason_code: 'near_isomorphic_prior_art',
        summary: 'No mechanism-level difference remains.',
        evidence_refs: [ref('evidence_unit', 'challenge_001')],
      },
    ],
    reopening_conditions: ['New claim-bearing evidence establishes a mechanism-level difference.'],
    candidate_dispositions: [],
  };
  return batch;
}

function nodeInput(compiledContext: Awaited<ReturnType<typeof makeHarness>>['compiledContext']) {
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
    execution_mode: compiledContext.exploration_context_packet.execution_mode,
    profile_id: TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID,
    policy_version: 'v1',
    operator_reuse_approval_ref: null,
  };
}

function persistenceContext() {
  return {
    search_run_ref: ref('search_run', 'search_run_001'),
    search_plan_ref: ref('search_plan', 'search_plan_001'),
    literature_snapshot_ref: ref('literature_snapshot', 'literature_snapshot_001'),
  };
}

test('generate-need-candidate adapter produces ranked draft batch through mocked, codex, and provider modes', async () => {
  const modes = ['mocked_llm', 'codex_assisted', 'provider_llm'] as const;
  for (const mode of modes) {
    const { adapter, compiledContext, llmGateway } = await makeHarness(mode);
    const result = await adapter.generateRankedCandidateDraftBatch({
      title_card_id: 'title_card_001',
      node_input: nodeInput(compiledContext),
      run_mode: mode === 'provider_llm' ? 'product' : 'acceptance',
      mocked_output: mode === 'mocked_llm'
        ? { fixture_id: 'fixture_generate_need_candidate_happy_path', output: rankedBatch() }
        : null,
      codex_response: mode === 'codex_assisted'
        ? { output: rankedBatch(), operator_label: 'codex-local' }
        : null,
    });

    assert.equal(result.status, 'succeeded');
    assert.equal(result.ranked_candidate_draft_batch?.drafts.length, 1);
    assert.equal(result.ranked_candidate_draft_batch_artifact?.artifact_key, 'ranked_candidate_draft_batch');
    assert.equal(result.minimum_schema_validation_report?.valid, true);
    assert.equal(result.minimum_schema_validation_report_artifact?.artifact_key, 'minimum_schema_validation_report');
    assert.equal(result.candidate_draft_admission_report?.draft_results[0]?.decision, 'admit');
    assert.equal(result.candidate_draft_admission_report_artifact?.artifact_key, 'candidate_draft_admission_report');
    assert.equal(
      result.supplemental_round_routing_decision?.routing_decision,
      'finalize_with_admitted_batch',
    );
    assert.equal(
      result.supplemental_round_routing_decision_artifact?.artifact_key,
      'supplemental_round_routing_decision',
    );
    assert.equal(result.persist_need_candidate_batch_command, null);
    assert.equal(result.persist_need_candidate_batch_command_artifact, null);
    assert.equal(result.persist_need_candidate_batch_result, null);
    assert.equal(result.exploration_context_packet.context_family, 'exploration_context');
    assert.equal(result.arbiter_context_packet.context_family, 'arbiter_context');
    assert.equal(result.invocation_result.provenance.execution_mode, mode);
    assert.equal(result.invocation_result.audit_artifact_ref?.ref_type, 'artifact_ref');
    assert.equal(llmGateway.calls.length, mode === 'provider_llm' ? 1 : 0);
    if (mode === 'provider_llm') {
      assert.equal(llmGateway.calls[0]?.model.profileId, TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID);
      assert.equal(result.invocation_result.provenance.model_option_id, `${TOPIC_SELECTION_GENERATE_NEED_CANDIDATE_SINGLE_AGENT_PROFILE_ID}.openai-balanced`);
      assert.match(
        llmGateway.calls[0]?.messages[0]?.content ?? '',
        /empty pool means there are no known duplicates/,
      );
      assert.match(
        llmGateway.calls[0]?.messages[1]?.content ?? '',
        /candidate_pool_digest_role/,
      );
      const userPayload = JSON.parse(llmGateway.calls[0]?.messages[1]?.content ?? '{}') as {
        output_constraints?: {
          role_ref_constraints?: {
            support_unit_refs?: TopicSelectionFunctionalRef[];
            challenge_unit_refs?: TopicSelectionFunctionalRef[];
            baseline_unit_refs?: TopicSelectionFunctionalRef[];
            conflict_refs?: TopicSelectionFunctionalRef[];
            strength_assessment_refs?: TopicSelectionFunctionalRef[];
          };
        };
      };
      assert.deepEqual(
        userPayload.output_constraints?.role_ref_constraints?.support_unit_refs?.map((item) => item.ref_id),
        ['support_001'],
      );
      assert.deepEqual(
        userPayload.output_constraints?.role_ref_constraints?.challenge_unit_refs?.map((item) => item.ref_id),
        ['challenge_001'],
      );
      assert.deepEqual(
        userPayload.output_constraints?.role_ref_constraints?.baseline_unit_refs?.map((item) => item.ref_id),
        ['baseline_001'],
      );
      assert.deepEqual(
        userPayload.output_constraints?.role_ref_constraints?.conflict_refs?.map((item) => item.ref_id),
        ['conflict_001'],
      );
      assert.deepEqual(
        userPayload.output_constraints?.role_ref_constraints?.strength_assessment_refs?.map((item) => item.ref_id),
        ['strength_001'],
      );
    }
  }
});

test('generate-need-candidate adapter succeeds without persistence for a none-viable portfolio', async () => {
  const { adapter, compiledContext, needValidationRepository } = await makeHarness('mocked_llm');
  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_none_viable',
      output: noneViableBatch(),
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.error_code, null);
  assert.equal(result.minimum_schema_validation_report?.portfolio_outcome, 'none_viable');
  assert.equal(result.candidate_draft_admission_report?.portfolio_disposition?.outcome, 'none_viable');
  assert.equal(result.supplemental_round_routing_decision?.routing_decision, 'stop_without_candidate');
  assert.deepEqual(result.blocker_codes, []);
  assert.equal(result.persist_need_candidate_batch_command, null);
  assert.equal(result.persist_need_candidate_batch_result, null);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

// T-128 W-04 — generate-need-candidate prompt-body byte-identity drift anchors. Pin the rendered
// system and user message bytes for the single-agent path so any body change is a LOUD, intentional
// re-baseline (no harness/replay/e2e guard pins this v1a prompt body; these are its only coverage).
// Re-baseline ONLY for a deliberate, separately-justified wording change — NOT for mechanical edits.
const GENERATE_NEED_CANDIDATE_PROMPT_BODY_GOLDEN = {
  system: '4d964a25612b62e981ca47d6b47d774168354ba697cd9b2e31168628460cae56',
  user: 'b1dca968e9950cea2097c7a9dbaa8b1670e2d868dc71d880606d0c723ddacac3',
};
test('generate-need-candidate single-agent prompt body is byte-identity drift-anchored (T-128 W-04)', async () => {
  const { adapter, compiledContext, llmGateway } = await makeHarness('provider_llm');
  await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'product',
    mocked_output: null,
    codex_response: null,
  });
  assert.equal(llmGateway.calls.length, 1);
  assert.equal(
    sha256Text(llmGateway.calls[0]?.messages[0]?.content ?? ''),
    GENERATE_NEED_CANDIDATE_PROMPT_BODY_GOLDEN.system,
  );
  assert.equal(
    sha256Text(llmGateway.calls[0]?.messages[1]?.content ?? ''),
    GENERATE_NEED_CANDIDATE_PROMPT_BODY_GOLDEN.user,
  );
});

test('generate-need-candidate adapter blocks over-budget provider invocation before ranked artifact write', async () => {
  const { adapter, compiledContext, llmGateway, repository } = await makeHarness('provider_llm');

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'product',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 200_000,
      compression_already_applied: true,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.ranked_candidate_draft_batch, null);
  assert.equal(result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.minimum_schema_validation_report, null);
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal(result.invocation_result.provenance.provider_id, 'openai');
  assert.equal(result.invocation_result.provenance.model_id, 'gpt-5.6-sol');

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION'),
    ),
    true,
  );
});

test('generate-need-candidate adapter compresses and re-renders single-agent context before provider call', async () => {
  const { adapter, compiledContext, llmGateway, repository } = await makeHarness('provider_llm');

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'product',
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(llmGateway.calls.length, 1);
  assert.equal(result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(result.context_compression_report_artifact.payload_schema, 'TopicSelectionCompressionReportEnvelope@v1');
  assert.equal(
    result.invocation_result.provenance.compression_report_ref?.ref_id,
    result.context_compression_report_artifact.artifact_ref.ref_id,
  );
  assert.equal(
    result.invocation_result.provenance.compression_report_hash,
    result.context_compression_report_artifact.artifact_hash,
  );
  assert.match(result.invocation_result.provenance.compressed_context_hash ?? '', /^[a-f0-9]{64}$/);
  assert.equal(result.invocation_result.token_budget_gate_result?.decision, 'within_budget');
  assert.equal(result.invocation_result.token_budget_gate_result?.estimated_input_tokens, 12_000);

  const userPayload = JSON.parse(llmGateway.calls[0]?.messages[1]?.content ?? '{}') as {
    context_packets?: {
      compressed_context?: {
        schema_version?: string;
        preserved_fact_inventory?: Record<string, string[]>;
      };
    };
  };
  assert.equal(
    userPayload.context_packets?.compressed_context?.schema_version,
    'topic-selection-v1a-n6-single-agent-compressed-context-v1',
  );
  assert.deepEqual(
    userPayload.context_packets?.compressed_context?.preserved_fact_inventory?.method_family_gap,
    ['hybrid_adaptation'],
  );
  assert.equal(
    Boolean(userPayload.context_packets?.compressed_context?.preserved_fact_inventory?.source_health_warning?.length),
    true,
  );

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  const compressionArtifact = artifacts.find((artifact) =>
    JSON.stringify(artifact.payload).includes('"artifact_key":"context_compression_report"'),
  );
  assert.ok(compressionArtifact);
  assert.match(JSON.stringify(compressionArtifact.payload), /"quality_gate_result":"warned"|"quality_gate_result":"passed"/);
  assert.match(JSON.stringify(compressionArtifact.payload), /"source_refs"/);
  assert.match(JSON.stringify(compressionArtifact.payload), /"compressed_context_hash"/);
});

test('generate-need-candidate adapter blocks when compressed context remains over budget', async () => {
  const { adapter, compiledContext, llmGateway, repository, needValidationRepository } =
    await makeHarness('provider_llm');

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'product',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 200_000,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
  assert.deepEqual(result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
  assert.equal(result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.minimum_schema_validation_report_artifact, null);
  assert.equal(result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.supplemental_round_routing_decision_artifact, null);
  assert.equal(result.persist_need_candidate_batch_result, null);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
  assert.equal(result.invocation_result.token_budget_gate_result?.estimated_input_tokens, 200_000);
  assert.equal(result.invocation_result.token_budget_gate_result?.decision, 'blocked_over_budget');
  assert.equal(
    result.invocation_result.provenance.compression_report_ref?.ref_id,
    result.context_compression_report_artifact.artifact_ref.ref_id,
  );
  assert.equal(
    result.invocation_result.provenance.compression_report_hash,
    result.context_compression_report_artifact.artifact_hash,
  );

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"context_compression_report"'),
    ),
    true,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
});

test('generate-need-candidate adapter blocks when compression quality gate drops required facts', async () => {
  const { adapter, compiledContext, llmGateway, repository, needValidationRepository } =
    await makeHarness('provider_llm', {
      compression_runtime: new DroppingRequiredFactsCompressionRuntime(),
    });

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'product',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    runtime_token_budget_overrides: {
      estimated_input_tokens_override: 80_000,
      estimated_input_tokens_after_compression_override: 12_000,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'COMPRESSION_QUALITY_GATE_BLOCKED');
  assert.equal(result.blocker_codes.includes('COMPRESSION_QUALITY_GATE_BLOCKED'), true);
  assert.equal(
    result.blocker_codes.some((code) => code.startsWith('COMPRESSION_REQUIRED_') && code.endsWith('_DROPPED')),
    true,
  );
  assert.equal(result.context_compression_report_artifact?.artifact_key, 'context_compression_report');
  assert.equal(result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.minimum_schema_validation_report_artifact, null);
  assert.equal(result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.supplemental_round_routing_decision_artifact, null);
  assert.equal(result.persist_need_candidate_batch_result, null);
  assert.equal(llmGateway.calls.length, 0);
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
  assert.equal(
    result.invocation_result.provenance.compression_report_ref?.ref_id,
    result.context_compression_report_artifact.artifact_ref.ref_id,
  );
  assert.equal(
    result.invocation_result.provenance.compression_report_hash,
    result.context_compression_report_artifact.artifact_hash,
  );

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  const compressionArtifact = artifacts.find((artifact) =>
    JSON.stringify(artifact.payload).includes('"artifact_key":"context_compression_report"'),
  );
  assert.ok(compressionArtifact);
  assert.match(JSON.stringify(compressionArtifact.payload), /"quality_gate_result":"blocked"/);
  assert.match(JSON.stringify(compressionArtifact.payload), /COMPRESSION_REQUIRED_/);
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
});

test('generate-need-candidate adapter optionally persists admitted drafts idempotently', async () => {
  const { adapter, compiledContext, needValidationRepository, repository } = await makeHarness('mocked_llm');
  const first = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: rankedBatch(),
    },
  });
  const replay = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    mocked_output: {
      fixture_id: 'fixture_generate_need_candidate_happy_path',
      output: rankedBatch(),
    },
  });

  assert.equal(first.status, 'succeeded');
  assert.equal(first.persist_need_candidate_batch_command?.admitted_drafts.length, 1);
  assert.equal(
    first.persist_need_candidate_batch_command_artifact?.artifact_key,
    'persist_need_candidate_batch_command',
  );
  assert.equal(first.persist_need_candidate_batch_result?.persisted_candidate_refs.length, 1);
  assert.deepEqual(first.persist_need_candidate_batch_result?.candidate_pool_projection_entries.map((entry) => ({
    draft_id: entry.draft_id,
    rank: entry.rank,
    normalized_candidate_key: entry.normalized_candidate_key,
  })), [{
    draft_id: 'draft_001',
    rank: 1,
    normalized_candidate_key: 'need-a-risk-aware-evaluation-workflow-for-rag-fine-tuning-existing-studies-do-not-isolate-retrieval-risk-effects-during-fine-tuning',
  }]);
  assert.equal(replay.persist_need_candidate_batch_result?.replayed, true);
  assert.deepEqual(
    replay.persist_need_candidate_batch_result?.persisted_candidate_refs,
    first.persist_need_candidate_batch_result?.persisted_candidate_refs,
  );
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 1);

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"persist_need_candidate_batch_command"'),
    ),
    true,
  );
});

test('generate-need-candidate adapter blocks stale context packet expectations before invocation', async () => {
  const { adapter, compiledContext } = await makeHarness('mocked_llm');
  await assert.rejects(
    () => adapter.generateRankedCandidateDraftBatch({
      title_card_id: 'title_card_001',
      node_input: {
        ...nodeInput(compiledContext),
        policy_version: 'v2',
      },
      run_mode: 'acceptance',
      mocked_output: {
        fixture_id: 'fixture_generate_need_candidate_happy_path',
        output: rankedBatch(),
      },
    }),
    (error: unknown) => error instanceof AppError && error.errorCode === 'INVALID_PAYLOAD',
  );
});

test('generate-need-candidate adapter does not write ranked batch artifact when orchestrator blocks output', async () => {
  const { adapter, compiledContext, repository } = await makeHarness('mocked_llm');
  const malformed = {
    schema_version: 'v1',
    draft_batch: {
      batch_id: 'draft_batch_001',
      node_attempt_id: 'node_attempt_001',
      terminal_result: 'finalize',
      ranking_rationale: 'Malformed missing required arrays.',
      max_persisted_candidates: 5,
    },
    drafts: [],
    rejected_framings: [],
  } as unknown as TopicSelectionRankedCandidateDraftBatch;

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    mocked_output: {
      fixture_id: 'fixture_malformed_ranked_batch',
      output: malformed,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.ranked_candidate_draft_batch, null);
  assert.equal(result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.error_code, 'SCHEMA_VALIDATION_FAILED');
  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
});

test('generate-need-candidate adapter blocks invalid ranked batch semantics before ranked artifact write', async () => {
  const { adapter, compiledContext, repository } = await makeHarness('mocked_llm');
  const invalidBatch = rankedBatch();
  invalidBatch.draft_batch.node_attempt_id = 'node_attempt_other';
  invalidBatch.drafts = [
    {
      ...invalidBatch.drafts[0],
      evidence_role_bundle: {
        support_unit_refs: [],
        challenge_unit_refs: [],
        baseline_unit_refs: [],
        context_unit_refs: [],
      },
      strength_assessment_refs: [],
      gap_codes: [],
    },
  ];

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    mocked_output: {
      fixture_id: 'fixture_invalid_ranked_batch_semantics',
      output: invalidBatch,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'INVALID_RANKED_CANDIDATE_DRAFT_BATCH');
  assert.equal(result.ranked_candidate_draft_batch, null);
  assert.equal(result.ranked_candidate_draft_batch_artifact, null);
  assert.equal(result.minimum_schema_validation_report?.valid, false);
  assert.equal(result.minimum_schema_validation_report_artifact?.artifact_key, 'minimum_schema_validation_report');
  assert.equal(result.candidate_draft_admission_report, null);
  assert.equal(result.candidate_draft_admission_report_artifact, null);
  assert.equal(result.supplemental_round_routing_decision, null);
  assert.equal(result.supplemental_round_routing_decision_artifact, null);
  assert.ok(result.blocker_codes.includes('NODE_ATTEMPT_MISMATCH'));
  assert.ok(result.blocker_codes.includes('NO_GROUNDED_NEED_CANDIDATE'));

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"minimum_schema_validation_report"'),
    ),
    true,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"ranked_candidate_draft_batch"'),
    ),
    false,
  );
});

test('generate-need-candidate adapter blocks admission when draft refs are unresolved', async () => {
  const { adapter, compiledContext, repository } = await makeHarness('mocked_llm');
  const unresolvedBatch = rankedBatch();
  unresolvedBatch.drafts[0] = {
    ...unresolvedBatch.drafts[0],
    evidence_role_bundle: {
      ...unresolvedBatch.drafts[0].evidence_role_bundle,
      support_unit_refs: [ref('evidence_unit', 'support_missing')],
    },
  };

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    mocked_output: {
      fixture_id: 'fixture_unresolved_admission_ref',
      output: unresolvedBatch,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.error_code, 'NO_ADMISSIBLE_NEED_CANDIDATE');
  assert.equal(result.ranked_candidate_draft_batch_artifact?.artifact_key, 'ranked_candidate_draft_batch');
  assert.equal(result.candidate_draft_admission_report?.draft_results[0]?.decision, 'reject_artifact_only');
  assert.equal(result.supplemental_round_routing_decision?.routing_decision, 'block');
  assert.equal(
    result.supplemental_round_routing_decision_artifact?.artifact_key,
    'supplemental_round_routing_decision',
  );
  assert.equal(
    result.candidate_draft_admission_report?.draft_results[0]?.blocking_reason_codes.includes(
      'UNRESOLVED_CANDIDATE_DRAFT_REFS',
    ),
    true,
  );
  assert.equal(
    result.candidate_draft_admission_report_artifact?.artifact_key,
    'candidate_draft_admission_report',
  );

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"candidate_draft_admission_report"'),
    ),
    true,
  );
});

test('generate-need-candidate adapter blocks malformed role bundles before authority persistence', async () => {
  const { adapter, compiledContext, needValidationRepository } = await makeHarness('mocked_llm');
  const malformedRoleBatch = rankedBatch();
  malformedRoleBatch.drafts[0] = {
    ...malformedRoleBatch.drafts[0],
    evidence_role_bundle: {
      ...malformedRoleBatch.drafts[0].evidence_role_bundle,
      support_unit_refs: [ref('evidence_conflict', 'conflict_001')],
    },
  };

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    mocked_output: {
      fixture_id: 'fixture_malformed_role_bundle',
      output: malformedRoleBatch,
    },
  });

  assert.equal(result.status, 'blocked');
  assert.equal(result.persist_need_candidate_batch_result, null);
  assert.equal(result.candidate_draft_admission_report?.draft_results[0]?.decision, 'reject_artifact_only');
  assert.ok(result.candidate_draft_admission_report?.draft_results[0]?.blocking_reason_codes.includes('ROLE_BUNDLE_NON_EVIDENCE_REF'));
  assert.equal((await needValidationRepository.listNeedCandidatesByTitleCardId('title_card_001')).length, 0);
});

test('generate-need-candidate adapter surfaces method-family coverage warnings into persisted candidates', async () => {
  const gapExplorationPayload = explorationPayload();
  gapExplorationPayload.resource_sample_digest = {
    ...gapExplorationPayload.resource_sample_digest,
    method_family_counts: {
      retrieval_augmented_generation: 2,
      risk_analysis: 1,
    },
    covered_method_families: ['retrieval_augmented_generation', 'risk_analysis'],
    topic_method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
  };
  gapExplorationPayload.search_coverage_digest = {
    ...gapExplorationPayload.search_coverage_digest,
    method_family_targets: ['retrieval_augmented_generation', 'fine_tuning', 'hybrid_adaptation'],
  };
  const { adapter, compiledContext } = await makeHarness('mocked_llm', {
    exploration_payload: gapExplorationPayload,
  });

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    workspace_id: 'workspace_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    persist_admitted_candidates: true,
    persistence_context: persistenceContext(),
    mocked_output: {
      fixture_id: 'fixture_method_family_gap',
      output: rankedBatch(),
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.ok(result.warning_codes.includes('METHOD_FAMILY_COVERAGE_GAP'));
  assert.ok(result.candidate_draft_admission_report?.draft_results[0]?.reason_codes.includes('METHOD_FAMILY_COVERAGE_GAP'));
  assert.ok(result.persist_need_candidate_batch_result?.persisted_candidates[0]?.gap_codes.includes('METHOD_FAMILY_COVERAGE_GAP'));
});

test('generate-need-candidate adapter routes supplementable drafts without authority persistence', async () => {
  const { adapter, compiledContext, repository } = await makeHarness('mocked_llm');
  const supplementalBatch = rankedBatch();
  supplementalBatch.drafts[0] = {
    ...supplementalBatch.drafts[0],
    speculative: true,
    scope_notes: null,
    non_goal_notes: null,
    conflict_refs: [],
    evidence_role_bundle: {
      ...supplementalBatch.drafts[0].evidence_role_bundle,
      challenge_unit_refs: [],
    },
  };

  const result = await adapter.generateRankedCandidateDraftBatch({
    title_card_id: 'title_card_001',
    node_input: nodeInput(compiledContext),
    run_mode: 'acceptance',
    current_round_index: 1,
    remaining_round_budget: 1,
    mocked_output: {
      fixture_id: 'fixture_supplemental_round_candidate',
      output: supplementalBatch,
    },
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(
    result.candidate_draft_admission_report?.draft_results[0]?.decision,
    'return_for_supplemental_round',
  );
  assert.equal(result.supplemental_round_routing_decision?.routing_decision, 'run_supplemental_round');
  assert.deepEqual(result.supplemental_round_routing_decision?.allowed_roles, ['explorer', 'deep_critic']);
  assert.equal(result.supplemental_round_routing_decision?.supplemental_questions.length, 1);
  assert.equal(result.blocker_codes.length, 0);

  const artifacts = await repository.listArtifactRefsByWorkflowRunId('workflow_run_001');
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"supplemental_round_routing_decision"'),
    ),
    true,
  );
  assert.equal(
    artifacts.some((artifact) =>
      JSON.stringify(artifact.payload).includes('"artifact_key":"persist_need_candidate_batch_command"'),
    ),
    false,
  );
});
