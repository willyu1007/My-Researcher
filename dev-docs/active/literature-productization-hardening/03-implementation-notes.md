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
