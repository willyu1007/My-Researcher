# 01 Plan

## Phases
1. [x] Inventory design docs, existing repo contracts, active task packages, and context glossary.
2. [x] Build object ownership map for `PaperImplementation`, `PaperProject`, topic-selection handoff, experiment-foundation, and desktop projections.
3. [x] Build design-component ownership map for implementation control plane, harness, portfolio, feedback, and evaluation components.
4. [x] Build current-state gap matrix for contracts, persistence, services, routes, read-models, UI, and tests.
5. [x] Build minimum columnized-field matrix for gate, queue, trace, WorkOrder/run, claim/dossier, and evaluation queries.
6. [x] Produce dependency order for T-093 through T-101.
7. [x] Record unresolved conflicts or confirm there are none.

## Review Before Next Flow
- Confirmed `ImplementationIntakeSnapshot` source fields are enough for T-093.
- Confirmed trace requirements are known early enough for all later flow nodes.
- Confirmed portfolio, runtime harness, upstream feedback, and queryability requirements have explicit child owners.
- Confirmed each data-bearing child knows which fields must be queryable rather than JSON-only.
- Confirmed no child task depends on `research-argument` authority writes.

## Verification
- Governance lint after task creation and after final gap map.
- Manual coverage review against D1-D10, implementation design-doc components, and minimum DB/queryability requirements.
