# 03 Implementation Notes

## Runtime Implementation Status
- Initial `AgentOrchestrator` runtime helper is implemented.
- DMP v1 model profile registry/schema validator is implemented.
- `AgentOrchestrator` now consumes the profile registry for profile/run-mode/output-contract enforcement and provider model-option resolution.
- Shared invocation provenance/audit envelope contracts are implemented and `AgentOrchestrator` validates audit snapshots against them before artifact persistence.
- Generate-need-candidate `WorkflowHarness` scenario execution exists for the current v1a runtime slice.
- Initial v1a need-discovery multi-agent debate role invocation runtime exists for `generate-need-candidate`.
- v1a need-discovery debate provider slots now support explicit per-slot model-option selection while keeping concrete provider/model resolution inside the profile registry.
- 2026-07-05 对账终态（详见 §2026-07-05 对账收口）：profile escalation runtime → superseded（D-27）；route-level runner integration → 由 T-115/T-107 路由落地吸收；supplemental debate round 跨执行自动化 → 语义裁决移交 T-089 backlog ⑤；legacy script migration → 按 D-28 修订判据达成（18 脚本审计 18/18 合规）。本包工程范围收口。

## 2026-05-23 Phase 4 Slice: v1a Full Harness E2E Runner
- Added a v1a-only real-environment runner that executes the normalized v1a chain through `TopicSelectionWorkflowHarnessService` nodes instead of route-level compatibility orchestration.
- Scope is limited to the nine v1a nodes: `create-topic-seed`, `snapshot-literature-resource-pool`, `create-search-plan`, `record-search-run`, `build-evidence-map`, `generate-need-candidate`, `validate-need-adjudication`, `human-confirm-need`, and `publish-v1b-input-bundle`.
- The existing `.ai/scripts/topic-selection-real-e2e.mjs` remains the broader v1a -> v1b -> v1c product canary; the new runner is the v1a harness acceptance entry and must not redefine business contracts.
- Resource sampling may still be loaded through the existing persisted sample-set API because sampling is the productized input layer before the normalized v1a workflow.
- The runner supports both existing sample-set replay and deterministic local sample-set creation for repeatable acceptance.
- Implementation review fix: SearchPlan blueprint semantic checks now compare `TopicSelectionFunctionalRef` arrays by canonical identity rather than object key order, avoiding DB serialization drift.

## 2026-05-23 Phase 4 Follow-up: N6 Mixed Debate Harness
- Closed a debate-runtime gap where arbiter issue framing and final synthesis received only role-level summary refs but not the structured role-level summary payloads.
- `TopicSelectionNeedDiscoveryDebateLoopService` now passes bounded `debate_payloads` into arbiter calls:
  - issue framing receives `role_level_summaries`;
  - final synthesis receives `issue_frame` plus `role_level_summaries`.
- The payloads remain structured summaries and issue frames only; raw transcripts, hidden reasoning, provider logs, and authority objects are still excluded.
- `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` now supports `TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate` and explicit N6 debate slot execution modes for explorer, deep critic, issue framing, and final synthesis.
- The E2E runner supports a mixed local/provider path where Codex supplies an explorer role response and provider LLMs execute deep critic plus arbiter stages.
- Guardrails added to prevent ambiguous script configurations:
  - final synthesis cannot be configured as `codex_assisted`;
  - `codex_assisted` executor kind must match `codex_assisted` execution mode outside debate;
  - provider model-option selection is explicit per `provider_llm` debate slot, and model-option overrides are rejected on non-provider slots.

## 2026-05-23 Phase 4 Follow-up: Per-Slot Debate Model Options
- Added `slot_model_option_overrides` for the v1a need-discovery debate loop, flowing from WorkflowHarness input through the generate-need-candidate adapter into each role/stage invocation.
- Provider-backed slots resolve `model_option_id` in this order: explicit slot override, legacy node-level `model_option_id`, profile default. Non-provider slots always carry `model_option_id=null`.
- Runtime validation rejects unknown slot ids, non-object override payloads, empty/non-string model option ids, and any model-option override applied to a `mocked_llm` or `codex_assisted` slot.
- The v1a harness E2E script now maps provider-backed debate slots to profile-specific OpenAI/DashScope option ids instead of reusing the single-agent generate profile option.
- The script summary artifact records `debate_slot_model_option_overrides` so mixed Codex/provider debate runs are reproducible without encoding provider-specific behavior in business workflow branches.
- Automatic provider fallback remains forbidden; changing a slot's model option is an explicit operator/script configuration and produces normal invocation provenance.

## 2026-05-23 Phase 4 Follow-up: Slot Model Option Negative E2E
- Added `pnpm topic-selection:v1a-harness-negative-e2e` as a wrapper-only negative runner around the existing v1a harness E2E entrypoint.
- The negative runner does not define workflow semantics; it launches `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` with invalid slot model-option configurations and asserts failure behavior.
- Covered cases:
  - model option supplied for a `codex_assisted` slot fails before harness startup and writes no summary/authority rows;
  - cross-profile model option supplied to a provider slot fails at `harness generate-need-candidate` and writes no `NeedCandidate`, `ValidatedNeed`, or v1b input bundle.
- The negative run exposed an imprecise profile-resolution error for explicit unknown model options. `TopicSelectionModelProfileRegistryService` now distinguishes missing explicit options from profiles with no provider options.

## 2026-05-19 Joint Alignment
- Locked D-01 and D-02 in `06-joint-decisions.md`.
- Scope remains planning/runtime-boundary alignment only; no product implementation changes yet.

## 2026-05-19 D-03 Alignment
- Locked `AgentOrchestrator` as executor invocation boundary.
- Clarified that `WorkflowNodeExecutor` owns business context resolution; `AgentOrchestrator` must not query business DB state to assemble context.

## 2026-05-19 D-04 Alignment
- Locked execution mode boundaries.
- `mocked_llm` is test/acceptance-only and must be database/audit-distinguishable from provider-backed decisions.
- Product runtime must not silently fallback to mock execution.

## 2026-05-19 D-05 Alignment
- Locked profile escalation as deterministic attempt-level policy.
- Escalation cannot silently cross execution modes, change executor kind, downgrade to heuristics, reuse cached responses, or bypass guardrails.

## 2026-05-19 D-06 Alignment
- Locked trace/audit/persistence boundary around the existing topic-selection control-plane.
- Recorded compatibility gaps: resource sampling full structured output in DB, missing explicit mode/executor/non-provider runtime fields, and unconstrained inline artifact/trace payloads.
- Handling: preserve completed T-079 compatibility, but T-088 must prefer DB summaries plus artifact refs for future runtime.

## 2026-05-19 D-07 Alignment
- Locked multi-agent debate as bounded executor, not workflow spine, not profile escalation, and not default fallback.
- Debate output cache/retention/artifact policy is owned by T-089 on a node-by-node basis.

## 2026-05-19 D-08 Alignment
- Locked Codex-assisted execution as the default low-cost local mode for this personal local-first project.
- Codex can replace most single-agent provider calls and can execute specific debate roles when node policy allows it.
- Provenance, schema validation, deterministic guardrails, audit, and authority persistence boundaries remain mandatory.

## 2026-05-19 D-09 Alignment
- Locked existing runner migration as a zero-dual-track requirement.
- Legacy real-flow/E2E/quality/provider-stability commands may remain only as CLI wrappers around `WorkflowHarness` scenarios.
- Migration completion requires scenario registry coverage, parity canary evidence, deletion or wrapper-only reduction of old implementation paths, repository drift checks, and wrapper tests that prevent direct business-service execution from scripts.

## 2026-05-19 D-14 Alignment
- T-088 runtime must consume registered `WorkflowScenario` ids rather than script-local scenario definitions.
- Initial T-089 scenario registry lives in `dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`.
- Harness implementation must keep scenario orchestration separate from matrix and node-policy business semantics.

## 2026-05-19 Initial `AgentOrchestrator` Runtime Implementation
- Added `TopicSelectionAgentOrchestratorService` in `apps/backend/src/services/topic-selection-agent-orchestrator-service.ts`.
- The helper is a runtime/model-execution boundary, not a domain service and not a workflow engine.
- It receives caller-built prompt/context/input refs and does not read topic-selection business DB state to assemble context.
- It routes:
  - `mocked_llm` from explicit fixture output only, and rejects `run_mode=product`;
  - `codex_assisted` from operator/Codex supplied structured response packets;
  - `provider_llm` through the existing `BackendLlmGateway`.
- It validates every mode against the same JSON schema with AJV and returns one normalized result shape with status, structured output, validation summary, blocker codes, provenance, and audit snapshot.
- It records a small diagnostic audit artifact through the existing control-plane when a `TopicSelectionControlPlaneService` is supplied.
- Audit artifacts store hashes, mode/source provenance, validation summaries, blocker codes, and telemetry summaries; they do not store full structured output, prompt text, raw provider logs, hidden reasoning, or secrets.
- This implementation does not yet add profile escalation decisions, retry orchestration beyond `BackendLlmGateway`, WorkflowHarness sequencing, or node-specific generate-need-candidate adapter wiring.

## 2026-05-20 DMP Runtime Foundation Slice 1: Profile Registry/Schema Validator
- Added shared DMP v1 profile contracts in `packages/shared/src/research-lifecycle/topic-selection-agent-profile-contracts.ts`.
- The shared contract defines:
  - `TopicSelectionModelProfileRegistry@v1`;
  - canonical run modes `test | acceptance | product`;
  - normalized parameter keys `creativity`, `reasoning_depth`, `output_budget`, `structured_output_required`, and `output_format`;
  - provider fallback policy with `automatic_fallback=false`;
  - failure handling policy with semantic retry disabled and supplemental rounds marked as non-retry;
  - audit policy fields that forbid raw provider response and hidden reasoning persistence;
  - run-mode eligibility by execution mode.
- Exported the new contract through the research-lifecycle barrel and package exports.
- Added `TopicSelectionModelProfileRegistryService` in `apps/backend/src/services/topic-selection-model-profile-registry-service.ts`.
- The service validates registry shape plus DMP semantic guardrails:
  - duplicate profile ids;
  - duplicate model option ids;
  - unknown provider ids;
  - provider profiles without model options;
  - automatic provider fallback;
  - semantic retry;
  - supplemental round as retry;
  - `mocked_llm` product eligibility;
  - structured-output capability drift;
  - raw provider response / hidden reasoning audit drift;
  - technical retry that changes invocation semantics.
- Added default v1 need-discovery profiles for:
  - `topic-selection.need-discovery.explorer.v1`;
  - `topic-selection.need-discovery.deep-critic.v1`;
  - `topic-selection.need-discovery.arbiter-framing.v1`;
  - `topic-selection.need-discovery.arbiter-final.v1`.
- The default profiles include OpenAI balanced and DashScope budget explicit-selection options, but automatic fallback remains disabled.
- `arbiter-final` allows `mocked_llm` for test/acceptance and `provider_llm` for real execution; `codex_assisted` remains disallowed at the profile level for now to avoid final-synthesis ambiguity.
- Registered `DASHSCOPE_API_KEY_CODING` in `.ai/llm-config/registry/config_keys.yaml` after the LLM config-key check surfaced an existing SSOT gap from local provider-key setup.
- This slice originally did not wire profile resolution into `TopicSelectionAgentOrchestratorService`; that gap is closed by the 2026-05-20 Slice 2 implementation below.

## 2026-05-20 Quality Review And DMP Runtime Foundation Slice 2: Orchestrator Profile Resolution
- Reviewed the Slice 1 implementation against DMP-01 through DMP-10 and fixed two dual-track risks:
  - `TopicSelectionAgentRunMode` was duplicated in backend runtime code instead of consuming the shared profile contract type;
  - `provider_llm` callers could still pass concrete `model` and `request_policy` values through harness/adapter inputs, bypassing the profile registry as SSOT.
- Added `topic-selection.generate-need-candidate.single-agent.v1` to the default registry for the existing single-agent generate-need-candidate runtime path.
- `TopicSelectionAgentOrchestratorService` now:
  - resolves every invocation through `TopicSelectionModelProfileRegistryService`;
  - enforces profile status, execution mode, run mode, and `output_contract`;
  - resolves provider calls from `profile_id + model_option_id`, with default OpenAI balanced option when no explicit option is selected;
  - derives gateway `model`, timeout, and technical retry policy from the selected model option/profile;
  - records `profile_version`, `profile_hash`, `model_option_id`, `normalized_params_hash`, capability-degrade markers, and `output_contract` in provenance;
  - uses `source_kind=provider_response` for provider-backed output to match DMP-07 vocabulary.
- `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` and `TopicSelectionWorkflowHarnessService` now accept only optional `model_option_id` for provider option selection; they no longer pass concrete provider/model/request-policy values.
- `BackendLlmGateway` accepts normalized params and provider overrides from the orchestrator request; DashScope structured-output calls now apply model-option `provider_overrides` such as `enable_thinking`.
- Updated runtime fixtures from the old ad hoc profile id to `topic-selection.generate-need-candidate.single-agent.v1` while preserving `topic-selection-generate-need-candidate` as the prompt template id.
- This slice still does not implement profile escalation decisions, full multi-agent debate role/stage execution, route-level node runner integration, or legacy script migration.

