# T-136 Scientific Evidence to Paper Closure — Roadmap

## Goal

- Close the real scientific path from an exact PaperImplementation WorkOrder through ExperimentFoundation execution and validation back into an authoritative ValidationCycle disposition, ResultInterpretationPacket, Claim and Dossier.

## Planning-mode context and merge policy

- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed; the runtime signal is explicit and the user explicitly requested a new task bundle
- Host plan artifact path(s): (none)
- Requirements baseline: the user-confirmed five enhancement priorities in the current discussion
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement document > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/scientific-evidence-to-paper-closure/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage

| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instructions | Current discussion | Goal and five enhancement priorities | highest | The task is specifically the EF-to-PI scientific closure, not literature asset discovery. |
| T-132 completion boundary | `dev-docs/archive/experiment-foundation-productization-closure/00-overview.md` | Real two-cell PAI baseline and diagnostic-only boundary | high | Reuse the successful provider-control path; do not relabel historical diagnostic output. |
| Pack C PI closure evidence | `dev-docs/archive/experiment-foundation-productization-closure/artifacts/implementation/07-pack-c-pi-technical-closure.md` | Existing trust gateway, readiness and control-only closure baseline | high | Scientific-kind closure and Packet materialization are explicitly outside the completed slice. |
| T-124/T-133 PI boundaries | `dev-docs/active/paper-implementation-productization-hardening/`, `dev-docs/active/paper-implementation-debate-disposition-closure/` | PI authority, proposal and disposition constraints | high | Preserve server authority and do not reopen completed debate work. |
| Existing implementation | `apps/backend/src/services/`, `packages/shared/src/research-lifecycle/` | Verified landing points and existing contracts | high | Exact route names and schema delta remain Phase 0 decisions. |
| Model inference | N/A | Phase decomposition and risk framing only | lowest | No inferred behavior overrides repository contracts. |

## Non-goals

- Do not add literature-to-asset automatic discovery or change Literature ownership.
- Do not change topic-selection prompts, debate execution or calibration gates.
- Do not reopen T-132 historical `diagnostic_only` outputs or trust-upgrade them into scientific evidence.
- Do not allow simulation, fake-provider or caller-authored numbers to become scientific evidence.
- Do not support manual numbers or external experiment-result import from CSV, notebooks, external-cluster logs or third-party run bundles. External compute is legal only when EF creates, tracks and collects the exact real-provider Attempt.
- Published baseline numbers remain literature evidence/context only; they cannot become project-scoped `ExperimentResultCellV2`, REU or scientific closure input.
- Do not add a second evidence gateway, second closure authority or cross-domain foreign-key ownership.
- Do not add desktop UI, multi-user delivery, generalized BYOC/provider packaging or automatic paper prose generation.
- Do not decide or change desktop navigation placement; UI hierarchy is deferred and cannot define domain ownership.
- Do not enable paid cloud execution, named-local scientific writes or capability flags without a separately reviewed and explicitly authorized window.

## Open questions and assumptions

### Resolved Phase 0 questions

- Q1 / ART-B: confirmed on 2026-08-05. V1 artifact refs are exact controlled-run declarations sealed by the source hash, not independently byte-verified evidence; P5 conclusions cannot depend on unfetched bytes.
- Q2 / CMP-B1: confirmed on 2026-08-05. V1 comparison is a preregistered two-cell same-unit directional absolute difference with non-overlapping thresholds, optional conservative CI guard, one relation/reason and no EF-authored PI conclusion.
- Q3 / DISP-S: confirmed on 2026-08-05. One protocol-designated primary relation maps deterministically to disposition and frozen exit; invoking Closure is authorization only, with no accept/correct/downgrade or caller-authored scientific field.
- Q4 / PKT-S: confirmed on 2026-08-05. Packet stores only v2 schema, exact Closure id/hash and Packet content hash; proposal/disposition/exit remain Closure-owned and are projected through the downstream read view.
- Q5 / P5-ELIG-S: confirmed on 2026-08-05. Deterministic preflight admits one exact new two-cell package with one differing factor and two EF-owned Jobs; the user authorizes only its hash-bound operational window, while all scientific outcomes remain valid acceptance results.

### Late-bound decisions under frozen constraints

- Q6: `recordExperimentResult` and `validateScientificBatch` are frozen as two distinct EF domain actions. P1 may choose a single orchestration wrapper or separate transport commands without changing their authorities, idempotency or complete-batch boundary.
- The exact model, dataset, provider assets, parameters, region and budget remain late-bound to the separately authorized P5 package; the exact EvaluationProtocol and package hash are frozen before provider submission.

### Assumptions

