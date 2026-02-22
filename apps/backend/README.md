# Backend app

Fastify backend for research lifecycle governance.

## Implemented endpoints

- `POST /paper-projects`
- `POST /paper-projects/:id/version-spine/commit`
- `POST /paper-projects/:id/stage-gates/:gate/verify`
- `POST /paper-projects/:id/writing-packages/build`
- `GET /health`

## Notes

- Route-level validation schemas are sourced from `@paper-engineering-assistant/shared`.
- Snapshot rollback/upgrade is implemented as pointer switching in service layer.
- Test command: `pnpm --filter @paper-engineering-assistant/backend test`
- Repository strategy:
  - default: `RESEARCH_LIFECYCLE_REPOSITORY=memory`
  - Postgres/Prisma: `RESEARCH_LIFECYCLE_REPOSITORY=prisma` (requires `DATABASE_URL` and applied migrations)
