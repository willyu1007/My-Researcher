# 04 Verification

## 验证梯度（继承 T-114 L1-L6，新增 L7 usage-fit）

| Layer | Purpose | Expected proof |
|---|---|---|
| L1 contract/unit | schema、identity、admission、forbidden fields、裸参数负例、policy/assessment 契约 | shared schema tests + backend unit tests |
| L2 service integration | runtime slot / coordinator / 压缩分支 / 记忆注入经 admission 与 Domain Gate | in-memory backend service tests |
| L3 Prisma smoke | queryable identity、replay、coordinator run/step 行、无重复写 | local/dev DB smoke runner |
| L4 provider canary | 真实 provider 路径：压缩分支 live、升档 debate live、长上下文 | env-gated 金丝雀 |
| L5 adversarial/stress | 必检用例机器解析：双分支压缩、档位漂移、记忆负例、coordinator 三件套、manifest 四向对账 | runtime-stress runner（先注册后实现） |
| L6 near-prod runtime | 同路由 + live provider + Prisma + replay/幂等 + coordinator 推进证据段 | near-prod gate summary，`passed | blocked | failed` |
| L7 usage-fit（新增） | 语义产出是否满足实际科研工作需求 | golden scenario 全链推进 + 人审 rubric 评分留档（候选质量/批判有效性/证据可追溯/约束遵守） |

约定：
- 新增必检用例必须先注册进 `.ai/scripts/paper-implementation-runtime-stress.mjs` 对应 `required_*` 组（缺失即红）再写实现，防止"实现了但没进闭环门"。
- 每 Phase 收口与里程碑的 run id 一律记入下方 Log。

## Log

### 2026-07-12 S2 收口（A/B/C/D 全落地 + gs-001 v2 复评）
- **S2-A**：token 双计修复覆盖全部 11 slot（估算降至 ~52-55%，可用预算实翻倍，7 个 over-budget 必检零改动仍触发）；压缩 attempt-builder（L1 摘录/L2 剔除，refs 骨架永不裁）六槽穿透，L5 恢复分支必检 +6（`*_over_budget_compression_applied_completes`）；实测抓到并修掉 compressed_context 复门双计洞（改 manifest hash）。**S2-B**：evolution InvalidRequestError 根因=schema 名 65>OpenAI 64 上限（全仓唯二超限）；run_mode 映射统一（evolution 独有 dry_run→test 分叉）；lane A 正文穿引（hash 围栏 + 只读 reader 注入），runner 手工补喂删除。**S2-C**：echo 失配/blocked 无码改可重试技术失败（不再 HTTP 400/孤儿）；UpstreamError 从 slot 重试集移除（gateway 终裁不再全价重打）；runtimeIdentity 显式含 run_id + DB unique（同执行重放 409）；preflight 终态七槽统一 blocked final admitted；清理簇收敛（校验器核心合一/直查方法消 3×全表扫描/normalizedRefType 8 副本→单源/echo 对齐下沉 slot 层恢复漂移门可测）。**S2-D**：SlotParameterManifest@v1（运行时导出+提交式快照+四向完备性互查含负例+materialization class+P-07 裸参数负例×11 schema）；纠正 P-04"18 路由"笔误（实 14）。
- **gs-001 v2 复评**（run `gs001-lora-live-004`，7 provider 调用；AI 代评审，评分 `rubric-scored.md`）：四维 **4.8/5.0/4.8/5.0**（对比 003 基线不劣化且候选质量↑）。skeptic 从 5 blocker→1 blocking+5 分级 warning/info——B3 穿引生效进入实质审查；唯一 blocking `BASELINE_GATE_ORDER_AMBIGUOUS` 指出 v2 包 Stage 0/1 顺序矛盾（**系统连续第二次正确拦下有真实缺陷的输入**）。行动项：gs-001 v3（自包含探针判据+吸收 5 warning）；evolution SCHEMA_VALIDATION_FAILED → S3 role-output 契约实证靶。
- **收口证据**：全量 runtime-stress `t114-paper-implementation-runtime-stress-1783789410626` passed（含 6 条新恢复分支必检）；迁移 `20260712090000`（identity unique）已 apply、pg_indexes 确认；迁移后 prisma smoke **37/0/15**；near-prod gate `t114-paper-implementation-near-prod-runtime-gate-1783814902610` **passed**；双包 tsc 零错。

