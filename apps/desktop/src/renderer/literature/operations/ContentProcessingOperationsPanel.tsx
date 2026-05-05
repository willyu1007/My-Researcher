import { useEffect, useMemo, useState } from 'react';
import { requestGovernance } from '../shared/api';
import { asRecord, toText } from '../shared/normalizers';
import type {
  BackfillEstimate,
  BackfillJob,
  BackfillJobItem,
  CleanupDryRunResult,
  LiteratureRightsClass,
  PipelineStageCode,
} from '../shared/types';
import './ContentProcessingOperationsPanel.css';

const targetStageOptions: PipelineStageCode[] = [
  'CITATION_NORMALIZED',
  'ABSTRACT_READY',
  'FULLTEXT_PREPROCESSED',
  'KEY_CONTENT_READY',
  'CHUNKED',
  'EMBEDDED',
  'INDEXED',
];

const stageLabels: Record<PipelineStageCode, string> = {
  CITATION_NORMALIZED: '引用规范化',
  ABSTRACT_READY: '摘要就绪',
  FULLTEXT_PREPROCESSED: '全文解析',
  KEY_CONTENT_READY: '关键内容抽取',
  CHUNKED: '分块',
  EMBEDDED: '嵌入',
  INDEXED: '索引',
};

const rightsClassOptions: Array<{ value: 'all' | LiteratureRightsClass; label: string }> = [
  { value: 'all', label: '全部权限' },
  { value: 'OA', label: 'OA' },
  { value: 'USER_AUTH', label: 'USER_AUTH' },
  { value: 'UNKNOWN', label: 'UNKNOWN' },
  { value: 'RESTRICTED', label: 'RESTRICTED' },
];

type FeedbackLevel = 'info' | 'success' | 'warning' | 'error';
type FeedbackEntry = {
  id: string;
  level: FeedbackLevel;
  message: string;
};
const MAX_FEEDBACK = 3;

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function jobStatusTone(status: BackfillJob['status']): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'FAILED' || status === 'CANCELED' || status === 'CANCELING') return 'danger';
  return 'neutral';
}

function itemStatusTone(status: BackfillJobItem['status']): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'SUCCEEDED') return 'success';
  if (status === 'PARTIAL' || status === 'BLOCKED' || status === 'SKIPPED') return 'warning';
  if (status === 'FAILED' || status === 'CANCELED') return 'danger';
  return 'neutral';
}

function feedbackTone(level: FeedbackLevel): 'info' | 'success' | 'warning' | 'danger' {
  return level === 'error' ? 'danger' : level;
}

