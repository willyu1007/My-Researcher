// T-151 Phase 1: the `codex_cli` execution line's runner.
//
// The product drives the Codex CLI itself. Everything the model may see or reach comes from a
// product-owned CODEX_HOME plus per-invocation `-c` overrides — no run ever writes into that home,
// which is where the credential lives — and everything the product keeps comes back as two things:
// the schema-constrained artifact, and the event trace.
//
// Isolation is why CODEX_HOME is product-owned rather than `--ignore-user-config`: that flag
// suppresses the user's config.toml but NOT their skills, and a probe run read a developer skill
// out of ~/.codex and changed its behaviour because of it (T-151 probe-evidence.md §5).
//
// Session rule (D-4): one fresh thread per invocation attempt. This module has no resume or fork
// path at all, which is what enforces it.

import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Server name is what the model sees and also the `mcp_servers.<name>` key, so it must be a bare TOML key.
 *
 *  The url form is what the product uses: serving MCP from the backend lets the tools reach the
 *  product's own repositories, where a spawned subprocess would have needed its own database
 *  access. The command form stays for servers that genuinely are separate processes. */
export type TopicSelectionCodexCliMcpServer =
  | { name: string; command: string; args: readonly string[]; env?: Readonly<Record<string, string>> }
  | { name: string; url: string };

export interface TopicSelectionCodexCliUsage {
  input_tokens: number;
  cached_input_tokens: number;
  cache_write_input_tokens: number;
  output_tokens: number;
  reasoning_output_tokens: number;
}

export interface TopicSelectionCodexCliToolCall {
  server: string;
  tool: string;
  status: string;
  error: string | null;
}

export const TOPIC_SELECTION_CODEX_CLI_ERROR_CODES = [
  'CODEX_CLI_TIMEOUT',
  'CODEX_CLI_EXIT_FAILURE',
  'CODEX_CLI_NO_FINAL_MESSAGE',
] as const;
export type TopicSelectionCodexCliErrorCode = (typeof TOPIC_SELECTION_CODEX_CLI_ERROR_CODES)[number];

/** A failed run is a result, not an exception, matching how the orchestrator treats provider
 *  failures — and it still carries its trace, because a failed run's trace is evidence too. */
export type TopicSelectionCodexCliRunOutcome =
  | ({ status: 'succeeded' } & TopicSelectionCodexCliRunResult)
  | {
    status: 'failed';
    error_code: TopicSelectionCodexCliErrorCode;
    message: string;
    runner_version: string;
    thread_id: string | null;
    usage: TopicSelectionCodexCliUsage | null;
    tool_calls: TopicSelectionCodexCliToolCall[];
    trace_events: unknown[];
    stderr_tail: string;
  };

export interface TopicSelectionCodexCliRunResult {
  /** Observed, not declared: read from the binary that actually ran, so it cannot drift. */
  runner_version: string;
  thread_id: string;
  /** Raw text of the final agent message; the caller parses it against its own output contract. */
  final_message: string;
  usage: TopicSelectionCodexCliUsage | null;
  tool_calls: TopicSelectionCodexCliToolCall[];
  /** The full JSONL event stream, verbatim. This is the line's evidence of what happened. */
  trace_events: unknown[];
}

export interface TopicSelectionCodexCliRunInput {
  /** Product-authored prompt packet. Passed on stdin, never as an argv element. */
  prompt: string;
  /** JSON Schema the final response must satisfy; enforced by the CLI, not by us. */
  output_schema: Record<string, unknown>;
  invocation_attempt_id: string;
  mcp_servers?: readonly TopicSelectionCodexCliMcpServer[];
}

export interface TopicSelectionCodexCliSpawnResult {
  stdout: string;
  stderr: string;
  exit_code: number | null;
  timed_out: boolean;
}

export type TopicSelectionCodexCliSpawn = (
  args: readonly string[],
  options: { cwd: string; env: Record<string, string>; stdin: string; timeoutMs: number },
) => Promise<TopicSelectionCodexCliSpawnResult>;

export interface TopicSelectionCodexCliRunnerConfig {
  /** Product-owned CODEX_HOME. Must not be the developer's ~/.codex. */
  codex_home: string;
  model: string;
  reasoning_effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  binary?: string;
  timeout_ms?: number;
}

