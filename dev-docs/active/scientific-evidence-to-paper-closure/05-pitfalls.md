# T-136 Scientific Evidence to Paper Closure — Pitfalls

This file is an append-only log of resolved failures and dead ends. Current actionable work belongs in `03-implementation-notes.md`.

## Do-not-repeat summary

- Never equate provider Job success or `diagnostic_only` collection with scientific evidence. Search: `diagnostic_only`, `ExperimentResultCellV2`.
- Never trust-upgrade T-132 historical outputs; P5 must create a new typed scientific workload. Search: `T-132`, `scientific/evidence writers remain zero`.
- Never allow callers or LLM role outputs to author final disposition, selected exit or closure hashes. Search: `scientific_evidence_assessed`, `D-18`.
- Never add a second EF→PI evidence path; reuse `EvidenceCandidateQualified` and the PI Evidence Trust Gateway. Search: `EvidenceCandidateQualified`, `PaperImplementationEvidenceTrustGatewayService`.
- Never treat Packet materialization as a second closure authority; it is derived from `ValidationCycleClosed`. Search: `ResultInterpretationPacket`, `ValidationCycleClosed`.
- Never run paid provider operations or enable scientific capabilities from ordinary tests. Search: `P5 authorization`, `default false`.
- Never add a manual/external experiment-result import seam. External compute is allowed only as an EF-controlled adapter with an exact persisted Attempt lifecycle. Search: `no-external-result-import`, `real_provider Attempt`.
- Never convert published baseline numbers into this project's ExperimentResult/REU; keep them as source-anchored literature context. Search: `literature evidence`, `baseline context`.
- Never close T-136 or declare `M0-SCI` passed at P0-P4; that checkpoint is only `implementation_complete_unreleased`. Search: `M0-SCI`, `P5`.
- Never treat `M0-SCI` as governance milestone `M-001` or as the release switch for every M0 module. Search: `capability gate`, `M-001`.
- Never auto-enable scientific capabilities merely because `M0-SCI` passes; gate passage permits a separate controlled enablement decision. Search: `default false`, `controlled enablement`.
- Never freeze one provider raw-file layout or exact P5 workload as the cross-domain scientific contract; freeze canonical semantics and eligibility instead. Search: `invariant freeze`, `late-bound`.
- Never change metrics, thresholds, directions or exit rules after observing results for the same Run. Create a new protocol revision and new Run. Search: `preregistration`, `protocol hash`.
- Never collapse result recording and complete-batch validation into one authority operation; an orchestration wrapper may compose the two distinct EF actions only. Search: `recordExperimentResult`, `validateScientificBatch`.
- Never expose ExperimentResult observations as a product/controller write payload. The product command is identity-only and EF generates facts from one committed canonical scientific source. Search: `server-generated result`, `identity-only`.
- Never treat a succeeded real-provider Attempt as proof that caller-supplied metric values came from its artifacts. Require exact collected-output/parser/derivation binding. Search: `metric origin`, `derivation hash`.
- Never store large raw samples or provider payloads in the Result snapshot; store typed summaries and hash-bound artifact refs. Search: `statistic kind`, `artifact ref`.
- Never map EF validation `passed/failed` directly to PI `positive/negative/inconclusive`. Valid negative and indeterminate evidence must still qualify. Search: `evidence eligibility`, `scientific disposition`.
- Never put scientific metric interpretation inside a provider transport. Transports fetch and base-validate; the provider-independent parser owns typed scientific extraction. Search: `ScientificSourceParser`, `provider transport`.
- Never refetch provider output later merely to create Result when canonical bytes were already available at collection. Parse once at the collection boundary and persist a sealed source. Search: `scientific_source`, `source sealing`.
- Never call a provider or perform scientific parsing inside the collection database transaction. Prepare the source outside, then commit a short atomic state/output/idempotency write. Search: `collection transaction`, `no external I/O`.
- Never fail or rewrite a valid provider collection solely because scientific parsing is unsupported. Preserve diagnostic collection truth but create no scientific source, Result or evidence. Search: `failure matrix`, `collected diagnostic`.
- Never generate Result from uncommitted, `diagnostic_only` or indirectly inferred source state. Require one directly bound committed canonical scientific source. Search: `direct source binding`, `post-commit identity-only`.
- Never treat a source id/hash embedded only in Result JSON as relational provenance. Option B requires an exact database relation to a committed `scientific_source`. Search: `Result source FK`, `JSON-only provenance`.
- Never respond to source-binding needs by creating a provider-specific source table, child-source graph or mutable derivation ledger. Reuse one canonical collection output and hash-bind its raw artifact refs. Search: `B-lite`, `canonical root manifest`.
- Never reduce the confirmed Result relation to `sourceOutputId` alone; collection, hash, kind, class and same-Attempt integrity are part of the provenance identity. Search: `minimal relational spine`, `composite source tuple`.
- Never normalize provider payloads, metric summaries or uncertainty variants into provider/metric-specific columns. Keep extensible scientific content typed and hash-sealed in the canonical manifest. Search: `manifest split`, `no provider columns`.
- Never model statistic/uncertainty as a flat object with mutually inconsistent optional fields or an unrestricted plugin bag. Use the frozen discriminated union. Search: `StatisticV1`, `UncertaintyV1`.
- Never use `uncertainty: none` to hide missing parser output. The frozen protocol must explicitly mark uncertainty as not required; otherwise no scientific source is sealed. Search: `not_required_by_protocol`, `required uncertainty`.
- Never accept non-finite numbers, negative dispersion, invalid probability/confidence levels or free-form confidence methods. Search: `finite`, `methodKey`, `sampleSize`.
- Never generate random observation ids, include metric values in observation identity or trust parser emission order. Use preregistered semantic slots and protocol ordinals. Search: `observationKey`, `ef-observation-v1`.
- Never let value/parser/source changes mint another observation under the same RunCell slot. Preserve semantic identity and reject changed canonical content as conflict. Search: `observationId`, `content conflict`.
- Never use ad hoc `JSON.stringify`, timestamps, retries, locators or idempotency keys as scientific hash inputs. Use the versioned canonicalizer and layered domain-separated hashes. Search: `sourceOutputHash`, `derivationHash`, `resultContentHash`.
- Never reduce the transport→worker scientific handoff to a provider-manifest hash: a worker-side parser needs the already validated canonical envelope in the same collection lifetime. Return it ephemerally, use one fetch on the successful collection path and never expose or persist the raw layout as scientific evidence. Search: `ValidatedProviderResultEnvelope`, `hash-only outcome`.
- Never interpret DB-B nullable source columns as optional scientific provenance. Nulls exist only for preserved Result v1 rows; Result v2 must satisfy the complete source CHECK and both composite FKs. Search: `DB-B`, `source contract check`.
- Never backfill historical Result/source fields from Attempt ids, diagnostic outputs or guessed hashes. Preserve legacy rows as evidence-ineligible rather than manufacturing lineage. Search: `no backfill`, `schemaVersion v1`.
- Never use destructive schema rollback after a source-bound Result v2 exists. Disable writers, retain additive columns and ship a forward correction. Search: `DB-B backout`, `forward migration`.
- Never let Protocol, result schema and parser jointly author workload semantics. Protocol admits slots/rules, structural schema types them, parser extracts and sealer assigns canonical identity/order. Search: `field-level semantic authority`, `D-136-59`.
- Never add an optional raw-envelope member to every provider outcome or duplicate `result_manifest_hash` inside the ephemeral handoff. Specialize `collect()` and keep one manifest authority. Search: `RealProviderCollectSuccessV2`, `D-136-58`.
- Never let output ordinal allocation or error recovery be implicit. Real-provider diagnostic/source ordinals are `1/2`, and every expected/transient/deterministic preparation outcome has an explicit path. Search: `sealed | not_scientific`, `D-136-61`.
- Never describe an artifact ref declared inside the fetched provider envelope as independently byte verified. The v1 source hash seals the declaration; byte verification requires an explicit later retrieval/verification contract. Search: `ART-B`, `declared-and-hash-sealed`.
- Never grow CMP-B1 into an optional expression bag or persist separate support/contradiction checks beside the registered relation. V1 has one directional absolute-difference algorithm, one relation and one reason. Search: `CMP-B1`, `relation_reason`.
- Never classify a missing or mismatched protocol-required confidence interval as valid indeterminate evidence. Missing required uncertainty is validation failure; only a valid non-decisive interval is indeterminate. Search: `confidence_interval_guard`, `uncertainty_interval_not_decisive`.
- Never add `accept/correct/downgrade`, caller disposition or caller exit fields to scientific Closure. Command invocation authorizes the deterministic primary-relation mapping; disagreement leaves the Cycle open. Search: `DISP-S`, `corrected_scientific_disposition`.
- Never use `inconclusive` as a generic human caution flag. Contextual caution narrows limitations/claim ceiling; factual or protocol disagreement requires correction and a new Run. Search: `claim_ceiling`, `primary_comparison_key`.
- Never copy proposal, disposition or selected exit columns into Packet. Store the exact Closure id/hash and project Closure-owned facts through the read view. Search: `PKT-S`, `ClosedInterpretationPacketView`.
- Never put relay event ids, leases or delivery attempts into Packet scientific identity. Relay operational state owns delivery metadata; `packetContentHash` covers Closure ref plus Packet-owned semantics only. Search: `packetContentHash`, `ValidationCycleClosed`.
- Never classify a Serializable Packet-write abort as scientific authority drift. Let the durable relay retry infrastructure conflicts; terminalize only exact authority/content violations. Search: `P2034`, `PACKET_CLOSURE_DRIFT`.
- Never trust a Packet row merely because its four PKT-S columns are non-null. Recompute its canonical content hash and reassemble the closed view from exact Closure/proposal/evidence authority before Claim/Dossier creation. Search: `ClosedInterpretationPacketView`, `assemblePacket`.
- Never treat a freshly recomputed event hash as proof that Closure mirrors are authentic. Compare every producer-derived mirror and business identity to the exact stored Closure. Search: `assertEventMatchesClosure`, `ValidationCycleClosed`.
- Never map every Packet `P2002` to content conflict. Reread after the aborted transaction and return a canonically identical concurrent winner as replay. Search: `reconcilePacketUniqueConflict`, `P2002`.
- Never put a Packet's TraceManifest id in the Packet functional ref `version_id`. Claims and Dossiers bind Packet versions with `packet_content_hash` and must preserve full Claim→Packet lineage. Search: `packet_content_hash`, `assertDossierClaimPacketLineage`.
- Never make P5 eligibility or `M0-SCI` passage depend on a preferred positive/negative/inconclusive result. Eligibility is pre-run and acceptance is outcome-agnostic. Search: `P5-ELIG-S`, `outcome-agnostic`.
- Never authorize a mutable workload description or a generic capability window. Authorization binds one exact package hash, two `CreateJob` operations, cost ceiling, capability set, TTL and credential/recovery policy. Search: `package hash`, `single-use authorization`.
- Never silently replace or auto-resubmit a failed/cancelled P5 Job. Fail the attempt; another execution requires a new immutable Run/package and user authorization. Search: `exactly two CreateJob`, `new authorization`.
- Never add redundant composite unique indexes solely to persuade Prisma that an already uniquely owned optional relation is one-to-one. Keep the physical scalar ownership fence and use list reverse navigation when singular navigation would inflate the schema. Search: `list-valued back-navigation`, `DB-B`.
- Never use the randomized-schema smoke lane as the sole verdict for a migration history containing `pgvector`; the extension type installed in `public` is not visible under its isolated search path. Confirm with a fresh disposable database and zero drift. Search: `type vector does not exist`, `ci:prisma-smoke`.
- Never let historical v1 validation tests fall through to the default product reader. Legacy Result validation must opt into the same explicit test/migration-only compatibility switch as the legacy observation writer. Search: `legacyObservationWriterEnabled`, `loadSourceBoundRunResults`.
- Never send portal-extracted STS fields into a one-shot qualification call without a local, secret-safe integrity check. Validate representation and handoff without logging values or calling the cloud; qualification failure remains terminal. Search: `InvalidSecurityToken.Malformed`, `credential integrity`.
- Never replace the exact D-19 dependency manifest with a reduced protocol merely to exercise CMP-B1 after materialization. Preserve all locked dependencies and narrow only required scientific rules/slots. Search: `assertD19DependencyParity`, `23 locked dependencies`.

