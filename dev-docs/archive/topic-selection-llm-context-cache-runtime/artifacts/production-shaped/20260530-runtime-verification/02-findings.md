# 02 Findings

## Closed
- Persistent DB prompt index works against the migrated local/dev database.
- Provider-required prompt cache hit semantics stay correct: prompt artifacts are reused, but provider responses are not reused and the gateway is still called live in provider mode.
- Token-budget over-limit preflight blocks before provider execution with provider call count `0`.
- Provider-side cache telemetry remains telemetry and does not become business response reuse.
- v1a main WorkflowHarness path can run over Prisma-backed local/dev DB using the T-112 balanced resource sample fixture.
- v1a replay smoke now captures both exact replay and input-hash drift behavior over Prisma-backed local/dev DB:
  - exact replay added no authority writes and no LLM calls;
  - drifted N6-N9 replay inputs produced `REPLAY_INPUT_HASH_MISMATCH`;
  - N6 surfaced the drift as HTTP `409 VERSION_CONFLICT`, while N7/N8/N9 surfaced blocked node results.
- The harness negative assertion was corrected so it no longer catches its own `assert.ok(...)` failure as an unexpected transport error.
- The drift fixture now changes `output_schema_version`, which participates in node input hashes and is not overwritten by the harness route envelope.
- The default deterministic mock resource sample underfill is closed for local/dev replay smoke: when the default mock sample lacks the required role coverage, the harness records the underfilled sample artifact and falls back to the T-112 balanced replay fixture instead of weakening production resource-sampling guardrails.
- Live OpenAI and DashScope provider canaries passed with local provider configuration:
  - provider-required prompt-cache exact hits still performed two live provider calls per provider;
  - only redacted prompt/prompt-quality artifact refs were reused;
  - provider responses were not reused and response reuse refs stayed `null`;
  - over-budget fixtures blocked before provider execution with provider call count `0`.

## Open
- No production-shaped runtime verification findings remain open for this slice.

## Follow-Up
- Broader v1b/v1c live provider canaries remain future rollout work until those matrix rows are promoted to implementation-ready status.
