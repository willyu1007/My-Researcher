# T-132 Experiment Foundation Productization Closure — Roadmap

## Current execution state — 2026-07-26

- M0-M6 are complete. The final M6 convergence `t132-m6-release-20260725-v5` passed M6-01..M6-10, including fresh Pack B/Pack C/M5/M7 child gates, the disposable LIT-0204 typed-v2 import, OpenAPI/context verification, 5/5/5 workflow usage-fit, and the named-local `control_flow_validated_no_paper_evidence` closure with zero scientific writes.
- M7-I0..I3, the named-local M7 migration and QR hardening are complete; `t132-m7-offline-20260724-v3` passed M7-01..M7-15. Both real-provider capabilities remain default `false`, and no live provider job or scientific evidence has been created.
- The current frontier is M7-L1 material preparation and explicit authorization. OSS step A is complete for private `pea-m7-canary-6194-202607` in `cn-shanghai`, including SSE-OSS/AES256 and enabled 30-day `output/` cleanup; final bucket-bound RAM policy JSON/digests are prepared. RAM roles/policies, ACR, immutable mirror manifests, short-lived controller STS and final authorization do not yet exist.
- EF-P06, EF-P14, EF-P15 and the semantic half of EF-P21 remain open but are not M7-L1 prerequisites. They require explicit implementation or named-task transfer before T-132 archival; UI journey and semantic retrieval delivery remain outside T-132 under D-24.

### Historical delivery detail through 2026-07-25

- `Implementation Pack A — Phase 1 + D-19 minimal v2 spine` technical implementation is complete.
- Formal PI scope → named-local Pack A product landing is complete: active PaperProject `P313` reached an admitted ValidationCycle through normal PI routes, the exact two-cell v2 admission drained T1-T4 to one EF acknowledgement, and final verifier `formal-pi-scope-packa-product-20260715-verify-r5` passed read-only with zero forbidden writes.
- `Implementation Pack B — Phase 3 durable provider control and same-payload simulation` technical implementation and deep cleanup are complete; final disposable run `packb-deep-cleanup-final-20260715-r16` passed PB01-PB16, shared 6/6, backend 89/89, Pack A PostgreSQL 6/6 and Pack B PostgreSQL 7/7 with skip=0, marker reset verified, zero real-provider/scientific/legacy writes and successful container cleanup. Summary SHA-256 is `207450f7104b24542574f883ea2e851425e11412c03f21e65413444d3c2bfd6d`.
- Pack C C-EF/C-PI/cutover and final convergence are closed. Final host gate `packc-final-20260722-r5` passed PC01-PC20 with all forced relational lanes non-skipped; named-local hardening migration `20260720141000` was separately approved/applied with recovery and post-apply evidence. All new scientific-validation/closure capabilities remain default-off.
- Final source-backed D-19 run `d19-deep-cleanup-final-20260715-r19` passed source policy plus A01-A04/B01-B10 on disposable real PostgreSQL with `blockers=[]`, relational 6/6 and skip=0. Its three integration events were delivered with payload-only storage and both payload/envelope hashes verified; final acknowledgement and inbox outcomes were revalidated as exact typed receipts; reset marker assertions and cleanup passed. Summary SHA-256 is `9961eec956d216c65d1ac24be57214c05680dd7c1ae6d8ea510c8dbcef73a647`. r13 supplied an obsolete attestation path and correctly blocked while A/B and cleanup passed; it is invocation-level fail-closed evidence, not a product failure.
- Named local-development landing and deep cleanup are complete: migration `20260714210000_normalize_experiment_v2_event_payloads` (`37eed54494aa2dc246fe7d5a9b2de2a027474b416ada8a5f18ab4bc194a65f3a`) is applied only there and migration history is 62/62. Pack B product E1-E5 later populated only its six approved tables with the exact 2/2/12/8/2/2 census; all Pack A, PI, legacy and scientific protected digests remained unchanged.
- Named-local gate/app smoke `packb-deep-cleanup-final-local-20260714-r18` remains the exact source: 40/40 approved v2 tables, the same 257-row legacy digest, 238-table parity, all flags false and prohibited effects zero. Strict exact-keyset/redaction publication preserves source digests `37d262fa11fc45015d5e24320e963459034df77f2857074e3fea9476891de1b9` and `53e269275d5b082d2b1f82ad6b2ed47a324380470479de3b0598be6a62a16a0c`; republished durable SHAs are `9f4e0e5f81d4f127ac1cd5c956c639a8f89a9406d0af873e5d06d2d039f10e4e` and `bd702c6aca7104248839da1bb224e711d9eee64ddf6a98e4824f713b03e8eaad`, producer `982119a31989bbad1da51ae96892241bab90add1ee084031596f550350838c38`.
- Residual cleanup removed 14 zero-consumer shared row schemas/dead helpers while preserving owned interfaces and request/event/error/IO contracts. D-19 and Pack B share one database identity validator/marker assertion and one portable reviewed source digest with frozen slots; gate meta is 70/70, backend identity/guard is 10/10 with skip=0 and shared full is 330/330. Explicit frozen event/command/provider-control hash profiles and exact evidence keysets are mandatory. ProviderCommand binds the authoritative Attempt payload id/hash across read/claim/heartbeat/release/outcome/collection, and cancel-reason drift fails before write/transport. Pending 210000 apply still requires a named 0/0/0/0 event-table census; nonempty or partial targets fail closed without implied apply authorization. `.ai/.tmp` summaries are ephemeral and are deleted after durable publication.
- Zero-write Aliyun cloud-preflight supports the explicit v2 `public_resource` selector and is now closed. Formal r6 passed CP01-CP12 with 13 official-SDK reads, 108 visible/105 available CPU specs, 88-table parity and zero provider/CreateJob/database/scientific writes; durable closure is `artifacts/implementation/10-cloud-preflight-live-closure.md`.
- The roadmap remains `in-progress`: M0-M6 and M7-I0..I3 are verified. Live M7-L1/L2 execution and the four explicitly retained/transferred audit remainders above remain incomplete; D-24-defers UI/semantic delivery without weakening the agent/API first-release gate.
- M7 implementation preserves the frozen new-lineage design: the existing immutable simulation Run cannot be dispatched as real; a new PI WorkOrder revision binds an exact typed ExecutionBundle and creates a new Run through T1-T4. T-132 owns M7; T-106 consumed final hardened run `t132-m7-offline-20260724-v3` without adding provider authority. The next gate is separately authorized M7-L1 live diagnostic preparation/execution; any `CreateJob`, scientific enable or non-local rollout remains independently fenced.
- Source defaults remain off. Current named-local cutover is committed, while admission, simulation and cloud preflight are off. Historical enabled probes remain guard evidence only; no non-local database, provider, scientific path or product traffic was changed.
- Source-policy PASS does not mean full-corpus download/extraction, scientific alignment, provider execution, DB apply or cutover.
- Backend full suite after r19/r16 completed with 2,083 tests: 2,034 passed, 0 failed, 49 conditional database/provider-canary skips, 0 todo, duration `396225.938458ms`. Those skips are not database acceptance; the forced disposable PostgreSQL 6/6 and 7/7 lanes both have skip=0.

## Goal
- 在不推翻既有领域分层的前提下，把 ExperimentFoundation 产品化为 **PaperImplementation 的云实验控制面与可信实验事实边界**：PaperImplementation 发起并拥有论文项目、ValidationCycle、WorkOrder branch/revision、研究语义、项目级检索投影与证据使用决策，ExperimentFoundation 拥有实验资产、Recipe/TaskSpec、Run/ExecutionAttempt、provider 执行状态、科学验证与 EvidenceCandidate；双方共享精确范围身份而不复制语义，首版完成桌面控制流、零写云 preflight 和同 payload 模拟，不把本地模拟伪装成真实实验或科研证据。

## Product interaction target with PaperImplementation
- PaperImplementation 是面向论文目标的主流程和编排入口，负责回答“为什么做、在哪个项目/验证周期做、结果是否被论文采用”。
- ExperimentFoundation 是独立 bounded context 和实验事实权威，负责回答“用什么冻结输入、如何执行、执行结果是什么、是否满足声明的科学协议”。
- 对论文有约束力的实验 MUST 从 PI-owned ResearchWorkOrder/项目上下文进入 EF，或在独立探索后显式绑定到 ResearchWorkOrder 并重新通过身份、readiness、validation 和 project-scope 门。
- PI 发出的 submit/cancel/retry 是工作流意图；EF 校验并执行允许的状态转换，EF 的 run/attempt 状态是执行真相，PI 的 WorkOrder 状态是面向论文流程的派生/协调状态。
- PI 将 WorkOrder branch 作为稳定逻辑身份，将 revision 作为同一 branch 下的不可变精确方案；EF 对 `project/cycle/branch/revision/hash/run/attempt` 只做确定性绑定，不自行解释研究意图或解析“最新”。
- PI 维护 project-scoped、可重建的 experiment retrieval projection；它组合 PI 研究语义与 EF 结构化执行事实。全局层只提供 embedding/vector/index 技术能力，不拥有领域内容或状态转换。
- EF 只返回不可变、可追溯且带验证/审批资格的实验事实；PI 决定是否解释、支持 claim 或进入 dossier，但 PI 不得提高 EF 给出的证据等级或自行声明结果可信。
- PaperExperimentSidecar 和 PI RunEvidence 是从 EF 可信事实生成的项目级投影，不复制或替代 EF canonical records。

