# 06 Productization Audit(2026-07-07,四路并行审查固化)

方法:四个并行只读代理——①阶段/节点权威清单(设计↔代码对照)②采集半边逐节点③内容/检索半边逐节点④编排与衔接。本文件为固化摘录(含全部结论与锚点);L-01..L-17 编号见 00。

## §1 阶段/节点权威结构

- 代码权威 = T-031 七阶段模型:`CITATION_NORMALIZED → ABSTRACT_READY → FULLTEXT_PREPROCESSED → KEY_CONTENT_READY → CHUNKED → EMBEDDED → INDEXED`(`literature-contracts.ts:41-49`;执行序列双写于 `literature-flow-service.ts:50-58`,无一致性脚本→L-12)。
- discovery/import、dedupe、fulltext acquisition 是 **T-029 刻意切开的前置域**(collection 不触发 processing),fulltext acquisition 是独立 Job/Item 批处理域而非阶段码;retrieval/activation 为后置消费层。
- 设计↔代码不一致 6 处:①`LiteratureDiscoveryBatch/Candidate` 死 schema(零服务引用,L-13);②fulltext acquisition 阶段归属在两份文档中表述位次不同且未点破非阶段码(L-16);③边界决策任务号引用分裂(T-029 vs T-041,L-16);④pgvector rollout 子状态(`shadow_pgvector` 等)已清理未标废弃(L-16);⑤阶段序列双写无守卫(L-12);⑥KEY_CONTENT_READY 方法优先级(`preferredMethod!=='llm_gateway'` 强制人工/codex dossier)只存在于代码(L-16)。

## §2 采集半边逐节点判定

| 节点 | 判定 | 核心缺口 |
|---|---|---|
| auto-pull(service+scheduler) | ready_with_gaps | source runtime status 裸 string 双处重复;调度器无跨实例锁(单实例假设未声明,L-17);错误分类靠 message 嗅探 429/401/403;crossref/arxiv/zotero fetch 硬编码 URL 且无超时;settings service 无独立单测 |
| 身份/去重(work-identity) | ready_with_gaps | 读后写无事务,并发同 DOI 依赖 DB 唯一约束兜底但**无 P2002→409 映射**(L-09);无并发竞态测试 |
| 记录入库(collectionImport) | ready_with_gaps | 批量顺序处理、无事务边界、单条抛错中断整批(部分成功语义只在 auto-pull 上层,L-09);合并策略/stale 触发规则未文档化 |
| fulltext 采集 | **acceptance_only** | 运行时成熟(9 态 Job 状态机/NON_RETRYABLE 码集/cooldown 退避/预算闸/`requeueInterruptedRunningItems` 宕机重入)但 **1149 行零单测**(L-07);仅 Unpaywall 有 30s 超时 |
| 解析(GROBID+file store) | **acceptance_only**(部署/错误路径) | 单次 fetch 无超时/重试/断路器(`literature-grobid-fulltext-parser.ts:87-106`);无 source_health 接入;endpoint 默认 `localhost:8070`,全仓无 compose/启动脚本;健康检查端点(`/settings/.../fulltext-parser/health`)存在但不做执行门禁(L-03);评分权重(0.35/0.20/...)与阈值(0.8/0.55)硬编码无文档;file store 非原子写、无并发保护;错误路径(UNAVAILABLE/OCR_REQUIRED/503)零测试 |
| abstract/citation profile | ready_with_gaps | 纯计算幂等,无独立单测(靠 flow-service 集成测试间接盖);契约类型散在 repository 层 |

## §3 内容/检索半边逐节点判定

