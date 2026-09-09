# Execution inventory

Inventory established at `a5263023`, reconciled with the current Phase 2 implementation on 2026-09-09. This is a coverage index for T-153, not another runtime admission registry. The maintained workflow matrix and typed policies remain authoritative. A row names a registered profile, not necessarily one node or one model call. Planned verification is owned by `verification.md`; no row below claims live Codex readiness.

## Model profiles

The default registry has **36 topic-selection profiles** after excluding PaperImplementation. All 36 currently have empty `run_mode_eligibility.codex_cli` and exclude CLI from `allowed_execution_modes`. “External” below means a caller accepts operator-authored outputs; it does not mean product-driven CLI execution exists.

| # | Exact profile ID | Product owner / current gap | Delivery / acceptance |
|---|---|---|---|
| 1 | `topic-selection-resource-sampling-classification` | Resource sampling classification hardcodes provider execution; deterministic sampling filters remain separate | Phase 3 / CX-03 |
| 2 | `topic-selection.evidence-map-extraction.single-agent.v1` | v1a evidence extraction; inject shared CLI executor and align input admission | Phase 3 / CX-03 |
| 3 | `topic-selection.generate-need-candidate.single-agent.v1` | v1a need generation; preserve evidence lineage and candidate admission | Phase 3 / CX-03 |
| 4 | `topic-selection.need-adjudication.single-agent.v1` | v1a adjudication; generated support cannot confirm a need | Phase 3 / CX-03 |
| 5 | `topic-selection.confirmation-semantic-review.single-agent.v1` | v1a human-confirmation semantic support; retain exact Human decision | Phase 3 / CX-03 |
| 6 | `topic-selection.need-discovery.explorer.v1` | Need-discovery loop; replace required external role payloads on CLI route | Phase 3 / CX-03 |
| 7 | `topic-selection.need-discovery.deep-critic.v1` | Same loop; actual scoped evidence and prior draft bodies needed | Phase 3 / CX-03 |
| 8 | `topic-selection.research-arena.opportunity-scout.v1` | Optional Arena shadow support; mock/external today; enable CLI support without decision-quality activation | Phase 3 / CX-01, CX-03 |
| 9 | `topic-selection.research-arena.prior-art-topic-killer.v1` | Optional Arena shadow support; same boundary | Phase 3 / CX-01, CX-03 |
| 10 | `topic-selection.evidence-convergence.opportunity-scout.v1` | Existing linked rounds accept structured role inputs; CLI generates them from scoped packets | Phase 3 / CX-03 |
| 11 | `topic-selection.evidence-convergence.empirical-skeptic.v1` | Same evidence-stage owner; preserve claim and retrieval lineage | Phase 3 / CX-03 |
| 12 | `topic-selection.evidence-convergence.synthesis-arbiter.v1` | Same owner; synthesis cannot fabricate successor evidence or a Human decision | Phase 3 / CX-03 |
| 13 | `topic-selection.need-discovery.arbiter-framing.v1` | Need-discovery loop; frame issues from verified role bodies | Phase 3 / CX-03 |
| 14 | `topic-selection.need-discovery.arbiter-final.v1` | Provider/mock only; both final-slot policy and profile need deliberate CLI alignment | Phase 3 / CX-03 |
| 15 | `topic-selection.v1b.research-slice-options.single-agent.v1` | N4 draft generation; preserve N5 human selection | Phase 4 / CX-04 |
| 16 | `topic-selection.v1b.topic-question-candidates.single-agent.v1` | N6 CLI Debate bridge consumes admitted final deterministically without an extra model call; qualification pending | Phase 2 / CX-02 |
| 17 | `topic-selection.v1b.topic-value-assessment.single-agent.v1` | Ordinary CLI assessment and deterministic Debate bridge integrated; qualification pending | Phase 2 / CX-02 |
| 18 | `topic-selection.v1b.constraint-profile-support.codex.v1` | External support today; prepare suggestions, retain Human constraint authority | Phase 4 / CX-04 |
| 19 | `topic-selection.v1b.intake-readiness-support.codex.v1` | External support today; cannot override deterministic readiness | Phase 4 / CX-04 |
| 20 | `topic-selection.v1b.slice-selection-support.codex.v1` | External support today; cannot make the researcher's slice choice | Phase 4 / CX-04 |
| 21 | `topic-selection.v1b.n6-loopback-triage-support.codex.v1` | External support today; preserve existing loopback targets/currentness | Phase 4 / CX-04 |
| 22 | `topic-selection.v1b.candidate-grouping-support.codex.v1` | External support today; no candidate authority writes | Phase 4 / CX-04 |
| 23 | `topic-selection.v1b.failed-trial-synthesis-support.codex.v1` | External support today; retain trial history and non-advance outcomes | Phase 4 / CX-04 |
| 24 | `topic-selection.v1b.n8-debate-admission-support.codex.v1` | Canonical N7 CLI support integrated; protected generation receipt required; qualification pending | Phase 2 / CX-02 |
| 25 | `topic-selection.v1b.n6-refinement-delta-admission.v1` | Exact Human delta CLI review derives admission from three actual roles; no extra model call; qualification pending | Phase 2 / CX-02 |
| 26 | `topic-selection.v1b.n8-bounded-debate.v1` | Four ordered CLI roles integrated; repair and final must both resolve substantive Critic findings; qualification pending | Phase 2 / CX-02 |
| 27 | `topic-selection.v1b.n6-debate.explorer.v1` | Two independent initial Explorer instances over the same frozen evidence | Phase 2 / CX-02 |
| 28 | `topic-selection.v1b.n6-debate.critic.v1` | Review both actual Explorer outputs, not only their artifact hashes | Phase 2 / CX-02 |
| 29 | `topic-selection.v1b.n6-debate.arbiter.v1` | Synthesize actual drafts/objections; deterministic candidate projection after admission | Phase 2 / CX-02 |
| 30 | `topic-selection.v1b.n6-refinement-delta-debate.explorer.v1` | Existing exact-delta review; bind original question and Human delta | Phase 2 / CX-02 |
| 31 | `topic-selection.v1b.n6-refinement-delta-debate.critic.v1` | Same refinement boundary; critique supplied review content | Phase 2 / CX-02 |
| 32 | `topic-selection.v1b.n6-refinement-delta-debate.arbiter.v1` | Support-only refinement verdict; cannot replace the Human question | Phase 2 / CX-02 |
| 33 | `topic-selection-promotion-decision-support` | Ordinary promotion support is provider-only today; deterministic no-risk paths stay available | Phase 4 / CX-05 |
| 34 | `topic-selection.v1c.promotion-support.bounded-micro-debate.v1` | Four role slots; coordinator fixes `codex_assisted`; retain risk coverage and grouped conditions | Phase 4 / CX-05 |
| 35 | `topic-selection.v1c.delegated-promotion-decision.v1` | Generates decision candidates/support; does not grant CLI strict-human authority | Phase 4 / CX-05 |
| 36 | `topic-selection.v1c.downstream-feedback-normalization.v1` | Normalize feedback through existing admission and recheck owner | Phase 4 / CX-05 |

