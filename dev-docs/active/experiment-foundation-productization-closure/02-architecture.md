# 02 Architecture

## M7 real-provider boundary — 2026-07-23

- T-132 is the sole implementation owner for the provider-specific canary; T-106 is an acceptance consumer and must not own a second transport, schema or runner.
- Existing Pack A/Pack B Run, Recipe, TaskSpecs, payloads and Attempts are immutable simulation-only history. Real execution always starts from a new branch-local PI WorkOrder revision and a new T1-T4 materialization/head acknowledgement.
- A named typed `ExecutionBundleV2` exact revision/hash binds code, container image, ordered dataset mirrors, dependency lock, provider-neutral command and typed output parser. It is EF authority; PI carries only exact admitted refs/hashes.
- Existing six Pack B provider-control families remain the sole durable execution authority. Their future real-provider support is an exact discriminated tuple extension, never a parallel table family, dual read/write or legacy job upgrade.
- `CreateJob` acceptance is not atomically coupled to the database. A deterministic provider tag/display name plus `ListJobs`/`GetJob` exact recovery fence handles accepted-response loss; ambiguity blocks and never blind-retries a second job.
- Provider logs are diagnostic only. Scientific trust begins only after exact collected output hash/schema/parser verification and the existing ScientificValidationService accepts a complete `real_provider` batch.
- Preflight, real-provider intake, scientific validation and PI Cycle closure are independent default-off capabilities. Disabling intake must not interrupt committed sync/cancel/collect/cleanup.

Full review and acceptance matrix: `artifacts/implementation/11-m7-real-provider-readiness-review.md`.

## Context and current state
ExperimentFoundation already has a sensible bounded context and a broad shared contract covering reusable assets, evaluation protocols, Recipe/TaskSpec, execution, result validation and evidence. The productization gap is not a missing noun model; the gap is the absence of enforceable trust invariants, durable application services and one continuous researcher workflow. The workflow must also close a round trip with PaperImplementation: PI owns the paper-bound intent and WorkOrder, while EF owns experiment execution and scientific facts.

## Implemented zero-write Aliyun preflight boundary — 2026-07-18

The cloud-preflight slice is a non-persisted control boundary layered over the exact acknowledged Pack A Run and its existing Pack B product evidence. The slice adds no Prisma model and performs no provider write:

```text
exact Run + ordered RunCells + exact TrainingTaskSpecs + code-owned execution profile
  -> exact Aliyun PAI-DLC CreateJob payload bytes (transient only)
  -> canonical payload hash + redacted manifest
  -> same exact payload/hash through deterministic fake lifecycle
  -> temporary-STS + reviewed-policy gate
  -> official SDK: GetWorkspace -> ListResources -> ListEcsSpecs
  -> CP01-CP12 summary with protected-table digest parity
```

The full request is never persisted or logged. Its provider profile is code-owned and environment-supplied, while Run/RunCell/TaskSpec identity remains database authority; the materializer rejects any cross-layer substitution or caller-authored hash. The official `CreateJob` contract has no documented dry-run flag and creates a job, so `PaiDlc.CreateJob` is a frozen forbidden operation and is rejected before transport. The request size is checked against the documented 65,536-byte ceiling before any network path.

The live surface is exactly `AIWorkspace.GetWorkspace`, `AIWorkspace.ListResources` and `PaiDlc.ListEcsSpecs`, using regional HTTPS endpoints. A complete temporary STS triplet is mandatory. A repo-external, current review receipt must bind the access-key-id hash to a policy-document hash, require `paiworkspace:GetWorkspace`, `paiworkspace:ListResources` and the empirically inferred `paidlc:ListEcsSpecs`, and explicitly deny `paidlc:CreateJob`; long-lived or partial credentials cannot enter the transport. The provider's ListEcsSpecs documentation still publishes no RAM authorization metadata, so that third action is an evidence-backed minimum-permission inference from the controlled r3 failure rather than an official contract. The operation ledger stores only operation names, endpoints, request IDs and hashed refs. Official references: [CreateJob](https://help.aliyun.com/en/pai/developer-reference/api-pai-dlc-2020-12-03-createjob), [GetWorkspace](https://help.aliyun.com/en/pai/developer-reference/api-aiworkspace-2021-02-04-getworkspace), [ListResources](https://help.aliyun.com/en/pai/developer-reference/api-aiworkspace-2021-02-04-listresources), [ListEcsSpecs](https://help.aliyun.com/zh/pai/developer-reference/api-pai-dlc-2020-12-03-listecsspecs).

Admission, workflow simulation and cloud preflight are independent switches. Disabling preflight cannot change the already committed Pack A/Pack B lineage; enabling the preflight switch authorizes only these reads. `cloud_preflight_passed` still does not verify scheduling capacity, image pull, mounts, runtime network, accelerator health, user command, logs/results, cancellation/cleanup or scientific evidence.

### Explicit resource-selector modes — 2026-07-22

The execution profile v2 uses a closed discriminated union instead of an optional free-form quota field:

```text
exact_quota     -> { mode, exact resource_id } -> CreateJob.ResourceId present
public_resource -> { mode }                    -> CreateJob.ResourceId absent
```

No empty string, sentinel ID, fallback lookup or automatic mode is valid. Profile schema validation, SDK round-trip validation and payload-to-manifest hash binding independently enforce the same selector. The public manifest records a null resource-id hash rather than hashing an invented value.

`ListResources` remains in both modes because the operation is part of the reviewed workspace read surface. Exact-quota mode performs bounded pagination until the configured DLC quota is found. Public-resource mode performs exactly one enumeration call and records no quota claim; readiness comes from the documented `CreateJob` omission semantics plus an enabled exact workspace and at least one available CPU spec returned by `ListEcsSpecs`. The check is a control-plane preflight only and does not claim scheduler stock or actual public-resource job acceptance.

## Formal PI product prefix and Pack A terminal state — 2026-07-15

The product-bound prefix is now executable as one normal route chain:

```text
active PaperProject + exact active bridge
  -> active ImplementationProject
  -> admitted CoreMotive + complete literature-backed trace
  -> trace-ready evidence board/binding
  -> admitted ValidationCycle
  -> v2 WorkOrder admission
  -> T1 PI -> T2 EF -> T3 PI -> T4 EF acknowledgement
```

The evidence board/binding establishes PI planning trace readiness; the binding is not an EF scientific result or trusted evidence mint. Admission independently revalidates that the project is `active` and the exact Cycle is `admitted`; caller-supplied ids cannot promote an inactive scope. The product runner uses HTTP routes for the PI-owned prefix and admission, then the production Prisma relay/services for T1-T4 drain, preserving the four domain-local transactions.

Named-local terminal configuration separates one-way writer ownership from intake: cutover remains committed, admission is off, and Pack B simulation is off. The terminal configuration prevents new Pack A work while preserving the exact v2 lineage and allowing a separately authorized Pack B continuation from the acknowledged Run.

## Pack A implemented architecture — 2026-07-13

The first executable authority slice now follows the frozen D-19/D-20/D-21/D-22 design without a compatibility path:

```text
PI T1: admission + current-revision CAS + WorkOrderRevisionAdmitted outbox
  -> EF T2: inbox + exact readiness/materialization + unique Run + RunManifestFrozen outbox
      -> PI T3: inbox + sequence-fenced head CAS + BranchHeadAdvanced outbox
          -> EF T4: final processed inbox receipt (sole durable acknowledgement)
```

Each transaction is repository-owned by exactly one domain. PI and EF exchange exact scalar ids, sequences and hashes through fully hashed typed event envelopes; no cross-domain Prisma relation/FK, shared mutable authority table or 2PC exists. The v2 admission capability gates only T1 intake and defaults off. Relay/consumer draining is independent, so disabling intake after T1 does not strand a committed saga. Ordered RunCell rows remain the only Run-manifest authority; the Run stores only the derived manifest hash.

The typed asset substrate uses five named families and family-specific freeze-command receipts. Server canonicalization owns every revision/event hash. Same-content freeze under a new command key reuses the immutable revision while recording the new command receipt; same key with changed content conflicts. Dataset→DataPolicy, Benchmark→the named corpus/query Dataset roles and EvaluationProtocol→Benchmark/ordered MetricDefinition dependencies are enforced through same-domain exact revision/hash relations and parity checks.

The final source-policy gate binds the exact Wikimedia 2026-07-01 raw source bundle and commit-pinned NQ-Open original-dev workload to their exact Dataset/DataPolicy revisions. The binding closes control-plane source identity/license/access readiness only. Raw-source extraction, derived-corpus hashing, NQ↔corpus scientific alignment, provider execution, existing-environment DB apply and product cutover remain separate boundaries.

### Deep-cleaned Pack A storage and commit fence — 2026-07-14

- Each typed identity owns a stable family-specific key that is independent from `logical_id`; create enforces same-family key uniqueness, update cannot rename that key and Prisma mapping fails closed if relational identity and draft content disagree.
- Draft schema version and canonical hash are derived from the typed draft content when needed; five duplicated `draftSchemaVersion`/`draftHash` column pairs and their five indexes are not persisted authority. `state_version`/expected-version fencing accepts positive integers only.
- VersionLock authority is its exact relational dependency rows plus one server-derived canonical lock hash. The unused `lockSchemaVersion` and `resolvedLockJson` placeholders are removed, so no second lock snapshot can drift from the relational dependency manifest.
- T2's repository commit performs a batched `FOR SHARE` readiness fence inside the same transaction and before inbox/materialization/Run/outbox writes. The fence rechecks the exact attestation target/hash, ordered dependency manifest/hash, all 23 active lifecycle projections and Dataset location; any drift returns a typed conflict with zero partial T2 authority.
- Readiness dependency traversal uses one transaction-local revision/manifest cache. The cache changes query shape, not trust semantics: execution still resolves exact revisions/hashes and never `latest`.

### Event storage and relational hardening — 2026-07-14

- The four PI/EF integration inbox/outbox tables persist only the typed event payload in JSON. Event type/version, ids, aggregate references, branch key and hashes remain structural columns; repositories reconstruct the full typed envelope before delivery or consumer acceptance.
- Payload integrity and envelope integrity are independent fences. Reconstructed events must pass the server canonical payload hash and the canonical full-envelope hash, so a scalar-column substitution cannot be hidden by unchanged payload JSON and duplicated envelope JSON cannot become a second authority.
- Migration `20260714210000_normalize_experiment_v2_event_payloads` rewrites all 38 Pack A same-domain foreign keys to `ON DELETE RESTRICT ON UPDATE RESTRICT`. The migration introduces no PI-to-EF relation, cascade or shared mutable table.
- Nine columns that are intentionally fixed at schema version `v1` are now protected twice: a database CHECK rejects new invalid rows and repository mapping rejects unexpected historical values before they enter typed domain state.
- Shared numeric contracts mirror PostgreSQL `Int` exactly (`-2147483648..2147483647`) for seeds, repeats and run-policy values. Every server-incremented Int authority—revision/lifecycle/projection/state/head/relay/lease/attempt counters—uses the same upper-bound fence before arithmetic or persistence, so overflow cannot wrap or leave a partial transaction.
- Persisted `redacted_manifest` JSON is untrusted on every read. One exact typed v1 parser validates closed keys, nested scope, redacted fields and hashes before replay, scope resolution or provider dispatch; neither repository DTO typing nor a top-level shape check upgrades unknown JSON into authority.

## Pack B implemented architecture — 2026-07-13

Pack B extends only the acknowledged Pack A Run suffix and does not add another PI↔EF event or mutate Pack A authority:

```text
exact Run/RunCells/TaskSpecs + processed BranchHeadAdvanced inbox + exact readiness
  -> E1 payload + cell-scoped Attempt + created event + submit command
      -> E2 lease-version-fenced command claim
          -> E3 command outcome + Attempt CAS + event + next command
              -> E4 succeeded Attempt + CollectionAttempt + collect command
                  -> E5 collected/failed CollectionAttempt + diagnostic-only outputs
                      -> event-derived workflow_simulation_status
```

The six Pack B tables are the complete persisted authority. ProviderPayload is immutable exact-cell input identity; ExecutionAttempt owns cell-local lifecycle and stable provider identity; AttemptEvent is append-only lifecycle history; ProviderCommand owns durable intent/lease/retry state; CollectionAttempt owns replayable collection identity; ProvisionalOutput is immutable and categorically `diagnostic_only`. There is no persisted Run/scientific/workflow aggregate, `SimulationRun`, external provider-job authority, generic record or PI relation.

### Quality-hardened Pack B boundary — 2026-07-14

The remediation preserves the six-family architecture and narrows its executable authority:

- one pure invariant module owns Attempt/event/command/collection/output transition validation for both in-memory and Prisma adapters; service and repository layers no longer duplicate or weaken those rules;
- the exact external job ref established by submit is hash-bound and must remain unchanged through sync/reconcile/cancel/collect; a self-consistent substituted ref is rejected before persistence, while payload-integrity and exact execution-scope failures retain distinct typed reason codes;
- the only allowed diagnostic output keys and their exact hash bindings are one shared closed set; no fourth key, prefix inference or free-form output kind can enter persistence;
- every worker heartbeats immediately before transport, scheduler retries use bounded recursive timeout/backoff without overlapping loops, and the fake ledger is bounded while monotonic invocation counters remain testable;
- HTTP routes publish explicit success/error response schemas and use one exhaustive error-code/reason-code policy; route-specific reason validation prevents an internally valid but endpoint-invalid error response;
- PB14 is a Cycle-wide read fence over every `real` Attempt in `prepared | submitted | running`, explicitly without Run/head filtering. Pack B writers remain simulation-only, so the fence cannot be bypassed by a non-head real Attempt;
- E1 adapters pre-index RunCells/facts and provider payloads; command execution uses exact RunCell/payload repository lookups while revalidating the Run/head/readiness prerequisite for every command. The 1..N-cell lifecycle therefore has no nested cell/fact or cell/payload scan;
- E1 Prisma persistence performs one batched replay/conflict lookup, then uses `createMany` for payloads, Attempts, events and commands; latest Attempt resolution uses grouped maximum sequence plus one exact batch read instead of loading full Attempt history. The in-memory adapter computes latest Attempts in one O(N) pass. A 48-cell relational query-shape test prevents per-cell regression;
- evidence gates run from an explicit child-process environment allowlist, a digest-pinned disposable PostgreSQL image and fresh nonce-named databases; SQL inspection and expected table/constraint/index census fail closed; on POSIX, each command owns a detached process group and timeout sends `SIGKILL` to that group so descendants cannot outlive cleanup;
- named-local app smoke disables all background work, hard-denies fetch, and streams every application table in catalog primary-key order through a bounded read-only cursor. The smoke derives digests without `jsonb_agg` or a full-row sort and proves before/after parity over the complete table set.

The original Pack B migration remains immutable. The only schema correction is the follow-up migration `20260714160000_harden_experiment_foundation_pack_b_v2`: the cleanup rewrites all 15 same-domain immutable FKs to `ON UPDATE RESTRICT`, removes unreachable `collectionSequence` and three redundant indexes, and adds the Cycle-wide active-real fence index. The cleanup does not alter legacy/PI authority, backfill data, create a cross-domain FK or add another persisted status/eligibility authority.

The final Pack A/Pack B cleanup adds one later migration, `20260714210000_normalize_experiment_v2_event_payloads` (`37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`). Four integration tables store payload JSON only; eight structural columns are the reconstructable envelope authority, repositories verify both payload and reconstructed-envelope hashes, all 38 Pack A same-domain FKs are double-`RESTRICT`, nine fixed-v1 columns have database CHECKs, and cascade count is zero. Its read-only preflight derives four named event-table row counts from the existing Pack A authority census without selecting newly added columns. Pending plus any nonzero count is a blocker that requires a separately authorized transform/replacement; partial hardening is failure, while zero rows are only a necessary condition and never apply authorization. Runtime version read fences remain mandatory for pre-existing malformed rows.

