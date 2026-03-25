export type LiteratureProvider = 'crossref' | 'arxiv' | 'manual' | 'web' | 'zotero';
export type RightsClass = 'OA' | 'USER_AUTH' | 'RESTRICTED' | 'UNKNOWN';
export type EvidenceSourceType = 'abstract' | 'key_content' | 'fulltext_chunk' | 'metadata' | 'artifact';
export type ContributionHypothesis = 'method' | 'benchmark' | 'analysis' | 'resource' | 'system';
export type ResearchRecordStatus = 'draft' | 'completed' | 'superseded' | 'archived';
export type ValueVerdict = 'promote' | 'refine' | 'park' | 'drop';
export type PromotionDecisionType = 'promote' | 'hold' | 'reject' | 'loopback';

export type DemoLiteratureSeed = {
  seed_key: string;
  provider: LiteratureProvider;
  external_id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: number;
  source_url: string;
  rights_class: RightsClass;
  tags: string[];
  doi?: string;
  arxiv_id?: string;
};

export type DemoEvidenceRef = {
  literature_key: string;
  source_type: EvidenceSourceType;
  note?: string;
  span_ref?: string;
};

export type DemoHardGateCheck = {
  pass: boolean;
  reason: string;
  evidence_refs?: DemoEvidenceRef[];
};

export type DemoScoredDimension = {
  score: number;
  reason: string;
  confidence: number;
  evidence_refs?: DemoEvidenceRef[];
};

export type DemoNeedSeed = {
  record_status?: ResearchRecordStatus;
  need_statement: string;
  who_needs_it: string;
  scenario: string;
  boundary?: string;
  literature_keys: string[];
  unmet_need_category:
    | 'performance'
    | 'cost'
    | 'robustness'
    | 'interpretability'
    | 'usability'
    | 'scalability'
    | 'data_efficiency'
    | 'evaluation_gap'
    | 'resource_gap';
  falsification_verdict: 'validated' | 'weak' | 'pseudo_gap' | 'unclear';
  significance_score: number;
  measurability_score: number;
  feasibility_signal: 'high' | 'medium' | 'low' | 'unknown';
  validated_need: boolean;
  judgement_summary: string;
  confidence: number;
  next_actions?: string[];
  evidence_refs: DemoEvidenceRef[];
  missing_information?: string[];
  blocking_issues?: string[];
};

export type DemoQuestionSeed = {
  record_status?: ResearchRecordStatus;
  main_question: string;
  sub_questions?: string[];
  research_slice: string;
  contribution_hypothesis: ContributionHypothesis;
  source_literature_evidence_keys?: string[];
  judgement_summary: string;
  confidence: number;
};

export type DemoValueSeed = {
  record_status?: ResearchRecordStatus;
  strongest_claim_if_success: string;
  fallback_claim_if_success?: string;
  hard_gates: {
    significance: DemoHardGateCheck;
    originality: DemoHardGateCheck;
    answerability: DemoHardGateCheck;
    feasibility: DemoHardGateCheck;
    venue_fit: DemoHardGateCheck;
  };
  scored_dimensions: {
    significance: DemoScoredDimension;
    originality: DemoScoredDimension;
    claim_strength: DemoScoredDimension;
    answerability: DemoScoredDimension;
    venue_fit: DemoScoredDimension;
    strategic_leverage: DemoScoredDimension;
  };
  risk_penalty: {
    data_risk: number;
    compute_risk: number;
    baseline_risk: number;
    execution_risk: number;
    ethics_risk: number;
    penalty_summary: string;
  };
  reviewer_objections?: string[];
  ceiling_case: string;
  base_case: string;
  floor_case: string;
  verdict: ValueVerdict;
  total_score: number;
  judgement_summary: string;
  confidence: number;
  required_refinements?: string[];
  next_actions?: string[];
  evidence_refs: DemoEvidenceRef[];
};

export type DemoPackageSeed = {
  record_status?: ResearchRecordStatus;
  title_candidates: string[];
  research_background: string;
  contribution_summary: string;
  candidate_methods: string[];
  evaluation_plan: string;
  key_risks?: string[];
  selected_literature_evidence_keys: string[];
};

