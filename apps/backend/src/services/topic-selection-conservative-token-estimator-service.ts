import { AppError } from '../errors/app-error.js';
import { stableStringify } from './literature-content-processing-utils.js';

export interface TopicSelectionTextTokenEstimate {
  estimated_tokens: number;
  cjk_character_count: number;
  latin_word_count: number;
  non_cjk_character_count: number;
}

export interface EstimateTopicSelectionInputTokensInput {
  messages?: Array<{ role: string; content: string }>;
  context_payloads?: unknown[];
  schema?: Record<string, unknown> | null;
  extra_payloads?: unknown[];
  safety_margin?: number | null;
  /**
   * Provider that will receive this prompt. Selects a per-provider calibration so the
   * estimate tracks that provider's real tokenizer (most notably CJK efficiency). When
   * omitted / unknown, the default uniform conservative calibration is used and the
   * estimate is byte-identical to the pre-calibration behaviour.
   */
  provider_id?: string | null;
}

export interface TopicSelectionInputTokenEstimate {
  raw_input_tokens: number;
  estimated_input_tokens: number;
  schema_overhead_tokens: number;
  safety_margin: number;
}

const DEFAULT_SAFETY_MARGIN = 1.25;
const CJK_PATTERN = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]/gu;
const WORD_PATTERN = /[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?/gu;
const JSON_STRUCTURE_PATTERN = /[{}\[\]:,"]/g;

/**
 * Token-count calibration for a single provider's tokenizer.
 *
 * - `latin_chars_per_token`  divisor for the character-based Latin token floor.
 * - `latin_words_multiplier` floor multiplier applied to the Latin word count.
 * - `cjk_tokens_per_char`    tokens attributed per CJK character.
 * - `newline_divisor`        divisor for the newline overhead term.
 */
export interface ProviderTokenCalibration {
  readonly latin_chars_per_token: number;
  readonly latin_words_multiplier: number;
  readonly cjk_tokens_per_char: number;
  readonly newline_divisor: number;
}

/**
 * Default (no provider / unknown) calibration \u2014 the original uniform conservative
 * heuristic. MUST stay at these values so flows that do not thread a provider_id
 * produce byte-identical estimates to the pre-calibration behaviour. `newline_divisor`
 * is the original loose `/8` heuristic (newlines were a negligible term absorbed by the
 * uniform CJK/Latin over-count).
 */
const DEFAULT_TOKEN_CALIBRATION: ProviderTokenCalibration = {
  latin_chars_per_token: 4,
  latin_words_multiplier: 1.15,
  cjk_tokens_per_char: 1,
  newline_divisor: 8,
};

/**
 * Per-provider calibration, keyed by `provider_id`. Calibrated 2026-06-15 from REAL
 * tokenizer measurements over representative topic-selection payloads (technical
 * Chinese + English + JSON). See the F-10 calibration evidence in
 * `dev-docs/archive/topic-selection-productization-hardening/03-implementation-notes.md`
 * and the reproducible harness under `.../evidence/f10-token-calibration/measure.py`.
 *
 * Only the CJK ratio and the newline term diverge per provider:
 * - CJK is where the uniform 1.0 token/char over-estimates most. Each `cjk_tokens_per_char`
 *   is chosen well ABOVE the measured mean, then RAISED further per provider until the
 *   whole-input worst case keeps a robust margin (the value is bounded by full-input safety,
 *   not by the raw CJK ratio). Measured CJK means: openai 0.84, dashscope 0.73, deepseek 0.67.
 *   dashscope's tokenizer is the most CJK-efficient in isolation, yet its Latin/structure
 *   tokenization is the least efficient, so its whole-input margin is the thinnest \u2014 hence it
 *   is the LEAST tightened (0.95), not the most, despite the lowest raw CJK mean.
 * - `newline_divisor` is tightened to 1 (\u2248 the real ~1-token-per-newline cost). The default
 *   loose `/8` heuristic was only safe because the uniform CJK over-count absorbed the
 *   newline under-count; once CJK is tightened, newline-dense CJK content (e.g. multi-line
 *   bullet lists) would otherwise underestimate, so the newline term must be made honest.
 *
 * The Latin ratios are intentionally kept at the default for every provider: measured
 * Latin/JSON tokenization (snake_case keys, identifiers, mixed prose) varies enough that
 * divisor=4 is already at the safe edge, so tightening it would risk underestimation.
 *
 * Combined with the unchanged profile safety margin (1.25), these values were validated to
 * never underestimate across 1,200 inputs (incl. 33% newline-heavy message content + 25%
 * CJK-heavy stress) with a comfortable worst-case margin (est/actual \u2273 1.04; re-run
 * evidence/f10-token-calibration/measure.py to reproduce \u2014 the exact margin drifts slightly
 * as the doc-derived corpus evolves, but 0 underestimates is the invariant).
 *
 *   openai    / gpt-5.6-sol     \u2192 tiktoken o200k family (assumed, 2026-07-18 swap; same family as gpt-5.5, constants unchanged)
 *   dashscope / qwen3.7-plus    \u2192 Qwen BBPE (Qwen2.5/Qwen3 shared vocab; family unchanged across 3.6\u21923.7)
 *   deepseek  / deepseek-v4-pro \u2192 DeepSeek-V3 BBPE
 */
const PROVIDER_TOKEN_CALIBRATIONS: Readonly<Record<string, ProviderTokenCalibration>> = {
  openai: { latin_chars_per_token: 4, latin_words_multiplier: 1.15, cjk_tokens_per_char: 0.9, newline_divisor: 1 },
  dashscope: { latin_chars_per_token: 4, latin_words_multiplier: 1.15, cjk_tokens_per_char: 0.95, newline_divisor: 1 },
  deepseek: { latin_chars_per_token: 4, latin_words_multiplier: 1.15, cjk_tokens_per_char: 0.85, newline_divisor: 1 },
};

export class TopicSelectionConservativeTokenEstimatorService {
  /**
   * Resolve the calibration for a provider. Unknown / null providers fall back to the
   * default uniform conservative calibration (byte-identical to pre-calibration output).
   */
  resolveCalibration(providerId?: string | null): ProviderTokenCalibration {
    if (!providerId) {
      return DEFAULT_TOKEN_CALIBRATION;
    }
    return PROVIDER_TOKEN_CALIBRATIONS[providerId] ?? DEFAULT_TOKEN_CALIBRATION;
  }

  estimateText(
    value: string,
    calibration: ProviderTokenCalibration = DEFAULT_TOKEN_CALIBRATION,
  ): TopicSelectionTextTokenEstimate {
    if (value.length === 0) {
      return {
        estimated_tokens: 0,
        cjk_character_count: 0,
        latin_word_count: 0,
        non_cjk_character_count: 0,
      };
    }

    const cjkCharacterCount = [...value.matchAll(CJK_PATTERN)].length;
    const nonCjkText = value.replace(CJK_PATTERN, ' ');
    const latinWordCount = [...nonCjkText.matchAll(WORD_PATTERN)].length;
    const nonCjkCharacterCount = nonCjkText.replace(/\s+/g, '').length;
    const characterBasedTokens = Math.ceil(nonCjkCharacterCount / calibration.latin_chars_per_token);
    const latinTokens = Math.max(characterBasedTokens, Math.ceil(latinWordCount * calibration.latin_words_multiplier));
    const newlineOverhead = Math.ceil((value.match(/\n/g)?.length ?? 0) / calibration.newline_divisor);
    const cjkTokens = Math.ceil(cjkCharacterCount * calibration.cjk_tokens_per_char);

    return {
      estimated_tokens: Math.max(1, cjkTokens + latinTokens + newlineOverhead),
      cjk_character_count: cjkCharacterCount,
      latin_word_count: latinWordCount,
      non_cjk_character_count: nonCjkCharacterCount,
    };
  }

  estimatePayload(
    value: unknown,
    calibration: ProviderTokenCalibration = DEFAULT_TOKEN_CALIBRATION,
  ): number {
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'string') {
      return this.estimateText(value, calibration).estimated_tokens;
    }

    const serialized = stableStringify(value);
    const structureCount = serialized.match(JSON_STRUCTURE_PATTERN)?.length ?? 0;
    const structureOverhead = Math.ceil(structureCount / 12);
    const keyOverhead = this.countObjectKeys(value);
    return this.estimateText(serialized, calibration).estimated_tokens + structureOverhead + keyOverhead;
  }

  estimateSchemaOverhead(
    schema?: Record<string, unknown> | null,
    calibration: ProviderTokenCalibration = DEFAULT_TOKEN_CALIBRATION,
  ): number {
    if (!schema) {
      return 0;
    }
    return Math.ceil(this.estimatePayload(schema, calibration) * 1.2);
  }

  estimateInputTokens(
    input: EstimateTopicSelectionInputTokensInput,
  ): TopicSelectionInputTokenEstimate {
    const safetyMargin = input.safety_margin ?? DEFAULT_SAFETY_MARGIN;
    if (!Number.isFinite(safetyMargin) || safetyMargin < 1) {
      throw new AppError(
        400,
        'INVALID_PAYLOAD',
        'token estimate safety margin must be a finite multiplier greater than or equal to 1.',
      );
    }

    const calibration = this.resolveCalibration(input.provider_id);
    const messageTokens = (input.messages ?? []).reduce<number>((total, message) => {
      const roleOverhead = 4;
      return total + roleOverhead + this.estimateText(message.role, calibration).estimated_tokens
        + this.estimateText(message.content, calibration).estimated_tokens;
    }, 0);
    const contextTokens = (input.context_payloads ?? []).reduce<number>(
      (total, payload) => total + this.estimatePayload(payload, calibration),
      0,
    );
    const extraPayloadTokens = (input.extra_payloads ?? []).reduce<number>(
      (total, payload) => total + this.estimatePayload(payload, calibration),
      0,
    );
    const schemaOverheadTokens = this.estimateSchemaOverhead(input.schema, calibration);
    const rawInputTokens = messageTokens + contextTokens + extraPayloadTokens + schemaOverheadTokens;

    return {
      raw_input_tokens: rawInputTokens,
      estimated_input_tokens: Math.ceil(rawInputTokens * safetyMargin),
      schema_overhead_tokens: schemaOverheadTokens,
      safety_margin: safetyMargin,
    };
  }

  private countObjectKeys(value: unknown): number {
    if (!value || typeof value !== 'object') {
      return 0;
    }
    if (Array.isArray(value)) {
      return value.reduce<number>((total, item) => total + this.countObjectKeys(item), 0);
    }

    const record = value as Record<string, unknown>;
    return Object.keys(record).length
      + Object.values(record).reduce<number>(
        (total, item) => total + this.countObjectKeys(item),
        0,
      );
  }
}
