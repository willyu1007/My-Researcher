# T-136 Scientific Evidence to Paper Closure — Verification

## Verification policy

Each implementation phase must record the exact command, timestamp/run id, target, result counts, skips, failures and relevant digest here. A later green phase does not erase an earlier failure; resolved failures are also summarized in `05-pitfalls.md`.

## P0 documentation/governance checks

- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - Expected: T-136 is registered under the active task path; semantic mapping is then reviewed for both R-012 and R-013.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
  - Expected: lint passes; pre-existing warnings are identified separately from T-136.
- `git diff --check -- dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`
  - Expected: no whitespace errors.
- Static authority census commands defined during P0.
  - Expected: one EF scientific writer, one PI evidence gateway, one PI closure writer and zero alternate Packet writers.
- P0 invariant-freeze/late-binding ledger review.
  - Expected: every authority/provenance/preregistration/idempotency/schema decision is frozen or explicitly late-bound; no provider raw layout or exact P5 workload is mislabeled as a cross-domain contract.

## Per-phase automated checks

- `pnpm typecheck`
  - Expected: all workspace typechecks pass.
- `pnpm lint`
  - Expected: repository lint passes, or any unavailable/known baseline is recorded precisely.
- Targeted shared/backend unit and route suites for each modified service.
  - Expected: zero failures and zero unexplained skips.
- `TS_NODE_TRANSPILE_ONLY=true pnpm test`
  - Expected: full workspace suite passes with only documented conditional skips.
- Disposable PostgreSQL gates for result, relay, closure and Packet paths.
  - Expected: affected relational checks execute with zero skips; disposable marker, source digest and cleanup pass.

## Required negative checks

- `diagnostic_only`, simulation and fake-provider outputs create zero scientific rows.
- Manual values, CSV/Notebook inputs, external-cluster logs and third-party completed run bundles have no accepted scientific intake shape and create zero scientific rows.
- Non-succeeded or lineage-drifted Attempts create zero result rows.
- Incomplete ordered cells and unsupported rules create no eligible Candidate/REU.
- Candidate/event/hash/head mismatches produce terminal PI rejection and zero REU.
- Caller-authored assessment/exit/hash inputs are structurally unrepresentable or rejected.
- Active real Attempt, stale D-18 watermark, stale proposal and concurrent closure create no second closure.
- Direct/pre-closure Packet creation remains rejected.
- Relay replay creates no duplicate Candidate, REU, closure, Packet or claim.
- PKT-S v2 rows require only schema version, exact Closure id/hash and Packet hash; proposal/disposition/exit and relay event fields are absent from Packet persistence.
- Exact `(closureId, closureSnapshotHash, validationCycleId)` mismatch, duplicate Closure ownership and changed replay content reject; identical replay returns the existing Packet.
- Legacy Packet rows remain readable but cannot enter the new scientific Claim/Dossier path. The downstream read view joins exact Closure/proposal facts without creating a second conclusion authority.
- A protocol/threshold/direction/exit-rule mutation after result creation cannot alter validation or closure; a new protocol revision/new Run is required.
- A provider adapter or workload substitution that preserves the canonical envelope does not require a cross-domain authority change.
- Product result-generation schemas contain no metric value, observation array, statistical conclusion or final disposition field.
- Every persisted Result proves exact collected-output/source-artifact, parser profile and derivation identity; a succeeded Attempt with caller-substituted values creates zero Result rows.
- Provider transport contract contains no scientific metric/statistic mapping and performs no scientific persistence.
- Scientific parsing and source canonicalization execute before the collection transaction; no external provider fetch or parser work occurs inside that transaction.
- Invalid canonical envelope/lineage/parser binding fails collection and creates no source/Result. A valid collection with unsupported/missing scientific fields remains collected with diagnostics but creates no `scientific_source`, Result, validation or evidence.
- Result generation before source commit, from `diagnostic_only`, or from a source not exactly bound to the requested RunCell rejects with zero Result rows.
- A Result row whose JSON snapshot names a source but lacks the confirmed direct relational binding is invalid and cannot qualify for evidence.
- Historical `diagnostic_only` rows remain byte/identity unchanged after the additive source migration and cannot satisfy the new Result source relation.
- The migration enforces one canonical source root per collection/source kind and rejects cross-collection, cross-Attempt or hash-drifted Result bindings.
- Removing or changing any member of the Result source id/hash/kind/class tuple makes the relation invalid; source identity cannot silently fall back to snapshot JSON.
- Result `executionAttemptId` and `collectionAttemptId` must resolve to the same collection/Attempt pair; mixed-chain fixtures create zero Result rows.
- Parser profile version/hash and derivation hash are server-assigned, included in canonical Result hashing and conflict on changed replay.
- Manifest-only provider/schema/statistic/artifact fields remain typed and hash-covered; no provider-specific or metric-specific database columns are introduced.
- Flat optional-field observations, unknown statistic/uncertainty kinds and provider-specific extension bags are rejected before source sealing.
- `sampleSize <= 0`, non-integer sample size, `point` with sample size other than one and quantile probability outside `(0, 1)` create no scientific source.
- `NaN`, infinity, negative SD/SE, confidence level outside `(0, 1)`, non-finite/reversed confidence bounds and unregistered confidence `methodKey` create no scientific source.
- `uncertainty.kind=none` is accepted only for a preregistered observation slot that does not require uncertainty; missing or wrong-kind required uncertainty preserves diagnostic collection facts but creates no source/Result/evidence.
- Changing statistic kind, uncertainty policy/kind or confidence method after Run submission produces protocol drift and cannot reinterpret the existing source or Result.
- Random/caller/parser-authored observation ids and parser-order canonicalization are rejected.
- Every preregistered observation slot matches exactly once; missing, duplicate and unexpected observation fixtures create no scientific source.
- Reordering provider/parser observations without changing semantic content yields the same canonical source and Result hashes.
- Changing value, uncertainty, parser/source identity or derivation under the same semantic slot preserves `observationId` but conflicts on canonical content/hash.
- Quantile statistic keys include canonical probability and cannot collide; artifact refs use a separate key/ordinal namespace.
- Negative zero and zero yield the same canonical numeric bytes; `NaN`/infinity remain rejected; runtime timestamps/retries/locators/idempotency keys cannot change scientific hashes.
- Provider manifest, source, derivation and Result hash tamper fixtures fail at the corresponding layer without rewriting upstream authority.
- Exact source-sealing replay returns the same source identity/hash; changed content under the same business identity conflicts and cannot replace the source or Result.
- Supporting, contradicting and indeterminate valid comparison fixtures all create EvidenceCandidate/REU; incomplete, drifted or unsupported evidence does not.
- CMP-B1 higher/lower directions normalize to the same decision algorithm; finite same-unit fixtures cover support, contradiction and the open indeterminate band.
- `confidence_interval_guard` fixtures prove conservative interval support/contradiction and valid non-decisive indeterminate behavior; missing/mismatched required intervals fail validation and create no Candidate.
- Comparison facts persist exactly one relation/reason pair. Redundant support/contradiction check fields, relative/ratio/equivalence rules and generic expressions are rejected by v1 contracts.
- EF comparison facts never contain or write PI `positive | negative | inconclusive`, selected exit or Claim authority.
- DISP-S contract fixtures reject `accept/correct/downgrade`, direct disposition, selected exit and closure-hash fields; command invocation plus exact proposal identity is the sole authorization shape.
- Exactly one primary comparison maps support→positive, contradiction→negative and indeterminate→inconclusive, then selects the matching admission-frozen exit. Missing/duplicate primary facts or exit mappings create no Closure/event.
- Proposal rejection or caller disagreement leaves the Cycle open. Limitations/claim ceiling do not mutate disposition, and corrected facts/protocol require a new revision/Run.
- P0-P4 summaries use `implementation_complete_unreleased` and do not mark T-136 done or `M0-SCI` passed.
- No real scientific-closure product claim or capability enablement occurs before P5 records `M0-SCI: passed`.

## Manual and operational smoke checks

### Disabled-state smoke

- Start from all relevant capability defaults false.
- Attempt scientific intake and scientific closure.
- Expected: stable fail-closed reason codes, zero provider calls and zero scientific/closure writes.

### Named-local smoke

- Requires explicit authorization and a verified recovery point if any migration is involved.
- Exercise result/validation/relay/closure/Packet on a controlled local exact scope with no cloud calls.
- Expected: one complete chain, exact replay and protected-table census.

### Real P5 acceptance

- Requires a separately approved operation manifest: provider, region/workspace, exact WorkOrder/Run, two cells, image/bundle, parser, EvaluationProtocol, operation ceiling, cost ceiling, credential lifetime and cleanup plan.
- Expected:
  - exactly two intended provider Jobs and terminal collection;
  - two typed real scientific result cells;
  - one validation report/candidate/REU/trace/closure/Packet chain;
  - Claim/Dossier complete;
  - replay creates zero duplicate Jobs/rows/events;
  - credentials removed and capabilities returned to their approved resting state.
  - the signed/digested acceptance summary records `M0-SCI: passed` and makes T-136 eligible for closeout.

## Rollout / backout

- Rollout sequence: fixtures → disposable PostgreSQL → authorized named-local smoke → separately authorized real PAI acceptance.
- Intake and closure capabilities remain default false and are opened only process-scoped where possible.
- Backout stops new intake/control but does not delete or mutate already committed evidence or closures.
- Durable outbox/inbox events are drained or replayed after repair; no alternate writer is introduced.
- Any additive schema change follows its reviewed DB recovery/rollback plan.

## Verification log

### 2026-08-04 — Planning bundle creation

- Scope: documentation and governance registration only.
- Application code/config/database/cloud checks: not run; no such state was modified.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed; T-136 registered and derived project views regenerated.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001`, active task path.
- Registry review: T-136 carries both `R-012` and `R-013`.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with two pre-existing State-format warnings in T-124/T-133; no T-136 warning or error.
- `git diff --check -- dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-04 — Top-level scientific evidence source decision

- Decision: only new real executions fully managed by ExperimentFoundation may produce authoritative scientific results; manual values and external experiment-result imports are prohibited.
- Boundary check: PAI/other external compute remains legal only as an EF-controlled execution adapter with exact persisted Attempt lifecycle.
- Top-level SSOT updated: `docs/project/overview/START-HERE.md`, `requirements.md`, and `risk-open-questions.md`.
- T-136 roadmap/overview/plan/architecture/verification/pitfalls and task keywords updated consistently.
- Old phrase scan: `任何实验数字必须来自用户输入或已有证据对象` has zero matches in the updated top-level/task scope.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings and no T-136 error.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Top-level bounded-context option B

- Decision: PaperImplementation and ExperimentFoundation are peer canonical bounded contexts; UI/navigation placement is deferred and cannot affect authority ownership.
- Ownership check: PI owns research intent/exact cells/WorkOrder/trusted REU admission/contextual conclusion/Claim/Dossier; EF owns reusable assets/TaskSpec/Run/Attempt/result facts/protocol validation/EvidenceCandidate.
- Historical capability mapping recorded: research design→PI; experiment design→PI+EF; model/training→EF; data analysis→EF facts + PI interpretation; writing→writing-governance + PaperProject.
- PaperProject is explicitly lifecycle scope/container, not a PI↔EF execution broker; Literature is not on the required path.
- Top-level SSOT updated: `START-HERE.md`, `requirements.md`, `domain-glossary.md`; T-136 roadmap/overview/architecture/decisions and project changelog updated consistently.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 205 repo-wide style warnings; no warning was reported for the changed T-136 or project-overview files.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — M0-SCI release option C

- Decision: T-136 is the mandatory `M0-SCI` product scientific-capability gate; the gate is neither the sole blocker for all M0 modules nor an ordinary post-M0 enhancement.
- Checkpoint rule: P0-P4 can reach only `implementation_complete_unreleased`; T-136 remains open and no real science-closure capability may be enabled or claimed before P5.
- Pass rule: only the new real two-cell WorkOrder-to-Dossier P5 acceptance records `M0-SCI: passed`; gate passage permits a separate controlled enablement decision but does not auto-enable flags.
- Boundary check: `M0-SCI` is distinct from governance milestone `M-001`; other M0 module previews and desktop UI completion remain independent.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path; no new governance milestone was created.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 204 repo-wide style warnings; no warning was reported for the changed T-136 or project-overview files.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — P0 invariant-freeze option B

- Decision: P0 freezes scientific invariants and protocol preregistration while concrete experiment/provider parameters remain late-bound.
- Frozen boundary: sole writers/events/state/capabilities, typed result semantics and identity/hash, pre-run protocol binding, disposition/exit authority, Packet idempotency, schema migration yes/no and P5 eligibility profile.
- Late-bound boundary: provider raw-file layout/parser implementation, controller/route presentation, exact P5 model/dataset/assets/parameters/region/budget and desktop UI.
- Domain-action rule: result recording and complete-batch validation remain distinct EF actions; a P1 orchestration wrapper is optional and cannot weaken authority or partial-batch rejection.
- Scientific rule: protocol metrics, thresholds, directions and exit rules are frozen before Run submission; post-result changes require a new revision/new Run.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 204 repo-wide style warnings; no warning was reported for the changed T-136 or project-overview files.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Canonical ExperimentResult option B

- Decision: ExperimentResult is a server-generated, source-bound factual summary envelope. The product command accepts identities only and EF derives observations from exact persisted collected output with a frozen parser profile.
- Envelope boundary: stable observation identity, metric/split/value/type/unit, statistic kind, sample count, typed uncertainty/explicit-none, source artifact/parser/derivation hashes and hash-bound large raw artifacts.
- Authority boundary: cross-cell comparison facts are EF-derived under the preregistered protocol; final `positive | negative | inconclusive`, selected exit and Claims remain PI authority.
- Eligibility rule: valid supporting, contradicting and indeterminate results all qualify for EvidenceCandidate; `failed`/`unsupported` is reserved for evidence integrity or capability failure.
- Schema follow-up: P0 must determine whether exact collected-output/source-artifact provenance needs an additive relation; the canonical-result planning decision authorizes no migration.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 204 repo-wide style warnings; no warning was reported for the changed T-136 or project-overview files.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Collection/source/Result assignment timing

- Decision: transport performs only canonical fetch/base validation and upstream manifest hashing; the EF worker invokes a provider-independent scientific parser while canonical bytes remain in memory.
- Transaction rule: parsing and source canonicalization remain outside the database transaction; one short collection transaction persists terminal collection state, diagnostic output and an optional sealed `scientific_source` plus idempotency/outbox state.
- Failure rule: invalid provider envelope/lineage/parser binding fails collection; valid collection with unsupported/missing scientific semantics preserves diagnostics but creates no scientific source, Result or evidence.
- Result rule: a separate post-commit identity-only command reloads the exact sealed source chain and server-generates derivation/result identities, hashes and observations.
- Storage direction: prefer additive reuse of `ExperimentFoundationProvisionalOutputV2` with `scientific_source` plus a direct Result source binding; exact schema/FK and migration authorization remain unresolved P0 items.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 206 repo-wide style warnings; two T-136 vague-reference warnings introduced by wording were then corrected.
- Final `node .ai/scripts/lint-docs.mjs` rerun: passed with 0 errors and 204 repo-wide warnings; no warning was reported for T-136 or changed project-overview files.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Scientific-source persistence option B

- Decision: reuse `ExperimentFoundationProvisionalOutputV2` with a new `scientific_source` class and add a direct relational Result→source binding.
- Migration conclusion: an additive EF source-binding Prisma migration is required; the earlier no-migration assumption is superseded for the source-binding slice.
- Complexity boundary: no JSON-only provenance fallback, provider-specific source table, child-source graph or mutable derivation ledger. One canonical source manifest may reference multiple hash-bound raw artifacts.
- Authorization boundary: option B freezes the migration direction only. Exact fields, constraints, indexes, historical-row behavior and rollback require the next confirmation and DB-SSOT workflow before any Prisma edit.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 206 repo-wide warnings; two T-136 vague-reference warnings were corrected.
- `git diff --check -- docs/project/overview .ai/project/main` and the untracked task whitespace/conflict scan: passed.
- Final `node .ai/scripts/lint-docs.mjs` rerun: passed with 0 errors and 204 repo-wide warnings; no warning was reported for T-136 or changed project-overview files.

### 2026-08-05 — Minimal relational spine option B2

