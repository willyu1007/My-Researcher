// Guards for the codex_cli runner. The App Server child is injected, so these run without a Codex
// installation and without credentials; the live checks re-establish behaviour on a real binary.

import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  CodexAppServerTurnAbortedError,
  type CodexAppServerNotification,
} from './topic-selection-codex-app-server-client.js';
import {
  TopicSelectionCodexCliRunnerService,
  buildCodexThreadConfig,
  codexCliReasoningTier,
  createTopicSelectionCodexCliRunnerFromEnv,
} from './topic-selection-codex-cli-runner-service.js';
import { createDefaultTopicSelectionModelProfileRegistry } from './topic-selection-model-profile-registry-service.js';
import {
  appServerTurn,
  fakeAppServers,
  type FakeAppServerTurnScript,
} from './test-fixtures/topic-selection-codex-cli-fake-app-server.js';

const SCHEMA = { type: 'object', required: ['verdict'], properties: { verdict: { type: 'string' } } };

const NO_APPROVALS = {
  granular: { sandbox_approval: false, rules: false, skill_approval: false, request_permissions: false, mcp_elicitations: false },
};

async function makeRunner(options: { turn?: FakeAppServerTurnScript; recycle_after?: number } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'codex-cli-runner-'));
  const { factory, servers } = fakeAppServers(options.turn);
  const runner = new TopicSelectionCodexCliRunnerService(
    { codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high', app_server_recycle_after: options.recycle_after },
    factory,
  );
  return { runner, servers, home };
}

void test('codex_cli runner grants only its own MCP servers and disables every unscoped native tool', () => {
  const config = buildCodexThreadConfig([
    { name: 'research', url: 'http://127.0.0.1:3000/topic-selection/mcp' },
    { name: 'local', command: 'node', args: ['/srv/local.mjs'], env: { ATTEMPT: 'a1' } },
  ]);
  // The empirically verified shape: `approve`, not `auto`, is what lets a tool call through.
  assert.deepEqual(config.mcp_servers, {
    research: { url: 'http://127.0.0.1:3000/topic-selection/mcp', default_tools_approval_mode: 'approve' },
    local: { command: 'node', args: ['/srv/local.mjs'], env: { ATTEMPT: 'a1' }, default_tools_approval_mode: 'approve' },
  });
  assert.equal(config.web_search, 'disabled');
  const features = config.features as Record<string, unknown>;
  for (const capability of ['apps', 'shell_tool', 'browser_use', 'computer_use',
    'image_generation', 'view_image', 'multi_agent', 'plugins', 'remote_plugin', 'skill_search', 'skill_mcp_dependency_install', 'hooks']) {
    assert.equal(features?.[capability], false, `${capability} must not bypass product evidence scope`);
  }

  // Codex keys servers as bare TOML keys, so anything else is refused up front.
  assert.throws(() => buildCodexThreadConfig([{ name: 'bad.name]', url: 'http://x' }]), /bare TOML key/);
  assert.throws(() => buildCodexThreadConfig([{ name: 'ok', command: 'node', args: [], env: { 'A B': 'x' } }]), /bare TOML key/);
});

void test('codex_cli runner starts one ephemeral thread per attempt, never resumes or forks, and leaves nothing behind', async () => {
  const { runner, servers, home } = await makeRunner();
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
    // Each attempt works in its own scratch directory, removed afterwards; the home is never one.
    assert.notEqual(start.cwd, home);
    assert.ok(!existsSync(start.cwd!));
  }
  assert.deepEqual(server.thread_starts[0]!.config, buildCodexThreadConfig([{ name: 'research', url: 'http://127.0.0.1:1/mcp' }]));
  assert.deepEqual(server.thread_starts[1]!.config, buildCodexThreadConfig([]));
  assert.deepEqual(server.turns.map((turn) => turn.input), [
    [{ type: 'text', text: 'first', text_elements: [] }],
    [{ type: 'text', text: 'second', text_elements: [] }],
  ]);
  assert.ok(server.turns.every((turn) => turn.outputSchema === SCHEMA && turn.effort === 'high'));
  assert.ok(!server.methods.some((method) => method === 'thread/resume' || method === 'thread/fork'));
  assert.equal(server.methods.filter((method) => method === 'thread/unsubscribe').length, 2);
  // The home holds the credential; a run never writes into it.
  assert.deepEqual(await readdir(home), []);

  assert.equal(first.status, 'succeeded');
  assert.equal(second.status, 'succeeded');
  if (first.status !== 'succeeded' || second.status !== 'succeeded') { return; }
  assert.notEqual(first.thread_id, second.thread_id);
  // The isolation proof is what the server answered, not what the configuration said.
  assert.equal(first.codex_home, home);
});

