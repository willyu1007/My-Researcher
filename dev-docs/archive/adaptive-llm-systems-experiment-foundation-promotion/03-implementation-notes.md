# 03 Implementation Notes

## 2026-06-04 - Task Package Created
- Created `T-118 adaptive-llm-systems-experiment-foundation-promotion`.
- Decision: open a new task instead of extending T-117 because F3 crosses from literature readiness into experiment-foundation candidate review.
- Decision: map to `M-001 > F-001 > R-012`.
- Decision: keep F3 at candidate/review level; do not create canonical assets or RunRecipe records.
- Registered the task through project governance and mapped it from default inbox to `M-001 > F-001 > R-012`.

## 2026-06-04 - F3 Matrix Tool
- Added `tools/f3-experiment-foundation-promotion.mjs`.
- The tool consumes T-117 F2 readiness detail from `.ai/.tmp/adaptive-llm-systems-readiness-followup/f2-fulltext-code-readiness.json`.
- The tool writes:
  - `artifacts/f3-promotion-matrix.json`.
  - `06-f3-promotion-matrix.md`.
- The tool does not write to DB, does not enqueue jobs, and does not clone repositories.

## 2026-06-04 - F3 Promotion Matrix Generated
- Generated a 10-candidate matrix from the T-117 high runnable-feasibility set.
- Candidate family split:
  - benchmark: 1.
  - dataset: 2.
  - baseline: 3.
  - evaluation_protocol: 1.
  - method_component: 3.
- Risk split:
  - low: 8.
  - medium: 2.
- Decision: `auto_promotion_allowed=false` for all rows because duplicate, completeness, policy, version/protocol, and smoke checks are not yet complete.
- Recommended first lane: `LIT-0204` RAGPerf as the benchmark/protocol anchor for RAG-aware resource allocation experiments.

## 2026-06-04 - LIT-0204 RAGPerf Deep Dive
- Added `tools/f3-ragperf-lane-deep-dive.mjs`.
- Generated:
  - `artifacts/lit-0204-ragperf-candidate-payload.json`.
  - `07-lit-0204-ragperf-candidate-payload.md`.
- Split RAGPerf into:
  - benchmark candidate: `RAGPerf RAG Systems Benchmark`.
  - evaluation protocol candidate: `RAGPerf LanceDB Insert/Query Evaluation Protocol`.
  - dataset candidates: Wikipedia corpus slice and Natural Questions query workload.
- Decision: keep all candidates below canonical asset creation because duplicate check, dataset policy, protocol hash, metric/evaluator records, smoke evidence, dependency preflight, local path rewrite, and GPU/model checks are incomplete.
- Evidence boundary: source links, git HEAD, protocol commands, metric requirements, gate blockers, and smoke plan are stored; no repository clone, dataset, model, log, or execution output is stored in repo.

## 2026-06-04 - LIT-0204 S0/S1 Preflight
- Created a temporary workspace outside the repo at `/tmp/ragperf-s0s1-20260604T015307Z`.
- Shallow cloned `https://github.com/platformxlab/RAGPerf`.
- Verified HEAD as `49c9794895666d029a3c98a48afd872197d83b23`.
- Confirmed the CMake dependency target writes `requirement.txt`; the monitoring README still references `requirements.txt`.
- Generated tiny LanceDB insert/query configs and a CPU-only monitor config under `/tmp`.
- Parsed the tiny configs with Ruby YAML.
- Attempted the official entrypoint with the tiny insert config; it failed before execution because the local Python environment lacks `psutil`.
- Decision: S1 is blocked before benchmark execution on this machine because local `cmake` is unavailable, Python is `3.12.6` rather than README's Python `3.10`, and the official text paths are coupled to CUDA/vLLM/generation.

