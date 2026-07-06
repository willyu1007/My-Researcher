# 07 LIT-0204 RAGPerf Candidate Payload

## Decision
- State: in-progress
- Lane: `LIT-0204` RAGPerf.
- Decision: keep at candidate-payload-requirements level; do not create canonical assets.
- Auto-promotion: `false`.
- Recommended next step: build the RAGPerf benchmark/evaluation-protocol candidate payloads after duplicate, policy, and smoke checks.

## Source Evidence
- arXiv: https://arxiv.org/abs/2603.10765.
- Repository: https://github.com/platformxlab/RAGPerf.
- Observed git HEAD: `49c9794895666d029a3c98a48afd872197d83b23`.
- License observed from repository LICENSE: `Apache-2.0`.
- Source caveat: GitHub API was anonymous-rate-limited during this pass; raw README/config/source files and git ls-remote HEAD were reachable.
- Source caveat: README install path references ../requirement.txt while monitoring documentation references requirements.txt; resolve dependency-generation output before smoke execution.
- Source caveat: Default example configs contain local absolute paths and must be copied/rebased before local execution.
- Source caveat: GitHub API metadata was not used because anonymous requests were rate-limited.

## Candidate Split
| Candidate | Status | Missing fields before promotion |
| --- | --- | --- |
| Benchmark candidate | `manual_review_required` | duplicate_check, dataset_candidate_payloads, evaluation_protocol_candidate_payload, metric_definition_refs, protocol_hash, entrypoint_smoke_result, readiness_snapshot |
| Evaluation protocol candidate | `manual_review_required` | protocol_hash, metric_definition_records, evaluator_ref_records, local_smoke_command, output_artifact_contract |
| Wikipedia corpus dataset candidate | `needs_info` | data_policy_ref, split_protocol, checksum_manifest, dataset_version, local_location_ref |
| Natural Questions query dataset candidate | `needs_info` | data_policy_ref, split_protocol, checksum_manifest, dataset_version, local_location_ref |

## Observed Protocol
- Insert phase: `python3 src/run_new.py --config config/lance_insert.yaml --msys-config config/monitor/example_config.yaml`.
- Query phase: `python3 src/run_new.py --config config/lance_query.yaml --msys-config config/monitor/example_config.yaml`.
- Default text corpus: `wikimedia/wikipedia`.
- Query workload source: `sentence-transformers/natural-questions`.
- Local backend candidate: `lancedb`.
- Important knobs:
  - `bench.preprocessing.chunk_size`
  - `bench.preprocessing.chunk_overlap`
  - `bench.preprocessing.dataset_ratio`
  - `rag.retrieval.question_num`
  - `rag.retrieval.retrieval_batch_size`
  - `rag.retrieval.top_k`
  - `rag.pipeline.batch_size`
  - `rag.generation.model`
  - `rag.embedding.model`
  - `sys.vector_db.type`
  - `sys.vector_db.db_path`
  - `sys.devices.gpu_count`
  - `sys.devices.gpus`

## Metric Requirements
| Metric | Source | Direction |
| --- | --- | --- |
| `embedding_time_ns` | TextsRAGPipeline text_pipeline_stats.txt | `lower_is_better` |
| `retrieval_time_ns` | TextsRAGPipeline text_pipeline_stats.txt | `lower_is_better` |
| `rerank_time_ns` | TextsRAGPipeline text_pipeline_stats.txt | `lower_is_better` |
| `prompt_time_ns` | TextsRAGPipeline text_pipeline_stats.txt | `lower_is_better` |
| `generation_time_ns` | TextsRAGPipeline text_pipeline_stats.txt | `lower_is_better` |
| `total_pipeline_time_ns` | derived from stage timings | `lower_is_better` |
| `qps` | derived from question_num / total time | `higher_is_better` |
| `factual_correctness` | Ragasvllm/RagasEvaluator evaluate_result.csv | `higher_is_better` |
| `answer_accuracy` | Ragasvllm evaluate_result.csv | `higher_is_better` |
| `llm_context_recall` | Ragasvllm evaluate_result.csv | `higher_is_better` |
| `faithfulness` | RagasEvaluator evaluate_result.csv | `higher_is_better` |
| `context_recall` | RagasEvaluator evaluate_result.csv | `higher_is_better` |
| `context_precision` | RagasEvaluator evaluate_result.csv | `higher_is_better` |
| `answer_relevancy` | RagasEvaluator evaluate_result.csv | `higher_is_better` |
| `gpu_utilization` | MSys GPUMeter protobuf output | `informational` |
| `gpu_memory_or_dram_bandwidth` | MSys GPUMeter protobuf output | `informational` |
| `cpu_memory_disk_process_io` | MSys CPU/Mem/Disk/Proc meters | `informational` |

