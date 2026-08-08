<!-- INIT:STAGE-A:REQUIREMENTS -->

# Requirements

## Conclusions (read first)
- **Project**: 论文工程助手 - 面向计算机科学论文写作与审稿对齐的桌面端写作与评测协同系统。
- **In-scope (MUST)**:
  - 实现桌面端独立工作区，覆盖论题整理、实验/测试管理、自动化流程编排等前期能力。
  - 产品架构需支持跨平台扩展，优先完成 macOS 可用版本。
  - 发布节奏确定为：M0 仅 macOS，M1 增加 Windows，M2 覆盖 Linux。
  - 默认采用本地化优先模式，支持离线工作和本地数据主存储。
  - 支持同一用户多设备使用，通过云数据库作为同步控制面实现跨设备状态同步。
  - 与 Git 工作流深度结合，支持仓库管理、版本对比与提交追踪。
  - Git 集成采用方案 B（本地优先 + 安全远程）：本地完整工作流并提供受限远程同步能力。
  - M0 启用外部文献检索模块，采用“可追溯检索 + 摘要级 RAG + 项目级文献注册表”模式。
  - M1 启用全文 RAG（项目级默认关闭），并按授权边界控制全文入库与跨设备同步。
  - M1 可选引入 Qdrant 作为云端向量检索层，用于可同步内容的统一向量检索。
  - 将研究贡献结构化为可检验 Claims，并在全文保持一致。
  - 建立 Claims 到 Evidence 的可追溯关系与覆盖检查。
  - 提供审稿人视角的规则化自检报告，覆盖贡献清晰度、技术正确性、评测质量、可复现性与表达清晰度。
  - 支持 Markdown 与 LaTeX 文档工作流，提供章节级建议与定位。
  - 写作阶段支持与 Prism 等成熟工具集成调用，复用其编辑与排版能力。
  - 支持高自动化任务（如研究整理、测试编排、批量检查），减少手工反复操作。
  - 支持高频外部 API 调用编排，并保证长时间运行稳定性与失败恢复能力。
  - 采用 `M0-SCI` 作为产品 M0 内部的科学核心能力门：不阻塞其他模块 preview，但真实科学闭环在 T-136 P5 前必须保持未发布/不可声明状态。
  - 提供投稿前风险分级与 Rebuttal 结构化支持。
- **Out-of-scope (OUT)**:
  - 不承诺自动产出可发表论文或保证接收结果。
  - 不替代研究选题、方法创新与学术判断。
  - 不在无 EF 受控真实运行证据时生成权威实验数字或科学结论。
  - 不支持把用户手工数字、CSV/Notebook、外部集群日志或第三方运行包导入为本项目的实验结果、EvidenceCandidate、RunEvidenceUnit 或 ValidationCycle 科学结论。
- **Primary users**:
  - 个人研究者（单用户）为主。
  - 研究生与博士后作者。
  - PI/导师审阅者（作为后续可扩展协作角色）。
- **Top user journeys**:
  - 从研究想法生成可检验 Claims 与证据计划。
  - 在写作过程中持续发现并修复高风险缺失项。
  - 投稿前生成审稿人式自检报告并形成可执行改动清单。
  - 收到评审意见后快速生成可追溯的 Rebuttal 回应框架。

## Goals (MUST)
- 将论文贡献表达从“叙述型”提升为“可检验、可追溯”的工程对象。
- 把评测设计提升到公平对标、统计稳健与可复现可审计的基线水平。
- 缩短从初稿到投稿前可交付状态的迭代周期。

## Retired Pre-Writing Control Plane References
- The retired historical pre-writing control-plane references live in:
  - `docs/project/architecture/research-argument-framework.md`
  - `docs/project/architecture/research-argument-data-schema.md`
  - `docs/project/architecture/research-argument-planner-spec.md`
  - `docs/project/product/research-argument-control-plane-ui.md`
