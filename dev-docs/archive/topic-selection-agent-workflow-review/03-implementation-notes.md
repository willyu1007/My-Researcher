# 03 Implementation Notes

## Pending
- Remaining implementation work is limited to the next runtime/debate slices recorded in T-088/T-089 below.

## 2026-06-11 Matrix migrated & implementation-aligned (by T-123 Phase 0)
- `06-workflow-matrix.md` 内容迁移至永久 SSOT `docs/context/process/topic-selection-workflow-matrix.md`（原文件改为指针存根）。
- 对齐范围（由 T-123 代为修订，理由与决策见 `dev-docs/archive/topic-selection-productization-hardening/03-implementation-notes.md` §Phase 0 决策 DP-0.1~0.8）：
  - v1b 行由旧 8 节点 ID 重写为实现的 11 节点 ID（含 N2/N5 human surface、N7 product-mechanical 注记、N6 debate reserved、N8 conditional bounded_sequence planned）。
  - v1c 命名漂移修正（`record-human-promotion-decision`、`v1c.downstream-feedback-recheck`），权威源固化为 shared 常量 `TOPIC_SELECTION_V1C_NODE_IDS`。
  - 新增 `human_delegated_allowed` / `debate_primitive` 列；slot map 扩为完整清单（v1b 10 槽 + v1c 6 槽）。
  - 一致性脚本接入 backend 测试套件，矩阵 node_id/slot_id 与代码权威源不一致即失败。
- T-089 职责不变：未来新增 debate 节点的语义裁决仍在本任务域，修订落在 docs/context 新址。

## 2026-05-23 v1a Generate-Need-Candidate Mixed Debate Runtime Check
- The executable v1a generate-need-candidate debate contract is now exercised by a real harness E2E, not only mocked unit coverage.
- Accepted mixed slot shape for this run:
  - `explorer.round_1_discovery`: `codex_assisted`;
  - `deep_critic.round_1_discovery`: `provider_llm`;
  - `arbiter.issue_framing`: `provider_llm`;
  - `arbiter.final_synthesis`: `provider_llm`.
- This preserves the earlier D-16/D-17/DMP decision that the final arbiter remains provider-backed while Codex can cover a bounded exploratory role for local cost control.
- The runtime now gives arbiter calls structured role-level summaries and issue-frame payloads, so the debate loop is not semantically dependent on artifact refs alone.
- Follow-up implementation closed the immediate per-slot model option gap: provider-backed debate slots now accept explicit slot-level `model_option_id` overrides and reject model-option overrides on Codex/mock slots.
- Remaining design gap: role diversity policy beyond explicit per-slot model option selection is still future T-089/T-088 work; it must not be silently encoded as provider ranking or fallback in the E2E script.

## 2026-05-23 v1a Generate-Need-Candidate Per-Slot Model Option Runtime
- Added per-slot model-option selection to the executable v1a generate-need-candidate debate runtime.
- The mapping remains role/stage oriented:
  - `explorer.round_1_discovery` resolves through `topic-selection.need-discovery.explorer.v1`;
  - `deep_critic.round_1_discovery` resolves through `topic-selection.need-discovery.deep-critic.v1`;
  - `arbiter.issue_framing` resolves through `topic-selection.need-discovery.arbiter-framing.v1`;
  - `arbiter.final_synthesis` resolves through `topic-selection.need-discovery.arbiter-final.v1`.
- Provider/model/parameter details still live in the model profile registry; the debate scenario contract and node policy reference slots and profile ids only.
- Slot-level Codex substitution and slot-level provider model-option selection are now separate controls:
  - execution overrides decide whether a slot is `codex_assisted`, `provider_llm`, or `mocked_llm`;
  - model-option overrides are legal only for slots whose effective execution mode is `provider_llm`.
- This removes the previous OpenAI-only E2E workaround without adding provider-specific execution modes or automatic fallback.

## 2026-05-23 v1a Generate-Need-Candidate Negative E2E Coverage
- Added a repeatable negative E2E wrapper for slot model-option policy.
- The wrapper asserts that invalid model-option configuration stops before downstream authority writes:
  - Codex-assisted slot plus model option stops before harness startup;
  - provider slot plus model option from another slot profile stops at `generate-need-candidate`.
- The second case also verifies the failure remains inside v1a and does not produce `NeedCandidate`, `ValidatedNeed`, or a v1b input bundle.
- Fixed profile resolver error semantics so an explicit unknown `model_option_id` reports `model_option_id is not defined by model profile.` rather than the generic no-options message.

## 2026-05-19 Joint Alignment
- Consumes D-01 and D-02 from `dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md`.
- T-089 remains responsible for workflow classification and debate decisions, not runtime implementation.

## 2026-05-19 D-03 Alignment
- Consumes the locked `AgentOrchestrator` boundary from T-088.
- T-089 workflow/debate review must assume model execution receives caller-built context packets and cannot rely on `AgentOrchestrator` reading domain DB state.

## 2026-05-19 D-04 Alignment
- Consumes locked execution mode boundaries from T-088.
- T-089 node classification must distinguish provider-backed decisions from `mocked_llm` acceptance artifacts and must not propose mock fallback for product runtime.

## 2026-05-19 D-05 Alignment
- Consumes profile escalation boundaries from T-088.
- T-089 must treat `single_agent` -> `multi_agent_debate` as a workflow classification decision, not as profile escalation.

## 2026-05-19 D-06 Alignment
- Consumes trace/audit/persistence boundaries from T-088.
- T-089 workflow matrix must require each non-deterministic node to declare trace refs, audit refs, artifact expectations, and authority refs without duplicating domain authority objects.

## 2026-05-19 D-07 Alignment
- Owns debate output caching, retention, artifact granularity, and per-node persistence policy.
- Debate can be proposed only for explicitly justified high-conflict nodes and must not become fallback execution.

## 2026-05-19 D-08 Alignment
- Consumes Codex-assisted execution as the default low-cost local mode.
- T-089 must decide node-by-node where Codex can replace provider calls and which debate roles Codex may execute.

## 2026-05-19 D-09 Alignment
- Consumes the zero-dual-track runner migration rule from T-088.
- Debate and workflow acceptance coverage must be registered as `WorkflowScenario` definitions instead of standalone runners.
- T-089 may define node-level debate policy, but must not create separate prompt, routing, artifact, cache, or persistence semantics outside the shared runtime path.

## 2026-05-19 D-10 Alignment
- Locked the T-089 deliverable shape as a node-by-node workflow matrix.
- Every executor, execution-mode, Codex, provider, debate, deterministic, or human-review decision must bind to a concrete `node_id`.
- Narrative design text is allowed only as rationale; the matrix remains the semantic entry for later implementation and tests.

## 2026-05-19 D-11 Alignment
- Locked canonical node granularity as authority-producing or authority-gating product decisions.
- Confirmed the node split matches `WorkflowHarness` sequencing: validators, guardrails, LLM attempts, artifacts, hashes, and repository operations are node-internal unless they create a cross-stage authority boundary.
- Populated `06-workflow-matrix.md` with the canonical node list and left execution classification fields pending D-12.

## 2026-05-19 D-12 Alignment
- Locked default executor and execution-mode classification for all canonical nodes.
- Added `default_execution_mode=none` for deterministic and human-review nodes that do not invoke model-like execution.
- Set model-like single-agent nodes to default `codex_assisted` with no initial provider-required rows.
- Limited initial debate eligibility to resource sampling, v1a need discovery, v1b value assessment, and v1c promotion support; promotion gate remains deterministic.

## 2026-05-19 D-13 Alignment
- Locked node policies as required per-node semantic contracts.
- Added `07-node-policies.md` with the D-13 template and one stub policy for each canonical node.
- Updated the matrix to point blocking conditions at node policies; scenario coverage remains pending the next decision.

## 2026-05-19 D-14 Alignment
- Locked scenario coverage as a registry-backed acceptance contract.
- Added `08-scenarios.md` with initial happy-path, scale-quality, negative, provider, downstream, and debate scenario entries.
- Replaced matrix `TBD-scenario` placeholders with registered scenario ids.

## 2026-05-19 D-15 Alignment
- Locked node policy detail fill order.
- Added common policy vocabulary and fill-order queues to `07-node-policies.md`.
- The next policy-detail work should start with the four debate-eligible nodes before ordinary single-agent or deterministic spine nodes.

## 2026-05-19 D-16 Alignment
- Locked resource sampling as the first draft node policy detail.
- Captured multi-agent debate as an arbiter-led internal loop with `explorer` and `deep_critic` worker roles.
- Removed `grounding_auditor` from the default debate role set; grounding remains in deterministic guardrails, arbiter checklist, schema validation, and final output validation.
- Locked terminal exits as `finalize`, `blocked`, or `require_human_review`; no automatic debate re-entry after terminal exit.

## 2026-05-19 D-17 Alignment
- Moved v1a debate eligibility from `validate-need-adjudication` to `generate-need-candidate`.
- Reframed candidate generation around a grounded `NeedCandidate` written through the existing v1a need-validation service and then visible in the existing candidate pool/list projection.
- Recorded generate-need-candidate debate as a deep-discovery harness pattern, not a final validation mechanism.
- Kept adjudication single-agent structured routing with human confirmation fallback.
- Corrected the design to avoid adding `NeedCandidateSet`; explored alternatives, rejected framings, and merge/recheck hints stay in artifacts unless a later explicit candidate-generation attempt persists another `NeedCandidate`.
- Locked generate attempts as bounded multi-candidate writes: one successful attempt may persist 1..5 independent `NeedCandidate` records sharing discovery audit/run refs, while each candidate still validates and adjudicates independently.
- Locked invalid-candidate handling: candidates that fail per-candidate gates are not persisted; they are recorded as rejected framings with reason codes, and the attempt succeeds only when at least one candidate remains valid.
- Locked candidate acquisition gate order: deterministic context compile -> single-agent/debate ranked draft batch -> per-candidate deterministic gates -> rejected-framing artifact for invalid drafts -> all-or-none authority write for 1..5 valid candidates -> candidate-pool projection.

## 2026-05-19 D-18 Alignment
- Locked cache/context/memory policy as a joint runtime boundary.
- Cache, compressed summaries, projection caches, and exact-invocation response reuse are not authority sources.
- Allowed local cost-saving response reuse without adding a new `execution_mode`: automatic replay remains `mocked_llm` acceptance/test, while local personal reuse can run as operator-approved `codex_assisted` with cache provenance and `non_provider=true`.
- Split debate context into `exploration_context` for explorer/deep-critic expansion and `arbiter_context` for synthesis, ranking, unresolved handling, and deterministic gate preparation.
- Updated generate-need-candidate policy/scenario expectations to record context packet refs/hashes, cache hit/miss status, compression versions, and response reuse provenance.
- Locked D-18 context field expectations: shared envelope, exploration payload, arbiter payload, durable memory admission roles, compression layers, context cache key, and default v1a need-discovery context size policy.

## 2026-05-19 D-19 Alignment
- Locked draft-to-`TopicSelectionNeedCandidateRecord` mapping boundaries before final draft-batch schema design.
- Direct draft mapping is limited to candidate body, mechanism, scope/non-goals, prior-art status, evidence/conflict/strength refs, gap codes, speculative, and confidence fields.
- Backend/runtime derives ids, status, version/hash, source refs, control-plane refs, artifact refs, merge/result refs, creator, and timestamps.
- Draft rank, batch rationale, arbiter rationale, rejected framings, unresolved points, recheck suggestions, duplicate/merge hints, and raw transcripts remain artifacts unless a later explicit node policy maps them.
- Locked v1a need-discovery debate workflow with one required exploration/critique round and up to two arbiter-scoped supplemental rounds, for a maximum of 3 total rounds.

## 2026-05-19 D-20 Alignment
- Locked `ranked_candidate_draft_batch` minimum schema as artifact/model-output contract, not authority.
- Minimum schema contains `schema_version`, `draft_batch`, `drafts`, `rejected_framings`, and `unresolved_points`.
- First required draft fields are limited to fields needed for deterministic gates and D-19 direct mapping to `TopicSelectionNeedCandidateRecord`.
- `assumptions`, `uncertainty_notes`, `duplicate_or_merge_hint`, and `recheck_suggestions` remain optional artifact/extensions and are not minimum required fields in v1.
- Updated generate-need-candidate policy/scenario expectations to require minimum schema validation before per-candidate gates and authority writes.

## 2026-05-19 D-21 Alignment
- Locked deterministic `NeedCandidate` draft admission gates between `ranked_candidate_draft_batch` and authority persistence.
- Admission gates produce `CandidateDraftAdmissionReport` as an artifact before any authority write.
- Admission decisions are limited to `admit`, `reject_artifact_only`, `require_human_review`, `return_for_supplemental_round`, and `merge_hint_only`.
- Gate order is schema, reference integrity, scope, evidence sufficiency, mechanism sufficiency, novelty/duplicate, risk/speculation, and final batch gate.
- Agents and debate may excavate and rank drafts, but deterministic admission gates decide whether drafts can enter the all-or-none `NeedCandidate` persistence batch.
- Updated generate-need-candidate policy/scenario expectations to require admission report artifacts and explicit gate decisions before persistence.

## 2026-05-19 D-22 Alignment
- Locked supplemental round routing as a bounded repair path, not a broad retry or fallback execution path.
- Arbiter must produce `SupplementalRoundRoutingDecision` before any optional supplemental round starts.
- Supplemental routing is allowed only for promising grounded drafts with concrete repair questions and remaining round budget.
- Non-supplementable failures include malformed schema/context, missing required source refs, topic drift, ungrounded drafts, pseudo-gaps, pure duplicates, and exhausted round budget.
- Supplemental workers consume `exploration_context` plus arbiter-scoped question deltas, while arbiter synthesizes returned role-level summaries through `arbiter_context`.
- Supplemental output must re-enter D-20 schema validation and D-21 admission gates before persistence; no direct authority write path is introduced.

## 2026-05-19 D-23 Alignment
- Locked `NeedCandidate` batch persistence as the only authority write contract after admission gates.
- Persistence consumes only admitted drafts from `CandidateDraftAdmissionReport`; raw debate output and rejected/unresolved artifact material are not write inputs.
- The write boundary stays on the existing `TopicSelectionNeedValidationService`/repository path or a service-level batch wrapper over that same boundary; no `NeedCandidateSet` path is introduced.
- `PersistNeedCandidateBatchCommand` carries workflow refs, topic/evidence/resource refs, artifact refs, admitted drafts, normalized keys, source admission refs, and idempotency key.
- Backend/runtime derives ids, candidate hash/version, statuses, authority refs, artifact/audit refs, source metadata, and timestamps.
- Batch writes are all-or-none and idempotent; replay of the same idempotency key returns the same persisted refs without duplicate insertions.
- Successful persistence returns persisted candidate refs and candidate-pool projection refs/hash, with projection remaining a view over existing `NeedCandidate` rows.

## 2026-05-19 D-24 Alignment
- Locked `GenerateNeedCandidateNodeInput` and `GenerateNeedCandidateNodeResult` as the external I/O contract for `topic-selection.v1a.generate-need-candidate.v1`.
- All execution modes share the same node I/O schema; provenance records execution source differences instead of changing result shape.
- Node input carries refs and context packet refs rather than scattered raw DB records.
- Node result separates workflow `status` from agent/debate `terminal_result` and constrains their valid combinations.
- Success requires persisted candidate refs, candidate-pool projection refs/hash, and required artifact refs.
- Downstream handoff is limited to persisted candidate refs, candidate-pool projection refs/hash, discovery audit ref, warnings, and error code; raw debate transcripts remain non-business artifacts.
- The node does not create `ValidatedNeed`, `SearchPlan`, `NeedCandidateSet`, or a v1b input bundle.

## 2026-05-19 D-25 Alignment
- Locked `generate-need-candidate` implementation as nine slices: contracts/schema, artifact/ref boundary, context compiler integration, orchestrator adapter, draft schema validation, admission gates, supplemental routing, persistence batch, and WorkflowHarness scenarios.
- D-25 is a construction plan only; it does not add a new authority object, runtime output, or alternate node contract.
- Deterministic contracts, artifacts, context, schema validation, admission gates, routing, and persistence must be verified before provider/codex E2E.
- `mocked_llm` WorkflowHarness scenarios run before `provider_llm` or `codex_assisted` scenarios.
- Required scenario coverage includes happy path, zero admitted to supplemental, duplicate to merge hint, malformed draft blocked, persistence rollback, and execution-mode shape stability.
- Implementation guardrails remain no `NeedCandidateSet`, no raw transcript handoff, no D-20/D-21/D-23 bypass, no partial batch persistence, and no cached response masquerading as `provider_llm`.

## 2026-05-19 Current State Mapping
- Added `09-current-state-map.md` to map D-25 slices to current repository files before implementation.
- Current repo has reusable v1a NeedCandidate contracts, service, repository, Prisma model, route/controller, route integration tests, control-plane artifact/workflow primitives, and `BackendLlmGateway` patterns.
- At mapping time, the repo did not yet have concrete `GenerateNeedCandidateNodeInput/Result`, ranked draft/admission/routing/persist command contracts, `WorkflowHarness`, `AgentOrchestrator`, v1a exploration/arbiter context compiler, admission gates, supplemental routing, or batch/idempotent candidate persistence. The shared contract/schema portion was later implemented in the D-25 `contracts_schema` slice below.
- Confirmed discussion depth is currently concentrated on v1a `generate-need-candidate`; the T-089 matrix still spans resource sampling, v1a, v1b, v1c, downstream, and debate placeholders for v1b/v1c.

