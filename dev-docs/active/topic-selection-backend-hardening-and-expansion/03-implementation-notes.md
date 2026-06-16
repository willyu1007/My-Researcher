# 03 Implementation Notes

## Work Items 关闭追踪（相位为 2026-06-16 对齐后次序；W-ID 稳定）
| Work Item | Phase | 段 | Status | Evidence |
| --- | --- | --- | --- | --- |
| W-01 落地 T-123 工作树残留（F-10 estimator + DP-3.3 6-file scaffold + evidence/） | 0 | 核心 | planned | 待 |
| W-02 校验/补 N11 handoff recipe | 0 | 核心 | planned | 待 |
| W-03 代码卫生（去 @deprecated / legacy_unverified 消息 / memory 持久化注记） | 0 | 核心 | planned | 待 |
| W-04 Coordinator 故障恢复（feedback pre-flight / upstream-blocked / timeout 指引 / nonce 守卫） | 1 | 核心 | planned | 待 |
| W-05 准入/运行时 service 单测补齐（~12） | 1 | 核心 | planned | 待 |
| W-06 N8 provisional 阈值产品门禁形式化 | 1 | 核心 | planned | 待 |
| W-12 harness 单文件一次拆透（b1，承 D-T123-03，D-T127-01） | 2 | 核心 | planned | 待 |
| W-07 v1b N6 有界对抗 debate 完整运行时（full a–i，D-T127-02） | 3 | 核心 | planned | 待 |
| W-08 v1c 反馈触发 recheck 建议性发射（record-only，T-108 保持） | 3 | 核心 | planned | 待 |
| W-09 provider-diverse debate 角色 profile（DP-3.5 加法） | 3 | 核心 | planned | 待 |
| W-10 工作台收口审计 + 只读节点文档化 | 4 | 核心 | planned | 待 |
| W-11 `n4_handoff_hash` 数据迁移 | 4 | 核心 | planned | 待 |
| W-13 DP-3.3 N8 阈值标定（record-and-defer，语料门控） | 5 | **延期尾巴** | planned | 待 |

## 决策记录
### 2026-06-16 顶层决策（用户两轮对齐锁定）
- **D1 任务包形态 + 验收切分（locked）**：单一伞型 T-127；两段验收——核心段 = Phase 0–4 阻塞 sign-off，延期尾巴 = Phase 5（选项 D）不阻塞核心。
- **D2 选项 B-2 范围（locked）**：v1c recheck = 建议性发射 + 排序（record-only），T-108 前向唯一保持。
- **D3 选项 B-1 深度（locked，第二轮确认）**：v1b N6 debate 做**完整运行时（full a–i）**——要让"候选弱→升级 debate→正常继续"真正可走必须 full runtime，spec-only 留死路/死能力，违"不留技术债务"。动 harness 前登记 D-T127-02（协调 T-089）。
- **D4 选项 A 次序 + 范围（locked，第二轮确认）**：harness **一次拆透（b1），提前到 Phase 2（B 之前）**——干净 harness 让本次与后续开发更顺，N6 运行时落在模块化结构。登记 D-T127-01。
- **D5 选项 C 范围（locked）**：工作台 = 收口 + 数据迁移；HumanOverride / Trace 抽屉延期。
- **D6 harness-touch 治理（承 T-123 D3）**：W-12 / W-07 触碰 harness 本体先登记 D-T127-NN（W-12=01，W-07=02）；均须 replay byte-identity 守卫。
- **D7 T-123 关闭与移交（locked）**：T-123 转 done 归档，F-11 / DP-3.3 所有权移交本包 W-12 / W-13；T-123 `03-implementation-notes.md` + T-088 D-T123-03 续推指针各留痕，避免双轨/漂移。
- **D8 选项 D 标定姿态（locked）**：record-and-defer——mock 不可标定真阈值（循环喂分），故显式登记阻塞于语料，N8 维持 provisional + 签核门直至真实语料达标。
- 依据：2026-06-16 全链 ground-truth 调查（backend-solidity / Option-B / Option-C / 约定与依赖四路）——结论摘要：① 后端残留 6 未跟踪 scaffold + F-10 改动未落地、coordinator 边界态裸 500、~12 准入 service 无单测、N11 recipe 疑缺、provisional 仅 warning；② N6 debate reserved（infra 预埋、scenario 未定义、DMP-03 触发即 blocked），v1c recheck record-only（T-108 锁前向唯一），provider-diverse 为 DP-3.5 加法位；③ 工作台人审面已建成且 e2e 绿，真实缺口为 `n4_handoff_hash` 数据迁移 + 只读文档化（HumanOverride/Trace 延期）；④ 约定：next id T-127、文件集与 D-record 格式承 T-123/T-115/T-088。

## Phase 实施记录
> 各 Phase 收口时在此追加：变更摘要、关键决策、测试证据（套件名 + 计数 + commit hash）、延期项与理由。

### Phase 0 — 后端夯实（待开工）
### Phase 1 — 后端鲁棒性（待开工）
### Phase 2 — harness 一次拆透 / 选项 A（待开工）
### Phase 3 — 能力扩展 / 选项 B（待开工）
### Phase 4 — 工作台收口 / 选项 C（待开工）
### Phase 5 — 阈值标定 / 选项 D（延期尾巴，待语料）
