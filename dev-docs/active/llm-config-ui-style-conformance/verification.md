# Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| No duplicate active task owns this outcome | Query governance by `llm`, `configuration`, and `ui style`; inspect plausible active results | pass | T-129 owns externally gated calibration/provider-debate tails; historical LLM tasks are archived and do not own configuration-source migration. |
| Baseline governance is valid | `node .ai/scripts/ctl-project-governance.mjs lint` | pass | Passed before opening the task on 2026-08-24. |
| LLM and UI authorities are inventoried | Trace production `createStructuredOutput`/embedding paths, model-profile definitions, prompt IDs/system messages, renderer style imports, token usage, and component call sites | pass | 42 model profiles, 31 registered topic-selection prompt IDs, and 94 system-message constructions across 36 production service files. Renderer imports `ui/styles/ui.css`; 2,073 `data-ui` and 649 CSS-variable uses provide positive controls, while TSX has no inline `style={{...}}` or raw hex colors. |
| LLM configuration has one validated runtime authority | Loader schema/path/provider-reference tests and source inventory after migration | not-run | Requires configuration foundation and removal of matching hardcoded defaults. |
| Existing runtime and user settings remain compatible | `node --test --loader ts-node/esm src/services/llm-config-loader.unit.test.ts src/services/llm-gateway.unit.test.ts src/services/literature-content-processing-settings-service.unit.test.ts` from `apps/backend` plus workflow-group tests as prompts move | not-run | Prompt-packet and model-profile hash tests are required before topic-selection/paper-implementation inline authorities are removed. |
| `.ai/llm` reaches supported execution modes | Loader root-override/default-root tests and inspection of backend dev/test/desktop spawn entry points; future packaged backend must provide its app root | not-run | Current backend executes from repository TypeScript and has no package artifact contract. |
| UI guidance is grounded in consumed authority | Trace `main.tsx → ui.css → tokens/contract/desktop-runtime`, representative `data-ui`/CSS-variable consumers, canonical icon usage, and the maintained UI record; run `pnpm desktop:typecheck` after source changes | not-run | No rendered-state claim or visual redesign is in scope. A stale `gpt-5.5` settings-panel fallback is an in-scope data-contract drift, not a composition change. |
| Repository is semantically converged | Typecheck, relevant lint/tests, governance lint, documentation review, and residue scan | not-run | Run after all migration slices close. |

## Outstanding verification

- Run loader, gateway, settings, and literature workflow tests after the first configuration slice.
- Run prompt-packet/model-profile compatibility checks after each topic-selection and paper-implementation workflow group.
- Run final typecheck, desktop typecheck, governance lint, documentation review, and duplicate-authority residue scan.
