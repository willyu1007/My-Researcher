#!/usr/bin/env python3
"""T-132 M7-L1 diagnostic canary workload (ragperf-canary profile).

A real, deterministic, CPU-only retrieval micro-pipeline: loads a mirrored
JSONL corpus and query set, builds hashed-token TF-IDF embeddings, runs
cosine top-k retrieval, and measures wall-clock stage timings on the provider.

Honesty boundary: this is the L1 CANARY profile (`ragperf_canary_stats@v1`),
NOT the L2 scientific RAGPerf bundle. It measures real compute timings for the
submit→run→collect acceptance; it does not claim quality metrics
(factual_correctness etc.) and its output stays diagnostic-only
(`evidence_eligibility=false`). All emitted numbers are integers so the
canonical JSON bytes are identical between this writer and the JS verifier.

Runtime inputs (all injected by the CreateJob payload, never baked in):
  EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON  exact envelope lineage JSON
  EXPERIMENT_FOUNDATION_INPUT_1_DIR          corpus.jsonl mount directory
  EXPERIMENT_FOUNDATION_INPUT_2_DIR          queries.jsonl mount directory
  EXPERIMENT_FOUNDATION_OUTPUT_DIR           result output mount directory
  --cell-key                                  approved top-k cell selector
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sys
import time
from collections import Counter

EMBEDDING_DIMENSIONS = 512
PARSER_PROFILE_VERSION = "ragperf_canary_stats@v1"
RESULT_ENVELOPE_SCHEMA = "ExperimentFoundationProviderResultEnvelope@v1"
TOP_K_BY_CELL_KEY = {
    "retriever-top-k-5": 5,
    "retriever-top-k-10": 10,
}


def canonical_json(value: object) -> str:
    """Byte-identical to the repo's canonicalizeExperimentV2Json for the
    value shapes this workload emits (strings, integers, objects, arrays)."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def tokenize(text: str) -> list[str]:
    return [token for token in "".join(
        ch.lower() if ch.isalnum() else " " for ch in text
    ).split() if len(token) > 1]


def hashed_tfidf(texts: list[list[str]]) -> list[dict[int, float]]:
    document_frequency: Counter[int] = Counter()
    hashed_docs: list[Counter[int]] = []
    for tokens in texts:
        counts: Counter[int] = Counter()
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            counts[int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSIONS] += 1
        hashed_docs.append(counts)
        document_frequency.update(counts.keys())
    total = max(1, len(texts))
    vectors: list[dict[int, float]] = []
    for counts in hashed_docs:
        vector: dict[int, float] = {}
        for dimension, term_frequency in counts.items():
            idf = math.log((1 + total) / (1 + document_frequency[dimension])) + 1.0
            vector[dimension] = term_frequency * idf
        norm = math.sqrt(sum(weight * weight for weight in vector.values())) or 1.0
        vectors.append({dimension: weight / norm for dimension, weight in vector.items()})
    return vectors


def cosine(left: dict[int, float], right: dict[int, float]) -> float:
    if len(right) < len(left):
        left, right = right, left
    return sum(weight * right.get(dimension, 0.0) for dimension, weight in left.items())


