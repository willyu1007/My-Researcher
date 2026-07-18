# 01 Plan

## Phase 0 - Baseline Inventory
1. Read T-043 and T-070 through T-078 task packages.
2. Inventory existing experiment foundation tests and identify gaps by function point.
3. Build a validation matrix that maps each capability to its contract, backend route/service, expected automation path, external boundary, and adjacent-flow consumer.

Acceptance:
- The matrix distinguishes already-covered schema/unit checks from missing scenario-level validation.
- No test scope duplicates product ownership from completed child packages.

## Phase 1 - Test Harness and Fixtures
1. Add deterministic experiment foundation fixture builders for dataset assets/versions, policies, mirrors, protocols, recipes, task specs, materialization results, jobs, results, facts, evidence, and sidecars.
2. Add reusable API scenario helpers around Fastify `buildApp()` and memory repositories.
3. Add safe LocalScript fixture scripts under a test-controlled directory outside production paths.
4. Add fake Aliyun client fixtures with configurable success/failure, stale mirror, checksum mismatch, and policy approval cases.

Acceptance:
- Fixtures avoid secrets, raw datasets, model weights, checkpoints, and platform-private payloads.
- Fixtures use shared contract types and schema constants rather than local DTO copies.
- Harness design is split into fixture builders, API scenario helpers, and external fakes so tests do not become a second implementation of experiment-foundation semantics.
- Default tests remain deterministic and credential-free; any live DB/cloud lanes remain opt-in.

## Phase 2 - Automation Capability Tests
Test the ability to drive the system through repeatable automated API flows:
- registry create/list/read/upsert for canonical records and frozen payload records;
- readiness checks with passed, blocked, stale, and unknown outcomes;
- candidate promotion with success, low confidence, duplicate, incomplete, unclear policy, high risk, and missing canonical refs;
- idempotent submit/cancel/collect flows;
- stable error envelopes for invalid payloads, forbidden private fields, unsupported record kinds, missing refs, and hash drift.

Acceptance:
- Tests assert stable status codes and error codes: `INVALID_PAYLOAD`, `NOT_FOUND`, `VERSION_CONFLICT`, `GATE_CONSTRAINT_FAILED`.
- Tests prove no automation path can write external job state through generic registry records.
- Each critical node has more than a happy-path functional test: it must include integration, robustness, state/idempotency, data-safety, traceability, and quality assertions appropriate to that node.

## Phase 3 - External Interaction Tests
Test external-facing behavior without real cloud credentials:
- LocalScript submit runs only inside the configured execution root, with `shell=false` and command allowlist enforcement.
- LocalScript rejects unsafe cwd/output paths, unsupported commands, missing readiness, and stale materialization.
- Mocked Aliyun submit consumes ready/fresh `dataset_mirror` refs and rejects missing mirror, stale mirror, checksum mismatch, restricted policy without approval, and private payload leakage.
- Adapter metadata remains refs/hashes only; no endpoint, region, queue, SDK payload, credentials, or inline adapter response leaks into public DTOs.

Acceptance:
- Both success and failure paths append expected stage/cancellation/partial/result refs.
- Tests prove external interaction is deterministic and mockable in CI/local runs.

## Phase 4 - Result, Evidence, and Sidecar Robustness
1. Validate result collection creates `ExperimentResult`, optional `FineTuningResult`, `ResultValidationReport`, `EvaluationFact`, metric/comparison observations, and eligible `EvidenceCandidate`.
2. Test invalid/partial result paths and enforce the T-132 D-03b/D-16 productized rule: only complete protocol-compliant passed validation can create evidence; historical `accepted_partial` is ineligible.
3. Test paper sidecar creation/compatibility as refs/locks/hashes/snapshots only.
4. Test claim/leaderboard/final-table leakage rejection.

Acceptance:
- Invalid or unvalidated outputs cannot become evidence.
- Facts stay facts; tests reject paper-claim, final-conclusion, final-table, winner/rank fields, and full reusable DTO copies.

## Phase 5 - Adjacent Workflow Integration
1. Add integration tests or contract smoke tests showing research/paper adjacent flows consume experiment refs/sidecar refs without importing reusable DTO payloads.
2. Confirm experiment foundation does not mutate literature, research-argument, topic-selection, or paper-project state except through documented refs/handoffs.
3. Add regression checks for no second implementation track in adjacent modules.

Acceptance:
- Adjacent-flow tests validate refs and hashes, not copied DTOs.
- Any missing bridge capability is documented as follow-up rather than implemented ad hoc.

## Phase 6 - Desktop Smoke and Operator Workflow
1. Add or extend smoke/e2e coverage for the `实验基座` workbench:
   - navigation appears under `文献管理`;
   - registry list/detail/create/upsert render;
   - readiness check renders blockers/actions;
   - jobs list/get/submit/sync/cancel/collect flows render status and refs;
   - evidence/sidecar records can be inspected.
2. Verify UI errors do not overflow, hide actionable error codes, or imply renderer-owned domain generation.

Acceptance:
- Desktop smoke exercises real API client calls or deterministic mocks against the same route shapes.
- UI remains data-ui/token path only and does not recreate legacy CSS.

## Phase 7 - Documentation and Defect Triage
1. Record verification commands and results in `04-verification.md`.
2. Add resolved pitfalls to `05-pitfalls.md`.
3. For defects discovered by tests:
   - fix in this task if narrow and required for validation;
   - otherwise create explicit follow-up task packages.
4. Run governance sync/lint.

Acceptance:
- T-090 is marked done only after the planned validation suite passes or any out-of-scope blockers are explicitly split.

## Critical-node Test Standard
For every critical node, tests should cover these dimensions unless explicitly marked not applicable:
1. **Functional correctness**: valid input produces the expected domain/API output.
2. **Contract enforcement**: schemas reject forbidden aliases, missing hashes/refs, private fields, and semantic drift.
3. **Integration behavior**: upstream and downstream nodes can consume the produced refs/status/hash outputs.
4. **State transition and idempotency**: duplicate/retry/conflict behavior is deterministic and uses stable error codes.
5. **Robustness and failure recovery**: stale, missing, partial, failed, cancelled, or inconsistent state is blocked or surfaced correctly.
6. **Security/data safety**: no raw data, credentials, SDK payloads, absolute paths, traversal paths, or adapter-private payloads leak.
7. **Traceability and auditability**: records carry source refs, traceability refs, hashes, readiness/report/event refs, and timestamps where required.
8. **Quality and maintainability**: tests are deterministic, isolated, fixture-driven, and do not duplicate product semantics.
