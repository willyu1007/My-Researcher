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
