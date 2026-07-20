-- T-132 Pack C (C-PI) hardening: fixed schema versions, closed enums and the
-- closure kind/disposition/proposal invariants, in the Pack A/B CHECK-fence
-- style. Additive constraints on the three C-PI tables only.
ALTER TABLE "PaperImplementationRunEvidenceUnitV2" ADD CONSTRAINT "pi_reu_schema_version_check" CHECK ("schemaVersion" = 'v1');
ALTER TABLE "PaperImplementationEvidenceTraceManifestV2" ADD CONSTRAINT "pi_evidence_trace_schema_version_check" CHECK ("schemaVersion" = 'v1');
ALTER TABLE "PaperImplementationEvidenceTraceManifestV2" ADD CONSTRAINT "pi_evidence_trace_ref_count_check" CHECK ("orderedTraceRefCount" >= 1);
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_schema_version_check" CHECK ("schemaVersion" = 'v1');
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_kind_check" CHECK ("closureKind" IN ('control_flow_validated_no_paper_evidence', 'scientific_evidence_assessed'));
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_disposition_check" CHECK ("scientificDisposition" IS NULL OR "scientificDisposition" IN ('positive', 'negative', 'inconclusive'));
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_branch_count_check" CHECK ("orderedBranchCount" >= 1);
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_version_check" CHECK ("cycleVersionAtClosure" >= 0);
-- No-evidence/control-only closure carries no scientific authority members.
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_no_evidence_null_check" CHECK ("closureKind" <> 'control_flow_validated_no_paper_evidence' OR ("scientificDisposition" IS NULL AND "selectedExitKey" IS NULL AND "acceptedProposalId" IS NULL AND "acceptedProposalHash" IS NULL));
-- A scientific closure requires the accepted proposal pair, a non-null
-- disposition and the server-derived selected exit.
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_scientific_complete_check" CHECK ("closureKind" <> 'scientific_evidence_assessed' OR ("scientificDisposition" IS NOT NULL AND "selectedExitKey" IS NOT NULL AND "acceptedProposalId" IS NOT NULL AND "acceptedProposalHash" IS NOT NULL));
ALTER TABLE "PaperImplementationValidationCycleClosureV2" ADD CONSTRAINT "pi_cycle_closure_proposal_pair_check" CHECK (("acceptedProposalId" IS NULL) = ("acceptedProposalHash" IS NULL));
