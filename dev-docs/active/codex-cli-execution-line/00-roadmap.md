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
- The orchestration tool scope — workflow visibility and gated advancement for the researcher-facing
  surface. It is a separate outcome with its own lifecycle and its own external dependency: in-flow
  human confirmation belongs to the Multi Round-Trip Requests pattern, which no released Codex
  speaks. This task proves scope enforcement with a negative test instead of by building a second
  scope.
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
| D-6 How are product MCP tools authorized in non-interactive `codex exec`? | (a) `--approve-for-me`; (b) a per-server approval mode under a granular approval policy | (b) | decided | Empirical probe, 2026-09-08 | `approval_policy = { granular = { sandbox_approval, rules, mcp_elicitations } }` plus `mcp_servers.<name>.default_tools_approval_mode = "approve"` completed a tool call under `-s read-only` with no `--approve-for-me` | Strictly better than (a) on three axes: the sandbox stays read-only, no `codex-auto-review` call is added per approval, and the grant is scoped to one named server. Note the working value is `approve`, not `auto`; `auto` was observed to fail. |
| D-7 Execution isolation | (a) `--ignore-user-config --ignore-rules`; (b) additionally a dedicated product-owned `CODEX_HOME` | (b) | decided | User, 2026-09-08 | Probe: the agent read `~/.codex/skills/research/SKILL.md` and changed behaviour despite `--ignore-user-config` | Without a product-owned `CODEX_HOME`, agent behaviour depends on files outside the product's control, and runs are not reproducible across machines. |
| D-8 First slice | (a) an N6 divergent-debate role; (b) an N8 bounded-debate role; (c) a non-debate node | (a) an N6 divergent-debate role, after T-148 Phase 3 lands | decided | User, this session | User confirmation, 2026-09-07 | Determines which contracts move first and which frozen fixtures are touched. |

| D-9 Which MCP revision does the product server target? | (a) only `2025-06-18`, matching Codex today; (b) `2026-07-28` with backward compatibility; (c) `2026-07-28` only | (b) `2026-07-28` natively, plus a removable compatibility shim | decided | User, 2026-09-08 | User instruction, after the consequence of a no-compatibility target was recorded | The server's own model is the current revision: stateless, `server/discover`, per-request version in `_meta`, and attempt scoping on a server-minted handle passed as a tool argument. The shim exists only to accept the `initialize` / `notifications/initialized` handshake from revisions Codex still speaks — 0.153.4 is the latest published build as of 2026-09-08 and negotiates `2025-06-18` — and maps those requests onto the same tool implementations. The shim **must not** reintroduce session state; handles are ordinary tool arguments and work unchanged in either revision. Remove the shim once the Codex build the product runs negotiates `2026-07-28`. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| Codex CLI behaviour measured at 0.153.4 (schema enforcement, usage accounting, event stream, approval handling) holds for the versions the product will run. | The runner silently loses schema enforcement or trace fidelity after a Codex upgrade. | Re-run the `probe-evidence.md` procedures on every Codex upgrade; pin the observed version in the runner's provenance. |
| A discriminating index keeps the agent from exhaustively enumerating the corpus. | Cost and latency regress toward the measured worst case (4x cost, 21x wall clock). | Server-side read budget plus the `mcp_tool_call` count recorded in every trace. |
| A human confirmation step can be carried in-flow by whatever mechanism the client supports. | The orchestration scope has no in-flow channel for the `human_actor` + `promote_reconfirmed` gate, and Phase 4 needs a separate surface. | Settled against the spec, not against Codex: MCP `2026-07-28` replaces server-initiated `elicitation/create` with Multi Round-Trip Requests, which Codex 0.153.4 does not speak. Re-check when Codex adopts a newer revision. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-148 | depends-on | T-148 owns the API-first Codex-assisted rehearsal and the N6 bounded-Debate wiring. This task consumes its operability evidence and adds a distinct execution line; it does not modify T-148's route. | The N6 surface this task wires against settled in `f829d9fe`, and T-148's remaining Phase 3 work is on the v1c promotion surface. Both tasks share this worktree, so stage explicit paths. T-148 carried this task's `model_hint` field forward when it restructured the route schema, which is why D-3's removal is a manual edit. |

## Implementation plan