## 2026-05-19 D-26 Cross-Version Boundary
- Locked a lightweight v1a -> v1b -> v1c handoff boundary before D-25 `contracts_schema` implementation.
- Added `10-cross-version-boundaries.md` as the T-089-local handoff reference and appended D-26 to the shared T-088/T-089 joint decision log.
- v1a `generate-need-candidate` may produce persisted `NeedCandidate` refs, candidate-pool projection refs/hash, discovery audit refs, warning/error codes, and internal artifacts, but it must not publish v1b/v1c authority objects.
- v1a-to-v1b still flows only through `TopicSelectionV1aToV1bInputBundleRecord` after human-confirmed `ValidatedNeed`.
- v1b-to-v1c still flows only through `TopicSelectionV1bToV1cInputBundleRecord` after package readiness.
- Raw debate transcripts, hidden reasoning, raw ranked draft batches, raw rejected framings, and supplemental role outputs must not cross version boundaries as business inputs.
- D-25 `contracts_schema` can proceed without embedding v1b/v1c fields in `GenerateNeedCandidateNodeResult` or `PersistNeedCandidateBatchCommand`.

## 2026-05-19 D-25 `contracts_schema` Implementation
- Implemented the first D-25 slice in `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`.
- Added shared DTO/schema/error-code contracts for:
  - `GenerateNeedCandidateNodeInput`
  - `GenerateNeedCandidateNodeResult`
  - `RankedCandidateDraftBatch`
  - `CandidateDraftAdmissionReport`
  - `SupplementalRoundRoutingDecision`
  - `PersistNeedCandidateBatchCommand`
- Added execution/status/terminal/admission/routing/error-code vocabularies for the v1a generate-need-candidate node.
- Kept the contract v1a-only per D-26: result and persist command schemas do not expose topic-question, value-assessment, package, promotion, bridge, downstream, raw transcript, or v1b/v1c handoff fields.
- Added schema coverage in `packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts` for valid node payloads, invalid execution mode, invalid result error code, barrel exports, and no v1b/v1c field surface on v1a result/persist schemas.
- No DB, route, service, persistence, orchestration, or v1b/v1c contract changes were made in this slice.

## 2026-05-19 D-25 `artifact_ref_boundary` Implementation
- Implemented the second D-25 slice without adding a new DB table or alternate artifact persistence path.
- Added shared artifact boundary contracts in `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`:
  - `TopicSelectionGenerateNeedCandidateArtifactSnapshot`
  - `TopicSelectionGenerateNeedCandidateArtifactRefEntry`
  - `TopicSelectionGenerateNeedCandidateArtifactRefBundle`
  - artifact key vocabulary for ranked draft batch, schema validation report, admission report, supplemental routing decision, persist command snapshot, and discovery audit.
  - redaction policy vocabulary for v1a need-discovery artifacts.
- Added schema coverage in `packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts` for artifact snapshot and artifact-ref bundle payloads.
- Added `TopicSelectionNeedDiscoveryArtifactBoundaryService` in `apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts`.
- The helper records redacted inline snapshots through the existing `TopicSelectionControlPlaneService.recordArtifactRef` boundary.
- The helper redacts hidden reasoning, chain-of-thought, raw provider logs, raw debate transcripts, provider secrets, API keys, tokens, and credentials by key name before persistence.
- The helper computes stable payload hashes and relies on control-plane artifact checksums for artifact hash identity.
- The helper emits `artifact_ref` FunctionalRefs and resolves them with ref type, title card, workflow run, node attempt, artifact key, and checksum guards.
- Added `TopicSelectionControlPlaneService.getArtifactRef` as a read helper over the existing repository method.
- This slice does not integrate artifacts into a real node executor yet; the next slices must consume this helper rather than writing ad hoc artifact payloads.
- This slice does not implement full authority-ref resolution, file/URI artifact storage routing, or WorkflowHarness scenario artifact emission.

## 2026-05-19 D-25 `context_compiler_integration` Implementation
- Implemented the third D-25 slice as a compile/validate layer only; no LLM invocation, orchestration, route, DB schema, or candidate persistence was added.
- Added shared D-18 context contracts in `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`:
  - `TopicSelectionNeedDiscoveryContextPacket`
  - `TopicSelectionNeedDiscoveryExplorationContextPayload`
  - `TopicSelectionNeedDiscoveryArbiterContextPayload`
  - `TopicSelectionNeedDiscoveryCompiledContextPair`
  - context family vocabulary for `exploration_context` and `arbiter_context`.
  - context redaction policy vocabulary for `topic_selection_need_discovery_context_redaction_v1`.
- Added JSON schema coverage for context compression, exploration payload, arbiter payload, context packet, and compiled context pair.
- Extended the generate-need-candidate artifact key vocabulary with:
  - `exploration_context_packet`
  - `arbiter_context_packet`
- Updated `TopicSelectionNeedDiscoveryArtifactBoundaryService` so context packets are persisted as control-plane `input` artifacts through the same redacted artifact-ref boundary.
- Added `TopicSelectionNeedDiscoveryContextCompilerService` in `apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts`.
- The compiler:
  - compiles both D-18 context families for `topic-selection.v1a.generate-need-candidate.v1`;
  - enforces refs-only `input_refs`;
  - computes `input_refs_hash`, `payload_hash`, exact cache keys, memory digest hash, and candidate-pool hash;
  - keeps `exploration_context` and `arbiter_context` cache keys family-isolated;
  - rejects hidden reasoning, raw provider logs, raw debate transcripts, secrets, tokens, and credentials before artifact write;
  - resolves context packet artifact refs with artifact key, family, workflow, node attempt, policy, profile, execution mode, input hash, payload hash, and cache-key guards.
- Added focused backend unit coverage for stable compilation, family isolation, exact cache-key validation, stale/tampered packet rejection, resolve guards, and forbidden raw context material.
- This slice leaves actual context cache storage/reuse, role invocation, response reuse, and WorkflowHarness execution to later slices.

## 2026-05-20 DMP Runtime Consumption: Shared Invocation Provenance Contract
- T-089 now consumes the shared invocation provenance/audit envelope added by T-088.
- Debate node policies and future role/stage implementations must use `topic-selection-agent-invocation-audit-v1` for every model-like attempt rather than defining a separate debate audit shape.
- The envelope supports future debate role metadata through an optional `debate_extension`, while preserving the same core fields for ordinary single-agent calls.
- Provider-backed attempts must record `provider_response`, selected model option, normalized params hash, provider/model ids, and telemetry summary.
- Codex-assisted and mocked attempts remain explicitly `non_provider=true` with operator/fixture provenance, preventing mock/real decision mixing.
- This is a runtime contract consumption note only; no T-089 node policy decision is changed.

## 2026-05-19 D-25 Three-Slice Quality Review And Fixes
- Reviewed the implemented `contracts_schema`, `artifact_ref_boundary`, and `context_compiler_integration` slices for semantic drift, duplicate paths, stale docs, and weak contract boundaries.
- Fixed artifact/context ref ambiguity by introducing an artifact-ref-only shared type/schema for D-25 artifact refs and context packet refs:
  - `exploration_context_ref`
  - `arbiter_context_ref`
  - result artifact refs
  - persist-command artifact refs
  - compiled context pair refs
  - artifact-ref bundle entries
- Updated schema tests so artifact refs use `ref_type=artifact_ref` and added a negative context-ref assertion for `ref_type=context_packet`.
- Tightened `TopicSelectionNeedDiscoveryArtifactBoundaryService`:
  - validates artifact keys defensively at runtime;
  - validates source refs before artifact write;
  - validates artifact-ref bundle entries;
  - verifies snapshot `payload_hash` against redacted payload on resolve, in addition to the control-plane artifact checksum.
- Confirmed no obsolete D-25 implementation files were introduced and no old runner, provider path, DB schema, or alternate authority object was added.

## 2026-05-19 D-25 `orchestrator_adapter` Initial Implementation
- Started the fourth D-25 slice by implementing the reusable T-088 runtime `AgentOrchestrator` boundary first.
- Added `TopicSelectionAgentOrchestratorService` in `apps/backend/src/services/topic-selection-agent-orchestrator-service.ts`.
- The orchestrator keeps `mocked_llm`, `codex_assisted`, and `provider_llm` on one normalized result shape with explicit provenance.
- Provider-backed execution routes through `BackendLlmGateway`; mock and Codex-assisted execution never call provider APIs.
- `mocked_llm` is blocked from product run mode and remains acceptance/test-only.
- Every mode validates structured output against the same caller-supplied JSON schema.
- Diagnostic audit artifacts store hashes/provenance/validation summaries only, not full structured output, raw provider logs, prompt text, hidden reasoning, or secrets.
- This is the runtime adapter foundation. The generate-need-candidate node-specific adapter that consumes context packets and emits `RankedCandidateDraftBatch` remains pending before `draft_schema_validation`.

## 2026-05-19 D-25 `orchestrator_adapter` Node Adapter Implementation
- Completed the node-specific half of the fourth D-25 slice for `topic-selection.v1a.generate-need-candidate.v1`.
- Added `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` in `apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts`.
- The adapter:
  - accepts the locked `GenerateNeedCandidateNodeInput`;
  - resolves `exploration_context_ref` and `arbiter_context_ref` through `TopicSelectionNeedDiscoveryContextCompilerService`;
  - enforces exact context expectations for workflow run, node attempt, family, policy version, schema version, profile, execution mode, and title card;
  - builds the caller-owned prompt payload from resolved context packets and node refs;
  - invokes `TopicSelectionAgentOrchestratorService` with the shared `RankedCandidateDraftBatch` schema;
  - keeps `mocked_llm`, `codex_assisted`, and `provider_llm` on the same adapter result shape;
  - records a redacted `ranked_candidate_draft_batch` artifact only when orchestrator output passes schema validation.
- Added focused adapter tests for:
  - successful ranked draft batch generation through `mocked_llm`, `codex_assisted`, and `provider_llm`;
  - provider-mode invocation through the stubbed gateway path;
  - stale context packet expectation blocking before model-like invocation;
  - no ranked batch artifact write when orchestrator/schema validation blocks output.
- This slice still does not implement D-20 minimum semantic validation, D-21 admission gates, supplemental routing, candidate persistence, or WorkflowHarness scenarios.

## 2026-05-19 D-25 `draft_schema_validation` Implementation
- Implemented the fifth D-25 slice as a deterministic minimum semantic validation layer after orchestrator JSON-schema validation and before admission gates.
- Added shared report contract and schema in `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts`:
  - `TopicSelectionRankedCandidateDraftBatchMinimumValidationReport`;
  - `TopicSelectionRankedCandidateDraftBatchMinimumValidationIssue`;
  - `topicSelectionRankedCandidateDraftBatchMinimumValidationReportSchema`.
- Added `TopicSelectionRankedCandidateDraftBatchValidatorService` in `apps/backend/src/services/topic-selection-ranked-candidate-draft-batch-validator-service.ts`.
- The validator checks the minimum admission-precondition semantics:
  - batch `schema_version` and `node_attempt_id` must match `GenerateNeedCandidateNodeInput`;
  - `max_persisted_candidates` must be a positive integer and stay within arbiter policy;
  - `finalize` batches must contain at least one draft;
  - empty batches must explain themselves through rejected framings or unresolved points;
  - draft IDs and ranks must be unique, sorted, and contiguous from 1;
  - each draft must cite evidence role refs, strength assessment refs, and gap codes;
  - confidence must be within `[0, 1]` when present;
  - `finalize` batches cannot carry unresolved points routed to `blocked`.
- Wired the validator into `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`.
- Adapter behavior after this slice:
  - if orchestrator schema validation fails, no minimum validation report is written;
  - if minimum validation fails, a redacted `minimum_schema_validation_report` diagnostic artifact is written, `ranked_candidate_draft_batch` is not written, and the adapter returns `INVALID_RANKED_CANDIDATE_DRAFT_BATCH`;
  - if minimum validation passes, both the validation report artifact and ranked draft batch artifact are written.
- Added focused unit coverage for valid finalize batches, invalid semantic drift, explained empty blocked batches, and adapter artifact boundaries.
- This slice still does not implement D-21 admission gates, D-22 supplemental routing, D-23 persistence batch, WorkflowHarness scenarios, or route-level node execution.

## 2026-05-19 D-25 `admission_gates` Implementation
- Implemented the sixth D-25 slice as deterministic pre-persistence admission gates.
- Fixed contract drift by expanding `TopicSelectionCandidateDraftAdmissionResult` in `packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts` to match D-21:
  - `resolved_ref_counts`;
  - `normalized_candidate_key`;
  - `duplicate_candidate_refs`;
  - `required_human_review_points`;
  - `supplemental_questions`.
- Added `TopicSelectionCandidateDraftAdmissionService` in `apps/backend/src/services/topic-selection-candidate-draft-admission-service.ts`.
- The service:
  - refuses to run unless `RankedCandidateDraftBatchMinimumValidationReport.valid=true`;
  - verifies draft evidence/conflict/strength refs against node/context resolvable refs;
  - computes deterministic normalized candidate keys;
  - admits grounded non-duplicate drafts;
  - turns candidate-pool duplicates or same-batch duplicate keys into `merge_hint_only`;
  - rejects unresolved refs, scope drift, context/baseline-only drafts, broad pseudo-gap mechanisms, and solved/falsified prior art as artifact-only outcomes;
  - routes speculative drafts without risk bounds to `return_for_supplemental_round` when round budget remains, otherwise `require_human_review`;
  - records batch blockers such as `NO_ADMISSIBLE_NEED_CANDIDATE` without writing authority records.
- Wired the admission service into `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`.
- Adapter behavior after this slice:
  - orchestrator schema failure still writes no minimum/admission/ranked artifacts;
  - minimum validation failure writes only `minimum_schema_validation_report`;
  - minimum validation success writes `minimum_schema_validation_report`, `ranked_candidate_draft_batch`, and then `candidate_draft_admission_report`;
  - admission batch blockers return adapter status `blocked` with the admission artifact preserved for audit.
- This slice still does not implement D-22 supplemental routing, D-23 persistence batch, WorkflowHarness scenarios, or route-level node execution.

## 2026-05-19 D-25 `admission_gates` Quality Review Fixes
- Reviewed the admission implementation for D-21 contract drift, adapter artifact boundaries, and edge-case test coverage.
- Fixed shared contract drift by making `normalized_candidate_key` required on each `CandidateDraftAdmissionResult` in both the TypeScript interface and JSON schema, matching the D-21 report shape and the service output.
- Fixed `require_human_review` diagnostics so speculative drafts without conflict/risk refs still carry a review target via the source `candidate_draft` ref instead of an empty `required_human_review_points` array.
- Added admission service tests for:
  - same-batch duplicate normalized keys producing `merge_hint_only`;
  - pseudo-gap rejection when refs are otherwise resolved;
  - human-review fallback carrying a candidate draft review point.
- Cleaned the shared schema indentation around `draft_results.items` for readability.

## 2026-05-19 D-25 `supplemental_routing` Implementation
- Implemented the seventh D-25 slice as deterministic routing after `CandidateDraftAdmissionReport` and before any optional supplemental worker round.
- Added `TopicSelectionSupplementalRoundRoutingService` in `apps/backend/src/services/topic-selection-supplemental-round-routing-service.ts`.
- The routing service:
  - finalizes when at least one draft is admitted;
  - routes zero-admit supplementable drafts to `run_supplemental_round` only when remaining round budget exists and the current round is before round 3;
  - caps scoped supplemental questions at 5 and targets explicit `source_draft_id` values;
  - uses default supplemental roles `explorer` and `deep_critic`;
  - forbids broad re-exploration, unrelated candidate families, authority mutation, persistence writes, and schema bypass during supplemental rounds;
  - routes exhausted supplemental candidates to `block`;
  - routes grounded judgment gaps to `require_human_review`;
  - routes pure non-supplementable duplicate/rejected drafts to `reject_without_supplement`.
- Wired routing into `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`.
- Adapter behavior after this slice:
  - orchestrator schema failure still writes no ranked/minimum/admission/routing artifacts;
  - minimum validation failure writes only `minimum_schema_validation_report`;
  - minimum validation success writes `ranked_candidate_draft_batch`, `candidate_draft_admission_report`, and then `supplemental_round_routing_decision`;
  - `run_supplemental_round` returns adapter status `succeeded` because the current slice produced the routing artifact, but it does not execute the supplemental worker round or write authority records;
  - `block` and `reject_without_supplement` return adapter status `blocked`;
  - `require_human_review` returns adapter status `require_human_review`.
- Added unit coverage for finalize, supplemental run, exhausted budget/round 3, human review, non-supplementable rejection, invalid round metadata, and adapter artifact boundaries.
- This slice still does not implement supplemental worker execution, D-23 persistence batch, WorkflowHarness scenarios, or route-level node execution.

## 2026-05-19 D-25 `persistence_batch` Implementation
- Implemented the eighth D-25 slice as a service-layer batch persistence path over the existing `NeedCandidate` authority model.
- Added `TopicSelectionPersistNeedCandidateBatchService` in `apps/backend/src/services/topic-selection-persist-need-candidate-batch-service.ts`.
- Added `TopicSelectionNeedValidationRepository.createNeedCandidatesBatch` and implementations for:
  - `InMemoryTopicSelectionNeedValidationRepository`, with preflight duplicate-id and duplicate `(evidence_map_id, candidate_version)` checks before any write;
  - `PrismaTopicSelectionNeedValidationRepository`, using one Prisma transaction for all candidate inserts.
