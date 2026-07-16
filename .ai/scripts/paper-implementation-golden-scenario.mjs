#!/usr/bin/env node
/**
 * T-124 golden scenario runner — 全链到 dossier ready（G1；S5 前半链 + G1 后半链）。
 *
 * 场景参数化（G1.1）：`--scenario <dir-name>`（或 env PAPER_IMPLEMENTATION_GOLDEN_SCENARIO，
 * 默认 gs-001-lora 向后兼容）指向 .ai/golden-scenarios/paper-implementation/<dir>/。
 * 素材导出契约（topic-package.mjs 必须导出，详见 gs-001 素材文件尾部注释）：
 *   sha256Hex / SCENARIO_META / SCENARIO_IDS / SCENARIO_CONTENT / makeBridgeHandoff /
 *   EXPERIMENT_RESULTS / CLAIM_GROUND_TRUTH / makeBackHalfFixtures(refs)。
 *
 * 前半链（S5，LIVE 专属）：真实 bootstrap 路由（bridge handoff，不开测试后门）→ 确定性脊柱
 * （CoreMotiveDraft → trace → admit → MotiveEvidenceBoardVersion）→ coordinator
 * lane `motive` / 单步 board pipeline / lane A（route→skeptic→cycle→feasibility），
 * execution_mode='provider_llm'、run_mode='dry_run'（orchestrator 映射 acceptance）
 * → 受理桥物化（TechnicalRouteCandidate / FeasibilityProbe，带 source_proposal_artifact_ref 血缘）。
 *
 * 后半链（G1.2，live 与 smoke 共用）：ValidationCycle draft+admit → ExperimentPlanLight →
 * ResearchWorkOrder draft → trace gate evaluate（enforced）→ admit → acceptance 假体实验
 * （素材 EXPERIMENT_RESULTS 论文真实数字经 harness-run + run-monitor-intake 产出 trusted
 * RunEvidenceUnit，不伪造 provider 调用）→ result_analysis slot → Domain Gate 物化
 * ResultInterpretationPacket → ClaimTracePacket → 四点集停驻#2（强 claim 人工确认，
 * override actor=gs 记录员，经真实 /human-confirmations 路由）→ claim_boundary debate →
 * 物化 ClaimCandidate（产品消费确认记录）→ readiness trace gate → dossier_readiness debate
 * → 物化 ImplementationDossier（产品侧 N7 项目级 REU 对账 enforced）→ **dossier ready =
 * export 停驻（四点集#3，runner 终点，不产 WritingEntryPacket）** → 血缘断言节
 * （dossier→claim→packet→REU→WO→probe→route 逐环 ref 机器回溯，失败=GAP）。
 *
 * 双模式：
 * - LIVE（PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1）：全链 provider_llm（G4 验收面）。
 * - SMOKE（PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_SMOKE=1）：脊柱 + 后半链结构冒烟，
 *   三个后半链 slot 用素材 mocked_llm 夹具（run_mode='mock'），零 provider 调用零 key；
 *   provider lanes 与受理桥如实跳过并在 summary/review packet 里声明。
 *
 * 接线模板：
 * - live provider 接线镜像 near-prod gate（buildApp + BackendLlmGateway + 注册 profile
 *   解析：TopicSelectionAgentOrchestratorService → BackendLlmGateway；后半链三 slot 走
 *   同一 gateway 注入点的回退链）；
 * - 领域播种镜像 v1-runnable-replay（in-memory 仓储 + 真实服务），StubBridgeService
 *   换成场景 handoff（素材 makeBridgeHandoff()）。
 *
 * 失败处理：任何 step blocked/失败如实落盘并继续能继续的部分；summary.status ∈
 * completed|partial|failed，绝不静默吞。skeptic waiting_review 停驻如实记录；
 * （记录后）以一次不改载荷的 override re-advance 继续（override 含 actor 记录），
 * 仍停驻则如实终止该 lane——不伪造 disposition。后半链 slot 非 passed=诚实停链
 * （非四点集签核停驻，不 override）。
 *
 * (v8/G4.6 起后半链 domain_gate_request 为服务侧组装；历史注记) 后半链 slot 的 domain_gate_request
 * 需 provider LLM 从 source_refs 逐字转写 runner 侧结构 id（trace manifest / gate result /
 * claim trace packet / human confirmation）；转写漂移会被 Domain Gate 400/409 拒绝——
 * 如实记 GAP，不改产品语义。
 *
 * 运行（仓库根）：不带 env gate 直接运行会打印 usage 后无副作用退出。
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUNNER_ID = 'paper-implementation-golden-scenario';
// v7 (T-124 G4.5): back-half source-body injection (hash-fenced
// source_context_packets + materialized packet/claim readback), experiment-v2
// cutover pinned OFF inline, and front-half spine content moved to the
// per-scenario SCENARIO_SPINE material export.
// v8 (T-124 G4.6): the three back-half slots assemble their Domain Gate
// requests SERVICE-SIDE from the request context — the runner now declares the
// pre-authorized structural refs (result packet / claim candidate / trace
// manifests / experiment plan / metrics) in source_refs, and the material
// fixtures carry SEMANTIC content blocks instead of full Create*Requests.
const RUNNER_VERSION = 't124-g1-golden-full-chain-v8';

// ---------------------------------------------------------------------------
// args (scenario selection + run identity)
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let scenarioId = process.env.PAPER_IMPLEMENTATION_GOLDEN_SCENARIO?.trim() || 'gs-001-lora';
let runIdArg = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--run-id' && args[i + 1]) {
    runIdArg = args[i + 1];
    i += 1;
  } else if (args[i].startsWith('--run-id=')) {
    runIdArg = args[i].slice('--run-id='.length);
  } else if (args[i] === '--scenario' && args[i + 1]) {
    scenarioId = args[i + 1];
    i += 1;
  } else if (args[i].startsWith('--scenario=')) {
    scenarioId = args[i].slice('--scenario='.length);
  }
}
if (!/^[A-Za-z0-9._-]+$/.test(scenarioId)) {
  console.error('--scenario may only contain letters, numbers, dot, underscore, and hyphen.');
  process.exit(1);
}
const SCENARIO_ID = scenarioId;
const SCENARIO_DIR = path.join(REPO_ROOT, '.ai/golden-scenarios/paper-implementation', SCENARIO_ID);
// runtime identifier prefix derived from the scenario (coordinator run ids, holder ids)
const SCEN = SCENARIO_ID.replace(/[^A-Za-z0-9_]/g, '_');

// ---------------------------------------------------------------------------
// mode gate: smoke (mocked_llm, no provider key — structural冒烟) OR
//            live (provider_llm, requires key — G4 full-chain live run).
// Exactly one of the two env gates must be set; without either, exit clean.
// ---------------------------------------------------------------------------
const SMOKE = process.env.PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_SMOKE === '1';
const LIVE = process.env.PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE === '1';
if (!SMOKE && !LIVE) {
  console.log(`Usage (from repo root):

  # Full-chain LIVE run (G4; provider_llm; front coordinator lanes + back half):
  PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_LIVE=1 \\
  node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \\
    .ai/scripts/paper-implementation-golden-scenario.mjs [--scenario gs-001-lora] [--run-id <id>]

  # Structural SMOKE run (mocked_llm; no provider key; spine + full back half deterministically):
  PAPER_IMPLEMENTATION_GOLDEN_SCENARIO_SMOKE=1 \\
  node --loader ./apps/backend/node_modules/ts-node/esm.mjs \\
    .ai/scripts/paper-implementation-golden-scenario.mjs [--scenario gs-001-lora] [--run-id <id>]

Neither gate set; exiting without side effects.
LIVE requires OPENAI_API_KEY (or DASHSCOPE_API_KEY with PAPER_IMPLEMENTATION_PROVIDER_CANARY_PROVIDER_ID=dashscope).
SMOKE needs no key and issues zero provider calls (material-supplied mocked role outputs).
Artifacts: .ai/.tmp/paper-implementation-golden-scenario/<run-id>/`);
  process.exit(0);
}
const MODE = SMOKE ? 'smoke' : 'live';
// Live maps run_mode=dry_run→acceptance in the orchestrator; smoke uses mock→test
// with mocked_llm role fixtures so the back half runs deterministically, no key.
const RUN_MODE = SMOKE ? 'mock' : 'dry_run';
const EXECUTION_MODE = SMOKE ? 'mocked_llm' : 'provider_llm';

let runId = runIdArg ?? `${SCENARIO_ID}-${MODE}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
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
// T-124 G4.5 追加 A (user-decided environment isolation): pin the experiment v2
// cutover OFF inline so the golden scenario always exercises the T-124 legacy
// product back-half path, regardless of what .env.local carries for T-132 local
// work. Inline assignment wins over --env-file (verified on run 010), and this
// hermetic in-memory app never touches the developer's .env.local. Revisit
// migrating the back half onto the v2 routing face once that surface stabilizes.
process.env.PAPER_IMPLEMENTATION_EXPERIMENT_V2_CUTOVER_COMMITTED = 'false';
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
// The provider key is only required for LIVE runs; SMOKE issues zero provider calls.
if (LIVE && !process.env[providerKeyName]?.trim()) {
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
const material = await import(pathToFileURL(path.join(SCENARIO_DIR, 'topic-package.mjs')).href);
const {
  SCENARIO_IDS: T,
  SCENARIO_CONTENT: LORA,
  SCENARIO_SPINE: SPINE,
  SCENARIO_META,
  makeBridgeHandoff,
  makeBackHalfFixtures,
  EXPERIMENT_RESULTS,
  CLAIM_GROUND_TRUTH,
  sha256Hex,
} = material;
// Back-compat alias so the front-half payload builders below keep their names.
const makeGs001BridgeHandoff = makeBridgeHandoff;

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
// RUN_MODE / EXECUTION_MODE are set at the top from MODE:
//   live  → dry_run / provider_llm  (orchestrator maps dry_run→acceptance)
//   smoke → mock    / mocked_llm    (material-supplied role fixtures, zero provider calls)
// (S2-B B2 fixed the motive-evolution dry_run→test map divergence, so the motive
// lane no longer needs a run_mode=replay workaround — every lane uses dry_run live.)

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
  // Observation-step gaps (fail-open telemetry/observability export failures).
  // Kept OUT of the terminal `status` formula so an observation step can never
  // change the terminal product — recorded here (and surfaced in the summary +
  // review packet) for visibility only.
  observability_gaps: [],
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

// Observation-step gap: an observability/telemetry export that failed
// fail-open. Recorded in a SEPARATE bucket so it is surfaced (summary +
// review packet) without inflating `state.gaps` — the terminal `status`
// formula reads `state.gaps` only, so an observation step can never downgrade
// a genuinely `completed` run to `partial` (fail-open: the observation step
// must not change the terminal product it merely observes).
function registerObservabilityGap(section, error, note) {
  const gap = {
    section,
    note: note ?? null,
    error: error instanceof StepFailure
      ? { step_id: error.stepId, status_code: error.statusCode, body: error.body }
      : { message: error instanceof Error ? `${error.name}: ${error.message}` : String(error) },
  };
  state.observability_gaps.push(gap);
  console.error(
    `[golden-scenario] OBSERVABILITY-GAP in ${section} (fail-open, does not affect status): `
    + `${JSON.stringify(gap.error).slice(0, 500)}`,
  );
}

// ---------------------------------------------------------------------------
// gs001 bridge stub (replaces the real topic-selection bridge provider; the
// bootstrap HTTP route itself stays fully real — no test backdoor)
// ---------------------------------------------------------------------------
class ScenarioBridgeService {
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
  const motivationPressure = SPINE.assertions.motivation_pressure;
  const technicalOpportunity = SPINE.assertions.technical_opportunity;
  const baselineGap = SPINE.assertions.baseline_gap;
  return {
    motive_id: T.motive,
    core_motive_version_id: T.motiveVersion,
    motive_contract: {
      short_name: SPINE.motive_short_name,
      motivation_claim: c.motive_hypothesis,
      problem_pressure: SPINE.motive_contract.problem_pressure,
      current_solution_insufficiency: SPINE.motive_contract.current_solution_insufficiency,
      unmet_or_failure_mechanism: SPINE.motive_contract.unmet_or_failure_mechanism,
      target_setting: SPINE.motive_contract.target_setting,
      expected_contribution_path: SPINE.motive_contract.expected_contribution_path,
      why_this_is_not_trivial: SPINE.motive_contract.why_this_is_not_trivial,
      why_existing_baselines_do_not_already_solve_it: SPINE.motive_contract.why_existing_baselines_do_not_already_solve_it,
      what_makes_this_researchable_now: SPINE.motive_contract.what_makes_this_researchable_now,
    },
    scope_contract: {
      included_scope: [...LORA.scope.included],
      excluded_scope: [...LORA.scope.excluded],
      non_goals: [...LORA.scope.non_goals],
    },
    falsification_contract: {
      invalidation_conditions: [...SPINE.falsification_contract.invalidation_conditions],
      weakening_conditions: [...SPINE.falsification_contract.weakening_conditions],
      minimum_evidence_to_continue: [...SPINE.falsification_contract.minimum_evidence_to_continue],
      decisive_negative_conditions: [...SPINE.falsification_contract.decisive_negative_conditions],
    },
    claim_boundary: {
      maximum_allowed_claim: SPINE.claim_boundary.maximum_allowed_claim,
      minimum_defensible_contribution_claim: SPINE.claim_boundary.minimum_defensible_contribution_claim,
      forbidden_overclaims: [...SPINE.claim_boundary.forbidden_overclaims],
      claim_types_allowed: [...SPINE.claim_boundary.claim_types_allowed],
    },
    source_refs: [ref('topic_package', T.topicPackage, 'v3')],
    assertions: [
      {
        assertion_id: T.assertionMotivationPressure,
        assertion_type: motivationPressure.assertion_type,
        assertion_text: motivationPressure.assertion_text,
        importance: { role: 'core', must_hold_for_motive_to_continue: motivationPressure.must_hold },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: [...motivationPressure.contradict],
          what_would_weaken_this: [...motivationPressure.weaken],
        },
        expected_initial_status: 'untested',
      },
      {
        assertion_id: T.assertionLowRankOpportunity,
        assertion_type: technicalOpportunity.assertion_type,
        assertion_text: technicalOpportunity.assertion_text,
        importance: { role: 'core', must_hold_for_motive_to_continue: technicalOpportunity.must_hold },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: [...technicalOpportunity.contradict],
          what_would_weaken_this: [...technicalOpportunity.weaken],
        },
        expected_initial_status: 'untested',
      },
      {
        assertion_id: T.assertionBaselineGap,
        assertion_type: baselineGap.assertion_type,
        assertion_text: baselineGap.assertion_text,
        importance: { role: 'core', must_hold_for_motive_to_continue: baselineGap.must_hold },
        validation_requirements: {
          minimum_support_level: 'weak',
          required_evidence_types: ['literature'],
          required_counter_evidence_check: true,
        },
        falsification: {
          what_would_contradict_this: [...baselineGap.contradict],
          what_would_weaken_this: [...baselineGap.weaken],
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
    scope: { dataset_scope: SPINE.board.binding_dataset_scope },
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
  const motivationPressure = SPINE.board.bindings.motivation_pressure;
  const technicalOpportunity = SPINE.board.bindings.technical_opportunity;
  const baselineGap = SPINE.board.bindings.baseline_gap;
  return {
    board_version_id: T.board,
    motive_id: T.motive,
    core_motive_version_id: T.motiveVersion,
    trace_manifest_id: boardTraceManifestId,
    board_summary: {
      current_support_summary: SPINE.board.summary.current_support_summary,
      current_challenge_summary: SPINE.board.summary.current_challenge_summary,
      unresolved_conflicts: [],
      board_gap_summary: SPINE.board.summary.board_gap_summary,
      next_evidence_needed: [...SPINE.board.summary.next_evidence_needed],
    },
    bindings: [
      bindingFor(
        T.bindingMotivationPressure,
        T.assertionMotivationPressure,
        motivationPressure.statement,
        motivationPressure.relevance,
        motivationPressure.limitation,
      ),
      bindingFor(
        T.bindingLowRankOpportunity,
        T.assertionLowRankOpportunity,
        technicalOpportunity.statement,
        technicalOpportunity.relevance,
        technicalOpportunity.limitation,
      ),
      bindingFor(
        T.bindingBaselineGap,
        T.assertionBaselineGap,
        baselineGap.statement,
        baselineGap.relevance,
        baselineGap.limitation,
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
        SPINE.assertions.motivation_pressure.decomposition_scope_summary,
      ),
      assertionPacket(
        T.assertionLowRankOpportunity,
        draft.assertions[1].assertion_text,
        SPINE.assertions.technical_opportunity.decomposition_scope_summary,
      ),
      assertionPacket(
        T.assertionBaselineGap,
        draft.assertions[2].assertion_text,
        SPINE.assertions.baseline_gap.decomposition_scope_summary,
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

  let result = await advance('', { holder_id: `${SCEN}_runner_${laneKey}` });

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
        override_actor: `${SCEN}_human_override_reviewer`,
      });
      await record(`${laneKey}-waiting-review-stop`, { coordinator_run: result.run, waiting_step: waitingStep ?? null });
      waitingResolves += 1;
      result = await advance('override', { holder_id: `${SCEN}_human_override_reviewer` });
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

/**
 * 运行时遥测基线导出（观测收尾，不改任何执行语义）。
 * 经 S4-A 三条只读遥测 GET 路由拉取本 run 遥测：
 *   - GET /runtime-telemetry/repaid-rate       → 项目级重付率聚合（= 本 run，仓储隔离）
 *   - GET /runtime-telemetry/runs              → 各 node_attempt run 概览
 *   - GET /runtime-telemetry/runs/:run_id      → 各 node_attempt run 明细（per_slot + records）
 * 写 telemetry-baseline.json 到 run 目录；调用方 fail-open（失败记 GAP 不阻断）。
 */
