# T-136 Scientific Evidence to Paper Closure

## Status

- State: in-progress
- Task ID: `T-136`
- Mapping: `M-001 > F-001 > R-012 + R-013 > T-136`
- Product release role: mandatory `M0-SCI` scientific capability gate inside product M0; the gate is not the governance milestone `M-001` and not the sole release gate for all M0 modules.
- Origin: user-requested follow-up to the four-module completion review on 2026-08-04.
- Current step: revision 13 / attempt 11 produced one eligible package but expired without acceptance, credential access, cloud calls or execution. The user resumed P5 on 2026-08-14 for immediate execution; active harnesses isolate revision 14 / attempt 12, and the fresh recovery plus local test/typecheck gates pass. Paid/capability authority remains false.
- Next step: materialize one exact eligible revision-14 package and obtain the one-line hash-bound confirmation. No historical credential, acceptance, claim, completion or terminal state may be reused.

### Current implementation checkpoint — 2026-08-10

- P1 transport/source-bound Result, P2 product validation/CMP-B1/qualified-evidence intake, P3 PI scientific ValidationCycle closure and P4 post-Closure Packet/Claim/Dossier integration are implemented and verified.
- Product composition leaves both scientific validation and the legacy observation-bearing Result writer disabled by default. Legacy caller-authored observations are available only through an explicit test/migration option; the product-safe Result action accepts identities only.
- P2 validation now reads only the exact complete source-bound Result v2 set in product composition, resolves artifact rules through an admission-frozen `artifact_key`→`required_rule_id` slot binding, emits hash-covered CMP-B1 facts separately from eligibility, atomically creates Candidate/outbox state and reuses the existing PI Trust Gateway for one REU/trace/registered event. Historical protocol/report v1 remains readable but cannot enter the new product path without the explicit P2 fields; legacy Result v1 validation is test/migration-only.
- New scientific EvaluationProtocols must freeze exactly one `primary_comparison_key`, positive/negative/inconclusive exit keys and explicit artifact rule-or-trace-only bindings before Run submission. P3 now rereads that exact protocol and its canonical primary fact inside the closure transaction before deriving disposition/exit.
- ResultAnalysis exposes only a scientific-closure intent containing the expected D-18 watermark. Before the provider call, the backend rereads the local PostgreSQL authority in a short serializable transaction and supplies the exact ordered REUs, canonical reports/protocols and unique primary fact; caller-authored scientific context/source bodies are rejected.
- Only `product` + `provider_llm` ResultAnalysis finals admitted by the slot's official v1 final-admission policy are Closure-eligible. The resolver revalidates the complete runtime envelope/admission payload and canonical identity hashes; Closure independently rereads and rehashes every REU/report/protocol/fact before assigning disposition, selected exit and closure hashes.
- P4 composes one internal `ValidationCycleClosed@v1` Packet materializer after the existing semantic projection. It assembles Packet-owned semantics from the exact Closure, official proposal and trusted REU/trace/comparison authority, writes the confirmed four-field PKT-S binding in a short serializable transaction and acknowledges the event only after both idempotent consumers succeed.
- Legacy Packet rows remain readable but are rejected from new Claim/Dossier creation. Closed Packet reads recompute the canonical Packet hash and authority-derived content; Claim strength cannot exceed the admitted proposal ceiling, and ready Dossiers must preserve exact Closure refs plus failed/cancelled, negative, inconclusive and stale accounting carried by their Packets.
- Shared/backend typechecks, OpenAPI quality/index checks and targeted P3 contract/runtime/closure/HTTP lanes pass. Final review-remediation gate `packc-pi-20260808-r5` passed 151/151 across seven suites; its relational lane passed 6/6 including official-policy rejection, admission-payload tamper rejection, stale-REU canonical rehash rejection, aliased Cycle refs with independent domain/runtime versions, the real ResultAnalysis→admission→Closure path and exact replay. The identity-marked disposable database/container was removed.
- Shared/backend typechecks, OpenAPI quality/index checks and the corrected P2 targeted lanes pass. Fresh disposable-PostgreSQL Pack C `packc-ef-20260808-r5` passes 119/119 with zero failures, skips or blocks and confirmed cleanup.
- Final P4 gate `packc-pi-20260808-r8` passed 193/193 across eight suites with zero failures, skips or blocks. Its relational lane passed 6/6 and executes the production scientific Closure→Packet materializer, exact replay and one-row Closure ownership against a fresh identity-marked disposable PostgreSQL database; cleanup passed. Canonical summary digest: `sha256:4925fe76fccfae97dabbdb230ab7af28df44f605c48d3dbf7718f30e69bc7e05`.
- P4 quality review then closed four downstream integrity gaps: event mirrors now match the stored Closure exactly, an identical concurrent Packet unique-key winner is reconciled as replay, Claim REU support is bound to its selected Packet, and ready Dossiers enforce exact Claim→Packet/ClaimTrace lineage plus claim-ceiling and forbidden-overclaim accounting. Packet functional refs now use `packet_content_hash`, not `trace_manifest_id`, as their version identity.
- Superseding review gate `packc-pi-20260809-r9` passed 197/197 with zero failures/skips/blocks; relational passed 6/6, route integration passed 7/7 separately, the disposable database/container was cleaned up and the ignored gate directory was moved to Trash. Canonical summary digest: `sha256:88613c3782e630f802845ce29e3fd88df44cef996c64b1f5a99acb679068bce1`.
- P5 has entered its staged preparation slice. The backend owns versioned, domain-separated hashes for one exact P5 execution package, one named-local authority snapshot and one deterministic eligibility record. The validator schema-validates and canonically rehashes the full ExecutionBundle revision plus existing WorkOrder revision, exact cells, executable TaskSpecs, Run manifest and EvaluationProtocol revision instead of introducing parallel P5 scientific identities; it then enforces one differing parameter, comparable execution/parser/result-schema/metric semantics, exactly two no-retry `CreateJob` operations, bounded cost/window/credential/recovery rules and no manual result/outcome target.
- A new provider-independent SciFact retrieval workload freezes `retrieval_top_k` as the sole factor (`10` then `5`), emits protocol-shaped `micro_recall_ppm`, and treats qrels only as benchmark input. The authoritative BEIR archive, corpus, 300-query test slice and 339-row qrels were independently digested; full local runs produced deterministic non-evidence observations of `430678` and `368731` ppm. These local runs verify workload semantics only and create no Product Result or scientific evidence.
- The exact workload and qrels objects were uploaded to new digest-addressed OSS keys and read back with matching SHA-256; the existing corpus/query objects were verified without overwrite. Cloud and local staging were removed, and the local archive was moved to Trash.
- The named-local stage-one apply reverified both recovery dumps, created exactly 146 scoped rows, changed zero of 217 protected tables and replayed with zero new rows. The apply froze 2 DataPolicies, 2 Datasets, 1 MetricDefinition, 1 Benchmark, 1 EvaluationProtocol, a three-part scientific ExecutionBundle, one WorkOrder and one fresh two-cell Run. Provider payloads, Attempts, Results, validation reports, EvidenceCandidates and REUs remain zero.
- Deterministic package preflight is `eligible` with zero reason codes. Authority snapshot hash is `sha256:bfdae4ab6da739675e6192ef8ceb531f79d1cf3f700a477e5a6ac90a60b3226d`; eligibility record hash is `sha256:ea160c7ae61a18f8890f9630f16619bf840ce79e69e1e03731c3887897ddfa61`. Exact user authorization and the expiry-based STS cleanup confirmation are recorded separately from the immutable preparation artifact. No provider Result exists yet, so `M0-SCI` is not passed.
- The P5 live runner owns only the two real Jobs through trusted REU production. A separate closure runner refuses Alibaba credentials, pins ResultAnalysis to the registered default OpenAI `gpt-5.6-sol` profile, then produces the admitted proposal, deterministic Closure and Packet. Both offline preflights pass; both execute modes reject outside the authorized window before changing capability state.
- Revision-3 execution made exactly one authorized `AssumeRole` call and zero qualification reads, `CreateJob` calls, provider writes, database writes or capability changes. A credential-free post-failure preflight confirms zero Attempts, Results, validations, REUs and pending integration outboxes; `credential-qualification-v1.json` is absent. The attempt consumed no paid-operation budget and did not reach M0-SCI acceptance.
- Revision-3 final safety verification used only the non-secret expiration timestamp. At `2026-08-10T01:30:54Z`, the STS had been expired for 211 seconds; local environment/profile/process/capability checks remained clean, and a second credential-free offline preflight again reported zero Attempts, Results, validations, REUs, pending integration outboxes, cloud calls, database writes, credential reads and capability changes.
- A final read-only workload census confirms that the maintained T-132 `ragperf-canary` source, authoring manifest and ExecutionBundle omit the scientific result-schema binding, declare `diagnostic_only=true` and restrict the provider-managed image identity to `m7_l1_diagnostic_only`. P5 must create a new code/parser/bundle revision and cannot re-label or trust-upgrade those assets.
- This is the `implementation_complete_unreleased` checkpoint, not `M0-SCI` release completion. Scientific capabilities remain default-off; only P5 remains.
- Named-local authority and the two planned OSS objects changed only within their reviewed stage-one scopes. Provider Jobs, capabilities, scientific Results and paid operations remain unchanged at zero; temporary credential material was not retained.

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
- PaperImplementation owns the experiment intent, WorkOrder revision, branch/head, trusted REU admission, ResultAnalysis proposal production/official admission, ValidationCycle closure, Packet, Claim and Dossier.
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
- [x] PI closes a ready Cycle from one exact contextual proposal and one protocol-designated primary comparison fact while deriving disposition, exit and hashes server-side.
- [x] Calling Closure is the only approval action and carries no `accept/correct/downgrade`, disposition or exit field; disagreement leaves the Cycle open for proposal/evidence/protocol correction.
- [x] Active real attempts, stale closure watermarks, stale proposals and duplicate/conflicting requests fail closed.
- [x] `ValidationCycleClosed` materializes exactly one ResultInterpretationPacket; direct pre-closure Packet writes remain closed.
- [x] The scientific Packet stores only its v2 schema, exact Closure id/hash and canonical Packet hash; replay returns the identical Packet or conflicts, while proposal/disposition/exit are projected from Closure at read time.
- [x] Claim/Dossier consumes the closed Packet and accounts for all required successful, negative, failed, cancelled and inconclusive evidence states according to existing policy.
- [ ] A separately authorized real two-cell end-to-end run reaches Claim/Dossier without injected scientific numbers and exact replay creates zero duplicate Jobs, rows or events.
- [x] P5 preflight admits only one new immutable Run with exactly two ordered real-provider cells, one declared differing factor, comparable parser/metric semantics and exactly two requested `CreateJob` operations.
- [x] The user authorizes one exact package hash, operation/cost ceilings, capability set, time window and credential-handling plan; changed package content requires a new hash and authorization.
- [ ] Positive, negative and inconclusive outcomes are equally eligible to pass P5 when the registered chain is valid; Job failure/cancellation or package drift fails the attempt without hidden substitution or automatic resubmission.
- [ ] Capability defaults remain false, credentials and provider diagnostics are not persisted, and rollout/backout evidence is recorded.
- [x] P0 produces an explicit invariant-freeze/late-binding ledger and proves that every real result references a protocol frozen before Run submission.
- [x] Post-result protocol mutation cannot change an existing Run's validation, disposition or selected exit; changed rules require a new revision/new Run.
- [x] P0-P4 completion is recorded only as `implementation_complete_unreleased`; neither T-136 nor `M0-SCI` is declared complete before P5.
- [ ] P5 acceptance explicitly records `M0-SCI: passed`; no science-closure product claim or enablement occurs earlier.

