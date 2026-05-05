import { useEffect, useState } from 'react';
import { formatTimestamp } from '../shared/formatters';
import type { MetadataIntakeControllerOutput } from './useMetadataIntakeController';
import type { MetadataIntakeTabKey, PipelineStageCode } from '../shared/types';

type MetadataIntakePanelProps = {
  open: boolean;
  literatureId: string | null;
  initialTab: MetadataIntakeTabKey;
  sourceUrl: string | null;
  doi: string | null;
  arxivId: string | null;
  onRunOverviewContentAction: (
    literatureId: string,
    stages: PipelineStageCode[],
    actionLabel: string,
  ) => Promise<void>;
  onClose: () => void;
  controller: MetadataIntakeControllerOutput;
};

export function MetadataIntakePanel({
  open,
  literatureId,
  initialTab,
  sourceUrl,
  doi,
  arxivId,
  onRunOverviewContentAction,
  onClose,
  controller,
}: MetadataIntakePanelProps) {
  const [activeTab, setActiveTab] = useState<MetadataIntakeTabKey>(initialTab);

  useEffect(() => {
    if (!open) {
      return;
    }
    setActiveTab(initialTab);
  }, [initialTab, open]);

  if (!open) {
    return null;
  }

  const title = controller.literatureTitle || literatureId || '未命名文献';
  const keyContentText = controller.keyContentDigestInput.trim();
  const abstractText = controller.abstractInput.trim();
  const vectorizePreview = keyContentText.length > 0
    ? keyContentText
    : abstractText;
  const isSaving = controller.status === 'saving';
  const canInlineSave = activeTab === 'abstract'
    ? controller.hasAbstractChanges
    : activeTab === 'key-content'
      ? controller.hasKeyContentChanges
      : false;
  const canInlineRevert = canInlineSave;
  const handleInlineRevert = () => {
    if (activeTab === 'abstract') {
      controller.handleRevertAbstractInput();
      return;
    }
    if (activeTab === 'key-content') {
      controller.handleRevertKeyContentDigestInput();
    }
  };

  const autoProcessConfig: {
    actionLabel: string;
    requestedStages: PipelineStageCode[];
  } = activeTab === 'abstract'
    ? {
        actionLabel: '提取摘要',
        requestedStages: ['ABSTRACT_READY'],
      }
    : activeTab === 'key-content'
      ? {
          actionLabel: '处理内容',
          requestedStages: ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY'],
        }
      : {
          actionLabel: '处理到可检索',
          requestedStages: ['CHUNKED', 'EMBEDDED', 'INDEXED'],
        };

  const handleAutoProcess = () => {
    if (!literatureId || isSaving) {
      return;
    }
    void onRunOverviewContentAction(
      literatureId,
      autoProcessConfig.requestedStages,
      autoProcessConfig.actionLabel,
    );
  };

  const handleCancel = () => {
    if (isSaving) {
      return;
    }
    if (controller.hasChanges) {
      const confirmed = window.confirm('当前有未保存修改，确认取消并退出吗？');
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  const handleConfirm = () => {
    if (isSaving) {
      return;
    }
    if (controller.canSave) {
      void controller.handleSave();
      return;
    }
    onClose();
  };

  const sourceLinkLabel = sourceUrl ? '原文地址' : '原文地址：--';
  const identifierText = [doi ? `DOI: ${doi}` : null, arxivId ? `arXiv: ${arxivId}` : null]
    .filter((value): value is string => value !== null)
    .join('  |  ');

  return (
    <div className="metadata-intake-backdrop" role="presentation">
      <aside
        className="metadata-intake-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-intake-title"
      >
        <header className="metadata-intake-header">
          <div className="metadata-intake-title-wrap">
            <h3 id="metadata-intake-title" title={title}>{title}</h3>
            <div className="metadata-intake-meta-row">
              <span data-ui="text" data-variant="caption" data-tone="muted">
                最近更新：{controller.updatedAt ? formatTimestamp(controller.updatedAt) : '--'}
              </span>
              {sourceUrl ? (
                <a
                  className="metadata-intake-source-link"
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {sourceLinkLabel}
                </a>
              ) : (
                <span data-ui="text" data-variant="caption" data-tone="muted">{sourceLinkLabel}</span>
              )}
            </div>
            {identifierText ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">{identifierText}</p>
            ) : null}
          </div>
        </header>

        <div className="metadata-intake-body">
          <div className="metadata-intake-tabs-bar">
            <nav className="metadata-intake-tabs" role="tablist" aria-label="录入内容标签页">
              <button
                id="metadata-intake-tab-abstract"
                type="button"
                role="tab"
                aria-selected={activeTab === 'abstract'}
                aria-controls="metadata-intake-panel-abstract"
                className={`metadata-intake-tab${activeTab === 'abstract' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('abstract')}
              >
                内容摘要
              </button>
              <button
                id="metadata-intake-tab-key-content"
                type="button"
                role="tab"
                aria-selected={activeTab === 'key-content'}
                aria-controls="metadata-intake-panel-key-content"
                className={`metadata-intake-tab${activeTab === 'key-content' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('key-content')}
              >
                重点内容
              </button>
              <button
                id="metadata-intake-tab-vectorize"
                type="button"
                role="tab"
                aria-selected={activeTab === 'vectorize'}
                aria-controls="metadata-intake-panel-vectorize"
                className={`metadata-intake-tab${activeTab === 'vectorize' ? ' is-active' : ''}`}
                onClick={() => setActiveTab('vectorize')}
              >
                向量化
              </button>
            </nav>
            <div className="metadata-intake-tab-actions">
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                className="metadata-intake-auto-action"
                onClick={handleAutoProcess}
                disabled={!literatureId || isSaving}
              >
                自动处理
              </button>
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                className="metadata-intake-inline-revert"
                onClick={handleInlineRevert}
                disabled={isSaving || !canInlineRevert}
              >
                撤销
              </button>
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                className="metadata-intake-inline-save"
                onClick={() => void controller.handleSaveInPlace()}
                disabled={isSaving || !canInlineSave}
              >
                {isSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          {controller.status === 'loading' ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">正在加载文献录入内容...</p>
          ) : null}
          {controller.status === 'error' ? (
            <p data-ui="text" data-variant="caption" data-tone="danger">
              {controller.error ?? '录入内容加载失败。'}
            </p>
          ) : null}

          {activeTab === 'abstract' ? (
            <section
              id="metadata-intake-panel-abstract"
              className="metadata-intake-tab-panel"
              role="tabpanel"
              aria-labelledby="metadata-intake-tab-abstract"
            >
              <textarea
                data-ui="textarea"
                rows={6}
                value={controller.abstractInput}
                onChange={(event) => controller.handleAbstractInputChange(event.target.value)}
                placeholder="可手动录入摘要，留空将保存为空。"
                disabled={controller.status === 'loading' || controller.status === 'saving'}
              />
            </section>
          ) : null}

          {activeTab === 'key-content' ? (
            <section
              id="metadata-intake-panel-key-content"
              className="metadata-intake-tab-panel"
              role="tabpanel"
              aria-labelledby="metadata-intake-tab-key-content"
            >
              <textarea
                data-ui="textarea"
                rows={6}
                value={controller.keyContentDigestInput}
                onChange={(event) => controller.handleKeyContentDigestInputChange(event.target.value)}
                placeholder="可手动录入重点内容，支持多行。"
                disabled={controller.status === 'loading' || controller.status === 'saving'}
              />
            </section>
          ) : null}

          {activeTab === 'vectorize' ? (
            <section
              id="metadata-intake-panel-vectorize"
              className="metadata-intake-tab-panel"
              role="tabpanel"
              aria-labelledby="metadata-intake-tab-vectorize"
            >
              <textarea
                data-ui="textarea"
                rows={6}
                value={vectorizePreview}
                readOnly
                placeholder="暂无可用于向量化的内容。"
              />
            </section>
          ) : null}

          <footer className="metadata-intake-footer">
            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
            >
              取消
            </button>
            <button
              data-ui="button"
              data-variant="primary"
              data-size="sm"
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
            >
              {isSaving ? '处理中...' : '确定'}
            </button>
          </footer>
        </div>
      </aside>
    </div>
  );
}
