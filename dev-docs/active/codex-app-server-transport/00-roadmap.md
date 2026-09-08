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
| D-3 Session rule in thread terms | `thread/start` per invocation attempt, closed with the attempt in a finally; never `thread/resume` or `thread/fork` across attempts | as stated | proposed | User, inheriting T-151 D-4 | Test pinning no cross-attempt reuse | Keeps `delta_hash` and `prior_role_artifact_hashes` as the only cross-round carry-over. Whether close means archive or delete is a spike question. |
| D-4 `requestUserInput` and elicitation in this task | (a) record in the trace and refuse by policy; (b) plumb to the product now | (a) | proposed | User | Trace shows the request and the policy answer | (b) is the orchestration follow-up; (a) proves the channel exists without building a surface around it. |
| D-5 Compaction | (a) allow, record `thread/compacted` in the trace; (b) disable or fail the attempt | (a) | proposed | User, inheriting T-151 D-2 | Trace shows the event | T-151 already accepts intra-attempt compaction; the App Server makes it visible, which `exec --json` never did. |
| D-6 The `codex exec` path during transition | (a) keep it selectable by an environment switch with a recorded exit; (b) delete it in the same change | (a) | proposed | User | Exit recorded before completion | The completion contract forbids an unrecorded dual path; (a) needs its removal scheduled, (b) has no fallback if the experimental server regresses. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The App Server enforces an output schema per turn the way `exec --output-schema` does. | Schema enforcement moves product-side and the first Done-when item weakens. | Spike: drive one turn with the T-151 live-smoke schema and demand the same three violations. |
| The App Server's `turn/completed` usage and `thread/tokenUsage/updated` carry the same five fields the trace records today. | Cost accounting changes shape. | Spike: compare against the `exec --json` usage object. |
| `codex app-server generate-ts` emits bindings that match what the same binary actually speaks. | Generated types drift from the binary despite coming from it. | The spike drives a turn with the generated bindings; the regeneration check runs against the installed binary. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-151 | derived-from | T-151 (archived) owns the line's contract, provenance branch, tool surface and decisions; this task changes only the runner's transport. | Any need to change the contract or tool surface reopens a decision rather than being absorbed here. |
| T-148 | sibling | No contract overlap; shared worktree only. | Stage explicit paths. |

## Implementation plan

### Phase 1 — Spike: what the App Server actually gives a product runner
- Outcome: one real turn driven end to end through a dedicated `codex app-server` child from a
  product-owned `CODEX_HOME`, with generated types at the pinned version, and a written comparison
  of what `exec --json` gave the trace against what the App Server gives.
- Approach: reproduce the t3code client's spawn and handshake in the smallest form, then answer the
  three assumptions above and the D-3 close semantics before any runner code moves.
- Planned changes:
  1. Generate protocol types from the installed binary (`codex app-server generate-ts`) and record
     the binary version they came from.
  2. A spike client that starts the server, opens a thread, runs one turn with an output schema
     and one MCP server, and captures every notification.
  3. Record the answers to the schema, usage and thread-close questions in `verification.md`.
- Affected boundaries / entry points: a new generated-types module and a spike under the backend
  test tree; no production path changes.
- Dependencies: the product Codex home already provisioned for T-151's live checks.
- Exit criteria: the three assumptions are each confirmed or refuted with evidence, and D-1 through
  D-6 are closable.
- Verification: a live-gated spike run under `TOPIC_SELECTION_CODEX_LIVE=1`.
- Recovery: the spike is additive and touches no production path; deleting it restores the tree.

### Phase 2 — Runner swap behind a switch (provisional)
- Outcome: the runner drives the App Server when configured, builds the trace from its events,
  records the thread id, and the four existing live checks pass unchanged.
- Exit criteria: live checks green on the App Server path; D-3 pinned by a test; the `exec` path
  still selectable per D-6.

### Phase 3 — Capability proofs and transition exit (provisional)
- Outcome: compaction and `requestUserInput` observed and governed in the trace; usage and
  rate-limit reads recorded; the `exec` path's exit executed or explicitly rescheduled.
- Exit criteria: the last two Done-when items hold; no unrecorded dual path remains.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [ ] Decisions: D-1 and D-2 are decided; D-3 through D-6 are confirmed or explicitly deferred to the spike.
- [ ] Design: the process model, type generation and trace mapping are settled in `02-architecture.md`.
- [ ] Route: Phase 1 is executable with exit, verification and recovery criteria.
- [ ] Verification: the spike's checks are identified in `verification.md`.

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
