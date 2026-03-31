# 00 Overview

## Status
- State: done
- Next step: `T-025` 直接消费已冻结的 canonical docs、glossary 和 shared contracts，进入 graph/state V1 实现。

## Goal
- 规范化 `research-varify` 设计输入，建立 research-argument domain 的正式文档与 contract SSOT。
- 为后续 `T-025` 到 `T-028` 提供稳定的命名、结构、术语和接口边界。
- 对 `requirements.md` 的 relevant MUST / journeys 建立显式映射，避免 coverage 漏项。

## Non-goals
- 不实现 runtime repository / service / UI。
- 不修改 `title-card` 或 `paper-project` 的既有公开行为。
- 不在本任务直接落 planner / critic 执行逻辑。

## Context
- 当前仓库已有 `title-card` 和 `paper-project` 两条正式主线，但缺少一个 research-argument domain 的 canonical surface。
- `research-varify` 已经给出完整设计输入，只是尚未转为仓库正式 SoT。
- context layer 已存在 `docs/context/`，适合承接 glossary / architecture / registry 增量。

## Acceptance criteria (high level)
- [x] `dev-docs/active/research-argument-contracts-and-ssot/` 包含 `roadmap + 00~05 + .ai-task.yaml`。
- [x] canonical docs 已落到正式 architecture / product 路径。
- [x] canonical docs 已补 requirements 映射章节。
- [x] `docs/context/glossary.json` 已补 research-argument 术语。
- [x] 必要的 context artifact / registry 已更新。
- [x] shared TS contracts 已新增 research-argument 域入口。
- [x] `SubmissionRiskReport` 与 `WritingEntryPacket` 已成为正式合同类型。
- [x] governance / context 验证已通过。
