# v1b Runtime Stress Runbook

Use `pnpm topic-selection:v1b-runtime-stress` to verify promoted T-112 v1b runtime slots against the local/dev Prisma stack.

## Scope

The runner composes existing v1b harness scenarios instead of defining node semantics:

- `n4_runtime_smoke`
- `n6_runtime_smoke`
- `n6_loopback_runtime_smoke`
- `n7_runtime_smoke`
- `n8_runtime_smoke`

Each child run uses `TITLE_CARD_REPOSITORY=prisma`, `RESEARCH_LIFECYCLE_REPOSITORY=prisma`, fixture semantic mode, and an isolated `TOPIC_SELECTION_V1B_HARNESS_RUN_ID`.

## Default Command

```bash
pnpm topic-selection:v1b-runtime-stress
```

## Focused Commands

```bash
TOPIC_SELECTION_V1B_RUNTIME_STRESS_RUN_ID=t112-v1b-runtime-stress-n4-local \
TOPIC_SELECTION_V1B_RUNTIME_STRESS_SCENARIOS=n4_runtime_smoke \
pnpm topic-selection:v1b-runtime-stress
```

```bash
TOPIC_SELECTION_V1B_RUNTIME_STRESS_RUN_ID=t112-v1b-runtime-stress-combined-local \
TOPIC_SELECTION_V1B_RUNTIME_STRESS_ITERATIONS=1 \
TOPIC_SELECTION_V1B_RUNTIME_STRESS_SCENARIOS=n4_runtime_smoke,n6_runtime_smoke,n6_loopback_runtime_smoke,n7_runtime_smoke,n8_runtime_smoke \
pnpm topic-selection:v1b-runtime-stress
```

## Expected Result

- Child harness summaries are `passed`.
- N4 verifies initial handoff and source-drift blocking.
- N6 verifies initial handoff and source-drift blocking.
- N6 loopback verifies N7->N6 regeneration, runtime loopback triage, and N6 gate-failure regeneration.
- N7 verifies grouping, N8 readmission, and N7->N6 loopback projection.
- N8 verifies initial handoff and projection source-drift blocking.
- Prompt packet index rows are present for:
  - `n4_research_slice_option_draft`
  - `n6_question_candidate_draft`
  - `n6_loopback_triage`
  - `n7_candidate_grouping`
  - `n7_failed_trial_synthesis`
  - `n7_n8_debate_admission_review`
  - `n8_value_assessment_draft`
- Prompt packet index schema remains metadata-only and records no provider response, raw telemetry payload, authority payload, or secret fields.

## Artifacts

The runner writes:

```text
.ai/.tmp/topic-selection-v1b-runtime-stress/<run-id>/90-summary.json
```

Child harness artifacts remain under:

```text
.ai/.tmp/topic-selection-v1b-harness-e2e/<child-run-id>/result.json
```

## Boundary

This runner is a closure stress harness. It must not become the owner of context selection, prompt identity, compression policy, runtime admission, deterministic gates, or handoff authority. Those remain in the node adapters and shared runtime services.
