# 03 Implementation Notes

## 2026-05-18 Intake
- Opened T-084 to implement the proposed next test plan.
- Existing temporary harness already covers resource sampling, v1a, v1b, v1c, and downstream feedback.
- Missing product-level pieces are durable script location, explicit PaperProject intake stage, and intake negative boundaries.

## 2026-05-18 Runner Implementation
- Promoted the temporary real-flow harness into `.ai/scripts/topic-selection-real-e2e.mjs`.
- Added root script `pnpm topic-selection:real-e2e`.
- Changed the artifact root to `.ai/.tmp/topic-selection-real-e2e/<run-id>/`.
- Added an explicit PaperProject intake stage:
  - malformed payload returns `INVALID_PAYLOAD`;
  - stale bridge hash returns `VERSION_CONFLICT`;
  - workspace drift returns `VERSION_CONFLICT`;
  - active bridge creates one downstream PaperProject and persists intake refs;
  - duplicate intake returns the existing PaperProject refs without creating a second project;
  - non-active bridge intake returns `GATE_CONSTRAINT_FAILED`, after temporarily flipping only the current-run bridge and restoring it.
- Kept downstream feedback/recheck coverage after intake, so feedback now verifies bridge stability with `paper_project_intake_ref` and `target_paper_project_ref` present.
