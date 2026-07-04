# 05 Pitfalls

## do-not-repeat（从 T-114 继承的护栏，本包所有 Phase 适用）
- **不开双轨入口**：任何新能力（coordinator、压缩分支、记忆注入）必须走既有 runtime route/service/admission 路径，不得出现第二条产生 runtime artifact 或绕过 admission 的入口。T-114 用 no-dual-track 必检用例钉死过一次，新代码同样要进 scan。
- **harness 不得变成第二生产者**：harness 只验证/录证。历史上多次想"顺手"让 harness 编译 prompt/选模型/修输出，全部被边界检查拦下；本包的 coordinator 同理——它是调用方不是生产者。
- **人读摘要不可作为验收制品**：promotion/closure 证据必须机器可验（TAP 解析、JSON summary、ownership scan exit code）。审计叙述只能是快照。
- **先注册必检用例再实现**：T-114 的经验是 runner 的 `required_*` 列表是防漏的唯一可靠机制；先写实现后补注册曾导致用例改名后静默脱离闭环门。
- **共享面改动不单方面合入**：orchestrator/gateway/registry 同时服务 topic-selection；改动前 JD 登记互链，topic-selection 回归确认后才算闭环（教训来源：T-114 期间 matrix 与 06-node-runtime-matrix 的文档漂移靠最终 review 才发现，跨包漂移更难发现）。
- **压缩/记忆产物不是证据**：`durable_memory_as_standalone_evidence: false`；压缩报告是 lineage 制品。任何把它们当 primary input/evidence 的设计直接拒绝。

## 历史教训（待本包推进中补充）

### 2026-07-03/04 双会话并发跑 backend 全量 → 文件级崩溃假红（已根治：runner 跨进程互斥锁）
- **Symptom**：full suite 出现大批文件级 `not ok`（集中在引 buildApp 的重文件：routes/integration/app-config），子进程 ~11-13s 死亡并留 ts-node TSError 风格 `[Object: null prototype]` dump；总测数骤降（崩溃文件丢失全部 subtests，如 1635→1020）、wall time 反而偏短。同一文件单跑全绿。
- **Root cause**：`run-node-tests.mjs` 把全部测试文件交给单个 `node --test --loader ts-node/esm`（默认并发 ~cores-1 个子进程，每个全图类型检查）；两个会话同时跑 → 双倍舰队耗尽 CPU/RAM，子进程装载期崩溃。测试代码本身无错。
- **Tried**：按常规红灯排查逐文件复跑（全绿，误导性极强）；靠"人记得别同时跑"不可靠。
- **Fix**：runner 启动舰队前取 `os.tmpdir()` 排他锁文件，后到者轮询等待；2026-07-04 复审后加固——claim 文件串行化 stale 接管、child-exit 后才释放、release 仅删自己的 payload、心跳+5min 年龄兜底（详见 03 同日条目、04 Log）。
- **Prevention**：信任红灯前先认签名——"文件级崩溃 + 总数骤降 + 单跑即绿"= 资源争用非代码错；勿设 `BACKEND_TEST_SUITE_LOCK=0`（仅争用取证用）；旁路重型入口（runtime-stress 13 文件步等）尚未取锁，并行会话期间勿与全量同跑；共享工作树有并行会话时**禁用 git stash**（会卷走对方中间态制造 franken 假红，教训见 T-128 侧记录）。
