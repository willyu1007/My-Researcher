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
