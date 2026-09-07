# Roadmap

## Scope and constraints

### In scope
- A fourth execution line `codex_cli`: the runner, its invocation contract, and its provenance shape.
- A product-owned MCP tool surface, scoped per consumer (research-role scope vs orchestration scope).
- Session and thread lifecycle rules for Codex threads created by the product.
- Runtime read/token budget enforcement inside the product's MCP server.
- Execution isolation from the developer's personal Codex installation.
- Resolution of the advisory `model_hint` field added in commit `0f5a3d39`.

### Out of scope
- Replacing or retiring the `codex_assisted` line; the operator-signed line stays as it is.
- Lighting up the dormant provider Debate path (`TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant`).
- Repointing `.ai/llm/**` OpenAI routes at gpt-6-astra; that is a separate cost-driven decision.
- A custom product UI. The Codex app is the interim conversation and progress surface.
- Auth/RBAC for the workflow-advancing tools. Recorded as a risk this task makes load-bearing, not
  as work this task closes.
- The Codex `app-server` / `exec-server` transports. Untested; a candidate follow-up if the stdio
  runner proves insufficient.

### Constraints and dependencies
- `.ai/project/registry.json` `.ideas[0]` sequences this work explicitly: productize a transport-neutral
  Codex operator adapter **after** the API-first Codex-assisted rehearsal produces concrete
  operability evidence. T-148 owns that rehearsal.
- T-148 owns the N6 Codex-assisted surface. Its Phase 3 slice TSRF-10 landed in `f829d9fe`
  (regular N6 bounded Debate), which is the surface that would have collided with this task. The
  remaining Phase 3 work (TSRF-15, TSRF-16) is promotion decision support and touches a different
  surface, so this task's additive Phase 1 no longer has to wait for all of Phase 3 — only the slice
  chosen in D-8 does.
- All Codex CLI behaviour in this bundle was measured against codex-cli 0.153.4 and is recorded in
  `probe-evidence.md`. Treat it as version-pinned evidence, not as a stable external contract.
- The product's existing pre-flight token-budget gate cannot estimate an agentic tool loop, so this
  line cannot reuse it as its budget authority.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| D-1 Where does product-driven Codex live? | (a) a fourth provider under `provider_llm`, reusing model_id/budget/pricing; (b) reuse `codex_assisted` with the product as operator; (c) its own fourth line | (c) its own line | decided | User, this session | User instruction: "把 codex CLI 单独做成一条线" | New execution mode and output source kind; contract ripple across schemas, gates and policy tables. (b) was rejected because it keeps the operator-signature authority model after removing the operator. |
