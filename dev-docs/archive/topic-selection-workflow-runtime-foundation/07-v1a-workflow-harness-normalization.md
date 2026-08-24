# v1a WorkflowHarness Normalization

## Decision
- Decision type: `REUSE_TASK`
- Owner task: `T-088 topic-selection-workflow-runtime-foundation`
- Semantic source: `T-089 topic-selection-agent-workflow-review`
- Scope: complete v1a product workflow after an upstream TitleCard exists.
- Excluded from this slice: title-card creation, resource sampling, v1b, v1c, bridge, downstream, and desktop UI.

This slice exists because v1a is currently business-clear and route-testable, but only `topic-selection.v1a.generate-need-candidate.v1` has the normalized `WorkflowHarness` execution standard needed for automated orchestration.

Important correction: the complete v1a workflow starts at `TopicSeed`. The earlier evidence-map-first view described only the evidence-to-need subchain and would leave TopicSeed, resource-pool snapshot, SearchPlan, and SearchRun choreography in scripts.

## Target Standard
Every normalized v1a node MUST be callable by an orchestrator without knowing route choreography.

Each node runner MUST expose:
- `scenario_id`
- `scenario_case_id`
- `node_id`
- `workflow_run_id`
- `node_attempt_id`
- `workspace_id`
- `title_card_id`
- versioned input refs
- normalized node input
- normalized node result
- `scenario_status`
- `authority_refs`
- `artifact_refs`
- `audit_refs`
- `warning_codes`
- `blocker_codes`
- assertion results
- harness trace artifact

Each node runner MUST preserve existing authority boundaries:
- Domain services and repositories write authority objects.
- `WorkflowHarness` coordinates, validates, traces, and asserts.
- `AgentOrchestrator` is used only for model-like nodes allowed by the node policy.
- Deterministic and human-review nodes MUST NOT call provider, Codex, or debate runtime.

Each node result MUST have stable shape across success, blocked, and require-human-review paths. Mode differences belong in provenance, not alternate DTOs.

## Automation Callability Rubric
Every v1a node is evaluated on a separate automation-callability dimension.

The accepted statuses are:
- `not_callable`: route/service may exist, but automated execution still requires script-owned request choreography.
- `partially_callable`: the service boundary is clear, but no normalized harness runner or stable blocked result exists.
- `callable`: a `WorkflowHarness` runner exists with stable input/result, success and blocked paths, assertions, trace artifact, and preserved authority-write boundary.
- `blocked`: the node cannot safely be automated because its authority boundary or input contract is still ambiguous.

A node can be `implementation_ready` but still `not_callable`. That means we can implement its runner next, not that automation is already complete.

## Complete v1a Node Inventory

| Order | Node | Policy status | Automation callability | Target runner |
|---:|---|---|---|---|
| 1 | `topic-selection.v1a.create-topic-seed.v1` | `implementation_ready` | `callable` | `runCreateTopicSeedScenario` |
| 2 | `topic-selection.v1a.snapshot-literature-resource-pool.v1` | `implementation_ready` | `callable` | `runSnapshotLiteratureResourcePoolScenario` |
| 3 | `topic-selection.v1a.create-search-plan.v1` | `implementation_ready` | `callable` | `runCreateSearchPlanScenario` |
| 4 | `topic-selection.v1a.record-search-run.v1` | `implementation_ready` | `callable` | `runRecordSearchRunScenario` |
| 5 | `topic-selection.v1a.build-evidence-map.v1` | `implementation_ready` | `callable` | `runBuildEvidenceMapScenario` |
| 6 | `topic-selection.v1a.generate-need-candidate.v1` | `implementation_ready` | `callable` | keep as baseline |
| 7 | `topic-selection.v1a.validate-need-adjudication.v1` | `implementation_ready` | `callable` | `runValidateNeedAdjudicationScenario` |
| 8 | `topic-selection.v1a.human-confirm-need.v1` | `implementation_ready` | `callable` | `runHumanConfirmNeedScenario` |
| 9 | `topic-selection.v1a.publish-v1b-input-bundle.v1` | `implementation_ready` | `callable` | `runPublishV1bInputBundleScenario` |

Resource sampling is intentionally not listed as a v1a node. It remains the v1a input layer and should be normalized separately after its policy moves beyond draft.

TitleCard creation is also not listed as a v1a node. The v1a harness consumes an existing TitleCard and starts by creating a TopicSeed from it.

## Node 1: Create Topic Seed

### Automation Goal
Convert `POST /topic-selection/v1a/topic-seeds/from-title-card` from script-owned setup into the first normalized v1a node.

### Locked Decisions
- N1-AM01: TopicSeed LLM boundary amendment. `topic-selection.v1a.create-topic-seed.v1` remains deterministic with `execution_mode=none`; it MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
- N1-AM01: Optional semantic preparation before Node 1 MAY draft `intent_summary` and `scope_notes` through human input, Codex, provider LLM, or fixture, but this is input preparation only.
- N1-AM01: A future `TopicSeedIntentDraft@v1` helper MAY be introduced as a pre-node value artifact/profile. It MUST NOT write `TopicSelectionTopicSeed` authority and MUST NOT be recorded as an N3 follow-up decision.
- N1-AM01: Current implementation locks no executable TopicSeed draft/review profile. Node 1 freezes only the final accepted input in its input snapshot.

### Node Input
MUST include:
- `title_card_ref`
- title-card version or currentness token when available
- `intent_summary`
- `scope_notes`
- `seed_version`
- policy version
- output schema version

### Node Result
MUST include:
- `topic_seed_ref`
- `topic_seed_id`
- `seed_version`
- title-card lineage refs
- control-plane input snapshot ref
- workflow run ref
- gate result ref
- transition ref
- harness trace artifact ref

### Acceptance Checks
- missing or stale TitleCard blocks before authority creation.
- empty final intent blocks before authority creation.
- `scope_notes` may be null, but null must remain explicit in the input snapshot.
- `seed_kind` is fixed to `title_card` by the service and is not accepted as caller input.
- duplicate/idempotency behavior is explicit in the runner result, not inferred by script retry behavior.
- no model-like executor is allowed.
- successful result can feed resource-pool snapshot without script-side ref repair.

## Node 2: Snapshot Literature Resource Pool

### Automation Goal
Make the resource-pool snapshot a stable v1a authority boundary rather than an implicit script step.

### Locked Decisions
- N2-D01: This node only materializes `TopicSelectionLiteratureResourcePoolSnapshot`; it MUST NOT perform sampling, selection, evidence-role classification, or evidence-polarity judgment.
- N2-D02: The normalized v1a path uses the TitleCard evidence basket as the single source of included literature. A `ResourceSampleSet` MAY appear as upstream provenance only after its selected literature has already been attached to the evidence basket.
- N2-D03: The normalized harness path supports only `source_scope=title_card_evidence_basket`. Route/shared-contract compatibility values `manual_selection` and `search_result` remain non-normalized and MUST return a blocked harness result until explicit resolvers are designed.
- N2-D04: The node blocks only traceability/authority-creation failures. Resource maturity gaps such as incomplete key content, abstract, source count, pipeline readiness, stale/duplicate status, or fulltext readiness are recorded as `source_health_summary.warning_codes` unless they also break traceability.
- N2-D05: `snapshot_hash` is the replay identity for snapshot contents and source-health state. It MUST include stable content inputs and policy version, and MUST exclude repository-generated ids, control-plane ids, trace artifact ids, `created_at`, and `created_by`.
- N2-D06: The target automation boundary is `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario`. The runner MUST call `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot`, MUST NOT write repositories directly, and MUST return one normalized success/blocked result shape.
- N2-D07: Control-plane records are authoritative audit facts; harness trace artifact `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1` is automation execution evidence. The trace MUST cross-reference control-plane refs but MUST NOT replace them.
- N2-D08: SearchPlan handoff is snapshot-authority based. Node 3 MUST consume the `LiteratureResourcePoolSnapshot` produced by Node 2 and MUST NOT re-read the mutable TitleCard evidence basket, `ResourceSampleSet`, selected refs, or current search results as resource truth.
- N2-D09: Repeated equivalent runs are append-only by default. They MAY create distinct snapshot authority ids, but MUST keep the same `snapshot_hash`; automatic reuse by hash requires a future explicit policy and runner flag.
- N2-D10: Implementation readiness is accepted as `implementation_ready` with moderate bounded complexity. Automation is now `callable` after runner, trace schema, service hardening, and tests were implemented.
- N2-AM01: Literature resource pool snapshot LLM boundary confirmation. Node 2 remains deterministic with `execution_mode=none`; it MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
- N2-AM01: Resource sampling, evidence-role classification, evidence-polarity judgment, and other semantic decisions belong upstream before the evidence basket is frozen or downstream after snapshot handoff; Node 2 only snapshots traceable resource state.

### Node Input
MUST include:
- `title_card_ref`
- `topic_seed_ref`
- `source_scope`, fixed to `title_card_evidence_basket` for normalized harness execution
- evidence-basket ref or basket currentness expectation
- optional resource sample set provenance ref, which MUST NOT directly drive included literature refs
- source readiness expectations
- policy version
- output schema version

### Node Result
MUST include:
- `literature_resource_pool_snapshot_ref`
- `snapshot_version`
- `snapshot_hash`
- included resource refs
- excluded or unavailable resource refs with reason codes
- source scope
- control-plane refs
- harness trace artifact ref
- downstream handoff packet containing snapshot ref, version, hash, source scope, literature refs, content source refs, and source-health summary

Blocked results MUST include:
- `status=blocked`
- `blocker_codes`
- normalized node input
- no `TopicSelectionLiteratureResourcePoolSnapshot` authority refs
- harness trace artifact ref when trace recording is available

### Acceptance Checks
- TopicSeed title-card lineage mismatch blocks.
- included resource refs are derived from the TitleCard evidence basket, not directly from caller-supplied selected refs or ResourceSampleSet contents.
- `manual_selection` or `search_result` source scopes return `UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A` in the harness path.
- unresolved evidence-basket literature ids return `MISSING_LITERATURE_RECORD` before snapshot authority creation.
- missing-literature blocked results preserve the control-plane input snapshot, readiness gate, and transition attempt refs created before repository persistence is skipped.
- `topic_seed_ref` must be a concrete TopicSeed authority ref with version and title-card lineage before snapshot authority creation.
- resources outside the allowed source scope block.
- key-content, abstract, source-count, pipeline-readiness, stale/duplicate, and fulltext-readiness gaps are represented as source-health warnings, not hard blockers, unless traceability fails.
- same TopicSeed, same evidence basket state, same source scope, same source health summary, and same policy version produce the same `snapshot_hash`.
- repeated runs with different control-plane ids or harness trace artifact ids do not change `snapshot_hash`.
- repeated equivalent runs may create new snapshot authority refs, but must keep distinct audit/control-plane evidence for each attempt.
- runner does not silently reuse an existing snapshot authority by `snapshot_hash`.
- runner calls the search-resource domain service and does not write the repository directly.
- runner can be invoked as a single node without script-side request choreography or downstream ref repair.
- harness trace artifact records normalized input/result, snapshot hash, source-health summary, authority refs, control-plane refs, blockers, warnings, and assertions.
- harness trace artifact does not record hidden reasoning, secrets, provider logs, raw LLM transcripts, or raw debate transcripts.
- SearchPlan handoff uses the snapshot authority ref; `snapshot_hash` is only a replay/assertion check and does not replace the snapshot ref.
- if the evidence basket changes after snapshot creation, the changed resources can affect SearchPlan only after a new LiteratureResourcePoolSnapshot is created.
- no provider, Codex, or debate runtime is allowed.
- successful result can feed SearchPlan without script-side ref repair.

