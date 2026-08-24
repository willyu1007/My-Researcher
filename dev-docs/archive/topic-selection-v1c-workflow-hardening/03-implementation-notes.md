# Implementation Notes

Implementation is complete for the T-108 P0 v1c WorkflowHarness boundary.

## Initial Notes
- Created this package to carry v1a WorkflowHarness normalization standards into v1c.
- This task should start with code/current-state mapping and authority-boundary review before runtime changes.

## 2026-05-28 - Boundary Alignment
- Confirmed D1 boundary for planning discussion:
  - T-108 P0 scope is v1c WorkflowHarness hardening, node orchestration robustness, automation, and Codex/provider landing for v1c advisory support.
  - Scope starts from frozen `TopicSelectionV1bToV1cInputBundle` and covers promotion input, promotion support, deterministic gate, human promotion decision, commitment profile projection, `PaperProjectBridge`, and v1c downstream feedback/recheck.
  - T-108 does not enter PaperImplementation bootstrap, `ImplementationProject`, WorkOrder, experiment, writing, or PaperImplementation harness scope.
  - Explicit PaperProject/PaperImplementation intake or consumption is not a P0 T-108 acceptance boundary; it may remain optional compatibility smoke only after v1c nodes are accepted.

## 2026-05-28 - Cross-Node Harness Contract
- Confirmed cross-node harness contract in `06-node-decision-alignment.md`.
- Key decisions:
  - Harness-facing orchestration routes from small stable routing outcomes plus typed `required_actions`, `loopback_hints`, source refs, and hashes.
  - Domain-specific dispositions, source kinds, decision kinds, causes, and severities remain record/diagnostic metadata rather than harness branches.
  - Codex/provider outputs must normalize into structured contracts before they can influence routing.
  - Diagnostics are for harness robustness and LLM/operator repair, not audit/compliance or product workflow surfaces.

## 2026-05-28 - Cross-Node Nonlinear Strategy
- Confirmed the v1c nonlinear workflow strategy in `06-node-decision-alignment.md`.
- Key decisions:
  - v1c is a forward-only workflow: `N1 -> N2 -> N3 -> N4 -> N5`, with N6 as bridge-after feedback/recheck ingress.
  - v1c does not recreate the v1b N6-N8 style automatic loop.
  - A current attempt must not automatically jump back to an earlier node, mutate upstream node results, or fall back to old logic/profile paths unless an explicit approved fallback policy exists.
  - Recoverable non-success outcomes stop automation and emit typed `required_actions`, `affected_refs`, lineage/hash data, and a coarse `resume_entry`.
  - Repair/recheck completion creates a new attempt; prior node results remain immutable diagnostic readback.
  - N6 `recheck_opened` records feedback and opens a recheck/action projection only; it does not execute upstream repair or automatically trigger N1-N5.
  - Retry and replay are internal mechanics, not nonlinear workflow graph edges.

## 2026-05-28 - Acceptance Matrix Shape
- Confirmed the first-level acceptance matrix coverage dimensions in `06-node-decision-alignment.md`.
- Created `07-acceptance-matrix.md` as the matrix owner document.
- Confirmed matrix construction:
  - rows are written by node/scope and scenario;
  - dimensions are coverage tags and review checks, not a Cartesian product;
  - every row must assert harness-facing outcome and automation behavior;
  - every row should include persistence, replay/idempotency, LLM/Codex, and boundary assertions unless explicitly not applicable;
  - rows must route from structured contracts only, not prose, raw LLM output, legacy dispositions, or downstream side effects.
- Confirmed dimensions:
  - D1 Node / Entry;
  - D2 Happy Path Outcome;
  - D3 Stop Outcome;
  - D4 Lineage / Replay / Idempotency;
  - D5 LLM / Codex Contract;
  - D6 Admission / Schema Robustness;
  - D7 Persistence Boundary;
  - D8 Nonlinear / Resume Behavior;
  - D9 Automation / Harness Control Plane.

## 2026-05-28 - Cross-Node Acceptance Rows
- Added the first confirmed acceptance matrix row group in `07-acceptance-matrix.md`.
- Cross-node rows cover:
  - forward-only happy chain;
  - illegal node entry;
  - stop outcomes stopping automation;
  - required typed actions for recoverable stops;
  - no implicit fallback;
  - replay without duplicate writes;
  - hash drift and version conflict;
  - bounded same-node retry;
  - N6 feedback/recheck without automatic loop;
  - LLM/Codex output never becoming raw authority.

## 2026-05-28 - N1 Decision Alignment
- Confirmed N1 `topic-selection.v1c.create-promotion-input-snapshot.v1` decisions in `06-node-decision-alignment.md`.
- Key decisions:
  - N1 is deterministic and does not allow Codex/provider/debate execution.
  - Persisted non-ready snapshots are diagnostic only, with first-class consumption limited to N2 handoff gating and harness/operator/LLM diagnostic readback.
  - `ready_for_gate` snapshots support strict exact replay; blocked/superseded/refresh-needed diagnostics are append-only per harness attempt.
  - Domain idempotency remains keyed by source v1c bundle identity/hash and does not hide harness replay drift.
  - N1 will use the unified future `topic-selection-v1c-workflow-harness-contracts` package with later v1c nodes.

## 2026-05-28 - N1 Acceptance Rows
- Added N1 acceptance rows in `07-acceptance-matrix.md`.
- N1 rows cover:
  - ready snapshot happy path;
  - malformed request or missing bundle fail-before-persistence;
  - workspace/source drift fail-before-authority;
  - trustworthy non-ready diagnostic snapshot;
  - warning/blocker/recheck/ref propagation;
  - exact replay;
  - domain idempotency and changed-hash conflict;
  - no LLM/Codex/downstream side effects.

