# 04 Verification

## Status
- Verification runs are recorded below. New implementation must add focused checks next to the decision or slice it validates.

## 2026-05-23 v1a Generate-Need-Candidate Per-Slot Model Options
- Update: v1a need-discovery debate can now select provider model options per role/stage slot while preserving the DMP execution-mode boundary.
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
  - per-slot model options are legal only for `provider_llm` slots;
  - Codex substitution and provider option selection are independent controls;
  - malformed override values and non-provider override use return `INVALID_PAYLOAD`;
  - mixed Codex/provider debate E2E completed through v1a publish-v1b-input-bundle with three persisted candidate refs.

## 2026-05-23 v1a Generate-Need-Candidate Negative E2E
- Update: added negative E2E coverage for invalid slot model-option use and fixed profile resolver error specificity.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
- Result: passed.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 15 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=v1a-negative-slot-options-20260523205126 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c pnpm topic-selection:v1a-harness-negative-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/v1a-negative-slot-options-20260523205126`.
- Coverage:
  - invalid model option on a Codex-assisted slot fails before harness startup;
  - cross-profile model option on a provider slot fails inside `generate-need-candidate`;
  - no `NeedCandidate`, `ValidatedNeed`, or v1b input bundle authority writes occur in either case.

## 2026-05-24 v1a Negative E2E Diagnostics And Robustness
- Update: hardened the negative E2E wrapper to persist per-case stdout/stderr/summary artifacts and reran the focused robustness suite.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
  - Result: passed.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs && node --check .ai/scripts/topic-selection-v1a-harness-negative-e2e.mjs`
  - Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=diagnostic-negative-20260524 pnpm topic-selection:v1a-harness-negative-e2e`
  - Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/diagnostic-negative-20260524`.
- Command: `TOPIC_SELECTION_V1A_HARNESS_NEGATIVE_RUN_ID=n6-replay-negative-20260524 pnpm topic-selection:v1a-harness-negative-e2e`
  - Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-negative-e2e/n6-replay-negative-20260524`.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-resource-sampling-service.unit.test.ts src/routes/topic-selection-resource-sampling-routes.integration.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
  - Result: passed; 31 tests passed.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-resource-sampling-service.unit.test.ts src/routes/topic-selection-resource-sampling-routes.integration.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
  - Result: passed; 103 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed.
- Command: `git diff --check`
  - Result: passed.
- Coverage:
  - invalid non-provider slot model-option override still fails before authority writes;
  - cross-profile provider slot override still fails at `harness generate-need-candidate`;
  - each negative case now records the child process output and harness summary before wrapper assertions run, so future failures are diagnosable without rerunning.
  - N6 generate-need-candidate exact replay returns the existing discovery trace snapshot, does not recompile context, does not call provider/Codex/debate again, and does not create duplicate authority rows.
  - N6 same-attempt input hash drift fails with `VERSION_CONFLICT` before context compilation, provider/Codex/debate invocation, or authority writes.
  - N7/N8/N9 exact replay/idempotency tests remain green in the same focused suite.

## 2026-05-24 v1a Combined Provider-Path Stability
- Update: ran the combined provider-backed canary for all model-participating v1a nodes in one flow: N5 evidence extraction, N6 generate-need-candidate, and N7 validate-need-adjudication recommendation.
- Command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-combined-provider-stability-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-combined-provider-stability-20260524-01`.
- Provider-call continuity:
  - Harness LLM call count was exactly `3`.
  - Call 1: stage `harness build-evidence-map`, profile `topic-selection.evidence-map-extraction.single-agent.v1`, schema `TopicSelectionEvidenceMapExtractionDraft@v1`.
  - Call 2: stage `harness generate-need-candidate`, profile `topic-selection.generate-need-candidate.single-agent.v1`, schema `topic_selection_ranked_candidate_draft_batch`.
  - Call 3: stage `harness validate-need-adjudication`, profile `topic-selection.need-adjudication.single-agent.v1`, schema `TopicSelectionNeedAdjudicationRecommendationPacket@v1`.
- Persisted-chain evidence:
  - DB readback: a custom Prisma readback against `.env.local` confirmed EvidenceMap unit counts, candidate count, selected-candidate adjudication/validated-need links, support-packet residual risks, adjudication residual risks, and v1b bundle risk/gap carry-forward.
  - Resource sample set `resource_sample_set_73c1ab77-9715-4be7-9f0e-cfce7d137d35` was `ready_with_warning` with `CONTEXT_CAP_APPLIED`.
  - N5 persisted EvidenceMap `evidence_map_50253033-339c-40a4-9bec-220790e3783a` with 4 EvidenceUnits: 1 support, 1 challenge, 1 baseline, and 1 context.
  - N6 persisted 5 NeedCandidates; selected candidate `need_candidate_3d9075ae4e4ad6c28ec2dc93` carried role-correct evidence refs plus `METHOD_FAMILY_COVERAGE_GAP`.
  - N7 produced support packet `validation_packet_f20f28f1-c90b-4b12-8317-93fc3a2d6fb5` and adjudication `need_adjudication_94367b53-352f-40d6-97d9-4617f8cabca6`; residual risk refs were retained.
  - N8/N9 completed through validated need `validated_need_ed17dad3-a09e-4ff1-b5cb-ff4eca31b3be` and v1b input bundle `v1b_input_bundle_7b57ee48-2e4f-4f88-b563-04541095f208`.
  - The v1b bundle preserved residual risk refs and gap codes, including `METHOD_FAMILY_COVERAGE_GAP`.
- Continuity result:
  - N5 provider output was materialized by deterministic authority code before N6 consumption.
  - N6 provider output passed deterministic admission and persisted bounded candidates before N7 consumption.
  - N7 provider recommendation did not erase residual risks or method-family warnings; the authority chain carried them to N9.
  - No fallback provider path, hidden retry path, or mode-specific handoff shape was observed in this run.

## 2026-05-24 v1a Provider-Path Depth And N7 Negative Canary
- Update: broadened the combined provider path from 4 to 8 literature samples and added a provider-backed N7 negative canary.
- First 8-literature command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-combined-provider-depth-8lit-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=8 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: failed safely at the harness assertion layer after N5 produced only 7 EvidenceUnits for 8 selected literature refs.
- Fix:
  - N5 materialization now blocks with `EVIDENCE_UNIT_MISSING_FOR_INPUT_LITERATURE` when any `literature_record` in `SearchRunHandoff.evidence_map_input_refs` has no draft unit.
  - The provider extraction prompt/context now makes full source-candidate coverage explicit.
  - Added a WorkflowHarness unit test proving incomplete extraction blocks before EvidenceMap/EvidenceUnit authority writes.
- Verification command:
  - `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 74 tests passed.
- Verification command:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- 8-literature rerun command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-combined-provider-depth-8lit-20260524-02 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=8 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-combined-provider-depth-8lit-20260524-02`.
- DB readback:
  - EvidenceMap `evidence_map_76c2479a-0d94-4416-864d-b0dd6dd2cb07` had 8 units: 2 support, 2 challenge, 2 baseline, 2 context.
  - All 8 selected literature ids were covered: `LIT-0025`, `LIT-0027`, `LIT-0028`, `LIT-0058`, `LIT-0096`, `LIT-0104`, `LIT-0106`, `LIT-0107`.
  - N6 persisted 3 NeedCandidates; selected candidate `need_candidate_73b5097c21282c58dc2a7fc9` carried `METHOD_FAMILY_COVERAGE_GAP`.
  - N7 validated with 3 residual/accepted risk refs; N9 v1b bundle carried the same risk refs and `METHOD_FAMILY_COVERAGE_GAP`.
- N7 provider negative command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-n7-provider-negative-clean-validate-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=none TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_NEGATIVE_PROBE=clean_validate TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed as a negative canary; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-n7-provider-negative-clean-validate-20260524-01`.
- N7 negative evidence:
  - Exactly 1 provider call occurred at `harness validate-need-adjudication`.
  - Provider output was routed through the normal `TopicSelectionNeedAdjudicationRecommendationPacket@v1` schema path.
  - N7 blocked with `RESIDUAL_RISK_DROPPED`.
  - DB readback confirmed support packet residual risk count `3`, open gaps including `METHOD_FAMILY_COVERAGE_GAP`, and zero Adjudication, ValidatedNeed, or v1b bundle authority writes for the selected candidate.
- N7 provider method-gap negative command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-n7-provider-negative-method-gap-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=none TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_NEGATIVE_PROBE=method_gap_drop TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed as a negative canary; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-n7-provider-negative-method-gap-20260524-01`.
- N7 method-gap negative evidence:
  - Exactly 1 provider call occurred at `harness validate-need-adjudication`.
  - The provider recommendation preserved 3 residual risk refs and 3 accepted risk refs but returned empty `gap_codes` and `required_actions`.
  - N7 blocked with `METHOD_FAMILY_COVERAGE_GAP_DROPPED`.
  - DB readback confirmed support packet residual risk count `3`, open gaps including `METHOD_FAMILY_COVERAGE_GAP`, and zero Adjudication, ValidatedNeed, or v1b bundle authority writes for the selected candidate.
- Guardrail unit coverage:
  - `diagnostic_prompt_appendix` is accepted only in `run_mode=acceptance`, so provider-negative probes cannot drift into product-mode adjudication calls.

## 2026-05-24 v1a Provider Breadth And Mixed N6 Debate Canary
- Update: executed both agreed provider-depth directions in order: a 12-literature combined provider run, then a mixed N6 debate/provider run.
- 12-literature command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-combined-provider-depth-12lit-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=12 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-combined-provider-depth-12lit-20260524-01`.
- 12-literature DB readback:
  - EvidenceMap `evidence_map_52a03151-e828-42f6-b631-fcb196f1dfdb` had 12 units with role counts 3 support, 3 challenge, 3 baseline, 3 context.
  - All 12 selected literature ids were covered.
  - N6 persisted 3 NeedCandidates; selected candidate `need_candidate_ca5ee714494ab00a61528b91` carried `METHOD_FAMILY_COVERAGE_GAP`.
  - N7 preserved 4 residual risk refs and gap codes; N9 v1b bundle carried residual risks and `METHOD_FAMILY_COVERAGE_GAP`.
- First mixed N6 debate/provider attempt:
  - Run `v1a-mixed-n6-debate-provider-20260524-02` failed safely at N6 admission.
  - Failure reason: provider-backed `arbiter.final_synthesis` produced a schema-valid candidate draft that placed baseline/challenge/context EvidenceUnits into `support_unit_refs`; deterministic admission rejected it with `ROLE_BUNDLE_EVIDENCE_ROLE_MISMATCH` and blocked with `NO_ADMISSIBLE_NEED_CANDIDATE`.
  - Authority behavior: no NeedCandidate persistence occurred for the malformed draft.
- Fix:
  - N6 single-agent and debate arbiter prompts now include explicit `role_ref_constraints` derived from `arbiter_context.evidence_ref_table`.
  - The constraints list allowed refs per role-bundle field and keep conflict/strength refs out of role bundles.
  - Added unit assertions that provider prompt payloads carry the role-specific allowed ref lists.
  - Added partial generate-need-candidate artifact capture on failed harness assertions to preserve block/admission diagnostics.
- Verification command:
  - `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 19 tests passed.
