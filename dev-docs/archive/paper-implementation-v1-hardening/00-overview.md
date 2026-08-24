# T-102 Paper Implementation V1 Hardening

## Status
- State: done
- Task ID: `T-102`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Next step: use follow-up candidates only when productization work is explicitly prioritized.

## Goal
- Harden the already-closed PaperImplementation V1 authority/control plane without reopening `T-091`.
- Convert the useful findings from `paper_implementation_review_risks_and_recommendations.md` into a focused implementation task.
- Improve trace precision, claim readiness semantics, writing-ready support rigor, and selected read-model safety before heavier real-project usage.

## Non-goals
- Do not create a second PaperImplementation authority root.
- Do not redefine `T-093` through `T-101` contracts except where a V1 hardening fix requires a compatible tightening.
- Do not implement live LLM/provider evaluation, live experiment execution adapters, writing-system ingestion, browser-level E2E, or full `research-argument` decommissioning in this task.
- Do not make `research-argument` an authority or compatibility source for new implementation behavior.

## Context
- `T-091` through `T-101` are closed and establish the V1 PaperImplementation lane.
- `T-101` residual risks are non-blocking for V1 closure but suitable for a post-landing hardening package.
- The external review report identified valuable P1/P2 risks. Project inspection confirmed that the highest-value P1 fixes are trace target precision, trace target alias completeness, claim readiness wording, claim support allowlist discipline, and selected WorkOrder outcome/read-model clarity.
- The T-102 boundary decisions are confirmed: keep WorkOrder terminal outcome as service/read-model projection first, keep human confirmation payload minimal in T-102, and record follow-up task candidates without bulk-creating them before T-102 closure.

## Acceptance Criteria
- [x] Trace hardening prevents writing-affecting objects from relying on inherited or aliased trace targets where a target-specific trace is required.
- [x] `result_interpretation_packet` trace target normalization is accepted by the trace gate and covered by tests.
- [x] `ClaimCandidate` states cannot imply writing-ready support before a `ClaimTracePacket` or equivalent dossier-ready trace path exists.
- [x] Writing-ready claim support rejects broad contextual refs as standalone support unless they resolve to citable locator-backed evidence.
- [x] Overclaim safety has deterministic adversarial coverage for paraphrase/wording drift within V1 boundaries.
- [x] WorkOrder/run read models preserve terminal outcome semantics without confusing execution success with scientific outcome.
- [x] T-102 verification updates shared/backend targeted tests, typecheck, and project governance lint; no Prisma/DB context change was required.

## Closure Rule
T-102 may close only after the hardening fixes pass targeted tests and the task docs record which review findings were fixed, deferred, or intentionally split into follow-up tasks.
