# 02 Architecture

## Extraction Strategy
- Use section-level extraction followed by paper-level consolidation.
- LLM output must be schema-bound and validated.
- Backend validator is the only source of readiness truth.

## Categories
- research problem.
- contributions.
- method.
- datasets and benchmarks.
- experiments.
- key findings.
- limitations.
- reproducibility.
- related work positioning.
- evidence candidates.
- figure/table insights.
- claim-evidence map.
- automation signals.
- quality report.

## Direct Replacement
- Remove the old fallback key-content digest generator as the normal path.
- Preserve only explicit dev/test fixtures if needed.

## DB Boundary
- Full semantic dossier starts as artifact JSON.
- Query-heavy fields may move to tables only through a later DB SSOT task.