- The persistence service:
  - builds `PersistNeedCandidateBatchCommand` only from admission results with `decision=admit`;
  - rejects zero-admitted commands before authority writes;
  - rejects duplicate normalized candidate keys before authority writes;
  - derives deterministic candidate ids from `idempotency_key + draft_id`;
  - replays the same command by returning existing deterministic candidate refs without inserting duplicates;
  - blocks partial replays instead of mixing old and new records;
  - creates a query/projection-style `candidate_pool_projection_ref` and hash without introducing `NeedCandidateSet`;
  - writes only `NeedCandidate` records and does not create `ValidatedNeed`, `SearchPlan`, or v1b/v1c authorities.
- Wired persistence into `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` as an explicit optional path:
  - default adapter behavior remains artifact-only and writes no authority records;
  - when `persist_admitted_candidates=true`, a persistence service dependency exists, routing finalized with admitted drafts, and a `persistence_context` supplies current search/literature refs, the adapter records `persist_need_candidate_batch_command` and persists admitted candidates idempotently;
  - supplemental-round, blocked, and human-review routes do not write candidates.
- Deliberate schema boundary:
  - this slice does not change `prisma/schema.prisma`;
  - current `TopicSelectionNeedCandidateRecord` has no dedicated `candidate_hash`, `normalized_candidate_key`, or batch idempotency columns;
  - idempotency is enforced by deterministic candidate ids and replay checks, while the candidate hash is represented as a deterministic `candidate_version` suffix/ref version under the current model;
  - an exact D-23 storage hardening pass can add explicit columns later through the DB SSOT workflow, but this slice avoids a parallel authority path or premature schema churn.
- This slice still does not implement WorkflowHarness scenarios, route-level node execution, supplemental worker execution, or a DB migration for explicit hash/idempotency fields.

## 2026-05-19 D-25 `workflow_harness_scenarios` Implementation
- Implemented the ninth D-25 slice as a backend acceptance harness, not a route/UI entrypoint.
- Added `TopicSelectionWorkflowHarnessService` in `apps/backend/src/services/topic-selection-workflow-harness-service.ts`.
- The harness:
  - compiles D-18 exploration and arbiter context packets through `TopicSelectionNeedDiscoveryContextCompilerService`;
  - builds the locked `GenerateNeedCandidateNodeInput`;
  - calls `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService` so all model output still passes D-20 schema validation, D-21 admission gates, D-22 routing, and optional D-23 persistence;
  - injects scenario execution mode, run mode, current round metadata, mocked/codex/provider input, and explicit persistence intent;
  - evaluates scenario assertions without owning business decisions;
  - records a `discovery_audit` artifact with context refs, adapter artifact refs, authority refs, warnings, blockers, and assertion outcomes.
- Added mocked/provider/codex harness cases for:
  - finalize with admitted batch and explicit NeedCandidate persistence;
  - supplementable zero-admit routing to `run_supplemental_round` without authority persistence;
  - unresolved-ref admission blocker stopping before persistence;
  - duplicate candidate routing to `merge_hint_only` without authority persistence;
  - malformed structured output blocking before downstream artifacts;
  - stable result shape across `mocked_llm`, `codex_assisted`, and `provider_llm`;
  - persistence conflict rejection without partial duplicate writes.
- The implementation deliberately does not execute supplemental worker rounds, add a route-level node runner, implement the multi-agent debate loop, create `NeedCandidateSet`, or add a second candidate write path.

## 2026-05-19 DMP-01 Debate Model Invocation Policy
- Added `11-debate-model-invocation-policy.md` as the T-089 SSOT for future multi-agent debate model invocation rules.
- Locked `DMP-01`: `execution_mode` remains the source class of model-like output, not a concrete provider/model enum.
- Retained only `mocked_llm`, `codex_assisted`, and `provider_llm` as model-like execution modes.
- Defined `provider_llm` as a real provider-backed execution class that may resolve to multiple registered providers through a versioned `model_profile_id`.
- Explicitly rejected provider-specific execution modes such as `openai_llm`, `dashscope_llm`, or `deepseek_llm`.
- Deferred exact model profile fields, role/stage mappings, Codex substitution, fallback/escalation, normalized parameters, telemetry, failure behavior, mock isolation, and no-dual-track implementation rules to `DMP-02` through `DMP-10`.

## 2026-05-20 DMP-02 Debate Model Invocation Policy
- Locked `DMP-02`: model profiles are function, role, and stage oriented rather than provider-ranking tables.
- Defined the profile registry as the SSOT for workflow function, role family, stage family, quality objectives, output contract, allowed execution modes, required capabilities, model options, request policy, normalized parameters, provider overrides, audit policy, and budget policy.
- Replaced provider candidate ranking language with a unified `model_options` envelope keyed by `option_purpose` and `use_when`.
- Clarified that different providers may share the same `model_options` structure, but cross-provider parameters must live in `normalized_params` while provider-specific knobs must live in `provider_overrides`.
- Restricted `priority`/`weight` to optional low-level tie-breakers only; they must not carry business or role semantics.
- Deferred role/stage mapping to `DMP-03`, Codex substitution to `DMP-04`, fallback/escalation to `DMP-05`, and normalized parameter value/mapping details to `DMP-06`.

## 2026-05-20 DMP-03 Debate Model Invocation Policy
- Locked `DMP-03`: debate execution is decomposed into explicit role/stage invocation slots.
- Each role/stage slot references only a versioned `profile_id`, input context family, and output contract.
- Role/stage mapping must not directly encode provider ids, model ids, provider-specific parameters, fallback chains, retry rules, or budget rules.
- `explorer` and `deep_critic` may have multiple instances, but same-role outputs must merge into role-level summaries before arbiter consumption.
- `arbiter` remains single-instance per debate loop and is the only external structured-output port.
- Added `instance_policy` to role/stage slots so worker role multiplicity is expressed as role instances, not provider lists.
- Clarified that multi-instance worker roles may resolve to one or more provider/model options, including duplicate options, through the bound profile.
- Required repeated provider/model use to carry distinct `agent_instance_id` and provenance.
- `round_1_discovery` can explore broadly inside node scope, while `supplemental_repair` is limited to arbiter-specified questions and cannot restart broad exploration.
- Missing required role/stage profile mappings block the debate loop instead of inventing default providers or profiles.

## 2026-05-20 DMP-04 Debate Model Invocation Policy
- Locked `DMP-04`: Codex substitution is a role/stage slot-level execution override under `execution_mode=codex_assisted`.
- Codex substitution may replace selected local model-like invocations for cost control, but it must not replace `profile_id`, change role/stage mapping, or masquerade as `provider_llm`.
- Preferred Codex substitution targets are `explorer` and `deep_critic`; `arbiter.issue_framing` is allowed, while `arbiter.final_synthesis` is forbidden in the v1 executable contract.
- Provider-quality scenarios and explicit provider runs forbid Codex substitution.
- Codex output must pass the same output contract, schema validation, deterministic gates, routing, and authority-write boundaries as provider output.
- Codex failure must not fallback to `mocked_llm`.
- Codex provenance must record `execution_mode=codex_assisted`, `source_kind=codex_response`, `non_provider=true`, operator label, prompt packet hash, response hash, and optional operator approval ref.

## 2026-05-20 DMP-05 Debate Model Invocation Policy
- Locked `DMP-05`: automatic provider fallback is disabled in v1.
- A failed `provider_llm` call records a failure artifact and blocks the current role/stage slot or node instead of silently switching providers.
- Manual rerun and explicit profile/provider-option override are allowed, but each must create a new attempt/run record with explicit provenance.
- Provider output must never fallback to `codex_assisted` or `mocked_llm`; Codex/mock remain separate execution classes.
- Schema validation failures, deterministic validator failures, admission failures, routing blockers, and persistence failures are workflow failures, not provider-call failures, and cannot trigger fallback.
- Any future automatic fallback must be a separate task with deterministic attempt ledger, stable replay key, per-attempt telemetry, scenario coverage, and node-policy opt-in.

## 2026-05-20 DMP-06 Debate Model Invocation Policy
- Locked `DMP-06`: model invocation parameters are normalized as cross-provider intent inside model profiles.
- Canonical v1 `normalized_params` keys are `creativity`, `reasoning_depth`, `output_budget`, `structured_output_required`, and `output_format`.
- Workflow matrices, node policies, role/stage mappings, harness scenarios, domain services, and authority objects must not contain concrete provider parameter names such as temperature, top-p, max tokens, reasoning effort, thinking effort, or enable-thinking flags.
- Provider-specific knobs may appear only under model-option `provider_overrides`; provider adapters or the LLM gateway map normalized intent to concrete provider payloads.
- Required capability mismatch fails fast; optional capability degradation is allowed only with explicit option policy and audit marker.
- Hidden reasoning, chain-of-thought, raw thinking traces, and provider-private reasoning payloads remain non-persisted even when `reasoning_depth` requests deeper analysis.
- Updated DMP-01/DMP-02 examples to remove automatic fallback wording and provider-specific normalized parameter names so the policy remains aligned with DMP-05/DMP-06.

## 2026-05-20 DMP-07 Debate Model Invocation Policy
- Locked `DMP-07`: all model-like invocations use one common provenance/audit envelope.
- Single-agent nodes use the common invocation fields only; multi-agent debate nodes add a `debate_extension` for loop, round, role, stage, agent instance, and worker-to-arbiter lineage.
- `provider_llm`, `codex_assisted`, and `mocked_llm` share the same envelope shape while preserving distinct `execution_mode` and `source_kind` values.
- Provider request ids may be diagnostic metadata, but they must not become business inputs or authority refs.
- Prompt text, raw provider logs, secrets, credentials, API keys, hidden reasoning, chain-of-thought, raw thinking traces, and provider-private reasoning payloads are not persisted.
- Raw debate worker outputs may exist only as redacted internal audit artifacts; downstream business contracts consume node results, arbiter final artifacts, authority refs, warnings/blockers, and audit refs/hashes.
- Cache and response reuse markers are provenance facts only and must not alter execution mode or bypass schema/deterministic gates.

## 2026-05-20 DMP-08 Debate Model Invocation Policy
- Locked `DMP-08`: v1 allows only narrow low-level technical retry and forbids semantic retry.
- Technical retry is limited to transient provider transport/provider errors under the same `profile_id`, model option, normalized parameters, prompt packet hash, context packet hashes, output contract, and execution mode.
- Provider-call retry exhaustion in `provider_llm` records a failure artifact and returns `blocked` per DMP-05; it must not fallback to another provider, Codex, or mock.
- Schema validation failure, deterministic validator failure, admission failure, routing blocker, and persistence failure do not trigger model retry.
- `blocked` means automatic continuation is unsafe due to operational, contractual, missing-data, or deterministic workflow failure.
- `require_human_review` means the system has enough grounded context to ask the operator for a concrete judgment before continuing.
- Debate supplemental rounds are not retries; they require arbiter-scoped repair questions, remaining round budget, node-policy permission, and a full re-entry through schema validation, deterministic gates, routing, and authority boundaries.

## 2026-05-20 DMP-09 Debate Model Invocation Policy
- Locked `DMP-09`: `mocked_llm` is limited to test and acceptance infrastructure.
- `mocked_llm` is rejected for `run_mode=product` and cannot write product database authority records.
- Mock-backed persistence coverage must use an in-memory repository, isolated test database, isolated acceptance database, or explicit fixture namespace.
- Mock artifacts must record `run_mode`, `execution_mode=mocked_llm`, `source_kind=mock_fixture`, and `mock_fixture_id`.
- Provider-backed and Codex-assisted artifacts must preserve distinct `execution_mode` and `source_kind` values so real-flow evidence cannot be confused with mock acceptance evidence.
- Mock output cannot satisfy provider-quality scenarios or real-flow acceptance criteria, and real E2E evidence must be labeled separately from mock acceptance evidence.
- Real execution failures must not fallback to mock, and mock failures remain test/acceptance fixture failures rather than product recovery paths.

## 2026-05-20 DMP-10 Debate Model Invocation Policy
- Locked `DMP-10`: Debate Model Invocation Policy v1 must have one SSOT and one implementation path.
- The model profile registry owns provider/model options, normalized parameters, provider overrides, required capabilities, fallback policy, retry policy, audit policy, budget policy, and run-mode eligibility.
- Workflow and node policies may reference `node_id`, `execution_mode`, `run_mode`, `profile_id`, role/stage mappings, and deterministic gates, but must not duplicate concrete provider/model/parameter/fallback/mock rules.
- `AgentOrchestrator` remains the model invocation entrypoint and `BackendLlmGateway` remains the provider boundary; feature code must not call provider SDKs directly.
- Debate must not introduce a separate LLM router, prompt runtime, cache layer, artifact writer, transcript store, provenance shape, or authority persistence path.
- Artifacts continue through the control-plane artifact-ref boundary, and authority writes remain inside domain services/repositories.
- Workflow acceptance coverage must use registered `WorkflowScenario` definitions instead of standalone runners with independent routing semantics.
- Implementation should proceed through profile registry/schema validation, shared provenance contract, orchestrator profile resolution/run-mode enforcement, WorkflowHarness scenarios, route-level node runner, and then real provider/Codex flow evidence.

## 2026-05-20 DMP Runtime Consumption
- T-088 implemented the first DMP runtime foundation slice: shared profile registry contracts and backend registry validator/resolver.
- T-088 then wired profile resolution into `AgentOrchestrator` and the current generate-need-candidate harness path, removing concrete provider/model/request-policy inputs from that runtime chain.
- Provider-backed invocation now resolves through `profile_id + model_option_id`; Codex/mock/provider outputs share one provenance envelope with profile hashes and selected option metadata.
- This is an implementation of the locked DMP-01 through DMP-10 policy baseline, not a new debate policy decision.
- T-089 remains the workflow/debate policy SSOT; T-088 owns runtime primitives.

## 2026-05-20 Need-Discovery Debate Runtime Consumption
- T-088 implemented the first concrete debate runtime for the T-089 `generate-need-candidate` node policy.
- The runtime follows the locked T-089 policy:
  - worker roles are `explorer` and `deep_critic`;
  - `arbiter` is single-instance and is the only external structured-output port;
  - same-role worker outputs merge into role-level summaries before arbiter consumption;
  - final output remains the existing `RankedCandidateDraftBatch`;
  - deterministic D-20/D-21/D-22 gates still decide admission, routing, and persistence;
  - no `NeedCandidateSet`, raw transcript handoff, or worker authority write path is introduced.
- The WorkflowHarness can now run a mocked `multi_agent_debate` generate-need-candidate scenario and keep authority persistence disabled when the scenario asks for artifact-only acceptance.
- T-089 policy gaps still pending:
  - exact provider/Codex role assignment evidence for real debate runs;
  - route-level scenario registry execution;
  - automatic orchestration of optional supplemental repair rounds beyond passing `round_index` into one loop execution.

## 2026-05-20 v1a Debate Scenario Contract SSOT
- Added the executable v1a generate-need-candidate debate contract as shared code plus a human-readable contract note.
- Shared SSOT: `packages/shared/src/research-lifecycle/topic-selection-debate-scenario-contracts.ts`.
- Documentation: `dev-docs/active/topic-selection-agent-workflow-review/12-v1a-generate-need-candidate-debate-contract.md`.
- The contract binds `topic-selection.v1a.generate-need-candidate.v1` to four runnable slots:
  - `explorer.round_1_discovery`, default 2 instances, profile `topic-selection.need-discovery.explorer.v1`;
  - `deep_critic.round_1_discovery`, default 1 instance, profile `topic-selection.need-discovery.deep-critic.v1`;
  - `arbiter.issue_framing`, exactly 1 instance, profile `topic-selection.need-discovery.arbiter-framing.v1`;
  - `arbiter.final_synthesis`, exactly 1 instance, profile `topic-selection.need-discovery.arbiter-final.v1`.
- The executable contract makes `arbiter.final_synthesis` Codex-forbidden in v1, aligning DMP-04 with the current profile registry/runtime strictness and avoiding an operator-approval dual track.
- Provider/model/parameter details remain profile-registry-owned:
  - default provider option is OpenAI `gpt-5.5` with high reasoning normalized params;
  - manual budget option is DashScope `qwen3.6-plus` with `enable_thinking` under provider overrides;
  - automatic fallback remains disabled.
- `TopicSelectionNeedDiscoveryDebateLoopService` now consumes the shared scenario contract for role/stage slot metadata, instance defaults, prompt/template ids, output contracts, schema names, debate policy id, node id, and round cap.
- Added provider-mode debate-loop coverage proving default execution makes two explorer calls, one deep critic call, one arbiter issue-frame call, and one arbiter final-synthesis call through profile-resolved OpenAI model options.
- Added slot-level `slot_execution_overrides` so provider-backed debate can explicitly substitute allowed worker/issue-framing slots with Codex while keeping `arbiter.final_synthesis` provider-backed.
- Added negative coverage proving `arbiter.final_synthesis` cannot be overridden to `codex_assisted`.
- Supplemental repair profiles remain policy-level future extension points; they are not part of the current executable contract until multi-round repair orchestration is implemented.

## 2026-05-20 v1a Flow Convergence: Build Evidence Map
- Converged `topic-selection.v1a.build-evidence-map.v1` from stub to `implementation_ready` in `07-node-policies.md`.
- The node is locked as deterministic evidence normalization:
  - no `AgentOrchestrator`, `BackendLlmGateway`, Codex, or debate runtime;
  - authority writes stay inside `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun` and `TopicSelectionEvidenceMapRepository.createEvidenceMapWithRecords`;
  - the current executable entry point remains `POST /topic-selection/v1a/evidence-maps`, derived from `SearchRun` lineage rather than a separate sample-set authority write.