## Workflow operations beyond the profile count

| Operation / stage boundary | Execution meaning to preserve | Product surface / coverage |
|---|---|---|
| Literature/resource selection → evidence landscape | Deterministic filters plus model classification/extraction; retrieval has its own dependencies | Resource sampling + v1a routes; CX-03 |
| Evidence convergence and linked rounds | Product executes retrieval requests, admits EvidenceDelta, creates successor maps and freezes the next round | Evidence-convergence retrieval-executions, evidence-map-successors and linked-round APIs; CX-03 |
| Evidence / gap checkpoints | Researcher approves exact current evidence and need; support is advisory | Research-checkpoint and v1a routes; CX-03, CX-07 |
| Constraints → N4 options → N5 slice selection | Model drafts/support; Human owns constraints and selected slice | v1b harness/run coordinator; CX-04 |
| N6 questions → N7 question materialization/confirmation | Product Debate and deterministic artifact handling; strict-human question checkpoint remains | v1b harness/run coordinator and checkpoints; CX-02 |
| N8 value → N9 disposition / question loopback | Ordinary/conditional model work plus deterministic gates; exact Human delta on refinement | v1b runtime/run coordinator; CX-02, CX-07 |
| N10 package → N11 bundle → promotion snapshot/support | Deterministic packaging/snapshot joins; model risk support does not promote | v1b/v1c routes; CX-05 |
| Human promotion → bridge/intake | Preserve risk conditions and exact Human decision; deterministic downstream eligibility | v1c and existing downstream intake owners; CX-05, CX-06 |
| Feedback, objections, retries and rechecks | Existing owners determine currentness and return to the correct stage; never mutate frozen history in place | Continuation envelope, checkpoint, feedback and workflow APIs; CX-05, CX-07, CX-08 |

