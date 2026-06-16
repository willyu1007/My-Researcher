import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError } from '../errors/app-error.js';
import { TopicSelectionConservativeTokenEstimatorService } from './topic-selection-conservative-token-estimator-service.js';

test('conservative token estimator is deterministic and counts CJK text conservatively', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  const english = estimator.estimateText('Need candidate generation should preserve residual risks.');
  const cjk = estimator.estimateText('需要保留阻断项、残余风险、方法族缺口。');

  assert.equal(estimator.estimateText('Need candidate generation should preserve residual risks.').estimated_tokens, english.estimated_tokens);
  assert.equal(cjk.cjk_character_count > 0, true);
  assert.equal(cjk.estimated_tokens > english.estimated_tokens / 2, true);
});

test('conservative token estimator includes JSON structure and schema overhead', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  const payloadTokens = estimator.estimatePayload({
    topic_scope: {
      domain: 'long-context literature reasoning',
      exclusions: ['generic benchmark survey'],
    },
    residual_risks: ['pseudo-gap framing'],
  });
  const schemaOverhead = estimator.estimateSchemaOverhead({
    type: 'object',
    required: ['candidates'],
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          required: ['need_statement'],
          properties: {
            need_statement: { type: 'string' },
          },
        },
      },
    },
  });

  assert.equal(payloadTokens > 0, true);
  assert.equal(schemaOverhead > 0, true);
  assert.equal(schemaOverhead > estimator.estimatePayload({ type: 'object' }), true);
});

test('conservative token estimator applies profile safety margin to input estimates', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  const withoutMargin = estimator.estimateInputTokens({
    messages: [{ role: 'user', content: 'Generate grounded candidate drafts.' }],
    context_payloads: [{ blockers: ['missing longitudinal evaluation'] }],
    schema: { type: 'object' },
    safety_margin: 1,
  });
  const withMargin = estimator.estimateInputTokens({
    messages: [{ role: 'user', content: 'Generate grounded candidate drafts.' }],
    context_payloads: [{ blockers: ['missing longitudinal evaluation'] }],
    schema: { type: 'object' },
    safety_margin: 1.25,
  });

  assert.equal(withMargin.raw_input_tokens, withoutMargin.raw_input_tokens);
  assert.equal(withMargin.estimated_input_tokens >= Math.ceil(withoutMargin.raw_input_tokens * 1.25), true);
  assert.equal(withMargin.schema_overhead_tokens, withoutMargin.schema_overhead_tokens);
});

test('per-provider calibration lowers CJK estimates below the uniform default and orders by tokenizer efficiency', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  const cjkInput = {
    messages: [{ role: 'user', content: '需要保留阻断项、残余风险、方法族缺口，并记录跨轮否决候选与失败试验。' }],
    context_payloads: [{ 阻断项: ['缺少纵向评估'], 残余风险: ['伪缺口框定'] }],
    safety_margin: 1.25,
  };
  const def = estimator.estimateInputTokens(cjkInput);
  const openai = estimator.estimateInputTokens({ ...cjkInput, provider_id: 'openai' });
  const dashscope = estimator.estimateInputTokens({ ...cjkInput, provider_id: 'dashscope' });
  const deepseek = estimator.estimateInputTokens({ ...cjkInput, provider_id: 'deepseek' });

  // Calibration only ever tightens (never raises) the conservative default.
  assert.equal(openai.estimated_input_tokens < def.estimated_input_tokens, true);
  assert.equal(dashscope.estimated_input_tokens < def.estimated_input_tokens, true);
  assert.equal(deepseek.estimated_input_tokens < def.estimated_input_tokens, true);
  // deepseek's tokenizer is the most CJK-efficient → lowest estimate.
  assert.equal(deepseek.estimated_input_tokens <= openai.estimated_input_tokens, true);
  assert.equal(deepseek.estimated_input_tokens <= dashscope.estimated_input_tokens, true);
});

