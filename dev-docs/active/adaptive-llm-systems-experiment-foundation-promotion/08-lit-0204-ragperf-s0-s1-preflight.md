# 08 LIT-0204 RAGPerf S0/S1 Preflight

## Decision
- State: completed-with-blockers.
- Lane: `LIT-0204` RAGPerf.
- S0 static protocol check: passed.
- S1 local LanceDB smoke: blocked before execution in the current local environment.
- Decision: keep RAGPerf at candidate level; do not promote or create canonical experiment-foundation assets yet.

## Run Context
- Run ID: `ragperf-s0s1-20260604T015307Z`.
- Temporary workspace: `/tmp/ragperf-s0s1-20260604T015307Z`.
- Repository clone: `/tmp/ragperf-s0s1-20260604T015307Z/RAGPerf`.
- Repository URL: https://github.com/platformxlab/RAGPerf.
- Observed HEAD: `49c9794895666d029a3c98a48afd872197d83b23`.
- Package checkpoint commit: `17e414f docs(literature): add adaptive systems promotion package`.

## S0 Results
| Check | Result | Evidence |
| --- | --- | --- |
| Shallow clone outside repo | passed | cloned under `/tmp/ragperf-s0s1-20260604T015307Z/RAGPerf` |
| HEAD matches prior evidence | passed | `git rev-parse HEAD` and `git ls-remote ... HEAD` both returned `49c9794895666d029a3c98a48afd872197d83b23` |
| Required source files present | passed | README, LICENSE, config README, LanceDB configs, monitor config, run entrypoint, pipeline/evaluator/request source files observed |
| License | passed | repository LICENSE is Apache-2.0 |
| Requirements source | partial | repo contains `resource/requirements.in`; CMake target writes `requirement.txt`; monitoring README refers to `requirements.txt` |
| Example config local paths | needs rewrite | `lance_insert.yaml` and `lance_query.yaml` contain `/home/...` and `/mnt/data1/...` paths |
| Tiny config generation | passed | generated temporary tiny configs under `/tmp/ragperf-s0s1-20260604T015307Z/tiny-configs` |
| Tiny config YAML parse | passed | Ruby YAML parsed insert, query, and CPU-only monitor configs |

## Tiny Config Adjustments
| Config | Key changes |
| --- | --- |
| `lance_insert_tiny.yaml` | `dataset_ratio=0.00001`, `embedding=true`, `load=false`, `insert.batch_size=1`, `gpu_count=0`, local db/log paths under `/tmp` |
| `lance_query_tiny.yaml` | `dataset_ratio=0.00001`, `question_num=2`, `retrieval_batch_size=1`, `top_k=2`, `pipeline.batch_size=1`, `generation.parallelism=1`, local db/log paths under `/tmp` |
| `monitor_cpu_only.yaml` | CPU/Mem/Proc-only monitor skeleton with output under `/tmp` |

## S1 Blockers
| Blocker | Impact |
| --- | --- |
| `cmake` not installed locally | cannot run the official `make generate_py3_requirements` path in this environment |
| Local Python is `3.12.6`, README recommends Python `3.10` | likely dependency compatibility risk, especially around vLLM/CUDA packages |
| Official entrypoint imports runtime dependencies before argument handling | even `run_new.py --help` fails without installed dependencies |
| Missing `psutil` in current Python environment | first observed entrypoint failure before benchmark execution |
| Text insert path hardcodes `cuda:0` for `SentenceTransformerEncoder` | CPU-only LanceDB insert smoke is not possible without a code patch or precomputed embeddings |
| Text query path only runs when `generation=true` | retrieval-only query smoke is not available through the official entrypoint |
| Query path instantiates `VLLMResponser` | local query smoke requires vLLM/model/GPU availability or an adapter patch |
| Example `lance_query.yaml` lacks `rag.generation.parallelism` | tiny query config must add `parallelism: 1` before execution |

## Current Status
- S0 is sufficient to keep RAGPerf as the first benchmark/protocol lane.
- S1 cannot be treated as passed on this machine.
- The next implementation decision is whether to:
  - provision a Linux/Python 3.10/CUDA/vLLM environment for faithful RAGPerf execution, or
  - create an experiment-foundation adapter that patches the official entrypoint for CPU/minimal retrieval smoke while preserving source provenance.

## Artifact Boundary
- Detailed clone, configs, and run evidence are outside the repo under `/tmp/ragperf-s0s1-20260604T015307Z`.
- Repo stores only this summary and `artifacts/lit-0204-ragperf-s0-s1-preflight.json`.