export type DemoDecisionSeed = {
  decision: PromotionDecisionType;
  reason_summary: string;
  target_paper_title?: string;
  loopback_target?: 'need_review' | 'research_question' | 'value_assessment' | 'package';
  created_by: 'llm' | 'human' | 'hybrid';
};

export type DemoPromotionSeed = {
  title: string;
  research_direction?: string;
  created_by: 'human' | 'hybrid';
};

export type DemoTitleCardScenario = {
  working_title: string;
  brief: string;
  status: 'draft' | 'active' | 'promoted' | 'parked';
  evidence_keys: string[];
  need?: DemoNeedSeed;
  question?: DemoQuestionSeed;
  value?: DemoValueSeed;
  package?: DemoPackageSeed;
  decision?: DemoDecisionSeed;
  promotion?: DemoPromotionSeed;
};

export type LiteratureIdMap = Map<string, string>;

export const titleCardDemoLiteratures: DemoLiteratureSeed[] = [
  {
    seed_key: 'long-context-retrieval',
    provider: 'crossref',
    external_id: 'title-card-demo-long-context-retrieval',
    title: 'Robust Retrieval Under Long-Context Reasoning Workloads',
    abstract: 'Studies retrieval stability when reasoning chains exceed standard context windows.',
    authors: ['A. Chen', 'M. Patel'],
    year: 2025,
    source_url: 'https://example.com/demo/long-context-retrieval',
    rights_class: 'OA',
    tags: ['rag', 'retrieval', 'long-context'],
    doi: '10.1000/title-card-demo-long-context-retrieval',
  },
  {
    seed_key: 'failure-taxonomy',
    provider: 'zotero',
    external_id: 'title-card-demo-failure-taxonomy',
    title: 'Failure Taxonomy for Reviewer-Facing RAG Evaluations',
    abstract: 'Catalogs failure modes that commonly break reviewer trust in RAG papers.',
    authors: ['L. Smith', 'J. Rao'],
    year: 2024,
    source_url: 'https://example.com/demo/failure-taxonomy',
    rights_class: 'OA',
    tags: ['reviewer-alignment', 'evaluation', 'rag'],
  },
  {
    seed_key: 'data-efficiency',
    provider: 'arxiv',
    external_id: 'title-card-demo-data-efficiency',
    title: 'Data-Efficient Retrieval Adaptation with Sparse Evidence Updates',
    abstract: 'Explores retrieval adaptation when evidence refresh budgets are tightly constrained.',
    authors: ['R. Gomez'],
    year: 2026,
    source_url: 'https://arxiv.org/abs/2603.00001',
    rights_class: 'OA',
    tags: ['retrieval', 'data-efficiency', 'adaptation'],
    arxiv_id: '2603.00001',
  },
  {
    seed_key: 'reproducibility',
    provider: 'crossref',
    external_id: 'title-card-demo-reproducibility',
    title: 'Reproducibility Checklists for LLM Systems Papers',
    abstract: 'Defines reproducibility failure patterns and concrete audit dimensions for systems papers.',
    authors: ['N. Wilson', 'T. Wang'],
    year: 2023,
    source_url: 'https://example.com/demo/reproducibility',
    rights_class: 'OA',
    tags: ['reproducibility', 'systems', 'reviewer-alignment'],
    doi: '10.1000/title-card-demo-reproducibility',
  },
  {
    seed_key: 'ablation-protocol',
    provider: 'manual',
    external_id: 'title-card-demo-ablation-protocol',
    title: 'Ablation Protocol Design for Reviewer-Oriented Empirical Studies',
    abstract: 'Discusses how to design ablation packages that directly answer reviewer objections.',
    authors: ['Y. Li'],
    year: 2025,
    source_url: 'https://example.com/demo/ablation-protocol',
    rights_class: 'USER_AUTH',
    tags: ['ablation', 'empirical-design', 'reviewer-alignment'],
    doi: '10.1000/title-card-demo-ablation-protocol',
  },
  {
    seed_key: 'claim-graph',
    provider: 'web',
    external_id: 'title-card-demo-claim-graph',
    title: 'Claim Graphs for Aligning Paper Packages with Evidence',
    abstract: 'Connects working claims, evidence baskets, and package design through explicit claim graphs.',
    authors: ['S. Ibrahim', 'K. Ito'],
    year: 2024,
    source_url: 'https://example.com/demo/claim-graph',
    rights_class: 'OA',
    tags: ['claim-graph', 'evidence', 'package-design'],
  },
  {
    seed_key: 'adaptive-chunking',
    provider: 'arxiv',
    external_id: 'title-card-demo-adaptive-chunking',
    title: 'Adaptive Chunking for Evidence-Dense Literature Reasoning',
    abstract: 'Improves retrieval quality by adapting chunk boundaries to evidence density.',
    authors: ['D. Kumar', 'P. Olsen'],
    year: 2026,
    source_url: 'https://arxiv.org/abs/2603.00002',
    rights_class: 'OA',
    tags: ['chunking', 'retrieval', 'evidence'],
    arxiv_id: '2603.00002',
  },
  {
    seed_key: 'benchmark',
    provider: 'crossref',
    external_id: 'title-card-demo-benchmark',
    title: 'Benchmarking Reviewer-Sensitive Failure Recovery in RAG Pipelines',
    abstract: 'Benchmarks failure recovery strategies for reviewer-sensitive RAG settings.',
    authors: ['H. Park'],
    year: 2025,
    source_url: 'https://example.com/demo/benchmark',
    rights_class: 'OA',
    tags: ['benchmark', 'rag', 'failure-recovery'],
    doi: '10.1000/title-card-demo-benchmark',
  },
];