- Decision: Result persists collection/source id/hash/kind/class, parser profile version/hash and derivation hash as the minimal relational spine.
- Constraint rule: the exact source tuple and same collection/ExecutionAttempt chain are database-enforced; `diagnostic_only` and JSON-only source claims remain ineligible.
- Manifest rule: upstream provider hash, result schema, typed summaries/statistics/uncertainty and raw artifact refs remain inside the canonical hash-bound source manifest rather than expanding the relational model.
- Authorization boundary: logical fields and invariants are confirmed; physical Prisma types/names, constraint/index names and migration/backfill/rollback operations remain pending. No Prisma edit occurred.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 205 repo-wide warnings; one T-136 vague-reference warning was corrected.
- Final docs lint rerun: passed with 0 errors and 204 repo-wide warnings; T-136 and changed project-overview files produced no warning.
- `git diff --check -- docs/project/overview .ai/project/main` and the untracked task whitespace/conflict scan: passed.

### 2026-08-05 — Strict statistic/uncertainty option B

- Decision: use a closed-core discriminated union for point/aggregate/quantile statistics and none/SD/SE/confidence-interval uncertainty.
- Sample rule: every observation has a positive integer sample size; `point` requires one and `quantile` carries a probability strictly inside `(0, 1)`.
- Uncertainty rule: absence is represented only as `none/not_required_by_protocol`; a protocol-required missing or wrong-kind uncertainty blocks scientific-source sealing.
- Numeric/method rule: reject non-finite values, negative dispersion, invalid confidence levels/bounds and confidence methods not admitted by the frozen protocol/parser profile.
- Authority rule: provider adapters and callers cannot add free-form statistic/uncertainty fields or change preregistered expectations after Run submission.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 204 repo-wide warnings; T-136 and changed project-overview files produced no warning.
- `git diff --check -- docs/project/overview .ai/project/main` and the untracked task whitespace/conflict scan: passed.

### 2026-08-05 — Observation identity/order/hash option O-B

- Decision: protocol freezes semantic observation keys and ordinals; EF derives stable ids from RunCell, protocol revision hash and observation key.
- Identity rule: value, uncertainty, parser/source identity and provider order are content, not identity; changed content conflicts under the same observation slot.
- Ordering rule: canonical metric/artifact arrays use separate protocol ordinals and exact-once matching, never provider/parser order.
- Hash rule: provider manifest, scientific source, derivation and Result content hashes are versioned, domain-separated layers with exact upstream bindings.
- Canonicalization rule: stable object keys, protocol array order, finite numbers, negative-zero normalization and preregistered rounding only; runtime metadata is excluded.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and 204 repo-wide warnings; T-136 and changed project-overview files produced no warning.
- `git diff --check -- docs/project/overview .ai/project/main` and the untracked task whitespace/conflict scan: passed.

### 2026-08-05 — Canonical source manifest M-B2 and P1 handoff expansion

- Decision: confirm M-B2 with fixed manifest schema `ExperimentFoundationScientificSourceManifest@v1`, kind `scientific_result_manifest` and class `scientific_source`.
- Source projection: hash-bind exact Collection/Attempt, ExecutionBundle/Run/Cell/TaskSpec, EvaluationProtocol revision, parser/result-schema, provider-manifest and ordered observation/artifact fields; exclude source self-identity and operational metadata.
- Current-model census: Prisma confirms real `cellOrdinal`, ExecutionBundle revision id/hash, Run manifest, RunCell, TrainingTaskSpec, Collection/Attempt and exact EvaluationProtocol revision fields. The scientific result-schema version/hash is correctly recorded as a T-136 additive contract rather than an existing field.
- Implementation-gap census: the current real-provider transport validates the canonical envelope but returns only `result_manifest_hash`; P1 now requires an internal ephemeral envelope-plus-hash return, exact worker binding checks, one fetch, no raw-envelope product/persistence surface and no provider-owned scientific semantics.
- Documentation scope only: no application code, Prisma schema, database, capability state or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 207 repo-wide warnings; three new T-136 vague-reference warnings were corrected. Final run passed with 0 errors and the 204-warning baseline, with no T-136 warning.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Physical PostgreSQL option DB-B

- Decision: approve DB-B as the additive local-PostgreSQL mapping for B2/M-B2. Prisma remains host-neutral; disposable verification is loopback-only and named-local application remains separately authorized.
- Compatibility rule: legacy Result `schemaVersion=v1` retains all eight new fields as null and stays evidence-ineligible; source-bound Result `schemaVersion=v2` requires the complete B2 spine under a closed all-or-none CHECK.
- Integrity rule: add exact Result→Collection/Attempt and Result→ProvisionalOutput composite FKs, unique Collection/source ownership, the exact source reference target and fixed scientific kind/class/version checks.
- History rule: no Output/Result backfill, deletion or trust upgrade. Existing `diagnostic_only` tuples remain legal and unchanged.
- Transaction rule: provider fetch and scientific parse remain outside the transaction; Collection terminal state, diagnostic output and optional source seal commit atomically in one short transaction.
- Recovery rule: disposable PostgreSQL proves empty/legacy/new/negative paths before any named-local deploy. Once v2 rows exist, operational backout retains the additive schema and uses a forward correction.
- Documentation scope only: no application code, Prisma schema, local database, cloud database, capability state or provider resource changed.
- `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`: passed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning was introduced.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed.

### 2026-08-05 — Refined design review and two non-blocking recommendations

- Confirmed adjustment: the task bundle now records refined T-B, exact field assigners, fixed output ordinals and the closed preparation/error model as confirmed decisions D-136-58 through D-136-63.
- Artifact census: the current one-envelope-fetch path verifies and seals the canonical provider envelope but does not independently fetch referenced artifact bytes. ART-B is recorded as the honest bounded recommendation; it adds no verification flag or artifact subsystem and prevents P5 from depending on unfetched bytes.
- PI proposal census: `packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts` exposes immutable runtime artifact id/hash suitable for proposal identity, while the current multi-scenario payload still needs a versioned one-proposal admission contract.
- PI closure census: `prisma/schema.prisma`, `packages/shared/src/research-lifecycle/paper-implementation-evidence-v2-contracts.ts` and `apps/backend/src/services/paper-implementation-validation-cycle-closure-v2-service.ts` show sufficient closure storage, an unimplemented scientific service branch and a direct corrected-disposition input that must be removed from the final scientific contract.
- PI Packet census: `packages/shared/src/research-lifecycle/paper-implementation-result-claim-dossier-contracts.ts` and `prisma/schema.prisma` show that the existing Packet row lacks exact closure/proposal/disposition/content-hash bindings. PKT-B therefore records a proven additive Packet migration need without adding a second table.
- Recommended chain: CMP-B emits factual ordered comparison relations; DISP-B permits accept or conservative downgrade only and leaves final assignment to the closure service; PKT-B materializes one Packet through the durable closure event and a short replay-idempotent transaction.
- Decision status at that checkpoint: ART-B, CMP-B, DISP-B and PKT-B remained explicitly pending confirmation. No D-136 decision number was assigned at that checkpoint and no application code, Prisma schema, database, capability or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 209 warnings; five new T-136 vague-reference warnings were corrected. Final run passed at the 204-warning repository baseline with no T-136 warning.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.

### 2026-08-05 — Artifact evidence-strength ART-B confirmed

- Decision: user confirmed ART-B. A v1 artifact ref proves exact EF-controlled Run declaration plus canonical envelope/source-hash sealing; the ref does not prove independent EF retrieval or byte-hash verification.
- Protocol rule: EvaluationProtocol may require exact artifact-ref slots and declared metadata for audit/reproduction. Missing or malformed required metadata blocks scientific-source sealing, but validator language cannot claim unperformed byte verification.
- Scientific rule: M0-SCI v1 comparison/disposition and the P5 conclusion must derive from typed observations EF actually parsed and sealed, not from unfetched artifact bytes.
- Complexity rule: P1 adds no verification-level flag, object fan-out, artifact download cache, retention subsystem or new failure graph. Independently verified artifacts require a later manifest/protocol capability version with explicit retrieval, limits, retention and failure semantics.
- Assignment rule: protocol owns required slots/order; the controlled workload declares metadata; parser extracts keyed refs; sealer assigns protocol order and source binding/hash; validator checks declared-ref completeness; PI remains conclusion authority.
- Documentation scope only: recorded as D-136-64/C18 and removed from P0 open questions. No application code, Prisma schema, database, capability state or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning was introduced.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.

### 2026-08-05 — Comparison fact contract CMP-B1 confirmed

- Decision: user confirmed CMP-B1. M0-SCI v1 admits only preregistered two-cell same-unit directional absolute differences; relative change, ratio, equivalence/non-inferiority, arbitrary formulas, multi-cell/multi-metric composition and multiple-comparison correction are later-version concerns.
- Rule check: protocol admission requires same-unit slots, finite valid thresholds/confidence level, nonblank required method key and `contradiction_max < support_min`; validation separately rejects non-finite observed/effect values. Higher/lower direction is normalized to one oriented-effect algorithm, so support, contradiction and the indeterminate gap remain mutually exclusive and exhaustive.
- Uncertainty check: `not_required_by_protocol` uses the oriented point effect. `confidence_interval_guard` requires matching protocol-admitted intervals and evaluates the conservative left-minus-right Cartesian envelope without claiming a new effect confidence level. Missing/mismatched required CI fails validation; a valid interval that clears neither band is evidence-eligible indeterminate.
- Fact check: one deterministic comparison id/ordinal/hash binds the exact protocol rule projection and observation refs/hashes. One `registered_relation` plus one `relation_reason` replaces the earlier redundant support/contradiction checks.
- Authority check: EvaluationProtocol authors the immutable rule; EF validation computes the factual relation/reason; eligibility stays separate; PI alone later assigns disposition and selected exit.
- Documentation scope only: recorded as D-136-65/C19 and removed from P0 open questions. No shared contract, validation service, Prisma schema, database, capability state or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning was introduced.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.

### 2026-08-05 — Deterministic disposition DISP-S confirmed

- Decision: user agreed that a human accept/downgrade semantic choice was unnecessary. DISP-S replaces the pending DISP-B proposal: invoking the exact Closure command authorizes closing but supplies no scientific choice.
- Primary rule: EvaluationProtocol freezes exactly one `primary_comparison_key` and all positive/negative/inconclusive exit mappings before Run submission. Missing/duplicate primary facts or missing exit mapping blocks Closure.
- Proposal rule: one admitted exact-hash ResultAnalysis artifact binds the current watermark, primary fact and ordered evidence while carrying only contextual interpretation, reliability, limitations and claim ceiling. Legacy multi-scenario artifacts are ineligible.
- Mapping rule: the closure service alone maps support→positive, contradiction→negative and indeterminate→inconclusive and selects the corresponding frozen exit. No caller, human or model field can flip, upgrade or downgrade the mapping.
- Disagreement rule: an unacceptable proposal is not closed. Proposal defects cause regeneration/reselection; evidence/protocol disagreement requires correction and a new revision/Run; contextual caution narrows limitations/claim ceiling rather than disposition.
- Storage rule: existing Closure outcome/proposal/watermark/hash fields are sufficient. No Review table or review-decision/reason/support columns are added; `corrected_scientific_disposition` is removed from the scientific request contract.
- Documentation scope only: recorded as D-136-66/C20 and removed from P0 open questions. No shared contract, closure service, Prisma schema, database, capability state or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning was introduced.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.

### 2026-08-05 — Reference-centered Packet PKT-S confirmed

- Decision: user approved the final PKT-S recommendation. Packet adds only `schemaVersion`, `closureId`, `closureSnapshotHash` and `packetContentHash`; existing `validationCycleId` completes the authority tuple.
- Authority rule: proposal id/hash, scientific disposition and selected exit remain Closure-owned. Claim/Dossier reads use a server-side Packet+exact Closure+proposal view instead of copied Packet columns.
- Integrity rule: new v2 rows require all four fields, exact `(closureId, closureSnapshotHash, validationCycleId)` FK and unique non-null Closure ownership. Legacy rows keep all four null, remain readable and are not trust-upgraded.
- Hash rule: `packetContentHash` covers v2 schema, exact Cycle/Closure id/hash and Packet-owned canonical semantics. Closure hash transitively binds proposal/disposition/exit; timestamps, relay event/lease/attempt data and database metadata are excluded.
- Materialization rule: only scientific `ValidationCycleClosed` triggers Packet creation. Preparation occurs outside the transaction; one short exact-Closure transaction inserts, returns byte-identical existing content or conflicts. The relay acknowledges only after semantic projection and Packet materialization both succeed.
- Complexity rule: no second Packet table, copied conclusion fields, event identity fields, public/direct create path or distributed transaction is introduced.
- Documentation scope only: recorded as D-136-67/C21 and removed from P0 open questions. No shared contract, materializer, Prisma schema, database, capability state or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning was introduced.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.

### 2026-08-05 — Minimal preregistered P5 eligibility P5-ELIG-S confirmed

- Decision: user confirmed P5-ELIG-S as the final P0 decision. Deterministic preflight—not a human override—admits one exact new immutable two-cell real-provider package with one declared differing factor and comparable execution/parser/metric semantics.
- Authorization rule: the user authorizes only the canonical package hash, exactly two `CreateJob` operations, operation/total cost ceilings and currency, process-scoped capability set/window, credential reference/cleanup policy and named-local recovery fingerprint. Any package change requires a new hash, preflight and authorization.
- Scientific rule: no desired disposition is part of eligibility or acceptance. Supporting, contradicting and indeterminate facts can all pass the real-chain gate; EF validation and PI Closure retain their confirmed scientific assignment roles.
- Failure rule: a failed/cancelled Job or package drift fails the P5 attempt. There is no hidden substitution or automatic resubmission; another execution requires a new immutable Run/package and explicit authorization.
- Complexity rule: reuse existing default-off process-scoped capability flags and hash-bound manifest evidence. Do not add a generic policy engine, approval table, standing enablement or UI workflow.
- Documentation scope only: recorded as D-136-68/C22, closes Q5 and completes the P0 decision freeze. No shared contract, validator, runner, Prisma schema, database, capability state, credential or cloud resource changed.
- `node .ai/scripts/ctl-project-governance.mjs query --project main --id T-136`: returned `planned`, `M-001`, `F-001` and the active T-136 task path.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with the same two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: initial run passed with 0 errors and 205 warnings; the one new T-136 vague-reference warning was corrected. Final run returned the 204-warning repository baseline with no T-136 warning.
- `git diff --check -- docs/project/overview dev-docs/active/scientific-evidence-to-paper-closure .ai/project/main`: passed; the task-bundle trailing-whitespace/conflict-marker scan returned no match.
- Worktree note: the repository already contains unrelated uncommitted changes and the T-136 task directory remains uncommitted; no commit was attempted during this documentation-only decision sync.

### 2026-08-08 — DB-B / PKT-S repo migration implementation

- Scope: Prisma SSOT, one additive migration, generated DB context, the existing legacy Packet repository mapper and T-136 DB evidence. No named-local product database, capability or cloud/provider state changed.
- `prisma format` and `prisma validate`: passed.
- Corrected `pnpm ci:prisma-drift` lane against a disposable shadow database: passed with zero drift. The initial role-less URL P1010 is retained in raw evidence.
- `node .ai/tests/run.mjs --suite database`: passed.
- `pnpm ci:prisma-smoke`: failed before T-136 at the historical pgvector migration because randomized schema isolation could not resolve `public.vector`; cleanup passed. Fresh disposable-database deployment was used as the authoritative relational lane.
- Fresh disposable PostgreSQL: all 76 migrations deployed, status reported up to date, 12 nullable compatibility columns and the named CHECK/FK/index set were present.
- Transactional legacy/v2 negative and exact-relation assertions: passed, then rolled back. The task-named disposable database was dropped and absence rechecked.
- `pnpm typecheck` under Node 20: initial Packet create-type failure fixed by the explicit unchecked scalar mapper; final full workspace run passed.
- Targeted Packet Prisma repository test: 2/2 passed.
- `pnpm lint`: exit 0, but only the repository placeholder script ran, so it is recorded as unavailable substantive lint coverage.
- `ctl-db-ssot sync-to-context` plus strict context verification: passed.
- Full backend suite: not green. First Node 20 run reported 2277 pass / 22 fail / 49 skip out of 2348 tests; a diagnostic rerun was stopped after high-concurrency loader CPU saturation. Failures are not waived or attributed to the migration. Controlled-concurrency/CI rerun remains required before integration release.
- Evidence: `artifacts/db/20260808-db-b-pkt-s/00-connection-check.md` through `04-post-verify.md`, plus retained raw drift/schema-smoke artifacts.

### 2026-08-08 — P1 source/Result implementation checkpoint

