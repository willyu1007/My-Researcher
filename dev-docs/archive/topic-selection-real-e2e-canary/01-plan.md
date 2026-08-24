# 01 Plan

## Phase 1 - Runner Productization
- Promote the existing temporary real-flow harness into a durable script under `.ai/scripts/`.
- Preserve the existing resource sampling, v1a, v1b, v1c, and downstream feedback coverage.
- Add PaperProject intake as an explicit stage after bridge creation.

## Phase 2 - Negative Boundaries
- Validate malformed intake payloads return `INVALID_PAYLOAD`.
- Validate stale bridge hash and workspace drift reject before downstream creation.
- Validate duplicate intake is idempotent.
- Validate a deliberately non-active bridge rejects intake and restore the bridge state after the check.

## Phase 3 - Execution
- Run the canary with deterministic mock LLM over the real DB and real resource records.
- Run the canary with the configured provider if credentials are present and latency is acceptable.

## Phase 4 - Regression Gates
- Run root `pnpm test`.
- Run root `pnpm typecheck`.
- Run project governance sync/lint.
