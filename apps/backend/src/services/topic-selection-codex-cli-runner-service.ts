// T-151 Phase 1: the `codex_cli` execution line's runner.
//
// The product drives the Codex CLI itself. Everything the model may see or reach comes from a
// product-owned CODEX_HOME plus per-thread configuration — no run ever writes into that home,
// which is where the credential lives — and everything the product keeps comes back as two things:
// the schema-constrained artifact, and the event trace.
//
// Isolation is why CODEX_HOME is product-owned rather than `--ignore-user-config`: that flag
// suppresses the user's config.toml but NOT their skills, and a probe run read a developer skill
// out of ~/.codex and changed its behaviour because of it (T-151 probe-evidence.md §5).
//
// Session rule (D-4): one fresh thread per invocation attempt. This module has no resume or fork
// path at all, which is what enforces it.
//
// The binary is reached over the App Server (T-152): one `codex app-server` child per runner, one
// ephemeral thread per attempt on it. The `exec` transport it replaced was retired once CLI 0.162.1
// re-validated this path (T-152 D-6).

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { TopicSelectionModelProfile } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type * as v2 from '../generated/codex-app-server/v2/index.js';
import {
  CodexAppServerTurnAbortedError,
  TopicSelectionCodexAppServerClient,
  type CodexAppServerNotification,
  type TopicSelectionCodexAppServerSpawnOptions,
  type TopicSelectionCodexAppServerTurn,
} from './topic-selection-codex-app-server-client.js';

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
  /** The turn ended `failed` or `interrupted` while the child stayed up. */
  'CODEX_CLI_TURN_FAILED',
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
    codex_home: string | null;
    thread_id: string | null;
    usage: TopicSelectionCodexCliUsage | null;
    tool_calls: TopicSelectionCodexCliToolCall[];
    trace_events: unknown[];
    stderr_tail: string;
  };

export interface TopicSelectionCodexCliRunResult {
  /** Observed, not declared: read from the binary that actually ran, so it cannot drift. */
  runner_version: string;
  /** The home the server reported in `initialize` — the isolation proof. */
  codex_home: string;
  thread_id: string;
  /** Raw text of the final agent message; the caller parses it against its own output contract. */
  final_message: string;
  usage: TopicSelectionCodexCliUsage | null;
  tool_calls: TopicSelectionCodexCliToolCall[];
  /** The line's evidence of what happened: the App Server notifications plus every server request
   *  with the product's answer. */
  trace_events: unknown[];
}

export interface TopicSelectionCodexCliRunInput {
  /** Product-authored prompt packet, sent as the turn's input. */
  prompt: string;
  /** JSON Schema the final response must satisfy; enforced by the CLI, not by us. */
  output_schema: Record<string, unknown>;
  invocation_attempt_id: string;
  mcp_servers?: readonly TopicSelectionCodexCliMcpServer[];
  /** Selects the configured effort; absent means `standard`. */
  reasoning_tier?: TopicSelectionCodexCliReasoningTier;
}

/** The slice of the App Server client the runner drives; injected so unit tests run without Codex. */
export type TopicSelectionCodexAppServerSession = Pick<
  TopicSelectionCodexAppServerClient,
  'initialized' | 'request' | 'runTurn' | 'hasExited' | 'stderrTail' | 'close'
>;
export type TopicSelectionCodexAppServerFactory = (
  options: TopicSelectionCodexAppServerSpawnOptions,
) => Promise<TopicSelectionCodexAppServerSession>;

const CODEX_REASONING_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type CodexReasoningEffort = (typeof CODEX_REASONING_EFFORTS)[number];

export type TopicSelectionCodexCliReasoningTier = 'standard' | 'judgment';

// Single-agent profiles whose output is itself an adjudication or a promotion decision. Every
// critic and arbiter is a judgment role by family; generation, extraction and support roles are not.
const JUDGMENT_SINGLE_AGENT_PROFILE_IDS: ReadonlySet<string> = new Set([
  'topic-selection.need-adjudication.single-agent.v1',
  'topic-selection.v1b.topic-value-assessment.single-agent.v1',
  'topic-selection.v1b.n8-bounded-debate.v1',
  'topic-selection-promotion-decision-support',
  'topic-selection.v1c.promotion-support.bounded-micro-debate.v1',
  'topic-selection.v1c.delegated-promotion-decision.v1',
]);

