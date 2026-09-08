# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: in-progress
- Current phase: Phase 3 complete. A canary runs the real N6 question-candidate contract through the
  product's orchestrator on the `codex_cli` line, and its trace lands in the control plane.
- Next step: Close the task, or open a follow-up for routing a research node once the debate
  dormancy gate is released.
- Blocker: none. T-148 shares this worktree; stage explicit paths and preserve its changes.

## Done when
- [x] The line runs end to end inside the product against a real node contract: product-authored
      prompt packet in, an artifact constrained by `--output-schema` out, and the recorded trace
      persisted as provenance. Routing an actual research node is deliberately out of scope while
      the debate dormancy gate stays closed.
- [x] The tool surface enforces scope from the attempt handle: a research-role handle is refused a
      tool outside its scope, proven by a negative test rather than by building a second scope.
- [x] A runtime read budget is enforced inside the product's MCP server and its refusal is visible
      in the recorded trace.
- [x] The session rule holds in code: one fresh Codex thread per invocation attempt, with no reuse
      across roles, attempts, nodes or runs.
- [x] The advisory `model_hint` field (commit `0f5a3d39`) is removed and the contract reflects it.
