import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeAdmissionScope,
  PaperImplementationRuntimeArtifactEnvelope,
  PaperImplementationRuntimeArtifactScope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

export interface ListPaperImplementationRuntimeArtifactsFilter {
  slot_id?: string;
  artifact_scope?: PaperImplementationRuntimeArtifactScope;
  /**
   * Run-domain filter (D9 resume F1-5): restrict to artifacts whose
   * artifact_payload_ref.ref_id begins with this prefix (e.g. `${runId}.`).
   * Purely additive, read-only.
   */
  ref_id_prefix?: string;
}

export interface ListPaperImplementationRuntimeAdmissionRecordsFilter {
  runtime_artifact_id?: string;
  /**
   * Batch filter (D9 resume F1-5): match any of these runtime_artifact_ids in a
   * single query. Use instead of runtime_artifact_id (not alongside it).
   */
  runtime_artifact_ids?: string[];
  admission_scope?: PaperImplementationRuntimeAdmissionScope;
}

export interface PaperImplementationRuntimeRepository {
  createRuntimeArtifact(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope>;

  findRuntimeArtifactById(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope | null>;

  listRuntimeArtifacts(
    implementationProjectId: string,
    filter?: ListPaperImplementationRuntimeArtifactsFilter,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]>;

  /**
   * Direct lookup of final-scope runtime artifacts by their final_artifact_ref
   * (exact ref_type + ref_id match). S2-C C4: replaces the consumption
   * validator's full final-scope table scan (feasibility performed it three
   * times per run).
   */
  listFinalRuntimeArtifactsByFinalArtifactRef(
    implementationProjectId: string,
    refType: string,
    refId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]>;

  createAdmissionRecord(
    record: PaperImplementationRuntimeAdmissionRecord,
  ): Promise<PaperImplementationRuntimeAdmissionRecord>;

  findAdmissionRecordById(
    implementationProjectId: string,
    admissionRecordId: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null>;

  findAdmissionRecordByIdentityHash(
    implementationProjectId: string,
    admissionIdentityHash: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null>;

  listAdmissionRecords(
    implementationProjectId: string,
    filter?: ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]>;
}
