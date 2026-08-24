# paper-implementation-workorder-experiment-bridge

## Outcome

- Make all implementation experiment execution pass through `ResearchWorkOrder`.
- Integrate experiment-foundation assets/results by refs and hashes.
- Define run-monitor intake and evidence-ledger writer behavior for asynchronous results.
- Retain every Run as immutable queryable history without one overloaded object: complete protocol-compliant validation-passed EvidenceCandidate may enter `RunEvidenceUnit`; only the `closure_watermark` current-effective branch heads enter the immutable ValidationCycle execution-accounting snapshot/hash; valid negative/inconclusive remains REU-eligible on a separate scientific-disposition axis.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-096`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-013` — Paper implementation full landing baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/paper-implementation-workorder-experiment-bridge/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
