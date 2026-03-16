# 自动化选题模块设计讨论纪要（完整版）

> 文档性质：设计讨论整理稿 / 模块设计基线  
> 适用范围：`My-Researcher` 项目的“自动化选题 / 方向池 / 选题晋升”相关设计  
> 建议落库路径：`docs/project/design/automated-topic-management.md`（讨论稿）；稳定后再拆分到 `docs/context/` 下的 process / api / glossary / architecture-principles 等制品  
> 形成依据：本轮围绕“自动化选题”流程、价值评估、LLM 角色划分、与现有仓库衔接方式的持续讨论  

---

## 1. 文档定位与阅读方式

### 1.1 文档目的

本文的目标不是写一份简短 PRD，也不是单纯记录一次对话，而是将围绕“自动化选题”的关键讨论沉淀成一份可以直接指导后续设计、建模、实现与评审的主文档。本文要解决的不是“如何让模型给出一个题目”，而是：

1. 为什么项目需要一个独立的自动化选题模块；
2. 自动化选题在整个论文工程链路中承担什么职责；
3. 选题过程应如何结构化，才能兼顾 LLM 能力、学术研究实践和审稿人视角；
4. 在现有 `My-Researcher` 架构下，这个模块应该落在什么位置、以什么对象和机制存在；
5. 哪些地方可以自动化，哪些地方必须保留人工判断；
6. 怎样保证选题阶段的输出能真实支撑后续的引言、相关工作、方法、实验、审稿回复与 rebuttal。

因此，本文兼具以下三种属性：

- **设计决策说明**：解释为什么要这样设计；
- **流程规范草案**：把讨论收敛为可执行步骤；
- **落地规格雏形**：给出对象、状态、字段、接口、评分与风控建议。

### 1.2 文档范围

本文覆盖以下内容：

- 自动化选题模块的目标、边界与成功标准；
- 选题流程从“初步想法”到“Topic Package”的完整设计；
- “价值评估（Value Assessment）”作为独立 gate 的必要性与实现建议；
- 与当前仓库已有 `topic profile / literature scope / auto-pull / paper-project / stage-gates` 的关系；
- 对象模型、字段建议、状态机、接口方向、UI 建议；
- LLM 与人工协作分工；
- 常见误区、风险与规避策略。

本文**不直接覆盖**：

- 全文写作、润色、投稿操作的细节流程；
- 具体实验编排与训练系统的实现；
- 某一研究方向上的具体选题答案。

### 1.3 目标读者

本文主要面向：

- 项目 owner / 架构设计者：判断自动化选题模块的边界、优先级和接口契约；
- 后续开发者：据此实现对象、API、状态机、前端页面与审查机制；
- AI agent / prompt 设计者：据此定义 agent 角色、输入输出和调用顺序；
- 后续维护者：理解为什么不是“直接生成论文题目”，而是“证据—需求—问题—价值”链路。

### 1.4 阅读建议

建议按以下顺序阅读：

1. 第 2–4 章：先理解项目现状、问题背景与本轮讨论演进；
2. 第 5–9 章：再看自动化选题的核心结构与价值评估机制；
3. 第 10–11 章：理解人与 LLM 的分工，以及如何映射到仓库现状；
4. 第 12–15 章：最后看风险、支撑关系、实施路径与未决问题。

### 1.5 本章达成的一致

- 自动化选题模块不应写成单个 prompt，而应被定义为一个**明确的设计对象**；
- 讨论产物必须能进入文档体系，并为后续实现提供稳定基线；
- 文档需要同时回答“为什么”“怎么做”“怎么接到现有项目上”。

---

## 2. 项目背景与当前基线

### 2.1 My-Researcher 的整体定位

根据仓库当前公开信息，`My-Researcher` 将自己定位为 **Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows**，也就是：

- 面向 **Computer Science Research**；
- 强调 **local-first**；
- 不是一般意义上的“文本生成器”，而是“论文工程助手”；
- 核心价值在于 **reviewer-aligned evidence workflows**，即围绕审稿人真正关心的判断维度构建证据链和治理流程；
- 明确把论文过程对象化、证据化，而不是只做成写作聊天框。[^repo-readme]

这意味着项目的基础假设不是“模型能帮我写”，而是“系统要帮助研究者把研究活动组织成可追溯、可检验、可审查的工程对象”。自动化选题模块必须服从这一定位。

### 2.2 当前工程形态与上下文体系

仓库当前是 monorepo，技术栈明确为：

- Electron 桌面壳；
- React + Vite 前端；
- Fastify 后端；
- Postgres 数据库；
- `.ai/skills/` 作为 AI 技能 SSOT；
- `docs/context/` 作为稳定、策展过的 LLM 上下文层。[^repo-readme][^context-index]

`docs/context/INDEX.md` 已明确规定：

- `docs/context/` 是稳定上下文层；
- 其 canonical index 为 `docs/context/registry.json`；
- 当 `docs/context/` 存在时，AI/LLM 应优先使用这些上下文制品，而非临时扫描整个仓库；
- API、DB、UI、Glossary、Process 等都被视为一等上下文制品。[^context-index]

这对本模块很关键：

> 自动化选题一旦成熟，不能只是留在 `docs/project` 的讨论文本里，而应逐步拆分成 `docs/context/` 下的正式 artifact，并纳入 registry 与校验流程。

### 2.3 当前项目阶段与功能格局

当前项目已完成初始化阶段，转入产品实现阶段；同时，项目已经把整体能力设想为 8 个核心子功能：

- 文献管理；
- 方向池；
- 理论设计；
- 实验设计；
- 模型训练；
- 数据分析；
- 写作投稿修稿；
- 论文管理。[^start-here]

其中“方向池”正是自动化选题模块最直接的上位语义。但仓库当前公开信息同时明确：

- 项目要把论文写作流程工程化为可追溯 claims-evidence 证据链；
- M0 启用外部文献检索，采用“可追溯检索 + 摘要级 RAG + 项目级文献注册表”；
- 项目**不替代研究路线决策**；
- 系统不承诺自动产出可发表论文，也不替代研究选题、方法创新与学术判断。[^start-here][^requirements]

这对自动化选题的边界有直接约束：

- 它可以帮助用户**更系统地识别值得做的问题**；
- 但不能冒充“自动科研决策器”；
- 它必须是 **decision support**，不是 **decision replacement**。

### 2.4 当前已存在的相邻能力

根据当前 `docs/context/api/openapi.yaml`，项目已经具备或已定义以下相邻能力：

1. **文献导入与检索**
   - `POST /literature/import`
   - `POST /literature/zotero-import`
   - `POST /literature/zotero-preview`
   - `GET /literature/overview`
   - `POST /literature/retrieve`

2. **Topic 级别的文献范围管理**
   - `GET /topics/{topicId}/literature-scope`
   - `POST /topics/{topicId}/literature-scope`

3. **Topic profile / settings**
   - `POST /topics/settings`
   - `GET /topics/settings`
   - `PATCH /topics/settings/{topicId}`

   当前 DTO 明确包含：
   - `topic_id`
   - `name`
   - `is_active`
   - `include_keywords`
   - `exclude_keywords`
   - `venue_filters`
   - `default_lookback_days`
   - `default_min_year`
   - `default_max_year`
   - `rule_ids`

4. **Auto-pull 规则与运行**
   - `POST /auto-pull/rules`
   - `GET /auto-pull/rules`
   - `PATCH /auto-pull/rules/{ruleId}`
   - `DELETE /auto-pull/rules/{ruleId}`
   - `POST /auto-pull/rules/{ruleId}/runs`
   - `GET /auto-pull/runs`
   - `GET /auto-pull/runs/{runId}`

5. **Paper project 生命周期**
   - `POST /paper-projects`
   - `POST /paper-projects/{id}/stage-gates/{gate}/verify`
   - `POST /paper-projects/{id}/writing-packages/build`
   - 以及 timeline / metrics / artifact bundle / release gate 等。[^openapi]

这说明项目已经有：

- 文献输入层；
- topic 检索与监控层；
- paper 执行层；
- stage gate 验证机制。

但它还没有清晰定义“**topic 到 paper project 之间的研究决策层**”。

### 2.5 当前缺口：缺的不是检索，而是“选题决策中间层”

现状里，`topic profile` 更像是检索配置对象，而不是研究问题对象。它描述的是：

- 搜什么；
- 排除什么；
- 看哪些 venue；
- 回看多少天；
- 挂哪些自动拉取规则。

但它**不等于**：

- 真实需求（validated need）；
- 主问题（main question）；
- 候选贡献类型（contribution hypothesis）；
- 价值评估结论（value assessment）；
- 可晋升为论文项目的 Topic Package。

这就是本次讨论要补的关键中间层。

### 2.6 UI 侧当前信号

`docs/context/ui/ui-spec.json` 与 `current-state-alignment.md` 中已经出现了与 topic rule editor 相关的执行痕迹，例如：

- `topic year range` 的 CSS 变量注入被登记为已知偏差；
- 说明当前桌面端已具备某种 topic rule editor / topic filters 的 UI 现实。[^ui-spec][^ui-align]

这进一步说明，topic 层并非空白，但当前更偏“规则设置 / 检索治理”，尚未进入“命题—价值—晋升”的中间层。

### 2.7 Architecture principles 的机会窗口

值得注意的是，当前 `docs/context/architecture-principles.md` 仍然是空模板，尚未写入任何正式原则。[^arch-principles]

这意味着：

- 自动化选题模块完全有机会成为项目中第一批正式落地的**跨模块架构原则**；
- 尤其适合把“Evidence-first”“Falsification before commitment”“Promotion gate”等原则写入其中；
- 这样可以避免未来 topic、paper、writing package、review risk 等模块各自为政。

### 2.8 本章达成的一致

- 当前项目已有文献、topic settings、auto-pull、paper project、stage gate 等外围能力；
- 但缺少一个“topic -> validated need -> question -> value assessment -> promotion” 的中间层；
- 自动化选题模块正好补这一层；
- 它必须遵守项目的 claims-evidence、reviewer-aligned、local-first、human-in-the-loop 定位；
- topic profile 不能直接等同于 research topic 或 research question。

---

## 3. 为什么要做自动化选题

### 3.1 传统选题流程的主要问题

传统科研实践中的选题经常依赖以下方式：

