# 00 Overview

## Status
- State: done
- Task ID: `T-091`
- Feature / Milestone / Requirement: `F-001` / `M-001` / `R-013`
- Next step: post-landing review or future hardening tasks may proceed from the T-101 closure evidence.
- Semantic supersession (2026-07-12): T-132 D-16 replaces the original “all terminal outcomes become RunEvidenceUnit” rule for all future/productized work. Historical completion evidence remains valid for the implementation that existed then, but current target semantics are eligible scientific EvidenceCandidate→REU and exact failed/cancelled/incomplete execution→immutable ValidationCycle closure snapshot/hash; see T-132/T-124.

## Goal
- Create the parent package for full paper implementation landing under the user-facing `论文管理` module.
- Coordinate `选题管理` as upstream authority input and `实验基座` as experiment/evidence substrate.
- Turn the design docs for AI-driven implementation into a governed roadmap with explicit child-task boundaries.

## Non-goals
- Do not implement product code in this parent package.
- Do not collapse `选题管理`, `论文管理`, and `实验基座` into one backend bounded context.
- Do not let LLM outputs become evidence, citation, or authority state without gates and trace.
- Do not implement full paper writing, LaTeX/Prism/Overleaf execution, venue planning, or rebuttal flows.

## Context
- The project already has a user-facing `论文管理` module that can carry paper implementation workflows.
- Existing `选题管理` flows can provide promoted topic/package/decision inputs.
- Existing `实验基座` work can support dataset, baseline, benchmark, recipe, job, result, and evidence-sidecar needs.
- The new gap is the full implementation control loop: motive, validation cycle, work order, run evidence, result interpretation, claim trace, and implementation dossier.

## Acceptance Criteria
- [x] Parent task bundle exists with `roadmap.md`, `00-overview.md` through `05-pitfalls.md`, and `.ai-task.yaml`.
- [x] Project governance registers `T-091` under `M-001 > F-001 > R-013`.
- [x] Roadmap records user-confirmed carrier/support module decisions.
- [x] Roadmap lists decision points required before child implementation tasks.
- [x] Child task packages are created from the confirmed D10 list.
- [x] Child task coverage review confirms no unowned gap.
- [x] No product code changes are made under this parent package.

## Child-task Policy
- Child tasks have been created from the confirmed D10 list.
- Child tasks must use `parent-task:T-091` in `.ai-task.yaml`.
- Child tasks must declare changed module ownership before code/config edits.
- Child tasks must declare flow node, inputs, outputs, authority writer, gates, trace, command/read-model/API surface, and verification.

## Closure
- Closed child tasks: `T-092`, `T-093`, `T-097`, `T-094`, `T-095`, `T-096`, `T-098`, `T-099`, `T-100`, `T-101`.
- Parent closure review: `dev-docs/active/paper-implementation-contract-evaluation-suite/10-parent-closure-review.md`.
- No unowned V1 blocker remains.
