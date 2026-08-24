# 00 Overview

## Status
- State: done
- Parent architecture package: `dev-docs/archive/topic-selection-decision-chain-redesign/`
- Related acceptance package: `dev-docs/active/topic-selection-backend-decision-chain-acceptance/`
- Next step: apply migration to a real DB and run the updated real-flow harness when the resource pool/LLM environment is ready.

## Goal
- Productize topic-resource sampling before v1a so real topic-selection flows use explainable evidence-role classification instead of temporary script heuristics.
- Persist sample sets, sample items, and audit metadata so downstream v1a/v1b/v1c objects can explain which literature was selected and why.
- Use LLM semantic classification for topic relevance and evidence polarity, then enforce deterministic guardrails before any SampleSet becomes ready.

## Non-goals
- Do not reopen T-068; it remains a backend decision-chain acceptance record.
- Do not implement desktop UI in this package.
- Do not define mature research-quality thresholds.
- Do not replace Evidence Activation; consume active/eligible, key-content-ready literature from topic scope.
- Do not change existing v1a/v1b/v1c authority contracts except by adding a pre-v1a sampling entrypoint.

## Acceptance Criteria
- [x] Shared contracts define SampleSet, SampleItem, SamplingAudit, roles, statuses, request, and response schemas.
- [x] Prisma SSOT and repositories persist sample sets/items/audits without leaking Prisma types into services.
- [x] Backend service performs eligibility filtering, LLM semantic classification, deterministic guardrails, role-balanced selection, warnings, and sample hashing.
- [x] API exposes `POST /topic-selection/v1a/resource-samples` and `GET /topic-selection/v1a/resource-samples/:sampleSetId`.
- [x] Unit tests cover role assignment, guardrails, warnings, deterministic hash, blocked LLM failure, and role-balanced output.
- [x] Route tests cover create/readback and malformed payload errors.
- [x] Real-flow harness can consume the resource sample API before creating the title-card evidence basket.