- 凭兴趣快速收束；
- 读到几篇相关论文后凭印象判断 gap；
- 看到 limitation 就认为这是可做点；
- 先起标题，再回头找文献和理由；
- 研究问题、创新点、实验方案、投稿目标混合在一起形成模糊判断。

这种模式的问题在于：

1. **文献覆盖不稳**：看到的是局部，不是版图；
2. **gap 判断过早**：把“没人这么说过”误判为“值得做”；
3. **需求与方案混淆**：把某个方法偏好误当成真实需求；
4. **标题先行**：题目绑定了后续推理，导致路径依赖；
5. **可行性常常晚暴露**：数据、基线、评测路径、资源限制往往到后面才发现不成立；
6. **审稿视角缺失**：作者觉得新，reviewer 可能只会觉得“动机弱、对比不足、收益小、证据不够”。

### 3.2 对 My-Researcher 来说，为什么这个问题更关键

`My-Researcher` 的核心价值并不是让用户“写得更快”，而是让研究过程从一开始就按**可检验 claims + 可追溯 evidence**的口径组织起来。[^requirements]

在这种定位下，如果选题阶段仍然停留在：

- 非结构化讨论；
- 模糊 gap 感知；
- 仅凭热词组题；
- 没有晋升 gate；

那么后面的 claims-evidence 体系就会失去基础。因为：

- 引言中的动机很可能是事后包装；
- related work 无法围绕真实问题空间组织；
- 方法贡献陈述会漂浮；
- 实验设计缺少与问题的强绑定；
- 投稿前的风险报告无法追溯到“为什么这个题值得做”。

换言之：

> 选题阶段如果不工程化，后续论文工程的很多“严谨性”最终都会退化成写作层面的修辞补丁。

### 3.3 自动化选题希望达到什么效果

本轮讨论最终把自动化选题的目标收敛为以下几点：

1. **把想法变成结构化对象**
   - 从模糊兴趣，过渡到可验证的主问题。

2. **把 gap 判断建立在文献证据上**
   - 不是直接生成题目，而是先做 evidence map。

3. **把“可改进之处”和“已解决痛点”区分开**
   - 只有交叉审查后依然成立的，才进入真实需求。

4. **把“有问题”与“值得做”分开处理**
   - 主问题形成之后必须再走价值评估。

5. **把题目从驱动层后移到包装层**
   - 题目只是研究切口与贡献形态的外显表达，不应绑架决策。

6. **为后续 paper project 输送完整 Topic Package**
   - 不是一句题目，而是一整套可继承对象。

### 3.4 与 evidence synthesis 的方法论相容性

本轮讨论中，一个关键判断是：选题阶段的核心产物不应是散乱的笔记，而应更接近 **evidence map / evidence gap map** 一类“先铺出版图，再识别空白与决策价值”的思路。相关方法学工作普遍强调，这类大图景综述 / 证据映射适用于**描述较宽研究问题、梳理证据版图、支持研究优先级与决策**。[^egm-big-picture][^egm-guidance]

我们并不是要把 topic 模块做成严格的系统综述工具，但它至少应该借鉴其中三个基本思想：

- 先系统化抽取问题、方案、假设、限制；
- 再判断哪里是真 gap，哪里只是表述差异；
- 最后把 gap 与可行性、价值和目标社区对齐。

### 3.5 本章达成的一致

- 自动化选题不是为了“自动起题目”，而是为了**把选题决策工程化**；
- 在本项目中，选题不是附属功能，而是 claims-evidence 链条的起点；
- 模块目标是提高选题质量、提前暴露伪 gap 和不可做点，并为后续论文创作提供结构化基础；
- 选题流程应借鉴 evidence map / gap map 的“先版图、后结论”方法，而不是直接做标题生成。

---

## 4. 本轮讨论的方案演进与关键结论

### 4.1 原始设想回顾

最初提出的自动化选题流程是：

1. 形成初步想法；
2. 根据初步想法在文献库中找相关内容，并形成两类产物：
   - 可改进的地方；
   - 已解决的痛点（含解决方案）；
3. 在第二步基础上交叉审查可改进列表和已解决痛点，形成真实需求；
4. 从真实需求推导研究领域和方向；
5. 形成论文题目；
6. 综合论文题目、真实需求、此前解决方案，形成主问题、研究方案列表、研究背景。

这套流程的优点非常明显：

- 不是从标题开始；
- 已经意识到“改进点”和“已解痛点”要分开；
- 试图从文献中还原真实需求，而不是直接让模型拍脑袋；
- 意识到了主问题、题目、方案、背景之间的先后关联。

因此，原始方案的骨架是正确的。

### 4.2 第一轮修订：把“双列表”升级为“证据图谱”

讨论后，第 2 步被认为过于扁平。因为“可改进的地方”和“已解决痛点”如果只作为自然语言列表，问题在于：

- 难以区分不同论文是否讨论的是同一个问题；
- 无法保留“谁在什么条件下声称解决了什么”的上下文；
- 无法记录依赖假设、适用场景、局限性和证据强度；
- 后续很难做精细交叉审查。

因此，第 2 步应升级为：

> **文献检索 + 结构化证据抽取，产出 EvidenceMap**

其基本抽取单元不再只是“改进点/痛点”，而应是：

- problem
- solution
- claimed benefit
- assumptions
- limitations
- evidence strength
- source refs

这一步是从“列表式摘要”转向“问题—方案—限制”的证据表示。

### 4.3 第二轮修订：把“真实需求”做成独立对象，并加入反证

原方案第 3 步提出了交叉审查，这是非常有价值的设计。但讨论后进一步明确：

- **文献 gap 不等于真实需求**；
- “还有改进空间”不等于“值得做”；
- 真实需求必须经过**支持与反驳的双向审查**。

因此，第 3 步被升级为：

> **交叉审查 + 反证审查 -> ValidatedNeed**

也就是说：

- 不仅要收集“为什么值得做”；
- 还要主动找“为什么这可能根本不成立”；
- 同义术语、邻近任务、强基线、场景边界、收益大小都需要进入反证。

### 4.4 第三轮修订：把“研究领域和方向”改成“问题空间与切口”

原方案第 4 步是“从真实需求推导研究领域和方向”。讨论后认为这个表述不够准确，因为：

- 第 1 步就已经有粗领域输入；
- 第 2 步检索也需要有领域范围；
- 到第 4 步真正发生的不是“从零推导领域”，而是“从粗领域收敛到细问题空间和具体切口”。

因此，更准确的定义是：

> **从 ValidatedNeed 定位 Problem Space，并选定 Research Slice**

这一步的产物应包括：

- 问题空间边界；
- 面向什么对象/场景；
- 关注哪类 failure mode 或 unmet need；
- 该从哪一类贡献形态切入。

### 4.5 第四轮修订：题目后置，先定问题与贡献类型

原方案第 5 步是“形成论文题目”。讨论后认为：

- 题目本身不是研究决策中心；
- 过早固定题目，会反向绑架后续逻辑；
- 真正应该先定的是：
  - 主问题；
  - 子问题；
  - 候选贡献类型；
  - 研究路径和评价方式。

因此，第 5 步应改为：

> **形成主问题 / 子问题 / 候选贡献类型**

而论文题目应放到更后面，作为 Topic Package 的一部分输出“候选集”，而非早期强约束。

### 4.6 第五轮修订：新增“价值评估 gate”

后续讨论的关键增量是：

> 主问题形成后，必须独立做一次价值判断。

原因在于：

- 有些问题真实存在，但收益太小；
- 有些问题有 gap，但目标社区不关心；
- 有些问题能写成分析/资源类贡献，但不适合作为方法论文；
- 有些问题理论上值得做，但资源、数据、评价条件不成立；
- 有些题目很新，但成功后 claim 仍然很弱。

因此，价值评估必须作为独立 gate 插入到：

`TopicQuestion -> ValueAssessment -> TopicPackage/Promotion`

### 4.7 形成的最终主线

经过讨论后，自动化选题的主线最终被重构为：

1. 初步想法 + 约束；
2. 文献检索 + 结构化证据抽取；
3. 交叉审查 + 反证 -> 真实需求；
4. 定位问题空间与研究切口；
5. 形成主问题 / 子问题 / 候选贡献类型；
6. 做价值评估 gate；
7. 输出 Topic Package（题目候选、背景、方案、评估、风险等）；
8. 满足条件后晋升为 paper project。

### 4.8 本章达成的一致

- 原始 6 步流程的骨架成立；
- 第 2 步不能停留在双列表，必须升级为结构化 EvidenceMap；
- 第 3 步必须包含反证机制，产出 ValidatedNeed；
- 第 4 步不是推导领域，而是定位 problem space / research slice；
- 题目生成必须后置；
- 价值评估必须独立成步；
- 最终输出不是标题，而是可继承的 Topic Package。

---

## 5. 总体目标与成功标准

### 5.1 自动化选题模块最终要产出什么

本轮讨论收敛出的最终目标不是“生成一个题目”，而是生成一组**可审查、可复用、可晋升**的对象链：

`TopicSeed -> EvidenceMap -> ValidatedNeed -> ResearchSlice -> TopicQuestion -> TopicValueAssessment -> TopicPackage`

这条链的意义在于：

- 每一步都有明确输入输出；
- 每一步都可以记录证据来源与人工确认状态；
- 后续论文阶段可以直接消费这些对象，而不是从零重来；
- 自动化程度可以逐步提高，而不破坏整体结构。

### 5.2 什么叫“高质量选题”

本轮讨论里对“高质量选题”的共识定义是：

一个高质量选题不是“看起来新”或“能组一个标题”，而是同时满足以下条件：

1. **重要**：对应一个真实且非边缘化的问题；
2. **未被充分解决**：存在明确 unmet need，而不是术语差异造成的伪 gap；
3. **可验证**：能形成清晰的评价路径；
4. **可发表**：结果形态与目标社区匹配；
5. **可执行**：资源、数据、时间、伦理边界允许；
6. **可形成强 claim**：成功后能给出非平凡的贡献陈述；
7. **可继承到后续论文工程**：能自然支撑引言、相关工作、方法、实验与 rebuttal。

### 5.3 成功标准不应只看“选出来几个题”

