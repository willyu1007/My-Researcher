# Topic Selection Research Checkpoint Control Plane — Requirements

## Sources and ownership

- Owner / confirmer: User
- Source documents: Current conversation; `docs/context/process/topic-selection-workflow-matrix.md`; archived T-042, T-088, T-089, T-115, T-123, T-127, and T-128 outcomes
- Host plan input: none

## Required outcome

Upgrade topic selection so evidence-grounded divergence precedes convergence at research-semantic decisions and product-owned, snapshot-bound checkpoints, academic-quality gates, durable dissent, and honest stopping govern every production transition from evidence review through promotion, while API clients remain executors rather than semantic authorities.

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
- Trigger: Work reaches an evidence/search-scope, gap/need-portfolio, question-design, or comparative-value decision where the current framing could exclude a better topic or conceal a reason to stop.
- Expected flow: Independent roles receive claim-bearing role-specific EvidencePackets, record pre-exposure positions, challenge candidates against actual evidence, and converge to a traceable zero-to-many portfolio disposition before downstream topic defense.
- [ ] Persisted refs resolve to the exact excerpts each role can inspect; inherited UUIDs or summaries alone do not satisfy evidence grounding.
- [ ] Opportunity-scout and prior-art/topic-killer outputs — and empirical-skeptic outputs once that role is admitted — are durable before portfolio synthesis and preserve unresolved minority reports.
- [ ] Dispositions are two-layered: a set-level outcome (`selected`, `none_viable`, `evidence_expansion_required`, `reframe_required`) and per-candidate dispositions (`selected`, `parked`, `dropped`). The checkpoint, not the generating agent, routes each set-level outcome to its next step — with stop a first-class route alongside expansion and reframe — so a bare `drop` cannot terminate the wrong level of research object. Zero viable candidates is a successful set-level outcome when evidence and reopening conditions are recorded; a fork recommendation is recorded as `parked` plus a surfaced recommendation.
- [ ] Every material objection or risk survives downstream by stable ref until it is repaired, accepted, looped back, parked, or dropped.
- [ ] Another arena version is admitted only for a recorded evidence, candidate, constraint, or human-objective delta.
- [ ] Exactly one research path is active; alternatives persist as snapshot-bound parked candidates with evidence refs, semantic group, parking reason, and reopening conditions, and return to a parked candidate is serial and delta-gated. A second active lineage (fork) is out of scope for this task.
- [ ] Mechanical snapshot, package, publication, and gate-wiring work does not manufacture alternatives or invoke full debate.
- [ ] Shadow calibration precedes production activation without requiring absolute value labels: dominance pairs from recorded lineage history, evidence-perturbation counterfactuals, and accumulated human overrides validate stop/continue quality, and justified stopping is a success.
- [ ] A `drop`/`dropped` recommendation carries one of the enumerated evidence-backed drop-reason codes — near-isomorphic prior art without discernible contribution difference, unidentifiable or unfalsifiable core mechanism, data/evaluation conditions that defeat the claim, strict dominance by a visible portfolio candidate, or no viable path after one delta-bearing expansion. Shadow mode may only recommend; human confirmation accumulates per-reason-code decision labels that annotate the research action under current evidence, not objective topic value, and overrides are accounted per reason code.

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
- [ ] Use three derived views over canonical product owners: a manifest/current-pointer surface, a substantially larger LLM working plane, and concise human-facing stage files. Prefer manifest-first read-time projection; a persisted working-plane corpus is admitted only if projection cost is proven prohibitive. Define exact storage, retention, and regeneration contracts before implementation planning.
- [ ] The LLM working plane preserves evidence locators and roles, alternatives and rejections, nearest-work conflicts, assumptions/confounds/falsifiers, loopback and failure history, open risks/objections/rechecks, exact versions, supersession, and debate artifacts; consumers load a manifest first and retrieve only task-relevant slices.
- [ ] Separate topic search from topic defense. Before expensive value/package work, the product must be able to continue, reframe, expand scope, or abandon the current topic; “no worthwhile topic in the current scope” is a valid successful outcome.
- [ ] A loopback that questions topic value must reopen a genuinely divergent candidate arena rather than only repair wording, constraints, or evidence inside the selected scope.
- [ ] Prompt and consumer contracts are disposition-neutral: their objective is to select the best-supported action rather than preserve the current topic, and `park`, `drop`, `switch_scope`, or a zero-viable-candidate result are successful research-management outputs rather than generation failures or blockers.
- [ ] N4/N6 generation no longer forces at least one candidate or instructs every candidate to pass its deterministic gate. A bounded “none viable” result must carry evidence, rejection reasons, confidence, and reopening conditions into an explicit stop, scope-expansion, or upstream-divergence route.
- [ ] N8 continuation bears an explicit evidence burden across significance, nearest-work novelty, discriminating falsifiability, feasibility, claim ceiling, and opportunity cost against the best visible alternative. Numeric score and narrative defensibility alone cannot establish comparative research value.
- [ ] Debate prompts define distinct role objectives and prohibitions, independent pre-exposure positions, evidence scopes, allowable terminal dispositions, preservation of unresolved fatal criticism and minority reports, and one bounded termination rule; they must not require every criticism to be repaired into an advancing answer.
- [ ] Prompt calibration evaluates dominance pairs and perturbation variants drawn from recorded lineage history against expected continue/reframe/expand/park/drop behavior before provider debate activation; absolute worthwhile labels are not required. Real multi-provider execution remains a separately gated concern rather than a substitute for role and contract quality.
- [ ] If multi-agent debate is used as evidence of divergence, preserve independent pre-exposure positions, role/evidence-scope identity, claims and evidence refs, challenges/rebuttals/concessions, unresolved disagreements, candidate eliminations, synthesis, termination reason, runtime provenance, and replay/supersession links.
- [ ] Agent management defines role/profile registration, participant selection, independence rules, context/evidence partitioning, concurrency and budget limits, failure replacement, semantic-duplicate detection, and deterministic admission. Agent output remains advisory and cannot create human research authority.
- [ ] Apply full divergence and convergence only at research-semantic choices—evidence/search scope, gap/need portfolio, slice/question design, and comparative value disposition. Deterministic snapshot, packaging, publication, and gate-wiring steps validate or project the selected meaning without manufacturing new alternatives.
- [ ] Each semantic arena follows independent proposal, role-specific retrieval, claim/evidence alignment, bounded evidence-focused challenge, and an explicit two-layer disposition (set-level outcome plus per-candidate dispositions). A loop creates a new arena version only when evidence, candidate scope, constraints, or a human research objective changed.
- [ ] Product orchestration connects role-specific query intents to the existing literature retrieval service, records query provenance and bounded hits through SearchRun/coverage bindings, and resolves cited evidence into inspectable excerpts for the receiving role. Persisted refs or UUIDs alone do not count as model-visible evidence.
- [ ] Codex subagents may execute independent Codex-assisted arena roles, but their prompts, evidence scopes, outputs, provenance, disagreement, and termination remain product-recorded. Conversation history and subagent completion alone cannot establish that a product debate occurred.
- [ ] Arena outputs allow zero, one, or multiple viable candidates without a diversity quota. Exactly one research path stays active with a bounded parked portfolio; a second active lineage (fork) is out of scope for this task.

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
- Claim-bearing EvidencePacket resolution, role-specific product retrieval, and a lightweight snapshot-bound ResearchArena coordination contract.
- Zero-to-many candidate portfolios, successful stop/park/reframe outcomes, loop-delta admission, durable minority reports, and risk carry to promotion.
- Derived manifest/LLM/human stage views, effect-based authorization, and shadow calibration of stop/continue quality.

