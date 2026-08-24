# Promoted Topic to Scientific Dossier Canary — Roadmap

## Goal
- Prove one simple, semantically coherent and traceable product path from retrieval-ready literature through Topic Selection, PaperProject, PaperImplementation, real ExperimentFoundation evidence, and a ready ImplementationDossier.

## Planning-mode context and merge policy
- Runtime mode signal: Default
- User confirmation: yes; the user confirmed T-137 creation and then explicitly required the roadmap to favor simple flow, normal-case robustness, LLM-readable semantics, controlled parameters, and continuity.
- Host plan artifact path(s): (none)
- Requirements baseline: the user-confirmed design principles, the four-module assessment, and completed T-128/T-132/T-136 evidence.
- Merge method: set-union
- Conflict precedence: latest user-confirmed > existing roadmap > model inference
- Repository SSOT output: `dev-docs/active/promoted-topic-to-scientific-dossier-canary/roadmap.md`
- Mode fallback used: non-Plan default applied: yes

## Input sources and usage

| Source | Used for | Trust | Decision |
|---|---|---|---|
| User design principles, 2026-08-16 | Flow, validation, parameter, and semantic-continuity policy | highest | Replace the earlier compliance-heavy plan. |
| T-128 | Existing non-debate topic product path | high | Reuse; do not enable debate. |
| T-132 | Existing real two-cell execution and recovery path | high | Reuse execution discipline; never trust-upgrade diagnostic history. |
| T-136 | Existing scientific Result-to-Dossier authority | high | Reuse services as a dependency; do not reopen or reuse historical authority. |
| Earlier T-137 roadmap | Initial scope and safety boundaries | medium | Preserve task ownership and hard scientific safeguards; remove excess gates and census work. |

## Design principles for this task
- **Simple flow:** one default path with three stages: Prepare, Run, Accept.
- **Normal-case robustness:** completed work resumes from persisted authority; exceptional recovery does not dominate the normal workflow.
- **LLM-readable state:** modules exchange short semantic objects and stable refs, not long caller-assembled technical payloads.
- **Controlled parameters:** every parameter has one assigner and one named consumer; derived values stay server-owned.
- **Semantic continuity:** the experiment must genuinely test the selected topic, and the final Claim must follow from the resulting evidence.
- **Focused validation:** enforce hard invariants at authority or paid-effect boundaries; let LLM stages handle bounded semantic interpretation.

## Non-goals
- Do not reopen T-136, implement work inside T-043, or start T-129 C-2/C-3.
- Do not add Literature-to-EF automatic asset discovery, desktop UI, schema migrations, new domain authorities, providers, BYOC, multi-user delivery, automatic tuning, or prose generation.
- Do not accept caller-authored scientific values or external result imports.
- Do not add per-step approvals, a general workflow engine, a large parameter surface, or a second manifest authority.
- Do not require full-chain replay of completed LLM work merely to demonstrate safety.

## Top-level decisions

| Decision | Simplified rule |
|---|---|
| Semantic input | Use one task-level `ResearchIntent`: research goal, scope/constraints, and desired evidence. It is a semantic handoff, not a new persisted authority schema. |
| Source selection | Apply hard eligibility filters, then let the LLM choose the best semantically aligned source/topic with a visible rationale. Human override is optional unless no clear candidate exists. |
| Topic path | Use the existing non-debate product path and its existing human promotion authority; add no extra confirmation. |
| Execution authorization | Standard configured LLM calls use existing product budgets. One explicit authorization is required only for temporary cloud credentials and real paid PAI execution. |
| Validation | Strict checks cover ownership/current version, server-owned scientific values, paid-job idempotency, immutable scientific authority, claim ceiling, and credential/cost bounds. |
| Recovery | Resume from the latest persisted owner record. Re-run only the incomplete step; never replay the whole chain by default. |
| Acceptance evidence | Produce a concise `LineageSummary` with semantic rationale and key authority refs/hashes, not an exhaustive cross-table manifest. |
| Scope expansion | A need for a new schema, authority, API, UI, or provider is a stop condition requiring a separate decision. A small existing-path correctness fix may remain in T-137. |

## Open questions and assumptions

### Open questions resolved during Prepare
- `LIT-0328` is the primary source; `LIT-0190`, `LIT-0252`, and `LIT-0765` provide benchmark, challenge, and measurement context.
- The executable question is the existing SciFact exact-token `top-k 10` versus `top-k 5` comparison using server-owned `micro_recall_ppm`.
- Existing services compose, but current E2E runners embed incompatible fixture/P313/T132/T136 semantics. One thin fixed-sequence T-137 coordinator is required.

### Deferred execution input
- The exact real-PAI cost ceiling, Job ceiling, credential lifetime, and execution window are assigned once immediately before real execution.

### Assumptions
- Existing Topic Selection, PI, and EF product paths remain the sole domain writers.
- The chosen topic must be semantically compatible with existing executable EF assets; no artificial project-to-experiment binding is accepted.
- Raw provider evidence remains outside the repository; the repository stores concise summaries and hashes.

## Merge decisions and conflict log

| ID | Earlier plan | Revised decision | Reason |
|---|---|---|---|
| S1 | Five phases and four named gates | Three stages and one external authorization | Reduce ceremony and keep the happy path obvious. |
| S2 | Exact package before each external stage | Normal configured LLM calls run normally; exact approval only for real PAI/temporary credentials | Avoid unnecessary authorization. |
| S3 | Exhaustive ids/hashes/sequences manifest | Semantic `LineageSummary` plus key authority refs/hashes | Preserve auditability without duplicating the domain model. |
| S4 | Full protected-table/effect census | Scoped paid-effect and key-authority counts | Check only meaningful side effects. |
| S5 | Full-chain exact replay | Resume-first plus idempotency at paid/authority boundaries | Robustness should optimize real recovery, not ceremonial replay. |

