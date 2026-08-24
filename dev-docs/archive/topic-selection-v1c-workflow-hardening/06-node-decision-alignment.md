# Node Decision Alignment

## Purpose
Record T-108 decision alignment before defining the acceptance matrix. This file follows the v1a and T-107 pattern: lock node semantics first, then derive tests.

## D1 Boundary
- Status: confirmed.
- T-108 P0 scope is v1c WorkflowHarness hardening, node orchestration robustness, automation, and Codex/provider landing for v1c advisory support.
- Scope starts from frozen `TopicSelectionV1bToV1cInputBundle`.
- Scope covers:
  - promotion input snapshot;
  - promotion support and dossier;
  - deterministic promotion gate;
  - human promotion decision;
  - promotion commitment profile projection;
  - `PaperProjectBridge`;
  - v1c downstream feedback/recheck.
- Scope excludes:
  - PaperImplementation bootstrap;
  - `ImplementationProject`;
  - WorkOrder, experiment, writing, and PaperImplementation harness flows;
  - PaperProject/PaperImplementation intake or consumption as a P0 acceptance boundary.
- Optional compatibility smoke may exercise existing downstream intake routes after v1c node acceptance, but it must not substitute for v1c harness or node-policy evidence.

## Cross-Node Harness Contract
- Status: confirmed.
- T-108 optimizes the harness-facing surface for routing robustness. It does not expose every domain-specific internal status as an orchestration branch.

Rules:
- Each node exposes a small, stable set of harness routing outcomes.
- Detailed domain status, legacy disposition, source kind, decision kind, cause, or severity remains persisted as record/diagnostic metadata.
- Harness orchestration routes from routing outcome plus typed `required_actions`, `loopback_hints`, source refs, and hashes.
- If a non-ready/non-success outcome lacks valid typed actions where routing is expected, the harness treats the result as malformed and blocks before routing.
- Codex/provider outputs must normalize into the same structured contracts before they can influence routing; raw prose, hidden reasoning, raw provider logs, and unadmitted drafts never become harness authority.
- Diagnostics are persisted to improve harness robustness and LLM/operator repair, not to create audit/compliance or product workflow surfaces.

Node outcome summary:
| Node | Harness-facing outcomes |
| --- | --- |
| N1 `create-promotion-input-snapshot` | `ready_for_gate`, diagnostic non-ready states such as blocked/refresh/superseded; only `ready_for_gate` invokes N2. |
| N2 `generate-promotion-support` | admitted support/dossier handoff or blocked diagnostic result; only admitted `synthesizer.final` invokes N3. |
| N3 `run-promotion-gate` | `ready_for_human_decision`, `action_required`, `parked`. |
| N4 `record-human-promotion-decision` | `bridge_authorized`, `action_required`, `closed_no_auto_progress`. |
| N5 `create-paper-project-bridge` | `bridge_ready`, diagnostic `action_required`; only `bridge_ready` persists an active bridge. |
| N6 `record-downstream-feedback-recheck` | `recheck_opened`, `feedback_recorded`, `invalid_feedback`. |

### Cross-Node Nonlinear Strategy
Status: confirmed for acceptance-matrix drafting.

v1c is a forward-only workflow. It must not recreate the v1b N6-N8 style automatic loop. Nonlinear behavior exists only as explicit typed repair/recheck work that stops the current attempt and later resumes through a new attempt.

Main chain:
- `N1 -> N2 -> N3 -> N4 -> N5`.
- N6 is bridge-after feedback/recheck ingress, not an automatic loop driver.

Rules:
- A current attempt MUST only move forward through legal handoffs.
- A node MUST NOT automatically jump back to an earlier node.
- A node MUST NOT mutate an upstream node result to recover.
- Fallback to old logic, alternate profiles, or deterministic rescue paths is disabled by default and MAY run only under an explicit approved fallback policy.
- Recoverable non-success outcomes MUST stop automation and emit typed `required_actions`, `affected_refs`, lineage/hash data, and a `resume_entry` or equivalent resume hint.
- Repair/recheck completion MUST create a new attempt; old results remain immutable diagnostic readback.
- N6 `recheck_opened` records feedback and opens a recheck/action projection only. It MUST NOT execute upstream repair, mutate bridge/promotion/package state, or automatically trigger N1-N5.

Harness resume entries should stay coarse:
| Resume entry | Meaning |
| --- | --- |
| `N1` | Re-enter from a newly frozen source bundle or package change. |
| `N2_WITH_EXISTING_N1` | Re-run support generation against the same trusted N1 snapshot. |
| `N3_WITH_EXISTING_N1_N2` | Re-run the gate with the same trusted N1 and admitted N2 inputs, usually after gate policy or mini-check rule change. |
| `N4_WITH_EXISTING_N3` | Re-submit or correct human/delegated decision payload against the same current N3 ready handoff. |
| `N5_WITH_EXISTING_N4` | Re-run bridge materialization against the same current N4 `bridge_authorized` decision. |
| `MANUAL_REOPEN_REQUIRED` | Stop until an explicit unpark/reopen/supersede decision exists. |

Internal mechanics:
- Retry is same-node, same-input, same-profile transient recovery with a strict limit. It does not change the workflow graph or create a new attempt.
- Replay returns an existing result for the same replay key. It does not change the workflow graph or create new authority writes.
- Version conflict, drift, malformed typed action, or missing resume hint stops automation before routing.

### Acceptance Matrix Dimensions
Status: confirmed as the first-level coverage model. The detailed matrix shape and rows live in `07-acceptance-matrix.md`.

The acceptance matrix should use these dimensions as the first-level coverage model. Rows should still be written by node/scenario rather than expanding every dimension into a full Cartesian product.

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

## N1 `topic-selection.v1c.create-promotion-input-snapshot.v1`

### Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N1-D1 | Node role | Deterministic v1c entry node that freezes a v1b-to-v1c bundle into `PromotionInputSnapshot`. | confirmed |
| N1-D2 | Input authority | Consume only frozen `TopicSelectionV1bToV1cInputBundle` refs/hashes and package/readiness refs. Do not re-read mutable v1b live state to repair input. | confirmed |
| N1-D3 | Harness callability | Provide a normalized harness runner/input/result for success and blocked paths; avoid script-owned route choreography. | confirmed |
| N1-D4 | LLM/Codex/provider | Not allowed. `execution_mode=none`; no model profile, prompt, provider params, Codex assistance, or debate. | confirmed |
| N1-D5 | Freshness and drift | Persist diagnostically useful non-ready states only when a trustworthy frozen bundle can be evaluated; fail before persistence for malformed request, missing bundle, workspace drift, or no trustworthy snapshot context. | confirmed |
| N1-D6 | Authority write boundary | Authority writes go through `TopicSelectionV1cPromotionInputService` and repository only; harness coordinates and asserts. | confirmed |
| N1-D7 | Handoff | Emit a gate-ready handoff only when snapshot status is `ready_for_gate`; blocked or refresh-needed snapshots do not emit N2 handoff. | confirmed |
| N1-D8 | Replay and idempotency | Ready snapshots support strict exact replay; blocked diagnostics are append-only per attempt. Domain idempotency still returns the existing snapshot for the same current bundle/hash and conflicts on same bundle id with changed hash. | confirmed |
| N1-D9 | Warning/blocker propagation | Carry accepted risks, blockers, memory suggestions, recheck refs, package trace issues, and evidence refs into the snapshot without rewriting them. | confirmed |
| N1-D10 | Artifact and audit policy | Harness result records normalized input/result, authority refs, snapshot hash, blocker/warning codes, source refs, and trace/audit refs; it must not record hidden reasoning, provider logs, raw LLM output, or downstream implementation payloads. | confirmed |
| N1-D11 | Persisted diagnostic consumption | Persisted non-ready snapshots have only two first-class consumers: N2 readiness handoff gating and harness/operator/LLM diagnostic readback for repair and chain tuning. They must not create a new product workflow surface. | confirmed |
| N1-D12 | Harness contract location | N1 uses the unified future `topic-selection-v1c-workflow-harness-contracts` package with the rest of v1c nodes; no node-local private contract. | confirmed |

### Persisted Snapshot Consumption
N1 persistence should stay boring and diagnostic. The durable snapshot is useful only when it helps the next node block correctly or helps an operator/LLM diagnose why automation stopped.

Allowed consumption surfaces:
- N2 gate-support handoff: only `closure_status=ready_for_gate` can produce `PromotionInputSnapshotHandoff`; all other statuses block before N2.
- Harness/operator/LLM diagnostic readback: inspect `closure_status`, `stop_condition_code`, `required_actions`, `blockers`, `warnings`, `check_details`, source refs, and snapshot hashes to decide whether to repair upstream v1b input, rerun the harness, or tune node orchestration.

Forbidden expansion:
- Do not add a separate remediation workflow owned by N1.
- Do not let blocked snapshots become alternate promotion inputs.
- Do not let LLMs mutate snapshot records directly.
- Do not create PaperProject/PaperImplementation intake from N1 data.

Persistence rule:
- Persist diagnostically useful non-ready states such as `blocked`, `needs_upstream_refresh`, and `superseded` when a concrete source bundle can be loaded and evaluated.
- Fail before persistence for malformed request envelopes, missing source bundle, workspace drift, or other cases where there is no trustworthy frozen bundle context to snapshot.

### Replay And Idempotency Vocabulary
`Replay` answers: "Is this the same harness attempt over the same frozen input?"

The useful property is automation safety. If `workflow_run_id + node_attempt_id + input_hash` is identical, the harness should be able to return the prior node result without re-running validation or writing authority again. If that identity changes, the harness must treat it as a new attempt or block with drift.

`Idempotency` answers: "If the caller repeats the same domain command, do we avoid duplicate authority?"

For N1, domain idempotency is keyed by the source bundle uniqueness and bundle hash: the same current `TopicSelectionV1bToV1cInputBundle` returns the existing `PromotionInputSnapshot`. If the bundle id exists with a different hash, that is a conflict, not a second snapshot.

Recommended split:
- Harness replay identity: `workflow_run_id + node_attempt_id + input_hash`.
- Domain idempotency identity: `v1b_to_v1c_input_bundle_id + bundle_hash`.
- Replay must not replace domain idempotency, and idempotency must not hide replay drift.

Replay scope:
- `ready_for_gate` snapshots support strict exact replay because they are allowed to feed N2 and must be stable.
- blocked, superseded, and refresh-needed diagnostics are append-only per harness attempt because their purpose is diagnosis and chain tuning, not reusable promotion input.
- repeated domain calls for the same current bundle/hash still return the existing snapshot idempotently; this is domain idempotency, not harness replay.

### Open Questions
- None for N1.

## N2 `topic-selection.v1c.generate-promotion-support.v1`

### Current Implementation Note
The product implementation now exposes the N2/N3 split directly:
- `createPromotionDecisionSupport` creates N2 support/dossier artifacts only.
- `createPromotionGateCheckFromSupport` consumes persisted N2 support and creates N3 mini-check/gate artifacts only.
- `createPromotionGateSupport` remains only as a compatibility wrapper for callers that still need the old combined path.

T-108 node alignment separates node semantics:
- N2 owns advisory promotion support and dossier generation.
- N3 owns deterministic promotion gate evaluation.

The harness contract must use the split N2/N3 path unless a test is explicitly exercising compatibility behavior.

### Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N2-D1 | Node role | Advisory support-generation node that consumes only a `ready_for_gate` `PromotionInputSnapshotHandoff` and produces `PromotionDecisionSupport` plus `PromotionDossier` artifacts/read models. | confirmed |
| N2-D2 | Authority boundary | N2 writes support/dossier artifacts only. It must not decide gate disposition, authorize promotion, create `PromotionDecision`, create `PaperProjectBridge`, or mutate the source snapshot/package. | confirmed |
| N2-D3 | N2/N3 split | Treat N2 and N3 as separate harness nodes. N2 output feeds N3; N3 owns `ArgumentReadinessMiniCheck` and deterministic gate evaluation. | confirmed |
| N2-D4 | Input authority | N2 consumes N1 handoff and snapshot hashes only. It must not re-read mutable v1b package state to improve support text. | confirmed |
| N2-D5 | LLM/Codex/provider allowance | N2 is the only v1c node where Codex/provider LLM is allowed by default, and only for advisory support drafts. `deterministic` remains the no-LLM quick-smoke mode. The LLM-enabled baseline is fixed bounded micro-debate; no Codex single-agent control lane is required for T-108 acceptance. | confirmed |
| N2-D6 | Model/profile contract | Harness passes stable profile ids, not raw provider/model params in business logic. P0 baseline profile is `topic-selection.v1c.promotion-support.bounded-micro-debate.codex.v1`, with all four bounded slots defaulting to `codex_assisted`. Provider-backed slots require explicit profile/canary selection, and resolved profile metadata is persisted diagnostically. | confirmed |
| N2-D7 | Prompt/context packet | N2 consumes only a frozen, redacted `PromotionSupportContextPacket` derived from the N1 handoff. The packet carries allowed refs, snapshot hashes, claim ceiling, contribution summary, evaluation plan, selected evidence refs, accepted risks, blocker refs, and recheck refs. N2 must not re-read mutable v1b/package state. Prompts forbid promotion authorization, gate disposition, bridge/downstream mutation, hidden reasoning, and raw provider logs. | confirmed |
| N2-D8 | Output contract | Codex-assisted and provider LLM modes use the same structured advisory draft contract. The admitted final output must include N3-readable semantic slots plus reviewer-facing summary/questions/notes/dossier prose. It must not include gate disposition, human decision, bridge fields, or downstream refs as commands. Provenance differs only in execution metadata. | confirmed |
| N2-D9 | Admission | All four LLM/Codex calls must pass per-call diagnostic admission: envelope match, schema validation, source-ref validation, snapshot/context hash matching, forbidden-field checks, redaction/size checks, and explicit failure/fallback policy checks. Only `synthesizer.final` can pass final admission into the N2 advisory output contract. | confirmed |
| N2-D10 | Failure semantics | Deterministic mode has no model failure. Transport/timeout failures get at most one same-input same-profile retry. Schema parse failures, forbidden fields, invented refs, or failed final admission block N2 and do not trigger N3. Deterministic fallback is allowed only when the harness request explicitly sets an approved fallback policy, and fallback must never weaken N3 gates. | confirmed |
| N2-D11 | Replay and idempotency | Replay identity includes N1 snapshot hash, context packet hash, bounded profile id/version, prompt template version, four structured call output hashes, and final admitted draft hash. Same support run key returns existing support/dossier without LLM re-invocation. Hash/profile/prompt drift creates a new attempt; prior results remain diagnostic readback only. | confirmed |
| N2-D12 | Diagnostics and tuning | Persist only diagnostic/tuning artifacts: context packet hash, prompt/profile refs, per-call structured artifact hashes, admission reports, warning/blocker codes, critic-finding resolution map, and sanitized telemetry. The goal is harness robustness and LLM diagnosis/repair, not audit/compliance or a new product workflow surface. | confirmed |
| N2-D13 | Debate profile ladder | Reuse the existing v1a/v1b debate ladder and add a smaller bounded tier for v1c N2 acceptance. The LLM-enabled T-108 baseline uses the new bounded micro-debate tier; existing compact/mixed-cost and provider-diverse-deep tiers remain explicit compatibility/escalation profiles. T-108 acceptance validates the bounded tier directly rather than maintaining a Codex single-agent comparison lane. | confirmed |
| N2-D14 | Bounded micro-debate calls | The bounded tier uses exactly four fixed LLM calls: supporter draft, critic review, supporter targeted repair/rebuttal, and synthesizer final advisory draft. All four calls are Codex-eligible in the P0 baseline; provider-backed calls require an explicit profile/canary and must keep the same role/output contracts. | confirmed |
| N2-D15 | Invocation artifact consumption | Intermediate call artifacts may be persisted only as diagnostic invocation artifacts for harness chain tuning and LLM problem discovery. Only `synthesizer.final` may be admitted into the N2 advisory output contract consumed by N3. Raw transcripts, hidden reasoning, provider logs, and audit-oriented review records are out of scope. | confirmed |

### LLM-Enabled Baseline
Decision: confirmed. N2 LLM-enabled acceptance should start from bounded micro-debate rather than treating debate as a dynamic optional trigger.

Debate profile ladder:
- `bounded-micro-debate`: new v1c N2 acceptance baseline tier;
- existing compact/mixed-cost tier from v1a/v1b: compatibility/escalation profile, not the T-108 baseline;
- existing provider-diverse-deep tier from v1a/v1b: explicit quality/canary profile only.

Baseline tier:
- bounded micro-debate, added on top of the existing v1a/v1b debate profile tiers;
- fixed small role set;
- fixed four-call orchestration unless a later explicit policy expands it;
- output normalized into the same advisory support draft contract used by all N2 modes.

Fixed call sequence:
1. `promotion_supporter.draft`: write the strongest reviewer-facing support case from the frozen N1 handoff.
2. `reviewer_critic.review`: search for overclaim, evidence weakness, evaluation-plan gaps, claim-ceiling drift, and accepted-risk concerns.
3. `promotion_supporter.repair`: perform targeted repair or rebuttal against each critic finding without broad re-generation.
4. `synthesizer.final`: produce the final advisory draft in the shared N2 output contract, including a critic-finding resolution map.

N2 final semantic layer:
- `synthesizer.final` must expose structured semantic slots for N3 deterministic validation, not only prose or dossier markdown.
- Required slots: `claim_ceiling_alignment`, `contribution_summary`, `evaluation_plan_summary`, `evidence_support_map`, `accepted_risk_acknowledgements`, `recheck_obligation_summary`, `critic_finding_resolution_map`, and `readiness_coverage_items`.
- Each slot carries `status`, `refs`, `rationale`, and optional `required_action_hint`.
- Allowed statuses are `addressed`, `missing`, `weak`, and `contradicted`.
- Reviewer-facing prose may summarize these slots, but N3 reads the structured layer; if prose conflicts with the structured layer, N3 treats the conflict as an `action_required` issue.

Execution profile:
- P0 baseline may run all four calls as `codex_assisted`.
- Provider-backed calls are allowed only through explicit profile/canary selection.
- Codex and provider slots must use the same role contracts, context packet, and structured output/admission path.

Profile, context packet, and replay:
- P0 baseline profile id: `topic-selection.v1c.promotion-support.bounded-micro-debate.codex.v1`.
- Business logic receives resolved execution/profile metadata from the harness contract; it does not embed raw provider/model params.
- `PromotionSupportContextPacket` is derived only from the N1 frozen handoff and includes allowed refs, snapshot hashes, claim ceiling, contribution summary, evaluation plan, selected evidence refs, accepted risks, blocker refs, and recheck refs.
- N2 may not re-read mutable v1b package state to fill gaps or improve support prose.
- Replay identity includes N1 snapshot hash, context packet hash, bounded profile id/version, prompt template version, four structured call output hashes, and the admitted final draft hash.
- Same support run key returns existing support/dossier idempotently without re-invoking Codex/provider.
- Hash, profile, or prompt drift creates a new attempt; prior results remain diagnostic readback only.

