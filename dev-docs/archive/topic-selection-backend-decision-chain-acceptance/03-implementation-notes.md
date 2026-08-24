# 03 Implementation Notes

## Current Position
- This task is an acceptance task, not an architecture or implementation task.
- T-042 is closed as the parent architecture/governance package.
- T-046 and T-061 through T-067 are closed as the v1c stage and child implementation packages.
- The first execution should prefer existing route/service tests and isolated Prisma smoke before adding any new tests.

## Acceptance Rules
- Record exact commands and outcomes in `04-verification.md`.
- If a check fails, classify it before changing code:
  - environment/precondition failure;
  - test harness defect;
  - contract drift;
  - actual backend behavior bug;
  - out-of-scope UI/downstream gap.
- Do not broaden T-042 scope while executing this task.
- Do not treat skipped or environment-gated Prisma checks as accepted unless an isolated smoke has passed in this task.

## Initial Residual-Risk Watch List
- Full backend test commands may intentionally require `DATABASE_URL` because v1b/v1c Prisma HTTP smokes are non-skipped.
- Existing desktop title-card UI does not yet expose the new topic-selection v1a/v1b/v1c reviewer workflow.
- Synthetic replay baselines prove harness coverage, not mature research-quality thresholds.

## Acceptance Decision - 2026-05-16
- Result: superseded by the tighter node-level acceptance standard requested on 2026-05-16.
- Blocking backend defects found in the previous pass: none.
- Product code changes made by this task: none.
- Environment/precondition finding: direct v1b/v1c single-file route commands fail when `DATABASE_URL` is unset because their Prisma HTTP smoke subtests intentionally require a migrated Postgres database. This is not a product-code defect; the same subtests passed inside the isolated Prisma smoke run.
- Residual gaps remain outside T-068: desktop reviewer UI exposure, full downstream `PaperProject` execution, and real-world research-quality threshold calibration.

## Tightened Acceptance Standard - 2026-05-16
- T-068 must include a deterministic mock fixture that represents a realistic topic-selection case and exercises every backend decision-chain node one by one.
- Each node must have explicit assertions for identity propagation, human/system decision boundary, trace refs, status transitions, and downstream handoff IDs where applicable.
- A broad API smoke is supporting evidence only; it is not sufficient acceptance evidence for this task.

## Node-Level Acceptance Decision - 2026-05-16
- Result: accepted.
- Added test: `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Coverage shape: one deterministic fixture, 27 node-level subtests, and explicit negative checks for system-only validation, premature bridge creation, and non-human promotion authority.
- Blocking backend defects found: none.
- Product code changes made by this task: test-only plus dev-docs/project governance updates.

## Additional Acceptance Scope - 2026-05-16
- Continue using T-068 for two additional evidence classes:
  - invariant and negative acceptance;
  - persistence and contract acceptance.
- Do not reopen T-042 or split a new task unless acceptance exposes implementation work outside the backend decision chain.
- Prefer deterministic API-level acceptance tests plus isolated Prisma smoke evidence; avoid treating broad connectivity alone as sufficient.

## Invariant, Negative, Persistence, And Contract Acceptance Decision - 2026-05-16
- Result: accepted.
- Added coverage in `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Coverage shape: the deterministic T-068 route test now has 30 node-level/invariant subtests plus a separate route-contract test; 32 tests pass in the target command.
- New invariant coverage:
  - blocked v1a readiness cannot create a validation support packet;
  - closed/validated v1a candidate cannot be adjudicated again;
  - v1b `park` disposition cannot create a draft package or v1c handoff;
  - duplicate v1b draft package creation for the same value disposition is rejected;
  - v1c non-promote decision is not bridge-eligible and bridge creation is rejected;
  - downstream no-recheck feedback is append-only and does not fabricate a recheck projection.
