# 01 Plan

> 选题管理产品就绪收口伞型包（T-128，重定范围自 prompt-content-authoring）。相位为建议次序，W-ID 稳定；开工前以 Phase 0 台账重定标。**宽 DoD**：Phase 0–4 全部工程可闭环项闭环 + Phase 5 外部尾巴显式 track-and-defer。
>
> 关键路径（到产品级端到端真跑）：**Phase 0 ledger → Phase 1 非-debate prompt → Phase 2 model-option + product 场景 → Phase 3 首次真跑**。Phase 4 结构硬化与 1–3 多处可并行；Phase 5 外部门控，不阻塞前四相。

## Phase 0 — 立项收口 + 台账（无/轻代码，先建 SSOT 现状）
- **W-01 建包治理收口**：git mv 重命名 → `topic-selection-product-readiness-closure`；改 `.ai-task.yaml`（slug/keywords/edges/updated）；registry 注册 T-128（M-001/F-001/R-009）；`sync --apply` + `lint --check` + `query`；回填 T-127 `00-overview.md` stale 状态行（文档卫生 S）；在 T-088 `06-joint-decisions.md` 追加 `D-T128-00` 联合决策开篇（承 `D-T127-02`，声明本包 harness-touch 协议）。
- **W-02 撰写状态台账**：遍历 `topic-selection-llm-invocation-registry.ts` 的 `TOPIC_SELECTION_PROMPT_TEMPLATE_IDS`（排除 provider-canary），逐项定位正文（内联 service / 模板模块）、标现状（骨架/部分/产品级）、当前 version 来源、`prompt_packet_hash` 锚定方式、**标定语料门控标注**（哪些与未就绪语料强耦合）。产出 `03-implementation-notes.md` 台账表。
- **W-03 孤儿/无主开口正式认领**：把 N6 升级可达性（chip）、v1c-N2 生产接线（chip）、P-01 压缩恢复 topic-selection 确认半边 正式纳入本包 ledger，各开 `D-T128-0N` JD 占位（P-01 同时 coordinates-with T-124）。

## Phase 1 — 非-debate prompt 产品化（不被标定语料门控，最大块、可并行）
> 承原 T-128 W-P1..W-P4。四组表面相互独立、可并行撰写。每项：角色指令/输出契约/边界/上下文引用四要素完备 → 至少一轮（可对抗式）内容评审 → 定稿 version + `prompt_packet_hash` + **同步更新准入层 drift 锚点**。`topic-selection-llm-invocation-lint` 保持绿。
- **W-04 v1a 表面**：evidence-map-extraction / generate-need-candidate / need-adjudication / human-confirmation-semantic-review + need-discovery 4 角色（explorer / deep-critic / arbiter-issue-frame / arbiter-final）。
- **W-05 v1b 非-debate harness 槽位**：N2/N3/N4/N5 runtime-support、N6 runtime-initial、N6 loopback-triage（含 step e `n6_debate_trigger_thresholds` advisory 注入后的正文）、N7 三槽（candidate-grouping / failed-trial-synthesis / n8-debate-admission-review）。
- **W-06 v1c 表面**：promotion-decision-support / delegated-promotion-decision / downstream-feedback-normalization（promotion bounded-micro-debate 见 Phase 5）。
- **W-07 资源采样**：resource-sampling-classification 正文复核与定稿。

## Phase 2 — live-surface 分类 + 产品跑使能（依赖 Phase 1，无 stub prompt 不跑 provider）
- **W-08 live-surface 分类（T-089 切片）**：对产品跑真实穿越的每个节点（v1a need-discovery、v1b N2–N8、v1c promotion、bridge）确认 execution-type（deterministic / single-agent / debate / human / codex）+ WorkflowScenario 绑定 + 节点 policy 填充；对齐**已迁移 SSOT** `docs/context/process/topic-selection-workflow-matrix.md`（勿 re-fork，否则触发 consistency test 红）。穷举 dormant/边缘节点留 T-089 backlog。
- **W-09 产品跑使能**：核对/注册至少一个 product-eligible provider `model_option_id`（确认今天有 profile 能真解析，否则 harness 抛 `MISSING_PROVIDER_MODEL_OPTION`）+ 定义 `run_mode:'product'` WorkflowScenario(s)（v1a / v1b-非debate / v1c）+ 无密钥提交的 real-provider canary（**扩展**已 done 的 real-e2e-canary / real-e2e-scale-quality scaffolding，不重建）。

## Phase 3 — 首次真实产品跑（核心可达性 sign-off）
- **W-10 非-debate 路径首次真跑**：经 harness 跑一次 `run_mode:'product'` 真实选题，N8/N6 维持 provisional + W-06 sign-off tripwire（debate 升级为 advisory/非阻断）。这是「产品级端到端可达」的核心证据；产出真跑证据 + per-node trace 记 `04-verification.md`。

