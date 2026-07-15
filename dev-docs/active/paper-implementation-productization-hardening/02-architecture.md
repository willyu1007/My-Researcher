# 02 Architecture

## 分工铁律（在 T-114 边界上新增 Coordinator 一行，其余不变）

| 层 | 拥有 | 禁止 |
|---|---|---|
| **Run Coordinator（新）** | run 状态机、slot 推进顺序、步数/预算上限、断点恢复、同 run 并发互斥、链内延续决策的**确定性**执行（CandidateSelectionPolicy / disposition gate）与决策记录 | 语义处理、prompt 编译、模型/profile 选择、cache/压缩 identity 计算、域权威写入、队列创建、修复或重跑 runtime 输出、任何 LLM 参与的延续决策 |
| Harness（不变） | 验证/压力/replay 录证、proposal artifact、DecisionWorkQueue | 编译 prompt、选模型、计算 runtime/cache/压缩 identity、产生 production runtime artifact、充当 primary input |
| Runtime slot（不变） | 语义执行、role/final artifact、有界同 profile 重试 | 域权威写入、队列创建、Domain Gate 触发以外的状态迁移 |
| Admission（不变） | 验证 envelope/identity/lineage/漂移，replay 幂等 | 修复、重跑、materialize |
| Domain Gate + 确定性服务（不变） | 域状态迁移、queue/WorkOrder/live-adapter 权威 | — |

**harness 设计评估结论（回应审计维度二）**：harness 本体扎实——录证/重放/队列职责清晰、所有权 scan 已在测试链、与 runtime 的边界由 `10-harness-runtime-boundary.md` 钉死并有 no-dual-track 必检用例。缺口不在 harness 自身，而在"产品中没有任何东西调用 runtime slot"（P-04）。因此答案是**新增 Coordinator 薄服务**，而不是改造 harness 或把编排塞回 harness。

## PI↔EF experiment iteration contract — adopts T-132 D-10 through D-21 (confirmed through 2026-07-13)

T-132 `02-architecture.md` is the cross-task decision source; the following section records the PI-side adoption and terminology boundary. T-124 already has a task-local D10, so cross-task references MUST use full names such as `T-132 D-10`, `T-132 D-18` and `T-132 D-19` rather than an unqualified decision number.

```text
ImplementationProject
└─ ValidationCycle                         PI authority
   └─ WorkOrder branch                     PI stable logical identity
      └─ immutable WorkOrder revision      PI exact admitted plan
         └─ required-cell batch Run        EF immutable execution fact
            └─ ExecutionAttempt            EF cell-scoped technical-attempt fact
```

### Ownership and exact scope
- PI owns the ValidationCycle question, admission-frozen positive/negative/inconclusive exit definitions, closure-authoritative scientific disposition/selected exit, WorkOrder branch/revision and immutable branch-local revision sequence, the admitted branch semantic frame, embedded exact scientific cells/`cell_plan_hash`, `approved_plan_hash`, `current_admitted_revision_id`, project-scoped retrieval projection and explicit per-branch `head_run_id`/head-sequence projection.
- EF owns TaskSpec, the unique immutable batch Run/manifest, cell-scoped ExecutionAttempt, provider lifecycle and result/validation facts. EF receives the exact PI project/Cycle/branch/revision/sequence/hash/`cell_plan_hash`/`approved_plan_hash` plus scientific cells, adds `run_id + run_manifest_hash + task_spec_ref/hash + attempt_id`, and round-trips the full scope without interpreting PI intent, assigning a contextual scientific disposition or resolving `latest`, ranges or generator metadata.
- `current_admitted_revision_id` and `head_run_id` are separate projections. A ValidationCycle may have several WorkOrder branches and therefore several branch heads; neither timestamp order nor semantic score establishes a Cycle-wide latest Run.
- PI's retrieval projection is rebuildable/discovery-only. Structured project/lineage queries remain authoritative, permission filtering precedes semantic ranking, and every hit re-resolves exact PI/EF source revision/hash.

### Deterministic object transition matrix

| Change/action | Required transition |
|---|---|
| edit ranges/grid/seed-count before first admission | CAS-update the same WorkOrder draft and automatically compile/preview canonical exact cells; no EF Run exists |
| retry the exact same cell/TaskSpec after technical/provider failure | create cell-scoped EF ExecutionAttempt under the same immutable batch Run |
| admit the exact scientific cells/hash | freeze one immutable PI WorkOrder revision authority; ranges/generator metadata authorize no cells |
| materialize after admission | EF validates one-to-one exact-cell parity, resolves/create-or-exact-reuses TaskSpecs and freezes the revision's only ordered required-cell Run; same revision+manifest replay is idempotent |
| exact plan or any seed/repeat/parameter/result-contract/cell membership changes while frozen branch semantic-frame hash and parent/fork relation remain identical | create immutable WorkOrder revision and repeat WorkOrder admission; applies only to its future Run |
| a WorkOrder input would resolve a different TaskSpec, or an already frozen TaskSpec binding would be replaced | create and admit a new WorkOrder revision for future materialization; never mutate/rebind the existing Run |
| `branch_intent`, `expected_effect`, `difference_from_parent`, `parent_branch_id` or forked-from Run relation changes | explicit `fork` to a new WorkOrder branch/logical identity |
| ValidationCycle question or positive/negative/inconclusive exit definitions change | create a new ValidationCycle |

- PI issues explicit `revise | fork`; the backend rejects `revise` when frozen branch semantic fields/relations differ and returns `fork` as the stable next action. No LLM, EF heuristic or semantic-distance threshold owns classification.
- A new revision/branch never rebinds or mutates an in-flight/completed experiment Run. The old Run continues under the original revision or receives a separate explicit EF cancel intent.

