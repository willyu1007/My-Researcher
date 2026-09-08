// T-151 Phase 2 guards. These are the invariants the tool surface exists to hold: a handle only
// reaches its own scope, and the server is the thing that stops an agentic loop.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
  TopicSelectionMcpScopeStore,
  createTopicSelectionResearchRoleTools,
  TopicSelectionMcpToolSurfaceService,
  type TopicSelectionMcpToolHandler,
} from './topic-selection-mcp-tool-surface-service.js';

const RESEARCH = 'research_role';
const ORCHESTRATION = 'orchestration';

function surface(): {
  service: TopicSelectionMcpToolSurfaceService;
  scopes: TopicSelectionMcpScopeStore;
  calls: string[];
} {
  const calls: string[] = [];
  const handlers: TopicSelectionMcpToolHandler[] = [
    {
      scope_id: RESEARCH,
      definition: { name: 'list_evidence', description: 'index', inputSchema: { type: 'object' } },
      reads: () => 0,
      run: async () => { calls.push('list_evidence'); return 'EVIDENCE-001 | 12mo'; },
    },
    {
      scope_id: RESEARCH,
      definition: { name: 'read_evidence', description: 'fetch', inputSchema: { type: 'object' } },
      reads: (args) => (Array.isArray(args.ids) ? args.ids.length : 0),
      run: async (args) => { calls.push('read_evidence'); return `read ${String((args.ids as string[]).length)}`; },
    },
    {
      scope_id: ORCHESTRATION,
      definition: { name: 'request_promotion', description: 'gated write', inputSchema: { type: 'object' } },
      reads: () => 0,
      run: async () => { calls.push('request_promotion'); return 'requested'; },
    },
  ];
  let seq = 0;
  const scopes = new TopicSelectionMcpScopeStore(() => `handle_${++seq}`);
  return { service: new TopicSelectionMcpToolSurfaceService(handlers, scopes), scopes, calls };
}

function researchScope(scopes: TopicSelectionMcpScopeStore, budget = 3) {
  return scopes.mint({
    invocation_attempt_id: 'attempt_1',
    workflow_run_id: 'run_1',
    scope_id: RESEARCH,
    read_budget: budget,
  evidence: [],
  });
}

void test('a research handle cannot reach a tool that advances the workflow', async () => {
  const { service, scopes, calls } = surface();
  const scope = researchScope(scopes);

  const result = await service.call('request_promotion', { handle: scope.handle });

  assert.equal(result.status, 'refused');
  if (result.status !== 'refused') { return; }
  assert.equal(result.refusal, 'SCOPE_MISMATCH');
  // The refusal happens before the handler, so the tool never observed the attempt at all.
  assert.deepEqual(calls, []);
});

void test('an unrecognised handle is refused before any tool runs', async () => {
  const { service, calls } = surface();
  const result = await service.call('list_evidence', { handle: 'handle_forged' });

  assert.equal(result.status, 'refused');
  if (result.status !== 'refused') { return; }
  assert.equal(result.refusal, 'UNKNOWN_HANDLE');
  assert.deepEqual(calls, []);
});

