# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: in-progress
- Current phase: Phase 1 complete, including the live check. The line exists as a contract, a
  runner and a persisted trace, and one real invocation has run through it end to end.
- Next step: Start Phase 2 by serving the MCP tool surface from the backend over HTTP, beginning
  with the endpoint and the older-revision shim that Codex still needs.
- Blocker: none. T-148 shares this worktree; stage explicit paths and preserve its changes.

## Done when
- [ ] One N6 divergent-debate role runs end to end on the `codex_cli` line: product-authored prompt
      packet in, an artifact constrained by `--output-schema` out, the recorded trace persisted as
      provenance, and the existing deterministic gate still owning admission.
- [ ] The tool surface enforces scope from the attempt handle: a research-role handle is refused a
      tool outside its scope, proven by a negative test rather than by building a second scope.
- [ ] A runtime read budget is enforced inside the product's MCP server and its refusal is visible
      in the recorded trace.
- [x] The session rule holds in code: one fresh Codex thread per invocation attempt, with no reuse
      across roles, attempts, nodes or runs.
- [x] The advisory `model_hint` field (commit `0f5a3d39`) is removed and the contract reflects it.
