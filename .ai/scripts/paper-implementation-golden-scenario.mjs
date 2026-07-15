#!/usr/bin/env node
/**
 * T-124 S5 golden scenario runner — GS-001 (LoRA, arXiv:2106.09685).
 *
 * 全链路径：真实 bootstrap 路由（gs001 bridge handoff，不开测试后门）→ 确定性脊柱
 * （CoreMotiveDraft → trace → admit → MotiveEvidenceBoardVersion）→ coordinator
 * lane `motive` / 单步 board pipeline / lane A（route→skeptic→cycle→feasibility），
 * 全部 execution_mode='provider_llm'（真 LLM）、run_mode='dry_run'（orchestrator 映射
 * acceptance）→ 受理桥物化（TechnicalRouteCandidate / FeasibilityProbe，带
 * source_proposal_artifact_ref 血缘）→ review-packet.md 人审包。
 *
 * 接线模板：
 * - live provider 接线镜像 near-prod gate（buildApp + BackendLlmGateway + 注册 profile
 *   解析：TopicSelectionAgentOrchestratorService → BackendLlmGateway）；
 * - 领域播种镜像 v1-runnable-replay（in-memory 仓储 + 真实服务），StubBridgeService
 *   换成 gs001 handoff（.ai/golden-scenarios/paper-implementation/gs-001-lora/topic-package.mjs）。
 *
 * 失败处理：任何 step blocked/失败如实落盘并继续能继续的部分；summary.status ∈
 * completed|partial|failed，绝不静默吞。skeptic waiting_review 停驻如实记录；
 * （记录后）以一次不改载荷的 override re-advance 继续（override 含 actor 记录），
 * 仍停驻则如实终止该 lane——不伪造 disposition。
 *
 * 运行（仓库根）：
 *   PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1 \
 *   node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
 *     .ai/scripts/paper-implementation-golden-scenario.mjs
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUNNER_ID = 'paper-implementation-golden-scenario';
const RUNNER_VERSION = 't124-s5-gs001-lora-v3';
const SCENARIO_ID = 'gs-001-lora';

if (process.env.PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE !== '1') {
  console.log(`Usage (from repo root):
  PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1 \\
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \\
    .ai/scripts/paper-implementation-golden-scenario.mjs [--run-id <id>]

Live gate PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1 is not set; exiting without side effects.
Requires OPENAI_API_KEY (or DASHSCOPE_API_KEY with PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID=dashscope)
in .env.local. Expected cost: ~8-10 provider calls per run.
Artifacts: .ai/.tmp/paper-implementation-golden-scenario/<run-id>/`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// args / run identity
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let runId = `gs001-lora-${new Date().toISOString().replace(/[:.]/g, '-')}`;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--run-id' && args[i + 1]) {
    runId = args[i + 1];
    i += 1;
  } else if (args[i].startsWith('--run-id=')) {
    runId = args[i].slice('--run-id='.length);
  }
}
if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
  console.error('--run-id may only contain letters, numbers, dot, underscore, and hyphen.');
  process.exit(1);
}
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/paper-implementation-golden-scenario', runId);

// ---------------------------------------------------------------------------
// hermetic env before importing the backend (buildApp reads env at call time)
// ---------------------------------------------------------------------------
process.env.AUTO_PULL_SCHEDULER_ENABLED = 'false';
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
for (const key of [
  'RESEARCH_LIFECYCLE_REPOSITORY',
  'TITLE_CARD_REPOSITORY',
  'AUTO_PULL_REPOSITORY',
  'APPLICATION_SETTINGS_REPOSITORY',
  'EXPERIMENT_FOUNDATION_REPOSITORY',
  'PAPER_IMPLEMENTATION_REPOSITORY',
]) {
  process.env[key] = 'memory';
}

const providerId = process.env.PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID === 'dashscope'
  ? 'dashscope'
  : 'openai';
const providerKeyName = providerId === 'dashscope' ? 'DASHSCOPE_API_KEY' : 'OPENAI_API_KEY';
if (!process.env[providerKeyName]?.trim()) {
  console.error(JSON.stringify({
    runner_id: RUNNER_ID,
    run_id: runId,
    status: 'blocked',
    reason: `${providerKeyName} is required for the live golden scenario run (key value is never logged).`,
  }, null, 2));
  process.exit(2);
}

// ---------------------------------------------------------------------------
// backend + material imports (dynamic: keeps the no-gate path loader-free)
// ---------------------------------------------------------------------------
const { buildApp } = await import('../../apps/backend/src/app.ts');
const { BackendLlmGateway } = await import('../../apps/backend/src/services/llm-gateway.ts');
const { AppError } = await import('../../apps/backend/src/errors/app-error.ts');
const { InMemoryPaperImplementationRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-repository.ts');
const { InMemoryPaperImplementationMotiveRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-motive-repository.ts');
const { InMemoryPaperImplementationTraceRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-trace-repository.ts');
const { InMemoryPaperImplementationValidationRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-validation-repository.ts');
const { InMemoryPaperImplementationWorkOrderRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-workorder-repository.ts');
const { InMemoryPaperImplementationResultClaimDossierRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-result-claim-dossier-repository.ts');
const { InMemoryPaperImplementationAiWorkflowHarnessRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-ai-workflow-harness-repository.ts');
const { InMemoryPaperImplementationRuntimeRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-runtime-repository.ts');
const { InMemoryPaperImplementationCoordinatorRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-coordinator-repository.ts');
const { InMemoryPaperImplementationHumanConfirmationRepository } = await import('../../apps/backend/src/repositories/in-memory-paper-implementation-human-confirmation-repository.ts');
const {
  GS001_IDS: T,
  GS001_LORA_CONTENT: LORA,
  makeGs001BridgeHandoff,
  sha256Hex,
} = await import('../golden-scenarios/paper-implementation/gs-001-lora/topic-package.mjs');

// ---------------------------------------------------------------------------
// constants (mirror shared runtime contracts; string literals keep this runner
// runnable without importing the TS contract module)
// ---------------------------------------------------------------------------
const SLOT = {
  routeArchitecture: 'route_architecture.route_candidates',
  routeSkeptic: 'route_skeptic_review.route_risk_critique',
  cyclePlanning: 'validation_cycle_planning.cycle_candidates',
  feasibility: 'feasibility_planning.probe_plan_candidates',
  motiveDecomposition: 'motive_decomposition.draft_assertion_candidates',
  motiveEvolution: 'motive_evolution.evolution_decision_support',
  boardCuration: 'evidence_board_curation.binding_gap_candidates',
};
const PROFILE = {
  [SLOT.routeArchitecture]: 'paper-implementation.route-architecture.route-candidates.v1',
  [SLOT.routeSkeptic]: 'paper-implementation.route-skeptic-review.route-risk-critique.v1',
  [SLOT.cyclePlanning]: 'paper-implementation.validation-cycle-planning.cycle-candidates.v1',
  [SLOT.feasibility]: 'paper-implementation.feasibility-planning.probe-plan-candidates.v1',
  [SLOT.motiveDecomposition]: 'paper-implementation.motive-decomposition.draft-assertion-candidates.v1',
  [SLOT.motiveEvolution]: 'paper-implementation.motive-evolution.evolution-decision-support.v1',
  [SLOT.boardCuration]: 'paper-implementation.evidence-board-curation.binding-gap-candidates.v1',
};
const modelOptionId = (profileId) => providerId === 'dashscope'
  ? `${profileId}.dashscope-thinking-budget`
  : `${profileId}.openai-balanced`;
// coordinator 非 product 实跑模式；全部 slot 服务统一映射为 'acceptance'。
// （S2-B B2 已修复 motive-evolution 的 dry_run→test 映射分叉，motive lane 不再需要
// 以 run_mode='replay' 绕行——全 lane 直接用 dry_run。）
const RUN_MODE = 'dry_run';
const EXECUTION_MODE = 'provider_llm';

/**
 * S5 首跑期间实证的产品侧发现（runner 不修产品语义，只在人审包里如实呈现；
 * 证据落盘见 run gs001-lora-live-001/002 与 03-implementation-notes S5 条目）。
 * S5-F1/F2/F3 已由 S2-B（2026-07-11）在产品侧修复，保留为历史发现并标注 resolution。
 */
