# 05 Pitfalls

> 解决一个显著错误/死胡同后追加：症状、根因、试过什么、修复、预防。历史教训，非当前 issue。

## Status
- Phase 1 实施中累计的教训如下。

## Resolved
1. **`data-tone="warning"` 不在 `text` 角色的允许集** — 症状：UI 改动里给 `data-ui="text"` 配了 `data-tone="warning"`；根因：`ui/contract/contract.json` 中 `text` 仅允许 `primary|secondary|muted|danger`，`warning` 属 `badge`/`alert`/`toast`/`status`；修复：警示文案改用 `data-ui="alert" data-tone="warning"`（先例 `ClusterReviewPanel.tsx`）；预防：加 `data-ui` 属性前先查 contract 角色允许的 attr 枚举，别凭直觉用 badge 的 tone。
2. **`claim_ceiling_alignment` 是对象不是字符串** — 症状：fixture 写成 `'aligned'` 触发 TS2322；根因：字段类型 `TopicSelectionResearchSliceClaimCeilingAlignment` 是 `{status,rationale,confidence?}`（与同名 `...Status` 枚举区分）；修复：用对象 `{status:'aligned',...}`；预防：哈希这个字段时务必带对象全形，否则 `selected_option_hash` 会与 harness re-derive 不一致被 N5 拒。

## Pre-recorded "do-not-repeat" (from assessment)
- 不要把 v1b 人审做成"重加 legacy direct-write 路由"——它们被 `'legacy write routes are not registered'` 测试钉死成 404，且是绕过 harness 的并行写路径。人审必须经 `harnessService.ln`。
- 不要给 N9 / N10 加人审写入：它们是 `execution_kind:'deterministic'` + `allowed_execution_modes:['none']`，T-087 计划把它们当人审点是与最终 contract 不符的旧口径。
- 不要让 UI 自行拼 harness run-request 的 lineage hash：`research_slice_option_set_hash` / `n4_handoff_hash` 必须取自持久化（option set `comparison_payload.authority_hash` + N4 handoff artifact），由后端组装，否则会被 gate 以 `selection_option_hash_mismatch` 拒。
