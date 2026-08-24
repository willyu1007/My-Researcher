# Topic Workbench UI Contract

## User task

The workbench helps a reviewer evaluate one topic-selection chain at a time. It keeps the current stage, evidence, counter-evidence, blockers, accepted risks, recheck impact, and required human action visible without turning the full audit graph into the primary interface.

## Structure

- The existing desktop shell remains the navigation owner.
- One topic/title-card workbench contains the v1a evidence-to-need, v1b need-to-draft-topic, and v1c promotion stages.
- Decision review, queues, trace drilldown, and low-frequency policy views stay inside that workbench instead of becoming one full-screen page per domain object.
- Trace drilldown explains provenance and state; it does not replace the decision summary.

## Reviewer card

Every reviewer card keeps five sections, even when a section has no data:

1. Verdict or current claim.
2. Supporting evidence.
3. Counter-evidence and unresolved objections.
4. Blockers, accepted risks, and recheck impact.
5. Required next actions and the exact human confirmation.

Confidence and scores are supporting signals only. They cannot be the sole gate. A human confirmation must show its scope, dependency version, risk acceptance, and downstream effect. A human override additionally requires a reason, scope, expiry or recheck condition, and accepted-risk reference.

## Runtime styling boundary

- Use the consumed `data-ui` roles and shared token/contract CSS.
- Preserve the current entrypoint `ui/styles/ui.css` and required `ui/styles/desktop-runtime/**` compatibility selectors.
- Do not recreate renderer-local `apps/desktop/src/renderer/styles/**` or `app-layout.css`.
- This repository-governance migration does not redesign or visually refactor the workbench.

## Authority

The implementation under `apps/desktop/src/renderer/modules/topic-workbench/**` owns the current component composition. This document preserves only stable interaction and styling boundaries. Historical design rationale remains attributable to T-042 and T-087 without being a runtime dependency on their task bundles.