async function exportTelemetryBaseline(app, projectId) {
  const projectRepaidRate = await inject(app, {
    stepId: 'telemetry-repaid-rate',
    method: 'GET',
    url: projectUrl(projectId, '/runtime-telemetry/repaid-rate'),
    expectedStatus: 200,
  });
  const runsList = await inject(app, {
    stepId: 'telemetry-runs',
    method: 'GET',
    url: projectUrl(projectId, '/runtime-telemetry/runs'),
    expectedStatus: 200,
  });
  const runSummaries = runsList.runs ?? [];
  const runDetails = [];
  for (const summary of runSummaries) {
    const detail = await inject(app, {
      stepId: `telemetry-run-detail-${summary.run_id}`,
      method: 'GET',
      url: projectUrl(projectId, `/runtime-telemetry/runs/${encodeURIComponent(summary.run_id)}`),
      expectedStatus: 200,
    });
    runDetails.push(detail);
  }

  // shadow_tier 分布（record-only，不影响执行路径）：跨全部 record 计数，null 归入 'none'。
  const shadowTierDistribution = {};
  for (const detail of runDetails) {
    for (const rec of detail.records ?? []) {
      const key = rec.shadow_tier ?? 'none';
      shadowTierDistribution[key] = (shadowTierDistribution[key] ?? 0) + 1;
    }
  }

  const baseline = {
    runner_id: RUNNER_ID,
    runner_version: RUNNER_VERSION,
    scenario_id: SCENARIO_ID,
    run_id: runId,
    fetched_at: new Date().toISOString(),
    project_repaid_rate: projectRepaidRate,
    runs: runDetails,
    shadow_tier_distribution: shadowTierDistribution,
  };
  const baselinePath = path.join(ARTIFACT_DIR, 'telemetry-baseline.json');
  await fs.writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);

  // 人审包摘要用的紧凑投影（明细全量在 telemetry-baseline.json）。
  state.telemetry_baseline = {
    path: path.relative(REPO_ROOT, baselinePath),
    total_cost_usd: projectRepaidRate.total_cost_usd,
    repaid_cost_usd: projectRepaidRate.repaid_cost_usd,
    repaid_cost_rate: projectRepaidRate.repaid_cost_rate,
    provider_call_count: projectRepaidRate.provider_call_count,
    run_count: projectRepaidRate.run_count,
    per_slot: projectRepaidRate.per_slot ?? [],
    shadow_tier_distribution: shadowTierDistribution,
    runs: runDetails.map((detail) => ({
      run_id: detail.run_id,
      provider_call_count: detail.provider_call_count,
      total_cost_usd: detail.total_cost_usd,
      repaid_cost_usd: detail.repaid_cost_usd,
      repaid_cost_rate: detail.repaid_cost_rate,
    })),
  };
  return state.telemetry_baseline;
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
// back half (G1): WO 创建/admit → acceptance 假体实验（trusted REU，产品通道，
// 零 provider 伪造）→ result_analysis slot → Domain Gate 物化 packet →
// claim_boundary debate → 强 claim 人工确认停驻（四点集 #2，actor=gs 记录员）→
// 物化 ClaimCandidate → dossier_readiness debate → 物化 ImplementationDossier →
// dossier ready = export 停驻（四点集 #3，runner 终点）。
//
// 真实路由逐步（勘察结论，无测试后门）：
//   POST /validation-cycles/drafts + /trace-manifests + /validation-cycles/:id/admit
//   POST /experiment-plan-lights
//   POST /research-work-orders/drafts → POST /trace-gates/evaluate（enforced 档位）
//     → POST /research-work-orders/:id/admit
//   POST /research-work-orders/:id/harness-runs（登记假体 external job 身份，
//     external_job_hash = sha256(EXPERIMENT_RESULTS)——身份与数据段绑定）
//   POST /run-monitor-intakes（run_status=succeeded + 素材实验结果 ref/hash +
//     REU trace manifest）→ trusted RunEvidenceUnit（工单要求的 acceptance 通道；
//     实验本身不经 LLM，不伪造 provider 调用）
//   POST /runtime-slots/result-analysis-scenarios/run →
//     POST /runtime-artifacts/:id/materialize-domain-gate → ResultInterpretationPacket
//   POST /claim-trace-packets（claim_status=supported 的前置授权物）
//   停驻#2 → POST /human-confirmations（scope=strong_claim_acceptance，
//     confirmed_by_actor_type=human，actor id=gs 记录员）
//   POST /runtime-slots/claim-boundary-debate/run → materialize-domain-gate →
//     ClaimCandidate（产品侧消费并燃烧确认记录）
//   POST /trace-gates/evaluate（dossier readiness gate）
//   POST /runtime-slots/dossier-readiness-audit/run → materialize-domain-gate →
//     ImplementationDossier（ready_for_writing；产品侧 N7 项目级 REU 对账在此 enforced）
//
// T-124 G4.6：三个后半链 slot 的 domain_gate_request 改为服务侧确定性组装——
// 结构 id（packet/claim/dossier id、trace manifest、gate result、claim trace
// packet、human confirmation ref）全部由 runner 以 source_refs 声明、服务组装，
// LLM 只产出语义内容块（interpretation/reliability/claim_implications 或
// claim_proposal/dossier_proposal）。run 009/010/011 的信封回显失配面就此移除；
// 语义内容缺失/不完整仍走既有语义失败重试通道，如实记录不 override。
// ---------------------------------------------------------------------------

