# v1a Generate Need Candidate Debate Contract

## Status
- Status: executable-contract-v1
- Node: `topic-selection.v1a.generate-need-candidate.v1`
- Scenario: `topic-selection.debate.v1a-need-discovery.v1`
- Debate policy: `topic-selection.need-discovery.debate.v1`
- Shared SSOT: `packages/shared/src/research-lifecycle/topic-selection-debate-scenario-contracts.ts`

## Purpose
This document records the executable v1a debate contract for generating need candidates. It narrows the broader DMP policy into the concrete role/stage slots that the backend can run and verify now.

## Runtime Boundary
- The debate loop produces only `RankedCandidateDraftBatch@v1` through `arbiter.final_synthesis`.
- Worker outputs are audit/artifact inputs only. They MUST NOT write `NeedCandidate`, `NeedCandidateSet`, `ValidatedNeed`, or `TopicQuestionContract`.
- The existing D-20/D-21/D-22/D-23 chain remains authoritative for schema validation, candidate admission, supplemental routing, and optional persistence.
- Raw debate transcripts, hidden reasoning, provider-private reasoning payloads, secrets, and raw provider logs MUST NOT be persisted.
- `execution_mode` is resolved per role/stage slot. A run MAY default to `provider_llm` and override allowed worker or issue-framing slots to `codex_assisted`; `arbiter.final_synthesis` MUST remain `provider_llm` for real execution or `mocked_llm` for isolated tests.

## Role/Stage Slots

| Slot | Role | Stage | Context | Output | Instances | Codex |
| --- | --- | --- | --- | --- | --- | --- |
| `explorer.round_1_discovery` | `explorer` | `round_1_discovery` | `exploration_context` | `NeedDiscoveryExplorerNotes@v1` | min 1, default 2, max 3 | allowed |
| `deep_critic.round_1_discovery` | `deep_critic` | `round_1_discovery` | `exploration_context` | `NeedDiscoveryDeepCriticNotes@v1` | min 1, default 1, max 3 | allowed |
| `arbiter.issue_framing` | `arbiter` | `issue_framing` | `arbiter_context` | `DebateIssueFrame@v1` | exactly 1 | allowed |
| `arbiter.final_synthesis` | `arbiter` | `final_synthesis` | `arbiter_context` | `RankedCandidateDraftBatch@v1` | exactly 1 | forbidden in v1 executable contract |

## Model Profiles

| Slot | `profile_id` | Prompt Template | Schema Name |
| --- | --- | --- | --- |
| `explorer.round_1_discovery` | `topic-selection.need-discovery.explorer.v1` | `topic-selection-need-discovery-explorer@v1` | `topic_selection_need_discovery_explorer_notes` |
| `deep_critic.round_1_discovery` | `topic-selection.need-discovery.deep-critic.v1` | `topic-selection-need-discovery-deep-critic@v1` | `topic_selection_need_discovery_deep_critic_notes` |
| `arbiter.issue_framing` | `topic-selection.need-discovery.arbiter-framing.v1` | `topic-selection-need-discovery-arbiter-issue-frame@v1` | `topic_selection_need_discovery_debate_issue_frame` |
| `arbiter.final_synthesis` | `topic-selection.need-discovery.arbiter-final.v1` | `topic-selection-need-discovery-arbiter-final@v1` | `topic_selection_ranked_candidate_draft_batch` |

## Provider Options
Provider/model selection is owned by the model profile registry, not by node policy or workflow code.

Provider-backed debate runs SHOULD pass a canonical `execution_plan`. Legacy `slot_model_option_overrides` and `slot_execution_overrides` remain compatibility-only and must not be mixed with `execution_plan`.

SO-03 / `DMP-12` adds named execution profiles for v1a debate. The model profile registry and v1a harness now implement these profile names, timeout values, and option ids.

Execution plan shape:

```yaml
execution_plan:
  slots:
    explorer.round_1_discovery:
      execution_mode: provider_llm
      model_option_id: topic-selection.need-discovery.explorer.v1.dashscope-thinking-budget
  instances:
    explorer.round_1_discovery#explorer_2:
      execution_mode: provider_llm
      model_option_id: topic-selection.need-discovery.explorer.v1.openai-quality
```

Precedence is `instance > slot > default > node input`. Instance-level specs are only for repeatable slots such as explorer/deep critic; single-instance arbiter slots should use slot-level specs.

Default option for every current v1a debate profile:
- `provider_id`: `openai`
- `model_id`: `gpt-5.5`
- `use_when`: `default_provider_run`
- `timeout_ms`: `180000`

Manual budget option:
- `provider_id`: `dashscope`
- `model_id`: `qwen3.6-plus`
- canonical option id: `<profile_id>.dashscope-thinking-budget`
- `use_when`: `budget_sensitive_manual_selection`, `thinking_budget_manual_selection`
- `timeout_ms`: `300000`
- `provider_overrides`: `enable_thinking: true`
- legacy compatibility alias: `<profile_id>.dashscope-budget`; it remains thinking-enabled and must not be reused for a non-thinking DashScope option.

