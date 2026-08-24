# 04 Verification

## 2026-05-19 Initial `AgentOrchestrator` Runtime Implementation
- Update: added `TopicSelectionAgentOrchestratorService` and focused unit coverage for execution-mode normalization.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 11 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 722 tests total, 721 passed, 1 skipped, 0 failed.
- Coverage:
  - `mocked_llm`, `codex_assisted`, and `provider_llm` return the same normalized result shape.
  - `provider_llm` calls only the existing `BackendLlmGateway`.
  - `mocked_llm` cannot run in product mode.
  - invalid structured output blocks without mode-specific result shape.
  - hidden/raw output fields block before downstream use.
  - diagnostic audit artifacts store hashes/provenance and do not store full structured output.

## 2026-05-23 Per-Slot Debate Model Option Runtime
- Update: added per-slot provider model-option overrides for v1a need-discovery debate slots and removed the OpenAI-only E2E workaround.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 75 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck && node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 160 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 763 backend tests total, 762 passed, 1 skipped, 0 failed.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`
- Result: passed; registry structurally valid.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs`
- Result: passed; all in-scope LLM config keys registered.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-debate-slot-options-20260523194540 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=codex_assisted TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-debate-slot-options-20260523194540`.
- Coverage:
  - provider-backed debate slots select profile-specific model options per slot;
  - Codex-assisted explorer carries no provider model option;
  - DashScope model-option provider overrides are preserved in gateway calls in unit coverage;
  - malformed/non-string slot model-option overrides return stable `INVALID_PAYLOAD`;
  - model-option overrides on non-provider slots return stable `INVALID_PAYLOAD`;
  - E2E summary records `debate_slot_model_option_overrides` for replay/audit.

## 2026-05-23 Slot Model Option Negative E2E
- Update: added wrapper-only negative E2E coverage for invalid v1a debate slot model-option configurations and fixed explicit unknown option error semantics.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
- Result: passed.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 15 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=v1a-negative-slot-options-20260523205126 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c pnpm topic-selection:v1a-harness-negative-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/v1a-negative-slot-options-20260523205126`.
- Coverage:
  - model option on `codex_assisted` explorer fails before harness startup;
  - cross-profile model option on provider deep critic fails at `harness generate-need-candidate`;
  - both negative cases leave `NeedCandidate`, `ValidatedNeed`, and v1b input bundle counts at zero.

## 2026-05-24 Replay And Negative Diagnostics Regression
- Update: added WorkflowHarness exact replay for the same `generate-need-candidate` attempt; matching input hash returns the existing discovery trace snapshot without context recompilation, provider/Codex/debate invocation, or authority writes. The negative E2E wrapper now persists per-case child output for diagnosis.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
  - Result: passed.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs && node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
  - Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=diagnostic-negative-20260524 pnpm topic-selection:v1a-harness-negative-e2e`
  - Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/diagnostic-negative-20260524`.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=n6-replay-negative-20260524 pnpm topic-selection:v1a-harness-negative-e2e`
  - Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/n6-replay-negative-20260524`.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
  - Result: passed; 67 tests passed.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-resource-sampling-service.unit.test.ts src/routes/topic-selection-resource-sampling-routes.integration.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
  - Result: passed; 103 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed.
- Command: `git diff --check`
  - Result: passed.
- Coverage:
  - N6 generate-need-candidate same-attempt replay returns `adapter_result.replay_provenance.replayed=true`;
  - repeated N6 attempt returns the same persisted candidate refs, does not call the provider again, and leaves exactly one NeedCandidate row;
  - N6 same-attempt input hash drift fails with `VERSION_CONFLICT` before context compilation, provider/Codex/debate invocation, or authority writes;
  - N7/N8/N9 exact replay/idempotency coverage remains green;
  - invalid slot model-option negative E2E keeps downstream authority counts at zero.

## 2026-05-20 DMP Runtime Foundation Slice 1: Profile Registry/Schema Validator
- Update: added shared DMP profile contracts, backend profile registry validator/resolver, default v1 need-discovery profiles, and focused tests.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts`
- Result: passed; 5 tests passed.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-agent-profile-contracts.schema.test.ts`
- Result: passed; 3 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
- Result: passed; 9 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 95 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend test`
- Result: initial direct run failed because the T-054 Prisma HTTP smoke test requires `DATABASE_URL`; this confirmed the suite must be run with the local env SSOT loaded.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 583 tests total, 582 passed, 1 skipped.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`
- Result: passed; registries structurally valid.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs`
- Result: initially failed because `DASHSCOPE_API_KEY_CODING` was referenced but not registered; fixed by adding it to `.ai/llm-config/registry/config_keys.yaml`; rerun passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main && node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed after correcting task status spelling to `in-progress`; project hub regenerated.
- Coverage:
  - default DMP v1 need-discovery profiles validate;
  - provider profile resolution selects the default OpenAI balanced option;
  - `mocked_llm` product mode and `codex_assisted` arbiter-final execution are rejected;
  - duplicate profiles/options and unknown provider ids are reported;
  - semantic retry, automatic fallback drift, mock product eligibility, raw provider audit, hidden reasoning audit, and non-preserving technical retry are rejected;
  - shared schema rejects invalid normalized parameter values and automatic fallback.

## 2026-05-20 Quality Review And DMP Runtime Foundation Slice 2: Orchestrator Profile Resolution
- Update: fixed DMP dual-track risks found in code review and wired profile resolution into `TopicSelectionAgentOrchestratorService`, generate-need-candidate adapter, and workflow harness.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: initially failed because `LlmStructuredOutputRequest.normalizedParams` used an index-signature type incompatible with the shared normalized params interface; fixed the request field type to `object`; rerun passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/llm-gateway.unit.test.ts`
- Result: passed; 31 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck && pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 95 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 584 tests total, 583 passed, 1 skipped.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`
- Result: passed; registries structurally valid.
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs`
- Result: passed; all in-scope LLM config keys registered.
- Coverage:
  - `AgentOrchestrator` rejects profile/output-contract mismatch;
  - provider model and request policy are resolved from the profile registry, not from harness/adapter concrete model input;
  - explicit `model_option_id` selects DashScope option and carries provider overrides into the gateway request;
  - provenance includes profile version/hash, selected model option id, normalized params hash, output contract, and `provider_response` source kind;
  - generate-need-candidate adapter and WorkflowHarness provider-mode scenarios execute through registry-resolved profile options;
  - full shared/backend suites remain green after fixture profile-id cleanup.

