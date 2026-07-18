import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION,
  topicSelectionAgentInvocationAuditSnapshotSchema,
  type TopicSelectionAgentInvocationAuditSnapshot,
} from './topic-selection-agent-invocation-contracts.js';

const hash = 'a'.repeat(64);

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify({
    ajv: {
      customOptions: {
        allErrors: true,
        removeAdditional: false,
      },
    },
  });
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

function providerAuditSnapshot(): TopicSelectionAgentInvocationAuditSnapshot {
  return {
    schema_version: TOPIC_SELECTION_AGENT_INVOCATION_AUDIT_SCHEMA_VERSION,
    node_id: 'topic-selection.v1a.generate-need-candidate.v1',
    workflow_run_id: 'workflow_run_001',
    node_attempt_id: 'node_attempt_001',
    status: 'succeeded',
    provenance: {
      workflow_run_id: 'workflow_run_001',
      node_id: 'topic-selection.v1a.generate-need-candidate.v1',
      node_attempt_id: 'node_attempt_001',
      invocation_attempt_id: 'node_attempt_001',
      execution_mode: 'provider_llm',
      executor_kind: 'single_agent',
      source_kind: 'provider_response',
      non_provider: false,
      run_mode: 'product',
      profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
      profile_version: 'v1',
      profile_hash: hash,
      model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
      normalized_params_hash: hash,
      capability_degraded: false,
      capability_degrade_reason: null,
      output_contract: 'RankedCandidateDraftBatch@v1',
      prompt_template_id: 'topic-selection-generate-need-candidate',
      prompt_template_version: 'v1',
      schema_name: 'topic_selection_ranked_candidate_draft_batch',
      prompt_packet_hash: hash,
      response_hash: hash,
      structured_output_hash: hash,
      cache_status: 'not_applicable',
      response_reuse_ref: null,
      provider_id: 'openai',
      model_id: 'gpt-5.6-sol',
      telemetry: {
        provider_id: 'openai',
        model_id: 'gpt-5.6-sol',
        profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
        prompt_template_id: 'topic-selection-generate-need-candidate',
        prompt_template_version: 'v1',
        elapsed_ms: 1200,
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
      },
    },
    token_budget_gate_result: null,
    validation: {
      valid: true,
      error_count: 0,
      errors: [],
    },
    warning_codes: [],
    blocker_codes: [],
    created_at: '2026-05-20T00:00:00.000Z',
  };
}

test('topic-selection agent invocation audit schema accepts provider provenance envelope', async () => {
  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, providerAuditSnapshot()), true);
});

test('topic-selection agent invocation audit schema rejects provider provenance without model option params', async () => {
  const snapshot = providerAuditSnapshot();
  snapshot.provenance.model_option_id = null;
  snapshot.provenance.normalized_params_hash = null;

  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, snapshot), false);
});

test('topic-selection agent invocation audit schema rejects missing token-budget gate field', async () => {
  const snapshot = providerAuditSnapshot() as unknown as Record<string, unknown>;
  delete snapshot.token_budget_gate_result;

  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, snapshot), false);
});

test('topic-selection agent invocation audit schema rejects raw response and hidden reasoning fields', async () => {
  const snapshot = providerAuditSnapshot() as unknown as Record<string, unknown>;
  snapshot.raw_provider_response = { text: 'not allowed' };

  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, snapshot), false);

  const provenance = providerAuditSnapshot() as unknown as Record<string, unknown>;
  (provenance.provenance as Record<string, unknown>).hidden_reasoning = 'not allowed';

  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, provenance), false);
});

test('topic-selection agent invocation audit schema accepts codex and mock provenance markers', async () => {
  const codex = providerAuditSnapshot();
  codex.provenance.execution_mode = 'codex_assisted';
  codex.provenance.executor_kind = 'codex_assisted';
  codex.provenance.source_kind = 'codex_response';
  codex.provenance.non_provider = true;
  codex.provenance.run_mode = 'acceptance';
  codex.provenance.model_option_id = null;
  codex.provenance.normalized_params_hash = null;
  codex.provenance.provider_id = null;
  codex.provenance.model_id = null;
  codex.provenance.telemetry = null;
  codex.provenance.operator_label = 'codex-local';
  codex.provenance.response_source = 'operator_supplied';
  codex.provenance.local_approval_setting_ref = null;

  const mock = providerAuditSnapshot();
  mock.provenance.execution_mode = 'mocked_llm';
  mock.provenance.source_kind = 'mock_fixture';
  mock.provenance.non_provider = true;
  mock.provenance.run_mode = 'test';
  mock.provenance.model_option_id = null;
  mock.provenance.normalized_params_hash = null;
  mock.provenance.provider_id = null;
  mock.provenance.model_id = null;
  mock.provenance.telemetry = null;
  mock.provenance.fixture_id = 'fixture_generate_need_candidate_happy_path';
  mock.provenance.fixture_hash = hash;

  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, codex), true);
  assert.equal(await validatesBody(topicSelectionAgentInvocationAuditSnapshotSchema, mock), true);
});
