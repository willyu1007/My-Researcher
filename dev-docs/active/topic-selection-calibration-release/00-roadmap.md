# Topic Selection Calibration Release — Roadmap

## Scope and constraints

### In scope
- Track the externally gated prompt-productization and provider-debate activation tails inherited from T-127/T-128.
- Keep N8/N6 calibration optional and advisory under D-30; never fabricate a corpus or automatically flip a gate.

### Out of scope
- No release blocker is recreated for optional calibration.
- No provider path opens by changing a dormancy constant without the required runtime wiring and provenance obligations.

### Constraints and dependencies
- C-2 requires a suitable real corpus before productizing six gated prompts.
- C-3 depends on C-2 and must land live role outputs, gate-bridge provenance, provider run mode, and execution-spec handling together.
- Historical Requirement provenance: `R-009` (Automated topic management decision layer baseline).

## Decision alignment

| Decision question | Options / tradeoffs | Current direction | Status | Owner / required confirmation | Closure evidence | Consequences |
|---|---|---|---|---|---|---|
| Calibration semantics | release gate / advisory tuning | Advisory optional tuning | decided | Prior D-30 decision | T-088/T-127/T-128 history | C-1 is not task completion work. |
| Provider debate activation | constant-only / complete guarded wiring | Complete guarded wiring only | decided | Existing fail-closed contract | Current source guards and T-128 handoff | Partial activation is forbidden. |

### Assumptions

| Assumption | Risk if wrong | Validation |
|---|---|---|
| No qualifying real corpus is currently available. | Work could remain planned unnecessarily. | Recheck only when the user supplies or identifies the corpus. |

## Task relationships

| Task | Relationship from this task | Owned boundary / exchanged contract | Coordination condition |
|---|---|---|---|
| T-128 | derived-from | W-17/W-18/W-19 handoff | Historical source of the retained tails. |
| T-088 | coordinates-with | Debate-core joint decisions | Coordinate if C-3 changes shared harness behavior. |

## Implementation plan

### Phase 1 — Validate external kickoff evidence
- Outcome: A real corpus qualifies the prompt work, or the task remains safely planned.
- Approach: Record-and-defer; do not generate substitute evidence.
- Planned changes:
  1. Validate corpus provenance, labels, provider/profile boundaries, and independent assessment readiness.
- Affected boundaries / entry points: N6/N8 gated prompts and debate runtime guards only after kickoff.
- Dependencies: External corpus and explicit implementation authorization.
- Exit criteria: C-2 has actionable evidence and a current design review.
- Verification: Corpus validation plus focused prompt/golden-anchor and runtime guard tests.
- Recovery: Preserve dormancy and the advisory threshold state.

### Phase 2 — Productize prompts and activate the provider path
- Outcome: C-2 and C-3 land together with the documented fail-closed obligations.
- Approach: Productize prompts first, then activate provider wiring in one reviewed checkpoint.
- Planned changes:
  1. Replace six prompt skeletons with product-ready content and drift anchors.
  2. Wire provider role outputs, provenance, run mode, and execution-spec handling before changing dormancy.
- Affected boundaries / entry points: Topic-selection v1b debate runtime and shared workflow harness.
- Dependencies: Phase 1 and cross-task coordination where shared behavior changes.
- Exit criteria: Adversarial review has no critical finding and provider execution remains fail-closed on incomplete wiring.
- Verification: Focused runtime, provenance, golden-anchor, and provider-path tests.
- Recovery: Restore dormancy without altering recorded evidence.

## Kickoff gate

- Status: pending
- Authorized boundary: none
- [ ] Decisions: qualifying external corpus evidence is supplied or explicitly identified.
- [x] Design: advisory calibration and complete-wiring-only activation boundaries are settled.
- [x] Route: corpus validation precedes prompt work and provider activation.
- [x] Verification: focused prompt, provenance, guard, and provider checks are identified.

## Risks and recovery

| Risk | Detection | Mitigation | Recovery / rollback |
|---|---|---|---|
| Synthetic evidence is mistaken for calibration authority. | Corpus lacks human labels or independent assessment. | Reject it for product decisions. | Keep all gates unchanged. |
| Dormancy opens without full wiring. | Constant changes without role/provenance/run-mode/execution-spec coverage. | Treat the change as one atomic phase. | Restore dormancy. |

## Phase closeout

- Review: Adversarially inspect corpus authority, prompt anchors, provenance, and fail-closed behavior.
- Record update: Synchronize the task only after decisive external or implementation evidence changes.
- Checkpoint: One task-linked commit for each verified phase.
