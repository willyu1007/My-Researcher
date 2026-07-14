# 05 Pitfalls — Do Not Repeat

`05-pitfalls.md` is append-only for resolved failures and dead ends encountered while executing T-132. Active findings belong in `06-audit-closure-matrix.md`.

## Pack A execution findings — 2026-07-13

- Do not let a uniqueness error become the concurrency contract. Concurrent identical admission must re-read the committed command and converge only after exact semantic comparison; changed payload remains a terminal conflict.
- Do not hash only an event's domain payload. The canonical hash covers the complete typed integration envelope so correlation/scope/type/version drift cannot replay under an unchanged inner payload.
- Do not model same-content freeze replay as “no command happened.” Each family has a freeze-command receipt: a new command key may reuse the immutable revision but must remain durably idempotent; the same key with changed content fails closed.
- Do not rely on JSON snapshots alone for identity-bearing dependencies. Dataset policy, Benchmark corpus/query roles, Protocol benchmark/metric order, branch current/head sequence and admission/revision parity require relational owners and database negative tests.
- Do not let an intake capability stop relay/consumers. Default-off rejects T1 only; committed T1 work must drain through T4.
- Do not let a timed-out Docker command leave a live child or open pipe. The gate now kills the child, destroys stdout/stderr and resolves the timeout path before cleanup.
- Do not substitute a test-only unresolved policy fixture for original-source evidence. A01-B10 passed in the historical technical run while the source-backed gate correctly remained `SOURCE_POLICY_UNRESOLVED`; the later final run closed the blocker only after exact attestation and persisted Dataset/DataPolicy binding matched.
- Do not report the five one-row legacy sentinels created inside the disposable gate as a recount of the existing local database's `1/1/231/15/6` legacy population. The gate proves zero existing-database reads and unchanged isolated sentinels; the implementation-start record separately preserves the live baseline digest.

