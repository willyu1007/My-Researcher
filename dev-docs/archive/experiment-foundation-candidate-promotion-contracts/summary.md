# experiment-foundation-candidate-promotion-contracts

## Outcome

- Convert literature key-content and manual observations into grounded asset candidates that can be rejected, marked needs_info, manually reviewed, or promoted into canonical assets without polluting asset lifecycle states.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-075`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-012` — Experiment foundation reusable assets baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Promotion outputs canonical refs, not partial asset blobs.
- Candidate states cannot leak into canonical lifecycle.
- High-risk candidates require review.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/experiment-foundation-candidate-promotion-contracts/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