- Mixed N6 debate/provider rerun command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-mixed-n6-debate-provider-20260524-03 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=codex_assisted TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-mixed-n6-debate-provider-20260524-03`.
- Mixed-chain provider evidence:
  - Harness LLM call count was exactly `5`: N5 evidence extraction, N6 deep critic, N6 arbiter issue frame, N6 arbiter final synthesis, and N7 adjudication.
  - N6 debate status was `succeeded`; 3 role invocations were recorded because explorer used `codex_assisted` and the other debate slots used `provider_llm`.
  - N6 persisted 3 NeedCandidates and emitted `METHOD_FAMILY_COVERAGE_GAP`.
- Mixed-chain DB readback:
  - EvidenceMap `evidence_map_7b184adf-d02e-457e-b78a-9b48d617524c` had 4 units with 1 support, 1 challenge, 1 baseline, and 1 context.
  - Selected candidate `need_candidate_225367ac7cefd4d2d31175f5` had one role-bundle ref per field and every ref matched its EvidenceMap authority role.
  - N7 preserved 2 residual risk refs and accepted risk refs; N9 v1b bundle carried residual risks and `METHOD_FAMILY_COVERAGE_GAP`.
- Replay smoke command:
  - `set -a; source ./.env.local; set +a; TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-replay-smoke-post-role-ref-constraints-20260524 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_6f5d9bb8-5dd5-489d-984f-70c1816d3c6d TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 pnpm topic-selection:v1a-harness-replay-smoke`
- Result: passed; artifact dir `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-replay-smoke-post-role-ref-constraints-20260524`.
- Replay evidence:
  - N6-N9 exact replay returned replay provenance, preserved authority counts, and kept harness LLM call count at `0 -> 0`.
  - N6-N9 input hash drift blocked with `REPLAY_INPUT_HASH_MISMATCH`; authority counts stayed unchanged and harness LLM call count stayed `0 -> 0`.

## Matrix Acceptance Checks
- Every topic-selection workflow node has one row in `06-workflow-matrix.md`.
- The matrix contains the complete D-11 canonical node list before executor classification work begins.
- Every row has all required D-10 fields.
- Every non-deterministic row declares audit and artifact expectations.
- Every debate-allowed row has a corresponding node-level debate policy or an explicit pending marker.
- Every debate-rejected row records a rejection reason.
- Every Codex-allowed row records provenance and validation expectations.
- Every provider-required row records why Codex-assisted execution is insufficient.
- Every row references at least one planned or existing `WorkflowScenario` id.
- Deterministic and human-review rows use `default_execution_mode=none`.
- No row has `provider_required=yes` unless a node policy section explains why provider execution is mandatory.
- Initial `debate_allowed=yes` appears only on the four current D-12/D-17 debate-eligible nodes.

## Node Policy Acceptance Checks
- Every matrix row has a matching section in `07-node-policies.md`.
- Every node policy reserves all required D-13 fields.
- `TBD-node-policy-detail` is allowed only while T-089 is in design alignment.
- Before implementation of a node, its policy must remove `TBD-node-policy-detail` from preconditions, blockers, validators, execution modes, debate triggers, escalation refs, contract refs, authority boundaries, audit/artifact policy, and failure semantics.
- Debate-allowed nodes must define a concrete `debate_trigger_policy` before debate implementation.
- Codex-allowed nodes must define allowed execution modes and provenance expectations before Codex-assisted implementation.
- Policy detail work follows D-15 order: common vocabulary first, then the four debate-eligible nodes, then remaining single-agent nodes, then deterministic/human/downstream spine.
- A node can be marked `policy_status=implementation_ready` only after all D-13 fields are concrete and scenario assertions can cite the policy.

## Scenario Coverage Acceptance Checks
- Every matrix row has a non-empty `covered_scenarios` value.
- Every matrix scenario id exists in `08-scenarios.md`.
- No `TBD-scenario` placeholder remains after D-14.
- Provider-stability scenarios are listed only on model-like rows unless a deterministic row explicitly validates provider-derived input handling.
- Debate scenarios are listed only on D-12 debate-eligible nodes.
- Negative scenarios identify the stop node and assert downstream authority objects remain absent.
- Scenarios cite matrix rows and node policies as their business semantics source.

## D-16 Resource Sampling Policy Checks
- Resource sampling policy is at least `policy_status=draft`.
- The policy defines concrete preconditions, blockers, deterministic validators, execution modes, authority boundary, audit/artifact policy, and failure semantics.
- Debate roles are limited to arbiter, explorer, and deep critic by default.
- Arbiter has exactly one instance and owns issue framing, turn routing, synthesis, stop decision, and final structured output.
- Worker roles can have multiple agents, but same-role outputs must merge into a role-level summary before arbiter synthesis.
- Debate has bounded internal rounds and terminal outputs only: `finalize`, `blocked`, or `require_human_review`.
- Debate cannot automatically restart after terminal exit.
- Final debate output remains advisory and must pass deterministic guardrails before sample-set persistence.

## D-17 Need Discovery Split Checks
- `generate-need-candidate` is debate-eligible and may produce 1..5 persisted `NeedCandidate` records through the existing v1a service boundary.
- `validate-need-adjudication` is not debate-eligible in the initial matrix.
- The v1a debate scenario targets need discovery, not adjudication.
- No new `NeedCandidateSet` authority object, table, DTO, route, or persistence path is introduced by D-17.
- Candidate discovery output includes persisted NeedCandidate refs plus artifacted alternatives/rejections/merge hints, evidence refs, assumptions, uncertainty, scope notes, non-goals, and batch ranking.
- Candidate acquisition gate order is context compile, ranked draft batch, deterministic per-candidate gates, rejected-framing artifact, all-or-none authority write, and candidate-pool projection.
- Generate-need-candidate debate cannot create `ValidatedNeed` or mutate SearchPlan authority.
- Adjudication consumes one selected `NeedCandidate`, sibling candidate-pool context, and support packet, then routes validate/return/recheck/reject/park/merge with human confirmation fallback.

## D-18 Context Cache Memory Checks
- Cache, compressed summaries, projection caches, and response reuse are not authority objects.
- No new execution mode is introduced for response cache reuse.
- Provider-required scenarios must not use historical response cache as live `provider_llm`.
- Local cost-saving response reuse must be explicit `codex_assisted` operator-approved reuse or `mocked_llm` replay/acceptance, with cache provenance and `non_provider=true`.
- Debate nodes distinguish `exploration_context` from `arbiter_context`.
- Explorer/deep-critic role calls consume `exploration_context`; arbiter calls consume `arbiter_context` plus role-level summaries and deterministic gate checklist.
- Shared context envelope includes node/run/attempt ids, context family, input refs/hash, compiler/policy/schema/profile/mode versions, cache key/hit, redaction policy, and created_at.
- `exploration_context` includes topic scope, evidence/resource/search digests, sibling candidate digest, decision memory digest, exploration/challenge prompts, allowed outputs, and forbidden outputs.
- `arbiter_context` includes node policy, output schema, authority boundary, max persisted candidates, deterministic gate checklist, role-level summaries, candidate pool digest, evidence ref table, rejected framing table, unresolved points, batch ranking rules, persistence rules, and failure rules.
- Durable memory enters only as constraint, warning, required challenge, duplicate/merge hint, recheck hint, risk carry-forward, or downstream challenge; it is not evidence.
- Context packet cache hits require exact match on input refs/hash, compiler version, policy version, schema version, execution mode, profile, and context family.
- Cached responses must still pass schema validation, deterministic gates, audit/artifact recording, and authority-write boundaries.

## D-19 Draft Mapping And Debate Workflow Checks
- Draft-to-`TopicSelectionNeedCandidateRecord` mapping is documented before final draft-batch schema lock.
- Direct persistence mapping is limited to candidate body/mechanism/scope/prior-art/evidence/conflict/strength/gap/speculative/confidence fields.
- Backend/runtime derives ids, status, version/hash, source refs, control-plane refs, artifact refs, result/merge refs, creator, and timestamps.
- `draft_id`, `rank`, batch rationale, arbiter rationale, rejected framings, unresolved points, recheck suggestions, duplicate/merge hints, and raw role transcripts are artifact-only.
- Need-discovery debate has one required exploration/critique round.
- Arbiter may request supplemental rounds only for scoped unresolved questions.
- Maximum total rounds is 3.
- After round 3, arbiter must emit `finalize`, `blocked`, or `require_human_review`.
- Supplemental rounds must not restart broad exploration.

## D-20 Ranked Candidate Draft Batch Minimum Schema Checks
- `ranked_candidate_draft_batch` is an artifact/model-output contract, not an authority object.
- Minimum schema includes `schema_version`, `draft_batch`, `drafts`, `rejected_framings`, and `unresolved_points`.
- `draft_batch` includes `batch_id`, `terminal_result`, and `ranking_rationale`.
- `terminal_result` is limited to `finalize`, `blocked`, or `require_human_review`.
- `finalize` requires at least one draft.
- `blocked` may have zero drafts but must include unresolved points or rejected framings with reason codes.
- `require_human_review` requires an unresolved point routed to human review.
- Draft count is capped by `max_persisted_candidates`.
- Draft ranks are unique and contiguous.
- Each draft includes fields required for deterministic gates and D-19 direct mapping.
- Rejected framings and unresolved points remain artifacts and do not create authority objects.
- `assumptions`, `uncertainty_notes`, `duplicate_or_merge_hint`, and `recheck_suggestions` are not v1 minimum required fields.

## D-21 NeedCandidate Draft Admission Gate Checks
- Candidate draft admission gates run after ranked draft batch schema validation and before any `NeedCandidate` authority write.
- `CandidateDraftAdmissionReport` is an artifact and not an authority object.
- Admission report includes `schema_version`, `batch_id`, `node_attempt_id`, `terminal_result`, `draft_results`, count fields, and blocking reason codes.
- Draft decisions are limited to `admit`, `reject_artifact_only`, `require_human_review`, `return_for_supplemental_round`, and `merge_hint_only`.
- Gate order is schema, reference integrity, scope, evidence sufficiency, mechanism sufficiency, novelty/duplicate, risk/speculation, and batch.
- Admitted drafts must have resolvable refs, in-scope need statements, support/challenge evidence, and a researchable mechanism.
- Duplicate drafts become merge hints and do not create authority rows.
- Speculative drafts require challenge/conflict refs or explicit scope limits.
- Zero admitted drafts can request supplemental round only while debate rounds remain; otherwise the node blocks or requires human review.
- Admission gates must not rewrite candidate content, invent refs, create `ValidatedNeed`, mutate `SearchPlan`, or perform partial authority writes.

## D-22 Supplemental Round Routing Checks
- `SupplementalRoundRoutingDecision` is produced before any optional supplemental round starts.
- Supplemental routing is an artifact decision and not an authority object.
- Routing decisions are limited to `run_supplemental_round`, `reject_without_supplement`, `block`, `require_human_review`, and `finalize_with_admitted_batch`.
- Supplemental rounds are allowed only for promising grounded drafts with supplementable reasons and remaining round budget.
- Supplementable reasons are targeted evidence/mechanism/scope/conflict/speculation/differentiation repair needs.
- Non-supplementable reasons include malformed schema/context, missing source refs, topic drift, exclusion/non-goal violation, ungrounded drafts, pseudo-gaps, pure duplicates, and exhausted round budget.
- Supplemental questions target explicit source draft ids and are capped at 5 per supplemental round.
- Supplemental workers must not reopen broad exploration, introduce unrelated candidate families, mutate authority objects, or call persistence paths.
- Supplemental output re-enters D-20 schema validation and D-21 admission gates before persistence.
- After round 3, routing cannot request another round.

## D-23 NeedCandidate Persistence Batch Checks
- `PersistNeedCandidateBatchCommand` consumes only drafts marked `admit` in `CandidateDraftAdmissionReport`.
- Persistence does not consume raw debate output, non-admitted drafts, rejected framings, unresolved points, hidden reasoning, or artifact rationale as authority fields.
- The write boundary remains `TopicSelectionNeedValidationService`/repository or a batch wrapper over the same repository boundary.
- No `NeedCandidateSet` or alternate candidate write path is introduced.
- Backend/runtime derives candidate ids, hash/version, statuses, authority refs, artifact/audit refs, creator/source metadata, and timestamps.
- `candidate_hash` excludes rank, rationale, role transcripts, hidden reasoning, rejected framings, unresolved points, and supplemental routing explanations.
- `idempotency_key` is derived from workflow/run/attempt/draft/admission inputs and replay returns the same persisted refs without duplicate insertion.
- Batch persistence returns `persisted_candidate_refs`, `candidate_pool_projection_ref`, and `candidate_pool_projection_hash`.
- Candidate-pool projection is a view over `NeedCandidate` rows and not a durable set authority.
- Empty admitted drafts, non-admitted draft persistence, unresolved refs, duplicate normalized keys, hash/version failures, or any per-draft failure block/rollback before partial persistence.

## D-24 GenerateNeedCandidate Node I/O Checks
- `GenerateNeedCandidateNodeInput` is the required external input contract for `topic-selection.v1a.generate-need-candidate.v1`.
- `GenerateNeedCandidateNodeResult` is the required external result contract for all execution modes.
- Input carries refs and context packet refs, not scattered raw DB records.
- `codex_assisted`, `provider_llm`, and `mocked_llm` share the same I/O shape.
- Result separates workflow `status` from agent/debate `terminal_result`.
- `succeeded` requires `terminal_result=finalize`, non-empty persisted candidate refs, projection ref/hash, and success artifact refs.
- `blocked` requires `terminal_result=blocked` and at least one failure artifact.
- `require_human_review` requires `terminal_result=require_human_review` and human-review reason metadata.
- `persisted_candidate_refs=[]` is allowed only for `blocked` or `require_human_review`.
- Downstream handoff is limited to persisted candidate refs, projection refs/hash, discovery audit ref, warnings, and error code.
- Downstream nodes must not consume raw debate transcripts or hidden reasoning as business input.
- The node must not create `ValidatedNeed`, `SearchPlan`, `NeedCandidateSet`, or a v1b input bundle.

## D-25 GenerateNeedCandidate Implementation Slice Checks
- D-25 is a construction plan and does not add a runtime authority object or alternate node I/O contract.
- Slice order is contracts/schema, artifact/ref boundary, context compiler integration, orchestrator adapter, draft schema validation, admission gates, supplemental routing, persistence batch, and WorkflowHarness scenarios.
- Contracts/schema slice defines DTO/schema/error-code contracts before business persistence or model calls.
- Artifact/ref boundary defines artifact refs/hash, redacted snapshot shape, and FunctionalRef resolution before orchestration depends on artifacts.
- Context compiler integration validates D-18 context packets before any LLM invocation.
- Orchestrator adapter keeps mocked/codex/provider outputs on the same node I/O shape.
- Draft schema validation implements D-20 before admission gates.
- Admission gates implement D-21 deterministic service logic before persistence and before provider/codex E2E is treated as meaningful.
- Supplemental routing implements D-22 and is first verified with mocked role outputs.
- Persistence batch implements D-23 through the existing service/repository boundary.
- WorkflowHarness scenarios cover happy path, zero admitted to supplemental, duplicate to merge hint, malformed draft blocked, persistence rollback, and execution-mode shape stability.
- Deterministic tests run before model-like execution tests, and mocked harness scenarios run before provider/codex scenarios.
- Guardrails remain no `NeedCandidateSet`, raw transcript handoff, mode-specific result shape, D-20/D-21/D-23 bypass, partial batch persistence, or cached response masquerading as `provider_llm`.

## 2026-05-19 D-17 Verification Runs
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: custom matrix/scenario consistency check for 21 matrix rows, 9 registered scenarios, missing scenario refs, debate refs on non-debate rows, and provider-stability refs on non-single-agent rows.
- Result: passed; missing refs `[]`, debate refs on non-debate rows `[]`, provider refs on non-single-agent rows `[]`.
- Command: custom matrix/policy/fill-order consistency check for 21 matrix nodes, 21 policy sections, phase coverage, duplicates, D-17 phase placement.
- Result: passed; missing/extra/duplicate nodes `[]`, `generate-need-candidate` is in Phase 1, `validate-need-adjudication` is in Phase 2.

## 2026-05-19 D-17 Repo-Compatibility Correction
- Correction: removed `NeedCandidateSet` as a proposed authority object and restored `NeedCandidate` as the generate-need-candidate authority object.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: custom D-17 consistency check for matrix rows, registered scenarios, debate refs, provider refs, `NeedCandidateSet` authority drift, existing Prisma `TopicSelectionNeedCandidate`, existing `POST /topic-selection/v1a/need-candidates`, and explicit no-`NeedCandidateSet` guard.
- Result: passed; generate row authority `NeedCandidate`, generate debate `yes`, adjudication debate `no`, missing scenario refs `[]`, bad `NeedCandidateSet` authority `false`, repo NeedCandidate/API guards `true`.
- Command: final D-17 matrix/scenario check after verification note update.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, provider refs on non-single-agent rows `[]`, generate authority `NeedCandidate`, generate debate `yes`, adjudication debate `no`, no `NeedCandidateSet` authority.

## 2026-05-19 D-17 Multi-Candidate Attempt Update
- Update: a successful generate attempt may persist a bounded batch of `1..5` independent `NeedCandidate` records.
- Update: invalid candidate drafts are not persisted; they are recorded as rejected-framing artifacts, and the attempt succeeds only when at least one candidate passes per-candidate gates.
- Command: custom D-17 multi-candidate consistency check for matrix/scenario refs, generate authority/output refs, generate/adjudication debate flags, no `NeedCandidateSet` authority, bounded-batch policy, and no stale exactly-one write rule.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, generate authority `NeedCandidate`, generate output plural refs present, generate debate `yes`, adjudication debate `no`, no `NeedCandidateSet` authority, bounded batch present, stale exactly-one rule absent.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-17 Batch Limit And Invalid Candidate Handling
- Update: increased generate-attempt persistence cap from 3 to 5 `NeedCandidate` records.
- Update: locked invalid candidate handling: rejected drafts are not persisted; the attempt succeeds only when at least one candidate passes per-candidate gates.
- Command: custom D-17 batch-limit consistency check for matrix/scenario refs, generate authority/output refs, generate/adjudication debate flags, no `NeedCandidateSet` authority, `1..5` bounded-batch policy, no stale `1..3` rule, invalid-candidate handling, and no stale exactly-one write rule.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, provider refs on non-single-agent rows `[]`, generate authority `NeedCandidate`, generate output plural refs present, generate debate `yes`, adjudication debate `no`, no `NeedCandidateSet` authority, bounded batch 5 present, stale batch 3 absent, invalid handling present, stale exactly-one rule absent.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-17 Candidate Acquisition Gate Order
- Update: locked candidate acquisition order as deterministic context compile -> ranked draft batch -> deterministic per-candidate gates -> rejected-framing artifact for invalid drafts -> all-or-none authority write for 1..5 valid candidates -> candidate-pool projection.
- Command: custom D-17 gate-order consistency check for matrix/scenario refs, generate/adjudication routing, no `NeedCandidateSet` authority, ranked draft batch as non-authority, deterministic gates before persistence, invalid drafts filtered before transaction, all-or-none valid batch persistence, notes alignment, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, provider refs on non-single-agent rows `[]`, generate authority `NeedCandidate`, generate output plural refs present, adjudication debate `no`, no `NeedCandidateSet` authority, gate order present, draft non-authority present, pre-persistence gate present, invalid pre-transaction filtering present, all-or-none present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-18 Context Cache Memory Policy
- Update: locked cache/context/memory policy with separate `exploration_context` and `arbiter_context`, no authority cache, and explicit cost-saving response reuse provenance.
- Command: custom D-18 consistency check for matrix/scenario refs, execution-mode vocabulary, no cached execution mode, D-18 existence, no-authority cache rule, response reuse policy, provider-cache non-masquerade, local cost-saving `codex_assisted`, `mocked_llm` replay, context families, generate-need-candidate node policy, scenario artifact expectations, notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, no cached execution mode, D-18 exists, cache is not authority, no new response-reuse execution mode, provider-cache masquerade blocked, local cost-saving `codex_assisted` present, `mocked_llm` replay present, context families present in joint decision and node policy, role context routing present, exact context cache key present, response reuse provenance present, scenario context expectations present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-18 Context Field Structure
- Update: locked shared context envelope, exploration payload, arbiter payload, durable memory admission roles, compression layers, context cache key, and default context size policy for v1a need discovery.
- Command: custom D-18 field-structure consistency check for matrix/scenario refs, shared envelope fields, `exploration_context` minimum fields, `arbiter_context` minimum fields, memory admission roles, scenario artifact expectations, cache key fields, family-specific cache isolation, notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, joint/policy/verification envelope coverage true, joint/policy/verification exploration coverage true, joint/policy/verification arbiter coverage true, memory admission true, scenario artifacts true, cache key true, family cache isolation true.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-19 Draft Mapping And Debate Workflow
- Update: locked draft-to-NeedCandidate mapping categories and v1a need-discovery debate workflow with optional arbiter-scoped supplemental rounds up to 3 total rounds.
- Command: custom D-19 consistency check for matrix/scenario refs, direct draft mapping fields, backend-derived fields, artifact-only fields, max 3 rounds, optional rounds 2/3, terminal outputs, no broad restart in supplemental rounds, scenario supplemental-round expectations, draft-to-record mapping report, notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-19 exists, direct mapping present, backend-derived fields present, artifact-only fields present, max 3 rounds present, terminal outputs present, no broad restart present, scenario mapping report present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-20 Ranked Candidate Draft Batch Minimum Schema
- Update: locked minimum schema for ranked candidate draft batch as artifact/model-output contract.
- Command: custom D-20 consistency check for matrix/scenario refs, D-20 joint decision, artifact-not-authority boundary, minimum schema fields, `draft_batch` fields, draft direct-mapping fields, rejected-framing fields, unresolved-point fields, terminal result rules, rank uniqueness/contiguity, non-required optional fields, scenario artifact expectations, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-20 exists, artifact-not-authority boundary present, joint/policy minimum fields present, terminal rules present, rank rules present, optional fields remain non-required, scenario expects ranked candidate draft batch artifact and minimum schema validation report.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-21 NeedCandidate Draft Admission Gates
- Update: locked deterministic draft admission gates and `CandidateDraftAdmissionReport` before `NeedCandidate` persistence.
- Command: custom D-21 consistency check for matrix/scenario refs, D-21 joint decision, `CandidateDraftAdmissionReport` artifact boundary, admission decisions, gate order, report fields, no content rewrite/ref invention, duplicate merge-only handling, speculative draft constraints, zero-admit supplemental/block/review semantics, output contract refs, audit artifacts, scenario artifact expectations, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-21 exists, admission report artifact present, joint/policy decisions present, gate order present, report fields present, no-rewrite boundary present, duplicate merge-only behavior present, speculative constraints present, zero-admit semantics present, scenario expects CandidateDraftAdmissionReport and admission gate decisions.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-22 Supplemental Round Routing Policy
- Update: locked supplemental round routing and `SupplementalRoundRoutingDecision` for optional repair rounds in `generate-need-candidate`.
- Command: custom D-22 consistency check for matrix/scenario refs, D-22 joint decision, `SupplementalRoundRoutingDecision` artifact boundary, routing decisions, artifact fields, supplementable/non-supplementable reasons, explicit source draft ids, question cap, no broad re-exploration, no authority mutation, re-entry through D-20/D-21 gates, round-3 terminal behavior, output contract refs, audit artifacts, scenario artifact expectations, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-22 exists, routing artifact present, joint/policy routing decisions present, artifact fields present, supplementable and non-supplementable reasons present, explicit draft ids and question cap present, no broad re-exploration present, D-20/D-21 re-entry present, round-3 terminal behavior present, scenario expects SupplementalRoundRoutingDecision.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-20 Shared Invocation Provenance Runtime Consumption
- Update: consumed the T-088 shared invocation provenance/audit envelope as the future debate attempt audit shape.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-agent-invocation-contracts.schema.test.ts`
- Result: passed; 4 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 19 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 100 tests passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply --project main`
- Result: passed; project hub regenerated.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - debate-capable future role attempts have a shared core provenance envelope plus optional `debate_extension`;
  - ordinary single-agent and future debate calls no longer need separate audit shapes;
  - mock/Codex/provider source differences remain explicit in provenance instead of changing node result contracts.

## 2026-05-19 D-23 NeedCandidate Persistence Batch Contract
- Update: locked admitted-draft batch persistence contract, idempotency, backend-derived fields, all-or-none writes, and candidate-pool projection refs/hash.
- Command: custom D-23 consistency check for matrix/scenario refs, D-23 joint decision, `PersistNeedCandidateBatchCommand`, command/draft fields, admitted-only input, no raw debate/artifact authority fields, existing service/repository write boundary, no `NeedCandidateSet`, backend-derived fields, hash/version/idempotency rules, artifact/audit attachment, candidate-pool projection refs/hash, failure semantics, rollback/all-or-none behavior, scenario artifact expectations, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-23 exists, command contract present, command/draft fields present, admitted-only input present, no raw output/rationale authority path present, existing write boundary present, no NeedCandidateSet path present, derived fields present, hash/idempotency rules present, projection refs/hash present, failure codes present, rollback/all-or-none behavior present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-24 GenerateNeedCandidate Node I/O Contract
- Update: locked external node input/result contracts, status versus terminal semantics, required artifacts by status, shared shape across execution modes, downstream handoff boundary, and node non-authority exclusions.
- Command: custom D-24 consistency check for matrix/scenario refs, D-24 joint decision, `GenerateNeedCandidateNodeInput`, `GenerateNeedCandidateNodeResult`, input/result fields, artifact fields, input refs/context-only rule, shared execution-mode shape, status/terminal mappings, empty persisted refs rule, required artifact refs by status, error code set, downstream handoff refs, no raw transcript handoff, no `ValidatedNeed`, no `SearchPlan`, no `NeedCandidateSet`, no v1b input bundle, scenario artifact expectations, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-24 exists, input/result contracts present, fields present, artifact refs present, refs-only input rule present, shared execution-mode shape present, status/terminal mappings present, required artifact constraints present, error codes present, downstream handoff boundary present, no raw transcript or forbidden authority creation path present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 D-25 GenerateNeedCandidate Implementation Slice
- Update: locked implementation slice order and staged verification policy for `generate-need-candidate`.
- Command: custom D-25 consistency check for matrix/scenario refs, D-25 joint decision, construction-plan-only boundary, implementation slice order, contracts-first rule, artifact/ref boundary, context-before-LLM rule, shared orchestrator output shape, D-20/D-21/D-22/D-23 implementation order, WorkflowHarness scenario coverage, deterministic-before-LLM verification, mocked-before-provider/codex verification, scenario artifact expectations, implementation guardrails, implementation notes, and verification coverage.
- Result: passed; 21 rows, 9 scenarios, missing refs `[]`, debate refs on non-debate rows `[]`, D-25 exists, construction-only boundary present, slice order present in joint decision and node policy, contracts/artifacts/context/orchestrator prerequisites present, D-20/D-21/D-22/D-23 order present, scenario coverage present, deterministic-before-LLM and mocked-before-provider/codex order present, guardrails present.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md`
- Result: passed.