## Completion boundary

The task is complete, and `M0-SCI` passes, only after the real end-to-end acceptance. Passing unit tests with synthetic scientific fixtures, completing P0-P4 or successfully collecting `diagnostic_only` cloud output is necessary support evidence but is not sufficient for T-136 completion.

## Current checkpoint — revision 11 caller-identity qualification failure

- Attempt-9 package `sha256:d811779dd4e568f3ee68acdab0356d900e9a10c5fdefb6966fbb8d5d0ace47b0` was eligible and exactly authorized. Preparation and all preflights were zero-effect.
- Exactly one controller `AssumeRole` succeeded at `2026-08-11T22:47:27Z`, request id `019FF302-6315-579E-A476-B36CF96577A9`, with a 3,600-second lifetime and expiration `2026-08-11T23:47:27Z`. The secret-free local integrity receipt passed before qualification.
- The sole qualification invocation completed one `GetCallerIdentity` read. Alibaba returned the canonical caller ARN form `acs:ram::1183869713036194:assumed-role/pea-m7-canary-controller/t136-p5-scifact-20260811-r11`; the qualifier incorrectly compared it with `acs:ram::1183869713036194:role/pea-m7-canary-controller/t136-p5-scifact-20260811-r11` and failed closed. `GetWorkspace=0`, `GetImage=0`, `CreateJob=0`, database writes `0` and capability changes `0`.
- No qualification record was written and live/close execute were not invoked. Credential bindings, clipboard and the provider result tab were cleared; Chrome control was finalized. A credential-free live offline preflight reconfirmed Attempts, Results, validations, REUs and undelivered outboxes all zero.
- Current authority booleans are false and revision 11 is non-retryable. Automation `t-136-r11-sts` is durably scheduled for 07:48:30 Asia/Shanghai to perform only the time-based expiry and credential-free zero-effect audit, then delete itself. `M0-SCI` remains not passed.
- Local correction is complete: the qualification runner and durable qualification validator share `buildScientificEvidenceP5AssumedRoleSessionArn()`, which parses the frozen source role and constructs exactly one `assumed-role/<role>/<session>` identity. Strict backend/script typechecks, the 10-case qualification suite and the 41-case focused P5 regression lane pass without external state.
- Final revision-11 safety audit passed at `2026-08-11T23:48:52.629Z`: the non-secret expiration `2026-08-11T23:47:27Z` was 85 seconds in the past. Credential/capability environment and profile checks remained clean, the qualification record remained absent and the credential-free live preflight preserved zero Attempts, Results, validations, REUs and undelivered outboxes.

