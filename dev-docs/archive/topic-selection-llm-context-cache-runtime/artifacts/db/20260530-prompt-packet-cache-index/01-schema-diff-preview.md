# 01 Schema Diff Preview

## Prisma Model Added
- `TopicSelectionPromptPacketCacheIndex`

## Table Added
- `TopicSelectionPromptPacketCacheIndex`

## Stored Data Boundary
- Stores exact prompt packet identity metadata.
- Stores existing redacted prompt artifact refs, prompt-quality report refs, artifact hashes, quality decision, freshness status, provenance ref, blocker codes, and warning codes.
- Does not store rendered prompt text, prompt payloads, provider responses, provider telemetry payloads, credentials, secrets, or business authority payloads.

## Indexes
- Primary key: `promptPacketHash`.
- Query indexes:
  - `promptTemplateId`, `promptTemplateVersion`, `promptVariantKey`
  - `invocationSlotId`, `freshnessStatus`
  - `contextPolicyProfileId`, `contextPolicyProfileVersion`
  - `modelOptionId`
  - `qualityDecision`
  - `updatedAt`

## Destructive Changes
- None. This migration only creates a new table and indexes.
