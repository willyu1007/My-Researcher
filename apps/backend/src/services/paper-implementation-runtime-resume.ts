import type {
  PaperImplementationRuntimeAdmissionRecord,
  PaperImplementationRuntimeArtifactEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';

import { AppError } from '../errors/app-error.js';
import type {
  ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ListPaperImplementationRuntimeArtifactsFilter,
} from '../repositories/paper-implementation-runtime.repository.js';
import { stableStringify } from './literature-content-processing-utils.js';

/**
 * D9 resume — single source for the resume issue codes shared by the
 * trace-integrity debate and P1 review runtime services (T-124 S3 F1-0).
 */
export const RESUME_ISSUE_CODES = {
  PREFLIGHT_NO_LONGER_CLEAN: 'RESUME_PREFLIGHT_NO_LONGER_CLEAN',
  SLOT_MISMATCH: 'RESUME_SLOT_MISMATCH',
  ROLE_AMBIGUOUS: 'RESUME_ROLE_AMBIGUOUS',
  PRIOR_ROLE_CHAIN_DRIFT: 'RESUME_PRIOR_ROLE_CHAIN_DRIFT',
  ROLE_OUTPUT_UNAVAILABLE: 'RESUME_ROLE_OUTPUT_UNAVAILABLE',
  FINAL_NOT_ADMITTED: 'RESUME_FINAL_NOT_ADMITTED',
  FINAL_CHAIN_BROKEN: 'RESUME_FINAL_CHAIN_BROKEN',
  SOURCE_HASH_BUNDLE_DRIFT: 'RESUME_SOURCE_HASH_BUNDLE_DRIFT',
  INPUT_SNAPSHOT_DRIFT: 'RESUME_INPUT_SNAPSHOT_DRIFT',
  TARGET_REF_DRIFT: 'RESUME_TARGET_REF_DRIFT',
  MODEL_PROFILE_DRIFT: 'RESUME_MODEL_PROFILE_DRIFT',
  PROMPT_IDENTITY_DRIFT: 'RESUME_PROMPT_IDENTITY_DRIFT',
  OUTPUT_SCHEMA_DRIFT: 'RESUME_OUTPUT_SCHEMA_DRIFT',
  EXECUTION_MODE_DRIFT: 'RESUME_EXECUTION_MODE_DRIFT',
  MODEL_OPTION_DRIFT: 'RESUME_MODEL_OPTION_DRIFT',
  RETRIEVAL_PACKET_HASH_DRIFT: 'RESUME_RETRIEVAL_PACKET_HASH_DRIFT',
  REVIEWED_STATEMENT_PACKET_DRIFT: 'RESUME_REVIEWED_STATEMENT_PACKET_DRIFT',
  // T-124 D2-core: the enforced debate-tier decision is an identity facet.
  // DEBATE_TIER_DRIFT = the resume request re-derives a different base tier /
  // tier inputs hash / policy id than the recorded artifacts carry (including
  // pre-D2 artifacts with no recorded decision). ROLE_PLAN_DRIFT = the reused
  // admitted prefix does not occupy the positions the tier's deterministic
  // role plan derives (e.g. a reconcile artifact inside a light-no-findings run).
  DEBATE_TIER_DRIFT: 'RESUME_DEBATE_TIER_DRIFT',
  ROLE_PLAN_DRIFT: 'RESUME_ROLE_PLAN_DRIFT',
} as const;

export type ResumeIssueCode = (typeof RESUME_ISSUE_CODES)[keyof typeof RESUME_ISSUE_CODES];

/**
 * Slot-specific identity of a resumable runtime slot: the values that pin a
 * reused artifact to the run identity this request re-derives. `extraIdentityChecks`
 * carries the facets that are not common to every slot (trace-integrity's
 * retrieval_packet_hash / reviewed_statement_packet_hash).
 */
export interface ResumeIdentityDescriptor {
  slotId: string;
  finalArtifactRefType: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
  roleOutputSchemaId: string;
  /**
   * Static ordered role slot ids forming the executed chain (reuse iteration
   * order). Used by slots whose role plan does not depend on prior role OUTPUT.
   * A slot whose effective plan IS output-dependent (e.g. the trace debate's
   * deterministic light→standard skeptic-finding upgrade, which omits the
   * reconcile role when the skeptic found nothing) supplies `nextExpectedRoleSlotId`
   * instead — see below.
   */
  roleSlotIds: readonly string[];
  /**
   * Plan-aware role walk (optional). Given the already-reused prefix in role
   * order, return the role slot id the NEXT reuse position must occupy, or null
   * when the plan is complete. This lets the reuse walk track a plan that grows
   * or shrinks with prior role output, so it never breaks on a legitimately-absent
   * role and silently drops the admitted roles that follow it (the light-tier
   * arbiter after a skipped reconcile). When omitted the walk iterates the static
   * `roleSlotIds` in order. Must use the SAME derivation the slot's continue-execution
   * loop uses, so a resumed prefix and a fresh run agree position-for-position.
   */
  nextExpectedRoleSlotId?(
    reusedSoFar: readonly ResumeReusedRoleArtifact<unknown>[],
  ): string | null;
  /**
   * Slot-specific identity facets; returns the drift issue codes it detects.
   * `options.toleratePreD2Identity` is true only on the zero-execution idempotent
   * replay path, where an artifact recorded before a facet existed (e.g. a pre-D2
   * artifact with no `debate_execution` tier decision) must not fail a completed
   * run's safe no-op replay; the continue-execution path always passes false.
   */
  extraIdentityChecks(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    facets: Readonly<Record<string, unknown>>,
    options: { toleratePreD2Identity: boolean },
  ): string[];
}

/** The run identity a resume request re-derives, compared against reused artifacts. */
export interface ResumeRequestIdentity {
  implementationProjectId: string;
  runId: string;
  sourceHashBundleHash: string;
  inputSnapshotHash: string;
  targetRef: unknown;
  modelProfileId: string;
  modelOptionId: string | null;
  executionMode: string;
  /** Facets consumed by descriptor.extraIdentityChecks. */
  extraFacets: Readonly<Record<string, unknown>>;
}

/** Minimal admission-service surface the resume engine depends on. */
export interface ResumeRuntimeAdmissionPort {
  listRuntimeArtifacts(
    implementationProjectId: string,
    filter?: ListPaperImplementationRuntimeArtifactsFilter,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]>;
  listFinalRuntimeArtifactsByFinalArtifactRef(
    implementationProjectId: string,
    refType: string,
    refId: string,
  ): Promise<PaperImplementationRuntimeArtifactEnvelope[]>;
  listAdmissionRecords(
    implementationProjectId: string,
    filter?: ListPaperImplementationRuntimeAdmissionRecordsFilter,
  ): Promise<PaperImplementationRuntimeAdmissionRecord[]>;
}

export interface ResumeReusedRoleArtifact<TRoleOutput> {
  artifact: PaperImplementationRuntimeArtifactEnvelope;
  admission: PaperImplementationRuntimeAdmissionRecord;
  output: TRoleOutput;
}

export interface ResumeLoadState<TRoleOutput> {
  /** Admitted role artifacts reused as the executed prefix, in role order. */
  reused: ResumeReusedRoleArtifact<TRoleOutput>[];
  /** Next call index of the resumed run (max recorded call index + 1). */
  nextCallIndex: number;
  /**
   * The recorded run's model option (F1-2): when the resume request omits
   * model_option_id, the caller pins this value so newly executed roles inherit
   * the run's original option instead of drifting to null.
   */
  recordedModelOptionId: string | null;
}

export interface ResumeIdempotentChain {
  artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admissions: PaperImplementationRuntimeAdmissionRecord[];
  finalArtifact: PaperImplementationRuntimeArtifactEnvelope;
  finalAdmission: PaperImplementationRuntimeAdmissionRecord;
  status: 'passed' | 'blocked' | 'failed_runtime';
  providerCallCount: number;
}

/**
 * The run_id / resume_from_run_id request invariant (F1-0): a resume continues
 * the original run identity, so run_id must be absent or equal to
 * resume_from_run_id.
 */
export function assertResumeRunIdConsistency(
  requestedRunId: string | null,
  resumeFromRunId: string | null,
): void {
  if (resumeFromRunId && requestedRunId && requestedRunId !== resumeFromRunId) {
    throw new AppError(
      400,
      'INVALID_PAYLOAD',
      'resume_from_run_id resumes the original run identity: run_id must be absent or equal to resume_from_run_id.',
    );
  }
}

/**
 * Shared D9 resume engine for the paper-implementation debate/review runtime
 * slots. Parameterised by an identity descriptor so the trace-integrity debate
 * and P1 review services share one implementation of idempotent replay, admitted
 * prefix reuse, and per-artifact identity pinning.
 */
export class PaperImplementationRuntimeResumeEngine<TRoleOutput> {
  constructor(
    private readonly admission: ResumeRuntimeAdmissionPort,
    private readonly descriptor: ResumeIdentityDescriptor,
  ) {}

  /**
   * When the resumed run already has an ADMITTED final artifact, the resume is
   * idempotent — rebuild the original final and its admitted chain without any
   * provider invocation. A final that exists but was never admitted, or whose
   * recorded chain is no longer resolvable/admitted, is a hard 409 (F1-4).
   */
  async idempotentResumeChain(identity: ResumeRequestIdentity): Promise<ResumeIdempotentChain | null> {
    const finals = await this.admission.listFinalRuntimeArtifactsByFinalArtifactRef(
      identity.implementationProjectId,
      this.descriptor.finalArtifactRefType,
      `${identity.runId}.final`,
    );
    if (finals.length === 0) {
      return null;
    }
    const finalArtifact = finals[0]!;
    // F1-3: on the zero-execution idempotent path do NOT pin prompt identity to
    // the current constant — a run completed under an earlier prompt version must
    // still replay to its original final. Intra-run version consistency (below)
    // replaces the current-constant pin here. `toleratePreD2Identity` likewise
    // lets a completed pre-D2 run (no recorded tier decision) replay safely: a
    // finished run's no-op replay must never 409 on a facet that did not exist
    // when it ran.
    this.assertArtifactIdentity(finalArtifact, identity, {
      checkOutputSchema: false,
      pinPromptToCurrent: false,
      toleratePreD2Identity: true,
    });
    const finalAdmission = await this.admittedAdmissionRecord(identity.implementationProjectId, finalArtifact, 'final');
    if (!finalAdmission) {
      throw this.conflict(identity.runId, `a final artifact exists but was never admitted.`, [
        RESUME_ISSUE_CODES.FINAL_NOT_ADMITTED,
      ]);
    }
    // Rebuild the effective admitted chain exactly as the final recorded it.
    const roleScope = await this.admission.listRuntimeArtifacts(identity.implementationProjectId, {
      slot_id: this.descriptor.slotId,
      artifact_scope: 'role',
    });
    const byPayloadHash = new Map(roleScope.map((artifact) => [artifact.artifact_payload_hash, artifact]));
    const chainArtifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    for (const priorHash of finalArtifact.prior_role_artifact_hashes) {
      const roleArtifact = byPayloadHash.get(priorHash);
      // F1-4: a final whose recorded chain is no longer resolvable fails closed.
      if (!roleArtifact) {
        throw this.conflict(
          identity.runId,
          `the admitted final references a role artifact that no longer resolves.`,
          [RESUME_ISSUE_CODES.FINAL_CHAIN_BROKEN],
        );
      }
      chainArtifacts.push(roleArtifact);
    }
    const admittedByArtifact = await this.admittedRoleAdmissionByArtifact(
      identity.implementationProjectId,
      chainArtifacts,
    );
    const artifacts: PaperImplementationRuntimeArtifactEnvelope[] = [];
    const admissions: PaperImplementationRuntimeAdmissionRecord[] = [];
    for (const roleArtifact of chainArtifacts) {
      const roleAdmission = admittedByArtifact.get(roleArtifact.runtime_artifact_id);
      // F1-4: a chain role that is no longer admitted invalidates idempotent replay.
      if (!roleAdmission) {
        throw this.conflict(
          identity.runId,
          `a role artifact in the admitted final chain is no longer admitted.`,
          [RESUME_ISSUE_CODES.FINAL_CHAIN_BROKEN],
        );
      }
      // F1-3: intra-run version consistency — the reused chain must share the
      // final's prompt identity (a v1-prefix + v2-suffix mixed chain is rejected).
      if (
        roleArtifact.prompt_template_id !== finalArtifact.prompt_template_id
        || roleArtifact.prompt_template_version_id !== finalArtifact.prompt_template_version_id
      ) {
        throw this.conflict(
          identity.runId,
          `the admitted final chains role artifacts with inconsistent prompt identity.`,
          [RESUME_ISSUE_CODES.PROMPT_IDENTITY_DRIFT],
        );
      }
      artifacts.push(roleArtifact);
      admissions.push(roleAdmission);
    }
    artifacts.push(finalArtifact);
    admissions.push(finalAdmission);
    const status = finalArtifact.runtime_status === 'passed'
      ? 'passed'
      : finalArtifact.runtime_status === 'blocked'
        ? 'blocked'
        : 'failed_runtime';
    return {
      artifacts,
      admissions,
      finalArtifact,
      finalAdmission,
      status,
      providerCallCount: finalArtifact.provider_call_count,
    };
  }

  /**
   * Load the resumed run's admitted role-artifact prefix (in role order),
   * re-checking admission status and identity per role. The first role without an
   * admitted artifact ends the reusable prefix; execution continues from there
   * with the run's next call index.
   */
  async loadResumeState(identity: ResumeRequestIdentity): Promise<ResumeLoadState<TRoleOutput>> {
    const projectId = identity.implementationProjectId;
    const runPrefix = `${identity.runId}.`;
    // F1-5: narrow the primary query by slot + run-domain prefix (indexed in
    // prisma) instead of scanning every role artifact in the project.
    const primary = await this.admission.listRuntimeArtifacts(projectId, {
      slot_id: this.descriptor.slotId,
      artifact_scope: 'role',
      ref_id_prefix: runPrefix,
    });
    const runArtifacts = primary.filter((artifact) => this.belongsToRun(identity.runId, artifact));
    // F1-5: a secondary run-domain existence query (no slot filter) keeps the
    // RESUME_SLOT_MISMATCH rejection surface strong without weakening it.
    const ownedAcrossSlots = (await this.admission.listRuntimeArtifacts(projectId, {
      artifact_scope: 'role',
      ref_id_prefix: runPrefix,
    })).filter((artifact) => this.belongsToRun(identity.runId, artifact));
    if (ownedAcrossSlots.length === 0) {
      throw new AppError(
        404,
        'NOT_FOUND',
        `Resume run ${identity.runId} has no recorded role artifacts in project ${projectId}.`,
      );
    }
    const foreign = ownedAcrossSlots.find((artifact) => artifact.slot_id !== this.descriptor.slotId);
    if (foreign) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Resume run ${identity.runId} belongs to slot ${foreign.slot_id}, not ${this.descriptor.slotId}.`,
        { resume_issue_codes: [RESUME_ISSUE_CODES.SLOT_MISMATCH] },
      );
    }
    const nextCallIndex = Math.max(0, ...runArtifacts.map((artifact) => artifact.call_index ?? 0)) + 1;
    // F1-5: resolve every candidate role admission in a single batched query.
    const admittedByArtifact = await this.admittedRoleAdmissionByArtifact(projectId, runArtifacts);
    const reused: ResumeReusedRoleArtifact<TRoleOutput>[] = [];
    // Plan-aware role walk (D2-core): the expected role at each position is
    // re-derived from the reused-so-far prefix (the trace debate's plan shrinks
    // to 3 roles for a light run whose skeptic found nothing, so a static 4-role
    // walk would break at the absent reconcile and drop the admitted arbiter that
    // follows). Slots with an output-independent plan fall back to the static list.
    for (;;) {
      const slotId = this.descriptor.nextExpectedRoleSlotId
        ? this.descriptor.nextExpectedRoleSlotId(reused)
        : (this.descriptor.roleSlotIds[reused.length] ?? null);
      if (slotId === null) {
        break;
      }
      const candidates = runArtifacts.filter((artifact) => artifact.role_slot_id === slotId);
      const admittedCandidates = candidates
        .map((artifact) => ({ artifact, admission: admittedByArtifact.get(artifact.runtime_artifact_id) ?? null }))
        .filter(
          (candidate): candidate is {
            artifact: PaperImplementationRuntimeArtifactEnvelope;
            admission: PaperImplementationRuntimeAdmissionRecord;
          } => candidate.admission !== null,
        );
      if (admittedCandidates.length === 0) {
        // First missing/never-admitted role — the reusable prefix ends here.
        break;
      }
      if (admittedCandidates.length > 1) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Resume run ${identity.runId} has ${admittedCandidates.length} admitted artifacts for role ${slotId}.`,
          { resume_issue_codes: [RESUME_ISSUE_CODES.ROLE_AMBIGUOUS] },
        );
      }
      const { artifact, admission } = admittedCandidates[0]!;
      // Continue-execution path pins prompt identity to the current constant so a
      // v1-prefix + v2-suffix mixed chain is rejected (F1-3), and never tolerates a
      // missing D2 tier decision — a reused role with no recorded decision is drift.
      this.assertArtifactIdentity(artifact, identity, {
        checkOutputSchema: true,
        pinPromptToCurrent: true,
        toleratePreD2Identity: false,
      });
      const expectedPriorHashes = reused.map((item) => item.artifact.artifact_payload_hash);
      const priorHashesMatch = artifact.prior_role_artifact_hashes.length === expectedPriorHashes.length
        && artifact.prior_role_artifact_hashes.every((hash, index) => hash === expectedPriorHashes[index]);
      if (!priorHashesMatch) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Resume run ${identity.runId} role ${slotId} does not chain onto the reused admitted prefix.`,
          { resume_issue_codes: [RESUME_ISSUE_CODES.PRIOR_ROLE_CHAIN_DRIFT] },
        );
      }
      const output = this.reusableRoleOutput(artifact);
      if (!output) {
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          `Resume run ${identity.runId} role ${slotId} artifact payload has no reusable role output.`,
          { resume_issue_codes: [RESUME_ISSUE_CODES.ROLE_OUTPUT_UNAVAILABLE] },
        );
      }
      reused.push({ artifact, admission, output });
    }
    const recordedModelOptionId = runArtifacts
      .map((artifact) => artifact.model_option_id)
      .find((value): value is string => Boolean(value)) ?? null;
    return { reused, nextCallIndex, recordedModelOptionId };
  }

  /**
   * D9 identity pinning: the reused artifact must carry exactly the identity this
   * request re-derives. Prompt identity is pinned to the current constant only on
   * the continue-execution path (`pinPromptToCurrent`); the idempotent path defers
   * to intra-run version consistency (F1-3).
   */
  private assertArtifactIdentity(
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    identity: ResumeRequestIdentity,
    options: { checkOutputSchema: boolean; pinPromptToCurrent: boolean; toleratePreD2Identity: boolean },
  ): void {
    const issues: string[] = [];
    if (artifact.source_hash_bundle_hash !== identity.sourceHashBundleHash) {
      issues.push(RESUME_ISSUE_CODES.SOURCE_HASH_BUNDLE_DRIFT);
    }
    if (artifact.input_snapshot_hash !== identity.inputSnapshotHash) {
      issues.push(RESUME_ISSUE_CODES.INPUT_SNAPSHOT_DRIFT);
    }
    if (stableStringify(artifact.target_ref) !== stableStringify(identity.targetRef)) {
      issues.push(RESUME_ISSUE_CODES.TARGET_REF_DRIFT);
    }
    if (artifact.model_profile_id !== identity.modelProfileId) {
      issues.push(RESUME_ISSUE_CODES.MODEL_PROFILE_DRIFT);
    }
    if (
      options.pinPromptToCurrent
      && (artifact.prompt_template_id !== this.descriptor.promptTemplateId
        || artifact.prompt_template_version_id !== this.descriptor.promptTemplateVersion)
    ) {
      issues.push(RESUME_ISSUE_CODES.PROMPT_IDENTITY_DRIFT);
    }
    if (options.checkOutputSchema && artifact.output_schema_id !== this.descriptor.roleOutputSchemaId) {
      issues.push(RESUME_ISSUE_CODES.OUTPUT_SCHEMA_DRIFT);
    }
    if (artifact.execution_mode !== identity.executionMode) {
      issues.push(RESUME_ISSUE_CODES.EXECUTION_MODE_DRIFT);
    }
    if (!this.modelOptionMatches(identity, artifact)) {
      issues.push(RESUME_ISSUE_CODES.MODEL_OPTION_DRIFT);
    }
    issues.push(...this.descriptor.extraIdentityChecks(artifact, identity.extraFacets, {
      toleratePreD2Identity: options.toleratePreD2Identity,
    }));
    if (issues.length > 0) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Resume of run ${identity.runId} rejected: identity drift against the recorded run.`,
        { resume_issue_codes: issues },
      );
    }
  }

  /**
   * Model-option identity for resume: the recorded artifact carries the
   * provider-resolved option id, which may be the profile-prefixed form or the
   * bare option suffix. Compare both sides normalised to the bare suffix. An
   * omitted requested option matches (F1-2 inherits the recorded value instead).
   */
  private modelOptionMatches(
    identity: ResumeRequestIdentity,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
  ): boolean {
    const requested = identity.modelOptionId;
    const recorded = artifact.model_option_id;
    if (!requested || !recorded) {
      return true;
    }
    const prefix = `${identity.modelProfileId}.`;
    const normalize = (value: string) => (value.startsWith(prefix) ? value.slice(prefix.length) : value);
    return normalize(requested) === normalize(recorded);
  }

  /**
   * Run-ownership predicate (F1-1). ref_id is `${runId}.${safeId(seed)}` and
   * run_id may legally contain dots, so a bare `startsWith(`${runId}.`)` would let
   * run `A` absorb sibling `A.retry` (whose artifacts also start with `A.`). safeId
   * strips dots from the seed, so a run's own artifact suffix is always a single
   * dotless token; a deeper-namespaced sibling leaves a dotted remainder. Requiring
   * a dotless remainder is slot-independent — it still surfaces a foreign-slot run
   * for RESUME_SLOT_MISMATCH rather than silently disowning it.
   */
  private belongsToRun(runId: string, artifact: PaperImplementationRuntimeArtifactEnvelope): boolean {
    const refId = artifact.artifact_payload_ref.ref_id;
    const prefix = `${runId}.`;
    if (!refId.startsWith(prefix)) {
      return false;
    }
    const suffix = refId.slice(prefix.length);
    return suffix.length > 0 && !suffix.includes('.');
  }

  private async admittedAdmissionRecord(
    implementationProjectId: string,
    artifact: PaperImplementationRuntimeArtifactEnvelope,
    admissionScope: 'role' | 'final',
  ): Promise<PaperImplementationRuntimeAdmissionRecord | null> {
    const records = await this.admission.listAdmissionRecords(implementationProjectId, {
      runtime_artifact_id: artifact.runtime_artifact_id,
      admission_scope: admissionScope,
    });
    return records.find((record) => record.admission_status === 'admitted') ?? null;
  }

  /** F1-5: one batched admission query for a set of role artifacts. */
  private async admittedRoleAdmissionByArtifact(
    implementationProjectId: string,
    artifacts: PaperImplementationRuntimeArtifactEnvelope[],
  ): Promise<Map<string, PaperImplementationRuntimeAdmissionRecord>> {
    const runtimeArtifactIds = artifacts.map((artifact) => artifact.runtime_artifact_id);
    const byArtifact = new Map<string, PaperImplementationRuntimeAdmissionRecord>();
    if (runtimeArtifactIds.length === 0) {
      return byArtifact;
    }
    const records = await this.admission.listAdmissionRecords(implementationProjectId, {
      runtime_artifact_ids: runtimeArtifactIds,
      admission_scope: 'role',
    });
    for (const record of records) {
      if (record.admission_status === 'admitted') {
        byArtifact.set(record.runtime_artifact_id, record);
      }
    }
    return byArtifact;
  }

  private reusableRoleOutput(artifact: PaperImplementationRuntimeArtifactEnvelope): TRoleOutput | null {
    const value = artifact.artifact_payload.role_output;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      if (record.role_status === 'passed' || record.role_status === 'blocked') {
        return record as unknown as TRoleOutput;
      }
    }
    return null;
  }

  private conflict(runId: string, reason: string, resumeIssueCodes: string[]): AppError {
    return new AppError(
      409,
      'VERSION_CONFLICT',
      `Resume of run ${runId} rejected: ${reason}`,
      { resume_issue_codes: resumeIssueCodes },
    );
  }
}
