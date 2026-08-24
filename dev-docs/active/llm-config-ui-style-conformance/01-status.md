# Status

## Goal
Make `.ai/llm` the runtime source of provider, model, native parameter, prompt-reference, and tool configuration for existing LLM workflows, while aligning UI change governance with the consumed design system without changing current product behavior or forcing a visual rewrite.

## Progress
- State: in-progress
- Current phase: Topic-selection prompt migration
- Next step: Continue migrating Topic Selection prompt families through the feature prompt catalog, beginning with the v1b single-agent runtime services that already carry byte-stability tests.
- Blocker: none

## Done when
- [ ] Existing production LLM calls resolve shipped provider, model, parameter, prompt, and tool configuration from validated `.ai/llm` feature files with no superseded parallel hardcoded authority.
- [ ] Secure provider secrets, persisted user profile selections, provider protocols, retries, telemetry, structured-output schemas, semantic hashes, and replay/idempotency behavior remain compatible or have an explicitly verified transition.
- [ ] `.ai/llm` is available in supported local, test, packaged, and deployment execution paths and is covered by focused configuration validation.
- [ ] Maintained UI guidance and the current design record identify actual users/tasks, consumed tokens/components, reuse order, canonical icons, accepted deviations, and the static HTML mock gate for future non-trivial visual changes.
- [ ] CI-equivalent checks, focused tests, typecheck, governance lint, documentation review, and a residue scan support semantic convergence without restoring legacy skills or approval machinery.