- `pnpm --filter @paper-engineering-assistant/shared typecheck`: passed.
- `pnpm --filter @paper-engineering-assistant/backend typecheck`: passed; the backend precheck regenerated Prisma Client from the existing repo SSOT.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/shared test`: passed, 409/409.
- Node 20 targeted P1/backend lane covering transport, worker, scientific source preparation, identity-only Result service, sealed legacy writer and Prisma execution mapper: passed, 51/51.
- The targeted P1 assertions prove strict collect-only handoff shape, explicit reader retry taxonomy, worker-side handoff revalidation, protocol-order normalization, deterministic source replay, diagnostic/source ordinal ordering, two source-bound Result cells, value-preserving projection and rejection of caller-authored observation fields.
- A direct Node 26 `ts-node/esm` targeted attempt failed at loader startup with an opaque thrown object before tests executed. Re-running the same lane under the repository-compatible Node 20 runtime passed; this is a runtime/tooling mismatch, not a waived test failure.
- `git diff --check`: passed for the current working tree.
- Still pending: fresh disposable-PostgreSQL P1 source/Result persistence and controlled-concurrency full backend regression. The prior full-suite 2277-pass/22-fail/49-skip baseline remains the honest release status.
- Safety: no named-local database, cloud provider, capability, credential or paid resource was changed.

### 2026-08-08 — P1 disposable and controlled-regression completion

- First disposable run `packc-ef-20260808-r1`: failed 1 of 76 tests because a historical negative assertion still expected `schemaVersion=v2` to hit the old schema-version CHECK. The new P1 v2 persistence/replay test itself passed, the database identity marker passed and cleanup completed.
- Resolution: the negative assertion now expects the authoritative `ef_experiment_result_source_contract_check`, and the Pack C EF gate explicitly requires both `20260718224543_add_experiment_foundation_pack_c_scientific_validation_v2` and `20260808090000_add_scientific_source_and_packet_closure_binding`.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node --test .ai/scripts/experiment-foundation-packc-ef-gate.unit.test.mjs .ai/scripts/experiment-foundation-packc-final-gate.unit.test.mjs`: passed, 12/12.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node .ai/scripts/experiment-foundation-packc-ef-gate.mjs --run-id packc-ef-20260808-r2`: passed, 76/76, zero failures/skips/blocks. Both migrations were source-hashed and deployed to the identity-marked disposable database; cleanup passed. Canonical digest: `sha256:d51bc93a5a2fe22e0c1d2662a97401ab88f66aa87dd6fc931840353d972e007d`. The transient generated gate directory was removed after verification.
- Final shared/backend typechecks passed. The final targeted P1 backend lane passed 51/51 with zero skips.
- Added optional `BACKEND_TEST_CONCURRENCY` support to the existing backend suite runner; unset preserves the prior Node default. `PATH=/opt/homebrew/opt/node@20/bin:$PATH BACKEND_TEST_CONCURRENCY=2 pnpm --filter @paper-engineering-assistant/backend test:repeat 1`: passed, 2467 pass / 0 fail / 68 existing conditional skips in 799.8 seconds.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`: passed with only the two pre-existing T-124/T-133 State-format warnings.
- `node .ai/scripts/lint-docs.mjs`: passed with 0 errors and the 204-warning repository baseline; no T-136 warning remains.
- `git diff --check`: passed.
- P1 status: implementation-complete, unreleased and default-off. P2 owns the source-bound Result v2 validation-reader cutover; P5 remains the only path to `M0-SCI: passed`.
- Safety: the gate used and removed a disposable container/database. No named-local database, cloud/provider resource, capability flag, credential or paid resource changed.

### 2026-08-08 — P2 product validation, CMP-B1 and evidence relay checkpoint

- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/shared typecheck`: passed.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck`: passed; the standard precheck regenerated Prisma Client from the unchanged repo SSOT.
- Shared scientific validation schema lane: passed 15/15. It accepts historical reports, validates the closed P2 comparison snapshot, rejects PI disposition fields/generic formulas and rejects metric-bearing Result commands.
- Targeted P2 backend lane covering product routes, identity-only source→Result generation, complete v2 batch validation, support/contradiction/indeterminate eligibility, higher/lower direction, point/CI bands, missing-CI failure, fact/hash replay and PI Trust Gateway: passed. The direct generated P2 Candidate chain produced exactly one REU, one trace and one `RunEvidenceUnitRegistered` outbox; replay made no additional writes.
- Final route composition regression caught Fastify's inability to compile canonical semantic `oneOf` unions for response serialization. The fix keeps the authoritative schemas strict and gives the serializer a closed field-equivalent projection; the route `app.ready()`/identity-command/read test then passed 1/1. The final P2 engine/rule/service/route lane passed 30/30, and shared/backend typechecks remained green.
- The existing Trust Gateway suite with a P2 comparison-bearing report passed 23 tests / 34 subtests, including hash/provenance rejection, transaction rollback and replay convergence.
- Pack C EF/final gate unit suites passed 12/12, and `git diff --check` passed.
- Repository documentation lint passed with 0 errors and 208 non-blocking wording warnings. Project-governance lint passed with the two existing unrelated state-format warnings for the T-124-era Paper Implementation task bundles.
- First fresh disposable run `packc-ef-20260808-r3`: failed 2 of 90 tests while still verifying identity and cleanup. One historical unsupported-rule test did not opt into legacy v1 validation; the new scientific protocol fixture also omitted the full D-19 dependency manifest required by materialization. No product defect or partial database survived the run.
- Resolution: make the historical wrapper explicitly test/migration-only legacy and bind the P2 protocol to all exact D-19 metric dependencies while keeping one scientific required rule/comparison. No production fallback or schema relaxation was added.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node .ai/scripts/experiment-foundation-packc-ef-gate.mjs --run-id packc-ef-20260808-r4`: passed 90/90, zero failures/skips/blocks. Both existing migrations were source-hashed/deployed; the v2 source→Result→CMP-B1 report→Candidate/outbox relational chain passed; cleanup passed. Canonical digest: `sha256:920292f2d0742e20b3c6bf5312cef6c235325e6cf9d51d917e6fdb1213ce9058`. The transient generated gate directory was removed after verification.
- Gate zero census: generic/route/adapter scientific writes `0`, existing database connections `0`, real-provider/external network requests `0`, scientific product writes outside the disposable fixture `0`.
- P2 status at checkpoint: implementation-complete, verified, unreleased and default-off. The scoped P0-P2 checkpoint commit is the rollback boundary for P3; T-136 remains in progress. Only P5 may record `M0-SCI: passed`.

### 2026-08-08 — P2 quality-review correction checkpoint

- Initial review regression reproduced: `experiment-v2-openapi-path-coverage.test.ts` reported all three scientific routes absent from `docs/context/api/openapi.yaml`. The paths and closed components were added, API indexes regenerated, and both OpenAPI quality and route-coverage checks now pass.
- Shared/backend typechecks pass under Node 20 after explicit artifact-slot binding, preregistered primary/exit fields and in-memory repository parity changes.
- Corrected targeted backend lane passed 64/64, then the focused source/rule/comparison/route rerun passed 27/27. It proves a source-bound artifact whose logical key differs from the legacy file name passes only through explicit rule binding; absent/invalid bindings fail closed.
- Shared scientific schema lane passed 15/15, including historical protocol readability and the new closed fields. Protocol service coverage includes canonical slot/rule ordinals, overlapping bands, CI admission mismatch, same-cell comparison, missing primary/exit and invalid artifact bindings.
- Route injection now carries one real comparison result through both POST and GET serialization and asserts the complete fact, CI policy/range and relation/reason projection remains field-equivalent.
- `ctl-openapi-quality verify`, `ctl-api-index verify` and `git diff --check` passed. Pack C now records `openapi_unit` as required PC05 evidence.
- Documentation lint passed with 0 errors and the existing 208-warning repository baseline. Project-governance lint passed with only the same two unrelated historical State-format warnings.
- Fresh disposable PostgreSQL gate `packc-ef-20260808-r5` passed 119/119 across 6 suites with zero failures/skips/blocks. Every evidence lane passed, cleanup was confirmed, and the canonical summary digest is `sha256:ef0c7c126c13d1733bfafcb338fc4c2aeec1a63e27f407859ddc7d6079114896`.
- Safety: no named-local database, cloud/provider request, capability flag, credential or paid resource changed. The disposable database/container was removed.

### 2026-08-08 — P0-P2 checkpoint cleanup and commit readiness

- Removed only reproducible ignored Pack C run directories, empty smoke/drift logs and the empty generated drift marker. Maintained database execution summaries and canonical gate digests remain.
- Preserved unrelated governance/commit-tooling changes and the separate topic-selection documentation edit outside the scoped T-136 checkpoint.
- Final commit-readiness reruns passed: shared/backend typechecks; Pack C EF/final gate units 12/12; OpenAPI quality; API-index freshness; documentation lint with 0 errors and the unchanged 208-warning baseline; and `git diff --check`.
- No named-local database, cloud/provider resource, capability flag or credential state was changed by this checkpoint.

### 2026-08-08 — P3 PI scientific closure verification

- P0-P2 cleanup/checkpoint commit: `93660c826dcb60110b954b5501c9f6afa2448def` (`feat(scientific): close P0-P2 evidence path`, exact `Task: T-136` trailer). Only reproducible ignored artifacts were removed; unrelated dirty-worktree changes were preserved.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/shared typecheck`: passed.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck`: passed; Prisma Client regeneration used the unchanged repo schema SSOT.
- Shared closure-preparation/evidence/runtime schema lane: passed 62/62. It proves the identity/CAS/proposal-only close command, nullable scientific authority consistency, scientific preparation template and versioned ResultAnalysis proposal while rejecting legacy/caller authority fields.
- Targeted agent-actions, ResultAnalysis runtime and closure service lane: passed 43/43. DISP-S maps support→positive/positive-exit, contradiction→negative/negative-exit and indeterminate→inconclusive/inconclusive-exit; missing/duplicate primary, stale proposal/watermark and changed replay reject without writes.
- Targeted PaperImplementation experiment/general route regression: passed 17/17. Closure remains default-off in app composition and strict route identity/error behavior is unchanged.
- OpenAPI strict quality passed after removing the correction field, documenting the bare runtime proposal hash and adding the hash-bound scientific authority. API index generation and freshness verification passed for 208 endpoints.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node .ai/scripts/experiment-foundation-packc-pi-gate.mjs --run-id packc-pi-20260808-r1`: passed 151/151 across seven suites, zero failures/skips/blocks. Canonical summary digest: `sha256:d1d82d81f7b59f6af43d7561190f150eac7bb00d3d1dead52b7946f882689c62`.
- The gate's relational lane passed 6/6. New P3 case `P3 scientific closure rereads one admitted proposal, protocol and primary fact in PostgreSQL` passed through the production Trust Gateway, runtime admission repository and serializable Closure transaction, then exact replay produced no duplicate Closure/outbox.
- Disposable identity: nonce-bound `packc_pi_26171b40f927`, pinned pgvector image digest, identity marker verified, existing database URL unused, cleanup confirmed. The reproducible gate directory was moved to the macOS Trash after its canonical digest and counts were recorded.
- P3 status: implementation-complete, verified, unreleased and default-off. P4 is next; T-136 remains in progress and only P5 may record `M0-SCI: passed`.
- Safety: no named-local database, provider/cloud request, capability flag, credential or paid resource changed.

### 2026-08-08 — P3 quality-review remediation

- Review findings closed: caller-authored scientific context/source bodies removed; product/provider/official-policy proposal admission enforced; runtime envelope and admission payload/identity canonically revalidated; REU/report Run binding and complete REU canonical rehash added; REU/report/protocol resolution reduced from N+1 to three bounded batch queries; relation test replaced its synthetic generic artifact with the real ResultAnalysis→official admission→Closure path; OpenAPI preparation wording corrected.
- Final Node 20 shared/backend typechecks: passed. Backend pretypecheck regenerated Prisma Client from the unchanged repository SSOT.
- Shared ResultAnalysis runtime schema test: passed 50/50. It accepts the one-field scientific intent only for product/provider and rejects caller context/source bodies.
- Final ResultAnalysis/context-resolver unit lane: passed 20/20. It proves route-independent rejection of retired caller context, rejection of caller source bodies, server context delivery, admitted scientific final creation and shared-protocol source deduplication across two ordered REUs.
- Combined ResultAnalysis/Closure/route regression: passed 56/56 with zero skips. The app remains default-off, strict route identity/error behavior is unchanged and all DISP-S/stale/replay cases remain green.
- `ctl-openapi-quality verify` and strict API-index freshness verification passed after regenerating 208 endpoints. The preparation operation now documents both control and scientific templates.
- First disposable review-fix gate `packc-pi-20260808-r2`: failed 150/151 solely because the rewritten real runtime test exposed that its historical fixture created a ValidationCycle without the required active ImplementationProject. Identity marker and cleanup passed; no disposable state survived.
- Fixture correction: seed the exact ImplementationProject aggregate before the Cycle. No product fallback, preflight relaxation or synthetic artifact helper was restored.
- Intermediate rerun `packc-pi-20260808-r3`: passed 151/151 and relational 6/6. After adding explicit shared-protocol deduplication coverage and route-independent retired-context rejection, final gate `packc-pi-20260808-r4` again passed 151/151 across seven suites with zero failures/skips/blocks. Relational passed 6/6; identity-marked disposable database `packc_pi_3237d12d249c` was cleaned up. Canonical final summary digest: `sha256:a6091dbe7cc269e75d8b10f0293812af6a6c165f5b854753e67fbe9cf2392e0e`.
- Final relational case proves: actual ResultAnalysis service and server context resolver; product/provider runtime identity; official v1 admission; canonical envelope/admission identities; generic-policy rejection with zero Closure writes; an unprojected REU field drift hidden behind the old stored `contentHash` is rejected with zero writes; restored authority closes once and exact replay produces no duplicate Closure/outbox.
- Documentation lint passed with 0 errors and the unchanged 208-warning repository baseline. Project-governance lint passed with only the two unrelated historical T-124/T-133 State-format warnings; `git diff --check` passed.
- Reproducible ignored review-gate directories `packc-pi-20260808-r2` through `r4` were moved to the macOS Trash after their outcomes and final canonical digest were recorded.
- Safety: all database verification used randomized disposable PostgreSQL with existing database URL explicitly unused. No named-local database, cloud/provider request, capability flag, credential or paid resource changed.

### 2026-08-08 — P3 final authority-boundary remediation