function backHalfExperimentLineage(spine, kind) {
  const lineage = emptyTraceLineage();
  lineage.literature.literature_evidence_refs = [ref('literature_evidence_unit', T.litEvidence)];
  lineage.literature.source_locator_refs = [ref('source_locator', T.sourceLocator)];
  lineage.decision.validation_cycle_refs = [ref('validation_cycle', T.validationCycle)];
  if (kind === 'experiment_plan' || kind === 'work_order' || kind === 'run_evidence') {
    lineage.experiment.metric_refs = [
      ref('metric', T.metricGlue),
      ref('metric', T.metricTrainableParams),
      ref('metric', T.metricInferenceLatency),
    ];
    lineage.artifact.dataset_refs = [ref('dataset_version', T.datasetGlueSubset)];
    lineage.artifact.baseline_refs = [ref('baseline_version', T.baselineFullFinetune), ref('baseline_version', T.baselineAdapter)];
    lineage.artifact.code_version_refs = [ref('code_version', T.codeHfRoberta)];
    lineage.artifact.config_refs = [ref('config', T.configAdaptation)];
  }
  if (kind === 'work_order' || kind === 'run_evidence') {
    lineage.experiment.experiment_plan_refs = [ref('experiment_plan_light', T.experimentPlan)];
  }
  if (kind === 'run_evidence') {
    lineage.experiment.work_order_refs = [ref('research_work_order', T.workOrder)];
    lineage.experiment.run_refs = [ref('external_training_job', T.externalJob)];
    lineage.experiment.run_evidence_refs = [ref('run_evidence_unit', T.runEvidenceUnit)];
  }
  if (kind === 'claim' || kind === 'dossier') {
    lineage.experiment.run_evidence_refs = [ref('run_evidence_unit', T.runEvidenceUnit)];
    lineage.experiment.result_packet_refs = [ref('result_interpretation_packet', T.resultPacket)];
    lineage.experiment.work_order_refs = [ref('research_work_order', T.workOrder)];
  }
  if (kind === 'result_packet') {
    lineage.experiment.run_evidence_refs = [ref('run_evidence_unit', T.runEvidenceUnit)];
    lineage.experiment.metric_refs = [ref('metric', T.metricGlue)];
    lineage.experiment.work_order_refs = [ref('research_work_order', T.workOrder)];
  }
  return lineage;
}

async function createBackHalfTrace(app, projectId, stepId, targetRef, lineage) {
  const created = await inject(app, {
    stepId,
    method: 'POST',
    url: projectUrl(projectId, '/trace-manifests'),
    payload: { target_ref: targetRef, lineage, integrity: {} },
    expectedStatus: 201,
  });
  return created.trace_manifest_id;
}

async function evaluateTraceGate(app, projectId, stepId, traceManifestId) {
  const gate = await inject(app, {
    stepId,
    method: 'POST',
    url: projectUrl(projectId, '/trace-gates/evaluate'),
    payload: { trace_manifest_id: traceManifestId },
    expectedStatus: 200,
  });
  if (gate.gate_status !== 'passed') {
    throw new StepFailure(stepId, 200, { gate_status: gate.gate_status, gate_result_id: gate.gate_result_id ?? null });
  }
  return gate.gate_result_id;
}