### Implementation Readiness Review
Decision: `implementation_ready`, `automation_callability=callable`.

Complexity is moderate and bounded because the node is deterministic, has an existing route/service/repository authority path, and reuses the control-plane gate/transition pattern. The implementation does not require model routing, provider calls, debate runtime, schema migration, or new persistence objects.

Implementation risks are explicit and testable:
- align `snapshot_hash` with the locked content replay payload;
- expand `source_health_summary.warning_codes` for maturity warnings without adding hard blockers;
- add `runSnapshotLiteratureResourcePoolScenario` with stable success/blocked result shapes;
- record `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1`;
- prove append-only repeated runs keep the same hash for equivalent content;
- prove SearchPlan handoff uses snapshot authority, not mutable basket state.

Implementation result:
- `runSnapshotLiteratureResourcePoolScenario` is implemented.
- Service snapshot hash now includes TopicSeed ref, source scope, source-health summary, and policy version while excluding runtime ids.
- Source-health maturity warnings are surfaced without blocking traceable resources.
- Unsupported normalized harness source scopes block before authority creation.
- Success, unsupported scope, missing literature, blocked audit refs, non-concrete TopicSeed ref rejection, warning non-blocking, hash stability, append-only, and handoff behavior are covered by unit tests.

## Node 3: Create Search Plan

### Automation Goal
Normalize SearchPlan creation as the v1a coverage-planning node over TopicSeed and the resource-pool snapshot.

### Locked Decisions
- N3-D01: This node only materializes a caller-supplied SearchPlan blueprint as `TopicSelectionSearchPlan` plus `TopicSelectionCoverageRowIntent` authorities. It MUST NOT execute retrieval, build EvidenceMap, judge evidence roles, generate research content, call AgentOrchestrator, call provider LLMs, call Codex, or run debate.
- N3-D01: The normalized harness path MUST consume Node 2's `LiteratureResourcePoolSnapshot` authority as resource truth. It MUST NOT re-read the mutable TitleCard evidence basket, `ResourceSampleSet`, caller-supplied selected literature refs, or current search results as resource truth.
- N3-D01: The normalized harness path MUST require explicit coverage intents. The service/route compatibility behavior that derives support-only coverage rows from query intents MAY remain, but it MUST NOT be treated as the normalized automated v1a path.
- N3-D01: The runner input MUST carry concrete `topic_seed_ref`, concrete `literature_resource_pool_snapshot_ref`, expected `snapshot_hash`, explicit `query_intents`, explicit `coverage_intents`, must-check constraints, exclusion rules, policy version, and output schema version.
- N3-D02: `SearchPlan blueprint` is an explicit upstream input to Node 3. Node 3 MUST validate and materialize the blueprint, but MUST NOT generate it.
- N3-D02: Allowed blueprint origins are WorkflowScenario/test fixtures, human-authored or Codex-assisted local drafting, and a future separately defined upstream blueprint-generation node. These origins MAY be recorded as provenance refs, but they MUST NOT change Node 3 into a generation node.
- N3-D02: Any future automatic SearchPlan blueprint generation MUST be modeled as a separate node, such as `topic-selection.v1a.draft-search-plan-blueprint.v1`, with its own execution-mode/model policy before Node 3 consumes the result.
- N3-D02: `TopicSelectionSearchPlanBlueprint` is a topic-selection module-level value contract. Node 3 consumes and validates it, but the minimum blueprint contract MUST be defined once at module level and reused by scenario fixtures, human/Codex-assisted inputs, and any future blueprint-generation node.
- N3-D02: The blueprint is not a standalone authority object in the initial normalization slice; it is frozen through Node 3 normalized input, control-plane input snapshot, and harness trace.
- N3-D03: `TopicSelectionSearchPlanBlueprint@v1` minimum fields are locked at module level: schema version, origin/provenance, TitleCard ref, TopicSeed ref, LiteratureResourcePoolSnapshot ref, expected snapshot hash, optional plan/recheck lineage refs, query intents, coverage intents, constraints, exclusions, coverage strategy, role coverage expectation, policy version, and output schema version.
- N3-D03: Every coverage intent row MUST include `coverage_key`, `intent_type`, `query`, `rationale`, `required`, `priority`, `expected_evidence_role`, `target_source_types`, and `refs`. `target_source_types` and `refs` may be empty arrays but must be present after normalization.
- N3-D03: The module-level blueprint contract is sufficient for current consumers: Node 3 materialization, Node 4 coverage binding, EvidenceMap coverage lineage, NeedCandidate role-bundle consumption, and future blueprint producer output.
- N3-D04: SearchPlanBlueprint semantic drafting and review MAY use model-like execution before Node 3, but Node 3 remains deterministic and MUST NOT invoke AgentOrchestrator, provider LLMs, Codex, or debate.
- N3-D04: The default execution mode for blueprint draft/review is `codex_assisted`; `provider_llm` is an explicit operator upgrade or provider-quality scenario; `mocked_llm` is test/acceptance-only.
- N3-D04: Draft profile is `topic-selection.search-plan-blueprint.draft.v1` with default OpenAI `gpt-5.5`, explicit high-accuracy OpenAI `gpt-5.5`, explicit budget DashScope `qwen3.6-plus`, normalized params `creativity=medium`, `reasoning_depth=high`, `output_budget=large`, `structured_output_required=true`, `output_format=json_schema`.
- N3-D04: Review profile is `topic-selection.search-plan-blueprint.review.v1` with the same provider options, normalized params `creativity=low`, `reasoning_depth=high`, `output_budget=medium`, `structured_output_required=true`, `output_format=json_schema`.
- N3-D04: Automatic provider fallback is disabled. Manual rerun or explicit model-option override is allowed only with new attempt provenance. DeepSeek is not available for this policy until registered in the provider registry.
- N3-D05: Normalized automation boundary is `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario`. The runner consumes `TopicSelectionSearchPlanBlueprint@v1` plus scenario/run metadata, not a bare permissive `CreateSearchPlanInput`.
- N3-D05: The runner MUST validate strict blueprint semantics before calling the authority service: TopicSeed/Snapshot/TitleCard lineage, `expected_snapshot_hash`, non-empty `query_intents`, explicit non-empty `coverage_intents`, and every N3-D03 coverage-row field.
- N3-D05: Route/service compatibility fallback MAY remain for legacy/manual API callers, but normalized harness execution MUST NOT derive coverage rows, evidence roles, coverage keys, priorities, or rationales from fallback defaults.
- N3-D05: Authority writes remain delegated to `TopicSelectionSearchResourceService.createSearchPlan`; the runner MUST NOT write SearchPlan or CoverageRow repositories directly.
- N3-D05: The runner returns one normalized success/blocked result shape and records `WorkflowHarnessCreateSearchPlanScenarioTrace@v1`. Blocked results MUST expose blocker codes and MUST NOT contain SearchPlan or CoverageRow authority refs.
- N3-D06: Implementation readiness is accepted as `implementation_ready` and automation is now `callable`. `runCreateSearchPlanScenario`, `TopicSelectionSearchPlanBlueprint@v1`, strict schema/lineage/hash/fallback validators, full blueprint input-snapshot freezing, trace artifact recording, and focused success/blocked tests have landed.

### Node Input
MUST include:
- `title_card_ref`
- `topic_seed_ref`
- `literature_resource_pool_snapshot_ref`
- expected snapshot hash
- SearchPlan blueprint provenance refs when available
- query intents
- coverage intents
- must-check constraints
- exclusion rules
- expected evidence-role coverage
- coverage strategy
- policy version
- output schema version

### Node Result
MUST include:
- `search_plan_ref`
- `plan_version`
- coverage row refs
- query intent summary
- must-check constraints
- exclusion rules
- control-plane refs
- harness trace artifact ref
- full SearchPlan blueprint frozen in normalized node input, service input snapshot, and harness trace

### Acceptance Checks
- TopicSeed and snapshot lineage mismatch blocks.
- stale or mismatched snapshot hash blocks before SearchPlan authority creation.
- empty query intents or empty coverage intents block.
- missing SearchPlan blueprint blocks; Node 3 must not infer one from TopicSeed, Snapshot, TitleCard, ResourceSampleSet, or search results.
- Node 3 must validate the shared module-level `TopicSelectionSearchPlanBlueprint` contract, not a node-private blueprint variant.
- coverage intent rows missing any required blueprint field block before SearchPlan authority creation.
- malformed blueprint schema version blocks before SearchPlan authority creation.
- required evidence-role coverage is explicit and auditable.
- normalized harness input with omitted coverage intents blocks; it must not silently fall back to support-only coverage rows.
- normalized harness input with any coverage row relying on service fallback defaults blocks before SearchPlan authority creation.
- the service input snapshot preserves the complete `TopicSelectionSearchPlanBlueprint@v1`, including expected snapshot hash and role expectations.
- constraints and exclusions are persisted with the SearchPlan.
- no model-like executor is allowed unless a future T-089 policy explicitly changes this node.
- successful result can feed SearchRun without script-side ref repair.

## Node 4: Record Search Run

### Automation Goal
Normalize SearchRun recording as the authority boundary for planned search execution, result accounting, and evidence bindings.

