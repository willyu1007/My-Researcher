# Roadmap — paper-implementation-productization-hardening (T-124)

## 里程碑

| 里程碑 | 内容 | 出口判据 |
|---|---|---|
| M0 对齐 | Phase 0：JD 联合决策登记、T114_* 更名映射、manifest 字段冻结 | 决策签核，03 留痕 |
| M1 参数零死角 | Phase 1：SlotParameterManifest + 四向对账 + 裸参数负例 + overrides | runtime-stress 新 step 绿 |
| M2 上下文不卡死 | Phase 2：context profile registry 化 + 压缩执行闭环 + 长上下文金丝雀 | 双分支用例绿 + 金丝雀 passed + T-127 回归确认 |
| M3 产品可 run | Phase 3：Run Coordinator 异步自动推进（两条 lane + 单步 board）+ selection policy + 故障注入三件套 | 一次 advance 自动推完 lane A + 三件套绿 + ownership scan 绿 |
| M4 debate 按需 | Phase 4：复杂度档位 + DebatePolicy 注册 + debate kernel 抽取 + 试点升档 | 档位必检绿 + kernel 迁移对照绿 + 升档金丝雀 passed |
| M5 决策可记忆 | Phase 5：三记忆 families 写入/消费 + 负例 | 记忆必检绿 |
| M6 清债与 usage-fit | Phase 6：更名迁移 + 矩阵一致性脚本 + cost 接入 + golden rubric 首轮 | 更名后全门绿 + rubric 留档 |

## 排序原则
- M1 先行：manifest 是 M2/M4 的校验载体（context profile id、debate policy id 都挂 manifest 对账）。
- M2 与 M3 可并行：M2 是共享面（受 T-127 协调节奏影响），M3 是纯本域。
- M5 在 M4 后：复杂度信号消费记忆中的历史失败计数。
- M6 收尾：更名涉及全部脚本，放最后避免反复改 run id 前缀；usage-fit 需要 coordinator（M3）就绪。

## 回滚
每里程碑独立可回滚；压缩分支与档位升档均带特性开关，默认可退回 T-114 行为（全 blocked / 固定拓扑）。