模块的成功不应以“生成题目数量”衡量，而应看它是否提高了研究决策质量。建议的成功标准包括：

#### A. 输出质量标准

- 每个被晋升的 topic 都应至少包含：
  - 1 个以上 validated need；
  - 1 个 main question；
  - 1 个 contribution hypothesis；
  - 1 份 value assessment；
  - 1 组 reviewer objections；
  - 1 个 evaluation plan 初稿；
  - 足够的 literature refs。

#### B. 决策质量标准

- 能筛掉明显的伪 gap 与弱题；
- 能把不同贡献类型分开判断；
- 能在主问题阶段就暴露高风险问题；
- 能让 topic 的推进理由具备证据可追溯性。

#### C. 流程支撑标准

- TopicPackage 可以直接转化为：
  - 引言草案骨架；
  - related work 分类框架；
  - 方法设计前提；
  - 实验设计与 baseline 清单；
  - 审稿风险审查输入。

#### D. 人机协作标准

- LLM 的输出不能是不可追溯的结论；
- 每个关键判断必须可回溯到文献证据与审查记录；
- 人必须能看清系统为什么推进、为什么否决。

### 5.4 晋升前的最低交付标准（推荐）

建议定义 Topic 晋升为 PaperProject 的最低门槛：

- `ValidatedNeed.count >= 1`
- `TopicQuestion.main_question` 非空
- `contribution_hypothesis` 非空
- `TopicValueAssessment.decision in {promote, refine}`
- 所有核心评分维度具备 `evidence_refs`
- 至少一份 `evaluation_plan_stub`
- 至少记录 3 条 `reviewer_objections_top3`
- 人工 reviewer / owner 已确认晋升

### 5.5 本章达成的一致

- 自动化选题模块的最终交付对象是 TopicPackage，而不是标题；
- 高质量选题必须同时满足重要性、未充分解决、可验证、可发表、可执行与可形成强 claim；
- 成功标准应围绕“研究决策质量”和“下游支撑能力”，而非生成量；
- 晋升 paper project 之前应有最低交付门槛。

---

## 6. 设计原则

### 6.1 Evidence-first

#### 原则定义
所有关键判断必须尽量建立在文献证据与结构化抽取之上，而不是凭模型直觉或标题联想。

#### 为什么
自动化选题最容易失控的地方，是模型直接从主题词跳到“这个方向值得做”。在本项目的 claims-evidence 定位下，这种跳跃不可接受。

#### 落地含义
- 任何 `validated_need` 都必须绑定 `evidence_refs`；
- 任何价值评估得分都应标明支持证据与置信度；
- 任何题目候选都应能回溯到需求和问题对象，而不是直接生成。

### 6.2 Reviewer-aligned

#### 原则定义
选题阶段就应按审稿人真正关心的维度看问题，而不是等写作阶段才修辞补救。

#### 为什么
NeurIPS 2025 将 `Quality`、`Clarity`、`Significance`、`Originality` 明确分开；ARR 从 2025 年 2 月起将 `soundness`、`excitement` 和 `overall recommendation` 分开，并强调 main conference / Findings 都要求 soundness 与 reproducibility。[^neurips-guidelines][^arr-guidelines][^arr-review-form]

这意味着：

- “新”不是唯一标准；
- “重要但不可证成”仍然不行；
- “有趣但不 sound”也不行；
- 价值评估必须同时考虑 significance、originality、answerability、venue fit 等维度。

### 6.3 Human-in-the-loop

#### 原则定义
LLM 可以强力辅助，但不能取代研究责任主体。

#### 为什么
Nature 的 AI 政策明确指出：LLM 不满足 authorship criteria，最终责任与判断仍由人承担，AI 的使用需要适当披露。[^nature-ai]

#### 落地含义
- LLM 可以粗筛、抽取、比较、反证、包装；
- 但真正的推进 / 否决 / 晋升必须由人确认；
- 所有自动评分都要配证据与 confidence，而不是不可解释的神秘分数。

### 6.4 Falsification before commitment

#### 原则定义
在承诺推进一个 topic 之前，必须先尝试推翻它。

#### 为什么
如果只收集“为什么值得做”的证据，系统会天然偏向确认性偏差（confirmation bias）。

#### 落地含义
- 每个 validated need 都应有 `supporting_evidence` 与 `counter_evidence`；
- 每个 main question 都应有 `killer objections`；
- promotion gate 之前必须显式回答“为什么这题可能不值”。

### 6.5 Structured artifacts

#### 原则定义
每一步都要沉淀对象，而不是只生成文字说明。

#### 为什么
只有对象化，后续流程才能复用、比较、升级、审计、回放。

#### 落地含义
- TopicSeed、EvidenceMap、ValidatedNeed、TopicQuestion、TopicValueAssessment、TopicPackage 都应是正式对象；
- 这些对象需要状态、版本、审查信息与引用关系。

### 6.6 Progressive narrowing

#### 原则定义
从宽到窄逐步收敛，而不是过早冻结题目、方法或投稿目标。

#### 为什么
选题早期最大的错误往往不是方向不对，而是收敛过快。

#### 落地含义
- Step 1 可以很宽；
- Step 2–3 先铺图谱；
- Step 4 再收问题空间；
- Step 5 形成问题和贡献类型；
- Step 6 再做价值判断；
- Step 7 才给题目候选。

### 6.7 Promotion gate 而非一键立项

#### 原则定义
从 topic 到 paper project 必须经过“晋升决策”，而不是自然滑入。

#### 为什么
否则 topic 设置、文献 scope、auto-pull 运行会被误解为“已经值得做”。

#### 落地含义
- promotion 是一个独立动作；
- promotion 需要 value assessment 支持；
- promotion 后 topic 与 paper project 应保持引用关系，但语义不同。

### 6.8 与现有项目风格的一致性

#### 原则定义
该模块应沿用项目现有的 artifact-first、context-first、stage-gate 风格。

#### 落地含义
- 设计文档先落 `docs/project`，稳定后纳入 `docs/context`；
- API 契约在 `docs/context/api` 中体现；
- 过程流可在 `docs/context/process/*.bpmn` 中表达；
- 跨模块规则可进入 `docs/context/architecture-principles.md`。

### 6.9 本章达成的一致

- 自动化选题必须坚持 Evidence-first、Reviewer-aligned、Human-in-the-loop、Falsification before commitment、Structured artifacts、Progressive narrowing 与 Promotion gate；
- 这些原则与现有项目风格天然兼容；
- 后续应将其中部分原则上升为正式架构原则。

---

## 7. 核心概念与对象模型

### 7.1 总览

本轮讨论最终认为，自动化选题模块至少需要以下核心对象：

1. `TopicSeed`
2. `EvidenceUnit`
3. `EvidenceMap`
4. `ValidatedNeed`
5. `ResearchSlice`
6. `TopicQuestion`
7. `TopicValueAssessment`
8. `TopicPackage`
9. `TopicPromotionDecision`

这些对象并不是“为了建模而建模”，而是分别承接以下阶段：

- 种子输入；
- 文献结构化抽取；
- 需求验证；
- 问题收敛；
- 价值判断；
- 晋升与下游继承。

### 7.2 术语定义表

| 术语 | 定义 | 作用 |
|---|---|---|
| TopicSeed | 初步想法与约束条件 | 作为选题流程起点 |
| EvidenceUnit | 从单篇文献中抽出的最小结构化证据单元 | 用于构建 EvidenceMap |
| EvidenceMap | 按问题/方案/限制等维度组织的证据图谱 | 为需求验证提供基础 |
| ValidatedNeed | 经交叉审查与反证后仍成立的真实需求 | 作为研究动机核心对象 |
| ResearchSlice | 从问题空间中收敛出的具体切口 | 控制研究边界 |
| TopicQuestion | 主问题、子问题与贡献假设 | 驱动后续方案与评估 |
| TopicValueAssessment | 价值评估与推进决策 | 决定是否值得投入 |
| TopicPackage | 面向后续论文工程的综合选题包 | 作为 topic 的高质量输出 |
| TopicPromotionDecision | 从 topic 晋升为 paper project 的决策记录 | 与现有 stage-gate 风格对齐 |

### 7.3 TopicSeed

#### 目的
记录初步想法，但不允许只有一个主题短句；必须显式携带约束与来源。

#### 推荐字段

```yaml
TopicSeed:
  seed_id: string
  topic_id: string
  title: string
  summary: string
  source_type: human_input | llm_scout | imported_topic_profile | hybrid
  source_detail: string
  rough_domain: string
  target_problem_area: string[]
  constraints:
    target_venues: string[]
    preferred_paper_types: [method, benchmark, analysis, resource, system, survey]
    available_data: string[]
    available_compute: string
    timeline_weeks: integer
    method_preferences: string[]
    method_avoidances: string[]
    compliance_notes: string[]
  seed_status: draft | reviewed | archived
  created_by: human | llm | system
  created_at: datetime
  updated_at: datetime
```

#### 关键设计点
- `constraints` 必须是一等字段，而不是备注；
- `source_type` 用于区分是人工提出、模型粗筛还是从现有 topic settings 演化而来；
- `rough_domain` 与 `target_problem_area` 使第 2 步检索有边界。

### 7.4 EvidenceUnit

#### 目的
作为文献结构化抽取的最小单元，避免后续只能引用整篇论文摘要。

#### 推荐字段

```yaml
EvidenceUnit:
  evidence_unit_id: string
  literature_id: string
  citation_key: string
  extraction_scope: title | abstract | section | paragraph | chunk
  problem_statement: string
  target_context: string
  proposed_solution: string
  claimed_resolved_pain: string[]
  remaining_limitations: string[]
  assumptions: string[]
  evaluation_signals:
    metrics: string[]
    baselines: string[]
    datasets: string[]
  evidence_strength: weak | medium | strong
  confidence: float   # 0-1
  source_refs: string[]
  extracted_by: llm | human | hybrid
  verified: boolean
  notes: string
```

#### 关键设计点
- `problem_statement` 与 `proposed_solution` 必须同时存在，避免只有“结论摘录”；
- `remaining_limitations` 不等于“论文最后一段 limitation”，而是经过结构化抽取和归一化后的限制项；
- `evidence_strength` 与 `confidence` 分开：前者是研究证据强弱，后者是抽取可信度。

### 7.5 EvidenceMap

