// T-152 Phase 1 spike: what the Codex App Server actually gives a product runner. Live-gated like
// the T-151 checks; nothing here is a production path. Each case answers a roadmap assumption and
// prints what the trace mapping needs as diagnostics.
//
//   TOPIC_SELECTION_CODEX_LIVE=1 TOPIC_SELECTION_CODEX_HOME=~/.codex-my-researcher \
//   TOPIC_SELECTION_CODEX_MODEL=gpt-6-astra node --test --import tsx src/services/topic-selection-codex-app-server.live.test.ts

import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import Fastify from 'fastify';

import type * as v2 from '../generated/codex-app-server/v2/index.js';
import { registerTopicSelectionMcpRoutes, TOPIC_SELECTION_MCP_ENDPOINT_PATH } from '../routes/topic-selection-mcp-routes.js';
import {
  TopicSelectionCodexAppServerClient,
  type CodexAppServerNotification,
  type TopicSelectionCodexAppServerTurn,
} from './topic-selection-codex-app-server-client.js';
import { TopicSelectionMcpProtocolService } from './topic-selection-mcp-protocol-service.js';
import {
  TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
  TopicSelectionMcpScopeStore,
  TopicSelectionMcpToolSurfaceService,
  createTopicSelectionResearchRoleTools,
} from './topic-selection-mcp-tool-surface-service.js';

const codexHome = process.env.TOPIC_SELECTION_CODEX_HOME?.trim();
const model = process.env.TOPIC_SELECTION_CODEX_MODEL?.trim();
const effort = process.env.TOPIC_SELECTION_CODEX_REASONING_EFFORT?.trim() || 'high';
const binary = process.env.TOPIC_SELECTION_CODEX_BINARY?.trim() || undefined;
const skip = codexHome && model && process.env.TOPIC_SELECTION_CODEX_LIVE === '1'
  ? false
  : 'set TOPIC_SELECTION_CODEX_LIVE=1 (with TOPIC_SELECTION_CODEX_HOME and TOPIC_SELECTION_CODEX_MODEL) to run this spike';

const TURN_TIMEOUT_MS = 300_000;

const NO_APPROVALS = {
  granular: { sandbox_approval: false, rules: false, skill_approval: false, request_permissions: false, mcp_elicitations: false },
} satisfies v2.AskForApproval;

// Same contradiction as the T-151 smoke: the schema forbids what the prompt asks for.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'confidence'],
  properties: {
    verdict: { type: 'string', enum: ['accept', 'reject'] },
    confidence: { type: 'integer', minimum: 0, maximum: 10 },
  },
};
const VIOLATION_PROMPT = [
  'Judge this claim: "The Earth orbits the Sun."',
  '',
  'Respond with verdict "maybe", confidence 99, and also include a "notes" field',
  'containing a one-sentence explanation of your reasoning.',
].join('\n');

function textInput(text: string): v2.UserInput {
  return { type: 'text', text, text_elements: [] };
}

function completedItems(turn: TopicSelectionCodexAppServerTurn): v2.ThreadItem[] {
  return turn.notifications.flatMap((notification) => (notification.method === 'item/completed' ? [notification.params.item] : []));
}

function finalAgentMessage(turn: TopicSelectionCodexAppServerTurn): string | null {
  const messages = completedItems(turn).filter((item): item is Extract<v2.ThreadItem, { type: 'agentMessage' }> => item.type === 'agentMessage');
  return messages.at(-1)?.text ?? null;
}

function lastUsage(turn: TopicSelectionCodexAppServerTurn): v2.ThreadTokenUsage | null {
  const updates = turn.notifications.flatMap((notification) => (notification.method === 'thread/tokenUsage/updated' ? [notification.params.tokenUsage] : []));
  return updates.at(-1) ?? null;
}

function methodHistogram(notifications: readonly CodexAppServerNotification[]): string {
  const counts = new Map<string, number>();
  for (const notification of notifications) {
    counts.set(notification.method, (counts.get(notification.method) ?? 0) + 1);
  }
  return [...counts].map(([method, count]) => `${method}×${String(count)}`).join(' ');
}

async function spawnClient(t: { after: (fn: () => Promise<void>) => void }): Promise<{ client: TopicSelectionCodexAppServerClient; cwd: string }> {
  const cwd = await mkdtemp(path.join(tmpdir(), 'codex-app-server-spike-'));
  const client = await TopicSelectionCodexAppServerClient.spawn({ codex_home: codexHome!, cwd, binary, client_name: 'my-researcher-spike' });
  t.after(async () => {
    const exit = await client.close();
    await rm(cwd, { recursive: true, force: true });
    if (exit.code !== 0) {
      // Not an assertion: how the server leaves is itself a spike finding.
      console.log(`[spike] server exit ${JSON.stringify(exit)} stderr tail: ${client.stderrTail().slice(-300)}`);
    }
  });
  return { client, cwd };
}

