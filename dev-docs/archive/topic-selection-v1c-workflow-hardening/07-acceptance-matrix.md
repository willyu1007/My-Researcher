# Acceptance Matrix

## Purpose
Record T-108 acceptance coverage after node decision alignment. This matrix tests the v1c WorkflowHarness contract, node orchestration robustness, automation behavior, and Codex/provider landing decisions. It does not expand T-108 into PaperImplementation or downstream intake acceptance.

## Status
- Matrix shape: confirmed.
- Row content: cross-node plus N1-N6 rows confirmed.
- Fixture/test mapping strategy: confirmed.
- Row-to-fixture/test-file mapping shape: confirmed.
- Row-to-fixture/test-file mapping content: confirmed for `X` and N1-N6.
- Row order: cross-node harness behavior first, then N1 through N6.
- Implementation status: deterministic service-level coverage, expanded final-row deterministic coverage, the initial v1c harness adapter/manifest runner, product/native harness consumption, product N2/N3 service split, full local L5b real Codex acceptance, the L5c provider/canary runner, and full L5c canary evidence have landed.
- Remaining implementation: none for the T-108 P0 acceptance matrix.

## Implementation Coverage Snapshot
Status: closed for T-108 P0.

Landed:
- `apps/backend/src/services/topic-selection-v1c-acceptance-scenario-fixtures.ts` provides stable T-108 fixtures.
- `apps/backend/src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts` covers N1/N5 deterministic persistence-heavy rows.
- `apps/backend/src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts` covers initial N2/N3/N4/N6 service-level node/contract rows.
- `apps/backend/src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts` covers deterministic service-level L4 cross-node behavior.
- `apps/backend/src/services/topic-selection-v1c-harness-adapter.ts` exposes the initial adapter from current service records to harness-facing node results.
- `apps/backend/src/services/topic-selection-v1c-harness-adapter.unit.test.ts` covers N3/N4/N6 routing normalization.
- `TopicSelectionWorkflowHarnessService.runV1cHarnessConsumptionScenario` consumes v1c adapter node results through the native workflow harness service and validates forward-only, stop, and N6 record-only behavior.
- `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` and `topic-selection:v1c-harness-acceptance` produce deterministic v1c acceptance evidence.
- Latest verified deterministic evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-2026-05-28/manifest.json` (`pass`, `10` row results, `14` node trace entries).
- Latest verified expanded deterministic evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-expanded-2026-05-29/manifest.json` (`pass`, `15` row results, `27` node trace entries).
- Latest verified closure deterministic evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-closure-2026-05-29/manifest.json` (`pass`, `15` row results, `27` node trace entries, `0` pending gaps).
- `.ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs` and `topic-selection:v1c-real-codex-acceptance` produce L5b real Codex acceptance evidence.
- Latest verified L5b evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-high-2026-05-29-r2/manifest.json` (`pass`, `full_l5b_acceptance=true`, `10` row results, `15` node trace entries, `36` real Codex calls, `0` hard failures).
- `.ai/scripts/topic-selection-v1c-provider-canary.mjs` and `topic-selection:v1c-provider-canary` produce L5c provider/canary evidence.
- Latest verified L5c smoke evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-smoke-2026-05-29-r6/manifest.json` (`pass`, `full_l5c_acceptance=false`, `9` row results, `4` node trace entries, `8` real provider structured outputs, `0` hard failures).
- Latest verified full L5c canary evidence: `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-full-2026-05-29/manifest.json` (`pass`, `full_l5c_acceptance=true`, `9` row results, `15` node trace entries, `36` real provider structured outputs, `0` hard failures).
- N2 `llm_draft` now fails closed by default instead of silently falling back to deterministic support.
- Promotion dossier payloads now include an N3-readable `n3_semantic_layer`.
- N6 feedback replay now checks `feedback_fingerprint` before recheck sink invocation and feedback persistence.
- Product node execution now has explicit N2-only and N3-from-support entry points. The old combined service method remains only as a compatibility wrapper.
- Deterministic harness acceptance now runs the split N2/N3 path, reports `promotion_decision_support` and `promotion_gate_check` separately, and has no remaining manifest `pending_gaps`.

## Construction Rules
- Write rows by node/scope and scenario.
- Use the coverage dimensions as tags and review checks, not as a Cartesian product.
- Every row MUST assert the harness-facing outcome and automation behavior.
- Every row SHOULD include persistence, replay/idempotency, LLM/Codex, and boundary assertions unless the scenario is explicitly not applicable.
- Rows MUST route from structured contracts only: routing outcome, typed actions, affected refs, resume entry, source refs, and hashes.
- Rows MUST NOT rely on prose parsing, legacy internal dispositions, raw LLM output, or downstream implementation side effects as acceptance evidence.

## Matrix Columns
| Column | Requirement |
| --- | --- |
| `ID` | Stable test id, grouped by scope, for example `X-01`, `N2-03`, or `N6-05`. |
| `Node / Scope` | `cross-node` or one of N1-N6. |
| `Scenario` | Short scenario name that can map to a fixture or harness test. |
| `Input State` | Required upstream handoff, hashes, profile, payload, and drift/malformed state. |
| `Expected Harness Outcome` | Only the harness-facing outcome, not internal domain disposition. |
| `Expected Automation` | Advance, stop, retry, replay, or require explicit new attempt. |
| `Expected Persistence` | Authority artifact, diagnostic artifact, no write, or idempotent existing record. |
| `Replay / Idempotency Assertion` | Exact replay, hash drift, version conflict, duplicate-call behavior, or current-record behavior. |
| `LLM / Codex Assertion` | No LLM, bounded micro-debate, diagnostic adjunct, delegated execution, normalization, or not applicable. |
| `Boundary Assertion` | The authority, scope, and nonlinear constraints that must remain true. |

## Coverage Dimensions
| ID | Dimension | Coverage intent |
| --- | --- | --- |
| D1 | Node / Entry | Legal entry, illegal entry, missing upstream artifact, stale handoff, and repeated invocation. |
| D2 | Happy Path Outcome | Each node advances to exactly one legal next step with the expected handoff and no skipped authority boundary. |
| D3 | Stop Outcome | `action_required`, `parked`, `closed_no_auto_progress`, `invalid_feedback`, and blocked diagnostics stop automation and do not create illegal authority artifacts. |
| D4 | Lineage / Replay / Idempotency | Snapshot hashes, exact replay, hash drift, version conflict, duplicate calls, concurrent calls, and current-record selection. |
| D5 | LLM / Codex Contract | N2 bounded micro-debate, N3 diagnostic Codex, N4 explicit Codex delegation, N6 Codex normalization, profile/prompt/version metadata, and non-authority constraints. |
| D6 | Admission / Schema Robustness | Malformed payloads, missing required fields, forbidden fields, invented refs, semantic contradiction, source-ref allowlists, redaction, and size limits. |
| D7 | Persistence Boundary | Authority artifact vs diagnostic artifact, no half-built bridge or decision, append-only diagnostics, current/supersede rules, and no raw LLM/prose authority. |
| D8 | Nonlinear / Resume Behavior | Forward-only attempts, typed loopback/recheck work, coarse resume entries, new attempts, no implicit fallback, and no v1b-style automatic loop. |
| D9 | Automation / Harness Control Plane | Legal trigger conditions, stop-after-failure guarantees, retry limits, replay without duplicate writes, diagnostic readability for LLM/operator repair, and harness routing from structured fields only. |

## Fixture/Test Mapping Strategy
Status: strategy, record shape, and row-to-fixture/test-file mapping content confirmed.

Strategy:
- Every acceptance row MUST have at least one primary test owner.
- High-risk rows SHOULD have a secondary test owner in another layer.
- Rows SHOULD be carried by the lowest layer that can prove the contract.
- Full cross-node workflow tests SHOULD be reserved for orchestration behavior and representative happy/stop paths, not for every row.
- LLM/Codex behavior MUST be tested through both deterministic contract fixtures and real execution scenarios.

Test layers:
| Layer | Name | Purpose | Typical coverage |
| --- | --- | --- | --- |
| L1 | Contract fixtures | Validate schemas, routing outcomes, typed actions, admission contracts, forbidden fields, and source-ref allowlists without node side effects. | D5, D6, D8, malformed payloads, invented refs, required action contracts. |
| L2 | Node harness tests | Validate one node at a time: legal entry, outcome, handoff, persistence boundary, stop behavior, replay, and idempotency. | N1-N6 primary node rows. |
| L3 | Persistence/idempotency tests | Validate repository/database invariants: duplicate writes, current records, version conflicts, half-built record prevention, and append-only diagnostics. | D4, D7, current decision, bridge idempotency, feedback fingerprint. |
| L4 | Cross-node workflow tests | Validate orchestration: forward-only chain, legal handoffs, stop-after-failure, no implicit fallback, no auto loop, and no skipped authority boundary. | X rows and representative N1-N6 chain behavior. |
| L5 | LLM/Codex tests | Validate prompt/profile/agent workflow behavior under structured admission and harness authority boundaries. | N2 bounded micro-debate, N3 diagnostic adjunct, N4 delegated Codex, N6 normalization. |

Suggested row ownership:
- `primary_level` identifies the layer responsible for proving the row.
- `secondary_level` is used when a row has cross-cutting risk.
- Example: `X-01` primary L4, secondary L2.
- Example: `N2-05` primary L5/L1, secondary L2.
- Example: `N4-10` primary L3, secondary L2.
- Example: `N5-09` primary L3, secondary L2.
- Example: `N6-10` primary L4, secondary L2.

Mapping record shape:
| Field | Purpose |
| --- | --- |
| `acceptance_row_id` | Stable row id from this matrix, for example `X-01`, `N2-05`, or `N6-10`. |
| `primary_level` | Main test layer responsible for proving the row: L1-L5. |
| `secondary_level` | Optional supporting layer for cross-cutting risk or persistence/orchestration proof. |
| `fixture_group` | Fixture builder group or real Codex scenario family used by the test. |
| `test_file_pattern` | Expected test suite or file pattern once implementation mapping is created. |
| `evidence_required` | Required evidence artifacts such as harness result, DB rows, admission report, LLM artifact hashes, or replay result. |
| `run_gate` | Where the test must run: `local`, `ci`, `release`, `nightly`, or `canary`. |

Default group ownership:
| Row group | Primary level | Secondary level | Notes |
| --- | --- | --- | --- |
| `X` | L4 | L2/L3 where relevant | Cross-node rows prove orchestration, stop semantics, replay, no fallback, and no auto loop. |
| `N1` | L2 | L3 for replay/idempotency rows | N1 is deterministic and has no LLM/Codex lane. |
| `N2` | L2/L5 | L1 for admission, L3 for idempotency | N2 rows split between node harness behavior and LLM/Codex bounded micro-debate behavior. |
| `N3` | L2 | L5 for diagnostic adjunct, L1 for typed-action contract | N3 gate authority remains deterministic; Codex coverage is diagnostic-only. |
| `N4` | L2/L3 | L5 for delegated Codex | Current-decision idempotency belongs to L3; delegated execution belongs to L5b. |
| `N5` | L2/L3 | L1 for payload contract | Bridge persistence and no-half-built behavior should be proven through persistence/idempotency tests. |
| `N6` | L2/L5 | L4 for no-auto-loop, L1 for normalization/admission | Structured direct lane is L2; Codex normalization is L5; auto-loop guard is L4. |

Mapping style:
- Do not duplicate the full acceptance row text in the mapping table.
- Prefer group-level defaults plus explicit overrides for high-risk rows.
- Add explicit mapping rows when a row deviates from the group default or needs a specific fixture/evidence artifact.

## Row-To-Test Mapping Content
Status: confirmed.

### Cross-Node `X` Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| X-01 | L4 | L2 | `workflow.forward_only_happy_chain` | `**/topic-selection-v1c.workflow-harness*.test.*` | Harness run trace for `N1 -> N2 -> N3 -> N4 -> N5`, node handoff refs, authority artifact ids, no skipped-node evidence. | local, ci |
| X-02 | L4 | L2 | `workflow.illegal_node_entry` | `**/topic-selection-v1c.workflow-harness*.test.*` | Blocked/malformed harness result, missing-handoff diagnostic, no downstream node invocation evidence. | local, ci |
| X-03 | L4 | L2 | `workflow.stop_outcomes` | `**/topic-selection-v1c.workflow-harness*.test.*` | Terminal outcome trace, stop-after-failure assertion, no later-node invocation or authority writes. | local, ci |
| X-04 | L1 | L4 | `contract.required_actions_and_resume` | `**/topic-selection-v1c.contract*.test.*` | Contract validation error or blocked harness result, missing `required_actions`/`affected_refs`/`resume_entry` evidence. | local, ci |
| X-05 | L4 | L5 | `workflow.no_implicit_fallback` | `**/topic-selection-v1c.workflow-harness*.test.*` | Failed profile/admission/provider scenario, no alternate profile/fallback execution, retry/fallback policy metadata. | local, ci |
| X-06 | L3 | L4 | `persistence.replay_no_duplicate_writes` | `**/topic-selection-v1c.persistence*.test.*` | Replay result, before/after authority row counts, stable ids for snapshot/decision/profile/bridge. | local, ci |
| X-07 | L3 | L4 | `persistence.hash_drift_conflict` | `**/topic-selection-v1c.persistence*.test.*` | Drift/conflict result, mismatched hash diagnostics, no conflicting authority writes. | local, ci |
| X-08 | L2 | L4 | `node.transient_retry_budget` | `**/topic-selection-v1c.node-harness*.test.*` | Same-node retry trace, same input/profile/prompt refs, retry budget exhaustion or admitted success. | local, ci |
| X-09 | L4 | L2 | `workflow.n6_no_auto_loop` | `**/topic-selection-v1c.workflow-harness*.test.*` | `recheck_opened` trace, no N1-N5 invocation after feedback, unchanged bridge/decision/package refs. | local, ci |
| X-10 | L1 | L5 | `contract.llm_raw_output_not_authority` | `**/topic-selection-v1c.contract*.test.*` | Admission failure for raw/prose/forbidden output, sanitized diagnostic, no routing from raw LLM output. | local, ci |

### N1 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N1-01 | L2 | L3 | `n1.ready_snapshot` | `**/topic-selection-v1c.node-harness*.test.*` | `ready_for_gate` harness result, persisted snapshot id/hash, N2 handoff ref, no downstream authority writes. | local, ci |
| N1-02 | L2 | L1 | `n1.malformed_or_missing_bundle` | `**/topic-selection-v1c.node-harness*.test.*` | Malformed/blocked result, zero snapshot writes, no N2 handoff, diagnostic when trustworthy context exists. | local, ci |
| N1-03 | L2 | L3 | `n1.workspace_or_source_drift` | `**/topic-selection-v1c.node-harness*.test.*` | Drift/conflict diagnostic, source/hash mismatch evidence, zero authority snapshot writes, no mutable-state repair. | local, ci |
| N1-04 | L2 | L3 | `n1.non_ready_diagnostic_snapshot` | `**/topic-selection-v1c.node-harness*.test.*` | Non-ready diagnostic result, append-only diagnostic/snapshot evidence, no N2 handoff. | local, ci |
| N1-05 | L2 | L1 | `n1.warning_blocker_propagation` | `**/topic-selection-v1c.node-harness*.test.*` | Snapshot/harness metadata carries risks, blockers, warnings, recheck refs, and evidence refs unchanged. | local, ci |
| N1-06 | L3 | L2 | `n1.exact_replay` | `**/topic-selection-v1c.persistence*.test.*` | Exact replay result, stable snapshot id, before/after snapshot row counts, no duplicate authority writes. | local, ci |
| N1-07 | L3 | L2 | `n1.domain_idempotency_conflict` | `**/topic-selection-v1c.persistence*.test.*` | Same bundle/hash idempotent return, changed-hash conflict, no second snapshot for conflicting bundle id. | local, ci |
| N1-08 | L2 | L1 | `n1.no_llm_or_downstream_side_effect` | `**/topic-selection-v1c.node-harness*.test.*` | No model invocation trace, no support/gate/decision/bridge/downstream rows written by N1. | local, ci |

### N5 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N5-01 | L2 | L3 | `n5.bridge_ready_happy_path` | `**/topic-selection-v1c.node-harness*.test.*` | `bridge_ready` result, one active bridge row, working-copy payload hash, source lineage refs, no downstream intake artifacts. | local, ci |
| N5-02 | L2 | L3 | `n5.illegal_n4_entry` | `**/topic-selection-v1c.node-harness*.test.*` | Blocked/action diagnostic, invalid N4 handoff refs, zero bridge writes, no working-copy handoff. | local, ci |
| N5-03 | L3 | L2 | `n5.lineage_workspace_mismatch` | `**/topic-selection-v1c.persistence*.test.*` | Mismatch diagnostic, source/decision/commitment/workspace hashes, zero bridge writes. | local, ci |
| N5-04 | L2 | L3 | `n5.bridge_eligible_false` | `**/topic-selection-v1c.node-harness*.test.*` | Diagnostic `action_required`, eligibility reason, zero bridge writes, typed action data if provided. | local, ci |
| N5-05 | L2 | L3 | `n5.missing_or_conflicting_commitment` | `**/topic-selection-v1c.node-harness*.test.*` | Missing/conflicting commitment diagnostics, required action codes, zero bridge writes. | local, ci |
| N5-06 | L2 | L1 | `n5.deterministic_semantic_projection` | `**/topic-selection-v1c.node-harness*.test.*` | Working-copy payload derived only from structured commitment fields, payload hash, no prose parsing evidence. | local, ci |
| N5-07 | L1 | L2/L3 | `n5.missing_required_semantic_fields` | `**/topic-selection-v1c.contract*.test.*` | Missing-field contract result, node diagnostic, zero bridge writes, missing field codes. | local, ci |
| N5-08 | L3 | L2 | `n5.bridge_replay_idempotency` | `**/topic-selection-v1c.persistence*.test.*` | Existing bridge returned for same source decision, drift conflict result, no second bridge row. | local, ci |
| N5-09 | L3 | L2 | `n5.no_half_built_bridge` | `**/topic-selection-v1c.persistence*.test.*` | Failure diagnostics only, bridge row count unchanged, no blocked/partial/action-required bridge status. | local, ci |
| N5-10 | L2 | L4 | `n5.no_downstream_side_effect` | `**/topic-selection-v1c.node-harness*.test.*` | No PaperProject, PaperImplementation, WorkOrder, experiment, writing, downstream intake, or LLM authority evidence. | local, ci |

### N2 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N2-01 | L5 | L2 | `n2.l5b.bounded_micro_debate_p0` | `**/topic-selection-v1c.llm-codex*.test.*` | Real Codex `n=3` run summaries, four-call artifacts, admitted final support/dossier refs, N3 handoff evidence. | local, release |
| N2-02 | L2 | L1 | `n2.illegal_n1_entry` | `**/topic-selection-v1c.node-harness*.test.*` | Blocked/malformed result, zero LLM invocations, zero support/dossier writes, no N3 invocation. | local, ci |
| N2-03 | L2 | L1 | `n2.frozen_context_packet` | `**/topic-selection-v1c.node-harness*.test.*` | Context packet hash, allowed-ref set, mutable-state drift diagnostic, no live v1b/package read evidence. | local, ci |
| N2-04 | L5 | L1 | `n2.fixed_four_call_workflow` | `**/topic-selection-v1c.llm-codex*.test.*` | Ordered role slots, call indexes, prompt/profile refs, exactly four structured output hashes. | local, release |
| N2-05 | L1 | L5 | `n2.per_call_admission_failure` | `**/topic-selection-v1c.contract*.test.*` | Admission failure report, failed role slot artifact, stopped remaining calls, no final handoff. | local, ci, release |
| N2-06 | L2 | L5 | `n2.transport_timeout_retry` | `**/topic-selection-v1c.node-harness*.test.*` | Same-input retry trace, retry count, final admitted output or blocked diagnostic after budget exhaustion. | local, ci |
| N2-07 | L5 | L1 | `n2.final_admission_semantic_layer` | `**/topic-selection-v1c.llm-codex*.test.*` | Required semantic slots, critic resolution map, final admitted output hash, N3-readable handoff. | local, release |
| N2-08 | L1 | L5 | `n2.forbidden_authority_output` | `**/topic-selection-v1c.contract*.test.*` | Hard admission failure for authority/downstream fields, sanitized diagnostic, no N3 invocation. | local, ci, release |
| N2-09 | L1 | L2 | `n2.semantic_gap_admission_boundary` | `**/topic-selection-v1c.contract*.test.*` | Slot-absence admission failure or admitted weak/missing/contradicted status, deterministic handoff behavior. | local, ci |
| N2-10 | L3 | L5 | `n2.support_run_replay_idempotency` | `**/topic-selection-v1c.persistence*.test.*` | Same support run key returns existing records, no LLM re-invocation, drift creates new attempt/diagnostic. | local, ci, release |
| N2-11 | L3 | L5 | `n2.diagnostic_persistence_boundary` | `**/topic-selection-v1c.persistence*.test.*` | Structured artifacts/hashes/admission reports only, sanitized telemetry, no raw logs/hidden reasoning. | local, ci |
| N2-12 | L5 | L1 | `n2.explicit_provider_or_fallback_profile` | `**/topic-selection-v1c.llm-codex*.test.*` | Explicit profile/policy metadata, same output contract admission, no silent fallback or gate weakening. | local, release, canary |

### N3 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N3-01 | L2 | L3 | `n3.ready_gate_happy_path` | `**/topic-selection-v1c.node-harness*.test.*` | `ready_for_human_decision`, mini-check/gate artifacts, N4 handoff refs, no decision/bridge writes. | local, ci |
| N3-02 | L2 | L3 | `n3.missing_or_stale_lineage` | `**/topic-selection-v1c.node-harness*.test.*` | Fail-before-gate-authority diagnostic, stale/missing hash evidence, zero gate authority writes. | local, ci |
| N3-03 | L2 | L1 | `n3.structured_semantic_validation` | `**/topic-selection-v1c.node-harness*.test.*` | `action_required`, semantic slot issue codes, typed required actions, no prose-authority evidence. | local, ci |
| N3-04 | L2 | L1/L5 | `n3.prose_conflict` | `**/topic-selection-v1c.node-harness*.test.*` | Conflict issue code, structured slot canonicalization evidence, optional Codex diagnostic artifact. | local, ci |
| N3-05 | L2 | L1 | `n3.carried_blockers_rechecks` | `**/topic-selection-v1c.node-harness*.test.*` | Carried blocker/recheck refs, `action_required`, typed loopback/action refs. | local, ci |
| N3-06 | L2 | L1 | `n3.mini_check_gaps` | `**/topic-selection-v1c.node-harness*.test.*` | Mini-check item failures, required actions, source refs, no LLM fill-in evidence. | local, ci |
| N3-07 | L2 | L4 | `n3.parked_outcome` | `**/topic-selection-v1c.node-harness*.test.*` | Park reason/rationale/resume conditions, no N4 invocation, explicit resume-only evidence. | local, ci |
| N3-08 | L2 | L4 | `n3.ready_is_not_promote` | `**/topic-selection-v1c.node-harness*.test.*` | Ready handoff, no `PromotionDecision`, no bridge, no N5 invocation. | local, ci |
| N3-09 | L1 | L2 | `n3.malformed_typed_action` | `**/topic-selection-v1c.contract*.test.*` | Missing typed-action contract failure, blocked routing, no inferred prose action. | local, ci |
| N3-10 | L3 | L2 | `n3.gate_replay_drift` | `**/topic-selection-v1c.persistence*.test.*` | Replay identity evidence, N2 intermediate artifacts excluded, drift/conflict diagnostic. | local, ci |
| N3-11 | L5 | L2 | `n3.l5b.codex_diagnostic_adjunct` | `**/topic-selection-v1c.llm-codex*.test.*` | Real Codex diagnostic output after deterministic `action_required`, unchanged gate outcome/routing/replay. | local, release |

### N4 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N4-01 | L2 | L3 | `n4.bridge_authorized_happy_path` | `**/topic-selection-v1c.node-harness*.test.*` | `bridge_authorized`, decision/profile rows, N5 handoff refs, actor/delegation metadata. | local, ci |
| N4-02 | L2 | L1 | `n4.illegal_n3_entry` | `**/topic-selection-v1c.node-harness*.test.*` | Blocked/malformed result, zero decision/profile writes, no N5 handoff. | local, ci |
| N4-03 | L2 | L1 | `n4.action_required_decision` | `**/topic-selection-v1c.node-harness*.test.*` | `action_required`, typed actions/loopback hints, no commitment profile or bridge handoff. | local, ci |
| N4-04 | L2 | L4 | `n4.closed_no_auto_progress` | `**/topic-selection-v1c.node-harness*.test.*` | Closure kind, stopped automation, no N5 invocation, explicit reopen-only evidence. | local, ci |
| N4-05 | L2 | L1 | `n4.conditions_are_data` | `**/topic-selection-v1c.node-harness*.test.*` | `bridge_authorized`, conditions in commitment profile, no condition-based harness branch. | local, ci |
| N4-06 | L2 | L1/L3 | `n4.commitment_projection_admission` | `**/topic-selection-v1c.node-harness*.test.*` | Projection admission diagnostics or admitted profile hash, no LLM repair evidence. | local, ci |
| N4-07 | L5 | L2/L3 | `n4.l5b.codex_delegated_happy_path` | `**/topic-selection-v1c.llm-codex*.test.*` | Valid delegation envelope, admitted Codex payload, hybrid actor metadata, decision/profile evidence. | local, release |
| N4-08 | L5 | L1 | `n4.l5b.codex_delegated_rejection` | `**/topic-selection-v1c.llm-codex*.test.*` | Missing/expired/scope-mismatch rejection, zero decision/profile writes, sanitized rejection diagnostic. | local, release |
| N4-09 | L5 | L2 | `n4.codex_draft_non_authority` | `**/topic-selection-v1c.llm-codex*.test.*` | Draft artifact as diagnostic/support only, no current decision identity unless adopted/admitted. | local, release |
| N4-10 | L3 | L2 | `n4.current_decision_idempotency` | `**/topic-selection-v1c.persistence*.test.*` | Same decision key idempotency, different payload `VERSION_CONFLICT`, one current decision per snapshot. | local, ci |
| N4-11 | L2 | L4 | `n4.no_bridge_creation` | `**/topic-selection-v1c.node-harness*.test.*` | N5 handoff only, zero bridge/downstream rows written by N4. | local, ci |

### N6 Mapping
| acceptance_row_id | primary_level | secondary_level | fixture_group | test_file_pattern | evidence_required | run_gate |
| --- | --- | --- | --- | --- | --- | --- |
| N6-01 | L2 | L4 | `n6.structured_recheck_happy_path` | `**/topic-selection-v1c.node-harness*.test.*` | `recheck_opened`, feedback/recheck refs, loopback target/cause, no N1-N5 invocation. | local, ci |
| N6-02 | L2 | L3 | `n6.structured_no_recheck` | `**/topic-selection-v1c.node-harness*.test.*` | `feedback_recorded`, feedback row, no recheck artifact. | local, ci |
| N6-03 | L2 | L3 | `n6.invalid_bridge_or_source` | `**/topic-selection-v1c.node-harness*.test.*` | `invalid_feedback`, invalid bridge/source diagnostics, zero recheck writes. | local, ci |
| N6-04 | L1 | L2 | `n6.unsupported_or_underspecified_signal` | `**/topic-selection-v1c.contract*.test.*` | Invalid signal classification, policy version evidence, no recheck artifact. | local, ci |
| N6-05 | L1 | L2 | `n6.missing_required_action` | `**/topic-selection-v1c.contract*.test.*` | Missing-action contract failure, `invalid_feedback`, no inferred prose action. | local, ci |
| N6-06 | L2 | L1 | `n6.deterministic_classification_mapping` | `**/topic-selection-v1c.node-harness*.test.*` | Fixed signal-to-target/cause mapping evidence, source kind as provenance only. | local, ci |
| N6-07 | L5 | L1/L2 | `n6.l5b.codex_normalization_happy_path` | `**/topic-selection-v1c.llm-codex*.test.*` | Real Codex candidate, admitted structured feedback hash, deterministic final outcome. | local, release |
| N6-08 | L5 | L1 | `n6.l5b.codex_normalization_rejection` | `**/topic-selection-v1c.llm-codex*.test.*` | Invented-ref/forbidden-mutation rejection, sanitized diagnostic, no direct recheck creation. | local, release |
| N6-09 | L3 | L2 | `n6.feedback_fingerprint_replay` | `**/topic-selection-v1c.persistence*.test.*` | Same fingerprint returns existing records, bridge/source drift invalid/conflict, no duplicates. | local, ci |
| N6-10 | L4 | L2 | `n6.no_upstream_mutation_auto_loop` | `**/topic-selection-v1c.workflow-harness*.test.*` | `recheck_opened`, no N1-N5 trigger, unchanged bridge/decision/profile/package/downstream refs. | local, ci |
| N6-11 | L3 | L5 | `n6.diagnostic_persistence_boundary` | `**/topic-selection-v1c.persistence*.test.*` | Fingerprint/classification/provenance hashes and sanitized diagnostics only, no raw Codex authority. | local, ci |

## LLM/Codex Test Strategy
Status: confirmed.

The LLM/Codex acceptance strategy is dual-lane, not stub-only. Deterministic fixtures prove harness contracts; real Codex/provider runs prove that prompt/profile/agent workflows work under realistic model variance.

LLM/Codex test lanes:
| Lane | Name | Purpose | Acceptance role |
| --- | --- | --- | --- |
| L5a | Contract stub | Use fixed model outputs to validate schema admission, forbidden fields, invented refs, retry, replay, and routing boundaries. | P0, CI-suitable. |
| L5b | Real Codex acceptance | Run real Codex-backed scenarios for N2 bounded micro-debate, N3 diagnostic adjunct, N4 delegated payload, and N6 normalization. | P0 acceptance and local required. |
| L5c | Provider/model variance suite | Repeat representative fixtures across configured provider/model profiles to expose variance, hallucinated refs, prompt drift, latency, and cost issues. | Slower gate, release/nightly/canary suitable. |

Local L5b requirement:
- Real Codex acceptance MUST be part of local T-108 acceptance.
- Missing Codex credentials, disabled profile, network/runtime unavailability, or unresolved model config MUST report `real_codex_blocked_environment`; it MUST NOT be treated as a passing skip.
- Ordinary CI MAY run L5a only, but T-108 local acceptance and any release-capable gate MUST include L5b.
- Harness results SHOULD distinguish `stub_contract_pass`, `real_codex_acceptance_pass`, `real_codex_blocked_environment`, `real_codex_failed_admission`, and `real_codex_failed_quality_or_variance`.

Minimum local L5b coverage:
- N2 bounded micro-debate: real four-call run with admitted final support/dossier.
- N3 diagnostic adjunct: deterministic `action_required` followed by real Codex diagnostic output.
- N4 delegated Codex: valid explicit delegation happy path plus missing-authorization rejection.
- N6 Codex normalization: semi-structured feedback normalization happy path plus invented-ref or forbidden-mutation rejection.

Pass/fail model:
- Each real Codex scenario SHOULD run `n=3` by default for local acceptance.
- Hard contract failures fail the scenario on any occurrence.
- Quality/variance checks MAY pass by threshold, with default threshold `>= 2/3` accepted runs.
- Latency/cost SHOULD be recorded per run. Soft budget excess SHOULD warn; hard budget excess SHOULD fail once thresholds are defined.

Hard contract failures:
- invalid schema or parse failure after allowed repair/admission handling;
- invented or disallowed refs;
- forbidden authority fields or downstream mutation commands;
- missing required semantic slots;
- Codex-delegated decision outside authorization scope;
- N3 diagnostic changing or attempting to change gate routing/outcome/replay identity;
- N6 normalization creating recheck artifacts directly or mutating upstream state;
- fallback to an unapproved profile or deterministic rescue path.

Quality/variance checks:
- N2 support completeness, critic usefulness, critic finding resolution coverage, semantic-slot rationale quality, and reviewer readability;
- N3 diagnostic usefulness for repair or harness tuning;
- N4 delegated payload clarity and condition/action quality within the authorization envelope;
- N6 normalization accuracy and required-action wording;
- latency/cost stability and model failure frequency.

Real LLM/Codex acceptance assertions:
- N2 fixed four-call bounded micro-debate completes with admitted structured outputs.
- N2 final output exposes N3-readable semantic slots and critic finding resolution map.
- Admission catches invented refs, forbidden authority fields, malformed structures, and hidden routing attempts.
- N3 diagnostic Codex produces useful diagnostic material without changing deterministic gate outcome/routing/replay.
- N4 `codex_delegated` works only inside a valid authorization envelope and fails closed otherwise.
- N6 Codex normalization turns semi-structured feedback into an admitted structured candidate or is rejected deterministically.
- Model variance is surfaced through pass/fail diagnostics, admission reports, latency/cost telemetry, and harness tuning notes instead of being hidden by fallback.

Real LLM/Codex tests MUST NOT require byte-for-byte identical prose. They MUST require stable structure, valid refs, accepted routing boundaries, deterministic admission behavior, and controlled failure semantics.

## N2 L5b Bounded Micro-Debate Metrics
Status: confirmed.

P0 real Codex fixture set:
- `clean_promote_candidate`: a ready candidate with complete claim ceiling, contribution, evaluation plan, and selected evidence.
- `risk_and_recheck_candidate`: a ready candidate carrying accepted risks, blockers/recheck obligations, or early-check refs that must be preserved.

Sampling:
- Each P0 N2 real Codex fixture SHOULD run `n=3`.
- Hard contract failures fail the fixture on any occurrence.
- Quality/variance checks use default threshold `>= 2/3` accepted runs.

Hard workflow gates:
- Exactly four LLM calls are made.
- Call order is fixed: `promotion_supporter.draft`, `reviewer_critic.review`, `promotion_supporter.repair`, `synthesizer.final`.
- Role slots, call indexes, profile id/version, prompt refs, context packet hash, and snapshot hash match the harness request.
- No extra role, skipped role, dynamic debate expansion, or Codex single-agent control lane is used in the P0 baseline.

Hard admission gates:
- Every role output parses as the expected structured contract.
- Every source ref is drawn from the N1-derived context allowlist.
- No role output contains forbidden authority fields, downstream mutation commands, raw hidden reasoning, raw provider logs, secrets, or unredacted payloads.
- Redaction and size limits pass for every call.
- Only admitted `synthesizer.final` may become the N2 output consumed by N3.

Hard final-contract gates:
- `synthesizer.final` includes non-empty support/dossier content plus the required N3-readable semantic slots:
  - `claim_ceiling_alignment`;
  - `contribution_summary`;
  - `evaluation_plan_summary`;
  - `evidence_support_map`;
  - `accepted_risk_acknowledgements`;
  - `recheck_obligation_summary`;
  - `critic_finding_resolution_map`;
  - `readiness_coverage_items`.
- Each required semantic slot includes valid `status`, `refs`, and `rationale`.
- Every critic finding is resolved as `accepted_and_repaired`, `accepted_as_risk`, or `rebutted_with_refs`.
- Accepted risks, blockers, and recheck refs carried from N1 are preserved and explained; they are not deleted, weakened, or rewritten.

N2 L5b threshold defaults:
| Metric | Default threshold |
| --- | --- |
| Final admitted runs | `>= 2/3` |
| Complete critic finding resolution | `>= 2/3` |
| Invented refs | `0/3` |
| Forbidden authority outputs | `0/3` |
| Missing required semantic slots | `0/3` |
| Unapproved fallback/profile switch | `0/3` |
| Latency/cost/token usage | Record baseline; warn on soft budget once defined; fail on hard budget once defined. |

N2 quality checks:
- supporter draft gives a reviewer-useful support case grounded in allowed refs;
- critic review identifies concrete risks, overclaims, evidence gaps, evaluation gaps, or accepted-risk concerns when present;
- supporter repair addresses or rebuts critic findings without broad uncontrolled regeneration;
- synthesizer final is readable, structured, and useful for N3 deterministic validation;
- risk/recheck fixture preserves carried risks and recheck obligations across all admitted outputs.

## L5c Provider/Model Variance Suite
Status: confirmed.

Execution boundary:
- L5c does not run in the ordinary local development loop.
- L5c does not run in ordinary CI.
- L5c SHOULD run in `nightly`, `release`, or explicit `canary` gates.
- `smoke` is allowed only as an explicit developer/provider sanity gate and does not satisfy full L5c acceptance.
- L5c does not replace L5b local real Codex acceptance.

Default coverage:
| Scope | Variance focus |
| --- | --- |
| N2 | Schema pass rate, invented refs, critic coverage, semantic slot completeness, final admission stability, latency/cost by profile. |
| N3 | Diagnostic adjunct usefulness and routing-boundary preservation across profiles. |
| N4 | Explicitly admitted provider-delegated candidate profile only: authorization-boundary preservation, draft-non-authority, deterministic service admission, and missing-authorization rejection. |
| N6 | Normalization accuracy, invented refs, over-interpretation, required-action quality, and classification stability. |
| Cross-node | Profile/prompt/version drift in replay identity and quality of drift diagnostics. |

N4 boundary:
- N4 `codex_delegated` remains covered by L5b authorization tests.
- N4 is included in L5c only through explicit provider-canary profile admission; provider output is still only a delegated candidate and deterministic N4 service admission remains authoritative.

Sampling:
- Each selected provider/model/profile SHOULD run `n=3` on selected fixtures.
- Each covered node SHOULD use one or two representative fixtures.
- Full L5c acceptance requires `TOPIC_SELECTION_V1C_PROVIDER_CANARY_GATE=canary|nightly|release` and `TOPIC_SELECTION_V1C_PROVIDER_CANARY_SAMPLE_COUNT>=3`.
- Selected profile id/version, prompt version, provider/model metadata, context hash, output hashes, latency, cost, and token usage MUST be recorded.

Failure handling:
- Hard contract failures SHOULD block release/canary gates.
- Quality drift SHOULD create a tuning report or issue and may warn instead of blocking unless it crosses an explicit release threshold.
- L5c failures MUST NOT be hidden by fallback to another provider/profile.
- L5c results MUST preserve enough diagnostics for harness tuning and prompt/profile repair.

L5c recorded metrics:
- admission pass rate;
- invented-ref rate;
- forbidden-field rate;
- final semantic slot completeness;
- critic finding resolution completeness;
- normalization classification agreement;
- diagnostic usefulness rating or rubric result;
- latency, cost, and token usage;
- profile/prompt/model version;
- drift/conflict diagnostic clarity.

## Implementation Landing Checklist
Status: closed for T-108 P0. Fixture builders, deterministic service-level rows, expanded final-row deterministic rows, the harness adapter, native harness consumption, the manifest-producing deterministic runner, full local L5b real Codex evidence, the L5c provider/canary runner, full L5c canary evidence, and closure cleanup are landed. No additional acceptance-matrix test rows remain open.

Existing repo conventions to preserve:
- backend tests live under `apps/backend/src/**` and end with `.test.ts`; `pnpm --filter @paper-engineering-assistant/backend test` runs `apps/backend/scripts/run-node-tests.mjs` and strips provider secrets unless explicitly preserved;
- shared contract/schema tests live under `packages/shared/src/**` and end with `.schema.test.ts`;
- real harness runners live under `.ai/scripts/topic-selection-*.mjs` and write run evidence under `.ai/.tmp/<runner>/<run-id>/`;
- existing v1a/v1b topic-selection runners are the naming precedent for T-108 script entrypoints.

Test file organization:
| Layer | Implementation target |
| --- | --- |
| L1 Contract fixtures | Shared schema/admission tests under `packages/shared/src/research-lifecycle/**` plus backend contract admission tests when admission needs service helpers. |
| L2 Node harness tests | `apps/backend/src/services/topic-selection-v1c-workflow-harness-service.unit.test.ts` for legal entry, outcomes, typed actions, node handoffs, stop behavior, and no side effects. Existing node service tests may carry node-owned details. |
| L3 Persistence/idempotency tests | Prisma repository/service tests under `apps/backend/src/repositories/prisma/**` and targeted service tests. Persistence rows MUST NOT be proven only with in-memory repositories. |
| L4 Cross-node workflow tests | A deterministic harness acceptance runner plus focused backend tests for forward-only progression, stop-after-failure, no fallback, no auto loop, and replay. |
| L5 LLM/Codex tests | Deterministic L5a fixtures in tests, plus real L5b Codex runner evidence. L5c provider/canary runs use the same evidence contract. |

Fixture builder naming:
- Add a shared backend fixture module following the existing `*-scenario-fixtures.ts` convention, proposed as `apps/backend/src/services/topic-selection-v1c-acceptance-scenario-fixtures.ts`.
- Fixture group ids MUST match the mapping table, for example `n1.ready_snapshot`, `n2.l5b.bounded_micro_debate_p0`, `n5.bridge_replay_idempotency`, and `workflow.forward_only_happy_chain`.
- Builders SHOULD expose stable scenario-id helpers, minimal valid graph builders, and explicit drift/malformed variants. Tests SHOULD use structured object overrides instead of ad hoc string patching.
- Fixture builders MUST emit source refs, hashes, replay keys, profile/prompt refs, and workspace ids needed by the row evidence contract.

Required script entrypoints:
| Script | Purpose | Gate |
| --- | --- | --- |
| `topic-selection:v1c-harness-acceptance` | Deterministic L1-L4 plus L5a contract-stub acceptance. | local, ci |
| `topic-selection:v1c-real-codex-acceptance` | Local required L5b real Codex acceptance for N2, N3, N4, and N6. Landed. | local, release |
| `topic-selection:v1c-provider-canary` | L5c provider/model variance suite. Landed with explicit `smoke` sanity mode and full gate support. | release, nightly, canary |

Script behavior requirements:
- Local T-108 acceptance MUST run `pnpm typecheck`, `pnpm test`, `pnpm topic-selection:v1c-harness-acceptance`, and `pnpm topic-selection:v1c-real-codex-acceptance`.
- Real Codex acceptance MUST load the real local profile intentionally and MUST report `real_codex_blocked_environment` when credentials, Codex binary/profile, network, or runtime configuration is unavailable.
- `real_codex_blocked_environment` is a blocked acceptance state, not a passing skip.
- Real LLM/Codex scripts SHOULD run outside the generic backend test runner unless they explicitly opt into real provider/Codex environment handling.
- No acceptance script may silently switch profile, prompt, provider, or fallback policy to make a row pass.

Evidence output contract:
- All T-108 acceptance runners MUST write to `.ai/.tmp/topic-selection-v1c-acceptance/<run-id>/`.
- The current deterministic v0 runner writes the required evidence family as `manifest.json`, `acceptance-row-results.jsonl`, `row-results.json`, `harness-trace.json`, `node-trace.json`, and `persistence-summary.json`.
- Every run MUST include:
  - `manifest.json` with command, git sha when available, run id, start/end time, selected gate, environment status, and profile/prompt versions;
  - `acceptance-row-results.jsonl` with one record per acceptance row/scenario execution;
  - `harness-trace.json` or equivalent structured trace for node invocation/non-invocation and forward-only routing;
  - `persistence-summary.json` with before/after row counts, stable ids, conflicts, replay results, and no-half-built assertions;
  - `llm-codex/summary.json` for L5b scenario status, sample count, hard failures, quality threshold results, latency/cost/token summaries, and admitted output hashes;
  - `llm-provider-canary/summary.json` for L5c scenario status, sample count, hard failures, provider/model/profile metadata, latency/cost/token summaries, and admitted output hashes.
- L5b/L5c per-sample evidence MAY include sanitized normalized outputs and admission reports, but MUST NOT store secrets, raw provider logs, hidden reasoning, or unredacted payloads.
- Row result statuses MUST distinguish `pass`, `fail_contract`, `fail_quality_or_variance`, `blocked_environment`, and `not_run_not_accepted`.
- Evidence is for harness robustness, LLM/operator repair, and prompt/profile tuning; it is not an audit or product-facing record.

Implementation order:
1. Land L1 contracts and fixture builders. Initial backend fixture module landed in `apps/backend/src/services/topic-selection-v1c-acceptance-scenario-fixtures.ts`.
2. Land N1/N5 deterministic persistence-heavy L2/L3 rows first. Initial N1/N5 service-level acceptance rows landed in `apps/backend/src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts`.
3. Land N2/N3/N4/N6 node and contract rows. Initial service-level rows landed in `apps/backend/src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts`.
4. Land L4 cross-node workflow acceptance. Initial service-level L4 coverage landed in `apps/backend/src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts`; initial manifest-producing runner landed in `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs`.
5. Land product/native harness consumption of `apps/backend/src/services/topic-selection-v1c-harness-adapter.ts` and expand final-row deterministic coverage. Native consumption landed in `TopicSelectionWorkflowHarnessService.runV1cHarnessConsumptionScenario`; expanded final-row deterministic evidence landed in `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-expanded-2026-05-29/`.
6. Land L5b real Codex runner. Full local L5b evidence landed in `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-full-2026-05-28/`.
7. Land L5c provider/canary runner. Initial smoke evidence landed in `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-smoke-2026-05-29-r6/`; full canary evidence landed in `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-full-2026-05-29/`.

## Row Groups
- `X`: cross-node harness contract.
- `N1`: promotion input snapshot.
- `N2`: promotion support and bounded micro-debate.
- `N3`: deterministic promotion gate and mini-check.
- `N4`: human/delegated promotion decision.
- `N5`: `PaperProjectBridge` materialization.
- `N6`: downstream feedback/recheck ingress.

## Cross-Node Harness Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| X-01 | cross-node | Forward-only happy chain | Valid N1 source bundle, admitted N2 final support, N3 ready handoff, N4 bridge authorization, valid N5 bridge inputs. | Each node returns its legal success outcome: `ready_for_gate`, admitted N2 handoff, `ready_for_human_decision`, `bridge_authorized`, `bridge_ready`. | Harness advances only `N1 -> N2 -> N3 -> N4 -> N5`; no skipped node or out-of-order invocation. | Only legal authority artifacts are written at their owning nodes; diagnostics remain secondary metadata. | Re-running the same chain with identical replay keys returns existing results or idempotent records without duplicate authority writes. | N2 may use bounded micro-debate; other LLM/Codex paths must follow their explicit node contracts. | No node creates downstream artifacts before its authority boundary; no PaperImplementation or downstream intake acceptance is implied. |
| X-02 | cross-node | Illegal node entry | A node request lacks the required legal upstream handoff, or the handoff outcome is not allowed for that node. | Malformed/blocked harness result, expressed through the node's diagnostic stop contract. | Harness does not invoke the requested node body or any later node. | No authority artifact is written; a diagnostic artifact may record missing handoff and refs if there is enough trustworthy context. | Same malformed request may replay to the same diagnostic; a later valid handoff creates a new attempt. | No LLM/Codex call may be used to repair missing authority handoff. | Entry legality is based on structured handoff and hashes, not prose or legacy disposition names. |
| X-03 | cross-node | Stop outcome stops automation | Any node returns `action_required`, `parked`, `closed_no_auto_progress`, `invalid_feedback`, or blocked diagnostic state. | The original node outcome is preserved as the terminal outcome for the current attempt. | Harness stops immediately; it does not invoke downstream nodes. | Only artifacts allowed by that stop outcome are written; no later authority artifact is created. | Replay of the stopped attempt returns the same stopped result; repair requires explicit new attempt. | LLM/Codex diagnostic helpers may run only where the node policy allows and cannot change routing. | Stop outcomes are terminal for the current attempt and cannot become implicit fallback edges. |
| X-04 | cross-node | Typed action required for recoverable stop | A recoverable non-success result is produced without valid `required_actions`, `affected_refs`, lineage/hash data, or `resume_entry`. | Malformed harness result or blocked diagnostic. | Harness blocks before routing or opening repair work. | Diagnostic artifact records the contract violation when trustworthy context exists. | Same malformed output replays as malformed; fixed typed action payload creates a new attempt/result identity. | LLM/Codex may diagnose the malformed output only through diagnostic profiles. | Harness must not parse prose to infer missing repair action or resume entry. |
| X-05 | cross-node | No implicit fallback | N2 or another node fails admission, profile resolution, schema validation, or provider/Codex invocation outside an approved fallback policy. | Node-specific blocked diagnostic or `action_required` according to the node contract. | Harness stops or applies only the explicitly budgeted same-node retry; it does not switch to old logic/profile paths. | No authority artifact is written from fallback output unless the fallback policy was explicit and admitted by the same contract. | Fallback policy id/version is part of replay identity when present; absence of policy must not silently reuse alternate results. | Provider/Codex failure does not authorize deterministic rescue unless explicitly configured. | Fallback is disabled by default and must never weaken downstream gates. |
| X-06 | cross-node | Replay no duplicate writes | Identical workflow/node replay key is submitted after successful or stopped execution. | Existing harness result is returned. | Harness does not re-run side-effectful node work. | No duplicate `PromotionInputSnapshot`, `PromotionDecision`, `PromotionCommitmentProfile`, or `PaperProjectBridge` is created. | Exact replay must be stable; domain idempotency still protects authority records when caller repeats the same command. | LLM/Codex calls are not re-invoked for an exact replay. | Replay cannot mask hash/profile/prompt drift and cannot supersede current records. |
| X-07 | cross-node | Hash drift or version conflict | Source bundle, snapshot, N2 context packet, prompt/profile, gate policy, decision payload, commitment profile, or bridge payload hash differs from the existing current record. | Node-specific conflict, drift, blocked diagnostic, or `action_required`. | Harness stops before unsafe reuse or duplicate progression. | No conflicting authority artifact is written; diagnostics include drift refs and hashes. | Drift creates a new attempt or `VERSION_CONFLICT` according to the node policy; exact replay identity is not reused. | LLM/Codex cannot explain away or repair hash drift into authority. | Current-record selection and source lineage are deterministic and structured. |
| X-08 | cross-node | Retry is bounded and local | A same-node transient failure occurs, such as transport timeout or temporary provider invocation failure where node policy allows retry. | Original node eventually succeeds or returns blocked diagnostic after retry budget is exhausted. | Retry stays in the same node with the same input, profile, prompt refs, and replay context; no new workflow edge is created. | Intermediate failed retry diagnostics may be recorded; authority writes occur only after admitted success. | Retry attempts share the same transient-retry envelope but do not create duplicate domain records. | Retry does not change model/profile/prompt unless an explicit policy says so. | Retry is an internal mechanism, not nonlinear workflow routing. |
| X-09 | cross-node | N6 no automatic loop | N6 records feedback that maps to `recheck_opened`. | `recheck_opened`. | Harness opens a recheck/action projection and stops; it does not trigger N1, N2, N3, N4, or N5. | Feedback and recheck projection records may be written; bridge, promotion decision, commitment profile, and topic package remain unchanged. | Same feedback fingerprint returns the existing feedback/recheck records. | Codex normalization may only produce an admitted structured candidate before deterministic classification. | v1c has no v1b-style automatic feedback loop; downstream feedback never mutates upstream authority. |
| X-10 | cross-node | LLM output never raw authority | Codex/provider output includes prose, hidden reasoning, provider logs, unsupported fields, or routing-like claims outside the admitted structured contract. | Admission failure or diagnostic stop outcome for the owning node. | Harness ignores raw output for routing and does not invoke downstream authority from it. | Raw provider logs, hidden reasoning, and unadmitted drafts are not persisted as authority; sanitized diagnostics may be persisted where allowed. | Admitted structured output hash is used for replay; raw text/log drift is not authority identity. | Only admitted structured contracts can influence node-local decisions allowed by policy. | LLM/Codex cannot directly promote, bridge, mutate downstream state, or create loopbacks. |

## N1 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N1-01 | N1 | Ready snapshot happy path | Valid frozen `TopicSelectionV1bToV1cInputBundle`, matching bundle hash/workspace, and package/readiness refs that evaluate as ready. | `ready_for_gate`. | Emit `PromotionInputSnapshotHandoff` and invoke only N2 next. | Write one `PromotionInputSnapshot` plus normalized harness result metadata through the N1 service/repository boundary. | Exact replay returns the existing result; repeated domain call for the same bundle/hash returns the same snapshot idempotently. | No LLM/Codex/provider invocation. | N1 freezes input only; it does not generate support, run gate, record decision, create bridge, or touch downstream state. |
| N1-02 | N1 | Malformed request or missing bundle | Malformed harness envelope, missing source bundle id, unknown bundle, or no trustworthy frozen bundle context. | Malformed/blocked diagnostic before snapshot authority. | Stop before N2; no handoff is emitted. | No `PromotionInputSnapshot` is written; harness-level diagnostic may be recorded only if trustworthy context exists. | Same malformed request may replay to the same diagnostic; a later valid bundle starts a new attempt. | No LLM/Codex repair path. | N1 must not infer or reconstruct missing input from mutable v1b live state. |
| N1-03 | N1 | Workspace or source drift | Source bundle exists but workspace, source ref, or hash does not match the request, or the frozen context is untrusted. | Drift/conflict diagnostic before snapshot authority. | Stop before N2; no handoff is emitted. | No authority snapshot is written; diagnostics may record drift refs and hashes when available. | Drift is not exact replay and must not reuse a prior snapshot result. | No LLM/Codex explanation may change authority outcome. | N1 must not repair drift by re-reading mutable package state or weakening hash checks. |
| N1-04 | N1 | Non-ready diagnostic snapshot | Trustworthy frozen bundle can be loaded and evaluated, but readiness is `blocked`, `needs_upstream_refresh`, or `superseded`. | Diagnostic non-ready result, not `ready_for_gate`. | Stop before N2; no `PromotionInputSnapshotHandoff` is emitted. | Persist diagnostically useful non-ready snapshot/result data as append-only per attempt. | Non-ready diagnostics are not reusable promotion inputs; repeated attempts remain diagnostic unless source state changes. | No LLM/Codex/provider invocation. | Blocked snapshots must not become alternate N2 inputs or product remediation workflows. |
| N1-05 | N1 | Warning and blocker propagation | Frozen bundle carries accepted risks, blockers, warnings, memory suggestions, recheck refs, package trace issues, or evidence refs. | Readiness outcome is determined normally, with carried fields preserved. | If `ready_for_gate`, invoke N2; otherwise stop according to N1 non-ready rules. | Persist the carried codes/refs in snapshot and harness result metadata without rewriting their meaning. | Propagated refs/codes participate in stable snapshot identity and diagnostic readback. | No LLM/Codex/provider invocation. | N1 must not delete, weaken, reinterpret, or synthesize warning/blocker semantics. |
| N1-06 | N1 | Exact replay | Same `workflow_run_id`, `node_attempt_id`, and N1 input hash as a prior ready result. | Existing `ready_for_gate` result is returned. | Do not re-run side-effectful snapshot creation; downstream routing uses the existing handoff according to harness replay policy. | No duplicate snapshot or authority write. | Strict exact replay is stable for ready snapshots. | No LLM/Codex/provider invocation. | Harness replay must not hide domain idempotency conflicts or source drift. |
| N1-07 | N1 | Domain idempotency conflict | Repeated domain command uses the same bundle id/hash, or the same bundle id appears with a changed hash. | Same bundle/hash returns existing snapshot; changed hash returns conflict. | Same bundle/hash may continue with existing handoff; changed hash stops before N2. | No duplicate snapshot for same bundle/hash; no second snapshot for conflicting changed hash. | Domain idempotency is keyed by bundle identity/hash and remains distinct from harness replay identity. | No LLM/Codex/provider invocation. | Conflict must be explicit and must not be converted into a fresh snapshot silently. |
| N1-08 | N1 | No LLM or downstream side effect | Any N1 request, including ready, non-ready, malformed, or replay. | Outcome is produced only by deterministic validation and persistence rules. | No model path and no downstream side-effect path; only `ready_for_gate` can trigger N2. | No raw LLM output, provider logs, support/gate/decision/bridge/downstream artifacts, or PaperImplementation payloads are written by N1. | Replay and idempotency do not invoke LLM or downstream work. | LLM/Codex/provider usage is forbidden for N1. | N1 authority boundary is limited to promotion input snapshot and diagnostic metadata. |

## N2 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N2-01 | N2 | Bounded micro-debate happy path | Valid N1 `ready_for_gate` handoff, frozen snapshot/context hashes, and baseline profile `topic-selection.v1c.promotion-support.bounded-micro-debate.codex.v1`. | Admitted N2 support/dossier handoff from `synthesizer.final`. | Run fixed four-call Codex-eligible baseline, then invoke only N3 after final admission. | Write support/dossier records plus diagnostic invocation artifacts and harness metadata; no gate/decision/bridge writes. | Same support run key returns existing support/dossier without re-invoking LLM. | All four calls may use Codex under the baseline profile and must use the shared structured output contract. | N2 output is advisory only and cannot authorize promotion, create `PromotionDecision`, or create `PaperProjectBridge`. |
| N2-02 | N2 | Illegal or non-ready N1 entry | Missing N1 handoff, stale handoff, blocked N1 result, or handoff outcome other than `ready_for_gate`. | Blocked/malformed diagnostic before support generation. | Do not run support generation, do not call LLM/Codex/provider, and do not invoke N3. | No support/dossier artifact is written; diagnostic may record invalid entry refs when trustworthy. | A later valid N1 handoff creates a new attempt; invalid entry is not repaired by replay. | No LLM/Codex call may repair missing N1 authority. | N2 entry is authorized only by structured N1 `ready_for_gate` handoff and hashes. |
| N2-03 | N2 | Frozen context packet | Valid N1 handoff, plus mutable v1b/package state that has changed after N1 snapshot. | N2 uses the N1-derived context packet only. | Continue only if context packet hash matches the N1 handoff; otherwise block with drift diagnostic. | Persist context packet hash and allowed refs; do not persist data sourced from mutable live state. | Context packet hash participates in replay identity; live-state drift does not alter an existing run. | LLM receives only the frozen, redacted `PromotionSupportContextPacket`. | N2 must not re-read mutable v1b/package state to fill gaps or improve support prose. |
| N2-04 | N2 | Fixed four-call workflow | Baseline bounded profile selected. | Admitted final handoff only after all required role slots pass. | Execute exactly `promotion_supporter.draft`, `reviewer_critic.review`, `promotion_supporter.repair`, and `synthesizer.final` in order. | Persist per-call diagnostic artifacts for the four calls only. | Four structured call output hashes are part of N2 replay identity. | No dynamic debate expansion, skipped role, extra role, or Codex single-agent control lane in P0. | Intermediate role artifacts remain diagnostic and cannot become N3 input. |
| N2-05 | N2 | Per-call admission failure | Any intermediate role output has schema parse failure, forbidden fields, invented refs, hash mismatch, redaction failure, or size violation. | Blocked N2 diagnostic; no admitted support handoff. | Stop remaining calls immediately and do not invoke N3. | Persist admission report and sanitized diagnostic artifact for the failed call; no final N2 advisory output is written. | Same malformed structured output replays as failed; corrected output/profile/prompt creates a new attempt identity. | LLM/Codex failure cannot be bypassed by prose interpretation. | Admission is required before each next call; unadmitted intermediate artifacts never influence authority. |
| N2-06 | N2 | Transport or timeout retry | Codex/provider transport, timeout, or invocation failure where the request/profile/prompt are otherwise valid. | Success after retry or blocked diagnostic after retry budget exhaustion. | Retry at most once with the same input, profile, prompt refs, context packet hash, and role slot. | Persist retry diagnostics and final admitted output only if admission succeeds. | Retry does not create duplicate support/dossier records and does not change replay identity except for retry telemetry. | Retry may not switch provider/model/profile/prompt unless explicit policy permits it. | Retry is local to N2 and must not become fallback, loopback, or N3 invocation. |
| N2-07 | N2 | Final admission and semantic layer | `synthesizer.final` returns structured support/dossier with required semantic slots and critic resolution map. | Admitted N2 support/dossier handoff. | Invoke N3 only after final admission passes. | Persist admitted final output hash, semantic layer, support/dossier refs, critic resolution map, and diagnostics. | Final admitted draft hash participates in replay identity. | `synthesizer.final` must produce N3-readable structured slots, not only prose. | N3 consumes the structured semantic layer; dossier prose is human-readable support only. |
| N2-08 | N2 | Forbidden authority output | Any role output includes gate disposition, `promote_allowed`, human decision, bridge fields, PaperImplementation, WorkOrder, experiment, writing, or downstream mutation commands. | Hard admission failure and blocked N2 diagnostic. | Stop current N2 attempt; do not invoke N3. | Persist sanitized admission failure metadata only; no support/dossier authority handoff. | Same forbidden output remains failed on replay; policy/profile changes create a new attempt. | LLM/Codex cannot produce authority commands in advisory support. | N2 must not create or imply gate, promotion, bridge, or downstream authority. |
| N2-09 | N2 | Final semantic gaps vs admission | Final output has all required semantic slots, but one or more slots report `missing`, `weak`, or `contradicted` with refs/rationale; or required slots are absent. | Slot absence is final admission failure; valid slots with weak/missing/contradicted status may be admitted as advisory output. | If admitted, invoke N3 for deterministic gate handling; if absent/malformed, stop at N2. | Persist admitted semantic status values or admission failure diagnostics accordingly. | Semantic status values and final output hash participate in replay identity. | LLM/Codex must expose uncertainty structurally instead of hiding it in prose. | N2 does not decide readiness; N3 owns deterministic interpretation of admitted weak/missing/contradicted slots. |
| N2-10 | N2 | Replay and support-run idempotency | Same support run key with identical N1 snapshot hash, context packet hash, profile id/version, prompt version, structured call output hashes, and final admitted draft hash; or drift in one identity component. | Existing support/dossier for exact identity; new attempt or conflict/diagnostic for drift according to policy. | Exact replay does not re-run LLM; drift does not silently reuse old output. | No duplicate support/dossier for same support run key; prior drifted results remain diagnostic readback only. | Replay identity includes N1 snapshot hash, context packet hash, bounded profile id/version, prompt version, four call hashes, and final admitted draft hash. | LLM/Codex is not re-invoked for exact replay. | Replay cannot mask profile/prompt/context drift or convert diagnostic artifacts into current support. |
| N2-11 | N2 | Diagnostic persistence boundary | Any successful, blocked, retried, or admission-failed N2 attempt. | Node outcome follows the admitted/failure state; diagnostics remain non-authority. | Continue only from admitted final output; otherwise stop. | Persist structured artifacts, hashes, admission reports, warning/blocker codes, critic resolution data, prompt/profile refs, context hash, and sanitized telemetry only. | Diagnostic artifacts support replay/debug but are not reusable authority inputs except admitted final output. | Raw transcripts, hidden reasoning, raw provider logs, secrets, and unredacted output are never persisted. | Diagnostic persistence exists for harness robustness and LLM/operator repair, not audit/compliance or product workflow surfaces. |
| N2-12 | N2 | Explicit provider or fallback profile | Provider-backed profile, compatibility/escalation debate tier, or deterministic fallback policy is requested. | Allowed only if the harness request names an approved profile/policy and output passes the same N2 contract. | Execute according to explicit profile/policy; otherwise block rather than fallback. | Persist resolved profile/policy metadata diagnostically; authority handoff still comes only from admitted final output. | Profile/policy id and version participate in replay identity. | Provider-backed slots and fallback modes must use the same role/output/admission contract as Codex baseline. | Explicit profiles must not weaken N3 gates, bypass admission, or introduce a Codex single-agent control lane into P0. |

## N3 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N3-01 | N3 | Ready gate happy path | Valid N1 `ready_for_gate` handoff, admitted N2 final support/dossier, matching hashes, and structured semantic slots that pass deterministic validation. | `ready_for_human_decision`. | Invoke only N4 human/delegated decision node next. | Persist `ArgumentReadinessMiniCheck`, `PromotionGateCheck`, N4 handoff refs, lineage hashes, and harness metadata. | Same gate run key returns existing gate artifacts; no duplicate gate authority writes. | N3 core performs no LLM/Codex/provider execution. | `ready_for_human_decision` is not promotion and cannot create `PromotionDecision` or bridge. |
| N3-02 | N3 | Missing or stale lineage | Missing N1 handoff, missing admitted N2 final support, hash mismatch, stale support, or untrusted lineage. | Blocked diagnostic before gate authority. | Stop before N4; do not run gate authority path. | No gate authority artifact is written; diagnostic may record missing/stale refs and hashes. | Stale or mismatched lineage is not exact replay and must create drift/conflict handling. | LLM/Codex cannot repair missing lineage into authority. | N3 must consume only trusted N1 and admitted N2 final records. |
| N3-03 | N3 | Structured semantic validation | Admitted N2 final semantic layer contains `missing`, `weak`, or `contradicted` slot status with refs/rationale. | `action_required`. | Stop current attempt and route only from typed actions and loopback hints. | Persist deterministic gate artifacts, mini-check items, issue/action codes, semantic slot refs, and diagnostics. | Replay includes N2 admitted final hash plus gate policy and mini-check rule versions. | No LLM/Codex decides how to route the semantic status. | N3 validates N2 structured slots deterministically and does not parse dossier prose for authority. |
| N3-04 | N3 | Prose conflict with semantic slots | N2 dossier prose or summary contradicts the admitted structured semantic layer or N1 frozen handoff. | `action_required`. | Stop before N4 and emit typed conflict action. | Persist conflict issue code, conflicting source refs, structured slot refs, and diagnostics. | Conflict result replays from the same N1/N2 final hashes and gate rules. | Codex diagnostic may explain the conflict only after deterministic output if profile allows. | Structured semantic slots and N1 frozen handoff are canonical over prose. |
| N3-05 | N3 | Carried blockers or recheck refs | N1/N2 carries blockers, accepted-risk obligations, or recheck refs that require action before human decision. | `action_required`. | Stop current attempt and open typed repair/recheck work with coarse resume entry. | Persist gate issue codes, carried blocker/recheck refs, required actions, lineage hashes, and diagnostics. | Same carried refs produce stable gate result; changed carried refs create a new attempt identity. | N3 core has no LLM/Codex execution. | N3 must not ignore, delete, weaken, or reinterpret carried blockers/rechecks. |
| N3-06 | N3 | Mini-check gaps | `ArgumentReadinessMiniCheck` detects missing claim ceiling, contribution summary, evaluation plan, selected evidence, accepted-risk visibility, or early-check obligations. | `action_required`. | Stop before N4 and route from typed `required_actions` and `loopback_hints`. | Persist mini-check items, blockers/warnings, required actions, source refs, and harness metadata. | Mini-check rules version participates in replay identity. | LLM/Codex cannot fill missing mini-check fields or decide readiness. | Mini-check determines readiness for human review only, not promotion. |
| N3-07 | N3 | Parked outcome | Materials are complete enough to classify, no deterministic repair/recheck action is appropriate, and a deterministic park marker applies. | `parked`. | Stop automation; do not invoke N4; resume only through explicit unpark/reopen/rerun/source-change event. | Persist park reason code, rationale, resume conditions, source refs, lineage hashes, and diagnostic metadata. | Parked result replays as parked; resume creates a new attempt. | Codex diagnostic runs for parked only in diagnostic/full profiles. | `parked` is not an automatic loopback and does not create decision or bridge authority. |
| N3-08 | N3 | Ready is not promote | N3 returns `ready_for_human_decision` on valid ready inputs. | `ready_for_human_decision`. | Invoke N4 only; do not invoke N5 and do not create bridge. | Persist gate and handoff artifacts only. | Replay returns the same ready handoff and must not create N4 artifacts by itself. | No LLM/Codex promotion authority. | N3 readiness authorizes human/delegated decision review only. |
| N3-09 | N3 | Malformed typed action | N3 produces or receives an `action_required` result missing valid `required_actions`, refs, loopback hints, or resume entry. | Malformed/blocked harness result. | Harness blocks before routing repair work or invoking any later node. | Persist contract-violation diagnostic when trustworthy context exists. | Same malformed gate result replays as malformed; corrected typed action payload creates a new attempt/result identity. | Codex diagnostic may identify missing action fields but cannot invent authority routing. | Harness must not infer action or resume target from prose or legacy dispositions. |
| N3-10 | N3 | Replay and drift | Same N1 snapshot hash, N2 admitted support/dossier refs and hashes, N2 final draft/admission hash, gate policy version, and mini-check rules version; or drift in one identity component. | Existing gate result for exact identity; new attempt or drift/conflict diagnostic for changed identity. | Exact replay does not re-run gate side effects; drift does not silently reuse old gate result. | No duplicate gate artifacts for the same gate run key; prior drifted results remain diagnostic readback. | N3 replay identity excludes N2 intermediate debate artifact hashes. | LLM/Codex diagnostics are excluded from N3 core replay identity. | Replay cannot hide source/support/policy/rule drift or mutate prior gate results. |
| N3-11 | N3 | Codex diagnostic adjunct | Deterministic N3 output is `action_required`; or deterministic output is `ready_for_human_decision`; or parked under diagnostic/full profile. | Original deterministic N3 outcome remains unchanged. | P0 runs Codex diagnostic only after `action_required`; does not run for `ready_for_human_decision`; parked diagnostic runs only in diagnostic/full profile. | Persist sanitized diagnostic summary, suspected causes, repair suggestions, tuning notes, referenced action codes, and confidence only where allowed. | Diagnostic output is not part of N3 core replay identity. | Codex diagnostic cannot change N3 outcome, routing, loopback, gate artifacts, or N4 eligibility. | LLM usage is diagnostic adjunct only and never gate authority. |

## N4 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N4-01 | N4 | Bridge-authorized happy path | Current N3 `ready_for_human_decision` handoff, matching snapshot/gate hashes, and valid human/delegated promote payload. | `bridge_authorized`. | Invoke only N5 bridge materialization next. | Write `PromotionDecision`, `PromotionCommitmentProfile`, N5 handoff refs, actor/delegation metadata, admission report, and harness metadata. | Same decision key returns existing decision/profile without duplicate writes. | Codex is not required; if present it must be explicitly authorized or diagnostic only. | N4 is the first node allowed to create `PromotionDecision`, but it does not create `PaperProjectBridge`. |
| N4-02 | N4 | Illegal N3 entry | Missing N3 handoff, stale gate ref, N3 `action_required`, N3 `parked`, or any outcome other than `ready_for_human_decision`. | Blocked/malformed diagnostic before decision authority. | Stop before decision persistence and do not invoke N5. | No `PromotionDecision`, `PromotionCommitmentProfile`, or bridge handoff is written. | Later valid N3 ready handoff creates a new attempt; invalid entry is not repaired by replay. | Codex cannot repair missing N3 authority. | N4 entry is authorized only by structured current N3 ready handoff and hashes. |
| N4-03 | N4 | Action-required decision | Human/delegated decision kind maps to refine, reassess, recheck, revise, or merge package action. | `action_required`. | Stop current attempt and route only from typed required actions and loopback hints. | Persist decision/action diagnostic or non-bridge decision record according to policy; do not write commitment profile or N5 handoff. | Same decision key replays the same action-required result; changed payload for same snapshot follows conflict policy. | Codex may assist only if explicitly delegated or as non-authority draft/diagnostic. | Rich decision labels remain record details; harness routes only from `action_required` plus typed actions. |
| N4-04 | N4 | Closed no auto progress | Human/delegated decision kind is `park` or `drop`. | `closed_no_auto_progress` with `closure_kind`. | Stop automation; `park` resumes only by explicit reopen/unpark/rerun, `drop` is terminal unless explicitly reopened. | Persist closed decision metadata and closure refs; no commitment profile, bridge handoff, or downstream artifact. | Closed result replays as closed; explicit reopen creates new attempt/supersede flow according to policy. | Codex cannot reopen or override closure without explicit delegation and admission. | Closure is not an automatic loopback and does not trigger N5. |
| N4-05 | N4 | Conditions are data | Human/delegated payload is `promote_with_conditions` with conditions, allowed refinements, accepted risks, or early-check obligations. | `bridge_authorized`. | Continue to N5 after commitment profile is admitted. | Persist conditions and obligations in `PromotionCommitmentProfile`; harness outcome remains `bridge_authorized`. | Same conditional decision key returns existing decision/profile. | LLM/Codex cannot convert conditions into a separate routing branch. | Conditions are data carried to N5, not harness branches or downstream commands. |
| N4-06 | N4 | Commitment projection admission | N3 ready handoff, N2 admitted semantic layer, and confirmed decision payload are present but commitment projection has missing required fields, conflicts, or forbidden authority fields. | Blocked diagnostic or `action_required` according to admission policy; no `bridge_authorized`. | Stop before N5. | Do not write admitted `PromotionCommitmentProfile` or N5 handoff on failed projection; persist sanitized admission diagnostics. | Projection hash participates in replay once admitted; failed projection cannot be reused as authority. | N4 must not call LLM to repair commitment fields. | Commitment profile is projected only from N3 ready handoff, N2 semantic layer, and confirmed payload. |
| N4-07 | N4 | Codex-delegated happy path | Valid explicit `codex_delegated` authorization envelope with accountable owner, allowed outcomes, N3 gate ref, snapshot hash, profile/policy refs, expiry, and schema version; Codex payload passes admission. | Authorized N4 outcome from the allowed set, including `bridge_authorized` when allowed. | Continue according to the admitted outcome; invoke N5 only for `bridge_authorized`. | Persist hybrid/delegated actor metadata, Codex provenance refs, decision/profile when authorized, and admission report. | Delegation envelope id/version, actor metadata, payload hash, and policy refs participate in replay identity. | Codex can submit structured decision payload only inside the valid delegation envelope. | Accountable human/delegated owner remains explicit; Codex does not become unscoped authority. |
| N4-08 | N4 | Codex-delegated rejection | Missing authorization, expired authorization, scope mismatch, snapshot/gate mismatch, disallowed outcome, or malformed Codex decision payload. | Blocked/malformed diagnostic before decision authority. | Stop before decision persistence and do not invoke N5. | No `PromotionDecision`, commitment profile, or bridge handoff is written; sanitized diagnostics may record rejection reason. | Same invalid delegation replays as rejected; corrected authorization/payload creates a new attempt identity. | Codex output is rejected unless envelope and admission both pass. | Delegation scope cannot be inferred from prose or prior drafts. |
| N4-09 | N4 | Codex draft non-authority | Codex draft rationale, conditions, risk reminders, commitment preview, or action hints exist but are not authorized/adopted as the N4 payload. | Harness outcome is determined only by the confirmed human/delegated or authorized Codex-delegated payload. | Drafts do not trigger N5 or repair routing. | Persist drafts only as diagnostic/support material where allowed; do not persist them as decision authority. | Draft hashes do not define current decision identity unless adopted into an admitted payload. | Codex draft is advisory only. | Unadopted Codex material cannot create decision, commitment, bridge, or loopback authority. |
| N4-10 | N4 | Replay and current decision idempotency | Same N4 decision key is repeated; or same promotion input snapshot receives a different current decision payload. | Same key returns existing records; different current payload returns `VERSION_CONFLICT`. | Exact replay does not re-run side effects; conflict stops before supersede. | No duplicate current `PromotionDecision` for one `promotion_input_snapshot_id`; no auto-supersede. | One current decision per snapshot is enforced; supersede/reopen requires explicit policy. | LLM/Codex cannot bypass current-decision conflict. | Current decision selection is deterministic and structured. |
| N4-11 | N4 | N4 does not create bridge | Any N4 outcome, including `bridge_authorized`. | N4 outcome only; bridge creation remains N5-owned. | `bridge_authorized` emits N5 handoff; it does not perform N5 work. | No `PaperProjectBridge`, PaperProject, PaperImplementation, WorkOrder, experiment, writing, or downstream artifact is written by N4. | Replay of N4 does not create bridge records. | Codex cannot create bridge through N4. | N4 authorizes bridge materialization only; N5 owns actual bridge persistence. |

## N5 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N5-01 | N5 | Bridge-ready happy path | Current N4 `bridge_authorized` handoff, promote-class current `PromotionDecision`, `bridge_eligible=true`, valid `PromotionCommitmentProfile`, matching snapshot/workspace hashes, and complete structured semantic fields. | `bridge_ready`. | Stop v1c P0 automation at bridge handoff; downstream intake may run only as optional compatibility smoke outside acceptance. | Write one active `PaperProjectBridge`, deterministic working-copy handoff, bridge payload hash, lineage refs, and harness metadata. | Same source promotion decision returns the existing bridge idempotently. | No LLM/Codex in default N5 path. | N5 creates bridge handoff only; it does not create PaperProject, PaperImplementation, WorkOrder, experiment, or writing artifacts. |
| N5-02 | N5 | Illegal N4 entry | Missing N4 handoff, stale decision, N4 `action_required`, N4 `closed_no_auto_progress`, or any outcome other than `bridge_authorized`. | Diagnostic `action_required` or blocked/malformed result before bridge authority. | Stop before bridge materialization. | No `PaperProjectBridge` or working-copy handoff is written; diagnostic may record invalid entry refs. | Later valid N4 handoff creates a new attempt; invalid entry does not replay into bridge creation. | Codex cannot repair missing N4 authority. | N5 entry is authorized only by current structured N4 `bridge_authorized` handoff. |
| N5-03 | N5 | Source, lineage, or workspace mismatch | Snapshot hash, source promotion decision hash, commitment profile hash, workspace, or lineage refs do not match N4/N3/N2/N1 handoff chain. | Diagnostic `action_required` or conflict before bridge persistence. | Stop before writing bridge. | No bridge record is written; diagnostics include mismatch codes, source refs, and lineage hashes. | Mismatch is not exact replay and must not reuse or create bridge authority. | LLM/Codex cannot explain away lineage mismatch into bridge creation. | Bridge materialization requires deterministic source lineage consistency. |
| N5-04 | N5 | Bridge eligible false | Current promote-class decision exists but `bridge_eligible=false`. | Diagnostic `action_required`. | Stop before bridge persistence and route from typed action data if provided. | No bridge record or working-copy handoff is written; diagnostics may record eligibility reason and refs. | Same ineligible decision replays as ineligible; eligibility change requires new admitted upstream/current state. | No LLM/Codex authority. | `bridge_eligible=false` cannot be overridden by conditions, prose, or diagnostic suggestions. |
| N5-05 | N5 | Missing or conflicting commitment profile | Commitment profile is missing, not current, not linked to the N4 decision, or conflicts with N2 semantic layer/N3 ready handoff/decision payload. | Diagnostic `action_required` or conflict before bridge persistence. | Stop before bridge materialization. | No bridge record is written; diagnostics may record missing/conflicting commitment refs and required action codes. | Corrected commitment profile creates a new N5 attempt identity; failed profile is not reusable authority. | N5 must not call LLM to repair commitment fields. | Commitment profile is required bridge input and cannot be inferred from decision prose. |
| N5-06 | N5 | Deterministic semantic projection | Valid commitment profile contains claim ceiling, prohibited claims, contribution summary, evaluation plan, selected evidence refs, conditions, accepted risks, allowed refinements, early-check obligations, and source snapshot excerpt. | `bridge_ready` when all other validations pass. | Deterministically project structured commitment fields into the working-copy payload. | Persist bridge and working-copy payload hashes derived from structured fields only. | Working-copy payload hash participates in bridge replay/idempotency. | No LLM/Codex field filling in default path. | N5 must not parse dossier markdown/free prose or resolve semantic conflicts. |
| N5-07 | N5 | Missing required semantic fields | Commitment profile lacks required structured fields such as claim ceiling, contribution summary, evaluation plan, selected evidence, accepted risks, conditions/obligations where required, or source lineage summary. | Diagnostic `action_required` before bridge persistence. | Stop before bridge materialization. | No bridge record is written; diagnostics include missing field codes and source refs. | Same missing-field input replays as failed; completed upstream commitment creates new attempt identity. | Codex diagnostics may explain missing fields only in explicit diagnostic profiles. | Missing bridge semantics are upstream contract failures, not N5 inference opportunities. |
| N5-08 | N5 | Replay and bridge idempotency | Same `source_promotion_decision_id` and identical source decision hash, commitment profile hash, snapshot hashes, working-copy payload hash, bridge policy version, and workspace; or drift in one identity component. | Existing `bridge_ready` result for exact identity; `VERSION_CONFLICT` or diagnostic for drift. | Exact replay returns existing bridge; drift stops before second bridge creation. | No second `PaperProjectBridge` for the same source promotion decision. | Source/hash/payload drift does not silently reuse prior bridge and does not auto-create a second bridge. | No LLM/Codex replay involvement. | Bridge idempotency is source-decision based and current-state sensitive. |
| N5-09 | N5 | No half-built bridge | Any validation, lineage, eligibility, semantic, persistence-admission, or projection failure. | Diagnostic `action_required`, conflict, or blocked result according to failure type. | Stop before bridge persistence; do not invoke downstream side effects. | Persist only diagnostic artifact/result metadata; never write blocked, partial, or `action_required` bridge records. | Failed attempts remain diagnostic readback and do not become reusable bridge inputs. | Codex diagnostics cannot convert failed attempts into bridge records. | Only valid active `PaperProjectBridge` records may be persisted as bridge authority. |
| N5-10 | N5 | No downstream side effect or LLM authority | Any N5 request, including `bridge_ready`, diagnostic failure, replay, or drift. | N5 outcome follows deterministic validation only. | Do not create or invoke PaperProject, PaperImplementation, WorkOrder, experiment, writing, or downstream intake as P0 acceptance. | Persist bridge only on `bridge_ready`; diagnostics only on failure; no downstream artifacts. | Replay of N5 does not trigger downstream creation or LLM work. | Codex is allowed only in explicit diagnostic/readability profiles and cannot alter bridge payload or state. | N5 P0 terminal boundary is the `PaperProjectBridge` handoff. |

## N6 Acceptance Rows
| ID | Node / Scope | Scenario | Input State | Expected Harness Outcome | Expected Automation | Expected Persistence | Replay / Idempotency Assertion | LLM / Codex Assertion | Boundary Assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N6-01 | N6 | Structured recheck happy path | Active trusted `PaperProjectBridge`, matching bridge/source hashes, structured feedback signal that maps to recheck, and non-empty structured required action. | `recheck_opened`. | Record feedback and open recheck/action projection; do not trigger N1-N5 automatically. | Persist feedback record, recheck projection refs, classification, loopback target/cause, required action codes, source refs, and harness metadata. | Same feedback fingerprint returns existing feedback/recheck records. | No Codex required for structured direct lane. | Recheck projection does not mutate bridge, promotion decision, commitment profile, topic package, or downstream state. |
| N6-02 | N6 | Structured no-recheck happy path | Active trusted bridge and structured feedback signal `no_recheck_needed` with valid source refs. | `feedback_recorded`. | Record feedback only and stop. | Persist feedback record and classification metadata; no recheck artifact is created. | Same feedback fingerprint returns existing feedback record. | No Codex required for structured direct lane. | No-recheck feedback cannot create loopback, bridge mutation, or upstream repair automatically. |
| N6-03 | N6 | Invalid bridge or source | Missing bridge, inactive bridge, stale bridge hash, bridge/source lineage mismatch, malformed source ref, or untrusted source payload. | `invalid_feedback`. | Stop before feedback/recheck projection. | No recheck is created; diagnostic may record invalid bridge/source codes and refs. | Same invalid fingerprint replays as invalid; corrected bridge/source identity creates a new attempt. | Codex cannot repair invalid bridge/source identity into authority. | N6 requires an active trusted bridge and matching lineage. |
| N6-04 | N6 | Unsupported or underspecified signal | Feedback signal is absent, unsupported by the fixed policy table, or too underspecified to classify deterministically. | `invalid_feedback`. | Stop before recheck creation. | Persist invalid-feedback diagnostic only where trustworthy context exists. | Same unsupported payload returns existing invalid result; explicit policy extension/version creates new identity. | Codex normalization cannot introduce unsupported signals into accepted output. | Classification policy is fixed in P0 unless explicitly extended. |
| N6-05 | N6 | Missing required action | Feedback signal maps to a recheck-producing classification but lacks a non-empty structured required action. | `invalid_feedback`. | Stop before recheck creation. | Persist invalid-feedback diagnostic with missing-action code; no recheck artifact. | Same malformed payload replays as invalid; corrected required action creates new feedback fingerprint. | Codex normalization must supply required action for recheck-producing signals or be rejected. | Harness must not infer required action from prose. |
| N6-06 | N6 | Deterministic classification mapping | Structured feedback signals such as `stale_evidence`, `overclaim`, `unanswerable_question`, `boundary_drift`, `need_invalidated`, `package_narrative_gap`, or `commitment_gap` are supplied with valid refs/actions. | `recheck_opened` or `feedback_recorded` according to fixed mapping. | Route from deterministic loopback target/cause and required action refs; stop after recording. | Persist classification, loopback target/cause, recheck refs where applicable, source refs, and bridge lineage hashes. | Classification policy/version participates in replay identity when versioned. | Source kind does not change classification; Codex does not decide final mapping. | Source kind is provenance only and must not become a harness branch. |
| N6-07 | N6 | Codex normalization happy path | Semi-structured feedback text with valid source refs and active bridge; Codex normalization profile enabled. | Deterministic outcome from admitted structured candidate: `recheck_opened` or `feedback_recorded`. | Codex normalizes candidate, deterministic admission/classification runs, then harness records outcome and stops. | Persist admitted structured feedback hash, Codex normalization profile/version, provenance refs, classification, and sanitized diagnostics. | Codex normalization profile/version and admitted structured feedback hash participate in feedback fingerprint. | Codex is a semantic parser/normalizer only. | Final routing and recheck creation remain deterministic after admission. |
| N6-08 | N6 | Codex normalization rejection | Codex candidate invents refs, includes forbidden downstream mutation commands, emits unsupported signal, misses required action, fails redaction/size checks, or mismatches bridge/source refs. | `invalid_feedback` or blocked diagnostic before recheck creation. | Stop after rejection; do not create recheck. | Persist sanitized rejection diagnostics and candidate hash if allowed; do not persist raw Codex output as authority. | Same rejected candidate/fingerprint replays as rejected; corrected candidate creates new identity. | Codex output is rejected unless it passes deterministic admission. | Codex cannot create recheck artifacts directly or override fixed classification. |
| N6-09 | N6 | Replay and feedback fingerprint | Same bridge id/hash, downstream source ref, feedback signal, severity, required action, source feedback refs, payload hash, Codex normalization profile/version when used, and admitted structured feedback hash; or drift in one identity component. | Existing feedback/recheck result for exact fingerprint; `invalid_feedback`, conflict, or new attempt according to drift policy. | Exact replay does not duplicate feedback/recheck records; drift does not silently reuse old records. | No duplicate feedback/recheck for the same fingerprint. | Bridge hash/source drift is not exact replay and must be invalid/conflict handled. | LLM/Codex is not re-invoked for exact replay. | Feedback identity is structured and lineage-bound. |
| N6-10 | N6 | No upstream mutation or automatic loop | Any `recheck_opened` outcome. | `recheck_opened`. | Open recheck/action projection and stop; do not automatically trigger N1, N2, N3, N4, or N5. | Feedback/recheck records only; bridge, promotion decision, commitment profile, topic package, PaperProject, and PaperImplementation remain unchanged. | Recheck completion, if any, must create an explicit new attempt according to resume policy. | Codex cannot execute upstream repair. | v1c has no v1b-style automatic feedback loop. |
| N6-11 | N6 | Diagnostic persistence boundary | Any direct structured or Codex-normalized N6 attempt, successful, invalid, replayed, or drifted. | Outcome remains one of `recheck_opened`, `feedback_recorded`, or `invalid_feedback`. | Continue no further than feedback/recheck recording. | Persist feedback fingerprint, admitted structured hash, classification, loopback target/cause, required action codes, source refs, bridge lineage hashes, recheck refs, Codex provenance hash when used, and sanitized diagnostics only. | Diagnostics support replay/debug but are not downstream authority. | Raw Codex output, hidden reasoning, and downstream mutation commands are not persisted as authority. | Diagnostics exist for harness robustness and LLM/operator repair, not audit/compliance or downstream workflow surfaces. |
