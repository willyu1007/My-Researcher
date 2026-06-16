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
- [x] 阈值标定证据（DP-3.3，2026-06-15）：挖掘判定**真实 N8 分数分布不可用**（全 `.ai/.tmp` 仅单一 fixture total 83，详见 03 §2026-06-15 DP-3.3 + 07-spec），故**维持 provisional、不改阈值、保留 tripwire**；阈值带内部自洽（8 例触发器边界单测背书），翻 false 才属被禁猜测。所需 provider_llm 标定语料采集已列 03 计划。见下 §2026-06-15 DP-3.3 运行记录。

### Phase 4（Decision Memory）
- [ ] 投影单测：来源对象齐全性（六类来源各至少一例）、title-card 范围隔离（不串卡）、空历史降级、packet hash 稳定性。
- [ ] 注入集成：预置否决候选 → N6 prompt packet 含 dedup 条目且 dedup warning 触发；N8 收到负面记忆条目。
- [ ] 预算/压缩：构造超预算 memory → 压缩路径走通且 required preserved facts 保留（复用 T-112 质量门断言）。
- [ ] 非权威边界：memory packet 内容异常（如伪造 blocker 文本）不影响 gate 结果（对抗性负例）。
- [ ] 回归：v1a N6 debate 既有路径（`pnpm topic-selection:v1a-harness-e2e`）。

### Phase 5（复杂度治理）
- [ ] 拆分前基线：录制 v1b 全套件结果 + 代表性 replay key/结果对。
- [ ] 拆分后：同套件全绿 + replay 幂等对比（同输入同 replay key 同 gate_status）。
- [x] token 估计函数单测（F-10）：三 provider 校准收紧 CJK + deepseek 最省、unknown/Latin-only byte-identical、校准表金值钉死、newline 每行 1 token。real-tokenizer 误差界由 `evidence/f10-token-calibration/measure.py` 800-输入验证背书（见 §2026-06-15 F-10 运行记录）。
- [x] 压缩 profile 化：profile 指定策略生效、未指定时默认策略行为不变（Phase 5.2 partial，已收）。

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

### 2026-06-15 F-10 per-provider token 校准收口验证
| 检查 | 命令 | 结果 |
|---|---|---|
| 真实分词器实测 + 1200-输入验证 | `python3 dev-docs/active/topic-selection-productization-hardening/evidence/f10-token-calibration/measure.py` | ✅ default byte-identity 断言通过；CJK 实测均值 0.842/0.730/0.669；病态 newline-dense CJK safe；1200 输入（12 seed，33% newline-heavy + 25% CJK-heavy）×1.25 **0/1200 低估**，最差 est/actual ≈1.04（o200k 1.075 / qwen 1.044 / deepseek 1.054；exact 随 doc 派生语料漂移，0 低估为不变量） |
| backend typecheck | `pnpm --filter @paper-engineering-assistant/backend typecheck` | ✅ 0 error |
| estimator + gate 单测 | `node --test ... topic-selection-conservative-token-estimator-service.unit.test.ts topic-selection-token-budget-gate-service.unit.test.ts` | ✅ 14/14（含 provider 收紧 CJK、unknown/Latin byte-identical、校准表金值、newline 每行 1 token、gate 透传 provider_id） |
| backend 全套件 | `pnpm --filter @paper-engineering-assistant/backend test` | ✅ 1349 tests / 1314 pass / 0 fail / 35 skipped（skip 为既有 env-gated；改动后重跑确认 newline 修复无回归） |
| 对抗性复核 | 4-lens workflow + skeptic 复核（14 agent） | ✅ 1 真回归（newline-dense CJK 低估）当场修 + 重验；2 误报核证安全；余既有/范围外限制已记 03 §F-10 |

不变量复核：default / unknown provider 估计 byte-identical（估计不入 prompt-packet/admission/replay 哈希；replay 返回存储结果）；debate byte-stability 单测绿（loop_transcript / role_artifact / role_prompt_packet 哈希不含估计）。

### 2026-06-15 DP-3.3 N8 debate 阈值标定收口验证（数据不可用 → 维持 provisional）
| 检查 | 命令 | 结果 |
|---|---|---|
| N8 触发器单测（T1/T3 边界，含 provisional 阈值副本） | `node --test ... topic-selection-v1b-n8-debate-triggers.unit.test.ts` | ✅ 8/8（83/0.82/spread12 不触发；T1 band 含/斥端点；conf 地板；T3 spread/单维 floor 均门控 total≥60；T1+T3 共触发） |
| coordinator feedback recipe 单测 | `node --test ... topic-selection-v1b-run-coordinator-service.unit.test.ts` | ✅ 15/15 |
| coordinator 驱动全 debate-loop 集成 | `node --test ... topic-selection-v1b-routes.integration.test.ts` | ✅ borderline T1 loopback→N7 feedback 重入（debate-admission 支撑）→复评 admitted_with_warnings；DB-free（InMemory repo）；同文件唯一 fail = 既有 T-054 Prisma-smoke 环境门（缺 `DATABASE_URL`），与本任务无关 |
| shared typecheck + 矩阵一致性 | `tsc --noEmit` / `node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs` | ✅ 0 error / ok（contract 仅 comment 改动，不动 node_id/slot_id 正则面、不动阈值常量与 `provisional` flag） |
| 对抗性自审（5-lens workflow + per-finding verify，13 agent） | — | ✅ 核心结论"真实分布不可用→维持 provisional"5 维独立复证、0 反驳；修 1 major（canary live-gateway 误述）+ 2 minor 文档精度（"36 行匹配"措辞、band 自洽框定）；详见 03 §2026-06-15 DP-3.3 |
| 标定路径勘察（understand-phase workflow，3 agent，代码核证） | — | ✅ 凭据齐备但发现更深阻塞：N8 prompt 只含 refs/hash+decision_memory（不内联体）；production N8 = `codex_assisted|mocked_llm`（runtime `:136`），provider_llm 仅 canary；纠正上版 provider_llm 跨 3-provider 计划（deepseek 未注册 N8 option）。内容可见性裁为 gap（D3 敏感，需与 T-088 联合决策）。document-only **不建代码**（无可运行数据源→过早 seam）；blocker+corpus schema+analysis spec 落 `evidence/dp33-n8-threshold-calibration/README.md`。零阈值改动、tripwire 保留 |

