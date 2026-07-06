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
