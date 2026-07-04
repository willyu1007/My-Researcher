# 03 Implementation Notes

## 2026-06-11 包创建与审计来源
- 本包由 2026-06-11 paper-implementation 产品化审计触发，审计基线是 T-114 闭环复跑的两份证据：
  - runtime-stress run id `t114-paper-implementation-runtime-stress-1781132291471`（290 tests / 0 failed / 95 必检全过）；
  - near-prod gate run id `t114-paper-implementation-near-prod-runtime-gate-1781132560502`（live openai 13 次调用与 debate 拓扑一致、Prisma/幂等/漂移/无双轨证据全绿）。
- 审计发现登记为 P-01..P-13（见 `00-overview.md`），其中关键代码事实：
  - `requires_compression` 永远 blocked（orchestrator `blockForCompressionAttempt` 无恢复分支）；
  - 11 个 runtime service 内联 contextPolicyProfile、`allowed_memory_families: []` 全关；
  - 18 个 runtime-slots 路由无产品调用方（仅测试/金丝雀）；
  - debate 角色链全部硬编码、无复杂度档位判定；
  - slot 参数真相分散 4 处无机器对账；16 个 `T114_*` flag 烧进项目级脚本。
- 与 `T-123`（topic-selection-productization-hardening）的关系：同一审计在两个域的镜像包。共享面（orchestrator/gateway/两个 registry）改动走 JD 联合决策互链机制（`02-architecture.md` §共享面协调）；D1/D2 决策形态与 T-123 D1/D2 对齐。

## 待签核决策清单（开工前需用户确认）
- D1 Run Coordinator 形态 —— **已签核 2026-06-12**（自动化优先异步推进，见同日条目）
- D2 debate/复杂度确定性档位 —— **已签核 2026-06-13**（双试点 + 注册表版本化阈值 + 仅 force-up + 预算不足 fail-closed，见同日条目）
- D3 压缩闭环 —— **已签核 2026-06-13**（单执行器定案：删除 codex_assisted 声明，语义浓缩走上游 digest artifact 模式，见同日条目）
- D4 记忆首批三 families —— **已签核 2026-06-13**（三族齐发 + 项目域/variance 全局 + v1 含 retire 面，见同日条目）
- D5 SlotParameterManifest@v1 —— **已签核 2026-06-13**（运行时导出 + 提交式快照；backend 权威/YAML 对账，见同日条目）
- D6 T114_* → PAPER_IMPLEMENTATION_* 迁移 —— **2026-06-13 自我修正为原子更名无 alias**（依据 D3"未上线不留双轨"原则，见同日条目）
- D7 开发与测试节奏（每 slice runtime-stress 收口 + 每 Phase 用户验收 + 里程碑金丝雀/near-prod + usage-fit rubric）

## 2026-06-12 D1 签核（Run Coordinator 形态）
- 用户确认**自动化优先**总原则：本项目设计目标是尽可能自动化，人一般只负责确认和查看，不做流程内闸门。该原则覆盖 D1 全部子决策，并将影响后续 D2-D7 的讨论基线。
- D1.a 推进粒度：异步自动推进——advance 启动 run 内推进循环（202 + 轮询），逐步持久化，直至 completed/waiting_review/blocked/budget_exhausted；否决了"人在环逐步推进"与"同步长调用"两个备选。
- D1.d 扇出点：route 候选选择由版本化 `CandidateSelectionPolicy@v1` 纯函数自动完成，决策记录可审计、人可事后 override 重跑分支；否决了"product 停驻人选"。
- D1.f 重进语义：blocked 可直接 re-advance（同 slot 新 attempt、预算封顶）；`failed` 仅 coordinator 自身故障不可重进。
- D1.c 首期范围：lane A validation-planning 四步链 + lane B motive 链（decomposition→evolution）+ board 两 slot 单步 pipeline；pipeline 用代码级 const 注册表，非用户可配置、无分支 DSL。
- Lane B 血缘核实：`RunPaperImplementationMotiveEvolutionRuntimeRequest`（`packages/shared/src/research-lifecycle/paper-implementation-runtime-contracts.ts:2276-2329`）只要求领域锚（motive/board/portfolio/challenge refs+hashes）与 `human_confirmation_policy_ref`，不要求 decomposition admitted artifact 作 primary input——lane B 为锚耦合序列，coordinator 不做两步间 artifact 链校验，只保证同一冻结 source bundle。
- 文档落点：`00-overview.md` D1 与 AC-5、`01-plan.md` Phase 3、`02-architecture.md` 状态机/分工/R7-R8 已同步更新。