### Required-cell batch adoption — T-132 D-13a
- A paper-bound WorkOrder revision has zero Runs before successful EF preparation and at most one Run overall; successful manifest freeze establishes exactly one. PI must reject a second/conflicting Run binding for the same revision while treating the same Run/manifest replay idempotently.
- PI supplies the admitted exact scientific cells/`cell_plan_hash` but does not author EF's later TaskSpec refs or `run_manifest_hash`. PI stores/projects the returned exact Run/manifest binding and validates one-to-one scientific-cell parity against the same revision/hash/`approved_plan_hash` without back-writing the admission hash.
- Cells are EF Run-owned values, not PI WorkOrder branches, coordinator candidate paths, RunSet/RunGroup records or new human decisions. PI projections may display `cell_key`/TaskSpec/Attempt state but do not independently mutate cell truth.
- Every required cell must complete through eligible real-provider scientific results before EF Run-level validation/evidence qualification. Simulation Attempts remain non-scientific and leave the Run/cells scientifically `not_started`; technical retry adds an Attempt, while a changed scientific cell set creates a new PI revision/admission.
- D-13b confirms the event/CAS rule in the head-advancement section; no existing T-124 status or harness-run field is reinterpreted as the head.

### Exact cell-plan admission adoption — T-132 D-15
- PI may use ranges, finite grids, seed counts or model suggestions while editing a WorkOrder draft, but the single admission requires a canonical non-empty ordered `exact_cell_plan[1..N]` embedded in the immutable revision plus `cell_plan_hash` bound by `approved_plan_hash`.
- Every admitted cell fixes PI-server-derived key, seed, repeat index, exact parameter bindings and required-result contract. The exact plan is a value collection, not a new CellPlan aggregate, pipeline branch, RunSet/RunGroup, generator registry/DSL or per-cell decision.
- EF post-admission validation/materialization must preserve one-to-one scientific-cell parity and add only EF-owned Recipe/TaskSpec/provider/result bindings. TaskSpec refs/hashes are not PI admission inputs and must not become manual plumbing.
- Extra, missing, duplicate, substituted or scientifically drifted cells fail before Run/head/Attempt. EF cannot replace a cell after materialization failure or use scientific-field defaults/sampling to create an unlisted cell.
- Existing `autotune_policy` and `allowed_mutation_refs` cannot authorize v2 admitted runtime scientific-cell mutation. If retained for compatibility/authoring they are non-authoritative; retry budget applies only to technical Attempts of the same exact cell. Any cell change creates a new revision and admission.
- Optional authoring-provenance persistence/hash treatment, exact `cell_key` algorithm/hash profile, plan-size cap, UI summarization and TaskSpec reuse strategy remain Phase 0 implementation choices; none may change scientific-cell authority or add a user action.

### Scientific evidence versus execution accounting — T-132 D-16 confirmed
- RunEvidenceUnit has one meaning and one writer: the single PI Evidence Trust Gateway may create a REU only from a complete protocol-compliant validation-passed EF EvidenceCandidate after exact server-side lineage/project resolution.
- Results later assigned positive, negative or inconclusive by Cycle closure share completed execution/evidence; `positive | negative | inconclusive` cannot be encoded as execution failed/cancelled/incomplete or REU state.
- Failed, cancelled and incomplete execution creates no RunEvidenceUnit. PI freezes the current-effective branch-head scope defined in the closure section—exact head Run/Attempt refs, execution states, eligibility codes and any eligible REU refs—into one embedded immutable snapshot/hash on the existing ValidationCycle closure record; closure is not a full-history archive operation.
- PaperExperimentSidecar references/rebuilds that exact snapshot/hash plus authoritative events for display. Sidecar cannot be independently edited, mint trust or become a second failure-accounting/dossier authority.
- Dossier readiness declares the closed-Cycle snapshot refs/hashes in scope and re-resolves project/Cycle/hash parity. Open, tampered, incomplete or wrong-project snapshots fail; unrelated Cycle failures do not contaminate readiness; project-wide failed-like REU scans are forbidden.
- The historical S3-β path that creates trusted failed/cancelled REU and runs `assertProjectRunEvidenceAccounting` is superseded target semantics and a mandatory migration debt. Its implementation/tests remain historical evidence only and cannot satisfy the shared seam.
- Cutover is atomic: replace mixed execution/result status, failed-REU writers, Cycle closure storage, dossier reader and acceptance fixtures in one scheduled slice. Do not retain dual-read, compatibility aliases, Sidecar fallback, FailureEvidenceUnit or a second gateway.
- D-16 introduces no new aggregate or human action. The existing Cycle-closure AuthorityAction freezes the snapshot, dossier export retains its existing action, and the T-124 reference budget remains `1/4/0/0`.

#### Current-effective closure scope and watermark — 2026-07-13 refinement
- A ValidationCycle closure is a decision snapshot, not an experiment-history archive. At snapshot start, PI freezes one `closure_scope_watermark` over the exact Cycle frame revision/hash, admitted branch-set version/hash and, for every admitted branch, the branch id, current admitted revision id/hash, `head_run_id`, head sequence and Run-manifest hash.
- Every admitted branch is a required scope member. A branch without a durable head Run is not silently omitted and cannot be treated as no evidence; closure preparation fails with stable `BRANCH_HEAD_NOT_FROZEN` until the exact head is frozen and acknowledged.
- For each branch, only the head Run at the watermark enters current execution accounting, together with its complete manifest/cells, all of that Run's Attempts, execution/scientific states, eligibility codes and eligible REU refs. Replaced/non-head Runs remain immutable, read-only and queryable history and are excluded from the closure snapshot by default.
- A historical Run/result/snapshot may support a deliberate comparison only when the current admitted WorkOrder revision carries an exact immutable `comparison_input_ref` and hash. The comparison ref is covered by the revision/closure lineage hash and must pass the existing trust checks if consumed as evidence, but the comparison ref does not become branch head, rebind an old Run, authorize execution or expand current execution accounting.
- Closure readiness performs a Cycle-wide real-provider Attempt census, not only a head-Run census. Any non-terminal real Attempt bound to the Cycle—including one on a replaced/non-head Run—fails with stable `CYCLE_ACTIVE_REAL_ATTEMPT` until the Attempt reaches a terminal state or is explicitly cancelled; closure cannot admit late real results after the Cycle is frozen.
- Snapshot construction uses expected Cycle version, branch-set watermark, current-admitted-revision identities and per-branch head sequences. Any concurrent admission, branch-set change, revision advance or head advance fails CAS as `CYCLE_CLOSURE_SCOPE_DRIFT`, writes no closure/snapshot/proposal authority and rebuilds from the new watermark. Replaying the identical watermark plus snapshot hash is idempotent.
- After successful closure, the Cycle accepts no new branch, revision admission, Run/head advance or Attempt. Any post-result experimental adjustment starts through the already-defined new revision/branch/new-Cycle operations rather than mutating the closed scope.

