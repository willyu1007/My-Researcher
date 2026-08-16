export const T137_SEMANTIC_PROFILE_ID = 't137_scifact_retrieval_depth';
export const T137_RESOURCE_SAMPLE_SET_ID = 'resource_sample_set_a852ffb2-b579-43d7-bbeb-87d1dc769e54';

export const T137_SOURCE_LANE = [
  { literature_id: 'LIT-0328', evidence_role: 'support', semantic_role: 'primary' },
  { literature_id: 'LIT-0190', evidence_role: 'baseline', semantic_role: 'benchmark' },
  { literature_id: 'LIT-0252', evidence_role: 'challenge', semantic_role: 'challenge' },
  { literature_id: 'LIT-0765', evidence_role: 'context', semantic_role: 'measurement_guardrail' },
] as const;

export const T137_RESEARCH_INTENT = {
  goal:
    'Determine whether increasing exact-token retrieval depth from top-k 5 to top-k 10 materially improves positive-judgment micro recall on SciFact.',
  question:
    'Under the fixed SciFact exact-token setup, is micro_recall_ppm(top-k 10) - micro_recall_ppm(top-k 5) at least 10,000 ppm, at most -10,000 ppm, or inconclusive?',
  intervention: 'exact-token retrieval with retrieval_top_k=10',
  baseline: 'the same exact-token retrieval setup with retrieval_top_k=5',
  metric_key: 'micro_recall_ppm',
  difference_direction: 'top_k_10_minus_top_k_5',
  support_threshold_ppm: 10_000,
  contradiction_threshold_ppm: -10_000,
  fixed_inputs: [
    'SciFact corpus',
    'SciFact queries and qrels',
    'parser and evaluator',
    'provider and runtime',
    'seed and batch size',
    'every non-top-k experiment input',
  ],
  claim_ceiling:
    'A bounded SciFact finding about positive-judgment micro recall for exact-token retrieval depth under the fixed two-cell setup.',
  prohibited_claims: [
    'general RAG quality',
    'production superiority',
    'cost improvement',
    'latency improvement',
    'results for retrievers other than the fixed exact-token retriever',
  ],
} as const;

export function t137EvidenceRole(literatureId: string) {
  const source = T137_SOURCE_LANE.find((item) => item.literature_id === literatureId);
  if (!source) {
    throw new Error(`Literature ${literatureId} is outside the fixed T-137 source lane.`);
  }
  return source.evidence_role;
}

export function t137LiteratureIds() {
  return T137_SOURCE_LANE.map((item) => item.literature_id);
}
