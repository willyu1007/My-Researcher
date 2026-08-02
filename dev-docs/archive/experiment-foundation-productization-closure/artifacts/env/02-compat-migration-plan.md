# Compatibility & Migration Plan

## Change classification

- Backward compatible: yes
- Requires coordinated rollout: no for contract generation; a later product-enable decision remains separately authorized
- Requires secret manager changes: no

## Migration steps

1. Merge the optional default-off contract key and generated non-secret artifacts.
2. Wire runtime admission parsing and enforcement in the separately owned backend slice. Completed in Pack A; durable Prisma composition plus explicit env `true` is required, while non-durable composition fails closed.
3. Keep the value absent or `false` in every environment until explicit product-enable authorization.
4. When later enabled, change only the runtime-injected configuration for the approved environment; do not couple relay/consumer draining to the admission switch.

## Rename / deprecation policy

- No rename or deprecation is involved.
- Dual-read window: not applicable.
- Dual-write window: not applicable.
- Removal date: not applicable.

## Rollback plan

- Keep or restore the runtime value to `false` to stop new v2 admissions.
- Do not delete committed PI/EF outbox or inbox lineage, and continue replay/drain processing.
- Contract artifact rollback is safe before runtime adoption because the key is optional and defaults to disabled.

## Approvals

- Required approver(s): repository owner for T-132 Pack A
- Approval timestamp: authorized in the implementation conversation on 2026-07-13