## Pitfall log

### 2026-08-05 — Expected-disposition acceptance would turn P5 into result selection

- Symptom: treating an anticipated positive/negative outcome as a P5 pass condition would permit reruns or workload changes until a preferred conclusion appears.
- Root cause: capability acceptance and scientific hypothesis outcome were being considered as one decision axis.
- What was considered: a loose two-call approval, an expected-disposition target and a generic approval/policy subsystem.
- Fix/workaround: P5-ELIG-S freezes eligibility before execution, accepts every registered relation/disposition, binds authorization to one exact package hash and fails the attempt on Job failure or package drift without hidden replacement.
- Prevention: P5 verifies the integrity and replayability of the real WorkOrder-to-Dossier chain; the acceptance verifier never grades whether the scientific conclusion is favorable.

### 2026-08-05 — Hash-only transport outcome could not support the confirmed parser boundary

- Symptom: the planned provider-independent parser was assigned to the EF worker, but the current collection outcome exposed only `result_manifest_hash`; the worker had no canonical result content to parse.
- Root cause: earlier planning recognized that transport already sees the provider envelope but did not verify the exact return type after validation.
- What was tried: field-by-field authority and worker/transport code census against the proposed M-B2 manifest.
- Fix/workaround: expand P1 with an internal ephemeral `ValidatedProviderResultEnvelope` carrying the validated envelope plus identical manifest hash; worker checks frozen bindings and parses before the short persistence transaction, with no second fetch.
- Prevention: every assignment-timeline decision must verify both field authority and data availability at the receiving stage; a hash proves identity but does not supply parser input.

