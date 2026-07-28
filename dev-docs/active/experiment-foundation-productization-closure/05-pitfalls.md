# 05 Pitfalls — Do Not Repeat

`05-pitfalls.md` is append-only for resolved failures and dead ends encountered while executing T-132. Active findings belong in `06-audit-closure-matrix.md`.

## M7 executable-lineage persistence findings — 2026-07-28

- Do not add v2 contract/materializer support while leaving Prisma readback discriminators hard-coded to v1. T1/T2 transactions read their own writes before commit; stale readback fences will reject valid v2 state and can look like a generic materialization conflict.
- Do not diagnose `MATERIALIZATION_KEY_CONFLICT` as a unique-key collision without reproducing the consumer error. The final message was `EF RunRecipe schema version drifted from v1`; the T2 transaction was fully rolled back.
- Do not directly consume a terminalized relay event or silently reset the event after a product fix. First prove the failed domain transaction left zero target rows, then require a separate exact one-row authorization, retain the attempt counter and resume through the normal relay.
- Do not make restart accounting aware only of the earliest prefix. A bounded apply can stop after T1; the runner must census every authorized table family and subtract the exact already-committed scope from the final ceiling.

## Cloud-preflight implementation findings — 2026-07-18

- Do not interpret a controlled `blocked` summary as `cloud_preflight_passed`. Missing profile, temporary STS or reviewed policy evidence must remain explicit blockers even when zero-write safety checks pass.
- Do not persist or log the full `CreateJob` request to make a preflight auditable. Hash transient canonical bytes and retain only byte size, exact hashes and hashed/redacted refs.
- Do not accept long-lived or partial credentials. The live preflight requires a complete temporary STS triplet and a current repo-external policy review bound to the credential access-key-id hash.
- Do not trust RAM policy evidence merely because the policy lists read actions. The evidence must also explicitly deny `paidlc:CreateJob`, be time-bounded, and match the code-owned policy-document hash.
- Do not treat an undocumented API's first failure as proof of a missing provider action. Preserve the explicit `paidlc:CreateJob` deny, isolate request parameters before changing IAM, and label any temporary `paidlc:ListEcsSpecs` allow as empirical until provider metadata or a separate least-privilege review confirms the action mapping.
- Do not put the provider SDK client itself behind a broad generic call surface. The application transport owns exactly three read methods, and all create/update/delete operations must fail before SDK transport.
- Do not return raw provider exception messages in machine evidence. Unknown failures expose only a stable reason code and a redacted generic message; operation ledgers contain request IDs and hashed refs only.
- Do not materialize placeholder payloads or fake-lifecycle success when the exact region/workspace/quota/image profile is incomplete. The honest result is CP02/03/10 `blocked` with zero payload records.
- Do not treat `ListEcsSpecs` visibility or an ENABLED workspace as execution proof. Scheduling stock, image pull, mounts, runtime network, accelerator health, user command, logs/results and real cancel/cleanup remain unverified until a separately authorized real provider lane.
- Do not dispatch or trust-upgrade the existing acknowledged Run for M7. Its Recipe, TaskSpecs, payload schema, mode/provenance and database CHECKs are intentionally simulation-only; real execution requires a new PI revision and new Run lineage.
- Do not swap a real SDK transport behind the current fake worker interface without splitting response validation. The worker currently accepts only the deterministic fake response schema and diagnostic outputs.
- Do not blind-retry `CreateJob` after an unknown/accepted-response-loss outcome. The documented operation has no client idempotency token; reconcile a deterministic tag/display name and exact `GetJob` details or remain blocked.
- Do not claim the production dependency audit is clean merely because the SDK-introduced `lodash` and `fast-uri` paths were remediated. The repository still carries a Fastify 4 advisory whose supported patch starts in Fastify 5; record that residual explicitly and migrate the Fastify dependency as a separate compatibility slice. Also do not pin the deprecated `lodash@4.18.0`; the reviewed override is `4.18.1`.

### 2026-07-22 — Canonicalize STS expiration before building reviewed evidence

- Symptom: r4 blocked on `ALIYUN_IDENTITY_POLICY_EVIDENCE_INVALID` before the first provider transport operation even though the new STS policy, credential binding, reviewer and action lists were exact.
- Context: one-off controlled `public_resource` read-only acceptance using a 3600-second AssumeRole credential and a repo-external `0600` evidence file.
- What was tried: copy the provider `Credentials.Expiration` string directly into the evidence `expires_at` field.
- Why the attempt failed: the evidence contract requires exact `YYYY-MM-DDTHH:mm:ss.sssZ`, while STS returns an RFC3339 timestamp without guaranteeing that millisecond component. The raw value therefore failed canonical-time validation before SDK construction.
- Fix/workaround: parse the provider timestamp, reject invalid/expired/out-of-bound values, and serialize the expiration with `new Date(epoch).toISOString()` before writing and independently hashing evidence. Treat timestamp conversion as local evidence normalization; do not weaken the canonical parser.
- Prevention: exercise the external STS timestamp shape in the temporary harness before consuming the single live-provider attempt, and preserve unconditional credential cleanup on every blocked/failed/passed exit.
- References: `apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts`; `03-implementation-notes.md`; `04-verification.md`.

### 2026-07-23 — A session policy cannot grant a missing role permission

