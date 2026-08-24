# Experiment Foundation Capability Validation Roadmap

## Objective
Prove the experiment foundation works as an integrated, automatable, externally-interacting, workflow-compatible capability after the T-070 through T-078 minimum chain.

## Milestone 1 - Capability Inventory
- Map every implemented function point to:
  - shared contract/schema;
  - backend service/route;
  - expected automation action;
  - external boundary if any;
  - adjacent workflow consumer.
- Identify tests that already exist and tests that need to be added.

Deliverable:
- validation matrix in task notes or tests.

## Milestone 2 - Deterministic Scenario Harness
- Build reusable fixtures and scenario helpers.
- Keep fixtures synthetic, local, and credential-free.
- Encode canonical success paths and named failure paths.

Deliverable:
- scenario builders for registry, readiness, promotion, recipes, materialization, execution jobs, result validation, evidence, and sidecars.

## Milestone 3 - Automation and API Robustness
- Exercise public REST routes for create/list/read/upsert/check/promote/submit/sync/cancel/collect.
- Prove idempotency, retries, stable error envelopes, and gate behavior.
- Prove unsupported generic writes such as `external_training_job` registry creation are rejected.

Deliverable:
- route-level automation acceptance tests.

## Milestone 4 - External Boundary Validation
- Prove LocalScript execution is safe and deterministic.
- Prove mocked Aliyun behavior gates on mirror freshness, checksum, policy approval, and no credential/private-payload leakage.

Deliverable:
- external-boundary tests that require no real cloud access.

## Milestone 5 - Result/Evidence/Paper Robustness
- Prove collect creates result, validation, facts, and evidence only when eligible.
- Prove sidecars are refs/locks/hashes/snapshots only.
- Prove claims, final tables, rankings, and full DTO copies are rejected.

Deliverable:
- result/evidence/sidecar robustness tests.

## Milestone 6 - Desktop and Adjacent Flow Smoke
- Exercise the `实验基座` desktop workbench as an operator surface.
- Verify adjacent flows consume refs and sidecars without copying experiment DTOs or creating hidden lifecycle ownership.

Deliverable:
- desktop smoke/e2e coverage and adjacent-flow contract checks.

## Milestone 7 - Closure and Defect Routing
- Run default verification.
- Record any opt-in environment checks separately.
- Fix narrow defects discovered by tests.
- Split product gaps into follow-up tasks.

Closure:
- T-090 can be marked done only when validation is implemented, verification passes, and unresolved product gaps are explicitly triaged.
