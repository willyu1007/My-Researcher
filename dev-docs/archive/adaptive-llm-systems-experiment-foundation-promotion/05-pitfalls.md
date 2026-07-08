# 05 Pitfalls

## Do Not Repeat
- Do not treat F2 repository URL/license verification as sufficient for auto-promotion.
- Do not create canonical experiment-foundation assets from literature metadata alone.
- Do not store raw traces, datasets, cloned repositories, logs, or execution artifacts in repo.
- Do not collapse toolkit candidates into benchmark assets without a separate evaluation protocol candidate.
- Do not execute RAGPerf example configs without copying and rewriting local absolute paths first.
- Do not treat RAGPerf dependency setup as verified until the `requirement.txt` versus `requirements.txt` reference mismatch is resolved.
- Do not promote RAGPerf dataset candidates until Hugging Face dataset policies, split protocol, versions, and checksum manifests are captured.
- Do not assume the query/evaluation path is lightweight; generation/evaluation depends on GPU/model/vLLM/RAGAS availability.
- Do not treat S0 config generation as S1 execution evidence.
- Do not run RAGPerf on macOS/Python 3.12 and call the result representative; the README path is Linux/Python 3.10 oriented and the requirements include CUDA/vLLM dependencies.
- Do not assume a CPU-only LanceDB insert/query smoke exists through the official entrypoint; the text insert path hardcodes `cuda:0`, and the query path enters through generation/vLLM.
- 2026-07-06 S1 补充:S1 smoke 结果**只证协议可执行**,不作任何性能/代表性引用(与上一条一致);两处上游潜在 bug(SentenceTransformer 位置参数 device、无条件 torch.cuda teardown)在新依赖时代必现,faithful 跑之前需 upstream 或随环境钉旧版依赖。
- 2026-07-06 文献 evaluator 跑法坑:pgvector 扩展装在主库 `my_researcher_dev` schema,`?schema=<temp>` 连接的 search_path 不含它 → 临时 schema 跑法报 `type "vector" does not exist`;正确姿势=一次性数据库(CREATE DATABASE + CREATE EXTENSION vector + prisma db push,T-121 preflight 同款),跑毕 drop。runner 必须仓根 cwd(其 backend 导入按 cwd 相对解析)且根已无 ts-node → 用 `--loader ./apps/backend/node_modules/ts-node/esm.mjs` + `TS_NODE_TRANSPILE_ONLY=1 TS_NODE_PROJECT=apps/backend/tsconfig.json`;fixture/evidence 路径也按 cwd 解析,传绝对 fixture 路径。