## 2026-05-19 Current State Mapping
- Update: added `09-current-state-map.md` to map the D-25 implementation slices to current repository anchors before coding.
- Scope finding: D-17 through D-25 are deeply focused on `topic-selection.v1a.generate-need-candidate.v1`; T-089 as a task still covers resource sampling, v1a, v1b, v1c, and downstream rows in the workflow matrix.
- Gap finding: current repo has reusable NeedCandidate, control-plane, route, repository, Prisma, and LLM gateway anchors, but lacks the node I/O contracts, draft/admission/routing/persist contracts, context compiler, `AgentOrchestrator`, admission gates, supplemental routing, batch/idempotent persistence, and `WorkflowHarness` scenarios required by D-25.
- Command: custom current-state mapping consistency check for scope answer, matrix breadth, policy depth, nine D-25 slices, NeedCandidate anchors, control-plane anchors, LLM anchors, route anchors, missing runtime gaps, no-`NeedCandidateSet` boundary, implementation notes, and verification entry.
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.

## 2026-05-19 D-26 Cross-Version Boundary
- Update: locked lightweight v1a -> v1b -> v1c handoff boundaries before D-25 `contracts_schema` implementation.
- Command: custom D-26 consistency check for joint decision, T-089 boundary doc, implementation notes, v1a/v1b/v1c authority handoff rules, no raw debate handoff, candidate-pool projection default boundary, no `NeedCandidateSet`, and D-25 contract implications.
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/10-cross-version-boundaries.md`
- Result: passed.

## 2026-05-19 D-25 `contracts_schema` Implementation
- Update: implemented shared v1a generate-need-candidate DTO/schema/error-code contracts.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts apps/backend/src/services/topic-selection-candidate-draft-admission-service.ts apps/backend/src/services/topic-selection-candidate-draft-admission-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: custom D-25 `admission_gates` quality review consistency check for required normalized keys, human-review fallback target, same-batch duplicate coverage, pseudo-gap coverage, and docs.
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: custom D-25 `contracts_schema` consistency check for exported schemas, execution/status/admission/routing/error vocabularies, D-20/D-24 contract presence, D-26 no-v1b/v1c field leakage, schema tests, implementation notes, and verification entry.
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md dev-docs/active/topic-selection-agent-workflow-review/10-cross-version-boundaries.md dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md`
- Result: passed.

