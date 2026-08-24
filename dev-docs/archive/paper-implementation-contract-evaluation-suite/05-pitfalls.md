# 05 Pitfalls

## Do Not Repeat
- Do not evaluate only happy paths.
- Do not count mock-only evidence as product quality.
- Do not close parent scope while child residual risks are unowned.
- Do not skip blocked/negative/abandoned-with-trace scenarios.
- Do not treat design-doc component coverage as optional once implementation starts.
- Do not accept JSON-only fields for values required by gates, queues, trace checks, or contract tests.

## T-101 Guardrails Applied
- Full-flow replay must include dossier readiness and writing packet projection; motive or claim state alone is not enough.
- UI checks are boundary checks: the workbench can emit backend commands and consume read models, but it cannot synthesize readiness.
- Residual risks must be owned and non-blocking before T-091 can close.