| 节点 | 判定 | 核心缺口 |
|---|---|---|
| key-content 提取 | ready_with_gaps | 默认 `codex_curated` 绕过 LLM 服务、依赖外部回填(半自动语义无文档,L-16);错误码服务局部字符串(L-14);llm_gateway 路径本身 11 单测扎实 |
| chunking | ready_with_gaps | 规则式,section 文本 `slice(0,4000)` 硬截断(`literature-flow-artifact-runtime.ts:1323`),无 size/overlap 配置;chunk_id 内容哈希天然幂等 |
| embedding 版本/成本 | ready_with_gaps | **cost_usd 结构性恒 null**:`computeLlmCostUsd` 要求 output_tokens 非空而 embeddings 无 completion_tokens + `config/llm-pricing.json` 未登记 embedding 模型(L-05);整篇 chunks 单请求无分批(L-08);模型默认注册化但 `text-embedding-3-large` 兜底字面量散落三处;无批量迁移编排器(记 backlog) |
| token index | **acceptance_only** | **写而不读**:`listEmbeddingTokenIndexesByEmbeddingVersionId` 生产零调用方,检索走实时重分词(L-13) |
| pgvector 检索 | ready_with_gaps | **无 ivfflat/hnsw(migration 零命中),`<#>` 精确暴力扫描**;设计文档自认未解 exact-scan 瓶颈、ANN 留待实测,从未落地;验证规模 ~2.48 万 chunk vs 当前库 26 万(L-04);`withPgvectorCandidateTimeout` 仅 Promise.race 不取消 DB 查询、裸 Error 无码;权重/候选窗/超时全代码常量(phase-5 曾刻意固化,L-17) |
| 质量评估 | ready_with_gaps | `ensureIndexedAssessment` 硬编码 `qualityScore:100`/`high_confidence` 兜底,非实质度量;55/75 阈值硬编码(L-11) |
| 聚类 | ready_with_gaps | 0.82/0.86 置信度硬编码;错误码笼统 `INVALID_PAYLOAD`;10 单测覆盖状态机 |
| evidence activation | **production_ready** | 三门槛 + 结构化 reason(`QUALITY_NOT_ACTIVE`/`KEY_CONTENT_NOT_READY`/`INDEX_NOT_ACTIVE`),幂等 |
| backfill | **production_ready** | 状态机/断点续跑/宕机重入/取消暂停/并发 clamp 完整,17 单测;`WAITING_FOR_DOSSIER` 显式暴露半自动等待 |

## §4 编排与衔接

- **推进机制**:显式触发(POST route / backfill)+ 进程内 `Map` 异步 job,无持久化队列、无事件总线;orchestrator 阶段无关,序列由调用方 `PIPELINE_STAGE_CODES` 决定;auto-pull 与管线完全解耦(导入只 `recordCollectionUpserted` 建 scaffold,L-10)。
- **衔接契约**:PipelineState 信号位 + 各阶段手写前置(`isStageUsable`:SUCCEEDED|STALE 均算可用)+ artifact checksum 传递;失效链完整(citation/abstract/raw_fulltext/dossier 变更→下游 STALE)但 citation 链跳过 ABSTRACT/FULLTEXT 无注释无钉测(L-15)。
- **衔接缺口表**(编号对应 00 的 L):

| # | 缺口 | 证据 | L |
|---|---|---|---|
| 1 | enqueue read-then-write 竞态,无唯一约束/锁 | `pipeline-orchestrator.ts:43-64`;schema 无 unique | L-02 |
| 2 | 裸 run 崩溃后永久 RUNNING→single-flight 永久拒绝该文献 | orchestrator 无恢复;对比 backfill `:93-100,1001-1054` | L-01 |
| 3 | KEY_CONTENT_READY BLOCKED 等人工无超时/告警托底 | `literature-flow-service.ts:1172-1183` | L-15 |
| 4 | retrieval-ready 双定义(UI 全阶段 SUCCEEDED vs isEvidenceReady),STALE 下矛盾 | `:996-999` vs `literature-evidence-activation-service.ts:227-243` | L-06 |
| 5 | STALE 视为可用静默复用;选题采样不感知 STALE(只查 keyContentReady) | `:1441-1443`;`topic-selection-resource-sampling-service.ts:527-546` | L-06 |
| 6 | citation 失效链跳过两阶段,意图未验证 | `literature-service.ts:901-908` | L-15 |
| 7 | auto-pull 不驱动管线(用户定为缺口) | `literature-service.ts:241-244` | L-10 |
| 8 | backfill retry stage-filter 静默跳过无区分;历史 run 无清理 | `literature-backfill-service.ts:534-595` | L-15 |

- **跨域衔接**:选题采样 eligibility 只查 `keyContentReady||keyContentDigest`(不查 chunked/embedded/indexed);检索消费方走 `isEvidenceReady`(quality+keyContentReady+激活版本)——两套"可消费"定义由不同 owner 维护(L-06)。
