# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| No duplicate active task owns this outcome | Query governance by `llm`, `configuration`, and `ui style`; inspect plausible active results | pass | T-129 owns externally gated calibration/provider-debate tails; historical LLM tasks are archived and do not own configuration-source migration. |
| Baseline governance is valid | `node .ai/scripts/ctl-project-governance.mjs lint` | pass | Passed before opening the task on 2026-08-24. |
| LLM configuration has one validated runtime authority | Loader schema/path/provider-reference tests and source inventory after migration | not-run | Requires configuration foundation and removal of matching hardcoded defaults. |
| Existing runtime and user settings remain compatible | Focused gateway, settings, workflow, replay/hash, and profile-selection tests | not-run | Exact test set will follow the Phase 1 inventory. |
| `.ai/llm` reaches supported execution modes | Root-resolution tests plus package/deploy input inspection | not-run | Packaging boundary not yet inventoried. |
| UI guidance is grounded in consumed authority | Trace renderer style imports, token/component usage, icon source, and maintained design record with a positive control | not-run | No rendered-state claim or visual redesign is in scope. |
| Repository is semantically converged | Typecheck, relevant lint/tests, governance lint, documentation review, and residue scan | not-run | Run after all migration slices close. |

## Outstanding verification

- Complete the call/profile/prompt/package/UI authority inventory and replace provisional checks with exact commands.
- Run focused migration checks after each workflow group and record only decisive latest evidence.
