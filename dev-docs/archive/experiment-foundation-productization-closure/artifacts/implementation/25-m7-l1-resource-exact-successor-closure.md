# M7-L1 Resource-Exact Successor Closure

Date: 2026-07-28
Task: T-132
Status: passed

## Result

The reviewed named-local PostgreSQL target now contains one same-Cycle successor WorkOrder revision on `ragperf-primary`:

- revision: `pi_experiment_revision_v2_t132_m7_l1_resource_successor_v2_1`
- sequence / parent: `2` / `pi_experiment_revision_v2_t132_m7_l1_p313_v1_1`
- Run: `ef_run_v2_t132_m7_l1_resource_successor_v2_1`
- Run manifest: `sha256:221824f852a55aae19370c6ceae086b55eac54a9aca383b51baf472980d5a232`
- ExecutionBundle hash: `sha256:458b0e58d93974e3a09b63247bac675d26deef5fdafb111a6eae66177a3b178e`
- each TaskSpec: `2 CPU / 8192 MiB`, `max_attempts=1`, `timeout_seconds=1800`

Normal T1-T4 created exactly 40 rows and advanced the existing branch through its admission and head CAS transitions. Exact replay created zero rows. The old revision/Run were unchanged; 236 protected tables changed zero; cloud calls, capability changes, `CreateJob`, live Attempts, ExperimentResult, EvidenceCandidate and REU were all zero.

The successor-bound live runner offline preflight passed with the existing two-job / ¥50 ceiling, exact `ecs.g6.large`, zero existing Attempts, zero cloud calls and zero database writes.

## Remaining boundary

Repository controller policy SHA-256 `c014cac58a794f2bc4849c0c05993ee85fc660dcb6d3206438b08bf7d5c219be` must be activated in RAM. A fresh STS with at least 55 minutes remaining and a fresh exact `GetImage` comparison are required before the separately authorized two-job diagnostic execute mode may run.
