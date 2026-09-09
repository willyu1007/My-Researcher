# Roadmap

## Scope and constraints

### In scope
- Replace the runner's transport: a Codex App Server driven over JSON-RPC instead of `codex exec`
  per invocation. The swap is contained to the runner and its deployment and live-check wiring.
- Map the T-151 session rule onto explicit thread lifecycle.
- Generate protocol types from the upstream schema and pin them to the running Codex version.
- Build the trace from App Server events, including token usage and account rate-limit reads.
- Make `thread/compacted` and `item/tool/requestUserInput` observable and governed by product
  policy in the trace.

### Out of scope
- The orchestration tool scope and any product UI for answering a Codex question. This task makes
  the human-confirmation channel observable and refusable by policy; plumbing it to a researcher is
  the orchestration follow-up.
- Routing a real research node to the line; that waits on the `calibration_gate_release` sign-off.
- Any change to the `codex_cli_response` contract, the MCP tool surface, or the `codex_assisted`
  line.
- Attaching to the developer's shared local app-server daemon or remote control.

### Constraints and dependencies
- `codex app-server` is marked `[experimental]` in codex-cli 0.153.4. The sibling project
  `/Volumes/DataDisk/Project/_miscellaneous/t3code/packages/effect-codex-app-server` is the reference
  implementation: it spawns the server, speaks bidirectional JSON-RPC over stdio, and generates its
  types from `openai/codex` `codex-rs/app-server-protocol` (`scripts/generate.ts`).
- The archived T-151 decisions are inherited, in particular D-2 (trace as evidence, not hash
  replay) and D-4 (one fresh thread per attempt, no cross-attempt reuse, cross-round carry-over
  stays product-authored). Product owner state, not conversation history, remains the research
  authority.
- Live truth for the current line: `docs/context/process/codex-cli-execution-line.md` and
  `dev-docs/archive/codex-cli-execution-line/summary.md`.
- T-148 shares this worktree; stage explicit paths only.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| D-1 Process model | (a) a dedicated `codex app-server` child per backend process over its default `stdio://`, product-owned `CODEX_HOME`; (b) a dedicated child on `--listen unix://PATH` shared by backend workers; (c) attach to the shared local daemon (`app-server daemon`) | (a) | decided | User, 2026-09-09 | User confirmation; the spike still has to show the child serves concurrent threads | (c) would share the developer's sessions and sit outside the product's isolation boundary; (b) is only worth it with multiple backend processes; (a) adds a long-lived child the backend must supervise. |
| D-2 Protocol types | (a) generate from the installed binary with `codex app-server generate-ts` / `generate-json-schema`; (b) fetch the upstream `app-server-protocol` schema as t3code does; (c) hand-write the subset used | (a) | decided | User, 2026-09-09 | User confirmation; the regeneration check is built in Phase 1 | (a) pins to exactly the binary that runs, with no network fetch and no version guessing; (b) needs a version mapping; (c) is smaller and drifts silently against an experimental protocol. |
| D-3 Session rule in thread terms | `thread/start` per invocation attempt, closed with the attempt in a finally; never `thread/resume` or `thread/fork` across attempts | As stated, with the close being `thread/unsubscribe`: the thread is `ephemeral`, so it has no rollout and neither `thread/archive` nor `thread/delete` applies (both return -32600). An unsubscribed ephemeral thread stays in `thread/loaded/list` until the child exits, so the runner recycles the child after a bounded number of attempts. | decided | Spike evidence, 2026-09-09 | Spike case 3: archive → "no rollout found", delete → "thread is not persisted", unsubscribe → `unsubscribed`; `thread/list` never shows ephemeral threads. | Keeps `delta_hash` and `prior_role_artifact_hashes` as the only cross-round carry-over. Memory of finished threads is bounded by the recycle count, not by a close call. |
| D-4 `requestUserInput` and elicitation in this task | (a) record in the trace and refuse by policy; (b) plumb to the product now | (a) | decided | Spike evidence, 2026-09-09 | The client answers every server request by policy (`answerServerRequestByPolicy`) and exposes the answer to the trace; no request fired in the spike, so Phase 3 provokes one. | (b) is the orchestration follow-up; (a) proves the channel exists without building a surface around it. |
| D-5 Compaction | (a) allow, record `thread/compacted` in the trace; (b) disable or fail the attempt | (a) | decided | Spike evidence, 2026-09-09 | The binding carries `thread/compacted` (`ContextCompactedNotification`, deprecated in favour of the `contextCompaction` item) and `thread/compact/start` can force one; Phase 3 records it in a trace. | T-151 already accepts intra-attempt compaction; the App Server makes it visible, which `exec --json` never did. |
| D-6 The `codex exec` path during transition | (a) keep it selectable by an environment switch with a recorded exit; (b) delete it in the same change | (a) | decided | User direction at planning; nothing in the spike argues against it | Exit recorded before completion | The completion contract forbids an unrecorded dual path; (a) needs its removal scheduled, (b) has no fallback if the experimental server regresses. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| `turn/start.outputSchema` enforces the final message the way `exec --output-schema` does. | Schema enforcement moves product-side and the first Done-when item weakens. | Held (spike case 1, 2026-09-09): the three requested violations were all blocked. |
| `thread/start.config` accepts `mcp_servers` overrides in the shape the runner already emits as `-c`. | The product tool surface is unreachable from a thread. | Held (spike case 2): the nested object `{ mcp_servers: { research: { url, default_tools_approval_mode: "approve" } } }` reached the product endpoint; `list_evidence` then `read_evidence`, no approval request. |
| The bindings the binary emits match what the same binary speaks. | Generated types drift from the running server despite coming from it. | Held (all cases drive the handshake and turns through generated shapes only), with one gate the schema does not express: `askForApproval.granular` needs `initialize.capabilities.experimentalApi = true`, otherwise `thread/start` returns -32600. |
| Closing a thread is `thread/archive` or `thread/delete`. | The wrong choice keeps threads recoverable, or destroys a trace source before it is persisted. | Refuted (spike case 3): an ephemeral thread has no rollout, so neither applies; `thread/unsubscribe` is the close and the loaded thread lives until the child exits. Folded into D-3. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-151 | derived-from | T-151 (archived) owns the line's contract, provenance branch, tool surface and decisions; this task changes only the runner's transport. | Any need to change the contract or tool surface reopens a decision rather than being absorbed here. |
| T-148 | sibling | No contract overlap; shared worktree only. | Stage explicit paths. |

