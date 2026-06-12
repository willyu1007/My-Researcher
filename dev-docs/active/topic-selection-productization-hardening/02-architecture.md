# 02 Architecture

## 分层不变量（本任务包不动的东西）
```
┌ Run Coordinator（本包新增，薄）────────────────────────────┐
│ run 级状态投影 / advance-until-blocked / loopback 预算 / 超时 │
└──────────────┬───────────────────────────────────────────┘
               │ 只调 harnessService.invokeNode（不绕、不复制）
┌ WorkflowHarness（不动）──────────────────────────────────┐
│ 单节点原子执行：assert → admission → hash → replay →       │
│ authority/policy blockers → runner → route_decision        │
└──────────────┬───────────────────────────────────────────┘
               │ model-like 槽位
┌ AgentOrchestrator（不动，Phase 1 收紧入参来源）────────────┐
│ prompt packet / 压缩 / token 预算门 / 结构化输出校验 / audit │
└──────────────┬───────────────────────────────────────────┘
┌ ModelProfileRegistry + BackendLlmGateway（Phase 1 强化）───┐
│ profile 解析 SSOT / typed overrides / 价格表 / telemetry    │
└───────────────────────────────────────────────────────────┘
```
- 人审兼容不变量（T-115）：human/delegated 节点经 harness `human_delegated` 模式写入；coordinator 在这些节点**停驻**，绝不代行人审。
- DMP-10 单路径：debate / memory / coordinator 均不得新建第二条 LLM 调用路径、第二个 hash 实现、第二套 trace 模型。

## Run Coordinator 设计（Phase 2）
### 接口草案
```ts
interface TopicSelectionRunCoordinatorService {
  getRunState(workflowRunId): RunStateProjection;        // 2.1 读侧投影
  advanceUntilBlocked(input: {
    workflow_run_id: string;
    max_steps: number;                                    // 步数上限，防失控
    execution_profile?: string;                           // 命名 profile（DMP-12 形态）解析各节点默认 execution_spec
    stop_before_node_ids?: string[];                      // 显式断点
  }): AdvanceReport;                                      // 每步的 node_id/route_decision/停驻原因
}
```
### 推进规则表
| harness route_decision | coordinator 行为 |
|---|---|
| `invoke_next` | 由 handoff_ref 组装下一节点 frozen_input，继续 |
| `loopback` | loopback 计数 +1；≤预算 → 按 loopback context projection 组装重入；>预算 → 停驻 `LOOPBACK_BUDGET_EXHAUSTED` |
| `retry` | 仅技术类重试且次数受限（对齐 DMP-08 窄重试） |
| `blocked` / `requires_human_review` / `wait` | 停驻并返回原因 + blockers |
| `stop_v1b_complete` | 停驻，提示 v1c 入口 |
- 节点 execution_spec 解析顺序遵循 DMP-11 优先级（instance > slot > call-site > scenario default > profile default），coordinator 只在 call-site 层注入命名 profile 的默认值。
- frozen_input 组装复用 T-115 已验证的路径（N4 handoff hash 等 lineage 均可从持久化状态取回，无需重算上游）。

### 并发与幂等方案（2.0 先核实再定）
- 现状：v1b invocation trace 为 control-plane artifact，prisma 无 v1b invocation 模型；replay 探测是查询-后-执行，存在双发窗口。
- **方案 A（倾向）**：新增 prisma 表（或在 artifact 索引表上）对 `(workflow_run_id, node_id, node_attempt_id)` 加 unique constraint，invokeNode 持久化前先占位（insert-or-conflict）；冲突方收到 `CONCURRENT_ATTEMPT` blocker 或既有结果。迁移走 `sync-db-schema-from-code`。
- **方案 B**：coordinator 层 advisory lock（per workflow_run_id 串行化推进）。实现快但只约束走 coordinator 的调用，挡不住直接打 harness 路由的并发——作为 A 的补充而非替代。
- 判据：若核实发现 artifact 层已有等效唯一性，则只做 B + 文档化；否则 A+B。

