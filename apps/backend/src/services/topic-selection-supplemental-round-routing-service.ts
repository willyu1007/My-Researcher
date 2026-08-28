import type {
  TopicSelectionCandidateDraftAdmissionReport,
  TopicSelectionCandidateDraftAdmissionResult,
  TopicSelectionSupplementalRoundQuestion,
  TopicSelectionSupplementalRoundRoutingDecision,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-need-validation-contracts';
import { AppError } from '../errors/app-error.js';

const DEFAULT_MAX_SUPPLEMENTAL_QUESTIONS = 5;
const MAX_SUPPLEMENTAL_QUESTIONS = 5;
const MAX_ROUND_INDEX = 3;
const SUPPLEMENTAL_ALLOWED_ROLES = ['explorer', 'deep_critic'];
const SUPPLEMENTAL_FORBIDDEN_ACTIONS = [
  'broad_re_exploration',
  'unrelated_candidate_family',
  'authority_mutation',
  'persistence_write',
  'schema_bypass',
];
const TERMINAL_FORBIDDEN_ACTIONS = [
  'broad_re_exploration',
  'authority_mutation',
  'persistence_write',
];

export type TopicSelectionSupplementalRoundRoutingInput = {
  admission_report: TopicSelectionCandidateDraftAdmissionReport;
  current_round_index?: number | null;
  remaining_round_budget?: number | null;
  max_questions?: number | null;
};

export class TopicSelectionSupplementalRoundRoutingService {
  createRoutingDecision(
    input: TopicSelectionSupplementalRoundRoutingInput,
  ): TopicSelectionSupplementalRoundRoutingDecision {
    this.assertAdmissionReport(input.admission_report);
    const currentRoundIndex = this.roundIndex(input.current_round_index ?? 1);
    const remainingRoundBudget = this.remainingRoundBudget(input.remaining_round_budget ?? 0);
    const maxQuestions = this.maxQuestions(input.max_questions ?? DEFAULT_MAX_SUPPLEMENTAL_QUESTIONS);

    const portfolioRoute = this.portfolioRoute(input.admission_report, currentRoundIndex, remainingRoundBudget);
    if (portfolioRoute) {
      return portfolioRoute;
    }

    const admittedResults = this.resultsByDecision(input.admission_report, 'admit');
    if (admittedResults.length > 0) {
      return this.decision(input.admission_report, {
        currentRoundIndex,
        remainingRoundBudget,
        routingDecision: 'finalize_with_admitted_batch',
        sourceDraftIds: admittedResults.map((result) => result.draft_id),
        triggerReasonCodes: ['ADMITTED_DRAFT_READY'],
        supplementalQuestions: [],
        allowedRoles: [],
        forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
        stopCondition: 'admitted_batch_ready',
      });
    }

    const supplementalResults = this.resultsByDecision(input.admission_report, 'return_for_supplemental_round');
    const humanReviewResults = this.resultsByDecision(input.admission_report, 'require_human_review');
    const canRunSupplementalRound = (
      supplementalResults.length > 0
      && remainingRoundBudget > 0
      && currentRoundIndex < MAX_ROUND_INDEX
    );

    if (canRunSupplementalRound) {
      return this.decision(input.admission_report, {
        currentRoundIndex,
        remainingRoundBudget,
        routingDecision: 'run_supplemental_round',
        sourceDraftIds: supplementalResults.map((result) => result.draft_id),
        triggerReasonCodes: this.reasonCodes(supplementalResults),
        supplementalQuestions: this.supplementalQuestions(supplementalResults, maxQuestions),
        allowedRoles: SUPPLEMENTAL_ALLOWED_ROLES,
        forbiddenActions: SUPPLEMENTAL_FORBIDDEN_ACTIONS,
        stopCondition: 'supplemental_round_requested',
      });
    }

    if (humanReviewResults.length > 0) {
      return this.decision(input.admission_report, {
        currentRoundIndex,
        remainingRoundBudget,
        routingDecision: 'require_human_review',
        sourceDraftIds: humanReviewResults.map((result) => result.draft_id),
        triggerReasonCodes: this.reasonCodes(humanReviewResults, ['HUMAN_REVIEW_REQUIRED']),
        supplementalQuestions: [],
        allowedRoles: [],
        forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
        stopCondition: 'human_review_required',
      });
    }

    if (supplementalResults.length > 0) {
      return this.decision(input.admission_report, {
        currentRoundIndex,
        remainingRoundBudget,
        routingDecision: 'block',
        sourceDraftIds: supplementalResults.map((result) => result.draft_id),
        triggerReasonCodes: this.reasonCodes(supplementalResults, ['EXHAUSTED_SUPPLEMENTAL_ROUND_BUDGET']),
        supplementalQuestions: [],
        allowedRoles: [],
        forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
        stopCondition: 'supplemental_round_budget_exhausted',
      });
    }

    if (input.admission_report.blocking_reason_codes.length > 0) {
      return this.decision(input.admission_report, {
        currentRoundIndex,
        remainingRoundBudget,
        routingDecision: 'block',
        sourceDraftIds: input.admission_report.draft_results.map((result) => result.draft_id),
        triggerReasonCodes: input.admission_report.blocking_reason_codes,
        supplementalQuestions: [],
        allowedRoles: [],
        forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
        stopCondition: 'admission_blocked',
      });
    }

    return this.decision(input.admission_report, {
      currentRoundIndex,
      remainingRoundBudget,
      routingDecision: 'reject_without_supplement',
      sourceDraftIds: input.admission_report.draft_results.map((result) => result.draft_id),
      triggerReasonCodes: this.reasonCodes(input.admission_report.draft_results, ['NO_ADMISSIBLE_NEED_CANDIDATE']),
      supplementalQuestions: [],
      allowedRoles: [],
      forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
      stopCondition: 'no_supplementable_drafts',
    });
  }

  private portfolioRoute(
    report: TopicSelectionCandidateDraftAdmissionReport,
    currentRoundIndex: number,
    remainingRoundBudget: number,
  ): TopicSelectionSupplementalRoundRoutingDecision | null {
    const portfolio = report.portfolio_disposition;
    if (!portfolio || portfolio.outcome === 'selected') {
      return null;
    }

    const routeByOutcome = {
      none_viable: {
        routingDecision: 'stop_without_candidate',
        triggerReasonCode: 'PORTFOLIO_NONE_VIABLE',
        stopCondition: 'portfolio_none_viable',
      },
      evidence_expansion_required: {
        routingDecision: 'expand_evidence',
        triggerReasonCode: 'PORTFOLIO_EVIDENCE_EXPANSION_REQUIRED',
        stopCondition: 'portfolio_evidence_expansion_required',
      },
      reframe_required: {
        routingDecision: 'reframe_scope',
        triggerReasonCode: 'PORTFOLIO_REFRAME_REQUIRED',
        stopCondition: 'portfolio_reframe_required',
      },
    } as const;
    const route = routeByOutcome[portfolio.outcome];
    return this.decision(report, {
      currentRoundIndex,
      remainingRoundBudget,
      routingDecision: route.routingDecision,
      sourceDraftIds: portfolio.candidate_dispositions.map((candidate) => candidate.candidate_key),
      triggerReasonCodes: [route.triggerReasonCode],
      supplementalQuestions: [],
      allowedRoles: [],
      forbiddenActions: TERMINAL_FORBIDDEN_ACTIONS,
      stopCondition: route.stopCondition,
    });
  }

  private decision(
    report: TopicSelectionCandidateDraftAdmissionReport,
    input: {
      currentRoundIndex: number;
      remainingRoundBudget: number;
      routingDecision: TopicSelectionSupplementalRoundRoutingDecision['routing_decision'];
      sourceDraftIds: string[];
      triggerReasonCodes: string[];
      supplementalQuestions: TopicSelectionSupplementalRoundQuestion[];
      allowedRoles: string[];
      forbiddenActions: string[];
      stopCondition: string;
    },
  ): TopicSelectionSupplementalRoundRoutingDecision {
    return {
      schema_version: 'v1',
      batch_id: report.batch_id,
      node_attempt_id: report.node_attempt_id,
      current_round_index: input.currentRoundIndex,
      remaining_round_budget: input.remainingRoundBudget,
      routing_decision: input.routingDecision,
      source_draft_ids: this.uniqueStrings(input.sourceDraftIds),
      trigger_reason_codes: this.uniqueStrings(input.triggerReasonCodes),
      supplemental_questions: input.supplementalQuestions,
      allowed_roles: input.allowedRoles,
      forbidden_actions: input.forbiddenActions,
      stop_condition: input.stopCondition,
    };
  }

  private supplementalQuestions(
    results: TopicSelectionCandidateDraftAdmissionResult[],
    maxQuestions: number,
  ): TopicSelectionSupplementalRoundQuestion[] {
    const questions: TopicSelectionSupplementalRoundQuestion[] = [];
    for (const result of this.byRank(results)) {
      const sourceQuestions = result.supplemental_questions.length > 0
        ? result.supplemental_questions
        : [this.fallbackQuestion(result)];
      for (const [index, question] of sourceQuestions.entries()) {
        if (questions.length >= maxQuestions) {
          return questions;
        }
        questions.push({
          question_id: `supplemental_${result.draft_id}_${index + 1}`,
          source_draft_id: result.draft_id,
          question,
          reason_code: result.reason_codes[0] ?? 'SUPPLEMENTAL_ROUND_REQUIRED',
        });
      }
    }
    return questions;
  }

  private fallbackQuestion(result: TopicSelectionCandidateDraftAdmissionResult): string {
    const reasonCode = result.reason_codes[0] ?? 'supplemental evidence gap';
    return `Resolve ${reasonCode} for draft ${result.draft_id} using only scoped evidence refs and explicit risk or conflict boundaries.`;
  }

  private resultsByDecision(
    report: TopicSelectionCandidateDraftAdmissionReport,
    decision: TopicSelectionCandidateDraftAdmissionResult['decision'],
  ): TopicSelectionCandidateDraftAdmissionResult[] {
    return this.byRank(report.draft_results.filter((result) => result.decision === decision));
  }

  private byRank(results: TopicSelectionCandidateDraftAdmissionResult[]): TopicSelectionCandidateDraftAdmissionResult[] {
    return [...results].sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return left.draft_id.localeCompare(right.draft_id);
    });
  }

  private reasonCodes(
    results: TopicSelectionCandidateDraftAdmissionResult[],
    fallback: string[] = [],
  ): string[] {
    const codes = results.flatMap((result) => result.reason_codes);
    return this.uniqueStrings([...codes, ...fallback]);
  }

  private roundIndex(value: number): number {
    if (!Number.isInteger(value) || value < 1 || value > MAX_ROUND_INDEX) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'current_round_index must be an integer from 1 to 3.');
    }
    return value;
  }

  private remainingRoundBudget(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'remaining_round_budget must be a non-negative integer.');
    }
    return value;
  }

  private maxQuestions(value: number): number {
    if (!Number.isInteger(value) || value < 1) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'max_questions must be a positive integer.');
    }
    return Math.min(value, MAX_SUPPLEMENTAL_QUESTIONS);
  }

  private assertAdmissionReport(report: TopicSelectionCandidateDraftAdmissionReport): void {
    if (!report || typeof report !== 'object') {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admission_report is required.');
    }
    if (!report.batch_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admission_report.batch_id cannot be empty.');
    }
    if (!report.node_attempt_id?.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admission_report.node_attempt_id cannot be empty.');
    }
    if (!Array.isArray(report.draft_results)) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'admission_report.draft_results must be an array.');
    }
  }

  private uniqueStrings(values: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const value of values) {
      const normalized = value.trim();
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      unique.push(normalized);
    }
    return unique;
  }
}
