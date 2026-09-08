# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| The installed binary emits its own protocol bindings. | `codex app-server generate-json-schema --out DIR` on codex-cli 0.153.4. | observed (2026-09-09) | 41 top-level files plus `v1/` (the `initialize` handshake) and `v2/` (265 files, 622 definitions). No network fetch, no version guessing. |
| The App Server exposes what the invocation needs. | Read `ThreadStartParams`, `TurnStartParams`, `AskForApproval`, `SandboxMode`, `Turn`, `ThreadTokenUsage` from the generated schema. | observed (2026-09-09) | `turn/start.outputSchema` exists; `thread/start` takes `approvalPolicy` (granular), `sandbox`, `config`, `ephemeral`, `model`, `cwd`; `TokenUsageBreakdown` carries the trace's five fields plus totals; `initialize` returns `codexHome`. Existence, not yet behaviour. |
| `turn/start.outputSchema` enforces the final message per turn. | Spike turn with the T-151 live-smoke schema demanding three violations. | not-run | Decides whether schema enforcement stays in the transport or moves product-side. |
| `thread/start.config` reaches the product MCP endpoint. | Spike turn that must call `list_evidence`. | not-run | Decides the config key shape. |
| A dedicated child serves concurrent threads. | Two concurrent spike turns on one child. | not-run | Bears on D-1 and D-3. |
| Closing a thread: archive versus delete. | Close one thread each way; read `thread/list` and the home directory. | not-run | Closes D-3. |
| Generated bindings match the running server. | Drive the handshake and a turn with only generated shapes; regeneration yields no diff. | not-run | Bears on D-2. |
| `thread/compacted` and `item/tool/requestUserInput` are observable in a trace. | Force a compaction; provoke a user-input request via a tool that asks. | not-run | The two capabilities the swap exists for. |

## Outstanding verification

- Every `not-run` row above; the Phase 1 spike exists to run them before any production path moves.
  All of them are live checks under `TOPIC_SELECTION_CODEX_LIVE=1` against the product Codex home.
