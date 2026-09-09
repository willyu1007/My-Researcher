// T-151 Phase 1 guards for the codex_cli runner. The Codex binary is injected, so these run
// without a Codex installation and without credentials; a live check is a later phase.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type * as v2 from '../generated/codex-app-server/v2/index.js';
import {
  CodexAppServerTurnAbortedError,
  type CodexAppServerNotification,
  type TopicSelectionCodexAppServerTurn,
} from './topic-selection-codex-app-server-client.js';
import {
  TopicSelectionCodexCliRunnerService,
  buildCodexConfigOverrides,
  buildCodexThreadConfig,
  createTopicSelectionCodexCliRunnerFromEnv,
  defaultCodexCliSpawn,
  parseCodexEventStream,
  type TopicSelectionCodexAppServerFactory,
  type TopicSelectionCodexAppServerSession,
  type TopicSelectionCodexCliSpawn,
  type TopicSelectionCodexCliSpawnResult,
} from './topic-selection-codex-cli-runner-service.js';

const SCHEMA = { type: 'object', required: ['verdict'], properties: { verdict: { type: 'string' } } };

function events(lines: unknown[]): string {
  return `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`;
}

const SUCCESS_STDOUT = events([
  { type: 'thread.started', thread_id: 'thread_001' },
  { type: 'turn.started' },
  {
    type: 'item.completed',
    item: { type: 'mcp_tool_call', server: 'research', tool: 'list_evidence', status: 'completed', error: null },
  },
  { type: 'item.completed', item: { type: 'agent_message', text: '{"verdict":"supported"}' } },
  {
    type: 'turn.completed',
    usage: {
      input_tokens: 21520, cached_input_tokens: 0, cache_write_input_tokens: 0,
      output_tokens: 90, reasoning_output_tokens: 47,
    },
  },
]);

interface Recorded {
  args: string[];
  env: Record<string, string>;
  stdin: string;
  cwd: string;
}

function recordingSpawn(result: Partial<TopicSelectionCodexCliSpawnResult> = {}): {
  spawn: TopicSelectionCodexCliSpawn;
  calls: Recorded[];
} {
  const calls: Recorded[] = [];
  const spawn: TopicSelectionCodexCliSpawn = async (args, options) => {
    // The runner resolves the binary's own version once; that probe is not an invocation.
    if (args[0] === '--version') {
      return { stdout: 'codex-cli 0.153.4\n', stderr: '', exit_code: 0, timed_out: false };
    }
    calls.push({ args: [...args], env: options.env, stdin: options.stdin, cwd: options.cwd });
    return {
      stdout: SUCCESS_STDOUT, stderr: '', exit_code: 0, timed_out: false, ...result,
    };
  };
  return { spawn, calls };
}

