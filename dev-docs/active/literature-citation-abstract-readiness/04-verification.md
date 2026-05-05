# 04 Verification

## Documentation Checks
- Task package created as a child of `T-030`.
- Registered through `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`.
- Project governance lint passed; existing unrelated `T-029` acceptance-checkbox warning remains.

## Planned Verification
- Backend unit tests for deterministic citation normalization.
- Backend unit tests for citation completeness and reason codes.
- Backend unit tests for abstract source priority and provenance.
- Integration test for explicit run through `ABSTRACT_READY`.
- Integration test that collection import does not create a content-processing run.
- Integration test that metadata/abstract patch updates stale state without enqueueing.
- Shared contract/typecheck tests when DTOs or status payloads change.