- As of 2026-06-01, these references are historical archive material only. They are not a current bounded context, not a runtime surface, and not a wrapper or compatibility lane.
- Forward implementation readiness and writing-prep authority belongs to `paper-implementation`.
- `research-varify/` remains an intake directory only and is not the long-term SSOT for runtime, context, or shared contracts.

## Canonical Terminology Boundaries
- `title-card` owns idea shaping, evidence basket, need/question/value/package, and promotion origin identity.
- `paper-project` owns the downstream paper lifecycle container: paper id, version spine, stage/release gates, artifact bundle, writing package, and paper literature links.
- `paper-implementation` owns the research implementation authority: motive versions, validation cycles, work orders, run evidence, result interpretation, claim trace, implementation dossier, and writing-ready decisions.
- `experiment-foundation` is a peer bounded context to `paper-implementation`; it owns reusable experiment assets, exact TaskSpec/Run/Attempt execution, result facts, EvaluationProtocol validation and EvidenceCandidate qualification.
- PI owns experiment intent and contextual scientific conclusion; EF owns protocol-compliant execution facts and evidence qualification. EF does not write Claim/disposition/Dossier, and PI does not write EF asset/execution/validation authority.
- `paper-project` provides the lifecycle scope/container but is not an execution broker between PI and EF.
- Desktop navigation placement is deferred and MUST NOT define or change bounded-context ownership.
- Retired pre-writing control-plane artifacts are historical archive material only and must not be used as migration adapters, compatibility wrappers, or a parallel authority domain.
- `topic_id` remains valid for literature topic scope, retrieval, topic settings, and auto-pull contexts. It is not the origin field for `POST /paper-projects`; use `title_card_id` there.
- `论文管理` / `paper management` is a legacy product bucket or desktop navigation label. Current implementation docs must use one of the canonical names above.

## Non-goals (OUT)
- 自动替代研究工作本身。
- 用堆砌文本替代证据建设。
- 在没有来源和时间标注时声称“最新最强”基线结论。
- M0 不提供高级 Git 历史改写操作（如 rebase、cherry-pick、强制推送）。
- M0 不提供团队级全文知识库共享与跨用户文献复用。

## Users and user journeys
### User types
- 作者：负责论文主体写作、实验规划与证据维护。
- 审阅者：负责审查结构缺陷、证据完整性与写作清晰度。
- 项目协作者：负责补充实验结果、复现条目与章节修订。

### Top journeys (with acceptance criteria)
1. Journey: 研究想法到 Claims 定义
   - Acceptance criteria:
     - [x] 可生成 2 到 4 条可检验 Claims。
     - [x] 每条 Claim 都绑定预期证据类型。
2. Journey: Claims 到 Evaluation 证据链构建
   - Acceptance criteria:
     - [x] 系统可提示主结果、消融、稳健性与效率评测组合。
     - [x] 每条 Claim 至少映射一个证据对象。
3. Journey: 投稿前风险审查
   - Acceptance criteria:
     - [x] 输出按维度分组的高中低风险问题列表。
     - [x] 每个问题包含可执行改法与文档定位信息。
4. Journey: Rebuttal 生成
   - Acceptance criteria:
     - [x] 评审意见可映射到 Claims、Evidence 与文档改动位置。
     - [x] 输出逐条回应结构和新增实验摘要。

## Functional requirements (MUST/SHOULD/MAY)

Use explicit requirement strength.

- MUST: 提供结构化 Claims、Evidence、Baseline、Protocol、Repro Item 管理。
  - Acceptance criteria: 关键对象可持久化并可在报告中被引用。
