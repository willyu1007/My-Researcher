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
 *
 * v4（2026-07-16, T-124 G1）：后半链素材接入。v3 内容核不动（work order §G1.4），新增：
 * - GS001_EXPERIMENT_RESULTS：acceptance 假体实验数据段，数字取 LoRA 论文真实值
 *   （arXiv:2106.09685 Table 2，RoBERTa-base，committed tasks SST-2/MRPC/CoLA）；
 * - GS001_CLAIM_GROUND_TRUTH：强 claim 边界 + dossier 完备清单答案卡（对照 ground-truth.md §GT-9/§GT-10）；
 * - makeGs001BackHalfFixtures(refs)：三个后半链 slot（result-analysis / claim-boundary /
 *   dossier-readiness）的 mocked_llm 角色产出夹具（domain_gate_request = 各 Create*Request）；
 * - 通用导出契约 SCENARIO_META / SCENARIO_IDS / SCENARIO_CONTENT / makeBridgeHandoff /
 *   EXPERIMENT_RESULTS / CLAIM_GROUND_TRUTH / makeBackHalfFixtures（runner 按通用名导入，
 *   --scenario 可切换；gs-002/gs-003 对齐同契约）；version 全线 v3→v4。
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
  // --- v4 back-half (G1): work order → acceptance experiment → REU → result
  //     analysis → claim → dossier. New in素材 v4; front-half ids above unchanged. ---
  validationCycle: 'gs001_validation_cycle_001',
  validationBudget: 'gs001_validation_budget_001',
  stopRule: 'gs001_stop_rule_001',
  experimentPlan: 'gs001_experiment_plan_light_001',
  workOrder: 'gs001_research_work_order_001',
  runPolicy: 'gs001_run_policy_001',
  runRecipe: 'gs001_run_recipe_001',
  // acceptance 假体 external job identity (a stand-in job handle; NOT an
  // experiment-foundation training job — the run-monitor-intake channel takes the
  // pre-set experiment_results verbatim, so no experiment-foundation infra runs).
  externalJob: 'gs001_external_job_001',
  runEvidenceUnit: 'gs001_run_evidence_unit_001',
  experimentResult: 'gs001_experiment_result_001',
  resultValidationReport: 'gs001_result_validation_report_001',
  resultPacket: 'gs001_result_interpretation_packet_001',
  claimCandidate: 'gs001_claim_candidate_001',
  claimTracePacket: 'gs001_claim_trace_packet_001',
  humanConfirmationStrongClaim: 'gs001_human_confirmation_strong_claim_001',
  dossier: 'gs001_implementation_dossier_001',
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
  // content_version bumped v3→v4 with the G1 back-half素材 additions; the v3
  // pre-commitment content below is unchanged (work order §G1.4: "v3 其余不动").
  content_version: 'v4',
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