Contract and gate maintenance follows the same single-authority rule. Fourteen zero-consumer row schemas and newly dead helper schemas were removed, but domain interfaces, request/event/error schemas and directly consumed training IO schemas remain exported. The hash regex is one shared constant. All 22 T-132 persisted integers in OpenAPI use `format: int32` and an explicit upper bound, with signed minimums on both seed fields; a drift test owns that exact census. D-19 and Pack B use the same disposable lifecycle plus one database-identity validator and marker assertion implementation; reset requires the marker before and after schema recreation, and no inherited/named target can satisfy the disposable guard. Gate meta passed 70/70, backend database identity/guard 10/10 with skip=0 and shared full 330/330. The extraction changes no gate acceptance or database authority.

Stored authority is accepted only through explicit frozen profiles and exact evidence populations. Event, command and provider-control hash-profile identifiers are code-owned closed values, not arbitrary persisted strings. The reviewed D-19 source-policy digest is one portable constant and its two fixture slots are frozen ordered values shared by the Node gate and TypeScript adapter. Evidence summaries and the publisher require exact keysets, exact zero-census/redaction keys and no unknown/missing substitute before publication. ProviderCommand additionally binds the exact authoritative Attempt provider-payload id and hash on every read, claim, heartbeat, release, terminal outcome and collection path; cancel terminal reason must agree with Attempt/command semantics. No self-consistent JSON rewrite, alternate profile, payload substitution or reason drift may become replay/dispatch authority, and all such failures precede database mutation or transport.

The fake transport receives re-materialized canonical bytes plus one exact payload hash and Attempt provider idempotency identity for submit/sync/reconcile/cancel/collect. The fake transport contains no credential or network implementation. `workflow_simulation_status` is rebuilt from one atomic read of Attempt/event/collection facts; Run and RunCell remain scientifically `not_started` and simulation cannot satisfy any scientific writer.

Cancellation is a durable intent with explicit linearization. A pending-submit cancel is one zero-transport transaction. If submit is leased while Attempt is still `prepared`, cancel is persisted but not claimable until submit E3 or lease recovery exposes the external identity; then cancel is selected before sync. A pending/claimed cancel also fences E4 so an already leased reconcile cannot overtake the cancel into Collection creation. Exact command outcome and collection commits validate command/event/payload/external-ref parity before CAS, and every lease-mutating path compares owner plus `lease_version`.

### Named local-development rollout placement — 2026-07-14

The local rollout preserves the architecture's independent gates. Historical Pack A/Pack B landing probes temporarily enabled gitignored local cutover/admission/simulation overrides; the deep-cleanup closure recompiles all three to `false`, while repository defaults remain `false`. Disabling Pack B blocks only new E1 intake; committed command drain remains independent. A future separately authorized enablement still cannot manufacture dispatch eligibility: E1 must re-resolve an exact Run/RunCell/TaskSpec plus the processed `BranchHeadAdvanced` inbox receipt and exact readiness before any Pack B write.

At the 2026-07-14 readiness checkpoint, the named local database contained the typed asset/readiness substrate but no PI v2 admission, Run/head or acknowledgement, and all three local admission/cutover/simulation flags were `false`. The isolated historical enabled probe ended at `EXECUTION_HEAD_ACK_REQUIRED`; all six Pack B tables were empty. The 2026-07-15 formal product landing supersedes that missing-head state: exact PI admission/Run/head/ack now exists, cutover is committed, admission/simulation are off, and Pack B tables remain empty. Disposable fixture import, legacy-row trust upgrade and direct Pack B table seeding remain forbidden.

Remaining implementation risks from the 2026-07-10 review after Pack A/Pack B deep cleanup:
- legacy generic upsert remains present only for diagnostics/legacy workflows and is mechanically ineligible for v2 authority; the legacy path must not regain a product writer;
- scientific validation does not execute enough of EvaluationProtocol to justify evidence trust;
- the legacy provider path remains provider-oriented and scientifically unsafe, but the independent Pack B simulation lane now has durable crash recovery and a hard diagnostic-only/no-scientific-writer boundary;
- EF→PI has incomplete brokers/projections and more than one possible trust ingress;
- desktop lists are not consistently project/lineage scoped.
- PI and EF do not yet share an executable ValidationCycle/WorkOrder branch/revision/Run/ExecutionAttempt scope contract; current WorkOrder records do not express stable branch identity plus immutable revisions.
- repository search is currently domain-local and structural; the existing Literature pgvector lifecycle is Literature-owned and is not a global PI/EF retrieval authority.

## Target product chain

```text
PaperImplementation
  PaperProject / ImplementationProject
  -> ValidationCycle
  -> WorkOrder branch (stable logical identity + PI semantic frame)
  -> admitted immutable WorkOrder revision + exact_cell_plan/cell_plan_hash + approved_plan_hash
  -> ResearchWorkOrderBroker

ExperimentFoundation
  candidate / reusable canonical assets
  -> VersionLock / RunRecipe
  -> TrainingTaskSpec
  -> Run bound to exact WorkOrder revision/hash
  -> durable provider-control ExecutionAttempt
  -> real cloud provider execution (deferred beyond first release)
  -> ExperimentResult / scientific validation / qualified EvidenceCandidate

First-release verification branch
  same mode-neutral Run/cells + TaskSpec/provider payload
  -> non-production, cell-scoped simulation ExecutionAttempts
  -> lifecycle/blocker projection only
  -> no ExperimentResult / EvidenceCandidate / RunEvidenceUnit

ExperimentFoundation -> PaperImplementation
  lifecycle/blocker projection -> owning ResearchWorkOrder
  eligible EvidenceCandidate -> Evidence Trust Gateway -> RunEvidenceUnit
  exact Run/Attempt facts -> ValidationCycle closure embedded snapshot/hash
  -> CycleReadyForInterpretation -> exact-hash-bound Result Analysis proposal
  -> existing ValidationCycle closure action -> authoritative scientific disposition + server-derived selected exit
  -> closed-Cycle ResultInterpretationPacket -> claim / dossier / next-step draft (owned by PaperImplementation)
  -> rebuildable PaperExperimentSidecar display from the closed snapshot

Standalone ExperimentFoundation exploration
  -> exploratory run (not paper-trusted)
  -> explicit attach-to-WorkOrder request
  -> identity/readiness/validation/project recheck
  -> same Evidence Trust Gateway
```

## Product interaction contract — confirmed 2026-07-11
The names below are conceptual contracts; Phase 0 confirms final API/event names.

| Direction | Conceptual contract | Authority carried | Receiver obligation |
|---|---|---|---|
| PI → EF | admitted experiment intent / WorkOrder command | PI project, ValidationCycle, WorkOrder revision, exact scientific cells/hash, gate/admission, research objective and requested action | EF resolves immutable assets, validates exact-cell/readiness/project scope and materializes Recipe/TaskSpec/provider bindings without choosing cells |
| PI → EF | submit/cancel/retry/reconcile intent | user/workflow intent and idempotency/correlation key | EF remains authoritative for allowed ExecutionAttempt transitions and external side effects |
| EF → PI | lifecycle projection | EF Attempt lifecycle/provenance, derived scientific Run completeness, blockers and recoverability | PI updates WorkOrder coordination state idempotently without copying EF canonical state or translating simulation terminality into scientific Run terminality |
| EF → PI | trusted evidence envelope | immutable EF refs/hashes, complete protocol-compliant validation qualification, approvals and provenance | PI verifies same-project/WorkOrder scope; the sole Gateway creates RunEvidenceUnit and PI decides downstream use without upgrading qualification |
| EF → PI | execution-accounting facts | exact Run/Attempt refs, execution state, eligibility code and any eligible EvidenceCandidate refs | PI freezes the existing Cycle closure record's embedded immutable snapshot/hash once; Sidecar only rebuilds/displays that scope and dossier consumes explicit closed snapshots |
| PI internal | interpretation proposal → Cycle closure → downstream packet | exact Cycle frame/snapshot/evidence hashes; proposal-only model output; one authoritative closure disposition/selected exit | ClosureService alone writes disposition and derives exit; ResultInterpretationPacket/Claim/Dossier consume only the exact closed Cycle |
| EF standalone → PI | attach-to-WorkOrder request | original exploratory lineage plus target PI project/WorkOrder | both domains rerun identity, readiness, scientific and authorization checks; attachment alone grants no trust |

### Interaction principles
- PaperImplementation owns **paper intent, contextual scientific disposition and use**: why the experiment exists, the target project/ValidationCycle/WorkOrder, scheduling priority, the one Cycle-closure conclusion/selected exit, downstream interpretation and whether evidence is used.
- ExperimentFoundation owns **experiment truth and protocol compliance**: canonical inputs, materialization, attempt/run state, raw results, exact-batch typed validation, exception qualification and EvidenceCandidate. EF never assigns the paper-context `positive | negative | inconclusive` conclusion.
- Command intent flows PI→EF; authoritative execution facts flow EF→PI. The two domains do not edit the same canonical state.
- PI may request cancel/retry, but EF decides and records the actual run transition. EF may report scientifically qualified evidence, but PI decides whether to use the EF evidence without upgrading the qualification.
- A correlation tuple must connect PI project/WorkOrder, EF Recipe/TaskSpec, required Run cell, ExecutionAttempt and returned evidence across retries and projections.
- For paper-bound work, the tuple is versioned and exact: ImplementationProject → ValidationCycle → WorkOrder branch/logical identity → WorkOrder revision/hash + `cell_plan_hash` + `approved_plan_hash` → Run/`run_manifest_hash` → required `cell_key`/TaskSpec ref+hash → ExecutionAttempt. The exact scientific cell authority originates in PI before admission; the Run cell remains an EF value object with added execution bindings, and EF never resolves execution from `latest`, ranges or generator metadata.

## Experiment iteration and retrieval model — D-10 confirmed 2026-07-12

### Canonical hierarchy and ownership

```text
ImplementationProject
└─ ValidationCycle                         PI authority
   └─ WorkOrder branch                     PI stable logical identity
      └─ immutable WorkOrder revision      PI exact admitted plan
         └─ required-cell batch Run        EF immutable execution fact
            └─ ExecutionAttempt            EF cell-scoped technical-attempt fact
```

- ValidationCycle owns the scientific question, assumptions and decision exits. Changing that decision boundary creates a new ValidationCycle.
- A WorkOrder branch is one stable PI-owned experimental path. Its minimum semantic frame is `branch_intent`, `expected_effect` and `difference_from_parent`, plus structured `parent_branch_id` and optional forked-from Run ref.
- A WorkOrder revision is an immutable exact plan within one branch and carries the revision/hash plus `approved_plan_hash`. D-11 makes preservation/fork classification mechanical: PI declares `revise | fork`, and the service compares frozen branch fields/hashes rather than semantic distance.
- Run/TaskSpec/ExecutionAttempt/result facts belong to EF. Every fact binds the exact PI scope supplied at admission, but EF does not rewrite or summarize the research meaning.
- Branch head is an explicit PI projection advanced by D-13b from a frozen Run event and is never inferred from `MAX(created_at)`, lifecycle status, metric value or semantic similarity.

### Deterministic revise/fork classification — D-11 confirmed 2026-07-12

| Input change or action | Required object transition |
|---|---|
| edit before the first WorkOrder admission | CAS-update the same draft; no immutable revision or branch fork yet |
| retry the exact same cell/TaskSpec after a technical/provider failure | create a cell-scoped EF ExecutionAttempt under the same immutable batch Run; never create another Run |
| author ranges/grid/seed-count before admission | PI draft service deterministically compiles, normalizes and persists the exact ordered 1..N scientific cells; no EF Run exists |
| materialize the admitted exact cell plan after admission | EF validates one-to-one scientific-cell parity, adds TaskSpec/provider bindings and freezes the exact WorkOrder revision's only required-cell Run per D-13a/D-15 |
| change exact plan fields or any seed/repeat/parameter/result-contract/cell membership while the frozen branch semantic-frame hash and parent/fork relation remain identical | create a new immutable WorkOrder revision, require WorkOrder admission again and use the revision only for its future Run |
| change a WorkOrder input that would resolve a different TaskSpec, or attempt to replace an already frozen TaskSpec binding | create and admit a new WorkOrder revision for future materialization; never mutate/rebind the existing Run |
| change `branch_intent`, `expected_effect`, `difference_from_parent`, `parent_branch_id` or forked-from Run relation | create/fork a new WorkOrder branch with a new stable logical identity |
| change the ValidationCycle question or positive/negative/inconclusive exit definitions | create a new ValidationCycle |

- PI calls explicit `revise` or `fork`; the backend rejects `revise` when the frozen branch-frame hash/relation changes and returns `fork` as the stable next action. Models may draft either object but do not decide through a similarity threshold.
- A new revision or branch never mutates, supersedes in place or rebinds an in-flight/completed Run. The old Run continues under the original revision or receives an explicit cancel intent through EF.
- `current_admitted_revision_id` and `head_run_id` are distinct explicit projections. D-11 defines identity selection; D-13a defines Run granularity, while D-13b separately defines when a branch head advances.

### Immutable required-cell batch Run — D-13a confirmed 2026-07-12
- D-13a applies to PI-originated paper-bound execution. Before successful preparation an admitted WorkOrder revision has zero Runs; the revision may create at most one Run, and successful manifest freeze establishes the revision's only Run. Replaying the same revision/input is idempotent only when the canonical manifest/hash matches; a second or conflicting Run is rejected.
- The Run is an immutable scientific batch, not one provider job or one seed. Its `run_manifest_hash` covers a canonically ordered list of exactly the admitted 1..N required cells. Each Run cell preserves the admitted stable `cell_key`, seed, repeat index, exact parameter bindings and required result contract, then adds EF-owned TaskSpec ref/hash and result bindings.
- A cell is an embedded Run value object, not a new cross-module aggregate, WorkOrder branch, evidence unit or head candidate. No `RunSet`, `RunGroup` or Cycle-wide execution bundle is introduced.
- Every provider submission/retry is an ExecutionAttempt bound to the exact Run, `cell_key` and TaskSpec ref/hash. A technical/provider failure may add an Attempt; a completed scientific result cannot be rerun as a technical retry to seek a better metric.
- Simulation and real-provider provenance live on ExecutionAttempt, not on separate Runs. A simulation Attempt never satisfies required-cell scientific completeness. While the owning Cycle remains open, a later authorized real Attempt may use the same Run/cell only when the exact TaskSpec/payload and scientific boundary are unchanged; after Cycle closure, later real execution requires a successor ValidationCycle and a newly admitted WorkOrder revision/Run, although exact TaskSpec content may be reused.
- Adding/removing a cell or changing any seed, repeat index, parameter binding or required result contract changes the PI-owned exact plan. A WorkOrder-input change that would resolve a different TaskSpec also requires a new revision/admission, but the TaskSpec ref/hash itself remains an EF-owned post-admission binding rather than a field of `exact_cell_plan`. The frozen Run is never appended to, rebound or rewritten.
- All cells are required in the first release. Run-level validation starts only when every required cell has one complete result. Exhausted/missing/failed/cancelled cells keep the Run visible but incomplete/ineligible for EvidenceCandidate; D-03b's no-partial rule remains unchanged.
- Optional cells, runtime-discovered cells, dynamic sweep/HPO, result-dependent expansion and post-start manifest mutation are out of scope. Distributed workers for one TaskSpec remain an execution detail of one cell rather than extra scientific cells.
- Standalone EF exploration remains governed by D-09. D-13a does not retroactively mutate or rebind an existing standalone Run into a paper-bound revision.