- MUST: 权威科学结果只来自 `experiment-foundation` 创建、监控、收集并按 EvaluationProtocol 验证的完整真实运行。
  - Acceptance criteria: 每个科学结果必须绑定 EF 持久化的 exact Run、RunCell、TaskSpec、real-provider Attempt、解析器与协议身份；用户手工数字和外部实验结果导入均不能创建 `ExperimentResultCell`、`EvidenceCandidate`、`RunEvidenceUnit` 或关闭科学 ValidationCycle。
  - Collection boundary: provider transport 只负责 canonical result envelope 拉取、基础 envelope/lineage/parser-binding 校验与 upstream manifest hash；EF worker 在 canonical bytes 仍在内存时调用 provider-independent parser，并以短事务封存可选 canonical `scientific_source`。事务内不得调用供应商或执行解析。
  - Product intake: 科学结果产品命令只接受 Run/Cell、已提交 `scientific_source` 与幂等身份，不接受 metric value、统计结论或 caller-authored observation；EF 必须权威重读 exact source/collection/Attempt/Run chain 并使用冻结 parser profile 生成结果信封。
  - Result envelope: 每个 Result 直接绑定一个已提交 canonical scientific source，且至少覆盖稳定 observation identity、metric/split/value/type/unit、统计量类型、样本规模、类型化 uncertainty（或明确无 uncertainty），以及 exact collected-output/artifact、parser profile 与 derivation hash；大型原始样本与供应商 payload 只保留为 hash-bound artifact，不内嵌到结果信封。
  - Failure semantics: envelope/lineage/parser binding 无效时 collection 失败；provider collection 有效但科学解析不支持、必要统计缺失或 result schema 不满足时保留 collected/diagnostic 事实，但不得创建 `scientific_source`、ExperimentResult、validation 或 evidence。
  - Boundary: 允许 EF 调用 PAI 等外部计算平台作为受控执行器；不允许绕过 EF 执行控制面，仅导入平台外已完成的数字、文件或运行包。
  - Literature boundary: 文献中的公开实验数字可以保留为带来源锚点的 literature evidence/baseline context，但不能伪装成本项目运行结果或直接支撑本项目科学关闭。
- MUST: 证据合格状态与论文科学结论是两个独立状态轴。
  - EF validation `passed` 仅表示来源、完整性、类型、协议与比较事实可被信任，不表示实验支持论文假设。
  - EF 可以按预注册协议确定性生成跨 cell comparison facts，但不得写 `positive | negative | inconclusive`、Claim 或 selected exit。
  - 只要证据合格，支持、反驳或无法确定假设的真实结果都必须能够生成 EvidenceCandidate；PI 再将可信 facts 映射为 contextual scientific disposition。
- MUST: 科学判定规则执行实验前预注册，实验结果产生后不可回写协议以改变结论。
  - Freeze boundary: exact Run 提交前必须冻结并哈希 WorkOrder/EvaluationProtocol 的有序 cells、指标语义、单位/聚合方式、比较方向、阈值和 exit rules；结果、验证、解释与关闭均引用该预运行协议身份。
  - Late binding boundary: 顶层只冻结语义契约和权威规则，不预先固定具体模型、数据集、供应商原始文件布局或 P5 参数；这些参数可晚绑定，但对应协议必须在该 Run 提交前冻结。
  - Correction boundary: 人工 correction 可以纠正解释或映射并留下审计记录，不得修改已经绑定真实结果的协议、阈值或比较方向；需要改变协议时必须创建新 revision/new Run。
- MUST: `M0-SCI` 是科学闭环的强制 capability release gate，由 T-136 完整 P0–P5 验收。
  - Before gate: P0–P4 即使全部通过，也只能记录为 `implementation_complete_unreleased`；产品科学结果写入、科学 ValidationCycle closure、闭环 Packet/Claim/Dossier 声明必须保持关闭，不得使用 synthetic/manual/fallback 路径冒充可用。
  - Gate pass: 只有新 EF-managed 真实双 cell 链路完整达到 ExperimentResult → validation → EvidenceCandidate → trusted REU → ResultAnalysis → scientific closure → ResultInterpretationPacket → Claim/Dossier，并通过零重复重放、成本与凭证清理，才能标记 `M0-SCI passed`。
  - Product boundary: `M0-SCI` 不阻塞其他 M0 模块的开发、测试或明确标注的 preview；它阻塞的是科学闭环 capability 的启用、可用性声明和完成度声明。
  - Governance boundary: 产品能力门 `M0-SCI` 不等于项目治理 milestone `M-001`，不新增或替换 registry milestone id。