## Do-not-repeat summary
- Do not accept readiness outside the materialization transaction and then write against that stale decision. Re-fence the exact attestation, ordered dependency manifest, lifecycle projections and Dataset location in the same transaction before the first T2 write.
- Do not conflate a typed family's stable key with `logical_id`, or persist draft schema/hash copies that no reader trusts. Keep family keys independently unique/immutable and derive draft schema/hash from typed content; immutable revisions own canonical server hashes.
- Do not keep VersionLock snapshot placeholders beside relational exact dependencies. Ordered dependency rows plus one server-derived lock hash are the authority; duplicate snapshot JSON creates drift without adding a contract.
- Do not hide an N-cell query/write fan-out behind a passing two-cell fixture. Batch E1 replay lookup and inserts, group latest Attempt sequences, cache readiness traversal and retain a high-cardinality real-PostgreSQL query-shape test.
- Do not run the source-backed D-19 gate without the explicit reviewed attestation path and then reinterpret `SOURCE_POLICY_UNRESOLVED`. Missing source-policy input must remain blocked; rerun with the reviewed artifact rather than weakening the gate.
- Do not pass a Prisma `DATABASE_URL` containing `?schema=` directly to `pg_dump`; `pg_dump` does not understand Prisma query parameters. Split host/port/database/user into PostgreSQL-native arguments/environment, reject a zero-byte placeholder and verify the new custom-format dump before migration apply.
- Do not assume named-schema index definitions are always quoted. Normalize both quoted and unquoted schema qualification before comparing source/live definitions, then hash the normalized complete set.
- Do not call `pnpm` with a raw `node` argument when environment-file handling depends on command separation. Use the repository script or `pnpm exec -- node ...` so pnpm does not reinterpret the env-file path.
- Do not digest a large database with `ORDER BY to_jsonb(row)` or `jsonb_agg`; both can force full materialization/sort. Stream rows in catalog primary-key order through a bounded read-only cursor and hash length-prefixed canonical row text outside PostgreSQL.
- Do not let unrelated live-schema drift broaden a reviewed migration apply. Use the approved versioned SQL through `prisma migrate deploy`; never substitute `migrate dev` or `db push` on the named target.
- Do not use a PostgreSQL 14 `pg_dump` against the PostgreSQL 17 local server. Pin a server-compatible client and verify the custom-format recovery point with `pg_restore --list` before apply.
- Do not quote boolean local override values as YAML strings. Env-contract compilation requires native YAML booleans before `.env.local` generation and app startup.
- Do not fabricate a local Project/ValidationCycle or saga to make the named-target census resemble the disposable D-19 fixture. Local landing proves apply/population/cutover; `packa-d19-source-policy-20260713-r2` proves the exact T1–T4 authority spine.
- Do not interpret control-plane source-policy PASS as full-corpus download, extraction reproducibility, scientific dataset alignment, provider execution, DB apply or product cutover.
- Do not treat a caller-supplied domain hash as canonical content identity.
- Do not use generic upsert authority for frozen records.
- Do not let a readiness result survive a target or dependency revision change.
- Do not equate payload/schema completeness with scientific validity.
- Do not call free-shape EvaluationProtocol JSON or string validity notes executable rules. Product validation uses one canonical typed required-rule set and exact code-supported type/version only.
- Do not silently ignore, best-effort, LLM-interpret or human-waive an unsupported scientific rule. Return `UNSUPPORTED_RULE` before Run freeze/dispatch and create no EvidenceCandidate.
- Do not validate one job/cell and infer that the immutable 1..N-cell batch Run passed. The exact Run/manifest, all ordered cell results, protocol and validator profile belong to one validation hash/report.
- Do not let generic record routes, adapters, monitors or callers create validation reports/EvidenceCandidate; ScientificValidationService is the sole generated-trust writer.
- Do not reintroduce `accepted_partial`, partial-evidence grades or a human upgrade path for incomplete output.
- Do not turn `manual_promote` into a waiver: the command is catalog curation only and must not grant readiness, upgrade evidence trust or override deterministic blockers.
- Do not accept caller-authored canonical refs or split promotion decision from canonicalization/Candidate/outbox writes; retry must converge through the same idempotency key.
- Do not let adapters, monitor routes, recovery jobs, manual attachment or Sidecar write RunEvidenceUnit directly; all must use the PI-owned identity-only Evidence Trust Gateway.
- Do not create RunEvidenceUnit or FailureEvidenceUnit for failed/cancelled/incomplete execution merely to preserve visibility; freeze only D-18 current-effective branch/revision/head Run/cell/Attempt facts in the Cycle snapshot and reserve RunEvidenceUnit for verified EvidenceCandidate.
- Do not encode negative/inconclusive scientific disposition as execution failed/cancelled/incomplete. A complete protocol-valid result remains execution-completed even when its scientific disposition is negative or inconclusive.
- Do not store `positive | negative | inconclusive` on EF validation or RunEvidenceUnit. EF protocol `passed` qualifies evidence; only the closed PI ValidationCycle owns contextual scientific disposition.
- Do not let Result Analysis scenarios, Domain Gate, a direct ResultInterpretationPacket request or caller-authored `cycle_assessment`/`decision_exit` become a scientific-conclusion writer. The model proposes; the existing Cycle-closure action/ClosureService writes once and derives the selected exit.
- Do not treat null scientific disposition as `inconclusive`. Null means no scientific conclusion, including no eligible evidence/control-only closure; inconclusive is an explicit research conclusion over eligible evidence.
- Do not add a ScientificConclusion aggregate or second confirmation to repair the chain. Reuse the existing ValidationCycle closure authority and keep Packet→closed Cycle direction one-way.
- Do not let Claim/Dossier/next-step/motive/retrieval consumers read an open proposal, infer a conclusion from project-wide REUs or feed PI disposition back into EF/old Run state.
- Do not let dossier readiness scan project-wide failed-like RunEvidenceUnits, infer Cycle scope from REU population or use Sidecar as a fallback ledger. Dossier consumes only declared closed-Cycle snapshot refs/hashes.
- Do not make PaperExperimentSidecar independently mutable or authoritative. Sidecar only references/rebuilds the closure snapshot/hash and authoritative events for display.
- Do not ship the D-16 migration as dual-read, compatibility alias or staged coexistence of old/new accounting paths; replace the old writers, status semantics, dossier scan and acceptance tests atomically, while preserving historical rows as audit-only.
- Do not add a confirmation for each failed Run, snapshot entry or dossier accounting check. D-16 reuses the existing Cycle-closure and dossier-export actions.
- Do not turn an invalid PI-before-PaperProject call order into a late-binding subsystem; require PaperProjectIntake and both bridge refs before bootstrap, and route historical null bindings to D-08.
- Do not invoke external side effects before a durable attempt/idempotency record exists.
- Do not claim exactly-once external execution; prove idempotent reconciliation.
- Do not mint trusted EF/PI evidence through multiple routes or caller-declared refs.
- Do not implement project isolation as client-only filtering.
- Do not call source-string checks or direct API calls a desktop E2E.
- Do not treat LocalScript/fake-provider lifecycle success as a real experiment or scientific evidence; the desktop is a control plane and formal execution is cloud-only.
- Do not build a local container/worker training platform merely to compensate for the first release's deliberate zero-training boundary.
- Do not turn legacy retention into a summary, comparability, revalidation or PI-consumption subsystem; keep existing rows unchanged and diagnostics/admin-read-only.
- Do not conflate PI WorkOrder revision authority with EF generic-record revisions, or let EF resolve a paper-bound command from a logical id/`latest`; bind exact Cycle/branch/WorkOrder revision/hash/Run-manifest/required-cell/TaskSpec/Attempt scope.
- Do not infer a branch head with `MAX(created_at)` or assume one ValidationCycle has one global latest Run; each branch has an explicit sequence-fenced `RunManifestFrozen → BranchHeadAdvanced` head.
- Do not turn experiment retrieval into an EF-owned or global domain truth, reuse Literature tables as the PI/EF index, or let vector availability enter the control/trust path.
- Do not generate EF/model/post-hoc summaries for semantic search; deterministically project admitted PI Cycle/branch planning fields, filter permissions before ranking and re-resolve exact sources.
- Do not confuse older v2 WorkOrder revisions/Runs with D-08 legacy records, but do not place that history in Cycle closure either. Keep non-head v2 history structurally queryable; only an explicit current-revision comparison ref may make a prior trusted result contextual input.
- Do not infer whether a plan change is “large enough” for a fork. PI must issue `revise | fork`; unchanged frozen branch-frame hash permits revision/re-admission, while any semantic-frame/relation change requires a new branch.
- Do not rebind an in-flight/completed Run when a new revision or branch appears, and do not collapse `current_admitted_revision_id` into `head_run_id`.
- Do not let EF write PI head state, PI write EF Run state, or repair the boundary with a shared table, distributed lock, cross-domain authority transaction—even under one database—or 2PC. Use idempotent outbox/inbox ownership.
- Do not create or dispatch the first Attempt before EF durably consumes the exact `BranchHeadAdvanced` acknowledgement; a stale unacknowledged Run must remain side-effect-free lineage.
- Do not advance head at first dispatch/completion or select head by success, metric, EvidenceCandidate, semantic rank or a human action. Head means latest frozen lineage.
- Do not roll back a failed/cancelled head to an older successful Run or auto-cancel an already executing old Run when a new head appears.
- Do not create one Run per seed/repeat/parameter cell and then repair completeness with a RunSet/RunGroup. One paper-bound revision owns one immutable required-cell batch Run; cells are value objects and retries are cell-scoped Attempts.
- Do not append cells, run dynamic HPO or rerun a completed cell as a “technical retry” because its metric is disappointing. Any scientific cell-set/content change requires a new WorkOrder revision and admission.
- Do not back-write EF's later `run_manifest_hash` into PI's already admitted `approved_plan_hash`. Bind the deterministic manifest to the exact revision/hash and fail closed if the same revision materializes differently.
- Do not let simulation Attempts satisfy required-cell scientific completeness or create a second Run solely for mode separation. A later real Attempt may reuse the exact Run/cell only while the Cycle remains open; after closure, follow-up requires a successor Cycle/new Run lineage.
- Do not call the mode-neutral batch Run a “simulated Run” or map terminal simulation Attempt success/failure/cancellation onto scientific Run completed/failed/cancelled. With no eligible real result, the Run/cells remain scientifically `not_started`.
- Do not persist `workflow_simulation_status` as a second scientific truth. Rebuild the projection from simulation Attempt events, and never feed that status to ExperimentResult, ResultValidationReport, EvidenceCandidate or the Evidence Trust Gateway.
- Do not let `control_flow_validated_no_paper_evidence` mutate EF facts or imply evidence eligibility; the value is a PI Cycle `closure_kind` over D-18 exact scope, always paired with `scientific_disposition=null`, `selected_exit=null` and `evidence_eligibility=false`.
- Do not treat ValidationCycle closure as a full-history archive. Freeze the canonical admitted branch set and each branch's current revision plus matching effective head/cells/Attempts at one CAS watermark; non-head Runs remain read-only lineage.
- Do not substitute an older branch head when the current admitted revision has no matching frozen head. Keep the branch in the candidate, return `BRANCH_HEAD_NOT_FROZEN` and commit no closure until the exact head saga converges.
- Do not limit the active-real-Attempt check to snapshot members. A non-terminal real Attempt on any Run in the Cycle, including a non-head Run, blocks closure.
- Do not let search, semantic similarity, project history or dossier scans import old results. Comparison use requires an exact immutable v2 ref/hash on the current admitted revision and does not expand execution-accounting scope.
- Do not accept a stale closure preview after branch/revision/head/manifest/Attempt drift. CAS returns `CYCLE_CLOSURE_SCOPE_DRIFT` with zero partial write and rebuilds the proposal/snapshot.
- Do not reopen a closed Cycle or append revision/Run/Attempt lineage to the closed Cycle. Follow-up execution starts from a successor ValidationCycle, and ResultInterpretationPacket remains a post-closure projection outside the closure hash.
- Do not accept an EF-only identity/readiness refactor as the first product slice. D-19 acceptance must cross the PI/EF seam through durable `BranchHeadAdvanced` acknowledgement.
- Do not treat D-19's pre-bound Cycle fixture as a bootstrap bypass or final golden scenario. Binding and v2 readiness must be real; product bootstrap/import/promotion remain separately verified prerequisites.
- Do not use a one-cell fixture, legacy singular `trainingTaskSpecRef`, HarnessRun or provider job row to satisfy the batch-Run spine. D-19 uses two admitted cells and one canonical batch Run/manifest.
- Do not let D-19 create an ExecutionAttempt, provider request, result/evidence/closure/UI/search record or a second `dispatch_eligible` truth. The exact durable acknowledgement is the slice endpoint.
- Do not claim D-19 implements D-18 runtime blocking merely because the contract mentions `CYCLE_ACTIVE_REAL_ATTEMPT`; D-19 creates zero Attempts and later closure tests must prove the non-head active-real blocker.
- Do not collapse D-20 into one cross-domain transaction because PI and EF currently share Postgres or Prisma. Each authoritative Unit of Work writes one domain's canonical/inbox/outbox tables only; shared mutable tables/repositories, distributed locks and 2PC are forbidden.
- Do not record an inbox receipt before the consumer's domain mutation or emit the consumer outbox after that mutation commits. Receipt, domain outcome and emitted outbox are one local transaction or all roll back.
- Do not treat relay `published`/`delivered` state as a consumer acknowledgement. EF's exact processed `BranchHeadAdvanced` inbox receipt is the sole durable acknowledgement and dispatch prerequisite; do not add `HeadAcknowledged`, a Run boolean or `dispatch_eligible` mirror.
- Do not count relay lease/retry bookkeeping as a fifth domain step or use “four transactions” to prohibit infrastructure persistence. The invariant is four successful domain-authority commits; infrastructure transactions carry no domain authority.
- Do not reuse the governance file/JSONL outbox, singular WorkOrder/HarnessRun/live-adapter sequence or generic EF record upsert as D-20 persistence. Reuse only repository-local transaction, CAS, unique-key/hash conflict and rollback-test patterns.
- Do not extend or annotate singular WorkOrder/HarnessRun/generic EF records to become v2 branch/revision/Run/inbox/outbox authority. D-21 requires independent typed additive table families and leaves every legacy row unchanged.
- Do not interpret default-off as “try v2, then fallback”. Capability-off rejects new intake with zero write; product services cannot union legacy/v2 reads or call a legacy writer after a v2 rejection.
- Do not stop relay or consumers when disabling v2 admission. The switch gates only new PI intake; every already committed D-20 saga must drain to the exact EF acknowledgement before becoming read-only.
- Do not roll back by dropping v2 rows/events, converting v2 lineage to legacy or reopening an overlapping legacy writer. Preserve immutable audit state and fail closed for new intake.
- Do not let offline shadow comparison become product dual-read. Aggregate coverage/digest verification stays outside domain records and cannot influence routing, return values or authority.
- Do not future-proof the first migration by adding Attempt/provider/result/validation/evidence/closure/UI/search/legacy-mapping tables. D-22 permits only the Phase 1 trust substrate needed by D-19 and the D-19 admission-to-ack spine.
- Do not repair schema uncertainty with generic `kind/payload`, EAV, caller hashes or cross-domain FKs. Identity/CAS/order/binding/idempotency are relational; only named schema-versioned typed scientific snapshots use server-hashed canonical JSON.
- Do not persist a second Run-manifest payload, capability/eligibility state, acknowledgement aggregate/event, Run acknowledgement flag or `dispatch_eligible` mirror. The manifest derives from ordered immutable RunCell rows, the capability is configuration and the final EF inbox receipt is the acknowledgement.
- Do not encode D-19's two-cell acceptance fixture as a database cardinality rule. The product invariant remains one WorkOrder revision with `1..N` ordered cells.
- Do not treat D-22 as final Prisma naming, DDL, DB apply or implementation/product-enable authorization. Those are later explicit review and approval steps.
- Do not admit parameter ranges, generator metadata or seed counts without a canonical exact scientific cell list/hash. They are draft authoring inputs, not execution authority.
- Do not let EF sample, default scientific seed/parameters/result contracts, add, drop, reorder, substitute or otherwise choose cells after admission. EF materialization must preserve one-to-one admitted-cell parity or fail before Run/head/Attempt.
- Do not require TaskSpec refs/hashes before WorkOrder admission or ask a researcher to copy them. EF resolves or exact-reuses TaskSpecs after admission and records their bindings in the Run manifest.
- Do not use `autotune_policy`, `allowed_mutation_refs` or retry budget to mutate a v2 paper-bound scientific cell at runtime. Retry budget is for technical Attempts of the same exact cell; cell changes require a new revision/admission.
- Do not add a CellPlan aggregate, generator registry/DSL or per-cell approval to implement D-15. The exact plan is an embedded WorkOrder revision value collection and remains one admission action.
- Do not create a second human-decision record merely because a coordinator is paused; CoordinatorStop points to the owning Gate/action and resumes automatically after the durable domain decision succeeds.
- Do not request confirmation per Run, ExecutionAttempt, safe retry, sync, collect or reconcile inside an admitted WorkOrder boundary, and do not put manual catalog promotion on the normal PI experiment path.
- Do not use one unexplained product-wide number for human intervention. Freeze each golden scenario's project/Cycle/branch/revision/claim/export/external-effect cardinality, then count Initiation/Authority/Recovery/Plumbing actions against the named-gate formula.
- Do not hide manual repair or internal ref/hash/JSON transfer inside a generic “confirmation” count. RecoveryAction and PlumbingAction are separate; both must be zero on the fixed T-132 and T-124 happy paths.
- Do not apply a Prisma migration without the required diff and approval workflow.
- Do not overwrite or stash the concurrent T-124 working-tree changes.
- Do not recreate retired desktop renderer style paths; use `data-ui` and Tailwind B1-layout-only.