## 2026-06-13 D2 签核（debate 档位与复杂度检查）
- D2.a 试点范围：`cycle_candidates` + `cross_board_synthesis` 双试点（前者下游爆炸半径最大：cycle→feasibility→workorder；后者触及 portfolio 决策），其余单角色 slot 二期推广。
- D2.b 阈值归属：`DebatePolicy@v1` 注册表版本化——阈值表是 policy 制品，版本进 runtime identity 与 SlotParameterManifest 对账；调阈值=发新版本，旧 identity 按 drift 阻断。
- D2.c 强制开关：product 仅允许 force-up（含 actor 记录），不允许降档绕过 policy；test/acceptance 双向可覆盖。
- D2.d 预算不足：fail-closed——`TIER_BUDGET_INSUFFICIENT` 转 blocked，人提额后 re-advance；不静默降档（与全链无 fallback 原则一致）。
- 关键边界重申：档位判定在 slot service preflight 内执行（coordinator 零语义决策）；升档只增加角色证据，final artifact 契约不变；LLM 不拥有档位决策。在自动化优先（D1）前提下，该确定性档位是无人值守 run 的唯一质量节流阀。
- 文档落点：`00-overview.md` D2 与 AC-6、`01-plan.md` Phase 4 已同步。

## 2026-06-13 D3 签核（压缩执行闭环：单执行器定案）
- 用户裁定原则：项目未上线，不留漂移风险与双轨问题，从鲁棒性与清晰度做真设计——否决了"codex_assisted 二期保留"的含糊选项。
- 定案：runtime 压缩路径唯一执行器 = `deterministic_structural`（分级裁剪纯函数，可复算，replay/admission 复核成立）；**从 paper-implementation context profile 的 `allowed_executor_kinds` 删除 `codex_assisted`**——当前内联 profile 声明了该执行器但从未实现，正是"已声明未实现"的漂移面。
- 鲁棒性论证：LLM 压缩器输出不可复算（同输入可产不同摘要），嵌入调用路径等于在 identity 链条心脏埋不确定源，且构成第二条 LLM 通路（non-goal 明令禁止的双轨）。
- 语义浓缩的归宿：上游 digest artifact 模式——一次生成、经 admission、有独立 identity 的一等制品（复用文献模块 key-content extraction 已验证模式），runtime 只消费 ref。digest 生产链路不在本包，T-124 只立边界与负例。
- D3.b：packet 可裁等级在 registry 按 context family 静态声明，请求方只可收紧不可放松。
- D3.c：长上下文金丝雀与 Phase 6 golden scenario 素材 = 公开论文构造（arXiv 带代码论文 3-5 篇），由本包准备，不依赖用户私有素材。
- 默认设计确认：`COMPRESSION_APPLIED` warning 传播至 role/final artifact；复杂度信号用压缩前 token 估计；blocked blocker 携带最大占用 packet 与 digest 化建议。
- 文档落点：`00-overview.md` D3 与 AC-2/AC-9、`01-plan.md` Phase 2 与 6.4 已同步。

## 2026-06-13 D4 签核（跨 run 记忆）
- D4.a 范围：三族齐发——failed_probe、disposition、provider_variance（variance 写入源已存在，增量成本低）。
- D4.b 作用域：failed_probe/disposition 限定单 implementation_project（避免跨项目误导）；provider_variance 为 workspace 全局（provider 可靠性天然全局）；跨项目提炼留二期。
- D4.c 管理面：v1 含 retire/批注面——retire 含 actor+理由，retired 条目从消费查询排除；人不可创建记忆（写入仅限确定性投影）。场景依据：probe 因基础设施失败不 retire 会永久误导自动推进。
- 设计默认（随签核生效）：锚版本漂移条目确定性过滤为 miss+warning 而非 block（记忆是辅助上下文非权威，因它停机违背自动化优先；仅 required family 完全缺失按 policy 行为）；同 target+原因码语义去重计数累加（沿 DecisionWorkQueue dedup 模式），供 D2 历史失败信号直接消费。
- 文档落点：`00-overview.md` D4 与 AC-4、`01-plan.md` Phase 5 已同步。

## 2026-06-13 D5 签核（SlotParameterManifest）+ D6 自我修正
- D5.a manifest 形态：backend registry 运行时导出为唯一权威 + 提交式生成快照（CI 新鲜度校验，参数变更强制成为可 review 的 diff，沿 DB SSOT 同步模式）。
- D5.b 双源方向：backend 权威、YAML 降为 provider/model 候选声明的对账输入——此为 T-124 的 JD 提案立场，registry 为跨域共享面，最终与 T-127 共决。
- D5 默认设计（随签核生效）：四向对账同时进默认 CI 与 runtime-stress；裸参数禁令 schema strict + service 双层；新 slot 不手写 dev-docs block（manifest 指针）；T-114 历史 block 仅加取代注记；manifest 含 D1/D2/D4 挂载位（debate policy / candidate selection policy / memory family，未落地前 null 占位）。
- D6 自我修正：原草案"保留旧名过渡 alias + 告警"与用户 D3 裁定原则（未上线不留双轨/漂移面）冲突，修正为**原子更名无 alias**——T114_* 全部引用 grep 可达，同一 slice 内一次切换，meta 测试负例捕获残留旧名，更名后全门重跑。
- 文档落点：`00-overview.md` D5/D6 与 AC-7、`01-plan.md` Phase 1 与 6.1、`02-architecture.md` R5 已同步。

