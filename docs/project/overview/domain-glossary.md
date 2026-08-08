<!-- INIT:STAGE-A:GLOSSARY -->

# Domain Glossary

## Purpose
Define domain terms used across requirements and implementation.

## Terms

### Claim
- Definition: 论文中的可检验主张，必须能被实验、定理或系统指标支撑。
- Synonyms: contribution claim, 主张。
- Non-examples: 纯宣传语或没有证据路径的泛化陈述。
- Notes: 每条 Claim 需要绑定至少一个 Evidence。

### Evidence
- Definition: 用于支撑 Claim 的证据对象，包括表格、图、定理、实验日志或附录条目。
- Synonyms: 证据条目, artifact。
- Non-examples: 未记录来源的主观判断。
- Notes: Evidence 应包含稳定引用标识与来源。

### Claim-to-Evidence Traceability
- Definition: Claim 与 Evidence 的映射关系，用于覆盖检查与缺失项诊断。
- Synonyms: 证据链追溯表。
- Non-examples: 只在正文描述但未建立结构化映射。
- Notes: 投稿前检查必须输出该映射。

### Baseline
- Definition: 对比方法集合，用于评估新方法在公平协议下的增益与代价。
- Synonyms: 对标方法, comparator。
- Non-examples: 未说明训练预算或调参策略的松散对比。
- Notes: Baseline 需要与 Protocol 配套。

### Fair Comparison Protocol
- Definition: 规定数据处理、训练预算、超参范围和评测设置的公平对比协议。
- Synonyms: 公平性协议, protocol。
- Non-examples: 只复现结果但缺少资源与策略说明。
- Notes: 协议缺失会直接触发高风险问题。

### Reproducibility Checklist
- Definition: 复现实验所需关键信息清单，覆盖数据、预处理、超参、硬件、随机种子和评测脚本。
- Synonyms: 复现清单。
- Non-examples: 只给出代码仓库链接但无运行条件。
- Notes: 清单缺口应在报告中显式标红。

### Reviewer-aligned Report
- Definition: 按审稿维度组织的质量报告，包含风险等级、定位与可执行改动建议。
- Synonyms: 审稿人式自检报告。
- Non-examples: 仅输出泛化建议且无法定位。
- Notes: 报告是投稿前与返修阶段的核心交付。

### Desktop Workspace
- Definition: 桌面端独立应用工作区，整合项目管理、研究整理、自动化任务与质量检查流程。
- Synonyms: 桌面工作区, desktop app workspace。
- Non-examples: 仅浏览器页面且不具备本地运行与桌面生命周期管理能力。
- Notes: 首发以 macOS 为主，架构保持跨平台扩展。

### Automation Orchestration
- Definition: 对研究流程中的长时任务进行编排与执行的能力，包括队列、调度、重试、断点恢复和状态跟踪。
- Synonyms: 自动化编排, workflow orchestration。
- Non-examples: 仅手工逐步执行脚本且无失败恢复机制。
- Notes: 目标是减少重复手工操作并提升长时间运行稳定性。

### API Governance
- Definition: 对外部 API 调用进行可靠性与成本治理的机制，包括限流、退避重试、熔断、幂等与调用监控。
- Synonyms: API 调用治理, external API control plane。
- Non-examples: 无节制直接调用外部接口且缺少失败策略。
- Notes: 高频调用场景必须启用治理机制以控制风险与成本。

### Literature Registry
- Definition: 项目级文献注册表，用于记录文献元数据、来源、标签、去重键和使用状态，避免重复检索与重复入库。
- Synonyms: 文献台账, bibliography registry。
- Non-examples: 每次检索临时返回结果但不持久化。
- Notes: 去重优先级为 DOI、arXiv ID、标题规范化加作者和年份组合。

### Title Card
- Definition: 题目卡是进入 paper-project 的 canonical origin surface，承载 idea shaping、证据篮、need/question/value/package 与 promotion decision。
- Synonyms: title-card, 题目卡。
- Non-examples: topic profile、auto-pull rule、文献检索主题。
- Notes: 创建 paper-project 时使用 `title_card_id`，不是 `topic_id`。

### Paper Implementation
- Definition: 论文实施 authority，负责 motive versions、validation cycles、work orders、run evidence、claim trace、implementation dossier 与 writing-ready decisions。
- Synonyms: paper-implementation, 论文实施。
- Non-examples: 论文文件管理器、任务看板、paper-project 生命周期容器。
- Notes: 与 Experiment Foundation 平级。PI 拥有研究意图、可信 evidence 接纳、contextual scientific disposition、Claim 与 Dossier；不写 EF 的资产、Run/Attempt、结果事实或协议验证权威。旧写作前控制面语义已收口到 PaperImplementation；不要新增兼容 wrapper 或平行 authority。

### Experiment Foundation
- Definition: 与 Paper Implementation 平级的实验基座 bounded context，负责可复用实验资产、exact TaskSpec/Run/Attempt 执行、结果事实、EvaluationProtocol 验证与 EvidenceCandidate qualification。
- Synonyms: experiment-foundation, 实验基座, EF。
- Non-examples: Literature 子模块、PaperProject 附件区、PI 内部 runner、科学结论或 Claim 写入者。
- Notes: PI 决定验证什么并发出 admitted WorkOrder/exact cells；EF 管理如何执行与结果是否符合协议，再通过 durable exact event 把合格 EvidenceCandidate 交给 PI。UI/导航位置不定义领域所有权。