- Symptom: r5 added only the inferred `paidlc:ListEcsSpecs` session-policy action and passed all local identity-evidence checks, yet `GetWorkspace`/`ListResources` succeeded while `ListEcsSpecs` failed exactly as in r3.
- Context: temporary STS was obtained by assuming `cloud-0001`; the session policy was intentionally minimal and explicitly denied `paidlc:CreateJob`.
- What was tried: use the AssumeRole session policy as the only permission variable while leaving the role's attached and inline identity policies unchanged.
- Why the attempt was insufficient: session policy evaluation intersects with the assumed role's existing permissions. Session policy can reduce effective access but cannot grant an action missing from the role. Therefore repeated session-policy additions cannot distinguish an incorrect action name from an ungranted role action.
- Fix/workaround: stop provider retries and inspect the role's attached/inline policies and effective PAI-DLC permission read-only. If a missing action is confirmed, prepare the smallest IAM policy diff and require separate explicit authorization before applying the policy change; continue to retain the CreateJob deny during any later read-only acceptance.
- Prevention: before consuming live STS attempts, inventory both layers—role identity permissions and session restrictions—and record which layer owns every allowed action. Never treat a session policy as an additive grant.
- References: `00-overview.md`; `03-implementation-notes.md`; `04-verification.md`; `apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts`.

### 2026-07-23 — Do not add a redundant Allow to an administrator role

- Symptom: after r5 failed at `ListEcsSpecs`, the obvious remediation appeared to be attaching `paidlc:ListEcsSpecs` to `cloud-0001`.
- Context: a read-only RAM audit found 10 account-level system policies on the role, including `AdministratorAccess`; the captured list contained no custom policy or separate deny policy.
- Why that remediation is invalid: the administrator system policy already grants every action on every resource. Another Allow cannot broaden the role and would falsely document an IAM fix without changing effective access.
- Fix/workaround: keep the IAM diff empty, do not issue another STS guessing attempt, and obtain the endpoint's exact authorization action/evaluation from Alibaba Cloud or redesign the preflight dependency. Treat the current `paidlc:ListEcsSpecs` session action as unverified until then.
- Prevention: inventory the assumed role before proposing permission expansion, distinguish role identity policy from session restriction and service-level controls, and require an effective-access explanation for every IAM diff. Handle least-privilege removal of `AdministratorAccess` as a separate security change, never as part of acceptance troubleshooting.
- References: `00-overview.md`; `03-implementation-notes.md`; `04-verification.md`.

### 2026-07-23 — Do not send optional ListEcsSpecs sort fields without a provider acceptance test

- Symptom: `ListEcsSpecs` returned HTTP 400 with an empty provider body while the two preceding AIWorkspace reads succeeded; the console's intermittent white-screen loading state made the failure look potentially UI- or permission-related.
- Root cause: controlled single-variable calls proved the regional endpoint accepts the minimal ECS request and `AcceleratorType=CPU`, but rejects the otherwise documented optional `SortBy=CPU` field with `BadRequest`. IAM and the console white screen were unrelated.
- What was tried: adding an inferred RAM action and auditing the role's effective permissions. Those checks were useful to rule out IAM, but could not repair a malformed/rejected request parameter.
- Fix: use provider-accepted `PageSize=10`, `ResourceType=ECS`, `AcceleratorType=CPU`; omit `SortBy/Order`; paginate deterministically and preserve only safe status/code/RequestId on failure. r6 then passed all 12 checks with zero writes and unchanged 88-table digests.
- Prevention: isolate optional provider parameters one at a time before changing IAM, maintain separate service-specific page-size constants, and test that optional fields are absent from the SDK wire request. Treat a recoverable console white screen as a frontend symptom unless API evidence correlates the symptom with the provider failure.
- References: `apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts`; `apps/backend/src/services/experiment-foundation-v2-aliyun-cloud-preflight.unit.test.ts`; `03-implementation-notes.md`; `04-verification.md`.

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
- Do not freeze an earlier sub-gate census against a closure set that a later authorized slice intentionally extends. Final convergence must rerun every child gate; update only the stale gate/meta allowlist when the product is strictly more closed.
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
- Why the attempt failed: PostgreSQL emitted the legal unquoted form for the test schema, so semantically identical definitions hashed differently.
- Fix/workaround: centralize normalization in the evidence helper and remove either quoted or unquoted current-schema qualification before exact sorting and hashing.
- Prevention: definition normalization must cover PostgreSQL's equivalent rendering forms but must not drop names, predicates, expressions or ordering semantics.
- References: `.ai/scripts/lib/experiment-v2-evidence.mjs`; `artifacts/db/pack-b-local-development-20260714/07-quality-remediation-addendum.md`.

### 2026-07-14 — pnpm command separation changed env-file resolution
- Symptom: the first app-smoke rerun resolved the environment-file argument through pnpm instead of passing the argument intact to Node.
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
- Fix/workaround: one portable ESM parser/digester owns the closed schema, order, semantic source checks and canonical digest. The gate imports the parser directly, while the backend adapter only layers types, the reviewed digest and exact-slot lookup.
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

### 2026-07-15 — Formal PI scope requires the whole planning prefix
- Symptom: direct Cycle creation or admission against a plausible project/Cycle id failed before Pack A T1.
- Context: moving from the pre-bound D-19 fixture to a real PaperProject product path.
- What was tried: treating an active project id and an ad hoc Cycle as sufficient scope.
- Why the attempt failed: PI correctly requires an admitted CoreMotive, complete literature-backed trace and a current trace-ready evidence board/binding before a ValidationCycle can be admitted; CoreMotive drafts also cannot claim primary role before admission.
- Fix/workaround: execute the normal bootstrap → motive draft/admission → complete trace → minimal board/binding → Cycle draft/admission route chain, then admit the v2 WorkOrder. The Pack A admission guard independently requires active project and admitted Cycle.
- Prevention: product gates must use the domain's normal route prefix; a test fixture prerequisite is not evidence that product bootstrap can be skipped.
- References: `artifacts/product-pack-a-local-20260715/05-product-landing-closure.md`; `apps/backend/scripts/run-experiment-foundation-packa-product-landing.ts`.