async function makeRunner(result?: Partial<TopicSelectionCodexCliSpawnResult>) {
  const home = await mkdtemp(path.join(tmpdir(), 'codex-cli-runner-'));
  const { spawn, calls } = recordingSpawn(result);
  const runner = new TopicSelectionCodexCliRunnerService(
    { codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high' },
    spawn,
  );
  return { runner, calls, home };
}

void test('codex_cli runner grants only its own MCP servers, as overrides rather than a config file', () => {
  const overrides = buildCodexConfigOverrides([
    { name: 'research', url: 'http://127.0.0.1:3000/topic-selection/mcp' },
    { name: 'local', command: 'node', args: ['/srv/local.mjs'], env: { ATTEMPT: 'a1' } },
  ]).join(' ');

  // The empirically verified shape: `approve`, not `auto`, is what lets a tool call through.
  assert.match(overrides, /approval_policy=\{granular=\{sandbox_approval=false,rules=false,mcp_elicitations=false\}\}/);
  assert.match(overrides, /mcp_servers\.research\.url="http:\/\/127\.0\.0\.1:3000\/topic-selection\/mcp"/);
  assert.match(overrides, /mcp_servers\.research\.default_tools_approval_mode="approve"/);
  assert.match(overrides, /mcp_servers\.local\.command="node"/);
  assert.match(overrides, /mcp_servers\.local\.args=\["\/srv\/local\.mjs"\]/);
  assert.match(overrides, /mcp_servers\.local\.env=\{ATTEMPT="a1"\}/);
  assert.doesNotMatch(overrides, /"auto"/);

  // Names become dotted TOML keys, so anything that is not a bare key is refused up front.
  assert.throws(() => buildCodexConfigOverrides([{ name: 'bad.name]', url: 'http://x' }]), /bare TOML key/);
  assert.throws(() => buildCodexConfigOverrides([{ name: 'ok', command: 'node', args: [], env: { 'A B': 'x' } }]), /bare TOML key/);
});

void test('codex_cli runner pins one fresh thread per attempt and never resumes or forks', async () => {
  const { runner, calls, home } = await makeRunner();
  await runner.run({ prompt: 'first', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  await runner.run({ prompt: 'second', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });

  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.args[0], 'exec');
    assert.ok(call.args.includes('--ephemeral'));
    assert.ok(call.args.includes('--json'));
    assert.ok(call.args.includes('--output-schema'));
    // D-4: the line has no resume or fork path at all.
    assert.ok(!call.args.includes('resume'));
    assert.ok(!call.args.includes('fork'));
    // The prompt travels on stdin, never as an argv element.
    assert.ok(call.args.includes('-'));
    assert.ok(call.args.includes('read-only'));
    assert.equal(call.env.CODEX_HOME, home);
    // Runs work in their own scratch directory; the home is never a working directory.
    assert.notEqual(call.cwd, home);
  }
  assert.equal(calls[0]!.stdin, 'first');
  assert.equal(calls[1]!.stdin, 'second');
});

void test('codex_cli runner isolates the invocation from the developer environment', async () => {
  const { runner, calls, home } = await makeRunner();
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });

  const env = calls[0]!.env;
  // Only what the runner needs: CODEX_HOME (so config AND skills come from the product) and PATH.
  assert.deepEqual(Object.keys(env).sort(), ['CODEX_HOME', 'PATH']);
  assert.equal(env.CODEX_HOME, home);
  assert.notEqual(env.CODEX_HOME, process.env.HOME);

  // The home holds the credential; a run never writes into it. Everything per-invocation travels
  // as -c overrides, so two concurrent runs cannot overwrite each other's configuration.
  assert.deepEqual(await readdir(home), []);
});

void test('codex_cli runner leaves no per-invocation schema files behind', async () => {
  const { runner, calls, home } = await makeRunner();
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });

  // The product home is long-lived and never written; the per-run scratch directory is gone.
  assert.deepEqual(await readdir(home), []);
  assert.ok(!existsSync(calls[0]!.cwd));
  assert.ok(!existsSync(calls[1]!.cwd));
});

void test('codex_cli runner returns the artifact, the usage and the trace on success', async () => {
  const { runner } = await makeRunner();
  const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });

  assert.equal(outcome.status, 'succeeded');
  if (outcome.status !== 'succeeded') { return; }
  assert.equal(outcome.thread_id, 'thread_001');
  // Observed from the binary, not declared in configuration.
  assert.equal(outcome.runner_version, 'codex-cli 0.153.4');
  assert.equal(outcome.final_message, '{"verdict":"supported"}');
  assert.equal(outcome.usage?.input_tokens, 21520);
  assert.equal(outcome.usage?.reasoning_output_tokens, 47);
  assert.deepEqual(outcome.tool_calls, [
    { server: 'research', tool: 'list_evidence', status: 'completed', error: null },
  ]);
  assert.equal(outcome.trace_events.length, 5);
});

void test('codex_cli runner reports failure as a result and still carries the trace', async () => {
  for (const [label, result, expected] of [
    ['timeout', { timed_out: true }, 'CODEX_CLI_TIMEOUT'],
    ['non-zero exit', { exit_code: 1 }, 'CODEX_CLI_EXIT_FAILURE'],
    ['no final message', { stdout: events([{ type: 'thread.started', thread_id: 'thread_002' }]) }, 'CODEX_CLI_NO_FINAL_MESSAGE'],
  ] as const) {
    const { runner } = await makeRunner(result);
    const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
    assert.equal(outcome.status, 'failed', label);
    if (outcome.status !== 'failed') { continue; }
    assert.equal(outcome.error_code, expected, label);
    // A failed run's trace is evidence too.
    assert.ok(outcome.trace_events.length > 0, label);
  }
});

