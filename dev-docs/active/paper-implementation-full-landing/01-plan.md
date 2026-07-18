# 01 Plan

## Plan Summary
This parent task is a governance and roadmap package. Its job is to define the full implementation landing path, not to execute it directly.

## Phase Plan
1. Decision alignment and gap map.
2. Intake bootstrap.
3. Motive and evidence board.
4. Validation-cycle planning.
5. WorkOrder and experiment foundation bridge.
6. Trace kernel.
7. Result, claim, and dossier.
8. AI workflow harness and runtime governance.
9. Desktop implementation workbench under `论文管理`.
10. Contract evaluation and parent closure review.

## Immediate Steps
1. Begin `paper-implementation-contracts-and-gap-map`.
2. Use the D10 child package list as the execution queue.
3. Keep child tasks narrow enough to verify independently.
4. Return to the parent roadmap if a child task discovers a D1-D10 conflict.

## Parent Acceptance
- [x] D1-D10 have explicit outcomes.
- [x] Child task list is confirmed.
- [x] Each child task has one primary owner module and dependency notes.
- [x] Parent package records which child tasks close P0.
- [ ] Parent package remains roadmap/governance only.

## Confirmed Child Acceptance Model
| Child | Primary acceptance |
|---|---|
| contracts/gap map | object mapping, ownership, dependencies, and current gaps confirmed |
| intake bootstrap | `ImplementationProject` bootstraps from `ImplementationIntakeSnapshot` with immutable upstream lineage |
| motive/evidence board | motive/assertion/evidence-board authority is versioned, gated, and trace-ready |
| validation-cycle planning | validation cycles, route/probe plans, and experiment-plan candidates have gates and budgets |
| workorder bridge | all runs flow through WorkOrder harness; D-16 retains failed/cancelled/incomplete execution in Cycle closure accounting and permits REU only for eligible scientific results |
| trace kernel | writing-affecting objects cannot become writing-ready without trace |
| result/claim/dossier | implementation dossier can be ready/parked/abandoned with trace |
| AI harness | agent outputs are proposal artifacts, not authority writes |
| desktop workbench | user can inspect, command, and confirm implementation decisions without bypass |
| evaluation suite | frozen rules have repeatable contract/replay/mutation/adversarial tests |