### Out of scope
- GUI or reviewer-workbench composition.
- Codex skill behavior as a source of product semantics.
- Writing-center or paper-writing workflows.
- Experiment execution beyond guarding PaperProject intake eligibility.
- Provider-debate activation, prompt calibration, or external-corpus work owned by T-129.
- A rehearsal or reduced-quality production mode.
- A generic agent platform, unrestricted agent browsing, debate at deterministic mechanical nodes, automatic parallel execution of every branch, or provider/multi-provider activation owned by T-129.

## Constraints and dependencies

- Existing EvidenceMap, ValidatedNeed, ResearchSlice, TopicQuestionContract, TopicPackage, and PromotionDecision objects remain their domain authorities; checkpoint control must not duplicate their content authority.
- Human decisions record the user's exact choice and remain snapshot-bound and append-only according to existing control-plane conventions.
- Business code continues through repository interfaces and Prisma remains the persisted-schema source of truth.
- Current topic-selection workflow IDs, traceability, replay, and hash semantics must remain recoverable or receive an explicit versioned cutover.
- Tests use scenario fixtures and the same guarded APIs; test needs do not create a product runtime mode.

## Open decisions for the integrated route

| Question or assumption | Owner | Impact if unresolved or wrong | Validation / due point |
|---|---|---|---|
| What dominance-pair-consistency, perturbation-sensitivity, override-convergence, evidence-delta, cost, and work-avoided thresholds justify production activation? | User after shadow evidence | Determines whether the arena activates, remains shadow-only, or is removed. | Phase 10 calibration review. |

## Confirmation

- [x] Outcome, scenarios, boundaries, and constraints are confirmed or their unresolved owners are explicit.
- [x] The current goal and relevant acceptance references have been transferred to `01-status.md`.