### Executable protocol and scientific-conclusion responsibility chain — T-132 D-17 confirmed

`protocol-compliant` is an EF measurement, comparability and lineage qualification. Protocol compliance is not a positive scientific conclusion and cannot select a ValidationCycle exit. Scientific meaning exists only in the exact PI Cycle context.

| Authority object | Sole writer / responsibility | Automatic trigger | Authorized consumers and prohibitions |
|---|---|---|---|
| v2 EvaluationProtocol revision/hash | EF canonical protocol path freezes one canonically ordered typed `required_rules` collection; descriptive/free-shape text is non-executable | readiness before Run freeze/dispatch and exact-profile recheck at final validation | ScientificValidationService only; no LLM interpretation, best-effort skip or human waiver |
| exact-batch ResultValidationReport and EvidenceCandidate | EF ScientificValidationService validates the complete immutable Run and is the only report/Candidate writer | every required cell has an eligible real-provider complete result and the exact frozen validator profile is still supported | PI Evidence Trust Gateway may consume a passed Candidate; generic record/adapter/monitor/caller paths cannot mint validation or trust |
| RunEvidenceUnit | the sole PI Evidence Trust Gateway writes trusted evidence identity/lineage only | one exact passed EvidenceCandidate resolves to the same PI project/Cycle/branch/revision/Run scope | Result Analysis and closed-Cycle accounting may reference the REU; REU never owns `positive | negative | inconclusive` |
| Result Analysis proposal | PI runtime produces one proposal bound to the frozen Cycle frame, current-effective branch-head closure-input snapshot and exact evidence refs/hashes | `CycleReadyForInterpretation`: every admitted branch has a durable head at the watermark, every head Run/Attempt is accounted, no real Attempt anywhere in the Cycle remains active and the closure-input snapshot/hash is buildable; eligible REU exists | existing Cycle closure may accept/correct the proposal; runtime/model/domain gate cannot write `cycle_assessment`, selected exit or an authoritative packet |
| existing ValidationCycle closure record | PI ClosureService/StateWriter is the sole writer of closure kind, nullable scientific disposition/selected exit, accepted Result Analysis proposal ref/hash and immutable D-18 snapshot/hash; Packet identity is excluded | the existing one Cycle-closure AuthorityAction | `ValidationCycleClosed` triggers ResultInterpretationPacket; Claim/Dossier/next-step consumers require the exact closed Cycle |
| ResultInterpretationPacket | PI materializes the packet only from the exact closed Cycle and accepted proposal/ref/hash | `ValidationCycleClosed` | Claim/Dossier may consume the packet; Packet is outside the closure hash and an open proposal/independent packet has no authority |

- The v2 executable-rule surface is deliberately closed. The first slice supports `metric_contract@v1` and `artifact_contract@v1`; exact dependency/hash, real-provider, Run/cell/result lineage and admitted cell/seed/repeat/parameter/result-contract parity are non-configurable envelope invariants.
- Any malformed, unknown or unsupported required aggregation/comparison/statistical/threshold/fairness/derived/evaluator rule returns stable `UNSUPPORTED_RULE` before Run freeze/head/Attempt and is rechecked at final validation. Unsupported capability creates no ResultValidationReport with `passed`, EvidenceCandidate or REU.
- One immutable report binds the exact Run/manifest hash, canonically ordered required-cell result refs/hashes, exact protocol revision/hash, validator-profile hash and ordered rule results. Only overall `passed` may atomically create EvidenceCandidate; results later assigned positive/negative/inconclusive remain on that evidence-eligible path because scientific disposition is a later PI concern.
- Zero eligible evidence prepares a no-evidence/control-only closure and skips Result Analysis. The closure has its explicit non-scientific `closure_kind`, null scientific disposition and no scientific selected exit; execution failed/cancelled/incomplete can never be inferred as negative.
- For a scientific closure, the server derives the selected exit from the admission-frozen `decision_if_positive | decision_if_negative | decision_if_inconclusive` definition. Direct caller-authored `cycle_assessment` or `decision_exit` is rejected. A changed question or exit definition creates a new Cycle.
- Missing, failed or stale Result Analysis proposal generation blocks scientific closure with a stable retry/fix state. The existing action may correct an exact proposal, but no bare human assessment, direct packet or second-authority fallback is opened.
- Post-closure next-step handling may prepare `revise | fork | stop | proceed` drafts only for a successor ValidationCycle and cannot auto-admit or execute them. The closed Cycle accepts no new branch/revision/Run/Attempt lineage; EF never consumes its disposition or rewrites an existing Run.
- D-17 adds no ScientificConclusion aggregate, rule DSL/plugin, second conclusion writer or user action. The Result Analysis proposal is presented inside the existing Cycle-closure action; validation, readiness detection, proposal generation, packet materialization and downstream projection are automatic.
- Target semantics are confirmed but not implemented. The cutover must atomically close opaque/free-shape protocol execution, heuristic per-job validation, generic validation/evidence writers, caller-authored Cycle assessment/exit, negative/inconclusive REU status, direct ResultInterpretationPacket authority and open-proposal consumers; no dual-read/fallback may remain.

