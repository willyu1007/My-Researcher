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

## Revision-15 terminal checkpoint and next sequence

- Completed: revision 15 / attempt 13 fresh recovery, eligible package `sha256:f393cab29c50bd950a2dd6171df82778b8004bf529011744a924a52bde0461cf`, exact acceptance, one 3,600-second controller STS, one successful local integrity stage and one completed three-call read-only qualification stage.
- Terminal result: live claimed once and failed before intake persistence because the attempt-scoped output prefix violated the payload service's exact regional `output/` root contract. The permanent live claim and terminal exist; live completion and close claim/output do not.
- Verified zero paid effect: both pure cell materializations fail before the repository persistence call. Attempts are zero, while provider `CreateJob` is reachable only by a later worker operating on persisted Attempts. `CreateJob=0`, paid cost CNY `0`, database/scientific/runtime/closure rows `0`, and persistent capability changes `0`.
- Completed immediate cleanup: the live child exited through `finally`; credential/receipt/response buffers are cleared, clipboard is empty, Chrome left the credential page and finalized, and current paid/capability authority is false.
- Pending safety closeout: treat the issued STS as provider-live until `2026-08-14T12:50:41Z`; after that timestamp, run the credential-free expiration/local-absence audit. Do not issue or reuse credentials before it expires.
- Current gate: revision 15 is terminal and cannot be retried. The next three actions are (1) verify expiry and local absence, (2) obtain explicit approval for a pure-local output-scope correction and add a payload-materialization preflight regression, then (3) pre-stage a successor package whose profile and session policy cover the same derived Run/Cell output paths. Any successor cloud call requires a fresh exact package authorization.

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

### Current P5 checkpoint — 2026-08-10

- Completed: versioned execution-package, named-local authority-snapshot and deterministic eligibility-record hashing; complete ExecutionBundle schema/canonical revalidation; exact two-cell/one-factor comparability; operation/cost/capability/credential/recovery and no-outcome-target guards.
- Completed: freeze and validate the SciFact workload, exact qrels/input identities, two ordered `retrieval_top_k` cells and the `micro_recall_ppm` observation contract. Full local execution is deterministic but explicitly non-evidence.
- Completed: create a reviewed repository-external named-local recovery set before any T-136 authority materialization. The recovery set contains full schema and scoped EF/PI authority data, not unrelated Literature payloads.
- Completed stage one: remotely verify the existing corpus/query objects, upload and read back the digest-addressed workload/qrels objects, freeze new T-136 policy/dataset/bundle authorities and materialize one WorkOrder/Run. The apply created exactly 146 rows, exact replay created zero and 217 protected tables remained unchanged. Historical T-132 diagnostic authority was not modified.
- Completed deterministic preflight: package `sha256:98674502814e052becd6f57e91817bca8ef90980cc621b244bb0013bc1c9f352` is eligible with zero reason codes and binds the exact Run, protocol, bundle, two cells, four capability keys, one-hour window and ¥50 total ceiling.
- Exact-package authorization received: on 2026-08-09 the user authorized package `sha256:98674502814e052becd6f57e91817bca8ef90980cc621b244bb0013bc1c9f352`, exactly two paid `CreateJob` operations, a ¥25-per-operation/¥50-total ceiling, the four listed process capabilities, the 2026-08-10 10:00-11:00 Asia/Shanghai window and the temporary-credential cleanup policy. The immutable preparation manifest remains a pre-authorization artifact; `authorization-acceptance-v1.json` is the sole authorization record. Steps 3-9 remain time-gated until the window opens.
- Credential cleanup clarification confirmed: Alibaba Cloud STS sessions cannot be individually revoked, so the user authorized a 3,600-second token issued at window start, immediate process/profile removal, automatic invalidation no later than 11:00 and an after-window expiry check. RAM role or policy mutation remains explicitly prohibited. Execution is now authorization-ready but remains time-gated.
- Window runner preparation complete: `scientific-evidence:p5:live` owns exactly two Jobs through scientific Result/validation/trusted REU and `scientific-evidence:p5:close` runs without Alibaba credentials to produce the registered OpenAI ResultAnalysis proposal, deterministic Closure and Packet. Both offline preflights and both outside-window guards pass. The current-task heartbeat starts read-only work at 06:55, waits until 07:00 for STS/cloud state, and preserves Claim/Dossier plus after-08:00 expiry verification as required remaining work.
- Window revision exactly authorized: on 2026-08-10 the user authorized eligible package `sha256:719fb5ab6384913b84b3de0ad3f3c6740fd31eed6ce3fceb95afaf86bb24b306` for 07:00-08:00 Asia/Shanghai. The 10:00-11:00 acceptance is `superseded_window_changed`; eligibility record `sha256:9b1c044d3d3ba249fb3b125ffa032427e06f377d13ed5c20f40a966aa9ad6738`, authority snapshot and every non-window package field remain unchanged. `authorization-acceptance-v2.json` is `authorized_pending_window`; cloud calls, writes, credentials and capability changes remain zero.
- Revision-3 credential correction: preserve package v2 as a closed zero-effect attempt. Introduce a versioned execution package that binds the existing controller role separately from the existing runtime role, hashes the controller trust/policy evidence and exact inline session policy, permits credential issuance only in a short window ending at execution start, requires at least 55 minutes of remaining TTL, and admits a separate qualification runner that calls only identity/read-only endpoints while every product capability remains false. One exact acceptance covers this conditional sequence; live paid execution additionally requires the hash-bound zero-`CreateJob` qualification record from the same temporary credential.
- Revision-3 execution closed fail-safe: one controller STS was issued at 08:27:23, but qualification reached its local issuance-window gate at 08:30:23 and stopped before all three read-only calls. No qualification record, paid Job, scientific row, capability change, replacement credential or close was produced. The credential was erased from the bounded process and local configuration remained unchanged. M0-SCI is still not passed; any further real attempt requires a fresh package/window authorization with an explicit secure-handoff margin.
- Revision-3 cleanup complete: at 09:30:54 the recorded 09:27:23 automatic expiration was 211 seconds in the past. The no-credential local checks and final live offline preflight passed with all P5 scientific/effect counts at zero. No revision-3 action remains; a future real attempt starts from a new package and authorization rather than resuming this window.

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

