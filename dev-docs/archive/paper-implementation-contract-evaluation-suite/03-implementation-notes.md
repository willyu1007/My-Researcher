# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-101` for contract evaluation and parent closure readiness.
- It is the final review task for the paper implementation child package set.
- No product code changes were made.

## Open Notes
- Closed by `06-evaluation-matrix.md` through `10-parent-closure-review.md`.

## 2026-05-22 - Entry Started
- T-100 was committed as `b8e898c feat(paper-implementation): add desktop workbench` before opening T-101.
- T-092 through T-100 are closed and available as input evidence for the evaluation suite.
- Current worktree still contains unrelated topic-selection, experiment-foundation, and desktop dist changes; T-101 work must keep those out of scope unless explicitly requested.
- First T-101 step is an evaluation matrix that maps D1-D10, design-doc runtime components, child acceptance criteria, and required queryable fields to deterministic tests or explicit residual-risk owners.

## 2026-05-22 - T-101 Evaluation Suite Landed
- Added `apps/backend/src/services/paper-implementation-contract-evaluation-suite.unit.test.ts`.
- The evaluation suite replays the full flow from `ImplementationProject` to `WritingEntryPacket` using existing services and in-memory repositories.
- Added blocked-path checks for bridge hash drift, citation locator failure, natural-language role misuse, orphan monitor callbacks, direct AI authority mutation, and upstream feedback boundary.
- Added Prisma/context queryability checks for required gate, queue, trace, run, claim, dossier, and harness fields.
- Added static desktop workbench route/boundary checks instead of introducing a new browser automation framework.
- Added T-101 artifacts `06` through `10`; no product semantics, DB authority, or live provider dependency was introduced.

## 2026-05-22 - Quality Repair Pass
- Tightened the full-flow replay so the ready dossier admits a `negative_result_claim` from retained failed-run evidence, avoiding the semantic drift where failed run evidence appeared to support a positive improvement claim.
- Added direct T-101 blocked fixtures for missing trace manifests and strong-claim confirmation bypass.
- Upgraded UI boundary coverage from static route-string checks only to a Fastify `buildApp` route-level smoke covering bootstrap, project read model, trace creation, trace repair queue, and decision queue.
- Strengthened DB context verification by parsing `docs/context/db/schema.json` and checking required fields under the owning table instead of doing whole-file string matches.
- Broadened verification to execute the T-101 suite, all paper-implementation child service tests, and the paper-implementation route integration test together.

## 2026-05-22 - Final Cleanup And Commit Review
- Rechecked all `paper-implementation-*` task packages: T-091 through T-101 are `done`, and the child flow remains `T-093 -> T-097 -> T-094 -> T-095 -> T-096 -> T-098 -> T-099 -> T-100 -> T-101`.
- Rechecked authority boundaries: no PaperImplementation service/repository/controller/desktop path imports or writes `research-argument`; `PaperProjectBridge` remains an upstream topic-selection handoff lineage source.
- Rechecked UI boundaries: desktop PaperImplementation uses backend command/read-model APIs and does not create local readiness authority.
- Rechecked cleanup risk: no T-101 temp artifacts, skipped tests, `.only` tests, or obsolete PaperImplementation runtime files were found.
- Full shared/backend whole-package verification is currently blocked by unrelated dirty topic-selection files in the worktree; scoped PaperImplementation schema/backend suites pass and are the evidence for this closure.
