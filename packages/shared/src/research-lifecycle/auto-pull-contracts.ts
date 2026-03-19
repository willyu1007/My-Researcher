import type { TopicScopeStatus } from './literature-contracts.js';

export const AUTO_PULL_SCOPES = ['GLOBAL', 'TOPIC'] as const;
export type AutoPullScope = (typeof AUTO_PULL_SCOPES)[number];

export const AUTO_PULL_RULE_STATUSES = ['ACTIVE', 'PAUSED'] as const;
export type AutoPullRuleStatus = (typeof AUTO_PULL_RULE_STATUSES)[number];

export const AUTO_PULL_SOURCES = ['CROSSREF', 'ARXIV', 'ZOTERO'] as const;
export type AutoPullSource = (typeof AUTO_PULL_SOURCES)[number];

export const AUTO_PULL_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
export type AutoPullFrequency = (typeof AUTO_PULL_FREQUENCIES)[number];

export const AUTO_PULL_TRIGGER_TYPES = ['MANUAL', 'SCHEDULE'] as const;
export type AutoPullTriggerType = (typeof AUTO_PULL_TRIGGER_TYPES)[number];

export const AUTO_PULL_RUN_STATUSES = ['PENDING', 'RUNNING', 'PARTIAL', 'SUCCESS', 'FAILED', 'SKIPPED'] as const;
export type AutoPullRunStatus = (typeof AUTO_PULL_RUN_STATUSES)[number];

export const AUTO_PULL_ALERT_LEVELS = ['WARNING', 'ERROR'] as const;
export type AutoPullAlertLevel = (typeof AUTO_PULL_ALERT_LEVELS)[number];

