# T-090 Experiment Foundation Capability Validation

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: no remaining T-090 implementation step; future product expansion should be opened as explicit follow-up task packages.

## Goal
Build a deep, function-by-function validation package for the experiment foundation minimum chain. The package should prove that the existing system is not only type/schema correct, but operationally robust across automation, external adapter boundaries, and handoff points with adjacent workflows.

## Why This Exists
T-070 through T-078 closed the minimum implementation chain. Current tests cover contracts, targeted backend services, and desktop type safety, but they do not yet provide a scenario-level capability proof that a user or automation can drive the whole system reliably.

This task validates the implemented experiment foundation as an integrated capability:
- registry and readiness can be exercised by automation;
- LocalScript and mocked Aliyun external boundaries behave predictably;
- execution collection creates result/validation/evidence records without paper-claim leakage;
- desktop/API workflows tolerate malformed, stale, missing, duplicate, and drifted inputs;
- adjacent flows can consume refs/sidecars without copying experiment DTOs or opening a second semantic track.

## In Scope
- Scenario-level backend tests for registry, readiness, promotion, materialization preconditions, job submission, sync, cancellation, collection, result validation, and evidence creation.
- Automation-oriented tests that exercise repeatable CLI/API flows with idempotency, retries, stale state, and partial results.
- External-interaction boundary tests for:
  - LocalScript execution under safe execution-root and allowlist constraints;
  - mocked Aliyun PAI-DLC with dataset mirror freshness, checksum, policy approval, and credential-free behavior;
  - adapter metadata refs/hashes rather than inline private payloads.
- Cross-flow robustness tests for handoff from experiment foundation to research/paper surfaces through refs, sidecars, facts, evidence, and no-copy guards.
- Desktop smoke/e2e tests only where they prove the UI consumes backend APIs without owning domain semantics.
- Test fixtures, scenario builders, and local-only fake external adapters needed to make tests repeatable.

## Out of Scope
- No new experiment foundation product features.
- No real Aliyun SDK integration, real cloud credentials, or live paid cloud execution.
- No live DB migration application unless explicitly run in a controlled test database.
- No LLM literature extraction service or automatic canonical asset synthesis from candidates.
- No paper-project bridge product UI beyond testing ref/sidecar compatibility.
- No broad refactor of contracts, backend services, or desktop UI unless a failing validation exposes a concrete defect.

## Acceptance Criteria
- [x] A scenario test suite proves `Validate -> Submit -> Monitor -> Collect -> Validate Result -> Evidence/Sidecar refs` for the LocalScript path.
- [x] A mocked external adapter suite proves Aliyun mirror/policy/checksum gates and credential-free adapter metadata boundaries.
- [x] Automation tests prove idempotent create/upsert/submit/cancel/collect behavior and stable error codes for invalid payloads, stale state, duplicate keys, and missing refs.
- [x] Integration robustness tests prove adjacent workflows consume experiment refs/sidecars without copying canonical DTOs or paper-claim fields.
- [x] Desktop smoke verifies the `实验基座` workbench can access registry/readiness/execution APIs through existing renderer API clients without renderer-owned semantics.
- [x] Verification evidence is recorded in this package and any discovered defects are either fixed in this task or split into explicit follow-up tasks.

## Current Assumptions
- T-070 through T-078 remain the implementation baseline.
- T-090 may add tests, fixtures, test harnesses, and docs; product-code changes are allowed only when needed to fix a defect revealed by those tests.
- `external_training_job` is intentionally not a generic registry record kind; tests must preserve the T-077 execution API as the only writable job-state surface.
- Any tests that require a real Postgres database must be opt-in and clearly separated from default local checks.