### Locked Baseline
- N4-D00: `topic-selection.v1a.record-search-run.v1` does not need multi-agent debate.
- N4-D00: The node remains deterministic with `execution_mode=none`; it MUST NOT call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
- N4-D00: Node 4 is a factual contract and lineage gate. It checks SearchPlan/Snapshot lineage, result accounting, coverage-row binding integrity, raw-log separation, and Node 5 handoff consumability.
- N4-D00: Strict topic-level guarding belongs to layered v1a/v1b/v1c gates and bounded loopback, not to Node 4 debate.
- N4-D00: If future agent assistance is needed to organize search results, that must be a separate upstream input-preparation or search-execution node. Node 4 only validates and records its output.
- N4-D01: Node 4 is not a search execution node. It records an already-produced search/import/manual-result fact.
- N4-D01: A failed search execution may be persisted as a `TopicSelectionSearchRun` audit fact when the record contract is valid.
- N4-D01: A failed SearchRun is non-consumable and MUST NOT produce Node 5 `EvidenceMap` handoff.
- N4-D01: Node 4 itself is `blocked` only when the record contract is invalid or unsafe to persist, such as malformed input, missing accounting/source-health data, lineage mismatch, coverage-row conflict, or raw log as authority ref.
- N4-D02: Node 4 normalized automation uses a module-level value contract `TopicSelectionSearchRunRecordBundle@v1`.
- N4-D02: The bundle is not a new authority object and is not a second route/product contract. It must map losslessly to `RecordSearchRunInput`, and `TopicSelectionSearchResourceService.recordSearchRun` remains the only SearchRun authority writer.
- N4-D02: Route payload compatibility may remain only when it shares the same fields and semantics; normalized harness execution must not maintain a divergent SearchRun input shape.
- N4-D02: SearchPlan version must be asserted only through `search_plan_ref.version_id`; no duplicate `expected_search_plan_version` field is allowed.
- N4-D02: LiteratureResourcePoolSnapshot version must be asserted only through `literature_resource_pool_snapshot_ref.version_id`; `expected_literature_snapshot_hash` is a replay/currentness guard, not a replacement for the concrete ref.
- N4-D03: The minimum bundle fields are locked as `schema_version`, `title_card_ref`, concrete `search_plan_ref`, concrete `literature_resource_pool_snapshot_ref`, `expected_literature_snapshot_hash`, run fact fields, accounting summaries, evidence binding records, audit/raw-log payload or ref, policy version, and output schema version.
- N4-D03: Version checks must use only concrete ref `version_id` values. Hash checks must use `expected_literature_snapshot_hash`.
- N4-D03: `succeeded` and `partial` SearchRuns require non-empty `evidence_map_input_refs` before they can emit Node 5 handoff; `failed` SearchRuns may have empty evidence refs but are non-consumable and emit no Node 5 handoff.
- N4-D03: Raw search logs are audit artifacts only and must never become EvidenceMap authority refs.
- N4-D04: Result accounting must be internally consistent as an audit-fact integrity check. This is not a topic-value judgment.
- N4-D04: `total_result_count >= unique_literature_count >= 0`, `total_result_count >= duplicate_result_count + unique_literature_count`, and failed/skipped source counts must be non-negative.
- N4-D04: Distinct literature refs in evidence bindings must not exceed `unique_literature_count`.
- N4-D04: `succeeded` runs require `failed_source_count=0` and, when total results are non-zero, at least one coverage observation or evidence binding.
- N4-D04: `partial` runs may include failed/skipped sources only when source health exposes the partial condition.
- N4-D04: `failed` runs may have zero unique literature and no evidence bindings, but source health must expose an error or failure summary.
- N4-D05: Node 4 may include controlled lightweight search/coverage semantic metadata: query provenance, source health, dedup summary, coverage missing reasons/notes, coverage assessment verdicts/issues, and search-coverage risk acceptances.
- N4-D05: Node 4 must not include research-evidence semantics such as evidence role, evidence polarity, evidence strength, NeedCandidate refs, TopicQuestionContract refs, topic value scores, claim support verdicts, or claim-risk acceptance.
- N4-D06: Optional LLM/Codex execution may prepare or review `TopicSelectionSearchRunRecordBundle@v1` before Node 4, following the Node 3 blueprint draft/review pattern.
- N4-D06: Node 4 execution remains deterministic with `execution_mode=none`; model-like output must pass bundle schema and deterministic validators before any SearchRun authority is created.
- N4-D06: Codex-assisted draft/review is the default local low-cost path; provider execution is explicit upgrade/provider-quality only; mocked LLM is test-only; automatic provider fallback is disabled.
- N4-D07: Node 4 has no literature retrieval, acquisition, or LiteratureRecord creation capability.
- N4-D07: A consumable normalized SearchRun may bind only literature refs that belong to the resolved LiteratureResourcePoolSnapshot.
- N4-D07: Snapshot-outside literature refs are blocked by default and must not enter `evidence_map_input_refs`, coverage evidence bindings, or Node 5 handoff.
- N4-D07: If upstream search execution discovers important new literature, the workflow must route through literature acquisition/resource refresh, evidence basket update, Node 2 snapshot refresh, and any required Node 3 plan update before Node 4 can produce a consumable run.
- N4-D08: Raw log/artifact, Literature/Source refs, and coverage semantic metadata are separate layers.
- N4-D08: Raw logs are audit-only artifacts proving search execution details; they must not enter EvidenceMap authority refs, coverage evidence binding refs, or Node 5 handoff refs.
- N4-D08: Node 5 evidence authority is snapshot-member Literature refs, legal Source refs, and coverage row lineage. Fulltext/abstract/manual locator refs may be carried as locator provenance only; they do not replace Literature/Source authority.
- N4-D08: A raw result must first be resolved into Literature/Source authority plus optional locator provenance before it can support EvidenceMap construction.
- N4-D08: `coverage_assessments[].verdict` describes coverage-row retrieval status only; it must not be interpreted as evidence strength, topic value, or claim support.
- N4-D09: Node 4 output has two possible routing surfaces: `downstream_handoff` for Node 5 and `loopback_signal` for orchestrator/control-plane repair routing.
- N4-D09: `downstream_handoff` uses `TopicSelectionSearchRunHandoff@v1` and exists only when `consumable_for_evidence_map=true`.
- N4-D09: `loopback_signal` uses `TopicSelectionSearchRunLoopbackSignal@v1`, is not authority, is not Node 5 input, and may target Node 3 SearchPlan revision, Node 2 snapshot refresh, upstream search execution/input preparation, or human search-coverage acceptance.
- N4-D09: In v1, `downstream_handoff` and `loopback_signal` must not coexist. Consumable results move forward; repairable non-consumable results route back.

### Node Input
MUST include:
- `schema_version`
- `title_card_ref`
- `search_plan_ref`
- `literature_resource_pool_snapshot_ref`
- expected literature snapshot hash
- `run_kind`
- `run_status`
- query provenance
- result accounting
- source health summary
- dedup summary
- evidence map input refs
- coverage observations
- evidence bindings
- coverage assessments
- coverage risk acceptances
- raw log artifact ref or redacted raw artifact payload
- controlled search/coverage semantic metadata only
- policy version
- output schema version

### Node Result
MUST include:
- `search_run_ref`
- `consumable_for_evidence_map`
- `downstream_handoff`
- `loopback_signal`
- result accounting summary
- evidence binding refs
- coverage assessment summary
- coverage matrix summary when available
- control-plane refs
- harness trace artifact ref

### Acceptance Checks
- SearchPlan title-card lineage mismatch blocks.
- coverage observations and evidence bindings must refer to SearchPlan coverage rows.
- evidence-map input refs must be traceable to selected literature/source refs.
- SearchPlan version is checked through `search_plan_ref.version_id`; Snapshot version is checked through `literature_resource_pool_snapshot_ref.version_id`.
- resolved snapshot hash must match `expected_literature_snapshot_hash`.
- evidence bindings and consumable evidence-map input refs must cite only literature refs from the resolved snapshot.
- evidence-map input refs are limited to `literature_record`, `literature_source`, and locator-provenance refs (`literature_abstract`, `fulltext_document`, `fulltext_section`, `fulltext_paragraph`, `fulltext_anchor`, `manual_locator`).
- evidence binding literature refs are `literature_record` only; binding source refs are `literature_source` or locator-provenance refs only.
- snapshot-outside literature refs block normalized consumable execution; they may only be future audit-only anomalies, never Node 5 handoff refs.
- raw log artifacts can be audit refs only as `artifact_ref` or `raw_search_log`; they cannot appear in `evidence_map_input_refs`, coverage evidence binding literature/source refs, locator provenance refs, or Node 5 handoff authority refs.
- locator provenance refs such as fulltext section, paragraph, anchor, abstract, document, or manual locator refs may be carried to Node 5 only as EvidenceUnit locator support; they cannot replace snapshot-member Literature/Source refs.
- coverage assessment verdicts are limited to retrieval coverage status and cannot stand in for research evidence semantics.
- search coverage risk acceptances may cite only `accepted_risk` or `search_coverage_risk` refs.
- `downstream_handoff` and `loopback_signal` are mutually exclusive in v1.
- failed or repairable non-consumable runs produce no Node 5 handoff and may emit loopback signal when repairable.
- result accounting must reconcile with bindings and dedup summary.
- result accounting count inconsistencies block before SearchRun authority creation.
- failed or partial source health is surfaced as warning/blocker codes, not hidden in script output.
- failed search execution may be recorded as a SearchRun authority when the record is valid, but it must not produce a consumable Node 5 handoff.
- SearchRun record contract failures block before SearchRun authority creation.
- search/coverage semantic metadata is allowed only for retrieval provenance and coverage audit; evidence-role, need, topic-value, and claim semantics block or must be routed to later nodes.
- downstream loopback may request a new SearchPlan or SearchRun, but must not relax Node 4 record-level validation.
- successful result can feed EvidenceMap without script-side ref repair.

### Implementation Readiness Review
Decision: `implementation_ready`, `automation_callability=callable`.

Node 4 has moved from readiness into implementation. The authority boundary remains unchanged: `TopicSelectionSearchResourceService.recordSearchRun` is the single SearchRun writer, while `TopicSelectionSearchRunRecordBundle@v1` is the normalized value contract consumed by `WorkflowHarness`.

Implementation result:
- shared `TopicSelectionSearchRunRecordBundle@v1`, `TopicSelectionSearchRunHandoff@v1`, and `TopicSelectionSearchRunLoopbackSignal@v1` contracts and schema tests landed.
- `recordSearchRun` now enforces concrete SearchPlan/Snapshot refs, expected snapshot hash, result-accounting invariants, source-health semantics, snapshot-member Literature/Source authority refs, locator-provenance legality, raw-log audit separation, and failed-run audit-only state intent.
- shared schema, route validation, WorkflowHarness pre-service validation, and service gate now share the same explicit SearchRun authority ref vocabulary, including raw-log and search-coverage risk restrictions.
- `runRecordSearchRunScenario` now records `WorkflowHarnessRecordSearchRunScenarioTrace@v1`, emits Node 5 handoff only for consumable SearchRuns, emits loopback for repairable non-consumable runs, and returns stable blocked results without creating SearchRun authority.
- `coverage_row_intent_ref` validation is title-card scoped rather than versioned, matching the existing coverage-row authority semantics and avoiding a second ref contract.
- No DB migration was required; handoff and loopback remain node-result/trace contracts, not persisted authorities.
- Backend typecheck, full shared schema tests, focused shared/service/harness/v1a route/EvidenceMap verification, and backend full suite were rerun. With `.env.local` loaded, T-054 and T-067 Prisma HTTP smoke tests passed; final backend suite result was 699 tests, 698 passed, 0 failed, 1 skipped.

## Node 5: Build Evidence Map

### Automation Goal
Convert evidence-map creation from script-owned request assembly into a normalized harness node with optional single-agent semantic extraction and deterministic authority materialization.