export interface TopicProfileDTO {
  topic_id: string;
  name: string;
  is_active: boolean;
  initial_pull_pending: boolean;
  include_keywords: string[];
  exclude_keywords: string[];
  venue_filters: string[];
  default_lookback_days: number;
  default_min_year: number | null;
  default_max_year: number | null;
  rule_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTopicProfileRequest {
  topic_id: string;
  name: string;
  is_active?: boolean;
  initial_pull_pending?: boolean;
  include_keywords?: string[];
  exclude_keywords?: string[];
  venue_filters?: string[];
  default_lookback_days?: number;
  default_min_year?: number | null;
  default_max_year?: number | null;
  rule_ids?: string[];
}

export interface UpdateTopicProfileRequest {
  name?: string;
  is_active?: boolean;
  initial_pull_pending?: boolean;
  include_keywords?: string[];
  exclude_keywords?: string[];
  venue_filters?: string[];
  default_lookback_days?: number;
  default_min_year?: number | null;
  default_max_year?: number | null;
  rule_ids?: string[];
}

export interface AutoPullRuleSourceDTO {
  source: AutoPullSource;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
}

export interface AutoPullRuleScheduleDTO {
  frequency: AutoPullFrequency;
  days_of_week: string[];
  hour: number;
  minute: number;
  timezone: string;
  active: boolean;
}

export interface AutoPullRuleDTO {
  rule_id: string;
  scope: AutoPullScope;
  topic_id: string | null;
  topic_ids: string[];
  name: string;
  status: AutoPullRuleStatus;
  query_spec: {
    include_keywords: string[];
    exclude_keywords: string[];
    authors: string[];
    venues: string[];
    max_results_per_source: number;
  };
  time_spec: {
    lookback_days: number;
    min_year: number | null;
    max_year: number | null;
  };
  quality_spec: {
    min_quality_score: number;
  };
  sources: AutoPullRuleSourceDTO[];
  schedules: AutoPullRuleScheduleDTO[];
  created_at: string;
  updated_at: string;
}

export interface CreateAutoPullRuleRequest {
  scope: AutoPullScope;
  topic_id?: string;
  topic_ids?: string[];
  name: string;
  status?: AutoPullRuleStatus;
  query_spec?: {
    include_keywords?: string[];
    exclude_keywords?: string[];
    authors?: string[];
    venues?: string[];
    max_results_per_source?: number;
  };
  time_spec?: {
    lookback_days?: number;
    min_year?: number | null;
    max_year?: number | null;
  };
  quality_spec?: {
    min_quality_score?: number;
  };
  sources: Array<{
    source: AutoPullSource;
    enabled?: boolean;
    priority?: number;
    config?: Record<string, unknown>;
  }>;
  schedules: Array<{
    frequency: AutoPullFrequency;
    days_of_week?: string[];
    hour: number;
    minute: number;
    timezone: string;
    active?: boolean;
  }>;
}

export interface UpdateAutoPullRuleRequest {
  scope?: AutoPullScope;
  topic_id?: string | null;
  topic_ids?: string[];
  name?: string;
  status?: AutoPullRuleStatus;
  query_spec?: {
    include_keywords?: string[];
    exclude_keywords?: string[];
    authors?: string[];
    venues?: string[];
    max_results_per_source?: number;
  };
  time_spec?: {
    lookback_days?: number;
    min_year?: number | null;
    max_year?: number | null;
  };
  quality_spec?: {
    min_quality_score?: number;
  };
  sources?: Array<{
    source: AutoPullSource;
    enabled?: boolean;
    priority?: number;
    config?: Record<string, unknown>;
  }>;
  schedules?: Array<{
    frequency: AutoPullFrequency;
    days_of_week?: string[];
    hour: number;
    minute: number;
    timezone: string;
    active?: boolean;
  }>;
}

export interface CreateAutoPullRunRequest {
  trigger_type?: AutoPullTriggerType;
  full_refresh?: boolean;
}

export interface RetryFailedSourcesRequest {
  sources?: AutoPullSource[];
}

export interface AutoPullRunSourceAttemptDTO {
  source: AutoPullSource;
  status: AutoPullRunStatus;
  fetched_count: number;
  imported_count: number;
  failed_count: number;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  meta: Record<string, unknown>;
}

export interface AutoPullSuggestionDTO {
  suggestion_id: string;
  literature_id: string;
  topic_id: string | null;
  suggested_scope: TopicScopeStatus;
  reason: string;
  score: number;
  created_at: string;
}

export interface AutoPullRunDTO {
  run_id: string;
  rule_id: string;
  trigger_type: AutoPullTriggerType;
  status: AutoPullRunStatus;
  started_at: string | null;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  source_attempts?: AutoPullRunSourceAttemptDTO[];
  suggestions?: AutoPullSuggestionDTO[];
}

export interface AutoPullAlertDTO {
  alert_id: string;
  rule_id: string;
  run_id: string | null;
  source: AutoPullSource | null;
  level: AutoPullAlertLevel;
  code: string;
  message: string;
  detail: Record<string, unknown>;
  ack_at: string | null;
  created_at: string;
}

export interface AcknowledgeAlertRequest {
  ack_at?: string;
}

const autoPullRuleSourceSchema = {
  type: 'object',
  required: ['source'],
  properties: {
    source: { type: 'string', enum: AUTO_PULL_SOURCES },
    enabled: { type: 'boolean', default: true },
    priority: { type: 'integer', minimum: 1, maximum: 999, default: 100 },
    config: { type: 'object', additionalProperties: true, default: {} },
  },
  additionalProperties: false,
} as const;

const autoPullRuleScheduleSchema = {
  type: 'object',
  required: ['frequency', 'hour', 'minute', 'timezone'],
  properties: {
    frequency: { type: 'string', enum: AUTO_PULL_FREQUENCIES },
    days_of_week: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    hour: { type: 'integer', minimum: 0, maximum: 23 },
    minute: { type: 'integer', minimum: 0, maximum: 59 },
    timezone: { type: 'string', minLength: 1 },
    active: { type: 'boolean', default: true },
  },
  additionalProperties: false,
} as const;

export const createTopicProfileRequestSchema = {
  type: 'object',
  required: ['topic_id', 'name'],
  properties: {
    topic_id: { type: 'string', minLength: 1 },
    name: { type: 'string', minLength: 1 },
    is_active: { type: 'boolean', default: true },
    initial_pull_pending: { type: 'boolean', default: true },
    include_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    exclude_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    venue_filters: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      default: [],
    },
    default_lookback_days: { type: 'integer', minimum: 1, maximum: 3650, default: 30 },
    default_min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    default_max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    rule_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
      maxItems: 1,
      default: [],
    },
  },
  additionalProperties: false,
} as const;

