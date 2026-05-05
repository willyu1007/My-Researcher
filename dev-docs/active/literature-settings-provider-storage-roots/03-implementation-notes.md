# 03 Implementation Notes

## Log
- 2026-05-05: Created child task from `T-030` for provider/API-key settings and storage root settings.
- 2026-05-05: Added generic DB-backed `ApplicationSetting` persistence through Prisma SSOT and migration `20260505083000_add_application_setting`, with JSON `value`, optional `secretValue`, timestamps, and `namespace + key` uniqueness.
- 2026-05-05: Added backend repository implementations for application settings, including Prisma and in-memory variants for tests.
- 2026-05-05: Added `GET /settings/literature-content-processing` and `PATCH /settings/literature-content-processing`.
- 2026-05-05: Implemented redacted provider settings reads. API responses expose `api_key_set` and `api_key_last_updated_at`, never raw `api_key`.
- 2026-05-05: Implemented patch semantics for OpenAI key replacement, clearing, and preservation when omitted.
- 2026-05-05: Added default embedding profiles: `openai/text-embedding-3-large` and economy `openai/text-embedding-3-small`, both with provider-default dimensions.
- 2026-05-05: Added storage root settings for raw files, normalized text, artifacts/cache, indexes, and exports.
- 2026-05-05: Replaced literature embedding/retrieval env-var lookup with settings accessors; the old env/settings dual path is not retained.
- 2026-05-05: Added desktop literature content-processing settings panel for provider key, profile selection, and storage root configuration.
- 2026-05-05: Quality review tightened application settings repository strategy consistency when title-card management uses Prisma, so DB-backed settings cannot accidentally run in a memory side path.
- 2026-05-05: Quality review verified `api_key_last_updated_at` is stored as provider metadata and is preserved across non-secret settings updates.

## Resolved Decisions
- Persistence uses the new generic `ApplicationSetting` table.
- Secrets are stored in DB `secretValue` for this first version and are redacted from reads.
- DB-at-rest encryption and OS keychain integration remain out of scope for this task.
- Storage root path writability/accessibility checks are deferred to file-consuming tasks such as `T-033` and operational cleanup tasks.
- Application settings must share the Prisma/memory repository strategy selected for the rest of the title-card/literature backend when title-card management is Prisma-backed.
