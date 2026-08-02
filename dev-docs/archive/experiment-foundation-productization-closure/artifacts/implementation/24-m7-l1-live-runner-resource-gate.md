# T-132 M7-L1 live runner and resource gate

Date: 2026-07-28

Status: implementation passed; live execution blocked before intake

## Outcome

The dedicated live-window runner, official OSS result reader, recovery pagination/full-detail binding, two-CreateJob fence and zero-evidence verification are implemented. No cloud service was called.

The first named-local `offline-preflight` failed closed because the immutable Run `ef_run_v2_t132_m7_l1_p313_v1_1` contains `1 CPU / 512 MiB / 30 min` TaskSpecs. The approved public SKU is exact `ecs.g6.large = 2 vCPU / 8 GiB / 30 min`. The runner created no Attempt and made no database write.

## Required continuation

1. Explicitly authorize one successor WorkOrder revision on open Cycle `validation_cycle_t132_m7_l1_p313_v1`.
2. Freeze `resource_snapshot={cpu_cores:2,memory_mb:8192}`, preserve the same two cells, one-attempt/1800-second policy and frozen ExecutionBundle revision/hash.
3. Deliver normal T1-T4, exact replay and protected-history checks; do not modify the old revision or Run.
4. Activate controller policy SHA-256 `c014cac58a794f2bc4849c0c05993ee85fc660dcb6d3206438b08bf7d5c219be`.
5. Obtain fresh STS, pass `GetImage`, then execute at most two jobs under ¥50.

Scientific validation, EvidenceCandidate, REU, Cycle closure and product capability persistence remain excluded.