## 2026-05-20 DMP Runtime Foundation Slice 3: Shared Invocation Provenance Contract
- Update: added the shared agent invocation provenance/audit envelope and wired `TopicSelectionAgentOrchestratorService` to validate audit snapshots before control-plane artifact persistence.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-agent-invocation-contracts.schema.test.ts`
- Result: passed; 4 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 19 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 100 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 584 tests total, 583 passed, 1 skipped.
- Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- Result: passed; project hub regenerated.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-agent-orchestrator-service.ts apps/backend/src/services/topic-selection-agent-orchestrator-service.unit.test.ts packages/shared/src/research-lifecycle/topic-selection-agent-invocation-contracts.ts packages/shared/src/research-lifecycle/topic-selection-agent-invocation-contracts.schema.test.ts packages/shared/src/research-lifecycle/index.ts packages/shared/package.json packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/02-architecture.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md`
- Result: passed.
- Coverage:
  - shared schema accepts canonical provider, Codex, and mocked provenance envelopes;
  - shared schema rejects provider provenance without selected model-option params;
  - shared schema rejects raw provider response and hidden-reasoning fields;
  - orchestrator audit artifacts include invocation attempt id, cache status, structured output hash, profile/model-option provenance, and source-kind markers;
  - missing mocked/Codex source packets are rejected as `INVALID_PAYLOAD` before audit construction, preventing invalid blocked audit snapshots;
  - generate-need-candidate adapter and WorkflowHarness scenarios still preserve one result shape across mocked, Codex-assisted, and provider execution modes.

## 2026-05-20 DMP Runtime Foundation Slice 4: Need Discovery Debate Role Invocation Runtime
- Update: added the initial v1a need-discovery debate loop runtime and wired it into the generate-need-candidate adapter plus WorkflowHarness.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 4 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts`
- Result: passed; 36 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/title-card-management-contracts.schema.test.ts`
- Result: passed; 48 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 100 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 589 tests total, 588 passed, 1 skipped.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.ts apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts apps/backend/src/services/topic-selection-workflow-harness-service.ts apps/backend/src/services/topic-selection-workflow-harness-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-agent-orchestrator-service.ts apps/backend/src/services/topic-selection-model-profile-registry-service.ts apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md`
- Result: passed.
- Coverage:
  - debate loop accepts multiple explorer instances and a deep critic instance in `mocked_llm`;
  - missing mandatory worker role outputs are rejected as `INVALID_PAYLOAD`;
  - debate round input is capped at 3;
  - worker role outputs, role-level summaries, arbiter issue frame, and final synthesis artifacts are recorded;
  - final arbiter invocation carries `executor_kind=multi_agent_debate` and `debate_extension` provenance;
  - blocked arbiter issue-framing remains visible in role invocation results while keeping issue-frame/final artifacts absent;
  - WorkflowHarness can execute `executor_kind=multi_agent_debate` without writing NeedCandidate authority rows when persistence is disabled;
  - existing admission/routing path still consumes only the final ranked draft batch, not raw debate worker output;
  - shared schemas validate canonical debate role output, summary, issue-frame, and final-synthesis payloads and reject an unsupported debate role.

## 2026-05-20 DMP Runtime Foundation Slice 5: Executable Debate Scenario Contract Consumption
- Update: added shared scenario contract DTO/schema and refactored `TopicSelectionNeedDiscoveryDebateLoopService` to use it for executable v1a role/stage metadata.
- Initial command: `pnpm --filter @paper-engineering-assistant/shared test -- topic-selection-debate-scenario-contracts.schema.test.ts`
- Result: failed due incorrect pnpm script argument forwarding; reran the direct package test command below.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-debate-scenario-contracts.schema.test.ts`
- Result: passed; 2 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Initial command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: failed because `title-card-management-contracts.schema.test.ts` exact barrel-export expectations needed the new shared module; fixed and reran.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 103 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts`
- Result: passed; 22 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 592 backend tests total, 591 passed, 1 skipped, 0 failed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-debate-scenario-contracts.ts packages/shared/src/research-lifecycle/topic-selection-debate-scenario-contracts.schema.test.ts packages/shared/src/research-lifecycle/index.ts packages/shared/package.json packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.ts apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-workflow-harness-service.ts dev-docs/active/topic-selection-agent-workflow-review/11-debate-model-invocation-policy.md dev-docs/active/topic-selection-agent-workflow-review/12-v1a-generate-need-candidate-debate-contract.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md`
- Result: passed.
- Coverage:
  - executable scenario contract is schema-validated and exported through shared package boundaries;
  - debate loop no longer duplicates role/stage slot profile ids, prompt ids, output contracts, schema names, instance defaults, or round cap;
  - debate loop supports explicit slot-level Codex substitution while keeping final synthesis provider-backed;
  - final synthesis Codex override is rejected before a final authority-producing invocation can run;
  - provider-mode debate follows executable contract defaults and still uses the model profile registry for provider/model/options/normalized params;
  - final-synthesis Codex substitution remains blocked by contract/profile alignment.

## 2026-05-20 Real E2E Provider Run And Ref-Normalization Hardening
- Initial command: `pnpm topic-selection:real-e2e`
- Result: failed at `v1b LLM research-slice option generation`; provider output placed a known non-evidence `v1b_intake_snapshot_*` ref in an evidence array.
- Fix verified: `TopicSelectionV1bResearchSliceService` removes known non-evidence upstream refs from evidence arrays, preserves unknown foreign evidence refs as blockers, and records `NON_EVIDENCE_REFS_REMOVED_FROM_SLICE_OPTION`.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1b-research-slice-service.unit.test.ts`
- Result: passed; 9 tests passed after the first ref-slot repair and 10 tests passed after canonical evidence-ref repair.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed after both ResearchSlice repairs.
- Follow-up run: `TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_eaf6437e-a88c-43ef-8e65-2216ffd2272e TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:real-e2e`
- Result: failed at package handoff because a provider-produced evidence ref carried a malformed `title_card_id`.
- Fix verified: known ResearchSlice evidence refs are canonicalized to inherited evidence role bundle refs before persistence and record `EVIDENCE_REFS_CANONICALIZED`.
- Follow-up run exposed TopicQuestion provider output with an extra invented boundary ref.
- Fix verified: `TopicSelectionV1bTopicQuestionService` drops extra unknown boundary refs when canonical boundary refs remain and records `boundary_refs_normalized`.
- Follow-up run exposed an unknown falsification `trigger_source_ref`.
- Fix verified: unknown falsification source refs are removed without dropping strict evidence triggers and record `falsification_source_refs_normalized`.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-v1b-topic-question-service.unit.test.ts`
- Result: passed; 35 tests passed.
- DashScope compatibility check:
  - `TOPIC_SELECTION_REAL_PROVIDER_ID=dashscope TOPIC_SELECTION_REAL_MODEL_ID=qwen3.6-plus ... pnpm topic-selection:real-e2e` failed with `DASHSCOPE_API_KEY` 401.
  - Re-running with `DASHSCOPE_API_KEY` temporarily mapped from `DASHSCOPE_API_KEY_CODING` authenticated but failed contract validation with `ResearchSlice planning returned no options`.
  - Decision: DashScope is not accepted for this E2E yet; keep OpenAI as the provider-quality path.