const DEFAULT_TIMEOUT_MS = 600_000;

const BARE_TOML_KEY = /^[A-Za-z0-9_-]+$/;

/** JSON string escaping is a subset of TOML basic-string escaping, so this is exact. */
function tomlString(value: string): string {
  return JSON.stringify(value);
}

/** Everything one invocation needs, as `-c` overrides rather than a config.toml. No file in the
 *  shared product home means no race between concurrent invocations and nothing to clean up.
 *
 *  The approval shape was recovered empirically for codex-cli 0.153.4 (probe-evidence.md §7): a
 *  granular policy plus a per-server `approve` mode grants the product's own MCP servers while the
 *  sandbox stays read-only. `auto` does NOT work despite its name. */
export function buildCodexConfigOverrides(servers: readonly TopicSelectionCodexCliMcpServer[]): string[] {
  const overrides = [
    'approval_policy={granular={sandbox_approval=false,rules=false,mcp_elicitations=false}}',
  ];
  for (const server of servers) {
    if (!BARE_TOML_KEY.test(server.name)) {
      throw new Error(`MCP server name ${JSON.stringify(server.name)} is not a bare TOML key.`);
    }
    const key = `mcp_servers.${server.name}`;
    if ('url' in server) {
      overrides.push(`${key}.url=${tomlString(server.url)}`);
    } else {
      overrides.push(`${key}.command=${tomlString(server.command)}`);
      overrides.push(`${key}.args=[${server.args.map(tomlString).join(',')}]`);
      const env = Object.entries(server.env ?? {});
      for (const [name] of env) {
        if (!BARE_TOML_KEY.test(name)) {
          throw new Error(`MCP server env name ${JSON.stringify(name)} is not a bare TOML key.`);
        }
      }
      if (env.length > 0) {
        overrides.push(`${key}.env={${env.map(([name, value]) => `${name}=${tomlString(value)}`).join(',')}}`);
      }
    }
    overrides.push(`${key}.default_tools_approval_mode="approve"`);
  }
  return overrides.flatMap((override) => ['-c', override]);
}

function parseUsage(value: unknown): TopicSelectionCodexCliUsage | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const read = (key: string): number => (typeof raw[key] === 'number' ? raw[key] : 0);
  return {
    input_tokens: read('input_tokens'),
    cached_input_tokens: read('cached_input_tokens'),
    cache_write_input_tokens: read('cache_write_input_tokens'),
    output_tokens: read('output_tokens'),
    reasoning_output_tokens: read('reasoning_output_tokens'),
  };
}

/** The CLI streams one JSON object per line. A malformed line is dropped rather than failing the
 *  run: the trace is evidence, and losing one line must not discard a completed artifact. */
export function parseCodexEventStream(stdout: string): {
  events: unknown[];
  threadId: string | null;
  finalMessage: string | null;
  usage: TopicSelectionCodexCliUsage | null;
  toolCalls: TopicSelectionCodexCliToolCall[];
} {
  const events: unknown[] = [];
  let threadId: string | null = null;
  let finalMessage: string | null = null;
  let usage: TopicSelectionCodexCliUsage | null = null;
  const toolCalls: TopicSelectionCodexCliToolCall[] = [];

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    let event: unknown;
    try {
      event = JSON.parse(trimmed);
    } catch {
      continue;
    }
    events.push(event);
    if (typeof event !== 'object' || event === null) {
      continue;
    }
    const record = event as Record<string, unknown>;
    const item = typeof record.item === 'object' && record.item !== null
      ? record.item as Record<string, unknown>
      : null;

    if (record.type === 'thread.started' && typeof record.thread_id === 'string') {
      threadId = record.thread_id;
    }
    if (record.type === 'turn.completed') {
      usage = parseUsage(record.usage);
    }
    if (record.type === 'item.completed' && item?.type === 'agent_message' && typeof item.text === 'string') {
      finalMessage = item.text;
    }
    if (record.type === 'item.completed' && item?.type === 'mcp_tool_call') {
      toolCalls.push({
        server: typeof item.server === 'string' ? item.server : '',
        tool: typeof item.tool === 'string' ? item.tool : '',
        status: typeof item.status === 'string' ? item.status : '',
        error: typeof item.error === 'string' ? item.error : null,
      });
    }
  }

  return { events, threadId, finalMessage, usage, toolCalls };
}

