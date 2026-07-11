/**
 * GS-001 golden-scenario topic package (T-124 S5, D10 素材形态).
 *
 * 测试用选题包：形态合规的晋升选题包 bridge handoff，内容取材公开 arXiv 带代码论文
 * LoRA (arXiv:2106.09685, "LoRA: Low-Rank Adaptation of Large Language Models")。
 * 论文已知路线/实验/结论作为人审 rubric ground truth（见同目录 ground-truth.md），
 * 本文件只承载"晋升时点"可见的选题内容核（研究问题/动机假设/范围边界/早期检查义务/预算包络），
 * 不预置论文答案——LLM 工位的产出与论文实际路线的对齐度正是人审对象。
 *
 * 形状镜像 `.ai/scripts/paper-implementation-v1-runnable-replay.mjs` 的 makeBridgeHandoff()
 * （T-109 形状即真实 bootstrap 路由消费的 handoff 契约），id 前缀 gs001_，
 * hash 纪律：所有 *_hash 均为对应 payload/内容的 sha256 hex（64 位小写），非占位字符串。
 */
import { createHash } from 'node:crypto';

export function sha256Hex(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

export const GS001_IDS = {
  bridge: 'gs001_paper_project_bridge_001',
  workspace: 'gs001_workspace_001',
  titleCard: 'gs001_title_card_lora',
  topicPackage: 'gs001_topic_package_lora',
  promotionDecision: 'gs001_promotion_decision_001',
  humanPromotionDecision: 'gs001_human_promotion_decision_001',
  humanConfirmedDecision: 'gs001_human_confirmed_decision_001',
  commitmentProfile: 'gs001_promotion_commitment_profile_001',
  promotionGateCheck: 'gs001_promotion_gate_check_001',
  promotionInputSnapshot: 'gs001_promotion_input_snapshot_001',
  // deterministic spine
  motive: 'gs001_core_motive_001',
  motiveVersion: 'gs001_core_motive_version_001',
  assertionMotivationPressure: 'gs001_assertion_motivation_pressure',
  assertionLowRankOpportunity: 'gs001_assertion_low_rank_opportunity',
  assertionBaselineGap: 'gs001_assertion_baseline_gap',
  board: 'gs001_board_version_001',
  bindingMotivationPressure: 'gs001_binding_motivation_pressure',
  bindingLowRankOpportunity: 'gs001_binding_low_rank_opportunity',
  bindingBaselineGap: 'gs001_binding_baseline_gap',
  // evidence handles (topic-package sourced)
  litEvidence: 'gs001_lit_evidence_lora_2106_09685',
  sourceLocator: 'gs001_source_locator_arxiv_2106_09685',
  citationCandidate: 'gs001_citation_lora_2106_09685',
  inputSnapshot: 'gs001_input_snapshot_001',
  metricGlue: 'gs001_metric_glue_avg_score',
  metricTrainableParams: 'gs001_metric_trainable_parameter_count',
  metricInferenceLatency: 'gs001_metric_inference_latency',
  datasetGlueSubset: 'gs001_dataset_glue_subset',
  baselineFullFinetune: 'gs001_baseline_full_finetune',
  baselineAdapter: 'gs001_baseline_adapter_tuning',
  baselinePrefix: 'gs001_baseline_prefix_tuning',
  codeHfRoberta: 'gs001_code_hf_roberta_base',
  configAdaptation: 'gs001_config_adaptation_budget',
  // acceptance-bridge targets
  routeCandidate: 'gs001_route_candidate_001',
  feasibilityProbe: 'gs001_feasibility_probe_001',
  humanDecisionRouteAccept: 'gs001_human_decision_route_accept',
  humanDecisionProbeAccept: 'gs001_human_decision_probe_accept',
};

/**
 * 选题包内容核（晋升时点可见信息，不含论文答案）。
 * 运行 runner 时同一内容核灌入 slot 请求的 source_context_packets / 领域脊柱对象。
 */
export const GS001_LORA_CONTENT = {
  research_question:
    'How can downstream adaptation of large pretrained language models drastically reduce the number of '
    + 'trainable parameters and the GPU-memory / per-task storage cost, without sacrificing inference latency '
    + 'or task performance relative to full fine-tuning?',
  motive_hypothesis:
    'The weight updates learned during downstream adaptation have a low intrinsic rank: the adaptation delta '
    + 'over a pretrained weight matrix can be approximated by a low-rank decomposition without losing task '
    + 'performance. If this holds, adaptation can train only a small number of parameters per task.',
  scope: {
    included: [
      'Parameter-efficient downstream adaptation of Transformer language models',
      'Natural language understanding and generation adaptation tasks',
    ],
    excluded: [
      'Training new pretrained models from scratch (no new pretraining)',
      'Multimodal models and non-language modalities',
    ],
    non_goals: [
      'General claims about model reliability or capability beyond the adaptation-efficiency question',
    ],
  },
  early_check_obligations: [
    'Low-rank feasibility probe: verify on the target model scale that constrained low-rank adaptation deltas '
    + 'can recover (near) full fine-tuning task performance on at least one representative task.',
    'Baseline reproducibility check: confirm full fine-tuning, adapter-based tuning, and prefix/prompt tuning '
    + 'baselines can be reproduced under the project compute budget before comparative claims are planned.',
  ],
  budget_envelope: {
    scale: 'small-scale reproduction',
    model_scale: 'RoBERTa-base class encoder language model',
    evaluation_scale: 'GLUE subset (2-3 tasks)',
    max_compute: 'single-GPU, single-digit GPU-days total',
    max_runtime: 'PT72H',
    retry_budget: 1,
  },
  literature_context_key_facts: [
    'Full fine-tuning of large pretrained language models requires storing and deploying one full model copy '
    + 'per downstream task, which becomes prohibitive as model size grows.',
    'Adapter-based approaches insert extra layers and reduce trainable parameters but add inference latency, '
    + 'especially at small batch sizes.',
    'Prefix/prompt tuning approaches reserve part of the usable sequence length for tuning vectors and are '
    + 'reported to be harder to optimize stably.',
    'Prior work reports that learned over-parametrized models reside on a low intrinsic dimension, motivating '
    + 'the hypothesis that adaptation updates may also be low-rank.',
  ],
};

export function gs001Ref(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: GS001_IDS.titleCard,
    version_id: versionId,
  };
}

