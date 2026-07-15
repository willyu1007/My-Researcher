/**
 * Trace-integrity debate semantic-completeness checks (T-124 S3-α2/α3 review N2,
 * hardened by the S3 review F2 group).
 *
 * Single source for the 11-trace-integrity-debate-design.md admission rules:
 * - EVERY cited-ref group present in the output stays within the bounded
 *   retrieval packet (statements + sources) — scanned for ALL sections the
 *   output carries, not just the executing role's own section (F2-1). Out-of-role
 *   sections get this ref-boundary structural check only; role completeness
 *   (e.g. the support map covering every statement) stays role-specific;
 * - support_mapper_map maps every reviewed statement;
 * - skeptic findings are well-formed (unique ids, taxonomy blocker codes);
 * - reconcile disposition completeness lives in ONE shared predicate (F2-2):
 *   with zero skeptic findings the dispositions may be empty or absent; with
 *   findings present there must be exactly one disposition per finding, and
 *   resolved/rebutted dispositions cite non-empty refs;
 * - arbiter coverage spans every reviewed statement and every finding, and every
 *   accepted blocker finding lands in the final blocker set.
 *
 * Two consumers:
 * 1. The trace-integrity runtime service classifies violations as retryable
 *    technical failures (one same-profile retry → terminal failed_runtime) for
 *    BOTH passed and blocked role outputs — the N2 blocked bypass is closed.
 * 2. The runtime admission service re-runs the SAME evaluate function (F2-3:
 *    one implementation, no admission-side fork) on a view parsed from the
 *    self-contained stored artifact payload — never from service-supplied
 *    expected copies — and maps runtime failure codes to admission issue codes.
 *    Admission coverage therefore equals the runtime scan: all within-packet
 *    ref groups (incl. statement_ref-class fields such as
 *    finding.target_statement_ref, support entry statement_ref,
 *    coverage.statement_refs, reviewed_statement_refs), role structured-section
 *    presence/completeness, reconcile disposition completeness, arbiter
 *    coverage, and accepted-blocker carry-over into the arbiter blocker set.
 *
 * Ref identity (F2-6): refKey uses the same stableStringify field-name encoding
 * as the retrieval service's packet construction, so both sides keep agreeing
 * on when two functional refs are "the same ref" if the ref shape grows fields.
 */
