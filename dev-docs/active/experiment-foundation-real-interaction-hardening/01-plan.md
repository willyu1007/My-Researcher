# T-106 Plan

## Implementation Order

1. Confirm roadmap decisions D1 through D8.
2. Build the hardening matrix and fixture inventory.
3. Add the minimum harness command or test entrypoint for T-106 only.
4. Land LocalScript robustness tests.
5. Land API, persistence, readiness, promotion, and recovery tests.
6. Define the UI-driven workbench smoke or Playwright flow contract; implement the UI flow later after backend/API and runner hardening lanes stabilize.
7. Land cross-flow seam tests with PaperImplementation or adjacent evidence consumers.
8. Implement the external canary lane shape: safe default gates, local fake provider, and true opt-in canary contract.
9. Stabilize the standalone hardening command, then integrate the command with T-103 or document the command as the official post-V1 hardening entrypoint.
10. Close T-106 only after verification artifacts are redacted and residual risks are recorded.

## Phase Acceptance

### Phase 1
- [x] A matrix identifies every critical node from registry payload creation to evidence/sidecar consumption.
- [x] Each row names the layer, fixture, command/test file, expected outcome, and artifact.
- [x] The matrix separates deterministic, real-local-DB, and external opt-in checks.
- [x] Fixture inventory classifies every fixture as synthetic default, controlled local real opt-in, or true external canary opt-in.
- [x] No raw dataset, model weight, checkpoint, credential, raw log, or unredacted external payload is checked into the repo.

### Phase 2
- [x] LocalScript failures are deterministic and produce stable backend errors.
- [x] Cancellation and timeout paths leave no orphan process assumptions in test artifacts.
- [x] Collect produces valid, partial, or invalid result/validation/evidence behavior according to T-074 and T-077 contracts.
- [x] Allowlist, execution root, `shell=false`, cwd/output containment, idempotent submit, idempotency conflict, repeated sync, repeated collect, and malformed result paths are covered.
- [x] Stress/load testing remains out of default scope unless a later finding justifies a separate follow-up.

### Phase 3
- [x] Memory and disposable-DB paths agree on representative create/upsert/list/readiness/promotion/job state semantics covered by the recovery probe.
- [x] Idempotency and conflict behavior is tested across registry and execution APIs.
- [x] Recovery after failed readiness, promotion, submit, sync, cancel, and collect is explicit.
- [ ] Paper-implementation automation can consume stable refs, statuses, validation reports, and evidence refs from both memory and disposable DB paths.
- [x] Normal developer schemas are not mutated; disposable schema setup and cleanup are explicit.

### Phase 4
- [x] Desktop workbench flow contract names the exact user path, backend calls, expected states, and error states.
- [x] UI acceptance criteria prove API consumption and error rendering without requiring immediate automation implementation.
- [x] Future screenshots or logs must be redacted where stored.

### Phase 5
- [x] Adjacent flows consume refs and hashes only.
- [x] Tests prevent canonical experiment-foundation DTO copies from entering PaperImplementation state.
- [x] Paper claim or final-table wording does not leak into evidence candidates or sidecars.
- [x] Any required product bridge expansion is recorded as a follow-up unless the expansion is a small compatibility fix exposed by a seam test.

### Phase 6
- [x] Default external checks remain safe: gate-only config validation and local fake provider flow.
- [x] True external canary exists as an explicit opt-in prerequisite gate and command contract.
- [x] True canary gate has credential, cost, cleanup, blocked/skipped/pass, and redaction guardrails.
- [x] True canary gate artifacts store key presence, refs, hashes, summaries, and cleanup prerequisites only.
- [x] Import and verify the T-132 M7-I3 default-off implementation verdict `t132-m7-offline-20260723-v1`, including redaction, zero-cost/write census and disposable cleanup evidence. T-106 implements no provider transport or schema. The true external M7-L1 canary remains separately open.

### Phase 7
- [x] A standalone T-106 hardening command exists with clear deterministic, real-local-DB, UI-definition, cross-flow, and true-external-canary-gate lanes.
- [x] T-103 handoff is stable and does not change the default full-flow runner semantics.
- [x] Governance lint passes.
- [ ] Residual hardening work is either closed or split into explicit follow-up tasks.

## Initial Verification Commands

```bash
node .ai/scripts/ctl-project-governance.mjs sync --apply --project main
node .ai/scripts/ctl-project-governance.mjs lint --check --project main
git diff --check -- dev-docs/active/experiment-foundation-real-interaction-hardening .ai/project/main
```