void test('the server stops the loop when the read budget runs out', async () => {
  const { service, scopes } = surface();
  const scope = researchScope(scopes, 3);

  const first = await service.call('read_evidence', { handle: scope.handle, ids: ['A', 'B'] });
  assert.equal(first.status, 'ok');

  const over = await service.call('read_evidence', { handle: scope.handle, ids: ['C', 'D'] });
  assert.equal(over.status, 'refused');
  if (over.status !== 'refused') { return; }
  assert.equal(over.refusal, 'READ_BUDGET_EXCEEDED');
  // The refusal must tell the model how to succeed on a retry, not merely that it failed.
  assert.match(over.text, /only 1 of this task's read budget of 3 remain/);
  assert.match(over.text, /Request at most 1/);

  // A refusal must not spend budget, or one over-large request would poison the rest of the task.
  const within = await service.call('read_evidence', { handle: scope.handle, ids: ['C'] });
  assert.equal(within.status, 'ok');
});

void test('the index is free so an agent can look before it chooses', async () => {
  const { service, scopes } = surface();
  const scope = researchScope(scopes, 1);

  for (let i = 0; i < 5; i += 1) {
    assert.equal((await service.call('list_evidence', { handle: scope.handle })).status, 'ok');
  }
  // The whole budget is still available for actual reads.
  assert.equal((await service.call('read_evidence', { handle: scope.handle, ids: ['A'] })).status, 'ok');
});

void test('a released handle stops working, so it cannot outlive its attempt', async () => {
  const { service, scopes } = surface();
  const scope = researchScope(scopes);
  assert.equal((await service.call('list_evidence', { handle: scope.handle })).status, 'ok');

  scopes.release(scope.handle);

  const after = await service.call('list_evidence', { handle: scope.handle });
  assert.equal(after.status, 'refused');
  if (after.status !== 'refused') { return; }
  assert.equal(after.refusal, 'UNKNOWN_HANDLE');
});

void test('unknown tools and malformed arguments are refused, not thrown', async () => {
  const { service, scopes } = surface();
  const scope = researchScope(scopes);

  const unknown = await service.call('delete_everything', { handle: scope.handle });
  assert.equal(unknown.status, 'refused');
  const malformed = await service.call('list_evidence', ['not', 'an', 'object']);
  assert.equal(malformed.status, 'refused');
});

void test('tool listing can be narrowed to one scope', () => {
  const { service } = surface();
  assert.deepEqual(service.listTools(RESEARCH).map((tool) => tool.name), ['list_evidence', 'read_evidence']);
  assert.deepEqual(service.listTools(ORCHESTRATION).map((tool) => tool.name), ['request_promotion']);
  assert.equal(service.listTools().length, 3);
});

function researchSurface(units: Array<{ id: string; index_fields: Record<string, string | number>; body: string }>, budget = 3) {
  const scopes = new TopicSelectionMcpScopeStore(() => 'handle_research');
  const service = new TopicSelectionMcpToolSurfaceService(createTopicSelectionResearchRoleTools(), scopes);
  const scope = scopes.mint({
    invocation_attempt_id: 'a1',
    workflow_run_id: 'r1',
    scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
    read_budget: budget,
    evidence: units,
  });
  return { service, scope };
}

const UNITS = [
  { id: 'EVIDENCE-001', index_fields: { followup_months: 3, n: 97 }, body: 'unit one body' },
  { id: 'EVIDENCE-002', index_fields: { followup_months: 24, n: 104 }, body: 'unit two body' },
];

void test('the index exposes the fields that let an agent choose, and costs nothing', async () => {
  const { service, scope } = researchSurface(UNITS, 1);

  const listed = await service.call('list_evidence', { handle: scope.handle });
  assert.equal(listed.status, 'ok');
  if (listed.status !== 'ok') { return; }
  assert.equal(listed.reads_charged, 0);
  assert.equal(listed.text.split('\n')[0], 'id | followup_months | n');
  assert.match(listed.text, /EVIDENCE-002 \| 24 \| 104/);
  // Bodies stay out of the index; reading is what costs.
  assert.doesNotMatch(listed.text, /unit two body/);
});

void test('a batched read returns the bodies and charges one read per unit', async () => {
  const { service, scope } = researchSurface(UNITS, 2);

  const read = await service.call('read_evidence', { handle: scope.handle, ids: ['EVIDENCE-002', 'EVIDENCE-001'] });
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') { return; }
  assert.equal(read.reads_charged, 2);
  assert.match(read.text, /unit two body/);
  assert.match(read.text, /unit one body/);
});

void test('a unit outside the attempt is reported as unavailable, not leaked', async () => {
  const { service, scope } = researchSurface(UNITS);

  const read = await service.call('read_evidence', { handle: scope.handle, ids: ['EVIDENCE-999'] });
  assert.equal(read.status, 'ok');
  if (read.status !== 'ok') { return; }
  // The bundle travels with the handle, so another attempt's evidence is not reachable at all.
  assert.match(read.text, /No evidence unit EVIDENCE-999 is available for this task/);
});

void test('an empty bundle says so rather than rendering an empty table', async () => {
  const { service, scope } = researchSurface([]);
  const listed = await service.call('list_evidence', { handle: scope.handle });
  assert.equal(listed.status, 'ok');
  if (listed.status !== 'ok') { return; }
  assert.match(listed.text, /No evidence units are available/);
});
