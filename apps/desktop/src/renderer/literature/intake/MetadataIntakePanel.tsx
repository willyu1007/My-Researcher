import { useEffect, type FormEvent } from 'react';
import { formatTimestamp } from '../shared/formatters';
import type { MetadataIntakeControllerOutput } from './useMetadataIntakeController';

type MetadataIntakePanelProps = {
  open: boolean;
  literatureId: string | null;
  onClose: () => void;
  controller: MetadataIntakeControllerOutput;
};

export function MetadataIntakePanel({
  open,
  literatureId,
  onClose,
  controller,
}: MetadataIntakePanelProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const title = controller.literatureTitle || literatureId || '未命名文献';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.handleSave();
  };

  return (
    <div className="metadata-intake-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="metadata-intake-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="metadata-intake-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="metadata-intake-header">
          <div className="metadata-intake-title-wrap">
            <h3 id="metadata-intake-title">录入内容</h3>
            <p data-ui="text" data-variant="caption" data-tone="muted" title={title}>
              {title}
            </p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              最近更新：{controller.updatedAt ? formatTimestamp(controller.updatedAt) : '--'}
            </p>
          </div>
          <button
            type="button"
            className="metadata-intake-close"
            aria-label="关闭录入面板"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="metadata-intake-body" onSubmit={handleSubmit}>
          {controller.status === 'loading' ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">正在加载文献录入内容...</p>
          ) : null}
          {controller.status === 'error' ? (
            <p data-ui="text" data-variant="caption" data-tone="danger">
              {controller.error ?? '录入内容加载失败。'}
            </p>
          ) : null}

          <label data-ui="field" className="metadata-intake-field">
            <span data-ui="text" data-variant="label" data-tone="secondary">摘要（Abstract）</span>
            <textarea
              data-ui="textarea"
              rows={8}
              value={controller.abstractInput}
              onChange={(event) => controller.handleAbstractInputChange(event.target.value)}
              placeholder="可手动录入摘要，留空将保存为空。"
              disabled={controller.status === 'loading' || controller.status === 'saving'}
            />
          </label>

          <label data-ui="field" className="metadata-intake-field">
            <span data-ui="text" data-variant="label" data-tone="secondary">重点内容摘要（Key Content Digest）</span>
            <textarea
              data-ui="textarea"
              rows={10}
              value={controller.keyContentDigestInput}
              onChange={(event) => controller.handleKeyContentDigestInputChange(event.target.value)}
              placeholder="可手动录入重点内容，支持多行。"
              disabled={controller.status === 'loading' || controller.status === 'saving'}
            />
          </label>

          <footer className="metadata-intake-footer">
            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              onClick={() => void controller.handleReload()}
              disabled={controller.status === 'loading' || controller.status === 'saving' || !literatureId}
            >
              重新加载
            </button>
            <button
              data-ui="button"
              data-variant="ghost"
              data-size="sm"
              type="button"
              onClick={onClose}
              disabled={controller.status === 'saving'}
            >
              取消
            </button>
            <button
              data-ui="button"
              data-variant="primary"
              data-size="sm"
              type="submit"
              disabled={!controller.canSave}
            >
              {controller.status === 'saving' ? '保存中...' : controller.hasChanges ? '保存并关闭' : '已保存'}
            </button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
