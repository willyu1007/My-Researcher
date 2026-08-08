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
- Never make P5 eligibility or `M0-SCI` passage depend on a preferred positive/negative/inconclusive result. Eligibility is pre-run and acceptance is outcome-agnostic. Search: `P5-ELIG-S`, `outcome-agnostic`.
- Never authorize a mutable workload description or a generic capability window. Authorization binds one exact package hash, two `CreateJob` operations, cost ceiling, capability set, TTL and credential/recovery policy. Search: `package hash`, `single-use authorization`.
- Never silently replace or auto-resubmit a failed/cancelled P5 Job. Fail the attempt; another execution requires a new immutable Run/package and user authorization. Search: `exactly two CreateJob`, `new authorization`.
- Never add redundant composite unique indexes solely to persuade Prisma that an already uniquely owned optional relation is one-to-one. Keep the physical scalar ownership fence and use list reverse navigation when singular navigation would inflate the schema. Search: `list-valued back-navigation`, `DB-B`.
- Never use the randomized-schema smoke lane as the sole verdict for a migration history containing `pgvector`; the extension type installed in `public` is not visible under its isolated search path. Confirm with a fresh disposable database and zero drift. Search: `type vector does not exist`, `ci:prisma-smoke`.
- Never let historical v1 validation tests fall through to the default product reader. Legacy Result validation must opt into the same explicit test/migration-only compatibility switch as the legacy observation writer. Search: `legacyObservationWriterEnabled`, `loadSourceBoundRunResults`.
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