## 2026-05-28 - N2 Decision Alignment Started
- Started N2 `topic-selection.v1c.generate-promotion-support.v1` decision alignment in `06-node-decision-alignment.md`.
- Confirmed so far:
  - N2 role and authority are closed: it is only an advisory support/dossier generation node, consumes only the N1 `ready_for_gate` handoff and frozen hashes, and never decides gate disposition, authorizes promotion, creates `PromotionDecision`, creates `PaperProjectBridge`, or mutates source snapshot/package state.
  - provider/Codex failures block by default; deterministic fallback is allowed only through explicit harness fallback policy.
  - Codex-assisted and provider LLM modes use the same structured output contract; provenance differs only in execution metadata.
  - `ArgumentReadinessMiniCheck` belongs to N3 deterministic gate evaluation, not N2 advisory support generation.
  - N2 LLM-enabled acceptance baseline is a new fixed bounded micro-debate tier added on top of the existing v1a/v1b debate profile ladder; no Codex single-agent control lane is required for T-108 acceptance.
  - Bounded micro-debate uses exactly four fixed LLM calls: supporter draft, critic review, supporter targeted repair/rebuttal, and synthesizer final advisory draft with critic-finding resolution map.
  - All four bounded micro-debate calls are Codex-eligible in the P0 baseline; provider-backed calls require explicit profile/canary selection and keep the same role/output contracts.
  - P0 baseline profile id is `topic-selection.v1c.promotion-support.bounded-micro-debate.codex.v1`; harness passes stable profile ids/resolved metadata and business logic does not embed raw provider/model params.
  - `PromotionSupportContextPacket` is derived only from the N1 frozen handoff and includes allowed refs, snapshot hashes, claim ceiling, contribution summary, evaluation plan, selected evidence refs, accepted risks, blocker refs, and recheck refs; N2 does not re-read mutable v1b/package state.
  - Replay identity includes N1 snapshot hash, context packet hash, bounded profile id/version, prompt template version, four structured call output hashes, and final admitted draft hash. Same support run key returns existing support/dossier without LLM re-invocation; drift creates a new diagnostic attempt.
  - N2 persistence is diagnostic/tuning-oriented only: per-call normalized artifacts, hashes, admission reports, warning/blocker codes, critic finding/resolution data, prompt/profile refs, context packet hash, and sanitized telemetry exist to improve harness robustness and help LLM diagnosis/repair, not to create an audit/compliance surface.
  - Only `synthesizer.final` may be admitted into the N2 advisory output contract consumed by N3; earlier role artifacts remain diagnostic invocation artifacts.
  - All four LLM/Codex calls require per-call diagnostic admission: role/call envelope, `support_run_key`, context/snapshot hashes, prompt/profile refs, schema, source-ref allowlist, forbidden fields, and redaction/size checks.
  - Final admission requires `synthesizer.final` to preserve N1 accepted risks/blockers/recheck refs, provide structured support/dossier content, and cover every critic finding with `accepted_and_repaired`, `accepted_as_risk`, or `rebutted_with_refs`.
  - `synthesizer.final` must include an N3-readable structured semantic layer: claim ceiling alignment, contribution summary, evaluation plan summary, evidence support map, accepted-risk acknowledgements, recheck obligation summary, critic finding resolution map, and readiness coverage items. N3 must not infer authority from prose/dossier markdown.
  - N2 failures default to block: one same-input same-profile retry is allowed only for transport/timeout/Codex invocation failure; schema parse failures, forbidden fields, invented refs, intermediate admission failure, or final admission failure stop N2 and do not invoke N3.
  - Proposed minimal diagnostic artifact contract is `PromotionSupportInvocationArtifact` with role/call identity, context/prompt/profile refs, output hash, admission report, warning/blocker codes, source refs, and sanitized telemetry.
  - Existing compact/mixed-cost and provider-diverse-deep debate tiers remain explicit compatibility/escalation profiles, not the T-108 baseline.
  - Deterministic support remains the no-LLM quick-smoke mode, not the LLM-enabled baseline.

## 2026-05-28 - N2 Acceptance Rows
- Added N2 acceptance rows in `07-acceptance-matrix.md`.
- N2 rows cover:
  - bounded micro-debate happy path;
  - illegal or non-ready N1 entry;
  - frozen context packet and no mutable v1b/package re-read;
  - fixed four-call workflow;
  - per-call admission failure;
  - transport/timeout retry budget;
  - final admission and N3-readable semantic layer;
  - forbidden authority output;
  - semantic gaps versus final admission;
  - replay and support-run idempotency;
  - diagnostic persistence boundary;
  - explicit provider/fallback profile handling.

## 2026-05-28 - N3 Decision Alignment Started
- Started N3 `topic-selection.v1c.run-promotion-gate.v1` decision alignment in `06-node-decision-alignment.md`.
- Confirmed so far:
  - N3 owns deterministic `ArgumentReadinessMiniCheck` and promotion gate evaluation.
  - N3 has no Codex/provider execution path and must not use LLM output to decide readiness, disposition, loopback, or promotion.
  - Harness-facing N3 contract uses only three routing outcomes: `ready_for_human_decision`, `action_required`, and `parked`.
  - Existing fine-grained dispositions such as `blocked`, `recheck_required`, `needs_revision`, and `park` may remain internal/compatibility diagnostics, but harness orchestration routes only from the three outcomes plus typed actions.
  - `ready_for_human_decision` only authorizes invoking the next human/delegated decision node; it does not promote, create `PromotionDecision`, create `PaperProjectBridge`, or mutate downstream state.
  - `action_required` routes only from typed `required_actions` and `loopback_hints`; a non-ready result without valid typed actions is malformed and should block before routing.
  - `parked` stops automation, does not invoke N4 or auto-loopback, and must include `park_reason_code`, `park_rationale`, `resume_conditions`, source refs, and lineage hashes. Resume requires an explicit unpark/rerun/upstream-change/external-condition event and creates a new attempt.
  - N3 consumes N1 frozen lineage and admitted N2 final support/dossier only; N2 intermediate debate artifacts remain diagnostic and are excluded from N3 core replay identity.
  - N3 consumes the admitted N2 final structured semantic layer and validates slot presence/status, source refs, risk/blocker/recheck preservation, critic resolution coverage, and consistency with the frozen N1 handoff deterministically.
  - N3 does not parse N2 free-form prose for authority. If prose conflicts with structured semantic slots, the structured slots are canonical and the conflict produces `action_required`.
  - N3 replay identity includes N1 snapshot hash, N2 admitted support/dossier refs and hashes, N2 final draft/admission hash, gate policy version, and mini-check rules version.
  - N3 LLM diagnostic adjunct is allowed outside gate authority, with default executor `codex_assisted`; it reads sanitized N3 artifacts after deterministic output and may produce diagnostic repair/tuning guidance only.
  - P0 runs the Codex diagnostic adjunct for every `action_required` result, does not run it for `ready_for_human_decision`, and runs it for `parked` only in diagnostic/full harness profiles.
- Remaining proposed focus:
  - diagnostic persistence for harness robustness and LLM diagnosis.

## 2026-05-28 - N3 Acceptance Rows
- Added N3 acceptance rows in `07-acceptance-matrix.md`.
- N3 rows cover:
  - ready gate happy path;
  - missing or stale lineage fail-before-gate-authority;
  - structured semantic validation;
  - prose conflict against structured slots;
  - carried blockers and recheck refs;
  - `ArgumentReadinessMiniCheck` gaps;
  - parked outcome and explicit resume;
  - ready is not promote;
  - malformed typed action handling;
  - replay and drift identity;
  - Codex diagnostic adjunct boundaries.