- MUST: 提供桌面端独立工作区核心能力，包括项目管理、任务编排、前期研究与测试自动化流程。
  - Acceptance criteria: 用户可在同一工作区完成从论题整理到投稿前检查的大部分前期工作。
- MUST: 支持跨平台演进，M0 至少实现 macOS 生产可用版本。
  - Acceptance criteria: 核心工作流在 macOS 可稳定运行，并具备面向 Windows/Linux 的平台抽象层。
- MUST: 落地分阶段跨平台发布计划。
  - Acceptance criteria: M0 发布 macOS；M1 发布 Windows；M2 发布 Linux，并复用统一核心业务层。
- MUST: 提供本地化优先运行模式。
  - Acceptance criteria: 在无网络情况下可完成核心本地工作流（外部 API 调用除外），项目数据默认保存在本地。
- MUST: 支持同一用户多设备同步。
  - Acceptance criteria: 设备间可同步项目元数据、任务状态与授权允许的数据，并支持断点续传和冲突处理。
- MUST: 提供 Git 集成能力，适配个人研究者常见版本管理流程。
  - Acceptance criteria: 支持打开本地仓库、查看变更 diff、提交历史追踪和标准提交操作。
- MUST: M0 落地方案 B 的 Git 边界。
  - Acceptance criteria: 支持 status、diff、log、stage/unstage、commit、tag、fetch、pull --ff-only、push；默认禁止 force push 与历史改写操作。
- MUST: 提供 Claims-to-Evidence Traceability 表与覆盖检查。
  - Acceptance criteria: 对未覆盖 Claim 输出高风险提示和定位。
- MUST: 提供规则引擎检查，覆盖缺失项、一致性、公平性和复现要素。
  - Acceptance criteria: 规则输出包含 severity、detail 和 pointers。
- MUST: 提供章节级写作建议与 Diff 应用能力。
  - Acceptance criteria: 建议可一键应用或撤销，并保留版本痕迹。
- MUST: 提供自动化编排与任务执行能力，支持长时间运行的后台任务和批处理流程。
  - Acceptance criteria: 任务支持队列、重试、断点恢复与运行状态追踪。
- MUST: 提供外部 API 调用治理能力。
  - Acceptance criteria: 支持限流、重试退避、幂等键、错误分级与调用成本统计。
- MUST: M0 提供外部文献检索能力，并维护项目级文献注册表以避免重复检索。
  - Acceptance criteria: 以 DOI/arXiv/title+author+year 作为去重键，支持查询缓存命中与增量刷新。
- MUST: M0 提供摘要级 RAG 能力并保持可追溯引用。
  - Acceptance criteria: RAG 输出必须包含 paper_id、source_url 和来源定位信息。
- MUST: M1 提供受控全文 RAG 能力。
  - Acceptance criteria: 全文 RAG 默认按项目关闭；开启后输出仍必须包含来源锚点与权限标签。
- MUST: 落地全文授权分级与同步边界。
  - Acceptance criteria: `OA` 可跨设备同步全文与索引；`USER_AUTH` 仅用户显式开启后同步；`RESTRICTED` 禁止全文与向量同步。
- SHOULD: 提供方向化规则配置（ML、系统、安全等）。
- SHOULD: 写作阶段支持对接 Prism 等成熟工具，作为外部写作执行面。
- SHOULD: 支持检索来源白名单和时效性过滤（按主题/时间窗）。
- SHOULD: M1 可选接入 Qdrant 作为云端向量库，M0 保持本地索引可用。

## Architecture model: bounded contexts

The original eight sub-functions remain historical capability input. They are not eight independent bounded contexts. Current implementation work must use the canonical peers below and the capability mapping that follows.

