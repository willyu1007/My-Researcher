# Pitfalls

## Do Not Repeat
- Do not leave compatibility aliases such as `researchArgumentWritingEntryPacketSchema`; aliases are enough to revive a second writing-entry semantic path.
- Do not remove Prisma models without refreshing `docs/context/db/schema.json`.
- Do not apply destructive DB migrations to a live database as part of cleanup without explicit approval.

## Resolved Issues
| Date | Symptom | Root cause | Fix / workaround | Prevention |
|---|---|---|---|---|