## 2026-05-20 DMP Runtime Foundation Slice 3: Shared Invocation Provenance Contract
- Added shared invocation provenance/audit contracts in `packages/shared/src/research-lifecycle/topic-selection-agent-invocation-contracts.ts`.
- The contract defines one normalized envelope for `mocked_llm`, `codex_assisted`, and `provider_llm` invocation attempts, including:
  - node/run/attempt ids and `invocation_attempt_id`;
  - execution mode, executor kind, source kind, run mode, and `non_provider`;
  - profile id/version/hash, selected model option, normalized params hash, and output contract;
  - prompt packet hash, response hash, structured output hash, cache/reuse markers, provider/model ids, and telemetry summary;
  - optional fixture, Codex/operator, and debate-extension metadata.
- Exported the new contract through the research-lifecycle barrel and shared package exports.
- `TopicSelectionAgentOrchestratorService` now imports provenance/status/source/executor types from the shared contract instead of maintaining backend-local copies.
- `TopicSelectionAgentOrchestratorService` validates every audit snapshot with `topicSelectionAgentInvocationAuditSnapshotSchema` before recording the control-plane diagnostic artifact.
- Provider-backed provenance must include selected model option and normalized params hash; mock/Codex provenance must remain `non_provider=true` and carry fixture/operator markers.
- Audit snapshots still store hashes, provenance, validation summaries, blocker codes, and telemetry summaries only; they do not store full structured output, raw provider responses, raw debate transcripts, hidden reasoning, or secrets.
- This Slice 3 entry was a shared runtime foundation only; the later Slice 4 entry below adds the initial need-discovery debate loop while profile escalation runtime, route-level runner integration, and legacy script migration remain pending.

## 2026-05-20 DMP Runtime Foundation Slice 4: Need Discovery Debate Role Invocation Runtime
- Added role-level v1a need-discovery debate contracts to `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`:
  - `TopicSelectionNeedDiscoveryExplorerNotes`;
  - `TopicSelectionNeedDiscoveryDeepCriticNotes`;
  - `TopicSelectionNeedDiscoveryRoleLevelSummary`;
  - `TopicSelectionNeedDiscoveryDebateIssueFrame`;
  - `TopicSelectionNeedDiscoveryDebateFinalSynthesisArtifact`.
- Extended generate-need-candidate artifact keys with:
  - `debate_role_output`;
  - `debate_role_level_summary`;
  - `debate_issue_frame`;
  - `debate_final_synthesis`.
- `TopicSelectionAgentOrchestratorService` now accepts caller-supplied `invocation_attempt_id` and optional `debate_extension`, then carries them into the shared provenance/audit envelope for mocked, Codex-assisted, provider-backed, and provider-blocked invocations.
- `TopicSelectionModelProfileRegistryService` now exports canonical profile ids for explorer, deep critic, arbiter framing, arbiter final, and the existing single-agent generate-need-candidate path.
- Added `TopicSelectionNeedDiscoveryDebateLoopService` as a node-internal debate runtime for v1a `generate-need-candidate`.
- The debate loop:
  - invokes one or more `explorer` worker instances and one or more `deep_critic` worker instances;
  - blocks when mandatory worker roles are missing in `mocked_llm` or `codex_assisted` execution;
  - records each worker structured output as `debate_role_output`;
  - merges same-role outputs into deterministic role-level summaries;
  - invokes single-instance `arbiter.issue_framing`;
  - invokes single-instance `arbiter.final_synthesis` to produce the existing `RankedCandidateDraftBatch`;
  - records final synthesis as a compact artifact containing refs, hashes, counts, terminal result, and final invocation attempt id;
  - enforces the D-19 maximum of three debate rounds at the runtime input boundary.
- `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` now routes `executor_kind=multi_agent_debate` through the debate loop before existing D-20 schema validation, D-21 admission gates, D-22 routing, and optional D-23 persistence.
- `TopicSelectionWorkflowHarnessService` now passes debate mocked/Codex role packets into the adapter and includes debate artifacts in harness trace refs.
- The implementation deliberately does not add a `NeedCandidateSet`, does not persist raw debate transcripts, does not allow worker roles to write authority objects, and does not create a second persistence path.
- Remaining gaps after this slice:
  - supplemental repair rounds are bounded by `round_index` but not yet automatically orchestrated across multiple loop executions;
  - provider/Codex real-flow debate evidence remains pending;
  - route-level node runner and legacy script migration are still pending.

## 2026-05-20 DMP Runtime Foundation Slice 5: Executable Debate Scenario Contract Consumption
- Added shared debate scenario contract DTOs/schemas and the concrete v1a generate-need-candidate contract under `packages/shared/src/research-lifecycle/topic-selection-debate-scenario-contracts.ts`.
- Exported the contract through the shared research-lifecycle barrel and package exports.
- `TopicSelectionNeedDiscoveryDebateLoopService` now reads role/stage metadata from the shared contract instead of duplicating profile ids, output contracts, schema names, prompt ids, debate policy id, node id, instance defaults, and round cap.
- Provider-mode execution now follows contract defaults:
  - `explorer.round_1_discovery` runs two instances by default;
  - `deep_critic.round_1_discovery` runs one instance by default;
  - `arbiter.issue_framing` and `arbiter.final_synthesis` run one instance each.
- Slot-level execution overrides are supported for debate runtime and pass through the adapter/harness boundary, allowing explicit Codex substitution for permitted slots without changing the final arbiter execution mode.
- The runtime remains profile-registry-driven for provider/model/normalized-param resolution, preserving DMP-10 separation between scenario contract and provider option registry.
- `arbiter.final_synthesis` remains Codex-forbidden in the executable v1 contract, matching the model profile registry and preventing final-output authority ambiguity.

## 2026-05-20 Real E2E Provider Hardening
- Ran the provider-backed topic-selection real E2E against `ai-rag-finetuning-2022-2026` and used the failures to harden the v1b product chain.
- `.ai/scripts/topic-selection-real-e2e.mjs` now supports:
  - `TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID` to resume from an existing provider-generated resource sample set;
  - `TOPIC_SELECTION_REAL_LLM_MAX_RETRIES` for long-chain provider transient tolerance;
  - `TOPIC_SELECTION_REAL_PROVIDER_ID` for explicit provider selection in downstream LLM nodes.
- The successful E2E reused `resource_sample_set_eaf6437e-a88c-43ef-8e65-2216ffd2272e`, which was created by a real OpenAI resource-sampling run and had status `ready_with_warning`.
- `TopicSelectionV1bResearchSliceService` now canonicalizes known evidence refs back to the inherited evidence role bundle before persistence and removes known non-evidence upstream refs from evidence arrays with quality flags.
- `TopicSelectionV1bTopicQuestionService` now normalizes provider-produced boundary refs and falsification source refs without weakening strict evidence-ref validation:
  - extra unknown boundary refs are removed only when canonical boundary refs remain;
  - unknown falsification `trigger_source_refs` are removed while `trigger_evidence_refs` stay strict;
  - normalization adds human-review triggers so provider-output repairs remain visible.
- DashScope with `DASHSCOPE_API_KEY` failed authentication; mapping `DASHSCOPE_API_KEY_CODING` authenticated but returned a no-options research-slice payload, so DashScope structured-output compatibility remains unaccepted for this flow.

## 2026-05-20 Real E2E Harness Migration: v1a Generate Need Candidate
- Migrated `.ai/scripts/topic-selection-real-e2e.mjs` so the v1a `generate-need-candidate` step no longer calls the compatibility `POST /topic-selection/v1a/need-candidates` single-candidate route.
- The script now keeps the legacy command name but executes `TopicSelectionWorkflowHarnessService.runGenerateNeedCandidateScenario` for `topic-selection.real-e2e.canary.v1`.
- The harness path records:
  - `GenerateNeedCandidateNodeInput`;
  - exploration and arbiter context packets;
  - ranked draft batch artifact;
  - minimum schema validation report;
  - `CandidateDraftAdmissionReport`;
  - `SupplementalRoundRoutingDecision`;
  - admitted-only `PersistNeedCandidateBatchCommand`;
  - harness trace artifact;
  - persisted `NeedCandidate` refs and candidate-pool projection ref/hash.
- The script exposes `TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE` with values `mocked_llm`, `codex_assisted`, or `provider_llm`.
  - Default is `mocked_llm` when `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1`.
  - Default is `provider_llm` for normal real-provider E2E.
  - Provider mode selects the model option through `TopicSelectionModelProfileRegistryService` semantics, not through ad hoc script provider/model wiring.
- The compatibility route remains available for manual/single-candidate creation, but the real E2E canary no longer claims that route as the generate-node workflow path.
- A mock real-flow run initially failed at v1b readiness with `blocked_by_stale_trace` because the harness-built refs omitted evidence/search/literature version ids, creating support-packet mismatch blockers.
- Fixed the script harness input to carry the canonical `evidence_map_version`, `plan_version`, `snapshot_version`, and evidence-unit version refs into batch persistence, preserving v1a-to-v1b trace currentness.
- Remaining migration gap: the full real-E2E script still orchestrates resource sampling, v1b, v1c, bridge, and downstream checks directly; only the v1a generate-node has been moved behind the unified harness in this slice.

## 2026-05-20 WorkflowScenario Quality Runner Migration
- Marked `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` as a legacy compatibility script and removed the file after migration.
- Added `.ai/scripts/topic-selection-workflow-scenario-runner.mjs` as the canonical CLI runner for registered topic-selection workflow scenarios.
- `pnpm topic-selection:real-e2e:quality-gate` now wraps `topic-selection.real-e2e.scale-quality.v1` instead of invoking a standalone quality script.
- Extracted the useful legacy assertions into the scale-quality scenario runner:
  - resource sample hash/status presence;
  - selected literature count and role-target counts;
  - sample hash and selected-set stability across repeats;
  - selected literature role-semantics prechecks;
  - PaperProject intake creation, idempotency, and negative status boundaries;
  - downstream feedback/recheck counts;
  - v1b non-advance negative stop before package, v1c, bridge, and PaperProject intake.
- `.ai/scripts/topic-selection-real-e2e.mjs` now records the top-level `scenario_id` supplied by `TOPIC_SELECTION_WORKFLOW_SCENARIO_ID`, so child runs under the quality runner are distinguishable as `topic-selection.real-e2e.canary.v1` or `topic-selection.v1b.non-advance-negative.v1`.
- The migrated semantic audit exposed stale resource-sampling rationale after deterministic role canonicalization; `TopicSelectionResourceSamplingService` now rewrites `classification_rationale` and `method_families` to match the final selected role whenever guardrails override the LLM role.
- Remaining migration gap: the new scenario runner is a CLI-level scenario wrapper. Full node-by-node execution for resource sampling, v1b, v1c, bridge, and downstream still needs deeper `WorkflowHarness` sequencing in later slices.

## 2026-05-20 v1a WorkflowHarness Normalization Slice Opened
- Opened `07-v1a-workflow-harness-normalization.md` as an explicit T-088 implementation slice.
- Governance decision: reuse T-088 for runtime implementation and T-089 for semantic node-policy source; do not create a new task package.
- Correction: complete v1a starts at `TopicSeed`; the previous evidence-map-first framing described only the evidence-to-need subchain.
- Scope is complete v1a after an upstream TitleCard exists:
  - `topic-selection.v1a.create-topic-seed.v1`;
  - `topic-selection.v1a.snapshot-literature-resource-pool.v1`;
  - `topic-selection.v1a.create-search-plan.v1`;
  - `topic-selection.v1a.record-search-run.v1`;
  - `topic-selection.v1a.build-evidence-map.v1`;
  - `topic-selection.v1a.generate-need-candidate.v1`;
  - `topic-selection.v1a.validate-need-adjudication.v1`;
  - `topic-selection.v1a.human-confirm-need.v1`;
  - `topic-selection.v1a.publish-v1b-input-bundle.v1`.
- TitleCard creation is explicitly upstream of v1a for this slice.
- Resource sampling is explicitly excluded from complete v1a and remains the v1a input layer with a separate draft policy.
- The target standard is automated orchestrator-callable node runners with normalized node input/result, authority refs, artifact/audit refs, warning/blocker codes, assertions, and harness trace artifacts.
- Implementation should proceed node by node, using the existing `runGenerateNeedCandidateScenario` as the quality bar rather than accepting route-level E2E success as sufficient.