def load_jsonl(path: str, text_fields: tuple[str, ...]) -> list[str]:
    entries: list[str] = []
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            text = " ".join(str(record.get(field, "")) for field in text_fields).strip()
            if text:
                entries.append(text)
    if not entries:
        raise SystemExit(f"empty input: {path}")
    return entries


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cell-key", required=True, choices=sorted(TOP_K_BY_CELL_KEY))
    arguments = parser.parse_args()
    source_binding = json.loads(
        os.environ["EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON"]
    )
    corpus_path = os.path.join(
        os.environ["EXPERIMENT_FOUNDATION_INPUT_1_DIR"],
        "corpus.jsonl",
    )
    queries_path = os.path.join(
        os.environ["EXPERIMENT_FOUNDATION_INPUT_2_DIR"],
        "queries.jsonl",
    )
    top_k = TOP_K_BY_CELL_KEY[arguments.cell_key]
    output_dir = os.environ["EXPERIMENT_FOUNDATION_OUTPUT_DIR"]
    if source_binding.get("parser_profile_version") != PARSER_PROFILE_VERSION:
        raise SystemExit("parser profile version does not match the canary workload")
    if source_binding.get("result_envelope_schema") != RESULT_ENVELOPE_SCHEMA:
        raise SystemExit("result envelope schema does not match the canary workload")
    os.makedirs(output_dir, exist_ok=True)

    pipeline_start = time.monotonic_ns()
    corpus = load_jsonl(corpus_path, ("title", "text"))
    queries = load_jsonl(queries_path, ("text",))

    embedding_start = time.monotonic_ns()
    corpus_vectors = hashed_tfidf([tokenize(text) for text in corpus])
    query_vectors = hashed_tfidf([tokenize(text) for text in queries])
    embedding_time_ns = time.monotonic_ns() - embedding_start

    retrieval_start = time.monotonic_ns()
    retrieved_total = 0
    checksum = hashlib.sha256()
    for query_vector in query_vectors:
        scored = sorted(
            range(len(corpus_vectors)),
            key=lambda index: (-cosine(query_vector, corpus_vectors[index]), index),
        )[:top_k]
        retrieved_total += len(scored)
        checksum.update(",".join(map(str, scored)).encode("utf-8"))
    retrieval_time_ns = time.monotonic_ns() - retrieval_start
    total_pipeline_time_ns = time.monotonic_ns() - pipeline_start
    qps_micro = (len(queries) * 1_000_000 * 1_000_000_000) // max(1, retrieval_time_ns)

    stats_lines = [
        f"embedding_time_ns={embedding_time_ns}",
        f"retrieval_time_ns={retrieval_time_ns}",
        f"total_pipeline_time_ns={total_pipeline_time_ns}",
        f"qps_micro={qps_micro}",
        f"corpus_documents={len(corpus)}",
        f"query_count={len(queries)}",
        f"top_k={top_k}",
        f"retrieved_total={retrieved_total}",
        f"retrieval_checksum=sha256:{checksum.hexdigest()}",
        f"embedding_dimensions={EMBEDDING_DIMENSIONS}",
        "profile=ragperf_canary_stats@v1",
        "scientific_claim=none (diagnostic canary; quality metrics intentionally absent)",
    ]
    stats_text = "\n".join(stats_lines) + "\n"
    stats_path = os.path.join(output_dir, "text_pipeline_stats.txt")
    with open(stats_path, "w", encoding="utf-8") as handle:
        handle.write(stats_text)

    envelope = dict(source_binding)
    envelope["outputs"] = {
        "profile": PARSER_PROFILE_VERSION,
        "diagnostic_only": True,
        "metrics": {
            "embedding_time_ns": embedding_time_ns,
            "retrieval_time_ns": retrieval_time_ns,
            "total_pipeline_time_ns": total_pipeline_time_ns,
            "qps_micro": qps_micro,
        },
        "counts": {
            "corpus_documents": len(corpus),
            "query_count": len(queries),
            "top_k": top_k,
            "retrieved_total": retrieved_total,
        },
        "retrieval_checksum": f"sha256:{checksum.hexdigest()}",
        "artifacts": {
            "text_pipeline_stats_sha256": hashlib.sha256(
                stats_text.encode("utf-8")
            ).hexdigest(),
        },
    }
    result_path = os.path.join(output_dir, "result.json")
    with open(result_path, "w", encoding="utf-8") as handle:
        handle.write(canonical_json(envelope))
    print(json.dumps({
        "status": "ok",
        "result_path": result_path,
        "stats_path": stats_path,
        "total_pipeline_time_ns": total_pipeline_time_ns,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