### Exact cell-plan admission authority — D-15 confirmed 2026-07-12
- PI draft authoring may use ranges, finite grids, seed counts or model suggestions, but none is execution authority. Before the single WorkOrder admission, a deterministic PI-side compiler normalizes and persists an explicit non-empty ordered `exact_cell_plan[1..N]` inside the immutable WorkOrder revision.
- Each admitted cell freezes a PI-server-derived `cell_key`, seed, repeat index, exact parameter bindings and required-result contract. Canonical ordering, duplicate rejection and canonical numeric/object serialization produce one `cell_plan_hash` covered by `approved_plan_hash` together with the established authoritative WorkOrder fields. If authoring constraints are retained as provenance, they remain non-authoritative; their storage/content-hash treatment is a Phase 0 implementation decision.
- The exact cell plan is an embedded WorkOrder revision value collection, not a `CellPlanManifest` aggregate, RunSet/RunGroup, generator registry or user-configurable sweep DSL. Draft compilation and preview add no AuthorityAction; the user still approves the complete revision once.
- EF receives exact cells/hash after admission and may only validate scope/readiness, resolve immutable assets and materialize Recipe/TaskSpec/provider payloads one-to-one. TaskSpec refs/hashes are EF-owned post-admission bindings and therefore are not WorkOrder-admission prerequisites.
- Extra, missing, duplicate, substituted or scientifically drifted Run cells fail before Run freeze, `RunManifestFrozen`, branch-head advancement or Attempt creation. Materialization failure blocks the exact cell; EF cannot choose a replacement, default scientific seed/parameters/result contract or sample another point. Operational provider-default boundaries remain a separate decision.
- Any admitted cell change creates a new WorkOrder revision and re-admission. Before admission, the same draft may be recomputed through CAS. Generator-only admission, post-admission sampling/default expansion, optional/dynamic cells, adaptive HPO and result-dependent expansion remain out of scope.
- Existing `autotune_policy`/`allowed_mutation_refs` cannot authorize runtime scientific-cell mutation for v2 admitted paper work. If retained for compatibility or authoring they are non-authoritative; retry budget applies only to technical Attempts of the same exact cell.
- A standalone exploratory Run attached under D-09 must restate its exact scientific cells as a new PI WorkOrder revision and pass the same admission/parity checks; the exploratory generator or manifest does not gain paper authority by attachment.

### Sequence-fenced branch-head advancement — D-13b confirmed 2026-07-12
- PI assigns every WorkOrder revision an immutable, branch-local monotonically increasing `branch_revision_seq`. The scalar is server-issued fencing metadata, not user input, research semantics, creation time, quality rank or policy authority.
- EF atomically persists the immutable Run/manifest and a `RunManifestFrozen` outbox event carrying exact project/Cycle/branch/revision/hash/`approved_plan_hash`/sequence/Run/manifest scope. EF never writes PI's head projection.
- PI consumes the event through an idempotent inbox, resolves the exact admitted revision and updates `head_run_id` in the same PI transaction that persists `BranchHeadAdvanced`. PI never mutates the EF Run.
- Sequence handling is deterministic: same sequence + same Run/manifest is idempotent; lower sequence is consumed as stale history and cannot roll back head; same sequence + different Run/manifest is a one-revision/one-Run invariant violation; an event whose admission is not yet visible waits/retries and cannot dispatch.
- EF must consume the exact durable `BranchHeadAdvanced` acknowledgement before creating the first ExecutionAttempt or dispatching any cell. The sequence is an outbox/inbox saga, not a cross-domain authority transaction—even under one database—or two-phase commit.
- If a newer revision advances head before an older frozen Run is acknowledged, the stale un-dispatched Run remains immutable lineage/diagnostic history and produces no external side effect. If an older Run already started, a new head does not cancel or rebind the Run; only an explicit EF cancel intent can stop the Run.
- `head_run_id` means the branch's latest frozen execution-lineage Run. The head does not mean latest successful, currently running, metric-best, evidence-qualified or downstream-adopted Run. A latest Run that later fails or is cancelled remains head; no automatic rollback occurs.
- Head advancement and replay are automatic coordinator plumbing inside the admitted boundary. They create no AuthorityAction, CoordinatorStop acknowledgement or model decision.

### Orthogonal simulation and scientific state — D-14 confirmed 2026-07-12
- Run itself is mode-neutral and has no simulation/real provenance. Provenance and provider lifecycle belong to each cell-scoped ExecutionAttempt; no SimulationRun, second Run or RunSet is introduced.
- A simulation Attempt may become terminal as `succeeded | failed | cancelled` in its own lifecycle, but that terminality cannot change required-cell scientific completeness or make the Run scientifically completed, failed or cancelled. `scientific_execution_status=not_started` is the contract/read-model expression for a Run with no eligible real-provider scientific result, not a second mutable status authority.
- Scientific completeness is derived only from eligible real-provider Attempts that publish a complete ExperimentResult for every required cell. Complete-looking simulation output is neither a scientific result nor a scientifically negative result.
- `workflow_simulation_passed | blocked | failed` is derived from immutable simulation Attempt events into verification artifacts and a rebuildable PI/Sidecar control projection. The derived workflow status is not an EF Run status, ExperimentResult, ResultValidationReport, EvidenceCandidate or Evidence Trust Gateway input.
- PI may close a Cycle that intentionally performed no real execution with `closure_kind=control_flow_validated_no_paper_evidence`, `scientific_disposition=null` and `selected_exit=null` only after the required control checks are terminal and the D-18 closure watermark is stable. The closure records current admitted revision/effective-head Run/cell/Attempt refs, `scientific_execution_status=not_started` and `evidence_eligibility=false`; the closure changes PI workflow state only and never mutates EF facts.
- Any non-terminal real-provider Attempt anywhere under the Cycle, including an Attempt on a superseded/non-head Run, blocks Cycle closure until terminal or explicitly cancelled. While the Cycle remains open, a later authorized real-provider Attempt may remain on the same Run/cell only under D-13a's exact boundary; after closure that Run is history-only and follow-up execution requires a successor Cycle/new Run lineage.
- D-14 adds no AuthorityAction, CoordinatorStop acknowledgement, RecoveryAction or PlumbingAction. The existing Cycle-closure AuthorityAction is sufficient.

### Scientific evidence versus execution accounting — D-16 confirmed 2026-07-12
- Scientific evidence follows exactly one path: complete protocol-compliant validation-passed EvidenceCandidate → PI Evidence Trust Gateway → RunEvidenceUnit/TraceManifest/outbox. Results later classified by PI as positive, negative or inconclusive traverse the same completed-execution/evidence path; those labels are not EF/REU state.
- Execution accounting follows a different singular path: the D-18 current-effective branch/revision/head Run/cell/Attempt facts → the existing PI ValidationCycle closure record's embedded immutable snapshot/hash. Failed, cancelled and incomplete effective-head execution appears by exact ref, execution state and eligibility code and never creates RunEvidenceUnit.
- Cycle closure also records eligible REU refs for complete validated effective-head results, so one frozen snapshot inventories the complete current effective decision scope at the closure watermark without turning execution failure into evidence or importing historical Runs. The closure snapshot is an embedded value on the existing Cycle closure record, not a new aggregate.
- PaperExperimentSidecar references/rebuilds the exact snapshot/hash plus authoritative events for display. Sidecar cannot be independently edited, cannot mint trust and cannot become a second failure ledger or dossier accounting authority.
- Dossier readiness declares the exact closed-Cycle snapshot refs/hashes consumed by the dossier. The service re-resolves project/Cycle scope and hash, rejects open/tampered/incomplete/wrong-project snapshots and cannot infer scope by scanning all project RunEvidenceUnits.
- The current T-124 S3 path that creates trusted failed/cancelled REU and performs a project-wide failed-like REU scan is superseded target semantics and a mandatory atomic migration debt. Historical rows/tests remain audit evidence only; they cannot satisfy the v2 gateway, claim or dossier contract, and no dual-read/fallback remains after cutover.
- No FailureEvidenceUnit, second gateway, new closure authority, per-Run confirmation or additional user action is introduced. Existing Cycle closure and dossier export actions retain their D-12 counts.

### Executable protocol and scientific-conclusion responsibility chain — D-17 confirmed 2026-07-12

D-17 separates four questions that the current contracts mix together:

1. **May the immutable Run be scientifically validated?** EF checks non-configurable provenance/scope/completeness envelope invariants.
2. **Did the complete Run satisfy its declared measurement protocol?** EF executes typed supported rules and owns the validation report/EvidenceCandidate.
3. **What does the resulting evidence mean for the frozen research question?** PI Result Analysis proposes an interpretation against the frozen ValidationCycle frame.
4. **Which conclusion and next exit are authoritative?** The existing PI ValidationCycle closure action alone writes the Cycle disposition and the server derives the selected exit.

#### One responsibility chain

| Stage | Authority object | Trigger and sole writer | Output/consumer | Forbidden second authority |
|---|---|---|---|---|
| EF execution eligibility | exact Run manifest + required-cell result envelope | complete real-provider cell results arrive; EF ScientificValidationService resolves exact v2 lineage | validation may begin, or stable execution/eligibility blocker enters Cycle closure accounting | protocol rule disabling real-provider, lineage, exact-cell, seed/repeat/params or completeness invariants |
| EF protocol compliance | batch-scoped validation report | ScientificValidationService executes the frozen validator profile over the exact Run | `passed | failed | unsupported`; only `passed` may atomically create EvidenceCandidate/outbox | adapter/monitor/generic route/caller-authored report or Candidate; LLM/free-text rule interpretation; human waiver |
| PI trusted evidence identity | RunEvidenceUnit + TraceManifest | PI Evidence Trust Gateway consumes one eligible EvidenceCandidate event idempotently | exact evidence identity/lineage for Cycle interpretation | `run_status=negative|inconclusive`, caller trust flags or failed/cancelled/incomplete REU |
| PI interpretation proposal | admitted Result Analysis runtime artifact | PI control plane derives Cycle readiness and invokes Result Analysis once for the exact closure-input/evidence hash | one proposed disposition, evidence roles, rationale, uncertainty, limitations and claim ceiling | four scenario outputs acting as four conclusions; direct Cycle/packet writer payload |
| PI scientific conclusion | embedded ValidationCycle closure assessment + snapshot/hash | existing Cycle-closure AuthorityAction; PI ClosureService/StateWriter validates exact scope/hash and writes once | authoritative nullable disposition and server-derived selected exit; emits `ValidationCycleClosed` | EF, REU, model, client, standalone ResultInterpretationPacket or a new ScientificConclusion aggregate |
| PI explanation and downstream use | ResultInterpretationPacket, then ClaimCandidate/Dossier/next-step drafts | after exact Cycle closure, T-098 deterministically materializes the accepted interpretation from closed-Cycle/proposal refs/hashes | claim boundary, dossier/writing, motive/retrieval projection and future draft preparation | consumers reading an open proposal, project-wide REU population or EF validation status as the conclusion |

#### EvaluationProtocol v2 execution model

- One immutable EvaluationProtocol revision contains one canonically ordered typed `required_rules` collection. The server canonical revision/content hash covers the complete collection; if a `protocol_hash` API field remains, the field is derived from that same canonical payload/profile rather than supplied as a second hash authority.
- Descriptions, source notes, legacy `Record<string, unknown>` policies and string validity constraints are catalog/provenance text only. They cannot be executed, inferred by an LLM or used as fallback semantics.
- A code-local closed capability map resolves exact `rule_type@rule_version` plus its config schema/handler. The capability map is not a database-editable manifest, general rule DSL, evaluator plugin platform or human policy engine.
- Readiness checks every required rule before Run freeze, `RunManifestFrozen`, head advancement or Attempt creation. Missing/malformed/unsupported handler/config returns stable `UNSUPPORTED_RULE`. Final validation rechecks the frozen `validator_profile_version/hash`; support drift cannot silently change a Run's meaning.
- The first supported slice contains `metric_contract@v1` and `artifact_contract@v1` only. Metric checks cover exact definition ref/key, required cardinality, split, type, unit, finite value and declared typed domain. Artifact checks cover required kind/cardinality, hash/checksum and output/parser linkage.
- Exact v2 protocol/benchmark/dataset/metric refs and hashes, real-provider provenance, exact Run/cell/result lineage, all-required-cell coverage and admitted seed/repeat/params/required-result parity are non-configurable envelope invariants. PI's per-cell `required_result_contract` is compiled from the locked protocol plus cell role for collection/materialization shape; the result contract cannot add, relax or compete with protocol scientific rules.
- Active aggregation derivation, comparison, statistical test, target threshold, fairness computation or custom evaluator rule is unsupported in the first scientific-validation capability slice. If a protocol declares one as required, `UNSUPPORTED_RULE` blocks; omission does not let the system claim that a stronger scientific protocol was executed.
- T-131's immutable promoted `v1-cpu-adapter` record remains catalog/provenance history only. Its free-shape policies, unmanaged seed, mixed faithful-only metrics and unresolved benchmark forward ref cannot obtain v2 executable/evidence readiness. Product use starts from original-source import into a new typed v2/versioned protocol identity and new readiness, without rewriting the earlier promotion.

#### Batch validation report and writer boundary

- The validation subject is one immutable required-cell batch Run, never one adapter job, Attempt or cell. The report binds exact Run ref/`run_manifest_hash`, canonically ordered cell/result refs and hashes, exact EvaluationProtocol revision/hash, `validator_profile_version/hash`, ordered rule results and the complete validation hash profile.
- Overall status is only `passed | failed | unsupported`. `accepted_partial`, `partial`, execution `failed/cancelled/incomplete` and PI `positive/negative/inconclusive` do not share the validation-status field.
- A real-provider execution that is still active or has no complete required-cell result set does not acquire a scientific conclusion; its exact state and eligibility code remain in Cycle closure accounting. A collected complete envelope with a missing/invalid required metric/artifact may receive `failed`, but never EvidenceCandidate.
- ScientificValidationService is the only writer for validation report, generated validated facts and EvidenceCandidate. Product generic-record writes and direct adapter/monitor/repository construction are forbidden. For `passed`, report/Candidate/outbox persistence is atomic or converges through one idempotent transaction key; Candidate references the report and has no caller-writable duplicate validation truth.
- The validation hash covers the complete subject, protocol/validator identities and ordered rule results. A hash that omits protocol lock, missing artifacts, rule results or generated fact identities cannot qualify evidence.

#### Cycle-ready trigger and conclusion assignment

- PI derives `CycleReadyForInterpretation` only after PI can CAS-freeze the D-18 current-effective scope: the admitted branch set and each current revision plus matching effective head Run/cells/all Attempts. A no-head branch remains visible in the candidate but returns `BRANCH_HEAD_NOT_FROZEN`; pending head acknowledgement and any active real-provider Attempt anywhere in the Cycle block readiness. Non-head history is not snapshot membership.
- If one or more eligible REUs exist, PI invokes Result Analysis once and idempotently with the admission-frozen Cycle frame plus exact closure-input/evidence refs/hashes; D-17 does not require a new persisted `interpreting` state. If none exist, PI prepares a no-evidence/control-only closure and does not invoke scientific interpretation.
- Result Analysis returns one `proposed_scientific_disposition` plus evidence-to-assertion roles, rationale, uncertainties, limitations, forbidden overclaims and claim ceiling. Positive/negative/inconclusive/failed-run scenario analysis may remain counterfactual support, but scenario analysis is never an authority set; execution failure is not a candidate scientific disposition.
- The existing Cycle-closure AuthorityAction presents that proposal and exact facts once. The researcher may accept or correct the proposal inside the same action; no additional confirmation is introduced. ClosureService validates proposal/snapshot/version hashes and atomically freezes the closure assessment and D-16 accounting snapshot/hash. Missing, failed or stale proposal generation blocks a scientific closure with a stable retry/fix state; the blocker does not open a bare human-assessment, packet or second-authority fallback. The no-evidence/control-only path remains the separate null-disposition closure case.
- Scientific disposition is `positive | negative | inconclusive | null`. `null` means there is no scientific conclusion, including no eligible evidence or control-flow-only closure; null is not a synonym for `inconclusive`. Closure kind and scientific disposition remain orthogonal, so execution failure/cancellation/incompleteness can never become negative science.
- ValidationCycle freezes `decision_if_positive`, `decision_if_negative` and `decision_if_inconclusive` before admission. ClosureService selects the matching exit from the authoritative disposition; clients cannot submit a standalone `decision_exit`. A no-evidence/control-only closure has no scientific selected exit and follows its explicit non-scientific stop/closure policy. Changing the definitions creates a new ValidationCycle under D-11.

