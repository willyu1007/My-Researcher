# Status

## Goal
Make `.ai/llm` the runtime source of provider, model, native parameter, prompt-reference, and tool configuration for existing LLM workflows, while aligning UI change governance with the consumed design system without changing current product behavior or forcing a visual rewrite.

## Progress
- State: done
- Current phase: Complete
- Next step: Archive the verified task bundle.
- Blocker: none

## Done when
- [x] Existing production LLM calls resolve shipped provider, model, parameter, prompt, and tool configuration from validated `.ai/llm` feature files with no superseded parallel hardcoded authority.
- [x] Secure provider secrets, persisted user profile selections, provider protocols, retries, telemetry, structured-output schemas, semantic hashes, and replay/idempotency behavior remain compatible or have an explicitly verified transition.
- [x] `.ai/llm` is available in supported local, test, packaged, and deployment execution paths and is covered by focused configuration validation.
- [x] Maintained UI guidance and the current design record identify actual users/tasks, consumed tokens/components, reuse order, canonical icons, accepted deviations, and the static HTML mock gate for future non-trivial visual changes.
- [x] CI-equivalent checks, focused tests, typecheck, governance lint, documentation review, and a residue scan support semantic convergence without restoring legacy skills or approval machinery.
