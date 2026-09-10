import { topicSelectionFunctionalRefSchema } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { topicSelectionPromotionConditionCandidateSchema } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import { TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION, TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId } from './topic-selection-v1c-n2-bounded-debate-admission-service.js';

const text = { type: 'string', minLength: 1 };
const array = (items: Record<string, unknown>) => ({ type: 'array', items });
const object = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const refs = array(topicSelectionFunctionalRefSchema);
const resolution = { enum: ['accepted_and_repaired', 'accepted_as_risk', 'rebutted_with_refs'] };
const summary = object({ status: text, summary: text, source_refs: refs });

/** Each CLI turn has an explicit shape; open diagnostic schemas discard fields in strict output mode. */
export function promotionDebateCliRoleSchema(slot: TopicSelectionV1cN2BoundedDebateRoleSlotId): Record<string, unknown> {
  let fields: Record<string, unknown>;
  if (slot === 'n2_bounded_micro_debate.promotion_supporter_draft') {
    fields = { support_summary: text, support_points: array(object({ point_id: text, point: text, source_refs: refs })),
      risk_acknowledgements: array(object({ risk_ref: topicSelectionFunctionalRefSchema, handling: text })),
      recheck_obligations: array(object({ recheck_ref: topicSelectionFunctionalRefSchema, handling: text })) };
  } else if (slot === 'n2_bounded_micro_debate.reviewer_critic_review') {
    fields = { critic_findings: array(object({ finding_id: text, severity: { enum: ['warning', 'blocking'] }, issue: text,
      required_resolution: text, source_refs: refs })), required_repairs: array(text) };
  } else if (slot === 'n2_bounded_micro_debate.promotion_supporter_repair') {
    fields = { repaired_summary: text, accepted_findings: array(text), rebutted_findings: array(text),
      repair_actions: array(object({ finding_id: text, resolution_status: resolution, repair_note: text, source_refs: refs })) };
  } else {
    fields = { final_support_summary: text, dossier_markdown: text, reviewer_questions: array(text),
      risk_notes: array(object({ risk_ref: topicSelectionFunctionalRefSchema, note: text })),
      recheck_notes: array(object({ recheck_ref: topicSelectionFunctionalRefSchema, note: text })),
      condition_candidates: array(topicSelectionPromotionConditionCandidateSchema),
      n3_semantic_layer: object({ claim_ceiling_alignment: summary, contribution_summary: summary, evaluation_plan_summary: summary,
        evidence_support_map: object({ status: text, evidence_refs: refs }),
        accepted_risk_acknowledgements: object({ status: text, risk_refs: refs }),
        material_risk_acknowledgements: object({ status: text, risk_refs: refs }),
        recheck_obligation_summary: object({ status: text, recheck_refs: refs }),
        critic_finding_resolution_map: array(object({ finding_id: text, resolution_status: resolution, resolution_note: text, source_refs: refs })),
        readiness_coverage_items: array(object({ slot: text, status: text, source_refs: refs })) }) };
  }
  return object({ schema_version: { const: slot === 'n2_bounded_micro_debate.synthesizer_final'
    ? TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION : TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION },
  role_slot: { const: slot }, ...fields });
}