## Revision-4 execution plan checkpoint — 2026-08-10

- Completed: version the active execution package, eligibility record and authorization bindings so revision-3 artifacts can remain immutable history while active runners accept only revision-4 manifests.
- Completed: replace the shared five-minute cutoff with a deterministic timeline derived from one user-selected canonical UTC start: dispatch by `+30s`, qualification and latest live start by `+300s`, credential operations stop by `+3240s`, and credential-free close by `+5400s`.
- Completed: add injectable-clock guards for issuance dispatch, qualification, live start, credential-bearing operations and close; bind live to a passing same-credential qualification record and close to verified credential cleanup.
- Completed: move active ids and result-prefix scope to `t136-p5-scifact-attempt-2`; mark the workload profile `awaiting_exact_window_and_package`, with no paid or capability authority.
- Next decision: the user selects one exact future start. Preparation then creates one exact revision-4 package and reports its hash for a separate, exact authorization decision.
- After authorization only: dispatch one controller `AssumeRole` within 30 seconds of the selected start, qualify immediately, enter live on the same credential, clear credential material, run credential-free close, then complete Claim/Dossier, replay accounting and expiration verification. No package generation or prior authorization permits cloud execution.

### Revision-4 exact-package checkpoint

- Completed: user selected `2026-08-11 07:00:00` Asia/Shanghai, canonically stored as `2026-08-10T23:00:00.000Z`.
- Completed: write immutable `manifests/prepared-authorization-v4.json` for package `sha256:47260f21c7d42d4a57d70ba627bed35888eb4f4d91c8f0ca7a4a67e1a0787a4c`; eligibility is `eligible` with zero reason codes and a fresh rebuild returns the same three package/authority/eligibility hashes.
- Completed: qualification, live and close offline preflights pass with no credentials, cloud calls, database writes or capability changes. Existing Attempts, scientific Results, validations, REUs, runtime artifacts, Closures and Packets remain zero.
- Current gate: obtain exact user authorization for the newly known package hash and its operation/cost/capability/credential/cleanup boundaries. The user's start selection is recorded as schedule input only and is not treated as authorization.
- After exact acceptance: create `authorization-acceptance-v4.json`, rerun all zero-effect preflights and prepare the bounded continuation for the selected start. Do not issue STS or schedule cloud execution before this gate passes.

### Revision-4 authorization checkpoint

- Completed: record the exact 2428-byte authorization text as `sha256:3ba46547640b22bd6619e00f5b2b72d8ea0d32727d194475265a22f400a93c54` in `authorization-acceptance-v4.json`; the acceptance validator reconciles package, authority, eligibility, qualification, operations, cost, timeline, roles, session policy and cleanup confirmation.
- Completed: set the workload profile to `authorized_pending_issuance`, bind the revision-4 acceptance ref and record execution/capability authorization without enabling either. An idempotent package write verifies the same package and leaves the later acceptance-owned state unchanged.
- Completed: rerun qualification/live/close offline preflights after acceptance. All validate the exact package; qualification has no record, every actual effect count remains zero and close is waiting for real evidence.
- Completed: create one current-task heartbeat `t-136-p5-revision-4-execution` for 06:55 Asia/Shanghai. It performs only local/read-only checks before 07:00 and carries the exact hashes plus all execution, cleanup, expiration and no-RAM-mutation boundaries.
- Remaining authorized execution: within 07:00:00–07:00:30 issue the one controller STS, qualify on the same credential by 07:05, enter live immediately if qualified, stop credential operations by 07:54, clean credentials, complete credential-free close by 08:30, then finish Claim/Dossier/replay and expiration accounting. Any non-recoverable failure stops without replacement.

