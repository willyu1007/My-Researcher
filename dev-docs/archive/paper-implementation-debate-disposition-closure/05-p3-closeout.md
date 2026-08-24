# 05 P3 收口记录（D7，2026-07-18 开）

模型序保持现任（gpt-5.5）——用户裁定：先跑 P3 与 T-124 基线同模型可比，换模（OpenAI 全线 Sol / qwen3.7-plus / deepseek 修价，不做独立验证包）在 P3 提交后同工作树进行。

## Live 重跑

### gs-001（live-015）✅
- 总体 `partial`（构成同基线：board lane 设计性 waiting_review），`gaps: []`、`observability_gaps: []`，**血缘 20/20 全 ok**。耗时 ~11 分钟。
- **lane A 全链 completed**（arch→skeptic passed→cycle→feasibility）——P1 形状 2 的强路径 live 零回归（skeptic proceed 自动续，最关心的回归面）。
- board-curation：`waiting_review → 一次载荷不变 override → 仍 revise → waiting_review_terminal`——D2-pre2 纪律不变。
- **motive lane：evolution blocked——P2 红线分支的 live 实证（非缺陷）**。challenger 提出 supersede 选项（合规打旗 `human_confirmation_required=true`、`human_confirmation_status=blocked`），但**其余轴 partial 且带真实前置条件码** `review_finding_required_before_supersession`——即"选项未决（supersede-IF-review-finds）、有人门之外的实质前置"。按 D-133-2 聚合规则（排除仅限"唯一拦路轴是人门、其余轴 satisfied/not_applicable"）codes 照旧聚合 → 终态 blocked + 队列项。**判读：这是设计想要的诚实形态**——confirm-and-continue 直通只留给"完全 vetted、只差人拍板"的选项。
- `human_decision_required_option_keys` 在 blocked final 上非空（信息性；coordinator 分支只吃 passed final）——符合设计。

### 校准观察（登记，非缺陷）
- live challenger 习惯把非人门轴标 `partial`（三个选项的 evidence 轴全 partial）→ **纯等人形态（waiting_review park）在 live 上会偏稀有**，confirm-and-continue 的 live 行使机会取决于 LLM 是否产出全 clean 的 park/split 选项。语义上严格是对的（partial=vetting 未完成，不该直通）；若未来想放宽 partial 进入直通集，是 `optionAwaitsHumanDecisionOnly` 一行谓词的变更，但会稀释红线——留作校准议题，不动。

### 备查（先于 T-133 存在，非本包引入）
- evolution blocked final 携带 `support_result_status='options_proposed'`，而 `motiveEvolutionFinalStatusInvariants` 的 blocked 分支要求 `support_result_status='blocked'`——**契约 schema 与运行时行为不一致**（运行时不对 final payload 执行该 schema；gs003-live-002 同形态已存在）。要么不变式错（应允许 blocked+options_proposed），要么服务该确定性推导 support_result_status。跨切片议题，登记不修。

### gs-002（live-003 → live-004）
- **live-003（partial，一个 runner 侧 gap，已修复重跑）**，两个重磅事实：
  1. **P1 revise-and-retry 首次 live 行使**：lane A skeptic 首次尝试给非 proceed 裁决 → `waiting_review`（T-133 前从未触发过的设计停驻点）→ 载荷不变 override 复跑 → `passed` → **lane A completed 全链**。四点集#1 的 skeptic 语义停驻在 live 上闭环。
  2. **evolution 纯等人停驻 live 真实出现**（challenger 提出全 clean 的 park/split 族选项）→ coordinator 正确停 `waiting_review` → runner 权威链走到建决策时 **409：决策的 trace manifest 必须以决策本身为 target**——W-6 接线 bug（错用 spine motive manifest），live 作为对抗面又一次抓到 runner 缺陷。**修复**：resolver 先建 target=决策 id 的完整 manifest（decision 家族血缘=确认单 `human_decision_refs`），再建 approved 决策。产品侧零改动（409 正是权威门在正确工作）。
  - 后半链不受影响：血缘 **20/20 全 ok**（motive lane 不在 20-check 回溯链上）。
- live-004 重跑进行中（验证 confirm-and-continue 全链 live 行使）。

