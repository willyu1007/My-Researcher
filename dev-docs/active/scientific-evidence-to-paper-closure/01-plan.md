# T-136 Scientific Evidence to Paper Closure — Plan

## Phase order

1. P0 authority census and contract freeze.
2. P1 real scientific result envelope.
3. P2 product validation intake and EF→PI evidence relay.
4. P3 PI scientific ValidationCycle closure.
5. P4 post-closure ResultInterpretationPacket and Claim/Dossier integration.
6. P5 separately authorized real two-cell end-to-end acceptance and closeout.

No implementation phase may skip the preceding authority/acceptance gate. P5 cloud execution is not authorized by approving P0-P4 code work.

P0-P4 completion establishes only `implementation_complete_unreleased`: T-136 remains open, `M0-SCI` remains not passed and the affected scientific capabilities remain default-off. Other M0 modules may continue independent development/preview. Only a passing P5 acceptance makes T-136 eligible for completion and records `M0-SCI: passed`; P5 passage does not automatically enable runtime flags.

## P0 — Authority census and contract freeze

### Steps

1. Census every current producer/consumer for `ProvisionalOutputV2`, `ExperimentResultCellV2`, `ScientificValidationReportV2`, `EvidenceCandidateQualified`, PI v2 REU, ResultAnalysis proposal, ValidationCycle closure and ResultInterpretationPacket.
2. Freeze one sole-writer/reader/event matrix and identify all capability guards.
3. Freeze the server-generated scientific result semantic envelope and confirmed M-B2 source manifest: protocol-slot observation identity/order, metric/split/value/type/unit, strict statistic/uncertainty union, positive sample count, exact Collection/Attempt/ExecutionBundle/Run/Cell/TaskSpec/EvaluationProtocol lineage, provider-manifest/parser/result-schema/artifact binding and layered canonical hashes. `none` uncertainty is accepted only when the preregistered protocol marks uncertainty as not required. Freeze one canonical `scientific_result_manifest`/`scientific_source` per collection as the direct Result source.
4. Confirm by contract census that no manual/external result-import route exists or is introduced; external providers are execution adapters only when EF owns the exact Attempt lifecycle.
5. Freeze the product result command as identity-only and `recordExperimentResult`/`validateScientificBatch` as distinct EF domain actions. The observation-bearing current writer is internal-only and must be replaced or closed at the product boundary.
6. Freeze the preregistration rule: ordered cells, metric semantics, unit/aggregation, comparison direction, thresholds and exit rules are revisioned and hashed before Run submission; post-result changes require a new revision/new Run.
7. Freeze two independent state axes: EF evidence eligibility/comparison facts and PI contextual disposition. Under DISP-S, freeze one primary comparison plus three exit mappings pre-run and make relation → disposition → selected exit a deterministic server projection; Closure invocation is authorization, not another semantic input.
8. Decide how `ValidationCycleClosed` materializes the Packet and whether existing storage is sufficient.
9. Freeze P5-ELIG-S: deterministic preflight admits one new immutable two-cell Run with one declared differing factor, comparable execution/parser/metric semantics, exactly two EF-owned real-provider Jobs and no outcome target; exact provider/workload/cost values remain in a separately authorized hash-bound P5 package.
10. Freeze the assignment sequence: ExecutionBundle owns parser profile/result schema before Run submission; TaskSpec copies those bindings; transport fetches/base-validates canonical bytes; the worker parses outside the database transaction; collection atomically seals an optional scientific source; a separate post-commit identity-only command generates Result; batch validation and PI disposition follow later.
11. Record confirmed physical option DB-B. Result adds nullable migration-compatible `collectionAttemptId`, `sourceOutputId`, `sourceOutputHash`, `sourceOutputKind`, `sourceOutputClass`, `parserProfileVersion`, `parserProfileHash` and `derivationHash`; legacy `schemaVersion=v1` requires all eight fields null, while new `schemaVersion=v2` requires all eight fields and fixed scientific source kind/class. Add exact Result→Collection/Attempt and Result→source composite FKs, unique Collection/source ownership, one source per collection/kind and the conditional ProvisionalOutput kind/class/version CHECK. Historical rows receive no scientific backfill.
12. Freeze refined T-B: `collect()` alone returns one backend-internal strict success object containing the ordinary succeeded outcome plus a readonly validated canonical-envelope handoff. Keep `result_manifest_hash` only in the outcome; keep canonical JSON/content hash/byte size only in the handoff; do not extend shared normalized outcomes, DTOs, events or persistence.
13. Freeze field-level semantic ownership. EvaluationProtocol owns workload observation/artifact slots and comparison semantics; a versioned scientific result-schema registry owns structural shape; bundle authority freezes compatible parser/schema refs; TaskSpec only copies; parser only extracts drafts; sealer assigns protocol identity/order and source facts; collection code assigns operational row fields; Result service performs an exact projection and assigns derivation/Result facts.
14. Freeze deterministic output ordinals (`1=real_provider_result_envelope`, `2=scientific_result_manifest`) and a closed preparation/error model: `sealed | not_scientific` for expected parser outcomes, typed transient-only retries, stable durable reason codes and zero partial source on every failure.
15. Publish one invariant-freeze/late-binding ledger covering every decision above.