Diagnostic persistence:
- Persist per-call normalized artifacts, artifact hashes, admission results, blocker/warning codes, critic findings, resolution map, prompt/profile refs, context packet hash, and sanitized telemetry.
- Use persisted artifacts to make harness replay/idempotency more robust and to let an LLM diagnose malformed outputs, weak role behavior, missing refs, or chain-tuning issues.
- Do not treat persisted debate artifacts as audit/compliance evidence or as a product-facing review surface.
- Do not persist hidden reasoning, raw provider logs, secrets, or unredacted raw transcripts.
- Only `synthesizer.final` can enter the N2 advisory output contract consumed by N3; earlier role artifacts remain diagnostic invocation artifacts.

Admission and failure semantics:
- Per-call admission validates `role_slot`, `call_index`, `support_run_key`, `context_packet_hash`, `promotion_input_snapshot_hash`, prompt template refs, and profile/model refs before the next call runs.
- Per-call schema admission requires structured JSON for every role output; free-form prose can exist only inside allowed structured fields.
- Source refs must be drawn from the N1-derived context packet allowlist. Invented evidence, package, recheck, bridge, or downstream refs are blocking admission failures.
- Forbidden fields are hard failures for every call: gate disposition, `promote_allowed`, human promotion decision, `PaperProjectBridge`, PaperImplementation, WorkOrder, experiment, writing, or downstream mutation commands.
- Final admission requires `synthesizer.final` to provide non-empty support summary, structured reviewer questions/risk notes/recheck notes, dossier prose or sections, and a critic-finding resolution map covering every critic finding.
- Critic finding resolutions are limited to `accepted_and_repaired`, `accepted_as_risk`, and `rebutted_with_refs`. Rebuttals without source refs or adequate rationale fail final admission.
- Accepted risks, blocker refs, and recheck refs carried from N1 must be preserved and explained; the final draft may not delete, weaken, or rewrite them.
- Transport, timeout, or Codex invocation failure may retry once with the same input, profile, and prompt refs. A second failure blocks N2.
- Intermediate call admission failure stops the remaining calls. Final admission failure writes diagnostics only, does not write N2 advisory output, and does not invoke N3.

Minimum diagnostic artifact contract:
- `PromotionSupportInvocationArtifact` should remain diagnostic-only.
- Fields: `role_slot`, `call_index`, `context_packet_hash`, `prompt_template_ref`, `profile_ref`, `structured_output_hash`, `admission_status`, `admission_report`, `warning_codes`, `blocker_codes`, `source_refs`, and `sanitized_telemetry`.
- The business output remains the admitted `synthesizer.final` result plus generated support/dossier records.

Comparison boundary:
- No Codex single-agent control lane is required for T-108 acceptance.
- Single-agent support may remain a future diagnostic or manual comparison profile, but it is not part of the P0 acceptance baseline.

Acceptance signals:
- admitted structured output on first pass;
- explicit critic findings and complete resolution map;
- no missed-risk or one-sided-support findings in curated fixtures;
- N3 `ArgumentReadinessMiniCheck` and gate effects;
- retries, malformed outputs, and fallback/blocking frequency;
- latency and provider/Codex cost;
- human-review readability and usefulness.

Boundary:
- No role may output gate disposition, human decision, bridge fields, or downstream mutation commands.
- Debate output remains advisory and non-authority.
- Deterministic quick smoke remains available as a no-LLM harness mode, but it is not the LLM-enabled baseline.

### N3-Owned `ArgumentReadinessMiniCheck` Role
Decision: confirmed. `ArgumentReadinessMiniCheck` belongs to N3 `topic-selection.v1c.run-promotion-gate.v1`, not N2.

`ArgumentReadinessMiniCheck` is a deterministic promotion-readiness checklist over the frozen N1 handoff plus N2 support/dossier lineage. It should answer whether the package is complete enough to be presented for a human promotion decision, not whether it should be promoted.

Current core checks include:
- claim ceiling visibility;
- contribution summary visibility;
- evaluation plan visibility;
- selected evidence visibility;
- accepted-risk visibility;
- early-check obligations from carried recheck refs.

Outputs:
- `check_items`;
- `blockers`;
- `warnings`;
- `required_actions`;
- `early_check_obligations`.

Gate effect:
- lineage or carried blocker issues make N3 `blocked`;
- carried recheck refs make N3 `recheck_required`;
- mini-check required actions make N3 `needs_revision`;
- no blockers/rechecks/required actions lets N3 return `ready_for_human_decision`.

Boundary:
- It must be deterministic.
- It must not call Codex/provider.
- It must not author promotion support prose.
- It must not authorize promotion.
- It should consume N2 support/dossier lineage only to verify completeness and consistency, not to accept advisory prose as authority.

### N3 Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N3-D1 | Node role | Deterministic promotion gate node that consumes N1 frozen handoff plus admitted N2 support/dossier lineage, creates `ArgumentReadinessMiniCheck`, `PromotionGateCheck`, and the N4 human-decision handoff when eligible. | confirmed |
| N3-D2 | LLM boundary | N3 core has no Codex/provider execution path. It may read N2 diagnostic refs for lineage, but never asks an LLM to decide readiness, routing outcome, loopback, or promotion. A separate harness diagnostic adjunct may use LLM after deterministic N3 output, but it cannot change gate authority. | confirmed |
| N3-D3 | Authority boundary | N3 decides only whether the package is ready for a human promotion decision. `ready_for_human_decision` authorizes invoking the human/delegated decision node; it is not a promote decision and must not create `PromotionDecision` or `PaperProjectBridge`. | confirmed |
| N3-D4 | Input authority | N3 consumes N1 handoff hashes plus the admitted N2 final support/dossier records. Intermediate debate artifacts are diagnostic only and must not be treated as gate authority. Hash, source-ref, or lineage drift blocks or produces a typed lineage failure. | confirmed |
| N3-D5 | Mini-check scope | `ArgumentReadinessMiniCheck` verifies completeness and consistency for human promotion review: claim ceiling, contribution summary, evaluation plan, selected evidence, accepted-risk visibility, carried blockers, carried rechecks, and early-check obligations. | proposed |
| N3-D6 | Harness routing outcomes | Harness-facing N3 contract exposes only three routing outcomes: `ready_for_human_decision`, `action_required`, and `parked`. Legacy fine-grained dispositions may remain internal/compatibility diagnostics, but harness orchestration routes only from the three outcomes plus typed actions. | confirmed |
| N3-D7 | Loopback contract | Every non-ready routing outcome must emit typed `required_actions` and `loopback_hints` with stable action codes, loopback targets, and refs. Harness consumers should route from these fields, not parse prose or legacy fine-grained disposition names. | confirmed |
| N3-D8 | Replay and idempotency | Replay identity includes N1 snapshot hash, N2 admitted support/dossier refs and hashes, N2 final draft/admission hash, gate policy version, and mini-check rules version. Same gate run key returns the same gate artifacts; drift creates a new attempt. N2 intermediate debate artifact hashes are diagnostic only and excluded from N3 core identity. | confirmed |
| N3-D9 | Failure semantics | If no trustworthy N1/N2 lineage exists, fail before writing gate authority. If trustworthy lineage exists but completeness checks fail, persist deterministic gate artifacts with `action_required` plus typed blockers/actions for harness and LLM diagnosis. | confirmed |
| N3-D10 | Diagnostic persistence | Persist gate issue codes, check items, required actions, loopback hints, source refs, lineage hashes, and harness result metadata to improve chain robustness and LLM diagnosis. Do not persist raw N2 transcripts or treat gate diagnostics as audit/compliance artifacts. | proposed |
| N3-D11 | LLM diagnostic adjunct | Optional LLM usage belongs outside N3 gate authority as a harness diagnostic helper over sanitized N3 artifacts. Default diagnostic executor may be `codex_assisted`. P0 runs it after `action_required`; `ready_for_human_decision` does not run it; `parked` runs it only in diagnostic/full profiles. It can explain failures, cluster recurring issue codes, suggest prompt/profile/harness tuning, or draft repair guidance, but must not write gate results, change routing outcomes, create loopbacks, or become part of N3 replay identity. | confirmed |
| N3-D12 | N2 semantic validation | N3 consumes the admitted N2 final structured semantic layer and validates it deterministically. N3 must not parse free-form prose for authority. It checks slot presence/status, allowed refs, preservation of accepted risks/blockers/rechecks, critic resolution coverage, and conflicts with N1 frozen handoff. Semantic gaps or contradictions produce `action_required`. | confirmed |

