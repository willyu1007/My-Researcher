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
- Rollback closes new entrances and workers without deleting typed history or reopening legacy writers.

## Phase 0 frozen architecture decisions — 2026-08-02

- EF-P14 reuses the existing bootstrap route and atomic repository UoW. Both bridge refs are mandatory at the product entrance; historical nullable storage remains unchanged and reject-only.
- EF-P06 adds a typed preparation Candidate and terminal promotion UoW while avoiding scientific `EvidenceCandidateV2`, the generic route and duplicate admitted-cell materialization.
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
- The existing integration relay scheduler claims the promotion outbox through its owning repository. Claim-time replay revalidates the deterministic Candidate, canonical revision, decision command, receipt and exact event envelope/payload before delivery; corrupted rows fail closed as `failed` poison records.
- A valid promotion event is a terminal catalog/audit notification. Relay delivery marks the event as `delivered` without invoking TaskSpec, Run, readiness, scientific-validation, evidence or projection writers, so relay completion cannot become a second authority.
- `EXPERIMENT_FOUNDATION_V2_PROMOTION_ENABLED` defaults false and is invalid unless v2 cutover is committed. Disabling the promotion capability stops only new intake; immutable outcomes remain retained. No named database was migrated or capability enabled.

## Phase 3 authorized attachment contract — 2026-08-02

P15-03 option 1 is selected. T-134 will model standalone exploration as an immutable EF-owned specification, not as a second execution lineage:

```text
EF immutable exploration specification
  -> explicit PI attach command
  -> PI scope/spec/readiness revalidation
  -> one atomic PI attachment + admission + outbox commit
  -> existing EF materialization and new PI-bound Run
  -> existing real Attempt/result/scientific validation
  -> existing PI Evidence Trust Gateway
```

- The exploration specification freezes proposed `branch_frame`, the typed WorkOrder revision snapshot and the exact ordered cell plan. Its ids, revision, content hash and canonical bytes are server-derived. The contract contains no Run, Attempt, result, validation, EvidenceCandidate, REU or legacy record reference.
- The PI command accepts only an exact public spec identity/revision, target ImplementationProject/ValidationCycle/branch key and business idempotency key. PI resolves the stored spec/hash and owns the act of adopting its proposed scientific plan; callers cannot submit WorkOrder revision ids, admission ids, approved-plan hashes, event payloads or trust outcomes.
- An existing target branch must have the exact proposed branch-frame hash. A new branch may be created only from the proposed frame during the same explicit attachment/admission command. Project/Cycle scope must be active, admitted and open.
- PI stores an attachment receipt binding the exact spec revision/hash to the resulting branch, WorkOrder revision/hash, admission and approved-plan hash in the same authority transaction that writes the existing admission outbox. No cross-domain foreign key or shared transaction is introduced.
- EF materialization receives the ordinary `WorkOrderRevisionAdmitted` event and revalidates typed asset refs, readiness and exact cell parity. The resulting TaskSpecs and Run are new PI-bound facts; no historical exploratory output is rebound or copied.
- Scientific result hashes and validation are checked only on the newly executed PI-bound lineage by the existing EF validation path. The existing PI Evidence Trust Gateway remains the sole REU/trace/outbox writer.
- Exact attachment replay is zero-new. One exact spec revision may bind to only one project/Cycle/branch scope; different-scope reuse fails closed. Reuse requires an explicitly new spec revision rather than rebinding an immutable receipt.
- Rollback disables the new spec/attachment entrances and drains already-committed admission sagas. It preserves immutable specs, receipts and PI-bound lineage and never reopens legacy writers.

Option 2 — a standalone Run/Attempt/Result lineage plus result-import trust boundary — is explicitly not authorized under T-134.

## Phase 3A landed exploration-specification contract — 2026-08-02

- `POST /experiment-foundation/v2/exploration-specifications/{logical_id}/revisions` accepts only caller-owned immutable scientific intent: expected state version, proposed branch frame, typed WorkOrder snapshot, ordered exact cells and a business idempotency key.
- EF derives `spec_id`, revision number/id, content hash, command hash and receipt id. The aggregate has no draft lifecycle: its first accepted representation is a frozen versioned revision.
- Exact content reuses the stored revision with zero new revision rows even under a different key. Changed content requires current identity CAS and creates the next revision; same-key command drift and stale changed content fail closed.
- The EF-owned transaction contains only identity, immutable revision and command receipt tables. It deliberately has no admission or outbox because Phase 3B must pull the exact stored revision and commit the PI-owned attachment/admission event through the existing PI UoW.
- PostgreSQL advisory transaction locking serializes one logical specification identity. Durable reads recompute deterministic spec/revision/receipt identities and hashes and reject unreadable or cross-bound rows.
- `EXPERIMENT_FOUNDATION_V2_EXPLORATION_SPEC_ENABLED` defaults false and also requires committed v2 cutover. Closing the entrance preserves immutable rows; no named database was migrated or capability enabled.

## Explicit exclusions

`apps/desktop/`, `ui/`, cloud provider execution and T-132 sequence-8 artifacts are outside this architecture.

## Phase 3B landed PI attachment/admission seam — 2026-08-02

- `POST /paper-implementation/projects/{implementation_project_id}/validation-cycles/{validation_cycle_id}/exploration-specifications/{spec_id}/revisions/{spec_revision}/attach` accepts only `branch_key` and `business_idempotency_key` in its closed body.
- The orchestration service resolves the exact immutable EF revision, checks committed exact replay before current readiness, then revalidates one EvaluationProtocol target plus its ordered dependencies. Historical exact replay therefore survives later readiness drift without creating new authority.
- The existing PI admission service remains the only admission algorithm. Its existing UoW optionally persists one PI-owned attachment and receipt in the same transaction as branch/revision/cells/admission/outbox.
- PI attachment storage keeps EF identities as scalar exact refs without a cross-domain foreign key. Composite PI foreign keys bind exact project/Cycle/branch, revision/approved-plan and admission authority.
- One spec revision binds one PI project/Cycle/branch. Same-key replay is zero-new; a different key may add only one receipt; changed scope/plan conflicts.
- `PAPER_IMPLEMENTATION_EXPERIMENT_V2_EXPLORATION_ATTACHMENT_ENABLED` defaults false and requires committed cutover plus ordinary PI v2 admission. The attachment capability does not require the Phase 3A authoring flag because already committed immutable specs remain eligible.

## Phase 3C landed execution-lineage trust seam — 2026-08-02

- The positive trust path requires an executable v2 WorkOrder bound to an active-ready persisted ExecutionBundle. Existing EF materialization produces executable TaskSpecs, then the existing real-provider intake, repository and command worker own ProviderPayload, Attempt, canonical events, commands, collection and terminal success.
- Scientific validation no longer trusts the Attempt row in isolation. Its Prisma repository reuses the execution repository's typed/canonical readers, requires exact payload id/hash/run/cell/TaskSpec/mode/provenance parity and requires a contiguous canonical event chain whose terminal state/reason/external job binding matches the Attempt.
- A simulation payload relabeled through a real-provider Attempt is rejected as `EVIDENCE_PROVENANCE_REJECTED`; missing, reordered, corrupt or state-drifted real-provider events are rejected as `VALIDATION_SCOPE_DRIFT` before any scientific result write.
- Attachment and failed result intake remain zero-trust operations. Relational assertions cover EF result/report/Candidate/qualified-outbox state and PI gateway inbox/REU/trace/registration-outbox state, not only the final REU count.
- Phase 3C hardening introduced no new production writer, route, schema, migration, capability or provider call. The no-network SDK fake is injected only behind the existing production transport boundary in disposable tests.
