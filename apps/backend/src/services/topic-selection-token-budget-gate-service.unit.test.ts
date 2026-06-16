import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionContextPolicyProfile,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS,
  TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS,
  TopicSelectionContextPolicyProfileRegistryService,
} from './topic-selection-context-policy-profile-registry-service.js';
import { TopicSelectionTokenBudgetGateService } from './topic-selection-token-budget-gate-service.js';

function ref(refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: 'artifact',
    ref_id: refId,
  };
}

function profile(): TopicSelectionContextPolicyProfile {
  return new TopicSelectionContextPolicyProfileRegistryService().resolveProfile({
    context_policy_profile_id:
      TOPIC_SELECTION_V1A_N6_CONTEXT_RUNTIME_PROFILE_IDS.need_candidate_generation,
    invocation_slot_id: TOPIC_SELECTION_V1A_N6_INVOCATION_SLOT_IDS.need_candidate_generation,
  }).profile;
}

function gateInput(overrides: Partial<Parameters<TopicSelectionTokenBudgetGateService['evaluate']>[0]> = {}) {
  return {
    context_policy_profile: profile(),
    provider_id: 'openai',
    model_id: 'gpt-5.5',
    model_profile_id: 'topic-selection.generate-need-candidate.single-agent.v1',
    model_option_id: 'topic-selection.generate-need-candidate.single-agent.v1.openai-balanced',
    messages: [
      {
        role: 'system',
        content: 'Generate grounded need candidates.',
      },
      {
        role: 'user',
        content: 'Preserve blockers, residual risks, method-family gaps, and recheck hints.',
      },
    ],
    context_payloads: [
      {
        blockers: ['missing longitudinal evaluation'],
        residual_risks: ['pseudo-gap framing'],
        method_family_gaps: ['long-context robustness'],
      },
    ],
    schema: {
      type: 'object',
      required: ['candidates'],
      properties: {
        candidates: {
          type: 'array',
          items: { type: 'object' },
        },
      },
    },
    ...overrides,
  };
}

test('token budget gate returns within_budget for first-slice profile under target', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const evaluation = service.evaluate(gateInput());

  assert.equal(evaluation.result.decision, 'within_budget');
  assert.equal(evaluation.result.provider_id, 'openai');
  assert.equal(evaluation.result.model_id, 'gpt-5.5');
  assert.equal(evaluation.result.estimated_output_tokens, 4096);
  assert.equal(evaluation.result.context_window_tokens, 128000);
  assert.equal(evaluation.result.blocker_codes.length, 0);
  assert.equal(evaluation.estimate?.safety_margin, 1.25);
  assert.match(String(evaluation.result.estimated_input_tokens), /^[1-9][0-9]*$/);
});

test('token budget gate threads provider_id into the estimator so CJK estimates are provider-calibrated', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const cjkPayload = {
    messages: [
      { role: 'system', content: '生成有据的研究需求候选，保留阻断项与残余风险。' },
      { role: 'user', content: '需要保留阻断项、残余风险、方法族缺口，并记录跨轮否决候选与失败试验。' },
    ],
    context_payloads: [{ 阻断项: ['缺少纵向评估'], 残余风险: ['伪缺口框定'], 方法族缺口: ['长上下文鲁棒性'] }],
    schema: undefined,
  };

  const unknownProvider = service.evaluate(gateInput({ ...cjkPayload, provider_id: null }));
  const openai = service.evaluate(gateInput({ ...cjkPayload, provider_id: 'openai' }));
  const deepseek = service.evaluate(gateInput({ ...cjkPayload, provider_id: 'deepseek' }));

  // Known providers tighten the CJK estimate relative to the uniform default; deepseek tightest.
  assert.equal(
    (openai.result.estimated_input_tokens ?? 0) < (unknownProvider.result.estimated_input_tokens ?? 0),
    true,
  );
  assert.equal(
    (deepseek.result.estimated_input_tokens ?? 0) <= (openai.result.estimated_input_tokens ?? 0),
    true,
  );
  // Provenance is preserved on the gate result.
  assert.equal(openai.result.provider_id, 'openai');
  assert.equal(deepseek.result.provider_id, 'deepseek');
});

test('token budget gate requires compression when input exceeds target and profile allows compression', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const evaluation = service.evaluate(gateInput({
    estimated_input_tokens_override: 64000,
    schema_overhead_tokens_override: 600,
    compression_strategy_ref: ref('compression_strategy_001'),
  }));

  assert.equal(evaluation.result.decision, 'requires_compression');
  assert.equal(evaluation.result.compression_strategy_ref?.ref_id, 'compression_strategy_001');
  assert.deepEqual(evaluation.result.warning_codes, ['TOKEN_BUDGET_REQUIRES_COMPRESSION']);
  assert.deepEqual(evaluation.result.blocker_codes, []);
});

test('token budget gate blocks over-budget input when compression is disallowed', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const noCompressionProfile: TopicSelectionContextPolicyProfile = {
    ...profile(),
    compression_policy: {
      ...profile().compression_policy,
      compression_mode: 'disallowed',
      allowed_executor_kinds: [],
      compression_strategy_id: null,
      compression_strategy_version: null,
      quality_gate_required: false,
    },
  };
  const evaluation = service.evaluate(gateInput({
    context_policy_profile: noCompressionProfile,
    estimated_input_tokens_override: 64000,
  }));

  assert.equal(evaluation.result.decision, 'blocked_over_budget');
  assert.deepEqual(evaluation.result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_COMPRESSION_DISALLOWED']);
});

test('token budget gate blocks when compression has already been applied and budget is still exceeded', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const evaluation = service.evaluate(gateInput({
    estimated_input_tokens_override: 140000,
    compression_already_applied: true,
  }));

  assert.equal(evaluation.result.decision, 'blocked_over_budget');
  assert.deepEqual(evaluation.result.blocker_codes, ['TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION']);
});

test('token budget gate handles unknown estimates according to profile policy', () => {
  const service = new TopicSelectionTokenBudgetGateService();
  const allowUnknownProfile: TopicSelectionContextPolicyProfile = {
    ...profile(),
    token_budget_policy: {
      ...profile().token_budget_policy,
      unknown_estimate_behavior: 'budget_unknown_allow_with_warning',
    },
  };
  const warning = service.evaluate(gateInput({
    context_policy_profile: allowUnknownProfile,
    estimated_input_tokens_override: null,
  }));
  assert.equal(warning.result.decision, 'budget_unknown_allow_with_warning');
  assert.deepEqual(warning.result.warning_codes, ['TOKEN_BUDGET_ESTIMATE_UNKNOWN']);

  const blocked = service.evaluate(gateInput({
    estimated_input_tokens_override: null,
  }));
  assert.equal(blocked.result.decision, 'blocked_over_budget');
  assert.deepEqual(blocked.result.blocker_codes, ['TOKEN_BUDGET_ESTIMATE_UNKNOWN']);
});