/** 1) 确定性授权脊柱：ValidationCycle draft+admit → ExperimentPlanLight → WO draft+gate+admit。 */
async function runBackHalfWorkOrder(app, projectId, spine, bridgeInfo) {
  const bh = state.back_half;
  const cycleTrigger = bridgeInfo?.probeCreated
    ? [ref('motive_evidence_board_version', T.board), ref('feasibility_probe', T.feasibilityProbe)]
    : [ref('motive_evidence_board_version', T.board)];
  const cycleRouteRefs = bridgeInfo?.routeCreated ? [ref('technical_route_candidate', T.routeCandidate)] : [];
  await inject(app, {
    stepId: 'bh-validation-cycle-draft',
    method: 'POST',
    url: projectUrl(projectId, '/validation-cycles/drafts'),
    payload: {
      validation_cycle_id: T.validationCycle,
      target: { target_type: 'core_motive_version', target_id: T.motiveVersion, target_version_id: '1' },
      trigger: { trigger_type: 'board_gap', trigger_refs: cycleTrigger },
      cycle_type: 'route_feasibility',
      validation_frame: {
        validation_question:
          'Does low-rank adaptation (r=8) reach task-metric parity with reproduced full fine-tuning on the '
          + 'committed GLUE subset within the pre-registered tolerance, at the probed RoBERTa-base scale?',
        assumptions_under_test: ['The adaptation delta has low intrinsic rank at the probed scale.'],
        assertions_under_test: [
          ref('motive_assertion', T.assertionLowRankOpportunity),
          ref('motive_assertion', T.assertionBaselineGap),
        ],
        decision_if_pass: 'Materialize the bounded parity interpretation and draft the claim.',
        decision_if_fail: 'Record the reproduction failure; parity claims for missed tasks are void.',
        decision_if_inconclusive: 'Retain inconclusive evidence and narrow the follow-up cycle.',
        expected_information_gain: 'high',
        why_this_cycle_now: 'Stage-0 probe passed and stage-1 baselines reproduced to target; the confirmatory matrix is due.',
      },
      context: {
        included_refs: {
          motive_version_refs: [ref('core_motive_version', T.motiveVersion, '1')],
          board_version_refs: [ref('motive_evidence_board_version', T.board)],
          evidence_refs: [ref('literature_evidence_unit', T.litEvidence)],
          route_refs: cycleRouteRefs,
          work_order_refs: [],
          result_packet_refs: [],
          experiment_plan_light_refs: [],
        },
        excluded_context_notes: [],
      },
      criteria: {
        pass_conditions: ['LoRA r=8 mean-over-repeats within 0.5 points of the reproduced full-FT anchor on all three committed tasks.'],
        fail_conditions: ['Any committed task misses parity, or a full-FT reproduction misses its pre-committed target (anchor void).'],
        inconclusive_conditions: ['Repeat variance prevents a stable mean within the repeat cap.'],
        stop_conditions: ['Stop when the 40 GPU-hour training ledger is exhausted.'],
        minimum_artifacts_required: ['trusted run evidence unit', 'result validation report'],
      },
      budget: {
        budget_id: T.validationBudget,
        max_runtime: LORA.budget_envelope.max_runtime,
        max_compute: LORA.budget_envelope.max_compute,
        max_human_review_count: 1,
        retry_budget: LORA.budget_envelope.retry_budget,
      },
    },
    expectedStatus: 201,
  });
  const cycleTraceId = await createBackHalfTrace(
    app, projectId, 'bh-validation-cycle-trace',
    ref('validation_cycle', T.validationCycle, 'v1'),
    (() => {
      const lineage = emptyTraceLineage();
      lineage.literature.literature_evidence_refs = [ref('literature_evidence_unit', T.litEvidence)];
      lineage.decision.human_decision_refs = [ref('human_decision', `${SCEN}_human_decision_cycle_admit`)];
      return lineage;
    })(),
  );
  await inject(app, {
    stepId: 'bh-validation-cycle-admit',
    method: 'POST',
    url: projectUrl(projectId, `/validation-cycles/${T.validationCycle}/admit`),
    payload: { trace_manifest_id: cycleTraceId },
    expectedStatus: 200,
  });

  const planTraceId = await createBackHalfTrace(
    app, projectId, 'bh-experiment-plan-trace',
    ref('experiment_plan_light', T.experimentPlan, 'v1'),
    backHalfExperimentLineage(spine, 'experiment_plan'),
  );
  await inject(app, {
    stepId: 'bh-experiment-plan-light',
    method: 'POST',
    url: projectUrl(projectId, '/experiment-plan-lights'),
    payload: {
      experiment_plan_light_id: T.experimentPlan,
      validation_cycle_id: T.validationCycle,
      run_mode: 'confirmatory',
      plan_summary:
        'Confirmatory matrix {LoRA r=8, full fine-tuning} x {SST-2, MRPC, CoLA}, mean over <=3 repeats per cell, '
        + 'stage-1 full-FT cells reused verbatim; latency measured under the committed protocol.',
      estimated_cost_class: 'medium',
      baseline_gap_status: 'resolved',
      primary_metric_refs: [ref('metric', T.metricGlue)],
      dataset_version_refs: [ref('dataset_version', T.datasetGlueSubset)],
      baseline_version_refs: [ref('baseline_version', T.baselineFullFinetune), ref('baseline_version', T.baselineAdapter)],
      code_version_refs: [ref('code_version', T.codeHfRoberta)],
      config_refs: [ref('config', T.configAdaptation)],
      budget_id: T.validationBudget,
      stop_condition_refs: [ref('stop_rule', T.stopRule)],
      trace_manifest_id: planTraceId,
    },
    expectedStatus: 201,
  });

  const woTraceId = await createBackHalfTrace(
    app, projectId, 'bh-work-order-trace',
    ref('research_work_order', T.workOrder, 'v1'),
    backHalfExperimentLineage(spine, 'work_order'),
  );
  await inject(app, {
    stepId: 'bh-work-order-draft',
    method: 'POST',
    url: projectUrl(projectId, '/research-work-orders/drafts'),
    payload: {
      work_order_id: T.workOrder,
      validation_cycle_id: T.validationCycle,
      experiment_plan_light_id: T.experimentPlan,
      run_type: 'confirmatory',
      run_policy: {
        run_policy_id: T.runPolicy,
        retry_budget: LORA.budget_envelope.retry_budget,
        stop_condition_refs: [ref('stop_rule', T.stopRule)],
        allowed_mutation_refs: [],
        autotune_policy: 'disabled',
      },
      experiment_bridge: {
        run_recipe_ref: ref('experiment_run_recipe', T.runRecipe, 'v1'),
        run_recipe_hash: hash({ kind: 'gs_run_recipe', tasks: EXPERIMENT_RESULTS.committed_tasks, method: 'lora_r8_vs_full_ft' }),
        version_lock_hash: hash({ kind: 'gs_version_lock', code: T.codeHfRoberta }),
        config_snapshot_hash: hash({ kind: 'gs_config_snapshot', config: T.configAdaptation }),
        materialization_result_ref: ref('training_task_materialization_result', `${T.runRecipe}_materialization`),
        materialization_result_hash: hash({ kind: 'gs_materialization_result', recipe: T.runRecipe }),
        training_task_spec_ref: ref('training_task_spec', `${T.runRecipe}_task_spec`),
        training_task_spec_hash: hash({ kind: 'gs_training_task_spec', recipe: T.runRecipe }),
        result_validation_policy_ref: ref('result_validation_policy', `${SCEN}_result_validation_policy_v1`),
      },
      trace_manifest_id: woTraceId,
    },
    expectedStatus: 201,
  });
  const admissionGateResultId = await evaluateTraceGate(
    app, projectId, 'bh-work-order-admission-gate', woTraceId,
  );
  await inject(app, {
    stepId: 'bh-work-order-admit',
    method: 'POST',
    url: projectUrl(projectId, `/research-work-orders/${T.workOrder}/admit`),
    payload: { admission_gate_result_id: admissionGateResultId },
    expectedStatus: 200,
  });
  bh.work_order = {
    status: 'admitted',
    work_order_id: T.workOrder,
    validation_cycle_id: T.validationCycle,
    experiment_plan_light_id: T.experimentPlan,
    trace_manifest_id: woTraceId,
    admission_gate_result_id: admissionGateResultId,
  };
  return { woTraceId, admissionGateResultId };
}

/** 2) acceptance 假体实验：harness run 登记 + run-monitor-intake → trusted REU。 */
async function runAcceptanceExperiment(app, projectId, spine, woInfo) {
  const bh = state.back_half;
  const externalJobRef = ref('external_training_job', T.externalJob);
  const externalJobHash = hash({ kind: 'gs_external_job', experiment_results: EXPERIMENT_RESULTS });
  await inject(app, {
    stepId: 'bh-harness-run-submit',
    method: 'POST',
    url: projectUrl(projectId, `/research-work-orders/${T.workOrder}/harness-runs`),
    payload: {
      idempotency_key: `${runId}_acceptance_attempt_001`,
      external_job_ref: externalJobRef,
      external_job_hash: externalJobHash,
      created_by: 'system',
    },
    expectedStatus: 201,
  });
  const reuTraceId = await createBackHalfTrace(
    app, projectId, 'bh-run-evidence-trace',
    ref('run_evidence_unit', T.runEvidenceUnit, 'v1'),
    (() => {
      const lineage = backHalfExperimentLineage(spine, 'run_evidence');
      lineage.decision.gate_result_refs = [ref('gate_result', woInfo.admissionGateResultId)];
      return lineage;
    })(),
  );
  const resultHash = hash({ kind: 'gs_experiment_result', results: EXPERIMENT_RESULTS });
  const reportHash = hash({
    kind: 'gs_result_validation_report',
    stage0: EXPERIMENT_RESULTS.stage0_probe,
    full_ft: EXPERIMENT_RESULTS.full_finetune_reproduction,
    matrix: EXPERIMENT_RESULTS.confirmatory_matrix,
  });
  const intake = await inject(app, {
    stepId: 'bh-run-monitor-intake-final',
    method: 'POST',
    url: projectUrl(projectId, '/run-monitor-intakes'),
    payload: {
      work_order_id: T.workOrder,
      run_evidence_unit_id: T.runEvidenceUnit,
      run_evidence_trace_manifest_id: reuTraceId,
      external_job_ref: externalJobRef,
      external_job_hash: externalJobHash,
      monitor_event_kind: 'result_available',
      run_status: EXPERIMENT_RESULTS.run_status,
      result_ref: ref('experiment_result', T.experimentResult),
      result_hash: resultHash,
      result_validation_report_ref: ref('result_validation_report', T.resultValidationReport),
      result_validation_report_hash: reportHash,
      evidence_candidate_refs: [],
      evidence_candidate_hashes: [],
      raw_payload: {
        source: 'gs_golden_scenario_acceptance_stub',
        note: 'Pre-set paper-real experiment results fed through the product run-monitor channel; no provider call involved.',
        experiment_results: EXPERIMENT_RESULTS,
      },
      created_by: 'system',
    },
    expectedStatus: 201,
  });
  if (!intake.run_evidence_unit || intake.run_evidence_unit.trusted_status !== 'trusted') {
    throw new StepFailure('bh-run-monitor-intake-final', 201, {
      reason: 'Run monitor intake did not produce a trusted RunEvidenceUnit.',
      run_evidence_unit: intake.run_evidence_unit ?? null,
    });
  }
  bh.acceptance_experiment = {
    status: 'trusted_reu_created',
    run_evidence_unit_id: intake.run_evidence_unit.run_evidence_unit_id,
    run_status: intake.run_evidence_unit.run_status,
    trusted_status: intake.run_evidence_unit.trusted_status,
    external_job_ref: externalJobRef,
    external_job_hash: externalJobHash,
    result_hash: resultHash,
    result_validation_report_hash: reportHash,
    trace_manifest_id: reuTraceId,
  };
  return { reuTraceId, resultHash, reportHash };
}