## 2026-07-03 外部修复留痕：research-lifecycle id 生成 count+1 主键碰撞（9fb04a26 同类）
- 来源：T-128 W-10 首次产品跑同日的对抗式审查确认 literature 同类缺陷仍存于 `research-lifecycle-service.ts`——nextPaperId/nextNodeId/nextSnapshotId 用"行数+1"生成 `P___`/`NODE-____`/`SP-____` id，而 `deletePaperProject` 删除路径真实存在：删任何非最新 paper 后下一次创建即撞主键（500）。本项经查未被 T-124 认领，由独立会话修复并在此留痕。
- 修复形态（镜像 9fb04a26）：repository 三层（interface / in-memory / prisma）`countPapers/countNodes/countSnapshots` → `listPaperIds/listNodeIds/listSnapshotIds`（count 三方法全仓库无其他调用方，直接替换）；服务侧镜像 literature 的 `nextPrefixedNumericId` 改 max+1，带 padWidth 参数适配 `P`=3 位无连字符、`NODE-`/`SP-`=4 位。id 对外形态不变、无契约变更；paper-implementation 依赖的 paper/node/snapshot id 生成自此删除安全。
- 回归测 3 个（mutation-solid）：预置幸存高位 id（P009/NODE-0009/SP-0009，行数=1）断言新 id = max+1（P010/NODE-0010/SP-0010）；经 count+1 变异反验，恰好三个新测红、七个旧测不受扰。

## 2026-07-03 工具链修复留痕：backend 套件跨进程互斥锁（并发全量假红根治）
- 背景：同日取证确认（见 04 Log 2026-07-03 行）双会话并发跑全量套件时，双倍 ts-node 子进程舰队耗尽机器资源，子进程装载期崩溃（~11-13s，TSError 风格 `[Object: null prototype]` dump），产生文件级 `not ok` 假红（两次取证分别 43/4 个文件）、总测数骤降（崩溃文件丢失全部 subtests，如 1635→1020）与误导性偏短 wall time。"全量须单会话独占"靠人记不可靠，改由 runner 自身强制。
- 形态：`apps/backend/scripts/run-node-tests.mjs` 在 spawn 舰队前以排他锁文件（`O_EXCL` 创建 + pid JSON 内容，零依赖）取跨进程互斥；已被持有则打印持有者 pid 并每 2s 轮询（15s 心跳行），空闲后接管继续。持有者 pid 已死（`process.kill(pid,0)` ESRCH）判定 stale 自动接管，接管前重读内容比对防误删他人新锁；内容不可解析仅在 mtime > 60s 时视为 stale（防误杀写入中途的锁）。
- 锁域取 `os.tmpdir()`（机器级/每用户）而非仓根：争用的资源是机器 CPU/RAM 而非工作树，跨 worktree/克隆的两次运行同样必须串行；也不脏 git status。逃生口 `BACKEND_TEST_SUITE_LOCK=0`（仅用于刻意复现争用取证）。
- 释放路径全覆盖：`exit` 事件（覆盖 process.exit 与 uncaughtException）+ SIGINT/SIGTERM/SIGHUP once 处理器（先 `child.kill(signal)` 带走测试舰队再释放锁再重抛默认终止——保证"锁空闲 ⇒ 无舰队在跑"，定向 kill runner 不再留孤儿舰队诱发下一位等待者撞上争用）；等待期间不装信号处理器，排队中 Ctrl-C 立即退出且无锁可漏。
- `run-node-tests-repeat.mjs` 无需改动：它逐次 shell 出真 runner，每次迭代天然继承锁（其他会话可在两次迭代之间公平插队，表现为该迭代 elapsed 偏长）；两脚本 header 均已注明。
- 测试形态说明：脚本为顶层副作用 .mjs，不在 src 测试图内，不加单测；验证走真实行为——stale 接管/等待-接管/信号释放三条路径手验 + 双并发全量真跑（见 04 Log 同日行）。

