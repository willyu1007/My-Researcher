import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ListPaperImplementationRuntimeArtifactsFilter,
  PaperImplementationRuntimeRepository,
} from './paper-implementation-runtime.repository.js';

export class InMemoryPaperImplementationRuntimeRepository
implements PaperImplementationRuntimeRepository {
  private readonly runtimeArtifacts = new Map<string, PaperImplementationRuntimeArtifactEnvelope>();
  private readonly runtimeArtifactIdsByProject = new Map<string, string[]>();
  private readonly runtimeArtifactIdsByIdentityHash = new Map<string, string>();
  private readonly admissionRecords = new Map<string, PaperImplementationRuntimeAdmissionRecord>();
  private readonly admissionRecordIdsByProject = new Map<string, string[]>();

  async createRuntimeArtifact(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope> {
    this.assertNewId(this.runtimeArtifacts, artifact.runtime_artifact_id, 'RuntimeArtifact');
    // S2-C C2: mirrors the Prisma unique constraint on runtimeIdentityHash —
    // replaying the same runtime identity must conflict, not silently fork rows.
    const existingId = this.runtimeArtifactIdsByIdentityHash.get(artifact.runtime_identity_hash);
    if (existingId) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `RuntimeArtifact with runtime_identity_hash ${artifact.runtime_identity_hash} already exists (${existingId}).`,
      );
    }
    const stored = structuredClone(artifact);
    this.runtimeArtifactIdsByIdentityHash.set(stored.runtime_identity_hash, stored.runtime_artifact_id);
    this.runtimeArtifacts.set(stored.runtime_artifact_id, stored);
    this.pushId(
      this.runtimeArtifactIdsByProject,
      stored.implementation_project_id,
      stored.runtime_artifact_id,
    );
    return structuredClone(stored);
  }

  async findRuntimeArtifactById(
    implementationProjectId: string,
    runtimeArtifactId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope | null> {
    const artifact = this.runtimeArtifacts.get(runtimeArtifactId);
    if (!artifact || artifact.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(artifact);
  }

  async listRuntimeArtifacts(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeArtifactsFilter = {},
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]> {
    return (this.runtimeArtifactIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.runtimeArtifacts.get(id))
      .filter((artifact): artifact is PaperImplementationRuntimeArtifactEnvelope => Boolean(artifact))
      .filter((artifact) => this.matchesRuntimeArtifactFilter(artifact, filter))
      .map((artifact) => structuredClone(artifact));
  }

  async listFinalRuntimeArtifactsByFinalArtifactRef(
    implementationProjectId: string,
    refType: string,
    refId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]> {
    return (this.runtimeArtifactIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.runtimeArtifacts.get(id))
      .filter((artifact): artifact is PaperImplementationRuntimeArtifactEnvelope => Boolean(artifact))
      .filter((artifact) => artifact.artifact_scope === 'final'
        && artifact.final_artifact_ref !== null
        && artifact.final_artifact_ref.ref_type === refType
        && artifact.final_artifact_ref.ref_id === refId)
      .map((artifact) => structuredClone(artifact));
  }

  async createAdmissionRecord(
    record: PaperImplementationRuntimeAdmissionRecord,
  ): Promise<PaperImplementationRuntimeAdmissionRecord> {
    this.assertNewId(this.admissionRecords, record.admission_record_id, 'RuntimeAdmissionRecord');
    const stored = structuredClone(record);
    this.admissionRecords.set(stored.admission_record_id, stored);
    this.pushId(
      this.admissionRecordIdsByProject,
      stored.implementation_project_id,
      stored.admission_record_id,
    );
    return structuredClone(stored);
  }

  async findAdmissionRecordById(
    implementationProjectId: string,
    admissionRecordId: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null> {
    const record = this.admissionRecords.get(admissionRecordId);
    if (!record || record.implementation_project_id !== implementationProjectId) {
      return null;
    }
    return structuredClone(record);
  }

  async findAdmissionRecordByIdentityHash(
    implementationProjectId: string,
    admissionIdentityHash: string,
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null> {
    for (const id of this.admissionRecordIdsByProject.get(implementationProjectId) ?? []) {
      const record = this.admissionRecords.get(id);
      if (record?.admission_identity_hash === admissionIdentityHash) {
        return structuredClone(record);
      }
    }
    return null;
  }

  async listAdmissionRecords(
    implementationProjectId: string,
    filter: ListPaperImplementationRuntimeAdmissionRecordsFilter = {},
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]> {
    return (this.admissionRecordIdsByProject.get(implementationProjectId) ?? [])
      .map((id) => this.admissionRecords.get(id))
      .filter((record): record is PaperImplementationRuntimeAdmissionRecord => Boolean(record))
      .filter((record) => this.matchesAdmissionRecordFilter(record, filter))
      .map((record) => structuredClone(record));
  }

  private matchesRuntimeArtifactFilter(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    filter: ListPaperImplementationRuntimeArtifactsFilter,
  ): boolean {
    if (filter.slot_id !== undefined && artifact.slot_id !== filter.slot_id) {
      return false;
    }
    if (filter.artifact_scope !== undefined && artifact.artifact_scope !== filter.artifact_scope) {
      return false;
    }
    if (
      filter.ref_id_prefix !== undefined
      && !artifact.artifact_payload_ref.ref_id.startsWith(filter.ref_id_prefix)
    ) {
      return false;
    }
    return true;
  }

  private matchesAdmissionRecordFilter(
    record: PaperImplementationRuntimeAdmissionRecord,
    filter: ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ): boolean {
    if (filter.runtime_artifact_id !== undefined && record.runtime_artifact_id !== filter.runtime_artifact_id) {
      return false;
    }
    if (filter.runtime_artifact_ids !== undefined && !filter.runtime_artifact_ids.includes(record.runtime_artifact_id)) {
      return false;
    }
    if (filter.admission_scope !== undefined && record.admission_scope !== filter.admission_scope) {
      return false;
    }
    return true;
  }

  private assertNewId<T>(map: Map<string, T>, id: string, label: string): void {
    if (map.has(id)) {
      throw new AppError(409, 'VERSION_CONFLICT', `${label} ${id} already exists.`);
    }
  }

  private pushId(map: Map<string, string[]>, key: string, id: string): void {
    const ids = map.get(key) ?? [];
    ids.push(id);
    map.set(key, ids);
  }
}
