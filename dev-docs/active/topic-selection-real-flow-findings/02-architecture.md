# Architecture

## Context and current state

The 2026-09-01 real-flow rehearsal completed a reject-and-replace topic-selection path through evidence review, research-gap selection, research-question convergence, value assessment, refinement, packaging, and conditional promotion. It produced durable retriever/provider accounting, strict Human decisions, and several verified recovery paths. FIND-020 and FIND-024 through FIND-026 are implemented and verified; their code, records, and Git-linked evidence remain current.

Evidence/question Human projections now retain substantive decision inputs, answerability risks, and current value findings. Evidence eligibility consumes the latest bound required-coverage verdicts and requires exact Human acceptance for missing rows. N7 reconciles explicitly resolved Human review triggers while retaining independent candidate risks and current contract risk notes; unresolved recent-work visibility remains a local defect.

- Public EvidenceMap and run-coordinator contracts do not fully match implemented routes and runtime payloads.
- Equivalent functional refs and one persisted selection-decision kind do not compose cleanly across existing boundaries.
- Regular research-question candidate generation does not use its implemented bounded Debate unless failure escalation occurs.
- Promotion support has an implemented bounded Debate outside the documented regular path, and conditional-promotion support exposes flat risk refs rather than decision-ready condition groups.
- User-facing operation still relies on opaque internal version/node labels.

T-150 now owns the independent evidence-convergence capability: full-library evidence onboarding, typed RetrievalRequests, linked Debate rounds, successor EvidenceMaps, and one evidence-landscape ResolutionRoute pilot. Those contracts are no longer part of this task's implementation plan. T-148 still owns the concrete evidence-checkpoint truth and Human acceptance contract on which that later convergence path relies.

## Settled design and boundaries

- Checkpoint packets and their referenced current authorities remain the canonical Human decision input. Human/LLM views are deterministic projections and cannot become a second authority.
- A material conflict is Human-visible risk even when its severity does not independently block advancement. Existing `blocking` versus `material` gate semantics remain distinct.
- Required coverage assessment is explicit authority. A required `missing` verdict emits a deterministic checkpoint issue and remains non-advancing unless the Human's `advance` decision accepts the exact current coverage-row refs with rationale. The acceptance is part of the persisted checkpoint authority and downstream lineage; there is no pre-existing evidence-checkpoint accepted-risk path to reuse.
- The existing deterministic candidate and promotion gates remain the sole admission authorities. Debate produces support artifacts only.
- Research-question candidate generation uses one bounded regular Debate over the current frozen evidence. Retrieval-native continuation belongs to T-150 and is not required for this local policy repair.
- T-148 closes recent-work coverage honesty by making unresolved literature-freshness and near-duplicate risk visible at the evidence gate. T-150 owns systematic full-library retrieval and admission, so T-148 completion does not depend on T-150 having filled the gap.
- Conditional-promotion support may propose typed condition groups and early checks, but only an exact Human decision can accept or edit them. The unmapped-risk gate remains fail-closed.
- Current value assessment, disposition, replacement-contract content, and still-live risks supersede stale display text; resolved obligations are suppressed only when a current authority proves their resolution.
- The existing Human refinement payload accepts optional `resolved_review_triggers`, each naming an exact pending trigger, nonempty unique `resolved_by_fields` explicitly supplied in `updates`, and a rationale. N7 validates this before authority writes and stores cumulative resolutions plus the exact `applied_refinement_hash` in the existing selection decision's `admission_review`. Model output and prose similarity cannot author a resolution.
- Partial refinements inherit omitted fields from the preceding contract and answerability plan. Resolutions survive unchanged supporting fields; a semantic change to any declared supporting field reopens its trigger unless the current Human payload confirms it again. Admission, gate readmission, and reviewed reuse consume the resulting pending trigger list. Reviewed reuse requires the exact applied refinement; legacy decisions without the marker keep their original candidate-default matching semantics.
- Warnings and new checkpoint packets retain independent candidate risks alongside the active contract's risk notes; contract warnings reference its ID/version. The Human view also exposes pending review triggers. Exact replay returns persisted warnings without rewriting a historical contract, packet, or decision. No generic obligation store or historical backfill is introduced.
- Public contract repair describes existing behavior and routes. It does not create parallel endpoints or broaden runtime acceptance.
- Ref normalization may erase representational differences only after concrete owner, source, version, and title-card checks preserve provenance.
- Research rejection and TitleCard management remain separate authorities unless owner inspection proves an existing transition contract. A derived terminal research disposition is preferred to an invented management-state write.
- User-facing copy names research activities. Exact versioned paths and node IDs remain available in technical diagnostics and persisted contracts.
- Retriever calls, provider calls, SearchRun recording, EvidenceMap materialization, Human decisions, and deterministic transitions remain separate accounting events.