const KNOWN_PRODUCT_FINDINGS = [
  {
    id: 'S5-F1',
    finding: 'motive-evolution runtime service 的 topicRunMode 把 dry_run 映射为 test（其余 lane 服务均为 '
      + 'mock→test / dry_run→acceptance），与 provider_llm profile eligibility（acceptance|product）冲突：'
      + 'dry_run + provider_llm 下 motive lane 必然 INVALID_PAYLOAD。首跑时 runner 以 run_mode=replay 绕行。',
    evidence: 'run gs001-lora-live-001 step motive_evolution blocked INVALID_PAYLOAD（0 provider calls）；'
      + 'paper-implementation-motive-evolution-runtime-service.ts topicRunMode 与兄弟服务对照。',
    resolution: 'S2-B B2 已修复：motive-evolution topicRunMode 与兄弟服务统一（mock→test / dry_run·replay→acceptance / '
      + 'product→product），负例测试锁定；runner 的 replay 绕行已删除，motive lane 与其余 lane 一致用 dry_run。',
  },
  {
    id: 'S5-F2',
    finding: 'motive-evolution 两个 role 的 schema_name（paper_implementation_motive_evolution_option_designer_role_output / '
      + '..._risk_challenger_role_output）长度 65，超 OpenAI structured-output text.format.name 上限 64——该 slot '
      + '对 openai provider 永远 InvalidRequestError（400: string too long），live 全链在此产品缺陷处如实中断。',
    evidence: 'run gs001-lora-live-002 step motive_evolution failed_runtime InvalidRequestError（1 provider call）；'
      + 'gateway 400 原文 "Invalid \'text.format.name\': string too long... maximum length 64, got 65"。',
    resolution: 'S2-B B1 已修复：两个 schema_name 去掉 "_role" 段（..._option_designer_output / ..._risk_challenger_output，'
      + '60 字符），回归测试钉死 ≤64 且符合 ^[a-zA-Z0-9_-]+$。',
  },
  {
    id: 'S5-F3',
    finding: 'coordinator lane A 在 provider 模式下，下游 slot（skeptic/cycle/feasibility）只拿到上游 admitted '
      + 'artifact 的 ref+hash，拿不到内容——skeptic 如实以 *_NOT_INSPECTABLE 类 blocker 拒绝。首跑时靠人工队列回流'
      + '（override 注入逐字转写的上游内容 packet）续链。',
    evidence: 'run gs001-lora-live-001 step route_skeptic_review blocked（PRIMARY_ROUTE_PROPOSAL_CONTENT_NOT_INSPECTABLE 等 6 码）。',
    resolution: 'S2-B B3 已修复：coordinator 链内消费步注入上游 admitted 提案正文（source_context_packets 确定性逐字转写，'
      + 'identity/hash 纪律不变）；runner 的手工 resolver 补喂步骤已删除。',
  },
  {
    id: 'S5-F4',
    finding: '内容补给后 skeptic 能给出实质批判（数据/指标协议、基线控制、算力核算对 confirmatory 主张不足——'
      + '判断跨 attempt 稳定且切题），但它把语义缺陷表达为 blocker_codes 而非 recommended_disposition=revise：'
      + '设计好的 waiting_review 人审停驻点从未触发，run 落在 blocked 终态（只能 re-advance 重跑同槽，无"接受风险'
      + '继续"的产品化出口）。skeptic 的 blocker-vs-disposition 语义引导应成为 S3 role 契约加深的输入。',
    evidence: 'run gs001-lora-live-002 lane A step-1 连续 4 个 attempt blocked，第 2-4 次批判码实质化且稳定'
      + '（DATASET_METRIC_PROTOCOL_UNDERSPECIFIED_FOR_CONFIRMATORY_CLAIMS / BASELINE_CONTROL_* / COMPUTE_BUDGET_*）。',
  },
];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function hash(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
function ref(refType, refId, versionId = null) {
  return { ref_type: refType, ref_id: refId, title_card_id: T.titleCard, version_id: versionId };
}
/** runtime-slot flavoured ref (canary style: version pinned to <id>@v1) */
function rref(refType, refId) {
  return ref(refType, refId, `${refId}@v1`);
}
function emptyTraceLineage() {
  return {
    literature: { literature_evidence_refs: [], source_locator_refs: [], citation_candidate_refs: [] },
    experiment: {
      experiment_plan_refs: [], work_order_refs: [], run_refs: [], run_evidence_refs: [],
      result_packet_refs: [], metric_refs: [],
    },
    artifact: {
      dataset_refs: [], baseline_refs: [], code_version_refs: [], model_checkpoint_refs: [],
      config_refs: [], log_artifact_refs: [],
    },
    decision: {
      validation_cycle_refs: [], motive_evolution_decision_refs: [], gate_result_refs: [],
      human_decision_refs: [], accepted_risk_refs: [],
    },
    internal_interpretation: {
      result_interpretation_refs: [], llm_rationale_refs: [], board_summary_refs: [], non_citable_refs: [],
    },
  };
}
function literatureLineage() {
  const lineage = emptyTraceLineage();
  lineage.literature.literature_evidence_refs = [ref('literature_evidence_unit', T.litEvidence)];
  lineage.literature.source_locator_refs = [ref('source_locator', T.sourceLocator)];
  return lineage;
}

const state = {
  runner_id: RUNNER_ID,
  runner_version: RUNNER_VERSION,
  scenario_id: SCENARIO_ID,
  run_id: runId,
  provider_id: providerId,
  run_mode: RUN_MODE,
  execution_mode: EXECUTION_MODE,
  started_at: new Date().toISOString(),
  finished_at: null,
  status: 'running',
  steps: [],
  lanes: {},
  acceptance_bridge: {},
  gaps: [],
  stops: [],
  totals: { provider_calls: 0 },
};
let artifactSequence = 0;

async function record(stepId, data) {
  artifactSequence += 1;
  const fileName = `${String(artifactSequence).padStart(2, '0')}-${stepId}.json`;
  await fs.writeFile(path.join(ARTIFACT_DIR, fileName), `${JSON.stringify(data, null, 2)}\n`);
  return fileName;
}

class StepFailure extends Error {
  constructor(stepId, statusCode, body) {
    super(`Step ${stepId} failed with status ${statusCode}.`);
    this.stepId = stepId;
    this.statusCode = statusCode;
    this.body = body;
  }
}

async function inject(app, input) {
  const startedAt = Date.now();
  const response = await app.inject({ method: input.method, url: input.url, payload: input.payload });
  const elapsedMs = Date.now() - startedAt;
  let body = null;
  try {
    body = response.body ? JSON.parse(response.body) : null;
  } catch {
    body = { raw_body: String(response.body).slice(0, 400) };
  }
  const expected = Array.isArray(input.expectedStatus) ? input.expectedStatus : [input.expectedStatus];
  const ok = expected.includes(response.statusCode);
  const entry = {
    step_id: input.stepId,
    method: input.method,
    url: input.url.replace(/implementation_project_[A-Za-z0-9_-]+/g, ':implementation_project_id'),
    expected_status: expected,
    status_code: response.statusCode,
    ok,
    elapsed_ms: elapsedMs,
  };
  state.steps.push(entry);
  entry.artifact_file = await record(input.stepId, { request: input.payload ?? null, response: body, meta: entry });
  if (!ok) {
    throw new StepFailure(input.stepId, response.statusCode, body);
  }
  return body;
}

function projectUrl(projectId, suffix) {
  return `/paper-implementation/projects/${encodeURIComponent(projectId)}${suffix}`;
}

function registerGap(section, error, note) {
  const gap = {
    section,
    note: note ?? null,
    error: error instanceof StepFailure
      ? { step_id: error.stepId, status_code: error.statusCode, body: error.body }
      : { message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) },
  };
  state.gaps.push(gap);
  console.error(`[golden-scenario] GAP in ${section}: ${JSON.stringify(gap.error).slice(0, 500)}`);
}

// ---------------------------------------------------------------------------
// gs001 bridge stub (replaces the real topic-selection bridge provider; the
// bootstrap HTTP route itself stays fully real — no test backdoor)
// ---------------------------------------------------------------------------
class Gs001BridgeService {
  handoff = makeGs001BridgeHandoff();

  async getPaperProjectBridgeHandoff(paperProjectBridgeId) {
    if (paperProjectBridgeId !== this.handoff.paper_project_bridge_id) {
      throw new AppError(404, 'NOT_FOUND', `PaperProjectBridge ${paperProjectBridgeId} not found.`);
    }
    return structuredClone(this.handoff);
  }
}

// ---------------------------------------------------------------------------
// content-bearing payload builders (LoRA content core; refs are gs001 handles)
// ---------------------------------------------------------------------------
const handoff = makeGs001BridgeHandoff();
const workingCopyHash = handoff.working_copy_payload_hash;

