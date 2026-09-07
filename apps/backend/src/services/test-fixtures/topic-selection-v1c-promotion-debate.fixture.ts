import type { TopicSelectionPromotionInputSnapshotHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import {
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
  TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
  type TopicSelectionV1cN2BoundedDebateRoleOutput,
  type TopicSelectionV1cN2BoundedDebateRoleSlotId,
} from '../topic-selection-v1c-n2-bounded-debate-admission-service.js';

function roleOutput(
  slot: TopicSelectionV1cN2BoundedDebateRoleSlotId,
  handoff: TopicSelectionPromotionInputSnapshotHandoff,
): TopicSelectionV1cN2BoundedDebateRoleOutput {
  const evidenceRef = handoff.evidence_refs[0]!.evidence_ref;
  if (slot === 'n2_bounded_micro_debate.promotion_supporter_draft') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      support_summary: 'Support draft preserves bounded claim and source refs.',
      support_points: [{
        point_id: 'support_point_001',
        point: 'The topic package has selected evidence and bounded evaluation plan.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      risk_acknowledgements: handoff.accepted_risk_refs.map((risk_ref) => ({ risk_ref, handling: 'Carry forward.' })),
      recheck_obligations: handoff.recheck_request_refs.map((recheck_ref) => ({ recheck_ref, handling: 'Carry forward.' })),
    };
  }
  if (slot === 'n2_bounded_micro_debate.reviewer_critic_review') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      critic_findings: [{
        finding_id: 'critic_finding_001',
        severity: 'warning',
        issue: 'Final support must preserve claim ceiling, accepted risk, and recheck refs.',
        required_resolution: 'Address in final semantic layer.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      required_repairs: ['Preserve accepted risk and recheck refs.'],
    };
  }
  if (slot === 'n2_bounded_micro_debate.promotion_supporter_repair') {
    return {
      schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_ROLE_OUTPUT_SCHEMA_VERSION,
      role_slot: slot,
      repaired_summary: 'Repair addresses critic finding.',
      accepted_findings: ['critic_finding_001'],
      rebutted_findings: [],
      repair_actions: [{
        finding_id: 'critic_finding_001',
        resolution_status: 'accepted_and_repaired',
        repair_note: 'Added final semantic layer coverage.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
    };
  }
  return {
    schema_version: TOPIC_SELECTION_V1C_N2_BOUNDED_DEBATE_FINAL_OUTPUT_SCHEMA_VERSION,
    role_slot: slot,
    final_support_summary: 'Final support is ready for N3 deterministic gate review.',
    dossier_markdown: 'Dossier preserves claim ceiling, selected evidence, accepted risk, and recheck obligations.',
    reviewer_questions: ['Are selected evidence refs still current before outline lock?'],
    risk_notes: handoff.accepted_risk_refs.map((risk_ref) => ({ risk_ref, note: 'Accepted risk preserved.' })),
    recheck_notes: handoff.recheck_request_refs.map((recheck_ref) => ({ recheck_ref, note: 'Recheck preserved without automatic loopback.' })),
    n3_semantic_layer: {
      claim_ceiling_alignment: { status: 'addressed', summary: 'Correlation and mechanism claims only.', source_refs: [handoff.topic_package_ref] },
      contribution_summary: { status: 'addressed', summary: 'A focused contribution summary.', source_refs: [handoff.topic_package_ref] },
      evaluation_plan_summary: { status: 'addressed', summary: 'A bounded evaluation plan.', source_refs: [handoff.topic_package_ref] },
      evidence_support_map: { status: 'addressed', evidence_refs: [evidenceRef] },
      accepted_risk_acknowledgements: { status: 'addressed', risk_refs: handoff.accepted_risk_refs },
      recheck_obligation_summary: { status: 'addressed', recheck_refs: handoff.recheck_request_refs },
      critic_finding_resolution_map: [{
        finding_id: 'critic_finding_001',
        resolution_status: 'accepted_and_repaired',
        resolution_note: 'Handled in final semantic layer.',
        source_refs: [handoff.topic_package_ref, evidenceRef],
      }],
      readiness_coverage_items: [
        { slot: 'claim_ceiling', status: 'addressed', source_refs: [handoff.topic_package_ref] },
        { slot: 'selected_evidence', status: 'addressed', source_refs: [evidenceRef] },
      ],
    },
  };
}

export function promotionDebateRoleOutputs(handoff: TopicSelectionPromotionInputSnapshotHandoff): Record<TopicSelectionV1cN2BoundedDebateRoleSlotId, TopicSelectionV1cN2BoundedDebateRoleOutput> {
  return {
    'n2_bounded_micro_debate.promotion_supporter_draft': roleOutput('n2_bounded_micro_debate.promotion_supporter_draft', handoff),
    'n2_bounded_micro_debate.reviewer_critic_review': roleOutput('n2_bounded_micro_debate.reviewer_critic_review', handoff),
    'n2_bounded_micro_debate.promotion_supporter_repair': roleOutput('n2_bounded_micro_debate.promotion_supporter_repair', handoff),
    'n2_bounded_micro_debate.synthesizer_final': roleOutput('n2_bounded_micro_debate.synthesizer_final', handoff),
  };
}