## Scope and impact
- Affected modules: existing Literature/TitleCard reads, Topic Selection non-debate run, PaperProject intake, PI experiment admission/closure, EF execution/validation, and a thin canary coordinator only if existing runners cannot compose cleanly.
- External interfaces: existing public/product routes and services only; no new endpoint is planned.
- Data impact: one new append-only product lineage and its normal owner records; no migration is planned.
- Compatibility: existing task evidence, APIs, capability defaults, and legacy readers remain unchanged.

## Project structure change preview (may be empty)

### Existing areas likely to change
- Modify:
  - `dev-docs/active/promoted-topic-to-scientific-dossier-canary/`
  - `.ai/scripts/` only if a thin coordinator/resume command is required.
  - `apps/backend/src/` only for a concrete minimal defect in the existing path.
- Delete: (none)
- Move/Rename: (none)

### New additions
- New module(s): (none planned)
- New API(s): (none planned)
- Task-local coordinator: one fixed-sequence T-137 runner using existing product routes/services; exact path is chosen during implementation to minimize imports and duplication.

## Semantic spine

```text
ResearchIntent
  → TopicDecision / PaperProject
  → ExperimentQuestion / WorkOrder
  → server-owned ScientificFacts / EvidenceSummary
  → Claim / Dossier
```

- LLM stages own semantic drafting and explanation.
- Existing services own identity resolution, persistence, hard gates, and scientific authority.
- Technical refs/hashes are resolved by the system and carried automatically; users and LLMs do not manually copy them between steps.

## Stages

1. **Prepare**
   - Select one eligible, semantically aligned source lane.
   - Form one `ResearchIntent` and derive an executable `ExperimentQuestion` using existing semantic artifacts.
   - Discover the smallest composition path and add no new product abstraction unless a concrete blocker requires it.
   - Acceptance: a default path is selected with a clear rationale and no external paid effect.
2. **Run**
   - Execute the existing non-debate Topic → PaperProject → PI → EF → Evidence → Dossier path.
   - Use existing product defaults for ordinary LLM calls.
   - Obtain one explicit authorization immediately before real PAI execution.
   - Resume from the latest persisted step after failure.
   - Acceptance: the same semantic question reaches a ready Dossier without manual ref or scientific-value grafting.
3. **Accept**
   - Verify semantic alignment and the small set of hard authority boundaries.
   - Produce a concise `LineageSummary` and scoped side-effect counts.
   - Run verification proportional to actual code changes.
   - Acceptance: a fresh reader or LLM can explain what was asked, what was run, what was observed, and why the Claim follows.

## Verification and acceptance criteria
- The chosen literature, topic, ExperimentQuestion, scientific evidence, and Claim are semantically consistent.
- The path uses existing product writers and resolves technical refs automatically.
- No caller-authored scientific number, external result import, or historical authority graft is accepted.
- One real PAI authorization covers the bounded Job/cost/credential window; ordinary configured LLM steps add no approval.
- Paid Job creation and immutable scientific writers are idempotent.
- A stopped run resumes from the latest persisted owner record without repeating completed provider work.
- The final Dossier is `ready_for_writing` and trace-complete.
- `LineageSummary` contains only key anchors: source Literature/TitleCard, PaperProject, WorkOrder, Run/Attempt/Result, EvidenceCandidate/REU, Closure, and Dossier.
- Tests and typechecks cover changed behavior; full Node 20 regression runs only when the implementation surface warrants it.
- Capabilities return to their default resting state and temporary credentials are removed.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Semantic mismatch hidden by technically valid refs | Require an LLM-readable rationale from source → question → experiment → claim, plus existing server claim ceilings. |
| Too many exceptional checks obscure the happy path | Keep exceptional recovery behind resume logic and expose one default command/path. |
| New coordinator becomes a workflow framework | Limit it to sequencing existing calls and deriving state from existing authority; no generic DAG/config language. |
| Duplicate paid work | Keep exact idempotency only at provider Job and immutable scientific-writer boundaries. |
| Discovered blocker expands architecture | Stop on schema/authority/API/UI/provider expansion and propose a separate scope. |
| Raw evidence bloats the repo | Keep raw artifacts outside; retain short summaries and hashes. |

## Rollback and recovery
- Before real PAI execution, rollback means reverting task-owned code/docs only.
- During execution, stop before the next side effect, clear temporary credentials, and restore process-scoped capabilities.
- Preserve accepted provider/database history append-only; recovery resumes from it instead of deleting it.

## Optional detailed documentation layout (convention)

```text
dev-docs/active/promoted-topic-to-scientific-dossier-canary/
  roadmap.md
  00-overview.md
  01-plan.md
  02-architecture.md
  03-implementation-notes.md
  04-verification.md
  05-pitfalls.md
```

## To-dos
- [x] Replace compliance-heavy flow with three stages.
- [x] Reduce authorization to the real PAI/temporary-credential boundary.
- [x] Replace exhaustive manifest/census with semantic spine and key lineage.
- [x] Make resume-first the recovery model.
- [x] Keep strict checks at scientific authority and paid-effect boundaries.
- [x] Complete read-only Prepare discovery and lock the default semantic lane.
- [ ] Implement the fixed-sequence coordinator through the pre-PAI readback boundary.
- [ ] Obtain one exact real-PAI authorization when Prepare is complete.
