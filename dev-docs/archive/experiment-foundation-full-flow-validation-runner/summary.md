# experiment-foundation-full-flow-validation-runner

## Outcome

- Provide one operator-facing command for experiment-foundation full-flow validation.
- Preflight `.env.local`, Postgres connectivity, applied migrations, LocalScript execution root, and required backend/desktop ports before running expensive checks.
- Run deterministic harness lanes for shared contracts, backend registry/readiness/promotion/execution/result/evidence, desktop smoke, and governance.
- Add opt-in real-environment lanes for local Postgres smoke and future Aliyun canary without making credentials or cloud spend part of the default suite.
- Emit a redacted validation report that separates deterministic checks, real local DB checks, and external opt-in checks.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-103`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-full-flow-validation-runner/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