- A1: Existing v2 scientific result, validation, EvidenceCandidate, REU and D-18 contracts remain the canonical model; additive contract changes are preferred over replacements. Risk: medium.
- A2 (superseded by C10 and refined by C15): The initial no-migration assumption was a safety default, not a target. Confirmed DB-B freezes the additive EF source-binding fields, checks, exact relations, historical no-backfill policy and recovery posture; the repo migration was implemented and disposable-verified through the DB-SSOT workflow on 2026-08-08. Named-local application remains separately approved. Risk: low.
- A3: The existing `EvidenceCandidateQualified` relay and PI Evidence Trust Gateway remain the only EF-to-PI scientific bridge. Risk: low.
- A4: A real cloud acceptance run is a distinct, explicitly authorized execution window and is not implied by approving implementation. Risk: low.
- A5: External experiment-result import is prohibited by current top-level product policy, not a deferred T-136 follow-up. Reconsideration requires a new explicit project-level decision. Risk: low.
- A6: P0 freezes scientific invariants rather than one provider/workload implementation. Late-bound parameters cannot weaken provenance, preregistration, authority, idempotency or release gates. Risk: low.
- A7 (confirmed by C18): Result observations are stored summaries, not raw sample storage. Envelope-declared artifact refs are controlled-run declarations sealed by the source hash and are not independently byte verified. Risk: low.
- A8 (confirmed by C16): The current transport already has the canonical envelope in memory and can return the envelope through the refined backend-internal collect-only handoff without a second successful-path provider fetch. Risk: low.

## Merge decisions and conflict log

| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | EF primary consumer | Earlier discussion could overemphasize Literature→EF; user states EF primarily serves paper implementation | Make PI→EF→PI the task spine; Literature is out of scope | Latest user-confirmed instruction | None |
| C2 | Historical real output | T-132 proves real PAI success but intentionally records `diagnostic_only` | Preserve history and run a new scientific workload; never trust-upgrade old outputs | Existing completion contract and scientific provenance rules | Phase 5 authorization |
| C3 | Bridge design | A new integration API could duplicate the event path | Reuse `EvidenceCandidateQualified` → Trust Gateway → `RunEvidenceUnitRegistered` | Existing repository authority boundary | Verify in Phase 0 |
| C4 | Conclusion authority | Model/runtime proposals could be treated as final conclusions | PI service derives and freezes disposition/exit; model output remains a proposal | Existing D-18 and caller-authority constraints | Specify mapping in Phase 3 |
| C5 | Top-level domain model | EF could be modeled as a PI/Literature submodule or split into experiment-design/training/analysis domains | Keep PI and EF as peer bounded contexts; map historical capabilities inside the two owners | User-confirmed option B on 2026-08-05 | UI placement deferred |
| C6 | Product release role | T-136 could block all of M0, become an ordinary post-M0 enhancement, or gate only the scientific core | Option C: T-136 gates `M0-SCI`; other M0 modules may preview, P0-P4 remain unreleased, and only P5 passes the gate | User-confirmed option C on 2026-08-05 | UI remains separate |
| C7 | P0 freeze granularity | Boundary-only freeze risks later contract drift; full freeze prematurely binds a provider and workload | Option B: freeze scientific invariants and preregistration contracts; late-bind replaceable experiment/provider parameters | User-confirmed option B on 2026-08-05 | Execute P0 census |
| C8 | Canonical result semantics | Keep caller-supplied scalars, store only raw artifacts, or generate an evidence-grade factual envelope | Option B: EF server-generates source-bound typed summaries; cross-cell comparison facts remain separate and PI owns final disposition | User-confirmed option B on 2026-08-05 | Freeze exact source/field contract in P0 |
| C9 | Source sealing and assignment timing | Parse inside the provider transport, refetch after collection, or parse once at the collection boundary before Result generation | Use a provider-independent parser while canonical bytes are already in memory; collection atomically seals an optional `scientific_source`, then a separate identity-only command generates Result after commit | User-confirmed assignment sequence on 2026-08-05 | Freeze exact manifest/FK/statistic union in P0 |
| C10 | Scientific-source persistence | Keep only JSON/hash references, add a dedicated source/derivation subsystem, or reuse the collection output authority with a direct Result relation | Confirm option B/B-lite: add `scientific_source` to `ProvisionalOutputV2`, preserve `diagnostic_only`, enforce one canonical source per collection and bind Result directly through an additive relation | User confirmed option B on 2026-08-05 | Repo migration implemented and disposable-verified; implement P1 writers/readers |
| C11 | Relational spine versus manifest | Put all provenance in JSON, normalize every scientific field, or keep only identity/integrity fields relational | Confirm hybrid B2: Result stores collection/source id/hash/kind/class, parser profile version/hash and derivation hash; scientific summaries/schema/provider manifest/artifact refs remain in the canonical source manifest | User confirmed on 2026-08-05 | Freeze statistic/uncertainty union next |
| C12 | Statistic and uncertainty representation | Use flat optional fields, a generic plugin bag, or a strict closed-core discriminated union | Confirm strict option B: typed statistic/uncertainty variants, mandatory positive sample size, protocol-controlled uncertainty and no free-form/provider-specific fields | User confirmed on 2026-08-05 | Freeze observation identity/order/hash next |
| C13 | Observation identity, order and hashes | Use random/parser-order identity, content-address observations, or derive identity from preregistered semantic slots | Confirm O-B: protocol freezes observation keys/ordinals; EF derives ids from RunCell/protocol/slot; content changes conflict under the same identity; provider/source/derivation/Result hashes remain layered | User confirmed on 2026-08-05 | Freeze final source manifest/hash projection next |
| C14 | Canonical scientific-source manifest M-B2 | Leave lineage implicit, normalize all source details relationally, or seal one self-contained source manifest | Confirm M-B2: fixed `scientific_result_manifest`/`scientific_source` binds Collection/Attempt, ExecutionBundle/Run/Cell/TaskSpec, exact EvaluationProtocol revision, parser/result schema, provider manifest and ordered observations/artifacts; operational metadata and source self-identity stay outside the hash | User confirmed M-B2 on 2026-08-05 | Review physical Prisma/FK/index/backfill contract |
| C15 | Physical PostgreSQL source binding DB-B | Clean-slate non-null migration, version-gated additive migration, or normalized source/observation/artifact tables | Confirm DB-B: local PostgreSQL, eight nullable compatibility columns with a closed v1-null/v2-complete CHECK, exact Collection/Attempt and source composite FKs, conditional Output kind/class/version CHECK, no historical backfill and no new child tables | User approved the recommended DB-B direction on 2026-08-05 | Repo migration passed disposable deploy/drift/assertions; named-local deploy requires separate approval |
| C16 | Internal transport→worker handoff T-B | Put raw envelope on the shared outcome, pass a parser callback into transport, or specialize only `collect()` | Confirm refined T-B: backend-internal strict collect success; one manifest hash in the ordinary outcome; readonly canonical JSON/content hash/byte size in the ephemeral handoff; worker narrows collect before dispatch; no DTO/event/persistence/shared-outcome expansion | User instructed the final design-review adjustment on 2026-08-05 | Implement and test in P1 |
| C17 | Field authority and preparation recovery | Keep coarse worker/parser/sealer ownership, allow implicit output ordinals/lease recovery, or freeze per-field origins and closed outcomes | Protocol owns workload semantics; schema registry owns structure; parser extracts; pure sealer assigns source facts; collection uses fixed ordinals `1/2` and atomic persistence; Result projection preserves values; expected preparation is `sealed/not_scientific` and only typed transient failures retry | User instructed the final design-review adjustment on 2026-08-05 | Freeze exact durable reason-code names during P1 contract work |
| C18 | Artifact evidence strength ART-B | Treat provider-declared refs as byte verified, fetch every artifact in P1, or preserve a bounded declaration claim | V1 refs prove exact controlled-run declaration plus source-hash sealing only; protocol may require ref metadata, but validation/P5 conclusions cannot depend on unfetched bytes; byte verification requires a later versioned capability | User confirmed ART-B on 2026-08-05 | Apply the fixed semantics in P1 tests and P5 eligibility |
| C19 | Comparison fact contract CMP-B1 | Emit raw observations only, allow a generic comparison DSL, write EF dispositions, or freeze one auditable v1 rule | V1 uses preregistered two-cell same-unit directional absolute difference, non-overlapping thresholds and optional conservative CI guard; one relation/reason is persisted; missing required CI fails validation; broader effect/equivalence/composition rules require a later version | User confirmed the recommended CMP-B1 on 2026-08-05 | Apply exact rule/fact types and fixtures in P2 |
| C20 | Deterministic disposition rule DISP-S | Allow caller correction, add accept/downgrade review semantics, or make Closure a pure authorization of preregistered facts | Protocol freezes one primary comparison and three exits; ResultAnalysis supplies context/limitations/claim ceiling only; command invocation authorizes server mapping relation→disposition→exit; disagreement leaves the Cycle open; no review store/fields | User agreed that human semantic selection was unnecessary on 2026-08-05 | Remove corrected-disposition input and implement exact P3 mapping/tests |
| C21 | Reference-centered Packet PKT-S | Copy Closure conclusion/proposal fields, store only Closure id, or bind an exact Closure snapshot without duplicating authority | Existing Packet adds only schema version, Closure id/hash and Packet hash; exact same-domain tuple FK and unique Closure ownership enforce one Packet; read view joins Closure/proposal; event metadata stays operational | User approved the final PKT-S recommendation on 2026-08-05 | Four-field repo migration implemented; add P4 materializer/read-view tests |
| C22 | P5 eligibility and authorization P5-ELIG-S | Use a loose human approval, require a preferred scientific result, or add a generic approval/policy subsystem | Deterministic preflight validates one exact two-cell package; user authorizes its hash, two operations, cost/capability/window and credential/recovery bounds only; every disposition can pass; failure/drift requires a new Run/package/authorization | User confirmed the final recommendation on 2026-08-05 | Implement the versioned validator/package and acceptance record without a new approval table/UI |