#### 目的
把多个 `EvidenceUnit` 聚合为“问题—方案—限制—证据”图谱，用于支持真实需求判断。

#### 推荐字段

```yaml
EvidenceMap:
  evidence_map_id: string
  topic_id: string
  seed_id: string
  scope_definition:
    query_terms: string[]
    inclusion_rules: string[]
    exclusion_rules: string[]
    time_window: string
    venue_filters: string[]
  clustered_problems:
    - cluster_id: string
      canonical_problem: string
      aliases: string[]
      evidence_unit_ids: string[]
      representative_refs: string[]
  clustered_solutions:
    - cluster_id: string
      canonical_solution_family: string
      evidence_unit_ids: string[]
  unresolved_patterns:
    - pattern_id: string
      description: string
      supporting_evidence_units: string[]
  solved_patterns:
    - pattern_id: string
      description: string
      supporting_evidence_units: string[]
  evidence_map_status: draft | reviewed | frozen
  build_run_id: string
  created_at: datetime
  updated_at: datetime
```

#### 关键设计点
- `clustered_problems` 与 `clustered_solutions` 的引入，是为了处理同义术语和相近工作；
- `unresolved_patterns` 与 `solved_patterns` 是第 3 步交叉审查的直接输入；
- `scope_definition` 有助于后续审查“是不是检索范围太窄导致错判”。

### 7.6 ValidatedNeed

#### 目的
表示经过交叉审查和反证后仍成立的“真实需求”。这是从“文献 gap”迈向“研究动机”的关键对象。

#### 推荐字段

```yaml
ValidatedNeed:
  validated_need_id: string
  topic_id: string
  evidence_map_id: string
  need_statement: string
  need_type: performance | robustness | efficiency | interpretability | usability | reproducibility | evaluation_gap | resource_gap | theory_gap | workflow_gap
  affected_entities: string[]
  why_it_matters: string
  unmet_reasoning:
    supporting_patterns: string[]
    solved_but_insufficient_patterns: string[]
    counter_evidence_patterns: string[]
    rebuttal_summary: string
  severity: low | medium | high
  breadth: narrow | medium | broad
  novelty_risk: low | medium | high
  evidence_refs: string[]
  reviewer_notes: string[]
  status: proposed | challenged | accepted | rejected
  accepted_by: string
  accepted_at: datetime
```

#### 关键设计点
- `need_type` 有助于后续选择贡献类型；
- `rebuttal_summary` 要求系统明确记录“为什么反证没有推翻它”；
- `status` 允许一个 need 被挑战后驳回，而不是默认存活。

### 7.7 ResearchSlice

#### 目的
在问题空间中收敛边界，防止研究问题无限扩张。

#### 推荐字段

```yaml
ResearchSlice:
  research_slice_id: string
  topic_id: string
  validated_need_ids: string[]
  problem_space: string
  slice_statement: string
  target_setting: string
  excluded_boundaries: string[]
  expected_impact_scope: string
  candidate_contribution_types: [method, benchmark, analysis, resource, system]
  rationale: string
  status: draft | reviewed | approved
```

#### 关键设计点
- `excluded_boundaries` 很重要，它明确“本研究不打算解决什么”；
- `candidate_contribution_types` 用于控制“同一个 need 用哪种产出形态进入社区”。

### 7.8 TopicQuestion

#### 目的
在 ResearchSlice 之上形成真正的研究命题。

#### 推荐字段

```yaml
TopicQuestion:
  question_id: string
  topic_id: string
  research_slice_id: string
  main_question: string
  sub_questions: string[]
  contribution_hypothesis: method | benchmark | analysis | resource | system
  strongest_claim_candidate: string
  fallback_claim_candidate: string
  answerability_plan:
    datasets: string[]
    metrics: string[]
    baselines: string[]
    ablations: string[]
  dependency_risks: string[]
  status: draft | reviewed | approved | deprecated
```

#### 关键设计点
- `contribution_hypothesis` 必须和主问题一起出现；
- `strongest_claim_candidate` 与 `fallback_claim_candidate` 有助于价值评估做 ceiling/base/floor；
- `answerability_plan` 是价值评估前的“可回答性草图”。

### 7.9 TopicValueAssessment

#### 目的
对“是否值得投入”做结构化判断，而不是只做说明文字。

#### 推荐字段

```yaml
TopicValueAssessment:
  assessment_id: string
  topic_id: string
  question_id: string
  target_venues: string[]
  strongest_claim: string
  fallback_claim: string
  hard_gates:
    real_need_valid: pass | fail
    claim_possible: pass | fail
    evaluation_path_exists: pass | fail
    resource_feasible: pass | fail
    audience_exists: pass | fail
  scores:
    significance:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
    originality:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
    claim_strength:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
    answerability:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
    venue_fit:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
    strategic_leverage:
      score: 1-5
      confidence: 0-1
      evidence_refs: string[]
  risk_penalty:
    data: 0-5
    compute: 0-5
    baseline: 0-5
    ethics: 0-5
  reviewer_objections_top3: string[]
  scenarios:
    ceiling: string
    base_case: string
    floor: string
  total_score: float
  decision: promote | refine | park | drop
  next_actions: string[]
  assessed_by: llm | human | hybrid
  reviewed_by: string
  reviewed_at: datetime
```

### 7.10 TopicPackage

#### 目的
作为 topic 阶段的高质量综合交付，直接服务下游 paper project。

#### 推荐字段

```yaml
TopicPackage:
  topic_package_id: string
  topic_id: string
  seed_id: string
  evidence_map_id: string
  validated_need_ids: string[]
  research_slice_id: string
  question_id: string
  value_assessment_id: string
  title_candidates:
    - title: string
      style: technical | problem-driven | venue-friendly | concise
      note: string
  research_background: string
  main_problem_statement: string
  sub_problem_statements: string[]
  candidate_methods: string[]
  evaluation_plan_summary: string
  related_work_summary: string
  expected_contributions: string[]
  key_risks: string[]
  promotion_readiness: low | medium | high
  status: draft | review_ready | promoted | archived
```

### 7.11 TopicPromotionDecision

#### 目的
记录从 topic 到 paper project 的晋升动作，风格上对齐当前 stage-gate 机制。

#### 推荐字段

```yaml
TopicPromotionDecision:
  promotion_id: string
  topic_id: string
  topic_package_id: string
  decision: approved | rejected | deferred
  reason_summary: string
  paper_project_payload:
    title: string
    research_direction: string
    literature_evidence_ids: string[]
  approved_by: string
  approved_at: datetime
```

### 7.12 推荐枚举与辅助对象

#### ContributionType

```yaml
ContributionType:
  - method
  - benchmark
  - analysis
  - resource
  - system
  - survey   # 仅在扩展模式下允许
```

#### NeedType

```yaml
NeedType:
  - performance
  - robustness
  - efficiency
  - interpretability
  - usability
  - reproducibility
  - evaluation_gap
  - resource_gap
  - theory_gap
  - workflow_gap
```

#### DecisionType

```yaml
DecisionType:
  - promote
  - refine
  - park
  - drop
```

### 7.13 本章达成的一致

- 自动化选题需要一套中间对象模型，而非仅靠 topic settings 和 paper project；
- `ValidatedNeed`、`TopicQuestion`、`TopicValueAssessment`、`TopicPackage` 是最关键的新对象；
- 所有对象都应支持证据引用、状态、审查与版本化；
- 对象建模的目的不是增加抽象层，而是保证可追溯、可复用、可晋升。

---

## 8. 自动化选题的端到端流程

> 本章是整个设计的主干。每一步都围绕“目的、输入、处理、输出、LLM 角色、人工介入、易错点”展开。

### 8.1 Step 1：初步想法形成与约束注入

#### 目的
为后续流程提供起点，但不允许只有模糊主题词；必须同时注入约束，以避免系统筛出“看似新颖但实际不可做”的题。

#### 输入
- 用户手工输入的初步想法；
- 现有 topic profile 的关键词、时间窗、venue filters；
- 文献库中的热点聚类或模型粗筛结果；
- 当前资源条件（数据、算力、时间、方法偏好）。

#### 处理逻辑
1. 将自然语言想法规范化为 `TopicSeed`；
2. 为该 seed 补齐领域同义词、相关任务、潜在贡献类型；
3. 将约束条件写入结构化字段；
4. 明确这是探索型 seed，还是已有方向的延伸。

#### 输出
- `TopicSeed`

#### LLM 适合做的事
- 语义扩展；
- 同义词和邻近任务发现；
- 从已有 topic settings 中反向总结出候选 problem area。

#### 人工必须介入的点
- 目标 venue、时间预算、数据边界、方法禁区的确认；
- 删除明显不符合研究兴趣与资源现实的 seed。

#### 易错点
- 只输入一个热词；
- 忽略约束；
- 把 topic settings 当作 research question；
- seed 过宽，导致第 2 步检索失控。

#### 本步一致
- Step 1 不是“想一个题目”，而是“形成带约束的 TopicSeed”。

### 8.2 Step 2：文献检索与结构化证据抽取

#### 目的
从文献库和外部检索结果中抽取结构化证据，形成 EvidenceMap。

#### 输入
- `TopicSeed`
- 现有 literature repository / topic literature scope / retrieve 接口结果

#### 处理逻辑
1. 基于 `TopicSeed` 生成检索查询；
2. 用现有文献导入与检索能力补齐候选文献；
3. 将文献映射入 topic literature scope；
4. 针对每篇相关文献抽取 `EvidenceUnit`；
5. 聚类形成 `EvidenceMap`。

#### 输出
- 一组 `EvidenceUnit`
- `EvidenceMap`

#### LLM 适合做的事
- 摘要 / chunk 级结构化抽取；
- 问题归一化；
- solution family 聚类；
- limitation 模式归纳。

#### 人工必须介入的点
- 抽样检查抽取质量；
- 标记明显误归类和假阳性；
- 判断检索范围是否过窄。

#### 易错点
- 直接把 abstract summary 当证据；
- limitation harvesting：只收论文里“作者自述的不足”；
- 术语不同导致问题未合并；
- 检索偏差造成图谱失真。

#### 本步一致
- 第 2 步产物必须是 EvidenceMap，而不是两张松散列表。

### 8.3 Step 3：交叉审查与真实需求形成

