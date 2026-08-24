# topic-semantics-to-core-motive-bootstrap

## Outcome

Give an LLM one semantic command that starts from an existing `ImplementationProject`, restores T-138 topic semantics, and creates or recovers exactly one admitted first-primary CoreMotive without caller-side technical orchestration.

The task was complete under the previous repository contract and is archived by location under the current contract.

## Project placement

- Task: `T-140`
- Feature: `F-001` — Research Lifecycle Governance Core
- Milestone: `M-001` — LLM Research Lifecycle v1
- Last old-contract update: `2026-08-24`

### Historical Requirement provenance

- `R-013` — Paper implementation full landing baseline
- `R-009` — Automated topic management decision layer baseline

The retired Requirement objects are provenance only; they were not promoted into the current Milestone/Feature graph.

## Durable verification

- Project governance synchronization and lint after the implementation handoff update.
- Project-state verification.
- Documentation strict lint: 8/8 files, 0 warnings, 0 errors.
- OpenAPI quality, generated API index, and Context strict verification.
- `git diff --check` and final diff review.
- Implementation commit `40150423d56c4c5355a36683320622f0bbca8d2f` with `Task: T-140` pushed to `main`.
- GitHub Actions run `32611209572` passed all four jobs, including isolated-Prisma backend tests.

## Recovery and migration note

The complete pre-conversion bundle, including detailed decisions, verification, tools, and historical artifacts, is recoverable from Git at `5cf904fb:dev-docs/archive/topic-semantics-to-core-motive-bootstrap/`. During T-145 the archive was compressed only after live fixtures and maintained contracts had moved to supported owners. Historical paths and commands in that snapshot are evidence, not current operational interfaces.
