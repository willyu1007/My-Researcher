# T-136 Scientific Evidence to Paper Closure

## Status

- State: in-progress
- Task ID: `T-136`
- Mapping: `M-001 > F-001 > R-012 + R-013 > T-136`
- Product release role: mandatory `M0-SCI` scientific capability gate inside product M0; the gate is not the governance milestone `M-001` and not the sole release gate for all M0 modules.
- Origin: user-requested follow-up to the four-module completion review on 2026-08-04.
- Next step: enter P3 by extending the existing PI ValidationCycle closure with the confirmed DISP-S deterministic relation→disposition→exit projection. The named local database remains untouched and still requires a separate recovery-point and approval gate.

### Current implementation checkpoint — 2026-08-08

- P1 transport/source-bound Result and P2 product validation/CMP-B1/qualified-evidence intake are implemented and verified for the P0-P2 checkpoint.
- Product composition leaves both scientific validation and the legacy observation-bearing Result writer disabled by default. Legacy caller-authored observations are available only through an explicit test/migration option; the product-safe Result action accepts identities only.
- P2 validation now reads only the exact complete source-bound Result v2 set in product composition, resolves artifact rules through an admission-frozen `artifact_key`→`required_rule_id` slot binding, emits hash-covered CMP-B1 facts separately from eligibility, atomically creates Candidate/outbox state and reuses the existing PI Trust Gateway for one REU/trace/registered event. Historical protocol/report v1 remains readable but cannot enter the new product path without the explicit P2 fields; legacy Result v1 validation is test/migration-only.
- New scientific EvaluationProtocols must freeze exactly one `primary_comparison_key`, positive/negative/inconclusive exit keys and explicit artifact rule-or-trace-only bindings before Run submission. P3 can therefore derive disposition/exit without post-result protocol guessing.
- Shared/backend typechecks, OpenAPI quality/index checks and the corrected P2 targeted lanes pass. Fresh disposable-PostgreSQL Pack C `packc-ef-20260808-r5` passes 119/119 with zero failures, skips or blocks and confirmed cleanup.
- This is an implementation checkpoint, not `M0-SCI` release completion. Scientific capabilities remain default-off; P3-P5 remain.
- No named-local database, cloud/provider resource, capability flag or credential state changed.

## Goal

Close the real scientific path from a PaperImplementation-owned experiment question and WorkOrder through ExperimentFoundation real execution and validation back into an authoritative PI scientific disposition, ResultInterpretationPacket, Claim and Dossier.

## Rationale

T-132 proved that an exact PI-bound two-cell Run can execute successfully on real Alibaba Cloud PAI and collect exact parser-bound outputs. Those outputs were intentionally `diagnostic_only`, and scientific/evidence writers remained zero.

The repository also contains the EF v2 scientific validation kernel, `EvidenceCandidateQualified` relay, PI Evidence Trust Gateway, D-18 readiness watermark and control-only ValidationCycle closure. The remaining gap is not a new transport architecture: the gap consists of the real scientific result producer, product validation entry, PI scientific closure authority, post-closure Packet materialization and one honest end-to-end acceptance.

## In scope — the five enhancement priorities

1. Produce server-generated canonical `ExperimentResultCellV2` scientific observations from a newly collected real-provider workload with exact Run/Cell/TaskSpec/Attempt/collected-output/parser/derivation provenance and typed statistical summary semantics.
2. Add a default-off product entry that records a complete scientific batch, runs the existing EF validator and drives the existing qualified-evidence relay into one trusted PI REU.
3. Implement PI `scientific_evidence_assessed` ValidationCycle closure with server-derived disposition and exit under the D-18 CAS watermark.
4. Materialize one `ResultInterpretationPacket` from `ValidationCycleClosed` and make the Packet the downstream source for Claim/Dossier accounting.
5. Run one separately authorized bounded two-cell real-provider acceptance from WorkOrder to Claim/Dossier with no injected scientific numbers and zero duplicate effects on replay.

## Non-goals

