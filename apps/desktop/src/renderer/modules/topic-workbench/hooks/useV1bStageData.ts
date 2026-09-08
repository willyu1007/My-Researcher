import { useCallback, useEffect, useState } from 'react';
import type {
  TopicSelectionResearchSliceOptionSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-research-slice-contracts';
import type {
  TopicSelectionTopicQuestionCandidateSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionTopicValueAssessmentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';
import type {
  TopicSelectionTopicPackageRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import {
  listResearchSliceOptionSetsByTitleCard,
  listTopicPackagesByTitleCard,
  listTopicQuestionCandidateSetsByTitleCard,
  listTopicValueAssessmentsByTitleCard,
} from '../api/v1b';

export type V1bStageData = {
  sliceOptionSets: TopicSelectionResearchSliceOptionSetRecord[];
  questionCandidateSets: TopicSelectionTopicQuestionCandidateSetRecord[];
  valueAssessments: TopicSelectionTopicValueAssessmentRecord[];
  topicPackages: TopicSelectionTopicPackageRecord[];
};

export type UseV1bStageDataResult = {
  data: V1bStageData;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const EMPTY: V1bStageData = {
  sliceOptionSets: [],
  questionCandidateSets: [],
  valueAssessments: [],
  topicPackages: [],
};

/**
 * T-087 Phase 3.1 — fetch v1b authority/workflow records for a title-card in
 * parallel. Same partial-failure policy as `useV1aStageData`: keep successful
 * slices and surface the first error.
 */
export function useV1bStageData(
  titleCardId: string | null,
  refreshToken: number,
): UseV1bStageDataResult {
  const [data, setData] = useState<V1bStageData>(EMPTY);
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
      listResearchSliceOptionSetsByTitleCard(titleCardId),
      listTopicQuestionCandidateSetsByTitleCard(titleCardId),
      listTopicValueAssessmentsByTitleCard(titleCardId),
      listTopicPackagesByTitleCard(titleCardId),
    ]);
    const [sliceOptionSets, questionCandidateSets, valueAssessments, topicPackages] = settled;
    const firstError = settled.find((entry) => entry.status === 'rejected');
    setData({
      sliceOptionSets: sliceOptionSets.status === 'fulfilled' ? sliceOptionSets.value : [],
      questionCandidateSets: questionCandidateSets.status === 'fulfilled' ? questionCandidateSets.value : [],
      valueAssessments: valueAssessments.status === 'fulfilled' ? valueAssessments.value : [],
      topicPackages: topicPackages.status === 'fulfilled' ? topicPackages.value : [],
    });
    if (firstError && firstError.status === 'rejected') {
      const reason = firstError.reason;
      setError(reason instanceof Error ? reason.message : '加载研究问题与价值数据失败。');
    }
    setLoading(false);
  }, [titleCardId]);

  useEffect(() => {
    void reload();
  }, [reload, refreshToken]);

  return { data, loading, error, reload };
}
