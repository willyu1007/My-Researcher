import { useCallback, useEffect, useMemo, useState } from 'react';
import { requestGovernance } from '../shared/api';
import { normalizeLiteratureMetadataPayload } from '../shared/normalizers';
import type { InlineFeedbackModel, UiOperationStatus } from '../shared/types';

export type MetadataIntakeControllerInput = {
  open: boolean;
  literatureId: string | null;
  topicId: string;
  paperId: string;
  onClose: () => void;
  loadLiteratureOverview: (targetTopicId: string, targetPaperId: string) => Promise<void>;
  pushLiteratureFeedback: (feedback: InlineFeedbackModel) => void;
};

export type MetadataIntakeControllerOutput = {
  status: UiOperationStatus;
  error: string | null;
  literatureTitle: string;
  updatedAt: string | null;
  abstractInput: string;
  keyContentDigestInput: string;
  hasChanges: boolean;
  canSave: boolean;
  handleAbstractInputChange: (value: string) => void;
  handleKeyContentDigestInputChange: (value: string) => void;
  handleReload: () => Promise<void>;
  handleSave: () => Promise<void>;
};

type MetadataBaseline = {
  abstract: string;
  keyContentDigest: string;
};

function normalizePatchText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useMetadataIntakeController(
  input: MetadataIntakeControllerInput,
): MetadataIntakeControllerOutput {
  const {
    open,
    literatureId,
    topicId,
    paperId,
    onClose,
    loadLiteratureOverview,
    pushLiteratureFeedback,
  } = input;

  const [status, setStatus] = useState<UiOperationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [literatureTitle, setLiteratureTitle] = useState<string>('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [abstractInput, setAbstractInput] = useState<string>('');
  const [keyContentDigestInput, setKeyContentDigestInput] = useState<string>('');
  const [baseline, setBaseline] = useState<MetadataBaseline | null>(null);

  const loadMetadata = useCallback(async () => {
    if (!literatureId) {
      setStatus('error');
      setError('未指定文献 ID，无法加载录入内容。');
      return;
    }

    setStatus('loading');
    setError(null);
    try {
      const payload = await requestGovernance({
        method: 'GET',
        path: `/literature/${encodeURIComponent(literatureId)}/metadata`,
      });
      const normalized = normalizeLiteratureMetadataPayload(payload);
      if (!normalized) {
        throw new Error('元数据响应格式无效。');
      }

      const nextAbstract = normalized.abstract ?? '';
      const nextKeyContentDigest = normalized.key_content_digest ?? '';
      setLiteratureTitle(normalized.title);
      setUpdatedAt(normalized.updated_at);
      setAbstractInput(nextAbstract);
      setKeyContentDigestInput(nextKeyContentDigest);
      setBaseline({
        abstract: nextAbstract,
        keyContentDigest: nextKeyContentDigest,
      });
      setStatus('ready');
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : '加载文献元数据失败。';
      setStatus('error');
      setError(message);
    }
  }, [literatureId]);

  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setError(null);
      setLiteratureTitle('');
      setUpdatedAt(null);
      setAbstractInput('');
      setKeyContentDigestInput('');
      setBaseline(null);
      return;
    }
    void loadMetadata();
  }, [loadMetadata, open]);

  const hasChanges = useMemo(() => {
    if (!baseline) {
      return false;
    }
    return baseline.abstract !== abstractInput || baseline.keyContentDigest !== keyContentDigestInput;
  }, [abstractInput, baseline, keyContentDigestInput]);

  const canSave = Boolean(literatureId)
    && hasChanges
    && status !== 'loading'
    && status !== 'saving';

  const handleReload = useCallback(async () => {
    await loadMetadata();
  }, [loadMetadata]);

  const handleSave = useCallback(async () => {
    if (!literatureId || !canSave) {
      return;
    }

    setStatus('saving');
    setError(null);

    try {
      const payload = await requestGovernance({
        method: 'PATCH',
        path: `/literature/${encodeURIComponent(literatureId)}/metadata`,
        body: {
          abstract: normalizePatchText(abstractInput),
          key_content_digest: normalizePatchText(keyContentDigestInput),
        },
      });
      const normalized = normalizeLiteratureMetadataPayload(payload);
      const normalizedTitle = normalized?.title ?? literatureTitle;
      setLiteratureTitle(normalizedTitle);
      setBaseline({
        abstract: normalizePatchText(abstractInput) ?? '',
        keyContentDigest: normalizePatchText(keyContentDigestInput) ?? '',
      });
      setStatus('ready');

      await loadLiteratureOverview(topicId, paperId);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'success',
        message: `已保存《${normalizedTitle}》录入内容。`,
      });
      onClose();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : '保存文献元数据失败。';
      setStatus('error');
      setError(message);
      pushLiteratureFeedback({
        slot: 'overview',
        level: 'error',
        message: `保存录入内容失败：${message}`,
      });
    }
  }, [
    abstractInput,
    canSave,
    keyContentDigestInput,
    literatureId,
    literatureTitle,
    loadLiteratureOverview,
    onClose,
    paperId,
    pushLiteratureFeedback,
    topicId,
  ]);

  return {
    status,
    error,
    literatureTitle,
    updatedAt,
    abstractInput,
    keyContentDigestInput,
    hasChanges,
    canSave,
    handleAbstractInputChange: setAbstractInput,
    handleKeyContentDigestInputChange: setKeyContentDigestInput,
    handleReload,
    handleSave,
  };
}