### Sequence-fenced head adoption — T-132 D-13b
- EF atomically freezes Run/manifest plus `RunManifestFrozen`; PI consumes through an idempotent inbox, validates exact admitted scope and branch revision sequence, then atomically CAS-updates head and emits `BranchHeadAdvanced`. No transaction may write both PI and EF canonical/inbox/outbox state, even when both domains share one physical database; shared mutable authority tables, shared write repositories, distributed locks and 2PC are forbidden.
- Same sequence/Run/manifest replay is idempotent; a lower sequence is historical and cannot roll back head; same sequence with a different Run/manifest is an invariant conflict; an event without visible admission waits/retries.
- EF must durably commit the exact `BranchHeadAdvanced` inbox receipt—the acknowledgement—before the first cell Attempt/dispatch. A stale never-dispatched Run remains lineage-only. A prior already executing Run is not auto-cancelled by a new head.
- PI defines head as latest frozen execution lineage, not success, current execution, best metric, EvidenceCandidate or adopted evidence. Failed/cancelled/incomplete latest Runs remain head and never restore an older successful Run.
- Head advance/replay is automatic and adds no AuthorityAction, CoordinatorStop acknowledgement, RecoveryAction or PlumbingAction.

### First implementation acceptance slice — T-132 D-19
- The slice begins only after a PaperProject and ValidationCycle are already correctly bound and the required typed v2 assets have been persisted through the real EF identity/readiness path. PaperProject bootstrap, candidate ingestion and promotion are product prerequisites outside the D-19 slice; direct fixture insertion or a legacy adapter cannot substitute for the typed v2 path.
- PI admits one immutable WorkOrder revision with canonical `exact_cell_plan[1..N]`; the acceptance fixture fixes `N=2` so a singular TrainingTaskSpec/job shortcut cannot pass. Both cells preserve their admitted key, seed, repeat index, exact parameters and required-result contract, while EF adds only its VersionLock/RunRecipe/TrainingTaskSpec bindings.
- EF validates one-to-one parity, freezes the revision's only ordered batch Run/manifest and atomically persists `RunManifestFrozen` to its outbox. PI consumes through its inbox, validates exact project/Cycle/branch/revision/sequence/hashes, CAS-advances the branch head and atomically persists `BranchHeadAdvanced`. EF consumes that exact event through its inbox; the durably committed inbox receipt is the acknowledgement.
- The acceptance endpoint is the exact EF inbox receipt/acknowledgement. No ExecutionAttempt may exist before or at that endpoint; provider calls, ExperimentResult, ResultValidationReport, EvidenceCandidate, RunEvidenceUnit, Cycle closure, UI/search write and legacy-row migration are all outside the slice and must remain zero. Same-input and lost-ack replay converge; lower sequence cannot roll back head; same sequence with a different Run/manifest fails closed.
- The v2 path is capability-gated and must not dual-write or fall back to the legacy ResearchWorkOrder/HarnessRun representation for the same logical object. The pre-bound Cycle fixture is a joint seam integration boundary, not an alternate product bootstrap or final usage-fit proof: T-124 D10 still requires the golden scenario to enter through the real bootstrap route and continue to dossier ready.
- D-19 does not implement or partially cut over D-16/D-17/D-18 evidence, conclusion or closure accounting. Those writers/readers move in their later atomic slice. D-18 remains authoritative: once real Attempts exist in later phases, any active real-provider Attempt anywhere in the Cycle, including a non-head Run, blocks closure.

### Domain-owned Unit-of-Work and replay boundary — T-132 D-20 confirmed 2026-07-13
- D-19 has four domain-owned authoritative Unit-of-Work commits on its happy path. `PI-U1` atomically commits WorkOrder revision admission/current-revision authority and the `WorkOrderRevisionAdmitted` outbox. `EF-U2` atomically commits that event's inbox receipt, exact VersionLock/RunRecipe/TrainingTaskSpec materialization, the revision's unique Run/manifest and `RunManifestFrozen` outbox. `PI-U3` atomically commits the `RunManifestFrozen` inbox receipt, exact-scope sequence-fenced head CAS and `BranchHeadAdvanced` outbox. `EF-U4` atomically commits the exact `BranchHeadAdvanced` inbox receipt; that receipt itself is the durable acknowledgement, not a second acknowledgement object.
- Each Unit-of-Work uses only its owning domain's service/repository ports and tables. Sharing a Prisma client or one physical Postgres is a deployment detail and does not authorize a transaction callback, repository method or generic route to write both domains. Cross-domain transactions, shared mutable authority rows, shared write repositories, distributed locks and 2PC are forbidden.
- For an accepted event, the inbox receipt, local authority mutation and resulting outbox record commit or roll back together. The relay publishes only committed outbox records with at-least-once delivery. Relay lease, retry and delivery-marker transactions are infrastructure bookkeeping, not additional domain authority and not proof that the consumer committed.
- Replay identity is `event_id` plus the canonical envelope/payload hash. Exact replay returns the persisted outcome without duplicate authority or outbox writes; the same `event_id` with a different canonical payload is a terminal payload conflict. A lower branch sequence is atomically consumed as stale with zero head/outbox mutation. The same branch sequence with a different Run/manifest is an invariant conflict with zero head/outbox mutation. A temporarily invisible prerequisite remains retryable and commits no domain/outbox mutation.
- The only integration-event chain is `WorkOrderRevisionAdmitted → RunManifestFrozen → BranchHeadAdvanced`. Every versioned envelope carries producer, event/idempotency identity, correlation/causation, canonical payload hash and exact project/Cycle/branch/revision/sequence/hash scope; event-specific payloads preserve the admitted exact-cell authority, exact Run/manifest/TaskSpec-binding identity and accepted head version without `latest` or producer-table mutable reads.
- Crash before a local commit leaves no partial inbox/domain/outbox rows. Crash after commit but before publish, after publish but before relay marking, or after consumer commit but before transport acknowledgement converges through outbox replay and inbox deduplication. Failed retries cannot open a synchronous callback or direct-write fallback.
- The exact `BranchHeadAdvanced` inbox receipt committed by `EF-U4` is the only acknowledgement that later authorizes Attempt preparation. PI delivery state, relay `published | delivered` markers, synchronous HTTP success and a separate `dispatch_eligible` projection are not acknowledgement authority.
- D-20 fixes transaction ownership and recovery only; D-20 does not authorize product-code/schema/database changes. The `Additive v2 physical storage and one-way cutover` section fixes D-21, and the `Minimal first-migration schema and invariant placement` section fixes D-22; the concrete schema/invariant matrix plus implementation-readiness and explicit authorization review still precede product-code/schema/database changes.

