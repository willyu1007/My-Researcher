import { Fragment } from 'react';
import type { ManualDraftRow } from '../manual-import-types';
import type { ManualImportTabProps } from './types';

export function ManualImportTab(props: ManualImportTabProps) {
  if (!props.active) {
    return null;
  }

  const {
    controller,
    navigation,
    shared,
    upload,
    zotero,
  } = props;
  const {
    formatManualUploadFileStatusLabel,
    getManualFieldErrorText,
    isManualUploadLlmSupported,
    manualUploadFormatHint,
    mapManualValidationErrors,
    updateHelpTooltipAlignment,
  } = shared;
  const {
    handleCopyManualCellValue,
    handleImportFromZotero,
    handleLoadZoteroToReview,
    handleManualDraftFieldChange,
    handleManualUpload,
    handleManualUploadDrop,
    handleManualUploadFileLlmAction,
    handleRemoveManualRow,
    handleRemoveManualUploadFile,
    handleSubmitManualReviewedRows,
    handleTestZoteroConnection,
    handleToggleManualRowInclude,
    handleToggleManualRowPanel,
    hasManualSession,
    manualRowStats,
    manualValidationByRowId,
    manualVisibleRows,
  } = controller;
  const {
    activeSubTab: manualImportSubTab,
    manualDropActive,
    manualOpenRowId,
    manualOpenRowPanel,
    manualShowErrorOnly,
    manualShowImportableOnly,
    setManualDropActive,
    setManualShowErrorOnly,
    setManualShowImportableOnly,
  } = navigation;
  const {
    manualUploadError,
    manualUploadFiles,
    manualUploadLoading,
    manualUploadStatus,
  } = upload;
  const {
    setZoteroApiKey,
    setZoteroLibraryId,
    setZoteroLibraryType,
    zoteroAction,
    zoteroApiKey,
    zoteroError,
    zoteroLibraryId,
    zoteroLibraryType,
    zoteroLinkResult,
    zoteroLoading,
    zoteroStatus,
  } = zotero;

  return (
                  <section className="literature-tab-panel manual-import-panel">
                    <section className="manual-import-top-pane">
                      {manualImportSubTab === 'file-review' ? (
                        <section
                          className="literature-section-block manual-upload-card"
                          data-upload-status={manualUploadStatus}
                        >
                          <div className="manual-upload-workbench">
                            <label
                              className={`manual-upload-dropzone${manualDropActive ? ' is-drag-active' : ''}${manualUploadLoading ? ' is-loading' : ''}`}
                              onDragOver={(event) => event.preventDefault()}
                              onDragEnter={(event) => {
                                event.preventDefault();
                                setManualDropActive(true);
                              }}
                              onDragLeave={(event) => {
                                event.preventDefault();
                                setManualDropActive(false);
                              }}
                              onDrop={(event) => void handleManualUploadDrop(event)}
                            >
                              <input
                                className="manual-upload-input"
                                type="file"
                                multiple
                                accept=".json,.csv,.bib,.bibtex,.txt,.pdf,.tex,.ltx,.bbl,.aux,.ris"
                                onChange={(event) => void handleManualUpload(event)}
                              />
                              <span className="manual-upload-dropzone-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                  <path d="M4.5 7.2h15a1.8 1.8 0 0 1 1.8 1.8v6a2.3 2.3 0 0 1-2.3 2.3H4.9A2.3 2.3 0 0 1 2.6 15V9a1.8 1.8 0 0 1 1.9-1.8Z" />
                                  <path d="m3.3 8.2 8.7 6 8.7-6" />
                                </svg>
                              </span>
                              {manualUploadLoading ? (
                                <span className="manual-upload-dropzone-title">文件解析中...</span>
                              ) : null}
                              <span className="manual-upload-dropzone-action">选择或拖拽文件</span>
                            </label>

                            <section className="manual-upload-files-pane" aria-label="已接收上传文件">
                              <div className="manual-upload-files-pane-scroll">
                                <table className="manual-upload-files-table">
                                  <thead>
                                    <tr>
                                      <th>文件名称</th>
                                      <th>
                                        <span className="manual-upload-format-heading">
                                          格式
                                          <span
                                            className="manual-upload-format-help"
                                            data-help={manualUploadFormatHint}
                                            aria-label="查看支持文件格式"
                                            tabIndex={0}
                                            onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                            onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
                                          >
                                            ?
                                          </span>
                                        </span>
                                      </th>
                                      <th>收集状态</th>
                                      <th>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {manualUploadFiles.length === 0 ? (
                                      <tr>
                                        <td colSpan={4}>暂无上传文件。</td>
                                      </tr>
                                    ) : (
                                      manualUploadFiles.map((fileItem) => {
                                        const canRunLlmActions = isManualUploadLlmSupported(fileItem.fileName)
                                          && fileItem.status !== 'duplicate'
                                          && fileItem.status !== 'processing';
                                        return (
                                          <tr key={fileItem.id}>
                                            <td title={fileItem.fileName}>{fileItem.fileName}</td>
                                            <td>{fileItem.format}</td>
                                            <td>
                                              <span
                                                className={`manual-upload-file-status is-${fileItem.status}`}
                                              >
                                                {formatManualUploadFileStatusLabel(fileItem)}
                                              </span>
                                            </td>
                                            <td>
                                              <div className="manual-upload-file-actions">
                                                {canRunLlmActions ? (
                                                  <>
                                                    <button
                                                      className="manual-upload-file-action"
                                                      type="button"
                                                      onClick={() => void handleManualUploadFileLlmAction(fileItem.id, 'parse')}
                                                    >
                                                      解析
                                                    </button>
                                                    <button
                                                      className="manual-upload-file-action"
                                                      type="button"
                                                      onClick={() => void handleManualUploadFileLlmAction(fileItem.id, 'abstract')}
                                                    >
                                                      提取摘要
                                                    </button>
                                                  </>
                                                ) : null}
                                                <button
                                                  className="manual-upload-file-action is-danger"
                                                  type="button"
                                                  onClick={() => handleRemoveManualUploadFile(fileItem.id)}
                                                  disabled={fileItem.status === 'processing'}
                                                >
                                                  移除
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </section>
                          </div>
                          {manualUploadError ? (
                            <p data-ui="text" data-variant="caption" data-tone="danger">
                              {manualUploadError}
                            </p>
                          ) : null}
                        </section>
                      ) : (
                        <section className="literature-section-block manual-zotero-card">
                          <div className="zotero-workbench">
                            <div className="zotero-config-pane">
                              <div className="zotero-config-card">
                                <p className="zotero-result-title">连接配置</p>
                                <label data-ui="field">
                                  <span data-slot="label">文库类型</span>
                                  <select
                                    data-ui="select"
                                    data-size="sm"
                                    value={zoteroLibraryType}
                                    onChange={(event) => setZoteroLibraryType(event.target.value as 'users' | 'groups')}
                                  >
                                    <option value="users">users</option>
                                    <option value="groups">groups</option>
                                  </select>
                                </label>
                                <label data-ui="field">
                                  <span data-slot="label">Library ID</span>
                                  <input
                                    data-ui="input"
                                    data-size="sm"
                                    value={zoteroLibraryId}
                                    onChange={(event) => setZoteroLibraryId(event.target.value)}
                                    placeholder="例如 123456"
                                  />
                                </label>
                                <label data-ui="field">
                                  <span data-slot="label">API Key（可选）</span>
                                  <input
                                    data-ui="input"
                                    data-size="sm"
                                    type="password"
                                    value={zoteroApiKey}
                                    onChange={(event) => setZoteroApiKey(event.target.value)}
                                    placeholder="公开库可留空"
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="zotero-result-pane" data-zotero-status={zoteroStatus}>
                              <div className="zotero-result-header">
                                <p className="zotero-result-title">链接测试结果</p>
                                <button
                                  data-ui="button"
                                  data-variant="secondary"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => void handleTestZoteroConnection()}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'test-link' ? '测试中...' : '测试链接'}
                                </button>
                              </div>

                              <div className="zotero-result-grid">
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">是否连接成功</span>
                                  <span className={`zotero-result-value ${zoteroLinkResult.tested ? (zoteroLinkResult.connected ? 'is-success' : 'is-error') : ''}`.trim()}>
                                    {zoteroLinkResult.tested ? (zoteroLinkResult.connected ? '成功' : '失败') : '未测试'}
                                  </span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">文献总数</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.totalCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">重复文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.duplicateCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">未解析文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.unparsedCount : '--'}</span>
                                </div>
                                <div className="zotero-result-row">
                                  <span className="zotero-result-label">可导入文献</span>
                                  <span className="zotero-result-value">{zoteroLinkResult.tested ? zoteroLinkResult.importableCount : '--'}</span>
                                </div>
                              </div>

                              {zoteroError ? <p data-ui="text" data-variant="caption" data-tone="danger">{zoteroError}</p> : null}

                              <div className="zotero-result-actions">
                                <button
                                  data-ui="button"
                                  data-variant="secondary"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => void handleLoadZoteroToReview()}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'load-to-list' ? '拉取中...' : '拉取到列表'}
                                </button>
                                <button
                                  data-ui="button"
                                  data-variant="primary"
                                  data-size="sm"
                                  type="button"
                                  onClick={handleImportFromZotero}
                                  disabled={zoteroLoading}
                                >
                                  {zoteroLoading && zoteroAction === 'sync-import' ? '同步中...' : '一键同步导入'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}
                    </section>

                    <section className="literature-section-block manual-import-bottom-pane">
                      <div className="manual-import-actions-scroll">
                        <div className="manual-import-actions-row">
                          <div className="manual-actions-group">
                            <label className="manual-check-toggle">
                              <input
                                type="checkbox"
                                checked={manualShowImportableOnly}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setManualShowImportableOnly(checked);
                                  if (checked) {
                                    setManualShowErrorOnly(false);
                                  }
                                }}
                                disabled={!hasManualSession}
                              />
                              可导入行
                            </label>
                            <label className="manual-check-toggle">
                              <input
                                type="checkbox"
                                checked={manualShowErrorOnly}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setManualShowErrorOnly(checked);
                                  if (checked) {
                                    setManualShowImportableOnly(false);
                                  }
                                }}
                                disabled={!hasManualSession}
                              />
                              错误行
                            </label>
                          </div>

                          <div className="manual-actions-group manual-actions-group-status">
                            <span className="manual-status-plain">
                              可导入 {manualRowStats.selectedValidCount}
                            </span>
                            <span className="manual-status-plain manual-status-error">
                              错误 {manualRowStats.invalidCount}
                            </span>
                            {manualRowStats.selectedInvalidCount > 0 ? (
                              <span className="manual-status-plain manual-status-skip" title="提交时将自动跳过未通过校验行。">
                                跳过 {manualRowStats.selectedInvalidCount}
                              </span>
                            ) : null}
                          </div>

                          <button
                            className="manual-import-submit-button"
                            data-ui="button"
                            data-variant="primary"
                            data-size="sm"
                            type="button"
                            onClick={() => void handleSubmitManualReviewedRows()}
                            disabled={!hasManualSession || manualUploadLoading || manualRowStats.selectedValidCount === 0}
                          >
                            {manualUploadLoading ? '导入中...' : '导入'}
                          </button>
                        </div>
                      </div>

                      <div className="manual-import-table-shell">
                        <table className="manual-import-table">
                          <colgroup>
                            <col className="manual-col-select" />
                            <col className="manual-col-title" />
                            <col className="manual-col-authors" />
                            <col className="manual-col-year" />
                            <col className="manual-col-doi" />
                            <col className="manual-col-arxiv" />
                            <col className="manual-col-source" />
                            <col className="manual-col-tags" />
                            <col className="manual-col-actions" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th aria-label="导入选择" />
                              <th>标题</th>
                              <th>作者</th>
                              <th>年份</th>
                              <th>DOI</th>
                              <th>arXiv ID</th>
                              <th>来源链接</th>
                              <th>标签</th>
                              <th>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {manualVisibleRows.length === 0 ? (
                              <tr>
                                <td colSpan={9}>
                                  {manualShowImportableOnly && !manualShowErrorOnly
                                    ? '暂无可导入行。'
                                    : manualShowErrorOnly && !manualShowImportableOnly
                                      ? '暂无错误行。'
                                      : '当前没有待审阅行。'}
                                </td>
                              </tr>
                            ) : (
                            manualVisibleRows.map((row: ManualDraftRow) => {
                                const validation = manualValidationByRowId.get(row.id);
                                const isRowValid = Boolean(validation?.is_valid);
                                const isRowOpened = manualOpenRowId === row.id;
                                const isSummaryOpened = isRowOpened && manualOpenRowPanel === 'summary';
                                const isExpandOpened = isRowOpened && manualOpenRowPanel === 'expand';
                                const fieldErrors = mapManualValidationErrors(validation);
                                const titleError = getManualFieldErrorText(fieldErrors, 'title');
                                const authorsError = getManualFieldErrorText(fieldErrors, 'authors_text');
                                const yearError = getManualFieldErrorText(fieldErrors, 'year_text');
                                const doiError = getManualFieldErrorText(fieldErrors, 'doi');
                                const arxivError = getManualFieldErrorText(fieldErrors, 'arxiv_id');
                                const sourceUrlError = getManualFieldErrorText(fieldErrors, 'source_url');
                                return (
                                  <Fragment key={row.id}>
                                    <tr className={isRowOpened ? 'is-row-opened' : ''}>
                                      <td className="manual-select-cell">
                                        <input
                                          type="checkbox"
                                          checked={isRowValid ? row.include : false}
                                          disabled={!isRowValid}
                                          onChange={(event) =>
                                            handleToggleManualRowInclude(row.id, event.target.checked)
                                          }
                                        />
                                      </td>
                                      <td
                                        className={`manual-cell${titleError ? ' has-error' : ''}`}
                                        data-error-text={titleError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.title}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'title', event.target.value)
                                            }
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.title}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'title', event.target.value)
                                            }
                                          />
                                        )}
                                        {!titleError && row.title.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.title)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${authorsError ? ' has-error' : ''}`}
                                        data-error-text={authorsError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.authors_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'authors_text', event.target.value)
                                            }
                                            placeholder="Alice, Bob"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.authors_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'authors_text', event.target.value)
                                            }
                                            placeholder="Alice, Bob"
                                          />
                                        )}
                                        {!authorsError && row.authors_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.authors_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell manual-cell-year${yearError ? ' has-error' : ''}`}
                                        data-error-text={yearError || undefined}
                                      >
                                        <input
                                          className="manual-field-input"
                                          data-ui="input"
                                          data-size="sm"
                                          value={row.year_text}
                                          onChange={(event) =>
                                            handleManualDraftFieldChange(row.id, 'year_text', event.target.value)
                                          }
                                          placeholder="2024"
                                        />
                                        {!yearError && row.year_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.year_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${doiError ? ' has-error' : ''}`}
                                        data-error-text={doiError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.doi}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'doi', event.target.value)
                                            }
                                            placeholder="10.1000/xyz"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.doi}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'doi', event.target.value)
                                            }
                                            placeholder="10.1000/xyz"
                                          />
                                        )}
                                        {!doiError && row.doi.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.doi)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${arxivError ? ' has-error' : ''}`}
                                        data-error-text={arxivError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.arxiv_id}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'arxiv_id', event.target.value)
                                            }
                                            placeholder="2401.00001"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.arxiv_id}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'arxiv_id', event.target.value)
                                            }
                                            placeholder="2401.00001"
                                          />
                                        )}
                                        {!arxivError && row.arxiv_id.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.arxiv_id)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td
                                        className={`manual-cell${sourceUrlError ? ' has-error' : ''}`}
                                        data-error-text={sourceUrlError || undefined}
                                      >
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.source_url}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'source_url', event.target.value)
                                            }
                                            placeholder="https://..."
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.source_url}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'source_url', event.target.value)
                                            }
                                            placeholder="https://..."
                                          />
                                        )}
                                        {!sourceUrlError && row.source_url.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.source_url)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td className="manual-cell">
                                        {isExpandOpened ? (
                                          <textarea
                                            className="manual-field-textarea"
                                            value={row.tags_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'tags_text', event.target.value)
                                            }
                                            placeholder="survey, baseline"
                                          />
                                        ) : (
                                          <input
                                            className="manual-field-input"
                                            data-ui="input"
                                            data-size="sm"
                                            value={row.tags_text}
                                            onChange={(event) =>
                                              handleManualDraftFieldChange(row.id, 'tags_text', event.target.value)
                                            }
                                            placeholder="survey, baseline"
                                          />
                                        )}
                                        {row.tags_text.trim() ? (
                                          <button
                                            className="manual-copy-action"
                                            type="button"
                                            onClick={() => void handleCopyManualCellValue(row.tags_text)}
                                          >
                                            复制
                                          </button>
                                        ) : null}
                                      </td>
                                      <td className="manual-ops-cell">
                                        <div className="manual-ops-actions">
                                          <button
                                            className="manual-row-action"
                                            type="button"
                                            onClick={() => handleToggleManualRowPanel(row.id, 'expand')}
                                          >
                                            {isExpandOpened ? '收起' : '展开'}
                                          </button>
                                          <button
                                            className="manual-row-action"
                                            type="button"
                                            onClick={() => handleToggleManualRowPanel(row.id, 'summary')}
                                          >
                                            {isSummaryOpened ? '收起摘要' : '摘要'}
                                          </button>
                                          <button
                                            className="manual-row-action is-danger"
                                            type="button"
                                            onClick={() => handleRemoveManualRow(row.id)}
                                          >
                                            删除
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {isSummaryOpened ? (
                                      <tr className="manual-abstract-row">
                                        <td colSpan={9}>
                                          <div className="manual-abstract-editor">
                                            <div className="manual-abstract-header">
                                              <span>摘要</span>
                                              {row.abstract.trim() ? (
                                                <button
                                                  className="manual-copy-action is-visible"
                                                  type="button"
                                                  onClick={() => void handleCopyManualCellValue(row.abstract)}
                                                >
                                                  复制
                                                </button>
                                              ) : null}
                                            </div>
                                            <textarea
                                              className="manual-abstract-textarea"
                                              value={row.abstract}
                                              placeholder="可在此补充或修改摘要..."
                                              onChange={(event) =>
                                                handleManualDraftFieldChange(row.id, 'abstract', event.target.value)
                                              }
                                            />
                                          </div>
                                        </td>
                                      </tr>
                                    ) : null}
                                  </Fragment>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </section>
  );
}