## 2026-05-19 D-25 `artifact_ref_boundary` Implementation
- Update: implemented shared artifact snapshot/ref-bundle contracts and backend need-discovery artifact boundary helper.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts src/services/topic-selection-control-plane-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: custom D-25 `artifact_ref_boundary` consistency check for shared artifact contracts, backend helper, redaction guards, control-plane write/read boundary, FunctionalRef resolution, checksum verification, tests, implementation notes, and current-state map.
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts apps/backend/src/services/topic-selection-control-plane-service.ts apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md dev-docs/active/topic-selection-agent-workflow-review/10-cross-version-boundaries.md dev-docs/active/topic-selection-workflow-runtime-foundation/06-joint-decisions.md`
- Result: passed.

## 2026-05-19 D-25 `context_compiler_integration` Implementation
- Update: implemented shared context packet contracts and backend D-18 context compiler helper for `exploration_context` and `arbiter_context`.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 6 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: custom D-25 `context_compiler_integration` consistency check for shared context contracts, context artifact keys, backend compiler helper, exact cache key builder, family-specific resolve, forbidden raw-context guard, tests, implementation notes, and current-state map.
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.ts apps/backend/src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.

## 2026-05-19 D-25 Three-Slice Quality Review And Fixes
- Update: reviewed and tightened the first three implemented D-25 slices.
- Fixes:
  - artifact/context refs are now constrained to `ref_type=artifact_ref` where D-25 semantics require artifact refs.
  - schema tests now reject `context_packet` refs in `GenerateNeedCandidateNodeInput`.
  - artifact boundary now validates source refs, artifact keys, bundle entries, and snapshot `payload_hash` on resolve.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 7 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.

## 2026-05-19 D-25 `orchestrator_adapter` Initial Implementation
- Update: started the fourth slice by adding the reusable T-088 `AgentOrchestrator` runtime helper.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 11 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; . ./.env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 578 backend tests total, 577 passed, 1 skipped, 0 failed.
- Coverage:
  - stable normalized result shape across `mocked_llm`, `codex_assisted`, and `provider_llm`;
  - provider execution routes through `BackendLlmGateway`;
  - non-provider modes are provenance-labeled and provider-distinguishable;
  - `mocked_llm` product-mode use is rejected;
  - invalid structured output blocks without mode-specific result shape;
  - forbidden raw/hidden fields block;
  - audit artifacts store hashes/provenance rather than full structured outputs.

## 2026-05-19 D-25 `orchestrator_adapter` Node Adapter Implementation
- Update: added the generate-need-candidate node adapter that consumes context packet refs and invokes `AgentOrchestrator`.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 14 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-agent-orchestrator-service.ts apps/backend/src/services/topic-selection-agent-orchestrator-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md`
- Result: passed.
- Command: custom D-25 `orchestrator_adapter` node-adapter consistency check for context resolution, expectation guards, execution mode coverage, gateway path separation, ranked batch artifact write boundary, implementation notes, verification, and current-state map.
- Result: passed.
- Coverage:
  - adapter succeeds through `mocked_llm`, `codex_assisted`, and `provider_llm` using one result shape;
  - provider mode calls the gateway path while non-provider modes do not;
  - stale/mismatched context packet expectations block before invocation;
  - ranked batch artifact is written only after orchestrator schema validation succeeds;
  - blocked output does not create a ranked draft batch artifact.

## 2026-05-19 D-25 `draft_schema_validation` Implementation
- Update: added deterministic minimum semantic validation for `RankedCandidateDraftBatch` before admission gates.
- Initial command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Initial result: failed; exposed a validator test fixture issue and an adapter type narrowing issue around arbiter context payload access.
- Fix: made the invalid fixture consistently ungrounded and narrowed `arbiter_context` before reading `max_persisted_candidates`.
- Final command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Final result: passed; 18 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed after the arbiter payload type narrowing fix.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Initial command: `pnpm --filter @paper-engineering-assistant/shared test`
- Initial result: failed; the new negative schema assertion used an extra field, which Fastify did not reject under the current validation behavior.
- Fix: changed the negative schema assertion to an invalid `severity` enum value.
- Final command: `pnpm --filter @paper-engineering-assistant/shared test`
- Final result: passed; 92 tests passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts apps/backend/src/services/topic-selection-ranked-candidate-draft-batch-validator-service.ts apps/backend/src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: custom D-25 `draft_schema_validation` consistency check for shared report schema, deterministic validator, adapter artifact boundary, documentation, verification, and current-state map.
- Result: passed.
- Coverage:
  - shared contract exposes `RankedCandidateDraftBatchMinimumValidationReport`;
  - validator accepts grounded finalize batches;
  - validator blocks semantic drift before admission gates;
  - validator allows explained empty blocked batches;
  - adapter writes `minimum_schema_validation_report` before ranked batch artifact;
  - invalid semantic output blocks with `INVALID_RANKED_CANDIDATE_DRAFT_BATCH`;
  - invalid semantic output does not write `ranked_candidate_draft_batch`.

## 2026-05-19 D-25 `admission_gates` Implementation
- Update: added deterministic `CandidateDraftAdmissionReport` generation before persistence.
- Initial command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Initial result: failed; admission service tests passed, but adapter test failed at load because the adapter accessed arbiter-only context payload fields without narrowing the context family.
- Fix: narrowed `arbiter_context` before extracting `evidence_ref_table`, `rejected_framing_table`, and `unresolved_points`.
- Final command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Final result: passed; 24 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.
- Command: `git diff --check -- packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts apps/backend/src/services/topic-selection-candidate-draft-admission-service.ts apps/backend/src/services/topic-selection-candidate-draft-admission-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: custom D-25 `admission_gates` consistency check for shared D-21 fields, no authority writes, admission gate reason codes, adapter artifact boundary, documentation, verification, and current-state map.
- Result: passed.
- Coverage:
  - shared `CandidateDraftAdmissionReport` schema now includes D-21 result fields;
  - grounded non-duplicate drafts are admitted;
  - duplicate normalized keys become `merge_hint_only`;
  - unresolved refs and pseudo-gap mechanisms are rejected before persistence;
  - speculative drafts route to supplemental or human review based on remaining round budget;
  - admission refuses failed minimum validation reports;
  - adapter records `candidate_draft_admission_report` after ranked batch artifact;
  - adapter blocks admission failures while preserving admission artifact evidence.

## 2026-05-19 D-25 `admission_gates` Quality Review Fixes
- Update: reviewed the admission implementation and fixed two quality issues plus two test gaps.
- Fixes:
  - `normalized_candidate_key` is now required by the shared `CandidateDraftAdmissionReport` TypeScript interface and JSON schema;
  - speculative drafts routed to `require_human_review` now carry a fallback source `candidate_draft` review point when no conflict/risk refs exist;
  - same-batch duplicate normalized keys are covered;
  - pseudo-gap rejection is covered independently from unresolved-ref rejection.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 26 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 92 tests passed.

## 2026-05-19 D-25 `supplemental_routing` Implementation
- Update: added deterministic `SupplementalRoundRoutingDecision` generation after admission and before any optional supplemental round.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-supplemental-round-routing-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-supplemental-round-routing-service.unit.test.ts src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 33 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck && pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; shared typecheck passed and 92 schema tests passed.
- Initial command: `pnpm --filter @paper-engineering-assistant/backend test`
- Initial result: failed because Prisma smoke tests require `DATABASE_URL` when run without loading `.env.local`; unrelated to this slice.
- Final command: `set -a; . ./.env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Final result: passed; 565 backend tests total, 564 passed, 1 skipped, 0 failed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.
- Command: custom D-25 `supplemental_routing` consistency check for service presence, round-budget guard, round-3 guard, question cap, allowed roles, forbidden persistence, adapter artifact order, no persistence-command write, tests, current-state map, implementation notes, and verification entry.
- Result: passed; 14 checks passed.
- Coverage:
  - routing finalizes admitted batches;
  - routing requests scoped supplemental rounds only when round budget remains and current round is before round 3;
  - supplemental questions are capped at 5 and target explicit source draft ids;
  - exhausted budget or round 3 blocks rather than requesting another round;
  - human-review admission outcomes route to `require_human_review`;
  - duplicate/non-supplementable outcomes route to `reject_without_supplement`;
  - adapter records `supplemental_round_routing_decision` after admission;
  - adapter does not write `persist_need_candidate_batch_command` in the supplemental routing slice.

