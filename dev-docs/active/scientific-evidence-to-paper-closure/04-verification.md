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