## Current checkpoint — revision 4 timing closure

- Revision 4 replaces the failed revision-3 shared issuance/qualification cutoff with one deterministic event-driven operational timeline. The user assigns only one canonical UTC start; the package builder derives every other deadline and capability phase.
- The derived timeline reserves 30 seconds for the one `AssumeRole` dispatch, 300 seconds for qualification and live handoff, requires at least 3,300 seconds of credential life at live start, stops all credential-bearing operations 360 seconds before the earliest possible expiration and gives credential-free closure its own 90-minute local window.
- Assignment authority is explicit: the user assigns the canonical start; the package builder assigns derived deadlines and hashes; Alibaba STS assigns actual issue/expiration/request metadata; the qualification service assigns the same-credential read-only qualification record; the live runner owns only the first three EF capability variables; cleanup destroys credential material; the credential-free close runner owns only the PI closure capability.
- Revision-3 manifests remain immutable historical failure evidence. The active workload profile points to revision 4 with no current package hash, no acceptance record and both paid execution and capability enablement unauthorized. The next attempt is `t136-p5-scifact-attempt-2`.
- No exact revision-4 package is retained before the user selects the canonical start. A preparation dry run is non-authoritative and cannot be accepted or executed.
- P0-P4 remain `implementation_complete_unreleased`; P5 has no scientific effect and `M0-SCI` remains not passed.

