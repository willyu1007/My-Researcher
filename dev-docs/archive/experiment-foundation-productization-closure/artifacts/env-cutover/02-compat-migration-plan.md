# Pack A local cutover compatibility plan

1. Deploy the additive schema and application guard with both flags false.
2. Resolve active legacy WorkOrder/HarnessRun and EF execution rows.
3. Set `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED=true` at the named target; legacy mutation routes then fail closed with `GATE_CONSTRAINT_FAILED` / `LEGACY_RECORD_NOT_ELIGIBLE`.
4. Set `PAPER_IMPLEMENTATION_EXPERIMENT_V2_ADMISSION_ENABLED=true` only with durable Prisma PI/EF v2 repositories.
5. Rollback disables new v2 admission but leaves cutover committed so no overlapping legacy writer is restored; the PI/EF relay continues draining already committed events.