const GS001_LORA_SPINE = {
  motive_short_name: 'Low-rank adaptation of pretrained language models',
  motive_contract: {
    problem_pressure:
      'Per-task full fine-tuning of large pretrained language models is prohibitive in trainable parameters, '
      + 'GPU memory, and per-task checkpoint storage as model scale grows.',
    current_solution_insufficiency:
      'Existing parameter-efficient methods trade away what they save: adapter layers add inference latency, '
      + 'and prefix/prompt tuning consumes usable sequence length and optimizes unstably.',
    unmet_or_failure_mechanism:
      'No adaptation method simultaneously achieves drastically fewer trainable parameters, zero added '
      + 'inference latency, and task performance parity with full fine-tuning.',
    target_setting: 'Downstream adaptation of Transformer language models (NLU and NLG tasks).',
    expected_contribution_path:
      'If adaptation deltas have low intrinsic rank, constraining the per-task update to a low-rank '
      + 'decomposition should retain task performance while training orders of magnitude fewer parameters.',
    why_this_is_not_trivial:
      'It is not obvious that a hard low-rank constraint on weight updates preserves task performance at '
      + 'realistic model scales, nor which weight matrices must receive the update.',
    why_existing_baselines_do_not_already_solve_it:
      'Adapters solve parameter count but not latency; prefix tuning solves latency but not sequence budget '
      + 'or optimization stability; full fine-tuning solves neither cost dimension.',
    what_makes_this_researchable_now:
      'Strong public pretrained checkpoints (RoBERTa class) and standard benchmarks (GLUE) make a '
      + 'small-scale falsification probe affordable within a single-GPU budget.',
  },
  falsification_contract: {
    invalidation_conditions: [
      'Low-rank-constrained adaptation consistently loses significant task performance versus full '
      + 'fine-tuning at the probed scale even with generous rank.',
    ],
    weakening_conditions: [
      'Low-rank adaptation matches full fine-tuning only on a narrow subset of tasks or only at large rank.',
    ],
    minimum_evidence_to_continue: [
      'At least one representative task where a low-rank probe recovers near full fine-tuning performance.',
    ],
    decisive_negative_conditions: [
      'The required rank to match full fine-tuning grows to the same order as the weight dimensions.',
    ],
  },
  claim_boundary: {
    maximum_allowed_claim:
      'Low-rank adaptation matches full fine-tuning task performance within the probed model scale and task '
      + 'set while training a small fraction of parameters and adding no inference latency.',
    minimum_defensible_contribution_claim:
      'A measured characterization of the performance/parameter trade-off of low-rank-constrained adaptation.',
    forbidden_overclaims: [
      'Universal superiority over all adaptation methods on all tasks',
      'Claims about model scales or modalities never probed',
    ],
    claim_types_allowed: ['analysis_claim'],
  },
  assertions: {
    motivation_pressure: {
      assertion_type: 'motivation_pressure',
      assertion_text:
        'Per-task full fine-tuning cost (trainable parameters, GPU memory, checkpoint storage) is the binding '
        + 'constraint that makes large-model downstream adaptation impractical at scale.',
      must_hold: true,
      contradict: ['Deployment surveys showing per-task full fine-tuning cost is negligible in practice.'],
      weaken: ['Cost pressure applies only to the very largest model class.'],
      decomposition_scope_summary:
        'Cost pressure applies to downstream adaptation of large pretrained Transformer language models; '
        + 'no new pretraining, no multimodal scope.',
    },
    technical_opportunity: {
      assertion_type: 'technical_opportunity',
      assertion_text:
        'The adaptation delta over pretrained weights has low intrinsic rank, so a low-rank decomposition of '
        + 'the update can approximate full fine-tuning without losing task performance.',
      must_hold: true,
      contradict: ['Low-rank-constrained updates consistently underperform full fine-tuning at any affordable rank.'],
      weaken: ['The low-rank property holds only for some weight matrices or task families.'],
      decomposition_scope_summary:
        'The low-rank hypothesis targets adaptation deltas over frozen pretrained weights within the probed '
        + 'model scale (RoBERTa-base class) and budget (single-GPU, GLUE subset).',
    },
    baseline_gap: {
      assertion_type: 'baseline_gap',
      assertion_text:
        'Existing parameter-efficient baselines leave a real gap: adapter layers add inference latency and '
        + 'prefix/prompt tuning consumes sequence budget and optimizes unstably, so none achieves parameter '
        + 'efficiency with zero added latency at parity performance.',
      must_hold: false,
      contradict: ['A baseline reproduction showing adapters add no measurable latency and prefix tuning is stable at parity.'],
      weaken: ['The latency penalty matters only in small-batch online inference.'],
      decomposition_scope_summary:
        'Baseline gap covers full fine-tuning, adapter tuning, and prefix/prompt tuning as reproduction '
        + 'targets under the project compute budget.',
    },
  },
  board: {
    binding_dataset_scope: 'Transformer language model adaptation literature',
    summary: {
      current_support_summary:
        'Topic-package literature supports the cost-pressure motivation and gives an indirect low-intrinsic-'
        + 'dimension signal for the low-rank hypothesis; no direct probe evidence yet.',
      current_challenge_summary: 'No direct counter-evidence recorded at intake.',
      board_gap_summary:
        'The low-rank hypothesis needs a direct feasibility probe at the target model scale, and the baseline '
        + 'gap assertion needs reproduced adapter/prefix baselines under the project budget.',
      next_evidence_needed: [
        'Low-rank feasibility probe on a representative task at RoBERTa-base scale.',
        'Reproduced full fine-tuning / adapter / prefix baselines with latency and parameter measurements.',
      ],
    },
    bindings: {
      motivation_pressure: {
        statement:
          'Prior work reports that per-task full-model copies are prohibitive in storage and deployment as '
          + 'pretrained model scale grows.',
        relevance: 'Directly supports the cost-pressure motivation.',
        limitation: 'Evidence is literature-level; project-scale cost was not re-measured at intake.',
      },
      technical_opportunity: {
        statement: 'Prior work reports learned over-parametrized models reside on a low intrinsic dimension.',
        relevance: 'Indirectly supports the hypothesis that adaptation updates may also be low-rank.',
        limitation: 'Intrinsic dimension of the model is not the same object as the rank of the adaptation delta.',
      },
      baseline_gap: {
        statement:
          'Prior work reports adapter latency overhead at small batch sizes and prefix-tuning optimization '
          + 'instability with non-monotonic performance in tunable parameters.',
        relevance: 'Supports the claim that existing parameter-efficient baselines leave a latency/stability gap.',
        limitation: 'Reported measurements come from other model/serving configurations than this project budget.',
      },
    },
  },
  claim_trace_scope: {
    dataset_scope: 'Committed GLUE subset: SST-2, MRPC, CoLA.',
    task_scope: 'Downstream adaptation of a RoBERTa-base class model.',
    baseline_scope: 'Reproduced full fine-tuning (to pre-committed targets) and Houlsby adapter.',
    method_scope: 'Low-rank adaptation, rank r=8 confirmatory.',
    evaluation_scope: 'Per-task primary metric, trainable parameter count, inference latency.',
  },
};