function motiveDraftPayload() {
  const c = LORA;
  return {
    motive_id: T.motive,
    core_motive_version_id: T.motiveVersion,
    motive_contract: {
      short_name: 'Low-rank adaptation of pretrained language models',
      motivation_claim: c.motive_hypothesis,
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
    scope_contract: {
      included_scope: [...LORA.scope.included],
      excluded_scope: [...LORA.scope.excluded],
      non_goals: [...LORA.scope.non_goals],
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
    source_refs: [ref('topic_package', T.topicPackage, 'v3')],
    assertions: [
      {
        assertion_id: T.assertionMotivationPressure,
        assertion_type: 'motivation_pressure',
        assertion_text:
          'Per-task full fine-tuning cost (trainable parameters, GPU memory, checkpoint storage) is the binding '
          + 'constraint that makes large-model downstream adaptation impractical at scale.',
        importance: { role: 'core', must_hold_for_motive_to_continue: true },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: ['Deployment surveys showing per-task full fine-tuning cost is negligible in practice.'],
          what_would_weaken_this: ['Cost pressure applies only to the very largest model class.'],
        },
        expected_initial_status: 'untested',
      },
      {
        assertion_id: T.assertionLowRankOpportunity,
        assertion_type: 'technical_opportunity',
        assertion_text:
          'The adaptation delta over pretrained weights has low intrinsic rank, so a low-rank decomposition of '
          + 'the update can approximate full fine-tuning without losing task performance.',
        importance: { role: 'core', must_hold_for_motive_to_continue: true },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: ['Low-rank-constrained updates consistently underperform full fine-tuning at any affordable rank.'],
          what_would_weaken_this: ['The low-rank property holds only for some weight matrices or task families.'],
        },
        expected_initial_status: 'untested',
      },
      {
        assertion_id: T.assertionBaselineGap,
        assertion_type: 'baseline_gap',
        assertion_text:
          'Existing parameter-efficient baselines leave a real gap: adapter layers add inference latency and '
          + 'prefix/prompt tuning consumes sequence budget and optimizes unstably, so none achieves parameter '
          + 'efficiency with zero added latency at parity performance.',
        importance: { role: 'core', must_hold_for_motive_to_continue: false },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: ['A baseline reproduction showing adapters add no measurable latency and prefix tuning is stable at parity.'],
          what_would_weaken_this: ['The latency penalty matters only in small-batch online inference.'],
        },
        expected_initial_status: 'untested',
      },
    ],
  };
}

function boardPayload(boardTraceManifestId, bindingTraces) {
  const bindingFor = (bindingId, assertionId, statement, relevance, limitation) => ({
    binding_id: bindingId,
    assertion_id: assertionId,
    evidence_ref: ref('literature_evidence_unit', T.litEvidence),
    role: 'support',
    scope: { dataset_scope: 'Transformer language model adaptation literature' },
    strength: { directness: 'moderate', reliability: 'medium', reproducibility: 'unknown', freshness: 'fresh' },
    support_state: 'weak',
    challenge_status: 'none',
    interpretation: {
      normalized_statement: statement,
      why_relevant_to_assertion: relevance,
      limitations: [limitation],
    },
    trace_manifest_id: bindingTraces[bindingId],
  });
  return {
    board_version_id: T.board,
    motive_id: T.motive,
    core_motive_version_id: T.motiveVersion,
    trace_manifest_id: boardTraceManifestId,
    board_summary: {
      current_support_summary:
        'Topic-package literature supports the cost-pressure motivation and gives an indirect low-intrinsic-'
        + 'dimension signal for the low-rank hypothesis; no direct probe evidence yet.',
      current_challenge_summary: 'No direct counter-evidence recorded at intake.',
      unresolved_conflicts: [],
      board_gap_summary:
        'The low-rank hypothesis needs a direct feasibility probe at the target model scale, and the baseline '
        + 'gap assertion needs reproduced adapter/prefix baselines under the project budget.',
      next_evidence_needed: [
        'Low-rank feasibility probe on a representative task at RoBERTa-base scale.',
        'Reproduced full fine-tuning / adapter / prefix baselines with latency and parameter measurements.',
      ],
    },
    bindings: [
      bindingFor(
        T.bindingMotivationPressure,
        T.assertionMotivationPressure,
        'Prior work reports that per-task full-model copies are prohibitive in storage and deployment as '
        + 'pretrained model scale grows.',
        'Directly supports the cost-pressure motivation.',
        'Evidence is literature-level; project-scale cost was not re-measured at intake.',
      ),
      bindingFor(
        T.bindingLowRankOpportunity,
        T.assertionLowRankOpportunity,
        'Prior work reports learned over-parametrized models reside on a low intrinsic dimension.',
        'Indirectly supports the hypothesis that adaptation updates may also be low-rank.',
        'Intrinsic dimension of the model is not the same object as the rank of the adaptation delta.',
      ),
      bindingFor(
        T.bindingBaselineGap,
        T.assertionBaselineGap,
        'Prior work reports adapter latency overhead at small batch sizes and prefix-tuning optimization '
        + 'instability with non-monotonic performance in tunable parameters.',
        'Supports the claim that existing parameter-efficient baselines leave a latency/stability gap.',
        'Reported measurements come from other model/serving configurations than this project budget.',
      ),
    ],
  };
}

/** 共享冻结 source bundle（lane B 两槽必须逐字节一致）。 */
function motiveLaneSourceBundle(spine) {
  const refs = [
    ref('source_locator', T.sourceLocator),
    ref('citation_candidate', T.citationCandidate),
    ref('evidence_unit', T.litEvidence),
    ref('motive_evidence_board_version', T.board),
    ref('evidence_binding', T.bindingLowRankOpportunity),
    ref('trace_manifest', spine.motiveTraceManifestId),
  ];
  return { refs, hashes: refs.map((item) => hash(item.ref_id)) };
}

function motiveDecompositionSlotPayload(spine, bundle) {
  const assertionPacket = (assertionId, assertionText, scopeSummary) => ({
    packet_ref: ref('assertion_context_packet', `gs001_assertion_packet_${assertionId}`),
    packet_hash: hash(`gs001_assertion_packet_${assertionId}`),
    assertion_ref: ref('motive_assertion', assertionId),
    assertion_hash: hash(assertionText),
    assertion_text: assertionText,
    scope_boundary_summary: scopeSummary,
    covered_evidence_refs: [ref('evidence_unit', T.litEvidence)],
    covered_trace_manifest_refs: [ref('trace_manifest', spine.motiveTraceManifestId)],
    covered_source_refs: [ref('source_locator', T.sourceLocator)],
  });
  const draft = motiveDraftPayload();
  return {
    model_profile_id: PROFILE[SLOT.motiveDecomposition],
    model_option_id: modelOptionId(PROFILE[SLOT.motiveDecomposition]),
    decomposition_mode: 'decompose_existing_assertions',
    target_ref: ref('core_motive_version', T.motiveVersion, `${T.motiveVersion}@v1`),
    target_version_id: `${T.motiveVersion}@v1`,
    target_motive_ref: ref('core_motive', T.motive),
    target_core_motive_version_ref: ref('core_motive_version', T.motiveVersion),
    target_assertion_refs: [
      ref('motive_assertion', T.assertionMotivationPressure),
      ref('motive_assertion', T.assertionLowRankOpportunity),
      ref('motive_assertion', T.assertionBaselineGap),
    ],
    input_snapshot_ref: ref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: bundle.refs,
    source_hashes: bundle.hashes,
    assertion_context_packets: [
      assertionPacket(
        T.assertionMotivationPressure,
        draft.assertions[0].assertion_text,
        'Cost pressure applies to downstream adaptation of large pretrained Transformer language models; '
        + 'no new pretraining, no multimodal scope.',
      ),
      assertionPacket(
        T.assertionLowRankOpportunity,
        draft.assertions[1].assertion_text,
        'The low-rank hypothesis targets adaptation deltas over frozen pretrained weights within the probed '
        + 'model scale (RoBERTa-base class) and budget (single-GPU, GLUE subset).',
      ),
      assertionPacket(
        T.assertionBaselineGap,
        draft.assertions[2].assertion_text,
        'Baseline gap covers full fine-tuning, adapter tuning, and prefix/prompt tuning as reproduction '
        + 'targets under the project compute budget.',
      ),
    ],
    trace_manifest_refs: [ref('trace_manifest', spine.motiveTraceManifestId)],
    trace_manifest_hashes: [hash(spine.motiveTraceManifestId)],
    source_locator_refs: [ref('source_locator', T.sourceLocator)],
    citation_candidate_refs: [ref('citation_candidate', T.citationCandidate)],
    evidence_refs: [ref('evidence_unit', T.litEvidence)],
    accepted_risk_refs: [],
    admitted_upstream_artifact_refs: [],
    admitted_upstream_artifact_hashes: [],
    preflight_blocker_codes: [],
  };
}

