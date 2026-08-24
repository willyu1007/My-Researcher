# 02 P1 工单：N2 skeptic revise 出口（形状 2，2026-07-18 开）

> **状态（2026-07-18）**：W-1..W-5 **DONE**（全量验证绿，见 `03-implementation-notes.md`）；W-6 的 mocked 面（三场景 smoke + 套件/stress）DONE，**live 重跑面按 overview 阶段划归 P3（D7 收口）统一做**。实施中新增一项勘察未列的堵洞：下游消费 proceed 门（详见实施记录）。

按 `00-overview.md` §决策 D-133-1/2 执行。目标：route skeptic 对"输入可修缺口"的正确产品形状——`passed + recommended_disposition=revise` → coordinator 既有分支（:1559-1564）→ `waiting_review` 语义停驻，revise-and-retry 出口可行使。**coordinator 零改动。**

## 红线（承 overview P1 + P0 定案）

1. revise/block 判定**确定性**（结构钳制，见 D-133-2）——LLM 不得用任何字段把自己路由绕过治理门；错误只朝安全方向（送人审）。
2. 不放松任何既有治理门：admission "blocked 且 envelope codes 空拒收"不动；blocked 输出的回显对账不动；`ROUTE_SKEPTIC_DISPOSITION_MISSING` 等技术重试分类不动。
3. gs-001/002 强路径不破：skeptic 无 blocking finding + `proceed` → final passed → lane 自动续，行为零变化。
4. 改动 scoped 到 `route_skeptic_review` 槽：**不碰**同服务 `route_architecture` 槽的推导、不碰 trace-integrity debate（未挂 lane，无 disposition 概念）、不碰 curation 既有 D2-pre2 分支语义。
5. canonical gs-003 素材语义零改动（论文数字、GT-9 故意缺口都不动）；不为血缘数字做 override（重申 N1 纪律）。

## 工作项

### W-1 契约语义形式化（contracts）
- route skeptic 角色输出/final artifact 契约块补 D2-pre2 式正交语义注释（对齐 contracts:2018-2035 curation 版措辞）：`role_status`=我能否干活（blocked=输出不可用/技术性）；`recommended_disposition`=对输入的裁决（输出可用时）；passed+revise 是设计形状；blocker_codes 在 passed 输出上是批判的实体（对应 blocking findings），不是"输出不可用"标记。
- schema 侧（:3846、:3891-3921 条件块）补 description；如需对 blocked 输出加约束保持加性、不破既有 fixture。
- 兑现 S3 移交项（`../paper-implementation-productization-hardening/03-implementation-notes.md:54`）。

### W-2 route-planning 确定性层（核心）
- **单扳机 final status**（:330-332，scoped skeptic 槽）：`final blocked ⇔ role_status==='blocked'`。passed + blocking findings → final **passed**；blocker_codes 保留在 artifact（审计实体）。
- **disposition 结构钳制**（server 端，D-133-2）：`proceed ⇔ 无 blocking finding`。LLM 报 blocking finding（`severity==='blocking'` 或 `blocks_route_progression===true`）却答 `proceed` → 服务端改判 `revise` + 新 warning code（命名对齐 curation 先例，如 `ROUTE_SKEPTIC_DISPOSITION_ECHO_DRIFT` 族）；无 blocking finding 答 revise/park/abandon → 尊重 LLM（安全方向）。
- passed 输出语义完备检查（:1415-1427）继续全跑；blocked 路径行为不变。
- 落地时核对两点（勘察未穷尽的实现细节）：① admission 对 passed + envelope codes 非空是否另有约束；② final artifact 上 blocker_codes 与 findings 的对应关系是否需要一致性检查（若加，作为确定性校验、失败按技术重试）。

### W-3 prompt 指引（辅助层，不承重）
- roleMessages（:945-954）补 role_status 分类指引：输入存在可修缺口 → `passed` + blocking findings + `revise`；`blocked` 仅保留给"我无法完成批判工作"（输入不可读/上游 ref 缺失等技术性场景），且必须带 blocker_codes。措辞参考 result-analysis 先例（result-analysis-runtime-service.ts:914）。
- prompt 变更走既有 prompt 版本/manifest 纪律（`paper-implementation-slot-parameter-manifest.ts:369` 引用面同步核对）。

### W-4 L5 先注册（写实现前注册进 stress REQUIRED 集）
- `route skeptic passed with blocking findings routes to waiting_review semantic stop (not blocked, not queued)`
- `route skeptic role_status blocked stays honest terminal blocked with queue item and mandatory blocker codes`
- `route skeptic proceed with blocking findings is deterministically clamped to revise with drift warning`
- `route skeptic proceed without findings keeps lane auto-advance unchanged`（gs-001/002 回归面）

### W-5 测试
- unit：推导矩阵（role_status × blocking-finding 有无 × LLM disposition 各值 → final status/disposition/warnings），含钳制与 drift warning 正反例。
- integration：coordinator 收 skeptic passed+revise final → step `waiting_review`、run `waiting_review`、**不入 DecisionWorkQueue**；re-advance（可带 payload override）整槽重跑。
- **revise-and-retry 全链行使证据**（用户裁定③）：integration 或 scratch 副本素材——停驻 → 修输入（payload override 补齐缺口）→ re-advance → skeptic proceed → lane 走完 validation_cycle/feasibility。不动 canonical gs-003。

### W-6 收口验证
- 全量 tsc + stress + smoke；golden 三场景冒烟。
- gs-003 live 重跑诚实预期（用户裁定③）：lane A `waiting_review → 一次载荷不变 override → 大概率仍 revise → waiting_review_terminal`；血缘如通到 20/20 记录为副产品、不作目的，预期仍 18/20（GT-9 缺口未修）。runner 对 lane A 的 waiting_review 处理应复用既有停驻纪律（:1132-1207 通用面），核对无 curation 专属假设。
- gs-001/002 重跑或冒烟确认 skeptic proceed 路径零变化。

## 交付物
- 代码 + 测试 + L5 注册 + 契约注释 + prompt v2。
- `03-implementation-notes.md` 记录实施发现（含 W-2 两个核对点的结论）。
- 8 角度复审 + near-prod 按 P3（D7）收口时统一做；本工单完成判据=W-1..W-6 全绿。
