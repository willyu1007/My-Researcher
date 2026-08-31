# Topic Selection Research Checkpoint Control Plane — Requirements

## Sources and ownership

- Owner / confirmer: User
- Source documents: Current conversation; `docs/context/process/topic-selection-workflow-matrix.md`; archived T-042, T-088, T-089, T-115, T-123, T-127, and T-128 outcomes
- Host plan input: none

## Required outcome

Deliver a product-owned, snapshot-bound checkpoint control plane from evidence review through promotion, with academic-quality gates, durable dissent, honest stopping, and human authority enforced independently of the API client. Add one early-gap divergence seam as an optional support-only Research Arena, and require new decision-quality evidence before any production activation or later-stage generalization.

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

### Evidence-grounded divergence and convergence
- Actor / caller: Product orchestration using bounded retrieval and advisory Codex/model participants, with the researcher retaining semantic authority.
- Trigger: Work reaches the pre-HumanConfirmNeed gap/need portfolio and the current framing could exclude a better topic or conceal a reason to stop.
- Expected flow at the accepted T-147 boundary: independent scout and killer roles may receive claim-bearing role-specific EvidencePackets, preserve pre-exposure positions, challenge the portfolio, and converge to traceable advice without changing checkpoint or human authority.
- [x] New product-v2 role records require exact inspectable EvidencePacket excerpts, retrieval provenance, exposure identity, invocation audit, and replay identity; inherited UUIDs or summaries alone fail admission.
- [x] Opportunity-scout and prior-art/topic-killer outputs are durable before synthesis, and unresolved minority reports remain visible.
- [x] The two-layer disposition contract supports set-level `selected`, `none_viable`, `evidence_expansion_required`, or `reframe_required` and candidate-level `selected`, `parked`, or `dropped`; zero viable candidates is a valid research outcome.
- [x] Material objections and advancement risks retain stable refs through downstream packets and promotion until explicitly disposed.
- [x] Another arena version requires a recorded evidence, candidate, constraint, or human-objective delta; no-delta retry and a third attempt fail closed.
- [x] Exactly one path remains active; parked alternatives retain evidence, reason, and reopening conditions for serial delta-gated return.
- [x] Mechanical snapshot, package, publication, and gate-wiring work remains deterministic and does not manufacture alternatives or invoke full debate.
- [x] Enumerated evidence-backed drop reasons and exact accept/override/defer/non-advance human labels are supported while Arena advice remains optional and support-only.

#### Explicit limitations of the accepted outcome

- Current history does not contain a qualifying live product-v2 lineage replay; the implemented product-v2 admission/replay contract is proven by focused and real-Postgres verification, not by retroactively relabeling legacy evidence.
- Decision-quality calibration did not cover dominance pairs, either perturbation direction, explained override distributions, a real decision improvement, or measured work avoided. The Arena therefore remains `support_only=true` and optional.
- Empirical-skeptic admission, question-design or comparative-value arenas, production activation, provider/multi-provider execution, and prompt calibration are not claimed by T-147.

### Acceptance-derived stage communication and authorization cadence
- Actor / caller: Researcher operating topic selection through Codex or another client
- Trigger: Work enters, advances, loops back from, or closes a major semantic stage.
- Expected flow: The researcher sees the evolving research object in ordinary domain language, receives a stable human-readable stage result, and can authorize bounded progress to the next genuine human decision without approving each internal node or routine local operation.
- [x] Produce one concise, derived Markdown result for each major semantic stage—overview, evidence landscape, research gap, research question, value/feasibility, topic package, and promotion review—rather than one file per internal node.
- [x] Each human-facing file leads with conclusions, evidence and counterevidence, alternatives and rejection reasons, claim/falsification boundaries, open risks, recommendation, and the exact decision requested; record IDs, hashes, node names, and replay material live in a secondary technical trace section.
- [x] The Markdown view is generated from canonical product authorities and remains a projection/export rather than a second editable content authority.
- [x] A bounded instruction such as “advance to the next human decision point” covers routine reads, local deterministic writes, short or multi-minute local jobs, verification, recoverable retries, and restarts of the already selected local backend environment. These actions may emit progress updates but do not pause for repeated authorization while effect class and scope remain unchanged.
- [x] Stop for exact confirmation when an action changes research meaning or human authority, invokes a provider or material cost/external acquisition, is destructive or control-sensitive, materially expands scope, changes the target environment, or encounters an ambiguous recovery branch.
- [x] Authorization decisions are based on effect and authority boundaries, not elapsed time, HTTP method, internal node count, or implementation vocabulary.
- [x] Use three derived views over canonical product owners: a manifest/current-pointer surface, a substantially larger LLM working plane, and concise human-facing stage files. Prefer manifest-first read-time projection; a persisted working-plane corpus is admitted only if projection cost is proven prohibitive. Define exact storage, retention, and regeneration contracts before implementation planning.

