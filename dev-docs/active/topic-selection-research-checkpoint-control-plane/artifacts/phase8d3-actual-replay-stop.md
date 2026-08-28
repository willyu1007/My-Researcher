# Phase 8D-3 真实证据回放停止报告

## 结论

当前还不能审阅“机会侦察员 vs. 既有工作终结者”的研究判断。真实回放在角色调用前正确停止：当前正链 `EvidenceMap` 的 11 条已审阅 EvidenceUnit 中，0 条能够生成严格的 `EvidencePacket`。

这说明 fixture 已证明机制会工作，但当前选题链的真实证据尚不满足让角色阅读和引用的最低条件。不得用上游摘要、UUID 或裸检索命中替代原文证据，也不得据此合成 debate 结果。

## 实际回放

- TitleCard：`title_card_6f4b268d-ba00-450d-a6be-ac083a32623f`
- arena snapshot：`input_snapshot_research_checkpoint_248a284beed40ba81fa0ed57ac425f7449124e460a8a5ce3a64434060f1e2284`
- arena session：`research_arena_497bb532-8cfb-47af-8a5f-b6d79dc0feb4`
- exact EvidenceMap：`evidence_map_d55feebd-b26c-476b-ad59-cfcf508119ba`
- exact SearchPlan：`search_plan_d3f7c65b-6107-4cf2-9c15-f612f17d659d`
- exact LiteratureSnapshot：`literature_snapshot_8a6aa7a3-5417-4aa2-8f65-e7991e455aa2`
- retrieval mode：`local_snapshot_lexical`
- provider calls：`0`
- role invocations：`0`
- persisted diagnostic artifact：`artifact_ref_42424f21-0019-403d-ba85-27a54d6f717c`
- diagnostic checksum：`ebe42d5152c92e2629e83cb64cd606950e836687cf92d4b8f6edf03f4e050550`

本地检索先产生了两个可复放 SearchRun：`search_run_e6367df2-001c-44f9-bf15-60962e82ce23` 和 `search_run_6d343ae0-b132-4050-9294-f52eed192c7e`。检索发现了 LiteratureSnapshot 内尚无匹配已审阅 EvidenceUnit 的文献/段落，因此返回 `requires_evidence_materialization`，没有向角色暴露裸检索内容。

## 证据完整性结果

| 失败类型 | 数量 | 含义 |
|---|---:|---|
| `QUALITY_NOT_ACTIVE` | 6 | 文献未处于可作为当前检索证据的质量状态。 |
| quote integrity failed | 5 | EvidenceUnit 的陈述不能在绑定的原文 locator 中通过引用完整性校验。 |
| ready | 0 | 没有可安全暴露给 arena 角色的证据包。 |

完整逐条结果位于同目录的 `phase8d3-actual-replay-stop-llm.json`，并已作为 canonical inline diagnostic artifact 持久化。

## 本轮实现纠正

真实回放同时暴露并修正了三个产品边界：

1. 增加 arena session 的 HTTP 创建与恢复入口，使影子回放不再依赖数据库外手工注入 session id。
2. EvidenceMap 不再按 TitleCard 要求“全局只能有一份 current map”，而是按请求绑定的 SearchPlan + LiteratureSnapshot 精确选择；同一 TitleCard 的历史/并行 current map 不再造成错误歧义。
3. 证据准备必须声明 `local_snapshot_lexical` 或 `provider_hybrid`，响应记录实际 `provider_call_count`；Phase 8D runner 只接纳本地快照检索且供应商调用为零的准备结果。

## 需要研究者审阅的决定

不是选择某个 debate 结论，而是决定是否授权一个新的证据修复单元：对这 11 条 EvidenceUnit 做质量激活或从 canonical 原文重建精确陈述/locator，生成改变后的 InputSnapshot，再开启唯一一次 delta-bound arena retry。

在该决定前：Phase 9 保持未激活；现有 promotion gate 保持冻结；本次 arena session 不产生综合结论、不写 checkpoint、不写人类决定。
