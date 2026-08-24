# 00 Overview

## Status
- State: done
- Task: T-084
- Current focus: real-resource topic-selection E2E canary is productized and verified in mock/provider modes.

## Goal
- Turn the next-step acceptance plan into a repeatable runner.
- Exercise a 16-literature real-resource canary over `ai-rag-finetuning-2022-2026`.
- Verify resource sampling, v1a, v1b, v1c, PaperProject intake, and targeted negative boundaries in one product-level flow.

## Non-goals
- Do not replace service/unit/route suites.
- Do not require real credentials for default backend tests.
- Do not add desktop UI.
- Do not broaden the canary into full-resource-pool quality scoring in this task.

## Acceptance Criteria
- [x] Durable real E2E runner exists outside `.ai/.tmp`.
- [x] Runner creates artifacts under `.ai/.tmp/topic-selection-real-e2e/<run-id>/`.
- [x] Deterministic mock-LLM mode passes with real DB and real resource records.
- [x] Provider mode is executed when `.env.local` provider keys are available.
- [x] PaperProject intake creates exactly one downstream PaperProject and duplicate intake is idempotent.
- [x] Negative checks cover malformed payload, stale bridge hash, workspace drift, and non-active bridge intake.
- [x] Root test/typecheck and governance lint remain green.