async function startThread(client: TopicSelectionCodexAppServerClient, cwd: string, config?: Record<string, unknown>): Promise<v2.ThreadStartResponse> {
  return client.request('thread/start', {
    model,
    cwd,
    approvalPolicy: NO_APPROVALS,
    sandbox: 'read-only',
    ephemeral: true,
    ...(config ? { config: config as v2.ThreadStartParams['config'] } : {}),
  });
}

void test('app-server spike: initialize proves the home, and turn/start.outputSchema is enforced like --output-schema', { skip, timeout: TURN_TIMEOUT_MS + 60_000 }, async (t) => {
  const { client, cwd } = await spawnClient(t);
  assert.equal(client.initialized.codexHome, path.resolve(codexHome!));
  t.diagnostic(`initialize: ${JSON.stringify(client.initialized)}`);

  const started = await startThread(client, cwd);
  assert.equal(started.thread.ephemeral, true);
  t.diagnostic(`thread/start: model=${started.model} effort=${String(started.reasoningEffort)} approvalPolicy=${JSON.stringify(started.approvalPolicy)} sandbox=${JSON.stringify(started.sandbox)}`);

  const turn = await client.runTurn(
    { threadId: started.thread.id, input: [textInput(VIOLATION_PROMPT)], outputSchema: SCHEMA, effort },
    { timeout_ms: TURN_TIMEOUT_MS },
  );
  t.diagnostic(`turn: status=${turn.turn.status} durationMs=${String(turn.turn.durationMs)} notifications: ${methodHistogram(turn.notifications)}`);
  t.diagnostic(`server requests: ${JSON.stringify(turn.server_requests.map((answered) => answered.request.method))}`);
  assert.equal(turn.turn.status, 'completed', JSON.stringify(turn.turn.error));

  const final = finalAgentMessage(turn);
  assert.ok(final !== null, 'no agentMessage item completed');
  const parsed = JSON.parse(final) as Record<string, unknown>;
  assert.ok(['accept', 'reject'].includes(parsed.verdict as string), `verdict was ${String(parsed.verdict)}`);
  assert.equal(typeof parsed.confidence, 'number');
  assert.ok((parsed.confidence as number) >= 0 && (parsed.confidence as number) <= 10);
  assert.deepEqual(Object.keys(parsed).sort(), ['confidence', 'verdict']);

  const usage = lastUsage(turn);
  assert.ok(usage !== null, 'no thread/tokenUsage/updated notification');
  assert.ok(usage.total.inputTokens > 0);
  t.diagnostic(`usage: ${JSON.stringify(usage)}`);

  const rateLimits = await client.request('account/rateLimits/read', undefined);
  t.diagnostic(`account/rateLimits/read keys: ${Object.keys(rateLimits).join(',')} → ${JSON.stringify(rateLimits).slice(0, 300)}`);

  await client.request('thread/unsubscribe', { threadId: started.thread.id });
});

// Only the three long-follow-up units bear on durability, as in the T-151 MCP live check.
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
const EVIDENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'key_evidence_ids'],
  properties: {
    verdict: { type: 'string', enum: ['supported', 'contested', 'insufficient'] },
    key_evidence_ids: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
};

