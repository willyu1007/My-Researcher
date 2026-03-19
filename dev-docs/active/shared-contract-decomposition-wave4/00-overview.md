# 00-overview

## Goal
- 将 `interface-field-contracts.ts` 拆成 bounded-context contract 文件组，同时保持 shared barrel 对现有 consumers 的兼容。

## Non-goals
- 不改 contract 的业务语义。
- 不要求 backend/desktop consumers 一次性迁移到新路径。
- 不做 backend/desktop 产品逻辑改写。
- 不改 REST/DB 语义。

## Status
- State: planned
- Next step: 在开始实施前完成 consumer audit，并确认 `T-011` 的最新 shared contract 基线已吸收。

## Scope
- `packages/shared/src/research-lifecycle/interface-field-contracts.ts`
- 允许最小化触碰：
  - `packages/shared/src/research-lifecycle/index.ts`
  - `packages/shared/src/index.ts`
  - `packages/shared/src/research-lifecycle/`
  - backend/desktop 的 shared import wiring（仅限兼容迁移）
  - shared tests 和 consumer typecheck

## Dependencies and coordination
- Upstream governance: `T-015 maintainability-file-split-governance`
- Major overlap tasks:
  - `T-011 literature-management-flow`
  - `T-014 automated-topic-management`（共享同一 research-lifecycle barrel 目录）
- Coordination rule:
  - 若 shared contract 或 sibling barrel 仍在被活跃改写，本包不得直接开工。
  - 若拆分需要 consumer 一次性大迁移，则说明合同不够保守，需要回到兼容层方案。

## Acceptance criteria
- [ ] `interface-field-contracts.ts` 已拆为多个 bounded-context 合同文件。
- [ ] `research-lifecycle/index.ts` 与顶层 shared barrel 继续兼容导出。
- [ ] backend/desktop consumers 无需一次性大迁移即可继续工作。
- [ ] shared/backend/desktop 验证矩阵全通过。