## Gate Status
- Duplicate check: `not_checked`; query the experiment-foundation registry before promotion.
- Code policy: `clear` for Apache-2.0 repo license.
- Dataset policy: `unknown`; review Hugging Face dataset policies before dataset promotion.
- Risk: benchmark/protocol low, dataset medium.
- Completeness: `needs_info`; no protocol hash, metric definition records, evaluator refs, dataset versions, checksum manifests, or smoke evidence yet.
- Gate blockers: `duplicate_check_not_run`, `dataset_policy_unknown`, `protocol_hash_missing`, `metric_definition_records_missing`, `evaluator_records_missing`, `entrypoint_smoke_missing`, `dependency_file_reference_needs_resolution`, `example_configs_need_local_path_rewrite`, `gpu_model_dependencies_not_verified`.

## Smoke Plan
### S0 Static Protocol Check
- Verify repo HEAD, LICENSE, README, config/README.md, lance_insert.yaml, lance_query.yaml, monitor example config, and run_new.py are reachable.
- Rewrite local absolute paths in copied config under a throwaway workspace outside repo.
- Set tiny dataset_ratio and question_num for local smoke.

### S1 Local LanceDB Smoke
- Create throwaway workspace outside repo root.
- Install dependencies in an isolated environment.
- Run insert phase with LanceDB and tiny dataset slice.
- Run query phase with minimal question count if local GPU/model requirements are available.
- Collect text_pipeline_stats.txt and MSys output paths as evidence refs, not repo files.

### S2 GPU/Model Smoke
- Run generation/evaluation with explicit model availability and GPU budget.
- Produce readiness snapshot with metric observations and blocker list.

## Artifact Boundary
- JSON payload requirements: `dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion/artifacts/lit-0204-ragperf-candidate-payload.json`.
- No raw dataset, cloned repository, model checkpoint, log, or execution output is stored in repo.

## 2026-07-06 S1 后字段状态对账
S1 CPU 适配器烟测通过后（run `ragperf-s1-20260706T141503Z` + 独立复现 `...T142335Z`，见 03/04 §2026-07-06 与 `artifacts/lit-0204-ragperf-s1-cpu-adapter.json`），上表缺字段与 gate blockers 状态更新：

| 项 | 状态 |
|---|---|
| `entrypoint_smoke_result` | **可填**——CPU-adapter 档 smoke pass（insert 50/50、query [2,2]、RAGPerf 自身 stats 产出）；证据=工件 JSON。注意档位：这是 adapter 档协议可执行证据，**非** faithful 档 |
| `local_smoke_command` | **可填**——venv + 补丁后 insert/query 命令与 tiny 配置全录于工件 JSON（patches/configs 字段） |
| `example_configs_need_local_path_rewrite` | **已解**——S0 tiny 配置 + S1 复跑验证（本地路径/parallelism 修正在补丁清单） |
| `dependency_file_reference_needs_resolution` | **部分解**——CPU 最小依赖集实证可装可跑（pip-freeze 在案）；faithful 全依赖(vLLM/CUDA/libmsys)仍未验证 |
| `protocol_hash` | **仍缺**——哈希方案（对什么内容、何种规范化）属晋升裁决时决策，不在 S1 范围擅定 |
| `duplicate_check` / dataset 政策字段(data_policy_ref/split_protocol/checksum_manifest/dataset_version/local_location_ref) / metric_definition_records / evaluator_ref_records / `gpu_model_dependencies_not_verified` | **仍缺**——依赖真实数据集获取与 faithful 环境，维持 record-and-defer |

结论：Benchmark/Evaluation-protocol 两候选仍 `manual_review_required`，但晋升裁决所需的「协议可执行」证据面已齐；下一动作=晋升评审（人工），非工程。