### 与 T-088 的边界（D3）
- coordinator / RunStateProjection / 预算 / 超时全部在 harness **外**新增 service，不改 `invokeNode` 签名与生命周期。
- 唯一可能触碰 harness 本体的是方案 A 的占位写入点与 Phase 5.1 拆分——动手前在 T-088 / T-123 两包 implementation-notes 各记联合决策。

## v1b N8 有界对抗 debate（Phase 3）
- 复用 v1c N2 的 bounded sequential 形态：角色表驱动（`role_order: assessor_draft → value_critic → assessor_repair → synthesizer_final`），每角色 = 一次 orchestrator 调用（context policy profile + 结构化输出 + 压缩 + token 预算），prior_role_artifacts 前向传递；`synthesizer_final` 是唯一外部输出口（对齐 DMP-03 arbiter 语义）。
- 工程形态：把 v1c N2 runtime 的角色序列执行器抽成共享模块（输入：角色表 + 各角色 profile id + admission 输入；输出：role artifacts + final），v1c N2 与 v1b N8 各自提供角色表。**不复制实现**。
- 触发器（D2）：T1 borderline 区间 / T2 rerun 漂移 / T3 维度冲突 / T4 operator 强制，判定为确定性函数（node policy 配置阈值），结果记入 provenance（`debate_triggered_by: [...]`）。未触发 → 既有单 agent 路径，零行为变化。
- 政策落点：新增 DMP-13（debate 原语二分 + 触发器语义）；矩阵 N8 行更新。

## Decision Memory 投影（Phase 4）
- 数据来源（全部既有权威对象，只读）：v1a 否决/park 的 NeedCandidate 与 adjudication 理由、ValidatedNeed 非 validate 路径、v1b ValueDispositionDecision 非 advance 记录、N7 failed trial 综合、AcceptedRisk、recheck 记录。
- 产出形态：`TopicSelectionDecisionMemoryPacket@v1` context packet（title-card 范围 + 可选全局范围），含条目摘要 + 来源 ref + hash；经 T-112 压缩/预算门后进 prompt packet。
- 注入点：v1a N6 / v1b N6 生成上下文（dedup 材料）、v1b N8 负面记忆输入。
- 非权威边界：packet 标记 `payload_is_not_business_authority`；gate 告警走既有 warning_codes 由确定性校验器判定（如"候选与历史否决项相似度超阈"先不做语义判重，v1 只做 ref/hash 级与标题级精确/规整匹配，语义判重留待后续任务）。

## Registries（Phase 1）
- **Typed provider overrides**：shared contracts 定义三 provider 的 override 类型联合；registry 加载期 zod/AJV 校验 fail-fast；gateway 适配层唯一消费方（DMP-06 边界不变）。
- **Prompt/Schema registry**：轻量 in-code registry（id@version → 内容 hash + 内容引用），启动期断言所有调用点引用已注册；不做运行时热更新。
- **价格表**：配置数据（`config/` 下 YAML/JSON），gateway 计算 `cost_estimate_usd`；缺价目 → null + warning。

## 关键风险
| 风险 | 缓解 |
|---|---|
| 与 T-088 Phase 2 并行改 harness 周边冲突 | D3 联合决策 + 本包 harness 本体改动仅限方案 A 占位点与 5.1 拆分，且都排后 |
| prisma 迁移影响其他模块 | 走 `sync-db-schema-from-code` skill + `ci:prisma-smoke`；新表只增不改 |
| 5.1 拆分 12.7k 行文件与并行任务冲突 | 排最后；拆分窗口内冻结其他 v1b harness 改动；前后全套件 + replay 对比保护 |
| debate 触发器阈值拍脑袋 | 阈值进 node policy 可配；初值用既有 near-prod deep-test 数据标定，`04-verification.md` 记录标定证据 |
| memory packet 撑爆上下文 | 走 T-112 token 预算门 + 压缩；packet 条目数上限进 context policy profile |
| 矩阵校验脚本与文档格式耦合脆弱 | 解析仅依赖表格 `node_id` 列约定；格式约定写入 T-089 矩阵文件头 |

## 边界外提示（不在本包做）
- literature 模块 LLM 调用未走 normalizedParams/registry（规范化 ~40%），与 topic-selection 不一致——建议未来独立任务包收编进同一 gateway 规范。
