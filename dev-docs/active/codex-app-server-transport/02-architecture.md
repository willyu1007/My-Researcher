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

Not yet settled — the spike exists to settle them: the process model (D-1), type generation (D-2),
what closing a thread means (archive or delete), whether the server enforces an output schema per
turn, and the exact usage fields.

## Interfaces and contracts

- Runner boundary: unchanged `TopicSelectionCodexCliRunInput` → `TopicSelectionCodexCliRunOutcome`.
  The `TopicSelectionCodexCliSpawn` injection point is replaced or wrapped by an App Server client
  injection point so the unit tests keep running without a Codex installation.
- Trace: `topic-selection-codex-cli-trace-v1` keeps its shape; the `events` array carries App Server
  notifications instead of `exec --json` lines, and gains `thread/compacted`, usage updates and any
  server requests with the policy answer the product gave.
- Server requests the product must answer: at minimum `item/tool/requestUserInput`,
  `item/commandExecution/requestApproval`, `item/fileChange/requestApproval` and
  `mcpServer/elicitation/request`. This task answers them by policy (refuse, record); a later task
  may route the first to a researcher.

## Migration and operation

- A long-lived child process per backend process needs supervision: start on first use, restart on
  crash, and never let a crashed server hang an attempt.
- The `exec` path stays selectable during the transition (D-6) and must have a recorded exit.
- Deployment stays environment-based; the product `CODEX_HOME` provisioned for T-151 is reused.