function motiveEvolutionSlotPayload(spine, bundle) {
  return {
    model_profile_id: PROFILE[SLOT.motiveEvolution],
    model_option_id: modelOptionId(PROFILE[SLOT.motiveEvolution]),
    target_ref: ref('core_motive_version', T.motiveVersion, `${T.motiveVersion}@v1`),
    target_version_id: `${T.motiveVersion}@v1`,
    target_motive_refs: [ref('core_motive', T.motive)],
    target_motive_hashes: [hash(T.motive)],
    target_core_motive_version_refs: [ref('core_motive_version', T.motiveVersion)],
    target_core_motive_version_hashes: [hash(T.motiveVersion)],
    input_snapshot_ref: ref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    portfolio_snapshot_ref: ref('motive_portfolio_snapshot', 'gs001_portfolio_snapshot_001'),
    portfolio_snapshot_hash: hash('gs001_portfolio_snapshot_001'),
    evidence_board_refs: [ref('motive_evidence_board_version', T.board)],
    evidence_board_hashes: [hash(T.board)],
    evidence_binding_refs: [ref('evidence_binding', T.bindingLowRankOpportunity)],
    evidence_binding_hashes: [hash(T.bindingLowRankOpportunity)],
    challenge_refs: [],
    conflict_refs: [],
    trace_manifest_refs: [ref('trace_manifest', spine.motiveTraceManifestId)],
    trace_manifest_hashes: [hash(spine.motiveTraceManifestId)],
    human_confirmation_policy_ref: ref('human_confirmation_policy', 'gs001_confirmation_policy_v1'),
    human_confirmation_policy_hash: hash('gs001_confirmation_policy_v1'),
    source_refs: bundle.refs,
    source_hashes: bundle.hashes,
    motive_context_packets: [{
      packet_ref: ref('motive_context_packet', 'gs001_motive_context_packet_001'),
      packet_hash: hash('gs001_motive_context_packet_001'),
      packet_kind: 'motive_version_state',
      content_summary:
        'Intake-stage motive: low-intrinsic-rank adaptation hypothesis for parameter-efficient adaptation of '
        + 'Transformer language models. Board has weak literature support for cost pressure and an indirect '
        + 'low-intrinsic-dimension signal; the low-rank hypothesis and baseline gap still need probe evidence.',
      key_facts: [
        `Research question: ${LORA.research_question}`,
        `Hypothesis under evolution: ${LORA.motive_hypothesis}`,
        `Early check obligations: ${LORA.early_check_obligations.join(' | ')}`,
        `Budget envelope: ${LORA.budget_envelope.scale}; ${LORA.budget_envelope.max_compute}; max runtime ${LORA.budget_envelope.max_runtime}.`,
      ],
      covered_target_refs: [
        ref('core_motive_version', T.motiveVersion),
        ref('core_motive', T.motive),
      ],
      covered_evidence_refs: [
        ref('motive_evidence_board_version', T.board),
        ref('evidence_binding', T.bindingLowRankOpportunity),
      ],
      covered_trace_manifest_refs: [ref('trace_manifest', spine.motiveTraceManifestId)],
      covered_source_refs: [ref('source_locator', T.sourceLocator)],
    }],
    validation_cycle_refs: [],
    validation_cycle_hashes: [],
    result_packet_refs: [],
    result_packet_hashes: [],
    cross_board_review_refs: [],
    cross_board_review_hashes: [],
    prior_evolution_decision_refs: [],
    prior_evolution_decision_hashes: [],
    prior_portfolio_decision_refs: [],
    prior_portfolio_decision_hashes: [],
    accepted_risk_refs: [],
    accepted_risk_hashes: [],
    human_request_refs: [],
    human_request_hashes: [],
    preflight_blocker_codes: [],
  };
}

function boardCurationSlotPayload(spine) {
  return {
    model_profile_id: PROFILE[SLOT.boardCuration],
    model_option_id: modelOptionId(PROFILE[SLOT.boardCuration]),
    curation_mode: 'curate_existing_board',
    target_ref: ref('motive_evidence_board_version', T.board, `${T.board}@v1`),
    target_version_id: `${T.board}@v1`,
    target_motive_ref: ref('core_motive', T.motive),
    target_core_motive_version_ref: ref('core_motive_version', T.motiveVersion),
    target_board_ref: ref('motive_evidence_board_version', T.board),
    target_board_hash: hash(T.board),
    target_assertion_refs: [
      ref('motive_assertion', T.assertionMotivationPressure),
      ref('motive_assertion', T.assertionLowRankOpportunity),
      ref('motive_assertion', T.assertionBaselineGap),
    ],
    input_snapshot_ref: ref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: [
      ref('source_locator', T.sourceLocator),
      ref('citation_candidate', T.citationCandidate),
      ref('evidence_unit', T.litEvidence),
    ],
    source_hashes: [hash(T.sourceLocator), hash(T.citationCandidate), hash(T.litEvidence)],
    source_context_packets: [
      {
        packet_ref: ref('source_context_packet', 'gs001_source_packet_paper'),
        packet_hash: hash('gs001_source_packet_paper'),
        source_ref: ref('source_locator', T.sourceLocator),
        source_hash: hash(T.sourceLocator),
        evidence_kind: 'source_locator',
        content_summary:
          'Primary literature locator for the topic package: parameter-efficient adaptation context — full '
          + 'fine-tuning cost pressure, adapter latency overhead, prefix-tuning sequence-budget/stability issues, '
          + 'and the low-intrinsic-dimension observation motivating the low-rank hypothesis.',
        key_facts: [...LORA.literature_context_key_facts],
        covered_evidence_refs: [],
        covered_source_locator_refs: [ref('source_locator', T.sourceLocator)],
        covered_citation_candidate_refs: [],
        covered_trace_manifest_refs: [],
      },
      {
        packet_ref: ref('source_context_packet', 'gs001_source_packet_evidence'),
        packet_hash: hash('gs001_source_packet_evidence'),
        source_ref: ref('evidence_unit', T.litEvidence),
        source_hash: hash(T.litEvidence),
        evidence_kind: 'evidence_unit',
        content_summary:
          'Bound evidence unit currently supporting all three intake assertions at weak support; the board gap '
          + 'is a missing direct low-rank probe and missing reproduced baselines.',
        key_facts: [
          'All three assertions currently rest on the same literature evidence unit (weak, indirect for the low-rank hypothesis).',
          'No probe or run evidence exists yet; freshness is intake-fresh.',
        ],
        covered_evidence_refs: [ref('evidence_unit', T.litEvidence)],
        covered_source_locator_refs: [],
        covered_citation_candidate_refs: [ref('citation_candidate', T.citationCandidate)],
        covered_trace_manifest_refs: [],
      },
    ],
    trace_manifest_refs: [ref('trace_manifest', spine.boardTraceManifestId)],
    trace_manifest_hashes: [hash(spine.boardTraceManifestId)],
    source_locator_refs: [ref('source_locator', T.sourceLocator)],
    citation_candidate_refs: [ref('citation_candidate', T.citationCandidate)],
    reviewed_citation_candidate_refs: [ref('citation_candidate', T.citationCandidate)],
    evidence_refs: [ref('evidence_unit', T.litEvidence)],
    existing_evidence_binding_refs: [
      ref('evidence_binding', T.bindingMotivationPressure),
      ref('evidence_binding', T.bindingLowRankOpportunity),
      ref('evidence_binding', T.bindingBaselineGap),
    ],
    existing_bound_evidence_refs: [ref('evidence_unit', T.litEvidence)],
    accepted_risk_refs: [],
    freshness_policy: {
      stale_evidence_requires_gap_candidate: true,
      unreviewed_citation_requires_gap_candidate: true,
      duplicate_existing_binding_requires_gap_candidate: true,
    },
    secondary_evidence_transfer_binding_refs: [],
    secondary_cross_board_review_refs: [],
    secondary_trace_repair_queue_refs: [],
    preflight_blocker_codes: [],
  };
}