- Successful command: `TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_eaf6437e-a88c-43ef-8e65-2216ffd2272e TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 TOPIC_SELECTION_REAL_LLM_MAX_RETRIES=3 pnpm topic-selection:real-e2e`
- Result: passed.
- Successful run id: `real-e2e-1779248422005-c0dfd5`.
- Artifact dir: `.ai/.tmp/topic-selection-real-e2e/real-e2e-1779248422005-c0dfd5`.
- Initial backend regression command: `pnpm --filter @paper-engineering-assistant/backend test`
- Result: failed because `.env.local` was not sourced and the Prisma HTTP smoke tests require `DATABASE_URL`; reran with env loaded.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 596 backend tests total, 595 passed, 1 skipped, 0 failed.
- Command: `git diff --check -- .ai/scripts/topic-selection-real-e2e.mjs apps/backend/src/services/topic-selection-v1b-research-slice-service.ts apps/backend/src/services/topic-selection-v1b-research-slice-service.unit.test.ts apps/backend/src/services/topic-selection-v1b-topic-question-service.ts apps/backend/src/services/topic-selection-v1b-topic-question-service.unit.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - provider-backed v1b ResearchSlice, TopicQuestion, and ValueAssessment nodes executed;
  - v1a produced a validated need and v1b advanced to package;
  - `answerable_with_risk` accepted risk carried into v1b and v1c;
  - v1c promotion, bridge, PaperProject intake, downstream feedback, and recheck request paths completed;
  - negative checks in the script confirmed malformed intake `INVALID_PAYLOAD`, stale hash `VERSION_CONFLICT`, workspace drift `VERSION_CONFLICT`, inactive bridge `GATE_CONSTRAINT_FAILED`, and downstream invalid feedback/workspace drift behavior.

## 2026-05-20 Real E2E Harness Migration: v1a Generate Need Candidate
- Update: migrated `.ai/scripts/topic-selection-real-e2e.mjs` so v1a `generate-need-candidate` runs through `TopicSelectionWorkflowHarnessService` instead of the compatibility single-candidate route.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
- Result: passed; 20 tests passed.
- Initial command: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:real-e2e`
- Result: failed at `POST /topic-selection/v1b/intake-readiness-assessments` with `blocked_by_stale_trace`.
- Root cause: the real-E2E harness input used unversioned `evidence_map`, `search_plan`, `literature_resource_pool_snapshot`, and evidence-unit refs, while downstream support packets use canonical versioned refs.
- Fix verified: harness input now carries `evidence_map_version`, `plan_version`, `snapshot_version`, and evidence-unit version ids.
- Follow-up command: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:real-e2e`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Successful run id: `real-e2e-1779267219817-f97f08`.
- Artifact dir: `.ai/.tmp/topic-selection-real-e2e/real-e2e-1779267219817-f97f08`.
- Coverage:
  - v1a generate-node executed through `topic-selection.real-e2e.canary.v1`;
  - harness scenario status passed;
  - execution mode was `mocked_llm` and run mode was `acceptance`;
  - `PersistNeedCandidateBatchCommand` produced one persisted `NeedCandidate`;
  - candidate-pool projection ref/hash was emitted;
  - v1b intake readiness advanced after canonical ref-version repair;
  - v1b package, v1c promotion, PaperProject bridge/intake, and downstream feedback/recheck completed.

## 2026-05-20 WorkflowScenario Quality Runner Migration
- Update: retired `.ai/scripts/topic-selection-real-e2e-quality-gate.mjs` and moved its assertions behind `.ai/scripts/topic-selection-workflow-scenario-runner.mjs --scenario topic-selection.real-e2e.scale-quality.v1`.
- Command: `node --check .ai/scripts/topic-selection-workflow-scenario-runner.mjs && node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Initial command: `TOPIC_SELECTION_REAL_E2E_REPEATS=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm pnpm topic-selection:real-e2e:quality-gate`
- Result: failed on the preserved selected-literature semantic audit: a guardrail-canonicalized support sample still carried stale risk/failure rationale from the LLM classification.
- Fix verified: `TopicSelectionResourceSamplingService` now rewrites classification rationale and method families whenever deterministic guardrails canonicalize a target role.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-resource-sampling-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Follow-up command: `TOPIC_SELECTION_REAL_E2E_REPEATS=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm pnpm topic-selection:real-e2e:quality-gate`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 597 tests total, 596 passed, 1 skipped.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- ...` for the migrated scripts, resource-sampling service/test, package script, and updated task docs.
- Result: passed.
- Successful quality run id: `real-e2e-quality-20260520172205`.
- Coverage:
  - top-level quality summary records `topic-selection.real-e2e.scale-quality.v1`;
  - child canary summary records `topic-selection.real-e2e.canary.v1`;
  - child v1b negative summary records `topic-selection.v1b.non-advance-negative.v1`;
  - old quality assertions remain active for role counts, sample hash/selected-set stability, selected evidence semantics, intake invariants, downstream counts, and v1b non-advance stop behavior.

## 2026-05-20 v1a WorkflowHarness Normalization: Create TopicSeed
- Update: implemented the first complete-v1a normalized runner, `TopicSelectionWorkflowHarnessService.runCreateTopicSeedScenario`.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-search-resource-service.unit.test.ts`
- Result: passed; 7 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Initial command: `pnpm --filter @paper-engineering-assistant/backend test`
- Result: failed only because `.env.local` was not sourced and the Prisma HTTP smoke tests require `DATABASE_URL`.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 600 tests total, 599 passed, 1 skipped, 0 failed.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-workflow-harness-service.ts apps/backend/src/services/topic-selection-workflow-harness-service.unit.test.ts apps/backend/src/services/topic-selection-search-resource-service.ts apps/backend/src/services/topic-selection-search-resource-service.unit.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/01-plan.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: failed due unrelated pre-existing paper-implementation task packages T-092 through T-097 missing project registry entries; no T-088/T-089 drift was reported.
- Coverage:
  - successful TopicSeed scenario creates authority only through `TopicSelectionSearchResourceService.createTopicSeedFromTitleCard`;
  - blocked missing-TitleCard scenario returns a blocked harness result with no authority refs;
  - harness trace artifact is recorded through the control plane with `WorkflowHarnessCreateTopicSeedScenarioTrace@v1`;
  - direct service calls now reject empty final `intent_summary` before TopicSeed id allocation or repository persistence;
  - TopicSeed input snapshots include final `intent_summary` and `seed_version`.

