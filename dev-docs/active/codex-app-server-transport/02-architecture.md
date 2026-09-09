# Architecture

## Context and current state

The `codex_cli` runner (`apps/backend/src/services/topic-selection-codex-cli-runner-service.ts`)
spawns one `codex exec --json` per invocation attempt from a product-owned `CODEX_HOME`, passes
everything per-invocation as `-c` overrides, parses the JSONL event stream, and returns either a
succeeded result or a failed result that still carries its trace. The orchestrator's
`executeCodexCli` branch, the `codex_cli_response` provenance branch, and the MCP tool surface do
not depend on how the runner reaches Codex; they consume the runner's outcome shape.

The App Server is a different transport with a formal, machine-readable protocol
(`openai/codex` `codex-rs/app-server-protocol`): bidirectional JSON-RPC with client requests
(`thread/start`, `turn/start`, `thread/archive`, …), server requests (`item/tool/requestUserInput`,
`item/commandExecution/requestApproval`, `mcpServer/elicitation/request`, …) and notifications
(`item/*`, `turn/completed`, `thread/tokenUsage/updated`, `thread/compacted`, …). The binary
itself emits bindings (`codex app-server generate-ts`, `generate-json-schema`) and listens on
`stdio://` by default or `unix://` / `ws://` on request; the sibling project t3code drives it
from Effect with types it generates from the upstream repository.

## Settled design and boundaries

Inherited and not reopened here:

- The runner's outcome shape and the provenance it feeds. A transport swap must produce the same
  `TopicSelectionCodexCliRunOutcome`, so the orchestrator and the contract stay untouched.
- Trace as evidence, not hash replay (T-151 D-2). Compaction inside an attempt is accepted.
- One fresh thread per invocation attempt, no reuse across roles, attempts, nodes or runs
  (T-151 D-4). In App Server terms this becomes explicit `thread/start` and close calls around the
  attempt rather than a process boundary.
- Product owner state, not conversation history, is the research authority. Threads are transient
  execution detail; what the product keeps is the artifact and the trace.

Settled by decision at opening: a dedicated `codex app-server` child per backend process over its
default `stdio://`, spawned from the product-owned `CODEX_HOME` with the runner's minimal
environment (D-1); protocol bindings generated from that binary with `codex app-server
generate-json-schema` / `generate-ts` and checked for drift by regeneration (D-2).

Settled by the Phase 1 spike against codex-cli 0.153.4 (2026-09-09):

