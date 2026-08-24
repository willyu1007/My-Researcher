# Roadmap

## Summary
- Decision: `NEW_TASK`
- Task ID: `T-108`
- Slug: `topic-selection-v1c-workflow-hardening`
- Mapping: `M-001 > F-001 > R-009 > T-108`

## Why Now
v1a implementation established robust node-level automation standards, and v1c is the terminal promotion/bridge stage where authority mistakes have high downstream blast radius. v1c needs the same normalization before it can safely support high-quality automated or semi-automated end-to-end topic selection.

## Milestones
1. Current-state mapping against code, contracts, archived v1c packages, and active downstream acceptance docs.
2. Promotion authority and semantic-review policy closure.
3. Bridge/handoff/downstream feedback hardening.
4. WorkflowHarness scenario coverage and replay/idempotency tests.
5. Provider/Codex canary only for explicitly advisory semantic-review nodes.

## Out Of Scope
- v1b package generation details.
- PaperImplementation authority creation.
- Desktop UI.
- Open-ended multi-agent debate for promotion decisions.
