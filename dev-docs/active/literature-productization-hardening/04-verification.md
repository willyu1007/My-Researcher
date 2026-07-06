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