| D-2 What does this line's provenance assert? | (a) hash-replayable input, forbidding Codex-side context management; (b) trace-as-evidence, accepting Codex's intra-turn management | (b) trace-as-evidence | decided | User, this session | User instruction: "如果 codex thread 可以自动管理某些内容，就让它管好了" | `prompt_packet_hash` on this line asserts product-authored input only, never what the model consumed. The line is not replayable by hash. Codex compaction inside one attempt is accepted and is not a gate condition. |
| D-3 Fate of the advisory `model_hint` (`0f5a3d39`) | (a) revert it; (b) keep it and strip it from six hash projections | (a) revert | decided | User, this session | User confirmation, 2026-09-07 | This line carries an authoritative model identity chosen by the product at invocation, so the advisory field is obsolete. Keeping it requires hint-free projections at every current and future hash site. See `verification.md` for the six confirmed sites. Removal must be a manual edit, not `git revert 0f5a3d39`: T-148's `f829d9fe` restructured the same route schema lines and carried the field forward, so a revert commit would conflict. No caller sets the field, so removal is behaviour-neutral. |
| D-4 Codex session/thread lifecycle | (a) one thread per workflow run; (b) per node; (c) per invocation attempt, ephemeral | (c) per invocation attempt | decided | User, this session | Probe: thread fork amortizes nothing; product already owns cross-round carry-over | No reuse across roles, attempts, nodes or runs. Cross-round carry-over stays product-authored through `delta_hash`, `previous_topic_question_contract_hash` and `prior_role_artifact_hashes`. Reusing a thread would open a second, unsigned carry-over channel and falsify `delta_hash`. |
| D-5 Tool surface scoping | (a) one MCP server for every consumer; (b) separate scopes per consumer | (b) separate scopes | decided | User, this session | Design consequence of the authority boundary | A research role must never reach a workflow-advancing tool. Requires attempt and role identity in the tool-call context: spawn env under stdio, a per-attempt token under Streamable HTTP. |
| D-6 How are product MCP tools authorized in non-interactive `codex exec`? | (a) `--approve-for-me`; (b) a per-server or per-tool allowlist; (c) raise upstream | (a) is the only option observed to work | open | User, plus verification against Codex documentation | Probe: `approval_policy` overrides and project trust both failed; only `--approve-for-me` completed a tool call | `--approve-for-me` loosens the sandbox from read-only to workspace-write and routes every approval through an extra `codex-auto-review` model call. If no allowlist exists, the line's isolation must come entirely from D-7. |
| D-7 Execution isolation | (a) `--ignore-user-config --ignore-rules`; (b) additionally a dedicated product-owned `CODEX_HOME` | (b) | proposed | User | Probe: the agent read `~/.codex/skills/research/SKILL.md` and changed behaviour despite `--ignore-user-config` | Without a product-owned `CODEX_HOME`, agent behaviour depends on files outside the product's control, and runs are not reproducible across machines. |
| D-8 First slice | (a) an N6 divergent-debate role; (b) an N8 bounded-debate role; (c) a non-debate node | (a) an N6 divergent-debate role, after T-148 Phase 3 lands | decided | User, this session | User confirmation, 2026-09-07 | Determines which contracts move first and which frozen fixtures are touched. |

| D-9 Which MCP revision does the product server target? | (a) only `2025-06-18`, matching Codex today; (b) `2026-07-28` with backward compatibility to `2025-06-18` | (b) | proposed | User | MCP `2026-07-28` is the current revision; Codex 0.153.4 negotiates `2025-06-18`, two revisions behind | The current revision removes protocol-level sessions and the initialize handshake, so attempt scoping must ride on a server-minted handle passed as a tool argument rather than on session or process state. Targeting only the older revision would build the tool surface on a superseded model. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Codex CLI behaviour measured at 0.153.4 (schema enforcement, usage accounting, event stream, approval handling) holds for the versions the product will run. | The runner silently loses schema enforcement or trace fidelity after a Codex upgrade. | Re-run the `probe-evidence.md` procedures on every Codex upgrade; pin the observed version in the runner's provenance. |
| A discriminating index keeps the agent from exhaustively enumerating the corpus. | Cost and latency regress toward the measured worst case (4x cost, 21x wall clock). | Server-side read budget plus the `mcp_tool_call` count recorded in every trace. |
| A human confirmation step can be carried in-flow by whatever mechanism the client supports. | The orchestration scope has no in-flow channel for the `human_actor` + `promote_reconfirmed` gate, and Phase 4 needs a separate surface. | Settled against the spec, not against Codex: MCP `2026-07-28` replaces server-initiated `elicitation/create` with Multi Round-Trip Requests, which Codex 0.153.4 does not speak. Re-check when Codex adopts a newer revision. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-148 | depends-on | T-148 owns the API-first Codex-assisted rehearsal and the N6 bounded-Debate wiring. This task consumes its operability evidence and adds a distinct execution line; it does not modify T-148's route. | The colliding N6 surface landed in `f829d9fe`. Phase 1 here is additive and may proceed; the D-8 slice must not be wired until T-148 confirms the N6 Debate contract is stable. T-148 also carried this task's `model_hint` field forward, so D-3's removal needs coordination. |

## Implementation plan

### Phase 1 — Line contract and isolation harness
- Outcome: The `codex_cli` line exists as a contract and a runnable, isolated invocation, with no node wired to it yet.
- Approach: Add the execution mode and output source kind alongside the existing three; build the runner as a thin, product-owned invocation with a dedicated `CODEX_HOME`; persist the `--json` event stream as the trace artifact.
- Planned changes:
  1. Extend `TOPIC_SELECTION_AGENT_EXECUTION_MODES` and `TOPIC_SELECTION_AGENT_OUTPUT_SOURCE_KINDS` with the new line and its provenance branch.
  2. Add the runner: a product-owned `CODEX_HOME`, `--ephemeral`, `--output-schema`, `--json`, one fresh thread per invocation attempt.
  3. Persist the event stream as the trace artifact and bind it to the invocation attempt.
  4. Resolve D-3 in the contract.