## Scope and impact

- Affected areas/modules: ExperimentFoundation provider collection/scientific validation; experiment-v2 relay; PaperImplementation evidence, ResultAnalysis, ValidationCycle closure, result/claim/dossier; shared contracts; verification runners and context docs.
- Domain model: PaperImplementation and ExperimentFoundation are peer bounded contexts. PaperProject supplies lifecycle scope but is not an execution broker; Literature is at most a candidate/source context.
- External interfaces/APIs: identity-only EF product result command, distinct internal result-recording and complete-batch-validation domain actions, plus an optional orchestration wrapper; transport route count and public naming are late-bound.
- Data/storage impact: reuse existing v2 scientific/evidence/closure/Packet stores. EF DB-B adds `scientific_source` plus direct Result source binding. PI PKT-S adds four nullable compatibility fields, an exact Closure tuple relation and unique Closure ownership to the existing Packet table. No proposal, review, Closure or second Packet table is needed. All schema work must be reviewed and reversible.
- Backward compatibility: historical simulation and `diagnostic_only` output remain non-evidence; control-only no-evidence closure remains valid; legacy scientific writers remain permanently closed.

## M0-SCI release gate semantics

`M0-SCI` is a product capability gate inside M0, not a new project-governance milestone and not an alias for `M-001`. The gate protects only the claim that the product can execute and close a real scientific evidence chain; the gate does not block independent development or preview of the other M0 modules.

| Checkpoint | T-136 state | M0-SCI state | Product consequence |
|---|---|---|---|
| Before P0-P4 complete | `planned` or `in-progress` | not passed | Scientific intake/closure remains unavailable outside bounded verification. |
| P0-P4 complete | `in-progress`; checkpoint `implementation_complete_unreleased` | not passed | Implementation may be reviewed, but no real scientific-closure capability may be enabled or claimed. |
| P5 real acceptance complete | eligible for `done` | passed | Controlled product enablement may be considered separately; the gate does not auto-enable flags. |
| Desktop UI complete/incomplete | independent | unchanged | UI hierarchy and navigation remain deferred and do not redefine the capability gate. |

## Phase 0 invariant-freeze boundary

| Freeze in P0 | Bind later | Binding rule |
|---|---|---|
| Sole writers, events, state transitions and capability guards | Controller/route/UI presentation | Presentation cannot create a second authority path. |
| Server-generated typed result semantics, source/derivation provenance, canonical identity/hash and complete-batch boundary | Provider raw-file layout and parser implementation | Product input is identity-only; every adapter must produce the same canonical summary contract without a provider payload escape hatch. |
| Collection-to-Result timing: transport fetch/base validation → provider-independent parse → short source-sealing transaction → post-commit identity-only Result generation | Concrete parser implementation and orchestration presentation | No external fetch or provider-specific scientific interpretation occurs inside the transaction; no Result exists without a committed sealed source. |
| Protocol preregistration rule and immutable revision binding | Concrete metrics, thresholds, directions and exit values per workload | Exact values must be frozen and hashed before the corresponding Run is submitted. |
| DISP-S disposition/selected-exit input contract and server authority | Domain-specific proposal interpretation/limitations/claim ceiling | Caller supplies no scientific choice; correction requires a new proposal or evidence/protocol revision and Run. |
| PKT-S Packet identity, exact Closure ref, event trigger and replay behavior | Internal file/module placement | Refactoring cannot copy Closure authority into Packet or weaken idempotency. |
| Confirmed additive DB-B source binding; no JSON-only provenance fallback | DB-SSOT implementation mechanics and separately authorized named-local application | Preserve the frozen eight fields, checks, exact composite FKs/index names and no-backfill/backout contract. |
| Minimal relational spine fields and same-collection/Attempt integrity | Repository/service implementation details | Do not weaken the confirmed composite identity or normalize manifest-only scientific payloads without a new decision. |
| Field-level semantic authority and refined T-B handoff | Concrete TypeScript module/file placement | Shared outcomes cannot gain raw-envelope fields; projection cannot become semantic authorship; sealer cannot persist. |
| ART-B evidence-strength vocabulary | Future independently byte-verified artifact capability | V1 cannot claim byte verification or make its P5 conclusion depend on bytes EF did not fetch. |
| CMP-B1 factual comparison contract | Future relative/ratio/equivalence/multi-cell rule versions | EF emits one exact relation/reason from the frozen directional rule and never a PI disposition; broader comparison semantics cannot enter through optional bags. |
| DISP-S/PKT-S authority chain | Concrete service/repository module placement | Closure authorization, server conclusion authority and reference-centered Packet projection remain separate; no caller scientific choice or second closure authority is allowed. |
| Protocol-slot observation identity/order and layered canonical hashes | Concrete canonicalizer module/file placement | Parser order, random ids and content-addressed observation identity cannot replace the frozen semantics. |
| P5-ELIG-S workload shape, deterministic preflight, exact-package authorization and outcome-agnostic acceptance | Exact model, dataset, provider assets, parameters, region and budget | Exact package values are hashed, preflighted and separately authorized before cloud work; any change requires a new authorization. |

