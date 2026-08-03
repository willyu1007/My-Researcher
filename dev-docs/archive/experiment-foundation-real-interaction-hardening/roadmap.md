# T-106 Roadmap

## Decision Points

| Decision | Status | Question | Options | Confirmed / Recommended Default | Why |
| --- | --- | --- | --- | --- | --- |
| D1 Scope shape | Confirmed | Should hardening be one task or multiple child tasks? | One task with phase gates; split child tasks after findings | One task with phase gates | The first value is discovering the real risk map. Splitting too early may duplicate fixtures and runner contracts. |
| D2 External canary depth | Confirmed | How real should the external lane be? | Gate-only; local fake provider; true opt-in cloud canary | Default `gate-only` plus `local fake provider`; true cloud canary as first-class explicit opt-in lane | The default suite must stay safe, but T-106 must be able to verify real external connectivity and a minimum real submit/sync/collect/result/evidence flow when the environment is explicitly configured. |
| D3 UI E2E depth | Confirmed | What UI proof is enough? | Define-only; route render only; user-like workbench flow; broad visual suite | Define the user-like workbench flow and acceptance contract first; defer implementation | T-106 needs a clear UI proof target, but early hardening should not be blocked by full UI automation. The risk is renderer/backend semantic drift, not visual polish. |
| D4 LocalScript depth | Confirmed | How hard should local execution be tested? | Smoke only; robustness matrix; stress/load | Deterministic robustness matrix; no stress/load by default | Process lifecycle, path containment, timeout, cancellation, idempotency, and collection failures are the high-risk areas. Broad stress testing would add flake before the execution contract is hardened. |
| D5 Cross-flow owner | Confirmed | Where do paper/implementation bridge tests live? | Experiment-only; bridge-only; seam tests in T-106 | Seam tests in T-106; split product bridge work only if a concrete capability gap appears | T-106 should prove refs and sidecars cross boundaries without moving ownership or redefining PaperImplementation behavior. |
| D6 Persistence scope | Confirmed | How much real DB validation is required? | Memory only; disposable local schema; long-running DB stress | Memory plus disposable local Postgres schema; no long-running DB stress by default | The goal is a usable tool that paper-implementation automation can hand off to smoothly. Memory and disposable DB paths must prove the same automation-facing behavior without mutating the developer's normal schema. |
| D7 Runner integration | Confirmed | Should T-106 become part of T-103 immediately? | Separate command; T-103 hardening lane; both | Separate hardening command first, then hook into T-103 after the command contract is stable | Keeps T-103 as the standard full-flow runner while T-106 hardening lanes iterate without polluting the stable closure path. |
| D8 Real-data policy | Confirmed | What fixtures are acceptable? | Synthetic only; controlled local real fixtures; checked-in sample data | Synthetic deterministic fixtures by default; controlled local real fixtures and true external samples only through explicit opt-in | Reproducibility and redaction define the default suite. Realism is allowed only when it does not commit raw datasets, model weights, checkpoints, credentials, raw logs, or unredacted external payloads. |

## Phase Roadmap

### Phase 1: Hardening Matrix And Fixture Inventory
- Freeze the function-by-function matrix across contracts, backend, DB, desktop, LocalScript, mocked/cloud external boundary, and adjacent workflows.
- Identify reusable fixture builders and which scenarios must run with memory repositories versus disposable Postgres.
- Produce skip/pass/block semantics for each lane.
- Classify fixtures as synthetic default, controlled local real opt-in, or true external canary opt-in, with artifact redaction rules for each class.

### Phase 2: LocalScript Robustness
- Test execution root containment, command allowlist, `shell=false`, timeout, cancellation, process cleanup, partial output, malformed result payload, repeated submit/sync/collect, and idempotency conflicts.
- Confirm no raw command output, credentials, or unredacted local paths leak into artifacts.
- Keep this lane deterministic. Do not add load, concurrency, or long-running stress checks until the basic lifecycle matrix is stable.

### Phase 3: API, DB, And Recovery Hardening
- Exercise registry/readiness/promotion/materialization/execution transitions against memory and disposable local DB paths.
- Prove stable error codes for malformed payloads, missing refs, stale reports, duplicate ids, hash mismatches, and promotion gate failures.
- Prove automation handoff usability: upstream paper-implementation automation can rely on stable refs, statuses, validation reports, evidence refs, and retry behavior across memory and disposable DB implementations.
- Keep long-running DB stress and normal developer-schema mutation out of the default suite.

### Phase 4: UI-driven Workbench Flow Definition
- Define the `实验基座` workbench flow that later UI tests must cover: registry creation/upsert, readiness check, job actions, result/evidence detail, and error state rendering.
- Define assertions that prove the renderer only calls backend APIs and does not synthesize readiness, promotion, materialization, execution, or validation decisions.
- Defer concrete UI automation implementation until the backend/API and runner hardening lanes are stable.

### Phase 5: Cross-flow Integration
- Verify PaperImplementation and adjacent evidence flows consume experiment-foundation refs, sidecars, facts, and evidence records without copying canonical DTOs or paper-claim fields.
- Keep ownership boundaries explicit in tests and docs.
- Do not add product bridge semantics in T-106 unless a failing seam test exposes a concrete defect that can be fixed locally. Larger bridge behavior becomes a follow-up task.

### Phase 6: External Canary Implementation
- Keep the default lane safe with gate-only checks and a local fake provider flow.
- Implement or define the first-class true external canary lane as explicit opt-in.
- The true canary must verify connectivity and the minimum real external flow: `submit -> sync -> collect -> result validation -> evidence refs`.
- Require credential presence checks, cost guardrails, dry-run or minimum-resource capability where available, cleanup verification, redacted artifacts, and explicit skipped/blocked/pass status.

### Phase 7: Runner Integration And Closure
- Add and stabilize the standalone hardening command contract first.
- After the command contract is stable, either add a T-103 hardening lane hook or document the standalone command as the official post-V1 hardening entrypoint.
- Record residual risks and split concrete follow-up tasks only for issues that cannot be closed inside T-106.

## Decision Review Protocol
Before entering each phase, review:
- the decision being made;
- owner and boundary;
- required fixtures and environment assumptions;
- pass, fail, blocked, and skipped semantics;
- artifact shape and redaction policy;
- whether a finding should be fixed in T-106 or split into a new task.