### 2026-07-15 — Product landing must converge failed trace repair without erasing audit
- Symptom: an early trace manifest lacked the required literature lineage and left an open repair queue item.
- Context: fail-closed retries while constructing the first formal Pack A product scope.
- What was tried: creating the trace before binding an actual upstream `evidence_unit` reference.
- Why the attempt failed: synthetic or missing lineage cannot satisfy PI trace completeness, and deleting the failed record would erase operational evidence.
- Fix/workaround: create a new complete trace using the actual bridge evidence ref, resolve the old queue item through the formal repair route as superseded, retain both trace records, and require `open_trace_repair_count=0` in final verification.
- Prevention: use exact source refs from the active bridge and design apply runners for replay/convergence, not only first-attempt success.
- References: final verifier `formal-pi-scope-packa-product-20260715-verify-r5`; `04-verification.md`.

### 2026-07-15 — Admission windows and metric identity must not become hidden authority
- Symptom: local product execution needed a temporary write window, while fixture metric order could vary between repository reads.
- Context: a one-way Pack A cutover with later Pack B execution still separately gated.
- What was tried: relying on a persistent enabled admission flag or selecting active metrics by array position.
- Why the attempt failed: an always-open capability broadens intake after the authorized run, and positional selection makes import order an accidental scientific authority.
- Fix/workaround: compile an explicit admission-on window, drain T1-T4, then compile admission off while retaining committed cutover; select the seven active metrics by frozen logical keys and canonical key order.
- Prevention: capability state is config-only and time-bounded; semantic identity is key-based, never index-based.
- References: `apps/backend/src/services/experiment-foundation-d19-fixture-import-service.ts`; `artifacts/product-pack-a-local-20260715/01-admission-window-config.md`; `artifacts/product-pack-a-local-20260715/03-post-landing-config.md`.

### 2026-07-18 — Repo-external path was not reviewed evidence by itself
- Symptom: a caller could point the cloud gate at a mutable or substituted file outside the repository while preserving a policy-shaped JSON body.
- Context: temporary-STS identity-policy proof for the zero-write Aliyun preflight.
- What was tried: lexical repo-root exclusion plus JSON schema/hash-field validation.
- Why the attempt failed: a path is not content identity, lexical checks do not close symlink/realpath races, and an unbounded review interval lets stale approval survive indefinitely.
- Fix/workaround: require an independent exact-file SHA-256, exact reviewer ref, canonical timestamps with a 24-hour maximum lifetime, repo-external realpath, no symlink, stable inode, regular-file type and no group/world write permission before parsing.
- Prevention: external evidence must bind reviewer, bytes, lifetime and filesystem identity independently of the attested policy payload.
- References: `03-implementation-notes.md`; `04-verification.md`; `artifacts/cloud-preflight-implementation-20260718/00-implementation-closure.md`.

### 2026-07-18 — Before/after digests did not enforce database read-only behavior
- Symptom: the cloud gate reported `database_writes=0` from application intent and matching digests, but PostgreSQL had not independently rejected writes.
- Context: CP12 named-local authority fencing.
- What was tried: digesting 88 tables before and after ordinary repository reads.
- Why the attempt failed: digest parity is detection over a selected census, not a write capability fence, and separate queries need not observe one stable snapshot.
- Fix/workaround: run target validation, exact prerequisite resolution and both digests inside one `REPEATABLE READ` transaction whose first application statement sets `TRANSACTION READ ONLY`; verify `SHOW transaction_read_only=on` and record the result.
- Prevention: zero-write database claims require a server-enforced read-only transaction in addition to before/after evidence.
- References: `apps/backend/scripts/experiment-foundation-named-local-evidence.ts`; runner r9; `04-verification.md`.

### 2026-07-18 — One-page SDK tests could miss the exact quota or CPU capacity
- Symptom: `ListResources` and `ListEcsSpecs` inspected only page 1 with size 100, so a valid exact resource or available CPU spec on a later page appeared absent.
- Context: official Aliyun SDK read-only adapter validation.
- What was tried: business-service tests over a three-call fake transport and one SDK request per operation type.
- Why the attempt failed: the fake did not execute SDK request construction/response mapping, and the provider APIs expose `TotalCount` pagination.
- Fix/workaround: inject narrow official-SDK client interfaces, traverse bounded pages, record every provider request and accept only `GetWorkspace → ListResources+ → ListEcsSpecs+`. A no-network two-page test verifies request fields, mapping and ledger order.
- Prevention: adapter tests must exercise generated SDK models and pagination boundaries, not only a domain-level fake.
- References: `apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts`; its cloud-preflight unit test; `04-verification.md`.

### 2026-07-18 — A phase verifier became unusable after the next phase landed
- Symptom: Pack A `verify` failed once legitimate Pack B rows existed, even though Pack A and Pack B authority were unchanged.
- Context: revalidating shared evidence-helper extraction after named-local Pack B product execution.
- What was tried: applying the Pack A apply-time `Pack B total rows = 0` precondition to both apply and verify modes.
- Why the attempt failed: the rule captured phase ordering rather than verifier side effects; after Pack B, only the historical Pack A artifact could pass.
- Fix/workaround: retain the zero-row precondition for Pack A apply, while verify accepts an existing Pack B census only when every before/after count is identical and reports the current total explicitly.
- Prevention: distinguish entry preconditions from read-only non-mutation invariants so earlier-phase verifiers remain executable after additive later phases.
- References: `apps/backend/scripts/run-experiment-foundation-packa-product-landing.ts`; `03-implementation-notes.md`; `04-verification.md`.