## Pitfall log

### 2026-07-13 — Full-history closure scope created a cross-module dual track
- Symptom: D-16 described a full in-scope experimental history while D-17 and branch-head semantics implied one current head per admitted branch; Packet and post-closure iteration language also allowed circular or reopened authority.
- Context: implementation-readiness review after OQ-17 alignment.
- What was tried: treating every historical Run as closure accounting so old failures remained visible.
- Why the attempt failed: full-history closure required cross-module history membership, conflicted with head authority, made snapshot concurrency undefined and risked project/history scans becoming a second dossier/interpretation path.
- Fix/workaround: D-18 freezes one CAS-fenced current-effective branch/revision/head scope, keeps non-head history query-only, makes comparison refs explicit, blocks on every Cycle-wide active real Attempt and seals the closed Cycle.
- Prevention: every closure/readiness/dossier contract and test must name the watermark, branch membership, current revision, effective head/null-head rule, active-Attempt fence and post-closure write prohibition.
- References: `02-architecture.md` D-18; `03-implementation-notes.md` D-18; `06-audit-closure-matrix.md` EF-P24.

### 2026-07-13 — First-slice extremes either hid the seam or swallowed the product
- Symptom: an EF-only trust-kernel slice could pass without proving PI/EF identity agreement, while a full no-evidence control-plane slice would couple provider, closure, UI and migration before the Run authority spine existed.
- Context: post-readiness alignment after D-18.
- What was tried: comparing an isolated Phase 1 acceptance with an end-to-end control-plane/Cycle closure acceptance.
- Why the attempt failed: the first option was not product evidence; the second was too large and repeated the earlier dependency inversion.
- Fix/workaround: Phase 1 first closes the minimal real v2 trust substrate as a separate entry gate; D-19 then consumes those ready inputs in a two-cell PI admission→EF materialization→Run manifest→PI head→EF acknowledgement slice and stops before Attempt/provider/evidence/closure.
- Prevention: first-slice evidence must include real cross-module persistence/replay and a zero-excluded-record/effect scan; later phases retain their own gates.
- References: `02-architecture.md` D-19; `04-verification.md` D-19 acceptance; `06-audit-closure-matrix.md` EF-P25.