### Locked Decisions
- N5-D00: Node 5 may perform partial semantic extraction. Codex or provider LLM execution is allowed for single-agent extraction/review of EvidenceUnit source statements, locator candidates, role suggestions, typed-link suggestions, clusters, patterns, and conflict hints.
- N5-D00: Node 5 does not use multi-agent debate. The purpose is evidence extraction and structuring, not adversarial exploration or candidate discovery.
- N5-D00: Model-like execution produces only a structured extraction draft/review artifact. It must not directly write EvidenceMap, EvidenceUnit, NeedCandidate, value, package, or claim authority.
- N5-D00: EvidenceMap authority creation remains deterministic: the runner validates refs, source attribution, locator lineage, coverage-row lineage, source statements, and structural references before calling `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- N5-D00: Default local execution may be `codex_assisted` for cost control; `provider_llm` is an explicit quality upgrade; `mocked_llm` is acceptance-test only; `execution_mode=none` remains valid when the caller supplies a ready extraction draft.
- N5-D00: Hidden reasoning, raw provider logs, and debate transcripts are never persisted.
- N5-D01: Node 5 uses a module-level value contract, `TopicSelectionEvidenceMapExtractionDraft@v1`, for all semantic extraction drafts. This is not a WorkflowHarness-private DTO and not an authority object.
- N5-D01: Node automation uses `TopicSelectionBuildEvidenceMapNodeInput@v1` as the node-level wrapper around Node 4 `TopicSelectionSearchRunHandoff@v1`, workflow metadata, execution mode/profile, and the extraction draft.
- N5-D01: Codex-assisted, provider-LLM, mocked-LLM, human, and fixture producers MUST all emit the same extraction draft shape.
- N5-D01: `execution_mode=none` means a caller-supplied `TopicSelectionEvidenceMapExtractionDraft@v1` is already available; it must not introduce a second service-input path.
- N5-D01: The normalized runner MUST NOT accept a harness-private evidence draft shape. Accepted draft fields are mapped into `CreateEvidenceMapFromSearchRunInput` only after deterministic validation.
- N5-D01: The draft may be hashed and stored as an audit artifact, but EvidenceMap authority is created only by `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- N5-D02: The deterministic materialization validator is the authority gate between extraction draft and EvidenceMap persistence.
- N5-D02: `ready` and `ready_with_warning` may call `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`; `review_required` and `blocked` MUST NOT create EvidenceMap authority.
- N5-D02: Warnings are traceable quality or coverage risks that do not break authority safety. They must be recorded in the materialization report, harness trace, and accepted EvidenceUnit issue codes when applicable.
- N5-D02: Blockers are contract, lineage, ref, source-authority, or structural failures. They must return a stable blocked result with blocker codes, failed validation layer, rejected draft refs, and repair target.
- N5-D02: `review_required` is for semantically ambiguous drafts that are contract-safe enough to inspect but not safe enough to persist automatically; it emits a review package and waits for a revised draft.
- N5-D02: The validator may normalize ordering, deduplicate identical draft structures, and generate stable keys. It MUST NOT rewrite evidence roles, invent source statements, swap literature/source refs, re-read live resource pools for repair, or downgrade `llm_inference` into source authority.
- N5-D02: Validation output uses `EvidenceMapMaterializationReport@v1`; mapped `CreateEvidenceMapFromSearchRunInput` is present only for `ready` or `ready_with_warning`.
- N5-D03: Model-like extraction uses profile `topic-selection.evidence-map-extraction.single-agent.v1`, resolved by the model profile registry. Node 5 must not hard-code provider, model, or normalized parameter choices.
- N5-D03: Default local execution is `codex_assisted`; `provider_llm` is an explicit quality upgrade; `mocked_llm` is test-only; `execution_mode=none` uses a caller-supplied extraction draft and skips model invocation.
- N5-D03: Model invocation receives only a frozen `TopicSelectionEvidenceMapExtractionContextPacket@v1`; after packet compilation, the model executor MUST NOT re-read live DB or mutable resource-pool state.
- N5-D03: The extraction context family is `evidence_extraction_context`. It is separate from Node 6 exploration/arbiter context packets and must not include NeedCandidate discovery prompts or debate memory.
- N5-D03: Provider or Codex failure may retry the same profile once for transient/transport or malformed-output issues. Automatic provider fallback, Codex fallback, mock fallback, and keyword extraction fallback are not allowed.
- N5-D04: Context packet cache is allowed only as exact-match reuse over frozen inputs. Cache matching MUST include node id, SearchRun handoff hash, SearchPlan version, LiteratureResourcePoolSnapshot hash, context compiler version, policy version, schema version, output contract version, execution mode, and profile id.
- N5-D04: Extraction draft response reuse is a local cost-control feature only. Reused responses MUST be recorded as `codex_assisted` or non-provider provenance and MUST NOT masquerade as a fresh `provider_llm` result.
- N5-D04: Provider-quality `provider_llm` scenarios require real provider execution. A cache hit in that mode is treated as a miss or blocked by policy; it cannot satisfy provider-backed evidence.
- N5-D04: Cached or reused drafts MUST still pass N5-D02 materialization validation before any EvidenceMap authority write.
- N5-D04: Audit provenance MUST record context packet hash, profile id, execution mode, cache hit/miss/reuse source, draft hash, materialization report, accepted/rejected unit counts, and warning/blocker/review codes.
- N5-D04: Cache and audit artifacts MUST NOT persist hidden reasoning, raw provider logs, raw fulltext dumps, or context memory from Node 6/debate flows.
- N5-D05: `review_required` never creates EvidenceMap authority. It emits `EvidenceMapExtractionReviewPackage@v1` and waits for an explicit revised `TopicSelectionEvidenceMapExtractionDraft@v1`.
- N5-D05: Human, Codex, or provider revisions MUST use the same extraction draft contract. Node 5 MUST NOT introduce a patch DTO, partial-update DTO, or reviewer-only authority path.
- N5-D05: Every revision is append-only with a new `node_attempt_id`, `revision_of_attempt_ref`, and `review_package_ref`; it must not overwrite the original attempt, draft, context packet, or materialization report.
- N5-D05: The original context packet may be reused only when upstream refs/hashes, compiler version, policy/schema/output versions, execution mode, and profile id are unchanged. Any upstream change requires context recompilation.
- N5-D05: Automated same-profile retry is limited to one attempt. Further revision is operator-triggered or explicit workflow retry, not an unbounded autonomous loop.
- N5-D06: Node 5 has exactly one downstream workflow handoff in v1: `TopicSelectionEvidenceMapHandoff@v1` to `topic-selection.v1a.generate-need-candidate.v1`.
- N5-D06: The handoff is produced only for materialization status `ready` or `ready_with_warning`. `review_required` and `blocked` MUST NOT emit a Node 6 handoff.
- N5-D06: Review packages, repair targets, loopback signals, UI reads, audit reads, and read-only projections are not downstream handoffs and must not be consumed as Node 6 input.
- N5-D06: Node 6 consumes EvidenceMap authority refs and read projections such as `TopicSelectionNeedValidationEvidenceBundle`; it MUST NOT consume extraction drafts, review packages, raw model output, or materialization-internal artifacts as evidence facts.
- N5-D06: `ready_with_warning` may continue to Node 6, but warning/issue summaries in the handoff are downstream constraints and must not be treated as strong evidence.
- N5-D06: `runGenerateNeedCandidateScenario` MAY receive `TopicSelectionEvidenceMapHandoff@v1` as transition provenance. When present, the runner MUST validate that `evidence_map_ref`, `search_snapshot_refs`, and `resource_snapshot_refs` match the handoff before compiling Node 6 context.
- N5-D06: Node 6 business input refs MUST reject N5 extraction drafts, review packages, materialization reports, raw model/provider outputs, raw search logs, hidden reasoning, and debate transcripts. These artifacts may remain audit evidence only and cannot become need-discovery evidence facts.
- N5-D07: Implementation readiness is accepted as `implementation_ready`; after runner landing, automation callability is `callable` through `runBuildEvidenceMapScenario` with stable success/blocked/review-required result shape.
- N5-D07: No DB migration is required for the initial normalization slice. Extraction context, draft, materialization report, review package, and harness trace are artifact/control-plane/audit refs; EvidenceMap authority remains the existing service/repository boundary.
- N5-D07: Implementation order is locked: shared contracts/schema, model profile registry entry, deterministic materialization validator/mapper, context/adapter path for model-like execution, WorkflowHarness runner, focused tests.
- N5-D07: Existing direct route/service behavior for `/topic-selection/v1a/evidence-maps` remains a compatibility/manual path. The normalized automated path MUST use the harness runner and shared Node 5 contracts to avoid a second service-input semantics track.

### Extraction Draft Contract
`TopicSelectionEvidenceMapExtractionDraft@v1` MUST include:
- `schema_version`
- `title_card_ref`
- `search_run_ref`
- `search_plan_ref`
- `literature_resource_pool_snapshot_ref`
- `literature_snapshot_hash`
- `producer_kind`: `codex_assisted`, `provider_llm`, `mocked_llm`, `human`, or `fixture`
- `profile_id`
- `input_refs_hash`
- `draft_units`
- `draft_links`
- `draft_clusters`
- `draft_patterns`
- `draft_conflicts`
- `warning_codes`
- `policy_version`
- `output_schema_version`

Each `draft_units` item MUST include:
- `client_unit_key`
- `evidence_role`: `support`, `challenge`, `baseline`, or `context`
- `literature_ref`
- `source_refs`
- `locator`
- `source_statement`
- `source_attribution_kind`
- nullable `coverage_row_intent_ref`
- `confidence`
- `issue_codes`

The extraction draft MUST NOT include:
- EvidenceMap or EvidenceUnit authority ids
- created authority refs
- gate, transition, NeedCandidate, value, package, bridge, or claim authority refs
- topic value scores, claim support verdicts, or evidence strength verdicts
- hidden reasoning, raw provider responses, raw fulltext dumps, or raw search logs as authority refs

### Extraction Execution Profile
`topic-selection.evidence-map-extraction.single-agent.v1` MUST be resolved from the profile registry and produce `TopicSelectionEvidenceMapExtractionDraft@v1`.

The model-like executor MUST receive `TopicSelectionEvidenceMapExtractionContextPacket@v1`, containing only frozen context derived before invocation:
- Node 4 `TopicSelectionSearchRunHandoff@v1`
- SearchRun evidence bindings and allowed EvidenceMap input refs
- SearchPlan ref, coverage row intent table, and search-plan blueprint summary when available
- LiteratureResourcePoolSnapshot ref/hash and selected literature/source locator tables
- expected role counts or role minimums
- source-attribution rules, forbidden output rules, and materialization validator checklist
- context packet hash, compiler version, policy version, schema version, execution mode, and profile id

The model-like executor MUST NOT:
- query repositories or live DB during extraction
- refresh the literature snapshot or resource pool
- import new literature or source records
- read raw provider/search logs as authority
- consume Node 6 exploration, arbiter, debate, or NeedCandidate memory context
- return anything except `TopicSelectionEvidenceMapExtractionDraft@v1`

### Cache, Reuse, And Audit Provenance
Node 5 cache use is allowed only for reproducibility and local cost control. It must never change authority semantics.

Context packet cache hits require exact match on:
- `node_id`
- `TopicSelectionSearchRunHandoff@v1` hash
- SearchPlan ref and version
- LiteratureResourcePoolSnapshot ref and hash
- `context_compiler_version`
- `policy_version`
- `schema_version`
- `output_schema_version`
- `execution_mode`
- `profile_id`
- `context_family=evidence_extraction_context`

Extraction draft response reuse rules:
- `codex_assisted` MAY reuse an exact-match local response when provenance records `response_source=cached_exact_invocation` and `non_provider=true`.
- `provider_llm` MUST NOT treat a cached response as provider-backed execution; cache hit is a miss or policy block.
- `mocked_llm` cache reuse is test-only and must not share storage/provenance with real executions.
- Reused drafts must still be validated by `EvidenceMapMaterializationReport@v1` before persistence.

Audit MUST record:
- context packet ref/hash and compiler version
- profile id, execution mode, and selected model option provenance when provider-backed
- cache key, cache hit/miss, response reuse source, and source attempt ref when reused
- draft hash and redacted structured draft artifact ref
- materialization report ref/hash
- accepted/rejected unit counts, role counts, and warning/blocker/review codes

Audit MUST NOT record hidden reasoning, raw provider logs, raw fulltext dumps, raw search logs as authority, or Node 6/debate context packets.

