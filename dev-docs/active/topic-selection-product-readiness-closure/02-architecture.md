# 02 Architecture / 边界

> 本包是**产品就绪收口伞型包**，跨多个已建子系统。核心架构约束是**边界纪律**：什么本包改、什么走 T-088 联合决策、什么是外部门控。

## 触碰边界（本包改 vs 协调）
| 面 | 谁拥有 | 本包动作 |
|---|---|---|
| prompt 正文（内联 service / 模板模块） | 本包（承 T-128） | **直接改**：撰写正文 + 定稿 version/hash。纯内容，不改装配路径。 |
| `topic-selection-llm-invocation-registry.ts`（id/version SSOT） | 本包对齐 | 只补正文背后的内容 + 定稿状态；**不改 id 集合**（新调用点走其功能包）。 |
| WorkflowHarness 壳 / 节点 runner / AgentOrchestrator 边界 | **T-088（D-02/D-03）** | **不直接改**：W-12（N6 projection）/W-13（v1c-N2 wiring）/W-14（debate 类型并集）/W-11（压缩恢复）凡触碰，先在 T-088 `06-joint-decisions.md` 追加 `D-T128-0N`（承 D-T127-02）。 |
| bounded-debate-core / divergent-debate runtime | T-088 + debate-core | 同上，JD 先行；W-14 类型并集放宽 + model_option_id 穿线。 |
| 共享 orchestrator 压缩恢复（`blockForCompressionAttempt`） | **跨包 T-124 + T-088** | W-11 与两包协调；本包认领 topic-selection 侧回归确认半边（T-123 D3 孤儿义务）。 |
| 工作台 desktop（HumanOverride/Trace） | 本包（D5 解延期） | W-15：先 HumanOverride 权限边界产品 spec，再建写卡 + 后端路由 + audit 标签。 |
| N8/N6 阈值 node policy（provisional） | T-127 W-13（record-and-defer） | **不翻 provisional / 不撤 tripwire**（D8）；W-16 只定义 sign-off 工件 schema；真翻门 = Phase 5 外部门控。 |

## 关键不变量 / 契约
- **prompt drift 锚点**：每个被授权 prompt 的 `prompt_packet_hash`（canonicalHash 单源）是准入层 drift 校验锚点；正文定稿必与 version + 锚点更新**同事务**，否则 replay byte-identity 破。台账（03）逐项留痕。
- **product-run 接口**：`run_mode:'product'` 经 WorkflowScenario → harness → AgentOrchestrator，需真解析的 `model_option_id`（profile registry）。非 debate 路径在 N8/N6 provisional + tripwire 下产出 advisory（非阻断）。
- **D8 三重防**（W-13 既建，本包保持）：标定路径 read-only on node policy + 守卫 test（provisional 恒真）+ dry-run banner；W-14 debate 管路预接后由 W-14 守卫 test 钉死「dormant 时身份不变」。
- **SSOT 矩阵**：`docs/context/process/topic-selection-workflow-matrix.md` 是节点语义 SSOT（T-123 Phase 0 迁移）；W-08 对齐**不 re-fork**，否则 consistency test 红。

## 依赖图（收口关键路径）
```
W-01/02/03 (ledger)
   └─> W-04..W-07 非-debate prompt 定稿  ──┐
                                          ├─> W-08 live-surface 分类 ─> W-09 product 场景/model_option ─> W-10 首次真跑 ★核心 sign-off
W-11 P-01 压缩恢复 (gates product-robust) ─┘         (Phase 4 与 1–3 并行)
W-12 N6 可达性 / W-13 v1c-N2 / W-14 debate 管路 / W-15 D5 / W-16 sign-off schema
   └─> Phase 5 外部门控：W-17 标定翻门 ─> W-18 语料耦合正文 / W-19 debate 开启   (不阻塞前四相)
```
- **可达性**（product-reachable）= W-10。**健壮性**（product-robust）= W-11（超预算输入不再 fail-closed）。两者解耦：W-11 不阻塞 W-10。
- STEP-7 debate 压缩-facts 严格在 W-11 下游（仅当压缩-触发 debate 路径存在才有意义）。
