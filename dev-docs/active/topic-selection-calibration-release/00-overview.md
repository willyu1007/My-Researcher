# 00 Overview

## Status
- State: planned
- Progress: **立项 2026-07-05**——T-127+T-128 联合归档时的**外部门控尾巴追踪包**(用户按推荐批准,选项 a)。本包**刻意极简**(仅 00-overview + .ai-task.yaml):无工程可动项,唯一职责是让三个等语料的外部门控项在归档后仍有活跃追踪位,语料到位即按下方开工条件逐项激活。
- Task ID: `T-129`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on / 承接: `T-128`(topic-selection-product-readiness-closure,**done 2026-07-05,联合归档**)——本包唯一内容即其 Phase 5 W-17/W-18/W-19 的原样移交;`T-127`(backend-hardening,同批归档)为其上游。
- Coordinates with: `T-088`(workflow-runtime-foundation)——W-19 触碰 harness/debate-core 侧仍按 D6 在其 `06-joint-decisions.md` 登记 JD。
- Trigger: 2026-07-05 联合归档检查确认 T-128 无后继包,Phase 5 尾巴需活跃追踪位(沿 T-127→T-128 移交先例)。

## Mission
承接 T-128 Phase 5 的三个 externally-gated 项,维持 record-and-defer(T-127 D8:不伪造语料、不盲写正文、无自动翻门),待外部语料条件满足后逐项开工。

## 移交项(原 T-128 W-17/W-18/W-19,条件与义务原样)

### C-1(原 W-17)N8/N6 真标定翻门 —— **已按 D-30 重定性缩窄为可选调优(2026-07-07),不再是发布 blocker**
- **D-30 处置**(T-088 `06-joint-decisions.md` D-30):阈值改判 advisory 路由启发器(只开人 opt-in 的门,不 govern 产品结果;N8 另有 operator 强制门 T-OP 兜底假阴性)。provisional product tripwire + W-15 `sign_off_required` advance 强制已退役——**"翻门后效应"所述摩擦已不存在**。
- **残余(可选)**:若将来想提升启发器命中质量,仍可按原条件标定(≥100 条多 provider 标注样本 + FP<5% + 独立 assessor),完成后人工翻 `provisional:false`(record-and-defer 对 flip 不变;`calibration_gate_release` 签核 schema 保留可用)。不阻塞任何发布。

### C-2(原 W-18)语料耦合 debate 正文
- **等什么**:与 C-1 同批语料(prompt 语义需真实语料校准)。
- **动什么**:6 个门控 prompt(T-128 03 台账 #16/17/18/22/23/25——N6 divergent 三角色、N8 value runtime-draft、N8 bounded 四角色簇、v1c-N2 bounded micro)骨架/partial → 产品级,各配唯一 golden byte-identity 锚(T-128 W-04..07 的既定撰写纪律)。

### C-3(原 W-19)provider_llm debate 开启
- **等什么**:C-2 正文定稿(前置)。~~C-1 签核~~——D-30 后 C-1 不再是前置(阈值 advisory 与 provider 开启解耦;辩论触发由人/T-OP/启发器提醒共同承担)。
- **动什么**:人工代码变更翻 shared `TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH.dormant`(其 `opened_by` 载明本条件)**并同批接线**守卫处成文的三义务:live role outputs(去 codex/mock passthrough)、gate-bridge provenance 决策、provider runMode 默认;顺带决定 coordinator `node_inputs.execution_spec` 的接线(现为 reserved 前置拒,W-14 落定)。**fail-closed 保护**:只翻常量不接线会撞 runtime 分支内第二道 500(T-128 W-14 设计)。
- **守卫位置**:`topic-selection-v1b-n6-divergent-debate-runtime-service.ts` / `topic-selection-v1b-n8-bounded-debate-runtime-service.ts` 的 `assertProviderDebatePathOpen` + 入口双投。

## Acceptance / DoD
- [~] C-1:**D-30(2026-07-07)重定性后降为可选调优,退出 DoD**——tripwire/签核强制已退役;若做,仅为翻 `provisional:false` 的启发器质量提升。
- [ ] C-2:6 门控 prompt 产品化,各得唯一漂移锚,对抗式 review 无 critical。
- [ ] C-3:dormancy 常量翻开 + 三义务接线 + execution_spec 决策落地,dormant 身份守卫测试按新态更新(前置仅 C-2)。

## 背景细节去向
- 完整证据链/设计语境:`dev-docs/archive/topic-selection-product-readiness-closure/`(03 矩阵、04 各段、05-pitfalls「伪造语料/盲写正文」「D8 骆驼鼻子」两条纪律直接适用本包)。
- 代码级自文档:两个 `*_PRODUCT_GATE` 常量、`TOPIC_SELECTION_V1B_PROVIDER_DEBATE_PATH` 常量、W-16 sign-off schema(释放门槛结构化)。