void test('codex_cli judgment roles are critics, arbiters and decision-making single agents', () => {
  const profiles = createDefaultTopicSelectionModelProfileRegistry().profiles
    .filter((profile) => profile.allowed_execution_modes.includes('codex_cli'));
  const judgment = profiles.filter((profile) => codexCliReasoningTier(profile) === 'judgment');
  // 11 critics/arbiters by family plus the 6 named single agents; a renamed id drops the count.
  assert.equal(judgment.length, 17);
  assert.ok(profiles.every((profile) => codexCliReasoningTier(profile) === 'judgment'
    || (profile.role_family !== 'deep_critic' && profile.role_family !== 'arbiter')));
  const tierOf = (id: string) => codexCliReasoningTier(profiles.find((profile) => profile.profile_id === id)!);
  assert.equal(tierOf('topic-selection.v1c.delegated-promotion-decision.v1'), 'judgment');
  assert.equal(tierOf('topic-selection.need-discovery.explorer.v1'), 'standard');
  assert.equal(tierOf('topic-selection.v1c.downstream-feedback-normalization.v1'), 'standard');
});

void test('codex_cli runner applies the judgment effort only to judgment-tier runs', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'codex-cli-runner-'));
  const { factory, servers } = fakeAppServers();
  const runner = new TopicSelectionCodexCliRunnerService(
    { codex_home: home, model: 'gpt-6.1-sol', reasoning_effort: 'high', judgment_reasoning_effort: 'xhigh' },
    factory,
  );
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2', reasoning_tier: 'judgment' });
  assert.deepEqual(servers[0]!.turns.map((turn) => turn.effort), ['high', 'xhigh']);
});

void test('codex_cli runner maps a turn to the artifact, the usage, the tool calls and the trace', async () => {
  const { runner } = await makeRunner();
  const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });

  assert.equal(outcome.status, 'succeeded');
  if (outcome.status !== 'succeeded') { return; }
  assert.equal(outcome.thread_id, 'thread_1');
  // Observed from the child's own `initialize` answer, not declared in configuration.
  assert.equal(outcome.runner_version, 'codex-cli test');
  assert.equal(outcome.final_message, '{"verdict":"supported"}');
  assert.deepEqual(outcome.usage, {
    input_tokens: 100, cached_input_tokens: 10, cache_write_input_tokens: 0, output_tokens: 25, reasoning_output_tokens: 5,
  });
  assert.deepEqual(outcome.tool_calls, [{ server: 'research', tool: 'list_evidence', status: 'completed', error: null }]);
  // Streaming deltas are dropped from the trace; the completed item carries the text. The account
  // state read after the turn is the last entry.
  assert.equal(outcome.trace_events.length, 6);
  assert.ok(!outcome.trace_events.some((event) => (event as { method?: string }).method === 'item/agentMessage/delta'));
  assert.deepEqual(outcome.trace_events.at(-1), { rate_limits: { rateLimits: { primary: { usedPercent: 5 } } } });
});

void test('codex_cli runner reports failures as results that keep their trace', async () => {
  // What an aborted turn had collected: the start, and a delta of a message that never completed.
  const partial = (threadId: string) => {
    const { notifications, server_requests } = appServerTurn(threadId);
    return {
      notifications: [
        notifications[0]!,
        { method: 'item/agentMessage/delta', params: { threadId, turnId: 'turn_1', itemId: 'item_unfinished', delta: '{"ver' } } satisfies CodexAppServerNotification,
      ],
      server_requests,
    };
  };
  const cases: Array<[string, FakeAppServerTurnScript, string, RegExp]> = [
    ['failed turn', async (params) => appServerTurn(params.threadId, { status: 'failed' }), 'CODEX_CLI_TURN_FAILED', /model refused/],
    ['no final message', async (params) => appServerTurn(params.threadId, { final: null }), 'CODEX_CLI_NO_FINAL_MESSAGE', /no final message/],
    ['timeout', async (params) => { throw new CodexAppServerTurnAbortedError('timeout', 'turn_1 exceeded 5ms', partial(params.threadId)); }, 'CODEX_CLI_TIMEOUT', /timed out/],
    ['dead child', async (params) => { throw new CodexAppServerTurnAbortedError('exited', 'exited (code 2)', partial(params.threadId)); }, 'CODEX_CLI_EXIT_FAILURE', /code 2/],
  ];
  for (const [label, turn, expected, message] of cases) {
    const { runner, servers, home } = await makeRunner({ turn });
    const outcome = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
    assert.equal(outcome.status, 'failed', label);
    if (outcome.status !== 'failed') { continue; }
    assert.equal(outcome.error_code, expected, label);
    assert.match(outcome.message, message, label);
    assert.equal(outcome.thread_id, 'thread_1', label);
    assert.equal(outcome.codex_home, home, label);
    // A failed run's trace is evidence too, including what an aborted turn collected — and for an
    // item that never completed, its deltas are the only record of the output.
    assert.ok(outcome.trace_events.length > 0, label);
    if (label === 'timeout' || label === 'dead child') {
      assert.ok(outcome.trace_events.some((event) => (event as { method?: string }).method === 'item/agentMessage/delta'), label);
    }
    assert.ok(servers[0]!.methods.includes('thread/unsubscribe'), label);
  }
});

