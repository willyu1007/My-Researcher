// T-151 Phase 2 protocol guards. The load-bearing one is equivalence: if a tool can behave
// differently depending on which revision reached it, the shim has stopped being a translation and
// become a second implementation.

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TOPIC_SELECTION_MCP_NATIVE_REVISION,
  TopicSelectionMcpProtocolService,
} from './topic-selection-mcp-protocol-service.js';
import {
  TopicSelectionMcpScopeStore,
  TopicSelectionMcpToolSurfaceService,
  type TopicSelectionMcpToolHandler,
} from './topic-selection-mcp-tool-surface-service.js';

const RESEARCH = 'research_role';

function makeProtocol() {
  const handlers: TopicSelectionMcpToolHandler[] = [{
    scope_id: RESEARCH,
    definition: { name: 'read_evidence', description: 'fetch', inputSchema: { type: 'object' } },
    reads: (args) => (Array.isArray(args.ids) ? args.ids.length : 0),
    run: async (args) => `read ${(args.ids as string[]).join(',')}`,
  }];
  let seq = 0;
  const scopes = new TopicSelectionMcpScopeStore(() => `handle_${++seq}`);
  const surface = new TopicSelectionMcpToolSurfaceService(handlers, scopes);
  return { protocol: new TopicSelectionMcpProtocolService(surface), scopes };
}

const nativeMeta = { _meta: { 'io.modelcontextprotocol/protocolVersion': TOPIC_SELECTION_MCP_NATIVE_REVISION } };

function resultOf(response: unknown): Record<string, unknown> {
  assert.ok(response && typeof response === 'object' && 'result' in response);
  return (response as { result: Record<string, unknown> }).result;
}

void test('the same tool call returns the same content natively and through the shim', async () => {
  const { protocol, scopes } = makeProtocol();
  const scope = scopes.mint({
    invocation_attempt_id: 'a1', workflow_run_id: 'r1', scope_id: RESEARCH, read_budget: 10, evidence: [],
  });
  const args = { name: 'read_evidence', arguments: { handle: scope.handle, ids: ['A', 'B'] } };

  const shim = resultOf(await protocol.handle({ id: 1, method: 'tools/call', params: args }));
  const native = resultOf(await protocol.handle({ id: 2, method: 'tools/call', params: { ...args, ...nativeMeta } }));

  assert.deepEqual(shim.content, native.content);
  assert.equal(shim.isError, native.isError);
  // The envelope is the only difference: the current revision requires resultType on every result,
  // and clients of the older revisions must treat its absence as complete.
  assert.equal(shim.resultType, undefined);
  assert.equal(native.resultType, 'complete');
});

void test('server/discover advertises the native revision and the shimmed ones', async () => {
  const { protocol } = makeProtocol();
  const result = resultOf(await protocol.handle({ id: 1, method: 'server/discover', params: nativeMeta }));

  const versions = result.protocolVersions as string[];
  assert.equal(versions[0], TOPIC_SELECTION_MCP_NATIVE_REVISION);
  assert.ok(versions.includes('2025-06-18'));
});

void test('the handshake is answered only on the shim path', async () => {
  const { protocol } = makeProtocol();
  const result = resultOf(await protocol.handle({
    id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' },
  }));

  assert.equal(result.protocolVersion, '2025-06-18');
  assert.equal(result.resultType, undefined);
});

void test('an unsupported revision is refused with the versions the server does speak', async () => {
  const { protocol } = makeProtocol();
  const response = await protocol.handle({
    id: 1, method: 'tools/list', params: { _meta: { 'io.modelcontextprotocol/protocolVersion': '2030-01-01' } },
  });

  assert.ok(response && 'error' in response);
  assert.equal(response.error.code, -32022);
  assert.ok((response.error.data as { supportedVersions: string[] }).supportedVersions.length > 1);
});

void test('a scope or budget refusal reaches the model as a tool result, not a protocol error', async () => {
  const { protocol } = makeProtocol();
  const result = resultOf(await protocol.handle({
    id: 1, method: 'tools/call', params: { name: 'read_evidence', arguments: { handle: 'forged' } },
  }));

  // The model has to see the reason and adapt; a protocol error would hide it.
  assert.equal(result.isError, true);
  assert.match(JSON.stringify(result.content), /not valid for this invocation/);
  assert.equal((result._meta as Record<string, unknown>)['com.my-researcher/refusal'], 'UNKNOWN_HANDLE');
});

void test('list results are cacheable only where the revision defines it', async () => {
  const { protocol } = makeProtocol();
  const shim = resultOf(await protocol.handle({ id: 1, method: 'tools/list', params: {} }));
  const native = resultOf(await protocol.handle({ id: 2, method: 'tools/list', params: nativeMeta }));

  assert.equal(shim.ttlMs, undefined);
  assert.equal(native.ttlMs, 60_000);
  assert.equal(native.cacheScope, 'private');
});

void test('notifications get no response', async () => {
  const { protocol } = makeProtocol();
  assert.equal(await protocol.handle({ method: 'notifications/initialized' }), null);
});
