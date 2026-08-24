# T-144 Pitfalls (do not repeat)

This file exists to prevent repeating mistakes within this task.

## Do-not-repeat summary (keep current)

- Never use a TypeScript cast as runtime validation for persisted JSON authority.
- Never make a handoff fixture simpler than the production schema at the boundary being tested.
- Never split orchestration into another service merely to reduce file length.

## Pitfall log (append-only)

### 2026-08-24 - Partial fixture hid the missing runtime schema boundary

- Symptom: the handoff test constructed a partial runtime envelope and a one-candidate planning payload through broad casts.
- Context: T-143 correctly hardened exact refs/hashes but retained the original lightweight T-142 fixture.
- What we tried: compared the fixture with `PaperImplementationRuntimeArtifactEnvelope` and `paperImplementationValidationCyclePlanningArtifactSchema`.
- Root cause: static fixture typing bypassed the persisted JSON runtime contract, so malformed payload behavior was never exercised.
- Fix / workaround: compiled the canonical shared schema once in the private authority module, validated before field access, and rebuilt the test artifact from the complete envelope helper with two valid candidates and non-empty lineage arrays.
- Prevention: recovery tests must validate fixtures against the same schema used by the producer before testing downstream authority logic.
- References: `paper-implementation-validation-cycle-handoff-service.unit.test.ts`, `paper-implementation-runtime-contracts.ts`.
