# 00 Overview

## Status
- State: done
- Closure（2026-07-06 收口）: backlog ①..⑤ 全部完成，**①尾巴同日收口**——新 shared 契约 `topic-selection-node-semantic-policy-contracts.ts`（`TOPIC_SELECTION_V1A_NODE_SEMANTIC_POLICIES` 9 节点 + `TOPIC_SELECTION_RESOURCE_SAMPLING_NODE_SEMANTIC_POLICIES` 1 节点，全词汇 leading-token 形状含 `conditional`/`reserved`）+ schema test 5/5 + 一致性脚本接入（v1a/rs 全 8 语义列严格相等 + 完备性 + rs 双源字面量交叉核对；自测负例 21→24）。至此矩阵**四个 stage 全部 8 语义列均机器校验**，未校验残余仅 Slot Map 散文列与 v1b 四列（无契约布尔导出，见矩阵 Machine-Check 说明）。**本包不归档**：一致性脚本按路径读本包 `08-scenarios.md`（归档须先迁注册表至 docs/context 或同步脚本路径常量——留待需要时另议）；语义裁决职责域（新增 debate 节点分类）按矩阵 Purpose 所载继续有效。
- Progress: **结构化硬化切片 ②→①→③ DONE（2026-07-05）**——② 新 shared 契约 `topic-selection-v1c-node-policy-contracts.ts`：`TOPIC_SELECTION_V1C_NODE_POLICIES`（6 节点）+ `TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES`（1 节点）语义 policy 导出 + JSON-Schema + schema test 7/7；① 一致性脚本接入语义列校验：v1c/downstream 全 8 语义列精确比对、v1b 三项（executor_kind 映射 / human_delegated↔契约 modes / default mode 成员性）+ **行形状结构守卫**（修复其暴露的真实缺陷：矩阵 v1c N2 行缺 deterministic_validators 格致 covered_scenarios 静默左移）；③ covered_scenarios 双向机器校验（矩阵列↔注册表 covered_nodes 集合相等 + 已知性）+ D-28 脚本登记校验；前置内容对齐：`08-scenarios.md` covered_nodes 从 v1b 旧 8 节点命名重写为现行 11 节点、补 `debate.v1b-n6-topic-candidates.v1` 注册条目、增 Script Registration Map（18 脚本）；矩阵 4 行补 replay-idempotency、N8 行补 value-tension。自测漂移负例 7→17。留痕 03/04 §2026-07-05。
- Progress: **现状对账（2026-07-05，随 T-088 对账切片落账）**——本包 05 月已交付主体资产：06 矩阵（已迁永久 SSOT `docs/context/process/topic-selection-workflow-matrix.md`，T-123 Phase 0 完成实现对齐+一致性脚本进默认套件）、07 节点策略、08 场景登记、09/10/11/12 专项。live-surface 分类切片被 T-128 W-08 吸收并完成（2026-07-02：consistency 2/2、分类对齐 SSOT 无 re-fork、LLM 槽 policy 无空洞）。
- Progress: **活跃 backlog（承 T-128 W-08 移交 + T-088 对账移交，2026-07-05 首次落本包账面）**：
  - [x] ① 矩阵语义列（`executor_kind`/`default_execution_mode`/`debate_primitive`/`human_*`）接入一致性脚本（**DONE 2026-07-05**；**①尾巴 DONE 2026-07-06**：v1a/resource-sampling 语义列经独立 shared 语义 policy 导出接入（未动 v1a harness contracts——采 v1c 同款"语义分类独立文件"路线,全词汇 leading-token 严格相等）；Slot Map 散文列仍为盲区（无代码权威源），其 stale profile-escalation 陈述已按 T-088 D-27 手工顺迁修正——2026-07-06，见矩阵 Change Log）；
  - [x] ② v1c 统一 `TOPIC_SELECTION_V1C_NODE_POLICIES` 结构化导出（**DONE 2026-07-05**：`topic-selection-v1c-node-policy-contracts.ts`，含 downstream；v1a/v1b 既有对应物：`topic-selection-v1a-workflow-harness-contracts.ts` / `topic-selection-v1b-node-policy-contracts.ts`）；
  - [x] ③ `covered_scenarios` 机器校验 + T-088 D-28 脚本登记校验（**DONE 2026-07-05**：双向集合相等 + Script Registration Map；一致性脚本读本包 `08-scenarios.md`——**本包归档时须同步脚本内路径常量或将注册表迁 docs/context**）；
  - [x] ④ 穷举式 dormant/边缘节点复核（**DONE 2026-07-06**：21 代理工作流,24 面/22 簇四面一致性复核+逐发现对抗式反驳——18 簇 coherent、4 项确认漂移当轮修复(均为文档/状态词)、5 项反驳留档、1 项 D-27 顺迁在复核中直接修正;全记录见 `13-dormant-edge-review.md`）；
  - [x] ⑤ v1a N6 supplemental 轮跨执行语义裁决（**用户拍板 2026-07-06:建有界自动重入**,DONE——JD **D-29**(T-088 06,承 D-22)+ harness 加法式 `runGenerateNeedCandidateSupplementalChain`(默认零接线/单轮 byte-identical/硬上限 3 双守卫/attempt 逐轮派生/无新持久化面)+ 4 单测,harness 文件 111/111;矩阵 N6 行注解同步实况）。
