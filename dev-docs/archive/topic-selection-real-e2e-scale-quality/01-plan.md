# 01 Plan

## Phase 1 - Gate Script
- Add the scale-quality scenario under `.ai/scripts/topic-selection-workflow-scenario-runner.mjs`.
- Reuse `.ai/scripts/topic-selection-real-e2e.mjs` as the execution primitive.
- Capture logs and artifacts under `.ai/.tmp/topic-selection-real-e2e-quality/<run-id>/`.
- Retired the legacy compatibility script `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` on 2026-05-20 after its assertions were covered by `topic-selection.real-e2e.scale-quality.v1`.

## Phase 2 - Scale and Stability Checks
- Run 32-literature provider E2E three times.
- Compare sample hashes and selected `literature_id + role` sets across runs.
- Check role counts against default role targets.
- Fail on risk-heavy support, weak baseline, weak challenge, missing PaperProject intake, or failed negative intake boundaries.

## Phase 3 - v1b Quality Negative
- Add a deterministic negative mode to the real E2E runner.
- Make v1b value assessment return `needs_refinement` with `refine_question`.
- Run with `TOPIC_SELECTION_REAL_ALLOW_NON_ADVANCE_V1B=1` and assert no package/v1c/PaperProject intake is produced.

## Phase 4 - Verification
- Run the quality gate.
- Run root test/typecheck.
- Run governance sync/lint.