## 2026-05-28 - N4 Decision Alignment Started
- Started N4 `topic-selection.v1c.record-human-promotion-decision.v1` decision alignment in `06-node-decision-alignment.md`.
- Confirmed so far:
  - N4 may be invoked only from N3 `ready_for_human_decision`.
  - N4 is the first node that may create `PromotionDecision`.
  - Harness-facing N4 contract uses only three outcomes: `bridge_authorized`, `action_required`, and `closed_no_auto_progress`.
  - Rich human decision kinds remain domain-record details and do not become harness branches.
  - `bridge_authorized` may create `PromotionCommitmentProfile` and authorizes N5 bridge creation, but N4 does not create `PaperProjectBridge`.
  - `action_required` routes only through typed `required_actions` and `loopback_hints`; missing typed actions are malformed for harness routing.
  - `closed_no_auto_progress` carries `closure_kind: parked | dropped`, stops automation, and resumes only through explicit unpark/reopen/rerun when applicable.
  - N4 forbids unscoped LLM/Codex authority, but Codex may be explicitly authorized as a delegated assist executor.
  - Codex can draft rationale, conditions, risk reminders, commitment previews, allowed refinements, early-check obligations, or action hints. It can submit a structured N4 decision payload only under an explicit `codex_delegated` authorization envelope.
  - `codex_delegated` authorization must fix accountable human/delegated owner, Codex executor provenance, allowed outcomes/rich decisions, N3 gate ref, confirmed snapshot hash, policy/profile refs, expiry, and output schema version.
  - Codex-delegated payloads must pass the same deterministic N4 schema, typed-action, commitment, forbidden-field, and snapshot-hash admission checks as human payloads before `PromotionDecision` persistence.
  - N4 replay/idempotency uses one current `PromotionDecision` per `promotion_input_snapshot_id`; same decision key returns existing records, while a different current decision payload for the same snapshot returns `VERSION_CONFLICT` and does not auto-supersede.
  - `codex_delegated` is covered in P0 only through an explicit delegation profile, with happy-path, missing-authorization, and scope-mismatch fixtures.
  - `PromotionCommitmentProfile` is projected only from N3 ready handoff, N2 admitted semantic layer, and the confirmed human/delegated or Codex-delegated decision payload. N4 does not call LLM to repair commitment profile or infer authority fields from prose.

## 2026-05-28 - N4 Acceptance Rows
- Added N4 acceptance rows in `07-acceptance-matrix.md`.
- N4 rows cover:
  - bridge-authorized happy path;
  - illegal N3 entry;
  - action-required decision mapping;
  - closed no-auto-progress decision mapping;
  - conditions as data on `bridge_authorized`;
  - commitment projection admission;
  - Codex-delegated happy path;
  - Codex-delegated rejection;
  - Codex draft non-authority;
  - replay and current-decision idempotency;
  - N4 bridge non-creation boundary.

## 2026-05-28 - N5 Decision Alignment Started
- Started N5 `topic-selection.v1c.create-paper-project-bridge.v1` decision alignment in `06-node-decision-alignment.md`.
- Initial proposed scope:
  - N5 is deterministic bridge materialization from N4 `bridge_authorized`.
  - P0 creates `PaperProjectBridge` and working-copy handoff only; direct PaperProject/PaperImplementation intake, creation, implementation bootstrap, WorkOrder, experiment, writing, or downstream consumption remain outside P0 and may be optional compatibility smoke only after bridge acceptance.
  - N5 creates no new promotion authority and must not change `PromotionDecision`, `PromotionCommitmentProfile`, conditions, accepted risks, claim ceiling, or downstream PaperProject/PaperImplementation state.
  - Harness-facing N5 contract should expose only `bridge_ready` and `action_required`.
  - N5 projection is deterministic and Codex is not part of the default path; Codex diagnostics, if useful, belong only to explicit diagnostic profiles and cannot alter bridge payload or downstream state.
  - N5 reads only structured semantic fields from `PromotionCommitmentProfile` and deterministically projects them into `PaperProjectBridgeWorkingCopyPayload`.
  - N5 must not parse dossier markdown/free prose, use LLM/Codex to fill missing semantic fields, or resolve claim/evidence conflicts. Missing required semantic fields fail before bridge persistence.
  - N5 persists only valid `PaperProjectBridge(status=active)` records. `action_required` is a harness diagnostic result only and must not create half-built bridge records.
  - Source lineage mismatch, stale/non-current promote decision, `bridge_eligible=false`, missing/mismatched commitment profile, workspace mismatch, hash mismatch, or missing required semantic fields fail before bridge persistence.
  - Same `source_promotion_decision_id` returns the existing bridge idempotently; source hash, commitment profile hash, snapshot hash, or bridge payload hash drift returns `VERSION_CONFLICT` and N5 must not auto-create a second bridge.
  - N5 failure diagnostics may persist only as diagnostic artifacts/results for harness robustness and LLM diagnosis, including validation report, missing field codes, source refs, lineage hashes, attempted payload hashes, and required action codes. They are not bridge records or audit/compliance artifacts.

## 2026-05-28 - N5 Acceptance Rows
- Added N5 acceptance rows in `07-acceptance-matrix.md`.
- N5 rows cover:
  - bridge-ready happy path;
  - illegal N4 entry;
  - source, lineage, or workspace mismatch;
  - `bridge_eligible=false`;
  - missing or conflicting commitment profile;
  - deterministic semantic projection;
  - missing required semantic fields;
  - replay and bridge idempotency;
  - no half-built bridge records;
  - no downstream side effects or LLM authority.

## 2026-05-28 - N6 Decision Alignment Started
- Started N6 `topic-selection.v1c.record-downstream-feedback-recheck.v1` decision alignment in `06-node-decision-alignment.md`.
- Confirmed so far:
  - N6 is a v1c feedback ingress and deterministic recheck projection node over an existing active `PaperProjectBridge`.
  - N6 records feedback and optional recheck projection only; it does not modify bridge, promotion decision, commitment profile, topic package, PaperProject, or PaperImplementation state.
  - Feedback source kind is provenance only. T-108 does not validate downstream systems such as PaperProject, PaperImplementation, writing, or reviewer systems.
  - Harness-facing N6 contract uses only three outcomes: `recheck_opened`, `feedback_recorded`, and `invalid_feedback`.
  - P0 uses fixed deterministic `feedback_signal` classification. Unsupported or underspecified signals are `invalid_feedback` unless an explicit policy extension admits them.
  - Recheck-producing feedback requires a non-empty structured required action; otherwise no recheck is created.
  - Codex may act as the general LLM helper for necessary semantic parsing, normalization, summarization, source-ref organization, or feedback record drafting.
  - Codex output is a structured feedback candidate only and must pass deterministic admission. Final classification, routing outcome, and recheck creation remain deterministic and harness-controlled.
  - N6 replay identity includes bridge id/hash, downstream source ref, feedback signal, severity, required action, source feedback refs, payload hash, Codex normalization profile/version when used, and admitted structured feedback hash. Same feedback fingerprint returns existing records.
  - P0 acceptance covers two N6 lanes: `structured_direct` and `codex_normalization`. The Codex lane normalizes semi-structured semantic feedback into the same structured candidate contract before deterministic admission/classification.
  - Required Codex normalization negative cases include unsupported signal, missing required action for a recheck-producing signal, invented refs, and forbidden downstream mutation commands.

## 2026-05-28 - N6 Acceptance Rows
- Added N6 acceptance rows in `07-acceptance-matrix.md`.
- N6 rows cover:
  - structured recheck happy path;
  - structured no-recheck happy path;
  - invalid bridge or source;
  - unsupported or underspecified signal;
  - missing required action;
  - deterministic classification mapping;
  - Codex normalization happy path;
  - Codex normalization rejection;
  - replay and feedback fingerprint;
  - no upstream mutation or automatic loop;
  - diagnostic persistence boundary.
- `07-acceptance-matrix.md` now has confirmed cross-node and N1-N6 rows. Fixture/test mapping was completed in later entries.

## 2026-05-28 - Fixture/Test Mapping Strategy
- Confirmed the strategy-level fixture/test mapping in `07-acceptance-matrix.md`.
- Test layers:
  - L1 contract fixtures;
  - L2 node harness tests;
  - L3 persistence/idempotency tests;
  - L4 cross-node workflow tests;
  - L5 LLM/Codex tests.
