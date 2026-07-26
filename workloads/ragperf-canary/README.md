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

The frozen local upload plan is
`manifests/workload-directory-v1.json`. Its `single-file-expanded-directory@v1`
profile means the mounted directory contains exactly `entrypoint.py`, and the
directory content digest/byte size are the digest/byte size of those exact
file bytes. The manifest is `uploaded_verified`: the exact object exists in
the Shanghai Bucket, and remote content length plus CRC64-ECMA match the local
file.

Runtime contract: env `EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON`,
`EXPERIMENT_FOUNDATION_INPUT_1_DIR`, `EXPERIMENT_FOUNDATION_INPUT_2_DIR`,
`EXPERIMENT_FOUNDATION_OUTPUT_DIR`, plus
`--cell-key=retriever-top-k-5|retriever-top-k-10`. Local selftest uses the
files in `fixture/` and the command recorded in the T-132 verification ledger.

Dataset (per approved decision): BEIR SciFact slice — `corpus.jsonl` and
`queries.jsonl` are separate content-addressed mirror directories under
`oss://<bucket>/input/scifact/`, with digests recorded in the mirror
manifests and cleanup after M7-L2.

`manifests/scifact-mirrors-v1.json` freezes that slice as the complete
5,183-document SciFact corpus plus the 300 test-query IDs from
`qrels/test.tsv`, preserving source query order. Qrels and training data are
not uploaded. The manifest records the BEIR archive checksum and the upstream
SciFact corpus/query license split.

Both mirrors are `uploaded_verified`. Their exact OSS object refs, content
lengths, ETags and remote/local CRC64-ECMA matches are recorded in
`manifests/scifact-mirrors-v1.json`. This closes object preparation only; it
does not authorize or prove a DLC job, image pull, runtime mount or scientific
result.
