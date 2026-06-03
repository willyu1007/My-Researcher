# 04 Verification

> 每次验证运行记录命令 + 结果。

## Status
- Phase 1a + 1b done。1c full harness-admission e2e rescoped → Phase 2（见 03-notes）。

### 2026-06-03 · Phase 1b — V1bSliceHumanSelectionService
- 文件：`apps/backend/src/services/topic-selection-v1b-slice-human-selection-service.ts`（+ `.unit.test.ts`）。
- 命令：`TS_NODE_PROJECT=apps/backend/tsconfig.json node --test --loader ./apps/backend/node_modules/ts-node/esm.mjs apps/backend/src/services/topic-selection-v1b-slice-human-selection-service.unit.test.ts`
- 结果：**5/5 pass**（自洽请求装配：node_id/policy/created_by/actor/human_delegated/三哈希自洽/source_refs；负例：缺 n4_handoff_hash→409、未知 option set→404、option 不在集合→404、非 human actor→400、空 rationale→400）。
- 两个新测试文件合跑：**11/11 pass**。`pnpm --filter @paper-engineering-assistant/backend typecheck`：exit 0 / 0 errors。

### 2026-06-03 · 代码质量 + UI governance 复核（本轮全部改动）
- **UI governance gate**（`ui_gate.py run --mode minimal --fail-on warnings`）：**0 errors / 0 warnings**，128 文件，spec & exception approvals OK。
- **修复 1 处契约违规**（我引入）：`AdjudicationConfirmForm.tsx` 曾用 `data-ui="text" data-tone="warning"`，但 `text` 角色仅允许 `primary|secondary|muted|danger`（`ui/contract/contract.json`）。改用 `data-ui="alert" data-tone="warning"`（先例 `ClusterReviewPanel.tsx`）。
- **修复 nit #1**：`pendingConfirm`（N7 已提交、待 N8 重试）时锁定 decision select + support packet 控件 + 6 个 validate 字段（保留 rationale/humanRationale/reviewer actor_id 可编辑，供 N8 重试）。用原生 `disabled`（与 `SidebarTitleCardSelector`/`ContentProcessingOperationsPanel` 一致；renderer 不用 `data-state="disabled"`）。
- `pnpm desktop:typecheck`：exit 0。eslint 仓库未配置（gate auto-skip）；TS strict typecheck 为实际静态门。
- nits #2–4 判定为刻意设计/非缺陷，未改（#2 status gate 交 N5 单一真相源；#3 golden 自回归 + 源码比对；#4 payload cast 与仓库测试 helper 一致）。

## Runs
### 2026-06-03 · Phase 1a — canonical authority-hash module
- 文件：`apps/backend/src/services/topic-selection-v1b-harness-authority-hash.ts`（+ `.unit.test.ts`）。
- 命令：`TS_NODE_PROJECT=apps/backend/tsconfig.json node --test --loader ./apps/backend/node_modules/ts-node/esm.mjs apps/backend/src/services/topic-selection-v1b-harness-authority-hash.unit.test.ts`
- 结果：**6/6 pass**（full type-check 模式）。覆盖：canonicalHash 确定性+key-order 无关；`hashResearchSliceOptionAuthority` 确定性+golden 锁定（`b7f43aa3…09f13e`）+ 改 authority 字段→变 / 改非 authority 字段（ordinal/confidence/created_at/details）→不变；`researchSliceOptionRef` 形状；`hashV1bFrozenInput` 确定性+忽略 envelope 外字段。
- `pnpm --filter @paper-engineering-assistant/backend typecheck`：新文件无 error（修了 1 个 fixture 类型错误：`claim_ceiling_alignment` 是对象 `{status,rationale,confidence?}` 非字符串）。
- 注：golden 是模块自身回归锁；与 harness 私有哈希的 byte-identity 已通过源码逐字段比对确认，权威验证留给 Phase 1c（admitted N5 == 所有 hash 与 harness re-derive 一致）。

## Planned checks (per 01-plan Phase 4)
- [ ] `pnpm desktop:typecheck`
- [ ] `pnpm typecheck`（shared + backend + desktop）
- [ ] 新 `V1bSliceHumanSelectionService` 单测：成功 / `selection_option_hash_mismatch` / 陈旧 option-set 负例。
- [ ] v1b 集成测试：`node --env-file=../../.env.local --test --loader ts-node/esm src/routes/topic-selection-v1b-routes.integration.test.ts`（须含 legacy-routes 仍 404、N1–N11 harness 链路、offline replay 仍绿）。
- [ ] e2e：人审驱动 N5 → ResearchSlice；同题目卡 harness 路径仍可走。
- [ ] desktop build。
