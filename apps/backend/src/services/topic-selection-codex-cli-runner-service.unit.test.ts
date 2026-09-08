// T-151 Phase 1 guards for the codex_cli runner. The Codex binary is injected, so these run
// without a Codex installation and without credentials; a live check is a later phase.

import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  TopicSelectionCodexCliRunnerService,
  createTopicSelectionCodexCliRunnerFromEnv,
  buildCodexConfigToml,
  parseCodexEventStream,
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

void test('codex_cli runner grants only its own MCP servers and keeps the sandbox read-only', () => {
  const toml = buildCodexConfigToml([
    { name: 'research', command: 'node', args: ['/srv/research.mjs'], env: { ATTEMPT: 'a1' } },
  ]);

  // The empirically verified shape: `approve`, not `auto`, is what lets a tool call through.
  assert.match(toml, /default_tools_approval_mode = "approve"/);
  assert.match(toml, /approval_policy = \{ granular = \{ sandbox_approval = false, rules = false, mcp_elicitations = false \} \}/);
  assert.match(toml, /sandbox_mode = "read-only"/);
  assert.match(toml, /\[mcp_servers\.research\]/);
  assert.match(toml, /ATTEMPT = "a1"/);
  assert.doesNotMatch(toml, /"auto"/);
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
    assert.equal(call.env.CODEX_HOME, home);
    assert.equal(call.cwd, home);
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

  const written = await readFile(path.join(home, 'config.toml'), 'utf8');
  assert.match(written, /sandbox_mode = "read-only"/);
});

void test('codex_cli runner leaves no per-invocation schema files behind', async () => {
  const { runner, home } = await makeRunner();
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_1' });
  await runner.run({ prompt: 'p', output_schema: SCHEMA, invocation_attempt_id: 'attempt_2' });

  // The product home is long-lived; one file per invocation would accumulate there forever.
  const left = (await readdir(home)).filter((entry) => entry.startsWith('output-schema-'));
  assert.deepEqual(left, []);
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
