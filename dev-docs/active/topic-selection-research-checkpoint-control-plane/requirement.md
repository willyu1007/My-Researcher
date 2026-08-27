# Topic Selection Research Checkpoint Control Plane — Requirements

## Sources and ownership

- Owner / confirmer: User
- Source documents: Current conversation; `docs/context/process/topic-selection-workflow-matrix.md`; archived T-042, T-088, T-089, T-115, T-123, T-127, and T-128 outcomes
- Host plan input: none

## Required outcome

Upgrade topic selection so product-owned, snapshot-bound research checkpoints, academic-quality gates, and durable human objections govern every production research transition from evidence review through promotion, while API clients remain executors rather than semantic authorities.

## Scenarios and detailed acceptance

### Evidence landscape review
- Actor / caller: Researcher through any API client
- Trigger: A current EvidenceMap and its strength/readiness material are available before NeedCandidate generation.
- Expected flow: The product assembles a current evidence-landscape packet, exposes unresolved coverage and nearest-work limitations, and requires an explicit human decision before downstream generation.
- [x] Evidence review cannot advance when direct-neighbor coverage, disconfirming evidence, source quality, or required coverage roles fail the product policy.
- [x] A stale packet or decision cannot authorize a changed EvidenceMap or literature snapshot.

### Gap selection
- Actor / caller: Researcher through any API client
- Trigger: A candidate pool and need-validation material are ready.
- Expected flow: The product presents genuinely distinct candidates, nearest-work collision evidence, rejected alternatives, and unresolved objections before reusing the existing human-confirmed need authority.
- [x] Production research cannot validate a lone unopposed NeedCandidate or treat wording variants as independent candidates.
- [x] Human confirmation remains the authority for the selected gap and is bound to the reviewed candidate-pool snapshot.

### Research question confirmation
- Actor / caller: Researcher through any API client
- Trigger: A ResearchSlice selection and TopicQuestionContract with answerability and falsification material are ready.
- Expected flow: The product checks mechanism identifiability, proxy definitions, confounds, claim ceiling, and open objections, then requires an explicit human confirmation before value assessment.
- [x] A user objection that rejects the research object or its academic sufficiency makes the affected slice/question stale and requires the product-selected loopback.
- [x] Rewording or narrative enrichment alone cannot resolve a blocking academic objection.

### Promotion review
- Actor / caller: Researcher through any API client
- Trigger: TopicPackage and promotion support are current.
- Expected flow: Promotion reuses the existing human PromotionDecision authority after product gates reconcile risks, required actions, user objections, and independent criticism.
- [x] Every `pass_with_risk` that can affect advancement maps to an accepted risk or a required action.
- [x] Open blocking objections or incomplete required actions prevent promotion and PaperProject intake.

### API-first research control
- Actor / caller: Codex, a future GUI, or another API client
- Trigger: The client asks for the current topic-selection state or attempts a transition.
- Expected flow: The product returns the current checkpoint, packet, allowed actions, blockers, and next authorized transition; transition guards reject bypass attempts.
- [x] No Codex skill, prompt, GUI behavior, or conversation memory is required to preserve checkpoint semantics.
- [x] Production exposes only the research path; rehearsal remains a test/scenario concern and is not a runtime product mode.

### Acceptance-derived stage communication and authorization cadence
- Actor / caller: Researcher operating topic selection through Codex or another client
- Trigger: Work enters, advances, loops back from, or closes a major semantic stage.
- Expected flow: The researcher sees the evolving research object in ordinary domain language, receives a stable human-readable stage result, and can authorize bounded progress to the next genuine human decision without approving each internal node or routine local operation.
- [ ] Produce one concise, derived Markdown result for each major semantic stage—overview, evidence landscape, research gap, research question, value/feasibility, topic package, and promotion review—rather than one file per internal node.
- [ ] Each human-facing file leads with conclusions, evidence and counterevidence, alternatives and rejection reasons, claim/falsification boundaries, open risks, recommendation, and the exact decision requested; record IDs, hashes, node names, and replay material live in a secondary technical trace section.
- [ ] The Markdown view is generated from canonical product authorities and remains a projection/export rather than a second editable content authority.
- [ ] A bounded instruction such as “advance to the next human decision point” covers routine reads, local deterministic writes, short or multi-minute local jobs, verification, recoverable retries, and restarts of the already selected local backend environment. These actions may emit progress updates but do not pause for repeated authorization while effect class and scope remain unchanged.
- [ ] Stop for exact confirmation when an action changes research meaning or human authority, invokes a provider or material cost/external acquisition, is destructive or control-sensitive, materially expands scope, changes the target environment, or encounters an ambiguous recovery branch.
- [ ] Authorization decisions are based on effect and authority boundaries, not elapsed time, HTTP method, internal node count, or implementation vocabulary.
- [ ] Decide whether LLM consumers need a separate, substantially larger artifact plane, and define its authority, granularity, retention, retrieval, and relationship to the concise human-facing files before implementation planning.