## 2026-05-20 v1a WorkflowHarness Normalization: Create TopicSeed
- Implemented `TopicSelectionWorkflowHarnessService.runCreateTopicSeedScenario` for `topic-selection.v1a.create-topic-seed.v1`.
- The runner calls `TopicSelectionSearchResourceService.createTopicSeedFromTitleCard`; it does not write TopicSeed authority directly.
- The runner emits one normalized result shape across success and blocked paths, including node input, node result, authority refs, audit refs, blocker codes, assertions, harness trace snapshot, and a control-plane trace artifact.
- Blocked `AppError` paths such as missing TitleCard return a blocked harness result without TopicSeed authority refs.
- `TopicSelectionSearchResourceService.createTopicSeedFromTitleCard` now validates direct service calls for non-empty `seed_version` and non-empty final `intent_summary` after fallback to TitleCard brief.
- TopicSeed input snapshots now include final `intent_summary` and `seed_version` so replay/debug does not have to infer them from the persisted record.
- `seed_kind` remains fixed to `title_card` by the service and is not accepted as caller input.

## 2026-05-20 v1a WorkflowHarness Normalization: Automation Callability Dimension
- Added automation callability as a separate node-evaluation dimension.
- `implementation_ready` now means the node semantics are clear enough to implement, while `automation_callability=callable` means a normalized `WorkflowHarness` runner exists and can be invoked without script-local route choreography.
- Updated `07-v1a-workflow-harness-normalization.md` so the 9-node v1a inventory records both policy status and automation callability.
- Current callable v1a nodes are:
  - `topic-selection.v1a.create-topic-seed.v1`;
  - `topic-selection.v1a.generate-need-candidate.v1`.
- Historical note: at this point in the task history, `topic-selection.v1a.build-evidence-map.v1` was still `partially_callable`; it is now callable after the Node 5 runner landing below.

## 2026-05-20 v1a Node 2 Alignment: Snapshot Boundary And Source Of Truth
- Locked the first two decisions for `topic-selection.v1a.snapshot-literature-resource-pool.v1` before implementing the runner.
- The node is a deterministic authority-materialization boundary for `TopicSelectionLiteratureResourcePoolSnapshot`; it must not perform resource sampling, literature selection, evidence-role classification, or evidence-polarity judgment.
- The TitleCard evidence basket is the single normalized source of included literature. `ResourceSampleSet` may appear only as upstream provenance after its selected literature has already been attached to the evidence basket.
- This keeps resource sampling as the v1a input layer and prevents the snapshot runner from introducing a second content source beside the evidence basket.

## 2026-05-20 v1a Node 2 Alignment: Source Scope
- Locked N2-D03 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- The normalized harness path supports only `source_scope=title_card_evidence_basket`.
- `manual_selection` and `search_result` remain shared-contract compatibility values, but they are not automated v1a harness scopes until explicit resolvers exist.
- The runner should block unsupported scopes with `UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A` before creating a snapshot authority.

## 2026-05-20 v1a Node 2 Alignment: Resource Quality Gate
- Locked N2-D04 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- The runner should block only traceability and authority-creation failures: missing TopicSeed, lineage mismatch, empty evidence basket, unresolved evidence-basket literature ids, unsupported normalized source scope, or failed control-plane gate/transition.
- Resource maturity gaps should be returned as `source_health_summary.warning_codes` rather than hard blockers: incomplete key content, abstract, source count, pipeline readiness, stale/duplicate status, and fulltext readiness.
- This preserves downstream quality decisions for SearchPlan, EvidenceMap, NeedCandidate generation, and v1b intake instead of overloading the snapshot node.

## 2026-05-20 v1a Node 2 Alignment: Snapshot Hash And Replay
- Locked N2-D05 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- `snapshot_hash` should identify replay-equivalent snapshot contents, not a single execution attempt.
- Stable hash inputs should include `title_card_id`, TopicSeed ref, `source_scope`, evidence basket `updated_at`, evidence-basket-derived literature refs, content source refs, `source_health_summary`, and `policy_version_id`.
- Runtime artifacts must be excluded from the hash: repository-generated snapshot id, control-plane ids, harness trace artifact id, `created_at`, and `created_by`.
- The runner tests should verify that equivalent repeated runs keep the same `snapshot_hash` even when audit/control-plane ids differ.

## 2026-05-20 v1a Node 2 Alignment: Harness Runner Contract
- Locked N2-D06 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- The runner target is `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario`.
- The runner should delegate authority creation to `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot` and must not perform direct repository writes.
- The runner should be callable as a single node with normalized node input/result shapes, including one blocked-result envelope that preserves blocker codes and avoids snapshot authority refs.
- The node remains `not_callable` until code, trace artifact schema, and success/blocked runner tests are implemented.

## 2026-05-20 v1a Node 2 Alignment: Audit And Trace Boundary
- Locked N2-D07 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- Control-plane records are the authoritative audit facts; harness trace is execution evidence for automation and replay debugging.
- The runner trace schema should be `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1`.
- The trace should include normalized input/result, `snapshot_hash`, `source_health_summary`, authority refs, control-plane refs, blockers, warnings, and assertions.
- The trace must not contain hidden reasoning, secrets, provider logs, raw LLM transcripts, or raw debate transcripts.

## 2026-05-20 v1a Node 2 Alignment: SearchPlan Handoff
- Locked N2-D08 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- The runner result should produce a downstream handoff packet for SearchPlan containing snapshot ref, version, hash, source scope, literature refs, content source refs, and `source_health_summary`.
- Node 3 must treat the `LiteratureResourcePoolSnapshot` as the resource truth and must not re-read the mutable TitleCard evidence basket, `ResourceSampleSet`, selected refs, or current search results as resource truth.
- `snapshot_hash` is an assertion/replay check, not a replacement for the snapshot authority ref.
- Basket changes after snapshot creation require a new snapshot before they can influence SearchPlan.

## 2026-05-20 v1a Node 2 Alignment: Idempotency And Repeated Runs
- Locked N2-D09 for the upcoming `runSnapshotLiteratureResourcePoolScenario` implementation.
- The runner should use append-only default behavior: repeated equivalent runs may create new snapshot authority refs.
- `snapshot_hash` is the content-equivalence key, so equivalent repeated runs must keep the same hash even when authority refs and audit/control-plane refs differ.
- The runner must not silently reuse an existing snapshot by hash or skip control-plane evidence because an equivalent hash already exists.
- Any future reuse-by-hash mode should be an explicit opt-in policy and runner input flag, not the default behavior.

## 2026-05-20 v1a Node 2 Implementation Readiness Review
- Locked N2-D10 and promoted `topic-selection.v1a.snapshot-literature-resource-pool.v1` to `policy_status=implementation_ready`.
- At readiness-review time the node was not yet callable; this was superseded by the implementation slice below.
- Complexity is moderate and bounded because the implementation can reuse the existing `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot` authority path and the deterministic control-plane pattern already used by `runCreateTopicSeedScenario`.
- Implementation does not require new persistence models, schema migration, provider calls, AgentOrchestrator, Codex, or debate runtime.
- Required implementation hardening: align `snapshot_hash` with the locked replay payload, expand `source_health_summary.warning_codes`, block unsupported harness `source_scope`, add success/blocked trace assertions, and verify append-only repeated-run behavior.

## 2026-05-20 v1a WorkflowHarness Normalization: Snapshot Literature Resource Pool
- Implemented `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario`.
- The node is now `automation_callability=callable`.
- The runner calls `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot` and keeps repository writes inside the authority service.
- The runner emits normalized success/blocked results, assertions, downstream SearchPlan handoff data, audit refs, warning/blocker codes, and `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1`.
- `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot` now computes `snapshot_hash` from stable content replay inputs: title card, TopicSeed ref, source scope, basket timestamp, literature refs, source refs, source-health summary, and policy version.
- Resource maturity issues now appear as source-health warnings without blocking traceable resources.
- Equivalent repeated runs remain append-only at the authority level while preserving the same `snapshot_hash`.

## 2026-05-20 v1a Node 2 Quality Review Follow-up
- Fixed the blocked-path audit gap found during self-review: when missing literature causes the deterministic gate/transition to block, the harness result now preserves the control-plane input snapshot, readiness gate, and transition attempt refs instead of returning an audit-empty blocked result.
- Hardened normalized Node 2 input validation so `topic_seed_ref` must be a concrete TopicSeed authority ref with `version_id` and matching `title_card_id`.
- Hardened harness string validation so malformed programmatic inputs return `INVALID_PAYLOAD` instead of leaking runtime `TypeError`.
- Added regression coverage for blocked audit refs and non-concrete TopicSeed refs.

## 2026-05-20 v1a Node 3 Alignment: SearchPlan Boundary
- Locked N3-D01 for `topic-selection.v1a.create-search-plan.v1`.
- Node 3 is a deterministic authority-materialization boundary for `TopicSelectionSearchPlan` and `TopicSelectionCoverageRowIntent`; it must not execute retrieval, build EvidenceMap, judge evidence roles, generate research content, call models, call Codex, or run debate.
- The normalized harness path consumes Node 2's `LiteratureResourcePoolSnapshot` authority as resource truth and must not re-read mutable TitleCard evidence basket state or alternate resource sources.
- Explicit `coverage_intents` are required in the normalized harness path. Existing service/route fallback from `query_intents` to support-only coverage rows may remain as compatibility behavior, but it is not the normalized automated v1a path.
- The runner input should carry expected `snapshot_hash` so stale or mismatched snapshot assumptions block before SearchPlan authority creation.

## 2026-05-20 v1a Node 3 Alignment: Blueprint Source
- Locked N3-D02 for `topic-selection.v1a.create-search-plan.v1`.
- `SearchPlan blueprint` is an explicit upstream input to Node 3; the node validates and materializes it but does not generate it.
- Allowed origins are WorkflowScenario/test fixtures, human-authored input, Codex-assisted local drafting before invocation, and a future separately defined upstream blueprint-generation node.
- Any automatic blueprint generation must be a separate node with its own execution-mode/model policy, context contract, output contract, and verification.
- Blueprint provenance may be recorded for traceability, but it does not become resource truth and does not replace the `LiteratureResourcePoolSnapshot` authority.
- Corrected contract ownership: `TopicSelectionSearchPlanBlueprint` is a topic-selection module-level value contract, not an N3-only local shape.
- In the initial slice the blueprint is frozen through Node 3 normalized input, control-plane input snapshot, and harness trace rather than persisted as a standalone authority object.

## 2026-05-20 v1a Node 3 Alignment: Blueprint Minimum Contract
- Locked N3-D03 as the module-level `TopicSelectionSearchPlanBlueprint@v1` minimum contract.
- Required blueprint fields cover origin/provenance, TopicSeed/Snapshot lineage, expected snapshot hash, optional plan/recheck lineage, query intents, coverage intents, constraints, exclusions, coverage strategy, role coverage expectation, policy version, and output schema version.
- Required coverage row fields are `coverage_key`, `intent_type`, `query`, `rationale`, `required`, `priority`, `expected_evidence_role`, `target_source_types`, and `refs`.
- `target_source_types` and `refs` may be empty arrays, but must be present after normalization so Node 4 and EvidenceMap do not infer missing semantics.
- Consumer review passed: the contract supports Node 3 materialization, Node 4 coverage bindings, EvidenceMap coverage lineage, NeedCandidate role-bundle consumption, and future blueprint-generation output without creating a second shape.

## 2026-05-21 v1a Node 3 Alignment: Blueprint LLM Profiles
- Locked N3-D04 for SearchPlanBlueprint semantic draft/review model policy.
- `codex_assisted` is the default execution mode for both blueprint draft and review in this local personal-use workflow.
- `provider_llm` is reserved for explicit operator upgrade or provider-quality scenarios; `mocked_llm` remains test/acceptance-only.
- Draft profile: `topic-selection.search-plan-blueprint.draft.v1`, output `TopicSelectionSearchPlanBlueprint@v1`, OpenAI `gpt-5.5` default, OpenAI `gpt-5.5` high-accuracy override, DashScope `qwen3.6-plus` budget override, normalized params `creativity=medium`, `reasoning_depth=high`, `output_budget=large`, `json_schema`.
- Review profile: `topic-selection.search-plan-blueprint.review.v1`, output `TopicSelectionSearchPlanBlueprintReview@v1`, same provider options, normalized params `creativity=low`, `reasoning_depth=high`, `output_budget=medium`, `json_schema`.
- Node 3 remains deterministic and does not call these profiles; it only consumes a validated blueprint and writes SearchPlan/CoverageRow authorities through the domain service.
- Automatic provider fallback is disabled; manual rerun or explicit model-option override must create new provenance.

## 2026-05-21 v1a Node 1/2 LLM Boundary Amendments
- Applied the discussion result as amendments in the original Node 1 and Node 2 sections instead of adding an N3 follow-up decision.
- N1-AM01 confirms `topic-selection.v1a.create-topic-seed.v1` remains deterministic with `execution_mode=none`; it does not call AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, or debate runtime.
- Optional upstream semantic preparation may draft `intent_summary` and `scope_notes` before Node 1, but that preparation is input drafting only. It does not write `TopicSelectionTopicSeed` authority.
- Reserved `TopicSeedIntentDraft@v1` as a possible future pre-node value artifact/profile, with no executable profile locked in this slice.
- N2-AM01 confirms `topic-selection.v1a.snapshot-literature-resource-pool.v1` remains deterministic and model-free. Resource sampling, role classification, evidence polarity, and evidence interpretation remain upstream or downstream semantics, not Node 2 behavior.