### 2026-07-13 — Same database was mistaken for one consistency boundary
- Symptom: existing text prohibited cross-database transactions but could still be implemented as one Prisma transaction that writes both PI and EF, while consumer inbox receipts and outboxes were not explicitly co-committed with domain state.
- Context: D-20 implementation-readiness review after D-19 scope confirmation.
- What was tried: evaluating one same-Postgres transaction, a distributed/2PC model and four domain-local commits with inbox/outbox replay.
- Why the attempt failed: the first two choices erase bounded-context ownership or couple availability, and the underspecified inbox sequence permits receipt-first/state-first crash gaps and false delivery acknowledgement.
- Fix/workaround: D-20 fixes four domain-owned authoritative Unit-of-Work commits, atomic consumer inbox/domain/outbox outcomes, exact idempotency/conflict semantics and relay replay. EF's processed `BranchHeadAdvanced` inbox receipt is the sole acknowledgement.
- Prevention: transaction ownership scans, four-boundary crash injection and zero shared-write-table/repository checks are mandatory before D-19 implementation acceptance.
- References: `02-architecture.md` D-20; `04-verification.md` D-20 acceptance; `06-audit-closure-matrix.md` EF-P26.

### 2026-07-13 — Extending legacy looked additive but preserved two meanings
- Symptom: adding branch/revision/head/cell/inbox/outbox fields to the singular WorkOrder and generic EF record appeared to reduce table count, while the same rows would still retain mutable single-TaskSpec/job and overwrite-capable generic semantics.
- Context: D-21 physical-storage review after the D-20 transaction boundary was frozen.
- What was tried: extending legacy tables, dual-writing both models, or creating independent domain-owned v2 table families behind a default-off entrance.
- Why the attempt failed: extension and dual write cannot enforce one immutable authority, leave fallback pressure in product repositories and make rollback/cutover depend on reconstructing partial legacy lineage.
- Fix/workaround: D-21 uses expand-only typed PI/EF v2 families, unchanged diagnostics-only legacy rows, one explicit post-D-19 product entrance cutover and rollback by stop-new-intake plus saga drain.
- Prevention: capability-off zero-write/no-fallback tests, legacy digest parity, repository/view union scans, cutover writer-closure checks and mid-saga disable recovery are mandatory.
- References: `02-architecture.md` D-21; `04-verification.md` D-21 acceptance; `06-audit-closure-matrix.md` EF-P27.

### 2026-07-13 — Future-complete schema planning widened the first migration
- Symptom: treating every future PI/EF concept as a first-migration concern mixed trust-substrate and Run-head work with Attempt/provider/result/evidence/closure/search persistence before the first cross-module spine was proven.
- Context: D-22 schema-boundary review after D-21 fixed additive v2 ownership.
- What was tried: one future-complete schema, a generic `kind/payload` authority and persisted capability/dispatch mirrors intended to defer later choices.
- Why the attempt failed: those shapes hide domain invariants in JSON, create cross-phase coupling, invite duplicate authority and make D-19 failure diagnosis and rollback materially less robust.
- Fix/workaround: D-22 limits Implementation Pack A to the Phase 1 typed identity/readiness families required by the fixture and the D-19 branch/revision/cell/materialization/Run/inbox/outbox spine. Relational fields own structural invariants; named typed canonical snapshots own frozen scientific values.
- Prevention: the schema census must prove excluded-family count, generic-EAV count, cross-domain-FK count, duplicate-manifest count and persisted-capability-mirror count are all zero before implementation acceptance.
- References: `02-architecture.md` D-22; `04-verification.md` D-22 acceptance; `06-audit-closure-matrix.md` EF-P28.

### 2026-07-13 — Readiness language recreated forbidden schema authorities
- Symptom: current planning text still named a capability table, and the PI adoption text listed Run manifest content as an independent canonical JSON snapshot after D-22 had forbidden both shapes.
- Context: Implementation Pack A readiness closure after D-22 documentation synchronization.
- What was tried: retaining generic “capability table” and “manifest content” language as implementation shorthand.
- Why the attempt failed: the shorthand permits a persisted eligibility/dispatch authority and a second mutable manifest truth, recreating the exact dual-track risks D-20 through D-22 removed.
- Fix/workaround: the capability is now the PI-owned default-false `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED` configuration guard, and `run_manifest_hash` derives only from ordered immutable RunCell/TaskSpec bindings. `07-implementation-readiness-review.md` freezes the exact fields and checks.
- Prevention: semantic scans and B08/B09 excluded-shape checks must reject capability/eligibility tables, acknowledgement mirrors, manifest JSON authority, generic asset payloads and cross-domain FKs before migration review.
- References: `07-implementation-readiness-review.md`; `02-architecture.md` D-22; `04-verification.md` readiness closure.

### 2026-07-13 — Source-policy PASS was narrower than scientific readiness
- Symptom: the technical gate passed A01-A04/B01-B10 but lacked official source-policy evidence; either default-passing the test policy or treating later license/access closure as scientific readiness would overstate the result.
- Context: Pack A source-policy closure after `packa-d19-final-20260713-r2` correctly returned `SOURCE_POLICY_UNRESOLVED`.
- What was tried: retaining test-only unresolved policies for the technical run, then supplying exact Wikimedia and commit-pinned NQ attestations through the reviewed gate input.
- Why the attempt failed: test policy cannot prove official source identity/license/access, while source identity/license/access alone cannot prove corpus extraction, temporal alignment, metric validity or provider execution.
- Fix/workaround: `packa-d19-source-policy-20260713-r2` bound both exact Dataset/DataPolicy revisions, passed with `blockers=[]` and preserved the scientific/execution exclusions.
- Prevention: every closure summary must name the tier as control-plane source binding and list extraction, scientific alignment, provider execution, DB apply and cutover as separate gates. Gate/backend validator duplication remains fail-closed but should be generated from one source; any reuse of the fixture builder outside the scenario loader must move reviewed-attestation enforcement into the builder.
- References: `artifacts/source-policy/01-official-source-policy-evidence.md`; `artifacts/implementation/01-pack-a-source-policy-closure.md`; `04-verification.md`.

### 2026-07-13 — Live datamodel diff included unrelated historical drift
- Symptom: the live-database-to-datamodel preview included old TopicSelection index-name/default differences in addition to the approved Pack A additive migration.
- Context: named local-development DB apply after Pack A source-backed closure.
- What was tried: inspecting the complete live-to-code diff before choosing an apply command.
- Why the attempt failed: using `prisma migrate dev` or `prisma db push` would have mixed unrelated historical drift into the Pack A landing and invalidated the reviewed migration boundary.
- Fix/workaround: apply only `20260713180000_add_experiment_foundation_d19_v2_spine` through `prisma migrate deploy`, then verify the migration checksum, 34-table census, zero cross-domain FK and unchanged five-table legacy digests.
- Prevention: treat live-to-code diff as a drift detector, not authorization to reconcile the target; named-target landing must execute only reviewed versioned SQL.
- References: `artifacts/db/local-development-20260713/00-preapply-baseline.md`; `artifacts/db/local-development-20260713/01-migration-apply-and-postverify.md`.

### 2026-07-13 — PATH backup client was older than the local server
- Symptom: the default `pg_dump` was PostgreSQL 14 and was incompatible with the PostgreSQL 17.7 local server.
- Context: mandatory pre-apply recovery point for the complete named local schema.
- What was tried: invoking the default PATH backup client.
- Why the attempt failed: a client/server major-version mismatch could not produce the required trustworthy pre-apply dump.
- Fix/workaround: use the explicit PostgreSQL 17 client at `/opt/homebrew/opt/postgresql@17/bin/pg_dump`, create a custom-format dump, hash the dump and require `pg_restore --list` to exit successfully before migration execution.
- Prevention: inspect server and client versions before every named-target backup; pin a compatible binary instead of relying on PATH order.
- References: `artifacts/db/local-development-20260713/00-preapply-baseline.md`.

