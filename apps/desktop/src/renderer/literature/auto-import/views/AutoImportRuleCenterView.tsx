import { Fragment, type ReactNode } from 'react';
import type { AutoPullRule } from '../../shared/types';
import type {
  AutoImportControllerOutput,
  AutoImportRuleEditorMode,
  AutoImportRuleEditorState,
  AutoImportRuleFormProps,
} from '../types';

type AutoImportRuleCenterViewProps = {
  visible: boolean;
  controller: AutoImportControllerOutput;
  ruleForm: AutoImportRuleFormProps;
  activeTopicRules: AutoPullRule[];
  activeRuleEditor: AutoImportRuleEditorState | null;
  handleOpenNewRuleEditor: () => void;
  handleOpenExistingRuleEditor: (
    rule: AutoPullRule,
    mode: AutoImportRuleEditorMode,
    anchor?: HTMLElement | null,
  ) => void;
  handleCloseActiveRuleEditor: () => void;
  handleSaveActiveRuleEditor: () => Promise<void>;
  renderCompactAdvancedEditor: () => ReactNode;
  renderNewRuleEditor: () => ReactNode;
  renderFloatingRuleQuickEditor: () => ReactNode;
  formatRuleScheduleLabel: (rule: AutoPullRule) => string;
  formatNextActivationLabel: (rule: AutoPullRule) => string;
  formatRuleSourcesLabel: (rule: AutoPullRule) => string;
};

export function AutoImportRuleCenterView({
  activeRuleEditor,
  activeTopicRules,
  controller,
  formatNextActivationLabel,
  formatRuleScheduleLabel,
  formatRuleSourcesLabel,
  handleCloseActiveRuleEditor,
  handleOpenExistingRuleEditor,
  handleOpenNewRuleEditor,
  handleSaveActiveRuleEditor,
  renderCompactAdvancedEditor,
  renderNewRuleEditor,
  renderFloatingRuleQuickEditor,
  ruleForm,
  visible,
}: AutoImportRuleCenterViewProps) {
  if (!visible) {
    return null;
  }

  return (
    <section className="literature-section-block">
      <div data-ui="toolbar" data-wrap="wrap" className="rule-center-toolbar">
        <button
          data-ui="button"
          data-variant="primary"
          data-size="sm"
          type="button"
          onClick={handleOpenNewRuleEditor}
        >
          新建规则
        </button>
      </div>
      {ruleForm.rulesError ? <p data-ui="text" data-variant="caption" data-tone="danger">{ruleForm.rulesError}</p> : null}
      <div className="rule-center-table-wrap">
        {activeTopicRules.length === 0 ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">暂无启用中的 TOPIC 规则。</p>
        ) : (
          <table className="rule-center-table">
            <thead>
              <tr>
                <th>规则名称</th>
                <th>调度</th>
                <th>下次激活时间</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {activeTopicRules.map((rule) => {
                const isScheduleEditorOpen =
                  !!activeRuleEditor && activeRuleEditor.ruleId === rule.rule_id && activeRuleEditor.mode === 'schedule';
                const isSourceEditorOpen =
                  !!activeRuleEditor && activeRuleEditor.ruleId === rule.rule_id && activeRuleEditor.mode === 'source';
                const isAdvancedEditorOpen =
                  !!activeRuleEditor && activeRuleEditor.ruleId === rule.rule_id && activeRuleEditor.mode === 'advanced';

                return (
                  <Fragment key={rule.rule_id}>
                    <tr>
                      <td>
                        <div className="rule-center-rule-name">
                          <span>{rule.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className={`rule-center-editable-cell${isScheduleEditorOpen ? ' is-open' : ''}`}>
                          <span className="rule-center-editable-value">{formatRuleScheduleLabel(rule)}</span>
                          <button
                            className={`rule-center-edit-icon${isScheduleEditorOpen ? ' is-active' : ''}`}
                            type="button"
                            aria-label={isScheduleEditorOpen ? '收起调度编辑' : '编辑调度'}
                            aria-pressed={isScheduleEditorOpen}
                            onClick={(event) => handleOpenExistingRuleEditor(rule, 'schedule', event.currentTarget)}
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M11.8 1.8a1.5 1.5 0 0 1 2.1 2.1l-7 7-.1.1-3 1a.5.5 0 0 1-.6-.6l1-3 .1-.1zM10.4 3.2 5 8.6l-.6 1.7 1.7-.6 5.4-5.4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="rule-center-next-activation">{formatNextActivationLabel(rule)}</span>
                      </td>
                      <td>
                        <div className={`rule-center-editable-cell${isSourceEditorOpen ? ' is-open' : ''}`}>
                          <span className="rule-center-editable-value">{formatRuleSourcesLabel(rule)}</span>
                          <button
                            className={`rule-center-edit-icon${isSourceEditorOpen ? ' is-active' : ''}`}
                            type="button"
                            aria-label={isSourceEditorOpen ? '收起来源编辑' : '编辑来源'}
                            aria-pressed={isSourceEditorOpen}
                            onClick={(event) => handleOpenExistingRuleEditor(rule, 'source', event.currentTarget)}
                          >
                            <svg viewBox="0 0 16 16" aria-hidden="true">
                              <path d="M11.8 1.8a1.5 1.5 0 0 1 2.1 2.1l-7 7-.1.1-3 1a.5.5 0 0 1-.6-.6l1-3 .1-.1zM10.4 3.2 5 8.6l-.6 1.7 1.7-.6 5.4-5.4z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div data-ui="stack" data-direction="row" data-gap="2" className="rule-center-actions">
                          <button
                            data-ui="button"
                            data-variant="ghost"
                            data-size="sm"
                            type="button"
                            onClick={() => handleOpenExistingRuleEditor(rule, 'advanced')}
                          >
                            高级设置
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
                              void controller.handleDeleteRule(rule);
                            }}
                          >
                            移除规则
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isAdvancedEditorOpen ? (
                      <tr className="rule-center-inline-editor-row">
                        <td colSpan={5}>
                          <section className="rule-center-inline-editor-panel">
                            {renderCompactAdvancedEditor()}
                          </section>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {renderFloatingRuleQuickEditor()}

      {activeRuleEditor?.mode === 'advanced' && activeRuleEditor.ruleId === null ? (
        <section className="topic-rule-binding-column rule-center-editor-block">
          <div className="topic-rule-binding-header-row">
            <h4 className="topic-modal-section-title">
              {activeRuleEditor.ruleId ? '高级设置' : '新建规则'}
            </h4>
            <div className="topic-rule-header-actions" data-ui="stack" data-direction="row" data-gap="1">
              <button
                data-ui="button"
                data-variant="ghost"
                data-size="sm"
                type="button"
                className="topic-rule-header-action"
                onClick={handleCloseActiveRuleEditor}
              >
                取消
              </button>
              <button
                data-ui="button"
                data-variant="primary"
                data-size="sm"
                type="button"
                onClick={() => void handleSaveActiveRuleEditor()}
              >
                {activeRuleEditor.ruleId ? '保存设置' : '保存规则'}
              </button>
            </div>
          </div>
          <p data-ui="text" data-variant="caption" data-tone="muted" className="rule-center-editor-description">
            {activeRuleEditor.name}
          </p>
          <div className="topic-rule-binding-card">
            {renderNewRuleEditor()}
          </div>
        </section>
      ) : null}
    </section>
  );
}