## Interfaces and contracts

- `GET /topic-selection/title-cards/{titleCardId}/stage-views/evidence_landscape?audience=human`: derives substantive evidence, conflict, claim-boundary, accepted-risk, and action language from the current frozen checkpoint packet.
- `GET /topic-selection/title-cards/{titleCardId}/stage-views/research_question?audience=human`: presents the actual question plus current gaps, dependencies, falsifiers, warnings, value findings, and disposition. Native packets without question text resolve only their exact referenced contract, with title/workspace/version checks; backfilled packets retain top-level claim boundaries. No packet fields or materialization hashes are rewritten.
- Overview, question, and value Human views resolve the same current assessment/disposition and verified risk-artifact summaries. A newer assessment hides an older disposition until its own decision exists; a non-advance disposition explains the required return path without replacing an earlier pending Human checkpoint or granting execution. Historical question/assessment lineages never supply current risks.
- `GET /topic-selection/title-cards/{titleCardId}/research-status`: adds read-only `current_value` and current-contract material-risk refs. The stage manifest reuses that selection: the newest current assessment for the exact checkpoint question is visible even before a disposition exists. `next_authorized_transition` retains checkpoint-grant semantics; the run coordinator remains execution authority.
- Evidence-landscape checkpoint materialization: consumes required coverage row intents and their latest bound assessments. `missing` is not inferred away by adjacent role-compatible EvidenceUnits and produces `REQUIRED_COVERAGE_MISSING` with exact current `coverage_row_intent` refs. The packet also records the selected latest assessment refs and verdicts.
- Evidence-landscape checkpoint decision: `advance` may carry `review_payload.accepted_coverage` with exact `coverage_row_refs` plus Human `rationale`. The service verifies equality against the current snapshot-bound issue refs, persists the acceptance in the existing decision record, and adds that accepted-coverage decision ref to the next checkpoint lineage. Bare, incomplete, duplicate, stale-version, or cross-title refs fail closed; `loopback` and `hold` retain the gap as required work.
- Evidence-landscape Human projection: checkpoint materialization freezes the EvidenceMap digest, source statements, interpretation payloads, and material-conflict details alongside coverage outcomes. The Human view projects role-labeled evidence, claim/falsification boundaries, exact missing rows, material conflicts, and any persisted Human acceptance from that packet; legacy packets retain a read-only generic fallback.
- `POST /topic-selection/evidence-maps` public schema: describes the fields and enums already accepted and validated by the runtime route.
- Run-state and advance OpenAPI paths: document the existing registered coordinator routes and their current request/response contracts, including supported recovery inputs.
- Existing functional-ref admission: retains concrete lineage checks while normalizing only proven-equivalent optional representation or converging the selection-decision ref kind at its source.
- Research-question candidate Debate: reuses the existing bounded/divergent runtime, support-artifact admission, and one deterministic candidate gate. No RetrievalRequest or linked-round contract is introduced here.
- Promotion support: after policy confirmation, material-risk input uses the existing bounded Debate and risk-free input may use the documented deterministic path; both feed the same deterministic promotion gate.
- Conditional-promotion support: emits typed candidate groups containing complete risk-finding refs, proposed action, and early-check obligation. Human confirmation remains separate, and incomplete mapping still creates no decision authority.

## Migration and operation

Projection and OpenAPI changes are backward compatible with existing records. Gate changes consume already persisted coverage assessments and add an explicit decision field rather than reinterpreting historical Human decisions or creating a generic obligation store. Route-policy changes preserve current Debate artifacts and deterministic gates; rollback restores the former routing without deleting support or authority records.

The real-flow verification uses supported APIs and replaceable test state. Safe starts or restarts of the same local backend are covered by an already authorized operation and do not require repeated prompts. A different environment, external provider/cost, destructive effect, or new Human decision remains a separate authorization boundary.

T-149 and T-150 are separate checkpoint owners. Their source, bundle, registry, and generated-view changes must not be staged or committed with T-148.
