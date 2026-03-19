import { useCallback, useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  emptyArtifactBundle,
  emptyMetric,
} from '../literature/shared/constants';
import {
  normalizeArtifactPayload,
  normalizeMetricPayload,
  normalizeReleasePayload,
  normalizeTimelinePayload,
} from '../literature/shared/normalizers';
import { requestGovernance } from '../literature/shared/api';
import type {
  ArtifactBundle,
  PanelState,
  ReviewDecision,
  RuntimeMetric,
  TimelineEvent,
} from '../literature/shared/types';

export type ReviewSubmitState = 'idle' | 'submitting' | 'success' | 'error';

export type GovernancePanelControllerInput = {
  governanceEnabled: boolean;
  paperId: string;
  refreshTick: number;
  setActionHint: Dispatch<SetStateAction<string>>;
  setRefreshTick: Dispatch<SetStateAction<number>>;
};

export type GovernancePanelControllerOutput = {
  timelinePanel: PanelState<TimelineEvent[]>;
  metricsPanel: PanelState<RuntimeMetric>;
  artifactPanel: PanelState<ArtifactBundle>;
  reviewersInput: string;
  setReviewersInput: Dispatch<SetStateAction<string>>;
  decision: ReviewDecision;
  setDecision: Dispatch<SetStateAction<ReviewDecision>>;
  riskFlagsInput: string;
  setRiskFlagsInput: Dispatch<SetStateAction<string>>;
  labelPolicy: string;
  setLabelPolicy: Dispatch<SetStateAction<string>>;
  reviewComment: string;
  setReviewComment: Dispatch<SetStateAction<string>>;
  reviewSubmitState: ReviewSubmitState;
  setReviewSubmitState: Dispatch<SetStateAction<ReviewSubmitState>>;
  reviewSubmitMessage: string;
  setReviewSubmitMessage: Dispatch<SetStateAction<string>>;
  handleSubmitReleaseReview: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function useGovernancePanelController(
  input: GovernancePanelControllerInput,
): GovernancePanelControllerOutput {
  const {
    governanceEnabled,
    paperId,
    refreshTick,
    setActionHint,
    setRefreshTick,
  } = input;
  const [timelinePanel, setTimelinePanel] = useState<PanelState<TimelineEvent[]>>({
    status: 'idle',
    data: [],
    error: null,
  });
  const [metricsPanel, setMetricsPanel] = useState<PanelState<RuntimeMetric>>({
    status: 'idle',
    data: emptyMetric,
    error: null,
  });
  const [artifactPanel, setArtifactPanel] = useState<PanelState<ArtifactBundle>>({
    status: 'idle',
    data: emptyArtifactBundle,
    error: null,
  });
  const [reviewersInput, setReviewersInput] = useState<string>('reviewer-1');
  const [decision, setDecision] = useState<ReviewDecision>('hold');
  const [riskFlagsInput, setRiskFlagsInput] = useState<string>('policy-check');
  const [labelPolicy, setLabelPolicy] = useState<string>('ai-generated-required');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitState, setReviewSubmitState] = useState<ReviewSubmitState>('idle');
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState<string>('');

  const loadGovernancePanels = useCallback(async (targetPaperId: string) => {
    const normalizedPaperId = targetPaperId.trim();

    if (!normalizedPaperId) {
      setTimelinePanel({ status: 'error', data: [], error: 'Paper ID 不能为空。' });
      setMetricsPanel({ status: 'error', data: emptyMetric, error: 'Paper ID 不能为空。' });
      setArtifactPanel({ status: 'error', data: emptyArtifactBundle, error: 'Paper ID 不能为空。' });
      return;
    }

    const encodedId = encodeURIComponent(normalizedPaperId);

    setTimelinePanel({ status: 'loading', data: [], error: null });
    setMetricsPanel({ status: 'loading', data: emptyMetric, error: null });
    setArtifactPanel({ status: 'loading', data: emptyArtifactBundle, error: null });

    const [timelineResult, metricsResult, artifactResult] = await Promise.allSettled([
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/timeline` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/resource-metrics` }),
      requestGovernance({ method: 'GET', path: `/paper-projects/${encodedId}/artifact-bundle` }),
    ]);

    if (timelineResult.status === 'fulfilled') {
      const normalized = normalizeTimelinePayload(timelineResult.value);
      setTimelinePanel({
        status: normalized.length > 0 ? 'ready' : 'empty',
        data: normalized,
        error: null,
      });
    } else {
      setTimelinePanel({
        status: 'error',
        data: [],
        error: timelineResult.reason instanceof Error ? timelineResult.reason.message : String(timelineResult.reason),
      });
    }

    if (metricsResult.status === 'fulfilled') {
      const normalized = normalizeMetricPayload(metricsResult.value);
      if (normalized) {
        setMetricsPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setMetricsPanel({ status: 'empty', data: emptyMetric, error: null });
      }
    } else {
      setMetricsPanel({
        status: 'error',
        data: emptyMetric,
        error: metricsResult.reason instanceof Error ? metricsResult.reason.message : String(metricsResult.reason),
      });
    }

    if (artifactResult.status === 'fulfilled') {
      const normalized = normalizeArtifactPayload(artifactResult.value);
      if (normalized) {
        setArtifactPanel({ status: 'ready', data: normalized, error: null });
      } else {
        setArtifactPanel({ status: 'empty', data: emptyArtifactBundle, error: null });
      }
    } else {
      setArtifactPanel({
        status: 'error',
        data: emptyArtifactBundle,
        error: artifactResult.reason instanceof Error ? artifactResult.reason.message : String(artifactResult.reason),
      });
    }
  }, []);

  useEffect(() => {
    if (!governanceEnabled) {
      setTimelinePanel({ status: 'idle', data: [], error: null });
      setMetricsPanel({ status: 'idle', data: emptyMetric, error: null });
      setArtifactPanel({ status: 'idle', data: emptyArtifactBundle, error: null });
      return;
    }

    void loadGovernancePanels(paperId);
  }, [governanceEnabled, loadGovernancePanels, paperId, refreshTick]);

  const handleSubmitReleaseReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPaperId = paperId.trim();
    if (!normalizedPaperId) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('Paper ID 不能为空。');
      return;
    }

    const reviewers = reviewersInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    if (reviewers.length === 0) {
      setReviewSubmitState('error');
      setReviewSubmitMessage('至少提供一个 reviewer。');
      return;
    }

    const riskFlags = riskFlagsInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    setReviewSubmitState('submitting');
    setReviewSubmitMessage('正在提交 release review...');

    try {
      const response = await requestGovernance({
        method: 'POST',
        path: `/paper-projects/${encodeURIComponent(normalizedPaperId)}/release-gate/review`,
        body: {
          reviewers,
          decision,
          risk_flags: riskFlags,
          label_policy: labelPolicy,
          comment: reviewComment.trim() || undefined,
        },
      });

      const normalized = normalizeReleasePayload(response);
      if (!normalized) {
        throw new Error('release-review response invalid.');
      }

      setReviewSubmitState('success');
      setReviewSubmitMessage(
        `已提交 ${normalized.gate_result.review_id}（audit: ${normalized.gate_result.audit_ref}）。`,
      );
      setActionHint(
        `release-review ${normalized.gate_result.review_id} 提交完成，decision=${decision}。`,
      );
      setRefreshTick((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'release-review 提交失败。';
      setReviewSubmitState('error');
      setReviewSubmitMessage(message);
      setActionHint(`release-review 提交失败：${message}`);
    }
  };

  return {
    timelinePanel,
    metricsPanel,
    artifactPanel,
    reviewersInput,
    setReviewersInput,
    decision,
    setDecision,
    riskFlagsInput,
    setRiskFlagsInput,
    labelPolicy,
    setLabelPolicy,
    reviewComment,
    setReviewComment,
    reviewSubmitState,
    setReviewSubmitState,
    reviewSubmitMessage,
    setReviewSubmitMessage,
    handleSubmitReleaseReview,
  };
}