- Node 20 ResultAnalysis/context/Closure target lane passed 44/44 with zero failures/skips. Added cases prove canonical Cycle alias persistence, independent domain/runtime versions, missing-Cycle 404, no-branch 409 and bounded serializable-conflict retry exhaustion.
- Shared ResultAnalysis runtime contract lane passed 50/50. The scientific intent remains product/provider-only and caller scientific source bodies remain structurally forbidden.
- Production `buildApp` HTTP target passed 2/2 with 54 unrelated tests skipped by name filter: authoritative scientific intent returns one admitted scientific final; a missing Cycle returns stable 404 before any provider call or runtime artifact write.
- OpenAPI strict quality, generated API-index freshness and context verification passed. The new served ResultAnalysis path raises the generated index from 208 to 209 endpoints and documents the no-caller-body scientific intent.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node .ai/scripts/experiment-foundation-packc-pi-gate.mjs --run-id packc-pi-20260808-r5`: passed 151/151 across seven suites with zero failures/skips/blocks; relational passed 6/6. The relation lane now rejects a payload-only expected-output-schema tamper with zero Closure/outbox writes and closes successfully when Cycle alias input and domain/runtime versions differ.
- Disposable identity `packc_pi_6baf39f48ba4` used the reviewed digest-pinned pgvector image; marker verification passed, existing database URL use stayed false and cleanup passed. Canonical summary digest: `sha256:7e0d554bb94dc9c6a6d8cc29ad9b52a0ffc874a57eb2183ae6359d121e820da1`.
- The reproducible ignored `packc-pi-20260808-r5` gate directory was moved to the macOS Trash after the digest and counts were recorded; the directory remains recoverable until Trash is emptied.
- Final shared/backend Node 20 typechecks and `git diff --check` passed after the handoff update. Task-bundle documentation lint passed with 0 errors and 4 pre-existing vague-reference warnings; project-governance lint passed with only the two unrelated historical T-124/T-133 State-format warnings.
- Safety: no Prisma SSOT/migration, named-local database, provider/cloud request, capability flag, credential or paid resource changed.

### 2026-08-08 — Cleanup and semantic single-track audit

- `find` found no editor residue (`.DS_Store`, `.orig`, `.rej`, swap, backup or `.tmp` files) outside ignored dependency/VCS trees.
- No T-136 `packc-ef-20260808-*` or `packc-pi-20260808-*` directory remains under `.ai/.tmp`; their maintained counts/digests remain in this file. Older ignored task evidence was treated as out of scope rather than deleted by age or name.
- `pnpm --filter @paper-engineering-assistant/shared exec tsc --noEmit --noUnusedLocals --noUnusedParameters`: passed.
- `pnpm --filter @paper-engineering-assistant/backend exec tsc --noEmit --noUnusedLocals --noUnusedParameters`: passed.
- Static authority census found one Prisma `PaperImplementationValidationCycleClosureV2` create call and one non-test `ValidationCycleClosed@v1` producer. The legacy `completeValidationCycle` method contains no read/write path and always returns stable 409 `LEGACY_SCIENTIFIC_WRITER_CLOSED`.
- Composition census found one empty in-memory Closure repository construction in `buildApp`; scientific proposal/evidence-authority arrays are injected only by tests. The in-memory adapter shares the v2 service path and cannot form an alternate durable product writer.
- Public-boundary census found zero `scientific_closure_context` occurrences in OpenAPI/API-index artifacts and zero active `corrected_scientific_disposition` fields in shared/backend/OpenAPI implementation. Their remaining source occurrences are negative schema/runtime tests; archived historical artifacts remain immutable.
- Dependency census retained both new scientific context files: production app composition imports the service; ResultAnalysis consumes its resolver port; unit and relational suites exercise the implementation. No task-owned source or maintained generated contract was proven dead.
- Node 20 shared closure/evidence/runtime contract lane passed 62/62. The request remains identity/CAS/proposal-only, scientific intent remains the only public factual-request face and legacy/caller authority fields remain rejected.
- Node 20 backend authority lane passed 58/58 across planning, scientific context, ResultAnalysis and Closure services. The legacy completion tombstone rejects below HTTP, caller scientific context/bodies fail closed and v2 Closure remains atomic and replay-idempotent.
- Documentation lint passed with 0 errors; T-136 remains at the four pre-existing vague-reference warnings, and the repository-wide current dirty-worktree total is 208 warnings.

### 2026-08-08 — P4 ResultInterpretationPacket closure

- Scope: one post-Closure Packet materializer, exact PKT-S repository write, composed relay delivery and closed Packet Claim/Dossier reads. No named-local database, cloud/provider operation, capability mutation, credential or UI work occurred.
- Strict Node 20 shared and backend typechecks passed with `--noUnusedLocals --noUnusedParameters`; `git diff --check` passed.
- Final affected schema gate passed 30/30, including all-absent/all-null legacy Packet compatibility, complete v2 binding and partial-binding rejection. Packet/Claim/Prisma repository/relay units passed 41/41; Closure and contract-evaluation regressions passed 26/26; full PaperImplementation route integration passed 7/7.
- Pack C-PI meta-gate passed 7/7 and now requires `P4-PI` Packet contracts, Packet units and the named real PostgreSQL Closure→Packet subtest. Static census permits only the repository port, its two adapters and the sole materializer to mention the v2 writer; unexpected writer count, missing wiring count and other Closure producer count are all zero.
- Final fresh disposable gate `packc-pi-20260808-r8` passed 193/193 across eight suites with zero failures, skips or blocks. Contracts passed 30/30, Packet lane passed 36/36 and relational passed 6/6, including production scientific Closure→event claim→Prisma Packet→exact replay with one Closure-owned row.
- Disposable identity `packc_pi_697a944c367e` used the reviewed digest-pinned pgvector image; identity marker verification passed, existing database URL use remained false and cleanup passed. Canonical summary digest: `sha256:4925fe76fccfae97dabbdb230ab7af28df44f605c48d3dbf7718f30e69bc7e05`.
- OpenAPI strict quality and API-index freshness passed. Documentation lint passed with 0 errors and the unchanged 208-warning repository baseline; project-governance lint passed with only the two unrelated historical T-124/T-133 State-format warnings.
- Reproducible ignored gate directories r6-r8 were moved to the macOS Trash after the final r8 counts and digest were recorded; no maintained source or historical task evidence was removed.
- Result: P0-P4 is `implementation_complete_unreleased`. P5 remains the only incomplete phase and still requires deterministic package preflight plus separate user authorization before any paid or named-local operation.

### 2026-08-09 — P4 quality-review closure

- Review findings fixed: altered-but-rehashed Closure event mirrors, identical concurrent Packet `P2002` races, non-exact Claim→REU/Packet bindings, cross-Packet Dossier Claim lineage, mismatched ClaimTracePacket targets, over-wide/narrow dossier claim ceilings and omitted forbidden-overclaim boundaries.
- Focused Node 20 Packet/Claim/Prisma units: 40/40 passed. Strict shared and backend typechecks and `git diff --check` passed. Full PaperImplementation route integration: 7/7 passed.
- Fresh disposable gate `packc-pi-20260809-r9`: 197/197 passed across eight suites, 0 failed, 0 skipped and 0 blocked. Packet lane passed 40/40; relational lane passed 6/6.
- Disposable PostgreSQL identity `packc_pi_973ff2bf68f0` used the reviewed digest-pinned pgvector image, ignored existing database URLs, verified its identity marker and cleaned up successfully. Canonical digest: `sha256:88613c3782e630f802845ce29e3fd88df44cef996c64b1f5a99acb679068bce1`.
- The ignored r9 evidence directory was moved to macOS Trash after the digest and counts were recorded. No named-local database, provider request, external network request, capability flag or credential state changed.
- Result: P4 is review-closed at the `implementation_complete_unreleased` checkpoint. P5 package/preflight is next; paid execution and named-local mutation still require the separately frozen package hash and explicit user authorization.

### 2026-08-09 — P5 deterministic package/preflight kernel

- `scientific-evidence-p5-eligibility-service.unit.test.ts`: passed 9/9 under Node 20. The lane proves stable eligible-record replay, package-hash sensitivity, package/authority drift rejection, canonical WorkOrder-cell binding, exactly-one-factor enforcement, parser comparability, protocol revision rehash, credential TTL/recovery ordering, exact operation/cost/capability ceilings, forbidden secret/outcome fields and reused-Run rejection.
- Existing shared experiment hash/schema regression lane: passed 24/24. The three new P5 hash profiles remain domain-separated and the existing Pack B/Pack C profiles and schemas are unchanged.
- Strict `@paper-engineering-assistant/shared` and `@paper-engineering-assistant/backend` typechecks pass under Node 20. Backend pretypecheck regenerated Prisma Client from the unchanged repo schema; P5 adds no Prisma model or migration.
- Review correction: an initial P5-local protocol/cell/parser projection sketch was removed before checkpoint because it would duplicate existing scientific identities. The maintained validator embeds and rehashes the existing WorkOrder, RunCell, TaskSpec and EvaluationProtocol objects, while only P5-specific operational constraints remain new.
- Read-only workload census: the existing T-132 `ragperf-canary` entrypoint/manifest/ExecutionBundle is explicitly diagnostic-only and lacks the P1 scientific parser/result-schema binding. The eligibility kernel therefore cannot admit an exact package built from the historical bundle; a new P5 workload identity is required.
- Safety census: no named-local database read/write, provider/cloud request, credential resolution, capability mutation, paid operation, UI route or standing approval state occurred. No concrete package/authority/preflight artifact was generated, and `M0-SCI` remains not passed.

### 2026-08-09 — P5 scientific workload, bundle binding and recovery

- Official archive verification passed: SciFact ZIP SHA-256 `536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165`; MD5 `5f7d1de60b170fc8027bb7898e2efca1` matches the BEIR catalogue. The archive contains `5183` corpus rows, and the exact test slice contains `300` queries plus `339` positive qrels rows.
- Qrels verification passed: all `339` rows have positive relevance, cover `300` distinct query ids and `283` corpus ids, and every referenced id exists in the frozen corpus/query inputs. Exact qrels SHA-256 is `0864bb985e0ca2367ba217977e72004d549054b2b06666ed9d4825ac7c21284c`.
- Tiny offline fixture passed: top-10 emitted `1000000` ppm and top-5 emitted `0` ppm. Both envelopes validate the shared provider-envelope and scientific-result schemas, and their bytes equal the JavaScript canonical JSON rendering. A mismatched source-bound cell key is rejected before input evaluation.
- Full offline workload passed deterministically: top-10 retrieved `146/339` (`430678` ppm), top-5 retrieved `125/339` (`368731` ppm). Repeated ranking checksums were stable. The run was classified `passed_non_evidence`; it wrote no Product Result, EvidenceCandidate, REU or PI authority.
- Provider scope/bundle/P5 focused backend lane passed `14/14`. It includes diagnostic/scientific scope mismatch rejection, exact scientific scope acceptance, full ExecutionBundle schema/hash validation and package drift rejection. The shared contract adds both mismatch directions at the JSON Schema boundary; the broader canonical/schema regression passed `36/36`.
- Strict Node 20 shared and backend typechecks passed with `--noEmit --noUnusedLocals --noUnusedParameters`. No Prisma schema or migration changed.
- Workload self-verification passed after the source-binding hardening: entrypoint size `10155`, SHA-256 `75875a4d1b2169d791154a8f2368ef383bca03d771d9a7e3ecda08872c634597`; canonical dependency-lock hash `a483a22efe12892fff918ad640137f91d01b5eb599b313e0984236868d01a6a4`; every cell/manifest JSON file parses and the OSS plan carries the same immutable code identity.
- Named-local read-only census passed against target fingerprint `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`: Dataset `4`, ExecutionBundle identity `1`, WorkOrder revisions `10`, Runs `10`.
- A first full schema+data dump was terminated after it exceeded 3 GB because it was capturing unrelated Literature data. Its incomplete file was removed. The retained recovery set passed `pg_restore --list`: full schema TOC `2036`, scoped authority-data TOC `114`; individual SHA-256 hashes and the combined recovery fingerprint are recorded in `03-implementation-notes.md`.
- At the recovery checkpoint, credential census found no Alibaba/OSS temporary credential in process environment, `.env.local`, `~/.aliyun` or an OSS utility configuration, so no remote HEAD/CRC verification or object upload occurred at that time. The later OSS/stage-one section supersedes this historical preparation status.
- Safety: no named-local data row changed, no provider/cloud mutation occurred, no capability opened, no credential was persisted and no paid `CreateJob` was submitted.

### 2026-08-09 — P5 OSS preparation, named-local stage one and exact preflight

- OSS preflight proved both new keys initially returned `404 NoSuchKey`. The workload (`10155` bytes, ETag `DF982909F736D6C96AB5D5BC4E000944`, CRC64 `12374963249186617340`) and qrels (`5389` bytes, ETag `CD0B61FE12D16A9605897A7FFE40E3F02`, CRC64 `7571586496273109249`) were uploaded once and downloaded back with exact source SHA-256. Existing corpus/query object lengths, ETags and CRC64 values were verified; no object was overwritten or deleted.
- Multi-part ExecutionBundle tests pass 16/16 across bundle and P5 eligibility lanes. A single exact Dataset revision may bind queries/qrels object parts, while duplicate refs and same-revision content drift fail closed.
- The first named-local attempt stopped at a blocked protocol readiness before Bundle/Cycle/Run creation. Exact census found only 84 T-136 asset-prefix rows; one transaction removed exactly those 84 rows and historical T-132 Cycle/readiness/Bundle sentinels remained byte-identical. The corrected plan added dependency readiness before final protocol readiness.
- Corrected named-local apply passed against target `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`: both recovery dumps rehashed exactly, 146 expected rows were created, all 217 protected tables were unchanged, no external fetch occurred and immediate exact replay created zero rows.
- A later independent-process rerun started from `initial_scope_state=complete`, created zero apply rows and zero replay rows, changed no historical authority, observed zero external fetches and reconfirmed every prohibited-effect count at zero.
- Final authority census: one new Cycle, one WorkOrder revision, two cells, one active/passed scientific ExecutionBundle and one fresh frozen two-cell Run. ProviderPayload, ExecutionAttempt, ExperimentResult, ScientificValidationReport, EvidenceCandidate and RunEvidenceUnit counts are all zero.
- Read-only package preparation returned `eligible` with zero reason codes. Package hash `sha256:98674502814e052becd6f57e91817bca8ef90980cc621b244bb0013bc1c9f352`; authority snapshot `sha256:bfdae4ab6da739675e6192ef8ceb531f79d1cf3f700a477e5a6ac90a60b3226d`; eligibility record `sha256:ea160c7ae61a18f8890f9630f16619bf840ce79e69e1e03731c3887897ddfa61`.
- Prepared-operation census: database writes 0, cloud calls 0, credential reads 0, capability changes 0 and `CreateJob` calls 0. `M0-SCI` remains not passed; the next gate is explicit authorization of the exact prepared package.
- Authorization receipt: the user authorized package `sha256:98674502814e052becd6f57e91817bca8ef90980cc621b244bb0013bc1c9f352` with the exact two-operation, cost, capability-window and credential-cleanup bounds. The 400-byte UTF-8 authorization text hashes to `sha256:0165a39dcc081e9b76e6e09e1aa1e5af726c6d5a7721adb594492faef2e9af89`; no cloud call, capability change, credential read or database write was performed while recording it.
- Credential feasibility preflight: `.env.local` contains no AccessKey, secret, security token or expiration, so no credential was exposed or persisted. Alibaba Cloud's official STS guidance states that the token becomes invalid by expiration and requires no manual revocation. Because the authorized wording requires post-run revocation, `authorization-acceptance-v1.json` is `authorization_received_preflight_blocked`; zero `CreateJob` calls remain the enforced state pending confirmation of the expiry-based cleanup replacement.
- Credential cleanup confirmation: the user approved a 3,600-second window-start STS session, immediate process/profile deletion, automatic invalidation no later than 11:00 and after-window expiry verification, while explicitly prohibiting RAM role/policy mutation. The 293-byte UTF-8 confirmation hashes to `sha256:ff88f3c9090afcd139c5618749e768487c34148689f24d02981c97f945fe23c0`; the authorization record is `authorized_pending_window` and `CreateJob` count remains zero.
- P5 live-runner compile: the Node 20 experiment-foundation scripts TypeScript lane passed after correcting the report identity to the contract's `report_id` field.
- P5 live-runner offline preflight: passed with the exact package/Run/bundle hashes, zero existing Attempts, Results, validation reports, REUs and undelivered integration outboxes. Cloud calls, database writes, credential reads and capability changes were all zero.
- P5 live-runner negative window gate: invoking `--mode execute` on 2026-08-09 failed with `T136_P5_EXECUTION_OUTSIDE_AUTHORIZED_WINDOW` before credential read or process-capability enable; `CreateJob` remains zero.
- Authorization-record semantic check: `authorization-acceptance-v1.json` now records a 10:00 issue time, exact 3,600-second duration, immediate process/local-config cleanup, automatic expiration by 11:00, local/expiry verification and `manual_revocation_required=false`; it also records that RAM role/policy mutation is forbidden. The prepared pre-authorization artifact was not rewritten.
- P5 closure-runner compile: `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` passed after adding the registered model-binding preflight.
- P5 closure-runner offline preflight: passed against target `sha256:8851b255b079ad1f049dc1842c41cb3516d5a3ff0b69e21a30e8f2675409cca0`, with zero Results/reports/REUs/runtime artifacts/Closures/Packets. It resolved `paper-implementation.result-analysis.interpretation-scenarios.v1.openai-balanced` to OpenAI `gpt-5.6-sol`, confirmed the provider key is configured without logging its value, performed zero provider calls/writes and read no Alibaba credential.
- P5 closure-runner negative window gate: invoking `--mode execute` on 2026-08-09 fails with `T136_P5_CLOSURE_OUTSIDE_AUTHORIZED_WINDOW` before the closure capability is enabled; Alibaba credentials are rejected before both modes.
- Current-task automation: the existing `t-136-p5` heartbeat is active for one 2026-08-10 run at 06:55 Asia/Shanghai. Its prompt preserves the revision-2 package/authorization/cleanup-confirmation hashes, 07:00 cloud-write boundary, two-call/¥50 ceilings, separate credential-free closure process, no RAM mutation, Claim/Dossier/replay continuation and after-08:00 expiry verification.
- Window-revision preparation: the user request text `可以把窗口改到7:00 - 8:00` is 32 UTF-8 bytes with digest `sha256:5f47321dd0dfe1818bde2ae69664053374133b4d95b1d9af7338fe7b82c60ea6`. Rebuilding only the capability window produced eligible package `sha256:719fb5ab6384913b84b3de0ad3f3c6740fd31eed6ce3fceb95afaf86bb24b306`; authority snapshot stayed byte-identical and the new eligibility record is `sha256:9b1c044d3d3ba249fb3b125ffa032427e06f377d13ed5c20f40a966aa9ad6738`.
- Window-revision safety: `prepared-authorization-v2.json` exactly matches fresh builder output, all seven original JSON manifests plus both revision-2 manifests parse, the experiment-foundation script typecheck passes under Node 20 and `git diff --check` passes. Exact authorization receipt is 251 UTF-8 bytes with digest `sha256:1af9ae8f627c67eb8bf048156e8f4a3cab54222db520130fa07ef07b00325769`; `authorization-acceptance-v2.json` is `user_authorized=true` and `authorized_pending_window`. Database writes, cloud calls, `CreateJob`, capability changes and credential reads remain zero.
- Authorized revision-2 preflight: after correcting the stale display-only timezone expectation, live offline preflight passed with zero existing Attempts/Results/validations/REUs/outbox deliveries and zero cloud calls, writes, credential reads or capability changes. Closure offline preflight passed `waiting_for_real_evidence`, pinned OpenAI `gpt-5.6-sol` and also performed zero external calls/writes/Alibaba credential reads/capability changes.
- Window fail-closed gate: at 06:20 Asia/Shanghai both live and closure `execute` modes rejected with their stable outside-window codes before credential or capability use. The maintained prepared manifest and fresh builder output have identical canonical SHA-256 `8bc4c3ec7194cc1b9dde72b063f5b11938d0c62a550322892599c3a9d5f4ebc0`; all workload manifests parse, the script typecheck and `git diff --check` pass.
- 07:00 execution-window result: package/live/closure zero-effect preflights passed at 06:55 with the exact revision-2 hashes and zero existing P5 effects. Chrome login was valid, but the timed boundary action failed before browser command dispatch; the page remained on parameter configuration with no call result and also reported that the logged-in caller was outside the prepared runtime-role trust policy. Post-failure live preflight reconfirmed zero Attempts/Results/validations/REUs/outbox deliveries, cloud calls, writes, credential reads and capability changes. Process Alibaba variables are absent; the pre-existing user `~/.aliyun` configuration was not read, changed or deleted. No retry, replacement or RAM mutation occurred.
- Revision-3 role-path read-only audit: Alibaba `GetCallerIdentity` returned RAM user `acs:ram::1183869713036194:user/user_0002`. `ListRoles` found 52 existing roles including distinct `pea-m7-canary-controller` and `pea-m7-canary-runtime`; `GetRole` showed the controller already trusts only `user_0002` for `sts:AssumeRole` with a 3,600-second maximum. `ListPoliciesForRole` and `GetPolicyVersion` showed one attached custom policy v4 containing DLC create/get/list/stop, exact workspace read, exact runtime-role pass, image read and result-only OSS read, with OSS write/delete and Job delete denied. No STS was issued and no role, trust or policy state changed.
- Revision-3 package build: named-local read-only preparation produced eligible package `sha256:43de262907c34c1f686c2a6cb7cc1642e9ab620bb37bbbc163b560f8b2512d8b`, unchanged authority snapshot `sha256:bfdae4ab6da739675e6192ef8ceb531f79d1cf3f700a477e5a6ac90a60b3226d`, eligibility `sha256:d25a1c9a440b7554d091f804fd3963be9c8309c76a4216240bdc92b7ed91cb07` and session policy `sha256:0fa880fe5cd807186c1a93a677a27ba3e561672e7147568c2fa6e732913e2d7b`. Effect census is zero for database writes, cloud calls, credentials, capabilities and `CreateJob`.
- Revision-3 focused regression: P5 eligibility plus authorization/qualification suites pass 19/19. They reject package/authority/eligibility drift, controller/runtime conflation, session-policy expansion, bad issuance timing, authorization mirror drift, wrong-controller/different-credential qualification, unexpected secret-bearing fields and a tampered non-zero `CreateJob` census. Shared/backend strict Node 20 typechecks and the experiment-script TypeScript lane pass.
- Revision-3 pre-authorization zero-effect runner preflights: credential qualification reports `passed_waiting_for_exact_authorization_and_issuance_window`, no qualification record and zero credential/cloud/write/capability effects. Live reports the exact new package with zero Attempts/Results/reports/REUs/outboxes and planned—not authorized—two operations/¥50. Closure reports zero scientific/runtime/Closure/Packet rows and reads no Alibaba credential. At that checkpoint neither `authorization-acceptance-v3.json` nor a credential qualification record existed.
- Revision-3 authorization receipt: the exact user text is 2,275 UTF-8 bytes with digest `sha256:41e074119f7020ae02fe37cf6188c4bb9651122500fe73b0e86a15aa132815a6`. The independent acceptance validator passed exact equality against package `sha256:43de262907c34c1f686c2a6cb7cc1642e9ab620bb37bbbc163b560f8b2512d8b`; workload status is `authorized_pending_issuance`. A fresh preparation plus qualification/live/close offline preflight passed with no relevant process environment keys, no qualification record, zero existing P5 effects and zero cloud/database/credential/capability effects.
- Revision-3 execution result: the zero-effect preflight completed at 08:25:04 Asia/Shanghai. The only authorized `AssumeRole` was dispatched once at 08:27:21 and returned at 08:27:23 with request id `019FE911-28FC-5916-8345-74A19ADEB344`, exact controller session ARN `acs:ram::1183869713036194:role/pea-m7-canary-controller/t136-p5-scifact-20260810-r3`, a 3,600-second lifetime and expiration `2026-08-10T01:27:23Z`. The qualification invocation exited at its local time gate with `T136_P5_QUALIFICATION_OUTSIDE_ISSUANCE_WINDOW`; qualification read calls, `CreateJob`, provider writes, database writes and capability changes are all zero. No qualification record was written and no live/close runner was invoked.
- Revision-3 post-failure cleanup: the credential-bearing child exited, all temporary credential references were overwritten and the persistent execution kernel was reset. The independent shell environment contains no Alibaba variables, no T-136 qualification/live/close process remains, none of the four capability keys exists in the process or `.env.local`, and no file under the pre-existing `~/.aliyun`/`~/.alibabacloud` trees was modified after 08:24. A fresh credential-free live offline preflight still passes with `existing_attempt_count=0`, `existing_scientific_result_count=0`, `existing_validation_count=0`, `existing_run_evidence_count=0` and `undelivered_integration_outbox_count=0`. The STS expiration is retained only as non-secret metadata for an after-09:30 time comparison.
- Revision-3 expiration verification: at `2026-08-10T01:30:54.216Z`, the recorded expiration `2026-08-10T01:27:23.000Z` was 211 seconds in the past. This used only local current time and non-secret metadata; no credential, browser, cloud API or RAM action was used. Alibaba environment variables and T-136 runner processes are absent, all four capability keys remain absent/default-false, `credential-qualification-v1.json` remains absent, and zero local credential-profile files changed after 08:24.
- Revision-3 final offline preflight: `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight` passed for package `sha256:43de262907c34c1f686c2a6cb7cc1642e9ab620bb37bbbc163b560f8b2512d8b`. It reported Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered integration outboxes `0`, cloud calls `0`, database writes `0`, credential reads `0` and capability changes `0`. Final accounting is `AssumeRole=1`, qualification read calls `0`, `CreateJob=0`, paid cost CNY `0`; M0-SCI remains not passed.

### 2026-08-10 — P5 revision-4 timing implementation

- The strict shared and backend Node 20 typechecks pass, including `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts`.
- Focused eligibility, authorization and operational-timeline tests pass 24/24. Boundary cases cover deterministic derivation plus outside-dispatch, qualification, live-start, credential-operation and close rejection under an injected clock.
- A named-local read-only preparation dry run with intentionally expired test start `2026-08-10T02:00:00.000Z` returned package schema v3, attempt 2, `eligible`, no reason codes and package hash `sha256:ddcb5c0d039e051035f9ade657b0cd43a7a50a6d98330913ac35602a270998de`. The hash is not retained and is not an authorization candidate.
- The dry run reported database writes `0`, cloud calls `0`, credential reads `0`, capability changes `0` and `CreateJob` calls `0`. No Alibaba environment credential or capability variable was introduced.
- `workload-profile-v1.json` is revision 4 and has null current prepared-package/acceptance refs, `authorization_status=awaiting_exact_window_and_package`, `create_job_authorized=false` and `capability_enable_authorized=false`. `prepared-authorization-v4.json`, `authorization-acceptance-v4.json` and `credential-qualification-v1.json` are absent.
- Revision 4 is implementation-complete but not execution-authorized. There are no new scientific database rows, no paid cost and no basis to mark `M0-SCI: passed`.
- Final local consistency checks pass: every workload JSON parses, `git diff --check` is clean, no active runner references revision-3 authorization paths/attempt-1/single `capability_window`, and the four capability variables plus Alibaba credential-variable prefixes are absent from the process environment. The revision-4 prepared package, acceptance and qualification files remain absent.
- `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` passes. Its only warnings are the two pre-existing state-format warnings in unrelated T-124/T-133 task bundles; it reports no T-136 error.

### 2026-08-10 — P5 revision-4 exact package preparation

- User schedule input `2026-08-11 07:00:00` Asia/Shanghai was normalized to `2026-08-10T23:00:00.000Z`. `scientific-evidence:p5:prepare-package -- --revision-4-start 2026-08-10T23:00:00.000Z --write-manifest` wrote `prepared-authorization-v4.json` with package `sha256:47260f21c7d42d4a57d70ba627bed35888eb4f4d91c8f0ca7a4a67e1a0787a4c`, authority snapshot `sha256:248e6ef81b2d489b2025627ffc3f469b1a11e8adcfb8d97958bab917a4bc7b76` and eligibility record `sha256:d4311a9075ec38cdd847abf4136debf2b32531e6017d84b35af5515523867179`.
- A second invocation without `--write-manifest` returned those same three hashes, `eligible`, zero reason codes and the same all-zero effect census. This proves deterministic reconstruction from the named-local authority and exact start.
- Credential qualification offline preflight passed with `passed_waiting_for_exact_authorization_and_operational_window`, no qualification record and credential/cloud/`CreateJob`/database/capability counts all zero.
- Live offline preflight passed with Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered integration outboxes `0`, planned—not authorized—`CreateJob=2` and planned ceiling CNY 50. Actual cloud calls, database writes, credential reads and capability changes are zero.
- Close offline preflight passed `passed_waiting_for_real_evidence` with scientific Results/reports/REUs/runtime artifacts/admissions/Closures/Packets all zero. It made no external call or database write, read no Alibaba credential and logged no model-provider secret value.
- Current authority census: `prepared-authorization-v4.json` exists and parses; `authorization-acceptance-v4.json` and `credential-qualification-v1.json` are absent. Workload profile status is `prepared_awaiting_exact_authorization`, with `create_job_authorized=false` and `capability_enable_authorized=false`.
- No STS was issued, no cloud API was called, no capability was enabled and no scientific database row was written. Package preparation does not change `M0-SCI: not passed`.
- Preparation-projection regression: after moving the profile transition into the maintained builder, the experiment-foundation script typecheck passes and an idempotent `--write-manifest` rerun returns the identical package/authority/eligibility hashes and all-zero effect census. The workload profile remains byte-semantically aligned, no `.tmp-*` file remains, and the focused revision-4 suites still pass 24/24.

### 2026-08-10 — P5 revision-4 exact authorization

- The exact user authorization is 2428 UTF-8 bytes with digest `sha256:3ba46547640b22bd6619e00f5b2b72d8ea0d32727d194475265a22f400a93c54`. `authorization-acceptance-v4.json` records that receipt and contains no Alibaba or model-provider credential material.
- Qualification offline preflight validates the acceptance and reports `passed_waiting_for_exact_authorization_and_operational_window`, package `sha256:47260f21c7d42d4a57d70ba627bed35888eb4f4d91c8f0ca7a4a67e1a0787a4c`, no qualification record and zero credential/cloud/`CreateJob`/database/capability effects.
- Live offline preflight validates the same acceptance and reports Attempts/Results/validations/REUs/outbox deliveries all zero, with exactly two planned Jobs and CNY 50 planned ceiling. Actual cloud calls, writes, credential reads and capability changes remain zero.
- Close offline preflight validates the same acceptance, reports all scientific/runtime/Closure/Packet counts zero and makes no provider/cloud call or database write. It reads no Alibaba credential and logs no model secret.
- An idempotent `prepare-package --write-manifest` rerun returns the same eligible package and all-zero census after acceptance. The workload profile remains `authorized_pending_issuance`; preparation does not regress the acceptance-owned state.
- The Codex app rendered the one-time heartbeat `t-136-p5-revision-4-execution` for 06:55 Asia/Shanghai. Its prompt repeats the exact package, authorization-text, authority, eligibility, session-policy and cleanup hashes plus all no-early-cloud, qualification, paid execution, cleanup, expiration and no-RAM-mutation guards.
- Authorization recording and scheduling performed no STS issuance, credential read, cloud call, database write, capability enable or `CreateJob`. `M0-SCI` remains not passed pending the real acceptance run.
- Worktree handoff: governance reports 44 repository-wide uncommitted entries spanning the maintained T-136 P5 implementation and manifests. This state is verified but not described as landed; no commit was requested, and the one-time execution must continue in this same workspace rather than assuming HEAD contains revision 4.

### 2026-08-11 — P5 revision-4 missed automation and final zero-effect audit

- Time gate: local time was `2026-08-11 20:57:45 +0800`, more than twelve hours after the 08:30 authorization cutoff. No catch-up cloud action is legal under the revision-4 package.
- Persistence evidence: `/Users/yurui/.codex/automations` contains zero entries and its modification time is `2026-08-10 09:32:02 +0800`, before the attempted heartbeat creation. The last-24-hour Codex system-log query found no automation or heartbeat registration/trigger line.
- Automation API evidence: deletion of `t-136-p5-revision-4-execution` returned `deleteStatus=not_found` and explicitly stated that the automation already did not exist. This supersedes the earlier card-rendering observation.
- Final live offline preflight passes for the unchanged revision-4 package with Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`, cloud calls `0`, database writes `0`, credential reads `0` and capability changes `0`.
- Final close offline preflight passes `passed_waiting_for_real_evidence` with Results/reports/REUs/runtime artifacts/admissions/Closures/Packets all zero and no external call, database write or Alibaba credential read.
- `credential-qualification-v1.json` is absent; process Alibaba variables and all four capability variables are absent. Final accounting is AssumeRole `0`, qualification read calls `0`, `CreateJob=0`, cost CNY `0`, scientific database rows `0`; `M0-SCI` remains not passed.

