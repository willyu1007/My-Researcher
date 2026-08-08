import {
  EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
  type ExperimentFoundationScientificRuleOutcomeStatusV2,
  type ExperimentFoundationScientificValidationStatusV2,
  type ExperimentResultCellV2,
  type ScientificValidationRuleResultV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-validation-v2-contracts';
import {
  EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES,
  type ExperimentFoundationV2ArtifactContractRuleV1,
  type ExperimentFoundationV2MetricContractRuleV1,
  type ExperimentFoundationV2RequiredRuleType,
  type ExperimentFoundationV2RequiredRuleV1,
  type ExperimentFoundationScientificArtifactSlotV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-v2-contracts';
import { serverHashExperimentV2SemanticContent } from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import type {
  ExperimentFoundationSourceBoundResultCellV2,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-scientific-source-v1-contracts';

type ScientificRuleCellResult =
  | ExperimentResultCellV2
  | ExperimentFoundationSourceBoundResultCellV2;

type RuleHandler = (
  rule: ExperimentFoundationV2RequiredRuleV1,
  orderedCellResults: readonly ScientificRuleCellResult[],
  artifactSlots: readonly ExperimentFoundationScientificArtifactSlotV1[],
) => { status: Exclude<ExperimentFoundationScientificRuleOutcomeStatusV2, 'unsupported'>; detail_code: string | null };

function evaluateMetricContractRule(
  rule: ExperimentFoundationV2MetricContractRuleV1,
  orderedCellResults: readonly ScientificRuleCellResult[],
): ReturnType<RuleHandler> {
  for (const cellResult of orderedCellResults) {
    const observations = cellResult.metric_observations.filter(
      (observation) =>
        observation.metric_key === rule.metric_key && observation.split_key === rule.split_key,
    );
    if (observations.length !== rule.required_cardinality) {
      return {
        status: 'failed',
        detail_code: `metric_cardinality:${cellResult.cell_key}:${observations.length}`,
      };
    }
    for (const observation of observations) {
      if (observation.value_type !== rule.value_type) {
        return { status: 'failed', detail_code: `metric_value_type:${cellResult.cell_key}` };
      }
      if (observation.unit !== rule.unit) {
        return { status: 'failed', detail_code: `metric_unit:${cellResult.cell_key}` };
      }
      if (rule.finite_required && !Number.isFinite(observation.value)) {
        return { status: 'failed', detail_code: `metric_not_finite:${cellResult.cell_key}` };
      }
    }
  }
  return { status: 'passed', detail_code: null };
}

function evaluateArtifactContractRule(
  rule: ExperimentFoundationV2ArtifactContractRuleV1,
  orderedCellResults: readonly ScientificRuleCellResult[],
  artifactSlots: readonly ExperimentFoundationScientificArtifactSlotV1[],
): ReturnType<RuleHandler> {
  const boundSlots = artifactSlots.filter((slot) => slot.required_rule_id === rule.rule_id);
  for (const cellResult of orderedCellResults) {
    const sourceBound = cellResult.schema_version === 'v2';
    if (sourceBound && boundSlots.length !== rule.required_cardinality) {
      return {
        status: 'failed',
        detail_code: `artifact_binding_cardinality:${rule.rule_id}:${boundSlots.length}`,
      };
    }
    const artifacts = cellResult.artifact_observations.filter((artifact) => {
      if ('file_name' in artifact) {
        return artifact.artifact_kind === rule.artifact_kind
          && artifact.file_name === rule.file_name;
      }
      return boundSlots.some((slot) => (
        slot.artifact_key === artifact.artifact_key
        && slot.artifact_kind === artifact.artifact_kind
      ));
    });
    if (artifacts.length !== rule.required_cardinality) {
      return {
        status: 'failed',
        detail_code: `artifact_cardinality:${cellResult.cell_key}:${artifacts.length}`,
      };
    }
    for (const artifact of artifacts) {
      if (rule.content_hash_required && artifact.content_hash.length === 0) {
        return { status: 'failed', detail_code: `artifact_hash_missing:${cellResult.cell_key}` };
      }
      const parserBinding = 'parser_binding' in artifact
        ? artifact.parser_binding
        : sourceBound
          ? cellResult.parser_profile_version
          : null;
      if (parserBinding !== rule.parser_binding) {
        return {
          status: 'failed',
          detail_code: `artifact_parser_binding:${cellResult.cell_key}`,
        };
      }
    }
  }
  return { status: 'passed', detail_code: null };
}

/**
 * Code-local closed capability map. Not database-editable, not a rule DSL and
 * not a plugin registry; adding a rule type is a reviewed code change that also
 * changes the validator profile hash below.
 */
const SCIENTIFIC_RULE_CAPABILITY_MAP_V1: Readonly<
  Record<ExperimentFoundationV2RequiredRuleType, RuleHandler>
> = Object.freeze({
  'metric_contract@v1': (rule, cells) =>
    evaluateMetricContractRule(rule as ExperimentFoundationV2MetricContractRuleV1, cells),
  'artifact_contract@v1': (rule, cells, artifactSlots) =>
    evaluateArtifactContractRule(
      rule as ExperimentFoundationV2ArtifactContractRuleV1,
      cells,
      artifactSlots,
    ),
});

export const EXPERIMENT_FOUNDATION_SCIENTIFIC_SUPPORTED_RULE_TYPES_V2 =
  EXPERIMENT_FOUNDATION_V2_REQUIRED_RULE_TYPES;

export function computeScientificValidatorProfileHashV2(): string {
  return serverHashExperimentV2SemanticContent({
    record_kind: 'ExperimentFoundationScientificValidatorProfileV2',
    schema_version: 'v1',
    hash_profile: 'ef-scientific-validation-json@v1',
    content: {
      validator_profile_version: EXPERIMENT_FOUNDATION_SCIENTIFIC_VALIDATOR_PROFILE_VERSION_V2,
      supported_rule_types: [...EXPERIMENT_FOUNDATION_SCIENTIFIC_SUPPORTED_RULE_TYPES_V2].sort(),
      artifact_binding_capabilities: ['artifact_slot_required_rule_binding@v1'],
      comparison_capabilities: ['directional_absolute_difference@v1'],
    },
  });
}

export interface UnsupportedRequiredRuleV2 {
  rule_id: string;
  declared_rule_type: string;
}

/**
 * Readiness-time and validation-time support recheck. Any rule whose declared
 * type is outside the closed capability map must block with UNSUPPORTED_RULE
 * before Run freeze/dispatch and again before final validation.
 */
export function listUnsupportedRequiredRulesV2(
  requiredRules: ReadonlyArray<Pick<ExperimentFoundationV2RequiredRuleV1, 'rule_id' | 'rule_type'>>,
): UnsupportedRequiredRuleV2[] {
  return requiredRules
    .filter((rule) => !Object.hasOwn(SCIENTIFIC_RULE_CAPABILITY_MAP_V1, rule.rule_type))
    .map((rule) => ({ rule_id: rule.rule_id, declared_rule_type: String(rule.rule_type) }));
}

export interface ExecuteScientificRequiredRulesV2Input {
  required_rules: readonly ExperimentFoundationV2RequiredRuleV1[];
  ordered_cell_results: readonly ScientificRuleCellResult[];
  /** Required for source-bound v2 artifact rules; omitted by historical v1 validation. */
  artifact_slots?: readonly ExperimentFoundationScientificArtifactSlotV1[];
}

export interface ExecuteScientificRequiredRulesV2Output {
  ordered_rule_results: ScientificValidationRuleResultV2[];
  status: ExperimentFoundationScientificValidationStatusV2;
}

/**
 * Executes the protocol's canonically ordered required rules over the complete
 * exact batch. Subject-envelope invariants (real-provider provenance, required
 * cell completeness, exact scope) are the calling service's responsibility and
 * must be enforced before this function runs.
 */
export function executeScientificRequiredRulesV2(
  input: ExecuteScientificRequiredRulesV2Input,
): ExecuteScientificRequiredRulesV2Output {
  if (input.required_rules.length === 0) {
    throw new TypeError('required_rules must be non-empty for scientific validation');
  }
  if (input.ordered_cell_results.length === 0) {
    throw new TypeError('ordered_cell_results must be non-empty for scientific validation');
  }

  const orderedRuleResults: ScientificValidationRuleResultV2[] = input.required_rules.map(
    (rule, index) => {
      if (!Object.hasOwn(SCIENTIFIC_RULE_CAPABILITY_MAP_V1, rule.rule_type)) {
        return {
          ordinal: index + 1,
          rule_id: rule.rule_id,
          rule_type: rule.rule_type,
          status: 'unsupported',
          detail_code: 'UNSUPPORTED_RULE',
        };
      }
      const outcome = SCIENTIFIC_RULE_CAPABILITY_MAP_V1[rule.rule_type](
        rule,
        input.ordered_cell_results,
        input.artifact_slots ?? [],
      );
      return {
        ordinal: index + 1,
        rule_id: rule.rule_id,
        rule_type: rule.rule_type,
        status: outcome.status,
        detail_code: outcome.detail_code,
      };
    },
  );

  let status: ExperimentFoundationScientificValidationStatusV2 = 'passed';
  if (orderedRuleResults.some((result) => result.status === 'unsupported')) {
    status = 'unsupported';
  } else if (orderedRuleResults.some((result) => result.status === 'failed')) {
    status = 'failed';
  }

  return { ordered_rule_results: orderedRuleResults, status };
}
