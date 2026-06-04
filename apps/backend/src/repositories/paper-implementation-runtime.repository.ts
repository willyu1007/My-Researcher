import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeAdmissionScope,
  PaperImplementationRuntimeArtifactEnvelope,
  PaperImplementationRuntimeArtifactScope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

export interface ListPaperImplementationRuntimeArtifactsFilter {
  slot_id?: string;
  artifact_scope?: PaperImplementationRuntimeArtifactScope;
}

export interface ListPaperImplementationRuntimeAdmissionRecordsFilter {
  runtime_artifact_id?: string;
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