### 2026-07-13 — Quoted local cutover booleans failed env compilation
- Symptom: env-contract compilation reported `expected bool` for the Pack A cutover/admission overrides.
- Context: enabling only the gitignored local-development override after migration, typed fixture population and legacy-blocker resolution.
- What was tried: writing quoted `"true"` values in `env/values/dev.local.yaml`.
- Why the attempt failed: quoted YAML values are strings, while both Pack A flags are typed booleans in `env/contract.yaml`.
- Fix/workaround: use native unquoted YAML booleans, rerun local compile and doctor, and retain source defaults plus every non-local environment as disabled.
- Prevention: validate override scalar types through the env contract before relying on generated `.env.local` values or starting the app.
- References: `artifacts/env-local-cutover/02-config-compile-report.md`; `artifacts/env-local-cutover/03-config-compile-report.md`; `artifacts/env-local-cutover/04-post-enable-doctor.md`.

### 2026-07-13 — Loopback alone did not identify the approved writable target
- Symptom: the fixture importer and local gate accepted any PostgreSQL URL hosted on loopback.
- Context: post-landing safety review of the command that carries `--apply`.
- What was tried: treating `localhost`, `127.0.0.1` or `::1` as sufficient proof of a local-development database.
- Why the attempt failed: an SSH tunnel or local proxy can expose a remote database on loopback, so hostname alone cannot express the named authorization boundary.
- Fix/workaround: bind both tools to `127.0.0.1:5432/postgres?schema=my_researcher_dev` and the reviewed cluster/database/schema fingerprint; the gate also requires URL database identity, requested/effective schema parity and read-only transaction evidence before PASS.
- Prevention: every existing-environment writer must require a named target fingerprint in addition to network locality, and negative tests must cover wrong host/port, database, schema, missing schema and cluster fingerprint.
- References: `apps/backend/src/services/experiment-foundation-d19-fixture-import-cli.ts`; `.ai/scripts/experiment-foundation-packa-local-landing-gate.mjs`; `packa-local-landing-20260713-post-review-r3`.

### 2026-07-13 — Lenient cutover parsing could reopen legacy writers
- Symptom: a non-empty misspelling such as `tru` was interpreted as `false`, which could start the app with the committed cutover disabled.
- Context: one-way single-writer review after the local cutover was enabled.
- What was tried: recognizing a few truthy aliases and treating every other value as false.
- Why the attempt failed: a malformed safety-critical flag must not silently select the state that reopens 16 legacy mutation routes.
- Fix/workaround: unset/blank retains the default false; only normalized `true` or `false` is accepted; every other configured value aborts app composition before route registration. The evidence gate uses the same strict value set.
- Prevention: safety flags use closed parsers and malformed-value startup tests, not generic truthiness helpers.
- References: `apps/backend/src/app.ts`; `apps/backend/src/routes/experiment-v2-cutover-guard.integration.test.ts`; `.ai/scripts/experiment-foundation-packa-local-landing-gate.mjs`.

### 2026-07-13 — Real PostgreSQL concurrency exposed cross-statement prefix drift
- Symptom: the first concurrent importer gate observed an event list newer than its lifecycle projection; the next attempt observed identity/revision/receipt state from different READ COMMITTED statement snapshots.
- Context: adding a two-import race to the disposable D-19 gate after in-memory concurrency tests had already passed.
- What was tried: validating a multi-query exact prefix once inside a default READ COMMITTED transaction.
- Why the attempt failed: each statement may observe a newer committed snapshot, while the in-memory repository serializes all transactions and could not reproduce the race.
- Fix/workaround: boundedly reread the complete exact prefix after only the importer-specific conflict; transient committed states converge, while persistent semantic/history drift still fails with `D19_FIXTURE_IMPORT_CONFLICT` after the retry ceiling.
- Prevention: restart-safe importers require disposable real-PostgreSQL concurrency evidence in addition to serialized in-memory tests.
- References: failed runs `packa-d19-post-review-hardening-20260713-r2` and `r3`; passed run `packa-d19-post-review-hardening-20260713-r4`; `apps/backend/src/services/experiment-foundation-d19-fixture-import-service.ts`.

### 2026-07-13 — A claimed submit is still a prepared Attempt
- Symptom: cancellation treated every `prepared` Attempt as a zero-transport case, but E2 leases submit without changing Attempt state; a cancel during that window could not commit.
- Context: Pack B PB10 race review.
- What was tried: rejecting the request with `PROVIDER_COMMAND_LEASE_CONFLICT` and asking the caller to wait for the submit lease.
- Why the attempt failed: the cancellation intent itself was not durable and a worker crash could extend the ambiguity. The first design also confused command lease state with domain lifecycle state.
- Fix/workaround: persist a pending cancel command when submit is claimed, leave Attempt/event unchanged, exclude that cancel from claim while Attempt remains `prepared`, then resolve the transport external ref from authoritative Attempt state after submit E3/recovery. Pending-submit cancellation remains the separate atomic zero-transport path.
- Prevention: test every E2→E3 window explicitly; a durable intent may exist before becoming dispatchable, and the intent's persisted external ref may correctly remain null until Attempt authority resolves the ref.
- References: `apps/backend/src/services/experiment-foundation-provider-command-v2-worker.unit.test.ts`; `apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts`; `artifacts/implementation/02-pack-b-technical-closure.md`.

### 2026-07-13 — Command operation and event shape must agree before CAS
- Symptom: an older repository retry test drove `sync` directly from `submitted` to `succeeded`; early E5 code also accepted an output/event bundle without proving the bundle belonged to the exact collect command.
- Context: Pack B E3/E5 atomicity hardening.
- What was tried: relying on the generic Attempt transition graph and event sequence/FKs alone.
- Why the attempt failed: a legal lifecycle edge is not necessarily legal for a specific command, and FK presence does not prove event type, payload/external-ref parity or diagnostic output shape.
- Fix/workaround: bind submit→submitted, sync→running, cancel→cancelled and successful reconcile→E4; validate exact command/event/state/payload/external ref plus contiguous unique diagnostic outputs before writes. The retry test now executes sync→running→reconcile→succeeded/failed rather than preserving the invalid shortcut.
- Prevention: every UoW has both a positive exact-shape case and a poisoned event/output case that proves full rollback.
- References: `apps/backend/src/repositories/in-memory-experiment-foundation-execution-v2-repository.unit.test.ts`; `apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-v2-relational.integration.test.ts`.

### 2026-07-13 — A skipped relational suite cannot support a PostgreSQL gate
- Symptom: the first Pack B gate discovered the relational test before disposable PostgreSQL existed, so Node reported the relational test as skipped while the overall targeted phase still passed.
- Context: PB04/PB05/PB10 concurrency acceptance.
- What was tried: including all matching test filenames in one pre-container targeted invocation.
- Why the attempt failed: test discovery is not relational execution; the opt-in env and migrated database were absent, so real uniqueness/transaction behavior was untested.
- Fix/workaround: exclude the relational file from the early suite, run the relational suite only after Pack B migration against the disposable `packb` database, require the explicit opt-in flag and parse TAP to reject zero tests or any skip/failure.
- Prevention: gate evidence must report relational test/pass/fail/skip counts and `existing_database_url_used=false`; a skip is never a pass.
- References: `.ai/scripts/experiment-foundation-packb-simulation-gate.mjs`; `packb-20260713-final4`.