- Task ID: `T-089`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Depends on: `dev-docs/active/topic-selection-workflow-runtime-foundation/`
- Trigger: after v1b/v1c deep tests, the open design question is not whether every node can call an LLM, but which nodes deserve ordinary agent workflow, which deserve multi-agent debate, and which should be executed by Codex-assisted operator workflow instead of direct provider calls.

## Goal
- Review every topic-selection link from resource sampling through v1a/v1b/v1c and paper-project bridge.
- Clarify ordinary agent workflow semantics: node owner, inputs, outputs, blocking conditions, retry policy, profile, and audit.
- Decide where multi-agent debate is valuable, define the debate roles and model/profile choices, and reject debate where deterministic or single-agent workflow is enough.
- Define where Codex can substitute for direct LLM API calls during local/product acceptance, including structured prompt packets, operator responses, and audit labels.

## Non-goals
- Do not implement the runtime primitives owned by T-088.
- Do not add UI.
- Do not change existing v1a/v1b/v1c contracts until the review produces approved deltas.
- Do not create open-ended debate for every step.

## Acceptance Criteria
- [x] A node-by-node workflow matrix exists for resource sampling, v1a need/evidence, v1b topic question/value/package, v1c promotion/bridge, and downstream recheck.（永久 SSOT `docs/context/process/topic-selection-workflow-matrix.md`，五 stage 节点集合机器校验）
- [x] Each node is classified as deterministic, ordinary single-agent, multi-agent debate, human review, or Codex-assisted acceptance.（executor_kind/default_execution_mode 等 8 语义列四个 stage 全机器校验——①②+①尾巴；v1b 四列由契约 modes/execution_kind 派生校验）
- [x] For each proposed debate node, roles, model/profile choices, inputs, turn limits, resolution rule, blocker rule, and audit artifact are specified.（v1a N6 divergent(D-17..D-25/D-22/D-29)、v1b N6 divergent(D-T127-02)、v1b N8 bounded(DMP-13)、v1c N2 bounded micro——全部实装；`11-debate-model-invocation-policy.md` + 各 debate 契约）
- [x] For each rejected debate node, the reason is recorded.（矩阵 debate_allowed=no 行 rationale 注解；④ 复核确认 rejected-nodes-absence-guarantee 面 coherent，F4 无佐证断言已清）
- [x] Codex-assisted execution boundaries are explicit and distinguish local acceptance from product runtime.（D-08 + 矩阵 codex_allowed 列机器校验 + W-09/W-14 产品门控；④ 复核 d08-enforcement 面 coherent）
- [x] Every matrix node has a node policy covering blockers, validators, execution permissions, authority boundary, audit/artifact policy, and failure semantics.（v1a/v1b 运行时 NODE_POLICIES + v1c/downstream `TOPIC_SELECTION_V1C_NODE_POLICIES` + v1a/rs 语义 policy 导出；细节文本 `07-node-policies.md` + 各契约）
- [x] Every matrix node references at least one registered `WorkflowScenario`.（covered_scenarios ↔ `08-scenarios.md` 双向集合相等，机器校验——③）
- [x] The output is ready to become implementation tasks without semantic ambiguity.（backlog ①..⑤ 即由此产出并全部执行完毕；后续新增 debate 分类沿矩阵+注册表机器校验路径）
