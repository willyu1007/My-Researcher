# 00 Overview

## Status
- State: done
- Next step: 进入归档流程并同步治理状态。

## Goal
- 建立桌面端前端主工程，承载自动科研流程的 UI 交互层，并与既有治理契约保持一致。

## Non-goals
- 本阶段不完成所有业务页面。
- 本阶段不交付应用商店发布包。
- 本阶段不改写后端生命周期治理语义。

## Context
- 技术路线已确认：Electron + React + Vite + TypeScript。
- 品牌输入来源：`/Volumes/DataDisk/Data/LOGO`（含 tokens、logo、guidelines）。
- UI治理约束：沿用仓库 data-ui contract + token system。

## Acceptance criteria (high level)
- [x] `apps/desktop` 可本地启动并显示 React 界面（`smoke:e2e` 已覆盖启动与链路探活）。
- [x] 已落地 `morethan` 主题 token，且通过 UI spec validate。
- [x] 首版桌面 UI 壳层可展示品牌头部、导航区与内容工作区。
- [x] 形成前端任务包（分批次）并与项目治理映射完成。
- [x] CI 已包含与桌面前端相关的最小可执行校验入口（不引入无效 job）。
