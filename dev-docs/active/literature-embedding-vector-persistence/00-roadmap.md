# Roadmap

## Scope and constraints

### In scope
- Make native pgvector materialization complete reliably for literature embeddings with at least 205 chunks.
- Preserve existing embedding-artifact reuse, dimension validation, indexing, activation, and cost telemetry behavior.
- Recover the failed `LIT-2297` processing owner through canonical product APIs without a second embedding-provider request.
- Return the resulting disposition to T-148 FIND-008.

### Out of scope
- Changing embedding models, dimensions, chunking policy, retrieval ranking, or topic-selection behavior.
- Reworking the literature processing orchestration or adding a general-purpose bulk-write framework.
- Authorizing a new paid provider request if the persisted embedding artifact cannot be reused.

### Constraints and dependencies
- Repository code and focused tests own the persistence correction; product recovery uses only canonical HTTP APIs.
- The original failure occurred after embedding artifact creation while 205 native retrieval vectors were written serially inside Prisma's default five-second interactive transaction.
- Recovery must prove `reused_existing: true` before it can count as zero-provider replay; if reuse cannot be established, stop for exact provider authorization.
- Preserve unrelated and pre-existing worktree changes, including T-148's uncommitted bundle and hub projection.

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| How should native vectors be persisted? | Raise the interactive-transaction timeout, or replace serial per-chunk writes with one bounded bulk statement. A timeout increase is smaller but preserves linear transaction overhead and another size-dependent failure point. | Validate all records first, then materialize the batch with one PostgreSQL `UPDATE ... FROM (VALUES ...)` statement outside an interactive transaction. | decided | User authorized the focused repair; repository failure evidence selects the route. | T-148 FIND-008 reproduction and source trace on 2026-09-01. | Removes the five-second transaction boundary without introducing a second persistence system. |
| Where should this reliability fix live in the project graph? | Put it under F-001, create a new Feature, or leave it triaged in F-000. | Keep the task in F-000 pending any later project-hub ownership decision; do not create a Feature for maintenance work. | decided | Repository governance boundary. | `task-start` maintenance rule and current Feature registry. | Implementation can proceed without overstating a new project capability. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| The EMBEDDINGS artifact for `LIT-2297` was committed before native-vector materialization failed. | A recovery request could require an unauthorized provider call. | Trace transaction boundaries and require the recovered run to report artifact reuse; stop before any newly priced action if reuse is not recoverable. |
| A single SQL statement carrying 205 vectors remains within PostgreSQL statement-size and execution limits. | The correction could move the failure from transaction timeout to statement size or server execution. | Exercise the 205-record repository seam and the original product owner; keep a dimension and row-count guard. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-148 | follow-up / blocks | This task owns FIND-008's literature embedding persistence and recovery; T-148 owns the topic-selection real-flow findings and resumes once `LIT-2297` is retrieval-ready. | Update both bundles when the original failed owner is recovered or a provider-authorization blocker is proven. |

## Implementation plan

### Phase 1 — Protect and repair native-vector persistence
- Outcome: A 205-record embedding batch materializes without depending on Prisma's default interactive-transaction window.
- Approach: Add a consequence-level regression test at the public repository method, observe the existing failure, then replace serial transaction writes with a validated bulk update.
- Planned changes:
  1. Reproduce the large-batch transaction failure at `writeEmbeddingRetrievalVectors` with an independent success oracle of 205 persisted records.
  2. Build one escaped bulk pgvector update after validating every vector dimension and timestamp.
  3. Run focused repository and literature-processing regression checks and review the behavior-changing diff.
- Affected boundaries / entry points: Prisma literature embedding store and its public repository contract.
- Dependencies: Existing fake Prisma seam and current pgvector schema.
- Exit criteria: The new test is sensitivity-proven red then green; affected checks and type safety pass.
- Verification: Focused unit test, relevant literature-processing tests, and TypeScript check.
- Recovery: Revert the repository method and test together; no persisted product state is mutated in this phase.