/** lane A 共享的 source refs + 内容 packet（route/skeptic/cycle/feasibility 基底）。 */
function laneASources(spine) {
  const refs = [
    ref('implementation_input_snapshot', T.inputSnapshot),
    ref('trace_manifest', spine.motiveTraceManifestId),
    ref('motive_evidence_board_version', T.board),
    ref('literature_evidence_unit', T.litEvidence),
    ref('source_locator', T.sourceLocator),
  ];
  return { refs, hashes: refs.map((item) => hash(item.ref_id)) };
}
function laneAContextPackets(kindFacts) {
  return [
    {
      source_ref: ref('implementation_input_snapshot', T.inputSnapshot),
      evidence_kind: 'topic_package_working_copy',
      content_summary:
        `Research question: ${LORA.research_question} Hypothesis: ${LORA.motive_hypothesis}`,
      key_facts: [
        `Included scope: ${LORA.scope.included.join('; ')}`,
        `Excluded scope: ${LORA.scope.excluded.join('; ')} Non-goals: ${LORA.scope.non_goals.join('; ')}`,
        `Early check obligations: ${LORA.early_check_obligations.join(' | ')}`,
        `Budget envelope: ${LORA.budget_envelope.scale}; model scale ${LORA.budget_envelope.model_scale}; `
        + `evaluation ${LORA.budget_envelope.evaluation_scale}; ${LORA.budget_envelope.max_compute}; `
        + `max runtime ${LORA.budget_envelope.max_runtime}; retry budget ${LORA.budget_envelope.retry_budget}.`,
        // v3 pre-commitments（选题包 v3：v2 RR-002/003/004/006 + run 004 RF-* 复评，内容取自内容核）
        `Confirmatory budget matrix (pre-committed, v3): ${LORA.confirmatory_budget_matrix.gpu_constraint}; `
        + `${LORA.confirmatory_budget_matrix.total_training_budget}; stage budgets: probe `
        + `${LORA.confirmatory_budget_matrix.stage_budgets.stage0_feasibility_probe}, baseline reproduction `
        + `${LORA.confirmatory_budget_matrix.stage_budgets.stage1_baseline_reproduction}, confirmatory `
        + `${LORA.confirmatory_budget_matrix.stage_budgets.stage2_confirmatory_matrix}. `
        + `${LORA.confirmatory_budget_matrix.stage_budget_notes} `
        + `${LORA.confirmatory_budget_matrix.full_ft_reuse_rule} `
        + `${LORA.confirmatory_budget_matrix.confirmatory_matrix_definition} `
        + `Max repeats per task: ${LORA.confirmatory_budget_matrix.max_repeats_per_task}. `
        + `${LORA.confirmatory_budget_matrix.hyperparameter_policy} ${LORA.confirmatory_budget_matrix.rank_policy} `
        + `Latency protocol: ${LORA.confirmatory_budget_matrix.latency_protocol} `
        + `Checkpoint policy: ${LORA.confirmatory_budget_matrix.checkpoint_policy}`,
        `Dataset/metric pre-commitments (pre-registered, v3): ${LORA.dataset_metric_precommitments.alignment_criterion} `
        + `Metric aggregation: ${LORA.dataset_metric_precommitments.metric_aggregation.rule}; repeat cap per task `
        + `${LORA.dataset_metric_precommitments.metric_aggregation.repeat_cap_per_task}; parity tolerance `
        + `${LORA.dataset_metric_precommitments.metric_aggregation.parity_tolerance_points} points; anchor: `
        + `${LORA.dataset_metric_precommitments.metric_aggregation.anchor}. `
        + `Committed tasks: ${LORA.dataset_metric_precommitments.tasks
          .map((t) => `${t.task} (${t.primary_metric}; full FT reproduction target ${t.full_finetune_reproduction_target})`)
          .join('; ')}. `
        + `Secondary metrics: ${LORA.dataset_metric_precommitments.secondary_metrics.join('; ')}.`,
        `Baseline control checklist (v3): ${LORA.baseline_control_checklist
          .map((b) => `${b.baseline} [${b.obligation}] success: ${b.success_criterion}; on failure: ${b.on_failure}`)
          .join(' | ')}. Claim-control rule: ${LORA.baseline_claim_control_rule}`,
        `Reference implementation (intake context, v3): ${LORA.reference_implementation.note} `
        + `Code reference: ${LORA.reference_implementation.code_reference} `
        + `Config reference: ${LORA.reference_implementation.config_reference} `
        + `Known gap: ${LORA.reference_implementation.known_gap}`,
        `Staged route dependency (v3): ${LORA.staged_route_dependency.stage0_gate} `
        + `${LORA.staged_route_dependency.baseline_gate} `
        + `Confirmatory/exploratory boundary: ${LORA.staged_route_dependency.confirmatory_exploratory_boundary}`,
        ...kindFacts,
      ],
    },
    {
      source_ref: ref('literature_evidence_unit', T.litEvidence),
      evidence_kind: 'literature_evidence',
      content_summary:
        'Literature context from the topic package (adaptation-efficiency landscape at intake time).',
      key_facts: [...LORA.literature_context_key_facts],
    },
  ];
}

function routeArchitectureSlotPayload(spine) {
  const src = laneASources(spine);
  return {
    model_profile_id: PROFILE[SLOT.routeArchitecture],
    model_option_id: modelOptionId(PROFILE[SLOT.routeArchitecture]),
    target_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    target_version_id: `${T.inputSnapshot}@v1`,
    input_snapshot_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: src.refs,
    source_hashes: src.hashes,
    source_context_packets: laneAContextPackets([
      'Route candidates must answer the research question within the budget envelope; deployment-relevant '
      + 'metrics are task score, trainable parameter count, and inference latency.',
    ]),
    admitted_route_proposal_artifact_ref: null,
    admitted_route_proposal_artifact_hash: null,
    reviewed_candidate_keys: [],
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
  };
}

function routeSkepticSlotPayload(spine) {
  const src = laneASources(spine);
  return {
    model_profile_id: PROFILE[SLOT.routeSkeptic],
    model_option_id: modelOptionId(PROFILE[SLOT.routeSkeptic]),
    target_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    target_version_id: `${T.inputSnapshot}@v1`,
    input_snapshot_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: src.refs,
    source_hashes: src.hashes,
    source_context_packets: laneAContextPackets([
      'Critique dimensions must be grounded in this topic: low-rank hypothesis applicability boundary, '
      + 'baseline reproduction gaps (adapter latency, prefix-tuning stability), inference-latency trade-offs, '
      + 'and reproducibility within the single-GPU budget.',
    ]),
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    // admitted_route_proposal_artifact_ref/hash + reviewed_candidate_keys 由 coordinator 链内注入
  };
}

function cyclePlanningSlotPayload(spine) {
  const src = laneASources(spine);
  return {
    model_profile_id: PROFILE[SLOT.cyclePlanning],
    model_option_id: modelOptionId(PROFILE[SLOT.cyclePlanning]),
    target_ref: rref('technical_route_candidate', T.routeCandidate),
    target_version_id: `${T.routeCandidate}@v1`,
    input_snapshot_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: src.refs,
    source_hashes: src.hashes,
    source_context_packets: laneAContextPackets([
      'Validation cycles must operationalize the early check obligations: a low-rank feasibility probe at '
      + 'target model scale, and baseline reproducibility (full fine-tuning / adapter / prefix) before any '
      + 'comparative claim is planned.',
    ]),
    secondary_route_candidate_refs: [],
    preflight_blocker_codes: [],
    // admitted route/skeptic refs + reviewed_candidate_keys 由 coordinator 链内注入
  };
}

function feasibilitySlotPayload(spine) {
  const src = laneASources(spine);
  return {
    model_profile_id: PROFILE[SLOT.feasibility],
    model_option_id: modelOptionId(PROFILE[SLOT.feasibility]),
    target_ref: rref('validation_cycle_candidate', 'gs001_cycle_candidate_planned'),
    target_version_id: 'gs001_cycle_candidate_planned@v1',
    input_snapshot_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: src.refs,
    source_hashes: src.hashes,
    source_context_packets: laneAContextPackets([
      'Probe plans must fit the budget envelope (single-GPU, GLUE subset, max runtime '
      + `${LORA.budget_envelope.max_runtime}, retry budget ${LORA.budget_envelope.retry_budget}) and carry `
      + 'explicit stop conditions.',
    ]),
    secondary_route_candidate_refs: [],
    secondary_validation_cycle_refs: [],
    secondary_feasibility_probe_refs: [],
    preflight_blocker_codes: [],
    // admitted cycle/route/skeptic refs + reviewed_*_candidate_keys 由 coordinator 链内注入
  };
}

// ---------------------------------------------------------------------------
// flow sections
// ---------------------------------------------------------------------------
async function runBootstrapAndSpine(app) {
  const bootstrap = await inject(app, {
    stepId: 'bootstrap',
    method: 'POST',
    url: '/paper-implementation/projects/bootstrap',
    payload: {
      paper_project_bridge_id: T.bridge,
      bridge_payload_hash: handoff.bridge_payload_hash,
    },
    expectedStatus: 201,
  });
  const projectId = bootstrap.implementation_project.implementation_project_id;

  await inject(app, {
    stepId: 'spine-core-motive-draft',
    method: 'POST',
    url: projectUrl(projectId, '/core-motives/drafts'),
    payload: motiveDraftPayload(),
    expectedStatus: 201,
  });
  const motiveTrace = await inject(app, {
    stepId: 'spine-core-motive-trace',
    method: 'POST',
    url: projectUrl(projectId, '/trace-manifests'),
    payload: {
      target_ref: ref('core_motive_version', T.motiveVersion, 'v1'),
      lineage: literatureLineage(),
      integrity: {},
    },
    expectedStatus: 201,
  });
  await inject(app, {
    stepId: 'spine-core-motive-admit',
    method: 'POST',
    url: projectUrl(projectId, `/core-motives/${T.motive}/versions/${T.motiveVersion}/admit`),
    payload: { trace_manifest_id: motiveTrace.trace_manifest_id },
    expectedStatus: 200,
  });

  const boardTrace = await inject(app, {
    stepId: 'spine-board-trace',
    method: 'POST',
    url: projectUrl(projectId, '/trace-manifests'),
    payload: {
      target_ref: ref('motive_evidence_board_version', T.board, 'v1'),
      lineage: literatureLineage(),
      integrity: {},
    },
    expectedStatus: 201,
  });
  const bindingTraces = {};
  for (const bindingId of [T.bindingMotivationPressure, T.bindingLowRankOpportunity, T.bindingBaselineGap]) {
    const bindingTrace = await inject(app, {
      stepId: `spine-binding-trace-${bindingId}`,
      method: 'POST',
      url: projectUrl(projectId, '/trace-manifests'),
      payload: {
        target_ref: ref('evidence_binding', bindingId, 'v1'),
        lineage: literatureLineage(),
        integrity: {},
      },
      expectedStatus: 201,
    });
    bindingTraces[bindingId] = bindingTrace.trace_manifest_id;
  }
  await inject(app, {
    stepId: 'spine-motive-evidence-board',
    method: 'POST',
    url: projectUrl(projectId, '/motive-evidence-boards'),
    payload: boardPayload(boardTrace.trace_manifest_id, bindingTraces),
    expectedStatus: 201,
  });

  return {
    projectId,
    motiveTraceManifestId: motiveTrace.trace_manifest_id,
    boardTraceManifestId: boardTrace.trace_manifest_id,
  };
}

