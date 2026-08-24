# 05 Pitfalls

## Do Not Repeat
- Do not mutate admitted motive versions in place.
- Do not let draft creation mutate active portfolio roles; draft motives remain parked until admission.
- Do not let board summaries become evidence.
- Do not rely on exact string casing or separators when blocking summary/memo/interpretation evidence refs.
- Do not move evidence across motive, version, or board boundaries by creating a new direct `EvidenceBinding`; use trace-ready `EvidenceTransferBinding`.
- Do not hide challenge evidence because it weakens a motive.
- Do not create readiness vocabulary that bypasses dossier gates.
- Do not let multiple active motives bypass `CoreMotiveSet` constraints.
- Do not change primary motive roles without a `MotivePortfolioDecision` and required confirmation.
- Do not submit a portfolio decision that omits an existing motive from all post-decision role buckets.
- Do not validate `MotiveEvolutionDecision` trace manifests against the trace id; validate against the actual evolution decision id.
- Do not let approved/applied `MotiveEvolutionDecision` objects exist or be consumed without a complete trace.
- Do not let T-095 treat draft or trace-incomplete motive versions as validation-ready inputs.
- Do not let optional JSON payloads become the only place for gate, trace, portfolio, confirmation, or source-ref lookup fields.
- Do not add parallel motive authority under topic-selection, writing, desktop UI, or legacy `research-argument`.