- Contract/persistence evidence:
  - malformed v1a/v1b/v1c route payloads return stable `INVALID_PAYLOAD` envelopes;
  - shared contract tests/typecheck, backend typecheck, OpenAPI/API index/context checks passed;
  - isolated Prisma smoke passed against disposable schema `topic_selection_acceptance_20260516_031236_0122`.
- Blocking backend defects found: none.
- Product code changes made by this task: none; changes are test-only plus task/governance documentation.

## Quality Baseline Acceptance Decision - 2026-05-16
- Result: accepted.
- Added route-level quality baseline coverage in `apps/backend/src/routes/topic-selection-decision-chain-acceptance.test.ts`.
- Coverage shape: the T-068 target test now includes a dedicated quality baseline test; total target command coverage is 33 tests.
- Verified baseline properties:
  - v1a/v1b/v1c synthetic baseline datasets are `synthetic_fixture`, `active`, stage-specific, and cover every required case type;
  - every synthetic case carries a same-stage frozen input bundle and fixture observed output;
  - cross-stage metric keys are rejected with `INVALID_PAYLOAD`;
  - default runs expose the full stage-specific metric key set;
  - case results can be recorded from fixture observed outputs, completed, and read back through route metrics;
  - representative metric ratios match the service-level quality baseline expectations;
  - replay diffs expose the expected changed dimensions for each stage.
- Guardrail: this remains a synthetic offline replay quality baseline. It verifies contract and regression-calibration behavior, not mature real-world research-quality thresholds.
- Blocking backend defects found: none.
- Product code changes made by this task: none; changes are test-only plus task/governance documentation.

## Real-Resource Environment Rehearsal - 2026-05-17
- Result: accepted as an environment rehearsal over the populated resource pool.
- Scope: small-sample real flow using `ai-rag-finetuning-2022-2026`, 12 role-balanced literature records, local Postgres persistence, and the configured OpenAI LLM profile.
- Final outcome: v1a produced a `ValidatedNeed` and v1b input bundle; v1b produced an active `TopicQuestionContract`, ready/current value assessment, ready package, and v1c input bundle; v1c produced a promote-with-conditions decision and active `PaperProjectBridge`.
- Product code changes made during the rehearsal:
  - hardened v1b topic-question formation prompts and post-processing so known `research_slice`, `research_slice_boundary`, `research_slice_assumption`, and slice evidence wrapper refs normalize to the exact downstream authority refs expected by the contracts;
  - demoted non-blocking evidence-sufficiency prose from hard `blockers` into risk notes so ordinary uncertainty does not incorrectly block otherwise answerable candidates;
  - hardened v1b value assessment prompts and post-processing so evidence wrapper refs normalize to inherited evidence refs and `accepted_risk_refs` only contain true inherited `accepted_risk` authority refs.
- Harness change: `.ai/.tmp/topic-selection-real-flow.mjs` now writes evidence under repo-root `.ai/.tmp`, prefers risk-free `answerable` topic-question candidates, and creates/carries an explicit accepted risk through the existing v1a accepted-risk route if only `answerable_with_risk` candidates are available.
- Interpretation: the earlier failures were real contract-drift findings exposed by live LLM output, not resource-pool insufficiency. The final pass confirms the backend chain can run with the current real resource pool.

## Resource-Sampling Test Follow-Up - 2026-05-17
- Result: accepted with sampling caveat.
- Resource audit found 102 ready scoped records and enough role coverage, but also 11 possible topic-drift records under a simple keyword audit. This confirms the pool is usable, but sampling should not blindly trust `activation_score=100`.
- Tightened the temporary real-flow sampler so support requires primary RAG/fine-tuning/source-attribution signals and excludes risk-heavy papers; risk-heavy RAG/embedding/source papers now fill challenge roles instead of support roles.
- Final 16-literature live run passed and exercised the `answerable_with_risk` branch: an active accepted risk was created, carried into the TopicQuestionContract, preserved through value assessment/package/v1c bundle, and visible on the final PaperProjectBridge.

