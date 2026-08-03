# Compatibility Migration Plan

No value migration is required. Existing environments leave the key unset and therefore disabled.

An operator may enable it only after:

1. committed v2 cutover is enabled;
2. the durable Prisma schema includes the semantic projection migration;
3. the active shared embedding profile is OpenAI-compatible with 3072 dimensions.

Rollback is setting the key to `false` or unsetting it; stored semantic projections remain rebuildable, non-authoritative data.