## 2026-05-19 D-25 `persistence_batch` Implementation
- Update: added admitted-only batch command construction, optional adapter persistence, and repository batch writes without adding a new authority object.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts`
- Result: passed; 5 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts src/services/topic-selection-supplemental-round-routing-service.unit.test.ts src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts`
- Result: passed; 39 tests passed.
- Command: `set -a; . ./.env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 571 backend tests total, 570 passed, 1 skipped, 0 failed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `git diff --check -- apps/backend/src/repositories/topic-selection-need-validation.repository.ts apps/backend/src/repositories/in-memory-topic-selection-need-validation-repository.ts apps/backend/src/repositories/prisma/prisma-topic-selection-need-validation-repository.ts apps/backend/src/services/topic-selection-persist-need-candidate-batch-service.ts apps/backend/src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/09-current-state-map.md`
- Result: passed.
- Command: custom D-25 `persistence_batch` consistency check for admitted-only command construction, zero-admitted guard, duplicate normalized guard, deterministic ids, projection ref, repo batch method, memory preflight, Prisma transaction, optional adapter persistence flag, command artifact write, tests, no `NeedCandidateSet`, no new candidate hash columns, docs, current-state map, and full backend verification entry.
- Result: passed; 18 checks passed.
- Coverage:
  - command builder includes admitted drafts only and stable idempotency keys;
  - zero-admitted commands fail before writes;
  - duplicate normalized candidate keys fail before writes;
  - in-memory batch create is all-or-none for duplicate batch versions;
  - adapter default path remains artifact-only;
  - adapter explicit persistence path records `persist_need_candidate_batch_command`;
  - explicit persistence path writes NeedCandidate refs and replays idempotently without duplicates;
  - supplemental routing paths still do not write persistence commands.
- Residual storage note:
  - no Prisma schema migration was added in this slice;
  - explicit `candidate_hash`, `normalized_candidate_key`, and batch idempotency columns remain a future DB-hardening option if exact D-23 storage is required.

## 2026-05-19 D-25 `workflow_harness_scenarios` Implementation
- Update: added `TopicSelectionWorkflowHarnessService` and mocked generate-need-candidate harness scenarios.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 7 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-persist-need-candidate-batch-service.unit.test.ts src/services/topic-selection-supplemental-round-routing-service.unit.test.ts src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-ranked-candidate-draft-batch-validator-service.unit.test.ts`
- Result: passed; 35 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 722 tests total, 721 passed, 1 skipped, 0 failed.
- Coverage:
  - harness compiles context packets and passes only context refs into the node input;
  - mocked finalize path persists admitted NeedCandidates only through the adapter/persistence service boundary;
  - supplemental routing path records routing output and keeps authority persistence absent;
  - negative admission blocker path records blockers and keeps NeedCandidate rows absent;
  - duplicate candidates become merge hints and do not write new NeedCandidate rows;
  - malformed structured output blocks before ranked/minimum/admission/routing artifacts;
  - mocked, codex-assisted, and provider-backed runs share the same harness/adapter result shape;
  - persistence conflicts reject without creating a partial duplicate batch;
  - harness records `discovery_audit` trace artifacts with context refs, adapter artifacts, authority refs, warnings, blockers, and assertion results;
  - provider/codex execution is not reimplemented by the harness and remains behind `AgentOrchestrator`.
- Remaining after this slice:
  - supplemental worker execution is still not implemented;
  - multi-agent debate loop was not implemented in the D-25 harness slice; the initial need-discovery debate runtime is recorded in the 2026-05-20 update below;
  - route/CLI wrappers have not yet been migrated to call the harness;
  - provider-quality and Codex-assisted real acceptance scenarios remain staged beyond the current shape-stability harness case.

## 2026-05-20 Need-Discovery Debate Runtime Consumption
- Update: consumed the T-088 initial multi-agent debate loop implementation for the T-089 `generate-need-candidate` workflow policy.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 4 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts`
- Result: passed; 12 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-discovery-artifact-boundary-service.unit.test.ts src/services/topic-selection-need-discovery-context-compiler-service.unit.test.ts`
- Result: passed; 36 tests passed.
- Command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/title-card-management-contracts.schema.test.ts`
- Result: passed; 48 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: passed; 100 tests passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 589 tests total, 588 passed, 1 skipped.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.ts apps/backend/src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts apps/backend/src/services/topic-selection-workflow-harness-service.ts apps/backend/src/services/topic-selection-workflow-harness-service.unit.test.ts apps/backend/src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.ts apps/backend/src/services/topic-selection-agent-orchestrator-service.ts apps/backend/src/services/topic-selection-model-profile-registry-service.ts apps/backend/src/services/topic-selection-need-discovery-artifact-boundary-service.ts packages/shared/src/research-lifecycle/topic-selection-need-validation-contracts.ts packages/shared/src/research-lifecycle/title-card-management-contracts.schema.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/04-verification.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/04-verification.md`
- Result: passed.
- Coverage:
  - mocked `multi_agent_debate` scenario invokes explorer, deep critic, arbiter issue framing, and arbiter final synthesis;
  - multiple explorer instances are supported as same-role instances, not as provider lists;
  - role outputs are artifact/audit inputs only and do not write `NeedCandidate`;
  - arbiter final synthesis is the only structured output consumed by downstream D-20/D-21/D-22 gates;
  - blocked arbiter issue framing remains auditable as a role invocation without creating issue-frame or final-synthesis artifacts;
  - WorkflowHarness trace includes debate artifacts while keeping authority refs empty when persistence is disabled;
  - unsupported debate roles are rejected by shared schema validation;
  - missing mandatory role packets block the runtime instead of silently degrading the debate.
- Remaining after this update:
  - route/CLI wrappers have not yet been migrated to call the harness;
  - provider/Codex debate role execution has not yet produced real-flow acceptance evidence;
  - supplemental repair loop automation remains pending.

## 2026-05-20 v1a Debate Scenario Contract SSOT
- Update: added the executable shared v1a generate-need-candidate debate scenario contract and wired the debate loop to consume it.
- Initial command: `pnpm --filter @paper-engineering-assistant/shared test -- topic-selection-debate-scenario-contracts.schema.test.ts`
- Result: failed due incorrect pnpm script argument forwarding; the runner looked for `packages/shared/topic-selection-debate-scenario-contracts.schema.test.ts`.
- Corrected command: `cd packages/shared && node --test --loader ts-node/esm src/research-lifecycle/topic-selection-debate-scenario-contracts.schema.test.ts`
- Result: passed; 2 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-model-profile-registry-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Initial command: `pnpm --filter @paper-engineering-assistant/shared test`
- Result: failed because the barrel re-export exact-surface test had not yet included the new debate scenario contract module.
- Corrected command: `pnpm --filter @paper-engineering-assistant/shared test`
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
  - shared schema accepts the concrete v1a need-discovery debate contract;
  - shared schema rejects automatic fallback and provider-specific parameter drift inside the scenario contract;
  - research-lifecycle barrel exports the new debate scenario contract;
  - debate loop consumes contract defaults for provider execution and makes two explorer calls, one deep critic call, one arbiter issue-frame call, and one final-synthesis call;
  - slot-level Codex substitution can run a worker slot while final synthesis remains provider-backed;
  - final synthesis rejects `codex_assisted` slot override with `INVALID_PAYLOAD`;
  - provider calls resolve to OpenAI `gpt-5.4-mini` through the model profile registry with medium normalized params and no provider overrides;
  - DMP-04 is aligned with runtime strictness: `arbiter.final_synthesis` is Codex-forbidden in the v1 executable contract.

## 2026-05-20 Codex Boundary And Product Real E2E Check
- Codex substitution boundary remains slot-level, explicit, and non-provider:
  - allowed in the current executable v1a debate contract for `explorer.round_1_discovery`, `deep_critic.round_1_discovery`, and `arbiter.issue_framing`;
  - forbidden for `arbiter.final_synthesis`, provider-quality evidence runs, provider failure fallback, and any direct authority write;
  - final synthesis must remain `provider_llm` in real execution or `mocked_llm` in isolated tests.
- Successful product E2E used OpenAI provider mode with an existing provider-generated resource sample set:
  - run id `real-e2e-1779248422005-c0dfd5`;
  - artifact dir `.ai/.tmp/topic-selection-real-e2e/real-e2e-1779248422005-c0dfd5`;
  - provider/model `openai/gpt-5.4-mini`;
  - sample set `resource_sample_set_eaf6437e-a88c-43ef-8e65-2216ffd2272e`.
- This product E2E predates the canary harness migration below; provider/Codex mixed debate real-flow evidence and full scenario-wrapper migration remain separate pending acceptance targets.

## 2026-05-20 v1a Flow Convergence: Build Evidence Map
- Update: converged `topic-selection.v1a.build-evidence-map.v1` node policy from stub to implementation-ready documentation.
- Evidence reviewed:
  - `TopicSelectionEvidenceMapService.createEvidenceMapFromSearchRun`;
  - `POST /topic-selection/v1a/evidence-maps` route schema;
  - shared `TopicSelectionEvidenceMapRecord`, `TopicSelectionEvidenceUnitRecord`, and `TopicSelectionNeedValidationEvidenceBundle` contracts;
  - existing decision-chain acceptance coverage for evidence map and need-validation bundle creation.
- Verification focus:
  - deterministic-only node semantics;
  - SearchRun/SearchPlan/LiteratureResourcePoolSnapshot lineage consistency;
  - allowed evidence refs and locator validation;
  - `llm_inference` source authority rejection;
  - control-plane input snapshot, workflow run, gate, transition, lineage, and trace artifact boundary.

## 2026-05-20 v1a Flow Convergence: Generate Need Candidate
- Update: converged `topic-selection.v1a.generate-need-candidate.v1` node policy from draft to implementation-ready documentation.
- Evidence reviewed:
  - executable v1a debate scenario contract;
  - `TopicSelectionGenerateNeedCandidateOrchestratorAdapterService`;
  - `TopicSelectionWorkflowHarnessService`;
  - `TopicSelectionNeedDiscoveryDebateLoopService`;
  - ranked draft validation, candidate draft admission, supplemental routing, and batch persistence services;
  - shared `GenerateNeedCandidateNodeInput`, `GenerateNeedCandidateNodeResult`, `RankedCandidateDraftBatch`, `CandidateDraftAdmissionReport`, `SupplementalRoundRoutingDecision`, and `PersistNeedCandidateBatchCommand` contracts.
