# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | `ImplementationProject`, intake snapshot refs, promoted topic/package context |
| Output objects | `CoreMotiveIdentity`, `CoreMotiveSet`, `CoreMotiveVersion`, motive assertion records, `MotiveEvidenceBoardVersion`, `EvidenceTransferBinding`, `CrossBoardReview`, `MotivePortfolioDecision` |
| Authority writer | `PaperImplementationMotiveEvidenceBoardService`; later `StateWriter` integration must wrap this authority path rather than bypass it |
| Gates | motive admission, evidence-board trace gate, semantic-change gate, portfolio constraint gate, primary-motive confirmation gate |
| Trace | source literature refs, upstream refs, challenge refs, internal interpretation refs marked non-citable, portfolio decision refs |
| Handoff | T-095 receives motive assertions, evidence gaps, conflicts, validation candidates, portfolio priority, and active motive constraints |

## Contract Review
- Assertions must separate motivation, method, empirical, and scope claims.
- Evidence bindings are support/challenge/context, not final claim evidence.
- Evidence copied across motive/version/board boundaries requires explicit `EvidenceTransferBinding`; direct `evidence_binding` or board refs cannot become new evidence refs.
- Board display summaries are UI/context only and cannot feed citation authority.
- `CoreMotiveSet` must keep active and primary motive counts within configured portfolio constraints.
- `CrossBoardReview` is a structured review cycle, not just UI browsing.
- `MotivePortfolioDecision` is required for role changes, merge/split, park, abandon, and primary replacement.

## Implemented Backend Shape
- Contracts live in `paper-implementation-motive-contracts` and are re-exported from the shared research-lifecycle barrel.
- Motive service depends on `PaperImplementationRepository`, `PaperImplementationMotiveRepository`, and `PaperImplementationTraceRepository`; it does not import Prisma.
- Prisma persistence columnizes gate/query fields for implementation project, motive/version ids, portfolio role, lifecycle, trace manifest, assertion type, binding source refs, evidence-transfer source/target refs, board state, portfolio counts, confirmation, and evolution status.
- REST routes live under `/paper-implementation/projects/:implementation_project_id/...` and do not create or mutate `PaperProject`, topic-selection authority objects, or `research-argument` objects.
- T-094 remains backend minimum closure: no validation-cycle scheduling, WorkOrder, claim/dossier, AI harness, or UI was implemented.
