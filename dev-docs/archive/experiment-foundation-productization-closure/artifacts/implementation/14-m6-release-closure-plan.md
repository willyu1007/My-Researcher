# T-132 M6 release closure — plan

Date: 2026-07-24

Scope authority: roadmap Phase 6 as amended by D-24 (workflow usage-fit on the agent/API surface; HTTP/service/repository E2E honesty bar; no DOM lane).

## Census verdict (2026-07-24)

Already closed by earlier milestones: Aliyun payload materialization + read-only preflight + RAM deny + same-payload fake lifecycle (EF-P16 r6, steps 7-10); T-106 canary ownership (D-23, step 13); terminal automation (worker chains). The 2026-07-15 product chain (P313 → `validation_cycle_t132_packa_product_p313_v1` → `ragperf-primary` → Run `ef_run_v2_c4ab7919…`, verify-r5/verify-r2 SHAs) already provides the named-local golden spine: typed v2 protocol bound, two simulation Attempts succeeded, `workflow_simulation_passed`, scientific `not_started`, 0 REU, 0 closure.

Four hard gaps (full inventory in the session census):

1. **No original-source import path for the typed v2 RAGPerf protocol.** The only creator of the existing `ragperf-adapter-tier-v2` revision is the hard-coded D19 fixture; M6/OQ-17 require the LIT-0204 original definition (`lit-0204-ragperf-protocol-definition.json`) to be re-importable into a typed v2 identity with D-17 negatives proven, and T-131 cannot close without that consumption evidence.
2. **No release/productization summary machinery** (nearest prior art: `packc-final-gate.mjs` composite).
3. **OpenAPI 8 paths behind code** (5×M5 + 1×M7 + 2×M4 closure); drift test guards integer bounds only, not path coverage.
4. **No T-132 usage-fit rubric instrument** (three dimensions per roadmap: preparation cost / decision clarity / traceability; T-124 L7 rubric is the form precedent).

## Decisions

- **OD-M6-1 protocol source import**: a deterministic import runner maps the immutable LIT-0204 original definition document into typed v2 `required_rules` and drives the existing `ExperimentFoundationV2Service` draft→freeze path. It runs in the disposable-PG gate lane only; named-local keeps its existing product-bound protocol untouched. The lane also proves the D-17 negatives (free-shape v1 payload and unresolved forward ref each blocked with stable codes) and records a source-binding digest (original document SHA-256 → imported revision content hash) plus a rule-mapping equivalence census against the product protocol revision. That summary is the T-131 consumption evidence.
- **OD-M6-2 release convergence shape**: `experiment-foundation-m6-release-gate.mjs` re-runs the re-runnable offline gates as children (packb-simulation, packc-final, m5-agent, m7-provider) packc-final-style, verifies the durable summaries of the non-re-runnable named-local/live records by exact SHA-256 (packa product verify-r5, packb product verify-r2, cloud-preflight r6, hardening/QR runs), runs the protocol-import lane (OD-M6-1), asserts OpenAPI path coverage and docs/context freshness, requires the usage-fit artifact, and emits the machine-readable productization summary with the frozen status vocabulary (`workflow_simulation_passed`, `cloud_preflight_passed`, closure kind `control_flow_validated_no_paper_evidence`).
- **OD-M6-3 usage-fit instrument**: one rubric artifact scoring the three roadmap dimensions over the real agent/API golden flow — the M5 lineage/available-actions/preparation endpoints read the live P313 chain (read-only against named-local, service-level, no server process, zero writes) and the reverse trace from closure preparation back to PI intent. AI-assessed with explicit human-override provision, mirroring the T-124 L7 precedent.
- **OD-M6-4 golden closure venue**: the release closure (step 12) closes the real product cycle `validation_cycle_t132_packa_product_p313_v1` through the M5 preparation endpoint output submitted verbatim to the v2 closure POST, under a separately user-approved `PAPER_IMPLEMENTATION_EXPERIMENT_V2_CYCLE_CLOSURE_ENABLED` window on named-local, followed by a read-only post-verify (closure row, snapshot hash, Cycle status, zero scientific writes). A follow-up experiment would target a successor cycle per D-11; M7-L2 is unaffected (it admits new revisions/cycles).

## Slices

| Slice | Content | Approval |
|---|---|---|
| M6-R1 | LIT-0204 original-source import runner + D-17 negative proofs + disposable import lane + T-131 consumption evidence writeback | none |
| M6-R2 | OpenAPI 8 missing paths + api-index/context regen + route-vs-spec path-coverage drift test | none |
| M6-R3 | usage-fit rubric instrument + read-only agent-flow assessment over the live P313 chain + scored artifact | none (read-only) |
| M6-R4 | golden no-evidence closure of the P313 cycle via M5 preparation → closure POST + post-verify | **user-approved capability window** |
| M6-R5 | m6 release gate (OD-M6-2) + operator recovery runbook + productization summary + roadmap/OQ/T-131 closure docs | none |

Exit = roadmap Phase 6 exit gate under D-24: replayable control-plane chain with machine-verifiable release evidence, the no-evidence Cycle closure live on named-local, T-131 consumption recorded, docs/context current, and the release gate green end-to-end.

## Completion record (2026-07-25)

All five slices closed:

- **R1** (`39d74229`): LIT-0204 source-import path + D-17 negatives; disposable lane 1/1 on host and re-executed inside every release-gate run.
- **R2** (`27c6461b`): OpenAPI +8 paths/+10 components (192→200 endpoints), path-coverage drift test; Codex quota exhaustion mid-slice, completed by Claude.
- **R3** (`f326fec1`): usage-fit rubric 5/5/5 over the live P313 chain.
- **R4** (`d541c914`, user-approved window): golden no-evidence closure of `validation_cycle_t132_packa_product_p313_v1`; closure input hash byte-equal to the M5 preparation CAS watermark; cycle `completed`; scientific writes zero.
- **R5**: `experiment-foundation-m6-release-gate.mjs` + unit tests; operator runbook `docs/context/process/experiment-foundation-release-runbook.md`; T-131 consumption evidence written back and T-131 closed.

Convergence lineage: v1 failed on the packc-final run-id grammar (fixed via `deriveChildRunId`); v2 failed because the packc-cutover sealed-path census still pointed at `startWorkflowSimulation` after the M7 refactor moved the fences into `startExecution` — a genuinely stale census the release gate existed to catch (gate + unit pins updated, standalone `packc-cutover-20260725-r903` re-passed); v3 exposed the composite-vs-bilateral handoff conflict (m7 gate gained `--imported-run-id`, verifying against the recorded `t132-m7-offline-20260724-v3` import); v4 failed on a nested status-field read in the productization-status extractor (fixed with shape test).

**`t132-m6-release-20260725-v5` passed**: M6-01..M6-10 all green — four child gates re-passed (packb-simulation, packc-final r905, m5-agent, m7-provider), six durable records SHA-verified plus the preflight doc pin, LIT-0204 import lane 1/1, OpenAPI quality/index/coverage all green, usage-fit and golden-closure artifacts exact, productization statuses exactly the frozen vocabulary (`workflow_simulation_passed` / `cloud_preflight_passed` / `control_flow_validated_no_paper_evidence`). Summary SHA-256 `41c4f0bb41cd871bc6967e548d38ad30b7a7787e34b8c563853b43e77b35acaf`; durable copy `17-m6-release-gate-summary-v5.json`.