### Review-Required Revision Loop
`review_required` is a terminal non-authority result for the current node attempt. It is not a soft success.

When `EvidenceMapMaterializationReport@v1.status=review_required`, the runner MUST emit `EvidenceMapExtractionReviewPackage@v1` with:
- `schema_version`
- `workflow_run_id`
- `node_attempt_id`
- `review_package_ref`
- `materialization_report_ref` and `materialization_report_hash`
- `extraction_context_packet_ref` and `extraction_context_packet_hash`
- `draft_ref` and `draft_hash`
- ambiguous unit keys and review codes
- accepted/rejected draft ref summaries
- required revision actions
- allowed revision producers: `human`, `codex_assisted`, or `provider_llm`
- policy, schema, output contract, execution mode, and profile ids

The review package MUST NOT include hidden reasoning, raw provider logs, raw fulltext dumps, raw search logs as authority, or Node 6/debate context payloads.

Revision handling:
- revised output MUST be a full `TopicSelectionEvidenceMapExtractionDraft@v1`, not a patch.
- revised output MUST create a new node attempt with `revision_of_attempt_ref` and `review_package_ref`.
- revised output MUST pass N5-D02 materialization validation from scratch.
- if SearchRun, SearchPlan, LiteratureResourcePoolSnapshot, policy/schema/output version, context compiler, execution mode, or profile changes, the context packet MUST be recompiled.
- if all upstream refs and hashes are unchanged, the original context packet may be reused with exact-match provenance.
- automatic same-profile retry is allowed at most once; subsequent revision is explicit operator-triggered workflow work.

### EvidenceMap Handoff To Node 6
`TopicSelectionEvidenceMapHandoff@v1` is the only downstream workflow handoff emitted by Node 5 in v1.

It is emitted only when `EvidenceMapMaterializationReport@v1.status` is `ready` or `ready_with_warning`.

The handoff MUST include:
- `schema_version`
- `workflow_run_id`
- `node_attempt_id`
- `handoff_ref`
- `title_card_ref`
- `evidence_map_ref`
- `search_run_ref`
- `search_plan_ref`
- `literature_resource_pool_snapshot_ref`
- `materialization_report_ref` and `materialization_report_hash`
- `need_validation_evidence_bundle_ref` when available as a read projection
- evidence unit count and role counts
- abstract-only support count
- warning and issue summary
- source refs hash
- policy, schema, and output contract versions

The handoff MUST NOT include extraction draft payloads, extraction draft refs as downstream evidence, review packages, raw model output, hidden reasoning, raw provider logs, raw fulltext dumps, or raw search logs as authority.

Routing rules:
- `ready` emits handoff to Node 6.
- `ready_with_warning` emits handoff to Node 6 with warning/issue constraints.
- `review_required` emits only `EvidenceMapExtractionReviewPackage@v1`.
- `blocked` emits only blocker/repair routing data.
- UI, audit scripts, and verification tools may read EvidenceMap/read projections, but those reads are not workflow handoffs and must not bypass Node 6 or v1a gates.

### Node Input
MUST include:
- `TopicSelectionBuildEvidenceMapNodeInput@v1`
- Node 4 `TopicSelectionSearchRunHandoff@v1`
- `TopicSelectionEvidenceMapExtractionContextPacket@v1` when model-like extraction is used
- `search_run_ref`
- `search_plan_ref`
- `literature_snapshot_ref`
- selected literature refs
- `TopicSelectionEvidenceMapExtractionDraft@v1`
- coverage row refs when present
- expected role counts or role minimums
- execution mode and extraction profile when model-like extraction is used
- policy version
- output schema version

### Node Result
MUST include:
- `EvidenceMapMaterializationReport@v1`
- `EvidenceMapExtractionReviewPackage@v1` when status is `review_required`
- `TopicSelectionEvidenceMapHandoff@v1` when status is `ready` or `ready_with_warning`
- `evidence_map_ref`
- persisted evidence unit refs
- role counts
- abstract-only support count
- control-plane input snapshot ref
- workflow run ref
- gate result ref
- transition ref
- lineage refs
- harness trace artifact ref

### Acceptance Checks
- malformed payload blocks before authority creation.
- stale SearchRun/SearchPlan/Snapshot refs block.
- source refs outside SearchRun evidence bindings block.
- `llm_inference` source attribution cannot become source-claim authority.
- Codex/LLM output can suggest source statements and role/locator structures, but deterministic validation must accept or reject them before authority creation.
- abstract-only support is allowed only with an auditable issue marker.
- model-like extraction failure blocks or returns review-required; it must not silently downgrade to keyword extraction.
- no multi-agent debate runtime is invoked.
- `ready_with_warning` creates EvidenceMap authority and records warnings; `review_required` and `blocked` do not create authority.
- block and review-required results are machine-routable through blocker/review codes and repair targets.
- revised drafts after `review_required` create new attempts and must not overwrite prior audit artifacts.
- only `ready` and `ready_with_warning` produce Node 6 handoff; review/repair/read-only outputs do not.
- Node 6 cannot consume extraction drafts, review packages, raw model outputs, or audit-only artifacts as evidence facts.
- successful result can feed `generate-need-candidate` without script-side ref repair.

### Implementation Readiness Review
Decision: `implementation_ready`, `automation_callability=callable`.

The node is callable because product semantics, authority ownership, execution modes, failure states, downstream handoff rules, and the normalized WorkflowHarness runner are now concrete.

