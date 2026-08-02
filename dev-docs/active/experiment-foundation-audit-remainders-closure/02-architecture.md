# 02 Architecture

## Authority boundaries

| Concern | Owner | T-134 rule |
|---|---|---|
| PaperProject binding and WorkOrder intent | PaperImplementation | Resolve exact project/Cycle/branch/revision on the server; no nullable product entrance |
| Candidate canonicalization and execution assets | ExperimentFoundation | One typed promotion UoW; server-derived identity/hash; exact reuse or conflict |
| Standalone-to-paper attachment | PI command plus existing EF/PI trust services | Attachment is a revalidation boundary, not a foreign-key shortcut |
| Structured lineage | PaperImplementation | Remains complete query truth and fallback |
| Semantic index/ranking | Rebuildable technical projection | Project-filtered discovery only; never a workflow or trust authority |
| Scientific evidence ingress | Existing PI Evidence Trust Gateway | T-134 adds no second writer |

## Required transaction seams

- EF-P14 commits bootstrap domain state and its outbox atomically only after exact binding resolution.
- EF-P06 commits promotion/canonical/Candidate/outbox state inside one owning-domain Unit of Work.
- EF-P15 separates revalidation reads from the final existing trust transaction; any drift before commit fails closed.
- EF-P21 indexing is rebuildable and may be eventually consistent; authoritative reads always re-resolve source rows.

## Identity and replay

- Commands carry stable public scope inputs only; canonical ids, hashes, eligibility and current revision are derived server-side.
- Idempotency binds the exact canonical command payload and scope. Same key plus different scope or content is a terminal conflict.
- Replays return stored outcomes and do not create new canonical assets, bindings, attachments, events or evidence.
- Legacy-null, legacy-v1 and standalone identities never gain trust through fallback matching.

## Semantic retrieval safety

```text
authenticated project scope
  -> structured candidate boundary
  -> optional semantic lookup/ranking
  -> exact source revision/hash re-resolution
  -> drop stale/foreign hits
  -> typed read response
```

Index absence, timeout or corruption returns structured results. Ranking cannot choose branch head, satisfy readiness, attach a standalone result, promote a candidate or qualify evidence.

## Data and rollout

- Prefer existing storage. Add persisted fields/tables only for invariants that cannot be represented safely today.
- Any schema change is additive, reviewed through the Prisma SSOT workflow and verified on disposable PostgreSQL before named-local consideration.
- New mutation capabilities default off. Retrieval may degrade to structured-only without disabling the project.
- Rollback closes new entrances and workers; it does not delete typed history or reopen legacy writers.

## Phase 0 frozen architecture decisions — 2026-08-02

- EF-P14 reuses the existing bootstrap route and atomic repository UoW. Both bridge refs are mandatory at the product entrance; historical nullable storage remains unchanged and reject-only.
- EF-P06 adds a typed preparation Candidate and terminal promotion UoW. It does not reuse scientific `EvidenceCandidateV2`, reopen the generic route or duplicate admitted-cell materialization.
- EF-P15 cannot safely attach a current “standalone typed result” because no such authority exists: every v2 Run/result is PI-bound and legacy is ineligible. The recommended model attaches a new typed exploration specification and requires a new PI-bound execution; Phase 3 needs an explicit model decision before coding.
- EF-P21 uses a PI-owned rebuildable projection. Structured project scope produces the only candidate set before semantic rank; literature tables and historical Run documents are excluded.
- Exact files, prohibited writes, tests and rollback entrances are frozen in `06-phase0-census-and-freeze.md`.

## Phase 1 landed binding contract — 2026-08-02

- `PaperImplementationIntakeBootstrapService` remains the sole product bootstrap business boundary; route, controller and repository layering is unchanged.
- A usable handoff contains the same non-null `paper_project_intake` and `paper_project` refs in both the handoff and embedded bridge. Both refs bind the bridge title-card id and exact bridge payload hash.
- Fully unbound upstream bridges fail with `PAPER_PROJECT_BINDING_REQUIRED`; half-bound, malformed, stale or mirror-drifted pairs fail with `PAPER_PROJECT_BINDING_CONFLICT`. Both fail before `createBootstrap`.
- Existing stored bootstrap replay and the two project read methods revalidate the immutable project/snapshot/source-handoff binding. Any missing historical binding returns `LEGACY_RECORD_NOT_ELIGIBLE` with `recovery=diagnostics_only` and leaves rows untouched.
- Nullable Prisma fields remain historical storage only. No migration, repair writer, late binding or second bootstrap endpoint was added.

## Phase 2 landed promotion contract — 2026-08-02

- The new product route is `POST /experiment-foundation/v2/assets/{asset_type}/{logical_id}/candidate-revisions/{candidate_revision}/promotion`. Its closed request body contains only `decision` and `business_idempotency_key`; the path is the public Candidate identity/revision.
- The exact current typed asset draft is snapshotted as `ExperimentFoundationPreparationCandidateV2`. Candidate identity is deterministic across revisions; one `(candidate_id, candidate_revision)` permits one terminal decision.
- `promote` validates the exact draft state, computes the canonical content hash, creates or exact-reuses one existing typed asset revision, advances the asset identity by CAS, terminates the Candidate and writes decision/receipt/outbox in one transaction. `reject` writes the same terminal aggregate without a canonical revision.
- PostgreSQL promotion transactions take a Candidate-revision advisory transaction lock before terminal-state resolution. Concurrent different-key exact decisions therefore return one created and one replayed outcome with the same decision/event instead of leaking a unique-key race.
- Canonical asset persistence continues to use the existing five named asset families. The new Candidate is preparation/catalog state and cannot reuse scientific `ExperimentFoundationEvidenceCandidateV2`.
- The new outbox is promotion-specific and relay-ready. Readiness, external effects, scientific validation, EvidenceCandidate and admitted-cell TaskSpec/Run materialization remain outside this UoW and retain their existing authorities.
- `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` defaults false and is invalid unless v2 cutover is committed. Disabling the promotion capability stops only new intake; immutable outcomes remain retained. No named database was migrated or capability enabled.

## Explicit exclusions

`apps/desktop/`, `ui/`, cloud provider execution and T-132 sequence-8 artifacts are outside this architecture.
