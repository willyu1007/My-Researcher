import type { AutoPullRunStatus, AutoPullWeekday } from '../shared/types';

type AutoImportTabProps = {
  active: boolean;
} & Record<string, any>;

export function AutoImportTab(props: AutoImportTabProps) {
  if (!props.active) {
    return null;
  }

  const {
    applyTopicYearPreset,
    asRecord,
    autoImportSubTab,
    autoPullHourOptions,
    autoPullLimitHint,
    autoPullLookbackHint,
    autoPullParseHint,
    autoPullQualityHint,
    autoPullQualityPresetOptions,
    autoPullRuleById,
    autoPullRunStatusLabels,
    autoPullRuns,
    autoPullSortHint,
    autoPullWeekdayOptions,
    formatTimestamp,
    handleAddTopicExcludeKeyword,
    handleAddTopicIncludeKeyword,
    handleCloseTopicModal,
    handleDeleteRule,
    handleEditRule,
    handleEditTopicProfile,
    handleOpenRuleCenter,
    handleOpenCreateTopicProfile,
    handleRemoveTopicExcludeKeyword,
    handleRemoveTopicIncludeKeyword,
    handleResetRuleComposer,
    handleRetryRun,
    handleSetTopicRuleBinding,
    handleSubmitRule,
    handleSubmitTopicProfile,
    handleToggleTopicProfileActive,
    handleToggleTopicVenueSelection,
    latestRunByRuleId,
    loadAutoPullRunDetail,
    resolveRunSortTimestamp,
    ruleFormFrequency,
    ruleFormLookbackInput,
    ruleFormMaxResultsInput,
    ruleFormMinCompletenessInput,
    ruleFormName,
    ruleFormParseAndIngest,
    ruleFormSortMode,
    ruleFormWeekday,
    ruleSourceArxiv,
    ruleSourceCrossref,
    rulesError,
    runDetailError,
    runDetailLoading,
    runsError,
    runsFilterStatus,
    runsPageIndex,
    runsPageItems,
    runsTotalPages,
    scheduleHourValue,
    selectedRunDetail,
    selectedRunDurationLabel,
    selectedRunPulledAtLabel,
    selectedRunTopicLabel,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormMinuteInput,
    setRuleFormName,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
    setRunsFilterStatus,
    setRunsPageIndex,
    setTopicFormExcludeDraft,
    setTopicFormIncludeDraft,
    setTopicFormName,
    setTopicFormVenueSelections,
    setTopicFormYearEnd,
    setTopicFormYearStart,
    setTopicVenuePickerOpen,
    topicAutoIdPreview,
    topicEditingId,
    topicFormExcludeDraft,
    topicFormExcludeKeywords,
    topicFormIncludeDraft,
    topicFormIncludeKeywords,
    topicFormModalOpen,
    topicFormName,
    topicFormRuleIds,
    topicFormTopicId,
    topicFormVenueSelections,
    topicFormYearEnd,
    topicFormYearStart,
    topicProfiles,
    topicProfilesError,
    topicScopedRules,
    topicSettingsSummaryStats,
    topicVenueOptions,
    topicVenuePickerOpen,
    topicVenueSelectionLabel,
    topicYearLowerBound,
    topicYearMaxBound,
    topicYearMinBound,
    topicYearRangeTrackStyle,
    topicYearUpperBound,
    updateHelpTooltipAlignment,
  } = props;
  const activeTopicRules = topicScopedRules.filter((rule: any) => rule.status === 'ACTIVE');

  const formatRuleScheduleLabel = (rule: any): string => {
    const schedule = rule.schedules?.[0];
    if (!schedule) {
      return '--';
    }
    const hour = typeof schedule.hour === 'number' ? schedule.hour : 0;
    const minute = typeof schedule.minute === 'number' ? schedule.minute : 0;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (schedule.frequency === 'WEEKLY') {
      const weekday = typeof schedule.days_of_week?.[0] === 'string' ? schedule.days_of_week[0] : '--';
      return `每周 ${weekday} ${time}`;
    }
    return `每日 ${time}`;
  };

  const formatRuleSourcesLabel = (rule: any): string => {
    const sources = Array.isArray(rule.sources)
      ? rule.sources
        .filter((source: any) => source?.enabled)
        .map((source: any) => source?.source)
        .filter((source: unknown): source is string => typeof source === 'string' && source.length > 0)
      : [];
    return sources.length > 0 ? sources.join(' / ') : '--';
  };

  const renderRuleInlineEditor = () => (
    <section className="topic-rule-inline-editor">
      <div className="topic-rule-row-primary">
        <label data-ui="field" className="topic-rule-name-field">
          <span data-slot="label">规则名称</span>
          <input
            data-ui="input"
            data-size="sm"
            value={ruleFormName}
            onChange={(event) => setRuleFormName(event.target.value)}
            placeholder="例如 每日增量拉取"
          />
        </label>
        <div data-ui="field" className="topic-rule-plan-field">
          <span data-slot="label">调度计划</span>
          <div className="topic-rule-plan-box">
            <div className="topic-rule-plan-item">
              <div className="rule-frequency-toggle" role="group" aria-label="调度频率">
                <button
                  type="button"
                  className={`rule-frequency-toggle-button${ruleFormFrequency === 'DAILY' ? ' is-active' : ''}`}
                  onClick={() => setRuleFormFrequency('DAILY')}
                  aria-pressed={ruleFormFrequency === 'DAILY'}
                >
                  按日
                </button>
                <button
                  type="button"
                  className={`rule-frequency-toggle-button${ruleFormFrequency === 'WEEKLY' ? ' is-active' : ''}`}
                  onClick={() => setRuleFormFrequency('WEEKLY')}
                  aria-pressed={ruleFormFrequency === 'WEEKLY'}
                >
                  按周
                </button>
              </div>
            </div>
            <label className="topic-rule-plan-item">
              <select
                data-ui="select"
                data-size="sm"
                aria-label="按整点执行时间"
                value={scheduleHourValue}
                onChange={(event) => {
                  setRuleFormHourInput(event.target.value);
                  setRuleFormMinuteInput('0');
                }}
              >
                {autoPullHourOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="topic-rule-plan-item">
              <select
                data-ui="select"
                data-size="sm"
                aria-label="按周执行星期"
                value={ruleFormWeekday}
                onChange={(event) => setRuleFormWeekday(event.target.value as AutoPullWeekday)}
                disabled={ruleFormFrequency !== 'WEEKLY'}
              >
                {autoPullWeekdayOptions.map((option: any) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div data-ui="field" className="topic-rule-source-field">
          <span data-slot="label">来源</span>
          <div className="topic-rule-source-box">
            <label className={`topic-rule-source-option${ruleSourceCrossref ? ' is-active' : ''}`}>
              <input type="checkbox" checked={ruleSourceCrossref} onChange={(event) => setRuleSourceCrossref(event.target.checked)} />
              <span>CROSSREF</span>
            </label>
            <label className={`topic-rule-source-option${ruleSourceArxiv ? ' is-active' : ''}`}>
              <input type="checkbox" checked={ruleSourceArxiv} onChange={(event) => setRuleSourceArxiv(event.target.checked)} />
              <span>ARXIV</span>
            </label>
          </div>
        </div>
      </div>
      <div className="topic-rule-row-secondary">
        <label data-ui="field">
          <span data-slot="label" className="field-label-with-help">
            质量门槛
            <span
              className="field-label-help"
              data-help={autoPullQualityHint}
              aria-label="质量门槛说明"
              tabIndex={0}
              onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
              onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
            >
              ?
            </span>
          </span>
          <select
            data-ui="select"
            data-size="sm"
            value={ruleFormMinCompletenessInput}
            onChange={(event) => setRuleFormMinCompletenessInput(event.target.value)}
          >
            {autoPullQualityPresetOptions.map((option: any) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label data-ui="field">
          <span data-slot="label" className="field-label-with-help">
            滑动窗口（天）
            <span
              className="field-label-help"
              data-help={autoPullLookbackHint}
              aria-label="滑动窗口说明"
              tabIndex={0}
              onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
              onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
            >
              ?
            </span>
          </span>
          <input
            data-ui="input"
            data-size="sm"
            value={ruleFormLookbackInput}
            onChange={(event) => setRuleFormLookbackInput(event.target.value)}
          />
        </label>
        <label data-ui="field">
          <span data-slot="label" className="field-label-with-help">
            每次拉取上限
            <span
              className="field-label-help"
              data-help={autoPullLimitHint}
              aria-label="每次拉取上限说明"
              tabIndex={0}
              onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
              onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
            >
              ?
            </span>
          </span>
          <input
            data-ui="input"
            data-size="sm"
            value={ruleFormMaxResultsInput}
            onChange={(event) => setRuleFormMaxResultsInput(event.target.value)}
          />
        </label>
        <div data-ui="field" className="topic-rule-toggle-field">
          <span data-slot="label" className="field-label-with-help">
            排序规则
            <span
              className="field-label-help"
              data-help={autoPullSortHint}
              aria-label="排序规则说明"
              tabIndex={0}
              onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
              onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
            >
              ?
            </span>
          </span>
          <div className="rule-option-toggle" role="group" aria-label="排序规则">
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormSortMode === 'llm_score' ? ' is-active' : ''}`}
              onClick={() => setRuleFormSortMode('llm_score')}
              aria-pressed={ruleFormSortMode === 'llm_score'}
            >
              大模型打分
            </button>
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormSortMode === 'hybrid_score' ? ' is-active' : ''}`}
              onClick={() => setRuleFormSortMode('hybrid_score')}
              aria-pressed={ruleFormSortMode === 'hybrid_score'}
            >
              综合评分
            </button>
          </div>
        </div>
        <div data-ui="field" className="topic-rule-toggle-field">
          <span data-slot="label" className="field-label-with-help">
            解析内容并入库
            <span
              className="field-label-help"
              data-help={autoPullParseHint}
              aria-label="解析内容并入库说明"
              tabIndex={0}
              onMouseEnter={(event) => updateHelpTooltipAlignment(event.currentTarget)}
              onFocus={(event) => updateHelpTooltipAlignment(event.currentTarget)}
            >
              ?
            </span>
          </span>
          <div className="rule-option-toggle" role="group" aria-label="解析内容并入库">
            <button
              type="button"
              className={`rule-option-toggle-button${!ruleFormParseAndIngest ? ' is-active' : ''}`}
              onClick={() => setRuleFormParseAndIngest(false)}
              aria-pressed={!ruleFormParseAndIngest}
            >
              关闭
            </button>
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormParseAndIngest ? ' is-active' : ''}`}
              onClick={() => setRuleFormParseAndIngest(true)}
              aria-pressed={ruleFormParseAndIngest}
            >
              开启
            </button>
          </div>
        </div>
      </div>
      {rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{rulesError}</p> : null}
    </section>
  );

  return (
    <section className="literature-tab-panel" data-autopull-status={props.autoPullStatusDigest}>
                    {autoImportSubTab === 'topic-settings' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-gap="2" data-wrap="wrap">
                          <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleOpenCreateTopicProfile}>
                            新增主题
                          </button>
                        </div>
                        {topicProfilesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{topicProfilesError}</p> : null}
                        <div className="topic-settings-table-wrap">
                          {topicProfiles.length === 0 ? (
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
                                {topicProfiles.map((profile: any) => {
                                  const yearStart = profile.default_min_year ?? topicYearMinBound;
                                  const yearEnd = profile.default_max_year ?? topicYearMaxBound;
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
                                  const effectiveRule = effectiveRuleId ? autoPullRuleById.get(effectiveRuleId) ?? null : null;
                                  const latestRun = effectiveRuleId ? (latestRunByRuleId.get(effectiveRuleId) ?? null) : null;

                                  return (
                                    <tr key={profile.topic_id}>
                                      <td className="topic-col-name">
                                        <div className="topic-settings-name">
                                          <button
                                            type="button"
                                            className="topic-settings-name-trigger"
                                            onClick={() => handleEditTopicProfile(profile)}
                                          >
                                            {profile.name}
                                          </button>
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
                                          <span>{latestRun ? formatTimestamp(resolveRunSortTimestamp(latestRun)) : '--'}</span>
                                          <span className={`topic-settings-run-status${latestRun ? ` is-${latestRun.status.toLowerCase()}` : ''}`}>
                                            {latestRun ? autoPullRunStatusLabels[latestRun.status] : '未执行'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="topic-col-rule">
                                        <div className="topic-settings-rule-text">
                                          {effectiveRule?.status !== 'ACTIVE' ? (
                                            <span className="topic-settings-muted-text">--</span>
                                          ) : (
                                            <span>
                                              {effectiveRule.name}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="topic-col-actions">
                                        <div className="topic-settings-options">
                                          <label className="topic-list-active-toggle">
                                            <input
                                              type="checkbox"
                                              checked={profile.is_active}
                                              onChange={() => void handleToggleTopicProfileActive(profile)}
                                            />
                                            <span>参与检索</span>
                                          </label>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="topic-settings-table-summary-row">
                                  <td colSpan={6}>
                                    <div className="topic-settings-table-summary">
                                      <span data-ui="text" data-variant="caption" data-tone="muted">
                                        总主题 <strong>{topicSettingsSummaryStats.totalCount}</strong>
                                      </span>
                                      <span data-ui="text" data-variant="caption" data-tone="muted">
                                        参与检索 <strong>{topicSettingsSummaryStats.activeCount}</strong>
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </div>
                        {topicFormModalOpen ? (
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
                                  onClick={handleCloseTopicModal}
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
                                      value={topicFormName}
                                      onChange={(event) => setTopicFormName(event.target.value)}
                                      placeholder="输入主题名称"
                                    />
                                  </label>
                                  <label data-ui="field">
                                    <span data-slot="label">主题标识</span>
                                    <input
                                      data-ui="input"
                                      data-size="sm"
                                      className="topic-id-readonly-input"
                                      value={topicEditingId ? topicFormTopicId : topicAutoIdPreview}
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
                                          value={topicFormIncludeDraft}
                                          onChange={(event) => setTopicFormIncludeDraft(event.target.value)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                              event.preventDefault();
                                              handleAddTopicIncludeKeyword();
                                            }
                                          }}
                                          placeholder="输入后按 Enter 添加"
                                        />
                                      </div>
                                      <div className="topic-token-list">
                                        {topicFormIncludeKeywords.map((keyword: any) => (
                                          <span key={`include-${keyword}`} className="topic-token-chip">
                                            <span>{keyword}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveTopicIncludeKeyword(keyword)}
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
                                          value={topicFormExcludeDraft}
                                          onChange={(event) => setTopicFormExcludeDraft(event.target.value)}
                                          onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                                              event.preventDefault();
                                              handleAddTopicExcludeKeyword();
                                            }
                                          }}
                                          placeholder="输入后按 Enter 添加"
                                        />
                                      </div>
                                      <div className="topic-token-list">
                                        {topicFormExcludeKeywords.map((keyword: any) => (
                                          <span key={`exclude-${keyword}`} className="topic-token-chip">
                                            <span>{keyword}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveTopicExcludeKeyword(keyword)}
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
                                      className={`topic-venue-picker-trigger${topicVenuePickerOpen ? ' is-open' : ''}`}
                                      onClick={() => setTopicVenuePickerOpen((current: any) => !current)}
                                      aria-expanded={topicVenuePickerOpen}
                                    >
                                      <span>{topicVenueSelectionLabel}</span>
                                      <span aria-hidden="true">{topicVenuePickerOpen ? '▲' : '▼'}</span>
                                    </button>
                                    {topicVenuePickerOpen ? (
                                      <div className="topic-venue-picker-panel">
                                        <div className="topic-venue-picker-actions">
                                          <button
                                            data-ui="button"
                                            data-variant="ghost"
                                            data-size="sm"
                                            type="button"
                                            onClick={() => setTopicFormVenueSelections([])}
                                          >
                                            清空选择
                                          </button>
                                        </div>
                                        <div className="topic-venue-picker-list">
                                          {topicVenueOptions.map((option: any) => (
                                            <label key={option} className="topic-venue-picker-item">
                                              <input
                                                type="checkbox"
                                                checked={topicFormVenueSelections.includes(option)}
                                                onChange={() => handleToggleTopicVenueSelection(option)}
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
                                          onClick={() => applyTopicYearPreset('recent-5')}
                                        >
                                          近5年
                                        </button>
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={() => applyTopicYearPreset('recent-10')}
                                        >
                                          近10年
                                        </button>
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={() => applyTopicYearPreset('all')}
                                        >
                                          全部
                                        </button>
                                      </div>
                                    </div>
                                    <div className="topic-year-range-main">
                                      <input
                                        className="topic-year-bound-input"
                                        type="number"
                                        min={topicYearMinBound}
                                        max={topicYearMaxBound}
                                        value={topicYearLowerBound}
                                        onChange={(event) => {
                                          const value = Number.parseInt(event.target.value, 10);
                                          if (!Number.isFinite(value)) {
                                            return;
                                          }
                                          const clamped = Math.max(topicYearMinBound, Math.min(value, topicFormYearEnd));
                                          setTopicFormYearStart(clamped);
                                        }}
                                      />
                                      <div
                                        className="topic-year-range-sliders"
                                        role="group"
                                        aria-label="年份范围滑动选择"
                                        style={topicYearRangeTrackStyle}
                                      >
                                        <input
                                          type="range"
                                          min={topicYearMinBound}
                                          max={topicYearMaxBound}
                                          value={topicFormYearStart}
                                          className="topic-year-slider topic-year-slider-start"
                                          onChange={(event) => {
                                            const value = Number.parseInt(event.target.value, 10);
                                            if (!Number.isFinite(value)) {
                                              return;
                                            }
                                            setTopicFormYearStart(Math.min(value, topicFormYearEnd));
                                          }}
                                        />
                                        <input
                                          type="range"
                                          min={topicYearMinBound}
                                          max={topicYearMaxBound}
                                          value={topicFormYearEnd}
                                          className="topic-year-slider topic-year-slider-end"
                                          onChange={(event) => {
                                            const value = Number.parseInt(event.target.value, 10);
                                            if (!Number.isFinite(value)) {
                                              return;
                                            }
                                            setTopicFormYearEnd(Math.max(value, topicFormYearStart));
                                          }}
                                        />
                                      </div>
                                      <input
                                        className="topic-year-bound-input"
                                        type="number"
                                        min={topicYearMinBound}
                                        max={topicYearMaxBound}
                                        value={topicYearUpperBound}
                                        onChange={(event) => {
                                          const value = Number.parseInt(event.target.value, 10);
                                          if (!Number.isFinite(value)) {
                                            return;
                                          }
                                          const clamped = Math.min(topicYearMaxBound, Math.max(value, topicFormYearStart));
                                          setTopicFormYearEnd(clamped);
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
                                    </div>
                                    <div className="topic-rule-binding-card">
                                      <label data-ui="field" className="topic-rule-binding-select-field">
                                        <span data-slot="label">生效规则</span>
                                        <select
                                          data-ui="select"
                                          data-size="sm"
                                          value={topicFormRuleIds[0] ?? ''}
                                          onChange={(event) => handleSetTopicRuleBinding(event.target.value)}
                                        >
                                          <option value="">未绑定</option>
                                          {topicScopedRules.map((rule: any) => (
                                            <option key={rule.rule_id} value={rule.rule_id}>
                                              {rule.name}{rule.status !== 'ACTIVE' ? '（已暂停）' : ''}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <p data-ui="text" data-variant="caption" data-tone="muted">
                                        每个主题最多绑定 1 条规则。规则详情与编辑请在“规则中心”处理。
                                      </p>
                                      <div data-ui="toolbar" data-gap="2">
                                        <button
                                          data-ui="button"
                                          data-variant="ghost"
                                          data-size="sm"
                                          type="button"
                                          onClick={handleOpenRuleCenter}
                                        >
                                          前往规则中心
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                              </section>

                              <footer className="topic-modal-footer">
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={handleCloseTopicModal}
                                >
                                  取消
                                </button>
                                <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={handleSubmitTopicProfile}>
                                  {topicEditingId ? '更新主题' : '创建主题'}
                                </button>
                              </footer>
                            </section>
                          </div>
                        ) : null}
                      </section>
                    ) : null}
                    {autoImportSubTab === 'rule-center' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-gap="2" data-wrap="wrap" className="rule-center-toolbar">
                          <button
                            data-ui="button"
                            data-variant="primary"
                            data-size="sm"
                            type="button"
                            onClick={handleResetRuleComposer}
                          >
                            新建规则
                          </button>
                        </div>
                        <p data-ui="text" data-variant="caption" data-tone="muted" className="rule-center-description">
                          规则中心仅用于维护规则配置；规则绑定在“设置主题”中维护，每个主题最多绑定 1 条规则。
                        </p>
                        {rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{rulesError}</p> : null}
                        <div className="rule-center-table-wrap">
                          {activeTopicRules.length === 0 ? (
                            <p data-ui="text" data-variant="caption" data-tone="muted">暂无启用中的 TOPIC 规则。</p>
                          ) : (
                            <table className="rule-center-table">
                              <thead>
                                <tr>
                                  <th>规则名称</th>
                                  <th>调度</th>
                                  <th>来源</th>
                                  <th>操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {activeTopicRules.map((rule: any) => {
                                  return (
                                    <tr key={rule.rule_id}>
                                      <td>
                                        <div className="rule-center-rule-name">
                                          <span>{rule.name}</span>
                                        </div>
                                      </td>
                                      <td>{formatRuleScheduleLabel(rule)}</td>
                                      <td>{formatRuleSourcesLabel(rule)}</td>
                                      <td>
                                        <div data-ui="toolbar" data-gap="2">
                                          <button
                                            data-ui="button"
                                            data-variant="ghost"
                                            data-size="sm"
                                            type="button"
                                            onClick={() => handleEditRule(rule)}
                                          >
                                            编辑
                                          </button>
                                          <button
                                            data-ui="button"
                                            data-variant="ghost"
                                            data-size="sm"
                                            type="button"
                                            onClick={() => {
                                              const confirmed = window.confirm(`确认移除规则「${rule.name}」吗？`);
                                              if (!confirmed) {
                                                return;
                                              }
                                              void handleDeleteRule(rule);
                                            }}
                                          >
                                            移除规则
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>

                        <section className="topic-rule-binding-column rule-center-editor-block">
                          <div className="topic-rule-binding-header-row">
                            <h4 className="topic-modal-section-title">规则编辑器</h4>
                            <div className="topic-rule-header-actions" data-ui="toolbar" data-gap="1">
                              <button
                                data-ui="button"
                                data-variant="ghost"
                                data-size="sm"
                                type="button"
                                className="topic-rule-header-action"
                                onClick={handleResetRuleComposer}
                              >
                                重置
                              </button>
                              <button
                                data-ui="button"
                                data-variant="primary"
                                data-size="sm"
                                type="button"
                                onClick={() => void handleSubmitRule()}
                              >
                                保存规则
                              </button>
                            </div>
                          </div>
                          <div className="topic-rule-binding-card">
                            {renderRuleInlineEditor()}
                          </div>
                        </section>
                      </section>
                    ) : null}
                    {autoImportSubTab === 'runs-alerts' ? (
                      <section className="literature-section-block">
                        <div data-ui="toolbar" data-wrap="wrap" data-gap="2" className="literature-filter-toolbar">
                          <label data-ui="field" className="literature-filter-year is-prefixed" aria-label="执行状态筛选">
                            <select
                              data-ui="select"
                              data-size="sm"
                              value={runsFilterStatus}
                              onChange={(event) => {
                                setRunsFilterStatus(event.target.value as '' | AutoPullRunStatus | 'EXCEPTION');
                                setRunsPageIndex(1);
                              }}
                            >
                              <option value="">全部</option>
                              <option value="EXCEPTION">异常（FAILED / PARTIAL）</option>
                              <option value="PENDING">PENDING</option>
                              <option value="RUNNING">RUNNING</option>
                              <option value="PARTIAL">PARTIAL</option>
                              <option value="SUCCESS">SUCCESS</option>
                              <option value="FAILED">FAILED</option>
                              <option value="SKIPPED">SKIPPED</option>
                            </select>
                          </label>
                        </div>
                        {runsError ? <p data-ui="text" data-variant="caption" data-tone="danger">{runsError}</p> : null}
                        <div className="auto-pull-runs-layout">
                          <section className="auto-pull-runs-pane auto-pull-runs-list-pane">
                            <div className="literature-list auto-pull-runs-list">
                              {autoPullRuns.length === 0 ? (
                                <p data-ui="text" data-variant="caption" data-tone="muted" className="auto-pull-runs-empty">
                                  暂无运行记录。
                                </p>
                              ) : (
                                runsPageItems.map((run: any) => (
                                  <div
                                    key={run.run_id}
                                    className={`literature-list-item auto-pull-run-item${selectedRunDetail?.run_id === run.run_id ? ' is-selected' : ''}`}
                                  >
                                    <div>
                                      <p data-ui="text" data-variant="body" data-tone="primary">
                                        {run.run_id} · {run.status} · 录入：{String(run.summary.imported_count ?? 0)} · 失败：{String(run.summary.failed_count ?? 0)}
                                      </p>
                                    </div>
                                    <div data-ui="toolbar" data-gap="2">
                                      <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={() => void loadAutoPullRunDetail(run.run_id)}>
                                        详情
                                      </button>
                                      <button data-ui="button" data-variant="secondary" data-size="sm" type="button" onClick={() => void handleRetryRun(run.run_id)}>
                                        重试失败源
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                            {autoPullRuns.length > 0 ? (
                              <div className="auto-pull-runs-pagination">
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => setRunsPageIndex((current: any) => Math.max(1, current - 1))}
                                  disabled={runsPageIndex <= 1}
                                >
                                  上一页
                                </button>
                                <span data-ui="text" data-variant="caption" data-tone="muted">
                                  第 <strong>{runsPageIndex}</strong> / {runsTotalPages} 页
                                </span>
                                <button
                                  data-ui="button"
                                  data-variant="ghost"
                                  data-size="sm"
                                  type="button"
                                  onClick={() => setRunsPageIndex((current: any) => Math.min(runsTotalPages, current + 1))}
                                  disabled={runsPageIndex >= runsTotalPages}
                                >
                                  下一页
                                </button>
                              </div>
                            ) : null}
                          </section>

                          <section className="auto-pull-runs-pane auto-pull-runs-detail-pane">
                            {runDetailLoading ? (
                              <p data-ui="text" data-variant="caption" data-tone="muted">加载运行详情中...</p>
                            ) : null}
                            {runDetailError ? (
                              <p data-ui="text" data-variant="caption" data-tone="danger">{runDetailError}</p>
                            ) : null}
                            {selectedRunDetail ? (
                              <div className="auto-pull-run-detail">
                                <p data-ui="text" data-variant="caption" data-tone="muted">
                                  运行详情：{selectedRunDetail.run_id} · {selectedRunDetail.status}
                                </p>
                                <div className="auto-pull-run-detail-meta">
                                  <p data-ui="text" data-variant="caption" data-tone="muted">
                                    录入：{String(selectedRunDetail.summary.imported_count ?? 0)} · 失败：{String(selectedRunDetail.summary.failed_count ?? 0)}
                                  </p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">主题名称：{selectedRunTopicLabel}</p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">拉取时间：{selectedRunPulledAtLabel}</p>
                                  <p data-ui="text" data-variant="caption" data-tone="muted">持续时间：{selectedRunDurationLabel}</p>
                                </div>
                                <div className="literature-list auto-pull-runs-detail-list">
                                  {(selectedRunDetail.source_attempts ?? []).map((attempt: any) => {
                                    const meta = asRecord(attempt.meta) ?? {};
                                    const incompleteRejectedCount =
                                      typeof meta.incomplete_rejected_count === 'number' ? meta.incomplete_rejected_count : 0;
                                    const duplicateSkippedCount =
                                      typeof meta.duplicate_skipped_count === 'number' ? meta.duplicate_skipped_count : 0;
                                    const belowThresholdCount =
                                      typeof meta.below_threshold_count === 'number' ? meta.below_threshold_count : 0;
                                    const eligibleCount =
                                      typeof meta.eligible_count === 'number' ? meta.eligible_count : 0;
                                    const importedNewCount =
                                      typeof meta.imported_new_count === 'number' ? meta.imported_new_count : 0;
                                    const importedExistingCount =
                                      typeof meta.imported_existing_count === 'number' ? meta.imported_existing_count : 0;
                                    const llmScoreAvg =
                                      typeof meta.llm_score_avg === 'number' ? meta.llm_score_avg : null;

                                    return (
                                      <div key={`${selectedRunDetail.run_id}-${attempt.source}`} className="literature-list-item auto-pull-run-attempt-item">
                                        <div>
                                          <p data-ui="text" data-variant="body" data-tone="primary">
                                            {attempt.source} · {attempt.status}
                                          </p>
                                          <p data-ui="text" data-variant="caption" data-tone="muted">
                                            fetched:{attempt.fetched_count} / imported:{attempt.imported_count} / failed:{attempt.failed_count}
                                          </p>
                                          <p data-ui="text" data-variant="caption" data-tone="muted">
                                            不完整:{incompleteRejectedCount} / 去重跳过:{duplicateSkippedCount} / 低于门槛:{belowThresholdCount} / 可导入:{eligibleCount}
                                          </p>
                                          <p data-ui="text" data-variant="caption" data-tone="muted">
                                            新增:{importedNewCount} / 命中既有:{importedExistingCount}
                                            {llmScoreAvg !== null ? ` / 平均质量分:${llmScoreAvg}` : ''}
                                          </p>
                                        </div>
                                        {attempt.error_message ? (
                                          <p data-ui="text" data-variant="caption" data-tone="danger">{attempt.error_message}</p>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <p data-ui="text" data-variant="caption" data-tone="muted" className="auto-pull-runs-empty">
                                请选择一条 Run 查看详情。
                              </p>
                            )}
                          </section>
                        </div>
                      </section>
                    ) : null}
    </section>
  );
}