export function gs001Ref(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: GS001_IDS.titleCard,
    version_id: versionId,
  };
}

// ---------------------------------------------------------------------------
// v4 back-half (G1): experiment_results data segment + claim ground-truth anchor.
//
// Numbers are the LoRA paper's REAL reported values (arXiv:2106.09685, Table 2,
// RoBERTa-base ~125M-parameter encoder) for the committed task set SST-2 / MRPC /
// CoLA. They are the ground-truth basis the acceptance假体实验 feeds through the
// product acceptance channel (harness-run + run-monitor-intake → trusted
// RunEvidenceUnit) — no provider call is faked; experiments do not call an LLM.
// The result-analysis / claim / dossier LLM slots interpret these numbers; the
// human rubric checks that interpretation against this ground-truth card.
// ---------------------------------------------------------------------------
export const GS001_EXPERIMENT_RESULTS = {
  content_version: 'v4',
  provenance: 'arXiv:2106.09685 Table 2 (RoBERTa-base), reproduced as this test scenario\'s acceptance experiment result set.',
  model_scale: 'RoBERTa-base (~125M parameters)',
  committed_tasks: ['SST-2', 'MRPC', 'CoLA'],
  parity_tolerance_points: 0.5,
  // stage-0 self-contained gate outcome (from the v3 early_check_obligations).
  stage0_probe: {
    calibration_anchor_sst2_full_ft_accuracy: 94.6,
    lora_best_of_r4_r8_sst2_accuracy: 95.1,
    absolute_floor: 90.0,
    within_anchor_tolerance_points: 1.0,
    passed: true,
    note: 'LoRA best-of-{r=4,r=8} SST-2 95.1 is >= 90.0 absolute AND within 1.0 of the stage-0 '
      + 'calibration anchor 94.6 — the self-contained stage-0 gate passes; the confirmatory matrix starts.',
  },
  // stage-1 baseline reproduction (full FT reproduction to the pre-committed targets).
  full_finetune_reproduction: [
    { task: 'SST-2', metric: 'accuracy', value: 94.8, precommitted_target: '>=94.0', target_met: true },
    { task: 'MRPC', metric: 'F1', value: 90.2, precommitted_target: '>=89.0', target_met: true },
    { task: 'CoLA', metric: 'Matthews correlation coefficient', value: 63.6, precommitted_target: '>=60.0', target_met: true },
  ],
  // stage-2 confirmatory matrix: LoRA r=8 vs reproduced full FT, mean over repeats.
  confirmatory_matrix: [
    { task: 'SST-2', metric: 'accuracy', lora_r8: 95.1, full_ft: 94.8, delta: 0.3, parity: true },
    { task: 'MRPC', metric: 'F1', lora_r8: 89.7, full_ft: 90.2, delta: -0.5, parity: true },
    { task: 'CoLA', metric: 'Matthews correlation coefficient', lora_r8: 63.4, full_ft: 63.6, delta: -0.2, parity: true },
  ],
  resource: {
    lora_trainable_parameters: '~0.3M',
    full_finetune_trainable_parameters: '~125M',
    trainable_parameter_reduction: '~99.76% fewer trainable parameters',
    lora_added_inference_latency: 'none (low-rank update merges into the frozen weight matrix at inference time)',
  },
  run_status: 'succeeded',
  overall_note: 'Confirmatory: LoRA r=8 reaches task-metric parity with reproduced full fine-tuning on all three '
    + 'committed tasks within the pre-registered 0.5-point tolerance, at ~0.3M vs ~125M trainable parameters and no '
    + 'added inference latency. No failed / inconclusive / negative run in this scenario, so the project-level N7 '
    + 'reconciliation has nothing outstanding to account for.',
};

