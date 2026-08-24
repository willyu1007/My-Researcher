# 03 Implementation Notes

## 2026-05-18 Intake
- Opened T-085 from the requested next test plan.
- T-084 already proved 16-literature mock/provider canaries can reach PaperProject intake.
- This package focuses on scale-quality and stability rather than new product capability.

## 2026-05-18 Implementation
- Originally added `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` and `pnpm topic-selection:real-e2e:quality-gate`; the script path was later retired by the 2026-05-20 migration below.
- The quality gate runs provider E2E repeats at 32 literature records, runs a deterministic v1b negative, writes `quality-summary.json`, and writes a manual spot-check table.
- Added reusable negative mode to `.ai/scripts/topic-selection-real-e2e.mjs` so v1b `needs_refinement` can be asserted without creating v1c/package/PaperProject artifacts.
- Resource sampling guardrails were tightened:
  - baseline-oriented benchmark/evaluation evidence is no longer swallowed by generic risk terms;
  - mitigation/context papers such as hallucination-free systems or emotional-memory papers are not forced into challenge;
  - LLM classification batch retry budget is now 2.
- v1b TopicQuestion prompt now explicitly forbids placeholder/synthetic refs and reinforces boundary fit.
- v1b ValueAssessment prompt now includes an explicit `allowed_functional_refs_json` copy list, distinguishes package readiness from promotion readiness, and forbids synthetic evidence ids.
- ValueAssessment now normalizes `ready_with_accepted_risk` to `ready` when no inherited accepted-risk authority exists, and drops unknown LLM-invented evidence refs before persistence instead of storing or blocking on fake citations.

## 2026-05-20 Legacy Compatibility Migration
- The original quality-gate script was marked as a legacy compatibility runner and removed.
- Its useful assertions now live under `.ai/scripts/topic-selection-workflow-scenario-runner.mjs` as registered WorkflowScenario execution for `topic-selection.real-e2e.scale-quality.v1`.
- The preserved assertion set covers sample hash presence/stability, selected-set stability, role target counts, selected literature role-semantics prechecks, PaperProject intake invariants, downstream feedback/recheck counts, and the v1b non-advance negative stop.
- `pnpm topic-selection:real-e2e:quality-gate` remains available, but it is now a thin command wrapper over the registered scenario id rather than a standalone quality script.
- The migrated smoke run found and fixed a stale rationale/method-family issue in resource sampling when deterministic guardrails canonicalized the selected role after LLM classification.
