# 03 Implementation Notes

## 2026-05-20 - Task Package Created
- Created `T-099` for implementation AI workflow harness.
- Depends on T-097 trace kernel, T-096 work-order boundary, and deterministic gates from T-094/T-095/T-098.
- No product code changes were made.

## Open Notes
- Reuse domain-neutral runtime patterns; do not create implementation-specific provider routing.

## 2026-05-21 - Backend Minimum Closure
- Added shared AI workflow harness contracts and package exports.
- Added Prisma schema/migration for harness, input snapshots, harness runs, proposal artifacts, quality signals, gate results, transition attempts, and decision work queue items.
- Added in-memory and Prisma repositories plus `PaperImplementationAiWorkflowHarnessService`.
- Wired REST routes through `PaperImplementationController` and `buildApp`.
- Enforced proposal-only semantics:
  - active `ImplementationProject` required;
  - all harness invariants must be enabled;
  - every run requires `ImplementationInputSnapshot`;
  - mock/product run-mode isolation blocks invalid model/execution combinations;
  - proposal artifacts require artifact refs and complete T-097 trace manifests;
  - direct authority mutation refs and memo/summary-as-evidence produce blocked runs, quality signals, and queue items.
- Did not add real LLM/provider invocation, model routing, UI, experiment execution, authority state writes, or `research-argument` behavior.

## 2026-05-21 - Post-Review Closure Fix
- Tightened harness run reference validation so proposal target/source/trace refs must stay inside the `ImplementationInputSnapshot` boundary:
  - proposal target must match the snapshot target;
  - proposal source refs cannot use excluded refs and must be present in included snapshot context;
  - proposal trace manifest refs must be present in the snapshot trace context.
- Fixed in-memory repository response shaping so persistence-only `spec` is never returned by the service/API response; memory and Prisma paths now align to `CreateAgentWorkflowHarnessRunResponse`.
- Added regression coverage for stale trace refs, disabled harness invariants, spec/schema mismatch, excluded/out-of-snapshot refs, strict response schema leakage, route malformed payloads, and route response shape.