// Claim ground-truth anchor: the expected claim boundary and dossier readiness
// answer card for the back half (human rubric §GT-9 / §GT-10 in ground-truth.md).
export const GS001_CLAIM_GROUND_TRUTH = {
  content_version: 'v4',
  expected_claim_type: 'empirical_finding',
  expected_claim_strength: 'strong',
  // Deliberately bounded: no "universal", "all tasks", "superior", "outperform",
  // "SOTA", "always", "generalize" — those are the forbidden overclaims and the
  // product's high-risk-overclaim gate would (correctly) block them.
  expected_claim_statement:
    'On the committed GLUE subset (SST-2, MRPC, CoLA) at RoBERTa-base scale, low-rank adaptation with rank r=8 '
    + 'reaches task-metric parity with reproduced full fine-tuning within the pre-registered 0.5-point tolerance, '
    + 'while training about 0.3M of 125M parameters and adding no inference latency.',
  forbidden_overclaims: [
    'universal superiority over all adaptation methods on all tasks',
    'claims about model scales or modalities never probed in this project',
    'outperforms full fine-tuning on every task and dataset',
  ],
  expected_claim_ceiling: 'strong',
  requires_human_confirmation: true,
  human_confirmation_scope: 'strong_claim_acceptance',
  dossier_readiness_expectations: {
    admitted_claim: 'the bounded parity claim above (claim_status must be supported via a claim trace packet)',
    rejected_claims: 'none in this positive-confirmatory scenario',
    failed_or_inconclusive_runs_to_account_for: 'none (single succeeded confirmatory run set)',
    required_forbidden_overclaims_present: true,
    readiness_gate_must_pass: true,
  },
};

/**
 * v4 back-half role-output fixtures for the mocked冒烟 (execution_mode='mocked_llm').
 * These stand in for the provider_llm role outputs of the three back-half slots.
 * The runner supplies the runtime-created structural ids (trace manifests, gate
 * results, claim trace packet, human confirmation ref) via `refs`; the material
 * owns the LoRA-specific semantic content (claim statement, scope, boundary,
 * packet summary, dossier sections).
 *
 * T-124 G4.6: role outputs carry typed SEMANTIC content blocks only
 * (interpretation/reliability/claim_implications, claim_proposal,
 * dossier_proposal); the runtime SERVICE deterministically assembles each
 * Create*Request from the request-context structural refs. The Create*Request
 * objects built below are the EXPECTED assembly results (kept as the single
 * source the semantic blocks derive from and exposed for the review packet;
 * `created_by` differs by mode: mocked=system, live=llm). LIVE mode does NOT
 * use these fixtures — the provider emits the same semantic blocks itself.
 */
