import { useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionTopicQuestionCandidateSetRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';

type QuestionCandidateSetCardProps = {
  candidateSets: TopicSelectionTopicQuestionCandidateSetRecord[];
};

function statusTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'closed' || status === 'selected') return 'success';
  if (status === 'pending_human_review') return 'warning';
  return 'info';
}

/**
 * v1b TopicQuestionCandidateSet surface — Phase 3.1 read-only view.
 *
 * Lists candidate sets produced by `FormTopicQuestion` runs. Selection
 * decisions / materialization are owned by the harness-native v1b path.
 */
export function QuestionCandidateSetCard({ candidateSets }: QuestionCandidateSetCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    candidateSets[0]?.topic_question_candidate_set_id ?? null,
  );
  const active = candidateSets.find((item) => item.topic_question_candidate_set_id === selectedId)
    ?? candidateSets[0]
    ?? null;

  if (!active) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">TopicQuestionCandidateSet</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            尚未生成候选研究问题；请先选择研究切片。
          </p>
        </div>
      </article>
    );
  }

  const setSelector = candidateSets.length > 1 ? (
    <select
      data-ui="select"
      data-size="sm"
      value={active.topic_question_candidate_set_id}
      onChange={(event) => setSelectedId(event.target.value)}
    >
      {candidateSets.map((item) => (
        <option key={item.topic_question_candidate_set_id} value={item.topic_question_candidate_set_id}>
          {item.topic_question_candidate_set_id} · {item.status}
        </option>
      ))}
    </select>
  ) : null;

  return (
    <ReviewerCard
      kind="TopicQuestionCandidateSet"
      subjectId={active.topic_question_candidate_set_id}
      status={{ label: active.status, tone: statusTone(active.status) }}
      chips={[
        { label: `candidates ${active.candidate_count}`, tone: 'info' },
        { label: `recommended ${active.recommended_candidate_ids.length}`, tone: 'info' },
        { label: `slice ${active.research_slice_id}`, tone: 'neutral' },
        ...(candidateSets.length > 1 ? [{ label: `history ${candidateSets.length}`, tone: 'neutral' as const }] : []),
      ]}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          <p data-ui="text" data-variant="body" data-tone="primary">
            基于 research_slice_version={active.research_slice_version} 生成 {active.candidate_count} 个 TopicQuestion candidate
          </p>
          {setSelector ? (
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
              <span data-ui="text" data-variant="caption" data-tone="muted">切换 candidate set</span>
              {setSelector}
            </div>
          ) : null}
        </div>
      }
      support={
        active.recommended_candidate_ids.length === 0 ? (
          <ReviewerCardEmpty label="无推荐 candidate。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            <p data-ui="text" data-variant="caption" data-tone="primary">
              recommended_candidate_ids（{active.recommended_candidate_ids.length}）
            </p>
            <ul data-ui="stack" data-direction="col" data-gap="0">
              {active.recommended_candidate_ids.slice(0, 4).map((id) => (
                <li key={id}>
                  <p data-ui="text" data-variant="caption" data-tone="muted">· {id}</p>
                </li>
              ))}
            </ul>
          </div>
        )
      }
      challenge={
        active.hard_blockers.length === 0 ? (
          <ReviewerCardEmpty label="无 hard_blockers。" />
        ) : (
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
            {active.hard_blockers.map((code) => (
              <span key={code} data-ui="badge" data-variant="subtle" data-tone="danger">{code}</span>
            ))}
          </div>
        )
      }
      blockers={
        active.human_review_triggers.length === 0 ? (
          <ReviewerCardEmpty label="无 human_review_triggers。" />
        ) : (
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
            {active.human_review_triggers.map((trigger) => (
              <span key={trigger} data-ui="badge" data-variant="subtle" data-tone="warning">{trigger}</span>
            ))}
          </div>
        )
      }
      nextActions={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {active.generation_notes.length > 0 ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              generation_notes: {active.generation_notes.join(' · ')}
            </p>
          ) : (
            <ReviewerCardEmpty label="等待所选研究问题形成可审阅的研究契约。" />
          )}
        </div>
      }
      footer={`created_at=${active.created_at} · updated_at=${active.updated_at}`}
    />
  );
}