### Revision-4 scheduling failure checkpoint — 2026-08-11

- Closed fail-safe: the one-time heartbeat never persisted and therefore did not wake the task at 06:55. The authorized window expired without any execution-side effect; no late or catch-up execution is permitted.
- Verified: at 20:57 Asia/Shanghai the automation directory contained zero entries and retained its 2026-08-10 09:32 modification time. Codex system logging contained no automation/heartbeat registration or trigger event, and deletion of `t-136-p5-revision-4-execution` returned `not_found`.
- Verified: live/close offline preflight still reports Attempts, Results, validations, REUs, outboxes, runtime artifacts, Closures and Packets all zero. Local Alibaba/capability variables and the qualification record are absent.
- Corrective next step: select a new future start and build a new attempt/package. Create the next heartbeat without supplying a caller-chosen id, capture its generated id, verify it through the automation API and durable local record, and perform a harmless pre-window wakeup rehearsal before treating scheduling as ready.

### Revision-5 immediate-run preparation checkpoint — 2026-08-11

- Closed fail-safe: the confirmed 21:35 start passed while the independent revision-5 path was being prepared. Package `sha256:b16e49702b24e776fb84167bb1d78284e9a93837b00534ca4eaeec80136dd98f` completed at 21:36:53 with zero effects but was never presented or authorized for execution.
- Completed: generalize controller session-name validation so the canonical suffix is derived from the immutable attempt number (`revision = attempt + 2`) instead of hardcoding `r4`; historical attempt-2/r4 remains valid and attempt-3/r5 becomes deterministic.
- Completed: pre-stage active revision 6 / attempt 4, output prefix `attempt-4`, v6 prepared/acceptance paths and false authorization projections. Script typecheck and focused suites pass 24/24.
- Superseded: do not ask the user to select another absolute start. Revision 6 assigns its internal timeline when the immutable package is first written.

### Revision-6 system-assigned execution checkpoint — 2026-08-11

- Completed: add `ScientificEvidenceP5OperationalTimeline@v2`. First manifest creation assigns the internal UTC start once, permits AssumeRole dispatch for 600 seconds, requires qualification/live start by 900 seconds, stops credential operations at 3240 seconds and keeps credential-free close open through 5400 seconds. Rebuilds reuse the stored start and reproduce the same package.
- Completed: prepare eligible package `sha256:d7d6f5ed6684475be0ec94a8dfad87c27b52d433dd0285f2f295f91e5479abdf`, record the exact 1217-byte user authorization and bind `authorization-acceptance-v6.json` without credential material.
- Closed fail-safe: the Chrome OpenAPI session could not prove the authorized source principal. The portal returned no RequestId or credentials before the 21:59:25.532 issuance cutoff, so qualification, live and close were not entered.
- Verified: credential-free preflights report zero credential reads, cloud calls, `CreateJob`, database writes and capability changes; Attempts, scientific Results, validations, REUs and pending integration outboxes remain zero. `M0-SCI` is not passed.
- Next: authenticate Chrome visibly as `acs:ram::1183869713036194:user/user_0002` before package creation. Then allocate a new immutable revision/package, retain the system-assigned timeline, obtain exact hash-bound authorization and execute immediately. Do not reuse revision-6 authority or issue a late credential.

### Revision-7 portal-confirmation checkpoint — 2026-08-11

- Completed: visibly verify the exact `user_0002` source principal and controller-role trust before package creation; prepare eligible attempt-5 package `sha256:723551a6005c88bc405a6bfd4e9490d4cce339283a3967c390c512fba4217cdb` with all preparation effects zero.
- Completed: receive exact 1217-byte authorization with digest `sha256:dc3d7020d7a17c0fb7b01af055b900ba60c78dd4bea57def6b551be42ac57bee` and configure the exact role, r7 session name, 3600-second duration and hash-bound session policy in the logged-in portal.
- Closed fail-safe: the portal's first action opened a second safety-confirmation dialog at 22:19:33.100 Asia/Shanghai. The confirmation guard observed 22:19:59.239, after the 22:19:46.542 dispatch cutoff, so it did not confirm. The dialog was cancelled, the result pane stayed empty and no STS or RequestId was created.
- Verified: credential-free qualification/live preflights preserve all-zero qualification, Attempt, Result, validation, REU, outbox, credential, database-write, capability and paid-operation counts. `authorization-acceptance-v7.json` is intentionally absent because no executable acceptance transition was materialized before cutoff.
- Next: close revision 7 as terminal and version revision 8. Add a deterministic portal-confirmation start margin before the immutable dispatch cutoff; pre-stage the exact portal controls, and refuse to begin the two-step confirmation if the full margin is unavailable. Any real retry requires a new package hash and exact authorization.

