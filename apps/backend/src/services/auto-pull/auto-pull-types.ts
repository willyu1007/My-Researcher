import type {
  LiteratureImportItem,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import type { AutoPullSource } from '@paper-engineering-assistant/shared/research-lifecycle/auto-pull-contracts';
import type {
  AutoPullQuerySpec,
  AutoPullRuleRecord,
  AutoPullRuleScheduleRecord,
  AutoPullRuleSourceRecord,
  AutoPullRunSourceAttemptRecord,
  AutoPullTimeSpec,
  TopicProfileRecord,
} from '../../repositories/auto-pull-repository.js';

export type AutoPullRankingMode = 'llm_score' | 'hybrid_score';
export type PublicationStatusSignal = 'published' | 'accepted' | 'preprint' | 'unknown';

export type CandidateRankingSignals = {
  publicationStatus: PublicationStatusSignal;
  publicationYear: number | null;
  citationCount: number | null;
};

export type FetchedCandidate = {
  item: LiteratureImportItem;
  rankingSignals: CandidateRankingSignals;
};

export type RankedCandidate = {
  candidate: FetchedCandidate;
  qualityScore: number;
  rankingScore: number;
  rankingMode: AutoPullRankingMode;
};

export type EligibleCandidate = {
  source: AutoPullSource;
  topicId: string | null;
  candidate: FetchedCandidate;
  qualityScore: number;
  rankingScore: number;
  rankingMode: AutoPullRankingMode;
  suggestedScope: TopicScopeStatus;
  scopeReason: string;
};

export type SourceExecutionResult = {
  source: AutoPullSource;
  fetchedItems: LiteratureImportItem[];
  eligibleCandidates: EligibleCandidate[];
  importedCount: number;
  failedCount: number;
  errorCode: string | null;
  errorMessage: string | null;
  attemptStatus: AutoPullRunSourceAttemptRecord['status'];
  suggestions: Array<{
    literatureId: string;
    topicId: string | null;
    suggestedScope: TopicScopeStatus;
    reason: string;
    score: number;
  }>;
  meta?: Record<string, unknown>;
};

export type RuleBundle = {
  rule: AutoPullRuleRecord;
  topicIds: string[];
  topics: TopicProfileRecord[];
  sources: AutoPullRuleSourceRecord[];
  schedules: AutoPullRuleScheduleRecord[];
};

export type TopicExecutionContext = {
  topicId: string | null;
  querySpec: AutoPullQuerySpec;
  timeSpec: AutoPullTimeSpec;
  initialPullPending: boolean;
};

export type SourceTimeWindowMode = 'bootstrap_full_range' | 'incremental_lookback';
