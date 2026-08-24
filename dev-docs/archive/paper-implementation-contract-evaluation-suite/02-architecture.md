# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | outputs and verification evidence from T-092 through T-100 |
| Output objects | evaluation matrix, fixtures, test results, closure review, residual-risk list |
| Authority writer | none; verification/governance task |
| Gates | D1-D10 frozen-rule coverage, design-doc component coverage, queryability coverage, full-flow replay, residual-risk triage |
| Trace | evaluation evidence links to contracts, commands, gate results, trace manifests, and dossier outputs |
| Handoff | parent T-091 closure or follow-up child tasks |

## Contract Review
- Default suite must be deterministic and credential-free.
- Live provider/cloud canaries, if needed, are opt-in follow-up lanes.
- Coverage must include blocked transitions, not only success paths.
- Required gate/queue/trace fields must be queryable through repositories/read-models without parsing opaque JSON blobs.
- Closure must fail if portfolio governance, runtime harness, upstream feedback, or WorkOrder monitor/ledger behavior is untested and unowned.

## Implemented Evaluation Surface
- Backend unit test replays the full PaperImplementation path from intake to writing packet.
- Backend blocked-path test covers hash drift, missing locator, display-summary hard-gate misuse, orphan monitor callback, AI direct mutation, and upstream feedback boundary.
- Queryability guard reads Prisma SSOT and DB context contract.
- UI command/read-model evaluation is static plus route-backed, using T-100 Chrome screenshot evidence as visual proof.
