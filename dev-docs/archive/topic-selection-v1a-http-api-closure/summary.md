# topic-selection-v1a-http-api-closure

## Outcome

- Close the backend HTTP/API layer for v1a so clients can drive the already implemented service chain through Fastify routes.
- Preserve the existing service/repository contracts and keep HTTP concerns at the controller/route boundary.
- Add route-level smoke coverage that proves `buildApp()` wiring can create a human-confirmed `ValidatedNeed` and v1b input bundle.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-053`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-05-16`

### Historical Requirement provenance

- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- The complete old verification record remains available at the recovery reference below.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-selection-v1a-http-api-closure/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