#### Downstream consumption and directionality

- `ValidationCycleClosed` is the only trigger for accepted ResultInterpretationPacket materialization. The packet points to the exact closed Cycle/assessment/snapshot and accepted proposal refs/hashes, explains evidence roles/limitations/claim ceiling, and cannot replace or rewrite disposition/selected exit.
- The immutable Cycle does not require a later packet ref to become closed; Packet → closed Cycle is the canonical direction. The one-way relation avoids a Cycle→future Packet→Cycle write cycle. Cycle outputs may project packet availability after the fact but are not part of the closure hash authority.
- Selected exit may automatically prepare `revise | fork | stop | proceed` drafts/candidates for a successor ValidationCycle, but draft preparation cannot reopen the closed Cycle, admit a WorkOrder, execute a Run, broaden scope or perform an external effect. Those transitions retain their existing gates.
- ClaimCandidate, Dossier, motive evolution and PI retrieval projections require exact closed-Cycle disposition/snapshot/hash and accepted packet lineage. They reject an open Cycle, proposal-only artifact, wrong project/Cycle/hash or mixed run-status inference.
- EF never consumes the scientific disposition and never rewrites an old Run. A follow-up experiment after closure starts from a successor ValidationCycle and its newly admitted PI WorkOrder revision/branch under D-11/D-13/D-15; the closed Cycle accepts no new execution lineage.
- D-17 adds no aggregate, second human gate, RecoveryAction or PlumbingAction. The T-132 fixed flow remains `1/2/0/0`; the T-124 full-paper reference remains `1/4/0/0`.

### Current-effective closure scope and watermark — D-18 confirmed 2026-07-13

- ValidationCycle closure is a scientific decision snapshot, not a project/Cycle history archive. Its authority is the complete current effective decision scope at one `closure_watermark`.
- The watermark binds the expected Cycle lifecycle/version and one canonically ordered branch set containing every branch with a `current_admitted_revision_id` at preview time. For each branch, the snapshot freezes current admitted revision id/hash/sequence and its matching effective head Run id/manifest hash, complete ordered required cells, every ExecutionAttempt on those cells, execution/eligibility state and eligible REU refs.
- If the current admitted revision has no matching frozen/acknowledged head, the older branch head is historical and cannot stand in. The closure candidate retains the branch as `effective_head_run_ref=null` and returns stable `BRANCH_HEAD_NOT_FROZEN`; closure cannot commit until the exact `RunManifestFrozen → BranchHeadAdvanced` saga converges.
- Superseded revisions and non-head Runs/Attempts remain immutable, structurally queryable audit lineage but are excluded from snapshot membership, dossier accounting and automatic Result Analysis input. They do not disappear from storage and require no summary/archive model.
- A prior v2 result may participate as comparison context only when the current admitted revision explicitly freezes an immutable `comparison_input_ref/hash`. The server re-resolves its project/Run/result/evidence lineage and includes the comparison identity in the proposal/closure-input contextual hash, not in execution-accounting membership or head selection. D-08 legacy rows cannot be upgraded or referenced as trusted comparison input.
- Closure readiness performs a Cycle-wide active-real-Attempt fence independent of snapshot membership. Any non-terminal real-provider Attempt under the Cycle, including one on a superseded/non-head Run, returns `CYCLE_ACTIVE_REAL_ATTEMPT` until terminal or explicitly cancelled.
- Closure compare-and-freeze uses expected Cycle version, canonical branch membership, per-branch current revision sequence/hash, effective head Run/manifest and the active-Attempt fence. Any concurrent admission, head advance, manifest change or Attempt start returns `CYCLE_CLOSURE_SCOPE_DRIFT`, writes no partial closure and requires snapshot/proposal rebuild; exact same watermark/hash replay is idempotent.
- Once `ValidationCycleClosed` is committed, admission/revise/fork, Run freeze/head advance, new Attempt/retry, standalone attachment and provider dispatch under that Cycle fail closed with zero domain/outbox/provider writes. Result-driven follow-up uses a successor ValidationCycle; immutable TaskSpec content may be reused but Cycle/Run lineage is never rebound.
- ResultInterpretationPacket is materialized only after closure and is excluded from the closure hash. D-18 adds no aggregate, history scan, confirmation or action-budget change.

### First implementation acceptance slice — D-19 confirmed 2026-07-13

- D-19 chooses a thin admission-to-head spine as the first cross-module implementation acceptance endpoint. The D-19 boundary rejects both an EF-only trust-kernel product acceptance and a first slice that attempts the entire simulated control-plane/Cycle closure.
- Input prerequisites are one already bound PaperProject/ImplementationProject/ValidationCycle, one PI WorkOrder draft and typed v2 protocol/assets persisted through the real Phase 1 identity/readiness path. Test setup may seed original typed content but cannot author hashes/readiness directly. PaperProject bootstrap, candidate ingestion, catalog promotion and legacy conversion are outside D-19.
- PI admits one immutable WorkOrder revision with a canonical two-cell `exact_cell_plan`; two cells are the minimum acceptance fixture that proves batch/cell parity, while the domain contract remains 1..N.
- EF materializes or exact-reuses exactly one VersionLock, exactly one RunRecipe and exactly two TrainingTaskSpecs for the two admitted cells, preserving both key/seed/repeat/params/result-contract tuples. EF then atomically freezes the revision's only Run/manifest and emits `RunManifestFrozen`.
- PI consumes the exact event through its inbox, validates project/Cycle/branch/revision/hash/sequence/manifest scope, sequence-fenced CAS-advances `head_run_id` and atomically emits `BranchHeadAdvanced`. EF consumes that acknowledgement and persists one exact durable receipt.
- The acceptance endpoint is the durable EF acknowledgement. D-19 creates no ExecutionAttempt and exposes no provider-capable submit path; acknowledgement is not a second `dispatch_eligible` truth field. Phase 3 later derives the dispatch precondition from the exact acknowledgement receipt.
- Required implementation layers are shared versioned contracts, typed HTTP commands/readback, PI/EF services, repository ports, Prisma persistence and durable inbox/outbox replay. The new v2 capability is default-off outside approved execution/test scope, writes no legacy row and performs no dual write.
- D-19 explicitly excludes provider payload/network calls, simulation, CollectionAttempt, ExperimentResult, ScientificValidation, EvidenceCandidate, REU, D-18 Cycle closure, ResultInterpretationPacket, desktop/search projection and legacy migration. Passing D-19 proves only immutable cross-module scope/head convergence.
- Replay/conflict proof covers same input/event idempotency, stale/lower branch sequence without rollback, same sequence with conflicting Run/manifest fail-closed, PI crash around head CAS/outbox and EF crash around acknowledgement receipt. Final scans must show one revision, one two-cell Run, one head, one acknowledgement and zero excluded records/effects.
- D-18 remains globally authoritative for later phases: a real-provider Attempt anywhere in the Cycle, including on a non-head Run, returns `CYCLE_ACTIVE_REAL_ATTEMPT` and blocks closure. D-19 itself produces no Attempt and therefore cannot claim the runtime path is implemented.

### Four domain-local authority commits — D-20 confirmed 2026-07-13

- D-20 defines four successful **domain-authority** commit boundaries, not a global limit of four SQL transactions. PI and EF keep separate repositories, inbox/outbox ownership and Unit-of-Work methods even when both use the same Prisma client and physical Postgres. Shared DTO, canonicalization and relay libraries are technical reuse only; no callback may write both domains and no shared mutable authority table, cross-domain repository, distributed lock or 2PC exists.
- **T1 PI admission:** one PI transaction freezes the immutable WorkOrder revision, applies the admission/current-revision sequence CAS and inserts one `WorkOrderRevisionAdmitted` outbox row. A synchronous HTTP handler may initiate T1 or expose readback, but cannot hold a transaction open into EF or write EF state.
- **T2 EF preparation:** one EF transaction records the exact PI event inbox outcome, materializes or exact-reuses the one VersionLock, one RunRecipe and two acceptance TaskSpecs, freezes the revision's sole Run/manifest and inserts `RunManifestFrozen`. Inbox receipt, all EF canonical writes and the EF outbox are one atomic outcome; receipt-first, materialization-first and outbox-after-commit variants are forbidden.
- **T3 PI head advance:** one PI transaction records the exact `RunManifestFrozen` inbox outcome, validates project/Cycle/branch/revision/hash/sequence/cell-plan/manifest scope, CAS-advances the head and inserts `BranchHeadAdvanced`. Same-sequence conflicting Run/manifest writes no head or success outbox.
- **T4 EF acknowledgement:** one EF transaction records the exact `BranchHeadAdvanced` inbox processed outcome and immutable scope/payload hash. A later reader accepts the receipt only when consumer, event type/version/producer, status/outcome/reason, branch/revision/sequence, Run/manifest and both payload/envelope hashes reconstruct exactly; a merely processed row with drifted columns is not acknowledgement. That inbox receipt is the durable acknowledgement and later dispatch prerequisite. There is no `HeadAcknowledged` integration event, acknowledgement aggregate, Run boolean or `dispatch_eligible` mirror.
- The minimum event chain is `WorkOrderRevisionAdmitted → RunManifestFrozen → BranchHeadAdvanced`. Each versioned envelope carries server-issued `event_id`, `event_type`, `schema_version`, `producer_domain`, `occurred_at`, correlation/causation ids, a business idempotency key, canonical payload hash and exact project/Cycle/branch/WorkOrder-revision/branch-sequence/cell-plan/approved-plan scope. Event-specific payloads add the admitted exact-cell authority, exact Run/manifest plus ordered TaskSpec-binding digest, or accepted head CAS version/sequence. Consumers cannot resolve `latest`, range/generator metadata or producer-owned mutable tables as authority.
- Inbox uniqueness covers consumer plus event id and business idempotency key; producer uniqueness covers the exact aggregate transition. Same key plus same canonical payload hash returns the stored outcome without duplicate domain/outbox writes. Same key plus a different payload hash is a terminal event conflict; a lower branch sequence is durably `ignored_stale` without head rollback or new outbox; same sequence plus a different Run/manifest is a terminal invariant conflict; a valid dependency not yet visible is retryable and commits no domain/outbox mutation.
- A failure before T1-T4 commit rolls back the local inbox/domain/outbox outcome together. A crash after commit and before publish is recovered from the outbox; a crash after publish and before a relay delivery marker causes safe duplicate delivery through inbox deduplication. Relay lease, attempt count and publish/delivery markers may use separate infrastructure transactions but are not consumer acknowledgement or domain truth.
- Existing governance in-memory/JSONL delivery storage, mutable singular WorkOrder/HarnessRun paths, live adapter sequencing and generic overwrite-capable EF records cannot satisfy D-20. Implementation may reuse repository-local Prisma transactions, unique-key-plus-hash conflict handling, CAS and real-Postgres rollback-test patterns only after new v2 domain-owned persistence ports exist.

### Additive v2 storage and explicit cutover — D-21 confirmed 2026-07-13

- D-21 rejects extending the current singular mutable ResearchWorkOrder/HarnessRun or generic `ExperimentFoundationRecord` as the D-19/D-20 authority. Those models cannot enforce immutable branch revision sequence/head CAS, one revision→1..N cells→one batch Run parity, typed readiness or atomic DB inbox/outbox. Adding optional columns or discriminator values would create two meanings inside one row/table and preserve legacy fallback pressure.
- PI owns an independent additive typed v2 table family for WorkOrder branch, immutable WorkOrder revision and exact-cell values, admission/current-revision/head authority, and PI integration inbox/outbox. EF owns an independent additive typed v2 table family for typed asset revision/readiness, VersionLock/RunRecipe/TrainingTaskSpec bindings, immutable Run/manifest/cells, and EF integration inbox/outbox. D-21 freezes object-family responsibility rather than final table names or field layout; the confirmed D-22 section freezes the minimal schema pack and invariant placement.
- Cross-domain persistence is limited to exact versioned external ids, canonical hashes, branch revision sequence and immutable event scope. PI and EF do not share a mutable association table, ORM relation, cascading foreign key or write repository. Sharing a Prisma schema/client and Postgres deployment does not change table ownership.
- Migration is expand-only. New migrations create v2 tables, indexes and constraints without altering, backfilling, annotating, hashing, relinking or copying legacy rows. Existing singular WorkOrder/HarnessRun/generic EF data remains byte-for-byte unchanged and readable only through existing-field diagnostics/admin queries; v2 product services, repositories, routes and selectors never union, dual-read, revalidate or upgrade legacy data.
- The dedicated v2 admission capability defaults off. Capability-off rejects new D-19 product admission with zero v2/legacy write and never calls a legacy writer. The flag controls new intake, not already committed work: once any D-20 outbox row exists, relay and consumers continue until the exact EF `BranchHeadAdvanced` inbox acknowledgement is committed, then the lineage remains immutable and auditable.
- Before D-19 acceptance, only the explicit approved acceptance scope may enable the v2 entrance. After D-19 acceptance, the product cutover switches new paper-bound experiment intake to v2 and closes every overlapping singular WorkOrder/HarnessRun/generic EF product writer in the same release. Active legacy work finishes before cutover or restarts from a new v2 project/Cycle/revision; no partial lineage reconstruction or in-place conversion exists.
- Rollback means stop new v2 intake, drain committed sagas and preserve v2 readback/events. Rollback never drops or rewrites v2 data, restores a legacy writer for the same logical object, or sends a failed/disabled v2 command through fallback. New requests fail closed until an approved v2 entrance is re-enabled.
- Offline shadow verification may compare aggregate legacy/v2 eligibility and unchanged-row digests, but cannot influence runtime routing, API return values, head/readiness/evidence decisions or authority. No compatibility view, alias or repository union becomes a product read path.

### Minimal first-migration schema pack — D-22 confirmed 2026-07-13

D-22 freezes logical object families and invariant placement for `Implementation Pack A — Phase 1 + D-19 minimal v2 spine`. D-22 does not freeze final Prisma names, columns or DDL and does not authorize schema editing or database apply.