## Consistency baseline for dual artifacts

- [x] Goal is aligned across roadmap and detailed task bundle.
- [x] Boundaries/non-goals are aligned.
- [x] Constraints are aligned.
- [x] Milestone ordering is aligned.
- [x] Acceptance criteria are aligned.
- Intentional divergences:
  - `roadmap.md` stays macro-level; exact commands, interfaces and decisions live in the detailed bundle.

## Project structure change preview

The project-structure preview is non-binding. Phase 0 must confirm the exact file-level delta.

### Existing areas likely to change

- Modify:
  - `apps/backend/src/services/`
  - `apps/backend/src/controllers/`
  - `apps/backend/src/routes/`
  - `apps/backend/src/repositories/`
  - `packages/shared/src/research-lifecycle/`
  - `docs/context/`
  - `.ai/scripts/` for bounded acceptance/gate orchestration
  - `prisma/` only if Phase 0 proves an additive schema delta is required
- Delete:
  - (none expected)
- Move/Rename:
  - (none expected)

### New additions

- New module(s):
  - No new top-level domain; additions stay inside ExperimentFoundation and PaperImplementation.
- New interface(s)/API(s):
  - EF scientific-result intake/validation orchestration entry, exact shape TBD in Phase 0.
  - PI post-closure packet materialization consumer, exact shape TBD in Phase 0.
- New file(s):
  - Targeted services, tests and one bounded end-to-end acceptance runner as Phase 0 confirms.

## Phases

1. **Phase 0 — Authority census and contract freeze**
   - Deliverable: exact writer/reader/event/capability matrix, invariant-freeze/late-binding ledger, preregistration contract, schema decision and real-workload eligibility profile.
   - Acceptance criteria: every planned write has one domain owner; no legacy/caller-authority path is reopened; concrete provider/workload choices cannot weaken the frozen scientific contract.
2. **Phase 1 — Real scientific result envelope**
   - Deliverable: collection-time provider-independent parsing seals one canonical scientific source manifest, after which an identity-only command rereads that committed source chain and server-generates typed per-cell summaries bound to Run, manifest, cell, TaskSpec, Attempt, source artifacts, parser profile and derivation identity.
   - Acceptance criteria: caller-authored observations, diagnostic/simulation/fake provenance and external/manual result import are rejected; no Result exists without a committed sealed source; idempotent replay cannot change a source or result hash.
3. **Phase 2 — Product scientific validation and EF→PI evidence relay**
   - Deliverable: a default-off product entry records a complete result batch, separates evidence eligibility from deterministic comparison facts and emits one qualified candidate that the existing Trust Gateway converts to a trusted PI REU.
   - Acceptance criteria: incomplete, unsupported, drifted or non-head batches fail closed with zero partial evidence; valid supporting, contradicting and indeterminate outcomes remain evidence-eligible.
4. **Phase 3 — PI scientific ValidationCycle closure**
   - Deliverable: `scientific_evidence_assessed` closure accepts an exact contextual ResultAnalysis proposal reference and deterministically derives disposition plus exit from the protocol-designated primary comparison under the D-18 CAS watermark.
   - Acceptance criteria: callers cannot author assessment/exit/hash; active attempts, branch-head drift, stale proposals and repeat conflicts fail closed.
5. **Phase 4 — Post-closure interpretation and paper artifacts**
   - Deliverable: `ValidationCycleClosed` materializes exactly one ResultInterpretationPacket that Claim/Dossier paths can consume.
   - Acceptance criteria: pre-closure/direct Packet writes remain closed; replay is byte-identical and produces no duplicate Packet or claims.
6. **Phase 5 — Real two-cell end-to-end acceptance**
   - Deliverable: one P5-ELIG-S-preflighted, exact-hash-authorized bounded PAI run traverses WorkOrder → real results → validation → EvidenceCandidate → REU → ResultAnalysis → scientific closure → Packet → Claim/Dossier.
   - Acceptance criteria: exactly two authorized Jobs, no injected scientific numbers, no hidden replacement, no duplicate rows/events, credentials removed, cost bounded and all exact lineage/provenance assertions pass regardless of final disposition; the acceptance record explicitly marks `M0-SCI: passed`.