## 2026-05-21 v1a Node 3 Alignment: WorkflowHarness Runner Contract
- Locked N3-D05 for `topic-selection.v1a.create-search-plan.v1`.
- The normalized automation boundary is `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario`.
- The runner consumes `TopicSelectionSearchPlanBlueprint@v1` plus scenario/run metadata, not a bare permissive `CreateSearchPlanInput`.
- Strict pre-service validation must block lineage mismatch, stale `expected_snapshot_hash`, empty query intents, missing coverage intents, and missing coverage-row fields before SearchPlan authority creation.
- Route/service compatibility fallback may remain for legacy/manual API callers, but normalized harness execution must not derive coverage rows, evidence roles, coverage keys, priorities, refs, or rationales from fallback defaults.
- Authority writes remain delegated to `TopicSelectionSearchResourceService.createSearchPlan`; the runner must not write SearchPlan or CoverageRow repositories directly.
- The runner result must use one success/blocked envelope and record `WorkflowHarnessCreateSearchPlanScenarioTrace@v1`.

## 2026-05-21 v1a Node 3 Implementation: WorkflowHarness Runner
- Implemented `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario` and promoted Node 3 to `automation_callability=callable`.
- Added the shared `TopicSelectionSearchPlanBlueprint@v1` DTO/schema, including the exported schema-version constant used by the harness.
- Required strict coverage-intent semantics before authority creation.
- The runner validates exact blueprint schema version, TopicSeed/Snapshot/TitleCard lineage, expected snapshot hash, non-empty query intents, explicit non-empty coverage intents, and every required coverage-row semantic field.
- Non-object coverage intent entries and blank string-array entries block as malformed blueprint payloads instead of reaching the service fallback path.
- The runner delegates SearchPlan and CoverageRow authority writes to `TopicSelectionSearchResourceService.createSearchPlan`; it does not write repositories directly.
- The authority service now freezes the complete SearchPlan blueprint in the control-plane input snapshot when the normalized harness supplies one.
- The harness trace uses `WorkflowHarnessCreateSearchPlanScenarioTrace@v1` and records blueprint origin, provenance refs, expected/resolved snapshot hash, query intents, coverage intents, authority refs, blockers, warnings, and assertions.
- Blocked results return no SearchPlan or CoverageRow authority refs and still record a harness trace artifact when trace recording is available.
- Node 1 now accepts optional `intent_preparation_refs` for input-snapshot provenance without changing its deterministic execution mode.
- Node 2 now accepts optional `resource_sample_set_provenance_ref` for input-snapshot provenance while excluding it from `snapshot_hash`, so resource truth remains the LiteratureResourcePoolSnapshot contents.

## 2026-05-21 v1a Node 4 Alignment: No Debate Baseline
- Locked N4-D00 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 remains deterministic with `execution_mode=none`; AgentOrchestrator, BackendLlmGateway, Codex, provider LLMs, and debate runtime are not allowed.
- The node is a factual contract and lineage gate for SearchRun recording, result accounting, coverage-row binding integrity, raw-log separation, and Node 5 handoff consumability.
- Strong topic-quality guarding is still required, but it belongs to layered v1a/v1b/v1c gates and bounded loopback, not to Node 4 multi-agent debate.
- Any future agent-assisted search-result organization must be modeled upstream as input preparation or search execution, then handed to Node 4 for deterministic validation and recording.

## 2026-05-21 v1a Node 4 Alignment: SearchRun Authority Boundary
- Locked N4-D01 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 records already-produced search, import, or manual-result facts and does not execute retrieval providers.
- Search execution failure is not automatically a Node 4 failure. A failed SearchRun may be persisted as an audit fact when lineage, accounting, source health, and authority refs are valid.
- Failed SearchRuns are non-consumable for EvidenceMap creation and must return no Node 5 handoff.
- Node 4 itself blocks before SearchRun authority creation when the record contract is invalid or unsafe to persist.

## 2026-05-21 v1a Node 4 Alignment: Normalized Input Bundle
- Locked N4-D02 for `topic-selection.v1a.record-search-run.v1`.
- The normalized automation input is `TopicSelectionSearchRunRecordBundle@v1`, a module-level value contract rather than a new authority object.
- The bundle prevents dual-track SearchRun semantics by mapping losslessly to `RecordSearchRunInput` and keeping `TopicSelectionSearchResourceService.recordSearchRun` as the single authority-write boundary.
- Existing route payload compatibility may remain only if it stays semantically aligned with the bundle fields and does not become a second product contract.
- SearchPlan version is asserted only through `search_plan_ref.version_id`; there is no duplicate `expected_search_plan_version`.
- Snapshot version is asserted through `literature_resource_pool_snapshot_ref.version_id`, while `expected_literature_snapshot_hash` guards replay/currentness against the resolved snapshot contents.

## 2026-05-21 v1a Node 4 Alignment: Bundle Minimum Contract
- Locked N4-D03 for `topic-selection.v1a.record-search-run.v1`.
- `TopicSelectionSearchRunRecordBundle@v1` requires concrete SearchPlan and LiteratureResourcePoolSnapshot refs, an expected literature snapshot hash, run fact fields, accounting summaries, evidence binding records, raw-log audit material, policy version, and output schema version.
- Version checks rely only on `search_plan_ref.version_id` and `literature_resource_pool_snapshot_ref.version_id`.
- Snapshot hash currentness relies on `expected_literature_snapshot_hash`.
- `succeeded` and `partial` runs may produce Node 5 handoff only when `evidence_map_input_refs` is non-empty and lineage checks pass.
- `failed` runs remain persistable audit facts but are always non-consumable for EvidenceMap.

## 2026-05-21 v1a Node 4 Alignment: Result Accounting Integrity
- Locked N4-D04 for `topic-selection.v1a.record-search-run.v1`.
- Result accounting checks protect SearchRun audit integrity and do not judge topic value.
- `total_result_count`, `unique_literature_count`, `duplicate_result_count`, `failed_source_count`, and `skipped_source_count` must be non-negative and internally consistent.
- Evidence binding distinct literature count must not exceed `unique_literature_count`.
- Successful non-empty runs must have at least one coverage observation or evidence binding and zero failed sources.
- Partial and failed runs must expose their degraded condition in source health rather than hiding it in script output.

## 2026-05-21 v1a Node 4 Alignment: Controlled Coverage Semantics
- Locked N4-D05 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 permits controlled lightweight search/coverage semantic metadata for retrieval provenance and coverage audit.
- Allowed semantics include query provenance, source health, dedup summary, coverage missing reasons/notes, coverage assessment verdicts/issues, and search-coverage risk acceptances.
- Forbidden semantics include evidence role, evidence polarity, evidence strength, NeedCandidate refs, TopicQuestionContract refs, topic value scores, claim support verdicts, and claim-risk acceptance.

## 2026-05-21 v1a Node 4 Alignment: Bundle Draft/Review Execution Layer
- Locked N4-D06 for `topic-selection.v1a.record-search-run.v1`.
- Optional LLM/Codex execution may prepare or review `TopicSelectionSearchRunRecordBundle@v1` before Node 4, mirroring the Node 3 blueprint draft/review boundary.
- Node 4 remains deterministic and model-free; model-like output must pass schema and deterministic validators before the authority service is called.
- Codex-assisted is the default local path; provider execution is explicit upgrade/provider-quality only; mocked LLM is test-only; automatic provider fallback is disabled.

## 2026-05-21 v1a Node 4 Alignment: Snapshot Membership Boundary
- Locked N4-D07 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 does not retrieve, acquire, or create literature and does not refresh resource pools.
- Consumable SearchRun evidence bindings and evidence-map input refs must cite only literature refs from the resolved LiteratureResourcePoolSnapshot.
- Snapshot-outside refs are blocked in normalized consumable execution and cannot enter Node 5 handoff.
- New literature discovered by upstream search execution must first pass through resource acquisition/refresh, evidence basket update, Node 2 snapshot refresh, and any necessary Node 3 plan update.

## 2026-05-21 v1a Node 4 Alignment: Raw Artifact Boundary
- Locked N4-D08 for `topic-selection.v1a.record-search-run.v1`.
- Raw logs are audit-only search execution artifacts and cannot become evidence authority.
- Literature/Source refs remain the only EvidenceMap authority basis, and for normalized consumable Node 4 runs those literature refs must be snapshot members.
- Fulltext/abstract/manual locator refs may be carried as locator provenance for Node 5 EvidenceUnit locators, but they do not replace snapshot-member Literature/Source authority.
- Coverage semantic metadata explains retrieval coverage only and must not be reused as evidence strength, topic value, or claim support.
- The raw-artifact boundary prevents semantic drift between SearchRun audit evidence and Node 5 research evidence authority.

## 2026-05-21 v1a Node 4 Alignment: Handoff And Loopback Output
- Locked N4-D09 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 result exposes `consumable_for_evidence_map`, `downstream_handoff`, and `loopback_signal`.
- `downstream_handoff` uses `TopicSelectionSearchRunHandoff@v1`, exists only when `consumable_for_evidence_map=true`, and is consumed only by Node 5 `build-evidence-map`.
- `loopback_signal` uses `TopicSelectionSearchRunLoopbackSignal@v1`, is a non-authority orchestrator/control-plane repair signal, and is never Node 5 input.
- Allowed loopback targets are Node 3 SearchPlan revision, Node 2 snapshot refresh, upstream search execution/input preparation, or human search-coverage acceptance.
- In v1, handoff and loopback signal are mutually exclusive: consumable results move forward, repairable non-consumable results route back, and blocked record-contract failures rely on blocker codes plus trace evidence.

## 2026-05-21 v1a Node 4 Readiness Review
- Locked N4-D10 for `topic-selection.v1a.record-search-run.v1`.
- Decision: `implementation_ready`; automation has since moved to `callable` after the normalized runner implementation landed.
- The repo already has the authority path needed for SearchRun and coverage child records, so the implementation should harden existing service boundaries instead of adding a second SearchRun product path.
- Contract drift controls are mandatory: shared bundle/handoff/loopback contracts, one bundle-to-service mapper, strict snapshot/hash/member validation, route compatibility kept separate from normalized harness execution, and no evidence/need/value/claim semantics in Node 4.
- Complexity is moderate and bounded; no schema migration is expected unless implementation later proves an existing authority or trace artifact cannot represent required audit evidence.

## 2026-05-21 v1a Node 4 WorkflowHarness Implementation
- Implemented shared `TopicSelectionSearchRunRecordBundle@v1`, `TopicSelectionSearchRunHandoff@v1`, and `TopicSelectionSearchRunLoopbackSignal@v1` DTO/schema contracts with schema smoke coverage.
- Implemented `TopicSelectionWorkflowHarnessService.runRecordSearchRunScenario` with stable success, blocked, consumable handoff, and failed-audit result surfaces plus `WorkflowHarnessRecordSearchRunScenarioTrace@v1`.
- Hardened `TopicSelectionSearchResourceService.recordSearchRun` to enforce concrete SearchPlan/Snapshot refs, expected snapshot hash, accounting invariants, source-health semantics, snapshot-member Literature/Source refs, locator-provenance legality, raw-log audit-only boundaries, search-coverage-only accepted-risk refs, and failed-run `audit_only` state intent.
- Preserved the existing authority boundary: the harness maps the normalized bundle into `recordSearchRun` and does not write SearchRun or coverage repositories directly.
- Corrected coverage-row ref validation to title-card-scoped refs rather than versioned refs, matching the repo's current coverage-row authority semantics.
- Added focused coverage for schema validation, service guardrails, successful handoff, failed-audit no-handoff, snapshot hash drift, and snapshot-outside ref blocking.
- Verification passed with backend typecheck, full shared schema tests, SearchRun service tests, WorkflowHarness tests, v1a route integration tests, EvidenceMap regression tests, and topic-selection SearchRun shared contract tests.
- Full backend suite was rerun with the repo local env SSOT loaded from `.env.local`; T-054 and T-067 Prisma HTTP smoke tests passed. Final result: 699 tests, 698 passed, 0 failed, 1 skipped.

## 2026-05-21 v1a Node 4 Dual-Track Closure
- Closed a remaining contract/runtime drift risk in SearchRun authority refs.
- Shared `TopicSelectionSearchRunRecordBundle@v1` schema, HTTP route validation, WorkflowHarness pre-service validation, and `TopicSelectionSearchResourceService.recordSearchRun` now use the same explicit SearchRun ref vocabulary.
- `evidence_map_input_refs` allow only `literature_record`, `literature_source`, and locator-provenance refs (`literature_abstract`, `fulltext_document`, `fulltext_section`, `fulltext_paragraph`, `fulltext_anchor`, `manual_locator`).
- `evidence_bindings[].literature_ref` must be `literature_record`; `evidence_bindings[].source_refs` may be `literature_source` or locator-provenance refs only.
- `raw_log_artifact_ref` is audit-only and may be only `artifact_ref` or `raw_search_log`; it cannot appear in evidence authority or Node 5 handoff refs.
- `coverage_risk_acceptances[].accepted_risk_ref` now uses explicit search-coverage risk authority refs only: `accepted_risk` or `search_coverage_risk`.
- This keeps route compatibility, normalized harness execution, and service gate behavior aligned instead of relying on a permissive contract followed by a later service rejection.