| Owner | Logical family | Relational authority and constraints | Named typed canonical JSON + server hash |
|---|---|---|---|
| PI | WorkOrder branch | stable project/Cycle/branch identity; unique Cycle branch key; current revision sequence and head version/sequence use conditional CAS; EF head Run/manifest/event values are external exact refs, not FKs | branch semantic frame only |
| PI | immutable WorkOrder revision | unique branch + revision sequence; immutable revision/content/cell-plan/approved-plan hashes; parent/fork refs remain PI-owned | admitted WorkOrder and branch-frame snapshot |
| PI | ordered revision cells | unique revision + ordinal and revision + cell key; relational seed/repeat identity; N≥1 checked by admission; D-19 N=2 remains a fixture | exact params and required-result contract per cell |
| PI | WorkOrder admission | one immutable admission per revision/approved hash; T1 atomically updates branch current revision and inserts `WorkOrderRevisionAdmitted` outbox | no open-ended policy payload; only typed admission snapshot when needed |
| PI | integration inbox/outbox | separate tables; event id and business transition keys unique; structured type/version/producer/scope/hash/outcome; T3 inbox + head CAS + outbox atomic | typed event payload/envelope body only |
| EF | named asset draft/revision allowlist | one typed family per exact D-19 fixture dependency kind; draft expected-version/hash CAS; immutable logical/revision identity and content hash; no wildcard kind table | schema-versioned semantic content for that named asset kind |
| EF | asset lifecycle event/projection | append-only revision event sequence; one current projection with state-version CAS; immutable revision row carries no mutable status | small typed lifecycle detail only when required |
| EF | readiness attestation/dependencies | exact target revision/hash; immutable attestation uniqueness includes dependency-manifest/evaluator hashes; ordered dependency child rows have unique ordinal and exact typed ref/hash; never “latest passed by id” | typed qualification/blocker snapshot, never the dependency identity authority |
| EF | VersionLock | one exact materialization key; same key/hash exact-reuses and changed hash conflicts; same-domain concrete refs validated/FK-bound where possible | ordered locked dependency snapshot and version-lock hash |
| EF | RunRecipe | unique exact materialization key; same-domain VersionLock/readiness binding | resolved params/config/execution-profile snapshot and recipe hash |
| EF | TrainingTaskSpec | unique exact admitted revision + cell materialization key; same-domain RunRecipe binding; external PI revision/cell refs carry exact hashes without FK | command/args/input/output/resource/retry snapshot and TaskSpec hash |
| EF | immutable Run and ordered Run cells | one Run per external PI WorkOrder revision; unique Run + ordinal, cell key and external PI cell id; same-domain TaskSpec binding; no Attempt/provider/status fields | cell scientific tuple only; Run manifest hash is recomputed from ordered rows, with no second manifest payload |
| EF | integration inbox/outbox | separate tables with the PI event/idempotency rules; T2 inbox + materialization/Run + outbox atomic; T4 processed inbox receipt is the sole acknowledgement | typed event payload/envelope body only |

Relational columns must own identity, sequence, order, current/head CAS, cell/TaskSpec binding, exact event scope and idempotency. Canonical JSON is allowed only for the named frozen snapshots listed above, is validated by a versioned typed contract before persistence and is hashed by the server. Generic `record_kind/payload`, EAV, caller-authored hash, capability/eligibility table, acknowledgement aggregate/event, Run acknowledgement boolean and `dispatch_eligible` mirror are forbidden.

PI-domain and EF-domain concrete relations may use local FKs. Every cross-domain project/Cycle/branch/revision/cell/Run identity is stored as exact external id + hash + sequence/event and re-resolved by the receiving service; PI↔EF FK, ORM relation/cascade, shared join table and shared transaction remain zero.

The first migration explicitly excludes candidate/import/promotion and PaperProject bootstrap; ExecutionAttempt, provider request/ExternalTrainingJob and CollectionAttempt; ExperimentResult, validation/rule results, EvidenceCandidate and REU; Cycle closure/watermark/disposition and ResultInterpretationPacket; UI/read model/search/embedding/index; legacy bridge/backfill/mapping/union; and global product cutover. The existing Phase 1 draft/lifecycle/readiness exit claims remain in scope, so their minimal typed families cannot be silently removed without explicitly narrowing Phase 1.

The readiness closure in `07-implementation-readiness-review.md` fixes the named asset allowlist to Dataset, DataPolicy, MetricDefinition, Benchmark and EvaluationProtocol. Dataset uses two immutable revisions with typed checksum/split subcontracts and dataset-specific policy refs; MetricDefinition preserves seventeen source revisions; Benchmark resolves both Dataset revisions; EvaluationProtocol is a new typed v2 revision with eight active adapter-tier required rules. BaselineImplementationVersion, MethodRecipeComponent, DatasetMirror and provider/platform assets are excluded. The dedicated admission key is `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=false`. `07-implementation-readiness-review.md` is the SSOT for the exact Prisma family names, stable error reasons, A01-B10 checks and locked source/database population.

### Human-interaction layering and minimum-intervention rule — D-12 confirmed 2026-07-12
- T-124 currently defines four PI coordinator stop points: skeptic disposition other than `proceed`, strong-claim acceptance, dossier export and budget overrun.
- T-132 D-03a defines four experiment authority gates: WorkOrder admission, manual-promotion decision, external side effect/scope expansion and ValidationCycle closure.
- The sets are neither identical nor interchangeable. `AuthorityGate` is the owning domain's durable authorization record; `CoordinatorStop` is a derived automation pause with an owning gate/action ref and never becomes a second decision authority. T-124's four stops are coordinator-local, not a product-global cap.
- If a Stop is caused by an unresolved Gate, the owning screen presents one user action, writes or reuses only the necessary domain decision record(s), and resumes the coordinator automatically after successful admission. The UI may coalesce presentation, but records retain domain ownership and exact scope.
- Before WorkOrder admission, PI automatically compiles and previews the exact cell plan inside the draft. Admission approves that complete revision/`cell_plan_hash`/`approved_plan_hash` boundary once. EF exact-cell validation, TaskSpec materialization, the revision's single Run freeze, cell-scoped ExecutionAttempt retry, sync/collect/reconcile and other in-bound deterministic progression require no further confirmation.
- Manual promotion is invoked only when catalog admission is explicitly requested and does not block the normal PI experiment path. External-side-effect/scope authorization appears only for an actual provider write, data upload, budget/scope expansion or other exact external effect; zero-write simulation/read-only preflight and already-authorized safe retry do not trigger an AuthorityAction.
- ValidationCycle closure remains one batch action that freezes the D-18 admitted-branch/current-revision/effective-head scope and exact scientific state in the embedded snapshot/hash. Under D-17, the same action is the sole scientific-disposition writer and derives an exit only for a non-null disposition after accepting/correcting the proposal. Any Cycle-wide active real Attempt blocks closure; a no-real-execution scope permits only the D-14 `control_flow_validated_no_paper_evidence` closure with null disposition/selected exit. Deterministic trust/identity/protocol blockers return stable next actions and never become confirmation prompts.
- Product acceptance measures user-visible confirmation actions, not the number of internal records. Each golden scenario declares its theoretical minimum; a happy path must equal that minimum, and every additional action must resolve to a named Gate/Stop reason. No global DecisionWorkQueue/Policy Engine is introduced.

#### Measurable action target
User-visible commands are counted once in one of four mutually exclusive classes:

| Class | Meaning | First-release target |
|---|---|---:|
| InitiationAction | researcher deliberately selects the validation goal and starts the workflow before any domain gate | 1 |
| AuthorityAction | command resolves one durable domain AuthorityGate | 2: exact WorkOrder revision admission + ValidationCycle closure |
| RecoveryAction | researcher must correct a non-gate input or unblock a non-automatic failure | 0 |
| PlumbingAction | researcher copies/types internal ids, hashes or JSON, or manually moves state between PI and EF | 0 |

The fixed T-132 golden scenario is one bound ImplementationProject, one ValidationCycle, one WorkOrder branch, one exact admitted WorkOrder revision, one mode-neutral immutable batch Run, N >= 1 required cells and M >= 1 cell-scoped simulation ExecutionAttempts. The scenario has zero real provider writes/training, zero manual promotions and no claim/dossier stage. From validation-goal selection to a no-evidence Cycle closure, the required count is exactly `1 / 2 / 0 / 0`; N and M do not change the count. Before admission, the draft span automatically compiles and previews exact cells. After admission, the uninterrupted automatic span includes asset resolution, exact cell validation, RunRecipe/TaskSpec/cloud-payload materialization, Run-manifest freeze, offline validation, read-only preflight, same-payload simulated lifecycle, safe retry/reconcile and PI projection. At closure the Run/cells remain scientifically `not_started`; only the Attempts and rebuildable workflow projection are terminal.

For an arbitrary scenario, the theoretical minimum number of AuthorityActions is the sum of exact WorkOrder-revision admissions, ValidationCycle closures, policy-required strong-claim acceptances, dossier exports, real external-effect/scope-expansion authorizations and explicitly requested manual promotions. The sum is a scenario formula, not a global fixed number. The T-124 reference full-paper happy path fixes one Cycle, one admitted revision, one strong claim and one export, so the reference target is `1 / 4 / 0 / 0`; a future real-cloud variant adds the variant's named external-effect authorization, and manual promotion adds one only when catalog admission is explicitly requested.

Retryable provider faults, backend restart, duplicate submit, stale PI projection and semantic-index outage add zero user actions. A skeptic `revise` outcome may prepare the next draft/fork automatically; only the resulting exact-revision admission is counted, not a separate Stop acknowledgement. Budget/scope expansion resolves through one owning AuthorityAction and auto-resume. A deterministic identity/hash/protocol error blocks with a stable fix; when the input genuinely requires human correction, the correction is a RecoveryAction, never a disguised confirmation. Golden evidence maps existing UI commands to these classes and does not introduce a new decision-policy authority.

### Shared scope contract
- PI creates one versioned scope envelope containing ImplementationProject id, ValidationCycle id, WorkOrder branch/logical id, immutable branch revision sequence, exact WorkOrder revision id/hash, `cell_plan_hash`, `approved_plan_hash` and the exact admitted scientific cells. EF deterministically adds the unique Run id/manifest hash and, at the attempt boundary, exact TaskSpec ref/hash and ExecutionAttempt id.
- EF validates scope shape, project binding, exact revision/hash, one-Run uniqueness and one-to-one admitted-cell parity, persists the envelope on TaskSpec/Run/Attempt/result lineage and returns the same identities in events. `run_manifest_hash` covers the exact cells plus EF bindings but is not retroactively inserted into `approved_plan_hash`.
- Logical branch id is valid for browse/lineage only. Materialize, submit, retry, result publication and evidence admission require the exact revision/hash and applicable readiness/approval assertions.
- Shared schema/contract tests, not duplicated prose or model interpretation, keep PI and EF consistent.

### PI semantic source
- Existing ValidationCycle fields such as `validation_question`, `assumptions_under_test`, decision exits, `expected_information_gain` and `why_this_cycle_now` are PI-owned canonical planning input.
- The branch semantic frame adds only `branch_intent`, `expected_effect` and `difference_from_parent`; these are written during PI planning, may be model-drafted, and are frozen through admission. They are not post-hoc EF, model or human search summaries.
- EF contributes structured execution metadata such as dataset/code/protocol/config refs, TaskSpec identity, status and metric names/values; EF does not generate research interpretation for the index.

### Retrieval ownership and flow
- PI owns a project-scoped `ExperimentRetrievalProjection` because the retrieval question is part of PI workflow judgment. The projection consumes PI domain events plus EF outbox execution facts and is disposable/rebuildable.
- Shared/global infrastructure may provide an embedding gateway, vector query adapter and versioned index-document envelope. The infrastructure owns no research semantics, branch head, execution state or trust transition. Literature embedding tables, active-version rules and retrieval services remain Literature-domain assets and are not reused as the PI/EF index.
- First release emits two semantic document kinds: one per ValidationCycle and one per WorkOrder branch head. Each document binds source revision/hash, projection schema version, text hash and embedding profile. Historical v2 revisions/runs remain available through exact structured lineage queries rather than per-run semantic documents; D-08 legacy rows remain outside the projection.
- Query order is fixed: project/permission scope → structured Cycle/branch/status/time filters → semantic ranking within that set → exact PI/EF source revision/hash resolution. A stale candidate is discarded.
- Semantic search is discovery/ranking only and cannot choose a branch, advance branch head, authorize execution, issue readiness, qualify evidence or close a ValidationCycle.
- Index staleness or outage degrades to structured lineage queries. The control and trust paths never depend on vector availability.

## Human gate model — D-03a confirmed 2026-07-11
T-132 uses one approved WorkOrder plus four fixed human gates. T-132 does not introduce a `DecisionAuthorityManifest`, per-field authority DSL, generic Policy Engine or general DecisionWorkItem engine.

### Approved WorkOrder boundary
- The WorkOrder directly contains the experiment goal, branch semantic frame (`branch_intent`, `expected_effect`, `difference_from_parent`), selected/allowed assets and protocol, primary metrics, canonical exact cell plan/hash, execution profile, budget and retry limit. The draft may retain ranges/grid/seed-count as explicitly non-authoritative provenance; retention/hash treatment is finalized in Phase 0.
- WorkOrder admission records one `approved_plan_hash` over those immutable fields. Only the exact cell plan authorizes scientific cells; authoring constraints remain traceable but cannot authorize an unlisted cell.
- Recipe/TaskSpec generation and provider-control simulation proceed automatically while generated artifacts preserve one-to-one exact-cell parity and conform to the approved WorkOrder boundary. Real cloud submit remains a separately authorized gate; LocalScript/fake simulation cannot enter scientific validation/evidence.
- A change to a core WorkOrder field creates a new WorkOrder revision and requires admission again.

### Four fixed human gates
1. WorkOrder admission: approve the complete experiment boundary once.
2. Manual-promotion decision: a human may admit an eligible Candidate to the canonical catalog; the action cannot waive blockers, grant readiness or increase evidence trust.
3. External side effect or scope expansion: required for cloud writes/data upload/budget expansion/out-of-range execution. First-release `CreateJob` remains forbidden rather than approvable.
4. ValidationCycle closure: present the D-18 current-effective branch/revision/head/cell/Attempt/evidence scope, freeze one CAS-fenced accounting snapshot and, when eligible evidence exists, accept/correct one Cycle-level scientific disposition with a server-derived exit. Non-head history remains query-only unless explicitly referenced as comparison context; successor-Cycle drafts are downstream of closure. The D-14 no-evidence case has null disposition/selected exit, and any active real-provider Attempt anywhere in the Cycle blocks closure.

### Direct blockers, not approval prompts
- Invalid identity/hash/ref, missing mandatory dependency, project/authorization mismatch, corrupted provenance, license/security violation and unsupported protocol rules block with stable error codes.
- A direct blocker can be resolved only by changing inputs/WorkOrder or adding supported capability; a human click cannot waive the blocker.
- The standalone “Attach to WorkOrder” command and explicit revoke/supersede commands are themselves deliberate user actions and do not trigger a second confirmation layer.
- Models may recommend plans or dispositions, but models cannot decide whether a fixed gate exists, omit in-scope Runs from ValidationCycle closure or translate simulation status into scientific status.

