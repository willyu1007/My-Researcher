# D-19 official source-policy evidence

## Research brief

The review asks only whether the two exact D-19 dataset revisions have authoritative source identity, reproducible integrity evidence, usable access terms and an explicit license policy. Evidence is restricted to Wikimedia, Google Research Datasets and Creative Commons primary sources. The review did not download the full Wikipedia corpus, execute a provider job or test scientific benchmark validity.

The machine-readable companion is [`00-d19-source-policy-attestation.json`](./00-d19-source-policy-attestation.json). The identifiers, source URIs, checksums and policy expressions below MUST remain exact; resolving a different revision or a mutable latest source is outside the source-policy decision.

## Primary-source evidence

| Fixture | Exact source and integrity evidence | Official policy evidence | Finding |
|---|---|---|---|
| Wikipedia raw corpus source bundle | Wikimedia [`mediawiki_content_current/enwiki/2026-07-01/xml/bzip2`](https://dumps.wikimedia.org/other/mediawiki_content_current/enwiki/2026-07-01/xml/bzip2/) contains the 19 selected `enwiki-2026-07-01-*.xml.bz2` shards. The official [`SHA256SUMS`](https://dumps.wikimedia.org/other/mediawiki_content_current/enwiki/2026-07-01/xml/bzip2/SHA256SUMS) supplies the per-shard SHA-256 values snapshotted in the attestation; the manifest itself was captured as `sha256:b31889aa2d3bb9ca5c97086f085be535069b91aa4ca7a6a71e8cb0c57bf2aca0`. Exact revision: `mediawiki_content_current:enwiki:2026-07-01`. | Wikimedia's [dump license guide](https://dumps.wikimedia.org/legal.html) states that original textual content is available under CC BY-SA 4.0 as well as GFDL, while image licensing, fair-use material and possible infringements require separate treatment. The selected reuse path is therefore [`CC-BY-SA-4.0`](https://creativecommons.org/licenses/by-sa/4.0/) with text-only consumer scope, attribution, license notice, modification notice and ShareAlike obligations; non-text media is excluded from permitted downstream use. | **Sufficient for source-policy attestation** for exactly the 19 raw source shards. This revision is a control-plane source bundle, not a parsed RAGPerf document corpus. Public directory and manifest access are established; full-shard retrieval and re-hashing were not performed. |
| Natural Questions query workload | Google Research Datasets' commit-pinned [`NQ-open.dev.jsonl`](https://github.com/google-research-datasets/natural-questions/blob/fb26a3073b1fe636c97302890a27b491d6530130/nq_open/NQ-open.dev.jsonl) is the original dev split. The exact [raw source](https://raw.githubusercontent.com/google-research-datasets/natural-questions/fb26a3073b1fe636c97302890a27b491d6530130/nq_open/NQ-open.dev.jsonl) contains 3,610 records, is 391,316 bytes and hashes to `f15567f38099f3615f5b8a685c0aef449c11ad90d3da3735e8d1b98115b40616`. Exact revision: `git:fb26a3073b1fe636c97302890a27b491d6530130`. | The commit-pinned official [NQ-Open README](https://github.com/google-research-datasets/natural-questions/blob/fb26a3073b1fe636c97302890a27b491d6530130/nq_open/README.md) identifies the 3,610-record original dev split, the `question`/`answer` fields, derivation from Natural Questions and the [`CC-BY-SA-3.0`](https://creativecommons.org/licenses/by-sa/3.0/) license. The README states that the questions are answerable from English Wikipedia, but does not bind the questions to the 2026 dump revision. | **Sufficient for source-policy attestation** for the original-dev query workload only. `question` MAY be used as workload input; `answer` remains a reference label and MUST NOT be treated as generated scientific evidence. |

## Decision

**PASS — official source-policy evidence is sufficient for the two exact D-19 fixture revisions at the control-plane source-binding tier.** The source-policy blocker may be resolved when the persisted typed Dataset/DataPolicy revisions exactly match the companion attestation and the gate verifies those server-issued hashes. The decision does not authorize substitution of another Wikipedia dump, an NQ split other than original dev, media reuse, mutable `latest` resolution, or scientific execution against the raw bundle.

The PASS means only that the exact source, access, license and integrity policy inputs are supportable. The PASS does **not** establish any of the following:

- download or checksum verification of the complete 19-shard Wikipedia corpus;
- scientific alignment between the NQ questions/answers and the 2026-07-01 Wikipedia snapshot;
- retrieval quality, metric validity, result correctness, validation or evidence eligibility;
- provider/cloud execution, training, paid external requests or scientific evidence generation;
- migration application to an existing environment, product admission enablement, traffic/writer cutover or legacy lineage upgrade.

## Unresolved scientific risks

1. **Temporal corpus mismatch:** the NQ-Open statement that questions are answerable from English Wikipedia is not evidence that the answers remain present, equivalent or retrievable in the 2026-07-01 snapshot. A later scientific gate MUST measure exact-snapshot coverage and define unanswerable handling.
2. **Extraction reproducibility:** the 19 XML shards identify source bytes, not the eventual parsed/indexed corpus. The extractor version, namespace filtering, redirect handling, markup normalization, document identity and derived-corpus hash remain to be frozen and verified.
3. **Reference-label limits:** NQ answers may be incomplete, ambiguous or time-sensitive. They MUST NOT be promoted to result truth or evidence without the future protocol's scoring and validation path.
4. **Content and rights exceptions:** Wikimedia warns about page-specific attribution, fair-use material and possible infringements; NQ originates from real anonymized, aggregated search questions and may contain sensitive or unsafe text. Distribution and product use still require attribution, content-safety and applicable-rights review.
5. **Operational scale:** storage, bandwidth, decompression, indexing capacity and provider compatibility for the complete Wikipedia source have not been exercised. These are execution-readiness questions, not source-policy facts.