### Product surfaces
| Surface | Primary purpose | May do | Must not do |
|---|---|---|---|
| ExperimentFoundation asset/exploration workbench | 管理可复用资产、协议和独立探索实验 | 创建候选、准备 Recipe、执行 exploratory run、查看验证事实 | 未绑定 PI WorkOrder 就把 exploratory result 变成论文可信证据 |
| PaperImplementation experiment workflow | 围绕论文目标组织 ValidationCycle、WorkOrder、人工决策和证据消费 | 发起/控制实验意图、接收 EF 状态、消费可信证据 | 直接写 EF result/hash/readiness，或绕过 EF validation 提升证据等级 |

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation when signal is unknown: not-needed
- Host plan artifact path(s): (none)
- Requirements baseline: (none；本轮先建立 roadmap，随后基于本 roadmap 逐项对齐需求与设计决策)
- Merge method: set-union
- Conflict precedence: latest user-confirmed > requirement.md > host plan artifact > model inference
- Repository SSOT output: `dev-docs/active/experiment-foundation-productization-closure/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage
| Source | Path/reference | Used for | Trust level | Notes |
|---|---|---|---|---|
| User-confirmed instruction | 2026-07-10 discussion | create one task package for hardening/productization and explicitly define the PaperImplementation interaction goal | highest | 本包只规划，不实施产品代码 |
| Design review | 2026-07-10 repository review | integrity, scientific-validation, execution, cross-module and UX gaps | high | 已用现有测试与 readiness-after-mutation 反例交叉验证 |
| ExperimentFoundation parent | `dev-docs/active/experiment-foundation-v1/` | bounded-context ownership and unfinished product capabilities | high | T-043 remains the V1 concept umbrella |
| Existing hardening lanes | `dev-docs/active/experiment-foundation-real-interaction-hardening/` and `dev-docs/active/experiment-foundation-first-promotion-closure/` | deterministic runner, external-canary boundary and first real promotion evidence | high | T-106/T-131 are inputs, not duplicate productization owners |
| PaperImplementation lane | `dev-docs/active/paper-implementation-productization-hardening/` | downstream trust and coordination boundary | high | T-124 stays independently owned; T-132 only defines/implements the ExperimentFoundation side of the bridge |
| Current implementation | `packages/shared/`, `apps/backend/`, `apps/desktop/`, `prisma/`, `docs/context/` | executable constraints and structure-change preview | high | Current working tree contains unrelated in-progress T-124 changes; preserve them |
| Model inference | N/A | fill phase ordering, rollback and risk rows only | lowest | All unconfirmed product choices remain open decisions |

## Governance decision and lineage
- Decision: `NEW_TASK`
- Task: `T-132 experiment-foundation-productization-closure`
- Mapping: `M-001 > F-001 > R-012 > T-132`
- Rationale: T-043 is a broad V1 umbrella; T-106 is a hardening/canary lane; T-131 is one promotion closure; T-124 owns PaperImplementation. None owns the complete ExperimentFoundation productization closure found in the 2026-07-10 review.
- Relationship:
  - inherits domain boundaries from T-043;
  - consumes verified harnesses and lessons from T-090/T-103/T-106;
  - preserves T-131's first promoted protocol as catalog/provenance input, then uses an original-source typed v2/versioned re-import for executable golden-scenario preparation;
  - coordinates trusted evidence handoff with T-124 without absorbing its runtime/claim scope.
- Packaging rule: keep one task package with internal phases. Create child packages only after an explicit scope decision.

## Non-goals
- 不重建 ExperimentFoundation bounded context，也不把它并入 Literature 或 PaperImplementation。
- 不自建训练平台、GPU scheduler、容器编排平台或通用 LLMOps/HPO 系统。
- 不让 ExperimentFoundation 生成论文 claim、决定 dossier readiness 或接管 PaperImplementation 的 authority。
- 不让 PaperImplementation 直接写入 EF canonical records、run/result/validation 状态或自行提高证据资格。
- 不让未绑定 ResearchWorkOrder 的 EF exploratory run 直接进入论文可信证据链。
- 不调用 Aliyun `CreateJob`、不分配云算力、不实际训练，也不把只读 preflight 标记成 `cloud_training_passed` 或 `true_external_canary_passed`。
- 不把本地 LocalScript/fake-provider 模拟当作正式实验执行，也不让模拟输出生成 EvidenceCandidate、RunEvidenceUnit 或 dossier 证据。
- 不为首版建设通用本地训练、OCI container runner 或 OS-specific sandbox；真实科研执行属于后续云 provider gate。
- 不在 primary UX 中暴露 raw JSON、手工 hash/ref 拼装作为正常工作方式；高级诊断区可保留只读/受控入口。
- 不建设全局科研知识权威、通用跨域语义平台或由 EF 维护 PI 研究意图；首版检索能力保持 PI-owned、project-scoped 和可重建。
- 不让 EF、模型或人工为检索另写实验摘要；语义文档由已准入的 PI 规划字段确定性投影，语义相似度不拥有 branch head、执行、readiness 或 evidence authority。
- 不在未批准的情况下 apply Prisma migration、使用真实云凭据或提交真实外部训练任务。
- 不在本包创建时改变 T-043/T-106/T-124/T-131 的状态或归档位置。

## Open questions and recommended defaults
> 以下问题是完成 roadmap 后的逐条对齐入口；未拍板前不得进入对应实施切片。

| ID | Question | Recommended default | Risk if deferred |
|---|---|---|---|
| OQ-01 `[revised and confirmed 2026-07-12]` | 首个产品里程碑如何验证云实验流程而不实际训练？ | 首个发布门 = PI→EF→PI 确定性控制流模拟 + 精确 Aliyun payload + 真实只读 preflight + 同 payload fake-provider 生命周期；禁止 `CreateJob`、真实训练和模拟证据 minting | 已修订；允许 `workflow_simulation_passed` 与 `cloud_preflight_passed`，但不得声明实验/训练/科研证据已验证 |
| OQ-02 `[confirmed 2026-07-11]` | 冻结对象、版本与 readiness 如何演进？ | `logical_id + immutable revision_id + server canonical content_hash`；Draft 用 CAS；冻结修改创建新 revision；execution 引用 revision/hash；readiness 绑定完整 dependency manifest | 已确认；进入 M1 实施与对抗验证 |
| OQ-03a `[confirmed 2026-07-11]` | 什么时候固定要求人工介入或授权？ | 一个已批准 WorkOrder/`approved_plan_hash` + 四个固定 Gate：WorkOrder 准入、manual-promotion 决策、外部副作用/范围扩大、ValidationCycle 收口；不引入 `DecisionAuthorityManifest` 或通用 Policy Engine | 已确认；固定状态转换触发，不依赖模型判断价值或置信度 |
| OQ-03b `[confirmed 2026-07-11]` | 首版是否保留 `accepted_partial`？ | 删除 `accepted_partial`、partial 审批和 partial evidence 等级；不完整输出只作为 ExecutionAttempt 诊断材料，只有完整且 validation passed 的结果可生成 EvidenceCandidate | 已确认；API/legacy/验证均按 fail-closed 收口 |
| OQ-03c `[confirmed 2026-07-11]` | `manual_promote` 应是例外豁免，还是仅表示人工目录收录？ | 仅表示人工目录收录：不豁免确定性资格阻断、不赋予 executable readiness、不提升 evidence trust；采用最小 typed decision | 已确认；catalog admission 与 readiness/evidence qualification 严格分离 |
| OQ-04 `[confirmed 2026-07-11]` | Promotion 是否负责生成 canonical asset？ | 是；服务端在一个幂等事务内校验 Candidate revision/hash、创建或复用内容完全一致的 canonical revision、写 decision、终结 Candidate 并写 outbox；调用方不得提供 canonical ref | 已确认；readiness/evidence/external side effects 保持事务外独立裁决 |
| OQ-05 `[confirmed 2026-07-11]` | 哪个入口有权 mint trusted RunEvidence？ | EF 只生成完整验证通过的 EvidenceCandidate；PI-owned Evidence Trust Gateway 是 RunEvidenceUnit 的唯一 writer，live/monitor/recovery/manual attachment 全部复用服务端解析规则；失败/取消/不完整 run 只进生命周期台账/Sidecar | 已确认；调用方不得声明 trusted status/hash/candidate 集合，Sidecar 不是信任源 |
| OQ-06 `[confirmed 2026-07-11]` | PaperProject 尚未创建时是否允许 PI bootstrap？ | 不允许；PaperProjectIntake 已完成且 bridge 同时具有 `paper_project_intake_ref` 与 `target_paper_project_ref` 是 PI bootstrap 的确定性前置条件。未绑定 bridge fail closed 且不创建 ImplementationProject | 已确认；正常产品链不建设 late binding/reconciler，既有空绑定交 D-08 |
| OQ-07 `[confirmed 2026-07-12]` | LocalScript 是否属于首版正式实验执行？ | 不属于；正式实验 cloud-only。LocalScript 与 fake provider 仅用于 dev/test 和隔离的 workflow simulation，禁止进入正式 result/validation/evidence 路径；首版不建设本地 container/worker 隔离平台 | 已确认；后续真实云执行才有资格产生科研证据 |
| OQ-08 `[confirmed 2026-07-12]` | 既有 v1 记录如何处理？ | 原行留在数据库且只读；缺少受支持 v2 identity/schema 即机械判为 `LEGACY_RECORD_NOT_ELIGIBLE`。仅 diagnostics/admin 可按原字段读取，不重验、不迁移、不补摘要/原因、不进入 EF v2 选择/执行/证据或 PI | 已确认；需要内容时从原始来源重新导入或未来重新实验，旧记录本身不流转 |
| OQ-09 `[confirmed 2026-07-11]` | EF 独立探索实验如何与论文实施衔接？ | 允许独立探索；若要服务论文，必须显式绑定 PI ResearchWorkOrder，并经同一 trust gateway 重新验证，不允许“事后贴 ref 即可信” | 已确认；进入 Phase 4/5 实施与验证 |
| OQ-10 `[confirmed 2026-07-12]` | PI 与 EF 如何统一理解实验迭代，并由谁维护检索与语义信息？ | PI owns ValidationCycle、WorkOrder branch/revision 和 `branch_intent/expected_effect/difference_from_parent`；EF owns Run/TaskSpec/ExecutionAttempt/result facts 并绑定精确 scope；PI maintains project-scoped retrieval projection，global 仅提供通用检索技术；结构化过滤先于语义排序且命中必须回源 exact revision/hash | 已确认；首版只索引 ValidationCycle 与 branch head，历史 v2 revision/run 用结构化 lineage 查询，索引不可成为第三事实源 |
| OQ-11 `[confirmed 2026-07-12; Run row refined by OQ-13a]` | 哪些变化属于同一 WorkOrder branch 的新 revision，哪些必须 fork 新 branch？ | 不判断“变化大小”：准入前改同 draft；同 cell/TaskSpec 技术重试建 ExecutionAttempt；一个已准入 revision 的完整预声明 cell manifest 物化为唯一 batch Run；branch semantic-frame hash 不变而 exact plan/cell manifest 改变则建 revision 并重新准入；任一 branch semantic field/parent-fork relation 改变则显式 fork；Cycle 问题/决策出口改变则建新 Cycle | 已确认；PI 明确调用 `revise | fork`，服务端只比较冻结字段/hash；既有/运行中 Run 永不重绑；D-13a 显式取代“单 seed/参数点各建 Run”的临时表述 |
| OQ-12 `[confirmed 2026-07-12]` | T-124 的 PI coordinator stop points 与 T-132 的 experiment authority gates 如何形成尽可能少的产品人工干预？ | 两层模型：AuthorityGate 是唯一 durable authorization，CoordinatorStop 只是 derived pause；T-124 四点是 coordinator-local。Stop 由 Gate 引起时 owning screen 一次操作、写/复用必要 domain record 后自动续推；in-bound Run/cell Attempt/retry/reconcile 零确认；manual promotion 不进正常 PI 路径，external gate 只在真实写/扩域触发，Cycle closure 一次批量处理 | 已确认并量化：固定首版场景为 1 project / 1 Cycle / 1 branch / 1 admitted revision / 1 batch Run / N required cells；目标为 1 InitiationAction + 2 AuthorityActions + 0 RecoveryActions + 0 PlumbingActions，正常路径不得出现额外停驻 |
| OQ-13a `[confirmed 2026-07-12]` | 一个 WorkOrder revision 下的 Run 代表单个 seed/参数点还是完整预声明批次？ | paper-bound WorkOrder revision 成功准备后只物化一个 immutable Run；Run 内含 1..N required cells，每个 cell 冻结 key/seed/repeat/exact params/TaskSpec ref+hash；技术重试只新增 cell-scoped ExecutionAttempt | 已确认；不存在 RunSet/RunGroup、optional cell、运行中追加或动态 HPO；任一科学 cell 变化必须新 revision/re-admission，全部 required cells 完整后才能做 Run-level validation/evidence qualification |
| OQ-13b `[confirmed 2026-07-12]` | 唯一 batch Run 在什么时点、通过什么显式事件推进 per-branch head？ | EF 原子冻结 Run/manifest 并写 `RunManifestFrozen` outbox；PI 以 branch-local monotonic revision sequence 校验/CAS head 并写 `BranchHeadAdvanced`；EF 收到 durable exact-scope 回执后才允许首 Attempt/dispatch | 已确认；head 表示最新冻结执行谱系，不表示成功/最佳/已采纳。失败/取消仍保持 head，不自动回退；stale 未 dispatch Run 只留历史，已执行旧 Run 不自动取消 |
| OQ-14 `[confirmed 2026-07-12; post-closure boundary refined by OQ-18]` | 控制流模拟完成后，Run/ValidationCycle 应如何表达状态而不伪装成科学执行？ | 不创建 SimulationRun；同一 immutable Run 的 simulation Attempt 可终态，但 Run/cell 科学状态保持 `not_started`。PI 以 no-evidence closure、null disposition/selected exit 收口 | 已确认；Cycle 仍 open 时未来 real Attempt 才可复用 exact Run/cell；closure 后该 Run 只读，后续实验进入 successor Cycle/new Run lineage |
| OQ-15 `[confirmed 2026-07-12]` | WorkOrder admission 应冻结参数范围，还是冻结可直接执行的精确 cell 计划？ | 首版只允许 admission 前由 PI draft 流程自动编译、规范化并持久化 fully expanded ordered `exact_cell_plan[1..N]`；每个 cell 固定 server-derived key、seed/repeat、exact params 和 required result contract，`cell_plan_hash` 纳入 `approved_plan_hash`。ranges/grid/seed-count 仅为 non-authoritative authoring input；EF admission 后只逐项校验并物化 Recipe/TaskSpec/payload/Run binding | 已确认；generator-only admission、post-admission sampling/scientific-field defaults/add/drop/substitute cell 与 generator registry/DSL 均不进首版。TaskSpec refs/hashes 由 EF 在 admission 后 resolve/create-or-exact-reuse 并冻结，不形成 PI→EF 循环依赖 |
| OQ-16 `[confirmed 2026-07-12; scope refined by OQ-18]` | failed/cancelled/incomplete Run 应创建 trusted RunEvidenceUnit 参与 dossier 对账，还是只进入 ValidationCycle closure？ | REU 只表示 complete protocol-compliant validation-passed EvidenceCandidate；execution accounting 只进入 D-18 current-effective closure snapshot，Sidecar 仅投影，dossier 只消费显式 closed-Cycle refs/hashes | 已确认；取代 failed/cancelled REU 与 project-wide/history scan；non-head 历史默认不进入 closure |
| OQ-17 `[confirmed 2026-07-12]` | `protocol-compliant` 如何成为可执行边界，科研结论由什么对象触发、赋值和消费？ | EF v2 EvaluationProtocol 以 canonical ordered typed required rules 为唯一执行语义，代码内封闭 capability map 对未知规则返回 `UNSUPPORTED_RULE` 并在 Run freeze/dispatch 前阻断；ScientificValidation 对完整 exact batch Run 只判 `passed | failed | unsupported` 并由唯一 writer 生成 EvidenceCandidate。PI Result Analysis 自动形成绑定 exact Cycle/snapshot/evidence hashes 的结论提案；现有 ValidationCycle closure 是唯一科研结论 authority，在既有一次 closure action 中写 `positive | negative | inconclusive | null` 与 closure snapshot/hash，并由服务端从冻结的 exit definitions 派生 selected exit；ResultInterpretationPacket/Claim/Dossier 只消费 closed Cycle | 已确认；不新增 ScientificConclusion aggregate、统计 DSL/plugin、人工 waiver、额外确认或 REU 科研状态。首版只支持 metric/artifact typed contracts，加上不可配置的 exact-cell/seed/repeat/lineage/real-provider envelope；active comparison/statistical/threshold/fairness/derived rules 未实现时 fail closed。T-131 v1-cpu-adapter 保持 promoted catalog 历史但不可直接获得 executable/evidence readiness，须从原始来源建立新的 typed v2 revision |
| OQ-18 `[confirmed 2026-07-13]` | Cycle closure 应冻结全部历史 Run，还是关闭时当前有效范围？ | 以 CAS `closure_watermark` 冻结所有 admitted branch 的 current revision + non-null matching effective head Run/cells/all Attempts；no-head candidate 返回 `BRANCH_HEAD_NOT_FROZEN`；non-head 历史只读排除，旧 v2 比较必须显式 ref/hash；Cycle 全域 active real Attempt 阻塞，scope drift 零写重建，closed Cycle 禁止新增执行 lineage | 已确认；closure 是当前科研决策快照，不是历史归档；Packet post-closure 且不进 hash，后续实验进入 successor Cycle |
| OQ-19 `[confirmed 2026-07-13]` | 首个 cross-module implementation acceptance 应是 EF trust kernel、最小 PI↔EF spine，还是完整 control-plane closure？ | Phase 1 identity/readiness 先作为独立 entry gate 关闭；D-19 从已绑定 Cycle + real v2-ready assets 开始，走 two-cell revision → exactly one VersionLock/RunRecipe + two TaskSpecs → one Run/manifest → PI head/EF durable ack | 已确认；终点零 Attempt/provider/result/validation/evidence/closure/UI/search/legacy writes；pre-bound fixture 不替代最终 bootstrap，D-18 blocker 不变 |
| OQ-20 `[confirmed 2026-07-13]` | D-19 的 PI/EF transaction、outbox/inbox、idempotency/conflict 与 Unit-of-Work 边界如何冻结？ | 成功路径固定四个 domain-owned authority commits：PI admission/`WorkOrderRevisionAdmitted` outbox → EF inbox/materialization/Run/`RunManifestFrozen` outbox → PI inbox/head CAS/`BranchHeadAdvanced` outbox → EF inbox/sole ack；same DB 不合并 | 已确认；三事件、atomic inbox/domain/outbox、exact replay/payload+sequence conflict/crash recovery；relay bookkeeping 非权威，无共享写表/repository/2PC/ack mirror |
| OQ-21 `[confirmed 2026-07-13]` | D-19/D-20 应落到独立 additive PI/EF v2 canonical tables，还是扩展现有 singular WorkOrder 与 generic EF Record？ | 独立 domain-owned typed v2 table families + dedicated default-off admission routing；旧表原样 diagnostics/admin existing-field read-only，不 backfill/dual-read/write/fallback；D-19 后新 intake 单切 v2，disable 时 drain committed saga | 已确认；rollback 停新 intake、保留 v2 审计且不恢复 legacy writer；对象族责任由 D-22 进一步收口为首批最小 pack |
| OQ-22 `[confirmed 2026-07-13]` | 首次 v2 migration 应一次建设完整未来模型，还是只建设 Phase 1 准入依赖与 D-19 spine 的最小 schema pack？ | 只建最小 additive pack：关系字段承载 identity/unique/CAS/order/binding/event invariant，具名 typed scientific snapshot 用 server-hashed canonical JSON；同域 relation/FK、跨域 exact scalar refs 无 FK；不提前建 Attempt/provider/result/validation/evidence/closure/UI/search/legacy-mapping 表 | 已确认；D-22 不冻结 Prisma 名/DDL、不授权实施或 DB apply；下一步产出 schema/invariant matrix 并做 Implementation Pack A readiness/authorization review，不默认新增 OQ-23 |

OQ-01 through OQ-22 complete the current product/domain decision series. A new OQ number is introduced only if the implementation matrix exposes a genuine product/domain fork; otherwise D-20 through D-22 violations are blockers.

## Merge decisions and conflict log
| ID | Topic | Conflicting inputs | Chosen decision | Precedence reason | Follow-up |
|---|---|---|---|---|---|
| C1 | Reuse vs new task | T-043/T-106/T-131 exist, but none owns all review findings | create T-132 | user explicitly requested a productization task package after the review | governance sync and map to R-012 |
| C2 | Package granularity | many modules vs user request for one package | one package with internal milestones | latest user instruction | revisit only if an independently releasable scope emerges |
| C3 | Productization order | existing work is organized by modules/adapters | order by trust dependency: identity → scientific decision → execution → evidence handoff → UX | review evidence shows later layers cannot repair an untrusted foundation | enforce phase entry/exit gates |
| C4 | Provider priority | trusted local execution vs cloud-first control-plane validation | desktop control-flow simulation plus Aliyun zero-write preflight and same-payload fake lifecycle; no local or cloud training and no simulated evidence | user revised D-01 on 2026-07-12 after confirming experiments are cloud-executed | implement control-plane proof without claiming experiment/evidence validation |
| C5 | Current dirty tree | T-124 is changing shared PaperImplementation code | new docs and generated governance only during T-132 creation | workspace safety and task ownership | rebase execution baseline after T-124 stabilizes |
| C6 | EF and PI product relationship | independent EF workbench vs paper-bound product flow | EF remains independent for assets/exploration; PI is the orchestration shell for paper-bound experiments; trust crosses only through governed command/evidence contracts | user confirmed D-09 on 2026-07-11 | implement and verify in Phase 4/5 |
| C7 | Frozen identity model | same-id overwrite vs content-hash-only vs logical identity with immutable revisions | stable `logical_id`, server-issued immutable `revision_id`, canonical semantic `content_hash`; drafts use CAS and frozen changes create new revisions | user confirmed D-02 on 2026-07-11 | implement and verify in Phase 1 |
| C8 | Human gate model | model-detected research judgment vs per-field authority manifest vs fixed checkpoints | approved WorkOrder hash plus four fixed human gates; deterministic errors block directly; no general DecisionAuthorityManifest/Policy Engine | user rejected subjective/over-complex gates and confirmed the simplified model on 2026-07-11 | implement and verify fixed transitions without a second policy platform |
| C9 | Partial-result handling | approvable partial evidence vs diagnostic-only incomplete output | remove `accepted_partial`; retain incomplete logs/metrics/artifacts under ExecutionAttempt for diagnosis/retry only; EvidenceCandidate requires complete passed validation | user confirmed the robustness-first scope cut on 2026-07-11 | remove current API/state branch and verify no evidence leak |
| C10 | Manual-promotion semantics | exception waiver vs human catalog curation | `manual_promote` only admits an eligible Candidate into the canonical catalog; `manual_promote` cannot waive blockers, grant readiness or increase evidence trust | user confirmed the catalog-only model on 2026-07-11 | implement catalog eligibility together with the D-04 atomic boundary |
| C11 | Promotion/canonicalization atomicity | caller-prewritten canonical refs vs server-owned atomic canonicalization | exact Candidate revision has one terminal decision; `promote` atomically creates/reuses the exact canonical revision, records `created | reused`, updates Candidate and inserts outbox; `reject` creates no canonical revision | user confirmed D-04 on 2026-07-11 | implement crash/idempotency/conflict verification in Phase 2 |
| C12 | EF→PI trusted evidence ingress | each adapter/monitor writes evidence vs one PI authority gateway | EF qualifies reusable EvidenceCandidate; one PI-owned gateway server-resolves EF lineage and alone writes RunEvidenceUnit/TraceManifest/outbox; D-16 places diagnostic terminal execution in the immutable Cycle closure snapshot with Sidecar display only | user confirmed D-05 on 2026-07-11, refined by D-16 on 2026-07-12 | remove direct/caller-declared minting paths and verify repository/accounting ownership in Phase 4 |
| C13 | PaperProject/PI bootstrap order | first-class late binding vs enforce intended product sequence | require PaperProjectIntake and both bridge binding refs before PI bootstrap; unbound bridge returns a deterministic next-action blocker and creates no PI state | user confirmed the simpler precondition model on 2026-07-11 | route existing null-bound records to D-08 legacy handling |
| C14 | Local execution role | containerized/restricted trusted local runner vs cloud-only formal execution | formal experiments are cloud-only; LocalScript/fake provider are explicit non-production simulators, cannot mint result validation/evidence, and do not justify a local isolation platform | user confirmed the scope correction on 2026-07-12 | defer real result/evidence closure to the later real-provider gate |
| C15 | Legacy-data handling | revalidation/comparability/archive product vs inert database retention | keep existing rows unchanged and read-only; one mechanical ineligibility code, diagnostics/admin reads only, no summaries/reasons/UI/PI integration or trust migration | user chose robustness over limited historical comparison value on 2026-07-12 | close all legacy writers and verify exclusion from every v2/product path |
| C16 | Experiment iteration and retrieval ownership | EF-owned search vs global domain index vs PI-owned projection over shared facts | WorkOrder branch is the PI-owned logical identity, revision is an immutable exact plan within the branch, EF binds exact scope refs and owns execution facts, and PI owns a project-scoped rebuildable retrieval projection; global services provide technical indexing only | user confirmed the robustness-first boundary on 2026-07-12 | implement confirmed D-11/D-13a/D-13b scope, head and retrieval semantics in Phase 4/5 |
| C17 | Branch versus revision classification | semantic-distance/model judgment vs deterministic object operations | PI declares `revise | fork`; unchanged frozen branch-frame hash permits a new revision/re-admission, any semantic-frame or parent/fork change requires a new branch; draft/Attempt/Run/Cycle cases map mechanically and existing Runs never rebind | user confirmed the executable boundary on 2026-07-12 | retain D-11 boundaries and apply D-13a/D-13b batch-Run/head invariants in shared PI/EF implementation |
| C18 | Human-interaction minimization | one global gate list vs independent stops/gates vs two-layer model | keep domain AuthorityGate as the only durable decision authority; represent CoordinatorStop as a derived pause, coalesce overlap into one owning-screen action and auto-resume; measure user actions rather than internal record count | user confirmed two layers, minimum-intervention priority and the scenario-based action budget on 2026-07-12 | implement the fixed 1/2/0/0 first-release target plus scalable gate-count acceptance without a global policy engine |
| C19 | Run scientific granularity | one Run per seed/parameter cell vs batch Run plus no aggregator vs separate RunSet/RunGroup | one paper-bound WorkOrder revision may freeze at most one Run; that Run is the immutable ordered manifest of 1..N required scientific cells, and technical retries are cell-scoped Attempts | user selected the batch model on 2026-07-12 to preserve completeness and avoid a new cross-module aggregate | implement with D-13b sequence-fenced head acknowledgement before first dispatch |
| C20 | Branch-head advancement | manifest freeze vs first dispatch vs completion vs manual/result selection | EF publishes frozen Run identity; PI alone advances the per-branch head using immutable revision sequence fencing, then acknowledges before EF dispatch. Failed/cancelled latest Run remains head | user confirmed the lineage-not-best-result meaning on 2026-07-12; transaction boundary refined by D-20 | implement outbox/inbox replay and deterministic stale/conflict handling; no cross-domain authority transaction regardless of physical database and no new human gate |
| C21 | Simulation versus scientific state | Run-level simulation terminality vs separate SimulationRun vs Attempt-level simulation on the same Run | keep one immutable Run; simulation terminates only its ExecutionAttempts and a rebuildable workflow projection, while scientific Run/cell status stays `not_started`; PI may close the Cycle as control-flow validated with no paper evidence | user confirmed two orthogonal state axes on 2026-07-12 | verify the closure snapshot references exact Run/Attempts without creating or upgrading scientific records |
| C22 | Admission cell-plan authority | approve ranges/generator and expand later vs approve an explicit cell list | PI compiles and persists the canonical ordered exact scientific cells before the one WorkOrder admission; EF receives that immutable authority and may only validate/materialize a one-to-one Run-cell binding | user chose the explicit-plan robustness model on 2026-07-12 | embed the plan in the WorkOrder revision, bind `cell_plan_hash` into `approved_plan_hash`, reject every extra/missing/drifted Run cell and add no per-cell user action |
| C23 | Scientific evidence versus execution accounting | trusted failed/cancelled REU and project-wide scan vs closed-Cycle accounting | only complete passed EvidenceCandidate may produce REU; failed/cancelled/incomplete effective-head execution is frozen in the D-18 snapshot, non-head history is excluded, and later negative/inconclusive disposition remains outside REU | user confirmed D-16, scope refined by D-18 | atomically replace failed-REU/project/history scans; Sidecar stays display-only and dossier consumes exact closed-Cycle refs |
| C24 | Executable protocol and scientific-conclusion authority | opaque protocol JSON + heuristic per-job validation + caller/model/REU/Cycle outcome writers vs a typed fail-closed validator and one PI conclusion authority | EF alone executes typed required rules over the exact batch Run and qualifies evidence; Result Analysis produces a proposal only; the existing PI ValidationCycle closure alone writes the authoritative scientific disposition and derives the selected exit; downstream consumers require that exact closed Cycle | user confirmed D-17 on 2026-07-12 after requesting explicit trigger/writer/consumer ownership | implement one atomic semantic cutover: close generic trust writers, caller-authored `cycle_assessment`/`decision_exit`, negative/inconclusive REU status and direct result-analysis packet authority; preserve one existing Cycle-closure action and no second conclusion object |
| C25 | ValidationCycle closure membership | full historical Run inventory vs current-effective branch heads | CAS-freeze every admitted branch's current revision plus non-null matching effective head/cells/Attempts; no-head blocks; exclude non-head history, use explicit comparison refs, block on every Cycle-wide active real Attempt and seal closed Cycle | user confirmed D-18 on 2026-07-13 | one shared watermark/blocker contract; no project/history scan or reopened Cycle path |
| C26 | first implementation acceptance boundary | EF-only trust work vs full control-plane vs minimal joint spine | one capability-gated two-cell admission→materialization→Run manifest→PI head→EF durable-ack slice through real persistence/replay, with zero Attempt/provider/scientific/closure/UI/legacy work | user confirmed D-19 on 2026-07-13 | D-20 through D-22 now constrain transaction, storage and minimal first-pack boundaries; complete the implementation-readiness matrix |
| C27 | cross-domain transaction boundary | one same-DB transaction vs distributed/2PC vs domain-local inbox/outbox saga | four domain-owned authority commits and three integration events; each inbox/domain/outbox outcome is local-atomic, EF's final inbox receipt is the sole ack and relay markers are infrastructure-only | user confirmed D-20 on 2026-07-13 | add real-Postgres crash/idempotency/conflict and repository-ownership gates; no shared write table/repository or ack mirror |
| C28 | v2 persistence and cutover | extend legacy tables vs dual-write migration vs additive typed v2 families | independent PI/EF v2 tables behind default-off new-intake routing; unchanged diagnostics-only legacy rows; explicit post-D-19 v2 product entrance and no fallback | user confirmed D-21 on 2026-07-13 | capability-off zero-write, legacy digest, writer closure and saga-drain rollback gates remain mandatory |
| C29 | minimal first-migration schema | future-complete model vs generic payload authority vs finite Phase 1 + D-19 vertical pack | relations own identity/CAS/order/bindings/events; named typed server-hashed snapshots own scientific values; same-domain relations only and zero future-phase/legacy-mapping persistence | user confirmed D-22 on 2026-07-13 | finish exact asset-kind/model/constraint/error/test matrix and lock current schema/writer population before implementation authorization |

## Scope and impact
- Affected areas/modules:
  - ExperimentFoundation shared contracts and schema tests;
  - backend record/readiness/promotion/preparation/execution/validation services and repositories;
  - Prisma persistence for immutable identity, approvals and durable attempts;
  - PaperImplementation experiment handoff, WorkOrder broker and PaperExperimentSidecar projection;
  - PaperImplementation Cycle-ready trigger, Result Analysis proposal, ValidationCycle closure assessment/derived exit and post-closure ResultInterpretationPacket/Claim/Dossier consumers;
  - PaperImplementation WorkOrder branch/revision scope contract and project-scoped experiment retrieval projection;
  - domain-neutral embedding/vector/index adapters shared as infrastructure without reusing Literature domain tables/services;
  - desktop project-scoped ExperimentFoundation workflow;
  - OpenAPI, API index, context registry, process contracts and product gates.
- External interfaces/APIs:
  - typed commands for candidate import, promotion, version lock, RunRecipe generation and TaskSpec materialization;
  - durable provider-control submit/sync/collect/cancel/reconcile and recovery semantics;
  - Aliyun `CreateJob` request materialization, offline validation and canonical/redacted payload evidence;
  - read-only Aliyun workspace/resource preflight under an explicit List/Get API allowlist and credentials lacking `paidlc:CreateJob`;
  - same-payload fake-provider submit/sync/cancel/collect/reconcile simulation;
  - PI→EF admitted experiment-intent/work-order command boundary;
  - EF→PI lifecycle projection and single trusted-evidence handoff boundary;
  - shared exact scope refs for ImplementationProject/ValidationCycle/WorkOrder branch/revision/hash/Run/ExecutionAttempt;
  - project-scoped structured lineage query plus semantic discovery endpoint that always resolves canonical PI/EF records before use;
  - standalone EF exploration → PI WorkOrder attachment/revalidation boundary as confirmed by OQ-09.
- Data/storage impact:
  - additive identity fields for logical id, immutable revision id, schema version, hash profile and canonical content hash;
  - immutable readiness attestations containing target revision/hash and a deterministically ordered dependency manifest/hash;
  - append-only lifecycle events plus mutable current-state projections for evolving operational entities such as ExternalJob;
  - likely additive schema for typed manual-promotion decisions, execution attempts and collection attempts;
  - additive PI-owned WorkOrder branch/revision identities, explicit branch-head projection and rebuildable retrieval documents keyed by source revision/hash, projection schema and embedding profile;
  - migration must follow expand v2 path → verify legacy read/v2 write separation → cut over → contract legacy writes, with no legacy-row identity/hash backfill and DB apply separately approved through `sync-db-schema-from-code`.
- Backward compatibility:
  - existing generic record reads remain available during migration;
  - frozen writes and trusted-evidence minting move behind new typed commands/gates before legacy paths are disabled;
  - no destructive data rewrite until replay and golden-scenario verification pass.

## Project structure change preview
The structure preview is a non-binding, early hypothesis; execution may refine landing points after Phase 0.

### Existing areas likely to change
- Modify:
  - `packages/shared/src/research-lifecycle/`
  - `apps/backend/src/services/`
  - `apps/backend/src/repositories/`
  - `apps/backend/src/routes/`
  - `apps/desktop/src/renderer/modules/experiment-foundation/`
  - `apps/desktop/src/renderer/modules/paper-implementation/`
  - `prisma/`
  - `docs/context/`
  - `.ai/scripts/`
- Delete:
  - no deletion is planned before compatibility and usage evidence exists
- Move/Rename:
  - (none currently)

### New additions (landing points)
- New module(s), exact files TBD after alignment:
  - ExperimentFoundation trust/identity kernel
  - scientific validation and exception-approval service
  - experiment preparation/application service
  - durable provider-control/collection attempt coordinator
  - WorkOrder broker and PaperExperimentSidecar writer
  - project-scoped experiment read model
  - PI-owned experiment retrieval projection plus domain-neutral embedding/vector adapter
- New interface(s)/API(s):
  - typed preparation commands
  - version-bound readiness and recursive dependency verification
  - single trusted-evidence gateway
  - shared experiment-scope contract and hybrid structured/semantic retrieval port
  - productization gate runner with machine-readable evidence

## Milestones
| Milestone | Outcome | Exit criteria |
|---|---|---|
| M0 Decision and baseline freeze | OQ-01 through OQ-22 product/implementation-boundary decisions and the minimal first-migration responsibility model are signed | OQ-01 through OQ-22 are confirmed; Phase 0 must complete the schema/invariant matrix, current writer/schema population lock and implementation-authorization review |
| M1 Trust substrate | minimal real v2 identities, immutable revisions, hashes and recursive readiness required by D-19 | fixture assets use real persistence/readiness with no caller hashes or legacy trust upgrade; M1 is not accepted as a standalone product slice |
| M2 D-19 shared scope and Run spine | two-cell PI revision delegates exact cells through typed preparation into one Run/manifest and sequence-fenced head/ack | D-19 proves one revision/Run/head/ack, replay/crash/conflict convergence and zero Attempt/provider/result/evidence/closure writes |
| M3 Durable provider control plane | exact locked payload drives crash-safe same-payload simulation | submit/sync/cancel/collect/reconcile survives restart/retry, changes only Attempt/control projection and cannot mint scientific evidence |
| M4 Scientific/trusted closure | exact-batch validation/gateway contracts plus one D-18 Cycle closure authority | fixture-only scientific conformance is production-disabled; release performs only CAS-fenced no-evidence closure with zero real result/EvidenceCandidate/REU |
| M5 Agent-first researcher workflow (D-24 rescope) | project/cycle/branch-head scoped lineage read model, typed action surface and workflow automation consumable by an LLM agent or any future UI; UI product journey and semantic discovery deferred out of T-132 | primary golden flow needs no manual ref/hash/JSON through typed APIs; structured queries are the sole retrieval authority; automation (terminal sync/collect, Cycle-ready, proposals) verified at service/API level |
| M6 Release closure + cloud preflight | Postgres, fault injection, workflow usage-fit on the actual interaction surface (agent/API; D-24), docs and zero-write Aliyun preflight gates are green | control-plane scenario traces PI intent → typed v2 RAGPerf protocol → TaskSpec/payload → simulated lifecycle/Sidecar; T-131 v1 remains catalog history; exact cloud payload/read-only checks/fake lifecycle pass; zero writes and zero simulated evidence are proven |
| M7 Real provider execution and evidence closure (deferred) | optional minimum Aliyun execution behind explicit budget/credential/data/cleanup approval | outside the first release door; only M7 or another verified real provider may close real result, EvidenceCandidate and RunEvidenceUnit production claims |

Current milestone state: M0-M6 are complete — M5 as narrowed by D-24 (agent-first workflow slice; `t132-m5-agent-20260724-v1`) and M6 release closure converged (`t132-m6-release-20260725-v5`, statuses `workflow_simulation_passed`/`cloud_preflight_passed`, golden no-evidence closure live on named-local, T-131 consumption closed). M7-I0..I3 default-off implementation is verified with QR hardening; only M7-L1/L2 live execution remains, behind its separate authorizations.

## Step-by-step plan

### Phase 0 — Decisions, invariant inventory and migration plan
- Objective: freeze product semantics before changing contracts or storage.
- Deliverables:
  - revised D-01 plus confirmed D-02 through D-22 recorded in `03-implementation-notes.md`; D-12 includes the fixed first-release 1/2/0/0 action target;
  - approved WorkOrder core fields, embedded non-empty/bounded ordered `exact_cell_plan`, canonical `cell_plan_hash` and `approved_plan_hash` composition contract;
  - shared PI→EF scope identity and PI-owned retrieval authority contract, while keeping PI WorkOrder revisions distinct from EF generic-record revisions and using D-11's deterministic `revise | fork` boundary;
  - minimal PI branch semantic frame (`parent_branch_id`, optional forked-from Run, `branch_intent`, `expected_effect`, `difference_from_parent`) frozen through WorkOrder admission and included in `approved_plan_hash`;
  - deterministic draft/cell-scoped ExecutionAttempt/one-batch-Run/WorkOrder revision/branch/ValidationCycle classification with no semantic-distance inference, no RunSet/RunGroup and no existing-Run rebinding;
  - immutable ordered 1..N required-cell Run manifest with canonical hash, exact TaskSpec bindings, one-Run-per-paper-bound-revision uniqueness and fail-closed Run-level completeness;
  - D-20 four-local-UoW chain: PI admission + `WorkOrderRevisionAdmitted` outbox → EF inbox/materialization/Run + `RunManifestFrozen` outbox → PI inbox/head CAS + `BranchHeadAdvanced` outbox → EF inbox/sole acknowledgement; each consumer's inbox/domain/outbox outcome is atomic and relay markers carry no domain authority;
  - D-21 additive persistence/cutover: independent PI/EF typed v2 table families, exact external refs/hashes/events only across domains, dedicated default-off admission, unchanged diagnostics-only legacy rows, post-D-19 v2-only new intake and rollback by stop-new-intake plus committed-saga drain;
  - D-22 minimal first migration: only Phase 1 typed identity/draft/revision/lifecycle/readiness families required by the D-19 fixture plus PI branch/revision/cells/admission/head/inbox/outbox and EF VersionLock/RunRecipe/TrainingTaskSpec/Run/RunCell/inbox/outbox; structural invariants are relational, frozen scientific snapshots are named typed canonical JSON+server hash, and generic EAV/cross-domain FK/future-phase/legacy-mapping persistence is absent;
  - D-14 two-axis state invariant: simulation Attempt terminality changes only a rebuildable workflow projection, Run/cell scientific state remains `not_started`, and no-evidence Cycle closure references rather than copies EF facts;
  - D-15 authority split: PI draft authoring constraints compile automatically into exact cells before admission; EF cannot select cells after admission and adds only TaskSpec/provider/result bindings to the one-to-one Run-cell representation;
  - D-16/D-18 accounting split: eligible EvidenceCandidate→single Gateway→REU is the only scientific-evidence path; one CAS-fenced admitted-branch/current-revision/effective-head snapshot is the only execution-accounting path; non-head history is query-only and Sidecar is display-only;
  - D-18 branch membership/order, stable `BRANCH_HEAD_NOT_FROZEN`, explicit comparison refs, `CYCLE_ACTIVE_REAL_ATTEMPT`, closed-Cycle write seal and `CYCLE_CLOSURE_SCOPE_DRIFT` rebuild contract;
  - exact schema/unique/CAS/hash/event/inbox/outbox/UoW matrix, one default-off admission configuration key/routing guard, legacy active/completed population treatment and the predeclared product-gate command/output schema; no capability/eligibility/dispatch authority table exists;
  - four fixed human-gate state transitions with no model-confidence/value trigger;
  - inventory of frozen vs mutable record kinds and all trusted-evidence minting paths;
  - current-data compatibility report and migration/backout plan;
  - golden-scenario source/provenance selection based on T-131 RAGPerf, with a new typed v2/versioned protocol identity rather than direct v1 execution.
- Verification:
  - ownership and entrypoint scans are checked into the product gate;
  - each current bypass has an owner, target phase and negative acceptance test.
- Rollback: N/A; planning and read-only discovery only.

### Phase 1 — Canonical identity and version-bound readiness
- Objective: make the object that passed readiness provably identical to the object submitted.
- Deliverables:
  - server-owned canonical serialization/hash policy with domain separation by record kind, schema version and hash profile;
  - stable `logical_id`, server-issued immutable `revision_id` and semantic-only `content_hash` that excludes timestamps/status/projection fields;
  - CAS/expected-hash updates for mutable drafts; drafts cannot receive readiness;
  - idempotent freeze: same logical object + same content returns the existing revision; a semantic change creates a new revision;
  - execution refs require record kind + revision id + content hash; logical id alone is discovery-only;
  - readiness bound to target revision/hash and a deterministically ordered full dependency revision/hash manifest;
  - append-only lifecycle events with explicit current-state projections for operationally evolving records;
  - recursive ref resolution and submit-time revalidation;
  - unchanged legacy-row compatibility reads restricted to diagnostics/admin plus hard exclusion from all v2 writers and product selectors; no legacy identity/hash backfill.
- Verification:
  - adversarial tests: post-readiness mutation, stale dependency, forged payload hash, wrong ref kind, logical-only execution ref, missing dependency, projection-field hash pollution and concurrent CAS update;
  - idempotency tests: same logical/content freeze returns the same revision; same content under different logical identities does not merge ownership; old revisions remain replayable;
  - real Prisma round-trip confirms identity and uniqueness constraints.
- Rollback:
  - retain existing-field legacy diagnostics/admin reads and offline aggregate-only shadow verification; disable new v2 admission with no product dual-read/fallback and drain committed sagas before any schema follow-up.
- D-19 boundary:
  - implement only the minimal real v2 identity/readiness substrate required for D-19 typed assets and exact materialization;
  - D-22 excludes candidate/import/promotion and all Attempt/provider/result/validation/evidence/closure/UI/search/legacy-mapping persistence from the migration; exact typed fixture asset kinds are locked by the implementation-readiness matrix;
  - do not declare product acceptance until the Phase 2 admission-to-head acknowledgement evidence closes.

### Phase 2 — Shared scope, typed preparation and Run-manifest/head spine
- Objective: land the PI authority objects and immutable Run identity before provider control or scientific validation depend on them.
- D-19 first acceptance slice:
  - input: already bound Cycle plus real Phase1-ready typed v2 assets; final product bootstrap/import/promotion remain separate prerequisites;
  - fixture: one admitted WorkOrder revision with exactly two required cells under the 1..N contract;
  - flow: exactly one VersionLock, one RunRecipe and two TaskSpecs → one Run/manifest + `RunManifestFrozen` → PI sequence-fenced head CAS + `BranchHeadAdvanced` → EF durable acknowledgement;
  - endpoint: one branch/current revision, one VersionLock/Recipe, two TaskSpecs, one Run/head/ack, paired events/inbox receipts and zero Attempt/provider/result/validation/evidence/closure/UI/search/legacy writes through real shared/HTTP/service/repository/Prisma/inbox/outbox layers;
  - capability is default-off and writes no legacy object in parallel.
- D-20 transaction and replay boundary:
  - four successful domain-authority commits remain separate even under one Prisma/Postgres deployment; no callback accesses both PI and EF write repositories and no shared mutable table, distributed lock or 2PC exists;
  - the only integration events are `WorkOrderRevisionAdmitted`, `RunManifestFrozen` and `BranchHeadAdvanced`; all use versioned exact-scope envelopes, canonical payload hashes and producer/consumer idempotency keys;
  - exact replay returns the stored outcome, lower branch sequence is durably stale without rollback, changed payload or same sequence/different Run/manifest is terminal conflict, and invisible valid prerequisites retry with zero domain/outbox write;
  - pre-commit rollback, commit-before-publish and publish-before-delivery-marker crash tests converge through local atomicity, outbox replay and inbox deduplication; EF's processed `BranchHeadAdvanced` receipt is the sole acknowledgement and dispatch prerequisite.
- D-21 storage and cutover boundary:
  - PI branch/revision/exact cells/admission/head/inbox/outbox and EF typed revision/readiness/Recipe/TaskSpec/Run/manifest/cells/inbox/outbox use separate additive typed v2 families; cross-domain persistence is exact external identity/hash/sequence/event scope without shared relation/FK/write authority;
  - legacy singular WorkOrder/HarnessRun/generic EF rows remain unchanged existing-field diagnostics/admin-only; offline aggregate shadow checks do not participate in runtime routing/returns/authority and no product repository/view unions v2 with legacy;
  - capability-off rejects new v2 admission with zero v2/legacy write and no fallback; after D-19 acceptance new paper-bound intake switches only to v2 while overlapping legacy product writers close in the same release;
  - disabling/rollback stops new intake but continues relay/consumers to drain committed sagas, preserves immutable v2 data/events and never restores legacy writers or converts v2 lineage.
- Deliverables:
  - bound PaperProjectIntake → PI broker → stable WorkOrder branch/current admitted revision/sequence with canonical exact cells/hash and branch frame;
  - one versioned PI→EF scope envelope with no `latest`, range or generator execution authority;
  - typed v2 required-rule readiness/capability map plus catalog-only atomic promotion; T-131 v1 remains history and original source becomes a new typed v2 identity;
  - typed VersionLock/RunRecipe/TaskSpec preparation one-to-one from admitted cells;
  - the revision's only immutable batch Run/manifest plus `RunManifestFrozen → BranchHeadAdvanced → durable EF acknowledgement` before any Attempt.
- Verification:
  - wrong project/revision/hash, unsupported rule, extra/missing/drifted cell, second Run, stale/conflicting head event and pre-ack Attempt all fail closed;
  - same revision/manifest replay is idempotent and PI/EF ownership remains separate.
- Rollback: disable v2 broker/preparation/manifest writers; preserve immutable readback/events and never restore legacy trust.

### Phase 3 — Durable provider control and same-payload simulation
- Objective: prove crash-safe provider lifecycle control without real training or scientific output.
- Deliverables:
  - durable ExecutionAttempt/CollectionAttempt, provider idempotency, lease/reconciliation and stable provisional output identities;
  - exact locked provider payload drives fake submit/sync/cancel/collect/reconcile/restart paths;
  - LocalScript/fake provider is explicitly non-production and cannot reach scientific writers;
  - `workflow_simulation_status` is rebuilt from Attempt events and never changes Run/cell scientific state.
- Verification:
  - crash/fault/replay/timeout/cancel cases converge without duplicate records or provider jobs;
  - all simulator provenance is rejected before ExperimentResult/validation/EvidenceCandidate/REU;
  - any Cycle-wide active real Attempt remains visible to the later D-18 blocker scan.
- Rollback: stop dispatch, drain/cancel/reconcile Attempts and preserve immutable audit facts.

### Phase 4 — Exact-batch scientific validation and D-16/D-17/D-18 trusted closure
- Objective: close one scientific authority chain over the final Run scope while keeping the zero-write release non-scientific.
- Deliverables:
  - reject `accept_partial`; ScientificValidationService alone validates one exact batch and may atomically mint EvidenceCandidate only from complete eligible real-provider results;
  - one PI Gateway alone writes REU/TraceManifest/outbox after server-side lineage/scope resolution;
  - D-18 `closure_watermark`: expected Cycle version, canonical admitted branch set and each current revision plus non-null matching effective head Run/manifest/cells/all Attempts; no-head candidate blocks with `BRANCH_HEAD_NOT_FROZEN`;
  - non-head history excluded; explicit trusted v2 comparison refs affect contextual proposal/hash only; any Cycle-wide active real Attempt and any pending preparation/head saga block closure;
  - CAS drift returns `CYCLE_CLOSURE_SCOPE_DRIFT` with zero partial write; same-watermark replay is idempotent;
  - one Result Analysis proposal, one existing Cycle-closure writer, non-null-disposition-derived exit, null no-evidence selected exit, post-closure Packet and closed-Cycle-only consumers;
  - closed Cycle rejects all later admission/Run/head/Attempt/attachment/dispatch writes; follow-up targets a successor Cycle;
  - Sidecar display-only and dossier consumes exact closed-Cycle snapshots without project/history scan or dual read.
- Verification:
  - two-plus-branch fixtures prove deterministic membership, current revision/effective-head parity, complete cells/Attempts, stable no-head blocking, non-head exclusion and explicit comparison lineage;
  - non-head active real Attempt, stale watermark/proposal, concurrent head/admission drift and closed-Cycle writes fail with zero side effects;
  - Packet is absent from closure hash and appears only after `ValidationCycleClosed`;
  - scientific positive/negative/inconclusive fixtures are production-disabled contract conformance; first release executes only no-evidence closure and proves zero real result/EvidenceCandidate/REU.
- Rollback: disable validation/evidence/gateway/closure writers, preserve immutable readback and forward-fix v2 state; never restore legacy trusted authority.

### Phase 5 — Project-scoped researcher workflow
- **D-24 rescope (2026-07-24)**: this phase is narrowed to the agent-first workflow slice. Kept: the project-scoped lineage read model/queries, typed action surface with server-derived identities, workflow automation (terminal sync/collect, Cycle-ready detection, Result Analysis proposal, post-closure preparation) and typed blocker/approval/recovery actions. Deferred out of T-132 (to the future UI-redesign task): navigation/forms/owning-screen presentation/provenance views, the DOM/Electron test lane, and the entire semantic retrieval projection. Structured lineage queries are the sole retrieval authority. Existing desktop read-only views stay frozen.
- Objective: expose the control plane as a coherent, typed, automated workflow consumable by an LLM agent or any future UI.
- Deliverables:
  - navigation keyed by PaperProject/ImplementationProject → ValidationCycle → WorkOrder → Run;
  - lineage-scoped queries/read model and typed forms with explicit WorkOrder branch, revision and branch-head Run identities;
  - one PI-owned, project-scoped retrieval projection with deterministic ValidationCycle and branch-head semantic documents, populated from PI/EF outbox facts;
  - hybrid retrieval ordered as permission/scope filter → structured lineage filter → semantic ranking → exact PI/EF revision/hash resolution, with structured-only fallback;
  - automatic terminal-state sync/collect plus owning-screen presentation for the four fixed WorkOrder/exception/scope/ValidationCycle gates;
  - automatic Cycle-ready detection, Result Analysis proposal and post-closure next-step/claim/dossier preparation, with the existing one closure action as the only conclusion assignment;
  - clear blockers, approvals, retry/recovery actions and provenance views;
  - separate rendering of control-flow simulation, EF execution, EF protocol `passed | failed | unsupported`, PI proposal and closed-Cycle `positive | negative | inconclusive | null`; no mode-labelled Run or REU-disposition terminology.
  - raw JSON limited to advanced diagnostics.
- Verification (per D-24, at HTTP/service/repository level):
  - multiple projects/recipes/runs cannot leak into one another's timeline;
  - the primary agent/API flow contains no manually entered internal IDs or hashes;
  - automation behaviors (terminal sync/collect, Cycle-ready, proposals) are event-replayable and idempotent;
  - deferred UI/semantic items carry no landed code, capability or schema in T-132.
- Rollback:
  - retain current read-only asset views; gate new workflow actions independently.

### Phase 6 — Control-plane scenario, release gates and zero-write cloud preflight
- Objective: prove desktop/control-plane product fitness with a replayable non-scientific simulation and validate the Aliyun boundary without creating or running a cloud job.
- Deliverables:
  - T-131 RAGPerf promotion history retained unchanged, while original-source data is re-imported as a new typed v2/versioned protocol identity with resolved readiness dependencies before PI draft constraints compile into an admitted exact cell plan and real RunRecipe/TaskSpec/payload materialization; no local/cloud training;
  - PaperProject/WorkOrder → canonical assets → RunRecipe → TaskSpec/payload → simulated provider lifecycle → WorkOrder/Sidecar control-state trace;
  - machine-readable productization summary and operator recovery runbook;
  - updated OpenAPI/API index/context registry;
  - exact, canonical-hashed and redacted Aliyun `CreateJob` payload produced from the same locked TaskSpec used by the adapter simulation;
  - offline provider-schema/enumeration/size/ref checks, including the official 65,536-byte request limit;
  - real Aliyun read-only preflight for endpoint/signing, region, `ENABLED` workspace and visible DLC resource limits/refs;
  - application transport hard-deny for write APIs plus a least-privilege RAM identity without `paidlc:CreateJob`;
  - fake-provider submit/sync/cancel/collect/reconcile and failure/replay flow driven by the exact materialized payload under an explicit non-production identity;
  - explicit `workflow_simulation_passed` and `cloud_preflight_passed` statuses, with no `cloud_training_passed`, EvidenceCandidate or RunEvidenceUnit claim;
  - one D-18 PI Cycle closure snapshot referencing the current admitted revision/effective head Run, complete cells and terminal simulation Attempts with `closure_kind=control_flow_validated_no_paper_evidence`, `scientific_disposition=null`, `selected_exit=null` and `evidence_eligibility=false`; non-head history remains outside the snapshot;
  - separate future plan for a real minimum-resource canary.
- Verification:
  - shared/backend/desktop typecheck and tests;
  - disposable Postgres full chain;
  - real HTTP/service/repository E2E (per D-24; existing desktop read-only views keep only their current tests), restart/fault injection, duplicate replay and soak over the control-plane simulator;
  - cloud-call audit contains only approved read/list operations and zero create/update/delete calls;
  - a deliberate `CreateJob` attempt is rejected before transport and also denied by the preflight credential policy;
  - materialized payload hash equals the payload hash consumed by the fake-provider lifecycle, and a DB/API scan proves zero simulated scientific evidence;
  - the same scan proves Run/cell scientific status stayed `not_started`, no scientific terminal transition occurred and the workflow status is rebuildable from Attempt events;
  - human usage-fit rubric confirms preparation cost, decision clarity and traceability.
- Rollback:
  - release by gated capability; disable new dispatch/evidence minting independently while keeping audit/readback available.
  - revoke/disable the read-only cloud credential and endpoint configuration; no cloud job or compute resource exists to clean up.

## Verification and acceptance criteria
- Build/typecheck:
  - `pnpm typecheck`
- Automated tests:
  - `pnpm --filter @paper-engineering-assistant/shared test`
  - targeted ExperimentFoundation and PaperImplementation service/integration suites during each phase
  - `pnpm --filter @paper-engineering-assistant/backend test` at milestone gates
  - `pnpm --filter @paper-engineering-assistant/desktop smoke:e2e`, upgraded to real interaction coverage for the control-plane path
- Existing regression lanes:
  - `pnpm experiment-foundation:full-flow`
  - `pnpm experiment-foundation:hardening -- --mode deterministic`
  - `pnpm experiment-foundation:hardening -- --mode real-local-db --require-real-db`
- Planned product gate:
  - Phase 0 freezes one command, output schema, required check IDs and artifact root for invariants, scientific-policy tests, durable provider control, cross-module control trace, UI interaction and action budget; Phase 6 executes that predeclared gate without redefining the gate.
- Governance/docs:
  - DB context refresh and migration verification through `sync-db-schema-from-code` when schema work is approved;
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Product acceptance:
  - immutable identity and readiness drift cannot be bypassed;
  - no incomplete/failed/cancelled execution or manual action can mint evidence; complete protocol-valid negative/inconclusive results remain eligible on a separate scientific-disposition axis;
  - provider-control simulation recovers without duplicate attempts/events after process failure;
  - the trusted-evidence path is singular and rejects all LocalScript/fake-provider provenance;
  - the execution-accounting path is singular: one D-18 watermark freezes admitted branches/current revisions/effective heads/cells/Attempts, excludes non-head history and supplies dossier through declared closed snapshots; project/history scans and Sidecar cannot become a second authority;
  - a researcher can finish the control-plane scenario without manual ref/hash/JSON maintenance;
  - the fixed one-project/one-Cycle/one-branch/one-admitted-revision/one-batch-Run zero-write scenario completes with Initiation/Authority/Recovery/Plumbing `1/2/0/0`; N required cells/cell-scoped Attempts and recoverable technical faults add no action, and every other scenario's actual AuthorityActions equal its named-gate cardinality;
  - one paper-bound WorkOrder revision cannot create two Runs; same admitted plan deterministically replays the same ordered Run manifest/hash, scientific cell changes require a new revision, and incomplete required cells cannot qualify Run-level evidence;
  - WorkOrder admission cannot succeed without a canonical non-empty exact cell plan/hash; ranges/generator metadata author no execution cells, EF adds no scientific choice after admission, and the Run manifest is a one-to-one scientific projection plus EF-owned TaskSpec/result bindings;
  - branch head advances automatically only from a valid `RunManifestFrozen` event for the newest admitted branch revision; same-sequence replay is idempotent, stale events never roll back head or dispatch, same-sequence conflicting Run/hash fails closed, and failed/cancelled head Runs remain head;
  - simulation-only terminal Attempts do not terminalize the Run scientifically: the Cycle may close only with null disposition/selected exit over D-18 exact scope; a later real Attempt may reuse the Run/cell only while the Cycle is open, and post-closure follow-up uses a successor Cycle/new Run;
  - every admitted branch is present at closure as current revision plus matching effective head; `BRANCH_HEAD_NOT_FROZEN`, pending head work and any active real Attempt anywhere in the Cycle block, CAS drift rebuilds with zero write, and closed-Cycle execution commands fail closed;
  - PI and EF agree on exact Cycle/branch/revision/Run-manifest/required-cell/TaskSpec/Attempt scope through shared contract tests, and no EF path rewrites PI semantic fields;
  - project-scoped semantic retrieval returns only discovery candidates, survives index rebuild/staleness through structured fallback and always re-resolves exact source revisions/hashes;
  - OpenAPI/context and machine-verifiable release evidence match runtime behavior.

## Risks and mitigations
| Risk | Likelihood | Impact | Mitigation | Detection | Rollback |
|---|---:|---:|---|---|---|
| identity cutover accidentally upgrades or mutates legacy rows | medium | high | unchanged legacy store, no backfill, separate v2 writer eligibility and diagnostics-only legacy reads | before/after row digest plus writer/selector denial tests | stop cutover; keep legacy diagnostics read path |
| validator scope grows into a generic statistics engine | medium | high | freeze supported v1 rule subset; unsupported means explicit blocked | protocol coverage matrix | disable unsupported protocols, preserve reports |
| external/provider-control actions race DB persistence | high | high | durable attempt + outbox/idempotency key before adapter call | simulator crash/fault injection; real-provider proof deferred | stop dispatch and reconcile attempts |
| a second trusted-evidence path survives | medium | high | single gateway and repository/route ownership scan | adversarial direct-intake tests | disable offending route/minting gate |
| failed-run accounting survives as a second REU/dossier path | high while T-124 S3 code is present | high | D-16/D-18 atomic cutover: stop failed/cancelled/incomplete REU writes, freeze current-effective Cycle snapshots, switch dossier in the same release and retain non-head/legacy rows as read-only audit only | writer/reader ownership scan, zero failed-REU fixtures, watermark/hash parity and absence of project/history scan | block the shared evidence seam; do not enable a compatibility fallback |
| closure scope drifts or expands into full history | high | high | CAS expected Cycle/branch/current-revision/head/active-Attempt watermark; explicit comparison refs only; closed-Cycle write seal | concurrency tests, non-head exclusion, Cycle-wide active blocker and post-closure negative matrix | reject with `CYCLE_CLOSURE_SCOPE_DRIFT`, write nothing and rebuild |
| cross-task conflict with T-124 | high while dirty | medium | shared contract decisions recorded before edits; narrow task ownership | git diff and targeted cross-lane tests | pause overlapping slice, preserve T-124 changes |
| product UI is built before project-scoped queries | medium | medium | read model/query contract is an entry gate for Phase 5 | multi-project isolation tests | keep old views read-only |
| semantic search becomes a third truth or a required control-path dependency | medium | high | PI-owned rebuildable projection, source revision/hash binding, structured-first queries and exact owner re-resolution | stale-index, rebuild, permission and index-unavailable tests | disable semantic ranking and retain structured lineage queries |
| cloud preflight is mistaken for real training proof | medium | high | fixed `cloud_preflight_passed` vocabulary, zero-write audit and explicit unverified-runtime list | release-summary assertion | revoke the cloud-ready claim; retain control-plane evidence |
| simulator output is mistaken for scientific evidence | high | high | explicit non-production adapter identity; evidence writers reject LocalScript/fake provenance; separate `workflow_simulation_passed` vocabulary | product-route negative tests and zero-evidence DB scan | disable simulator product route and revoke any leaked records |
| terminal simulation is mistaken for a terminal scientific Run | high | high | one Run with Attempt-level provenance; scientific state remains `not_started`; control status is a rebuildable projection and Cycle closure is explicitly no-evidence | state-transition negatives plus Run/Attempt/closure readback | discard/rebuild the control projection; never rewrite EF scientific history |
| ranges or a generator become a second post-admission scientific authority | high | high | admission requires embedded exact cells plus `cell_plan_hash`; EF only validates/materializes one-to-one cells and cannot sample/default scientific fields/add/drop/substitute | range-only, generator-only, replay-drift and manifest-parity negatives | reject before Run/head/Attempt; revise the PI draft and admit a new revision |
| control-plane E2E is another source-string/mock smoke | medium | high | require real HTTP/service/repository interactions, real-database evidence and simulator fault evidence (DOM lane deferred with the UI layer per D-24) | artifact inspection and required-test registry | reject release summary |

## Optional detailed documentation layout
T-132 uses the repository's complete bundle:

```text
dev-docs/active/experiment-foundation-productization-closure/
  .ai-task.yaml
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos
- [x] Record planning-mode signal, inputs and task-governance decision.
- [x] Create the full planning bundle without product-code changes.
- [x] Confirm OQ-09: PI is primary for paper-bound experiments; standalone EF exploration requires WorkOrder attachment and full revalidation before paper trust.
- [x] Confirm and revise OQ-01: desktop control-flow simulation + Aliyun zero-write preflight + same-payload fake lifecycle; no local/cloud training or simulated evidence.
- [x] Confirm OQ-02: logical identity + immutable revision + canonical semantic hash + CAS drafts + dependency-bound readiness.
- [x] Confirm OQ-03a: approved WorkOrder hash + four fixed human gates; no DecisionAuthorityManifest/general Policy Engine.
- [x] Confirm OQ-03b: remove accepted partial; incomplete output is diagnostic-only and cannot enter the evidence chain.
- [x] Confirm OQ-03c: manual promotion is catalog admission only and cannot waive blockers, grant readiness or upgrade evidence trust.
- [x] Confirm OQ-04: promotion atomically and idempotently creates/reuses the canonical revision, decision, Candidate terminal state and outbox; callers cannot prewrite canonical refs.
- [x] Confirm OQ-05: EF qualifies EvidenceCandidate; one PI-owned gateway alone creates RunEvidenceUnit after server-side lineage/project validation; D-16 assigns diagnostic execution to immutable Cycle closure accounting and keeps Sidecar display-only.
- [x] Confirm OQ-06: PaperProjectIntake and both bridge binding refs must precede PI bootstrap; no first-class late binding is built.
- [x] Confirm OQ-07: formal execution is cloud-only; LocalScript/fake providers are dev/test simulation and cannot mint scientific evidence; no local runner platform in the first release.
- [x] Confirm OQ-08: existing rows remain unchanged/read-only in the database; one mechanical ineligibility code, diagnostics/admin reads only, no legacy revalidation/comparability/UI/PI flow.
- [x] Confirm OQ-10: PI owns Cycle/WorkOrder branch/revision semantics and project-scoped retrieval projection; EF owns deterministic execution facts; global infrastructure owns only reusable index mechanics; semantic search has no workflow/trust authority.
- [x] Confirm OQ-11: PI declares `revise | fork`; the backend compares the frozen branch semantic-frame hash and maps draft/Attempt/Run/revision/branch/Cycle cases deterministically without rebinding existing Runs.
- [x] Confirm OQ-12: AuthorityGate is durable authority, CoordinatorStop is a derived coordinator-local pause; overlap is one owning-screen action with auto-resume, and normal in-bound execution creates no confirmation.
- [x] Quantify OQ-12: for one project/Cycle/branch/admitted revision/batch Run and N required cells, require 1 InitiationAction, 2 AuthorityActions, 0 RecoveryActions and 0 PlumbingActions; full-paper and real-cloud variants add only their named gates.
- [x] Confirm OQ-13a: one paper-bound WorkOrder revision creates one immutable 1..N required-cell batch Run; retries create cell-scoped Attempts and scientific cell changes require a new revision.
- [x] Confirm OQ-13b: Run manifest freeze triggers PI-owned sequence-fenced head advancement; EF waits for durable acknowledgement before first Attempt, and failed/cancelled latest Run remains head without rollback.
- [x] Confirm OQ-14: terminal simulation lives on ExecutionAttempt/control projection only; Run/cell scientific state remains `not_started`, and Cycle closure is explicitly no-evidence without a second Run.
- [x] Confirm OQ-15: admission freezes a fully expanded exact scientific cell plan; ranges/grid/seed-count remain pre-admission authoring inputs, and EF only validates/materializes after admission.
- [x] Confirm OQ-16: RunEvidenceUnit is reserved for complete protocol-compliant validation-passed scientific evidence; failed/cancelled/incomplete execution is accounted only by the immutable Cycle closure snapshot/Sidecar projection, and dossier consumes explicit closed snapshots.
- [x] Confirm OQ-17: typed fail-closed EF rules qualify the exact batch Run; PI Result Analysis proposes only; the existing ValidationCycle closure is the sole scientific-disposition writer and server-derives the selected exit for closed-Cycle-only consumers.
- [x] Confirm OQ-18: Cycle closure CAS-freezes the admitted-branch/current-revision/effective-head scope, excludes non-head history, admits only explicit comparison refs, blocks on any Cycle-wide active real Attempt and seals the closed Cycle against later execution writes.
- [x] Confirm OQ-19: after separate Phase 1 closure, the first cross-module acceptance is the two-cell, pre-bound, real-v2 admission→EF materialization→Run/head→durable-ack spine with zero Attempt/provider/scientific/closure/UI/legacy writes; D-18 remains unchanged.
- [x] Confirm OQ-20: D-19 uses four domain-local authority commits, atomic inbox/domain/outbox outcomes and three exact events; same DB never merges PI/EF ownership and relay delivery state is non-authoritative.
- [x] Confirm OQ-21: independent domain-owned additive typed v2 families, default-off new intake, unchanged diagnostics-only legacy rows, no backfill/dual-read/write/fallback, explicit post-D-19 v2 cutover and drain-preserving rollback.
- [x] Confirm OQ-22: freeze the first migration's minimal Phase 1 + D-19 schema pack and relational-versus-named-typed-canonical-JSON invariant placement; no cross-domain FK or future-phase/legacy-mapping tables.
- [x] Complete the Implementation Pack A schema/invariant matrix, exact five-kind D-19 typed asset census and current writer/schema/database population lock in `07-implementation-readiness-review.md`.
- [x] Complete the implementation-readiness review with `ready_for_implementation_authorization`; no OQ-23 was needed.
- [x] Confirm first-release Aliyun scope: read-only preflight only, no `CreateJob`.
- [x] Obtain separate implementation confirmation before changing code/config/Prisma schema or migration files.
- [x] Complete Pack A technical implementation and pass A01-A04/B01-B10 on disposable PostgreSQL.
- [x] Supply exact original-source license/access attestations for both fixture datasets and pass the source-backed D-19 gate (`packa-d19-source-policy-20260713-r2`).
- [x] Complete Pack B durable same-payload simulation implementation and pass PB01-PB16 plus non-skipped Prisma relational tests (`packb-20260713-final4`).
- [x] Apply the reviewed Pack B migration and enable no-network simulation on the named local-development target.
- [x] Establish formal product PI scope and drain Pack A to the exact EF acknowledgement without fixture bootstrap (`formal-pi-scope-packa-product-20260715-verify-r5`).
- [x] Separately authorize and run named-local Pack B E1-E5 from the exact acknowledged Run, with zero real-provider/scientific/legacy writes (`formal-pi-scope-packb-product-20260715-verify-r2`).
- [x] Complete the Pack C (Phase 4) readiness review with EF/PI writer-census artifacts and confirm OD-C1 through OD-C4 (2026-07-18; `09-pack-c-implementation-readiness-review.md`, `artifacts/pack-c-preplanning-20260718/`).
- [x] Separately authorize Pack C implementation after syncing the execution plan into `01-plan.md` (2026-07-18; baseline HEAD `3d241127`).
- [x] Land Slice C-EF (scientific validation kernel) and pass `packc-ef-*` gates PC01-PC07/PC19-EF with skip=0 disposable PostgreSQL (2026-07-20, `packc-ef-20260720-r4`; closure `artifacts/implementation/06-pack-c-ef-technical-closure.md`).
- [x] Land Slice C-PI (gateway, D-18 watermark, closure authority) and pass `packc-pi-*` gates PC08-PC16/PC19-PI/PC20 (2026-07-21, `packc-pi-20260721-r4`; closure `artifacts/implementation/07-pack-c-pi-technical-closure.md`).
- [x] Land Slice C-cutover after T-133 N2+N6 converged (OD-C3 satisfied 2026-07-21) and pass the `packc-final-*` convergence gate over all of PC01-PC20 (2026-07-22, `packc-final-20260722-r5` with three passed children and aggregate 2,669/2,612/0 fail; closure `artifacts/implementation/08-pack-c-cutover-technical-closure.md`). Pack C is closed; the named-local apply of hardening migration `20260720141000` remains a separately approved DB action, and scientific-kind closure/packet post-closure materialization/real-provider execution remain outside Pack C.
- [x] Close the Aliyun `public_resource` read-only boundary with r6 CP01-CP12, 13 successful reads, 88-table parity and zero provider/CreateJob/database/scientific writes (`artifacts/implementation/10-cloud-preflight-live-closure.md`).
- [x] Freeze D-23 and the bilateral T-132/T-106 M7 ownership handoff: preserve the current simulation Run, require a new PI revision/new executable Run, and publish the M7-01..M7-15 readiness matrix (`artifacts/implementation/11-m7-real-provider-readiness-review.md`).
- [x] Obtain and execute independent authorization for M7-I0 through M7-I3 default-off code/schema/migration-file/test implementation; no existing/named database migration apply, provider/OSS write or capability enable occurred (`t132-m7-offline-20260723-v1`).
- [ ] Supply exact workload bundle, dataset mirrors, output storage, budget and least-privilege identities, then separately authorize M7-L1 before the first `CreateJob`.
- [ ] Obtain independent authorization for every non-local rollout and later provider/scientific/closure/UI slice.