/** Which configured effort a profile runs at on the codex_cli line. */
export function codexCliReasoningTier(
  profile: Pick<TopicSelectionModelProfile, 'profile_id' | 'role_family'>,
): TopicSelectionCodexCliReasoningTier {
  return profile.role_family === 'deep_critic' || profile.role_family === 'arbiter'
    || JUDGMENT_SINGLE_AGENT_PROFILE_IDS.has(profile.profile_id) ? 'judgment' : 'standard';
}

export interface TopicSelectionCodexCliRunnerConfig {
  /** Product-owned CODEX_HOME. Must not be the developer's ~/.codex. */
  codex_home: string;
  model: string;
  /** Effort for `standard`-tier runs. */
  reasoning_effort: CodexReasoningEffort;
  /** Effort for `judgment`-tier runs; defaults to `reasoning_effort`. */
  judgment_reasoning_effort?: CodexReasoningEffort;
  binary?: string;
  timeout_ms?: number;
  /** Finished ephemeral threads stay loaded in the App Server child until it exits, so the child is
   *  replaced after this many attempts. */
  app_server_recycle_after?: number;
}

const DEFAULT_TIMEOUT_MS = 1_200_000;
const DEFAULT_APP_SERVER_RECYCLE_AFTER = 32;

/** No approval of any kind. Together with a per-server `approve` mode this grants the product's own
 *  MCP servers while the sandbox stays read-only; `auto` does NOT work despite its name (recovered
 *  empirically on codex-cli 0.153.4, T-151 probe-evidence.md §7). */
const APP_SERVER_NO_APPROVALS = {
  granular: { sandbox_approval: false, rules: false, skill_approval: false, request_permissions: false, mcp_elicitations: false },
} satisfies v2.AskForApproval;

const BARE_TOML_KEY = /^[A-Za-z0-9_-]+$/;

/** The version of the child that actually ran, read from its `initialize` user agent
 *  (`<client>/<version> (...)`) in the shape `codex --version` prints. Observed, never declared. */
