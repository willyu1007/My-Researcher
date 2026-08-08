import { createHash } from 'node:crypto';

import type {
  ExperimentFoundationRunCellV2,
  ExperimentFoundationScientificDirectionalDifferenceRuleV1,
  ExperimentFoundationScientificObservationSlotV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import type {
  ExperimentFoundationSourceBoundResultCellV2,
  ScientificObservationV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';
import type {
  ScientificComparisonFailureDetailCodeV1,
  ScientificComparisonFactV1,
  ScientificComparisonRelationReasonV1,
  ScientificComparisonRelationV1,
  ScientificComparisonRuleResultV1,
  ScientificDirectionalDifferenceRuleProjectionV1,
  ScientificObservationRefV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  serverHashExperimentFoundationScientificComparisonFactV1,
  serverHashExperimentFoundationScientificComparisonRuleV1,
  serverHashExperimentFoundationScientificObservationV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

export interface ExecuteScientificComparisonsV1Input {
  run_id: string;
  evaluation_protocol_revision_hash: string;
  ordered_cells: ExperimentFoundationRunCellV2[];
  ordered_cell_results: ExperimentFoundationSourceBoundResultCellV2[];
  observation_slots: ExperimentFoundationScientificObservationSlotV1[];
  comparison_rules: ExperimentFoundationScientificDirectionalDifferenceRuleV1[];
}

export interface ExecuteScientificComparisonsV1Result {
  status: 'passed' | 'failed';
  ordered_comparison_results: ScientificComparisonRuleResultV1[];
}

export function executeScientificComparisonsV1(
  input: ExecuteScientificComparisonsV1Input,
): ExecuteScientificComparisonsV1Result {
  const resultsByCellId = new Map(
    input.ordered_cell_results.map((result) => [result.run_cell_id, result]),
  );
  const slotsByKey = new Map(
    input.observation_slots.map((slot) => [slot.observation_key, slot]),
  );

  const orderedComparisonResults = input.comparison_rules.map((rule) => {
    const ruleProjection = projectRule(rule);
    const ruleHash = serverHashExperimentFoundationScientificComparisonRuleV1({
      comparison_key: rule.comparison_key,
      ordinal: rule.ordinal,
      left_cell_ordinal: rule.left_cell_ordinal,
      right_cell_ordinal: rule.right_cell_ordinal,
      observation_key: rule.observation_key,
      ...ruleProjection,
    });
    const leftCell = input.ordered_cells.find(
      (cell) => cell.ordinal === rule.left_cell_ordinal,
    );
    const rightCell = input.ordered_cells.find(
      (cell) => cell.ordinal === rule.right_cell_ordinal,
    );
    const expectedSlot = slotsByKey.get(rule.observation_key);
    if (!leftCell || !rightCell || !expectedSlot) {
      throw new TypeError(`CMP-B1 protocol binding is invalid: ${rule.comparison_key}`);
    }

    const leftResult = resultsByCellId.get(leftCell.run_cell_id);
    const rightResult = resultsByCellId.get(rightCell.run_cell_id);
    if (!leftResult || !rightResult) {
      throw new TypeError(`CMP-B1 result batch is incomplete: ${rule.comparison_key}`);
    }

    const leftMatches = leftResult.metric_observations.filter(
      (observation) => observation.observation_key === rule.observation_key,
    );
    const rightMatches = rightResult.metric_observations.filter(
      (observation) => observation.observation_key === rule.observation_key,
    );
    const leftObservation = leftMatches[0];
    const rightObservation = rightMatches[0];
    if (
      leftMatches.length !== 1
      || rightMatches.length !== 1
      || !leftObservation
      || !rightObservation
    ) {
      return failedResult(
        rule,
        ruleHash,
        'COMPARISON_OBSERVATION_MISSING_OR_DUPLICATED',
      );
    }
    if (
      leftObservation.unit !== expectedSlot.unit
      || rightObservation.unit !== expectedSlot.unit
      || leftObservation.unit !== rightObservation.unit
    ) {
      return failedResult(rule, ruleHash, 'COMPARISON_OBSERVATION_UNIT_MISMATCH');
    }
    if (!Number.isFinite(leftObservation.value) || !Number.isFinite(rightObservation.value)) {
      return failedResult(rule, ruleHash, 'COMPARISON_OBSERVATION_NON_FINITE');
    }

    const rawEffectValue = leftObservation.value - rightObservation.value;
    if (!Number.isFinite(rawEffectValue)) {
      return failedResult(rule, ruleHash, 'COMPARISON_OBSERVATION_NON_FINITE');
    }

    let rawEffectInterval: ScientificComparisonFactV1['raw_effect_interval'] = null;
    let relation: ScientificComparisonRelationV1;
    let reason: ScientificComparisonRelationReasonV1;
    if (rule.uncertainty_policy.kind === 'confidence_interval_guard') {
      const leftUncertainty = leftObservation.uncertainty;
      const rightUncertainty = rightObservation.uncertainty;
      if (
        leftUncertainty.kind !== 'confidence_interval'
        || rightUncertainty.kind !== 'confidence_interval'
        || leftUncertainty.level !== rule.uncertainty_policy.confidence_level
        || rightUncertainty.level !== rule.uncertainty_policy.confidence_level
        || leftUncertainty.method_key !== rule.uncertainty_policy.method_key
        || rightUncertainty.method_key !== rule.uncertainty_policy.method_key
      ) {
        return failedResult(
          rule,
          ruleHash,
          'COMPARISON_REQUIRED_CI_MISSING_OR_MISMATCHED',
        );
      }
      if (
        !isValidInterval(leftObservation)
        || !isValidInterval(rightObservation)
      ) {
        return failedResult(rule, ruleHash, 'COMPARISON_REQUIRED_CI_INVALID');
      }
      rawEffectInterval = {
        lower: leftUncertainty.lower - rightUncertainty.upper,
        upper: leftUncertainty.upper - rightUncertainty.lower,
        unit: expectedSlot.unit,
      };
      if (
        !Number.isFinite(rawEffectInterval.lower)
        || !Number.isFinite(rawEffectInterval.upper)
        || rawEffectInterval.lower > rawEffectInterval.upper
      ) {
        return failedResult(rule, ruleHash, 'COMPARISON_REQUIRED_CI_INVALID');
      }
      const orientedLower = rule.direction === 'higher_is_support'
        ? rawEffectInterval.lower
        : -rawEffectInterval.upper;
      const orientedUpper = rule.direction === 'higher_is_support'
        ? rawEffectInterval.upper
        : -rawEffectInterval.lower;
      ({ relation, reason } = classifyInterval(
        orientedLower,
        orientedUpper,
        rule.support_min,
        rule.contradiction_max,
      ));
    } else {
      const orientedEffect = rule.direction === 'higher_is_support'
        ? rawEffectValue
        : -rawEffectValue;
      ({ relation, reason } = classifyPoint(
        orientedEffect,
        rule.support_min,
        rule.contradiction_max,
      ));
    }

    const factWithoutHash: Omit<ScientificComparisonFactV1, 'comparison_fact_hash'> = {
      schema_version: 'ExperimentFoundationScientificComparisonFact@v1',
      comparison_fact_id: deterministicComparisonFactId(
        input.run_id,
        input.evaluation_protocol_revision_hash,
        rule.comparison_key,
      ),
      ordinal: rule.ordinal,
      comparison_key: rule.comparison_key,
      evaluation_protocol_revision_hash: input.evaluation_protocol_revision_hash,
      rule_hash: ruleHash,
      rule_projection: ruleProjection,
      left_observation_ref: observationRef(leftResult, leftObservation),
      right_observation_ref: observationRef(rightResult, rightObservation),
      raw_effect: {
        kind: 'absolute_difference',
        value: rawEffectValue,
        unit: expectedSlot.unit,
      },
      raw_effect_interval: rawEffectInterval,
      registered_relation: relation,
      relation_reason: reason,
    };
    return {
      ordinal: rule.ordinal,
      comparison_key: rule.comparison_key,
      rule_hash: ruleHash,
      status: 'passed' as const,
      detail_code: null,
      fact: {
        ...factWithoutHash,
        comparison_fact_hash:
          serverHashExperimentFoundationScientificComparisonFactV1(factWithoutHash),
      },
    };
  });

  return {
    status: orderedComparisonResults.some((result) => result.status === 'failed')
      ? 'failed'
      : 'passed',
    ordered_comparison_results: orderedComparisonResults,
  };
}

function projectRule(
  rule: ExperimentFoundationScientificDirectionalDifferenceRuleV1,
): ScientificDirectionalDifferenceRuleProjectionV1 {
  return {
    effect_kind: rule.effect_kind,
    direction: rule.direction,
    support_min: rule.support_min,
    contradiction_max: rule.contradiction_max,
    uncertainty_policy: structuredClone(rule.uncertainty_policy),
  };
}

function failedResult(
  rule: ExperimentFoundationScientificDirectionalDifferenceRuleV1,
  ruleHash: string,
  detailCode: ScientificComparisonFailureDetailCodeV1,
): ScientificComparisonRuleResultV1 {
  return {
    ordinal: rule.ordinal,
    comparison_key: rule.comparison_key,
    rule_hash: ruleHash,
    status: 'failed',
    detail_code: detailCode,
    fact: null,
  };
}

function isValidInterval(observation: ScientificObservationV1): boolean {
  if (observation.uncertainty.kind !== 'confidence_interval') return false;
  const { lower, upper } = observation.uncertainty;
  return Number.isFinite(lower)
    && Number.isFinite(upper)
    && lower <= upper
    && observation.value >= lower
    && observation.value <= upper;
}

function classifyPoint(
  orientedEffect: number,
  supportMin: number,
  contradictionMax: number,
): { relation: ScientificComparisonRelationV1; reason: ScientificComparisonRelationReasonV1 } {
  if (orientedEffect >= supportMin) {
    return { relation: 'supports_registered_expectation', reason: 'support_band_met' };
  }
  if (orientedEffect <= contradictionMax) {
    return { relation: 'contradicts_registered_expectation', reason: 'contradiction_band_met' };
  }
  return { relation: 'indeterminate', reason: 'decision_gap' };
}

function classifyInterval(
  orientedLower: number,
  orientedUpper: number,
  supportMin: number,
  contradictionMax: number,
): { relation: ScientificComparisonRelationV1; reason: ScientificComparisonRelationReasonV1 } {
  if (orientedLower >= supportMin) {
    return { relation: 'supports_registered_expectation', reason: 'support_band_met' };
  }
  if (orientedUpper <= contradictionMax) {
    return { relation: 'contradicts_registered_expectation', reason: 'contradiction_band_met' };
  }
  return {
    relation: 'indeterminate',
    reason: 'uncertainty_interval_not_decisive',
  };
}

function observationRef(
  result: ExperimentFoundationSourceBoundResultCellV2,
  observation: ScientificObservationV1,
): ScientificObservationRefV1 {
  return {
    run_cell_id: result.run_cell_id,
    result_id: result.result_id,
    result_content_hash: result.content_hash,
    observation_id: observation.observation_id,
    observation_ordinal: observation.ordinal,
    observation_key: observation.observation_key,
    observation_hash: serverHashExperimentFoundationScientificObservationV1(observation),
  };
}

function deterministicComparisonFactId(
  runId: string,
  protocolHash: string,
  comparisonKey: string,
): string {
  const digest = createHash('sha256')
    .update('ef_scientific_comparison_fact_v1')
    .update('\0')
    .update(runId)
    .update('\0')
    .update(protocolHash)
    .update('\0')
    .update(comparisonKey)
    .digest('hex');
  return `ef_scientific_comparison_fact_v1_${digest}`;
}
