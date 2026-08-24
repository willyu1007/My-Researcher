# T-096 Paper Implementation WorkOrder Experiment Bridge

## Status
- State: done
- Parent task: `T-091 paper-implementation-full-landing`
- Mapping: `M-001 > F-001 > R-013`
- Flow node: `ResearchWorkOrder -> experiment-foundation -> eligible RunEvidenceUnit / ValidationCycle closure accounting`
- Next step: enter `T-098 paper-implementation-result-claim-dossier`.
- Semantic supersession (2026-07-12): T-132 D-16 replaces the historical all-terminal-outcomes-as-REU model. Historical T-096 tests remain valid for that implementation only; productized migration must split eligible scientific REU from failed/cancelled/incomplete execution accounting.

## Goal
- Make all implementation experiment execution pass through `ResearchWorkOrder`.
- Integrate experiment-foundation assets/results by refs and hashes.
- Define run-monitor intake and evidence-ledger writer behavior for asynchronous results.
- Retain every Run as immutable queryable history without one overloaded object: complete protocol-compliant validation-passed EvidenceCandidate may enter `RunEvidenceUnit`; only the `closure_watermark` current-effective branch heads enter the immutable ValidationCycle execution-accounting snapshot/hash; valid negative/inconclusive remains REU-eligible on a separate scientific-disposition axis.

## Non-goals
- Do not copy experiment-foundation assets into paper-implementation state.
- Do not create final claim evidence from `EvidenceCandidate` directly.
- Do not allow naked agent or UI experiment submission.

## Acceptance Criteria
- [x] Work orders bind motive/assertion/validation-cycle refs and run policy.
- [x] Experiment-foundation refs/hashes are preserved without ownership drift.
- [x] `RunMonitorAdapter` intake rejects or marks untrusted any run result without `work_order_id`.
- [x] `EvidenceLedgerWriter` writes queryable run status, run type, data/code/config refs, and failure summaries.
- [x] Historical V1 retained failed and inconclusive runs as `RunEvidenceUnit`; T-132 D-16 explicitly supersedes that target for future/productized work without rewriting the historical completion fact.
- [x] T-098 can interpret results from run evidence without reading raw platform state.
