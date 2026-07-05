# 01 Plan

> 执行视图，按 phase 列里程碑、产物与 DoD。设计细节见 `02-architecture.md`。
> 注：3 个开放决策（builder 复用 / 路由命名 / 时机）尚未拍板——见 `02-architecture.md` §Open decisions。本计划以推荐取向（复用 builder、新语义路径、N5 先做参考实现）撰写，拍板后据此微调。

## Phases

0. **Phase 0 — 对齐与收口前置**
1. **Phase 1 — 后端 N5 人审 service（风险核心）**
2. **Phase 2 — N5 路由 + UI 接线**
3. **Phase 3 — 复制到 N7 / N2**
4. **Phase 4 — 验证、回归、收口**

## Detailed steps

### Phase 0 — 对齐与收口前置
- [ ] 与用户拍板 3 个开放决策（`02-architecture.md` §Open decisions）。
- [ ] 与 `T-088` owner 对齐 `TopicSelectionV1bWorkflowHarnessService` 改动边界（它在重构 harness/orchestrator，可能与本任务共改同一文件/`ln` 路径），约定先后顺序与接口。
- [ ] 收口"由 `option_set_id` 反查 `n4_handoff_hash` / `handoff_ref`"的取数路径：确认 N4 run-result / handoff artifact 能按 option-set 反查；若不能，定最小持久化补丁（在 option set 记录补存 `handoff_ref`）。
- [ ] DoD：决策已记录进 02/03；取数路径有定论（"可取" or "补 1 个 ref 字段"）。

### Phase 1 — 后端 N5 人审 service（风险核心）
- [ ] 把 test-helper 里的 frozen-input / 哈希组装（`acceptedV1bHarnessSliceSelectionPayload` / `v1bHarnessN5Request` 等价逻辑）**提升为可复用后端模块**（单一真相源），或在 service 内复用 harness 既有 `hash()`/canonical 序列化。
- [ ] 新增 `V1bSliceHumanSelectionService`：输入 `(optionSetId, selectedOptionId, rationale, confidence, actor)` →
      ① `findOptionSetById` 取 `comparison_payload.authority_hash`；
      ② 取/算 `n4_handoff_hash` + 把 handoff 放进 `source_refs`；
      ③ 取选中 option、算 `selected_option_hash`；
      ④ 组 `accepted_selection_payload`（`authority_input_provider:'human_delegated'`）+ 其 hash；
      ⑤ 组 N5 run-request（`created_by:'human'`、`policy_version` 常量），调 `harnessService.ln`；
      ⑥ 返回 `ResearchSlice` + `SliceSelectionDecision`。
- [ ] 单测：成功路径（人选 option → 合法 ResearchSlice）；负例 `selection_option_hash_mismatch`；负例陈旧 option-set（authority_hash 变更）；确认 harness-native 路径不回归。
- [ ] DoD：单测全绿；无需重跑 N4 即可由持久化状态物化 ResearchSlice。

### Phase 2 — N5 路由 + UI 接线
- [ ] 瘦路由 `POST /topic-selection/v1b/research-slice-option-sets/:optionSetId/human-selection`（新语义路径，避开 legacy 404 名）→ controller → `V1bSliceHumanSelectionService`。守卫：沿用 `blockWorkflowHarnessAutomationOnDirectWrite` 或等价，拒绝带 harness marker 的自动化 payload。
- [ ] `api/v1b.ts`：加 client（拉 `/research-slice-option-sets/:id/options` 选项列表 + `human-selection` 提交）。
- [ ] `SliceOptionSetCard`：从只读升级为"选定 option"表单（先拉 options 列表 → 选 + rationale/confidence + reviewer actor_id → 提交 → onMutated reload）；保留只读展示。
- [ ] DoD：桌面端能从一个 ResearchSliceOptionSet 完成人审选定，卡片刷新显示 `selected_option_id` 与产出的 ResearchSlice。

### Phase 3 — 复制到 N7 / N2
- [ ] N7 materialize-topic-question-contract：人审物化题目契约（同 builder 模式，frozen_input 取自 N6 candidate set lineage）。
- [ ] N2 record-research-constraint-profile：人审录入/确认约束档案。
- [ ] 各配 client + 卡片表单（`QuestionCandidateSetCard` / 约束档案面）。
- [ ] DoD：N2/N5/N7 三点在 UI 内均可人审；N8/N9/N10 维持只读。

### Phase 4 — 验证、回归、收口
- [ ] `04-verification.md`：typecheck / 新 service 单测 / v1b 集成测试（含 legacy-routes 仍 404、N1–N11 harness 链路、offline replay）/ 桌面 build。
- [ ] e2e：人审驱动 N5→ResearchSlice 全程；同一题目卡 harness 路径仍可走。
- [ ] 更新 `.ai/project/main` 注册（`ctl-project-governance sync --apply`）；按需更新 UI current-state-alignment。
- [ ] DoD：自动化全绿；用户验收；状态置 done 并归档。

## Risks & mitigations
- **与 T-088 并行改 harness service 撞车** → Phase 0 对齐边界，约定先后；尽量把人审逻辑放新 service，少改 `ln`。
- **hash lineage 对不上被 gate 拒（`selection_option_hash_mismatch`）** → 复用 harness canonical `hash()`；wrapper 原样回填持久化 hash；Phase 1 负例覆盖。
- **撞 legacy-routes 404 测试** → 用新语义路径（`/human-selection` 等），不复用被删名。
- **`handoff_ref` 反查不通** → Phase 0 收口；最坏在 option set 补存 `handoff_ref`（最小持久化补丁）。
- **范围蔓延到 N8/N9/N10** → 严守 non-goal：只做 N2/N5/N7。