### 2026-07-22 — Public resources must be represented by omission, not a fake quota
- Symptom: the original cloud gate required a visible exact DLC quota, while the authorized PAI workspace had no purchased quota and exposed only the public pay-as-you-go selector.
- Context: zero-write Aliyun acceptance after PAI authorization, before any provider job or purchase authorization.
- What was tried: treating `ListResources` quota visibility as a universal prerequisite for every `CreateJob` selector.
- Why the attempt failed: Aliyun's `CreateJob.ResourceId` is optional for the public resource group; inventing an ID, persisting an empty selector or silently falling back would create false authority and make evidence ambiguous.
- Fix/workaround: introduce an explicit profile-v2 union. Exact quota requires a non-empty ID; public resource forbids the ID and removes the key from canonical payload bytes, SDK wire map and redacted-field census. Read-only evidence records mode plus a null resource hash and makes no quota claim.
- Prevention: optional provider selectors with distinct business meaning must use discriminated contracts and omission tests; never encode absence as a sentinel or implicit fallback.
- References: `02-architecture.md`; `apps/backend/src/services/experiment-foundation-v2-aliyun-create-job-payload-service.ts`; `apps/backend/src/services/experiment-foundation-v2-aliyun-read-only-preflight-service.ts`; `04-verification.md`.

### 2026-07-22 — Final convergence exposed a stale earlier-slice census
- Symptom: the first `packc-final` attempt reported C-EF `failed` even though all 69 C-EF non-relational tests passed and PostgreSQL unavailability should have produced `blocked`.
- Context: C-PI had intentionally added `paper_experiment_sidecar` to the permanent generic scientific-writer closure set after the last C-EF host pass.
- What was tried: the unchanged C-EF static gate required exact equality with its earlier three-kind set.
- Why the attempt failed: the gate encoded an intermediate slice population rather than the pack-wide monotonic closure set, so a stricter landed product state looked like drift.
- Fix/workaround: add `paper_experiment_sidecar` to the C-EF gate/meta expected closed-kind allowlist; no product code or writer behavior changed. The corrected final run reports C-EF `blocked` only on its disposable relational lane.
- Prevention: final convergence must execute every child gate after later slices land, and monotonic cross-slice closure sets must be reconciled in gate metadata before interpreting a census mismatch as a product violation.
- References: `.ai/scripts/experiment-foundation-packc-ef-gate.mjs`; `.ai/scripts/experiment-foundation-packc-final-gate.mjs`; `04-verification.md`.

### 2026-07-23 — Existing simulation Run cannot be reused for M7

- Symptom: the first M7 outline assumed the exact acknowledged two-cell Run could be sent to the real Aliyun provider after adding a transport.
- Context: Pack A intentionally stopped before Attempt/provider execution, while Pack B proved a same-payload deterministic simulation and Pack C used synthetic real-provider fixtures only for default-off conformance.
- What was tried: map the existing Run cells and TaskSpecs directly onto the already materialized offline `CreateJob` payloads.
- Why the attempt is invalid: the RunRecipe entrypoint is explicitly `materialize-only`; TaskSpecs contain the non-runnable `experiment-foundation-v2:materialize-cell` command and only `simulation_*` output keys; shared contracts, provider response validation and PostgreSQL CHECKs all freeze simulation/fake provenance. The Run and hashes are immutable authority and cannot be rewritten or trust-upgraded.
- Fix/workaround: D-23 requires a new PI WorkOrder revision bound to an exact typed ExecutionBundle. T1-T4 creates a new executable Run; provider-control contracts/tables gain exact discriminated real variants while old rows remain unchanged.
- Prevention: before reusing an immutable Run across a new execution mode, inspect Recipe, TaskSpec IO, shared mode/provenance/ref unions, repository decoders, app composition and DB CHECKs. Exact identity does not imply capability compatibility.
- References: `02-architecture.md`; `artifacts/implementation/11-m7-real-provider-readiness-review.md`; `apps/backend/src/services/experiment-foundation-v2-materialization-service.ts`; `packages/shared/src/research-lifecycle/experiment-foundation-execution-v2-contracts.ts`; `prisma/migrations/20260713210000_add_experiment_foundation_pack_b_provider_control_v2/migration.sql`.

When adding an entry, use:

### YYYY-MM-DD — Short title
- Symptom:
- Context:
- What was tried:
- Why the attempt failed:
- Fix/workaround:
- Prevention:
- References:

### 2026-07-23 — Nullable JSON authority requires SQL NULL, not JSONB null
- Symptom: the first M7 disposable relational run rejected an otherwise valid created AttemptEvent at `ef_attempt_event_external_ref_pair_check`.
- Context: the test inserted a real-provider created event with no external job ref.
- What was tried: writing `Prisma.JsonNull` for the absent `externalJobRefJson` alongside a SQL-null hash.
- Why the attempt failed: `Prisma.JsonNull` stores the JSON value `null`, which is not SQL NULL; the pair CHECK correctly saw a present JSON column with an absent hash.
- Fix/workaround: use `Prisma.DbNull` for an absent nullable JSON column. Production repository helpers already use the SQL-null representation; the direct relational fixture was corrected.
- Prevention: for nullable JSON authority pairs, tests must distinguish database null from JSON null and exercise the exact CHECK.
- References: `prisma-experiment-foundation-execution-v2-relational.integration.test.ts`; M7 gate run `t132-m7-offline-20260723-v1`.

### 2026-07-23 — Generalized CHECK migrations invalidate old constraint-name assertions
- Symptom: the first M7 relational run correctly rejected a mixed simulation/real Attempt, but the test reported failure.
- Context: M7 replaced separate mode/provenance checks with one exact tuple CHECK.
- What was tried: matching the historical `ef_execution_attempt_mode_check` name.
- Why the attempt failed: PostgreSQL now rejects earlier at `ef_execution_attempt_exact_tuple_check`; the behavior remained fail-closed, but the evidence assertion encoded the pre-M7 schema.
- Fix/workaround: update the negative test to require the new exact-tuple constraint and keep migration/schema census tests responsible for the renamed population.
- Prevention: when a migration intentionally replaces constraints, search relational tests and gates for both semantic values and constraint names before the first full replay.
- References: `20260723100000_add_experiment_foundation_m7_real_provider_v2/migration.sql`; M7 gate run `t132-m7-offline-20260723-v1`.