- The policy now aligns with current backend behavior:
  - SearchRun must be `succeeded` or `partial`;
  - SearchRun, SearchPlan, and LiteratureResourcePoolSnapshot lineage must match;
  - EvidenceUnit refs must come from SearchRun `evidence_map_input_refs` or coverage evidence bindings;
  - `source_attribution_kind=llm_inference` cannot become EvidenceUnit source authority;
  - abstract-only support is allowed only with `ABSTRACT_ONLY_SUPPORT` issue code for downstream gates.
- Remaining v1a convergence nodes:
  - `topic-selection.v1a.validate-need-adjudication.v1`;
  - `topic-selection.v1a.human-confirm-need.v1`;
  - `topic-selection.v1a.publish-v1b-input-bundle.v1`.

## 2026-05-20 v1a Flow Convergence: Generate Need Candidate
- Converged `topic-selection.v1a.generate-need-candidate.v1` from `draft` to `implementation_ready` in `07-node-policies.md`.
- The node policy now points at the actual runtime chain:
  - `TopicSelectionWorkflowHarnessService.runGenerateNeedCandidateScenario`;
  - `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService.generateRankedCandidateDraftBatch`;
  - `TopicSelectionNeedDiscoveryContextCompilerService`;
  - `TopicSelectionNeedDiscoveryArtifactBoundaryService`;
  - `TopicSelectionAgentOrchestratorService.invokeStructuredOutput`;
  - `TopicSelectionNeedDiscoveryDebateLoopService.runNeedDiscoveryDebate`;
  - `TopicSelectionRankedCandidateDraftBatchValidatorService`;
  - `TopicSelectionCandidateDraftAdmissionService`;
  - `TopicSelectionSupplementalRoundRoutingService`;
  - `TopicSelectionPersistNeedCandidateBatchService`;
  - `TopicSelectionNeedValidationRepository.createNeedCandidatesBatch`.
- The policy explicitly separates the compatibility single-candidate route `POST /topic-selection/v1a/need-candidates` from the WorkflowHarness/debate/batch runtime. That route remains a legacy/manual creation path and must not claim debate or multi-candidate batch provenance.
- Profile escalation now references the DMP-05 semantics plus `TopicSelectionModelProfileRegistryService` and `TopicSelectionAgentOrchestratorService`, avoiding a second provider/model/fallback policy inside the node.
- Remaining v1a convergence nodes:
  - `topic-selection.v1a.validate-need-adjudication.v1`;
  - `topic-selection.v1a.human-confirm-need.v1`;
  - `topic-selection.v1a.publish-v1b-input-bundle.v1`.

## 2026-05-20 v1a Flow Split Implementation: Adjudication, Human Confirm, V1b Bundle
- Implemented the split that removes the previous composite validate route risk.
- `TopicSelectionNeedValidationService.adjudicateNeed` now writes only `TopicSelectionValidateNeedAdjudicationResultRecord` plus typed side-effect refs such as recheck requests or memory suggestions.
- `adjudicateNeed(final_decision=validate)` no longer writes `HumanConfirmedDecision`, `ValidatedNeed`, or `TopicSelectionV1aToV1bInputBundleRecord`.
- Added `TopicSelectionNeedValidationService.confirmValidatedNeed` and `POST /topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations`.
- `confirmValidatedNeed` is the only backend path in this slice that records a human decision and materializes `ValidatedNeed`.
- `publishV1bInputBundle` remains the deterministic v1a-to-v1b handoff path and now returns an existing bundle for the same `ValidatedNeed`/version instead of minting duplicates.
- A `NeedCandidate` with a pending adjudication now blocks further adjudication attempts until the pending path is resolved, preventing multiple candidate output ids before human confirmation.
- Clarified the persistence boundary: domain authority writes are atomic at the repository boundary, while pre-write control-plane audit records may remain as failed-attempt evidence and must not be treated as materialized downstream authority.
- Converged the three v1a node policies from `draft` to `implementation_ready`:
  - `topic-selection.v1a.validate-need-adjudication.v1`;
  - `topic-selection.v1a.human-confirm-need.v1`;
  - `topic-selection.v1a.publish-v1b-input-bundle.v1`.
- Updated route, service, Prisma/in-memory repository, real-flow script, unit tests, route integration tests, and decision-chain acceptance tests to use the split sequence:
  - adjudication recommendation;
  - explicit human confirmation;
  - deterministic v1b input bundle publication.

## 2026-05-20 Real E2E Canary Harness Migration
- The real E2E canary now consumes the `topic-selection.v1a.generate-need-candidate.v1` node policy through `TopicSelectionWorkflowHarnessService`.
- This closes the most important policy/runtime gap for v1a testing: the canary no longer uses the compatibility `POST /topic-selection/v1a/need-candidates` route as the generate-node implementation.
- The compatibility route remains documented as a manual/single-candidate path and must not be treated as multi-candidate, debate, or harness provenance.
- The run records `topic-selection.real-e2e.canary.v1` in the v1a output artifact, including scenario status, execution mode, adapter status, routing decision, persisted candidate refs, candidate-pool projection ref, and harness trace artifact ref.
- A failed rehearsal surfaced a semantic drift risk in ref versions: harness-created candidates must preserve canonical versioned refs for EvidenceMap, SearchPlan, LiteratureResourcePoolSnapshot, and EvidenceUnit refs so v1b intake trace checks match support-packet lineage.
- The script now carries those version ids into the harness input before persistence.
- This is a partial migration of the canary script, not full scenario-runner replacement for every node. Resource sampling, v1b, v1c, bridge, and downstream steps still need scenario-wrapper convergence in later T-088/T-089 work.

## 2026-05-20 WorkflowScenario Runner Migration: Scale Quality And v1b Negative
- Retired the standalone `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` path after marking it as legacy compatibility.
- Added `.ai/scripts/topic-selection-workflow-scenario-runner.mjs` and mapped the old quality-gate assertions to registered scenario ids:
  - `topic-selection.real-e2e.scale-quality.v1`;
  - child `topic-selection.real-e2e.canary.v1` runs;
  - child `topic-selection.v1b.non-advance-negative.v1` when negative coverage is enabled.
- Updated `08-scenarios.md` so the scale-quality and v1b non-advance negative scenarios no longer appear as unimplemented standalone-script placeholders.
- `pnpm topic-selection:real-e2e:quality-gate` remains a command name for continuity, but now resolves to the scenario runner with `--scenario topic-selection.real-e2e.scale-quality.v1`.
- The migration preserves legacy quality assertions while preventing a second script-local semantic source for sampling stability, role counts, selected evidence polarity checks, intake invariants, and v1b non-advance stop behavior.
- The first migrated smoke run found a stale resource-sampling semantic artifact: role/polarity were canonicalized, but rationale and method family still described the LLM's previous role. The service now canonicalizes rationale/method family with the selected role so downstream quality audits do not read conflicting evidence-role semantics.

## 2026-05-20 v1a WorkflowHarness Normalization Alignment
- Corrected the v1a start boundary: complete v1a starts at `topic-selection.v1a.create-topic-seed.v1`, not at EvidenceMap.
- Added v1a preparatory nodes to `06-workflow-matrix.md` and `07-node-policies.md`:
  - `topic-selection.v1a.create-topic-seed.v1`;
  - `topic-selection.v1a.snapshot-literature-resource-pool.v1`;
  - `topic-selection.v1a.create-search-plan.v1`;
  - `topic-selection.v1a.record-search-run.v1`.
- Confirmed that the evidence-to-need subchain semantics are implementation-ready in `07-node-policies.md`, but only `generate-need-candidate` currently meets the normalized `WorkflowHarness` automation standard.
- T-088 now owns the implementation slice `07-v1a-workflow-harness-normalization.md`.
- T-089 remains the semantic source for node policy details; this avoids creating a second policy source inside runtime implementation docs.
- TitleCard creation remains upstream of v1a for this slice.
- Resource sampling remains outside complete v1a for this slice and should not be treated as a v1a node during harness normalization.

## 2026-05-20 v1a Flow Convergence: Create TopicSeed
- Promoted `topic-selection.v1a.create-topic-seed.v1` from `draft` to `implementation_ready` in `07-node-policies.md`.
- Locked the node as deterministic:
  - no `AgentOrchestrator`;
  - no provider/Codex/debate execution;
  - no resource-sampling input coupling;
  - no SearchPlan, EvidenceMap, NeedCandidate, or v1b authority writes.
- Authority remains `TopicSelectionTopicSeedRecord` written by `TopicSelectionSearchResourceService.createTopicSeedFromTitleCard` and `TopicSelectionSearchResourceRepository.createTopicSeed`.
- The node now has an executable harness runner through `TopicSelectionWorkflowHarnessService.runCreateTopicSeedScenario`.
- The policy records the service hardening that final `intent_summary` after fallback must be non-empty and that `seed_kind` is fixed to `title_card`.

## 2026-05-20 Node Policy Evaluation: Automation Callability
- Added `automation_callability` as a node-evaluation dimension in `07-node-policies.md`.
- This separates semantic readiness from executable automation:
  - `policy_status=implementation_ready` means the node contract is clear enough to build against;
  - `automation_callability=callable` means a normalized `WorkflowHarness` runner exists and scenario code can invoke the node without script-local business choreography.
- Added a v1a callability snapshot so the 9-node workflow can be reviewed without assuming every implementation-ready node is already automated.
- Current v1a callable nodes are `create-topic-seed` and `generate-need-candidate`.

