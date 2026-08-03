# T-135 Experiment Foundation v2 Semantic API Activation

## Status

- State: done
- Task ID: `T-135`
- Mapping: `M-001 > F-001 > R-012 > T-135`
- Origin: product-closure follow-up after T-132/T-134 and T-106 governance reconciliation.
- Current phase: Phase 3 quality remediation complete.
- Next step: no remaining T-135 implementation action; capability rollout remains a separate operator decision.

## Goal

Activate the already-verified T-134 persistence on the named local development database and expose explicit project-scoped v2 semantic index/retrieval APIs over the existing structured-first authority boundary.

## In scope

- Apply the four existing T-134 migrations to the repo-standard named-local PostgreSQL target after a reviewed diff and recovery point.
- Add an explicit project-scoped index rebuild command API and semantic retrieval API.
- Reuse the existing `BackendLlmGateway` plus the configured active literature/topic-management embedding profile and credential store.
- Keep the semantic capability default-off and require committed v2 cutover before provider/index work.
- Preserve complete structured-lineage fallback and all T-134 post-search authority fences.
- Update OpenAPI, API index, environment context, task/governance documentation and targeted tests.

## Non-goals

- No new provider SDK, credential key, model-profile registry or second embedding wrapper.
- No scheduler, background reindex policy, UI, desktop changes or multi-user/auth expansion.
- No real PAI execution, scientific-result finalization or evidence-writer changes.
- No new Prisma model or migration; the task only applies the four already-reviewed T-134 migrations.
- No staging/production database operation.

## Acceptance criteria

- [x] Named-local backup/recovery point is verified before applying migrations.
- [x] All 75 migrations are applied and the four T-134 tables/indexes pass read-only post-verification.
- [x] Index rebuild API resolves project-authorized structured documents before embedding and writes only the project projection.
- [x] Retrieval API preserves project-first authorization, bounded provider/index deadlines, authoritative reread and complete structured fallback.
- [x] Runtime embedding calls use the existing gateway and configured active embedding profile with exact 3072-dimensional compatibility.
- [x] Capability is default false; disabled or invalid configuration produces stable zero-provider/zero-write behavior.
- [x] Shared schemas, service/adapter tests, HTTP integration, typecheck, OpenAPI/API index, env/database and governance checks pass.

The task returned to `in-progress` on 2026-08-03 after an independent implementation-quality
review found release-blocking rebuild coordination and enabled-path verification gaps plus
structured-read and generated-contract issues. The original acceptance evidence remains valid,
and Phase 3 has now closed every review finding with implementation and regression evidence.

## Phase 3 quality-remediation acceptance

- [x] Same-project rebuilds are single-flight, deadline-bounded and cancellation-aware without aborting work still awaited by another caller.
- [x] Authorized source drift is fenced before and after atomic replacement; one bounded retry repairs a concurrent change and continuous drift fails explicitly.
- [x] Semantic candidate construction consumes one repeatable-read project snapshot with fixed-count bulk lineage queries instead of per-Cycle reads.
- [x] Enabled, non-empty `buildApp` HTTP coverage proves active-profile reuse, shared gateway embedding, rebuild persistence and semantic retrieval.
- [x] Shared runtime and OpenAPI expose the same closed semantic reason vocabulary and unbounded complete structured fallback shape.
- [x] Static, runtime, OpenAPI, governance and disposable PostgreSQL verification pass.