### Revision-8 credential-qualification checkpoint — 2026-08-11

- Completed: implement `ScientificEvidenceP5OperationalTimeline@v3`, a 120-second confirmation-start margin and injectable guards; migrate active preparation/acceptance/runner bindings to revision 8 / attempt 6. Focused eligibility, authorization and timeline tests pass 32/32, strict backend typecheck and the experiment-script typecheck pass.
- Completed: prepare eligible package `sha256:e677596a212236c269273ea2d510278fa41a8edddd7a3f312849c0e85027d694`, record exact acceptance `authorization-acceptance-v8.json`, and preserve zero preparation effects before the portal call.
- Closed fail-safe: exactly one controller `AssumeRole` succeeded. Qualification stopped on its first `GetCallerIdentity` request with `InvalidSecurityToken.Malformed`; no qualification retry or replacement credential was permitted. `GetWorkspace`, `GetImage`, live, close execute and both planned Jobs were not entered.
- Verified: credential/browser/kernel cleanup completed; local Alibaba/capability keys and T-136 runner processes are absent; no credential profile changed. Credential-free live offline preflight reports Attempts, Results, validations, REUs and undelivered integration outboxes all zero. Final accounting is `AssumeRole=1`, qualification reads attempted `1`, `CreateJob=0`, cost CNY `0`, scientific database rows `0`; `M0-SCI` is not passed.
- Scheduled final safety step: generated and durably verified heartbeat `t-136-r8-sts` will run once at 23:43 Asia/Shanghai, after the recorded 23:42:45 expiration. It may use only current time and non-secret expiration metadata plus local absence/offline-preflight checks, then must delete itself.
- Completed final safety step: at `2026-08-11T15:44:15.852Z`, the non-secret expiration comparison proved the STS had expired for 90 seconds. Credential/capability variables, T-136 runner processes and qualification/live/close outputs remained absent; the credential-free live preflight preserved the zero-effect census. Delete `t-136-r8-sts`; revision 8 is fully terminal.
- Next: do not prepare or authorize revision 9 yet. First add a local, zero-cloud-call, zero-secret-output integrity validator for the extracted access-key id, secret and token representation; prove it catches truncation/whitespace/serialization drift before qualification. Then version a new package and obtain new exact authorization. Revision 8 is terminal and non-reusable.

### Post-revision-8 credential-integrity hardening — 2026-08-11

- Completed: add a pure credential-integrity service with exact environment reading, conflicting token-alias rejection, visible-ASCII/length/serialization guards, domain-separated tuple hashing and a strict receipt schema that cannot carry credential fields.
- Completed: add `scientific-evidence:p5:credential-integrity`. The local-only command emits one receipt plus explicit zero cloud/database/capability/config-write counts, clears its child-process material and writes no file. A malformed token exits with a stable local error code and zero external effects.
- Completed: require the exact receipt in qualification before `GetCallerIdentity` and in live before qualification-record binding or `CreateJob`. Both stages recompute lengths and the credential-tuple hash; any mismatch clears process material and fails closed.
- Verified: strict backend and experiment-script typechecks pass; the combined P5 eligibility/authorization/timeline/integrity lane passes 38/38. Positive CLI verification reports no credential values; the truncated-token CLI path fails locally with zero external effects. Qualification/live offline preflights remain credential-free and all-zero.
- Sequencing constraint: keep active v8 manifest paths until heartbeat `t-136-r8-sts` completes the 23:43 expiration audit. Revision 9 / attempt 7 may be pre-staged afterward, but its system-timed prepared package must not be written until the user is present to review and authorize the resulting hash.
- Sequencing constraint satisfied: the 23:43 audit passed and revision 8 is fully closed. The next implementation slice may switch active code paths to revision 9 / attempt 7, but must leave `prepared-authorization-v9.json` and its acceptance absent until an attended exact-package authorization sequence begins.

### Revision-9 pre-stage checkpoint — 2026-08-11