function laneSummary(result) {
  return {
    coordinator_run_id: result.run.coordinator_run_id,
    run_status: result.run.run_status,
    consumed: result.run.consumed,
    budget_envelope: result.run.budget_envelope,
    steps: result.steps.map((step) => ({
      step_index: step.step_index,
      slot_id: step.slot_id,
      node_attempt_id: step.node_attempt_id,
      outcome: step.outcome,
      provider_call_count: step.provider_call_count,
      blocker_codes: step.blocker_codes,
      runtime_artifact_id: step.runtime_artifact_id ?? null,
      runtime_artifact_hash: step.runtime_artifact_hash,
      selected_candidate_key: step.decision_record?.selected_candidate_key ?? null,
    })),
  };
}

/**
 * 推进一条 coordinator lane。
 * - waiting_review：如实记录停驻（review packet 呈现原始 disposition），随后至多一次
 *   不改载荷的 override re-advance（actor 记录；新 attempt 真跑 LLM，不伪造 disposition）。
 * - blocked：如实终止（有效终态）。上游提案正文由 coordinator 链内注入（S2-B B3），
 *   首跑时代偿用的手工队列回流补喂（resolveBlocked）已删除。
 */
async function runCoordinatorLane(app, projectId, laneKey, createBody) {
  const startedAt = Date.now();
  const created = await inject(app, {
    stepId: `${laneKey}-create`,
    method: 'POST',
    url: projectUrl(projectId, '/coordinator-runs'),
    payload: createBody,
    expectedStatus: 201,
  });
  const coordinatorRunId = created.coordinator_run_id;
  const advances = [];
  let advanceIndex = 0;
  let waitingResolves = 0;

  const advance = async (label, payload) => {
    advanceIndex += 1;
    const result = await inject(app, {
      stepId: `${laneKey}-advance-${advanceIndex}${label ? `-${label}` : ''}`,
      method: 'POST',
      url: projectUrl(projectId, `/coordinator-runs/${coordinatorRunId}/advance`),
      payload,
      expectedStatus: 202,
    });
    advances.push({ advance: advanceIndex, label: label || 'initial', run_status: result.run.run_status });
    return result;
  };

  let result = await advance('', { holder_id: `gs001_runner_${laneKey}` });

  for (;;) {
    if (result.run.run_status === 'waiting_review' && waitingResolves < 1) {
      const waitingStep = [...result.steps].reverse().find((step) => step.outcome === 'waiting_review');
      state.stops.push({
        lane: laneKey,
        kind: 'waiting_review',
        coordinator_run_id: coordinatorRunId,
        step_index: waitingStep?.step_index ?? null,
        slot_id: waitingStep?.slot_id ?? null,
        note: 'Semantic stop recorded honestly; one override re-advance follows (actor recorded, payload '
          + 'unchanged, new provider attempt — the disposition is never forged).',
        override_actor: 'gs001_human_override_reviewer',
      });
      await record(`${laneKey}-waiting-review-stop`, { coordinator_run: result.run, waiting_step: waitingStep ?? null });
      waitingResolves += 1;
      result = await advance('override', { holder_id: 'gs001_human_override_reviewer' });
      continue;
    }
    if (result.run.run_status === 'waiting_review') {
      state.stops.push({
        lane: laneKey,
        kind: 'waiting_review_terminal',
        coordinator_run_id: coordinatorRunId,
        note: 'Second attempt also stopped non-proceed; lane honestly terminated at the semantic stop.',
      });
      break;
    }
    break;
  }

  const summary = {
    ...laneSummary(result),
    advances,
    elapsed_ms: Date.now() - startedAt,
  };
  state.lanes[laneKey] = summary;
  state.totals.provider_calls += result.run.consumed.provider_calls;
  await record(`${laneKey}-final-state`, { run: result.run, steps: result.steps });
  return result;
}

async function fetchFinalArtifacts(app, projectId, label = 'main') {
  const byId = new Map();
  const body = await inject(app, {
    stepId: `fetch-final-runtime-artifacts-${label}`,
    method: 'GET',
    url: projectUrl(projectId, '/runtime-artifacts?artifact_scope=final'),
    expectedStatus: 200,
  });
  for (const item of body.items ?? []) {
    byId.set(item.runtime_artifact_id, item);
  }
  return byId;
}

function findPassedStep(laneKey, slotId) {
  const lane = state.lanes[laneKey];
  if (!lane) {
    return null;
  }
  return lane.steps.find((step) => step.slot_id === slotId && step.outcome === 'passed'
    && step.runtime_artifact_id && step.runtime_artifact_hash) ?? null;
}

const GAIN_LEVELS = new Set(['none', 'low', 'medium', 'high']);
const BASELINE_GAP = new Set(['not_applicable', 'open', 'resolved', 'accepted_risk']);
const PROBE_KINDS = new Set(['data_feasibility', 'route_feasibility', 'baseline_check', 'metric_sanity', 'cost_probe']);