### 2026-06-15 DP-3.3 scaffold 构建验证（STEP-1 锁定 A + full scaffold；标定工具，不接产品）
| 检查 | 命令 | 结果 |
|---|---|---|
| 分析仪单测（纯函数，复用 production trigger fn） | `node --test ... topic-selection-v1b-n8-calibration-analysis.unit.test.ts` | ✅ 8/8（clean separation / 漏 borderline→leaky / 多余 debate→precision 降 / cross-misfire / 排除 blocked / insufficient-data / per-provider skew / 精确阈值敏感） |
| 物化器单测（过**真实** N8 门，mock executor 验证） | `node --test ... topic-selection-v1b-n8-calibration-materializer.unit.test.ts` | ✅ 5/5（valid 过真 lineage 门 + capture 读 draft 分数；3 负例 篡改 hash/错 node_id/丢 projection → `INVALID_PAYLOAD`） |
| 物化器 runner 单测（corpus→assessor→分析 端到端） | `node --test ... topic-selection-v1b-n8-calibration-runner.unit.test.ts` | ✅ 5/5（全 corpus→separating 裁决 + band 接线正确 / blocked 排除 / placeholder 拒收含真实模板 / 重复+畸形拒收） |
| 既有 N8 触发器单测（无回归） | `node --test ... topic-selection-v1b-n8-debate-triggers.unit.test.ts` | ✅ 8/8 |
| backend typecheck | `pnpm --filter @paper-engineering-assistant/backend exec tsc --noEmit` | ✅ 0 error |
| corpus 模板 JSON | `node -e require(corpus-template.json)` | ✅ 2 entries，全 `__placeholder:true`（runner loader 拒收防误标定） |
| backend 全套件（确认新增 6 文件零回归） | `pnpm --filter @paper-engineering-assistant/backend test` | ✅ 1367 tests / 1332 pass / 0 fail / 35 skipped（较 F-10 收口 +18 = analysis 8 + materializer 5 + runner 5；skip 为既有 env-gated；零改既有 production 代码、零回归） |
| mock-corpus 端到端演示（**仅验管线，非标定**） | 10-entry mock corpus（含 1 漏 borderline + 1 误触 clear_fail）过 `runN8Calibration` + mock assessor | ✅ 返 `leaky`（非 trivial separates）：TP4/FP1/FN1/TN4、precision/recall 0.80、正确点名 FP(`clear_fail_b_LEAK`)+FN(`borderline_c_LEAK`)+给可执行调参建议。演示脚本 throwaway 已删；常驻证据 = runner 单测（含拒收 placeholder 模板）。**mock 不能标定阈值**（分数+标签皆捏造→循环），仅证管线 |
不变量：scaffold 是纯工具——不接任何产品路由、不改 node policy、不改阈值常量、不动 `provisional` flag/tripwire；物化器**镜像**（非 import）D3 敏感的 projection builder，verify 跑真实 `generateDraftArtifact`(mocked) 作漂移守卫；runner loader 拒收 placeholder corpus。**STEP-1 决策：A（codex_assisted，无 harness 改动）；B 不推进。** 剩余仅 2 人/operator 门：标注 corpus + 跑独立 assessor。

### 2026-06-13 Phase 3 代码审查修复后验证（7 路审查 → 10 项全修）
| 检查 | 结果 |
|---|---|
| shared + backend typecheck | ✅ 0 error |
| N8 触发器边界单测（T1 band 含/排端点、confidence floor、T3 spread 含端点、**T3 floor 对称新增 3 例**、组合、null） | ✅ 8/8 |
| v1c N2 runtime+admission 单测（canonicalHash + per-slot memo + step 删除后 byte-identity 保持） | ✅ 7/7 |
| v1c-n2-runtime-smoke（canonicalHash/memo 后） | ✅ pass |
| model-profile-registry 单测（新 `n8_bounded_debate` profile 注册 + 校验） | ✅ 10/10 |
| 矩阵一致性 | ✅ ok |
| v1b-n8-runtime-smoke | ✅ exit 0 |
| v1b-harness-e2e | ✅ exit 0 |
| backend 全套件 | ✅ **1322 tests / 1287 pass / 0 fail / 35 skipped**（较修复前 1314 净增 8 = 新增触发器边界用例；零回归） |

10 项修复对应：#1 profile 注册（registry 10/10）｜#2 重入语义注释｜#3 反环显式 firstPass（n8 smoke 覆盖首评路径）｜#4 T3 floor 对称（触发单测 +3 例）｜#5 feedback gate-hash 计入 loopback 码｜#6 producer 写入前 isN8ToN7FeedbackPayload 断言｜#7 canonicalHash 收编（v1c byte-identity 保持）｜#8 provisional×product tripwire（warning 码入契约）｜#9 binding/profile per-turn memo（byte-identical）｜#10 runLoop 空/重复 slot 守卫 + 删 step/orphan 文件。
**遗留（STEP 7 验证项）**：N8 debate loopback 触发→feedback→N7 重入→debate 复评的全闭环 e2e 随 v1b debate 运行时（STEP 5-9）落地（当前 fixtures 不触发 loopback，#3/#5/#6 由代码 + 写入断言保障）。



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