## 2026-05-20 v1a Node 2 Alignment: Snapshot Boundary And Source Of Truth
- Locked N2-D01 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`: the node only materializes `TopicSelectionLiteratureResourcePoolSnapshot` authority and must not perform resource sampling, literature selection, evidence-role classification, or evidence-polarity judgment.
- Locked N2-D02: the normalized v1a path uses the TitleCard evidence basket as the single source of included literature for this node.
- `ResourceSampleSet` may be recorded only as upstream provenance after selected literature has already been attached to the evidence basket; it must not become a second direct input path for snapshot contents.
- Superseded by N2-D10: the node is now `policy_status=implementation_ready` while `automation_callability` remains `not_callable` until the runner and tests exist.

## 2026-05-20 v1a Node 2 Alignment: Source Scope
- Locked N2-D03 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- The normalized harness path supports only `source_scope=title_card_evidence_basket`.
- Existing shared-contract enum values `manual_selection` and `search_result` remain compatibility values only; they must not be treated as implemented alternate resolvers in normalized v1a execution.
- A harness input using `manual_selection` or `search_result` must return a blocked result with `UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A` before authority creation.

## 2026-05-20 v1a Node 2 Alignment: Resource Quality Gate
- Locked N2-D04 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- The node blocks only traceability and authority-creation failures: missing TopicSeed, TopicSeed/title-card lineage mismatch, empty evidence basket, unresolved evidence-basket literature ids, unsupported normalized source scope, or failed control-plane gate/transition.
- Resource maturity gaps are diagnostic at this node and must flow through `source_health_summary.warning_codes`: incomplete key content, incomplete abstract, low source count, incomplete pipeline readiness, stale/duplicate status, and incomplete fulltext readiness.
- This keeps the node as a resource-pool snapshot boundary rather than a research-quality adjudication boundary.

## 2026-05-20 v1a Node 2 Alignment: Snapshot Hash And Replay
- Locked N2-D05 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- `snapshot_hash` is the replay identity for snapshot contents and source-health state, not an identity for a specific execution attempt.
- The hash must include stable inputs: `title_card_id`, TopicSeed ref, `source_scope`, evidence basket `updated_at`, evidence-basket-derived literature refs, content source refs, `source_health_summary`, and `policy_version_id`.
- The hash must exclude execution artifacts: snapshot id, control-plane ids, harness trace artifact id, `created_at`, and `created_by`.
- Repeated runs over the same TopicSeed, evidence basket state, source scope, source health summary, and policy must keep the same `snapshot_hash` even when audit/control-plane ids differ.

## 2026-05-20 v1a Node 2 Alignment: Harness Runner Contract
- Locked N2-D06 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- The planned runner is `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario`.
- The runner must call `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot` as the authority service and must not write the repository directly.
- The runner must expose stable normalized node input/result types and a shared success/blocked outer result shape.
- A blocked result must include blocker codes, normalized node input, no snapshot authority refs, and a harness trace artifact ref when trace recording is available.
- At contract-lock time the node was not yet callable; this was superseded by the implementation slice below.

## 2026-05-20 v1a Node 2 Alignment: Audit And Trace Boundary
- Locked N2-D07 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- Control-plane records remain authoritative audit facts: input snapshot, readiness gate result, and transition attempt.
- Harness trace artifact `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1` is automation execution evidence and must not replace control-plane audit refs.
- The trace must record scenario/node/run/attempt ids, normalized input/result, `snapshot_hash`, `source_health_summary`, authority refs, control-plane refs, blockers, warnings, and assertions.
- The trace must not record hidden reasoning, secrets, provider logs, raw LLM transcripts, or raw debate transcripts.

## 2026-05-20 v1a Node 2 Alignment: SearchPlan Handoff
- Locked N2-D08 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- The downstream SearchPlan node must consume the `LiteratureResourcePoolSnapshot` authority produced by this node.
- SearchPlan must not re-read the mutable TitleCard evidence basket, `ResourceSampleSet`, selected literature refs, or current search results as resource truth.
- The handoff packet must carry snapshot ref, version, hash, source scope, literature refs, content source refs, and `source_health_summary`.
- If the evidence basket changes after snapshot creation, those changes affect SearchPlan only after a new `LiteratureResourcePoolSnapshot` is created.

## 2026-05-20 v1a Node 2 Alignment: Idempotency And Repeated Runs
- Locked N2-D09 for `topic-selection.v1a.snapshot-literature-resource-pool.v1`.
- The default behavior is append-only: repeated equivalent runs may create new `LiteratureResourcePoolSnapshot` authority ids.
- Content equivalence is represented by `snapshot_hash`; equivalent repeated runs must keep the same hash while recording distinct execution/audit evidence.
- The runner must not silently reuse an existing snapshot authority by hash, must not treat `snapshot_hash` as the authority ref, and must not skip control-plane gate/transition evidence because an equivalent hash exists.
- Any future `reuse_existing_snapshot_by_hash` behavior requires an explicit policy and runner input flag.

## 2026-05-20 v1a Node 2 Alignment: Implementation Readiness Review
- Locked N2-D10 and promoted `topic-selection.v1a.snapshot-literature-resource-pool.v1` to `policy_status=implementation_ready`.
- At readiness-review time the node was not yet callable; this was superseded by the implementation slice below.
- Complexity is moderate and bounded: the node is deterministic, uses an existing route/service/repository authority path, and reuses control-plane input snapshot, gate, transition, and artifact primitives.
- The implementation does not require provider LLMs, Codex, AgentOrchestrator, debate runtime, schema migration, or new authority objects.
- Known implementation gaps are explicit: implement `runSnapshotLiteratureResourcePoolScenario`, align `snapshot_hash` payload, expand source-health maturity warning codes, add the trace schema, and cover success/blocked/hash/idempotency/handoff assertions.

## 2026-05-20 v1a Node 2 Implementation: WorkflowHarness Runner
- Implemented `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario` and promoted the node to `automation_callability=callable`.
- The runner delegates authority creation to `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot`; it does not write the repository directly.
- The runner returns stable normalized input/result shapes across success and blocked paths, including downstream SearchPlan handoff data, audit refs, blocker/warning codes, assertions, and a control-plane trace artifact using `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1`.
- Unsupported normalized harness `source_scope` values now block before authority creation with `UNSUPPORTED_SOURCE_SCOPE_FOR_NORMALIZED_V1A`.
- Missing evidence-basket literature records preserve `MISSING_LITERATURE_RECORD` as the blocker code on the blocked harness result.
- `snapshot_hash` now follows the locked content replay identity and excludes runtime ids; repeated equivalent runs can create distinct snapshot authority refs while keeping the same hash.
- `source_health_summary.warning_codes` now includes resource maturity warnings without converting traceable immature resources into hard blockers.

## 2026-05-20 v1a Node 2 Quality Review Follow-up
- Fixed the blocked-path audit gap found during self-review: missing-literature blocked results now include the input snapshot, readiness gate, and transition attempt refs created before repository persistence is skipped.
- Tightened `topic_seed_ref` validation for normalized snapshot execution: `ref_type=topic_seed`, non-empty `ref_id`, non-empty `version_id`, and matching non-empty `title_card_id` are required before authority creation.
- Hardened harness input string validation to consistently return `INVALID_PAYLOAD` for malformed programmatic inputs.
- Added regression tests for blocked audit refs and non-concrete TopicSeed refs.

## 2026-05-20 v1a Node 3 Alignment: SearchPlan Boundary
- Locked N3-D01 for `topic-selection.v1a.create-search-plan.v1`.
- The node only materializes a caller-supplied SearchPlan blueprint into SearchPlan and coverage-row authorities.
- It remains deterministic and model-free: no retrieval execution, EvidenceMap construction, evidence-role adjudication, research-content generation, AgentOrchestrator, provider LLM, Codex, or debate runtime is allowed.
- The normalized path uses the LiteratureResourcePoolSnapshot authority from Node 2 as resource truth and blocks stale snapshot assumptions through an expected `snapshot_hash`.
- Explicit coverage intents are required for automation; route/service support-only fallback remains compatibility behavior rather than normalized harness behavior.

## 2026-05-20 v1a Node 3 Alignment: Blueprint Source
- Locked N3-D02 for `topic-selection.v1a.create-search-plan.v1`.
- SearchPlan blueprint is an upstream input supplied before Node 3 runs. Node 3 does not infer or draft it from TopicSeed, Snapshot, TitleCard, ResourceSampleSet, selected literature refs, or search results.
- Valid origins are scenario fixtures, human-authored local input, Codex-assisted local drafting, or a future upstream `draft-search-plan-blueprint` node.
- Future automatic blueprint drafting must be separated from `create-search-plan` so generation policy, model choice, context, and verification cannot drift into the authority-materialization node.
- Blueprint provenance is trace metadata only; the resource truth remains the Node 2 LiteratureResourcePoolSnapshot authority.
- Corrected contract ownership: `TopicSelectionSearchPlanBlueprint` is a module-level topic-selection value contract that Node 3 consumes, not a node-private N3 contract.
- The first implementation can freeze it in Node 3 input snapshot and harness trace; a future producer node may persist it separately only after defining that authority/artifact policy.

## 2026-05-20 v1a Node 3 Alignment: Blueprint Minimum Contract
- Locked N3-D03 as the module-level `TopicSelectionSearchPlanBlueprint@v1` minimum contract.
- The minimum fields are sufficient for all current consumers: Node 3, Node 4, EvidenceMap, NeedCandidate generation, and future blueprint producers.
- Coverage rows are execution-level: `coverage_key`, `intent_type`, `query`, `rationale`, `required`, `priority`, `expected_evidence_role`, `target_source_types`, and `refs` are mandatory after normalization.
- `target_source_types` and `refs` may be empty arrays, but missing fields are not allowed in normalized harness execution.
- This keeps SearchPlan planning quality explicit and prevents service fallback defaults from becoming the automated v1a contract.

## 2026-05-21 v1a Node 3 Alignment: Blueprint LLM Profiles
- Locked N3-D04 for `TopicSelectionSearchPlanBlueprint` semantic draft/review model policy.
- Codex is the default local low-cost execution path for draft and review; provider execution is explicit upgrade/provider-quality only.
- Draft profile `topic-selection.search-plan-blueprint.draft.v1` uses `creativity=medium`, `reasoning_depth=high`, `output_budget=large`, structured JSON schema output, and provider options OpenAI `gpt-5.5`, OpenAI `gpt-5.5`, and DashScope `qwen3.6-plus`.
- Review profile `topic-selection.search-plan-blueprint.review.v1` uses `creativity=low`, `reasoning_depth=high`, `output_budget=medium`, structured JSON schema output, and the same provider family.
- DeepSeek is not included until registered in the provider registry.
- `create-search-plan` itself stays `execution_mode=none`; model-like draft/review output must pass schema and deterministic validators before authority creation.

## 2026-05-21 v1a Node 1/2 LLM Boundary Amendments
- Recorded the TopicSeed and resource-pool-snapshot LLM boundary as original-node amendments, not as a new N3 decision.
- N1-AM01: `topic-selection.v1a.create-topic-seed.v1` remains deterministic with `execution_mode=none`. Human/Codex/provider/fixture preparation may shape the final `intent_summary` and `scope_notes` before invocation, but Node 1 only freezes accepted input and writes `TopicSelectionTopicSeed` through the authority service.
- No TopicSeed draft/review model profile is executable in the current slice. `TopicSeedIntentDraft@v1` is reserved only as a possible future pre-node value artifact/profile.
- N2-AM01: `topic-selection.v1a.snapshot-literature-resource-pool.v1` remains deterministic and model-free. It snapshots traceable resource state only; sampling, role classification, polarity judgment, and evidence interpretation stay outside Node 2.
- This avoids decision-order drift: SearchPlanBlueprint LLM policy remains N3-D04, while TopicSeed and snapshot boundaries remain attached to Node 1 and Node 2.

## 2026-05-21 v1a Node 3 Alignment: WorkflowHarness Runner Contract
- Locked N3-D05 for `topic-selection.v1a.create-search-plan.v1`.
- `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario` is the normalized automation boundary.
- The runner input is `TopicSelectionSearchPlanBlueprint@v1` plus scenario/run metadata; normalized automation must not pass a permissive bare `CreateSearchPlanInput`.
- The runner must perform strict pre-service validation so route/service compatibility fallback cannot create automated coverage semantics.
- Normalized harness execution blocks omitted coverage intents, missing coverage-row fields, fallback coverage keys, fallback priorities, fallback support roles, and fallback generic rationales before SearchPlan/CoverageRow authority creation.
- Authority writes remain inside `TopicSelectionSearchResourceService.createSearchPlan`; direct repository writes and partial authority on blocked results are forbidden.
- `WorkflowHarnessCreateSearchPlanScenarioTrace@v1` is the trace schema for normalized runner evidence.

## 2026-05-21 v1a Node 3 Implementation: Callable SearchPlan Runner
- Promoted `topic-selection.v1a.create-search-plan.v1` to `policy_status=implementation_ready` and `automation_callability=callable`.
- Implemented `runCreateSearchPlanScenario` with stable node input/result shapes for success and blocked paths.
- Added `TopicSelectionSearchPlanBlueprint@v1` and its exported schema-version constant to shared search/resource contracts and schema smoke coverage.
- Tightened normalized validation so wrong blueprint schema versions, missing blueprint, lineage drift, snapshot hash drift, empty query/coverage intents, and missing coverage semantic fields block before authority creation.
- Hardened malformed coverage intent handling so non-object entries and blank string-array values block deterministically before service invocation.
- Preserved route/service compatibility fallback for manual/API callers while forbidding fallback-derived coverage rows in normalized WorkflowHarness execution.
- Full blueprint payload is frozen in the service input snapshot and harness trace, so future Node 4/EvidenceMap consumers can audit the exact plan semantics without re-reading mutable resource state.
- Node 1 and Node 2 provenance amendments are reflected in runtime inputs: intent-preparation refs and resource-sample-set provenance refs are auditable but do not introduce LLM execution into either node.

## 2026-05-21 v1a Node 4 Alignment: No Debate Baseline
- Locked N4-D00 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 is a deterministic factual contract and lineage gate for SearchRun recording, result accounting, coverage-row binding integrity, raw-log separation, and EvidenceMap handoff consumability.
- Multi-agent debate is explicitly rejected for Node 4 because the node does not broaden topic thinking, discover value, or interpret evidence roles.
- Strict topic-selection guarding remains required, but it is handled by layered v1a/v1b/v1c gates and bounded loopback rather than by adding debate to this record node.
- Future agent-assisted search-result organization, if needed, must be modeled as a separate upstream input-preparation or search-execution node; Node 4 only validates and records its output.

## 2026-05-21 v1a Node 4 Alignment: SearchRun Authority Boundary
- Locked N4-D01 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 is not a search execution node; it records already-produced search, import, or manual-result facts.
- A failed search execution may still be persisted as `TopicSelectionSearchRun` when the SearchRun record contract is valid.
- Failed SearchRuns are audit facts only: they are non-consumable for Node 5 and must not emit an EvidenceMap handoff.
- Node 4 blocked means the record contract is invalid or unsafe to persist, including malformed input, missing result accounting/source-health summary, SearchPlan/Snapshot lineage mismatch, coverage-row conflict, or raw log being used as an authority ref.

## 2026-05-21 v1a Node 4 Alignment: Normalized Input Bundle
- Locked N4-D02 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 needs a module-level value contract `TopicSelectionSearchRunRecordBundle@v1` as its normalized harness input.
- The bundle is not a new persistence authority and must not create a second route/product contract.
- The bundle must map losslessly to the existing `RecordSearchRunInput`; `TopicSelectionSearchResourceService.recordSearchRun` remains the only SearchRun authority writer.
- Route compatibility may remain only if it shares the same fields and semantics, so normalized harness execution and API callers do not drift into parallel SearchRun input models.
- To avoid duplicate version truth, SearchPlan version is asserted only through `search_plan_ref.version_id`; the rejected `expected_search_plan_version` field is not part of the bundle.
- Snapshot version is asserted through `literature_resource_pool_snapshot_ref.version_id`; `expected_literature_snapshot_hash` remains only as a replay/currentness guard.

## 2026-05-21 v1a Node 4 Alignment: Bundle Minimum Contract
- Locked N4-D03 for `topic-selection.v1a.record-search-run.v1`.
- Minimum bundle fields are `schema_version`, `title_card_ref`, concrete `search_plan_ref`, concrete `literature_resource_pool_snapshot_ref`, `expected_literature_snapshot_hash`, run fact fields, accounting summaries, evidence binding records, audit/raw-log payload or ref, policy version, and output schema version.
- SearchPlan and snapshot versions must be asserted only through functional-ref `version_id` values.
- `expected_literature_snapshot_hash` must match the resolved LiteratureResourcePoolSnapshot hash before SearchRun authority creation.
- `succeeded` and `partial` SearchRuns require non-empty `evidence_map_input_refs` before Node 5 handoff can be emitted.
- `failed` SearchRuns may have empty evidence refs but must be non-consumable and emit no Node 5 handoff.
- Raw search logs are audit artifacts only and must never become EvidenceMap authority refs.

## 2026-05-21 v1a Node 4 Alignment: Result Accounting Integrity
- Locked N4-D04 for `topic-selection.v1a.record-search-run.v1`.
- Result accounting validation is an audit-fact integrity check, not a topic-value judgment.
- Counts must be internally consistent: total results cover unique plus duplicate results, unique counts are non-negative, and failed/skipped source counts are non-negative.
- Distinct literature refs in evidence bindings must not exceed `unique_literature_count`.
- `succeeded` runs require `failed_source_count=0` and must include at least one coverage observation or evidence binding when total results are non-zero.
- `partial` runs may include failed or skipped sources only when source health records the partial condition.
- `failed` runs may have no evidence bindings, but source health must include an error/failure summary so the failure is not an empty opaque record.

## 2026-05-21 v1a Node 4 Alignment: Controlled Coverage Semantics
- Locked N4-D05 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 may store controlled lightweight search/coverage semantics for provenance and audit: query provenance, source health, dedup summary, coverage missing reasons/notes, coverage assessment verdicts/issues, and search-coverage risk acceptances.
- Node 4 must not store research-evidence semantics such as evidence role, evidence polarity, evidence strength, NeedCandidate refs, TopicQuestionContract refs, topic value scores, claim support verdicts, or claim-risk acceptance.
- This keeps Node 4 explainable without moving EvidenceMap, NeedCandidate, ValueAssessment, or claim semantics into the SearchRun recording layer.

## 2026-05-21 v1a Node 4 Alignment: Bundle Draft/Review Execution Layer
- Locked N4-D06 for `topic-selection.v1a.record-search-run.v1`.
- Optional LLM/Codex execution may draft or review `TopicSelectionSearchRunRecordBundle@v1` before Node 4 invocation, following the Node 3 SearchPlanBlueprint draft/review pattern.
- Node 4 itself remains deterministic with `execution_mode=none`; model-like output cannot write SearchRun or coverage authorities directly.
- Suggested profiles are `topic-selection.search-run-record-bundle.draft.v1` and `topic-selection.search-run-record-bundle.review.v1`.
- Codex-assisted is the default local low-cost path; provider execution is explicit upgrade/provider-quality only; mocked LLM is test/acceptance-only.
- Automatic provider fallback is disabled, and model failure must not silently create keyword/default coverage semantics.

## 2026-05-21 v1a Node 4 Alignment: Snapshot Membership Boundary
- Locked N4-D07 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 has no retrieval, acquisition, resource-pool refresh, evidence-basket mutation, or LiteratureRecord creation capability.
- A consumable normalized SearchRun may bind only literature refs that belong to the resolved LiteratureResourcePoolSnapshot.
- Snapshot-outside literature refs are blocked by default and must not become `evidence_map_input_refs`, coverage evidence bindings, or Node 5 handoff refs.
- If upstream search execution discovers important new literature, the workflow must route through literature acquisition/resource refresh, evidence basket update, Node 2 snapshot refresh, and any required Node 3 plan update before Node 4 can produce a consumable run.

## 2026-05-21 v1a Node 4 Alignment: Raw Artifact Boundary
- Locked N4-D08 for `topic-selection.v1a.record-search-run.v1`.
- Raw logs/artifacts, Literature/Source refs, and coverage semantic metadata are separate layers.
- Raw logs are audit-only artifacts proving search execution details. They must not enter `evidence_map_input_refs`, coverage evidence binding literature/source refs, or Node 5 handoff authority refs.
- Node 5 evidence authority is snapshot-member Literature refs, legal Source refs, and coverage row lineage. Fulltext/abstract/manual locator refs may be carried only as EvidenceUnit locator provenance.
- `coverage_assessments[].verdict` describes coverage-row retrieval status only and must not be interpreted as evidence strength, topic value, or claim support.
- This prevents raw artifacts from bypassing N4-D05 controlled coverage semantics and N4-D07 snapshot membership.

## 2026-05-21 v1a Node 4 Alignment: Handoff And Loopback Output
- Locked N4-D09 for `topic-selection.v1a.record-search-run.v1`.
- Node 4 result exposes `consumable_for_evidence_map`, `downstream_handoff`, and `loopback_signal`.
- `downstream_handoff` uses `TopicSelectionSearchRunHandoff@v1` and is only for Node 5 `build-evidence-map`.
- `loopback_signal` uses `TopicSelectionSearchRunLoopbackSignal@v1`, is not authority, and is consumed by the orchestrator/control-plane for repair routing.
- Allowed loopback targets are Node 3 SearchPlan revision, Node 2 snapshot refresh, upstream search execution/input preparation, or human search-coverage acceptance.
- In v1, handoff and loopback signal are mutually exclusive: consumable results move forward, repairable non-consumable results route back, and blocked record-contract failures rely on blocker codes plus trace evidence.

## 2026-05-21 v1a Node 4 Readiness Review
- Locked N4-D10 for `topic-selection.v1a.record-search-run.v1`.
- Decision: `implementation_ready`; automation has since moved to `callable` after `runRecordSearchRunScenario` landed in the runtime foundation task.
- Contract drift review found no unresolved product decision gap, but found implementation risks that must be controlled: service-local `RecordSearchRunInput`, route compatibility looseness, generic accepted-risk refs, raw artifact refs, snapshot-outside literature refs, and failed SearchRuns being treated as consumable.
- Complexity is moderate and bounded because no DB migration is expected; existing SearchRun/coverage/control-plane/artifact records are sufficient if handoff and loopback remain node-result/trace contracts rather than new authorities.
- Required implementation order is contracts, service hardening, WorkflowHarness runner, then focused tests.

## 2026-05-21 v1a Node 4 Runtime Landing Note
- Node 4 is now callable through `TopicSelectionWorkflowHarnessService.runRecordSearchRunScenario`.
- The agent policy remains unchanged: Node 4 has no debate, no provider LLM, and no Codex execution inside the node. Optional model-like bundle drafting/review stays upstream of the deterministic node boundary.
- `TopicSelectionSearchRunRecordBundle@v1` remains a normalized value contract mapped into `TopicSelectionSearchResourceService.recordSearchRun`; it is not a second SearchRun product path.
- Failed SearchRuns persist only as audit facts with no Node 5 handoff; consumable SearchRuns emit `TopicSelectionSearchRunHandoff@v1`; repairable non-consumable runs emit `TopicSelectionSearchRunLoopbackSignal@v1`.
- No DB migration was introduced for Node 4. Existing SearchRun, coverage, control-plane, and artifact records carry the authority and audit evidence.
- Compatibility regressions found by the full backend suite were fixed by preserving locator provenance as separate from Literature/Source authority and by updating old failed-run fixtures to legal audit-only SearchRuns.

## 2026-05-21 v1a Node 4 Dual-Track Closure
- Closed the remaining Node 4 dual-track risk where shared bundle schema and route validation were looser than WorkflowHarness/service behavior.
- `TopicSelectionSearchRunRecordBundle@v1`, route validation, WorkflowHarness pre-service validation, and `recordSearchRun` now agree on explicit SearchRun authority refs.
- EvidenceMap input refs are limited to `literature_record`, `literature_source`, and locator-provenance refs; evidence binding literature refs are `literature_record` only; binding source refs are `literature_source` or locator-provenance only.
- Raw search logs stay audit-only through `artifact_ref` or `raw_search_log` refs and cannot become EvidenceMap authority or Node 5 handoff refs.
- Search coverage risk acceptances must cite `accepted_risk` or `search_coverage_risk`; generic coverage refs are rejected.
- The policy meaning is now aligned with the implementation: permissive compatibility cannot silently create a second SearchRun semantic path.

## 2026-05-21 v1a Node 5 Alignment: Single-Agent Semantic Extraction
- Locked N5-D00 for `topic-selection.v1a.build-evidence-map.v1`.
- Node 5 may perform partial semantic extraction because EvidenceMap construction naturally needs source-statement extraction, locator selection, role suggestion, typed-link hints, clustering/pattern hints, and conflict hints.
- Codex-assisted and provider-LLM execution are allowed as single-agent extraction/review layers. `mocked_llm` remains test-only, and `execution_mode=none` remains valid when a caller-supplied extraction draft is available.
- Multi-agent debate is not allowed for Node 5. Debate would add complexity without matching the node purpose; broader exploration belongs to NeedCandidate generation.
- The authority boundary remains deterministic: model-like output is a structured draft/review artifact only, then deterministic validators decide what can enter `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- Model-like execution must not write EvidenceMap, EvidenceUnit, NeedCandidate, value, package, bridge, PaperProject, or claim authority.
- This replaces the older pure-deterministic wording without creating a dual track: there is one EvidenceMap writer and one deterministic materialization gate, with optional single-agent drafting before it.