### 2026-08-05 — Clean-slate non-null migration would force fabricated history

- Symptom: adding all B2 source columns as immediately non-null would fail on any existing Result row or require invented source defaults.
- Root cause: physical strictness was initially considered without separating migration compatibility from new-record invariants.
- What was tried: compare clean-slate non-null columns, application-only nullable columns and normalized source child tables against historical preservation and direct-FK requirements.
- Fix/workaround: DB-B adds nullable physical columns but closes valid states with a version gate: Result v1 is all-null/ineligible and Result v2 is all-present/source-bound. No historical row is backfilled.
- Prevention: every additive evidence migration must model legacy and authoritative states explicitly; database nullability alone never defines domain optionality.

### 2026-08-05 — Coarse stage ownership hid duplicate semantic and persistence assigners

- Symptom: the assignment table named worker, parser and sealer together for source facts; another sentence said the sealer persisted the source, while the collection transaction was also described as persistence authority. The proposed handoff also repeated the provider-manifest hash.
- Root cause: the design was correct at bounded-context level but had not separated semantic origin, projection and atomic persistence at field level.
- What was tried: a read-only design review against clarity, robustness, controlled complexity and assigner uniqueness, followed by a current-code census of transport return, worker dispatch, output ordinal and TaskSpec/parser bindings.
- Fix/workaround: specialize only `collect()`, keep one provider-manifest field, make parser extraction-only and sealer pure, make Result generation value-preserving, assign deterministic output ordinals `1/2` and reserve atomic persistence for collection repository orchestration.
- Prevention: every frozen pipeline stage must list semantic origin, allowed projection and persistence boundary separately; no row may rely on runtime next-ordinal scanning or lease expiry as normal error recovery.

### 2026-08-08 — Singular Prisma navigation would add redundant physical indexes

- Symptom: Prisma validation rejected singular optional back-relations for Packet→Closure, Result→Collection and Result→source unless each full referenced tuple also had a second composite unique declaration.
- Root cause: Prisma's relation cardinality inference does not use the already unique nullable scalar ownership column to prove the wider composite relation is one-to-one.
- What was tried: model the logical one-to-one relation as singular while retaining the frozen minimal index set; Prisma requested three redundant composite unique indexes.
- Fix/workaround: preserve unique `closureId`, `collectionAttemptId` and `sourceOutputId` as the physical one-to-one fences, retain the exact composite FK targets, and model reverse navigation as lists. The existing legacy Packet mapper explicitly uses the unchecked scalar create input because its optional Closure relation shares `validationCycleId`.
- Prevention: distinguish physical cardinality enforcement from ORM navigation shape; add write-cost/index complexity only for a real query or integrity requirement.

### 2026-08-08 — Randomized schema smoke could not resolve the public pgvector type

- Symptom: `pnpm ci:prisma-smoke` failed at historical migration `20260605104000_add_literature_pgvector_phase1` with `type vector does not exist`, before reaching the T-136 migration.
- Root cause: the smoke harness deploys into a randomized PostgreSQL schema, while the `vector` extension/type is installed in `public` and is absent from the migration search path.
- What was tried: the standard schema-isolated smoke lane generated Prisma successfully but failed during historical migration deploy and cleaned up its schema.
- Fix/workaround: create a task-named disposable database, deploy the full 76-migration history in `public`, run exact relational assertions and the zero-drift gate, then drop the database. That lane passed through T-136.
- Prevention: retain the schema-smoke failure as evidence, but require a fresh disposable-database lane for histories whose extension types are schema-bound; never reinterpret a pre-target historical failure as proof that the new migration failed.

### 2026-08-08 — Node 26 produced opaque ts-node loader failures

- Symptom: a targeted `node --test --loader ts-node/esm` invocation exited before test discovery with an unhelpful null-prototype object.
- Root cause: the shell defaulted to Node 26, while the repository's current TypeScript loader/test stack is verified on Node 20.
- What was tried: the same unchanged targeted test list first under the default runtime and then with `/opt/homebrew/opt/node@20/bin` first on `PATH`.
- Fix/workaround: use the repository-compatible Node 20 runtime for TypeScript typechecks and node:test lanes; the targeted P1 suite then passed.

### 2026-08-08 — P1 made the old Result v2 rejection assertion obsolete

- Symptom: the first fresh Pack C EF gate ran all affected PostgreSQL tests but reported 75 pass / 1 fail; the new source-bound two-cell test passed.
- Root cause: a historical fence test expected any `schemaVersion=v2` Result to fail the old schema-version CHECK. P1 intentionally admits v2 only with the complete source tuple, so the correct rejection is now `ef_experiment_result_source_contract_check`.
- Resolution: update the assertion to the new closed source contract and add the T-136 migration to the gate's explicit required-migration registry. The second disposable run passed 76/76 with zero skips and completed cleanup.
- Prevention: record `node -v` with test evidence and do not classify a pre-discovery loader crash as a product-test assertion failure.

### 2026-08-08 — First P2 disposable fixture mixed product and legacy validation assumptions

- Symptom: Pack C `r3` passed all engine/service/schema/static checks but failed two relational subtests: an unsupported-rule v1 fixture was read through the new v2 product path, and the new CMP-B1 protocol failed materialization with `D-19 requires exactly 23 locked dependencies`.
- Root cause: P2 correctly made source-bound Result v2 the default, but one historical wrapper relied on the old implicit reader. The first P2 protocol fixture also reduced D-19 metric dependencies instead of preserving the admitted dependency manifest.
- What was tried: no production fallback, schema relaxation or alternate reader was added. The identity-marked disposable database completed cleanup after the failed run.
- Fix/workaround: explicitly opt the historical unsupported-rule wrapper into test/migration legacy behavior; construct the P2 protocol with every exact D-19 metric dependency while registering only the single required scientific rule/observation/comparison used by the test.
- Prevention: compatibility fixtures must declare their legacy mode, and post-admission protocol variants must preserve the complete readiness/version-lock dependency set. Pack C `r4` then passed 90/90 and cleaned up.

### 2026-08-08 — Canonical semantic unions are not Fastify serializer schemas

