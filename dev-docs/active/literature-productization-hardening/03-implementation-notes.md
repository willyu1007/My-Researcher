# 03 Implementation Notes

## 2026-07-07 立包
- 触发:文献域落地审查(四路并行);用户拍板开硬化包分级修 + L-10 自动衔接定为缺口。
- Phase 0:审查报告固化 06、清单 L-01..L-17、W-01..W-10 登记。

## 2026-07-07 W-01(P0):孤儿 run 恢复 + enqueue 原子化
- **L-01 修复(双路径)**:
  - 启动清扫:`PipelineOrchestrator.recoverOrphanedRuns()`——列全局 in-flight(新仓储方法 `listInFlightPipelineRuns`),逐个 `closePipelineRunAsOrphaned`(run→FAILED/`PIPELINE_RUN_ORPHANED` + 其 PENDING/RUNNING stage states→FAILED);经 `LiteratureFlowService.recoverOrphanedPipelineRuns()` 在 app.ts 启动钩子调用(与 backfill/fulltext-acq `resumeRunnableJobs` 同址)。单实例假设下启动时无合法 in-flight worker,故不设年龄门槛(注释成文);对进程内已知 runJobs 跳过。
  - 入队时效兜底:`enqueueRun` 改走 `createPipelineRunExclusive(record, staleBeforeIso)`,`ORPHANED_RUN_STALE_MS=15min`——超窗 in-flight 判孤儿关闭后放行新 run,窗内 in-flight 维持 SKIPPED 语义(兼多实例安全)。
- **L-02 修复(原子准入)**:仓储新方法 `createPipelineRunExclusive`——Prisma 侧交互式事务内 `pg_advisory_xact_lock(hashtext('literature-pipeline-run:'||literatureId))` 包裹「重查 in-flight → 关闭 stale → 插入」,锁随事务释放、零 schema 迁移(备选 partial unique index 记 02-architecture D2 不选);in-memory 侧方法体全同步(无 await 点)等价互斥。SKIPPED 标记 run 的创建仍在锁外(纯审计行,无竞态语义)。
- **改动面**:接口 +3 方法(`literature-repository.ts`,含 `LiteraturePipelineRunExclusiveCreateResult` 类型)、prisma pipeline store/repository 代理、in-memory 仓储、orchestrator、flow-service 包装、app.ts 钩子。行为变化仅限:stale 孤儿被关闭放行、并发双发其一必 SKIPPED;新鲜 in-flight 的 SKIPPED 语义与既有测试原样保留。
- **测试**:orchestrator 单测 4→8——stale 孤儿关闭放行(含 stage state FAILED 断言)、新鲜 in-flight 仍 SKIPPED、并发双 enqueue 恰一 PENDING 一 SKIPPED(stage 门闩挂起下)、启动清扫解锁后续 enqueue。

## 2026-07-07 设计对齐(P1/P2 关键决策,用户逐项拍板)
- W-03 ANN=halfvec 表达式索引(A);W-05 STALE=纳入但标记(b);W-06 自动衔接=AUTO_ADVANCE backfill job 形态+75/55 分档+默认关(按推荐);W-10 质量评估=改语义(b)。W-02/W-04/W-07/W-08 设计要点同轮呈报无异议。全部落 02-architecture D5-D8。

