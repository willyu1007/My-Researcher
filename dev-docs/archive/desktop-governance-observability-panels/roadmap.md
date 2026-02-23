# Roadmap

## Milestones
1. Contract alignment and UI data-shape freeze
2. Timeline/metrics/artifact/review panel delivery
3. Feature-flag rollout and fallback hardening
4. Verification and governance closure

## Scope
- Build governance-observability panels in `apps/desktop` for:
  - Timeline
  - Runtime metrics
  - Artifact bundle
  - Release review queue
- Keep all views traceable to `T-005` delta contract and `T-007` backend APIs.
- Use read-first interaction model; write action limited to release review submission.

## Out of scope
- Backend API implementation and persistence changes.
- Replacing existing desktop shell/routing baseline from `T-004`.
- Expanding to non-LLM research mode defaults.

## Dependencies
- Contract baseline: `dev-docs/active/analemma-borrowing-governance-v1/08-interface-delta-spec.md`
- Backend readiness: `T-007 governance-read-api-and-release-review-gate`
- UI shell baseline: `T-004 desktop-app-electron-ui-v1`

## Risks
- Backend contract drift causes panel schema mismatch.
- Panel loading states become inconsistent under partial data.
- Release review action introduces accidental write-path coupling.