### Phase 1 — The line exists and runs in isolation
- Outcome: `codex_cli` is a first-class execution line with its own provenance branch and an
  isolated, schema-constrained, traced runner. No node is wired to it, so nothing in the product
  changes behaviour yet.
- Approach: clear the obsolete advisory field first so the contract is not extended around
  something being removed, then add the line beside the existing three, then build the runner as a
  thin product-owned invocation whose only outputs are the artifact and the trace.
- Planned changes:
  1. Remove `model_hint` and its test by hand — not `git revert 0f5a3d39`, whose lines T-148's
     `f829d9fe` has since restructured. No caller sets the field, so the change is behaviour-neutral.
  2. Add the execution mode and output source kind, with a provenance branch that carries an
     authoritative model identity and the Codex runner version, and no gateway model-option or
     normalized-parameter identity.
  3. Build the runner: a product-owned `CODEX_HOME` holding the granular approval policy and the
     per-server `approve` mode, plus `--ephemeral`, `--output-schema`, `--json`, and one fresh
     thread per invocation attempt.
  4. Persist the event stream as the trace artifact bound to the invocation attempt, and record the
     `usage` totals with it.
- Affected boundaries / entry points: the shared agent-invocation contracts, the agent
  orchestrator's source-kind branch, and a new runner service.
- Dependencies: none. This phase is additive and does not touch the N6 surface T-148 owns.
- Exit criteria: a trivial schema-constrained invocation completes through the line, its trace and
  usage persist against the attempt, and no other line's behaviour or recorded hashes change.
- Verification: contract tests for the new provenance branch; a runner test asserting a distinct
  thread per attempt and a product-owned `CODEX_HOME`; the existing suites unchanged, which is also
  the regression check for the `model_hint` removal.
- Recovery: the line is unreferenced by any node, so reverting the phase removes it without touching
  the other three lines.
- Phase progress: complete and deterministically verified. `model_hint` is gone (`43adb231`); the
  execution mode, output source kind and provenance branch are in (`fc8c63b2`); the runner and its
  deployment configuration are in (`3936f10b`); the orchestrator branch persists the trace as the
  provenance of record on success and on failure alike. `runner_version` is read from the binary
  that actually ran rather than declared, so it cannot drift from reality. Two latent problems
  surfaced and were fixed on the way: a hardcoded execution-mode allowlist in the orchestrator that
  had drifted from the enum beside it, and a stale committed SlotParameterManifest snapshot. The
  line is inert — no profile admits it and no node routes to it, which a test pins. The live check
  passed on 2026-09-08 against a product-owned authenticated `CODEX_HOME`, and it surfaced one more
  defect worth having found that way: the runner left a schema file per invocation in a long-lived
  directory. Phase 1 is complete.

### Phase 2 — A scoped, budgeted tool surface Codex can actually reach
- Outcome: a research-role tool scope that an agent can use to select rather than enumerate, that
  refuses work outside its attempt's scope, that stops at a server-enforced budget, and that today's
  Codex can connect to.
- Approach: serve MCP from the backend over HTTP rather than from a spawned stdio subprocess. A
  probe confirmed Codex connects to a `url`-configured MCP server, which means the tool surface can
  reach the product's own repositories directly instead of a subprocess needing its own database
  access. Implement the current MCP revision natively and confine the older-revision handshake to a
  shim at the transport edge, sharing one tool implementation between both paths. Carry attempt and
  role scope in a server-minted handle passed as an ordinary tool argument, which is what makes the
  same tool correct on either path.

  Two mechanics the probe pinned down: Codex health-checks `GET /health` at the endpoint's origin
  and will not initialize until that returns 200, and it holds a `GET` stream open on the endpoint
  for server-to-client notifications. Both are easy to miss and present as an unexplained hang.
- Planned changes:
  1. The server core on revision `2026-07-28`, served over HTTP by the backend: `server/discover`,
     per-request version and capabilities in `_meta`, no session state, plus the origin health
     endpoint Codex requires.
  0. Teach the runner's generated config the `url` server form alongside the existing command form.
  2. The compatibility shim: accept the `initialize` handshake, translate the request envelope, and
     dispatch into the same tool implementations.
  3. Two research-role tools — a discriminating index and a batch fetch — where the index carries
     the fields the node's question actually discriminates on.
  4. Handle-based scope enforcement and a read budget refused by the server, both surfaced in the
     trace.
