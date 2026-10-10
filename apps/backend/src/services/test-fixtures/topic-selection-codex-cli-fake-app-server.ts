// In-process stand-in for `codex app-server`, so codex_cli runners run in unit tests without Codex
// or credentials. `fakeAppServers` records what the runner sent; `fakeCodexCliRunner` is the short
// form for tests that only care what the model is shown and what it answers.

import type * as v2 from '../../generated/codex-app-server/v2/index.js';
import {
  CodexAppServerTurnAbortedError,
  type CodexAppServerNotification,
  type TopicSelectionCodexAppServerTurn,
} from '../topic-selection-codex-app-server-client.js';
import {
  TopicSelectionCodexCliRunnerService,
  type TopicSelectionCodexAppServerFactory,
  type TopicSelectionCodexAppServerSession,
  type TopicSelectionCodexCliRunnerConfig,
} from '../topic-selection-codex-cli-runner-service.js';

/** The version a fake child reports; runners built on it record `codex-cli test`. */
export const FAKE_CODEX_USER_AGENT = 'my-researcher/test (fake)';

/** One completed turn: a tool call, then `final` as the agent message (none when null). */
export function appServerTurn(
  threadId: string,
  options: { status?: v2.TurnStatus; final?: string | null } = {},
): TopicSelectionCodexAppServerTurn {
  const turnId = 'turn_1';
  const usage = { totalTokens: 125, inputTokens: 100, cachedInputTokens: 10, cacheWriteInputTokens: 0, outputTokens: 25, reasoningOutputTokens: 5 };
  const completed = (item: v2.ThreadItem): CodexAppServerNotification => ({ method: 'item/completed', params: { item, threadId, turnId, completedAtMs: 1 } });
  const status = options.status ?? 'completed';
  const turn: v2.Turn = {
    id: turnId, rootTurnId: null, items: [], itemsView: 'full', status, startedAt: null, completedAt: null, durationMs: 1,
    error: status === 'failed' ? { message: 'model refused', codexErrorInfo: null, additionalDetails: null, misalignment: null } : null,
  };
  return {
    turn,
    notifications: [
      { method: 'turn/started', params: { threadId, turn } },
      { method: 'item/agentMessage/delta', params: { threadId, turnId, itemId: 'item_msg', delta: '{"ver' } },
      completed({
        type: 'mcpToolCall', id: 'item_tool', server: 'research', tool: 'list_evidence', status: 'completed',
        arguments: {}, appContext: null, mcpAppUi: null, pluginId: null, readOnlyHint: null, result: null, error: null, durationMs: 3,
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

export interface FakeAppServer {
  codex_home: string;
  methods: string[];
  thread_starts: v2.ThreadStartParams[];
  turns: v2.TurnStartParams[];
  closed: boolean;
}

export type FakeAppServerTurnScript = (
  params: v2.TurnStartParams,
  thread: v2.ThreadStartParams,
) => Promise<TopicSelectionCodexAppServerTurn>;

/** A child factory whose children answer every turn with `turn`; each spawned child is recorded. */
export function fakeAppServers(turn: FakeAppServerTurnScript = async (params) => appServerTurn(params.threadId)) {
  const servers: FakeAppServer[] = [];
  const factory: TopicSelectionCodexAppServerFactory = async (options) => {
    const server: FakeAppServer = { codex_home: options.codex_home, methods: [], thread_starts: [], turns: [], closed: false };
    servers.push(server);
    const threads = new Map<string, v2.ThreadStartParams>();
    const request = async (method: string, params: unknown): Promise<unknown> => {
      server.methods.push(method);
      if (method === 'thread/start') {
        server.thread_starts.push(params as v2.ThreadStartParams);
        const id = `thread_${String(server.thread_starts.length)}`;
        threads.set(id, params as v2.ThreadStartParams);
        return { thread: { id } };
      }
      if (method === 'account/rateLimits/read') {
        return { rateLimits: { primary: { usedPercent: 5 } } };
      }
      return method === 'thread/unsubscribe' ? { status: 'unsubscribed' } : {};
    };
    return {
      initialized: { userAgent: FAKE_CODEX_USER_AGENT, codexHome: options.codex_home, platformFamily: 'unix', platformOs: 'test' },
      request: request as TopicSelectionCodexAppServerSession['request'],
      runTurn: async (params) => { server.turns.push(params); return turn(params, threads.get(params.threadId)!); },
      hasExited: () => server.closed,
      stderrTail: () => 'fake stderr',
      close: async () => { server.closed = true; return { code: 0, signal: null }; },
    };
  };
  return { factory, servers };
}

/** What a fake model is shown for one attempt. */
export interface FakeCodexTurnRequest {
  prompt: string;
  output_schema: Record<string, unknown>;
  /** `thread/start.config.mcp_servers`: the servers this attempt was granted. */
  mcp_servers: Record<string, unknown>;
  effort: string | null;
}

/** The final agent message, or `{ timeout: true }` for a turn that runs out of time. */
export type FakeCodexTurnReply = string | { timeout: true };

/** A runner over a fake child that answers each turn with `respond`. */
export function fakeCodexCliRunner(
  config: TopicSelectionCodexCliRunnerConfig,
  respond: (request: FakeCodexTurnRequest) => FakeCodexTurnReply | Promise<FakeCodexTurnReply>,
): TopicSelectionCodexCliRunnerService {
  const { factory } = fakeAppServers(async (params, thread) => {
    const [text] = params.input;
    const reply = await respond({
      prompt: text?.type === 'text' ? text.text : '',
      output_schema: params.outputSchema as Record<string, unknown>,
      mcp_servers: ((thread.config ?? {}) as { mcp_servers?: Record<string, unknown> }).mcp_servers ?? {},
      effort: params.effort ?? null,
    });
    if (typeof reply !== 'string') {
      const { notifications, server_requests } = appServerTurn(params.threadId, { final: null });
      throw new CodexAppServerTurnAbortedError('timeout', `${params.threadId} timed out`, { notifications: notifications.slice(0, 1), server_requests });
    }
    return appServerTurn(params.threadId, { final: reply });
  });
  return new TopicSelectionCodexCliRunnerService(config, factory);
}
