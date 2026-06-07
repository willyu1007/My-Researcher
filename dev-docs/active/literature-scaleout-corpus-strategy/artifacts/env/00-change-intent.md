# Env Change Intent

## Status
- Completed.

## Intent
- Add optional provider configuration for B10 literature candidate discovery.
- Keep provider secrets out of repo files and evidence.

## Variables
- `OPENALEX_MAILTO`
  - optional non-secret contact email for OpenAlex polite-pool identification.
- `OPENALEX_API_KEY`
  - optional secret for high-volume OpenAlex discovery.
- `SEMANTIC_SCHOLAR_API_KEY`
  - optional secret for Semantic Scholar Graph API discovery.

## Non-Goals
- Do not store actual API keys in repo files.
- Do not require provider keys for local dry-run operation.
- Do not configure staging or prod provider secrets in this task.
