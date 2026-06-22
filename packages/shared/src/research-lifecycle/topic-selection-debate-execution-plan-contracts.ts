// T-127 W-09 (DP-3.5) — provider-diverse debate execution plans. PURELY ADDITIVE: promotes the
// existing "shared/per-role profile + single per-loop model_option_id" into a NAMEABLE, role-keyed
// execution plan that maps each debate role to a per-role provider/model_option_id override. Reuses
// the v1a unit verbatim (TopicSelectionAgentExecutionSpec) — no second spec type, no second debate
// runtime, no second LLM path, no second hash. Absent a plan, the debates stay byte-identical (the
// resolver returns null === today's ctx.modelOptionId), so existing N8/N6/v1c-N2 replay holds.

import type {
  TopicSelectionAgentExecutionSpec,
} from './topic-selection-agent-profile-contracts.js';

/** The three named provider-diversity profiles. codex_assisted = the local-first cost model (codex
 *  per role); provider_compact = a single cost-efficient provider; provider_diverse = cross-provider
 *  per-role diversity (the deep, expensive mode). Concrete per-role option_ids are authored backend-side
 *  next to the model-profile registry (the values are profile-key-scoped). */
export const TOPIC_SELECTION_DEBATE_EXECUTION_PLAN_NAMES = [
  'codex_assisted',
  'provider_compact',
  'provider_diverse',
] as const;

export type TopicSelectionDebateExecutionPlanName =
  (typeof TOPIC_SELECTION_DEBATE_EXECUTION_PLAN_NAMES)[number];

/** The two debate_level enum families found in the contracts: the N6/N7 escalation family
 *  (mixed_cost_control | provider_diverse_deep, on debate_escalation) and the N8 admission family
 *  (compact_assessment_debate | provider_diverse_deep_debate). */
export type TopicSelectionDebateLevel =
  | 'mixed_cost_control'
  | 'provider_diverse_deep'
  | 'compact_assessment_debate'
  | 'provider_diverse_deep_debate';

/** A named, role-keyed execution plan for ONE debate family. Mirrors the v1a execution_plan precedence
 *  (roles[slot] -> default) but is role-keyed only (no per-instance keys): N8/v1c are flat fixed-role,
 *  and N6 fan-out applies one spec per ROLE FAMILY (explorer_0/explorer_1 share the explorer spec). */
export interface TopicSelectionNamedDebateExecutionPlan<TRole extends string> {
  name: TopicSelectionDebateExecutionPlanName;
  /** Precedence tail applied to any role without an explicit entry. */
  default?: TopicSelectionAgentExecutionSpec | null;
  /** Per-role override; each value's model_option_id is in THAT role's profile namespace. */
  roles?: Partial<Record<TRole, TopicSelectionAgentExecutionSpec>> | null;
}

/** Deterministic debate_level -> named plan mapping (covers BOTH enum families). codex_assisted is NOT
 *  reachable from a debate_level — it is selected explicitly by the caller / run_mode, never by escalation. */
export function debateLevelToExecutionPlanName(
  level: TopicSelectionDebateLevel,
): Extract<TopicSelectionDebateExecutionPlanName, 'provider_compact' | 'provider_diverse'> {
  switch (level) {
    case 'mixed_cost_control':
    case 'compact_assessment_debate':
      return 'provider_compact';
    case 'provider_diverse_deep':
    case 'provider_diverse_deep_debate':
      return 'provider_diverse';
    default: {
      const exhaustive: never = level;
      return exhaustive;
    }
  }
}

/** Resolve the effective per-role ExecutionSpec from a plan (precedence: roles[role] -> default -> null).
 *  Pure; the debate strategies call this in invocationEnvelope. */
export function resolveDebateExecutionSpec<TRole extends string>(
  plan: TopicSelectionNamedDebateExecutionPlan<TRole> | null | undefined,
  role: TRole,
): TopicSelectionAgentExecutionSpec | null {
  if (!plan) {
    return null;
  }
  return plan.roles?.[role] ?? plan.default ?? null;
}

/** The effective per-role model_option_id from a plan — null when no plan/spec covers the role, which is
 *  EXACTLY today's value (ctx.modelOptionId default), so an absent plan is byte-identical. */
export function resolveDebateExecutionModelOptionId<TRole extends string>(
  plan: TopicSelectionNamedDebateExecutionPlan<TRole> | null | undefined,
  role: TRole,
): string | null {
  return resolveDebateExecutionSpec(plan, role)?.model_option_id ?? null;
}

/** JSON-schema factory for a named debate execution plan over a FIXED set of role slot ids (so each
 *  debate validates its own role keys). Mirrors the v1a execution_spec rule: a model_option_id requires
 *  execution_mode 'provider_llm' (codex/mocked select no provider option). */
export function topicSelectionNamedDebateExecutionPlanSchema(
  roleSlotIds: readonly string[],
): Record<string, unknown> {
  const executionSpecSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['execution_mode'],
    properties: {
      execution_mode: { enum: ['mocked_llm', 'provider_llm', 'codex_assisted'] },
      model_option_id: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    },
  } as const;
  return {
    type: 'object',
    additionalProperties: false,
    required: ['name'],
    properties: {
      name: { enum: [...TOPIC_SELECTION_DEBATE_EXECUTION_PLAN_NAMES] },
      default: { anyOf: [executionSpecSchema, { type: 'null' }] },
      roles: {
        type: 'object',
        additionalProperties: false,
        properties: Object.fromEntries(roleSlotIds.map((slot) => [slot, executionSpecSchema])),
      },
    },
  };
}

/** v1a's assertNoMixedExecutionPlanAndLegacyOverrides analog: forbid co-supplying a named execution
 *  plan AND a legacy per-loop model_option_id on the same runtime entry (the plan is the sole override
 *  channel). Returns an error message or null. */
export function debateExecutionPlanMixingError<TRole extends string>(
  plan: TopicSelectionNamedDebateExecutionPlan<TRole> | null | undefined,
  legacyModelOptionId: string | null | undefined,
): string | null {
  if (plan && legacyModelOptionId) {
    return 'A named debate execution_plan cannot be combined with a legacy per-loop model_option_id.';
  }
  return null;
}