void test('codex_cli runner recycles the child after the bound without cutting an attempt still on it', async () => {
  let releaseFirst: () => void = () => {};
  const firstTurnReleased = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const { runner, servers } = await makeRunner({
    recycle_after: 1,
    // The first attempt's turn stays open until the test releases it; keyed on the prompt, not on
    // call order, so the two attempts cannot swap roles.
    turn: async (params) => {
      const [text] = params.input;
      if (text?.type === 'text' && text.text === 'first') { await firstTurnReleased; }
      return appServerTurn(params.threadId);
    },
  });

  const first = runner.run({ prompt: 'first', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  // Start the second attempt only once the first is inside its turn on the first child.
  while ((servers[0]?.turns.length ?? 0) === 0) { await new Promise((resolve) => setImmediate(resolve)); }
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

void test('codex_cli runner replaces a child at the recycle bound exactly once under concurrent attempts, and shares one spawn', async () => {
  const { runner, servers } = await makeRunner({ recycle_after: 2 });
  // Two concurrent first attempts share the one spawn.
  await Promise.all([
    runner.run({ prompt: 'first', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' }),
    runner.run({ prompt: 'second', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' }),
  ]);
  assert.equal(servers.length, 1);
  assert.equal(servers[0]!.thread_starts.length, 2);

  // Both see the first child at its bound; exactly one replacement is spawned and serves both.
  const outcomes = await Promise.all([
    runner.run({ prompt: 'third', output_schema: SCHEMA, invocation_attempt_id: 'attempt_3' }),
    runner.run({ prompt: 'fourth', output_schema: SCHEMA, invocation_attempt_id: 'attempt_4' }),
  ]);
  assert.ok(outcomes.every((outcome) => outcome.status === 'succeeded'));
  assert.equal(servers.length, 2);
  assert.equal(servers[1]!.thread_starts.length, 2);
  assert.equal(servers[0]!.closed, true);
  await runner.shutdown();
  assert.equal(servers[1]!.closed, true);
});

void test('codex_cli runner reports a child that fails to start as a result and spawns afresh next time', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'codex-cli-runner-'));
  const { factory, servers } = fakeAppServers();
  let spawns = 0;
  const runner = new TopicSelectionCodexCliRunnerService(
    { codex_home: home, model: 'gpt-6-astra', reasoning_effort: 'high' },
    async (options) => {
      if (++spawns === 1) { throw new Error('codex: command not found'); }
      return factory(options);
    },
  );
  const failed = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  assert.equal(failed.status, 'failed');
  if (failed.status !== 'failed') { return; }
  assert.equal(failed.error_code, 'CODEX_CLI_EXIT_FAILURE');
  assert.match(failed.message, /command not found/);
  // No child answered, so there is no observed version to record.
  assert.equal(failed.runner_version, 'unknown');

  const recovered = await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });
  assert.equal(recovered.status, 'succeeded');
  assert.equal(servers.length, 1);
  await runner.shutdown();
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
  assert.equal(configured?.runner.executionIdentity.reasoning_effort, 'high');
  assert.equal(configured?.runner.executionIdentity.judgment_reasoning_effort, 'xhigh');

  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
    TOPIC_SELECTION_CODEX_REASONING_EFFORT: 'ultra',
  }), /REASONING_EFFORT/);
  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
    TOPIC_SELECTION_CODEX_JUDGMENT_REASONING_EFFORT: 'ultra',
  }), /JUDGMENT_REASONING_EFFORT/);
  assert.throws(() => createTopicSelectionCodexCliRunnerFromEnv({
    TOPIC_SELECTION_CODEX_HOME: '/srv/codex',
    TOPIC_SELECTION_CODEX_MODEL: 'gpt-6-astra',
    TOPIC_SELECTION_CODEX_TIMEOUT_MS: '0',
  }), /TIMEOUT_MS/);
});