- Confirmed mapping principles:
  - every acceptance row must have at least one primary test owner;
  - high-risk rows should have a secondary test owner;
  - rows should be proven at the lowest layer that can prove the contract;
  - cross-node workflow tests should cover orchestration and representative happy/stop paths, not every row as full workflow;
  - row-to-fixture/test-file mapping was completed in later entries.
- Confirmed LLM/Codex test strategy:
  - L5a contract stubs are P0 and CI-suitable for schema/admission/routing/forbidden-field/replay checks;
  - L5b real Codex acceptance is P0 for N2 bounded micro-debate, N3 diagnostic adjunct, N4 delegated payload, and N6 normalization;
  - L5c provider/model variance suite is a slower gate suitable for release/nightly/canary runs.
- Real LLM/Codex tests must not require byte-for-byte identical prose, but must require stable structure, valid refs, accepted routing boundaries, deterministic admission behavior, controlled failure semantics, and useful diagnostics for model variance.

## 2026-05-28 - Local Real Codex Acceptance
- Confirmed L5b real Codex acceptance is local required for T-108 acceptance.
- Missing credentials, disabled profile, network/runtime unavailability, or unresolved model config should report `real_codex_blocked_environment`, not pass as a skip.
- Ordinary CI may run L5a stubs only, but local T-108 acceptance and release-capable gates must include L5b.
- Minimum local L5b coverage:
  - N2 real four-call bounded micro-debate with admitted final support/dossier;
  - N3 real Codex diagnostic adjunct after deterministic `action_required`;
  - N4 delegated Codex happy path plus missing-authorization rejection;
  - N6 Codex normalization happy path plus invented-ref or forbidden-mutation rejection.
- Default L5b sampling:
  - each real Codex scenario should run `n=3`;
  - any hard contract failure fails the scenario;
  - quality/variance checks may use a default `>= 2/3` accepted-run threshold;
  - latency/cost should be recorded per run, with soft/hard thresholds to be defined.
- Hard contract failures include invalid schema, invented/disallowed refs, forbidden authority fields, missing required semantic slots, delegated Codex scope violations, diagnostic attempts to change N3 routing, N6 direct recheck mutation, and unapproved fallback.

## 2026-05-28 - N2 Real Codex Metrics
- Confirmed N2 L5b bounded micro-debate metrics in `07-acceptance-matrix.md`.
- P0 real Codex fixture set:
  - `clean_promote_candidate`;
  - `risk_and_recheck_candidate`.
- Each P0 N2 fixture should run `n=3`.
- Hard workflow gates:
  - exactly four calls;
  - fixed role order `promotion_supporter.draft`, `reviewer_critic.review`, `promotion_supporter.repair`, `synthesizer.final`;
  - no extra role, skipped role, dynamic debate expansion, or Codex single-agent control lane.
- Hard admission/final-contract gates:
  - every role output parses as structured contract;
  - refs come from the N1-derived context allowlist;
  - no forbidden authority fields or downstream mutation commands;
  - only admitted `synthesizer.final` may feed N3;
  - `synthesizer.final` includes all required N3-readable semantic slots;
  - every critic finding is resolved;
  - N1 carried risks/blockers/rechecks are preserved and explained.
- Default thresholds:
  - final admitted runs `>= 2/3`;
  - complete critic finding resolution `>= 2/3`;
  - invented refs `0/3`;
  - forbidden authority outputs `0/3`;
  - missing required semantic slots `0/3`;
  - unapproved fallback/profile switch `0/3`;
  - latency/cost/token usage records baseline until soft/hard budgets are defined.

## 2026-05-28 - L5c Provider/Model Variance Suite
- Confirmed L5c execution boundary in `07-acceptance-matrix.md`.
- L5c does not run in ordinary local development or ordinary CI.
- L5c should run in `nightly`, `release`, or explicit `canary` gates and does not replace L5b local real Codex acceptance.
- Default L5c coverage:
  - N2 schema pass rate, invented refs, critic coverage, semantic slot completeness, final admission stability, and latency/cost by profile;
  - N3 diagnostic adjunct usefulness and routing-boundary preservation;
  - N6 normalization accuracy, invented refs, over-interpretation, required-action quality, and classification stability;
  - cross-node profile/prompt/version drift in replay identity and drift diagnostic quality.
- N4 `codex_delegated` remains in L5b by default and is excluded from L5c unless future provider-delegated execution is explicitly admitted.
- Each selected provider/model/profile should run `n=3` on one or two representative fixtures per covered node.
- Hard contract failures should block release/canary gates; quality drift should produce tuning reports or issues unless explicit release thresholds make it blocking.
- L5c must not hide failures by fallback to another provider/profile.

## 2026-05-28 - Row-To-Test Mapping Shape
- Confirmed row-to-fixture/test-file mapping shape in `07-acceptance-matrix.md`.
- Mapping records use:
  - `acceptance_row_id`;
  - `primary_level`;
  - optional `secondary_level`;
  - `fixture_group`;
  - `test_file_pattern`;
  - `evidence_required`;
  - `run_gate`.
- Confirmed default group ownership:
  - `X`: L4 primary, L2/L3 secondary where relevant;
  - `N1`: L2 primary, L3 for replay/idempotency rows;
  - `N2`: L2/L5 primary, L1 for admission and L3 for idempotency;
  - `N3`: L2 primary, L5 for diagnostic adjunct and L1 for typed-action contract;
  - `N4`: L2/L3 primary, L5 for delegated Codex;
  - `N5`: L2/L3 primary, L1 for payload contract;
  - `N6`: L2/L5 primary, L4 for no-auto-loop and L1 for normalization/admission.
- Mapping content was completed in later entries for `X` and N1-N6.

## 2026-05-28 - Cross-Node Row Mapping
- Added `X` group row-to-test mapping content in `07-acceptance-matrix.md`.
- `X` rows are mapped as:
  - X-01, X-02, X-03, X-05, X-09: L4 workflow primary;
  - X-04 and X-10: L1 contract primary;
  - X-06 and X-07: L3 persistence/idempotency primary;
  - X-08: L2 node harness primary.
- Evidence expectations cover harness run traces, node invocation/non-invocation, authority row counts, replay results, drift diagnostics, retry traces, and sanitized LLM/admission diagnostics.
- Mapping uses test file patterns rather than fixed implementation file names until the implementation inventory is finalized.

## 2026-05-28 - N1 And N5 Row Mapping
- Added `N1` and `N5` row-to-test mapping content in `07-acceptance-matrix.md`.
- N1 mapping:
  - N1-01 through N1-05 and N1-08 are L2 node harness primary;
  - N1-06 and N1-07 are L3 persistence/idempotency primary;
  - L1 secondary is used for malformed input and warning/blocker propagation contracts.
- N1 evidence focuses on `ready_for_gate`, snapshot rows, N2 handoff refs, fail-before-persistence, non-ready append-only diagnostics, source/hash drift, replay row counts, and absence of LLM/downstream side effects.
- N5 mapping:
  - N5-01, N5-02, N5-04, N5-05, N5-06, and N5-10 are L2 node harness primary;
  - N5-03, N5-08, and N5-09 are L3 persistence/idempotency primary;
  - N5-07 is L1 contract primary with L2/L3 secondary.
