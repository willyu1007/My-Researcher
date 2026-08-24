# 02 Architecture

## Boundary
- Resource sampling sits before v1a `TopicSeed -> LiteratureResourcePoolSnapshot`.
- It consumes topic-scoped literature plus evidence-readiness signals.
- It does not create `ValidatedNeed`, `ResearchSlice`, `TopicQuestion`, `TopicPackage`, or `PaperProjectBridge`.

## Objects
- `TopicSelectionResourceSampleSet`: one sampling run for a topic and policy version.
- `TopicSelectionResourceSampleItem`: one classified candidate literature with selected role, scores, rationale, rank, and exclusion/review metadata.
- `TopicSelectionResourceSamplingAudit`: run-level audit summary and artifact refs for classifier output and guardrail decisions.

## Classification
- LLM semantic classification proposes relevance, evidence polarity, role scores, and rationale.
- Deterministic guardrails enforce hard product rules:
  - risk-heavy candidates cannot be `support`;
  - baseline requires evaluation/benchmark/comparison semantics;
  - context has a role target cap;
  - topic drift becomes `review` or `excluded`;
  - fine-tuning shortage produces a warning.

## Persistence And Audit
- DB stores stable authority fields required for API/UI/replay.
- Large candidate diagnostics can be carried in JSON payload fields and artifact refs.
- Hidden reasoning and provider secrets are never persisted.

## API
- `POST /topic-selection/v1a/resource-samples` creates a sample set.
- `GET /topic-selection/v1a/resource-samples/:sampleSetId` reads sample set, selected items, candidate items, and audit.