## Ownership matrix
| Concern | Canonical owner | Consumers | Forbidden shortcut |
|---|---|---|---|
| literature source/key content | Literature | EF candidate ingestion | EF copying/rewriting literature authority |
| reusable assets/protocols | ExperimentFoundation | Recipe generation, PaperImplementation trace | PI-owned canonical asset copy |
| Recipe/TaskSpec/materialization | ExperimentFoundation | execution, PI WorkOrder display | user-authored trusted hash/ref payload |
| run/attempt/result/validation/EvidenceCandidate | ExperimentFoundation | PaperImplementation | PI monitor intake self-declaring trusted result or changing EF run state directly |
| PaperProject/ValidationCycle/ResearchWorkOrder and evidence-use intent | PaperImplementation | EF broker/execution view | EF changing PI workflow authority or claim-use decision |
| WorkOrder exact scientific cell plan/`cell_plan_hash` | PaperImplementation | EF preparation/Run manifest | EF/model/provider selecting, defaulting scientific fields, adding, dropping or substituting cells after admission |
| WorkOrder branch/revision identity, semantic frame and explicit branch head | PaperImplementation | EF exact-scope binding, desktop/search projection | EF or semantic search choosing a branch/revision/head |
| WorkOrder lifecycle projection | PI projection of EF facts | researcher workflow | PI/EF dual-writing one shared status record |
| project-scoped experiment retrieval projection | PaperImplementation | PI workflow/desktop | global index or EF becoming a third research truth |
| embedding/vector/index mechanics | shared infrastructure | PI retrieval projection and future domains | reusing Literature domain tables/rules as a global authority |
| RunEvidenceUnit | PaperImplementation projection of an eligible EF EvidenceCandidate through the sole Gateway | claim/dossier/writing | failed/cancelled/incomplete execution REU, a second writer or attachment without EF revalidation |
| ValidationCycle closure execution snapshot/hash | PaperImplementation embedded immutable closure value over exact EF Run/Attempt facts | dossier accounting, Sidecar display | project-wide REU scan, independently mutable Sidecar ledger or a second closure authority |
| Result Analysis proposal | PaperImplementation runtime support artifact bound to exact Cycle/snapshot/evidence hashes | existing ValidationCycle closure action | model/Domain Gate directly writing Cycle assessment, selected exit or accepted ResultInterpretationPacket |
| ValidationCycle scientific disposition and selected exit | PaperImplementation embedded immutable Cycle closure assessment; ClosureService/StateWriter is the sole writer | ResultInterpretationPacket, next-step drafts, claim/dossier, motive/retrieval projection | EF validation status, REU run status, client payload, open proposal or standalone conclusion aggregate |
| ResultInterpretationPacket | PaperImplementation post-closure explanation bound to exact Cycle/assessment/snapshot/proposal hashes | claim boundary, dossier/writing and feedback | packet rewriting disposition/exit, packet-before-closure authority or mixed failed/inconclusive run lists as a second conclusion source |
| claim/dossier decision | PaperImplementation | writing/export | EF generating or approving claims |

## Trust invariants

### I-01 Canonical content identity
- Content hash MUST be computed by the server from canonical serialized content with domain separation: record kind, schema version and hash profile.
- Caller-supplied hashes are assertions to compare, not authority.
- Canonical content contains semantic payload only; timestamps, mutable lifecycle status, audit metadata and read-model/projection fields do not affect `content_hash`.
- Changing the hash algorithm creates a new hash profile; old identities are not silently rewritten.

### I-02 Logical identity and immutable revisions
- Confirmed by D-02: `logical_id` groups one concept's lineage; server-issued `revision_id + content_hash` identifies one immutable semantic revision.
- Frozen records are append-only.
- Mutable drafts use expected-hash/CAS, cannot receive readiness and cannot enter execution.
- Freezing the same logical id with the same canonical content is idempotent and returns the existing revision.
- A semantic change always creates a new revision; same content under different logical identities does not merge ownership/lineage.
- Execution references include record kind, revision id and content hash; logical id alone is never execution authority.
- Evolving operational entities record append-only lifecycle events and expose an explicit current-state projection instead of rewriting frozen semantic content.

### I-03 Version-bound readiness
- Readiness is an immutable attestation over the target kind/revision/content hash and a deterministically ordered complete dependency revision/hash manifest.
- Dependency verification includes kind, id/revision, content hash, lifecycle/approval status and required project/ownership scope.
- The attestation records evaluator/hash-profile versions and required approval/qualification snapshots.
- Submit revalidates the attestation, dependency identities and current revocation state; “latest passed by target ID” is insufficient.

### I-04 Scientific decision before evidence
- Structural validity, execution success and scientific acceptability are different states.
- Unsupported typed protocol rules return `UNSUPPORTED_RULE` during readiness before Run freeze/dispatch and final validation; no free-text interpretation, best-effort or waiver path exists.
- EvidenceCandidate can be minted only from a complete result with `validation_status=passed`.
- Failed, cancelled or incomplete runs retain diagnostic outputs under ExecutionAttempt but cannot enter the evidence chain.
- Results later classified by PI as positive, negative or inconclusive are not partial, remain evidence-eligible and share the same completed execution state. EF protocol `passed` does not select that contextual scientific disposition.

### I-05 Manual promotion without partial acceptance
- The first release has no `accepted_partial`, `PartialAcceptanceDecision` or partial-evidence grade.
- `accept_partial=true` is rejected; a human action cannot upgrade incomplete output.
- `manual_promote` is catalog admission only, not an exception or trust decision.
- Deterministic trust, authorization, provenance, license, security and asset-integrity blockers remain non-waivable and reject promotion directly.
- Catalog admission can precede executable readiness when only execution-environment dependencies remain unresolved; the promoted asset stays non-executable until a separate readiness attestation passes.
- Promotion does not create or upgrade EvidenceCandidate/RunEvidence.
- The minimal decision records candidate kind/revision/hash, `promote | reject`, actor, rationale and decision time, plus resulting canonical revision/hash for `promote`; the record has no waiver, scope or expiry fields.
- Manual and future automatic curation reuse the same canonicalization service and transaction boundary.
- The command accepts the exact Candidate kind/revision/hash, actor, rationale and idempotency key; caller-authored canonical refs or canonical payloads are rejected.
- `promote` rechecks Candidate identity and eligibility, then atomically creates or reuses an exact canonical revision, records `created | reused`, writes the decision, terminates the Candidate revision and inserts an outbox event.
- `reject` atomically writes the decision and terminates the Candidate revision but creates no canonical revision.
- One Candidate revision has one terminal decision. Reconsideration after rejection or semantic change requires a new Candidate revision.
- The same idempotency key with identical input returns the same result; reuse with different input fails as a conflict.
- Readiness attestation, EvidenceCandidate/RunEvidence qualification and external side effects are explicitly outside the promotion transaction.

### I-06 Durable external side effects
- Persist an ExecutionAttempt and idempotency key before invoking an adapter.
- Execution semantics are at-least-once invocation plus idempotent reconciliation.
- Collection is replayable: provisional records use stable identities and become trusted only after complete validation/publish.

### I-07 Single trusted evidence ingress
- EF owns scientific qualification and mints EvidenceCandidate only for a complete result with passed validation.
- PI owns one Evidence Trust Gateway, and only the gateway may write RunEvidenceUnit.
- Live, monitor, recovery and standalone-run attachment flows call the same admission command; their source kind is audit metadata, not a policy branch.
- Gateway input contains PI project, exact WorkOrder revision/hash, exact EF run/result/EvidenceCandidate revision/hash, source event and idempotency key only.
- Caller-declared run/validation status, result hashes, EvidenceCandidate collections and `trusted` flags are forbidden.
- The gateway resolves EF TaskSpec→run→result→validation→EvidenceCandidate lineage through an EF read port, then verifies PI project/WorkOrder/`approved_plan_hash` binding and revoke/supersede state.
- Only a complete protocol-compliant validation-passed EvidenceCandidate produces a RunEvidenceUnit. Results later classified positive, negative or inconclusive use the same Gateway; REU carries no contextual disposition and scientific disposition never overloads execution status.
- Failed, cancelled and incomplete execution produces no RunEvidenceUnit. Exact Run/Attempt refs, execution state and eligibility codes enter the existing ValidationCycle closure record's embedded immutable snapshot/hash; Sidecar only rebuilds/displays the frozen authority.
- Dossier declares and resolves exact closed-Cycle snapshot refs/hashes, then consumes only the eligible REU refs contained in that scope. Open/tampered/incomplete/wrong-project snapshots, project-wide failed-like REU scans and Sidecar fallback fail closed.
- Gateway admission atomically writes PI RunEvidenceUnit, TraceManifest and outbox. PaperExperimentSidecar is rebuilt from authoritative events/facts and cannot mint or upgrade trust.
- EF revocation/supersession appends a PI invalidation fact and rebuilds projections; historical RunEvidenceUnit is not deleted.
- LocalScript and fake-provider provenance is categorically ineligible for the PI Evidence Trust Gateway and cannot be upgraded by a human action.
- D-16 introduces no FailureEvidenceUnit, second gateway, standalone accounting aggregate or additional human action. The existing Cycle-closure AuthorityAction freezes the embedded snapshot once; dossier export remains its existing action.

### I-08 PaperProject-bound PI bootstrap
- The intended product sequence is PaperProjectBridge → PaperProjectIntake/PaperProject binding → PI bootstrap; PI bootstrap is not an alternate PaperProject creation path.
- Bootstrap requires the bridge handoff to contain matching non-null `paper_project_intake_ref` and `target_paper_project_ref` after completed PaperProjectIntake.
- An unbound bridge returns a deterministic blocker with PaperProjectIntake as the next action and creates no ImplementationProject or immutable intake snapshot.
- Repeating bootstrap after a valid binding returns the same ImplementationProject idempotently.
- No general late-binding event, reconciler or mutable intake-snapshot repair path is introduced.
- Existing null-bound PI records are excluded from new trusted work and handled by the D-08 read-only legacy boundary.
- Primary UI enters PI from the bound PaperProject; raw bridge ID/hash bootstrap is diagnostics-only during compatibility cutover.

### I-09 Server-enforced project scope
- Reusable assets may be global.
- WorkOrders, Runs, Result attachments and evidence consumption are project scoped.
- The server query/read model enforces scope; client filtering is not an authority boundary.

### I-10 Product workflow hides infrastructure identity
- Primary product actions are typed business commands.
- Internal IDs/hashes are server-derived and displayed for trace inspection, not requested as normal input.
- Raw JSON is restricted to an advanced diagnostics/admin capability.

### I-11 No cross-domain dual-write
- PI commands carry paper/workflow intent; EF events/envelopes carry authoritative experiment facts.
- PI WorkOrder status is updated through an idempotent projection with the source EF attempt/event identity.
- Neither domain edits the other's canonical records through a shared repository or generic JSON route.
- Reconciliation compares correlation/lineage and replays source events; reconciliation does not guess state from UI payloads.

### I-12 Retrieval is derived, not authority
- Structured project/lineage queries are the correctness baseline and remain available without embeddings.
- Every semantic document is deterministically composed from canonical PI planning fields and structured EF facts, versioned by source hashes and rebuildable from events.
- Search results are candidates only and must re-resolve exact owner records. No search score or cluster assignment may enter execution/readiness/evidence state transitions.
- Permission/project filtering occurs before semantic ranking; client-side filtering and post-query redaction are insufficient authority boundaries.

### I-13 Exact scientific cells are admitted before materialization
- Ranges, grids, seed counts and generator metadata are draft authoring inputs/provenance only. The immutable WorkOrder revision embeds the canonical exact 1..N cells and `cell_plan_hash` before admission.
- `approved_plan_hash` covers both the exact cell-plan hash and the immutable authoring/budget/retry boundary. Only listed exact cells have execution authority.
- EF materialization adds TaskSpec/provider/result bindings without changing scientific cell identity. Extra/missing/drifted cells fail before Run/head/Attempt, and TaskSpec materialization failure never authorizes cell replacement.
- No generator registry/DSL, standalone CellPlan aggregate, post-admission sampling/default seed, optional cell, adaptive HPO or per-cell human gate is introduced in the first release.

### I-14 One scientific-conclusion authority
- PI derives interpretation readiness from one exact closure-input snapshot/hash; a single Run/job terminal event cannot independently trigger or assign a Cycle conclusion.
- Result Analysis produces a support proposal only. Model/runtime/Domain Gate/client/REU/EF cannot write authoritative disposition or selected exit.
- The existing ValidationCycle closure action and ClosureService/StateWriter are the sole authority. Closure kind, nullable `positive | negative | inconclusive`, exact accounting snapshot/hash and accepted interpretation ref/hash are frozen together.
- `null` disposition means no scientific conclusion and is distinct from `inconclusive`. Failed/cancelled/incomplete execution and control-only simulation never become scientific negative/inconclusive.
- Selected exit is derived from the admission-frozen disposition-to-exit mapping. Caller-authored exit text and post-closure mapping drift fail closed.
- ResultInterpretationPacket/Claim/Dossier/next-step/motive/retrieval consumers require the exact closed Cycle; open proposal and project-wide REU scans carry no conclusion authority.

## Proposed components and contracts
The names below describe boundaries, not final filenames. Phase 0 may refine them without changing ownership.

### CanonicalIdentityService
- canonicalize and hash a record revision;
- create immutable revision or CAS-update an approved draft;
- verify logical/revision/hash assertions;
- mechanically reject rows without supported v2 identity/schema as `LEGACY_RECORD_NOT_ELIGIBLE`; do not annotate, summarize, rehash or migrate those rows.

### ReadinessAttestationService
- resolve the full dependency graph;
- emit immutable readiness attestation with dependency manifest;
- revalidate at submit/materialize boundaries;
- explain blockers with stable machine codes.

### ExperimentPreparationService
- ingest provenance-preserving candidates;
- promote a candidate and create the canonical revision atomically/idempotently;
- accept the exact admitted cells/hash from the PI broker and reject range-only/generator-only paper-bound input;
- generate VersionLock/RunRecipe without choosing or changing scientific cells;
- materialize TrainingTaskSpec with server-owned hashes and adapter input for each exact cell;
- compare the frozen Run cells one-to-one with admitted scientific fields before publishing `RunManifestFrozen`.

### ScientificValidationService
- resolve one canonical ordered typed EvaluationProtocol v2 required-rule set plus exact validator-profile version/hash;
- enforce the non-configurable real-provider/exact-scope/all-required-cell/result-lineage envelope before protocol rules;
- support only `metric_contract@v1` and `artifact_contract@v1` in the later first scientific-validation capability slice and return stable `UNSUPPORTED_RULE` for every declared unsupported rule before Run freeze/dispatch;
- validate one exact batch Run and hash the ordered cell/results, protocol/validator identities and ordered `passed | failed | unsupported` rule outcomes;
- retain incomplete outputs as diagnostics without an evidence-upgrade path and never interpret EF `passed` as a PI scientific disposition;
- be the sole validation-report/EvidenceCandidate writer and atomically/idempotently persist passed report/Candidate/outbox;
- derive required-cell/Run scientific completeness only from eligible real-provider complete ExperimentResults;
- reject LocalScript/fake-provider provenance and every `workflow_simulation_*` outcome before scientific result/validation/evidence writes; simulation terminality never upgrades trust or becomes a negative scientific result.
- Implemented C-EF step 4 boundary (2026-07-19): the service exposes only `recordExperimentResult` and `validateScientificBatch`; a typed repository port has independent in-memory and Prisma adapters. The Prisma adapter owns typed EvaluationProtocol JSON parsing and uses one `$transaction` for report/Candidate/outbox. Empty `required_rules` maps to `VALIDATION_SUBJECT_INCOMPLETE`; an absent durable head acknowledgement maps to `VALIDATION_SCOPE_DRIFT` and blocks every report write, including report-only outcomes, so later replay cannot depend on missing PI scope authority.

### ProviderExecutionCoordinator and LifecycleSimulator
- require an exact durable PI `BranchHeadAdvanced` acknowledgement before creating the first cell ExecutionAttempt; then persist each ExecutionAttempt and adapter idempotency key before dispatch;
- reconcile submitted/running/terminal/stuck attempts;
- materialize one exact cloud-provider payload and reuse its hash for preflight and simulation;
- keep LocalScript/fake-provider identities non-production and prevent them from publishing ExperimentResult/validation/evidence;
- persist/replay simulated CollectionAttempt/lifecycle events for recovery tests without trusted scientific refs;
- preserve Attempt-level provenance and rebuild `workflow_simulation_status` without creating a SimulationRun or mutating scientific Run/cell completeness;
- defer real provider output parsing and trusted publication to the separately authorized real-execution gate.

