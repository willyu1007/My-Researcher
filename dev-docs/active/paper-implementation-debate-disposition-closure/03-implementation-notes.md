# 03 实施记录（P1/P2，2026-07-18）

## P1（N2 skeptic revise 出口，形状 2）——代码落地 DONE，live 面留 P3

### 落地清单（对照 `02-p1-workorder.md`）
- **W-1 契约**：route-skeptic disposition 契约块补 D2-pre2 式正交语义注释（`packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts` `PAPER_IMPLEMENTATION_ROUTE_SKEPTIC_DISPOSITIONS` 上方）；兑现 S3 移交项。schema 形状零改动（blocked+revise 仍 schema 合法，治理由确定性层承担）。
- **W-2 确定性层**（`paper-implementation-route-planning-runtime-service.ts`）：
  - 单扳机推导（runSlot，scoped `route_skeptic_review`）：`final blocked ⇔ role_status='blocked'`；passed + blocking findings → final **passed**，blocker codes 保留在 final（审计实体）。architecture 槽双扳机不变。
  - disposition 结构钳制 `skepticFinalDisposition`：`proceed` 与 blocking finding（severity blocking/critical 或 `blocks_route_progression`）并存 → 服务端改判 `revise` + warning `ROUTE_SKEPTIC_DISPOSITION_CLAMPED_TO_REVISE`（service-local 常量，curation echo-drift 先例）；无 blocking finding 的 revise/park/abandon 尊重 LLM（安全方向）。
  - `skepticRepairSuggestionWarnings` 扩展：非 proceed 结局（blocked final **或** passed 非 proceed）无 `required_revision_refs` → 完备性 warning（非阻断）。
  - coordinator **零改动**（既有 :1559-1564 分支即出口，单测 :449 已覆盖）。
- **W-2 核对点结论**：① admission 对 "passed + envelope codes 非空" 无约束（只拒 blocked+空 codes）——passed final 保留 codes 可行；② 未加 codes↔findings 一致性检查——codes 是自由串无法确定性对应。~~一致性治理由 disposition 钳制承担~~ **该辩护被 P3 复审推翻（角度② C-1）**：钳制谓词原本不读 codes 通道，`passed+proceed+非空 codes+无 blocking finding` 会越过人审——已修：钳制谓词纳入非空 blocker_codes（proceed 与之并存 → 改判 revise+warning），并 scoped 到 `role_status='passed'`（blocked 输出不钳、不打 drift warning）。
- **实施中新堵的洞（勘察未列）**：validation_cycle / feasibility 消费 skeptic 上游仅 require "admitted+passed"——形状 2 下 revise final 变 passed，直接调 runtime 路由可绕过复审停驻。新增 `requireProceedRouteSkepticFinalArtifact`（`paper-implementation-runtime-artifact-consumption.ts`，guard `route_skeptic_disposition_proceed`，409 fail-closed），两消费点切换。gs-001/002 强路径（proceed final）不受影响。
- **W-3 prompt**：skeptic system message 补两句分类指引（role_status 双轴语义 + 可修缺口=passed+blocking findings+revise + 钳制告知）；模板家族版本 `PAPER_IMPLEMENTATION_ROUTE_PLANNING_PROMPT_TEMPLATE_VERSION` v1→v2（arch 文本未变，版本标注家族、注释说明）；slot-parameter manifest 快照重生成 + context registry checksum 已 touch。
- **配套 fixture 修正**：共享 lineage seed（`paper-implementation-runtime-chain-lineage-fixtures.ts`）skeptic 种子输出 `revise`→`proceed`——强路径种子在新下游门下语义必须是 proceed（warning-only finding 与 proceed 钳制一致）。

### W-4/W-5 验证（全绿，2026-07-18）
- L5 先注册 5 case（`.ai/scripts/paper-implementation-runtime-stress.mjs` REQUIRED_L5_CASES）+ 实现于 `paper-implementation-runtime-l5-stress.unit.test.ts`：revise→waiting_review 全链（provider 模式经真 ajv 门）/ override re-advance 完 lane（revise-and-retry 行使证据，W-5 用户裁定③——canonical gs-003 素材零改动）/ role-blocked 诚实终态+队列项 / proceed 钳制 drift / 下游 409 拒非 proceed。
- 推导矩阵 unit ×4（route-planning unit test：passed+blocking+revise→passed final 带 codes；proceed 钳制；revise 无 blocking 尊重+repair warning;强路径零 warning）。
- 全量：tsc 干净；backend 套件 **2256 例 0 fail**；stress harness EXIT=0（437 passed / 69 skipped=live canary 无 key 跳过）；三场景 golden **SMOKE 全 completed、gaps 空**。
- **runner 零改动**：`runCoordinatorLane` 的 waiting_review 纪律（诚实停驻→一次载荷不变 override→terminal）是通用面；lane A 预算 12/12 足够 override 复跑。

### 留给 P3（D7 收口）
- gs-003 **live** 重跑（诚实预期=lane A `waiting_review → override → 大概率仍 revise → waiting_review_terminal`，血缘预期仍 18/20——GT-9 缺口是素材故意埋的，不追 20/20）+ gs-001/002 live 回归；8 角度代评审;near-prod;提交。

### 实施中的发现（备查）
1. **stableStringify 字面量 `undefined`**：`literature-content-processing-utils.ts` 的 stableStringify 对 undefined 字段输出字面量 `undefined`（顶层刻意,对象内继承该行为）→ 所有把 request 对象序列化进 user message 的槽发给 provider 的"JSON"非严格 JSON（provider 当文本容忍）。跨域共享层 wart,非缺陷级,登记备查（测试侧 gateway 解析需 `:undefined`→`:null` 归一化,已在 L5 helper 注释说明）。
2. 单文件跑 L5 测试需 runner 等效环境;ts-node/esm 带类型检查,测试文件类型错误会表现为模块加载即崩（`[Object: null prototype]` uncaught）——调试时先 tsc。

