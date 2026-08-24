# Roadmap - AI Workflow Harness

## Decision
Add AI workflow only after deterministic authority boundaries exist.

## Deliverables
- `ImplementationInputSnapshot`.
- `PaperImplementationAgentWorkflowHarness`.
- Invocation audit/provenance integration.
- Scenario coverage for authority bypass risks.

## Done When
- Agents can assist the full implementation loop through proposal artifacts without mutating authority state.

## 2026-05-21 Result
- Done for backend minimum closure.
- T-100 should treat proposal artifacts and decision queue items as reviewable workbench inputs.
- T-101 should replay harness runs through the persisted input snapshot, raw/parsed artifact refs, gate result, transition attempt, quality signals, and queue outcome.
