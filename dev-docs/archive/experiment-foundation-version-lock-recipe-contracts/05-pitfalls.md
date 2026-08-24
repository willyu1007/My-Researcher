# 05 Pitfalls

## Do Not Repeat
- Do not turn RunRecipe into a loose config.
- Do not turn RunRecipe into an adapter request body.
- Do not let fine-tuning bypass RecipeDraft -> RunRecipe -> TrainingTaskSpec.
- Do not rely on `additionalProperties: false` alone for high-risk drift fields; explicitly forbid platform and execution aliases.
- Do not lock a baseline implementation without locking its runtime identity and runtime hash.

## 2026-05-17 - Platform-private Field Leakage
- Symptom: `RunRecipe` and `ExecutionProfile` could drift into materialization/adapter ownership if platform ids, regions, queues, endpoints, SDK payloads, or task/job refs were merely unknown fields.
- Root cause: Fastify/Ajv can strip unknown properties before surfacing schema errors, so boundary fields must be named explicitly.
- Fix: Added explicit forbidden properties for platform/private execution fields on `RunRecipe`, `GenerateRunRecipeRequest`, and `ExperimentFoundationExecutionProfile`.
- Prevention: T-073 owns `TrainingTaskSpec`, `FineTuningTaskProfile`, materialization results, and adapter metadata refs; T-072 owns only locked, platform-neutral recipe contracts.

## 2026-05-17 - RecipeDraft Platform Alias Leakage
- Symptom: Review injection accepted `RecipeDraft.region`, `RecipeDraft.queue`, and `RecipeDraft.provider`.
- Root cause: `RecipeDraft` rejected direct submit/materialize fields but did not reuse the full platform-private forbidden list.
- Fix: `RecipeDraft` now explicitly rejects platform/private aliases including provider, region, queue, endpoint, SDK payload, adapter metadata, task spec, and job refs.
- Prevention: Any planning-layer DTO that must remain pre-execution should share the same high-risk forbidden alias list as `RunRecipe`.

## 2026-05-17 - Baseline Runtime Lock Gap
- Symptom: `BaselineImplementationVersion` owned `runtime_ref`, but `BaselineImplementationVersionLock` did not lock runtime identity/hash.
- Root cause: Earlier lock shape was sufficient for baseline identity but not for T-073 materialization reproducibility.
- Fix: Added `runtime_ref` and `runtime_hash` to `BaselineImplementationVersionLock` and covered missing runtime lock in schema tests.
- Prevention: Materializable locks must include every mutable execution input needed by downstream materialization, or a hash that explicitly covers it.

## 2026-05-17 - Fine-tuning Bypass
- Symptom: Fine-tuning could become a standalone execution path if base model, fine-tuning dataset, and strategy refs were not locked before materialization.
- Root cause: Fine-tuning was intentionally deferred to T-073 for task-profile depth, but T-072 still needed a lock-level guard.
- Fix: `llm_fine_tuning` recipes require fine-tuning external lock refs in the execution profile and version lock, and non-fine-tuning profiles reject those refs.
- Prevention: Full `FineTuningTaskProfile` fields must be materialized from a locked `RunRecipe`; they must not redefine the `RunRecipe` lock semantics.
