# Topic Selection Research Checkpoint Control Plane — Verification

## Evidence

| Claim / reference | Check / procedure | Latest result | Evidence / limitation |
|---|---|---|---|
| Existing product has a hard human need confirmation and hard human promotion decision. | Inspect maintained workflow matrix and current routes. | observed | `topic-selection-workflow-matrix.md` marks v1a human-confirm-need and v1c record-human-promotion-decision as human review; current POST routes exist. |
| Existing product lacks a hard evidence checkpoint. | Inspect EvidenceMap row, services, and API routes for a required human decision before NeedCandidate generation. | observed | EvidenceMap has deterministic materialization/readiness but `human_review_required=no`; no evidence-landscape decision authority exists. |
| Existing product lacks a hard final question checkpoint. | Inspect N6/N7 rows and v1b human routes. | observed | Slice selection accepts human input, but N7 materialization is mechanical by product decision and no current TopicQuestion confirmation authority blocks N8. |
| Current product path can be operationally complete while academically shallow. | Review the 2026-08-25 real local API rehearsal artifacts. | observed | Four EvidenceUnits, three abstract-only; one NeedCandidate; top-k 5/10 remained the research object; N8 score 74 included originality 60 and reviewer-risk 58; multiple `pass_with_risk` findings advanced without conditions. This is diagnostic evidence, not a benchmark corpus. |
| Explicit academic objection was not preserved as a blocking product constraint. | Compare user objection with subsequent slice/question/package/promotion records. | observed | The objection that top-k 5/10 was insufficiently academic did not invalidate the downstream authority chain; narrative enrichment advanced to an active bridge. |
| Archived work provides reusable control-plane and human-review foundations rather than a duplicate active outcome. | Query governance and read T-042/T-088/T-089/T-115/T-123/T-127/T-128 summaries. | observed | All are archived and establish prior design/runtime/product baselines; T-129 is active but limited to externally gated calibration/provider debate. |
| A1/A6: Checkpoint and research-status APIs are product-owned and recoverable. | Contract/schema tests, route integration, projection fixtures, and direct-route bypass negatives. | not-run | Enabled after Phase 2 implementation. |
| A2: Evidence/gap quality fails closed on shallow or non-competitive material. | Negative cases for abstract-heavy core evidence, missing nearest work, missing disconfirming evidence, lone candidate, and wording-duplicate candidates. | not-run | Policy classification must be confirmed in Phase 1. |
| A3/A4: Question confirmation and objections govern currentness. | Snapshot-drift, objection lifecycle, unauthorized resolution, semantic no-op rewording, valid revision, and N8-entry tests. | not-run | Enabled after Phase 4 implementation. |
| A5: Promotion and intake reconcile risks, actions, objections, and checkpoint chain. | N8/v1c/bridge route tests plus full-chain negative and positive scenarios. | not-run | Enabled after Phase 5 implementation. |
| A7: No reduced-quality production mode or client semantic authority exists. | Search exported runtime enums/config/routes and verify scenario-only test controls; test direct client bypass rejection. | not-run | Verify at each phase and completion. |
| A8: Cutover and full-chain regression are safe. | Prisma migration checks, disposable shadow DB, real-DB replay/idempotency, top-k objection regression, OpenAPI drift, relevant backend suites, and typecheck. | not-run | Depends on confirmed cutover design. |

## Outstanding verification

- Confirm the task opening, proposed F-001 placement, and checkpoint-control direction.
- Inventory all direct and coordinated transition entry points before central guard design is finalized.
- Classify existing record populations and obtain a user decision on cutover behavior.
- Convert academic-quality requirements into hard semantic blockers versus configurable triggers without treating raw counts as proof.
- Execute phase-specific and full-chain checks as implementation lands; no application-code verification has yet been claimed for this task.