### ResearchWorkOrderBroker and EvidenceTrustGateway
- consume only admitted PI experiment-planning artifacts;
- require a PaperProject-bound ImplementationProject before WorkOrder admission or EF paper-bound commands;
- correlate PI project/ValidationCycle/WorkOrder branch/revision sequence/exact revision/hash/Run manifest/cell with EF Recipe/TaskSpec/ExecutionAttempt through the shared scope envelope;
- idempotently consume `RunManifestFrozen`, apply PI-owned sequence-fenced head CAS and publish/replay the exact `BranchHeadAdvanced` acknowledgement without any cross-domain authority transaction;
- translate PI control intent into EF commands without transferring EF state ownership;
- project EF lifecycle/blockers back to the owning WorkOrder idempotently while preserving Attempt provenance and keeping simulation terminality separate from scientific Run state;
- accept identity refs only and validate project/WorkOrder/approved-plan scope plus all EF identities through the EF read port;
- invoke EF execution without copying canonical DTOs;
- make the PI-owned gateway the sole RunEvidenceUnit writer and atomically persist RunEvidenceUnit/TraceManifest/outbox only for complete passed EvidenceCandidate;
- keep RunEvidenceUnit limited to trusted evidence identity/lineage; do not store contextual positive/negative/inconclusive disposition or infer disposition from EF protocol status;
- atomically freeze the existing Cycle closure record's embedded execution-accounting snapshot/hash from exact Run/Attempt facts and eligible REU refs; failed/cancelled/incomplete execution creates no RunEvidenceUnit;
- make dossier readiness consume only declared closed-Cycle snapshot refs/hashes and reject project-wide REU scans, Sidecar authority and cross-project/hash drift;
- retain Sidecar as a rebuildable display projection; a no-evidence Cycle closure records exact refs/disposition without rewriting EF scientific state or adding an action.

### ValidationCycleInterpretationAndClosureService
- idempotently derive Cycle-ready state only from one CAS-fenced D-18 admitted-branch/current-revision/effective-head/cell/Attempt scope, explicit comparison context, eligible REU refs and canonical closure-input hash;
- keep a no-head branch in the candidate with `effective_head_run_ref=null`, return `BRANCH_HEAD_NOT_FROZEN` and block closure; also block while head convergence is pending or any real-provider Attempt anywhere in the Cycle remains active; skip Result Analysis when complete effective-head scope has no eligible evidence or is control-flow-only;
- invoke Result Analysis with the frozen Cycle frame and exact snapshot/evidence refs/hashes and accept only one proposal whose identity matches that input;
- treat scenario/counterfactual outputs as support artifacts, never as multiple authoritative conclusions or a packet-writer payload;
- through the existing Cycle-closure AuthorityAction, validate accepted/corrected proposal plus expected Cycle/branch/revision/head watermark and atomically freeze closure kind, nullable scientific disposition and D-18 snapshot/hash;
- derive the selected exit only for non-null positive/negative/inconclusive disposition; write null exit for no-evidence/control-only closure and reject caller-authored assessment/exit or stale proposal/snapshot/watermark hashes;
- emit one closed-Cycle event for downstream packet/claim/dossier/next-step/motive/retrieval materialization without writing EF state or adding another action.

### ResultInterpretationMaterializer
- consume only an exact closed ValidationCycle plus its authoritative assessment/snapshot/hash and accepted proposal ref/hash;
- create an immutable ResultInterpretationPacket that explains evidence roles, limitations, uncertainties, forbidden overclaims and claim ceiling without owning disposition/selected exit;
- preserve Packet → closed Cycle direction and keep later packet projection outside the immutable Cycle closure hash;
- close direct/bare packet creation and reject open Cycle, proposal-only, mixed run-status or wrong-scope inputs.

### ProjectScopedExperimentReadModel
- query assets separately from project-scoped work/run/evidence lineage;
- expose explicit ValidationCycle, WorkOrder branch, admitted revision and event-derived branch-head Run relationships;
- expose scientific execution/completeness separately from `workflow_simulation_status`; the latter is rebuildable from terminal simulation Attempt events and never masquerades as Run status;
- expose EF execution state, EF protocol `passed | failed | unsupported`, PI proposal state and authoritative closed-Cycle `positive | negative | inconclusive | null` separately, and expose closed-Cycle accounting only through exact snapshot ref/hash readback;
- provide blocker, approval, recovery and deep-link state to desktop;
- prevent multi-project timeline leakage in the service/repository layer;
- maintain a PI-owned rebuildable retrieval projection with ValidationCycle and branch-head semantic documents;
- apply permission/scope and structural filters before optional semantic ranking, then re-resolve exact PI/EF source revisions/hashes;
- fall back to structured lineage when embeddings are absent, stale or unavailable.

## State and persistence hypotheses
Final schema requires `sync-db-schema-from-code` and explicit DB apply approval. The following list is the **future full-product hypothesis**, not the D-22 first-migration census. Only the logical families in `Minimal first-migration schema pack — D-22` may enter Implementation Pack A; the listed Attempt, collection, retrieval and closure concepts remain later packs.

- immutable record revision identity:
  - logical id, server-issued revision id, kind, schema version, hash profile, canonical semantic content hash;
- readiness attestation:
  - target kind/revision/hash, deterministically ordered dependency manifest/hash, status, blockers, evaluator/hash-profile version and qualification snapshots;
- manual-promotion decision:
  - candidate kind/revision/hash, `promote | reject`, actor, rationale and audit time, plus resulting canonical revision/hash when promoted;
- ExecutionAttempt:
  - attempt id, TaskSpec revision/hash, explicit production/simulation provenance, adapter/provider idempotency key, lifecycle state, lease/heartbeat and external job ref;
- PI WorkOrder iteration scope:
  - ValidationCycle id, stable branch/logical id, immutable branch revision sequence, WorkOrder revision/hash, embedded ordered exact cells, `cell_plan_hash`, `approved_plan_hash`, optional non-authoritative authoring provenance, parent/fork refs, current admitted revision, explicit branch-head Run/sequence projection and PI semantic frame;
- cross-domain head saga:
  - EF `RunManifestFrozen` outbox/inbox receipt, PI head CAS version, PI `BranchHeadAdvanced` outbox/inbox receipt and exact acknowledgement scope; no shared table, distributed lock or 2PC state;
- experiment retrieval projection:
  - project/source kind/source revision/hash, Cycle/branch/head-Run scope, projection schema, deterministic text hash, embedding profile/version and rebuild checkpoint; no trust or workflow authority;
- CollectionAttempt:
  - attempt id, stable output identities, provisional/published state, replay/error data;
- projection checkpoints/outbox:
  - durable PI→EF command delivery, EF→PI lifecycle/evidence delivery and Sidecar rebuild progress.
- ValidationCycle closure record with embedded immutable accounting snapshot/hash:
  - expected Cycle version, canonical `closure_watermark`, ordered admitted branch set and, per branch, current admitted revision id/hash/sequence plus non-null matching effective head Run/manifest and complete ordered cells/all Attempts; execution states, eligibility codes, eligible REU refs, closure kind, nullable authoritative disposition/selected exit, accepted proposal ref/hash and canonical snapshot hash. Null head exists only in the rejected closure candidate with `BRANCH_HEAD_NOT_FROZEN`. Explicit comparison refs are contextual lineage, not accounting members; Packet is post-closure/excluded. The D-14 case records no-evidence closure with null disposition/selected exit and `evidence_eligibility=false`.

### Identity usage table
| Operation | Allowed identity | Rule |
|---|---|---|
| browse/structured lineage | project + Cycle + branch logical id | may resolve explicit head or list revisions/runs, but grants no execution authority |
| semantic discovery | project/permission + structural filters + query | ranks ValidationCycle/branch-head candidates, then must re-resolve exact source revision/hash |
| update draft | draft id + expected hash/version | CAS required; conflict creates no write |
| freeze/publish | logical id + canonical semantic payload | idempotently returns existing matching revision or creates a new immutable revision |
| readiness | target revision/hash + full dependency revision/hash manifest | emits a new immutable attestation |
| materialize/submit/replay | kind + revision id + content hash + valid readiness attestation | logical id or “latest” is rejected |
| compare historical v2 result | current admitted revision + exact comparison result/ref/hash | server re-resolves trusted v2 lineage; comparison never changes head or execution-accounting membership |
| close Cycle | expected Cycle version + canonical closure watermark/hash | CAS freezes current-effective scope; drift returns `CYCLE_CLOSURE_SCOPE_DRIFT` with zero partial write |
| mutate a closed Cycle | exact closed Cycle ref/hash | admission, revision/branch, Run/head, Attempt/retry, attachment and dispatch are rejected; follow-up uses a successor Cycle |
| status display | entity id + event-derived projection version | projection is mutable/rebuildable; source events remain append-only |

### Migration strategy
1. Expand schema and deploy readers.
2. Leave every existing non-v2 row unchanged; determine legacy eligibility mechanically from supported v2 identity/schema requirements without persisted annotations.
3. Restrict legacy access to existing-field diagnostics/admin reads and return `LEGACY_RECORD_NOT_ELIGIBLE` from selection, mutation, promotion, attach, execution, evidence and PI paths.
4. Shadow-compare only offline aggregate eligibility and unchanged-row digests; the comparison is not a product dual-read and cannot affect routing, returned values or authority.
5. Deploy additive v2 tables/constraints first, then enable the dedicated default-off D-19 admission capability only for approved acceptance scope. Capability-off rejects new commands without legacy fallback; committed sagas continue draining.
6. After D-19 acceptance, atomically switch new paper-bound product intake to the explicit v2 entrance and close overlapping singular WorkOrder/HarnessRun/generic EF product writers in the same release. Preserve unchanged legacy rows and diagnostics/admin reads only.
7. Rollback stops new v2 intake and drains committed events while preserving v2 readback; the rollback path never restores an overlapping legacy writer, converts v2 rows or deletes immutable events. Keep retention/deletion policy, historical UI, summaries, comparability and PI legacy consumption outside T-132.
8. Inventory the pre-D-16 mixed `PaperImplementationRunStatus`, every failed/cancelled REU writer, `assertProjectRunEvidenceAccounting`, project-wide REU reader and historical row before changing contracts.
9. In one release, stop new failed/cancelled/incomplete REU creation, build D-18 current-effective closure snapshots only for v2 Cycles with complete scope authority, switch dossier to explicit snapshot refs/hashes and remove the old reader/writer acceptance tests. Do not infer historical membership, ship dual-read, compatibility alias or Sidecar fallback.
10. Preserve pre-D-16 rows as read-only audit history pending the approved migration plan; rows that cannot resolve a complete validation-passed EvidenceCandidate cannot satisfy canonical v2 repository/API, claim support or dossier readiness.
11. Inventory and replace the D-17 opaque EvaluationProtocol blocks, heuristic per-job validator, generic validation/EvidenceCandidate writers, caller-authored Cycle assessment/exit, mixed REU disposition statuses, direct result-analysis packet materializer and every consumer that accepts an open proposal or non-closed Cycle.
12. Cut D-16/D-17/D-18 semantics together at the shared seam: one batch validator writer, one Gateway/REU path, one CAS-fenced current-effective closure authority and one post-closure packet path. Do not ship historical-scan membership, compatibility aliases, caller-selected exits, packet-before-closure dual reads or a second conclusion object.

## API direction
Typed business commands should replace generic record construction on the product path:
- candidate import and triage;
- promote candidate to canonical revision;
- generate VersionLock/RunRecipe;
- materialize TrainingTaskSpec;
- compile/preview PI WorkOrder draft constraints into an exact cell plan before admission; the final command shape belongs to PI, not EF;
- validate/materialize an admitted exact cell plan into EF Recipe/TaskSpec/Run bindings without post-admission scientific selection;
- submit/sync/cancel/reconcile/collect an execution attempt;
- evaluate an exact complete batch Run with typed required rules; reject unsupported-rule, generic-writer and partial-acceptance requests;
- derive Cycle interpretation readiness from the D-18 current-effective watermark, admit one Result Analysis proposal and close through the existing proposal/snapshot action with a non-null-disposition-derived exit or null no-evidence exit;
- materialize ResultInterpretationPacket only from an exact closed Cycle and accepted proposal;
- create/rebuild WorkOrder/RunEvidence/Sidecar projections and replay the sequence-fenced head saga;
- close a PI ValidationCycle by atomically freezing the embedded execution-accounting snapshot/hash from exact Run/Attempt facts and eligible REU refs without changing EF scientific state;
- prepare dossier scope from explicit closed-Cycle snapshot refs/hashes, with no project-wide failed-like REU scan or Sidecar fallback;
- list/resolve Cycle→branch→revision sequence→Run manifest→required cell/TaskSpec→Attempt lineage and explicit branch heads.
- search PI experiment workflow through structured-first, optional semantic ranking with exact-source re-resolution and structured-only fallback.
- attach a standalone exploratory run to a PI WorkOrder and revalidate the complete trust chain.

Legacy/generic endpoints may remain only for existing-field diagnostics/admin reads. Every create/update/promote/attach/execute/evidence/product command is closed; legacy endpoints cannot route to v2, and v2 commands cannot fall back to a generic or singular legacy writer.

OpenAPI, API index and context registry are part of each API slice's Definition of Done, not a final documentation cleanup.

## Cloud control-plane validation boundary — revised and confirmed 2026-07-12
The first release validates the Aliyun control-plane path without executing a cloud training job. Current official PAI-DLC documentation defines `CreateJob` as creating and running a job and does not document a `DryRun` parameter; therefore T-132 MUST NOT call `CreateJob` during preflight.

Official references:
- `CreateJob`: <https://help.aliyun.com/zh/pai/developer-reference/api-pai-dlc-2020-12-03-createjob>
- `ListWorkspaces`: <https://help.aliyun.com/zh/pai/developer-reference/api-aiworkspace-2021-02-04-listworkspaces>

### Layer A — Offline cloud materialization
- Produce the exact provider request that a future real adapter would send.
- Validate required fields, enums, refs, resource shapes and the documented 65,536-byte request limit.
- Canonical-hash the full payload; persist only a redacted payload manifest plus hash.
- Fail before any network call when provider materialization is incomplete or policy-invalid.

### Layer B — Real read-only cloud preflight
- Use a dedicated least-privilege RAM identity that has only approved List/Get operations and explicitly lacks `paidlc:CreateJob`.
- Verify request signing/endpoint, region, target workspace existence/status and visible DLC resource limits/required refs through read-only APIs.
- Enforce a code-level provider-operation allowlist; create/update/delete operations are rejected before transport.
- Record operation names, request IDs, redacted resource identities and outcomes; never record credentials or raw provider payloads.

### Layer C — Same-payload fake lifecycle
- Feed the exact Layer A payload/hash into the fake Aliyun transport.
- Exercise submit, sync, cancel, collect, reconcile, idempotency conflict and recovery paths.
- Prove payload identity across materialization and fake execution; a separately constructed fake-only payload is not acceptable.
- Mark the adapter/attempt as non-production and reject the adapter/attempt before ExperimentResult, ResultValidationReport, EvidenceCandidate or RunEvidenceUnit creation.

### Result vocabulary
- Allowed non-scientific successes: `workflow_simulation_passed` and `cloud_preflight_passed`.
- Allowed PI closure kind after a passing control-only scenario: `control_flow_validated_no_paper_evidence`, always paired with `scientific_disposition=null`, `scientific_execution_status=not_started` and `evidence_eligibility=false`.
- Forbidden claims without real `CreateJob` and runtime evidence: `cloud_training_passed`, `true_external_canary_passed`, “云训练已验证”.
- Preflight MUST list unverified behaviors: scheduler acceptance/stock, image pull, data/code mount, network, GPU health, user command, cloud logs/results, real cancellation and cleanup.

