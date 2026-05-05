# Roadmap

## Objective
- Establish the canonical content-processing contract before implementation tasks mutate behavior.

## Milestones
1. Inventory contract usage.
2. Replace status/order/action contracts.
3. Migrate backend/desktop consumers.
4. Regenerate contracts and verify.

## Test And Acceptance Baseline
- Contract tests prove `STALE` and new order are canonical.
- Route tests confirm explicit run creation still works.
- UI normalizer tests reject old field names/semantics.
