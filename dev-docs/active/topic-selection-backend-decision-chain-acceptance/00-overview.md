# 00 Overview

## Status
- State: done
- Next step: real-resource environment rehearsal passed; no backend decision-chain acceptance follow-up remains inside T-068.

## Parent And Scope Source
- Parent architecture package: `dev-docs/archive/topic-selection-decision-chain-redesign/`
- Scope acceptance source: `dev-docs/archive/topic-selection-decision-chain-redesign/07-governance-scope-acceptance.md`
- Covered stages:
  - v1a evidence-to-need
  - v1b need-to-draft-topic
  - v1c draft-package-to-PaperProjectBridge

## Goal
- Verify the implemented topic-selection backend decision chain end to end across shared contracts, Fastify routes, services, Prisma persistence, OpenAPI/context artifacts, and hard decision invariants.
- Produce a clear acceptance record that can stand independently from the T-042 parent architecture package.
- Use deterministic mock fixtures to verify node-by-node behavior, not only broad route connectivity.

## Non-goals
- Do not redesign the topic-selection architecture.
- Do not implement new product code unless acceptance exposes a concrete blocker that must be fixed.
- Do not validate desktop reviewer UI or manual UX workflows.
- Do not validate full PaperProject execution, writing agents, experiment automation, or research-argument runtime behavior.
- Do not claim mature research-quality thresholds from synthetic replay baselines.

## Acceptance Criteria
- [x] v1a HTTP/service path can produce a human-confirmed `ValidatedNeed` and v1b input bundle.
- [x] v1b HTTP/service path can consume v1a output and produce a trace-ready `TopicPackage(draft)` plus v1c input bundle.
- [x] v1c HTTP/service path can consume v1b output and produce promotion input, gate support, human promotion decision, commitment profile, `PaperProjectBridge`, and downstream feedback/recheck artifacts.
- [x] Hard decision invariants are verified with negative cases.
- [x] Shared contract tests, backend typecheck, Prisma validation, OpenAPI/API index checks, context verification, and isolated Prisma smoke pass or have documented blockers.
- [x] Acceptance result records residual gaps separately from T-042.
- [x] Deterministic T-068 mock fixture covers every decision-chain node with explicit per-node assertions.
- [x] v1a node assertions cover seed, resource snapshot, search plan, search run, evidence map, validation bundle, candidate, readiness, support packet, human adjudication, and v1b handoff.
- [x] v1b node assertions cover intake snapshot, constraint profile, intake readiness, slice option generation, slice human selection, topic-question generation, question human selection/materialization, value assessment, value disposition, draft package, and v1c handoff.
- [x] v1c node assertions cover promotion input, gate support, dossier, mini-check, gate, human promotion decision, commitment profile, bridge, downstream feedback, and recheck projection.
- [x] T-068 invariant/negative acceptance explicitly covers blocked readiness, duplicate/closed authority transitions, non-advance package blocking, non-promote bridge blocking, and append-only downstream feedback.
- [x] T-068 persistence/contract acceptance explicitly records route contract checks, shared contract/typecheck checks, OpenAPI/API/context checks, and isolated Prisma persistence smoke.
- [x] T-068 quality baseline acceptance verifies v1a/v1b/v1c synthetic offline replay datasets, case coverage, stage-compatible metrics, replay diffs, and cross-stage metric rejection without treating synthetic baselines as real-world quality thresholds.
- [x] Real-resource small-sample environment rehearsal runs through v1a, v1b, v1c, and creates an active `PaperProjectBridge` using the populated `ai-rag-finetuning-2022-2026` literature scope and the configured local LLM provider.
