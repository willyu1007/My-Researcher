<!-- INIT:STAGE-A:RISK -->

# Risks and Open Questions

## Conclusions (read first)
- Highest risk areas:
  - LaTeX 解析定位不准，导致建议无法准确落点。
  - LLM 幻觉引入杜撰结果或不实引用。
  - 公平对标信息不完整，导致建议不可执行。
  - 桌面端长时间运行引发内存泄漏或任务堆积，影响稳定性。
  - 高频外部 API 调用触发限流、成本失控或上游波动放大。
- Biggest unknowns:
  - 8 个必要子功能的实现边界（内部实现与外部接口拆分）尚未最终确定。
- Decisions needed before build:
  - 已决策：独立工作区优先，写作阶段通过集成调用 Prism 等成熟工具。
  - 已决策：桌面端以 macOS 为首发目标，架构保持跨平台扩展能力。
  - 已决策：跨平台发布节奏为 M0(macOS) -> M1(Windows) -> M2(Linux)。
  - 已决策：部署策略默认本地化优先，首发面向个人单用户场景。
  - 已决策：产品需与 Git 工作流深度结合，支持个人研究版本管理。
  - 已决策：Git 集成采用方案 B（本地优先 + 安全远程），M0 限定安全远程能力。
  - 已决策：M0 启用外部文献检索，采用可追溯检索 + 摘要级 RAG + 项目级文献注册表。
  - 已决策：M1 启用全文 RAG（项目级默认关闭），并执行授权分级与同步边界控制。
  - 已决策：同一用户多设备通过云数据库控制面同步，本地仍为主存储。
  - 已决策：M1 可选引入 Qdrant 作为云端向量层，仅存授权可同步内容。
  - 已决策：产品能力基线按 8 个子功能模块组织（实现细节后续讨论）。
  - 明确 M0 功能边界与不做项。
  - 明确默认目标方向的规则集优先级。
  - 明确首批集成对象（Prism/Overleaf/本地仓库）。

## Open questions (prioritized)
1. Question: 8 个子功能的实现边界如何拆分（内部实现 vs 外部接口调用）。
   - Why it matters: 影响架构复杂度、开发排期和后续可维护性。
   - Owner: 产品与技术联合评审。
   - Options: 先以内核实现为主；先以接口编排为主；按模块分层混合推进。
   - Decision due: Stage B 期间。

## Risks

- Risk: LaTeX 自定义宏和复杂模板导致解析错误。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: MVP 采用章节级定位，后续逐步增强解析器并建设样本回归集。
  - Trigger: 导入文档后结构树缺失关键章节或引用。

- Risk: LLM 输出未经证据支持的实验结论。
  - Impact: 高。
  - Likelihood: 中高。
  - Mitigation: 强制 Evidence 引用校验，缺少证据即禁止生成定量结论。
  - Trigger: 建议内容中出现不存在于 Evidence 的数字或引用。

- Risk: 公平对标信息缺失导致审稿风险长期暴露。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: Protocol 输入设为必填并在报告中作为高风险项前置展示。
  - Trigger: baseline 条目缺少预算、调参范围或数据处理说明。

- Risk: 本地优先模式下备份策略不足导致数据丢失风险上升。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: 提供本地快照、自动备份提醒与 Git 历史恢复指引。
  - Trigger: 设备故障、误删或本地存储损坏导致项目不可恢复。

- Risk: 桌面端长时间运行导致内存泄漏、句柄泄漏或任务堆积。
  - Impact: 高。
  - Likelihood: 中高。
  - Mitigation: 增加长稳压测、资源监控、任务 TTL、死信队列与自动恢复机制。
  - Trigger: 运行时内存持续增长、队列积压或进程异常退出频繁。

- Risk: 高频外部 API 调用触发限流、配额耗尽或成本超预算。
  - Impact: 高。
  - Likelihood: 高。
  - Mitigation: 实施分级限流、指数退避、熔断、幂等键与成本预算告警。
  - Trigger: API 429/5xx 激增、单日成本异常上升、调用成功率下降。

- Risk: 文献去重策略不完善导致重复检索与重复入库，影响成本与质量。
  - Impact: 中高。
  - Likelihood: 中高。
  - Mitigation: 采用 DOI/arXiv/title+author+year 多级去重键，并建立项目级注册表与查询缓存。
  - Trigger: 同一文献出现多个重复实体，或同一查询频繁触发远程拉取。

- Risk: 摘要级 RAG 证据粒度不足导致结论偏差。
  - Impact: 中。
  - Likelihood: 中。
  - Mitigation: 强制附来源锚点与不确定性标注，并将关键结论标记为需人工复核。
  - Trigger: RAG 输出与原文摘要不一致，或无法定位来源段落。

- Risk: 多设备同步冲突处理不当导致项目状态不一致。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: 采用增量日志与版本游标，同步冲突使用结构化自动合并加人工确认兜底。
  - Trigger: 同一项目在多设备频繁编辑后出现状态漂移或重复变更。

- Risk: 云向量层配置错误导致受限文献向量被错误上传。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: 入库前执行 rights 校验与策略拦截，审计所有向量写入事件并支持回收。
  - Trigger: `RESTRICTED` 文献出现在云向量库中或权限审计报警触发。

- Risk: Git 集成处理不当造成冲突放大或仓库状态被破坏。
  - Impact: 高。
  - Likelihood: 中。
  - Mitigation: 采用方案 B 边界，禁止危险默认操作，关键操作前展示 diff 与确认，并提供一键回退。
  - Trigger: 提交历史异常、冲突未正确处理或用户仓库出现非预期变更。

## Assumptions register (optional)
- Assumption: 用户可以提供最基本的 claims 草案与实验上下文。
  - Validation plan: 在首批试用项目中统计缺失输入比例并优化引导模板。
- Assumption: 投稿前自检报告是用户最常用高价值入口。
  - Validation plan: 通过使用日志与访谈验证报告调用频次和修改采纳率。

## Verification
- All unresolved items from other docs are consolidated here.
