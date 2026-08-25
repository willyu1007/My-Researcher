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

## Confirmation

- [x] Outcome, scenarios, boundaries, and constraints are confirmed or their unresolved owners are explicit.
- [x] The current goal and relevant acceptance references have been transferred to `01-status.md`.