### Exit criteria

- One approved sequence/authority diagram and interface ledger exist in `02-architecture.md`.
- Every write is assigned to exactly one existing domain owner.
- Frozen scientific invariants and late-bound implementation/workload choices are explicit and non-overlapping.
- Protocol revision/hash binding occurs before Run submission; post-result mutation cannot change validation or conclusion authority.
- Product intake cannot carry metric values or observations; every Result has exact collected-output/parser/derivation provenance and typed summary semantics.
- Provider transport owns no scientific semantics, external I/O remains outside database transactions, and Result cannot precede committed source sealing.
- The refined T-B return is internal, immutable-by-shape and operation-specific; it introduces no nullable handoff member on non-collect outcomes and no duplicate provider-manifest field.
- Protocol, schema, parser, sealer, transaction and Result projection roles are non-overlapping at field level; every planned value has one origin and any copy is explicitly non-authoritative.
- Expected unsupported/incomplete parsing is data, not an exception; typed transient failures have bounded retry behavior, while deterministic invalid/conflict cases terminate under stable reason codes.
- EF eligibility does not encode hypothesis outcome; valid supporting, contradicting and indeterminate facts can all reach PI.
- Domain-action, capability and P5 workload-eligibility decisions are explicit. EF source migration, DB-B physical relational contract, statistic/uncertainty union, observation identity/order/hash layers, M-B2 manifest projection, transport-to-worker ephemeral handoff and P5-ELIG-S preflight/authorization boundary are fixed; exact P5 parameters remain intentionally late-bound.
- No code/config/database/cloud change has occurred.

## P1 — Real scientific result envelope

### Steps