## Implementation plan

### Phase 1 — Spike: what the App Server actually gives a product runner (done 2026-09-09)
- Outcome: one real turn driven end to end through a dedicated `codex app-server` child from the
  product-owned `CODEX_HOME`, using only bindings generated from that binary, with the four
  assumptions above answered by evidence and a written mapping of `exec --json` events to App
  Server notifications for the trace.
- Approach: reproduce the smallest possible client — newline-delimited JSON-RPC over the child's
  stdio, the `initialize` / `initialized` handshake, then `thread/start` → `turn/start` →
  notifications until `turn/completed` — and keep it under the backend test tree as a live-gated
  spike, not a production path. Answer server requests by refusing, so the spike cannot hang.
- Planned changes:
  1. A generation script that runs `codex app-server generate-ts` for the installed binary (the
     JSON-schema form has no consumer), records that binary's version beside the output, and a
     check that regenerating yields no diff.
  2. A spike client: spawn `codex app-server` (default `stdio://`) with `CODEX_HOME` set to the
     product home and the same minimal environment the runner uses; `initialize` with
     `clientInfo`, and record the response's `codexHome` as the isolation proof; `thread/start` with
     `cwd`, `model`, `approvalPolicy` (granular), `sandbox: read-only`, `ephemeral`, and `config`
     carrying the product MCP server; `turn/start` with `input`, `outputSchema` and `effort`;
     collect every notification until `turn/completed`; then close the thread.
  3. Three live-gated cases on that client: the schema-violation prompt from the T-151 smoke; a
     turn that must call the product's `list_evidence`; and two concurrent threads on one child.
     Close one thread with `thread/archive` and the other with `thread/delete`, then observe
     `thread/list` and the home directory.
  4. Record in `verification.md`: whether the schema was enforced, the `TokenUsageBreakdown` values
     seen per turn, which close removes the thread, and which notifications carry what the trace
     needs (`item/*`, `item/mcpToolCall/progress`, `thread/tokenUsage/updated`,
     `thread/compacted`, `turn/completed.turn.status`).
- Affected boundaries / entry points: a new generated-bindings directory with its generation
  script, and a spike under `apps/backend/src/services/` gated on `TOPIC_SELECTION_CODEX_LIVE=1`.
  No production path changes.
- Dependencies: the product Codex home provisioned for T-151 (`~/.codex-my-researcher`).
- Exit criteria: the four assumptions each hold or are refuted with evidence; the trace mapping is
  written; D-3 through D-6 are closable on that evidence.
- Verification: the three live-gated cases plus the regeneration check.
- Recovery: everything is additive and unreachable from production; deleting the spike and the
  bindings restores the tree.

