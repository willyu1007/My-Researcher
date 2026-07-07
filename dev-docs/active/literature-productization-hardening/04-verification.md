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