- No Literature-to-EF automatic asset discovery.
- No topic-selection/debate changes.
- No trust upgrade of historical T-132 `diagnostic_only` outputs.
- No scientific evidence from simulation, fake-provider or caller-authored observations.
- No product/controller DTO that accepts metric values, statistical conclusions or observation arrays; ExperimentResult is a server-generated persisted fact, not an input form.
- No manual or external experiment-result import from naked numbers, CSV, notebooks, external-cluster logs or third-party run bundles. PAI or another external platform is valid only when EF created, tracked and collected the exact Attempt.
- Published experimental numbers may remain source-anchored literature/baseline context, but they cannot become project-scoped ExperimentResult, REU or scientific closure evidence.
- No second EF→PI evidence gateway or second PI conclusion authority.
- No desktop UI, multi-user delivery, generalized provider packaging or automatic prose generation.
- No desktop navigation decision; PI and EF peer-domain ownership is independent of future UI placement.
- No paid cloud, named-local scientific write or capability enablement without a separate reviewed authorization.

## M0-SCI release semantics

- Other M0 modules may continue development and preview independently of T-136.
- Before P5 passes, the product MUST NOT enable or claim a real WorkOrder-to-Dossier scientific closure capability.
- Completing P0-P4 establishes only the checkpoint `implementation_complete_unreleased`; T-136 remains open and the affected scientific capabilities remain default-off.
- Only the new real two-cell P5 acceptance can pass `M0-SCI` and make T-136 eligible for completion. Passing the gate permits a later controlled enablement decision; gate passage does not turn capability flags on.
- Desktop UI completion and navigation placement are outside the `M0-SCI` gate and remain deferred.

## Authority boundary

- `paper-implementation` and `experiment-foundation` are peer canonical bounded contexts; neither is the other's internal module.
- PaperImplementation owns the experiment intent, WorkOrder revision, branch/head, trusted REU admission, ResultAnalysis proposal review, ValidationCycle closure, Packet, Claim and Dossier.
- ExperimentFoundation owns reusable assets, real execution attempts, scientific result cells, protocol validation reports and EvidenceCandidates.
- Cross-domain handoff remains durable events plus exact ids/hashes/sequences. No cross-domain ORM cascade or foreign-key ownership is introduced.
- Model output is proposal evidence. The server remains the sole writer of scientific disposition, selected exit and closure hashes.
- PaperProject provides lifecycle scope/container and does not broker PI↔EF execution or evidence delivery. Literature remains a source/candidate domain only.

## Phase 0 planning boundary

