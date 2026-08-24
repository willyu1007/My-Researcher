# Plan

## Phase 0 - Boundary Alignment
- [x] Confirm T-105 is separate from T-104.
- [x] Confirm provider variance is evaluation infrastructure, not authority logic.
- [x] Confirm live-provider handling is preflight-only, opt-in, and skipped/blocked by default.
- [x] Confirm output metrics and artifact expectations.

## Phase 1 - Current-State Audit
- [x] Inspect T-099 PaperImplementation AI workflow harness contracts and service behavior.
- [x] Inspect T-101 deterministic evaluation suite and residual-risk report.
- [x] Inspect existing topic-selection provider canary patterns for reusable evaluation shape, without copying topic-selection semantics.

## Phase 2 - Evaluation Contract
- [x] Define provider variance run request/response schema.
- [x] Define stable metrics: contract validity, handoff readiness, authority violation, traceability violation, claim safety violation, workflow stability, human review burden, and provider operability.
- [x] Define redaction boundary: provider credentials and hidden reasoning never enter artifacts; default lane uses deterministic fake provider only.

## Phase 3 - Runner And Service Slice
- [x] Add deterministic fake-provider runner path.
- [x] Add optional live-provider preflight profile.
- [x] Emit aggregate evaluation report without creating a new domain authority object.
- [x] Integrate with existing quality signal / decision queue patterns only when violations are observed.

## Phase 4 - Verification
- [x] Unit tests for aggregation and guardrail metrics.
- [x] Fake-provider tests for deterministic replay, overclaim, preflight, and queue/signal materialization.
- [x] Live-provider default behavior documented as preflight-only skipped/blocked/passed reporting.
- [x] Governance sync/lint and docs verification.
