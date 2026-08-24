# 00 Overview

## Status
- State: done
- Parent task: `T-043 experiment-foundation-v1`
- Next step: hand off to `T-077 experiment-foundation-execution-adapters`.

## Goal
- Implement durable metadata storage and REST surfaces for experiment-foundation assets, protocols, readiness checks, recipe/run-recipe records, materialization request records, candidates, results, evidence, and sidecars while preserving domain DTO boundaries.

## Non-goals
- Do not apply the generated migration to a live database in this task.
- Do not expose platform-private adapter payloads through public API.
- Do not store raw datasets or large artifacts in Postgres.
- Do not implement execution adapters, LLM extraction, recipe generation, materialization generation, canonical asset synthesis, or desktop UI.

## Responsibilities
- Add Prisma models only through DB SSOT when approved.
- Add repositories returning domain DTOs, not Prisma objects.
- Add service/readiness gates and REST controllers.
- Persist and expose T-075 candidate triage/promotion records without embedding canonical DTOs or adapter-private payloads.
- Keep Postgres for metadata and filesystem/cloud refs for large artifacts.

## Boundary
- Owns persistence/API/readiness implementation.
- Consumes contracts from the S1 child tasks.
- Hands off adapter execution to `experiment-foundation-execution-adapters`.
- Hands off UI consumption to `experiment-foundation-desktop-workbench`.

## Done Means
- Done: generic experiment-foundation registry and readiness report Prisma models were added through DB SSOT with a repo migration file only.
- Done: shared API wrapper contracts, repository/service layers, REST routes, readiness checks, and candidate promotion persistence were implemented.
- Done: tests cover CRUD/search/read, schema-invalid payloads, stale dataset mirrors, non-ready versions, invalid result readiness, and gated candidate promotion.
- Done: DB context was refreshed after schema changes.
- Done: no raw datasets, large artifacts, secrets, SDK payloads, or adapter-private payloads are persisted by the new registry design.

## Acceptance Criteria
- [x] Repository layer hides Prisma from business services.
- [x] Readiness and promotion gates cover the minimum blockers needed before adapters.
- [x] REST routes expose registry, readiness, and candidate promotion paths.
- [x] DB context is refreshed and no live DB migration was applied.