### 2026-07-23 — Concurrent replay fixtures must preserve canonical identities

- Symptom: the real-provider concurrent E1 relational test failed nondeterministically with either a hash conflict or an invalid row becoming the winning contender.
- Context: the test cloned a valid start request, changed Attempt/event/command IDs, and raced both requests against the same Run cell.
- What was tried: changing identifiers without rebuilding the event hash, command snapshot binding and command canonical hash.
- Why the attempt failed: those identifiers are part of immutable authority. The malformed contender's outcome depended on which transaction won, and also exposed that initial event/command hashes were not revalidated on every pre-write path.
- Fix/workaround: regenerate all dependent canonical identities in the fixture, validate event and command hashes plus bindings before repository writes, and add negative tests proving either hash drift yields `PROVIDER_RESPONSE_INVALID` with zero Attempts.
- Prevention: any fixture mutation of an identity participating in a canonical snapshot must rebuild the complete dependent hash graph; repositories must still reject malformed input before relying on uniqueness or a race loser to protect persistence.
- References: `prisma-experiment-foundation-execution-v2-relational.integration.test.ts`; `prisma-experiment-foundation-execution-v2-repository.ts`; M7 gate run `t132-m7-offline-20260723-v1`.

### 2026-07-23 — Historical gates must census later additive families without owning them

- Symptom: the post-M7 Pack B replay failed before its scenario because D-19 expected exactly the historical 40 V2 tables and Pack B expected fake-only effective CHECKs.
- Context: Pack C and M7 had legitimately added 12 V2 tables and generalized the same six provider-control tables while preserving the simulation writer.
- What was tried: replaying the unchanged historical gate against the repository's complete current migration history.
- Why the attempt failed: the gate conflated its owned writer population with the whole repository's evolving additive schema, and its PB14 evidence used the obsolete `real` label instead of the canonical `real_provider` mode.
- Fix/workaround: retain the 40-table D-19 named census, add every later V2 table to a zero-write before/after census, freeze the current 52-table schema population, update the effective Pack B digest to 15 FK/31 CHECK/38 index, keep the Pack B writer allowlist exactly `['simulation']`, and split the static relation assertion into historical Pack A 38 plus M7 delta 7.
- Prevention: historical gates should freeze their writer authority but explicitly measure later additive families as unchanged; effective-schema digests must be refreshed by a fail-closed disposable replay whenever an authorized later migration changes shared storage semantics.
- References: `run-experiment-foundation-d19-spine.ts`; `run-experiment-foundation-packb-simulation.ts`; `experiment-foundation-packb-simulation-gate.mjs`; replay `packb-m7-compat-20260723-r3`.

### 2026-07-24 — A poll-count watchdog is not a timeout

- Symptom: none in tests — the offline gate's fake provider converges within a few polls, so every suite stayed green while the reconcile watchdog would have cancelled any real job that ran longer than ~12 polls (a few minutes of backoff).
- Context: the worker bounded reconcile by `maximumCommandAttempts`, reusing the transport-retry ceiling as the execution timeout, while the provider-side `JobMaxRunningTimeMinutes` correctly used the frozen TaskSpec `timeout_seconds`.
- Why the bug survived review-by-testing: injected fakes reach terminal states quickly, so the attempt-count bound and a wall-clock bound are indistinguishable in fast tests. Only the independent code review caught the conflation.
- Fix: the watchdog deadline is `attempt.created_at + timeout_seconds + watchdogGraceMs`; healthy nonterminal polling and retryable sync/reconcile transport errors release until that deadline, and `maximumCommandAttempts` stays as the transport-retry bound for submit/cancel/collect. M7-09 was rewritten to advance a fake clock across the deadline.
- Prevention: any bound expressed as an attempt count must be justified against wall-clock semantics; tests for timeout paths must drive an injected clock across a real deadline instead of shrinking a counter.
- References: `experiment-foundation-real-provider-command-v2-worker.ts`; `experiment-foundation-real-provider-command-v2-worker.unit.test.ts`; gate run `t132-m7-offline-20260724-v2`.

### 2026-07-24 — A census that only reads what exists proves nothing

- Symptom: the M7 gate's excluded-write census had always reported clean because three of its four "table names" (`ExperimentResult`, `EvidenceCandidate`, `RunEvidenceUnit`) were bare family labels matching no real table — `information_schema` enumeration silently returned nothing for them, and nothing was asserted.
- Detection: the QR-1 hardening changed the census from collected-and-ignored to present-and-exactly-zero; the first hardened run failed immediately with only `ExperimentFoundationExternalTrainingJob` in the census, exposing the bug.
- Fix: the list now names the real tables (`ExperimentFoundationRecord`, `ExperimentFoundationExperimentResultV2`, `ExperimentFoundationEvidenceCandidateV2`, `PaperImplementationRunEvidenceUnit`, `PaperImplementationRunEvidenceUnitV2`) and the assertion requires every listed table to be present with count 0 — a missing table is a failure, not a pass.
- Prevention: any allowlist/denylist of database objects must be validated against the live catalog (existence is part of the assertion); "no rows found for X" and "X does not exist" must never be conflated.
- References: `experiment-foundation-m7-provider-gate.mjs` (`assertExcludedWriteTablesZero`); failed lineage first-attempt `t132-m7-offline-20260724-v3`; passing rerun same id, SHA `de4b3985…`.

### 2026-07-26 — Do not combine OSS Bucket and object actions in one review statement