## 2026-05-21 v1a Node 5 Alignment: Extraction Draft Contract
- Locked N5-D01 for `topic-selection.v1a.build-evidence-map.v1`.
- `TopicSelectionEvidenceMapExtractionDraft@v1` is the module-level EvidenceMap value contract for semantic extraction drafts. It is not a WorkflowHarness-private DTO and not an authority object.
- `TopicSelectionBuildEvidenceMapNodeInput@v1` is the node-level wrapper. It references Node 4 `TopicSelectionSearchRunHandoff@v1`, workflow metadata, execution mode/profile, and the extraction draft.
- Codex-assisted, provider-LLM, mocked-LLM, human, and fixture producers must all emit the same extraction draft shape.
- `execution_mode=none` means a ready extraction draft was already supplied by the caller; it does not create a second service-input path.
- Deterministic validators map accepted draft fields into `CreateEvidenceMapFromSearchRunInput`; `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun` remains the sole EvidenceMap authority writer.
- The draft may be hashed or persisted as audit evidence, but it must not contain hidden reasoning, raw provider responses, raw fulltext dumps, raw search logs as authority refs, or downstream authority ids/verdicts.

## 2026-05-21 v1a Node 5 Alignment: Materialization Status Handling
- Locked N5-D02 for `topic-selection.v1a.build-evidence-map.v1`.
- The deterministic materialization validator is the authority gate between `TopicSelectionEvidenceMapExtractionDraft@v1` and `CreateEvidenceMapFromSearchRunInput`.
- `ready` and `ready_with_warning` may create EvidenceMap authority; `review_required` and `blocked` must not call `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- Warnings are traceable quality or coverage risks, not authority-safety failures. They must be persisted in `EvidenceMapMaterializationReport@v1`, harness trace, and accepted EvidenceUnit issue codes when applicable.
- Blockers are contract, lineage, ref, source-authority, or structural failures. They return a stable blocked result with blocker codes, failed validation layer, rejected draft refs, and repair target.
- `review_required` emits a review package for semantically ambiguous drafts and waits for a revised draft.
- The validator may normalize ordering, deduplicate identical draft structures, and generate stable keys, but must not rewrite roles, invent source statements, swap refs, re-read live resource pools for repair, or downgrade `llm_inference`.

## 2026-05-21 v1a Node 5 Alignment: Extraction Execution Profile
- Locked N5-D03 for `topic-selection.v1a.build-evidence-map.v1`.
- Model-like extraction uses profile `topic-selection.evidence-map-extraction.single-agent.v1`, resolved through the model profile registry. Node 5 must not hard-code provider, model, or normalized parameter choices.
- Default local mode is `codex_assisted`; `provider_llm` is an explicit quality upgrade; `mocked_llm` remains test-only; `execution_mode=none` skips model invocation and requires a caller-supplied extraction draft.
- Model invocation receives only frozen `TopicSelectionEvidenceMapExtractionContextPacket@v1`, compiled before invocation from Node 4 handoff, SearchRun evidence refs/bindings, SearchPlan coverage rows, snapshot refs/hash, selected literature/source locator tables, role targets, and materialization rules.
- The extraction context family is `evidence_extraction_context`; it must not reuse Node 6 exploration/arbiter context, debate transcripts, or NeedCandidate discovery memory.
- Provider/Codex failures may retry the same profile once for transient or malformed-output issues. Automatic provider fallback, Codex fallback, mock fallback, and keyword extraction fallback are forbidden.
- After context packet compilation, model-like execution must not re-read live DB or mutable resource-pool state.

## 2026-05-21 v1a Node 5 Alignment: Cache Reuse And Audit Provenance
- Locked N5-D04 for `topic-selection.v1a.build-evidence-map.v1`.
- Context packet cache is exact-match only and must include node id, SearchRun handoff hash, SearchPlan version, snapshot hash, context compiler version, policy/schema/output versions, execution mode, profile id, and `context_family=evidence_extraction_context`.
- Cached context or response reuse must not cross context families. Node 5 evidence extraction cannot consume Node 6 exploration/arbiter context, debate transcripts, or NeedCandidate discovery memory.
- `codex_assisted` may reuse an exact-match local response for cost control only when provenance records `response_source=cached_exact_invocation`, source attempt ref, context hash match, and `non_provider=true`.
- `provider_llm` quality scenarios require real provider execution; cached response reuse is a miss or policy block and must never be recorded as provider-backed provenance.
- Cached or reused drafts must still pass `EvidenceMapMaterializationReport@v1` validation before any EvidenceMap authority write.
- Audit records context packet hash, profile id, execution mode, cache hit/miss or reuse source, draft hash, materialization report, accepted/rejected counts, role counts, and warning/blocker/review codes; it must not store hidden reasoning, raw provider logs, raw fulltext dumps, or raw search logs as authority.

## 2026-05-21 v1a Node 5 Alignment: Review-Required Revision Loop
- Locked N5-D05 for `topic-selection.v1a.build-evidence-map.v1`.
- `review_required` creates no EvidenceMap authority and is terminal for the current attempt.
- The runner emits `EvidenceMapExtractionReviewPackage@v1` with materialization report ref/hash, context packet ref/hash, draft ref/hash, ambiguous unit keys, review codes, accepted/rejected summaries, required revision actions, allowed revision producers, and policy/schema/profile provenance.
- Human, Codex, and provider revisions must all produce a full `TopicSelectionEvidenceMapExtractionDraft@v1`; patch DTOs, partial-update DTOs, reviewer-only DTOs, and direct service-input patches are forbidden.
- Each revision creates a new `node_attempt_id` and records `revision_of_attempt_ref` plus `review_package_ref`; prior draft, context packet, materialization report, and review package artifacts are append-only.
- The original context packet may be reused only when all upstream refs/hashes and policy/schema/profile fields match exactly. Any upstream change requires context recompilation.
- Automated same-profile retry is limited to one attempt; further revision requires explicit operator-triggered workflow work, preventing an unbounded autonomous loop.

## 2026-05-21 v1a Node 5 Alignment: EvidenceMap Handoff
- Locked N5-D06 for `topic-selection.v1a.build-evidence-map.v1`.
- Node 5 has exactly one downstream workflow handoff in v1: `TopicSelectionEvidenceMapHandoff@v1` to `topic-selection.v1a.generate-need-candidate.v1`.
- The handoff is emitted only for `ready` or `ready_with_warning`; `review_required` and `blocked` emit review/repair routing only and no Node 6 handoff.
- The handoff carries EvidenceMap authority refs, SearchRun/SearchPlan/Snapshot lineage refs, materialization report ref/hash, optional `TopicSelectionNeedValidationEvidenceBundle` read projection ref, role counts, abstract-only count, warning/issue summary, source refs hash, and version provenance.
- Node 6 consumes `evidence_map_ref` and read projections. It must not consume extraction drafts, review packages, raw model output, cache artifacts, or audit artifacts as evidence facts.
- `ready_with_warning` may proceed to Node 6, but warnings and issue summaries become downstream sufficiency constraints rather than strong evidence.
- UI reads, audit reads, verification scripts, review packages, and repair targets are not workflow handoffs and must not bypass Node 6 or v1a gates.

## 2026-05-21 v1a Node 5 Implementation Readiness Review
- Locked N5-D07 for `topic-selection.v1a.build-evidence-map.v1`.
- Implementation readiness is accepted as `implementation_ready`; after this implementation slice, automation callability is `callable` through the normalized `runBuildEvidenceMapScenario` runner and tests.
- The initial implementation can avoid DB migration by storing extraction context, draft, materialization report, review package, and harness trace as non-authority artifacts/control-plane/audit refs.
- EvidenceMap authority continues to flow through `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`; the existing direct API route remains compatibility/manual behavior, not the normalized automated path.
- The locked implementation order is shared contracts/schema, model profile registry, deterministic materialization validator/mapper, context/adapter path, WorkflowHarness runner, and focused tests.

## 2026-05-21 v1a Node 5 WorkflowHarness Implementation
- Landed Node 5 as a single-agent-or-none workflow node, not a debate node.
- Shared draft and handoff contracts now define the automation surface: model-like producers emit `TopicSelectionEvidenceMapExtractionDraft@v1`; deterministic materialization emits `EvidenceMapMaterializationReport@v1`; successful authority creation emits `TopicSelectionEvidenceMapHandoff@v1`.
- The runner supports `execution_mode=none`, `mocked_llm`, `codex_assisted`, and `provider_llm` through the same draft contract.
- `mocked_llm` remains test-only; it can exercise the AgentOrchestrator path without provider calls.
- Node 5 blocks LLM-inference-only source claims before EvidenceMap authority persistence.
- Review-required drafts are routed to a review package and require a full revised draft; patch DTOs and direct EvidenceMap service patches remain disallowed.
- Agent invocation audit refs are now preserved in Node 5 node results and trace output so model-like extraction remains auditable without promoting raw model output to evidence authority.

## 2026-05-21 v1a Node 5 Quality Review Fixes
- Fixed N5 quality review findings without changing the locked workflow policy.
- Materialization-only warnings now survive into the Node 6 handoff as downstream constraints.
- Draft lineage validation now uses full functional refs instead of only `ref_id`.
- Locator provenance refs are prechecked at materialization time so service-level authority validation should not discover known ref drift after a `ready` report.
- Same-source support/challenge review now requires conflict coverage for the specific involved unit keys.

## 2026-05-21 N5 to N6 Handoff Consumption Guard
- Implemented the N5-D06 consumption rule in `WorkflowHarness`: `runGenerateNeedCandidateScenario` may accept `TopicSelectionEvidenceMapHandoff@v1` as transition provenance.
- The runner now validates that the Node 6 EvidenceMap, SearchRun, and LiteratureResourcePoolSnapshot refs match the handoff before context compilation.
- Node 6 business input refs reject EvidenceMap extraction drafts, extraction context packets, review packages, materialization reports, raw provider/model outputs, raw search logs, hidden reasoning, and debate transcripts.
- The guard keeps a single semantic lane: N5 creates EvidenceMap authority plus handoff; N6 consumes authority refs and legal projections, not N5 draft/review/audit internals.

## 2026-05-22 N7/N8 Human Confirmation Boundary
- Locked the N7/N8 split for validation decisions.
- N7 persists `TopicSelectionValidateNeedAdjudicationResultRecord`; `final_decision=validate` is still pending human confirmation and must not create `ValidatedNeed`.
- N8 is the explicit confirmation action that writes `HumanConfirmedDecision` and materializes `TopicSelectionValidatedNeedRecord`.
- `HumanConfirmationInput@v1.actor_mode` may be `human`, `hybrid`, or `human_delegated`. `hybrid` allows a human to review the decision and use Codex to draft auditable rationale/checklist content.
- `human_delegated` allows a human to authorize Codex or a provider LLM to execute confirmation under fixed policy `n8-validate-only-delegation-v1` while the human remains the authorizer and accountability anchor.
- Codex/provider confirmation content must remain reviewed input/provenance or delegated executor output. It cannot satisfy confirmation by itself and cannot bypass explicit human, hybrid, or human_delegated submission.
- Human confirmation is therefore not a manual DB status edit; it is a separate auditable workflow action.

## 2026-05-22 N7-D02 Agent Boundary
- Locked Node 7 as a single-agent recommendation-capable node with no debate.
- Allowed modes are `codex_assisted`, `provider_llm`, and `mocked_llm`; default local mode is `codex_assisted`.
- `provider_llm` is an explicit quality upgrade, and `mocked_llm` remains test/acceptance-only.
- Multi-agent debate remains outside Node 7 because adjudication should converge on routing an already selected candidate rather than reopen discovery.
- Model-like output is recommendation material only and cannot create authority, create `ValidatedNeed`, or satisfy human confirmation.
- `TopicSelectionNeedValidationService.adjudicateNeed` remains the sole adjudication authority writer.

## 2026-05-22 N7-D03 Semantic Content Boundary
- Locked Node 7 semantic content handling to avoid recommendation-to-authority drift.
- Semantic recommendation content is allowed as provenance only, not authority.
- The support packet, readiness assessment, NeedCandidate, and repository-resolved evidence/risk refs are the adjudication semantic SSOT.
- Natural-language rationale can explain a decision but cannot create evidence refs, risk refs, merge targets, or SearchPlan recheck refs.
- Authority fields are whitelist-mapped and ref-grounded only: `final_decision`, `rationale`, `required_actions`, `rejected_reason`, `gap_codes`, `accepted_risk_refs`, `residual_risk_refs`, `merge_target_need_candidate_ref`, and search-plan recheck reason/gap fields.
- Conflicting or unmappable recommendation content must block or require human review instead of being silently normalized into a different adjudication meaning.

## 2026-05-22 N7-D04 Final Decision Semantics
- Locked Node 7 `final_decision` to existing backend values only: `validate`, `return_to_candidate`, `request_searchplan_recheck`, `reject`, `park`, and `merge`.
- `validate` routes to Node 8 human confirmation and does not create `ValidatedNeed` in Node 7.
- `return_to_candidate` means candidate-level repair and requires actionable rationale or `required_actions`.
- `request_searchplan_recheck` means evidence/search coverage repair and requires `searchplan_recheck_reason` or gap codes.
- `reject` means candidate not viable and requires `rejected_reason` or equivalent rationale.
- `park` means preserve as a non-advancing hypothesis and requires park rationale or `required_actions`.
- `merge` requires a same-title-card non-self merge target and must not auto-merge authority content.
- `require_human_review` remains a node status/routing outcome, not an adjudication `final_decision`.

## 2026-05-22 N7-D05 Validate To Human Confirmation Boundary
- Locked `final_decision=validate` as a confirmable adjudication only, not a final validated need.
- Node 7 must reserve `output_validated_need_id` as a stable target id for automation; the reserved id is not `TopicSelectionValidatedNeedRecord` authority.
- After N7 `validate`, the NeedCandidate remains pending confirmation with `decision_status=ready_for_validation` and `review_status=needs_human_review`.
- Node 8 must consume the validate adjudication plus explicit `human`, `hybrid`, or `human_delegated` confirmation before writing `HumanConfirmedDecision` and materializing `ValidatedNeed`.
- Only Node 8 may move the candidate to `decision_status=resulted_in_validated_need`, `review_status=human_confirmed`, and `lifecycle_status=closed`.
- v1b publication must consume Node 8 `ValidatedNeed`; it cannot publish from Node 7 adjudication output.
- Node 7 has no automatic-confirm mode. Codex/provider recommendations can prepare the route to Node 8 but cannot satisfy confirmation.

## 2026-05-22 N7-D06 State Compression Boundary
- Locked state compression for Node 7 to prevent rich candidate statuses from leaking into model prompts or orchestration logic.
- Model-like recommendation packets can output only `final_decision` and whitelist authority inputs. They cannot output `decision_status`, `review_status`, `lifecycle_status`, `freshness_status`, `loopback_target`, `result_validated_need_id`, or `open_recheck_request_refs`.
- WorkflowHarness maps `final_decision` to a small `route_outcome` enum for automation: `advance_to_human_confirmation`, `repair_need_candidate`, `repair_search_plan`, `stop_rejected`, `hold_candidate`, `stop_merged`, `blocked`, or `require_human_review`.
- Automated callers should branch on `route_outcome`, not on the full DB state tuple.
- Candidate persistence status is deterministic derived state owned by `TopicSelectionNeedValidationService`.
- `park` remains `hypothesis`/hold instead of closed terminal state; `validate` remains a Node 8 handoff instead of approval.
- This avoids a dual-track risk where LLMs, scripts, harnesses, and domain services each interpret candidate statuses independently.

## 2026-05-22 N7-D07 Recommendation To Authority Gate
- Locked how adjudication recommendation packets become persisted authority.
- Model-like recommendation packets are never authority by themselves. The runner is the only conversion gate and must validate before calling `TopicSelectionNeedValidationService.adjudicateNeed`.
- Human or hybrid adjudication packets may persist all six final decisions after validation.
- Fixture human decisions may do the same only in test/acceptance paths with explicit provenance.
- Codex/provider recommendations may persist only low-risk decisions without extra human acceptance: `validate`, `request_searchplan_recheck`, and `return_to_candidate`.
- Low-risk does not mean unconstrained: `validate` still waits for Node 8, recheck is a typed request only, and return-to-candidate requires actionable repair actions.
- Codex/provider recommendations for `reject`, `merge`, and `park` require human or hybrid acceptance. Without it, the runner returns `require_human_review` and creates no adjudication authority.
- Mocked LLM remains test/acceptance-only and cannot be treated as product authority.

## 2026-05-22 N7-D08 Readiness Support Packet Freeze Boundary
- Locked the N7 internal sequence as readiness assessment, validation support packet, recommendation gate, and adjudication.
- Readiness/support packet creation remains in existing domain services. The runner orchestrates and validates; it does not become a new persistence or reasoning authority.
- Default packet mode is fresh append-only creation. Existing readiness/support packets require explicit refs; auto-selecting the latest packet is forbidden.
- Explicit refs must match candidate, title-card scope, lineage, policy/schema expectations, and freshness before use.
- Non-ready readiness recommendations block before support/adjudication authority creation. The runner may return repair hints, but it must not turn readiness gate findings into adjudication decisions.
- Readiness `reject` is only a gate finding. Persisted reject adjudication still requires human/hybrid acceptance under D07.
- The support packet is the frozen evidence/risk/human-check boundary for recommendation and adjudication. After freeze, model-like recommendations and adjudication must not re-read live upstream evidence/search/resource state as business truth.
- Upstream changes require a new readiness/support packet instead of in-place ref repair.

## 2026-05-22 N7-D09 Recommendation Packet And Automation Handoff
- Locked the split between model recommendation and automation handoff.
- `TopicSelectionNeedAdjudicationRecommendationPacket@v1` is artifact/provenance only. It cannot be consumed directly by downstream automation and cannot contain orchestration commands.
- Recommendation input is compiled from frozen support packet/readiness/candidate/sibling summaries only. No live upstream evidence/search/resource reads are allowed after support packet freeze.
- Recommendation output is limited to adjudication whitelist fields and must not include `route_outcome`, `next_node_id`, `repair_target`, DB statuses, authority ids to create, or direct workflow commands.
- Profile `topic-selection.need-adjudication.single-agent.v1` owns model invocation. Default mode is `codex_assisted`; provider is explicit quality upgrade; mocked is test/acceptance-only; schema output is required and fallback is disabled.
- `TopicSelectionValidateNeedAdjudicationNodeResult@v1` is the downstream automation contract. It carries `status`, `route_outcome`, refs, reserved `validated_need` target ref for `validate`, next node or repair target, blockers/warnings, required actions, risk refs, recheck/merge refs, recommendation packet ref, and harness trace.
- Automated flows branch only on the runner-derived node result, keeping LLM output out of the orchestration role.

## 2026-05-22 N7-D10 Retry Idempotency And Duplicate Adjudication
- Locked attempt identity and duplicate protection for automated N7 execution.
- Every runner call requires `workflow_run_id` and `node_attempt_id`; node result, recommendation packet, readiness/support refs, adjudication refs, and harness trace bind to that attempt.
- Reusing `node_attempt_id` means exact replay. It returns the existing node result only when input hash, node result, and trace match; it never writes authority.
- Replay drift or missing replay evidence blocks.
- New attempts before adjudication remain append-only. They may create fresh readiness/support packets but cannot reuse prior packets implicitly.
- After an adjudication exists, second adjudication creation is forbidden. The runner returns a blocked duplicate result with existing refs when available.
- Model retry is same-profile technical retry only, at most once before authority write. Automatic provider/Codex/mock fallback remains disabled.
- Partial readiness/support artifacts created before a later blocked result remain audit facts and must be referenced instead of rolled back or silently reused.

## 2026-05-22 N7-D11 Node Result Status Taxonomy
- Locked Node 7 status vocabulary to `ready`, `blocked`, and `require_human_review`.
- `ready` is the only auto-consumable status and carries a non-blocked route outcome.
- `blocked` carries blocker codes, repair hints, and existing refs where available; duplicate/pending adjudication uses this status instead of a new duplicate status.
- `require_human_review` is reserved for cases that need human/hybrid acceptance before materialization or advancement.
- Warnings, replay, duplicate handling, and route-specific outcomes are represented by `warning_codes`, `replay_provenance`, blocker codes, refs, and `route_outcome`, not by expanding status values.
- `validate` awaiting Node 8 is a ready handoff, not `require_human_review`; Node 8 remains responsible for actual human confirmation.

## 2026-05-22 N7-D12 Implementation Readiness Review
- Accepted Node 7 implementation readiness; after the harness runner landed, WorkflowHarness automation callability is `callable`.
- Current code already provides the domain authority spine: readiness assessment, validation support packet, adjudication, human confirmation, and v1b publication routes/services.
- Current code also provides duplicate adjudication protection, AgentOrchestrator, model profile registry, and WorkflowHarness trace artifact patterns.
- The harness implementation now includes shared recommendation/node-result contracts, `topic-selection.need-adjudication.single-agent.v1`, a `needValidation` harness dependency, runner orchestration, D08-D11 validators, and replay/duplicate lookup behavior.
- No DB migration is expected for the first implementation if node result and recommendation packet remain artifact/control-plane scoped.
- If replay requires a new durable node-result index, stop and use DB SSOT rather than adding ad hoc storage.
- The D12 test matrix passed for the harness runner; product route exposure remains separate from policy callability.

## 2026-05-22 N7-D12 Risk Amendments
- AM01 closes the readiness enum gap. The implementation must cover every shared readiness recommendation, including `merge_required` and `park`; all non-ready values block before support/adjudication and remain gate findings rather than adjudication decisions.
- AM02 closes the direct-route bypass risk. Support-packet lineage must be checked in WorkflowHarness and in `TopicSelectionNeedValidationService.adjudicateNeed`, covering candidate, readiness, evidence map, search run, search plan, literature snapshot, and policy/schema refs.
- AM03 closes the replay ambiguity risk. Exact replay depends on recoverable node result, trace, and input hash by `workflow_run_id + node_attempt_id`; if the current persistence/artifact layer cannot provide that, use DB SSOT before the runner becomes callable.

## 2026-05-22 N7 Runner Implementation Consumed By Policy
- T-088 implemented `runValidateNeedAdjudicationScenario` for `topic-selection.v1a.validate-need-adjudication.v1`.
- The implementation matches the T-089 policy split: Node 7 remains single-agent, not debate-eligible; recommendation packets are provenance artifacts; `TopicSelectionValidateNeedAdjudicationNodeResult@v1` is the only downstream automation handoff.
- The runner enforces the D07 high-risk gate, D08 frozen support-packet boundary, D09 recommendation/handoff split, D10 exact replay and duplicate protection, and D11 status taxonomy.
- Support-packet lineage validation now exists both in WorkflowHarness and in `TopicSelectionNeedValidationService.adjudicateNeed`, closing the direct-route compatibility bypass risk.
- No `NeedCandidateSet`, alternate adjudication writer, raw reasoning handoff, automatic fallback, direct ValidatedNeed creation, or SearchPlan mutation path was added.
- Node 7 policy can now mark WorkflowHarness automation callability as `callable`; product route exposure for a generic node runner remains separate from the semantic node policy.

## 2026-05-22 N7 Quality Review Hardening
- The runner now rejects recommendation packets whose `profile_id`, `policy_version`, or `output_schema_version` drift from the runner input, closing a policy-identity compatibility lane.
- Exact replay still performs no authority writes, but current scenario assertions are recalculated from the replayed node result so test expectations cannot silently reuse a stale pass.
- Added harness tests for these two review findings.

## 2026-05-22 N8-D01 Reserved ValidatedNeed Id
- Locked `output_validated_need_id` as a reserved target id produced by N7 validate adjudication and consumed by N8 human confirmation.
- The reserved id supports robust automation, replay, and duplicate detection; it is not proof that a `TopicSelectionValidatedNeedRecord` exists.
- N8 must materialize `TopicSelectionValidatedNeedRecord` with the reserved id and must not mint a different `validated_need_id`.
- Missing reserved id blocks N8. Existing materialized `ValidatedNeed` for that id is handled as duplicate/idempotency territory, never as a second creation path.
- Code sync: N7 node results expose `reserved_validated_need_ref` in the runner handoff while keeping `TopicSelectionValidatedNeedRecord` creation exclusively in N8.

## 2026-05-22 N8-D02 Materialization Authority Boundary
- Tightened N8 wording from "create id" to "materialize reserved id" to avoid dual authority paths.
- N7 owns id reservation through `TopicSelectionValidateNeedAdjudicationResultRecord.output_validated_need_id`; N8 owns only `TopicSelectionValidatedNeedRecord` persistence with that exact id.
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
- Implemented `PublishV1bInputBundleNodeInput@v1` and `TopicSelectionPublishV1bInputBundleNodeResult@v1` in shared research-lifecycle contracts with schema tests.
- Implemented `runPublishV1bInputBundleScenario` with explicit handoff refs, deterministic lineage validation, exact replay, expected-version idempotency, trace artifact, and terminal result without `next_node_id`.
- Added minimal service guard so bundle publication requires coherent ValidatedNeed/source/support/adjudication lineage and a `confirm` HumanConfirmedDecision.
- Preserved the existing public route/service input shape and avoided a second bundle persistence path.
- N9 is now callable in WorkflowHarness and remains deterministic: no AgentOrchestrator, Codex, provider LLM, semantic parser, or debate runtime.

## 2026-05-24 N6 Exact Replay Hardening
- Implemented N6 `generate-need-candidate` exact replay using `workflow_run_id + node_attempt_id + input_hash`.
- The discovery trace now stores the replay snapshot needed for automation: `payload_schema`, `input_hash`, `node_input`, `compiled_context`, `adapter_result`, assertions, artifact refs, and authority refs.
- Matching replay returns the stored adapter result with `replay_provenance` and does not recompile context, call Codex/provider/debate, or write authority.
- Same attempt with input hash drift fails with `VERSION_CONFLICT` before context compilation or model-like invocation.
- `.ai/scripts/topic-selection-real-e2e.mjs` now passes `controlPlane` into `TopicSelectionWorkflowHarnessService` so durable real-flow runs can use the same replay lookup path.

## 2026-05-24 v1a Replay Boundary Review
- Added a v1a replay/idempotency matrix to prevent automation from treating all callable nodes as exact-replay capable.
- N1-N5 remain deterministic or append-only authority materialization nodes with hash, lineage, version, and blocked-result guards; automated retries should use fresh `node_attempt_id` values unless a future policy and code slice adds durable replay lookup.
- N6-N9 are the current exact-replay nodes. They use `workflow_run_id + node_attempt_id + input_hash` and block input drift before model invocation or authority writes.
- Full-chain E2E replay must account for this split: same-run replay can be asserted at N6-N9, while N1-N5 are currently verified through deterministic outputs, append-only audit trails, and explicit lineage/currentness checks.

## 2026-05-24 N6-N9 Real-DB Replay Smoke
- Added `TOPIC_SELECTION_V1A_HARNESS_REPLAY_SMOKE=1` support to `.ai/scripts/topic-selection-v1a-harness-e2e.mjs`.
- Added package script `pnpm topic-selection:v1a-harness-replay-smoke`.
- The replay smoke reuses the normal v1a harness path, then replays N6-N9 with the same `workflow_run_id + node_attempt_id + input_hash`.
- Exact replay asserts replay provenance, stable persisted refs, no authority count changes, no artifact count changes, and no harness LLM gateway calls.
- Input-hash drift mutates `policy_version` for N6-N9 and asserts `REPLAY_INPUT_HASH_MISMATCH`, unchanged authority counts, and no model invocation.
- Scenario registry naming was clarified: current full-chain harness evidence is `real_db_harness_smoke`; N6-N9 replay evidence is `real_db_replay_smoke`; true provider quality evidence remains `real_provider_canary`.

## 2026-05-24 Real Provider Canary Classification
- Updated `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` so any run using provider-backed N6/N7 or provider-backed debate slots reports `scenario_type=real_provider_canary`.
- Provider canary default scenario id is now `topic-selection.provider-stability.v1` when provider-backed harness nodes are enabled and no explicit scenario id is supplied.
- The first migrated provider canary scope is v1a only: `generate-need-candidate` and `validate-need-adjudication`; v1b/v1c provider nodes remain planned coverage.

## 2026-05-24 v1a Output Quality Closure
- Implemented N6 role-aware admission gates without changing `NeedCandidate` authority schema or adding DB migration.
- `support/challenge/baseline/context_unit_refs` now reject non-`evidence_unit` refs and reject evidence units placed under a mismatched EvidenceMap role.
- `evidence_strength_assessment` refs remain valid only in `strength_assessment_refs`; `evidence_conflict/evidence_conflict_set` refs remain valid only in `conflict_refs`.
- Invalid role bundles use deterministic failure semantics: supplemental round when budget remains; otherwise `reject_artifact_only`; no backend auto-rewrite or silent cleaning.
- Added method-family coverage digest plumbing from harness sample context into N6 admission. If a candidate mentions an uncovered family such as `fine_tuning` or `hybrid_adaptation`, admission emits `METHOD_FAMILY_COVERAGE_GAP` while still allowing otherwise grounded candidates.
- Persisted `NeedCandidate` records keep rank out of authority data. Rank is recorded in `candidate_pool_projection_entries` with `{need_candidate_ref, draft_id, rank, normalized_candidate_key}` and included in the projection hash.
- N7 support packets now default residual risks from accepted risks, challenge evidence refs, and conflict refs unless the caller explicitly supplies a stricter residual-risk set.
- N7 validate recommendations are blocked with `RESIDUAL_RISK_DROPPED` if they drop support-packet residual risks; validate with residual risk emits `VALIDATE_WITH_RESIDUAL_RISK`.
- N7 validates with `METHOD_FAMILY_COVERAGE_GAP` only when required actions carry the gap forward; clean validate with a method-family gap is blocked.
- Polished real/harness EvidenceMap statement generation: duplicated title prefixes are stripped from digest text, snippets prefer sentence boundaries, and normalized statements use the same cleaned source text.

## 2026-05-24 v1a Full-Flow Quality Matrix And N4-N5 Role Closure
- Added `09-v1a-quality-matrix.md` to track v1a node quality closure separately from automation callability.
- Tightened the N4->N5 contract by adding `coverage_role_expectations` to `TopicSelectionSearchRunHandoff@v1`; the values are derived from resolved SearchPlan `CoverageRowIntent.expected_evidence_role`, not newly inferred by Node 4.
- Updated N5 EvidenceMap materialization so any draft unit with a `coverage_row_intent_ref` must match the handoff's expected evidence role, otherwise the node blocks with `COVERAGE_ROW_ROLE_MISMATCH` before EvidenceMap authority writes.
- Included `coverage_role_expectations` in the SearchRun handoff input refs hash so stale extraction drafts cannot replay across role-expectation changes.
- Updated the N5 extraction prompt constraint to tell model-like producers that cited coverage rows and drafted evidence roles must match, while keeping deterministic materialization as the authority gate.
- Updated the v1a harness E2E N7 fixture so mocked validate recommendations carry support-packet `open_gap_codes` such as `METHOD_FAMILY_COVERAGE_GAP` into `gap_codes` and `required_actions`, matching the current N7 carry-forward gate.

## 2026-05-24 N3-N6 Method-Family Target Closure
- Promoted `method_family_targets` into `TopicSelectionSearchPlanBlueprint@v1` so method-family coverage expectations are owned by SearchPlan, not by N6 heuristics.
- Stored normalized method targets in the existing SearchPlan `coverage_strategy` JSON field; no DB migration or authority-schema fork was required.
- Added `getSearchPlanById` to the search-resource service so the WorkflowHarness can resolve SearchPlan method targets through the service boundary instead of reading repository internals.
- Propagated method targets through `TopicSelectionSearchRunHandoff@v1` and `TopicSelectionEvidenceMapHandoff@v1`; EvidenceMap handoff hashing now includes the target set.
- Updated N6 candidate admission and the generate adapter so `METHOD_FAMILY_COVERAGE_GAP` compares candidate-mentioned method families against the SearchPlan target set when available, while preserving the old resource-sample fallback only for compatibility.
- Updated the real/harness E2E script to seed topic-level method targets, assert N4 handoff preservation by normalized set comparison, and compile the targets into both resource-sample and search-coverage digests for N6.

## 2026-05-24 N5 Provider-Backed Evidence Extraction Canary
- Extended `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` with `TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=none|mocked_llm|codex_assisted|provider_llm`.
- The default remains `none`, preserving existing deterministic fixture behavior; model-like modes still enter only through `runBuildEvidenceMapScenario` and `TopicSelectionEvidenceMapExtractionDraft@v1`.
- Added a frozen `TopicSelectionEvidenceMapExtractionContextPacket@v1` builder for the harness script, carrying source candidates, exact refs, coverage-role expectations, method targets, and materialization rules.
- Added mocked/codex/provider N5 invocation wiring without adding a second EvidenceMap persistence path. EvidenceMap authority writes still go through `TopicSelectionEvidenceMapMaterializationService` and `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`.
- Added provider-mode unit coverage proving N5 provider output is sent through the same materialization gate and that provider request schemas do not contain strict-unsupported `properties: { field: false }` entries.
- Added a provider-compatible schema projection in `TopicSelectionAgentOrchestratorService` that removes `false` property schemas only for provider requests. Local Ajv validation still uses the original schema, so forbidden output fields remain blocked.
- Real provider canary now verifies a single N5 provider call can produce four source-claim EvidenceUnits and continue the automated N1->N9 flow with N6/N7 mocked.

## 2026-05-24 Unified LLM Execution Object
- Locked `TopicSelectionAgentExecutionSpec` as the shared execution object for all model-like topic-selection nodes: `execution_mode` plus optional provider-bound `model_option_id`.
- Single-agent nodes consume the same spec through `TopicSelectionAgentOrchestratorService.execution_spec`; mismatches against legacy top-level fields block with `INVALID_PAYLOAD`.
- Multi-agent debate now consumes `execution_plan` with `default`, `slots`, and repeatable-slot `instances`, so the same role can run multiple provider/Codex instances without inventing role-specific provider lists.
- Instance keys use `<slot_id>#<agent_instance_id>`, for example `explorer.round_1_discovery#explorer_2`; single-instance arbiter slots should use slot-level specs.
- Legacy `slot_execution_overrides` / `slot_model_option_overrides` remain only for compatibility and cannot be mixed with `execution_plan`.
- Provider mapping is centralized in `BackendLlmGateway`: OpenAI maps normalized `reasoning_depth` to `reasoning.effort`; DashScope maps it to `extra_body.enable_thinking`.
- Added explicit `gpt-5.5` model options (`openai-quality`, `openai-deep-reasoning`) while keeping provider selection explicit; current OpenAI defaults use high reasoning.
- N5, N6 single-agent, N7, and N8 model-like WorkflowHarness call sites now pass canonical `execution_spec`; N6 multi-agent passes `debate_execution_plan`. `none` and `deterministic_parser` paths reject provider model options instead of silently ignoring them.