### N3 Harness Routing Model
Decision: confirmed. The harness-facing contract should prefer robustness over fine-grained top-level state and expose only three routing outcomes.

Routing outcomes:
- `ready_for_human_decision`: the only outcome that authorizes harness invocation of N4 human/delegated promotion decision. It is not a promote decision.
- `action_required`: covers blocker, recheck, revision, lineage-completeness, or mini-check failures. Specific routing comes from typed `required_actions`, `loopback_hints`, issue codes, and refs.
- `parked`: stop current automatic progression when the package is complete enough to classify but not actionable for revision/recheck/promotion.

Deterministic routing order:
1. untrusted lineage or no trustworthy N1/N2 context: fail before writing gate authority;
2. trustworthy lineage with blockers, carried rechecks, mini-check gaps, or required repair: `action_required`;
3. no required actions but deterministic park marker: `parked`;
4. otherwise `ready_for_human_decision`.

Compatibility boundary:
- Existing internal dispositions such as `blocked`, `recheck_required`, `needs_revision`, and `park` may remain as persisted compatibility details.
- Harness orchestration must not branch on those legacy values. It branches on the three routing outcomes and typed actions only.
- `ready_for_human_decision` authorizes only the next human/delegated decision node; it does not promote, create `PromotionDecision`, create `PaperProjectBridge`, or mutate downstream state.

Harness actions:
- `ready_for_human_decision`: invoke N4. N4 owns promote/reject/conditional decision authority.
- `action_required`: follow typed `required_actions` and `loopback_hints`. If no valid typed action is present, treat the gate result as malformed and block before routing.
- `parked`: stop automatic progression. Do not invoke N4, create `PromotionDecision`, create `PaperProjectBridge`, or automatically loop back to N1/N2.

Parked recovery:
- `parked` must include `park_reason_code`, `park_rationale`, `resume_conditions`, source refs, and lineage hashes.
- Resume requires an explicit event: human/operator unpark, upstream package change that produces a new frozen handoff, explicit policy/profile rerun, or an external condition becoming true.
- Resume creates a new attempt. The old parked result remains diagnostic readback and must not be mutated in place.
- Use `parked` narrowly: only when materials are complete enough to classify but no deterministic repair/recheck action should be routed. Otherwise use `action_required`.

N2 semantic validation:
- N3 reads the admitted N2 final structured semantic layer: claim ceiling alignment, contribution summary, evaluation plan summary, evidence support map, accepted-risk acknowledgements, recheck obligation summary, critic finding resolution map, and readiness coverage items.
- N3 validates presence, status values, source refs, preservation of N1 carried risks/blockers/rechecks, critic resolution coverage, and consistency with the frozen N1 handoff.
- N3 does not infer gate authority from free-form `summary`, `risk_notes`, or dossier markdown. Those prose fields support human readability only.
- If prose and structured semantic slots conflict, the structured slot is canonical and the conflict produces `action_required`.

Replay key:
- Include N1 snapshot hash, N2 admitted support/dossier refs and hashes, N2 final draft/admission hash, gate policy version, and mini-check rules version.
- Exclude N2 intermediate debate artifact hashes from N3 core identity; they remain diagnostic readback for LLM/harness tuning.

LLM diagnostic adjunct:
- Default executor may be `codex_assisted`.
- Trigger only after deterministic N3 output is available.
- P0 default: run for every `action_required` result.
- Do not run for `ready_for_human_decision`.
- Run for `parked` only when the harness profile is diagnostic/full.
- Inputs are sanitized N3 artifacts: routing outcome, check items, issue/action codes, loopback hints, lineage refs/hashes, admitted N2 semantic summary, and harness metadata.
- Outputs are diagnostic-only: `diagnostic_summary`, `suspected_root_causes`, `suggested_repair_steps`, `harness_tuning_notes`, `referenced_action_codes`, and `confidence`.
- Diagnostic failure cannot change N3 output, block N4, block loopback routing, or create a new gate attempt.

### Initial Open Questions
- None for the N3 routing/diagnostic baseline.

## N4 - `topic-selection.v1c.record-human-promotion-decision.v1`

### Starting Point
N4 is the human/delegated promotion authority node. It consumes only an N3 gate result with harness routing outcome `ready_for_human_decision`, records the human/delegated decision, and materializes `PromotionDecision`. Promote-class outcomes may also materialize `PromotionCommitmentProfile`, but N4 does not create `PaperProjectBridge`.

The domain decision vocabulary may remain rich for human records, but the harness-facing contract should expose only three routing outcomes to keep orchestration robust.

