import {
  Ajv,
  type ValidateFunction,
} from 'ajv';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  topicSelectionTokenBudgetGateResultSchema,
  type TopicSelectionContextPolicyProfile,
  type TopicSelectionTokenBudgetGateDecision,
  type TopicSelectionTokenBudgetGateResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-llm-runtime-contracts';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionConservativeTokenEstimatorService,
  type EstimateTopicSelectionInputTokensInput,
  type TopicSelectionInputTokenEstimate,
} from './topic-selection-conservative-token-estimator-service.js';

export interface EvaluateTopicSelectionTokenBudgetGateInput
  extends EstimateTopicSelectionInputTokensInput {
  context_policy_profile: TopicSelectionContextPolicyProfile;
  provider_id?: string | null;
  model_id?: string | null;
  model_profile_id?: string | null;
  model_option_id?: string | null;
  compression_strategy_ref?: TopicSelectionFunctionalRef | null;
  compression_already_applied?: boolean;
  estimated_input_tokens_override?: number | null;
  schema_overhead_tokens_override?: number | null;
}

export interface TopicSelectionTokenBudgetGateEvaluation {
  result: TopicSelectionTokenBudgetGateResult;
  estimate: TopicSelectionInputTokenEstimate | null;
}

export class TopicSelectionTokenBudgetGateService {
  private readonly ajv = new Ajv({
    allErrors: true,
    strict: false,
    removeAdditional: false,
  });
  private readonly tokenBudgetGateResultValidator: ValidateFunction;
  private readonly estimator: TopicSelectionConservativeTokenEstimatorService;

  constructor(options: {
    estimator?: TopicSelectionConservativeTokenEstimatorService;
  } = {}) {
    this.estimator = options.estimator ?? new TopicSelectionConservativeTokenEstimatorService();
    this.tokenBudgetGateResultValidator = this.ajv.compile(topicSelectionTokenBudgetGateResultSchema);
  }

  evaluate(
    input: EvaluateTopicSelectionTokenBudgetGateInput,
  ): TopicSelectionTokenBudgetGateEvaluation {
    const profile = input.context_policy_profile;
    const policy = profile.token_budget_policy;
    const estimate = input.estimated_input_tokens_override === null
      ? null
      : this.estimator.estimateInputTokens({
        messages: input.messages,
        context_payloads: input.context_payloads,
        schema: input.schema,
        extra_payloads: input.extra_payloads,
        safety_margin: input.safety_margin ?? policy.token_estimate_safety_margin,
        provider_id: input.provider_id,
      });
    const estimatedInputTokens = input.estimated_input_tokens_override === undefined
      ? estimate?.estimated_input_tokens ?? null
      : input.estimated_input_tokens_override;
    const schemaOverheadTokens = input.schema_overhead_tokens_override === undefined
      ? estimate?.schema_overhead_tokens ?? null
      : input.schema_overhead_tokens_override;
    const warningCodes: string[] = [];
    const blockerCodes: string[] = [];
    const decision = this.decide({
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: policy.estimated_output_token_budget,
      context_window_tokens: policy.context_window_tokens,
      estimated_input_token_target: policy.estimated_input_token_target,
      unknown_estimate_behavior: policy.unknown_estimate_behavior,
      compression_mode: profile.compression_policy.compression_mode,
      compression_already_applied: input.compression_already_applied ?? false,
      blocker_codes: blockerCodes,
      warning_codes: warningCodes,
    });

    const result: TopicSelectionTokenBudgetGateResult = {
      provider_id: input.provider_id ?? null,
      model_id: input.model_id ?? null,
      profile_id: input.model_profile_id ?? profile.context_policy_profile_id,
      model_option_id: input.model_option_id ?? null,
      estimated_input_tokens: estimatedInputTokens,
      estimated_output_tokens: policy.estimated_output_token_budget,
      context_window_tokens: policy.context_window_tokens,
      schema_overhead_tokens: schemaOverheadTokens,
      decision,
      compression_strategy_ref: input.compression_strategy_ref ?? null,
      blocker_codes: blockerCodes,
      warning_codes: warningCodes,
    };

    this.assertGateResultSchema(result);
    return {
      result,
      estimate,
    };
  }

  private decide(input: {
    estimated_input_tokens: number | null;
    estimated_output_tokens: number;
    context_window_tokens: number | null;
    estimated_input_token_target: number;
    unknown_estimate_behavior: 'budget_unknown_allow_with_warning' | 'blocked_over_budget';
    compression_mode: TopicSelectionContextPolicyProfile['compression_policy']['compression_mode'];
    compression_already_applied: boolean;
    blocker_codes: string[];
    warning_codes: string[];
  }): TopicSelectionTokenBudgetGateDecision {
    if (input.estimated_input_tokens === null || input.context_window_tokens === null) {
      if (input.unknown_estimate_behavior === 'budget_unknown_allow_with_warning') {
        input.warning_codes.push('TOKEN_BUDGET_ESTIMATE_UNKNOWN');
        return 'budget_unknown_allow_with_warning';
      }
      input.blocker_codes.push('TOKEN_BUDGET_ESTIMATE_UNKNOWN');
      return 'blocked_over_budget';
    }

    const totalEstimatedTokens = input.estimated_input_tokens + input.estimated_output_tokens;
    const withinTarget = input.estimated_input_tokens <= input.estimated_input_token_target;
    const withinWindow = totalEstimatedTokens <= input.context_window_tokens;
    if (withinTarget && withinWindow) {
      return 'within_budget';
    }

    if (input.compression_already_applied) {
      input.blocker_codes.push('TOKEN_BUDGET_OVER_LIMIT_AFTER_COMPRESSION');
      return 'blocked_over_budget';
    }

    if (input.compression_mode === 'disallowed') {
      input.blocker_codes.push('TOKEN_BUDGET_OVER_LIMIT_COMPRESSION_DISALLOWED');
      return 'blocked_over_budget';
    }

    input.warning_codes.push('TOKEN_BUDGET_REQUIRES_COMPRESSION');
    return 'requires_compression';
  }

  private assertGateResultSchema(result: TopicSelectionTokenBudgetGateResult): void {
    if (this.tokenBudgetGateResultValidator(result)) {
      return;
    }
    const firstError = this.tokenBudgetGateResultValidator.errors?.[0];
    throw new AppError(
      500,
      'INTERNAL_ERROR',
      `token budget gate result failed schema validation at ${firstError?.instancePath || '/'}: ${
        firstError?.message ?? 'invalid result'
      }`,
    );
  }
}
