# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: in-progress
- Current phase: Planned. All nine decisions are closed and the route is three phases; Phase 1 has
  not started.
- Next step: Start Phase 1 by removing the advisory `model_hint` field and its test as a manual
  edit, then add the execution mode and output source kind for the new line.
- Blocker: none. T-148 shares this worktree; stage explicit paths and preserve its changes.

## Done when
- [ ] One N6 divergent-debate role runs end to end on the `codex_cli` line: product-authored prompt
      packet in, an artifact constrained by `--output-schema` out, the recorded trace persisted as
      provenance, and the existing deterministic gate still owning admission.
- [ ] The tool surface enforces scope from the attempt handle: a research-role handle is refused a
      tool outside its scope, proven by a negative test rather than by building a second scope.
- [ ] A runtime read budget is enforced inside the product's MCP server and its refusal is visible
      in the recorded trace.
- [ ] The session rule holds in code: one fresh Codex thread per invocation attempt, with no reuse
      across roles, attempts, nodes or runs.
- [ ] The advisory `model_hint` field (commit `0f5a3d39`) is removed and the contract reflects it.
