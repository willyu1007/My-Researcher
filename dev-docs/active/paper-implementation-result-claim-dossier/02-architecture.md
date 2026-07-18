# 02 Architecture

## Contract Boundary
| Item | Contract |
|---|---|
| Input objects | exact closed-ValidationCycle assessment/selected-exit/`closure_watermark` current-effective branch-head snapshot refs/hashes, accepted Result Analysis proposal ref/hash, eligible `RunEvidenceUnit`, explicit current-revision `comparison_input_ref` lineage, validation reports, evaluation facts, trace manifests, motive/assertion refs |
| Output objects | `ResultInterpretationPacket`, `ClaimCandidate`, `ClaimTracePacket`, `ImplementationDossier`, `ImplementationFeedbackEvent` candidates, `PaperImplementationWritingEntryPacket` projection |
| Local authority writer | result/claim/dossier service through `StateWriter` writes derivative packet, claim and dossier objects; the service does not write the scientific disposition or selected exit |
| Gates | result interpretation, claim boundary, claim trace, dossier readiness, export confirmation, upstream feedback no-overwrite check |
| Trace | support/challenge/scope/citation/artifact/internal interpretation lineage |
| Handoff | T-099 can propose changes; T-100 can display dossier readiness; writing lane consumes packet projection |

## D-17 Consumption Chain (product target; docs-only, not implemented)

T-132 D-17 is the cross-task decision source. Scientific interpretation has one upstream authority and one downstream projection path:

```text
eligible REU + watermark-bound current-head Run/Attempt accounting
  -> Result Analysis exact-hash proposal (support only)
  -> existing ValidationCycle closure (sole disposition/selected-exit authority)
  -> ResultInterpretationPacket (derivative interpretation lineage)
  -> ClaimCandidate / ImplementationDossier / next-step drafts
```

| Object | Responsibility | Required input | Forbidden authority |
|---|---|---|---|
| Result Analysis artifact | propose one contextual scientific disposition and explanation | admission-frozen Cycle frame plus exact watermark-bound current-effective closure-input/evidence refs/hashes | Cycle assessment, selected exit or packet writer payload |
| Closed `ValidationCycle` | authoritative nullable scientific disposition, closure kind, accepted proposal identity, D-16 current-effective branch-head snapshot/hash and server-derived selected exit | existing closure action after current-effective scope readiness and Cycle/branch/head CAS | interpretation text as evidence; downstream packet dependency |
| `ResultInterpretationPacket` | preserve accepted rationale, evidence roles, uncertainties, limitations and claim ceiling | exact closed Cycle plus matching accepted proposal and trace | assigning/changing disposition or exit; becoming evidence |
| Claim/Dossier | bound claims and writing readiness | packet plus exact closed-Cycle authority and evidence/trace lineage | consuming an open Cycle or a proposal as a conclusion |

Rules:
- Packet creation MUST reject an open Cycle, a Cycle without the D-16 snapshot/hash, a proposal ref/hash not accepted by closure, or any projected disposition/exit that differs from the authoritative closed Cycle.
- Current-head execution failure is resolved from exact closed-Cycle snapshot entries. Scientific `inconclusive` is resolved from the Cycle assessment. `RunEvidenceUnit.run_status`, `failed_run_refs`, `inconclusive_run_refs`, non-head history and runtime scenario labels cannot serve as a parallel conclusion axis.
- Dossier/packet readers MUST NOT scan project or Cycle history to add non-head Runs. A closed current revision MAY declare explicit `comparison_input_ref` lineage to an old Run; readers verify and preserve that comparison without adding it to the execution-accounting snapshot or restoring head membership.
- The closed Cycle MUST carry no `BRANCH_HEAD_NOT_FROZEN` or `CYCLE_ACTIVE_REAL_ATTEMPT` blocker and must match the frozen Cycle version, branch set and per-branch head sequences. Any `CYCLE_CLOSURE_SCOPE_DRIFT` fails closed; readers do not rebuild or select a newer head on behalf of closure.
- Packet-to-Cycle linkage is one-way. The immutable closed Cycle is not updated later solely to add a packet ref; consumers query packets by exact Cycle/assessment identity.
- A no-evidence/control-only closure has null scientific disposition and does not fabricate a scientific `ResultInterpretationPacket`; downstream control history may still consume the closure snapshot directly.