function evidenceRef(literatureKey: string, sourceType: EvidenceSourceType = 'abstract', note?: string): DemoEvidenceRef {
  return {
    literature_key: literatureKey,
    source_type: sourceType,
    note,
  };
}

function hardGate(pass: boolean, reason: string, literatureKey: string): DemoHardGateCheck {
  return {
    pass,
    reason,
    evidence_refs: [evidenceRef(literatureKey)],
  };
}

function scoredDimension(score: number, reason: string, literatureKey: string): DemoScoredDimension {
  return {
    score,
    reason,
    confidence: 0.8,
    evidence_refs: [evidenceRef(literatureKey)],
  };
}

function makeNeedSeed(
  literatureKeys: string[],
  needStatement: string,
  summary: string,
): DemoNeedSeed {
  return {
    need_statement: needStatement,
    who_needs_it: 'CS 论文作者与审稿人',
    scenario: '需要在论文选题阶段提前确认 reviewer-facing gap 是否成立。',
    literature_keys: literatureKeys,
    unmet_need_category: 'evaluation_gap',
    falsification_verdict: 'validated',
    significance_score: 4,
    measurability_score: 4,
    feasibility_signal: 'medium',
    validated_need: true,
    judgement_summary: summary,
    confidence: 0.78,
    next_actions: ['补齐 reviewer objection 对应的 evidence 片段。'],
    evidence_refs: literatureKeys.map((literatureKey) => evidenceRef(literatureKey)),
  };
}

