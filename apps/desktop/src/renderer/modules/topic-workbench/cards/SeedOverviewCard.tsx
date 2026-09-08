import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type { TitleCardWorkbenchSummary } from '../types';
import type {
  TopicSelectionSearchPlanRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import type {
  TopicSelectionEvidenceMapRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
  TopicSelectionValidatedNeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';

type SeedOverviewCardProps = {
  titleCard: TitleCardWorkbenchSummary | null;
  searchPlans: TopicSelectionSearchPlanRecord[];
  evidenceMaps: TopicSelectionEvidenceMapRecord[];
  needCandidates: TopicSelectionNeedCandidateRecord[];
  validatedNeeds: TopicSelectionValidatedNeedRecord[];
};

/**
 * v1a Seed Overview surface — answer "what intent is this title-card
 * exploring, and what's the current state of the v1a chain?"
 *
 * Renders through the canonical `ReviewerCard` 5-section template.
 */
export function SeedOverviewCard({
  titleCard,
  searchPlans,
  evidenceMaps,
  needCandidates,
  validatedNeeds,
}: SeedOverviewCardProps) {
  if (!titleCard) {
    return (
      <article data-ui="card">
        <p data-ui="text" data-variant="caption" data-tone="muted">请选择一个题目卡。</p>
      </article>
    );
  }

  const activeSearchPlan = searchPlans[0] ?? null;
  const activeEvidenceMap = evidenceMaps[0] ?? null;
  const openNeedCandidates = needCandidates.filter(
    (item) => item.lifecycle_status !== 'closed' && item.lifecycle_status !== 'archived',
  );
  const promotedValidatedNeeds = validatedNeeds;

  const hasAnyV1aAuthority = activeSearchPlan || activeEvidenceMap || openNeedCandidates.length > 0;
  const verdictHint = (() => {
    if (titleCard.research_rejection) {
      return `研究已拒绝：${titleCard.research_rejection.rationale}`;
    }
    if (!hasAnyV1aAuthority) {
      return '该题目卡还没有文献证据与研究缺口审阅记录。';
    }
    if (promotedValidatedNeeds.length > 0) {
      return `研究缺口已确认：已有 ${promotedValidatedNeeds.length} 个经人工确认的研究需求。`;
    }
    if (openNeedCandidates.length > 0) {
      return `研究缺口选择中：${openNeedCandidates.length} 个候选需求待审阅。`;
    }
    return '文献与证据收敛中：尚未生成候选研究需求。';
  })();

  return (
    <ReviewerCard
      kind="TitleCard / TopicSeed"
      subjectId={titleCard.title_card_id}
      status={titleCard.research_rejection
        ? { label: '研究已拒绝', tone: 'warning' }
        : { label: `管理状态：${titleCard.status}`, tone: 'info' }}
      chips={[
        ...(titleCard.research_rejection ? [{ label: `管理状态：${titleCard.status}`, tone: 'neutral' as const }] : []),
        { label: `SearchPlan ${searchPlans.length}`, tone: searchPlans.length > 0 ? 'info' : 'neutral' },
        { label: `EvidenceMap ${evidenceMaps.length}`, tone: evidenceMaps.length > 0 ? 'info' : 'neutral' },
        {
          label: `NeedCandidate ${needCandidates.length}`,
          tone: needCandidates.length > 0 ? 'info' : 'neutral',
        },
        {
          label: `ValidatedNeed ${validatedNeeds.length}`,
          tone: validatedNeeds.length > 0 ? 'success' : 'neutral',
        },
      ]}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="body" data-tone="primary">{titleCard.working_title}</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">{titleCard.brief || '— 暂无简述 —'}</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">{verdictHint}</p>
        </div>
      }
      support={
        activeSearchPlan ? (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="body" data-tone="primary">
              最新 SearchPlan：{activeSearchPlan.plan_version}（status={activeSearchPlan.status}）
            </p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              must-check：{activeSearchPlan.must_check_constraints.length} · exclusion：{activeSearchPlan.exclusion_rules.length} · query intents：{activeSearchPlan.query_intents.length}
            </p>
            {activeEvidenceMap ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                最新 EvidenceMap：{activeEvidenceMap.evidence_map_version} · freshness={activeEvidenceMap.freshness_status}
              </p>
            ) : null}
          </div>
        ) : (
          <ReviewerCardEmpty label={titleCard.research_rejection ? '还没有 SearchPlan。' : '还没有 SearchPlan。进入 SearchPlan 标签创建。'} />
        )
      }
      challenge={
        evidenceMaps.length === 0 ? (
          <ReviewerCardEmpty label="还没有 EvidenceMap，无法看到反证/未解争议。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="caption" data-tone="muted">
              已构建 {evidenceMaps.length} 个 EvidenceMap。进入 EvidenceMap 标签查看 support / challenge / baseline / resource 分组。
            </p>
            {needCandidates.some((item) => item.unresolved_challenge_refs.length > 0) ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                有 NeedCandidate 存在未解 challenge_refs，需在 NeedCandidate 标签处理。
              </p>
            ) : null}
          </div>
        )
      }
      blockers={
        (() => {
          const openRechecks = needCandidates.reduce(
            (sum, item) => sum + item.open_recheck_request_refs.length,
            0,
          );
          const acceptedRiskCount = needCandidates.reduce(
            (sum, item) => sum + item.accepted_risk_refs.length,
            0,
          );
          if (openRechecks === 0 && acceptedRiskCount === 0) {
            return <ReviewerCardEmpty label="未发现 blocker / 待 recheck / accepted risk。" />;
          }
          return (
            <div data-ui="stack" data-direction="col" data-gap="1">
              {openRechecks > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  {openRechecks} 个待处理 Recheck（汇总自 NeedCandidate.open_recheck_request_refs）
                </p>
              ) : null}
              {acceptedRiskCount > 0 ? (
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  {acceptedRiskCount} 个 accepted risk 记录在 NeedCandidate 上
                </p>
              ) : null}
            </div>
          );
        })()
      }
      nextActions={
        <div data-ui="stack" data-direction="col" data-gap="1">
          {titleCard.research_rejection ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">本轮研究已停止，可查看历史证据与决定。重新研究需形成新的检查点并接受人审。</p>
          ) : !activeSearchPlan ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">→ 进入 SearchPlan 标签创建首版 plan。</p>
          ) : !activeEvidenceMap ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">→ 进入 EvidenceMap 标签从 SearchRun 构建 evidence map。</p>
          ) : openNeedCandidates.length === 0 ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">→ 进入 NeedCandidate 标签从 EvidenceMap 生成候选。</p>
          ) : promotedValidatedNeeds.length === 0 ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">→ 进入 ValidatedNeed 标签做 human-confirm。</p>
          ) : (
            <p data-ui="text" data-variant="caption" data-tone="primary">→ 研究缺口已确认，可进入研究问题收敛。</p>
          )}
        </div>
      }
      footer={`updated_at=${titleCard.updated_at}`}
    />
  );
}
