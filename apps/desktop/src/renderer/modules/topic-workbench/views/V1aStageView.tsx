import { useMemo, useState } from 'react';
import type {
  TitleCardPrimaryTabKey,
} from '../../../literature/shared/types';
import type {
  TopicSelectionNeedAdjudicationDecision,
  TopicSelectionNeedCandidateRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type { TitleCardWorkbenchSummary } from '../types';
import { useV1aStageData } from '../hooks/useV1aStageData';
import { SeedOverviewCard } from '../cards/SeedOverviewCard';
import { SearchPlanCard } from '../cards/SearchPlanCard';
import { EvidenceMapCard } from '../cards/EvidenceMapCard';
import { NeedCandidateReviewCard } from '../cards/NeedCandidateReviewCard';
import { ValidatedNeedDecisionCard } from '../cards/ValidatedNeedDecisionCard';
import { AdjudicationConfirmForm } from '../cards/AdjudicationConfirmForm';
import { AcceptedRiskCard, type AcceptedRiskTargetOption } from '../cards/AcceptedRiskCard';

type V1aStageViewProps = {
  titleCard: TitleCardWorkbenchSummary | null;
  titleCardId: string | null;
  subTab: string | null;
  refreshToken: number;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};

const SUB_TABS = ['seed', 'search-plan', 'evidence-map', 'need-candidate', 'validated-need', 'accepted-risk'] as const;

/**
 * v1a stage view — composes 5 reviewer surfaces.
 *
 * Fetches v1a authority/workflow data once for the active title-card via
 * `useV1aStageData`, then routes to the right reviewer card based on
 * `subTab`. Interactive surfaces: NeedCandidate adjudication (6-section
 * confirm form), ValidatedNeed → V1bInputBundle publish, SearchPlan recheck,
 * and EvidenceMap stale. SeedOverview is read-only.
 */
export function V1aStageView({
  titleCard,
  titleCardId,
  subTab,
  refreshToken,
  onSelectSecondaryTab,
}: V1aStageViewProps) {
  const { data, loading, error, reload } = useV1aStageData(titleCardId, refreshToken);
  const activeSubTab = (SUB_TABS as readonly string[]).includes(subTab ?? '')
    ? (subTab as (typeof SUB_TABS)[number])
    : 'seed';
  const [adjudicating, setAdjudicating] = useState<TopicSelectionNeedCandidateRecord | null>(null);
  const [initialDecision, setInitialDecision] = useState<TopicSelectionNeedAdjudicationDecision | undefined>(undefined);

  // Target objects an AcceptedRisk can reference, built from the v1a objects the
  // stage already loaded (no extra fetch). Recomputed only when the stage data
  // changes. Newest-first within each kind.
  const acceptedRiskTargets: AcceptedRiskTargetOption[] = useMemo(() => [
    ...data.needCandidates.map((record) => ({
      ref_type: 'need_candidate',
      ref_id: record.need_candidate_id,
      label: `NeedCandidate · ${record.unmet_need_statement.slice(0, 48)}`,
    })),
    ...data.validatedNeeds.map((record) => ({
      ref_type: 'validated_need',
      ref_id: record.validated_need_id,
      label: `ValidatedNeed · ${record.validated_need_statement.slice(0, 48)}`,
    })),
    ...data.evidenceMaps.map((record) => ({
      ref_type: 'evidence_map',
      ref_id: record.evidence_map_id,
      label: `EvidenceMap · ${record.evidence_map_id.slice(0, 16)}`,
    })),
    ...data.searchPlans.map((record) => ({
      ref_type: 'search_plan',
      ref_id: record.search_plan_id,
      version_id: record.plan_version,
      label: `SearchPlan · ${record.search_plan_id.slice(0, 16)} · v${record.plan_version}`,
    })),
  ], [data]);

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">v1a 证据-需求</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            请先在侧边栏选择一个题目卡。v1a 决策链以题目卡为根对象。
          </p>
        </div>
      </article>
    );
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
        <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
          <span data-ui="badge" data-variant="solid" data-tone="info">v1a 证据-需求</span>
          {loading ? (
            <span data-ui="text" data-variant="caption" data-tone="muted">加载中…</span>
          ) : null}
          {error ? (
            <span data-ui="text" data-variant="caption" data-tone="danger">{error}</span>
          ) : null}
        </div>
        <button
          type="button"
          data-ui="button"
          data-variant="secondary"
          data-size="sm"
          onClick={() => void reload()}
          disabled={loading}
        >
          刷新 v1a 数据
        </button>
      </div>

      {activeSubTab === 'seed' ? (
        <SeedOverviewCard
          titleCard={titleCard}
          searchPlans={data.searchPlans}
          evidenceMaps={data.evidenceMaps}
          needCandidates={data.needCandidates}
          validatedNeeds={data.validatedNeeds}
        />
      ) : null}
      {activeSubTab === 'search-plan' ? (
        <SearchPlanCard
          searchPlans={data.searchPlans}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'evidence-map' ? (
        <EvidenceMapCard
          evidenceMaps={data.evidenceMaps}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'need-candidate' ? (
        <NeedCandidateReviewCard
          needCandidates={data.needCandidates}
          onAdjudicate={(candidate, decision) => {
            setAdjudicating(candidate);
            setInitialDecision(decision);
          }}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'validated-need' ? (
        <ValidatedNeedDecisionCard
          validatedNeeds={data.validatedNeeds}
          needCandidates={data.needCandidates}
          onPublished={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'accepted-risk' ? (
        <AcceptedRiskCard
          titleCardId={titleCardId}
          targetOptions={acceptedRiskTargets}
          refreshToken={refreshToken}
          onMutated={() => void reload()}
        />
      ) : null}

      {adjudicating ? (
        <AdjudicationConfirmForm
          candidate={adjudicating}
          initialDecision={initialDecision}
          onClose={() => {
            setAdjudicating(null);
            setInitialDecision(undefined);
          }}
          onSubmitted={() => {
            setAdjudicating(null);
            setInitialDecision(undefined);
            void reload();
          }}
        />
      ) : null}

      <article data-ui="card" data-padding="sm">
        <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap" data-align="center">
          <span data-ui="text" data-variant="caption" data-tone="muted">快速跳转：</span>
          {SUB_TABS.map((key) => (
            <button
              key={key}
              type="button"
              data-ui="button"
              data-variant={activeSubTab === key ? 'primary' : 'ghost'}
              data-size="sm"
              onClick={() => onSelectSecondaryTab('v1a', key)}
            >
              {key}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
