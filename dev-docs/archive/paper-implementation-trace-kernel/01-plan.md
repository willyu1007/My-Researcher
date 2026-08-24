# 01 Plan

## Phases
1. [x] Define trace object contracts and lineage categories.
2. [x] Define natural-language field role contract.
3. [x] Define `MemoAsEvidenceGuard` and source-locator checks.
4. [x] Define trace completeness and repair queue behavior.
5. [x] Define queryable trace refs required by gates, queues, dossiers, and evaluation.
6. [x] Wire trace requirements into known writing-affecting object contracts.
7. [x] Verify broken/stale/missing/non-citable trace blockers.

## Review Before Next Flow
- T-098 can require `ClaimTracePacket` and `TraceManifest` refs without inventing trace fields.
- T-100 can show trace repair from backend read models via list/resolve repair queue endpoints.
- Trace status, target refs, source locator refs, claim refs, field roles, and queue status are columnized/queryable, not JSON-only.
- Trace is attached before readiness gates; repair queue resolution does not mutate trace manifest authority.

## Verification
- Contract/schema tests passed.
- Gate tests cover missing source locator, LLM memo source misuse, natural-language role misuse, broken refs, stale refs, duplicate immutable records, and repair queue resolution.
- Future failed-run omission remains owned by T-096/T-098 after run evidence and dossier objects exist.