### 2026-07-11 S5 首评（gs-001-lora run 003，L7 usage-fit 基线；AI 代评审，人工复核可覆盖）
- 四维：候选质量 **4.7**、批判有效性 **5.0**、证据可追溯 **4.8**、约束遵守 **5.0**（评分详情与逐节点表：run 目录 `rubric-scored.md`）。
- 核心判断：语义产出显著高于 v1 验收线；**链未走完是治理在工作**——skeptic 对薄选题包的 revise 处置四条批判逐条命中真实缺口（预算矩阵/指标预承诺/基线控制/基线选择依赖），RF-001 在提案正文不可见时拒绝装懂是模范 fail-closed。route 三候选与 ground truth 路线空间几乎完全对齐（含主动尊重早期检查义务的分阶段路线与对应论文 §7 的机制诊断路线）。
- 行动项：gs-001 **v2 选题包**按 skeptic 修订后重跑（预期 lane A 完链+probe 物化）；evolution InvalidRequestError/run_mode 映射/提案正文穿引 → **S2**；skeptic blocked 态 repair_suggestions 完备性 → S3。
- 首跑证据：run `gs001-lora-live-003`（8 provider 调用），W4 回流+waiting_review 停驻+受理桥 live 物化全部真实路径成立。

### 2026-07-11 修复轮二审收尾（R1-R10，coordinator 语义定稿）
- 对修复轮 diff（41db6dcc..HEAD）的 code-review 发现 10 项全部收掉：**R1** budget_exhausted 无 raise 的 re_advance 改 409 于 resolve 之前（+no-op 带 overrides→400，不再静默丢）；**R2** raise 应用改取锁后 max（交错不可缩预算）+ `budget_raise_events` 审计事件（含被吸收的 raise）；**R3** dedup_key 只收 trusted 码/outcome 哨兵（LLM 措辞不再铸新队列项，retry_budget 真正可触发）；**R4** 可信性规则补零调用 blocked final（确定性预检产出入 trusted——真 tier-budget 恢复 budget_exhausted+loop_budget_review 语义，D2 前保留码注释登记）；**R5** persistStep 前 holder fence + 持久化失败 best-effort 释放自身 lease（残余双执行窗口关死、输家不再困 run）；**R6** 崩溃测试包装器转发 options（fence 真被测）；**R7** CAS null 二义消除（终态竞态报 terminal 而非 CONCURRENT_ADVANCE）；**R8** 双实现 404/409 对齐 + 一致性测试；**R9** step 投影 runtime_artifact_id 与 hash 同门（admitted 才置值）+ prisma round-trip/GET 读回断言；**R10** 终态集合入契约单源（四处字面量删除）、白名单派生基表、withBumpedLease 统一时钟、consumed 单径化（steps 唯一事实源）、集成测试 PROJECT_ID 进程唯一 + in-memory 全表无泄漏断言恢复。
- 验证：coordinator unit 25/25、prisma coordinator repo 4/4、集成 36/0/16、l5 52/52、双包 tsc 零错；全量 runtime-stress run `t114-paper-implementation-runtime-stress-1783765586663` **passed**；prisma smoke 复跑 **37/0/15**。