/** 共享：跑一个后半链 runtime slot（live=provider / smoke=mocked 素材夹具），再走 Domain Gate 物化。 */
async function runSlotAndMaterialize(app, projectId, input) {
  const bh = state.back_half;
  const run = await inject(app, {
    stepId: `${input.stepKey}-run`,
    method: 'POST',
    url: projectUrl(projectId, input.slotUrl),
    payload: input.payload,
    expectedStatus: 201,
  });
  const slotSummary = {
    run_id: run.run_id,
    slot_id: run.slot_id,
    status: run.status,
    provider_call_count: run.provider_call_count,
    blocker_codes: run.blocker_codes,
    warning_codes: run.warning_codes,
    final_runtime_artifact_id: run.final_runtime_artifact?.runtime_artifact_id ?? null,
    final_artifact_hash: run.final_runtime_artifact?.final_artifact_hash ?? null,
  };
  state.totals.provider_calls += run.provider_call_count ?? 0;
  bh[input.stateKey] = { slot: slotSummary, materialization: null };
  if (run.status !== 'passed' || !run.final_runtime_artifact) {
    // 诚实停驻：slot 语义停驻/失败不是四点集签核停驻，不 override，不物化。
    state.stops.push({
      lane: input.stepKey,
      kind: 'back_half_slot_non_passed',
      slot_id: run.slot_id,
      status: run.status,
      blocker_codes: run.blocker_codes,
      note: 'Back-half slot did not pass; recorded honestly and the chain stops here (no override).',
    });
    throw new StepFailure(`${input.stepKey}-run`, 201, {
      reason: `Slot ${run.slot_id} ended ${run.status}; back half honestly parked.`,
      blocker_codes: run.blocker_codes,
    });
  }
  const materialized = await inject(app, {
    stepId: `${input.stepKey}-materialize`,
    method: 'POST',
    url: projectUrl(projectId, `/runtime-artifacts/${encodeURIComponent(run.final_runtime_artifact.runtime_artifact_id)}/materialize-domain-gate`),
    payload: undefined,
    expectedStatus: [200, 201],
  });
  bh[input.stateKey].materialization = {
    status: materialized.status,
    domain_artifact_ref: materialized.domain_artifact_ref,
    domain_artifact_hash: materialized.domain_artifact_hash,
    runtime_artifact_id: materialized.runtime_artifact_id,
  };
  return { run, materialized };
}

function backHalfSlotBaseRequest(runSeed, profileId, targetRef, targetVersionId, sourceRefs) {
  const request = {
    run_id: `${runId}_${runSeed}`,
    run_mode: RUN_MODE,
    execution_mode: EXECUTION_MODE,
    model_profile_id: profileId,
    target_ref: targetRef,
    target_version_id: targetVersionId,
    input_snapshot_ref: rref('implementation_input_snapshot', T.inputSnapshot),
    input_snapshot_hash: workingCopyHash,
    source_refs: sourceRefs,
    source_hashes: sourceRefs.map((item) => hash(item.ref_id)),
    preflight_blocker_codes: [],
  };
  if (LIVE) {
    request.model_option_id = modelOptionId(profileId);
  }
  return request;
}

/**
 * T-124 G4.5 Fix 1: build a hash-fenced source-body packet for a back-half slot.
 * `backHalfSlotBaseRequest` declares source_hashes as hash(ref_id), so the fence
 * (packet.source_hash must equal the declared source_hash for that ref) holds by
 * construction here; the server re-verifies it.
 */
function backHalfContextPacket(sourceRef, evidenceKind, contentSummary, keyFacts) {
  return {
    source_ref: sourceRef,
    source_hash: hash(sourceRef.ref_id),
    evidence_kind: evidenceKind,
    content_summary: contentSummary,
    key_facts: keyFacts,
  };
}

/** Verbatim body facts of the acceptance experiment results (paper-real numbers). */
function experimentResultBodyFacts() {
  const matrix = EXPERIMENT_RESULTS.confirmatory_matrix
    .map((cell) => `${cell.task} ${cell.metric}: LoRA r=8 ${cell.lora_r8} vs full FT ${cell.full_ft} (delta ${cell.delta}, parity ${cell.parity})`)
    .join('; ');
  const fullFt = EXPERIMENT_RESULTS.full_finetune_reproduction
    .map((row) => `${row.task} ${row.metric} ${row.value} (target ${row.precommitted_target}, met ${row.target_met})`)
    .join('; ');
  return [
    `Run status: ${EXPERIMENT_RESULTS.run_status}. Committed tasks: ${EXPERIMENT_RESULTS.committed_tasks.join(', ')}; `
    + `parity tolerance ${EXPERIMENT_RESULTS.parity_tolerance_points} points; provenance ${EXPERIMENT_RESULTS.provenance}.`,
    `Stage-0 probe: ${EXPERIMENT_RESULTS.stage0_probe.note}`,
    `Full fine-tuning reproduction: ${fullFt}.`,
    `Confirmatory matrix (LoRA r=8 vs reproduced full fine-tuning): ${matrix}.`,
    `Resource: ${EXPERIMENT_RESULTS.resource.lora_trainable_parameters} vs ${EXPERIMENT_RESULTS.resource.full_finetune_trainable_parameters} `
    + `(${EXPERIMENT_RESULTS.resource.trainable_parameter_reduction}); inference latency: ${EXPERIMENT_RESULTS.resource.lora_added_inference_latency}.`,
    `Overall: ${EXPERIMENT_RESULTS.overall_note}`,
  ];
}

/** 3..9) result_analysis → packet → claim trace packet → 确认停驻 → claim debate →
 *  ClaimCandidate → readiness gate → dossier debate → ImplementationDossier → export 停驻。 */