### Phase 2 — Runner swap behind a switch
- Outcome: the runner drives the App Server when configured, builds the trace from its events,
  records the thread id and the `initialize` response's `codexHome`, and the four existing live
  checks pass unchanged.
- Approach: the runner keeps its outcome shape and gains a transport choice. On the App Server
  path it holds one client per service instance (spawned on first use from the product home with
  `experimentalApi`), and per attempt does `thread/start` (`ephemeral`, granular no-approvals,
  `read-only`, `config.mcp_servers` from the attempt's servers) → `runTurn` (`input`,
  `outputSchema`, `effort`) → `thread/unsubscribe` in a finally; the client is recycled after a
  bounded number of attempts (D-3) and on any exit. Trace events are the turn's notifications
  plus answered server requests; `usage` maps from the last `thread/tokenUsage/updated.total`,
  tool calls from completed `mcpToolCall` items, the final message from the last completed
  `agentMessage` item, the outcome from `turn/completed.turn.status` / `turn.error`.
- Planned changes:
  1. Runner: an App Server path selected by `TOPIC_SELECTION_CODEX_TRANSPORT=app_server` (D-6;
     `exec` stays the default until the exit), sharing the failure codes and outcome shape.
  2. Client injection so unit tests run without Codex: the transport's child becomes injectable,
     with a scripted fake child for framing, policy answers, exit-during-turn and timeout.
  3. A test pinning D-3: two attempts on one runner start two threads, neither resumes or forks.
  4. Trace: `topic-selection-codex-cli-trace-v1` gains `codex_home` and `transport`; the
     `events` array carries the notifications.
  5. Deployment and process doc: the new variable and the recycle bound recorded in
     `docs/context/process/codex-cli-execution-line.md`.
- Exit criteria: the four T-151 live checks green on the App Server path with assertions
  unchanged; D-3 pinned by a test; the `exec` path still selectable; `codexHome` in every trace.
- Verification: the T-151 live checks under `TOPIC_SELECTION_CODEX_TRANSPORT=app_server`, plus
  the new unit tests in the default suite.
- Recovery: the switch defaults to `exec`; removing the App Server branch restores Phase 1.

### Phase 3 — Capability proofs and transition exit (provisional)
- Outcome: compaction and `requestUserInput` observed and governed in the trace; usage and
  rate-limit reads recorded; the `exec` path's exit executed or explicitly rescheduled.
- Approach: force a compaction with `thread/compact/start` on a live thread and assert the
  `thread/compacted` event (or `contextCompaction` item) lands in the trace; provoke a
  `item/tool/requestUserInput` (the `request_user_input` tool is experimental — the spike saw no
  server request at all, so this needs its enabling switch found first) and assert the trace shows
  the request and the policy answer; record `account/rateLimits/read` per attempt.
- Exit criteria: the last two Done-when items hold; no unrecorded dual path remains.

## Kickoff gate

- Status: ready
- Authorized boundary: complete task
- [x] Decisions: D-1 and D-2 are decided; D-3 through D-6 are explicitly deferred to the spike, which is built to close them.
- [x] Design: the process model, type generation, invocation mapping and trace mapping are settled in `02-architecture.md` at the level the installed binary's schema supports.
- [x] Route: Phase 1 is executable with named methods, exit, verification and recovery criteria.
- [x] Verification: the spike's checks are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| The experimental protocol changes between Codex releases. | The regeneration check yields a diff, or the handshake fails on upgrade. | Generated types pinned to the installed version; live checks re-run after any Codex upgrade. | Keep the `exec` path selectable until the exit in D-6 is executed. |
| The App Server does not enforce an output schema per turn. | Spike. | Enforce the schema product-side against the same normalised schema the gateway uses. | Record the weaker guarantee in the line's process doc. |
| A long-lived child crashes or leaks threads across attempts. | Supervision logs; a test that a crashed server fails the attempt rather than hanging it. | Restart on demand; close every thread in a finally; never reuse a thread. | Fall back to `exec` for the attempt. |
| The product accidentally attaches to the developer's shared daemon. | `CODEX_HOME` and process ancestry recorded in the trace. | D-1: always spawn a dedicated child from the product home. | Kill and respawn from the product home. |

## Phase closeout

- Review: each phase's exit criteria and whether the line's contract or tool surface was touched.
- Record update: `01-status.md` state and next step, closed decisions here, evidence rows in `verification.md`.
- Checkpoint: a task-linked commit per phase boundary, taken only with the full suites green and foreign worktree changes preserved.
