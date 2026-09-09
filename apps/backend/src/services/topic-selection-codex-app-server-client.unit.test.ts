// T-152 Phase 2 guards for the App Server client, against a scripted stand-in for the binary so
// they run without Codex or credentials. The stand-in speaks the wire shape the spike observed.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CodexAppServerTurnAbortedError,
  TopicSelectionCodexAppServerClient,
} from './topic-selection-codex-app-server-client.js';

const FAKE = fileURLToPath(new URL('./test-fixtures/codex-app-server-fake.mjs', import.meta.url));

// Every test closes its child, even on a failed assertion: a live child holds the test process open.
async function attachFake(
  t: { after: (fn: () => Promise<unknown>) => void },
  scenario: string,
  requestTimeoutMs?: number,
): Promise<TopicSelectionCodexAppServerClient> {
  const child = spawn(process.execPath, [FAKE, scenario], {
    cwd: tmpdir(),
    env: { CODEX_HOME: '/fake/home', PATH: process.env.PATH ?? '' },
  });
  const client = await TopicSelectionCodexAppServerClient.attach(child, { client_name: 'unit', request_timeout_ms: requestTimeoutMs });
  t.after(() => client.close());
  return client;
}

const input = [{ type: 'text' as const, text: 'go', text_elements: [] }];

void test('the client completes the handshake, collects one turn, and answers a server request by policy', async (t) => {
  const client = await attachFake(t, 'ask');
  assert.equal(client.initialized.codexHome, '/fake/home');

  const started = await client.request('thread/start', { ephemeral: true });
  assert.equal(started.thread.ephemeral, true);
  const turn = await client.runTurn({ threadId: started.thread.id, input }, { timeout_ms: 5_000 });

  assert.equal(turn.turn.status, 'completed');
  assert.ok(turn.notifications.every((notification) => JSON.stringify(notification.params).includes(started.thread.id)));
  // `thread/started` may still be in flight when the turn subscribes; from the turn on, the order is fixed.
  assert.deepEqual(turn.notifications.map((notification) => notification.method).slice(-4), [
    'turn/started', 'item/completed', 'thread/tokenUsage/updated', 'turn/completed',
  ]);

  // The question was neither left hanging nor answered: declined, and the decline is on record.
  assert.equal(turn.server_requests.length, 1);
  const [answered] = turn.server_requests;
  assert.equal(answered!.request.method, 'item/tool/requestUserInput');
  assert.deepEqual(answered!.answer, { kind: 'declined', result: { answers: {} } });
  const final = turn.notifications.find((notification) => notification.method === 'item/completed');
  assert.ok(final && final.method === 'item/completed' && final.params.item.type === 'agentMessage');
  assert.deepEqual(JSON.parse(final.params.item.text), { answers: {} });

  assert.deepEqual(await client.close(), { code: 0, signal: null });
});

void test('a child that dies mid-turn fails the turn and every later request, instead of hanging', async (t) => {
  const client = await attachFake(t, 'exit');
  const started = await client.request('thread/start', {});
  await assert.rejects(
    client.runTurn({ threadId: started.thread.id, input }, { timeout_ms: 5_000 }),
    (error: unknown) => error instanceof CodexAppServerTurnAbortedError && error.reason === 'exited',
  );
  assert.equal(client.hasExited(), true);
  assert.equal((await client.exited).code, 2);
  await assert.rejects(client.request('thread/loaded/list', {}), /already exited/);
});

void test('a turn that outruns its budget is interrupted and reported as a timeout that keeps its partial trace', async (t) => {
  const client = await attachFake(t, 'hang');
  const started = await client.request('thread/start', {});
  await assert.rejects(
    client.runTurn({ threadId: started.thread.id, input }, { timeout_ms: 200 }),
    (error: unknown) => error instanceof CodexAppServerTurnAbortedError
      && error.reason === 'timeout'
      && error.partial.notifications.some((notification) => notification.method === 'turn/started'),
  );
  await client.close();
  assert.match(client.stderrTail(), /interrupt turn_1/);
});

void test('a request the server never answers fails after the request timeout instead of hanging the attempt', async (t) => {
  const client = await attachFake(t, 'silent', 200);
  await assert.rejects(client.request('thread/start', {}), /thread\/start got no response within 200ms/);
  assert.equal(client.hasExited(), false);
});

void test('a child that dies before answering turn/start still yields an aborted turn with what arrived', async (t) => {
  const client = await attachFake(t, 'exit-early');
  const started = await client.request('thread/start', {});
  await assert.rejects(
    client.runTurn({ threadId: started.thread.id, input }, { timeout_ms: 5_000 }),
    (error: unknown) => error instanceof CodexAppServerTurnAbortedError
      && error.reason === 'exited'
      && error.partial.notifications.some((notification) => notification.method === 'turn/started'),
  );
});

void test('child death is detected on exit even while a descendant keeps the stdio pipes open', async (t) => {
  const client = await attachFake(t, 'exit-holding');
  const started = await client.request('thread/start', {});
  const before = Date.now();
  await assert.rejects(
    client.runTurn({ threadId: started.thread.id, input }, { timeout_ms: 5_000 }),
    (error: unknown) => error instanceof CodexAppServerTurnAbortedError && error.reason === 'exited',
  );
  // The descendant holds the pipes for 3 s; the attempt must not wait for that.
  assert.ok(Date.now() - before < 1_500, 'waited for the pipes to close instead of the process to exit');
  assert.equal((await client.exited).code, 2);
});
