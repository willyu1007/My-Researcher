// T-152: the codex_cli line's App Server transport. One long-lived `codex app-server` child is
// driven over newline-delimited JSON-RPC on its stdio; this module is that transport plus the
// product's answer policy for server-initiated requests, and knows nothing about research
// contracts. Phase 1 reaches it from a live-gated spike only; the runner adopts it in Phase 2.
//
// Wire facts observed on codex-cli 0.153.4 (2026-09-09): responses are `{id, result}` or
// `{id, error}` with no `jsonrpc` field; notifications are `{method, params, emittedAtMs}`; server
// requests are `{id, method, params}`. The `initialize` response's `codexHome` is the isolation
// proof a trace records.

import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

import type {
  ClientRequest,
  InitializeResponse,
  RequestId,
  ServerNotification,
  ServerRequest,
} from '../generated/codex-app-server/index.js';
import type * as v2 from '../generated/codex-app-server/v2/index.js';

export type CodexAppServerMethod = ClientRequest['method'];
export type CodexAppServerParams<M extends CodexAppServerMethod> = Extract<ClientRequest, { method: M }>['params'];

/** Result shapes for the methods this line calls. ts-rs emits no request→response pairing, so this
 *  is the one hand-kept index into the generated types: calling a new method means adding a row. */
export interface CodexAppServerResults {
  initialize: InitializeResponse;
  'thread/start': v2.ThreadStartResponse;
  'thread/archive': v2.ThreadArchiveResponse;
  'thread/delete': v2.ThreadDeleteResponse;
  'thread/list': v2.ThreadListResponse;
  'thread/loaded/list': v2.ThreadLoadedListResponse;
  'thread/unsubscribe': v2.ThreadUnsubscribeResponse;
  'turn/start': v2.TurnStartResponse;
  'turn/interrupt': v2.TurnInterruptResponse;
  'account/rateLimits/read': v2.GetAccountRateLimitsResponse;
}

/** A notification as it arrives: the generated payload plus the envelope's timestamp. */
export type CodexAppServerNotification = ServerNotification & { emittedAtMs?: number };

export type CodexAppServerPolicyAnswer =
  | { kind: 'declined'; result: unknown }
  | { kind: 'refused'; error: { code: number; message: string } };

export interface CodexAppServerAnsweredRequest {
  request: ServerRequest;
  answer: CodexAppServerPolicyAnswer;
}

/** What the product says to a server-initiated request: nothing is approved and no question is
 *  answered. Approval-shaped requests get the protocol's own decline so the turn ends on its terms;
 *  anything else gets a JSON-RPC error. Every answer is observable through onServerRequest, which
 *  is what lets a trace show the request and the policy that met it (T-152 D-4). */
export function answerServerRequestByPolicy(request: ServerRequest): CodexAppServerPolicyAnswer {
  switch (request.method) {
    case 'item/commandExecution/requestApproval':
      return { kind: 'declined', result: { decision: 'decline' } satisfies v2.CommandExecutionRequestApprovalResponse };
    case 'item/fileChange/requestApproval':
      return { kind: 'declined', result: { decision: 'decline' } satisfies v2.FileChangeRequestApprovalResponse };
    case 'item/tool/requestUserInput':
      return { kind: 'declined', result: { answers: {} } satisfies v2.ToolRequestUserInputResponse };
    case 'mcpServer/elicitation/request':
      return {
        kind: 'declined',
        result: { action: 'decline', content: null, _meta: null } satisfies v2.McpServerElicitationRequestResponse,
      };
    case 'item/permissions/requestApproval':
      return { kind: 'declined', result: { permissions: {}, scope: 'turn' } satisfies v2.PermissionsRequestApprovalResponse };
    default:
      return { kind: 'refused', error: { code: -32601, message: `${request.method} is not answered by the product.` } };
  }
}

export interface CodexAppServerExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface PendingRequest {
  method: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

const CLOSE_GRACE_MS = 3_000;

/** The JSON-RPC framing over one child's stdio. Untyped at this level: the typed surface is the
 *  client below, and the wire boundary is where the casts live. */
class CodexAppServerTransport {
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly notificationListeners = new Set<(notification: CodexAppServerNotification) => void>();
  private readonly requestListeners = new Set<(answered: CodexAppServerAnsweredRequest) => void>();
  private stderr = '';
  private exit: CodexAppServerExit | null = null;
  readonly exited: Promise<CodexAppServerExit>;

  constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => { this.stderr = (this.stderr + chunk).slice(-4_000); });
    // EPIPE on a child that died is a failed request, not an uncaught exception in the backend.
    child.stdin.on('error', (error: Error) => { this.stderr += `stdin: ${error.message}\n`; });
    createInterface({ input: child.stdout }).on('line', (line) => this.receive(line));
    this.exited = new Promise((resolve) => {
      const settle = (exit: CodexAppServerExit): void => {
        if (this.exit) { return; }
        this.exit = exit;
        for (const request of this.pending.values()) {
          request.reject(new Error(`codex app-server exited (${describeExit(exit)}) before answering ${request.method}`));
        }
        this.pending.clear();
        resolve(exit);
      };
      child.on('close', (code, signal) => settle({ code, signal }));
      child.on('error', (error) => { this.stderr += `spawn: ${error.message}\n`; settle({ code: null, signal: null }); });
    });
  }

  request(method: string, params: unknown): Promise<unknown> {
    if (this.exit) {
      return Promise.reject(new Error(`codex app-server already exited (${describeExit(this.exit)}); cannot send ${method}`));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { method, resolve, reject });
      this.send(params === undefined ? { jsonrpc: '2.0', id, method } : { jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method: string, params?: unknown): void {
    this.send(params === undefined ? { jsonrpc: '2.0', method } : { jsonrpc: '2.0', method, params });
  }

  onNotification(listener: (notification: CodexAppServerNotification) => void): () => void {
    this.notificationListeners.add(listener);
    return () => { this.notificationListeners.delete(listener); };
  }

  onServerRequest(listener: (answered: CodexAppServerAnsweredRequest) => void): () => void {
    this.requestListeners.add(listener);
    return () => { this.requestListeners.delete(listener); };
  }

  stderrTail(): string {
    return this.stderr;
  }

  /** End stdin and wait; escalate to the process group so whatever the server spawned goes too. */
  async close(): Promise<CodexAppServerExit> {
    if (!this.exit) {
      this.child.stdin.end();
      if (!(await this.exitsWithin(CLOSE_GRACE_MS))) {
        this.signalGroup('SIGTERM');
        if (!(await this.exitsWithin(CLOSE_GRACE_MS))) {
          this.signalGroup('SIGKILL');
        }
      }
    }
    return this.exited;
  }

  private exitsWithin(ms: number): Promise<boolean> {
    return Promise.race([
      this.exited.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), ms).unref()),
    ]);
  }

  private signalGroup(signal: NodeJS.Signals): void {
    if (this.child.pid === undefined) { return; }
    try {
      process.kill(-this.child.pid, signal);
    } catch {
      this.child.kill(signal);
    }
  }

  private send(payload: Record<string, unknown>): void {
    this.child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  private receive(line: string): void {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(line) as Record<string, unknown>;
    } catch {
      this.stderr += `non-json stdout: ${line.slice(0, 200)}\n`;
      return;
    }
    const { id, method } = message;
    if (typeof method === 'string' && id !== undefined) {
      this.answer({ id: id as RequestId, method, params: message.params } as ServerRequest);
    } else if (typeof method === 'string') {
      for (const listener of this.notificationListeners) {
        listener(message as CodexAppServerNotification);
      }
    } else if (typeof id === 'number') {
      const request = this.pending.get(id);
      if (!request) { return; }
      this.pending.delete(id);
      if ('error' in message) {
        const error = message.error as { code?: number; message?: string };
        request.reject(new Error(`${request.method} failed: ${error.message ?? 'unknown error'} (code ${String(error.code)})`));
      } else {
        request.resolve(message.result);
      }
    }
  }

  private answer(request: ServerRequest): void {
    const answer = answerServerRequestByPolicy(request);
    this.send(answer.kind === 'declined'
      ? { jsonrpc: '2.0', id: request.id, result: answer.result }
      : { jsonrpc: '2.0', id: request.id, error: answer.error });
    for (const listener of this.requestListeners) {
      listener({ request, answer });
    }
  }
}

function describeExit(exit: CodexAppServerExit): string {
  return exit.signal ? `signal ${exit.signal}` : `code ${String(exit.code)}`;
}

export interface TopicSelectionCodexAppServerSpawnOptions {
  codex_home: string;
  /** Working directory for the child. Never the repository: a project-local `.codex` would load. */
  cwd: string;
  binary?: string;
  client_name?: string;
  client_version?: string;
}

