# T-134 Environment Contract Change Intent

## Phase 2 retained intent

- `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` is a non-secret boolean capability. It defaults to `false`, gates only new typed promotion intake, requires `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true`, and never reopens the legacy promotion route.

## Phase 3A summary

- Change type: add
- Target env(s): all environments; disabled by default
- Affected service(s)/component(s): backend ExperimentFoundation v2 exploration-specification intake

## Context

- T-134 Phase 3A authorizes immutable exploration-specification intake behind an explicit capability flag.
- The SSOT change is in `env/contract.yaml`; generated developer and context artifacts are refreshed from it.

## Rationale

- The independent flag prevents an additive Phase 3A route from becoming reachable merely because another ExperimentFoundation v2 capability is enabled.
- The flag remains subordinate to the committed ExperimentFoundation v2 cutover guard.

## Risk assessment

- Breaking change: no
- Requires rollout coordination: no; the default is `false` and this phase does not authorize enablement in any deployed environment.

## Human inputs required

- None. T-134 Phase 3 authorization already covers the additive default-off contract change.