- N5 evidence focuses on active bridge persistence, working-copy payload hash, source lineage refs, no-half-built bridge guarantees, version conflict/idempotency behavior, zero downstream intake artifacts, and no LLM authority.

## 2026-05-28 - N2/N3/N4/N6 Row Mapping
- Added remaining row-to-test mapping content in `07-acceptance-matrix.md`.
- Mapping status is now confirmed for `X` and N1-N6.
- N2 mapping:
  - L5 primary for real bounded micro-debate, fixed four-call workflow, final semantic layer, explicit provider/fallback profile;
  - L1 primary for admission/forbidden-output/semantic-gap contract cases;
  - L3 primary for support-run replay/idempotency and diagnostic persistence.
- N3 mapping:
  - L2 primary for deterministic gate behavior;
  - L1 primary for malformed typed action contract;
  - L3 primary for replay/drift;
  - L5 primary for Codex diagnostic adjunct.
- N4 mapping:
  - L2 primary for human/delegated decision outcomes and bridge non-creation;
  - L3 primary for current decision idempotency;
  - L5 primary for Codex delegated happy/rejection/draft-non-authority paths.
- N6 mapping:
  - L2 primary for structured direct feedback/recheck paths;
  - L1 primary for signal/action admission contract failures;
  - L5 primary for Codex normalization happy/rejection paths;
  - L3 primary for feedback fingerprint replay and diagnostic persistence;
  - L4 primary for no upstream mutation or automatic loop.
- L5b real Codex mappings use `local, release` gates; stub/contract/node/persistence mappings use `local, ci` unless release/canary profile behavior is being exercised.

## 2026-05-28 - Acceptance Implementation Landing Checklist
- Added the implementation landing checklist to `07-acceptance-matrix.md`.
- Confirmed existing repo conventions to preserve:
  - backend tests live under `apps/backend/src/**` and are collected by `apps/backend/scripts/run-node-tests.mjs`;
  - shared schema tests live under `packages/shared/src/**`;
  - topic-selection harness runners live under `.ai/scripts/topic-selection-*.mjs`;
  - runner evidence should follow the existing `.ai/.tmp/<runner>/<run-id>/` pattern.
- Confirmed T-108 test organization:
  - L1 shared contract/admission tests;
  - L2 v1c workflow harness and node service tests;
  - L3 Prisma-backed persistence/idempotency tests, not in-memory only;
  - L4 deterministic cross-node workflow runner/tests;
  - L5 deterministic stubs plus real Codex/provider runners.
- Proposed fixture builder module: `apps/backend/src/services/topic-selection-v1c-acceptance-scenario-fixtures.ts`.
- Fixture group ids must match acceptance mapping ids, such as `n1.ready_snapshot`, `n5.bridge_replay_idempotency`, and `workflow.forward_only_happy_chain`.
- Required script entrypoints for implementation:
  - `topic-selection:v1c-harness-acceptance`;
  - `topic-selection:v1c-real-codex-acceptance`;
  - `topic-selection:v1c-provider-canary`.
- Local T-108 acceptance should run `pnpm typecheck`, `pnpm test`, deterministic harness acceptance, and real Codex acceptance.
- Real Codex blocked environment remains a blocked acceptance status, not a passing skip.
- Evidence output is standardized under `.ai/.tmp/topic-selection-v1c-acceptance/<run-id>/`.
- Required evidence includes manifest, row results, harness trace, persistence summary, and L5 LLM/Codex summaries.
- Evidence must remain sanitized and oriented to harness robustness, LLM/operator repair, and prompt/profile tuning rather than audit/product surfaces.
- Implementation order is:
  1. contracts and fixture builders;
  2. N1/N5 deterministic persistence-heavy rows;
  3. N2/N3/N4/N6 node and contract rows;
  4. L4 cross-node workflow acceptance;
  5. L5b real Codex and L5c provider/canary runners.

## 2026-05-28 - Implementation Started: Fixtures And N1/N5 Deterministic Rows
- Added `apps/backend/src/services/topic-selection-v1c-acceptance-scenario-fixtures.ts`.
- The fixture module provides:
  - stable v1c acceptance refs and id factory;
  - N1 package/readiness/trace/bundle graph builders;
  - a v1b topic-package repository fixture;
  - N5 promotion bridge handoff and provider fixtures.
- Added `apps/backend/src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts`.
- Initial N1 acceptance coverage:
  - ready snapshot handoff with carry-forward risks/blockers/memory/recheck refs;
  - no LLM/provider metadata in deterministic N1 control-plane records;
  - missing bundle and workspace drift fail before snapshot persistence;
  - non-ready diagnostic snapshot stops handoff;
  - same bundle id with changed hash returns `VERSION_CONFLICT` without duplicate writes.
- Initial N5 acceptance coverage:
  - deterministic `bridge_ready` creation with no downstream intake refs;
  - no LLM/provider metadata in deterministic N5 control-plane records;
  - invalid entry, ineligible decision, and missing selected evidence fail before bridge writes;
  - exact replay returns existing bridge without duplicate writes;
  - same source promotion decision with drifted handoff now returns `VERSION_CONFLICT`.
- Updated `TopicSelectionV1cPaperProjectBridgeService` to enforce required bridge semantics before bridge persistence:
  - `claim_ceiling`;
  - `contribution_summary`;
  - `evaluation_plan`;
  - selected evidence;
  - condition data for `promote_with_conditions`.
- Updated N5 bridge replay behavior so an existing bridge is returned only when the current source handoff still matches the existing bridge hashes.
- Verification run:
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-input-service.unit.test.ts`;
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`;
  - `pnpm --filter @paper-engineering-assistant/backend test` (`884` pass, `2` skipped, `0` failed).

## 2026-05-28 - Implementation Continued: N2/N3/N4/N6 Node/Contract Rows
- Added `apps/backend/src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts`.
- Initial N2/N3/N4/N6 coverage was service-level. The product N2/N3 split and harness runner were completed later in this task; this checkpoint is retained as historical implementation evidence.
- N2 implementation findings and changes:
  - Existing `llm_draft` behavior silently fell back to deterministic support when the LLM gateway was missing or failed.
  - Updated `llm_draft` to fail closed by default: missing gateway returns `GATE_CONSTRAINT_FAILED`; invocation failure returns 502 `INTERNAL_ERROR` with `failure_code=LLM_INVOCATION_FAILED`.
  - Added an N3-readable `n3_semantic_layer` to the promotion dossier payload with claim ceiling, contribution, evaluation, evidence, accepted-risk, recheck-obligation, critic-resolution, and readiness-coverage slots.
  - No bounded micro-debate runtime was implemented in this step; L5b real Codex and four-call workflow coverage was completed later.
- N3 implementation findings and coverage:
  - Current service-level dispositions remain richer than the final harness routing contract (`blocked`, `recheck_required`, `needs_revision`, `park`, `ready_for_human_decision`).
  - Acceptance rows isolate service outcomes and document that the future harness adapter must normalize them to the three agreed routing outcomes.
  - Added coverage for deterministic ready handoff and typed action-required output from `ArgumentReadinessMiniCheck` gaps.