### Materialized revision-4 package

- Canonical start: `2026-08-10T23:00:00.000Z` / `2026-08-11 07:00:00` Asia/Shanghai.
- Package: `sha256:47260f21c7d42d4a57d70ba627bed35888eb4f4d91c8f0ca7a4a67e1a0787a4c`.
- Authority snapshot: `sha256:248e6ef81b2d489b2025627ffc3f469b1a11e8adcfb8d97958bab917a4bc7b76`.
- Eligibility record: `sha256:d4311a9075ec38cdd847abf4136debf2b32531e6017d84b35af5515523867179`; status `eligible`, reason codes empty.
- Session policy: `sha256:435276581088d841e16e45b214f65ff2e4239dd3da2f5d35c06975a2fc2d2e67`.
- Authorization status: `expired_without_execution_automation_not_persisted`; the prior acceptance is historical evidence only. Both `CreateJob` and capability authorization projections are false.
- Active projection: revision 7 is terminal `expired_without_issuance_confirmation_overran_dispatch_cutoff`; its acceptance ref is null and both paid/capability authority projections are false. Revision-5 and revision-6 packages remain immutable historical failure evidence and carry no resumable authority.

## Current checkpoint — revision 7 confirmation cutoff

- The visibly logged-in Chrome session identified the exact source principal as `acs:ram::1183869713036194:user/user_0002`. One pre-package read-only `GetRole` diagnostic returned request id `019FF126-8070-53B7-AE84-22A31AC03215` and confirmed that `pea-m7-canary-controller` trusts that RAM user; it made no RAM change.
- The system-timed builder created eligible attempt-5 package `sha256:723551a6005c88bc405a6bfd4e9490d4cce339283a3967c390c512fba4217cdb`, authority snapshot `sha256:6c7064529efe8ec639e17cc2a711d03258a877604d459fba40865d328f706563` and eligibility record `sha256:336d58faabe96df0df09d6eef7e8abe92acb98231efda0cbd2b09169b66ed7cb`. The exact authorization text is 1217 UTF-8 bytes with digest `sha256:dc3d7020d7a17c0fb7b01af055b900ba60c78dd4bea57def6b551be42ac57bee`.
- The first portal action at `2026-08-11T14:19:33.100Z` only opened Alibaba's additional safety-confirmation dialog. The local confirmation guard ran at `2026-08-11T14:19:59.239Z`, 12.697 seconds after the immutable `2026-08-11T14:19:46.542Z` dispatch cutoff, and rejected the final click. The dialog was cancelled; the result pane remained empty and no credential value entered memory.
- Revision 7 is terminal `expired_without_issuance_confirmation_overran_dispatch_cutoff`. `authorization-acceptance-v7.json` and `credential-qualification-v1.json` do not exist; paid execution and capability authority remain false.
- Credential-free qualification and live offline preflights pass. They report qualification record absent, Attempts `0`, scientific Results `0`, validations `0`, REUs `0`, undelivered integration outboxes `0`, credential reads `0`, runner cloud calls `0`, database writes `0` and capability changes `0`. Final paid accounting is AssumeRole `0`, qualification reads `0`, `CreateJob=0`, cost CNY `0`; `M0-SCI` remains not passed.