### 2026-08-11 — Revision-5 missed-start and revision-6 staging

- Revision-5 preparation finished at 21:36:53 for the already elapsed 21:35 start. It produced eligible package `sha256:b16e49702b24e776fb84167bb1d78284e9a93837b00534ca4eaeec80136dd98f`, authority snapshot `sha256:5cffffbbefedc4c542322f583f93054ec90766e61d33b1e3915b6be256a2aab7`, eligibility record `sha256:1d694583951e6add25dee56b2d70e6b208dfc867dd8e7c0eeed9c5b05ec8f8b5` and all-zero effect census. No acceptance was created.
- The first revision-5 build correctly failed `P5_ELIG_CREDENTIAL_POLICY_INVALID` because session validation was still hardcoded to r4. After replacing it with exact attempt-derived revision validation, the package became eligible; no guard was bypassed.
- Active revision-6/attempt-4 path scan contains no v5/attempt-3 runner refs. The workload profile has null current package/acceptance refs, false paid/capability authority and a historical revision-5 entry.
- Experiment-foundation script typecheck passes; eligibility/authorization/timeline suites pass 24/24; `git diff --check` passes. No credential, capability or cloud effect occurred.

### 2026-08-11 — Revision-6 system-assigned package and fail-closed execution

- Backend typecheck and experiment-foundation script typecheck passed after adding timeline v2 and v6 preparation. Focused eligibility, authorization and operational-timeline suites passed 27/27, including deterministic v2 eligibility, the 600-second dispatch boundary and the 300-second handoff budget.
- First manifest creation assigned `2026-08-11T13:49:25.532Z` internally. Eligible package: `sha256:d7d6f5ed6684475be0ec94a8dfad87c27b52d433dd0285f2f295f91e5479abdf`; authority snapshot: `sha256:a5a7b731b5be9eadda3c5a9c53dcf514259c4eb75cf42c6a64d53a651e9c0703`; eligibility record: `sha256:84e23c7c4a6f86ceef20c2bf377f76f24d9cfc495721e12918ef704c3a8d3ccd`; session policy: `sha256:6023f3e042cad3f0afc24d5fe2c29d095c3c5352d949be1351bbe10f88ed3461`.
- An idempotent manifest replay reproduced the exact package. Preparation effect census was database writes `0`, cloud calls `0`, `CreateJob` `0`, capability changes `0`, credential reads `0`.
- Exact authorization receipt is 1217 UTF-8 bytes with digest `sha256:7b0a211862c5ee8eae21cccbb3a5982aa000c3f50c086265fc17b777dbd803ed`. `authorization-acceptance-v6.json` binds the package/authority/eligibility/timeline/roles/policy/cost/cleanup boundaries and contains no credential material.
- Chrome OpenAPI form submission never produced a RequestId or STS credential. The page continued to present the prohibition against main-account AssumeRole, so the authorized `user_0002` source identity was not established and execution stopped before qualification.
- At `2026-08-11T13:59:32Z`, after the dispatch cutoff, the qualification offline preflight passed with qualification record absent and credential reads/cloud calls/`CreateJob`/database writes/capability changes all `0`. Live offline preflight passed with Attempts `0`, scientific Results `0`, validations `0`, REUs `0` and undelivered integration outboxes `0`.
- No live or close execute command ran, no capability was enabled, no paid Job was created and no scientific database row was added. Confirmed STS issuance `0`, qualification read calls `0`, `CreateJob=0`, cost CNY `0`; `M0-SCI` remains not passed.
- `git diff --check` and project-governance lint pass; governance reports only the two unchanged unrelated T-124/T-133 state-format warnings. Task-bundle documentation lint passes with 0 errors and 10 existing non-blocking vague-reference warnings.

