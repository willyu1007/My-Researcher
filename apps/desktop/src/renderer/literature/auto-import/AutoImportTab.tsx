import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  AutoPullRule,
  AutoPullRuleScheduleItem,
  AutoPullWeekday,
} from '../shared/types';
import { AutoImportRuleCenterView } from './views/AutoImportRuleCenterView';
import { AutoImportRunsAlertsView } from './views/AutoImportRunsAlertsView';
import { AutoImportTopicSettingsView } from './views/AutoImportTopicSettingsView';
import type {
  AutoImportSelectOption,
  AutoImportRuleEditorState,
  AutoImportTabProps,
} from './types';

export function AutoImportTab(props: AutoImportTabProps) {
  if (!props.active) {
    return null;
  }

  const [isTopicRulePreviewOpen, setIsTopicRulePreviewOpen] = useState(false);
  const [activeTopicListRulePreviewTopicId, setActiveTopicListRulePreviewTopicId] = useState<string | null>(null);
  const [activeRuleEditor, setActiveRuleEditor] = useState<AutoImportRuleEditorState | null>(null);
  const [activeQuickEditorAnchor, setActiveQuickEditorAnchor] = useState<HTMLElement | null>(null);
  const [activeQuickEditorPosition, setActiveQuickEditorPosition] = useState<{ top: number; left: number } | null>(null);
  const activeQuickEditorPopoverRef = useRef<HTMLDivElement | null>(null);
  const inlineAdvancedSaveTimeoutRef = useRef<number | null>(null);
  const scheduleFormatterCacheRef = useRef<Map<string, Intl.DateTimeFormat>>(new Map());
  const inlineAdvancedAutosaveDebounceMs = 280;

  const {
    controller,
    navigation,
    ruleForm,
    shared,
    topicForm,
  } = props;
  const {
    autoPullRuleById,
    topicScopedRules,
    handleEditRule,
    handleResetRuleComposer,
    handleSubmitRule,
  } = controller;
  const {
    activeSubTab: autoImportSubTab,
  } = navigation;
  const {
    ruleFormFrequency,
    ruleFormHourInput,
    ruleFormLookbackInput,
    ruleFormMaxResultsInput,
    ruleFormMinCompletenessInput,
    ruleFormParseAndIngest,
    ruleFormSortMode,
    ruleFormWeekday,
    ruleSourceArxiv,
    ruleSourceCrossref,
    rulesError,
    setRuleFormFrequency,
    setRuleFormHourInput,
    setRuleFormLookbackInput,
    setRuleFormMaxResultsInput,
    setRuleFormMinCompletenessInput,
    setRuleFormParseAndIngest,
    setRuleFormSortMode,
    setRuleFormWeekday,
    setRuleSourceArxiv,
    setRuleSourceCrossref,
  } = ruleForm;
  const {
    asRecord,
    autoPullHourOptions,
    autoPullLimitHint,
    autoPullLookbackHint,
    autoPullParseHint,
    autoPullQualityHint,
    autoPullQualityPresetOptions,
    autoPullSortHint,
    autoPullStatusDigest,
    autoPullWeekdayOptions,
    updateHelpTooltipAlignment,
  } = shared;
  const {
    topicFormModalOpen,
    topicFormRuleIds,
    topicProfiles,
  } = topicForm;
  const activeTopicRules = topicScopedRules.filter((rule) => rule.status === 'ACTIVE');
  const weekdayLabelByValue = useMemo(
    () => new Map<string, string>(autoPullWeekdayOptions.map((option) => [option.value, option.label])),
    [autoPullWeekdayOptions],
  );
  const qualityPresetLabelByValue = useMemo(
    () => new Map<string, string>(autoPullQualityPresetOptions.map((option) => [option.value, option.label])),
    [autoPullQualityPresetOptions],
  );
  const selectedTopicRuleId = topicFormRuleIds[0] ?? '';
  const selectedTopicRule = selectedTopicRuleId ? autoPullRuleById.get(selectedTopicRuleId) ?? null : null;

  useEffect(() => {
    if (!topicFormModalOpen || !selectedTopicRuleId) {
      setIsTopicRulePreviewOpen(false);
    }
  }, [selectedTopicRuleId, topicFormModalOpen]);

  useEffect(() => {
    if (autoImportSubTab !== 'topic-settings') {
      setActiveTopicListRulePreviewTopicId(null);
      return;
    }
    if (!activeTopicListRulePreviewTopicId) {
      return;
    }
    const exists = topicProfiles.some((profile) => profile.topic_id === activeTopicListRulePreviewTopicId);
    if (!exists) {
      setActiveTopicListRulePreviewTopicId(null);
    }
  }, [activeTopicListRulePreviewTopicId, autoImportSubTab, topicProfiles]);

  useLayoutEffect(() => {
    const element = activeQuickEditorPopoverRef.current;
    if (!element || !activeQuickEditorPosition) {
      return;
    }
    element.style.top = `${activeQuickEditorPosition.top}px`;
    element.style.left = `${activeQuickEditorPosition.left}px`;
  }, [activeQuickEditorPosition, activeRuleEditor]);

  useEffect(() => {
    if (autoImportSubTab !== 'rule-center') {
      setActiveRuleEditor(null);
      setActiveQuickEditorAnchor(null);
      setActiveQuickEditorPosition(null);
    }
  }, [autoImportSubTab]);

  useEffect(() => {
    if (!activeRuleEditor || activeRuleEditor.mode === 'advanced' || !activeQuickEditorAnchor) {
      setActiveQuickEditorPosition(null);
      return;
    }

    const updateQuickEditorPosition = () => {
      const rect = activeQuickEditorAnchor.getBoundingClientRect();
      const popoverWidth = activeRuleEditor.mode === 'schedule' ? 272 : 220;
      const viewportPadding = 12;
      const maxLeft = Math.max(viewportPadding, window.innerWidth - popoverWidth - viewportPadding);
      const nextLeft = Math.min(Math.max(rect.left, viewportPadding), maxLeft);
      setActiveQuickEditorPosition({
        top: rect.bottom + 6,
        left: nextLeft,
      });
    };

    updateQuickEditorPosition();
    window.addEventListener('resize', updateQuickEditorPosition);
    window.addEventListener('scroll', updateQuickEditorPosition, true);

    return () => {
      window.removeEventListener('resize', updateQuickEditorPosition);
      window.removeEventListener('scroll', updateQuickEditorPosition, true);
    };
  }, [activeQuickEditorAnchor, activeRuleEditor]);

  useEffect(() => () => {
    if (inlineAdvancedSaveTimeoutRef.current !== null) {
      window.clearTimeout(inlineAdvancedSaveTimeoutRef.current);
    }
  }, []);

  const normalizedScheduleHourValue = (() => {
    const candidate = typeof ruleFormHourInput === 'string' ? ruleFormHourInput.trim() : '';
    return autoPullHourOptions.some((option) => option.value === candidate) ? candidate : '9';
  })();

  const toWeekdayValue = (value: string): AutoPullWeekday => (
    autoPullWeekdayOptions.find((option) => option.value === value)?.value ?? 'MON'
  );

  const renderSelectOption = (option: AutoImportSelectOption) => (
    <option key={option.value} value={option.value}>{option.label}</option>
  );

  const renderWeekdayOption = (option: AutoImportSelectOption<AutoPullWeekday>) => (
    <option key={option.value} value={option.value}>{option.label}</option>
  );

  const formatRuleScheduleLabel = (rule: AutoPullRule): string => {
    const schedule = rule.schedules?.[0];
    if (!schedule) {
      return '--';
    }
    const hour = typeof schedule.hour === 'number' ? schedule.hour : 0;
    const minute = typeof schedule.minute === 'number' ? schedule.minute : 0;
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    if (schedule.frequency === 'WEEKLY') {
      const weekdayToken = typeof schedule.days_of_week?.[0] === 'string' ? schedule.days_of_week[0] : '--';
      const weekday = weekdayLabelByValue.get(weekdayToken) ?? weekdayToken;
      return `每周 ${weekday} ${time}`;
    }
    return `每日 ${time}`;
  };

  const resolveScheduleTimezone = (schedule: AutoPullRuleScheduleItem | null | undefined): string => {
    if (typeof schedule?.timezone === 'string' && schedule.timezone.trim().length > 0) {
      return schedule.timezone.trim();
    }
    return 'UTC';
  };

  const getScheduleFormatter = (timezone: string): Intl.DateTimeFormat => {
    const normalizedTimezone = timezone.trim().length > 0 ? timezone.trim() : 'UTC';
    const cached = scheduleFormatterCacheRef.current.get(normalizedTimezone);
    if (cached) {
      return cached;
    }

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: normalizedTimezone,
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      scheduleFormatterCacheRef.current.set(normalizedTimezone, formatter);
      return formatter;
    } catch {
      const fallback = scheduleFormatterCacheRef.current.get('UTC');
      if (fallback) {
        return fallback;
      }
      const fallbackFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      scheduleFormatterCacheRef.current.set('UTC', fallbackFormatter);
      return fallbackFormatter;
    }
  };

  const toScheduleLocalParts = (
    value: Date,
    timezone: string,
  ): { month: number; day: number; hour: number; minute: number; dayOfWeek: string } | null => {
    try {
      const formatter = getScheduleFormatter(timezone);
      const parts = formatter.formatToParts(value);
      const monthPart = parts.find((part) => part.type === 'month')?.value;
      const dayPart = parts.find((part) => part.type === 'day')?.value;
      const hourPart = parts.find((part) => part.type === 'hour')?.value;
      const minutePart = parts.find((part) => part.type === 'minute')?.value;
      const weekdayPart = parts.find((part) => part.type === 'weekday')?.value;
      if (!monthPart || !dayPart || !hourPart || !minutePart || !weekdayPart) {
        return null;
      }

      return {
        month: Number.parseInt(monthPart, 10),
        day: Number.parseInt(dayPart, 10),
        hour: Number.parseInt(hourPart, 10),
        minute: Number.parseInt(minutePart, 10),
        dayOfWeek: weekdayPart.toUpperCase(),
      };
    } catch {
      return null;
    }
  };

  const findNextActivation = (schedule: AutoPullRuleScheduleItem, now: Date): Date | null => {
    const timezone = resolveScheduleTimezone(schedule);
    const scheduleHour = Number.isInteger(schedule?.hour) ? schedule.hour : Number.NaN;
    const scheduleMinute = Number.isInteger(schedule?.minute) ? schedule.minute : Number.NaN;
    if (!Number.isFinite(scheduleHour) || !Number.isFinite(scheduleMinute)) {
      return null;
    }

    const weeklyDays = schedule.frequency === 'WEEKLY'
      ? schedule.days_of_week.map((item) => item.toUpperCase())
      : null;
    if (weeklyDays && weeklyDays.length === 0) {
      return null;
    }

    const firstCandidate = new Date(now.getTime());
    firstCandidate.setSeconds(0, 0);
    firstCandidate.setMinutes(firstCandidate.getMinutes() + 1);
    const minuteDelta = (scheduleMinute - firstCandidate.getMinutes() + 60) % 60;
    firstCandidate.setMinutes(firstCandidate.getMinutes() + minuteDelta);

    const maxHours = 14 * 24;
    for (let offset = 0; offset <= maxHours; offset += 1) {
      const candidate = new Date(firstCandidate.getTime() + offset * 3_600_000);
      const local = toScheduleLocalParts(candidate, timezone);
      if (!local) {
        continue;
      }
      if (local.hour !== scheduleHour || local.minute !== scheduleMinute) {
        continue;
      }
      if (weeklyDays && !weeklyDays.includes(local.dayOfWeek)) {
        continue;
      }
      return candidate;
    }
    return null;
  };

  const formatNextActivationLabel = (rule: AutoPullRule): string => {
    if (rule.status !== 'ACTIVE') {
      return '已暂停';
    }

    const schedules = rule.schedules.filter((schedule) => schedule.active !== false);
    if (schedules.length === 0) {
      return '--';
    }

    const now = new Date();
    let bestDate: Date | null = null;
    let bestTimezone = 'UTC';

    for (const schedule of schedules) {
      const next = findNextActivation(schedule, now);
      if (!next) {
        continue;
      }
      if (!bestDate || next.getTime() < bestDate.getTime()) {
        bestDate = next;
        bestTimezone = resolveScheduleTimezone(schedule);
      }
    }

    if (!bestDate) {
      return '--';
    }

    const local = toScheduleLocalParts(bestDate, bestTimezone);
    if (!local) {
      return '--';
    }
    return `${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')} ${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
  };

  const formatRuleSourcesLabel = (rule: AutoPullRule): string => {
    const sources = rule.sources
      .filter((source) => source.enabled)
      .map((source) => source.source);
    return sources.length > 0 ? sources.join(' / ') : '--';
  };

  const formatRuleQualityLabel = (rule: AutoPullRule): string => {
    const scoreValue = String(rule.quality_spec?.min_quality_score ?? 70);
    return qualityPresetLabelByValue.get(scoreValue) ?? scoreValue;
  };

  const getRuleSourceConfig = (rule: AutoPullRule): Record<string, unknown> => {
    const activeSource = rule.sources.find((source) => source.enabled) ?? null;
    return asRecord(activeSource?.config) ?? {};
  };

  const formatRuleSortModeLabel = (rule: AutoPullRule): string => {
    const sourceConfig = getRuleSourceConfig(rule);
    return sourceConfig.sort_mode === 'hybrid_score' ? '综合评分' : '大模型打分';
  };

  const formatRuleParseAndIngestLabel = (rule: AutoPullRule): string => {
    const sourceConfig = getRuleSourceConfig(rule);
    return sourceConfig.parse_and_ingest === true ? '开启' : '关闭';
  };

  const handleCloseActiveRuleEditor = () => {
    if (inlineAdvancedSaveTimeoutRef.current !== null) {
      window.clearTimeout(inlineAdvancedSaveTimeoutRef.current);
      inlineAdvancedSaveTimeoutRef.current = null;
    }
    handleResetRuleComposer();
    setActiveRuleEditor(null);
    setActiveQuickEditorAnchor(null);
    setActiveQuickEditorPosition(null);
  };

  const handleOpenExistingRuleEditor = (
    rule: AutoPullRule,
    mode: 'schedule' | 'source' | 'advanced',
    anchor?: HTMLElement | null,
  ) => {
    if (activeRuleEditor && activeRuleEditor.ruleId === rule.rule_id && activeRuleEditor.mode === mode) {
      handleCloseActiveRuleEditor();
      return;
    }
    handleEditRule(rule);
    setActiveRuleEditor({
      ruleId: rule.rule_id,
      mode,
      name: rule.name,
    });
    if (mode === 'advanced') {
      setActiveQuickEditorAnchor(null);
      setActiveQuickEditorPosition(null);
    } else {
      setActiveQuickEditorAnchor(anchor ?? null);
    }
  };

  const handleOpenNewRuleEditor = () => {
    handleResetRuleComposer();
    setActiveQuickEditorAnchor(null);
    setActiveQuickEditorPosition(null);
    setActiveRuleEditor({
      ruleId: null,
      mode: 'advanced',
      name: '新规则',
    });
  };

  const handleSaveActiveRuleEditor = async () => {
    const didSave = await handleSubmitRule();
    if (didSave) {
      setActiveRuleEditor(null);
    }
  };

  const handleSaveInlineAdvancedEditor = async () => {
    if (!activeRuleEditor || activeRuleEditor.mode !== 'advanced' || activeRuleEditor.ruleId === null) {
      return false;
    }
    return handleSubmitRule({ resetOnSuccess: false, notifyOnSuccess: false });
  };

  const queueInlineAdvancedSave = () => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!activeRuleEditor || activeRuleEditor.mode !== 'advanced' || activeRuleEditor.ruleId === null) {
      return;
    }
    if (inlineAdvancedSaveTimeoutRef.current !== null) {
      window.clearTimeout(inlineAdvancedSaveTimeoutRef.current);
    }
    inlineAdvancedSaveTimeoutRef.current = window.setTimeout(() => {
      inlineAdvancedSaveTimeoutRef.current = null;
      void handleSaveInlineAdvancedEditor();
    }, inlineAdvancedAutosaveDebounceMs);
  };

  const renderRuleScheduleFieldGroup = () => (
    <div data-ui="field" className="topic-rule-plan-field">
      <span data-slot="label">调度计划</span>
      <div className="topic-rule-plan-box">
        <div className="topic-rule-plan-item">
          <div className="rule-frequency-toggle" role="group" aria-label="调度频率">
            <button
              type="button"
              className={`rule-frequency-toggle-button${ruleFormFrequency === 'DAILY' ? ' is-active' : ''}`}
              onClick={() => {
                setRuleFormFrequency('DAILY');
              }}
              aria-pressed={ruleFormFrequency === 'DAILY'}
            >
              按日
            </button>
            <button
              type="button"
              className={`rule-frequency-toggle-button${ruleFormFrequency === 'WEEKLY' ? ' is-active' : ''}`}
              onClick={() => {
                setRuleFormFrequency('WEEKLY');
              }}
              aria-pressed={ruleFormFrequency === 'WEEKLY'}
            >
              按周
            </button>
          </div>
        </div>
        <div className="topic-rule-plan-item topic-rule-schedule-stack">
          <span className="topic-rule-schedule-stack-label">执行时段</span>
          <div className="topic-rule-schedule-inline-controls">
            {ruleFormFrequency === 'WEEKLY' ? (
              <label className="topic-rule-schedule-inline-field">
                <span>星期</span>
                <select
                  data-ui="select"
                  data-size="sm"
                  aria-label="按周执行星期"
                  value={ruleFormWeekday}
                  onChange={(event) => setRuleFormWeekday(toWeekdayValue(event.target.value))}
                >
                  {autoPullWeekdayOptions.map(renderWeekdayOption)}
                </select>
              </label>
            ) : null}
            <label className="topic-rule-schedule-inline-field">
              <span>时间</span>
              <select
                data-ui="select"
                data-size="sm"
                aria-label="按整点执行时间"
                value={normalizedScheduleHourValue}
                onChange={(event) => {
                  setRuleFormHourInput(event.target.value);
                }}
              >
                {autoPullHourOptions.map(renderSelectOption)}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRuleSourceFieldGroup = () => (
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
  );

  const renderRuleInlineEditor = (options?: { showPrimarySettings?: boolean }) => {
    const showPrimarySettings = options?.showPrimarySettings === true;

    return (
      <section className="topic-rule-inline-editor">
        <div className="topic-rule-editor-grid">
          {showPrimarySettings ? (
            <>
              <div className="topic-rule-editor-card topic-rule-editor-card-schedule">
                {renderRuleScheduleFieldGroup()}
              </div>
              <div className="topic-rule-editor-card topic-rule-editor-card-source">
                {renderRuleSourceFieldGroup()}
              </div>
            </>
          ) : null}
          <div className="topic-rule-editor-card topic-rule-editor-card-compact">
            <label data-ui="field" className="topic-rule-card-field">
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
                {autoPullQualityPresetOptions.map(renderSelectOption)}
              </select>
            </label>
          </div>
          <div className="topic-rule-editor-card topic-rule-editor-card-compact">
            <label data-ui="field" className="topic-rule-card-field">
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
          </div>
          <div className="topic-rule-editor-card topic-rule-editor-card-compact">
            <label data-ui="field" className="topic-rule-card-field">
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
          </div>
          <div className="topic-rule-editor-card topic-rule-editor-card-wide">
            <div data-ui="field" className="topic-rule-card-field topic-rule-toggle-field">
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
          </div>
          <div className="topic-rule-editor-card topic-rule-editor-card-wide">
            <div data-ui="field" className="topic-rule-card-field topic-rule-toggle-field">
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
        </div>
        {rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{rulesError}</p> : null}
      </section>
    );
  };

  const renderCompactAdvancedEditor = () => (
    <section className="rule-center-advanced-inline-editor">
      <div className="rule-center-advanced-grid">
        <label data-ui="field" className="rule-center-advanced-field">
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
            onChange={(event) => {
              setRuleFormMinCompletenessInput(event.target.value);
              queueInlineAdvancedSave();
            }}
          >
            {autoPullQualityPresetOptions.map(renderSelectOption)}
          </select>
        </label>
        <label data-ui="field" className="rule-center-advanced-field">
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
            onBlur={() => {
              void handleSaveInlineAdvancedEditor();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }
              event.preventDefault();
              event.currentTarget.blur();
            }}
          />
        </label>
        <label data-ui="field" className="rule-center-advanced-field">
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
            onBlur={() => {
              void handleSaveInlineAdvancedEditor();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') {
                return;
              }
              event.preventDefault();
              event.currentTarget.blur();
            }}
          />
        </label>
        <div data-ui="field" className="rule-center-advanced-field rule-center-advanced-field-wide">
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
          <div className="rule-option-toggle rule-center-advanced-toggle" role="group" aria-label="排序规则">
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormSortMode === 'llm_score' ? ' is-active' : ''}`}
              onClick={() => {
                if (ruleFormSortMode === 'llm_score') {
                  return;
                }
                setRuleFormSortMode('llm_score');
                queueInlineAdvancedSave();
              }}
              aria-pressed={ruleFormSortMode === 'llm_score'}
            >
              大模型打分
            </button>
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormSortMode === 'hybrid_score' ? ' is-active' : ''}`}
              onClick={() => {
                if (ruleFormSortMode === 'hybrid_score') {
                  return;
                }
                setRuleFormSortMode('hybrid_score');
                queueInlineAdvancedSave();
              }}
              aria-pressed={ruleFormSortMode === 'hybrid_score'}
            >
              综合评分
            </button>
          </div>
        </div>
        <div data-ui="field" className="rule-center-advanced-field rule-center-advanced-field-wide">
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
          <div className="rule-option-toggle rule-center-advanced-toggle" role="group" aria-label="解析内容并入库">
            <button
              type="button"
              className={`rule-option-toggle-button${!ruleFormParseAndIngest ? ' is-active' : ''}`}
              onClick={() => {
                if (!ruleFormParseAndIngest) {
                  return;
                }
                setRuleFormParseAndIngest(false);
                queueInlineAdvancedSave();
              }}
              aria-pressed={!ruleFormParseAndIngest}
            >
              关闭
            </button>
            <button
              type="button"
              className={`rule-option-toggle-button${ruleFormParseAndIngest ? ' is-active' : ''}`}
              onClick={() => {
                if (ruleFormParseAndIngest) {
                  return;
                }
                setRuleFormParseAndIngest(true);
                queueInlineAdvancedSave();
              }}
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

  const renderRulePreviewPanel = (rule: AutoPullRule) => (
    <dl className="topic-rule-preview-grid">
      <div className="topic-rule-preview-item">
        <dt>调度计划</dt>
        <dd>{formatRuleScheduleLabel(rule)}</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>来源</dt>
        <dd>{formatRuleSourcesLabel(rule)}</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>质量门槛</dt>
        <dd>{formatRuleQualityLabel(rule)}</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>滑动窗口</dt>
        <dd>{String(rule.time_spec?.lookback_days ?? 30)} 天</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>每次拉取上限</dt>
        <dd>{String(rule.query_spec?.max_results_per_source ?? 20)} 篇 / 来源</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>排序规则</dt>
        <dd>{formatRuleSortModeLabel(rule)}</dd>
      </div>
      <div className="topic-rule-preview-item">
        <dt>解析内容并入库</dt>
        <dd>{formatRuleParseAndIngestLabel(rule)}</dd>
      </div>
    </dl>
  );

  const renderFloatingRuleQuickEditor = () => {
    if (
      !activeRuleEditor
      || (activeRuleEditor.mode !== 'schedule' && activeRuleEditor.mode !== 'source')
      || !activeQuickEditorPosition
      || typeof document === 'undefined'
    ) {
      return null;
    }

    if (activeRuleEditor.mode === 'schedule') {
      return createPortal(
        <div
          ref={activeQuickEditorPopoverRef}
          className="rule-center-cell-popover rule-center-cell-popover-schedule"
          role="dialog"
          aria-label="编辑调度"
        >
          <div className="rule-center-cell-popover-body">
            <div className="rule-frequency-toggle" role="group" aria-label="调度频率">
              <button
                type="button"
                className={`rule-frequency-toggle-button${ruleFormFrequency === 'DAILY' ? ' is-active' : ''}`}
                onClick={() => {
                  setRuleFormFrequency('DAILY');
                }}
                aria-pressed={ruleFormFrequency === 'DAILY'}
              >
                按日
              </button>
              <button
                type="button"
                className={`rule-frequency-toggle-button${ruleFormFrequency === 'WEEKLY' ? ' is-active' : ''}`}
                onClick={() => {
                  setRuleFormFrequency('WEEKLY');
                }}
                aria-pressed={ruleFormFrequency === 'WEEKLY'}
              >
                按周
              </button>
            </div>
            <div className={`rule-center-quick-editor-fields${ruleFormFrequency === 'WEEKLY' ? ' is-weekly' : ''}`}>
              {ruleFormFrequency === 'WEEKLY' ? (
                <label className="rule-center-quick-editor-field">
                  <span>星期</span>
                  <select
                    data-ui="select"
                    data-size="sm"
                    aria-label="按周执行星期"
                    value={ruleFormWeekday}
                    onChange={(event) => setRuleFormWeekday(toWeekdayValue(event.target.value))}
                  >
                    {autoPullWeekdayOptions.map(renderWeekdayOption)}
                  </select>
                </label>
              ) : null}
              <label className="rule-center-quick-editor-field">
                <span>时间</span>
                <select
                  data-ui="select"
                  data-size="sm"
                  aria-label="按整点执行时间"
                  value={normalizedScheduleHourValue}
                  onChange={(event) => {
                    setRuleFormHourInput(event.target.value);
                  }}
                >
                  {autoPullHourOptions.map(renderSelectOption)}
                </select>
              </label>
            </div>
          </div>
          <div data-ui="stack" data-direction="row" data-gap="2" className="rule-center-cell-popover-actions">
            <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleCloseActiveRuleEditor}>
              取消
            </button>
            <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void handleSaveActiveRuleEditor()}>
              保存调度
            </button>
          </div>
        </div>,
        document.body,
      );
    }

    return createPortal(
      <div
        ref={activeQuickEditorPopoverRef}
        className="rule-center-cell-popover rule-center-cell-popover-source"
        role="dialog"
        aria-label="编辑来源"
      >
        <div className="rule-center-cell-popover-body">
          <div className="rule-center-source-options">
            <label className={`rule-center-source-option${ruleSourceCrossref ? ' is-active' : ''}`}>
              <input type="checkbox" checked={ruleSourceCrossref} onChange={(event) => setRuleSourceCrossref(event.target.checked)} />
              <span>CROSSREF</span>
            </label>
            <label className={`rule-center-source-option${ruleSourceArxiv ? ' is-active' : ''}`}>
              <input type="checkbox" checked={ruleSourceArxiv} onChange={(event) => setRuleSourceArxiv(event.target.checked)} />
              <span>ARXIV</span>
            </label>
          </div>
        </div>
        <div data-ui="stack" data-direction="row" data-gap="2" className="rule-center-cell-popover-actions">
          <button data-ui="button" data-variant="ghost" data-size="sm" type="button" onClick={handleCloseActiveRuleEditor}>
            取消
          </button>
          <button data-ui="button" data-variant="primary" data-size="sm" type="button" onClick={() => void handleSaveActiveRuleEditor()}>
            保存来源
          </button>
        </div>
      </div>,
      document.body,
    );
  };

  const renderNewRuleEditor = () => renderRuleInlineEditor({ showPrimarySettings: true });

  return (
    <section className="literature-tab-panel" data-autopull-status={autoPullStatusDigest}>
      <AutoImportTopicSettingsView
        visible={autoImportSubTab === 'topic-settings'}
        controller={controller}
        topicForm={topicForm}
        shared={{
          autoPullRunStatusLabels: shared.autoPullRunStatusLabels,
          formatTimestamp: shared.formatTimestamp,
          resolveRunSortTimestamp: shared.resolveRunSortTimestamp,
          topicYearMaxBound: shared.topicYearMaxBound,
          topicYearMinBound: shared.topicYearMinBound,
        }}
        isTopicRulePreviewOpen={isTopicRulePreviewOpen}
        setIsTopicRulePreviewOpen={setIsTopicRulePreviewOpen}
        activeTopicListRulePreviewTopicId={activeTopicListRulePreviewTopicId}
        setActiveTopicListRulePreviewTopicId={setActiveTopicListRulePreviewTopicId}
        selectedTopicRuleId={selectedTopicRuleId}
        selectedTopicRule={selectedTopicRule}
        renderRulePreviewPanel={renderRulePreviewPanel}
      />
      <AutoImportRuleCenterView
        visible={autoImportSubTab === 'rule-center'}
        controller={controller}
        ruleForm={ruleForm}
        activeTopicRules={activeTopicRules}
        activeRuleEditor={activeRuleEditor}
        handleOpenNewRuleEditor={handleOpenNewRuleEditor}
        handleOpenExistingRuleEditor={handleOpenExistingRuleEditor}
        handleCloseActiveRuleEditor={handleCloseActiveRuleEditor}
        handleSaveActiveRuleEditor={handleSaveActiveRuleEditor}
        renderCompactAdvancedEditor={renderCompactAdvancedEditor}
        renderNewRuleEditor={renderNewRuleEditor}
        renderFloatingRuleQuickEditor={renderFloatingRuleQuickEditor}
        formatRuleScheduleLabel={formatRuleScheduleLabel}
        formatNextActivationLabel={formatNextActivationLabel}
        formatRuleSourcesLabel={formatRuleSourcesLabel}
      />
      <AutoImportRunsAlertsView
        visible={autoImportSubTab === 'runs-alerts'}
        controller={controller}
        runs={props.runs}
        asRecord={asRecord}
      />
    </section>
  );
}