Manual quality options:
- `openai-quality`: `provider_id=openai`, `model_id=gpt-5.5`, `reasoning_depth=high`, `output_budget=large`, `timeout_ms=300000`
- `openai-deep-reasoning`: `provider_id=openai`, `model_id=gpt-5.5`, `reasoning_depth=high`, `output_budget=large`, `timeout_ms=450000`

Manual DeepSeek V4 thinking option:
- Available only for `explorer.round_1_discovery` and `deep_critic.round_1_discovery`.
- Option id: `<worker_profile_id>.deepseek-v4-thinking`
- `provider_id`: `deepseek`
- `model_id`: `deepseek-v4-pro`
- `use_when`: `alternative_explorer_deep_critic_manual_selection`
- `timeout_ms`: `450000`
- `normalized_params`: `reasoning_depth=high`, `output_budget=large`, `output_format=json_schema`
- `provider_overrides`: `thinking.type=enabled`, `reasoning_effort=high`
- Not available for `arbiter.final_synthesis`; final synthesis remains OpenAI/DashScope provider-backed unless a later contract explicitly changes that boundary.

Normalized params for default/budget model options:
- `creativity`: `medium`
- `reasoning_depth`: `high`
- `output_budget`: `medium`
- `structured_output_required`: `true`
- `output_format`: `json_schema`

## Named Execution Profiles

### `mixed-cost-control`
Default recommended daily local debate profile. It maximizes Codex participation while preserving a provider-backed final synthesis.

| Slot instance | Execution |
| --- | --- |
| `explorer.round_1_discovery#explorer_1` | `codex_assisted` |
| `deep_critic.round_1_discovery#deep_critic_1` | `codex_assisted` |
| `arbiter.issue_framing` | `codex_assisted` |
| `arbiter.final_synthesis` | `provider_llm` with `topic-selection.need-discovery.arbiter-final.v1.openai-quality` |

Runtime requirements:
- Codex worker output must use the same role/stage contracts as provider output.
- Codex worker output must be treated as non-authority debate artifacts.
- `arbiter.final_synthesis` remains provider-backed, so the run can still produce provider-quality final synthesis evidence.

### `provider-diverse-deep`
High-quality provider canary/review profile. It uses external provider anchors while still letting Codex contribute project-aware exploration and critique.

| Slot instance | Execution |
| --- | --- |
| `explorer.round_1_discovery#explorer_1` | `codex_assisted` |
| `explorer.round_1_discovery#explorer_2` | `provider_llm` with `topic-selection.need-discovery.explorer.v1.openai-quality` |
| `explorer.round_1_discovery#explorer_3` | `provider_llm` with DashScope thinking option; target id `topic-selection.need-discovery.explorer.v1.dashscope-thinking-budget` |
| `deep_critic.round_1_discovery#deep_critic_1` | `provider_llm` with `topic-selection.need-discovery.deep-critic.v1.openai-deep-reasoning` |
| `deep_critic.round_1_discovery#deep_critic_2` | `codex_assisted` |
| `arbiter.issue_framing` | `codex_assisted` |
| `arbiter.final_synthesis` | `provider_llm` with `topic-selection.need-discovery.arbiter-final.v1.openai-deep-reasoning` |

Runtime requirements:
- The default deep critic count is two: OpenAI as provider-backed anchor and Codex as project-aware critic.
- DeepSeek V4 thinking is optional manual `deep_critic_3` or a manual explorer/deep_critic replacement source, not the default deep critic anchor.
- `arbiter.final_synthesis` must be provider-backed and must not use Codex in provider-quality debate evidence.

### Codex Robustness Constraints
- Codex must receive frozen context packets by default.
- Codex must not read live DB, mutable resource pools, harness runtime state, or repo files during the invocation unless the run records `codex_context_augmented=true` and cites the extra context/artifact refs.
- Codex output must be accepted, rejected, or cited by the provider-backed arbiter; it cannot silently influence final synthesis.
- Codex output cannot write authority records and cannot bypass D-20/D-21/D-22/D-23 admission and persistence gates.

## Failure And Audit
- `provider_llm` failure returns `blocked`; automatic fallback is forbidden.
- Provider changes require manual rerun or explicit model-option override with new provenance.
- `mocked_llm` is test/acceptance-only and cannot satisfy real provider-quality evidence.
- Slot/instance-level Codex substitution is supported only through explicit `execution_plan`; it is never an automatic fallback from provider failure.
- Slot/instance-level provider model-option selection is supported only through explicit `execution_plan`; it is never an automatic fallback or provider-ranking mechanism.
- The round cap is 3. Supplemental repair orchestration remains a follow-up runtime slice; the current executable contract covers the runnable initial discovery loop.
- Required artifacts: `debate_role_output`, `debate_role_level_summary`, `debate_issue_frame`, `debate_final_synthesis`.

## Verification
- Shared schema: `topicSelectionDebateScenarioContractSchema`.
- Backend runtime: `TopicSelectionNeedDiscoveryDebateLoopService`.
- Provider contract test must assert two explorer calls, one deep critic call, one issue-framing arbiter call, and one final-synthesis arbiter call under default provider selection.
- Mixed-mode contract test must assert a Codex-assisted worker slot can run while arbiter final synthesis stays provider-backed.
