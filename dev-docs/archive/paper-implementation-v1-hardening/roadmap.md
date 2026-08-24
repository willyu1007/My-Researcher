# Roadmap

## Decision
Create `T-102 paper-implementation-v1-hardening` as a post-V1 hardening task under `M-001 > F-001 > R-013`.

## Scope
T-102 is a focused hardening package. It improves the existing PaperImplementation V1 lane; it does not reopen the parent closure or add a parallel product line.

### In Scope
- P1 trace precision:
  - `RunEvidenceUnit` MUST have a target-specific trace path before it can be treated as writing-affecting evidence.
  - `result_interpretation_packet` MUST be accepted as a canonical trace target.
- P1 claim readiness:
  - `ClaimCandidate` MUST distinguish provisional support from trace-ready support.
  - Writing-ready support MUST depend on locator-backed citable evidence and claim trace, not broad contextual refs alone.
- P1/P2 semantic safety within deterministic V1:
  - Add adversarial tests for overclaim wording/paraphrase drift.
  - Keep live LLM semantic critic/provider variance outside the default T-102 closure path.
- P2 read-model clarity:
  - WorkOrder and RunEvidence read models SHOULD preserve terminal scientific outcome separately from process completion where needed.
- Governance:
  - Update T-102 docs and project hub only; do not reopen D1-D10 unless a hard contradiction is discovered.

### Out Of Scope
- Live experiment execution adapter and real cloud/provider credential wiring.
- Live LLM/provider variance suite.
- Browser-level automated UI E2E.
- Writing-system ingestion and paragraph/citation enforcement.
- `research-argument` decommissioning.

## Decision Points
| ID | Decision | Recommendation | Status |
|---|---|---|---|
| H1 | Should this be a new task or reopen T-091/T-101? | New task `T-102`; T-091 remains closed. | confirmed |
| H2 | Is T-102 backend/contract hardening or productization? | Backend/contract hardening first; productization split later. | confirmed |
| H3 | Can run evidence reuse WorkOrder trace as final evidence trace? | No for writing-affecting readiness; require target-specific trace. | confirmed |
| H4 | Should trace target names support both normalized aliases and canonical object names? | Yes; add canonical `result_interpretation_packet` coverage. | confirmed |
| H5 | Can a claim be `supported` without `ClaimTracePacket`? | No; use provisional status until trace-ready support exists. | confirmed |
| H6 | Can broad refs such as literature/source/evidence unit satisfy writing-ready claim support alone? | No; require citable locator-backed evidence or claim trace at readiness gate. | confirmed |
| H7 | Should T-102 add live semantic critic? | No by default; add deterministic adversarial tests and defer live critic. | confirmed |
| H8 | Should T-102 implement real experiment adapters? | No; preserve WorkOrder bridge boundary and split live adapter into another task. | confirmed |
| H9 | Should UI drilldown/writing ingestion/research-argument cleanup be bundled? | No; track as separate product/writing/cleanup tasks. | confirmed |

## Recommended Execution Order
1. Trace target hardening.
2. Claim readiness and support-source hardening.
3. Overclaim deterministic adversarial tests.
4. WorkOrder terminal outcome/read-model clarification.
5. Governance and residual-risk follow-up registration.

## Completion Signal
T-102 is complete when the P1 code fixes are landed, tests prove the old ambiguous paths are blocked, and remaining P2/P3 items are explicitly owned by follow-up tasks or residual-risk docs.

## Confirmed Boundary Notes
- WorkOrder terminal outcome: T-102 will start with service/read-model projection and will not add a WorkOrder authority column unless implementation proves queryability cannot be preserved otherwise.
- Human confirmation payload: T-102 will keep only minimal gate checks needed for claim readiness/overclaim safety; richer review payload remains V1.1.
- Follow-up tasks: T-102 will record candidates and defer bulk task creation until closure, unless a split task becomes an immediate implementation dependency.
