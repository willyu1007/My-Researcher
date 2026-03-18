
# 研究论证框架与算法设计文档
**项目**：My-Researcher / `paper-engineering-assistant`  
**主题**：基于审稿约束的研究论证控制、启发式搜索与 LLM 自动化架构  
**文档状态**：讨论收束稿（基于当前多轮设计讨论整理）  
**适用范围**：研究论证层 / 写作前收敛层  
**不覆盖**：正式论文写作流程、章节生成、文稿润色与投稿文本自动产出  

---

## 目录
- [第 1 章 文档目的、范围与使用方式](#第-1-章-文档目的范围与使用方式)
- [第 2 章 项目现状与问题重述](#第-2-章-项目现状与问题重述)
- [第 3 章 背景、痛点与设计动机](#第-3-章-背景痛点与设计动机)
- [第 4 章 核心边界与总体设计原则](#第-4-章-核心边界与总体设计原则)
- [第 5 章 研究论证框架的总体定义](#第-5-章-研究论证框架的总体定义)
- [第 6 章 审稿约束层：方向性目标空间](#第-6-章-审稿约束层方向性目标空间)
- [第 7 章 论证对象图：真实研究状态层](#第-7-章-论证对象图真实研究状态层)
- [第 8 章 动作空间设计：以 sub-function 3–6 为宏动作族](#第-8-章-动作空间设计以-sub-function-36-为宏动作族)
- [第 9 章 启发式搜索算法框架](#第-9-章-启发式搜索算法框架)
- [第 10 章 退出、回退、转向与经验吸收](#第-10-章-退出回退转向与经验吸收)
- [第 11 章 LLM 自动化适配性与角色分工](#第-11-章-llm-自动化适配性与角色分工)
- [第 12 章 系统架构：从算法到工程落地](#第-12-章-系统架构从算法到工程落地)
- [第 13 章 与项目现状的关系与演进路径](#第-13-章-与项目现状的关系与演进路径)
- [第 14 章 风险、坑与反模式](#第-14-章-风险坑与反模式)
- [第 15 章 相关项目参考与可借鉴点](#第-15-章-相关项目参考与可借鉴点)
- [第 16 章 开放问题与待决策项](#第-16-章-开放问题与待决策项)
- [附录 A 术语表](#附录-a-术语表)
- [附录 B 核心数据结构草案](#附录-b-核心数据结构草案)
- [附录 C Planner Loop 伪代码](#附录-c-planner-loop-伪代码)
- [附录 D 示例场景](#附录-d-示例场景)
- [附录 E 与仓库现有 requirements 的映射表](#附录-e-与仓库现有-requirements-的映射表)
- [参考链接](#参考链接)

---

# 第 1 章 文档目的、范围与使用方式

## 1.1 文档目的
这份文档用于把当前关于“研究论证 / 论文管理”的多轮讨论，收束成一份可以进入仓库的正式设计文档。它要完成三件事：

1. **统一概念**  
   明确“论文管理”在本项目中的真正含义，不再把它理解为文件管理、任务看板或线性阶段推进，而是定义为“研究论证控制面”。

2. **统一算法框架**  
   把“以审稿约束为目标空间、以论证对象图为真实状态、以启发式搜索驱动 LLM 自动化收敛”的方案形式化。

3. **统一工程落点**  
   明确这套设计如何落到当前仓库已有定位、实体、工作流和技术栈中，避免讨论与项目现实脱节。

## 1.2 文档范围
本文件只覆盖以下内容：

- 研究论证层的目标、边界与成功定义
- 审稿约束层的维度设计、状态表示与阶段门槛
- 论证对象图的核心实体、关系和字段建议
- 以 sub-function 3–6 为宏动作族的动作空间设计
- 基于启发式搜索的规划框架、退出/回退/转向机制
- LLM 在该系统中的职责划分、限制与适配方式
- 相关系统架构与工程落地建议

本文件**不直接覆盖**：

- 最终论文的正文写作
- 摘要、引言、方法、实验等章节文本生成
- 文稿润色、图表排版、投稿平台填写
- 以“生成完整 paper”为目标的端到端写作系统设计

## 1.3 目标读者
- 项目设计者与产品负责人
- 后续实现者（前后端、Agent/Planner、数据建模）
- 未来协作者或架构评审者
- 希望理解项目“为什么不是自动写论文器，而是研究论证控制系统”的读者

## 1.4 文档输出目标
这份文档最终应支持以下用途：

- 作为后续数据模型、Planner、UI 控制面的设计依据
- 作为仓库中 `requirements / architecture / planner` 系列文档的上位说明
- 作为团队内部对齐“研究论证层”和“写作层”边界的准绳
- 作为未来吸纳外部自动化科研系统经验时的判断框架

---

# 第 2 章 项目现状与问题重述

## 2.1 当前仓库的正式定位
根据当前仓库 `README.md`，项目已经明确定位为：

> **Local-first desktop assistant for CS paper engineering with reviewer-aligned evidence workflows.**

并且在 `requirements.md` 中已经明确了以下正式主线：

- 面向计算机科学研究场景
- 以本地优先、桌面工作区为核心
- 以 `Claim / Evidence / Baseline / Protocol / ReproItem` 为关键对象
- 支持 Claims-to-Evidence traceability 与覆盖检查
- 支持 reviewer-style 规则化自检报告
- 支持高自动化任务编排、长时任务、失败恢复
- 与 Git 工作流、本地文件系统、多设备同步结合
- 明确 **不承诺自动产出可发表论文，不允许无证据生成实验结论**

这意味着项目当前已经天然偏向**研究工程化与审稿对齐**，而不是“八步自动写论文”。

## 2.2 当前“论文管理 / 研究论证”在项目中的位置
在 `requirements.md` 中，8 个 sub-functions 仅被标记为：

- `discussion draft`
- `not finalized`

其中第 8 个“论文管理”也只是粗粒度占位，当前包含：

- 项目生命周期
- 版本快照
- 里程碑
- 任务与状态追踪
- Git 工作流
- 多设备同步控制面

这说明仓库已经有了“论文管理”的**能力边界**雏形，但还没有形成**流程框架与控制模型**。

## 2.3 为什么需要重述问题
如果继续沿用“论文管理”这个名字，而不重述其语义，会出现几个问题：

1. 容易把重点误解为：
   - 文档管理
   - 任务管理
   - 里程碑管理
   - 文件版本管理

2. 容易把研究推进误建模为：
   - 线性阶段流
   - 固定页面跳转
   - 表单式工作流

3. 容易弱化项目真正的核心：
   - 研究贡献能否成立
   - 证据是否足够
   - 对比是否公平
   - 风险是否可控
   - 是否值得继续投入

因此，本轮讨论中我们对问题做了重述：

> 当前要设计的不是“论文文件管理”，也不是“八步写论文流程”，而是**研究论证控制系统**。  
> 它的核心任务，是把一个尚未成型的研究方向，逐步收敛到“重要、有价值、可产出、证据充分、可进入后续写作”的状态。

## 2.4 本轮讨论解决的核心问题
本轮讨论最终收敛到以下几个核心问题：

1. 当前项目是否应主张“八步骤主流程”  
   结论：**不应**。八个 sub-functions 更适合作为能力分区或宏动作族，而不是唯一主流程。

2. 当前是否已有确定的“论文管理流程框架”  
   结论：**没有完全定稿**。现有文档仅定义了能力范围，没有给出完整控制逻辑。

3. 研究推进的核心区在哪里  
   结论：核心区是 **sub-function 3–6**，即理论/研究设计、实验协议、方法执行、证据分析这几个部分形成的网状推进区。

4. 系统如何给 LLM 提供明确方向  
   结论：通过**审稿约束层**提供方向性目标，用**论证对象图**承载真实状态，再通过启发式搜索决定“下一步最值得做什么”。

---

# 第 3 章 背景、痛点与设计动机

## 3.1 传统论文 / 研究管理方式的问题
传统的学术研究与论文准备，往往存在以下问题：

### 3.1.1 研究状态散落在非结构化媒介中
- 想法在零散笔记中
- baseline 对比在表格或脑中
- 实验日志在脚本、终端、W&B、表格中
- claim 与 evidence 的对应关系没有被结构化保存
- 失败案例、边界条件和 reviewer 风险经常在后期才被重新整理

### 3.1.2 过程往往是“文本驱动”，不是“证据驱动”
研究者常常先写了一版叙事，再回头补实验。但真正影响审稿结果的，往往不是叙事，而是：

- claim 是否准确
- 证据是否足够
- baseline 是否充分
- protocol 是否公平
- 风险边界是否诚实

如果系统过早围绕写作展开，会导致：
- 提前固化叙事
- 用文本掩盖证据缺口
- 难以及时发现方向不值得继续

### 3.1.3 线性阶段感与真实研究迭代不一致
现实研究经常是非线性的：

- 理论框架提出后，可能分出多个实验支线
- 训练失败会迫使人回退到更早的假设节点
- 新 baseline 的加入可能直接推翻当前 superiority claim
- 结果分析可能迫使 claim 收缩，而不是继续“补写”

这意味着研究推进更像**有分支、有回退、有重规划的图搜索**，而不是线性流水线。

### 3.1.4 reviewer 风险暴露太晚
很多关键风险在后期才被发现：
- 漏掉强 baseline
- 评价协议不公平
- 结果波动过大
- 证据不足以支撑某个 claim
- 贡献价值不够，做出来也不值得发

如果系统没有一开始就围绕 reviewer-facing constraints 运转，资源就会被浪费在低价值或高风险分支上。

## 3.2 为什么单纯“自动写论文”不是目标
本项目当前边界很明确：**核心不是自动生成可发表论文，而是建立研究论证与证据闭环。**

这样定义有几个原因：

1. **与仓库现状一致**  
   requirements 已明确：不承诺自动产出可发表论文，不替代研究判断，不允许无证据生成实验数字。

2. **更适合 CS 研究的真实流程**  
   在多数 CS 研究中，真正困难的是：
   - 方向判断
   - 价值与 novelty 的确认
   - protocol 的设计
   - 结果的产出与解释
   - 风险与边界的梳理  
   而不是“把已有内容写成文字”。

3. **更适合 LLM 的强项**  
   LLM 更适合：
   - 生成候选
   - 总结文献
   - 归纳不足
   - 提出下一步动作
   - 按 reviewer 视角批判  
   而不是凭空成为实验真值源。

## 3.3 为什么要引入“审稿约束”
“审稿约束”在这里不是形式化审稿打分表，而是一个更一般化的**方向性目标空间**。

### 3.3.1 它为 LLM 自动化提供方向
没有方向性时，LLM 会倾向于：
- 生成大量局部建议
- 追求文本丰富度而非关键缺口
- 反复做低成本但低价值动作
- 无法判断何时继续、何时停止、何时转向

有了审稿约束层之后，LLM 的核心问题变成：

> 当前哪些维度尚未收敛？  
> 哪个动作最有可能推进这些维度？  
> 是否值得为此付出资源？  

### 3.3.2 它与真实审稿逻辑相容
虽然我们当前讨论的是“写作前论证层”，不是最终稿件，但真实审稿中反复出现的关注点——重要性、价值、创新性、正确性、评测充分性、边界和复现性——恰好就是研究在进入写作前必须基本站住的部分。

### 3.3.3 它让自动化具备“终点感”
系统不再只是“不断做更多实验、写更多文字”，而是朝以下目标收敛：

- 值得继续投入
- 值得发表
- 有合理产出路径
- 证据与素材足够
- 主要 reviewer 风险已识别并处理

## 3.4 希望达到的效果
本轮设计希望达到的效果不是“生成一篇完整论文”，而是：

1. **前期止损更早**  
   尽早判断某个方向是 kill、pivot 还是值得继续。

2. **研究推进更聚焦**  
   系统围绕高价值、高 blocker、高信息增益的动作推进，而不是泛化地“做更多”。

3. **证据与素材持续结构化积累**  
   为后续真实写作准备好：
   - 清晰 claim
   - 对应 evidence
   - baseline / protocol 说明
   - boundary / limitation
   - 关键图表与结果来源

4. **LLM 真正进入自动化主循环**  
   LLM 不再只做文本助手，而是成为：
   - proposer
   - critic
   - replanner
   - synthesizer

---

# 第 4 章 核心边界与总体设计原则

## 4.1 本框架的边界

### 4.1.1 本框架做什么
- 管理研究方向到论证充分之间的收敛过程
- 管理 Claim / Evidence / Baseline / Protocol / Boundary 等结构化对象
- 评估研究是否值得继续、是否具备进入后续写作流程的条件
- 基于审稿约束引导自动化任务和 LLM 参与研究推进
- 支持回退、分支、转向、归档、经验吸收

### 4.1.2 本框架不做什么
- 不替代方法创新与学术判断
- 不在无证据输入时创造实验结论
- 不把正文写作当作当前主目标
- 不承诺接受概率或结果发表
- 不把 reviewer constraints 等同于学术真理

## 4.2 核心设计原则

### 4.2.1 Evidence-first
任何“成立”都应由 evidence 说话。  
系统中能改变状态的，不是漂亮叙事，而是：
- 新 evidence
- 新 protocol
- 新 baseline
- 新分析发现
- 更严格的边界定义

### 4.2.2 Reviewer-aligned but not reviewer-captured
系统用 reviewer constraints 作为方向盘，但不能把它们当作唯一价值标准。  
它们的作用是：
- 提前暴露风险
- 给自动化提供约束目标
- 提供 stop / continue / pivot 的依据  
而不是替代学术创造性判断。

### 4.2.3 Traceability as first-class design
所有关键对象都必须可追溯：
- claim 由什么问题和价值假设导出
- evidence 支撑了什么 claim
- baseline 为什么有资格比较
- decision 为什么 pivot / kill / reopen
- 经验 lesson 从哪一次失败中来

### 4.2.4 Graph progression over linear stage progression
研究推进是图，不是线。  
系统必须原生支持：
- 多分支
- 多实验并行
- 中间回退
- 局部重开
- 合并/淘汰分支

### 4.2.5 Reopen / pivot / kill are normal actions
回退、转向、停止不是异常，而是系统的核心能力。  
没有这些动作，就无法形成真正的研究控制面。

### 4.2.6 Mixed-state modeling
抽象状态不能只靠“几个离散标签”，也不能只靠“几个分数”。  
必须使用混合表示：
- `level` 提供门槛语义
- `score` 提供排序与启发式细粒度
- `confidence` 表示评估不确定性
- `blockers` 提供必须解除的问题
- `gap` / `velocity` 支持判断是否停滞

### 4.2.7 Local-first, human-visible, safely automatable
由于项目本身是 local-first、Git-integrated、长时任务导向，所有自动化都必须：
- 可回放
- 可审计
- 可停止
- 可追责
- 需要时可人工覆盖

## 4.3 为什么不是八步线性流程
我们在讨论中达成的一致是：

- 八个 sub-functions **可以保留**
- 但它们适合作为**能力分区 / 宏动作族**
- **不适合**作为唯一主流程

原因：

1. 真实研究是网状推进，不是 waterfall
2. 许多状态更新跨越多个 sub-functions
3. 评价“现在在第几步”不如评价“当前哪些约束未收敛”更有用
4. LLM 更适合围绕对象、缺口与动作进行自动化，而不是围绕阶段编号

## 4.4 为什么不是纯评分系统
纯评分系统的问题在于：

- 会被低成本动作刷分
- 无法表达硬 blocker
- 分数改变时不知其因
- 难以支撑回退逻辑
- 无法解释状态变化来自哪些真实对象

因此，我们采用：

> **抽象状态层 + 论证对象图** 的双层表示

其中：
- 抽象状态回答“离目标多远”
- 对象图回答“当前真实掌握了什么、缺什么、能做什么”

---

# 第 5 章 研究论证框架的总体定义

## 5.1 “研究论证”的定义
这里的“研究论证”指的是：

> 从一个研究问题出发，围绕其重要性、价值、创新性、可产出性，逐步形成清晰 claim、充分 evidence、合理 protocol、可接受 baseline、明确 boundary，并在此基础上达到进入后续真实写作流程的状态。

它区别于：

- **项目管理**：更关注资源与时间
- **实验管理**：更关注运行与产物
- **文稿写作**：更关注表达与叙事
- **知识管理**：更关注文献与信息存储

研究论证关注的是：

- “这项工作值不值得做”
- “做成后值不值得发”
- “当前有没有合理路径产出结果”
- “结果是否足以支撑某些 claim”
- “有哪些关键风险与边界”

## 5.2 框架总览
本框架由五个核心层构成：

1. **审稿约束层（Abstract Review-Constraint State）**  
   作为自动化的抽象目标空间。

2. **论证对象图（Argument Object Graph）**  
   作为真实研究状态的结构化表示。

3. **动作空间（Action Space）**  
   以 sub-function 3–6 为宏动作族，以对象级 operator 为原子动作。

4. **启发式搜索（Heuristic Search / Replanning）**  
   用于在当前状态下选择最值得执行的动作或动作包。

5. **控制与记忆（Meta-control & Memory）**  
   负责阶段切换、停滞诊断、回退、转向、退出与经验吸收。

## 5.3 核心目标：两段式收敛

### 5.3.1 第一段：值得继续投入
这一段回答：

- 这个问题是否重要？
- 这项工作是否可能形成有价值的贡献？
- 当前的新意是否真实成立？
- 在现有资源与路径下，是否有合理产出可能？

如果这一段不能过关，系统应优先：
- pivot
- kill
- archive  
而不是继续补实验。

### 5.3.2 第二段：具备进入真实写作的论证基础
这一段回答：

- claim 是否足够清晰
- 证据是否基本闭环
- 评测与对比是否基本站住
- 边界与风险是否被识别
- 复现准备度是否达到最低要求

达到该阶段后，系统才能判定：
- `ready-for-writing entry`

## 5.4 成功状态的定义
这里的“收敛”不是指：

- 研究已经绝对正确
- 所有 reviewer 一定接受
- 所有未来修改都不再需要

而是指：

> 对当前目标 venue / 研究类型而言，核心问题与价值已明确，关键 claim 已稳定，主要 evidence 与 protocol 已具备，关键 reviewer 风险无一级阻塞，已经具备进入真实写作流程的论证基础。

因此，本框架的终点是：

- `WorthContinuing`（阶段 1 终点）
- `ReadyForWritingEntry`（阶段 2 终点）

而不是“文章自动写完”。

---

# 第 6 章 审稿约束层：方向性目标空间

## 6.1 为什么选择“审稿约束层”作为抽象状态空间
研究论证如果没有明确方向，很容易沦为：

- 任意 brainstorm
- 无尽的低收益实验
- 文本上看起来很忙，实质上无关键推进

“审稿约束层”的作用是把“研究进展”改写成：

- 哪些关键维度已足够
- 哪些维度仍被 blocker 阻塞
- 哪些维度只是低置信度的暂时判断
- 下一步做什么最可能推进整体 readiness

因此，它是 LLM 自动化的**方向盘**，而不是最终真理。

## 6.2 约束维度定义
结合前面的讨论，建议将审稿约束层定义为以下 9 个维度。

### 6.2.1 第一段：是否值得继续投入
1. **ProblemImportance**  
   问题是否重要，是否值得社区或目标受众关注。

2. **ContributionValue**  
   即使结果成立，它是否具有足够发表价值，而不是低价值增量。

3. **NoveltyDelta**  
   相对于代表性已有工作，新意是否真实存在，是否具备足够 delta。

4. **OutcomeFeasibility**  
   当前方案是否存在合理产出路径，是否可能在预算内拿到可论证结果。

### 6.2.2 第二段：是否具备进入写作的论证基础
5. **ClaimSharpness**  
   核心 claim 是否清晰、可检验、边界明确、避免 over-claim。

6. **EvidenceCompleteness**  
   claim 对应所需 evidence 是否基本齐备，缺口是否已经可控。

7. **EvaluationSoundness**  
   protocol、baseline、metric、对比、公平性是否基本成立。

8. **BoundaryRiskCoverage**  
   已知边界、失败模式、limitation、风险是否被识别并纳入。

9. **ReproducibilityReadiness**  
   支撑主结果的 run/artifact/config/procedure 是否已达到最低复现准备度。

> 注：`Clarity / Presentation` 不放在当前层。  
> 它属于后续写作层，而不是本轮讨论的研究论证层。

## 6.3 每个维度的状态表示
每个维度建议采用统一的混合状态结构。

### 6.3.1 核心字段
| 字段 | 类型 | 含义 |
|---|---|---|
| `level` | enum | 语义层级状态 |
| `score` | number | 连续分数，用于排序 |
| `confidence` | number | 当前判断置信度 |
| `blockers` | string[] / structured[] | 当前硬阻塞项 |
| `gap` | number | 距离当前阶段门槛的距离 |
| `velocity` | number | 最近若干轮改善速度 |
| `evidenceRefs` | id[] | 支撑当前状态判断的对象引用 |
| `updatedAt` | datetime | 最近更新时间 |

### 6.3.2 `level` 建议取值
```ts
type ReadinessLevel =
  | "Unknown"
  | "Blocked"
  | "Partial"
  | "Sufficient"
  | "Strong";
```

语义建议：

- `Unknown`：信息不足，无法判断
- `Blocked`：存在明确一级阻塞
- `Partial`：已有部分支撑，但仍不足
- `Sufficient`：达到当前阶段最低门槛
- `Strong`：明显高于最低门槛

### 6.3.3 `score` 的作用
`score` 不是最终判定，而是辅助启发式搜索做排序。  
例如，当两个动作都能把某维度从 `Partial` 推进向 `Sufficient` 时，`score` 能帮助比较谁的边际收益更大。

建议区间：
- `[0, 100]` 更利于 UI 和排序
- 也可内部使用 `[0, 1]`，对外转换为百分制

### 6.3.4 `confidence` 的作用
很多时候问题不是“低分”，而是“低置信度”。  
例如：
- novelty 可能看起来不错，但 related work 覆盖不足
- feasibility 可能有希望，但还没有 probe
- evidence 可能看起来足够，但只有单次 run

因此 `confidence` 是启发式搜索的关键输入之一。

## 6.4 分数与阶段门槛

### 6.4.1 为什么既要 level，又要 score
- `level` 用于：
  - 阶段切换
  - blocker 判断
  - 状态解释
  - UI 标签
- `score` 用于：
  - 候选动作排序
  - bundle 价值估计
  - 细粒度比较

### 6.4.2 为什么不能只用总分
总分最大化会导致：

- 系统偏向刷低成本、易提升的小项
- 忽略关键 blocker
- 隐藏“结构性不成立”的风险
- 导致“看起来进步很大，实际上仍不能继续投入”

因此：
- 不使用单一全局总分作为主决策依据
- 阶段切换必须同时检查 `level + blockers + confidence`

### 6.4.3 阶段门槛建议
**阶段 1 通过条件（WorthContinuing）**  
以下四维至少达到 `Sufficient`，且无一级 blocker：
- ProblemImportance
- ContributionValue
- NoveltyDelta
- OutcomeFeasibility

**阶段 2 通过条件（ReadyForWritingEntry）**  
以下五维至少达到 `Sufficient`，且无一级 blocker：
- ClaimSharpness
- EvidenceCompleteness
- EvaluationSoundness
- BoundaryRiskCoverage
- ReproducibilityReadiness

## 6.5 收敛、回退与重开
维度状态不应假定单调提升。  
典型反例：

- 补入更强 baseline 后，`EvaluationSoundness` 上升，但 superiority claim 被削弱，`ContributionValue` 下降
- 新 related work 出现后，`NoveltyDelta` 下降
- 新 probe 失败后，`OutcomeFeasibility` 下降
- claim 收缩后，`ClaimSharpness` 上升，但 `ContributionValue` 可能下降

因此系统必须允许：
- score 降低
- level 回退
- blockers 重开
- stage 重新评估

## 6.6 建议的抽象状态类型定义
```ts
type DimensionName =
  | "ProblemImportance"
  | "ContributionValue"
  | "NoveltyDelta"
  | "OutcomeFeasibility"
  | "ClaimSharpness"
  | "EvidenceCompleteness"
  | "EvaluationSoundness"
  | "BoundaryRiskCoverage"
  | "ReproducibilityReadiness";

type ReadinessLevel =
  | "Unknown"
  | "Blocked"
  | "Partial"
  | "Sufficient"
  | "Strong";

interface BlockerRef {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  linkedObjectIds?: string[];
  linkedRequirementIds?: string[];
}

interface DimensionState {
  name: DimensionName;
  level: ReadinessLevel;
  score: number;           // 0-100
  confidence: number;      // 0-1
  gap: number;             // 0-100, to current stage threshold
  velocity: number;        // signed, recent trend
  blockers: BlockerRef[];
  evidenceRefs: string[];
  updatedAt: string;
  rationale?: string;
}

interface AbstractState {
  projectId: string;
  branchId: string;
  stage: "Stage1_WorthContinuing" | "Stage2_ReadyForWritingEntry";
  dimensions: Record<DimensionName, DimensionState>;
  globalFlags: {
    hasCriticalBlocker: boolean;
    isPlateauing: boolean;
    isOscillating: boolean;
    hasDominatedBranch: boolean;
  };
  derived: {
    currentGoalSatisfied: boolean;
    nextBestTargets: DimensionName[];
  };
  version: number;
  createdAt: string;
}
```

---

# 第 7 章 论证对象图：真实研究状态层

## 7.1 为什么需要对象图
审稿约束层只能回答“离目标多远”，却不能回答：

- 为什么还没收敛
- 缺少什么具体对象
- 哪个动作会改变哪一部分状态
- 某个结论到底依据什么

因此必须引入**论证对象图**作为真实状态层。

它是系统的“研究世界模型”，而不是简单的数据表集合。

## 7.2 核心对象定义
建议最少定义以下对象。

### 7.2.1 `Project`
项目级容器，保存：
- 项目基本信息
- 领域 profile
- 当前 active branch
- 阶段状态
- 预算约束
- venue 目标（可选）
- 与 Git、工作区、同步的绑定关系

### 7.2.2 `Branch`
分支代表一条研究 formulation / 实验路线 / 论证路线。  
它不是 Git branch 的替代，而是**研究语义分支**。

字段建议：
- `id`
- `projectId`
- `name`
- `status` (`active / paused / archived / killed / merged`)
- `parentBranchId`
- `branchReason`
- `hypothesisSummary`
- `ownedClaimIds`
- `decisionRefs`

### 7.2.3 `Problem`
描述研究要解决的问题。

字段建议：
- `statement`
- `targetDomain`
- `audience`
- `painPoint`
- `importanceRationale`
- `scope`
- `nonGoals`

### 7.2.4 `ValueHypothesis`
回答“做成之后为什么值得发”。

字段建议：
- `valueType`  
  例如 `performance / efficiency / reliability / robustness / insight / usability / benchmark / framework`
- `expectedImpact`
- `targetUsersOrCommunity`
- `successCondition`
- `failureCondition`

### 7.2.5 `ContributionDelta`
表示与已有工作的差异化位置。

字段建议：
- `anchorWorkIds`
- `deltaType`  
  例如 `new_method / new_insight / new_analysis / stronger_empirical_case / efficiency_tradeoff / dataset / benchmark`
- `deltaSummary`
- `noveltyRiskNotes`
- `closestCompetitors`

### 7.2.6 `Claim`
系统中的一等公民。  
建议类型化，而不是泛化单桶。

字段建议：
- `claimType`
  - `problem_claim`
  - `novelty_claim`
  - `performance_claim`
  - `efficiency_claim`
  - `mechanistic_claim`
  - `scope_claim`
  - `limitation_claim`
- `text`
- `status`
  - `candidate / active / weakened / rejected / retired`
- `strength`
  - `tentative / moderate / strong`
- `scope`
- `ownerBranchId`
- `supportState`
- `linkedEvidenceRequirementIds`
- `linkedBoundaryIds`

### 7.2.7 `EvidenceRequirement`
描述“要让某个 claim 成立，需要什么证据”。

字段建议：
- `claimId`
- `requiredEvidenceType`
  - `main_result`
  - `ablation`
  - `robustness`
  - `efficiency`
  - `error_analysis`
  - `theoretical`
  - `qualitative`
  - `reproduction`
- `isMandatory`
- `satisfactionRule`
- `priority`
- `status`

### 7.2.8 `EvidenceItem`
表示已经收集到的证据项。  
注意：它不应只是一段文本，也可以是表格、图、日志摘要、统计结果。

字段建议：
- `evidenceType`
- `sourceType`
  - `run`
  - `analysis`
  - `literature`
  - `manual_input`
  - `artifact`
- `sourceRef`
- `summary`
- `supportDirection`
  - `supports / weakens / refutes / inconclusive`
- `confidence`
- `linkedRequirementIds`
- `linkedClaimIds`
- `provenance`

### 7.2.9 `BaselineSet`
表示某组对照方案及其选择理由。

字段建议：
- `baselines`
- `selectionPolicy`
- `coverageNotes`
- `missingStrongBaselineNotes`
- `fairnessRisks`
- `linkedProtocolIds`

### 7.2.10 `Protocol`
评测/训练/数据/统计协议的统一表示。

字段建议：
- `protocolType`
  - `evaluation / training / data / comparison / stats`
- `datasetInfo`
- `splitInfo`
- `metrics`
- `comparisonRules`
- `statisticalChecks`
- `reproRequirements`
- `status`

### 7.2.11 `Run`
代表一次实际执行。

字段建议：
- `runType`
  - `probe / pilot / full / ablation / robustness / baseline`
- `configRef`
- `executorRef`
- `inputs`
- `outputs`
- `status`
- `cost`
- `duration`
- `failureReason`
- `artifactIds`

### 7.2.12 `Artifact`
支撑复现或分析的产物。

字段建议：
- `artifactType`
  - `code / config / model / log / table / figure / script / report`
- `location`
- `version`
- `hash`
- `isReusable`
- `accessPolicy`

### 7.2.13 `AnalysisFinding`
分析得出的结构化结论，不等于最终 claim。

字段建议：
- `findingType`
  - `pattern / anomaly / failure_case / limitation / comparative_observation / stability`
- `summary`
- `derivedFrom`
- `linkedEvidenceItemIds`
- `suggestedClaimUpdates`
- `riskFlags`

### 7.2.14 `Boundary`
对范围、限制、失效条件的结构化表示。

字段建议：
- `boundaryType`
  - `scope / limitation / threat_to_validity / failure_mode / ethical_risk`
- `statement`
- `triggerCondition`
- `severity`
- `linkedClaimIds`

### 7.2.15 `Decision`
表示系统/用户做出的结构性决策。

字段建议：
- `decisionType`
  - `advance / continue / reopen / pivot / kill / archive / merge`
- `targetBranchId`
- `reason`
- `triggeredBy`
- `linkedObjectIds`
- `humanConfirmed`

### 7.2.16 `Lesson`
经验教训对象。

字段建议：
- `lessonType`
  - `positive_pattern / failure_pattern / blocker_pattern / heuristic_prior`
- `summary`
- `originDecisionId`
- `originRunIds`
- `applicabilityTags`
- `reliability`

## 7.3 对象关系
对象图的价值不在于“有很多表”，而在于“关系明确”。

建议至少定义以下关系类型：

- `derives_from`
- `supports`
- `weakens`
- `refutes`
- `requires`
- `constrains`
- `blocks`
- `belongs_to_branch`
- `supersedes`
- `motivates`
- `triggered_by`
- `reopens`
- `produces`
- `summarizes`

例如：

- `Problem -> motivates -> ValueHypothesis`
- `ValueHypothesis -> derives_from -> ContributionDelta`
- `Claim -> requires -> EvidenceRequirement`
- `EvidenceItem -> supports -> Claim`
- `BaselineSet -> constrains -> Protocol`
- `Run -> produces -> Artifact`
- `AnalysisFinding -> weakens -> Claim`
- `Boundary -> constrains -> Claim`
- `Decision(pivot) -> reopens -> Problem`

## 7.4 对象图如何投影到审稿约束层
抽象状态不手工维护，而是由对象图合成。

示例：

### 7.4.1 `NoveltyDelta`
主要由以下对象投影而来：
- `ContributionDelta`
- `closestCompetitors`
- `noveltyRiskNotes`
- 文献检索结果
- 与近邻工作的差异证据

### 7.4.2 `EvidenceCompleteness`
主要由以下对象投影而来：
- 各 `Claim` 的 `EvidenceRequirement`
- requirement 的满足状态
- `EvidenceItem` 的支持强度
- 关键 requirement 是否缺失

### 7.4.3 `EvaluationSoundness`
主要由以下对象投影而来：
- `BaselineSet`
- `Protocol`
- `Run`
- `AnalysisFinding` 中的 fairness / stability / stats 相关结论

### 7.4.4 `BoundaryRiskCoverage`
主要由以下对象投影而来：
- `Boundary`
- failure case
- limitation finding
- threat to validity
- ethics / misuse / external validity notes

## 7.5 与仓库现有实体的映射关系
当前 `requirements.md` 已有高层实体：

- `Project`
- `Document`
- `Section`
- `Claim`
- `Evidence`
- `ClaimEvidence`
- `Baseline`
- `Protocol`
- `ReproItem`
- `Issue`
- `Report`

本次讨论建议：

### 7.5.1 可直接承接
- `Project`
- `Claim`
- `Evidence`
- `Baseline`
- `Protocol`
- `ReproItem`

### 7.5.2 需要扩展
- `Evidence` → 细分为 `EvidenceRequirement + EvidenceItem`
- `Issue` → 继续保留，但建议与 `Blocker / Risk / Boundary` 打通
- `Report` → 可作为 `AbstractState` 投影产物之一

### 7.5.3 需要新增
- `ValueHypothesis`
- `ContributionDelta`
- `Run`
- `Artifact`
- `AnalysisFinding`
- `Boundary`
- `Branch`
- `Decision`
- `Lesson`

---

# 第 8 章 动作空间设计：以 sub-function 3–6 为宏动作族

## 8.1 为什么动作空间不能直接等于“当前在第几步”
如果动作空间只是：

- 进入理论设计
- 进入实验设计
- 进入模型训练
- 进入数据分析

那么 planner 依旧不知道：

- 具体要做哪个动作
- 它会改变哪些状态
- 它依赖哪些前置条件
- 它的成本、风险、信息增益是什么

因此，sub-function 3–6 只能作为**宏动作族**，不能作为 primitive actions。

## 8.2 为什么 sub-function 3–6 适合作为宏动作族
我们在讨论中已经达成一致：

- 研究推进的核心区不是 1–8 全部
- 而是 3–6 这一段形成的**论证核心区**
- 这一区域天然网状推进，最适合被 planner 接管

原因：
- 1（文献管理）更像基础支持层
- 2（研究方向）偏候选池与上游筛选
- 7（写作、投稿、修稿）属于后续写作层
- 8（论文管理）应上升为控制面，而不是动作本身

## 8.3 对 sub-function 3–6 的收敛性重定义
建议把它们重命名为：

### SF3：Problem / Theory / Claim Design
负责：
- 问题界定
- 价值假设
- contribution delta
- claim 生成、拆分、收缩、删除
- evidence requirement 派生

### SF4：Evaluation Protocol Design
负责：
- baseline 选择
- metric / split / fairness protocol
- ablation / robustness / stress test 设计
- requirement 与 protocol 的绑定

### SF5：Method Implementation & Execution
负责：
- feasibility probe
- 代码/系统实现
- 训练或 benchmark 执行
- artifact capture
- run management
- 失败恢复

> 之所以不用“模型与训练”，是为了避免动作空间过度 ML-specific。  
> 当前项目明确面向更广义的 CS research，需要一个能兼容 systems / security / empirical CS 的名字。

### SF6：Evidence Analysis & Boundary Update
负责：
- 结果聚合
- support / weakens / refutes / inconclusive 判定
- error analysis
- limitation / boundary / risk 提取
- claim-evidence graph 更新

### X：Search Control / Branch Governance
这是必须新增的一类宏动作族，负责：
- branch
- merge
- reopen
- pivot
- kill
- archive
- escalate-to-human

## 8.4 primitive operators
下面给出更适合 planner 直接调度的原子级 operator。

### 8.4.1 SF3 类 operator
- `define_problem`
- `refine_problem_scope`
- `create_value_hypothesis`
- `build_contribution_delta`
- `create_claim`
- `split_claim`
- `shrink_claim`
- `drop_claim`
- `derive_evidence_requirements`
- `record_scope_assumption`

### 8.4.2 SF4 类 operator
- `create_protocol`
- `revise_protocol`
- `add_baseline`
- `replace_baseline`
- `add_metric`
- `add_ablation_plan`
- `add_robustness_check`
- `add_stress_test`
- `bind_requirement_to_protocol`
- `audit_comparison_fairness`

### 8.4.3 SF5 类 operator
- `run_feasibility_probe`
- `launch_pilot_run`
- `launch_full_run`
- `run_baseline_experiment`
- `run_ablation`
- `run_robustness_eval`
- `capture_artifact`
- `register_run_failure`
- `retry_with_modified_config`

### 8.4.4 SF6 类 operator
- `ingest_result`
- `aggregate_metrics`
- `classify_evidence_support`
- `extract_failure_case`
- `extract_limitation`
- `extract_boundary`
- `derive_analysis_finding`
- `link_finding_to_claim`
- `update_claim_support_state`

### 8.4.5 X 类 operator
- `spawn_branch`
- `merge_branch`
- `reopen_claim`
- `reopen_protocol`
- `reopen_method`
- `reopen_problem`
- `pivot_branch`
- `kill_branch`
- `archive_branch`
- `request_human_review`

## 8.5 控制动作的必要性
如果没有控制动作，系统会出现几个严重问题：

- 只能“继续做”，不会“停止做”
- 不会因为 evidence 反证而主动退回前序节点
- 不会把一条低价值路线淘汰
- 不会形成真正的 branch competition

因此，控制动作必须是一等动作，而不是隐藏逻辑。

## 8.6 动作空间设计的注意事项

### 8.6.1 粒度不能过粗
过粗会让 planner 看不到真实差异。例如：
- “去做实验”比“补一个强 baseline 的小规模 probe”粗太多

### 8.6.2 粒度也不能过细
过细会导致：
- 动作过多、难以排序
- 状态更新碎片化
- UI 难以呈现
- planner 像任务调度器而不是研究控制器

### 8.6.3 要避免 domain-specific 命名绑死架构
例如“模型与训练”过于 ML-specific。  
如果未来扩展到 systems/security/PL，这种命名会误导动作空间。

### 8.6.4 动作必须声明“状态影响”
每个动作不能只定义“做什么”，还要定义：
- 影响哪些维度
- 可能解除哪些 blocker
- 需要哪些前置对象
- 可能生成哪些对象
- 成本和风险大概如何

## 8.7 建议的动作定义类型
```ts
type ActionFamily =
  | "SF3_ProblemTheoryClaimDesign"
  | "SF4_EvaluationProtocolDesign"
  | "SF5_MethodImplementationExecution"
  | "SF6_EvidenceAnalysisBoundaryUpdate"
  | "CTRL_SearchControlGovernance";

interface ActionPrecondition {
  type: "object_exists" | "state_threshold" | "no_critical_blocker" | "human_approval";
  ref?: string;
  rule?: string;
}

interface ExpectedEffect {
  targetDimensions: DimensionName[];
  deltaType: "score_up" | "confidence_up" | "blocker_release" | "reopen" | "uncertainty_reduce";
  magnitudeHint?: number;
  note?: string;
}

interface ActionSpec {
  id: string;
  family: ActionFamily;
  operator: string;
  title: string;
  description: string;
  inputObjectIds: string[];
  preconditions: ActionPrecondition[];
  expectedEffects: ExpectedEffect[];
  estimatedCost: {
    wallClock: number;
    compute: number;
    humanAttention: number;
  };
  estimatedRisk: {
    invalidity: number;
    failure: number;
    branchDestabilization: number;
  };
  parallelizable: boolean;
  requiresHumanApproval: boolean;
  outputTypes: string[];
}
```

---

# 第 9 章 启发式搜索算法框架

## 9.1 为什么是启发式搜索
我们在讨论中排除了三种不适合作为主框架的做法：

1. **固定流程**  
   太僵硬，无法表达分支、回退和重规划。

2. **端到端生成**  
   与项目边界不符，也无法保证证据约束。

3. **纯规则树**  
   可解释性强，但在真实研究中不够灵活，无法处理不确定性、信息增益和探索-利用平衡。

因此，最自然的形式是：

> **以审稿约束层为抽象状态空间，以论证对象图为底层真实状态，在不完全信息下进行启发式重规划。**

## 9.2 搜索问题形式化
建议将系统状态抽象为：

```text
S = <Z, G, U, B, H>
```

其中：

- `Z`：抽象状态（审稿约束层）
- `G`：论证对象图
- `U`：不确定性信息
- `B`：预算信息
- `H`：历史轨迹 / 决策历史

### 9.2.1 不确定性 `U`
包括：
- 某维度判断置信度低
- 某 run 结果不稳定
- novelty 检索覆盖不足
- feasibility 只有假设，没有 probe

### 9.2.2 预算 `B`
包括：
- 时间预算
- 算力预算
- 人工注意力预算
- API 成本预算
- 截止时间（可选）

### 9.2.3 历史 `H`
包括：
- 已做动作
- 动作结果
- 决策历史
- lessons
- tabu memory

## 9.3 两段式收敛的搜索目标

### 9.3.1 第一段目标
目标集合 `Goal_1`：
- `ProblemImportance >= Sufficient`
- `ContributionValue >= Sufficient`
- `NoveltyDelta >= Sufficient`
- `OutcomeFeasibility >= Sufficient`
- 无 critical blocker

达到后：
- `Advance(Stage2)` 或 `Kill/Pivot/Archive`

### 9.3.2 第二段目标
目标集合 `Goal_2`：
- `ClaimSharpness >= Sufficient`
- `EvidenceCompleteness >= Sufficient`
- `EvaluationSoundness >= Sufficient`
- `BoundaryRiskCoverage >= Sufficient`
- `ReproducibilityReadiness >= Sufficient`
- 无 critical blocker

达到后：
- `ReadyForWritingEntry`

## 9.4 启发式函数
不建议只优化状态总分。  
更合理的是对**动作包**进行价值估计。

设动作包为 `P`，当前状态为 `S`，则：

```text
BundleValue(P | S) =
  Σ_i w_i * E[Δscore_i(P)]
+ α * E[Δconfidence(P)]
+ β * E[blocker_release(P)]
+ γ * E[coverage(P)]
+ δ * E[information_gain(P)]
+ ρ * parallelism_bonus(P)
- λ * stage_weighted_cost(P)
- μ * risk(P)
- τ * revisit_penalty(P)
```

### 9.4.1 各项含义
- `Δscore_i(P)`：对关键维度的预期推进
- `Δconfidence(P)`：消除不确定性的程度
- `blocker_release(P)`：是否解除高优 blocker
- `coverage(P)`：是否同时覆盖多个关键缺口
- `information_gain(P)`：即使不直接提分，也是否显著提升判断能力
- `parallelism_bonus(P)`：是否能并行带来更好的 critical path
- `stage_weighted_cost(P)`：阶段化成本惩罚
- `risk(P)`：动作失败、误导或污染状态的风险
- `revisit_penalty(P)`：重复低效尝试的惩罚

## 9.5 为什么抽象状态需要分数
我们在讨论中已明确：

- **需要分数**
- 但**不能只有分数**

原因：

### 9.5.1 需要分数的原因
- 排序候选动作
- 比较 bundle 边际收益
- 做并行包优先级
- 观察局部趋势与收益递减

### 9.5.2 不能只有分数的原因
- 会丢失 blocker 语义
- 会被刷分
- 难以解释门槛是否通过
- 无法自然表达 `Unknown / Blocked / Partial / Sufficient / Strong`

因此最终采用混合状态表示。

## 9.6 并行与动作包
我们也达成了一致：

- 应支持并行计算
- 动作成本惩罚不应过重，尤其第二阶段
- 大动作常常是后期收敛所必需的

因此，planner 的基本调度单位应是**动作包**而不是单动作。

### 9.6.1 动作包的构造原则
可并行动作通常要求：
- 输入对象不冲突
- 输出对象不直接覆盖同一字段
- 资源上可同时执行
- 不存在强先后依赖

### 9.6.2 成本模型
并行动作包的成本不应用简单求和，而应用：

```text
cost(P) =
  η1 * critical_path(P)
+ η2 * peak_resource(P)
+ η3 * coordination_overhead(P)
```

### 9.6.3 阶段化成本权重
- **第一阶段**：成本权重相对较高  
  目标是低成本、高信息增益、快速止损
- **第二阶段**：成本权重明显降低  
  目标是避免系统逃避关键闭环动作

## 9.7 收敛慢时的处理：停滞检测
Meta-controller 应检测至少四类模式。

### 9.7.1 Plateau
关键维度长时间无改善：
- `gap` 长期不降
- `velocity ≈ 0`
- blocker 未解除

### 9.7.2 Oscillation
状态在几个配置间来回摆动：
- claim 变强导致 evidence 不足
- claim 收缩后 value 又下降
- 多轮往返无净进展

### 9.7.3 Expensive Non-yielding Search
高成本动作频繁执行，但无决定性收益：
- 多轮 full run 结果仍不稳定
- 不断加 baseline 后 claim 优势消失
- 反复 probe 后 feasibility 仍不明

### 9.7.4 Dominated Branch
某分支长期被另一条支线支配：
- 价值更低
- 成本更高
- 风险更大
- 收敛更慢

## 9.8 推荐算法框架
经过讨论，最推荐的主框架是：

> **分层式 anytime best-first / beam replanning**

配套机制：

- **tabu-style memory**：防循环、防重复无效尝试
- **contextual bandit scorer**：学习动作排序偏好（可后续增强）
- **MCTS-style short rollout**：做短视野 lookahead（可后续增强）
- **meta-controller**：检测停滞并做 continue / pivot / kill / archive

### 9.8.1 为什么不推荐 GA / ACO / SA / 纯 Tabu 作为主框架
我们讨论后得出的判断是：

- **遗传算法**：适合生成多样候选，不适合主控
- **蚁群算法**：适合固定图路径优化，不适合异质研究动作
- **模拟退火**：可用于局部扰动，不适合主规划层
- **禁忌搜索**：很适合作为反循环记忆，但不适合作为唯一主框架

原因在于本问题具有：
- 结构化对象状态
- 不确定转移
- 高成本动作
- 需要解释性
- 需要回退与分支治理

这些特性更适合分层重规划，而不是纯元启发式作为顶层主框架。

---

# 第 10 章 退出、回退、转向与经验吸收

## 10.1 为什么这些机制必须内建
如果系统只会“继续做”，最终会出现两种坏模式：

1. **低效徘徊**  
   持续做小修小补，没有决定性推进。

2. **路径依赖**  
   明明方向已经不值得做，系统仍因为局部已有投入而继续补实验。

因此，退出、回退、转向和经验吸收必须是显式机制，而不是异常处理。

## 10.2 退出机制
建议统一定义以下 5 类决策：

### 10.2.1 `Advance`
当前阶段达标，进入下一阶段。  
例如从“值得继续投入”进入“写作前论证收敛”。

### 10.2.2 `Continue`
继续当前阶段搜索。  
这是最常见状态，但必须说明继续的原因和目标缺口。

### 10.2.3 `Pivot`
不是终止项目，而是改变 formulation、目标或 claim 结构。  
例如：
- superiority claim → insight claim
- 通用问题 → 限定场景问题
- method paper → empirical study

### 10.2.4 `Kill`
终止当前路线。  
典型原因：
- 价值不足
- 新意不足
- feasibility 长期不成立
- 证据成本远超预期且不值得

### 10.2.5 `Archive`
暂时归档，保留未来重启可能。  
典型原因：
- 预算不足
- 外部依赖未满足
- 当前时机不适合继续

## 10.3 回退机制
不建议把回退理解为事务回滚，而应理解为：

> 基于新证据或新判断，从更早层级重新规划。

建议四级回退：

### 10.3.1 Claim-level reopen
适用于：
- claim 过强
- claim 边界不清
- evidence 不足以支撑当前强度

### 10.3.2 Protocol / Baseline-level reopen
适用于：
- baseline 选择不充分
- metric 与任务不匹配
- comparison 不公平
- statistical validity 有问题

### 10.3.3 Method / Execution-level reopen
适用于：
- 多轮执行失败
- 实现方案不可行
- run 显示核心机制不成立

### 10.3.4 Problem / Value-level reopen
适用于：
- 问题本身不够重要
- delta 不足
- 即使做成也缺乏发表价值

## 10.4 经验吸收机制
经验吸收是系统长期变强的关键。  
建议分为两层。

### 10.4.1 项目内经验
保存本项目中的：
- 哪类动作在什么状态下有效
- 哪些 blocker 经常出现
- 哪些路径导致高成本低收益
- 哪些 pivot 最终效果较好

### 10.4.2 跨项目经验
作为后续增强：
- 某类 problem / claim / protocol 的常见失败模式
- 某类贡献常被 reviewer 质疑的点
- 某类 action 在某领域里的历史成效

## 10.5 记忆层设计
建议至少保存以下结构：

### 10.5.1 Recent tabu memory
防止短期重复做无效动作：
- 类似动作在相似状态下近期失败
- 同一 blocker 被低效反复尝试

### 10.5.2 Action history
每次动作记录：
- 输入状态摘要
- 动作 spec
- 实际输出
- 对维度的实际影响
- 成本
- 失败原因

### 10.5.3 Lesson store
结构化 lesson：
- 正向模式
- 失败模式
- blocker 模式
- 转向先验

### 10.5.4 Decision rationale
记录：
- 为什么 continue / pivot / kill / archive
- 该决策依赖了哪些对象和维度
- 是否有人类确认

## 10.6 建议的 Decision / Lesson 类型
```ts
type DecisionType =
  | "advance"
  | "continue"
  | "reopen"
  | "pivot"
  | "kill"
  | "archive"
  | "merge";

interface DecisionRecord {
  id: string;
  projectId: string;
  branchId: string;
  type: DecisionType;
  reason: string;
  triggeredBy: {
    blockers?: string[];
    stagnationSignals?: string[];
    dimensionRefs?: DimensionName[];
    objectRefs?: string[];
  };
  humanConfirmed: boolean;
  createdAt: string;
}

type LessonType =
  | "positive_pattern"
  | "failure_pattern"
  | "blocker_pattern"
  | "heuristic_prior";

interface LessonRecord {
  id: string;
  projectId: string;
  branchId?: string;
  type: LessonType;
  summary: string;
  applicabilityTags: string[];
  originDecisionId?: string;
  reliability: number; // 0-1
  createdAt: string;
}
```

---

# 第 11 章 LLM 自动化适配性与角色分工

## 11.1 为什么这个框架适配 LLM
本次讨论的核心结论之一是：

> 研究论证的 reviewer-constrained 搜索，比端到端自动写论文更适合 LLM。

原因如下：

### 11.1.1 LLM 擅长候选生成与归纳
LLM 在以下任务上通常表现较强：
- 生成 problem / claim / protocol 候选
- 归纳 literature gap
- 提炼 failure mode
- 总结结果与边界
- 从 reviewer 角度找缺口

### 11.1.2 LLM 擅长批判与重规划
在本框架中，LLM 的作用不是“给答案”，而是：
- 提出下一步可选动作
- 分析为什么当前状态没收敛
- 在 evidence 改变后重新解释路径
- 建议 pivot / reopen / kill

### 11.1.3 LLM 不需要当唯一真值源
一旦系统中存在：
- 对象图
- 规则引擎
- 可追溯 evidence
- 确定性执行器  
LLM 就不需要“知道一切”，而是负责在约束下进行高价值推理。

## 11.2 LLM 不适合独自承担什么
以下事情不应交给 LLM 作为唯一裁决者：

- 充当实验数值真值源
- 声称 evidence 已存在而实际上没有
- 作为唯一 reviewer oracle
- 绕过规则引擎直接写入状态
- 在无对象图支撑下评估“总体 readiness”

## 11.3 建议的角色拆分
建议将 LLM 角色拆为四类。

### 11.3.1 Proposer
负责提出：
- candidate claims
- protocol 候选
- action bundles
- pivot 方案
- branch formulation

### 11.3.2 Critic
负责批判：
- value 是否站得住
- novelty 是否真实
- protocol 是否有漏洞
- evidence 是否充分
- claim 是否过强
- boundary 是否诚实

### 11.3.3 Synthesizer
负责把来自：
- literature
- runs
- logs
- analysis
- reviews  
的结果整合为结构化对象更新，而不是 prose。

### 11.3.4 Controller Assistant
辅助 meta-controller 做：
- 是否进入下一阶段
- 是否出现停滞
- 是否建议 pivot / kill
- 是否应请求人工确认

## 11.4 Critic Hub
我们讨论后，建议不要只用一个通用 reviewer agent，而是建立 **Critic Hub**。  
它可以包含：

- `GeneralReviewerCritic`
- `NoveltyCritic`
- `ValueCritic`
- `EvaluationFairnessCritic`
- `ReproducibilityCritic`
- `BoundaryRiskCritic`
- `RuleEngine`

其中：
- LLM critic 负责归纳、批判、建议
- RuleEngine 负责确定性硬约束检查

## 11.5 Human-in-the-loop 的位置
虽然目标是高自动化，但仍建议在以下节点要求或鼓励人工确认：

### 11.5.1 建议人工确认的动作
- kill / archive
- problem/value 层 pivot
- 删除或显著弱化核心 claim
- 改写 branch 主假设
- 进行高成本 full run 前
- 写入高风险 boundary / ethics note 时

### 11.5.2 可全自动执行的动作
- 文献整理
- 候选动作生成
- 低成本 probe
- 日志/结果 ingestion
- evidence classification 初稿
- coverage 检查
- 风险清单生成

## 11.6 LLM 输出落库的条件
任何 LLM 输出若要进入对象图，建议满足至少一项：

1. 带来源引用（文献、run、artifact、analysis）
2. 只是候选对象，状态标记为 `candidate / low-confidence`
3. 通过规则引擎或 critic hub 交叉检查
4. 经过人工确认

---

# 第 12 章 系统架构：从算法到工程落地

## 12.1 系统总览
结合当前仓库技术栈与讨论结果，建议系统划分为以下模块：

1. `Argument Graph Store`
2. `State Synthesizer`
3. `Planner`
4. `Critic Hub`
5. `Executor Layer`
6. `Meta-Controller`
7. `Desktop Control Plane`

## 12.2 模块职责

### 12.2.1 Argument Graph Store
职责：
- 存储对象图
- 存储抽象状态快照
- 存储动作历史、决策、lesson
- 提供对象关系查询与变更追踪

建议基于当前 Postgres/Prisma 方案实现。

### 12.2.2 State Synthesizer
职责：
- 从对象图合成抽象状态
- 计算维度 level / score / confidence / blockers
- 产出当前 stage readiness 视图

### 12.2.3 Planner
职责：
- 基于当前 `AbstractState + ArgumentGraph`
- 生成候选动作池
- 组装动作包
- 对动作包评分并排序
- 将 top bundle 提交给 executor

### 12.2.4 Critic Hub
职责：
- 生成 reviewer-style critique
- 校验 novelty / fairness / reproducibility / value
- 与规则引擎一起产出 blocker / issue / risk

### 12.2.5 Executor Layer
职责：
- 触发文献检索
- 触发 run / probe / analysis
- 收集 artifacts
- 对接本地脚本、外部执行器或 API

### 12.2.6 Meta-Controller
职责：
- 阶段判定
- 停滞检测
- continue / pivot / kill / archive / advance
- 调整 planner 参数
- 更新 memory

### 12.2.7 Desktop Control Plane
职责：
- 让用户理解当前 research state
- 呈现 branch、constraint、evidence、blocker、action queue
- 允许用户 override / confirm / replay / diff

## 12.3 一轮 planner loop 的控制流
建议控制流如下：

1. `Graph Update`
2. `State Synthesis`
3. `Meta Diagnosis`
4. `Candidate Generation`
5. `Critic / Rule Pass`
6. `Bundle Planning`
7. `Execution`
8. `Structured Update`
9. `Decision`
10. `Memory Update`

这形成 **anytime replanning loop**。

## 12.4 后台任务与长时运行
与当前仓库 requirements 一致，系统必须支持：

- 队列
- 重试
- 断点恢复
- 状态追踪
- 幂等执行
- 错误分级
- 调用成本统计

### 12.4.1 任务类型建议
- `retrieval_task`
- `probe_run_task`
- `full_run_task`
- `analysis_task`
- `critic_task`
- `state_recompute_task`
- `report_task`

### 12.4.2 状态建议
- `queued`
- `running`
- `succeeded`
- `failed`
- `retrying`
- `cancelled`
- `blocked`

## 12.5 与本地优先 / Git / 多设备同步的关系
当前项目正式要求：

- local-first
- Git 深度集成
- 多设备同步控制面

本框架与这些要求并不冲突，反而能自然承接。

### 12.5.1 Local-first
对象图、动作历史、artifact 引用、抽象状态都应默认本地可用。  
远程同步的是：
- 元数据
- 允许同步的对象快照
- 任务状态
- lesson / decision（按策略）

### 12.5.2 Git 的位置
Git 不是研究对象图本身，但承担：
- 工作区内容版本化
- 配置/脚本/文稿 diff
- 回放与对比参考
- 与 branch 决策的弱关联

研究分支 `Branch` 不等于 Git branch，但可建立映射。

### 12.5.3 多设备同步
多设备同步应更像**控制面同步**，而非无差别传输所有 artifact。  
需考虑：
- 权限
- 全文 RAG 授权边界
- artifact 大对象
- 冲突恢复

## 12.6 UI / 控制面建议
UI 不应仅是文档编辑器。  
建议至少包括：

### 12.6.1 Abstract State Dashboard
显示：
- 9 个维度的 `level / score / confidence`
- 当前 stage
- 当前 blocker
- 最近 velocity

### 12.6.2 Branch Graph
显示：
- 当前分支
- 分支来源
- pivot / merge / killed / archived 分支
- 分支比较

### 12.6.3 Claim-Evidence Coverage Table
显示：
- 每个 claim
- 所需 evidence requirement
- 已满足/未满足
- support / weakens / refutes / inconclusive

### 12.6.4 Blocker Board
显示：
- critical blocker
- severe risk
- 未覆盖 requirement
- fairness / novelty / feasibility 问题

### 12.6.5 Action Queue / Bundle Queue
显示：
- 当前候选动作
- 预期收益
- 成本
- 风险
- 并行包

### 12.6.6 Replay / Diff / Rollback View
显示：
- 决策历史
- 对象变化 diff
- 为什么 reopen / pivot / kill
- 哪些 lesson 来源于哪些失败

---

# 第 13 章 与项目现状的关系与演进路径

## 13.1 当前项目已经具备的基础
当前 requirements 和 README 已经提供了很强的承接基础：

### 13.1.1 方向上已对齐
- reviewer-aligned evidence workflows
- Claim / Evidence / Baseline / Protocol / ReproItem
- traceability
- rule engine
- risk report
- automation orchestration
- background tasks
- local-first + Git + sync

### 13.1.2 技术上已可承接
- Electron desktop shell
- Fastify backend
- Postgres
- Monorepo
- AI-friendly skills structure

因此，本次框架不是推翻现状，而是**把现有需求主线进一步结构化与算法化**。

## 13.2 需要调整或新增的部分
### 13.2.1 命名层面
- “论文管理”建议在内部改称“研究论证控制面”或“Research Argument Control Plane”
- sub-function 5 改成 `Method Implementation & Execution`
- sub-function 6 改成 `Evidence Analysis & Boundary Update`

### 13.2.2 数据层面
新增对象：
- `ValueHypothesis`
- `ContributionDelta`
- `EvidenceRequirement`
- `Branch`
- `Run`
- `Artifact`
- `AnalysisFinding`
- `Boundary`
- `Decision`
- `Lesson`

### 13.2.3 算法层面
新增模块：
- `StateSynthesizer`
- `Planner`
- `MetaController`
- `Memory`
- `CriticHub`

## 13.3 与当前八个 sub-functions 的关系
建议重新解释如下：

| 现有 sub-function | 建议角色 |
|---|---|
| 1 文献管理 | 支撑层 |
| 2 研究方向 | 上游候选池 / 探索层 |
| 3 理论框架与研究设计 | 宏动作族 SF3 |
| 4 实验设计 | 宏动作族 SF4 |
| 5 模型与训练 | 改名后作为宏动作族 SF5 |
| 6 数据分析与讨论 | 改名后作为宏动作族 SF6 |
| 7 写作、投稿、修稿 | 后续写作层 |
| 8 论文管理 | 上升为控制面 / meta layer |

### 13.3.1 为什么不是废弃 8 个 sub-functions
因为它们仍然有价值：
- 适合做信息架构
- 适合做模块归属
- 适合做大类动作划分

### 13.3.2 为什么不能继续把 8 个 sub-functions 当主流程
因为真正的研究推进与决策依赖：
- 分支
- 回退
- constraints
- object graph  
而不是编号顺序。

## 13.4 分阶段落地路线

### 13.4.1 V1：最小可用研究论证层
- 对象图最小集合
- 9 维抽象状态
- 人工/规则驱动状态合成
- 候选动作生成与排序
- continue / pivot / kill / archive
- 基本控制面

### 13.4.2 V1.5：Critic 与 bundle planner
- Critic Hub
- 动作包与并行执行
- stagnation detection
- tabu-style memory
- stage-gated cost weighting

### 13.4.3 V2：学习型增强
- contextual bandit 动作排序
- lesson prior 学习
- MCTS-style short rollout
- domain-specific critic profile

### 13.4.4 V3：与写作层打通
- 从 `ReadyForWritingEntry` 进入文稿写作工作流
- 将对象图映射到章节骨架与写作建议
- 保持 evidence traceability 到最终手稿

## 13.5 文档在仓库中的位置建议
建议新增独立文档，例如：

- `docs/architecture/research-argument-framework.md`
- 或 `docs/project/architecture/research-argument-framework.md`

同时与以下文档互链：
- `requirements.md`
- `project-blueprint.json`
- 数据模型文档
- planner 文档
- UI/interaction 文档

---

# 第 14 章 风险、坑与反模式

## 14.1 设计层面的坑

### 14.1.1 把审稿约束当成最终真理
风险：
- 系统过度迎合“形式上可审”
- 忽视真正有长期价值但短期不易量化的工作

缓解：
- reviewer constraints 作为方向，不是唯一价值函数
- 保留人工 override

### 14.1.2 把写作提前混进研究论证层
风险：
- 过早固化叙事
- 文本掩盖证据不足
- 研究推进被写作节奏绑架

缓解：
- 明确区分 pre-writing argument layer 与 writing layer

### 14.1.3 继续把 sub-function 做成线性流程页面
风险：
- planner 失去意义
- 状态转移与真实研究行为脱节

缓解：
- sub-functions 用作 action family / IA，不作唯一流程

## 14.2 算法层面的坑

### 14.2.1 只看总分
风险：
- blocker 被掩盖
- 小步刷分替代关键推进

缓解：
- 强制使用 `level + blockers + confidence` 进行阶段判断

### 14.2.2 成本惩罚过高
风险：
- 系统在第二阶段不愿做关键大动作
- 卡在“看起来在推进”的小修小补

缓解：
- 采用阶段化 cost weighting

### 14.2.3 忽略信息增益
风险：
- 系统偏好直接提分动作
- 不愿做 probe、对照检查、novelty 检索等高信息增益动作

缓解：
- 将 `information_gain` 显式纳入 heuristic

### 14.2.4 不支持回退
风险：
- 系统把错误路径越走越深
- 无法体现真实研究迭代

缓解：
- reopen / pivot / kill 一等公民化

## 14.3 系统层面的坑

### 14.3.1 状态与对象不同步
风险：
- UI 看起来一切正常，但对象图已经过时
- planner 依据旧状态规划

缓解：
- 任何对象更新后触发 state synthesis
- 支持 snapshot + recompute

### 14.3.2 无 evidence 的内容污染对象图
风险：
- LLM 幻觉进入系统真状态
- 后续所有规划建立在伪前提上

缓解：
- 落库要求：来源 / candidate 标记 / cross-check / human confirmation

### 14.3.3 回退不可追溯
风险：
- 用户不知道为什么系统回退
- 决策难以复盘

缓解：
- 所有 reopen / pivot / kill 都写入 `DecisionRecord`

### 14.3.4 长时任务不可恢复
风险：
- full run / 检索 / 分析中断后状态损坏

缓解：
- 幂等设计
- checkpoint
- task status persistence

## 14.4 产品层面的坑

### 14.4.1 过度承诺自治
风险：
- 用户期待“自动出 paper”
- 与项目边界冲突

缓解：
- 对外表述始终强调研究论证与 evidence workflow，而非全自动写作

### 14.4.2 用户失去控制感
风险：
- 系统自己 pivot/kill 导致用户困惑

缓解：
- 高风险决策需确认
- 决策理由透明

### 14.4.3 解释性不足
风险：
- 用户只看到分数变化，不知原因

缓解：
- 所有维度状态都应能下钻到对象与 evidence

---

# 第 15 章 相关项目参考与可借鉴点

## 15.1 为什么要参考现有自动化研究 / 写作系统
本项目不是从零开始面对一个完全未知的问题。  
近两年已经出现大量“自动化科研 / 论文生成 / reviewer agent / traceable research system”项目。  
参考它们的目的不是照搬产品定义，而是吸收其中的有用机制：

- 迭代式 review–refine
- specialized critics
- traceability / rewind / replay
- experiment loop 与 idea loop 的闭环
- 对 generic LLM reviewer 的局限认识

## 15.2 可吸收的模式

### 15.2.1 ResearchAgent
可吸收点：
- 问题识别、方法设计、实验设计三段式生成
- reviewing agents 迭代 refinement
- 用多 reviewer feedback 驱动 idea 质量提升

对本项目的启发：
- 与 SF3/SF4 的划分天然契合
- 说明“proposal + review + revise”比单步生成更适合研究自动化

### 15.2.2 data-to-paper
可吸收点：
- backward traceability
- rewind
- record/replay
- coding guardrails
- API cost tracking

对本项目的启发：
- 我们讨论的 rollback、decision log、lesson、traceability 都可从这里得到工程化支持思路
- 证明“可追溯的 research pipeline”比“最终文本漂亮”更重要

### 15.2.3 AI co-scientist
可吸收点：
- 专用角色分工：generation / reflection / ranking / evolution / meta-review
- 强调多 agent 协同而不是单 agent 全知

对本项目的启发：
- Critic Hub 的角色拆分
- 第一阶段价值 / 新颖性 / feasibility 的多视角批判

### 15.2.4 AI-Researcher
可吸收点：
- literature → idea → implementation → validation → analysis 的循环
- experiment analysis / advisor agent

对本项目的启发：
- SF5/SF6 的执行与分析闭环
- “结果不好时如何给出下一轮动作建议”

### 15.2.5 OpenReviewer
可吸收点：
- reviewer 不是通用 LLM 的平替
- 专门 reviewer 模型能给出更 critical、更 realistic 的反馈

对本项目的启发：
- 不应只依赖单一通用 LLM critic
- 可以考虑 future 的 reviewer-profile critic 或 fine-tuned critic

### 15.2.6 SciFact / claim-evidence 相关工作
可吸收点：
- Claim–Evidence–Rationale 的结构化判定

对本项目的启发：
- 强化 claim-support 不是“凭感觉”，而应有结构化 evidence linking

## 15.3 不宜直接照搬的模式

### 15.3.1 end-to-end paper generation
以 AI Scientist、AI-Researcher 某些展示形态为代表，这类系统经常强调从 idea 到完整 paper。  
不宜直接照搬的原因：
- 与当前项目边界不一致
- 容易过度承诺
- 真实稳定性更多来自模板约束与代码表达型课题

### 15.3.2 无对象图支撑的纯 agent pipeline
只有多 agent chat、没有结构化状态，会导致：
- 状态无法稳定继承
- 难以回放
- 决策理由不清
- 经验无法沉淀

### 15.3.3 纯 reviewer 打分驱动
如果系统只是多 reviewer 打分：
- 容易变成评论生成器
- 无法直接驱动行动
- 不知道“该改什么对象、做什么动作”

## 15.4 对本项目的具体启发
综合来看，最适合吸收的是：

1. **ResearchAgent 的 review-refine 思想**
2. **data-to-paper 的 traceability / rewind / replay**
3. **AI co-scientist 的 specialized critic coalition**
4. **OpenReviewer 对 specialized review 的启示**

而不应把系统定义成：
- 完全端到端 paper writer
- 完全自治的“AI scientist”替代物

---

# 第 16 章 开放问题与待决策项

## 16.1 仍待最终定稿的概念
- 9 个维度是否最终固定，还是按领域 profile 做变体
- `ReadyForWritingEntry` 的硬门槛如何具体数值化
- `ReproducibilityReadiness` 在不同 CS 领域的最小要求差异
- `ValueHypothesis` 与 `ContributionDelta` 是否拆为更细实体

## 16.2 仍待实验验证的问题
- `score` 具体如何计算
- heuristic 权重如何初始化
- bundle planning 规则如何确定
- plateau / oscillation 阈值怎么定
- 什么时候触发人工确认最合理

## 16.3 后续需要补的配套文档
- 数据模型文档（数据库与 API）
- planner 详细设计文档
- state synthesis 规则文档
- UI/control plane 文档
- evaluation plan 文档
- 与写作层对接文档

---

# 附录 A 术语表

| 术语 | 含义 |
|---|---|
| 研究论证 | 从问题到 claim / evidence / protocol / boundary 收敛的过程 |
| 审稿约束层 | 以 reviewer-facing readiness 为方向的抽象状态空间 |
| 论证对象图 | 保存真实研究状态的结构化对象与关系图 |
| 两段式收敛 | 阶段 1 判断是否值得继续；阶段 2 判断是否具备进入写作的论证基础 |
| Claim | 论文/研究要表达的结构化主张 |
| EvidenceRequirement | 支撑某个 claim 所需的证据要求 |
| EvidenceItem | 实际收集到的证据项 |
| BaselineSet | 一组对照对象及其选择理由 |
| Protocol | 评测/训练/数据/统计等协议 |
| Boundary | 范围、限制、失效条件、威胁有效性的结构化表示 |
| Branch | 一条研究 formulation 或执行路线 |
| Pivot | 改变路线但不必终止项目 |
| Reopen | 回到更早层级重新规划 |
| ReadyForWritingEntry | 已具备进入真实写作流程的论证基础 |

---

# 附录 B 核心数据结构草案

## B.1 AbstractState
```ts
type Stage =
  | "Stage1_WorthContinuing"
  | "Stage2_ReadyForWritingEntry";

interface AbstractState {
  projectId: string;
  branchId: string;
  stage: Stage;
  dimensions: Record<DimensionName, DimensionState>;
  globalFlags: {
    hasCriticalBlocker: boolean;
    isPlateauing: boolean;
    isOscillating: boolean;
    hasDominatedBranch: boolean;
  };
  derived: {
    currentGoalSatisfied: boolean;
    nextBestTargets: DimensionName[];
  };
  version: number;
  createdAt: string;
}
```

## B.2 ArgumentObjectGraph（核心接口示例）
```ts
interface ProjectNode {
  id: string;
  title: string;
  domainProfile?: string;
  activeBranchId?: string;
  venueProfile?: string;
  budget?: {
    timeHours?: number;
    computeUnits?: number;
    apiBudget?: number;
  };
  createdAt: string;
}

interface BranchNode {
  id: string;
  projectId: string;
  name: string;
  status: "active" | "paused" | "archived" | "killed" | "merged";
  parentBranchId?: string;
  hypothesisSummary?: string;
  branchReason?: string;
  createdAt: string;
}

interface ClaimNode {
  id: string;
  branchId: string;
  claimType:
    | "problem_claim"
    | "novelty_claim"
    | "performance_claim"
    | "efficiency_claim"
    | "mechanistic_claim"
    | "scope_claim"
    | "limitation_claim";
  text: string;
  status: "candidate" | "active" | "weakened" | "rejected" | "retired";
  strength: "tentative" | "moderate" | "strong";
  scope?: string;
  createdAt: string;
}

interface EvidenceRequirementNode {
  id: string;
  claimId: string;
  requiredEvidenceType:
    | "main_result"
    | "ablation"
    | "robustness"
    | "efficiency"
    | "error_analysis"
    | "theoretical"
    | "qualitative"
    | "reproduction";
  isMandatory: boolean;
  priority: "low" | "medium" | "high";
  status: "missing" | "partial" | "satisfied" | "invalidated";
  satisfactionRule?: string;
}

interface EvidenceItemNode {
  id: string;
  branchId: string;
  evidenceType: string;
  sourceType: "run" | "analysis" | "literature" | "manual_input" | "artifact";
  sourceRef?: string;
  summary: string;
  supportDirection: "supports" | "weakens" | "refutes" | "inconclusive";
  confidence: number;
  provenance?: {
    sourceUrl?: string;
    objectId?: string;
    locator?: string;
  };
  createdAt: string;
}

interface ProtocolNode {
  id: string;
  branchId: string;
  protocolType: "evaluation" | "training" | "data" | "comparison" | "stats";
  datasetInfo?: string;
  splitInfo?: string;
  metrics?: string[];
  comparisonRules?: string[];
  statisticalChecks?: string[];
  reproRequirements?: string[];
  status: "draft" | "active" | "needs_revision" | "retired";
}

interface BaselineSetNode {
  id: string;
  branchId: string;
  baselines: string[];
  selectionPolicy?: string;
  coverageNotes?: string;
  fairnessRisks?: string[];
}

interface RunNode {
  id: string;
  branchId: string;
  runType: "probe" | "pilot" | "full" | "ablation" | "robustness" | "baseline";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  configRef?: string;
  cost?: number;
  durationSec?: number;
  failureReason?: string;
  createdAt: string;
}

interface AnalysisFindingNode {
  id: string;
  branchId: string;
  findingType:
    | "pattern"
    | "anomaly"
    | "failure_case"
    | "limitation"
    | "comparative_observation"
    | "stability";
  summary: string;
  linkedEvidenceItemIds: string[];
  riskFlags?: string[];
  createdAt: string;
}

interface BoundaryNode {
  id: string;
  branchId: string;
  boundaryType: "scope" | "limitation" | "threat_to_validity" | "failure_mode" | "ethical_risk";
  statement: string;
  severity: "low" | "medium" | "high";
  linkedClaimIds: string[];
  createdAt: string;
}
```

## B.3 Action / Bundle / Decision
```ts
interface ActionBundle {
  id: string;
  projectId: string;
  branchId: string;
  actionIds: string[];
  expectedValue: number;
  expectedInformationGain: number;
  expectedBlockerRelease: number;
  estimatedCriticalPath: number;
  estimatedPeakResource: number;
  riskScore: number;
  createdAt: string;
}

interface ExecutionResult {
  bundleId: string;
  actionId: string;
  status: "succeeded" | "failed" | "partial";
  createdObjects: string[];
  updatedObjects: string[];
  deltaSummary: string;
  actualCost?: number;
  failureReason?: string;
}
```

---

# 附录 C Planner Loop 伪代码

```text
function planner_loop(project_id, branch_id):
    G = load_argument_graph(project_id, branch_id)
    Z = synthesize_abstract_state(G)

    meta_signal = meta_controller.diagnose(Z, G, history)

    if meta_signal.decision in ["kill", "archive", "pivot", "advance"]:
        persist_decision(meta_signal)
        return meta_signal

    candidates = candidate_generator.expand(G, Z, meta_signal)

    critiques = critic_hub.evaluate(candidates, G, Z)

    bundles = bundle_planner.compose(candidates, critiques, resource_state)

    scored_bundles = heuristic_scorer.rank(bundles, Z, history, memory)

    chosen = select_top_k(scored_bundles)

    results = executor.run(chosen)

    G2 = apply_structured_updates(G, results)

    Z2 = synthesize_abstract_state(G2)

    decision = meta_controller.decide(Z2, G2, results, history)

    memory.update(G, chosen, results, decision)

    persist(G2, Z2, decision)

    return {
        "state": Z2,
        "decision": decision,
        "results": results
    }
```

---

# 附录 D 示例场景

## 场景：一个新方法方向是否值得继续投入

### 初始状态
研究者提出一个方向：
- 想解决某个任务中的效率问题
- 认为自己有新机制
- 但还没有系统性 baseline 与协议设计

### 第 1 轮
系统执行：
- SF3：定义 problem、value hypothesis、初步 claims
- SF3：建立 contribution delta 草案
- SF4：补一个最小 baseline set 草案
- SF5：跑 feasibility probe

结果：
- `ProblemImportance` 上升到 `Partial`
- `ContributionValue` 上升到 `Partial`
- `NoveltyDelta` 仍 `Unknown`
- `OutcomeFeasibility` 从 `Unknown` 变为 `Partial`

### 第 2 轮
系统发现 novelty 置信度低，于是执行：
- literature 检索
- related work delta 比对
- claim 收缩
- baseline fairness 审查

结果：
- 发现已有近邻方法，原 superiority claim 过强
- 系统建议 `pivot`: 从“全面优于现有方法”改为“在资源受限场景下更优”

### 第 3 轮
新的 branch 继续：
- 更新 value hypothesis
- 更新 claim
- 设计更匹配的 evaluation protocol
- 跑两个小规模 baseline 比较

结果：
- `NoveltyDelta` 上升到 `Sufficient`
- `ContributionValue` 上升到 `Sufficient`
- `OutcomeFeasibility` 上升到 `Sufficient`
- 阶段 1 通过，进入阶段 2

### 第 4–6 轮
系统继续补：
- ablation
- robustness
- failure case
- boundary extraction
- artifact capture

最终：
- 核心 claim 清晰
- evidence requirement 基本满足
- protocol / baseline 合理
- limitation 已明确

系统输出：
- `ReadyForWritingEntry`

这说明：
- 研究论证层不是在写论文
- 它在为后续写作准备结构化、可追溯、可审稿的素材与判断

---

# 附录 E 与仓库现有 requirements 的映射表

| 本文设计点 | requirements 中已有基础 | 需要新增/调整 |
|---|---|---|
| Claim / Evidence / Baseline / Protocol / ReproItem | 已有 MUST | 细化为对象图 |
| Claims-to-Evidence Traceability | 已有 MUST | 扩展为 EvidenceRequirement + graph coverage |
| reviewer-style 自检 | 已有 MUST | 上升为审稿约束层 |
| 自动化编排与长时任务 | 已有 MUST | 增加 planner/meta-controller 语义 |
| 项目管理、任务编排 | 已有 MUST | 重新解释为研究论证控制 |
| 8 sub-functions | 已有 draft | 3–6 重定义为 action families |
| 论文管理 | 已有 draft | 上升为 control plane / meta layer |
| 风险分级与 rebuttal | 已有 MUST | rebuttal 仍属于后续写作层 |
| 本地优先 + Git + sync | 已有 MUST | 对象图、状态、decision、lesson 纳入同步边界设计 |

---

# 参考链接

## 项目当前文档
- README: https://raw.githubusercontent.com/willyu1007/My-Researcher/main/README.md
- Requirements: https://raw.githubusercontent.com/willyu1007/My-Researcher/main/docs/project/overview/requirements.md

## 相关系统 / 论文 / 项目
- ResearchAgent: https://arxiv.org/abs/2404.07738
- ResearchAgent PDF / NAACL 2025: https://aclanthology.org/2025.naacl-long.342.pdf
- The AI Scientist (repo): https://github.com/sakanaai/ai-scientist
- The AI Scientist (project page): https://sakana.ai/ai-scientist/
- data-to-paper: https://github.com/Technion-Kishony-lab/data-to-paper
- AI co-scientist blog: https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/
- AI-Researcher: https://github.com/hkuds/ai-researcher
- OpenReviewer: https://aclanthology.org/2025.naacl-demo.44/
- Llama-OpenReviewer-8B: https://huggingface.co/maxidl/Llama-OpenReviewer-8B
- SciFact: https://aclanthology.org/2020.emnlp-main.609/
- Agent Laboratory: https://agentlaboratory.github.io/

## 审稿标准与审稿侧参考
- NeurIPS Reviewer Guidelines: https://neurips.cc/Conferences/2025/ReviewerGuidelines
- ACM Reviewer Training / Review Criteria: https://reviewers.acm.org/training-course/review-criteria

---

# 结语

本文件收束的不是一个“自动写论文”的产品设计，而是一套更基础、更稳定、更适合当前项目定位的研究控制框架：

- 它以**研究论证**为核心对象，而非文稿文本；
- 以**审稿约束层**提供方向性，而非任意探索；
- 以**论证对象图**保存真实状态，而非只保留评分；
- 以**启发式重规划**决定下一步，而非固定阶段跳转；
- 以**回退、转向、退出、经验吸收**作为一等机制，而非异常处理；
- 以**LLM 的批判、归纳、提议和重规划能力**驱动自动化，而不是把 LLM 当作论文真值源。

这套框架与当前仓库已确立的 reviewer-aligned、evidence-first、local-first 主线是一致的。  
它既为后续写作提供坚实基础，也能在写作之前就尽可能暴露价值缺口、证据缺口和审稿风险，从而真正提升研究推进效率与可靠性。
