// T-151 Phase 2 live check: a real Codex run reaching the product's own tool surface over HTTP.
//
// This is the claim the whole phase rests on, and it cannot be established with a stub: it needs
// the real client's handshake, its health check, its tool-call envelope, and its judgement about
// what to read. Gated on the same deployment variables as the Phase 1 live smoke.

import assert from 'node:assert/strict';
import test from 'node:test';

import Fastify from 'fastify';

import { registerTopicSelectionMcpRoutes, TOPIC_SELECTION_MCP_ENDPOINT_PATH } from './topic-selection-mcp-routes.js';
import { TopicSelectionMcpProtocolService } from '../services/topic-selection-mcp-protocol-service.js';
import {
  TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
  TopicSelectionMcpScopeStore,
  TopicSelectionMcpToolSurfaceService,
  createTopicSelectionResearchRoleTools,
} from '../services/topic-selection-mcp-tool-surface-service.js';
import { createTopicSelectionCodexCliRunnerFromEnv } from '../services/topic-selection-codex-cli-runner-service.js';

const live = createTopicSelectionCodexCliRunnerFromEnv();
const skip = live
  ? false
  : 'set TOPIC_SELECTION_CODEX_HOME and TOPIC_SELECTION_CODEX_MODEL to run the codex_cli MCP live check';

// Only the three long-follow-up units bear on durability. A selective agent reads those and stops;
// an agent given nothing to select on reads everything, which is what the flat-index probe did.
const DURABLE_IDS = ['EVIDENCE-004', 'EVIDENCE-008', 'EVIDENCE-012'];
const EVIDENCE = Array.from({ length: 12 }, (_, index) => {
  const id = `EVIDENCE-${String(index + 1).padStart(3, '0')}`;
  const durable = DURABLE_IDS.includes(id);
  return {
    id,
    index_fields: { followup_months: durable ? 24 : 3, n: 90 + index * 7 },
    body: `${id}: effect ${(0.4 + index * 0.05).toFixed(2)} measured at ${durable ? 24 : 3}-month follow-up.`,
  };
});

const READ_BUDGET = 5;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'key_evidence_ids'],
  properties: {
    verdict: { type: 'string', enum: ['supported', 'contested', 'insufficient'] },
    key_evidence_ids: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
};

void test('a real Codex run reaches the product tool surface over HTTP and selects rather than enumerates', { skip }, async (t) => {
  const scopes = new TopicSelectionMcpScopeStore();
  const surface = new TopicSelectionMcpToolSurfaceService(createTopicSelectionResearchRoleTools(), scopes);
  const scope = scopes.mint({
    invocation_attempt_id: 'live_mcp_attempt',
    workflow_run_id: 'live_mcp_run',
    scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
    read_budget: READ_BUDGET,
    evidence: EVIDENCE,
  });

  const app = Fastify();
  // Codex health-checks the origin before it will initialise an HTTP MCP server.
  app.get('/health', async () => ({ ok: true }));
  await registerTopicSelectionMcpRoutes(app, new TopicSelectionMcpProtocolService(surface));
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => { await app.close(); });

  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}${TOPIC_SELECTION_MCP_ENDPOINT_PATH}`;

  const outcome = await live!.runner.run({
    prompt: [
      'You are the PROPONENT role in a research debate.',
      'Question: does intervention family X produce durable effects?',
      '',
      `Your handle for this task is "${scope.handle}". Every tool call must include it.`,
      'Use list_evidence first, then read only the units that bear on durability.',
      `You may read at most ${READ_BUDGET} units.`,
    ].join('\n'),
    output_schema: SCHEMA,
    invocation_attempt_id: 'live_mcp_attempt',
    mcp_servers: [{ name: 'research', url }],
  });

  assert.equal(outcome.status, 'succeeded', `live MCP run failed: ${JSON.stringify(outcome).slice(0, 500)}`);
  if (outcome.status !== 'succeeded') { return; }

  // The product's tools were actually reached, over HTTP, by the real client.
  const called = outcome.tool_calls.filter((call) => call.server === 'research');
  assert.ok(called.length > 0, `no product tool calls in trace: ${JSON.stringify(outcome.tool_calls)}`);
  assert.ok(called.some((call) => call.tool === 'list_evidence'));
  assert.ok(called.every((call) => call.status === 'completed' || call.status === 'failed'));

  // Selection, not enumeration: a discriminating index should keep this well under one call per unit.
  assert.ok(called.length <= 6, `expected selection, saw ${called.length} tool calls`);

  const parsed = JSON.parse(outcome.final_message) as { verdict: string; key_evidence_ids: string[] };
  t.diagnostic(
    `tool calls: ${called.map((call) => call.tool).join(', ')} | usage in=${String(outcome.usage?.input_tokens)} `
    + `cached=${String(outcome.usage?.cached_input_tokens)} | cited: ${parsed.key_evidence_ids.join(',')}`,
  );
  assert.ok(['supported', 'contested', 'insufficient'].includes(parsed.verdict));
  assert.ok(parsed.key_evidence_ids.length <= 3);
});

void test('the server, not the model, is what stops the loop when the budget runs out', { skip }, async (t) => {
  const scopes = new TopicSelectionMcpScopeStore();
  const surface = new TopicSelectionMcpToolSurfaceService(createTopicSelectionResearchRoleTools(), scopes);
  const tightBudget = 1;
  const scope = scopes.mint({
    invocation_attempt_id: 'live_mcp_budget',
    workflow_run_id: 'live_mcp_run',
    scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
    read_budget: tightBudget,
    evidence: EVIDENCE,
  });

  const app = Fastify();
  app.get('/health', async () => ({ ok: true }));
  await registerTopicSelectionMcpRoutes(app, new TopicSelectionMcpProtocolService(surface));
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => { await app.close(); });
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');

  const outcome = await live!.runner.run({
    // The prompt deliberately asks for more than the budget allows: the guarantee is that the
    // server refuses, not that the model restrains itself.
    prompt: [
      'You are the PROPONENT role in a research debate.',
      'Question: does intervention family X produce durable effects?',
      '',
      `Your handle for this task is "${scope.handle}". Every tool call must include it.`,
      'Read the full text of every evidence unit with a 24-month follow-up before answering.',
    ].join('\n'),
    output_schema: SCHEMA,
    invocation_attempt_id: 'live_mcp_budget',
    mcp_servers: [{ name: 'research', url: `http://127.0.0.1:${address.port}${TOPIC_SELECTION_MCP_ENDPOINT_PATH}` }],
  });

  assert.equal(outcome.status, 'succeeded', `budget run failed: ${JSON.stringify(outcome).slice(0, 400)}`);

  // The guarantee: the product served no more than it authorised, whatever the model asked for.
  const served = scopes.resolve(scope.handle);
  assert.ok(served);
  assert.ok(served.reads_used <= tightBudget, `served ${served.reads_used} reads against a budget of ${tightBudget}`);
  // The refusal must also be legible in the trace, which is this line's evidence of record.
  const traced = outcome.status === 'succeeded' ? outcome.tool_calls : [];
  t.diagnostic(
    `reads served: ${served.reads_used} / ${tightBudget} | trace: `
    + traced.map((call) => `${call.tool}:${call.status}`).join(', '),
  );
  assert.ok(traced.some((call) => call.tool === 'read_evidence'), 'the refused read is absent from the trace');
});