### gs-002（live-004，重跑）✅
- lane A：skeptic 首次 revise → `waiting_review` → override 复跑 → **仍 revise** → `waiting_review_terminal`——P1 的"复跑仍 revise 诚实终止"出口 live 行使（与 live-003 的"复跑通过"出口互补，两种出口均已 live 实证）。血缘 18/20，两个 fail = GAP-N2 家族确定性下游形状（cycle→probe trigger / probe→proposal），非机器回归（live-003 同素材抽到通过形态时为 20/20）。
- lane-motive：evolution 混合缺陷 blocked（这次抽签没出纯等人选项，resolver 未行使）；board 纪律不变。
- 成本 $3.03（重付 28.4%——override 复跑计入重付，复审出口的预期成本形状）。

### gs-003（live-004）✅ —— N2 目标 live 闭环
- **lane A 从旧终态 blocked 变为 `waiting_review → 一次载荷不变 override → 仍 revise → waiting_review_terminal`**，与用户裁定③的诚实预期逐字一致。GT-9 故意缺口被 skeptic 双命中、裁决 revise、可复审停驻——"语义有效停驻都有可复审续路"的包目标达成。
- 血缘 **18/20**（两 fail 同上，GAP-N2 家族预期形状，未为凑数 override）；停驻#2 moderate 场景正确不触发（N1 谓词）；lane-motive completed（keep_current 抽签）。
- 成本 $2.46（重付 22.5%）。

### confirm-and-continue 的 live 证据现状（机会主义纪律）
- 停驻本体 live 实证（live-003）；权威门 409 live 实证（trace manifest target 门正确工作）；修复后 resolver 的剩余路径 = 与 back-half 每 run 都 live 行使的同族权威路由（trace-manifests / human-confirmations POST）+ L5 的 confirm advance 覆盖（service 级、决策/确认 seed 直写 repo——HTTP route 面是薄透传，未单独行使，诚实登记）。纯等人抽签在本轮四次 live 中仅出现一次（被 runner bug 消耗）；runner 为封闭 in-memory env，parked run 不可跨进程续。按工单"live 触发非确定、证据机会主义拿"纪律记录，后续任何 live run（含换模后）抽中即自动行使（角度⑧静态逐门推演：修复后链无残余 409）。

## 8 角度代评审（2026-07-18，全 diff）与修复轮

8 个并行评审 agent（契约/skeptic 推导/evolution 聚合/治理对抗/状态机并发/下游消费/测试覆盖/runner 文档），共 **13 项 CONFIRMED、若干 PLAUSIBLE**，全部裁定并当轮修复或登记。核对通过面（给防守方信心）：下游 skeptic 消费点全仓仅 2 处且全部上门、跨项目引用全 scoped、确认消费绑定紧、L5 注册表 85→86 逐字一致、既有测试无语义弱化、live 实数与文档逐项吻合。

