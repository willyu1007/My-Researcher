# Project Changelog

Project: `main`

## Rules
- Append-only log (do not rewrite old entries).
- Prefer one line per event; link to tasks/features when possible.

## Entries
- 2026-05-16 Archived completed topic-selection task packages T-042 and T-044 through T-067; T-068 remains active as the current backend acceptance record.
- 2026-05-16 Extended T-068 with quality baseline acceptance for v1a/v1b/v1c synthetic offline replay datasets, metrics, diffs, and cross-stage guards.
- 2026-05-16 Extended T-068 acceptance with invariant/negative route coverage, route-contract checks, and isolated Prisma persistence evidence; final acceptance remains done.
- 2026-05-16 Reopened and reclosed T-068 under tightened node-level backend acceptance; added deterministic mock fixture with 27 decision-chain subtests and negative authority/boundary checks.
- 2026-05-16 Closed T-068 backend decision-chain acceptance; static checks, route coverage, isolated Prisma smoke, and hard invariant review accepted with no blocking backend defects.
- 2026-05-16 Opened T-068 topic-selection-backend-decision-chain-acceptance and mapped it to M-001 / F-001 / R-009.
- 2026-05-16 Closed T-042 governance/scope acceptance and T-046 v1c stage scope; backend decision-chain acceptance split to a follow-up task.
- 2026-02-07 Initialized project hub for `main`.
- 2026-07-10 task_id=T-132 slug=experiment-foundation-productization-closure event=registered dev_docs_path=dev-docs/active/experiment-foundation-productization-closure
- 2026-08-04 T-136/top-level evidence policy aligned: authoritative scientific results accept only new ExperimentFoundation-managed real executions; manual values and external experiment-result imports are prohibited, while external platforms remain valid only as EF-controlled execution adapters.
- 2026-08-05 T-136/top-level domain model aligned to option B: PaperImplementation and ExperimentFoundation are peer bounded contexts; PI owns research intent and scientific conclusion, EF owns reusable assets/execution/protocol validation/evidence qualification, and UI placement is deferred.
- 2026-08-05 T-136 release role aligned to option C: it gates the product's `M0-SCI` scientific capability; P0-P4 are `implementation_complete_unreleased`, P5 real acceptance is required, other M0 previews and UI remain independent, and `M0-SCI` is distinct from `M-001`.
- 2026-08-05 T-136 P0 freeze scope aligned to option B: scientific authority, canonical result semantics, preregistration, conclusion/idempotency contracts and schema decision freeze in P0; provider/workload/transport parameters remain late-bound within those contracts.
- 2026-08-05 T-136 canonical result aligned to option B: EF server-generates source/parser/derivation-bound typed summaries from identity-only commands, raw samples remain artifacts, eligibility is separate from scientific outcome, and valid negative/inconclusive evidence still reaches PI.
- 2026-08-05 T-136 assignment timing aligned: transport only fetches/base-validates, the EF worker performs provider-independent parsing before a short collection source-sealing transaction, valid-but-scientifically-unparseable collections remain diagnostic-only, and Result generation is a separate post-commit identity-only action directly bound to one canonical `scientific_source`.
- 2026-08-05 T-136 source persistence option B confirmed: reuse `ProvisionalOutputV2` with additive `scientific_source`, preserve historical diagnostics, add a direct relational Result source binding, reject JSON-only or multi-table ledger alternatives, and require exact schema review plus DB-SSOT before Prisma edits.
- 2026-08-05 T-136 minimal relational spine B2 confirmed: Result relationally persists collection/source id/hash/kind/class plus parser profile and derivation identities, enforces the same collection/Attempt chain, and keeps extensible typed scientific summaries/statistics/artifact refs inside the canonical hash-bound source manifest.
- 2026-08-05 T-136 strict statistic/uncertainty option B confirmed: use provider-independent discriminated unions with positive sample size, protocol-controlled explicit uncertainty, finite numeric constraints and fail-closed source sealing for missing or invalid required statistics.
- 2026-08-05 T-136 observation identity/order/hash option O-B confirmed: derive stable observation ids from preregistered RunCell protocol slots, canonicalize by protocol ordinal, treat changed content as conflict under the same identity, and separate provider/source/derivation/Result hash domains.
- 2026-08-16 task_id=T-136 slug=scientific-evidence-to-paper-closure event=status from=in-progress to=done
- 2026-08-16 task_id=T-124 slug=paper-implementation-productization-hardening event=status from=in-progress to=done
- 2026-08-16 task_id=T-137 slug=promoted-topic-to-scientific-dossier-canary event=registered dev_docs_path=dev-docs/active/promoted-topic-to-scientific-dossier-canary
- 2026-08-16 task_id=T-137 slug=promoted-topic-to-scientific-dossier-canary event=status from=planned to=in-progress
- 2026-08-17 task_id=T-138 slug=topic-to-paper-implementation-desktop-handoff event=registered dev_docs_path=dev-docs/active/topic-to-paper-implementation-desktop-handoff
- 2026-08-17 task_id=T-138 slug=topic-to-paper-implementation-desktop-handoff event=status from=planned to=in-progress
- 2026-08-17 task_id=T-138 slug=topic-to-paper-implementation-semantic-handoff event=status from=in-progress to=done
- 2026-08-22 task_id=T-139 slug=paper-implementation-to-scientific-dossier-semantic-continuation event=registered dev_docs_path=dev-docs/active/paper-implementation-to-scientific-dossier-semantic-continuation
- 2026-08-23 task_id=T-140 slug=topic-semantics-to-core-motive-bootstrap event=registered dev_docs_path=dev-docs/active/topic-semantics-to-core-motive-bootstrap
- 2026-08-24 task_id=T-142 slug=evidence-board-to-validation-cycle-semantic-handoff event=registered dev_docs_path=dev-docs/active/evidence-board-to-validation-cycle-semantic-handoff
- 2026-08-24 task_id=T-142 slug=evidence-board-to-validation-cycle-semantic-handoff event=status from=in-progress to=done
- 2026-08-24 task_id=T-143 slug=validation-cycle-handoff-authority-recovery-hardening event=registered dev_docs_path=dev-docs/active/validation-cycle-handoff-authority-recovery-hardening
- 2026-08-24 task_id=T-144 slug=validation-cycle-handoff-deep-cleanup event=registered dev_docs_path=dev-docs/active/validation-cycle-handoff-deep-cleanup
