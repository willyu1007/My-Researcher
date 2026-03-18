# Research Argument Control Plane UI Spec

**来源**：基于 `00_research_argument_framework_rchr.md` 拆分出的实现规格文档。  

**定位**：面向桌面控制面、用户交互、可解释性、人工确认点与多设备控制。  

**建议仓库位置**：`docs/product/research_argument_control_plane_ui.md`

## 文档用途

- 定义为什么 UI 不应只是编辑器，而应是研究论证控制面。
- 定义用户在系统中应看到哪些状态、对象、风险、动作与回放信息。
- 定义 human-in-the-loop 的交互节点、override 机制、长时任务反馈与本地优先同步边界。

## 核心设计结论

控制面必须以“论证状态可见、动作建议可解释、回退/转向可追溯、人工接管有抓手”为第一原则，而不是优先优化文档编辑体验。

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

## 控制面最小实现清单（建议）

- 首页默认进入 `Abstract State Dashboard`，而不是空白编辑器。

- 所有维度卡片都应支持下钻到 `claims / evidence / blockers / decisions`。

- `Branch Graph` 必须支持查看 parent、pivot reason、merge target、killed/archive 原因。

- `Action Queue` 必须展示预计收益、信息增益、成本、风险、并行关系、是否需要人工确认。

- `Replay / Diff` 必须可以按“对象变化”“状态变化”“决策变化”三个视角回放。

- 高风险动作（kill / archive / problem-level pivot / delete core claim / expensive full run）必须有显式确认与理由记录。

- 长时任务必须显示运行状态、最近心跳、可取消性、失败重试、产物链接与回写结果。

- 本地优先模式下，要允许无网络查看对象图、最近状态快照、决策记录和关键 artifacts 引用。