## Step-by-step plan

### Phase 0 — Authority census and contract freeze

- Objective: turn the five priorities into one exact writer graph before changing code.
- Deliverables:
  - Current/target sequence diagram and sole-writer table.
  - Decision records for result semantic envelope, preregistration, proposal-to-disposition mapping, Packet materialization and exact additive EF source-binding migration contract.
  - Refined T-B return contract, field-level authority ledger, deterministic output ordinals and closed scientific preparation/error matrix.
  - Confirmed ART-B evidence-strength, CMP-B1 factual-comparison, DISP-S deterministic-conclusion and PKT-S reference-centered Packet transaction/migration boundaries.
  - Confirmed P5-ELIG-S deterministic eligibility, exact-package authorization, no-resubmission and outcome-agnostic acceptance boundary.
  - Explicit ledger separating P0 invariants from P1/P5 late-bound implementation and workload choices.
  - Capability and rollout matrix covering disabled, disposable-PG, named-local and real-provider windows.
- Verification:
  - Static writer census finds one EF scientific writer, one PI trust gateway and one PI closure writer.
  - Architecture review confirms no cross-domain FK or alternate evidence path.
  - Contract review proves that protocol identity is frozen before Run submission and cannot be mutated after result creation.
- Rollback: N/A; documentation-only.

### Phase 1 — Real scientific result envelope

- Objective: convert a newly collected real-provider artifact into canonical scientific observations without weakening provenance.
- Deliverables:
  - The provider transport performs only canonical fetch, envelope/lineage/parser-binding validation and provider-manifest hashing; the transport does not own scientific metric semantics.
  - Only `collect()` returns backend-internal `RealProviderCollectSuccessV2`: the ordinary strict success holds the sole provider-manifest hash, while the readonly handoff holds canonical JSON/content hash/byte size. The worker performs no second fetch, recomputes envelope identity, loads all M-B2 bindings and invokes a provider-independent parser while canonical bytes remain in memory.
  - EvaluationProtocol owns workload slots/rules; the structural result-schema registry owns generic shape; parser emits keyed drafts; a pure source sealer canonicalizes the complete M-B2 manifest outside the transaction and performs no persistence.
  - Collection orchestration assigns fixed output ordinals `1=diagnostic`, `2=scientific_source`; a short repository transaction persists collection terminal state and the optional sealed source, after which the ephemeral envelope is released.
  - An identity-only post-commit command reloads the sealed source and exact authority chain, copies sealed values without reinterpretation and assigns B2/derivation/Result identity. The command never accepts observations or metric values.
  - Stable observation identity; strict `point/mean/median/proportion/minimum/maximum/sum/quantile` statistic variants; positive sample count; typed `none/standard_deviation/standard_error/confidence_interval` uncertainty; exact source artifact/parser/derivation bindings.
  - Hash-bound artifact refs for large raw samples; no raw provider payload or generic metadata bag in the Result.
  - Declared artifact refs have fixed ART-B v1 source-hash-sealed semantics; no byte verification is claimed or implemented.
  - Exact cell/result idempotency and canonical hash behavior.
  - Confirmed DB-B persistence: Result v1 remains source-null/ineligible; Result v2 requires the complete B2 spine and exact composite source/Collection/Attempt constraints; ProvisionalOutput admits only the closed diagnostic or scientific tuple.
  - Unit, negative-provenance and disposable-PostgreSQL persistence tests.
  - Transport/worker boundary tests proving one provider fetch on the successful collection path, identical ephemeral/persisted upstream hash binding, no parser/Result refetch, no provider-owned scientific interpretation and no raw-envelope product response or scientific persistence.
  - Closed failure tests for reader/handoff/preparation/commit outcomes; only typed transient failures retry, expected unsupported/incomplete parsing produces collected diagnostic-only, and no path relies on lease expiry for ordinary recovery.
- Verification:
  - EF-managed real-provider fixture passes; metric-bearing product requests, `diagnostic_only`, simulation, fake, caller-authored, external-import, incomplete and lineage-drift fixtures fail before scientific writes.
  - Replacing a source artifact/parser/derivation identity changes the Result hash or rejects as conflict; replay of the exact source is identical.
  - Invalid provider envelopes fail collection. Valid envelopes with unsupported/missing scientific fields preserve collected diagnostic facts but create neither `scientific_source` nor Result.
- Rollback:
  - Keep scientific-validation capability disabled; remove the additive intake path without modifying historical outputs.

### Phase 2 — Product validation and evidence relay

