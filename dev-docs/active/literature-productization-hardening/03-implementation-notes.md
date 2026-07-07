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

## 2026-07-07 W-04(P1):embedding 成本计费修复 + 请求分批(L-05+L-08)
- **L-05 成本 bug 双点修**:①`computeLlmCostUsd` 支持 input-only 计费——定价条目 `output_usd_per_mtok: null` 时仅按输入计费;守卫:若响应竟报正数 output tokens 而无 output 费率,保持 null 不少计。②定价表登记 `text-embedding-3-large` $0.13/M、`text-embedding-3-small` $0.02/M(output null);③gateway 遥测对无 prompt(embedding)调用的 cost 入参回退 `inputTokens ?? totalTokens`。**JD 判定**:llm-gateway 非 D-T128-00 所列 harness 面(壳/节点体/orchestrator 边界/debate-core/压缩 orchestrator),纯加法计费逻辑,无需 JD;留此判定。
- **L-08 分批**:纯函数 `splitEmbeddingInputBatches`(utils,item 上限 2048、保守 token 预算 200k=chars/3 高估;超大单条独立成批由 provider 明确拒绝而非整篇失败);`embedChunksViaGateway` 循环批次(顺序执行,任一批失败=EMBEDDED 阶段失败,保持阶段原子性、重跑 checksum 幂等)+ 遥测聚合(计数/耗时求和,token/cost null-poisoning 求和,身份取首批)。

## 2026-07-08 W-06(P1):导入→管线自动衔接(L-10,按 D8)
- **形态**:新 `LiteratureAutoAdvanceService`——auto-pull run 收尾(带逐条质量分)与 collectionImport/Zotero 控制器批尾(无分,按 `advance_unscored` 设置,默认 none)调用 `advanceAfterImport`;按质量分档创建 **AUTO_ADVANCE backfill job**(≥75 → target INDEXED 全链;55–75 → target FULLTEXT_PREPROCESSED 止;<55 不动;仅 `is_new` 新入库),白捡 backfill 并发 clamp/取消/断点/宕机重入;orchestrator 单飞闸不动。
- **成本闸**:日预算(默认 50 篇/日,UTC 日界)——扫当日 `options.trigger='auto_advance'` 的 job 计数(totals.total),高档优先占额,超额记 `skipped_daily_limit`;job 级 `max_parallel_literature_runs`(默认 2)。**总开关默认 OFF**:settings 行 `literature_content_processing/auto_advance`(轻量 resolver `resolveAutoAdvanceSettings`,含 clamp;聚合 DTO/更新路由面归 W-10——D8 偏差留痕:运行时开关经 settings 行写入即可生效,满足灰度要求)。
- **不破坏导入**:服务永不抛(错误进 outcome);auto-pull 侧 outcome 记入 run summary `auto_advance` 字段可审计;控制器侧不改响应契约。
- **契约加法**:`LiteratureContentProcessingBackfillOptions.trigger?: 'manual'|'auto_advance'`(schema 同步,default manual)——job 记录携带 provenance 供日预算统计与 UI 区分。
- **T-029 边界修订(正式)**:「collection 不触发 processing」→「collection 可经显式闸门**编排**处理任务(默认关)」;W-08 文献 SSOT 落表时载明。
- **测试**:服务单测 6/6——disabled 空转、三档分流+not_new/unscored 计数、日预算(高档优先+昨日/manual job 不占额)、unscored=fulltext 路由、createJob 抛错不外溢。

## 2026-07-08 W-05(P1):retrieval-ready 单一事实源 + STALE 传播(L-06,按 D7)
- **单一事实源**:`LiteratureEvidenceActivationService.resolveRetrievalReadiness(ids) → Map<id, {ready, reason, freshness, freshness_detail}>` 成为"retrieval-ready"唯一计算点——判定链 QUALITY_NOT_ACTIVE → KEY_CONTENT_NOT_READY → INDEX_NOT_ACTIVE → EVIDENCE_READY;freshness 取 **INDEXED 阶段 STALE**(所有内容失效链——citation/abstract/raw_fulltext/dossier——最终都打 INDEXED stale,故它是"上游已变、工件未重算"的并集信号),detail 透传 stage.detail 的 reason_code/reason_message。`isEvidenceReady`(单条)与 `filterEvidenceReadyLiteratureIds`(过滤)均改为该函数的薄壳,消灭并行判定。
- **D7 语义**:stale **不出局**——ready 与 freshness 正交,过滤器照常放行 stale 文献,仅标记随行。
- **检索消费**:`literature-retrieval-service.resolveFreshnessWarnings` 弃自查 stage states,改读 readiness map(freshness_warnings 输出契约不变);evidence-ready 过滤经 filterEvidenceReadyLiteratureIds 已传递单源。
- **选题采样消费**:`TopicSelectionResourceSamplingService` 新注入点 `retrievalReadinessResolver`(窄结构类型,选题域不 import 文献服务;app.ts 接线到 resolveRetrievalReadiness)。选中样本(selectedItems 去重)批量查询:stale 项落 audit `guardrail_summary.retrieval_freshness = {checked, checked_count, stale_count, stale[]}` 并追加 audit `warning_codes` `STALE_EVIDENCE_SAMPLED`;**sample_set.warnings 不动**(不引入行为闸,仅审计可见)。resolver 失败不炸采样——错误记入 retrieval_freshness `{checked:false, error_message}`。**资格规则零改动**:`eligibilityExclusionReason`(keyContentReady 等)保持原样。
- **UI 三方之三(判定留痕,不改 DTO)**:文献 overview 已由 `buildPipelineStateDTO(record, stageStates)` 携带全部 7 阶段 per-stage 状态(含 STALE)直达 UI——UI 消费的是同一底层事实(stage states),粒度为单源函数的超集,无需再走 readiness 函数;等价关系:全 7 阶段 SUCCEEDED ⇔ ready && fresh。
- **JD 判定**:采样服务改动为选题域节点体外围(构造注入 + audit 富化),不触 harness 壳/orchestrator 边界/debate-core;evidence-activation/retrieval 属文献域。无需 JD,留此判定。
- **契约影响**:零 shared 契约变更——audit `guardrail_summary` 本为开放 `Record<string, unknown>`,`warning_codes` 为 string[]。

