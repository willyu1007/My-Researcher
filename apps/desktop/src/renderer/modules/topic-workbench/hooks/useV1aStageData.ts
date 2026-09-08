import { useCallback, useEffect, useState } from 'react';
import type {
  TopicSelectionEvidenceMapRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionNeedCandidateRecord,
  TopicSelectionValidatedNeedRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionSearchPlanRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  listEvidenceMapsByTitleCard,
  listNeedCandidatesByTitleCard,
  listSearchPlansByTitleCard,
  listValidatedNeedsByTitleCard,
} from '../api/v1a';

export type V1aStageData = {
  searchPlans: TopicSelectionSearchPlanRecord[];
  evidenceMaps: TopicSelectionEvidenceMapRecord[];
  needCandidates: TopicSelectionNeedCandidateRecord[];
  validatedNeeds: TopicSelectionValidatedNeedRecord[];
};

export type UseV1aStageDataResult = {
  data: V1aStageData;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const EMPTY: V1aStageData = {
  searchPlans: [],
  evidenceMaps: [],
  needCandidates: [],
  validatedNeeds: [],
};

/**
 * T-087 Phase 2 — fetch v1a authority/workflow records for a title-card in
 * parallel. Skips fetch entirely when `titleCardId` is null (no active card).
 *
 * Partial-failure policy: if any individual endpoint rejects, the hook keeps
 * any successful slice and surfaces the first error message; reviewer cards
 * are expected to render empty states for missing slices so degraded fetches
 * don't break the whole stage view.
 */
export function useV1aStageData(
  titleCardId: string | null,
  refreshToken: number,
): UseV1aStageDataResult {
  const [data, setData] = useState<V1aStageData>(EMPTY);
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
      listSearchPlansByTitleCard(titleCardId),
      listEvidenceMapsByTitleCard(titleCardId),
      listNeedCandidatesByTitleCard(titleCardId),
      listValidatedNeedsByTitleCard(titleCardId),
    ]);
    const [searchPlans, evidenceMaps, needCandidates, validatedNeeds] = settled;
    const firstError = settled.find((entry) => entry.status === 'rejected');
    setData({
      searchPlans: searchPlans.status === 'fulfilled' ? searchPlans.value : [],
      evidenceMaps: evidenceMaps.status === 'fulfilled' ? evidenceMaps.value : [],
      needCandidates: needCandidates.status === 'fulfilled' ? needCandidates.value : [],
      validatedNeeds: validatedNeeds.status === 'fulfilled' ? validatedNeeds.value : [],
    });
    if (firstError && firstError.status === 'rejected') {
      const reason = firstError.reason;
      setError(reason instanceof Error ? reason.message : '加载文献与证据收敛数据失败。');
    }
    setLoading(false);
  }, [titleCardId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  return { data, loading, error, reload };
}