### 2026-07-14 — Backend TypeScript loader resolution depends on package cwd
- Symptom: the first real app-composition smoke stopped before importing application code with `ERR_MODULE_NOT_FOUND: ts-node`.
- Context: running the Pack B named-local disabled-capability probe from the monorepo root with `--loader ts-node/esm`.
- What was tried: invoking the backend TypeScript entrypoint from the repository root because the environment file lives there.
- Why the attempt failed: `ts-node` is resolved from the backend package dependency graph and is not available from the root loader-resolution context.
- Fix/workaround: run Node from `apps/backend`, load `../../.env.local`, then import `./src/app.ts`; both disabled and enabled probes completed and closed the app cleanly.
- Prevention: package-local runtime probes must execute from the owning package cwd; env paths may be relative to that cwd, but loader dependencies must not be assumed hoisted to the monorepo root.
- References: `artifacts/db/pack-b-local-development-20260714/03-execution-log.md`.

### 2026-07-14 — Prisma URLs are not pg_dump connection strings
- Symptom: the first quality-remediation backup attempt rejected the Prisma-style `?schema=my_researcher_dev` query; a subsequent failed attempt left a zero-byte placeholder.
- Context: creating the mandatory named-local PostgreSQL 17 recovery point before the cleanup migration.
- What was tried: passing the application `DATABASE_URL` directly to `pg_dump`, then treating the target filename as proof that a backup existed.
- Why the attempt failed: `schema` is a Prisma client parameter, not a libpq connection parameter, and file creation can precede a successful archive write.
- Fix/workaround: pass PostgreSQL-native connection fields to the PostgreSQL 17 client, remove the failed placeholder, create a fresh custom-format archive, verify non-zero exact size, mode `0600`, SHA-256 and `pg_restore --list` before apply.
- Prevention: backup gates must distinguish Prisma URLs from libpq inputs and fail closed on zero-byte, unreadable or unverifiable archives.
- References: `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### 2026-07-14 — Index-definition normalization missed unquoted named schemas
- Symptom: the first named-local post-cleanup gate reported an index-definition digest mismatch even though the intended indexes were present.
- Context: comparing checked-in Prisma/migration expectations to `pg_get_indexdef` on schema `my_researcher_dev`.
- What was tried: stripping only quoted schema qualification.
- Why the attempt failed: PostgreSQL emitted the legal unquoted form for this schema, so semantically identical definitions hashed differently.
- Fix/workaround: centralize normalization in the evidence helper and remove either quoted or unquoted current-schema qualification before exact sorting and hashing.
- Prevention: definition normalization must cover PostgreSQL's equivalent rendering forms but must not drop names, predicates, expressions or ordering semantics.
- References: `.ai/scripts/lib/experiment-v2-evidence.mjs`; `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### 2026-07-14 — pnpm command separation changed env-file resolution
- Symptom: the first app-smoke rerun resolved the environment-file argument through pnpm instead of passing it intact to Node.
- Context: invoking the backend TypeScript app-smoke producer from its package directory.
- What was tried: placing `node --env-file=...` directly after a pnpm invocation without the `exec --` separator.
- Why the attempt failed: pnpm parsed the command/arguments under its own resolution rules, so the expected Node environment source was not loaded.
- Fix/workaround: use the checked-in package command or `pnpm exec -- node ...` with paths resolved from the owning package cwd.
- Prevention: executable and argument ownership must be explicit in evidence commands; a failed env load is never retried with broader inherited environment.
- References: `apps/backend/package.json`; `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### 2026-07-14 — Row JSON ordering still performed a whole-table sort
- Symptom: local app smoke exceeded its statement timeout while proving before/after digests on the full application schema.
- Context: the first quality-remediation app-smoke attempted to avoid `jsonb_agg` but still used `ORDER BY to_jsonb(row)`.
- What was tried: cursor pagination over rows ordered by their complete JSON representation.
- Why the attempt failed: a cursor bounds client memory, but ordering every full row by JSON still forces PostgreSQL to materialize/sort the whole relation.
- Fix/workaround: derive each table's primary-key columns from the catalog, stream in that indexed order with fetch size 64 and hash length-prefixed `jsonb` text in Node inside a read-only repeatable-read transaction.
- Prevention: a bounded transport is not sufficient; the database execution plan also needs an indexable deterministic order and bounded `work_mem`/statement/lock/transaction timeouts.
- References: `apps/backend/scripts/run-experiment-foundation-packb-local-app-smoke.ts`; `artifacts/db/pack-b-local-development-20260714/05-app-composition-smoke.json`.

### 2026-07-14 — Pre-transaction readiness could drift before T2 writes
- Symptom: EF materialization evaluated exact readiness before entering the commit transaction, so a target/dependency/lifecycle change could land between validation and the first authoritative write.
- Context: final Pack A/Pack B architecture review after the earlier quality-remediation checkpoint.
- What was tried: relying on the service's complete precheck and immutable revision hashes as sufficient protection.
- Why the attempt failed: readiness includes mutable lifecycle projections and Dataset availability; revision immutability alone does not fence those prerequisites across a transaction boundary.
- Fix/workaround: `commitMaterialization` now performs one batched `FOR SHARE` recheck of the exact attestation, target, ordered dependency manifest/hash, all 23 projections and Dataset location inside the same Prisma transaction before any inbox/materialization/Run/outbox write. Drift returns the typed readiness conflict with zero partial T2 rows.
- Prevention: every execution prerequisite that can change independently must be transaction-fenced at the authoritative write boundary; an earlier service precheck is diagnostic/fast-fail only.
- References: `04-verification.md`; final run `d19-deep-cleanup-final-20260715-r19`.

### 2026-07-14 — Typed identity and VersionLock carried duplicate non-authority
- Symptom: typed identities coupled their family key to `logical_id` while persisting draft schema/hash copies, and VersionLock retained schema/snapshot placeholders beside its exact dependency rows.
- Context: deep storage census and repository-adapter parity review.
- What was tried: keeping the columns as future-proof metadata even though no execution reader treated them as authority.
- Why the attempt failed: the adapters could disagree on semantic identity, and write-only duplicates created false future authority plus indexes with no valid query owner.
- Fix/workaround: family keys are now independently unique and immutable; adapters compare relational key to typed draft content; draft schema/hash are derived; VersionLock uses relational dependencies plus one server hash. Migration `20260714190000_remove_experiment_foundation_v2_placeholders` removes exactly 12 columns and 5 indexes.
- Prevention: every persisted field/index needs a named reader and invariant owner. A future use case must add a reviewed contract rather than reserving ambiguous authority columns.
- References: `02-architecture.md`; `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### 2026-07-14 — Two-cell success concealed high-cardinality query growth
- Symptom: E1 conflict detection, inserts and latest-Attempt selection expanded per cell, readiness dependency closure was repeatedly resolved and the in-memory latest-Attempt path rescanned the collection.
- Context: Pack B performance review against the 1..N contract.
- What was tried: accepting functional two-cell tests and adapter-local pre-indexing as sufficient evidence.
- Why the attempt failed: correct cardinality did not constrain database round trips or in-memory complexity, so larger admitted revisions could regress without changing results.
- Fix/workaround: E1 uses one batch conflict lookup, `createMany` writes and grouped latest sequence plus exact batch read; readiness uses a transaction-local cache; in-memory latest selection is O(N). A 48-cell relational test now asserts the bounded query shape.
- Prevention: keep at least one high-cardinality real-database acceptance case for every nominal 1..N workflow and assert query shape, not only final row parity.
- References: `04-verification.md`; run `packb-deep-cleanup-final-20260715-r16`.

