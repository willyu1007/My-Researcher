# Pitfalls

## Do Not Repeat
- Do not let the live adapter become a second experiment-foundation implementation.
- Do not let experiment-foundation callbacks directly create trusted `RunEvidenceUnit`.
- Do not treat external job success, adapter outcome, result-validation status or `RunEvidenceUnit.run_status` as the scientific conclusion. Under D-17 only the exact ValidationCycle closure assessment owns the nullable disposition and selected exit.
- Do not let a terminal callback for one job trigger Result Analysis, Cycle closure or `ResultInterpretationPacket`. Readiness is a whole-Cycle derived predicate over every exact in-scope fact.
- Do not emit `create_result_interpretation_packet` or a caller-driven readiness command as an adapter handoff. Publish exact facts and let the PI control plane re-evaluate readiness idempotently; T-104 is not a conclusion or packet orchestrator.
- Do not copy training task specs, recipes, datasets, code, result artifacts, or validation reports into PaperImplementation payloads beyond refs/hashes.
- Do not make cloud credentials or external provider availability required for default verification.

## 2026-05-24 - Prisma Validate Environment
- Symptom: `pnpm --filter @paper-engineering-assistant/backend prisma:validate` failed with `Environment variable not found: DATABASE_URL`.
- Root cause: Prisma validate reads `env("DATABASE_URL")` even when no DB connection is attempted.
- Fix: reran with `DATABASE_URL='postgresql://user:pass@localhost:5432/my_researcher_validate'`.
- Prevention: use an explicit validation URL for schema-only validation in T-104/T-105 closure commands.

## 2026-05-25 - Wrong External Job Side Effects
- Symptom: `sync`, `collect`, and `cancel` could call experiment-foundation before PaperImplementation verified that the route `external_job_id` belonged to the WorkOrder harness run.
- Root cause: ownership validation happened indirectly through monitor intake after the external operation returned.
- What was tried: review compared submit idempotency side-effect ordering against sync/collect/cancel ordering and found the latter weaker.
- Fix: added read-only `getJob` preflight and WorkOrder harness `external_job_ref/hash` comparison before side-effectful sync/collect/cancel calls.
- Prevention: any future live adapter operation must validate local authority linkage before invoking an external operation, even if downstream gates would reject the result later.
