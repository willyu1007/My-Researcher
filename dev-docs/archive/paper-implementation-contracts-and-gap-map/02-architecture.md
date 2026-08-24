# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | D1-D10 roadmap, design docs, existing shared/backend/desktop contracts, glossary |
| Output objects | object map, design-component ownership map, minimum columnized-field matrix, gap matrix, dependency matrix, child-task readiness checklist |
| Authority writer | none; planning-only task |
| Gates | parent-roadmap consistency review |
| Trace | record source doc/code refs for every mapped object |
| Handoff | T-093 intake bootstrap starts only after upstream source fields and missing contracts are known |

## Key Rule
This task decides implementation readiness and sequencing. It does not create a second architecture outside `T-091`.

## Artifact Index
| Artifact | Contract role |
|---|---|
| `06-object-and-component-map.md` | Maps design-doc objects and runtime components to child owners. |
| `07-current-state-gap-map.md` | Classifies current repo assets as reuse, adapt, legacy-transition, or missing. |
| `08-queryability-field-matrix.md` | Defines required queryable fields for gates, queues, traces, WorkOrders, claims, dossiers, harnesses, and evaluation. |
| `09-child-readiness-checklist.md` | Defines the next child order and the review gate before each child starts. |

## Flow Support
- Supports T-093 by freezing intake source refs and field gaps.
- Supports T-094/T-095 by identifying motive, portfolio, and validation contracts.
- Supports T-096 by mapping experiment-foundation refs, monitor intake, ledger writer behavior, and missing bridge contracts.
- Supports T-097/T-098 by identifying trace/dossier contract gaps.
- Supports T-099/T-100/T-101 by listing runtime harness, UI, queryability, and evaluation dependencies.

## Planning Boundary
- T-092 creates no product contracts, DB schema, services, routes, UI, or tests.
- T-092 output is authoritative planning input for child tasks, not executable product behavior.
- Any implementation conflict with D1-D10 returns to `T-091` before code changes continue.