### Additive v2 physical storage and one-way cutover — T-132 D-21 confirmed 2026-07-13
- D-19/D-20 use independent domain-owned additive v2 canonical table families. PI v2 storage owns WorkOrder branch/revision/admission/current-revision/head authority plus PI inbox/outbox. EF v2 storage owns typed identity/readiness/materialization, Run/manifest/cell bindings plus EF inbox/outbox. Shared Postgres deployment may reuse technical migration and Prisma infrastructure but creates no shared mutable authority table, cross-domain write repository or runtime union view.
- Cross-domain references are exact versioned identities, hashes and events. PI repositories cannot create/update EF canonical/inbox/outbox rows; EF repositories cannot create/update PI canonical/inbox/outbox rows. Neither domain may resolve a v2 command by joining legacy singular/generic rows into an apparent canonical object.
- Existing singular ResearchWorkOrder/WorkOrderHarnessRun and generic EF rows remain unchanged. Compatibility access is existing-field diagnostics/admin read-only. D-21 permits no legacy-row backfill, persisted eligibility annotation, trust upgrade, v2/legacy dual write, legacy-to-v2 fallback or mixed runtime read model. Original-source re-import may create a new v2 object but cannot transform or bless the legacy row.
- The capability is default-off at new PI v2 admission. When off, a new paper-bound v2 admission fails closed with a stable disabled outcome and zero PI v2, EF v2 or legacy write. The capability is not checked as a kill switch at every saga step: once PI admission and `WorkOrderRevisionAdmitted` commit, the accepted saga must drain through EF materialization, PI head advance and the durable EF `BranchHeadAdvanced` inbox acknowledgement.
- D-19 acceptance runs with the v2 capability explicitly enabled only in its approved acceptance scope. After D-19 passes, one explicit product cutover directs every new paper-bound admission to v2 and disables all overlapping singular/generic legacy product writers at the same boundary. Work that still requires a legacy writer must finish before cutover or restart from a new v2-bound project/Cycle/revision; no active object is rebound or backfilled.
- Rollback after product cutover disables new v2 intake and preserves existing immutable v2 canonical rows plus inbox/outbox receipts for audit, replay and saga drain. Rollback never routes a new request to ResearchWorkOrder/WorkOrderHarnessRun/generic EF writers, restores a legacy writer or deletes/reinterprets committed v2 state.
- D-21 freezes table-family ownership and cutover semantics rather than final Prisma names. The D-22 section freezes the minimum first-migration logical pack and invariant placement without widening the slice into later runtime/scientific/product surfaces.

### Minimal first-migration schema and invariant placement — T-132 D-22 confirmed 2026-07-13
- The first additive v2 migration contains only the minimum Phase 1 identity/readiness substrate required to create and re-read readiness-passed typed assets through the real server-owned v2 path, plus the D-19 admission-to-durable-EF-acknowledgement spine. D-22 freezes logical object families and invariant placement; exact Prisma model/column names, indexes and DDL remain outputs of the joint schema/invariant matrix and DB-SSOT migration review.
- The PI portion contains WorkOrder branch, immutable admitted revision with exact-cell snapshot, admission/current-revision/head authority and PI integration inbox/outbox. The EF portion contains the minimal typed asset logical identity/immutable revision/readiness/dependency bindings, VersionLock/RunRecipe/TrainingTaskSpec bindings, the revision's sole Run/manifest/cells and EF integration inbox/outbox. Test setup must call the real v2 identity/readiness writer and server hash path; D-22 adds no PaperProject bootstrap, candidate-ingestion or promotion table/API/fixture bypass.
- Same-domain identities and relationships are relational. Owning-domain fields and database constraints enforce stable logical/revision identity, branch-local revision sequence, expected-version/CAS, one effective current revision/head transition, one Run per admitted revision, one materialized TaskSpec binding per admitted cell, canonical cell key/ordinal uniqueness and inbox/outbox event/idempotency uniqueness. Same-domain foreign keys may enforce aggregate ownership; repository and transaction ownership remain bounded by D-20.
- Cross-domain scope uses exact external project/Cycle/branch/revision/Run/manifest refs, canonical hashes, branch sequence and immutable event identities as scalar values. PI and EF create no cross-domain ORM relation, database foreign key, cascade or mutable association row; a same-Postgres deployment does not turn referential convenience into cross-domain write authority.
- Frozen scientific structures use explicitly named, schema-versioned typed canonical-JSON snapshot columns with server-computed canonical hashes. The names and typed contracts distinguish exact-cell plan, readiness qualification, VersionLock, RunRecipe and TaskSpec scientific values; ordered relational readiness-dependency and RunCell rows remain their identity/order authority, and `run_manifest_hash` is derived from the ordered immutable RunCell/TaskSpec bindings rather than a second manifest JSON payload. D-22 permits no generic domain `kind/payload` record, EAV table or caller-authored hash. JSON is not allowed to hide relational identity, unique, CAS, cell-binding or event-idempotency invariants.
- Inbox/outbox rows carry structured event type/version, event/idempotency identity, producer/consumer scope, correlation/causation, exact external refs and canonical payload hash around an event-specific typed canonical payload. A shared untyped event blob, transport delivery marker or payload field cannot become domain authority or replace the exact EF inbox outcome.
- The default-off v2 capability remains an admission configuration/routing guard. The schema pack adds no persisted legacy eligibility annotation, v2 eligibility row, `dispatch_eligible` projection or saga kill-switch field. Already committed D-20 work drains independently of the new-intake setting.
- D-22 adds no ExecutionAttempt, provider request/job, ExperimentResult, ResultValidationReport, EvidenceCandidate, RunEvidenceUnit, Cycle closure/snapshot, UI/search projection, legacy migration/backfill or global product-cutover model. Those later capabilities require their own implementation slice and migration; the D-18 active-real-Attempt blocker remains a future closure invariant and is not claimed implemented by an Attempt-free first pack.
- Historical D-22 decision record: D-22 itself changed no product code, Prisma schema or database and introduced no D-23 decision. The subsequent readiness review and explicit implementation authorization are recorded in the following Pack A sections; Pack A technical implementation and the named local-development apply/cutover have since completed. Every non-local target still requires separate authorization.

