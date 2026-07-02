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
- pipeline 声明：`PAPER_IMPLEMENTATION_COORDINATOR_PIPELINES` 代码级 const 注册表（lane A 四步 / lane B 两步 / board 单步），非用户可配置、无分支 DSL；多分支/合流语义留二期。

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