## 2026-05-21 v1a Node 5 Alignment: Single-Agent Semantic Extraction
- Locked N5-D00 for `topic-selection.v1a.build-evidence-map.v1`.
- Node 5 is allowed to use Codex or provider LLM execution for partial semantic extraction, because source-statement extraction, locator selection, role suggestion, typed-link hints, clusters/patterns, and conflict hints are semantic work.
- Node 5 does not use multi-agent debate. The debate loop remains reserved for nodes that need broad exploration or deeper candidate discovery.
- Model-like execution produces only a structured extraction draft/review artifact. EvidenceMap authority materialization remains deterministic and must pass ref, source attribution, locator, coverage-row, and structural validators before persistence.
- Default local execution may be `codex_assisted`; `provider_llm` is an explicit quality upgrade; `mocked_llm` is test-only; `execution_mode=none` remains valid for caller-supplied extraction drafts.
- The implementation must keep one authority path: `WorkflowHarness` may coordinate extraction and validation, but `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun` remains the writer for EvidenceMap authorities.

## 2026-05-21 v1a Node 5 Alignment: Extraction Draft Contract
- Locked N5-D01 for `topic-selection.v1a.build-evidence-map.v1`.
- `TopicSelectionEvidenceMapExtractionDraft@v1` is a module-level EvidenceMap value contract, not a WorkflowHarness-private DTO and not an authority object.
- `TopicSelectionBuildEvidenceMapNodeInput@v1` is the node workflow wrapper around Node 4 `TopicSelectionSearchRunHandoff@v1`, workflow metadata, execution mode/profile, and the extraction draft.
- All producers use one draft shape: Codex-assisted, provider-LLM, mocked-LLM, human, and fixture output cannot define separate draft DTOs.
- `execution_mode=none` means the caller has already supplied a valid extraction draft; it is not a separate service-input path.
- The runner maps accepted draft fields into `CreateEvidenceMapFromSearchRunInput` only after deterministic validation. `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun` remains the sole authority writer.
- Audit may keep draft hashes or redacted draft artifacts, but drafts must not include hidden reasoning, raw provider responses, raw fulltext dumps, raw search logs as authority refs, or downstream authority ids/verdicts.

## 2026-05-21 v1a Node 5 Alignment: Materialization Status Handling
- Locked N5-D02 for `topic-selection.v1a.build-evidence-map.v1`.
- The materialization validator has three layers: schema, lineage, and materialization.
- `ready` creates EvidenceMap authority; `ready_with_warning` creates authority and records warning/issue codes; `review_required` and `blocked` do not create authority.
- `blocked` results are machine-routable and include blocker codes, failed validation layer, rejected draft refs, and repair target.
- `review_required` is reserved for semantically ambiguous drafts that need a revised extraction draft before persistence.
- Warning handling is automatic: the flow may continue, but warnings must remain visible to downstream NeedCandidate sufficiency checks.
- Block handling is automatic only as routing: schema retry, Node 4/upstream handoff repair, SearchRun/evidence-binding repair, re-extraction, or human evidence completion. Node 5 must not silently fix authority facts.
- `EvidenceMapMaterializationReport@v1` is the stable validator output; mapped `CreateEvidenceMapFromSearchRunInput` appears only for `ready` or `ready_with_warning`.

## 2026-05-21 v1a Node 5 Alignment: Extraction Execution Profile
- Locked N5-D03 for `topic-selection.v1a.build-evidence-map.v1`.
- `topic-selection.evidence-map-extraction.single-agent.v1` is the only model-like extraction profile for Node 5 v1.
- Concrete provider/model/parameter choices remain profile-registry-owned; Node 5 references profile id and execution mode only.
- `codex_assisted` is the default low-cost local mode; `provider_llm` is an explicit quality upgrade; `mocked_llm` is test-only; `execution_mode=none` requires a caller-supplied draft.
- Model-like execution receives `TopicSelectionEvidenceMapExtractionContextPacket@v1`, a frozen `evidence_extraction_context` packet. It must not read live DB, refresh resources, import literature, consume Node 6 exploration/arbiter context, or return any output except `TopicSelectionEvidenceMapExtractionDraft@v1`.
- Failure handling is same-profile retry at most once for transient/malformed output; no automatic provider/Codex/mock/keyword fallback is allowed.

## 2026-05-21 v1a Node 5 Alignment: Cache Reuse And Audit Provenance
- Locked N5-D04 for `topic-selection.v1a.build-evidence-map.v1`.
- Cache is cost/reproducibility infrastructure only; it does not change authority semantics.
- Context packet cache hits require exact match across node id, SearchRun handoff hash, SearchPlan version, LiteratureResourcePoolSnapshot hash, context compiler version, policy/schema/output versions, execution mode, profile id, and `evidence_extraction_context`.
- Response reuse is allowed only for local `codex_assisted` cost control with `cached_exact_invocation`, source attempt ref, matching context hash, and `non_provider=true`.
- `provider_llm` must never be satisfied by cached response reuse; provider-quality runs require real provider execution or must miss/block.
- Cached or reused drafts must still go through N5-D02 materialization validation before persistence.
- Audit provenance records context packet hash, profile id, execution mode, cache hit/miss/reuse source, draft hash, materialization report hash, accepted/rejected counts, role counts, and warning/blocker/review codes. Hidden reasoning, raw provider logs, raw fulltext dumps, raw search logs as authority, and Node 6/debate context payloads are forbidden.

## 2026-05-21 v1a Node 5 Alignment: Review-Required Revision Loop
- Locked N5-D05 for `topic-selection.v1a.build-evidence-map.v1`.
- `review_required` emits `EvidenceMapExtractionReviewPackage@v1` and writes no EvidenceMap authority.
- The only valid revision output is another full `TopicSelectionEvidenceMapExtractionDraft@v1`; there is no patch DTO or reviewer-only DTO.
- Revisions are append-only: new `node_attempt_id`, `revision_of_attempt_ref`, and `review_package_ref`; previous attempt artifacts are never overwritten.
- Context packet reuse is exact-match only. Upstream ref/hash, compiler, policy/schema/output, execution mode, profile, or context-family changes require recompilation.
- Automated retry remains limited to one same-profile attempt; additional revision is explicit operator-triggered workflow work, not an autonomous loop.
- Review packages must not store hidden reasoning, raw provider logs, raw fulltext dumps, raw search logs as authority, or Node 6/debate context payloads.

## 2026-05-21 v1a Node 5 Alignment: EvidenceMap Handoff
- Locked N5-D06 for `topic-selection.v1a.build-evidence-map.v1`.
- Node 5 v1 has one downstream handoff only: `TopicSelectionEvidenceMapHandoff@v1` to Node 6 `generate-need-candidate`.
- The handoff is produced only after `ready` or `ready_with_warning` materialization. `review_required` and `blocked` never produce Node 6 handoff.
- Review packages, repair targets, loopback routing, UI reads, audit reads, and verification projections are not workflow handoffs.
- Node 6 may consume EvidenceMap refs and `TopicSelectionNeedValidationEvidenceBundle` read projections, but not extraction drafts, review packages, raw model outputs, cache artifacts, or audit-only artifacts.
- `ready_with_warning` handoff carries warning/issue summaries as downstream constraints, not as strong evidence.

## 2026-05-21 v1a Node 5 Implementation Readiness Review
- Locked N5-D07 for `topic-selection.v1a.build-evidence-map.v1`.
- Implementation readiness is accepted as `implementation_ready`; after this implementation slice, automation callability is `callable` through `runBuildEvidenceMapScenario`.
- Initial landing does not need DB migration because extraction context, draft, materialization report, review package, and harness trace can be artifact/control-plane/audit refs while EvidenceMap authority remains the existing service boundary.
- Implementation order is shared contracts/schema, model profile registry, materialization validator/mapper, context/adapter path, WorkflowHarness runner, and focused tests.
- `/topic-selection/v1a/evidence-maps` remains compatibility/manual direct behavior; normalized automation must use the harness runner to avoid dual-track semantics.

## 2026-05-21 v1a Node 5 WorkflowHarness Implementation
- Implemented `TopicSelectionEvidenceMapExtractionDraft@v1`, `TopicSelectionBuildEvidenceMapNodeInput@v1`, `EvidenceMapMaterializationReport@v1`, `EvidenceMapExtractionReviewPackage@v1`, and `TopicSelectionEvidenceMapHandoff@v1` in shared EvidenceMap contracts.
- Added profile `topic-selection.evidence-map-extraction.single-agent.v1` to the backend model profile registry. The profile owns provider/model/parameter choices for Node 5 semantic extraction.
- Added deterministic `TopicSelectionEvidenceMapMaterializationService` as the gate between extraction drafts and `CreateEvidenceMapFromSearchRunInput`.
- Implemented `TopicSelectionWorkflowHarnessService.runBuildEvidenceMapScenario`.
- Successful `ready` / `ready_with_warning` runs call only `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun` for authority persistence, then emit Node 6 handoff.
- `blocked` and `review_required` runs do not create EvidenceMap authority. `review_required` emits a review package artifact for an explicit revised full draft.
- Fixed a review gap found during implementation: model-like Node 5 execution now carries `agent_invocation_audit_ref`, invocation status, warning codes, blocker codes, and error code into node results, audit refs, artifact refs, and trace output.
- No DB migration was introduced in this slice; new draft/report/review/trace payloads stay artifact/control-plane scoped while existing EvidenceMap persistence remains authoritative.

## 2026-05-21 v1a Node 5 Quality Review Fixes
- Closed review findings from the first N5 implementation pass.
- `TopicSelectionEvidenceMapHandoff@v1.warning_summary` now includes materialization-only warnings, not only persisted EvidenceUnit issue codes.
- Materialization lineage validation now compares full functional refs for SearchRun, SearchPlan, and LiteratureResourcePoolSnapshot, including type/version/title-card identity.
- Materialization now blocks locator provenance refs that would be rejected later by the EvidenceMap authority service, preventing `ready` reports followed by service-level ref failures.
- Same-source support/challenge ambiguity now requires a claim-conflict that covers the actual same-source unit keys; unrelated conflicts no longer clear the review requirement.

## 2026-05-21 N5 to N6 Handoff Consumption Guard
- Added optional `TopicSelectionEvidenceMapHandoff@v1` transition provenance to `runGenerateNeedCandidateScenario`.
- When the handoff is present, the runner validates that `evidence_map_ref`, `search_snapshot_refs`, and `resource_snapshot_refs` match the N5 handoff before compiling exploration/arbiter context.
- Node 6 default context refs now include the handoff, SearchRun, SearchPlan, LiteratureResourcePoolSnapshot, and optional NeedValidationEvidenceBundle refs for provenance.
- Added a business-input guard so Node 6 rejects EvidenceMap extraction drafts, extraction context packets, review packages, materialization reports, raw model/provider outputs, raw search logs, hidden reasoning, and debate transcripts as input refs.
- This closes the N5/N6 boundary without changing `GenerateNeedCandidateNodeInput`: the shared node input still carries authority refs and context packet refs, while the handoff remains WorkflowHarness transition provenance.

## 2026-05-22 N7/N8 Human Confirmation Boundary
- Locked the product meaning of human confirmation for the N7/N8 split.
- N7 `validate-need-adjudication` may persist a validate adjudication and may prepare recommendation/handoff material, but it does not create `ValidatedNeed` and does not satisfy human confirmation.
- N8 `human-confirm-need` remains the only path that writes `HumanConfirmedDecision` and materializes `ValidatedNeed`.
- "Human" is intentionally broad enough for local personal use: a `human`, `hybrid`, or `human_delegated` actor mode may be used.
- `hybrid` means a human reviews the evidence and may use Codex to draft auditable rationale/checklist text.
- `human_delegated` means a human authorizes Codex or a provider LLM to execute confirmation under fixed policy `n8-validate-only-delegation-v1` while the human remains the authorizer and accountability anchor.
- Codex/provider confirmation text is reviewed input/provenance or delegated executor output only. It cannot satisfy confirmation by itself, cannot bypass `actor_mode`, `accountable_human_ref`, or confirmation rationale, and cannot create `HumanConfirmedDecision` without explicit human, hybrid, or human_delegated submission.
- This avoids the dual-track risk of manual status edits: confirmation is an auditable action, not a direct DB state change.

