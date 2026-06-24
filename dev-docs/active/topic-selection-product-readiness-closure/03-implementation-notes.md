# 03 Implementation Notes

> 进度 SoT 之一（与 00 `## Status` 配合）。工作项矩阵 + 决策留痕 + 台账。开工后逐相追加实施条。

## 工作项矩阵
| 工作项 | Phase | 类别 | 状态 | 备注 |
|---|---|---|---|---|
| W-01 建包治理收口 | 0 | closeable | 进行中 | git mv 重命名 + .ai-task.yaml + registry + sync/lint + 回填 T-127 stale 状态行 + T-088 D-T128-00 JD 开篇 |
| W-02 撰写状态台账 | 0 | closeable | planned | 遍历 registry prompt-template-ids，标现状/version/hash/门控 |
| W-03 孤儿开口认领 | 0 | closeable | planned | N6 可达性 / v1c-N2 / P-01 confirm 半边 纳 ledger + JD 占位 |
| W-04 v1a 表面 prompt | 1 | closeable | planned | 承 T-128 W-P1 |
| W-05 v1b 非-debate 槽位 prompt | 1 | closeable | planned | 承 W-P2；含 N6 loopback-triage 阈值 advisory 注入正文 |
| W-06 v1c 表面 prompt | 1 | closeable | planned | 承 W-P3 |
| W-07 资源采样 prompt | 1 | closeable | planned | 承 W-P4 |
| W-08 live-surface 分类 | 2 | closeable | planned | T-089 切片；对齐 SSOT 矩阵勿 re-fork |
| W-09 产品跑使能 | 2 | closeable | planned | model_option 注册 + product 场景 + canary（扩展 real-e2e 包） |
| W-10 首次真跑 ★ | 3 | closeable | planned | 核心可达性 sign-off；N8/N6 provisional behind tripwire |
| W-11 P-01 压缩恢复 | 4 | coordination | planned | 跨 T-124/T-088 JD；gates product-robust（不阻塞 W-10）；当前最大未追踪开口 |
| W-12 N6 升级可达性 | 4 | closeable | planned | n6_gate_failure_retry_context projection + 幂等 |
| W-13 v1c-N2 生产接线 | 4 | closeable | planned | emission↔admission 对齐 + caller |
| W-14 provider_llm debate 管路预接 | 4 | closeable | planned | 类型并集放宽 + model_option_id 穿线，dormant + 守卫 |
| W-15 D5 HumanOverride + Trace | 4 | closeable | planned | 先权限边界 spec 再建写面 + Trace 抽屉 |
| W-16 sign-off 工件 schema | 4 | closeable | planned | requires_stakeholder_sign_off artifact/表；不接自动翻门 |
| W-17 N8/N6 真标定翻门 | 5 | externally-gated | deferred | 语料 + FP<5% + assessor + sign-off 就绪后 |
| W-18 语料耦合 debate 正文 | 5 | externally-gated | deferred | 承 W-P5/W-P6/W-P7；与 W-17 同期 |
| W-19 provider_llm debate 开启 | 5 | externally-gated | deferred | W-14 管路标定后 turn-on |

## 锁定决策（2026-06-24，用户）
- **D-128-1 T-128 重定范围**：复用 id，prompt-content-authoring 升格伞型包，撰写降为 Phase 1。
- **D-128-2 首次真跑纳入核心**：非 debate 路径真实 product run = 核心可达性 sign-off。
- **D-128-3 debate 管路现在预接（dormant）**：放宽类型并集，由 tripwire/标定门控开启。
- **D-128-4 宽 DoD**：Phase 0–4 工程可闭环项全闭环；Phase 5 外部尾巴唯一延期。
- **承 T-127**：D5（HumanOverride/Trace 延期）、D8（标定 record-and-defer，不翻门）、D6（harness-touch JD 协议）继承生效。

## 台账（W-02 产出，待填）
> prompt-template-id × {现状(骨架/部分/产品级), 正文位置, version 来源, hash 锚定, 标定门控?}

（W-02 开工后填）

## 实施留痕（逐相追加）
（W-01 进行中：见本轮建包 commit）
