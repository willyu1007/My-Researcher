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

| Date | Command | Status | Summary |
|---|---|---|---|
| 2026-06-11 | `pnpm run paper-implementation:runtime-stress` | passed | 包创建基线：T-114 闭环复跑，run id `t114-paper-implementation-runtime-stress-1781132291471`，290 tests / 226 passed / 64 env-gated skips / 0 failed，9/9 steps，95/95 必检用例通过。 |
| 2026-06-11 | `pnpm run paper-implementation:near-prod-runtime-gate` | passed | 包创建基线：near-prod gate run id `t114-paper-implementation-near-prod-runtime-gate-1781132560502`，live openai 13 次 provider 调用与 debate 拓扑一致，Prisma 证据、exactly-once 并发 materialization、replay 幂等、drift `VERSION_CONFLICT`、no-dual-track 与 redaction 护栏全 true。 |
| 2026-07-03 | backend tsc + research-lifecycle unit + full backend suite | passed | research-lifecycle id 生成 max+1 修复（外部会话留痕，9fb04a26 同类）：unit 10/10；full backend 1639 tests / 1604 passed / 0 failed / 35 skipped（基线 1632/1597/0/35 + 本修复 3 测 + 41ac51b3 W-11 4 测，只增不减）；backend tsc 干净。注意：全量须单会话独占运行——双会话并发跑套件会因 ts-node 子进程资源互踩产生文件级崩溃假红（本次取证 43/4 个文件级 not ok 均为此因，静置复跑全绿）。 |
| 2026-07-03 | 并发双起 `pnpm test`（apps/backend，错开 8s）+ backend tsc | passed | 套件跨进程互斥锁落地验证（run-node-tests.mjs，实现见 03 同日工具链留痕）：B 检测到 A（pid 50340）持锁即打印 "Another backend suite run is in progress — waiting..." 并 16s 心跳等待 286s，A 全绿 1639/1604/0/35 释放后 B 自动接锁复跑同样全绿 1639/1604/0/35；两份日志 0 个 `not ok`——上行取证的并发假红（43/4 文件级崩溃、总数骤降）在互斥下不再复现，"单会话独占"自此由 runner 强制而非人记。stale 锁（死 pid）启动时/等待中两路接管、SIGTERM 释放且 `child.kill` 不留孤儿舰队、逃生口三项单独手验通过；backend tsc 干净。 |
| 2026-07-04 | shared typecheck+test + backend tsc + desktop typecheck + full backend suite | passed | snapshot id 校验三处 `\d{4}`→`\d{4,}` 纯放宽（27ad677b）：shared 269/269（含新 paper-project-contracts.schema.test 两测——isSnapshotId 4/5 位接受+3 位拒绝、writing-package schema SP-10000 过/SP-999 400）；backend tsc 与 desktop typecheck 干净；full backend 1639/1604/0/35。 |
| 2026-07-04 | runtime-stress（预植活锁全流程）+ full backend suite（经重构 runner） | passed | 套件锁共享模块化验证：预植他人活锁下 runtime-stress 单文件 L5 步照跑（不取锁）、13 文件步正确打印等待，撤锁后接锁恰 1 次并全程绿 290 tests / 226 passed / 64 env-gated skips / 0 failed（与 T-114 基线一致，后续多文件步直取无等待）；full backend 经 lib 重构 runner 1639/1604/0/35、锁正常释放；v1c-production-depth 同形集成以 node --check + 同构行为证明收口（全跑含 provider 门控）。四脚本 node --check 全过。 |
| 2026-07-04 | 锁加固实测 5 场景 + full backend suite（经加固 runner） | passed | 复审修复验证（修复形态见 03 同日条目）：①stale(死 pid)接管 + 心跳 mtime 推进（15s tick 实测 +15s）；②组信号不变量——TERM 后 12 个舰队进程 200ms 内全灭且"锁消失时刻无任何舰队进程存活"逐 200ms 采样零违例（此场景实测揪出协调器瞬死孤儿化 worker，随即升级 detached+组信号）；③年龄兜底接管（pid=1 存活 + mtime 超 5min → 正确判 stale）；④release 外来内容锁不删（foreign payload 存活）；⑤双 runner 排队/增强等待消息（ps -p 提示）/TERM 交接（B 接锁 pid 正确）/锁+claim 零泄漏。full backend 经加固 runner 全绿 1639 tests / 1604 passed / 0 failed / 35 skipped，锁正常释放。claim 串行化接管的微秒级双 waiter 竞争无法确定性摆拍，以构造证明收口（见 03）。flow-runner backend-test 预算 300s→900s 同轮生效。 |
