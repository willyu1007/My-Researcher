import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  PaperImplementationTraceIntegrityChallengeFinding,
  PaperImplementationTraceIntegrityFindingDisposition,
  PaperImplementationTraceIntegrityRoleOutput,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE,
  PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE,
} from './paper-implementation-runtime-utils.js';
import {
  PAPER_IMPLEMENTATION_ADMISSION_FINDING_DISPOSITION_INCOMPLETE_ISSUE_CODE,
  PAPER_IMPLEMENTATION_ADMISSION_ROLE_COVERAGE_INCOMPLETE_ISSUE_CODE,
  PAPER_IMPLEMENTATION_ADMISSION_ROLE_REF_OUTSIDE_PACKET_ISSUE_CODE,
  evaluatePaperImplementationTraceIntegrityRoleSemantics,
  paperImplementationTraceIntegrityAdmissionIssueCodes,
  paperImplementationTraceIntegrityReconcileDispositionsComplete,
} from './paper-implementation-trace-debate-semantics.js';

// ---------------------------------------------------------------------------
// Fixtures — a one-statement / one-source bounded retrieval packet.
// ---------------------------------------------------------------------------

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId };
}

const STMT_1 = ref('reviewed_statement', 'statement_001');
const SRC_1 = ref('run_evidence_unit', 'run_evidence_unit_001');
const OUTSIDE = ref('reviewed_statement', 'statement_999_outside_packet');

const REVIEWED_STATEMENT_REFS = [STMT_1];
const SOURCE_REFS = [SRC_1];

function baseOutput(
  roleSlotId: PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
  overrides: Partial<PaperImplementationTraceIntegrityRoleOutput> = {},
): PaperImplementationTraceIntegrityRoleOutput {
  return {
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: `role ${roleSlotId}`,
    reviewed_statement_refs: [STMT_1],
    cited_source_refs: [SRC_1],
    blocker_codes: [],
    warning_codes: [],
    ...overrides,
  };
}

function finding(
  overrides: Partial<PaperImplementationTraceIntegrityChallengeFinding> = {},
): PaperImplementationTraceIntegrityChallengeFinding {
  return {
    finding_id: 'finding_001',
    severity: 'blocker',
    blocker_code: 'TRACE_UNSUPPORTED_STATEMENT',
    target_statement_ref: STMT_1,
    cited_refs: [SRC_1],
    ...overrides,
  };
}

function disposition(
  overrides: Partial<PaperImplementationTraceIntegrityFindingDisposition> = {},
): PaperImplementationTraceIntegrityFindingDisposition {
  return {
    finding_id: 'finding_001',
    disposition: 'resolved_with_refs',
    cited_refs: [SRC_1],
    ...overrides,
  };
}

function evaluate(
  roleSlotId: PaperImplementationTraceIntegrityRoleOutput['role_slot_id'],
  output: PaperImplementationTraceIntegrityRoleOutput,
  priorOutputs: PaperImplementationTraceIntegrityRoleOutput[] = [],
): string | null {
  return evaluatePaperImplementationTraceIntegrityRoleSemantics({
    roleSlotId: roleSlotId as never,
    output,
    reviewedStatementRefs: REVIEWED_STATEMENT_REFS,
    sourceRefs: SOURCE_REFS,
    priorOutputs,
  });
}

const VALID_SUPPORT_MAP = baseOutput('trace_integrity_review.support_mapper_map', {
  per_statement_support_map: [
    { statement_ref: STMT_1, support_kind: 'direct', cited_refs: [SRC_1] },
  ],
});

// ---------------------------------------------------------------------------
// F2-1: runtime scans EVERY cited-ref group, including out-of-role sections.
// ---------------------------------------------------------------------------

test('F2-1: a complete in-packet support map passes', () => {
  assert.equal(evaluate('trace_integrity_review.support_mapper_map', VALID_SUPPORT_MAP), null);
});

test('F2-1: out-of-role section ref outside the packet is rejected on the runtime channel', () => {
  // support_mapper_map is executing, but the output ALSO carries a
  // challenge_findings section (the skeptic's section) whose target_statement_ref
  // points outside the bounded packet. The within-packet scan must catch it here
  // (retryable) rather than letting it survive to admission.
  const output = baseOutput('trace_integrity_review.support_mapper_map', {
    per_statement_support_map: [
      { statement_ref: STMT_1, support_kind: 'direct', cited_refs: [SRC_1] },
    ],
    challenge_findings: [finding({ target_statement_ref: OUTSIDE })],
  });
  assert.equal(
    evaluate('trace_integrity_review.support_mapper_map', output),
    PAPER_IMPLEMENTATION_ROLE_REF_OUTSIDE_RETRIEVAL_PACKET_FAILURE_CODE,
  );
});

