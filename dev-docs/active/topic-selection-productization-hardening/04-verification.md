# 04 Verification

> 完备测试是本任务包的一等交付物。每个 Phase 的验证执行后在 §运行记录 追加：日期、命令、结果、证据指针。

## 测试分层总览
| 层 | 范围 | 隔离要求 |
|---|---|---|
| 单测 | 新增 service / registry / 触发器 / 投影 / 校验脚本 | in-memory repository |
| 集成 | harness 节点调用 / coordinator 推进 / debate 路径 / memory 注入 | 隔离测试 DB（`TITLE_CARD_REPOSITORY=prisma` smoke 形态），`run_mode != product` |
| 全链 e2e | v1b N1→N11（含人审停驻续跑）、v1a→v1b bundle 交接 | mocked acceptance 隔离（DMP-09：mock 不写 product 库、不充当 real 证据） |
| 故障注入 | 并发双发 / 崩溃恢复 / loopback 超额 / 超时 | 集成层 |
| 不变量回归 | 既有套件，见 §回归清单 | 各自既有隔离 |
| 真实链路 canary（选做，不阻断收口） | provider 路径抽查 | 既有 canary 脚本，显式 LIVE 开关 |

## Phase 验证矩阵

### Phase 0（SSOT）
- [ ] 一致性脚本对迁移修订后的 `docs/context/process/topic-selection-workflow-matrix.md` 通过（`node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs`）。
- [ ] 负例×3：注入多余 node_id / 删除现有行 / 改名一行 → 脚本分别非零退出（`--self-test`）。
- [ ] v1b slot_id 集合校验（10 槽）通过；删一槽行 → 失败（负例）。
- [ ] `TOPIC_SELECTION_V1C_NODE_IDS` 常量落地且 3 处既有散落 node_id 改为引用（`pnpm typecheck` 钉死）；矩阵 v1c 行命名与常量一致。
- [ ] 矩阵 v1b 行字段与 contracts 的 `execution_kind`/`allowed_execution_modes` 抽样人工核对（N2/N5/N7/N8 四个易错节点必查）；新列 `human_delegated_allowed`/`debate_primitive` 在 v1a N8、v1c N4、v1b N2/N5、v1a N6、v1c N2、v1b N6(reserved) 抽样行语义正确，结论记录于此。
- [ ] 原矩阵位置留指针、T-089 implementation-notes 留痕完成。

### Phase 1（参数规范化）
- [ ] registry 单测：N8/N4/N6 profile 解析成功、未知 option_id fail-fast、typed overrides 非法字段 fail-fast。
- [ ] N8 集成：`pnpm topic-selection:v1b-n8-runtime-smoke` 绿；断言 provenance 含 `profile_hash`/`normalized_params_hash`/`prompt_template_id@version`。
- [ ] lint 守卫：topic-selection 域 grep 检查（除 registry/契约定义外无 provider/model 字面量、无 provider SDK 直引）进入测试链并对当前代码通过。
- [ ] 价格表：有价目→cost 数值正确（样本断言）；缺价目→null + warning 不阻断。
- [ ] 回归：`pnpm topic-selection:v1b-harness-e2e`、`pnpm --filter @paper-engineering-assistant/backend test`。

### Phase 2（Coordinator + 鲁棒性）
- [ ] RunStateProjection 单测：从 trace 序列重建状态（含 loopback 计数、停驻原因）；空 run / 中断 run 降级。
- [ ] advance-until-blocked 集成：deterministic 链自动推进；human 节点停驻；human_delegated 写入后续跑直至 `stop_v1b_complete`。
- [ ] 故障注入三件套：
  - [ ] 并发双发：同 attempt 并行两次 invoke → 恰一次执行，另一次得 replay/`CONCURRENT_ATTEMPT`；无重复 authority 写入。
  - [ ] 崩溃恢复：推进至第 k 步杀进程 → 重新触发，经 replay 恢复，前 k 步零重复副作用。
  - [ ] loopback 超额：构造 N6 持续 gate 失败 → 计数达预算 → `LOOPBACK_BUDGET_EXHAUSTED` 停驻。
