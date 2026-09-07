import { topicSelectionRiskFindingRefs } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionPromotionInputSnapshotHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';

export const PROMOTION_SUPPORT_DEBATE_POLICY = 'material-risk-required-v1';

// Legacy bundles may carry material findings only in their artifact refs.
export function promotionSupportRiskFindingRefs(handoff: TopicSelectionPromotionInputSnapshotHandoff) {
  return topicSelectionRiskFindingRefs([
    ...(handoff.risk_finding_refs ?? []),
    ...(handoff.snapshot.risk_finding_refs ?? []),
    ...(handoff.snapshot.source_bundle_snapshot.risk_finding_refs ?? []),
    ...(handoff.snapshot.source_bundle_snapshot.artifact_refs ?? []),
  ]);
}

export function promotionSupportDebateRequired(handoff: TopicSelectionPromotionInputSnapshotHandoff) {
  return handoff.accepted_risk_refs.length > 0 || promotionSupportRiskFindingRefs(handoff).length > 0;
}
