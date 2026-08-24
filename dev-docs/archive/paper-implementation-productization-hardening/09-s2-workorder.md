# 09 S2 工单：单调用鲁棒包（开工 2026-07-11）

## 定位
- 切片：S2（D8 第三位）。承接 P-01 caller 半边（PC-S1..S4，D3/D-T128-02 已裁定）、复审 N3 残余、S1 两轮复审移交的清理簇、gs-001 首跑三案由。
- 目标：单次 LLM 调用在论文级输入下"活得下来、付得起"；链上下文穿引补齐；参数真相机器可对账（D5 地基）。

## 工作项（按实施顺序）

### S2-B golden 三案由（coordinator/motive 域，与 A/C 无文件重叠）
- **B1 evolution InvalidRequestError**：从 run `gs001-lora-live-003` 的 `11-lane-motive-advance-1.json` 失败详情定位根因（provider 请求构造/schema），修复+回归测试。
- **B2 run_mode 映射不一致**：motive lane 的 dry_run→test 映射与 provider profile eligibility 冲突（review-packet 元数据登记）——统一 coordinator 各 lane 的 run_mode→slot run_mode 映射语义，负例锁定。
- **B3 提案正文穿引**：lane A 链内消费步（skeptic/cycle/feasibility）的请求由 coordinator 注入上游 admitted 提案**正文**（source_context_packets，deep-copy admitted final artifact 的 proposal 载荷；identity/hash 纪律不变）——关闭 RF-001 `BLOCK_PRIMARY_ROUTE_ARTIFACT_BODY_UNAVAILABLE`。gs-001 runner 的手工补喂步骤随之删除。