#### 目的
在 EvidenceMap 基础上，判断哪些所谓改进空间是真实需求，哪些只是伪 gap 或边角问题。

#### 输入
- `EvidenceMap`

#### 处理逻辑
1. 比较 `unresolved_patterns` 与 `solved_patterns`；
2. 检查是否存在同义问题下已被强解法覆盖；
3. 检查所谓改进是否只是指标微调；
4. 收集支持与反对论据；
5. 输出经反证后仍成立的 `ValidatedNeed`。

#### 输出
- 一组 `ValidatedNeed`

#### LLM 适合做的事
- 支持 / 反驳对照；
- 识别同义任务与邻近解法；
- 归纳 unmet reason。

#### 人工必须介入的点
- 对高价值 / 高争议 need 进行终审；
- 明确 reject 哪些伪 gap。

#### 易错点
- 把“作者说还有未来工作”当成 unmet need；
- 把小场景问题误当通用需求；
- 没有做反证就推进；
- 忽略强基线已足够好的现实。

#### 本步一致
- 第 3 步必须显式包含“反证”与“驳回”机制；
- `ValidatedNeed` 是自动化选题的核心中间对象。

### 8.4 Step 4：从真实需求定位问题空间与研究切口

#### 目的
把多个真实需求收束成清晰可操作的研究边界。

#### 输入
- 一组 `ValidatedNeed`

#### 处理逻辑
1. 合并相近 needs；
2. 判断更适合作为 method / benchmark / analysis / resource / system 的哪个切口；
3. 明确目标对象、适用场景、排除边界；
4. 形成 `ResearchSlice`。

#### 输出
- `ResearchSlice`

#### LLM 适合做的事
- 对多个 need 做聚类和切口建议；
- 给出不同 contribution hypothesis 下的切法。

#### 人工必须介入的点
- 最终决定研究边界；
- 明确“不做什么”。

#### 易错点
- 问题空间过大；
- 试图一口气覆盖多个高难度贡献类型；
- 不写 excluded boundaries，导致后面问题扩张。

#### 本步一致
- 这一步不是“推导研究领域”，而是“定位 problem space / research slice”。

### 8.5 Step 5：形成主问题、子问题与候选贡献类型

#### 目的
把切口转化为真正的研究命题，而不是先起标题。

#### 输入
- `ResearchSlice`

#### 处理逻辑
1. 给出 `main_question`；
2. 拆分 `sub_questions`；
3. 明确 `contribution_hypothesis`；
4. 草拟 strongest / fallback claim；
5. 形成 answerability plan 草稿。

#### 输出
- `TopicQuestion`

#### LLM 适合做的事
- 重写为学术问题表述；
- 生成多种 contribution hypothesis 供比较；
- 补齐 answerability plan 初稿。

#### 人工必须介入的点
- 主问题是否真正值得回答；
- 贡献类型是否与资源条件和目标 venue 匹配。

#### 易错点
- 主问题太像标题而不像 research question；
- contribution hypothesis 缺失；
- answerability plan 不可执行。

#### 本步一致
- 题目必须后置；
- Step 5 的关键产物是 `TopicQuestion` 而非论文标题。

### 8.6 Step 6：价值评估 gate

#### 目的
判断这个主问题“值不值得现在投入”，而不是默认进入执行阶段。

#### 输入
- `TopicQuestion`
- 对应 `ValidatedNeed`
- 相关文献证据

#### 处理逻辑
1. 先做硬门槛判断；
2. 再做加权评分；
3. 再做 ceiling / base / floor 场景分析；
4. 最后给出 `promote / refine / park / drop`。

#### 输出
- `TopicValueAssessment`

#### LLM 适合做的事
- sponsor / skeptic / comparator / gatekeeper 多角色对照；
- 与相邻工作和目标 venue 进行校准；
- 列 reviewer objections。

#### 人工必须介入的点
- 最终决定推进与否；
- 对高价值题进行人工复核。

#### 易错点
- 打分过度精细但无校准；
- 混淆“主观喜欢”和“社区价值”；
- 只看 novelty 不看 answerability；
- 不做 hard gate 就进入排序。

#### 本步一致
- 价值评估必须独立成步；
- `TopicQuestion` 形成后，不可直接滑入 `PaperProject`。

### 8.7 Step 7：形成 TopicPackage

#### 目的
把经过价值 gate 的 topic 整理成可被 paper project 直接继承的综合对象。

#### 输入
- `TopicQuestion`
- `TopicValueAssessment`
- `ValidatedNeed`
- `EvidenceMap`

#### 处理逻辑
1. 生成题目候选集；
2. 生成研究背景与 related work 骨架；
3. 归纳候选方案与 evaluation plan；
4. 写入 expected contributions、risks、objections；
5. 形成 `TopicPackage`。

#### 输出
- `TopicPackage`

#### LLM 适合做的事
- 题目候选生成；
- 背景与 related work 摘要；
- 风险归纳和方案包装。

#### 人工必须介入的点
- 题目候选筛选；
- 对 package 做晋升前审阅。

#### 易错点
- 把 TopicPackage 做成花哨文案而缺少实质字段；
- 题目候选与主问题脱节；
- 只写“创新点”，不写风险。

#### 本步一致
- TopicPackage 是 topic 阶段的正式交付物；
- 题目属于 package 的一部分，而不是前置驱动项。

### 8.8 Step 8：Promotion 到 Paper Project

#### 目的
在 topic 阶段完成后，做一次明确的晋升决策，与现有 paper project 生命周期衔接。

#### 输入
- `TopicPackage`
- `TopicPromotionDecision`

#### 处理逻辑
1. 检查晋升前最低门槛；
2. 生成 `paper_project_payload`；
3. 调用现有 `POST /paper-projects`；
4. 保留 topic 与 paper 的引用关系。

#### 输出
- `PaperProject`
- topic -> paper 追踪关系

#### 本步一致
- 晋升是显式动作；
- promotion 前必须有 TopicPackage 和 ValueAssessment。

### 8.9 流程总览（ASCII）

```text
TopicSeed
   |
   v
EvidenceUnits -> EvidenceMap
   |
   v
ValidatedNeeds
   |
   v
ResearchSlice
   |
   v
TopicQuestion
   |
   v
TopicValueAssessment
   |        \
   |         \__ drop / park / refine
   v
TopicPackage
   |
   v
PromotionDecision
   |
   v
PaperProject
```

### 8.10 本章达成的一致

- 自动化选题的端到端流程应由 8 个阶段组成；
- 各阶段均需沉淀对象，而不是只产出文本；
- `ValidatedNeed`、`TopicQuestion`、`TopicValueAssessment`、`TopicPackage` 是最关键的四个中间对象；
- promotion 是显式 gate，不是隐式过渡。

---

## 9. 价值评估专章

### 9.1 为什么主问题形成后还必须做价值评估

本轮讨论中，最重要的新共识之一就是：

> **形成主问题，不等于这个问题值得做。**

原因包括：

- 有些问题确实存在，但学术价值低；
- 有些问题只有在特定贡献类型下才值钱；
- 有些问题成功后只能形成弱 claim；
- 有些问题资源与评价路径不成立；
- 有些问题和目标社区兴趣不匹配。

因此，价值评估必须被定义为独立 gate，而不是附带说明文字。

### 9.2 为什么价值评估要直接对齐审稿标准

审稿并不是只看“有没有新 idea”。官方 reviewer 口径普遍将以下维度区分开：

- 重要性 / significance；
- 原创性 / originality；
- soundness / quality；
- 清晰度 / clarity；
- 兴奋度 / excitement；
- 可复现性 / reproducibility；
- overall recommendation。[^neurips-guidelines][^arr-guidelines][^arr-review-form]

这意味着选题阶段如果只问“是不是没人做过”，就会严重失真。一个值得推进的题，至少应回答：

1. 社区是否真的在乎；
2. 成功后 claim 有多强；
3. 是否有可靠评价路径；
4. 该以哪种贡献形态进入目标 venue；
5. 风险是否可控。

### 9.3 价值评估的两层机制

#### 第一层：硬门槛（Hard Gates）

建议先做以下 5 项硬门槛；任一失败即不直接 promote：

1. **Real need valid**
   - 真实需求是否站得住；

2. **Claim possible**
   - 成功后是否能写出一条清晰、非平凡、可检验的强 claim；

3. **Evaluation path exists**
   - 数据、baseline、指标、ablation、误差分析是否能闭环；

4. **Resource feasible**
   - 数据、时间、算力、权限、伦理边界是否允许；

5. **Audience exists**
   - 明确这个工作完成后到底投给谁、谁会在乎。

#### 第二层：加权评分（Weighted Scoring）

建议默认采用以下维度：

| 维度 | 说明 | 权重建议 |
|---|---|---:|
| Significance | 真实痛点、影响面、社区相关性 | 25% |
| Originality | 与相邻工作相比的非平凡差异 | 20% |
| Claim strength | 成功后可形成多强的核心贡献陈述 | 20% |
| Answerability | 是否能被可靠验证 | 20% |
| Venue fit / Excitement | 目标 venue 当前是否会买账 | 10% |
| Strategic leverage | 是否沉淀长期资产（benchmark / dataset / tool / new line） | 5% |
| Risk penalty | 数据 / 算力 / baseline / 伦理等扣分项 | 0–15 分扣减 |

### 9.4 为什么要加入 Claim Strength

这是本轮讨论中非常重要的一个补充维度。很多题目的问题不在于“没有 gap”，而在于：

- 就算做成了，也只能写出很弱的贡献；
- 或者只能形成“在某个窄场景下略有提升”的 claim；
- 或者创新点全靠重新命名。

因此，`claim_strength` 必须单独评估，不能简单并入 originality 或 significance。

### 9.5 为什么要加入 Answerability

一个问题可以很重要，但如果没有可执行的评价路径，它在短中期内就不适合作为执行题目。`answerability` 用于衡量：

- 是否有合适数据；
- 是否有可对比 baseline；
- 指标是否可信；
- 是否能做 ablation / robustness / efficiency 检验；
- 结果失败时是否仍有解释空间。

### 9.6 为什么要加入 Venue Fit / Excitement

在学术研究中，价值并非抽象普适量，而是与目标社区和投稿场景紧密相关。相同问题：

