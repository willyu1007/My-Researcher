/**
 * W-12 / D-T127-01 (slice 10): the v1b harness gate-issue builders + ref/string comparison and key
 * utilities, relocated VERBATIM from the harness. Pure, `this`-free helpers that the node-specific
 * builders and runners depend on. Intra-cluster calls (nullableRefsEqual -> refsEqual,
 * refArraysEqual -> refsEqual) resolve within this module; `buildRef` (harness `ref`) comes from the
 * pure-utils module. Behavior is identical.
 */
import type {
  TopicSelectionAgentExecutionMode,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TopicSelectionAgentRunMode } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-agent-profile-contracts';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionGateIssue,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessNodePolicy,
  TopicSelectionV1bWorkflowHarnessRunRequest,
  TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { buildRef } from './topic-selection-v1b-harness-pure-utils.js';

export function blocker(
  code: string,
  message: string,
  refs: TopicSelectionFunctionalRef[],
): TopicSelectionGateIssue {
  return {
    code,
    message,
    severity: 'blocking',
    refs,
  };
}

export function warning(
  code: string,
  message: string,
  refs?: TopicSelectionFunctionalRef[],
): TopicSelectionGateIssue {
  return {
    code,
    message,
    severity: 'warning',
    refs,
  };
}

export function refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
  return left.ref_type === right.ref_type
    && left.ref_id === right.ref_id
    && (left.version_id ?? null) === (right.version_id ?? null)
    && (left.title_card_id ?? null) === (right.title_card_id ?? null);
}

export function nullableRefsEqual(
  left: TopicSelectionFunctionalRef | null | undefined,
  right: TopicSelectionFunctionalRef | null | undefined,
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return refsEqual(left, right);
}

export function refArraysEqual(left: TopicSelectionFunctionalRef[], right: TopicSelectionFunctionalRef[]): boolean {
  return left.length === right.length
    && left.every((leftRef, index) => refsEqual(leftRef, right[index]!));
}

export function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function refKey(ref: TopicSelectionFunctionalRef): string {
  return [
    ref.ref_type,
    ref.ref_id,
    ref.version_id ?? '',
    ref.title_card_id ?? '',
  ].join(':');
}

export function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function versionFromId(id: string): string {
  return `v_${id.split('_').at(-1) ?? '1'}`;
}

export function nodeAttemptRef(input: TopicSelectionV1bWorkflowHarnessRunRequest): TopicSelectionFunctionalRef {
  return buildRef('v1b_workflow_harness_node_attempt', input.node_attempt_id, input.title_card_id ?? null);
}

export function firstDuplicate(values: string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }
  return null;
}

export function effectiveRunMode(
  runMode: TopicSelectionAgentRunMode | null,
  executionMode: TopicSelectionAgentExecutionMode,
): TopicSelectionAgentRunMode {
  if (runMode) {
    return runMode;
  }
  return executionMode === 'mocked_llm' ? 'test' : 'acceptance';
}

export function requiredModelLikeSlot(
  policy: TopicSelectionV1bWorkflowHarnessNodePolicy,
): TopicSelectionV1bWorkflowHarnessSemanticSupportSlotSpec | null {
  return policy.semantic_support_slots.find((slot) => (
    slot.required_for_progress && slot.allowed_effect === 'model_draft_for_gate'
  )) ?? null;
}