test('per-provider calibration is byte-identical to the default for unknown providers and non-CJK content', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  // Unknown / null provider falls back to the default uniform calibration.
  const cjkContent = {
    messages: [{ role: 'user', content: '保留阻断项与残余风险，记录方法族缺口。' }],
    safety_margin: 1.25,
  };
  assert.deepEqual(
    estimator.estimateInputTokens({ ...cjkContent, provider_id: 'unknown-provider' }),
    estimator.estimateInputTokens(cjkContent),
  );

  // Latin-only content has no CJK term, so every provider matches the default exactly.
  const latinContent = {
    messages: [{ role: 'system', content: 'Generate grounded need candidates.' }],
    context_payloads: [{ blockers: ['missing longitudinal evaluation'] }],
    schema: { type: 'object', required: ['candidates'] },
    safety_margin: 1.25,
  };
  const latinDefault = estimator.estimateInputTokens(latinContent);
  for (const provider_id of ['openai', 'dashscope', 'deepseek']) {
    assert.deepEqual(estimator.estimateInputTokens({ ...latinContent, provider_id }), latinDefault);
  }
});

test('provider calibration table pins measured values and never exceeds the conservative default ceiling', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  // Pinned to the 2026-06-15 calibration evidence (see F-10 implementation notes).
  assert.equal(estimator.resolveCalibration('openai').cjk_tokens_per_char, 0.9);
  assert.equal(estimator.resolveCalibration('dashscope').cjk_tokens_per_char, 0.95);
  assert.equal(estimator.resolveCalibration('deepseek').cjk_tokens_per_char, 0.85);
  // Default ceiling is 1 token/char; calibrated providers may only tighten it, never loosen it.
  for (const provider_id of ['openai', 'dashscope', 'deepseek']) {
    const calibration = estimator.resolveCalibration(provider_id);
    assert.equal(calibration.cjk_tokens_per_char <= 1, true);
    // Latin ratios stay at the safe default for every provider.
    assert.equal(calibration.latin_chars_per_token, 4);
    assert.equal(calibration.latin_words_multiplier, 1.15);
    // Newline term is tightened to the real ~1-token-per-newline cost (the loose /8 default
    // was only safe under the uniform CJK over-count; tightening CJK requires honest newlines).
    assert.equal(calibration.newline_divisor, 1);
  }
  // Unknown / null providers resolve to the byte-identical default (1 token/char, /8 newlines).
  assert.equal(estimator.resolveCalibration(null).cjk_tokens_per_char, 1);
  assert.equal(estimator.resolveCalibration(null).newline_divisor, 8);
  assert.equal(estimator.resolveCalibration('mystery').cjk_tokens_per_char, 1);
  assert.equal(estimator.resolveCalibration('mystery').newline_divisor, 8);
});

test('per-provider calibration counts each newline as a real token so CJK tightening cannot underestimate newline-dense text', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();
  // Tightening CJK erases the buffer that previously absorbed the under-counted newline tokens.
  // Providers must therefore count newlines honestly (~1 token each). Measure the marginal cost of
  // 8 added newlines on identical base content: default attributes ceil(8/8)=1, providers ceil(8/1)=8.
  const base = '研究需求';
  const withNewlines = `${base}${'\n'.repeat(8)}`;
  const defaultDelta = estimator.estimateText(withNewlines).estimated_tokens
    - estimator.estimateText(base).estimated_tokens;
  assert.equal(defaultDelta, 1); // unchanged legacy /8 heuristic (byte-identical default)

  for (const provider_id of ['openai', 'dashscope', 'deepseek']) {
    const calibration = estimator.resolveCalibration(provider_id);
    const providerDelta = estimator.estimateText(withNewlines, calibration).estimated_tokens
      - estimator.estimateText(base, calibration).estimated_tokens;
    assert.equal(providerDelta, 8); // one token per newline
  }
});

test('conservative token estimator rejects invalid safety margins', () => {
  const estimator = new TopicSelectionConservativeTokenEstimatorService();

  assert.throws(
    () => estimator.estimateInputTokens({
      messages: [{ role: 'user', content: 'x' }],
      safety_margin: 0.8,
    }),
    (error: unknown) =>
      error instanceof AppError
      && error.errorCode === 'INVALID_PAYLOAD'
      && error.message === 'token estimate safety margin must be a finite multiplier greater than or equal to 1.',
  );
});
