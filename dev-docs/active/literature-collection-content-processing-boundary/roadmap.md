# Roadmap

## Goal
- Split literature management into explicit collection and content-processing chains.
- Collection records literature and sources only.
- Content processing extracts content, chunks, embeds, indexes, and persists semantic data only after an explicit run.

## Milestones
1. Rename public contracts and API paths from import/pipeline to collections/content-processing.
2. Decouple collection from automatic processing runs.
3. Update desktop callers and overview field names.
4. Regenerate API context and verify backend/shared/desktop checks.

## Key decisions
- Do not add Prisma migrations.
- Keep the existing seven stage codes and internal persistence models.
- Remove old REST paths instead of keeping compatibility aliases.
