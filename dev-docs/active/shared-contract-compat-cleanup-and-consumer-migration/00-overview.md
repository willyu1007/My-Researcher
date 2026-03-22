# 00-overview

## Status
- State: done
- Next step: 等待用户验收；若要归档本任务，需按仓库规则单独获批后移动到 `archive/`。

## Goal
- 清理 `interface-field-contracts.ts` compat layer，并将 backend consumers 迁移到 filename-aligned shared public subpath imports。

## Non-goals
- 不改变 research-lifecycle contract 的业务语义。
- 不改 REST/DB path、schema 或运行行为。
- 不在本任务中引入短域名 public API。
- 不推动 desktop/frontend 迁移。

## Context
- `T-019` 已将 `interface-field-contracts.ts` 收敛为 compat aggregator，但 shared 公开导出链路仍经过该文件。
- backend 当前有 `33` 个 active code imports 直接使用 `@paper-engineering-assistant/shared` 根入口，尚未消费 split contract files 的正式 public subpaths。
- 当前 governance lint、shared typecheck、backend typecheck 基线均为绿色，适合作为 follow-up cleanup 任务推进。

## Acceptance criteria
- [x] 新任务 bundle 已创建并登记到 project hub。
- [x] shared 已提供 filename-aligned public subpath exports。
- [x] backend `apps/backend/src` 根入口 import 已清零。
- [x] `interface-field-contracts.ts` 已移除，shared tests/README 已同步。
- [x] root-import guard 已落地并通过验证。
- [x] governance + shared + backend 验证矩阵通过。