/** Everything one turn produced, in arrival order, filtered to its thread. */
export interface TopicSelectionCodexAppServerTurn {
  turn: v2.Turn;
  notifications: CodexAppServerNotification[];
  server_requests: CodexAppServerAnsweredRequest[];
}

export class TopicSelectionCodexAppServerClient {
  /** Spawns the child from the product home with the runner's deliberately small environment and
   *  completes the `initialize` / `initialized` handshake. */
  static async spawn(options: TopicSelectionCodexAppServerSpawnOptions): Promise<TopicSelectionCodexAppServerClient> {
    const child = spawn(options.binary ?? 'codex', ['app-server'], {
      cwd: options.cwd,
      env: { CODEX_HOME: options.codex_home, PATH: process.env.PATH ?? '/usr/bin:/bin' },
      shell: false,
      detached: true,
    });
    const transport = new CodexAppServerTransport(child);
    try {
      const initialized = await transport.request('initialize', {
        clientInfo: { name: options.client_name ?? 'my-researcher', title: null, version: options.client_version ?? '0' },
        // Granular approval policies are gated behind the experimental API on 0.153.4; without
        // this flag `thread/start` rejects `askForApproval.granular` with -32600.
        capabilities: { experimentalApi: true, requestAttestation: false },
      } satisfies CodexAppServerParams<'initialize'>) as InitializeResponse;
      transport.notify('initialized');
      return new TopicSelectionCodexAppServerClient(transport, initialized);
    } catch (error) {
      await transport.close();
      throw error;
    }
  }

  private constructor(
    private readonly transport: CodexAppServerTransport,
    readonly initialized: InitializeResponse,
  ) {}

  request<M extends keyof CodexAppServerResults>(method: M, params: CodexAppServerParams<M>): Promise<CodexAppServerResults[M]> {
    return this.transport.request(method, params) as Promise<CodexAppServerResults[M]>;
  }

  onNotification(listener: (notification: CodexAppServerNotification) => void): () => void {
    return this.transport.onNotification(listener);
  }

  onServerRequest(listener: (answered: CodexAppServerAnsweredRequest) => void): () => void {
    return this.transport.onServerRequest(listener);
  }

  /** Starts one turn and collects its thread's notifications and answered server requests until
   *  `turn/completed`. A timeout interrupts the turn and fails; a dead server fails immediately. */
  async runTurn(params: v2.TurnStartParams, options: { timeout_ms: number }): Promise<TopicSelectionCodexAppServerTurn> {
    const notifications: CodexAppServerNotification[] = [];
    const serverRequests: CodexAppServerAnsweredRequest[] = [];
    let complete: (turn: v2.Turn) => void = () => {};
    const completed = new Promise<v2.Turn>((resolve) => { complete = resolve; });
    // Subscribe before sending: the first notifications can precede the turn/start response.
    const unsubscribe = [
      this.onNotification((notification) => {
        if (threadIdOf(notification.params) !== params.threadId) { return; }
        notifications.push(notification);
        if (notification.method === 'turn/completed') {
          complete(notification.params.turn);
        }
      }),
      this.onServerRequest((answered) => {
        if (threadIdOf(answered.request.params) === params.threadId) {
          serverRequests.push(answered);
        }
      }),
    ];
    let timer: NodeJS.Timeout | undefined;
    try {
      const started = await this.request('turn/start', params);
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`turn ${started.turn.id} exceeded ${String(options.timeout_ms)}ms`)), options.timeout_ms);
      });
      const died = this.transport.exited.then((exit) => {
        throw new Error(`codex app-server exited (${describeExit(exit)}) during turn ${started.turn.id}`);
      });
      try {
        const turn = await Promise.race([completed, timedOut, died]);
        return { turn, notifications, server_requests: serverRequests };
      } catch (error) {
        await this.request('turn/interrupt', { threadId: params.threadId, turnId: started.turn.id }).catch(() => undefined);
        throw error;
      }
    } finally {
      clearTimeout(timer);
      for (const stop of unsubscribe) { stop(); }
    }
  }

  stderrTail(): string {
    return this.transport.stderrTail();
  }

  close(): Promise<CodexAppServerExit> {
    return this.transport.close();
  }
}

/** Thread-scoped payloads carry `threadId`; `thread/started` carries the thread itself. */
function threadIdOf(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) { return null; }
  const record = payload as { threadId?: unknown; thread?: { id?: unknown } };
  if (typeof record.threadId === 'string') { return record.threadId; }
  return typeof record.thread?.id === 'string' ? record.thread.id : null;
}
