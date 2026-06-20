# 01 Plan

> 记录性任务包(承 T-127 W-07 step f D1)。相位为建议次序,W-ID 稳定;开工前以 Phase 0 盘点台账重定标。

## Phase 0 — 盘点台账（无代码,先建 SSOT 现状）
- **P0-1 撰写状态盘点**:遍历 `topic-selection-llm-invocation-registry.ts` 的 `TOPIC_SELECTION_PROMPT_TEMPLATE_IDS`(排除 provider-canary),逐项定位正文(内联 service 字符串 / 模板模块)、记录现状标签(骨架 / 部分 / 产品级)、当前 version 来源(调用方覆盖 / 常量)、`prompt_packet_hash` 锚定方式。产出:`03-implementation-notes.md` 台账表。
- **P0-2 依赖与门控标注**:标出哪些正文与未就绪标定语料强耦合(N6/N8 debate、value-assessment),须与 T-127 W-13 同期定稿;其余可独立推进。

## Phase 1 — 独立可定稿表面（不被标定语料门控）
- **W-P1 v1a 表面产品化**:evidence-map-extraction / generate-need-candidate / need-adjudication / human-confirmation-semantic-review + need-discovery 4 角色 debate prompt 的产品级正文 + version/hash 定稿 + 内容评审。
- **W-P2 v1b 非-debate harness 槽位产品化**:N2/N3/N4/N5 runtime-support、N6 runtime-initial、N6 loopback-triage(含 step e 阈值 advisory 注入后的正文)、N7 三槽、的产品级正文 + version/hash 定稿。
- **W-P3 v1c 表面产品化**:promotion-decision-support / delegated-promotion-decision / downstream-feedback-normalization 的产品级正文(promotion bounded-micro-debate 见 Phase 2)。
- **W-P4 资源采样**:resource-sampling-classification 正文复核与定稿。

## Phase 2 — 标定语料门控表面（与 T-127 W-13 同期）
- **W-P5 N6 divergent debate 3 角色产品正文**:explorer/critic/arbiter,由 T-127 step f 的骨架升级为产品级;arbiter 措辞须与 N6 候选集 gate(`validateAndBuildN6Candidates`)的 5-key 形状一致。
- **W-P6 N8 bounded-micro-debate + value-assessment 产品正文**:与 W-13 阈值标定互证;语料未就绪前维持骨架 + 门控登记。
- **W-P7 v1c promotion bounded-micro-debate 正文**:与 N8 debate 形态对齐定稿。

## Phase 3 — 对齐与回归
- **W-P8 registry 对齐 + 不变量回归**:逐项核对 registry id/version 与正文一致;`topic-selection-llm-invocation-lint` 绿;tsc / 全套件 / replay byte-identity 守卫绿;`prompt_packet_hash` 漂移仅出现在有意定稿处且有台账留痕。

## Acceptance Criteria（按相位）
- Phase 0:台账表覆盖全部非-canary prompt-template-id,现状标签 + 门控标注齐备。
- Phase 1:W-P1..W-P4 每个被授权 prompt 四要素完备、经评审、version/hash 定稿;无机制改动。
- Phase 2:W-P5..W-P7 与标定语料同期定稿或显式门控登记(record-and-defer,与 T-127 D8 一致)。
- Phase 3:registry 对齐无遗漏,CI lint + 全套件 + replay 守卫绿。

## Risks / Notes
- **prompt_packet_hash 漂移**:任何正文定稿都会改 hash → 准入层 prompt-drift 校验须同步更新锚点;务必逐项留台账,避免「悄悄改正文」破坏 replay 身份。
- **机制夹带**:撰写中若发现需要新字段 / 新 context family / 新 schema,**不在本包改**——回 T-127 或对应包立项,本包仅内容。
- **标定耦合**:debate/value 措辞与阈值校准互为前提,过早定稿会与 W-13 标定结论冲突;Phase 2 显式门控。