- Symptom: canonical AJV/schema tests and domain tests passed, but `app.ready()` failed while compiling the scientific-validation response serializer with `Failed to merge "type" keyword schemas`.
- Root cause: comparison fact and rule-result schemas use semantic `oneOf` constraints to couple relation/reason and status/fact. Fastify's response serializer attempts to merge those branches and cannot compile the nested object union.
- Fix/workaround: preserve the canonical schema unchanged for validation, hashing and persistence; use a closed field-equivalent response-serialization projection that omits only the semantic branch constraints. Do not weaken the canonical schema or add a custom best-effort serializer.
- Prevention: every product route that exposes a canonical schema with semantic unions must run an `app.ready()` plus response-injection test, not only AJV validation tests.

### 2026-08-08 — Legacy artifact fields were incorrectly reused as v2 logical identities

- Symptom: a valid source-bound artifact with `artifact_key=metrics` failed a rule declaring legacy `file_name=metrics.json`; the v2 adapter also treated the whole-result parser profile as the artifact parser without an admission mapping.
- Root cause: the first P2 slice reused similarly shaped legacy fields instead of freezing an explicit relationship between provider-independent artifact slots and required artifact rules.
- Fix/workaround: add optional-for-history `required_rule_id` to each protocol artifact slot. New protocols must explicitly set a rule id or `null`; freeze/source/product checks enforce rule existence, kind, cardinality and parser-profile compatibility. Rule execution uses logical key plus the frozen binding and never guesses from file name.
- Prevention: compatibility adapters may preserve legacy semantics, but a new version must not infer identity from a differently named field. Every cross-version mapping requires an admitted, hash-bound protocol field and one positive plus one rejection test.

### 2026-08-08 — Route existence was not part of the P2 API gate

- Symptom: all service and relational P2 tests passed while the three served scientific endpoints were absent from the OpenAPI SSOT.
- Root cause: the existing repository-wide path census was not included in Pack C evidence, and the route serializer test exercised runtime behavior without checking documentation coverage.
- Fix/workaround: document the three operations and closed schemas, regenerate the API index and add `experiment-v2-openapi-path-coverage.test.ts` as required `openapi_unit` evidence for PC05.
- Prevention: every new product route must satisfy runtime injection, OpenAPI path census, OpenAPI semantic quality and generated-index freshness in the same feature gate.

### 2026-08-08 — Runtime proposal hashes and scientific canonical hashes use different established profiles

- Symptom: the first P3 contract sketch treated every scientific-looking hash as `sha256:<hex>`, but PI runtime artifacts already use bare lowercase SHA-256 while EF facts, protocols, REUs and Closure snapshots use the domain-prefixed canonical form.
- Root cause: proposal identity belongs to the existing PI runtime artifact profile; scientific source/authority identity belongs to the EF/PI canonical semantic profile. Similar field names do not imply the same wire representation.
- Fix/workaround: keep `expected_proposal_hash`/`accepted_proposal_hash` as bare 64-hex runtime hashes and retain `sha256:` for watermark, REU, protocol, fact and Closure hashes. The Prisma resolver recomputes the exact stable runtime payload hash before accepting the proposal.
- Prevention: derive new reference/hash fields from the owning aggregate's established profile, then cover each API/schema pattern and canonical recomputation independently; do not normalize across bounded contexts for cosmetic uniformity.

### 2026-08-08 — Hash-fenced caller context was still caller-authored science

- Symptom: the first P3 ResultAnalysis request let the caller submit `scientific_closure_context` and source-body packets. Id/hash subset checks prevented obvious scope drift, but interpretation, limitations and claim ceiling could still be conditioned on caller-authored factual bodies.
- Root cause: the design reused a general back-half runtime packet carrier without separating structural request refs from scientific factual authority. A hash fence proves consistency with the caller's own declaration; the fence does not prove that the database authorized the content.
- Fix/workaround: expose only a watermark intent, reject caller bodies on scientific runs and resolve/re-hash exact REUs, reports, protocols and the primary fact in a short server transaction before the provider call. Closure repeats the authoritative reread independently.
- Prevention: whenever a model artifact can authorize a scientific state transition, trace every prompt fact to a server-owned reader; caller-supplied refs may name structural destinations, but caller-supplied bodies cannot establish scientific facts.

### 2026-08-08 — A synthetic final-artifact helper hid missing production preconditions

- Symptom: review-fix gate `packc-pi-20260808-r2` passed 150/151 but the rewritten scientific relation test failed because `ImplementationProject ... not found` before ResultAnalysis ran.
- Root cause: the former test manually assembled a generic admitted final artifact and therefore never exercised active-project preflight, product/provider mode, official admission policy or canonical artifact identity. Its fixture seeded a ValidationCycle without the project row that the real runtime requires.
- Fix/workaround: replace the helper with the actual ResultAnalysis runtime/context resolver/admission path and seed the exact ImplementationProject aggregate. `packc-pi-20260808-r3` then passed 151/151 and cleaned up its identity-marked disposable database.
- Prevention: relation tests for authority transitions must begin at the real public service boundary and assert its preconditions/mode/policy, not inject a downstream-shaped row that bypasses them.

### 2026-08-08 — A self-hashed admission record is not independent authority

- Symptom: an admission payload could change `expected_output_schema_id` while the official-policy row, runtime envelope and stored admission identity remained unchanged; the old Closure resolver still considered the proposal eligible because the payload schema stayed valid and the stored identity still hashed itself.
- Root cause: the resolver checked several mirrors independently but did not reconstruct the one expected official admission identity from the runtime envelope or compare every row/payload field back to that source.
- Fix/workaround: rebuild the official identity from the immutable runtime envelope and fixed policy, then reconcile the full row, payload, identity/hash, refs, schemas, hash vectors, issues and warnings. The disposable relation test mutates only the payload schema field and proves zero Closure/outbox writes.
- Prevention: authorization records must be verified against an independent authoritative source; schema validity plus self-consistent hashing proves internal consistency, not eligibility.

### 2026-08-09 — P5 projections can accidentally create a second scientific identity track

- Symptom: the first P5 kernel sketch introduced package-local hashes for protocol, cell, parser, metric/statistic and aggregation projections even though canonical WorkOrder, RunCell, TaskSpec and EvaluationProtocol identities already exist.
- Root cause: a compact eligibility manifest was treated as a new semantic model instead of a hash-bound view of existing authorities. That makes assignment timing unclear and allows package values to drift while their referenced domain hashes remain superficially valid.
- Fix/workaround: embed the existing exact domain objects, recompute their established hashes and compare only the one allowed parameter difference plus normalized execution-critical TaskSpec fields. Keep new P5 fields limited to provider/workload, operation/cost, capability/window, credential and named-local recovery controls.
- Prevention: a P5 package may bind or project an existing authority, but the package must never mint an alternate protocol/cell/result identity. Every scientific value must name its sole existing assigner and canonical hash profile.

### 2026-08-09 — Diagnostic asset revisions cannot be relabeled as scientific

