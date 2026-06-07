# Compatibility And Migration Plan

- Breaking change: no schema/API breaking change.
- Behavior change: deployments with no persisted literature content-processing extraction setting now default to `codex_curated` instead of `llm_gateway`.
- Compatibility:
  - Existing DB application settings still take precedence.
  - Operators can explicitly set `LITERATURE_KEY_CONTENT_READY_METHOD=llm_gateway` to restore LLM gateway default behavior for environments without DB settings.
  - Current local dev DB is updated separately to persist `codex_curated`.
- Rollback:
  - set `LITERATURE_KEY_CONTENT_READY_METHOD=llm_gateway`, or patch the application setting runtime back to `llm_gateway`.