## 2026-05-20 v1a WorkflowHarness Normalization: Snapshot Literature Resource Pool
- Update: implemented `TopicSelectionWorkflowHarnessService.runSnapshotLiteratureResourcePoolScenario`.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 15 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-search-resource-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed after quality-review hardening; 616 backend tests total, 615 passed, 1 skipped, 0 failed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - success path creates `LiteratureResourcePoolSnapshot` only through the search-resource authority service;
  - unsupported normalized harness source scopes block before authority creation;
  - missing literature records preserve `MISSING_LITERATURE_RECORD` and blocked-path control-plane audit refs in harness output;
  - non-concrete TopicSeed refs are rejected before authority creation;
  - traceable immature resources emit source-health warning codes without blocking snapshot creation;
  - repeated equivalent runs keep the same `snapshot_hash` while creating distinct snapshot authority refs;
  - harness trace artifact uses `WorkflowHarnessSnapshotLiteratureResourcePoolScenarioTrace@v1`;
  - SearchPlan handoff packet carries snapshot ref, version, hash, source scope, literature refs, content source refs, and source-health summary.

## 2026-05-21 v1a Node 1/2 LLM Boundary Amendment Docs
- Update: recorded TopicSeed and literature-resource snapshot LLM boundaries as Node 1/2 amendments rather than N3 follow-up decisions.
- Command: `rg -n "N1-AM01|N2-AM01|TopicSeedIntentDraft|TopicSeed Intent Draft Boundary|Node 1/2 LLM Boundary" dev-docs/active/topic-selection-workflow-runtime-foundation dev-docs/active/topic-selection-agent-workflow-review`
- Result: passed; amendments and architecture notes are present in T-088 and T-089 docs.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - N1-AM01 keeps `create-topic-seed` deterministic with `execution_mode=none`;
  - optional `TopicSeedIntentDraft@v1` remains a future pre-node value artifact/profile, not an authority writer;
  - N2-AM01 keeps `snapshot-literature-resource-pool` deterministic and model-free;
  - semantic sampling/classification remains upstream or downstream instead of being folded into Node 2.

## 2026-05-21 v1a Node 3 WorkflowHarness Runner Contract Docs
- Update: locked N3-D05 for `topic-selection.v1a.create-search-plan.v1`.
- Command: `rg -n "N3-D05|runCreateSearchPlanScenario|WorkflowHarnessCreateSearchPlanScenarioTrace|route_service_compatibility_fallback_allowed|fallback generic" dev-docs/active/topic-selection-workflow-runtime-foundation dev-docs/active/topic-selection-agent-workflow-review`
- Result: passed; runner contract and fallback boundary are recorded.
- Command: `rg -n "\t" dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`
- Result: passed; no tab indentation remains in the node policy file.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - normalized Node 3 runner is `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario`;
  - normalized input is `TopicSelectionSearchPlanBlueprint@v1` plus scenario/run metadata;
  - route/service fallback may remain only for compatibility callers;
  - normalized harness blocks omitted coverage intents and fallback-derived coverage semantics before authority creation;
  - `WorkflowHarnessCreateSearchPlanScenarioTrace@v1` is the planned trace schema.

## 2026-05-21 v1a Node 3 WorkflowHarness Implementation
- Update: implemented `runCreateSearchPlanScenario`, shared `TopicSelectionSearchPlanBlueprint@v1`, strict normalized validators, full blueprint input-snapshot freezing, and Node 1/2 provenance input amendments.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 23 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-search-resource-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `cd packages/shared && TS_NODE_LOG_ERROR=true node --test --loader ts-node/esm src/research-lifecycle/title-card-management-contracts.schema.test.ts`
- Result: passed; 49 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 117 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 651 backend tests total, 650 passed, 1 skipped, 0 failed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - strict SearchPlan blueprint success creates SearchPlan and CoverageRow authorities only through the search-resource authority service;
  - full blueprint is preserved in the SearchPlan control-plane input snapshot and harness trace;
  - malformed blueprint schema version blocks before authority creation;
  - missing blueprint blocks before authority creation;
  - stale snapshot hash blocks before authority creation;
  - omitted coverage intents block instead of using service fallback;
  - fallback-derived coverage semantics block before the service call;
  - non-object coverage intent entries block before the service call;
  - TopicSeed lineage mismatch blocks before authority creation;
  - Node 1 intent-preparation provenance is recorded in both TopicSeed source refs and input snapshot;
  - Node 2 resource-sample-set provenance is recorded without changing deterministic execution boundaries.