### Implementation Pack A readiness adoption — 2026-07-13
- T-132 `07-implementation-readiness-review.md` is the joint readiness SSOT and records `ready_for_implementation_authorization`. The readiness result freezes planning evidence only and does not authorize code/config/schema edits, DB apply or product enablement.
- The exact EF asset allowlist is Dataset, DataPolicy, MetricDefinition, Benchmark and a new EvaluationProtocol v2. The fixture uses two Dataset revisions, two dataset-specific DataPolicy revisions, seventeen MetricDefinition revisions, one Benchmark revision and one EvaluationProtocol v2 revision. BaselineImplementationVersion, MethodRecipeComponent, DatasetMirror and provider/platform objects are outside Pack A.
- PI owns `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=false` and the dedicated project/Cycle-scoped v2 admission route. Capability-off rejects before T1 with zero PI/EF/legacy write; the LocalScript flag cannot substitute.
- Pack A must use new PI v2 contracts/routes/controllers/services/repositories and the clean schema/app integration points. Dirty T-124 result/dossier/runtime/REU files are outside the edit population; any required edit to those surfaces reopens readiness review.
- The submitted legacy HarnessRun and running legacy ExternalTrainingJob do not block additive default-off implementation, but both block later product cutover until terminal or explicitly restarted as v2 lineage.

### Implementation Pack A implementation outcome — 2026-07-13

- The dedicated PI v2 admission route/controller/service/repository and six PI v2 Prisma families now implement T1 admission/current-revision CAS, T3 exact-scope branch-head CAS and PI domain inbox/outbox authority.
- EF implements the matching typed identity/readiness and materialization/Run families. The shared event chain is exactly `WorkOrderRevisionAdmitted → RunManifestFrozen → BranchHeadAdvanced`; the processed EF final inbox receipt is the only durable acknowledgement.
- Real disposable-PostgreSQL evidence passed A01-A04 and B01-B10, including concurrent exact admission replay, four local rollback probes, lower/same-sequence fences, two-cell manifest parity, capability-disable draining and unchanged legacy/non-v2 digests.
- The final additive census is 34 v2 models: 6 PI and 28 EF. The census has zero cross-domain FK, generic authority table, persisted capability/dispatch mirror or Attempt/provider/result/evidence/closure model.
- The product admission and cutover source defaults remain `false`. Source-backed final run `packa-d19-source-policy-20260713-r2` passed and closes the PI↔EF seam only through the Pack A control-plane durable acknowledgement. The named local target subsequently applied the additive migration, exact-imported readiness and enabled v2 with overlapping legacy mutations closed; the named local rollout does not authorize another environment or scientific execution.
- The Pack A outcome establishes only the bounded D-19 spine. PaperProject bootstrap, D-16/D-17/D-18 trust/closure replacement, UI/search and the T-124 full golden scenarios remain open.

### Implementation Pack B PI adoption outcome — 2026-07-13

- Pack B extends only the EF side of the acknowledged Pack A spine with same-payload simulation provider control. Its exact prerequisite is the processed EF `BranchHeadAdvanced` inbox receipt plus the unchanged Run/RunCell/TaskSpec and readiness identities; it cannot resolve `latest`, substitute a cell or start from legacy authority.
- The six new EF families are ProviderPayload, ExecutionAttempt, ExecutionAttemptEvent, ProviderCommand, CollectionAttempt and ProvisionalOutput. Attempt status is rebuilt from append-only events; payloads are server-hashed; commands are durable, leased and version-fenced; provisional output is diagnostic-only.
- Submit, sync, reconcile and cancel use a deterministic fake transport in Pack B. Cancellation may persist an unresolved intent while submit is leased, then resolves against the E3-owned external reference; cancel has progression precedence, stale lease holders cannot commit, and exact retries converge without a second provider side effect.
- PI receives no Pack B persistence or writer. Its future `workflow_simulation_status` must consume exact EF Attempt-event lineage and remains outside this slice. Terminal simulation leaves Run/cells scientifically `not_started`, creates no result/validation/evidence/REU and does not satisfy D-16/D-17/D-18 closure.
- `EXPERIMENT_FOUNDATION_V2_WORKFLOW_SIMULATION_ENABLED` defaults false and requires committed v2 cutover before new intake; committed commands drain independently after intake is disabled. Run `packb-20260713-final4` passed PB01-PB16 on disposable PostgreSQL. No Pack B migration was applied to an existing database and no product capability was enabled.

