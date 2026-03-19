import { Fragment, type ReactNode } from 'react';
import type { AutoPullRule } from '../../shared/types';
import type {
  AutoImportControllerOutput,
  AutoImportSharedProps,
  AutoImportTopicFormProps,
} from '../types';

type AutoImportTopicSettingsViewProps = {
  visible: boolean;
  controller: AutoImportControllerOutput;
  topicForm: AutoImportTopicFormProps;
  shared: Pick<
    AutoImportSharedProps,
    'autoPullRunStatusLabels' | 'formatTimestamp' | 'resolveRunSortTimestamp' | 'topicYearMaxBound' | 'topicYearMinBound'
  >;
  isTopicRulePreviewOpen: boolean;
  setIsTopicRulePreviewOpen: (updater: (current: boolean) => boolean) => void;
  activeTopicListRulePreviewTopicId: string | null;
  setActiveTopicListRulePreviewTopicId: (updater: (current: string | null) => string | null) => void;
  selectedTopicRuleId: string;
  selectedTopicRule: AutoPullRule | null;
  renderRulePreviewPanel: (rule: AutoPullRule) => ReactNode;
};

export function AutoImportTopicSettingsView({
  activeTopicListRulePreviewTopicId,
  controller,
  isTopicRulePreviewOpen,
  renderRulePreviewPanel,
  selectedTopicRule,
  selectedTopicRuleId,
  setActiveTopicListRulePreviewTopicId,
  setIsTopicRulePreviewOpen,
  shared,
  topicForm,
  visible,
}: AutoImportTopicSettingsViewProps) {
  if (!visible) {
    return null;
  }

  return (
    <section className="literature-section-block">
      <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
        <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={controller.handleOpenCreateTopicProfile}>
          新增主题
        </button>
      </div>
      {topicForm.topicProfilesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicForm.topicProfilesError}</p> : null}
      <div className="topic-settings-table-wrap">
        {topicForm.topicProfiles.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">暂无主题设置。</p>
        ) : (
          <table className="topic-settings-table">
            <thead>
              <tr>
                <th className="topic-col-name">名称</th>
                <th className="topic-col-range">检索范围</th>
                <th className="topic-col-filter">筛选</th>
                <th className="topic-col-run">运行记录</th>
                <th className="topic-col-rule">生效规则</th>
                <th className="topic-col-actions">选项</th>
              </tr>
            </thead>
            <tbody>
              {topicForm.topicProfiles.map((profile) => {
                const yearStart = profile.default_min_year ?? shared.topicYearMinBound;
                const yearEnd = profile.default_max_year ?? shared.topicYearMaxBound;
                const venuePreview = profile.venue_filters.length === 0
                  ? '不限会议与期刊'
                  : `${profile.venue_filters.slice(0, 3).join('、')}${profile.venue_filters.length > 3 ? '...' : ''}`;
                const venueFull = profile.venue_filters.length === 0
                  ? '不限会议与期刊'
                  : profile.venue_filters.join('、');
                const rangeTooltip = `发布年份：${yearStart} - ${yearEnd}\n期刊范围：${venueFull}`;
                const includePreview = profile.include_keywords.length === 0
                  ? '--'
                  : `${profile.include_keywords.slice(0, 3).join('、')}${profile.include_keywords.length > 3 ? '...' : ''}`;
                const includeFull = profile.include_keywords.length === 0 ? '--' : profile.include_keywords.join('、');
                const excludePreview = profile.exclude_keywords.length === 0
                  ? '--'
                  : `${profile.exclude_keywords.slice(0, 3).join('、')}${profile.exclude_keywords.length > 3 ? '...' : ''}`;
                const excludeFull = profile.exclude_keywords.length === 0 ? '--' : profile.exclude_keywords.join('、');
                const filterTooltip = `包含：${includeFull}\n排除：${excludeFull}`;
                const effectiveRuleId = profile.rule_ids[0] ?? null;
                const effectiveRule = effectiveRuleId ? controller.autoPullRuleById.get(effectiveRuleId) ?? null : null;
                const latestRun = effectiveRuleId ? (controller.latestRunByRuleId.get(effectiveRuleId) ?? null) : null;
                const hasActiveEffectiveRule = effectiveRule?.status === 'ACTIVE';
                const isRulePreviewOpen =
                  hasActiveEffectiveRule && activeTopicListRulePreviewTopicId === profile.topic_id;

                return (
                  <Fragment key={profile.topic_id}>
                    <tr>
                      <td className="topic-col-name">
                        <div className="topic-settings-name">
                          <button
                            type="button"
                            className="topic-settings-name-trigger"
                            onClick={() => controller.handleEditTopicProfile(profile)}
                          >
                            {profile.name}
                          </button>
                          {profile.initial_pull_pending ? <span className="topic-settings-initial-tag">首次全量</span> : null}
                          {!profile.is_active ? <span className="topic-settings-muted-tag">已关闭</span> : null}
                        </div>
                      </td>
                      <td className="topic-col-range">
                        <div className="topic-settings-range" title={rangeTooltip}>
                          <span>{yearStart} - {yearEnd}</span>
                          <span>{venuePreview}</span>
                        </div>
                      </td>
                      <td className="topic-col-filter">
                        <div className="topic-settings-filter" title={filterTooltip}>
                          <span>包含：{includePreview}</span>
                          <span>排除：{excludePreview}</span>
                        </div>
                      </td>
                      <td className="topic-col-run">
                        <div className="topic-settings-run-record">
                          <span>{latestRun ? shared.formatTimestamp(shared.resolveRunSortTimestamp(latestRun)) : '--'}</span>
                          <span className={`topic-settings-run-status${latestRun ? ` is-${latestRun.status.toLowerCase()}` : ''}`}>
                            {latestRun ? shared.autoPullRunStatusLabels[latestRun.status] : '未执行'}
                          </span>
                        </div>
                      </td>
                      <td className="topic-col-rule">
                        <div className="topic-settings-rule-text">
                          {!hasActiveEffectiveRule ? (
                            <span className="topic-settings-muted-text">--</span>
                          ) : (
                            <button
                              type="button"
                              className={`topic-settings-rule-trigger${isRulePreviewOpen ? ' is-open' : ''}`}
                              onClick={() => {
                                setActiveTopicListRulePreviewTopicId((current) =>
                                  current === profile.topic_id ? null : profile.topic_id,
                                );
                              }}
                              aria-expanded={isRulePreviewOpen}
                            >
                              {effectiveRule.name}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="topic-col-actions">
                        <div className="topic-settings-options">
                          <label className="topic-list-active-toggle">
                            <input
                              type="checkbox"
                              checked={profile.is_active}
                              onChange={() => void controller.handleToggleTopicProfileActive(profile)}
                            />
                            <span>参与检索</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                    {isRulePreviewOpen && effectiveRule ? (
                      <tr className="topic-settings-rule-preview-row">
                        <td colSpan={6}>
                          <div className="topic-rule-preview-panel topic-settings-rule-preview-panel">
                            {renderRulePreviewPanel(effectiveRule)}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="topic-settings-table-summary-row">
                <td colSpan={6}>
                  <div className="topic-settings-table-summary">
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      总主题 <strong>{controller.topicSettingsSummaryStats.totalCount}</strong>
                    </span>
                    <span data-ui="text" data-variant="caption" data-tone="muted">
                      参与检索 <strong>{controller.topicSettingsSummaryStats.activeCount}</strong>
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
      {topicForm.topicFormModalOpen ? (
        <div className="topic-profile-modal-backdrop" role="presentation">
          <section
            className="topic-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-label="主题基础信息"
          >
            <header className="topic-modal-header">
              <h3>主题基础信息</h3>
              <button
                type="button"
                className="topic-modal-close"
                onClick={controller.handleCloseTopicModal}
                aria-label="关闭主题弹窗"
              >
                ×
              </button>
            </header>

            <section className="topic-modal-section">
              <div className="topic-modal-grid">
                <label data-ui="field">
                  <span data-slot="label">
                    主题名称 <span className="topic-required-mark">*</span>
                  </span>
                  <input
                    data-ui="input"
                    data-size="sm"
                    value={topicForm.topicFormName}
                    onChange={(event) => topicForm.setTopicFormName(event.target.value)}
                    placeholder="输入主题名称"
                  />
                </label>
                <label data-ui="field">
                  <span data-slot="label">主题标识</span>
                  <input
                    data-ui="input"
                    data-size="sm"
                    className="topic-id-readonly-input"
                    value={topicForm.topicEditingId ? topicForm.topicFormTopicId : controller.topicAutoIdPreview}
                    placeholder="将根据主题名称自动生成"
                    readOnly
                  />
                </label>
                <label data-ui="field">
                  <span data-slot="label">包含词</span>
                  <div className="topic-token-editor">
                    <div className="topic-token-editor-input">
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={topicForm.topicFormIncludeDraft}
                        onChange={(event) => topicForm.setTopicFormIncludeDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            controller.handleAddTopicIncludeKeyword();
                          }
                        }}
                        placeholder="输入后按 Enter 添加"
                      />
                    </div>
                    <div className="topic-token-list">
                      {topicForm.topicFormIncludeKeywords.map((keyword) => (
                        <span key={`include-${keyword}`} className="topic-token-chip">
                          <span>{keyword}</span>
                          <button
                            type="button"
                            onClick={() => controller.handleRemoveTopicIncludeKeyword(keyword)}
                            aria-label={`移除包含词 ${keyword}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </label>

                <label data-ui="field">
                  <span data-slot="label">排除词</span>
                  <div className="topic-token-editor">
                    <div className="topic-token-editor-input">
                      <input
                        data-ui="input"
                        data-size="sm"
                        value={topicForm.topicFormExcludeDraft}
                        onChange={(event) => topicForm.setTopicFormExcludeDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            controller.handleAddTopicExcludeKeyword();
                          }
                        }}
                        placeholder="输入后按 Enter 添加"
                      />
                    </div>
                    <div className="topic-token-list">
                      {topicForm.topicFormExcludeKeywords.map((keyword) => (
                        <span key={`exclude-${keyword}`} className="topic-token-chip">
                          <span>{keyword}</span>
                          <button
                            type="button"
                            onClick={() => controller.handleRemoveTopicExcludeKeyword(keyword)}
                            aria-label={`移除排除词 ${keyword}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </label>

                <div data-ui="field" className="topic-venue-picker">
                  <span data-slot="label">会议与期刊</span>
                  <button
                    type="button"
                    className={`topic-venue-picker-trigger${topicForm.topicVenuePickerOpen ? ' is-open' : ''}`}
                    onClick={() => topicForm.setTopicVenuePickerOpen((current) => !current)}
                    aria-expanded={topicForm.topicVenuePickerOpen}
                  >
                    <span>{controller.topicVenueSelectionLabel}</span>
                    <span aria-hidden="true">{topicForm.topicVenuePickerOpen ? '▲' : '▼'}</span>
                  </button>
                  {topicForm.topicVenuePickerOpen ? (
                    <div className="topic-venue-picker-panel">
                      <div className="topic-venue-picker-actions">
                        <button
                          data-ui="button"
                          data-variant="ghost"
                          data-size="sm"
                          type="button"
                          onClick={() => topicForm.setTopicFormVenueSelections([])}
                        >
                          清空选择
                        </button>
                      </div>
                      <div className="topic-venue-picker-list">
                        {controller.topicVenueOptions.map((option) => (
                          <label key={option} className="topic-venue-picker-item">
                            <input
                              type="checkbox"
                              checked={topicForm.topicFormVenueSelections.includes(option)}
                              onChange={() => controller.handleToggleTopicVenueSelection(option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div data-ui="field" className="topic-year-field">
                  <div className="topic-year-header">
                    <span data-slot="label">年份范围</span>
                    <div className="topic-year-shortcuts">
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        onClick={() => controller.applyTopicYearPreset('recent-5')}
                      >
                        近5年
                      </button>
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        onClick={() => controller.applyTopicYearPreset('recent-10')}
                      >
                        近10年
                      </button>
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        onClick={() => controller.applyTopicYearPreset('all')}
                      >
                        全部
                      </button>
                    </div>
                  </div>
                  <div className="topic-year-range-main">
                    <input
                      className="topic-year-bound-input"
                      type="number"
                      min={shared.topicYearMinBound}
                      max={shared.topicYearMaxBound}
                      value={controller.topicYearLowerBound}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        if (!Number.isFinite(value)) {
                          return;
                        }
                        const clamped = Math.max(shared.topicYearMinBound, Math.min(value, topicForm.topicFormYearEnd));
                        topicForm.setTopicFormYearStart(clamped);
                      }}
                    />
                    <div
                      className="topic-year-range-sliders"
                      role="group"
                      aria-label="年份范围滑动选择"
                      style={controller.topicYearRangeTrackStyle}
                    >
                      <input
                        type="range"
                        min={shared.topicYearMinBound}
                        max={shared.topicYearMaxBound}
                        value={topicForm.topicFormYearStart}
                        className="topic-year-slider topic-year-slider-start"
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(value)) {
                            return;
                          }
                          topicForm.setTopicFormYearStart(Math.min(value, topicForm.topicFormYearEnd));
                        }}
                      />
                      <input
                        type="range"
                        min={shared.topicYearMinBound}
                        max={shared.topicYearMaxBound}
                        value={topicForm.topicFormYearEnd}
                        className="topic-year-slider topic-year-slider-end"
                        onChange={(event) => {
                          const value = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(value)) {
                            return;
                          }
                          topicForm.setTopicFormYearEnd(Math.max(value, topicForm.topicFormYearStart));
                        }}
                      />
                    </div>
                    <input
                      className="topic-year-bound-input"
                      type="number"
                      min={shared.topicYearMinBound}
                      max={shared.topicYearMaxBound}
                      value={controller.topicYearUpperBound}
                      onChange={(event) => {
                        const value = Number.parseInt(event.target.value, 10);
                        if (!Number.isFinite(value)) {
                          return;
                        }
                        const clamped = Math.min(shared.topicYearMaxBound, Math.max(value, topicForm.topicFormYearStart));
                        topicForm.setTopicFormYearEnd(clamped);
                      }}
                    />
                  </div>
                </div>
              </div>

            </section>

            <section className="topic-modal-section">
              <div className="topic-rule-binding-column">
                <div className="topic-rule-binding-header-row">
                  <h4 className="topic-modal-section-title">规则绑定</h4>
                  <button
                    data-ui="button"
                    data-variant="ghost"
                    data-size="sm"
                    type="button"
                    onClick={controller.handleOpenRuleCenter}
                  >
                    前往规则中心
                  </button>
                </div>
                <div className="topic-rule-binding-panel">
                  <div data-ui="field" className="topic-rule-binding-select-field">
                    <div className="topic-rule-binding-control-row">
                      <select
                        data-ui="select"
                        data-size="sm"
                        aria-label="选择规则"
                        value={selectedTopicRuleId}
                        onChange={(event) => {
                          controller.handleSetTopicRuleBinding(event.target.value);
                        }}
                      >
                        <option value="">未绑定</option>
                        {controller.topicScopedRules.map((rule) => (
                          <option key={rule.rule_id} value={rule.rule_id}>
                            {rule.name}{rule.status !== 'ACTIVE' ? '（已暂停）' : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        data-ui="button"
                        data-variant="ghost"
                        data-size="sm"
                        type="button"
                        className="topic-rule-preview-toggle"
                        onClick={() => setIsTopicRulePreviewOpen((current) => !current)}
                        disabled={!selectedTopicRule}
                        aria-expanded={isTopicRulePreviewOpen}
                      >
                        {isTopicRulePreviewOpen ? '收起预览' : '预览'}
                      </button>
                    </div>
                  </div>
                  <div data-ui="field" className="topic-modal-toggle-field">
                    <div className="topic-modal-initial-row">
                      <label
                        className="topic-modal-checkbox"
                        title="开启后，下次命中规则时按全量范围拉取；该次运行成功后会自动关闭。"
                      >
                        <input
                          type="checkbox"
                          checked={topicForm.topicFormInitialPullPending}
                          title="开启后，下次命中规则时按全量范围拉取；该次运行成功后会自动关闭。"
                          onChange={(event) => {
                            topicForm.setTopicFormInitialPullPending(event.target.checked);
                          }}
                        />
                        <span title="开启后，下次命中规则时按全量范围拉取；该次运行成功后会自动关闭。">
                          首次全量拉取
                        </span>
                      </label>
                      <div className="topic-modal-initial-meta">
                        <span
                          className={`topic-modal-initial-status${topicForm.topicFormInitialPullPending ? ' is-pending' : ' is-closed'}`}
                        >
                          {topicForm.topicFormInitialPullPending ? '状态：待首次成功' : '状态：已关闭'}
                        </span>
                        <button
                          data-ui="button"
                          data-variant="ghost"
                          data-size="sm"
                          type="button"
                          title="重置后会恢复为待首次成功，下一次执行将重新全量拉取。"
                          onClick={() => {
                            topicForm.setTopicFormInitialPullPending(true);
                          }}
                        >
                          重置
                        </button>
                      </div>
                    </div>
                  </div>
                  {isTopicRulePreviewOpen && selectedTopicRule ? (
                    <div className="topic-rule-preview-panel">
                      {renderRulePreviewPanel(selectedTopicRule)}
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <footer className="topic-modal-footer">
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                onClick={controller.handleCloseTopicModal}
              >
                取消
              </button>
              <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void controller.handleSubmitTopicProfile()}>
                {topicForm.topicEditingId ? '更新主题' : '创建主题'}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