## P2（N6 evolution confirm-and-continue 出口）——代码落地 DONE，live 面留 P3

### 落地清单（对照 `04-p2-workorder.md`）
- **W-1 契约**：① `PaperImplementationMotiveEvolutionArtifact` 加性新字段 `human_decision_required_option_keys: string[]`（required + schema property + no_evolution_needed/failed_runtime 分支强制空的不变式对齐）；② coordinator-contracts：advance 请求加 `review_acceptance {slot_id, decision_ref, acceptance_actor_id}`、step 加可选审计字段 `advance_holder_id` 与 `review_acceptance` 记录（**免迁移**——step 为 JSONB 整包存储,`budget_raise_events` 先例;in-memory/prisma repo 零结构改动实证）。
- **W-2 evolution 服务**：`humanDecisionRequiredOptionKeys`（PORTFOLIO_CHANGING kind/impact 判定集纯结构推导,排序稳定）+ `finalBlockerCodes` 聚合排除（`optionAwaitsHumanDecisionOnly`：portfolio-changing + 已打旗 + 仅 human_confirmation 轴 blocked + 其余四轴 satisfied/not_applicable → 该选项 codes 不并入 final;混合缺陷照旧聚合）。**final 聚合改为纯 output 重算**（role artifact envelope codes 本就是 output 派生,fallback 冗余且会把排除的 codes 带回;role artifact 聚合不变,审计诚实）。preflight-blocked final 置 `[]`。
- **W-3 coordinator**：① `stepOutcome` evolution 分支（passed + admitted final + keys 非空 → waiting_review,**置于通用 blocked 判定之后**——混合缺陷终态 blocked 红线）；② `synthesizeReviewAcceptanceStep` 确定性五检（waiting_review 停驻存在/槽家族匹配/决策 approved-applied/source_motive_refs 覆盖 final 的 target_motive_refs（B3 hash 复核先例）/human_confirmation_required 时确认 scope+consumed_by_ref 指向该决策）→ 合成 passed step（新 attempt id、0 provider 调用、artifact refs 从停驻 step 逐字复制、审计记录落 step）；③ 动词锁双向（evolution 停驻裸 advance/payload-override → 409;revise 家族停驻带 review_acceptance → 400;同请求两动词并存 → 400）；④ 所有执行 step 落 `advance_holder_id`（补上 payload-override 动词的 actor 落盘缺口,用户裁定④）。
- **DI**：coordinator options 新增两个只读单方法 reader（`motiveDecisionReader`/`confirmationReader`）,四构造点同步（app.ts 窄字面量包装/coordinator 单测 fixture/L5 两处）;**零权威写依赖面结构守卫测试有意识扩展**（instance keys + persistence handles + 每 reader 单方法断言 + T-133 边界演进注释）。
- **W-6 runner**：`runCoordinatorLane` 加可选 `options.resolveWaitingReview(step)`（默认行为不变）;motive lane 传 evolution 处理器 `resolveEvolutionHumanDecisionStop`——走真实权威链（POST `/human-confirmations` scope=motive_evolution_decision human actor → 新建 **target=决策本身** 的完整 TraceManifest（decision 家族血缘=确认单 `human_decision_refs`；gs-002 live-003 实证借 spine manifest 会被 target 门 409）→ POST `/motive-evolution-decisions` park/structural/approved、创建时消费确认单）→ advance 带 `review_acceptance`。非 evolution 停驻与其他 lane 零变化。P3 复审后停驻记录先于续路入账（resolver 失败不再吞停驻）、RUNNER_VERSION v9→v10。

### W-4/W-5/W-7 验证（全绿，2026-07-18）
- L5 先注册 5 case + 实现（provider 模式全链经真 ajv wire 门）：confirmable park 选项 → final **passed** + keys=[park] + blockers 空 + 选项 codes 保留审计 + waiting_review 无队列项;confirm-and-continue 完 lane **零重跑**（gateway calls 不增,合成 step 0 provider 调用、审计记录/artifact 复制断言）;混合缺陷 blocked 终态+队列项（红线）;动词锁 409;确认门拒 proposed 决策 + 拒 revise 家族槽（400）。
- 全量：tsc 干净;backend 套件 **2261 例 0 fail**;stress harness EXIT=0（461 passed,10 个 T-133 case 全注册覆盖）;三场景 golden smoke 全 completed、gaps 空。
- L5 实施细节：motive lane 冻结源 bundle 用两 fixture 的并集（槽侧 refs-⊆ 检查全保持）;决策/确认 seed 直写 in-memory repo（授权链本体已被 board-service 单测覆盖,coordinator 只读复核是被测面）。

### 留给 P3（D7 收口）
- 三场景 live 重跑（gs-003 lane A 诚实预期见 P1 节;motive lane 的 evolution 停驻 live 触发非确定——park/split 是否出现取决于 LLM,出现则行使 confirm-and-continue 权威链,不出现则自动完链,两种形态都诚实）+ 8 角度代评审 + near-prod + 提交。
- N6 相关备查（P0 已登记）：admitted evolution artifact→决策请求仍是人工转录（runner 的 resolver 是 runner 侧接线,非产品机器）;`CoreMotiveIdentity.lineage` 图字段全仓无写入者;20-check 血缘对 evolution 停驻零可见性,若要审计面覆盖需新增 check——均为独立缺口,不在本包修。
