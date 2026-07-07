# 04 Verification

(随切片留痕)

## 2026-07-07 W-01 验证
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed(0 error)。
- Command: `node --test --loader ts-node/esm src/services/pipeline-orchestrator.unit.test.ts`
- Result: passed; **8/8**(既有 4 例零改动全绿=单飞语义保留证据;新增 4 例见 03)。
- Full backend 套件:见下方补记。
- 注:prisma 侧 advisory-lock 事务路径由类型系统与套件内 prisma 集成测试覆盖面兜底;真库并发注入验证列入 W-07(测试切片)跟进项。
- Command: `node scripts/run-node-tests.mjs`(apps/backend 全量)
- Result: passed — **1669 / 1634 pass / 0 fail / 35 skipped**(原基线 1665/1630 + W-01 四例,零回归)。

## 2026-07-07 W-02 验证
- Command: `node --test --loader ts-node/esm src/services/literature-flow/literature-grobid-fulltext-parser.unit.test.ts`
- Result: passed; **8/8**(既有 2 例零改动=裸构造路径不变;新增 6 例覆盖审查判定为零覆盖的全部错误路径)。
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed(0 error)。
- Full backend 套件:见下方补记。
- Command: `node --test --loader ts-node/esm src/services/literature-flow-service.unit.test.ts`
- Result: passed; **22/22**(mockGrobidFulltext 桩补 isalive 路由后,GROBID 成功/OCR/不可达三用例语义原样)。
- Full backend 套件(2026-07-07 本切片时点):**1677 总/1635 pass/35 skip/7 fail**——其中 2 红为本切片桩缺 isalive 路由,已修(上一条 22/22);**另 5 红(W-15 D1(c) 签核门×4 + N8 operator_debate_request×1)为并行会话未提交的 v1b harness WIP 所致**(其在改文件=对应测试面,与本切片文件零交集;W-01 时点同树全量 1669/1634/0 可佐证),留其归属会话收敛后于下一切片复核全量。

## 2026-07-07 W-03 验证
- 基准(真库 261,631 vectors,8 查询,limit 200/cap 8):
  - 索引前 exact:p50 771.3ms / p95 805.7ms(`w03-before-exact.json`)。
  - 索引后 ANN:p50 **102.7ms** / p95 **150.9ms**;同轮 exact 对照 p50 684.5ms(冷峰 5493ms)。
  - **top-50 overlap(ANN vs exact)= 0.998**;EXPLAIN(带 1595 版本过滤)确认 hnsw Index Scan。
- Command: `node --test --loader ts-node/esm src/repositories/prisma/literature/prisma-literature-embedding-store.unit.test.ts`
- Result: passed; 4/4(候选查询断言更新为 halfvec/knn 形状 + SET LOCAL 双断言 + 独立计数查询断言;夹具升级支持交互事务双方法)。
- Command: `node --test --loader ts-node/esm src/services/literature-retrieval-service.unit.test.ts`
- Result: passed; 12/12(零改动)。
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed(0 error)。
- `prisma migrate deploy`:52/52 applied,索引 1830 MB 建成。

## 2026-07-07 W-04 验证
- Command: `node --test --loader ts-node/esm src/services/llm-pricing-table.unit.test.ts src/services/literature-content-processing-utils.unit.test.ts src/services/llm-gateway.unit.test.ts`
- Result: passed; **25/25**(新增:input-only 计费三规则 4 例、分批助手 5 例、gateway embedding 成本端到端回归钉 1M tokens→$0.13)。
- Command: `node --test --loader ts-node/esm src/services/literature-flow-service.unit.test.ts`
- Result: passed; 22/22(EMBEDDED 单批常态零行为变化)。
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed(0 error)。

## 2026-07-08 W-06 验证
- Command: `node --test --loader ts-node/esm src/services/literature-auto-advance-service.unit.test.ts`
- Result: passed; **6/6**。
- auto-pull 回归 + backend tsc + 全量套件:见下方补记。
- Command: 全量 `node scripts/run-node-tests.mjs`
- Result: passed — **1693 / 1658 pass / 0 fail / 35 skipped**(绿锚 1652+6 新测,零回归);auto-pull 回归 24/24;backend tsc 0。