1. Specialize only `collect()` to return backend-internal `RealProviderCollectSuccessV2`. Its strict normalized outcome carries the sole `result_manifest_hash`; its readonly `ValidatedProviderResultEnvelope` carries canonical envelope JSON, content hash and UTF-8 byte size. Keep the transport limited to one fetch, envelope/lineage/parser-binding validation and provider-manifest hashing.
2. Keep the ephemeral handoff internal to transport→worker orchestration: do not add the handoff to a controller/product DTO, persist the raw provider layout as scientific evidence or retain provider locators/credentials. The worker must not refetch the provider result.
3. Branch the worker on `collect` before transport dispatch, then load the exact frozen ExecutionBundle, Run/RunCell, TrainingTaskSpec and EvaluationProtocol revision. Recompute canonical-envelope byte size/content hash, compare every M-B2 lineage/parser/result-schema binding and reject any handoff drift before source preparation. Do not make `validated_result` optional on the shared outcome.
4. Add a provider-independent `ScientificSourceParser` invoked by the worker while canonical bytes are still in memory. EvaluationProtocol supplies workload slots/expectations; the structural result-schema registry supplies generic types; the parser emits only keyed observation/artifact drafts and performs no persistence, identity allocation, protocol admission or canonical hashing.
5. Add a pure source sealer that exact-matches protocol slots, assigns observation ids/order, canonicalizes the confirmed M-B2 manifest and server-generates the fixed kind/class, deterministic source id and `sourceOutputHash`. The sealer returns a source draft and performs no repository write.
6. Have collection orchestration assign deterministic output ordinals (`1` diagnostic, `2` optional scientific source), timestamps and collection/event state, then persist those rows plus idempotency/outbox state in one short repository transaction with no provider/network/parser call. Release the ephemeral envelope after preparation/commit.
7. Enforce a closed preparation/error model. Expected parser outcomes are `sealed` or `not_scientific`; unsupported/missing scientific fields use `not_scientific`, commit the valid collection plus diagnostics and create no source. Only explicitly typed transient reader/repository errors release for bounded retry; invalid/binding/handoff/conflict failures use stable nonretryable reason codes. No exception path may leave a partially authoritative source or an implicitly abandoned claimed command.
8. Add a separate post-commit identity-only result-generation command accepting only `runCellId`, `scientificSourceOutputId` and idempotency identity. The command reloads the exact committed source/collection/Attempt/Run chain and does not accept observation arrays or values.
9. Bind every Result directly to one canonical scientific source plus exact Run, manifest, ordered cell, TrainingTaskSpec, succeeded real-provider Attempt, parser profile and derivation identity. Result service copies sealed typed observations exactly, assigns only the B2 projection, derivation identity and Result identity/content hash, and cannot reinterpret metric values.
10. Match parser output exactly once to each preregistered observation slot, ignore parser order, sort by protocol `ordinal` and derive observation id from the RunCell, protocol revision hash and `observationKey`. Implement the strict statistic/uncertainty variants and keep large raw samples under independently ordered artifact keys.
11. Reuse the EF scientific validation service as the sole Result persistence authority, but remove or seal any product path that can call the observation-bearing writer with caller values.
12. Preserve domain-separated provider-manifest, scientific-source, derivation and Result content hashes. Canonicalization uses stable object keys, protocol array order, finite numbers and `-0` normalization; runtime timestamps/retries/locators/idempotency keys are excluded.
13. Add transport/worker contract tests proving one fetch, strict collect-only handoff typing, one authoritative manifest hash, recomputed envelope byte/content identity, no provider semantic parsing, no raw-envelope persistence/response and no post-collection refetch.
14. Add negative tests for metric-bearing product requests, diagnostic-only-only collections, scientific parse failure, simulation/fake provenance, caller-authored values, external result files/run bundles, incomplete output, unexpected metrics/artifacts, source/parser/derivation drift and hash conflict.
15. Completed 2026-08-08: use the DB-SSOT workflow to implement confirmed DB-B and PKT-S as additive, version-gated fields, CHECKs, exact composite constraints and ownership fences. The repo migration passed disposable-PostgreSQL deployment, drift and relational assertions; named-local deploy remains separately approved.
16. Completed 2026-08-08: add and pass a disposable-PostgreSQL exact two-cell source-sealing/result-persistence lane with identical replay, zero affected-path skips and explicit deployment evidence for both the Pack C and T-136 migrations.

### Implementation status — 2026-08-08

- Implemented: steps 1-16, including the collect-only internal handoff, one-fetch transport behavior, scientific protocol/result-schema bindings, structural registry, parser, pure sealer, deterministic identities/order/hashes, atomic `1=diagnostic`/`2=scientific_source` commit, source-bound Prisma mapping, identity-only Result generation and disposable relational persistence/replay.
- Implemented with default-off compatibility: step 11 seals the caller-authored observation writer in product composition while retaining an explicit test/migration-only enablement for the legacy v1 validation fixtures.
- Verified: step 14 covers reader retry taxonomy, binding/handoff drift, diagnostic-only fallback, parser order normalization, two-cell replay, caller-value rejection, source commit ordering and database source-contract rejection. The affected disposable lane executes with zero skips.
- Completion checkpoint: P1 is implementation-complete and remains unreleased/default-off. The controlled-concurrency backend suite passed 2467/2467 executed tests with 68 documented conditional skips; P2 owns the explicit validation-reader cutover to source-bound Result v2.

### Exit criteria