## 2026-07-08 W-07(P1):测试与事务性(L-07+L-09+W-01 跟进)
- **a)L-09 导入韧性**(commit 912b8de7):
  - **P2002→409**:prisma core store `createLiterature`/`updateLiterature` 捕获 P2002 → `AppError(409, VERSION_CONFLICT, {literature_id, constraint})`——读后写去重竞态撞 DB 唯一约束(doiNormalized/arxivId/titleAuthorsYearHash)不再裸 500;非 P2002 原样透传。
  - **批内隔离**:`collectionImport` 单条失败进 `failures[]`(request_index/title/error_code/error_message),批继续;**全部失败保留抛错语义**(单条直接导入行为不变)。结果契约加法:`LiteratureCollectionImportResult.request_index`(必填)+ `LiteratureCollectionImportResponse.failures?`。
  - **配对修正**:auto-pull 三处 `results[i]↔selectedCandidates[i]` 位置配对改 `selectedCandidates[result.request_index]`——部分失败下数组错位导致错分/错记质量分的隐患一并封死(W-06 auto-advance 配对同修)。
  - **事务边界判定留痕**:条目内写序 literature→source→flow-state 保持非事务——中途失败留下的半成品经 dedup 可自愈(重导补 source),真·条目级事务需把 tx 贯穿 LiteratureService/FlowService/EvidenceActivation 三层,收益不抵改造面,defer(如后续需要归 W-10 之后再议)。
- **b)L-07 fulltext-acquisition 单测 0→11**(commit 0d87f1ab):计划面(blocker 分类/选源优先级/资产跳过+force_refresh)+ 执行面(预算闸/happy path/失败分类/retryFailed 三态/pause-resume/cancel/宕机重入 requeue/unpaywall OA-429-无PDF 三路/全阻塞即 FAILED)。**夹具教训**:可重试失败记 source cooldown(60s×n),会拖住同 job 后续条目的 pacing——记 cooldown 的失败项须排序在最后,或测前清 cooldown。
- **c)W-01 真库并发注入跟进**(实锤一个生产 bug):新 env-gated e2e `prisma-literature-pipeline-lock.e2e.test.ts`(`RUN_LITERATURE_PIPELINE_LOCK_E2E=1`,默认套件 skip)——8 并发 `createPipelineRunExclusive` 恰 1 created + 7 in_flight 指向同一 winner;陈旧化后 takeover 关旧 run 为 PIPELINE_RUN_ORPHANED。**首跑即抓到 W-01 落地 bug**:`pg_advisory_xact_lock` 返回 Postgres `void`,Prisma 5.22 `$queryRaw` 反序列化直接抛错——生产锁路径其实一跑就炸,in-memory 测试盖不到。修法:`::text` cast(留注释)。这正是把"真库并发注入"列为跟进项的价值证明。