## Current checkpoint — revision 8 qualification failure

- Revision 8 introduced and enforced a 120-second portal-confirmation-start margin in `ScientificEvidenceP5OperationalTimeline@v3`. The eligible attempt-6 package and exact acceptance were materialized before the portal action; preparation effects were all zero.
- Exactly one authorized controller `AssumeRole` succeeded at `2026-08-11T14:42:45.000Z`, request id `019FF146-A180-5EB6-9CCB-0A073A0A80F8`, for the exact r8 session ARN. Its recorded expiration is `2026-08-11T15:42:45Z`, exactly 3,600 seconds later.
- Qualification used the same bounded-process credential with all four capabilities absent. Its first and only cloud read, `GetCallerIdentity`, failed with `InvalidSecurityToken.Malformed`; `GetWorkspace=0`, `GetImage=0`, `CreateJob=0`, provider writes `0`, database writes `0` and capability changes `0`. No qualification record exists.
- Credential values were cleared, the portal response was removed, Chrome control was finalized and the persistent Node kernel was reset. No Alibaba/capability environment key, local credential-profile modification or T-136 runner process remains.
- A credential-free live offline preflight passes for the exact revision-8 package with Attempts, Results, validations, REUs and undelivered integration outboxes all zero. Live and close execute were not invoked; cost is CNY `0`, scientific database rows are `0`, and `M0-SCI` remains not passed.
- Generated heartbeat `t-136-r8-sts` is API-visible and durably stored for 23:43 Asia/Shanghai. It is limited to the post-expiration, no-credential time/absence/preflight audit and must remove itself after updating the terminal record.
- Final expiration audit passed at `2026-08-11T15:44:15.852Z`: expiration `2026-08-11T15:42:45Z` was 90 seconds in the past, local credential/capability/process/output absence checks passed and the exact-package live offline preflight remained all-zero. Heartbeat `t-136-r8-sts` has no remaining work and is removed after the terminal documentation update.

