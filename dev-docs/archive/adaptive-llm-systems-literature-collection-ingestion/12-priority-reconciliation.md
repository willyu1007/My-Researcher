# 12 Priority Reconciliation

## Status
- State: applied
- Date: 2026-06-04
- Purpose: normalize current-round records to one effective `priority:*` tag and record seed/query reconciliation rationale.
- Report artifact: `dev-docs/active/adaptive-llm-systems-literature-collection-ingestion/artifacts/priority-reconciliation-report.json`

## Result
- Decisions: 18.
- Records requiring tag changes: 16.
- Records updated: 16.

## Decisions
| Literature ID | Final Priority | Previous Priority Tags | Reason |
|---|---|---|---|
| `LIT-0177` | `priority:p1` | `priority:p0` | Classic retrieval-depth baseline; seed catalog classifies it as important support rather than direct frontier problem definition. |
| `LIT-0180` | `priority:p1` | `priority:p0` | Corrective RAG is an important retrieval-gating baseline, but less direct than adaptive routing/control seeds. |
| `LIT-0189` | `priority:p1` | `priority:p0` | RAGPulse is primarily an experiment-foundation workload trace and serving substrate, not a direct policy contribution. |
| `LIT-0196` | `priority:p1` | `priority:p1` | Promoted from initial p2 because B2 uses it as an experiment-foundation benchmark/evaluation candidate. |
| `LIT-0197` | `priority:p1` | `priority:p1` | Promoted from initial p2 because B2 uses it as an experiment-foundation diagnostic/evaluation candidate. |
| `LIT-0204` | `priority:p1` | `priority:p0`, `priority:p1` | RAGPerf is a benchmark/framework candidate for experiment-foundation; not a direct core policy paper. |
| `LIT-0226` | `priority:p1` | `priority:p0` | Chain-of-thought is a classic reasoning baseline for test-time compute, not the focused adaptive budgeting contribution. |
| `LIT-0227` | `priority:p1` | `priority:p0`, `priority:p1` | Self-consistency is a classic sampling baseline and verifier-budget precursor, not the focused adaptive budgeting contribution. |
| `LIT-0230` | `priority:p1` | `priority:p0` | FrugalGPT is a model-routing/cascade baseline; important support but not the current central adaptive RAG allocation target. |
| `LIT-0232` | `priority:p1` | `priority:p0`, `priority:p1` | Verifier supervision seed for strategy support; important but not direct adaptive allocation system target. |
| `LIT-0235` | `priority:p0` | `priority:p0`, `priority:p1` | Repeated-sampling inference scaling directly informs test-time compute allocation. |
| `LIT-0236` | `priority:p0` | `priority:p0`, `priority:p1` | Core test-time compute scaling seed for adaptive compute allocation. |
| `LIT-0237` | `priority:p0` | `priority:p0`, `priority:p1` | Direct compute-optimal solve/verify allocation seed. |
| `LIT-0239` | `priority:p0` | `priority:p0`, `priority:p1` | Direct confidence/calibration seed for efficient test-time scaling. |
| `LIT-0240` | `priority:p2` | `priority:p0`, `priority:p1`, `priority:p2` | Survey seed; useful for query terms and synthesis, but not an experiment card by default. |
| `LIT-0241` | `priority:p1` | `priority:p0`, `priority:p2` | Broad comparative test-time scaling seed; important support after core allocation papers. |
| `LIT-0243` | `priority:p2` | `priority:p0`, `priority:p2` | Survey seed for routing/cascading; use for synthesis and query expansion rather than direct evidence activation. |
| `LIT-0244` | `priority:p1` | `priority:p0`, `priority:p1` | Overthinking limitation seed; useful contrast case but not direct allocation method. |

## Guardrail
- This reconciliation changes priority tags only.
- It does not create literature records, sources, content assets, content-processing jobs, fulltext acquisition jobs, or pipeline runs.
- Existing judgment cards are retained for records already marked `classification:judgment-card-ready`, including survey cards that are now normalized to `priority:p2`.