## Contract Review
- Claim support must trace to run evidence, citation candidates, or citable literature/source evidence; memo, summary, interpretation, decision, motive, and validation-control refs cannot be support evidence.
- Result interpretation only accepts trusted `RunEvidenceUnit` inputs and must carry available validation report refs and metric refs before claim handoff.
- D-16 separates evidence from execution accounting: complete valid positive/negative/inconclusive results may enter REU with completed execution; current-head failed/cancelled/incomplete execution is visible through exact closed-Cycle snapshot entries, while non-head execution remains immutable queryable history.
- Dossier readiness declares and re-resolves exact watermark-bound current-effective closed-Cycle snapshot refs/hashes. Open, tampered, incomplete, missing-head, CAS-drifted or wrong-project snapshots fail; unrelated Cycles and non-head history do not affect scope, and project-wide/history failed-like REU scans or Sidecar fallback are forbidden.
- Dossier readiness runs after trace completeness.
- Ready dossiers cannot contain unresolved blockers, and every included claim candidate must be explicitly admitted or rejected.
- Packet regeneration is deterministic from dossier version and projection policy.
- Dossier and claim read-models must expose queryable lifecycle/readiness and trace refs for queue, gate, and evaluation checks.
- Implementation findings can request upstream recheck via `ImplementationFeedbackEvent`, but cannot overwrite topic-selection authority.
- D-17 requires every packet/claim/dossier scientific interpretation to resolve the same exact closed-Cycle disposition, current-effective snapshot and accepted proposal identity; packet text and implicit historical search are never second writers.

## Landed Backend Surface
- Historical note: the landed T-098/S3 backend predates D-16. Its failed-like REU accounting remains implementation history and must be replaced by the joint D-16 migration before the shared evidence seam can be accepted.
- D-17 historical note: the landed direct Result Analysis Domain Gate→`createResultInterpretationPacket` path, mixed failed/inconclusive run refs and packet-without-authoritative-closure contract are also superseded mandatory migration debt. D-16/D-17 must cut over atomically with no dual read or compatibility materializer.
- Shared contract: `paper-implementation-result-claim-dossier-contracts.ts`.
- Persistence authority tables: `PaperImplementationResultInterpretationPacket`, `PaperImplementationClaimCandidate`, `PaperImplementationDossier`, `PaperImplementationWritingEntryPacket`.
- Service: `PaperImplementationResultClaimDossierService`.
- REST endpoints:
  - `POST/GET /paper-implementation/projects/:implementation_project_id/result-interpretation-packets`
  - `GET /paper-implementation/projects/:implementation_project_id/result-interpretation-packets/:result_interpretation_packet_id`
  - `POST/GET /paper-implementation/projects/:implementation_project_id/claim-candidates`
  - `GET /paper-implementation/projects/:implementation_project_id/claim-candidates/:claim_candidate_id`
  - `POST/GET /paper-implementation/projects/:implementation_project_id/implementation-dossiers`
  - `GET /paper-implementation/projects/:implementation_project_id/implementation-dossiers/:dossier_id`
  - `POST /paper-implementation/projects/:implementation_project_id/implementation-dossiers/:dossier_id/writing-entry-packets`
  - `GET /paper-implementation/projects/:implementation_project_id/writing-entry-packets`
  - `POST /paper-implementation/projects/:implementation_project_id/result-claim-feedback-events`

## Authority Rules
- `ResultInterpretationPacket` is interpretation of run evidence; the packet is never evidence or citation material.
- `ResultInterpretationPacket` is also not the scientific-conclusion authority. It can exist for scientific interpretation only after the exact Cycle closure assessment and must preserve, not choose, the disposition and selected exit.
- `ClaimCandidate` support refs are positive-allowlisted to evidence-bearing refs; generic workflow/control objects are rejected.
- `ImplementationDossier` readiness is the writing-prep authority boundary.
- `PaperImplementationWritingEntryPacket` is a projection from a ready dossier; the projection cannot override readiness, dossier hash, trace, or claim trace state.
- Aggregate shared exports keep legacy research-argument packet schemas under `researchArgumentWritingEntryPacketSchema`; PaperImplementation uses `paperImplementationWritingEntryPacketSchema`.