- Symptom: the SciFact corpus/query bytes already exist under T-132, which initially suggested that their DataPolicy/Dataset revisions could be referenced directly by P5.
- Root cause: those revisions explicitly freeze `m7_l1_diagnostic_only` and `scientific_evidence_ineligible`. Byte identity does not erase the owning revision's policy or confer scientific eligibility.
- Fix/workaround: remotely verify and reuse only byte-identical OSS objects, then create new T-136 scientific DataPolicy/Dataset revisions and a new scientific ExecutionBundle. Never edit, relabel or trust-upgrade T-132 rows.
- Prevention: separate storage-object reuse from authority-revision reuse in every preparation plan; scientific eligibility follows the immutable policy/revision, not the fact that bytes are already stored.

### 2026-08-09 — A full named-local data dump over-captured unrelated domains

- Symptom: the initial full schema+data recovery dump grew beyond 3 GB even though the T-136 authority census was small.
- Root cause: the named-local database also contains large Literature payload tables unrelated to P5 materialization and rollback.
- What was tried: a PostgreSQL 17 full custom-format dump after correcting a Prisma-only URL query and a PostgreSQL 14/17 client-server mismatch. The valid dump was stopped once its unrelated scope became clear; the incomplete file was removed.
- Fix/workaround: retain a full schema-only dump plus scoped data for 114 ExperimentFoundation, PaperImplementation and Validation authority tables. The recovery manifest fixes the three-stage restore order into a separately approved empty target.
- Prevention: size and classify named-local tables before recovery capture, and bind recovery scope to the exact aggregates that the planned mutation can affect. Do not retain an incomplete oversized artifact merely because generation already consumed time.

### 2026-08-09 — Dataset identity and mirror-part identity are different layers

- Symptom: the ExecutionBundle validator required every mirror to name a different Dataset revision, which would force queries and qrels into separate scientific Dataset identities even though the frozen evaluation input is their exact pair.
- Root cause: object-part uniqueness was conflated with Dataset semantic identity.
- Fix/workaround: allow repeated canonically identical Dataset revision refs across mirrors, require contiguous ordinals and globally unique object refs, and reject any same-revision identity drift. Queries and qrels now remain two exact parts of one evaluation-input Dataset.
- Prevention: enforce uniqueness according to the owning layer. Dataset revision identifies scientific semantics; mirror ordinal/object ref identifies one mounted byte part.

### 2026-08-09 — Final readiness requires passed readiness for new dependencies

- Symptom: the first stage-one attempt created all seven scientific assets but the EvaluationProtocol readiness was blocked on six new dependencies even though their lifecycle projections were active.
- Root cause: the plan counted only the final protocol attestation and overlooked the evaluator's dependency-readiness rule.
- Fix/workaround: census and transactionally remove the exact 84 failed-attempt rows, verify historical sentinels unchanged, then create passed attestations in dependency order: policies, datasets/metric, benchmark, protocol. The corrected reviewed ceiling is 146 rows.
- Prevention: dry-run the complete readiness graph, not only lifecycle state and transitive dependency count, before the first durable authority write.

### 2026-08-09 — Large terminal injections can truncate without a visible transport error

- Symptom: one long Cloud Shell terminal injection ended before the complete entrypoint payload and left an unterminated shell command.
- Root cause: browser-terminal typing has a practical payload boundary independent of shell syntax and OSS tooling.
- Fix/workaround: close the incomplete command safely, transfer large base64 content in short numbered chunks, then verify byte count and SHA-256 before any upload. Remove both Cloud Shell and local staging afterward.
- Prevention: keep browser-terminal commands short, make chunk order explicit and treat end-to-end digest verification as mandatory.

### 2026-08-09 — STS cleanup is expiration plus local erasure, not IAM revocation

- Symptom: the prepared authorization requested active post-run revocation of one STS session, but the provider exposes automatic session expiration rather than a per-session revoke operation.
- Root cause: local credential deletion, STS-session invalidation and broader RAM authority mutation were initially treated as one generic cleanup action even though they have different owners and blast radii.
- Fix/workaround: the user replaced the impossible action with an exact 3,600-second token issued at 10:00, immediate process/local-profile erasure, automatic expiry by 11:00 and an after-window expiry check. The current acceptance record now states `manual_revocation_required=false`; no RAM role or policy mutation is authorized.
- Prevention: freeze credential issuance, storage, erasure, provider expiry and IAM mutation as separate fields. Never claim local erasure revoked a provider session, and never mutate a role/policy as a cleanup substitute without separate authorization.

### 2026-08-10 — PAI runtime role is not the local control-plane credential role

- Symptom: the first revision-2 STS preparation targeted `pea-m7-canary-runtime`; the OpenAPI page correctly reported that the logged-in RAM user was not trusted by that role.
- Root cause: the PAI Job workload's `runtime_role_arn` was reused as the local runner's AssumeRole target even though these identities have different owners and permission surfaces.
- What was tried: the exact-boundary browser action failed before dispatch and no STS was issued. No trust-policy change or retry was attempted.
- Fix/workaround: read-only RAM evidence identified the existing `pea-m7-canary-controller`, which already trusts `user_0002`, carries the required control-plane v4 policy and can pass only the exact runtime role. Revision 3 models and hashes both roles separately.
- Prevention: every provider package must name control-plane principal, assumed controller role and workload runtime role independently; eligibility rejects equal controller/runtime ARNs and credential qualification must pass before paid execution.

### 2026-08-10 — A five-minute issuance window also bounds secure credential handoff

- Symptom: the one authorized controller `AssumeRole` succeeded at 08:27:23, but credential qualification failed locally at 08:30:23 with `T136_P5_QUALIFICATION_OUTSIDE_ISSUANCE_WINDOW` before its first read-only cloud call.
- Root cause: the revision-3 package correctly gates qualification to the issuance window, while the operational budget treated the full five minutes as available for issuing STS and did not reserve enough time for console response capture, in-memory extraction, validation and child-process startup.
- Fix/workaround: stop fail-closed, clear the credential, issue no replacement and perform no paid execution. A future package should give issuance/handoff its own explicit deadline or reserve a deterministic handoff margin before the qualification cutoff; it must still preserve exact TTL, latest expiration and zero-retry semantics.
- Prevention: acceptance planning must budget console latency and secure process handoff as first-class timed steps. Preflight should calculate the latest safe AssumeRole dispatch time from a measured handoff ceiling instead of allowing dispatch until the qualification window's final second.

### 2026-08-11 — Rendering an automation card does not prove scheduler persistence

- Symptom: the app displayed a card for `t-136-p5-revision-4-execution`, but the task did not wake at 06:55 and the 07:00–08:30 authorization window passed unused.
- Root cause: the create call was treated as successful based on presentation output without obtaining a generated persistent id or verifying scheduler/durable state. The local automation store stayed empty and the claimed id later returned `not_found`.
- Fix/workaround: expire the package fail-safe with zero cloud effects; do not perform a late execution. For a future attempt, let the automation service generate the id, verify view plus durable record and run a harmless rehearsal wakeup before the authorized date.
- Prevention: automation readiness requires four independent facts—generated id, API view, durable record and rehearsal trigger. A visible card is not one of the execution-authority or scheduling acceptance facts.