- Verification focus:
  - the runtime service chain is explicit and does not rely on a future unnamed batch wrapper;
  - the compatibility `POST /topic-selection/v1a/need-candidates` route is documented as legacy/manual single-candidate creation, not WorkflowHarness/debate provenance;
  - model/provider/profile escalation remains owned by DMP-05, `TopicSelectionModelProfileRegistryService`, and `TopicSelectionAgentOrchestratorService`;
  - `NeedCandidateSet`, `ValidatedNeed`, and `TopicQuestionContract` remain forbidden authority outputs for this node.

## 2026-05-20 v1a Flow Convergence: Validate Need Adjudication
- Update: converged `topic-selection.v1a.validate-need-adjudication.v1` node policy to `implementation_ready` after backend split.
- Evidence reviewed:
  - `TopicSelectionNeedValidationService.createReadinessAssessment`;
  - `TopicSelectionNeedValidationService.createValidationDecisionSupportPacket`;
  - `TopicSelectionNeedValidationService.adjudicateNeed`;
  - `POST /topic-selection/v1a/need-candidates/:needCandidateId/readiness-assessments`;
  - `POST /topic-selection/v1a/validation-support-packets`;
  - `POST /topic-selection/v1a/need-candidates/:needCandidateId/adjudications`;
  - shared readiness, support packet, adjudication result, validated need, memory suggestion, and v1b bundle contracts.
- Verification focus:
  - need adjudication remains non-debate.
  - `adjudicateNeed(final_decision=validate)` produces only `TopicSelectionValidateNeedAdjudicationResultRecord` plus typed side-effect refs.
  - `adjudicateNeed` does not create `HumanConfirmedDecision`, `ValidatedNeed`, or `V1bInputBundle`.
  - human confirmation and v1b bundle publication are separate routes and service calls.

## 2026-05-20 v1a Flow Convergence: Human Confirm And V1b Bundle
- Update: converged `topic-selection.v1a.human-confirm-need.v1` and `topic-selection.v1a.publish-v1b-input-bundle.v1` node policies to `implementation_ready`.
- Evidence reviewed:
  - `TopicSelectionNeedValidationService.adjudicateNeed`;
  - `TopicSelectionNeedValidationService.confirmValidatedNeed`;
  - `TopicSelectionNeedValidationService.publishV1bInputBundle`;
  - `TopicSelectionNeedValidationService.buildValidatedNeed`;
  - `TopicSelectionNeedValidationService.buildV1bInputBundle`;
  - `POST /topic-selection/v1a/need-candidates/:needCandidateId/adjudications`;
  - `POST /topic-selection/v1a/adjudications/:adjudicationResultId/human-confirmations`;
  - `POST /topic-selection/v1a/v1b-input-bundles`;
  - shared `TopicSelectionValidatedNeedRecord` and `TopicSelectionV1aToV1bInputBundleRecord` contracts.
- Verification focus:
  - human confirmation must remain human-review only and must not be inferred from model output.
  - v1b bundle publication must remain deterministic and ref-based.
  - duplicate human confirmation is rejected before creating a second `ValidatedNeed`.
  - pending adjudication blocks a second adjudication before human confirmation to prevent multiple output `ValidatedNeed` ids for the same candidate.
  - repeated v1b bundle publication is idempotent for the same `ValidatedNeed`/version.
- Commands run:
  - `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - `node --test --loader ts-node/esm src/services/topic-selection-need-validation-service.unit.test.ts`
  - `node --test --loader ts-node/esm src/routes/topic-selection-v1a-routes.integration.test.ts`
  - `node --test --loader ts-node/esm src/routes/topic-selection-decision-chain-acceptance.test.ts`
  - `node --env-file=../../.env.local --test --loader ts-node/esm src/routes/topic-selection-v1b-routes.integration.test.ts`
  - `RUN_TOPIC_SELECTION_V1A_PRISMA_E2E=1 node --env-file=../../.env.local --test --loader ts-node/esm src/services/topic-selection-v1a-prisma.e2e.test.ts`
- Result:
  - typecheck passed.
  - focused unit, v1a route, and decision-chain acceptance tests passed.
  - v1b route integration passed with `.env.local`, including Prisma HTTP smoke.
  - v1a Prisma E2E service smoke passed with `.env.local`, covering the split adjudication -> human confirmation -> v1b bundle persistence path.

## 2026-05-20 Real E2E Canary Harness Migration
- Update: migrated the real E2E canary's v1a `generate-need-candidate` step to `TopicSelectionWorkflowHarnessService`.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
- Result: passed; 20 tests passed.
- Initial command: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:real-e2e`
- Result: failed with v1b `blocked_by_stale_trace`.
- Fix: carry canonical EvidenceMap/SearchPlan/LiteratureResourcePoolSnapshot/EvidenceUnit version ids into the harness node input and admitted-candidate persistence path.
- Follow-up command: `TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:real-e2e`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Successful run id: `real-e2e-1779267219817-f97f08`.
- Coverage:
  - real E2E canary records `topic-selection.real-e2e.canary.v1` for v1a generate;
  - compatibility `POST /topic-selection/v1a/need-candidates` is no longer used by the canary generate step;
  - persisted candidate refs and candidate-pool projection refs come from `PersistNeedCandidateBatchCommand`;
  - v1b/v1c/downstream continuation verifies the harness candidate remains compatible with existing trace/readiness gates.

## 2026-05-20 WorkflowScenario Runner Migration: Scale Quality And v1b Negative
- Update: retired the standalone quality-gate script and mapped its assertions into the registered scenario runner.
- Command: `node --check .ai/scripts/topic-selection-workflow-scenario-runner.mjs && node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Initial command: `TOPIC_SELECTION_REAL_E2E_REPEATS=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE=mocked_llm pnpm topic-selection:real-e2e:quality-gate`
- Result: failed on stale canonicalization rationale in resource sampling; this confirmed the migrated scenario still enforces the old evidence-role semantic audit.
- Fix verified: guardrail-canonicalized resource sample items now carry rationale and method families aligned with the final selected role.
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
  - `topic-selection.real-e2e.scale-quality.v1` aggregates scenario-level assertions only;
  - canary child run reached PaperProject intake with `status=passed`;
  - v1b negative child run returned `passed_v1b_non_advance`, `value_disposition=refine_question`, and no downstream v1c/PaperProject artifacts;
  - scenario summary includes covered child scenario ids and no failures.

## 2026-05-20 v1a Flow Convergence: Create TopicSeed
- Update: promoted `topic-selection.v1a.create-topic-seed.v1` to `implementation_ready` and implemented the matching WorkflowHarness runner.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 10 tests passed.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-search-resource-service.unit.test.ts`
- Result: passed; 7 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 600 tests total, 599 passed, 1 skipped, 0 failed.
- Command: `git diff --check -- apps/backend/src/services/topic-selection-workflow-harness-service.ts apps/backend/src/services/topic-selection-workflow-harness-service.unit.test.ts apps/backend/src/services/topic-selection-search-resource-service.ts apps/backend/src/services/topic-selection-search-resource-service.unit.test.ts dev-docs/active/topic-selection-workflow-runtime-foundation/01-plan.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/06-workflow-matrix.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`
- Result: passed.
- Historical governance note: at this point in the task history, `node .ai/scripts/ctl-project-governance.mjs lint --check --project main` failed on unrelated paper-implementation task packages T-092 through T-097 missing registry entries. Later verification runs passed.
- Coverage:
  - node remains deterministic and model-free;
  - `seed_kind` is fixed to `title_card` and not caller-supplied;
  - missing TitleCard blocks without authority;
  - final intent summary is mandatory after fallback;
  - control-plane input snapshot, gate, transition, and harness trace refs are surfaced.

## 2026-05-20 v1a Flow Convergence: Snapshot Literature Resource Pool
- Update: promoted `topic-selection.v1a.snapshot-literature-resource-pool.v1` from `implementation_ready/not_callable` to `implementation_ready/callable`.
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
  - runner delegates to `TopicSelectionSearchResourceService.createLiteratureResourcePoolSnapshot`;
  - unsupported normalized harness scope blocks before authority creation;
  - missing literature blocker codes and blocked-path control-plane audit refs survive into harness result;
  - non-concrete TopicSeed refs are rejected before authority creation;
  - source-health maturity warnings are non-blocking;
  - `snapshot_hash` is stable for equivalent repeated runs and policy-sensitive;
  - append-only authority refs remain distinct across repeated equivalent runs;
  - SearchPlan handoff uses snapshot authority fields rather than mutable evidence basket state.

## 2026-05-21 v1a Node 1/2 LLM Boundary Amendment Docs
- Update: recorded the TopicSeed and literature-resource snapshot LLM boundary as original-node amendments, preserving decision order.
- Command: `rg -n "N1-AM01|N2-AM01|TopicSeedIntentDraft|TopicSeed Intent Draft Boundary|Node 1/2 LLM Boundary" dev-docs/active/topic-selection-workflow-runtime-foundation dev-docs/active/topic-selection-agent-workflow-review`
- Result: passed; amendments and architecture notes are present in both active task bundles.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/02-architecture.md dev-docs/active/topic-selection-agent-workflow-review/02-architecture.md dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - Node 1 remains deterministic and model-free;
  - optional TopicSeed semantic drafting is documented as pre-node input preparation only;
  - Node 2 remains deterministic and model-free;
  - sampling, role classification, polarity, and evidence interpretation remain outside the snapshot node.

## 2026-05-21 v1a Node 3 WorkflowHarness Runner Contract Docs
- Update: locked N3-D05 for `topic-selection.v1a.create-search-plan.v1`, preserving the distinction between compatibility API behavior and normalized automation behavior.
- Command: `rg -n "N3-D05|runCreateSearchPlanScenario|WorkflowHarnessCreateSearchPlanScenarioTrace|route_service_compatibility_fallback_allowed|fallback generic" dev-docs/active/topic-selection-workflow-runtime-foundation dev-docs/active/topic-selection-agent-workflow-review`
- Result: passed; runner contract and fallback boundary are recorded.
- Command: `rg -n "\t" dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md`
- Result: passed; no tab indentation remains in the node policy file.
- Command: `git diff --check -- dev-docs/active/topic-selection-workflow-runtime-foundation/07-v1a-workflow-harness-normalization.md dev-docs/active/topic-selection-agent-workflow-review/07-node-policies.md dev-docs/active/topic-selection-workflow-runtime-foundation/03-implementation-notes.md dev-docs/active/topic-selection-agent-workflow-review/03-implementation-notes.md`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage:
  - normalized runner input is blueprint-first, not permissive service input;
  - strict validation blocks snapshot hash drift, lineage mismatch, empty query/coverage intents, and missing coverage-row fields;
  - service fallback defaults are explicitly forbidden in normalized harness execution;
  - blocked results must not expose SearchPlan or CoverageRow authority refs;
  - trace schema is `WorkflowHarnessCreateSearchPlanScenarioTrace@v1`.

## 2026-05-21 v1a Node 3 Callable Runner Verification
- Update: implemented Node 3 callable runner and recorded N3-D06.
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
  - Node 3 runner is callable through `TopicSelectionWorkflowHarnessService.runCreateSearchPlanScenario`;
  - wrong blueprint schema version, missing blueprint, snapshot hash mismatch, omitted coverage intents, fallback-derived coverage semantics, non-object coverage entries, and lineage mismatch all block without authority refs;
  - successful SearchPlan creation records SearchPlan/CoverageRow refs, control-plane audit refs, trace artifact, and complete blueprint input snapshot;
  - Node 1/2 provenance amendments are verified through input snapshots without introducing provider, Codex, or debate execution.

## 2026-05-21 v1a Node 5 Callable Runner Verification
- Update: implemented Node 5 callable runner for `topic-selection.v1a.build-evidence-map.v1`.
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
  - Node 5 remains single-agent-or-none and does not invoke multi-agent debate;
  - `mocked_llm` exercises the AgentOrchestrator path without provider calls;
  - agent invocation audit refs are included in Node 5 audit/artifact refs;
  - deterministic materialization blocks unsafe source attribution and preserves no-authority behavior for blocked/review-required results;
  - successful runs emit only one downstream workflow handoff: `TopicSelectionEvidenceMapHandoff@v1` for Node 6.