- Symptom: RAM accepted the first runtime policy, but its summary reported “one or more resources have no matching operation” and collapsed list/read/write into an ambiguous row.
- Context: `oss:ListObjects` targets the Bucket resource while `oss:GetObject` targets object resources. The first policy placed both actions and both resource types in one statement and allowed unrestricted Bucket listing.
- What was tried: relying on successful JSON validation and the effective cross-product behavior of the combined statement.
- Why the attempt was insufficient: the policy remained executable, but review evidence could not show an exact action-to-resource mapping, and unrestricted Bucket listing exposed object names outside `input/`.
- Fix/workaround: runtime v2 uses separate statements for Bucket listing, input-object read and output-object write; the list statement adds `oss:Prefix` `StringLike` for `input` / `input/*`.
- Prevention: keep OSS Bucket-level and object-level actions in separate statements, condition prefix listing explicitly, and resolve analyzer ambiguity before attaching a policy to a role.
- References: `workloads/ragperf-canary/ram/runtime-policy.json`; `artifacts/implementation/18-m7-l1-authorization-materials.md`; `artifacts/implementation/19-m7-l1-owner-console-walkthrough.md`.

### 2026-07-26 — ACR personal edition is an account-eligibility gate, not a canary prerequisite

- Symptom: the free ACR personal-instance form was fully configured in `cn-shanghai`, but submission failed with `个人版仅限个人用户使用，请实名认证为个人账号。`.
- Context: the current Aliyun account is not eligible for personal-edition ACR, while the canary workload itself is stdlib-only and can run on a PAI official CPU image.
- What was tried: accepting both required agreements and submitting the personal-instance creation form.
- Why the attempt failed: provider account-verification eligibility, not namespace, region, repository or workload configuration.
- Fix/workaround: stop the ACR route without creating a paid enterprise instance; use a reviewed PAI official image and content-addressed OSS bindings for code, data and output.
- Prevention: check registry-edition eligibility before making ACR a blocking dependency, and model custom images as an optional delivery route when an official image plus immutable external code is sufficient.
- References: `artifacts/implementation/20-m7-l1-official-image-oss-compatibility.md`; `artifacts/implementation/19-m7-l1-owner-console-walkthrough.md`.

### 2026-07-27 — PAI ImageId and a versioned ImageUri are not an OCI content digest

- Symptom: the official-image console and `GetImage` API provide an exact versioned URI and stable PAI asset ID, while the ExecutionBundle requires `container_image.image_digest`.
- Context: `GetImage` resolved `image-liuxvj7p2qcnflha84` and the exact regional URI, but returned null `Identity`/`Signature` and no OCI/content digest.
- What was tried: console inventory/copy inspection followed by the provider's read-only `GetImage` API.
- Why that is insufficient: provider asset identity proves which catalog row and address were selected; provider asset identity does not prove immutable image bytes. A tag, PAI `ImageId`, request ID or hash of returned metadata would be a different semantic value.
- Fix/workaround: preserve `ExecutionBundle@v1` as the OCI-digest contract and add an explicit `ExecutionBundle@v2` provider-managed identity limited to M7-L1 diagnostics. Its redacted evidence stores a typed provider-asset hash, never an `image_digest`.
- Prevention: distinguish provider asset identity from content digest in the bundle schema and version the new shape; require fresh provider metadata comparison before submission and an OCI/content digest for M7-L2 scientific evidence.
- References: `artifacts/implementation/18-m7-l1-authorization-materials.md`; `artifacts/implementation/20-m7-l1-official-image-oss-compatibility.md`.

### 2026-07-27 — Provider image metadata size is not a PostgreSQL Int32 counter

- Symptom: the first provider-managed bundle schema test rejected the official image size `3,803,970,629`.
- Context: the repository's generic `positiveInteger` intentionally caps values at PostgreSQL signed Int32 because most such fields reach `Int` columns; provider image metadata remains nested JSON.
- What was tried: initially reusing the generic `positiveInteger` schema.
- Why that failed: the real provider value exceeds `2,147,483,647`, even though the value is a valid JSON safe integer and is never persisted into an Int32 column.
- Fix/workaround: use the existing JSON-safe integer ceiling only for `provider_managed_asset.size_bytes`; retain every Int32-backed limit unchanged.
- Prevention: choose numeric bounds from the destination storage contract, and test schemas with exact provider metadata rather than small fixtures.

### 2026-07-27 — Cloud Shell upload selection is not proof that a file landed

- Symptom: the Cloud Shell browser upload panel successfully transferred the first file, but later file selections did not create files even though the native picker closed.
- Context: browser automation had to cross both the Cloud Shell web menu and the macOS native file picker. The transfer panel retained the previous completed task and did not provide reliable evidence for subsequent selections.
- What was tried: repeated native-picker selection, closing the old transfer panel, refreshing Cloud Shell and uploading a TAR bundle.
- Why the attempt was insufficient: only terminal `ls` proved which files existed; UI selection/closure and a stale completed task were not durable transfer evidence.
- Fix/workaround: verify every transfer from the Cloud Shell terminal. The two small remaining files were transferred in bounded Base64 chunks, decoded in Cloud Shell and accepted only after exact SHA-256/byte-count verification.
- Prevention: treat the browser upload panel as transport only. Require shell-side existence and digest checks before any cloud upload command, and prefer a CLI/native file transfer path when multiple files are involved.
- References: `artifacts/implementation/21-m7-l1-oss-input-upload-closure.md`.

### 2026-07-27 — OSS wrong-endpoint 403 is not an IAM denial