void test('codex_cli event parsing drops malformed lines without losing the run', () => {
  const parsed = parseCodexEventStream(`${SUCCESS_STDOUT}not json\n{"type":"stray"}\n`);
  assert.equal(parsed.threadId, 'thread_001');
  assert.equal(parsed.finalMessage, '{"verdict":"supported"}');
  assert.equal(parsed.events.length, 6);
});

void test('codex_cli deployment config stays unavailable rather than half-configured', () => {
  assert.equal(createTopicSelectionCodexCliRunnerFromEnv({}), null);
  assert.equal(createTopicSelectionCodexCliRunnerFromEnv({ TOPIC_SELECTION_CODEX_HOME: '/srv/codex' }), null);
  assert.equal(createTopicSelectionCodexCliRunnerFromEnv({ TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra' }), null);

  const configured = createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
  });
  assert.equal(configured?.model_id, 'gpt-6-astra');
  assert.ok(configured?.runner instanceof TopicSelectionCodexCliRunnerService);

  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
    TOPIC_SELECTION_CODEX_REASONING_EFFORT: 'ultra',
  }), /REASONING_EFFORT/);
  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
    TOPIC_SELECTION_CODEX_TIMEOUT_MS: '0',
  }), /TIMEOUT_MS/);
});

// The two process-lifecycle guarantees can only be established against a real subprocess.
const realEnv = { PATH: process.env.PATH ?? '', CODEX_CLI_BINARY: process.execPath };

void test('a child that exits before reading its prompt is a failed result, not a crash', async () => {
  // Node's own pattern for this is an EPIPE on stdin; unhandled, it takes the backend down.
  const result = await defaultCodexCliSpawn(['-e', 'process.exit(3)'], {
    cwd: tmpdir(),
    env: realEnv,
    stdin: 'x'.repeat(1 << 20),
    timeoutMs: 10_000,
  });
  assert.equal(result.exit_code, 3);
  assert.equal(result.timed_out, false);
});

void test('a timeout settles even when the child never exits, so the caller can release its handle', async () => {
  const started = Date.now();
  const result = await defaultCodexCliSpawn(['-e', 'setTimeout(() => {}, 60_000)'], {
    cwd: tmpdir(),
    env: realEnv,
    stdin: '',
    timeoutMs: 300,
  });
  assert.equal(result.timed_out, true);
  assert.equal(result.exit_code, null);
  // Settled on the timer, not on the child's eventual close.
  assert.ok(Date.now() - started < 5_000);
});

// ---- App Server transport (T-152 Phase 2). The client is injected, so no Codex runs here. ----

const NO_APPROVALS = {
  granular: { sandbox_approval: false, rules: false, skill_approval: false, request_permissions: false, mcp_elicitations: false },
};

function appServerTurn(
  threadId: string,
  options: { status?: v2.TurnStatus; final?: string | null } = {},
): TopicSelectionCodexAppServerTurn {
  const turnId = 'turn_1';
  const usage = { totalTokens: 125, inputTokens: 100, cachedInputTokens: 10, cacheWriteInputTokens: 0, outputTokens: 25, reasoningOutputTokens: 5 };
  const completed = (item: v2.ThreadItem): CodexAppServerNotification => ({ method: 'item/completed', params: { item, threadId, turnId, completedAtMs: 1 } });
  const status = options.status ?? 'completed';
  const turn: v2.Turn = {
    id: turnId, items: [], itemsView: 'full', status, startedAt: null, completedAt: null, durationMs: 1,
    error: status === 'failed' ? { message: 'model refused', codexErrorInfo: null, additionalDetails: null, misalignment: null } : null,
  };
  return {
    turn,
    notifications: [
      { method: 'turn/started', params: { threadId, turn } },
      { method: 'item/agentMessage/delta', params: { threadId, turnId, itemId: 'item_msg', delta: '{"ver' } },
      completed({
        type: 'mcpToolCall', id: 'item_tool', server: 'research', tool: 'list_evidence', status: 'completed',
        arguments: {}, appContext: null, pluginId: null, readOnlyHint: null, result: null, error: null, durationMs: 3,
      }),
      ...(options.final === null ? [] : [completed({
        type: 'agentMessage', id: 'item_msg', text: options.final ?? '{"verdict":"supported"}',
        phase: 'final_answer', memoryCitation: null, delivery: null, questions: null,
      })]),
      { method: 'thread/tokenUsage/updated', params: { threadId, turnId, tokenUsage: { total: usage, last: usage, modelContextWindow: 1000 } } },
      { method: 'turn/completed', params: { threadId, turn } },
    ],
    server_requests: [],
  };
}

