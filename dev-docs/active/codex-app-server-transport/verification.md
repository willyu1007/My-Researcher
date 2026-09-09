# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| The installed binary emits its own protocol bindings, pinned and drift-checked. | `node apps/backend/scripts/codex-app-server-bindings-generate.mjs --check`. | pass (2026-09-09) | 707 files from `generate-ts` on codex-cli 0.153.4, deterministic across runs; `codex-version.ts` records the binary. Backend typecheck passes with the tree included. |
| `turn/start.outputSchema` enforces the final message per turn. | Spike case 1: the T-151 violation prompt against the T-151 schema. | pass (2026-09-09) | verdict ∈ enum, confidence within range, no extra key. Enforcement stays in the transport. |
| `initialize` proves which home the server runs from. | Spike case 1: `initialize.codexHome` equals the product home. | pass (2026-09-09) | `/Users/…/.codex-my-researcher`; `userAgent` carries the client name and the binary version. |
| `thread/start.config` reaches the product MCP endpoint. | Spike case 2: a turn that must call `list_evidence` over HTTP. | pass (2026-09-09) | Nested `config.mcp_servers.research.{url, default_tools_approval_mode}`; `list_evidence` then `read_evidence`, 3 durable ids cited, zero server requests. |
| Usage fields per turn. | Spike cases 1–2: `thread/tokenUsage/updated`. | observed (2026-09-09) | One update per model round trip (1 without tools, 4 with); case 1: 14 770 in / 187 out (163 reasoning), `modelContextWindow` 258 400; case 2: 61 001 in of which 30 080 cached. |
| A dedicated child serves concurrent threads. | Spike case 3: two threads, two turns started together. | pass (2026-09-09) | Both turns started in the same millisecond and completed 2 s apart; each collector saw only its own thread. |
| Closing a thread: archive versus delete. | Spike case 3: archive one, delete the other, unsubscribe, then `thread/loaded/list`, `thread/list`, home directory. | answered (2026-09-09) | Ephemeral threads: archive → "no rollout found", delete → "thread is not persisted", unsubscribe → `unsubscribed`; both stay loaded; `thread/list` empty either way; the home gained only `memories_1.sqlite-{shm,wal}`. |
| The child exits cleanly. | Spike: end stdin, wait. | pass (2026-09-09) | Exit code 0 within the grace period in all three cases. |
| Granular approval needs a capability the schema does not express. | Spike, first run. | observed (2026-09-09) | `thread/start` → -32600 "askForApproval.granular requires experimentalApi capability" until `initialize.capabilities.experimentalApi = true`. |
| The runner drives the App Server and the four T-151 live checks pass unchanged. | `TOPIC_SELECTION_CODEX_TRANSPORT=app_server` with the three T-151 live files under `TOPIC_SELECTION_CODEX_LIVE=1`. | pass (2026-09-09) | Schema smoke 14.5 s; MCP selection `list_evidence` → `read_evidence`, 3 durable ids cited; budget refusal served 1/1 (`read_evidence` failed then completed); canary through the orchestrator landed a 15-event trace (1 041 before streaming deltas were dropped). |
| D-3 pinned: one ephemeral thread per attempt, unsubscribed with it, no resume or fork; the child recycles after the bound without cutting an in-flight attempt. | `topic-selection-codex-cli-runner-service.unit.test.ts` (App Server section) with a scripted session. | pass (2026-09-09) | Also pins outcome mapping (usage, tool calls, final message, trace without deltas), the four failure mappings with partial traces, and the transport switch parsing. |
| The client's framing, policy answers, death mid-turn and timeout hold over real pipes. | `topic-selection-codex-app-server-client.unit.test.ts` against `test-fixtures/codex-app-server-fake.mjs`. | pass (2026-09-09) | `item/tool/requestUserInput` is declined with `{answers: {}}` and the decline is echoed back by the fake; an exit mid-turn rejects the turn and every later request; a timeout sends `turn/interrupt` and carries the partial collection. |
| `thread/compacted` and `item/tool/requestUserInput` are observable in a trace. | Force a compaction with `thread/compact/start`; provoke a user-input request. | not-run | Phase 3. No server request of any kind fired in the spike, so provoking one is the open question. |

## Outstanding verification

- Phase 3: the `not-run` row above, under `TOPIC_SELECTION_CODEX_LIVE=1`, and the `exec` exit.
- Every live row was run once against the product home; the spike test file reruns them all:
  `TOPIC_SELECTION_CODEX_LIVE=1 … node --test --import tsx src/services/topic-selection-codex-app-server.live.test.ts`.