### S2-D D5 manifest 地基（并行）
- `SlotParameterManifest@v1`：backend registry 运行时导出（profile+全部 model option/prompt id+version/context profile/token 预算/retry/fallback/run-mode eligibility/**materialization class**（domain_gate_materializable|proposal_only|handoff_only）/debate·selection·memory 挂载位 null 占位）+ 提交式快照（脚本导出 JSON 入 repo，CI 新鲜度校验）。
- 四向完备性测试（18 路由 ↔ manifest ↔ runtime-stress 必检 ↔ 金丝雀 flag）进默认 CI + stress 新 step；裸参数负例（per-request temperature/max_tokens 注入被拒）。
- **完成注记（2026-07-11）**：`SlotParameterManifest@v1` 落地——运行时导出 `apps/backend/src/services/paper-implementation-slot-parameter-manifest.ts`（registry 权威 + slot 绑定表），快照 `docs/context/paper-implementation/slot-parameter-manifest.json`（`node .ai/scripts/paper-implementation-slot-parameter-manifest-export.mjs` 再生，已注册 docs/context registry），守护测试 `paper-implementation-slot-parameter-manifest.unit.test.ts`（快照新鲜度 + 四向完备性含删项/未知键负例 + 服务源钉扎 + materialization 类别 census + P-07 裸参数 L1 负例×11 schema）。实测路由/条目/金丝雀均为 **14**（工单"18"系 P-04 审计笔误；`T114_PROVIDER_FAIL_CLOSED_CANARY_LIVE` 为链级非槽位 flag 显式豁免）。**新 slot 不再手写 dev-docs Profile Resolution Block：在 manifest 绑定表加条目并再生快照即可（manifest 指针即晋升制品）。**

### S2-A 压缩接线 + token 双计（六胖 packet slot 同域）
- **双计修复先行**：runtime token 估算不再对同一内容计两份（messages 嵌入 + context_payloads 重复）——单一事实源估算。
- **PC-S1..S4**：共享 attempt-builder 纯函数（层级 L1=逐 packet 正文裁至定长摘录保 ref 骨架+截断标记、L2=整包剔除保 refs/hashes；永不裁 authority/conflict/challenge refs 与 preserved_fact_kinds；caller 侧逐级重估取最小充分层级；v1 层级静态常量）；首槽 evidence-board-curation 穿透（胖 packets → requires_compression → 恢复续跑 → 成功+报告工件）后铺开其余 5 槽；motive 两槽 document-as-within-budget；trace debate 明文留 STEP-7 下游。既有 `*_over_budget_zero_provider_calls` 必检改写双分支（不可裁→blocked 保留 / 可裁→压缩后完成且血缘可验）。

### S2-C retry 分类 + 幂等 + 终态统一 + 清理簇
- role_slot_id 回显失配、blocked 无码 → 可重试技术失败（不再 HTTP 400/整链作废）；UpstreamError 双层重试语义对齐。
- `runtimeIdentityHash` unique 幂等（Prisma 迁移随 S2 收口统一出、单独审批）。
- preflight 终态 7 slot 统一（blocked final 语义为准）。
- 清理簇：acceptance-bridge 与 artifact-consumption 校验器核心合一；feasibility 直查仓储方法（消 3×全表扫描）；normalizedRefType/hasText 入共享 util 定单一语义；echo 机械对齐从 coordinator 下沉 slot 层（mocked 语义归 slot 拥有）；skeptic blocked 态 repair_suggestions 完备性小项。
- **完成注记（2026-07-12）**：
  - C1：trace-integrity/P1 两 debate 服务的 role echo 失配与 blocked 无码改判 `RUNTIME_ROLE_SLOT_ECHO_MISMATCH` / `RUNTIME_ROLE_BLOCKED_CODES_MISSING`（SCHEMA_VALIDATION_FAILED 语义：同 profile 重试一次→仍错 failed_runtime 终态，前角色不再成孤儿）；**UpstreamError 从全部 11 个 slot RETRYABLE 集移除**（gateway 上抛的 UpstreamError 一律 `retryable:false`——非预期状态码/响应不可解析/shape 失配/未知错误；真瞬态类以 Timeout/Transient/RateLimit 上抛，slot 层不再全价重打 gateway 已终裁的错误类）；11 服务 RETRYABLE 基础集收敛单源 `paper-implementation-runtime-utils.ts`。同类 echo 400 在 9 个单角色服务仍存（无孤儿面，留待后续切片）。
  - C2：**identity 粒度核实结论**——生产路径 prompt_packet_hash 经 redacted/provenance ref 已含 node_attempt_id（即含 run_id），role/final/preflight 三类 artifact 的 identity 事实上 per-run；本轮在 11 服务 runtimeIdentity 显式加入 `run_id` 把该粒度钉死（同 run_id 重放=同 identity→409；re-advance/新 run 恒新 identity 不受限）。schema `@@unique([runtimeIdentityHash])`（复用 map 名），prisma 仓储 P2002(识别 identity 约束)→409 VERSION_CONFLICT，in-memory 同语义；**迁移未出，随 S2 收口统一**（已 `prisma generate` + db-ssot sync-to-context，DB 侧约束待迁移生效）。coordinator 的 node_attempt_id 追加执行唯一后缀：fenced-out holder 的 slot 已落 artifact 而 step 未落时，后继者的"全新 attempt"否则会与孤儿 artifact 同 identity 相撞。
  - C3：curation/decomposition/evolution 的 preflight 路径统一为 **blocked final 且 admitted**（role 工件 blocked+无 failure code、blocked final 带全部 preflight blocker codes、两条 admission 均 admitted）；unit + L5 期望如实更新不弱化（断言 admitted+典型 blocker codes），stress 必检 subtest 名未变、脚本免同步。
  - C4：共享核 `assertAdmittedPassedFinal`（scope+passed+hash+admitted 对账，409 detail 统一 `{guard,consumer,runtime_artifact_id,…}`）由 acceptance-bridge 与 consumption 校验器共用；runtime repository 新增 `listFinalRuntimeArtifactsByFinalArtifactRef` 直查（interface+in-memory+prisma JSON path），feasibility 3×全表扫描消除；normalizedRefType 8 处副本（2 语义）与 hasText 3 处函数副本收敛 `paper-implementation-runtime-utils.ts` 单源 `[^a-z0-9]` 语义，既有测试全绿证明收敛无回归；coordinator 的 alignFixtureChainEchoes/fixtureEchoFields 删除、echo 归一化下沉 skeptic/cycle/feasibility 三 slot（仅补缺失/null 的 echo 字段，present-but-drifted 保留→漂移门直调 slot 可测，coordinator mocked lane A 完链回归通过；COORDINATOR_INJECTED_CHAIN_FIELDS 冲突表保留）；skeptic blocked 态无任一 `required_revision_refs` 时补 `ROUTE_SKEPTIC_REPAIR_SUGGESTIONS_MISSING` warning（不阻断，S3 契约加深前过渡）。

## 收口（D7）
每项收口跑受影响套件；S2 整体收口：迁移审批+apply → 全量 runtime-stress + prisma smoke + gs-001 v2 重跑（选题包按 skeptic 修订，预期 lane A 完链）→ near-prod gate → 提交。
