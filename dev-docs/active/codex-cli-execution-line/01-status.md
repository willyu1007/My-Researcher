# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: in-progress
- Current phase: Phase 2 complete. The product serves its own MCP tool surface, a real Codex client
  reaches it over HTTP, and handles are minted and released with the invocation attempt.
- Next step: Phase 3 — route one N6 divergent-debate role through the `codex_cli` line and let the
  existing deterministic gate admit its artifact.
- Blocker: none. T-148 shares this worktree; stage explicit paths and preserve its changes.

## Done when
- [ ] One N6 divergent-debate role runs end to end on the `codex_cli` line: product-authored prompt
      packet in, an artifact constrained by `--output-schema` out, the recorded trace persisted as
      provenance, and the existing deterministic gate still owning admission.
- [x] The tool surface enforces scope from the attempt handle: a research-role handle is refused a
      tool outside its scope, proven by a negative test rather than by building a second scope.
- [x] A runtime read budget is enforced inside the product's MCP server and its refusal is visible
      in the recorded trace.
- [x] The session rule holds in code: one fresh Codex thread per invocation attempt, with no reuse
      across roles, attempts, nodes or runs.
- [x] The advisory `model_hint` field (commit `0f5a3d39`) is removed and the contract reflects it.