### 2026-07-11 S1 复审修复 + 迁移 + 全门收口（S1 闭合）
- code-review（506a6073..HEAD，8 角度 + 逐条验证）10 发现全处置：**F1** 无候选步改落 blocked（回流可达，run 级正反测试）；**F2** 终态收窄 completed|failed + advance/resolve 支持 `raise_budget_envelope` 只增提额（兑现 D1"提额后 re-advance"）+ resolve 后 advance 失败降级为 `coordinator_advance_error` 响应字段（不再掩盖已生效 resolve）；**F3** lease TTL 600s + slot 前心跳 + updateCoordinatorRun 带 holder fence（双执行/lost update 封死）；**F4** step 契约加 `runtime_artifact_id`，投影→受理桥缝合封口测试（真实 createFeasibilityProbe 走通+血缘回填，hash 一致性核实 admitted_artifact_hash===final_artifact_hash）；**F5** blocker 分类/终态只信任 coordinator 自产 code（LLM 输出不能再驱动 budget_exhausted/trace_repair）；**F6** advance 开头以 steps 重建 consumed（崩溃欠计封死）；**F7** portfolio 混合决策激活项无条件入 target 集；**F8** lease CAS 拒终态 + payload 写带 holder 条件。发现 #9/#10（echo 高度/复制簇）按既定判断移交 S2。
- 修复轮测试：coordinator unit 21/21（+6 新恢复路径用例）、prisma coordinator repo unit 2/2（新）、motive-board 16/16、integration 52（36 pass/16 env-skip）、必检 +2（F1 回流可达 / F4 缝合封口）。
- **迁移 `20260711100000` 已 apply**（coordinator 两表 + 全部 S1 列，pg_tables 确认）；prisma smoke 首跑 4 失败为**测试隔离问题**（持久化下队列行跨 run 累积、fixture 假设全表恰 1 条）——修为按 source_coordinator_run_ref 过滤（断言强度不变），复跑 **37 pass / 0 fail / 15 env-skip**。
- 全量 runtime-stress：run `t114-paper-implementation-runtime-stress-1783750367028` **passed**；**near-prod gate（L6，live provider + Prisma）：run `t114-paper-implementation-near-prod-runtime-gate-1783751668927` passed**。双包 tsc 零错。S1 全部验收项闭合。

### 2026-07-11 S1 收口（W1-W5 全落地）
- W1 受理桥：45/45 + L5 `acceptance_bridge_lineage_drift_rejected`；W2 链内回查：route/cycle/feasibility 三 slot 全量回查 + blocked 冒充封死，L5 +4；W3 coordinator：contracts 6/6 + unit 12/12（故障注入三件套/选择复算/零权威依赖面）+ routes integration，L5 +5；W5 确认消费：consume-before-write 语义 + target 覆盖 + 5 处校验副本收敛，13 文件绿，L5 +2（另修 S0 遗留 T-101 夹具红，pristine HEAD 验证非回归）；W4 队列回流：coordinator blocked 入队（枚举分类表）+ resolve re_advance + retry/cooldown 真语义（Prisma reopen retryCount 覆盖 bug 根治），14/14+13/13+2/2+集成 49（33 pass/16 env-skip），L5 +2。
- 合并态验证：双包 tsc 零错；全量 runtime-stress ×3 全 passed（W1+W2 后 `t114-...-1783727795027`、W3+W5 后 `t114-...-1783731130335`、W4 收口 `t114-...-1783733835126`），本切片新增必检 14 条全部命中。
- **待办**：统一迁移 `20260711100000_add_paper_implementation_s1_coordinator_and_lineage`（coordinator 两表 + 6 模型血缘列 + 确认消费列 + 队列关联列，纯加性）**已写未 apply，待用户审批**；apply 后补 prisma smoke（L3）与 near-prod gate（L6，需 provider keys）；S5 第一条 golden scenario 素材构造随后。

