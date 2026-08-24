# Roadmap

## Summary
- Decision: `NEW_TASK`
- Task ID: `T-107`
- Slug: `topic-selection-v1b-workflow-hardening`
- Mapping: `M-001 > F-001 > R-009 > T-107`

## Why Now
v1a implementation established a higher execution standard: node-level policies, frozen context, invocation-slot semantics, deterministic admission gates, replay/idempotency, and WorkflowHarness scenarios. v1b has already been implemented and tested in earlier packages, but it needs the same normalization and hardening before it can be treated as product-grade automation.

## Milestones
1. Current-state mapping against code, contracts, archived task packages, and existing tests.
2. Node policy closure for every v1b node.
3. Runtime/contract alignment for model-like nodes.
4. Test matrix implementation and mocked full v1b harness path.
5. Provider/Codex canary and semantic drift review.

## Out Of Scope
- v1c promotion details.
- Desktop UI.
- New DB schema unless explicitly justified by readiness review.
