# 00 Overview

## Status
- State: done
- Next step: 任务文档归档到 `dev-docs/archive/desktop-governance-observability-panels` 并保持只读。

## Goal
- 交付桌面端治理可观测面板（timeline/metrics/artifact/release-review），让 M4~M8 多分支过程可视、可追溯、可审查。

## Non-goals
- 不实现后端接口与数据库改造。
- 不重构 `T-004` 已完成的桌面壳层主路由。
- 不在本任务引入新的科研流程语义。

## Context
- `T-005` 已产出 borrowing 适配层和接口增量草案。
- `T-004` 已有 Electron + React + Vite + TypeScript 基础壳层。
- 本任务负责把治理信息呈现为前端可操作的观测/审查界面。

## Acceptance criteria (high level)
- [x] 四个面板均可在桌面端渲染并具备加载/空态/错误态。
- [x] 面板字段与 `08-interface-delta-spec.md` 映射一致。
- [x] 保持 feature-flag 可控，默认关闭不影响现有流程。
- [x] 发布审查操作具备明确审计字段展示与提交反馈。