| Today's `codex exec` invocation | App Server equivalent |
|---|---|
| process spawn per attempt | one `codex app-server` child per runner instance, spawned from the product home with `CODEX_HOME` and `PATH` only and a scratch `cwd` (a repository cwd loads project-local `.codex`); `initialize` with `capabilities.experimentalApi = true` (granular approval is gated on it); the response's `codexHome` is the isolation proof |
| `-c approval_policy={granular=…}` | `thread/start.approvalPolicy` granular with all five flags false (`sandbox_approval`, `rules`, `skill_approval`, `request_permissions`, `mcp_elicitations`) |
| `-s read-only` | `thread/start.sandbox: "read-only"` (the server reports `{type: readOnly, networkAccess: false}`; MCP connections are the server's own and unaffected) |
| `-c mcp_servers.<name>.url=…`, `default_tools_approval_mode="approve"` | `thread/start.config: { mcp_servers: { <name>: { url, default_tools_approval_mode: "approve" } } }` |
| `--ephemeral`, `-m`, cwd | `thread/start.ephemeral: true`, `.model`, `.cwd` |
| prompt on stdin | `turn/start.input: [{ type: "text", text, text_elements: [] }]` |
| `--output-schema` | `turn/start.outputSchema` — enforced: the three requested violations were blocked |
| `-c model_reasoning_effort=…` | `turn/start.effort` |
| one process exits | `thread/unsubscribe`; an ephemeral thread has no rollout, so `thread/archive` and `thread/delete` both fail with -32600, and the thread stays in `thread/loaded/list` until the child exits — hence a bounded recycle of the child (D-3) |

Wire shape: newline-delimited JSON; responses are `{id, result | error}` without `jsonrpc`;
notifications `{method, params, emittedAtMs}`; server requests `{id, method, params}`. Ending
the child's stdin makes it exit 0. Two threads on one child run their turns concurrently.

The client (`apps/backend/src/services/topic-selection-codex-app-server-client.ts`) is the
transport plus the product's answer policy: approval-shaped server requests are declined with the
protocol's own decline, everything else gets a JSON-RPC error, and each answer is observable so
the trace can carry it. `runTurn` subscribes before sending, filters by thread id, and interrupts
the turn on timeout.

## Interfaces and contracts

- Runner boundary: unchanged `TopicSelectionCodexCliRunInput` → `TopicSelectionCodexCliRunOutcome`,
  which gained `transport` and `codex_home` (null on `exec`, the server's `initialize` answer on
  `app_server`) and the App-Server-only failure code `CODEX_CLI_TURN_FAILED`. The runner takes a
  second injection point beside `TopicSelectionCodexCliSpawn`: a `TopicSelectionCodexAppServerFactory`
  producing the `TopicSelectionCodexAppServerSession` slice of the client, so its unit tests run
  with a scripted session; the client's own unit tests attach to a scripted child process
  (`test-fixtures/codex-app-server-fake.mjs`) so framing, policy answers, death mid-turn and
  timeouts are exercised over real pipes.
- Child lifecycle in the runner: one slot per runner instance holding the session promise (so
  concurrent first attempts share one spawn), an attempt count and an in-flight count. The slot is
  retired after `app_server_recycle_after` attempts (default 32) or when the child has exited; a
  retired child is closed by the last attempt still on it, and `shutdown()` retires the current
  one. A turn aborted by timeout or child death raises `CodexAppServerTurnAbortedError` carrying
  what was collected, so the failed outcome keeps its partial trace.
- Trace: `topic-selection-codex-cli-trace-v1` keeps its shape; the `events` array carries App Server
  notifications instead of `exec --json` lines, and gains `thread/compacted`, usage updates and any
  server requests with the policy answer the product gave. Field mapping, observed in the spike:
  `thread_id` ← `thread/start` response (`thread.id`, also in `thread/started`); final message ←
  the last completed `agentMessage` item (`item/completed`; `item/agentMessage/delta` streams it);
  `usage` ← the last `thread/tokenUsage/updated.tokenUsage.total`, one update per model round trip
  (`TokenUsageBreakdown`: `inputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`,
  `outputTokens`, `reasoningOutputTokens`, `totalTokens`; `modelContextWindow` beside it); tool
  calls ← completed `mcpToolCall` items (`server`, `tool`, `status`, `arguments`, `result`,
  `error`, `durationMs`) with `item/mcpToolCall/progress` in between; MCP startup ←
  `mcpServer/startupStatus/updated`; outcome ← `turn/completed.turn.status` with `turn.error` on
  failure. Rate limits are a request, not an event: `account/rateLimits/read` returns
  `rateLimits.primary.{usedPercent, windowDurationMins, resetsAt}`, `credits`, `planType`.
- Server requests the product must answer: at minimum `item/tool/requestUserInput`,
  `item/commandExecution/requestApproval`, `item/fileChange/requestApproval` and
  `mcpServer/elicitation/request`. This task answers them by policy (refuse, record); a later task
  may route the first to a researcher.

## Migration and operation

- A long-lived child process per backend process needs supervision: start on first use, restart on
  crash, recycle after a bounded number of attempts because finished ephemeral threads stay loaded,
  and never let a crashed server hang an attempt (the client fails every pending request and any
  running turn when the child exits).
- The server writes its own state under `CODEX_HOME` (sqlite WAL side files for `memories`); it
  writes no session rollout for an ephemeral thread. The product still never writes there itself.
- Bindings: `apps/backend/scripts/codex-app-server-bindings-generate.mjs` regenerates
  `apps/backend/src/generated/codex-app-server/` from the installed binary and records its version
  in `codex-version.ts`; `--check` fails on drift and belongs in the checks run after a Codex
  upgrade.
- `app_server` is the default transport; `exec` stays selectable as the fallback if the experimental
  server regresses, and its removal is a registry Idea due once the next Codex upgrade re-validates
  the App Server path (D-6). The backend does not compose the runner yet (the line is inert); when
  it does, `shutdown()` belongs on the app's close hook.
- Deployment stays environment-based; the product `CODEX_HOME` provisioned for T-151 is reused.