### Experiment Result
- Definition: EF 在 canonical Scientific Source 提交后，通过独立 identity-only 命令生成的不可变、类型化 per-cell 测量事实信封。
- Synonyms: ExperimentResultCell, scientific result envelope, 实验结果事实。
- Non-examples: 用户填写的数字、外部运行包、原始供应商 payload、跨 cell 论文结论、`positive | negative | inconclusive` disposition。
- Notes: 产品入口只提交身份和幂等信息，不提交 observations。结果信封保存来源/derivation、统计摘要与 hash-bound artifact refs；大型原始样本留在受控 artifact 中。

### Scientific Source
- Definition: EF 在真实 provider collection 边界用冻结 parser profile 对 canonical result envelope 一次解析后封存的不可变来源清单，是 Experiment Result 的直接且唯一科学来源。
- Synonyms: canonical scientific source, `scientific_source`, 科学来源清单。
- Non-examples: `diagnostic_only` provisional output、provider Job success、未提交的内存 payload、外部结果导入、ExperimentResult 本身。
- Notes: provider transport 不解释科学指标；provider-independent parser 在事务外生成 source draft，collection 短事务提交 source。若 provider collection 有效但科学解析失败，则保留 diagnostic 事实但不创建 Scientific Source 或 Result。

### Evidence Eligibility
- Definition: EF 对真实结果的来源、完整性、类型、协议兼容与可解释比较事实是否可信的判断。
- Synonyms: scientific validation eligibility, 证据合格性。
- Non-examples: “方法优于 baseline”、论文假设成立、PI scientific disposition。
- Notes: validation `passed` 只表示可以成为 EvidenceCandidate。负面或不确定结果只要证据合格，同样应进入 PI；最终 `positive | negative | inconclusive` 由 PI 决定。

### M0-SCI (Scientific Core Readiness Gate)
- Definition: 产品 M0 内部的科学核心能力发布门；决定真实科学闭环能否启用并被声明为可用，不是整个 M0 应用的唯一发布开关。
- Synonyms: M0 scientific core gate, 科学核心门。
- Non-examples: 项目治理 milestone `M-001`、桌面 UI 完成度、仅通过单元/关系测试的 P0–P4 checkpoint。
- Notes: T-136 P0–P4 只产生 `implementation_complete_unreleased`；只有 P5 新真实双 cell WorkOrder→Dossier 验收通过后才能标记 `M0-SCI passed`。门未通过时，其他 M0 模块可以明确标注 preview，但科学闭环必须保持关闭且不可宣称完成。

### Paper Project
- Definition: 论文项目容器，负责 paper id、生命周期、version spine、stage/release gates、artifact bundle、writing package 与 paper literature links。
- Synonyms: paper-project, 论文项目容器。
- Non-examples: pre-writing branch reasoning、readiness synthesis、title-card promotion decision。
- Notes: 旧“论文管理”中关于生命周期容器的语义应落到该术语；PaperProject 提供 scope/container，但不代理 PI↔EF 的执行或科学证据事件。

### Paper Literature Collection
- Definition: 某个 paper-project 下的文献链接集合，用于从 topic scope 同步候选文献并维护 seeded/selected/used/cited/dropped 等 citation status。
- Synonyms: paper literature links, 论文文献集合。
- Non-examples: 全局文献注册表、PaperImplementation readiness。
- Notes: 桌面端当前 `论文管理` 导航主要展示该视图；该 UI label 不等同于 canonical bounded context。

### Abstract-level RAG
- Definition: 基于文献标题、摘要和结构化元数据进行检索增强生成，不直接依赖全文语料。
- Synonyms: 摘要级检索增强。
- Non-examples: 在未授权全文上执行全文向量化问答。
- Notes: M0 采用该模式，输出必须附带来源锚点与检索时间。

### Local-first Deployment
- Definition: 以本地运行和本地数据存储为默认模式，云端能力仅在用户显式开启时使用。
- Synonyms: 本地化优先, local-first mode。
- Non-examples: 默认将项目内容上传到远程服务后再处理。
- Notes: 适配个人用户的隐私与离线可用性诉求。

### Git Integration
- Definition: 将项目文件的版本管理能力与 Git 工作流打通，支持变更追踪、提交与恢复。
- Synonyms: Git 工作流集成, version-control integration。
- Non-examples: 仅导出文件但无法查看版本差异或提交历史。
- Notes: 首发优先覆盖个人用户的本地仓库使用场景。

### Multi-device Sync (Same User)
- Definition: 同一用户在多台设备间同步项目状态的能力，采用本地主存储加云端控制面协同。
- Synonyms: 多设备同步, same-user cross-device sync。
- Non-examples: 依赖手工拷贝项目目录实现状态迁移。
- Notes: 支持设备信任管理、冲突处理和增量同步。

### Rights Classification
- Definition: 对文献内容授权状态进行分级的规则集合，用于控制全文入库和跨设备同步边界。
- Synonyms: 授权分级, rights basis。
- Non-examples: 不区分授权状态直接全文入库和同步。
- Notes: 典型分级包括 `OA`、`USER_AUTH`、`RESTRICTED`。

### Qdrant (Vector Layer)
- Definition: 可选的云端向量数据库，用于授权可同步内容的语义检索与 RAG 召回。
- Synonyms: 云向量层, vector store。
- Non-examples: 用关系数据库直接替代向量索引完成语义检索。
- Notes: 仅在 M1 及以后按需启用，且需受授权策略约束。

## Entity list (optional)
- Entity: Claim
  - Key fields: id, text, type, status, priority。
  - Lifecycle: draft -> validated -> at-risk/resolved。
- Entity: Evidence
  - Key fields: id, kind, title, artifact_ref, metrics。
  - Lifecycle: detected/imported -> linked -> reviewed。
- Entity: Issue
  - Key fields: dimension, severity, detail, pointers。
  - Lifecycle: open -> in-progress -> resolved。

## Verification
- All nouns used in `requirements.md` are defined here (or explicitly marked as common language).
