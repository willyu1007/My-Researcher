import { useCallback, useEffect, useState } from 'react';
import type {
  TopicSelectionPromotionGateCheckRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type {
  TopicSelectionPromotionDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-human-promotion-decision-contracts';
import type {
  TopicSelectionPaperProjectBridgeRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-paper-project-bridge-contracts';
import {
  listPaperProjectBridgesByTitleCard,
  listPromotionDecisionsByTitleCard,
  listPromotionGateChecksByTitleCard,
} from '../api/v1c';

export type V1cStageData = {
  gateChecks: TopicSelectionPromotionGateCheckRecord[];
  promotionDecisions: TopicSelectionPromotionDecisionRecord[];
  paperProjectBridges: TopicSelectionPaperProjectBridgeRecord[];
};

export type UseV1cStageDataResult = {
  data: V1cStageData;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const EMPTY: V1cStageData = {
  gateChecks: [],
  promotionDecisions: [],
  paperProjectBridges: [],
};

/**
 * T-087 Phase 4 — fetch v1c authority/workflow records for a title-card in
 * parallel. Same partial-failure policy as the v1a/v1b hooks: keep
 * successful slices and surface the first error.
 */
export function useV1cStageData(
  titleCardId: string | null,
  refreshToken: number,
): UseV1cStageDataResult {
  const [data, setData] = useState<V1cStageData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!titleCardId) {
      setData(EMPTY);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const settled = await Promise.allSettled([
      listPromotionGateChecksByTitleCard(titleCardId),
      listPromotionDecisionsByTitleCard(titleCardId),
      listPaperProjectBridgesByTitleCard(titleCardId),
    ]);
    const [gateChecks, promotionDecisions, paperProjectBridges] = settled;
    const firstError = settled.find((entry) => entry.status === 'rejected');
    setData({
      gateChecks: gateChecks.status === 'fulfilled' ? gateChecks.value : [],
      promotionDecisions: promotionDecisions.status === 'fulfilled' ? promotionDecisions.value : [],
      paperProjectBridges: paperProjectBridges.status === 'fulfilled' ? paperProjectBridges.value : [],
    });
    if (firstError && firstError.status === 'rejected') {
      const reason = firstError.reason;
      setError(reason instanceof Error ? reason.message : '加载晋升审阅数据失败。');
    }
    setLoading(false);
  }, [titleCardId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  return { data, loading, error, reload };
}