- Completed: switch active preparation/qualification/live/close refs to `prepared-authorization-v9.json` and `authorization-acceptance-v9.json`; set the immutable attempt identity to `t136-p5-scifact-attempt-7` and controller session suffix to r9.
- Completed: isolate provider output, live business keys and Closure idempotency under attempt 7. Revision-8 manifests, output identities and terminal accounting remain immutable history.
- Completed: move the workload profile to current revision 9 with null package/prepared/acceptance refs, `prepared_package_eligible=false`, both execution/capability authority booleans false and status `awaiting_revision_9_package_materialization`.
- Verified: strict backend and experiment-script typechecks pass; the combined integrity/eligibility/authorization/timeline lane passes 39/39 including an exact attempt-7→r9 convention case. Active runner scan contains no v8/attempt-6 ref, JSON projection checks and `git diff --check` pass.
- Current gate: `prepared-authorization-v9.json`, `authorization-acceptance-v9.json` and qualification output remain absent. Do not call preparation with `--write-manifest` until an attended sequence begins, because the first write assigns the immutable system-timed window.

### Revision-9 attended attempt — 2026-08-12

- Completed: materialize and locally validate the exact eligible revision-9 package, record exact user acceptance, and pass qualification/live/close credential-free offline preflights before browser work.
- Terminal outcome: the portal visibly confirmed the exact RAM user but rejected the controller-role input before an accepted AssumeRole response. The result pane remained empty and exposed no RequestId or credential. No integrity receipt, qualification, live or close execute command ran.
- Verified: qualification output is absent; the exact-package live offline preflight reports Attempts, Results, validations, REUs and pending integration outboxes all zero. Final accounting is `AssumeRole=0`, qualification reads `0`, `CreateJob=0`, cost CNY `0`, database scientific rows `0`, capability changes `0`; `M0-SCI` is not passed.
- Next: do not reuse revision 9. Before preparing revision 10, compare the live controller-role trust document read-only with frozen trust hash `sha256:46c14313b4a48378129637fa28153ff640abc81b7d317d784e8c2c6ef25ad257`, and rehearse the portal's typed Duration/Policy controls without submitting. Any real retry requires a fresh attempt/package/hash/acceptance and still forbids RAM mutation.

### Revision-10 readiness diagnostic — 2026-08-12

- Completed: exact visible-principal check plus one authorized `Ram.GetRole`. The live canonical trust hash, maximum session duration, exact principal and AssumeRole Allow all match the frozen controller-role authority; no RAM mutation occurred.
- Completed: no-submit form rehearsal using encoded URL parameters rather than direct post-mount DOM writes. Numeric Duration, exact Policy, role ARN, readiness session name and empty optional fields remained stable; no AssumeRole control was invoked.
- Decision: the portal trust warning is contradicted by the successful live GetRole and is not an authority source. Pre-package readiness must use exact caller identity plus a successful canonical GetRole comparison; issuance truth remains a provider RequestId and exact STS response.
- Verified zero effects: `GetRole=1`; `AssumeRole`, STS, qualification, `CreateJob`, database writes and four capability changes are all `0`. Credential-free live preflight remains all-zero.
- Next: pre-stage revision 10 / attempt 8 with fresh manifest/output/business/idempotency identities and keep package/acceptance absent. A timed package may be created only while the user is present and requires a new exact authorization.

### Revision-10 attempt-8 pre-stage — 2026-08-12

- Completed: move preparation, qualification, live and close to `prepared-authorization-v10.json` / `authorization-acceptance-v10.json`; version the controller session to r10 and P5 attempt to `t136-p5-scifact-attempt-8`.
- Completed: isolate OSS result reads/output, live business identity and scientific-close idempotency under attempt 8. Revision 9 remains immutable historical evidence in the workload profile.
- Completed: project workload authorization to current revision 10 with null package/prepared/acceptance refs, eligibility false, status `awaiting_revision_10_package_materialization` and both authority booleans false.
- Verified: strict backend and experiment-script typechecks pass; the integrity/eligibility/authorization/timeline lane passes 39/39 including exact attempt-8→r10 convention. Static scan has no v9/attempt-7 active refs; v10 package, acceptance and qualification records are absent; JSON checks and `git diff --check` pass.
- Gate: do not write the system-timed v10 package until the user explicitly begins an attended sequence. Package write is followed by hash reporting and a new exact authorization, not automatic browser/cloud execution.

### Revision-10 attended attempt — 2026-08-12

- Completed: materialize eligible attempt-8 package `sha256:2a45a05327695fec4a7efc9b771142f27ef9dfdbbac463ec2b69eea758a0ed61`; preparation read no credential and made no cloud call, database write, capability change or `CreateJob` call.
- Terminal outcome: reject the received execution text before acceptance because its portal-start deadline 06:30:45.826 is later than its unchanged AssumeRole dispatch deadline 06:12:45.826 and qualification/live deadline 06:17:45.826. The text arrived at approximately 06:28 Asia/Shanghai, after both operative deadlines.
- Verified zero effects: `authorization-acceptance-v10.json` and `credential-qualification-v1.json` are absent; qualification/live/close offline preflights pass with Attempts, Results, validations, REUs, outboxes, Closures and Packets all zero. `AssumeRole=0`, qualification reads `0`, `CreateJob=0`, cost CNY `0`, scientific database rows `0` and capability changes `0`.
- Next: version revision 11 / attempt 9 before any new timed package. A future authorization must preserve the package-derived chronological ordering and cannot extend only one earlier-stage deadline while leaving later prerequisites already expired.