## 2026-05-22 N7-D02 Agent Boundary
- Locked Node 7 execution boundary.
- Node 7 may use single-agent `codex_assisted`, `provider_llm`, or `mocked_llm` execution to prepare an adjudication recommendation packet.
- Default local mode is `codex_assisted`; `provider_llm` is explicit quality upgrade; `mocked_llm` is test/acceptance-only.
- Node 7 is not debate-eligible. Debate remains in Node 6 need discovery; Node 7 should adjudicate and route an already selected candidate.
- Model-like output cannot directly create `ValidateNeedAdjudicationResult`, cannot create `ValidatedNeed`, and cannot satisfy human confirmation.
- `TopicSelectionNeedValidationService.adjudicateNeed` remains the only adjudication authority writer.

## 2026-05-22 N7-D03 Semantic Content Boundary
- Locked semantic handling for Node 7.
- Codex/LLM semantic content may enter Node 7 only as recommendation/provenance, such as `TopicSelectionNeedAdjudicationRecommendationPacket@v1`.
- Support packet, readiness assessment, NeedCandidate, and repository-resolved evidence/risk refs remain the semantic SSOT for adjudication.
- Node 7 must not derive new evidence roles, risk refs, merge targets, or recheck refs from natural-language rationale.
- Authority persistence uses whitelist mapping only: `final_decision`, `rationale`, `required_actions`, `rejected_reason`, `gap_codes`, `accepted_risk_refs`, `residual_risk_refs`, `merge_target_need_candidate_ref`, and search-plan recheck reason/gap fields.
- If recommendation text conflicts with the support packet or cannot be deterministically mapped, the runner should block or require human review rather than rewriting semantic meaning.

## 2026-05-22 N7-D04 Final Decision Semantics
- Locked Node 7 `final_decision` to the existing backend enum: `validate`, `return_to_candidate`, `request_searchplan_recheck`, `reject`, `park`, and `merge`.
- `validate` means the candidate may proceed to Node 8 human confirmation; Node 7 still cannot create `ValidatedNeed`.
- `return_to_candidate` requires actionable rationale or `required_actions` and routes to NeedCandidate-level repair.
- `request_searchplan_recheck` requires a recheck reason or gap codes and routes to SearchPlan/evidence coverage repair.
- `reject` requires `rejected_reason` or equivalent rationale and closes the candidate as not viable.
- `park` preserves a non-advancing hypothesis and requires park rationale or `required_actions`.
- `merge` requires a same-title-card, non-self `merge_target_need_candidate_ref` and must not auto-merge authority content.
- `require_human_review` is intentionally not a `final_decision`; it is a node status/routing outcome when N7 cannot safely persist adjudication.

## 2026-05-22 N7-D05 Validate To Human Confirmation Boundary
- Locked `validate` as a pending-confirmation adjudication, not a final validated need.
- Node 7 must reserve `output_validated_need_id` as a stable target id for automation; the reserved id is not `TopicSelectionValidatedNeedRecord` authority.
- After N7 `validate`, the candidate remains `decision_status=ready_for_validation` and `review_status=needs_human_review`.
- Node 8 must consume the validate adjudication plus explicit `human`, `hybrid`, or `human_delegated` confirmation before writing `HumanConfirmedDecision` and materializing `ValidatedNeed`.
- Only Node 8 may move the candidate to `decision_status=resulted_in_validated_need`, `review_status=human_confirmed`, and `lifecycle_status=closed`.
- v1b publication must consume Node 8 `ValidatedNeed`; it cannot publish from Node 7 adjudication output.
- Node 7 has no automatic-confirm mode. Codex/provider recommendations can prepare the route to Node 8 but cannot satisfy confirmation.

## 2026-05-22 N7-D06 State Compression Boundary
- Locked the three-layer state model for `topic-selection.v1a.validate-need-adjudication.v1`.
- LLM/Codex/provider/mock recommendation packets may choose only `final_decision` plus whitelist authority inputs. They must not output candidate persistence statuses, `loopback_target`, `result_validated_need_id`, or `open_recheck_request_refs`.
- WorkflowHarness exposes compressed `route_outcome` for automated orchestration: `advance_to_human_confirmation`, `repair_need_candidate`, `repair_search_plan`, `stop_rejected`, `hold_candidate`, `stop_merged`, `blocked`, or `require_human_review`.
- Domain service derives persistence status from `final_decision`; scripts, routes, WorkflowHarness, Codex, provider LLMs, and mocked LLMs must not pass or patch derived status fields.
- `park` is a hold state with `lifecycle_status=hypothesis`, not a closed terminal state.
- `validate` routes to Node 8 and remains pending confirmation; it is not final approval.
- This preserves rich DB states for audit/UI/querying while keeping LLM and orchestration surfaces small and deterministic.

## 2026-05-22 N7-D07 Recommendation To Authority Gate
- Locked the gate between model-like adjudication recommendations and persisted `ValidateNeedAdjudicationResult`.
- Model-like output still cannot directly create authority. Only the WorkflowHarness runner may convert an accepted recommendation into `TopicSelectionNeedValidationService.adjudicateNeed` input after deterministic validation.
- `human` or `hybrid` adjudication packets may materialize any `final_decision` after validation.
- `fixture_human_decision` may materialize any `final_decision` only in test/acceptance scenarios with explicit provenance.
- `codex_assisted` and `provider_llm` recommendations may materialize without extra human acceptance only for low-risk decisions: `validate`, `request_searchplan_recheck`, and `return_to_candidate`.
- Low-risk materialization remains constrained: `validate` only creates pending Node 8 handoff, `request_searchplan_recheck` only creates a typed recheck request without SearchPlan mutation, and `return_to_candidate` requires actionable `required_actions`.
- `reject`, `merge`, and `park` are high-risk decisions. Model-like recommendations for these decisions require `human` or `hybrid` acceptance before authority persistence; otherwise the runner returns `require_human_review` and writes no adjudication authority.
- `mocked_llm` remains test/acceptance-only and carries no product decision authority.

## 2026-05-22 N7-D08 Readiness Support Packet Freeze Boundary
- Locked N7 as an orchestrated node over existing readiness, support-packet, recommendation, and adjudication service boundaries.
- The normalized runner defaults to fresh append-only readiness assessment and validation support packet creation. Existing readiness/support packets may be consumed only through explicit refs and deterministic validation; latest-by-candidate lookup is forbidden.
- Explicit readiness/support refs must match the selected NeedCandidate, title-card scope, evidence/search/resource lineage, policy/schema expectations, and freshness expectations before use.
- Readiness is a gate, not an adjudication authority. Only `ready_for_validation` may proceed; `needs_scope_revision`, `evidence_gap`, `searchplan_recheck`, or `reject` block before support packet/adjudication authority creation and return repair hints.
- Readiness recommendation `reject` is not `final_decision=reject`; reject adjudication still follows the D07 human/hybrid high-risk acceptance rule.
- The validation support packet freezes evidence refs, risk refs, strength/conflict refs, and required human checks. Recommendation/adjudication consumes this packet and must not re-read live EvidenceMap, SearchPlan, SearchRun, LiteratureResourcePoolSnapshot, or evidence basket state as business truth.
- If upstream evidence/search/resource state changes after support packet creation, N7 must rebuild readiness/support packet rather than repairing refs in place.
- Complexity remains bounded because N7 orchestrates existing services and gates; it does not add a new reasoning layer beyond the D07 recommendation gate.

## 2026-05-22 N7-D09 Recommendation Packet And Automation Handoff
- Locked the two-layer output boundary for Node 7.
- `TopicSelectionNeedAdjudicationRecommendationPacket@v1` is a model-like recommendation artifact/provenance record only. It is not authority and is not a downstream automation handoff.
- Recommendation input is limited to the frozen validation support packet, readiness summary, selected candidate snapshot, sibling candidate summary, accepted policy instructions, and ref-grounded evidence/risk summaries from the support packet.
- Recommendation output is limited to D06/D07 whitelist fields. It must not include `route_outcome`, `next_node_id`, `repair_target`, DB status fields, authority ids to create, or direct workflow commands.
- Model profile is `topic-selection.need-adjudication.single-agent.v1`: default `codex_assisted`, provider as explicit quality upgrade, mocked test/acceptance-only, structured JSON schema output, low creativity, high reasoning depth, and no automatic fallback.
- `TopicSelectionValidateNeedAdjudicationNodeResult@v1` is the automation handoff. It carries status, `route_outcome`, authority refs, reserved `validated_need` target ref for `validate`, next-node or repair target, actions, blockers, warnings, risk refs, recheck/merge refs, recommendation packet ref, and harness trace ref.
- Downstream automation consumes the node result only. Recommendation packets cannot directly advance Node 8, trigger repair loops, or stop candidates.

## 2026-05-22 N7-D10 Retry Idempotency And Duplicate Adjudication
- Locked `workflow_run_id` and `node_attempt_id` as required execution identity for N7 runner calls.
- `node_attempt_id` reuse is exact replay. Matching input hash plus existing node result/trace returns the prior node result with replay provenance and no authority writes.
- Replay with input drift, missing node result, or missing trace blocks before authority writes.
- Fresh attempts before adjudication are append-only and may create fresh readiness/support packets under D08.
- Once the selected NeedCandidate has `result_adjudication_id` or an existing adjudication result, N7 must not create a second `ValidateNeedAdjudicationResult`.
- Duplicate or pending adjudication returns a blocked/duplicate node result with existing adjudication ref when available and existing N7 handoff ref when available. Automation may consume the existing handoff or require explicit repair/human-supervised flow.
- Model-like execution may retry only same-profile technical failures at most once before authority write. It must not automatically switch provider, fall back to Codex, fall back to mock, or use keyword/rule-only adjudication.
- Readiness/support packets created before a later model/gate failure remain append-only audit facts and must be referenced in the blocked result; later attempts may consume them only by explicit ref, never latest lookup.

## 2026-05-22 N7-D11 Node Result Status Taxonomy
- Locked N7 node result status to exactly `ready`, `blocked`, and `require_human_review`.
- `ready` means downstream automation can consume the node result. It may be a fresh result or exact replay, but `route_outcome` cannot be `blocked` or `require_human_review`.
- `blocked` means the current attempt cannot auto-advance. It must carry `blocker_codes`, repair hints, and relevant existing refs when available.
- `require_human_review` means the current attempt needs human/hybrid acceptance before materialization or advancement. It must carry `review_reason_codes`.
- `ready_with_warning`, duplicate-specific statuses, replay-specific statuses, and route-specific statuses are forbidden.
- Warnings stay in `warning_codes`; duplicate/pending adjudication is `status=blocked` with `DUPLICATE_OR_PENDING_ADJUDICATION`; replay stays in `replay_provenance`.
- N7 `validate` pending human confirmation is still `status=ready` with `route_outcome=advance_to_human_confirmation`; Node 8 is the human-confirmation node.

## 2026-05-22 N7-D12 Implementation Readiness Review
- Accepted Node 7 as `implementation_ready`; after this slice, WorkflowHarness automation callability is `callable`.
- Existing backend support is sufficient to start: readiness/support/adjudication routes and services exist, duplicate adjudication is guarded by `result_adjudication_id`, AgentOrchestrator/profile registry exist, and WorkflowHarness trace artifacts are established.
- The previously required gaps are closed for the harness path: shared recommendation/node-result contracts, model profile registration, `needValidation` harness dependency, `runValidateNeedAdjudicationScenario`, D08-D11 validators, replay/duplicate helpers, and focused tests.
- Initial DB migration is not expected because recommendation packet, node result, and harness trace can remain artifact/control-plane scoped while existing authority objects continue to own persistence.
- Pause condition: if exact replay needs a durable node-result index that cannot be represented through existing workflow/artifact/trace lookup, use the DB SSOT workflow before adding storage.
- Implementation order is contracts/schema tests, profile registry, harness types, readiness/support orchestration, recommendation/gate, adjudication/handoff mapping, replay/duplicate handling, then verification matrix.
- Highest risks are latest-packet compatibility behavior leaking into harness, live upstream rereads after support freeze, high-risk model recommendation authority writes, validate status misclassification, and duplicate adjudication creation.

## 2026-05-22 N7-D12 Risk Amendments
- AM01 locks full readiness enum coverage. The runner must explicitly handle `merge_required` and `park` in addition to the currently common non-ready recommendations. Both are readiness gate findings and must block before support/adjudication; neither may be converted into persisted merge/park authority without D07 human/hybrid acceptance.
- AM02 requires support-packet lineage validation in both WorkflowHarness and `TopicSelectionNeedValidationService.adjudicateNeed`. Direct REST adjudication must reject stale or mismatched support packets instead of relying only on harness-side guards.
- AM03 makes exact replay storage a pre-implementation check. If existing workflow/artifact/trace lookup cannot return prior node result, trace, and input hash by `workflow_run_id + node_attempt_id`, implementation must pause for DB SSOT-backed indexing rather than starting a fresh attempt or adding local storage.