## 2026-05-21 v1a Node 5 WorkflowHarness Implementation
- Update: implemented `runBuildEvidenceMapScenario`, shared Node 5 draft/report/review/handoff schemas, model profile registration, deterministic materialization, and focused tests.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 146 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 37 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-evidence-map-service.unit.test.ts`
- Result: passed; 8 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 718 tests total, 717 passed, 1 skipped, 0 failed.
- Coverage:
  - direct draft path builds EvidenceMap authority through the existing EvidenceMap service and emits Node 6 handoff;
  - `llm_inference` source attribution blocks materialization before authority creation;
  - low-confidence or ambiguous extraction emits review package and no authority refs;
  - mocked single-agent extraction goes through AgentOrchestrator, records audit artifact refs, and still materializes deterministically;
  - shared schema rejects hidden reasoning drift in extraction drafts;
  - backend typecheck confirms the runner, materializer, profile registry, and shared contracts compile together.

## 2026-05-21 v1a Node 5 Quality Review Fix Verification
- Update: fixed N5 review findings for warning propagation, lineage strictness, locator provenance precheck, and source-specific conflict coverage.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 36 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Coverage:
  - materialization-only warnings are included in Node 6 handoff warning summary;
  - locator provenance outside SearchRun handoff blocks before EvidenceMap authority creation;
  - SearchPlan ref version drift blocks during materialization lineage validation;
  - unrelated claim conflicts do not clear same-source support/challenge ambiguity.

## 2026-05-21 N5 to N6 Handoff Consumption Guard Verification
- Update: added `TopicSelectionEvidenceMapHandoff@v1` validation before Node 6 context compilation and blocked N5 review/raw/audit artifacts from Node 6 business input refs.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 39 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 725 tests total, 724 passed, 1 skipped, 0 failed.
- Coverage:
  - a real N5 `runBuildEvidenceMapScenario` handoff can drive `runGenerateNeedCandidateScenario`;
  - Node 6 compiled context includes the workflow handoff as provenance;
  - handoff EvidenceMap ref drift returns `VERSION_CONFLICT` before context compilation;
  - EvidenceMap review-package refs in Node 6 business input return `INVALID_PAYLOAD`;
  - NeedCandidate persistence remains explicit and is not triggered by handoff validation.

## 2026-05-22 N7-D12 Planned Verification Matrix
- Update: locked Implementation Readiness Review and test matrix for `topic-selection.v1a.validate-need-adjudication.v1`.
- Current readiness at planning time: implementation may start; the later implementation verification records the matrix pass and callable runner.

| ID | Layer | Scenario | Required Result |
|---|---|---|---|
| N7-C01 | shared contract | valid `TopicSelectionNeedAdjudicationRecommendationPacket@v1` | schema accepts whitelist recommendation fields only |
| N7-C02 | shared contract | recommendation includes `route_outcome`, DB status, authority id, hidden reasoning, or workflow command | schema rejects |
| N7-C03 | shared contract | valid `TopicSelectionValidateNeedAdjudicationNodeResult@v1` | schema accepts `ready`, `blocked`, and `require_human_review` only |
| N7-P01 | profile registry | resolve `topic-selection.need-adjudication.single-agent.v1` | profile exists, structured JSON required, fallback disabled, low creativity/high reasoning |
| N7-H01 | harness unit | fresh readiness/support plus low-risk `validate` recommendation | creates adjudication only, returns `ready + advance_to_human_confirmation`, no ValidatedNeed |
| N7-H02 | harness unit | readiness returns non-ready recommendation | returns `blocked`, no support packet/adjudication authority |
| N7-H03 | harness unit | readiness recommendation `reject` | treated as gate finding, not persisted reject adjudication |
| N7-H04 | harness unit | explicit readiness/support packet lineage drift | blocks with `VERSION_CONFLICT` or `GATE_CONSTRAINT_FAILED` |
| N7-H05 | harness unit | support packet created, upstream evidence/search/resource mutates | recommendation/adjudication still consumes frozen support packet or blocks; no live reread |
| N7-H06 | harness unit | model recommends `reject`, `merge`, or `park` without human/hybrid acceptance | returns `require_human_review`, no adjudication authority |
| N7-H07 | harness unit | human/hybrid accepts high-risk decision | may call adjudication service after deterministic validation |
| N7-H08 | harness unit | model recommendation contains orchestration fields | returns `blocked` with malformed recommendation code |
| N7-H09 | harness unit | `request_searchplan_recheck` recommendation | creates typed recheck request only, no SearchPlan mutation |
| N7-H10 | harness unit | `return_to_candidate` without actionable actions | blocks before adjudication |
| N7-H11 | harness unit | duplicate/pending adjudication | returns `blocked + DUPLICATE_OR_PENDING_ADJUDICATION`, no second result |
| N7-H12 | harness unit | exact replay with same input hash and existing trace | returns prior node result, no authority writes |
| N7-H13 | harness unit | replay input hash drift or missing trace | returns `blocked`, no authority writes |
| N7-H14 | harness unit | provider/mocked/codex malformed output | one same-profile technical retry max, no provider/Codex/mock fallback |
| N7-H15 | harness unit | readiness recommendation `merge_required` or `park` | treated as gate finding, returns `blocked` with review repair hint, no persisted merge/park authority |
| N7-H16 | service + harness unit | direct adjudication with stale support-packet lineage | rejects with `VERSION_CONFLICT` or `GATE_CONSTRAINT_FAILED`, no adjudication authority |
| N7-H17 | harness unit | exact replay storage lookup cannot recover prior node result or trace | returns `blocked`/pause path, no fresh attempt and no authority writes |
| N7-I01 | route regression | existing readiness/support/adjudication REST happy path | current integration behavior remains passing |
| N7-I02 | route regression | duplicate adjudication via REST | service rejects second adjudication |
| N7-E01 | workflow scenario | N1->N7 happy path over fixture data | N7 handoff is machine-consumable by Node 8 |

Minimum close criteria:
- focused `topic-selection-workflow-harness-service.unit.test.ts` covers every N7-H row;
- shared schema tests cover N7-C rows;
- model profile registry tests cover N7-P01;
- route integration regression covers N7-I rows;
- backend typecheck passes;
- governance lint passes;
- no DB migration is introduced unless the DB SSOT pause condition is explicitly triggered.

## 2026-05-22 N7 Implementation Verification
- Update: implemented `runValidateNeedAdjudicationScenario`, shared contracts, profile registry entry, replay lookup, and service-level support-packet lineage guard.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-need-validation-contracts.schema.test.ts`
- Result: passed; 4 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 51 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-validation-service.unit.test.ts`
- Result: passed; 19 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Broad backend command note: running `pnpm --filter @paper-engineering-assistant/backend test -- topic-selection-workflow-harness-service.unit.test.ts` invoked the full backend suite and reached the N7 harness tests successfully, but the full suite failed at existing Prisma HTTP smoke tests because `DATABASE_URL` was not loaded in this shell. This is an environment precondition, not an N7 regression.
- Coverage:
  - recommendation schema accepts whitelist packets and rejects orchestration fields;
  - node-result schema accepts only `ready`, `blocked`, and `require_human_review`;
  - model profile resolves `topic-selection.need-adjudication.single-agent.v1`;
  - low-risk `validate` returns `ready + advance_to_human_confirmation` and does not create `ValidatedNeed`;
  - high-risk model-only reject returns `require_human_review` without authority writes;
  - high-risk reject with explicit human acceptance creates only adjudication authority;
  - `request_searchplan_recheck` creates a typed recheck route without mutating SearchPlan;
  - `return_to_candidate` without actions blocks before adjudication;
  - malformed recommendation packets with orchestration fields block before recommendation/adjudication artifacts;
  - non-ready readiness, including `reject`, `merge_required`, and `park`, blocks as gate findings;
  - frozen support packet remains the N7 SSOT after upstream evidence freshness changes;
  - duplicate adjudication attempts block with existing adjudication refs;
  - exact replay returns the prior result and replay drift blocks without additional authority writes;
  - direct service adjudication rejects stale support-packet lineage before persistence.
  - recommendation packet profile/policy/output-schema drift blocks before recommendation/adjudication artifacts;
  - replayed attempts re-evaluate current scenario assertions instead of reusing stale assertion results.

## 2026-05-22 N8 Reserved-Id Documentation Check
- Update: synchronized N8 wording so the node materializes N7's reserved `output_validated_need_id` rather than minting a new `validated_need_id`.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: no remaining N8 wording says it creates a new `TopicSelectionValidatedNeedRecord` id or treats the reserved id as existing authority.

## 2026-05-22 N8 Human Delegated Documentation Check
- Update: added `human_delegated` as a constrained confirmation mode for human-authorized Codex/provider execution.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: no remaining N8 wording limits confirmation only to human/hybrid or describes model output as confirmation without `HumanConfirmationInput@v1` and fixed delegation policy.

## 2026-05-22 N8-D04 Minimal Confirmation Input Documentation Check
- Update: simplified N8 to a single `HumanConfirmationInput@v1` node-level value contract and removed the standalone delegation-contract direction.
- Search check: removed old N8 standalone delegation-contract wording and replaced it with `HumanConfirmationInput@v1` plus fixed policy `n8-validate-only-delegation-v1`.

## 2026-05-23 N8-D05 Bounded Semantic Review Documentation Check
- Update: added `HumanConfirmationSemanticReview@v1` so N8 can parse N7 semantic rationale, support-packet checks, residual risks, confirmation rationale, and delegated executor output without re-adjudication.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: N8 now records semantic review as a trace/audit artifact and keeps debate, final-decision changes, new risk generation, upstream mutation, and direct authority writes out of the semantic parser.

## 2026-05-23 N8-D06 Semantic Review Invocation Documentation Check
- Update: locked semantic-review profile, frozen context packet, structured output, retry, cache, and no-fallback failure policy.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: `HumanConfirmationSemanticReviewContextPacket@v1`, `topic-selection.confirmation-semantic-review.single-agent.v1`, same-profile retry, exact-match cache, and forbidden fallback semantics are present in the node policy.

## 2026-05-23 N8-D07 Node Result Documentation Check
- Update: locked `TopicSelectionHumanConfirmNeedNodeResult@v1` as N8's only downstream automation handoff.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: N8 ready results route only to `advance_to_publish_v1b_input_bundle`; blocked/review results do not auto-advance; v1b bundle publication remains Node 9-only.

## 2026-05-23 N8-D08 Simple Retry Documentation Check
- Update: simplified N8 retry/idempotency to exact replay, duplicate reserved-id block, append-only failed attempts, and explicit repair for partial confirmation writes.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: `DUPLICATE_VALIDATED_NEED`, `PARTIAL_CONFIRMATION_WRITE`, new-attempt retry, and no idempotent-ready shortcut are recorded in policy and normalization docs.

## 2026-05-23 N8-D09 Readiness Documentation Check
- Update: recorded implementation readiness, runtime gaps, DB-storage check, and minimum N8 close matrix.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Search check: at D09 readiness-review time N8 was `implementation_ready` but not yet callable; the follow-up implementation verification below records the callable runtime closure.

## 2026-05-23 N8 WorkflowHarness Implementation Verification
- Update: implemented N8 contracts, profile, service/route normalization, duplicate/partial guards, semantic review artifacts, and `runHumanConfirmNeedScenario`.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-need-validation-contracts.schema.test.ts`
- Result: passed; 10 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-validation-service.unit.test.ts`
- Result: passed; 19 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 58 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts`
- Result: passed; 3 tests passed.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage: human-confirm ready path materializes the reserved ValidatedNeed id, does not create v1b bundle, supports fixed-policy `human_delegated`, rejects non-delegated delegated executor payloads, blocks missing risk coverage, blocks semantic-review lineage drift before authority writes, exact-replays same attempt before duplicate guard, blocks duplicate materialized reserved id, and blocks partial HumanConfirmedDecision writes without automatic backfill.

