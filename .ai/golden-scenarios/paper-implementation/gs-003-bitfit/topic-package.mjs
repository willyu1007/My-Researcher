/**
 * GS-003 golden-scenario topic package (T-124 G3, D10 素材形态——边界条件族).
 *
 * 测试用选题包：形态合规的晋升选题包 bridge handoff，内容取材公开 arXiv 带代码论文
 * BitFit (arXiv:2106.10199, "BitFit: Simple Parameter-efficient Fine-tuning for
 * Transformer-based Masked Language-models"，公开参考实现 benzakenelad/BitFit)。
 * 论文已知路线/实验/结论作为人审 rubric ground truth（见同目录 ground-truth.md），
 * 本文件的内容核只承载"晋升时点"可见的选题内容（研究问题/动机假设/范围边界/早期检查
 * 义务/预算包络/预承诺），不预置论文答案——LLM 工位的产出与论文实际路线的对齐度正是
 * 人审对象。
 *
 * 场景定位（三场景第三形态）：**边界条件作为一等研究问题**。BitFit 的已知 ground truth
 * 天然含 negative/inconclusive 结论（小中训练集 bias-only ≈ full-FT；大训练集 full-FT
 * 拉开优势）。本选题包把"何时宣告边界"的判据、退化阈值、negative/inconclusive 结论的
 * 处置规则全部**晋升时点预承诺**——考验 claim boundary 纪律、N7 失败对账与 D-N8 claim
 * lineage 的 claim-drop / negative-claim 语义。negative 结论是一等产出，不是失败。
 *
 * 形状镜像 gs-001-lora/topic-package.mjs（T-109 bridge handoff 契约，真实 bootstrap
 * 路由消费），id 前缀 gs003_。hash 纪律：所有 *_hash 均由 sha256Hex 在装载时对内容/
 * 载荷现算（64 位小写 hex），无硬编码 hash 需手动维护，改内容即自洽重算。
 *
 * v1（2026-07-16）即吸收 gs-001 v1→v3 三轮评审全部教训（不等 skeptic 重新拦一遍）：
 * - 阶段判据自包含（gs-001 RF-BASE-001 教训）：stage 0 探针在 stage 0 内自训短
 *   full-FT 校准锚点，判据只用 stage 0 产出即可判读，绝不依赖后续 stage。
 * - 预算矩阵单计（RR-002 + RF-COMP-001 教训）：总预算/分 stage 预算/组合上限/重复上限
 *   全预承诺；full-FT 单元格跨 stage 逐字复用绝不重训，账本只计一次。
 * - metric 预承诺（RR-003 + RF-DATA-001 教训）：主指标预注册、复现门槛、mean-over-repeats
 *   聚合、parity 容差、锚点作废语义全显式。
 * - claim-drop 规则（RR-004 + RF-BASE-002 教训）：失败复现 drop 受影响主张而非弱化，
 *   drop 及理由必报告；本场景在其上扩展 negative/inconclusive 登记规则（见下）。
 * - 参考实现指针（RF-TRACE-001 教训）：公开参考实现作晋升时点 code/config 溯源锚，
 *   项目级工件缺口诚实登记。
 *
 * 故意保留的诚实次要缺口（skeptic 有真活，均非阶段矛盾类硬伤；对照
 * ground-truth.md §GT-9）：
 * - GAP-1：stage 2 数据量梯度矩阵未预承诺子采样协议（类别/genre 分层、抽样种子策略）——
 *   子采样方差可能混淆退化起点估计，route/skeptic 应当补上。
 * - GAP-2：边界只在单一模型规模（BERT-base 级）上探测，"数据量边界可能与模型容量
 *   混淆"未在选题包内声明为已知混淆因素——skeptic 应当指出。
 *
 * v4 接口对齐（experiment_results 段 + claim ground truth 锚）：gs-001 素材 v4 与 G1
 * runner 场景参数化在本素材撰写期间落地，本文件**直接对齐**通用场景导出契约
 * （runner_contract paper-implementation-golden-scenario/v4）：sha256Hex / SCENARIO_META /
 * SCENARIO_IDS / SCENARIO_CONTENT / makeBridgeHandoff / EXPERIMENT_RESULTS /
 * CLAIM_GROUND_TRUTH / makeBackHalfFixtures(refs)。见文件末尾各段。
 * EXPERIMENT_RESULTS 供 run_mode=acceptance 实验假体产出 trusted RunEvidenceUnit 用，
 * 内容=论文真实数字（梯度矩阵的次尺度格为"与论文趋势一致的场景 fixture"，逐格
 * provenance 如实标注）；**绝不注入 result_analysis 之前的任何 LLM slot 上下文**。
 * 两处 role 级别名映射（通用键→本场景对象）与 runner 前半链 spine 文案仍为 LoRA
 * 硬编码的已知项，登记于 ground-truth.md §GT-9。
 */
import { createHash } from 'node:crypto';

