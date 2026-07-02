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
