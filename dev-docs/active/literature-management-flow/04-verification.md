# 04 Verification

## Automated checks
- 已执行（2026-02-25）：
  - `pnpm typecheck` ❌（根 tsconfig `include: src/**/*` 无输入，属于仓库既有配置）
  - `pnpm exec prisma generate --schema prisma/schema.prisma` ✅
  - `pnpm --filter @paper-engineering-assistant/shared typecheck` ✅
  - `pnpm --filter @paper-engineering-assistant/backend typecheck` ✅
  - `pnpm desktop:typecheck` ✅
  - `pnpm --filter @paper-engineering-assistant/backend test` ✅（24 tests passed）
  - `pnpm desktop:build` ✅
  - `pnpm ci:prisma-smoke` ❌（缺少 `PRISMA_SMOKE_BASE_DATABASE_URL`）

## Manual smoke checks
- 待执行（本地 UI 人工联调）：
  1. 在文献管理执行检索并勾选导入，确认自动加入选题范围。
  2. 在论文管理执行“从选题范围带入论文”，确认引用列表可见且可改状态。
  3. 在写作中心确认引用只读联动，不提供回写入口。
  4. 在浅色/深色主题下检查新增模块可读性与交互反馈。

## Rollout / Backout (if applicable)
- Rollout:
  - 先后端只读 + registry upsert，上线稳定后再开启关联写入。
- Backout:
  - 若出现关联错配或去重异常，禁用新入口并回退最近迁移与接口路由。
