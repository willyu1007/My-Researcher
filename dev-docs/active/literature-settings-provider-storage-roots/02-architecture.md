# 02 Architecture

## Provider Settings
- Use a provider-neutral settings entry point.
- First provider target is OpenAI.
- Settings should support future providers without adding separate UI surfaces.

## Model Options
- Default embedding profile: `openai/text-embedding-3-large`.
- Economy profile: `openai/text-embedding-3-small`.
- Dimensions remain configurable, with `null` meaning provider default.

## Storage Roots
- Raw literature files.
- Normalized text outputs.
- Content-processing artifacts/cache.
- Local indexes.
- Export/output directory.

## DB Boundary
- Current persistence did not have an app-wide settings store suitable for provider profiles, storage roots, and redacted secrets.
- Added `ApplicationSetting` through Prisma SSOT with `namespace`, `key`, JSON `value`, optional `secretValue`, timestamps, and unique `namespace + key`.
- Added Prisma migration `20260505083000_add_application_setting` for the new table and indexes.
- No permission/multi-user storage model in this version.

## Secret Boundary
- Provider secrets are stored in `secretValue`.
- Read APIs only return `api_key_set` and `api_key_last_updated_at`; raw API keys are never returned.
- DB-at-rest encryption and OS keychain integration are out of scope for this first version.