## 2026-05-25 SO-01 Invocation Slot Override Boundary
- Locked `DMP-11` as the unified slot-level override rule for all model-like topic-selection calls.
- Every LLM/Codex/mock participation point is now an invocation slot. Single-agent nodes use one `execution_spec`; debate uses `execution_plan.default`, `execution_plan.slots`, and repeatable-worker `execution_plan.instances`.
- General precedence is `instance > slot > node/call-site > scenario default > profile default`.
- `model_option_id` remains legal only when the effective mode is `provider_llm`; deterministic-only paths must block any execution spec or provider option instead of ignoring it.
- Provider failure remains blocked, not automatic provider switch, Codex substitution, mock substitution, or cached non-provider reuse.
- Repeatable instance overrides are limited to debate worker slots whose instance policy permits multiple instances. Arbiter slots and ordinary single-agent nodes use slot/node-level override only.
- Current v1a implementation already follows this shape for N5, N6 single-agent, N6 debate, N7, and N8. The next alignment step is to update the invocation slot map so matrix/policy docs do not imply N5 is pure deterministic when its implemented authority node includes an optional semantic extraction slot.

## 2026-05-25 SO-02 Invocation Slot Map
- Locked the first cross-node invocation slot map in `06-workflow-matrix.md`.
- Corrected the N5 matrix row from pure `deterministic/none` to `single_agent_semantic_extraction + deterministic_gate`, matching the implemented `evidence_extraction` slot and the existing deterministic EvidenceMap materialization boundary.
- Current implemented v1a model-like slots are:
  - N5 `evidence_extraction`;
  - N6 `need_candidate_generation`;
  - N6 debate `explorer.round_1_discovery`, `deep_critic.round_1_discovery`, `arbiter.issue_framing`, and `arbiter.final_synthesis`;
  - N7 `adjudication_recommendation`;
  - N8 `confirmation_semantic_review`.