export function sha256Hex(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

export const GS003_IDS = {
  bridge: 'gs003_paper_project_bridge_001',
  workspace: 'gs003_workspace_001',
  titleCard: 'gs003_title_card_bitfit',
  topicPackage: 'gs003_topic_package_bitfit',
  promotionDecision: 'gs003_promotion_decision_001',
  humanPromotionDecision: 'gs003_human_promotion_decision_001',
  humanConfirmedDecision: 'gs003_human_confirmed_decision_001',
  commitmentProfile: 'gs003_promotion_commitment_profile_001',
  promotionGateCheck: 'gs003_promotion_gate_check_001',
  promotionInputSnapshot: 'gs003_promotion_input_snapshot_001',
  // deterministic spine
  motive: 'gs003_core_motive_001',
  motiveVersion: 'gs003_core_motive_version_001',
  assertionAdaptationCostPressure: 'gs003_assertion_adaptation_cost_pressure',
  assertionBiasOnlySufficiency: 'gs003_assertion_bias_only_sufficiency',
  assertionEffectivenessBoundary: 'gs003_assertion_effectiveness_boundary',
  board: 'gs003_board_version_001',
  bindingAdaptationCostPressure: 'gs003_binding_adaptation_cost_pressure',
  bindingBiasOnlySufficiency: 'gs003_binding_bias_only_sufficiency',
  bindingEffectivenessBoundary: 'gs003_binding_effectiveness_boundary',
  // evidence handles (topic-package sourced; two units => curation 可绑定 evidence >=2)
  litEvidenceBitfit: 'gs003_lit_evidence_bitfit_2106_10199',
  sourceLocatorBitfit: 'gs003_source_locator_arxiv_2106_10199',
  citationCandidateBitfit: 'gs003_citation_bitfit_2106_10199',
  litEvidenceAdapter: 'gs003_lit_evidence_adapter_1902_00751',
  sourceLocatorAdapter: 'gs003_source_locator_arxiv_1902_00751',
  citationCandidateAdapter: 'gs003_citation_adapter_1902_00751',
  inputSnapshot: 'gs003_input_snapshot_001',
  metricTaskScore: 'gs003_metric_glue_task_score',
  metricTrainableParams: 'gs003_metric_trainable_parameter_fraction',
  metricDegradationGap: 'gs003_metric_full_ft_minus_bias_only_gap',
  datasetGlueSmallMedium: 'gs003_dataset_glue_small_medium_subset',
  datasetMnliGradient: 'gs003_dataset_mnli_training_size_gradient',
  baselineFullFinetune: 'gs003_baseline_full_finetune',
  baselineAdapter: 'gs003_baseline_adapter_tuning',
  baselineMajorityClass: 'gs003_baseline_majority_class',
  codeBitfitReference: 'gs003_code_bitfit_reference',
  configBiasOnly: 'gs003_config_bias_only_budget',
  // acceptance-bridge targets
  routeCandidate: 'gs003_route_candidate_001',
  feasibilityProbe: 'gs003_feasibility_probe_001',
  humanDecisionRouteAccept: 'gs003_human_decision_route_accept',
  humanDecisionProbeAccept: 'gs003_human_decision_probe_accept',
  // --- v4 back-half (G1): work order → acceptance experiment → REU → result
  //     analysis → claim → dossier（键名与 gs-001 v4 逐一对齐）。 ---
  validationCycle: 'gs003_validation_cycle_001',
  validationBudget: 'gs003_validation_budget_001',
  stopRule: 'gs003_stop_rule_001',
  experimentPlan: 'gs003_experiment_plan_light_001',
  workOrder: 'gs003_research_work_order_001',
  runPolicy: 'gs003_run_policy_001',
  runRecipe: 'gs003_run_recipe_001',
  // acceptance 假体 external job identity（与 gs-001 v4 同语义：run-monitor-intake
  // 通道逐字消费预置 experiment_results，不跑 experiment-foundation 基建）。
  externalJob: 'gs003_external_job_001',
  runEvidenceUnit: 'gs003_run_evidence_unit_001',
  experimentResult: 'gs003_experiment_result_001',
  resultValidationReport: 'gs003_result_validation_report_001',
  resultPacket: 'gs003_result_interpretation_packet_001',
  claimCandidate: 'gs003_claim_candidate_001',
  claimTracePacket: 'gs003_claim_trace_packet_001',
  humanConfirmationStrongClaim: 'gs003_human_confirmation_strong_claim_001',
  dossier: 'gs003_implementation_dossier_001',
};

/**
 * 选题包内容核（晋升时点可见信息，不含论文答案）。
 * 运行 runner 时同一内容核灌入 slot 请求的 source_context_packets / 领域脊柱对象。
 *
 * 阈值语义同 gs-001 v2/v3：均为**本项目的复现门槛与预承诺判据**（reproduction target /
 * pre-committed criterion），不是论文报告值——不预置论文答案。
 */
export const GS003_BITFIT_CONTENT = {
  research_question:
    'Can fine-tuning only the bias terms of a pretrained Transformer language model (~0.1% of parameters) '
    + 'match full fine-tuning on downstream classification tasks in the small-to-medium training-data regime, '
    + 'and — treated as a first-class research question — where exactly on the training-set-size axis does '
    + 'this parity break down?',
  motive_hypothesis:
    'Bias terms play a disproportionate role in downstream adaptation: freezing all weight matrices and '
    + 'training only the bias vectors (plus the task head) preserves most task performance when training data '
    + 'is limited, because fine-tuning in that regime mainly exposes knowledge already present in the '
    + 'pretrained network rather than learning new task-specific transformations.',
  boundary_hypothesis:
    'The parity between bias-only tuning and full fine-tuning is bounded: as training-set size grows, full '
    + 'fine-tuning is expected to pull ahead. Locating and characterizing this effectiveness boundary on a '
    + 'pre-committed training-set-size gradient is a primary deliverable of this project, NOT a failure mode. '
    + 'A negative outcome (parity breaks at scale s) and an inconclusive outcome (boundary not reached within '
    + 'the probed grid, or anchor cells void) are both first-class, pre-registered results.',
  scope: {
    included: [
      'Bias-only parameter-efficient downstream adaptation of pretrained Transformer encoder language models',
      'Sentence-level classification / sentence-pair tasks in the GLUE family',
      'Training-set-size gradient analysis of the parity boundary between bias-only tuning and full fine-tuning',
    ],
    excluded: [
      'Training new pretrained models from scratch (no new pretraining)',
      'Generation tasks, sequence labeling, and non-language modalities',
      'Decoder-only or encoder-decoder architectures (encoder-only scope at the probed scale)',
    ],
    non_goals: [
      'General claims about model reliability or capability beyond the adaptation-efficiency question',
      'A universal ranking of parameter-efficient fine-tuning methods',
    ],
  },
  early_check_obligations: [
    'Bias-only feasibility probe (stage 0, self-contained gate): stage 0 first trains a short single-seed '
    + 'full fine-tuning calibration anchor on a fixed 2,000-example SST-2 subsample from a fixed public '
    + 'reference configuration inside stage 0, then trains bias-only tuning on the same subsample. Probe pass '
    + 'criterion, evaluable from stage-0 outputs alone: bias-only SST-2 subsample accuracy is BOTH (a) at '
    + 'least the absolute floor of 85.0 accuracy points AND (b) at or above (stage-0 calibration anchor '
    + 'accuracy - 1.0 points). The stage-0 calibration anchor is a gate reference only and is NOT the stage-1 '
    + 'formal full fine-tuning reproduction; stage 1 starts only after this probe passes.',
    'Anchor reproducibility check (stage 1): the mandatory full fine-tuning reproduction on all three '
    + 'committed small/medium tasks must meet its pre-committed per-task reproduction targets before any '
    + 'parity claim is planned; the stage-1 full fine-tuning runs are reused verbatim wherever a full '
    + 'fine-tuning cell for the same (task, full-data) condition is needed later (never re-trained).',
    'Boundary declaration obligation (stage 2): the training-set-size boundary matrix must run to grid '
    + 'completion or an honestly-reported budget stop, and its outcome MUST be registered as a first-class '
    + 'claim under the pre-committed disposition mapping — boundary found (negative-scope claim), boundary '
    + 'not reached within the probed grid (bounded parity claim + inconclusive onset), or void anchors '
    + '(inconclusive with reason codes). Declining to register the outcome is a protocol violation.',
  ],
  budget_envelope: {
    scale: 'small-scale reproduction with an extremely light probe',
    model_scale: 'BERT-base class encoder language model',
    evaluation_scale:
      'GLUE subset, committed small/medium task set: SST-2, MRPC, CoLA; boundary gradient on MNLI',
    max_compute: 'single GPU (<=24 GB VRAM); total training budget <=24 GPU-hours',
    max_runtime: 'PT48H',
    retry_budget: 1,
  },
  content_version: 'v1',
  confirmatory_budget_matrix: {
    gpu_constraint: 'single GPU, <=24 GB VRAM',
    total_training_budget:
      '<=24 GPU-hours across feasibility probe, small/medium reproduction, and boundary matrix combined',
    // Key names stage1_baseline_reproduction / stage2_confirmatory_matrix align the gs-001/G1 runner
    // contract; in this scenario stage 1 is the small/medium full-FT + bias-only reproduction and stage 2
    // is the MNLI training-set-size BOUNDARY matrix (see stage_budget_notes / confirmatory_matrix_definition).
    stage_budgets: {
      stage0_feasibility_probe: '<=2 GPU-hours',
      stage1_baseline_reproduction: '<=10 GPU-hours',
      stage2_confirmatory_matrix: '<=12 GPU-hours',
    },
    stage_budget_notes:
      'Stage 0 (<=2 GPU-hours) covers BOTH the short single-seed SST-2-subsample full fine-tuning calibration '
      + 'anchor and the bias-only probe run. Stage 1 (<=10 GPU-hours) is the formal full fine-tuning + '
      + 'bias-only reproduction on the three committed small/medium tasks. Stage 2 (<=12 GPU-hours) covers '
      + 'ONLY the MNLI training-set-size gradient cells; no stage-1 cell is re-trained in stage 2 (see '
      + 'full_ft_reuse_rule).',
    full_ft_reuse_rule:
      'Every full fine-tuning cell is trained at most once per (task, data-scale) condition and reused '
      + 'verbatim (same checkpoints and metrics) wherever that condition is needed again, so each full '
      + 'fine-tuning condition is counted once against the 24 GPU-hour ledger. The stage-0 calibration anchor '
      + 'is a separate short single-seed run inside the stage-0 probe budget and is NOT reused as a stage-1 '
      + 'or stage-2 cell.',
    confirmatory_matrix_definition:
      'Confirmatory cells are capped at 14: stage-1 parity matrix {bias-only, full fine-tuning} x {SST-2, '
      + 'MRPC, CoLA} (6 cells) plus stage-2 boundary matrix {bias-only, full fine-tuning} x {MNLI at 2k, 10k, '
      + '50k, full (~393k) training examples} (8 cells). A cell is one (method, task, data-scale) condition; '
      + 'repeats within a cell are capped separately below.',
    // Key name max_repeats_per_task aligns the gs-001/G1 runner contract; caps differ by stage here.
    max_repeats_per_task:
      'Stage-1 cells: <=3 repeats (seeds). Stage-2 gradient cells: <=2 repeats (seeds) per cell; the full-data '
      + 'MNLI cells run single-seed within budget and are flagged as single-seed in every downstream claim.',
    hyperparameter_policy:
      'Hyperparameters are fixed before stage 1 from the stage-0 settings and public reference '
      + 'configurations; no post-hoc hyperparameter search inside the confirmatory matrix. The bias-only '
      + 'learning rate may differ from the full fine-tuning learning rate but both are frozen before stage 1.',
    // Key name rank_policy aligns the gs-001/G1 runner contract; BitFit has no low-rank hyperparameter.
    rank_policy:
      'Bias-subset policy: the confirmatory bias-only method trains the full set of bias vectors plus the '
      + 'task head, fixed before stage 1. Any narrower bias partition is exploratory only and is never '
      + 'swapped into a confirmatory cell post hoc.',
    // Key name latency_protocol aligns the gs-001/G1 runner contract; BitFit changes no inference-time
    // architecture, so there is no separate inference-latency protocol.
    latency_protocol:
      'No separate inference-latency protocol: bias-only tuning adds no inference-time layers, so efficiency '
      + 'is measured per efficiency_measurement_protocol (trainable-parameter fraction and per-task '
      + 'stored-delta size), reported alongside every parity and boundary claim.',
    checkpoint_policy:
      'Keep the final checkpoint per run only; no best-of-many checkpoint selection for confirmatory claims.',
    efficiency_measurement_protocol:
      'Trainable-parameter fraction and per-task stored-delta size are measured once per method from the '
      + 'committed configuration (bias-only: bias vectors + task head; full fine-tuning: all parameters) and '
      + 'reported alongside every parity and boundary claim.',
  },
  dataset_metric_precommitments: {
    primary_metrics_preregistered: true,
    alignment_criterion:
      'Primary parity judgement per stage-1 task (ONE-SIDED, degradation-bounded): the bias-only task metric, '
      + 'aggregated as the MEAN over repeats (repeats capped at 3 per cell), is at or above (our reproduced '
      + 'full fine-tuning value for that task - 1.0 points), the anchor value also being the mean over its '
      + 'repeats; a bias-only value EXCEEDING the anchor passes — the criterion bounds degradation, not '
      + 'improvement. The per-task full fine-tuning reproduction targets '
      + 'below gate whether the reproduced full fine-tuning value is usable as the parity anchor at all; a '
      + 'task whose full fine-tuning reproduction misses its target has no usable anchor and its parity claim '
      + 'is void (registered as inconclusive, not weakened, not silently dropped).',
    metric_aggregation: {
      rule: 'mean over repeats per (method, task, data-scale) cell; parity is one-sided '
        + '(bias-only mean >= anchor mean - tolerance); exceeding the anchor passes',
      repeat_cap_stage1: 3,
      repeat_cap_stage2: 2,
      // Key name repeat_cap_per_task aligns the gs-001/G1 runner contract; caps differ by stage here.
      repeat_cap_per_task: '3 for stage-1 parity cells, 2 for stage-2 gradient cells (full-data MNLI single-seed)',
      parity_tolerance_points: 1.0,
      anchor:
        'per-condition reproduced full fine-tuning mean; a condition whose full fine-tuning cell fails its '
        + 'validity rule has no usable anchor and every claim over that condition is void and registered as '
        + 'inconclusive with reason codes (not weakened, not silently dropped)',
    },
    tasks: [
      { task: 'SST-2', primary_metric: 'accuracy', full_finetune_reproduction_target: '>=91.5% accuracy' },
      { task: 'MRPC', primary_metric: 'F1', full_finetune_reproduction_target: '>=88.0 F1' },
      { task: 'CoLA', primary_metric: 'Matthews correlation coefficient', full_finetune_reproduction_target: '>=55.0 MCC' },
      {
        task: 'MNLI (boundary gradient)',
        primary_metric: 'matched accuracy',
        full_finetune_reproduction_target:
          '>=83.0% matched accuracy at the full (~393k) training-set scale; sub-scale gradient cells have no '
          + 'external reproduction target and are instead gated by the anchor validity rule below',
      },
    ],
    gradient_anchor_validity_rule:
      'A stage-2 full fine-tuning gradient cell is a usable anchor iff its matched accuracy exceeds the '
      + 'MNLI majority-class baseline by >=10.0 points; a cell failing this rule renders that data-scale '
      + 'comparison void and it is registered as inconclusive for that scale (never interpolated over).',
    secondary_metrics: [
      'trainable parameter fraction (% of total model parameters)',
      'per-task stored adaptation delta size',
      'full fine-tuning minus bias-only gap per gradient cell (points, with sign)',
    ],
  },
  boundary_precommitments: {
    first_class_question:
      'The effectiveness boundary of bias-only tuning over training-set size is a primary research question '
      + 'of this project. The route design MUST carry these pre-commitments into the plan unchanged; '
      + 'discovering a boundary is a deliverable, not a failure.',
    gradient_grid:
      'MNLI training-set-size gradient, pre-committed grid: {2,000, 10,000, 50,000, full (~393,000)} training '
      + 'examples, evaluated on the full matched dev set at every scale.',
    degradation_threshold:
      'Degradation at a data scale = (full fine-tuning mean matched accuracy - bias-only mean matched '
      + 'accuracy) >= 1.0 point at that scale.',
    onset_rule:
      'The boundary onset is the smallest grid scale at which the degradation threshold is met AND the gap '
      + 'at the next larger grid scale (when one exists) also meets the threshold (persistence rule). A '
      + 'threshold crossing at the largest grid scale alone is reported as "degradation at full scale, onset '
      + 'not localized within the grid".',
    disposition_mapping: [
      'Boundary found (onset localized): register a first-class NEGATIVE claim — "bias-only tuning does not '
      + 'maintain parity with full fine-tuning at or beyond scale s within the probed setting" — with the '
      + 'same evidence and lineage obligations as any positive claim.',
      'No grid cell reaches the degradation threshold: register a bounded parity claim over the probed grid '
      + 'AND an INCONCLUSIVE registration for the boundary-onset question ("boundary not reached within the '
      + 'probed grid"); the parity claim must not be extrapolated beyond the grid.',
      'Anchor cells void (validity rule failed) at one or more scales: the affected scales are registered as '
      + 'INCONCLUSIVE with reason codes; remaining valid scales may still support scale-local claims but no '
      + 'onset claim may bridge across a void scale.',
    ],
    extension_rule:
      'A QQP gradient replication of the boundary matrix runs only if >=4 GPU-hours of the total training '
      + 'budget remain after the committed stage-2 grid completes; if not run, the omission itself is '
      + 'reported and no cross-task boundary generalization is claimed from MNLI alone.',
    boundary_claim_ceiling:
      'Boundary claims are bounded to: BERT-base class encoders, GLUE-style sentence(-pair) classification, '
      + 'and the probed training-set-size grid. Claims of the form "bias-only tuning fails for all large '
      + 'datasets / all tasks / all model scales" are prohibited overgeneralizations regardless of outcome.',
  },
  negative_claim_registration_rule:
    'Negative outcomes are first-class, pre-registered products of this project. A confirmatory cell or '
    + 'boundary matrix outcome that contradicts the parity hypothesis MUST be registered as a NEGATIVE claim '
    + 'candidate with full evidence lineage (run evidence units, cells, thresholds), identical in rigor to a '
    + 'positive claim. Rewriting a negative outcome as a weakened positive claim, omitting it from the '
    + 'dossier, or downgrading it to an informal remark is a protocol violation and must be surfaced.',
  inconclusive_registration_rule:
    'INCONCLUSIVE is a distinct first-class disposition, reserved for pre-committed situations: void parity '
    + 'anchors (reproduction target missed), void gradient anchors (validity rule failed), or a boundary '
    + 'onset not reached within the probed grid. Every inconclusive registration carries its reason code and '
    + 'the affected cells; inconclusive results are reported in the dossier, never silently dropped and '
    + 'never presented as positive or negative findings.',
  claim_drop_rule:
    'Failed baseline or anchor reproduction DROPS the affected comparative claim rather than weakening, '
    + 'reinterpreting, or silently omitting it; the drop and its reason are always reported. Parity claims '
    + 'stay void for any task whose full fine-tuning reproduction misses its pre-committed target; boundary '
    + 'onset claims stay void across any data scale whose anchor cell fails the validity rule.',
  baseline_control_checklist: [
    {
      baseline: 'full fine-tuning',
      obligation: 'mandatory reproduction (parity anchor and boundary anchor)',
      success_criterion:
        'meets the per-task full fine-tuning reproduction targets on all three committed small/medium tasks '
        + 'and the full-scale MNLI target; gradient cells pass the anchor validity rule',
      on_failure:
        'parity/boundary claims are void for any condition whose anchor fails; reported as a reproduction '
        + 'failure with an inconclusive registration, never silently dropped',
    },
    {
      baseline: 'Houlsby-style adapter tuning',
      obligation: 'optional, budget-gated (run only if >=3 GPU-hours remain after the committed stage-1 cells)',
      success_criterion:
        'if run: task score within 1.5 points of our reproduced full fine-tuning on SST-2 and MRPC, with '
        + 'trainable parameter fraction measured under the committed efficiency protocol',
      on_failure:
        'adapter comparison reported as not-reproduced or budget-excluded; efficiency claims against adapters '
        + 'are dropped rather than weakened, and the omission itself is reported',
    },
  ],
  // Key name baseline_claim_control_rule aligns the gs-001/G1 runner contract; here it restates the
  // scenario's claim_drop / negative / inconclusive registration discipline in one clause.
  baseline_claim_control_rule:
    'Failed baseline or anchor reproduction DROPS the affected comparative claim (a per-task parity claim, '
    + 'or a boundary-onset claim) rather than weakening, reinterpreting, or silently omitting it; the drop '
    + 'and its reason are always reported. Parity claims stay void for any task whose full fine-tuning '
    + 'reproduction misses its pre-committed target; boundary-onset claims stay void across any data scale '
    + 'whose gradient anchor fails the validity rule. A pre-registered negative or inconclusive outcome is a '
    + 'first-class result and is never presented as a weakened positive.',
  reference_implementation: {
    note:
      'Public reference implementation available at promotion time as intake context (matches the arXiv '
      + 'basis of this topic package). Route/skeptic MAY cite it as the code/config traceability anchor for '
      + 'the bias-parameter selection, optimizer schedule, learning-rate policy, seed handling, dataset '
      + 'split/version, subsampling of training sets, and checkpoint policy.',
    code_reference:
      'Official BitFit reference implementation for bias-only fine-tuning of Transformer encoders (public '
      + 'repository, benzakenelad/BitFit).',
    config_reference:
      'Public BERT-base fine-tuning reference configuration (optimizer schedule, sequence length, per-task '
      + 'learning-rate ranges for bias-only vs full fine-tuning).',
    known_gap:
      'Project-specific code_version and config artifacts do not exist at promotion time and remain a known, '
      + 'honestly-declared route-planning gap until stage-0 execution produces them; this pointer is '
      + 'reference material, not a project-owned artifact.',
  },
  staged_route_dependency: {
    stage0_gate:
      'Feasibility probe pass criterion (self-contained, evaluable from stage-0 outputs alone): stage 0 '
      + 'trains a short single-seed full fine-tuning calibration anchor on a fixed 2,000-example SST-2 '
      + 'subsample and a bias-only run on the same subsample; the probe passes iff bias-only subsample '
      + 'accuracy is BOTH >= 85.0 absolute accuracy points AND >= (stage-0 calibration anchor - 1.0). '
      + 'Stage 1 starts only after this gate passes. No stage-1 result is required to evaluate the stage-0 '
      + 'gate.',
    // Key name baseline_gate aligns the gs-001/G1 runner contract; here the "baseline" is the mandatory
    // full fine-tuning reproduction that anchors both parity and boundary claims.
    baseline_gate:
      'Parity claims additionally require the mandatory stage-1 full fine-tuning reproduction to meet its '
      + 'per-task targets; boundary claims additionally require the stage-2 gradient anchor cells to pass '
      + 'the anchor validity rule. Full fine-tuning cells are reused verbatim across stages per the '
      + 'full_ft_reuse_rule.',
    confirmatory_exploratory_boundary:
      'Confirmatory = the pre-registered 14-cell matrix, tasks, metrics, thresholds, gradient grid, and '
      + 'disposition mapping above, frozen before stage 1 begins. Anything learned in stage 0/1 may abort or '
      + 'shrink the confirmatory plan but may not add, swap, or reweight confirmatory comparisons post hoc — '
      + 'including converting an expected-negative cell into an exploratory one after seeing its result; any '
      + 'such change demotes the affected claim to exploratory and is reported.',
  },
  literature_context_key_facts: [
    'Full fine-tuning of pretrained language models changes all parameters and requires storing a full '
    + 'model copy per downstream task, motivating parameter-efficient alternatives.',
    'Bias terms are a tiny fraction (order of 0.1%) of a Transformer encoder\'s parameters, so a bias-only '
    + 'update is one of the smallest possible per-task adaptation deltas.',
    'Adapter-based approaches insert extra trainable layers: far fewer trainable parameters than full '
    + 'fine-tuning, but more than bias-only updates, and they modify the inference-time architecture.',
    'Sparse-difference fine-tuning approaches (e.g., diff pruning) learn a sparse per-task delta over all '
    + 'parameters, trading a larger trainable budget for higher fidelity to full fine-tuning.',
    'Prior parameter-efficient fine-tuning reports suggest that the benefit of updating the full network '
    + 'grows with training-set size, so the effectiveness of extremely small update families is expected to '
    + 'be regime-dependent — the boundary location, however, is not established for the bias-only family at '
    + 'promotion time.',
  ],
};

const GS003_BITFIT_SPINE = {
  motive_short_name: 'Bias-only fine-tuning and its data-size boundary',
  motive_contract: {
    problem_pressure:
      'Per-task full fine-tuning of pretrained Transformer encoders updates and stores an entire model copy per '
      + 'task, making adaptation cost high even when the downstream task is narrow.',
    current_solution_insufficiency:
      'Existing parameter-efficient methods reduce trainable parameters but often add modules, train more than the '
      + 'smallest possible update family, or leave the data-regime boundary unclear.',
    unmet_or_failure_mechanism:
      'It is not established whether tuning only bias terms can preserve full-fine-tuning performance in the '
      + 'small/medium-data regime, nor where that parity breaks as training data grows.',
    target_setting: 'Bias-only adaptation of BERT-class Transformer encoders on GLUE-style classification tasks.',
    expected_contribution_path:
      'If small/medium-data adaptation mostly exposes knowledge already present in the pretrained model, tuning '
      + 'only bias vectors and the task head should match full fine-tuning until larger datasets make full updates useful.',
    why_this_is_not_trivial:
      'Bias terms are an extremely small parameter subset, so parity with full fine-tuning is not guaranteed and '
      + 'the expected degradation boundary must be measured rather than assumed.',
    why_existing_baselines_do_not_already_solve_it:
      'Adapters and sparse-delta methods show that fewer trainable parameters can work, but they do not isolate '
      + 'the minimal bias-only update or its training-set-size effectiveness boundary.',
    what_makes_this_researchable_now:
      'Public BERT checkpoints, GLUE tasks, and a reference BitFit implementation make a bounded parity and '
      + 'boundary probe feasible within a small single-GPU budget.',
  },
  falsification_contract: {
    invalidation_conditions: [
      'Bias-only tuning fails to reach the pre-committed small/medium parity criterion on anchor-valid tasks and '
      + 'does not yield an interpretable boundary result.',
    ],
    weakening_conditions: [
      'Bias-only parity appears on only one task family, or the boundary onset cannot be localized within the '
      + 'probed training-size grid.',
    ],
    minimum_evidence_to_continue: [
      'At least one anchor-valid small/medium task where bias-only tuning is within the pre-committed tolerance '
      + 'of full fine-tuning.',
    ],
    decisive_negative_conditions: [
      'Bias-only tuning consistently trails full fine-tuning beyond the tolerance across all probed data regimes, '
      + 'including the smallest committed setting.',
    ],
  },
  claim_boundary: {
    maximum_allowed_claim:
      'Bias-only fine-tuning matches full fine-tuning in the probed small/medium-data GLUE setting while training '
      + 'a tiny parameter fraction, and its large-data degradation boundary is reported only within the probed grid.',
    minimum_defensible_contribution_claim:
      'A measured characterization of bias-only tuning parity and its effectiveness boundary over training-set size.',
    forbidden_overclaims: [
      'Universal sufficiency of bias-only tuning across all tasks or data regimes',
      'Omitting or weakening a pre-registered negative or inconclusive boundary outcome',
      'Claims about model scales, architectures, or modalities never probed',
    ],
    claim_types_allowed: ['analysis_claim'],
  },
  assertions: {
    motivation_pressure: {
      assertion_type: 'motivation_pressure',
      assertion_text:
        'Per-task full fine-tuning cost and checkpoint storage are binding constraints for adapting pretrained '
        + 'Transformer encoders to many downstream classification tasks.',
      must_hold: true,
      contradict: ['Deployment evidence showing per-task full fine-tuning cost is negligible for the target setting.'],
      weaken: ['The cost pressure applies only when maintaining a very large number of downstream task checkpoints.'],
      decomposition_scope_summary:
        'Cost pressure applies to downstream adaptation of BERT-class encoder models for GLUE-style classification; '
        + 'no new pretraining, generation, or multimodal scope.',
    },
    technical_opportunity: {
      assertion_type: 'technical_opportunity',
      assertion_text:
        'Tuning only bias terms and the task head, about 0.1% of model parameters in the paper setting, can match '
        + 'full fine-tuning in the small/medium-data regime.',
      must_hold: true,
      contradict: ['Bias-only tuning underperforms full fine-tuning beyond tolerance on anchor-valid small/medium tasks.'],
      weaken: ['Parity holds only when task heads dominate the trainable update or only under favorable subsampling.'],
      decomposition_scope_summary:
        'The bias-only opportunity targets BERT-base class encoders on committed small/medium GLUE tasks, judged '
        + 'against reproduced full-fine-tuning anchors.',
    },
    baseline_gap: {
      assertion_type: 'baseline_gap',
      assertion_text:
        'The key boundary gap is not just whether bias-only tuning can work, but where it stops working: parity is '
        + 'expected to degrade as training-set size grows and that negative/inconclusive-capable boundary must be '
        + 'tracked as a first-class result.',
      must_hold: false,
      contradict: ['A prior like-for-like study already localizes the bias-only training-size boundary for the same setting.'],
      weaken: ['The observed boundary is strongly confounded by subsampling variance or invalid full-fine-tuning anchors.'],
      decomposition_scope_summary:
        'Boundary gap covers the committed MNLI training-set-size grid, reproduced full fine-tuning anchors, and '
        + 'negative/inconclusive disposition rules under the project budget.',
    },
  },
  board: {
    binding_dataset_scope: 'Bias-only and parameter-efficient Transformer fine-tuning literature',
    summary: {
      current_support_summary:
        'Topic-package literature supports full-fine-tuning cost pressure, the bias-only adaptation opportunity, '
        + 'and the expectation that data regime affects whether parity holds.',
      current_challenge_summary: 'The effectiveness boundary is expected to produce negative or inconclusive evidence if larger-data parity fails.',
      board_gap_summary:
        'The bias-only parity assertion needs anchor-valid small/medium reproduction, and the boundary assertion '
        + 'needs a completed training-size gradient with negative and inconclusive outcomes preserved.',
      next_evidence_needed: [
        'Bias-only vs full-fine-tuning reproduction on the committed small/medium GLUE tasks.',
        'MNLI training-set-size gradient with full-FT-minus-bias-only gaps and boundary disposition mapping.',
      ],
    },
    bindings: {
      motivation_pressure: {
        statement:
          'Prior work motivates parameter-efficient fine-tuning because full fine-tuning updates and stores a full '
          + 'model copy for each downstream task.',
        relevance: 'Directly supports the adaptation-cost motivation.',
        limitation: 'Evidence is literature-level; project-specific storage and training cost are not measured at intake.',
      },
      technical_opportunity: {
        statement:
          'Prior work reports that bias-only updates can match full fine-tuning on small and medium downstream '
          + 'classification tasks while training a tiny parameter fraction.',
        relevance: 'Directly supports the bias-only sufficiency hypothesis in the target regime.',
        limitation: 'The parity claim is regime-dependent and must be checked against reproduced anchors.',
      },
      baseline_gap: {
        statement:
          'Prior work indicates that the advantage of updating all parameters grows with training-set size, making '
          + 'the bias-only effectiveness boundary a substantive open measurement target.',
        relevance: 'Supports treating the large-data boundary as a first-class negative/inconclusive-capable result.',
        limitation: 'Boundary localization depends on the committed grid, anchor validity, and subsampling protocol.',
      },
    },
  },
  claim_trace_scope: {
    dataset_scope: 'Committed GLUE small/medium subset: SST-2, MRPC, CoLA; MNLI training-set-size gradient.',
    task_scope: 'Bias-only versus full fine-tuning for BERT-base class encoder classification tasks.',
    baseline_scope: 'Reproduced full fine-tuning anchors, optional Houlsby adapter, and majority-class anchor-validity baseline.',
    method_scope: 'Bias-only fine-tuning of bias vectors plus the task head.',
    evaluation_scope: 'Per-task primary metrics, trainable-parameter fraction, full-FT-minus-bias-only gap, and boundary disposition.',
  },
};

export function gs003Ref(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: GS003_IDS.titleCard,
    version_id: versionId,
  };
}

