# 04 Verification

## Verification Log

### 2026-06-04 - Task Package Setup
- Status: passed.
- Checks:
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed; registered `T-118`.
  - `node .ai/scripts/ctl-project-governance.mjs map --project main --task T-118 --milestone M-001 --feature F-001 --requirement R-012 --apply`
    - Result: passed; mapped T-118 from default inbox to `M-001 > F-001 > R-012`.
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed; regenerated derived views.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed.

### 2026-06-04 - F3 Promotion Matrix
- Status: passed.
- Checks:
  - `node --check dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/tools/f3-experiment-foundation-promotion.mjs`
    - Result: passed.
  - `node dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/tools/f3-experiment-foundation-promotion.mjs`
    - Result: passed.
    - Candidate count: 10.
    - Auto-promotion allowed: 0.
    - Manual review required: 10.
    - Primary family counts: benchmark 1, dataset 2, baseline 3, evaluation_protocol 1, method_component 3.
    - First lane recommendation: `LIT-0204`.
  - `git diff --check -- dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion .ai/project/main`
    - Result: passed.

### 2026-06-04 - LIT-0204 RAGPerf Deep Dive
- Status: passed.
- Source checks:
  - `curl -sL https://raw.githubusercontent.com/platformxlab/RAGPerf/main/README.md | sed -n '1,220p'`
    - Result: passed; README confirms end-to-end RAG performance benchmarking, throughput/QPS, latency breakdown, hardware profiling, modular RAG stages, real-world knowledge-base update simulation, and multimodal support.
  - `git ls-remote https://github.com/platformxlab/RAGPerf.git HEAD`
    - Result: passed; HEAD observed as `49c9794895666d029a3c98a48afd872197d83b23`.
- Local generation checks:
  - `node --check dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/tools/f3-ragperf-lane-deep-dive.mjs`
    - Result: passed.
  - `node dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/tools/f3-ragperf-lane-deep-dive.mjs`
    - Result: passed.
    - Literature ID: `LIT-0204`.
    - Payload hash: `8d8a17a340ff8f21ed66fe15d4808792386b27c1e2089e74a56d7ab5430bc85e`.
    - Auto-promotion allowed: `false`.
    - Generated:
      - `artifacts/lit-0204-ragperf-candidate-payload.json`.
      - `07-lit-0204-ragperf-candidate-payload.md`.
- Governance and hygiene:
  - `git diff --check -- dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion .ai/project/main`
    - Result: passed.
  - `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
    - Result: passed.
  - `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
    - Result: passed.

### 2026-06-04 - LIT-0204 S0/S1 Preflight
- Status: completed-with-blockers.
- Commit checkpoint:
  - `git commit -m "docs(literature): add adaptive systems promotion package"`
    - Result: passed; commit `17e414f`.
- Source and S0 checks:
  - `git clone --depth 1 https://github.com/platformxlab/RAGPerf.git /tmp/ragperf-s0s1-20260604T015307Z/RAGPerf`
    - Result: passed.
  - `git -C /tmp/ragperf-s0s1-20260604T015307Z/RAGPerf rev-parse HEAD`
    - Result: passed; `49c9794895666d029a3c98a48afd872197d83b23`.
  - `git ls-remote https://github.com/platformxlab/RAGPerf.git HEAD`
    - Result: passed; `49c9794895666d029a3c98a48afd872197d83b23`.
  - `rg -n "requirement|requirements|generate_py3_requirements|pip" ...`
    - Result: passed; CMake writes `requirement.txt`, README uses `requirement.txt`, monitoring README uses `requirements.txt`.
  - `ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path); puts "ok #{path}" }' ...`
    - Result: passed; tiny insert/query/monitor configs parse.
- S1 attempt:
  - `PYTHONPATH=/tmp/ragperf-s0s1-20260604T015307Z/RAGPerf/src python3 /tmp/ragperf-s0s1-20260604T015307Z/RAGPerf/src/run_new.py --config /tmp/ragperf-s0s1-20260604T015307Z/tiny-configs/lance_insert_tiny.yaml --msys-config /tmp/ragperf-s0s1-20260604T015307Z/tiny-configs/monitor_cpu_only.yaml`
    - Result: blocked before execution.
    - First failure: `ModuleNotFoundError: No module named 'psutil'`.
    - Environment findings: local Python `3.12.6`; `cmake` not installed; Apple clang available.
- Output:
  - `08-lit-0204-ragperf-s0-s1-preflight.md`.
  - `artifacts/lit-0204-ragperf-s0-s1-preflight.json`.

## 2026-07-06 - LIT-0204 S1 CPU 适配器烟测 + 文献 evaluator re-baseline
- **S1 烟测**(run `ragperf-s1-20260706T141503Z`):
  - Insert: exit 0,50/50 chunk CPU 嵌入入 LanceDB(all-MiniLM-L6-v2,其配置默认)。
  - Query: exit 0,retrieval-only(generation=false 无 vLLM 实例化),retrieved_counts [2,2],top-1 语义正确;RAGPerf 自身 `text_pipeline_stats.txt` 正常产出(路径见工件 JSON stats_file_path)。
  - Verdict: **protocol_executable_cpu_smoke_pass**(smoke 级「协议可执行」证据;非性能数字)。
  - 工件: `artifacts/lit-0204-ragperf-s1-cpu-adapter.json`(13 补丁/10 偏差/剩余 blockers 全录);工作区证据 `/tmp/ragperf-s1-20260706/`。
- **文献 evaluator re-baseline**(当前栈 = pgvector + text-embedding-3-large;协议/fixture 与 2026-05-11 基线完全一致):
  - Command: `TS_NODE_TRANSPILE_ONLY=1 TS_NODE_PROJECT=apps/backend/tsconfig.json node --loader ./apps/backend/node_modules/ts-node/esm.mjs .ai/scripts/literature-e2e-v2-runner.mjs --mode full --run-id 20260706-rebaseline-full --fixture .ai/scripts/fixtures/t041-evaluator-v2-fixtures.json`(一次性库 `lit_rebaseline_full_20260706`;light 冒烟 `20260706-rebaseline-light2` 先行全绿)。
  - Result: **PASS,24 步全过**——18 样本/16 可处理全链成功(download/parser/key-content/indexed 16/16),检索 37/37 正例 + 1/1 负例(rights-gated 排除),degraded 0、dup-top5 0。
  - **排名指标 vs 2026-05-11 基线**:recall@5 **1.0000**(持平)、MRR@5 **0.9550**(基线 0.9347,+0.0203)、nDCG@5 **0.9665**(基线 0.9511,+0.0154)、blind recall@5 **9/9**(持平);embedding 237,091 tokens ≈ $0.0308(基线 237,017,同量级——协议一致性佐证)。**结论:当前栈(pgvector 检索 + 3-large 嵌入)不劣于且略优于切换前基线,re-baseline 达成。**
  - Report/Audit: `.ai/.tmp/literature-e2e/20260706-rebaseline-full/report{.json,.md}`(evidence 惯例:不入 git,留本地)。
  - 环境收尾:两只一次性库已 drop、GROBID 容器已停(留痕 03)。