function FeedbackAlert({
  entry,
  onDismiss,
}: {
  entry: FeedbackEntry;
  onDismiss: (id: string) => void;
}) {
  const content = (
    <>
      <span>{entry.message}</span>
      <button
        data-ui="button"
        data-variant="ghost"
        data-size="sm"
        type="button"
        aria-label="关闭提示"
        onClick={() => onDismiss(entry.id)}
      >
        ×
      </button>
    </>
  );

  if (feedbackTone(entry.level) === 'danger') {
    return (
      <div key={entry.id} data-ui="alert" data-tone="danger" className="content-processing-feedback-alert">
        {content}
      </div>
    );
  }
  if (entry.level === 'success') {
    return (
      <div key={entry.id} data-ui="alert" data-tone="success" className="content-processing-feedback-alert">
        {content}
      </div>
    );
  }
  if (entry.level === 'warning') {
    return (
      <div key={entry.id} data-ui="alert" data-tone="warning" className="content-processing-feedback-alert">
        {content}
      </div>
    );
  }
  return (
    <div key={entry.id} data-ui="alert" data-tone="info" className="content-processing-feedback-alert">
      {content}
    </div>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
}) {
  if (tone === 'success') {
    return (
      <span data-ui="badge" data-variant="solid" data-tone="success" className="content-processing-status-badge">
        {children}
      </span>
    );
  }
  if (tone === 'warning') {
    return (
      <span data-ui="badge" data-variant="solid" data-tone="warning" className="content-processing-status-badge">
        {children}
      </span>
    );
  }
  if (tone === 'danger') {
    return (
      <span data-ui="badge" data-variant="solid" data-tone="danger" className="content-processing-status-badge">
        {children}
      </span>
    );
  }
  return (
    <span
      data-ui="badge"
      data-variant="solid"
      data-tone="neutral"
      className="content-processing-status-badge"
    >
      {children}
    </span>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.max(0, Math.min(100, Math.round((value / safeTotal) * 100)));
  return (
    <svg
      className="content-processing-progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      viewBox="0 0 100 4"
      preserveAspectRatio="none"
    >
      <rect width="100" height="4" rx="2" fill="var(--ui-color-border_subtle)" />
      <rect width={pct} height="4" rx="2" fill="var(--ui-color-primary)" />
    </svg>
  );
}

type StatItem = { label: string; value: number | string };

function StatList({ items }: { items: StatItem[] }) {
  return (
    <dl className="content-processing-stat-list">
      {items.map((item) => (
        <div key={item.label} data-ui="stack" data-direction="col" data-gap="1" className="content-processing-stat-item">
          <dt data-ui="text" data-variant="caption" data-tone="muted">{item.label}</dt>
          <dd data-ui="text" data-variant="body" data-tone="primary">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ContentProcessingOperationsPanel() {
  const [targetStage, setTargetStage] = useState<PipelineStageCode>('INDEXED');
  const [topicId, setTopicId] = useState('');
  const [paperId, setPaperId] = useState('');
  const [literatureIdsInput, setLiteratureIdsInput] = useState('');
  const [rightsClass, setRightsClass] = useState<'all' | LiteratureRightsClass>('all');
  const [updatedAtFromInput, setUpdatedAtFromInput] = useState('');
  const [updatedAtToInput, setUpdatedAtToInput] = useState('');
  const [includeMissing, setIncludeMissing] = useState(true);
  const [includeStale, setIncludeStale] = useState(true);
  const [includeFailed, setIncludeFailed] = useState(true);
  const [providerBudgetInput, setProviderBudgetInput] = useState('');
  const [maxParallelInput, setMaxParallelInput] = useState('1');
  const [extractionConcurrencyInput, setExtractionConcurrencyInput] = useState('1');
  const [embeddingConcurrencyInput, setEmbeddingConcurrencyInput] = useState('1');
  const [retentionDaysInput, setRetentionDaysInput] = useState('');
  const [estimate, setEstimate] = useState<BackfillEstimate | null>(null);
  const [estimateSignature, setEstimateSignature] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BackfillJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BackfillJob | null>(null);
  const [showAllItems, setShowAllItems] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupDryRunResult | null>(null);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const requestBody = useMemo(() => {
    const literatureIds = literatureIdsInput
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    const providerBudget = parsePositiveInteger(providerBudgetInput);
    const maxParallel = clampConcurrency(parsePositiveInteger(maxParallelInput) ?? 1);
    const extractionConcurrency = clampConcurrency(parsePositiveInteger(extractionConcurrencyInput) ?? 1);
    const embeddingConcurrency = clampConcurrency(parsePositiveInteger(embeddingConcurrencyInput) ?? 1);
    const updatedAtFrom = parseLocalDateTime(updatedAtFromInput);
    const updatedAtTo = parseLocalDateTime(updatedAtToInput);
    return {
      target_stage: targetStage,
      workset: {
        ...(topicId.trim() ? { topic_id: topicId.trim() } : {}),
        ...(paperId.trim() ? { paper_id: paperId.trim() } : {}),
        ...(literatureIds.length > 0 ? { literature_ids: literatureIds } : {}),
        ...(rightsClass !== 'all' ? { rights_classes: [rightsClass] } : {}),
        ...(updatedAtFrom ? { updated_at_from: updatedAtFrom } : {}),
        ...(updatedAtTo ? { updated_at_to: updatedAtTo } : {}),
        stage_filters: {
          missing: includeMissing,
          stale: includeStale,
          failed: includeFailed,
        },
      },
      options: {
        max_parallel_literature_runs: maxParallel,
        extraction_concurrency: extractionConcurrency,
        embedding_concurrency: embeddingConcurrency,
        ...(providerBudget ? { provider_call_budget: providerBudget } : {}),
      },
    };
  }, [
    embeddingConcurrencyInput,
    extractionConcurrencyInput,
    includeFailed,
    includeMissing,
    includeStale,
    literatureIdsInput,
    maxParallelInput,
    paperId,
    providerBudgetInput,
    rightsClass,
    targetStage,
    topicId,
    updatedAtFromInput,
    updatedAtToInput,
  ]);

  const requestSignature = useMemo(() => JSON.stringify(requestBody), [requestBody]);
  const dryRunFresh = estimateSignature !== null && estimateSignature === requestSignature;

  useEffect(() => {
    void loadJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushFeedback = (level: FeedbackLevel, message: string) => {
    setFeedback((current) => {
      const next: FeedbackEntry[] = [{ id: generateId(), level, message }, ...current];
      return next.slice(0, MAX_FEEDBACK);
    });
  };

  const dismissFeedback = (id: string) => {
    setFeedback((current) => current.filter((entry) => entry.id !== id));
  };

  const runDryRun = async () => {
    setLoadingAction('dry-run');
    try {
      const payload = await requestGovernance<unknown>({
        method: 'POST',
        path: '/literature/content-processing/backfill/dry-runs',
        body: requestBody,
      });
      const nextEstimate = normalizeBackfillEstimate(asRecord(payload)?.estimate);
      if (!nextEstimate) {
        throw new Error('Backfill dry-run response was not recognized.');
      }
      setEstimate(nextEstimate);
      setEstimateSignature(requestSignature);
      pushFeedback('success', '批量回填 dry-run 已完成。');
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '批量回填 dry-run 失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const createJob = async () => {
    setLoadingAction('create-job');
    try {
      const payload = await requestGovernance<unknown>({
        method: 'POST',
        path: '/literature/content-processing/backfill/jobs',
        body: requestBody,
      });
      const nextJob = normalizeBackfillJob(asRecord(payload)?.job);
      if (!nextJob) {
        throw new Error('Backfill job response was not recognized.');
      }
      setSelectedJob(nextJob);
      setEstimate(null);
      setEstimateSignature(null);
      pushFeedback('success', `批量回填任务已创建：${nextJob.job_id}`);
      await loadJobs();
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '批量回填任务创建失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const loadJobs = async () => {
    setLoadingAction((current) => current ?? 'load-jobs');
    try {
      const payload = await requestGovernance<unknown>({
        method: 'GET',
        path: '/literature/content-processing/backfill/jobs?limit=10',
      });
      const items = asRecord(payload)?.items;
      const nextJobs = Array.isArray(items)
        ? items.map((item) => normalizeBackfillJob(item)).filter((item): item is BackfillJob => item !== null)
        : [];
      setJobs(nextJobs);
      setSelectedJob((current) => {
        if (!current) {
          return nextJobs[0] ?? null;
        }
        return nextJobs.some((job) => job.job_id === current.job_id) ? current : (nextJobs[0] ?? null);
      });
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '加载批量任务失败。');
    } finally {
      setLoadingAction((current) => (current === 'load-jobs' ? null : current));
    }
  };

  const loadJobDetail = async (jobId: string) => {
    setLoadingAction('load-job-detail');
    try {
      const payload = await requestGovernance<unknown>({
        method: 'GET',
        path: `/literature/content-processing/backfill/jobs/${encodeURIComponent(jobId)}`,
      });
      const nextJob = normalizeBackfillJob(asRecord(payload)?.job);
      if (!nextJob) {
        throw new Error('Backfill job detail response was not recognized.');
      }
      setSelectedJob(nextJob);
      setShowAllItems(false);
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '加载任务详情失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const controlJob = async (jobId: string, action: 'pause' | 'resume' | 'cancel' | 'retry-failed') => {
    setLoadingAction(action);
    try {
      const payload = await requestGovernance<unknown>({
        method: 'POST',
        path: `/literature/content-processing/backfill/jobs/${encodeURIComponent(jobId)}/${action}`,
      });
      const nextJob = normalizeBackfillJob(asRecord(payload)?.job);
      if (!nextJob) {
        throw new Error('Backfill job control response was not recognized.');
      }
      setSelectedJob(nextJob);
      pushFeedback('success', '任务状态已更新。');
      await loadJobs();
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '任务控制失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const deleteJob = async (job: BackfillJob) => {
    if (!canDeleteJob(job.status)) {
      pushFeedback('warning', '请先取消运行中的任务，待任务结束后再删除。');
      return;
    }
    const confirmed = window.confirm(`确认删除任务 ${job.job_id.slice(0, 8)}… 吗？`);
    if (!confirmed) {
      return;
    }

    setLoadingAction('delete-job');
    try {
      await requestGovernance<unknown>({
        method: 'DELETE',
        path: `/literature/content-processing/backfill/jobs/${encodeURIComponent(job.job_id)}`,
      });
      setSelectedJob((current) => (current?.job_id === job.job_id ? null : current));
      pushFeedback('success', '任务已删除。');
      await loadJobs();
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '任务删除失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const runCleanupDryRun = async () => {
    setLoadingAction('cleanup-dry-run');
    try {
      const retentionDays = parsePositiveInteger(retentionDaysInput) ?? 30;
      const payload = await requestGovernance<unknown>({
        method: 'POST',
        path: '/literature/content-processing/cleanup/dry-runs',
        body: { retention_days: retentionDays },
      });
      const nextResult = normalizeCleanupResult(payload);
      if (!nextResult) {
        throw new Error('Cleanup dry-run response was not recognized.');
      }
      setCleanupResult(nextResult);
      pushFeedback('success', '清理 dry-run 已完成，未删除任何文件或索引。');
    } catch (error) {
      pushFeedback('error', error instanceof Error ? error.message : '清理 dry-run 失败。');
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = loadingAction !== null;
  const createDisabled = isBusy || !dryRunFresh;
  const createDisabledReason = !dryRunFresh ? '请先 dry-run 获取最新估算' : '处理中…';

  return (
    <section className="literature-tab-panel" aria-label="内容处理运维">
      {feedback.length > 0 ? (
        <div data-ui="stack" data-direction="col" data-gap="2">
          {feedback.map((entry) => (
            <FeedbackAlert key={entry.id} entry={entry} onDismiss={dismissFeedback} />
          ))}
        </div>
      ) : null}

      {/* —— 创建回填任务 —— */}
      <section className="literature-section-block" aria-label="创建回填任务">
        <span data-ui="text" data-variant="label" data-tone="primary">创建回填任务</span>

        <div className="content-processing-create-form">
          <div className="content-processing-create-primary-row">
            <label data-ui="field" className="content-processing-compact-field">
              <span data-ui="text" data-variant="caption" data-tone="muted">目标阶段</span>
              <select
                data-ui="select"
                data-size="sm"
                value={targetStage}
                onChange={(event) => setTargetStage(event.target.value as PipelineStageCode)}
              >
                {targetStageOptions.map((stage) => (
                  <option key={stage} value={stage}>{stageLabels[stage]}</option>
                ))}
              </select>
            </label>
            <label data-ui="field" className="content-processing-compact-field">
              <span data-ui="text" data-variant="caption" data-tone="muted">Topic ID</span>
              <input data-ui="input" data-size="sm" value={topicId} onChange={(event) => setTopicId(event.target.value)} />
            </label>
            <label data-ui="field" className="content-processing-compact-field">
              <span data-ui="text" data-variant="caption" data-tone="muted">Paper ID</span>
              <input data-ui="input" data-size="sm" value={paperId} onChange={(event) => setPaperId(event.target.value)} />
            </label>
            <label data-ui="field" className="content-processing-compact-field">
              <span data-ui="text" data-variant="caption" data-tone="muted">权限</span>
              <select
                data-ui="select"
                data-size="sm"
                value={rightsClass}
                onChange={(event) => setRightsClass(event.target.value as 'all' | LiteratureRightsClass)}
              >
                {rightsClassOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label data-ui="field" className="content-processing-compact-field content-processing-literature-field">
              <span data-ui="text" data-variant="caption" data-tone="muted">Literature IDs</span>
              <input
                data-ui="input"
                data-size="sm"
                value={literatureIdsInput}
                onChange={(event) => setLiteratureIdsInput(event.target.value)}
                placeholder="lit-001, lit-002"
              />
            </label>
          </div>

          <div className="content-processing-create-filter-row">
            <div className="content-processing-time-range" aria-label="更新时间范围">
              <span data-ui="text" data-variant="caption" data-tone="muted">更新时间</span>
              <input
                data-ui="input"
                data-size="sm"
                type="datetime-local"
                value={updatedAtFromInput}
                onChange={(event) => setUpdatedAtFromInput(event.target.value)}
                aria-label="更新起始"
              />
              <span data-ui="text" data-variant="caption" data-tone="muted">至</span>
              <input
                data-ui="input"
                data-size="sm"
                type="datetime-local"
                value={updatedAtToInput}
                onChange={(event) => setUpdatedAtToInput(event.target.value)}
                aria-label="更新结束"
              />
            </div>
            <div className="content-processing-checkbox-group" aria-label="回填状态筛选">
              <label data-ui="checkbox" className="content-processing-checkbox-label">
                <input type="checkbox" checked={includeMissing} onChange={(event) => setIncludeMissing(event.target.checked)} />
                <span>缺失</span>
              </label>
              <label data-ui="checkbox" className="content-processing-checkbox-label">
                <input type="checkbox" checked={includeStale} onChange={(event) => setIncludeStale(event.target.checked)} />
                <span>过期</span>
              </label>
              <label data-ui="checkbox" className="content-processing-checkbox-label">
                <input type="checkbox" checked={includeFailed} onChange={(event) => setIncludeFailed(event.target.checked)} />
                <span>失败</span>
              </label>
            </div>

            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              aria-expanded={showAdvancedOptions}
              onClick={() => setShowAdvancedOptions((current) => !current)}
            >
              {showAdvancedOptions ? '▾' : '▸'} 性能 / 预算（高级）
            </button>
          </div>

          {showAdvancedOptions ? (
            <div className="content-processing-advanced-grid">
              <label data-ui="field">
                <span data-ui="text" data-variant="caption" data-tone="muted">并发</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={maxParallelInput}
                  onChange={(event) => setMaxParallelInput(event.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label data-ui="field">
                <span data-ui="text" data-variant="caption" data-tone="muted">提取槽</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={extractionConcurrencyInput}
                  onChange={(event) => setExtractionConcurrencyInput(event.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label data-ui="field">
                <span data-ui="text" data-variant="caption" data-tone="muted">嵌入槽</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={embeddingConcurrencyInput}
                  onChange={(event) => setEmbeddingConcurrencyInput(event.target.value)}
                  inputMode="numeric"
                />
              </label>
              <label data-ui="field">
                <span data-ui="text" data-variant="caption" data-tone="muted">Provider 预算</span>
                <input
                  data-ui="input"
                  data-size="sm"
                  value={providerBudgetInput}
                  onChange={(event) => setProviderBudgetInput(event.target.value)}
                  inputMode="numeric"
                  placeholder="可选"
                />
              </label>
            </div>
          ) : null}
        </div>

        {/* dry-run estimate */}
        {estimate ? <BackfillEstimateView estimate={estimate} stale={!dryRunFresh} /> : null}

        {/* actions */}
        <div data-ui="toolbar" data-align="start" data-wrap="wrap">
          <button
            data-ui="button"
            data-variant="secondary"
            data-size="sm"
            className="content-processing-create-action-button"
            type="button"
            disabled={isBusy}
            onClick={() => void runDryRun()}
          >
            {loadingAction === 'dry-run' ? 'Dry-run 中…' : 'Dry-run'}
          </button>
          <button
            data-ui="button"
            data-variant="primary"
            data-size="sm"
            className="content-processing-create-action-button"
            type="button"
            disabled={createDisabled}
            title={createDisabled ? createDisabledReason : undefined}
            onClick={() => void createJob()}
          >
            {loadingAction === 'create-job' ? '创建中…' : '创建任务'}
          </button>
          {estimate && !dryRunFresh ? (
            <span data-ui="text" data-variant="caption" data-tone="danger">
              过滤条件已变化，请重新 dry-run。
            </span>
          ) : null}
        </div>
      </section>

      {/* —— 进行中的任务 —— */}
      <section className="literature-section-block" aria-label="进行中的任务">
        <div data-ui="stack" data-direction="row" data-justify="between" data-align="center" data-gap="2">
          <span data-ui="text" data-variant="label" data-tone="primary">进行中的任务</span>
          <button
            data-ui="button"
            data-variant="ghost"
            data-size="sm"
            type="button"
            disabled={isBusy}
            onClick={() => void loadJobs()}
          >
            {loadingAction === 'load-jobs' ? '刷新中…' : '刷新'}
          </button>
        </div>

        {jobs.length === 0 ? (
          <p data-ui="empty-state" data-tone="neutral">暂无批量任务</p>
        ) : (
          <table data-ui="table" data-density="compact">
            <colgroup>
              <col />
              <col />
              <col className="content-processing-progress-column" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th>Job</th>
                <th>状态</th>
                <th>进度</th>
                <th>目标</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isSelected = selectedJob?.job_id === job.job_id;
                return (
                  <tr
                    key={job.job_id}
                    onClick={() => void loadJobDetail(job.job_id)}
                    className={isSelected ? 'content-processing-job-row is-selected' : 'content-processing-job-row'}
                  >
                    <td><code data-ui="text" data-variant="caption">{job.job_id.slice(0, 8)}</code></td>
                    <td><StatusBadge tone={jobStatusTone(job.status)}>{job.status}</StatusBadge></td>
                    <td>
                      <div data-ui="stack" data-direction="col" data-gap="1">
                        <span data-ui="text" data-variant="caption" data-tone="muted">
                          {job.totals.succeeded}/{job.totals.total}
                          {job.totals.failed > 0 ? ` · 失败 ${job.totals.failed}` : ''}
                          {job.totals.blocked > 0 ? ` · 阻塞 ${job.totals.blocked}` : ''}
                        </span>
                        <ProgressBar value={job.totals.succeeded} total={job.totals.total} />
                      </div>
                    </td>
                    <td>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        {stageLabels[job.target_stage]}
                      </span>
                    </td>
                    <td>
                      <span data-ui="text" data-variant="caption" data-tone="muted">
                        {formatTime(job.updated_at)}
                      </span>
                    </td>
                    <td>
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        disabled={isBusy || !canDeleteJob(job.status)}
                        title={canDeleteJob(job.status) ? undefined : '请先取消运行中的任务'}
                        onClick={(event) => {
                          event.stopPropagation();
                          void deleteJob(job);
                        }}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {selectedJob ? (
          <div data-ui="stack" data-direction="col" data-gap="3">
            <div data-ui="stack" data-direction="row" data-justify="between" data-align="center" data-wrap="wrap" data-gap="2">
              <div data-ui="stack" data-direction="col" data-gap="1" className="content-processing-job-detail-title">
                <span data-ui="text" data-variant="label" data-tone="primary">任务详情：{selectedJob.job_id.slice(0, 8)}…</span>
                <span data-ui="text" data-variant="caption" data-tone="muted">
                  total {selectedJob.totals.total} · queued {selectedJob.totals.queued} · running {selectedJob.totals.running} · failed {selectedJob.totals.failed} · blocked {selectedJob.totals.blocked}
                </span>
              </div>
              <div data-ui="toolbar" data-align="end" data-wrap="wrap">
                <button
                  data-ui="button"
                  data-variant="secondary"
                  data-size="sm"
                  type="button"
                  disabled={isBusy || selectedJob.status !== 'RUNNING'}
                  onClick={() => void controlJob(selectedJob.job_id, 'pause')}
                >
                  {loadingAction === 'pause' ? '暂停中…' : '暂停'}
                </button>
                <button
                  data-ui="button"
                  data-variant="secondary"
                  data-size="sm"
                  type="button"
                  disabled={isBusy || selectedJob.status !== 'PAUSED'}
                  onClick={() => void controlJob(selectedJob.job_id, 'resume')}
                >
                  {loadingAction === 'resume' ? '恢复中…' : '恢复'}
                </button>
                <button
                  data-ui="button"
                  data-variant="danger"
                  data-size="sm"
                  type="button"
                  disabled={isBusy || isTerminalJob(selectedJob.status)}
                  onClick={() => void controlJob(selectedJob.job_id, 'cancel')}
                >
                  {loadingAction === 'cancel' ? '取消中…' : '取消'}
                </button>
                <button
                  data-ui="button"
                  data-variant="ghost"
                  data-size="sm"
                  type="button"
                  disabled={isBusy || selectedJob.status === 'RUNNING' || selectedJob.status === 'QUEUED'}
                  onClick={() => void controlJob(selectedJob.job_id, 'retry-failed')}
                >
                  {loadingAction === 'retry-failed' ? '重试中…' : '重试失败'}
                </button>
                <button
                  data-ui="button"
                  data-variant="danger"
                  data-size="sm"
                  type="button"
                  disabled={isBusy || !canDeleteJob(selectedJob.status)}
                  title={canDeleteJob(selectedJob.status) ? undefined : '请先取消运行中的任务'}
                  onClick={() => void deleteJob(selectedJob)}
                >
                  {loadingAction === 'delete-job' ? '删除中…' : '删除'}
                </button>
              </div>
            </div>

            {selectedJob.items?.length ? (
              <>
                <table data-ui="table" data-density="compact">
                  <thead>
                    <tr>
                      <th>文献</th>
                      <th>状态</th>
                      <th>剩余阶段</th>
                      <th>错误</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllItems ? selectedJob.items : selectedJob.items.slice(0, 12)).map((item) => (
                      <tr key={item.item_id}>
                        <td>
                          <span data-ui="text" data-variant="caption" data-tone="primary">
                            {item.title ?? item.literature_id}
                          </span>
                        </td>
                        <td><StatusBadge tone={itemStatusTone(item.status)}>{item.status}</StatusBadge></td>
                        <td>
                          <span data-ui="text" data-variant="caption" data-tone="muted">
                            {item.requested_stages.slice(item.next_stage_index).map((s) => stageLabels[s] ?? s).join(' · ') || '--'}
                          </span>
                        </td>
                        <td>
                          <span data-ui="text" data-variant="caption" data-tone={item.error_code ? 'danger' : 'muted'}>
                            {item.error_code ?? '--'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedJob.items.length > 12 ? (
                  <button
                    data-ui="button"
                    data-variant="ghost"
                    data-size="sm"
                    type="button"
                    onClick={() => setShowAllItems((current) => !current)}
                  >
                    {showAllItems ? '收起' : `显示全部（${selectedJob.items.length}）`}
                  </button>
                ) : null}
              </>
            ) : (
              <p data-ui="text" data-variant="caption" data-tone="muted">该任务暂无 item 详情。</p>
            )}
          </div>
        ) : null}
      </section>

      {/* —— 清理与维护 —— */}
      <section className="literature-section-block" aria-label="清理与维护">
        <span data-ui="text" data-variant="label" data-tone="primary">清理与维护</span>
        <div data-ui="stack" data-direction="row" data-gap="2" data-align="end">
	          <label data-ui="field" aria-label="保留天数">
	            <input
	              data-ui="input"
	              data-size="sm"
	              value={retentionDaysInput}
	              onChange={(event) => setRetentionDaysInput(event.target.value)}
	              inputMode="numeric"
	              placeholder="保留天数"
	            />
	          </label>
          <button
            data-ui="button"
            data-variant="secondary"
            data-size="sm"
            type="button"
            disabled={isBusy}
            onClick={() => void runCleanupDryRun()}
          >
            {loadingAction === 'cleanup-dry-run' ? '清理 dry-run 中…' : '清理 dry-run'}
          </button>
        </div>
        {cleanupResult ? (
          <StatList
            items={[
              { label: '候选', value: cleanupResult.candidate_count },
              { label: 'active 保护', value: cleanupResult.protected_active_version_count },
              { label: 'raw 文件保护', value: cleanupResult.protected_raw_asset_count },
              { label: '估计移除 chunk', value: cleanupResult.estimated_chunks_to_remove },
              { label: '估计移除 token 索引', value: cleanupResult.estimated_token_indexes_to_remove },
              { label: '保留天数', value: cleanupResult.retention_days },
            ]}
          />
        ) : null}
      </section>
    </section>
  );
}

function BackfillEstimateView({ estimate, stale }: { estimate: BackfillEstimate; stale: boolean }) {
  return (
    <div data-ui="stack" data-direction="col" data-gap="2" aria-label="dry-run 结果">
      <div data-ui="stack" data-direction="row" data-justify="between" data-align="center" data-wrap="wrap" data-gap="2">
        <span data-ui="text" data-variant="caption" data-tone="secondary">Dry-run 估算</span>
        {stale ? <StatusBadge tone="warning">已过期</StatusBadge> : <StatusBadge tone="success">最新</StatusBadge>}
      </div>
      <StatList
        items={[
          { label: '将创建 item', value: estimate.planned_item_count },
          { label: '已选 / 总计', value: `${estimate.selected_count} / ${estimate.total_literatures}` },
          { label: '阻塞', value: estimate.blocked_count },
          { label: '跳过（已就绪）', value: estimate.skipped_ready_count },
          { label: '预估 extraction 调用', value: estimate.estimated_provider_calls.extraction_calls },
          { label: '预估 embedding 调用', value: estimate.estimated_provider_calls.embedding_calls },
          { label: '预估存储 (bytes)', value: estimate.estimated_storage_bytes },
        ]}
      />
      {estimate.blockers.length > 0 ? (
        <p data-ui="text" data-variant="caption" data-tone="danger">
          阻塞样例：
          {estimate.blockers.slice(0, 3).map((item) => `${item.title || item.literature_id}（${item.reason_code}）`).join('；')}
          {estimate.blockers.length > 3 ? ` …还有 ${estimate.blockers.length - 3} 条` : ''}
        </p>
      ) : null}
    </div>
  );
}

function normalizeBackfillEstimate(value: unknown): BackfillEstimate | null {
  const root = asRecord(value);
  const providerCalls = asRecord(root?.estimated_provider_calls);
  const stageCounts = asRecord(root?.stage_counts);
  if (!root || !providerCalls || !stageCounts) {
    return null;
  }
  return {
    dry_run_id: toText(root.dry_run_id) ?? '',
    generated_at: toText(root.generated_at) ?? '',
    target_stage: readStageCode(root.target_stage),
    workset: asRecord(root.workset) as BackfillEstimate['workset'] ?? {},
    options: normalizeBackfillOptions(root.options),
    total_literatures: readNumber(root.total_literatures),
    selected_count: readNumber(root.selected_count),
    planned_item_count: readNumber(root.planned_item_count),
    skipped_ready_count: readNumber(root.skipped_ready_count),
    blocked_count: readNumber(root.blocked_count),
    stage_counts: Object.fromEntries(targetStageOptions.map((stage) => [stage, readNumber(stageCounts[stage])])) as Record<PipelineStageCode, number>,
    rights_class_counts: Array.isArray(root.rights_class_counts)
      ? root.rights_class_counts.map((item) => {
          const row = asRecord(item);
          return {
            rights_class: readRightsClass(row?.rights_class),
            count: readNumber(row?.count),
          };
        })
      : [],
    estimated_provider_calls: {
      extraction_calls: readNumber(providerCalls.extraction_calls),
      embedding_calls: readNumber(providerCalls.embedding_calls),
    },
    estimated_storage_bytes: readNumber(root.estimated_storage_bytes),
    blockers: Array.isArray(root.blockers)
      ? root.blockers.map((item) => {
          const row = asRecord(item);
          return {
            literature_id: toText(row?.literature_id) ?? '',
            title: toText(row?.title) ?? '',
            reason_code: toText(row?.reason_code) ?? '',
            reason_message: toText(row?.reason_message) ?? '',
            retryable: typeof row?.retryable === 'boolean' ? row.retryable : false,
          };
        })
      : [],
  };
}

function normalizeBackfillJob(value: unknown): BackfillJob | null {
  const root = asRecord(value);
  const totals = asRecord(root?.totals);
  if (!root || !totals) {
    return null;
  }
  const estimate = normalizeBackfillEstimate(root.dry_run_estimate);
  return {
    job_id: toText(root.job_id) ?? '',
    status: readJobStatus(root.status),
    target_stage: readStageCode(root.target_stage),
    workset: asRecord(root.workset) as BackfillJob['workset'] ?? {},
    options: normalizeBackfillOptions(root.options),
    dry_run_estimate: estimate,
    totals: {
      total: readNumber(totals.total),
      queued: readNumber(totals.queued),
      running: readNumber(totals.running),
      succeeded: readNumber(totals.succeeded),
      partial: readNumber(totals.partial),
      blocked: readNumber(totals.blocked),
      failed: readNumber(totals.failed),
      skipped: readNumber(totals.skipped),
      canceled: readNumber(totals.canceled),
    },
    error_code: toText(root.error_code) ?? null,
    error_message: toText(root.error_message) ?? null,
    created_at: toText(root.created_at) ?? '',
    started_at: toText(root.started_at) ?? null,
    paused_at: toText(root.paused_at) ?? null,
    canceled_at: toText(root.canceled_at) ?? null,
    finished_at: toText(root.finished_at) ?? null,
    updated_at: toText(root.updated_at) ?? '',
    items: Array.isArray(root.items)
      ? root.items.map((item) => {
          const row = asRecord(item);
          return {
            item_id: toText(row?.item_id) ?? '',
            job_id: toText(row?.job_id) ?? '',
            literature_id: toText(row?.literature_id) ?? '',
            title: toText(row?.title) ?? null,
            status: readItemStatus(row?.status),
            requested_stages: Array.isArray(row?.requested_stages)
              ? row.requested_stages.map((stage) => readStageCode(stage))
              : [],
            next_stage_index: readNumber(row?.next_stage_index),
            content_processing_run_id: toText(row?.content_processing_run_id) ?? null,
            attempt_count: readNumber(row?.attempt_count),
            error_code: toText(row?.error_code) ?? null,
            error_message: toText(row?.error_message) ?? null,
            blocker_code: toText(row?.blocker_code) ?? null,
            retryable: typeof row?.retryable === 'boolean' ? row.retryable : false,
            updated_at: toText(row?.updated_at) ?? '',
          };
        })
      : undefined,
  };
}

function normalizeBackfillOptions(value: unknown): BackfillJob['options'] {
  const root = asRecord(value);
  return {
    max_parallel_literature_runs: readNumber(root?.max_parallel_literature_runs) || 1,
    extraction_concurrency: readNumber(root?.extraction_concurrency) || 1,
    embedding_concurrency: readNumber(root?.embedding_concurrency) || 1,
    provider_call_budget: typeof root?.provider_call_budget === 'number' ? root.provider_call_budget : null,
  };
}

function normalizeCleanupResult(value: unknown): CleanupDryRunResult | null {
  const root = asRecord(value);
  if (!root) {
    return null;
  }
  return {
    generated_at: toText(root.generated_at) ?? '',
    retention_days: readNumber(root.retention_days),
    candidate_count: readNumber(root.candidate_count),
    protected_active_version_count: readNumber(root.protected_active_version_count),
    protected_raw_asset_count: readNumber(root.protected_raw_asset_count),
    estimated_chunks_to_remove: readNumber(root.estimated_chunks_to_remove),
    estimated_token_indexes_to_remove: readNumber(root.estimated_token_indexes_to_remove),
  };
}

function readStageCode(value: unknown): PipelineStageCode {
  return targetStageOptions.includes(value as PipelineStageCode) ? value as PipelineStageCode : 'INDEXED';
}

function readRightsClass(value: unknown): LiteratureRightsClass {
  return value === 'OA' || value === 'USER_AUTH' || value === 'RESTRICTED' || value === 'UNKNOWN'
    ? value
    : 'UNKNOWN';
}

function readJobStatus(value: unknown): BackfillJob['status'] {
  return value === 'PLANNED'
    || value === 'QUEUED'
    || value === 'RUNNING'
    || value === 'PAUSED'
    || value === 'CANCELING'
    || value === 'CANCELED'
    || value === 'SUCCEEDED'
    || value === 'PARTIAL'
    || value === 'FAILED'
    ? value
    : 'FAILED';
}

function readItemStatus(value: unknown): BackfillJobItem['status'] {
  return value === 'QUEUED'
    || value === 'RUNNING'
    || value === 'SUCCEEDED'
    || value === 'PARTIAL'
    || value === 'BLOCKED'
    || value === 'FAILED'
    || value === 'SKIPPED'
    || value === 'CANCELED'
    ? value
    : 'FAILED';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampConcurrency(value: number): number {
  return Math.max(1, Math.min(4, value));
}

function parseLocalDateTime(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isTerminalJob(status: BackfillJob['status']): boolean {
  return status === 'SUCCEEDED' || status === 'PARTIAL' || status === 'FAILED' || status === 'CANCELED';
}

function canDeleteJob(status: BackfillJob['status']): boolean {
  return status !== 'RUNNING' && status !== 'QUEUED' && status !== 'CANCELING';
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}