#### Accepted divergence boundary and deferred ambitions

- T-147 delivers the manifest, LLM, and human projections plus the support-only early-gap Arena contracts. It does not claim a complete LLM working plane or active arena at every semantic stage.
- Search-versus-defense separation, honest no-topic outcomes, two-layer dispositions, delta-gated loopback, and one-active-path semantics are implemented at the early-gap contract boundary; effectiveness across question design and comparative value remains unproven.
- Product-v2 evidence and agent-audit contracts require role-specific evidence, independent exposure, durable provenance, and bounded termination. A conversation or Codex subagent completion alone is not product debate evidence.
- Prompt neutrality, N8 comparative-value burden, provider calibration, empirical-skeptic admission, and generic agent management remain outside the accepted T-147 completion boundary and are not silently treated as finished.
- Any production activation or later-stage Arena requires TS-I18/TS-I19 repair, a separately reviewed calibration batch, a new source-bound report, and a new researcher decision.

Detailed live evidence and design candidates are preserved in `artifacts/phase6-interaction-artifact-and-divergence-findings.md`. This section records Phase 6 acceptance findings and follow-up input. It does not add GUI composition or client-specific semantic authority to the current implementation scope; implementation ownership and roadmap placement remain to be decided after the artifact and divergence discussion.

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
- Claim-bearing EvidencePacket resolution, product-v2 role/provenance admission, and a lightweight snapshot-bound early-gap ResearchArena coordination contract that remains optional and support-only.
- Zero-to-many candidate portfolios, successful stop/park/reframe outcomes, loop-delta admission, durable minority reports, and risk carry to promotion at the implemented early-gap boundary.
- Derived manifest/LLM/human stage views, effect-based authorization, calibration-report infrastructure, and an honest negative adoption decision.

### Out of scope
- GUI or reviewer-workbench composition.
- Codex skill behavior as a source of product semantics.
- Writing-center or paper-writing workflows.
- Experiment execution beyond guarding PaperProject intake eligibility.
- Provider-debate activation, prompt calibration, or external-corpus work owned by T-129.
- Production activation, live product-v2 decision-quality claims, or Arena generalization beyond the early-gap boundary without a separate evidence-gated task.
- A rehearsal or reduced-quality production mode.
- A generic agent platform, unrestricted agent browsing, debate at deterministic mechanical nodes, automatic parallel execution of every branch, or provider/multi-provider activation owned by T-129.

## Constraints and dependencies

- Existing EvidenceMap, ValidatedNeed, ResearchSlice, TopicQuestionContract, TopicPackage, and PromotionDecision objects remain their domain authorities; checkpoint control must not duplicate their content authority.
- Human decisions record the user's exact choice and remain snapshot-bound and append-only according to existing control-plane conventions.
- Business code continues through repository interfaces and Prisma remains the persisted-schema source of truth.
- Current topic-selection workflow IDs, traceability, replay, and hash semantics must remain recoverable or receive an explicit versioned cutover.
- Tests use scenario fixtures and the same guarded APIs; test needs do not create a product runtime mode.

## Resolved adoption decision

| Question or assumption | Owner | Impact if unresolved or wrong | Validation / due point |
|---|---|---|---|
| Should the early-gap Arena activate, remain advisory, or retire? | User | Resolved as `remain_advisory`: Arena remains optional and support-only, Phase 10D is skipped, and future activation requires a separate evidence/protocol delta, report, and researcher decision. | Resolved in Phase 10C and accepted for task closeout in Phase 10E on 2026-08-31. |

## Confirmation

- [x] Outcome, scenarios, boundaries, and constraints are confirmed or their unresolved owners are explicit.
- [x] The current goal and relevant acceptance references have been transferred to `01-status.md`.