### Phase 2 — Recover the real failed literature owner
- Outcome: `LIT-2297` reaches embedded/indexed and topic-active state by reusing its existing artifact with zero additional provider requests.
- Approach: Preflight the loopback backend, read the exact retry contract and owner state, submit one stable-idempotency recovery action, then verify durable processing and activation projections.
- Planned changes:
  1. Prove runtime identity and current failed owner state through product reads.
  2. Retry the failed job only when the current code path and owner evidence support artifact reuse.
  3. Verify 205 native vectors, `reused_existing: true`, successful indexing, activation, and unchanged provider-call accounting.
- Affected boundaries / entry points: Literature content-processing job retry, processing owner read, topic activation, and scoped literature overview.
- Dependencies: Phase 1 correction running on the local backend; existing persisted EMBEDDINGS artifact.
- Exit criteria: Original symptom passes once end to end, or the task stops before provider work with exact evidence for the authorization blocker.
- Verification: Product API owner projections, job status, run details, and scoped overview.
- Recovery: Read before replay with stable idempotency; do not issue a new provider request without exact authorization.

### Phase 3 — Reconcile findings and close the repair
- Outcome: Code, verification, T-148 disposition, and project governance agree on the recovered behavior and remaining limitations.
- Approach: Review the final diff, remove session-only diagnostics, synchronize both task records, and preserve clean rollback boundaries.
- Planned changes:
  1. Complete code review and cleanup checks.
  2. Record decisive evidence and limitations in this task and update T-148 FIND-008's disposition.
  3. Synchronize scoped and global governance without absorbing foreign work.
- Affected boundaries / entry points: Task bundles and generated project views.
- Dependencies: Phase 2 result.
- Exit criteria: Completion contract holds or a named external authorization blocker remains.
- Verification: Final diff review, post-cleanup focused checks, scoped/global governance lint.
- Recovery: Keep incomplete code uncommitted; if complete, retain one task-owned checkpoint when it can be isolated safely.

## Kickoff gate

- Status: ready
- Authorized boundary: complete task
- [x] Decisions: The user assigned FIND-008 to a separate follow-up and explicitly authorized implementation on 2026-09-01.
- [x] Design: The bulk native-vector write and zero-provider recovery boundary are settled in `02-architecture.md`.
- [x] Route: The three phases connect the reproduced failure to code repair, real-owner recovery, and task reconciliation.
- [x] Verification: Red/green repository coverage, original-owner recovery, regression checks, and cleanup are identified in `verification.md`.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Bulk SQL changes escaping or vector semantics. | Dimension, timestamp, row-count, or focused repository test fails. | Reuse existing SQL escaping and pgvector literal validation; keep one public-method seam. | Revert the bulk statement and retain the red reproduction evidence. |
| The failed artifact is not reusable. | Recovery would not report `reused_existing: true` or current owner state cannot prove the path. | Stop before provider work and present exact call/cost scope for authorization. | Leave the job partial and owner IDs intact. |
| A local-only test passes while PostgreSQL still fails at 205 vectors. | Original `LIT-2297` recovery fails or reports incomplete native-vector coverage. | Require the real owner reproduction in addition to unit coverage. | Record the failed attempt, return kickoff to pending if the route changes, and remove unsupported changes. |
| Shared hub files mix this task with T-148's pre-existing changes. | Staged diff contains both task owners. | Keep generated projections uncommitted unless changes can be isolated with one task trailer. | Leave validated task state in the worktree and report the checkpoint boundary. |

## Phase closeout

- Review: The behavior-changing SQL, large-batch oracle, product recovery evidence, and provider-reuse proof were reviewed with no unresolved finding.
- Record update: Status, architecture, verification, and T-148 FIND-008 agree that the original blocker is closed.
- Checkpoint: Scoped governance is synchronized; commit only a verified, isolated task-owned diff because T-148 remains a distinct uncommitted worktree owner.
