# Implementation Notes

## 2026-05-23 - Task Creation
- Created `T-102 paper-implementation-v1-hardening` as a post-V1 hardening task.
- Triage source: `/Users/yurui/Downloads/paper_implementation_review_risks_and_recommendations.md` plus current `T-091`/`T-101` closure docs.
- Decision: do not reopen `T-091` or relabel V1 closure. T-102 is a follow-up package for valuable non-blocking review findings.
- Initial in-scope findings: F-02, F-03, F-04, F-05, deterministic slice of F-06, and read-model slice of F-13.
- Initial out-of-scope findings: F-07, F-08, F-09, F-10, F-11, F-12, F-14, F-15, F-16 unless the user explicitly promotes one into T-102.

## Owner Decisions
- Trace hardening owner: existing T-097 trace kernel and T-096/T-098 consumers.
- Claim readiness hardening owner: existing T-098 result/claim/dossier service and shared contracts.
- WorkOrder outcome clarity owner: existing T-096 WorkOrder/RunEvidence service and read-models.
- UI/writing/live provider hardening remain separate future task candidates.

## 2026-05-24 - Boundary Decisions Confirmed
- Confirmed T-102 remains a narrow post-V1 hardening package.
- WorkOrder terminal outcome will be handled first as service/read-model projection, not a new WorkOrder authority field.
- Human confirmation payload will stay minimal in T-102; richer review payload is deferred.
- Follow-up tasks for writing ingestion, live provider/experiment hardening, browser E2E, and `research-argument` decommission remain named candidates and will not be bulk-created before T-102 closure.

## 2026-05-24 - Implementation Pass
- Added canonical `result_interpretation_packet` trace target handling so trace manifests for result interpretation require experiment lineage.
- Added explicit `run_evidence_trace_manifest_id` to monitor intake and changed trusted final `RunEvidenceUnit` creation to use a target-specific run-evidence trace instead of inheriting WorkOrder trace.
- Added `support_pending_trace` claim status; claim candidates without `ClaimTracePacket` no longer present as fully supported.
- Tightened ready dossier admission to require supported trace-ready claims and tightened broad contextual support refs.
- Added deterministic overclaim wording guard and service tests for paraphrase-style broad/reliability/superiority overclaims.
- Kept WorkOrder terminal outcome as read-model/service behavior: WorkOrder process status remains separate from scientific outcome in `RunEvidenceUnit.run_status`.

## 2026-05-24 - Closure
- Closed T-102 after shared schema tests, targeted backend tests, backend typecheck, governance lint, and whitespace checks passed.
- No Prisma migration was needed because existing `traceManifestId`, `claimStatus`, and support-ref payload columns cover the hardening fields.
- Follow-up candidates remain unchanged and are not created by T-102.