test('F2-1: out-of-role section completeness is NOT enforced (only ref boundary)', () => {
  // The carried challenge_findings entry would be INCOMPLETE for the skeptic role
  // (empty blocker_code), but its refs are in-packet. When support_mapper_map is
  // the executing role, only the ref-boundary structural check applies to the
  // out-of-role section — skeptic completeness stays role-specific — so this
  // passes.
  const output = baseOutput('trace_integrity_review.support_mapper_map', {
    per_statement_support_map: [
      { statement_ref: STMT_1, support_kind: 'direct', cited_refs: [SRC_1] },
    ],
    challenge_findings: [finding({ blocker_code: '' })],
  });
  assert.equal(evaluate('trace_integrity_review.support_mapper_map', output), null);
});

test('F2-1: the executing role still enforces its own completeness (unmapped statement)', () => {
  const output = baseOutput('trace_integrity_review.support_mapper_map', {
    per_statement_support_map: [],
  });
  assert.equal(
    evaluate('trace_integrity_review.support_mapper_map', output),
    PAPER_IMPLEMENTATION_ROLE_STRUCTURED_OUTPUT_INCOMPLETE_FAILURE_CODE,
  );
});

// ---------------------------------------------------------------------------
// F2-2: single shared disposition-completeness predicate.
// ---------------------------------------------------------------------------

test('F2-2 predicate: absent/empty dispositions are valid with zero findings', () => {
  assert.equal(paperImplementationTraceIntegrityReconcileDispositionsComplete(undefined, []), true);
  assert.equal(paperImplementationTraceIntegrityReconcileDispositionsComplete([], []), true);
});

test('F2-2 predicate: findings present require exactly one disposition each', () => {
  const findings = [finding()];
  assert.equal(paperImplementationTraceIntegrityReconcileDispositionsComplete([], findings), false);
  assert.equal(
    paperImplementationTraceIntegrityReconcileDispositionsComplete([disposition()], findings),
    true,
  );
});

test('F2-2 predicate: resolved/rebutted dispositions must cite non-empty refs', () => {
  const findings = [finding()];
  assert.equal(
    paperImplementationTraceIntegrityReconcileDispositionsComplete(
      [disposition({ disposition: 'resolved_with_refs', cited_refs: [] })],
      findings,
    ),
    false,
  );
  assert.equal(
    paperImplementationTraceIntegrityReconcileDispositionsComplete(
      [disposition({ disposition: 'accepted_blocker', cited_refs: [] })],
      findings,
    ),
    true,
  );
});

test('F2-2 predicate: duplicate or unknown finding ids are rejected', () => {
  const findings = [finding()];
  assert.equal(
    paperImplementationTraceIntegrityReconcileDispositionsComplete(
      [disposition(), disposition()],
      findings,
    ),
    false,
  );
  assert.equal(
    paperImplementationTraceIntegrityReconcileDispositionsComplete(
      [disposition({ finding_id: 'finding_unknown' })],
      findings,
    ),
    false,
  );
});

test('F2-2: reconcile runtime check agrees with the predicate — empty dispositions, no findings', () => {
  const reconcile = baseOutput('trace_integrity_review.support_mapper_reconcile', {
    finding_dispositions: [],
  });
  assert.equal(evaluate('trace_integrity_review.support_mapper_reconcile', reconcile, []), null);
});

test('F2-2: reconcile runtime check rejects empty dispositions when a skeptic finding exists', () => {
  const skeptic = baseOutput('trace_integrity_review.skeptic_challenge', {
    challenge_findings: [finding()],
  });
  const reconcile = baseOutput('trace_integrity_review.support_mapper_reconcile', {
    finding_dispositions: [],
  });
  assert.equal(
    evaluate('trace_integrity_review.support_mapper_reconcile', reconcile, [skeptic]),
    PAPER_IMPLEMENTATION_ROLE_FINDING_DISPOSITION_INVALID_FAILURE_CODE,
  );
});

// ---------------------------------------------------------------------------
// F2-3: admission-side independent re-check from the self-contained payload.
// ---------------------------------------------------------------------------

