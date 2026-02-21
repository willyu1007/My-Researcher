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
  - 提供投稿前风险分级与 Rebuttal 结构化支持。
- **Out-of-scope (OUT)**:
  - 不承诺自动产出可发表论文或保证接收结果。
  - 不替代研究选题、方法创新与学术判断。
  - 不在无证据输入时生成实验数字或引用结论。
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

## Architecture idea: sub-functions (discussion draft, not finalized)

1. 文献管理（待讨论）
   - Internal: 文献注册表、去重规则、标签体系、引用状态、可追溯来源记录。
   - Integrations: arXiv/Crossref/Semantic Scholar/DBLP 检索接口，用户本地 PDF 导入。
2. 研究方向（备选池，待讨论）
   - Internal: 方向候选池、优先级打分（价值/可行性/风险/资源）、淘汰与保留历史。
   - Integrations: 外部文献检索与趋势摘要接口（用于候选方向补充证据）。
3. 理论框架与研究设计（待讨论）
   - Internal: 假设与边界管理、问题定义模板、机制到证据映射。
   - Integrations: LLM 辅助结构化生成与审阅接口。
4. 实验设计（待讨论）
   - Internal: 实验矩阵、对照与消融模板、公平对标协议、复现清单联动。
   - Integrations: 训练/评测任务编排接口（本地脚本或外部执行器）。
5. 模型与训练（待讨论）
   - Internal: 训练配置版本化、运行记录、模型产物登记、失败重试与恢复。
   - Integrations: 计算资源或训练框架接口（本地优先，可选远程执行）。
6. 数据分析与讨论（待讨论）
   - Internal: 指标聚合、统计稳健性检查、误差分析与失败案例归档。
   - Integrations: 可视化与分析工具接口（本地分析脚本或外部分析服务）。
7. 写作、投稿、修稿（待讨论）
   - Internal: Claims-Evidence 追溯、投稿前检查、审稿意见映射与修稿任务管理。
   - Integrations: Prism/Overleaf/本地 LaTeX 工作流接口，投稿平台信息管理接口。
8. 论文管理（待讨论）
   - Internal: 项目生命周期、版本快照、里程碑、任务与状态追踪。
  - Integrations: Git 工作流与同一用户多设备同步控制面。

Note:
- The eight sub-functions above are architecture ideas for follow-up discussion.
- Implementation boundaries (internal vs API integration) are not finalized in Stage A.

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
  - 任何实验数字必须来自用户输入或已有证据对象。
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

## Verification
- This doc is considered complete when:
  - MUST requirements are actionable and testable.
  - Out-of-scope items are explicit.
  - Each top journey has acceptance criteria.
