# 04 Verification

## 测试分层总览
- **单测**：单组件、mock 依赖——coordinator 故障恢复分支（W-04）、准入/运行时 service（W-05）、N6 触发器（W-07）、v1c recheck 发射（W-08）、provider-diverse profile 解析（W-09）、标定分析（W-13）。
- **集成**：组件 + 共享 service（harness）——N6 debate 准入路径、人审 N2/N5 回归。
- **全链 e2e（mocked acceptance 隔离）**：N6 debate（生成→triage escalation→debate→synthesizer→gate 准入）、coordinator 故障注入。
- **不变量回归 / replay 守卫**：legacy 404、mocked product 拒绝、replay 幂等、N1 golden replay-identity（W-12 每 slice）、T-108 前向唯一（W-08）、debate byte-identity（W-09）。
- **执行模式隔离**：`mocked_llm`（test DB / fixture）vs `provider_llm` product（live，门控）vs `codex_assisted`（operator）边界承 T-088 D-04。

## Phase 验证矩阵
### Phase 0（夯实）
- W-01：提交后 backend 套件 + tsc 双绿；`git status` 核对仅剩并行 session 文件（排除清单逐项确认）。
- W-02：coordinator N11 穿越单测（deterministic 自动穿越 / model-like 正确组装 input）。
- W-03：grep 确认无生成方法测试引用（删则连带删测）；卫生改动零行为、套件无回归。

### Phase 1（鲁棒性）
- W-04：三类负例——feedback 工件缺失 → 结构化报错（非 500）；upstream blocked → `halt('upstream_blocked')`；node_timeout → halt 附 retry 指引；nonce 守卫拒陈旧重跑。
- W-05：~12 service 各 ≥1 `legacy_unverified` 拒绝 + 1 happy path；N6 dedup warning 码、N8 阈值 + provisional tripwire 交互断言。
- W-06：provisional 门禁文档化；可选覆盖入口隔离 A/B 测试；确认未翻 `provisional:false`、tripwire 仍发射。

### Phase 2（选项 A：harness 一次拆透）
- W-12：每 slice 前后 N1 golden replay-identity 守卫 + v1b 全套件 + `topic-selection:v1a-harness-replay-smoke` + replay 幂等对比（同输入同 replay key 同结果）；`pnpm typecheck` 0；harness 类对外契约不变；**一次拆透**——壳仅余生命周期 + 持久化、纯函数簇出文件、行数显著下降；D-T127-01 登记。

### Phase 3（选项 B）
- W-07：触发器单测全分支（原语对应的候选质量 gate）；mocked debate e2e 绿 + provenance `debate_extension` 完整 + **触发后正常继续**（escalation→debate→synthesizer→gate 准入→下一节点）；不触发时既有 N6 路径回归不变（对比）；**harness 改动 replay byte-identity 保持**（差分探针 prompt_packet_hash / runtime_invocation_context_hash / source_hashes 跨角色 byte-identical）；D-T127-02 登记 + 矩阵 N6 行 reserved→implemented + T-089 留痕。
- W-08：recheck 发射单测（建议性记录 + 排序）；**T-108 前向唯一回归绿**（无新回环路由、downstream-recheck 仍 record-only）。
- W-09：provider-diverse execution plan 解析单测（slot_overrides 映射）；debate byte-identity 不变；既有 profile 解析回归。

### Phase 4（选项 C：工作台收口，核心段终点）
- W-10：`topic-workbench-ui-vs-flow-gaps` 审计条目逐条结论；只读节点（N7/N9/N10）注释；gate 拒绝 UX（可选 trace 细化）；desktop typecheck + UI gate 0/0。
- W-11：迁移脚本对样本旧 option-set backfill `n4_handoff_hash`，验证人审 N5 选择不再 409；脚本幂等可重跑；人审 N2/N5 e2e 回归绿。**→ 核心段 sign-off。**

### Phase 5（选项 D：延期尾巴，record-and-defer）
- W-13：标定姿态登记 record-and-defer；N8 维持 provisional + tripwire；可选 mock dry-run **仅自检工具链不产出阈值**；真实语料就绪后标定分析单测、阈值更新经 contracts 数据层、达标证据（样本量 ≥100 多 provider、precision/recall 误报 <5%）记本文件；不达标维持 provisional（零产品风险）。

## 回归清单（每个 Phase 收口必跑）
- `apps/backend` v1b 全套件（当前基线 1332/0 fail / 35 skip）。
- `pnpm --filter @paper-engineering-assistant/shared test`（当前 255/0）。
- `cd apps/backend && npx tsc --noEmit -p tsconfig.json`（0 error）。
- `topic-selection:v1b-harness-e2e` / `v1b-runtime-stress`。
- F-11 replay-identity 守卫（N1 golden 哈希，`topic-selection-v1b-workflow-harness-service.unit.test.ts`）。
- desktop typecheck + UI gate 0/0（涉 Phase 4 选项 C）。
- 不变量：v1b legacy write 404、mocked product 拒绝、replay 幂等、T-108 前向唯一。

## 运行记录
> 各 Phase 收口验证在此追加（日期 + 套件计数 + commit hash + 结论）。

- **2026-06-16 · Phase 0 / W-01 预检 + 落地**：backend 全套件 `apps/backend pnpm test` = **1367 tests / 1332 pass / 0 fail / 35 skip**（基线吻合）；`pnpm --filter @paper-engineering-assistant/shared test` = **255/0**；backend & shared `tsc --noEmit` = **0**；W-01 文件单测 32/0、coordinator 单测 47/0。结论：W-01 残留落地、双绿，工作树仅余并行 session 文件。重定标：W-02 N11 recipe 条目已存在→仅缺终端穿越测试；W-03 ① 已 moot。
- **2026-06-16 · Phase 0 收口 / W-02 + W-03**：W-02 补 N11 终端穿越单测（coordinator 16/0）；W-03 ② 丰富 6 处 admission `legacy_unverified` 消息（码不变）+ ③ decision-memory SSOT 注记入 contracts。证据：affected admission+projection 单测 32/0；backend 全套件 **1367 tests / 1333 pass / 0 fail / 35 skip**；shared **255/0**；backend & shared `tsc --noEmit` **0**。结论：**Phase 0（M0）收口** —— W-01/02/03 全 done，核心段进入 Phase 1。

### （待开工）