## 2026-07-07 W-02(P1):GROBID 生产姿态(L-03,按 D5)
- **超时/重试/分类**:主请求 `AbortSignal.timeout`(默认 120s,env `LITERATURE_GROBID_TIMEOUT_MS` 覆盖——settings 化归 W-10 配置面);超时(TimeoutError/AbortError)/连接失败/503 三类可重试,有界 1 次(500ms 间隔);诊断携带 `failure_class`(timeout/connection/http_503/http_error/circuit_open/health_probe_failed)与 attempts。
- **断路器**:复用 `LiteratureSourceRuntimeState`(source=`grobid`),失败 60s×count 上限 15min 指数退避(与 arxiv/unpaywall 同款);cooldown 窗内解析请求零网络调用 fast-block。**开闸判据**:仅"不可达类"(连接/超时/probe 失败/终态 503)开闸;服务可达的解析失败(4xx/NO_BLOCKS/204)反而重置(reachable=服务活着)。
- **健康门**:每次解析前 probe `/api/isalive`(5s 超时,健康结果缓存 30s)——down 端点 ~5s 内 block 而非挂满 120s,并记 `GROBID_HEALTH_PROBE_FAILED` 开闸。
- **激活条件**:D5 姿态以 runtimeStateStore 接线为激活条件——生产构造(artifact-runtime 传 repository)全量激活;裸构造(隔离测试/遗留)保持原直连行为,既有 2 测零改动=默认路径不变证据。**D5 偏差记录**:原文"执行前健康 probe"落实为解析入口内的 breaker+cached-probe 双门(同语义、单接缝),而非 flow-service 层独立门。
- **部署约定**:`docker-compose.literature.yml`(grobid 0.9.0-crf,:8070)+ 运行手册 `docs/context/env/literature-grobid.md`(启动/端点/健康/断路器语义/E2E 依赖)。
- **测试**:解析器单测 2→8——circuit-open 零请求 fast-block、probe 不健康 block+开闸、连接失败重试 1 次后开闸(attempts=2 钉)、timeout 分类 GROBID_TIMEOUT、503 重试后成功且断路器复位(READY/failureCount=0)、204→OCR 且不开闸。

## 2026-07-07 W-03(P1):pgvector ANN + 超时真取消(L-04,按 D6)
- **实测基线(索引前,26.16 万 vectors)**:exact 扫描 p50 **771ms** / p95 806ms(`.ai/.tmp/literature-pgvector-bench/w03-before-exact.json`)——规模风险坐实。
- **索引**:migration `20260707090000_add_literature_pgvector_halfvec_hnsw_index`——`hnsw ((("retrievalVector")::halfvec(3072)) halfvec_ip_ops) WITH (m=16, ef_construction=64)`,1830 MB。**D6 偏差记录**:未用 CONCURRENTLY(Prisma migration 事务内不可用;单实例假设下建索引写停可接受,migration 注释载明)。
- **查询重构(关键)**:原 SQL 为全表窗口函数形状(COUNT OVER + 全量 ROW_NUMBER),**结构上吃不到 ANN 索引**——重构为 knn 顶窗 CTE(双侧 halfvec cast 精确匹配索引表达式,over-fetch ×4 上限 5000)→ 窗内 per-literature cap → 计数改独立 btree 聚合查询;`SET LOCAL hnsw.ef_search`(≥100,随 candidateLimit)+ `hnsw.iterative_scan='relaxed_order'`(版本过滤丢弃与 LIMIT>ef_search 两种截断的保险)。
- **超时真取消**:`queryTimeoutMs` 穿仓储接口 → 事务内 `SET LOCAL statement_timeout`(DB 侧真正杀查询),57014 映射结构化错误码 `RETRIEVAL_PGVECTOR_TIMEOUT`;应用层 Promise.race 保留为 +1s 兜底(非 DB 停滞场景)。**实施教训**:Prisma 交互事务默认 5s 上限会先于 statement_timeout 掐断——事务 timeout 显式设为 max(statement_timeout,5s)+15s,使 DB 超时始终为约束项。
- **实测结果(索引后)**:ANN p50 **102.7ms** / p95 **150.9ms**(提速 p50 6.7×/p95 vs 冷峰 36×);**top-50 overlap vs exact = 99.8%**(半精度+hnsw 召回损失可忽略);真实版本过滤(1595 active versions)下 EXPLAIN 确认 `Index Scan using ..._halfvec_hnsw_idx`(外层 Incremental Sort 仅为 id 平局键的流式加序,LIMIT 有界)。证据:`w03-after-compare.json` + 基准脚本 `.ai/scripts/literature-pgvector-benchmark.mjs`(exact/ann/compare 三模式,SQL 形状与 store 同构、需同步维护)。
- **语义注记**:ANN 为近似检索,候选集与 exact 可有 ≤0.2% 差异;evaluator 临时库走 `prisma db push`(不含 raw migration 索引)故其指标仍量的是 exact 行为——ANN 质量证据以本切片 overlap 对比为准。候选窗/权重 settings 化仍归 W-10(D6 载明项拆解)。
- **D6 偏差二**:`ef_search`/`iterative_scan` 为 store 内派生常量(随 candidateLimit),未单列 env——W-10 统一配置面。
