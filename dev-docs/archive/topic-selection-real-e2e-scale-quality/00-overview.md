# 00 Overview

## Status
- State: done
- Task: T-085
- Current focus: completed 32-literature real-resource scale, stability, and quality-degradation acceptance.

## Goal
- Extend T-084's 16-literature real E2E canary into a broader scale-quality gate.
- Run 32-literature provider E2E repeatedly to verify sampling stability and quality under a larger selected set.
- Add a deterministic v1b quality negative that stops before package/v1c when value gates do not support advancement.
- Produce an audit table that supports human spot checking of selected resource roles.

## Non-goals
- Do not put provider E2E into default test suites.
- Do not require provider credentials for `pnpm test`.
- Do not reset or wipe local DB records.
- Do not claim full resource-pool acceptance; this task is a 32-literature canary plus stability gate.

## Acceptance Criteria
- [x] A durable scale-quality gate script exists under `.ai/scripts/`.
- [x] The gate can run three 32-literature provider E2E attempts and summarize artifacts.
- [x] The gate verifies sample hash stability, selected-set stability, role counts, intake negatives, and downstream recheck counts.
- [x] The gate writes a spot-check audit table for selected literature roles.
- [x] A v1b quality negative run stops before package/v1c and does not create PaperProject intake.
- [x] Targeted tests, `pnpm typecheck`, and project governance lint remain green.
