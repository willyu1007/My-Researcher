# T-141 Architecture

## Context and current state

- T-140 persists an admitted first-primary CoreMotive, current version, assertions, and complete motive trace.
- The existing `evidence-board-curation` runtime supports `seed_initial_board_candidates` and returns semantic binding/gap proposals with no domain writes.
- The existing Evidence Board service owns board/binding scientific authority and enforces admitted motive, assertion ownership, trace completeness, freshness/readiness, and core assertion coverage.
- T-095 validation planning requires a current fresh, trace-complete board; T-139 truthfully blocks before it.
- T-137's real canary filled the missing board through fixed SciFact-specific script mapping; that script is evidence of the seam, not a reusable product service.

## Proposed design

### Components

- Shared handoff contracts: strict owner-root request and semantic continuation response.
- Owner/source resolver: project -> admitted primary motive/version/assertions -> accepted intake/literature/evidence lineage.
- Existing curation coordinator/runtime: initial candidate seeding only; no duplicate LLM flow.
- Conservative acceptance adapter: semantic proposals -> eligible existing binding writer DTOs, or explicit blockers.
- Trace/board composition: existing owners with deterministic ids and conflict reread.
- Thin HTTP face: `POST /paper-implementation/evidence-board-handoffs`.

### Request contract

- `implementation_project_id`
  - assigned by: T-138/Paper Implementation bootstrap owner;
  - supplied by: LLM/client;
  - consumed by: handoff owner-state resolver.
- No other request field is allowed.

### Runtime assignment

- The server assigns lane, run/execution mode, profile, model-routing key, budget, curation mode, owner refs/hashes, source/context/trace refs, and freshness policy.
- The existing model proposes binding role/scope/strength, interpretation, challenge outcome, and gaps only.
- The model cannot assign board/binding ids, hashes, authority state, trace completeness, readiness, or freshness authority.

### Deterministic admission policy

- Accept only candidates whose evidence/source/locator/citation lineage resolves to persisted owner state.
- Require `support_state=viable_binding`, `challenge_outcome=passed`, `freshness_state=fresh`, a non-blocked proposed strength, and strength at or above the target assertion's `minimum_support_level`.
- Map strength conservatively; literature-backed bindings start with reproducibility `unknown` unless persisted authority proves more.
- Require every core/must-hold assertion to have an accepted support/challenge/contradict/qualify path under the existing domain contract.
- Gap-only, stale, blocked, unresolved, or incomplete output returns a blocker and writes no board.

### Exact-once identity and recovery

- Recover an existing current eligible board before any writer/coordinator/provider work; resolve sources read-only and reconstruct citation/curation response lineage from persisted traces/runtime authority.
- Stable curation identity derives from the project id, admitted motive/version identity, accepted input snapshot/source hashes, and immutable lane/profile/prompt versions.
- Existing coordinator/runtime artifacts are the proposal/replay authority; no task-local continuation row is added.
- Board, binding, and trace ids are deterministic derivatives of the curation identity and accepted candidate identities.
- After each external or authority effect, reread the owning repository/service; unique/conflict results are reconciled against the expected lineage.
- Per-service-instance singleflight may reduce duplicate first-call provider work without coupling separate app compositions, but durable persisted owner state remains recovery authority and no distributed exact-once claim is made.

### Response contract

- `status` and `semantic_stage`: created/resumed/blocked and the current evidence-board handoff stage.
- `effects`: performed versus reused curation, trace/binding, and board effects.
- `next_action`: first executable action after owner reread.
- `blocker`: explicit owner, code, message, and retryability when progress cannot continue.
- `semantic_context`: admitted motive/assertions, accepted sources, board summary/readiness, and unresolved gaps.
- `lineage`: technical refs for trace/debug only, never echoed as command input.
- `resume_policy`: repeat the same owner-root command; completed persisted effects are reused.

### Boundaries and dependency rules

- Allowed: application service to project/intake/motive readers, existing curation coordinator/runtime, Trace Kernel, and Evidence Board owner.
- Forbidden: direct Prisma writes from route/controller/application service; direct provider calls outside the runtime; ValidationCycle/WorkOrder/Experiment Foundation/PAI/evidence closure dependencies; caller/model-authored lineage or scientific authority.

## Data migration

- Migration: none planned; existing project, intake, motive, coordinator/runtime, trace, and board persistence must be reused.
- Stop condition: if generic traceable source resolution or exact-once recovery requires a new scientific authority/schema, report the invariant gap before widening scope.

## Non-functional considerations

- Security: no credentials or cost authorization in the contract.
- Cost: at most one ordinary curation runtime for a stable owner state; no experiment or PAI.
- Observability: existing runtime telemetry plus response effects expose requested/resolved routing and performed/reused behavior.
- Robustness: persisted owner state, not `.ai/.tmp` or response chaining, is recovery authority.
- Performance: eligible-board replay performs owner reads only and no provider call; first creation uses one bounded curation lane.
