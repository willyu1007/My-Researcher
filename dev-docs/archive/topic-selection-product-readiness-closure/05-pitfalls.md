# 05 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)
- **prompt_packet_hash 漂移**：任何 prompt 正文改动都会改 hash → 准入层 drift 校验锚点必须同事务更新，且台账留痕；禁「悄悄改正文」破坏 replay byte-identity。关键词：prompt_packet_hash / canonicalHash / replay / drift-anchor。
- **机制夹带**：撰写/硬化中发现需新字段 / 新 context family / 新 output schema / 新 gate —— **不在本包改 harness 本体**，先走 T-088 `06-joint-decisions.md` 的 `D-T128-0N` JD，或回相应功能包立项。关键词：harness-touch / D6 / joint-decision。
- **D8 骆驼鼻子**：标定 dry-run / debate 管路预接（W-14）绝不接成写阈值 / 翻 provisional；保持 W-13 read-only/guard/banner 三重防；W-14 必带「dormant 时身份不变」守卫 test。关键词：provisional / tripwire / record-and-defer / D8。
- **SSOT 矩阵 re-fork**：W-08 live-surface 分类对齐 `docs/context/process/topic-selection-workflow-matrix.md`（已迁移 SSOT），**不另起一份**，否则 consistency test 红。关键词：workflow-matrix / SSOT / re-fork。
- **P-01 跨包**：压缩恢复是共享 orchestrator 内部改 + 跨 T-124/T-088 JD；topic-selection 半边是 T-123 D3 的孤儿确认义务（T-127 收口未碰）。STEP-7 debate 压缩-facts 严格其下游，勿独立建。关键词：blockForCompressionAttempt / compression-recovery / P-01。
- **伪造语料/盲写正文**：Phase 5 外部门控项（W-17/W-18/W-19）不得用合成语料伪标定、不得盲写 debate 正文为「已定稿」；维持骨架 + 门控登记。关键词：corpus-gated / externally-gated。
- **可达性 ≠ 健壮性**：W-10（首次真跑）是可达性；W-11（压缩恢复）是健壮性。勿让 W-11 阻塞 W-10 的核心 sign-off。

## Pitfall log (append-only)

### <!-- YYYY-MM-DD --> - <!-- short title -->
- Symptom:
- Context:
- What we tried:
- Why it failed (or current hypothesis):
- Fix / workaround (if any):
- Prevention (how to avoid repeating it):
- References (paths/commands/log keywords):
