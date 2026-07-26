# ragperf-canary workload (T-132 M7-L1)

Diagnostic canary profile `ragperf_canary_stats@v1` — a real deterministic
CPU retrieval micro-pipeline for the two approved cells
(`retriever-top-k-5/10`). NOT the L2 scientific RAGPerf bundle: quality
metrics are intentionally absent and output stays diagnostic-only.

Verified locally: the emitted `result.json` is schema-valid against
`ExperimentFoundationProviderResultEnvelope@v1` and byte-identical to the
repository's canonical JSON (`canonicalizeExperimentV2Json`).

Delivery route: a PAI official CPU image plus content-addressed OSS mounts.
`entrypoint.py` is uploaded below
`input/workload/<entrypoint-sha256>/`; the Dockerfile remains an offline,
network-disabled compatibility fixture and is not pushed to ACR.

Runtime contract: env `EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON`,
`EXPERIMENT_FOUNDATION_INPUT_1_DIR`, `EXPERIMENT_FOUNDATION_INPUT_2_DIR`,
`EXPERIMENT_FOUNDATION_OUTPUT_DIR`, plus
`--cell-key=retriever-top-k-5|retriever-top-k-10`. Local selftest uses the
files in `fixture/` and the command recorded in the T-132 verification ledger.

Dataset (per approved decision): BEIR SciFact slice — `corpus.jsonl` and
`queries.jsonl` are separate content-addressed mirror directories under
`oss://<bucket>/input/scifact/`, with digests recorded in the mirror
manifests and cleanup after M7-L2.