const KILL_GRACE_MS = 5_000;

/** Exported so the process-lifecycle guarantees can be tested against a real subprocess. */
export const defaultCodexCliSpawn: TopicSelectionCodexCliSpawn = async (args, options) => new Promise((resolve) => {
  const child = spawn(options.env.CODEX_CLI_BINARY ?? 'codex', [...args], {
    cwd: options.cwd,
    shell: false,
    env: options.env,
    // Its own process group, so a timeout reaches whatever Codex spawned and not only Codex.
    detached: true,
  });
  let stdout = '';
  let stderr = '';
  let settled = false;
  const settle = (result: TopicSelectionCodexCliSpawnResult): void => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(timer);
    resolve(result);
  };
  const signalGroup = (signal: NodeJS.Signals): void => {
    if (child.pid === undefined) {
      return;
    }
    try {
      process.kill(-child.pid, signal);
    } catch {
      child.kill(signal);
    }
  };
  const timer = setTimeout(() => {
    // Settle now with whatever arrived. Waiting for `close` would hang if the child ignores the
    // signal or a descendant keeps the pipes open, and the caller's finally has to run so the
    // attempt's tool handle is released.
    settle({ stdout, stderr, exit_code: null, timed_out: true });
    signalGroup('SIGTERM');
    setTimeout(() => signalGroup('SIGKILL'), KILL_GRACE_MS).unref();
  }, options.timeoutMs);
  // Decode as streams, not per chunk: a pipe read can split a multibyte character in two.
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { stderr += chunk; });
  child.on('error', (error) => settle({ stdout, stderr: `${stderr}${error.message}`, exit_code: null, timed_out: false }));
  child.on('close', (code) => settle({ stdout, stderr, exit_code: code, timed_out: false }));
  // A large prompt against a child that exits early raises EPIPE on stdin. Left unhandled that is
  // an uncaught exception in the backend, not a failed invocation; `close` still carries the exit.
  child.stdin.on('error', (error: Error) => { stderr += `stdin: ${error.message}\n`; });
  child.stdin.end(options.stdin);
});

export class TopicSelectionCodexCliRunnerService {
  constructor(
    private readonly config: TopicSelectionCodexCliRunnerConfig,
    private readonly spawnCodex: TopicSelectionCodexCliSpawn = defaultCodexCliSpawn,
  ) {}

  private cachedRunnerVersion: string | null = null;

  /** One invocation attempt, one fresh Codex thread. There is deliberately no resume or fork. */
  async run(input: TopicSelectionCodexCliRunInput): Promise<TopicSelectionCodexCliRunOutcome> {
    // Per-invocation scratch outside the product home: the home holds the credential and is never
    // written by a run, and concurrent runs must not be able to see each other's files.
    const scratch = await mkdtemp(path.join(tmpdir(), 'codex-cli-'));
    const schemaPath = path.join(scratch, 'output-schema.json');
    await writeFile(schemaPath, JSON.stringify(input.output_schema), 'utf8');

    const args = [
      'exec',
      '--ephemeral',
      '--skip-git-repo-check',
      '--json',
      '-s', 'read-only',
      '--output-schema', schemaPath,
      '-m', this.config.model,
      '-c', `model_reasoning_effort="${this.config.reasoning_effort}"`,
      ...buildCodexConfigOverrides(input.mcp_servers ?? []),
      '-',
    ];

    let result: TopicSelectionCodexCliSpawnResult;
    try {
      result = await this.spawnCodex(args, {
        cwd: scratch,
        env: this.buildEnv(),
        stdin: input.prompt,
        timeoutMs: this.config.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      });
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }

    const runnerVersion = await this.runnerVersion();
    const parsed = parseCodexEventStream(result.stdout);
    const failure = (
      errorCode: TopicSelectionCodexCliErrorCode,
      message: string,
    ): TopicSelectionCodexCliRunOutcome => ({
      status: 'failed',
      error_code: errorCode,
      message,
      runner_version: runnerVersion,
      thread_id: parsed.threadId,
      usage: parsed.usage,
      tool_calls: parsed.toolCalls,
      trace_events: parsed.events,
      stderr_tail: result.stderr.slice(-500),
    });

    if (result.timed_out) {
      return failure('CODEX_CLI_TIMEOUT', 'The codex_cli invocation timed out.');
    }
    if (result.exit_code !== 0) {
      return failure('CODEX_CLI_EXIT_FAILURE', `The codex_cli invocation exited with ${String(result.exit_code)}.`);
    }
    if (parsed.threadId === null || parsed.finalMessage === null) {
      return failure('CODEX_CLI_NO_FINAL_MESSAGE', 'The codex_cli invocation produced no final message.');
    }

    return {
      status: 'succeeded',
      runner_version: runnerVersion,
      thread_id: parsed.threadId,
      final_message: parsed.finalMessage,
      usage: parsed.usage,
      tool_calls: parsed.toolCalls,
      trace_events: parsed.events,
    };
  }