async function runBackHalfInterpretationChain(app, projectId, spine, reuInfo) {
  const bh = state.back_half;

  // 3) result packet trace（Domain Gate 物化的确定性前置授权物）
  const resultPacketTraceId = await createBackHalfTrace(
    app, projectId, 'bh-result-packet-trace',
    ref('result_interpretation_packet', T.resultPacket, 'v1'),
    backHalfExperimentLineage(spine, 'result_packet'),
  );

  // 4) result_analysis slot（live provider / smoke 素材夹具）→ 物化 packet
  const resultFixtures = makeBackHalfFixtures({
    validationCycleId: T.validationCycle,
    experimentPlanLightId: T.experimentPlan,
    resultPacketTraceManifestId: resultPacketTraceId,
    claimTraceManifestId: 'pending',
    dossierTraceManifestId: 'pending',
    dossierReadinessGateResultId: 'pending',
    claimTracePacketId: 'pending',
    humanConfirmationRef: null,
  });
  // T-124 G4.6 structural context: the pre-authorized packet ref, experiment
  // plan, and metric refs join source_refs — the SERVICE assembles the
  // CreateResultInterpretationPacketRequest from them (never the LLM).
  const resultSources = [
    ref('run_evidence_unit', T.runEvidenceUnit),
    ref('result_validation_report', T.resultValidationReport),
    ref('experiment_result', T.experimentResult),
    ref('trace_manifest', resultPacketTraceId),
    ref('validation_cycle', T.validationCycle),
    ref('result_interpretation_packet', T.resultPacket),
    ref('experiment_plan_light', T.experimentPlan),
    // Metric refs come from the material's expected packet source (single truth).
    ...resultFixtures.domainGateRequests.resultInterpretationPacketRequest.source.metric_refs
      .map((metricRef) => ref(metricRef.ref_type, metricRef.ref_id)),
  ];
  const resultRequest = backHalfSlotBaseRequest(
    'result_analysis',
    'paper-implementation.result-analysis.interpretation-scenarios.v1',
    rref('validation_cycle', T.validationCycle),
    `${T.validationCycle}@v1`,
    resultSources,
  );
  if (SMOKE) {
    resultRequest.mocked_role_outputs = resultFixtures.resultAnalysisRoleOutputs;
  }
  // T-124 G4.5 Fix 1: inject the hash-fenced experiment-result bodies so the
  // (live) interpretation-scenario builder can produce a complete
  // domain_gate_request instead of a content-starved conditional skeleton.
  const experimentFacts = experimentResultBodyFacts();
  resultRequest.source_context_packets = [
    backHalfContextPacket(
      ref('run_evidence_unit', T.runEvidenceUnit), 'run_evidence_unit',
      'Trusted run evidence unit from the acceptance experiment (paper-real confirmatory result set).',
      experimentFacts,
    ),
    backHalfContextPacket(
      ref('result_validation_report', T.resultValidationReport), 'result_validation_report',
      'Result validation report: stage-0 gate outcome, full fine-tuning reproduction targets, and confirmatory parity per task.',
      experimentFacts,
    ),
    backHalfContextPacket(
      ref('experiment_result', T.experimentResult), 'experiment_result',
      'Experiment result set (arXiv:2106.09685 Table 2, RoBERTa-base) fed through the product acceptance channel.',
      experimentFacts,
    ),
  ];
  const resultAnalysis = await runSlotAndMaterialize(app, projectId, {
    stepKey: 'bh-result-analysis',
    stateKey: 'result_analysis',
    slotUrl: '/runtime-slots/result-analysis-scenarios/run',
    payload: resultRequest,
  });
  // Read the materialized ResultInterpretationPacket back so the downstream
  // claim/dossier debates receive its actual body (not just refs/hashes).
  const materializedPacket = await inject(app, {
    stepId: 'bh-result-packet-readback',
    method: 'GET',
    url: projectUrl(projectId, `/result-interpretation-packets/${encodeURIComponent(resultAnalysis.materialized.domain_artifact_ref.ref_id)}`),
    expectedStatus: 200,
  });
  const resultPacketPacket = backHalfContextPacket(
    ref('result_interpretation_packet', T.resultPacket), 'result_interpretation_packet',
    materializedPacket.result_summary?.result_summary
      ?? 'Materialized result interpretation packet for the confirmatory LoRA parity result set.',
    [
      `Allowed claim ceiling: ${materializedPacket.claim_implications?.allowed_claim_ceiling ?? 'strong'}.`,
      `Forbidden overclaims: ${(materializedPacket.claim_implications?.forbidden_overclaims ?? CLAIM_GROUND_TRUTH.forbidden_overclaims).join('; ')}.`,
      `Reliability notes: ${(materializedPacket.reliability?.reliability_notes ?? []).join('; ')}`,
    ],
  );

  // 5) claim trace manifest + ClaimTracePacket（supported 状态的前置授权物）
  const claimTraceId = await createBackHalfTrace(
    app, projectId, 'bh-claim-trace',
    ref('claim_candidate', T.claimCandidate, 'v1'),
    backHalfExperimentLineage(spine, 'claim'),
  );
  const claimTracePacket = await inject(app, {
    stepId: 'bh-claim-trace-packet',
    method: 'POST',
    url: projectUrl(projectId, '/claim-trace-packets'),
    payload: {
      claim_ref: ref('claim_candidate', T.claimCandidate),
      claim_statement: CLAIM_GROUND_TRUTH.expected_claim_statement,
      trace_manifest_id: claimTraceId,
      lineage: backHalfExperimentLineage(spine, 'claim'),
      challenge: { challenging_result_refs: [], counter_evidence_refs: [], unresolved_objections: [] },
      scope: { ...SPINE.claim_trace_scope },
      boundary: {
        forbidden_overclaims: [...CLAIM_GROUND_TRUTH.forbidden_overclaims],
        claim_strength: CLAIM_GROUND_TRUTH.expected_claim_strength,
        human_confirmation_required: CLAIM_GROUND_TRUTH.requires_human_confirmation,
      },
    },
    expectedStatus: 201,
  });
  const claimTracePacketId = claimTracePacket.claim_trace_packet_id;

  // 6) 四点集停驻 #2：强 claim 人工确认。停驻如实记录，随后以 gs 记录员身份
  //    经产品路由创建 HumanConfirmationRecord（override actor 全程留痕；
  //    该记录由产品在 ClaimCandidate 物化时消费/燃烧——runner 不代燃）。
  state.stops.push({
    lane: 'bh-strong-claim-confirmation',
    kind: 'four_point_stop_2_strong_claim_confirmation',
    note: 'Strong-claim human confirmation stop (four-point set #2) recorded honestly; the runner then creates the '
      + 'HumanConfirmationRecord through the real product route as the gs recorder actor (override discipline).',
    override_actor: `${SCEN}_golden_scenario_recorder`,
  });
  const confirmation = await inject(app, {
    stepId: 'bh-strong-claim-human-confirmation',
    method: 'POST',
    url: projectUrl(projectId, '/human-confirmations'),
    payload: {
      confirmation_record_id: T.humanConfirmationStrongClaim,
      confirmation_scope: CLAIM_GROUND_TRUTH.human_confirmation_scope,
      target_refs: [ref('claim_candidate', T.claimCandidate)],
      reviewed_sources: [
        { source_ref: ref('run_evidence_unit', T.runEvidenceUnit), source_hash: reuInfo.resultHash },
        { source_ref: ref('result_interpretation_packet', T.resultPacket), source_hash: hash(T.resultPacket) },
      ],
      gate_result_refs: [],
      rationale:
        'Golden-scenario recorder confirms the strong parity claim against the material ground-truth card '
        + '(ground-truth.md §GT-9): bounded to the probed scale and committed task set, forbidden overclaims listed.',
      confirmed_by_actor_type: 'human',
      confirmed_by_actor_id: `${SCEN}_golden_scenario_recorder`,
    },
    expectedStatus: 201,
  });
  bh.strong_claim_confirmation = {
    status: 'created',
    confirmation_record_id: confirmation.confirmation_record_id,
    confirmation_scope: confirmation.confirmation_scope,
    confirmed_by_actor_id: confirmation.confirmed_by_actor_id ?? null,
  };

  // 7) claim_boundary debate → 物化 ClaimCandidate
  const claimFixtures = makeBackHalfFixtures({
    validationCycleId: T.validationCycle,
    experimentPlanLightId: T.experimentPlan,
    resultPacketTraceManifestId: resultPacketTraceId,
    claimTraceManifestId: claimTraceId,
    dossierTraceManifestId: 'pending',
    dossierReadinessGateResultId: 'pending',
    claimTracePacketId,
    humanConfirmationRef: ref('human_confirmation_record', confirmation.confirmation_record_id),
  });
  // T-124 G4.6 structural context: the pre-authorized claim id joins
  // source_refs — the SERVICE assembles the CreateClaimCandidateRequest.
  const claimSources = [
    ref('result_interpretation_packet', T.resultPacket),
    ref('claim_trace_packet', claimTracePacketId),
    ref('trace_manifest', claimTraceId),
    ref('human_confirmation_record', confirmation.confirmation_record_id),
    ref('run_evidence_unit', T.runEvidenceUnit),
    ref('claim_candidate', T.claimCandidate),
  ];
  const claimRequest = backHalfSlotBaseRequest(
    'claim_boundary',
    'paper-implementation.claim-boundary.boundary-debate.v1',
    rref('result_interpretation_packet', T.resultPacket),
    `${T.resultPacket}@v1`,
    claimSources,
  );
  if (SMOKE) {
    claimRequest.mocked_role_outputs = claimFixtures.claimBoundaryRoleOutputs;
  }
  // T-124 G4.5 Fix 1: the claim-boundary adjudicator sees the materialized packet
  // body + the claim trace packet's statement/boundary (hash-fenced).
  claimRequest.source_context_packets = [
    resultPacketPacket,
    backHalfContextPacket(
      ref('claim_trace_packet', claimTracePacketId), 'claim_trace_packet',
      CLAIM_GROUND_TRUTH.expected_claim_statement,
      [
        `Expected claim strength: ${CLAIM_GROUND_TRUTH.expected_claim_strength}; type: ${CLAIM_GROUND_TRUTH.expected_claim_type}.`,
        `Forbidden overclaims: ${CLAIM_GROUND_TRUTH.forbidden_overclaims.join('; ')}.`,
        `Human confirmation required: ${CLAIM_GROUND_TRUTH.requires_human_confirmation} (scope ${CLAIM_GROUND_TRUTH.human_confirmation_scope}).`,
      ],
    ),
    backHalfContextPacket(
      ref('run_evidence_unit', T.runEvidenceUnit), 'run_evidence_unit',
      'Trusted run evidence unit backing the parity claim.',
      experimentFacts,
    ),
  ];
  const claimBoundary = await runSlotAndMaterialize(app, projectId, {
    stepKey: 'bh-claim-boundary',
    stateKey: 'claim_boundary',
    slotUrl: '/runtime-slots/claim-boundary-debate/run',
    payload: claimRequest,
  });
  // Read the materialized ClaimCandidate back for the dossier readiness debate.
  const materializedClaim = await inject(app, {
    stepId: 'bh-claim-candidate-readback',
    method: 'GET',
    url: projectUrl(projectId, `/claim-candidates/${encodeURIComponent(claimBoundary.materialized.domain_artifact_ref.ref_id)}`),
    expectedStatus: 200,
  });
  const claimCandidatePacket = backHalfContextPacket(
    ref('claim_candidate', T.claimCandidate), 'claim_candidate',
    materializedClaim.claim_statement ?? CLAIM_GROUND_TRUTH.expected_claim_statement,
    [
      `Claim strength: ${materializedClaim.claim_strength ?? CLAIM_GROUND_TRUTH.expected_claim_strength}; `
      + `type: ${materializedClaim.claim_type ?? CLAIM_GROUND_TRUTH.expected_claim_type}; `
      + `status: ${materializedClaim.claim_status ?? 'supported'}.`,
      `Scope: population ${materializedClaim.scope?.population_scope ?? ''}; method ${materializedClaim.scope?.method_scope ?? ''}; `
      + `dataset ${materializedClaim.scope?.dataset_scope ?? ''}.`,
      `Boundary forbidden overclaims: ${(materializedClaim.boundary?.forbidden_overclaims ?? CLAIM_GROUND_TRUTH.forbidden_overclaims).join('; ')}.`,
    ],
  );

  // 8) dossier trace + readiness gate（enforced trace gate 真评估）
  const dossierTraceId = await createBackHalfTrace(
    app, projectId, 'bh-dossier-trace',
    ref('implementation_dossier', T.dossier, 'v1'),
    backHalfExperimentLineage(spine, 'dossier'),
  );
  const readinessGateResultId = await evaluateTraceGate(
    app, projectId, 'bh-dossier-readiness-gate', dossierTraceId,
  );

  // 9) dossier_readiness debate → 物化 ImplementationDossier（产品侧 N7 对账 enforced）
  const dossierFixtures = makeBackHalfFixtures({
    validationCycleId: T.validationCycle,
    experimentPlanLightId: T.experimentPlan,
    resultPacketTraceManifestId: resultPacketTraceId,
    claimTraceManifestId: claimTraceId,
    dossierTraceManifestId: dossierTraceId,
    dossierReadinessGateResultId: readinessGateResultId,
    claimTracePacketId,
    humanConfirmationRef: ref('human_confirmation_record', confirmation.confirmation_record_id),
  });
  const dossierSources = [
    ref('claim_candidate', T.claimCandidate),
    ref('claim_trace_packet', claimTracePacketId),
    ref('result_interpretation_packet', T.resultPacket),
    ref('trace_manifest', dossierTraceId),
    ref('gate_result', readinessGateResultId),
    ref('run_evidence_unit', T.runEvidenceUnit),
  ];
  const dossierRequest = backHalfSlotBaseRequest(
    'dossier_readiness',
    'paper-implementation.dossier-readiness.readiness-audit.v1',
    rref('implementation_dossier', T.dossier),
    `${T.dossier}@v1`,
    dossierSources,
  );
  if (SMOKE) {
    dossierRequest.mocked_role_outputs = dossierFixtures.dossierReadinessRoleOutputs;
  }
  // T-124 G4.5 Fix 1: the dossier-readiness adjudicator sees the materialized
  // claim + packet bodies (hash-fenced).
  dossierRequest.source_context_packets = [
    claimCandidatePacket,
    resultPacketPacket,
    backHalfContextPacket(
      ref('run_evidence_unit', T.runEvidenceUnit), 'run_evidence_unit',
      'Trusted run evidence unit; single succeeded confirmatory run set (nothing outstanding for N7).',
      experimentFacts,
    ),
  ];
  await runSlotAndMaterialize(app, projectId, {
    stepKey: 'bh-dossier-readiness',
    stateKey: 'dossier_readiness',
    slotUrl: '/runtime-slots/dossier-readiness-audit/run',
    payload: dossierRequest,
  });

  // 10) dossier ready → 四点集停驻 #3：export 停驻，runner 终点（不产 writing entry packet）。
  state.stops.push({
    lane: 'bh-dossier-export',
    kind: 'four_point_stop_3_dossier_export',
    note: 'Dossier is ready_for_writing; the runner terminates at the export stop (four-point set #3). '
      + 'No WritingEntryPacket is created — export is a human decision outside this runner.',
  });
  bh.export_stop = { status: 'stopped_at_export', dossier_id: T.dossier };
  bh.domain_gate_requests = dossierFixtures.domainGateRequests;
  return {
    resultPacketTraceId,
    claimTraceId,
    claimTracePacketId,
    dossierTraceId,
    readinessGateResultId,
    confirmationRecordId: confirmation.confirmation_record_id,
  };
}