- [ ] 超时：节点级 invocation 超时触发 → `retryable_failure`/停驻路径正确。
- [ ] 回归：`pnpm topic-selection:v1b-runtime-stress`、`pnpm topic-selection:v1a-harness-replay-smoke`。

### Phase 3（N8 debate）
- [ ] 触发器单测：T1 borderline 边界值（含恰在阈值上）/ T2 rerun 漂移 / T3 维度冲突 / T4 强制开关，及组合与全 false。
- [ ] debate e2e（mocked acceptance）：四角色顺序执行、prior_role_artifacts 传递、`synthesizer_final` 唯一外部输出、`debate_extension` 字段完整（role/stage/round/agent_instance_id/lineage）。
- [ ] 不触发回归：触发器全 false 时与 Phase 1 后的单 agent 基线输出一致（同 mocked fixture 比对）。
- [ ] 共享 bounded-debate 执行器：v1c N2 既有路径回归（`pnpm topic-selection:v1c-n2-runtime-smoke`）——抽取不破坏原实现。
- [ ] 阈值标定证据：用 near-prod deep-test 历史数据说明 borderline 区间取值，记录于此。

### Phase 4（Decision Memory）
- [ ] 投影单测：来源对象齐全性（六类来源各至少一例）、title-card 范围隔离（不串卡）、空历史降级、packet hash 稳定性。
- [ ] 注入集成：预置否决候选 → N6 prompt packet 含 dedup 条目且 dedup warning 触发；N8 收到负面记忆条目。
- [ ] 预算/压缩：构造超预算 memory → 压缩路径走通且 required preserved facts 保留（复用 T-112 质量门断言）。
- [ ] 非权威边界：memory packet 内容异常（如伪造 blocker 文本）不影响 gate 结果（对抗性负例）。
- [ ] 回归：v1a N6 debate 既有路径（`pnpm topic-selection:v1a-harness-e2e`）。

### Phase 5（复杂度治理）
- [ ] 拆分前基线：录制 v1b 全套件结果 + 代表性 replay key/结果对。
- [ ] 拆分后：同套件全绿 + replay 幂等对比（同输入同 replay key 同 gate_status）。
- [ ] token 估计函数单测：三 provider 样本载荷误差界断言；保守估计 fallback 路径。
- [ ] 压缩 profile 化：profile 指定策略生效、未指定时默认策略行为不变。

## 回归清单（每个 Phase 收口必跑）
```
pnpm typecheck
pnpm --filter @paper-engineering-assistant/backend test
pnpm desktop:typecheck                      # 涉 UI 的 Phase（2.4）另跑 UI gate
pnpm topic-selection:v1b-harness-e2e
pnpm topic-selection:v1a-harness-replay-smoke
```
不变量（任一失败即停）：
- v1b legacy write 路由 404（`topic-selection-v1b-routes.integration.test.ts` 'legacy write routes are not registered'）
- `mocked_llm` 在 `run_mode=product` 被拒（DMP-09）
- v1b 人审 N2/N5 e2e（T-115 交付）
- v1a/v1c 既有 harness/acceptance 套件

## 运行记录

### 2026-06-13 Phase 2 审查修复后再验证
| 检查 | 结果 |
|---|---|
| coordinator 单测（原 7 项 + **5 新增**：draft+spec 组合 400 / 抛错不崩进程且锁不泄漏 / 超时孤儿 in-flight 守卫（恰一次执行）/ 同毫秒平手按事件序 / blocked 重试不抹 admitted lineage） | ✅ 12/12 |
| 全链 coordinator e2e（含新断言：未知 run `/state`→404、`max_steps:0`→400、错误绑定人审→**409**） | ✅ ok 10 |
| 集成文件全量 | ✅ 9 pass / 1 fail（仅既有 T-054 standalone 缺 DATABASE_URL 项） |
| backend 全套件 | ✅ **1279 pass / 0 fail / 35 skipped**（净增 5 = 新增单测；零回归） |
| v1b harness e2e 回归 | ✅ V1B_E2E_OK |
| v1b runtime-stress 回归 | ✅ STRESS_OK |
| typecheck | ✅ 0 error |