function codexVersion(userAgent: string): string {
  const version = /^[^/\s]+\/(\S+)/.exec(userAgent)?.[1];
  return version ? `codex-cli ${version}` : userAgent;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Product roles may read only their compiled context and explicitly scoped MCP evidence.
// Read-only sandboxing alone still permits native reads and account-connected Apps.
const UNSCOPED_CODEX_FEATURES = [
  'apps', 'shell_tool', 'browser_use', 'computer_use', 'image_generation',
  'view_image', 'multi_agent', 'plugins', 'remote_plugin', 'skill_search', 'skill_mcp_dependency_install', 'hooks',
] as const;

function nativeToolPolicy() {
  return { web_search: 'disabled',
    features: Object.fromEntries(UNSCOPED_CODEX_FEATURES.map(feature => [feature, false])) };
}

/** Everything one attempt is granted, as `thread/start.config` — no config file in the shared
 *  product home, so concurrent attempts cannot race. The approval policy is a first-class
 *  `thread/start` parameter. Server names stay bare TOML keys, which is how Codex stores them. */
export function buildCodexThreadConfig(servers: readonly TopicSelectionCodexCliMcpServer[]): Record<string, unknown> {
  const mcpServers: Record<string, unknown> = {};
  for (const server of servers) {
    assertBareTomlKeys(server);
    mcpServers[server.name] = 'url' in server
      ? { url: server.url, default_tools_approval_mode: 'approve' }
      : {
        command: server.command,
        args: [...server.args],
        ...(server.env && Object.keys(server.env).length > 0 ? { env: { ...server.env } } : {}),
        default_tools_approval_mode: 'approve',
      };
  }
  return { mcp_servers: mcpServers, ...nativeToolPolicy() };
}

function assertBareTomlKeys(server: TopicSelectionCodexCliMcpServer): void {
  if (!BARE_TOML_KEY.test(server.name)) {
    throw new Error(`MCP server name ${JSON.stringify(server.name)} is not a bare TOML key.`);
  }
  for (const name of Object.keys(('env' in server && server.env) || {})) {
    if (!BARE_TOML_KEY.test(name)) {
      throw new Error(`MCP server env name ${JSON.stringify(name)} is not a bare TOML key.`);
    }
  }
}

/** Streaming chatter the trace does not need: token deltas repeat what the completed item carries,
 *  and a live run showed them making a thousand-event trace out of a twenty-item turn. They are kept
 *  only for an item that never completed — in an aborted turn they are the only record of its
 *  output. Raw model responses are always dropped. The trace is evidence, not a replay. */
const APP_SERVER_STREAMING_CHATTER = /(?:[dD]elta|summaryPartAdded)$/;
const APP_SERVER_RAW_RESPONSE = /^rawResponse/;

function isTraceNoise(notification: CodexAppServerNotification, completedItemIds: ReadonlySet<string>): boolean {
  if (APP_SERVER_RAW_RESPONSE.test(notification.method)) {
    return true;
  }
  if (!APP_SERVER_STREAMING_CHATTER.test(notification.method)) {
    return false;
  }
  const itemId = (notification.params as { itemId?: unknown }).itemId;
  return typeof itemId === 'string' && completedItemIds.has(itemId);
}

/** What the runner keeps of an App Server turn, from the notifications the spike showed carry it:
 *  the last completed `agentMessage` is the final message, the last `thread/tokenUsage/updated`
 *  total is the usage, completed `mcpToolCall` items are the tool calls. */
function summarizeAppServerTurn(turn: Omit<TopicSelectionCodexAppServerTurn, 'turn'> | null): {
  finalMessage: string | null;
  usage: TopicSelectionCodexCliUsage | null;
  toolCalls: TopicSelectionCodexCliToolCall[];
  events: unknown[];
} {
  if (turn === null) {
    return { finalMessage: null, usage: null, toolCalls: [], events: [] };
  }
  const items = turn.notifications.flatMap((notification) => (notification.method === 'item/completed' ? [notification.params.item] : []));
  const completedItemIds = new Set(items.map((item) => item.id));
  const messages = items.filter((item): item is Extract<v2.ThreadItem, { type: 'agentMessage' }> => item.type === 'agentMessage');
  const total = turn.notifications
    .flatMap((notification) => (notification.method === 'thread/tokenUsage/updated' ? [notification.params.tokenUsage.total] : []))
    .at(-1);
  return {
    finalMessage: messages.at(-1)?.text ?? null,
    usage: total
      ? {
        input_tokens: total.inputTokens,
        cached_input_tokens: total.cachedInputTokens,
        cache_write_input_tokens: total.cacheWriteInputTokens,
        output_tokens: total.outputTokens,
        reasoning_output_tokens: total.reasoningOutputTokens,
      }
      : null,
    toolCalls: items
      .filter((item): item is Extract<v2.ThreadItem, { type: 'mcpToolCall' }> => item.type === 'mcpToolCall')
      .map((item) => ({ server: item.server, tool: item.tool, status: item.status, error: item.error?.message ?? null })),
    events: [
      ...turn.notifications.filter((notification) => !isTraceNoise(notification, completedItemIds)),
      ...turn.server_requests.map((answered) => ({ server_request: answered.request, answer: answered.answer })),
    ],
  };
}

interface AppServerSlot {
  session: Promise<TopicSelectionCodexAppServerSession>;
  /** The session once the spawn has resolved, so liveness can be checked without yielding. */
  resolved: TopicSelectionCodexAppServerSession | null;
  dead: boolean;
  attempts: number;
  inflight: number;
  retired: boolean;
}

export class TopicSelectionCodexCliRunnerService {
  constructor(
    private readonly config: TopicSelectionCodexCliRunnerConfig,
    private readonly spawnAppServer: TopicSelectionCodexAppServerFactory = TopicSelectionCodexAppServerClient.spawn,
  ) {}

  private appServer: AppServerSlot | null = null;

  /** Effective non-secret execution settings bind product attempt replay to this runner. */
  get executionIdentity() {
    return {
      model: this.config.model, reasoning_effort: this.config.reasoning_effort,
      judgment_reasoning_effort: this.config.judgment_reasoning_effort ?? this.config.reasoning_effort,
      codex_home: this.config.codex_home, binary: this.config.binary ?? 'codex',
      timeout_ms: this.config.timeout_ms ?? DEFAULT_TIMEOUT_MS,
      native_tool_policy: nativeToolPolicy(),
    };
  }

  private effortFor(input: TopicSelectionCodexCliRunInput): CodexReasoningEffort {
    return input.reasoning_tier === 'judgment'
      ? this.config.judgment_reasoning_effort ?? this.config.reasoning_effort
      : this.config.reasoning_effort;
  }

  /** Closes the App Server child, if any, once its in-flight attempts have released it. */
  async shutdown(): Promise<void> {
    if (this.appServer !== null) {
      await this.retireAppServer(this.appServer);
    }
  }

  /** `thread/start` (ephemeral, no approvals, read-only, the attempt's MCP servers) → one turn →
   *  `thread/unsubscribe` in a finally. Archive and delete have no rollout to act on for an
   *  ephemeral thread (T-152 D-3), so unsubscribe is the close and the child is recycled instead.
   *  One invocation attempt, one fresh Codex thread: there is deliberately no resume or fork. */
  async run(input: TopicSelectionCodexCliRunInput): Promise<TopicSelectionCodexCliRunOutcome> {
    let acquired: { session: TopicSelectionCodexAppServerSession; release: () => Promise<void> };
    try {
      acquired = await this.acquireAppServer();
    } catch (error) {
      return {
        status: 'failed',
        error_code: 'CODEX_CLI_EXIT_FAILURE',
        message: `The codex app-server could not be started: ${errorMessage(error)}`,
        runner_version: 'unknown',
        codex_home: null,
        thread_id: null,
        usage: null,
        tool_calls: [],
        trace_events: [],
        stderr_tail: '',
      };
    }
    const { session, release } = acquired;
    const runnerVersion = codexVersion(session.initialized.userAgent);
    const scratch = await mkdtemp(path.join(tmpdir(), 'codex-cli-'));
    let threadId: string | null = null;
    let collected: Omit<TopicSelectionCodexAppServerTurn, 'turn'> | null = null;
    let rateLimitRecord: { rate_limits: unknown } | null = null;
    const traceEvents = (): unknown[] => [...summarizeAppServerTurn(collected).events, ...(rateLimitRecord ? [rateLimitRecord] : [])];
    const failure = (errorCode: TopicSelectionCodexCliErrorCode, message: string): TopicSelectionCodexCliRunOutcome => {
      const summary = summarizeAppServerTurn(collected);
      return {
        status: 'failed',
        error_code: errorCode,
        message,
        runner_version: runnerVersion,
        codex_home: session.initialized.codexHome,
        thread_id: threadId,
        usage: summary.usage,
        tool_calls: summary.toolCalls,
        trace_events: traceEvents(),
        stderr_tail: session.stderrTail().slice(-500),
      };
    };

    try {
      const started = await session.request('thread/start', {
        model: this.config.model,
        cwd: scratch,
        approvalPolicy: APP_SERVER_NO_APPROVALS,
        sandbox: 'read-only',
        ephemeral: true,
        config: buildCodexThreadConfig(input.mcp_servers ?? []) as v2.ThreadStartParams['config'],
      });
      threadId = started.thread.id;
      const turn = await session.runTurn({
        threadId,
        input: [{ type: 'text', text: input.prompt, text_elements: [] }],
        outputSchema: input.output_schema as v2.TurnStartParams['outputSchema'],
        effort: this.effortFor(input),
      }, { timeout_ms: this.config.timeout_ms ?? DEFAULT_TIMEOUT_MS });
      collected = turn;
      // Account state after the attempt, as evidence beside the usage; never a reason to fail.
      const rateLimits = await session.request('account/rateLimits/read', undefined).catch(() => null);
      if (rateLimits !== null) {
        rateLimitRecord = { rate_limits: rateLimits };
      }

      if (turn.turn.status !== 'completed') {
        const reason = turn.turn.error ? `: ${turn.turn.error.message}` : '.';
        return failure('CODEX_CLI_TURN_FAILED', `The codex_cli turn ended ${turn.turn.status}${reason}`);
      }
      const summary = summarizeAppServerTurn(turn);
      if (summary.finalMessage === null) {
        return failure('CODEX_CLI_NO_FINAL_MESSAGE', 'The codex_cli invocation produced no final message.');
      }
      return {
        status: 'succeeded',
        runner_version: runnerVersion,
        codex_home: session.initialized.codexHome,
        thread_id: threadId,
        final_message: summary.finalMessage,
        usage: summary.usage,
        tool_calls: summary.toolCalls,
        trace_events: traceEvents(),
      };
    } catch (error) {
      if (error instanceof CodexAppServerTurnAbortedError) {
        collected = error.partial;
        return error.reason === 'timeout'
          ? failure('CODEX_CLI_TIMEOUT', 'The codex_cli invocation timed out.')
          : failure('CODEX_CLI_EXIT_FAILURE', `The codex app-server died during the invocation: ${error.message}`);
      }
      return failure('CODEX_CLI_EXIT_FAILURE', `The codex app-server failed the invocation: ${errorMessage(error)}`);
    } finally {
      if (threadId !== null && !session.hasExited()) {
        await session.request('thread/unsubscribe', { threadId }).catch(() => undefined);
      }
      await release();
      await rm(scratch, { recursive: true, force: true });
    }
  }

  /** One child per runner, replaced after the recycle bound or once it has died. The decision is
   *  made without yielding, so concurrent attempts cannot each replace the same child; a replaced
   *  child is closed by the last attempt still using it, so a recycle never cuts a turn; and
   *  concurrent first attempts share one spawn. */
  private acquireAppServer(): Promise<{ session: TopicSelectionCodexAppServerSession; release: () => Promise<void> }> {
    const recycleAfter = this.config.app_server_recycle_after ?? DEFAULT_APP_SERVER_RECYCLE_AFTER;
    let slot = this.appServer;
    if (slot !== null && (slot.dead || slot.resolved?.hasExited() === true || slot.attempts >= recycleAfter)) {
      void this.retireAppServer(slot);
      slot = null;
    }
    if (slot === null) {
      slot = this.spawnAppServerSlot();
      this.appServer = slot;
    }
    const current = slot;
    current.attempts += 1;
    current.inflight += 1;
    return current.session.then(
      (session) => ({ session, release: () => this.releaseAppServer(current) }),
      (error: unknown) => {
        current.inflight -= 1;
        if (this.appServer === current) {
          this.appServer = null;
        }
        throw error;
      },
    );
  }

  private spawnAppServerSlot(): AppServerSlot {
    const slot: AppServerSlot = {
      session: this.spawnAppServer({
        codex_home: this.config.codex_home,
        // The child's own cwd is neutral; each thread gets a per-attempt scratch directory.
        cwd: tmpdir(),
        binary: this.config.binary,
        client_name: 'my-researcher',
      }),
      resolved: null,
      dead: false,
      attempts: 0,
      inflight: 0,
      retired: false,
    };
    slot.session.then((session) => { slot.resolved = session; }, () => { slot.dead = true; });
    return slot;
  }

  private async releaseAppServer(slot: AppServerSlot): Promise<void> {
    slot.inflight -= 1;
    if (slot.retired && slot.inflight === 0) {
      await slot.session.then((session) => session.close(), () => undefined);
    }
  }

  /** Marks the slot retired and drops it from the runner synchronously; the close itself waits for
   *  the last in-flight attempt to release it. */
  private retireAppServer(slot: AppServerSlot): Promise<void> {
    slot.retired = true;
    if (this.appServer === slot) {
      this.appServer = null;
    }
    return slot.inflight === 0
      ? slot.session.then((session) => session.close(), () => undefined).then(() => undefined)
      : Promise.resolve();
  }

}

/** Deployment configuration for the codex_cli line.
 *
 *  These are environment variables rather than `.ai/llm/**` routing config on purpose: CODEX_HOME
 *  has to be provisioned by whoever runs the process, because it is where the Codex credential
 *  lives, and the line is deliberately not a provider route.
 *
 *    TOPIC_SELECTION_CODEX_HOME              product-owned CODEX_HOME; absent disables the line
 *    TOPIC_SELECTION_CODEX_MODEL             model slug, e.g. gpt-6.1-sol
 *    TOPIC_SELECTION_CODEX_REASONING_EFFORT  low | medium | high | xhigh | max (default high)
 *    TOPIC_SELECTION_CODEX_JUDGMENT_REASONING_EFFORT  same values, for judgment roles (default xhigh)
 *    TOPIC_SELECTION_CODEX_BINARY            optional path to the codex binary
 *    TOPIC_SELECTION_CODEX_TIMEOUT_MS        optional per-invocation timeout (default 1200000)
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
  const effortFromEnv = (key: string, fallback: CodexReasoningEffort): CodexReasoningEffort => {
    const raw = env[key]?.trim() || fallback;
    const effort = CODEX_REASONING_EFFORTS.find((candidate) => candidate === raw);
    if (!effort) {
      throw new Error(`${key} must be one of ${CODEX_REASONING_EFFORTS.join(', ')}.`);
    }
    return effort;
  };
  const effort = effortFromEnv('TOPIC_SELECTION_CODEX_REASONING_EFFORT', 'high');
  const judgmentEffort = effortFromEnv('TOPIC_SELECTION_CODEX_JUDGMENT_REASONING_EFFORT', 'xhigh');
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
      judgment_reasoning_effort: judgmentEffort,
      binary: env.TOPIC_SELECTION_CODEX_BINARY?.trim() || undefined,
      timeout_ms: timeoutMs,
    }),
    model_id: model,
  };
}