- N4 implementation coverage:
  - Ready gate can create a promote-with-conditions authority record and commitment profile through the human promotion decision service.
  - Action-required gate rejects promote-class decisions and can persist a non-bridge action decision with typed required actions.
  - Codex-delegated N4 execution was completed later through L5b acceptance.
- N6 implementation findings and changes:
  - Feedback replay now checks `feedback_fingerprint` before invoking the recheck sink or writing a new feedback record.
  - Added repository support for `findFeedbackByFingerprint` in both in-memory and Prisma downstream feedback repositories.
  - Exact replay returns the existing feedback/recheck projection and avoids duplicate recheck sink calls.
  - Codex normalization was completed later through L5b acceptance.
- Verification run:
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-input-service.unit.test.ts`;
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`.

## 2026-05-28 - Implementation Continued: L4 Cross-Node Service-Level Acceptance
- Added `apps/backend/src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts`.
- This is deterministic service-level cross-node acceptance, not the final v1c harness runner.
- Coverage landed:
  - forward-only `N1 -> N2/N3 -> N4 -> N5` happy chain reaches one active `PaperProjectBridge`;
  - each authority boundary writes exactly once and no node is skipped;
  - N3 `action_required`/`needs_revision` stop prevents N4/N5 authority writes;
  - exact replay across N1-N5 returns existing records without duplicate writes;
  - N6 `recheck_opened` records feedback/recheck projection without invoking or mutating N1-N5 authority records.
- Findings:
  - The service chain is stable enough for deterministic L4 acceptance.
  - At this checkpoint v1c still lacked a dedicated harness adapter/runner; the adapter and manifest runner were added later and are now the canonical acceptance surface.
  - At this checkpoint N2/N3 service dispositions still needed normalization; the later adapter now normalizes rich domain state to harness-facing routing outcomes.
- Verification run:
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-node-contract-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-deterministic-acceptance.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-gate-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-downstream-feedback-recheck-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-human-promotion-decision-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-paper-project-bridge-service.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-promotion-input-service.unit.test.ts`;
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`;
  - `pnpm --filter @paper-engineering-assistant/backend test` (`884` pass, `2` skipped, `0` failed).

## 2026-05-28 - Implementation Continued: Harness Adapter And Manifest Runner
- Added `apps/backend/src/services/topic-selection-v1c-harness-adapter.ts`.
- The adapter normalizes service-level records into harness-facing node results for N1-N6:
  - stable node ids and node names;
  - coarse routing outcomes;
  - automation behavior (`advance`, `stop`, or `record_only`);
  - authority refs, diagnostic refs, source refs, required actions, loopback hints, and snapshot hashes;
  - provider involvement metadata for diagnostic routing.
- The adapter encodes the simplified harness routing decisions agreed during alignment:
  - N3 rich gate dispositions normalize to `ready_for_human_decision`, `action_required`, or `parked`;
  - N4 decisions normalize to `bridge_authorized`, `action_required`, or `closed_no_auto_progress`;
  - N6 feedback normalizes to `recheck_opened`, `feedback_recorded`, or `invalid_feedback`.
- Added `apps/backend/src/services/topic-selection-v1c-harness-adapter.unit.test.ts`.
- Added `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` and root script `topic-selection:v1c-harness-acceptance`.
- The deterministic runner writes evidence under `.ai/.tmp/topic-selection-v1c-acceptance/<run-id>/`:
  - `manifest.json`;
  - `acceptance-row-results.jsonl`;
  - `row-results.json`;
  - `harness-trace.json`;
  - `node-trace.json`;
  - `persistence-summary.json`.
- Current manifest-producing runner covers representative local L1-L4 rows:
  - `X-01`;
  - `N1-01`;
  - `N3-01`;
  - `N4-01`;
  - `N5-01`;
  - `X-03`;
  - `N3-06`;
  - `X-06`;
  - `X-09`;
  - `N6-01`.
- Latest verified local evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-2026-05-28/manifest.json`;
  - status `pass`;
  - `10` row results;
  - `14` node trace entries.
- Findings:
  - `TS_NODE_PROJECT=apps/backend/tsconfig.json` is required for this root-level ts-node runner so backend Node typings are loaded correctly.
  - At this checkpoint product/native harness orchestration had not yet consumed this adapter; this was closed by `TopicSelectionWorkflowHarnessService.runV1cHarnessConsumptionScenario`.
  - At this checkpoint N2/N3 were still coupled in the product service; this was closed by explicit N2-only and N3-from-support entry points.
  - At this checkpoint L5b real Codex acceptance was still pending; it was later completed for N2 bounded micro-debate, N3 diagnostic adjunct, N4 delegated execution, and N6 normalization.
- Verification run:
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-harness-adapter.unit.test.ts`;
  - `node --test --loader ts-node/esm src/services/topic-selection-v1c-cross-node-acceptance.unit.test.ts`;
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`;
  - `TOPIC_SELECTION_V1C_ACCEPTANCE_RUN_ID=t-108-v1c-harness-2026-05-28 pnpm topic-selection:v1c-harness-acceptance`.

## 2026-05-28 - Implementation Continued: L5b Real Codex Acceptance
- Added L5b prompt/config registry entries:
  - `.ai/llm-config/registry/prompt_templates.yaml`;
  - `.ai/llm-config/registry/config_keys.yaml`.
- Added `.ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs`.
- Added root script `topic-selection:v1c-real-codex-acceptance`.
- Runner behavior:
  - runs real Codex CLI sessions, not mocked LLM fixtures;
  - writes each prompt, last message, stdout, and stderr under `.ai/.tmp/topic-selection-v1c-acceptance/<run-id>/llm-codex/`;
  - writes `manifest.json`, `acceptance-row-results.jsonl`, `harness-trace.json`, `persistence-summary.json`, and `llm-codex/summary.json`;
  - distinguishes `pass`, `fail_contract`, and `blocked_environment`;
  - exits non-zero for contract failure or blocked real Codex environment;
  - uses the bundled Codex binary by default when available to avoid older CLI/model incompatibility.
- L5b coverage landed:
  - N2 bounded micro-debate with fixed role order and exactly four Codex calls per sample;
  - N2 final N3-readable semantic layer admission;
  - N2 explicit Codex profile/no fallback metadata;
  - N3 Codex diagnostic adjunct after deterministic `action_required` without routing mutation;
  - N4 Codex-delegated happy path through deterministic N4 service admission;
  - N4 missing-authorization rejection and draft-non-authority check;
  - N6 Codex normalization happy path through deterministic N6 service admission;
  - N6 Codex normalization rejection for malformed/invented-ref/forbidden-mutation style payloads.
- Full local L5b evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-real-codex-full-2026-05-28/manifest.json`;
  - status `pass`;
  - `full_l5b_acceptance=true`;
  - `10` row results;
  - `15` node trace entries;
  - `36` real Codex calls;
  - `0` hard failures.
- Scenario sample counts:
  - N2 bounded micro-debate: `6` samples (`2` fixtures x `3` samples x `4` role calls);
  - N3 diagnostic adjunct: `3` samples;
  - N4 Codex delegated happy path: `3` samples;
  - N4 Codex delegated rejection: `3` samples;
  - N6 feedback normalization: `3` samples;
  - N6 feedback normalization rejection: `3` samples.
