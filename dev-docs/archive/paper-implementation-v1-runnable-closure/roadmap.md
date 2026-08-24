# Roadmap

## Decision
Create `T-109 paper-implementation-v1-runnable-closure` as the PaperImplementation V1 runnable closure package under `M-001 > F-001 > R-013`.

`T-109` does not reopen `T-091` or replace `T-101`. It turns the already implemented PaperImplementation V1 task chain into a reproducible, diagnosable, operator-ready flow.

## Scope
### In Scope
- Define the V1 runnable flow contract from active upstream handoff to writing-ready packet projection.
- Produce a fixture inventory for deterministic happy path and required blocked paths.
- Decide and implement the minimum replay surface: service-level, route-level, CLI smoke, or a staged combination.
- Verify seams across `T-093` through `T-105`, including live adapter and provider preflight boundaries.
- Record where the V1 flow is automatic, where it requires human confirmation, and where it intentionally stops at preflight/projection.
- Produce residual-risk and operator checklists that future implementation work can consume without reinterpreting authority ownership.

### Out Of Scope
- New PaperImplementation authority objects.
- Prisma schema changes unless a decision point explicitly proves current queryable fields are insufficient.
- Live LLM/provider execution.
- Default real cloud experiment execution.
- Writing module ingestion beyond `WritingEntryPacket` projection unless explicitly approved.
- UI redesign or broad browser E2E.
- `research-argument` authority revival.

## Decision Points
| ID | Decision | Recommendation | Status |
|---|---|---|---|
| R1 | Runner depth | Start with route-level replay plus service-level helpers; add a CLI smoke command after the sequence stabilizes. | confirmed |
| R2 | Persistence depth | Require deterministic in-memory replay; keep local Postgres/disposable-schema as optional and non-blocking by default, but upgrade it to closure-required if queryability, idempotency, or recovery parity cannot be trusted without real DB verification. | confirmed |
| R3 | Experiment execution depth | Include a deterministic linked-loop test from PaperImplementation to experiment-foundation seam, trusted run evidence, result/feedback/review, adjusted next-step planning, and continued progression. Use fake/local external job semantics by default; keep real cloud execution optional/manual evidence outside closure. | confirmed |
| R4 | UI proof depth | Keep UI proof restrained: require route/static command-read-model boundary checks and defer browser smoke or UI adaptation until the backend flow is closed, unless a concrete UI/backend drift defect appears. | confirmed |
| R5 | Writing depth | Treat `WritingEntryPacket` projection as the required V1 writing boundary; do not perform writing-module ingestion, paragraph placement, citation insertion, or document mutation in T-109. | confirmed |
| R6 | Required blocked paths | P0 blocked paths are closure-required; P1 paths are included where cheap or already covered, otherwise assigned owners; P2 paths are residual risks unless T-109 discovers a concrete defect. | confirmed |
| R7 | Relationship to T-106 | T-109 validates the PaperImplementation-facing experiment seam itself and may consume T-106 evidence opportunistically, but T-106 closure is not a prerequisite and experiment-foundation internal hardening stays in T-106. | confirmed |
| R8 | Closure standard | Close only with a repeatable replay entrypoint plus runnable evidence package. Scattered unit tests are insufficient; route-level replay can close first, and CLI smoke may follow after flow stabilization. | confirmed |
| R9 | Data artifact policy | Produce structured redacted runnable artifacts under `.ai/.tmp` by default. Store refs, statuses, gates, hashes, and summaries only; never store credentials, raw provider hidden reasoning, cloud secrets, private manuscript text, or large raw external payloads. | confirmed |
| R10 | Governance result | Treat T-109 as a post-closure runnable package by default. Do not reopen T-091/T-101 or D1-D10 unless T-109 discovers a true design contradiction or an unclosable P0 blocker. | confirmed |

## Recommended Execution Order
1. Build the V1 flow map and API/service sequence from existing T-093 through T-105 contracts.
2. Create fixture inventory for happy path and blocked paths.
3. Add the minimum replay/smoke entrypoint.
4. Run targeted shared/backend/route/typecheck verification.
5. Record runnable status, operator checklist, residual risks, and follow-up split candidates.

## Completion Signal
T-109 is complete when a developer can run or follow one stable PaperImplementation V1 replay path, inspect the produced evidence, understand every intentional stop/manual gate, and verify there is no second authority track.
