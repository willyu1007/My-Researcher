# 00 Overview

## Status
- State: done
- Parent: `T-030 literature-content-processing-landing-roadmap`
- Next step: hand off storage root consumption to `T-033` and embedding profile consumption to `T-035`/`T-036`.

## Goal
- Add one settings entry point for LLM provider API keys and model-related options.
- Add configurable local storage roots for literature content assets and derived outputs.

## Non-goals
- Do not implement per-user permission complexity for this version.
- Do not add metadata-only mode.
- Do not hard-code OpenAI as the only future provider, even though OpenAI embeddings are the first target.

## Scope
- Settings contracts and UI for provider keys.
- Embedding/model options including default `text-embedding-3-large` and economy `text-embedding-3-small`.
- Storage roots for raw files, normalized text, artifacts/cache, indexes, and exports.
- Secret handling and redaction.

## Acceptance Criteria
- [x] Users can configure provider API key(s) through a shared settings area.
- [x] Embedding provider/model/dimensions/profile settings are configurable.
- [x] Users can configure literature storage paths by category.
- [x] Stored secret values are never echoed in API responses or logs.
