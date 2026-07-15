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
 *
 * v2（2026-07-12）：按首跑 run gs001-lora-live-003 route skeptic 四条 blocker 逐条修订
 * （RR-002 confirmatory 预算矩阵 / RR-003 数据集指标预承诺 / RR-004 基线控制清单 /
 * RR-006 基线选择的可行性依赖→staged 门化解）。修订仍只承载"晋升时点"可见的预承诺，
 * 阈值是复现门槛（reproduction target），不是论文报告值——不预置论文答案。
 * 对照段见同目录 ground-truth.md §GT-7。
 *
 * v3（2026-07-15）：按 run gs001-lora-live-004 复评修订。
 * - RF-BASE-001（唯一 blocking，阶段顺序矛盾）：stage 0 探针判据改为**自包含**——stage 0
 *   内先训一条短 SST-2 full-FT 校准锚点，探针通过 = LoRA best-of-{r=4,r=8} 同时满足绝对下限
 *   90.0 acc 且与该 stage-0 锚点差 ≤1.0pt；不再依赖 stage 1 才复现的 full-FT 值来判读。
 * - RF-COMP-001（warning，预算账本不可审）：新增 full_ft_reuse_rule——stage 1 正式 full-FT
 *   复现 run 逐字复用为 stage 2 confirmatory full-FT 单元格，绝不在 stage 2 重训。
 * - RF-DATA-001（warning，聚合规则丢失）：dataset 预承诺显式加 metric_aggregation
 *   （mean-over-repeats、重复上限、parity 容差、锚点语义）。
 * - RF-BASE-002（warning）：新增 baseline_claim_control_rule 显式化"失败即 drop 而非弱化"。
 * - RF-TRACE-001（warning，code/config refs 空）：**部分吸收**——加 reference_implementation
 *   指针（公开参考实现，晋升时点可引为 code/config 溯源锚），但项目级 code/config artifact 在
 *   晋升时点确实不存在，作为诚实登记的 route-planning 已知缺口保留（见 v3 修订说明不吸收理由）。
 * - RF-SCOPE-001 / RF-CONF-001 为 info（scope 合规、confirmatory 分离基本健全，唯一牵连即上述
 *   stage 顺序矛盾，已随 blocking 化解），无需素材侧改动。
 * hash 纪律不变：所有 *_hash 仍由 sha256Hex 在装载时对内容/载荷现算，改内容即自洽重算，
 * 无硬编码 hash 需手动维护。对照段见同目录 ground-truth.md §GT-7（v3 增补）。
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
    'Low-rank feasibility probe (stage 0, self-contained gate): stage 0 first trains a short single-seed SST-2 '
    + 'full fine-tuning calibration anchor from a fixed public reference configuration inside stage 0, then trains '
    + 'LoRA with rank r in {4, 8} on SST-2. Probe pass criterion, evaluable from stage-0 outputs alone: LoRA '
    + 'best-of-{r=4, r=8} SST-2 accuracy is BOTH (a) at least the absolute floor of 90.0 accuracy points AND '
    + '(b) within 1.0 accuracy point of the stage-0 calibration anchor trained in this same stage. The stage-0 '
    + 'calibration anchor is a gate reference only and is NOT the stage-1 formal full fine-tuning reproduction; '
    + 'the confirmatory matrix (stage 2) starts only after this probe passes.',
    'Baseline reproducibility check (stage 1): the mandatory baselines (formal full fine-tuning reproduction on '
    + 'all three committed tasks, Houlsby-style adapter) must meet their pre-committed success criteria in the '
    + 'baseline control checklist before comparative claims are planned; the stage-1 full fine-tuning reproduction '
    + 'runs are reused verbatim as the stage-2 confirmatory full-fine-tuning cells (never re-trained in stage 2). '
    + 'BitFit is optional and prefix tuning is budget-gated.',
  ],
  budget_envelope: {
    scale: 'small-scale reproduction',
    model_scale: 'RoBERTa-base class encoder language model',
    evaluation_scale: 'GLUE subset, committed task set: SST-2, MRPC, CoLA',
    max_compute: 'single GPU (<=24 GB VRAM); total training budget <=40 GPU-hours',
    max_runtime: 'PT72H',
    retry_budget: 1,
  },
  // --- v3 pre-commitments（v2 RR-002/003/004/006 + run 004 RF-* 复评；晋升时点即冻结） ---
  content_version: 'v3',
  confirmatory_budget_matrix: {
    gpu_constraint: 'single GPU, <=24 GB VRAM',
    total_training_budget: '<=40 GPU-hours across feasibility probe, baseline reproduction, and confirmatory runs combined',
    stage_budgets: {
      stage0_feasibility_probe: '<=4 GPU-hours',
      stage1_baseline_reproduction: '<=14 GPU-hours',
      stage2_confirmatory_matrix: '<=22 GPU-hours',
    },
    stage_budget_notes:
      'Stage 0 (<=4 GPU-hours) covers BOTH the short single-seed SST-2 full-FT calibration anchor and the LoRA '
      + 'r in {4, 8} probe. Stage 1 (<=14 GPU-hours) is the formal full fine-tuning + Houlsby adapter reproduction. '
      + 'Stage 2 (<=22 GPU-hours) covers ONLY the new LoRA r=8 confirmatory runs and the latency protocol, because '
      + 'the full-fine-tuning cells are reused from stage 1 rather than re-trained (see full_ft_reuse_rule).',
    full_ft_reuse_rule:
      'The stage-1 formal full fine-tuning reproduction runs ARE the stage-2 confirmatory full-fine-tuning cells: '
      + 'they are reused verbatim (same checkpoints and metrics), never re-trained inside stage 2, so full fine-tuning '
      + 'is counted once against the 40 GPU-hour ledger. The stage-0 calibration anchor is a separate short single-seed '
      + 'run inside the stage-0 probe budget and is NOT reused as a stage-1 or stage-2 reproduction cell.',
    confirmatory_matrix_definition:
      'Confirmatory training-task combinations are capped at 6: {LoRA r=8, full fine-tuning} x {SST-2, MRPC, CoLA}. '
      + 'A combination is one (method, task) pair; repeats within a combination are capped separately below.',
    max_repeats_per_task: 3,
    hyperparameter_policy:
      'Hyperparameters are fixed before stage 2 from stage-0/stage-1 settings and public reference configurations; '
      + 'no post-hoc hyperparameter search inside the confirmatory matrix.',
    rank_policy: 'Confirmatory LoRA rank is fixed at r=8; rank values outside {4, 8} are exploratory only.',
    latency_protocol:
      'Inference latency is measured on the same GPU and serving stack for every method: batch sizes {1, 8}, '
      + 'sequence length 128, 100 warmup + 1000 timed iterations, reported as median per-request latency.',
    checkpoint_policy: 'Keep the final checkpoint per run only; no best-of-many checkpoint selection for confirmatory claims.',
  },
  dataset_metric_precommitments: {
    primary_metrics_preregistered: true,
    alignment_criterion:
      'Primary parity judgement per task: the LoRA task metric, aggregated as the MEAN over repeats (repeats '
      + 'capped at 3 per task), is within 0.5 points of our reproduced full fine-tuning value for that task (also '
      + 'the mean over its repeats). The per-task full fine-tuning reproduction targets below are the comparison '
      + 'anchors: they gate whether the reproduced full fine-tuning value is usable as the anchor at all; a task '
      + 'whose full-FT reproduction misses its target has no usable anchor and its parity claim is void.',
    metric_aggregation: {
      rule: 'mean over repeats per (method, task) cell',
      repeat_cap_per_task: 3,
      parity_tolerance_points: 0.5,
      anchor: 'per-task reproduced full fine-tuning mean; a task whose full-FT reproduction misses its target has '
        + 'no usable anchor and its parity claim is void (not weakened, not silently dropped)',
    },
    tasks: [
      { task: 'SST-2', primary_metric: 'accuracy', full_finetune_reproduction_target: '>=94.0% accuracy' },
      { task: 'MRPC', primary_metric: 'F1', full_finetune_reproduction_target: '>=89.0 F1' },
      { task: 'CoLA', primary_metric: 'Matthews correlation coefficient', full_finetune_reproduction_target: '>=60.0 MCC' },
    ],
    secondary_metrics: [
      'trainable parameter count',
      'per-task checkpoint size',
      'median inference latency under the committed latency protocol',
    ],
  },
  baseline_control_checklist: [
    {
      baseline: 'full fine-tuning',
      obligation: 'mandatory reproduction',
      success_criterion: 'meets the per-task full fine-tuning reproduction targets on all three committed tasks',
      on_failure: 'confirmatory parity claims are void for any task whose full fine-tuning reproduction misses its '
        + 'target; reported as a reproduction failure, never silently dropped',
    },
    {
      baseline: 'Houlsby-style adapter tuning',
      obligation: 'mandatory',
      success_criterion: 'task score within 1.0 point of our reproduced full fine-tuning on SST-2 and MRPC, with '
        + 'inference latency measured under the committed latency protocol',
      on_failure: 'adapter comparison reported as not-reproduced; latency/parameter claims against adapters are '
        + 'dropped rather than weakened',
    },
    {
      baseline: 'BitFit',
      obligation: 'optional',
      success_criterion: 'if run: SST-2 accuracy within 2.0 points of reproduced full fine-tuning',
      on_failure: 'omitted from claims; the omission itself is reported',
    },
    {
      baseline: 'prefix tuning',
      obligation: 'run only if >=8 GPU-hours of the total training budget remain after stage 2',
      success_criterion: 'if run: stable training (no divergence across 3 seeds) and SST-2 accuracy within 2.0 '
        + 'points of reproduced full fine-tuning',
      on_failure: 'reported as budget-excluded or not-reproduced; no comparative claim is made against it',
    },
  ],
  baseline_claim_control_rule:
    'Failed baseline reproduction DROPS the affected comparative claim (adapter latency/parameter claims, or a '
    + 'per-task full-fine-tuning parity claim) rather than weakening, reinterpreting, or silently omitting it; the '
    + 'drop and its reason are always reported. Parity claims against full fine-tuning stay void for any task whose '
    + 'full-fine-tuning reproduction misses its pre-committed target.',
  reference_implementation: {
    note:
      'Public reference implementation available at promotion time as intake context (matches the arXiv basis of '
      + 'this topic package). Route/skeptic MAY cite it as the code/config traceability anchor for target-module '
      + 'selection, optimizer schedule, seed handling, dataset split/version, checkpoint policy, and the latency '
      + 'serving stack.',
    code_reference: 'Official LoRA reference implementation for Transformer low-rank adaptation (public repository).',
    config_reference:
      'Public RoBERTa-base fine-tuning reference configuration (optimizer schedule, sequence length 128, '
      + 'batch sizes {1, 8} for the latency protocol).',
    known_gap:
      'Project-specific code_version and config artifacts do not exist at promotion time and remain a known, '
      + 'honestly-declared route-planning gap until stage-0 execution produces them; this pointer is reference '
      + 'material, not a project-owned artifact.',
  },
  staged_route_dependency: {
    stage0_gate:
      'Feasibility probe pass criterion (self-contained, evaluable from stage-0 outputs alone): stage 0 trains a '
      + 'short single-seed SST-2 full fine-tuning calibration anchor and LoRA r in {4, 8} on SST-2; the probe passes '
      + 'iff LoRA best-of-{r=4, r=8} SST-2 accuracy is BOTH >= 90.0 absolute accuracy points AND within 1.0 accuracy '
      + 'point of that stage-0 calibration anchor. The confirmatory matrix (stage 2) starts only after this gate '
      + 'passes. No stage-1 result is required to evaluate the stage-0 gate.',
    baseline_gate:
      'Confirmatory comparative claims additionally require the mandatory stage-1 baselines (formal full fine-tuning '
      + 'reproduction to targets, Houlsby adapter) to meet their pre-committed success criteria; the stage-1 full '
      + 'fine-tuning reproduction runs are reused verbatim as the stage-2 confirmatory full-fine-tuning cells.',
    confirmatory_exploratory_boundary:
      'Confirmatory = the pre-registered 6-combination matrix, tasks, metrics, and thresholds above, frozen before '
      + 'stage 2 begins. Anything learned in stage 0/1 (probe results, baseline reproduction) may abort or shrink '
      + 'the confirmatory plan but may not add, swap, or reweight confirmatory comparisons post hoc; any such '
      + 'change demotes the affected claim to exploratory.',
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
    gs001Ref('topic_package', GS001_IDS.topicPackage, 'v3'),
    gs001Ref('evidence_unit', GS001_IDS.litEvidence),
    gs001Ref('source_locator', GS001_IDS.sourceLocator),
  ];
  const workingCopy = {
    editable_title:
      'Parameter-efficient adaptation of large pretrained language models via low-rank update decomposition',
    problem_statement: c.research_question,
    contribution_summary: c.motive_hypothesis,
    evaluation_plan:
      `Small-scale reproduction: ${c.budget_envelope.model_scale} on a ${c.budget_envelope.evaluation_scale}. `
      + `Pre-registered parity criterion: ${c.dataset_metric_precommitments.alignment_criterion} `
      + `Per-task pre-commitments: ${c.dataset_metric_precommitments.tasks
        .map((t) => `${t.task} (${t.primary_metric}, full FT reproduction target ${t.full_finetune_reproduction_target})`)
        .join('; ')}. `
      + `Secondary metrics: ${c.dataset_metric_precommitments.secondary_metrics.join(', ')}. `
      + `${c.confirmatory_budget_matrix.confirmatory_matrix_definition} `
      + `Staged execution: ${c.staged_route_dependency.stage0_gate} ${c.staged_route_dependency.baseline_gate}`,
    initial_planning_notes: [
      `Included scope: ${c.scope.included.join('; ')}`,
      `Excluded scope: ${c.scope.excluded.join('; ')}`,
      `Non-goals: ${c.scope.non_goals.join('; ')}`,
      `Budget envelope: ${c.budget_envelope.scale}, ${c.budget_envelope.max_compute}, max runtime ${c.budget_envelope.max_runtime}`,
      `Confirmatory budget matrix: ${c.confirmatory_budget_matrix.gpu_constraint}; `
      + `${c.confirmatory_budget_matrix.total_training_budget}; stage budgets: `
      + `probe ${c.confirmatory_budget_matrix.stage_budgets.stage0_feasibility_probe}, `
      + `baseline reproduction ${c.confirmatory_budget_matrix.stage_budgets.stage1_baseline_reproduction}, `
      + `confirmatory ${c.confirmatory_budget_matrix.stage_budgets.stage2_confirmatory_matrix}; `
      + `max ${c.confirmatory_budget_matrix.max_repeats_per_task} repeats per task. `
      + `${c.confirmatory_budget_matrix.hyperparameter_policy} ${c.confirmatory_budget_matrix.rank_policy} `
      + `Latency protocol: ${c.confirmatory_budget_matrix.latency_protocol} `
      + `Checkpoint policy: ${c.confirmatory_budget_matrix.checkpoint_policy}`,
      `Baseline control checklist: ${c.baseline_control_checklist
        .map((b) => `${b.baseline} [${b.obligation}] success: ${b.success_criterion}; on failure: ${b.on_failure}`)
        .join(' | ')}`,
      `Confirmatory/exploratory boundary: ${c.staged_route_dependency.confirmatory_exploratory_boundary}`,
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
    package_version: 'v3',
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
