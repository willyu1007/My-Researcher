import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionCandidateDropReasonCode,
  TopicSelectionCandidatePortfolioDispositionKind,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import type {
  TopicSelectionResearchArenaExecutionAccounting,
  TopicSelectionResearchArenaRoleOutput,
  TopicSelectionResearchArenaShadowRole,
  TopicSelectionResearchArenaShadowRunResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

export type TopicSelectionResearchArenaShadowProofCaseKind =
  | 'ambiguous_lineage'
  | 'dominance_pair'
  | 'evidence_perturbation';

export interface TopicSelectionResearchArenaShadowProofAttempt {
  response: TopicSelectionResearchArenaShadowRunResponse;
  role_outputs: TopicSelectionResearchArenaRoleOutput[];
}

export interface TopicSelectionResearchArenaShadowProofCase {
  case_id: string;
  case_kind: TopicSelectionResearchArenaShadowProofCaseKind;
  attempts: TopicSelectionResearchArenaShadowProofAttempt[];
  candidate_refs: TopicSelectionFunctionalRef[];
  expected_drop_reason_code: TopicSelectionCandidateDropReasonCode | null;
}

export interface TopicSelectionResearchArenaShadowProofInput {
  proof_key: string;
  cases: TopicSelectionResearchArenaShadowProofCase[];
}

interface ShadowProofAttemptSummary {
  arena_session_id: string;
  input_snapshot_hash: string;
  outcome: TopicSelectionResearchArenaShadowRunResponse['advisory_synthesis']['outcome'];
  candidate_dispositions: Array<{
    candidate_ref: TopicSelectionFunctionalRef;
    disposition: TopicSelectionCandidatePortfolioDispositionKind;
  }>;
  role_positions: Array<{
    participant_role: TopicSelectionResearchArenaShadowRole;
    candidate_ref: TopicSelectionFunctionalRef;
    disposition: TopicSelectionCandidatePortfolioDispositionKind;
    drop_reason_code: TopicSelectionCandidateDropReasonCode | null;
  }>;
  evidence_packet_hashes: string[];
  role_output_hashes: string[];
  loop_delta_refs: TopicSelectionResearchArenaShadowRunResponse['arena_session']['loop_delta_refs'];
  supersedes_arena_session_id: string | null;
  execution_accounting: TopicSelectionResearchArenaExecutionAccounting;
}

interface ShadowProofCaseResult {
  case_id: string;
  case_kind: TopicSelectionResearchArenaShadowProofCaseKind;
  status: 'passed' | 'failed' | 'inspect';
  reason_codes: string[];
  attempts: ShadowProofAttemptSummary[];
}

interface ShadowProofMetrics {
  dominance_consistency: { passed: number; total: number };
  perturbation_sensitivity: { passed: number; total: number };
  evidence_independent_attempt_count: number;
  evidence_backed_drop_count: number;
  drop_recommendation_count: number;
  non_provider_role_invocation_count: number;
  provider_call_count: 0;
  retrieval_run_count: number;
  retrieval_hit_count: number;
  evidence_excerpt_chars: number;
  duration_ms: number;
  estimated_downstream_stages_avoided: number;
}

export interface TopicSelectionResearchArenaShadowProofReport {
  schema_version: 'TopicSelectionResearchArenaShadowProof@v1';
  proof_key: string;
  case_results: ShadowProofCaseResult[];
  metrics: ShadowProofMetrics;
  live_authority_write_count: 0;
  activation_recommendation: 'remain_shadow_only';
  open_obligations: string[];
  human_view_markdown: string;
  llm_working_set: {
    proof_key: string;
    case_results: ShadowProofCaseResult[];
    metrics: ShadowProofMetrics;
    invariants: string[];
    open_obligations: string[];
  };
  technical_trace_hash: string;
  support_only: true;
}

const DISPOSITION_RANK: Record<TopicSelectionCandidatePortfolioDispositionKind, number> = {
  dropped: 0,
  parked: 1,
  selected: 2,
};

export class TopicSelectionResearchArenaShadowProofService {
  evaluate(input: TopicSelectionResearchArenaShadowProofInput): TopicSelectionResearchArenaShadowProofReport {
    if (!input.proof_key.trim() || input.cases.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Shadow proof requires a proof key and at least one case.');
    }
    const caseIds = input.cases.map((candidate) => candidate.case_id);
    if (new Set(caseIds).size !== caseIds.length) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Shadow proof case ids must be unique.');
    }
    const caseResults = input.cases.map((candidate) => this.evaluateCase(candidate));
    const attempts = caseResults.flatMap((candidate) => candidate.attempts);
    const dominanceResults = caseResults.filter((candidate) => candidate.case_kind === 'dominance_pair');
    const perturbationResults = caseResults.filter((candidate) => candidate.case_kind === 'evidence_perturbation');
    const roleReviews = input.cases.flatMap((candidate) => candidate.attempts)
      .flatMap((attempt) => attempt.role_outputs)
      .flatMap((output) => output.candidate_reviews);
    const droppedReviews = roleReviews.filter((review) => review.recommended_disposition === 'dropped');
    const metrics: ShadowProofMetrics = {
      dominance_consistency: {
        passed: dominanceResults.filter((candidate) => candidate.status === 'passed').length,
        total: dominanceResults.length,
      },
      perturbation_sensitivity: {
        passed: perturbationResults.filter((candidate) => candidate.status === 'passed').length,
        total: perturbationResults.length,
      },
      evidence_independent_attempt_count: attempts.length,
      evidence_backed_drop_count: droppedReviews.filter((review) => (
        review.drop_reason_code !== null
        && review.evidence_unit_refs.length > 0
        && review.reopening_conditions.length > 0
      )).length,
      drop_recommendation_count: droppedReviews.length,
      non_provider_role_invocation_count: this.sumAccounting(attempts, 'non_provider_role_invocation_count'),
      provider_call_count: 0,
      retrieval_run_count: this.sumAccounting(attempts, 'retrieval_run_count'),
      retrieval_hit_count: this.sumAccounting(attempts, 'retrieval_hit_count'),
      evidence_excerpt_chars: this.sumAccounting(attempts, 'evidence_excerpt_chars'),
      duration_ms: this.sumAccounting(attempts, 'duration_ms'),
      estimated_downstream_stages_avoided: attempts.filter(
        (attempt) => attempt.outcome === 'none_viable',
      ).length * 4,
    };
    const openObligations = [
      'Researcher review of the human projection is still required before Phase 9 activation.',
      'Override convergence and live work-avoided measurements remain accumulation metrics, not fixture claims.',
      'Provider and multi-provider calibration remain outside T-147 Phase 8D.',
    ];
    const traceBody = {
      schema_version: 'TopicSelectionResearchArenaShadowProof@v1' as const,
      proof_key: input.proof_key,
      case_results: caseResults,
      metrics,
      live_authority_write_count: 0 as const,
      activation_recommendation: 'remain_shadow_only' as const,
      open_obligations: openObligations,
      support_only: true as const,
    };
    const technicalTraceHash = sha256Text(stableStringify(traceBody));
    const llmWorkingSet = {
      proof_key: input.proof_key,
      case_results: caseResults,
      metrics,
      invariants: [
        'Every attempt contains exactly two independent first-pass role executions.',
        'Every role output hash matches its persisted output-artifact hash.',
        'Every evidence perturbation contains exactly one typed evidence delta and at most one retry.',
        'Provider calls and live research-authority writes remain zero.',
      ],
      open_obligations: openObligations,
    };
    return {
      ...traceBody,
      human_view_markdown: this.renderHumanView(caseResults, metrics),
      llm_working_set: llmWorkingSet,
      technical_trace_hash: technicalTraceHash,
    };
  }

  private evaluateCase(input: TopicSelectionResearchArenaShadowProofCase): ShadowProofCaseResult {
    if (!input.case_id.trim()) throw new AppError(400, 'INVALID_PAYLOAD', 'Shadow proof case id is required.');
    if (input.attempts.length > 2) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${input.case_id} admits at most one retry.`);
    }
    const attempts = input.attempts.map((attempt) => this.summarizeAttempt(input.case_id, attempt));
    if (input.case_kind === 'ambiguous_lineage') {
      if (attempts.length !== 1 || input.candidate_refs.length !== 1) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'An ambiguous-lineage case requires one attempt and one candidate ref.');
      }
      return { case_id: input.case_id, case_kind: input.case_kind, status: 'inspect', reason_codes: ['HUMAN_JUDGMENT_REQUIRED'], attempts };
    }
    if (input.case_kind === 'dominance_pair') {
      if (attempts.length !== 2 || input.candidate_refs.length !== 2) {
        throw new AppError(400, 'INVALID_PAYLOAD', 'A dominance pair requires dominated/preferred attempts and candidate refs.');
      }
      const dominated = this.requireCandidateDisposition(attempts[0]!, input.candidate_refs[0]!);
      const preferred = this.requireCandidateDisposition(attempts[1]!, input.candidate_refs[1]!);
      const passed = DISPOSITION_RANK[preferred] >= DISPOSITION_RANK[dominated];
      return {
        case_id: input.case_id,
        case_kind: input.case_kind,
        status: passed ? 'passed' : 'failed',
        reason_codes: [passed ? 'DOMINANCE_ORDER_PRESERVED' : 'DOMINATED_CANDIDATE_RANKED_BETTER'],
        attempts,
      };
    }
    if (attempts.length !== 2 || input.candidate_refs.length !== 1 || !input.expected_drop_reason_code) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'An evidence perturbation requires two attempts, one candidate, and one expected drop code.');
    }
    const [withoutEvidence, withEvidence] = attempts;
    if (withEvidence!.supersedes_arena_session_id !== withoutEvidence!.arena_session_id
      || withEvidence!.loop_delta_refs.length !== 1
      || withEvidence!.loop_delta_refs[0]?.delta_type !== 'evidence') {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        `${input.case_id} retry requires exactly one typed evidence delta against the first attempt.`,
      );
    }
    const baselineKiller = this.requireRolePosition(withoutEvidence!, 'prior_art_topic_killer', input.candidate_refs[0]!);
    const variantKiller = this.requireRolePosition(withEvidence!, 'prior_art_topic_killer', input.candidate_refs[0]!);
    const passed = !(baselineKiller.disposition === 'dropped'
      && baselineKiller.drop_reason_code === input.expected_drop_reason_code)
      && variantKiller.disposition === 'dropped'
      && variantKiller.drop_reason_code === input.expected_drop_reason_code;
    return {
      case_id: input.case_id,
      case_kind: input.case_kind,
      status: passed ? 'passed' : 'failed',
      reason_codes: [passed ? 'PERTURBATION_SIGNAL_PRESENT_ONLY_WITH_EVIDENCE' : 'PERTURBATION_SIGNAL_DRIFT'],
      attempts,
    };
  }

  private summarizeAttempt(
    caseId: string,
    input: TopicSelectionResearchArenaShadowProofAttempt,
  ): ShadowProofAttemptSummary {
    const { response, role_outputs: roleOutputs } = input;
    if (!response.support_only || !response.arena_session.support_only
      || response.execution_accounting.provider_call_count !== 0
      || response.execution_accounting.non_provider_role_invocation_count !== 2
      || response.role_executions.length !== 2 || roleOutputs.length !== 2) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${caseId} attempt is outside the two-role support-only boundary.`);
    }
    const outputsByRole = new Map(roleOutputs.map((output) => [output.participant_role, output]));
    const executionRoles = new Set(response.role_executions.map((execution) => execution.participant_role));
    if (outputsByRole.size !== 2 || executionRoles.size !== 2) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${caseId} attempt requires one scout and one killer output.`);
    }
    const packetHashes = new Set<string>();
    const rolePositions: ShadowProofAttemptSummary['role_positions'] = [];
    for (const execution of response.role_executions) {
      const output = outputsByRole.get(execution.participant_role as TopicSelectionResearchArenaShadowRole);
      if (!output || execution.pass_kind !== 'first_pass'
        || execution.arena_session_id !== response.arena_session.arena_session_id
        || execution.input_snapshot_hash !== response.arena_session.input_snapshot_hash
        || execution.prior_role_hashes.length > 0
        || execution.exposure_artifact_refs.length !== 1
        || this.refKey(execution.exposure_artifact_refs[0]!) !== this.refKey(execution.evidence_packet_artifact_ref)
        || execution.output_artifact_hash !== sha256Text(stableStringify(output))) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${caseId} attempt failed first-pass replay integrity.`);
      }
      packetHashes.add(execution.evidence_packet_hash);
      for (const review of output.candidate_reviews) {
        rolePositions.push({
          participant_role: output.participant_role,
          candidate_ref: review.candidate_ref,
          disposition: review.recommended_disposition,
          drop_reason_code: review.drop_reason_code,
        });
      }
    }
    if (packetHashes.size !== 2) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `${caseId} roles must use distinct EvidencePackets.`);
    }
    return {
      arena_session_id: response.arena_session.arena_session_id,
      input_snapshot_hash: response.arena_session.input_snapshot_hash,
      outcome: response.advisory_synthesis.outcome,
      candidate_dispositions: response.advisory_synthesis.candidate_dispositions.map((candidate) => ({
        candidate_ref: candidate.candidate_ref,
        disposition: candidate.disposition,
      })),
      role_positions: rolePositions,
      evidence_packet_hashes: response.role_executions.map((execution) => execution.evidence_packet_hash),
      role_output_hashes: response.role_executions.map((execution) => execution.output_artifact_hash),
      loop_delta_refs: response.arena_session.loop_delta_refs,
      supersedes_arena_session_id: response.arena_session.supersedes_arena_session_id,
      execution_accounting: response.execution_accounting,
    };
  }

  private requireCandidateDisposition(
    attempt: ShadowProofAttemptSummary,
    candidateRef: TopicSelectionFunctionalRef,
  ): TopicSelectionCandidatePortfolioDispositionKind {
    const candidate = attempt.candidate_dispositions.find(
      (item) => this.refKey(item.candidate_ref) === this.refKey(candidateRef),
    );
    if (!candidate) throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Proof candidate is absent from advisory synthesis.');
    return candidate.disposition;
  }

  private requireRolePosition(
    attempt: ShadowProofAttemptSummary,
    role: TopicSelectionResearchArenaShadowRole,
    candidateRef: TopicSelectionFunctionalRef,
  ): ShadowProofAttemptSummary['role_positions'][number] {
    const position = attempt.role_positions.find((candidate) => (
      candidate.participant_role === role && this.refKey(candidate.candidate_ref) === this.refKey(candidateRef)
    ));
    if (!position) throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Proof role position is missing.');
    return position;
  }

  private sumAccounting(
    attempts: ShadowProofAttemptSummary[],
    key: Exclude<keyof TopicSelectionResearchArenaExecutionAccounting, 'provider_call_count'>,
  ): number {
    return attempts.reduce((total, attempt) => total + attempt.execution_accounting[key], 0);
  }

  private renderHumanView(caseResults: ShadowProofCaseResult[], metrics: ShadowProofMetrics): string {
    const failed = caseResults.filter((candidate) => candidate.status === 'failed');
    return [
      '# 选题 Research Arena 影子验证',
      '',
      '## 结论',
      failed.length === 0
        ? '- 两组优势关系和一组证据扰动均符合预期；模糊案例保留人工判断。'
        : `- 有 ${failed.length} 个校准案例未通过，不能进入激活讨论。`,
      '- 当前建议：暂不激活，先由研究者审阅本报告并继续积累 override 证据。',
      '',
      '## 证据独立性',
      `- ${metrics.evidence_independent_attempt_count} 次运行均使用两份独立 EvidencePacket；持久化输出哈希可重放。`,
      '',
      '## 停止、暂存与继续',
      `- 优势关系：${metrics.dominance_consistency.passed}/${metrics.dominance_consistency.total}。`,
      `- 证据扰动：${metrics.perturbation_sensitivity.passed}/${metrics.perturbation_sensitivity.total}。`,
      `- 有证据、理由码和重开条件的 drop：${metrics.evidence_backed_drop_count}/${metrics.drop_recommendation_count}。`,
      '',
      '## 重试价值',
      '- 每个扰动案例最多一次重试，且必须绑定一项 typed evidence delta。',
      '',
      '## 成本',
      `- 非 provider 角色调用 ${metrics.non_provider_role_invocation_count} 次；provider 调用 ${metrics.provider_call_count} 次。`,
      `- 检索运行 ${metrics.retrieval_run_count} 次、命中 ${metrics.retrieval_hit_count} 条、模型可见摘录 ${metrics.evidence_excerpt_chars} 字符、记录耗时 ${metrics.duration_ms} ms。`,
      '',
      '## 避免的工作',
      `- 按 gap 后四个主要阶段估算，成功 none_viable 建议可避免 ${metrics.estimated_downstream_stages_avoided} 个下游阶段；这是透明估算，不是实测节省。`,
      '',
      '## 下一次人工判断',
      '- 请审阅具体证据、drop 理由与模糊案例；在 Phase 9 前保持 support-only。',
    ].join('\n');
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }
}