import {
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
  type PaperImplementationTraceIntegrityChallengeFinding,
  type PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
  type PaperImplementationTraceIntegrityFindingDisposition,
  type PaperImplementationTraceIntegrityRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { stableStringify } from './literature-content-processing-utils.js';
import {
  PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE,
} from './paper-implementation-runtime-utils.js';

export interface PaperImplementationTraceIntegrityRoleSemanticsInput {
  roleSlotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId;
  output: PaperImplementationTraceIntegrityRoleOutput;
  /** Reviewed statement refs of the bounded retrieval packet. */
  reviewedStatementRefs: TopicSelectionFunctionalRef[];
  /** Source refs of the bounded retrieval packet. */
  sourceRefs: TopicSelectionFunctionalRef[];
  /** Prior role outputs in chain order (needed for reconcile/arbiter checks). */
  priorOutputs: PaperImplementationTraceIntegrityRoleOutput[];
}

/**
 * F2-6: same ref-identity encoding as
 * PaperImplementationTraceIntegrityRetrievalService.refKey (packet construction).
 * Field-name keyed stableStringify — NOT positional join — so a new optional
 * ref field cannot silently shift the encoding out of sync with the packet side.
 */
function refKey(ref: TopicSelectionFunctionalRef): string {
  return stableStringify({
    ref_type: ref.ref_type,
    ref_id: ref.ref_id,
    version_id: ref.version_id ?? null,
    title_card_id: ref.title_card_id ?? null,
  });
}

function refsWithinSet(
  refs: TopicSelectionFunctionalRef[] | null | undefined,
  allowed: Set<string>,
): boolean {
  return (refs ?? []).every((ref) => !ref || allowed.has(refKey(ref)));
}

interface PacketKeySets {
  statementKeys: Set<string>;
  sourceKeys: Set<string>;
  packetKeys: Set<string>;
}

/** One cited-ref group paired explicitly with its allowed key set (F2-3 refactor). */
interface CitedRefGroup {
  refs: TopicSelectionFunctionalRef[] | null | undefined;
  allowed: Set<string>;
}

/**
 * F2-1: every ref group the output carries, independent of which role produced
 * it. Sections belonging to other roles get exactly this ref-boundary check —
 * their completeness rules remain role-specific in the evaluate branches.
 */
function citedRefGroups(
  output: PaperImplementationTraceIntegrityRoleOutput,
  keys: PacketKeySets,
): CitedRefGroup[] {
  return [
    { refs: output.cited_source_refs, allowed: keys.sourceKeys },
    { refs: output.reviewed_statement_refs, allowed: keys.statementKeys },
    ...(output.per_statement_support_map ?? []).flatMap((entry): CitedRefGroup[] => [
      { refs: entry.statement_ref ? [entry.statement_ref] : [], allowed: keys.statementKeys },
      { refs: entry.cited_refs, allowed: keys.packetKeys },
    ]),
    ...(output.challenge_findings ?? []).flatMap((finding): CitedRefGroup[] => [
      {
        refs: finding.target_statement_ref ? [finding.target_statement_ref] : [],
        allowed: keys.statementKeys,
      },
      { refs: finding.cited_refs, allowed: keys.packetKeys },
    ]),
    ...(output.finding_dispositions ?? []).map((item): CitedRefGroup => (
      { refs: item.cited_refs, allowed: keys.packetKeys }
    )),
    ...(output.coverage
      ? [{ refs: output.coverage.statement_refs, allowed: keys.statementKeys }]
      : []),
  ];
}

function skepticFindings(
  priorOutputs: PaperImplementationTraceIntegrityRoleOutput[],
): PaperImplementationTraceIntegrityChallengeFinding[] {
  return priorOutputs
    .filter((output) => output.role_slot_id === 'trace_integrity_review.skeptic_challenge')
    .flatMap((output) => output.challenge_findings ?? []);
}

function acceptedBlockerFindingCodes(
  findings: PaperImplementationTraceIntegrityChallengeFinding[],
  priorOutputs: PaperImplementationTraceIntegrityRoleOutput[],
): string[] {
  const dispositions = priorOutputs
    .filter((output) => output.role_slot_id === 'trace_integrity_review.support_mapper_reconcile')
    .flatMap((output) => output.finding_dispositions ?? []);
  const findingsById = new Map(findings.map((finding) => [finding.finding_id, finding]));
  return dispositions
    .filter((item) => item.disposition === 'accepted_blocker' || item.disposition === 'context_gap_blocker')
    .flatMap((item) => {
      const finding = findingsById.get(item.finding_id);
      return finding ? [finding.blocker_code] : [];
    });
}

/**
 * F2-2: THE reconcile disposition-completeness rule, shared verbatim by the
 * runtime semantic check and the admission independent re-check.
 *
 * Null/undefined input semantics are unified here: absent or empty dispositions
 * are valid when there are no skeptic findings; once findings exist there must
 * be exactly one disposition per finding (no unknown ids, no duplicates), and
 * resolved_with_refs / rebutted_with_refs dispositions cite non-empty refs.
 * (Ref-within-packet checks on disposition refs live in the shared scan.)
 */
export function paperImplementationTraceIntegrityReconcileDispositionsComplete(
  dispositions: PaperImplementationTraceIntegrityFindingDisposition[] | null | undefined,
  findings: PaperImplementationTraceIntegrityChallengeFinding[],
): boolean {
  const items = dispositions ?? [];
  const findingIds = new Set(findings.map((finding) => finding.finding_id));
  const disposedIds = new Set<string>();
  for (const item of items) {
    if (!findingIds.has(item.finding_id) || disposedIds.has(item.finding_id)) {
      return false;
    }
    disposedIds.add(item.finding_id);
    if (
      (item.disposition === 'resolved_with_refs' || item.disposition === 'rebutted_with_refs')
      && (item.cited_refs ?? []).length === 0
    ) {
      return false;
    }
  }
  return [...findingIds].every((id) => disposedIds.has(id));
}

/**
 * Server-side semantic completeness check for one trace-integrity role output.
 * Runs for both `passed` and `blocked` role outputs. Returns the runtime
 * failure code of the FIRST violated rule, or null when the output satisfies
 * the deepened role contract.
 *
 * F2-1: the within-packet scan runs over EVERY cited-ref group in the output
 * (matching the admission-side coverage), so a violation in an out-of-role
 * section is caught here — on the retryable runtime channel — instead of
 * surviving recording and terminating the whole chain at admission.
 */
export function evaluatePaperImplementationTraceIntegrityRoleSemantics(
  input: PaperImplementationTraceIntegrityRoleSemanticsInput,
): string | null {
  const { output } = input;
  const statementKeys = new Set(input.reviewedStatementRefs.map(refKey));
  const sourceKeys = new Set(input.sourceRefs.map(refKey));
  const packetKeys = new Set([...statementKeys, ...sourceKeys]);

  // Shared rule (F2-1): every cited-ref group, whichever section carries it,
  // must stay inside the bounded retrieval packet.
  const groups = citedRefGroups(output, { statementKeys, sourceKeys, packetKeys });
  if (!groups.every((group) => refsWithinSet(group.refs, group.allowed))) {
    return PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE;
  }

  if (input.roleSlotId === 'trace_integrity_review.support_mapper_map') {
    const entries = output.per_statement_support_map;
    if (!entries) {
      return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
    }
    for (const entry of entries) {
      if (entry.support_kind !== 'missing' && (entry.cited_refs ?? []).length === 0) {
        return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
      }
    }
    const mappedStatementKeys = new Set(
      entries.flatMap((entry) => entry.statement_ref ? [refKey(entry.statement_ref)] : []),
    );
    if (![...statementKeys].every((key) => mappedStatementKeys.has(key))) {
      return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
    }
    return null;
  }

  if (input.roleSlotId === 'trace_integrity_review.skeptic_challenge') {
    const findings = output.challenge_findings;
    if (!findings) {
      return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
    }
    const findingIds = new Set<string>();
    for (const finding of findings) {
      if (
        typeof finding.finding_id !== 'string'
        || finding.finding_id.trim().length === 0
        || findingIds.has(finding.finding_id)
      ) {
        return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
      }
      findingIds.add(finding.finding_id);
      if (typeof finding.blocker_code !== 'string' || finding.blocker_code.trim().length === 0) {
        return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
      }
      if (!finding.target_statement_ref) {
        return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
      }
    }
    // A blocked skeptic must ground its verdict in at least one finding.
    if (output.role_status === 'blocked' && findings.length === 0) {
      return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
    }
    return null;
  }

  if (input.roleSlotId === 'trace_integrity_review.support_mapper_reconcile') {
    // F2-2: single shared predicate — absent/empty dispositions are valid only
    // when the skeptic produced zero findings.
    const complete = paperImplementationTraceIntegrityReconcileDispositionsComplete(
      output.finding_dispositions,
      skepticFindings(input.priorOutputs),
    );
    if (!complete) {
      return PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE;
    }
    return null;
  }

  // arbiter_final
  const coverage = output.coverage;
  if (!coverage) {
    return PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE;
  }
  const coveredStatementKeys = new Set((coverage.statement_refs ?? []).map(refKey));
  if (![...statementKeys].every((key) => coveredStatementKeys.has(key))) {
    return PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE;
  }
  const findings = skepticFindings(input.priorOutputs);
  const knownFindingIds = new Set(findings.map((finding) => finding.finding_id));
  const coveredFindingIds = new Set(coverage.finding_ids ?? []);
  if (![...knownFindingIds].every((id) => coveredFindingIds.has(id))) {
    return PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE;
  }
  if (![...coveredFindingIds].every((id) => knownFindingIds.has(id))) {
    return PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE;
  }
  // Every accepted blocker (accepted_blocker / context_gap_blocker disposition)
  // must land in the final blocker set the arbiter carries forward.
  const arbiterBlockerCodes = new Set(output.blocker_codes ?? []);
  const requiredCodes = acceptedBlockerFindingCodes(findings, input.priorOutputs);
  if (!requiredCodes.every((code) => arbiterBlockerCodes.has(code))) {
    return PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Admission-side independent re-check (self-contained artifact payload)
// ---------------------------------------------------------------------------

const TRACE_SEMANTIC_ROLE_SLOT_IDS = new Set<string>(
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_DEBATE_SEMANTIC_ROLE_SLOT_IDS,
);

export const PAPER_IMPLEMENTATION_ADMISSION_ROLE_REF_OUTSIDE_PACKET_ISSUE_CODE =
  'ROLE_CITED_REF_OUTSIDE_RETRIEVAL_PACKET';
export const PAPER_IMPLEMENTATION_ADMISSION_FINDING_DISPOSITION_INCOMPLETE_ISSUE_CODE =
  'ROLE_FINDING_DISPOSITION_INCOMPLETE';
export const PAPER_IMPLEMENTATION_ADMISSION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_ISSUE_CODE =
  'ROLE_STRUCTURED_OUTPUT_INCOMPLETE';
export const PAPER_IMPLEMENTATION_ADMISSION_ROLE_COVERAGE_INCOMPLETE_ISSUE_CODE =
  'ROLE_COVERAGE_INCOMPLETE';

/** F2-3: runtime failure code → admission issue code (same rule, two channels). */
const RUNTIME_FAILURE_CODE_TO_ADMISSION_ISSUE_CODE: Record<string, string> = {
  [PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE]:
    PAPER_IMPLEMENTATION_ADMISSION_ROLE_REF_OUTSIDE_PACKET_ISSUE_CODE,
  [PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE]:
    PAPER_IMPLEMENTATION_ADMISSION_FINDING_DISPOSITION_INCOMPLETE_ISSUE_CODE,
  [PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE]:
    PAPER_IMPLEMENTATION_ADMISSION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_ISSUE_CODE,
  [PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE]:
    PAPER_IMPLEMENTATION_ADMISSION_ROLE_COVERAGE_INCOMPLETE_ISSUE_CODE,
};

interface TraceRoleArtifactPayloadView {
  roleSlotId: PaperImplementationTraceIntegrityDebateSemanticRoleSlotId;
  roleOutput: PaperImplementationTraceIntegrityRoleOutput;
  reviewedStatementRefs: TopicSelectionFunctionalRef[];
  sourceRefs: TopicSelectionFunctionalRef[];
  priorOutputs: PaperImplementationTraceIntegrityRoleOutput[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asRefArray(value: unknown): TopicSelectionFunctionalRef[] {
  return Array.isArray(value)
    ? value.filter((item): item is TopicSelectionFunctionalRef => {
      const record = asRecord(item);
      return Boolean(record && typeof record.ref_type === 'string' && typeof record.ref_id === 'string');
    })
    : [];
}

/**
 * Parse the semantic-role view out of one stored trace-integrity role artifact
 * payload. Returns null for preflight/final/failed payloads or when the payload
 * does not carry a bounded retrieval packet (nothing to re-check).
 */
function traceRoleArtifactPayloadView(
  payload: Record<string, unknown> | null | undefined,
): TraceRoleArtifactPayloadView | null {
  const record = asRecord(payload);
  if (!record) {
    return null;
  }
  const roleOutput = asRecord(record.role_output);
  if (!roleOutput || typeof roleOutput.role_slot_id !== 'string') {
    return null;
  }
  if (!TRACE_SEMANTIC_ROLE_SLOT_IDS.has(roleOutput.role_slot_id)) {
    return null;
  }
  if (roleOutput.role_status !== 'passed' && roleOutput.role_status !== 'blocked') {
    return null;
  }
  const packet = asRecord(record.retrieval_packet);
  if (!packet) {
    return null;
  }
  const reviewedStatements = Array.isArray(packet.reviewed_statements) ? packet.reviewed_statements : [];
  const sources = Array.isArray(packet.sources) ? packet.sources : [];
  const priorOutputs = Array.isArray(record.prior_role_outputs) ? record.prior_role_outputs : [];
  return {
    roleSlotId: roleOutput.role_slot_id as PaperImplementationTraceIntegrityDebateSemanticRoleSlotId,
    roleOutput: roleOutput as unknown as PaperImplementationTraceIntegrityRoleOutput,
    reviewedStatementRefs: asRefArray(
      reviewedStatements.map((item) => asRecord(item)?.statement_ref),
    ),
    sourceRefs: asRefArray(sources.map((item) => asRecord(item)?.source_ref)),
    priorOutputs: priorOutputs
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item.role_slot_id === 'string'))
      .map((item) => item as unknown as PaperImplementationTraceIntegrityRoleOutput),
  };
}

/**
 * Admission-layer independent semantic re-check (T-124 S3-α3 + F2-3): runs the
 * SAME evaluate function as the runtime — on a view parsed ONLY from the stored
 * artifact payload, never from caller-supplied expected values — and maps its
 * runtime failure code to an admission issue code. Returns admission issue
 * codes (empty = no independent objection).
 */
export function paperImplementationTraceIntegrityAdmissionIssueCodes(
  artifactPayload: Record<string, unknown> | null | undefined,
): string[] {
  const view = traceRoleArtifactPayloadView(artifactPayload);
  if (!view) {
    return [];
  }
  const failureCode = evaluatePaperImplementationTraceIntegrityRoleSemantics({
    roleSlotId: view.roleSlotId,
    output: view.roleOutput,
    reviewedStatementRefs: view.reviewedStatementRefs,
    sourceRefs: view.sourceRefs,
    priorOutputs: view.priorOutputs,
  });
  if (!failureCode) {
    return [];
  }
  return [RUNTIME_FAILURE_CODE_TO_ADMISSION_ISSUE_CODE[failureCode] ?? failureCode];
}