### Revision-11 attempt-9 pre-stage — 2026-08-12

- Completed: switch active preparation, qualification, live and close paths to `prepared-authorization-v11.json` / `authorization-acceptance-v11.json`; set the operational attempt to `t136-p5-scifact-attempt-9` and controller session suffix to r11.
- Completed: isolate the session-policy OSS resource, provider output prefix, live business key and scientific-close idempotency key under attempt 9. Revision-10 package/hash/ref/final status remain immutable workload-profile history.
- Completed: project current revision 11 with null package/prepared/acceptance refs, eligibility false, status `awaiting_revision_11_package_materialization` and both authority booleans false.
- Verified: strict backend and experiment-script typechecks pass; the integrity/eligibility/authorization/timeline lane passes 39/39 including attempt-9→r11 convention. Active-path scan contains no v10/attempt-8/r10 references; v11 package, acceptance and qualification records remain absent; JSON checks and `git diff --check` pass.
- Gate: do not create the system-timed v11 package until the user explicitly starts a newly attended sequence. Package creation reports new hashes first; browser/cloud work requires a later exact, internally ordered and still-usable authorization.

### Revision-12 attempt-10 execution — 2026-08-12

- Completed local pre-stage: active refs, attempt/output/business/idempotency identities and controller session moved to revision 12 / attempt 10 / r12. Strict backend and script typechecks passed; the focused P5 lane passed 42/42.
- Completed recovery/package gate: fresh schema and exact 114-table authority-data dumps plus a hash-bound recovery manifest were created outside the repository. The first package command failed before write because the old recovery artifact was absent; the second failed before write because the validator still required a pre-Run recovery timestamp. The validator now accepts a recovery point created before immutable issuance begins, and focused tests cover both admitted and late cases. The third command materialized the eligible package once.
- Completed exact acceptance and attended issuance: one r12 `AssumeRole` succeeded and no RAM mutation occurred.
- Terminal qualification: local integrity initially failed on a visually truncated token and was improperly retried; the sole qualification invocation then made two read-only calls and failed the exact workspace-id assertion. No GetImage, paid call, provider write, database write or capability enable followed.
- Current authority is false. The mandatory post-expiration audit passed with no credential or scientific/runtime effect.
- Next: stop for an explicit review/fix decision. Do not infer authority for revision 13 from this plan.

### Post-revision-12 local sequence and response hardening — 2026-08-12

- Completed: add an attempt-level execution lock plus package/attempt-bound `ScientificEvidenceP5AttemptStageClaim@v1`, `ScientificEvidenceP5AttemptStageCompletion@v1` and `ScientificEvidenceP5AttemptTerminal@v1`. The centralized chain is integrity → qualification → live → close; a claim is permanent, a completion requires its matching claim and non-decreasing timestamp, and any claimed operation or prerequisite failure records one immutable terminal fact.
- Completed: all four execute entries hold the same lock across claim, predecessor verification, operation cleanup and completion publication. Same-stage and cross-stage concurrency are refused before the losing entry claims or terminalizes; orphan lock/claim states fail closed without automatic reclaim. Offline preflight remains credential-free and reports terminal presence without creating a claim or reviving execution authority.
- Completed: replace typed-only `GetWorkspace` identity extraction with the same single ROA `GetWorkspace` request through the locked SDK client's raw `callApi` boundary. Normalize only response-owned Pascal/camel aliases, accept positive safe-integer or canonical decimal-string IDs, reject absence/conflict/malformed/mismatch, and never substitute the requested path.
- Verified: 58 focused P5 tests pass, including the four-stage success chain, all three adjacent cross-stage races, upstream-failure propagation, orphan attempt-lock behavior, lock-release/double-failure terminal accounting, same-stage concurrency, out-of-order terminalization, orphan completion/claim rejection, completion time ordering, terminal binding/race/tamper and raw `GetWorkspace` request/response normalization. Strict typechecks, full shared/backend suites, diff/security scans and all three credential-free offline preflights pass. The named-local database remains at zero Attempts/Results/validations/REUs/outboxes and no historical revision-12 execution record was materialized.
- Gate: local implementation is ready as the stable T-136 baseline. Do not pre-stage or authorize revision 13 from this implementation step.

### Quality and cleanup checkpoint — 2026-08-12