### 2026-07-10 S0 复审修复收口（code-review 10 发现 → 6 修复 + 3 移交 + 1 随迁移关闭）
- 修复项：①WO admit / dossier ready 的 gate result 增加 **trace_manifest_id 绑定断言**（挪用他 manifest 的 passed gate 被拒）；②motive evolution 门改为 `请求声明 || (structural_evolution && 源 motive control.human_confirmation_required_for_major_change)` 强制（不再自愿制），落库的 human_confirmation_required 反映有效值；③admitCoreMotiveVersion 增加 primary 晋升（非自举）确认门（与 apply 路径对齐）；④两处新 prisma create 改 catch P2002 → 409（消 TOCTOU 500 + 对齐 mapDuplicate 惯例）；⑤可空 Json 列改写 Prisma.DbNull；⑥`paper-implementation-v1-runnable-replay.mjs` 修复（15 处构造依赖 + 两处硬编码 gate id 改走真实 evaluate 流程，新步骤 15a/21a）——**replay 全绿**（46 步 ok + BP0-01..10 passed，artifact `t109-s0-fix-check`）。
- 新增负例测试 3 个（WO gate 异 manifest 拒、dossier gate 异 manifest 拒、primary 变更无 ref + control 标志强制确认）；受影响套件全绿（bridge 15/15、motive-board 12/12、result-claim 12/12）。
- **迁移已 apply**：`20260710120000_add_paper_implementation_s0_governance_tables`（两表落 dev 库，pg_tables 确认）；**L3 prisma smoke 补齐**：30 pass / 0 fail / 15 skipped（live 金丝雀 env 门控），exit 0。
- 复跑全量 runtime-stress：run id `t114-paper-implementation-runtime-stress-1783696518823`，**status=passed** 9/9 步。`tsc --noEmit` 0 错误。
- 移交项已登记 `01-plan.md` §S0 复审移交项：确认记录 target 绑定+消费语义与校验器收敛（S1）、桌面确认入口与 blocker 推导（S4）、13×测试夹具 helper（S1 顺手）。

### 2026-07-10 S0 收口（治理与正确性补洞）
- `tsc --noEmit`：0 错误。
- 逐文件套件（node --test，全绿）：human-confirmation schema 4/4、human-confirmation service 3/3、motive-board 11/11（含 primary 替换/evolution 确认解析负例）、result-claim-dossier 11/11（含 strong claim 伪造 ref/错 scope/ready dossier 悬空 gate 负例）、workorder-bridge 14/14（含 admit gate 解析负例）、trace-kernel 11/11（含 gate result 落库可解析）、live-adapter 11/11、routes integration 4/4（改走真流程：trace-gates/evaluate 产出真实 gate id 再 admit/ready）、11 个 runtime unit + l5 52/52 + domain-gate 6/6（S0-3 子代理逐文件验证）。
- 全量 runtime-stress：run id `t114-paper-implementation-runtime-stress-1783691982563`，**status=passed**，9/9 步全绿；本次新注册 14 条必检用例（11×`*_inactive_project_rejected_before_orchestrator`、1×`trace_integrity_profile_and_model_option_drift_rejected_before_gateway`、2×deterministic lane：`work_order_admission_gate_result_must_resolve`、`trace_gate_result_persisted_and_resolvable`）全部命中匹配。
- governance sync：ok。`git diff --check`：干净。
- **未收项**：Prisma 迁移（两张新表 `PaperImplementationHumanConfirmationRecord`/`PaperImplementationTraceGateResult`）待用户审批后 apply（`prisma generate` 与 db-ssot sync-to-context 已跑，L3 Prisma smoke 在迁移后补）；S0-5 待 N8 裁定；near-prod gate（L6）按 D7 属里程碑级，建议与 S1 收口一起跑。