- An identity-only real-provider-shaped fixture creates two immutable, source-bound result cells and replay is identical.
- Scientific parse succeeds before source sealing; Result generation occurs only after source commit and directly rereads the sealed source chain.
- A successful collection processing attempt performs one provider fetch. The validated canonical envelope exists only in the internal transport→worker lifetime, its hash agrees with the persisted upstream binding and parsing/Result generation perform no extra fetch. A crash before source commit may repeat the collection fetch under existing idempotency, but changed canonical content conflicts.
- Transport tests prove that provider adapters perform base validation only; scientific slot/statistic/uncertainty interpretation occurs only in `ScientificSourceParser`.
- Assignment tests prove that parser drafts contain no source/Result ids or hashes, sealer performs no persistence, collection uses fixed output ordinals and Result projection is byte-for-byte value preserving.
- Failure tests prove every reader/preparation/commit variant reaches exactly one of retry, failed collection or collected diagnostic-only, with zero partial source and no command left dependent on lease expiry for ordinary recovery.
- Every non-evidence provenance and drift case performs zero scientific writes.
- Valid but scientifically unsupported collection preserves its diagnostic truth while creating zero scientific-source/result rows.
- External/manual results are rejected before scientific persistence; no import-shaped API is exposed.
- Product/controller requests cannot express metric values, observations or conclusions.
- Raw samples remain hash-bound artifacts; stored summaries contain no raw provider payload or generic metadata bag.
- Under confirmed ART-B, artifact refs prove exact controlled-run declaration and source-hash sealing only. P1 performs no independent artifact-byte fetch/verification, and no M0-SCI v1 conclusion may depend on unfetched bytes.
- Existing provider-control and diagnostic-output behavior is unchanged.

## P2 — Product validation intake and EF→PI relay

### Steps

1. Add the Phase 0-approved controller/route or command boundary for result intake and complete-batch validation.
2. Keep `EXPERIMENT_FOUNDATION_V2_SCIENTIFIC_VALIDATION_ENABLED` default false and require committed v2 cutover.
3. Run `validateScientificBatch` only after the exact ordered result set is complete.
4. Keep validation eligibility limited to integrity/provenance/completeness/protocol support and emit confirmed CMP-B1 ordered two-cell absolute-difference facts under preregistered non-overlapping decision bands separately from status.
5. Preserve atomic validation report, eligible candidate and outbox creation for every valid supporting, contradicting or indeterminate outcome.
6. Drive the existing integration relay and PI Evidence Trust Gateway; do not add a parallel ingestion path.
7. Add operator-visible status/reason reporting with redacted provider diagnostics.
8. Prove replay, terminal rejection and crash recovery in disposable PostgreSQL.

### Implementation status — 2026-08-08

- Implemented: steps 1-7. The product API exposes identity-only Result generation, complete-batch validation and durable report reads; request schemas and pre-validation reject caller scientific values instead of silently stripping them.
- Implemented: validation product composition reads only exact `schemaVersion=v2` source-bound Results, rechecks the frozen EvaluationProtocol tuple and complete ordered RunCell set, and requires a non-empty CMP-B1 contract. Legacy Result v1 validation is reachable only through the explicit test/migration compatibility option.
- Implemented: CMP-B1 facts cover the exact rule projection, Result/observation refs and hashes, raw point/range, one relation/reason and deterministic identity/hash. Eligibility remains independent: valid support, contradiction and indeterminate facts all create Candidate/outbox state; missing/mismatched required CI produces a failed report with no Candidate.
- Implemented after quality review: scientific artifact slots explicitly bind one `artifact_key` to a required artifact rule id or `null` trace-only semantics. Freeze/source/product checks enforce rule kind, cardinality and parser-profile admission; rule execution no longer compares `artifact_key` with legacy `file_name`.
- Implemented after quality review: every new scientific protocol freezes one primary comparison plus all three DISP-S exit keys. Historical snapshots remain schema-readable, but missing fields fail product validation before Candidate creation.
- Implemented: the existing `EvidenceCandidateQualified` outbox and PI Evidence Trust Gateway create exactly one REU, trace manifest and `RunEvidenceUnitRegistered` outbox; replay converges and terminal authority/hash drift remains fail-closed.
- Verified: step 8 reuses the existing atomic rollback/replay coverage and adds fresh disposable PostgreSQL Pack C `packc-ef-20260808-r5`; 119/119 tests passed with zero failures/skips/blocks, including OpenAPI route coverage and protocol-freeze negatives. The identity-marked database was removed, and no named-local/cloud/provider/capability state changed.
- Completion checkpoint: P2 is implementation-complete, unreleased and default-off. P3 is complete and P4 is next; only P5 may record `M0-SCI: passed`.

