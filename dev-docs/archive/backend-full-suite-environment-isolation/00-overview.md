# 00 Overview

## Status
- State: done
- Current focus: closed after backend full suite and isolated Prisma smoke passed under the real local `.env.local` setup.

## Goal
- Fix the real-environment failures observed when running the backend full suite with `.env.local`.
- Preserve real Prisma smoke coverage through isolated disposable schemas.
- Ensure regular backend tests remain deterministic and do not depend on external shared state or real credentials.

## Non-goals
- Do not wipe or reset the developer's real local database.
- Do not remove Prisma smoke coverage.
- Do not weaken product assertions just to make tests pass.
- Do not require real network access or provider credentials for the default backend full suite.

## Acceptance Criteria
- [x] Full backend suite passes from the repo test entry point.
- [x] Prisma-backed route smoke tests still execute against a migrated isolated schema when requested.
- [x] Memory/default tests are isolated from `.env.local` repository strategy settings.
- [x] Fulltext/acquisition and settings tests no longer depend on prior persisted settings or live network state.
- [x] Backend typecheck and governance sync/lint pass.