/** 11) 血缘断言节：dossier→claim→packet→REU→WO→probe→route 逐环 ref 机器回溯。 */
async function runLineageAssertion(app, projectId, chainInfo) {
  const checks = [];
  const check = (name, ok, detail) => {
    checks.push({ check: name, ok: Boolean(ok), detail: detail ?? null });
    if (!ok) {
      console.error(`[golden-scenario] LINEAGE-CHECK FAILED: ${name} ${JSON.stringify(detail ?? null).slice(0, 300)}`);
    }
  };

  const dossier = await inject(app, {
    stepId: 'lineage-fetch-dossier',
    method: 'GET',
    url: projectUrl(projectId, `/implementation-dossiers/${T.dossier}`),
    expectedStatus: 200,
  });
  check('dossier.status_ready', dossier.dossier_status === 'ready_for_writing', { dossier_status: dossier.dossier_status });
  check(
    'dossier->claim ref',
    (dossier.source?.claim_candidate_refs ?? []).some((item) => item.ref_id === T.claimCandidate),
    { claim_candidate_refs: dossier.source?.claim_candidate_refs ?? [] },
  );
  check(
    'dossier->packet ref',
    (dossier.source?.result_interpretation_packet_refs ?? []).some((item) => item.ref_id === T.resultPacket),
    { result_interpretation_packet_refs: dossier.source?.result_interpretation_packet_refs ?? [] },
  );
  check(
    'dossier.readiness_gate',
    dossier.readiness_gate_result_id === chainInfo.readinessGateResultId,
    { readiness_gate_result_id: dossier.readiness_gate_result_id ?? null },
  );

  const claim = await inject(app, {
    stepId: 'lineage-fetch-claim',
    method: 'GET',
    url: projectUrl(projectId, `/claim-candidates/${T.claimCandidate}`),
    expectedStatus: 200,
  });
  check('claim.status_supported', claim.claim_status === 'supported', { claim_status: claim.claim_status });
  check(
    'claim->packet ref',
    (claim.result_interpretation_packet_refs ?? []).some((item) => item.ref_id === T.resultPacket),
    { result_interpretation_packet_refs: claim.result_interpretation_packet_refs ?? [] },
  );
  check(
    'claim->reu support ref',
    (claim.support_refs ?? []).some((item) => item.ref_id === T.runEvidenceUnit),
    { support_refs: claim.support_refs ?? [] },
  );
  check(
    'claim->trace packet',
    claim.claim_trace_packet_id === chainInfo.claimTracePacketId,
    { claim_trace_packet_id: claim.claim_trace_packet_id ?? null },
  );
  check(
    'claim.strong_confirmation_required',
    claim.human_confirmation_required === true && claim.boundary_gate_status === 'allow_strong_with_confirmation',
    { human_confirmation_required: claim.human_confirmation_required, boundary_gate_status: claim.boundary_gate_status },
  );

  const packet = await inject(app, {
    stepId: 'lineage-fetch-result-packet',
    method: 'GET',
    url: projectUrl(projectId, `/result-interpretation-packets/${T.resultPacket}`),
    expectedStatus: 200,
  });
  check(
    'packet->reu ref',
    (packet.source?.run_evidence_refs ?? []).some((item) => item.ref_id === T.runEvidenceUnit),
    { run_evidence_refs: packet.source?.run_evidence_refs ?? [] },
  );
  check(
    'packet->cycle',
    packet.validation_cycle_id === T.validationCycle,
    { validation_cycle_id: packet.validation_cycle_id },
  );

  const reu = await inject(app, {
    stepId: 'lineage-fetch-run-evidence',
    method: 'GET',
    url: projectUrl(projectId, `/run-evidence-units/${T.runEvidenceUnit}`),
    expectedStatus: 200,
  });
  check('reu.trusted', reu.trusted_status === 'trusted', { trusted_status: reu.trusted_status });
  check('reu->wo', reu.work_order_id === T.workOrder, { work_order_id: reu.work_order_id });
  check(
    'reu.result_hash_matches_material',
    reu.result_hash === state.back_half.acceptance_experiment?.result_hash,
    { result_hash: reu.result_hash ?? null },
  );

  const workOrder = await inject(app, {
    stepId: 'lineage-fetch-work-order',
    method: 'GET',
    url: projectUrl(projectId, `/research-work-orders/${T.workOrder}`),
    expectedStatus: 200,
  });
  check('wo->cycle', workOrder.validation_cycle_id === T.validationCycle, { validation_cycle_id: workOrder.validation_cycle_id });
  check(
    'wo.admission_gate',
    Boolean(workOrder.admission_gate_result_id),
    { admission_gate_result_id: workOrder.admission_gate_result_id ?? null },
  );

  const cycle = await inject(app, {
    stepId: 'lineage-fetch-validation-cycle',
    method: 'GET',
    url: projectUrl(projectId, `/validation-cycles/${T.validationCycle}`),
    expectedStatus: 200,
  });
  if (LIVE) {
    // WO→probe→route 段：cycle.trigger_refs → FeasibilityProbe；cycle.context.route_refs
    // → TechnicalRouteCandidate；两者的 source_proposal_artifact_ref → lane A admitted
    // runtime 提案（受理桥物化时已带血缘）。
    check(
      'cycle->probe trigger ref',
      (cycle.trigger?.trigger_refs ?? []).some((item) => item.ref_id === T.feasibilityProbe),
      { trigger_refs: cycle.trigger?.trigger_refs ?? [] },
    );
    check(
      'cycle->route ref',
      (cycle.context?.included_refs?.route_refs ?? []).some((item) => item.ref_id === T.routeCandidate),
      { route_refs: cycle.context?.included_refs?.route_refs ?? [] },
    );
    check(
      'probe->runtime proposal lineage',
      Boolean(state.acceptance_bridge.feasibility_probe?.source_proposal_artifact_id),
      { feasibility_probe: state.acceptance_bridge.feasibility_probe ?? null },
    );
    check(
      'route->runtime proposal lineage',
      Boolean(state.acceptance_bridge.technical_route_candidate?.source_proposal_artifact_id),
      { technical_route_candidate: state.acceptance_bridge.technical_route_candidate ?? null },
    );
  } else {
    checks.push({
      check: 'wo->probe->route (smoke)',
      ok: true,
      detail: 'Not exercised: smoke mode skips the provider coordinator lanes, so FeasibilityProbe / '
        + 'TechnicalRouteCandidate are not materialized; the probe/route hops are live-mode (G4) checks.',
      skipped: true,
    });
  }

  const failed = checks.filter((item) => !item.ok);
  state.lineage_assertion = {
    status: failed.length === 0 ? 'passed' : 'failed',
    total: checks.length,
    failed: failed.length,
    checks,
  };
  if (failed.length > 0) {
    registerGap('lineage-assertion', new Error(
      `Lineage back-trace failed ${failed.length}/${checks.length} checks: ${failed.map((item) => item.check).join(', ')}`,
    ));
  }
  await record('lineage-assertion', state.lineage_assertion);
}

