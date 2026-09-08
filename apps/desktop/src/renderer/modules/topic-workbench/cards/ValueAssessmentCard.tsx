import { useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionTopicValueAssessmentRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-value-assessment-contracts';

type ValueAssessmentCardProps = {
  valueAssessments: TopicSelectionTopicValueAssessmentRecord[];
};

function readinessTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'ready_for_disposition') return 'success';
  if (status === 'blocked' || status === 'needs_refinement') return 'warning';
  return 'info';
}

function freshnessTone(freshness: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (freshness === 'current') return 'success';
  if (freshness === 'recheck_required' || freshness === 'stale') return 'warning';
  return 'neutral';
}

/**
 * v1b TopicValueAssessment surface — Phase 3.1 read-only view.
 *
 * Lists value assessments with hard_gates, dimension scores, and verdict
 * context. Write actions are owned by the harness-native v1b path.
 */
export function ValueAssessmentCard({ valueAssessments }: ValueAssessmentCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    valueAssessments[0]?.topic_value_assessment_id ?? null,
  );
  const active = valueAssessments.find((item) => item.topic_value_assessment_id === selectedId)
    ?? valueAssessments[0]
    ?? null;

  if (!active) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">TopicValueAssessment</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            尚未形成研究价值评估；请先完成人工研究问题审阅。
          </p>
        </div>
      </article>
    );
  }

  const failedGates = active.hard_gates.filter((gate) => gate.verdict === 'fail');
  const passedGates = active.hard_gates.filter((gate) => gate.verdict === 'pass');
  const setSelector = valueAssessments.length > 1 ? (
    <select
      data-ui="select"
      data-size="sm"
      value={active.topic_value_assessment_id}
      onChange={(event) => setSelectedId(event.target.value)}
    >
      {valueAssessments.map((item) => (
        <option key={item.topic_value_assessment_id} value={item.topic_value_assessment_id}>
          {item.topic_value_assessment_id} · {item.legacy_verdict} · {item.readiness_status}
        </option>
      ))}
    </select>
  ) : null;

  return (
    <ReviewerCard
      kind="TopicValueAssessment"
      subjectId={active.topic_value_assessment_id}
      status={{ label: active.readiness_status, tone: readinessTone(active.readiness_status) }}
      chips={[
        { label: `verdict ${active.legacy_verdict}`, tone: active.legacy_verdict === 'promote' ? 'success' : 'info' },
        { label: `freshness ${active.freshness_status}`, tone: freshnessTone(active.freshness_status) },
        { label: `score ${active.total_score.toFixed(1)}`, tone: 'info' },
        { label: `confidence ${active.confidence.toFixed(2)}`, tone: 'neutral' },
        ...(valueAssessments.length > 1 ? [{ label: `history ${valueAssessments.length}`, tone: 'neutral' as const }] : []),
      ]}
      confidenceHint={`confidence=${active.confidence.toFixed(2)}（仅参考，不可作为单独通过依据）`}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="body" data-tone="primary">
            strongest claim：{active.strongest_claim_if_success}
          </p>
          {active.fallback_claim_if_success ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              fallback：{active.fallback_claim_if_success}
            </p>
          ) : null}
          <p data-ui="text" data-variant="caption" data-tone="muted">{active.value_summary}</p>
          {setSelector ? (
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
              <span data-ui="text" data-variant="caption" data-tone="muted">切换 assessment</span>
              {setSelector}
            </div>
          ) : null}
        </div>
      }
      support={
        active.dimension_scores.length === 0 ? (
          <ReviewerCardEmpty label="无 dimension_scores。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="caption" data-tone="primary">
              dimension_scores（{active.dimension_scores.length}） · passed gates {passedGates.length}/{active.hard_gates.length}
            </p>
            <p data-ui="text" data-variant="caption" data-tone="muted">
              ceiling: {active.ceiling_case} · base: {active.base_case} · floor: {active.floor_case}
            </p>
          </div>
        )
      }
      challenge={
        failedGates.length === 0 && active.reviewer_objections.length === 0 ? (
          <ReviewerCardEmpty label="未发现 failed hard gate / reviewer objection。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {failedGates.length > 0 ? (
              <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
                {failedGates.map((gate, idx) => (
                  <span key={`${gate.gate_key}-${idx}`} data-ui="badge" data-variant="subtle" data-tone="danger">
                    fail · {gate.gate_key}
                  </span>
                ))}
              </div>
            ) : null}
            {active.reviewer_objections.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                reviewer_objections：{active.reviewer_objections.length}
              </p>
            ) : null}
          </div>
        )
      }
      blockers={
        active.blocker_refs.length === 0 && active.accepted_risk_refs.length === 0 ? (
          <ReviewerCardEmpty label="无 blocker / accepted risk refs。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {active.blocker_refs.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                blocker_refs：{active.blocker_refs.length}
              </p>
            ) : null}
            {active.accepted_risk_refs.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                accepted_risk_refs：{active.accepted_risk_refs.length}
              </p>
            ) : null}
            {active.risk_notes.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">
                risk_notes: {active.risk_notes.join(' · ')}
              </p>
            ) : null}
          </div>
        )
      }
      nextActions={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {active.active_disposition_decision_id ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">
              → 已有 disposition decision：{active.active_disposition_decision_id}
            </p>
          ) : (
            <ReviewerCardEmpty label="等待研究价值评估形成下一步处置。" />
          )}
        </div>
      }
      footer={`assess_run=${active.assess_topic_value_run_id}`}
    />
  );
}
