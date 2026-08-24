# Roadmap

## Why This Exists
- Real-resource topic-selection testing showed the backend chain can run, but temporary resource sampling could misclassify evidence polarity.
- The product needs a persistent, auditable sampling layer before v1a so selected literature roles are explainable and reproducible.

## Milestones
- M1: Task bundle and project governance registration. Done.
- M2: Shared contracts and Prisma SSOT. Done.
- M3: Repository, service, routes, and app wiring. Done.
- M4: Unit/route/persistence verification. Done.
- M5: Real-flow harness consumes resource sample API. Script updated; execution is deferred until live DB migration and real LLM environment gate.

## Decisions
- D1: This is a new implementation package, not a T-068 continuation.
- D2: Use LLM semantic classification plus deterministic guardrails.
- D3: Persist SampleSet/SampleItem/Audit in DB.
- D4: Desktop UI remains out of scope.
