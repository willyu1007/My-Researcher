# repository-governance-convergence

## Outcome

- Converged My-Researcher onto the fixed task-bundle and project-hub contract without changing task identities or the semantic Milestone/Feature graph.
- Converted 142 pre-existing archives to compact `.ai-task.json + summary.md` bundles; T-043 and T-129 remain planned and active.
- Removed repository-local skill trees and retired governance mechanisms. `.ai/` now contains only project-hub records and the fixed governance CLI/libraries.
- Relocated maintained fixtures, scenario/process contracts, environment utilities, and seven supported backend validation scripts before removing their old owners.
- Removed UI governance scaffolding while preserving the loaded `ui/styles/**` runtime compatibility boundary; no visual refactor was performed.
- Updated CI, hooks, package entrypoints, repository guidance, and context documentation to the supported final surface.

## Project placement

- Task: `T-145`
- Feature: `F-000` — Inbox / Untriaged
- Milestone: `M-000` — Inbox / Triage
- Completed: `2026-08-24`

The 13 retired Requirement objects remain provenance in migrated archive summaries only; none was promoted into the current Milestone/Feature graph.

## Durable verification

- Fixed governance strict lint, sync, resume, task queries, and project queries passed.
- Normalized pre/post comparisons preserved M-000/M-001, F-000/F-001/F-002, all task IDs, lifecycle states, paths, and F/M mappings.
- Shared, backend, and desktop typechecks passed; focused runtime tests and all retained matrix/ownership checks passed.
- The full runtime-stress underlying lanes passed. Its final named-coverage summary exposed only four stale assertions from a prior writer-ownership cutover; the manifest was corrected and focused completeness checks passed without a third full rerun.
- Final `.ai`, task-bundle, UI, package, hook, retired-reference, residue, and staged-diff inspections passed.

## Recovery and migration note

- `405c6049` is the verified live-asset relocation checkpoint.
- `5cf904fb` is the complete normalized old-contract recovery point, including detailed historical task contents.
- `7cd0cddd` is the verified fixed-contract cutover and completed T-145 record before archive compression.
- Historical commands and paths in pre-conversion Git snapshots are evidence, not current operational interfaces.
