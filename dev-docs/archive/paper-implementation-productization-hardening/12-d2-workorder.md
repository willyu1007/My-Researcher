# 12 D2 工单：debate 确定性档位（开工 2026-07-15）

## 定位与决策
- 切片：D2（原签核决策 2026-06-13：确定性 debate tiering，排 S3 之后；用户 2026-07-15 裁定与 S4 不捆绑、独立成片）。地基已备：S3 debate kernel（resume/admission 语义/retry 分类）+ S4 遥测与 shadow 档位（run 007 全档位基线 $2.043/重付 0 为校准对照）。
- 原则：**确定性**——档位由纯函数从可复算输入判定（无 LLM 参与），决策可重放、进 identity/manifest；**验收前生效**——D10 终验收必须在带档位的产品真实形态下进行。
- 生效范围 v1：**仅 trace-integrity（4 角色、最贵）enforced**；P1 两槽与 evolution 保持 shadow 记录观察一轮再扩。

## 工作项

### D2-pre1 evolution 槽内内容注入（B3-analog，motive lane 解锁）
- run 006/007 实证：challenger 停在 `MISSING_DESIGNER_OPTION_KEYS`/`MISSING_DESIGNER_ARTIFACT_CONTENT`——designer 产出的 option 逐字内容未注入 challenger 的调用语境（B3 修了 coordinator 跨-step 正文穿引，槽内多-role 交接是下一层）。
- 修法：motive-evolution 服务内 designer role output（canonical designed_options 全量正文）注入 challenger 的 user message（hash 围栏对账：challenger echo 的 option_set_hash 已有语义检查，穿引后应可通过）；prompt v2 文本相应措辞（原地改）。语义检查不放松。
- 验证：unit 正反例 + live 验证留到收口 gs-001 v4 跑（预期 motive lane evolution 完链或落真实语义裁决）。

### D2-pre2 disposition 语义形式化（blocked 之外的产品出口）
- 现状：skeptic 有 recommended_disposition（非 proceed → coordinator waiting_review 停驻）；curation gaps-only 落 admitted blocked（S4 修复后不再 failed），但 blocked 是终态、无"语义有效批判→修订后续跑"出口。
- 形式化：**blocker（输出不可用/技术性）vs disposition（输出可用、对输入的裁决）**二分——curation 契约加性增加 `recommended_disposition?: proceed|revise|blocked`（与 skeptic 同构；gaps-only+无 viable binding = revise 语义）；coordinator board pipeline 对 admitted 且 disposition=revise 的 final 停驻 waiting_review（对齐 lane A skeptic 语义），blocked 保持现状。queue/桌面标签同步。
- 红线：不改 skeptic 既有语义（已正确）；curation 的 revise 判定由服务确定性推导（gaps 非空+binding 空），非 LLM 自由裁量位。

### D2-core 档位引擎（trace-integrity enforced）
- **契约**：`PaperImplementationDebatePolicy@v1`（shared，签核 D2 形态；引用原决策记录）——tier 枚举 light|standard|full；per-tier 角色计划（v1 定案：light=support_mapper+skeptic+arbiter（无 findings 时 reconcile 本就无事可做，light 下 skeptic 有 findings 则**强制升档 standard 重跑缺失角色**——升档是确定性规则非放松）；standard=四角色单轮（现状）；full=四角色+arbiter 前 reconcile 双轮预算上限提高）；per-tier token/调用预算参数入 SlotParameterManifest。
- **判定**：S4 shadow 函数提升为 enforced 入口（同输入同档、inputs_hash 复算；P1/evolution 调用点继续只记 shadow）。**档位决策记录**：tier+inputs_hash+rationale_codes 进 runtime artifact 的 execution 语境与 telemetry 记录（shadow_tier 字段沿用，语义=enforced 时记生效档）；runtimeIdentity 纳入 tier（不同档位=不同 identity，resume 的 identity 钉死自动覆盖——升档重跑不与原档冲突）。
- **预算联动**：tier 预算不足时 slot 发 `TIER_BUDGET_INSUFFICIENT`（R4 已预留 trusted 分类 loop_budget_review；coordinator 零改动）。
- **manifest**：SlotParameterManifest 增 tier 维（四向完备性互查扩展），快照重生成。
- **L5**：档位判定可复算/档位漂移拒绝（identity 含 tier）/light 升档规则确定性/TIER_BUDGET_INSUFFICIENT 分类——先注册。
- **红线**：admission 语义检查按实际执行的角色集完备（light 下缺席角色不要求 section，但 skeptic 有 findings 必升档故 disposition 完备性永不豁免）；blocked 输出同检不变。

## 收口（D7）
全量 stress/smoke/tsc + 8 角度 review + 修复轮；**gs-001 v4 跑**（素材 v3 不动或按 pre1 需要微调，live：验证 motive lane 解锁 + curation revise 停驻 + 遥测对比 run 007 基线）；**trace debate 档位对比证据**（near-prod 或专项 live：同输入 full vs light+升档路径，rubric 抽查批判有效性不劣化）；代评审 + near-prod + 提交。无新表预期（tier 参数走 manifest/契约；若遥测需加列则迁移单独审批）。