## 2026-05-23 N9 Implementation Readiness Documentation Check
- Update: locked N9 deterministic terminal handoff, handoff input contract, traceability, replay/idempotency, stable failure semantics, and implementation readiness review.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Readiness result at that point: implementation could start; N9 remained `not_callable` until `runPublishV1bInputBundleScenario` landed.

## 2026-05-23 N9 WorkflowHarness Implementation Verification
- Update: implemented N9 shared contracts, service guard, `runPublishV1bInputBundleScenario`, and focused tests.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-need-validation-contracts.schema.test.ts`
- Result: passed; 14 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 64 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-validation-service.unit.test.ts`
- Result: passed; 16 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`
- Result: passed; 33 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts`
- Result: passed; 3 tests passed.
- Command: `source ./.env.local && pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 758 tests, 757 passed, 1 skipped. Note: the same command without loading `.env.local` fails only the T-054/T-067 Prisma HTTP smoke precondition because `DATABASE_URL` is intentionally sourced from local env.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage: happy publish, terminal node result without `next_node_id`, trace artifact with stable `created_by=system` default, exact replay, existing bundle reuse by expected version, same-attempt hash mismatch block, lineage drift block, missing expected version block, stable invalid-confirmation input rejection before missing-adjudication lookup, and service rejection of non-confirm human decision before bundle persistence.
- Follow-up review fix: clarified that the WorkflowHarness runner owns normalized automation while the REST route remains a compatibility service boundary; removed malformed YAML indentation in the N9 policy block.

## 2026-05-23 v1a Full WorkflowHarness E2E Verification
- Update: added `.ai/scripts/topic-selection-v1a-harness-e2e.mjs` and `pnpm topic-selection:v1a-harness-e2e` as the v1a-only real-environment harness acceptance runner.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Initial command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-env-20260523171457 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 pnpm topic-selection:v1a-harness-e2e`
- Result: failed at N3 because `coverage_rows_preserve_blueprint_semantics` compared functional refs through `JSON.stringify`, making DB-returned ref key order look semantically different.
- Fix: `TopicSelectionWorkflowHarnessService.coverageRowsMatchBlueprint` now compares refs by canonical ref identity instead of object key order.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 64 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Follow-up command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-env-20260523171700 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 pnpm topic-selection:v1a-harness-e2e`
- Result: failed at N5 because the new E2E fixture used invalid evidence-map enum values (`role_group`, `role_pattern`, `risk_boundary`, `medium`).
- Fix: the fixture now uses the shared evidence-map contract enums (`method_family`, `limitation_family`, `baseline_family`, `solution`, `limitation`, `baseline`, `context`, `claim_conflict`, `moderate`).
- Successful command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-env-20260523171750 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; reused existing sample set `resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c`, executed all nine v1a harness nodes, and produced `v1b_input_bundle_dd36f81f-b8d7-441b-83f1-262306f56e4d`.
- Successful command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-create-sample-20260523171809 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=8 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; created sample set `resource_sample_set_df6b9775-6611-437b-be66-5503638ab515`, executed all nine v1a harness nodes, and produced `v1b_input_bundle_49c526bb-c164-4592-a9c2-66b907fd122c`.
- Artifact dirs:
  - `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-full-harness-env-20260523171750`
  - `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-full-harness-create-sample-20260523171809`
- Coverage: real DB, real title-card fixture, persisted resource sample set, v1a `WorkflowHarness` execution for N1 through N9, persisted `TopicSeed`, `LiteratureResourcePoolSnapshot`, `SearchPlan`, `SearchRun`, `EvidenceMap`, `NeedCandidate`, adjudication result, reserved-id `ValidatedNeed`, and terminal v1b input bundle handoff.

## 2026-05-23 v1a Provider Participation E2E Verification
- Update: added per-node v1a harness execution modes for N6 and N7 and verified real provider participation without changing shared business contracts.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/llm-gateway.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
- Result: passed; 20 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/llm-gateway.unit.test.ts`
- Result: passed; 80 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-codex-20260523172858 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_AGENT_EXECUTION_MODE=codex_assisted pnpm topic-selection:v1a-harness-e2e`
- Result: passed; Codex-assisted boundary executed all nine v1a nodes and produced `v1b_input_bundle_e6ed894a-f801-46bb-a8e9-615299c64b16`.
- Initial N7 provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-n7-provider-20260523173700 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: failed at N7 with `InvalidRequestError`; no adjudication authority was created.
- Fix: normalized OpenAI structured-output transport names and provider-only schema conversion for shared-contract `const` fields; internal schema names and audit provenance remain unchanged.
- Successful N7 provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-n7-provider-20260523174130 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; N7 provider call advanced to N8 and produced `v1b_input_bundle_8fc9b5b2-a052-4377-b65b-404f645a858a`.
- Initial full-provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-provider-20260523174400 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: failed at N6 with `NO_ADMISSIBLE_NEED_CANDIDATE`; provider interpreted empty candidate pool as no generation target. No NeedCandidate was persisted.
- Fix: clarified N6 context semantics and output constraints so empty candidate pools mean no known duplicates, not no candidates to generate.
- Follow-up full-provider run generated 3 candidates and passed N6 admission, then exposed brittle exact-count E2E expectations.
- Fix: added bounded count expectations for N6 provider scenarios (`min/max admitted` and `min/max persisted`) while preserving exact counts for mocked/Codex fixtures.
- Follow-up full-provider run passed N6 but stopped before N7 because the selected first candidate was `evidence_gap`.
- Fix: the E2E harness now passes true EvidenceMap evidence roles into `evidence_ref_table` and selects a readiness-ready persisted candidate for the N7 handoff.
- Successful full-provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-full-harness-provider-20260523180200 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; provider LLM participated in N6 and N7, N6 persisted 4 NeedCandidates, readiness selected `need_candidate_60271bc6b1d0416736932829`, and N9 published `v1b_input_bundle_5e6a60da-3db0-40c8-8b91-7535e2fa4299`.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-full-harness-provider-20260523180200`
- Command: `set -a; source ./.env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 760 tests, 759 passed, 1 skipped.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.

## 2026-05-23 v1a Mixed Multi-Agent Debate E2E Verification
- Update: N6 `generate-need-candidate` debate arbiter calls now receive structured role summary payloads in addition to artifact refs, and the v1a harness E2E runner can execute N6 as `multi_agent_debate`.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 72 tests passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-debate-mixed-20260523180445 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=codex_assisted TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; reused sample set `resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c`, executed all nine v1a nodes, ran N6 as mixed Codex/provider debate, persisted 3 NeedCandidates, and published `v1b_input_bundle_95471cc3-d8c3-4ce1-9e2b-187d73294c1f`.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-debate-mixed-20260523180445`.
- Audit checks:
  - N6 debate status `succeeded`;
  - explorer used `codex_assisted` with `source_kind=codex_response`;
  - deep critic and arbiter issue framing used `provider_llm` with `source_kind=provider_response`;
  - final synthesis produced `debate_final_synthesis`;
  - hidden-reasoning key scan over the E2E artifact returned `0`.