Reserved/rejected Debate slots stay reserved/rejected. Optional semantic/Arena support receives an executable and verified CLI route but does not become mandatory. Full-flow verification covers these operations as well as the 36 profiles.

## Source navigation

- Semantic authority: `docs/context/process/topic-selection-workflow-matrix.md` and linked shared node/slot/scenario contracts.
- Exact profile inventory: `apps/backend/src/services/topic-selection-model-profile-registry-service.ts`, `createDefaultTopicSelectionModelProfileRegistry()`.
- App composition and executor: `apps/backend/src/app.ts`, `topic-selection-agent-orchestrator-service.ts`, `topic-selection-codex-cli-runner-service.ts` under backend services.
- Product HTTP owners: `apps/backend/src/routes/topic-selection-{v1a,v1b,v1c,evidence-convergence,research-checkpoint,research-arena-shadow}-routes.ts`; sampling route registration is also used by resource-sampling integration tests.
- Role/context/admission owners: `topic-selection-bounded-debate-core-service.ts`, `topic-selection-v1b-n6-divergent-debate-runtime-service.ts`, `topic-selection-v1b-n8-bounded-debate-runtime-service.ts`, `topic-selection-v1b-n6-draft-runtime-service.ts`, `topic-selection-research-evidence-packet-service.ts`.
- Upstream/downstream composition: need-discovery debate loop, resource-sampling service, evidence-convergence coordinator/round service, v1c N2 bounded-debate coordinator and N6 feedback-normalization runtime.

## T-129 prompt inheritance

Historical source: `git show 5cf904fb:dev-docs/active/topic-selection-calibration-release/00-overview.md`, C-1/C-2/C-3. D-30 had already made threshold calibration optional and removed C-1 sign-off as C-3's prerequisite. C-2 still required corpus-informed prompt finalization. Replacing that remaining corpus dependency with role-specific qualification is the explicit approved decision in the roadmap, not an already-proved quality result.

| Historical prompt family | Current `.ai/llm/topic-selection/prompts/` source | Current observation |
|---|---|---|
| #16 / #17 / #18 N6 Explorer/Critic/Arbiter | `v1b/n6-debate-{explorer,critic,arbiter}/system.md` | Prompt v2 covers evidence, role outputs and substantive resolution; live research-reasoning qualification pending |
| #22 ordinary N8 assessment | `v1b/n8-topic-value-assessment/system.md` | Prompt v2 covers scoped value reasoning, insufficiency and non-advance; was part of the original six; live qualification pending |
| #23 N8 bounded role family | `v1b/n8-bounded-micro-debate/system.md` | Prompt v2 covers four role behaviors and preserved objections; qualify each actual role |
| #25 promotion N2 bounded family | `v1c/n2-bounded-micro-debate/system.md` | Already expanded for material risks and grouped conditions by later work; preserve that contract |
| Later refinement-delta family | `v1b/n6-refinement-delta-debate/system.md` | Additional substantive support-only contract; outside the historical six but inside T-153 |

The old six were neither an exhaustive workflow inventory nor confined to N6/N8 Debate. Inspect remaining enabled families against the same qualification criteria; do not rewrite substantive prompts merely to match a count.
