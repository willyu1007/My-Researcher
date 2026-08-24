# 10 S3 工单：多角色 debate kernel 硬化（开工 2026-07-12）

## 定位
- 切片：S3（D8 第四位，S0/S1/S2/S5×2 已闭合）。承接 D9（resume 契约，已签核）、复审 N2（admission 自证+语义空心）、N7（dossier 失败对账）、S2-C 遗留（echo 扩面、skeptic 漂移对账）、gs-001 v2 实证靶（evolution SCHEMA_VALIDATION_FAILED）。
- 目标：多角色链"失败不破产（resume）、通过不空心（语义完备门）"；D2 debate 档位在 S3 之后才有地基。

## 工作项

### S3-α resume 契约 + 契约加深 + admission 真实现（trace-debate/P1 同域）
- **α1 D9 resume**：trace-integrity（4 角色）与 P1（3 角色）请求加可选 `resume_from_run_id`——续跑复用该 run 已 admitted 的 role artifact（逐角色校验：同 retrieval packet hash/同 profile/prompt identity/admission admitted），从首个缺失角色继续；identity 漂移拒续（409）、跨 slot/项目复用拒绝、已 admitted 角色不重发 provider 调用。T-114 `11-trace-integrity-debate-design.md` 加取代注记（引用 D9，历史正文不改）。L5 注册 resume 正反例。
- **α2 role output 契约加深**（N2）：trace debate role output 增加结构化字段——support_mapper 的 `per_statement_support_map[]`（statement_ref×support_kind×cited refs）、skeptic 的 `findings[]`（finding_id×severity×target statement×cited refs）、reconcile 的 `finding_dispositions[]`（每 finding 恰一处置：accepted_blocker|resolved_with_refs|rebutted_with_refs|context_gap_blocker）、arbiter 的 statement/finding 覆盖清单。schema 同步（加性优先；必要的 required 收紧配 prompt template **新版本**，遵守 profile/prompt version 纪律）。
- **α3 admission 规则真实现**（11 号文档 8 条）：per-role admission 增加语义完备检查——refs ⊆ retrieval packet、每 skeptic finding 在 reconcile 恰一处置、rebuttal/resolution 必须引 allowed refs、arbiter 覆盖每 statement 与每 finding、accepted blocker 必入 final blocker 集。**blocked 输出也过语义检查**（关闭 N2 旁路：role_status=blocked 的输出同样跑结构约束，失败按技术失败重试语义）。admission 的 expected_* 自证问题：per-role 语义检查在服务端独立执行（非拷贝比对），admission 记录检查结果。
- **α4 echo 扩面与漂移对账**：9 个单角色服务的 role_slot_id 回显失配 400 改可重试技术失败（S2-C C1 语义扩面）；skeptic 的 present-but-drifted echo 对账补齐（与 cycle/feasibility 一致）。

### S3-β evolution 实证靶 + dossier 失败对账（并行）
- **β1 evolution SCHEMA_VALIDATION_FAILED 根因**：从 run `gs001-lora-live-004` 的失败 artifact 取模型原始输出与 schema 失配点，判定：schema 过严（不合理 required/enum）→ 契约修正；或 prompt 未引导结构 → prompt template 新版本（版本纪律）；或输出确实低质 → 保持 fail-closed 并记录。修后本地以 fixture 复现原失配→通过。
- **β2 N7 dossier 项目级失败对账**：`createImplementationDossier` ready 路径增加项目级 REU 对账——项目内全部 trusted `failed/cancelled/negative/inconclusive` RunEvidenceUnit 必须被 dossier 的 experiment_section（failed/inconclusive/negative refs）或被引用 packet 的 source 覆盖，未覆盖 → 409 带缺失清单（`workOrderRepository` 已注入）。豁免语义（如显式 excluded refs）如实设计并测试。
- **D-16 supersession（2026-07-12）**：β2 继续作为当时 S3 工单/实现历史，不再是目标产品契约。T-132 D-16 要求 failed/cancelled/incomplete execution 产生零 REU，complete valid negative/inconclusive 与 execution status 分轴，dossier 只消费 explicit closed-Cycle snapshot refs/hashes。现有 project-wide scan、trusted failed/cancelled REU 与对应测试属于必须原子替换的迁移债；不得继续扩展、复制或以兼容 fallback 保留。

## 收口（D7）
α/β 完成后：全量 runtime-stress（新增必检先注册）+ prisma smoke + tsc；gs-001 **v3** 素材修订（自包含探针判据 + 吸收 v2 五条 warning）+ live 重跑（预期 skeptic proceed 或更少 blocking，evolution 完链）+ 代评审对比留档；near-prod gate；提交。无新表/列则无迁移。

## 完成注记（2026-07-15）
S3 全项闭合：α1-α4 / β1-β2 落地 + 复审修复轮 F1-F5（10 CONFIRMED，4 REFUTED 留档）+ run 005 三槽根因修复（语义 ref 键 / gaps-only 合法化）。收口证据：stress `1784078240326` passed、smoke 37/0/15、near-prod `1784074155740` passed；gs-001 v3 run 006 lane A 全链 completed + 受理桥双物化，代评审 4.9/4.9/4.9/5.0。提交：`752e6a34`（S3 代码态）+ 收口尾轮 commit。预期偏离："skeptic proceed / evolution 完链"部分达成——skeptic passed 且 lane A 完链；evolution 越过技术死路后落真实语义 blocker（槽内 designer→challenger 内容交接缺口），如实停驻并移交（03 移交项）。无迁移。
