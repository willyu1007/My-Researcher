import type { TitleCardPrimaryTabKey } from '../../literature/shared/types';
import type { TitleCardManagementController } from './types';
import { toJson } from './utils';

type TitleCardWorkflowViewProps = {
  controller: TitleCardManagementController;
  activePrimaryTab: Exclude<TitleCardPrimaryTabKey, 'overview'>;
  activeSecondaryTab: string | null;
  onSelectSecondaryTab: (tab: Exclude<TitleCardPrimaryTabKey, 'overview'>, subTab: string) => void;
};

export function TitleCardWorkflowView({
  controller,
  activePrimaryTab,
  activeSecondaryTab,
  onSelectSecondaryTab,
}: TitleCardWorkflowViewProps) {
  const {
    titleCardDetail,
    evidenceKeyword,
    evidenceCandidates,
    selectedEvidenceId,
    basket,
    selectedEvidence,
    needs,
    selectedNeedId,
    needForm,
    selectedNeed,
    questions,
    selectedQuestionId,
    questionForm,
    selectedQuestion,
    values,
    selectedValueId,
    valueForm,
    selectedValue,
    packages,
    selectedPackageId,
    packageForm,
    selectedPackage,
    decisions,
    selectedDecisionId,
    decisionForm,
    promotionTitle,
    selectedDecision,
    setEvidenceKeyword,
    setSelectedEvidenceId,
    setSelectedNeedId,
    setNeedForm,
    setSelectedQuestionId,
    setQuestionForm,
    setSelectedValueId,
    setValueForm,
    setSelectedPackageId,
    setPackageForm,
    setSelectedDecisionId,
    setDecisionForm,
    setPromotionTitle,
    refreshEvidenceCandidates,
    toggleEvidenceSelection,
    submitNeed,
    submitQuestion,
    submitValue,
    submitPackage,
    submitDecision,
    promoteToPaper,
  } = controller;

  if (!titleCardDetail) {
    return null;
  }

  return (
    <div data-ui="stack" data-direction="col" data-gap="3">
      <article data-ui="card">
        <div data-ui="toolbar" data-align="between" data-wrap="wrap">
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="h3" data-tone="primary">{titleCardDetail.working_title}</p>
            <p data-ui="text" data-variant="body" data-tone="muted">{titleCardDetail.brief}</p>
          </div>
          <div data-ui="stack" data-direction="row" data-gap="2" data-wrap="wrap" data-align="center">
            <span data-ui="badge" data-variant="subtle" data-tone="neutral">状态：{titleCardDetail.status}</span>
            {titleCardDetail.latest_paper_id ? (
              <span data-ui="badge" data-variant="subtle" data-tone="neutral">Paper: {titleCardDetail.latest_paper_id}</span>
            ) : null}
          </div>
        </div>
      </article>

      {activePrimaryTab === 'evidence' && activeSecondaryTab === 'candidates' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <div data-ui="toolbar" data-wrap="wrap">
                <input
                  data-ui="input"
                  value={evidenceKeyword}
                  onChange={(event) => setEvidenceKeyword(event.target.value)}
                  placeholder="关键词过滤"
                />
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => void refreshEvidenceCandidates()}>
                  搜索候选
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('evidence', 'inspector')}>
                  打开检查器
                </button>
              </div>
              <p data-ui="text" data-variant="label" data-tone="muted">Evidence Candidates</p>
              {evidenceCandidates.map((item) => (
                <div key={item.literature_id} data-ui="stack" data-direction="col" data-gap="1">
                  <button
                    data-ui="button"
                    data-variant={selectedEvidenceId === item.literature_id ? 'primary' : 'secondary'}
                    type="button"
                    onClick={() => setSelectedEvidenceId(item.literature_id)}
                  >
                    {item.title}
                  </button>
                  <button
                    data-ui="button"
                    data-variant="secondary"
                    type="button"
                    onClick={() => void toggleEvidenceSelection(item.literature_id, item.selection_state === 'selected')}
                  >
                    {item.selection_state === 'selected' ? '移出篮子' : '加入篮子'}
                  </button>
                </div>
              ))}
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">当前选中候选</p>
              {selectedEvidence ? (
                <pre>{toJson(selectedEvidence)}</pre>
              ) : (
                <p data-ui="text" data-variant="caption" data-tone="muted">选择一条候选证据后，可切到检查器查看详情。</p>
              )}
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'evidence' && activeSecondaryTab === 'basket' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">证据篮</p>
            {basket?.items.length ? basket.items.map((item) => (
              <div key={item.literature_id} data-ui="stack" data-direction="col" data-gap="1">
                <button
                  data-ui="button"
                  data-variant={selectedEvidenceId === item.literature_id ? 'primary' : 'secondary'}
                  type="button"
                  onClick={() => setSelectedEvidenceId(item.literature_id)}
                >
                  {item.title}
                </button>
                <div data-ui="toolbar" data-wrap="wrap">
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('evidence', 'inspector')}>
                    查看检查器
                  </button>
                  <button data-ui="button" data-variant="secondary" type="button" onClick={() => void toggleEvidenceSelection(item.literature_id, true)}>
                    移出篮子
                  </button>
                </div>
              </div>
            )) : (
              <p data-ui="text" data-variant="caption" data-tone="muted">当前题目卡还没有加入证据。</p>
            )}
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'evidence' && activeSecondaryTab === 'inspector' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">证据检查器</p>
            {selectedEvidence ? (
              <>
                <p data-ui="text" data-variant="body" data-tone="primary">{selectedEvidence.title}</p>
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  {selectedEvidence.authors.join(', ') || '--'} · {selectedEvidence.year ?? '--'} · {selectedEvidence.provider ?? '--'}
                </p>
                <p data-ui="text" data-variant="caption" data-tone="muted">
                  rights={selectedEvidence.rights_class} · pipeline={selectedEvidence.pipeline_ready ? 'ready' : 'not_ready'}
                </p>
                <pre>{toJson(selectedEvidence)}</pre>
              </>
            ) : (
              <p data-ui="text" data-variant="caption" data-tone="muted">请先在候选证据或证据篮中选择一条证据。</p>
            )}
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'need' && activeSecondaryTab === 'list' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">Need 列表</p>
            {needs.map((item) => (
              <button
                key={item.need_id}
                data-ui="button"
                data-variant={selectedNeedId === item.need_id ? 'primary' : 'secondary'}
                type="button"
                onClick={() => {
                  setSelectedNeedId(item.need_id);
                  onSelectSecondaryTab('need', 'editor');
                }}
              >
                {item.need_statement}
              </button>
            ))}
            <button
              data-ui="button"
              data-variant="secondary"
              type="button"
              onClick={() => {
                setSelectedNeedId(null);
                onSelectSecondaryTab('need', 'editor');
              }}
            >
              新建 Need
            </button>
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'need' && activeSecondaryTab === 'editor' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Need 表单 / 检查器</p>
              <textarea data-ui="textarea" rows={3} value={needForm.needStatement} onChange={(event) => setNeedForm((current) => ({ ...current, needStatement: event.target.value }))} placeholder="Need statement" />
              <input data-ui="input" value={needForm.whoNeedsIt} onChange={(event) => setNeedForm((current) => ({ ...current, whoNeedsIt: event.target.value }))} placeholder="Who needs it" />
              <textarea data-ui="textarea" rows={2} value={needForm.scenario} onChange={(event) => setNeedForm((current) => ({ ...current, scenario: event.target.value }))} placeholder="Scenario" />
              <textarea data-ui="textarea" rows={3} value={needForm.literatureIdsText} onChange={(event) => setNeedForm((current) => ({ ...current, literatureIdsText: event.target.value }))} placeholder="每行一个 literature_id" />
              <textarea data-ui="textarea" rows={2} value={needForm.judgementSummary} onChange={(event) => setNeedForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
              <div data-ui="toolbar" data-wrap="wrap">
                <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitNeed()}>
                  {selectedNeed ? 'PATCH 当前 Need' : '创建 Need'}
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('need', 'list')}>
                  返回列表
                </button>
              </div>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
              <pre>{toJson(selectedNeed)}</pre>
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'research-question' && activeSecondaryTab === 'list' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">Research Question 列表</p>
            {questions.map((item) => (
              <button
                key={item.research_question_id}
                data-ui="button"
                data-variant={selectedQuestionId === item.research_question_id ? 'primary' : 'secondary'}
                type="button"
                onClick={() => {
                  setSelectedQuestionId(item.research_question_id);
                  onSelectSecondaryTab('research-question', 'editor');
                }}
              >
                {item.main_question}
              </button>
            ))}
            <button
              data-ui="button"
              data-variant="secondary"
              type="button"
              onClick={() => {
                setSelectedQuestionId(null);
                onSelectSecondaryTab('research-question', 'editor');
              }}
            >
              新建 Research Question
            </button>
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'research-question' && activeSecondaryTab === 'editor' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Research Question 表单 / 检查器</p>
              <textarea data-ui="textarea" rows={3} value={questionForm.mainQuestion} onChange={(event) => setQuestionForm((current) => ({ ...current, mainQuestion: event.target.value }))} placeholder="Main question" />
              <input data-ui="input" value={questionForm.researchSlice} onChange={(event) => setQuestionForm((current) => ({ ...current, researchSlice: event.target.value }))} placeholder="Research slice" />
              <textarea data-ui="textarea" rows={2} value={questionForm.sourceNeedIdsText} onChange={(event) => setQuestionForm((current) => ({ ...current, sourceNeedIdsText: event.target.value }))} placeholder="每行一个 source_need_id" />
              <textarea data-ui="textarea" rows={2} value={questionForm.sourceLiteratureEvidenceIdsText} onChange={(event) => setQuestionForm((current) => ({ ...current, sourceLiteratureEvidenceIdsText: event.target.value }))} placeholder="每行一个 source_literature_evidence_id（即已选 literature_id）" />
              <textarea data-ui="textarea" rows={2} value={questionForm.judgementSummary} onChange={(event) => setQuestionForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
              <div data-ui="toolbar" data-wrap="wrap">
                <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitQuestion()}>
                  {selectedQuestion ? 'PATCH 当前 Research Question' : '创建 Research Question'}
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('research-question', 'list')}>
                  返回列表
                </button>
              </div>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
              <pre>{toJson(selectedQuestion)}</pre>
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'value' && activeSecondaryTab === 'list' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">Value 列表</p>
            {values.map((item) => (
              <button
                key={item.value_assessment_id}
                data-ui="button"
                data-variant={selectedValueId === item.value_assessment_id ? 'primary' : 'secondary'}
                type="button"
                onClick={() => {
                  setSelectedValueId(item.value_assessment_id);
                  onSelectSecondaryTab('value', 'editor');
                }}
              >
                {item.strongest_claim_if_success}
              </button>
            ))}
            <button
              data-ui="button"
              data-variant="secondary"
              type="button"
              onClick={() => {
                setSelectedValueId(null);
                onSelectSecondaryTab('value', 'editor');
              }}
            >
              新建 Value
            </button>
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'value' && activeSecondaryTab === 'editor' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Value 表单 / 检查器</p>
              <input data-ui="input" value={valueForm.researchQuestionId} onChange={(event) => setValueForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
              <textarea data-ui="textarea" rows={3} value={valueForm.strongestClaimIfSuccess} onChange={(event) => setValueForm((current) => ({ ...current, strongestClaimIfSuccess: event.target.value }))} placeholder="Strongest claim if success" />
              <textarea data-ui="textarea" rows={2} value={valueForm.judgementSummary} onChange={(event) => setValueForm((current) => ({ ...current, judgementSummary: event.target.value }))} placeholder="Judgement summary" />
              <textarea data-ui="textarea" rows={6} value={valueForm.hardGatesJson} onChange={(event) => setValueForm((current) => ({ ...current, hardGatesJson: event.target.value }))} placeholder="hard_gates JSON" />
              <textarea data-ui="textarea" rows={6} value={valueForm.scoredDimensionsJson} onChange={(event) => setValueForm((current) => ({ ...current, scoredDimensionsJson: event.target.value }))} placeholder="scored_dimensions JSON" />
              <textarea data-ui="textarea" rows={5} value={valueForm.riskPenaltyJson} onChange={(event) => setValueForm((current) => ({ ...current, riskPenaltyJson: event.target.value }))} placeholder="risk_penalty JSON" />
              <div data-ui="toolbar" data-wrap="wrap">
                <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitValue()}>
                  {selectedValue ? 'PATCH 当前 Value' : '创建 Value'}
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('value', 'list')}>
                  返回列表
                </button>
              </div>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
              <pre>{toJson(selectedValue)}</pre>
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'package' && activeSecondaryTab === 'list' ? (
        <article data-ui="card">
          <div data-ui="stack" data-direction="col" data-gap="2">
            <p data-ui="text" data-variant="label" data-tone="primary">Package 列表</p>
            {packages.map((item) => (
              <button
                key={item.package_id}
                data-ui="button"
                data-variant={selectedPackageId === item.package_id ? 'primary' : 'secondary'}
                type="button"
                onClick={() => {
                  setSelectedPackageId(item.package_id);
                  onSelectSecondaryTab('package', 'editor');
                }}
              >
                {item.title_candidates[0] ?? item.package_id}
              </button>
            ))}
            <button
              data-ui="button"
              data-variant="secondary"
              type="button"
              onClick={() => {
                setSelectedPackageId(null);
                onSelectSecondaryTab('package', 'editor');
              }}
            >
              新建 Package
            </button>
          </div>
        </article>
      ) : null}

      {activePrimaryTab === 'package' && activeSecondaryTab === 'editor' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Package 表单 / 检查器</p>
              <input data-ui="input" value={packageForm.researchQuestionId} onChange={(event) => setPackageForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
              <input data-ui="input" value={packageForm.valueAssessmentId} onChange={(event) => setPackageForm((current) => ({ ...current, valueAssessmentId: event.target.value }))} placeholder="value_assessment_id" />
              <textarea data-ui="textarea" rows={3} value={packageForm.titleCandidatesText} onChange={(event) => setPackageForm((current) => ({ ...current, titleCandidatesText: event.target.value }))} placeholder="每行一个 title candidate" />
              <textarea data-ui="textarea" rows={3} value={packageForm.researchBackground} onChange={(event) => setPackageForm((current) => ({ ...current, researchBackground: event.target.value }))} placeholder="Research background" />
              <textarea data-ui="textarea" rows={2} value={packageForm.contributionSummary} onChange={(event) => setPackageForm((current) => ({ ...current, contributionSummary: event.target.value }))} placeholder="Contribution summary" />
              <textarea data-ui="textarea" rows={3} value={packageForm.selectedLiteratureIdsText} onChange={(event) => setPackageForm((current) => ({ ...current, selectedLiteratureIdsText: event.target.value }))} placeholder="每行一个 selected_literature_evidence_id" />
              <div data-ui="toolbar" data-wrap="wrap">
                <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitPackage()}>
                  {selectedPackage ? 'PATCH 当前 Package' : '创建 Package'}
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('package', 'list')}>
                  返回列表
                </button>
              </div>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="muted">当前记录</p>
              <pre>{toJson(selectedPackage)}</pre>
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'promotion' && activeSecondaryTab === 'decision' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Promotion 决策列表</p>
              {decisions.map((item) => (
                <button
                  key={item.decision_id}
                  data-ui="button"
                  data-variant={selectedDecisionId === item.decision_id ? 'primary' : 'secondary'}
                  type="button"
                  onClick={() => setSelectedDecisionId(item.decision_id)}
                >
                  {item.decision} · {item.target_paper_title ?? item.reason_summary}
                </button>
              ))}
              <button data-ui="button" data-variant="secondary" type="button" onClick={() => setSelectedDecisionId(null)}>
                新建 Decision
              </button>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">Promotion 表单 / 检查器</p>
              <input data-ui="input" value={decisionForm.researchQuestionId} onChange={(event) => setDecisionForm((current) => ({ ...current, researchQuestionId: event.target.value }))} placeholder="research_question_id" />
              <input data-ui="input" value={decisionForm.valueAssessmentId} onChange={(event) => setDecisionForm((current) => ({ ...current, valueAssessmentId: event.target.value }))} placeholder="value_assessment_id" />
              <input data-ui="input" value={decisionForm.packageId} onChange={(event) => setDecisionForm((current) => ({ ...current, packageId: event.target.value }))} placeholder="package_id" />
              <textarea data-ui="textarea" rows={3} value={decisionForm.reasonSummary} onChange={(event) => setDecisionForm((current) => ({ ...current, reasonSummary: event.target.value }))} placeholder="Reason summary" />
              <input data-ui="input" value={decisionForm.targetPaperTitle} onChange={(event) => setDecisionForm((current) => ({ ...current, targetPaperTitle: event.target.value }))} placeholder="Target paper title" />
              <div data-ui="toolbar" data-wrap="wrap">
                <button data-ui="button" data-variant="primary" type="button" onClick={() => void submitDecision()}>
                  {selectedDecision ? 'PATCH 当前 Decision' : '创建 Decision'}
                </button>
                <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('promotion', 'promotion')}>
                  进入晋升
                </button>
              </div>
              <pre>{toJson(selectedDecision)}</pre>
            </div>
          </article>
        </div>
      ) : null}

      {activePrimaryTab === 'promotion' && activeSecondaryTab === 'promotion' ? (
        <div data-ui="grid" data-cols="2" data-gap="3">
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="primary">直接晋升为 paper-project</p>
              <input data-ui="input" value={promotionTitle} onChange={(event) => setPromotionTitle(event.target.value)} placeholder="晋升后的 paper title" />
              <button data-ui="button" data-variant="primary" type="button" onClick={() => void promoteToPaper()}>
                直接晋升为 paper-project
              </button>
              <button data-ui="button" data-variant="secondary" type="button" onClick={() => onSelectSecondaryTab('promotion', 'decision')}>
                返回决策
              </button>
            </div>
          </article>
          <article data-ui="card">
            <div data-ui="stack" data-direction="col" data-gap="2">
              <p data-ui="text" data-variant="label" data-tone="muted">当前决策</p>
              <pre>{toJson(selectedDecision)}</pre>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}
