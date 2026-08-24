# 04 Verification

## Planned Checks
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`

## Review Checklist
- [x] Every child package has `00-overview.md` through `05-pitfalls.md` and `roadmap.md`.
- [x] Every review issue has an owner or explicit gap plan.
- [x] Parent package points to the child packages.

## 2026-05-17
- [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: child packages are registered and governance lint passes.

## 2026-05-17 - Landing Verification
- Expected:
  - `T-069` is marked `done` and remains under `dev-docs/active/`.
  - `T-043` remains `planned`.
  - `T-070` remains `planned`.
  - all experiment-foundation child tasks remain mapped to `M-001 > F-001 > R-012`.
  - governance sync and lint pass.
- Actual:
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - [pass] registry shows `T-069` as `done`, `T-070` as `planned`, and `T-043` as `planned`
  - [pass] `T-069` remains under `dev-docs/active/`

## 2026-05-17 - Post-closure drift verification
- Expected:
  - parent and child packages do not retain old design-review semantic drift
  - mother package records product functional closure separately from task governance closure
  - governance sync and lint pass
- Actual:
  - [pass] active experiment-foundation docs no longer contain stale fine-tuning object naming, selected-platform wording, old candidate lifecycle, or old benchmark leaderboard-ref wording
  - [pass] mother package now includes `07-quality-closure-review.md`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - [pass] `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