- Initial full backend command: `pnpm --filter @paper-engineering-assistant/backend test`
- Result: failed only because the default test runner does not load `.env.local`, and T-054/T-067 Prisma smoke tests require `DATABASE_URL`.
- Follow-up command with the real local DB env showed existing-data contamination in unrelated research-lifecycle integration tests, so it was stopped and replaced with an isolated schema run.
- Isolated DB command: create temporary Postgres schema, run `pnpm exec prisma migrate deploy --schema prisma/schema.prisma`, then run `BACKEND_TEST_PRESERVE_REAL_ENV=1 pnpm --filter @paper-engineering-assistant/backend test` against that temporary schema.
- Result: passed; 760 tests, 759 passed, 1 skipped, 0 failed. The temporary schema was dropped after the run.
- Command: `git diff --check`
- Result: passed.

## 2026-05-24 Unified LLM Execution Spec Verification
- Update: added canonical `TopicSelectionAgentExecutionSpec`, provider runtime mapping, explicit OpenAI `gpt-5.5` quality/deep-reasoning model options, debate `execution_plan` support with instance-level specs, and WorkflowHarness alignment for N5/N6/N7/N8 model-like call sites.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/llm-gateway.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 34 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared exec node --test --loader ts-node/esm src/research-lifecycle/topic-selection-agent-profile-contracts.schema.test.ts src/research-lifecycle/topic-selection-debate-scenario-contracts.schema.test.ts src/research-lifecycle/topic-selection-agent-invocation-contracts.schema.test.ts`
- Result: passed; 11 tests passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts`
- Result: passed; 85 tests passed.
- Initial smoke command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-execution-plan-smoke-20260524-01 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=mocked_llm pnpm topic-selection:v1a-harness-e2e`
- Result: failed safely at N6 because the canonical slot execution plan selected provider-style default instance count and required `mocked_outputs.explorer[1]`.
- Fix: the debate loop now preserves fixture-count behavior for `mocked_llm` and `codex_assisted` slots unless explicit instance specs request multiple instances; provider slots keep contract default instance counts.
- Successful smoke command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-execution-plan-smoke-20260524-02 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=mocked_llm pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-execution-plan-smoke-20260524-02`.
- Smoke evidence: all N1-N9 nodes completed, N6 debate status was `succeeded`, `debate_role_invocation_count=3`, provider call count stayed zero, and N9 published `v1b_input_bundle_3a54a221-7b7f-4ddb-b324-5d7c34950156`.
- Follow-up smoke command after N5/N7/N8 `execution_spec` alignment: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-execution-plan-smoke-20260524-03 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=mocked_llm pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-execution-plan-smoke-20260524-03`; summary records N6 `debate_execution_plan`, N7 `harness_adjudication_execution_spec`, and zero provider calls.

## 2026-05-24 DeepSeek V4 Thinking Provider Verification
- Command: `node .ai/skills/workflows/llm/llm-engineering/scripts/check-llm-config-keys.mjs && node .ai/skills/workflows/llm/llm-engineering/scripts/validate-llm-registry.mjs`
- Result: passed; provider registry has 3 providers and DeepSeek env keys are allow-listed.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/llm-gateway.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 35 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: DeepSeek V4 thinking connectivity smoke using `.env.local`, `deepseek-v4-pro`, `thinking.type=enabled`, and `reasoning_effort=high`.
- Result: passed; parsed JSON `{ "ok": true, "provider": "deepseek" }`, telemetry `provider_id=deepseek`, `model_id=deepseek-v4-pro`, `request_count=1`, `input_tokens=114`, `output_tokens=46`, `total_tokens=160`.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.

## 2026-07-05 D-28 一次性脚本审计（对账收口）
- **方法**：只读代理逐脚本核查四判据（①业务语义经 backend 服务层或 `buildApp` HTTP 路由 ②无绕过 `BackendLlmGateway` 的直连 provider ③prisma 直写逐条分类 fixture vs 权威代产 ④无门禁绕过）；主会话对两 checker 脚本补钉核实（`grep prisma|Prisma|fetch(` 零命中）。
- **结论：18/18 合规（15 compliant + 3 compliant-with-notes），零违规。**

| 脚本 | 角色 | 判定 | 关键证据 |
|---|---|---|---|
| topic-selection-multisample-provider-batch.mjs | batch | compliant | 仅 prisma 只读 findMany；经 spawn 编排子脚本 |
| topic-selection-real-e2e.mjs | E2E | compliant-with-notes | 主链全经 `app.inject`（:959 起）；两处 prisma.update（:1733/:1755）为 bridge status active→superseded→还原的门禁负例 fixture 翻转 |
| topic-selection-v1a-harness-e2e.mjs | E2E | compliant-with-notes | 业务全经 `TopicSelectionWorkflowHarnessService` + HTTP 路由；prisma.$transaction（:1071-1117）为 T-112 balanced replay fixture 一次性种植（:1044 存在性守卫） |
| topic-selection-v1a-harness-negative-e2e.mjs | E2E | compliant | 仅 prisma count 只读；spawn 子进程验失败路径 |
| topic-selection-v1a-runtime-stress.mjs | stress | compliant | 仅 prompt-packet cache index 只读快照 |
| topic-selection-v1b-harness-e2e.mjs | E2E | compliant | 39+ service/repo DI 装配 + `app.inject`；零 prisma 直写 |
| topic-selection-v1b-near-prod-deep-test.mjs | deep-test | compliant | 经 pnpm spawn 编排 v1b harness/stress；无直接 DB |
| topic-selection-v1b-runtime-stress.mjs | stress | compliant | 仅 cache index 只读；spawn harness 子进程 |
| topic-selection-v1c-harness-acceptance.mjs | acceptance | compliant | InMemory 仓储 DI；全流程经 service 方法 |
| topic-selection-v1c-n2-runtime-smoke.mjs | smoke | compliant | InMemory+Prisma 混合仓储 DI；零 fixture 直写 |
| topic-selection-v1c-n4-runtime-smoke.mjs | smoke | compliant | 18+ service/repo 实例；`app.inject` 走 N4 路由 |
| topic-selection-v1c-n6-runtime-smoke.mjs | smoke | compliant | 11+ service 实例；确定性 fixture 经 DI |
| topic-selection-v1c-production-depth.mjs | product-run | compliant | 极小 import 面；单 service 实例；零写 |
| topic-selection-v1c-real-codex-acceptance.mjs | acceptance | compliant | 11+ services；codex 集成；零 prisma 写 |
| topic-selection-v1c-runtime-stress.mjs | stress | compliant | spawn runtime smoke 场景；无直接 DB |
| topic-selection-w15-s4-signoff-product-run.mjs | product-run | compliant-with-notes | env 选 prisma 仓储（:33-36，buildApp import 前，既定模式）；sign-off 门全链经 coordinator + HTTP；复用 run9 v1a bundle，脚本自身零写 |
| topic-selection-workflow-matrix-consistency.mjs | checker | compliant | 纯文档↔契约常量比对；主会话补钉：零 prisma/fetch 引用 |
| topic-selection-workflow-scenario-runner.mjs | runner | compliant | spawn 子脚本 + 质量断言；注册 scenario id 2 枚；主会话补钉：零 prisma/fetch 引用 |
