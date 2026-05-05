# Roadmap

## Objective
- Provide the configuration foundation required by local-first content processing.

## Milestones
1. Settings inventory.
2. Provider/profile contract.
3. Storage root contract.
4. Backend/desktop implementation.
5. Verification and redaction checks.

## Test And Acceptance Baseline
- API key can be saved/updated without being returned raw.
- Embedding profile can be selected.
- Storage roots validate request shape and persist by category.
- Writability/accessibility checks are deferred to the file-consuming tasks that use those roots.
