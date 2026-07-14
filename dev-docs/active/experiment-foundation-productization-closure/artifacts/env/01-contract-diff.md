# Environment Contract Diff (Summary)

## High-level change list

- Added: `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED`
- Removed: none
- Renamed: none
- Deprecated: none
- Type changes: none
- Default changes: none

## Detailed notes

- Key: `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED`
  - Type: `bool`
  - Requiredness: optional
  - Secret: no
  - Default: `false`
  - Scope: all declared environments (`dev`, `staging`, `prod`)
  - Compatibility impact: backward compatible; unset deployments remain disabled
  - Operational boundary: gates only new PI experiment v2 admissions and does not gate replay or draining of already committed PI/EF integration events

## Security notes

- Confirmed: no secret values were introduced.
- No `env/values/*.yaml` or `env/secrets/*.ref.yaml` changes are required for an optional non-secret key with a contract default.