## 2026-07-08 W-08(P2):文献管线 SSOT 矩阵 + 一致性守卫(L-12,兼收 L-16 两处)
- **SSOT 落位**:`docs/context/process/literature-pipeline-matrix.md`(仿选题域 workflow-matrix 形制)——七阶段矩阵(执行器/输入/产物/就绪信号)、阶段状态词汇(8 态)、**失效链表**(6 条 reason_code → stale 阶段集合)、触发源、Pre-stage 域边界、retrieval-readiness 消费侧指针、Machine-Check Contract 自述。
- **一致性脚本**:`.ai/scripts/literature-pipeline-matrix-consistency.mjs` + 套件 wrapper(`literature-pipeline-matrix-consistency.unit.test.ts`,check+self-test 双测)。校验:①阶段码集合+顺序(矩阵⇔contracts);②**L-12 双写守卫**(flow-service `PIPELINE_STAGE_CODES` ⇔ contracts 逐项相等,`DEEP_PIPELINE_STAGES` 必须为连续后缀);③状态/触发源词汇;④**失效链**(代码 `markStagesStale` 调用点字面量 ⇔ 矩阵行集合相等,双向缺失报错,同 reason 多调用点集合冲突报错);⑤结构性 D7 断言:每条链必含 INDEXED(并集新鲜度信号的守卫);⑥行形状守卫。自测负例 7 个(乱序/双写漂移/丢 INDEXED/未登记链/词汇漂移/缺格)。
- **T-029 边界修订正式落表**:collection「可经显式闸门编排处理任务(AUTO_ADVANCE,默认关)」;fulltext acquisition **非阶段码**归属点破(L-16 ②);KEY_CONTENT_READY 方法优先级代码语义载明(L-16 ⑥)。
- **判定留痕**:失效链校验用 regex 抽代码字面量,属"字面量钉"级守卫(与选题域 rs 节点 id 双源字面量同风格)——重构 markStagesStale 调用形状时脚本会 fail-closed(抽取<4 条即报错),不会静默失效。文档散文列不校验,载明于矩阵 Machine-Check 节。

## 2026-07-08 W-09(P2):清理/注册表/文档对齐(L-13+L-14+L-15+L-16,按 D9)——逐项处置台账
- **①Discovery 死表删除(L-13,D9,做)**:dry-run 留痕——全仓 grep 零代码消费方(仅 schema relations);真库 119 batches / 2312 candidates,最新写入 2026-06-17(早于 T-130,代码中已无写入方)=纯历史导入痕迹。migration `20260708120000_drop_literature_discovery_tables`(注释载明证据锚)已 deploy;schema 两 model + LiteratureRecord 两 relation 字段移除;`prisma validate` 通过 + client 重新生成。
- **②Token index 停写+废弃(L-13,D9,做)**:`literature-flow-artifact-runtime.ts` 激活路径删除 `replaceEmbeddingTokenIndexes` 写入(tokenCount 仍从 indexed artifact 派生);schema `LiteratureEmbeddingTokenIndex` 标 `/// DEPRECATED`(观察一版后另行删表);仓储接口与方法保留(deprecated 不拆管)。**测试语义更新**:flow-service 两处"token 行>0"断言反转为=0(留 D9 注释);原"token 写失败→active 指针不动"守卫测试改注入点为 `updateEmbeddingVersion(status=INDEXED)` 失败——同一意图(INDEXED 中途失败指针不回退)换失效点,22/22 全绿。
- **③错误码注册表(L-14,做+增量)**:shared contracts 新增 `LITERATURE_FULLTEXT_ACQUISITION_NON_RETRYABLE_ERROR_CODES` / `LITERATURE_BACKFILL_NON_RETRYABLE_ERROR_CODES` / `LITERATURE_BACKFILL_SKIP_REASONS`(+类型);acquisition 与 backfill 两服务的局部 NON_RETRYABLE Set 改从注册表构造。**范围判定**:先收敛"跨服务边界"码集(retry 分类/job DTO 语义),全域散码(INVALID_PAYLOAD 类通用码、GROBID failure_class 等)增量收敛,不做一次性大扫——避免为登记而登记。
- **④backfill 静默跳过区分(L-15-8a,做)**:`planLiteratureItem` 的 null 返回改显式 `BackfillPlanSkip {skip_reason: ALL_STAGES_CURRENT | STAGE_FILTER_EXCLUDED}`——retry 路径 SKIPPED item 的 errorCode 携带区分(原统一 NO_BACKFILL_WORK_REMAINING);dry-run estimate 新增可选字段 `skipped_filter_excluded_count`(契约加法)。钉测:FAILED 阶段+failed 过滤关 → 计入 filter_excluded。
- **⑤citation 失效链意图注释(L-15-6,做)**:两处调用点(元数据编辑/collection 导入)补"为何跳过 ABSTRACT_READY/FULLTEXT_PREPROCESSED"注释(可信摘要独立信任决策、fulltext 派生自 raw 资产,均不依赖引文身份);集合钉由 W-08 矩阵脚本承担。
- **⑥文档漂移(L-16,做)**:③引用分裂——ingestion 00-overview「boundary from T-041」改指 T-029(含 T-130 修订)+矩阵 SSOT;codex_curated 半自动回填语义与 parser 评分权重硬编码注记落矩阵(W-10 收 settings 时更新)。
- **⑦defer 留痕(不做,已登记)**:(a)`shadow_pgvector` 子状态引用仅存于 dev-docs/archive(历史留痕本体),判定无需改;(b)KEY_CONTENT_READY BLOCKED 无超时/告警托底(L-15-3)——矩阵备注列已载明缺口,处置归 W-10 之后(告警/超时属运维托底面);(c)历史 pipeline run 无清理(L-15-8b)——现 cleanupDryRun 只盖 embedding versions,run 记录清理为新 API 面,defer(W-10 后独立小切片或并入运维面),不静默。