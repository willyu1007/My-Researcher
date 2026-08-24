# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-076 experiment-foundation-persistence-api-readiness` for persistence/API/readiness implementation.

## Goal
- Convert literature key-content and manual observations into grounded asset candidates that can be rejected, marked needs_info, manually reviewed, or promoted into canonical assets without polluting asset lifecycle states.

## Non-goals
- Do not implement LLM extraction.
- Do not auto-promote high-risk, restricted, low-confidence, or under-sourced candidates.
- Do not make `candidate` a canonical asset lifecycle state.

## Responsibilities
- Define dataset, benchmark, baseline, method, protocol, and model candidate payloads.
- Define candidate review statuses and promotion requirements.
- Require source refs, version/policy/license confidence, duplicate checks, and risk classification.
- Define deterministic low-risk auto-promotion constraints.

## Boundary
- Owns candidate contracts and promotion gate semantics.
- Hands off canonical asset contracts to dataset and benchmark/protocol child tasks.
- Hands off API implementation to `experiment-foundation-persistence-api-readiness`.

## Done Means
- [done] Candidate state is separate from canonical asset state.
- [done] Auto-promotion cannot create assets from hallucinated or incomplete evidence.
- [done] Promotion outputs canonical asset refs plus version/protocol/policy refs where required.
- [done] Shared typecheck/test passed after adding candidate and promotion schema coverage.

## Acceptance Criteria
- [x] Candidate payloads require source refs, provenance, canonical name, aliases, confidence, duplicate check, completeness check, policy/license check, risk assessment, and status.
- [x] Auto-promotion is rejected unless the candidate is grounded, complete, clear-policy, no-duplicate, low-risk, and confidence is at least `0.8`.
- [x] Candidate and promotion payloads reject execution, result/evidence, paper-claim, platform-private, and embedded canonical DTO fields.
- [x] Canonical asset/protocol/method schemas explicitly reject candidate lifecycle fields.

## Closure Notes
- Added shared contracts for literature/manual asset candidates, candidate checks, triage reports, promotion requests, and promotion results.
- Added explicit schema guards so canonical asset/protocol/method records reject candidate lifecycle fields under the repo Fastify/Ajv behavior.
- No Prisma, backend route, desktop UI, adapter, extraction, or canonical creation service was implemented in this slice.