This section records Phase 6 acceptance findings and follow-up input. It does not add GUI composition or client-specific semantic authority to the current implementation scope; implementation ownership and roadmap placement remain to be decided after the artifact discussion.

## Boundaries

### In scope
- Product-native evidence, gap, question, and promotion checkpoint control.
- Snapshot currentness, supersession, decision binding, and downstream transition guards.
- Product-owned checkpoint packets and an API-first research-status projection.
- New evidence-landscape and topic-question human decision authorities where current authorities do not exist.
- Reuse of existing HumanConfirmNeed, ResearchSliceSelectionDecision, and HumanPromotionDecision authorities.
- Durable user objections, required loopbacks, academic-quality gates, and risk-to-action consistency.
- OpenAPI, shared contracts, backend services/repositories/routes, context documentation, migrations when required, and focused/full-chain verification.
- Compatibility and cutover behavior for existing topic-selection records.

### Out of scope
- GUI or reviewer-workbench composition.
- Codex skill behavior as a source of product semantics.
- Writing-center or paper-writing workflows.
- Experiment execution beyond guarding PaperProject intake eligibility.
- Provider-debate activation, prompt calibration, or external-corpus work owned by T-129.
- A rehearsal or reduced-quality production mode.

## Constraints and dependencies

- Existing EvidenceMap, ValidatedNeed, ResearchSlice, TopicQuestionContract, TopicPackage, and PromotionDecision objects remain their domain authorities; checkpoint control must not duplicate their content authority.
- Human decisions record the user's exact choice and remain snapshot-bound and append-only according to existing control-plane conventions.
- Business code continues through repository interfaces and Prisma remains the persisted-schema source of truth.
- Current topic-selection workflow IDs, traceability, replay, and hash semantics must remain recoverable or receive an explicit versioned cutover.
- Tests use scenario fixtures and the same guarded APIs; test needs do not create a product runtime mode.

## Unresolved before planning

| Question or assumption | Owner | Impact if unresolved or wrong | Validation / due point |
|---|---|---|---|
| How should pre-cutover current packages, promotion decisions, and active bridges acquire or satisfy the new checkpoint chain? | User after repository discovery and recommendation | Determines migration shape, legacy advance rules, and whether current records are blocked, grandfathered, or explicitly reviewed. | Phase 1 cutover review before implementation kickoff. |
| Which evidence and candidate-quality rules are hard blockers versus configurable advisory triggers? | User after policy inventory and negative-case design | Changes production advance behavior and acceptance tests. | Phase 1 policy proposal before quality-gate implementation. |
| Should LLM consumers read a separate high-volume artifact set, a structured projection over canonical owners, or both? | User after discussion and repository recommendation | Determines whether the human Markdown can remain concise without starving later agents of evidence, alternatives, failure history, and exact lineage. | Acceptance follow-up alignment before implementation ownership is assigned. |
| What exact stage-level authorization envelope may cover local deterministic work, backend lifecycle, retries, and verification without a new pause? | User after safety-boundary proposal | Determines interaction speed while preserving hard stops for human authority, provider/cost, destructive/control, environment, and scope changes. | Acceptance follow-up alignment before operator or product changes. |

## Confirmation

- [x] Outcome, scenarios, boundaries, and constraints are confirmed or their unresolved owners are explicit.
- [x] The current goal and relevant acceptance references have been transferred to `01-status.md`.
