# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | backend read-models for queue, motive, portfolio, cycle, workorder, upstream feedback, trace, claim/dossier, confirmation |
| Output objects | command requests only; no authority state |
| Authority writer | backend services / `StateWriter`, never UI |
| Gates | command eligibility, stale/hash display, confirmation policy |
| Trace | displayed from backend trace read-models |
| Handoff | T-101 validates end-to-end command/read-model and UI governance coverage |

## Contract Review
- UI is a workbench, not a dashboard or editor.
- Selected queue item drives detail and command context.
- Topic-workbench patterns may inspire shape; topic-selection semantics must not be reused.
- Portfolio role changes and upstream feedback are command/read-model flows, not local UI edits.
