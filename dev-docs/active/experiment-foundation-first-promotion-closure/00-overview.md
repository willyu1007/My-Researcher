# 00 Overview

## Status
- State: in-progress(A/B/C 段完成;D 段消费时验证 defer 至第一个真实 RunRecipe,见 playbook)
- Task ID: `T-131`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-012`
- Trigger: T-118 收口讨论(2026-07-08)——用户拍板:①开收尾小任务承接晋升执行(T-118 Non-goal 禁止其自建 canonical 资产);②LIT-0204 evaluation-protocol 候选一次做到 `promoted`。

## Mission
让 **LIT-0204 RAGPerf evaluation-protocol 候选**成为第一条真实数据穿越 experiment-foundation 晋升全链(candidate 记录化 → 六门证据落 registry → manual_promote 裁决 → canonical 资产落库),弥合「机器只跑过能力验证假数据」与「md 纸面证据 ↔ registry 记录」两个断层;路径固化为 lane playbook。

## Scope(用户裁决框架,2026-07-08)
- evaluation-protocol 候选 → **promoted**(adapter 档,tier 显式标注)。
- benchmark 候选维持 `manual_review_required`(外部依赖:faithful GPU 环境 + dataset payloads)——canonical `evaluation_protocol.benchmark_asset_id` 用**前向引用 id**(`benchmark_asset_lit_0204_ragperf`),不为满足必填字段绕过裁决建 benchmark 资产;消费端解引用风险由 D 段(消费时验证)承接,本包留痕。
- dataset 两候选维持 `needs_info`(政策/获取外部依赖)。
- protocol_hash 方案与 adapter/faithful 档位标注在本包落为可复算脚本 + 决策留痕。

## Non-goals
- 不动 T-118 其余 9 个候选(需求拉动,见 playbook);不做 faithful 档验证;不建 RunRecipe/执行链。

## Acceptance Criteria
- [x] protocol_hash 可复算(脚本 + 协议定义工件,adapter 档拼补丁摘要;复算一致)。
- [x] registry 真实记录链:23 记录入库,candidate 终态 **promoted**(2026-07-08)。
- [x] 走真实 service 校验路径(Ajv 形状踩坑即证;assertPromotionGate + canonical refs 断言通过)。
- [x] 负例:重放被 candidate_hash stale 守卫拒(GATE_CONSTRAINT_FAILED);duplicate 复查命中 23(晋升前 0)。
- [x] lane playbook 固化(experiment-foundation-promotion-lane-playbook.md)+ T-118 07/00 对账。
- [x] 全程留痕 03/04;governance sync/lint 过。