## Current checkpoint — revision 9 pre-issuance portal failure

- The attended builder materialized eligible attempt-7 package `sha256:3aa7489828bdf8399b7bcf1fbe837922b4ceb252cc1bc9461aeb5e489f7b6abd`, authority snapshot `sha256:0ac4685c998ae04a117d74ea9d6bc10368e7af483782c7ed53eefc085e1978b9`, eligibility record `sha256:2f21775469810a3a036e3272ea2563fb72ec7150a68a52248a4f0e2206cf4204` and session policy `sha256:469e947ac95c1cee719e14a28bd9ce14941ed8328645dcf270c8d1468a47251d`. Preparation performed zero credential reads, cloud calls, database writes, capability changes or `CreateJob` calls.
- Exact acceptance `authorization-acceptance-v9.json` binds the 2,107-byte authorization text digest `sha256:d4cd734a56115ece17ab15b302365d54f4122cdd87e6c0d74ae3b42af044312e`, the r9 session name, exact 3,600-second TTL, two-Job/CNY50 ceiling, local integrity receipt and no-RAM-mutation boundary.
- Chrome visibly confirmed `RAM user_0002` under master account `1183869713036194`. The stale pre-login tab first returned the provider's RAM-only warning with an empty result pane. After reload, the provider form rejected the programmatic Duration value as non-numeric, cleared the Policy control and reported that the controller role's trust policy did not contain the current caller. No RequestId, STS fields or call result appeared; no credential entered local memory.
- Revision 9 is terminal `failed_before_issuance_portal_trust_validation_without_paid_execution`. `AssumeRole=0`, qualification reads `0`, `CreateJob=0`, paid cost CNY `0`, scientific database rows `0` and capability changes `0`; qualification/live/close execute did not run and `M0-SCI` remains not passed.
- A credential-free live offline preflight against the exact revision-9 package passes with Attempts, Results, validations, REUs and undelivered integration outboxes all zero. The qualification record is absent, current execution/capability authority is false, and revision 9 must not be retried or reused.

## Current checkpoint — revision 10 readiness diagnostic