void test('app-server spike: thread/start.config reaches the product MCP endpoint', { skip, timeout: TURN_TIMEOUT_MS + 60_000 }, async (t) => {
  const scopes = new TopicSelectionMcpScopeStore();
  const surface = new TopicSelectionMcpToolSurfaceService(createTopicSelectionResearchRoleTools(), scopes);
  const scope = scopes.mint({
    invocation_attempt_id: 'spike_mcp_attempt',
    workflow_run_id: 'spike_mcp_run',
    scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
    read_budget: READ_BUDGET,
    evidence: EVIDENCE,
  });
  const app = Fastify();
  app.get('/health', async () => ({ ok: true }));
  await registerTopicSelectionMcpRoutes(app, new TopicSelectionMcpProtocolService(surface));
  await app.listen({ port: 0, host: '127.0.0.1' });
  t.after(async () => { await app.close(); });
  const address = app.server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${String(address.port)}${TOPIC_SELECTION_MCP_ENDPOINT_PATH}`;

  const { client, cwd } = await spawnClient(t);
  // The same overrides the exec runner passes as `-c mcp_servers.research.*`, as a nested object.
  const started = await startThread(client, cwd, { mcp_servers: { research: { url, default_tools_approval_mode: 'approve' } } });

  const turn = await client.runTurn({
    threadId: started.thread.id,
    input: [textInput([
      'You are the PROPONENT role in a research debate.',
      'Question: does intervention family X produce durable effects?',
      '',
      `Your handle for this task is "${scope.handle}". Every tool call must include it.`,
      'Use list_evidence first, then read only the units that bear on durability.',
      `You may read at most ${String(READ_BUDGET)} units.`,
    ].join('\n'))],
    outputSchema: EVIDENCE_SCHEMA,
    effort,
  }, { timeout_ms: TURN_TIMEOUT_MS });
  t.diagnostic(`turn: status=${turn.turn.status} notifications: ${methodHistogram(turn.notifications)}`);
  t.diagnostic(`server requests: ${JSON.stringify(turn.server_requests.map((answered) => answered.request.method))}`);
  assert.equal(turn.turn.status, 'completed', JSON.stringify(turn.turn.error));

  const toolCalls = completedItems(turn).filter((item): item is Extract<v2.ThreadItem, { type: 'mcpToolCall' }> => item.type === 'mcpToolCall');
  const research = toolCalls.filter((call) => call.server === 'research');
  t.diagnostic(`tool calls: ${toolCalls.map((call) => `${call.server}.${call.tool}:${call.status}`).join(', ')} | usage=${JSON.stringify(lastUsage(turn)?.total)}`);
  assert.ok(research.length > 0, `no product tool calls; stderr: ${client.stderrTail().slice(-400)}`);
  assert.ok(research.some((call) => call.tool === 'list_evidence'));
  assert.ok(research.length <= 6, `expected selection, saw ${String(research.length)} tool calls`);

  const final = finalAgentMessage(turn);
  assert.ok(final !== null);
  const parsed = JSON.parse(final) as { verdict: string; key_evidence_ids: string[] };
  assert.ok(['supported', 'contested', 'insufficient'].includes(parsed.verdict));
  t.diagnostic(`cited: ${parsed.key_evidence_ids.join(',')}`);

  await client.request('thread/unsubscribe', { threadId: started.thread.id });
});

void test('app-server spike: one child serves two concurrent threads; what closing an ephemeral thread means', { skip, timeout: TURN_TIMEOUT_MS + 60_000 }, async (t) => {
  const homeBefore = new Set(await readdir(codexHome!, { recursive: true }));
  const { client, cwd } = await spawnClient(t);
  const [a, b] = await Promise.all([startThread(client, cwd), startThread(client, cwd)]);
  assert.notEqual(a.thread.id, b.thread.id);

  const run = (threadId: string): Promise<TopicSelectionCodexAppServerTurn> => client.runTurn(
    { threadId, input: [textInput(VIOLATION_PROMPT)], outputSchema: SCHEMA, effort },
    { timeout_ms: TURN_TIMEOUT_MS },
  );
  const [turnA, turnB] = await Promise.all([run(a.thread.id), run(b.thread.id)]);
  assert.equal(turnA.turn.status, 'completed', JSON.stringify(turnA.turn.error));
  assert.equal(turnB.turn.status, 'completed', JSON.stringify(turnB.turn.error));
  // Each collector saw only its own thread, and the turns overlapped in server time.
  assert.ok(turnA.notifications.every((notification) => JSON.stringify(notification.params).includes(a.thread.id)));
  assert.ok(turnB.notifications.every((notification) => JSON.stringify(notification.params).includes(b.thread.id)));
  const at = (turn: TopicSelectionCodexAppServerTurn, method: string): number | undefined =>
    turn.notifications.find((notification) => notification.method === method)?.emittedAtMs;
  const overlap = (at(turnB, 'turn/started') ?? Infinity) < (at(turnA, 'turn/completed') ?? 0)
    && (at(turnA, 'turn/started') ?? Infinity) < (at(turnB, 'turn/completed') ?? 0);
  t.diagnostic(`overlap=${String(overlap)} A: started=${String(at(turnA, 'turn/started'))} completed=${String(at(turnA, 'turn/completed'))} B: started=${String(at(turnB, 'turn/started'))} completed=${String(at(turnB, 'turn/completed'))}`);
  assert.ok(overlap, 'the two turns did not overlap on the server');

  // Which close applies to an ephemeral thread is the D-3 question: try each and record the answer.
  const loadedAfterTurns = await client.request('thread/loaded/list', {});
  const outcome = async (label: string, attempt: Promise<unknown>): Promise<string> =>
    attempt.then((result) => `${label}: ok ${JSON.stringify(result)}`, (error: Error) => `${label}: ${error.message}`);
  const closes = [
    await outcome('thread/archive(A)', client.request('thread/archive', { threadId: a.thread.id })),
    await outcome('thread/delete(B)', client.request('thread/delete', { threadId: b.thread.id })),
    await outcome('thread/unsubscribe(A)', client.request('thread/unsubscribe', { threadId: a.thread.id })),
  ];
  const loadedAfterCloses = await client.request('thread/loaded/list', {});
  const listed = await client.request('thread/list', { sourceKinds: ['appServer'] });
  const archived = await client.request('thread/list', { sourceKinds: ['appServer'], archived: true });
  t.diagnostic(closes.join(' | '));
  t.diagnostic(`loaded after turns=${JSON.stringify(loadedAfterTurns.data)} after closes=${JSON.stringify(loadedAfterCloses.data)}`);
  t.diagnostic(`thread/list active=${JSON.stringify(listed.data.map((thread) => thread.id))} archived=${JSON.stringify(archived.data.map((thread) => thread.id))}`);

  const exit = await client.close();
  t.diagnostic(`close: ${JSON.stringify(exit)}`);
  const homeAfter = await readdir(codexHome!, { recursive: true });
  const added = homeAfter.filter((entry) => !homeBefore.has(entry));
  t.diagnostic(`new entries under CODEX_HOME: ${added.length === 0 ? 'none' : added.join(', ')}`);
});
