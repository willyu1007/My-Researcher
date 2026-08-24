# T-142 Verification

## Planned focused checks

- T-141 regression tests: stale motive state, EvidenceUnit owner/version drift, risk-only zero-binding response schema, bounded CitationCandidate lookup, Prisma board unique race.
- Shared contract tests: only owner-root request, strict response, unknown-field rejection.
- T-142 service tests: create/admit, runtime blocked/waiting, selected-candidate drift, persisted replay, post-runtime/post-draft interruption, concurrency convergence.
- Route integration: real application composition, malformed body, create/replay status, and T-139 transition to experiment specification.
- Side-effect assertions: zero WorkOrder, EF Run, provider Attempt, scientific result, claim, or dossier writes.

## Planned release gates

- Node 20 focused and full shared/backend tests.
- Shared/backend typecheck.
- LLM registry and config-key checks; confirm no profile/prompt/config-key additions.
- OpenAPI/API index regeneration and Context strict verification.
- Project-state, governance, task-doc strict lint, and `git diff --check`.
- Commit with `Task: T-142`, push `main`, and wait for green CI.

## Evidence

- T-142 service focused tests: 10/10 passed on Node 20, covering create/admit/replay, interrupted admission recovery, same-instance and cross-instance convergence, existing-authority replay, newest completed-cycle selection, Domain Gate blocker mapping, owner drift, coordinator stops, and selected-target drift.
- Paper Implementation route integration: T-142 owner-root create/replay route passed alongside adjacent T-139/T-141 routes; missing owner input returns 400 and unknown caller-authored lineage is rejected by the strict schema.
- Shared full suite: 421/421 passed on Node 20.
- Backend post-correction full suite: 2743 tests, 2674 passed, 69 environment-gated skips, 0 failed on Node 20.
- Shared/backend typecheck passed on Node 20 after the final code changes.
- LLM checks passed: 41 registered config keys, 3 providers, 28 profiles, and 26 prompt templates; T-142 adds no registry entry.
- OpenAPI quality, API-index verification, Context strict verification, project-state verification, governance lint, task-doc strict lint (6/6, zero warnings/errors), and `git diff --check` passed locally.
- No real LLM, PAI Job, WorkOrder, EF Run, provider Attempt, result, claim, or dossier was created. Existing admitted authority replay is verified through persisted repository state with zero coordinator/provider calls.

## Rollout / Backout

- Rollout is additive and requires configured ordinary LLM access only on first execution.
- No PAI/cloud credential or real experiment is part of T-142 verification.
- Backout by reverting T-142 commits; preserve all persisted authority.