### 2026-07-14 — Source-policy input must be explicit in hermetic D-19 runs
- Symptom: `packa-d19-deep-cleanup-final-20260714-r9` passed A01-A04/B01-B10 and storage cleanup but returned overall `blocked` with `SOURCE_POLICY_UNRESOLVED`.
- Context: the hermetic D-19 runner no longer inherits broad host environment.
- What was tried: invoking the gate without explicitly routing the already reviewed source-policy attestation.
- Why the attempt failed: an environment allowlist correctly excludes undeclared host input; the gate cannot infer a source-policy artifact from repository presence.
- Fix/workaround: pass `EXPERIMENT_FOUNDATION_D19_SOURCE_POLICY_ATTESTATION_PATH=dev-docs/active/experiment-foundation-productization-closure/artifacts/source-policy/00-d19-source-policy-attestation.json`; final run `d19-deep-cleanup-final-20260715-r19` used that canonical path through the portable reviewed-digest constant and frozen slots, superseding the earlier negatives.
- Prevention: keep the canonical path explicit in the documented command. r13 demonstrated the same fail-closed behavior when an obsolete path was supplied: A/B checks and cleanup passed, but overall status remained blocked. Treat that as invocation evidence, not a product failure, and never convert an unresolved attestation to a default PASS.
- References: `04-verification.md`; negative runs `packa-d19-deep-cleanup-final-20260714-r9` and `d19-deep-cleanup-final-20260714-r13`; final run `d19-deep-cleanup-final-20260715-r19`.

### 2026-07-14 — Full event envelopes were duplicated beside structural columns
- Symptom: PI/EF inbox/outbox rows stored complete event-envelope JSON while also persisting event type/version, ids, aggregate references and hashes in relational columns.
- Context: final Pack A storage-authority review after placeholder cleanup.
- What was tried: treating full JSON as a convenient replay snapshot while scalar columns drove indexing and idempotency.
- Why the attempt failed: two representations could drift, and payload hash alone did not authenticate scalar envelope substitutions.
- Fix/workaround: migration `20260714210000_normalize_experiment_v2_event_payloads` stores only event payload JSON, adds the missing structural fields/envelope hash, and makes repositories reconstruct the typed envelope before verifying both canonical payload and full-envelope hashes.
- Prevention: integration storage may have one JSON authority level only; every structural projection must participate in a server-derived envelope hash and be revalidated on read/delivery.
- References: `02-architecture.md`; `04-verification.md`; run `d19-deep-cleanup-final-20260715-r19`.

### 2026-07-14 — Fixed schema-version columns lacked database and read fences
- Symptom: nine columns semantically fixed at `v1` could accept unsupported values through direct SQL or expose historical drift through a typed repository mapper.
- Context: schema census across Pack A lifecycle/recipe/task/event fields and Pack B event/command fields.
- What was tried: relying on application writers to always emit the only supported version.
- Why the attempt failed: writer discipline does not constrain direct database mutation or pre-existing anomalous rows, and an unsupported value must not be silently upgraded into a v1 domain object.
- Fix/workaround: add nine DB CHECK constraints in the additive migration and matching repository read fences that fail closed on any unexpected version.
- Prevention: every persisted fixed-version discriminator needs both a write-time database constraint and a typed read-time assertion until multi-version support is explicitly designed.
- References: `02-architecture.md`; `04-verification.md`; migration `20260714210000_normalize_experiment_v2_event_payloads`.

### 2026-07-14 — JavaScript integers exceeded PostgreSQL Int capacity
- Symptom: shared schemas accepted safe JavaScript integers that cannot fit Prisma/PostgreSQL `Int`, allowing requests to pass HTTP validation and fail only at persistence.
- Context: seeds, repeat counts and run-policy values in Pack A/Pack B typed requests.
- What was tried: using generic integer schemas without mirroring the target column type.
- Why the attempt failed: JavaScript's safe-integer range is much wider than signed 32-bit PostgreSQL `integer`, producing a late infrastructure error instead of a stable contract rejection.
- Fix/workaround: define and reuse the exact `-2147483648..2147483647` boundary in shared contracts and route validation; positive-only fields retain their stricter lower bounds.
- Prevention: every numeric API field backed by a bounded database type must encode that exact persistence range at the public contract boundary and include overflow negatives.
- References: `02-architecture.md`; `04-verification.md`; final Pack A/Pack B contract tests associated with the D-19 r18 and Pack B r15 gates.

### 2026-07-14 — Gate infrastructure and public schemas accumulated duplicate maintenance surface
- Symptom: D-19 and Pack B separately implemented disposable PostgreSQL lifecycle/identity handling, while shared contracts exported row-level schemas with no repository, route, service or test consumer.
- Context: final residual-code and evidence-runner audit after the authority fixes were green.
- What was tried: retaining near-identical gate plumbing and every generated-looking schema export as harmless convenience.
- Why the attempt failed: duplicated lifecycle code could make isolation/cleanup behavior diverge, and zero-consumer public schemas falsely widened the supported contract surface without owning a runtime validation boundary.
- Fix/workaround: extract container/database lifecycle to `.ai/scripts/lib/disposable-postgres.mjs`, unify database identity validation and before/after reset marker assertions, replace the Pack-B-specific evidence helper with `.ai/scripts/lib/experiment-v2-evidence.mjs`, and remove exactly 14 zero-consumer row schemas/dead helpers while retaining owned contracts. Final gate meta passed 70/70 and backend disposable PostgreSQL identity/guard passed 10/10 with skip=0.
- Prevention: require a named consumer before exporting a row schema, and keep common disposable infrastructure identity-tested independently from gate acceptance. Whole-repository consumption scans must precede deletion.
- References: `02-architecture.md`; `03-implementation-notes.md`; `04-verification.md`; `.ai/scripts/lib/disposable-postgres.mjs`.

### 2026-07-14 — Event hardening depended on an unstated zero-row precondition
- Symptom: migration `20260714210000_normalize_experiment_v2_event_payloads` adds required envelope columns without defaults, but its read-only pending state previously reported only `EVENT_STORAGE_HARDENING_MIGRATION_NOT_APPLIED`.
- Context: reusable preflight review after the named-local migration had safely landed.
- What was tried: relying on the historical Pack A aggregate baseline and manual knowledge that the four inbox/outbox tables were empty.
- Why the attempt failed: a future target could contain committed saga rows; applying the unchanged `ADD ... NOT NULL` statements would then be unsafe, and a generic pending blocker did not expose the row-specific prerequisite.
- Fix/workaround: reuse the existing Pack A authority counts to report PI inbox/outbox and EF inbox/outbox individually. The actual named-local pre-apply census was 0/0/0/0. Pending plus any nonzero count now adds `EVENT_STORAGE_HARDENING_NONEMPTY_EVENT_TABLES`; partial columns/checks/FK hardening is a terminal gate failure.
- Prevention: treat zero rows as a necessary precondition, never as apply authorization. A future nonempty target requires separate review and authorization for an explicit data transform or replacement migration; do not apply 210000 unchanged or infer backfill semantics.
- References: `04-verification.md`; `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`; `.ai/scripts/experiment-foundation-packb-local-landing-gate.mjs`.