## v1c Product-Level Route Hardening - 2026-05-18
- Result: accepted as a deeper HTTP-level v1c closure check.
- Added route-level assertions in `apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts`.
- Additional coverage:
  - `promote_with_conditions` carries conditions, early-check obligations, claim ceiling, source promotion decision id, promotion input snapshot id/hash, and source lineage summary into `PaperProjectBridge.working_copy_payload`;
  - bridge creation remains a handoff only and does not create `PaperProject` or paper-project intake refs;
  - stale human-confirmed promotion snapshot hashes are rejected with `VERSION_CONFLICT`;
  - malformed human-verifiable promotion conditions are rejected with stable `INVALID_PAYLOAD`;
  - only one current `PromotionDecision` can exist for a promotion input snapshot;
  - bridge workspace drift is rejected before bridge creation, while a valid bridge can still be created afterward.
- Product code changes made by this phase: none; changes are test-only plus acceptance documentation.

## v1c Downstream Feedback Route Hardening - 2026-05-18
- Result: accepted as a product-level downstream feedback/recheck closure check.
- Added route-level coverage in `apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts`.
- Additional coverage:
  - creates a real active `PaperProjectBridge` through the v1c HTTP path, then records downstream feedback against that bridge;
  - verifies all downstream feedback signals map to the expected loopback target at HTTP level;
  - verifies every recheck-producing signal creates a retrievable downstream recheck projection, while `no_recheck_needed` remains append-only without a recheck projection;
  - verifies feedback list-by-bridge is append-only and returns exactly the created feedback records;
  - verifies missing `required_action` and workspace drift are rejected before feedback creation;
  - verifies downstream feedback does not mutate stable bridge fields such as bridge hash, working copy hash, source promotion decision id, promotion input snapshot id/hash, or paper-project refs.
- Test harness correction: compare a stable bridge field subset when checking immutability because the bridge GET route returns the full read model, not a narrowed DTO.
- Product code changes made by this phase: none; changes are test-only plus acceptance documentation.

## Real Provider Downstream Replay - 2026-05-18
- Result: accepted after one live LLM contract-drift fix.
- Scope: real DB and real OpenAI provider run over `ai-rag-finetuning-2022-2026`, with 20 resource-sampled literature records, v1a -> v1b -> v1c -> downstream feedback/recheck replay.
- First real run exposed a live v1b value-assessment reference drift: the LLM cited the inherited research slice as `ref_type=research_slice_ref` even though the authority ref is `research_slice`.
- Fix:
  - hardened the value-assessment prompt to require the inherited `research_slice_ref` value exactly without emitting `ref_type=research_slice_ref`;
  - normalized only the matching wrapper alias back to the inherited `research_slice` ref when `ref_id` matches the inherited research slice and `title_card_id` is absent or matches the active title card;
  - kept unknown refs blocked by the existing value-assessment gate.
- Final real run `downstream-real-rerun-20260518135802` passed:
  - sample set `resource_sample_set_b8bcc296-1a2a-4385-8d7b-4c6ab1ae3e32`, status `ready_with_warning`, warning `CONTEXT_CAP_APPLIED`;
  - v1b produced `answerable_with_risk`, created an accepted risk, advanced value assessment/package, and emitted a v1c input bundle;
  - v1c produced active bridge `paper_project_bridge_7884f6dc-5776-46d3-8ed0-40a03b5ca5b1`;
  - downstream replay created 13 feedback records, 12 recheck requests, and one append-only `no_recheck_needed` record;
  - missing `required_action` returned `INVALID_PAYLOAD`, workspace drift returned `VERSION_CONFLICT`, and stable bridge fields stayed unchanged.
- Product code changes made by this phase: v1b value-assessment prompt/normalization hardening plus unit coverage; real-flow harness extended to include downstream feedback/recheck replay and artifact capture.