## 2026-05-22 N7 Implementation: Validate Need Adjudication Runner
- Implemented shared `TopicSelectionNeedAdjudicationRecommendationPacket@v1` and `TopicSelectionValidateNeedAdjudicationNodeResult@v1` contracts/schemas.
- Registered `topic-selection.need-adjudication.single-agent.v1` in the model profile registry with structured-output, low-creativity/high-reasoning semantics and no automatic fallback.
- Added `TopicSelectionWorkflowHarnessService.runValidateNeedAdjudicationScenario`.
- The runner:
  - resolves an explicit NeedCandidate and validates evidence/search/search-plan/literature-snapshot lineage;
  - creates fresh readiness/support packets by default or consumes explicit refs only when supplied;
  - blocks every non-ready readiness recommendation before support/adjudication authority creation, including `reject`, `merge_required`, and `park`;
  - invokes a single-agent recommendation through `AgentOrchestrator`, not multi-agent debate;
  - stores recommendation packets as structured-output artifacts and stores the runner result in a harness trace artifact;
  - derives `route_outcome`/`next_node_id` in the runner, never from model output;
  - allows low-risk `validate`, `request_searchplan_recheck`, and `return_to_candidate` recommendations to call adjudication after deterministic validation;
  - routes model-only high-risk `reject`, `merge`, and `park` to `require_human_review` with no adjudication write unless human/hybrid acceptance is explicit;
  - returns exact replay results by `workflow_run_id + node_attempt_id + input_hash` without authority writes, and blocks replay drift.
- Hardened `TopicSelectionNeedValidationService.adjudicateNeed` with support-packet lineage checks so direct REST compatibility calls cannot bypass the harness semantics.
- No DB migration was required; exact replay is backed by existing control-plane workflow-run artifact lookup and harness trace payloads.
- Node 7 can now move from `not_callable` to `callable` for WorkflowHarness automation. Route-level product node runner exposure remains a later wrapper concern.

## 2026-05-22 N8-D01 Reserved ValidatedNeed Id
- Locked `output_validated_need_id` as a reserved target id created by N7 validate adjudication and materialized only by N8.
- The reserved id is an automation anchor for replay, duplicate detection, and downstream handoff stability. It is not evidence that a `TopicSelectionValidatedNeedRecord` exists.
- N8 must materialize `TopicSelectionValidatedNeedRecord` using the reserved id. It must not generate an alternate `validated_need_id`.
- If the reserved id is missing, N8 blocks with a gate error. If a `ValidatedNeed` already exists for the reserved id, N8 treats the attempt as duplicate/idempotency territory rather than creating another record.
- Code sync: `TopicSelectionValidateNeedAdjudicationNodeResult@v1` now exposes `reserved_validated_need_ref` so N7 -> N8 automation can carry the reserved target id without reinterpreting it as authority.

## 2026-05-22 N8-D02 Materialization Authority Boundary
- Tightened N8 wording from "create id" to "materialize reserved id" so the implementation has one authority path.
- N7 owns id reservation through `TopicSelectionValidateNeedAdjudicationResultRecord.output_validated_need_id`; N8 owns `TopicSelectionValidatedNeedRecord` persistence with that exact id.
- N8 must not generate, replace, reinterpret, or accept an alternate `validated_need_id`.
- Existence and duplicate checks must query `TopicSelectionValidatedNeedRecord`, because a reserved id alone is not materialized authority.
- This keeps N8 as the only path for `HumanConfirmedDecision` and `TopicSelectionValidatedNeedRecord` authority while preserving N7->N8 automation stability.

## 2026-05-22 N8-D03 Human Delegated Confirmation
- Added `human_delegated` as a third confirmation actor mode beside `human` and `hybrid`.
- `human_delegated` means a human grants Codex or a provider LLM authority to execute confirmation under fixed policy `n8-validate-only-delegation-v1`; the model is the delegated executor, not the accountability anchor.
- Required delegated inputs are now carried through `HumanConfirmationInput@v1`: `accountable_human_ref`, `rationale`, `required_check_results`, `accepted_risk_refs`, and `delegated_executor` with `executor_type`, `provenance_ref`, and `policy_id`.
- Delegation is validate-confirmation only. It cannot accept newly introduced risk, override required human checks, resolve merge/reject/park choices, or mutate upstream evidence/search/candidate content.
- N8 still owns only deterministic validation plus `HumanConfirmedDecision`/`TopicSelectionValidatedNeedRecord` authority writes. Authorized model/Codex execution may occur in a pre-node or harness wrapper, but it must submit an auditable confirmation payload and cannot write authority directly.
- Implementation closure: route/service validation and `runHumanConfirmNeedScenario` now enforce `human_delegated` with fixed policy provenance before authority creation.

## 2026-05-22 N8-D04 Minimal Confirmation Input
- Simplified the N8 confirmation contract to one node-level value contract: `HumanConfirmationInput@v1`.
- Removed the heavier split into separate actor/grant/payload contracts; no standalone delegation contract or DB authority is introduced.
- `HumanConfirmationInput@v1` contains `actor_mode`, `accountable_human_ref`, `rationale`, `accepted_risk_refs`, `required_check_results`, and optional `delegated_executor`.
- `delegated_executor` is required only for `actor_mode=human_delegated` and contains only `executor_type`, `provenance_ref`, and `policy_id=n8-validate-only-delegation-v1`.
- Authorization scope is fixed by policy instead of caller-defined input. This keeps the personal/local delegated mode auditable without creating a general authorization subsystem.

## 2026-05-23 N8-D05 Bounded Semantic Review
- Corrected the N8 execution boundary: N8 does have semantic work because N7 brings semantic rationale, support-packet checks, and residual-risk language into confirmation.
- Added `HumanConfirmationSemanticReview@v1` as a node-level trace/audit artifact, not a DB authority and not a second adjudication result.
- The semantic review may parse N7 rationale, support-packet required checks, residual risk refs, confirmation rationale, and delegated executor output for alignment.
- Default semantic review mode is `codex_assisted`; provider LLM is an explicit quality upgrade; deterministic parsing is allowed for trivial cases; mocked LLM is test/acceptance-only.
- Semantic review can return pass, warning, or blocked. Scope violations and missing required risk/check coverage block materialization; ambiguous rationale alignment routes to `require_human_review`.
- The review must not re-evaluate NeedCandidate value, re-read EvidenceMap to infer new evidence roles, change N7 final_decision, invent accepted risks, mutate upstream content, or run debate.
- The authority gate remains deterministic: `HumanConfirmationSemanticReview@v1` is evidence for the gate, while `HumanConfirmedDecision` and `TopicSelectionValidatedNeedRecord` are still written only after N8 validators pass.

## 2026-05-23 N8-D06 Semantic Review Invocation And Failure Policy
- Locked profile `topic-selection.confirmation-semantic-review.single-agent.v1` for N8 semantic review.
- The reviewer consumes frozen `HumanConfirmationSemanticReviewContextPacket@v1` containing adjudication, support-packet, NeedCandidate, `HumanConfirmationInput@v1`, delegated executor provenance, policy, and schema snapshots.
- Default execution is `codex_assisted`. Provider LLM is explicit quality upgrade only, deterministic parser is limited to trivial fully structured checks, and mocked LLM is test/acceptance-only.
- The reviewer must emit structured `HumanConfirmationSemanticReview@v1`; hidden reasoning, raw provider logs, mutable live DB readers, raw fulltext, and debate transcripts are forbidden in the context packet.
- Retry is limited to the same profile and same mode once for transient or malformed structured-output failures.
- Automatic fallback across providers, Codex, mocked output, keyword/default acceptance, or deterministic acceptance is forbidden.
- Exact-match cache reuse may be used only when context hash, profile id, execution mode, policy version, and output schema version match; provider-quality runs must not treat cached non-provider responses as provider-backed.
- Failure never silently bypasses review for materialization: malformed output after retry routes to `require_human_review`; context build failure blocks; blocked semantic output blocks; ambiguous alignment routes to `require_human_review`.

## 2026-05-23 N8-D07 Node Result And Node 9 Handoff
- Locked `TopicSelectionHumanConfirmNeedNodeResult@v1` as the only N8 output consumed by downstream automation.
- N8 status vocabulary is compressed to `ready`, `blocked`, and `require_human_review`; warnings, duplicate, replay, and route-specific outcomes must be represented by codes/provenance, not new statuses.
- `ready` means `HumanConfirmedDecision` exists, the reserved `ValidatedNeed` id has been materialized, semantic review is `pass` or `warning`, and `route_outcome=advance_to_publish_v1b_input_bundle`.
- `blocked` covers hard failures such as invalid payload, ref mismatch, reserved-id problems, duplicate materialization, missing risk/check coverage, semantic scope violations, or repository safety failures.
- `require_human_review` covers ambiguous semantic alignment, insufficient confirmation rationale, or model review failures after allowed retry.
- Ready N8 handoff sets `next_node_id=topic-selection.v1a.publish-v1b-input-bundle.v1`; blocked/review results carry no next node or direct workflow command.
- N8 must not create `TopicSelectionV1aToV1bInputBundleRecord`; Node 9 remains the only v1b input bundle publisher.

## 2026-05-23 N8-D08 Simple Retry And Idempotency
- Locked N8 retry/idempotency to four simple rules instead of a complex recovery system.
- Same `node_attempt_id + input_hash` is exact replay: return the existing `TopicSelectionHumanConfirmNeedNodeResult@v1` and perform no writes or semantic-review invocation.
- If the reserved `output_validated_need_id` is already materialized as `TopicSelectionValidatedNeedRecord`, return `blocked + DUPLICATE_VALIDATED_NEED`; do not compare confirmation input or semantic review hashes to return idempotent ready.
- `blocked` and `require_human_review` attempts are append-only trace/audit evidence. Later retry must use a new `node_attempt_id` and cannot implicitly reuse failed attempt state as latest.
- If `HumanConfirmedDecision` exists but `TopicSelectionValidatedNeedRecord` was not materialized, return `blocked + PARTIAL_CONFIRMATION_WRITE`; recovery requires explicit human/operator repair and no automatic backfill.

## 2026-05-23 N8-D09 Implementation Readiness Review
- At readiness-review time, accepted N8 policy as `implementation_ready` while keeping automation callability at `not_callable` until runtime gaps were closed.
- Required implementation gaps are shared N8 contracts/schemas, semantic-review profile, route/service actor validation for `human_delegated`, fixed delegation policy guard, duplicate/partial-write guards, `runHumanConfirmNeedScenario`, semantic review artifacting, and exact replay.
- Existing repo support appears sufficient to start: human confirmation route/service exists, N7 emits reserved validated-need refs, WorkflowHarness trace/replay patterns exist, and AgentOrchestrator/profile registry exist.
- DB migration is not assumed. First implementation step must verify whether existing HumanConfirmedDecision snapshots and trace artifacts can carry `HumanConfirmationInput@v1`, semantic review context, semantic review result, and node result refs.
- Minimum close matrix covers contract schemas, happy path, delegated path, semantic review negatives, retry/duplicate behavior, and boundary checks for no EvidenceMap reread, no N7 mutation, no v1b creation, and no debate.

## 2026-05-23 N8 WorkflowHarness Implementation
- Implemented shared N8 contracts/schemas for `HumanConfirmationInput@v1`, `HumanConfirmationSemanticReviewContextPacket@v1`, `HumanConfirmationSemanticReview@v1`, and `TopicSelectionHumanConfirmNeedNodeResult@v1`.
- Added model profile `topic-selection.confirmation-semantic-review.single-agent.v1`.
- Extended human confirmation service/route to consume normalized `HumanConfirmationInput@v1` while retaining legacy `human_actor`/`human_rationale` compatibility.
- Implemented fixed `human_delegated` policy guard, semantic-review artifact refs, duplicate reserved-id guard, and partial `HumanConfirmedDecision` write guard without DB migration.
- Implemented `runHumanConfirmNeedScenario` with semantic context/review artifacts, deterministic parser support, exact replay, Node 9 handoff, and no v1b bundle creation.
- N8 can now move to `automation_callability=callable`; Node 9 remains `not_callable`.

## 2026-05-23 N8 Quality Closure
- Aligned `HumanConfirmationInput@v1` schema with service validation: `delegated_executor` is rejected for non-`human_delegated` actor modes.
- Hardened legacy confirmation fallback so accepted risk coverage includes support-packet residual risks and adjudication residual risks.
- Added semantic-review lineage validation for workflow run, node attempt, context packet ref, execution mode, profile id, policy version, and output schema version before authority writes.
- Included `run_mode`, `executor_kind`, and `model_option_id` in the N8 node input and replay hash to prevent cross-mode or cross-model replay.

## 2026-05-23 N9-D01 Deterministic v1a Terminal Handoff
- Locked `topic-selection.v1a.publish-v1b-input-bundle.v1` as a deterministic node: no LLM, Codex, provider call, semantic parser, or debate runtime.
- N8 is the v1a domain-result terminal node because it materializes `TopicSelectionValidatedNeedRecord`.
- N9 is the final forward node of the v1a main chain and the v1a-to-v1b handoff terminal node because it publishes `TopicSelectionV1aToV1bInputBundleRecord`.
- N9 must not re-evaluate topic value, reinterpret human confirmation, mutate v1a authority, or create v1b domain objects such as `ResearchSlice` or `TopicQuestionContract`.
- v1a quality signals, accepted risk, recheck requests, and memory suggestions remain side-channel governance/repair flows, not later main-chain nodes.

