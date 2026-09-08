import { useState } from 'react';
import { ReviewerCard, ReviewerCardEmpty } from './ReviewerCard';
import type {
  TopicSelectionTopicPackageRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';

type TopicPackageCardProps = {
  topicPackages: TopicSelectionTopicPackageRecord[];
};

function readinessTone(status: string): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  if (status === 'ready_for_promotion_review') return 'success';
  if (status === 'blocked' || status === 'needs_recheck') return 'warning';
  return 'info';
}

/**
 * v1b TopicPackage(draft) surface — Phase 3.1 read-only view.
 *
 * Lists package drafts produced by the v1b harness. v1b's success outlet is
 * now published by the harness-native N11 path rather than this card.
 */
export function TopicPackageCard({ topicPackages }: TopicPackageCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    topicPackages[0]?.topic_package_id ?? null,
  );
  const active = topicPackages.find((item) => item.topic_package_id === selectedId)
    ?? topicPackages[0]
    ?? null;

  if (!active) {
    return (
      <article data-ui="card">
        <div data-ui="stack" data-direction="col" data-gap="2">
          <p data-ui="text" data-variant="label" data-tone="primary">TopicPackage(draft)</p>
          <p data-ui="text" data-variant="caption" data-tone="muted">
            尚未形成选题方案草案；请先完成研究价值评估与处置。
          </p>
        </div>
      </article>
    );
  }

  const packageSelector = topicPackages.length > 1 ? (
    <select
      data-ui="select"
      data-size="sm"
      value={active.topic_package_id}
      onChange={(event) => setSelectedId(event.target.value)}
    >
      {topicPackages.map((item) => (
        <option key={item.topic_package_id} value={item.topic_package_id}>
          {item.package_version} · {item.package_readiness_status}
        </option>
      ))}
    </select>
  ) : null;

  return (
    <ReviewerCard
      kind="TopicPackage(draft)"
      subjectId={active.topic_package_id}
      status={{ label: active.package_readiness_status, tone: readinessTone(active.package_readiness_status) }}
      chips={[
        { label: `version ${active.package_version}`, tone: 'info' },
        { label: `titles ${active.title_candidates.length}`, tone: 'neutral' },
        { label: `methods ${active.candidate_methods.length}`, tone: 'neutral' },
        ...(topicPackages.length > 1 ? [{ label: `history ${topicPackages.length}`, tone: 'neutral' as const }] : []),
      ]}
      verdict={
        <div data-ui="stack" data-direction="col" data-gap="1">
          {active.title_candidates.length > 0 ? (
            <p data-ui="text" data-variant="body" data-tone="primary">
              title 候选：{active.title_candidates[0]}
            </p>
          ) : (
            <p data-ui="text" data-variant="body" data-tone="muted">— 无 title_candidates —</p>
          )}
          <p data-ui="text" data-variant="caption" data-tone="muted">contribution: {active.contribution_summary || '—'}</p>
          {packageSelector ? (
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center">
              <span data-ui="text" data-variant="caption" data-tone="muted">切换 package version</span>
              {packageSelector}
            </div>
          ) : null}
        </div>
      }
      support={
        active.candidate_methods.length === 0 && active.selected_literature_evidence_ids.length === 0 ? (
          <ReviewerCardEmpty label="尚无 candidate_methods / selected_literature_evidence。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {active.candidate_methods.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="primary">
                candidate_methods（{active.candidate_methods.length}）
              </p>
            ) : null}
            <p data-ui="text" data-variant="caption" data-tone="muted">
              evidence_refs {active.evidence_refs.length} · selected_literature_evidence {active.selected_literature_evidence_ids.length} · validated_need_refs {active.validated_need_refs.length}
            </p>
            {active.evaluation_plan ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">evaluation_plan: {active.evaluation_plan}</p>
            ) : null}
          </div>
        )
      }
      challenge={
        active.key_risks.length === 0 ? (
          <ReviewerCardEmpty label="无声明的 key_risks。" />
        ) : (
          <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
            {active.key_risks.map((risk, idx) => (
              <span key={`${risk}-${idx}`} data-ui="badge" data-variant="subtle" data-tone="warning">{risk}</span>
            ))}
          </div>
        )
      }
      blockers={
        active.blocker_refs.length === 0
          && active.recheck_request_refs.length === 0
          && active.accepted_risk_refs.length === 0 ? (
          <ReviewerCardEmpty label="无 blocker / recheck / accepted risk refs。" />
        ) : (
          <div data-ui="stack" data-direction="col" data-gap="1">
            {active.blocker_refs.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">blocker_refs：{active.blocker_refs.length}</p>
            ) : null}
            {active.recheck_request_refs.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">recheck_request_refs：{active.recheck_request_refs.length}</p>
            ) : null}
            {active.accepted_risk_refs.length > 0 ? (
              <p data-ui="text" data-variant="caption" data-tone="muted">accepted_risk_refs：{active.accepted_risk_refs.length}</p>
            ) : null}
          </div>
        )
      }
      nextActions={
        <div data-ui="stack" data-direction="col" data-gap="2">
          {active.package_readiness_status === 'ready_for_promotion_review' ? (
            <p data-ui="text" data-variant="caption" data-tone="primary">
              → 已 ready_for_promotion_review。
            </p>
          ) : (
            <p data-ui="text" data-variant="caption" data-tone="muted">
              package_readiness_status={active.package_readiness_status}
            </p>
          )}
        </div>
      }
      footer={`research_record=${active.research_record_id}`}
    />
  );
}
