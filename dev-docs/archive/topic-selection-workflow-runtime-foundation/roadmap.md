# Roadmap

## Why This Exists
- Real topic-selection testing proved that v1a/v1b/v1c logic is testable, but workflow execution currently depends on a mix of service tests, route tests, and script-level runners.
- Before adding deeper agent participation or debate, the project needs one reusable runtime surface for scenario setup, node execution, LLM profile choice, trace capture, and quality assertions.

## Target Outcome
- Topic-selection workflow tests and real-flow rehearsals run through one harness.
- Agent-like steps are explicit, typed, auditable, and provider-agnostic.
- Profile escalation becomes a product policy, not per-script branching.

## Exit Criteria
- Existing real E2E coverage is migrated without losing evidence assignment checks.
- New workflow nodes can be added by defining a node contract and assertions, not by copying an E2E script.
