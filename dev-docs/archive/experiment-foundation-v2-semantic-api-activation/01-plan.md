# T-135 Plan

## Phase 0 — Governance and named-local activation — complete

1. Archive completed T-106 and T-134 bundles and reconcile the T-132 live verdict in the operator runbook.
2. Confirm repo-Prisma SSOT, exact named-local identity and pending migration list.
3. Review the four existing migration SQL files for destructive operations.
4. Create and verify a PostgreSQL recovery point.
5. Apply with `prisma migrate deploy`; verify 75/75 migration status and expected objects.

Exit: named-local is migration-current without changing capability flags or product data.

## Phase 1 — HTTP contracts and runtime composition — complete

1. Add closed shared request/rebuild-response schemas.
2. Add a gateway-backed embedding adapter that implements the existing document/query embedding ports.
3. Add one application service that resolves the configured active embedding profile and delegates to the existing T-134 index/retrieval services.
4. Add thin controller/routes for project-scoped rebuild and retrieval.
5. Wire Prisma projection, structured lineage, settings and `BackendLlmGateway` in `buildApp`.
6. Add one default-false capability key requiring committed v2 cutover.

Exit: explicit APIs exist, have no direct provider SDK dependency and preserve the structured authority path.

## Phase 2 — Verification and handoff — complete

1. Run shared contract, adapter/application-service and HTTP integration tests.
2. Run shared/backend typecheck and relevant regressions.
3. Verify OpenAPI/API index and generated env/DB context.
4. Run named-local default-off smoke and migration status.
5. Sync governance and record the final worktree state.

Exit: T-135 acceptance criteria are evidenced; capability remains disabled unless separately enabled.

All original phase exits were satisfied on 2026-08-03. A subsequent quality review reopened the
task for the remediation phase below; archival remains approval-gated.

## Phase 3 — Quality remediation — complete

1. Add project-scoped rebuild single-flight, bounded execution/caller cancellation and a
   pre-write/post-write authoritative snapshot drift fence.
2. Replace per-Cycle semantic candidate reads with one project-scoped bulk lineage snapshot.
3. Add an enabled, non-empty `buildApp` HTTP integration that exercises active-profile resolution,
   the shared embedding gateway adapter, projection rebuild and semantic retrieval.
4. Make the shared runtime schemas and OpenAPI error/fallback responses one exact public contract.
5. Re-run typecheck, focused service/route/repository tests, generated API checks and governance.

Exit: concurrent/retried rebuilds do not duplicate same-process provider work or report an
unverified stale projection; retrieval performs a bounded number of project lineage queries; the
enabled HTTP path is proven without real credentials; OpenAPI accepts every runtime response.

Outcome on 2026-08-03: exit satisfied. Focused runtime tests passed 84/84 with two relational
slots then rerun successfully against a marker-verified disposable PostgreSQL database. Full
workspace typecheck, OpenAPI quality/API-index verification and the LLM registry gate also passed.

## Risk controls

- Backup and exact target identity precede every named-local write.
- Migration strategy is deploy-only; no `migrate dev`, `db push`, backfill or schema editing.
- Provider calls occur only through `BackendLlmGateway` and only when the capability is enabled.
- An incompatible embedding profile cannot write a partial projection.
- Retrieval provider/index failures return the complete structured candidate set.
- Rebuilds never hold a database transaction across provider work; concurrency is coordinated at
  the application boundary and source freshness is checked around atomic replacement.
