# Architecture

## Context and current state

The 2026-09-01 real-flow rehearsal completed a reject-and-replace topic-selection path through evidence review, research-gap selection, research-question convergence, value assessment, refinement, packaging, and conditional promotion. It produced durable retriever/provider accounting, strict Human decisions, and several verified recovery paths. FIND-020 and FIND-024 through FIND-026 are implemented and verified; their code, records, and Git-linked evidence remain current.

The remaining defects are local and observable:

- Evidence and question Human views omit decision-relevant content and can render material conflict, answerability risk, dependencies, and current value findings as no open risk.
- Evidence-landscape eligibility reads EvidenceUnit roles and coverage-row definitions but not the latest required coverage-assessment verdicts, so required `missing` rows can still appear advancement-ready.
- Public EvidenceMap and run-coordinator contracts do not fully match implemented routes and runtime payloads.
- Equivalent functional refs and one persisted selection-decision kind do not compose cleanly across existing boundaries.
- Regular research-question candidate generation does not use its implemented bounded Debate unless failure escalation occurs.
- Promotion support has an implemented bounded Debate outside the documented regular path, and conditional-promotion support exposes flat risk refs rather than decision-ready condition groups.
- User-facing operation still relies on opaque internal version/node labels.

T-150 now owns the independent evidence-convergence capability: full-library evidence onboarding, typed RetrievalRequests, linked Debate rounds, successor EvidenceMaps, and reusable ResolutionRoutes. Those contracts are no longer part of this task's implementation plan.

## Settled design and boundaries

- Checkpoint packets and their referenced current authorities remain the canonical Human decision input. Human/LLM views are deterministic projections and cannot become a second authority.
- A material conflict is Human-visible risk even when its severity does not independently block advancement. Existing `blocking` versus `material` gate semantics remain distinct.
- Required coverage assessment is explicit authority. A required `missing` verdict must remain visible and non-advancing unless an existing accepted-risk or research-obligation path covers it.
- The existing deterministic candidate and promotion gates remain the sole admission authorities. Debate produces support artifacts only.
- Research-question candidate generation uses one bounded regular Debate over the current frozen evidence. Retrieval-native continuation belongs to T-150 and is not required for this local policy repair.
- Conditional-promotion support may propose typed condition groups and early checks, but only an exact Human decision can accept or edit them. The unmapped-risk gate remains fail-closed.
- Current value assessment, disposition, replacement-contract content, and still-live risks supersede stale display text; resolved obligations are suppressed only when a current authority proves their resolution.
- Public contract repair describes existing behavior and routes. It does not create parallel endpoints or broaden runtime acceptance.
- Ref normalization may erase representational differences only after concrete owner, source, version, and title-card checks preserve provenance.
- Research rejection and TitleCard management remain separate authorities unless owner inspection proves an existing transition contract. A derived terminal research disposition is preferred to an invented management-state write.
- User-facing copy names research activities. Exact versioned paths and node IDs remain available in technical diagnostics and persisted contracts.
- Retriever calls, provider calls, SearchRun recording, EvidenceMap materialization, Human decisions, and deterministic transitions remain separate accounting events.

## Interfaces and contracts

- `GET /topic-selection/title-cards/{titleCardId}/stage-views/evidence_landscape?audience=human`: derives substantive evidence, conflict, claim-boundary, and action language from the current checkpoint packet and referenced EvidenceMap records.
- `GET /topic-selection/title-cards/{titleCardId}/stage-views/research_question?audience=human`: presents the actual question plus current gaps, dependencies, falsifiers, warnings, value findings, and disposition.
- `GET /topic-selection/title-cards/{titleCardId}/research-status`: reports the current executable/Human frontier rather than a stale static checkpoint transition.
- Evidence-landscape checkpoint materialization: consumes required coverage row intents and their latest bound assessments. `missing` is not inferred away by adjacent role-compatible EvidenceUnits.
- `POST /topic-selection/evidence-maps` public schema: describes the fields and enums already accepted and validated by the runtime route.
- Run-state and advance OpenAPI paths: document the existing registered coordinator routes and their current request/response contracts, including supported recovery inputs.
- Existing functional-ref admission: retains concrete lineage checks while normalizing only proven-equivalent optional representation or converging the selection-decision ref kind at its source.
- Research-question candidate Debate: reuses the existing bounded/divergent runtime, support-artifact admission, and one deterministic candidate gate. No RetrievalRequest or linked-round contract is introduced here.
- Promotion support: after policy confirmation, material-risk input uses the existing bounded Debate and risk-free input may use the documented deterministic path; both feed the same deterministic promotion gate.
- Conditional-promotion support: emits typed candidate groups containing complete risk-finding refs, proposed action, and early-check obligation. Human confirmation remains separate, and incomplete mapping still creates no decision authority.

## Migration and operation

Projection and OpenAPI changes are backward compatible with existing records. Gate changes consume already persisted coverage assessments and do not reinterpret historical Human decisions. Route-policy changes preserve current Debate artifacts and deterministic gates; rollback restores the former routing without deleting support or authority records.

The real-flow verification uses supported APIs and replaceable test state. Safe starts or restarts of the same local backend are covered by an already authorized operation and do not require repeated prompts. A different environment, external provider/cost, destructive effect, or new Human decision remains a separate authorization boundary.

T-149 and T-150 are separate checkpoint owners. Their source, bundle, registry, and generated-view changes must not be staged or committed with T-148.
