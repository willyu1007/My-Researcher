import type { TitleCardPrimaryTabKey } from '../../../literature/shared/types';
import { useV1cStageData } from '../hooks/useV1cStageData';
import { PromotionGateCheckCard } from '../cards/PromotionGateCheckCard';
import { HumanPromotionDecisionCard } from '../cards/HumanPromotionDecisionCard';
import { PromotionCommitmentProfileCard } from '../cards/PromotionCommitmentProfileCard';
import { PaperProjectBridgeCard } from '../cards/PaperProjectBridgeCard';
import { DownstreamFeedbackCard } from '../cards/DownstreamFeedbackCard';

type V1cStageViewProps = {
  titleCardId: string | null;
  subTab: string | null;
  refreshToken: number;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};

const SUB_TABS = ['gate-check', 'decision', 'commitment', 'bridge', 'downstream'] as const;

/**
 * v1c stage view — composes 5 reviewer surfaces (Phase 4).
 *
 * Read-only surfaces: GateCheck, CommitmentProfile (derived from
 * PromotionDecision bundle), DownstreamFeedback.
 * Interactive surfaces: HumanPromotionDecision (10-decision form),
 * PaperProjectBridge (create + intake).
 *
 * Mutations bubble up via `onMutated → reload()` so every form refresh
 * keeps the active stage data fresh after a write.
 */
export function V1cStageView({
  titleCardId,
  subTab,
  refreshToken,
  onSelectSecondaryTab,
}: V1cStageViewProps) {
  const { data, loading, error, reload } = useV1cStageData(titleCardId, refreshToken);
  const activeSubTab = (SUB_TABS as readonly string[]).includes(subTab ?? '')
    ? (subTab as (typeof SUB_TABS)[number])
    : 'gate-check';

  if (!titleCardId) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">晋升审阅</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            请先在侧边栏选择一个题目卡。方案通过研究价值评估并发布后，即可审阅晋升条件与后续承诺。
          </p>
        </div>
      </article>
    );
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <div data-ui="toolbar" data-align="between" data-wrap="wrap">
        <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
          <span data-ui="badge" data-variant="solid" data-tone="info">晋升审阅</span>
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
          刷新晋升审阅
        </button>
      </div>

      {activeSubTab === 'gate-check' ? (
        <PromotionGateCheckCard gateChecks={data.gateChecks} />
      ) : null}
      {activeSubTab === 'decision' ? (
        <HumanPromotionDecisionCard
          gateChecks={data.gateChecks}
          promotionDecisions={data.promotionDecisions}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'commitment' ? (
        <PromotionCommitmentProfileCard promotionDecisions={data.promotionDecisions} />
      ) : null}
      {activeSubTab === 'bridge' ? (
        <PaperProjectBridgeCard
          bridges={data.paperProjectBridges}
          promotionDecisions={data.promotionDecisions}
          onMutated={() => void reload()}
        />
      ) : null}
      {activeSubTab === 'downstream' ? (
        <DownstreamFeedbackCard bridges={data.paperProjectBridges} />
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
              onClick={() => onSelectSecondaryTab('v1c', key)}
            >
              {key}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
