# 00 Overview

## Status
- State: planned（2026-06-20 创建）——记录性任务包,**承接 T-127 W-07 step f 的 D1 决策**:N6 divergent debate 的 3 个角色 prompt 在 step f 内仅写**骨架级**(够驱动 codex_assisted/mocked 端到端 + pin `prompt_packet_hash`),产品级正文撰写**显式延期到本包**,且范围扩展为**全部选题管理节点/槽位**的 prompt 内容产品化,而非仅 N6。
- Progress: 仅创建包 + 登记需求与节点清单(2026-06-20)。尚未开工。**不阻塞 T-127 核心段 sign-off**(T-127 的运行时机制完整、prompt 正文是可独立审阅的内容工作)。
- Task ID: `T-128`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on / 承接: `T-127`(topic-selection-backend-hardening-and-expansion,in-progress——本包是其 W-07 step f D1「prompt 骨架 + 正文延期」决策的承接物;凡 prompt 模板 id / version / `prompt_packet_hash` 不变量以 T-127 已建运行时为准);`T-123`(已 done 归档——其 inline prompt 撰写惯例与 debate 角色 prompt 形态为参照)
- Reuses: `T-112`(llm-context-cache-runtime)的 context policy profile / packet hash / 压缩 / token 预算——prompt 正文须在既有 context packet 结构内撰写,不另起上下文装配路径
- Coordinates with: `T-127 W-13`(N8 阈值标定,record-and-defer)——产品级正文(尤其 N6/N8 debate 与 value-assessment)的最终定稿宜与标定语料同期,使 prompt 措辞与阈值校准互证;二者均为「真实语料门控」尾巴
- Trigger: 2026-06-20 在 T-127 W-07 step f 对齐时,用户决定 debate 角色 prompt 先写骨架、另开完整任务包记录全节点产品级 prompt 完善需求

## Goal
- 把选题管理(v1a / v1b / v1c)**全部 LLM 调用点的 prompt 正文从「骨架/内联 stub」推进到「产品可用」**:角色指令完备、输出契约与边界明确、上下文引用稳定、措辞经评审,可支撑 `run_mode: 'product'` 的真实选题。
- 为每个被授权(authored)的 prompt **固化 version 与 `prompt_packet_hash`**,使准入层的 prompt-drift 校验有稳定锚点(今天多数槽位用调用方 version 覆盖 + 内联模板,正文变更即改 hash → 必须在产品运行前定稿)。
- 与 SSOT 注册表(`topic-selection-llm-invocation-registry.ts`)逐项对齐:registry 是 id/version 的 SSOT,本包补齐其背后的**正文内容**与撰写状态台账。
- 不改运行时机制 / 调用路径 / 输出 schema / gate 语义——**纯内容工作**;任何机制缺口回归 T-127 或相应 workflow 包,不在本包夹带。

## Scope（节点 / 槽位清单,以 registry 为 SSOT）
> SSOT: `apps/backend/src/services/topic-selection-llm-invocation-registry.ts` 的 `TOPIC_SELECTION_PROMPT_TEMPLATE_IDS`。下表按表面分组,撰写状态待 Phase 0 盘点逐项核定(此处为初判)。

### v1a（need discovery / intake）
- `topic-selection-evidence-map-extraction`、`topic-selection-generate-need-candidate`、`topic-selection-need-adjudication`、`topic-selection-human-confirmation-semantic-review`
- need-discovery debate 角色:`topic-selection-need-discovery-explorer`、`-deep-critic`、`-arbiter-issue-frame`、`-arbiter-final`

### 资源采样
- `topic-selection-resource-sampling-classification`

### v1b harness runtime 槽位
- N2 `...n2.constraint-profile.runtime-support`、N3 `...n3.intake-readiness.runtime-support`、N4 `...n4.research-slice-options.runtime-draft`、N5 `...n5.slice-selection.runtime-support`
- N6 `...n6.question-candidate-draft.runtime-initial`、N6 `...n6.loopback-triage.runtime-support`(**注:step e 的 `n6_debate_trigger_thresholds` 经 step f 作为 advisory context 注入此 triage prompt;正文产品化在本包**)
- N7 `...n7.candidate-grouping.runtime-support`、`...n7.failed-trial-synthesis.runtime-support`、`...n7.n8-debate-admission-review.runtime-support`
- N8 `...n8.topic-value-assessment.runtime-draft`、`...n8.bounded-micro-debate.runtime-role`

### v1b N6 divergent debate 角色（T-127 W-07 step f 落骨架 → 本包产品化）
- `topic-selection-v1b-n6-debate-explorer`、`-critic`、`-arbiter`

### v1c（promotion / feedback）
- `topic-selection-promotion-decision-support`、`topic-selection-v1c-promotion-support-bounded-micro-debate`、`topic-selection-v1c-delegated-promotion-decision`、`topic-selection-v1c-downstream-feedback-normalization`

> provider-canary 模板(`*-provider-canary-*`)为存活探针,非语义 prompt,**不在本包正文范围**。

## Non-goals
- 不改任何运行时机制 / LLM 调用路径 / 输出 JSON schema / gate / blocker / admission 语义——发现机制缺口回 T-127 或对应包,不在本包夹带。
- 不引入第二套 prompt 装配 / context packet 路径(复用 T-112 结构);不改 `prompt_packet_hash` 算法(canonicalHash 单源)。
- 不翻转 / 不撰写依赖未就绪标定语料的阈值类措辞为「已定稿」——N6/N8 debate 与 value-assessment 的产品正文与 W-13 标定同期定稿(真实语料门控)。
- 不改 registry 的 id 集合(新增调用点仍走其所在功能包);本包只补正文与 version/hash 定稿。
- 不撰写 provider-canary 探针文案。

## Acceptance Criteria (high level)
- [ ] Phase 0 盘点台账:上表每个 prompt-template-id 标注「骨架 / 部分 / 产品级」现状 + 正文所在位置(内联 service / 模板模块)+ 当前 version 来源。
- [ ] 每个被授权 prompt:角色指令 / 输出契约 / 边界 / 上下文引用四要素完备,经至少一轮内容评审(可对抗式),措辞不含占位 stub。
- [ ] 每个被授权 prompt 固化稳定 version + `prompt_packet_hash`;准入层 prompt-drift 校验对定稿正文绿。
- [ ] 与 registry 逐项对齐无遗漏(CI lint `topic-selection-llm-invocation-lint` 保持绿);新增/改动正文不破坏既有 tsc / 全套件 / replay byte-identity。
- [ ] N6/N8 debate 与 value-assessment 的产品正文标注「与 W-13 标定同期定稿」,语料未就绪前维持骨架 + 显式登记门控(与 T-127 D8 record-and-defer 一致)。