- 对方法类会议可能不够强；
- 对 benchmark / dataset 轨道可能很有价值；
- 对 workshop 可能合适，对主会可能不够；
- 对 journal 可能需要更深系统性。

因此，`venue_fit` 或 `excitement` 必须进入评估。

### 9.7 建议的评分阈值

可以采用如下门槛：

- 任一核心维度 `< 3/5`：默认不 promote；
- 总分 `>= 80`：可直接 promote；
- `65–79`：进入 refine，要求补证据或收缩问题；
- `50–64`：park，暂不推进；
- `< 50`：drop。

同时建议：

- 如果某项 hard gate fail，则即使总分高也不直接 promote；
- 评分结果必须配 `confidence`，防止伪精确。

### 9.8 场景分析：Ceiling / Base / Floor

静态总分不够，因为 topic 的投资价值取决于收益分布。建议每个高潜 topic 都写三种情景：

- **Ceiling**：一切顺利时，能达到什么层级；
- **Base case**：大概率能形成什么类型的工作；
- **Floor**：最差至少沉淀什么资产。

这样可以避免两个常见错误：

1. 只盯最优情况，高估题目；
2. 只看当前困难，忽略长期战略价值。

### 9.9 Sponsor / Skeptic / Comparator / Gatekeeper 模式

为了利用 LLM 的比较与反证能力，而不是让它直接拍板，推荐将价值评估拆成四个角色：

- **Sponsor**：为题目构造最强支持论证；
- **Skeptic**：专门寻找这题不值的理由；
- **Comparator**：与相邻工作和目标 venue 做对齐；
- **Gatekeeper**：汇总证据、打分、输出决策与不确定性。

### 9.10 价值评估卡片的建议呈现

建议前端或 markdown 渲染中，将每个 topic 的价值评估卡至少包括：

- strongest claim
- fallback claim
- hard gate pass/fail
- 六维评分雷达或表格
- reviewer objections top 3
- ceiling/base/floor
- decision + next actions

### 9.11 本章达成的一致

- 价值评估必须独立成章、独立对象、独立 gate；
- 评估不能只看 novelty，必须看 significance、claim strength、answerability、venue fit、risk；
- 先 hard gate，再 weighted scoring，再场景分析；
- 多角色对照比单模型拍板更稳；
- 决策输出应为 `promote / refine / park / drop`。

---

## 10. LLM 与人的协作机制

### 10.1 基本立场

本轮讨论对 LLM 的定位非常明确：

- LLM 是研究决策的增强器；
- 不是研究责任的替代者；
- 更不是 novelty 与价值的最终裁判。

这种定位既符合项目自身“**不替代研究路线决策**”的边界，也符合学术出版界对 AI 工具使用的责任要求。[^start-here][^requirements][^nature-ai]

### 10.2 LLM 在自动化选题中最适合承担的角色

#### 1. Idea Expander
- 扩展 seed 的语义边界；
- 提供同义词、相关任务、相关评价维度。

#### 2. Literature Retriever / Router
- 根据 seed 生成检索 query；
- 帮助把 topic 对应到合适的文献范围与 scope。

#### 3. Claim Extractor
- 从摘要 / chunk 中抽取 EvidenceUnit；
- 结构化问题、方案、限制、评价信号。

#### 4. Gap Falsifier
- 主动查找 why-not；
- 识别伪 gap、同义问题和弱动机。

#### 5. Comparator
- 对比不同题目、不同贡献类型、不同 venue 适配性。

#### 6. Gatekeeper / Packager
- 汇总信息、输出价值评估；
- 组装 TopicPackage。

### 10.3 LLM 擅长什么

本轮讨论的一致看法是，LLM 在选题场景中真正擅长的是：

- **语义扩展**：把模糊想法映射到更完整的术语空间；
- **结构化抽取**：从文献文本中抽出 problem / solution / limitation 等字段；
- **聚类比较**：识别不同论文其实在处理同一类问题；
- **反证与对照**：帮助找出“为什么这题可能不成立”；
- **包装与重写**：把命题整理成研究问题、题目候选、背景骨架。

### 10.4 LLM 不擅长什么

LLM 在下列事项上不应被赋予最终权威：

- 认证绝对 novelty；
- 判断一个研究方向的真实发表概率；
- 在检索不足的情况下断言“目前没人做过”；
- 替代作者承担方法与结论责任；
- 在资源、伦理、实验约束上做最终判定。

### 10.5 人必须介入的关键节点

#### A. Seed 约束确认
- 研究兴趣是否正确；
- 时间、数据、算力、方法边界是否真实。

#### B. ValidatedNeed 审核
- 哪些 need 应接受，哪些 should reject。

#### C. 主问题与贡献类型确认
- 这题究竟按 method、benchmark 还是 analysis 去做。

#### D. 价值评估终审
- promote / refine / park / drop 的最终决定。

#### E. Promotion 审批
- 是否真的为此建立 paper project。

### 10.6 协作协议建议

为避免“模型说了算”，建议所有关键对象都包含以下元数据：

```yaml
ProvenanceMeta:
  created_by: human | llm | hybrid
  model_name: string
  run_id: string
  confidence: float
  human_review_required: boolean
  reviewer_id: string
  reviewer_decision: approved | revised | rejected
  reviewed_at: datetime
```

### 10.7 为什么必须保留人工裁决

除了学术责任本身，项目当前的产品边界也明确写着：

- 不替代研究路线决策；
- 不替代研究选题、方法创新与学术判断。[^start-here][^requirements]

自动化选题设计如果不保留人工裁决，就会直接违背项目当前边界。

### 10.8 本章达成的一致

- LLM 在自动化选题中应被拆成多个角色，而不是一个全能 agent；
- 人必须保留 seed 约束、need 审核、价值终审和 promotion 审批权；
- 所有关键对象应携带 provenance 和 review 信息；
- 模块设计必须与项目“不替代研究路线决策”的边界一致。

---

## 11. 与项目现状的关系及落地方式

### 11.1 现有对象与拟新增对象的映射关系

| 现有对象/能力 | 当前语义 | 局限 | 建议新增对象 |
|---|---|---|---|
| Topic profile (`/topics/settings`) | 检索与自动拉取配置 | 不是研究问题对象 | `TopicSeed`, `ResearchSlice` |
| Topic literature scope | 主题下文献范围 | 只表达 in-scope / out-of-scope，不表达需求与命题 | `EvidenceMap`, `ValidatedNeed` |
| Literature retrieve/import | 文献输入与检索 | 不负责研究判断 | `EvidenceUnit` |
| Auto-pull rule/run | 持续发现候选文献 | 不能等价为方向价值 | 作为 Step 2 的输入增强 |
| Paper project | 进入执行态的论文项目 | 假设研究命题已成立 | `TopicQuestion`, `TopicValueAssessment`, `TopicPackage` |
| Stage-gates | paper 内部治理 | topic 级决策未建模 | `topic stage-gates` / `promotion gate` |

### 11.2 最核心的语义区分

本轮讨论最强调的区分之一是：

- `topic profile`：**搜什么**；
- `validated need`：**为什么这题值得看**；
- `topic question`：**到底要回答什么**；
- `value assessment`：**值不值得投资源做**；
- `topic package`：**如果要做，完整交付是什么**；
- `paper project`：**正式进入执行态的论文工程**。

如果这几个层级不分清，topic 系统很容易退化成“检索配置页”。

### 11.3 建议的 topic 状态机

```text
draft_seed
  -> evidence_building
  -> need_review
  -> slice_defined
  -> question_defined
  -> value_assessed
  -> package_ready
  -> promoted

其中 value_assessed 可分支：
  -> refine_required
  -> parked
  -> dropped
```

#### 推荐枚举

```yaml
TopicLifecycleState:
  - draft_seed
  - evidence_building
  - need_review
  - slice_defined
  - question_defined
  - value_assessed
  - refine_required
  - package_ready
  - promoted
  - parked
  - dropped
  - archived
```

### 11.4 建议的 API 方向

为了尽量与现有 `/paper-projects/{id}/stage-gates/{gate}/verify` 风格一致，建议 topic 层补充以下接口：

```text
POST /topics/{topicId}/seeds
GET  /topics/{topicId}/seeds

POST /topics/{topicId}/evidence-map/build
GET  /topics/{topicId}/evidence-map

POST /topics/{topicId}/validated-needs
GET  /topics/{topicId}/validated-needs
PATCH /topics/{topicId}/validated-needs/{needId}

POST /topics/{topicId}/research-slices
GET  /topics/{topicId}/research-slices
PATCH /topics/{topicId}/research-slices/{sliceId}

POST /topics/{topicId}/questions
GET  /topics/{topicId}/questions
PATCH /topics/{topicId}/questions/{questionId}

POST /topics/{topicId}/value-assessments
GET  /topics/{topicId}/value-assessments
POST /topics/{topicId}/stage-gates/value/verify

POST /topics/{topicId}/packages/build
GET  /topics/{topicId}/packages

POST /topics/{topicId}/promotion/to-paper-project
```

### 11.5 推荐的最小 MVP 接口集

如果担心一次性加太多，可以先做最小集合：

1. `POST /topics/{topicId}/questions`
2. `POST /topics/{topicId}/value-assessments`
3. `POST /topics/{topicId}/promotion/to-paper-project`
4. topic 内部存一个简化版 `validated_need[]`

但从设计完整性看，至少应该把 `ValidatedNeed` 和 `ValueAssessment` 独立出来。

### 11.6 与现有 `createPaperProject` 的衔接

当前 `POST /paper-projects` 的示例请求已包含：

- `topic_id`
- `title`
- `research_direction`
- `created_by`
- `initial_context.literature_evidence_ids`

这实际上为 topic -> paper 的衔接提供了天然接口。[^openapi]

建议做法：

- `TopicPromotionDecision.paper_project_payload` 映射到现有 `createPaperProject` 请求；
- `TopicPackage.title_candidates` 选定一个 title 后作为 `title`；
- `main_question` / `research_slice` 总结后作为 `research_direction`；
- `EvidenceMap` 与 `ValidatedNeed` 涉及的核心文献 ID 汇总为 `literature_evidence_ids`。

### 11.7 与现有 topic settings / auto-pull 的关系

建议明确一个重要边界：