### 2026-08-11 — An immediate exact start can expire during local package versioning

- Symptom: the user confirmed 21:35, but the new revision-5 package completed at 21:36:53, after its 21:35:30 issuance cutoff.
- Root cause: a new immutable operational attempt required active-path versioning and regression checks, but the selected start left no preparation budget.
- Fix/workaround: retain the package as unauthorized expired evidence, keep all effects zero and pre-stage the next operational revision before requesting another time.
- Prevention: only offer a start after the next revision path is typechecked and ready; reserve a minimum explicit user-response and authorization margin instead of measuring from the current minute.

### 2026-08-11 — A logged-in cloud portal is not proof of the authorized RAM principal

- Symptom: revision 6 had a valid system-timed package and exact authorization, but the claimed OpenAPI tab repeatedly displayed the prohibition against calling AssumeRole with a main account and returned neither RequestId nor STS material.
- Root cause: browser session availability was treated as sufficient readiness even though the package authorized only `acs:ram::1183869713036194:user/user_0002`. A logged-in tab proves neither that exact source principal nor that an AssumeRole confirmation would execute under it.
- Fix/workaround: stop before credential issuance, allow the dispatch window to expire and reconfirm zero effects. Do not change RAM trust/policy, use another principal or issue a late/replacement credential.
- Prevention: establish the exact visible RAM-user identity before starting the package-created clock. Package preparation may be immediate, but browser identity readiness must be a precondition rather than a timed step inside the issuance window.

### 2026-08-11 — The portal submit button is not the AssumeRole dispatch boundary

- Symptom: revision 7 clicked `发起调用` at 22:19:33.100, before the 22:19:46.542 dispatch cutoff, but Alibaba opened a separate safety-confirmation dialog. The confirmation guard ran at 22:19:59.239 and correctly refused the now-late action.
- Root cause: the operational timeline budgeted the provider dispatch deadline but did not reserve a distinct margin for the portal's two-step submit/confirm flow and local automation latency. The first UI action does not produce a RequestId or credential and therefore is not the dispatch.
- What was tried: select the exact controller-role suggestion, invoke the form action, locate the unique safety-confirmation control and recheck the immutable cutoff immediately before the final action. Once late, the dialog was cancelled and no retry or replacement call was made.
- Fix/workaround: close revision 7 with zero paid effects and keep its package non-reusable. Version revision 8 with a deterministic confirmation-start margin before dispatch cutoff, and refuse to open the safety dialog unless that full margin remains.
- Prevention: distinguish UI preparation, safety confirmation and provider API dispatch in the timeline. Pre-stage the exact form controls before package creation, test locator uniqueness without confirming, and require a conservative local buffer before beginning the final two-step action.

### 2026-08-11 — A successful AssumeRole response does not prove secure extraction integrity

- Symptom: revision 8 received one exact controller-role STS response, but the first qualification request failed with `InvalidSecurityToken.Malformed` before caller identity could be established.
- Root cause: not proven. The failure is consistent with representation damage somewhere between the portal response and the bounded child-process environment, but the terminal no-retry boundary intentionally prevented further cloud probing.
- What was tried: parse the portal response in memory, pass the three credential fields only to the qualification child environment and keep every product capability false. After the single failure, no re-extraction, replacement issuance, qualification retry or paid action occurred.
- Fix/workaround: close revision 8 with zero paid/scientific effects, clear all credential-bearing state, remove the response page and reset the persistent kernel. Do not reuse the issued credential or package.
- Prevention: before another attempt, add a local-only validator for access-key shape, token length/character integrity, whitespace/quoting and environment round-trip. It must output only booleans/lengths or hashes that cannot disclose credential material, make zero cloud calls and run before the one permitted qualification request.
- Resolution update: the local receipt gate is now implemented and enforced before both qualification and live cloud calls. The root cause of revision 8 remains intentionally unclaimed; the new gate prevents the known representation-damage classes without rewriting that historical diagnosis.

### 2026-08-12 — Direct DOM values do not prove a controlled cloud form accepted them

- Symptom: revision 9 read back exact values from the page's native input elements, but the visible controlled form later showed Duration as a non-numeric value, cleared Policy and reported a controller-role trust mismatch; the result pane remained empty.
- Root cause: direct DOM value equality was treated as equivalent to provider-form state acceptance. The portal's controlled inputs perform their own typed/stateful validation, and the current trust warning also requires a separate live-authority comparison before another package. No claim is made that the server-side trust document changed.
- What was tried: enter the exact r9 policy/session values, verify native input values, submit once, confirm the visible RAM identity, reload the stale pre-login page and re-enter the same values. No attempt produced a RequestId, credential or call result.
- Fix/workaround: terminate revision 9 before issuance, preserve zero effects, and require a no-submit visible-form rehearsal plus a separately bounded read-only trust-policy comparison before revision 10. Do not modify RAM or infer issuance from button activation.
- Prevention: pre-package browser readiness must validate the framework-controlled form state, not only DOM properties. The execution guard must require visible typed-field acceptance, exact Policy persistence, exact caller identity and absence of trust warnings before starting a timed package.
- Resolution update: encoded URL parameters now prove stable typed/provider-controlled values without submitting. The earlier requirement for absence of trust warnings is superseded: a successful exact live GetRole proved the warning can remain despite matching trust. Readiness must compare authoritative live trust; the warning is recorded but not treated as authority.

### 2026-08-12 — Portal trust warnings are not RAM authority evidence

- Symptom: the AssumeRole page continued to say the role did not trust the caller while the immediately preceding authorized GetRole succeeded and returned the exact frozen trust document.
- Root cause: the portal's client-side trust validator is not the canonical RAM role source and can disagree with the live GetRole response. The exact internal cause of that portal disagreement was not investigated because no additional provider calls were authorized or needed.
- What was tried: reconfirm exact RAM identity, call GetRole once, canonicalize/hash the decoded policy, then load the complete AssumeRole form through URL parameters without submitting. Every authoritative field matched while the warning persisted.
- Fix/workaround: use exact principal identity plus canonical GetRole comparison for pre-package readiness; treat the portal warning as advisory only. Continue to require an actual provider RequestId/STS response before counting issuance.
- Prevention: never promote provider UI validation text into an authorization fact when a canonical read API exists. Record contradictions explicitly, but do not change RAM or widen permissions to satisfy a client warning.

### 2026-08-12 — Extending portal start alone cannot revive an expired execution timeline

