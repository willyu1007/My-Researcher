# T-134 Environment Contract Diff

## Phase 2 retained diff

- Added optional non-secret boolean `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED`, default `false`.
- Existing values files needed no entry because the contract default is authoritative.
- The change was additive and non-breaking.

## Phase 3A high-level change list

- Added: `EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED`
- Removed: none
- Renamed: none
- Deprecated: none
- Type changes: none
- Default changes: none

## Detailed notes

- The added key is a non-secret optional boolean with default `false`, applicable to every environment.
- It gates only immutable ExperimentFoundation v2 exploration-specification revision intake, grants no execution or evidence authority, and still requires the committed v2 cutover.
- The addition is backward compatible because an unset key preserves the disabled behavior.

## Security notes

- No secret values or secret references were introduced.