const CREATED_AT = '2026-07-11T00:00:00.000Z';

/**
 * 完整 bridge handoff（镜像 replay makeBridgeHandoff() 的形状与字段集合）。
 * hash 纪律：working_copy_payload_hash = sha256(working copy)；bridge_payload_hash =
 * sha256(去掉自身 hash 字段的 bridge 载荷)；snapshot_hashes 为内容 sha256。
 */
export function makeGs001BridgeHandoff() {
  const c = GS001_LORA_CONTENT;
  const sourceRefs = [
    gs001Ref('topic_package', GS001_IDS.topicPackage, 'v1'),
    gs001Ref('evidence_unit', GS001_IDS.litEvidence),
    gs001Ref('source_locator', GS001_IDS.sourceLocator),
  ];
  const workingCopy = {
    editable_title:
      'Parameter-efficient adaptation of large pretrained language models via low-rank update decomposition',
    problem_statement: c.research_question,
    contribution_summary: c.motive_hypothesis,
    evaluation_plan:
      `Small-scale reproduction: ${c.budget_envelope.model_scale} on a ${c.budget_envelope.evaluation_scale}; `
      + 'compare against full fine-tuning, adapter tuning, and prefix/prompt tuning baselines on task score, '
      + 'trainable parameter count, and inference latency.',
    initial_planning_notes: [
      `Included scope: ${c.scope.included.join('; ')}`,
      `Excluded scope: ${c.scope.excluded.join('; ')}`,
      `Non-goals: ${c.scope.non_goals.join('; ')}`,
      `Budget envelope: ${c.budget_envelope.scale}, ${c.budget_envelope.max_compute}, max runtime ${c.budget_envelope.max_runtime}`,
    ],
    claim_ceiling:
      'Claims are bounded to parameter-efficient adaptation of Transformer language models within the probed '
      + 'model scale and task set; no broad capability or reliability claims.',
    prohibited_claims: [
      'Universal superiority over all adaptation methods on all tasks',
      'Claims about model scales or modalities never probed in this project',
    ],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [...c.early_check_obligations],
    source_lineage_summary: {
      topic_package_id: GS001_IDS.topicPackage,
      source_paper: 'arXiv:2106.09685 (content basis for this test topic package)',
    },
  };
  const workingCopyPayloadHash = sha256Hex(workingCopy);
  const snapshotHashes = {
    bundle_hash: sha256Hex({ kind: 'gs001_bundle', source_refs: sourceRefs }),
    package_snapshot_hash: sha256Hex({ kind: 'gs001_package_snapshot', content: c }),
    package_draft_input_snapshot_hash: sha256Hex({ kind: 'gs001_package_draft_input_snapshot', content: c.research_question }),
    promotion_input_snapshot_hash: sha256Hex({ kind: 'gs001_promotion_input_snapshot', id: GS001_IDS.promotionInputSnapshot }),
  };
  const bridgeSansHash = {
    paper_project_bridge_id: GS001_IDS.bridge,
    bridge_status: 'active',
    workspace_id: GS001_IDS.workspace,
    title_card_id: GS001_IDS.titleCard,
    source_promotion_decision_id: GS001_IDS.promotionDecision,
    source_promotion_decision_ref: gs001Ref('promotion_decision', GS001_IDS.promotionDecision),
    human_promotion_decision_ref: gs001Ref('human_promotion_decision', GS001_IDS.humanPromotionDecision),
    human_confirmed_decision_ref: gs001Ref('human_confirmed_decision', GS001_IDS.humanConfirmedDecision),
    promotion_commitment_profile_id: GS001_IDS.commitmentProfile,
    promotion_commitment_profile_ref: gs001Ref('promotion_commitment_profile', GS001_IDS.commitmentProfile),
    promotion_gate_check_ref: gs001Ref('promotion_gate_check', GS001_IDS.promotionGateCheck),
    promotion_input_snapshot_id: GS001_IDS.promotionInputSnapshot,
    promotion_input_snapshot_ref: gs001Ref('promotion_input_snapshot', GS001_IDS.promotionInputSnapshot),
    promotion_input_snapshot_hash: snapshotHashes.promotion_input_snapshot_hash,
    topic_package_id: GS001_IDS.topicPackage,
    package_version: 'v1',
    decision: 'promote_to_paper_project',
    conditions: [],
    accepted_risk_refs: [],
    allowed_refinements: [],
    early_check_obligations: [...c.early_check_obligations],
    stop_conditions: [],
    reopen_conditions: [],
    source_refs: sourceRefs,
    snapshot_hashes: snapshotHashes,
    working_copy_payload: workingCopy,
    working_copy_payload_hash: workingCopyPayloadHash,
    paper_project_intake_ref: null,
    target_paper_project_ref: null,
    source_promotion_handoff: {},
    artifact_refs: [],
    policy_version_id: 'gs001_policy_v1',
    created_by: 'system',
    created_at: CREATED_AT,
  };
  const bridgePayloadHash = sha256Hex(bridgeSansHash);
  const bridge = { ...bridgeSansHash, bridge_payload_hash: bridgePayloadHash };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: gs001Ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
    bridge_status: 'active',
    source_promotion_decision_id: bridge.source_promotion_decision_id,
    source_promotion_decision_ref: bridge.source_promotion_decision_ref,
    promotion_commitment_profile_ref: bridge.promotion_commitment_profile_ref,
    promotion_input_snapshot_id: bridge.promotion_input_snapshot_id,
    promotion_input_snapshot_ref: bridge.promotion_input_snapshot_ref,
    promotion_input_snapshot_hash: bridge.promotion_input_snapshot_hash,
    topic_package_id: bridge.topic_package_id,
    package_version: bridge.package_version,
    decision: bridge.decision,
    working_copy_payload: bridge.working_copy_payload,
    working_copy_payload_hash: bridge.working_copy_payload_hash,
    bridge_payload_hash: bridge.bridge_payload_hash,
    conditions: bridge.conditions,
    accepted_risk_refs: bridge.accepted_risk_refs,
    allowed_refinements: bridge.allowed_refinements,
    early_check_obligations: bridge.early_check_obligations,
    stop_conditions: bridge.stop_conditions,
    reopen_conditions: bridge.reopen_conditions,
    source_refs: bridge.source_refs,
    snapshot_hashes: bridge.snapshot_hashes,
    paper_project_intake_ref: bridge.paper_project_intake_ref,
    target_paper_project_ref: bridge.target_paper_project_ref,
    bridge,
    source_promotion_handoff: bridge.source_promotion_handoff,
  };
}
