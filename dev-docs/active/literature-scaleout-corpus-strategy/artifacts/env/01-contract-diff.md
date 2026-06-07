# Env Contract Diff

## Status
- Completed.

## Changed Files
- `env/contract.yaml`
- `env/secrets/dev.ref.yaml`
- generated `env/.env.example`
- generated `docs/env.md`
- generated `docs/context/env/contract.json`

## Additions
- Added optional non-secret `OPENALEX_MAILTO`.
- Added optional secret `OPENALEX_API_KEY` with `secret_ref=openalex_api_key`.
- Added optional secret `SEMANTIC_SCHOLAR_API_KEY` with `secret_ref=semantic_scholar_api_key`.
- Added dev secret refs pointing to gitignored `.env.local` keys.

## Compatibility
- Non-breaking.
- Existing local, staging, and prod workflows do not require these keys.