- The exact 1,270-byte diagnostic authorization digest is `sha256:296a3ba612b5aa7ec925e6e4c145f2c2d7868c423aa720f7454e164a22b0e3db`. It allowed one `Ram.GetRole`, one no-submit form rehearsal and no other cloud/product effect.
- Chrome visibly reconfirmed `RAM user_0002`. The one authorized `GetRole` succeeded with request id `019FF1A3-0E60-5EF9-9205-F4F548B9E081`, exact controller role, `MaxSessionDuration=3600`, exact user principal and `sts:AssumeRole` Allow. Canonical live trust hash is `sha256:46c14313b4a48378129637fa28153ff640abc81b7d317d784e8c2c6ef25ad257`, exactly matching the frozen package value.
- A new no-submit AssumeRole page loaded Duration, complete attempt-7 session policy, controller ARN and readiness session name entirely through encoded URL parameters. Stable visible controls retained numeric Duration, exact Policy/role/session values and two empty optional fields; the result pane remained empty and no dialog opened.
- The portal still displayed its trust warning even though the authoritative `GetRole` result proved the exact live trust. Therefore that warning is a non-authoritative client validation signal and must not be used as an issuance or drift fact. Future readiness relies on the exact principal plus successful live `GetRole` hash comparison, while provider dispatch still requires a real RequestId/response.
- Diagnostic accounting is `GetRole=1`, `AssumeRole=0`, STS `0`, qualification reads `0`, `CreateJob=0`, paid cost CNY `0`, database writes `0` and capability changes `0`. The temporary response body and clipboard were cleared; only non-secret hashes, booleans and RequestId remain.

## Current checkpoint — revision 12 workspace qualification failure

- Revision 12 / attempt 10 materialized eligible package `sha256:6a0ec49d55627209fd457a9e14baec7ffc9ddbdf75d4296ce87edc0cb52bdefa`, authority snapshot `sha256:876dd3af751c9b21069219071be576c4b63395b0ec133d333b1a7d27c9a84141` and eligibility record `sha256:c645d080c7372643ecfd13b4102999dac3a1d7723ae14f8171e57adeb23be700`. Exact acceptance binds the 2,627-byte authorization digest `sha256:8ce1c0c629d2eb3d3c9e7e11a14e745ad9bccee6bb47cae8bdc1523c444d83bb` and session-policy hash `sha256:8fad8c09231fbfe88276c75c93993c9265b11a080bdc47ba460c1801f26e828f`.
- Exactly one `AssumeRole` succeeded at `2026-08-12T00:00:48.000Z`, request id `019FF345-8A4A-5220-97C0-321AA2B3EBE4`, with automatic expiration `2026-08-12T01:00:48Z`. RAM roles, trust and policies were not changed.
- The portal's visible Monaco text represented the security token with an ellipsis. The first local integrity invocation failed with `T136_P5_CREDENTIAL_SECURITY_TOKEN_FORMAT_INVALID`. The complete editor selection was then read, the clipboard was immediately emptied, and a second local invocation produced a valid secret-free receipt. Continuing after the first failure violated the exact no-retry sequence even though both invocations were local-only and zero-effect.
- The sole qualification invocation made `GetCallerIdentity=1` and `GetWorkspace=1`. Caller identity passed the corrected canonical assumed-role comparison. `GetWorkspace` returned HTTP 200 but the typed SDK body had `workspaceId=undefined`, so exact workspace equality failed; `GetImage=0`. No qualification record was written.
- Live and close execute were not invoked. `CreateJob=0`, provider writes `0`, database writes `0`, capability changes `0`, cost CNY `0`, scientific database rows `0`; Attempts, Results, validations, REUs and undelivered outboxes remain zero. Current paid and capability authority projections are false and `M0-SCI` remains not passed.
- Credentials and response buffers were cleared from the persistent process, the temporary clipboard was verified empty, the result page was replaced with the STS product page and Chrome control was finalized. No Alibaba credential variable, P5 capability variable, runner process, qualification/live/close output or post-issuance local Alibaba profile modification remains.
- Final expiration audit passed at `2026-08-12T01:01:42.479Z`: recorded expiration `2026-08-12T01:00:48Z` was 54 seconds in the past. Credential/capability environment, `.env.local`, T-136 runner-process and qualification/live/close-output absence checks passed; the exact-package credential-free live offline preflight preserved zero Attempts, Results, validations, REUs and undelivered outboxes. Heartbeat `t-136-revision-12-sts-expiry-audit` has no remaining work and is removed after this update.