Complexity is moderate-to-high but bounded:
- EvidenceMap authority write already exists in `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- Node 5 adds shared value contracts, deterministic validation/materialization, optional single-agent extraction, trace/review artifacts, and a harness runner.
- Initial landing does not need schema migration because non-authority objects can be stored as artifacts and control-plane refs.
- The direct route must remain compatibility-only for manual/direct use; normalized automation must not bypass the Node 5 materialization gate.

Implementation must prove:
- shared Node 5 DTOs/schema validate the normalized input, draft, materialization report, review package, and handoff;
- `topic-selection.evidence-map-extraction.single-agent.v1` resolves from the profile registry;
- `ready` and `ready_with_warning` are the only statuses that call EvidenceMap authority creation;
- `review_required` emits a review package and creates no EvidenceMap authority;
- `blocked` creates no EvidenceMap authority or Node 6 handoff;
- successful harness output exposes `TopicSelectionEvidenceMapHandoff@v1` for Node 6 without leaking drafts or model/audit-only artifacts.

## Node 6: Generate Need Candidate

### Current Status
This node is the standard to match.

Existing runner:
- `TopicSelectionWorkflowHarnessService.runGenerateNeedCandidateScenario`

Existing capabilities:
- shared `GenerateNeedCandidateNodeInput`
- shared `GenerateNeedCandidateNodeResult`
- exploration and arbiter context packets
- optional `TopicSelectionEvidenceMapHandoff@v1` transition validation before context compilation
- mocked, Codex-assisted, provider-backed shape stability
- optional multi-agent debate runtime
- ranked draft validation
- candidate admission
- supplemental routing
- admitted-only batch persistence
- candidate-pool projection refs/hash
- harness trace artifact

### Required Follow-up
Keep this runner stable while adding other v1a nodes. Do not overload it with topic seed, resource snapshot, search plan, search run, evidence-map, adjudication, human confirmation, or v1b handoff semantics.

## Node 7: Validate Need Adjudication

### Automation Goal
Expose the current readiness/support/adjudication sequence as one normalized node runner without re-merging human confirmation or v1b publication.

### Locked Decisions
- N7-D01: Node 7 persists `TopicSelectionValidateNeedAdjudicationResultRecord` only. It MUST NOT create `ValidatedNeed`, `HumanConfirmedDecision`, `V1bInputBundle`, `TopicQuestionContract`, SearchPlan mutations, NeedCandidateSet, or PaperProject/Bridge authority.
- N7-D01: `final_decision=validate` is a pending-human-confirmation adjudication. It MUST carry `output_validated_need_id` as a reserved target id, but actual `ValidatedNeed` authority materialization belongs only to Node 8.
- N7-D02: Node 7 may use single-agent model-like execution to generate an adjudication recommendation packet. Allowed modes are `codex_assisted`, `provider_llm`, and `mocked_llm`; default local mode is `codex_assisted`, provider is explicit quality upgrade, and mocked is test/acceptance-only.
- N7-D02: Node 7 is not debate-eligible. Multi-agent debate belongs to need discovery in Node 6, not adjudication/routing in Node 7.
- N7-D02: Model-like output cannot directly create authority or satisfy human confirmation. `TopicSelectionNeedValidationService.adjudicateNeed` remains the only adjudication authority writer.
- N7-D03: Semantic content is allowed only as recommendation/provenance, such as `TopicSelectionNeedAdjudicationRecommendationPacket@v1`. It is not authority and cannot override the support packet.
- N7-D03: Support packet, readiness assessment, NeedCandidate, and repository-resolved evidence/risk refs are the semantic SSOT for adjudication. Node 7 MUST NOT re-derive evidence roles, risk refs, merge targets, or recheck refs from natural-language rationale.
- N7-D03: Authority fields are whitelist-mapped and ref-grounded only: `final_decision`, `rationale`, `required_actions`, `rejected_reason`, `gap_codes`, `accepted_risk_refs`, `residual_risk_refs`, `merge_target_need_candidate_ref`, and search-plan recheck reason/gap fields.
- N7-D03: If a recommendation conflicts with the support packet or cannot be mapped deterministically, the runner MUST block or require human review rather than silently rewriting semantic content.
- N7-D04: `final_decision` values are fixed to the existing backend enum: `validate`, `return_to_candidate`, `request_searchplan_recheck`, `reject`, `park`, and `merge`.
- N7-D04: `validate` means the candidate can proceed to Node 8 human confirmation; it MUST NOT create `ValidatedNeed` in Node 7.
- N7-D04: `return_to_candidate` keeps the candidate revisable and requires actionable rationale or `required_actions`.
- N7-D04: `request_searchplan_recheck` routes to SearchPlan/evidence coverage repair and requires a recheck reason or gap codes.
- N7-D04: `reject` closes the candidate as not viable and requires `rejected_reason` or equivalent rationale.
- N7-D04: `park` preserves the candidate as a non-advancing hypothesis and requires park rationale or `required_actions`.
- N7-D04: `merge` requires `merge_target_need_candidate_ref`, must not self-merge, and must not auto-merge authority content.
- N7-D04: `require_human_review` is not a `final_decision`; it is a node status/routing outcome when N7 cannot safely persist an adjudication decision.
- N7-D05: `final_decision=validate` produces a confirmable adjudication only. Node 7 MUST reserve `output_validated_need_id` as a stable target id for automation; the reserved id is not `ValidatedNeed` authority until Node 8 materializes `TopicSelectionValidatedNeedRecord`.
- N7-D05: After a validate adjudication, the NeedCandidate remains pending confirmation with `decision_status=ready_for_validation` and `review_status=needs_human_review`.
- N7-D05: Node 8 MUST consume the validate adjudication and explicit `human`, `hybrid`, or `human_delegated` confirmation before writing `HumanConfirmedDecision` and materializing `ValidatedNeed`.
- N7-D05: Only Node 8 may move the candidate to `decision_status=resulted_in_validated_need`, `review_status=human_confirmed`, and `lifecycle_status=closed`.
- N7-D05: v1b publication MUST consume `ValidatedNeed` from Node 8, not Node 7 adjudication output.
- N7-D05: Node 7 has no automatic-confirm mode. Codex/provider recommendations can route to Node 8, but cannot satisfy confirmation.
- N7-D06: State compression boundary is locked. LLM/Codex/provider/mock outputs MAY choose only `final_decision` plus whitelist authority inputs; they MUST NOT output or override `decision_status`, `review_status`, `lifecycle_status`, `freshness_status`, `loopback_target`, `result_validated_need_id`, or `open_recheck_request_refs`.
- N7-D06: WorkflowHarness MUST expose the compressed `route_outcome` as the orchestration result: `advance_to_human_confirmation`, `repair_need_candidate`, `repair_search_plan`, `stop_rejected`, `hold_candidate`, `stop_merged`, `blocked`, or `require_human_review`.
- N7-D06: `route_outcome` is derived deterministically from `final_decision`: `validate -> advance_to_human_confirmation`, `return_to_candidate -> repair_need_candidate`, `request_searchplan_recheck -> repair_search_plan`, `reject -> stop_rejected`, `park -> hold_candidate`, and `merge -> stop_merged`.
- N7-D06: Candidate persistence statuses are domain-service derived state only. Scripts, routes, WorkflowHarness, Codex, provider LLMs, and mocked LLMs MUST NOT pass or patch those statuses directly.
- N7-D06: The domain status mapping is fixed: `validate` keeps lifecycle unchanged, sets `decision_status=ready_for_validation`, `review_status=needs_human_review`, and preserves freshness; `return_to_candidate` sets `decision_status=returned_for_revision`, `lifecycle_status=hypothesis`, `review_status=human_reviewed`, and preserves freshness; `request_searchplan_recheck` sets `decision_status=searchplan_recheck_requested`, `lifecycle_status=hypothesis`, `review_status=human_reviewed`, and `freshness_status=recheck_required`; `reject` sets `decision_status=rejected`, `lifecycle_status=closed`, `review_status=human_reviewed`, and preserves freshness; `park` sets `decision_status=parked`, `lifecycle_status=hypothesis`, `review_status=human_reviewed`, and preserves freshness; `merge` sets `decision_status=merged`, `lifecycle_status=closed`, `review_status=human_reviewed`, and preserves freshness.
- N7-D06: `park` is a hold state, not a closed terminal state. `validate` is a route to Node 8, not final approval.
- N7-D07: Recommendation-to-authority gate is locked. Model-like recommendation packets MUST NOT directly create `ValidateNeedAdjudicationResult`; only the runner may convert an accepted recommendation into domain-service input after deterministic validation.
- N7-D07: `human` or `hybrid` adjudication packets MAY materialize any `final_decision` after validation. `fixture_human_decision` MAY do the same only in test/acceptance scenarios with explicit provenance.
- N7-D07: `codex_assisted` and `provider_llm` recommendations MAY be materialized without additional human acceptance only for low-risk decisions: `validate`, `request_searchplan_recheck`, and `return_to_candidate`.
- N7-D07: Low-risk model materialization still requires all decision-specific guards: `validate` only creates pending Node 8 handoff, `request_searchplan_recheck` only creates a typed recheck request without SearchPlan mutation, and `return_to_candidate` must include actionable `required_actions`.
- N7-D07: High-risk decisions `reject`, `merge`, and `park` require `human` or `hybrid` acceptance before authority persistence. If a model-like recommendation selects one of these decisions without human/hybrid acceptance, the runner MUST return `require_human_review` and MUST NOT write adjudication authority.
- N7-D07: `mocked_llm` remains test/acceptance-only and does not establish product decision authority.
- N7-D08: Readiness/support packet freeze boundary is locked. The normalized N7 runner MAY orchestrate readiness assessment, validation support packet creation, recommendation gating, and adjudication, but each authority write MUST stay inside its existing domain service boundary.
- N7-D08: Default runner behavior is append-only `create_fresh` for both readiness assessment and validation support packet. Consuming an existing readiness/support packet requires explicit refs in runner input; the runner MUST NOT silently find or reuse the latest packet.
- N7-D08: Explicit readiness/support refs MUST be validated against the selected NeedCandidate, title-card scope, evidence map, search run, search plan, literature snapshot, policy/schema version expectations, and freshness expectations before use. Ref or lineage drift blocks before adjudication.
- N7-D08: Only readiness recommendation `ready_for_validation` may proceed to support packet creation or adjudication. Any other readiness recommendation returns a blocked N7 result with readiness blockers and repair hints, and MUST NOT create `ValidateNeedAdjudicationResult`.
- N7-D08: Readiness recommendation `reject` is a gate finding, not `final_decision=reject`. It requires the D07 human/hybrid high-risk acceptance path before any reject adjudication authority can be persisted.
- N7-D08: The validation support packet is the frozen evidence/risk/human-check boundary for recommendation and adjudication. After support packet creation, recommendation/adjudication MUST consume the support packet and MUST NOT re-read live EvidenceMap, SearchPlan, SearchRun, LiteratureResourcePoolSnapshot, or evidence basket state as business truth.
- N7-D08: If upstream evidence/search/resource state changes after support packet creation, the runner MUST create a new readiness assessment and support packet before adjudication instead of repairing refs in place.
- N7-D09: Recommendation packet and automation handoff are separate contracts. `TopicSelectionNeedAdjudicationRecommendationPacket@v1` is model-like recommendation artifact/provenance only; `TopicSelectionValidateNeedAdjudicationNodeResult@v1` is the normalized runner result consumed by downstream automation.
- N7-D09: Recommendation input MUST be limited to the frozen validation support packet, readiness summary, selected candidate snapshot, sibling candidate summary, accepted policy instructions, and ref-grounded risk/evidence summaries. It MUST NOT read live DB state, mutable EvidenceMap/SearchPlan/SearchRun/resource data, hidden reasoning, raw provider logs, or debate transcripts.
- N7-D09: Recommendation output MAY contain only D06/D07 whitelist fields: `final_decision`, `rationale`, `required_actions`, `gap_codes`, `accepted_risk_refs`, `residual_risk_refs`, `rejected_reason`, `merge_target_need_candidate_ref`, and `searchplan_recheck_reason`. It MUST NOT contain `route_outcome`, `next_node_id`, `repair_target`, DB status fields, authority ids to create, or direct workflow commands.
- N7-D09: Model profile is `topic-selection.need-adjudication.single-agent.v1`. Default execution mode is `codex_assisted`; `provider_llm` is explicit quality upgrade; `mocked_llm` is test/acceptance-only. Structured JSON schema output is required, with low creativity and high reasoning-depth policy. Automatic fallback is disabled.
- N7-D09: The runner result/handoff MUST include `status`, `route_outcome`, `need_candidate_ref`, readiness/support/adjudication refs when created, reserved `validated_need` target ref for `validate`, `next_node_id` or `repair_target` when applicable, `required_actions`, blocker/warning codes, risk refs, recheck/merge refs when applicable, recommendation packet ref, and harness trace artifact ref.
- N7-D09: Downstream automation MUST consume only the runner result/handoff, never the recommendation packet directly. `route_outcome=advance_to_human_confirmation` routes to Node 8; `repair_need_candidate` routes to candidate repair; `repair_search_plan` routes to SearchPlan recheck; `stop_rejected`, `hold_candidate`, and `stop_merged` stop or hold the current candidate; `blocked` and `require_human_review` do not auto-advance.
- N7-D10: Retry, idempotency, and duplicate-adjudication protection are locked. Every runner invocation MUST carry `workflow_run_id` and `node_attempt_id`; node result, recommendation packet, readiness/support refs, adjudication refs, and trace artifacts MUST be bound to that attempt.
- N7-D10: `node_attempt_id` reuse is an exact replay request. If an existing node result and trace for that attempt are available and the input hash matches, the runner returns the existing node result with replay provenance and performs no authority writes. If replay evidence is missing or the input hash drifts, the runner returns `blocked`.
- N7-D10: New attempts are append-only before adjudication. They MAY create fresh readiness/support packets under `create_fresh`, but once the selected NeedCandidate has `result_adjudication_id` or an existing adjudication result, the runner MUST NOT create a second adjudication authority.
- N7-D10: Duplicate or pending adjudication returns a blocked/duplicate node result containing the existing adjudication ref when resolvable and the existing N7 handoff ref when available. Automation may continue only by consuming that existing handoff or by starting an explicit repair/human-supervised flow.
- N7-D10: Model-like invocation may retry at most once under the same profile for transient transport or malformed structured-output issues before any adjudication authority write. It MUST NOT automatically change provider, fall back to Codex, fall back to mocked output, change `final_decision`, or rerun as keyword/rule-only adjudication.
- N7-D10: Readiness/support packets created before a later model/gate failure remain append-only audit facts and MUST be referenced in the blocked node result; the runner must not roll them back or reuse them implicitly as latest packets in a later attempt.
- N7-D11: Node result status taxonomy is locked to `ready`, `blocked`, and `require_human_review`. The runner MUST NOT introduce `ready_with_warning`, duplicate-specific statuses, replay-specific statuses, or route-specific statuses.
- N7-D11: `ready` means the node result is immediately consumable by automation. It MAY represent fresh authority creation or an exact replay of an existing node result, but it MUST carry a valid `route_outcome` other than `blocked` or `require_human_review`.
- N7-D11: `blocked` means the current attempt cannot auto-advance and MUST carry `blocker_codes`, repair hints, and any existing refs that explain the block. Duplicate/pending adjudication is represented as `status=blocked` plus `blocker_code=DUPLICATE_OR_PENDING_ADJUDICATION`, not a separate status.
- N7-D11: `require_human_review` means the current attempt cannot be safely materialized or advanced without human/hybrid acceptance. It MUST carry review reason codes, recommendation/support refs when available, and no direct workflow command.
- N7-D11: Warnings never change status. Warning details are carried only in `warning_codes` and trace/audit refs.
- N7-D11: Replay never changes status. Exact replay returns the original status with `replay_provenance`; replay drift or missing replay evidence returns `blocked`.
- N7-D12: Implementation readiness is accepted. Node 7 is `implementation_ready`; automation callability is `callable` after `runValidateNeedAdjudicationScenario`, shared contracts, profile registry entry, trace artifact, and tests landed.
- N7-D12: Current repo support is sufficient for callable WorkflowHarness execution: readiness/support/adjudication domain services and REST routes exist, duplicate adjudication is guarded through `result_adjudication_id`, AgentOrchestrator and profile registry exist, and harness trace artifacts provide exact replay lookup.
- N7-D12: The implementation gaps are closed for the harness path: `TopicSelectionNeedAdjudicationRecommendationPacket@v1`, `TopicSelectionValidateNeedAdjudicationNodeResult@v1`, `topic-selection.need-adjudication.single-agent.v1`, the `needValidation` harness dependency, strict D08-D11 validators, and replay/duplicate lookup helpers have landed.
- N7-D12: No DB migration was required because node result/recommendation/trace remain artifact/control-plane scoped and exact replay can use existing workflow-run trace lookup. Future route-level node-runner indexing must still use DB SSOT if it adds durable storage.
- N7-D12: Verification covered shared contracts, model profile registry, service lineage guard, runner happy path, high-risk gate, recheck/repair routes, readiness enum blockers, support freeze, duplicate protection, and replay drift.
- N7-D12-AM01: The runner MUST cover the full shared readiness recommendation enum, including `merge_required` and `park`. Every value other than `ready_for_validation` blocks before support packet creation and adjudication. `merge_required` and `park` are readiness gate findings, not `final_decision=merge` or `final_decision=park`; they require the D07 human/hybrid acceptance path before any adjudication authority may be persisted.
- N7-D12-AM02: Support-packet lineage validation MUST be enforced in both the WorkflowHarness runner and `TopicSelectionNeedValidationService.adjudicateNeed`. Direct REST adjudication must not become a compatibility lane that accepts a stale packet. The service guard must reject mismatches among support packet, readiness assessment, NeedCandidate, evidence map, search run, search plan, literature snapshot, and policy/schema expectations with `VERSION_CONFLICT` or `GATE_CONSTRAINT_FAILED`.
- N7-D12-AM03: Exact replay requires a pre-implementation storage capability check. If existing workflow/artifact/trace lookup cannot reliably fetch a prior node result and trace by `workflow_run_id + node_attempt_id`, implementation MUST pause and use the DB SSOT workflow for a durable node-result index. Replay MUST NOT silently degrade into a new attempt or an ad hoc local storage path.

### Node Input
MUST include:
- workflow run id and node attempt id
- selected need candidate ref/version
- evidence map/search/search-plan/literature snapshot refs
- evidence role bundle refs
- sibling candidate refs or candidate-pool projection ref
- readiness expectation
- support packet expectation
- readiness/support packet mode, defaulting to `create_fresh`
- recommendation profile and execution mode when model-like recommendation is requested
- proposed final decision packet for mocked/Codex/provider modes
- accepted risk refs and residual risk refs when relevant
- policy version
- output schema version

### Node Result
MUST include:
- readiness assessment ref when created
- validation support packet ref
- readiness recommendation and blocker/repair hints when readiness blocks
- adjudication result ref
- final decision
- route outcome
- node status
- blocker codes, warning codes, and review reason codes
- replay provenance or duplicate-adjudication refs when applicable
- next node id or repair target when applicable
- loopback target ref when non-validate
- required actions
- risk refs
- recheck request refs when created
- memory suggestion refs when created
- artifact refs for model-like recommendation or fixture packet
- harness trace artifact ref

### Acceptance Checks
- node MUST NOT create `ValidatedNeed`.
- node MUST NOT create `V1bInputBundle`.
- `validate` decision still requires `human-confirm-need`.
- `validate` may prepare a human-confirmation recommendation package, but that package is not human confirmation.
- merge decisions require merge target.
- recheck decisions require actionable reason and target.
- pending adjudication blocks duplicate adjudication.
- mocked LLM remains acceptance-only.
- LLM/Codex/provider/mock recommendation packets cannot contain derived candidate status fields or loopback targets.
- WorkflowHarness orchestration logic consumes `route_outcome`; DB status fields remain service-derived and audit-only.
- model-like high-risk recommendations return `require_human_review` unless explicitly accepted by a `human` or `hybrid` adjudication packet.
- runner does not auto-select latest readiness/support packet.
- all non-ready readiness recommendations, including `merge_required` and `park`, block before support packet/adjudication authority creation.
- readiness `merge_required` and `park` are gate findings, not persisted merge/park decisions.
- support packet freezes downstream evidence/risk/human-check inputs for recommendation and adjudication.
- support packet lineage is guarded by both WorkflowHarness and the adjudication service, including direct REST calls.
- downstream automation consumes `TopicSelectionValidateNeedAdjudicationNodeResult@v1`, not the model recommendation packet.
- recommendation packets cannot contain `route_outcome`, `next_node_id`, or direct workflow commands.
- exact replay returns existing node result/trace without authority writes.
- exact replay is backed by existing workflow-run trace lookup by `workflow_run_id + node_attempt_id + input_hash`.
- duplicate or pending adjudication blocks second adjudication creation and exposes existing refs.
- model retry stays same-profile and never falls back across provider/Codex/mock modes.
- node result status is only `ready`, `blocked`, or `require_human_review`.
- warnings, duplicate, and replay are represented by codes/provenance, not extra statuses.
- implementation is closed for the WorkflowHarness runner after the D12 test matrix passed and automation callability was updated to `callable`.

### Implementation Readiness Review
Decision: `implementation_ready`, `automation_callability=callable`.

Complexity is medium-high but bounded. The node coordinates multiple existing services, optional model-like recommendation, and replay semantics; it does not add debate, new authority tables, or a new adjudication domain service.

Implementation MUST preserve these existing boundaries:
- `TopicSelectionNeedValidationService.assessCandidateReadiness` owns readiness authority.
- `TopicSelectionNeedValidationService.createValidationDecisionSupportPacket` owns support-packet authority.
- `TopicSelectionNeedValidationService.adjudicateNeed` owns adjudication authority and duplicate protection.
- `TopicSelectionWorkflowHarnessService.runValidateNeedAdjudicationScenario` coordinates, validates, records trace, and returns automation handoff only.
- `TopicSelectionAgentOrchestratorService` may produce recommendation artifacts only; it does not write authority.

Known implementation risks:
- explicit readiness/support packet validation must not fall back to latest-by-candidate service behavior;
- shared readiness enum drift must not leave `merge_required` or `park` unhandled by the runner;
- support-packet freeze must prevent downstream live evidence/search/resource rereads;
- support-packet lineage must be guarded in the service as well as the harness so direct REST calls cannot bypass N7 semantics;
- exact replay needs reliable lookup by `workflow_run_id` and `node_attempt_id`;
- replay storage gaps must pause implementation rather than degrading replay to a fresh run or local artifact workaround;
- high-risk model recommendations must return `require_human_review` without partial adjudication writes;
- duplicate adjudication must expose existing refs without creating a second result;
- `validate` must remain a ready handoff to Node 8, not N7-level human confirmation.

## Node 8: Human Confirm Need

### Automation Goal
Make human confirmation explicit and fixture-safe for automated scenarios.

### Node Input
MUST include:
- adjudication result ref/version
- adjudication `output_validated_need_id` as the reserved target id
- support packet ref
- need candidate ref/version
- `HumanConfirmationInput@v1`
- fixture/provenance label when acceptance tests simulate a human

### Node Result
MUST include:
- status: `ready | blocked | require_human_review`
- route outcome: `advance_to_publish_v1b_input_bundle | blocked | require_human_review`
- human decision ref when created
- validated need ref using the reserved `output_validated_need_id` when materialized
- `HumanConfirmationSemanticReview@v1` trace/audit artifact ref
- `HumanConfirmationSemanticReviewContextPacket@v1` trace/audit artifact ref
- carried evidence/search/literature refs
- carried accepted/residual risk refs
- required human checks snapshot
- blocker, warning, or review reason codes when applicable
- next node id only when ready
- harness trace artifact ref

### Acceptance Checks
- N8 materializes `TopicSelectionValidatedNeedRecord` with N7's reserved `output_validated_need_id`; it must not mint or accept an alternate `validated_need_id`.
- the reserved id is an automation anchor until materialized, so existence checks must query `TopicSelectionValidatedNeedRecord`.
- actor type must be `human`, `hybrid`, or `human_delegated`.
- `hybrid` means a human remains accountable while Codex or another assistant may draft auditable rationale/checklist text after human review.
- `human_delegated` means the accountable human authorizes Codex or a provider LLM to execute confirmation under fixed policy `n8-validate-only-delegation-v1`.
- delegated confirmation records only `delegated_executor.executor_type`, `delegated_executor.provenance_ref`, and `delegated_executor.policy_id`.
- fixture human decisions must be provenance-labeled.
- model, Codex, provider, or cached output cannot satisfy human confirmation by itself and cannot be recorded as the confirming actor without `HumanConfirmationInput@v1` using `actor_mode=human_delegated`.
- Codex-assisted confirmation content must be stored only as reviewed input/provenance or delegated executor output; it must not bypass `actor_mode`, `accountable_human_ref`, `rationale`, confirmation recording, or deterministic N8 validation.
- delegated confirmation cannot accept newly introduced risk, override required human checks, resolve merge/reject/park choices, or mutate upstream evidence/search/candidate content.
- N8 must produce `HumanConfirmationSemanticReview@v1` before materialization.
- semantic review may parse N7 adjudication rationale, support-packet required checks, residual risk refs, confirmation rationale, and delegated executor output.
- semantic review must not re-adjudicate candidate value, change N7 final decision, invent accepted risks, re-read EvidenceMap for evidence roles, mutate upstream content, or run debate.
- semantic review failure returns `blocked` or `require_human_review`; it cannot auto-change the decision.
- duplicate validated need materialization blocks.
- no v1b bundle is created by this node.

### Node Result And Handoff
`TopicSelectionHumanConfirmNeedNodeResult@v1` is the only N8 output consumed by downstream automation.

Status rules:
- `ready`: `HumanConfirmedDecision` exists, reserved `ValidatedNeed` has been materialized, semantic review is `pass` or `warning`, and `route_outcome=advance_to_publish_v1b_input_bundle`.
- `blocked`: contract, ref, reserved id, risk/check coverage, semantic scope, duplicate, or repository safety failure prevents auto-advance.
- `require_human_review`: semantic alignment is ambiguous, model review failed after allowed retry, or confirmation rationale needs operator judgment.

Handoff rules:
- `ready` MUST set `next_node_id=topic-selection.v1a.publish-v1b-input-bundle.v1`.
- `blocked` and `require_human_review` MUST NOT set `next_node_id`.
- N8 MUST NOT create `TopicSelectionV1aToV1bInputBundleRecord`; Node 9 owns v1b bundle publication.
- Downstream automation consumes the node result, not `HumanConfirmationInput@v1`, semantic review output, or `HumanConfirmedDecision` directly.
- Forbidden statuses: `ready_with_warning`, `duplicate`, `replayed`, and route-specific statuses.

### Retry And Idempotency
- Same `node_attempt_id + input_hash`: exact replay returns the existing `TopicSelectionHumanConfirmNeedNodeResult@v1` and performs no writes.
- Reserved `output_validated_need_id` already materialized: return `blocked + DUPLICATE_VALIDATED_NEED`; do not compare input hashes to produce idempotent ready.
- `blocked` and `require_human_review` attempts are append-only trace/audit evidence; later retry must use a new `node_attempt_id`.
- Human decision written without ValidatedNeed materialization returns `blocked + PARTIAL_CONFIRMATION_WRITE`; recovery is explicit human/operator repair only.

### Implementation Readiness Review
Decision: `implementation_ready`, `automation_callability=callable`.

Implementation result:
- shared contracts and schemas landed for `HumanConfirmationInput@v1`, `HumanConfirmationSemanticReviewContextPacket@v1`, `HumanConfirmationSemanticReview@v1`, and `TopicSelectionHumanConfirmNeedNodeResult@v1`
- model profile `topic-selection.confirmation-semantic-review.single-agent.v1` is registered
- route/service confirmation accepts normalized `HumanConfirmationInput@v1` while preserving legacy `human_actor`/`human_rationale` compatibility
- fixed delegation policy `n8-validate-only-delegation-v1`, duplicate reserved-id guard, and partial confirmation write guard landed
- `runHumanConfirmNeedScenario` emits semantic context/review artifacts, exact replay, ready/blocked/review node result, trace artifact, and Node 9 handoff
- existing HumanConfirmedDecision artifact refs, input snapshots, and trace artifacts are sufficient; no DB migration was required

Minimum tests:
- contract schema coverage for the four N8 contracts
- happy path materializes reserved `ValidatedNeed` and routes to Node 9
- delegated mode accepts only fixed-policy, provenance-backed execution
- semantic review negatives cover hidden reject/merge/park, missing checks, missing risk acceptance, ambiguous rationale, and malformed retry
- retry tests cover exact replay, `DUPLICATE_VALIDATED_NEED`, and `PARTIAL_CONFIRMATION_WRITE`
- boundary tests prove N8 does not reread EvidenceMap, mutate N7 adjudication, create v1b bundle, or run debate

### Minimal Confirmation Contract
`HumanConfirmationInput@v1` is a node-level value contract, not a DB authority and not a separate delegation system.

MUST include:
- `actor_mode: human | hybrid | human_delegated`
- `accountable_human_ref`
- `rationale`
- `accepted_risk_refs`
- `required_check_results[]` with `check_id` and `result=accepted|not_applicable`
- `delegated_executor` only when `actor_mode=human_delegated`

`delegated_executor` MUST include:
- `executor_type: codex | provider_llm`
- `provenance_ref`
- `policy_id: n8-validate-only-delegation-v1`

The fixed delegation policy forbids caller-defined scopes, a standalone delegation contract, newly accepted risk, required-check overrides, merge/reject/park resolution, and upstream content mutation.

### Semantic Review Contract
`HumanConfirmationSemanticReview@v1` is a node-level audit artifact, not DB authority.

MUST include:
- `status: pass | warning | blocked`
- `alignment_codes`
- `risk_coverage: complete | missing_required_acceptance`
- `required_check_coverage: complete | incomplete`
- `scope_violations`
- `rationale_summary`
- `provenance_ref`

Default semantic review mode is `codex_assisted`. `provider_llm` is an explicit quality upgrade, deterministic parsing is allowed for trivial cases, and `mocked_llm` is test/acceptance-only. The authority gate remains human review plus deterministic validation.

### Semantic Review Invocation
Semantic review MUST consume a frozen `HumanConfirmationSemanticReviewContextPacket@v1`.

The context packet freezes:
- adjudication ref, final decision, rationale, reserved ValidatedNeed id, and version
- support packet ref, required checks, residual risk refs, and version
- NeedCandidate ref, stable summary, and version
- `HumanConfirmationInput@v1` snapshot
- delegated executor provenance snapshot when present
- policy ids, schema versions, and expected output schema

Invocation rules:
- profile: `topic-selection.confirmation-semantic-review.single-agent.v1`
- default mode: `codex_assisted`
- provider mode: explicit quality upgrade only
- deterministic parser: trivial fully structured checks only
- mocked mode: test/acceptance-only
- retry: same profile and same mode at most once for transient or malformed structured output
- fallback: no provider/Codex/mock/keyword/default fallback may continue materialization
- output: structured `HumanConfirmationSemanticReview@v1` only
- cache: exact-match reuse only by context hash, profile id, execution mode, policy version, and output schema version

Semantic review failure returns `require_human_review` or `blocked`; it never silently bypasses review.

### Reserved Id Boundary
- reserved by: `topic-selection.v1a.validate-need-adjudication.v1`
- source field: `TopicSelectionValidateNeedAdjudicationResultRecord.output_validated_need_id`
- materialized by: `topic-selection.v1a.human-confirm-need.v1`
- target field: `TopicSelectionValidatedNeedRecord.validated_need_id`
- forbidden: generating, replacing, or reinterpreting the reserved id inside N8

## Node 9: Publish v1b Input Bundle

### Automation Goal
Normalize the deterministic v1a-to-v1b handoff so v1b can consume one stable input boundary.

### Boundary Consensus
- Node 9 is deterministic: no LLM, Codex, provider call, semantic parser, or debate runtime is allowed.
- Node 9 is the final forward node of the v1a main chain.
- N8 is the v1a domain-result terminal node because it materializes `TopicSelectionValidatedNeedRecord`.
- N9 is the v1a-to-v1b handoff terminal node because it publishes `TopicSelectionV1aToV1bInputBundleRecord`.
- v1a side-channel governance and repair flows, such as quality signals, accepted risk, recheck requests, and memory suggestions, are not considered later main-chain nodes.
- Node 9 must not re-evaluate topic value, reinterpret human confirmation, or mutate v1a authority objects.

### Node Input
`PublishV1bInputBundleNodeInput@v1` is a handoff contract, not a thin wrapper around `validated_need_id`.

MUST include:
- `validated_need_ref` and version when available.
- `source_need_candidate_ref` and version.
- `adjudication_result_ref`.
- `support_packet_ref`.
- `human_decision_ref`.
- `evidence_map_ref`.
- `search_run_ref`.
- `search_plan_ref`.
- `literature_snapshot_ref`.
- `evidence_role_bundle` refs.
- `risk_refs`.
- `memory_suggestion_refs`.
- `recheck_request_refs`.
- `expected_bundle_version`.
- `policy_version`.
- `output_schema_version`.

The runner may read DB records to verify refs and construct the bundle, but DB live reads must not replace the caller-declared handoff refs.

### Handoff Contract Role
- 承上: freeze the N8-confirmed v1a result boundary by checking all declared refs against `TopicSelectionValidatedNeedRecord` lineage.
- 启下: publish one stable `TopicSelectionV1aToV1bInputBundleRecord` that v1b must consume as its entry boundary.
- v1b nodes should not reconstruct v1a context by independently reading multiple v1a authority records when a v1b input bundle exists.

### Traceability
N9 must preserve two trace layers:
- Business lineage trace: carried in `TopicSelectionV1aToV1bInputBundleRecord` through validated need, source candidate, adjudication, support packet, human decision, evidence/search/literature, risk, memory, recheck, and trace refs.
- Automation execution trace: carried in the WorkflowHarness trace artifact through node input, input hash, bundle version, bundle payload hash, idempotency result, carried refs, assertions, blockers, and `harness_trace_artifact_ref`.

Trace artifacts must not include hidden reasoning, raw provider logs, raw debate transcripts, or new semantic explanations.

### Replay And Idempotency
- Same `node_attempt_id + input_hash`: exact replay returns the existing node result and performs no bundle write.
- Same `validated_need_ref + expected_bundle_version` with an existing bundle: return `ready` with `idempotency_result=reused_existing_bundle`; do not create another bundle.
- Missing `expected_bundle_version`: Harness blocks with `INVALID_PAYLOAD`; service compatibility may keep default behavior, but automation must be reproducible.
- Same `node_attempt_id` with changed input hash: return `blocked + REPLAY_INPUT_HASH_MISMATCH`.
- A new bundle version is allowed only when `expected_bundle_version` is explicitly supplied and lineage/hash validation passes.

### Node Result
MUST include:
- v1b input bundle ref
- bundle version
- bundle hash or payload hash when available
- carried authority refs
- carried risk/recheck/memory refs
- idempotency result
- harness trace artifact ref

### Acceptance Checks
- missing human decision blocks.
- stale or mismatched refs block.
- duplicate publish returns existing bundle only when `expected_bundle_version` matches.
- missing `expected_bundle_version` blocks in WorkflowHarness automation.
- output MUST NOT create v1b `ResearchSlice`, `TopicQuestionContract`, package, v1c, bridge, or PaperProject authority.

### Failure Semantics
Keep N9 failures few and stable:
- `INVALID_PAYLOAD`: missing required refs, missing `expected_bundle_version`, invalid ref type, malformed policy/schema fields.
- `NOT_FOUND`: required authority record cannot be found.
- `VERSION_CONFLICT`: declared input refs do not match `ValidatedNeed` lineage, or the same `node_attempt_id` is reused with a different input hash.
- `GATE_CONSTRAINT_FAILED`: required handoff authority is present but not eligible, such as missing/non-confirm human decision, missing evidence role bundle, or unresolved blocker that cannot be carried to v1b.

First implementation must not introduce semantic duplicate detection across different bundle versions. Exact version reuse is enough for v1.

### Implementation Readiness Review
Decision: ready to implement.

Complexity: controlled. N9 is deterministic, has no LLM/model/debate branch, and writes only one handoff authority record.

Contracts:
- `PublishV1bInputBundleNodeInput@v1` MUST be explicit and schema-tested.
- `TopicSelectionPublishV1bInputBundleNodeResult@v1` MUST be a shared contract because downstream automation consumes it.
- Node result SHOULD NOT hard-code the first v1b node while v1b node policies remain under refinement; it should expose the v1b input bundle ref as the entry boundary.

Service/Harness boundary:
- Existing route/service API MAY remain `validated_need_id + bundle_version + created_by` for compatibility.
- WorkflowHarness MUST enforce explicit refs, `expected_bundle_version`, input hash, replay, and trace.
- Service SHOULD add minimal lineage guards using existing records, but MUST NOT require the full Harness handoff input on the public route.

DB migration: not required. Existing bundle records, control-plane artifacts, and trace artifacts are sufficient.

Implementation may start once the shared contracts and test matrix are added.

## Implementation Order
1. Review and promote preparatory v1a node policies from `draft` to `implementation_ready`. Done for the current complete-v1a inventory, including Node 4 N4-D10.
2. Add shared or backend-local normalized node runner DTOs. Done through Node 9 PublishV1bInputBundle.
3. Add `WorkflowHarness` helper primitives for deterministic node trace/assertion assembly so every new runner does not copy trace boilerplate.
4. Keep `runCreateTopicSeedScenario` as the deterministic node-runner baseline for non-model v1a nodes.
5. Implement `runSnapshotLiteratureResourcePoolScenario`. Done.
6. Implement `runCreateSearchPlanScenario`. Done.
7. Implement `runRecordSearchRunScenario`. Done.
8. Implement `runBuildEvidenceMapScenario`. Done.
9. Implement `runValidateNeedAdjudicationScenario`. Done.
10. Implement `runHumanConfirmNeedScenario`. Done.
11. Implement `runPublishV1bInputBundleScenario`. Done.
12. Refactor `.ai/scripts/topic-selection-real-e2e.mjs` so the entire complete v1a segment calls harness methods rather than direct route choreography.
13. Add drift checks that prevent topic-selection scripts from introducing new v1a business sequencing outside scenario/harness runners.

## Verification Plan
- Focused unit tests for every new runner:
  - happy path
  - malformed input
  - stale/currentness failure
  - blocked path
  - idempotency where applicable
- Real E2E mock run:
  - sample size 4
  - complete v1a through harness from TopicSeed to v1b input bundle
  - v1b/v1c may remain existing script orchestration until their own normalization slices
- Quality gate smoke:
  - `TOPIC_SELECTION_REAL_E2E_REPEATS=1`
  - `TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4`
  - `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1`
- Backend typecheck and focused backend tests.
- Project governance lint.

## Done Criteria
- The first normalized v1a node is `topic-selection.v1a.create-topic-seed.v1`.
- Every complete v1a node has a `WorkflowHarness` runner.
- Every complete v1a node emits a normalized result and harness trace artifact.
- The real E2E v1a segment no longer performs direct route choreography.
- Existing route/service APIs remain backward compatible.
- T-089 node policies remain the semantic source; T-088 harness code only executes those policies.
- Quality gate passes after migration.