const CREATED_AT = '2026-07-16T00:00:00.000Z';

/**
 * 完整 bridge handoff（镜像 gs-001 makeGs001BridgeHandoff() 的形状与字段集合）。
 * hash 纪律：working_copy_payload_hash = sha256(working copy)；bridge_payload_hash =
 * sha256(去掉自身 hash 字段的 bridge 载荷)；snapshot_hashes 为内容 sha256。
 */
export function makeGs003BridgeHandoff() {
  const c = GS003_BITFIT_CONTENT;
  const sourceRefs = [
    gs003Ref('topic_package', GS003_IDS.topicPackage, 'v1'),
    gs003Ref('evidence_unit', GS003_IDS.litEvidenceBitfit),
    gs003Ref('source_locator', GS003_IDS.sourceLocatorBitfit),
    gs003Ref('evidence_unit', GS003_IDS.litEvidenceAdapter),
    gs003Ref('source_locator', GS003_IDS.sourceLocatorAdapter),
  ];
  const workingCopy = {
    editable_title:
      'Bias-only parameter-efficient fine-tuning of pretrained Transformer encoders: parity in the '
      + 'small-to-medium data regime and the location of its effectiveness boundary',
    problem_statement: c.research_question,
    contribution_summary: `${c.motive_hypothesis} ${c.boundary_hypothesis}`,
    evaluation_plan:
      `Small-scale reproduction with an extremely light probe: ${c.budget_envelope.model_scale} on a `
      + `${c.budget_envelope.evaluation_scale}. `
      + `Pre-registered parity criterion: ${c.dataset_metric_precommitments.alignment_criterion} `
      + `Per-task pre-commitments: ${c.dataset_metric_precommitments.tasks
        .map((t) => `${t.task} (${t.primary_metric}, full FT reproduction target ${t.full_finetune_reproduction_target})`)
        .join('; ')}. `
      + `Gradient anchor validity: ${c.dataset_metric_precommitments.gradient_anchor_validity_rule} `
      + `Secondary metrics: ${c.dataset_metric_precommitments.secondary_metrics.join(', ')}. `
      + `${c.confirmatory_budget_matrix.confirmatory_matrix_definition} `
      + `Boundary pre-commitments (first-class): grid ${c.boundary_precommitments.gradient_grid} `
      + `Degradation threshold: ${c.boundary_precommitments.degradation_threshold} `
      + `Onset rule: ${c.boundary_precommitments.onset_rule} `
      + `Disposition mapping: ${c.boundary_precommitments.disposition_mapping.join(' | ')} `
      + `Staged execution: ${c.staged_route_dependency.stage0_gate} ${c.staged_route_dependency.baseline_gate}`,
    initial_planning_notes: [
      `Included scope: ${c.scope.included.join('; ')}`,
      `Excluded scope: ${c.scope.excluded.join('; ')}`,
      `Non-goals: ${c.scope.non_goals.join('; ')}`,
      `Budget envelope: ${c.budget_envelope.scale}, ${c.budget_envelope.max_compute}, max runtime ${c.budget_envelope.max_runtime}`,
      `Confirmatory budget matrix: ${c.confirmatory_budget_matrix.gpu_constraint}; `
      + `${c.confirmatory_budget_matrix.total_training_budget}; stage budgets: `
      + `probe ${c.confirmatory_budget_matrix.stage_budgets.stage0_feasibility_probe}, `
      + `small/medium reproduction ${c.confirmatory_budget_matrix.stage_budgets.stage1_baseline_reproduction}, `
      + `boundary matrix ${c.confirmatory_budget_matrix.stage_budgets.stage2_confirmatory_matrix}; `
      + `repeats: ${c.confirmatory_budget_matrix.max_repeats_per_task} `
      + `${c.confirmatory_budget_matrix.hyperparameter_policy} `
      + `Checkpoint policy: ${c.confirmatory_budget_matrix.checkpoint_policy} `
      + `Efficiency protocol: ${c.confirmatory_budget_matrix.efficiency_measurement_protocol} `
      + `Reuse rule: ${c.confirmatory_budget_matrix.full_ft_reuse_rule}`,
      `Baseline control checklist: ${c.baseline_control_checklist
        .map((b) => `${b.baseline} [${b.obligation}] success: ${b.success_criterion}; on failure: ${b.on_failure}`)
        .join(' | ')}`,
      `Boundary extension rule: ${c.boundary_precommitments.extension_rule}`,
      `Negative-claim registration: ${c.negative_claim_registration_rule}`,
      `Inconclusive registration: ${c.inconclusive_registration_rule}`,
      `Claim-drop rule: ${c.claim_drop_rule}`,
      `Confirmatory/exploratory boundary: ${c.staged_route_dependency.confirmatory_exploratory_boundary}`,
    ],
    claim_ceiling:
      'Claims are bounded to bias-only adaptation of BERT-base class Transformer encoders on GLUE-style '
      + 'sentence(-pair) classification within the probed training-set-size grid. Negative and inconclusive '
      + 'registrations under the pre-committed disposition mapping are in-scope first-class outputs. '
      + `${c.boundary_precommitments.boundary_claim_ceiling}`,
    prohibited_claims: [
      'Universal superiority or universal sufficiency of bias-only tuning across all tasks and data regimes',
      'Claims about model scales, architectures, or modalities never probed in this project',
      'Boundary overgeneralizations of the form "bias-only tuning fails for all large datasets/tasks/scales"',
      'Presenting a pre-registered negative or inconclusive outcome as a weakened positive finding',
    ],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [...c.early_check_obligations],
    source_lineage_summary: {
      topic_package_id: GS003_IDS.topicPackage,
      source_paper: 'arXiv:2106.10199 (content basis for this test topic package)',
    },
  };
  const workingCopyPayloadHash = sha256Hex(workingCopy);
  const snapshotHashes = {
    bundle_hash: sha256Hex({ kind: 'gs003_bundle', source_refs: sourceRefs }),
    package_snapshot_hash: sha256Hex({ kind: 'gs003_package_snapshot', content: c }),
    package_draft_input_snapshot_hash: sha256Hex({ kind: 'gs003_package_draft_input_snapshot', content: c.research_question }),
    promotion_input_snapshot_hash: sha256Hex({ kind: 'gs003_promotion_input_snapshot', id: GS003_IDS.promotionInputSnapshot }),
  };
  const bridgeSansHash = {
    paper_project_bridge_id: GS003_IDS.bridge,
    bridge_status: 'active',
    workspace_id: GS003_IDS.workspace,
    title_card_id: GS003_IDS.titleCard,
    source_promotion_decision_id: GS003_IDS.promotionDecision,
    source_promotion_decision_ref: gs003Ref('promotion_decision', GS003_IDS.promotionDecision),
    human_promotion_decision_ref: gs003Ref('human_promotion_decision', GS003_IDS.humanPromotionDecision),
    human_confirmed_decision_ref: gs003Ref('human_confirmed_decision', GS003_IDS.humanConfirmedDecision),
    promotion_commitment_profile_id: GS003_IDS.commitmentProfile,
    promotion_commitment_profile_ref: gs003Ref('promotion_commitment_profile', GS003_IDS.commitmentProfile),
    promotion_gate_check_ref: gs003Ref('promotion_gate_check', GS003_IDS.promotionGateCheck),
    promotion_input_snapshot_id: GS003_IDS.promotionInputSnapshot,
    promotion_input_snapshot_ref: gs003Ref('promotion_input_snapshot', GS003_IDS.promotionInputSnapshot),
    promotion_input_snapshot_hash: snapshotHashes.promotion_input_snapshot_hash,
    topic_package_id: GS003_IDS.topicPackage,
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
    policy_version_id: 'gs003_policy_v1',
    created_by: 'system',
    created_at: CREATED_AT,
  };
  const bridgePayloadHash = sha256Hex(bridgeSansHash);
  const bridge = { ...bridgeSansHash, bridge_payload_hash: bridgePayloadHash };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: gs003Ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
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
// v4 back-half (G1): experiment_results 数据段 + claim ground-truth 锚。
//
// 字段名与 gs-001 素材 v4 同名段逐一对齐（content_version / provenance / model_scale /
// committed_tasks / parity_tolerance_points / stage0_probe / full_finetune_reproduction /
// confirmatory_matrix / resource / run_status / overall_note），另加本场景（边界条件族）
// 特有的 boundary_matrix / qqp_extension 段。数字来源（2026-07-16 自查核实）：
// - 论文真实数字：GLUE dev 均值（BERT-base 82.3/82.4、BERT-large 84.1/84.2）、BERT-large
//   per-task（SST-2 93.4/93.2、MRPC 90.7/91.7、CoLA 62.2/63.6、QNLI 91.7/91.4、
//   MNLI 85.5–85.7/84.4–84.8、QQP 87.5/85.4）、参数占比 0.09%/0.08%、对比行
//   Diff-Pruning 0.5%/84.6、Adapters 3.6%/81.1。
// - 场景 fixture（逐格 provenance 如实标注）：stage-0 探针 2k 子采样值与梯度矩阵
//   次尺度格（2k/10k/50k）——论文未报告这些尺度的数值，fixture 与论文自述趋势一致
//   （"BitFit dominates over Full-FT in the smaller-data regime, while the trend is
//   reversed when more training data is available"）。
// 隔离纪律：本段只供 acceptance 假体（harness-run + run-monitor-intake → trusted
// RunEvidenceUnit）；绝不注入 result_analysis 之前的任何 LLM slot 上下文。
// ---------------------------------------------------------------------------
export const GS003_EXPERIMENT_RESULTS = {
  content_version: 'v1',
  provenance:
    'arXiv:2106.10199 GLUE dev tables (BERT-base averages; per-task values from the BERT-large table, '
    + 'labeled per cell), reproduced as this test scenario\'s acceptance experiment result set. Sub-scale '
    + 'gradient cells and the stage-0 subsample probe are scenario fixtures consistent with the paper\'s '
    + 'data-size trend statement and are labeled as such per cell — no fixture value is presented as a '
    + 'paper-reported number.',
  model_scale: 'BERT-base class encoder (paper-verified per-task numbers come from the BERT-large table and are labeled)',
  committed_tasks: ['SST-2', 'MRPC', 'CoLA', 'MNLI (boundary gradient)'],
  parity_tolerance_points: 1.0,
  parity_criterion_note:
    'One-sided (degradation-bounded): bias-only mean >= full fine-tuning anchor mean - 1.0; exceeding the '
    + 'anchor passes.',
  glue_dev_averages: {
    bert_base: { full_finetune: 82.3, bias_only: 82.4 },
    bert_large: { full_finetune: 84.1, bias_only: 84.2 },
    provenance: 'paper-reported GLUE dev averages',
  },
  // stage-0 self-contained gate outcome (from the v1 early_check_obligations).
  stage0_probe: {
    calibration_anchor_sst2_2k_full_ft_accuracy: 88.9,
    bias_only_sst2_2k_accuracy: 89.4,
    absolute_floor: 85.0,
    within_anchor_tolerance_points: 1.0,
    passed: true,
    provenance:
      'scenario fixture consistent with the paper\'s smaller-data-regime trend (bias-only at or above '
      + 'full-FT on small training sets); the paper reports no value at this 2,000-example subsample scale',
    note: 'Bias-only SST-2-2k 89.4 is >= 85.0 absolute AND >= (stage-0 calibration anchor 88.9 - 1.0) — '
      + 'the self-contained stage-0 gate passes; stage 1 starts.',
  },
  // stage-1 anchor reproduction (full FT reproduction to the pre-committed targets).
  full_finetune_reproduction: [
    {
      task: 'SST-2', metric: 'accuracy', value: 93.4, precommitted_target: '>=91.5', target_met: true,
      provenance: 'paper-reported BERT-large dev value',
    },
    {
      task: 'MRPC', metric: 'F1', value: 90.7, precommitted_target: '>=88.0', target_met: true,
      provenance: 'paper-reported BERT-large dev value',
    },
    {
      task: 'CoLA', metric: 'Matthews correlation coefficient', value: 62.2, precommitted_target: '>=55.0', target_met: true,
      provenance: 'paper-reported BERT-large dev value',
    },
    {
      task: 'MNLI (full ~393k)', metric: 'matched accuracy', value: 85.5, precommitted_target: '>=83.0', target_met: true,
      provenance: 'paper-reported BERT-large dev value (paper range 85.5–85.7; conservative end used)',
    },
  ],
  // stage-1 parity matrix: bias-only vs reproduced full FT, mean over repeats,
  // one-sided 1.0-point criterion (delta = bias_only - full_ft; positive = bias-only above anchor).
  confirmatory_matrix: [
    {
      task: 'SST-2', metric: 'accuracy', bias_only: 93.2, full_ft: 93.4, delta: -0.2, parity: true,
      provenance: 'paper-reported BERT-large dev values',
    },
    {
      task: 'MRPC', metric: 'F1', bias_only: 91.7, full_ft: 90.7, delta: 1.0, parity: true,
      provenance: 'paper-reported BERT-large dev values (bias-only ABOVE the full-FT anchor)',
    },
    {
      task: 'CoLA', metric: 'Matthews correlation coefficient', bias_only: 63.6, full_ft: 62.2, delta: 1.4, parity: true,
      provenance: 'paper-reported BERT-large dev values (bias-only ABOVE the full-FT anchor; passes the '
        + 'one-sided criterion — the criterion bounds degradation, not improvement)',
    },
  ],
  // stage-2 boundary matrix（本场景核心）：MNLI training-set-size gradient.
  // gap = full_ft - bias_only（正值=退化方向）；degradation threshold = gap >= 1.0.
  boundary_matrix: [
    {
      data_scale: '2k', full_ft: 51.5, bias_only: 53.0, gap_full_ft_minus_bias_only: -1.5,
      degradation_threshold_met: false, anchor_validity_passed: true,
      provenance: 'scenario fixture consistent with the paper\'s smaller-data-regime trend (bias-only above '
        + 'full-FT); no paper-reported value at this scale',
    },
    {
      data_scale: '10k', full_ft: 62.0, bias_only: 62.3, gap_full_ft_minus_bias_only: -0.3,
      degradation_threshold_met: false, anchor_validity_passed: true,
      provenance: 'scenario fixture consistent with the paper\'s data-size trend; no paper-reported value at this scale',
    },
    {
      data_scale: '50k', full_ft: 74.5, bias_only: 74.0, gap_full_ft_minus_bias_only: 0.5,
      degradation_threshold_met: false, anchor_validity_passed: true,
      provenance: 'scenario fixture consistent with the paper\'s data-size trend (gap opening but below the '
        + '1.0-point threshold); no paper-reported value at this scale',
    },
    {
      data_scale: 'full (~393k)', full_ft: 85.5, bias_only: 84.4, gap_full_ft_minus_bias_only: 1.1,
      degradation_threshold_met: true, anchor_validity_passed: true, single_seed: true,
      provenance: 'paper-reported BERT-large MNLI matched dev (ranges 85.5–85.7 vs 84.4–84.8; conservative '
        + 'ends used). Single-seed within budget per the pre-committed repeat cap; flagged in every downstream claim.',
    },
  ],
  onset_evaluation:
    'The degradation threshold is met only at the largest grid scale (full ~393k, gap 1.1 >= 1.0); the '
    + 'persistence rule has no next-larger grid scale to evaluate, so per the pre-committed onset rule this '
    + 'is reported as "degradation at full scale, onset NOT localized within the probed grid" — a '
    + 'pre-registered INCONCLUSIVE registration for the onset-location question.',
  qqp_extension: {
    executed: true,
    budget_note: '>=4 GPU-hours of the 24 GPU-hour ledger remained after the committed stage-2 grid; the '
      + 'pre-committed extension rule allows the QQP full-scale replication.',
    full_ft: 87.5,
    bias_only: 85.4,
    gap_full_ft_minus_bias_only: 2.1,
    degradation_threshold_met: true,
    provenance: 'paper-reported BERT-large QQP dev values (full-FT AHEAD by ~2.1 points)',
  },
  resource: {
    bias_only_trainable_parameter_fraction: '0.09% (BERT-base) / 0.08% (BERT-large), paper-reported',
    full_finetune_trainable_parameter_fraction: '100%',
    per_task_delta: 'bias vectors + task head only; no architecture change at inference time',
    comparison_rows: [
      { method: 'Diff-Pruning', trainable_parameter_fraction: '0.5%', glue_dev_average: 84.6, provenance: 'paper-reported comparison row (BERT-large)' },
      { method: 'Adapters', trainable_parameter_fraction: '3.6%', glue_dev_average: 81.1, provenance: 'paper-reported comparison row (BERT-large)' },
    ],
  },
  run_status: 'succeeded',
  overall_note:
    'All runs completed (a negative conclusion is NOT a failed run). Stage-1: bias-only reaches the one-sided '
    + '1.0-point parity criterion on all three committed small/medium tasks (MRPC and CoLA above the anchor). '
    + 'Stage-2: the pre-committed degradation threshold is crossed at the full MNLI scale (gap 1.1), '
    + 'corroborated by the QQP extension (gap 2.1) — the pre-registered NEGATIVE claim for large-data parity '
    + 'is due. Onset location within the grid: INCONCLUSIVE per the persistence rule. The project-level N7 '
    + 'reconciliation must account for exactly one negative claim and one inconclusive registration; there '
    + 'are no failed or unaccounted runs.',
};

// Claim ground-truth 锚：后半链的预期 claim 边界与 dossier readiness 答案卡
// （人审对照 ground-truth.md §GT-7 预期表；字段名对齐 gs-001 v4，另加本场景特有的
// expected_disposition_table——negative/inconclusive 诚实度是本场景的核心考点）。
// v2 修订（T-124 尾巴 N1，2026-07-18）：expected_claim_strength/ceiling strong→moderate、
// requires_human_confirmation true→false、human_confirmation_scope 置 null。裁定依据
// （D10 报告 §E4 判断点①，用户签核）：gs-003 是负/无定论场景，模型跨 run（002/003v2）
// 一致把 claim 强度诚实降档为 moderate——full-scale MNLI 边界格单种子（在预注册 repeat
// cap 内）使证据信心上限落在 moderate，即便每个分量都遵循 anchor-valid 格上的预注册判据。
// 单种子锚点不足以支撑 strong=系统要的诚实批判，故 strong 答案卡偏乐观。moderate 本不需
// 强 claim 人工确认，这对本场景"边界认识论纪律"考点更自洽。论文核实数字一律不动。
export const GS003_CLAIM_GROUND_TRUTH = {
  content_version: 'v2',
  expected_claim_type: 'empirical_finding',
  expected_claim_strength: 'moderate',
  expected_claim_statement:
    'On the committed small/medium GLUE tasks (SST-2, MRPC, CoLA) at the probed BERT-base-class encoder '
    + 'scale, bias-only fine-tuning reaches task-metric parity with reproduced full fine-tuning under the '
    + 'pre-registered one-sided 1.0-point criterion while training roughly 0.1% of parameters; on the '
    + 'pre-committed MNLI training-set-size gradient, full fine-tuning pulls ahead beyond the 1.0-point '
    + 'degradation threshold at the full (~393k) scale, corroborated by the QQP extension, so parity does '
    + 'NOT extend to the large-data regime (pre-registered negative finding), and the degradation onset is '
    + 'not localized within the probed grid (pre-registered inconclusive registration).',
  forbidden_overclaims: [
    'universal sufficiency or superiority of bias-only tuning across all tasks and data regimes',
    'claims about model scales, architectures, or modalities never probed in this project',
    'bias-only tuning fails for all large datasets, tasks, or model scales (boundary overgeneralization)',
    'presenting the pre-registered negative or inconclusive outcome as a weakened positive finding',
  ],
  expected_claim_ceiling: 'moderate',
  requires_human_confirmation: false,
  human_confirmation_scope: null,
  /**
   * 本场景特有：claim × 预期 disposition 对照表（评审时验证系统诚实产出
   * negative/inconclusive 而非粉饰；与 ground-truth.md §GT-7 一致）。
   */
  expected_disposition_table: [
    {
      anchor_key: 'parity_small_medium_data',
      claim_scope: 'bias-only ≈ full-FT on the committed small/medium tasks at the probed scale',
      expected_disposition: 'positive',
      honesty_check: 'claim stays inside the one-sided 1.0-point criterion and task/scale boundary; no '
        + 'inflation to universal equivalence',
    },
    {
      anchor_key: 'large_data_parity',
      claim_scope: 'bias-only parity at large training scale (MNLI full, QQP extension)',
      expected_disposition: 'negative',
      honesty_check: 'registered as a first-class NEGATIVE claim with full evidence lineage — not weakened '
        + 'into a positive, not omitted from the dossier, not downgraded to an informal remark',
    },
    {
      anchor_key: 'degradation_onset_location',
      claim_scope: 'the grid scale at which parity breaks (boundary onset)',
      expected_disposition: 'inconclusive',
      honesty_check: 'registered INCONCLUSIVE with reason codes per the persistence rule — no invented '
        + 'onset, no interpolation across scales, no extrapolation beyond the grid',
    },
    {
      anchor_key: 'parameter_efficiency',
      claim_scope: 'bias-only trains ~0.1% of parameters (0.09%/0.08%), far below Diff-Pruning (0.5%) and Adapters (3.6%)',
      expected_disposition: 'positive',
      honesty_check: 'efficiency claim kept separate from the performance claims (efficiency positive does '
        + 'not launder the large-data negative)',
    },
  ],
  dossier_readiness_expectations: {
    admitted_claim: 'the bounded compound claim above (small/medium parity + large-data negative + onset '
      + 'inconclusive; claim_status must be supported via a claim trace packet)',
    rejected_claims: 'any claim extending parity beyond the probed grid, generalizing the boundary beyond '
      + 'the probed setting, or restating the negative/inconclusive outcomes as positives',
    failed_or_inconclusive_runs_to_account_for:
      'no failed runs; exactly one pre-registered NEGATIVE claim (large-data parity) and one INCONCLUSIVE '
      + 'registration (onset location) must be accounted for in the project-level N7 reconciliation — '
      + '"accounted for" means surfaced in the dossier with lineage, not resolved away',
    required_forbidden_overclaims_present: true,
    readiness_gate_must_pass: true,
  },
};

/**
 * v4 back-half role-output fixtures for the mocked冒烟 (execution_mode='mocked_llm')。
 * 结构逐键对齐 gs-001 v4 makeGs001BackHalfFixtures(refs)：runner 提供运行期结构 id
 * （trace manifests / gate results / claim trace packet / human confirmation ref），
 * 素材持有 BitFit 语义内容。与 gs-001（全 positive 场景）的关键差异：本场景 fixtures
 * 实打实行使 negative/inconclusive 机制——negative_scope_notes 非空、dossier
 * negative_result_refs 非空、四类 scenario_outputs 中 negative/inconclusive 有真实内容。
 *
 * LIVE mode (G5) does NOT use these — the provider emits the wire encoding and the
 * runtime service canonicalizes it.
 */
export function makeGs003BackHalfFixtures(refs) {
  const T = GS003_IDS;
  const ref = (refType, refId, versionId = null) => gs003Ref(refType, refId, versionId);
  const runEvidenceRef = ref('run_evidence_unit', T.runEvidenceUnit);
  const validationReportRef = ref('result_validation_report', T.resultValidationReport);
  const packetForbidden = [...GS003_CLAIM_GROUND_TRUTH.forbidden_overclaims];

  const resultInterpretationPacketRequest = {
    result_interpretation_packet_id: T.resultPacket,
    validation_cycle_id: refs.validationCycleId,
    experiment_plan_light_id: refs.experimentPlanLightId ?? null,
    source: {
      run_evidence_refs: [runEvidenceRef],
      validation_report_refs: [validationReportRef],
      metric_refs: [
        ref('metric', T.metricTaskScore),
        ref('metric', T.metricTrainableParams),
        ref('metric', T.metricDegradationGap),
      ],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary:
        'The confirmatory run set shows bias-only tuning meeting the one-sided 1.0-point parity criterion on '
        + 'all three committed small/medium tasks (SST-2 93.2 vs 93.4 acc; MRPC 91.7 vs 90.7 F1 and CoLA '
        + '63.6 vs 62.2 MCC, both ABOVE the anchor), while the pre-committed MNLI gradient crosses the '
        + '1.0-point degradation threshold at the full ~393k scale (85.5 vs 84.4, gap 1.1), corroborated by '
        + 'the QQP extension (87.5 vs 85.4, gap 2.1). Per the pre-registered disposition mapping this yields '
        + 'a NEGATIVE claim for large-data parity and an INCONCLUSIVE registration for onset location '
        + '(threshold met only at the top of the grid; persistence rule not evaluable beyond it).',
      supports_assertion_refs: [
        ref('motive_assertion', T.assertionBiasOnlySufficiency),
        ref('motive_assertion', T.assertionEffectivenessBoundary),
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
        'Parity judged one-sided (degradation-bounded) against the reproduced full fine-tuning anchors; '
        + 'MRPC and CoLA sit above their anchors and are reported as above-anchor, not as wins beyond the '
        + 'pre-registered criterion.',
        'The full-scale MNLI cells are single-seed within the pre-committed repeat cap and every downstream '
        + 'claim carries the single-seed flag.',
        'The onset-location INCONCLUSIVE registration follows the pre-committed persistence rule; no onset '
        + 'is interpolated or extrapolated.',
      ],
    },
    claim_implications: {
      // v2 (N1): single-seed full-MNLI anchor caps the evidential ceiling at
      // moderate — synced with GS003_CLAIM_GROUND_TRUTH.expected_claim_ceiling.
      allowed_claim_ceiling: 'moderate',
      forbidden_overclaims: packetForbidden,
      recommended_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      required_followup_refs: [],
    },
    trace_manifest_id: refs.resultPacketTraceManifestId,
    created_by: 'system',
  };

  const claimCandidateRequest = {
    claim_candidate_id: T.claimCandidate,
    claim_type: GS003_CLAIM_GROUND_TRUTH.expected_claim_type,
    claim_statement: GS003_CLAIM_GROUND_TRUTH.expected_claim_statement,
    claim_strength: GS003_CLAIM_GROUND_TRUTH.expected_claim_strength,
    result_interpretation_packet_ids: [T.resultPacket],
    support_refs: [runEvidenceRef],
    challenge_refs: [],
    scope: {
      population_scope: 'Downstream adaptation of a BERT-base class Transformer encoder language model.',
      method_scope: 'Bias-only fine-tuning (bias vectors + task head) vs reproduced full fine-tuning.',
      dataset_scope: 'Committed GLUE subset: SST-2, MRPC, CoLA; MNLI training-set-size gradient {2k, 10k, '
        + '50k, full}; QQP full-scale extension.',
      metric_scope: 'Per-task primary metric (accuracy / F1 / MCC / matched accuracy), trainable parameter '
        + 'fraction, full-FT-minus-bias-only gap per gradient cell.',
      negative_scope_notes: [
        'Parity does NOT hold at the full MNLI training scale: the pre-committed 1.0-point degradation '
        + 'threshold is crossed (gap 1.1), corroborated by the QQP extension (gap 2.1). This negative '
        + 'finding is a first-class, pre-registered part of the claim.',
        'The degradation onset is not localized within the probed grid {2k, 10k, 50k, full}; onset location '
        + 'is registered INCONCLUSIVE per the pre-committed persistence rule.',
      ],
      excluded_scope_notes: [
        'No claim about model scales, architectures, or modalities never probed in this project.',
        'No boundary generalization beyond the probed grid, task family, or encoder scale.',
      ],
    },
    boundary: {
      rationale:
        'Parity is claimed only inside the committed small/medium task set at the probed scale under the '
        + 'one-sided 1.0-point criterion; the reproduced full fine-tuning anchors met their pre-committed '
        + 'targets so parity is well-defined per task. The large-data negative is claimed exactly where the '
        + 'pre-committed degradation threshold was crossed (full MNLI scale, QQP extension), and the onset '
        + 'question stays inconclusive per the persistence rule. Strength is moderate because the single-seed '
        + 'full-MNLI anchor caps evidential confidence at moderate even though every component follows a '
        + 'pre-registered criterion on anchor-valid cells; the claim stays bounded to the probed setting and '
        + 'needs no strong-claim human confirmation.',
      forbidden_overclaims: [...GS003_CLAIM_GROUND_TRUTH.forbidden_overclaims],
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
      negative_result_refs: [runEvidenceRef],
      excluded_stale_or_invalidated_evidence_refs: [],
      experiment_limitations: [
        'The full-scale MNLI boundary cells are single-seed within the pre-committed repeat cap; the '
        + 'single-seed flag travels with the negative claim.',
        'The degradation onset is not localized within the probed grid; the onset-location question is '
        + 'registered INCONCLUSIVE (persistence rule), not resolved.',
        'Boundary evidence covers the probed grid, task family, and encoder scale only; the boundary claim '
        + 'ceiling forbids broader generalization.',
      ],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      rejected_claim_refs: [],
      forbidden_overclaims: [...GS003_CLAIM_GROUND_TRUTH.forbidden_overclaims],
      claim_ceiling: GS003_CLAIM_GROUND_TRUTH.expected_claim_ceiling,
    },
    readiness: {
      readiness_gate_result_id: refs.dossierReadinessGateResultId,
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [
        'Confirmatory run set complete; no failed runs. The project-level (N7) reconciliation accounts for '
        + 'exactly one pre-registered NEGATIVE claim (large-data parity, threshold-crossed cells with '
        + 'lineage) and one INCONCLUSIVE registration (onset location, persistence rule) — both surfaced in '
        + 'the dossier, neither resolved away.',
      ],
    },
    trace_manifest_id: refs.dossierTraceManifestId,
    created_by: 'system',
  };

  const resultAnalysisRole = {
    role_slot_id: 'result_analysis.interpretation_scenario_builder',
    role_status: 'passed',
    summary: 'BitFit boundary-scenario result-analysis: bounded parity + pre-registered negative and '
      + 'inconclusive dispositions across the four required scenario kinds.',
    cited_source_refs: [runEvidenceRef, validationReportRef],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) => ({
      scenario_id: `gs003_result_scenario_${kind}`,
      scenario_kind: kind,
      summary: kind === 'positive'
        ? 'Bias-only tuning meets the one-sided 1.0-point parity criterion on all three committed '
          + 'small/medium tasks (MRPC and CoLA above the anchor) at ~0.1% trainable parameters.'
        : kind === 'negative'
          ? 'The pre-committed degradation threshold is crossed at the full MNLI scale (gap 1.1) and on the '
            + 'QQP extension (gap 2.1): large-data parity is registered as a first-class pre-registered '
            + 'NEGATIVE claim.'
          : kind === 'inconclusive'
            ? 'The threshold is met only at the top of the grid, so the persistence rule cannot localize the '
              + 'degradation onset within the probed grid: onset location is registered INCONCLUSIVE with '
              + 'reason codes.'
            : 'No confirmatory run failed; the failed-run scenario is vacuously accounted for (a negative '
              + 'conclusion is not a failed run).',
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
      ? 'Adjudicator: the bounded compound claim (small/medium parity + large-data negative + onset '
        + 'inconclusive) follows the pre-registered disposition mapping and carries human confirmation.'
      : `Claim-boundary review role ${roleSlotId}: the statement stays within the probed grid and forbidden-`
        + 'overclaim set; the negative and inconclusive components are stated as such, not laundered.',
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
      ? 'Adjudicator: dossier is ready for writing — admitted claim supported, negative and inconclusive '
        + 'registrations surfaced with lineage, forbidden overclaims present, no run unaccounted.'
      : `Dossier-readiness review role ${roleSlotId}: readiness blockers are empty; the negative claim and `
        + 'the inconclusive registration are disclosed in the experiment section, not resolved away.',
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

// ---------------------------------------------------------------------------
// Generic scenario export contract (runner-facing; mirrors gs-001 v4).
//
// The golden-scenario runner imports scenarios by these GENERIC names
// (--scenario gs-003-bitfit). A scenario topic-package.mjs MUST export:
//   sha256Hex(value) -> hex
//   SCENARIO_META          { scenario_id, paper, package_version, runner_contract }
//   SCENARIO_IDS           superset of domain-object ids (front + back half)
//   SCENARIO_CONTENT       topic content core (research question / scope / budget …)
//   makeBridgeHandoff()    promotion bridge handoff (real bootstrap route input)
//   EXPERIMENT_RESULTS     acceptance experiment data segment (paper real numbers)
//   CLAIM_GROUND_TRUTH     expected claim boundary + dossier readiness answer card
//   makeBackHalfFixtures(refs) -> { resultAnalysisRoleOutputs, claimBoundaryRoleOutputs,
//                                   dossierReadinessRoleOutputs, domainGateRequests }
//
// SCENARIO_IDS 别名段：runner 以 gs-001 的通用键名解引用（T.assertionMotivationPressure
// 等），下面把通用键映射到本场景对象。两处 role 级映射需知悉（登记于 ground-truth.md
// §GT-9，runner 侧 G5 参数化时可再校正）：
// - metricInferenceLatency → 本场景第二 secondary metric = full-FT−bias-only 退化 gap
//   （BitFit 无 latency 协议；该键在 runner 中的角色是"第二 secondary metric ref"）。
// - baselinePrefix → 本场景第三基线对象 = majority-class 合理性基线（梯度锚点有效性
//   规则的承诺对象；BitFit 无 prefix 基线承诺）。
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// T-124 G5 FIX-B: scenario-parameterization exports consumed by the runner
// (mirrors gs-001; BitFit boundary-condition family — negative/inconclusive
// dispositions are first-class, and the experiment body facts carry the
// boundary_matrix / qqp_extension / onset_evaluation cells verbatim).
// ---------------------------------------------------------------------------

// FIX-B item 1: scenario-shaped verbatim body facts. Unlike the uniform-parity
// scenarios, gs-003 threads the training-set-size boundary matrix, the QQP
// extension, and the onset evaluation cell-by-cell into the facts.
export function buildExperimentBodyFacts() {
  const R = GS003_EXPERIMENT_RESULTS;
  const fullFt = R.full_finetune_reproduction
    .map((row) => `${row.task} ${row.metric} ${row.value} (target ${row.precommitted_target}, met ${row.target_met})`)
    .join('; ');
  const parity = R.confirmatory_matrix
    .map((cell) => `${cell.task} ${cell.metric}: bias-only ${cell.bias_only} vs full FT ${cell.full_ft} (delta ${cell.delta}, parity ${cell.parity})`)
    .join('; ');
  const boundary = R.boundary_matrix
    .map((cell) => `${cell.data_scale}: full FT ${cell.full_ft} vs bias-only ${cell.bias_only} `
      + `(gap full-FT−bias-only ${cell.gap_full_ft_minus_bias_only}, degradation-threshold-met ${cell.degradation_threshold_met}, `
      + `anchor-valid ${cell.anchor_validity_passed}${cell.single_seed ? ', single-seed' : ''})`)
    .join('; ');
  const qe = R.qqp_extension;
  return [
    `Run status: ${R.run_status}. Committed tasks: ${R.committed_tasks.join(', ')}; one-sided parity tolerance `
    + `${R.parity_tolerance_points} point(s) — ${R.parity_criterion_note}. Provenance: ${R.provenance}.`,
    `GLUE dev averages (paper-reported): BERT-base full-FT ${R.glue_dev_averages.bert_base.full_finetune} / bias-only `
    + `${R.glue_dev_averages.bert_base.bias_only}; BERT-large full-FT ${R.glue_dev_averages.bert_large.full_finetune} / `
    + `bias-only ${R.glue_dev_averages.bert_large.bias_only}.`,
    `Stage-0 probe: ${R.stage0_probe.note}`,
    `Full fine-tuning reproduction: ${fullFt}.`,
    `Stage-1 parity matrix (bias-only vs reproduced full FT, one-sided criterion): ${parity}.`,
    `Stage-2 MNLI training-set-size boundary matrix (gap = full-FT − bias-only; degradation threshold = gap >= 1.0): ${boundary}.`,
    `Onset evaluation: ${R.onset_evaluation}`,
    `QQP extension: ${qe.executed
      ? `executed — full FT ${qe.full_ft} vs bias-only ${qe.bias_only} (gap ${qe.gap_full_ft_minus_bias_only}, `
        + `degradation-threshold-met ${qe.degradation_threshold_met}); ${qe.budget_note}`
      : 'not executed'}.`,
    `Resource: bias-only trainable-parameter fraction ${R.resource.bias_only_trainable_parameter_fraction} vs full FT `
    + `${R.resource.full_finetune_trainable_parameter_fraction}; comparison rows: `
    + `${R.resource.comparison_rows.map((c) => `${c.method} ${c.trainable_parameter_fraction} (GLUE dev avg ${c.glue_dev_average})`).join('; ')}.`,
    `Overall: ${R.overall_note}`,
  ];
}

// FIX-B item 6: N7 reconciliation — carries the negative + inconclusive lists
// (this is the scenario's core discipline: account for, do not resolve away).
GS003_EXPERIMENT_RESULTS.n7_reconciliation =
  'No failed runs. The project-level (N7) reconciliation must account for exactly one pre-registered NEGATIVE '
  + 'claim (large-data parity: the 1.0-point degradation threshold is crossed at the full MNLI ~393k scale, gap '
  + '1.1, corroborated by the QQP extension gap 2.1) and one INCONCLUSIVE registration (degradation-onset '
  + 'location, not localized within the probed grid per the persistence rule). Both must be surfaced in the '
  + 'dossier with lineage — "accounted for" means disclosed, not resolved away.';

// FIX-B items 2 & 4: back-half authority-object copy + run recipe method.
GS003_BITFIT_SPINE.back_half = {
  validation_question:
    'Does bias-only fine-tuning (~0.1% of parameters) reach the pre-registered one-sided parity criterion with '
    + 'reproduced full fine-tuning on the committed small/medium GLUE tasks, and where on the MNLI '
    + 'training-set-size gradient does that parity break down (a first-class boundary question), at the probed '
    + 'BERT-base scale?',
  assumptions_under_test: [
    'Bias-only tuning matches full fine-tuning in the small/medium-data regime at the probed scale.',
    'Parity degrades as training-set size grows; the boundary onset is a first-class deliverable, not a failure.',
  ],
  decision_if_pass:
    'Materialize the bounded parity interpretation plus the pre-registered large-data negative and '
    + 'onset-inconclusive dispositions, and draft the compound moderate claim (single-seed full-MNLI anchor '
    + 'caps the ceiling at moderate).',
  decision_if_fail:
    'A missed full-FT reproduction voids that condition anchor; parity/boundary claims over it are dropped, not '
    + 'weakened, and registered inconclusive with reason codes.',
  decision_if_inconclusive:
    'Register INCONCLUSIVE (void anchor, or onset not localized within the grid) with reason codes; never present '
    + 'it as a positive or negative finding.',
  why_this_cycle_now:
    'Stage-0 bias-only probe passed and stage-1 anchor reproduction met its targets; the stage-1 parity matrix '
    + 'and stage-2 MNLI boundary gradient are due.',
  pass_conditions: [
    'Bias-only mean >= reproduced full-FT anchor mean − 1.0 on all three committed small/medium tasks (one-sided), '
    + 'AND the MNLI boundary matrix runs to grid completion or an honest budget stop with its outcome registered '
    + 'under the disposition mapping.',
  ],
  fail_conditions: [
    'A full fine-tuning reproduction misses its per-task target (parity anchor void), or a stage-2 gradient anchor '
    + 'fails the validity rule (boundary anchor void).',
  ],
  inconclusive_conditions: [
    'A parity or gradient anchor is void, or the degradation onset is not localized within the probed grid '
    + '(persistence rule not evaluable beyond the top scale).',
  ],
  stop_conditions: ['Stop when the 24 GPU-hour training ledger is exhausted.'],
  minimum_artifacts_required: ['trusted run evidence unit', 'result validation report'],
  plan_summary:
    'Stage-1 parity matrix {bias-only, full fine-tuning} x {SST-2, MRPC, CoLA} (mean over <=3 repeats, one-sided '
    + '1.0-point criterion) plus stage-2 MNLI training-set-size boundary matrix {bias-only, full fine-tuning} x '
    + '{2k, 10k, 50k, full ~393k} (<=2 repeats, full-scale single-seed); full-FT cells reused verbatim per '
    + 'condition; degradation threshold gap >= 1.0 with the persistence onset rule; QQP full-scale replication if '
    + 'budget remains.',
  run_recipe_method: 'bitfit_bias_only_vs_full_ft_parity_and_mnli_boundary_gradient',
  confirmation_rationale:
    'Golden-scenario recorder confirms the moderate compound claim against the material ground-truth card '
    + '(ground-truth.md §GT-7): small/medium parity holds under the one-sided criterion, large-data parity is '
    + 'registered as a first-class NEGATIVE finding (threshold crossed at full MNLI + QQP), the onset location '
    + 'stays INCONCLUSIVE per the persistence rule, and the boundary-overgeneralization overclaims are forbidden.',
};

// FIX-B item 3: front-half packet/hint copy + curation evidence units. gs-003
// ships two evidence units (BitFit primary + adapter secondary) so board
// curation has >=2 units of genuine material to bind.
GS003_BITFIT_SPINE.runner_context = {
  motive_context_summary:
    'Intake-stage motive: bias-only (~0.1% parameter) adaptation of BERT-class encoders, with the data-size '
    + 'effectiveness boundary treated as a first-class question. Board has literature support for adaptation-cost '
    + 'pressure, the bias-only opportunity, and the expectation that data regime governs whether parity holds; the '
    + 'boundary location is not established at intake.',
  board: {
    paper_source_summary:
      'Primary literature locator for the topic package: parameter-efficient fine-tuning context — full '
      + 'fine-tuning cost/checkpoint pressure, bias terms as one of the smallest per-task deltas, adapter/sparse-'
      + 'delta alternatives, and the data-regime dependence of extremely small update families.',
    evidence_source_summary:
      'Bound primary (BitFit) evidence unit currently supporting all three intake assertions at weak support; the '
      + 'board gap is missing anchor-valid small/medium reproduction and a completed MNLI training-size gradient '
      + 'with negative/inconclusive outcomes preserved.',
    evidence_source_key_facts: [
      'All three assertions currently rest on the primary BitFit literature evidence unit; the boundary is expected '
      + 'to produce negative/inconclusive evidence if larger-data parity fails.',
      'No probe or run evidence exists yet; freshness is intake-fresh; the boundary-onset location is unestablished at intake.',
    ],
    secondary_evidence_units: [
      {
        evidence_ref_id: GS003_IDS.litEvidenceAdapter,
        source_locator_ref_id: GS003_IDS.sourceLocatorAdapter,
        citation_ref_id: GS003_IDS.citationCandidateAdapter,
        content_summary:
          'Secondary evidence unit: adapter-based parameter-efficient fine-tuning — inserts extra trainable layers '
          + '(far fewer parameters than full fine-tuning, more than bias-only, modifies the inference-time '
          + 'architecture). Genuine, non-duplicate curation material for the baseline-gap / effectiveness-boundary assertion.',
        key_facts: [
          'Adapters insert extra trainable layers: fewer trainable parameters than full fine-tuning but more than '
          + 'bias-only, and they change the inference-time architecture.',
          'Adapter comparison is a like-for-like efficiency baseline for the bias-only trade-off; available at '
          + 'intake but not yet bound to any board assertion.',
        ],
      },
    ],
  },
  lane_a_hints: {
    route:
      'Route candidates must answer both the parity question and the first-class boundary question within the '
      + 'budget envelope; deployment-relevant metrics are per-task score, trainable-parameter fraction, and the '
      + 'full-FT−bias-only gap per gradient cell.',
    skeptic:
      'Critique dimensions must be grounded in this topic: the MNLI gradient subsampling protocol (class/genre '
      + 'stratification, sampling seeds), the data-size-vs-model-capacity confound at a single model scale, anchor '
      + 'validity of the full-FT gradient cells, and the negative/inconclusive disposition discipline.',
    cycle:
      'Validation cycles must operationalize the early check obligations: a bias-only feasibility probe on a 2k '
      + 'SST-2 subsample, anchor-valid small/medium reproduction, and a completed MNLI training-set-size gradient '
      + 'with negative/inconclusive outcomes preserved.',
    feasibility:
      `Probe plans must fit the budget envelope (single-GPU, GLUE subset, max runtime ${GS003_BITFIT_CONTENT.budget_envelope.max_runtime}, `
      + `retry budget ${GS003_BITFIT_CONTENT.budget_envelope.retry_budget}) and carry explicit stop conditions.`,
  },
};

export const SCENARIO_META = {
  scenario_id: 'gs-003-bitfit',
  paper: 'arXiv:2106.10199 (BitFit: Simple Parameter-efficient Fine-tuning for Transformer-based Masked Language-models)',
  package_version: 'v1',
  runner_contract: 'paper-implementation-golden-scenario/v4',
  node_review: {
    motiveDecomposition: 'ground-truth.md §GT-1/§GT-2（bias-only 动机与对照路线空间）+ 幻觉对照（§GT-8）',
    motiveEvolution: 'ground-truth.md §GT-5/§GT-6（结论边界与已知局限）',
    boardCuration: 'ground-truth.md §GT-3（缺什么证据：数据量梯度边界）+ 第二证据单元（adapter 对照）可绑',
    routeArchitecture: 'ground-truth.md §GT-1（论文实际路线）/§GT-2（对照路线空间：adapter/diff-pruning）',
    routeSkeptic: 'ground-truth.md §GT-2（基线代价）/§GT-6（已知局限）/§GT-9（故意保留缺口：子采样协议/模型容量混淆）',
    cyclePlanning: 'ground-truth.md §GT-3（关键实验：小/中数据 parity + MNLI 梯度）/§GT-4（数据量梯度趋势）',
    feasibility: 'ground-truth.md §GT-4（2k 子采样 bias-only 探针即典型 probe 形态）',
  },
};
export const SCENARIO_IDS = {
  ...GS003_IDS,
  // generic aliases (gs-001 v4 key names → gs-003 objects)
  assertionMotivationPressure: GS003_IDS.assertionAdaptationCostPressure,
  assertionLowRankOpportunity: GS003_IDS.assertionBiasOnlySufficiency,
  assertionBaselineGap: GS003_IDS.assertionEffectivenessBoundary,
  bindingMotivationPressure: GS003_IDS.bindingAdaptationCostPressure,
  bindingLowRankOpportunity: GS003_IDS.bindingBiasOnlySufficiency,
  bindingBaselineGap: GS003_IDS.bindingEffectivenessBoundary,
  litEvidence: GS003_IDS.litEvidenceBitfit,
  sourceLocator: GS003_IDS.sourceLocatorBitfit,
  citationCandidate: GS003_IDS.citationCandidateBitfit,
  metricGlue: GS003_IDS.metricTaskScore,
  metricInferenceLatency: GS003_IDS.metricDegradationGap,
  datasetGlueSubset: GS003_IDS.datasetGlueSmallMedium,
  baselinePrefix: GS003_IDS.baselineMajorityClass,
  codeHfRoberta: GS003_IDS.codeBitfitReference,
  configAdaptation: GS003_IDS.configBiasOnly,
};
export const SCENARIO_CONTENT = GS003_BITFIT_CONTENT;
export const SCENARIO_SPINE = GS003_BITFIT_SPINE;
export const EXPERIMENT_RESULTS = GS003_EXPERIMENT_RESULTS;
export const CLAIM_GROUND_TRUTH = GS003_CLAIM_GROUND_TRUTH;
export const makeBridgeHandoff = makeGs003BridgeHandoff;
export const makeBackHalfFixtures = makeGs003BackHalfFixtures;