## Local execution boundary — D-07 confirmed 2026-07-12
- Formal research execution is cloud-only; the desktop/backend is a control plane, not a training compute plane.
- `LocalScriptAdapter` and fake provider implementations are dev/test or isolated workflow simulation only.
- First release does not build an OCI container runner, restricted host worker or arbitrary user-script product surface.
- Simulator output may update Attempt lifecycle, rebuildable control/read-model state and verification artifacts only; simulator output cannot update scientific Run/cell state or create canonical scientific result, validation or evidence records.
- A later real provider gate must prove provider identity, actual scheduling/runtime/output/cleanup and the full evidence chain before any production evidence claim.

## Desktop boundary
- New desktop work follows `data-ui` + token/contract styling and Tailwind B1-layout-only.
- The retired `apps/desktop/src/renderer/styles/**` and `app-layout.css` paths MUST NOT be recreated.
- The renderer consumes typed server commands/read models; the renderer does not compute canonical hashes, readiness, evidence qualification or project authorization.
- Each UI phase requires real interaction testing; source-string checks and direct API calls are supplementary diagnostics only.

## Observability and audit
- Every attempt, validation, approval, evidence mint and cross-module projection carries stable correlation IDs.
- Logs must separate user-visible blocker codes from redacted operator detail.
- Required metrics include attempt state duration, retry/reconcile counts, validation outcomes, exception decisions, projection lag and cross-project authorization failures.
- Replay/run artifacts belong under `.ai/.tmp/experiment-foundation-productization/<run-id>/`; they are ephemeral, redacted and machine-readable and are deleted during final deep cleanup after evidence publication. Durable closure evidence must be produced by a checked-in sanitizer/publisher under the T-132 package and bind the source artifact plus producer digests; canonical closure docs and checked-in `artifacts/` are the handoff SSOT.

## Open architecture decisions
- OQ-01 through OQ-22 are confirmed and Pack A implemented without opening OQ-23. The mechanical schema/invariant matrix, writer/schema population lock, final Prisma/DDL/error/capability outputs and A01-B10 technical evidence are complete.
- No Pack A source-policy input remains: `d19-deep-cleanup-final-20260715-r19` passed the exact control-plane source-binding gate, final storage census, three-event payload/envelope integrity proof, exact acknowledgement/inbox read fences, real-PostgreSQL 6/6 with skip=0, marker-reset assertions and cleanup. The reviewed digest has one portable constant and its slots are frozen in exact order. r13 supplied an obsolete attestation path and therefore correctly blocked while its A/B checks and container cleanup passed; that invocation failure neither changes product state nor reopens source policy. Extraction/derived-corpus identity and NQ↔2026 Wikipedia scientific alignment remain later scientific work; non-local DB apply and any product enable/cutover remain separate authorization decisions. Proposals for shared authority, cross-domain FK, legacy fallback or first-pack Attempt/result/closure expansion remain D-20 through D-22 violations rather than a parallel design track.

## Confirmed architecture decisions
- OQ-01 / D-01 (revised 2026-07-12): The first release proves the PI→EF→PI control flow with deterministic non-scientific simulation, exact Aliyun payload materialization, real read-only cloud preflight and same-payload fake lifecycle. No local/cloud training or simulated EvidenceCandidate/RunEvidenceUnit is allowed. Success vocabulary is limited to `workflow_simulation_passed` and `cloud_preflight_passed`.
- OQ-02 / D-02 (2026-07-11): EF uses stable logical identities, server-issued immutable revisions and server-computed canonical semantic hashes. Drafts use CAS and cannot receive readiness. Frozen changes create new revisions. Execution and readiness bind exact revisions/hashes and a complete deterministic dependency manifest. Operational state evolves through append-only events and rebuildable projections.
- OQ-03a / D-03a (2026-07-11): Human control uses one admitted WorkOrder/`approved_plan_hash` plus four fixed gate categories: WorkOrder admission, manual-promotion decision, external side effect/scope expansion, and ValidationCycle closure. Deterministic errors block directly. No DecisionAuthorityManifest, generic policy DSL or general DecisionWorkItem engine is allowed.
- OQ-03b / D-03b (2026-07-11): The first release removes `accepted_partial`, partial approval and partial-evidence grades. Incomplete output remains diagnostic-only under ExecutionAttempt. EvidenceCandidate requires a complete result with `validation_status=passed`; complete protocol-valid negative results remain eligible.
- OQ-03c / D-03c (2026-07-11): `manual_promote` is a human catalog-admission decision only. Deterministic eligibility blockers remain non-waivable; catalog admission grants neither executable readiness nor evidence trust. The decision record is minimal and contains no waiver/scope/expiry policy fields.
- OQ-04 / D-04 (2026-07-11): Promotion is server-owned, atomic and idempotent. Exact Candidate revision/hash input produces one terminal decision plus a created or exact-reused canonical revision, Candidate transition and outbox in one transaction; reject creates no canonical revision. Caller-authored canonical refs are forbidden, and readiness/evidence/external effects remain outside the transaction.
- OQ-05 / D-05 (2026-07-11; accounting refined by D-16): EF qualifies complete validation-passed EvidenceCandidate; one PI-owned Evidence Trust Gateway is the only RunEvidenceUnit writer. All intake sources use identity-only server resolution. Diagnostic terminal runs create no RunEvidenceUnit, and complete valid negative/inconclusive results remain admissible. Gateway writes RunEvidenceUnit/TraceManifest/outbox atomically; D-16 separately assigns execution accounting to the immutable Cycle closure snapshot and keeps Sidecar projection-only.
- OQ-06 / D-06 (2026-07-11): PI bootstrap requires completed PaperProjectIntake and matching non-null bridge intake/target refs. Unbound bridges fail closed without PI state creation. The product does not build general late binding/reconciliation; existing null-bound records are delegated to D-08 legacy handling.
- OQ-07 / D-07 (2026-07-12): Formal experiments execute in cloud providers. LocalScript/fake providers are dev/test simulation only and are hard-blocked from scientific result, validation and evidence writers. T-132 does not build a local container/worker platform; real evidence closure is deferred to a separately authorized provider execution.
- OQ-08 / D-08 (2026-07-12): Existing non-v2 rows remain unchanged in the database and are read only through diagnostics/admin compatibility access. Missing supported v2 identity/schema yields one mechanical `LEGACY_RECORD_NOT_ELIGIBLE` outcome. No summaries, narrative reasons, recommendations, archive UI, revalidation, comparability, trust migration or PI legacy flow is introduced.
- OQ-09 / D-09 (2026-07-11): PaperImplementation is the primary workflow for paper-bound experiments. ExperimentFoundation retains an independent asset/exploration surface, but standalone runs require explicit PI WorkOrder attachment plus complete identity, readiness, validation and project-scope revalidation before paper-trusted consumption.
- OQ-10 / D-10 (2026-07-12): PI owns ValidationCycle, WorkOrder branch/logical identity, immutable WorkOrder revisions, branch semantic fields and the project-scoped retrieval projection. EF owns deterministic TaskSpec/Run/ExecutionAttempt/result facts and binds the exact PI scope without interpreting PI research semantics. Global infrastructure provides only reusable indexing mechanics. First-release semantic documents cover ValidationCycle and branch heads, while historical v2 runs/revisions use structured lineage; semantic ranking never has workflow or trust authority.
- OQ-11 / D-11 (2026-07-12; Run row refined by D-13a): PI explicitly requests `revise | fork`; unchanged frozen branch semantic-frame hash/relation permits an immutable WorkOrder revision plus re-admission, while any branch semantic/relation change requires a new branch. Draft, same-cell technical retry, unique batch Run and new-Cycle cases map to their own object levels. Existing Runs never rebind, and `current_admitted_revision_id` remains separate from `head_run_id`.
- OQ-12 / D-12 (2026-07-12): AuthorityGate remains the only durable domain authorization; CoordinatorStop is a coordinator-local derived pause. Overlap appears as one owning-screen action and resumes automatically, while internal records retain exact domain ownership. In-bound Run/cell Attempt/retry/reconcile requires no confirmation, manual promotion stays off the normal PI path, external authorization triggers only for actual effects/expansion, and Cycle closure is one batch action. Golden scenarios classify Initiation/Authority/Recovery/Plumbing actions; the fixed T-132 zero-write flow is 1/2/0/0 and the T-124 reference full-paper flow is 1/4/0/0, with larger scenarios scaling only by named gates.
- OQ-13a / D-13a (2026-07-12): One paper-bound WorkOrder revision freezes at most one immutable Run containing 1..N required scientific cells. Cells carry exact seed/repeat/parameter/TaskSpec identities but remain embedded Run values; technical retries create cell-scoped ExecutionAttempts. Any scientific cell-set/content change requires a new revision/re-admission, and only a complete all-required-cell Run may enter Run-level validation/evidence qualification. No RunSet/RunGroup, optional/dynamic cells, partial acceptance or runtime HPO is introduced.
- OQ-13b / D-13b (2026-07-12; transaction boundary refined by D-20): EF atomically freezes Run/manifest plus `RunManifestFrozen`; PI alone sequence-fences and advances the branch head plus `BranchHeadAdvanced`; EF waits for exact durable acknowledgement before first Attempt/dispatch. Duplicate and out-of-order events converge deterministically through domain-local transactions without any cross-domain authority transaction, including under one database. Head means latest frozen execution lineage, so failed/cancelled latest Runs remain head and old Runs never auto-resume as head.
- OQ-14 / D-14 (2026-07-12; post-closure boundary refined by D-18): Run is mode-neutral; simulation/real provenance and lifecycle belong to ExecutionAttempt. Terminal simulation Attempts change only a rebuildable `workflow_simulation_status`, while Run/cells remain scientifically `not_started` and no scientific result/validation/evidence can be written. PI may close a control-only Cycle with D-18 exact scope, `control_flow_validated_no_paper_evidence`, null disposition/selected exit and `evidence_eligibility=false`. A later exact-boundary real Attempt may reuse the Run/cell only while the Cycle remains open; after closure follow-up requires a successor Cycle/new Run lineage.
- OQ-15 / D-15 (2026-07-12): The first-release paper-bound WorkOrder embeds a canonical ordered exact 1..N scientific cell plan/hash before the single admission. Ranges/grid/seed-count remain non-authoritative PI draft inputs and authorize no unlisted cell; optional provenance persistence/hash treatment is deferred to Phase 0. EF validates/materializes Recipe/TaskSpec/provider/Run bindings one-to-one after admission; TaskSpec refs are not admission prerequisites. Generator-only authority, cell substitution, post-admission sampling/scientific-field defaults, optional/dynamic cells, adaptive HPO, a CellPlan aggregate and per-cell confirmations are excluded.
- OQ-16 / D-16 (2026-07-12; membership refined by D-18): RunEvidenceUnit represents only complete protocol-compliant validation-passed scientific evidence. Later disposition never lives on REU. Failed/cancelled/incomplete effective-head execution creates no REU and is accounted by D-18 exact refs in the embedded closure snapshot; non-head history is excluded. Sidecar is display-only and Dossier consumes explicit closed-Cycle refs, never project/history scans. The T-124 S3 path is superseded migration debt; no FailureEvidenceUnit, second gateway, dual-read or extra action is allowed.
- OQ-17 / D-17 (2026-07-12): EF v2 EvaluationProtocol uses one canonical ordered typed required-rule authority and a code-local closed capability map. The first scientific-validation capability slice supports metric/artifact contracts plus mandatory real-provider/exact-batch envelope invariants; unsupported active rules return `UNSUPPORTED_RULE` before Run freeze/dispatch and at final recheck. ScientificValidation alone validates the batch and mints EvidenceCandidate on `passed`; PI Result Analysis proposes and Cycle closure alone writes disposition/exit. T-131 v1 remains catalog-only and requires a new typed v2 identity.
- OQ-18 / D-18 (2026-07-13): Cycle closure freezes one CAS-fenced current-effective decision scope, not full history: every admitted branch's current revision and non-null matching effective head Run/cells/all Attempts. A no-head branch stays visible in the candidate but returns `BRANCH_HEAD_NOT_FROZEN`. Non-head Runs are queryable history; only explicit comparison refs enter context. Any Cycle-wide active real Attempt blocks, drift rebuilds with zero write, closed-Cycle execution writes fail and Packet remains post-closure/outside the hash.
- OQ-19 / D-19 (2026-07-13): After Phase 1 identity/readiness closes as a separate entry gate, the first cross-module acceptance slice is the Phase 2 bound-Cycle two-cell admission→exactly one VersionLock/RunRecipe + two TaskSpecs→one Run/manifest→`RunManifestFrozen`→PI head CAS/`BranchHeadAdvanced`→EF durable-ack spine. The slice stops before Attempt/provider/result/evidence/closure/UI/search/legacy work, uses real shared/HTTP/service/repository/Prisma/inbox/outbox layers and performs no dual write. D-18's non-head active-real blocker remains a later global invariant.
- OQ-20 / D-20 (2026-07-13): The successful D-19 authority spine uses four domain-local Unit-of-Work commits: PI admission plus `WorkOrderRevisionAdmitted` outbox; EF inbox/materialization/Run-manifest plus `RunManifestFrozen` outbox; PI inbox/head CAS plus `BranchHeadAdvanced` outbox; EF inbox plus the sole durable acknowledgement. Same-database deployment does not merge ownership. Exact replay converges, stale sequence cannot roll back, payload/manifest conflict fails closed and relay state never substitutes for a consumer inbox commit.
- OQ-21 / D-21 (2026-07-13): D-19/D-20 use independent additive, domain-owned typed PI/EF v2 table families behind a dedicated default-off admission capability. Legacy singular WorkOrder/HarnessRun/generic EF rows remain unchanged diagnostics/admin-only with no backfill, product union, dual-read/write, fallback or trust upgrade. Capability disable stops new admission but drains committed sagas; post-D-19 product cutover switches new intake to v2 and closes overlapping legacy writers, while rollback preserves v2 lineage and never restores them.
- OQ-22 / D-22 (2026-07-13): the first migration contains only the Phase 1 typed identity/readiness substrate needed by the locked fixture plus the D-19 PI admission-to-EF-ack spine. Relations own identity, uniqueness, CAS, order, bindings and idempotency; only named schema-versioned scientific snapshots use server-hashed canonical JSON. Same-domain FK is permitted, cross-domain FK/generic EAV/capability mirrors and all Attempt/provider/result/validation/evidence/closure/UI/search/legacy-mapping persistence are excluded. D-22 freezes logical families and invariant placement, not Prisma names, DDL, DB apply or product enablement.

The 2026-07-14 implementation cleanup refines D-22 without opening D-23: stable family keys remain relational identity, typed draft schema/hash are derived rather than duplicated, immutable revisions retain server hashes, and VersionLock uses relational exact dependencies plus one derived hash. Removing the 12 write-only columns and 5 unused indexes changes no logical family or authority boundary.

Accepted decisions MUST be written immediately to `03-implementation-notes.md` and reflected here before implementation.

## 2026-07-22 — Pack C final convergence evidence boundary

- `packc-cutover` owns PC17/PC18 source and targeted-suite proof only. The gate opens no database connection because the owning C-EF and C-PI relational families already have mandatory digest-pinned disposable lanes.
- `packc-final` is the pack-wide convergence authority: one final id deterministically derives fresh EF/PI/cutover child ids, executes all three, verifies each canonical summary SHA and maps PC01-PC20 to the owning child checks. PC19 is conjunctive across PC19-EF and PC19-PI; PC17/PC18 are owned by cutover rather than the C-PI deferral row.
- The final runner executes the backend full suite exactly once and records conditional skips. Exit 0 requires all child gates and the backend suite to pass. A valid blocked relational child keeps the convergence status blocked while any independent backend failure remains explicit evidence; once relational children pass, any backend failure makes convergence failed.
- Child summaries under `.ai/.tmp` remain ephemeral. Durable closure is `artifacts/implementation/08-pack-c-cutover-technical-closure.md` plus a copied/sanitized passing host summary; no existing-database or product-write authority is introduced by the runner.