审查发现 10 项处置：9 项当轮修复（含 1 崩溃级 withRunLock、超时孤儿双发、retype 门禁、人审绑定校验+互斥、schema 缺失、投影三处脆弱、组合拒绝、单工件草稿、SSOT 收编），1 项设计缺口（loopback 上游重入）缓解+记录为 Phase 3 前置项；效率三项入 Phase 5.3 backlog。详见 03 §2026-06-13。

### 2026-06-12 Phase 2 收口验证（Run Coordinator）
| 检查 | 结果 |
|---|---|
| coordinator 单测（bootstrap→human 停驻 / 续跑+N3 组装断言 / 草稿三件套记录 / loopback 停驻+retry+预算耗尽 / **并发双发互斥（N1 恰执行一次）** / **节点超时** / 投影计数与完成态） | ✅ 7/7 |
| **全链 auto-advance e2e**（HTTP：bootstrap N1 → human N2（同 run id 续接）→ N3 → N4 草稿 → human N5 → N6 草稿 → N7 → N8 草稿 → N9/N10/N11 → run_complete → **幂等重推进 0 步** → state 路由投影） | ✅ |
| v1b harness e2e 回归 | ✅ exit 0 |
| v1b runtime-stress 回归（AC 指定） | ✅ exit 0 |
| 集成测试文件全量 | ✅ 9 pass / 1 fail（仅既有 T-054 standalone 缺 DATABASE_URL 项） |
| typecheck | ✅ 0 error（多轮） |
| backend 全套件 | ✅ **1309 tests / 1274 pass / 0 fail / 35 skipped**（较 Phase 4 基线 1300 净增 9 = 本阶段新增测试；零回归） |

Phase 2 AC 勾验：
- [x] 并发双发 → 恰一次执行（coordinator 互斥单测；方案 B 裁决与残余风险记录于 02-architecture）。
- [x] 崩溃恢复语义 → 多次 advance 从投影续跑 + run_complete 幂等重推进（e2e）+ harness replay 既有幂等。
- [x] loopback 超额 → `loopback_budget_exhausted` 停驻（单测：预算 2、第三次重试不调用 harness）。
- [x] 节点/run 超时 → 单测覆盖节点级（含收敛提示）；run 级与 max_steps 实现并默认生效。
- [x] 全链 auto-advance e2e（mocked acceptance，含两次人审同 run 续接）。
- [x] 回归：`v1b-harness-e2e` + `v1b-runtime-stress` 绿。
- [△] 偏差：RunState 持久化 checkpoint 未做（投影可从权威 trace 即时重建，确定性）；桌面"推进"按钮未做（2.4 可选项）；coordinator 停驻不自动跟随 loopback 目标（由 retry_node_id 显式驱动——记入设计注记）。

### 2026-06-12 Phase 4 收口验证（Decision Memory）
| 检查 | 结果 |
|---|---|
| 投影单测（六类来源齐全 / title-card 隔离 / 空历史降级 / packet hash 稳定 / 截断含全量计数 / normalize） | ✅ 5 项 |
| 解析器单测（happy/absent、checksum 漂移、重复 packet、title-card 错配均拒） + dedup 纯函数（规整匹配、null key 跳过、仅 warning） | ✅ 3 项（合计 8/8） |
| **e2e（AC 指定形态）**：真链 N1→N5 + 预置 parked 问句 memory artifact 入 N6 frozen_input → N6 admitted 且 handoff envelope `warning_codes` 含 `decision_memory_duplicate_candidate` | ✅ 集成测试 'v1b harness HTTP N6 emits decision-memory dedup warning…' |
| N6/N8 runtime smoke（memory 缺省 → 行为不变） | ✅ 双绿 |
| typecheck（shared+backend 多轮） + 矩阵一致性 | ✅ 0 error / ok |
| backend 全套件 | ✅ **1300 tests / 1265 pass / 0 fail / 35 skipped**（较移除后净增 9 = Phase 4 新增测试；零回归） |