### Exit criteria

- One passed batch creates one Candidate, one PI REU, one trace manifest and one `RunEvidenceUnitRegistered` event.
- Failed/unsupported/incomplete validation creates no eligible Candidate or REU.
- Valid negative and indeterminate comparison outcomes create the same eligible Candidate/REU chain as valid supporting outcomes; EF writes no PI disposition.
- Comparison facts bind exact protocol/rule and observation refs/hashes, use one closed M0-SCI v1 effect kind and cannot contain hypothesis prose, disposition or selected-exit fields.
- CMP-B1 tests cover higher/lower directions, point-estimate decision gaps, conservative CI support/contradiction/indeterminate outcomes, missing/mismatched required-CI rejection and relation/reason/hash replay.
- Relay replay creates no duplicate inbox, REU, trace or outbox record.

## P3 — PI scientific ValidationCycle closure

### Steps

1. Implement confirmed DISP-S by versioning the admitted ResultAnalysis final artifact to one exact-hash contextual proposal and keeping legacy multi-scenario artifacts ineligible for scientific closure.
2. Remove direct corrected-disposition/review-choice input; the identity/CAS/proposal-only close command is the authorization action, and the server derives scientific disposition and selected exit from the unique primary CMP-B1 relation.
3. Extend `PaperImplementationValidationCycleClosureV2Service` for `scientific_evidence_assessed` without weakening `control_only_no_evidence`.
4. Re-evaluate the D-18 current-effective watermark in the closure transaction and CAS the Cycle version.
5. Persist one immutable closure and emit one `ValidationCycleClosed@v1` event.
6. Add positive, negative, inconclusive, absent/duplicate-primary, caller-authority, stale proposal/head, active-attempt, conflicting replay and concurrent-close tests.
7. Preserve default-false `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED` rollout.

### Implementation status — 2026-08-08

- Implemented: the public ResultAnalysis request accepts only `PaperImplementationScientificClosureIntent@v1` with the expected Cycle watermark. A server-side resolver builds the factual context from the local authority store before the model call; callers cannot submit scientific facts or source bodies. The versioned proposal binds the target Cycle, current closure watermark, one primary fact and exact ordered REU id/hash set.
- Implemented: scientific proposals are Closure-eligible only when the final runtime envelope is canonically hash-valid, ran as `product` + `provider_llm` and has exactly one internally consistent admission under `paper-implementation.result_analysis.interpretation_scenarios.final-admission@v1`. Acceptance/Codex/mocked/generic-policy artifacts remain usable for their existing purposes but cannot authorize scientific Closure.
- Implemented: the close request is identity/CAS/proposal-only. `corrected_scientific_disposition` and every accept/correct/downgrade/review-choice seam are absent from the shared schema, service and OpenAPI contract.
- Implemented: the existing closure service supports both closure kinds under the same default-off capability. In one serializable transaction it recomputes D-18 readiness, rereads the sole admitted proposal and batch-loads exact REUs/reports/protocols. Every REU, report, protocol and primary fact is canonically rehashed and the report Run binding is checked before DISP-S commits the immutable Closure, product Cycle completion and one `ValidationCycleClosed@v1` outbox.
- Implemented: scientific Closure authority is stored inside the existing hash-bound closure JSON snapshot, so no new closure table, data column or migration was introduced. Legacy/control closure hashes retain their exact historical profile.
- Verified: all three relation→disposition→exit projections pass; missing/duplicate primary fact, stale watermark/proposal, changed replay, active Attempt and caller-authority inputs fail closed. Control-only closure and existing writer seals remain green.
- Hardened: scientific ResultAnalysis canonicalizes semantic Cycle aliases to `validation_cycle` while preserving `target_ref.version_id` independently from runtime `target_version_id`. Closure accepts the normalized semantic aliases and compares admission target versions only to the admitted `target_ref` version.
- Hardened: Closure reconstructs the official final-admission identity from the runtime envelope and exhaustively reconciles row, payload, identity, refs, schemas, issues and warnings. A self-consistent or partially tampered admission copy cannot authorize Closure.
- Hardened: readiness failures map to stable 404/409 application errors; serializable context conflicts retry twice and then return a stable 409. Production `buildApp` HTTP tests prove authoritative scientific context on success and zero provider calls/runtime writes for a missing Cycle.
- Verified: disposable PostgreSQL Pack C-PI `packc-pi-20260808-r5` passed 151/151 across seven suites and 6/6 relational tests. The relational case traverses the actual ResultAnalysis service→official admission→REU/report/protocol/primary fact→scientific Closure/outbox path, rejects generic policy, admission-payload schema tampering and unchanged-hash REU drift with zero Closure writes, accepts aliased Cycle input with distinct domain/runtime versions, and proves exact replay. The nonce-bound database/container was removed.
- Completion checkpoint: P3 is implementation-complete, verified, unreleased and default-off. P4 is next; only P5 may record `M0-SCI: passed`.