export const updateTopicProfileRequestSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    is_active: { type: 'boolean' },
    initial_pull_pending: { type: 'boolean' },
    include_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    exclude_keywords: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    venue_filters: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    default_lookback_days: { type: 'integer', minimum: 1, maximum: 3650 },
    default_min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    default_max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
    rule_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
      maxItems: 1,
    },
  },
  additionalProperties: false,
  minProperties: 1,
} as const;

export const createAutoPullRuleRequestSchema = {
  type: 'object',
  required: ['scope', 'name', 'sources', 'schedules'],
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { type: 'string', minLength: 1 },
    topic_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
    name: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES, default: 'ACTIVE' },
    query_spec: {
      type: 'object',
      properties: {
        include_keywords: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        exclude_keywords: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        authors: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        venues: { type: 'array', items: { type: 'string', minLength: 1 }, default: [] },
        max_results_per_source: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
      },
      additionalProperties: false,
      default: {},
    },
    time_spec: {
      type: 'object',
      properties: {
        lookback_days: { type: 'integer', minimum: 1, maximum: 3650, default: 30 },
        min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
        max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
      },
      additionalProperties: false,
      default: {},
    },
    quality_spec: {
      type: 'object',
      properties: {
        min_quality_score: { type: 'integer', minimum: 0, maximum: 100, default: 70 },
      },
      additionalProperties: false,
      default: {},
    },
    sources: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleSourceSchema,
    },
    schedules: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleScheduleSchema,
    },
  },
  additionalProperties: false,
} as const;

export const updateAutoPullRuleRequestSchema = {
  type: 'object',
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }] },
    topic_ids: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      uniqueItems: true,
    },
    name: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES },
    query_spec: {
      type: 'object',
      properties: {
        include_keywords: { type: 'array', items: { type: 'string', minLength: 1 } },
        exclude_keywords: { type: 'array', items: { type: 'string', minLength: 1 } },
        authors: { type: 'array', items: { type: 'string', minLength: 1 } },
        venues: { type: 'array', items: { type: 'string', minLength: 1 } },
        max_results_per_source: { type: 'integer', minimum: 1, maximum: 200 },
      },
      additionalProperties: false,
    },
    time_spec: {
      type: 'object',
      properties: {
        lookback_days: { type: 'integer', minimum: 1, maximum: 3650 },
        min_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
        max_year: { type: ['integer', 'null'], minimum: 1900, maximum: 2100 },
      },
      additionalProperties: false,
    },
    quality_spec: {
      type: 'object',
      properties: {
        min_quality_score: { type: 'integer', minimum: 0, maximum: 100 },
      },
      additionalProperties: false,
    },
    sources: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleSourceSchema,
    },
    schedules: {
      type: 'array',
      minItems: 1,
      items: autoPullRuleScheduleSchema,
    },
  },
  additionalProperties: false,
  minProperties: 1,
} as const;

export const createAutoPullRunRequestSchema = {
  type: 'object',
  properties: {
    trigger_type: { type: 'string', enum: AUTO_PULL_TRIGGER_TYPES, default: 'MANUAL' },
    full_refresh: { type: 'boolean', default: false },
  },
  additionalProperties: false,
} as const;

export const retryFailedSourcesRequestSchema = {
  type: 'object',
  properties: {
    sources: {
      type: 'array',
      items: { type: 'string', enum: AUTO_PULL_SOURCES },
      minItems: 1,
      uniqueItems: true,
    },
  },
  additionalProperties: false,
} as const;

export const acknowledgeAlertRequestSchema = {
  type: 'object',
  properties: {
    ack_at: { type: 'string', format: 'date-time' },
  },
  additionalProperties: false,
} as const;

export const autoPullRulesQuerySchema = {
  type: 'object',
  properties: {
    scope: { type: 'string', enum: AUTO_PULL_SCOPES },
    topic_id: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RULE_STATUSES },
  },
  additionalProperties: false,
} as const;

export const autoPullRunsQuerySchema = {
  type: 'object',
  properties: {
    rule_id: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: AUTO_PULL_RUN_STATUSES },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
  },
  additionalProperties: false,
} as const;

export const autoPullAlertsQuerySchema = {
  type: 'object',
  properties: {
    rule_id: { type: 'string', minLength: 1 },
    level: { type: 'string', enum: AUTO_PULL_ALERT_LEVELS },
    acked: { type: 'boolean' },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
  },
  additionalProperties: false,
} as const;
