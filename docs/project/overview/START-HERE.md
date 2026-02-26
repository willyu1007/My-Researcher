# START-HERE（项目状态入口）

> 面向用户的项目状态入口与初始化归档记录。阶段状态请看 `docs/project/overview/INIT-BOARD.md`。

## Current focus
- 初始化流程已完成（Stage A/B/C 均已审批通过）。
- 下一步转入产品实现阶段，继续细化 8 个子功能的实现边界。

## Current conclusions
- 项目名称确定为“论文工程助手（Paper Engineering Assistant）”。
- 核心目标是把论文写作流程工程化为可追溯的 claims-evidence 证据链，并对齐审稿人高权重标准。
- 技术路线确定为“独立工作区优先”，覆盖论题整理、实验/测试与自动化编排等前期工作，产品形态为桌面端应用。
- 平台策略为“跨平台架构 + macOS 优先落地”，后续扩展到其他桌面平台。
- 已决策：跨平台发布节奏为 M0(macOS) -> M1(Windows) -> M2(Linux)。
- 写作阶段采用“集成调用”策略，优先对接 Prism 等成熟工具，作为外部写作与排版执行面。
- 运行特性要求为长时间稳定执行与高频外部 API 调用可控，需具备自动重试、限流与可观测性。
- 已决策：M0 启用外部文献检索，采用可追溯检索、摘要级 RAG 与项目级文献注册表，优先解决重复检索问题。
- 已决策：默认本地化优先部署，首发以个人单用户为主，并与 Git 工作流深度结合。
- 已决策：Git 集成采用方案 B（本地优先 + 安全远程），M0 聚焦安全可用边界。
- 已决策：同一用户多设备通过云数据库控制面同步，M1 启用受控全文 RAG 并可选使用 Qdrant 向量层。
- 架构设想：核心能力按 8 个子功能组织（文献管理、方向池、理论设计、实验设计、模型训练、数据分析、写作投稿修稿、论文管理），实现细节待讨论。

## Key inputs (keep small)

| Key | Value | Status |
|---|---|---|
| Project name | 论文工程助手（Paper Engineering Assistant） | confirmed |
| One-line purpose | 以审稿人标准为验收条件，帮助 CS 论文从选题到投稿形成可检验 claims 与可复现证据链 | confirmed |
| Primary users | 个人研究者（单用户）为主；研究生/博士后；PI/导师（扩展角色） | confirmed |
| Must-have scope | 桌面端独立工作区、论题整理与测试自动化、claims/evidence 追溯、规则自检、投稿前风险报告、rebuttal 支持 | confirmed |
| Out-of-scope | 不承诺自动产出可发表论文；不替代研究路线决策；不以纯文本扩写为核心价值 | confirmed |
| Constraints | 不得杜撰实验结果；建议必须可定位；LaTeX 编译需沙箱隔离；高频 API 调用必须受配额与限流策略控制；数据默认本地存储 | confirmed |
| Success metrics | claims-evidence 覆盖率接近 100%；缺失项召回率提升；投稿前准备时间下降；长时间运行稳定性达标 | confirmed |
| Retrieval strategy | M0: 可追溯检索 + 摘要级 RAG + 项目级文献注册表；去重键优先 DOI/arXiv | confirmed |
| Full-text RAG strategy | M1: 项目级默认关闭，手动开启；按 `OA/USER_AUTH/RESTRICTED` 执行授权与同步边界 | confirmed |
| Tech stack preference | 独立工作区（前端+后端+数据层）+ 写作阶段集成 Prism/Overleaf/本地仓库 | confirmed |
| Deployment preference | 本地化优先（local-first），云端能力可选开启 | confirmed |
| Version workflow | 与 Git 深度集成，支持个人研究版本管理 | confirmed |
| Git boundary (M0) | 方案 B：支持本地完整流程 + 安全远程（fetch/pull --ff-only/push），禁用危险历史改写 | confirmed |
| Platform rollout | M0(macOS) -> M1(Windows) -> M2(Linux) | confirmed |
| Multi-device sync | 同一用户多设备同步（云数据库控制面 + 本地主存储） | confirmed |
| Vector layer | M1 可选 Qdrant（仅授权可同步内容） | confirmed |
| Core modules | 8 个子功能作为架构设想已列出，内部实现/接口边界待讨论 | tbd |
| CI strategy | M0 开启 CI（github-actions，lint/test/build） | confirmed |
| Packaging strategy | 暂不启用，后续阶段再评估 | confirmed |
| Timeline / deadline | 里程碑 M0-M3，先落地 MVP（M0） | tbd |

## AI questions (next to ask)
- [ ] 术语对齐采用“当前词表为准并在开发中持续补充”是否确认。
- [ ] 8 个子功能的实现边界（内部实现 vs 外部接口）是否先按优先级分两批讨论。
- [ ] 是否需要立即更新根目录 `README.md` 与 `AGENTS.md` 为项目定制内容。

## This round notes
- 已使用现有 `需求文档_PRD_论文工程助手.md` 与 `开发文档_TDD_论文工程助手.md` 作为 Stage A 输入。
- 初始化已完成：Stage A/B/C 全部通过并落地产物。
- 当前蓝图特性组合为：`contextAwareness + database + ui + environment + ci`。

---

<details>
<summary>Archive (append-only; folded by default)</summary>

----
### Stage A wrap-up - 2026-02-21
- Summary: 完成需求、NFR、术语、风险四份文档并通过严格校验。
- Decisions landed: local-first、个人单用户优先、Git 方案 B、M0/M1/M2 跨平台节奏、M0 摘要级检索与 RAG、M1 受控全文 RAG 与可选 Qdrant。
- Key input changes: 同一用户多设备同步纳入方案，8 个子功能定位为“架构设想待讨论”。
- Open questions: 子功能实现边界（内部实现 vs 外部接口）仍待 Stage B 讨论。

----
### Stage B/C wrap-up - 2026-02-21
- Summary: 完成蓝图审阅、packs 确认、Stage C apply、skill retention 确认并审批完成。
- Decisions landed: CI 在 M0 开启，Packaging 暂缓；Stage C 产物已生成并同步技能包装。
- Key input changes: 8 个子功能继续保留为待讨论架构设想，不作为实现定稿。
- Open questions: 转入实现阶段继续分模块细化。

</details>
