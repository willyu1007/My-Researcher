# Status

## Goal
Add a fourth execution line, `codex_cli`, in which the product itself drives the Codex CLI against a
product-owned, consumer-scoped MCP tool surface, and records the run's tool-call trace as the
provenance of record.

## Progress
- State: done
- Current phase: Complete. All three phases landed, a gpt-6-astra cross-model review's six findings
  were confirmed and fixed, and the full suites and the four live checks are green.
- Next step: Archive. Routing a real research node to the line is a separate follow-up that waits
  on the `calibration_gate_release` sign-off which holds the debate dormancy gate closed.
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