- Symptom: the first read-only `aliyun oss stat` returned HTTP 403 `AccessDenied`.
- Context: Cloud Shell's OSS wrapper did not automatically select the Bucket's Shanghai endpoint.
- What was tried: an unqualified `aliyun oss stat oss://...` request.
- Why the request failed: the provider message required all future requests to address `oss-cn-shanghai.aliyuncs.com`; the request reached the wrong endpoint rather than failing the logged-in identity's object permission.
- Fix/workaround: add `--endpoint oss-cn-shanghai.aliyuncs.com` to every `stat` and `cp`. The pre-upload checks then returned the expected `NoSuchKey`; all uploads and post-upload stats succeeded.
- Prevention: pin the exact regional OSS endpoint in repeatable commands and classify provider error code/message before changing RAM policy.
- References: `artifacts/implementation/21-m7-l1-oss-input-upload-closure.md`.

### 2026-07-27 — An uploaded mirror cannot inherit an unrelated Dataset revision

- Symptom: the two SciFact mirror manifest bindings were null, while named-local already contained one corpus Dataset revision and one query-workload Dataset revision that superficially matched the required roles.
- Root cause: those revisions describe Wikipedia and Natural Questions source/checksum/split snapshots, not the uploaded SciFact bytes. Dataset role compatibility is necessary but not sufficient for exact lineage.
- What was tried: a server-enforced read-only inventory of Dataset/DataPolicy identities, immutable snapshots and hashes; no binding or write was attempted.
- Fix/workaround: define separate SciFact corpus/query DataPolicies and Datasets, validate them in memory through the normal service, and keep named-local apply as an explicit bounded authorization gate.
- Prevention: require source identity, checksum manifest, split protocol and DataPolicy exactness before binding any mirror. Never select a revision solely because its `dataset_role` matches.
- References: `workloads/ragperf-canary/manifests/scifact-authority-v1.json`; `apps/backend/scripts/plan-experiment-foundation-scifact-authority.ts`; `03-implementation-notes.md`; `04-verification.md`.

### 2026-07-27 — Lifecycle operations must be counted by persisted table rows

- Symptom: the first bounded authorization list totaled 22 rows—four identities, four revisions, four freeze receipts and 10 lifecycle events—but omitted four `ExperimentFoundationAssetLifecycleProjectionV2` rows.
- Root cause: the census counted append-only lifecycle events as semantic operations without following the repository's `compareAndSwapLifecycleProjection` persistence path. Every one of the four assets must also maintain one rebuildable current-state projection.
- What was tried: immediately before apply, the repository and Prisma write paths were re-inspected against the proposed authorization. The mismatch was found before setting the process authorization or connecting the writable importer; no database write occurred.
- Fix/workaround: correct the bound to 26 rows, make the importer accept only the exact 26-row authorization string, reject the obsolete 22-row string before database access, and test first apply plus zero-new exact replay.
- Prevention: derive future write censuses from concrete table-level mutations, including event-maintained projections and receipts, rather than from high-level service operations alone. Keep the exact row total in both the authorization gate and tests.
- References: `apps/backend/scripts/apply-experiment-foundation-scifact-authority.ts`; `apps/backend/scripts/apply-experiment-foundation-scifact-authority.unit.test.ts`; `01-plan.md`; `02-architecture.md`; `04-verification.md`.

### 2026-07-27 — Protected-table digests must not assume `id` or materialize vector payloads

- Symptom: the first authorized CLI attempt failed before apply because four protected application tables use non-`id` primary keys. A whole-row fallback then spent excessive time sorting `LiteratureEmbeddingChunk`, whose rows include a 3072-dimensional vector.
- Root cause: the original shared evidence helper hard-coded `ORDER BY id`; the first fallback used `to_jsonb(table_row)` and therefore pulled large non-authority payloads into the negative-space digest. Adding `COLLATE "C"` also prevented the desired primary-key index order, while `information_schema.sql_identifier` required explicit text casting for Prisma.
- What was tried: r1 failed on the missing `id`; r2 used whole-row JSON and was stopped before apply; r3 exposed the metadata cast; r4 ordered full rows by primary key but was still stopped before apply because vector materialization dominated. Independent `REPEATABLE READ` / `TRANSACTION READ ONLY` censuses proved all eight SciFact row families remained zero after every attempt.
- Fix/workaround: discover `id` or the exact primary-key column list for every application table, cast information-schema identifiers to text, and hash only ordered primary-key values plus PostgreSQL `xmin`. r5 completed the 26-row apply and r6 completed zero-new replay; both proved all 242 protected application tables unchanged.
- Prevention: design negative-space signatures around mutation detection, not full payload duplication. Primary-key membership detects insert/delete and `xmin` detects any update; never deserialize embeddings, blobs or large JSON merely to prove that no protected row changed.
- References: `apps/backend/scripts/apply-experiment-foundation-scifact-authority.ts`; `03-implementation-notes.md`; `04-verification.md`.

### 2026-07-27 — A contract-level v2 does not imply the applied database CHECK admits v2

- Symptom: the first disposable PostgreSQL bundle-freeze gate rejected a valid reviewed `ExecutionBundle@v2` draft at `ef_execution_bundle_draft_schema_check`.
- Root cause: shared schemas and service code had gained v2, but the already-applied M7 migration closed both draft and revision discriminator columns to `schemaVersion='v1'`; the Prisma adapter had also historically hard-coded v1 on write/read. Unit tests used in-memory storage and the relational fixture still authored v1, so the mismatch was invisible.
- What was tried: type checks and in-memory v2 plan/replay passed; the forced real-PostgreSQL lane then failed before any named-local connection. Later convergence attempts exposed three adjacent stale real-provider relational assumptions: redacted manifest v1 only, the old five-field redaction census and an obsolete profile-version literal.
- Fix/workaround: persist/read the content discriminator exactly, validate stored discriminator/content/hash-profile agreement, add a new additive migration that admits only v1/v2 and relationally binds each discriminator to its JSON snapshot, convert the bundle relational test to v2 and make the provider reader/test derive v1/v2 manifest/profile identity from the production materializer. Final disposable run `t132-m7-bundle-freeze-20260727-v6` passed.
- Prevention: every additive JSON contract version must include a real-database roundtrip against the full migration history and a negative discriminator/JSON mismatch assertion. Never edit an applied migration, and never treat a row-only authorization as permission to apply a newly discovered schema migration.
- References: `prisma/migrations/20260727170000_enable_execution_bundle_schema_v2/migration.sql`; `apps/backend/src/repositories/prisma/prisma-experiment-foundation-execution-bundle-v2-relational.integration.test.ts`; `04-verification.md`.

