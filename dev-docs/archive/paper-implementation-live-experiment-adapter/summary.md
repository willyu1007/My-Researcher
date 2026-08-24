# paper-implementation-live-experiment-adapter

## Outcome

- Connect `ResearchWorkOrder` to the existing experiment-foundation execution surface so PaperImplementation can submit, sync, collect, and ingest real experiment jobs through the trusted WorkOrder path.
- Preserve `ResearchWorkOrder -> external job -> RunMonitorIntake -> eligible EvidenceCandidate -> RunEvidenceUnit` as the only trusted scientific-evidence ingress, alongside exact terminal Run/Attempt facts for whole-Cycle readiness and closure accounting. Scientific interpretation then follows `CycleReadyForInterpretation -> Result Analysis proposal -> ValidationCycle closure -> ResultInterpretationPacket` outside T-104.
- Convert only complete protocol-compliant validation-passed outcomes into target-specific, trace-ready `RunEvidenceUnit`; failed/cancelled/incomplete outcomes remain monitor/Attempt/Cycle closure facts.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-104`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-013` — Paper implementation full landing baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/paper-implementation-live-experiment-adapter/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
