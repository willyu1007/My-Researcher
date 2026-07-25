# ragperf-canary workload (T-132 M7-L1)

Diagnostic canary profile `ragperf_canary_stats@v1` — a real deterministic
CPU retrieval micro-pipeline for the two approved cells
(`retriever-top-k-5/10`). NOT the L2 scientific RAGPerf bundle: quality
metrics are intentionally absent and output stays diagnostic-only.

Verified locally: the emitted `result.json` is schema-valid against
`ExperimentFoundationProviderResultEnvelope@v1` and byte-identical to the
repository's canonical JSON (`canonicalizeExperimentV2Json`).

Owner build steps (network + ACR credentials, outside Claude's window):
1. `docker build -t <acr-registry>/pea/ragperf-canary:v1 workloads/ragperf-canary`
2. `docker push` and record the RepoDigest into `18-m7-l1-authorization-materials.md`.
3. Record `shasum -a 256 entrypoint.py` as the code artifact digest.
4. Verify the pinned python:3.11-slim base digest still resolves (or repin and note it).

Runtime contract: env `RAGPERF_SOURCE_BINDING_JSON`, `RAGPERF_CORPUS_PATH`,
`RAGPERF_QUERIES_PATH`, `RAGPERF_TOP_K`, `RAGPERF_OUTPUT_DIR`. Local selftest:
see `fixture/` and the command in the T-132 session record.

Dataset (per approved decision): BEIR SciFact slice — `corpus.jsonl` +
`queries.jsonl`, mirrored once to `oss://<bucket>/input/scifact/`, content
digests recorded in the mirror manifests, deleted after M7-L2 closes.
