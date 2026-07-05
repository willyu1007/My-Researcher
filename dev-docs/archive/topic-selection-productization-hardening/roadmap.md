# Roadmap

## Why This Exists
- 2026-06-11 对选题管理模块做了一次全链产品化审计（节点清单 / harness 架构 / LLM 参数规范化 / 设计文档四路并行），结论：政策层（DMP-01..12 全锁定）与契约层（frozen input / replay hash / provenance envelope）成熟度高，但产品化存在系统性缺口。
- 缺口分散在多个已完成任务包（T-089/T-107/T-112/T-115）的边缘地带，没有单一 owner。本任务包统一收口全部审计发现（F-01..F-11，见 `00-overview.md`），并配齐完备测试。

## Target Outcome
- SSOT 矩阵（T-089 `06-workflow-matrix.md`）与 v1b 实现重新对齐，且有自动化校验防止再漂移。
- 产品可用的薄编排层（Run Coordinator）：确定性链自动推进、loopback 预算、节点/run 超时、并发防护、断点恢复——harness 原子语义不动。
- v1b N8 价值评估具备信号触发的有界对抗 debate（复用 v1c N2 运行时形态，不引入第二套 debate 实现）。
- Decision Memory 读侧投影（跨 run 负面记忆）接入 v1a N6 / v1b N6 / v1b N8。
- 参数规范化清零：N8 去硬编码、v1b N4/N6 profile 注册、typed provider_overrides、prompt/schema registry、cost_usd 点亮。
- 每项交付配套：单测 + 集成 + 全链 e2e（mocked acceptance 隔离）+ 故障注入负例 + 既有不变量回归。

## Exit Criteria
- 矩阵 node_id 集合 == 代码注册节点策略集合（脚本校验，注入漂移时必失败）。
- 全链 v1b N1→N11 可由 coordinator 在 acceptance 隔离下自动推进至人审/blocked 停驻点；并发双发、崩溃恢复、loopback 超额三类故障注入测试全绿。
- topic-selection 域内不存在绕过 model profile registry 的 provider/model 选择路径。
- 既有不变量回归全绿：v1b legacy write 路由仍 404；`mocked_llm` 在 product run_mode 被拒；replay 幂等；人审 `human_delegated` 路径与 runtime 兼容共存。

## Milestones
- **M0** SSOT 对齐 + 防漂移校验（Phase 0）
- **M1** 参数规范化收口（Phase 1）
- **M2** Run Coordinator + 鲁棒性（Phase 2）
- **M3** v1b N8 有界对抗 debate（Phase 3）
- **M4** Decision Memory 投影（Phase 4）
- **M5** 复杂度治理：harness 拆分 / 压缩 profile 化 / per-provider token 估计（Phase 5）

## Rollback Posture
- Phase 0/1 为文档+注册层修正，可单独回滚。
- Phase 2 coordinator 是 harness 之上的新增层，关闭入口路由即回退到现状（手动逐节点驱动）。
- Phase 3 debate 默认关闭（信号触发），回退 = 触发器恒 false。
- Phase 4 memory 是输入性上下文，回退 = 不注入 packet，不影响权威决策。
- Phase 5.1 为机械重构，依赖拆分前后全套件对比保护。
