# T-134 Environment Compatibility & Migration Plan

## Phase 2 retained plan

- Existing deployments remain promotion-disabled with no configuration change.
- A later rollout may enable promotion only alongside committed v2 cutover and after the versioned migration is applied.
- Rollback disables the promotion flag while preserving typed outcomes and outbox history.

## Phase 3A change classification

- Backward compatible: yes
- Requires coordinated rollout: no
- Requires secret manager changes: no

## Phase 3B change classification

- Backward compatible: yes
- Requires coordinated rollout: no
- Requires secret manager changes: no

## Migration steps

1. Merge the contract and generated artifacts with the Phase 3A implementation.
2. Keep the key unset or `false`; T-134 Phase 3A does not authorize local, cloud, staging, or production enablement.
3. A later explicit rollout decision may set the key only after the committed ExperimentFoundation v2 cutover is enabled and verified.
4. Keep the Phase 3B attachment key unset or `false`; later enablement additionally requires PI v2 admission to be enabled.

## Rename / deprecation policy

- Not applicable; this is a new additive key.

## Rollback plan

- Leave the key unset or set it to `false`. No secret or destructive migration is involved.

## Approvals

- Required approver: T-134 owner
- Approval: user authorized Phase 3 EF-P15 before implementation.