- Independent review requested changes for a same-stage check→use race, prerequisite-before-claim retryability and a cross-stage active-operation race. They are closed by one attempt-level execution lock and a centralized fixed-order state machine whose permanent claim precedes every predecessor/operation boundary.
- Success output is emitted only after operation cleanup and durable completion publication. Failure output contains a stable `T136_P5_*` reason code; provider or credential-derived error text is not surfaced.
- Runtime compatibility branches for P5 operational timelines and package/eligibility hash profiles v1/v2 were removed. Contract v3 is the sole executable path; older revisions survive only as historical hashes/statuses in the audit documentation and workload projection.
- Generated preparation/acceptance manifests v1-v11 were removed; only the final revision-12 historical package and acceptance remain as the current deterministic test/audit fixture. The retained P5 runners remain maintained acceptance harnesses, not transient attempt scripts.
- Tracked desktop `dist/` output, untracked build caches, bytecode, logs and task scratch artifacts were removed. The two named-local recovery dumps under `.ai/.tmp/db-recovery/` were deliberately retained because the active recovery runbook still names them as restore sources.
- Current planning boundary: `M0-SCI` is still not passed. The next product action, if chosen later, is revision 13 under fresh authority; it is not part of this cleanup/commit checkpoint.

### Revision-16 pure-local payload correction — 2026-08-14

- Completed: preserve the real-provider materializer's exact regional `output/` root contract and switch the successor profile to that root. The service continues to derive `output/<run-id>/<cell-key>/`; the controller session policy grants result reads only under `output/<run-id>/*`.
- Completed: make deterministic P5 package eligibility materialize both exact cell payloads. Any profile, input URI, mount, role or output-path mismatch now fails with `P5_ELIG_REAL_PROVIDER_PATH_INVALID` before an immutable package can be marked eligible.
- Completed: pre-stage only revision-16 code paths and workload authority. Active harnesses use v16 manifests, attempt 14, r16 session naming and attempt-14 business/idempotency keys; revision-15 qualification and terminal records remain versioned history. No v16 recovery/package/acceptance was created.
- Verified: eligibility passes 18/18, the full focused P5 lane passes 60/60, experiment-script and full-workspace typechecks pass, and both exact frozen production cells materialize in memory with no credential, provider client or database write.
- Gate: wait for the recorded revision-15 STS expiration and verify cleanup. Any real revision-16 sequence still requires a fresh repository-external recovery point, one first-write package, hash reporting and new exact authorization.

### Revision-16 attempt-14 terminal execution — 2026-08-14

- Completed: revision-15 expiration audit, fresh recovery, one eligible immutable revision-16 package, exact acceptance, one controller STS issuance, one credential-integrity claim/completion and one successful three-read qualification claim/completion.
- Completed: enter live once and issue exactly two authorized `CreateJob` calls. Both Jobs succeeded and were collected; no retry, replacement Job, RAM mutation or budget expansion occurred.
- Terminal: both collected envelopes were `diagnostic_only` because the code artifact emits `micro_recall_ppm` while the registered protocol slot is `scifact_micro_recall_ppm`. No scientific-source output exists, so Result/validation/REU/Closure/Packet work did not run. Live terminalized under `T136_P5_LIVE_FAILED`; close execute was not invoked.
- Completed cleanup: authority booleans are false, the lock/process/temp logs are gone, qualification is versioned as r16 history, all three post-expiration offline preflights pass, and the STS expiration audit passed with no local credential/capability/config residue.
- Gate: T-136 stays `in-progress` and `M0-SCI` stays pending. Do not patch or replay revision 16. A successor needs explicit fix authority, a new content-addressed workload/authority chain and Run, full scientific-source sealing preflight, a fresh recovery/package and new exact paid authorization.

### Post-revision-16 local scientific-sealing correction — 2026-08-14

- Completed: align the workload observation identity to frozen protocol key `scifact_micro_recall_ppm` while keeping metric identity `micro_recall_ppm` unchanged.
- Completed: make package preparation verify exact entrypoint digest/size and run both cell output builders through the production scientific-source sealer before eligibility can be emitted.
- Completed: add a P5-only live source gate that preserves generic diagnostic collection semantics but terminates immediately when all commands are done and any terminal collection lacks one scientific source.
- Verified: focused Node 20 scientific-source/P5 lane passes 31/31; backend and experiment-script strict TypeScript checks, Python preflight and diff hygiene pass.
- Remaining step 1: upload/read back the exact 11,063-byte candidate under digest `sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265` under a separately reviewed cloud-write boundary.
- Remaining step 2: freeze a new ExecutionBundle/WorkOrder/Run and create a fresh named-local recovery and immutable package. The new byte-identity/sealing gate must pass against that package; historical revision-16 manifests remain unchanged.
- Remaining step 3: report the new package hash and obtain a new exact authorization before any STS issuance, capability enablement or paid `CreateJob` call.