- Resource sampling classification remains policy-ready and provider/Codex capable, with debate conditional on its node policy.
- v1b/v1c model-like slots are reserved as planned semantics only until their runtime normalization slices land; the slot map must not be read as implementation-complete for those stages.
- This change is documentation alignment only. No runtime path, provider mapping, DB schema, or authority writer changed.

## 2026-05-25 SO-03 Slot Execution Profiles
- Locked `DMP-12` as the named slot execution profile policy for v1a debate and model-like defaults.
- Removed ambiguous defaults: no `A or B` defaults and no unresolved `scenario-defined` selection. Debate runs must resolve to a named profile before invocation.
- Single-agent defaults are N5 `evidence_extraction=none`, N6 single-agent generation `codex_assisted`, N7 recommendation `codex_assisted`, and N8 semantic review `codex_assisted`.
- Product-quality timeout targets are longer than current smoke values: OpenAI quality 300s, OpenAI deep reasoning 450s, DashScope thinking 300s, DeepSeek V4 thinking 450s, and deep final synthesis 450s. Current code may still carry older timeout values until a follow-up implementation sync.
- Codex is allowed and encouraged as explorer, deep critic, issue framing, N5 extraction, N7 recommendation, and N8 semantic review because it is strong at project-aware and policy-aware critique.
- Codex robustness boundary: frozen context by default, no live DB/repo/harness-state reads during invocation unless recorded as `codex_context_augmented=true`, no direct authority writes, and no provider-quality final synthesis.
- `mixed-cost-control` profile: Codex explorer, Codex deep critic, Codex issue framing, and OpenAI `openai-quality` final synthesis.
- `provider-diverse-deep` profile: Codex explorer, OpenAI quality explorer, DashScope thinking explorer, OpenAI deep-reasoning deep critic, Codex deep critic, Codex issue framing, and OpenAI deep-reasoning final synthesis.
- DeepSeek V4 thinking remains available as optional manual explorer/deep-critic contrast or `deep_critic_3`, but it is not the default deep-critic anchor; OpenAI remains the provider-backed deep-critic anchor for provider-quality debate.
- DashScope thinking canonical option name is `dashscope-thinking-budget`; compatibility id `dashscope-budget` remains only as a thinking-enabled legacy alias.
- Superseded by the implementation sync below: timeout updates, DashScope option rename/alias handling, and named profile materialization are now implemented.

## 2026-05-25 SO-03 Implementation Sync
- Updated the v1a model profile registry product-quality timeouts: standard OpenAI `openai-balanced=180000`, OpenAI `openai-quality=300000`, OpenAI `openai-deep-reasoning=450000`, DashScope thinking `300000`, and DeepSeek V4 thinking `450000`.
- Added canonical DashScope thinking option id `<profile_id>.dashscope-thinking-budget`; retained `<profile_id>.dashscope-budget` only as a legacy thinking-enabled alias.
- Materialized v1a harness debate profiles:
  - `mixed-cost-control`: Codex explorer, Codex deep critic, Codex issue framing, and OpenAI `openai-quality` final synthesis.
  - `provider-diverse-deep`: Codex/OpenAI/DashScope explorer instances, OpenAI/Codex deep critic instances, Codex issue framing, and OpenAI `openai-deep-reasoning` final synthesis.
- Harness named profiles reject legacy per-slot env overrides to avoid dual-track configuration semantics.
- Fixed instance-level execution resolution so a Codex instance under a provider-backed slot does not inherit the slot provider `model_option_id`; explicit model options on non-provider instances remain invalid.

## 2026-07-05 结构化硬化切片 ②→①→③（承 T-128 W-08 移交 backlog；用户拍板 A→B 连做）
- **切片顺序依据**：① 依赖 ②（矩阵自述语义列"非契约可导出"故未校验——先有导出才能校验）；③ 依赖 T-088 D-28（2026-07-05 拍板：新脚本必登记 scenario，机器校验由本切片实现）。
- **②（v1c NODE_POLICIES 导出）**：新 shared 文件 `topic-selection-v1c-node-policy-contracts.ts`——v1c 无 harness/run-coordinator（D-T128-00 勘定），故不同于 v1a/v1b 的运行时 policy 再导出，本文件是**语义分类**的结构化权威（8 列：executor_kind / default_execution_mode / codex_allowed / provider_required / debate_allowed / debate_primitive / human_review_required / human_delegated_allowed）；值从 W-08 已核矩阵行反推 + 与 v1c 运行时服务对照（N2 bounded micro-debate 已实现、N4 human-native、N6 feedback normalization codex 候选）。附 JSON-Schema（沿 Fastify/AJV 惯例）+ schema test（注册表与 `TOPIC_SELECTION_V1C_NODE_IDS` 全序相等、debate_allowed⟺primitive≠none、human_review_required→human_review executor 等不变量）。barrel 导出补 `index.ts`。
- **①（语义列接入一致性脚本）**：`.ai/scripts/topic-selection-workflow-matrix-consistency.mjs` 扩展——v1c/downstream 全 8 语义列与 ② 导出精确比对（行首 token 语义：括号注解不参与；布尔列 yes/no 前缀，`conditional`/`reserved` fail-closed 报 unparseable）；v1b 三项：executor_kind（`execution_kind` 映射 deterministic/delegated→同名、model_like→single_agent）、human_delegated_allowed（节点∪槽位 `allowed_execution_modes` 含 `human_delegated`——N2/N5/N7 yes 与契约一致）、default_execution_mode（`none` 或 ∈ 节点∪槽位 modes）。**v1a 与 resource_sampling 行显式不校验**（无结构化导出源，若补 v1a 导出需动 v1a harness contracts——留 backlog ①尾巴，不在本切片扩 harness 契约面）。
- **结构守卫（意外真缺陷）**：新增"行格数=表头格数"检查 `row_cell_shape_mismatch`。接入 covered_scenarios 解析时暴露**矩阵 v1c N2 行缺 `deterministic_validators` 一格**（17/18），致其后列静默左移、covered_scenarios 落入 artifact_refs 位——旧校验只读前几列从未暴露。已补缺格（`support schema validation; bounded micro-debate deterministic admission`，与 N2 微辩论确定性 admission 现实一致）；全表扫描确认仅此一处短行。
- **③（covered_scenarios 机器校验 + D-28 脚本登记）**：双向集合相等语义——矩阵引用的 scenario 必须已注册、注册的必须被矩阵引用、每 scenario 的矩阵行集合 == 注册表 `covered_nodes`、covered_nodes ∈ 契约已知 node id 并集；每个 `.ai/scripts/topic-selection-*.mjs` 文件名必须出现在 `08-scenarios.md`。**前置内容对齐**（本包 owner 资产首次追上 T-123 Phase 0 的命名迁移）：canary/scale-quality/non-advance/provider-stability 的 covered_nodes 从 v1b 旧 8 节点命名重写为现行 11 节点（集合=矩阵列反推：canary/scale-quality 27 节点、non-advance 18、provider-stability 8 含补上的 v1a build-evidence-map）、downstream 场景 v1c N6 改现行 id；**新增注册条目** `topic-selection.debate.v1b-n6-topic-candidates.v1`（矩阵 N6 行已引用而注册表缺失——T-127 W-07 runtime 已实现，status 记 `runtime_implemented_prompts_gated`，prompt 正文/provider 开启分属 T-129 C-2/C-3）；**矩阵侧补引**：v1a N6..N9 行补 `replay-idempotency.real-db-smoke`（真实覆盖，runner 在案）、v1b N8 行补 `debate.v1b-value-tension`（bounded_sequence 已实现）；文末增 **Script Registration Map**（18 脚本全登记，含 checker 自身）。
- **归档提示**：一致性脚本以路径常量读本包 `08-scenarios.md`——本包归档时须同步路径或将注册表迁 `docs/context`（已记 00 backlog ③ 注）。
- **矩阵 Machine-Check Contract 段**同步改写：校验表新增 9 项说明（v1b 语义三项 / v1c 全列 / covered_scenarios / 脚本登记 / 行形状 / stage 词汇 / 抽取完备性）、解析约定（行首 token / 反引号 scenario id / fail-closed 词汇）、"仍未自动校验"按列精确清单取代原"产品决策列不做自动校验"表述。
- **JD 判定**：本切片零 harness 本体/bounded-debate-core/orchestrator 边界改动（纯 shared 新契约 + 脚本 + 文档），按 D-T128-00 口径无需新 JD;D-28 已在 T-088 06 预登记本切片的 ③ 义务。

## 2026-07-05 切片对抗式复审（13 代理：4 维审查 + 逐发现对抗式反驳）
- **确认并当轮修复 4 项**（1 major + 3 minor）：
  1. **[major] v1b policy 抽取静默跳过**——正则抽不到（如 `allowed_execution_modes` 常量化重构）时节点整个掉出映射，其行 4 项 v1b 语义校验全部空转，真跑与自测双绿假象（复审代理经可执行注入实证）。修复：v1b 抽取完备性断言（`v1b_policy_extraction_incomplete`，对照 `v1bNodes` 全集）+ 未映射 `execution_kind` 显式报 `v1b_execution_kind_unmapped`（原 `if (expectedExecutor)` 静默跳过）。
  2. **[minor] 未知 stage 行对全部 id-set 检查不可见**（新 stage 表/stage 笔误且代码无对应节点的行静默通过）。修复：`unknown_stage` 守卫（stage 必须 ∈ 五个已知值）。
  3. **[minor] v1c/downstream policy 条目缺失时独立跑脚本静默通过**（仅 shared schema test 兜底；`checkSemanticColumns` 注释归因错误）。修复：脚本内 `v1c_policy_missing`/`downstream_policy_missing` 完备性检查 + 注释修正。
  4. **[minor] 矩阵"仍未自动校验"清单漏 v1b 四个未校验列**（provider_required/debate_allowed/debate_primitive/human_review_required），且 conditional/reserved 表述按行不按列。修复：按列精确清单。
- **自测负例 17→21**：新增 unknown-stage / v1b 常量化重构抽取失效 / 未映射 execution_kind / v1c policy 缺失四例（自测框架为此支持 `sources` 注入）。
- **反驳留档 5 项**（不改）：parseYesNo 前缀匹配质疑、脚本登记子串匹配质疑、N2 双面 default 质疑、N4 delegated 语义质疑、Machine-Check 行数计数质疑。
- **registry-content 维度首轮 API 断连未出结果，已单独补跑**——**零发现**：11 场景注册表↔矩阵双向一致（含语义抽查：canary 达 downstream intake、replay 恰 N6..N9、provider-stability 含 v1a build-evidence-map）；所有 covered_nodes id 在契约在案；新 N6 debate 条目各声明逐项核实（W-07 实现+日期、loop id `v1b_n6_divergent_candidate_debate` 契约 :607、W-14 dormancy 常量 :790 `dormant:true`、T-129 C-2/C-3 归属）。

## 2026-07-06 backlog ④ 穷举 dormant/边缘复核 + ⑤ supplemental 裁决落地
- **④ 方法与结果**：多代理工作流（三视角清单→24 规范面/22 簇→四面一致性复核→逐发现对抗式反驳；中途撞 Fable 用量上限,Review/Verify 阶段以 sonnet 档 resume,Inventory/Merge 走缓存）。18 簇 coherent;**4 项确认全部当轮修复**——F1 downstream feedback 注册表条目状态停留未建成态(status/modes/note 已对齐实装现实)、F2 矩阵 v1a N6 "supplemental repair" 表述过强(随 D-29 落地按实况改写)、F3 v1b value-tension 注册表 status 三方错位中最陈旧(→`runtime_implemented_prompts_gated`+note;Notes 措辞经反驳判准确不动)、F4 矩阵 N4 行 multi-instance 采样能力断言无佐证(删断言留理由);**1 项复核中直接顺迁**——Slot Map resource_classification 行 stale escalation 陈述按 D-27 退役(矩阵 Change Log 2026-07-06 + 07-node-policies 同步标注);**5 项反驳留档**。全记录 `13-dormant-edge-review.md`。D8 全程未破。
- **⑤ 裁决与实现**：用户拍板 2026-07-06 **建有界自动重入**（对比"锁定调用方驱动"后选定）。JD **D-29** 先行登记（T-088 06,承 D-22,含设计/不改动/验证承诺）;实现=harness 加法式 `runGenerateNeedCandidateSupplementalChain`:循环调用单轮 scenario,仅 `run_supplemental_round` 续跑,`max_total_rounds` 默认/硬上限 3(与 routing service `MAX_ROUND_INDEX` 双守卫),轮间线程化 `current_round_index+1`/`remaining_round_budget-1`/attempt id 派生 `${base}__rN`,expectations 仅作用首轮(派生轮剥离,防首轮断言误伤后轮),execution 语义跨轮不可变(承 D-05/D-27),默认零接线、无新持久化面、单轮方法 byte-identical。**实现细节备忘**:validator 强制 `draft_batch.node_attempt_id===输入 attempt id`(validator-service :81)→ 链式测试用 provider 模式 + StubLlmGateway 函数式输出按轮出批;routing service 先于链耗尽预算并转 terminal 路由,故链自身 `round_budget_exhausted` 为防御分支。4 单测:两轮续跑至 finalize / 硬上限 3(attempt id 序列钉)/ terminal 立即停 / caller max=2 低帽。harness 单测文件 **111/111**、backend tsc 0、矩阵一致性绿。

## 2026-07-06 ①尾巴收口 + 整包 done
- **①尾巴（v1a/resource-sampling 语义列导出与接入）**：采 v1c 同款「语义分类独立文件」路线——新 shared `topic-selection-node-semantic-policy-contracts.ts`，**不动 v1a harness contracts**（其 NODE_POLICIES 为运行时 policy，schema additionalProperties:false，扩字段涉 harness 契约面；独立文件零泄漏）。形状泛化：8 列全部字符串 leading-token（tristate no/yes/conditional、primitive 含 divergent_loop/reserved、复合 executor `single_agent_semantic_extraction`、N8 default `codex_assisted_semantic_review`）——比 v1c 布尔路径更严（无 yes/no 前缀解析，全等比对）。rs 节点 id 为双源字面量（shared 不能 import backend），一致性脚本交叉核对两侧字面量。值自 W-08 已核矩阵行转录并对照运行时（首跑即绿=转录精确）。
- **校验接入**：完备性（每 v1a id + rs id 必有条目）+ 四 stage 全 8 列比对;自测负例 21→24（v1a 列翻转 / rs debate_allowed 翻转 / v1a 条目缺失注入）。schema test 5/5（集合全序相等 / debate⟺primitive / human_review→executor / 词汇拒绝）。
- **整包收口**：8 条 AC 逐条核证勾满（证据注记在 00）;State→done、**不归档**（一致性脚本按路径读本包 08-scenarios——归档前置=注册表迁 docs/context 或脚本路径同步,留待需要时）。矩阵 Machine-Check 说明同步（新增 v1a/rs 行,「仍未自动校验」缩至 Slot Map 散文列 + v1b 四列）。
- **JD 判定**：零 harness 本体/debate-core/orchestrator 改动（纯 shared 新契约+脚本+文档），无需新 JD。