1. 文献管理 / literature
   - Internal: 文献注册表、去重规则、标签体系、引用状态、可追溯来源记录。
   - Integrations: arXiv/Crossref/Semantic Scholar/DBLP 检索接口，用户本地 PDF 导入。
2. 题目卡 / title-card
   - Internal: 方向候选、证据篮、need/question/value/package、promotion decision。
   - Integrations: 外部文献检索与趋势摘要接口（用于候选方向补充证据）。
3. 论文项目容器 / paper-project
   - Internal: paper id、项目生命周期、version spine、stage/release gates、artifact bundle、writing package、paper literature links。
   - Integrations: title-card promotion、Git 工作流、同一用户多设备同步控制面、paper-implementation bootstrap、downstream writing lane。
   - Boundary: 提供生命周期 scope/container，不代理 PI↔EF 实验执行或科学证据事件。
4. 论文实施 / paper-implementation
   - Internal: ImplementationProject、CoreMotiveVersion、ValidationCycle、ResearchWorkOrder、RunEvidenceUnit、ClaimTracePacket、ImplementationDossier、DossierReadinessGate。
   - Authority: 拥有研究动机/假设、实验意图、exact cell plan、WorkOrder、分支/head、可信 REU 接纳、结果解释、科学 disposition/exit、Claim 与 Dossier。
   - Integrations: title-card/paper-project intake、experiment-foundation execution/evidence peer、downstream writing lane。
   - Retired historical control-plane artifacts are not implementation inputs; use PaperImplementation contracts directly.
5. 实验基座 / experiment-foundation
   - Internal: Dataset/Benchmark/Baseline/EvaluationProtocol/RunRecipe 等可复用资产，以及 exact TaskSpec、Run、RunCell、Attempt、结果事实、ScientificValidationReport 与 EvidenceCandidate。
   - Authority: 拥有执行与事实/协议验证，不拥有论文假设的 contextual disposition、Claim、Dossier 或 writing-ready 决策。
   - Integrations: 消费 PI admitted WorkOrder/exact cells；调用由 EF 全程控制的本地或外部执行器；通过 durable exact event 把合格 EvidenceCandidate 交给 PI Trust Gateway。
   - Boundary: 与 `paper-implementation` 平级，不是 Literature、PaperProject 或 PI 的内部子模型。
6. 写作与治理 / writing-governance
   - Internal: Claims-Evidence 追溯、投稿前检查、审稿意见映射与修稿任务管理。
   - Integrations: 消费 PaperProject writing package 与 PI closed Dossier/Claim lineage；对接 Prism/Overleaf/本地 LaTeX 工作流及投稿平台信息。

### Historical capability mapping

- 理论框架与研究设计 → PI：假设与边界、问题定义、机制到证据映射。
- 实验设计 → PI + EF：PI 决定验证什么和 exact cells；EF 提供可复用 Dataset/Benchmark/Protocol/Recipe 及 readiness/materialization。
- 模型与训练 → EF：训练配置物化、Run/Attempt、平台执行、失败恢复与产物收集。
- 数据分析与讨论 → EF + PI：EF 记录事实、聚合指标并做协议验证；PI 解释结果、决定 positive/negative/inconclusive，并形成 Claim/Dossier。
- 写作、投稿、修稿 → writing-governance + paper-project：消费 PI 的 closed scientific lineage，不回写实验或结论权威。

Note:
- Do not reintroduce `论文管理` as a catch-all module in current implementation plans.
- Use `paper-implementation` for research intent/conclusion authority, `experiment-foundation` for reusable assets/execution/protocol-validated facts, `paper-project` for lifecycle container behavior, and `paper literature collection` for the current desktop view.
- PI→EF uses admitted WorkOrder/exact-cell authority; EF→PI uses qualified evidence events and PI Trust Gateway. Do not introduce shared mutable authority or direct cross-domain writes.
- Desktop/navigation placement is intentionally deferred and has no bearing on this domain model.
- Do not add compatibility wrappers around retired pre-writing control-plane artifacts; use PaperImplementation, PaperProject, or paper literature collection terms directly.