### N4 Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N4-D1 | Node role | Human/delegated authority node that records a confirmed promotion decision against the latest ready N3 gate handoff. It is the first node that may create `PromotionDecision`. | confirmed |
| N4-D2 | Entry boundary | N4 may be invoked only from N3 `ready_for_human_decision`. N3 `action_required` and `parked` must not enter N4. | confirmed |
| N4-D3 | Harness routing outcomes | Harness-facing N4 contract exposes only `bridge_authorized`, `action_required`, and `closed_no_auto_progress`. Rich human decision kinds remain domain-record details and must not become harness branches. | confirmed |
| N4-D4 | Bridge boundary | `bridge_authorized` authorizes N5 to create `PaperProjectBridge`; N4 itself does not create the bridge. Non-bridge outcomes must not emit bridge handoff. | confirmed |
| N4-D5 | Commitment profile boundary | `bridge_authorized` may create `PromotionCommitmentProfile`; `action_required` and `closed_no_auto_progress` must not create commitment profile or bridge handoff. Conditions are data on `bridge_authorized`, not a separate harness branch. | confirmed |
| N4-D6 | Loopback contract | `action_required` must include typed `required_actions` and `loopback_hints`; if they are missing or malformed, block before routing. Harness routes from typed actions, not decision prose or rich decision labels. | confirmed |
| N4-D7 | Closed outcome | `closed_no_auto_progress` stops automation and carries `closure_kind: parked | dropped`. `parked` may resume only through explicit reopen/unpark/rerun; `dropped` is terminal unless explicitly reopened. | confirmed |
| N4-D8 | LLM/Codex boundary | N4 forbids unscoped LLM/Codex authority, but Codex may be explicitly authorized as a delegated assist executor. Codex may draft or submit a structured decision payload only within an authorization envelope that fixes accountable human/delegated owner, gate/snapshot hash, allowed outcomes, policy/profile refs, and expiry. Snapshot hash confirmation and deterministic admission are required before persistence. | confirmed |
| N4-D9 | Replay and idempotency | Replay identity includes N3 gate check/ref hash, confirmed snapshot hash, actor id/type, normalized outcome, rich decision kind, conditions/actions/closure payload hash, policy version, and decision timestamp policy. Same decision key returns existing records; same promotion input snapshot with a different current decision payload returns `VERSION_CONFLICT` and does not auto-supersede. | confirmed |
| N4-D10 | Diagnostic persistence | Persist normalized outcome, rich decision kind, typed actions, conditions, accepted-risk refs, commitment profile refs, actor/delegation confirmation metadata, snapshot hash, authorization refs, admission report, and sanitized Codex assist refs to improve harness robustness and LLM diagnosis. Do not treat unadopted Codex drafts as authority. | confirmed |
| N4-D11 | Delegated Codex execution | `codex_delegated` is allowed only when the harness supplies an explicit delegation authorization. The persisted authority actor should be `hybrid` or equivalent delegated actor metadata linking accountable human/delegated owner plus Codex executor provenance. Codex output must pass the same N4 schema, typed-action, commitment, and forbidden-field checks as human payloads. | confirmed |
| N4-D12 | P0 delegated coverage | P0 acceptance covers `codex_delegated` only through an explicit delegation profile, not as the default N4 path. Required fixtures include delegated happy path plus missing-authorization and scope-mismatch negative cases. | confirmed |
| N4-D13 | Commitment projection | `PromotionCommitmentProfile` is projected only from N3 ready handoff, N2 admitted semantic layer, and the confirmed human/delegated or Codex-delegated decision payload. N4 must not call LLM to repair commitment profile or infer commitment fields from free-form prose. | confirmed |

### N4 Harness Routing Model
Decision: confirmed. N4 can preserve a rich human decision vocabulary internally, but harness orchestration should branch only on three outcomes.

Routing outcomes:
- `bridge_authorized`: human/delegated actor authorizes promote-class progression. N4 writes `PromotionDecision` and `PromotionCommitmentProfile`, then authorizes N5 bridge creation.
- `action_required`: human/delegated actor declines bridge authorization but provides a typed repair/recheck/loopback path.
- `closed_no_auto_progress`: human/delegated actor parks or drops the package; no automatic loopback or bridge creation.

Rich decision mapping:
- `promote_to_paper_project` and `promote_with_conditions` -> `bridge_authorized`.
- `merge_packages`, `refine_package`, `reassess_value`, `revise_question`, `revise_slice`, and `recheck_evidence_or_search` -> `action_required`.
- `park` and `drop` -> `closed_no_auto_progress` with `closure_kind`.

Harness actions:
- `bridge_authorized`: invoke N5 bridge creation. Conditions, allowed refinements, accepted risks, and early-check obligations are carried in `PromotionCommitmentProfile`.
- `action_required`: route only from typed `required_actions` and `loopback_hints`. Missing typed actions make the result malformed for harness routing.
- `closed_no_auto_progress`: stop automation. `parked` may resume only through explicit unpark/reopen/rerun; `dropped` is terminal unless explicitly reopened.

LLM/Codex assist:
- Codex can draft decision-support material after N3 ready and before human/delegated confirmation.
- Codex can also execute as `codex_delegated` when an explicit delegation authorization is present.
- Allowed draft outputs: rationale draft, condition draft, risk reminder, commitment profile preview, allowed refinement suggestions, early-check obligation suggestions, and action hints.
- Delegated execution authorization must include accountable human/delegated owner, Codex executor provenance, allowed outcomes/rich decisions, N3 gate ref, confirmed snapshot hash, policy/profile refs, expiry, and output schema version.
- Forbidden outputs: unscoped decision submission, bridge creation, direct `PaperProjectBridge` creation, raw downstream mutation commands, or override of N3/N4 constraints.
- Any Codex draft not adopted or authorized by N4 remains diagnostic/support material only.
- Any Codex-delegated decision payload must pass the same deterministic N4 admission as human payloads before `PromotionDecision` persistence.

Replay, diagnostics, and commitment projection:
- Same `promotion_input_snapshot_id` may have only one current `PromotionDecision`.
- Same N4 decision key returns existing records.
- Same promotion input snapshot with a different current decision payload returns `VERSION_CONFLICT`; it does not auto-supersede.
- Persist diagnostic metadata for harness/LLM diagnosis: normalized outcome, rich decision kind, typed actions, conditions, accepted-risk refs, commitment profile refs, actor/delegation metadata, authorization refs, confirmed snapshot hash, admission report, and sanitized Codex provenance refs.
- `PromotionCommitmentProfile` is projected only from N3 ready handoff, N2 admitted semantic layer, and the confirmed decision payload.
- N4 does not call LLM to repair commitment profile fields and does not infer authority fields from free-form prose.

P0 delegated coverage:
- Default N4 path remains human/delegated structured payload.
- `codex_delegated` is included in P0 acceptance only through an explicit delegation profile.
- Required P0 fixtures: delegated `bridge_authorized` happy path, missing authorization rejection, and authorization scope mismatch rejection.

### Initial Open Questions
- None for the N4 routing/delegation baseline.