- Findings and fixes from real Codex smoke/full work:
  - The Homebrew `codex` binary was older and rejected the default configured model; the runner now prefers `/Applications/Codex.app/Contents/Resources/codex` when available.
  - N3 diagnostic validation initially omitted refs carried through deterministic `required_actions`; allowed-ref validation now includes those typed action refs.
  - N4 delegated validation initially omitted condition refs from the delegated template; allowed-ref validation now includes condition refs while preserving invented-ref rejection.
  - N2 final prompt template initially encouraged a fragile optional empty `forbidden_authority_fields` key; the template was narrowed and the validator now scans forbidden authority keys directly.
  - N6 validation initially treated existing `paper_project_bridge_id` as forbidden authority output; the runner now allows it only as N6 input locator metadata.
  - N6 runner initially used `created_by=codex_normalization`; service actor validation requires standard actor types, so Codex provenance stays in evidence and the domain write uses `created_by=system`.
- Verification run:
  - `node --check .ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs`;
  - `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`;
  - `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs`;
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`;
  - `TOPIC_SELECTION_V1C_REAL_CODEX_RUN_ID=t-108-v1c-real-codex-smoke-2026-05-28 TOPIC_SELECTION_V1C_REAL_CODEX_GATE=smoke TOPIC_SELECTION_V1C_REAL_CODEX_SAMPLE_COUNT=1 TOPIC_SELECTION_V1C_REAL_CODEX_REASONING_EFFORT=low pnpm topic-selection:v1c-real-codex-acceptance`;
  - `TOPIC_SELECTION_V1C_REAL_CODEX_RUN_ID=t-108-v1c-real-codex-full-2026-05-28 TOPIC_SELECTION_V1C_REAL_CODEX_GATE=local TOPIC_SELECTION_V1C_REAL_CODEX_SAMPLE_COUNT=3 TOPIC_SELECTION_V1C_REAL_CODEX_REASONING_EFFORT=low pnpm topic-selection:v1c-real-codex-acceptance`.

## 2026-05-29 - LLM Model/Reasoning Default Alignment
- Current default OpenAI text model routing is standardized on `gpt-5.5`; older executable defaults and current contract/test expectations using `gpt-5.4-mini`, `gpt-5-mini`, or `gpt-5.2` were updated.
- Current default reasoning for topic-selection provider profiles is `reasoning_depth=high`; `openai-balanced`, `openai-quality`, and `openai-deep-reasoning` all resolve to high OpenAI reasoning effort through `BackendLlmGateway`.
- Direct structured-output LLM call sites that do not route through the topic-selection profile registry now pass a shared high-reasoning JSON-schema normalized params object:
  - literature key-content section/consolidation extraction;
  - auto-pull quality scoring;
  - topic-selection resource sampling;
  - v1b N4/N6/N8 direct services;
  - v1c promotion support draft generation.
- Current real Codex defaults are aligned to `gpt-5.5` plus high reasoning:
  - `~/.codex/config.toml` now has `model=gpt-5.5` and `model_reasoning_effort=high`;
  - `.ai/scripts/topic-selection-v1c-real-codex-acceptance.mjs` now defaults `TOPIC_SELECTION_V1C_REAL_CODEX_REASONING_EFFORT` to `high`;
  - v1b external Codex runner already defaulted to high reasoning.
- Historical verification logs above and in T-107 still preserve the old command/model values as historical evidence; current executable defaults and current architecture/contract docs are the source of truth for new runs.

## 2026-05-29 - Barrel Export List and High-Reasoning Real Codex Hardening
- The existing research-lifecycle barrel export surface already included `topic-selection-v1a-workflow-harness-contracts`, but the aggregate barrel export list test did not include that split module in its expected runtime value set. The test now imports that module and includes its keys in the expected barrel surface.
- The first full high-reasoning v1c real Codex acceptance rerun reached N4 and then timed out on N4 delegated sample 2 after `240000ms`.
- N4 prompt scope was narrowed to the actual delegated-candidate contract:
  - explicit authorization envelope;
  - compact N4 authorization context;
  - deterministic snapshot hash and boundary refs;
  - condition template;
  - no full gate handoff/read-model payload.
- N3, N4, and N6 real Codex prompts now explicitly disallow file inspection and shell commands so the harness tests provider JSON contract-following instead of tool workflow behavior.
- Deterministic service admission and contract validation remain authoritative; the Codex output is still only a candidate, and N4 bridge/promotion authority is created only by deterministic N4 service admission.
- The passing rerun used local gate, `3` samples, real Codex `gpt-5.5` with high reasoning, and produced `full_l5b_acceptance=true`.

## 2026-05-29 - L5c Provider/Canary Runner
- Added `.ai/scripts/topic-selection-v1c-provider-canary.mjs` and root script `topic-selection:v1c-provider-canary`.
- The runner uses `TopicSelectionAgentOrchestratorService` and `BackendLlmGateway`; it does not import provider SDKs directly and does not silently fallback between profiles/providers.
- Added provider-canary profile ids and model options for v1c N2, N3, N4, and N6 in `apps/backend/src/services/topic-selection-model-profile-registry-service.ts`.
  - provider-canary profiles are `provider_llm` + `acceptance` only;
  - Codex and mocked execution modes are not eligible for these profile ids;
  - default OpenAI canary model is `gpt-5.5` with high reasoning and low creativity.
- Added corresponding SSOT registry entries in `.ai/llm-config/registry/model_profiles.yaml` and config key registry entries in `.ai/llm-config/registry/config_keys.yaml`.
- The runner writes evidence under `.ai/.tmp/topic-selection-v1c-acceptance/<run-id>/`:
  - `manifest.json`;
  - `acceptance-row-results.jsonl`;
  - `harness-trace.json`;
  - `persistence-summary.json`;
  - `llm-provider-canary/summary.json`;
  - per-call `prompt.md`, `request.json`, `result.json`, `audit-snapshot.json`, and `structured-output.json` when structured output is available.
- Current smoke coverage:
  - N2 provider bounded micro-debate with fixed four LLM calls and final semantic-layer validation;
  - N3 provider diagnostic adjunct with deterministic routing boundary preservation;
  - N4 explicitly authorized provider-delegated candidate, deterministic N4 admission, missing-authorization rejection, and draft-non-authority check;
  - N6 provider normalization happy path and malformed/invented-ref rejection.
- Full L5c acceptance requires `TOPIC_SELECTION_V1C_PROVIDER_CANARY_GATE=canary|nightly|release` and `TOPIC_SELECTION_V1C_PROVIDER_CANARY_SAMPLE_COUNT>=3`; `smoke` remains a developer/provider sanity gate and is not full acceptance.
- Findings and fixes from provider smoke work:
  - initial schema inference emitted invalid empty-array `items` schemas, which OpenAI rejected; empty arrays now emit a strict typed empty-object item schema with `maxItems:0`;
  - prompt-only ref instructions were insufficient: provider outputs repeatedly rewrote `version_id:null` refs into strings, including malformed strings; structured-output schema inference is now ref-aware and constrains functional refs with exact enum/null fields while deterministic allowed-ref validation remains authoritative;
  - smoke runs could wait too long on a single high-reasoning provider call; smoke now applies a `90000ms` provider timeout override, while full `canary|nightly|release` gates use registry profile timeouts unless explicitly overridden;
  - provider canary gate/full-acceptance metadata now follows the confirmed L5c boundary: `smoke` and partial sample runs pass only as sanity evidence, not full L5c.
- Latest verified smoke evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-smoke-2026-05-29-r6/manifest.json`;
  - status `pass`;
  - `full_l5c_acceptance=false`;
  - `9` row results;
  - `4` node trace entries;
  - `8` real provider structured outputs;
  - `0` hard failures.
