# 00 Overview

## Status
- State: archived(2026-07-08 收口——W-01..W-10 全部 DONE,全量套件绿锚 1716/1680/0/36)
- Task ID: `T-130`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-009`
- Trigger: 2026-07-07 文献管理域落地审查(四路并行:阶段清单/采集半边/内容检索半边/编排衔接,全记录 `06-productization-audit.md`)——结论「验收级成熟、生产级有洞」:主链路真实可跑(1540 条语料由其产出),但存在死锁级缺陷、外部依赖生产姿态缺失、遥测逻辑 bug 与一批定义不清。
- 用户决策(2026-07-07):①开硬化包分级修(P0→P1→P2);②审查衔接项 7(auto-pull 导入后不自动触发管线)**定性为缺口**,要求自动化推进——纳入 L-10。

## Mission
把文献管理域从「验收级」推进到「生产级」:修死锁与竞态、补外部依赖生产姿态(GROBID/pgvector/OpenAI embeddings)、统一 retrieval-ready 语义并传播 STALE、建立与选题域同级的阶段 SSOT 机器守卫、实现导入→retrieval-ready 的自动衔接。

## Audit Findings(问题清单,as-verified 2026-07-07,证据锚点见 06)

### P0(生产阻断)
- **L-01 孤儿 run 永久死锁**:裸 pipeline run 进程崩溃后永久停 RUNNING;single-flight 检测(`pipeline-orchestrator.ts:48-64`)使该文献永久无法再触发任何处理;orchestrator 无启动/入队恢复逻辑(backfill 有,裸 run 无)。
- **L-02 enqueueRun 竞态**:in-flight 检测 read-then-write 非原子,`LiteraturePipelineRun` 无唯一约束,并发可产生双 RUNNING run,最后写入者获胜、审计混乱。

### P1(健壮性/正确性)
- **L-03 GROBID 生产姿态缺失**:调用无超时/重试/断路器/source_health 接入(`literature-grobid-fulltext-parser.ts:87-106`);无部署约定(无 compose/脚本);健康检查端点存在但不做流程门禁;错误路径零测试。
- **L-04 pgvector 检索规模风险**:无 ivfflat/hnsw 索引=精确暴力扫描(`prisma-literature-embedding-store.ts:360-413`);延迟仅在 ~2.5 万 chunk 验证,当前库已 26 万 chunk;超时仅应用层放弃不取消 DB 查询(`literature-retrieval-service.ts:444-461`);权重/候选窗硬编码。
- **L-05 embedding 成本遥测逻辑 bug**:`computeLlmCostUsd` 要求 output_tokens 非空而 embeddings 无 completion_tokens → cost_usd 结构性恒 null;`config/llm-pricing.json` 未登记 embedding 模型。
- **L-06 retrieval-ready 双定义 + STALE 不传播**:UI 层(7 阶段全 SUCCEEDED)与证据激活层(`isEvidenceReady`)独立维护,STALE 下矛盾;STALE 被视为可用、静默复用旧产物;选题域采样(`eligibilityExclusionReason`)完全不感知 STALE。
- **L-07 fulltext-acquisition 零单测**:1149 行成熟运行时(状态机/cooldown/预算/宕机重入)无任何 CI 回归。
- **L-08 embeddings 单请求不分批**:整篇 chunks 一次提交(`literature-flow-artifact-runtime.ts:1582-1613`),超 OpenAI 限制整篇失败无降级。
- **L-09 导入链路事务性**:dedup 读后写无事务、无 P2002→409 映射;collectionImport 批量无事务边界、单条失败中断整批。
- **L-10 导入→管线自动衔接(用户定为缺口)**:auto-pull 导入后仅建 scaffold 不 enqueue;需设计自动推进(含质量门/成本控制/并发限流,与 T-029 边界决策的关系要显式改写)。
- **L-11 质量评估名不副实**:内容处理完成后硬编码 100 分兜底(`literature-evidence-activation-service.ts:126-149`);阈值硬编码。

### P2(治理/一致性/清理)
- **L-12 阶段 SSOT 守卫缺失**:阶段序列在 contracts 与 flow-service 双写、无一致性脚本;文献域无选题域同款节点矩阵 SSOT。
- **L-13 死资产处置**:`LiteratureDiscoveryBatch/Candidate` 零服务引用;`LiteratureEmbeddingTokenIndex` 写而不读——删或接线,须留痕。
- **L-14 错误码无中心注册表**:全域 error_code 为服务局部字符串。
- **L-15 恢复/失效链细节**:backfill stage-filter 静默跳过无区分;citation 失效链跳过 ABSTRACT/FULLTEXT 无注释无钉测;历史 run 无清理机制。
- **L-16 文档漂移修正**:T-029/T-041 边界引用分裂;fulltext acquisition 阶段归属表述;pgvector rollout 子状态未标废弃;codex_curated 半自动语义、解析质量评分权重无文档。
- **L-17 配置面补齐**:调度器单实例假设未声明;聚类/质量阈值、检索权重/候选窗、chunk 截断等硬编码项的可配化取舍。

## Workstreams(P0→P1→P2 顺序实施,小切片)
- **W-01(P0)**: L-01+L-02——孤儿 run 恢复(启动清扫+入队时效兜底)+ enqueue 原子化(advisory lock 或部分唯一索引)。
- **W-02(P1)**: L-03 GROBID 姿态(超时/重试/断路器/健康门禁/部署约定文档)。
- **W-03(P1)**: L-04 pgvector(ANN 索引评估与建立、超时取消、参数配置面)。
- **W-04(P1)**: L-05+L-08 embedding(成本 bug 修复+定价登记+请求分批)。
- **W-05(P1)**: L-06 retrieval-ready 单一事实源 + STALE 传播(检索/选题)。
- **W-06(P1)**: L-10 导入→管线自动衔接(设计先行:触发规则/质量门/成本闸)。
- **W-07(P1)**: L-07+L-09 测试与事务性(fulltext-acq 单测、P2002 映射、导入事务)。
- **W-08(P2)**: L-12 文献阶段 SSOT 矩阵 + 一致性脚本(仿选题域)。
- **W-09(P2)**: L-13+L-14+L-15+L-16 清理/注册表/文档对齐。
- **W-10(P2)**: L-11+L-17 质量评估真实化与配置面(含用户裁决点)。

## Non-goals
- 不改 7 阶段模型本身与 T-031 阶段词汇;不动选题域(消费侧对齐除外)。
- 不做检索算法升级(rerank/hybrid 之类)——只做生产姿态硬化。
- embedding 模型升级/批量迁移编排器不在本包(记 backlog)。

## Acceptance Criteria
- [x] W-01:孤儿 run 可自动恢复(启动+入队双路径),并发 enqueue 在 DB 层互斥;负例测试齐(崩溃模拟/并发注入)。(**DONE 2026-07-07**:orchestrator 单测 8/8、全量 1669/1634/0/35;真库 advisory-lock 并发注入验证列 W-07 跟进——03/04 §2026-07-07)
- [x] W-02:GROBID 调用有超时/有界重试/断路器;健康检查接入执行前置;部署约定成文。(**DONE 2026-07-07**:解析器单测 2→8 全错误路径覆盖、flow-service 22/22;compose+运行手册在案;03/04 §2026-07-07)
- [x] W-03:ANN 索引落地或以实测数据证明当前规模无需(留痕);检索超时取消 DB 查询;关键参数入 settings。(**DONE 2026-07-07**:halfvec hnsw 落地,p50 771→103ms、overlap 99.8%、EXPLAIN 钉索引;statement_timeout 真取消+结构化码;参数 settings 化按 D6 拆解归 W-10——03/04 §2026-07-07)
- [x] W-04:embedding cost_usd 真实计费;超限文献分批不整篇失败。(**DONE 2026-07-07**:input-only 计费+定价登记+遥测回退,gateway 回归钉 $0.13/1M;分批助手+顺序批跑+遥测聚合;25/25+22/22——03/04 §2026-07-07)
- [x] W-05:retrieval-ready 单一判定函数被 UI/检索/选题三方消费;STALE 传播至选题采样可见。(**DONE 2026-07-08**:`resolveRetrievalReadiness` 单源(判定链+INDEXED-STALE freshness);检索 freshness_warnings 与 evidence-ready 过滤改读单源;选题采样注入 resolver,stale 落 audit `retrieval_freshness`+`STALE_EVIDENCE_SAMPLED`(资格零变化);UI 经 per-stage DTO 消费同一底层事实(判定留痕);40/40+2/2、全量 1696/1661/0/35——03/04 §2026-07-08)
- [x] W-06:新入库文献按规则自动推进(质量门+成本闸+限流),关闭开关可退回手动。(**DONE 2026-07-08**:AUTO_ADVANCE backfill job 形态,75/55 分档+日预算+默认 OFF settings 开关;auto-pull run summary 可审计;服务 6/6、auto-pull 24/24、全量 1693/1658/0/35——03/04 §2026-07-08)
- [x] W-07:fulltext-acquisition 单测覆盖状态机核心路径;并发导入返回结构化 409。(**DONE 2026-07-08**:acquisition 单测 0→11;P2002→409 VERSION_CONFLICT;collectionImport 批内失败隔离(request_index+failures[],auto-pull 配对同修);W-01 真库并发 e2e 实锤并修复 advisory-lock void 反序列化生产 bug(::text cast);条目级事务 defer 判定留痕——03/04 §2026-07-08)
- [x] W-08:文献阶段 SSOT + 一致性脚本进默认套件(含自测负例)。(**DONE 2026-07-08**:`docs/context/process/literature-pipeline-matrix.md` + consistency 脚本(阶段序列双写守卫/失效链字面量钉/每链必含 INDEXED 的 D7 结构断言)+ wrapper 2 测;自测负例 7/7;T-029 修订边界与 fulltext 非阶段归属正式落表——03/04 §2026-07-08)
- [x] W-09:清单逐项留痕处置。(**DONE 2026-07-08**:Discovery 删表(dry-run 证据+migration)/token index 停写标废弃/错误码注册表(跨界码集入 shared,增量收敛判定)/backfill skip 区分/citation 链意图注释/文档漂移 3 处修 + 3 项 defer 留痕(archive 引用无需改、KEY_CONTENT BLOCKED 托底、历史 run 清理)——03 §W-09 台账)
- [x] W-10:清单逐项留痕处置。(**DONE 2026-07-08**:质量改语义按 D10 分级过渡(marker 新语义+1539 存量祖父标记 migration+不复活升格);配置面收敛全部尾巴——auto_advance/retrieval 候选窗入聚合 DTO+PATCH、grobid timeout_ms 入 settings(env 为 ops override);4 项 defer/判定留痕(orphan 阈值常量/ef_search 派生/聚类阈值/单实例假设)——03 §W-10)
- [ ] 全程:backend 全量套件基线不降;replay/goldens 不动;lint 零警告。
