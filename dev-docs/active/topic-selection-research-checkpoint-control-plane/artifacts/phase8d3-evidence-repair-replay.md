# Phase 8D-3 证据修复与新快照回放报告

## 结论

研究者授权的 11 条 EvidenceUnit 修复和一次新快照回放均已完成。修复后的 11 条证据全部能够从 canonical 原文精确解析，新的 `EvidenceMap` 也已通过严格 EvidencePacket 校验；但本次 scout–killer 影子回放没有得到“应继续推进某个候选”的结论。

两条候选均被 `parked`，集合级结果为 `evidence_expansion_required`。当前证据能够确认“不确定性触发的自适应检索/路由已经是成熟基线”，却不足以证明以下增量主张，也不足以据此杀死它们：

1. 相邻检索深度的**有符号效用**可以被可靠识别，并改善质量—成本前沿；
2. `k=1` 之后的反馈仍带来可识别的增量价值，而不只是已有不确定性路由的改写。

因此 Phase 9 仍不激活。本轮正确的后续路径是先补齐直接支持与直接反驳这两个增量主张的证据，再由研究者决定是否进行新的研究路径，而不是沿当前中等价值选题继续包装。

## 11 条 EvidenceUnit 修复

- 新 EvidenceMap：`evidence_map_de5e35b6-48d9-4513-8aff-fd7e5894e1fc`
- 版本：`v-de5e35b6-48d9-4513-8aff-fd7e5894e1fc`
- 输入快照：`input_snapshot_b89e02ad-2631-4410-845f-67ba68996ea9`
- trace：`trace_snapshot_91d413e9-c953-4d2e-95a8-7ec714a0a880`
- workflow run：`workflow_run_9347a1b2-727b-4afc-97b9-a9a586c7c509`
- 严格解析结果：`11/11 exact_match`
- EvidencePacket hash：`93691678b8f597c13f3d2addda7f1530b50f879f0520b187a35cf49f974bb4b2`
- 可检查原文字符数：`9328`
- 新 material conflict：`evidence_conflict_dcc002c4-ee50-4ef7-af70-fcc05f7dc510`，代码 `NEAREST_WORK_INTERSECTION_NARROWS_NOVELTY`

六条原先因 `QUALITY_NOT_ACTIVE` 失败的证据中，涉及 `LIT-2253`、`LIT-2254` 的文献质量由既有人工证据审阅 authority 激活；五条 quote-integrity 失败和其余条目均使用绑定 locator 的 canonical 段落重建。旧 map `evidence_map_d55feebd-b26c-476b-ad59-cfcf508119ba` 已标记为 superseded。

修复同时暴露了一个产品边界错误：按键解析原文的 EvidencePacket 曾错误要求 active embedding index。现在直接证据解析只要求高置信质量、可解析 key content 和非陈旧 canonical source stages；需要相似度搜索的 retrieval 仍继续要求 active index。这样不会为了读取已知 locator 而伪造检索就绪状态。

## 唯一一次 delta-bound 回放

- 新 arena snapshot：`input_snapshot_a884f2a3-b5b7-4d76-865c-2c3d66821630`
- snapshot hash：`8e7de9ba3499a138357af40a50074e7f542fc4538fd203a9d7d7bb846109d7ef`
- 唯一 delta：新 EvidenceMap；候选集与研究目标不变
- retry session：`research_arena_def21744-92fb-41cb-96f1-20798e76392a`
- predecessor：`research_arena_497bb532-8cfb-47af-8a5f-b6d79dc0feb4`
- execution plan：`artifact_ref_399414a1-dfa2-45e7-ae60-81cb2f79ce39`
- synthesis/transcript：`artifact_ref_848675d7-10d9-40cd-b24c-69c1f298a694`
- transcript hash：`3c4d5c6ff9598242cf631eb3b162586039cd8739cfcac8f059a96f6292cf2fd2`

| 角色 | EvidencePacket | SearchRun | 实际引用 EvidenceUnit | peer 输出暴露 |
|---|---|---|---|---:|
| opportunity scout | `artifact_ref_93b5a0a3-d609-4291-9941-34a2d31255ad` | `search_run_d52bfa0f-277e-4c50-b145-4c577c1f622c` | `evidence_unit_d80feb2f-eed0-42bf-9e2f-508194561950` | 0 |
| prior-art/topic killer | `artifact_ref_510616b9-738b-48fa-a64c-dcfcd935be19` | `search_run_c4ed9e54-ef7e-47fd-b5bc-e7fc79b04436` | `evidence_unit_9da3bf90-c49f-47f4-8f73-bf16adb83ce8` | 0 |

实际回放计数为：2 次非供应商角色调用、2 个本地 SearchRun、10 个 retrieval hits、1466 个模型可见证据字符、0 次供应商调用、53 ms 服务执行时间。两个角色的 `prior_role_hashes` 均为空，输出和 exposure hash 均已持久化。

## 掌握感与限制

产品层的 first-pass 隔离成立：两位角色只看到了各自 EvidencePacket，没有看到同阶段 peer 输出。但本次两个 `codex_assisted` 结构化角色输出均由同一个 Codex 主代理撰写，没有启用两个独立 subagent。因此本轮证明的是**产品证据隔离、可追溯和回放边界**，不是完整的认知独立多 Agent debate；该限制必须进入后续校准，不能用空的 `prior_role_hashes` 代替认知独立性。

诊断过程中还发生过一次误触普通 `/literature/retrieve`：请求因错误字段而没有被用于证据或回放，但产生了 1 次 OpenAI query-embedding 请求，估算费用约 `0.00000065 USD`。它不属于上述实际回放计数，且其结果没有绑定到新 snapshot、EvidencePacket 或 role artifact。实际的新快照回放供应商调用仍为 0。

EvidenceMap 修复按现有控制面自动 materialize 了新的 pending evidence checkpoint：`research_checkpoint_7925bb9a-9782-43ec-a5ec-86cda8f2573f`。本轮没有为它写人类 checkpoint decision，也没有创建 accepted risk、promotion decision、bridge 或 PaperProject。

## 研究者下一次需要审阅的内容

只需审阅一个语义决定：是否为“有符号相邻深度效用”和“`k=1` 后反馈增量”补充直接支持/反驳证据，还是接受当前证据不足并继续停放这两条候选。当前结果不要求逐节点授权，也不允许自动晋级。
