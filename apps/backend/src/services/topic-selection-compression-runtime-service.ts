import {
  Ajv,
  type ValidateFunction,
} from 'ajv';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  topicSelectionCompressionReportEnvelopeSchema,
  type TopicSelectionCompressionExecutorKind,
  type TopicSelectionCompressionReportEnvelope,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionRuntimeGateResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionConservativeTokenEstimatorService } from './topic-selection-conservative-token-estimator-service.js';

export type TopicSelectionCompressionFactInventory = Record<string, string[] | undefined>;

export type CreateTopicSelectionCompressionReportInput = {
  context_policy_profile: TopicSelectionContextPolicyProfile;
  context_policy_profile_hash: string;
  compression_report_ref: TopicSelectionFunctionalRef;
  source_refs: TopicSelectionFunctionalRef[];
  input_context: unknown;
  compressed_context: unknown;
  summary: unknown;
  compression_executor_kind: TopicSelectionCompressionExecutorKind;
  required_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  compressed_preserved_facts?: TopicSelectionCompressionFactInventory | null;
  redaction_policy?: string | null;
  estimated_input_tokens_before_override?: number | null;
  estimated_input_tokens_after_override?: number | null;
};

export type TopicSelectionCompressionReportRuntimeResult = {
  report: TopicSelectionCompressionReportEnvelope;
  quality_gate_result: TopicSelectionRuntimeGateResult;
  blocker_codes: string[];
  warning_codes: string[];
};

const FORBIDDEN_COMPRESSED_PAYLOAD_KEY_PATTERNS = [
  /hidden[_-]?reasoning/i,
  /chain[_-]?of[_-]?thought/i,
  /raw[_-]?provider[_-]?log/i,
  /raw[_-]?provider[_-]?logs/i,
  /provider[_-]?secret/i,
  /api[_-]?key/i,
  /secret[_-]?key/i,
  /access[_-]?token/i,
  /credential/i,
  /unredacted[_-]?private[_-]?content/i,
] as const;

const FORBIDDEN_COMPRESSED_PAYLOAD_VALUE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/iu,
  /\bsk-[A-Za-z0-9_-]+/iu,
  /\bapi[_-]?key\s*[:=]\s*[^\s,;}]+/iu,
] as const;

