# 02 Architecture

## Flow
```text
T-117 readiness evidence
  -> F3 promotion matrix
  -> experiment-foundation asset candidates
  -> candidate triage
  -> manual promotion or needs_info
  -> canonical assets in a later task
```

## Candidate Families
- `dataset`: workload traces or benchmark datasets.
- `benchmark`: benchmark suite or benchmark harness.
- `baseline`: runnable method/system baseline.
- `evaluation_protocol`: evaluator, diagnostic framework, metric protocol, or reporting protocol.
- `method_component`: reusable algorithm/toolkit/simulator component.
- `base_model`: not expected in the first F3 lane.

## Gating Policy
- F3 may mark candidates as `manual_review_required` or `needs_info`.
- F3 must not use `auto_promote` unless all existing experiment-foundation gates are satisfied:
  - source refs present.
  - duplicate check complete.
  - required fields complete.
  - license/policy clear.
  - risk low.
  - confidence at least `0.8`.
  - version/protocol/policy refs available where required.

## Artifact Strategy
- Repo keeps lightweight task docs and compact F3 matrix artifacts.
- Detailed T-117 F2 readiness JSON remains under ignored `.ai/.tmp`.
- No raw dataset, trace, repository clone, or execution output is stored in repo.

## Risks
- GitHub URL/license verification from F2 is not enough for auto-promotion.
- Workload traces can carry privacy, redistribution, or synthetic-real ambiguity risk.
- Toolkits can blur baseline, method-component, and protocol boundaries; the matrix must state primary and secondary candidate families explicitly.