- Full L5c canary evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-provider-canary-full-2026-05-29/manifest.json`;
  - gate `canary`;
  - sample count `3`;
  - model option suffix `openai-balanced`;
  - status `pass`;
  - `full_l5c_acceptance=true`;
  - `9` row results;
  - `15` node trace entries;
  - `36` real provider structured outputs;
  - `0` hard failures;
  - N2 bounded micro-debate covered `6` samples (`2` fixtures x `3` samples x `4` calls);
  - N3 diagnostic adjunct covered `3` samples;
  - N4 provider-delegated happy path and missing-authorization rejection each covered `3` samples;
  - N6 feedback normalization happy path and invented-ref rejection each covered `3` samples;
  - N2 telemetry summary: `24` OpenAI `gpt-5.5` calls, `0` retries, `0` timeouts, max elapsed `16181ms`, and `108147` total tokens.

## 2026-05-29 - Product/Native Harness Consumption
- Added `TopicSelectionWorkflowHarnessService.runV1cHarnessConsumptionScenario`.
- The method consumes v1c adapter `TopicSelectionV1cHarnessNodeResult[]` directly instead of re-running node services.
- Native consumption rules are intentionally narrow:
  - forward-only N1 -> N2 -> N3 -> N4 -> N5 progression is accepted only when each node emits `automation=advance`;
  - `automation=stop` is terminal and any following node is rejected;
  - N5 terminal output may be followed by N6 as a downstream ingress;
  - N6 must remain `record_only` and cannot auto-advance or re-enter N1-N5.
- The emitted trace uses `WorkflowHarnessV1cConsumptionScenarioTrace@v1` and carries:
  - adapter version;
  - consumed node ids;
  - terminal node/routing/automation;
  - error code/message;
  - assertions.
- Added focused tests in `apps/backend/src/services/topic-selection-workflow-harness-service.unit.test.ts`:
  - forward-only happy chain to N5;
  - stop-after-N3 action-required rejection;
  - N6 record-only downstream ingress after N5.
- This closes the initial product/native harness consumption gap for the adapter contract. It does not implement PaperImplementation and does not add automatic loopback execution.

## 2026-05-29 - Expanded Final-Row Deterministic Coverage
- Expanded `.ai/scripts/topic-selection-v1c-harness-acceptance.mjs` from `10` to `15` manifest rows.
- Added deterministic final-row coverage for:
  - `N3-08 ready_is_not_promote`: N3 ready handoff does not create N4/N5 authority;
  - `N4-11 no_bridge_creation`: N4 `bridge_authorized` writes decision/profile authority only and does not create a bridge;
  - `N5-10 no_downstream_side_effect`: N5 stops at `PaperProjectBridge` handoff and does not invoke downstream intake/recheck/LLM authority;
  - `N6-02 structured_no_recheck`: no-recheck feedback records feedback only with no recheck projection;
  - `N6-10 no_upstream_mutation_auto_loop`: recheck-producing feedback does not mutate or auto-trigger N1-N5.
- Latest deterministic harness evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-expanded-2026-05-29/manifest.json`;
  - status `pass`;
  - `15` row results;
  - `27` node trace entries;
  - persistence summary at this checkpoint still reported N2/N3 together as promotion gate support bundles. The closure runner now reports split `promotion_decision_support` and `promotion_gate_check` counts.
- The former manifest architecture note is now closed by the product N2/N3 service split below.

## 2026-05-29 - Product N2/N3 Service Split
- Split `TopicSelectionV1cPromotionGateService` product execution into separate N2 and N3 entry points:
  - `createPromotionDecisionSupport` creates only `PromotionDecisionSupport`, `PromotionDossier`, and N2 support control-plane artifacts.
  - `createPromotionGateCheckFromSupport` consumes an existing support run by `promotion_decision_support_id` or `support_run_key` and creates only `ArgumentReadinessMiniCheck`, `PromotionGateCheck`, and N3 gate control-plane artifacts.
  - `createPromotionGateSupport` remains as a compatibility wrapper that runs N2 then N3.
- Repository contracts now expose split persistence/read methods:
  - `createSupportBundle`;
  - `createGateCheckBundle`;
  - `findSupportBundleBySupportRunKey`;
  - `findSupportBundleByDecisionSupportId`;
  - `findGateCheckBundleBySupportRunKey`.
- HTTP route semantics now match the node split:
  - `POST /topic-selection/v1c/promotion-decision-support` is N2-only and returns support/dossier.
  - `POST /topic-selection/v1c/promotion-gate-checks` is N3 from existing support when given `promotion_decision_support_id` or `support_run_key`.
  - The gate route still accepts the old `promotion_input_snapshot_id` payload as a compatibility path and internally runs the wrapper.
- Test evidence now asserts that N2 persistence does not write N3 gate artifacts until N3 explicitly consumes the persisted support.
- Acceptance harness recording was updated to count split N3 gate writes instead of the removed monolithic `createBundle` write path.

## 2026-05-29 - Closure Review And Cleanup
- Removed stale dual-track evidence from the deterministic v1c harness acceptance runner:
  - acceptance execution now calls split N2 `createPromotionDecisionSupport` and split N3 `createPromotionGateCheckFromSupport`;
  - `normalizeN2PromotionSupport` can normalize the persisted N2 support bundle before N3 exists;
  - manifest `pending_gaps` is empty for the deterministic harness run;
  - persistence summaries now report `promotion_decision_support` and `promotion_gate_check` separately.
- Removed the unused controller-level combined promotion-gate handler. The service-level `createPromotionGateSupport` remains only as a compatibility wrapper for legacy callers and compatibility tests.
- Updated service-level acceptance tests that prove v1c orchestration to use the split N2/N3 path instead of the compatibility wrapper.
- Final orchestration surface is the harness adapter result. Rich dispositions, semantic-layer details, and compatibility wrapper responses are persisted/readable diagnostics, not alternate routing semantics.
- Final nonlinear policy is deliberately narrow:
  - N1-N5 are forward-only within one attempt;
  - `automation=stop` is terminal for the current attempt;
  - N6 is record-only ingress and may create recheck work, but cannot auto-loop into N1-N5;
  - repair, refresh, or recheck execution requires an explicit later attempt from the appropriate frozen input.
- Latest closure evidence:
  - `.ai/.tmp/topic-selection-v1c-acceptance/t-108-v1c-harness-closure-2026-05-29/manifest.json`;
  - status `pass`;
  - `15` row results;
  - `27` node trace entries;
  - `pending_gaps=[]`.
