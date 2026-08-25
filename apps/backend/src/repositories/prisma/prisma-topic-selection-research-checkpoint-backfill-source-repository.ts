import type { PrismaClient } from '@prisma/client';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionResearchCheckpointBackfillAnchor,
  TopicSelectionResearchCheckpointBackfillSourceRepository,
} from '../topic-selection-research-checkpoint-backfill-source.repository.js';

export class PrismaTopicSelectionResearchCheckpointBackfillSourceRepository
implements TopicSelectionResearchCheckpointBackfillSourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listBackfillAnchors(): Promise<TopicSelectionResearchCheckpointBackfillAnchor[]> {
    const [evidenceRows, candidateRows, questionRows, promotionRows] = await Promise.all([
      this.prisma.topicSelectionEvidenceMap.findMany({
        where: { status: 'ready', freshnessStatus: 'current' },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.topicSelectionNeedCandidate.findMany({
        where: { freshnessStatus: 'current', mergedIntoNeedCandidateId: null },
        orderBy: [{ evidenceMapId: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.topicSelectionTopicQuestionContract.findMany({
        where: { status: 'active' },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.topicSelectionPromotionGateCheck.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    ]);
    const evidenceByTitle = latestByTitle(evidenceRows);
    const questionsByTitle = latestByTitle(questionRows);
    const promotionsByTitle = latestByTitle(promotionRows);
    const candidatesByEvidenceMap = new Map<string, typeof candidateRows>();
    for (const candidate of candidateRows) {
      const group = candidatesByEvidenceMap.get(candidate.evidenceMapId) ?? [];
      group.push(candidate);
      candidatesByEvidenceMap.set(candidate.evidenceMapId, group);
    }

    const anchors: TopicSelectionResearchCheckpointBackfillAnchor[] = [];
    for (const evidence of evidenceByTitle.values()) {
      const evidenceRef = ref('evidence_map', evidence.id, evidence.titleCardId, evidence.evidenceMapVersion);
      anchors.push({
        workspace_id: evidence.workspaceId,
        title_card_id: evidence.titleCardId,
        checkpoint_kind: 'evidence_landscape',
        target_ref: evidenceRef,
        target_snapshot_payload: {
          evidence_map_id: evidence.id,
          evidence_map_version: evidence.evidenceMapVersion,
          status: evidence.status,
          review_status: evidence.reviewStatus,
          freshness_status: evidence.freshnessStatus,
          search_run_id: evidence.searchRunId,
          search_plan_id: evidence.searchPlanId,
          literature_snapshot_id: evidence.literatureSnapshotId,
          unit_counts: {
            total: evidence.unitCount,
            support: evidence.supportUnitCount,
            challenge: evidence.challengeUnitCount,
            baseline: evidence.baselineUnitCount,
            context: evidence.contextUnitCount,
          },
          digest_payload: evidence.digestPayload,
          stale_reason_codes: evidence.staleReasonCodes,
        },
        source_refs: [
          ref('search_run', evidence.searchRunId, evidence.titleCardId),
          ref('search_plan', evidence.searchPlanId, evidence.titleCardId),
          ref('literature_resource_pool_snapshot', evidence.literatureSnapshotId, evidence.titleCardId),
        ],
        allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
        packet_payload: {
          evidence_map_ref: evidenceRef,
          review_status: evidence.reviewStatus,
          freshness_status: evidence.freshnessStatus,
          unit_counts: {
            total: evidence.unitCount,
            support: evidence.supportUnitCount,
            challenge: evidence.challengeUnitCount,
            baseline: evidence.baselineUnitCount,
            context: evidence.contextUnitCount,
          },
          digest_payload: evidence.digestPayload,
          stale_reason_codes: evidence.staleReasonCodes,
          required_semantic_review: [
            'nearest_work',
            'disconfirming_evidence',
            'source_quality',
          ],
        },
      });

      const candidates = candidatesByEvidenceMap.get(evidence.id) ?? [];
      if (candidates.length > 0) {
        const candidatePayloads = candidates.map((candidate) => ({
          need_candidate_id: candidate.id,
          candidate_version: candidate.candidateVersion,
          lifecycle_status: candidate.lifecycleStatus,
          decision_status: candidate.decisionStatus,
          review_status: candidate.reviewStatus,
          freshness_status: candidate.freshnessStatus,
          candidate_need: candidate.candidateNeed,
          unmet_need_statement: candidate.unmetNeedStatement,
          mechanism_type: candidate.mechanismType,
          mechanism_summary: candidate.mechanismSummary,
          prior_art_status: candidate.priorArtStatus,
          gap_codes: candidate.gapCodes,
          speculative: candidate.speculative,
          confidence: candidate.confidence,
        }));
        const arenaId = `gap_arena:${evidence.id}`;
        anchors.push({
          workspace_id: evidence.workspaceId,
          title_card_id: evidence.titleCardId,
          checkpoint_kind: 'gap_selection',
          target_ref: ref('need_candidate_arena', arenaId, evidence.titleCardId, evidence.evidenceMapVersion),
          target_snapshot_payload: {
            evidence_map_ref: evidenceRef,
            candidates: candidatePayloads,
          },
          source_refs: [
            evidenceRef,
            ...candidates.map((candidate) => ref(
              'need_candidate',
              candidate.id,
              evidence.titleCardId,
              candidate.candidateVersion,
            )),
          ],
          allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
          packet_payload: {
            evidence_map_ref: evidenceRef,
            candidate_count: candidates.length,
            candidates: candidatePayloads,
            distinct_viable_alternative_required: true,
          },
        });
      }
    }

    for (const question of questionsByTitle.values()) {
      const questionRef = ref(
        'topic_question_contract',
        question.id,
        question.titleCardId,
        question.version,
      );
      anchors.push({
        workspace_id: question.workspaceId,
        title_card_id: question.titleCardId,
        checkpoint_kind: 'question_contract',
        target_ref: questionRef,
        target_snapshot_hash: question.contractHash,
        target_snapshot_payload: {
          topic_question_contract_id: question.id,
          contract_hash: question.contractHash,
        },
        source_refs: [
          ref('research_slice', question.sourceResearchSliceId, question.titleCardId, question.sourceResearchSliceVersion),
          ref('topic_question_answerability_plan', question.answerabilityPlanId, question.titleCardId),
          ref('topic_question_candidate', question.sourceCandidateId, question.titleCardId),
          ref('topic_question_selection_decision', question.selectionDecisionId, question.titleCardId),
        ],
        allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
        packet_payload: {
          topic_question_contract_ref: questionRef,
          main_question: question.mainQuestion,
          question_type: question.questionType,
          contribution_hypothesis: question.contributionHypothesis,
          target_setting: question.targetSetting,
          target_community: question.targetCommunity,
          expected_claim: question.expectedClaim,
          fallback_claim: question.fallbackClaim,
          max_claim_strength: question.maxClaimStrength,
          evaluation_route: question.evaluationRoute,
          claim_ceiling: question.claimCeiling,
          prohibited_claims: question.prohibitedClaims,
          required_evidence_categories: question.requiredEvidenceCategories,
          risk_notes: question.riskNotes,
        },
      });
    }

    for (const gate of promotionsByTitle.values()) {
      const gateRef = ref('promotion_gate_check', gate.id, gate.titleCardId);
      anchors.push({
        workspace_id: gate.workspaceId,
        title_card_id: gate.titleCardId,
        checkpoint_kind: 'promotion',
        target_ref: gateRef,
        target_snapshot_payload: {
          promotion_gate_check_id: gate.id,
          promotion_input_snapshot_hash: gate.promotionInputSnapshotHash,
          disposition: gate.disposition,
          promote_allowed: gate.promoteAllowed,
          blockers: gate.blockers,
          warnings: gate.warnings,
          required_actions: gate.requiredActions,
          accepted_risk_refs: gate.acceptedRiskRefs,
          snapshot_hashes: gate.snapshotHashes,
        },
        source_refs: [
          ref('promotion_input_snapshot', gate.promotionInputSnapshotId, gate.titleCardId),
          ref('promotion_decision_support', gate.promotionDecisionSupportId, gate.titleCardId),
          ref('promotion_dossier', gate.promotionDossierId, gate.titleCardId),
          ref('argument_readiness_mini_check', gate.argumentReadinessMiniCheckId, gate.titleCardId),
        ],
        allowed_actions: ['advance', 'loopback', 'reject', 'hold'],
        packet_payload: {
          promotion_gate_check_ref: gateRef,
          promotion_input_snapshot_hash: gate.promotionInputSnapshotHash,
          disposition: gate.disposition,
          promote_allowed: gate.promoteAllowed,
          blockers: gate.blockers,
          warnings: gate.warnings,
          required_actions: gate.requiredActions,
          accepted_risk_refs: gate.acceptedRiskRefs,
          blocker_refs: gate.blockerRefs,
          recheck_request_refs: gate.recheckRequestRefs,
        },
      });
    }

    return anchors.sort((left, right) => {
      const byTitle = left.title_card_id.localeCompare(right.title_card_id);
      return byTitle || left.checkpoint_kind.localeCompare(right.checkpoint_kind);
    });
  }
}

function latestByTitle<T extends { titleCardId: string }>(rows: T[]): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (!latest.has(row.titleCardId)) latest.set(row.titleCardId, row);
  }
  return latest;
}

function ref(
  refType: string,
  refId: string,
  titleCardId: string,
  versionId: string | null = null,
): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    version_id: versionId,
    title_card_id: titleCardId,
  };
}
