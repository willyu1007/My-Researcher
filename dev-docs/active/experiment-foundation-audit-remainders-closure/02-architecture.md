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

## Explicit exclusions

`apps/desktop/`, `ui/`, cloud provider execution and T-132 sequence-8 artifacts are outside this architecture.