## 2026-05-23 N9-D02 Handoff Input Contract
- Locked N9 input as `PublishV1bInputBundleNodeInput@v1`, a handoff contract rather than a thin `validated_need_id` wrapper.
- The input must declare `validated_need_ref`, source candidate ref, adjudication result ref, support packet ref, human decision ref, evidence/search/literature refs, role/risk/memory/recheck refs, expected bundle version, policy version, and output schema version.
- N9 may read DB records to verify refs and construct the bundle, but DB live reads must not replace the caller-declared handoff refs.
- The resulting `TopicSelectionV1aToV1bInputBundleRecord` is the v1b entry boundary; v1b should not reconstruct v1a context by independently reading multiple v1a authority records when a bundle exists.

## 2026-05-23 N9-D03 Traceability Contract
- N9 must preserve business lineage trace inside `TopicSelectionV1aToV1bInputBundleRecord`.
- N9 WorkflowHarness must preserve automation execution trace through node input snapshot, input hash, bundle version, bundle payload hash, idempotency result, carried refs, assertions, blockers, and `harness_trace_artifact_ref`.
- Trace artifacts must not include hidden reasoning, raw provider logs, raw debate transcripts, or new semantic explanations.

## 2026-05-23 N9-D04 Replay And Idempotency
- Same `node_attempt_id + input_hash` is exact replay: return the existing N9 node result and perform no bundle write.
- Same `validated_need_ref + expected_bundle_version` with an existing bundle returns `ready` with `idempotency_result=reused_existing_bundle`; no new bundle is created.
- WorkflowHarness automation requires explicit `expected_bundle_version`; omitting it blocks with `INVALID_PAYLOAD` to avoid service default-version minting in automated flows.
- Same `node_attempt_id` with changed input hash blocks with `REPLAY_INPUT_HASH_MISMATCH`.
- Publishing a new version for the same ValidatedNeed is allowed only when a new `expected_bundle_version` is explicit and lineage/hash validation passes.

## 2026-05-23 N9-D05 Stable Failure Semantics
- N9 failures are limited to a small stable set for automation robustness: `INVALID_PAYLOAD`, `NOT_FOUND`, `VERSION_CONFLICT`, and `GATE_CONSTRAINT_FAILED`.
- `INVALID_PAYLOAD` covers missing required refs, missing `expected_bundle_version`, invalid ref type, or malformed policy/schema fields.
- `NOT_FOUND` covers missing required authority records.
- `VERSION_CONFLICT` covers declared ref lineage mismatch and same-attempt input-hash mismatch.
- `GATE_CONSTRAINT_FAILED` covers present but ineligible handoff authority, such as missing/non-confirm human decision, missing evidence role bundle, or unresolved blockers that cannot be carried to v1b.
- Semantic duplicate detection across different bundle versions is out of scope for v1; exact version reuse is sufficient.

## 2026-05-23 N9-D06 Implementation Readiness Review
- At readiness-review time, decision was ready to implement and N9 remained `automation_callability=not_callable` only until `runPublishV1bInputBundleScenario` landed.
- Complexity is controlled: deterministic node, no LLM/Codex/provider/debate branch, and a single handoff authority write.
- Shared contracts required: `PublishV1bInputBundleNodeInput@v1` and `TopicSelectionPublishV1bInputBundleNodeResult@v1`.
- The node result must expose v1b input bundle ref, bundle version, bundle payload hash, idempotency result, carried refs, blockers, warnings, replay provenance, and harness trace artifact ref.
- The node result must not hard-code the first v1b node until v1b node policies are normalized; the bundle ref is the v1b entry boundary.
- Route/service compatibility stays intact: public service input remains `validated_need_id`, `bundle_version`, and `created_by`.
- Harness owns strict handoff refs, explicit `expected_bundle_version`, input hash, replay, and trace; it calls the existing service and must not write bundles directly.
- Service should add minimal lineage and human-decision guards from existing records, but must not require the full Harness handoff contract on the public route.
- No DB migration is required; existing v1b bundle records and control-plane trace artifacts are sufficient.

## 2026-05-23 N9 WorkflowHarness Implementation
- Implemented shared contracts/schemas for `PublishV1bInputBundleNodeInput@v1` and `TopicSelectionPublishV1bInputBundleNodeResult@v1`.
- Implemented `runPublishV1bInputBundleScenario` as the callable deterministic v1a-to-v1b handoff runner.
- Harness validates explicit refs against `ValidatedNeed`, source candidate, support packet, adjudication, human decision, risk refs, memory refs, and recheck refs before calling the service.
- Harness calls `TopicSelectionNeedValidationService.publishV1bInputBundle`; it does not write `TopicSelectionV1aToV1bInputBundleRecord` directly.
- Exact replay uses `node_attempt_id + input_hash`; version reuse uses `validated_need_ref + expected_bundle_version` and returns `idempotency_result=reused_existing_bundle`.
- Added service-level minimal guard for publish lineage and confirm human decision without changing the public route/service input shape.
- N9 is now `automation_callability=callable`; no DB migration was required.

## 2026-05-22 N7 Quality Review Hardening
- Added recommendation lineage guards for `profile_id`, `policy_version`, and `output_schema_version`; a model-like packet can no longer pass with correct refs but drifted execution policy identity.
- Exact replay now re-evaluates current scenario assertions while still returning the stored node result and avoiding authority writes. This prevents stale test expectations from being reported as a fresh pass.
- Added focused harness coverage for recommendation profile/policy/schema drift and replay assertion re-evaluation.

## 2026-05-23 v1a Provider Participation Closure
- Extended `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` so N6 `generate-need-candidate` and N7 `validate-need-adjudication` can be switched independently through `TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE` and `TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE`.
- Kept `TOPIC_SELECTION_V1A_HARNESS_AGENT_EXECUTION_MODE` as a compatibility default, but the per-node modes are the product-facing acceptance boundary for provider/Codex participation.
- Fixed OpenAI structured-output transport normalization in `BackendLlmGateway`: provider request format names are sanitized for OpenAI while internal schema names stay unchanged, and shared-contract `const` fields are converted to provider-compatible single-value `enum` fields only in the transport schema.
- Clarified N6 prompt semantics: `candidate_pool_digest` and `sibling_candidate_digest` are existing-candidate/duplicate-awareness context, not the source list of candidates to rank. Empty candidate pools mean no known duplicates; generation must still use evidence signals and refs.
- Tightened the v1a E2E harness evidence table so provider calls receive the actual `support | challenge | baseline | context` evidence roles from the materialized EvidenceMap instead of inferring roles from generated ids.
- Updated N6 scenario expectations to support bounded counts for provider runs (`1..5`) while keeping exact fixture counts for mocked/Codex runs.
- Updated the E2E harness N6-to-N7 handoff to choose the first persisted candidate whose readiness assessment is `ready_for_validation`; this preserves the readiness gate instead of assuming the first generated candidate is validatable.
- Successful real-provider run `v1a-full-harness-provider-20260523180200` executed all nine v1a nodes with provider LLM participation in N6 and N7 and produced `v1b_input_bundle_5e6a60da-3db0-40c8-8b91-7535e2fa4299`.

## 2026-05-24 N6 Exact Replay Runtime
- Added replay provenance to `TopicSelectionGenerateNeedCandidateOrchestratorAdapterResult`.
- `runGenerateNeedCandidateScenario` now checks existing discovery trace artifacts before context compilation. A matching `input_hash` returns the stored trace snapshot and adapter result; a mismatched hash fails with `VERSION_CONFLICT`.
- The N6 discovery trace now carries the minimal replay snapshot needed by WorkflowHarness automation while remaining inside the existing control-plane artifact boundary.
- Provider-mode replay coverage proves the second call does not hit the LLM gateway and does not create duplicate `NeedCandidate` authority rows.

## 2026-05-24 Unified LLM Execution Spec And Provider Mapping
- Added `TopicSelectionAgentExecutionSpec` as the common execution object for ordinary single-agent nodes and debate slots.
- `TopicSelectionAgentOrchestratorService` now accepts `execution_spec` and rejects mismatches with legacy top-level `execution_mode` / `model_option_id`, preventing dual-track invocation semantics.
- `TopicSelectionNeedDiscoveryDebateLoopService` now accepts `execution_plan` with `default`, `slots`, and repeatable-slot `instances` specs. Instance specs use keys such as `explorer.round_1_discovery#explorer_2`.
- Legacy `slot_execution_overrides` and `slot_model_option_overrides` remain supported for compatibility, but they cannot be combined with `execution_plan`.
- Added explicit OpenAI `gpt-5.5` model options: `openai-quality` (`reasoning_depth=high`) and `openai-deep-reasoning` (`reasoning_depth=high`). Existing `openai-balanced` remains the default; v1a callers can now opt into stronger slots or nodes explicitly.
- `BackendLlmGateway` now maps normalized provider intent into runtime provider payloads: OpenAI receives `reasoning.effort`, DashScope receives `extra_body.enable_thinking`.
- The v1a harness E2E runner now builds and passes a canonical `debate_execution_plan` for N6 multi-agent debate instead of relying on legacy slot override fields.
- N5 evidence extraction, N6 single-agent generation, N7 adjudication, and N8 semantic confirmation review now accept the same `execution_spec` pattern at the WorkflowHarness boundary; deterministic/`none` paths reject model options to avoid dual-track invocation semantics.

## 2026-05-24 DeepSeek V4 Thinking Provider
- Added `deepseek` to the LLM provider registry and config-key allow-list with `DEEPSEEK_API_KEY` and `DEEPSEEK_BASE_URL`.
- `BackendLlmGateway` now supports DeepSeek structured Chat Completions through the same `provider_llm` path as OpenAI and DashScope.
- DeepSeek normalized runtime mapping: `reasoning_depth=none` disables thinking; `low|medium|high` map to `reasoning_effort=high`; `xhigh` maps to `reasoning_effort=max`.
- v1a model profile registry exposes DeepSeek only as an explicit debate-worker option for `explorer` and `deep_critic`: `<profile_id>.deepseek-v4-thinking`.
- The DeepSeek option uses `deepseek-v4-pro`, `thinking.type=enabled`, `reasoning_effort=high`, JSON structured output, and a 180s timeout.
- Arbiter final synthesis and ordinary single-agent nodes do not receive DeepSeek by default in this slice; this avoids changing authority boundaries before slot-level override is finalized.

## 2026-07-05 对账收口
- **触发**：T-123/T-115/T-127/T-128 归档后盘点选题域剩余面，发现本包账面（00 六条 AC 全空、03 顶部 status 块停在 05-24）与现实严重脱节；主线工程记录实际止于 2026-05-24，6 月起 15 次提交均为 JD 台账代记 + 两笔 T-128 代持代码（D-T128-02 S1 / D-T128-03，皆经 T-128 Phase 4 对抗式复审归档）。
- **05-24 顶部 status 块四项 pending 的逐项处置**（用户逐项拍板）：
  1. **profile escalation policy runtime → superseded（D-27）**：全仓零实现且六周产品化演进从未需要；显式 `execution_spec`/`execution_plan` + per-slot model options + W-14 产品门控取代了策略运行时，无自动升级路径（与 D8 同构）。D-05 边界保留为设计记录。
  2. **route-level runner integration → 已吸收**：v1a/v1b 路由级集成由 T-115（v1a-production-orchestration，done）/ T-107（v1b coordinator + 路由）落地；`topic-selection-v1a-routes.ts` / `topic-selection-v1b-routes.ts` 接 harness/coordinator 并有集成测试。
  3. **supplemental debate round 跨执行自动化 → 移交 T-089 backlog ⑤**：核实现状为 debate loop 单次执行一轮（`round_index` 入参，默认 1），arbiter 路由 `run_supplemental_round` 时以节点状态 `need_candidate_supplemental_round` 上浮、由调用方重入触发（`topic-selection-workflow-harness-service.ts:1747-1752`）；D-22 已锁路由语义与轮次预算。「是否自动跨执行编排」属工作流语义裁决（与 runtime↔human-review 共存原则相关），归 T-089 边缘节点复核域。
  4. **full legacy script migration → 按 D-28 修订判据达成**：判据修订+一次性审计详见 D-28 与 04 §2026-07-05；18/18 合规。
- **状态变更**：State → done；包不归档，`06-joint-decisions.md` 保持边界 SSOT + 活跃 JD 台账职能（T-129 C-3 及后续 harness-touch 登记点）。
- **同批**：T-089 的 W-08 移交 backlog（结构化硬化①②③+穷举复核④）与本次移交⑤首次落其 00-overview 账面（此前仅存于归档 T-128 笔记）。
