# 05 Pitfalls

## Do Not Repeat
- Do not treat `external_training_job` as a generic registry record. It is owned by the T-077 execution table/API.
- Do not add real cloud credentials, SDK payloads, endpoint-private payloads, or inline adapter metadata to shared/public DTOs.
- Do not let desktop tests pass by reimplementing readiness, promotion, materialization, result validation, or adapter semantics in renderer code.
- Do not copy reusable experiment foundation DTOs into research-argument or paper-project state. Use refs, locks, hashes, snapshots, and sidecar refs.
- Do not make live Postgres or real cloud services mandatory for the default local test suite.
- Do not build multi-scenario harness fixtures with fixed record ids or idempotency keys; use scenario-scoped ids to prevent hidden collisions.
- Do not install test env overrides outside a `try/finally` cleanup path.

## Historical Context
- T-043 remains planned as a parent closure/backlog umbrella, while T-070 through T-078 form the implemented minimum chain.
- T-090 should validate that chain rather than silently expanding it.
- Broader product gaps such as candidate extraction, canonical asset synthesis, tuning workflow, real cloud SDK hardening, and paper-project bridge UI/API should be tracked as separate tasks if testing exposes their need.

## Resolved Pitfalls
### Narrow LocalScript sync wait
- Symptom: the first harness loop waited only about 1s for a real LocalScript child process to reach terminal status.
- Root cause: `syncJobUntilTerminal` used fixed `40 * 25ms` polling, which is fragile under CI or high local load.
- Fix: added configurable `timeoutMs` and `pollMs`, with a 5s default timeout.
- Prevention: external-interaction harness helpers should make polling windows explicit and conservative.

### Harness env cleanup could be skipped on construction failure
- Symptom: if `buildExperimentFoundationCapabilityHarness()` failed, LocalScript env overrides and temp root cleanup were outside the active `finally` block.
- Root cause: the harness was constructed before entering the cleanup-protected section.
- Fix: moved harness construction inside `try/finally` and made harness close optional.
- Prevention: install test env and temp roots only when all following setup is protected by cleanup.

### Adjacent workorder bridge could accept copied experiment DTOs
- Symptom: route schemas rejected copied DTO fields, but direct service callers and `RunMonitorIntake.raw_payload` could still carry full experiment-foundation DTOs or paper-claim/table fields.
- Root cause: `raw_payload` is intentionally open for external monitor metadata, and the service did not recursively guard high-risk semantic drift fields.
- Fix: added service-level no-copy guards for `experiment_bridge` and `raw_payload`, while keeping refs/hashes accepted.
- Prevention: adjacent workflow payloads must treat experiment foundation data as refs, hashes, snapshots, and sidecars only; never as copied canonical DTOs or paper-ready claim text.
