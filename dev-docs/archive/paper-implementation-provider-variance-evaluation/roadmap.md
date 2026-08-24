# Roadmap

## Decision
Create `T-105 paper-implementation-provider-variance-evaluation` as a separate PaperImplementation infrastructure task. It must not be folded into `T-104`.

## Scope
T-105 evaluates real provider behavior for PaperImplementation AI proposal workflows. It measures whether live model outputs remain contract-valid, trace-aware, proposal-only, and resistant to overclaim drift.

### In Scope
- Provider variance runner or service slice.
- Deterministic fake-provider evaluation path.
- Optional live-provider profile with explicit credentials and skipped/blocked/passed reporting.
- Metrics and artifact schema for repeated runs.
- Integration with T-099 proposal artifact validation and T-101-style evaluation reports.

### Out Of Scope
- Live experiment execution adapter; owned by T-104.
- New authority writes from AI output.
- Default CI dependency on provider credentials.
- UI workbench changes unless needed to expose evaluation read-models.
- Writing ingestion or citation generation.

## Decision Points
| ID | Decision | Recommendation | Status |
|---|---|---|---|
| V1 | Should provider variance be inside T-104? | No; keep execution and AI evaluation separate. | confirmed |
| V2 | Is live provider evaluation required for default closure? | No. Default closure uses deterministic fake-provider scenarios; real provider runs are explicit opt-in canaries with credential preflight and skipped/blocked/passed reporting. | confirmed |
| V3 | What is the minimum metric set? | Use only metrics consumed by concrete workflow decisions. Required flow metrics are contract validity, handoff readiness, authority violation, traceability violation, claim safety violation, workflow stability, human review burden, and provider operability. Metrics without a consumer are diagnostics only. | confirmed |
| V4 | Should provider output create quality signals? | Yes, but only governance signals: evaluation artifacts, quality signals, decision queue blockers, and provider/profile recommendations. They are consumed by existing gates/schedulers/reviewers/config owners and must never create or mutate PaperImplementation domain authority. | confirmed |
| V5 | Should topic-selection provider canary be reused? | Reuse infrastructure patterns only: opt-in profile, credential preflight, skipped/blocked/passed reporting, redacted artifacts, fixed snapshots, and provider/model/prompt metadata. Do not reuse topic-selection business semantics, node policies, ref allowlists, output shape, or success criteria. | confirmed |

## Recommended Execution Order
1. Audit T-099 and T-101 evaluation surfaces.
2. Define flow-oriented metrics and artifact schema.
3. Implement fake-provider variance runner.
4. Add optional live-provider profile.
5. Add guardrail and aggregation tests.
6. Update docs and governance.

## Completion Signal
T-105 is complete when provider variance can be evaluated repeatedly against fixed PaperImplementation input snapshots, default checks pass without credentials, and optional live-provider runs produce redacted artifacts without mutating authority state.