### Exit criteria

- All three scientific dispositions close through the same authority service.
- Caller-authored conclusion/exit and stale/current-scope drift are structurally or transactionally impossible.
- No review choice or correction field exists. A caller either invokes the exact Closure command or leaves the Cycle open; corrected facts/protocol require a new revision and Run.
- Control-only closure and existing seals remain green.

## P4 — ResultInterpretationPacket and paper artifacts

### Steps

1. Implement a sole `ValidationCycleClosed` consumer/materializer for ResultInterpretationPacket; compose the materializer with the existing semantic projection consumer and acknowledge only after both idempotent consumers succeed.
2. Assemble and hash Packet-owned structure outside the write transaction from the immutable Closure snapshot, accepted ResultAnalysis proposal and trusted REU/trace/comparison refs; conclusion fields remain Closure-owned.
3. Keep direct/pre-closure Packet creation rejected.
4. Implement confirmed PKT-S with only `schemaVersion`, `closureId`, `closureSnapshotHash` and `packetContentHash`, an exact Closure tuple FK, unique Closure ownership and a short insert-or-identical-return/conflict transaction.
5. Update ClaimCandidate and Dossier creation/readiness to consume only the closed Packet path.
6. Preserve project-wide failed/cancelled/negative/inconclusive accounting and closed-Cycle write seals.
7. Add event replay, transaction drift, duplicate Packet, missing evidence and project accounting tests.

### Verification checkpoint — completed 2026-08-08

- Implemented one composed `ValidationCycleClosed@v1` consumer: semantic projection runs first, Packet materialization second, and the relay marks delivery only after both succeed. Partial success converges through existing projection inbox idempotency plus Packet replay.
- Packet v2 is assembled outside the write transaction from the exact stored Closure, official admitted ResultAnalysis proposal, canonically revalidated REUs/reports/protocol/comparison facts and complete evidence traces. The write transaction rereads the exact Closure tuple and inserts once, returns identical content or conflicts.
- Claim/Dossier creation now requires the server-side closed Packet view. Legacy Packets remain readable history only; Claim strength is capped by the accepted proposal and ready Dossiers preserve exact Closure and adverse-result accounting.
- Node 20 shared/backend strict typechecks, shared schemas, Packet/Claim/repository/relay units, Closure/contract regressions and full PaperImplementation route integration pass.
- Disposable PostgreSQL gate `packc-pi-20260808-r8` passed 193/193 across eight suites with zero skips/blocks; relational passed 6/6 and the identity-marked database was cleaned up. Canonical digest: `sha256:4925fe76fccfae97dabbdb230ab7af28df44f605c48d3dbf7718f30e69bc7e05`.
- Completion checkpoint: P0-P4 is `implementation_complete_unreleased`. T-136 remains open, scientific capabilities remain default-off and only the separately authorized P5 acceptance may record `M0-SCI: passed`.

### Exit criteria

- One scientific Closure event produces exactly one Packet bound by exact Closure and Packet hashes; proposal/disposition/exit remain transitively bound through the Closure snapshot rather than copied columns.
- Legacy Packet rows remain readable but cannot enter the new scientific Claim/Dossier path; no second Packet table or distributed transaction is added.
- Claims and Dossier cannot omit required evidence states or consume a pre-closure proposal as fact.
- Repair can replay the durable closure event without mutating the closure.