### 2026-08-11 — Revision-7 exact authorization and zero-effect cutoff

- Pre-execution gates passed: experiment-foundation script typecheck and the focused eligibility/authorization/operational-timeline suites passed 27/27. Prepared attempt-5 package `sha256:723551a6005c88bc405a6bfd4e9490d4cce339283a3967c390c512fba4217cdb` is eligible, with authority snapshot `sha256:6c7064529efe8ec639e17cc2a711d03258a877604d459fba40865d328f706563`, eligibility record `sha256:336d58faabe96df0df09d6eef7e8abe92acb98231efda0cbd2b09169b66ed7cb` and preparation effects all zero.
- Browser readiness: the visible session identified `acs:ram::1183869713036194:user/user_0002`. One read-only pre-package `GetRole` call returned request id `019FF126-8070-53B7-AE84-22A31AC03215`, exact user trust and a 3600-second role maximum; no RAM write occurred.
- Authorization receipt: the exact user message is 1217 UTF-8 bytes with digest `sha256:dc3d7020d7a17c0fb7b01af055b900ba60c78dd4bea57def6b551be42ac57bee`. No credential or secret is recorded.
- Dispatch evidence: the portal's initial action at `2026-08-11T14:19:33.100Z` opened an additional safety dialog but produced no result. At `2026-08-11T14:19:59.239Z`, the local guard rejected final confirmation because cutoff was `2026-08-11T14:19:46.542Z`. The dialog was cancelled; the result panel still reported no call result and credential globals were absent.
- Local absence checks passed: `authorization-acceptance-v7.json` and `credential-qualification-v1.json` are absent; Alibaba credential-variable names and all four capability-variable names are absent from the process and `.env.local`; no qualification/live/close runner remains.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:qualify-credential -- --mode offline-preflight` passed `passed_waiting_for_exact_authorization_and_operational_window`, with qualification record absent and credential/cloud/`CreateJob`/database/capability counts all zero.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight` passed for the exact revision-7 package. Attempts `0`, scientific Results `0`, validations `0`, REUs `0` and undelivered integration outboxes `0`; runner cloud calls, database writes, credential reads and capability changes are zero.
- Final revision-7 accounting: pre-package read-only RAM `GetRole=1`; AssumeRole `0`; qualification reads `0`; `CreateJob=0`; paid cost CNY `0`; scientific database rows `0`. No live or close execute command ran, and `M0-SCI` remains not passed.
- Final local checks: workload/prepared JSON parsing and `git diff --check` pass; no T-136 qualify/live/close process remains; Alibaba credential keys and all four capability keys are absent from the process and `.env.local`; acceptance/qualification files remain absent. Task documentation lint passes with 0 errors and 10 existing non-blocking vague-reference warnings. Project-governance lint passes with only the two unchanged unrelated T-124/T-133 state-format warnings.

### 2026-08-11 — Revision-8 exact authorization and terminal qualification failure

- Implementation gates passed before execution: strict backend typecheck, experiment-foundation script typecheck and focused eligibility/authorization/operational-timeline suites 32/32. `ScientificEvidenceP5OperationalTimeline@v3` reserves 120 seconds between portal-confirmation start and provider dispatch in addition to the 300-second post-issuance handoff budget.
- Prepared attempt-6 package `sha256:e677596a212236c269273ea2d510278fa41a8edddd7a3f312849c0e85027d694` is eligible, with authority snapshot `sha256:39e3867a4edea820f3a8e07a693356da7ab1e3685c5b0489abb016598fbdefa1`, eligibility record `sha256:c7d36e25486f4c7c55f9e928cf2c32f2a3b3c5306e5baf6f9af433982b72a5e2` and session policy `sha256:c0215b6458965be8ef8c5e47421b90f41923e0b507af85717457d20840a0b065`. Preparation effects are all zero.
- Authorization receipt: the exact user message is 1272 UTF-8 bytes with digest `sha256:c74eb5dc8b89c5ba41883b02467f2b2af4a9deb780eec9f74eb988dd889c2f57`. `authorization-acceptance-v8.json` binds the exact package/authority/eligibility/timeline/roles/policy/cost/cleanup boundaries and contains no credential material.
- The one authorized `AssumeRole` succeeded at `2026-08-11T14:42:45.000Z`, request id `019FF146-A180-5EB6-9CCB-0A073A0A80F8`, exact r8 controller-session ARN and expiration `2026-08-11T15:42:45Z`. This is the only STS issuance for revision 8.
- `pnpm --dir apps/backend scientific-evidence:p5:qualify-credential -- --mode execute` ran once with all four product capability keys absent. Its first `GetCallerIdentity` call failed with `InvalidSecurityToken.Malformed`, request id `019FF148-50E1-540E-82DE-1004D513C52B`. It wrote no qualification record. `GetWorkspace=0`, `GetImage=0`, `CreateJob=0`, provider writes `0`, database writes `0` and capability changes `0`; no retry or replacement was attempted.
- Cleanup passed: the bounded-process credential environment and globals were cleared, the portal response was removed, Chrome control was finalized and the persistent Node kernel was reset. Process and `.env.local` contain no Alibaba credential key or product capability key; no qualify/live/close runner remains; no file under `~/.aliyun` or `~/.alibabacloud` changed after the attempt began.
- `pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight` passed without credentials for the exact revision-8 package. Attempts `0`, scientific Results `0`, validations `0`, REUs `0` and undelivered integration outboxes `0`; cloud calls, database writes, credential reads and capability changes are zero. `credential-qualification-v1.json`, live output and close output are absent.
- Final execution accounting: `AssumeRole=1`; attempted qualification reads `1`; paid `CreateJob=0`; cost CNY `0`; scientific database rows `0`. Live and close execute were not invoked, and `M0-SCI` remains not passed. Automatic expiry is recorded for `2026-08-11T15:42:45Z`; the later check must use only this non-secret timestamp and must not recover or reissue a credential.
- Final repository checks at `2026-08-11T14:52:07Z`: strict backend typecheck and experiment-script typecheck pass; the focused revision-8 eligibility/authorization/timeline lane passes 32/32; workload/prepared/acceptance JSON parses; `git diff --check` passes; the task-doc lint has 0 errors and 10 existing vague-reference warnings; project-governance lint passes with only the two unchanged unrelated T-124/T-133 state-format warnings. No credential field is present in the P5 manifests or task docs. The worktree has 27 uncommitted T-136 entries and is verified but not landed; no commit was requested.
- Expiration follow-up is durably scheduled: automation create returned generated id `t-136-r8-sts`, API view succeeded, and `/Users/yurui/.codex/automations/t-136-r8-sts/automation.toml` records `ACTIVE`, the current task id and the one-count 23:43 Asia/Shanghai schedule. Its continuation is restricted to time-only expiry and credential-free local/offline checks, after which it must self-delete.

### 2026-08-11 — Post-R8 local credential-integrity gate

- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck`: passed.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts`: passed with the receipt issuer and qualification/live consumers in the maintained script lane.
- Focused Node 20 lane over credential integrity, eligibility, authorization and operational timeline: passed 38/38 with zero failures/skips/cancellations. The six new cases cover secret-free output, truncation/escape rejection, whitespace/token-alias rejection, cross-process tuple drift, extra-field smuggling and in-memory clearing.
- Synthetic positive CLI: `scientific-evidence:p5:credential-integrity` passed locally and emitted only schema/status, six lengths, one domain-separated hash and zero-effect counts; none of the synthetic credential values appeared in its JSON.
- Synthetic negative CLI: a truncated token failed with `T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID`; reported cloud calls `0`, database writes `0`, capability changes `0` and local credential-config writes `0`.
- Credential-free qualification and live offline preflights both pass against the exact revision-8 package after the integration. Qualification credential/cloud/`CreateJob`/database/capability counts are zero; live retains Attempts/Results/validations/REUs/outbox and all effect counts at zero.
- `git diff --check` passes. Revision-9 prepared/acceptance files remain absent, active runners still read revision 8 for the scheduled expiration audit, and this slice performed no real credential read, cloud API call, database write or capability change.

### 2026-08-11 — Revision-8 final no-credential expiration audit

- Time-only check: at `2026-08-11T15:44:15.852Z`, expiration `2026-08-11T15:42:45Z` was 90 seconds in the past; `expired=true`. The check used no credential value and made no browser/cloud/API call.
- Local absence checks: current process and `.env.local` contain no Alibaba/ALICLOUD/ALIYUN key and none of the four product capability keys; no T-136 qualification/live/close process exists; `credential-qualification-v1.json` and live/close output records remain absent.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight`: passed against package `sha256:e677596a212236c269273ea2d510278fa41a8edddd7a3f312849c0e85027d694`. Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered integration outboxes `0`; cloud calls, database writes, credential reads and capability changes are all `0`.
- Final accounting: `AssumeRole=1`, qualification read attempts `1`, `CreateJob=0`, paid cost CNY `0`, scientific database rows `0`; live and close execute never ran, and `M0-SCI` remains not passed.
- Repository handoff remains uncommitted: governance resume reports 53 repo-wide T-136 worktree changes ahead of HEAD `1a8c94b6`. This audit changed only task documentation; it does not describe the implementation as landed.

### 2026-08-11 — Revision-9 attempt-7 local pre-stage

- Precondition: revision-8 expiration closure is complete; `prepared-authorization-v9.json` and `authorization-acceptance-v9.json` were absent before and after the slice.
- Active-path static scan: preparation, qualification, live and close contain no revision-8/attempt-6 refs. They consistently use v9 refs, attempt 7, r9 session construction, attempt-7 OSS output, live business identity and close idempotency identity.
- Workload projection parse: current revision `9`; current package/prepared/acceptance refs `null`; eligibility false; status `awaiting_revision_9_package_materialization`; `create_job_authorized=false`; `capability_enable_authorized=false`; historical revision 8 remains exact.
- Strict backend typecheck and experiment-foundation script typecheck: passed under Node 20.
- Focused integrity/eligibility/authorization/timeline suite: passed 39/39 with zero failures/skips/cancellations. The new case proves attempt 7 deterministically requires the r9 controller-session convention under the unchanged v3 timeline/eligibility contracts.
- `git diff --check` and manifest-absence assertions pass. No preparation runner, credential, cloud API, database operation or capability change occurred.

### 2026-08-12 — Revision-9 attended attempt final accounting

- Package creation: `scientific-evidence:p5:prepare-package -- --write-manifest` passed with status `eligible`; exact package/authority/eligibility/session-policy hashes are recorded in the task notes. Effect census was credential reads `0`, cloud calls `0`, database writes `0`, capability changes `0`, `CreateJob=0`.
- Acceptance validation: `authorization-acceptance-v9.json` parses as `ScientificEvidenceP5AuthorizationAcceptance@v3` and binds the exact 2,107-byte user text digest `sha256:d4cd734a56115ece17ab15b302365d54f4122cdd87e6c0d74ae3b42af044312e` to the prepared package.
- Pre-browser checks: qualification, live and close offline-preflight commands passed. Qualification output was absent; live reported Attempts/Results/validations/REUs/outbox all zero; close reported scientific Results/passed validations/REUs/runtime artifacts/admissions/closures/packets all zero.
- Portal evidence: the visible account menu reported `RAM 用户`, current identity `user_0002` and master account `1183869713036194`. The result pane remained `暂无调用结果` and no RequestId, AccessKeyId, AccessKeySecret, SecurityToken or Expiration field appeared. After reload, the form displayed a numeric-type error for Duration, an empty Policy control and a trust-policy/caller mismatch before dispatch.
- Credential-free final preflight: `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight` passed for package `sha256:3aa7489828bdf8399b7bcf1fbe837922b4ceb252cc1bc9461aeb5e489f7b6abd`; Attempts, scientific Results, validations, REUs and undelivered outboxes remained zero, as did cloud/database/credential/capability counts.
- Final accounting: accepted `AssumeRole=0`, qualification reads `0`, `CreateJob=0`, paid cost CNY `0`, scientific database rows `0`, capability changes `0`. No credential existed to retain or expire; live/close execute never ran and `M0-SCI` remains not passed.
- After the immutable dispatch cutoff, the in-repo authorization assertion passed for the exact prepared/acceptance pair. A second credential-free live offline preflight preserved every zero count; the workload profile is terminal with both authority booleans false. Project-governance lint passed with only the two unchanged unrelated T-124/T-133 state-format warnings.

### 2026-08-12 — Revision-10 readiness diagnostic

- Authorization: exact 1,270-byte text digest `sha256:296a3ba612b5aa7ec925e6e4c145f2c2d7868c423aa720f7454e164a22b0e3db`, valid through 00:40 Asia/Shanghai, allowed one `Ram.GetRole` and one no-submit form rehearsal only.
- Principal check: Chrome showed `RAM 用户`, `user_0002` and master account `1183869713036194` before the read.
- `Ram.GetRole`: one successful call, request id `019FF1A3-0E60-5EF9-9205-F4F548B9E081`; exact role name, maximum session duration `3600`, exact trusted principal and AssumeRole Allow. `sha256(JSON.stringify(decoded_policy))` equals frozen trust hash `sha256:46c14313b4a48378129637fa28153ff640abc81b7d317d784e8c2c6ef25ad257`.
- No-submit form: Duration exact and no numeric-type error; Policy, role ARN and readiness session exact; ExternalId/SourceIdentity empty; result pane empty; success result false; dialog count zero. The portal trust warning remained visible and is contradicted by the authoritative GetRole result.
- Cleanup: response body and decoded policy were cleared from the persistent browser process after reduction; browser clipboard was emptied and verified empty; Chrome tabs were finalized. No credential field was read or produced.
- Final offline preflight passed for revision 9 with qualification record absent and Attempts/Results/validations/REUs/outbox plus runner cloud/database/credential/capability counts all zero. Diagnostic accounting is `GetRole=1`, `AssumeRole=0`, STS `0`, qualification `0`, `CreateJob=0`, cost CNY `0`, database writes `0`, capability changes `0`.

### 2026-08-12 — Revision-10 attempt-8 pre-stage

- Active-path scan: preparation/qualification/live/close contain no v9 or attempt-7 ref. Exact v10 refs, attempt-8 output scope, r10 session convention, live business key and close idempotency key are present.
- Workload projection: `current_revision=10`; current package/prepared/acceptance refs null; eligibility false; status `awaiting_revision_10_package_materialization`; paid and capability authority false; exact revision-9 history retained.
- Manifest absence: `prepared-authorization-v10.json`, `authorization-acceptance-v10.json` and `credential-qualification-v1.json` do not exist.
- Node 20 strict backend typecheck passed; experiment-foundation script typecheck passed; focused credential-integrity/eligibility/authorization/timeline tests passed 39/39 with zero failures, skips or cancellations.
- `git diff --check` and JSON/static assertions pass. The pre-stage made no cloud call, named-local query/write, credential read, capability change or paid operation.

### 2026-08-12 — Revision-10 attended rejection and zero-effect audit

- Time gate: system time at first validation was `2026-08-12 06:28:34` Asia/Shanghai. The received text allowed portal start through 06:30:45.826 but retained package-inconsistent earlier deadlines of 06:12:45.826 for AssumeRole dispatch and 06:17:45.826 for qualification/live. Both operative deadlines had elapsed, so no exact acceptance or cloud action was possible.
- Local state: `authorization-acceptance-v10.json`, `credential-qualification-v1.json`, live output and close output are absent. Current process contains no Alibaba credential or four product-capability environment variables, and no T-136 qualify/live/close process exists.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:qualify-credential -- --mode offline-preflight`: passed waiting for exact authorization; credential/cloud/`CreateJob`/database/capability counts all `0`.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight`: passed for package `sha256:2a45a05327695fec4a7efc9b771142f27ef9dfdbbac463ec2b69eea758a0ed61`; Attempts, scientific Results, validations, REUs and undelivered integration outboxes all `0`.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:close -- --mode offline-preflight`: passed waiting for real evidence; scientific Results, passed validations, REUs, runtime artifacts/admissions, Closures and Packets all `0`.
- Final accounting: browser actions `0`, RAM/STS calls `0`, AssumeRole `0`, qualification reads `0`, CreateJob `0`, paid cost CNY `0`, scientific database rows `0`, capability changes `0`; `M0-SCI` remains not passed.