| Date | Command | Status | Summary |
|---|---|---|---|
| 2026-06-11 | `pnpm run paper-implementation:runtime-stress` | passed | 包创建基线：T-114 闭环复跑，run id `t114-paper-implementation-runtime-stress-1781132291471`，290 tests / 226 passed / 64 env-gated skips / 0 failed，9/9 steps，95/95 必检用例通过。 |
| 2026-06-11 | `pnpm run paper-implementation:near-prod-runtime-gate` | passed | 包创建基线：near-prod gate run id `t114-paper-implementation-near-prod-runtime-gate-1781132560502`，live openai 13 次 provider 调用与 debate 拓扑一致，Prisma 证据、exactly-once 并发 materialization、replay 幂等、drift `VERSION_CONFLICT`、no-dual-track 与 redaction 护栏全 true。 |
| 2026-07-03 | backend tsc + research-lifecycle unit + full backend suite | passed | research-lifecycle id 生成 max+1 修复（外部会话留痕，9fb04a26 同类）：unit 10/10；full backend 1639 tests / 1604 passed / 0 failed / 35 skipped（基线 1632/1597/0/35 + 本修复 3 测 + 41ac51b3 W-11 4 测，只增不减）；backend tsc 干净。注意：全量须单会话独占运行——双会话并发跑套件会因 ts-node 子进程资源互踩产生文件级崩溃假红（本次取证 43/4 个文件级 not ok 均为此因，静置复跑全绿）。 |
| 2026-07-03 | 并发双起 `pnpm test`（apps/backend，错开 8s）+ backend tsc | passed | 套件跨进程互斥锁落地验证（run-node-tests.mjs，实现见 03 同日工具链留痕）：B 检测到 A（pid 50340）持锁即打印 "Another backend suite run is in progress — waiting..." 并 16s 心跳等待 286s，A 全绿 1639/1604/0/35 释放后 B 自动接锁复跑同样全绿 1639/1604/0/35；两份日志 0 个 `not ok`——上行取证的并发假红（43/4 文件级崩溃、总数骤降）在互斥下不再复现，"单会话独占"自此由 runner 强制而非人记。stale 锁（死 pid）启动时/等待中两路接管、SIGTERM 释放且 `child.kill` 不留孤儿舰队、逃生口三项单独手验通过；backend tsc 干净。 |
| 2026-07-04 | shared typecheck+test + backend tsc + desktop typecheck + full backend suite | passed | snapshot id 校验三处 `\d{4}`→`\d{4,}` 纯放宽（27ad677b）：shared 269/269（含新 paper-project-contracts.schema.test 两测——isSnapshotId 4/5 位接受+3 位拒绝、writing-package schema SP-10000 过/SP-999 400）；backend tsc 与 desktop typecheck 干净；full backend 1639/1604/0/35。 |
| 2026-07-04 | runtime-stress（预植活锁全流程）+ full backend suite（经重构 runner） | passed | 套件锁共享模块化验证：预植他人活锁下 runtime-stress 单文件 L5 步照跑（不取锁）、13 文件步正确打印等待，撤锁后接锁恰 1 次并全程绿 290 tests / 226 passed / 64 env-gated skips / 0 failed（与 T-114 基线一致，后续多文件步直取无等待）；full backend 经 lib 重构 runner 1639/1604/0/35、锁正常释放；v1c-production-depth 同形集成以 node --check + 同构行为证明收口（全跑含 provider 门控）。四脚本 node --check 全过。 |
| 2026-07-04 | 锁加固实测 5 场景 + full backend suite（经加固 runner） | passed | 复审修复验证（修复形态见 03 同日条目）：①stale(死 pid)接管 + 心跳 mtime 推进（15s tick 实测 +15s）；②组信号不变量——TERM 后 12 个舰队进程 200ms 内全灭且"锁消失时刻无任何舰队进程存活"逐 200ms 采样零违例（此场景实测揪出协调器瞬死孤儿化 worker，随即升级 detached+组信号）；③年龄兜底接管（pid=1 存活 + mtime 超 5min → 正确判 stale）；④release 外来内容锁不删（foreign payload 存活）；⑤双 runner 排队/增强等待消息（ps -p 提示）/TERM 交接（B 接锁 pid 正确）/锁+claim 零泄漏。full backend 经加固 runner 全绿 1639 tests / 1604 passed / 0 failed / 35 skipped，锁正常释放。claim 串行化接管的微秒级双 waiter 竞争无法确定性摆拍，以构造证明收口（见 03）。flow-runner backend-test 预算 300s→900s 同轮生效。 |
