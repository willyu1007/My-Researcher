# Contract Diff

- Added `LITERATURE_KEY_CONTENT_READY_METHOD`.
- Type: `enum`.
- Values: `llm_gateway`, `codex_curated`, `manual_curated`.
- Default: `codex_curated`.
- Added explicit `codex_curated` values to `env/values/dev.yaml`, `env/values/staging.yaml`, and `env/values/prod.yaml`.
- Regenerated:
  - `env/.env.example`
  - `docs/env.md`
  - `docs/context/env/contract.json`

No secret refs or secret values were added.