### 修复清单（全部落地并验证）
| 来源 | 缺陷 | 修复 |
|---|---|---|
| 对抗 C1 + 状态机 C1（**阻断级**） | 动词锁/confirm 校验的 409/400 冒泡进 catch → `tryMarkFailed` 把 parked 人决策停驻**永久打成终态 failed**（一次手滑即毁 run；测试只断言 rejects 全盲） | 新 `CoordinatorAdvanceRejection` 恢复路径：校验类拒绝 `finish(entry status)` 恢复停驻+释放 lease 后原样 rethrow，绝不 terminalize；L5 C1 pin（拒绝×2 后 park 存活 + 合法 confirm 仍成功）注册为第 11 条 must-case |
| 对抗 C2（治理级） | acceptance 信任决策自带 `human_confirmation_required` 旗——`state_evolution` approved 决策可**零人工确认**清停驻;acceptance_actor_id 零校验 | 确认**无条件必需**（存在+scope+`consumed_by_ref` 指向该决策，不看决策自带旗）；actor 语义=审计注记,授权身份以确认单 human actor 为准（登记） |
| 对抗 C3 | 决策无新鲜度/绑定,可跨 run replay 清新停驻 | 只读新鲜度门:决策 `created_at` 早于停驻 → 409（零权威写纪律内的最小闭合） |
| 状态机 C2 | steps 按 `node_attempt_id` 字典序（`attempt-10<attempt-2`）,"最后一行=最新"在 ≥11 attempts 时崩,动词锁可被绕过 | 动词锁/parked 查找改 **EXISTS 语义**（evolution 停驻后无其他动词可加行,存在即锁,序无关） |
| 状态机 C3 | 合成 step 计步但无预算检查,顶格 confirm 突破 envelope 不变量 | validate 内预算检查:顶格 confirm → 可恢复 409 提示 raise;raise+acceptance 同请求完链（L5 C3-budget pin） |
| 状态机 C4 | budget_exhausted 入口静默吞 `review_acceptance`（违 R1） | 大声 400（unit pin） |
| 状态机 P1 | 预算检查先于动词锁,顶格停驻被裸 advance 改写成 budget_exhausted | 动词锁移到预算检查前 |
| 状态机 P2 | 合成路径丢弃 bump 后 run,心跳时间戳回滚 | validate/build 拆分,fence+persist 收归 advance 循环（与执行路径同形） |
| 状态机 P3 + 角度② P-3 + 角度⑥ | stepOutcome 新分支 admission-rejected 穿透方向不安全/不对称 | skeptic 非 proceed 与 evolution keys 分支均补 admitted 守卫,未 admitted → blocked（curation A#3 方向） |
| 角度② C-1 | 钳制不读 codes 通道:`passed+proceed+非空 codes+无 blocking finding` 越过人审（旧双扳机拦得住的形状） | 钳制谓词纳入非空 blocker_codes;并 scoped 到 passed（角度② P-2:blocked 输出不钳不警）;prompt 同步 blocking 类定义+blocked 必带 codes（角度② P-1）;unit 格 pin |
| 角度③ C-3 | "mixed-defect 必 blocked"红线无确定性强制（blocked 轴与选项级 codes 解耦） | 新确定性互锁 `MOTIVE_EVOLUTION_OPTION_BLOCKER_CODES_MISSING`（blocked 轴 ⇒ 选项 codes 非空,可重试）+ L5 pin |
| 角度③ C-2 | blocked final 带 `options_proposed` 违反已发布不变式（live 红线证据全是该形状,承重） | 裁定=放宽不变式:blocked 分支 `support_result_status ∈ {blocked, options_proposed}` + schema 正反例 |
| 角度① C-1/C-4 | **shared schema 测试在 backend 套件发现范围外且当下即红**;required 字段加进 v1 契约破坏旧 payload | keys 改 **optional**（step 审计字段先例,注释言明）;fixture 提为 builder;新增 T-133 不变式正反例;coordinator 契约测试补 `review_acceptance`/step 审计字段正反例（角度① C-2/C-3）;shared 套件纳入收口验证清单 |
| 角度⑥ | 合成校验 ref 比较未走归一化纪律 | 覆盖比较改 `normalizedPaperImplementationRefType` |
| 角度⑦ 必补 | confirm 负向分支成片未测/动词互斥未测/feasibility 门未测 | L5 负向矩阵（无确认/错 scope/错消费者/覆盖缺口/陈旧决策/动词互斥 400）+ feasibility 侧下游门 L5 + 若干 pin |
| 角度⑧ | runner 停驻记录在 resolver 之后 push（live-003 停驻本体漏记实锤）;RUNNER_VERSION 未 bump | stops 先入账再续路;v9→v10（live-004 起为 v10 语义） |

### 登记不修（含向后转移项）
- 桌面呈现层（角度⑥）:passed 批判的审计 codes 被 danger 色当阻断码渲染;confirm 出口 API-only 无 UI affordance,面板文案教"再 advance"会撞动词锁;queue re_advance 先 resolve 后撞锁的低概率死角——UI 面 backlog。
- legacy 兼容:pre-T-133 的 passed+null-disposition skeptic final 现被 proceed 门 409（fail-closed 方向正确,直连重放旧链属行为变化,此处登记即文档说明）。
- `result.blocker_codes` 联合暴露 awaiting-human 码（角度③ P-2,直连调用方勿当缺陷读）;evolution unit 文件的 P2 推导矩阵仍押在 L5(角度③ P-3 部分补齐,余量低风险)。
- **提交卫生**:P1 的 shared 契约注释+prompt 版本 v2 已被并行 T-132 会话的 `bb18d8c7` 顺手提交（共享树并发已知风险）——P3 提交无法原子含它,在提交信息中登记。

### 修复轮验证（全绿,2026-07-18）
tsc 干净;backend 全量 **2277 例 0 fail**;**shared 契约套件 374 例 0 fail**（本轮新纳入收口清单——它在 backend runner 的发现范围之外,角度①实锤当时即红）;stress EXIT=0（11 条 T-133 L5 must-case 注册覆盖）;三场景 smoke 全 completed。

### 成本汇总（gpt-5.5 基线尾声）
gs-001 $2.95/重付 8.1% · gs-002 $3.03/28.4% · gs-003 $2.46/22.5%（另有被 runner bug 消耗的 gs-002 live-003 $3.89）。P3 live 共 ~$12.3。复审出口把重付率从 T-124 基线的 8.8-14.9% 抬到 20%+ 属预期（每次 override 复跑多付一槽），是"可复审"语义的直接成本。