- Affected boundaries / entry points: `packages/shared/src/research-lifecycle/topic-selection-agent-invocation-contracts.ts`, the agent orchestrator, and a new runner service.
- Dependencies: T-148 Phase 3 committed; D-3, D-6, D-7 closed.
- Exit criteria: The line can execute a trivial schema-constrained invocation, its trace is persisted, and no existing line's behaviour or hashes change.
- Verification: New contract tests for the provenance branch; a runner test asserting thread-per-attempt and isolation; full existing suites unchanged.
- Recovery: The line is additive and unreferenced by any node, so reverting the commit removes it without touching the other three lines.

### Phase 2 — Research-role tool surface (provisional)
- Outcome: A product MCP server exposing a discriminating index and a batch fetch to a research-role scope only, with a server-enforced read budget.
- Approach: Derive the index fields from what the node's question actually discriminates on; enforce the budget where every call is visible.
- Exit criteria: A role invocation selects rather than enumerates, and the budget refusal is observable in the trace.
- Verification: Trace-based assertions on tool-call count and budget refusal.

### Phase 3 — One debate role end to end (provisional)
- Outcome: The slice chosen in D-8 runs on the `codex_cli` line through the existing deterministic gate.
- Exit criteria: The gate still owns admission; the artifact and trace are persisted; the other roles are unchanged.

### Phase 4 — Orchestration scope (provisional)
- Outcome: A separate tool scope for workflow visibility and gated advancement, with human confirmation preserved.
- Dependencies: The `elicitation` verification in `verification.md`, and an explicit decision on the RBAC gap.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [ ] Decisions: D-6 and D-9 are closed; D-1, D-2, D-3, D-4, D-5 and D-8 are already decided.
- [ ] Design: the line's contract, trace shape and tool-scoping boundary are settled in `02-architecture.md`.
- [ ] Route: Phase 1 is executable with exit, verification and recovery criteria, and T-148 Phase 3 is committed.
- [ ] Verification: the outstanding checks in `verification.md` are either closed or explicitly deferred with their consequence accepted.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Concurrent edits collide with T-148 on the N6 Codex-assisted surface. | `git status` shows uncommitted changes to shared route, harness or contract files. | No implementation before T-148 Phase 3 is committed; this task's opening touches only its own bundle. | Coordinate with the T-148 session; this task's Phase 1 is additive and rebases cleanly. |
| `--approve-for-me` is the only authorization route, forcing workspace-write and an extra model call per approval. | Probe result recorded in `probe-evidence.md`. | Dedicated `CODEX_HOME`, no shell-capable tools in the role scope, product-owned working directory. | Fall back to the `codex_assisted` line for that node. |
| The line costs roughly 2.5x a direct provider call even when the agent selects perfectly. | `usage` in every recorded trace. | Reserve the line for roles that genuinely need tools; keep bundle-fed roles on `provider_llm`. | Route the role back to `provider_llm`. |
| The agent enumerates the corpus instead of selecting, regressing cost and latency by 4x and 21x. | `mcp_tool_call` count in the trace exceeds the expected selection size. | Discriminating index fields plus a server-enforced read budget. | Tighten the index and lower the budget; the budget bounds the damage. |
| The "operator-only by convention, not enforcement" gap becomes load-bearing once an agent can reach workflow-advancing tools. | Review of the orchestration scope's tool list. | Keep workflow-advancing tools out of every role scope; preserve `human_actor` and `promote_reconfirmed`. | Withhold Phase 4 until the gap is closed or explicitly accepted. |

## Phase closeout

- Review: the phase's exit criteria, the trace artifacts it produced, and whether any existing line's hashes or behaviour changed.
- Record update: `01-status.md` state and next step, closed decisions in this file, and new evidence rows in `verification.md`.
- Checkpoint: a task-linked commit at each phase boundary, taken only when the full existing suites are green and foreign worktree changes are preserved.
