# Environment Contract Change Intent

## Summary

- Change type: add
- Target env(s): dev, staging, prod
- Affected service(s)/component(s): PaperImplementation v2 experiment admission entrance

## Context

- The authorized T-132 Pack A implementation requires one dedicated, default-off product admission capability.
- The SSOT change is limited to `env/contract.yaml`; deterministic generation owns `env/.env.example`, `docs/env.md`, and `docs/context/env/contract.json`.

## Rationale

- `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` provides an explicit guard for accepting new PI experiment v2 admissions.
- Default `false` preserves zero-write behavior until a separate product-enable authorization.
- The guard is admission-only: it must not stop replay or draining of integration events that were committed before intake was disabled.

## Risk assessment

- Breaking change? no
- Requires rollout coordination? no for this contract-only, default-off addition
- Compatibility window and fallback: not applicable; absence and explicit `false` have the same disabled behavior

## Human inputs required

- None. The key name, scope, type, and default are fixed by the authorized T-132 readiness package.
