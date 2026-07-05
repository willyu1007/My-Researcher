# Roadmap

## Why This Exists
- T-123（选题管理产品化加固）把模块从"政策/契约完备"推进到"产品可 run":SSOT 对齐、参数规范化、Run Coordinator、N8 有界 debate、Decision Memory、per-provider token 校准均已落地。**T-123 于 2026-06-16 收尾关闭归档,其 F-11 拆分线与 DP-3.3 标定线所有权移交本包 W-12 / W-13**（D7,避免双轨）。
- 2026-06-16 复盘暴露三类待办:① 后端仍有**未落地工作树残留 + 编排层故障恢复缺口 + 准入层单测空白 + provisional 产品门禁语义未明**(夯实后端);② 既预埋但未实装的**能力扩展**(v1b N6 debate reserved、v1c recheck record-only、provider-diverse profile 加法位);③ 工作台**人审面虽已建成**但有数据迁移 + 文档化收口缺口。
- 本任务包按用户对齐次序（**先夯实后端 → 拆透 harness → B → C → D**）统一收口,单一伞型治理、配齐完备测试。关键取向:**不留技术债务**——harness 一次拆透、N6 debate 做完整运行时。

## Target Outcome
- **后端可信赖**:工作树零残留;coordinator 对 feedback 工件缺失 / upstream-blocked / node_timeout 返回结构化 halt;~12 准入/运行时 service 有单测护栏;N8 provisional 阈值有显式产品门禁语义。
- **harness 清晰可维护**:12.9k 行单文件一次拆透至壳（生命周期 + 持久化）,纯函数簇出文件,行为/哈希不变——本次与后续开发都落在模块化结构。
- **能力扩展落地**:v1b N6 完整 debate 运行时（触发→真跑→准入→正常继续,非半成品）;v1c recheck 以建议性发射呈现而不破坏前向唯一;provider-diverse debate 角色 profile 加法可用。
- **工作台收口**:只读节点语义文档化、旧 option-set 数据迁移消除 409、gate 拒绝 UX 清晰。
- **标定姿态明确**:N8 阈值 record-and-defer——维持 provisional + 签核门,scaffold 就绪,待真实语料再标定（mock 不充真阈值）。

## Exit Criteria
### 核心段（Phase 0–4,阻塞 sign-off）
- 工作树无 T-127/T-123 未落地残留;并行 session 文件零触碰。
- Coordinator 故障恢复三类边界负例全绿且返回结构化 halt;人审 nonce 守卫生效。
- harness 一次拆透:每 slice replay-identity 守卫 + 全套件 + replay 幂等对比全绿;壳仅余生命周期 + 持久化。
- v1b N6 debate full runtime 全链 e2e 绿（含触发后正常继续 + 不触发回归）+ D-T127-02 登记 + 矩阵 reserved→implemented + T-089 留痕 + harness replay byte-identity 保持。
- **T-108 v1c 前向唯一不变量回归绿**（W-08 仅建议性发射,无回环）。
- 工作台 `n4_handoff_hash` backfill 后旧 option-set 人审 N5 不再 409;desktop typecheck + UI gate 0/0。
- 既有不变量回归全绿:v1b legacy write 仍 404;`mocked_llm` 在 product run_mode 被拒;replay 幂等;人审 human_delegated 与 runtime 兼容共存。
### 延期尾巴（Phase 5,不阻塞核心）
- W-13 标定姿态登记 record-and-defer;N8 维持 provisional + tripwire;真实语料达标前不翻 `provisional:false`、不以 mock 充真阈值。

## Milestones
- **M0** 后端夯实:落地工作树残留 + N11 recipe + 代码卫生（Phase 0,W-01..W-03）
- **M1** 后端鲁棒性:coordinator 故障恢复 + 准入单测 + provisional 门禁形式化（Phase 1,W-04..W-06）
- **M2** 复杂度治理 / 选项 A:harness 一次拆透（Phase 2,W-12,承 D-T123-03,**提前至 B 之前**）
- **M3** 能力扩展 / 选项 B:N6 完整 debate 运行时 + v1c recheck 建议性发射 + provider-diverse profile（Phase 3,W-07..W-09）
- **M4** 工作台产品化收口 / 选项 C:收口审计 + 只读文档化 + 数据迁移（Phase 4,W-10..W-11）← **核心段 sign-off**
- **M5** 阈值标定 / 选项 D:DP-3.3 N8 阈值标定 record-and-defer（Phase 5,W-13,语料门控,**延期尾巴**）

## Rollback Posture
- Phase 0 多为提交/文档/最小修复,可单独回滚;W-01 仅落地既有 T-123 改动,零新行为。
- Phase 2 拆透为机械重构,依赖拆分前后全套件 + replay byte-identity 对比保护,任一 byte-bearing 哈希漂移即回滚该 slice。
- Phase 1 coordinator 补强为防御性加法（结构化 halt 替代 500）,关闭新校验即回退;准入单测纯加法。
- Phase 3 N6 debate 默认信号触发,回退 = 触发器恒 false / scenario 不注册（DMP-03 即恢复 blocked）;W-08 建议性发射回退 = 不发射记录;W-09 profile 纯加法。
- Phase 4 收口为文档 + 数据迁移;迁移脚本幂等可重跑,回退 = 旧 option-set 维持 409（与现状一致）。
- Phase 5 标定为离线工具产出 + 数据驱动阈值更新;不达标即维持 provisional,零产品风险。