### Orthogonal simulation/scientific-state adoption — T-132 D-14
- PI treats EF experiment Run as mode-neutral. Simulation/real provenance and terminal provider lifecycle belong to EF ExecutionAttempt; PI must not create a SimulationRun, relabel the Run or reuse `PaperImplementationCoordinatorRun` as a simulation/scientific status carrier.
- PI rebuilds `workflow_simulation_status` from exact EF simulation Attempt events and preserves their provenance in WorkOrder/Sidecar views. A succeeded/failed/cancelled simulation Attempt cannot make the Run scientifically completed/failed/cancelled, cannot become a negative scientific result and cannot create RunEvidenceUnit.
- When no eligible real-provider result exists, PI displays the EF-derived contract value `scientific_execution_status=not_started` separately from the control outcome. PI does not persist a competing EF scientific-state authority.
- PI may close a control-only ValidationCycle with `closure_kind=control_flow_validated_no_paper_evidence` and `scientific_disposition=null` only after required control checks are terminal and the current-effective branch-head watermark is stable. The closure stores exact Cycle/branch/head-Run/simulation-Attempt refs plus `evidence_eligibility=false`; a missing branch head is a blocker rather than an implicit no-evidence entry, and the closure changes PI workflow state only without mutating EF Run/cell/Attempt facts.
- A non-terminal real-provider Attempt anywhere in the Cycle—including on a non-head historical Run—blocks Cycle closure. A later exact-scope authorized real Attempt remains on the same EF Run/cell only while the Cycle is open, and only EF's eligible complete result may advance scientific completeness.
- D-14 adds no confirmation: the existing Cycle-closure AuthorityAction covers the PI disposition, and simulation projection/replay adds zero CoordinatorStop acknowledgement, RecoveryAction or PlumbingAction.

### Terminology separation
- `PaperImplementationCoordinatorRun` is an automation-orchestration execution over PI runtime slots; the coordinator Run is not an EF experiment Run and does not occupy the experiment lineage level above.
- Coordinator `node_attempt_id` and slot retries are PI runtime attempts; they are not EF ExecutionAttempt.
- Candidate selection/override “branches” in existing coordinator prose are candidate paths. They are not WorkOrder branch and do not create a WorkOrder logical identity unless PI later issues the explicit `fork` operation.
- WorkOrder branch is a domain identity, not a user-configurable pipeline branch/merge DSL. General coordinator pipeline branching/merging remains out of scope.

### Human-interaction layering — T-132 D-12 confirmed 2026-07-12
- T-124's four coordinator stop points are automation-run pauses: skeptic disposition other than `proceed`, strong-claim acceptance, dossier export and budget overrun.
- T-132's four experiment authority gates are durable domain decisions: WorkOrder admission, manual-promotion decision, external side effect/scope expansion and ValidationCycle closure.
- The sets are not equivalent. AuthorityGate is the only durable domain authorization; CoordinatorStop is a derived coordinator-local pause that references the owning Gate or next action and creates no second human-decision authority. T-124's four-item set is not product-global.
- When a Gate causes a Stop, the owning screen presents one user interaction and resumes automatically after the exact domain decision passes. UX may coalesce presentation without merging authority, weakening exact scope or adding a general policy/decision engine.
- WorkOrder admission is once per exact revision/cell-plan boundary. Draft exact-cell compilation/preview, EF parity validation, TaskSpec materialization, one Run freeze and cell-scoped ExecutionAttempt/retry/sync/collect/reconcile need no additional confirmation. Manual promotion is off the normal PI experiment path; external authorization occurs only for actual writes/scope expansion; ValidationCycle closure is one batch action that freezes every admitted branch's current head Run and exact state at one watermark, not every historical Run.
- D-17 Cycle readiness detection and Result Analysis proposal generation are automatic. The one owning Cycle-closure screen presents the exact-hash-bound proposal for confirmation/correction and writes the only scientific disposition; the flow does not add a proposal acknowledgement, packet-acceptance action or selected-exit confirmation.
- Golden scenarios classify each user-visible command once as InitiationAction, AuthorityAction, RecoveryAction or PlumbingAction. Happy-path counts must match the declared theoretical minimum; every extra action requires a named Gate/Stop/blocker reason.
- The T-124 reference full-paper scenario contains one bound project, one Cycle, one WorkOrder branch, one admitted revision, one policy-required strong claim and one dossier export, with no budget/scope expansion or manual promotion. Its exact target is `1/4/0/0`: one initiation; four authorities for revision admission, Cycle closure, strong-claim acceptance and dossier export; zero recovery; zero internal ID/hash/JSON or cross-module plumbing.
- For other fixtures, theoretical AuthorityAction count is exact-revision admissions + Cycle closures + policy-required strong-claim acceptances + dossier exports + real external-effect/scope-expansion authorizations + explicit manual promotions. Skeptic revise/fork preparation creates no Stop acknowledgement; only any resulting revision admission counts. N required cells, M valid technical Attempts, retryable failure, restart, duplicate submit, stale projection and semantic-index fallback add no user action.

## Coordinator 状态机（D1 已签核：自动化优先，异步推进）

```
created → advancing → waiting_review   (语义停驻：skeptic 非 proceed 处置等；override re-advance 可恢复)
                    → blocked          (slot blocked / admission rejected / provider 失败；可 re-advance 新 attempt)
                    → budget_exhausted (步数/provider 调用/墙钟任一上限；提额后可 re-advance)
                    → completed        (pipeline 终点)
                    → failed           (仅 coordinator 自身错误；不可重进，只能新建 run)
```

