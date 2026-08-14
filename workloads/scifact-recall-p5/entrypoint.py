#!/usr/bin/env python3
"""Deterministic SciFact retrieval-recall workload for T-136 P5.

The provider executes this program for one frozen cell. Corpus, test queries and
qrels are exact mounted dataset revisions; no scientific value is accepted from
the caller. The only cell factor is retrieval top-k. The emitted metric is
micro recall in integer parts-per-million so Python and TypeScript canonical JSON
remain byte-identical.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import os
import sys
from collections import Counter

EMBEDDING_DIMENSIONS = 512
METRIC_SCALE = 1_000_000
PARSER_PROFILE_VERSION = "scientific_result_parser@v1"
PARSER_PROFILE_HASH = "sha256:96f287cdaf36ceb92df971a9b917f183423bd13d7045fda32445ed68b52ab519"
RESULT_ENVELOPE_SCHEMA = "ExperimentFoundationProviderResultEnvelope@v1"
SCIENTIFIC_RESULT_SCHEMA = "ExperimentFoundationScientificResultPayload@v1"
SCIENTIFIC_OBSERVATION_KEY = "scifact_micro_recall_ppm"
TOP_K_BY_CELL_KEY = {
    "retriever-top-k-10": 10,
    "retriever-top-k-5": 5,
}


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def tokenize(text: str) -> list[str]:
    normalized = "".join(character.lower() if character.isalnum() else " " for character in text)
    return [token for token in normalized.split() if len(token) > 1]


def load_jsonl_records(
    path: str,
    text_fields: tuple[str, ...],
) -> list[tuple[str, str]]:
    records: list[tuple[str, str]] = []
    seen_ids: set[str] = set()
    with open(path, "r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            value = json.loads(line)
            record_id = str(value.get("_id", "")).strip()
            text = " ".join(str(value.get(field, "")) for field in text_fields).strip()
            if not record_id or not text or record_id in seen_ids:
                raise SystemExit(f"invalid or duplicate JSONL record at {path}:{line_number}")
            seen_ids.add(record_id)
            records.append((record_id, text))
    if not records:
        raise SystemExit(f"empty input: {path}")
    return records


def load_positive_qrels(path: str) -> dict[str, set[str]]:
    qrels: dict[str, set[str]] = {}
    seen_pairs: set[tuple[str, str]] = set()
    with open(path, "r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        if reader.fieldnames != ["query-id", "corpus-id", "score"]:
            raise SystemExit("qrels header must be query-id, corpus-id, score")
        for row_number, row in enumerate(reader, start=2):
            query_id = str(row["query-id"]).strip()
            corpus_id = str(row["corpus-id"]).strip()
            try:
                score = int(row["score"])
            except (TypeError, ValueError) as error:
                raise SystemExit(f"invalid qrels score at {path}:{row_number}") from error
            pair = (query_id, corpus_id)
            if not query_id or not corpus_id or pair in seen_pairs:
                raise SystemExit(f"invalid or duplicate qrels pair at {path}:{row_number}")
            seen_pairs.add(pair)
            if score > 0:
                qrels.setdefault(query_id, set()).add(corpus_id)
    if not qrels or any(not relevant for relevant in qrels.values()):
        raise SystemExit(f"qrels contains no positive judgments: {path}")
    return qrels


def hashed_counts(tokens: list[str]) -> Counter[int]:
    counts: Counter[int] = Counter()
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        counts[int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSIONS] += 1
    return counts


def vectorize(
    counts: Counter[int],
    document_frequency: Counter[int],
    corpus_size: int,
) -> dict[int, float]:
    vector: dict[int, float] = {}
    for dimension, term_frequency in counts.items():
        inverse_document_frequency = (
            math.log((1 + corpus_size) / (1 + document_frequency[dimension])) + 1.0
        )
        vector[dimension] = term_frequency * inverse_document_frequency
    norm = math.sqrt(sum(weight * weight for weight in vector.values())) or 1.0
    return {dimension: weight / norm for dimension, weight in vector.items()}


def build_corpus_vectors(texts: list[str]) -> tuple[list[dict[int, float]], Counter[int]]:
    counts_by_document = [hashed_counts(tokenize(text)) for text in texts]
    document_frequency: Counter[int] = Counter()
    for counts in counts_by_document:
        document_frequency.update(counts.keys())
    return (
        [
            vectorize(counts, document_frequency, len(counts_by_document))
            for counts in counts_by_document
        ],
        document_frequency,
    )


def cosine(left: dict[int, float], right: dict[int, float]) -> float:
    if len(right) < len(left):
        left, right = right, left
    return sum(weight * right.get(dimension, 0.0) for dimension, weight in left.items())


def evaluate_micro_recall(
    corpus: list[tuple[str, str]],
    queries: list[tuple[str, str]],
    qrels: dict[str, set[str]],
    top_k: int,
) -> dict[str, int | str]:
    corpus_ids = [record_id for record_id, _ in corpus]
    corpus_id_set = set(corpus_ids)
    query_ids = [record_id for record_id, _ in queries]
    if set(query_ids) != set(qrels) or len(query_ids) != len(qrels):
        raise SystemExit("query input must contain exactly the qrels query ids")
    missing_relevant = sorted(
        relevant_id
        for relevant_ids in qrels.values()
        for relevant_id in relevant_ids
        if relevant_id not in corpus_id_set
    )
    if missing_relevant:
        raise SystemExit(f"qrels references missing corpus ids: {missing_relevant[:3]}")

    corpus_vectors, document_frequency = build_corpus_vectors(
        [text for _, text in corpus]
    )
    retrieved_relevant = 0
    total_relevant = sum(len(relevant_ids) for relevant_ids in qrels.values())
    ranking_checksum = hashlib.sha256()
    for query_id, text in queries:
        query_vector = vectorize(
            hashed_counts(tokenize(text)),
            document_frequency,
            len(corpus),
        )
        ranked_indices = sorted(
            range(len(corpus_vectors)),
            key=lambda index: (-cosine(query_vector, corpus_vectors[index]), index),
        )[:top_k]
        ranked_ids = [corpus_ids[index] for index in ranked_indices]
        retrieved_relevant += len(set(ranked_ids).intersection(qrels[query_id]))
        ranking_checksum.update(query_id.encode("utf-8"))
        ranking_checksum.update(b"\0")
        ranking_checksum.update("\0".join(ranked_ids).encode("utf-8"))
        ranking_checksum.update(b"\n")

    return {
        "micro_recall_ppm": (retrieved_relevant * METRIC_SCALE) // total_relevant,
        "retrieved_relevant": retrieved_relevant,
        "total_relevant": total_relevant,
        "query_count": len(queries),
        "corpus_document_count": len(corpus),
        "ranking_checksum": f"sha256:{ranking_checksum.hexdigest()}",
    }


def build_outputs(result: dict[str, int | str], top_k: int) -> dict[str, object]:
    """Build the exact provider outputs used by both live execution and local sealing preflight."""
    return {
        "scientific_result": {
            "schema_version": SCIENTIFIC_RESULT_SCHEMA,
            "observations": [{
                "observation_key": SCIENTIFIC_OBSERVATION_KEY,
                "metric_key": "micro_recall_ppm",
                "split_key": "test",
                "value": result["micro_recall_ppm"],
                "value_type": "number",
                "unit": "ppm",
                "statistic": {
                    "kind": "proportion",
                    "sample_size": result["total_relevant"],
                },
                "uncertainty": {
                    "kind": "none",
                    "reason": "not_required_by_protocol",
                },
            }],
            "artifacts": [],
        },
        "audit": {
            "algorithm": "hashed_tfidf_sha256_512d@v1",
            "metric": "micro_recall_ppm@v1",
            "top_k": top_k,
            **result,
        },
    }


def build_scientific_preflight_outputs(top_k: int) -> dict[str, object]:
    """Return schema-valid synthetic outputs without reading datasets or provider state."""
    return build_outputs({
        "micro_recall_ppm": 500_000,
        "retrieved_relevant": 1,
        "total_relevant": 2,
        "query_count": 1,
        "corpus_document_count": 2,
        "ranking_checksum": f"sha256:{'0' * 64}",
    }, top_k)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cell-key", required=True, choices=sorted(TOP_K_BY_CELL_KEY))
    parser.add_argument("--scientific-preflight", action="store_true")
    arguments = parser.parse_args()
    top_k = TOP_K_BY_CELL_KEY[arguments.cell_key]

    if arguments.scientific_preflight:
        print(canonical_json(build_scientific_preflight_outputs(top_k)))
        return 0

    source_binding = json.loads(os.environ["EXPERIMENT_FOUNDATION_SOURCE_BINDING_JSON"])
    if source_binding.get("result_envelope_schema") != RESULT_ENVELOPE_SCHEMA:
        raise SystemExit("result envelope schema does not match the scientific workload")
    if source_binding.get("parser_profile_version") != PARSER_PROFILE_VERSION:
        raise SystemExit("parser profile version does not match the scientific workload")
    if source_binding.get("parser_profile_hash") != PARSER_PROFILE_HASH:
        raise SystemExit("parser profile hash does not match the scientific workload")
    if source_binding.get("cell_key") != arguments.cell_key:
        raise SystemExit("source binding cell key does not match the requested workload cell")

    corpus = load_jsonl_records(
        os.path.join(os.environ["EXPERIMENT_FOUNDATION_INPUT_1_DIR"], "corpus.jsonl"),
        ("title", "text"),
    )
    queries = load_jsonl_records(
        os.path.join(os.environ["EXPERIMENT_FOUNDATION_INPUT_2_DIR"], "queries.jsonl"),
        ("text",),
    )
    qrels = load_positive_qrels(
        os.path.join(os.environ["EXPERIMENT_FOUNDATION_INPUT_3_DIR"], "test.tsv")
    )
    result = evaluate_micro_recall(corpus, queries, qrels, top_k)

    envelope = dict(source_binding)
    envelope["outputs"] = build_outputs(result, top_k)
    output_dir = os.environ["EXPERIMENT_FOUNDATION_OUTPUT_DIR"]
    os.makedirs(output_dir, exist_ok=True)
    result_path = os.path.join(output_dir, "result.json")
    with open(result_path, "w", encoding="utf-8") as handle:
        handle.write(canonical_json(envelope))
    print(canonical_json({
        "cell_key": arguments.cell_key,
        "micro_recall_ppm": result["micro_recall_ppm"],
        "result_path": result_path,
        "status": "ok",
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