function makeValueSeed(
  literatureKey: string,
  options: {
    verdict: ValueVerdict;
    totalScore: number;
    judgementSummary: string;
    hardGateOverrides?: Partial<DemoValueSeed['hard_gates']>;
  },
): DemoValueSeed {
  const defaultGate = hardGate(true, 'Current evidence is sufficient for this gate.', literatureKey);
  return {
    strongest_claim_if_success:
      'The work can defend a reviewer-facing gap with concrete evidence and an executable package.',
    hard_gates: {
      significance: defaultGate,
      originality: defaultGate,
      answerability: defaultGate,
      feasibility: defaultGate,
      venue_fit: defaultGate,
      ...options.hardGateOverrides,
    },
    scored_dimensions: {
      significance: scoredDimension(4, 'Gap is material to current reviewer expectations.', literatureKey),
      originality: scoredDimension(4, 'Package positioning is differentiated enough.', literatureKey),
      claim_strength: scoredDimension(4, 'Claim can be phrased defensibly.', literatureKey),
      answerability: scoredDimension(4, 'Question is answerable with current scope.', literatureKey),
      venue_fit: scoredDimension(4, 'Venue fit is plausible.', literatureKey),
      strategic_leverage: scoredDimension(4, 'Useful for downstream paper packaging.', literatureKey),
    },
    risk_penalty: {
      data_risk: 1,
      compute_risk: 1,
      baseline_risk: 2,
      execution_risk: 2,
      ethics_risk: 0,
      penalty_summary: 'Current risk level is manageable for a title-card demo scenario.',
    },
    ceiling_case: '可形成 reviewer-facing findings paper。',
    base_case: '可形成稳定的实验型短文。',
    floor_case: '至少能沉淀一套内部 evidence package。',
    verdict: options.verdict,
    total_score: options.totalScore,
    judgement_summary: options.judgementSummary,
    confidence: 0.8,
    required_refinements: options.verdict === 'promote' ? [] : ['补强 reviewer objection 映射。'],
    next_actions: ['继续补齐最弱环节。'],
    evidence_refs: [evidenceRef(literatureKey)],
  };
}

export const titleCardDemoScenarios: DemoTitleCardScenario[] = [
  {
    working_title: '长上下文检索稳健性证据侦察',
    brief: '保留在 Evidence 阶段，用来检查候选证据列表、证据篮和检查器的信息密度。',
    status: 'active',
    evidence_keys: ['long-context-retrieval', 'failure-taxonomy', 'data-efficiency'],
  },
  {
    working_title: '审稿人导向复现实验设计',
    brief: '覆盖 Need / Research Question / Value / Package / Promotion Decision 的回环态。',
    status: 'active',
    evidence_keys: ['reproducibility', 'ablation-protocol', 'claim-graph'],
    need: makeNeedSeed(
      ['reproducibility', 'ablation-protocol', 'claim-graph'],
      '现有系统论文往往没有把 reviewer objection 和 ablation package 明确对齐。',
      '当前证据足以支撑“需要 reviewer-facing reproducibility package”这一判断。',
    ),
    question: {
      main_question: '如何把 reviewer objection 映射成可执行的复现实验与 ablation package？',
      research_slice: 'reviewer-facing reproducibility package',
      contribution_hypothesis: 'system',
      source_literature_evidence_keys: ['claim-graph'],
      judgement_summary: '问题已经聚焦到 reviewer objection -> package 的映射机制。',
      confidence: 0.79,
    },
    value: makeValueSeed('ablation-protocol', {
      verdict: 'refine',
      totalScore: 71,
      judgementSummary: '价值方向成立，但还需要补足 answerability 与 venue-fit 证据。',
      hardGateOverrides: {
        answerability: hardGate(
          false,
          '当前 evidence 还不足以覆盖全部 reviewer objection。',
          'reproducibility',
        ),
      },
    }),
    package: {
      title_candidates: ['Reviewer-Oriented Reproducibility Packages for Systems Papers'],
      research_background: '目前 reviewer objection 常停留在经验层面，缺少结构化 package。',
      contribution_summary: '建立 objection-to-ablation 的 package 模板与最小执行协议。',
      candidate_methods: ['objection clustering', 'ablation template synthesis'],
      evaluation_plan: '对照现有 systems 论文 checklist，验证 package 是否能覆盖高频 reviewer objection。',
      key_risks: ['覆盖面仍偏窄', '需要更强的 venue fit 论据'],
      selected_literature_evidence_keys: ['reproducibility', 'ablation-protocol', 'claim-graph'],
    },
    decision: {
      decision: 'loopback',
      reason_summary: '先回到研究问题与证据映射，补强 reviewer objection coverage。',
      loopback_target: 'research_question',
      created_by: 'hybrid',
    },
  },
  {
    working_title: '证据链驱动的题目卡晋升闭环',
    brief: '完整走完 Need -> Question -> Value -> Package -> Promote，用来对齐最终晋升态 UI。',
    status: 'active',
    evidence_keys: ['adaptive-chunking', 'long-context-retrieval'],
    need: makeNeedSeed(
      ['adaptive-chunking', 'long-context-retrieval'],
      '当前关于长上下文 literature reasoning 的工作缺少 reviewer-friendly 的 evidence chain 组织方式。',
      'Need 已经被 selected evidence 支撑，可以继续推进到问题定义与价值判断。',
    ),
    question: {
      main_question: '如何把 evidence basket 直接转化为 reviewer-aligned 的题目卡晋升决策？',
      research_slice: 'title-card promotion workflow',
      contribution_hypothesis: 'system',
      source_literature_evidence_keys: ['adaptive-chunking'],
      judgement_summary: '研究问题已经与 title-card promotion 的系统设计直接对齐。',
      confidence: 0.84,
    },
    value: makeValueSeed('long-context-retrieval', {
      verdict: 'promote',
      totalScore: 86,
      judgementSummary: '当前题目已经具备进入 paper-project 的价值与 package 完整度。',
    }),
    package: {
      title_candidates: ['Evidence-Chain Promotion for Reviewer-Aligned Paper Engineering'],
      research_background: 'title-card 需要把 evidence, value, and package 串成 reviewer-facing 的晋升路径。',
      contribution_summary: '提供 evidence-chain-aware 的题目卡晋升闭环与工作台实现。',
      candidate_methods: ['workflow synthesis', 'evidence-to-package mapping'],
      evaluation_plan: '通过 UI walkthrough 和 API checks 验证从 evidence 到 promotion 的闭环一致性。',
      key_risks: ['需要持续控制语义漂移'],
      selected_literature_evidence_keys: ['adaptive-chunking', 'long-context-retrieval'],
    },
    promotion: {
      title: 'Evidence-Chain Promotion for Reviewer-Aligned Paper Engineering',
      research_direction: 'paper engineering',
      created_by: 'hybrid',
    },
  },
];