## P5 — Real two-cell end-to-end acceptance

### Preconditions

- P0-P4 automated and disposable-PostgreSQL gates pass with zero affected-path skips.
- A deterministic P5-ELIG-S preflight passes for one exact canonical package hash; there is no manual eligibility override.
- The user explicitly authorizes that exact package hash, exactly two paid `CreateJob` operations, cost ceiling/currency, capability set, bounded window and credential handling.
- A reviewed backup/recovery point exists for any named-local database change.
- The workload produces protocol-required scientific observations and does not rely on injected paper numbers.
- The exact WorkOrder/EvaluationProtocol revision, ordered cells, metrics, thresholds, directions and exit rules are frozen and hashed before either provider Job is submitted.
- The two ordered cells differ in exactly one declared experimental factor and otherwise use identical or hash-equivalent comparison-critical inputs, execution collection path, parser version, metric semantics, unit and aggregation.

### Steps

1. Materialize a new PI-bound WorkOrder revision and immutable two-cell EF Run, then build the exact hash-bound P5 execution package with provider/runtime/assets/parameters, capability keys, operation/cost ceilings, credential reference and named-local recovery fingerprint.
2. Run deterministic eligibility preflight, obtain user authorization for the exact package hash and open only the listed process-scoped real-provider intake/control capabilities for the bounded window.
3. Submit and collect exactly two real PAI Jobs; verify provider, Run, cell, TaskSpec, parser and artifact identity.
4. Open scientific validation intake, record both result cells, validate the batch and drain EF→PI evidence events.
5. Run ResultAnalysis, explicitly authorize the identity-only Closure command, verify deterministic primary-relation disposition/exit derivation and drain the Packet event.
6. Build/read Claim and Dossier and verify complete evidence accounting.
7. Replay every idempotent operation and prove zero duplicates.
8. Close capabilities, remove short-lived credential material and record provider/database/cost/protected-table censuses.
9. If either Job fails/cancels or the package drifts, fail this P5 attempt without resubmission; any replacement requires a new immutable Run/package hash and new authorization.

### Exit criteria

- The full WorkOrder-to-Dossier chain passes on new real scientific output.
- Exactly one authoritative conclusion and Packet exist for the Cycle.
- Supporting, contradicting and indeterminate outcomes are equally acceptable; `M0-SCI` measures real-chain integrity, not whether the scientific result matched a preferred hypothesis.
- Replay, cost, credential cleanup and rollback/recovery evidence are durable and reviewable.
- The acceptance record explicitly states `M0-SCI: passed`; T-136 is eligible for completion only at this point.

## Risks and mitigations

- Risk: treating collected diagnostics as scientific results.
  - Mitigation: a new typed result envelope, exact EvaluationProtocol membership and permanent negative-provenance tests.
- Risk: LLM or caller controls final scientific judgment.
  - Mitigation: proposal-only model path plus server-derived disposition/exit under D-18.
- Risk: partial or non-head evidence reaches PI.
  - Mitigation: complete ordered batch, head acknowledgement reread and Trust Gateway exact-hash checks.
- Risk: duplicate effects across outbox replay.
  - Mitigation: event/business idempotency, unique authority keys and relational concurrency tests.
- Risk: Packet materialization creates a second closure authority.
  - Mitigation: Packet is derived only from `ValidationCycleClosed` and never feeds back into closure identity.
- Risk: paid provider work begins during implementation testing.
  - Mitigation: real-provider P5 is a separate explicit authorization; all earlier gates use fixtures/disposable PostgreSQL.

## Definition of done

- All high-level acceptance criteria in `00-overview.md` are checked.
- P0-P5 decisions and changes are recorded in `03-implementation-notes.md`.
- Every verification command/result is recorded in `04-verification.md`.
- Resolved dead ends are appended to `05-pitfalls.md`.
- P0-P4 completion is recorded as `implementation_complete_unreleased`, never as task or gate completion.
- Project governance lint passes, `M0-SCI: passed` is evidenced, and the task is archived only after the real P5 acceptance.
