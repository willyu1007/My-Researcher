import type { ReactNode } from 'react';

/**
 * Reviewer card — the canonical 5-section template enforced by
 * `docs/context/ui/topic-workbench.md`.
 *
 * Every human-confirmed / high-risk agent-actionable / escalated review
 * surface MUST render through this component so reviewer cards cannot
 * degrade into a single confirm button.
 *
 * The 5 sections:
 * 1. 结论 (verdict)        — what is being claimed/decided
 * 2. 证据 (support)         — supporting evidence + count badges
 * 3. 反证 (challenge)       — counter-evidence / unresolved objections
 * 4. 阻断与风险 (blockers)  — open blockers + accepted risks + recheck impacts
 * 5. 下一步 (next-actions)  — required actions / loopback / human confirms
 *
 * Each section is REQUIRED. Render an empty-state stub if data is absent —
 * never omit a section.
 */
export type ReviewerCardProps = {
  /** Short subject ID surfaced as a badge (e.g., the NeedCandidate id). */
  subjectId?: string;
  /** Optional kind tag (e.g., "NeedCandidate", "ValidatedNeed"). */
  kind?: string;
  /** Optional status badge with tone. */
  status?: { label: string; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' };
  /** Optional reviewer-relevant secondary chips (version, freshness, ...). */
  chips?: Array<{ label: string; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }>;
  /** Section 1 — verdict / claim. */
  verdict: ReactNode;
  /** Section 2 — supporting evidence. */
  support: ReactNode;
  /** Section 3 — counter-evidence / unresolved objections. */
  challenge: ReactNode;
  /** Section 4 — blockers / accepted risks / recheck impacts. */
  blockers: ReactNode;
  /** Section 5 — required actions / loopback / human confirms. */
  nextActions: ReactNode;
  /** Optional confidence / score hint (caption-only; never a sole gate). */
  confidenceHint?: ReactNode;
  /** Optional footer slot (timestamps / refs). */
  footer?: ReactNode;
};

const SECTION_TITLES = {
  verdict: '结论',
  support: '证据',
  challenge: '反证 / 未解争议',
  blockers: '阻断 / 风险 / Recheck',
  nextActions: '下一步 / 人审',
} as const;

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section data-ui="section" data-padding="sm">
      <div data-ui="stack" data-direction="col" data-gap="1">
        <div data-ui="toolbar" data-align="between">
          <p data-ui="text" data-variant="label" data-tone="primary">{title}</p>
          {hint ? <p data-ui="text" data-variant="caption" data-tone="muted">{hint}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

export function ReviewerCard({
  subjectId,
  kind,
  status,
  chips,
  verdict,
  support,
  challenge,
  blockers,
  nextActions,
  confidenceHint,
  footer,
}: ReviewerCardProps) {
  return (
    <article data-ui="card" data-padding="md" data-elevation="sm">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <header>
          <div data-ui="toolbar" data-align="between" data-wrap="wrap">
            <div data-ui="stack" data-direction="row" data-gap="2" data-align="center" data-wrap="wrap">
              {kind ? <span data-ui="badge" data-variant="subtle" data-tone="info">{kind}</span> : null}
              {subjectId ? (
                <span data-ui="text" data-variant="caption" data-tone="muted" title={subjectId}>
                  {subjectId}
                </span>
              ) : null}
            </div>
            <div data-ui="stack" data-direction="row" data-gap="1" data-wrap="wrap">
              {status ? (
                <span data-ui="badge" data-variant="solid" data-tone={status.tone ?? 'neutral'}>
                  {status.label}
                </span>
              ) : null}
              {chips?.map((chip) => (
                <span
                  key={`${chip.label}-${chip.tone ?? 'neutral'}`}
                  data-ui="badge"
                  data-variant="subtle"
                  data-tone={chip.tone ?? 'neutral'}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          </div>
          {confidenceHint ? (
            <p data-ui="text" data-variant="caption" data-tone="muted">{confidenceHint}</p>
          ) : null}
        </header>

        <Section title={SECTION_TITLES.verdict}>{verdict}</Section>
        <Section title={SECTION_TITLES.support}>{support}</Section>
        <Section title={SECTION_TITLES.challenge}>{challenge}</Section>
        <Section title={SECTION_TITLES.blockers}>{blockers}</Section>
        <Section title={SECTION_TITLES.nextActions}>{nextActions}</Section>

        {footer ? (
          <footer>
            <p data-ui="text" data-variant="caption" data-tone="muted">{footer}</p>
          </footer>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Reusable empty-state rendering for any of the 5 sections. Use when the
 * underlying authority/workflow record genuinely has no data for that
 * section — never collapse the section away.
 */
export function ReviewerCardEmpty({ label }: { label: string }) {
  return <p data-ui="text" data-variant="caption" data-tone="muted">{label}</p>;
}