### 2026-07-14 — Public Int32 validation did not fence internal increments
- Symptom: API inputs were bounded, but branch revision/state, lifecycle/projection, head/relay and command lease/attempt counters could still increment from `2147483647` into a Prisma/PostgreSQL overflow.
- Context: replay and recovery review after the public OpenAPI Int32 census passed.
- What was tried: treating internal counters as trustworthy because clients cannot author them directly.
- Why the attempt failed: long-lived replay/recovery state is still persisted as PostgreSQL `Int`; an internal `+1` is a database-bound write and must share the public type fence.
- Fix/workaround: centralize positive Int32 validation/increment helpers and fence every service, in-memory and Prisma mutation before arithmetic, claim, commit or dispatch. Exhausted-counter tests assert stable typed conflicts and zero partial writes.
- Prevention: inventory bounded database types by every writer, not only by request schemas; include the maximum current value as a negative case for each incrementing authority.
- References: `02-architecture.md`; `03-implementation-notes.md`; `04-verification.md`; D-19 r18 and Pack B r15.

### 2026-07-14 — Persisted redacted manifest was trusted after top-level read
- Symptom: repository DTOs exposed `redacted_manifest` as unknown JSON while replay and worker paths could treat the value as the expected nested v1 record.
- Context: Pack B payload replay and pre-dispatch integrity review.
- What was tried: relying on write-time materialization plus TypeScript shape assertions after persistence.
- Why the attempt failed: database JSON is an untrusted historical boundary; nested scope, redacted-field or schema-version drift could bypass a top-level check and reach replay/dispatch.
- Fix/workaround: parse every persisted manifest with the exact closed typed v1 schema before replay, scope resolution and provider dispatch. Malformed nested manifests fail before a new write or transport.
- Prevention: no JSON column becomes typed authority through a cast or repository interface; every read path must invoke the same closed parser used by its authoritative contract.
- References: `02-architecture.md`; `03-implementation-notes.md`; `04-verification.md`; Pack B r15.

### 2026-07-14 — Processed inbox status alone was not acknowledgement integrity
- Symptom: a row could look processed while consumer/type/outcome/reason or structural Run/branch/revision/envelope fields had drifted from the exact `BranchHeadAdvanced` event.
- Context: D-19 T4 acknowledgement and Pack B E1 prerequisite review.
- What was tried: selecting a processed inbox by a useful subset of Run/head columns and trusting the resulting DTO.
- Why the attempt failed: acknowledgement is the exact durable event receipt, not a boolean status; a partial predicate can silently upgrade a malformed or substituted row into dispatch eligibility.
- Fix/workaround: reconstruct and validate the full stored event plus outcome pair, then compare consumer, event identity, branch/revision/sequence, Run/manifest and both hashes. Inbox/outcome drift now fails closed and cannot unlock E1.
- Prevention: every durable receipt used as a prerequisite must prove exact event and outcome integrity at read time; query predicates improve selection but never replace validation.
- References: `02-architecture.md`; `03-implementation-notes.md`; `04-verification.md`; D-19 r18.

### 2026-07-14 — Timeout killed the direct child but could leave descendants
- Symptom: a timed-out gate command could terminate its direct process while a spawned grandchild continued running outside cleanup.
- Context: shared disposable PostgreSQL command-runner hardening.
- What was tried: calling `child.kill('SIGKILL')` on timeout and assuming the child owned all work.
- Why the attempt failed: provider/test commands can spawn descendants; killing only one PID does not guarantee hermetic teardown or release ports/resources.
- Fix/workaround: on POSIX, spawn each command as a detached process group and signal the negative group PID on timeout, with direct-child fallback. A real grandchild process test proves the grandchild exits.
- Prevention: timeout acceptance must check descendant liveness, not only the parent exit result; Windows retains the explicit fallback boundary.
- References: `03-implementation-notes.md`; `04-verification.md`; `.ai/scripts/lib/disposable-postgres.mjs`.

### 2026-07-15 — Write-time validation did not prove stored authority on every read
- Symptom: several repository reads could return TypeScript-shaped records after a cast or partial predicate even when canonical JSON, relational mirrors, ordered bindings or enum values had drifted; a self-consistent rewrite of a stored event could preserve its own hash while changing authoritative TaskSpec bindings.
- Context: final PI/EF/Pack B integrity review after write-side hashes, constraints and replay tests were already green.
- What was tried: relying on server-owned writers, database constraints and selected hash comparisons as sufficient protection for later replay/status/prerequisite reads.
- Why the attempt failed: persisted JSON and relational rows are an untrusted historical boundary; write discipline cannot constrain direct mutation, partial historical data or a future faulty writer, and a subset check cannot establish the exact domain aggregate.
- Fix/workaround: every authority-returning read now parses a closed snapshot, checks the code-owned schema/hash profile, recomputes the canonical hash and compares complete relational mirrors, order and allowlists. T2 repeats full typed readiness under its PostgreSQL `FOR SHARE` guard before its first write; real-PostgreSQL tamper tests cover readiness and RunManifestFrozen TaskSpec-binding drift with zero partial writes.
- Prevention: inventory integrity by reader and consumer, not only by writer/model. A durable prerequisite must be reconstructed from all authoritative columns and snapshots before the prerequisite can unlock a transition.
- References: `03-implementation-notes.md`; `04-verification.md`; runs `d19-deep-cleanup-final-20260715-r19` and `packb-deep-cleanup-final-20260715-r16`.

### 2026-07-15 — Source-policy parsing had two potential semantic owners
- Symptom: the Node D-19 gate and TypeScript importer/service could evolve separate parsing or canonical-digest rules for the same reviewed attestation.
- Context: final duplication audit of source-backed Pack A evidence.
- What was tried: keeping equivalent validation logic in runtime-specific modules because both consumed the same JSON artifact.
- Why the attempt failed: equivalent copies are not one authority; an accepted attestation could eventually pass one execution lane and fail or change meaning in another.
- Fix/workaround: one portable ESM parser/digester owns the closed schema, order, semantic source checks and canonical digest. The gate imports it directly, while the backend adapter only layers types, the reviewed digest and exact-slot lookup.
- Prevention: cross-runtime evidence formats require one portable semantic parser; adapters may add typing and application policy but must not restate the format.
- References: `packages/shared/src/research-lifecycle/experiment-foundation-d19-source-policy.mjs`; `apps/backend/src/services/experiment-foundation-d19-source-policy.ts`; `04-verification.md`.

### 2026-07-15 — Stable repository errors covered writes but not all reads
- Symptom: integrity errors raised during prerequisite resolution, replay, status or materialization lookup could bypass the existing write-side catch and reach HTTP as an internal infrastructure error.
- Context: public PI admission/head and EF materialization/acknowledgement/execution service boundary audit.
- What was tried: mapping repository errors only around the final commit or mutation block.
- Why the attempt failed: public commands and queries perform authoritative reads before they enter that block; read integrity is a business conflict with a stable reason, not an unexpected server failure.
- Fix/workaround: service entrypoints now wrap the complete operation, including preflight and replay/status reads, and translate repository constraints into the stable top-level code plus `details.reason_code`.
- Prevention: error-boundary tests must inject repository failure at every public operation stage, including initial reads and exact-replay lookup, not only transaction commits.
- References: `03-implementation-notes.md`; `04-verification.md`; final service and route tests associated with D-19 r19 and Pack B r16.

When adding an entry, use:

### YYYY-MM-DD — Short title
- Symptom:
- Context:
- What was tried:
- Why the attempt failed:
- Fix/workaround:
- Prevention:
- References:
