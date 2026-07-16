/**
 * GS-002 golden-scenario topic package (T-124 G2, DistilBERT / distillation family).
 *
 * 测试用选题包：形态合规的晋升选题包 bridge handoff，内容取材公开 arXiv 带代码论文
 * DistilBERT (arXiv:1910.01108, "DistilBERT, a distilled version of BERT: smaller, faster,
 * cheaper and lighter"，官方代码 huggingface/transformers examples/research_projects/distillation)。
 * 论文已知路线/实验/结论作为人审 rubric ground truth（见同目录 ground-truth.md），
 * 本文件的"晋升时点内容核"（GS002_DISTILBERT_CONTENT）只承载晋升时点可见的选题内容核
 * （研究问题/动机假设/范围边界/早期检查义务/预算包络/多目标权衡预承诺），不预置论文答案——
 * LLM 工位的产出与论文实际路线的对齐度正是人审对象。
 *
 * 形状镜像 gs-001-lora/topic-package.mjs 的 makeBridgeHandoff()（T-109 形状即真实 bootstrap
 * 路由消费的 handoff 契约），id 前缀 gs002_，hash 纪律：所有 *_hash 均为对应 payload/内容的
 * sha256 hex（64 位小写），装载时对内容/载荷现算，改内容即自洽重算，无硬编码 hash 需手动维护。
 *
 * 与 LoRA (gs-001) 的方法族差异（选型理由）：蒸馏压缩 vs PEFT。本场景的 rubric 场景特化考点是
 * **多目标权衡声明的边界纪律**——三目标（质量保留 / 体积缩减 / 推理加速）的测量协议、优先级排序、
 * 与聚合口径（宏平均掩盖逐任务退化）在晋升时点即预承诺；claim_boundary 的考点是"97% 保留"这类
 * 宏口径主张是否越界为"无能力损失"。
 *
 * === 后半链 v4 接口锚段（T-124 G1 第 4 点：runner 后半链扩展所需的实验结果 / claim ground truth 锚）===
 * **形态/字段名逐一对齐 gs-001 v4**（gs-001 v4 已落地；runner 按通用名 EXPERIMENT_RESULTS /
 * CLAIM_GROUND_TRUTH / makeBackHalfFixtures 导入，--scenario 可切换）：
 * - GS002_EXPERIMENT_RESULTS：**后半链专用**，DistilBERT 论文真实测量数字（Table 1/3）。形态镜像 gs-001
 *   （content_version / provenance / model_scale / committed_tasks / stage0_probe / full_finetune_reproduction
 *   （本场景=教师 BERT-base 复现）/ confirmatory_matrix / resource / run_status / overall_note）+ 场景特化补段
 *   （retention_floor_ratio 0.90 / paper_reference_macro_retention 0.97 / subset_macro_retention /
 *   full_glue_reference / known_degradations）。供实验 acceptance 假体产出
 *   trusted RunEvidenceUnit + result_analysis 解读。此段是**执行后**数据，晋升时点不可见——**绝不注入
 *   bridge working_copy / lane A source packets**（晋升时点内容核只含复现门槛/floors，不含论文报告值）。
 * - GS002_CLAIM_GROUND_TRUTH：claim_boundary 答案锚，字段名对齐 gs-001 v4（expected_claim_type /
 *   _strength / _statement / forbidden_overclaims / expected_claim_ceiling / requires_human_confirmation /
 *   human_confirmation_scope / dossier_readiness_expectations）+ expected_scope（ClaimCandidateScope 形）。
 * - makeGs002BackHalfFixtures(refs)：镜像 makeGs001BackHalfFixtures——三 Domain Gate 请求
 *   （ResultInterpretationPacket / ClaimCandidate / ImplementationDossier）+ 三段 role outputs。
 *   **场景差异**（多目标权衡链形态 vs gs-001 均匀 parity）：全部预承诺门通过（每任务 0.90 保留地板 /
 *   体积 -40% / 固定设备 ×1.63）→ strong 有界主张 + 四点集第 2 点人工确认；但保留**非均匀**——CoLA
 *   0.911 过地板却远低于论文 0.97 宏口径，作为**强制披露边界**穿链（unexpected_findings / claim boundary /
 *   dossier experiment_limitations），演练披露纪律而非 claim-drop。
 *
 * 自然缺陷面（诚实设计，非完美素材——留给 skeptic 有真活干，但无 gs-001 v2 那类阶段矛盾硬伤）：
 * - NG-1（权衡声明边界）：三目标中 inference_speed 目标的测量环境仅约束"同一固定 commodity 设备上
 *   teacher/student 一致"，未钉死设备类别（CPU vs GPU）——加速比对设备类别敏感，>=1.5x 的数值下限
 *   在设备类别未定时欠定。质量/体积两目标协议完整，speed 目标协议偏薄（诚实的不对称，非矛盾）。
 * - NG-2（证据覆盖）：inference-speed / capability-transfer 主张在晋升时点仅有文献级证据，无直接
 *   加速测量证据；第二条文献证据单元（task-agnostic 蒸馏机理）在 intake 未绑定，留给 board curation
 *   有料可绑（吸收 run 006/007 curation gaps 教训——避免"唯一证据已全绑→curation 必 blocked"）。
 */
import { createHash } from 'node:crypto';

export function sha256Hex(value) {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
}

export const GS002_IDS = {
  bridge: 'gs002_paper_project_bridge_001',
  workspace: 'gs002_workspace_001',
  titleCard: 'gs002_title_card_distilbert',
  topicPackage: 'gs002_topic_package_distilbert',
  promotionDecision: 'gs002_promotion_decision_001',
  humanPromotionDecision: 'gs002_human_promotion_decision_001',
  humanConfirmedDecision: 'gs002_human_confirmed_decision_001',
  commitmentProfile: 'gs002_promotion_commitment_profile_001',
  promotionGateCheck: 'gs002_promotion_gate_check_001',
  promotionInputSnapshot: 'gs002_promotion_input_snapshot_001',
  // deterministic spine
  motive: 'gs002_core_motive_001',
  motiveVersion: 'gs002_core_motive_version_001',
  assertionCompressionPressure: 'gs002_assertion_compression_pressure',
  assertionDistillationTransfer: 'gs002_assertion_distillation_transfer',
  assertionTradeoffGap: 'gs002_assertion_tradeoff_gap',
  board: 'gs002_board_version_001',
  bindingCompressionPressure: 'gs002_binding_compression_pressure',
  bindingDistillationTransfer: 'gs002_binding_distillation_transfer',
  bindingTradeoffGap: 'gs002_binding_tradeoff_gap',
  // evidence handles (topic-package sourced)
  // primary evidence unit：intake 已绑定到三条 assertion（同 gs-001 单证据形态）
  litEvidence: 'gs002_lit_evidence_distilbert_1910_01108',
  sourceLocator: 'gs002_source_locator_arxiv_1910_01108',
  citationCandidate: 'gs002_citation_distilbert_1910_01108',
  // secondary evidence unit（NG-2）：task-agnostic 蒸馏机理证据，intake **未绑定**，
  // 供 board curation 有料可绑（吸收 run 006/007 curation gaps 教训）
  litEvidenceSecondary: 'gs002_lit_evidence_task_agnostic_distillation',
  sourceLocatorSecondary: 'gs002_source_locator_distillation_kd',
  citationCandidateSecondary: 'gs002_citation_task_agnostic_distillation',
  inputSnapshot: 'gs002_input_snapshot_001',
  metricGlueMacro: 'gs002_metric_glue_subset_macro',
  metricParameterCount: 'gs002_metric_total_parameter_count',
  metricInferenceLatency: 'gs002_metric_inference_latency',
  datasetGlueSubset: 'gs002_dataset_glue_subset',
  baselineTeacherBert: 'gs002_baseline_teacher_bert_base',
  baselineTaskSpecificDistill: 'gs002_baseline_task_specific_distillation',
  baselinePruningQuantization: 'gs002_baseline_pruning_quantization',
  codeHfDistillation: 'gs002_code_hf_transformers_distillation',
  configDistillation: 'gs002_config_distillation_triple_loss',
  // acceptance-bridge targets（lane A 受理物化）
  routeCandidate: 'gs002_route_candidate_001',
  feasibilityProbe: 'gs002_feasibility_probe_001',
  humanDecisionRouteAccept: 'gs002_human_decision_route_accept',
  humanDecisionProbeAccept: 'gs002_human_decision_probe_accept',
  // --- v4 back-half (G1): work order → acceptance experiment → REU → result
  //     analysis → claim → dossier. 键名逐一对齐 gs-001 v4（runner 按通用名 --scenario 消费）。---
  validationCycle: 'gs002_validation_cycle_001',
  validationBudget: 'gs002_validation_budget_001',
  stopRule: 'gs002_stop_rule_001',
  experimentPlan: 'gs002_experiment_plan_light_001',
  workOrder: 'gs002_research_work_order_001',
  runPolicy: 'gs002_run_policy_001',
  runRecipe: 'gs002_run_recipe_001',
  externalJob: 'gs002_external_job_001',
  runEvidenceUnit: 'gs002_run_evidence_unit_001',
  experimentResult: 'gs002_experiment_result_001',
  resultValidationReport: 'gs002_result_validation_report_001',
  resultPacket: 'gs002_result_interpretation_packet_001',
  claimCandidate: 'gs002_claim_candidate_001',
  claimTracePacket: 'gs002_claim_trace_packet_001',
  humanConfirmationStrongClaim: 'gs002_human_confirmation_strong_claim_001',
  dossier: 'gs002_implementation_dossier_001',
};

