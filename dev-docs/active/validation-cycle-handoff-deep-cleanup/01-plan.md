# T-144 Plan

## Phases

1. [x] Add the missing runtime schema boundary and make the test artifact production-representative.
2. [x] Extract pure authority comparison helpers without changing behavior.
3. [ ] Run focused and full verification, then land and close T-144. Local verification is complete; commit, push, and CI remain.

## Detailed steps

1. Compile the existing shared `paperImplementationValidationCyclePlanningArtifactSchema` once in a private handoff authority module.
2. Parse the recovered artifact payload before candidate selection and map invalid persisted JSON to `VERSION_CONFLICT`.
3. Rebuild the handoff coordinator fixture from the existing complete runtime-envelope fixture builder and make its passed artifact satisfy the two-candidate and non-empty lineage requirements.
4. Add negative tests for malformed hash-consistent persisted payloads and retain create/replay/concurrency assertions.
5. Move deterministic coordinator/cycle comparisons and functional-ref/trace helpers into the private authority module.
6. Keep orchestration, repository reads, coordinator advancement, cycle writes, response assembly, and in-flight convergence in the existing application service.
7. Run focused tests and typecheck after the behavior checkpoint and again after extraction, then run the full release gates.

## Risks & mitigations

- Risk: schema validation rejects a fixture that never represented a production artifact.
  - Mitigation: reuse the repository's complete test envelope builder and satisfy the canonical planning artifact schema rather than weakening validation.
- Risk: extraction changes error mapping or deterministic hashes.
  - Mitigation: move existing comparison logic verbatim after the behavior fix is green; retain all service-level replay and drift tests.
- Risk: a helper module becomes a second service or public abstraction.
  - Mitigation: export only pure functions used by the handoff service; add no app wiring or barrel export.

## Rollback points

- Baseline: `a22112f3b8e5eb718d9079d10e4dc6b15c9610a2` with green CI.
- Checkpoint 1: runtime schema validation plus representative fixture and focused tests.
- Checkpoint 2: pure-helper extraction with unchanged focused behavior.
