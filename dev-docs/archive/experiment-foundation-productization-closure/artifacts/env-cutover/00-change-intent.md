# Pack A local cutover environment change intent

- Add the non-secret boolean `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED`.
- Keep the default `false` in every environment.
- Treat `ADMISSION_ENABLED=true` with `CUTOVER_COMMITTED=false` as an invalid startup configuration.
- When committed, reject overlapping legacy PI/EF experiment mutations while preserving diagnostics reads and committed v2 integration-event draining.
- Do not encode cutover state in a database row and do not alter provider or LocalScript capabilities.