- Objective: make complete real results enter the existing scientific validator and trusted PI evidence path.
- Deliverables:
  - Explicit authenticated/local product command or API for record/validate orchestration.
  - Complete-batch validation, outbox delivery and replay-safe Trust Gateway consumption.
  - Separate evidence eligibility from confirmed CMP-B1 ordered two-cell directional absolute-difference facts under preregistered non-overlapping decision bands and optional conservative CI guard; no EF-authored contextual disposition.
  - Read/operability endpoint or summary sufficient to diagnose terminal failures without exposing raw provider payloads.
- Verification:
  - Targeted service/route tests and disposable-PostgreSQL relay test prove one Candidate, one REU, one trace manifest and one registration event.
  - Valid supporting, contradicting and indeterminate comparison fixtures all remain eligible; integrity/unsupported failures remain ineligible.
  - Required-CI absence/mismatch fails validation; valid intervals that do not clear one decision band remain eligible indeterminate evidence. Fact replay preserves one relation/reason and exact hash.
- Rollback:
  - Disable intake while continuing to drain already committed outbox events; do not delete trusted evidence.

### Phase 3 — PI scientific closure

- Objective: close a Cycle from trusted evidence and an exact contextual proposal under one authoritative transaction.
- Deliverables:
  - Confirmed DISP-S: one exact admitted ResultAnalysis proposal, one primary registered relation, an identity/CAS/proposal-only authorization command and server-derived disposition/exit.
  - D-18 current-effective watermark validation and closure CAS.
  - Scientific closure event and product Cycle synchronization.
- Verification:
  - Positive, negative and inconclusive mappings; absent/duplicate-primary, direct disposition/exit/review-choice fields, stale proposal/head, active attempt, replay and concurrent-closure negatives.
- Rollback:
  - Keep cycle-closure capability disabled; previously committed closures remain immutable.

### Phase 4 — Interpretation Packet and paper artifacts

- Objective: turn the immutable closure into the sole semantic packet consumed by downstream paper evidence products.
- Deliverables:
  - Confirmed PKT-S composite `ValidationCycleClosed` consumer/materializer that acknowledges only after semantic projection and Packet materialization succeed.
  - Four-field exact Closure binding on the existing Packet table, idempotent short-transaction persistence and a server-side Packet+Closure+proposal Claim/Dossier read view.
  - Closed-cycle and pre-closure write seals.
- Verification:
  - Event replay, transaction drift and project accounting tests; direct pre-closure creation remains rejected.
- Rollback:
  - Stop the consumer and replay from the durable event after repair; do not mutate closure authority.

### Phase 5 — Real end-to-end acceptance

- Objective: prove the complete scientific path on a newly authorized real workload.
- Current evidence: revision 19 proves the exact two-Job WorkOrder → real Result → validation → EvidenceCandidate → REU/trace segment and zero-duplicate replay. ResultAnalysis failed before first runtime-artifact persistence, so scientific Closure, Packet, Claim/Dossier and `M0-SCI` remain incomplete.
- Deliverables:
  - Versioned P5-ELIG-S validator plus reviewed exact-hash workload/protocol/result-parser package and bounded cloud authorization plan.
  - Durable digest summary of Jobs, lineage, evidence, closure, Packet, claims, cost and cleanup.
  - Repeatable operating/recovery runbook.
- Verification:
  - Preflight rejects package drift, missing authorization bounds, non-comparable cells, external results and more/less than two operations before provider access.
  - Exact two-cell success plus zero-duplicate replay and full evidence/closure/dossier assertions; positive, negative and inconclusive dispositions are all valid.
- Rollback:
  - Close intake/control capabilities, drain durable events, retire credentials and retain immutable evidence; never delete cloud Jobs solely for demonstration.

## Verification and acceptance criteria

- Typecheck/lint:
  - `pnpm typecheck`
  - `pnpm lint`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Automated tests:
  - Targeted shared/backend unit and route suites per phase.
  - `TS_NODE_TRANSPILE_ONLY=true pnpm test`
  - Disposable PostgreSQL relational gates with zero conditional skips for affected scientific/evidence/closure paths.
- Manual/operational checks:
  - Disabled-capability probes prove zero provider calls and zero scientific writes.
  - Named-local rollout requires recovery point and exact migration/source digest if schema changes exist.
  - Real-provider phase requires separate user authorization, bounded cost, short-lived credentials and cleanup census.
- Final acceptance:
  - A new real two-cell result, not a historical diagnostic output, becomes typed scientific evidence.
  - No manual or external experiment result can enter the scientific writer, qualified-candidate or Cycle-closure path.
  - EF emits exactly one qualified candidate; PI creates exactly one trusted REU and trace manifest.
  - EF validation `passed` is not interpreted as positive outcome; valid negative/inconclusive facts reach PI, and EF never writes the final disposition.
  - PI freezes one authoritative positive/negative/inconclusive disposition and selected exit under D-18.
  - One post-closure ResultInterpretationPacket drives Claim/Dossier with full project accounting.
  - Replay creates no duplicate provider Job, result, event, REU, closure, Packet or claim.
  - P0-P4 are recorded as `implementation_complete_unreleased`; only the successful P5 run passes `M0-SCI` and permits T-136 closeout.

