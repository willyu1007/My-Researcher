# T-140 Verification

## Focused automated checks

- Shared CoreMotive handoff contract file under Node 20: 9/9 passed; owner-only request, semantic-only proposal, required core assertion, and closed response are covered.
- Backend handoff/trace/Prisma/profile focused run under Node 20: 31/31 passed; includes persisted replay, process-local concurrent singleflight, zero-write literature blocker, deterministic trace convergence, motive admission CAS fake, and profile resolution.
- Route integration under Node 20: target test passed with 8 unrelated tests skipped by name filter. It uses real `buildApp` composition, two persisted runtime artifacts/admissions, one CoreMotive/trace authority, zero replay LLM calls, malformed-body rejection, and the T-139 `VALIDATION_PLANNING_RUN_NOT_STARTED` boundary.
- Shared and backend typechecks passed; backend included Prisma client generation.
- LLM registry validation passed:
  - `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs`
  - `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`
  - 41 registered keys; 28 profiles; 26 prompt templates; no validation issues.
- OpenAPI strict quality passed; generated API index advanced from 211 to 212 endpoints and `paper-implementation-handoff` from 2 to 3.
- Context Awareness strict verification passed after checksum refresh.
- Paper Implementation slot-parameter manifest export remained current at 14 slots.

## Full Node 20 suites

- `PATH="$TASK_NODE20_BIN:$PATH" pnpm --filter @paper-engineering-assistant/shared test`
  - 419 passed, 0 failed, 0 skipped.
- `PATH="$TASK_NODE20_BIN:$PATH" BACKEND_TEST_CONCURRENCY=4 pnpm --filter @paper-engineering-assistant/backend test`
  - 2717 test items; 2648 passed, 0 failed, 69 explicit environment-gated skips.
- `pnpm --filter @paper-engineering-assistant/shared typecheck`
  - passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - passed, including Prisma client generation.
- Post-review semantic-drift hardening: handoff service 3/3, real route 1/1 (8 unrelated skips), backend typecheck, docs 8/8, and `git diff --check` all passed after the final code edit.

## Persisted application smoke checks

- The real route test starts from a T-138-shaped bare `ImplementationProject` and sends only `implementation_project_id`.
- First response: HTTP 201, `status=created`, stage `core_motive_admitted`, all four effects performed.
- Persisted state after first call: two runtime artifacts/admissions (role + final proposal), one motive/version/assertion set, one trace, one first-primary admission; no coordinator run.
- Replay response: HTTP 200, `status=resumed`, all four effects reused, gateway call count remains one.
- T-139 response for the same owner: blocker `VALIDATION_PLANNING_RUN_NOT_STARTED`; no T-140 or coordinator effect is synthesized.
- Provider experiment/PAI Job/Attempt/Result/Claim/Dossier effects: zero. No credentials or real-provider environment were loaded.

## Expected results

- Contract rejects every extra caller field.
- Malformed/constraint-weakening proposal writes no CoreMotive authority.
- Recovery after proposal, draft, trace, or admission interruption completes without duplicates.
- Concurrent requests converge to one expected primary motive/trace/admission or one reports a retryable conflict.
- Full repository and CI gates pass.

## Final repository gates

- [x] Project governance synchronization and lint after the implementation handoff update.
- [x] Project-state verification.
- [x] Documentation strict lint: 8/8 files, 0 warnings, 0 errors.
- [x] OpenAPI quality, generated API index, and Context strict verification.
- [x] `git diff --check` and final diff review.
- [x] Implementation commit `40150423d56c4c5355a36683320622f0bbca8d2f` with `Task: T-140` pushed to `main`.
- [x] GitHub Actions run `32611209572` passed all four jobs, including isolated-Prisma backend tests.

## Rollout / Backout

- Rollout: additive local backend route after all gates pass; no provider experiment or database rollout.
- Backout: revert T-140 commits; never delete or rewrite persisted scientific authority.