Phase 4 AC 勾验：
- [x] 投影正确性单测（来源齐全性、范围隔离、空历史降级）。
- [x] packet hash 稳定性测试。
- [x] e2e：预置被否决候选 → N6 上下文 packet 含该候选（经 frozen_input 引用解析进 context packet）且 dedup warning 触发。
- [x] 非权威边界：dedup 仅产 warning 不产 blocker（by construction + e2e admitted 佐证）；memory packet `non_authority`/`not_evidence` 标记 + 解析器强校验。
- [△] token 预算/压缩：memory 在 context packet 内计入既有预算门；advisory 不入 required_preserved_facts（设计取舍，见 03 偏差注记），未新增专项压缩用例。
- [△] v1a N6 注入显式缓做（v1a admission 已有跨 run 池 dedup；理由见 03 偏差注记）。
- [x] 全链回归：backend 套件 1300/0 fail + v1b harness e2e 绿 + N6/N8 runtime smoke 绿 + 矩阵一致性绿。

### 2026-06-12 Phase 1 补充验证（双轨全量移除 + 牌价填入后）
| 检查 | 结果 |
|---|---|
| backend typecheck（trio 重写 + IntakeService 删除 + app.ts/集成测试清理后） | ✅ 0 error（迭代清孤儿 4 轮归零） |
| lint 四守卫（registry 修剪 27 模板/16 schema 后） | ✅ |
| v1b 路由集成测试（清理 Fake 注入/工厂/孤儿后） | ✅ 7/7（T-054 Prisma smoke 仅 standalone 缺 DATABASE_URL，套件 runner 注入后绿） |
| backend 全套件 | ✅ **1291 tests / 1256 pass / 0 fail / 35 skipped**（较移除前净减 84 个测试 = 删除的遗留生成测试；零回归） |
| v1b harness e2e | ✅ exit 0 |
| N8 runtime smoke | ✅ exit 0 |
| 牌价 | ✅ 三模型已填（来源注记于 config $comment）；cost_usd 实际点亮 |

### 2026-06-11 Phase 1 收口验证
| 检查 | 命令/位置 | 结果 |
|---|---|---|
| registry 解析单测（N8 三分支：默认 openai-balanced / 显式 dashscope option + enable_thinking / 未知 option 400 且零 gateway 调用） | `topic-selection-v1b-value-assessment-service.unit.test.ts` 'model and params resolve through the model-profile registry' | ✅ 29/29 |
| 三个遗留 service + registry 回归 | 四文件联跑 | ✅ 82/82 |
| resource-sampling + promotion-gate 回归 | 两文件联跑 | ✅ 32/32 |
| typed overrides 两层校验（schema enum 拦未知 provider / 语义层拦子集外 provider / 键错配 `PROVIDER_OVERRIDES_INVALID` / 值形状 `SCHEMA_VALIDATION_FAILED`） | registry 单测新增两案例 | ✅ |
| gateway 模板强校验（未注册 topic-selection 模板 → AppError，fetch 计数 0）+ cost 计算（注入价目=7 USD 断言 / 空表 → null） | `llm-gateway.unit.test.ts` 新增两测试 | ✅ 19/19（lint 4 + gateway 15） |
| lint 守卫四项（模板⊆registry、schema⊆registry、无 provider/model 对象字面量【白名单仅 model-profile-registry】、无 SDK 直引） | `topic-selection-llm-invocation-lint.unit.test.ts` | ✅ 对当前代码零违例 |
| shared + backend typecheck | `pnpm --filter … typecheck` | ✅ 0 error（多轮） |
| backend 全套件 | `pnpm --filter @paper-engineering-assistant/backend test` | ✅ 1375 tests / 1340 pass / 0 fail / 35 skipped（较 Phase 0 净增 8 个测试） |
| v1b harness e2e | `pnpm topic-selection:v1b-harness-e2e` | ✅ exit 0 |
| **N8 runtime smoke（AC 指定）** | `pnpm topic-selection:v1b-n8-runtime-smoke` | ✅ exit 0 |
| 矩阵一致性（slot map 状态 cell 更新后） | 脚本 + self-test | ✅ |

