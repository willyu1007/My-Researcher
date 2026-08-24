# 02 Architecture

## Acceptance Boundary
This task validates the backend implementation boundary only:

```text
HTTP/API
  -> controller validation
  -> service decision logic
  -> repository abstraction
  -> memory and Prisma persistence
  -> shared contracts
  -> generated API/context artifacts
```

It does not validate desktop UX, manual researcher workflow quality, or downstream paper execution.

## Stage Chain Under Test

```text
v1a:
TitleCard
  -> TopicSeed
  -> LiteratureResourcePoolSnapshot
  -> SearchPlan/SearchRun
  -> EvidenceMap/EvidenceUnit
  -> NeedCandidate
  -> ValidateNeedAdjudicationResult
  -> ValidatedNeed
  -> TopicSelectionV1aToV1bInputBundle

v1b:
TopicSelectionV1aToV1bInputBundle
  -> V1bIntakeSnapshot / ResearchConstraintProfile
  -> ResearchSlice
  -> TopicQuestionContract
  -> TopicValueAssessment / ValueDispositionDecision
  -> TopicPackage(draft)
  -> TopicSelectionV1bToV1cInputBundle

v1c:
TopicSelectionV1bToV1cInputBundle
  -> PromotionInputSnapshot
  -> PromotionDecisionSupport / PromotionGateCheck
  -> HumanPromotionDecision / PromotionDecision
  -> PromotionCommitmentProfile
  -> PaperProjectBridge
  -> DownstreamFeedback / Recheck
```

## Key Invariants
- `ValidatedNeed` requires `ValidateNeedAdjudicationResult.final_decision = validate` plus human confirmation.
- `TopicPackage(draft)` requires `ValueDispositionDecision.decision = advance_to_package`.
- `PromotionDecision` is separate from `TopicValueAssessment`.
- `PaperProjectBridge` requires a current human-confirmed promote-class decision.
- Downstream feedback creates feedback/recheck artifacts instead of mutating upstream authority.
- Synthetic offline replay is calibration evidence, not production authority state.

## Primary Evidence Files
- v1a routes: `apps/backend/src/routes/topic-selection-v1a-routes.integration.test.ts`
- v1b routes: `apps/backend/src/routes/topic-selection-v1b-routes.integration.test.ts`
- v1c routes: `apps/backend/src/routes/topic-selection-v1c-routes.integration.test.ts`
- Prisma SSOT: `prisma/schema.prisma`
- API contract: `docs/context/api/openapi.yaml`
- API index: `docs/context/api/api-index.json`
- DB context: `docs/context/db/schema.json`