- P0 follows the user-confirmed option B: freeze scientific invariants, bind replaceable experiment/provider parameters later.
- P0 freezes sole writers, state transitions, typed result semantics, canonical identity/hash rules, protocol preregistration, disposition/exit derivation, Packet idempotency, capability behavior, the confirmed additive migrations and the P5-ELIG-S workload eligibility/authorization boundary.
- P0 does not freeze a concrete model, dataset, provider raw-file layout, P5 parameter set or desktop/API presentation. Those choices remain late-bound within the frozen contracts.
- `recordExperimentResult` and `validateScientificBatch` remain distinct EF domain actions. A later product orchestration wrapper may invoke both; transport route count is not a scientific authority decision.
- The product-facing result command is identity-only. EF rereads the exact committed `scientific_source` plus collection/Attempt/Run chain and constructs the immutable Result from the already parser-bound summaries; the current observation-bearing writer shape is an internal implementation seam to replace or close, not a product contract.
- Collection and Result generation have separate commit boundaries. The provider transport only fetches and validates the canonical envelope; the EF worker invokes a provider-independent parser while those bytes are in memory and atomically seals an optional `scientific_source`. Only after that transaction commits may a separate identity-only command generate Result from the sealed source chain.
- A malformed provider envelope fails collection. A valid collected envelope that cannot satisfy the scientific parser/profile/schema remains a collected diagnostic fact but produces no `scientific_source`, Result, validation or evidence. The split preserves collection truth without weakening scientific fail-closed behavior.
- Source persistence follows confirmed option B/B-lite: extend the existing collection-output authority with a distinct `scientific_source` class, preserve all `diagnostic_only` history and bind Result directly to one committed canonical source. JSON-only references and a separate mutable source/derivation subsystem are rejected.
- The confirmed B2 field split keeps identity/integrity queryable and relational: Result stores collection/source id/hash/kind/class, parser profile version/hash and derivation hash. Provider manifest, result-schema identity, typed summaries/statistics/uncertainty and raw artifact refs stay inside the hash-bound canonical source manifest.
- Statistic/uncertainty follows a strict discriminated union. Every observation has a positive `sampleSize`; `point` requires one sample; aggregate and quantile variants are explicit; uncertainty is `none`, SD, SE or confidence interval. `none` is legal only when the preregistered protocol does not require uncertainty.
- Observation identity follows confirmed O-B: the preregistered protocol freezes an `observationKey` and `ordinal`; EF derives the id from RunCell, protocol revision hash and semantic slot. Values, uncertainty, parser and source hashes are content, not identity, so changed replay conflicts instead of creating another observation.
- Canonical arrays ignore provider/parser order and follow protocol ordinals. Provider manifest, scientific source, derivation and Result use separate domain-separated hashes; timestamps, retries, locators and idempotency request keys are excluded from scientific content hashes.
- The confirmed M-B2 source manifest uses `ExperimentFoundationScientificSourceManifest@v1`, fixed kind `scientific_result_manifest` and class `scientific_source`. The manifest hash-binds Collection/Attempt authority, exact ExecutionBundle/Run/Cell/TaskSpec lineage, the full EvaluationProtocol revision tuple, parser/result-schema bindings, the upstream provider-manifest hash and protocol-ordered observations/artifacts.
- `sourceOutputId` is deterministically derived from Collection plus fixed source kind and is excluded from `sourceOutputHash`; the source hash covers the full M-B2 manifest but excludes itself and operational metadata. Result-schema version/hash is a real T-136 contract addition frozen by ExecutionBundle authority and copied into TaskSpec before submission.
- The refined T-B transport handoff is frozen as a backend-internal `RealProviderCollectSuccessV2`: its strict succeeded collect outcome is the only holder of `result_manifest_hash`, while a readonly `ValidatedProviderResultEnvelope` carries canonical envelope JSON, content hash and UTF-8 byte size. The shared normalized outcome, product DTOs, events and persistence do not gain raw-envelope fields.
- Scientific semantic ownership is single-source: EvaluationProtocol owns workload-specific observation/artifact slots and comparison semantics; the scientific result-schema registry owns only provider-independent structural schema; ExecutionBundle freezes compatible parser/schema refs; TaskSpec copies them; parser extracts keyed drafts; the source sealer assigns protocol order/ids/source identity/hash; Result generation performs an exact projection rather than reinterpreting values.
- Expected scientific preparation uses a closed `sealed | not_scientific` outcome. Only explicitly typed transient reader/repository failures retry; invalid envelope/binding/handoff and deterministic preparation conflicts fail closed under stable reason codes. An unsupported/incomplete scientific draft preserves collected diagnostics and creates no source.
- Provisional output ordinals are deterministic for the real-provider collection contract: the existing real-provider diagnostic output is ordinal `1` and the optional canonical scientific source is ordinal `2`. The source sealer performs no persistence; the collection worker constructs operational row fields and the repository atomically commits them.
- Physical persistence follows confirmed DB-B on local PostgreSQL: preserve legacy Result `schemaVersion=v1` with all new source fields `NULL`; require every new source-bound Result `schemaVersion=v2` to populate the complete B2 spine under database CHECKs and exact composite FKs. Nullable columns are migration compatibility only, not optional scientific provenance.
- `ProvisionalOutputV2` retains existing diagnostic rows and gains one legal scientific tuple: kind `scientific_result_manifest`, class `scientific_source`, row manifest version `ExperimentFoundationScientificSourceManifest@v1`. No historical Output or Result is backfilled, deleted or trust-upgraded.
- Result facts contain typed statistical summaries and derivation/artifact bindings, while large raw samples remain hash-bound artifacts. Cross-cell comparison facts belong to EF validation output, not an individual cell Result.
- EF evidence eligibility and PI scientific disposition remain separate axes: valid negative/inconclusive results qualify for evidence even when they do not support the hypothesis.
- Every real Run must bind a protocol revision frozen before submission. Post-result threshold/direction/exit-rule changes require a new revision and new Run rather than mutating existing evidence.
- Confirmed ART-B limits v1 artifact refs to exact controlled-run declarations sealed by the source hash and forbids byte-verification claims or artifact-byte-dependent P5 conclusions. Confirmed CMP-B1 limits v1 comparison to preregistered two-cell same-unit directional absolute differences with non-overlapping decision bands and an optional conservative CI guard. Confirmed DISP-S maps one primary relation deterministically to disposition/exit; calling Closure is authorization, not a human scientific choice. Confirmed PKT-S materializes one reference-centered Packet without adding a proposal, review, closure or second Packet store. Confirmed P5-ELIG-S requires a deterministic preflight over one exact hash-bound two-cell package and a separate single-use user authorization window; no expected disposition is an acceptance target.
- Current PI storage census proves that the existing Closure model is sufficient while Packet needs only `schemaVersion`, exact Closure id/hash and `packetContentHash`. Proposal, disposition and exit remain Closure-owned and are joined into the downstream read view rather than copied into Packet.