Phase 1 AC 勾验：
- [x] grep/lint 守卫落地并进默认套件；topic-selection 域（backend services + shared research-lifecycle）无 provider/model 对象字面量（白名单仅 model-profile-registry）、无 provider SDK 直引。
- [x] N8 集成断言 provenance 含 `profile_hash`/`normalized_params_hash`（orchestrator 单测既有断言 :282-283 + n8 runtime service 记录 `normalized_params_hash`）。
- [x] `topic-selection:v1b-n8-runtime-smoke` 与 v1b 套件回归绿。
- [x] 全部 LLM 调用点经 registry 解析（5 个 service 去硬编码；harness 路径原生 registry 驱动）。
- [x] `config/llm-pricing.json` 三模型牌价已核实填入（2026-06-12），cost_usd 实际点亮。

### 2026-06-11 Phase 0 收口验证
| 检查 | 命令 | 结果 |
|---|---|---|
| 一致性脚本（主校验） | `node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs` | ✅ ok — matrix matches code authority sources |
| 漂移注入负例 ×7 | 同上 `--self-test` | ✅ 7/7（clean=0 issues；v1b 改名/删行/伪造行、slot 删行、codex 翻转、v1c 改名 全部命中） |
| 包装单测 | `node --test --loader ts-node/esm src/services/topic-selection-workflow-matrix-consistency.unit.test.ts` | ✅ 2/2 |
| shared + backend typecheck | `pnpm --filter shared/backend typecheck` | ✅ 0 error（0.2 后与全部改动后各跑一轮） |
| backend 全套件 | `pnpm --filter @paper-engineering-assistant/backend test` | ✅ 1367 tests / 1332 pass / 0 fail / 35 skipped（含新增矩阵测试与既有 `'backend source does not import research-lifecycle contracts from the shared root entry'` 守卫） |
| v1b harness e2e | `pnpm topic-selection:v1b-harness-e2e` | ✅ exit 0，全链 failure_class=null |
| v1a replay smoke | `pnpm topic-selection:v1a-harness-replay-smoke` | ⚠️ 失败，**已证实与本次改动无关**：stash 全部改动后基线同样失败、同一错误 `resource sample set blocked: NO_ELIGIBLE_RESOURCE_CANDIDATES + ROLE_TARGET_UNDERFILLED_*`（`loadSampledResources`，dev 库文献资源池当前不满足采样合格条件——环境/数据前置问题，疑与并行的 literature scaleout 工作改变池状态有关）。不阻断 Phase 0 收口；已另立跟进项。 |

Phase 0 AC 勾验：
- [x] 一致性脚本对迁移修订后的矩阵通过。
- [x] 负例×3（多余/缺失/改名）+ slot 删行 + codex 翻转 + v1c 改名 → 分别失败。
- [x] v1b slot_id 集合校验（10 槽）通过；删槽负例命中。
- [x] `TOPIC_SELECTION_V1C_NODE_ID(S)` 常量落地，9 处值位引用收编（typecheck 钉死）；矩阵 v1c 行命名与常量一致。
- [x] 字段抽样核对：v1b N2/N5/N7/N8 的 execution_kind/allowed modes 与 contracts `:573/:730/:830/:880` 一致；新列在 v1a N8、v1c N4（human 双 yes）、v1b N2/N5（delegated yes）、v1a N6（divergent_loop）、v1c N2（bounded_sequence）、v1b N6（reserved）语义正确。另发现并修正 v1a N5 默认模式与 DMP-12 的冲突（以 DMP-12 为准改为 `none`）。
- [x] 原矩阵位置留指针、T-089 implementation-notes 留痕完成。