/**
 * 晋升时点内容核（晋升时点可见信息，不含论文答案；阈值均为**复现门槛/floors**，非论文报告值）。
 * 运行 runner lane A / 脊柱时同一内容核灌入 slot 请求的 source_context_packets / 领域脊柱对象。
 * NB：论文真实测量数字**不在此段**——见文件尾 GS002_EXPERIMENT_RESULTS（后半链专用锚）。
 */
export const GS002_DISTILBERT_CONTENT = {
  research_question:
    'How can a large pretrained Transformer encoder language model be compressed into a substantially smaller '
    + 'and faster general-purpose student that retains most of the teacher\'s language-understanding capability '
    + 'across diverse downstream tasks, without task-specific architecture changes at inference time?',
  motive_hypothesis:
    'Knowledge distillation applied during pre-training (task-agnostic distillation) can transfer most of a '
    + 'BERT-class teacher\'s general language-understanding capability into a student encoder with substantially '
    + 'fewer parameters, yielding a single general-purpose compressed model that is faster at inference while '
    + 'staying within a small, bounded downstream-accuracy gap of the teacher.',
  scope: {
    included: [
      'Task-agnostic compression of pretrained Transformer encoder language models via knowledge distillation',
      'Natural language understanding downstream evaluation of the compressed student',
    ],
    excluded: [
      'Generation / decoder-only or encoder-decoder models and sequence-generation tasks',
      'Multimodal models and non-language modalities; training a new teacher from scratch',
    ],
    non_goals: [
      'Claims of lossless compression or of capability beyond the probed model scale and task set',
      'General claims about reasoning or reliability beyond the compression-vs-capability trade-off question',
    ],
  },
  early_check_obligations: [
    'Distillation feasibility probe (stage 0, self-contained gate): stage 0 first trains a short single-seed '
    + 'teacher (BERT-base class) SST-2 fine-tuning calibration anchor from a fixed public reference configuration '
    + 'inside stage 0, then distills a small 6-layer student on a small distillation corpus and fine-tunes it on '
    + 'SST-2. Probe pass criterion, evaluable from stage-0 outputs alone: the distilled student SST-2 accuracy is '
    + 'BOTH (a) at least the absolute floor of 88.0 accuracy points AND (b) within 2.5 accuracy points of the '
    + 'stage-0 teacher calibration anchor trained in this same stage. The stage-0 anchor is a gate reference only '
    + 'and is NOT the stage-1 formal teacher reproduction; the confirmatory matrix (stage 2) starts only after '
    + 'this probe passes.',
    'Baseline reproducibility check (stage 1): the mandatory baselines (formal teacher BERT-base reproduction on '
    + 'all committed tasks, and a full task-agnostic distillation reproduction of the 6-layer student) must meet '
    + 'their pre-committed success criteria in the baseline control checklist before comparative retention claims '
    + 'are planned; the stage-1 teacher reproduction runs are reused verbatim as the stage-2 confirmatory teacher '
    + 'cells (never re-trained in stage 2). A task-specific distillation baseline is optional and a '
    + 'pruning/quantization comparison is budget-gated.',
  ],
  budget_envelope: {
    scale: 'small-scale reproduction',
    model_scale: 'BERT-base class teacher (12-layer) distilled into a 6-layer student encoder',
    evaluation_scale: 'GLUE subset, committed task set: SST-2, MRPC, CoLA',
    max_compute: 'single GPU (<=24 GB VRAM); total training budget <=60 GPU-hours',
    max_runtime: 'PT96H',
    retry_budget: 1,
  },
  // --- G2 v1 pre-commitments（晋升时点即冻结；阈值=复现门槛，不预置论文答案）---
  content_version: 'v1',
  // 多目标权衡预承诺——本场景 rubric 场景特化考点（三目标测量协议 + 优先级排序 + 聚合口径危害披露）
  tradeoff_precommitment: {
    objectives: [
      {
        objective_id: 'quality_retention',
        priority: 1,
        gating: true,
        target:
          'Every committed task retains at least 0.90 of the reproduced teacher value (per-task retention floor), '
          + 'and the committed-subset macro is reported. The paper\'s "~97% retention" is a 9-task GLUE macro '
          + '(reference context), NOT this project\'s per-task gate: per-task retention may be non-uniform, the '
          + 'weakest committed task is always disclosed, and no result is restated as a full-GLUE 97% claim.',
        measurement_protocol:
          'Per-task retention ratio (student/teacher) gated at 0.90; median of >=3 seeds per (model, task) cell; '
          + 'the committed-subset macro-average ALSO reported. Per-task retention is always surfaced so a '
          + 'non-uniform retention is disclosed rather than hidden by the macro.',
      },
      {
        objective_id: 'model_size',
        priority: 2,
        gating: false,
        target: 'Student total parameter count is at most 60% of the teacher (i.e. >=40% parameter reduction).',
        measurement_protocol:
          'Total parameter count of the deployed inference graph (embeddings + encoder), tokenizer excluded; '
          + 'deterministic, single measurement, no seed dependence.',
      },
      {
        objective_id: 'inference_speed',
        priority: 3,
        gating: false,
        target:
          'Student median inference latency is at most teacher-latency / 1.5 (i.e. >=1.5x inference speedup) on a '
          + 'single fixed commodity inference device held constant across teacher and student.',
        // NG-1: 设备类别（CPU vs GPU）未钉死——加速比对设备类别敏感，>=1.5x 下限在设备类别未定时欠定。
        measurement_protocol:
          'Median per-request latency over 100 warmup + 1000 timed iterations, sequence length 128, on a single '
          + 'commodity inference device (CPU or GPU) held constant across teacher and student. The device class is '
          + 'NOT further pinned in this pre-commitment; only fairness (same device for both models) is guaranteed.',
      },
    ],
    priority_ordering_rule:
      'Quality retention is the gating objective: size and speed gains are only claimable as a SUCCESSFUL '
      + 'trade-off if the per-task 0.90 retention floor holds on every committed task. A size/speed win with any '
      + 'committed task below the retention floor is reported as a FAILED trade-off (dropped, not weakened, not '
      + 'reframed as partial success).',
    aggregation_hazard_disclosure:
      'Retention is reported per task AND as a committed-subset macro; per-task retention may be non-uniform and '
      + 'a high macro can hide a weak task. The weakest committed task is always surfaced as a boundary; the '
      + 'trade-off claim may NOT be stated as "no capability loss" or as uniform retention, and the macro may not '
      + 'be presented as a per-task guarantee.',
    subset_vs_full_glue_boundary:
      'The confirmatory scope is the committed 3-task subset. A broader "retains ~97% of the full GLUE benchmark" '
      + 'statement is the paper\'s 9-task result and is OUT of this project\'s confirmatory scope; the '
      + 'committed-subset macro differs from (and here sits below) the 9-task 0.97 headline, so restating the '
      + 'subset result as a full-GLUE 97% claim is an over-claim / demotes it to exploratory.',
  },
  confirmatory_budget_matrix: {
    gpu_constraint: 'single GPU, <=24 GB VRAM',
    total_training_budget:
      '<=60 GPU-hours across feasibility probe, teacher + student baseline reproduction, and confirmatory runs '
      + 'combined',
    stage_budgets: {
      stage0_feasibility_probe: '<=8 GPU-hours',
      stage1_baseline_reproduction: '<=34 GPU-hours',
      stage2_confirmatory_matrix: '<=18 GPU-hours',
    },
    stage_budget_notes:
      'Stage 0 (<=8 GPU-hours) covers BOTH the short single-seed teacher SST-2 calibration anchor and the small '
      + 'distillation + SST-2 student probe. Stage 1 (<=34 GPU-hours) is the formal teacher BERT-base reproduction '
      + 'on the committed tasks PLUS the full task-agnostic distillation of the 6-layer student. Stage 2 '
      + '(<=18 GPU-hours) covers ONLY the new student confirmatory fine-tuning runs and the latency protocol, '
      + 'because the teacher cells are reused from stage 1 rather than re-trained (see full_ft_reuse_rule).',
    // 基线复现复用 + 教师前向成本单计规则（吸收 gs-001 RF-COMP-001 预算账本可审教训，蒸馏族特化）。
    // 键名 full_ft_reuse_rule 对齐 gs-001/G1 runner 契约；本场景的"full_ft/baseline"即教师 BERT-base。
    full_ft_reuse_rule:
      'Baseline-reproduction reuse rule (here the "full_ft" baseline is the teacher BERT-base). Teacher forward '
      + 'passes over the distillation corpus are computed ONCE and cached (soft targets / hidden states stored and '
      + 'reused across all student epochs and seeds); the teacher forward cost is counted a single time against the '
      + '60 GPU-hour ledger, never re-charged per student epoch or per seed. The stage-1 formal teacher reproduction '
      + 'runs ARE the stage-2 confirmatory teacher cells: reused verbatim (same checkpoints and metrics), never '
      + 're-trained inside stage 2. The stage-0 teacher calibration anchor is a separate short single-seed run '
      + 'inside the stage-0 probe budget and is NOT reused as a stage-1/stage-2 reproduction cell.',
    confirmatory_matrix_definition:
      'Confirmatory training-task combinations are capped at 6: {6-layer distilled student, teacher BERT-base} x '
      + '{SST-2, MRPC, CoLA}. A combination is one (model, task) pair; repeats within a combination are capped '
      + 'separately below.',
    max_repeats_per_task: 3,
    hyperparameter_policy:
      'Student and teacher fine-tuning hyperparameters are fixed before stage 2 from stage-0/stage-1 settings and '
      + 'public reference configurations; no post-hoc hyperparameter search inside the confirmatory matrix.',
    // Model-capacity policy. Key name rank_policy aligns the gs-001/G1 runner contract; this scenario has no
    // low-rank hyperparameter — the slot carries the student architecture freeze instead.
    rank_policy:
      'Model-capacity policy: the confirmatory student is fixed at 6 Transformer layers initialized from the '
      + 'teacher (every other layer), with token-type embeddings and the pooler removed; there is no low-rank '
      + 'hyperparameter in this distillation scenario, and student layer counts other than 6 are exploratory only.',
    latency_protocol:
      'Inference latency is measured on a single fixed commodity device held constant across teacher and student: '
      + 'sequence length 128, 100 warmup + 1000 timed iterations, reported as median per-request latency. (See '
      + 'tradeoff_precommitment inference_speed: the device CLASS is intentionally not further pinned here.)',
    checkpoint_policy:
      'Keep the final checkpoint per run only; no best-of-many checkpoint selection for confirmatory claims.',
  },
  dataset_metric_precommitments: {
    primary_metrics_preregistered: true,
    alignment_criterion:
      'Primary retention judgement per task: the student task metric, aggregated as the MEDIAN over repeats '
      + '(repeats capped at 3 per task), is at least the per-task retention floor of 0.90 of our reproduced teacher '
      + 'value for that task (also the median over its repeats). The per-task teacher reproduction targets below '
      + 'are the comparison anchors: a task whose teacher reproduction misses its target has no usable anchor and '
      + 'its retention claim is void. NB: the paper\'s "~97% retention" is a 9-task GLUE MACRO headline (reference '
      + 'context), NOT this project\'s per-task gate; the committed-subset macro and per-task retention ratios are '
      + 'reported, not gated, against that reference number.',
    metric_aggregation: {
      rule: 'median over repeats per (model, task) cell; macro-average over committed tasks for the retention headline',
      repeat_cap_per_task: 3,
      per_task_retention_floor_ratio: 0.90,
      paper_reference_macro_retention: 0.97,
      per_task_retention_reported: true,
      // Key name parity_tolerance_points aligns the gs-001/G1 runner contract; this scenario gates on a per-task
      // RETENTION RATIO floor (0.90), not a per-point parity tolerance — the string documents that.
      parity_tolerance_points:
        'n/a as points — this scenario uses a per-task retention-ratio floor of 0.90 (student/teacher) plus a '
        + 'reported committed-subset macro; the paper 9-task 0.97 macro is reference context, not the gate',
      anchor:
        'per-task reproduced teacher median; a task whose teacher reproduction misses its target has no usable '
        + 'anchor and its retention claim is void (not weakened, not silently dropped). Per-task retention is '
        + 'always reported so any non-uniform retention is disclosed rather than hidden by the macro.',
    },
    tasks: [
      { task: 'SST-2', primary_metric: 'accuracy', full_finetune_reproduction_target: '>=91.0% accuracy' },
      { task: 'MRPC', primary_metric: 'F1', full_finetune_reproduction_target: '>=87.0 F1' },
      { task: 'CoLA', primary_metric: 'Matthews correlation coefficient', full_finetune_reproduction_target: '>=52.0 MCC' },
    ],
    secondary_metrics: [
      'total parameter count (student vs teacher)',
      'median inference latency under the committed latency protocol',
      'per-task retention ratio (student metric / reproduced teacher metric)',
    ],
  },
  baseline_control_checklist: [
    {
      baseline: 'teacher BERT-base reproduction',
      obligation: 'mandatory reproduction',
      success_criterion: 'meets the per-task teacher reproduction targets on all three committed tasks',
      on_failure:
        'retention claims are void for any task whose teacher reproduction misses its target; reported as a '
        + 'reproduction failure, never silently dropped',
    },
    {
      baseline: 'full task-agnostic distillation of the 6-layer student',
      obligation: 'mandatory',
      success_criterion:
        'the distilled student reaches the stage-0 probe floor and the committed subset macro retention floor '
        + 'against the reproduced teacher; distillation loss components (MLM + distillation KL + cosine embedding) '
        + 'are reported',
      on_failure:
        'the compression trade-off claim is dropped (not weakened); the distillation-reproduction failure and its '
        + 'reason are reported',
    },
    {
      baseline: 'task-specific distillation (e.g. distilling a task-fine-tuned teacher directly)',
      obligation: 'optional',
      success_criterion: 'if run: committed-subset macro within 1.0 point of the task-agnostic student',
      on_failure: 'omitted from claims; the omission itself is reported',
    },
    {
      baseline: 'pruning / quantization compression comparison',
      obligation: 'run only if >=10 GPU-hours of the total training budget remain after stage 2',
      success_criterion:
        'if run: reports the same three trade-off objectives (quality retention, size, latency) under the same '
        + 'protocols so the comparison is like-for-like',
      on_failure: 'reported as budget-excluded or not-reproduced; no comparative claim is made against it',
    },
  ],
  baseline_claim_control_rule:
    'Failed baseline reproduction DROPS the affected comparative/trade-off claim (a per-task teacher retention '
    + 'claim, or the overall compression trade-off claim) rather than weakening, reinterpreting, or silently '
    + 'omitting it; the drop and its reason are always reported. Retention claims against the teacher stay void '
    + 'for any task whose teacher reproduction misses its pre-committed target. A committed task below the 0.90 '
    + 'retention floor makes the trade-off FAILED for that scope (claim dropped, not weakened); a floor-passing '
    + 'but non-uniform per-task retention is disclosed as a boundary, never averaged away by the macro.',
  reference_implementation: {
    note:
      'Public reference implementation available at promotion time as intake context (matches the arXiv basis of '
      + 'this topic package). Route/skeptic MAY cite it as the code/config traceability anchor for the '
      + 'distillation objective (triple loss), student initialization from the teacher, corpus/tokenizer choice, '
      + 'seed handling, checkpoint policy, and the latency serving stack.',
    code_reference:
      'Official Hugging Face Transformers distillation example (examples/research_projects/distillation): '
      + 'task-agnostic distillation of a 6-layer student from a BERT-base teacher.',
    config_reference:
      'DistilBERT reference hyperparameters: 6 Transformer layers initialized from the teacher (every other '
      + 'layer), token-type embeddings and pooler removed, triple training loss (masked-LM + distillation KL '
      + 'divergence with temperature + cosine-embedding loss), same tokenizer as the teacher.',
    known_gap:
      'Project-specific code_version and config artifacts do not exist at promotion time and remain a known, '
      + 'honestly-declared route-planning gap until stage-0 execution produces them; this pointer is reference '
      + 'material, not a project-owned artifact.',
  },
  staged_route_dependency: {
    stage0_gate:
      'Feasibility probe pass criterion (self-contained, evaluable from stage-0 outputs alone): stage 0 trains a '
      + 'short single-seed teacher SST-2 calibration anchor and distills + fine-tunes a small 6-layer student on '
      + 'SST-2; the probe passes iff the student SST-2 accuracy is BOTH >= 88.0 absolute accuracy points AND '
      + 'within 2.5 accuracy points of that stage-0 teacher calibration anchor. The confirmatory matrix (stage 2) '
      + 'starts only after this gate passes. No stage-1 result is required to evaluate the stage-0 gate.',
    baseline_gate:
      'Confirmatory retention claims additionally require the mandatory stage-1 baselines (formal teacher '
      + 'reproduction to targets, full task-agnostic distillation of the student) to meet their pre-committed '
      + 'success criteria; the stage-1 teacher reproduction runs are reused verbatim as the stage-2 confirmatory '
      + 'teacher cells.',
    confirmatory_exploratory_boundary:
      'Confirmatory = the pre-registered 6-combination matrix, tasks, metrics, retention floor, and the three '
      + 'trade-off objectives above, frozen before stage 2 begins. Anything learned in stage 0/1 (probe results, '
      + 'baseline reproduction) may abort or shrink the confirmatory plan but may not add, swap, or reweight '
      + 'confirmatory comparisons post hoc; any such change demotes the affected claim to exploratory.',
  },
  literature_context_key_facts: [
    'Large pretrained Transformer language models are increasingly expensive to run at inference and to deploy '
    + 'under latency or memory constraints, motivating general-purpose compression.',
    'Knowledge distillation trains a smaller student to reproduce a larger teacher\'s output distribution, which '
    + 'can carry more information than hard labels alone (soft targets over a temperature).',
    'Task-specific distillation compresses a model for one downstream task, whereas task-agnostic distillation '
    + 'during pre-training aims at a single general-purpose compressed encoder reusable across tasks.',
    'Alternative compression routes (structured pruning, weight quantization) reduce size or latency but trade '
    + 'off differently on the quality/size/speed axes and may need task-specific tuning.',
  ],
  // 第二条文献证据的内容核（NG-2：intake 未绑定，供 board curation 有料可绑）
  secondary_literature_context_key_facts: [
    'Task-agnostic distillation applied during pre-training can produce one general-purpose compressed encoder, '
    + 'rather than a separate compressed model per downstream task.',
    'A combined distillation objective (masked-LM + soft-target KL divergence + cosine-embedding alignment) and '
    + 'initializing the student from a subset of the teacher\'s layers are reported to matter for transfer '
    + 'quality — this evidence is available at intake but not yet bound to any board assertion.',
  ],
  // intake 绑定计划（供 runner 领域播种参考：primary 全绑，secondary 未绑→curation 可绑）
  intake_binding_plan: {
    primary_evidence_bound_to: [
      'gs002_assertion_compression_pressure',
      'gs002_assertion_distillation_transfer',
      'gs002_assertion_tradeoff_gap',
    ],
    secondary_evidence_bound_to: [],
    curation_bindable_note:
      'The secondary evidence unit (task-agnostic distillation mechanism) is unbound at intake and is genuine, '
      + 'non-duplicate material for board curation to bind to the distillation-transfer assertion; additionally '
      + 'the inference-speed / capability-transfer facet has only literature-level support at intake and no direct '
      + 'measurement evidence — a real board gap for curation to name.',
  },
};

const GS002_DISTILBERT_SPINE = {
  motive_short_name: 'Task-agnostic distillation of pretrained Transformer encoders',
  motive_contract: {
    problem_pressure:
      'Large pretrained Transformer encoders deliver strong language-understanding performance but are expensive '
      + 'to deploy in parameter count, memory footprint, and inference latency.',
    current_solution_insufficiency:
      'Using the teacher model unchanged preserves quality but not deployment cost; pruning, quantization, and '
      + 'task-specific distillation each solve only part of the quality/size/speed trade-off.',
    unmet_or_failure_mechanism:
      'No compression route yet provides a single reusable general-purpose encoder that is substantially smaller '
      + 'and faster while retaining most teacher capability across downstream NLU tasks.',
    target_setting: 'Task-agnostic compression of BERT-class Transformer encoders for GLUE-style NLU evaluation.',
    expected_contribution_path:
      'If teacher knowledge can be transferred during pre-training with distillation losses, a 6-layer student '
      + 'should preserve most of the teacher representation quality while reducing deployed model cost.',
    why_this_is_not_trivial:
      'It is not obvious that removing substantial encoder capacity and training from teacher signals preserves '
      + 'general downstream transfer rather than only a narrow task-specific behavior.',
    why_existing_baselines_do_not_already_solve_it:
      'Pruning and quantization require separate trade-off controls, and task-specific distillation produces a '
      + 'compressed model for one task rather than a reusable pretrained student.',
    what_makes_this_researchable_now:
      'Public BERT checkpoints, standard GLUE tasks, and established distillation losses make a bounded '
      + 'quality/size/speed reproduction feasible under a single-GPU budget.',
  },
  falsification_contract: {
    invalidation_conditions: [
      'The distilled student fails the pre-committed teacher-retention floor on committed tasks despite achieving '
      + 'the intended size or latency reduction.',
    ],
    weakening_conditions: [
      'The student retains teacher quality only on easier tasks, or the speedup depends strongly on an unpinned '
      + 'device class.',
    ],
    minimum_evidence_to_continue: [
      'At least one representative task where a distilled student stays close to the teacher while reducing '
      + 'deployed model size.',
    ],
    decisive_negative_conditions: [
      'A task-agnostic student cannot meet the retention floor without giving up the material size or latency '
      + 'advantage over the teacher.',
    ],
  },
  claim_boundary: {
    maximum_allowed_claim:
      'A DistilBERT-style task-agnostic student retains most teacher performance within the probed GLUE setting '
      + 'while being materially smaller and faster under the committed measurement protocol.',
    minimum_defensible_contribution_claim:
      'A measured characterization of the quality/size/speed trade-off for task-agnostic BERT distillation.',
    forbidden_overclaims: [
      'Lossless compression or no capability loss',
      'Restating a committed-subset result as a full 9-task GLUE retention claim',
      'Claims about generation tasks, model scales, or device classes never probed',
    ],
    claim_types_allowed: ['analysis_claim'],
  },
  assertions: {
    motivation_pressure: {
      assertion_type: 'motivation_pressure',
      assertion_text:
        'Inference cost, model size, and latency of large pretrained Transformer encoders are binding constraints '
        + 'for practical downstream deployment.',
      must_hold: true,
      contradict: ['Deployment evidence showing BERT-class encoder size and latency are negligible in target use.'],
      weaken: ['The cost pressure applies only to a narrow deployment environment or only to much larger models.'],
      decomposition_scope_summary:
        'Cost pressure applies to deployment of BERT-class pretrained encoder models for downstream NLU tasks; '
        + 'no generation, decoder-only, or multimodal scope.',
    },
    technical_opportunity: {
      assertion_type: 'technical_opportunity',
      assertion_text:
        'Task-agnostic knowledge distillation can transfer most teacher capability into a smaller student: the '
        + 'paper setting targets a 6-layer student retaining about 97% of GLUE macro performance while being '
        + 'roughly 40% smaller and substantially faster.',
      must_hold: true,
      contradict: ['A distilled student consistently loses unacceptable downstream quality at the intended size.'],
      weaken: ['Retention is high only in aggregate while one committed task degrades materially.'],
      decomposition_scope_summary:
        'The distillation opportunity targets a 6-layer BERT-class student distilled from a teacher before '
        + 'downstream fine-tuning, with quality judged on the committed GLUE subset.',
    },
    baseline_gap: {
      assertion_type: 'baseline_gap',
      assertion_text:
        'Existing compression baselines leave a general-purpose pretrain-distillation gap: pruning and '
        + 'quantization address size or latency differently, while task-specific distillation does not yield a '
        + 'single reusable compressed encoder.',
      must_hold: false,
      contradict: ['A like-for-like baseline already provides a reusable compressed encoder with the same quality/size/speed trade-off.'],
      weaken: ['The gap is mainly a measurement-protocol difference rather than a substantive compression limitation.'],
      decomposition_scope_summary:
        'Baseline gap covers teacher BERT-base, task-specific distillation, and pruning/quantization comparisons '
        + 'under the project quality/size/speed budget.',
    },
  },
  board: {
    binding_dataset_scope: 'Pretrained Transformer encoder compression and distillation literature',
    summary: {
      current_support_summary:
        'Topic-package literature supports the deployment-cost pressure and the task-agnostic distillation route; '
        + 'direct project measurements for speed and per-task retention are still pending.',
      current_challenge_summary: 'No direct counter-evidence recorded at intake.',
      board_gap_summary:
        'The distillation-transfer assertion needs a direct reproduction under the committed GLUE subset, and '
        + 'the baseline-gap assertion needs like-for-like compression baselines under the same trade-off protocol.',
      next_evidence_needed: [
        'Distillation feasibility probe for a 6-layer student against a teacher BERT-base anchor.',
        'Teacher/student GLUE retention, parameter-count, and fixed-device latency measurements.',
      ],
    },
    bindings: {
      motivation_pressure: {
        statement:
          'Prior work motivates compressing large pretrained encoders because teacher-sized models are costly for '
          + 'latency-sensitive or memory-constrained deployment.',
        relevance: 'Directly supports the deployment-cost motivation.',
        limitation: 'Evidence is literature-level; project-specific latency and memory costs are not measured at intake.',
      },
      technical_opportunity: {
        statement:
          'Prior work reports that a distilled 6-layer student can retain most BERT-base GLUE performance while '
          + 'reducing parameter count and improving inference speed.',
        relevance: 'Directly supports the task-agnostic distillation opportunity.',
        limitation: 'The headline retention is aggregate; per-task retention and device-sensitive speed still need reproduction.',
      },
      baseline_gap: {
        statement:
          'Prior compression routes include pruning, quantization, and task-specific distillation, but they do not '
          + 'settle the reusable pre-trained-student trade-off under one protocol.',
        relevance: 'Supports the claim that the baseline landscape leaves a general-purpose distillation gap.',
        limitation: 'Comparability depends on reproducing each baseline under the same metric and latency protocol.',
      },
    },
  },
  claim_trace_scope: {
    dataset_scope: 'Committed GLUE subset: SST-2, MRPC, CoLA.',
    task_scope: 'Task-agnostic compression of a BERT-base class encoder for downstream NLU tasks.',
    baseline_scope: 'Reproduced teacher BERT-base, task-specific distillation, and pruning/quantization comparisons as budget allows.',
    method_scope: 'DistilBERT-style 6-layer student trained by task-agnostic knowledge distillation.',
    evaluation_scope: 'GLUE macro and per-task metrics, total parameter count, and fixed-device inference latency.',
  },
};

export function gs002Ref(refType, refId, versionId = null) {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: GS002_IDS.titleCard,
    version_id: versionId,
  };
}

const CREATED_AT = '2026-07-16T00:00:00.000Z';

/**
 * 完整 bridge handoff（镜像 gs-001 makeGs001BridgeHandoff() 的形状与字段集合）。
 * hash 纪律：working_copy_payload_hash = sha256(working copy)；bridge_payload_hash =
 * sha256(去掉自身 hash 字段的 bridge 载荷)；snapshot_hashes 为内容 sha256。
 * NB：working_copy 只承载晋升时点可见内容核（floors / 权衡预承诺），不含 GS002_EXPERIMENT_RESULTS。
 */
export function makeGs002BridgeHandoff() {
  const c = GS002_DISTILBERT_CONTENT;
  const sourceRefs = [
    gs002Ref('topic_package', GS002_IDS.topicPackage, 'v1'),
    gs002Ref('evidence_unit', GS002_IDS.litEvidence),
    gs002Ref('source_locator', GS002_IDS.sourceLocator),
  ];
  const workingCopy = {
    editable_title:
      'Task-agnostic compression of pretrained Transformer encoders via knowledge distillation, under an explicit '
      + 'quality/size/speed trade-off pre-commitment',
    problem_statement: c.research_question,
    contribution_summary: c.motive_hypothesis,
    evaluation_plan:
      `Small-scale reproduction: ${c.budget_envelope.model_scale} on a ${c.budget_envelope.evaluation_scale}. `
      + `Multi-objective trade-off pre-commitment (priority-ordered): ${c.tradeoff_precommitment.objectives
        .map((o) => `[${o.priority}] ${o.objective_id}${o.gating ? ' (gating)' : ''}: ${o.target}`)
        .join('; ')}. `
      + `Priority rule: ${c.tradeoff_precommitment.priority_ordering_rule} `
      + `Aggregation hazard: ${c.tradeoff_precommitment.aggregation_hazard_disclosure} `
      + `Subset vs full GLUE: ${c.tradeoff_precommitment.subset_vs_full_glue_boundary} `
      + `Pre-registered retention criterion: ${c.dataset_metric_precommitments.alignment_criterion} `
      + `Per-task pre-commitments: ${c.dataset_metric_precommitments.tasks
        .map((t) => `${t.task} (${t.primary_metric}, teacher reproduction target ${t.teacher_reproduction_target})`)
        .join('; ')}. `
      + `Secondary metrics: ${c.dataset_metric_precommitments.secondary_metrics.join(', ')}. `
      + `${c.confirmatory_budget_matrix.confirmatory_matrix_definition} `
      + `Staged execution: ${c.staged_route_dependency.stage0_gate} ${c.staged_route_dependency.baseline_gate}`,
    initial_planning_notes: [
      `Included scope: ${c.scope.included.join('; ')}`,
      `Excluded scope: ${c.scope.excluded.join('; ')}`,
      `Non-goals: ${c.scope.non_goals.join('; ')}`,
      `Budget envelope: ${c.budget_envelope.scale}, ${c.budget_envelope.max_compute}, max runtime ${c.budget_envelope.max_runtime}`,
      `Trade-off objectives (pre-committed, priority-ordered): ${c.tradeoff_precommitment.objectives
        .map((o) => `[${o.priority}] ${o.objective_id}${o.gating ? ' (gating)' : ''} target: ${o.target} `
          + `measurement: ${o.measurement_protocol}`)
        .join(' | ')}. Priority ordering rule: ${c.tradeoff_precommitment.priority_ordering_rule} `
        + `Aggregation hazard disclosure: ${c.tradeoff_precommitment.aggregation_hazard_disclosure} `
        + `Subset vs full GLUE boundary: ${c.tradeoff_precommitment.subset_vs_full_glue_boundary}`,
      `Confirmatory budget matrix: ${c.confirmatory_budget_matrix.gpu_constraint}; `
      + `${c.confirmatory_budget_matrix.total_training_budget}; stage budgets: `
      + `probe ${c.confirmatory_budget_matrix.stage_budgets.stage0_feasibility_probe}, `
      + `baseline reproduction ${c.confirmatory_budget_matrix.stage_budgets.stage1_baseline_reproduction}, `
      + `confirmatory ${c.confirmatory_budget_matrix.stage_budgets.stage2_confirmatory_matrix}; `
      + `max ${c.confirmatory_budget_matrix.max_repeats_per_task} repeats per task. `
      + `${c.confirmatory_budget_matrix.full_ft_reuse_rule} ${c.confirmatory_budget_matrix.hyperparameter_policy} `
      + `${c.confirmatory_budget_matrix.rank_policy} `
      + `Latency protocol: ${c.confirmatory_budget_matrix.latency_protocol} `
      + `Checkpoint policy: ${c.confirmatory_budget_matrix.checkpoint_policy}`,
      `Baseline control checklist: ${c.baseline_control_checklist
        .map((b) => `${b.baseline} [${b.obligation}] success: ${b.success_criterion}; on failure: ${b.on_failure}`)
        .join(' | ')}`,
      `Confirmatory/exploratory boundary: ${c.staged_route_dependency.confirmatory_exploratory_boundary}`,
    ],
    claim_ceiling:
      'Claims are bounded to task-agnostic compression of Transformer encoder language models within the probed '
      + 'model scale and committed task subset; no lossless-compression, generation-task, or broad capability '
      + 'claims, and the subset retention result may not be restated as a full-GLUE result.',
    prohibited_claims: [
      'Lossless or "no capability loss" compression claims',
      'Claims about model scales, task families, or modalities never probed in this project',
      'Restating the committed-subset retention as a full 9-task GLUE retention claim',
    ],
    conditions: [],
    accepted_risk_refs: [],
    early_check_obligations: [...c.early_check_obligations],
    source_lineage_summary: {
      topic_package_id: GS002_IDS.topicPackage,
      source_paper: 'arXiv:1910.01108 (content basis for this test topic package)',
    },
  };
  const workingCopyPayloadHash = sha256Hex(workingCopy);
  const snapshotHashes = {
    bundle_hash: sha256Hex({ kind: 'gs002_bundle', source_refs: sourceRefs }),
    package_snapshot_hash: sha256Hex({ kind: 'gs002_package_snapshot', content: c }),
    package_draft_input_snapshot_hash: sha256Hex({ kind: 'gs002_package_draft_input_snapshot', content: c.research_question }),
    promotion_input_snapshot_hash: sha256Hex({ kind: 'gs002_promotion_input_snapshot', id: GS002_IDS.promotionInputSnapshot }),
  };
  const bridgeSansHash = {
    paper_project_bridge_id: GS002_IDS.bridge,
    bridge_status: 'active',
    workspace_id: GS002_IDS.workspace,
    title_card_id: GS002_IDS.titleCard,
    source_promotion_decision_id: GS002_IDS.promotionDecision,
    source_promotion_decision_ref: gs002Ref('promotion_decision', GS002_IDS.promotionDecision),
    human_promotion_decision_ref: gs002Ref('human_promotion_decision', GS002_IDS.humanPromotionDecision),
    human_confirmed_decision_ref: gs002Ref('human_confirmed_decision', GS002_IDS.humanConfirmedDecision),
    promotion_commitment_profile_id: GS002_IDS.commitmentProfile,
    promotion_commitment_profile_ref: gs002Ref('promotion_commitment_profile', GS002_IDS.commitmentProfile),
    promotion_gate_check_ref: gs002Ref('promotion_gate_check', GS002_IDS.promotionGateCheck),
    promotion_input_snapshot_id: GS002_IDS.promotionInputSnapshot,
    promotion_input_snapshot_ref: gs002Ref('promotion_input_snapshot', GS002_IDS.promotionInputSnapshot),
    promotion_input_snapshot_hash: snapshotHashes.promotion_input_snapshot_hash,
    topic_package_id: GS002_IDS.topicPackage,
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
    policy_version_id: 'gs002_policy_v1',
    created_by: 'system',
    created_at: CREATED_AT,
  };
  const bridgePayloadHash = sha256Hex(bridgeSansHash);
  const bridge = { ...bridgeSansHash, bridge_payload_hash: bridgePayloadHash };
  return {
    paper_project_bridge_id: bridge.paper_project_bridge_id,
    paper_project_bridge_ref: gs002Ref('paper_project_bridge', bridge.paper_project_bridge_id, bridge.bridge_payload_hash),
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
// v4 back-half (G1): experiment_results data segment + claim ground-truth anchor
// + makeGs002BackHalfFixtures. Shape/field-names aligned to gs-001 v4 so the
// parameterized runner imports EXPERIMENT_RESULTS / CLAIM_GROUND_TRUTH /
// makeBackHalfFixtures by generic name (--scenario switchable).
//
// Numbers are DistilBERT's REAL reported values (arXiv:1910.01108, Table 1 GLUE
// dev + Table 3 size/speed) for the committed task set SST-2 / MRPC / CoLA. They
// are the ground-truth basis the acceptance假体实验 feeds through the product
// acceptance channel (harness-run + run-monitor-intake → trusted RunEvidenceUnit)
// — no provider call is faked; experiments do not call an LLM. Promotion-time
// visible content (GS002_DISTILBERT_CONTENT / bridge working_copy) carries only
// reproduction floors; this段 carries the paper reported values and is NEVER
// injected into lane A.
//
// Scenario contrast vs gs-001 (clean uniform parity): gs-002 is the MULTI-
// OBJECTIVE TRADE-OFF chain shape. All pre-committed gates pass (per-task 0.90
// retention floor on every committed task, ~40% size reduction, ~1.63x fixed-
// device speedup) so the claim is a bounded STRONG empirical finding with the
// four-point-set #2 human-confirmation stop — but retention is NON-UNIFORM:
// CoLA (0.911) passes the floor while sitting far below the paper's 0.97
// nine-task macro headline. The claim-boundary exercise is the DISCLOSURE
// discipline: the strong claim must carry the CoLA non-uniformity and the
// fixed-device speedup condition, and may never be restated as uniform / "no
// capability loss" / full-GLUE-97% retention (ground-truth.md GT-7 design-
// intent note).
// ---------------------------------------------------------------------------
export const GS002_EXPERIMENT_RESULTS = {
  content_version: 'v1',
  provenance:
    'arXiv:1910.01108 Table 1 (GLUE dev) & Table 3 (size/speed), reproduced as this test scenario\'s acceptance '
    + 'experiment result set.',
  model_scale: 'BERT-base teacher (~110M) distilled into a 6-layer student (~66M)',
  committed_tasks: ['SST-2', 'MRPC', 'CoLA'],
  // Per-task retention-ratio floor is THE pre-committed gate; the paper's 0.97 is a
  // 9-task macro headline kept as reference context only (never a per-task gate).
  retention_floor_ratio: 0.90,
  paper_reference_macro_retention: 0.97,
  // stage-0 self-contained gate outcome (from the v1 early_check_obligations).
  stage0_probe: {
    calibration_anchor_sst2_teacher_accuracy: 92.7,
    student_sst2_accuracy: 91.3,
    absolute_floor: 88.0,
    within_anchor_tolerance_points: 2.5,
    passed: true,
    note: 'Distilled student SST-2 91.3 is >= 88.0 absolute AND within 2.5 of the stage-0 teacher calibration '
      + 'anchor 92.7 (delta 1.4) — the self-contained stage-0 gate passes; the confirmatory matrix starts.',
  },
  // stage-1 baseline reproduction to the pre-committed targets. Key name
  // full_finetune_reproduction aligns the gs-001/G1 runner contract; in this
  // distillation scenario the "full fine-tuning" baseline IS the teacher BERT-base.
  full_finetune_reproduction: [
    { task: 'SST-2', metric: 'accuracy', value: 92.7, precommitted_target: '>=91.0', target_met: true },
    { task: 'MRPC', metric: 'F1', value: 88.6, precommitted_target: '>=87.0', target_met: true },
    { task: 'CoLA', metric: 'Matthews correlation coefficient', value: 56.3, precommitted_target: '>=52.0', target_met: true },
  ],
  // stage-2 confirmatory matrix: 6-layer distilled student vs reproduced teacher, median over repeats.
  // retention_ratio = student / teacher; retention_met = ratio >= retention_floor_ratio (0.90) — ALL PASS.
  // within_uniform_target_097 is a DISCLOSURE flag against the paper's 0.97 macro headline (not a gate):
  // CoLA passes the floor yet is far below uniform-0.97 — the non-uniformity the claim must disclose.
  confirmatory_matrix: [
    { task: 'SST-2', metric: 'accuracy', student: 91.3, teacher: 92.7, retention_ratio: 0.9849, retention_met: true, within_uniform_target_097: true },
    { task: 'MRPC', metric: 'F1', student: 87.5, teacher: 88.6, retention_ratio: 0.9876, retention_met: true, within_uniform_target_097: true },
    { task: 'CoLA', metric: 'Matthews correlation coefficient', student: 51.3, teacher: 56.3, retention_ratio: 0.9112, retention_met: true, within_uniform_target_097: false },
  ],
  // committed-subset macro retention vs the paper 9-task headline (claim-boundary signal; reported, not gated).
  subset_macro_retention: {
    teacher_macro: 79.20,
    student_macro: 76.70,
    retention_ratio: 0.9684,
    gated: false,
    note: 'Committed-subset macro (0.968) is reported, not gated. It sits below the paper 9-task 0.97 headline '
      + '(0.969), dragged by CoLA — restating the subset macro (or any per-task value) as "97% retention" is a '
      + 'claim-boundary violation.',
  },
  // paper 9-task GLUE dev reference (Table 1) — ground-truth cross-check, OUT of confirmatory scope.
  full_glue_reference: {
    aggregation: 'GLUE dev macro-average over 9 tasks',
    macro: { elmo: 68.7, bert_base: 79.5, distilbert: 77.0 },
    per_task: {
      CoLA: { bert_base: 56.3, distilbert: 51.3 },
      MNLI: { bert_base: 86.7, distilbert: 82.2 },
      MRPC: { bert_base: 88.6, distilbert: 87.5 },
      QNLI: { bert_base: 91.8, distilbert: 89.2 },
      QQP: { bert_base: 89.6, distilbert: 88.5 },
      RTE: { bert_base: 69.3, distilbert: 59.9 },
      'SST-2': { bert_base: 92.7, distilbert: 91.3 },
      'STS-B': { bert_base: 89.0, distilbert: 86.9 },
      WNLI: { bert_base: 53.5, distilbert: 56.3 },
    },
    headline_retention_ratio: 0.9686,
  },
  resource: {
    teacher_parameters: '~110M',
    student_parameters: '~66M',
    parameter_reduction: '~40% fewer parameters (66M of 110M)',
    inference_speedup:
      '~1.63x faster on a single fixed commodity device (paper: 668s -> 410s, CPU, batch 1); device-class sensitive',
  },
  // known per-task non-uniformities (fed to result-analysis unexpected_findings / boundary disclosure).
  known_degradations: [
    { task: 'CoLA', teacher: 56.3, student: 51.3, absolute_drop: 5.0, below_floor: false, within_uniform_target_097: false,
      note: 'Committed task; retention 0.911 PASSES the 0.90 floor but sits far below the paper 0.97 macro '
        + 'headline — a material non-uniformity the claim must disclose as a boundary (not averaged away).' },
    { task: 'RTE (reference, not committed)', teacher: 69.3, student: 59.9, absolute_drop: 9.4, below_floor: null, within_uniform_target_097: false,
      note: 'Largest overall GLUE degradation; reference context only (outside the committed subset and its gates).' },
  ],
  run_status: 'succeeded',
  overall_note:
    'Confirmatory: the multi-objective trade-off SUCCEEDS per the pre-commitment — every committed task passes the '
    + '0.90 per-task retention floor (SST-2 0.985, MRPC 0.988, CoLA 0.911), the size target is met (~40% fewer '
    + 'params) and the speed target is met (~1.63x on the fixed device). Retention is NON-UNIFORM: CoLA sits far '
    + 'below the paper 0.97 nine-task macro headline and the committed-subset macro (0.968) is likewise below it. '
    + 'No failed / inconclusive / negative run in this scenario, so the project-level N7 reconciliation has '
    + 'nothing outstanding — the claim-discipline exercise is the DISCLOSURE: the strong bounded claim must carry '
    + 'the CoLA non-uniformity and the fixed-device speedup condition, and may never be restated as uniform / '
    + '"no capability loss" / full-GLUE-97% retention.',
};

// Claim ground-truth anchor: expected claim boundary + dossier readiness answer
// card for the back half (human rubric §GT-7 in ground-truth.md). Field names
// aligned to gs-001 v4 (expected_claim_type / _strength / _statement /
// forbidden_overclaims / expected_claim_ceiling / requires_human_confirmation /
// human_confirmation_scope / dossier_readiness_expectations).
export const GS002_CLAIM_GROUND_TRUTH = {
  content_version: 'v1',
  expected_claim_type: 'empirical_finding',
  // STRONG but bounded: every pre-committed gate passes (per-task 0.90 retention floor on all committed tasks,
  // size, fixed-device speed), so the bounded trade-off finding supports strong — WITH the mandatory boundary
  // disclosures (CoLA non-uniformity, fixed-device speed condition) and the four-point-set #2 human confirmation.
  // Deliberately bounded: no "lossless", "no capability loss", "matches the teacher", "97%" restatement,
  // "universal", "all tasks" — those are the forbidden overclaims the boundary gate would (correctly) block.
  expected_claim_strength: 'strong',
  expected_claim_statement:
    'On the committed GLUE subset (SST-2, MRPC, CoLA) at BERT-base scale, task-agnostic knowledge distillation '
    + 'into a 6-layer student reduces parameters by about 40% and speeds up inference about 1.6x on a single '
    + 'fixed device, while every committed task retains at least 0.90 of the reproduced teacher value — with '
    + 'non-uniform retention across tasks: CoLA retains only about 0.91 versus about 0.99 on SST-2 and MRPC, so '
    + 'the retention is a bounded, task-dependent trade-off, not uniform capability preservation.',
  forbidden_overclaims: [
    'lossless compression or "no capability loss" or "matches the teacher"',
    'restating the committed-subset result as full 9-task GLUE "97% retention"',
    'a universal speedup number stated without the fixed-device measurement condition',
    'extending the retention claim to generation tasks or to model scales / modalities never probed',
    'general superiority over alternative compression routes (pruning / quantization) without a like-for-like '
    + 'three-objective comparison',
  ],
  expected_claim_ceiling: 'strong',
  requires_human_confirmation: true,
  human_confirmation_scope: 'strong_claim_acceptance',
  // ClaimCandidateScope-aligned expected scope (population/method/dataset/metric + negative/excluded notes).
  expected_scope: {
    population_scope: 'BERT-base class Transformer encoder teacher and its 6-layer distilled student.',
    method_scope: 'Task-agnostic knowledge distillation during pre-training (triple loss), then task fine-tuning.',
    dataset_scope: 'Committed GLUE subset: SST-2, MRPC, CoLA (reference GLUE 9-task macro for context only).',
    metric_scope: 'Per-task primary metric + committed-subset macro retention; parameter count; fixed-device latency.',
    negative_scope_notes: [
      'CoLA retention (~0.91) passes the 0.90 floor but is a material non-uniformity versus ~0.99 on SST-2/MRPC '
      + 'and versus the paper 0.97 macro headline — always disclosed, never averaged away.',
      'The inference-speedup magnitude is device-class dependent and only fair when the device is held constant.',
    ],
    excluded_scope_notes: [
      'No claim about generation / decoder tasks (the student is an encoder).',
      'No claim about model scales, task families, or modalities not probed; full 9-task GLUE retention is out of scope.',
    ],
  },
  claim_boundary_conditions: [
    'The paper "~97% retention" figure is a 9-task GLUE dev MACRO average — reference context, never a per-task '
    + 'guarantee and never this project\'s gate.',
    'The committed-subset macro (0.968) sits below the 9-task headline because CoLA drags the subset down.',
    'Size reduction (~40%) is deterministic; inference speedup (~1.6x) is fixed-device and device-class sensitive.',
    'Retention is conditional on teacher quality — not a claim that the student matches or exceeds the teacher.',
  ],
  known_negative_results: [
    'CoLA retention (MCC 56.3 -> 51.3, ratio 0.911) is a material non-uniformity — floor-passing but far below the '
    + 'uniform-0.97 reference; the trade-off is task-dependent, not uniform.',
    'RTE (reference, not committed) regresses most (69.3 -> 59.9), reinforcing that macro retention masks per-task loss.',
    'Distillation quality is bounded by teacher quality and distillation-corpus coverage.',
  ],
  dossier_readiness_expectations: {
    admitted_claim: 'the bounded strong trade-off claim above (claim_status must be supported via a claim trace packet)',
    rejected_claims:
      'none admitted beyond the bounded claim in this positive-confirmatory scenario; any uniform / "no capability '
      + 'loss" / full-GLUE-97% framing is rejected as an overclaim',
    failed_or_inconclusive_runs_to_account_for:
      'none (single succeeded confirmatory run set); the CoLA non-uniformity is a disclosed boundary on a '
      + 'succeeded run, carried in the experiment limitations, not a failed/inconclusive run',
    required_forbidden_overclaims_present: true,
    readiness_gate_must_pass: true,
  },
};

/**
 * v4 back-half role-output fixtures for the mocked冒烟 (execution_mode='mocked_llm').
 * Mirrors makeGs001BackHalfFixtures: the runner supplies runtime-created structural
 * ids via `refs`; the material owns the DistilBERT-specific semantic content. Each
 * adjudicator role carries typed SEMANTIC content blocks only (T-124 G4.6);
 * the runtime SERVICE deterministically assembles each Create*Request from the
 * request-context structural refs. The Create*Request objects below are the
 * EXPECTED assembly results (single source the blocks derive from; exposed for
 * the review packet). LIVE mode (G5) does NOT use these fixtures.
 *
 * Difference vs gs-001 (uniform parity): the strong claim here is a bounded
 * MULTI-OBJECTIVE trade-off finding — the CoLA non-uniformity (floor-passing but
 * far below the paper 0.97 macro headline) flows through unexpected_findings,
 * the claim boundary, and the dossier experiment limitations as a mandatory
 * disclosure. Strength stays strong (all gates pass) with the four-point-set #2
 * human confirmation, exercising disclosure discipline rather than claim-drop.
 */
export function makeGs002BackHalfFixtures(refs) {
  const T = GS002_IDS;
  const ref = (refType, refId, versionId = null) => gs002Ref(refType, refId, versionId);
  const runEvidenceRef = ref('run_evidence_unit', T.runEvidenceUnit);
  const validationReportRef = ref('result_validation_report', T.resultValidationReport);
  const forbidden = [...GS002_CLAIM_GROUND_TRUTH.forbidden_overclaims];

  const resultInterpretationPacketRequest = {
    result_interpretation_packet_id: T.resultPacket,
    validation_cycle_id: refs.validationCycleId,
    experiment_plan_light_id: refs.experimentPlanLightId ?? null,
    source: {
      run_evidence_refs: [runEvidenceRef],
      validation_report_refs: [validationReportRef],
      metric_refs: [
        ref('metric', T.metricGlueMacro),
        ref('metric', T.metricParameterCount),
        ref('metric', T.metricInferenceLatency),
      ],
      failed_run_refs: [],
      inconclusive_run_refs: [],
      stale_or_invalidated_evidence_refs: [],
    },
    result_summary: {
      result_summary:
        'The confirmatory run set shows the 6-layer distilled student meeting all three pre-committed trade-off '
        + 'gates: size (~66M vs ~110M, ~40% fewer params), speed (~1.63x on the fixed device), and the per-task '
        + '0.90 retention floor on every committed task — SST-2 91.3 vs 92.7 acc (0.985), MRPC 87.5 vs 88.6 F1 '
        + '(0.988), CoLA 51.3 vs 56.3 MCC (0.911). Retention is NON-UNIFORM: CoLA passes the floor but sits far '
        + 'below the paper 0.97 nine-task macro headline, and the committed-subset macro (0.968) is likewise below '
        + 'it — disclosed as a boundary, never restated as uniform 97% retention.',
      supports_assertion_refs: [
        ref('motive_assertion', T.assertionCompressionPressure),
        ref('motive_assertion', T.assertionDistillationTransfer),
      ],
      challenges_assertion_refs: [],
      unexpected_findings: [
        'Per-task retention is materially non-uniform: CoLA 0.911 vs ~0.99 on SST-2/MRPC. The committed-subset '
        + 'macro (0.968) sits below the paper 0.97 nine-task headline, dragged by CoLA — the macro must not be '
        + 'presented as a per-task guarantee.',
      ],
      failed_runs_accounted_for: true,
      inconclusive_runs_accounted_for: true,
      exploratory_confirmatory_separated: true,
    },
    reliability: {
      failed_runs_retained: true,
      confound_refs: [],
      limitation_refs: [],
      reliability_notes: [
        'Retention judged as median over repeats vs the reproduced teacher anchor; the CoLA cell passes the 0.90 '
        + 'floor but is a genuine non-uniformity, retained and reported, never averaged away by the macro.',
        'Inference speedup is measured on a single fixed commodity device and is device-class sensitive.',
      ],
    },
    claim_implications: {
      allowed_claim_ceiling: 'strong',
      forbidden_overclaims: forbidden,
      recommended_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      required_followup_refs: [],
    },
    trace_manifest_id: refs.resultPacketTraceManifestId,
    created_by: 'system',
  };

  const claimCandidateRequest = {
    claim_candidate_id: T.claimCandidate,
    claim_type: GS002_CLAIM_GROUND_TRUTH.expected_claim_type,
    claim_statement: GS002_CLAIM_GROUND_TRUTH.expected_claim_statement,
    claim_strength: GS002_CLAIM_GROUND_TRUTH.expected_claim_strength,
    result_interpretation_packet_ids: [T.resultPacket],
    support_refs: [runEvidenceRef],
    challenge_refs: [validationReportRef],
    scope: { ...GS002_CLAIM_GROUND_TRUTH.expected_scope },
    boundary: {
      rationale:
        'The trade-off is claimed only within the probed scale and committed subset. Every pre-committed gate is '
        + 'met (per-task 0.90 retention floor on all three tasks, ~40% size reduction, ~1.63x fixed-device '
        + 'speedup), so strength is strong — but the claim stays bounded: retention is task-dependent (CoLA 0.911 '
        + 'vs ~0.99 on SST-2/MRPC), the speedup is conditioned on the fixed device, and no uniform / "no '
        + 'capability loss" / full-GLUE-97% framing is admissible. The strong claim requires explicit human '
        + 'confirmation (four-point set #2).',
      forbidden_overclaims: [...GS002_CLAIM_GROUND_TRUTH.forbidden_overclaims],
      hidden_counter_evidence_refs: [],
      required_followup_refs: [],
      human_confirmation_ref: refs.humanConfirmationRef ?? null,
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
        'CoLA retention (0.911) passes the 0.90 floor but is a material non-uniformity versus ~0.99 on SST-2/MRPC; '
        + 'the committed-subset macro (0.968) sits below the paper 0.97 nine-task headline.',
        'Results are at BERT-base scale on three committed GLUE tasks; the 9-task GLUE ~97% headline is out of '
        + 'confirmatory scope.',
        'Inference speedup is measured on a single fixed device and is device-class sensitive.',
      ],
    },
    claim_section: {
      admitted_claim_refs: [ref('claim_candidate', T.claimCandidate)],
      rejected_claim_refs: [],
      forbidden_overclaims: [...GS002_CLAIM_GROUND_TRUTH.forbidden_overclaims],
      claim_ceiling: GS002_CLAIM_GROUND_TRUTH.expected_claim_ceiling,
    },
    readiness: {
      readiness_gate_result_id: refs.dossierReadinessGateResultId,
      blocker_refs: [],
      warning_refs: [],
      readiness_notes: [
        'Single confirmatory run set, every pre-committed gate met; the CoLA non-uniformity is carried as a '
        + 'disclosed boundary in the strong bounded claim and the experiment limitations. No failed / inconclusive '
        + '/ negative run outstanding for the project-level (N7) reconciliation.',
      ],
    },
    trace_manifest_id: refs.dossierTraceManifestId,
    created_by: 'system',
  };

  const resultAnalysisRole = {
    role_slot_id: 'result_analysis.interpretation_scenario_builder',
    role_status: 'passed',
    summary: 'DistilBERT confirmatory result-analysis: bounded multi-objective trade-off interpretation with the CoLA non-uniformity disclosed.',
    cited_source_refs: [runEvidenceRef, validationReportRef],
    blocker_codes: [],
    warning_codes: [],
    scenario_outputs: ['positive', 'negative', 'inconclusive', 'failed_run'].map((kind) => ({
      scenario_id: `gs002_result_scenario_${kind}`,
      scenario_kind: kind,
      summary: kind === 'positive'
        ? 'Student meets all three pre-committed gates: ~40% fewer params, ~1.63x fixed-device speedup, and the '
          + 'per-task 0.90 retention floor on every committed task.'
        : kind === 'negative'
          ? 'Retention is non-uniform: CoLA 0.911 vs ~0.99 on SST-2/MRPC — floor-passing but far below the paper '
            + '0.97 macro headline; disclosed as a boundary, never averaged away.'
          : kind === 'inconclusive'
            ? 'The committed-subset macro (0.968) sits below the paper 0.97 nine-task headline driven by CoLA; the '
              + 'macro is reported as context, never presented as a per-task guarantee or a full-GLUE claim.'
            : 'No confirmatory run failed; the run succeeded, so the failed-run scenario is vacuously accounted for.',
      support_refs: [runEvidenceRef],
      challenge_refs: [validationReportRef],
      limitation_refs: [],
      forbidden_overclaims: forbidden,
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
      ? 'Adjudicator: the bounded strong DistilBERT trade-off claim is within the packet ceiling, carries human '
        + 'confirmation, and discloses the CoLA non-uniformity boundary.'
      : `Claim-boundary review role ${roleSlotId}: statement stays within the probed subset, discloses the CoLA `
        + 'non-uniformity and the fixed-device speedup condition, and avoids the forbidden overclaims.',
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
      ? 'Adjudicator: dossier is ready for writing — strong bounded claim supported with confirmation, CoLA '
        + 'non-uniformity disclosed in the limitations, forbidden overclaims present, no run unaccounted.'
      : `Dossier-readiness review role ${roleSlotId}: readiness blockers are empty, the admitted claim is `
        + 'trace-supported, and the CoLA non-uniformity boundary is carried in the experiment limitations.',
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
    domainGateRequests: {
      resultInterpretationPacketRequest,
      claimCandidateRequest,
      dossierRequest,
    },
  };
}

// ---------------------------------------------------------------------------
// Runner ID-key contract aliases. The current G1 runner reads gs-001-flavoured
// SCENARIO_IDS key names (T.assertionLowRankOpportunity, T.baselineFullFinetune,
// T.metricGlue, T.codeHfRoberta, …) inside its front-half spine builders. Until
// G1 generalizes those key names (or moves spine content into the material),
// gs-002 exposes the SAME KEYS as aliases onto its semantic ids so a --scenario
// gs-002-distilbert run resolves every T.* handle. NB: the runner's front-half
// spine CONTENT (assertion texts, board bindings) is still LoRA-hardcoded — a
// semantically correct gs-002 full-chain run additionally requires the G1 spine
// parameterization; these aliases only close the ID-key surface (honest
// deviation flagged in the G2 report).
// ---------------------------------------------------------------------------
GS002_IDS.assertionMotivationPressure = GS002_IDS.assertionCompressionPressure;
GS002_IDS.assertionLowRankOpportunity = GS002_IDS.assertionDistillationTransfer;
GS002_IDS.assertionBaselineGap = GS002_IDS.assertionTradeoffGap;
GS002_IDS.bindingMotivationPressure = GS002_IDS.bindingCompressionPressure;
GS002_IDS.bindingLowRankOpportunity = GS002_IDS.bindingDistillationTransfer;
GS002_IDS.bindingBaselineGap = GS002_IDS.bindingTradeoffGap;
GS002_IDS.metricGlue = GS002_IDS.metricGlueMacro;
GS002_IDS.metricTrainableParams = GS002_IDS.metricParameterCount;
GS002_IDS.baselineFullFinetune = GS002_IDS.baselineTeacherBert;
GS002_IDS.baselineAdapter = GS002_IDS.baselineTaskSpecificDistill;
GS002_IDS.baselinePrefix = GS002_IDS.baselinePruningQuantization;
GS002_IDS.codeHfRoberta = GS002_IDS.codeHfDistillation;
GS002_IDS.configAdaptation = GS002_IDS.configDistillation;

// ---------------------------------------------------------------------------
// 通用导出契约（对齐 gs-001 v4）：runner 按通用名导入，--scenario 可切换。
//   SCENARIO_META          { scenario_id, paper, package_version, runner_contract }
//   SCENARIO_IDS           superset of domain-object ids (front + back half)
//   SCENARIO_CONTENT       topic content core (research question / scope / budget …)
//   EXPERIMENT_RESULTS     acceptance-experiment data segment (paper real values)
//   CLAIM_GROUND_TRUTH     claim boundary + dossier readiness answer card
//   makeBridgeHandoff      full bridge handoff (real bootstrap route contract)
//   makeBackHalfFixtures   mocked_llm role fixtures for the back half
// ---------------------------------------------------------------------------
export const SCENARIO_META = {
  scenario_id: 'gs-002-distilbert',
  paper: 'arXiv:1910.01108 (DistilBERT, a distilled version of BERT: smaller, faster, cheaper and lighter)',
  package_version: 'v1',
  runner_contract: 'paper-implementation-golden-scenario/v4',
};
export const SCENARIO_IDS = GS002_IDS;
export const SCENARIO_CONTENT = GS002_DISTILBERT_CONTENT;
export const SCENARIO_SPINE = GS002_DISTILBERT_SPINE;
export const EXPERIMENT_RESULTS = GS002_EXPERIMENT_RESULTS;
export const CLAIM_GROUND_TRUTH = GS002_CLAIM_GROUND_TRUTH;
export const makeBridgeHandoff = makeGs002BridgeHandoff;
export const makeBackHalfFixtures = makeGs002BackHalfFixtures;
