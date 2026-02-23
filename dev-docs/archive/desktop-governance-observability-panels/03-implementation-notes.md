# 03 Implementation Notes

## Status
- Current status: `done`
- Last updated: 2026-02-23

## Decisions & tradeoffs
- 决策: 将治理可观测能力拆为独立前端任务 `T-006`。
  - 理由: 避免与 `T-004` 基础壳层任务混写，降低漂移风险。
- 决策: 首版采用 read-first，release-review 作为唯一写动作。
  - 理由: 先控制集成复杂度，再逐步扩展写路径。
- 决策: 接口消费采用 DTO adapter 层。
  - 理由: 防止后端字段小幅变更直接破坏 UI。

## Planned artifacts
- Panel components: timeline / metrics / artifact / release-review
- Data adapters and schema guards
- Feature-flag switch and fallback views

## Open follow-ups
- 无阻塞 follow-up；后续仅做体验增强时再新开任务。

## Progress log
- 2026-02-23: 进入实现阶段，开始接入治理接口 DTO、四个面板与 release-review 提交交互。
- 2026-02-23: 已在 `apps/desktop/src/main/main.ts` 新增 `desktop:governance-request` IPC bridge，统一代理治理接口请求，规避 renderer 跨域耦合。
- 2026-02-23: 已在 `apps/desktop/src/main/preload.ts` + `preload.cjs` 暴露 `requestGovernance` 白名单能力，并在 `env.d.ts` 增加桥接类型。
- 2026-02-23: 已重构 `apps/desktop/src/renderer/App.tsx`，完成：
  - feature-flag 控制（默认关闭，支持会话内启用/关闭）
  - Timeline panel（含证据链定位入口）
  - Runtime metrics panel（tokens/cost/gpu）
  - Artifact bundle panel（proposal/paper/repo/review）
  - Release review queue + 提交表单（回执展示）
  - DTO 归一化与异常回退（loading/empty/error）
- 2026-02-23: 已更新 `app-layout.css` 结构布局，保证 2x2 面板和移动端单列降级。
- 2026-02-23: 为浏览器回退联调补充 Vite dev proxy（`/paper-projects`、`/health` -> `127.0.0.1:3000`），解决本地 smoke 的 CORS 阻塞。
- 2026-02-23: 已完成手工 smoke（默认关闭、loading/error/empty 回退、release-review 回执）并回填 `04-verification.md`。