### 2026-08-12 — Revision-11 attempt-9 pre-stage

- Active-path scan: preparation/qualification/live/close contain no v10, attempt-8 or r10 reference. Exact v11 refs, attempt-9 OSS/output scope, r11 session convention, live business key and close idempotency key are present.
- Workload projection: `current_revision=11`; current package/prepared/acceptance refs null; eligibility false; status `awaiting_revision_11_package_materialization`; paid and capability authority false; exact revision-10 package/prepared ref and terminal status retained under history.
- Manifest absence: `prepared-authorization-v11.json`, `authorization-acceptance-v11.json` and `credential-qualification-v1.json` do not exist.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend typecheck`: passed.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend typecheck:experiment-foundation-scripts`: passed.
- Node 20 focused credential-integrity/eligibility/authorization/timeline test command: passed 39/39 with zero failures, skips or cancellations; the new case proves attempt 9 deterministically requires the r11 controller session convention.
- `git diff --check` plus JSON/history/static assertions pass. The pre-stage created no timed package, acceptance, qualification record, credential, cloud call, named-local write, capability change or paid operation; `M0-SCI` remains not passed.

### 2026-08-12 — Revision-11 attempt-9 exact execution and terminal qualification failure

- Package/acceptance: eligible package `sha256:d811779dd4e568f3ee68acdab0356d900e9a10c5fdefb6966fbb8d5d0ace47b0`; exact authorization digest `sha256:bfff5860836475bd938cdc7876831a74e31c273020d418b2844bff92a7f6c49a`; qualification/live/close offline preflights passed before issuance with all science/runtime counts zero.
- AssumeRole: exactly one provider call succeeded at `2026-08-11T22:47:27Z`, request id `019FF302-6315-579E-A476-B36CF96577A9`; recorded expiration `2026-08-11T23:47:27Z` proves the exact 3,600-second lifetime. No RAM role, trust or permission policy changed.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:credential-integrity`: passed locally. Receipt schema/encoding and six byte lengths were captured without credential values; cloud calls `0`, database writes `0`, capability changes `0`, local credential-profile writes `0`.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:qualify-credential -- --mode execute`: invoked exactly once. `GetCallerIdentity=1` succeeded and returned an exact `assumed-role/.../t136-p5-scifact-20260811-r11` identity; the subsequent local exact-equality assertion expected `role/.../t136-p5-scifact-20260811-r11` and exited `failed_without_paid_execution`. `GetWorkspace=0`, `GetImage=0`; `credential-qualification-v1.json` remains absent.
- Fail-closed boundary: live execute and close execute were not invoked; the first three EF capabilities and PI closure capability remained disabled. `CreateJob=0`, provider writes `0`, database writes `0`, paid cost CNY `0`.
- Cleanup: credential-bearing in-memory bindings/arrays were cleared, clipboard verified empty, response tab closed and Chrome finalized. Process and `.env.local` contain no Alibaba/four-capability variables; no qualification/live/close process or new Alibaba profile modification remains.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight`: passed after cleanup for the exact r11 package. Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`; credential/cloud/database/capability counts `0`.
- Final pre-expiry accounting: `AssumeRole=1`, qualification reads `1` (`GetCallerIdentity=1`, Workspace/Image `0`), `CreateJob=0`, cost CNY `0`, scientific database rows `0`; M0-SCI remains not passed. Automation `t-136-r11-sts` is scheduled at 07:48:30 Asia/Shanghai for the no-credential post-expiry audit only.
- Manifest JSON parsing and scoped `git diff --check` passed. Strict task-doc lint reported 0 errors and the same 10 pre-existing vague-reference warnings; strict mode therefore exits non-zero without a new r11 warning. Project-governance lint passed with only the unchanged unrelated T-124/T-133 state-format warnings.
- Automation durability check found `~/.codex/automations/t-136-r11-sts/automation.toml` with status `ACTIVE`, current task target and the one-count 07:48:30 schedule. Repository state remains uncommitted: 58 expanded worktree entries ahead of HEAD `1a8c94b6`; the attempt is verified but not described as landed.

### 2026-08-12 — Canonical assumed-role ARN local correction

- `PATH=/opt/homebrew/opt/node@20/bin:$PATH node --test --loader ts-node/esm src/services/scientific-evidence-p5-authorization-service.unit.test.ts` from `apps/backend`: passed 10/10. The lane covers exact assumed-role derivation plus wrong account/role/session/resource-type caller identities without credentials, network or database state.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend typecheck`: passed. Prisma Client regeneration used the unchanged schema.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend typecheck:experiment-foundation-scripts`: passed, proving the real qualification runner consumes the shared helper.
- Focused credential-integrity/eligibility/authorization/operational-timeline Node 20 lane: passed 41/41 with zero failures, skips or cancellations.
- Static dual-path scan finds no remaining `${controller_role_arn}/${role_session_name}` expectation in P5 scripts or services; only the shared `expectedCallerArn` exact comparison remains. Scoped `git diff --check` passes.
- Effect census for the correction and tests: Alibaba/RAM/STS/provider calls `0`, credentials read `0`, database reads/writes `0`, capability changes `0`, `CreateJob=0`, cost CNY `0`. Revision 11 remains terminal and M0-SCI remains not passed.

### 2026-08-12 — Revision-11 final no-credential expiration audit

- Time-only comparison at `2026-08-11T23:48:52.629Z`: expiration `2026-08-11T23:47:27Z`, `expired=true`, expired by 85 seconds. No credential was read, retained, restored or reissued.
- Local absence checks passed: no Alibaba/four-capability environment entry, no T-136 qualification/live/close process, no qualification record and no post-attempt Alibaba profile modification.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight`: passed without credentials. Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`; cloud calls, credential reads, database writes and capability changes `0`.
- Final revision-11 accounting: `AssumeRole=1`, qualification reads `1` (`GetCallerIdentity=1`, Workspace/Image `0`), `CreateJob=0`, paid cost CNY `0`, scientific database rows `0`; live/close execute never ran and `M0-SCI` remains not passed.

### 2026-08-12 — Revision-12 attempt-10 verification and terminal accounting

- Node 20 strict backend typecheck: passed. Experiment-foundation script typecheck: passed. Focused credential-integrity/eligibility/authorization/operational-timeline lane: passed 42/42.
- Recovery verification: manifest/hash/mode checks passed; schema dump has 2,038 TOC entries and the exact authority-data dump has 114 TOC entries. The two failed package invocations occurred before manifest write. The third invocation wrote one eligible v12 package.
- Pre-issuance qualification/live/close offline preflights passed with credential/cloud/database/capability counts zero. Live reported Attempts/Results/validations/REUs/outbox all zero; close reported Results/passed validations/REUs/runtime artifacts/admissions/Closures/Packets all zero.
- Acceptance binding: exact package, authority, eligibility, session-policy, two-operation/CNY50 boundary and 2,627-byte authorization digest parse and reconcile. Four P5 capabilities were absent before issuance.
- AssumeRole: exactly 1, status 200; issue `2026-08-12T00:00:48.000Z`, expiration `2026-08-12T01:00:48Z`, request id `019FF345-8A4A-5220-97C0-321AA2B3EBE4`.
- Credential integrity: invocation 1 failed locally with token-format invalid because the visible portal representation included an ellipsis; invocation 2 passed after full editor selection. Both reported cloud/database/capability/config writes zero. The second invocation was a procedural violation of the exact no-retry rule and invalidates this attempt as a conforming acceptance run.
- Disclosure audit: one redaction diagnostic emitted a portal-rendered, incomplete token fragment to transient tool output. It contained neither the full security token nor the complete credential tuple; no matching credential value is present in repository artifacts. Clipboard/process cleanup passed and automatic expiration remains scheduled for `2026-08-12T01:00:48Z`.
- Qualification execute: invoked exactly once. `GetCallerIdentity=1` passed canonical assumed-role identity; `GetWorkspace=1` returned HTTP 200 but typed `workspaceId` was undefined; `GetImage=0`. Qualification record absent. Failure census reports `CreateJob=0`, provider writes `0`, database writes `0`, capability changes `0`.
- Post-failure cleanup: clipboard empty; persistent credential/response buffers cleared; result page replaced; Chrome finalized; no Alibaba credential or exact four P5 capability variables in process; no qualification/live/close output; no post-issuance Alibaba profile file modification.
- Credential-free live offline preflight passed after cleanup. Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`; runner cloud/database/credential/capability counts zero.
- Pre-expiry accounting: `AssumeRole=1`; qualification reads `2` (`GetCallerIdentity=1`, `GetWorkspace=1`, `GetImage=0`); `CreateJob=0`; paid cost CNY `0`; scientific database rows `0`; live/close execute `0`; `M0-SCI` not passed.
- Final expiration audit: at `2026-08-12T01:01:42.479Z`, expiration `2026-08-12T01:00:48Z` was 54 seconds in the past; `expired=true`. The check used only current time and non-secret expiration metadata.
- Final local absence checks passed: no Alibaba credential/exact four P5 capability variable in current process or `.env.local`; no T-136 qualification/live/close process; no qualification/live/close result manifest.
- Final credential-free live offline preflight passed for the exact revision-12 package. Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`; cloud calls, credential reads, database writes and capability changes `0`.
- Final accounting: `AssumeRole=1`; qualification reads `2` (`GetCallerIdentity=1`, `GetWorkspace=1`, `GetImage=0`); `CreateJob=0`; paid cost CNY `0`; scientific database rows `0`; live/close execute `0`; `M0-SCI` not passed. Remove automation `t-136-revision-12-sts-expiry-audit` after documentation sync.

### 2026-08-12 — Post-revision-12 local hardening verification

- Debug gates: the user approved `APPROVE INSTRUMENTATION`; no new runtime logging was required. After static boundary analysis and locked-SDK synthetic deserialization evidence, the user approved `APPROVE FIX` for the exact local guard/normalizer scope.
- SDK evidence: local `$dara.cast` under `@alicloud/aiworkspace20210204@6.2.0` retained PascalCase string and numeric `WorkspaceId` as string `1450165`, but omitted camelCase input. This refuted the numeric-drop hypothesis and demonstrated a concrete typed-model alias hazard without claiming the historical provider payload shape.
- Request equivalence: local `Params`/`OpenApiRequest` serialization for the new raw call is action `GetWorkspace`, version `2021-02-04`, protocol `HTTPS`, path `/api/v1/workspaces/1450165`, method `GET`, auth `AK`, style `ROA`, JSON request/response bodies and query `Verbose=false`, matching the locked generated SDK operation. No network call was made.
- Focused Node 20 P5 lane: attempt state machine + integrity + authorization/qualification + eligibility + operational timeline + raw workspace client passed 58/58 with zero failures/skips/cancellations. It covers all three adjacent cross-stage races, same-stage concurrency, four-stage success, out-of-order terminalization, upstream failure propagation, orphan lock/claim/completion, lock-release/double-failure accounting, completion ordering/binding, terminal first-writer/binding/redaction and exact one-call raw workspace request/normalization.
- Type safety: backend, experiment-script, shared and desktop strict TypeScript checks passed. Prisma client generation changed no schema or database.
- Full regressions: backend reported 2,644 tests, 2,575 passed, 69 conditional skips and zero failures/cancellations; shared reported 413 passed with zero failures. No live-provider canary was enabled.
- Credential-free qualification offline preflight passed for the exact historical revision-12 package with terminal record absent, qualification absent and credential/cloud/`CreateJob`/database/capability counts zero.
- Credential-free named-local live offline preflight passed with terminal record absent; Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered outboxes `0`, and runner cloud/database/credential/capability counts zero.
- Hygiene: `git diff --check`, scoped credential-pattern scans, task-doc lint and project-governance lint passed. Tests created operational records only under OS temporary directories and removed them through test cleanup; no historical revision-12 claim/completion/terminal/lock, credential, result manifest or external state was created. Generated manifests v1-v11, retired P5 runtime compatibility, tracked desktop `dist/`, build/test caches, bytecode, logs and task scratch were removed. The two named-local recovery dumps under `.ai/.tmp/db-recovery/` remain because the active runbook requires them. `M0-SCI` remains not passed.
- Exact local commands executed from the repository/backend roots:

```text
PATH=/opt/homebrew/opt/node@20/bin:$PATH node --test --test-concurrency=1 --loader ts-node/esm src/services/scientific-evidence-p5-attempt-terminal-service.unit.test.ts src/services/scientific-evidence-p5-credential-integrity-service.unit.test.ts src/services/scientific-evidence-p5-authorization-service.unit.test.ts src/services/scientific-evidence-p5-eligibility-service.unit.test.ts src/services/scientific-evidence-p5-operational-timeline-service.unit.test.ts src/services/scientific-evidence-p5-workspace-qualification-client.unit.test.ts
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend exec tsc -p tsconfig.json --noEmit
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend exec tsc -p tsconfig.experiment-foundation-scripts.json --noEmit
PATH=/opt/homebrew/opt/node@20/bin:$PATH BACKEND_TEST_CONCURRENCY=2 pnpm --filter @paper-engineering-assistant/backend test
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/shared test
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:qualify-credential -- --mode offline-preflight
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:live -- --mode offline-preflight
PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --dir apps/backend scientific-evidence:p5:close -- --mode offline-preflight
git diff --check
```

- Handoff validation: task-bundle document lint passed with 0 errors and 11 historical/non-blocking vague-reference warnings. Project-governance sync completed and lint passed with only the two unchanged unrelated task-state-format warnings. Final manifest/temp scan found no attempt lock/claim/completion/terminal or execution-result artifact; no repository temp/cache artifact remains outside the deliberately retained recovery directory.

### 2026-08-13 — Revision-13 attempt-11 local gate and recovery

- The active prepare/integrity/qualification/live/close harnesses target revision 13, attempt 11, session suffix `r13`, OSS output prefix `attempt-11`, live business key `attempt-11:real-provider` and close idempotency key `attempt-11:scientific-close`. Static scans find no revision-12 active-path residue.
- Focused Node 20 P5 lane passed 58/58 with zero failures/skips/cancellations. Full workspace strict TypeScript checks and the experiment-foundation script typecheck passed; JSON parsing and `git diff --check` passed.
- Fresh recovery verification passed: schema dump byte size/hash and 2,038 TOC entries match; authority-data dump byte size/hash and the exact 114 `TABLE DATA` entries match; the manifest core recomputes to recovery fingerprint `sha256:99e5b491963fd5dfd72f8da7d9662ffa162fd1802b524705f9410bfeae13040e`; all files are mode `0600` outside the repository.
- One initial data-only dump command used an over-escaped table-name pattern and failed read-only with `invalid regular expression` before dumping any table. The resulting zero-byte file was identified exactly, removed, and replaced by the verified 114-table dump. The successful command emitted the expected circular-FK restore warnings already covered by the full pre/post-data schema restore order.
- Revision 13 materialized exactly one eligible package. Its manifest effect census is zero for database writes, cloud calls, `CreateJob`, capability changes and credentials read; `authorization-acceptance-v13.json` remained absent through expiry.
- Final revision-13 accounting is credentials `0`, cloud calls `0`, `CreateJob=0`, database writes `0`, capability changes `0`, paid cost CNY `0` and scientific rows `0`; `M0-SCI` is not passed.

### 2026-08-14 — Revision-14 attempt-12 pre-stage