## 2026-07-08 W-05 验证
- Command: `node --test --loader ts-node/esm src/services/literature-evidence-activation-service.unit.test.ts src/services/literature-retrieval-service.unit.test.ts src/services/topic-selection-resource-sampling-service.unit.test.ts`
- Result: passed; **40/40**——新增 3 例:readiness 全矩阵(4 条判定链 reason + ready-stale 标记 + 未知 id + stale 不出局 + isEvidenceReady 委托一致)、采样 stale 标记(资格/选中零变化 + audit warning `STALE_EVIDENCE_SAMPLED` + guardrail_summary.retrieval_freshness 明细 + sample_set.warnings 不受染 + resolver 恰好收到选中 4 篇)、resolver 失败不炸采样(audit 记 checked:false + error_message)。检索 12/12 零改动(freshness_warnings 输出经单源后契约不变的回归证据)。
- Command: `node --test --loader ts-node/esm src/routes/topic-selection-resource-sampling-routes.integration.test.ts`
- Result: passed; 2/2(app.ts 注入 resolver 后路由面零回归)。
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed(0 error)。
- 首跑教训:readiness 测试夹具初版只建 quality/pipeline/embedding 三件套即断言 EVIDENCE_READY——in-memory `listActiveEmbeddingVersionsByLiteratureIds` 经 `literature.activeEmbeddingVersionId` 指针取版本,须先 createLiterature 挂指针(与真库语义一致,修夹具不修实现)。
- Command: 全量 `node scripts/run-node-tests.mjs`
- Result: passed — **1696 / 1661 pass / 0 fail / 35 skipped**(绿锚 1658+3 新测,零回归)。

## 2026-07-08 W-07 验证
- a)L-09:`node --test ... prisma-literature-core-store.unit.test.ts literature-service.unit.test.ts` — passed **20/20**(P2002 映射 409+详情/非 P2002 透传 2 例;批内隔离+request_index+全败抛错 1 例;既有导入语义零回归);auto-pull 回归 **26/26**(配对改 request_index 后零改动全绿)。
- b)L-07:`node --test ... literature-fulltext-acquisition-service.unit.test.ts` — passed **11/11**(1149 行服务首次直测)。
- c)W-01 跟进:`RUN_LITERATURE_PIPELINE_LOCK_E2E=1 node --env-file=../../.env.local --test ... prisma-literature-pipeline-lock.e2e.test.ts` — **真库 passed 1/1**:8 并发恰 1 admission、7 in_flight 同 winner、orphan takeover 生效。首跑抓获生产 bug(advisory lock void 反序列化炸,`::text` cast 修复)后复跑全绿;pipeline-orchestrator 回归 8/8。
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck` + shared typecheck
- Result: passed(0 error)。
- Command: 全量 `node scripts/run-node-tests.mjs`
- Result: passed — **1711 / 1675 pass / 0 fail / 36 skipped**(绿锚 1661+14 新测+1 门控 e2e skip,零回归)。

## 2026-07-08 W-08 验证
- Command: `node .ai/scripts/literature-pipeline-matrix-consistency.mjs`(+ `--self-test`)
- Result: passed — check ok;自测负例 **7/7**(clean 零 issue、阶段乱序、flow-service 双写漂移、失效链丢 INDEXED、代码链未登记、状态词汇漂移、行缺格,均被抓获)。
- Command: `node --test ... literature-pipeline-matrix-consistency.unit.test.ts`
- Result: passed; 2/2(套件 wrapper)。backend tsc 0。
- Command: 全量 `node scripts/run-node-tests.mjs`
- Result: passed — **1713 / 1677 pass / 0 fail / 36 skipped**(绿锚 1675+2 wrapper,零回归)。

## 2026-07-08 W-09 验证
- Discovery 删表 dry-run:全仓 grep 零消费方;真库 count 119/2312、最新写入 2026-06-17(证据入 migration 注释与 03);`prisma migrate deploy` 应用成功、`prisma validate` 通过。
- Command: `node --test ... literature-flow-service.unit.test.ts`
- Result: passed; **22/22**(token 停写断言反转+INDEXED 失败注入点迁移后全绿)。
- Command: `node --test ... literature-backfill-service.unit.test.ts`
- Result: passed; **18/18**(含新钉测:skip 区分 ALL_STAGES_CURRENT vs STAGE_FILTER_EXCLUDED)。
- Command: matrix 一致性 `node .ai/scripts/literature-pipeline-matrix-consistency.mjs`(+self-test)
- Result: passed(W-09 矩阵备注/变更日志修改后 check+负例仍全绿)。
- backend + shared typecheck:0 error。
- Command: 全量 `node scripts/run-node-tests.mjs`
- Result: passed — **1714 / 1678 pass / 0 fail / 36 skipped**(绿锚 1677+1 skip 区分钉测,零回归)。
