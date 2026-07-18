# 04 P2 工单：N6 evolution confirm-and-continue 出口（2026-07-18 开）

> **状态（2026-07-18）**：W-1..W-6 **DONE** + W-7 的 mocked 面（tsc/全量套件/stress/三场景 smoke 全绿）DONE,详见 `03-implementation-notes.md` §P2;live 面归 P3。实施中一处有意识的边界演进：coordinator 零权威写依赖面守卫测试扩展了两个只读单方法 reader。

按 `00-overview.md` §决策 D-133-2/3 执行。目标：evolution 的"decision support 就绪、血缘变更选项待人决策"停驻从终态 blocked 变为 waiting_review 语义停驻，并给出 **confirm-and-continue** 出口（人走权威链建确认+决策后，advance 带 ref 校验直通、不重跑）。

## 设计定案（承 P0 决策 + 勘察事实）

- **确定性推导（evolution 服务）**：final artifact 加性新字段 `human_decision_required_option_keys: string[]`——挑战后选项中满足 (a) PORTFOLIO_CHANGING（既有 :333-339 判定集）且 (b) 已合规打旗（`human_confirmation_required=true`，护栏保证）的 option keys。纯结构推导，零 LLM 裁量。
- **聚合修正**：选项满足 (a)+(b) 且 (c) `challenge_check.human_confirmation_status==='blocked'` 且 (d) 其余四轴均 ∈ {satisfied, not_applicable} —— 即"唯一拦路轴是等人确认"——该选项的 `blocker_codes` **不并入 final blockers**（保留在选项上作审计）。混有其他缺陷轴 → 照旧并入（诚实 blocked）。role artifact 聚合不变（审计诚实）。
- **coordinator 停驻分支**：evolution 槽 && `result.status==='passed'` && final admission admitted && `human_decision_required_option_keys` 非空 → `waiting_review`。blocked final 照旧终态（红线：不开 blocked→waiting_review 路）。
- **confirm 动词**：advance 请求加性字段 `review_acceptance: { slot_id, decision_ref, acceptance_actor_id }`。coordinator 确定性校验：① run=waiting_review 且首个非 passed step 是 evolution 槽 waiting_review；② slot_id 匹配且属 confirm 家族（动词↔停驻家族=槽映射：evolution=confirm；skeptic/curation=revise）；③ `motiveDecisionReader.findMotiveEvolutionDecisionById` 查得决策，`application_status ∈ {approved, applied}`；④ 决策 `source_motive_refs` 覆盖槽 final artifact 的 `target_motive_refs`（经 runtimeArtifactReader 读 payload + hash 复核，B3 lookback 先例）；⑤ 决策 `human_confirmation_required` 时 `confirmation_ref` 非空，且经 `confirmationReader` 复核该确认 scope=`motive_evolution_decision`、`consumed_by_ref` 指向该决策。通过后**合成 passed step**（新 attempt id、provider_call_count=0、artifact refs 从停驻 step 复制、带 acceptance 元数据），advance 循环正常续行（evolution 为末槽 → completed）。
- **动词锁（两动词永不混淆）**：evolution waiting_review 停驻上，无 `review_acceptance` 的 advance（含 payload override）→ 409 fail-closed；revise 家族（skeptic/curation）停驻上带 `review_acceptance` → 400。`review_acceptance` 与 `slot_request_payload_overrides` 同请求并存 → 400。
- **最小审计（两动词，免迁移——step JSONB 整包存储先例 budget_raise_events）**：step 加性可选字段 `advance_holder_id`（每次 attempt 记录发起 holder，覆盖 revise 动词的 actor 落盘缺口）与 `review_acceptance`（confirm 合成 step 上记 decision_ref + acceptance_actor_id + human_confirmation_ref）。契约 interface + wire schema properties + schema 测试同步；in-memory/prisma repo 零结构改动。
- **DI**：coordinator options 新增 `motiveDecisionReader: Pick<PaperImplementationMotiveRepository,'findMotiveEvolutionDecisionById'>` 与 `confirmationReader: Pick<PaperImplementationHumanConfirmationRepository,'findHumanConfirmationRecordById'>`。构造点四处同步：app.ts、coordinator 单测 buildCoordinator、L5 两处 fixture。

## 红线

1. 不放松 evolution 既有护栏：`MOTIVE_EVOLUTION_HUMAN_CONFIRMATION_GATE_MISSING` 强制打旗、challenge_check 双向互锁、schema 人门不变式全不动。
2. blocked final（混合缺陷）保持终态 blocked + 队列项；不为凑通路把混合缺陷也送 waiting_review。
3. 确认/决策的权威链（consume-before-write、目标覆盖、human actor 强制）不在 coordinator 复制实现——coordinator 只做只读复核 + 引用落盘。
4. gs-002 等"无 park/split 提案"的自动完链路径零变化（`human_decision_required_option_keys` 为空 → 无停驻）。
5. canonical golden 素材零改动。

## 工作项

- **W-1 契约**：MotiveEvolutionArtifact + schema 加 `human_decision_required_option_keys`（含 no_evolution_needed/failed_runtime 强制空的不变式对齐）；coordinator-contracts advance 请求加 `review_acceptance`、step 加审计字段；schema 测试。
- **W-2 evolution 服务**：推导 + 聚合修正（final 构建两点：finalPayload 与 preflight-blocked → []）。
- **W-3 coordinator**：停驻分支 + confirm 校验/合成 step + 动词锁 + audit 字段落盘 + DI 扩展（四构造点）。
- **W-4 L5 先注册**：① confirmable 选项 park 全链 waiting_review（final passed、codes 不聚合、无队列项）；② confirm-and-continue 完 lane 零重跑（gateway calls 不增）；③ 混合缺陷 blocked 终态+队列项（红线）；④ evolution 停驻拒 payload-override/裸 advance（动词锁 409）；⑤ confirm 拒未批决策/目标不覆盖/错家族槽（409/400）。
- **W-5 unit**：evolution 推导矩阵（聚合排除 × 打旗 × 轴组合）；coordinator 动词锁与合成 step 断言;契约 schema 正反例。
- **W-6 runner**：motive lane 停驻时走权威链（建确认 scope=`motive_evolution_decision` → POST `/motive-evolution-decisions`（approved,含 trace_manifest_id）→ advance 带 `review_acceptance`）;非 park/split run 零变化。live 触发非确定,验证以测试面为主。
- **W-7 验证**：tsc + 全量套件 + stress + 三场景 smoke;live 面归 P3。

## 交付物
代码 + 测试 + L5 注册 + 契约 + runner 接线;实施发现记 `03-implementation-notes.md` §P2。