### Revision-17 successor authority and package gate — 2026-08-14

- Completed step 1: create-only upload the corrected 11,063-byte entrypoint to its new digest directory. Console metadata reports ETag `464765EE89BDCF3F5AA824BC8E565F59` and 11,063 bytes; the downloaded readback is byte-identical and hashes to `sha256:7354f4503c3b8b8e0d43d40c47308d59f5dfdd2c5f580258d7da1cc0bc364265`. The old object was not overwritten or deleted.
- Completed step 2: advance the existing Metric and EvaluationProtocol logical identities to immutable revision 2, reuse the unchanged DataPolicy/Dataset/Benchmark revisions, and freeze independent v2 ExecutionBundle/Cycle/WorkOrder/Run authority. The bounded apply created exactly 101 reviewed rows, changed no protected/historical authority, made no external fetch or provider call and replayed with zero rows.
- Completed recovery/package gate: repository-external revision-17 recovery uses a complete 2,038-entry schema dump plus the exact 114-table authority-data dump. Package preparation byte-checks the new bundle and seals both production-shaped cells; revision-17 package `sha256:d790b7856a27fa32e1ab57ab02eef92034699cd494b11a86b203ef9dc166ba6a` is eligible with no reason codes and deterministic replay.
- Current gate: stop before `authorization-acceptance-v17.json`. The package, authority, eligibility and session-policy hashes must be accepted exactly while the immutable timeline remains usable. No STS issuance, qualification call, capability enablement or `CreateJob` is authorized by staging.
- Expiry rule: if portal confirmation cannot begin by `2026-08-14T15:39:51.714Z` or AssumeRole cannot dispatch by `2026-08-14T15:41:51.714Z`, revision 17 expires without execution and must not be edited or reused.

### Revision-17 attempt-15 terminal live entry — 2026-08-14

- Completed exact acceptance and issuance: one r17 `AssumeRole` dispatched inside the fixed window, local credential integrity passed, and exact caller/workspace/image qualification completed with three read-only calls and zero paid/provider-write/database/capability effects.
- Completed the one allowed live entry: both submit commands succeeded once, consuming the exact two-`CreateJob` authorization with no retry or replacement. Live terminalized once at `2026-08-14T15:44:03.126Z` under `T136_P5_LIVE_FAILED`; close was not entered.
- Current durable boundary: top-k-5 is provider-succeeded with its collection command claimed and no provisional output; top-k-10 is locally `submitted` with its reconcile command pending after nine nonterminal observations. Scientific Results, validation reports, REUs, runtime artifacts/admissions, Closures and Packets are all zero.
- Completed immediate cleanup: live process exited, all process-local capabilities and credential material were cleared, browser response state and clipboard were cleared, generic qualification was versioned as r17 history, and paid/capability authority is false. All three credential-free offline preflights pass.
- Completed final cleanup: at `2026-08-14T21:55:03.722Z`, the recorded STS expiration was 18,987 seconds in the past. All three credential-free offline preflights passed; local credential/capability/process/lock/config/temp residue was absent; and the exact scientific counts remained zero.
- Gate: revision 17 is fully terminal, expired and non-reusable. Do not retry, reclaim the collection command, invoke close or patch its records. Diagnose only through a separately reviewed read-only PAI/OSS boundary before proposing a fix or successor.

### Post-revision-17 named-local persistence correction — 2026-08-15

- Completed diagnosis: both exact PAI Jobs succeeded and both exact OSS `result.json` objects exist. PostgreSQL logs identify the first rejection at legacy `ef_provisional_output_class_check` and the fallback rejection at `ef_collection_attempt_collected_tuple_check`; revision 17 was not replayed or changed.
- Completed DB-SSOT sync: create a mode-0600 repository-external recovery point, review the additive diff, and deploy existing migration `20260808090000_add_scientific_source_and_packet_closure_binding` to the exact named-local target. Migration status, history and live constraint inspection pass; pre/post revision-17 row counts are identical.
- Completed application correction: failed scientific collection keeps `collectedAt` null while the collect command owns terminal/error state. The P5 live entry asserts the exact migration and three scientific persistence constraints immediately after target verification and before reading credentials, enabling capabilities or starting intake.
- Verified: backend and experiment-script strict typechecks pass; the live offline preflight passes with zero credentials/cloud/database writes/capability changes; the expanded scientific-source/P5 lane passes 42/42; the digest-pinned disposable PostgreSQL Pack C gate passes 119/119 and cleans up its container.
- Gate: this fix restores readiness but does not pass `M0-SCI`. A successor requires a new Run, recovery point, immutable package and exact authorization. Revision 17 remains terminal and non-reusable.