/** 后半链总编排（live 与 smoke 共用；任何一步失败=诚实 GAP + 停链）。 */
async function runBackHalf(app, projectId, spine, bridgeInfo) {
  state.back_half = { mode: MODE };
  let woInfo = null;
  let reuInfo = null;
  let chainInfo = null;
  try {
    woInfo = await runBackHalfWorkOrder(app, projectId, spine, bridgeInfo);
  } catch (error) {
    registerGap('back-half-work-order', error, 'WO 创建/admit 未通过；后半链停在此。');
    return;
  }
  try {
    reuInfo = await runAcceptanceExperiment(app, projectId, spine, woInfo);
  } catch (error) {
    registerGap('back-half-acceptance-experiment', error, 'acceptance 假体实验未产出 trusted REU；后半链停在此。');
    return;
  }
  try {
    chainInfo = await runBackHalfInterpretationChain(app, projectId, spine, reuInfo);
  } catch (error) {
    registerGap('back-half-interpretation-chain', error, 'result_analysis→claim→dossier 链未走完；诚实停驻。');
    return;
  }
  try {
    await runLineageAssertion(app, projectId, chainInfo);
  } catch (error) {
    registerGap('lineage-assertion', error, '血缘断言节自身失败（fetch 失败等）。');
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
  lines.push(`- mode: **${MODE}**${SMOKE ? '（结构冒烟：provider lanes/受理桥如实跳过，后半链 mocked 素材夹具，零 provider 调用）' : ''}；`
    + `provider: ${providerId}；run_mode: ${RUN_MODE}；execution_mode: ${EXECUTION_MODE}`);
  lines.push(`- 素材: .ai/golden-scenarios/paper-implementation/${SCENARIO_ID}/（topic-package.mjs **${SCENARIO_META?.package_version ?? 'v4'}**`
    + `（v3 内容核不动 + G1 后半链：experiment_results 数据段/claim ground-truth 锚/后半链夹具/通用导出契约）`
    + ` / ground-truth.md（§GT-9/§GT-10 后半链答案卡） / rubric.md）`);
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
  lines.push('## 后半链（G1）：WO → acceptance 实验 → result analysis → claim → dossier → export 停驻');
  lines.push('');
  lines.push('- 路径全部为产品真实 HTTP 路由（详见 runner 头注释「真实路由逐步」节）；每步原始请求/响应');
  lines.push('  落盘在对应 `NN-bh-*.json` 序列文件（含三个 runtime slot 的完整 final artifact payload 与');
  lines.push('  Domain Gate 物化结果）。');
  lines.push('- acceptance 假体实验：素材 v4 `EXPERIMENT_RESULTS`（论文真实数字）经 harness-run 登记 +');
  lines.push('  run-monitor-intake 产出 trusted RunEvidenceUnit——实验不经 LLM，零 provider 伪造。');
  lines.push('- 人审对照：result analysis 解读质量 → ground-truth.md §GT-9 前半段（parity 语义）；');
  lines.push('  claim 边界纪律 → §GT-9（预期 claim 边界答案卡）；dossier 完备性 → §GT-10（完备清单）。');
  lines.push('');
  lines.push(fenceJson(state.back_half ?? { status: 'not_run' }));
  lines.push('');
  lines.push('### acceptance 实验数据段（素材 v4 EXPERIMENT_RESULTS，论文真实数字）');
  lines.push('');
  lines.push(fenceJson(EXPERIMENT_RESULTS));
  lines.push('');
  lines.push('### claim ground-truth 锚（素材 v4 CLAIM_GROUND_TRUTH，评审对照卡）');
  lines.push('');
  lines.push(fenceJson(CLAIM_GROUND_TRUTH));
  lines.push('');
  lines.push('## 血缘断言（dossier→claim→packet→REU→WO→probe→route 机器回溯）');
  lines.push('');
  lines.push(fenceJson(state.lineage_assertion ?? { status: 'not_run' }));
  lines.push('');
  lines.push('## 停驻与缺口（如实呈现，停驻本身是有效结果）');
  lines.push('');
  lines.push('observability_gaps 为观测步（如遥测导出）fail-open 失败，独立记录，不参与终态 status 判定。');
  lines.push('');
  lines.push(fenceJson({
    stops: state.stops,
    gaps: state.gaps,
    observability_gaps: state.observability_gaps,
  }));
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
  lines.push('## 运行时遥测基线（S4-A 三条只读遥测路由）');
  lines.push('');
  const telemetry = state.telemetry_baseline;
  if (!telemetry) {
    lines.push('- 遥测基线未采集（导出 fail-open 记 GAP，见上「停驻与缺口」节）；'
      + '本次不阻断人审，明细缺失以 GAP 为准。');
  } else {
    lines.push(`- 明细落盘: \`${telemetry.path}\`（项目重付率聚合 + 各 node_attempt run 明细全量）`);
    lines.push(`- total cost: ${telemetry.total_cost_usd} USD（provider 调用 ${telemetry.provider_call_count}，`
      + `node_attempt run ${telemetry.run_count} 条）`);
    lines.push(`- 重付成本: ${telemetry.repaid_cost_usd} USD；重付率: ${telemetry.repaid_cost_rate}`);
    lines.push('- per-slot 成本分解（slot_id · 调用 · 成本 · 重付）:');
    if ((telemetry.per_slot ?? []).length === 0) {
      lines.push('  - （无 per-slot 记录）');
    } else {
      for (const slot of telemetry.per_slot) {
        lines.push(`  - ${slot.slot_id}: ${slot.provider_call_count} 调用 · ${slot.total_cost_usd} USD · `
          + `重付 ${slot.repaid_cost_usd} USD`);
      }
    }
    const shadowKeys = Object.keys(telemetry.shadow_tier_distribution ?? {});
    lines.push(`- shadow_tier 分布（record-only，不影响执行路径）: ${shadowKeys.length === 0
      ? '无 record'
      : shadowKeys.map((key) => `${key}=${telemetry.shadow_tier_distribution[key]}`).join(', ')}`);
    lines.push('');
    lines.push(fenceJson(telemetry));
  }
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
    paperImplementationBridgeService: new ScenarioBridgeService(),
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

    // 3-5) coordinator lanes（provider_llm 真跑）——LIVE 专属；smoke 模式如实跳过
    // （前半链 provider 面已由既有 live run 覆盖，smoke 的目的只是后半链结构冒烟）。
    if (LIVE) {
      // 3) coordinator lane motive（decomposition → evolution）
      try {
        await runCoordinatorLane(app, projectId, 'lane-motive', {
          coordinator_run_id: `${SCEN}_coordinator_run_motive`,
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
          coordinator_run_id: `${SCEN}_coordinator_run_board`,
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
          coordinator_run_id: `${SCEN}_coordinator_run_lane_a`,
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
    } else {
      state.smoke_skipped_lanes = {
        skipped: ['lane-motive', 'lane-board-curation', 'lane-a-validation-planning', 'acceptance-bridge'],
        note: 'Smoke mode skips the provider coordinator lanes and the acceptance-bridge materialization; '
          + 'the deterministic spine + full back half run structurally with material-supplied mocked role outputs.',
      };
    }

    // 6) 受理桥物化 + 观测收尾（LIVE 专属——依赖 lane A admitted 提案）
    let artifactsById = new Map();
    if (LIVE) {
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
    }

    // 6.5) 后半链（G1）：WO → acceptance 假体实验 → result_analysis → claim →
    //      dossier → export 停驻 + 血缘断言。live 与 smoke 共用编排；live 中
    //      cycle 的 trigger/route refs 指向受理桥物化出的 probe/route（血缘闭环）。
    try {
      await runBackHalf(app, projectId, spine, {
        probeCreated: state.acceptance_bridge.feasibility_probe?.status === 'created',
        routeCreated: state.acceptance_bridge.technical_route_candidate?.status === 'created',
      });
    } catch (error) {
      registerGap('back-half', error);
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

    // 7) 运行时遥测基线导出（观测收尾，fail-open）
    // Observation step: a failed telemetry export is an OBSERVABILITY gap, not
    // a substantive one — it must not downgrade the terminal status (fail-open:
    // observing the run cannot change the run's product). Recorded in the
    // separate observability bucket so status stays honest.
    try {
      await exportTelemetryBaseline(app, projectId);
    } catch (error) {
      registerObservabilityGap(
        'telemetry-baseline',
        error,
        'Telemetry baseline export failed fail-open; run not blocked and terminal status unaffected.',
      );
    }

    // 8) review packet
    try {
      state.review_packet_path = path.relative(REPO_ROOT, await writeReviewPacket(artifactsById));
    } catch (error) {
      registerGap('review-packet', error);
    }

    const laneStatuses = Object.values(state.lanes).map((lane) => lane.run_status);
    const allCompleted = laneStatuses.length === 3 && laneStatuses.every((status) => status === 'completed');
    const bridgeCreated = state.acceptance_bridge.technical_route_candidate?.status === 'created'
      && state.acceptance_bridge.feasibility_probe?.status === 'created';
    // G1: 后半链终点判定——dossier 物化 + export 停驻 + 血缘断言通过。
    const backHalfCompleted = ['materialized', 'already_materialized']
      .includes(state.back_half?.dossier_readiness?.materialization?.status)
      && state.back_half?.export_stop?.status === 'stopped_at_export'
      && state.lineage_assertion?.status === 'passed';
    // Terminal status reads substantive gaps only (`state.gaps`).
    // `state.observability_gaps` (fail-open telemetry/observation failures) is
    // deliberately excluded — an observation step must not change the terminal
    // product it observes, so a telemetry export failure alone keeps a
    // genuinely completed run `completed`.
    // live: 前半链三 lane + 受理桥 + 后半链全绿才 completed；
    // smoke: lanes/bridge 如实跳过，completed 只看后半链结构 + 零 GAP。
    const frontHalfCompleted = LIVE ? (allCompleted && bridgeCreated) : true;
    state.status = state.gaps.length === 0 && frontHalfCompleted && backHalfCompleted ? 'completed' : 'partial';
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
    back_half: {
      mode: state.back_half?.mode ?? 'not_run',
      work_order: state.back_half?.work_order?.status ?? 'not_run',
      acceptance_experiment: state.back_half?.acceptance_experiment?.status ?? 'not_run',
      result_analysis: state.back_half?.result_analysis?.materialization?.status
        ?? state.back_half?.result_analysis?.slot?.status ?? 'not_run',
      strong_claim_confirmation: state.back_half?.strong_claim_confirmation?.status ?? 'not_run',
      claim_boundary: state.back_half?.claim_boundary?.materialization?.status
        ?? state.back_half?.claim_boundary?.slot?.status ?? 'not_run',
      dossier_readiness: state.back_half?.dossier_readiness?.materialization?.status
        ?? state.back_half?.dossier_readiness?.slot?.status ?? 'not_run',
      export_stop: state.back_half?.export_stop?.status ?? 'not_run',
    },
    lineage_assertion: state.lineage_assertion
      ? { status: state.lineage_assertion.status, total: state.lineage_assertion.total, failed: state.lineage_assertion.failed }
      : { status: 'not_run' },
    stops: state.stops,
    gaps: state.gaps,
    observability_gaps: state.observability_gaps,
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
