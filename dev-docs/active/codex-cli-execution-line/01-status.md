# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: planned
- Current phase: Opening and design alignment — probe evidence collected, route not yet authorized
- Next step: Confirm D-7, then plan the task. Phase 1 is additive and unblocked; the D-8 slice waits on a stable T-148 N6 Debate contract, and the tool-surface phases wait on Codex adopting MCP 2026-07-28.
- Blocker: none

## Done when
- [ ] One debate role runs end to end on the `codex_cli` line: product-authored prompt packet in, an
      artifact constrained by `--output-schema` out, the recorded trace persisted as provenance, and
      the existing deterministic gate still owning admission.
- [ ] The tool surface is scoped per consumer: a research-role scope cannot reach any tool that
      advances the workflow.
- [ ] A runtime read/token budget is enforced inside the product's MCP server and is visible in the
      recorded trace.
- [ ] The session rule holds in code: one fresh Codex thread per invocation attempt, with no reuse
      across roles, attempts, nodes or runs.
- [ ] The fate of the advisory `model_hint` field (commit `0f5a3d39`) is resolved and the contract
      reflects the decision.
