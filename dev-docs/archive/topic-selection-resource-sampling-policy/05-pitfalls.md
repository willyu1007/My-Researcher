# 05 Pitfalls

## Do-not-repeat Summary
- Do not treat keyword matching as sufficient semantic classification.
- Do not let risk-heavy RAG/security papers satisfy support coverage.
- Do not silently continue when LLM classification fails.
- Do not apply Prisma migrations to a live DB without explicit approval.

## Historical Lessons
- Prisma validate/generate require `DATABASE_URL` even when only checking schema. Use a disposable validation URL for local compile checks when no live DB operation is intended.
- `pnpm --filter @paper-engineering-assistant/backend test -- <pattern>` does not filter tests; the backend runner ignores extra args and runs all `*.test.ts`.
- Keep resource sampling as a v1a input layer. Do not mutate v1a/v1b/v1c authority contracts while adding sampling.
- LLM output is only an input to deterministic guardrails. Persist brief rationale and structured output, but do not store hidden reasoning.