function packet(): Record<string, unknown> {
  return {
    reviewed_statements: [{ statement_ref: STMT_1 }],
    sources: [{ source_ref: SRC_1 }],
  };
}

function rolePayload(
  roleOutput: PaperImplementationTraceIntegrityRoleOutput,
  priorRoleOutputs: PaperImplementationTraceIntegrityRoleOutput[] = [],
): Record<string, unknown> {
  return {
    role_output: roleOutput,
    retrieval_packet: packet(),
    prior_role_outputs: priorRoleOutputs,
  };
}

test('F2-3 admission: a valid support-map payload raises no independent objection', () => {
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(VALID_SUPPORT_MAP)),
    [],
  );
});

test('F2-3 admission: statement_ref outside the packet is caught from the stored payload', () => {
  const skeptic = baseOutput('trace_integrity_review.skeptic_challenge', {
    challenge_findings: [finding({ target_statement_ref: OUTSIDE })],
  });
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(skeptic)),
    [PAPER_IMPLEMENTATION_ADMISSION_ROLE_REF_OUTSIDE_PACKET_ISSUE_CODE],
  );
});

test('F2-3 admission: incomplete reconcile dispositions map to the disposition issue code', () => {
  const skeptic = baseOutput('trace_integrity_review.skeptic_challenge', {
    challenge_findings: [finding()],
  });
  const reconcile = baseOutput('trace_integrity_review.support_mapper_reconcile', {
    finding_dispositions: [],
  });
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(reconcile, [skeptic])),
    [PAPER_IMPLEMENTATION_ADMISSION_FINDING_DISPOSITION_INCOMPLETE_ISSUE_CODE],
  );
});

test('F2-3 admission: empty dispositions with no findings agree with runtime (no objection)', () => {
  const reconcile = baseOutput('trace_integrity_review.support_mapper_reconcile', {
    finding_dispositions: [],
  });
  assert.deepEqual(paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(reconcile, [])), []);
});

test('F2-3 admission: arbiter coverage recomputed from prior_role_outputs (missing finding)', () => {
  const skeptic = baseOutput('trace_integrity_review.skeptic_challenge', {
    challenge_findings: [finding()],
  });
  const arbiter = baseOutput('trace_integrity_review.arbiter_final', {
    coverage: { statement_refs: [STMT_1], finding_ids: [] },
  });
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(arbiter, [skeptic])),
    [PAPER_IMPLEMENTATION_ADMISSION_ROLE_COVERAGE_INCOMPLETE_ISSUE_CODE],
  );
});

test('F2-3 admission: an accepted blocker must be carried into the arbiter blocker set', () => {
  const skeptic = baseOutput('trace_integrity_review.skeptic_challenge', {
    challenge_findings: [finding({ blocker_code: 'TRACE_MISSING_LINEAGE' })],
  });
  const reconcile = baseOutput('trace_integrity_review.support_mapper_reconcile', {
    finding_dispositions: [disposition({ disposition: 'accepted_blocker', cited_refs: [SRC_1] })],
  });
  const arbiter = baseOutput('trace_integrity_review.arbiter_final', {
    coverage: { statement_refs: [STMT_1], finding_ids: ['finding_001'] },
    blocker_codes: [],
  });
  assert.equal(
    evaluate('trace_integrity_review.arbiter_final', arbiter, [skeptic, reconcile]),
    PAPER_IMPLEMENTATION_ROLE_COVERAGE_INCOMPLETE_FAILURE_CODE,
  );
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(rolePayload(arbiter, [skeptic, reconcile])),
    [PAPER_IMPLEMENTATION_ADMISSION_ROLE_COVERAGE_INCOMPLETE_ISSUE_CODE],
  );
});

test('F2-3 admission: non-trace / packet-less / non-terminal payloads raise no objection', () => {
  assert.deepEqual(paperImplementationTraceIntegrityAdmissionIssueCodes(null), []);
  assert.deepEqual(paperImplementationTraceIntegrityAdmissionIssueCodes({}), []);
  // No retrieval_packet → nothing to re-check.
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes({ role_output: VALID_SUPPORT_MAP }),
    [],
  );
  // role_status neither passed nor blocked → skipped.
  assert.deepEqual(
    paperImplementationTraceIntegrityAdmissionIssueCodes(
      rolePayload({ ...VALID_SUPPORT_MAP, role_status: 'failed' as never }),
    ),
    [],
  );
});