## Dependencies and coordination

- Follows `T-132 experiment-foundation-productization-closure` for the exact real PAI control path and scientific-validation kernel.
- Coordinates with `T-124 paper-implementation-productization-hardening` for PI result/claim/dossier authority.
- Preserves `T-133 paper-implementation-debate-disposition-closure`; no debate route is reopened.
- Maps to both `R-012` ExperimentFoundation and `R-013` PaperImplementation because completion requires an owned cross-domain handoff, not ownership transfer.

## Acceptance criteria

- [ ] A newly collected real-provider two-cell workload produces immutable typed scientific result cells; diagnostic/simulation/fake outputs cannot do so.
- [ ] Manual numbers and external experiment-result imports have no scientific intake path and cannot create ExperimentResult, EvidenceCandidate, REU or scientific closure state.
- [ ] The product result command accepts identities only; EF derives every observation from one exact committed scientific source with frozen parser/derivation identity.
- [ ] Provider transport contains no scientific metric interpretation; collection invokes one provider-independent parser before its short source-sealing transaction, with no network call inside the transaction.
- [ ] Provider transport returns its already validated canonical result envelope plus provider-manifest hash through an internal ephemeral handoff to the worker; the worker performs no second fetch, and the envelope is neither persisted as scientific evidence nor exposed through a product DTO.
- [ ] The collect handoff has one authoritative `result_manifest_hash` in its strict collect outcome; worker verification recomputes canonical-envelope byte size/content hash and exact authority bindings without adding a duplicate handoff hash or changing the shared normalized outcome.
- [ ] EvaluationProtocol, result-schema registry, ExecutionBundle/TaskSpec, parser, source sealer, collection transaction and Result service each have one non-overlapping field-assignment role; copied/projection fields cannot become a second semantic authority.
- [ ] Reader, handoff, scientific preparation and commit failures map to stable closed outcomes/reason codes; only explicitly typed transient failures retry, and no unexpected parser exception can leave an implicitly leased or partially committed source.
- [ ] Real-provider collection uses deterministic output ordinals `1=diagnostic`, `2=scientific_source`; replay cannot allocate a different ordinal or replace an existing source.
- [ ] Every Result directly binds one committed canonical `scientific_source`; a valid diagnostic collection with failed/unsupported scientific parsing creates neither scientific source nor Result.
- [ ] The additive source-binding migration enforces source class, one canonical root per collection and exact Result→source integrity without changing historical diagnostic rows.
- [ ] The DB-B version gate leaves legacy Result v1 rows source-null and evidence-ineligible while requiring Result v2 rows to carry all eight B2 fields, exact source/Collection/Attempt relations and fixed scientific kind/class.
- [ ] The Result relational spine enforces the same collection/Attempt and exact source id/hash/kind/class; parser/derivation identities are persisted, while extensible scientific payloads remain in the sealed manifest.
- [ ] Result observations have stable identity and typed statistic/sample-size/uncertainty semantics; large raw samples remain hash-bound artifacts rather than generic JSON payloads.
- [ ] M0-SCI v1 describes artifact refs only as exact controlled-run declarations sealed in the canonical envelope/source hash, makes no independent artifact-byte-verification claim and keeps the P5 conclusion independent of unfetched artifact bytes.
- [ ] Statistic/uncertainty invalid combinations, non-finite values, invalid probabilities/levels, negative dispersion and protocol-required missing uncertainty prevent scientific-source sealing.
- [ ] Every expected observation slot matches exactly once in protocol order; missing, duplicate or unexpected observations prevent source sealing, while value/uncertainty changes under the same observation id cause a deterministic conflict.
- [ ] Canonical JSON normalizes `-0` to `0`, rejects non-finite values, uses stable object-key ordering and protocol-defined array ordering, producing byte-identical hashes on replay.
- [x] Complete-batch EF validation emits exactly one eligible EvidenceCandidate and the existing relay creates exactly one trusted PI REU plus trace manifest.
- [x] Validation eligibility is independent of hypothesis outcome: trustworthy supporting, contradicting and indeterminate comparison facts can all produce EvidenceCandidate, while only PI writes the final disposition.
- [x] Comparison facts use a preregistered closed rule, exact Result/observation refs, deterministic order/hash and non-overlapping support/contradiction bands; they contain no PI conclusion fields.
- [x] CMP-B1 uses one relation plus one closed reason, never redundant support/contradiction check fields; missing required CI is validation failure, while a valid non-decisive interval is evidence-eligible `indeterminate`.
- [x] Incomplete, unsupported, non-head, lineage-drifted or non-real-provider batches fail closed without partial evidence.
- [ ] PI closes a ready Cycle from one exact contextual proposal and one protocol-designated primary comparison fact while deriving disposition, exit and hashes server-side.
- [ ] Calling Closure is the only approval action and carries no `accept/correct/downgrade`, disposition or exit field; disagreement leaves the Cycle open for proposal/evidence/protocol correction.
- [ ] Active real attempts, stale closure watermarks, stale proposals and duplicate/conflicting requests fail closed.
- [ ] `ValidationCycleClosed` materializes exactly one ResultInterpretationPacket; direct pre-closure Packet writes remain closed.
- [ ] The scientific Packet stores only its v2 schema, exact Closure id/hash and canonical Packet hash; replay returns the identical Packet or conflicts, while proposal/disposition/exit are projected from Closure at read time.
- [ ] Claim/Dossier consumes the closed Packet and accounts for all required successful, negative, failed, cancelled and inconclusive evidence states according to existing policy.
- [ ] A separately authorized real two-cell end-to-end run reaches Claim/Dossier without injected scientific numbers and exact replay creates zero duplicate Jobs, rows or events.
- [ ] P5 preflight admits only one new immutable Run with exactly two ordered real-provider cells, one declared differing factor, comparable parser/metric semantics and exactly two authorized `CreateJob` operations.
- [ ] The user authorizes one exact package hash, operation/cost ceilings, capability set, time window and credential-handling plan; changed package content requires a new hash and authorization.
- [ ] Positive, negative and inconclusive outcomes are equally eligible to pass P5 when the registered chain is valid; Job failure/cancellation or package drift fails the attempt without hidden substitution or automatic resubmission.
- [ ] Capability defaults remain false, credentials and provider diagnostics are not persisted, and rollout/backout evidence is recorded.
- [ ] P0 produces an explicit invariant-freeze/late-binding ledger and proves that every real result references a protocol frozen before Run submission.
- [ ] Post-result protocol mutation cannot change an existing Run's validation, disposition or selected exit; changed rules require a new revision/new Run.
- [ ] P0-P4 completion is recorded only as `implementation_complete_unreleased`; neither T-136 nor `M0-SCI` is declared complete before P5.
- [ ] P5 acceptance explicitly records `M0-SCI: passed`; no science-closure product claim or enablement occurs earlier.

## Completion boundary

The task is complete, and `M0-SCI` passes, only after the real end-to-end acceptance. Passing unit tests with synthetic scientific fixtures, completing P0-P4 or successfully collecting `diagnostic_only` cloud output is necessary support evidence but is not sufficient for T-136 completion.
