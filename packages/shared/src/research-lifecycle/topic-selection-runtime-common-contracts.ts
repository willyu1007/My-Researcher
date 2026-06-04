export const TOPIC_SELECTION_RUNTIME_CACHE_RESULTS = [
  'hit',
  'miss',
  'blocked_stale',
  'blocked_drift',
  'bypassed',
  'not_applicable',
] as const;

export type TopicSelectionRuntimeCacheResult =
  (typeof TOPIC_SELECTION_RUNTIME_CACHE_RESULTS)[number];