- `topic settings` 负责**发现候选文献**；
- `auto-pull` 负责**持续更新候选输入**；
- 它们不应直接改变 `ValidatedNeed` 或 `TopicValueAssessment` 的结论；
- 新文献到来后，可触发“需要重新审查”的状态，但不能自动 promote。

#### 推荐机制

- 当 auto-pull 引入高相关新文献时：
  - 将 `EvidenceMap.status` 标为 `needs_refresh`；
  - 将相关 `ValidatedNeed.status` 标为 `challenged` 或 `recheck_required`；
  - 不自动覆盖人工结论。

### 11.8 建议的前端视图

#### A. Topic Seed / Constraints 面板
- 输入初步想法；
- 配置约束；
- 关联已有 topic profile。

#### B. Evidence Review 面板
- 左侧问题簇；
- 右侧支持文献与限制；
- 支持“标记同义问题 / 合并 / 驳回”。

#### C. Validated Need 面板
- 展示每个 need 的支持与反证；
- 允许人工 accept / reject。

#### D. Question & Contribution 面板
- 主问题、子问题、贡献类型候选；
- 支持切换 method / benchmark / analysis 视角。

#### E. Value Assessment 卡片
- hard gates、六维评分、风险、reviewer objections、decision。

#### F. Topic Package 面板
- 题目候选、背景、方案、evaluation plan、promotion readiness。

#### G. Promotion 面板
- 明确从 topic 晋升到 paper project；
- 展示将传递到 paper 的字段。

### 11.9 docs 体系中的推荐落点

#### 第一阶段：讨论稿
- `docs/project/design/automated-topic-management.md`

#### 第二阶段：拆分为正式上下文制品
- `docs/context/process/topic-selection.bpmn`
- `docs/context/api/openapi.yaml` 中新增 topic 相关契约
- `docs/context/glossary.json` 增补 TopicSeed / ValidatedNeed 等术语
- `docs/context/architecture-principles.md` 写入选题相关原则
- 必要时增加 `docs/context/topic/` 或 `docs/context/research/` 专门目录

#### 第三阶段：注册到 registry
- 更新 `docs/context/registry.json`
- 运行 checksum / verify 流程。[^context-index]

### 11.10 本章达成的一致

- 自动化选题模块应作为 topic 与 paper-project 之间的中间层；
- 最关键的新对象是 `ValidatedNeed`、`TopicQuestion`、`TopicValueAssessment`、`TopicPackage`；
- 应采用与现有 stage-gate 一致的 promotion 风格；
- topic settings / auto-pull 是输入增强层，不是研究决策层；
- 文档应先落 `docs/project`，稳定后纳入 `docs/context`。

---

## 12. 常见坑、风险与防护机制

### 12.1 伪 gap：术语差异造成的“没人做过”幻觉

#### 风险
相同问题在不同子领域使用不同术语表达，模型可能误以为不存在相关工作。

#### 防护
- 第 2 步必须做问题归一化与 alias 聚类；
- 第 3 步必须有 comparator / falsifier 角色；
- 关键 need 必须抽查跨术语检索结果。

### 12.2 Limitation harvesting 偏差

#### 风险
直接把论文“未来工作 / limitation”段落收集成改进点，极易产生误判。

#### 防护
- limitation 只能作为线索，不能直接升级为 unmet need；
- 需要与 solved patterns、邻近任务、强基线一起审查。

### 12.3 标题先行偏差

#### 风险
一旦过早生成题目，后续推理会围绕标题自我证明。

#### 防护
- 题目候选后置到 TopicPackage；
- Step 5 必须先产出主问题与贡献类型。

### 12.4 评分幻觉

#### 风险
LLM 可以给出看似精细的 1–5 分，但分数并不稳定也不可校准。

#### 防护
- 每个维度都要配 evidence refs 与 confidence；
- 先 hard gate，再评分；
- 同时保留 reviewer objections 与 next actions。

### 12.5 价值与可行性脱节

#### 风险
题目重要，但数据、算力、baseline 或伦理限制导致不可执行。

#### 防护
- `resource_feasible` 作为 hard gate；
- `risk_penalty` 单独扣分；
- Step 1 就写入约束；
- Step 5 包含 answerability plan。

### 12.6 venue 错配

#### 风险
问题有意思，但不匹配目标社区的接受习惯。

#### 防护
- value assessment 中单独评估 venue fit / excitement；
- 同一个 need 可以尝试不同 contribution hypothesis。

### 12.7 过度自动化

#### 风险
系统越做越像“自动科研代理”，偏离项目边界。

#### 防护
- 保留人工审查、审批、promotion；
- 所有自动决策都要求 provenance 与 review 状态；
- 明确 out-of-scope：不替代研究路线决策。[^start-here][^requirements]

### 12.8 EvidenceMap 污染

#### 风险
低质量文献、摘要误判、检索召回不足会污染图谱。

#### 防护
- 抽样校验 EvidenceUnit；
- 标注 extraction scope；
- 允许 evidence strength 与 extraction confidence 分离；
- 高价值 need 要求人工复核支持文献。

### 12.9 topic settings 与 research topic 混淆

#### 风险
用户以为设置了 topic 规则，就等于完成了选题。

#### 防护
- UI 与对象命名明确区分：profile/settings vs question/package；
- promotion 只能从 package 触发，而不是从 settings 页面触发。

### 12.10 状态机过严导致卡死

#### 风险
如果每一步都要求完美，会让 topic 永远停在 refine。

#### 防护
- 允许 partial states；
- package 可以 review_ready 而不是完美无缺；
- promotion 依据最低充分条件，而非理想完备。

### 12.11 本章达成的一致

- 自动化选题最主要的坑不是“生成不出来”，而是“生成得很像样但逻辑有偏”；
- 伪 gap、标题先行、评分幻觉、venue 错配、过度自动化是最关键风险；
- 每个关键风险都应有机制级防护，而不是依赖使用者经验。

---

## 13. 对后续论文全周期的支撑关系

### 13.1 对引言的支撑

`ValidatedNeed` 与 `TopicPackage.research_background` 可以直接提供：

- 问题动机；
- 真实需求陈述；
- 为什么现有工作仍未充分解决；
- 为什么这个切口值得做。

这比后期临时编写动机更可靠，因为其来源可回溯到 EvidenceMap。

### 13.2 对 Related Work 的支撑

EvidenceMap 天然可以转成 related work 的骨架：

- 问题簇；
- solution family；
- limitations pattern；
- unresolved vs solved patterns。

这样 related work 就不只是按论文顺序罗列，而是围绕问题空间组织。

### 13.3 对方法设计的支撑

`TopicQuestion` 中的：

- main_question
- sub_questions
- contribution_hypothesis
- strongest_claim_candidate

会直接决定：

- 方法应该解决什么；
- 不应解决什么；
- 哪些模块是主创新，哪些只是工程支撑；
- 方法写作时 claim 边界在哪里。

### 13.4 对实验设计的支撑

`answerability_plan` 与 `evaluation_plan_summary` 可以直接转为：

- 数据集候选；
- baseline 清单；
- 指标组合；
- ablation / robustness / efficiency 检查项；
- 风险补充实验列表。

### 13.5 对审稿风险审查的支撑

`TopicValueAssessment.reviewer_objections_top3`、`risk_penalty`、`scenarios` 可以提前暴露：

- “这题不重要”的风险；
- “贡献过弱”的风险；
- “对比不充分”的风险；
- “实验无法支撑 claim”的风险。

这使得投稿前风险报告可以从选题阶段继承，而不是事后补救。

### 13.6 对 Rebuttal 的支撑

如果选题阶段已经记录：

- why it matters；
- why prior work insufficient；
- strongest/fallback claim；
- baseline / evaluation 路径；
- 预设 reviewer objections；

那么后期 rebuttal 时，系统就可以更快把审稿意见映射回：

- 哪个 need 被挑战；
- 哪个 claim 需要收缩；
- 哪个证据链需要补；
- 哪类附加实验最有针对性。

### 13.7 本章达成的一致

- 自动化选题不是独立功能岛，而是后续论文工程的地基；
- 如果选题阶段对象化做得好，引言、related work、方法、实验、风险报告和 rebuttal 都会获益；
- 这也是项目为什么不应满足于“生成题目”的核心原因。

---

## 14. 实施路径与迭代计划

### 14.1 总体策略

建议采用“**先建立中间对象与 gate，再增强自动化程度**”的迭代策略，而不是一开始追求全自动选题代理。

### 14.2 Phase 0：文档与概念固化

#### 目标
把本次讨论先固化成设计基线。

#### 建议动作
- 落地本文档到 `docs/project/design/`；
- 在 `docs/context/glossary.json` 增补核心术语；
- 在 `docs/context/architecture-principles.md` 写入首批原则；
- 评估是否新增 `docs/context/process/topic-selection.bpmn`。

### 14.3 Phase 1：MVP（最小闭环）

#### 目标
先让“topic -> question -> value -> promote”跑通。

#### 推荐范围
- 复用现有 `topic settings` 与 `literature scope`；
- 新增轻量 `ValidatedNeed` 存储；
- 新增 `TopicQuestion`；
- 新增 `TopicValueAssessment`；
- 新增 `promotion/to-paper-project`。

#### 不一定立即做
- 复杂多 agent 编排；
- 自动 EvidenceMap 聚类 UI；
- 跨 topic 排名；
- 历史学习与偏好建模。

### 14.4 Phase 2：Evidence-first 完整化

#### 目标
把 Step 2–3 做扎实。

#### 推荐范围
- 完整 `EvidenceUnit` 抽取；
- `EvidenceMap` 聚类与图谱视图；
- `ValidatedNeed` 支持 / 反证视图；
- auto-pull 驱动 `needs_refresh` 机制。

### 14.5 Phase 3：价值评估增强

#### 目标
提高 topic 排序与决策质量。

#### 推荐范围
- sponsor / skeptic / comparator / gatekeeper 多角色评估；
- pairwise ranking；
- venue-aware 评分配置；
- scenario analysis 模板化。

### 14.6 Phase 4：与 paper lifecycle 深度整合

#### 目标
真正把 TopicPackage 作为 PaperProject 的前置对象。

#### 推荐范围
- `createPaperProject` 直接消费 package payload；
- stage-gate 可回溯到 topic 决策；
- 写作 package / risk report 能引用 validated needs 与 initial claims。