## Phase 4 — 结构硬化（宽 DoD 必须，与 Phase 1–3 可并行）
> 凡触碰 harness 壳 / orchestrator / bounded-debate-core 的，先在 T-088 追加对应 `D-T128-0N` JD。
- **W-11 P-01 压缩恢复（topic-selection 半边）**：与 T-124 + T-088 协调，把共享 orchestrator 的 `blockForCompressionAttempt` 从「只记录→fail-closed」补成 **compress→re-gate→continue 恢复分支**，并确认 topic-selection 侧回归（认领 T-123 D3 的孤儿确认义务）。**当前最大未追踪开口**；gates「product-robust」（非可达性，故不阻塞 W-10）。— L
- **W-12 N6 升级可达性**：harness 在升级路径构建 `n6_gate_failure_retry_context` projection + coordinator 条件穿线 + 真 provider/harness e2e 过 gate；补 crash-mid-debate / blocked-then-retry 幂等 + 文档化 re-entry `generation_mode` caller 契约。
- **W-13 v1c-N2 生产接线**：拆 `ROLE_OUTPUT_SCHEMA` 为 per-slot const/enum + prompt 指令使 emission↔admission 对齐；接真生产 caller（捕获真 provider per-slot 响应）；修不一致 fixtures。
- **W-14 provider_llm debate 管路预接（decision 3，dormant）**：放宽 N6/N8 debate runtime 的 `Extract<…,'codex_assisted'|'mocked_llm'>` 并集以承 `provider_llm` + 把 `model_option_id` 穿入每个 role turn（W-09 inert provider-diverse plan 作 caller）；**默认 dormant、由 tripwire/标定门控开启**；守卫 test 钉死「未开启时身份不变」。
- **W-15 D5 工作台 HumanOverride + Trace**：先产出 **HumanOverride 权限边界产品 spec**（可覆写什么 / authority 边界 / audit label，须尊重既有 gate 权限），再建 operator 写卡 + 后端 HTTP 路由 + audit 标签；Trace-snapshot 只读抽屉（trace 工件查看器）。AcceptedRisk 写面已 done，不重复。
- **W-16 W-13 sign-off 工件 schema**：定义 `requires_stakeholder_sign_off` 的 artifact/表 schema（纯代码 S），使语料到位即可一步翻门；**不**接任何自动翻门路径（D8）。

## Phase 5 — 外部门控尾巴（track-and-defer，唯一显式延期，不计入可达性 sign-off）
> 物理外部硬门：工程造不出语料/assessor/sign-off。维持 N8/N6 provisional + tripwire + W-13 三重防（read-only/guard/banner）。
- **W-17 N8/N6 真标定 + 翻门**：语料（≥100 多 provider 人工标注）+ FP<5% + 独立 content-grounded assessor + 记录 sign-off 全部就绪后，跑 W-13 标定 → 翻 `provisional:false` + 撤 tripwire + 更新 W-06/W-07 守卫 + 留痕（03/04 + DP-3.3 README）。
- **W-18 语料耦合 debate 正文**（承原 T-128 W-P5/W-P6/W-P7）：N6 三角色 divergent / N8 bounded-micro-debate / value-assessment / v1c promotion bounded-micro-debate 的产品正文，**与 W-17 标定同期定稿**，语料未就绪前维持骨架 + 门控登记。
- **W-19 provider_llm debate 开启**：W-14 管路在标定达标后 turn-on（真 per-role provider debate）。

## Acceptance Criteria（按相位）
- Phase 0：台账覆盖全部非-canary prompt-template-id + 门控标注；治理 sync/lint 绿；孤儿开口已 ledger + JD 占位。
- Phase 1：W-04..W-07 每个被授权 prompt 四要素完备、经评审、version/hash 定稿、drift 锚点同步、lint 绿；无机制改动。
- Phase 2：live-surface 分类对齐 SSOT 矩阵无 re-fork；≥1 product-eligible model_option 可解析；product 场景 + canary 就绪。
- Phase 3：一次真实 `run_mode:'product'` 非-debate 端到端跑通，证据 + trace 留痕（核心可达性 sign-off）。
- Phase 4：W-11..W-16 全闭环，harness-touch 项有 JD 留痕，全套件 + replay 守卫绿（宽 DoD 主体）。
- Phase 5：W-17..W-19 维持 record-and-defer，门控条件登记，tripwire 不动（外部尾巴，不阻塞）。

## Risks / Notes
- **prompt_packet_hash 漂移**：任何正文定稿改 hash → 准入层 drift 校验须同步更新锚点；逐项留台账，禁「悄悄改正文」破坏 replay 身份。
- **机制夹带**：撰写/硬化中若需新字段/新 context family/新 schema，**先走 T-088 JD**，不在本包夹带改 harness 本体。
- **D8 骆驼鼻子**：标定 dry-run / debate 管路预接绝不接成写阈值/翻门；W-14 守卫 test 钉死 dormant 身份不变。
- **P-01 跨包**：压缩恢复是共享 orchestrator 内部改 + 跨 T-124/T-088 JD；STEP-7 debate 压缩-facts 严格其下游，勿独立建。
- **标定耦合**：debate/value 措辞与阈值校准互为前提，过早定稿冲突；Phase 5 显式门控。
