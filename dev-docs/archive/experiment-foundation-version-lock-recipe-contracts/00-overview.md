# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-073 experiment-foundation-materialization-adapter-contracts`.

## Goal
- Make version locks, method recipe components, readiness outputs, and `RecipeDraft -> RunRecipe` semantics concrete enough that later materialization and paper sidecar flows can rely on stable refs and hashes.

## Non-goals
- Do not execute recipes.
- Do not submit training tasks.
- Do not implement automatic tuning or hyperparameter search.

## Responsibilities
- Define `ExperimentFoundationVersionLock`.
- Define minimal `RecipeDraft`, `RunRecipe`, and lock generation contracts.
- Ensure method recipe objects become `RunRecipe` components before execution.
- Model fine-tuning as a profile flowing through the same recipe path.
- Replace platform-ish execution-target wording with capability-oriented execution profile.

## Boundary
- Owns recipe and lock contracts.
- Hands off materialized execution payloads to `experiment-foundation-materialization-adapter-contracts`.
- Hands off tuning service behavior to later implementation slices.

## Done Means
- `RecipeDraft` cannot be submitted.
- `RunRecipe` is locked, deterministic, platform-neutral, and hashable.
- Fine-tuning cannot bypass `RunRecipe`.

## Acceptance criteria
- [x] `ExperimentFoundationVersionLock` aggregates dataset, evaluation protocol, baseline implementation, method component, external lock refs, readiness snapshot, and lock hash.
- [x] `RecipeDraft` can store incomplete planning state but rejects execution/materialization fields.
- [x] `RunRecipe` requires passed readiness, version lock hash, config hash, method locks, and platform-neutral execution profile.
- [x] Fine-tuning is represented through locked external refs in `RunRecipe`; full `FineTuningTaskProfile` remains owned by T-073.