  /** The version of the binary that actually ran, resolved once per service instance. Declaring it
   *  in configuration would let it drift from reality, and the provenance claims it is authoritative. */
  private async runnerVersion(): Promise<string> {
    if (this.cachedRunnerVersion === null) {
      const probe = await this.spawnCodex(['--version'], {
        cwd: tmpdir(),
        env: this.buildEnv(),
        stdin: '',
        timeoutMs: 30_000,
      });
      this.cachedRunnerVersion = probe.stdout.trim() || 'unknown';
    }
    return this.cachedRunnerVersion;
  }

  /** A deliberately small environment: the runner inherits nothing that could change what the
   *  agent sees. CODEX_HOME points at the product's own directory, so config, skills and any
   *  other CODEX_HOME-relative material are the product's, not the developer's. */
  private buildEnv(): Record<string, string> {
    const env: Record<string, string> = {
      CODEX_HOME: this.config.codex_home,
      PATH: process.env.PATH ?? '/usr/bin:/bin',
    };
    if (this.config.binary) {
      env.CODEX_CLI_BINARY = this.config.binary;
    }
    return env;
  }
}

/** Deployment configuration for the codex_cli line.
 *
 *  These are environment variables rather than `.ai/llm/**` routing config on purpose: CODEX_HOME
 *  has to be provisioned by whoever runs the process, because it is where the Codex credential
 *  lives, and the line is deliberately not a provider route.
 *
 *    TOPIC_SELECTION_CODEX_HOME              product-owned CODEX_HOME; absent disables the line
 *    TOPIC_SELECTION_CODEX_MODEL             model slug, e.g. gpt-6-astra
 *    TOPIC_SELECTION_CODEX_REASONING_EFFORT  low | medium | high | xhigh | max (default high)
 *    TOPIC_SELECTION_CODEX_BINARY            optional path to the codex binary
 *    TOPIC_SELECTION_CODEX_TIMEOUT_MS        optional per-invocation timeout
 *
 *  Returns null when the line is not configured, which leaves it unavailable rather than
 *  half-configured. */
export function createTopicSelectionCodexCliRunnerFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): { runner: TopicSelectionCodexCliRunnerService; model_id: string } | null {
  const codexHome = env.TOPIC_SELECTION_CODEX_HOME?.trim();
  const model = env.TOPIC_SELECTION_CODEX_MODEL?.trim();
  if (!codexHome || !model) {
    return null;
  }
  const effortRaw = env.TOPIC_SELECTION_CODEX_REASONING_EFFORT?.trim() ?? 'high';
  const efforts = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
  const effort = efforts.find((candidate) => candidate === effortRaw);
  if (!effort) {
    throw new Error(`TOPIC_SELECTION_CODEX_REASONING_EFFORT must be one of ${efforts.join(', ')}.`);
  }
  const timeoutRaw = env.TOPIC_SELECTION_CODEX_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Number.parseInt(timeoutRaw, 10) : undefined;
  if (timeoutMs !== undefined && (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)) {
    throw new Error('TOPIC_SELECTION_CODEX_TIMEOUT_MS must be a positive integer.');
  }
  return {
    runner: new TopicSelectionCodexCliRunnerService({
      codex_home: codexHome,
      model,
      reasoning_effort: effort,
      binary: env.TOPIC_SELECTION_CODEX_BINARY?.trim() || undefined,
      timeout_ms: timeoutMs,
    }),
    model_id: model,
  };
}
