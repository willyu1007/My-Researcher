# 02 Architecture(关键设计决策,随切片补充)

## D1 孤儿 run 恢复(W-01)
- 单实例部署假设(与 auto-pull scheduler 一致)下,启动清扫可安全关闭全部遗留 in-flight run;为兼容未来多实例,入队路径同时做 stale 阈值兜底(updatedAt 超阈值才判孤儿)。阈值取常量(初值 15min),W-10 再议配置面。

## D2 enqueue 互斥(W-01)
- 方案:`pg_advisory_xact_lock(hashtext('lit-pipeline:'||literatureId))` 包裹「查 in-flight + 插入」事务——零 schema 迁移、锁随事务释放;in-memory 仓储以进程内 keyed-mutex 等价。备选(部分唯一索引)记录但不选:Prisma 不原生支持 partial unique,raw migration 维护成本高。

## D3 retrieval-ready 单一化(W-05,待定稿)
- 候选:以 `LiteratureEvidenceActivationService.isEvidenceReady` 为唯一函数,扩展 STALE 语义(fresh|stale_ok|blocked 三态?),UI 的 process_to_retrievable 与选题 eligibility 改为消费方。STALE 对选题采样是排除还是降权,留用户裁决。

## D4 自动衔接(W-06,设计先行)
- 触发点:collectionImport 成功后按规则入队(非 auto-pull 内部),规则=质量门(auto-pull 分≥阈值)+成本闸(日预算/并发限流,复用 backfill limiter)+全局开关(settings,默认关,灰度开)。与 T-029「collection 不触发 processing」边界决策的关系:本包显式修订该边界并留痕,不静默背离。

## D5 GROBID 生产姿态(W-02,2026-07-07 对齐)
- 超时 `AbortSignal.timeout`(默认 120s,settings 可调)+ 1 次有界重试;错误三分类(连接/超时/HTTP 非 200)。
- 断路器**复用** `LiteratureSourceRuntimeState`(GROBID 作为 source 登记,与 arxiv/unpaywall 同款指数退避 cooldown)。
- `FULLTEXT_PREPROCESSED` 执行前健康 probe(~30s 缓存),不健康快速 block `FULLTEXT_PARSER_UNAVAILABLE`(资产回退语义已有)。
- 部署约定:repo 内 `docker-compose.literature.yml`(grobid 0.9.0-crf, :8070)+ 运行手册;不做 app 内自动拉起。

## D6 pgvector ANN 路线 = halfvec 表达式索引(W-03,用户拍板 2026-07-07)
- **硬约束**:pgvector hnsw/ivfflat 对 `vector` 上限 2000 维,现存 `vector(3072)` 不能直建 ANN。
- 选定路线 A:`hnsw ((retrievalVector::halfvec(3072)) halfvec_ip_ops)` 表达式索引 + 查询侧同 cast——零重嵌入、一次 migration;备选 B(降维重嵌)留模型升级时顺带,C(维持暴力)否决。
- 配套:先实测 26 万 chunk 现库延迟基线留痕(索引前后对比=决策证据);`statement_timeout` 真取消(替换 Promise.race 假超时)+ 结构化错误码;候选窗/权重/超时入 settings。
- migration 注意:CREATE INDEX CONCURRENTLY(避免写锁),dry-run 留痕再 apply。

## D7 STALE 语义 = 纳入但标记(W-05,用户拍板 2026-07-07)
- 单一事实源:`resolveRetrievalReadiness() → { ready, freshness: 'fresh'|'stale', reasons[] }`(由 isEvidenceReady 扩展);UI `process_to_retrievable`、检索过滤、选题采样 eligibility 三方改为消费方。
- STALE 文献照常可采样/可检索,但 freshness 标记必须穿透:采样审计工件、检索 freshness_warnings、选题产物 provenance 可见——可追溯不排除。

## D8 自动衔接设计(W-06,用户拍板 2026-07-07)+ 质量评估改语义(W-10)
- 触发形态:auto-pull run 收尾/collectionImport 批尾,对「本次导入且过质量门」文献**自动创建 AUTO_ADVANCE backfill job**(非逐篇 enqueue)——复用 backfill 限流/取消/断点/宕机重入;orchestrator 单飞闸不变。
- 质量门分档:≥75 全链;55–75 推进至 FULLTEXT_PREPROCESSED 止(KEY_CONTENT 默认 codex_curated 天然人工停点,免 LLM/嵌入成本);<55 不动。
- 成本闸:日自动推进篇数上限 + job 并发 clamp,入 settings;总开关 `literature_auto_advance.enabled` 默认 **false** 灰度。
- 边界修订:T-029「collection 不触发 processing」→「collection 经闸门**编排**处理任务」,T-130 留痕 + 文献 SSOT(W-08)载明。
- W-10:indexed 兜底分改语义为 `processing_complete` 标记,qualityStatus 收窄 auto-pull/人工两来源,evidence-ready 判定不吃伪高分;真实内容打分记 backlog。
