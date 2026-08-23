# T-141 Verification

## Planned focused checks

- Shared contract tests: owner-only request, strict unknown-field rejection, semantic response closure.
- Source resolver tests: persisted literature/evidence lineage, missing/unresolvable lineage blocker, no invented refs.
- Curation composition tests: eligible bindings, gap-only, weak/blocked/stale candidates, all-core assertion coverage.
- Recovery tests: existing eligible board, persisted curation replay, interruption between curation/trace/board, concurrency convergence.
- Route integration: real backend composition from a T-140-shaped owner; replay; malformed body; T-139 boundary.
- Side-effect assertions: zero ValidationCycle, WorkOrder, Experiment Foundation Run, PAI Job, Result, Claim, or Dossier.

## Planned release gates

- Node 20 shared/backend focused and full tests.
- Shared/backend typecheck.
- LLM config-key and registry validation; confirm profile/prompt reuse, bounded provider calls, telemetry, and no secret/config additions.
- OpenAPI/API index and Context strict verification.
- Project-state, governance sync/lint, task-doc strict lint, and `git diff --check`.
- Commit with `Task: T-141`, push to `main`, and wait for green CI.

## Evidence

- Node 20 shared handoff schema test: 10 passed.
- Node 20 backend combined focused run: 36 passed across the handoff service (8), Trace Kernel (15), Prisma Trace repository (3), and Paper Implementation route integration (10).
- Focused recovery coverage includes owner replay, eligible legacy-board reuse, same-instance concurrency, cross-instance singleflight isolation, post-curation interruption, CitationCandidate unique-race reread, stale/gap blocking, and minimum-support fail-closed behavior.
- Node 20 shared full suite: 420 passed, 0 failed, 0 skipped.
- Node 20 backend full suite: 2,728 test items; 2,659 passed, 0 failed, and 69 explicit environment-gated skips.
- Shared and backend typechecks passed after the final review fixes; backend typecheck regenerated the Prisma client.
- LLM config-key registry and LLM registry validation: passed; 28 existing profiles and 26 existing prompt templates, with no T-141 additions.
- API index regenerated from OpenAPI: 213 endpoints; checksum prefix `92c8856abdecc157`; Context strict verification passed.
- Project-state verification, governance strict lint, task-doc strict lint (8/8 with zero warnings/errors), and `git diff --check` passed.
- Real provider/PAI execution: intentionally not run. Verification used deterministic test doubles and local persisted authority only.
- Remote CI: pending the implementation commit and push.

## Rollout / Backout

- Rollout is additive and credential-free; no paid provider experiment is part of verification.
- Backout by reverting T-141 commits; never delete or rewrite persisted scientific authority.