## 2026-07-04 质量复审修复：套件锁四处边角加固 + flow-runner 预算适配
- 背景：对本轮未提交 diff 的 high-effort 复审（8 视角 finder × 独立验证，findings 全 CONFIRMED）在锁实现上确认四个边角缺口与两个生态缺口，按验证者方案修复（其中 stale 接管一项验证者建议的 rename 方案推演仍有残洞，改为更强的 claim 文件串行化）。
- 修复形态（`run-node-tests.mjs`）：
  - stale 接管 TOCTOU → **O_EXCL claim 文件串行化**：接管前必须原子创建 `<lock>.takeover-claim`，唯一 claim 持有者才可在"内容仍等于 stale 原文"前提下 unlink 主锁；claim 60s 年龄自愈防中途死亡。read-compare-unlink 三步在跨进程下可被对手的"接管+重建"插入（rename 同理——rename 挪走的是路径上当前的任何东西），claim 串行化把删除权收敛到单持有者。
  - 信号路径提前放锁 → 处理器只发信号，释放与重抛统一收敛到 child 'exit'；实测又揪出下一层：node --test 协调器收 TERM 默认瞬死、compute-bound ts-node worker 全部孤儿化——fleet 改 `detached` 独立进程组 + `process.kill(-pid)` 组信号直达每个 worker（实测 12 进程 200ms 全灭且锁后于舰队消失）；二次信号走默认终止，遗留锁由 staleness 规则回收。
  - release 无主校验 → tryTake 返回写入的精确 payload，release 先读文件比对，仅删除仍载有本 run payload 的锁（手删+他人重建后不再误删他人活锁）。
  - pid 复用无限等待 → 持有者每 15s touch 锁 mtime 心跳；合法 JSON 锁 mtime 超 5min 一律判 stale（不再唯 pid 存活论——EPERM 对每用户 tmpdir 锁恰是反向信号）；等待消息补 startedAt/cwd 与 `ps -p` 排查提示。
- `experiment-foundation-full-flow-runner.mjs` backend-test 预算 300s→900s：solo 全量本就 ~286-294s（余量 ~2%），锁排队会把等待变 timeout 假红。
- 复审当日的两项待确认（SP 契约拓宽、锁抽共享模块）经用户确认后于同日落地，见下一条目。

## 2026-07-04 复审待确认两项落地：SP 校验拓宽 + 套件锁共享模块化
- **snapshot id 校验 `\d{4}`→`\d{4,}`（纯放宽，27ad677b）**：生成器 padStart(4) 不截断、SP-9999 后照常铸出 SP-10000，但三处校验硬编码 4 位——快照建档成功且为活跃指针，却永远过不了 buildWritingPackage；桌面端无锚提取还会截成 SP-1000 误导航。拓宽 SNAPSHOT_ID_PATTERN、writing-package body schema、desktop tryGetSnapshotId 三处，与 VERSION_ID_PATTERN 的 `P\d+` 弹性风格对齐；paper/node 无硬编码位数校验不需要动。新增 `paper-project-contracts.schema.test.ts` 回归（isSnapshotId 4/5 位接受 + 3 位拒绝；schema SP-10000 过/SP-999 400）。
- **套件锁抽共享模块 `apps/backend/scripts/lib/suite-lock.mjs`**：复审确认 runtime-stress 13 文件步在 12 核机上瞬时舰队宽度与全量完全相同却不取锁（v1c-production-depth 7 文件步次之）。锁全部机制（心跳/年龄兜底/claim 串行化接管/ownership release/逃生口）移入单一模块——一份锁路径常量，杜绝双份漂移；`run-node-tests.mjs` 改 import。两个 .ai runner 的多文件（≥2 个 .test.ts 参数）`node --test` 步在**步计时器启动前**取锁：锁等待不吃步预算，且子步默认预算宽裕（runtime-stress 900s / v1c 1800s），不复刻 flow-runner 300s 那类超时假红。单文件步不取锁（舰队宽度 1-2,过度串行只亏不赚）。
- 残留声明：步超时路径只杀协调器,孤儿 worker 可能短暂活过锁释放（两 runner 预先存在的行为,集成注释已表）;修复它需 detached 组信号改造 .ai runner 的 Ctrl-C 语义,不在本轮范围。

## 联合决策登记（JD-x，与 T-127 互链）
> T-123 于 2026-06-16 收尾关闭归档；共享面后续 JD 互链对象转为 **T-127**（topic-selection-backend-hardening-and-expansion）。下列条目涉及 T-123 的**前向对齐 / 共决**对象转 T-127；涉及 T-123 **已签决策形态**（D1/D2 文本）的为历史引用，不变。
- **JD-候选（待 Phase 0 正式登记）**：T-123 D1 文本为"同步 advance-until-blocked + 人在环触发"（该形态现由 T-127 承接）。Phase 0 需与 T-127 对齐：topic-selection 或同步采纳自动化优先形态，或在两包各自记录域差异理由（topic-selection 节点单步耗时短，同步语义代价低；paper-implementation 单 slot 分钟级，异步是硬约束）。
