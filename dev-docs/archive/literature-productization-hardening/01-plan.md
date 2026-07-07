# 01 Plan

## Phase 0 — 立包与证据固化(本切片)
- 四路审查报告固化为 `06-productization-audit.md`;问题清单 L-01..L-17 与 workstreams W-01..W-10 登记 00。

## Phase 1 — W-01(P0)
- 孤儿 run 恢复:orchestrator 启动清扫(单实例假设下关闭全部遗留 PENDING/RUNNING → FAILED `PIPELINE_RUN_ORPHANED`)+ 入队时效兜底(in-flight run 超过 stale 阈值视为孤儿关闭后继续),双路径。
- enqueue 原子化:Postgres advisory lock(按 literatureId 哈希)包裹 check+insert;in-memory 仓储用进程内互斥等价语义。
- 负例:并发 enqueue 注入、崩溃后重启恢复、stale 阈值边界。

## Phase 2 — W-02..W-07(P1,每 W 一切片,顺序可按依赖微调)
- W-02 GROBID:AbortSignal 超时+有界重试+断路器(冷却窗)+执行前健康门禁;部署约定文档(compose 样例或运行手册)。
- W-03 pgvector:26 万 chunk 实测延迟基线→决定 hnsw/ivfflat;statement_timeout/查询取消;候选窗/权重入 settings。
- W-04 embedding:gateway usage 解析允许无 output_tokens 计费+定价表登记;请求按 provider 限制分批。
- W-05 retrieval-ready:单一判定函数(含 STALE 语义决策:阻断还是降级标记)+选题采样消费。
- W-06 自动衔接:设计文档先行(触发规则/质量门/成本闸/开关),用户过目后实施。
- W-07 测试与事务:fulltext-acq 单测套件;P2002→409;collectionImport 事务边界。

## Phase 3 — W-08..W-10(P2)
- W-08 文献阶段 SSOT 矩阵(docs/context/process/)+ 一致性脚本进默认套件。
- W-09 清理:Discovery 表/token index 处置、错误码注册表、文档漂移修正。
- W-10 质量评估真实化(用户裁决点:真实打分 vs 显式改名为完成度标记)+ 配置面。

## 纪律
- 小切片:实施-验证-留痕-commit;push 逐批授权。
- 触碰共享 llm-gateway(W-04)前查 T-088 06 JD 面(gateway 非 harness 本体,预计无需 JD,留痕判定)。
- 迁移类改动(W-03 索引)先 dry-run 留痕再 apply。

## 排期修订(2026-07-08,全量绿锚 1687/1652/0/35 后)
W-01..W-04 已收口(+D5..D8 设计对齐)。剩余按价值序 6 切片:
1. **W-06 自动衔接**(产品缺口,D8 已定)→ 2. **W-05 retrieval-ready 单一化+STALE 传播**(D-30 收敛后解锁,触选题采样)→ 3. **W-07 测试与事务性**(含 W-01 真库并发注入跟进)→ 4. **W-08 文献 SSOT 矩阵+守卫脚本** → 5. **W-09 清理与文档**(死资产处置按 D9)→ 6. **W-10 质量语义+统一配置面**(收敛全部"归 W-10"尾巴)。