## 2026-07-06 - LIT-0204 S1 决策落地(最小适配器)+ 文献 evaluator re-baseline(同窗合并项)
- **用户决策(2026-07-06)**:S1 走 **experiment-foundation 最小适配器**路径(选项 B;faithful Linux/Py3.10/CUDA/vLLM 环境在本机 macOS 不可执行,留作外部依赖项)。产出定位:smoke 级「协议可执行」证据,不产性能结论;RAGPerf 维持 candidate 级。
- **S1 执行(run `ragperf-s1-20260706T141503Z`,verdict `protocol_executable_cpu_smoke_pass`)**:外部工作区 `/tmp/ragperf-s1-20260706/`,clone 钉 S0 provenance commit `49c9794`(ls-remote 核实无漂移);venv Python 3.12.6(README 3.10 偏差已记);最小 CPU 依赖(lancedb 0.24.3 按上游 requirements.in 钉,零 vLLM/CUDA)。**13 处最小补丁**(全部记录 文件/行/理由):S0 已知 6 项(entrypoint 依赖导入顺序、cuda:0 硬编码、retrieval-only 分支、parallelism 配置等)+ 新发现 7 项(libmsys 为 Linux CMake C++ 扩展→no-op shim + 零表监控配置、msys 配置解析 import 期崩溃→proto/pynvml//proc/mounts 三守卫、SentenceTransformer 位置参数 device 在 st 5.6 报 TypeError、无条件 torch.cuda.synchronize teardown)。合成语料:50 文档 JSONL(同构 wikimedia/wikipedia schema)+ 2 查询(同构 WikipediaRequests.query_list);embedding 用其配置默认 all-MiniLM-L6-v2(未换模)。**insert pass**(50 chunk CPU 嵌入入 LanceDB)/ **query pass**(retrieval-only,retrieved_counts [2,2],top-1 语义正确,RAGPerf 自身 text_pipeline_stats.txt 产出)。工件:`artifacts/lit-0204-ragperf-s1-cpu-adapter.json`(补丁清单/偏差/剩余 blockers/证据指针);工作区证据(patches.diff/日志/stats/pip-freeze)留 /tmp 不入仓(Artifact Boundary 惯例)。**剩余 blockers 原样登记**:faithful 监控需 Linux+cmake+NVML、generation/evaluation 需 GPU/vLLM、IVF_HNSW_SQ 索引未测(tiny 语料走 flat)、两处上游潜在 bug 待 upstream。
- **文献 evaluator re-baseline(2026-05-11 基线在 pgvector 切换前,archive 明确 re-baseline 应为新任务;经用户批准与本包同窗合并做)**:
  - 环境发现:pgvector 扩展装在主库 `my_researcher_dev` schema → 临时 schema 跑法(T-041 时代)现已不可行(`type "vector" does not exist`),改用 **T-121 preflight 同款一次性数据库**模式(CREATE DATABASE + CREATE EXTENSION vector + prisma db push);runner 需从仓根跑(cwd 相对导入 backend 源码)且根依赖已无 ts-node → `TS_NODE_TRANSPILE_ONLY=1 TS_NODE_PROJECT=apps/backend/tsconfig.json node --loader ./apps/backend/node_modules/ts-node/esm.mjs`;GROBID 用本地镜像 `grobid/grobid:0.9.0-crf` 临起容器。
  - light 冒烟(3 样本)全绿后 full 正式跑:run `20260706-rebaseline-full`,一次性库 `lit_rebaseline_full_20260706`(跑毕已 drop,容器已停)。结果见 04。

## 2026-07-08 - 07 payload S1 证据正式回填（尾巴①）
- Candidate Split 缺字段列移除已可填两项:`entrypoint_smoke_result`（benchmark 候选,adapter 档 `protocol_executable_cpu_smoke_pass`,双独立执行佐证）、`local_smoke_command`（evaluation-protocol 候选,venv+13 补丁+tiny 配置调用形状）——取值落 07 新增 Filled Fields 节,证据引用 `artifacts/lit-0204-ragperf-s1-cpu-adapter.json`。
- Gate Status 对账:blockers 分活跃 6 项（duplicate_check_not_run / dataset_policy_unknown / protocol_hash_missing / metric_definition_records_missing / evaluator_records_missing / gpu_model_dependencies_not_verified）与已解除 3 项（entrypoint_smoke / example_configs 改写 / dependency 引用**部分解**——CPU 集实证,faithful 依赖归 gpu_model 项）。
- 工件边界判定:`lit-0204-ragperf-candidate-payload.json`（2026-06-04,带 payload_hash）保持不可变快照不回写;md 为现状载体。原 2026-07-06 对账小节保留为历史留痕并注明已折入。
- 剩余尾巴 = 晋升评审（人工裁决）:两候选去留 + protocol_hash 方案 + duplicate check 执行;dataset 两候选维持 needs_info。