### 2026-07-27 — AIWorkspace CLI does not derive its endpoint from RegionId

- Symptom: the first fresh `GetImage` CLI attempt returned `unknown endpoint for aiworkspace/cn-shanghai` and the downstream JSON projection failed on empty input.
- Root cause: Alibaba Cloud CLI knew the service and RegionId but did not resolve the AIWorkspace regional endpoint automatically. The failure occurred locally before a provider request and produced no RequestId.
- What was tried: one command using only `--RegionId cn-shanghai`, followed by the provider-directed explicit-endpoint form.
- Fix/workaround: pin `--endpoint aiworkspace.cn-shanghai.aliyuncs.com` together with the exact RegionId and ImageId. The successful responses produced RequestIds and matched every frozen provider-managed asset field.
- Prevention: include the exact regional AIWorkspace endpoint in repeatable read-only commands and count a provider operation only when a RequestId is returned. When compacting output, use the provider's actual `GmtCreateTime`/`GmtModifiedTime` field names.
- References: `artifacts/implementation/22-m7-l1-fresh-getimage-closure.md`; `04-verification.md`.
### 2026-07-28 — A public-resource class is not an arbitrary ResourceConfig

- Symptom: the live runner's first zero-cloud preflight found the frozen executable TaskSpecs at `1 CPU / 512 MiB`, while the authorization materials described a `g6.large`-class profile using inconsistent `1 CPU / 4 GiB` shorthand.
- Root cause: executable v2 materialization used a code-owned default resource snapshot, and the real-provider payload emitted `ResourceConfig` even for `public_resource`. Current PAI documentation identifies public resources by ECS specification; `ecs.g6.large` is `2 vCPU / 8 GiB`.
- Fix/workaround: public profiles now require exact `ecs_spec/cpu_cores/memory_mb`, public payloads emit `EcsSpec`, recovery checks the value, and new WorkOrder v2 revisions may carry an exact resource snapshot. The old Run remains immutable and ineligible.
- Prevention: freeze provider-neutral resource intent before T1, reconcile the resource intent with the provider's exact billable SKU before T2, and run the live runner's offline preflight before creating any Attempt or cloud job.

### 2026-07-28 — Branch state advances at both T1 and T3

- Symptom: the authorized successor completed normal T1-T4, but the first final-state assertion failed with `4 !== 3`.
- Root cause: the verifier counted the T1 admission CAS but omitted the T3 head-advance CAS. `stateVersion` advances at both transitions; `headVersion` advances only at T3.
- What was tried: no retry or compensating write was attempted. A server-enforced read-only census first proved the exact 40-row lineage, sequence/head 2, exact resource/Bundle bindings and zero prohibited rows.
- Fix/workaround: require `stateVersion +2` and `headVersion +1` for a fresh successor; accept only an empty or exactly complete successor prefix so a completed invocation can run the normal idempotent replay verifier without creating rows.
- Prevention: derive CAS expectations from every event consumer in the saga, not only from row deltas. When a post-commit assertion fails, census the exact prefix before deciding whether any recovery write is needed.

### 2026-07-28 — An in-conversation HTML view is not a repo documentation artifact

- Symptom: a request to organize progress “using HTML” opened a standalone file from `dev-docs/**` in the desktop browser instead of rendering a thread-scoped interactive visualization.
- Root cause: the request was classified from the T-132 context as developer-documentation authoring. The classification skipped the Codex visualization contract and inferred repository persistence without an explicit request for a project file.
- What was tried: the standalone file was authored, linked from the task overview, rendered with Quick Look and committed to `main`; those checks verified the wrong delivery surface.
- Fix/workaround: remove the repo artifact/link, create a fragment in the exact thread visualization directory, render the fragment with the bundled wrapper for validation and return the fragment through the inline visualization directive.
- Prevention: for “show/organize/explore in HTML” inside Codex desktop, default to the visualization surface. Use repository HTML only when the user explicitly asks for a project file, site, app page or exported artifact.

### 2026-07-28 — Public official-image ownership metadata is not the Job workspace

- Symptom: `GetImage` returned HTTP 200 and every frozen provider-managed field matched, but the live runner would reject the response because `workspaceId` was absent and therefore unequal to DLC target workspace `1450165`.
- Root cause: the runner conflated optional image ownership metadata with the independently frozen workspace where the DLC Job will run. The installed SDK declares `workspaceId` optional, and the public official-image response omitted that field.
- What was tried: two independent read-only provider calls with distinct RequestIds, a safe response-key projection, comparison with the SDK type and a production-path preflight after the minimal fix.
- Fix/workaround: remove the image-response workspace equality assertion, encode an absent observed workspace as `null` in the request evidence hash, and add `image-preflight` mode so the exact production image gate can be exercised without authorization consumption or `CreateJob`.
- Prevention: freeze and validate image asset identity only from fields the provider actually returns for that asset class. Bind the DLC target workspace in the Job payload/profile gate; never infer the target workspace from optional image ownership metadata.
- References: `apps/backend/scripts/run-experiment-foundation-m7-l1-live-window.ts`; `03-implementation-notes.md`; `04-verification.md`.
