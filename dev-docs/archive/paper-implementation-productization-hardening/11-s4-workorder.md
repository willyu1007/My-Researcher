# 11 S4 工单：观测面 + 产品面 + 档位影子（开工 2026-07-15）

## 定位与决策
- 切片：S4（D8 第五位；S0/S1/S2/S3/S5×3 已闭合）。用户裁定（2026-07-15）：**S4 与 D2 不捆绑**——S4 保持纯观测/产品面（零 runtime 语义变更），D2 档位独立成片紧随其后；排序理由=风险隔离、先测量后调档（D10"成本重付率有数"需全档位基线做对照）、D10 终验收必须在带档位的产品真实形态下进行。
- S4 吸收移交项：blocked lane 队列分类退役 unclassified（S3 移交，观测域）；桌面确认入口 + blocker 推导改 ref（S0 移交）。**shadow ComplexityAssessment**（档位判定只记录不生效）随 S4 落，为 D2 白拿校准数据。
- D2 切片（后续）吸收：evolution 槽内 designer→challenger 内容注入（B3-analog）、skeptic/curator disposition 语义形式化（revise→waiting_review 出口）。

## 工作项

### S4-A 运行时遥测 sink（backend）
- **契约**：`PaperImplementationRuntimeTelemetryRecord@v1`（加性新契约）：per provider-call 粒度——implementation_project_id、slot_id、role_slot_id、run_id、call_index、execution_mode、provider/model_option、latency_ms、prompt/completion tokens、cost_usd（gateway `computeLlmCostUsd` 既有值，不再丢弃）、outcome（passed/retried/failed 码）、retry_kind（technical/semantic）、compression_applied、shadow_tier（见 S4-C）。run 级聚合视图：total_cost_usd、**repaid_cost_usd/重付率**（重试+重跑调用的成本占比，D10 验收指标）、per-slot 分解。
- **持久化**：仓储三层 + 新表（迁移**只写不 apply，待用户审批**，纯加性）；写入点=各 slot 服务经 orchestrator 回传的 provider provenance（单源采集，不改 slot 语义；fail-open——遥测写失败不影响 run，但记 warn）。
- **查询面**：GET 路由——项目级 run 列表遥测摘要、单 run 明细、项目级重付率聚合。
- 红线：不改任何 slot/coordinator 的执行语义；provenance policy 不变（不落 prompt 正文/raw response）。

### S4-B 桌面 runtime 视图 + 确认入口（desktop）
- PaperImplementationWorkbench 增 runtime lane 可视：coordinator run 列表（状态/lane/预算消耗）、step 时间线（slot、outcome、blocker codes、admission 结果、runtime_artifact ref）、决策队列面板（queue_type/retry/cooldown/dedup、resolve+re_advance 操作走既有路由）、run 遥测摘要卡（成本/重付率/调用数，S4-A 数据）。
- 确认入口（S0 移交）：HumanConfirmationRecord 列表+创建+目标绑定展示；消费状态可见（consumed_by_ref）。blocker 推导改 ref（S0 移交项照录）。
- 纪律：只读展示 + 既有路由操作，桌面不新增任何权威写入面；对 runtime/queue 的操作全部经既有 HTTP 路由。UI 质感对齐 workbench 现有风格。

### S4-C shadow ComplexityAssessment（record-only，为 D2 校准）
- `assessDebateComplexityShadow@v0` 纯函数（shared）：输入=可复算请求统计（reviewed statement 数、retrieval packet ref 数、prior blocker 密度、target 类型），输出=推荐档位（light/standard/full）+ inputs_hash + rationale codes。**只写入遥测记录的 shadow_tier 字段，不影响任何执行路径**。三个 debate 槽（trace-integrity/P1×2）+ evolution 记录。
- L5 必检：shadow 判定可复算（同输入同档）+ 零行为影响（有无 shadow 计算，run 产物 hash 不变）。

### S4-D 队列分类退役 unclassified（S3 移交）
- coordinator 队列分类兜底 `unclassified` 收窄：blocked lane（run 级 blocked/budget_exhausted 与 step 级 failed_runtime）按 lane×outcome×trusted-code 的确定性映射表全覆盖；映射表穷举测试（枚举全部 trusted 码与 outcome 组合断言零 unclassified）。真正未知码保留 unclassified 但加 L5 负例钉住其唯一可达路径。

## 收口（D7）
新增必检先注册；全量 runtime-stress + prisma smoke + 双包 tsc + 桌面 typecheck/lint；迁移经用户审批后 apply + smoke 复跑；**gs-001 live 一跑采全档位遥测基线**（素材 v3 不动，run 007，采集 cost/重付率基线留档）；code review（8 角度惯例）+ 修复轮；提交。
