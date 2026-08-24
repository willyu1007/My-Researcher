# Plan

## Closure Status
T-108 is closed for the v1c WorkflowHarness hardening boundary. The implemented chain is N1 -> N2 -> N3 -> N4 -> N5, with N6 as record-only downstream feedback/recheck ingress. No PaperImplementation or downstream intake execution is part of the P0 acceptance boundary.

## Phase 1 - Current-State Mapping
- Inventory v1c contracts, routes, services, repositories, tests, scripts, archived packages, and active downstream acceptance docs.
- Lock the T-108 boundary to v1c WorkflowHarness hardening only: frozen v1c input through promotion/bridge/downstream feedback-recheck, excluding PaperImplementation and downstream intake consumption from P0 acceptance.
- Map each v1c node to the v1a normalization dimensions:
  - automatically callable;
  - frozen input snapshot;
  - authority writer;
  - deterministic-only, human/delegated, or Codex/provider advisory invocation slot;
  - blockers and warnings;
  - replay/idempotency;
  - handoff output.

## Phase 2 - Promotion Authority Policy
- Reconfirm human/delegated authority for promotion decisions.
- Define any Codex/provider semantic-review role as advisory only.
- Tighten gate support and promotion dossier semantics so model-like review cannot bypass deterministic promotion constraints.

## Phase 3 - Bridge And Handoff Hardening
- Verify `PaperProjectBridge` creation uses stable refs, idempotency, and no direct PaperProject side effect.
- Treat `PaperProjectBridge` as the v1c terminal handoff authority for T-108 P0 scope.
- Ensure downstream feedback/recheck produces append-only typed signals without entering PaperImplementation or PaperProject consumption flows.

## Phase 4 - WorkflowHarness Scenarios
- Add or refine scenarios for:
  - promote;
  - promote with conditions;
  - non-promote;
  - stale package/gate input;
  - duplicate bridge creation;
  - downstream feedback loopback;
  - replay/idempotency.
- Include provider/Codex canaries only for advisory promotion support nodes where node policy permits model-like execution and deterministic admission preserves authority boundaries.

## Phase 5 - Review And Cleanup
- Check active/archived v1c docs for semantic drift.
- Remove or mark stale compatibility scripts/tests if they imply a second v1c path.
- Record verification and readiness for archival.

Closure result: complete. The canonical orchestration path is split N2/N3 through the harness adapter contract. Compatibility wrappers may remain for legacy callers, but acceptance evidence and harness control must not treat them as a separate workflow path.

## Decision Alignment
- Confirm D1 boundary before node-level decisions.
- Align v1c nodes one by one before defining the acceptance matrix.
- Record node decisions in `06-node-decision-alignment.md`.