## Data and integrations (high level)
- Core entities: Project、Document、Section、Claim、Evidence、ClaimEvidence、Baseline、Protocol、ReproItem、Issue、Report。
- External systems:
  - 本地文件系统与本地 Git 仓库。
  - 云数据库（同步控制面，存用户/项目元数据与同步日志）。
  - 外部 LLM/API 服务（写作建议、检索、评测辅助）。
  - 文献元数据与检索源（如 arXiv、Crossref、Semantic Scholar、DBLP）。
  - 可选云向量层（Qdrant，用于授权可同步内容的向量检索）。
  - LaTeX 编译与预览工具链。
  - 对象存储用于图表与导出产物。
  - 写作阶段可接入 Prism、Overleaf 或本地仓库工作流。

## Constraints and assumptions
- Constraints:
  - 任何进入科学结论的实验数字必须由 `experiment-foundation` 全程管理的真实运行产生，并经受控解析和 EvaluationProtocol 验证；用户手工录入或外部实验结果导入不产生科学证据权威。
  - scientific source 必须在 collection 边界一次解析并封存；Result 只可在 source 提交后由独立 identity-only 命令生成。不得把 provider adapter、未提交内存对象或 `diagnostic_only` 输出作为科学 Result 来源。
  - 外部计算平台只有在 EF 创建任务、持久化 exact Attempt 身份、监控并收集结果时才是合法执行器；系统不提供裸数字、CSV/Notebook、外部集群日志或第三方运行包的科学结果导入路径。
  - `M0-SCI` 通过前，科学能力必须 fail closed/default off；P0–P4 的实现或测试证据不能被表述成真实科学闭环已发布。
  - 建议必须可追溯到具体章节位置或结构化对象。
  - LaTeX 编译必须在受限沙箱中执行。
  - 高频 API 调用必须遵守配额、速率限制和密钥安全策略。
  - 自动化任务必须支持失败恢复与幂等执行，避免重复副作用。
  - 外部检索结果必须持久化并可追溯，不允许无来源内容进入 RAG 输出。
  - 本地化优先模式下数据默认不出本地，云同步或远程上传必须由用户显式触发。
  - Git 写操作前必须可视化 diff 预览，禁止默认执行 destructive 操作（如 force push、hard reset）。
  - 权限不明（`RESTRICTED`）文献禁止全文分块、向量化持久化与跨设备同步。
  - 跨设备同步默认端到端加密，并提供设备信任管理与吊销能力。
- Assumptions:
  - 目标用户具备基础研究能力，工具主要解决组织与对齐问题，首发场景以个人单用户为主。
  - 独立工作区先保证前期能力闭环与稳定运行，再逐步增强写作集成深度与方向化能力。

## Success metrics (for product validation)
- Claims-to-Evidence 覆盖率接近 100%。
- 投稿前自检报告对关键缺失项保持高召回率。
- 从初稿到投稿前检查通过的平均用时持续下降。
- Rebuttal 准备时间相对传统人工整理流程明显缩短。
- 长时间运行任务在目标时长内保持稳定，无不可恢复崩溃。
- 高频 API 调用场景下失败率与限流冲击在可控范围内。
- 个人单用户场景下，日常 Git 版本管理与项目追踪流程稳定可用。
- 同一用户多设备场景下，同步成功率与冲突恢复体验达到可用标准。
- `M0-SCI` 仅在一次新 EF-managed 真实双 cell WorkOrder→Dossier 链路与零重复 replay 全部通过后计为 passed；任何 synthetic、diagnostic-only 或仅 P0–P4 结果均不得计入。

## Verification
- This doc is considered complete when:
  - MUST requirements are actionable and testable.
  - Out-of-scope items are explicit.
  - Each top journey has acceptance criteria.