## N5 - `topic-selection.v1c.create-paper-project-bridge.v1`

### Starting Point
N5 is a deterministic bridge materialization node. It consumes only N4 `bridge_authorized` handoff with a current promote-class `PromotionDecision` and valid `PromotionCommitmentProfile`, then creates an active `PaperProjectBridge` plus a working-copy handoff. T-108 P0 stops at the bridge handoff; explicit PaperProject intake/consumption is optional compatibility smoke and not part of the N5 P0 acceptance boundary.

### N5 Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N5-D1 | Node role | Deterministic bridge materializer that converts a current promote-class N4 handoff into `PaperProjectBridge` and a bridge handoff with working-copy payload. | confirmed |
| N5-D2 | Entry boundary | N5 may be invoked only from N4 `bridge_authorized`. N4 `action_required` and `closed_no_auto_progress` must not enter N5. | confirmed |
| N5-D3 | PaperProject boundary | P0 creates `PaperProjectBridge` handoff only. Direct PaperProject/PaperImplementation intake, creation, implementation bootstrap, WorkOrder, experiment, writing, or downstream consumption remain outside P0 and may be optional compatibility smoke only after bridge acceptance. | confirmed |
| N5-D4 | Authority boundary | N5 creates no new promotion authority. It must not change `PromotionDecision`, `PromotionCommitmentProfile`, conditions, accepted risks, claim ceiling, or downstream PaperProject/PaperImplementation state. | confirmed |
| N5-D5 | Input validation | N5 requires current promote-class `PromotionDecision`, `bridge_eligible=true`, matching commitment profile, consistent snapshot hashes, workspace consistency, claim ceiling, contribution summary, evaluation plan, and selected evidence/accepted-risk carry-forward. | confirmed |
| N5-D6 | Harness routing outcomes | Harness-facing N5 contract exposes `bridge_ready` and diagnostic `action_required`, but only `bridge_ready` may persist `PaperProjectBridge`. All source lineage, hash, authority, or required semantic-field failures fail before bridge persistence and return diagnostic action data only. | confirmed |
| N5-D7 | Working-copy contract | Working-copy payload is deterministic and editable downstream. It carries title/problem/contribution/evaluation plan, claim ceiling, prohibited claims, conditions, accepted risks, early-check obligations, and source lineage summary. | proposed |
| N5-D8 | LLM/Codex boundary | N5 core has no LLM/Codex authority. Codex may be used only as post-bridge diagnostic/readability support in explicit diagnostic profiles, and cannot alter bridge payload or downstream state. | confirmed |
| N5-D9 | Replay and idempotency | Replay identity includes source promotion decision id/hash, commitment profile hash, snapshot hashes, working-copy payload hash, bridge policy version, and workspace. Same source promotion decision returns the existing bridge idempotently. Source hash or bridge payload hash drift returns `VERSION_CONFLICT`; N5 must not auto-create a second bridge for the same source decision. | confirmed |
| N5-D10 | Diagnostic persistence | Persist diagnostic artifact/result metadata for harness robustness and LLM diagnosis: bridge payload hash attempt, working-copy payload hash attempt, source lineage hashes, validation/admission report, missing field codes, required action codes, and source refs. Do not persist a bridge record on failure, raw Codex output, or audit/compliance artifacts. | confirmed |
| N5-D11 | Semantic projection | N5 reads structured semantic fields from `PromotionCommitmentProfile` and deterministically projects them into `PaperProjectBridge` working-copy payload. It must not parse dossier markdown/free prose, use LLM/Codex to fill missing semantics, or resolve semantic conflicts. Missing required semantic fields fail before bridge persistence. | confirmed |

### N5 Harness Boundary
Decision: confirmed. N5 stays inside v1c and stops at the `PaperProjectBridge` handoff.

P0 boundary:
- Create and persist `PaperProjectBridge`.
- Produce deterministic working-copy payload and bridge handoff.
- Do not invoke PaperProject intake, create PaperProject, create PaperImplementation, bootstrap implementation work, create WorkOrder, run experiments, write paper sections, or consume bridge downstream.
- Existing PaperProject intake routes may remain optional compatibility smoke only after N5 bridge acceptance.

Core projection:
- Consume only N4 `bridge_authorized` handoff.
- Require current promote-class `PromotionDecision`, `bridge_eligible=true`, matching `PromotionCommitmentProfile`, consistent snapshot hashes, and workspace consistency.
- Carry claim ceiling, prohibited claims, conditions, accepted risks, allowed refinements, early-check obligations, selected evidence refs, and source lineage summary into the working-copy payload.
- Do not mutate N4 authority records or downstream PaperProject/PaperImplementation state.

Failure semantics:
- Persist only valid `PaperProjectBridge(status=active)` records.
- Do not create half-built, blocked, or `action_required` bridge records.
- `action_required` is a harness diagnostic result only, not a persisted bridge status for P0.
- Source lineage mismatch, stale/non-current promote decision, `bridge_eligible=false`, missing/mismatched commitment profile, workspace mismatch, hash mismatch, or missing required semantic fields fail before bridge persistence.
- Diagnostic artifacts/results may record required action codes and source refs for harness/LLM diagnosis, but they are not bridge records.

Replay and diagnostics:
- Same `source_promotion_decision_id` returns the existing bridge idempotently.
- N5 must not create a second bridge for the same source promotion decision.
- Source hash, commitment profile hash, snapshot hash, or bridge payload hash drift returns `VERSION_CONFLICT`.
- Failure diagnostics may persist as diagnostic artifacts/results only: validation report, missing field codes, source refs, lineage hashes, attempted working-copy payload hash, attempted bridge payload hash, and required action codes.
- Failure diagnostics exist to improve harness robustness and LLM diagnosis; they are not audit/compliance artifacts and are not product-facing bridge state.

Semantic projection:
- Read only structured semantic fields from `PromotionCommitmentProfile`, including `claim_ceiling`, `prohibited_claims`, `scope.contribution_summary`, `scope.evaluation_plan`, `scope.source_snapshot_excerpt`, `conditions`, `accepted_risk_refs`, `allowed_refinements`, `early_check_obligations`, and selected evidence refs.
- Deterministically project those fields into `PaperProjectBridgeWorkingCopyPayload`.
- Do not parse dossier markdown or free-form prose for authority.
- Do not use LLM/Codex to fill missing contribution/evaluation/claim fields.
- Do not resolve claim-ceiling or evidence-support conflicts at N5.
- Missing required semantic fields are upstream contract failures and must fail before bridge persistence.