## 2026-05-21 v1a Node 5 Quality Review Fix Verification
- Update: fixed N5 quality review issues without adding a second workflow path.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 36 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Coverage:
  - materialization-only warnings survive into downstream handoff;
  - locator provenance drift blocks before authority creation;
  - full functional-ref lineage drift blocks before authority creation;
  - same-source support/challenge ambiguity requires source-specific conflict coverage.

## 2026-05-21 N5 to N6 Handoff Consumption Guard Verification
- Update: verified Node 6 consumes N5 handoff only as transition provenance and rejects N5 draft/review/raw artifacts as business inputs.
- Command: `cd apps/backend && node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 39 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `set -a; source .env.local; set +a; pnpm --filter @paper-engineering-assistant/backend test`
- Result: passed; 725 tests total, 724 passed, 1 skipped, 0 failed.
- Coverage:
  - legal EvidenceMap handoff from N5 drives a mocked Node 6 candidate generation run;
  - handoff drift blocks before context compilation;
  - EvidenceMap review package refs cannot be smuggled into Node 6 context input refs;
  - existing mocked debate and single-agent Node 6 paths still pass.

## 2026-05-22 N7-D12 Planned Verification Matrix
- Update: recorded Node 7 implementation readiness and minimum test matrix.
- Decision: implementation may start; this section was the pre-implementation matrix. The later N7 runner verification promotes `topic-selection.v1a.validate-need-adjudication.v1` to `callable`.

| ID | Layer | Scenario | Required Result |
|---|---|---|---|
| N7-C01 | shared contract | recommendation packet whitelist | valid packet accepted |
| N7-C02 | shared contract | recommendation contains orchestration/status/authority fields | schema rejects |
| N7-C03 | shared contract | node result status values | only `ready`, `blocked`, `require_human_review` accepted |
| N7-P01 | profile registry | adjudication single-agent profile | profile resolves with structured output and fallback disabled |
| N7-H01 | harness unit | fresh ready path with `validate` | ready handoff to Node 8, no ValidatedNeed |
| N7-H02 | harness unit | non-ready readiness | blocked before support/adjudication authority |
| N7-H03 | harness unit | readiness `reject` | gate finding only, not final reject authority |
| N7-H04 | harness unit | explicit packet drift | conflict/gate block |
| N7-H05 | harness unit | support freeze followed by upstream mutation | no live reread as business truth |
| N7-H06 | harness unit | high-risk model recommendation without human acceptance | require human review, no authority write |
| N7-H07 | harness unit | human/hybrid high-risk acceptance | authority write allowed after validation |
| N7-H08 | harness unit | malformed recommendation | blocked, no fallback |
| N7-H09 | harness unit | SearchPlan recheck | typed recheck request only |
| N7-H10 | harness unit | return-to-candidate lacks actions | blocked |
| N7-H11 | harness unit | duplicate/pending adjudication | blocked duplicate with existing refs |
| N7-H12 | harness unit | exact replay | prior node result returned, no writes |
| N7-H13 | harness unit | replay drift/missing trace | blocked |
| N7-H14 | harness unit | model failure/malformed structured output | same-profile retry max once, no provider/Codex/mock fallback |
| N7-H15 | harness unit | readiness `merge_required` or `park` | `blocked` with review repair hint, no merge/park authority |
| N7-H16 | service + harness unit | direct REST adjudication with stale support-packet lineage | conflict/gate block, no authority write |
| N7-H17 | harness unit | replay storage lookup cannot recover node result or trace | blocked/pause path, no fresh attempt |
| N7-I01 | integration | existing REST v1a readiness/support/adjudication happy path | remains passing |
| N7-I02 | integration | duplicate REST adjudication | second write rejected |
| N7-E01 | scenario | N1->N7 fixture workflow | N7 node result is consumable by Node 8 automation |

Close criteria:
- shared, backend harness, model profile, and route regression tests cover the rows above;
- backend typecheck passes;
- governance lint passes;
- D12 status may move to `callable` only after the runner emits `TopicSelectionValidateNeedAdjudicationNodeResult@v1` and the matrix passes.

## 2026-05-22 N7 Runner Policy Verification
- Update: T-088 implementation landed and was checked against the T-089 N7 policy matrix.
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
- Policy coverage:
  - N7 is still not debate-eligible and uses only the single-agent recommendation profile.
  - `TopicSelectionNeedAdjudicationRecommendationPacket@v1` remains artifact/provenance only and is schema-rejected when it carries orchestration fields.
  - `TopicSelectionValidateNeedAdjudicationNodeResult@v1` is the runner handoff and uses only `ready`, `blocked`, and `require_human_review`.
  - D07 high-risk recommendations require human/hybrid acceptance before authority write.
  - D08 support-packet freeze is enforced by explicit refs and by service-level lineage checks.
  - D10 duplicate/replay semantics produce no second adjudication.
  - Recommendation profile/policy/output-schema drift blocks before authority writes.
  - Exact replay re-evaluates current scenario assertions while preserving no-write replay semantics.
  - Node 7 can be marked `automation_callability=callable` for WorkflowHarness execution.

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
- Update: N9 is callable through `runPublishV1bInputBundleScenario` and remains a deterministic terminal handoff.
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
- Coverage: explicit handoff input, bundle publication, stable `created_by=system` default in the trace input, no hard-coded v1b next node, exact replay, expected-version reuse, changed hash block, lineage drift block, missing expected version block, stable invalid-confirmation input rejection before missing-adjudication lookup, and service-level non-confirm human-decision block.
- Follow-up review fix: clarified that `runPublishV1bInputBundleScenario` is the normalized automation path while `POST /topic-selection/v1a/v1b-input-bundles` remains the compatibility service boundary; removed malformed YAML indentation in the N9 policy block.

## 2026-05-23 v1a Generate-Need-Candidate Mixed Debate Verification
- Update: verified the concrete v1a debate scenario with a mixed Codex/provider execution plan and all downstream v1a handoffs.
- Command: `pnpm --dir apps/backend exec node --test --loader ts-node/esm src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 72 tests passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-debate-mixed-20260523180445 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=codex_assisted TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; N6 ran as `multi_agent_debate`, persisted 3 candidates, N7 provider adjudication advanced, N8 confirmed, and N9 published `v1b_input_bundle_95471cc3-d8c3-4ce1-9e2b-187d73294c1f`.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-debate-mixed-20260523180445`.
- Coverage: mixed role execution provenance, provider-backed final arbiter, role-level summaries, issue-frame/final-synthesis artifacts, no hidden-reasoning fields, candidate admission/persistence, readiness-selected N7 handoff, human confirmation, and v1b input bundle publication.

## 2026-05-24 v1a Replay Boundary And Harness Canary
- Update: added a v1a replay/idempotency matrix so WorkflowHarness automation does not treat N1-N5 as exact-replay nodes.
- Policy result: N1-N5 are callable with deterministic/append-only/hash/lineage guards; N6-N9 are the exact-replay nodes backed by durable trace lookup and input-hash drift blocking.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-replay-boundary-canary-20260524 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=multi_agent_debate TOPIC_SELECTION_V1A_HARNESS_DEBATE_EXPLORER_EXECUTION_MODE=codex_assisted TOPIC_SELECTION_V1A_HARNESS_DEBATE_DEEP_CRITIC_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_ISSUE_FRAME_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_DEBATE_FINAL_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed; N1-N9 completed, N6 ran as `multi_agent_debate`, persisted 3 `NeedCandidate` records, N7 advanced, N8 confirmed, and N9 published `v1b_input_bundle_87e47cba-7c0e-4ffd-8286-3d8e33681dac`.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-replay-boundary-canary-20260524`.
- Coverage: real local DB, existing resource sample set `resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c`, deterministic resource sampling mode, mixed debate slot provenance, selected literature role balance, all v1a node handoffs, and final v1a-to-v1b bundle publication.

## 2026-05-24 N6-N9 Real-DB Replay Smoke
- Update: added and ran `topic-selection.v1a.replay-idempotency.real-db-smoke.v1`.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-replay-smoke-real-db-20260524-04 TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID=resource_sample_set_cb98a17a-196d-4750-833c-b25d3cf0950c TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 pnpm topic-selection:v1a-harness-replay-smoke`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-replay-smoke-real-db-20260524-04`.
- Exact replay evidence: N6-N9 returned replay provenance; NeedCandidate, readiness assessment, support packet, adjudication result, human decision, ValidatedNeed, v1b input bundle, and artifact counts stayed unchanged; harness LLM call count stayed `0 -> 0`.
- Drift evidence: changing `policy_version` on each N6-N9 replay input produced `REPLAY_INPUT_HASH_MISMATCH`; authority counts stayed unchanged; harness LLM call count stayed `0 -> 0`; N7-N9 recorded blocked trace artifacts as expected while N6 threw `VERSION_CONFLICT` before trace creation.
- Naming check: replay run now reports `scenario_id=topic-selection.v1a.replay-idempotency.real-db-smoke.v1` and `scenario_type=real_db_replay_smoke`.

## 2026-05-24 v1a Real Provider Canary
- Update: ran the first small-sample `real_provider_canary` for v1a model-like nodes.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-real-provider-canary-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-real-provider-canary-20260524-01`.
- Provider evidence: summary reports `scenario_id=topic-selection.provider-stability.v1`, `scenario_type=real_provider_canary`, provider `openai`, model `gpt-5.4-mini`, and exactly two harness LLM gateway calls.
- Covered provider nodes: `topic-selection.generate-need-candidate.single-agent.v1` emitted `topic_selection_ranked_candidate_draft_batch`; `topic-selection.need-adjudication.single-agent.v1` emitted `TopicSelectionNeedAdjudicationRecommendationPacket@v1`.
- Flow evidence: 4-literature deterministic sample, N6 persisted 4 `NeedCandidate` records, N7 advanced, N8 confirmed, and N9 published `v1b_input_bundle_a19da84b-f000-449f-ae34-1d92c6be20a4`.

## 2026-05-24 v1a Output Quality Closure Verification
- Update: verified deterministic N6/N7 quality gates, warning carry-forward, projection rank metadata, and statement cleanup.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-need-validation-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 107 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage: role-bundle non-evidence refs reject before authority writes; wrong-role evidence units reject; conflict/strength refs are accepted only in dedicated arrays; method-family coverage gap emits warning and persists into candidate gap codes; rank mapping stays projection-only and affects projection hash; support packets carry challenge/conflict residual risks by default; N7 blocks dropped residual risk; N7 carries residual-risk and method-family warnings on validate handoff; N7 blocks clean validate when method-family coverage gap is not carried; E2E scripts parse after statement helper cleanup.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-output-quality-canary-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTION_MODE=provider_llm TOPIC_SELECTION_V1A_HARNESS_GENERATE_EXECUTOR_KIND=single_agent TOPIC_SELECTION_V1A_HARNESS_ADJUDICATION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-output-quality-canary-20260524-01`.
- Real-provider evidence: 4-literature deterministic resource sample, exactly two provider calls, N6 persisted 3 candidates, N6 emitted `METHOD_FAMILY_COVERAGE_GAP`, N7 advanced with `METHOD_FAMILY_COVERAGE_GAP` and `VALIDATE_WITH_RESIDUAL_RISK`, N8 confirmed, and N9 published `v1b_input_bundle_e77f0a58-4a70-4f60-8399-d80a7f1f40cd`.

