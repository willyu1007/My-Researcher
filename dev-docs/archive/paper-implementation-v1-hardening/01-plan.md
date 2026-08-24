# Plan

## Phase 0 - Boundary Alignment
- [x] Confirm T-102 is a post-V1 hardening task, not a reopened parent package.
- [x] Confirm which review findings are in scope for T-102 and which are follow-ups.
- [x] Keep `T-091` / `T-101` closure semantics intact.

## Phase 1 - Trace Hardening
- [x] Add or tighten trace target handling for `result_interpretation_packet`.
- [x] Require target-specific trace readiness for `RunEvidenceUnit` where it feeds writing-affecting claim/dossier paths.
- [x] Add blocked-path tests for inherited WorkOrder trace misuse.

## Phase 2 - Claim Readiness Hardening
- [x] Split provisional claim support from trace-ready support in contracts/read models/services.
- [x] Prevent `ClaimCandidate` from presenting as fully supported when `ClaimTracePacket` is absent.
- [x] Tighten writing-ready support refs so broad contextual evidence cannot satisfy readiness alone.

## Phase 3 - Semantic Safety And Outcome Clarity
- [x] Add deterministic overclaim/paraphrase adversarial tests.
- [x] Preserve WorkOrder process status separately from scientific terminal outcome where read models need both.
- [x] Keep live LLM/provider semantic critic and real experiment execution out of default T-102.

## Phase 4 - Verification And Governance
- [x] Run shared schema tests.
- [x] Run backend targeted PaperImplementation hardening tests.
- [x] Run backend typecheck.
- [x] Run Prisma format/validate and DB context sync if schema changes.
- [x] Run governance sync/lint.
- [x] Record all results in `04-verification.md`.

## Acceptance Gates
| Gate | Required Result |
|---|---|
| Trace gate | Writing-affecting objects have canonical, target-specific trace coverage. |
| Claim gate | Claim readiness cannot be overstated before trace/citation support exists. |
| Support gate | Citable writing-ready support is locator-backed and not summary/memo-derived. |
| Overclaim gate | Deterministic tests catch wording drift beyond claim boundary. |
| Governance gate | T-102 registered and lint-clean without changing the meaning of closed T-091. |