async function materializeAcceptanceBridge(app, projectId, artifactsById) {
  const bridgeState = state.acceptance_bridge;
  bridgeState.transcription_notes = [];

  // --- TechnicalRouteCandidate（血缘=route_architecture admitted final） ---
  const routeStep = findPassedStep('lane-a-validation-planning', SLOT.routeArchitecture);
  if (!routeStep) {
    bridgeState.technical_route_candidate = { status: 'skipped', reason: 'route_architecture step did not pass.' };
  } else {
    const artifact = artifactsById.get(routeStep.runtime_artifact_id);
    const proposals = artifact?.artifact_payload?.route_candidate_proposals ?? [];
    const selected = proposals.find((item) => item.candidate_key === routeStep.selected_candidate_key) ?? proposals[0] ?? null;
    if (!selected) {
      bridgeState.technical_route_candidate = { status: 'skipped', reason: 'No route candidate proposal found in the admitted final artifact.' };
    } else {
      const gain = GAIN_LEVELS.has(selected.expected_information_gain) ? selected.expected_information_gain : 'medium';
      if (gain !== selected.expected_information_gain) {
        bridgeState.transcription_notes.push(
          `route candidate expected_information_gain "${String(selected.expected_information_gain)}" is free text; `
          + 'deterministically mapped to enum "medium" for the authority object (original kept in review packet).',
        );
      }
      const routeTrace = await inject(app, {
        stepId: 'bridge-route-candidate-trace',
        method: 'POST',
        url: projectUrl(projectId, '/trace-manifests'),
        payload: {
          target_ref: ref('technical_route_candidate', T.routeCandidate, 'v1'),
          lineage: {
            ...emptyTraceLineage(),
            decision: {
              ...emptyTraceLineage().decision,
              human_decision_refs: [ref('human_decision', T.humanDecisionRouteAccept)],
            },
          },
          integrity: {},
        },
        expectedStatus: 201,
      });
      const created = await inject(app, {
        stepId: 'bridge-technical-route-candidate',
        method: 'POST',
        url: projectUrl(projectId, '/technical-route-candidates'),
        payload: {
          route_candidate_id: T.routeCandidate,
          motive_id: T.motive,
          core_motive_version_id: T.motiveVersion,
          route_summary: selected.route_summary,
          route_status: 'proposed',
          expected_information_gain: gain,
          baseline_gap_status: BASELINE_GAP.has(selected.baseline_gap_status) ? selected.baseline_gap_status : 'open',
          primary_metric_refs: (selected.metric_refs?.length ? selected.metric_refs : [ref('metric', T.metricGlue)]),
          secondary_metric_refs: [ref('metric', T.metricTrainableParams), ref('metric', T.metricInferenceLatency)],
          dataset_version_refs: selected.dataset_refs?.length ? selected.dataset_refs : [ref('dataset_version', T.datasetGlueSubset)],
          baseline_version_refs: selected.baseline_refs?.length
            ? selected.baseline_refs
            : [ref('baseline_version', T.baselineFullFinetune), ref('baseline_version', T.baselineAdapter), ref('baseline_version', T.baselinePrefix)],
          code_version_refs: selected.code_refs?.length ? selected.code_refs : [ref('code_version', T.codeHfRoberta)],
          config_refs: selected.config_refs?.length ? selected.config_refs : [ref('config', T.configAdaptation)],
          confirmatory_marker: Boolean(selected.confirmatory_marker),
          trace_manifest_id: routeTrace.trace_manifest_id,
          source_proposal_artifact_ref: {
            ref_type: 'paper_implementation_runtime_artifact',
            ref_id: routeStep.runtime_artifact_id,
            title_card_id: null,
            version_id: null,
          },
          source_proposal_artifact_hash: routeStep.runtime_artifact_hash,
          created_by: 'human',
        },
        expectedStatus: 201,
      });
      bridgeState.technical_route_candidate = {
        status: 'created',
        route_candidate_id: created.route_candidate_id,
        selected_candidate_key: routeStep.selected_candidate_key,
        source_proposal_artifact_id: routeStep.runtime_artifact_id,
        source_proposal_artifact_hash: routeStep.runtime_artifact_hash,
      };
    }
  }

  // --- FeasibilityProbe（血缘=feasibility_planning admitted final） ---
  const feasibilityStep = findPassedStep('lane-a-validation-planning', SLOT.feasibility);
  if (!feasibilityStep) {
    bridgeState.feasibility_probe = { status: 'skipped', reason: 'feasibility_planning step did not pass (lane stopped earlier).' };
  } else {
    const artifact = artifactsById.get(feasibilityStep.runtime_artifact_id);
    const proposals = artifact?.artifact_payload?.probe_plan_candidate_proposals ?? [];
    const selected = proposals[0] ?? null;
    if (!selected) {
      bridgeState.feasibility_probe = { status: 'skipped', reason: 'No probe plan proposal found in the admitted final artifact.' };
    } else {
      const probeKind = PROBE_KINDS.has(selected.probe_kind) ? selected.probe_kind : 'route_feasibility';
      if (probeKind !== selected.probe_kind) {
        bridgeState.transcription_notes.push(
          `probe_kind "${String(selected.probe_kind)}" not in enum; deterministically mapped to "route_feasibility".`,
        );
      }
      const probeTrace = await inject(app, {
        stepId: 'bridge-feasibility-probe-trace',
        method: 'POST',
        url: projectUrl(projectId, '/trace-manifests'),
        payload: {
          target_ref: ref('feasibility_probe', T.feasibilityProbe, 'v1'),
          lineage: {
            ...emptyTraceLineage(),
            experiment: {
              ...emptyTraceLineage().experiment,
              metric_refs: [ref('metric', T.metricGlue)],
            },
            decision: {
              ...emptyTraceLineage().decision,
              human_decision_refs: [ref('human_decision', T.humanDecisionProbeAccept)],
            },
          },
          integrity: {},
        },
        expectedStatus: 201,
      });
      const created = await inject(app, {
        stepId: 'bridge-feasibility-probe',
        method: 'POST',
        url: projectUrl(projectId, '/feasibility-probes'),
        payload: {
          probe_id: T.feasibilityProbe,
          probe_kind: probeKind,
          probe_question: selected.probe_question,
          probe_status: 'proposed',
          expected_information_gain: GAIN_LEVELS.has(selected.expected_information_gain) ? selected.expected_information_gain : 'medium',
          baseline_gap_status: BASELINE_GAP.has(selected.baseline_gap_status) ? selected.baseline_gap_status : 'open',
          primary_metric_refs: selected.primary_metric_refs?.length ? selected.primary_metric_refs : [ref('metric', T.metricGlue)],
          dataset_version_refs: selected.dataset_version_refs?.length ? selected.dataset_version_refs : [ref('dataset_version', T.datasetGlueSubset)],
          baseline_version_refs: selected.baseline_version_refs ?? [],
          code_version_refs: selected.code_version_refs?.length ? selected.code_version_refs : [ref('code_version', T.codeHfRoberta)],
          config_refs: selected.config_refs ?? [],
          confirmatory_marker: Boolean(selected.confirmatory_marker),
          trace_manifest_id: probeTrace.trace_manifest_id,
          source_proposal_artifact_ref: {
            ref_type: 'paper_implementation_runtime_artifact',
            ref_id: feasibilityStep.runtime_artifact_id,
            title_card_id: null,
            version_id: null,
          },
          source_proposal_artifact_hash: feasibilityStep.runtime_artifact_hash,
          created_by: 'human',
        },
        expectedStatus: 201,
      });
      bridgeState.feasibility_probe = {
        status: 'created',
        probe_id: created.probe_id,
        source_proposal_artifact_id: feasibilityStep.runtime_artifact_id,
        source_proposal_artifact_hash: feasibilityStep.runtime_artifact_hash,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// review packet
// ---------------------------------------------------------------------------
const NODE_REVIEW_SPECS = [
  {
    label: 'motive decomposition（assertion 候选）',
    lane: 'lane-motive', slot: SLOT.motiveDecomposition,
    groundTruth: 'ground-truth.md §GT-1/§GT-2（动机与路线空间的贴合度）+ 幻觉对照速查',
    rubricRow: 'motive decomposition（assertion 候选）',
  },
  {
    label: 'motive evolution（决策支持）',
    lane: 'lane-motive', slot: SLOT.motiveEvolution,
    groundTruth: 'ground-truth.md §GT-5/§GT-6（结论边界与局限意识）',
    rubricRow: 'motive evolution（决策支持）',
  },
  {
    label: 'board curation（binding/gap 候选）',
    lane: 'lane-board-curation', slot: SLOT.boardCuration,
    groundTruth: 'ground-truth.md §GT-3（缺什么证据）+ 幻觉对照速查',
    rubricRow: 'board curation（binding/gap 候选）',
  },
  {
    label: 'route 候选（route_architecture）',
    lane: 'lane-a-validation-planning', slot: SLOT.routeArchitecture,
    groundTruth: 'ground-truth.md §GT-1（论文实际路线）/§GT-2（路线空间）',
    rubricRow: 'route 候选（route_architecture）',
  },
  {
    label: 'skeptic 批判（route_skeptic_review）',
    lane: 'lane-a-validation-planning', slot: SLOT.routeSkeptic,
    groundTruth: 'ground-truth.md §GT-2（基线代价）/§GT-6（已知局限）',
    rubricRow: 'skeptic 批判（route_skeptic_review）',
  },
  {
    label: 'cycle 候选（validation_cycle_planning）',
    lane: 'lane-a-validation-planning', slot: SLOT.cyclePlanning,
    groundTruth: 'ground-truth.md §GT-3（关键实验）/§GT-4（消融）',
    rubricRow: 'cycle 候选（validation_cycle_planning）',
  },
  {
    label: 'probe/plan 候选（feasibility_planning）',
    lane: 'lane-a-validation-planning', slot: SLOT.feasibility,
    groundTruth: 'ground-truth.md §GT-4（r 扫描/作用矩阵即典型 probe 形态）',
    rubricRow: 'probe/plan 候选（feasibility_planning）',
  },
];

function fenceJson(value) {
  return '```json\n' + JSON.stringify(value ?? null, null, 2) + '\n```';
}

async function writeReviewPacket(artifactsById) {
  const lines = [];
  lines.push(`# GS-001 Review Packet — ${runId}`);
  lines.push('');
  lines.push('一句话导读：这是 LoRA 测试选题包经真实 bootstrap + coordinator（provider_llm 真跑）产出的');
  lines.push('全链人审包——请拿同目录素材 `ground-truth.md` 对照逐节点 LLM 原始产出，按 `rubric.md` 四维打分。');
  lines.push('');
  lines.push('## 运行元数据');
  lines.push('');
  lines.push(`- runner: ${RUNNER_ID}@${RUNNER_VERSION}，scenario: ${SCENARIO_ID}`);
  lines.push(`- run id: ${runId}；日期: ${state.started_at}`);
  lines.push(`- provider: ${providerId}；run_mode: ${RUN_MODE}（全 lane 一致，orchestrator 侧统一映射 acceptance 实跑）；`
    + `execution_mode: ${EXECUTION_MODE}`);
  lines.push(`- 素材: .ai/golden-scenarios/paper-implementation/gs-001-lora/（topic-package.mjs **v3**（run 004 复评 RF-* 修订：自包含探针判据 + 吸收 warning）/ ground-truth.md（含 §GT-7 v3 预承诺对照）/ rubric.md）`);
  lines.push(`- 入链: 真实 POST /paper-implementation/projects/bootstrap（bridge ${T.bridge}，hash 校验通过）`);
  lines.push('');
  lines.push('## 逐节点产出与对照');
  for (const spec of NODE_REVIEW_SPECS) {
    const lane = state.lanes[spec.lane];
    const steps = (lane?.steps ?? []).filter((step) => step.slot_id === spec.slot);
    lines.push('');
    lines.push(`### ${spec.label}`);
    lines.push('');
    lines.push(`- ground truth 对照: ${spec.groundTruth}`);
    lines.push(`- rubric 评分行: ${spec.rubricRow}`);
    if (steps.length === 0) {
      lines.push(`- 结局: 未执行（lane ${spec.lane} ${lane ? `终态 ${lane.run_status}` : '未运行'}）——评分行记 n/a`);
      continue;
    }
    for (const step of steps) {
      lines.push(`- attempt \`${step.node_attempt_id}\`: outcome=${step.outcome}, provider_calls=${step.provider_call_count}, `
        + `blockers=[${step.blocker_codes.join(', ')}]`);
      if (step.selected_candidate_key) {
        lines.push(`- CandidateSelectionPolicy@v1 选中 candidate_key: \`${step.selected_candidate_key}\``);
      }
      const artifact = step.runtime_artifact_id ? artifactsById.get(step.runtime_artifact_id) : null;
      if (artifact) {
        lines.push(`- admitted final artifact: \`${step.runtime_artifact_id}\` (hash \`${step.runtime_artifact_hash}\`)`);
        lines.push('');
        lines.push('原始 LLM 产出（admitted final artifact payload，未裁剪）：');
        lines.push(fenceJson(artifact.artifact_payload));
      } else {
        lines.push('- 该 attempt 无 admitted final artifact（blocked/failed/waiting——原始细节见对应 JSON 落盘文件）。');
      }
    }
    const laneDecision = (lane?.steps ?? []).find((step) => step.slot_id === spec.slot && step.selected_candidate_key);
    if (laneDecision) {
      lines.push('');
      lines.push('决策记录（确定性 CandidateSelectionPolicy@v1，coordinator step 落盘 JSON 内含完整投影）。');
    }
  }
  lines.push('');
  lines.push('## 受理物化（acceptance bridge）');
  lines.push('');
  lines.push(fenceJson(state.acceptance_bridge));
  lines.push('');
  lines.push('## 停驻与缺口（如实呈现，停驻本身是有效结果）');
  lines.push('');
  lines.push(fenceJson({ stops: state.stops, gaps: state.gaps }));
  lines.push('');
  lines.push('## S5 期间实证的产品侧发现（runner 未改产品语义）');
  lines.push('');
  lines.push(fenceJson(KNOWN_PRODUCT_FINDINGS));
  lines.push('');
  lines.push('## 运行统计');
  lines.push('');
  const laneStats = Object.fromEntries(Object.entries(state.lanes).map(([key, lane]) => [key, {
    run_status: lane.run_status,
    consumed: lane.consumed,
    budget_envelope: lane.budget_envelope,
    elapsed_ms: lane.elapsed_ms,
    step_outcomes: lane.steps.map((step) => `${step.slot_id}:${step.outcome}(${step.provider_call_count} calls)`),
    advances: lane.advances,
  }]));
  lines.push(fenceJson({
    total_provider_calls: state.totals.provider_calls,
    lanes: laneStats,
    decision_work_queue_items: state.decision_work_queue ?? [],
    http_steps: state.steps.length,
  }));
  lines.push('');
  const packetPath = path.join(ARTIFACT_DIR, 'review-packet.md');
  await fs.writeFile(packetPath, `${lines.join('\n')}\n`);
  return packetPath;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  const gateway = new BackendLlmGateway({ defaultTimeoutMs: 300_000, defaultMaxRetries: 0 });
  const app = buildApp({
    paperImplementationRepository: new InMemoryPaperImplementationRepository(),
    paperImplementationMotiveRepository: new InMemoryPaperImplementationMotiveRepository(),
    paperImplementationTraceRepository: new InMemoryPaperImplementationTraceRepository(),
    paperImplementationValidationRepository: new InMemoryPaperImplementationValidationRepository(),
    paperImplementationWorkOrderRepository: new InMemoryPaperImplementationWorkOrderRepository(),
    paperImplementationResultClaimDossierRepository: new InMemoryPaperImplementationResultClaimDossierRepository(),
    paperImplementationAiWorkflowHarnessRepository: new InMemoryPaperImplementationAiWorkflowHarnessRepository(),
    paperImplementationRuntimeRepository: new InMemoryPaperImplementationRuntimeRepository(),
    paperImplementationCoordinatorRepository: new InMemoryPaperImplementationCoordinatorRepository(),
    paperImplementationHumanConfirmationRepository: new InMemoryPaperImplementationHumanConfirmationRepository(),
    paperImplementationBridgeService: new Gs001BridgeService(),
    // 全部 paper-implementation orchestrator 的 llmGateway 回退链都收敛到此注入点
    paperImplementationTraceIntegrityDebateLlmGateway: gateway,
  });

  let spine = null;
  try {
    try {
      spine = await runBootstrapAndSpine(app);
    } catch (error) {
      registerGap('bootstrap-and-spine', error, 'Fatal: everything downstream depends on the spine.');
      state.status = 'failed';
      return;
    }
    const projectId = spine.projectId;
    const bundle = motiveLaneSourceBundle(spine);

    // 3) coordinator lane motive（decomposition → evolution）
    try {
      await runCoordinatorLane(app, projectId, 'lane-motive', {
        coordinator_run_id: 'gs001_coordinator_run_motive',
        lane_id: 'motive',
        run_mode: RUN_MODE,
        execution_mode: EXECUTION_MODE,
        budget_envelope: { max_steps: 4, max_provider_calls: 12 },
        slot_request_payloads: {
          [SLOT.motiveDecomposition]: motiveDecompositionSlotPayload(spine, bundle),
          [SLOT.motiveEvolution]: motiveEvolutionSlotPayload(spine, bundle),
        },
      });
    } catch (error) {
      registerGap('lane-motive', error);
    }

    // 4) board 单步 pipeline（evidence_board_curation）
    try {
      await runCoordinatorLane(app, projectId, 'lane-board-curation', {
        coordinator_run_id: 'gs001_coordinator_run_board',
        lane_id: 'evidence-board-curation',
        run_mode: RUN_MODE,
        execution_mode: EXECUTION_MODE,
        budget_envelope: { max_steps: 4, max_provider_calls: 12 },
        slot_request_payloads: {
          [SLOT.boardCuration]: boardCurationSlotPayload(spine),
        },
      });
    } catch (error) {
      registerGap('lane-board-curation', error);
    }

    // 5) coordinator lane A（route→skeptic→cycle→feasibility）
    try {
      await runCoordinatorLane(app, projectId, 'lane-a-validation-planning', {
        coordinator_run_id: 'gs001_coordinator_run_lane_a',
        lane_id: 'validation-planning',
        run_mode: RUN_MODE,
        execution_mode: EXECUTION_MODE,
        // max_steps 12 = 4 链步 + waiting_review override re-advance 的 attempt 余量
        // （每次 re-advance 产生新 step 行）。上游提案正文由 coordinator 链内注入
        // （S2-B B3），不再需要 runner 侧队列回流补喂。
        budget_envelope: { max_steps: 12, max_provider_calls: 12 },
        slot_request_payloads: {
          [SLOT.routeArchitecture]: routeArchitectureSlotPayload(spine),
          [SLOT.routeSkeptic]: routeSkepticSlotPayload(spine),
          [SLOT.cyclePlanning]: cyclePlanningSlotPayload(spine),
          [SLOT.feasibility]: feasibilitySlotPayload(spine),
        },
      });
    } catch (error) {
      registerGap('lane-a-validation-planning', error);
    }

    // 6) 受理桥物化 + 观测收尾
    let artifactsById = new Map();
    try {
      artifactsById = await fetchFinalArtifacts(app, projectId);
    } catch (error) {
      registerGap('fetch-final-artifacts', error);
    }
    try {
      await materializeAcceptanceBridge(app, projectId, artifactsById);
    } catch (error) {
      registerGap('acceptance-bridge', error);
    }
    try {
      const queue = await inject(app, {
        stepId: 'fetch-decision-work-queue',
        method: 'GET',
        url: projectUrl(projectId, '/decision-work-queue'),
        expectedStatus: 200,
      });
      state.decision_work_queue = (queue.items ?? []).map((item) => ({
        queue_item_id: item.queue_item_id,
        queue_type: item.queue_type,
        status: item.status,
        dedup_key: item.dedup_key,
        source_step_index: item.source_step_index ?? null,
      }));
    } catch (error) {
      registerGap('fetch-decision-work-queue', error);
    }

    // 7) review packet
    try {
      state.review_packet_path = path.relative(REPO_ROOT, await writeReviewPacket(artifactsById));
    } catch (error) {
      registerGap('review-packet', error);
    }

    const laneStatuses = Object.values(state.lanes).map((lane) => lane.run_status);
    const allCompleted = laneStatuses.length === 3 && laneStatuses.every((status) => status === 'completed');
    const bridgeCreated = state.acceptance_bridge.technical_route_candidate?.status === 'created'
      && state.acceptance_bridge.feasibility_probe?.status === 'created';
    state.status = state.gaps.length === 0 && allCompleted && bridgeCreated ? 'completed' : 'partial';
  } finally {
    await app.close();
  }
}

try {
  await main();
} catch (error) {
  state.status = 'failed';
  registerGap('main', error);
} finally {
  state.finished_at = new Date().toISOString();
  const summary = {
    runner_id: RUNNER_ID,
    runner_version: RUNNER_VERSION,
    scenario_id: SCENARIO_ID,
    run_id: runId,
    status: state.status,
    provider_id: providerId,
    total_provider_calls: state.totals.provider_calls,
    lanes: Object.fromEntries(Object.entries(state.lanes).map(([key, lane]) => [key, {
      run_status: lane.run_status,
      consumed: lane.consumed,
      step_outcomes: lane.steps.map((step) => `${step.slot_id}:${step.outcome}`),
    }])),
    acceptance_bridge: {
      technical_route_candidate: state.acceptance_bridge.technical_route_candidate?.status ?? 'not_run',
      feasibility_probe: state.acceptance_bridge.feasibility_probe?.status ?? 'not_run',
    },
    stops: state.stops,
    gaps: state.gaps,
    review_packet: state.review_packet_path ?? null,
    artifact_dir: path.relative(REPO_ROOT, ARTIFACT_DIR),
    started_at: state.started_at,
    finished_at: state.finished_at,
  };
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
  await fs.writeFile(path.join(ARTIFACT_DIR, '90-summary.json'), `${JSON.stringify({ ...summary, state }, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(state.status === 'failed' ? 1 : 0);
}