- Static active-path update targets v14 manifests, attempt 12, session suffix `r14`, OSS output prefix `attempt-12` and isolated live/close idempotency keys. Revision 13 remains an immutable historical package with both current authority booleans false.
- The former repository-external recovery directory was absent at resume. A fresh checkpoint now passes: schema size/hash and 2,038 TOC entries, authority-data size/hash and exactly 114 `TABLE DATA` entries, canonical manifest fingerprint and mode `0600` all verify.
- Focused Node 20 P5 lane passed 58/58 with zero failures/skips/cancellations, including the revision-14/attempt-12/r14 convention and the four-stage permanent claim chain.
- Full workspace shared/backend/desktop strict typecheck passed. The experiment-foundation script typecheck passed after Prisma Client regeneration from the unchanged schema.
- Pre-package effect census remains credentials `0`, cloud calls `0`, `CreateJob=0`, database writes `0`, capability changes `0`, paid cost CNY `0` and scientific rows `0`.

### 2026-08-14 — Revision-14 terminal qualification and local correction

- Exact package acceptance passed for `sha256:6dc9ec5149605034af6b200234141720957fecfed003ead77194ee842ca3823c`. Exactly one controller STS was issued; the secret-free credential-integrity stage claimed and completed once.
- Credential qualification claimed once and returned `ScientificEvidenceP5CredentialQualificationFailure@v1` / `T136_P5_CREDENTIAL_QUALIFICATION_FAILED`. The permanent terminal record exists; qualification completion/record, live/close claims and execution outputs are absent. No retry or replacement credential was issued.
- Credential-free qualification preflight reports `passed_terminal_attempt_no_execute`. Live offline preflight preserves Attempts/Results/validations/REUs/undelivered outboxes at zero. Close offline preflight preserves scientific Results, passed reports, REUs, runtime artifacts/admissions, Closures and Packets at zero. These checks made zero cloud calls, credential reads, database writes and capability changes.
- Cleanup audit found zero temporary Alibaba credential keys and zero P5 capability keys in the current process or supported local env files; no P5 runner process remains. Credential/response objects and clipboard were cleared, and Chrome control finalized away from the result page. Provider automatic expiration remains pending until `2026-08-14T11:35:43Z`.
- Approved regression: qualification now treats optional public-image ownership `workspaceId` as `string | null` instead of requiring equality with DLC Job workspace. Missing and different canonical ownership ids pass; malformed ownership fails. Exact URI, `PUBLIC` accessibility, request id, caller identity, raw `GetWorkspace(1450165)`, credential, package and zero-effect fences remain unchanged.
- Focused Node 20 P5 lane passed 59/59 with zero failures/skips/cancellations. `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts`, root `pnpm typecheck`, JSON parse and `git diff --check` pass. No instrumentation for run `dbg-20260814-104555-a4c2` was added, so cleanup is vacuous; unrelated historical T-132 debug markers are outside this correction.
- Final pre-expiry effect census: `AssumeRole=1`, qualification reads between one and three but not durably disambiguated, `CreateJob=0`, provider writes `0`, database writes `0`, capability changes `0`, paid cost CNY `0`, scientific/runtime/closure rows `0`; `M0-SCI` is not passed.

### 2026-08-14 — Revision-15 attempt-13 pre-stage verification

- Static active-path scan finds no v14/attempt-12/r14 residue in the prepare/integrity/qualification/live/close scripts or active convention test. All successor paths use v15/attempt-13/r15 and isolated output/business/idempotency keys; v14 manifests and stage records remain immutable history.
- Fresh recovery verification passes: schema size/hash and 2,038 non-comment TOC entries match; authority-data size/hash and exactly 114 `TABLE DATA` entries match; canonical manifest fingerprint recomputes; all four current/historical recovery files are mode `0600` outside the repository.
- Two failed recovery setup invocations were zero-database-write diagnostics. The Prisma URL/libpq mismatch created no dump; the PostgreSQL 14/17 mismatch created only one identified zero-byte file, which was deleted before the successful PostgreSQL 17 run. No partially valid recovery artifact is retained.
- Focused Node 20 P5 lane passes 59/59, including the revision-15/attempt-13/r15 convention and optional image-ownership correction. Experiment-foundation script typecheck and full shared/backend/desktop strict typecheck pass.
- `prepared-authorization-v15.json`, `authorization-acceptance-v15.json`, v15 attempt claims/completions/terminal, credential material and execution outputs are absent. Current v15 `CreateJob`/cloud/database/capability/scientific effects remain zero.

### 2026-08-14 — Revision-15 exact execution and terminal accounting

- Exact package acceptance passed for `sha256:f393cab29c50bd950a2dd6171df82778b8004bf529011744a924a52bde0461cf`. One r15 STS was issued inside the package timeline; local credential integrity passed with cloud/database/capability/config-write counts all zero.
- Credential qualification passed exactly once. Its operation ledger contains three successes in order: `Sts.GetCallerIdentity`, `AIWorkspace.GetWorkspace` and `PaiImage.GetImage`. Qualification effect census is `AssumeRole=1`, read-only provider calls `3`, `CreateJob=0`, provider writes `0`, database writes `0` and capability changes `0`.
- Live execute claimed once and exited terminal with `T136_P5_LIVE_FAILED`; no live completion or close claim exists. Credentials, receipt, response and clipboard were cleared, the child exited through capability cleanup, Chrome was finalized away from the result page and the persistent browser kernel was reset.
- `pnpm --filter backend scientific-evidence:p5:live -- --mode offline-preflight` passes with terminal present and Attempts/Results/validations/REUs/outboxes all zero. `pnpm --filter backend scientific-evidence:p5:close -- --mode offline-preflight` passes waiting for real evidence with Results/reports/REUs/runtime artifacts/admissions/Closures/Packets all zero. Both commands report zero cloud calls, credential reads, database writes and capability changes.
- Read-only table digest diagnostic passes across 260 application tables, including 246 protected tables and all 14 mutable P5 tables, in 13,445 ms. This timing accounts for the live process duration before the local materialization boundary and introduces no write.
- A credential-free exact-payload diagnostic reproduces the terminal cause for both ordered cells: `ExperimentFoundationRealProviderPayloadV2Error`, reason `REAL_PROVIDER_PAYLOAD_INVALID`, message `Real-provider output URI must be the exact regional output/ root.` No provider client, credential, capability or repository write is used.
- Control-flow/effect proof: `intake.start()` materializes both cell payloads before `repository.startRealProviderExecution()`. The worker and `CreateJob` transport are reachable only after that repository call returns. Because the post-terminal database has zero Attempts and both materializations fail first, actual `CreateJob=0` and paid cost is CNY 0.
- `M0-SCI` remains not passed. Revision 15 is permanently non-retriable; the issued STS remains provider-live until `2026-08-14T12:50:41Z` despite local cleanup.

### 2026-08-14 — Revision-16 pure-local correction verification

- Eligibility regression passes 18/18. The positive package materializes both payloads; an attempt-scoped regional-internal prefix fails with `P5_ELIG_REAL_PROVIDER_PATH_INVALID` while its correspondingly scoped session policy remains otherwise valid.
- The complete focused P5 lane passes 60/60 with zero failures, skips or cancellations. Historical-package authorization tests use a separately rehashed eligible fixture rather than weakening the corrected production gate.
- `pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts` and root `pnpm typecheck` pass.
- A credential-free, provider-free in-memory diagnostic loads the exact revision-15 execution package, changes only its output root, and materializes both ordered production cells successfully. Materialized cell count is 2 (`retriever-top-k-10`, `retriever-top-k-5`).
- No v16 prepared package, acceptance, qualification, claim, terminal, credential, provider call, database write or capability change exists. Revision-15 historical records remain unchanged apart from versioning its qualification filename.

### 2026-08-14 — Revision-16 attempt-14 preparation and attended execution

- Revision-15 expiration audit passed at `2026-08-14T12:55:17.835Z`: its STS expiration was 276 seconds in the past; process/env/profile checks found no credential or capability residue and no runner remained.
- Fresh recovery verification passed. The schema dump is 1,101,926 bytes with 2,038 selected TOC entries and digest `sha256:67d46501dff279c17856652363b3d86be0aa995d485f11ee3f3038f316018abf`; the exact 114-table data dump is 1,467,702 bytes with digest `sha256:96299db48a785ca64a3a887910a10cf5be260c3b2a6ed369070d202c4606b16b`; canonical recovery fingerprint is `sha256:1273c7c74440bb73888a78cdadb5835a54eb9ffb22c9f42fed6f52535c0bb70e`; all current and historical artifacts are mode `0600` outside the repository.
- One initial schema-filtered schema-only recovery attempt produced 2,036 selected entries and failed the maintained recovery validator because it omitted global `EXTENSION vector` authority. Its temporary dump/manifest were deleted, the prior manifest was not changed, and the successful full schema-only dump restored the historical 2,038-entry contract without a database write.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --silent --dir apps/backend scientific-evidence:p5:prepare-package -- --write-manifest` passed eligible with zero reason/effect codes and wrote `prepared-authorization-v16.json`. An immediate dry run reproduced package `sha256:ad9c1080c468641e680a3c998dcd65f49538715082db59ae7b9ba82a138cbb9b` plus the same authority, eligibility and session-policy hashes.
- Before issuance, qualification/live/close offline preflights all passed their expected waiting state with zero credentials, cloud calls, `CreateJob`, database writes and capability changes. Existing attempt/result/validation/REU/runtime/closure/packet counts for the exact Run/Cycle were zero.
- Exactly one local credential-integrity invocation passed and emitted only secret-free byte lengths plus tuple hash `sha256:f3b5d2b40b1c1e3f23fc591b386bee2d1694a30a23116cca3500dec3e739decf`. Exactly one qualification invocation then passed all three ordered read-only calls and persisted qualification record `sha256:eaf55ab70755a68ec229217de0e24630bba59668e994b74ca457f92f2898d933`; qualification reported `CreateJob=0`, provider writes `0`, database writes `0` and capability changes `0`.
- Live claimed once at `2026-08-14T13:10:06.123Z`. Read-only named-local observation at `2026-08-14T13:16:25.512Z` found exactly two exact-Run Attempts, each `real_provider_succeeded`; each submit command had `attemptCount=1`, and both reconcile/collect paths succeeded without error codes. A subsequent read found one immutable `diagnostic_only` provisional output per collected cell and no `scientific_source`, Product Result, validation or REU. Final live/terminal accounting is recorded after the existing runner exits; no retry or replacement is permitted.
- Live exited without retry and published one terminal record: failed stage `live`, reason `T136_P5_LIVE_FAILED`, terminal time `2026-08-14T13:53:28.119Z`, `local_attempt_terminal_write_count=1`. The process exited, its attempt lock disappeared and no live completion or close claim exists.
- Final exact-Run census at `2026-08-14T13:56:15.334Z` confirms two succeeded Attempts, five state events per Attempt, three succeeded commands per Attempt, submit `attemptCount=1` per cell, reconcile `attemptCount=9` per cell, collect `attemptCount=1` per cell, one diagnostic envelope per collection and zero command errors. Scientific Results, validation reports and RunEvidenceUnits are all zero.
- Static authority check proves the observed scientific-source rejection: the immutable code artifact emits observation key `micro_recall_ppm`; `prepared-authorization-v16.json` freezes protocol slot/comparison key `scifact_micro_recall_ppm`; the sealer performs exact keyed lookup and returns `observation_slot_mismatch` when the registered slot is absent. The durable terminal remains intentionally generic and does not persist this internal reason.
- The first post-terminal qualification offline preflight failed locally and with zero effects because the successful generic qualification record had not yet been versioned. After moving the exact non-secret record to `credential-qualification-v16.json`, qualification preflight passed `passed_terminal_attempt_no_execute`; this was no credential/cloud qualification retry.
- At `2026-08-14T14:07:24Z`, recorded expiration was 52 seconds in the past. Qualification, live and close offline preflights all exited 0; live reports Attempts `2`, scientific Results/validations/REUs/outboxes `0`, and close reports Results/reports/REUs/runtime/admissions/Closures/Packets `0`. Combined effects are credential reads `0`, external/cloud calls `0`, database writes `0` and capability changes `0`.
- Final residue audit passed: original live PID absent, execution lock absent, generic qualification slot absent, versioned r16 qualification present, captured temp logs absent, current env and supported local env files contain no Alibaba credential or P5 capability keys, and no Alibaba profile file changed after issuance.

### 2026-08-14 — Local scientific-source correction

- Python contract check passed for `retriever-top-k-5`: the shared preflight builder emitted observation key `scifact_micro_recall_ppm` and metric key `micro_recall_ppm`.
- Strict TypeScript checks passed:

```text
pnpm --filter @paper-engineering-assistant/backend exec tsc -p tsconfig.json --noEmit
pnpm --filter @paper-engineering-assistant/backend exec tsc -p tsconfig.experiment-foundation-scripts.json --noEmit
```

- Maintained Node 20 focused lane passed 31/31 with zero failures/skips/cancellations:

```text
PATH=/opt/homebrew/opt/node@20/bin:$PATH node --test --test-concurrency=1 --loader ts-node/esm src/services/experiment-foundation-scientific-source-v1-service.unit.test.ts src/services/scientific-evidence-p5-eligibility-service.unit.test.ts src/services/scientific-evidence-p5-live-source-gate-service.unit.test.ts src/services/scientific-evidence-p5-workload-preflight-service.unit.test.ts
```

- Coverage includes exact two-cell workload sealing, entrypoint byte mismatch, the historical `micro_recall_ppm` observation mismatch, normal live completion, pending progress, missing source fail-fast and duplicate-source rejection.
- One initial Node 26 `ts-node` invocation failed during loader startup with no TypeScript diagnostic while both strict `tsc` projects passed. Transpile-only runtime confirmed 24/24 before the maintained Node 20 direct lane provided the authoritative 31/31 pass. A subsequent negative test first expected the broader slots code; production returned the more precise `observation_slot_mismatch`, the assertion was corrected and the final lane passed.
- `git diff --check` passed. Exact debug run-id scan found no marker for `dbg-20260814-141818-612c`; older T-132 debug markers are unrelated and unchanged.
- Candidate identity: 11,063 bytes, `sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265`. This identity is local-only and not a remote/readback or executable authority fact.
- Effect census for this correction: credentials `0`, cloud/provider calls `0`, `CreateJob=0`, database writes `0`, capability changes `0`, paid cost CNY `0`.
- Task-bundle document lint passed 12 files with zero errors and 12 historical vague-reference warnings. Project-governance sync completed, and governance lint passed with the same two unrelated pre-existing task-state-format warnings.

### 2026-08-14 — Revision-17 successor staging and paid gate

- OSS create-only verification: the target digest directory was absent before upload; upload task reported one success. Object details reported `input/t136-p5/workload/7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265/entrypoint.py`, ETag `464765EE89BDCF3F5AA824BC8E565F59` and `11,063 Byte`. Downloaded readback and repository source both hashed to `sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265`; `cmp` returned 0. The temporary download was removed.
- Recovery verification: PostgreSQL 17.7 schema dump passed `pg_restore --list` with 2,038 selected entries and two vector extension entries. Authority dump contains exactly 114 `TABLE DATA` entries. Both dump byte hashes, manifest canonical fingerprint and mode `0600` passed before current-manifest rotation.
- `PATH=/opt/homebrew/opt/node@20/bin:$PATH pnpm --filter @paper-engineering-assistant/backend typecheck:experiment-foundation-scripts`: passed before and after authority apply.
- Bounded successor apply exited 0 after asserting exactly 101 new rows, zero protected/historical drift, zero external fetch and zero prohibited scientific/runtime rows. Direct exact replay returned `initial_scope_state=complete`, every row delta 0, `protected_table_count=226`, `historical_authority_unchanged=true` and all prohibited effects 0.
- Backend strict TypeScript check passed. Maintained Node 20 scientific-source/P5 lane passed 31/31, including revision-17/attempt-15/r17 convention, exact two-cell workload sealing, historical key rejection and live missing/duplicate-source behavior.
- First `--write-manifest` produced eligible package `sha256:d790b7856a27fa32e1ab57ab02eef92034699cd494b11a86b203ef9dc166ba6a` with no reason codes and zero effects. Immediate dry replay reproduced the same package, authority, eligibility and session-policy hashes.
- Qualification offline preflight returned `passed_waiting_for_exact_authorization_and_operational_window`; live returned zero Attempts/Results/validations/REUs/outboxes; close returned zero Results/reports/REUs/runtime artifacts/admissions/Closures/Packets. Combined credential reads, cloud/external calls, database writes and capability changes were zero.
- Gate artifact scan passed: `authorization-acceptance-v17.json`, `credential-qualification-v1.json` and every attempt-15 claim/completion/terminal record are absent. No STS, capability enable or paid `CreateJob` occurred.
