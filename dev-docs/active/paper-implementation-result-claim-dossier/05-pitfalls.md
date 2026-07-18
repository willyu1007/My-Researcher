# 05 Pitfalls

## Do Not Repeat
- Do not promote interpretation text to evidence.
- Do not hide counter evidence or current-effective head failures from claim trace, and do not satisfy this rule with a project-wide or full-history scan.
- Under T-132 D-16, do not preserve failed/cancelled/incomplete execution by minting REU. Use exact immutable watermark-bound current-head closed-Cycle snapshot entries; REU is reserved for complete validation-passed scientific evidence.
- Do not auto-include non-head Runs in readiness or dossier scope. Old Runs remain immutable/queryable and require explicit current-revision `comparison_input_ref` lineage for paper comparison; that lineage never restores head or execution-accounting membership.
- Do not accept a Cycle with `BRANCH_HEAD_NOT_FROZEN`, resolve a newer head after closure, or overlook an active real-provider Attempt on a non-head Run; the upstream closure scope and CAS identity must already be exact.
- Do not encode negative/inconclusive disposition as execution failure, scan project-wide failed-like REUs, or use Sidecar as dossier scope authority.
- Do not let Result Analysis, its four counterfactual scenarios or Domain Gate directly assign an accepted `ResultInterpretationPacket`; D-17 keeps runtime output proposal-only until Cycle closure.
- Do not infer scientific disposition from `RunEvidenceUnit.run_status`, `failed_run_refs` or `inconclusive_run_refs`. Current-head execution failure comes from the closed-Cycle snapshot; scientific disposition comes from the closed-Cycle assessment.
- Do not create a scientific packet from an open Cycle, proposal-only artifact, mismatched closure/proposal hash or no-evidence/control-only closure.
- Do not let packet projection become authority.
- Do not mark dossier ready before trace completeness.
- Do not silently lower or broaden upstream topic assumptions from result interpretation.
- Do not bury dossier readiness, lifecycle, or claim trace refs inside JSON-only fields.

## Landed Guardrails
- `ResultInterpretationPacket` accepts only trusted `RunEvidenceUnit` refs and must preserve available validation report refs plus metrics for successful run evidence.
- `support_refs` on `ClaimCandidate` are evidence allowlisted; memo/summary/interpretation refs and workflow/control refs are rejected.
- Ready dossiers require included claim trace packets for every included claim candidate.
- Ready dossiers reject unresolved blockers and require each included claim candidate to be explicitly admitted or rejected.
- Current-head failed/cancelled/incomplete execution and valid negative/inconclusive results must remain explicitly accounted for before ready dossier creation, but through different authorities: watermark-bound closed-Cycle snapshot for execution, eligible REU for evidence lineage, and closed-Cycle assessment for scientific disposition. Non-head history is read-only and excluded unless the current revision explicitly references it for comparison lineage.
- Packet generation is downstream and one-way: the packet references the immutable closed Cycle and accepted proposal; it cannot rewrite the Cycle or become a second selected-exit source.
- Strong claims require explicit human confirmation before admission.
- Writing packets require a ready dossier and matching projection policy; they cannot change readiness or evidence state.
- Shared aggregate exports use `paperImplementationWritingEntryPacketSchema` and `researchArgumentWritingEntryPacketSchema`; no unprefixed aggregate `writingEntryPacketSchema` should be used.
- Result/claim feedback dispatch uses T-093 feedback authority rather than direct topic-selection mutation.
