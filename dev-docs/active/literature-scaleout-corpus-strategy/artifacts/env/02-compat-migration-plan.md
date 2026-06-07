# Env Compatibility Migration Plan

## Status
- Completed.

## Plan
- Local developers may optionally add provider values to `.env.local`.
- If absent:
  - OpenAlex runs without an API key and uses `OPENALEX_MAILTO` only when configured.
  - Semantic Scholar may return provider-level rate-limit errors; B10 records those errors and continues.
- Staging/prod provider rollout is not part of this task.

## Rollback
- Remove B10 provider env variables from `env/contract.yaml`.
- Regenerate env artifacts with `env_contractctl.py generate`.
- No secret values are stored in the repo.