export function makeGs001BackHalfFixtures(refs) {
  const T = GS001_IDS;
  const ref = (refType, refId, versionId = null) => gs001Ref(refType, refId, versionId);
  const runEvidenceRef = ref('run_evidence_unit', T.runEvidenceUnit);
  const validationReportRef = ref('result_validation_report', T.resultValidationReport);
  const packetForbidden = [...GS001_CLAIM_GROUND_TRUTH.forbidden_overclaims];

  const resultInterpretationPacketRequest = {
    result_interpretation_packet_id: T.resultPacket,
    validation_cycle_id: refs.validationCycleId,
    experiment_plan_light_id: refs.experimentPlanLightId ?? null,
    source: {
      run_evidence_refs: [runEvidenceRef],
      validation_report_refs: [validationReportRef],
      metric_refs: [
        ref('metric', T.metricGlue),
        ref('metric', T.metricTrainableParams),
        ref('metric', T.metricInferenceLatency),
      ],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary:
        'The confirmatory run set shows LoRA r=8 reaching task-metric parity with reproduced full fine-tuning on '
        + 'SST-2 (95.1 vs 94.8 acc), MRPC (89.7 vs 90.2 F1) and CoLA (63.4 vs 63.6 MCC), each within the '
        + 'pre-registered 0.5-point tolerance, at ~0.3M vs ~125M trainable parameters and no added inference latency.',
      supports_assertion_refs: [
        ref('motive_assertion', T.assertionLowRankOpportunity),
        ref('motive_assertion', T.assertionBaselineGap),
      ],
      challenges_assertion_refs: [],
      unexpected_findings: [],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [
        'Parity judged as mean over repeats vs the reproduced full fine-tuning anchor; MRPC sits exactly at the '
        + '0.5-point tolerance boundary and is reported as parity-at-boundary rather than a strict win.',
      ],
    },
    claim_implications: {
      allowed_claim_ceiling: 'strong',
      forbidden_overclaims: packetForbidden,
      recommended_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      required_followup_refs: [],
    },
    trace_manifest_id: refs.resultPacketTraceManifestId,
    created_by: 'system',
  };

  const claimCandidateRequest = {
    claim_candidate_id: T.claimCandidate,
    claim_type: GS001_CLAIM_GROUND_TRUTH.expected_claim_type,
    claim_statement: GS001_CLAIM_GROUND_TRUTH.expected_claim_statement,
    claim_strength: GS001_CLAIM_GROUND_TRUTH.expected_claim_strength,
    result_interpretation_packet_ids: [T.resultPacket],
    support_refs: [runEvidenceRef],
    challenge_refs: [],
    scope: {
      population_scope: 'Downstream adaptation of a RoBERTa-base class Transformer language model.',
      method_scope: 'Low-rank adaptation with rank r=8 vs reproduced full fine-tuning.',
      dataset_scope: 'Committed GLUE subset: SST-2, MRPC, CoLA.',
      metric_scope: 'Per-task primary metric (accuracy / F1 / MCC), trainable parameter count, inference latency.',
      negative_scope_notes: [],
      excluded_scope_notes: [
        'No claim about model scales or modalities never probed in this project.',
        'No claim of superiority over other adaptation methods.',
      ],
    },
    boundary: {
      rationale:
        'Parity is claimed only within the probed scale and committed task set, at the pre-registered 0.5-point '
        + 'tolerance; the reproduced full fine-tuning anchors met their targets so parity is well-defined per task. '
        + 'Strength is strong because all three committed tasks reach parity with the resource reduction measured, '
        + 'but the claim stays bounded to the probed setting and requires explicit human confirmation.',
      forbidden_overclaims: [...GS001_CLAIM_GROUND_TRUTH.forbidden_overclaims],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
      human_confirmation_ref: refs.humanConfirmationRef,
    },
    trace_manifest_id: refs.claimTraceManifestId,
    claim_trace_packet_id: refs.claimTracePacketId,
    created_by: 'system',
  };

  const dossierRequest = {
    dossier_id: T.dossier,
    dossier_status: 'ready_for_writing',
    result_interpretation_packet_ids: [T.resultPacket],
    claim_candidate_ids: [T.claimCandidate],
    claim_trace_packet_ids: [refs.claimTracePacketId],
    experiment_section: {
      failed_run_refs: [],
      inconclusive_run_refs: [],
      negative_result_refs: [],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [
        'MRPC parity sits at the 0.5-point tolerance boundary; the parity claim is bounded accordingly.',
        'Results are at RoBERTa-base scale on three committed GLUE tasks only.',
      ],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      rejected_claim_refs: [],
      forbidden_overclaims: [...GS001_CLAIM_GROUND_TRUTH.forbidden_overclaims],
      claim_ceiling: GS001_CLAIM_GROUND_TRUTH.expected_claim_ceiling,
    },
    readiness: {
      readiness_gate_result_id: refs.dossierReadinessGateResultId,
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [
        'Single confirmatory run set, all committed tasks at parity; no failed/inconclusive/negative run outstanding '
        + 'for the project-level (N7) reconciliation.',
      ],
    },
    trace_manifest_id: refs.dossierTraceManifestId,
    created_by: 'system',
  };

  const resultAnalysisRole = {
    role_slot_id: 'result_analysis.interpretation_scenario_builder',
    role_status: 'passed',
    summary: 'LoRA confirmatory result-analysis: bounded parity interpretation across the four required scenario kinds.',
    cited_source_refs: [runEvidenceRef, validationReportRef],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) => ({
      scenario_id: `gs001_result_scenario_${kind}`,
      scenario_kind: kind,
      summary: kind === 'positive'
        ? 'LoRA r=8 reaches parity with reproduced full fine-tuning on all three committed tasks within tolerance.'
        : kind === 'negative'
          ? 'No task shows LoRA losing significant performance versus full fine-tuning at the probed scale.'
          : kind === 'inconclusive'
            ? 'MRPC sits at the 0.5-point tolerance boundary; treated as parity-at-boundary, not a strict win.'
            : 'No confirmatory run failed; the failed-run scenario is vacuously accounted for.',
      support_refs: [runEvidenceRef],
      challenge_refs: [validationReportRef],
      limitation_refs: [],
      forbidden_overclaims: packetForbidden,
      recommended_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      required_followup_refs: [],
    })),
    // T-124 G4.6: the role emits typed SEMANTIC content; the runtime service
    // assembles the CreateResultInterpretationPacketRequest deterministically
    // from the request-context structural refs. Blocks are derived from the
    // expected packet material above (single source of truth).
    interpretation: {
      ...resultInterpretationPacketRequest.result_summary,
      failed_run_refs: [...resultInterpretationPacketRequest.source.failed_run_refs],
      inconclusive_run_refs: [...resultInterpretationPacketRequest.source.inconclusive_run_refs],
      stale_or_invalidated_evidence_refs: [...resultInterpretationPacketRequest.source.stale_or_invalidated_evidence_refs],
    },
    reliability: { ...resultInterpretationPacketRequest.reliability },
    claim_implications: { ...resultInterpretationPacketRequest.claim_implications },
  };

  const claimRole = (roleSlotId, withGate) => ({
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: withGate
      ? 'Adjudicator: the bounded LoRA parity claim is within the packet ceiling and carries human confirmation.'
      : `Claim-boundary review role ${roleSlotId}: statement stays within the probed scale and forbidden-overclaim set.`,
    cited_source_refs: [runEvidenceRef, ref('result_interpretation_packet', T.resultPacket)],
    blocker_codes: [],
    warning_codes: [],
    // T-124 G4.6: the adjudicator proposes typed SEMANTIC claim content only;
    // structural ids (claim id / packet ids / trace manifest / claim trace
    // packet / human confirmation ref) are assembled by the service.
    claim_proposal: withGate
      ? {
        claim_type: claimCandidateRequest.claim_type,
        claim_statement: claimCandidateRequest.claim_statement,
        claim_strength: claimCandidateRequest.claim_strength,
        support_refs: [...claimCandidateRequest.support_refs],
        challenge_refs: [...(claimCandidateRequest.challenge_refs ?? [])],
        scope: { ...claimCandidateRequest.scope },
        boundary_rationale: claimCandidateRequest.boundary.rationale,
        forbidden_overclaims: [...claimCandidateRequest.boundary.forbidden_overclaims],
        hidden_counter_evidence_refs: [...claimCandidateRequest.boundary.hidden_counter_evidence_refs],
        required_followup_refs: [...claimCandidateRequest.boundary.required_followup_refs],
      }
      : null,
    dossier_proposal: null,
  });

  const dossierRole = (roleSlotId, withGate) => ({
    role_slot_id: roleSlotId,
    role_status: 'passed',
    summary: withGate
      ? 'Adjudicator: dossier is ready for writing — admitted claim supported, forbidden overclaims present, no run unaccounted.'
      : `Dossier-readiness review role ${roleSlotId}: readiness blockers are empty and the admitted claim is trace-supported.`,
    cited_source_refs: [ref('claim_candidate', T.claimCandidate), ref('result_interpretation_packet', T.resultPacket)],
    blocker_codes: [],
    warning_codes: [],
    // T-124 G4.6: the adjudicator proposes typed SEMANTIC readiness content only;
    // structural ids (dossier id / packet ids / claim ids / claim trace packet
    // ids / trace manifest / gate result id) are assembled by the service.
    claim_proposal: null,
    dossier_proposal: withGate
      ? {
        dossier_status: dossierRequest.dossier_status,
        experiment_limitations: [...dossierRequest.experiment_section.experiment_limitations],
        failed_run_refs: [...dossierRequest.experiment_section.failed_run_refs],
        inconclusive_run_refs: [...dossierRequest.experiment_section.inconclusive_run_refs],
        negative_result_refs: [...dossierRequest.experiment_section.negative_result_refs],
        excluded_stale_or_invalidated_evidence_refs: [...dossierRequest.experiment_section.excluded_stale_or_invalidated_evidence_refs],
        admitted_claim_refs: [...dossierRequest.claim_section.admitted_claim_refs],
        rejected_claim_refs: [...dossierRequest.claim_section.rejected_claim_refs],
        forbidden_overclaims: [...dossierRequest.claim_section.forbidden_overclaims],
        claim_ceiling: dossierRequest.claim_section.claim_ceiling,
        readiness_blocker_refs: [...dossierRequest.readiness.blocker_refs],
        readiness_warning_refs: [...dossierRequest.readiness.warning_refs],
        readiness_notes: [...dossierRequest.readiness.readiness_notes],
      }
      : null,
  });

  return {
    resultAnalysisRoleOutputs: {
      'result_analysis.interpretation_scenario_builder': resultAnalysisRole,
    },
    claimBoundaryRoleOutputs: {
      'claim_boundary_review.boundary_critic': claimRole('claim_boundary_review.boundary_critic', false),
      'claim_boundary_review.evidence_skeptic': claimRole('claim_boundary_review.evidence_skeptic', false),
      'claim_boundary_review.adjudicator_final': claimRole('claim_boundary_review.adjudicator_final', true),
    },
    dossierReadinessRoleOutputs: {
      'dossier_readiness_prep.readiness_reviewer': dossierRole('dossier_readiness_prep.readiness_reviewer', false),
      'dossier_readiness_prep.blocker_skeptic': dossierRole('dossier_readiness_prep.blocker_skeptic', false),
      'dossier_readiness_prep.scenario_adjudicator_final': dossierRole('dossier_readiness_prep.scenario_adjudicator_final', true),
    },
    // Also exposed so the runner can reference the exact domain requests for the
    // review packet / lineage assertion without re-deriving them.
    domainGateRequests: {
      resultInterpretationPacketRequest,
      claimCandidateRequest,
      dossierRequest,
    },
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
    gs001Ref('topic_package', GS001_IDS.topicPackage, 'v4'),
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
    package_version: 'v4',
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

// ---------------------------------------------------------------------------
// Generic scenario export contract (runner-facing; new in v4).
//
// The golden-scenario runner imports scenarios by these GENERIC names so a
// scenario directory is swappable via --scenario / env. gs-002 / gs-003 align to
// this same contract. Scenario-specific aliases (GS001_*) stay exported above so
// the front-half history is untouched. A scenario topic-package.mjs MUST export:
//   sha256Hex(value) -> hex
//   SCENARIO_META          { scenario_id, paper, package_version, runner_contract }
//   SCENARIO_IDS           superset of domain-object ids (front + back half)
//   SCENARIO_CONTENT       topic content core (research question / scope / budget …)
//   makeBridgeHandoff()    promotion bridge handoff (real bootstrap route input)
//   EXPERIMENT_RESULTS     acceptance experiment data segment (paper real numbers)
//   CLAIM_GROUND_TRUTH     expected claim boundary + dossier readiness answer card
//   makeBackHalfFixtures(refs) -> { resultAnalysisRoleOutputs, claimBoundaryRoleOutputs,
//                                   dossierReadinessRoleOutputs, domainGateRequests }
// ---------------------------------------------------------------------------
export const SCENARIO_META = {
  scenario_id: 'gs-001-lora',
  paper: 'arXiv:2106.09685 (LoRA: Low-Rank Adaptation of Large Language Models)',
  package_version: 'v4',
  runner_contract: 'paper-implementation-golden-scenario/v4',
};
export const SCENARIO_IDS = GS001_IDS;
export const SCENARIO_CONTENT = GS001_LORA_CONTENT;
export const SCENARIO_SPINE = GS001_LORA_SPINE;
export const EXPERIMENT_RESULTS = GS001_EXPERIMENT_RESULTS;
export const CLAIM_GROUND_TRUTH = GS001_CLAIM_GROUND_TRUTH;
export const makeBridgeHandoff = makeGs001BridgeHandoff;
export const makeBackHalfFixtures = makeGs001BackHalfFixtures;