LLM/Codex boundary:
- N5 projection is deterministic.
- Codex is not part of the default N5 path.
- Explicit diagnostic profiles may ask Codex to explain bridge materialization failures or readability issues from sanitized bridge artifacts.
- Codex diagnostics must not edit bridge payload, create downstream state, or become part of bridge replay identity.

### Initial Open Questions
- None for the N5 bridge boundary baseline.

## N6 - `topic-selection.v1c.record-downstream-feedback-recheck.v1`

### Starting Point
N6 is the v1c downstream feedback ingress and deterministic recheck projection node. It receives structured feedback attached to an existing `PaperProjectBridge`, classifies it through a fixed policy table, and records feedback/recheck artifacts for upstream loopback. It does not test or implement PaperProject, PaperImplementation, writing, reviewer systems, or any downstream consumer.

The design priority is harness robustness and smooth orchestration: accept constrained structured feedback, produce a small harness-readable outcome, and avoid introducing another open-ended semantic interpretation layer.

### N6 Decision Backlog
| ID | Decision Point | Recommended Default | Status |
| --- | --- | --- | --- |
| N6-D1 | Node role | v1c feedback ingress plus deterministic recheck projection over an existing active `PaperProjectBridge`. | confirmed |
| N6-D2 | Boundary | N6 does not modify bridge, promotion decision, commitment profile, topic package, PaperProject, or PaperImplementation state. It records feedback and optional recheck projection only. | confirmed |
| N6-D3 | Source boundary | Feedback source kinds such as `paper_project`, `paper_implementation`, `writing`, `reviewer_check`, and `manual` are provenance only. T-108 does not validate those downstream systems. Harness must not branch on source kind. | confirmed |
| N6-D4 | Harness outcomes | Harness-facing N6 contract exposes only `recheck_opened`, `feedback_recorded`, and `invalid_feedback`. Detailed source kind/cause/severity remain record fields, not harness branches. | confirmed |
| N6-D5 | Deterministic classification | P0 uses a fixed `feedback_signal` -> loopback target/cause mapping. Unsupported or underspecified signals are `invalid_feedback` unless an explicit policy extension admits them. | confirmed |
| N6-D6 | Recheck requirement | If classification requires recheck, input must include a non-empty structured required action. Missing required action makes the result `invalid_feedback` and must not create a recheck request. | confirmed |
| N6-D7 | Bridge validation | Feedback requires an active trusted bridge and matching bridge/source lineage. Inactive bridge, stale bridge hash, missing bridge, or malformed source ref returns `invalid_feedback` before recheck projection. | confirmed |
| N6-D8 | LLM/Codex boundary | Codex may act as the general LLM helper for necessary semantic parsing, normalization, summarization, and record drafting of downstream feedback. It must output a structured feedback candidate that passes deterministic admission. Final classification, routing outcome, and recheck creation remain deterministic and harness-controlled. | confirmed |
| N6-D9 | Replay and idempotency | Replay identity includes bridge id/hash, downstream source ref, feedback signal, severity, required action, source feedback refs, payload hash, Codex normalization profile/version when used, and admitted structured feedback hash. Same feedback fingerprint returns existing record; bridge hash/source drift returns `invalid_feedback` or conflict according to fingerprint policy. | confirmed |
| N6-D10 | Diagnostic persistence | Persist feedback fingerprint, admitted structured feedback hash, classification, loopback target/cause, required action codes, source refs, bridge lineage hashes, recheck refs, Codex normalization provenance when used, and sanitized diagnostics for harness robustness and LLM diagnosis. Do not persist raw Codex output or treat diagnostics as audit/compliance artifacts. | confirmed |
| N6-D11 | P0 execution lanes | P0 acceptance covers two lanes: direct structured feedback and Codex normalization from semi-structured semantic feedback into a structured candidate. The default production path may prefer direct structured input, but T-108 must verify the Codex normalization lane and deterministic rejection of malformed Codex candidates. | confirmed |

### N6 Harness Routing Model
Decision: confirmed. N6 should keep feedback/recheck orchestration narrow and deterministic.

Routing outcomes:
- `recheck_opened`: feedback was recorded and produced a downstream recheck request/projection. Harness routes from typed loopback target/cause and recheck refs.
- `feedback_recorded`: feedback was recorded and no upstream recheck is needed.
- `invalid_feedback`: input/source/bridge/payload is not trustworthy or lacks required structured action. No recheck is created.

P0 deterministic mapping:
- `stale_evidence` -> `evidence_or_search`.
- `overclaim` -> `promotion` or `paper_project_bridge` based on the affected ref type.
- `unanswerable_question` -> `topic_question`.
- `boundary_drift` -> `research_slice`.
- `need_invalidated` -> `validated_need`.
- `package_narrative_gap` -> `package`.
- `commitment_gap` -> `paper_project_bridge`.
- `no_recheck_needed` -> `feedback_recorded`.

Harness rules:
- Source kind is provenance only and must not become a harness branch.
- `requires_recheck=true` requires a non-empty structured required action.
- `no_recheck_needed` records feedback only and must not create recheck artifacts.
- Invalid bridge/source/hash/payload stops before meaningful projection and returns diagnostic codes.
- N6 never executes the recheck, repairs upstream state, rolls back downstream state, or mutates bridge/promotion/package records.

LLM/Codex semantic helper:
- Codex may be used as a general LLM helper when feedback arrives as partially semantic operator/downstream text that needs normalization into the N6 structured feedback candidate.
- Allowed functions: semantic parsing, normalization into `feedback_signal` candidate, required-action wording, concise summary, source-ref organization, record drafting, invalid-feedback explanation, repeated-pattern summary, and harness tuning notes.
- Codex output is a candidate only. It must pass deterministic admission: bridge/source validation, allowed signal, required action presence when recheck is needed, source-ref allowlist, payload size/redaction, and forbidden mutation fields.
- Final classification, routing outcome, and recheck creation are deterministic and based on the admitted structured candidate.
- Codex must not mutate records directly, create recheck artifacts directly, override fixed classification policy, or become downstream implementation authority.
- Persist Codex normalization provenance and structured output hash when used; do not persist raw Codex output or hidden reasoning.

P0 lanes:
- `structured_direct`: caller supplies structured feedback fields; N6 validates and classifies deterministically.
- `codex_normalization`: caller supplies semi-structured semantic feedback; Codex normalizes it into the same structured feedback candidate contract, then N6 validates and classifies deterministically.
- Required negative cases for `codex_normalization`: unsupported signal, missing required action for a recheck-producing signal, invented refs, and forbidden downstream mutation commands.

### Initial Open Questions
- None for the N6 feedback/recheck baseline.