## Risks and mitigations

| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| Diagnostic output is accidentally trust-upgraded | medium | high | Require a new typed real-provider result envelope and permanent negative tests | Writer census and protected-table digest | Disable intake; preserve history unchanged |
| External/manual results bypass EF execution authority | medium | high | Provide no import contract; require persisted exact EF real-provider Attempt identity at the sole writer | Route/contract census and zero-write negative tests | Reject before result persistence |
| Caller/LLM becomes scientific authority | medium | high | Proposal-only runtime; server derives disposition/exit/hash | Contract negative tests and stored-row census | Disable scientific closure |
| Partial batch produces evidence | medium | high | Exact ordered-cell completeness and one transaction/outbox | Relational batch/replay tests | Reject before Candidate commit |
| Cross-domain identity drift | medium | high | Exact ids/hashes/sequences plus head acknowledgement and Trust Gateway reread | Tamper/drift tests | Terminal reject event; no REU |
| Duplicate closure or Packet on relay replay | medium | high | Business idempotency, unique authority key and event-envelope hash | Concurrent/replay relational tests | Stop consumer and replay after repair |
| Real cloud cost or credential exposure | low | high | Separate authorization, bounded workload, short-lived credentials, redacted digests | Operation/cost/credential census | Revoke credentials and close capabilities |
| Existing Packet schema cannot represent exact Closure authority | medium | medium | Confirmed PKT-S adds only schema/Closure id/hash/Packet hash plus exact tuple FK and unique ownership | Schema/read-write census, join-view and exact Closure/Packet replay tests | Keep materializer disabled and roll back before authoritative v2 writes |
| Implementation readiness is mistaken for scientific release readiness | medium | high | Make `implementation_complete_unreleased` the only P0-P4 checkpoint and require explicit P5 `M0-SCI: passed` evidence | Task status, capability-state and acceptance-record review | Keep capabilities off and retract any unsupported release claim |
| Results influence protocol thresholds or exit rules | medium | high | Bind an immutable protocol revision before Run submission; changed rules require a new revision and Run | Hash/revision drift and post-result mutation tests | Reject validation/closure against the mutated revision |
| Provider/workload details become accidental domain contracts | medium | medium | Freeze canonical semantics, not raw layout or one workload; keep adapters behind the parser boundary | Cross-provider fixture/contract review | Replace adapter without changing canonical evidence identity |
| Succeeded Attempt is mistaken for proof of submitted metric values | medium | high | Product command accepts identities only; EF rereads the committed sealed source chain and constructs observations with parser/derivation hashes | Request-shape and source-reread negative tests | Reject before Result persistence |
| Negative scientific outcome is mistaken for invalid evidence | medium | high | Keep eligibility status separate from comparison facts and PI disposition | Negative/inconclusive relay fixtures | Preserve Candidate/REU and correct only the PI mapping |
| P5 is rerun until it produces a preferred conclusion | low | high | P5-ELIG-S makes acceptance outcome-agnostic and authorization exact-package/single-run bound | Package hash, Job count and acceptance-record review | Fail the attempt; require a new Run/package/authorization with retained history |
| Failed P5 Job is silently replaced or exceeds cost scope | low | high | Authorize exactly two `CreateJob` operations, prohibit automatic resubmission and bind operation/cost ceilings | Provider-operation and cost census | Close capabilities, revoke credentials and fail the attempt |

## Optional detailed documentation layout

```
dev-docs/active/scientific-evidence-to-paper-closure/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos

- [x] Confirm planning-mode signal handling and fallback record.
- [x] Confirm input sources and trust levels.
- [x] Confirm merge decisions and conflict log entries.
- [x] Record open questions for Phase 0 rather than invent answers.
- [x] Confirm phase ordering and definition of done.
- [x] Confirm verification and acceptance criteria.
- [x] Confirm default-off rollout and immutable rollback strategy.
- [x] Confirm P0 option B: invariant freeze with experiment/provider parameters late-bound.
- [x] Confirm source persistence option B: additive `scientific_source` output plus direct Result binding.
- [x] Confirm refined transport handoff T-B and field-level semantic/persistence ownership.
- [x] Confirm bounded artifact evidence strength for M0-SCI v1 as ART-B.
- [x] Confirm cross-cell comparison facts as CMP-B1.
- [x] Confirm PI disposition/exit mapping as DISP-S.
- [x] Confirm Packet materialization boundary as PKT-S.
- [x] Freeze the P5 workload eligibility profile and authorization constraints as P5-ELIG-S.