- Affected boundaries / entry points: a new MCP server package, and the runner's server wiring.
- Dependencies: Phase 1's runner and trace.
- Exit criteria: an invocation selects a bounded set instead of reading the corpus; a budget refusal
  appears in the trace; a handle is refused a tool outside its scope; and one tool returns identical
  results and recorded scope natively and through the shim.
- Verification: trace-based assertions on tool-call count, budget refusal and scope refusal; the
  native-versus-shim equivalence check named in `verification.md`.
- Recovery: the surface is only reachable from the new line, so it can be withdrawn without
  affecting the other three.

### Phase 3 — One debate role runs on the line
- Outcome: the D-8 slice — one N6 divergent-debate role — produces its artifact through the
  `codex_cli` line, admitted by the existing deterministic gate.
- Approach: swap the single role's source while leaving its siblings and the gate untouched, so the
  comparison against the previous line is direct.
- Planned changes:
  1. Route the chosen role's invocation through the new line, leaving the other roles as they are.
  2. Record the run's cost and tool-call trace alongside the artifact.
- Affected boundaries / entry points: the N6 divergent-debate runtime's role invocation path.
- Dependencies: Phase 2. The N6 Debate contract this phase wires against settled in T-148's
  `f829d9fe`; T-148's remaining Phase 3 work is on the v1c promotion surface and does not touch it.
- Exit criteria: the deterministic gate still owns admission; the artifact and its trace persist;
  the untouched roles produce unchanged results; and the run's cost is recorded for comparison with
  the bundle-fed path.
- Verification: the node's existing gate and admission tests, plus a new assertion that the role's
  provenance carries the line's model identity and its trace.
- Recovery: route the role back to its previous line; the line and its tool surface remain, unused.

## Kickoff gate

- Status: ready
- Authorized boundary: through phase 2
- [x] Decisions: D-1 through D-9 are all decided; no user-owned choice blocks implementation.
- [x] Design: the line's contract, trace shape, session rule, handle-based scoping and shim boundary are settled in `02-architecture.md`.
- [x] Route: three phases reach the goal; Phase 1 is executable and dependency-free, and each phase carries exit, verification and recovery criteria.
- [x] Verification: every phase's checks are identified in `verification.md`, and the remaining open items are external dependencies with recorded consequences, not blockers on Phase 1.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Concurrent edits collide with T-148 on the N6 Codex-assisted surface. | `git status` shows uncommitted changes to shared route, harness or contract files. | No implementation before T-148 Phase 3 is committed; this task's opening touches only its own bundle. | Coordinate with the T-148 session; this task's Phase 1 is additive and rebases cleanly. |
| The compatibility shim leaks handshake-era assumptions into the server, for example by holding per-connection state that the stateless core forbids. | Review that every tool implementation reads its scope from the request's handle argument, never from connection or process state; the same tool must behave identically through the shim and natively. | Keep the shim at the transport edge: it translates the handshake and request envelope only, and shares one tool implementation with the native path. | Delete the shim; the native path is unaffected because it never depended on it. |
| The line costs roughly 2.5x a direct provider call even when the agent selects perfectly. | `usage` in every recorded trace. | Reserve the line for roles that genuinely need tools; keep bundle-fed roles on `provider_llm`. | Route the role back to `provider_llm`. |
| The agent enumerates the corpus instead of selecting, regressing cost and latency by 4x and 21x. | `mcp_tool_call` count in the trace exceeds the expected selection size. | Discriminating index fields plus a server-enforced read budget. | Tighten the index and lower the budget; the budget bounds the damage. |
| The "operator-only by convention, not enforcement" gap becomes load-bearing once an agent can reach workflow-advancing tools. | Review of the orchestration scope's tool list. | Keep workflow-advancing tools out of every role scope; preserve `human_actor` and `promote_reconfirmed`. | Withhold Phase 4 until the gap is closed or explicitly accepted. |

## Phase closeout

- Review: the phase's exit criteria, the trace artifacts it produced, and whether any existing line's hashes or behaviour changed.
- Record update: `01-status.md` state and next step, closed decisions in this file, and new evidence rows in `verification.md`.
- Checkpoint: a task-linked commit at each phase boundary, taken only when the full existing suites are green and foreign worktree changes are preserved.