- Symptom: the revision-10 authorization text changed portal confirmation start to 06:30:45.826 but retained an AssumeRole cutoff of 06:12:45.826 and qualification/live cutoff of 06:17:45.826; the text arrived around 06:28.
- Root cause: one stage deadline was edited independently of the immutable package-derived timeline, producing a sequence in which the prerequisite dispatch and handoff stages expired before the portal was allowed to start.
- What was tried: compare the received times with the prepared package and current system clock, then run only credential-free qualification/live/close offline preflights. No browser or cloud operation was attempted.
- Fix/workaround: reject the text before creating an acceptance, terminalize revision 10 with zero effects and require a new package for revision 11. Never reinterpret a later portal-start timestamp as an implicit extension of earlier or downstream deadlines.
- Prevention: before persisting acceptance, enforce both exact package equality and chronological satisfiability at receipt: `portal_start <= dispatch <= qualification/live <= credential_stop`, with sufficient remaining margins. Any changed timeline requires package regeneration and a new hash-bound authorization.

### 2026-08-12 — A role ARN and an assumed-role session ARN are different canonical identities

- Symptom: revision 11 passed local credential integrity and the only `GetCallerIdentity` call succeeded, but qualification failed exact equality before Workspace/Image reads.
- Root cause: the qualifier built its expected caller identity as `${controller_role_arn}/${session_name}`. Alibaba STS canonically changes the resource type from `role` to `assumed-role`, so the correct session identity is `acs:ram::<account>:assumed-role/<role-name>/<session-name>` rather than `acs:ram::<account>:role/<role-name>/<session-name>`.
- What was tried: exactly one authorized qualification invocation. After the local assertion failed, the attempt stopped; no retry, replacement credential, paid Job or capability enable followed.
- Fix/workaround: expire and retire revision 11. Before a new attempt, parse the frozen source role ARN and deterministically construct one exact expected assumed-role-session ARN; add strict positive and wrong-account/role/session/resource-type negative tests.
- Prevention: model source role identity and assumed session principal identity as separate typed forms. Cross-form comparison must use one explicit canonical derivation, never string append or loose matching.
- Resolution update: `buildScientificEvidenceP5AssumedRoleSessionArn()` now owns the explicit derivation and is shared by the live qualifier and durable qualification validator. Exact and five drift classes pass focused regression coverage; revision 11 remains historical and non-reusable.

### 2026-08-12 — A local-only retry can still violate an exact cloud execution sequence

- Symptom: the first revision-12 credential-integrity invocation failed before any qualification API, but the response was re-extracted and the local command was run again; qualification then continued.
- Root cause: zero external effect was incorrectly treated as sufficient authority to recover from a local representation failure. The exact acceptance instead said any receipt-generation failure must stop without retry.
- What was tried: visible Monaco text first, then full editor selection with immediate clipboard erasure. The latter recovered the complete token and produced a valid receipt, but it did not restore sequence authority after the first terminal failure.
- Fix/workaround: terminalize revision 12, clear authority and make no paid call. Record both integrity invocations and the later qualification reads rather than describing the run as conforming.
- Prevention: represent the attended sequence as an explicit monotonic state machine. A terminal failure bit must prevent every later credential-integrity, qualification and live entry regardless of whether the failed step was local-only.
- Resolution update: a centralized package/attempt state machine now owns permanent claim, matching completion and terminal records for all four execute stages. It claims before predecessor checks, rejects out-of-order calls permanently, and checks terminal state before credentials, cloud, capability or database work; only stable non-secret reason codes persist.

### 2026-08-12 — Visible Monaco text is not the raw credential response

- Symptom: DOM/body extraction produced a security-token string containing Unicode ellipsis and failed the visible-ASCII integrity gate; full editor selection produced a longer valid representation.
- Root cause: the portal virtualizes and visually abbreviates long string values. Rendered text is a presentation projection, not the editor model's raw response.
- Fix/workaround: revision 12 used full editor selection once, cleared the clipboard immediately and retained no credential value. This recovered representation integrity but cannot cure the separate no-retry violation.
- A redaction diagnostic also printed an incomplete rendered token fragment to transient tool output. The full token and credential tuple were not emitted or persisted, but rendered response lines must still be treated as sensitive.
- Prevention: perform a no-cloud rehearsal with synthetic long opaque data and pre-validate the exact extraction channel before a timed authorization. Never print rendered credential lines, redact before any tool emission, and reject any ellipsis before invoking the integrity command.

### 2026-08-12 — Generated SDK models can hide response-shape authority

- Symptom: revision 12 received HTTP 200 from exact `GetWorkspace(1450165)`, but the generated typed body exposed no `workspaceId`, making strict identity qualification impossible.
- Root cause: the historical raw response was not retained, so its exact provider key shape is unknown. A pure-local SDK experiment proved PascalCase numeric/string values are retained while camelCase values are omitted; this identifies a parser seam but does not retroactively prove the provider returned camelCase.
- Fix/workaround: keep revision 12 failed. For future attempts, preserve the one read's uncast response body, normalize only returned Pascal/camel aliases, and require exact package ID, status and RequestId before continuing.
- Prevention: when an API response field is an authority input, test raw→typed behavior across documented and observed aliases and retain a strict raw normalization seam. Never turn successful routing or the request path into proof that the response identified the authorized resource.

### 2026-08-12 — A read-only active check is not concurrency control

- Symptom: two same-stage invocations could both observe an active attempt before either operation began; a downstream prerequisite miss could also occur before the stage was permanently consumed.
- Root cause: the first design treated terminal checks and predecessor reads as authorization gates without an atomic stage ownership transition.
- Fix/workaround: acquire one attempt-level execution lock, then atomically publish a permanent stage claim before every predecessor/operation boundary. The shared service owns the exact four-stage order; completion requires the matching claim, and every post-claim failure terminalizes the attempt. A concurrent loser cannot claim or terminalize while the winner owns the lock.
- Prevention: any one-shot workflow must separate observation from ownership and serialize all mutually dependent stages, not only duplicates of one stage. A read can inform diagnostics, but only an exclusive durable transition may grant entry to side effects; crash-orphaned ownership is fail-closed unless a separately authorized recovery protocol exists.

### 2026-08-14 — Official-image ownership is not the P5 Job workspace

- Symptom: revision 14 passed credential integrity but its sole qualification invocation terminalized under the deliberately generic stable failure code before paid execution. No partial operation ledger was persisted, so the exact failed sub-operation cannot be asserted from terminal evidence alone.
- Root cause: the P5 qualifier reintroduced a contract error already proven against this exact public official image: it required optional `GetImage.workspaceId` ownership metadata to equal DLC target workspace `1450165`. Earlier production reads returned HTTP 200 while omitting that optional field, and the installed SDK declares it optional.
- What was tried: inspect the immutable attempt records and zero-effect database census, compare the current assertion with two earlier production image reads, the installed SDK model and the official API field semantics, then run the correction through the project debug approval gates. No qualification retry, replacement STS or extra cloud read was attempted.
- Fix/workaround: represent observed image ownership as `string | null`, canonicalize absence to `null`, reject malformed present values and remove target-workspace equality. Preserve exact ImageId/URI/accessibility/request-id verification; keep target workspace authority in the separate exact `GetWorkspace` response and frozen Job profile.
- Prevention: never reuse optional asset-ownership metadata as execution-placement authority. Regression coverage must include absent ownership, different valid ownership and malformed ownership while proving all independent placement and identity fences remain intact.