export class TopicSelectionCompressionRuntimeService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly compressionReportValidator: ValidateFunction;
  private readonly estimator: TopicSelectionConservativeTokenEstimatorService;

  constructor(options: {
    estimator?: TopicSelectionConservativeTokenEstimatorService;
  } = {}) {
    this.estimator = options.estimator ?? new TopicSelectionConservativeTokenEstimatorService();
    this.compressionReportValidator = this.ajv.compile(topicSelectionCompressionReportEnvelopeSchema);
  }

  createReport(
    input: CreateTopicSelectionCompressionReportInput,
  ): TopicSelectionCompressionReportRuntimeResult {
    this.assertCompressionInput(input);
    const profile = input.context_policy_profile;
    const blockerCodes: string[] = [];
    const warningCodes: string[] = [];

    const forbiddenPath = this.findForbiddenPersistedPayloadPath(input.compressed_context)
      ?? this.findForbiddenPersistedPayloadPath(input.summary);
    if (forbiddenPath) {
      blockerCodes.push('COMPRESSION_FORBIDDEN_PERSISTED_PAYLOAD');
      warningCodes.push(`COMPRESSION_FORBIDDEN_PAYLOAD_PATH:${forbiddenPath}`);
    }

    blockerCodes.push(...this.droppedFactBlockers({
      profile,
      requiredFacts: input.required_preserved_facts ?? {},
      compressedFacts: input.compressed_preserved_facts ?? {},
    }));

    const estimatedBefore = this.estimateTokens(
      input.input_context,
      input.estimated_input_tokens_before_override,
      profile,
    );
    const estimatedAfter = this.estimateTokens(
      [input.compressed_context, input.summary],
      input.estimated_input_tokens_after_override,
      profile,
    );
    if (
      estimatedBefore !== null
      && estimatedAfter !== null
      && estimatedAfter >= estimatedBefore
    ) {
      warningCodes.push('COMPRESSION_DID_NOT_REDUCE_TOKEN_ESTIMATE');
    }

    const qualityGateResult = this.qualityGateResult(blockerCodes, warningCodes);
    const report: TopicSelectionCompressionReportEnvelope = {
      compression_report_ref: input.compression_report_ref,
      source_refs: input.source_refs,
      input_context_hash: this.hash(input.input_context),
      compressed_context_hash: this.hash(input.compressed_context),
      summary_hash: this.hash(input.summary),
      estimated_input_tokens_before: estimatedBefore,
      estimated_input_tokens_after: estimatedAfter,
      redaction_policy: input.redaction_policy ?? profile.redaction_policy,
      compression_executor_kind: input.compression_executor_kind,
      compression_strategy_id: profile.compression_policy.compression_strategy_id
        ?? 'unknown-compression-strategy',
      compression_strategy_version: profile.compression_policy.compression_strategy_version
        ?? 'unknown-compression-strategy-version',
      preserved_fact_kinds: [...profile.compression_policy.preserved_fact_kinds],
      quality_gate_result: qualityGateResult,
      blocker_codes: this.uniqueStrings(blockerCodes),
      warning_codes: this.uniqueStrings(warningCodes),
    };

    this.assertCompressionReportSchema(report);
    return {
      report,
      quality_gate_result: report.quality_gate_result,
      blocker_codes: report.blocker_codes,
      warning_codes: report.warning_codes,
    };
  }

  private assertCompressionInput(input: CreateTopicSelectionCompressionReportInput): void {
    const profile = input.context_policy_profile;
    if (profile.compression_policy.compression_mode === 'disallowed') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression is disallowed by context policy profile.');
    }
    if (input.context_policy_profile_hash !== this.hash(profile)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'context policy profile hash drift detected for compression.');
    }
    if (input.source_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression report requires at least one source ref.');
    }
    if (!profile.compression_policy.allowed_executor_kinds.includes(input.compression_executor_kind)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression executor is not allowed by context policy profile.');
    }
    if (!profile.compression_policy.compression_strategy_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression strategy id is required.');
    }
    if (!profile.compression_policy.compression_strategy_version?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression strategy version is required.');
    }
    const redactionPolicy = input.redaction_policy ?? profile.redaction_policy;
    if (redactionPolicy !== profile.redaction_policy) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'compression redaction policy drift detected.');
    }
  }

  private droppedFactBlockers(input: {
    profile: TopicSelectionContextPolicyProfile;
    requiredFacts: TopicSelectionCompressionFactInventory;
    compressedFacts: TopicSelectionCompressionFactInventory;
  }): string[] {
    const blockerCodes: string[] = [];
    for (const factKind of input.profile.compression_policy.preserved_fact_kinds) {
      const required = this.uniqueStrings(input.requiredFacts[factKind] ?? []);
      if (required.length === 0) {
        continue;
      }
      const compressed = new Set(this.uniqueStrings(input.compressedFacts[factKind] ?? []));
      const missing = required.filter((factId) => !compressed.has(factId));
      if (missing.length > 0) {
        blockerCodes.push(`COMPRESSION_REQUIRED_${this.codeToken(factKind)}_DROPPED`);
      }
    }
    return blockerCodes;
  }

  private estimateTokens(
    payload: unknown,
    override: number | null | undefined,
    profile: TopicSelectionContextPolicyProfile,
  ): number | null {
    if (override !== undefined) {
      return override;
    }
    return this.estimator.estimateInputTokens({
      context_payloads: [payload],
      safety_margin: profile.token_budget_policy.token_estimate_safety_margin,
    }).estimated_input_tokens;
  }

  private qualityGateResult(
    blockerCodes: string[],
    warningCodes: string[],
  ): TopicSelectionRuntimeGateResult {
    if (blockerCodes.length > 0) {
      return 'blocked';
    }
    if (warningCodes.length > 0) {
      return 'warned';
    }
    return 'passed';
  }

  private findForbiddenPersistedPayloadPath(value: unknown, path: string[] = ['compressed_payload']): string | null {
    if (typeof value === 'string') {
      return FORBIDDEN_COMPRESSED_PAYLOAD_VALUE_PATTERNS.some((pattern) => pattern.test(value))
        ? path.join('.')
        : null;
    }
    if (!value || typeof value !== 'object') {
      return null;
    }
    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        const found = this.findForbiddenPersistedPayloadPath(item, [...path, String(index)]);
        if (found) {
          return found;
        }
      }
      return null;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = [...path, key];
      if (FORBIDDEN_COMPRESSED_PAYLOAD_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        return childPath.join('.');
      }
      const found = this.findForbiddenPersistedPayloadPath(child, childPath);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private assertCompressionReportSchema(report: TopicSelectionCompressionReportEnvelope): void {
    if (this.compressionReportValidator(report)) {
      return;
    }
    const firstError = this.compressionReportValidator.errors?.[0];
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `compression report failed schema validation at ${firstError?.instancePath || '/'}: ${
        firstError?.message ?? 'invalid report'
      }`,
    );
  }

  private codeToken(value: string): string {
    return value.replace(/[^A-Za-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '').toUpperCase();
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