- 推进模型：advance 异步启动进程内推进循环（202 + 轮询），逐步持久化 + lease 心跳；**默认无人在环停驻**，人通过查询面事后确认与 override。崩溃后 lease 过期 → 显式 re-advance 从最后持久化步续推（v1 不自动续推）。
- step 记录：`(coordinator_run_id, step_index, slot_id, node_attempt_id, runtime_artifact_ref, admission_ref, decision_record, outcome, lease_heartbeat_at, started_at, finished_at)`。
- 推进规则：lane A 仅当上游 final artifact `admitted` 才进下一 slot（artifact 血缘耦合）；lane B（motive）以同一冻结 source bundle 锚耦合，无两步间 artifact 链校验（契约核实：`RunPaperImplementationMotiveEvolutionRuntimeRequest` 只要求领域锚 + `human_confirmation_policy_ref`）。slot 内置同 profile 单次技术重试不在 coordinator 层重复；slot blocked 即停驻，队列走既有 DecisionWorkQueue 机制（coordinator 不创建队列项）。
- 链内延续决策：`CandidateSelectionPolicy@v1` 纯函数选 reviewed candidate（决策记录入 step，可审计、可 override 重跑分支）；skeptic disposition 非 proceed → `waiting_review`。LLM 永不拥有延续决策。
- pipeline 声明：`PAPER_IMPLEMENTATION_COORDINATOR_PIPELINES` 代码级 const 注册表（lane A 四步 / lane B 两步 / board 单步），非用户可配置、无分支 DSL；通用 coordinator pipeline 多分支/合流语义留二期。该 DSL 问题与已经确认的 PI WorkOrder branch 领域身份无关。

## 共享面协调（与 T-127）

> T-123（topic-selection-productization-hardening）于 2026-06-16 收尾关闭归档；共享面（orchestrator / llm-gateway / model-profile registry / context-policy registry）**后续**改动的协调与 JD 互链对象转为 **T-127**（topic-selection-backend-hardening-and-expansion）。下表/下文涉及 T-123 的**前向协调 / 回归确认**均指 T-127；涉及 T-123 **已交付产出**（价格表 F-09、provider_overrides 类型化 F-07、D3 惯例、D1·D2 形态）的为历史引用，不变。

改动落点在共享代码的清单与归属：

| 共享面 | 本包动作 | 归属/机制 |
|---|---|---|
| `topic-selection-agent-orchestrator-service.ts`（压缩执行分支） | Phase 2.2 修改 | JD 联合决策先行；topic-selection 回归由 T-127 侧确认 |
| `topic-selection-context-policy-profile-registry-service.ts`（paper-implementation profile 注册段） | Phase 2.1 新增段 | 本包拥有新增段，registry 结构不改 |
| `topic-selection-model-profile-registry-service.ts`（manifest 导出） | Phase 1.1 新增导出 | 本包拥有导出；T-127 若消费需互链 |
| `llm-gateway.ts`（provider_overrides 类型化、价格表） | 仅消费 | T-123 拥有（F-07/F-09）；未就绪时本包登记降级 |

机制：任何共享面改动，两包 `03-implementation-notes.md` 各登记一条联合决策（编号 `JD-x`）互链，先登记后动手（沿 T-123 D3 惯例）。

## 关键风险

- **R1 压缩分支削弱 fail-closed**：恢复分支仅 `deterministic_structural`、质量门保留、最多一次尝试、压缩后仍超预算照旧 blocked；全部既有 blocked 负例保留并新增双分支用例。
- **R2 共享 orchestrator 改动波及 topic-selection**：JD 联合决策 + T-127 侧跑 topic-selection 全量回归后才合入；压缩分支带特性开关，默认行为可一键回到全 blocked。
- **R3 coordinator 成为第二权威入口**：ownership scan 扩展覆盖 coordinator 文件清单；controlled 路由不暴露任意 envelope/状态写；L5 必检断言 coordinator 推进过程零域权威写入。
- **R4 记忆污染证据链**：use-label 强制；admission 拒绝 memory ref 作 primary evidence；`durable_memory_as_standalone_evidence: false`；记忆写入面是确定性投影而非 LLM 输出。
- **R5 更名期间脚本断链**：原子更名（无 alias，依据"未上线不留双轨"原则）——同一 slice 内 grep 全量引用、runner/gate/package.json/meta 测试一次切换，更名后全量 stress/canary/gate 重跑作为收口证据；任何残留旧名由 meta 测试负例捕获。
- **R6 档位化引入运行时不确定性**：`ComplexityAssessment` 是纯函数且输入哈希进 envelope，admission 复算可验；同输入同档位是 L5 必检；LLM 永不拥有档位决策。
- **R7 无人值守推进失控**：自动化优先意味着没有人在环刹车——以步数/provider 调用数/墙钟三重预算上限 + `waiting_review` 语义停驻（skeptic 非 proceed 处置）+ lease 心跳兜底；任一越限即停驻，re-advance 是显式人为动作。
- **R8 selection policy 成为隐性科研决策**：候选自动选择实质影响科研路线——缓解：policy 版本化并进 SlotParameterManifest 对账，决策记录（输入信号 + 选中 key + policy 版本）入 step 可审计，人可事后 override 重跑其他候选分支（override 含 actor 记录）。
- **R9 protocol pass 被误当成 positive conclusion**：EF validation 只判测量/可比性/血缘是否合规；REU 不保存科研结论。唯一科研结论由 exact Cycle closure 写入，并由服务端从冻结 definitions 派生 selected exit。
- **R10 Result Analysis proposal 形成第二权威**：proposal/open packet 仅是 closure 输入，所有下游消费者必须重解 exact closed-Cycle ref/hash；ownership scan 拒绝 model/runtime/caller 直接写 assessment/exit 或独立 accepted packet。
- **R11 closure scope 漂移或历史数据隐式回流**：closure watermark 必须绑定 Cycle/branch-set/current-revision/head sequence 并以 CAS 关闭；非 head 历史默认排除，只有 exact `comparison_input_ref` 可进入比较血缘且不能扩展执行 scope；无 head branch、Cycle 全域 active real Attempt 或并发 scope/head drift 均以稳定 blocker fail closed，禁止靠重扫“最新”或全历史兜底。