export function resolveLiteratureIds(literatureIdByKey: LiteratureIdMap, keys: string[]): string[] {
  return keys.map((key) => {
    const literatureId = literatureIdByKey.get(key);
    if (!literatureId) {
      throw new Error(`Missing demo literature id for "${key}".`);
    }
    return literatureId;
  });
}

export function resolveEvidenceRefs(
  literatureIdByKey: LiteratureIdMap,
  refs: DemoEvidenceRef[],
): Array<{ literature_id: string; source_type: EvidenceSourceType; note?: string; span_ref?: string }> {
  return refs.map((ref) => ({
    literature_id: resolveLiteratureIds(literatureIdByKey, [ref.literature_key])[0],
    source_type: ref.source_type,
    note: ref.note,
    span_ref: ref.span_ref,
  }));
}

export function resolveHardGate(
  literatureIdByKey: LiteratureIdMap,
  gate: DemoHardGateCheck,
): { pass: boolean; reason: string; evidence_refs?: Array<{ literature_id: string; source_type: EvidenceSourceType; note?: string; span_ref?: string }> } {
  return {
    pass: gate.pass,
    reason: gate.reason,
    evidence_refs: gate.evidence_refs ? resolveEvidenceRefs(literatureIdByKey, gate.evidence_refs) : undefined,
  };
}

export function resolveScoredDimension(
  literatureIdByKey: LiteratureIdMap,
  dimension: DemoScoredDimension,
): { score: number; reason: string; confidence: number; evidence_refs?: Array<{ literature_id: string; source_type: EvidenceSourceType; note?: string; span_ref?: string }> } {
  return {
    score: dimension.score,
    reason: dimension.reason,
    confidence: dimension.confidence,
    evidence_refs: dimension.evidence_refs ? resolveEvidenceRefs(literatureIdByKey, dimension.evidence_refs) : undefined,
  };
}
