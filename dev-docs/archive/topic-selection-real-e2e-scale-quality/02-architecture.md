# 02 Architecture

## Boundary
- The quality gate is operator-facing and intentionally uses `.env.local`.
- Default tests stay isolated from real DB/provider credentials.
- The quality gate does not mutate existing records except by creating new E2E artifacts and PaperProjects from its own bridge runs.

## Inputs
- `TOPIC_SELECTION_REAL_E2E_QUALITY_RUN_ID`: optional gate run id.
- `TOPIC_SELECTION_REAL_E2E_REPEATS`: provider repeat count, default `3`.
- `TOPIC_SELECTION_REAL_LITERATURE_LIMIT`: selected sample size, default `32`.
- `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM`: default `0` for provider stability runs.

## Outputs
- `quality-summary.json`: machine-readable gate result.
- `manual-spot-check.md`: selected-literature role audit table.
- `run-*.log`: captured runner logs.
- Child E2E artifacts remain under `.ai/.tmp/topic-selection-real-e2e/<child-run-id>/`.

## Quality Checks
- all child runs pass;
- sample hash stable;
- selected set stable by `literature_id:selected_role`;
- role counts match default role targets;
- no risk-heavy support items;
- baseline items carry benchmark/evaluation/comparison signals;
- challenge items carry risk/failure/adversarial signals;
- PaperProject intake is created exactly once per run and duplicate intake is idempotent;
- v1b negative stops at non-advance disposition.