interface FakeAppServer {
  codex_home: string;
  methods: string[];
  thread_starts: v2.ThreadStartParams[];
  turns: v2.TurnStartParams[];
  closed: boolean;
}

type TurnScript = (params: v2.TurnStartParams) => Promise<TopicSelectionCodexAppServerTurn>;

function fakeAppServers(turn: TurnScript = async (params) => appServerTurn(params.threadId)) {
  const servers: FakeAppServer[] = [];
  const factory: TopicSelectionCodexAppServerFactory = async (options) => {
    const server: FakeAppServer = { codex_home: options.codex_home, methods: [], thread_starts: [], turns: [], closed: false };
    servers.push(server);
    let threads = 0;
    const request = async (method: string, params: unknown): Promise<unknown> => {
      server.methods.push(method);
      if (method === 'thread/start') {
        server.thread_starts.push(params as v2.ThreadStartParams);
        return { thread: { id: `thread_${String(++threads)}` } };
      }
      return method === 'thread/unsubscribe' ? { status: 'unsubscribed' } : {};
    };
    return {
      initialized: { userAgent: 'fake', codexHome: options.codex_home, platformFamily: 'unix', platformOs: 'test' },
      request: request as TopicSelectionCodexAppServerSession['request'],
      runTurn: async (params) => { server.turns.push(params); return turn(params); },
      hasExited: () => server.closed,
      stderrTail: () => 'fake stderr',
      close: async () => { server.closed = true; return { code: 0, signal: null }; },
    };
  };
  return { factory, servers };
}

async function makeAppServerRunner(options: { turn?: TurnScript; recycle_after?: number } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'codex-cli-runner-'));
  const { spawn } = recordingSpawn();
  const { factory, servers } = fakeAppServers(options.turn);
  const runner = new TopicSelectionCodexCliRunnerService(
    { codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', transport: 'app_server', app_server_recycle_after: options.recycle_after },
    spawn,
    factory,
  );
  return { runner, servers, home };
}

void test('codex_cli runner on the App Server transport starts one ephemeral thread per attempt and never resumes or forks', async () => {
  const { runner, servers, home } = await makeAppServerRunner();
  const first = await runner.run({
    prompt: 'first', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1',
    mcp_servers: [{ name: 'research', url: 'http://127.0.0.1:1/mcp' }],
  });
  const second = await runner.run({ prompt: 'second', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });

  // One child serves both attempts; each attempt is its own ephemeral thread, closed with the attempt.
  assert.equal(servers.length, 1);
  const server = servers[0]!;
  assert.equal(server.thread_starts.length, 2);
  for (const start of server.thread_starts) {
    assert.equal(start.ephemeral, true);
    assert.equal(start.sandbox, 'read-only');
    assert.deepEqual(start.approvalPolicy, NO_APPROVALS);
    assert.equal(start.model, 'gpt-6-astra');
    assert.notEqual(start.cwd, home);
  }
  assert.deepEqual(server.thread_starts[0]!.config, buildCodexThreadConfig([{ name: 'research', url: 'http://127.0.0.1:1/mcp' }]));
  assert.deepEqual(server.thread_starts[1]!.config, { mcp_servers: {} });
  assert.deepEqual(server.turns.map((turn) => turn.input), [
    [{ type: 'text', text: 'first', text_elements: [] }],
    [{ type: 'text', text: 'second', text_elements: [] }],
  ]);
  assert.ok(server.turns.every((turn) => turn.outputSchema === SCHEMA && turn.effort === 'high'));
  assert.ok(!server.methods.some((method) => method === 'thread/resume' || method === 'thread/fork'));
  assert.equal(server.methods.filter((method) => method === 'thread/unsubscribe').length, 2);

  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  if (first.status !== 'succeeded' || second.status !== 'succeeded') { return; }
  assert.notEqual(first.thread_id, second.thread_id);
  assert.equal(first.transport, 'app_server');
  // The isolation proof is what the server answered, not what the configuration said.
  assert.equal(first.codex_home, home);
});

