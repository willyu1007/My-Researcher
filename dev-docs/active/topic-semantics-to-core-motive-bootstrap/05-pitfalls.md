# T-140 Pitfalls (do not repeat)

## Do-not-repeat summary

- Do not use the validation-planning coordinator to bootstrap CoreMotive; that coordinator already requires motive/version/assertion targets.
- Do not map T-138 fields directly into a superficially complete scientific authority or let the LLM author authority ids/refs/state.
- Do not add continuation workflow state when stable identity plus persisted owners can recover progress.
- Do not make trace/admission exact-once claims without concurrency and interruption tests.
- Do not use the T-137 fixed SciFact script as a general product service.
- Do not persist a final runtime artifact without the role artifact/admission lineage required by the existing runtime contract.
- Do not describe process-local singleflight as distributed provider-call exact-once.

## Pitfall log

### 2026-08-23 - Broad continuation plan crossed the first semantic boundary

- Symptom: the initial candidate plan implied that one new service could bootstrap CoreMotive and immediately start the existing coordinator.
- Context: implementation-readiness review before T-140 coding.
- What we tried: traced the coordinator create-run request and motive-decomposition slot contract from the T-139 owner root.
- Why the approach failed: the coordinator requires an existing target motive ref, CoreMotiveVersion ref, and assertion refs; the coordinator cannot generate the first CoreMotive.
- Fix / workaround: scope T-140 to `ImplementationProject -> admitted first-primary CoreMotive`; leave validation planning to a later explicit task.
- Prevention: verify the first required input authority of every proposed coordinator before treating a coordinator as a bootstrap surface.
- References: `paper-implementation-run-coordinator-service.ts`, `paper-implementation-runtime-contracts.ts` motive-decomposition contract.

### 2026-08-23 - Topic payload is not a complete CoreMotive writer DTO

- Symptom: a deterministic field-copy design appeared simpler but could not truthfully assign scope, falsification, bounded claim, and assertion semantics.
- Context: T-138 semantic payload versus CoreMotive create contract review.
- What we tried: mapped every T-138 working-copy field to the required CoreMotive contracts.
- Why the approach failed: high-level problem/contribution/evaluation fields do not determine all rich scientific motive fields.
- Fix / workaround: introduce a dedicated semantic-only `CoreMotiveBootstrapProposal@v1`; deterministic code validates the proposal and remains the only authority writer.
- Prevention: distinguish input semantics from scientific authority completeness; never fill missing science with invented defaults.
- References: `topic-selection-v1c-paper-project-bridge-contracts.ts`, `paper-implementation-motive-contracts.ts`.

### 2026-08-23 - Dev-docs lint command drift

- Symptom: `node .ai/scripts/lint-dev-docs.mjs ...` failed with `MODULE_NOT_FOUND` before source implementation began.
- Context: initial task-bundle verification used a stale command name inferred from older handoff wording.
- What we tried: searched package scripts and `.ai/scripts` for the repository-owned documentation validator.
- Why the command failed: the current repository exposes `.ai/scripts/lint-docs.mjs`; `lint-dev-docs.mjs` does not exist.
- Fix / workaround: use `node .ai/scripts/lint-docs.mjs --path <task-dir> --strict`.
- Prevention: resolve verification entrypoints from the current repository before recording or running historical command names.
- References: `.ai/scripts/lint-docs.mjs --help`.

### 2026-08-23 - Standalone final proposal artifact violated runtime lineage

- Symptom: the first real route integration attempt rejected the bootstrap final artifact because its prior-role refs/hashes were empty; fixture source hashes also did not meet the 64-hex runtime contract.
- Context: composing the dedicated semantic proposal through the existing Paper Implementation runtime admission service.
- What we tried: persisted the validated proposal directly as one final runtime artifact.
- Why the approach failed: existing final runtime artifacts require a concrete prior role chain, and runtime source hashes must be canonical SHA-256 values.
- Fix / workaround: persist and admit a role artifact first, derive and admit the final artifact from that role, recover an interrupted role before any new LLM call, and normalize non-canonical fixture hashes through SHA-256.
- Prevention: construct new runtime lanes from the complete existing envelope/admission invariant, not only the business payload fields.
- References: `paper-implementation-core-motive-bootstrap-proposal-service.ts`, route integration test.

### 2026-08-23 - Node 26 loader noise looked like a suite regression

- Symptom: a shared test invocation under the host Node 26 runtime produced file-level `ts-node/esm` loader failures.
- Context: initial focused verification before explicitly pinning the project-supported runtime.
- What we tried: reran the same focused and full commands with a Node 20 binary prepended to `PATH`.
- Why the first command failed: the repository baseline explicitly supports Node 20; Node 26 loader incompatibility is environment noise, not a business-code failure.
- Fix / workaround: all authoritative T-140 suites ran under Node 20.20.2 and passed.
- Prevention: print `node -v` and pin Node 20 before starting any authoritative shared/backend test fleet.
- References: root handoff runtime rule, `packages/shared/package.json`, `apps/backend/scripts/run-node-tests.mjs`.
