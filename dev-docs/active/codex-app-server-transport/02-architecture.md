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

Settled by the installed binary's schema (2026-09-09), pending live confirmation in the spike:

| Today's `codex exec` invocation | App Server equivalent |
|---|---|
| process spawn per attempt | `initialize` (`clientInfo`) once per child; the response's `codexHome` proves which home it runs from |
| `-c approval_policy={granular=…}` | `thread/start.approvalPolicy` (`AskForApproval`: `untrusted` / `on-request` / `never` / granular) |
| `-s read-only` | `thread/start.sandbox` (`SandboxMode`: `read-only` / `workspace-write` / `danger-full-access`) |
| `-c mcp_servers.<name>.url=…` | `thread/start.config` (free object; exact key shape is a spike question) |
| `--ephemeral`, `-m`, cwd | `thread/start.ephemeral`, `.model`, `.cwd` |
| prompt on stdin | `turn/start.input` |
| `--output-schema` | `turn/start.outputSchema` |
| `-c model_reasoning_effort=…` | `turn/start.effort` |
| one process exits | `thread/archive` or `thread/delete` (`threadId`) — which one satisfies D-3 is a spike question |

Not yet settled: whether `outputSchema` is enforced as strictly as the flag, the `config` key shape
for MCP servers, and archive-versus-delete semantics.

## Interfaces and contracts

- Runner boundary: unchanged `TopicSelectionCodexCliRunInput` → `TopicSelectionCodexCliRunOutcome`.
  The `TopicSelectionCodexCliSpawn` injection point is replaced or wrapped by an App Server client
  injection point so the unit tests keep running without a Codex installation.
- Trace: `topic-selection-codex-cli-trace-v1` keeps its shape; the `events` array carries App Server
  notifications instead of `exec --json` lines, and gains `thread/compacted`, usage updates and any
  server requests with the policy answer the product gave. Field mapping from the binary's schema:
  `thread_id` ← `thread/started`; final message ← the last `item/completed` agent message, or
  `turn/completed.turn.items`; `usage` ← `thread/tokenUsage/updated.tokenUsage.total`
  (`TokenUsageBreakdown`: `inputTokens`, `cachedInputTokens`, `cacheWriteInputTokens`,
  `outputTokens`, `reasoningOutputTokens`, plus `totalTokens` and `modelContextWindow`); tool calls
  ← `item/started` / `item/completed` for `mcpToolCall` items and `item/mcpToolCall/progress`;
  outcome ← `turn/completed.turn.status` (`completed` / `interrupted` / `failed` / `inProgress`)
  with `turn.error` on failure.
- Server requests the product must answer: at minimum `item/tool/requestUserInput`,
  `item/commandExecution/requestApproval`, `item/fileChange/requestApproval` and
  `mcpServer/elicitation/request`. This task answers them by policy (refuse, record); a later task
  may route the first to a researcher.

## Migration and operation

- A long-lived child process per backend process needs supervision: start on first use, restart on
  crash, and never let a crashed server hang an attempt.
- The `exec` path stays selectable during the transition (D-6) and must have a recorded exit.
- Deployment stays environment-based; the product `CODEX_HOME` provisioned for T-151 is reused.
