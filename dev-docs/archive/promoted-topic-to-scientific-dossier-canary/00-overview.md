# 00 Overview

## Status
- State: done
- Task ID: `T-137`
- Mapping: `M-001 > F-001 > R-009 + R-012 + R-013 > T-137`
- Next step: no implementation step remains. Preserve the terminal owner records, avoid any new STS or PAI execution for this Run, and archive T-137 only after a separate approval.

## Goal
Prove one simple, semantically coherent and traceable path from retrieval-ready literature through Topic Selection, PaperProject, PaperImplementation, real ExperimentFoundation evidence, and a `ready_for_writing` Dossier.

## Design rules
- Use one default `Prepare → Run → Accept` flow.
- Use semantic handoffs so LLM stages can follow the research logic without copying technical ids or hashes.
- Use existing product writers and defaults; do not introduce a new workflow or authority layer.
- Require one explicit authorization only for temporary cloud credentials and real paid PAI execution.
- Resume from existing persisted authority after failure; do not replay completed work by default.
- Apply strict checks only to scientific authority, paid effects, ownership/current-version, claim ceiling, and credentials/cost.

## Non-goals
- Do not reopen T-136, use T-043 as an implementation task, or start T-129 C-2/C-3.
- Do not add automatic Literature-to-EF discovery, UI, schema migrations, new authorities/providers, BYOC, multi-user delivery, automatic tuning, or prose generation.
- Do not add per-step approvals, a generic workflow engine, exhaustive manifests/censuses, or caller-authored scientific values.

## Context
- T-128 proved the non-debate Literature/Topic Selection product segment through PaperProject.
- T-132 proved real two-cell PAI execution and recovery discipline.
- T-136 proved the scientific WorkOrder-to-Dossier segment.
- T-137 joins these capabilities with a semantic spine. Its purpose is a usable product path, not a second compliance framework.

## Prepared default lane
- Primary source: `LIT-0328`, supported by `LIT-0190`, challenged by `LIT-0252`, with `LIT-0765` as the measurement guardrail.
- Research intent: determine whether increasing exact-token retrieval depth from `top-k 5` to `top-k 10` materially improves positive-judgment micro recall on SciFact while every other scientific input remains fixed.
- Existing experiment shape: two cells, server-owned `micro_recall_ppm`, absolute difference `top-k 10 - top-k 5`, support at `>= 10,000 ppm`, contradiction at `<= -10,000 ppm`, otherwise inconclusive.
- Composition decision: use a thin T-137 coordinator. Existing services are sufficient, but current E2E scripts carry fixture- or historical-task-specific semantics and cannot form this lineage directly.
- Isolation decision: create fresh T-137 Topic/PaperProject/PI/WorkOrder/Run authority. Historical T-128/T-136 projects, runs, results, evidence, claims, and dossiers are not lineage inputs; the active immutable SciFact asset revisions, readiness attestation, and execution bundle remain shared scientific dependencies.

## Current implementation boundary — 2026-08-17
- The fixed T-137 coordinator is implemented and has run through the pre-PAI boundary.
- Fresh anchors: TitleCard `title_card_ace91629-d086-4c6d-82f3-679ac86d03c1`, PaperProject `P429`, ImplementationProject `implementation_project_4ccca1d1-6782-413a-a6fd-a8c56ab9d40b`, and EF Run `ef_run_v2_0369f26c-d784-4c5c-b8dd-7c9b7008bc1c`.
- The new Run has two exact cells and two task specs. Provider payload, execution attempt, result, scientific validation, and evidence candidate counts are all zero.
- Re-running `pnpm t137:pre-pai` reads both passed stage summaries and performs no stage mutation.
- The valid WorkOrder v2 HTTP admission path is fixed: the shared schema now selects v1 or v2 by `work_order_schema_version` without destructive `oneOf` evaluation under Fastify's default AJV configuration.
- `pnpm t137:pai --mode offline-preflight` resolves the exact persisted Run and locks the four-value ExecutionPolicy: at most 2 paid Jobs, at most CNY 50, credential expiry supplied by the temporary STS at execute time, and a window of at most 48 minutes that stops at least 6 minutes before expiry.
- `pnpm t137:accept --mode offline-preflight` resolves the default OpenAI ResultAnalysis profile and correctly waits for 2 Results, 1 passed report, and 1 REU before any downstream write.
- One authorized 3,600-second controller STS session ran the exact two-cell window. Exactly two `CreateJob` calls produced two successful Attempts, two server-owned Results, one passed scientific validation report, one EvidenceCandidate, and one trusted REU; replay added zero rows.
- Credential-free acceptance used the configured OpenAI ResultAnalysis profile, closed the Cycle, materialized one Packet, admitted one supported moderate Claim, and produced one trace-complete `ready_for_writing` Dossier.
- The observed registered difference is `+61,947 ppm` for `top-k 10 - top-k 5`, above the `+10,000 ppm` support threshold. The Claim remains limited to the fixed SciFact exact-token setup.
- Local and Cloud Shell credential files were overwritten and removed, capability flags returned to defaults, scoped outboxes are zero, and the provider-side STS automatically expires at `2026-08-16T23:39:13Z` with no locally recoverable credential material.
- Terminal preflights now distinguish closed/consumed scientific evidence from a runnable window. A terminal acceptance replay succeeds without Alibaba credentials or an OpenAI key and creates no new authority.

## Acceptance criteria
- [x] One eligible literature-backed `ResearchIntent` produces a semantically aligned Topic, ExperimentQuestion, and WorkOrder.
- [x] The existing product path resolves technical refs automatically and reaches a new PaperProject, real scientific evidence, Claim, and `ready_for_writing` Dossier.
- [x] Standard configured LLM calls require no extra approval; one explicit authorization covers real PAI cost/Jobs/temporary credentials.
- [x] Failure and replay resume from persisted owner state without repeating completed provider work.
- [x] Strict validation protects server-owned scientific values, immutable authority, paid-job idempotency, claim ceiling, and credential/cost boundaries.
- [x] A concise `LineageSummary` explains the semantic chain and records only key authority refs/hashes.
- [x] No historical authority graft, caller-authored result, secret, or raw large execution dump enters the repository.