void test('codex_cli runner maps an App Server turn to the artifact, the usage, the tool calls and the trace', async () => {
  const { runner } = await makeAppServerRunner();
  const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });

  assert.equal(outcome.status, 'succeeded');
  if (outcome.status !== 'succeeded') { return; }
  assert.equal(outcome.thread_id, 'thread_1');
  assert.equal(outcome.runner_version, 'codex-cli 0.153.4');
  assert.equal(outcome.final_message, '{"verdict":"supported"}');
  assert.deepEqual(outcome.usage, {
    input_tokens: 100, cached_input_tokens: 10, cache_write_input_tokens: 0, output_tokens: 25, reasoning_output_tokens: 5,
  });
  assert.deepEqual(outcome.tool_calls, [{ server: 'research', tool: 'list_evidence', status: 'completed', error: null }]);
  // Streaming deltas are dropped from the trace; the completed item carries the text.
  assert.equal(outcome.trace_events.length, 5);
  assert.ok(!outcome.trace_events.some((event) => (event as { method?: string }).method === 'item/agentMessage/delta'));
});

void test('codex_cli runner reports App Server failures as results that keep their trace', async () => {
  const partial = (threadId: string) => {
    const { notifications, server_requests } = appServerTurn(threadId);
    return { notifications: notifications.slice(0, 2), server_requests };
  };
  const cases: Array<[string, TurnScript, string, RegExp]> = [
    ['failed turn', async (params) => appServerTurn(params.threadId, { status: 'failed' }), 'CODEX_CLI_TURN_FAILED', /model refused/],
    ['no final message', async (params) => appServerTurn(params.threadId, { final: null }), 'CODEX_CLI_NO_FINAL_MESSAGE', /no final message/],
    ['timeout', async (params) => { throw new CodexAppServerTurnAbortedError('timeout', 'turn_1 exceeded 5ms', partial(params.threadId)); }, 'CODEX_CLI_TIMEOUT', /timed out/],
    ['dead child', async (params) => { throw new CodexAppServerTurnAbortedError('exited', 'exited (code 2)', partial(params.threadId)); }, 'CODEX_CLI_EXIT_FAILURE', /code 2/],
  ];
  for (const [label, turn, expected, message] of cases) {
    const { runner, servers, home } = await makeAppServerRunner({ turn });
    const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
    assert.equal(outcome.status, 'failed', label);
    if (outcome.status !== 'failed') { continue; }
    assert.equal(outcome.error_code, expected, label);
    assert.match(outcome.message, message, label);
    assert.equal(outcome.thread_id, 'thread_1', label);
    assert.equal(outcome.codex_home, home, label);
    // A failed run's trace is evidence too, including what an aborted turn collected.
    assert.ok(outcome.trace_events.length > 0, label);
    assert.ok(servers[0]!.methods.includes('thread/unsubscribe'), label);
  }
});

void test('codex_cli runner recycles the App Server child after the bound without cutting an attempt still on it', async () => {
  let releaseFirst: () => void = () => {};
  const firstTurnReleased = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let attempts = 0;
  const { runner, servers } = await makeAppServerRunner({
    recycle_after: 1,
    turn: async (params) => {
      if (++attempts === 1) { await firstTurnReleased; }
      return appServerTurn(params.threadId);
    },
  });

  const first = runner.run({ prompt: 'first', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await runner.run({ prompt: 'second', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });

  // The second attempt got a fresh child; the first child stays up while its attempt is running.
  assert.equal(servers.length, 2);
  assert.equal(second.status, 'succeeded');
  assert.equal(servers[0]!.closed, false);
  releaseFirst();
  assert.equal((await first).status, 'succeeded');
  assert.equal(servers[0]!.closed, true);
  assert.equal(servers[1]!.closed, false);

  await runner.shutdown();
  assert.equal(servers[1]!.closed, true);
});

void test('codex_cli deployment config selects the transport and rejects an unknown one', () => {
  const base = { TOPIC_SELECTION_CODEX_HOME: '/srv/codex-home', TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra' };
  assert.ok(createTopicSelectionCodexCliRunnerFromEnv({ ...base, TOPIC_SELECTION_CODEX_TRANSPORT: 'app_server' }));
  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({ ...base, TOPIC_SELECTION_CODEX_TRANSPORT: 'grpc' }), /TOPIC_SELECTION_CODEX_TRANSPORT/);
});