## 2026-05-24 v1a Full-Flow Quality Matrix And N4-N5 Role Closure Verification
- Update: added v1a quality matrix and closed the N4->N5 coverage-role handoff gap.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 71 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared exec node --test --loader ts-node/esm src/research-lifecycle/topic-selection-search-resource-contracts.schema.test.ts src/research-lifecycle/topic-selection-evidence-map-contracts.schema.test.ts`
- Result: passed; 11 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- Command: `git diff --check`
- Result: passed.
- Command: `node .ai/scripts/ctl-project-governance.mjs lint --check --project main`
- Result: passed.
- Coverage: `TopicSelectionSearchRunHandoff@v1` now carries `coverage_role_expectations`; N4 handoff exposes SearchPlan-derived row role expectations; N5 materialization includes the expectations in `input_refs_hash`; mismatched coverage row role blocks with `COVERAGE_ROW_ROLE_MISMATCH` before EvidenceMap authority writes; existing support/challenge conflict review now uses explicit matching challenge coverage row semantics.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-role-handoff-quality-20260524-02 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-role-handoff-quality-20260524-02`.
- E2E evidence: N1-N9 completed on real local DB with deterministic mock resource sampling and zero LLM calls; N4 emitted SearchRun handoff, N5 materialized four EvidenceUnits, N6 carried `METHOD_FAMILY_COVERAGE_GAP`, N7 advanced with `METHOD_FAMILY_COVERAGE_GAP` and `VALIDATE_WITH_RESIDUAL_RISK`, N8 confirmed, and N9 published `v1b_input_bundle_b2176f20-bf74-403c-b833-debb92b258fe`.
- Fix evidence: the first E2E attempt `v1a-role-handoff-quality-20260524-01` correctly blocked at N7 because the old mocked recommendation fixture dropped `METHOD_FAMILY_COVERAGE_GAP`; the script fixture now carries support-packet open gaps into `gap_codes` and `required_actions`.

## 2026-05-24 N3-N6 Method-Family Target Closure Verification
- Update: closed N3 coverage richness by making SearchPlan blueprint method-family targets explicit and carrying them through N4/N5 into N6 admission warnings.
- Command: `pnpm --filter @paper-engineering-assistant/shared exec node --test --loader ts-node/esm src/research-lifecycle/topic-selection-search-resource-contracts.schema.test.ts src/research-lifecycle/topic-selection-evidence-map-contracts.schema.test.ts`
- Result: passed; 12 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-candidate-draft-admission-service.unit.test.ts src/services/topic-selection-generate-need-candidate-orchestrator-adapter-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 93 tests passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck`
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-real-e2e.mjs`
- Result: passed.
- First E2E command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-method-targets-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:v1a-harness-e2e`
- Result: failed on a false order-drift assertion while the handoff preserved the same method target set.
- Fix: compare `method_family_targets` by normalized set rather than raw array order.
- Successful E2E command: `source ./.env.local && TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-method-targets-20260524-02 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-method-targets-20260524-02`.
- E2E evidence: N1-N9 completed on real local DB with deterministic mock resource sampling and zero LLM calls; N3 persisted SearchPlan target method families, N4/N5 preserved them in handoffs, N6 emitted `METHOD_FAMILY_COVERAGE_GAP` against the target set, N7 advanced with `METHOD_FAMILY_COVERAGE_GAP` and `VALIDATE_WITH_RESIDUAL_RISK`, N8 confirmed, and N9 published `v1b_input_bundle_d67bf3b6-a91c-4f11-bbe2-d2154d24d20c`.

## 2026-05-24 N5 Provider-Backed Evidence Extraction Canary Verification
- Update: enabled N5 provider-backed extraction in the v1a harness while keeping N5 single-agent and preserving the materialization gate as the only authority path.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`
- Result: passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`
- Result: passed; 73 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed.
- Command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-n5-model-like-mock-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=mocked_llm pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-n5-model-like-mock-20260524-01`.
- Mocked N5 evidence: N1-N9 completed on real local DB; N5 used `mocked_llm` input through `TopicSelectionEvidenceMapExtractionDraft@v1`, created four EvidenceUnits, and continued to v1b bundle publication with zero provider calls.
- First provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-n5-provider-canary-20260524-01 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: failed safely before EvidenceMap authority writes.
- Failure evidence: provider rejected the strict schema because `properties.evidence_map_id=false` style forbidden fields are not accepted by strict provider structured outputs. N5 recorded an agent audit artifact, materialization blocked with `MISSING_EVIDENCE_MAP_EXTRACTION_DRAFT`, and no EvidenceMap/EvidenceUnit authority refs were created.
- Fix: provider request schema projection now removes `false` property schemas before calling provider while retaining original local Ajv validation.
- Follow-up command: `pnpm --filter @paper-engineering-assistant/backend exec node --test --loader ts-node/esm src/services/topic-selection-agent-orchestrator-service.unit.test.ts`
- Result: passed; 6 tests passed.
- Successful provider command: `TOPIC_SELECTION_V1A_HARNESS_RUN_ID=v1a-n5-provider-canary-20260524-02 TOPIC_SELECTION_REAL_FLOW_MOCK_LLM=1 TOPIC_SELECTION_REAL_LITERATURE_LIMIT=4 TOPIC_SELECTION_V1A_HARNESS_EVIDENCE_EXTRACTION_EXECUTION_MODE=provider_llm TOPIC_SELECTION_REAL_PROVIDER_ID=openai TOPIC_SELECTION_REAL_MODEL_ID=gpt-5.4-mini TOPIC_SELECTION_REAL_LLM_TIMEOUT_MS=240000 pnpm topic-selection:v1a-harness-e2e`
- Result: passed.
- Artifact dir: `.ai/.tmp/topic-selection-v1a-harness-e2e/v1a-n5-provider-canary-20260524-02`.
- Provider evidence: exactly one provider call at `harness build-evidence-map` with schema `TopicSelectionEvidenceMapExtractionDraft@v1`; N5 created four source-claim EvidenceUnits with support/challenge/baseline/context roles, manual locators, no N5 warning/blocker codes, and N1-N9 completed to `v1b_input_bundle_c7d18d90-a8a3-4b99-8f61-3319b97c87e8`.
- Output-quality spot check: persisted EvidenceUnits used `source_claim` attribution, role-specific manual locators, and source statements copied from source candidates; N6/N7 still carried `METHOD_FAMILY_COVERAGE_GAP` and `VALIDATE_WITH_RESIDUAL_RISK` as expected.

## 2026-05-24 Unified LLM Execution Object Verification
- Update: added shared `TopicSelectionAgentExecutionSpec`, debate `execution_plan`, centralized OpenAI/DashScope provider runtime mapping, explicit `gpt-5.5` quality/deep-reasoning profile options, and WorkflowHarness alignment for N5/N6/N7/N8 model-like call sites.
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

## 2026-05-25 SO-03 Implementation Sync Verification
- Scope: model profile registry timeout/name sync, v1a harness named debate profile materialization, and instance-level provider/Codex override behavior. Follow-up review fixed standard `openai-balanced` timeout alignment from 60s to the DMP-12 180s registry value before rerunning these checks.
- Command: `node --test --loader ts-node/esm src/services/topic-selection-model-profile-registry-service.unit.test.ts src/services/topic-selection-need-discovery-debate-loop-service.unit.test.ts src/services/topic-selection-agent-orchestrator-service.unit.test.ts src/services/topic-selection-workflow-harness-service.unit.test.ts` from `apps/backend/`.
- Result: passed; 103 tests passed.
- Command: `node --test --loader ts-node/esm src/research-lifecycle/topic-selection-debate-scenario-contracts.schema.test.ts` from `packages/shared/`.
- Result: passed; 4 tests passed.
- Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`.
- Result: passed.
- Command: `node --check .ai/scripts/topic-selection-v1a-harness-e2e.mjs`.
- Result: passed.
- Negative harness startup probe: named profile plus legacy slot env correctly fails before workflow execution with `cannot be combined with legacy debate slot env overrides`.
- Cleanup: removed the accidental failed canary artifact created while probing script import behavior; no failed SO-03 canary artifact is retained as evidence.

## 2026-07-05 结构化硬化切片 ②→①→③ 验证
- Command: `node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs`
- Result: passed — matrix matches code authority sources and scenario registry（真实文件零 issue；含新增的 v1c/downstream 全语义列、v1b 三项语义、行形状、stage 词汇、抽取完备性、covered_scenarios 双向、D-28 脚本登记检查）。
- Command: `node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs --self-test`
- Result: passed — **21/21 漂移注入负例全部命中**（原 7 例 + 本切片 14 例：v1c debate 翻转/executor 漂移、v1b human_delegated 翻转/executor 漂移/非法 default、行缺格、未知 stage、v1b 常量化重构抽取失效、未映射 execution_kind、v1c policy 缺失、矩阵场景改名、注册表 covered_nodes 漂移/伪造节点、脚本未登记）。
- Command: `node --test --loader ts-node/esm src/research-lifecycle/topic-selection-v1c-node-policy-contracts.schema.test.ts`（packages/shared）
- Result: passed; 7 tests（AJV 逐条 + 注册表全序相等 + debate⟺primitive/human_review→executor 不变量 + 负例拒绝）。
- Command: `pnpm test`（packages/shared 全 schema 套件）
- Result: passed; **280/280**。
- Command: `pnpm --filter @paper-engineering-assistant/shared typecheck` / `pnpm --filter @paper-engineering-assistant/backend typecheck`
- Result: passed ×2（0 error）。
- Command: `node --test --loader ts-node/esm src/services/topic-selection-workflow-matrix-consistency.unit.test.ts`（apps/backend 包装测试）
- Result: passed; 2/2（真实文件 + self-test 两口径进默认套件）。
- Command: `node scripts/run-node-tests.mjs`（apps/backend 全量）
- Result: passed — **1661 / 1626 pass / 0 fail / 35 skipped = 基线**。注：切片中途首跑曾 1 fail（test 1213 标定语料 placeholder 守卫），定位为 470300e1 归档搬迁漏改 backend 侧路径的既有断裂（先于本切片），已独立修复提交 `793fbebb` 后回归基线。
- 对抗式复审（13 代理，4 维 + 逐发现反驳）：4 项确认当轮修复（见 03 §复审段）、5 项反驳留档;registry-content 维度补跑**零发现**（11 场景双向一致 + 新 N6 条目声明逐项核实）。

## 2026-07-06 backlog ④+⑤ 验证
- ④ 复核工作流：21 代理（Inventory/Merge Fable 档 + Review/Verify sonnet 档 resume），24 面/22 簇；判定与修复见 `13-dormant-edge-review.md` 与 03 §2026-07-06。修复后核对：`node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs` ok（含 covered_scenarios 双向与注册表状态词改动后的回归）。
- ⑤ 实现验证：
  - Command: `node --test --loader ts-node/esm src/services/topic-selection-workflow-harness-service.unit.test.ts`（apps/backend）
  - Result: **111/111**（含新增 4 链式测试：两轮续跑至 finalize 且 attempt 派生 `__r2` 钉、硬上限 3 轮 attempt 序列钉、terminal 路由单轮即停、caller `max_total_rounds=2` 低帽生效;gateway 调用次数逐例断言 2/3/1/2）。
  - Command: `pnpm --filter @paper-engineering-assistant/backend typecheck`
  - Result: passed（0 error）。
  - 单轮路径零行为变化证据：本文件既有 107 测零改动全绿;链 wrapper 未接任何路由/coordinator（grep 无新调用方）。
- Command: `node scripts/run-node-tests.mjs`（apps/backend 全量）
- Result: passed — **1665 / 1630 pass / 0 fail / 35 skipped**（原基线 1661/1626 + 本切片 4 链式测试，零回归）。
- Command: `node .ai/scripts/ctl-project-governance.mjs sync --apply && lint --check --project main`
- Result: passed（见提交）。

## 2026-07-06 ①尾巴收口验证
- Command: `node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs` / `--self-test`
- Result: 真跑 ok（v1a/rs 全 8 语义列接入后首跑即绿）;自测 **24/24** 漂移负例全命中（新增 3 例）。
- Command: `node --test --loader ts-node/esm src/research-lifecycle/topic-selection-node-semantic-policy-contracts.schema.test.ts`（packages/shared）
- Result: passed; 5/5。
- Command: `pnpm typecheck`（shared + backend）
- Result: passed ×2（0 error）。
- Command: `node --test --loader ts-node/esm src/services/topic-selection-workflow-matrix-consistency.unit.test.ts`（apps/backend 包装）
- Result: passed; 2/2。
- Full backend 套件:见提交（收口批次统一跑）。