### 14.7 验证模块是否真的有效

建议从四个层面评估模块成效：

#### A. 过程指标
- 从 seed 到 package 的完成率；
- 需要 refine 的比例；
- 被 drop / park 的比例；
- promotion 决策可解释性。

#### B. 质量指标
- 人工评审对 need / question / value 的满意度；
- 伪 gap 被提前识别的比例；
- 与纯手工流程相比的结构化程度。

#### C. 下游支撑指标
- 引言和 related work 构建时间是否下降；
- 早期实验返工率是否下降；
- 投稿前风险报告命中率是否上升。

#### D. 系统一致性指标
- 新对象是否顺利进入 context/registry；
- topic 与 paper 的关系是否稳定；
- 审查记录是否完整可追溯。

### 14.8 本章达成的一致

- 实施应先从文档与中间对象开始，而不是一口气做全自动 agent；
- MVP 应优先打通 `ValidatedNeed -> TopicQuestion -> TopicValueAssessment -> Promotion`；
- EvidenceMap 完整化、价值评估增强和深度生命周期整合可以分阶段推进；
- 模块效果应通过研究决策质量和下游支撑能力来验证。

---

## 15. 未决问题与后续待确认事项

### 15.1 评分是否按学科 / venue 自适应

当前设计默认适用于 CS 论文工程，但不同社区对于：

- novelty
- empirical breadth
- benchmark value
- system value
- theory contribution

的权重并不相同。后续需要确认：

- 评分配置是否应按 venue profile 自适应；
- 是否需要单独的 track / venue 模板。

### 15.2 题目候选什么时候进入稳定态

虽然本轮一致认为题目应后置，但仍需明确：

- package 阶段是否允许多个 title candidates 长时间并存；
- promote 时是否必须固定一个 title；
- 后续 paper project 是否允许 title 继续演化。

### 15.3 TopicPackage 与 PaperProject 的边界

仍需进一步明确：

- TopicPackage 是否只负责“研究命题与初始计划”；
- 是否需要承接更细的 early experiment planning；
- promotion 之后哪些字段仍与 topic 双向同步，哪些冻结。

### 15.4 人工权限边界

需要进一步决定：

- 谁可以 approve validated need；
- 谁可以 override value assessment；
- 是否允许 owner 直接跳过部分 gate promote。

### 15.5 文献证据的“最低充分条件”

本轮只提出了方向，没有完全定量化：

- 多少篇高相关文献足以支撑一个 validated need；
- 支持证据与反证证据的最少数量如何界定；
- 摘要级证据在什么情况下需要升级为全文级证据。

### 15.6 多设备同步与 topic 审查状态

项目已明确支持同一用户多设备同步。后续需要明确：

- topic 对象、审查状态与 evidence map 是否全部进入同步控制面；
- 哪些内容本地优先，哪些内容云端可同步；
- 是否对不同设备上的评估结论做冲突合并。[^start-here][^requirements]

### 15.7 本章达成的一致

- 自动化选题的主设计已经收敛，但配置化与治理边界仍有若干开放问题；
- 这些问题不影响先做 MVP，但会影响后续可扩展性；
- 建议单列 issue 或 RFC 跟进。

---

# 附录 A：建议写入架构原则的条目

建议将以下内容写入 `docs/context/architecture-principles.md`：

1. **Evidence-first topic decisions**
   - Topic 级关键结论必须绑定 evidence refs。

2. **Falsification before promotion**
   - 任何 topic 在晋升 paper project 之前，必须经过反证审查与价值评估。

3. **Topic profile is not research question**
   - 检索配置与研究命题必须分层建模。

4. **Human approval required for topic promotion**
   - 自动评估不能直接触发 paper project 创建。

5. **TopicPackage as the bridge artifact**
   - TopicPackage 是 topic 阶段的正式对外输出对象。

---

# 附录 B：价值评估评分细则（简版）

## B.1 Significance

| 分数 | 含义 |
|---|---|
| 1 | 仅局部、边角、缺乏社区相关性 |
| 2 | 有一定需求，但影响面窄 |
| 3 | 中等重要，特定子社区会关心 |
| 4 | 明确重要，多个相关场景受影响 |
| 5 | 高重要性，属于核心痛点或关键瓶颈 |

## B.2 Originality

| 分数 | 含义 |
|---|---|
| 1 | 与已有工作几乎无差异 |
| 2 | 差异主要是组合或包装 |
| 3 | 有一定非平凡差异 |
| 4 | 与相邻工作相比具有明显新切口 |
| 5 | 提供强而清楚的新视角或新贡献形态 |

## B.3 Claim Strength

| 分数 | 含义 |
|---|---|
| 1 | 成功后也只能形成很弱或很窄的 claim |
| 2 | claim 勉强成立，但不耐审稿追问 |
| 3 | 可形成清晰但中等强度的 claim |
| 4 | 可形成强、明确且可检验的 claim |
| 5 | 可形成高度凝练、很有说服力的核心贡献陈述 |

## B.4 Answerability

| 分数 | 含义 |
|---|---|
| 1 | 基本无可执行评价路径 |
| 2 | 评价路径存在明显缺口 |
| 3 | 可以验证，但有若干重要风险 |
| 4 | 评价方案较完整，风险可控 |
| 5 | 评价路径清晰、充分、可复现 |

## B.5 Venue Fit / Excitement

| 分数 | 含义 |
|---|---|
| 1 | 目标社区几乎不会买账 |
| 2 | 适配度较弱 |
| 3 | 有一定适配度 |
| 4 | 明显匹配某类 venue / track |
| 5 | 高度匹配，且有较强兴趣点 |

## B.6 Strategic Leverage

| 分数 | 含义 |
|---|---|
| 1 | 几乎无复用价值 |
| 2 | 价值主要局限于当前问题 |
| 3 | 可沉淀有限可复用资产 |
| 4 | 可沉淀明显的长期资产 |
| 5 | 对后续多项目 / 多阶段有高杠杆价值 |

---

# 附录 C：推荐的最小 JSON/YAML 合同草案

```yaml
TopicAssessmentBundle:
  topic_id: string
  seed:
    $ref: TopicSeed
  validated_needs:
    - $ref: ValidatedNeed
  research_slice:
    $ref: ResearchSlice
  question:
    $ref: TopicQuestion
  value_assessment:
    $ref: TopicValueAssessment
  package:
    $ref: TopicPackage
```

```yaml
TopicPromotionRequest:
  topic_id: string
  topic_package_id: string
  selected_title: string
  approved_by: string
  note: string
```

```yaml
TopicPromotionResponse:
  promotion_id: string
  topic_id: string
  paper_id: string
  status: promoted
  created_at: datetime
```

---

# 附录 D：推荐的前端信息架构

```text
Topic Workspace
├── Seed & Constraints
├── Literature Scope
├── Evidence Review
├── Validated Needs
├── Research Slice
├── Questions & Contribution Types
├── Value Assessment
├── Topic Package
└── Promote to Paper Project
```

---

# 附录 E：推荐的实施优先级

## E.1 必做（MVP）
- `ValidatedNeed`
- `TopicQuestion`
- `TopicValueAssessment`
- `PromotionDecision`

## E.2 次优先
- `EvidenceUnit` / `EvidenceMap`
- sponsor/skeptic/comparator/gatekeeper 评估编排
- topic package 自动组装

## E.3 后续增强
- pairwise ranking
- venue-aware scoring template
- 多 topic portfolio 管理
- 历史 topic 决策模式复用

---

# 附录 F：外部参考与仓库依据

[^repo-readme]: `README.md`（GitHub 仓库主页与 README）：<https://github.com/willyu1007/My-Researcher/blob/main/README.md>
[^context-index]: `docs/context/INDEX.md`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/context/INDEX.md>
[^openapi]: `docs/context/api/openapi.yaml`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/context/api/openapi.yaml>
[^start-here]: `docs/project/overview/START-HERE.md`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/project/overview/START-HERE.md>
[^requirements]: `docs/project/overview/requirements.md`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/project/overview/requirements.md>
[^ui-spec]: `docs/context/ui/ui-spec.json`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/context/ui/ui-spec.json>
[^ui-align]: `docs/context/ui/current-state-alignment.md`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/context/ui/current-state-alignment.md>
[^arch-principles]: `docs/context/architecture-principles.md`：<https://github.com/willyu1007/My-Researcher/blob/main/docs/context/architecture-principles.md>
[^neurips-guidelines]: NeurIPS 2025 Reviewer Guidelines：<https://neurips.cc/Conferences/2025/ReviewerGuidelines>
[^arr-guidelines]: ACL Rolling Review Reviewer Guidelines：<https://aclrollingreview.org/reviewerguidelines>
[^arr-review-form]: ACL Rolling Review Review Form：<https://aclrollingreview.org/reviewform>
[^nature-ai]: Nature Portfolio AI policy：<https://www.nature.com/nature-portfolio/editorial-policies/ai>
[^egm-big-picture]: Campbell F, et al. *Mapping reviews, scoping reviews, and evidence and gap maps: the same but different?*：<https://pmc.ncbi.nlm.nih.gov/articles/PMC10014395/>
[^egm-guidance]: White H, et al. *Guidance for producing a Campbell evidence and gap map*：<https://pmc.ncbi.nlm.nih.gov/articles/PMC8356343/>

---

## 收束结论

本轮关于“自动化选题”的讨论，已经形成了较完整的一套设计共识：

1. **自动化选题不等于自动题目生成**；
2. **核心主线应是：证据 -> 真实需求 -> 主问题 -> 价值评估 -> 选题包**；
3. **价值评估必须独立出来，并直接对齐审稿维度**；
4. **LLM 的角色是抽取、比较、反证、包装，而不是替代学术判断**；
5. **TopicPackage 应成为 topic 阶段的正式交付物**；
6. **该模块的最佳落点，是作为 topic 与 paper project 之间的中间决策层**；
7. **实现上应优先补中间对象与 promotion gate，再逐步增强自动化程度。**

如果后续需要进一步推进，最自然的下一步有两条：

- 直接把本文拆成 `docs/context` 下的正式 artifact；
- 基于本文中的对象与流程，继续细化数据库表、OpenAPI 契约与前端页面原型。