### 2026-08-14 — An attempt-scoped output prefix can violate the provider payload root contract

- Symptom: revision 15 passed credential integrity and all three read-only qualification calls, then its sole live invocation terminalized before any Attempt or provider Job existed.
- Root cause: the package/profile/session policy isolated results under `output/t136-p5/scifact/attempt-13/`, but the maintained payload materializer requires `output_uri_prefix` to be exactly the regional bucket `output/` root and deterministically appends Run id and Cell key. Pre-package checks compared profile equality but never exercised pure payload materialization, so both cells were eligible on paper but locally unmaterializable.
- What was tried: honor the permanent live terminal, clear credentials/capabilities without retry, run credential-free live/close censuses, time the read-only protected-table digest and invoke the pure materializer for both exact cells without provider or database writes. Both cells reproduced the same `REAL_PROVIDER_PAYLOAD_INVALID` error.
- Fix/workaround: keep revision 15 terminal. For a separately approved successor, use the root output prefix and bind session-policy/result-reader authority to the actual derived `output/<run-id>/<cell-key>/` objects; do not relax the payload service's content-addressed regional-root fence.
- Prevention: the deterministic package preflight must materialize every exact provider payload and reconcile the resulting output URIs with session-policy resources and result-reader scope before package hashing. Profile schema/equality alone is not execution readiness.
- Resolution update: revision 16 implements that preflight. The profile now supplies the regional `output/` root, the materializer derives Run/Cell directories, and the controller reads only `output/<run-id>/*`. The focused P5 lane passes 60/60 and both exact frozen production cells materialize locally; revision 15 remains terminal.

### 2026-08-14 — A table-filtered schema dump is not the maintained recovery contract

- Symptom: the first revision-16 recovery candidate selected only schema objects belonging to the 114 scoped authority tables and produced 2,036 accepted TOC entries; the maintained validator rejected it before package preparation.
- Root cause: the established recovery model pairs exact scoped table data with a complete schema-only dump. Filtering schema ownership omitted the database-global `vector` extension declaration/comment that the historical 2,038-entry restore contract includes.
- What was tried: validate the candidate against the existing recovery manifest semantics, compare its TOC with the previous verified full schema dump and identify the two missing global extension entries. No restore or database write was attempted.
- Fix/workaround: delete the failed temporary dump/manifest, preserve the prior current manifest until a complete replacement exists, and create the full schema-only dump plus exact 114-table data dump. Revision-16 recovery then passed hash, TOC, fingerprint and mode checks.
- Prevention: scope P5 recovery data, not the schema authority needed to restore it. Reuse the maintained full-schema/exact-data split and validate a temporary candidate before rotating the current manifest.

### 2026-08-14 — Post-issuance DOM snapshots can disclose credential response data

- Symptom: after the successful revision-16 `AssumeRole` call, an automated portal DOM snapshot emitted security-token contents to transient tool output even though the repository, clipboard and final records were intended to remain secret-free.
- Root cause: the result view exposes its Monaco response model through the DOM/accessibility projection; treating the page as ordinary inspectable UI caused the tool boundary itself to become a disclosure channel.
- What was tried: do not repeat the provider call; select the complete editor value once for the authorized in-memory handoff, immediately clear the clipboard and parent-process buffers, leave the result page, finalize browser control and verify that no credential value reached repository files.
- Fix/workaround: treat the transient output as sensitive disclosure and retain only the secret-free issuance metadata, integrity receipt and qualification record. The tuple was not intentionally logged elsewhere and was cleared before the live child continued.
- Prevention: after a credential-producing action, never request a generic page/DOM snapshot. Use a prevalidated extraction path that neither renders nor echoes secret values, and finalize browser control immediately after the one handoff.

### 2026-08-14 — Matching metric keys do not imply matching observation identities

- Symptom: both revision-16 provider Jobs succeeded and returned schema-valid envelopes, yet each collection persisted only `diagnostic_only`; no `scientific_source` or downstream scientific row was created, and the P5 live runner waited until its deadline.
- Root cause: the workload used metric key `micro_recall_ppm` as its observation key, while the preregistered protocol deliberately names the observation slot `scifact_micro_recall_ppm`. Package readiness validated the parser/schema/protocol and materialized provider payloads but never exercised the workload output through exact scientific sealing.
- What was tried: compare immutable Job/collect rows with the frozen code and protocol, trace the production sealer's exact keyed lookup, then reproduce the mismatch locally without provider, credential or database state. The negative regression returned `observation_slot_mismatch` deterministically.
- Fix/workaround: align only the workload observation identity, share one live/preflight output builder, byte-bind package preparation to the exact entrypoint and seal both cell outputs through the production preparer. Add a P5-only terminal source gate so diagnostic-only completion fails immediately; keep generic collection behavior unchanged.
- Prevention: paid readiness must prove the exact executable bytes can produce one fully sealed source for every frozen cell, not merely validate schemas and payload materialization. Treat metric identity and observation-slot identity as separate contract fields, and never rewrite historical remote-artifact manifests after a local source fix.

### 2026-08-15 — Generated client readiness does not prove the target database is migrated

- Symptom: revision 17 ran code that could construct a valid `scientific_source`, both provider Jobs succeeded and both exact result objects existed, yet the first source insert failed and its collect command remained claimed with no durable output/error.
- Root cause: the named-local database had not applied `20260808090000_add_scientific_source_and_packet_closure_binding`; its legacy CHECK admitted only `diagnostic_only`. The failure fallback then assigned a non-null `terminal_at`, mapped to `collectedAt`, while the maintained Collection CHECK requires failed rows to keep that field null. The second rejection masked durable recording of the first error.
- What was tried: inspect only exact PAI Job status, OSS object metadata, local rows, PostgreSQL logs, migration history and live constraints. Object bodies were not read and revision 17 was not replayed, reclaimed or repaired.
- Fix/workaround: deploy the existing additive migration through the repo-prisma SSOT workflow after a verified recovery point; keep failed Collection `collectedAt` null; require the exact migration and scientific constraints before P5 can read credentials or enable capabilities.
- Prevention: every paid path whose code depends on raw SQL constraints must check target migration history and contract-defining constraints, not merely target identity or generated-client compatibility. Test the original operation and its failure-persistence fallback as one regression pair.
