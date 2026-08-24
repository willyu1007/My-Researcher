// T-131: first REAL promotion through the experiment-foundation machinery.
// Registers the LIT-0204 RAGPerf evaluation-protocol candidate (six gates embedded) + triage
// report + canonical records (data_policy, 17 metric_definitions, evaluation_protocol), then
// executes the manual_promote decision through ExperimentFoundationService.decidePromotion —
// the real validation path (Ajv schemas + assertPromotionGate + canonical-ref existence).
//
// Run from repo root:
//   TS_NODE_TRANSPILE_ONLY=1 TS_NODE_PROJECT=apps/backend/tsconfig.json \
//     node --env-file=.env.local --loader ./apps/backend/node_modules/ts-node/esm.mjs \
//     dev-docs/active/experiment-foundation-first-promotion-closure/tools/lit-0204-evaluation-protocol-promotion-runner.mjs
//
// Modes:
//   (default)        execute the full chain; writes result artifact next to this script's package.
//   --verify-only    just print registry state for the involved record ids.
//   --negative       re-attempt the promotion decision (expects VERSION_CONFLICT / conflict rejection).

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

import { PrismaExperimentFoundationRepository } from '../../../../apps/backend/src/repositories/prisma/prisma-experiment-foundation-repository.js';
import { ExperimentFoundationService } from '../../../../apps/backend/src/services/experiment-foundation-service.js';
import { canonicalJson } from '../../../../.ai/scripts/experiment-foundation-protocol-hash.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, '..');
// T-118 was archived 2026-07-08; its artifacts moved to dev-docs/archive. The registry records
// created by the 2026-07-08 promotion run captured the then-current dev-docs/active paths as a
// point-in-time snapshot (not rewritten — same convention as immutable migration comments). These
// source constants point at the current (archive) location so re-runs / verify mode resolve files.
const T118_ROOT = path.resolve(pkgRoot, '..', '..', 'archive', 'adaptive-llm-systems-experiment-foundation-promotion');

const NOW = new Date().toISOString();
const REVIEWER = { ref_type: 'user', ref_id: 'yurui' };
const LIT_REF = { ref_type: 'literature_record', ref_id: 'LIT-0204' };
const S1_ARTIFACT_REF = {
  ref_type: 'task_artifact',
  ref_id: 'dev-docs/archive/adaptive-llm-systems-experiment-foundation-promotion/artifacts/lit-0204-ragperf-s1-cpu-adapter.json',
};
const PAYLOAD_DOC_REF = {
  ref_type: 'task_artifact',
  ref_id: 'dev-docs/archive/adaptive-llm-systems-experiment-foundation-promotion/07-lit-0204-ragperf-candidate-payload.md',
};
const PROTOCOL_DEFINITION_REF = {
  ref_type: 'task_artifact',
  ref_id: 'dev-docs/active/experiment-foundation-first-promotion-closure/artifacts/lit-0204-ragperf-protocol-definition.json',
};

const IDS = {
  dataPolicy: 'data_policy_lit_0204_ragperf_code',
  protocol: 'evaluation_protocol_lit_0204_ragperf',
  benchmarkForwardRef: 'benchmark_asset_lit_0204_ragperf',
  candidate: 'evaluation_protocol_candidate_lit_0204_ragperf',
  triage: 'asset_candidate_triage_report_lit_0204_ragperf',
  promotionRequest: 'promotion_request_lit_0204_ragperf_evaluation_protocol',
  promotionResult: 'promotion_result_lit_0204_ragperf_evaluation_protocol',
};

function sha256Hex(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// Payload hash convention: sha256 over canonical JSON of the payload with its own hash field removed.
function payloadHash(payload, ownHashField) {
  const clone = { ...payload };
  delete clone[ownHashField];
  return `sha256:${sha256Hex(canonicalJson(clone))}`;
}

function metricEvaluatorRef(source) {
  if (source.includes('Ragasvllm/RagasEvaluator')) return { ref_type: 'evaluator', ref_id: 'ragperf_ragas_evaluator' };
  if (source.includes('Ragasvllm')) return { ref_type: 'evaluator', ref_id: 'ragperf_ragas_vllm' };
  if (source.includes('RagasEvaluator')) return { ref_type: 'evaluator', ref_id: 'ragperf_ragas_evaluator' };
  if (source.includes('MSys')) return { ref_type: 'evaluator', ref_id: 'ragperf_msys_monitor' };
  return { ref_type: 'evaluator', ref_id: 'ragperf_text_pipeline_stats' };
}

async function main() {
  const mode = process.argv.includes('--negative') ? 'negative' : process.argv.includes('--verify-only') ? 'verify' : 'execute';
  const protocolDefinition = JSON.parse(readFileSync(
    path.join(pkgRoot, 'artifacts', 'lit-0204-ragperf-protocol-definition.json'), 'utf8'));
  const s1 = JSON.parse(readFileSync(
    path.join(T118_ROOT, 'artifacts', 'lit-0204-ragperf-s1-cpu-adapter.json'), 'utf8'));

  const prisma = new PrismaClient();
  const repository = new PrismaExperimentFoundationRepository(prisma);
  const service = new ExperimentFoundationService(repository);
  const summary = { mode, executed_at: NOW, records: [], errors: [] };

  const metricRows = protocolDefinition.document.definition.metric_definitions;
  const metricDefinitionIds = metricRows.map((row) => `metric_definition_lit_0204_ragperf_${row.metric_key}`);
  const metricRefs = metricDefinitionIds.map((id) => ({ ref_type: 'metric_definition', ref_id: id }));
  const evaluatorRefs = [
    { ref_type: 'evaluator', ref_id: 'ragperf_text_pipeline_stats' },
    { ref_type: 'evaluator', ref_id: 'ragperf_ragas_evaluator' },
    { ref_type: 'evaluator', ref_id: 'ragperf_ragas_vllm' },
    { ref_type: 'evaluator', ref_id: 'ragperf_msys_monitor' },
  ];

  try {
    if (mode === 'verify') {
      for (const [label, kind, id] of [
        ['candidate', 'evaluation_protocol_candidate', IDS.candidate],
        ['triage', 'asset_candidate_triage_report', IDS.triage],
        ['policy', 'data_policy', IDS.dataPolicy],
        ['protocol', 'evaluation_protocol', IDS.protocol],
        ['request', 'asset_promotion_request', IDS.promotionRequest],
        ['result', 'asset_promotion_result', IDS.promotionResult],
        ['metric[0]', 'metric_definition', metricDefinitionIds[0]],
      ]) {
        const record = await repository.findRecord(kind, id);
        console.log(`${label}: ${record ? `EXISTS status=${record.status ?? '-'}` : 'missing'}`);
      }
      return;
    }

    const createRecord = async (record_kind, payload) => {
      const stored = await service.createRecord({ record_kind, payload });
      summary.records.push({ record_kind, record_id: stored.record_id, status: stored.status ?? null });
      console.log(`created ${record_kind} ${stored.record_id}`);
      return stored;
    };

    // ---- gate evidence values (mirrors T-118 07 Gate Status, 2026-07-08 reconciliation) ----
    const duplicateCheck = {
      duplicate_check_id: 'duplicate_check_lit_0204_ragperf_20260708',
      duplicate_status: 'no_duplicate',
      checked_refs: [{ ref_type: 'evaluation_protocol', ref_id: IDS.protocol }],
      possible_duplicate_refs: [],
      rationale: '2026-07-08 registry full scan: 208 records / 23 kinds, zero RAGPerf/LIT-0204 hits; no benchmark-kind records exist; existing evaluation_protocol rows are capability-validation scenario records only.',
      checked_at: NOW,
    };
    const completenessCheck = {
      completeness_check_id: 'completeness_check_lit_0204_ragperf_20260708',
      completeness_status: 'complete',
      required_fields: ['protocol_hash', 'metric_definition_refs', 'evaluator_refs', 'local_smoke_command', 'output_artifact_contract', 'source_refs', 'license'],
      missing_fields: [],
      checked_at: NOW,
    };
    const policyCheck = {
      policy_check_id: 'policy_check_lit_0204_ragperf_20260708',
      policy_status: 'clear',
      license: 'Apache-2.0',
      policy_ref: { ref_type: 'data_policy', ref_id: IDS.dataPolicy },
      policy_hash: null, // set after data_policy record hash is known
      restricted_reasons: [],
      checked_at: NOW,
    };
    const riskAssessment = {
      risk_assessment_id: 'risk_assessment_lit_0204_ragperf_20260708',
      risk_level: 'low',
      risk_reasons: [
        'upstream code assumes older dependency era; adapter tier pins versions and carries a 13-patch set',
        'faithful tier (vLLM/CUDA/libmsys) unverified: external environment dependency',
      ],
      privacy_sensitive: false,
      model_weight_sensitive: false,
      requires_manual_review: false,
      assessed_at: NOW,
    };

    // ---- 1. canonical data_policy (code-license policy; the policy gate's clear verdict as a record) ----
    // (--negative skips creation: records exist from the executed run; the target assertion is
    //  the promotion-decision rejection itself.)
    const dataPolicyPayload = {
      data_policy_id: IDS.dataPolicy,
      license: 'Apache-2.0',
      access_level: 'open',
      privacy_level: 'public',
      allowed_use_cases: ['benchmarking', 'local_execution_smoke', 'evaluation_protocol_reference'],
      mirror_policy: 'allowed',
      approval_refs: [],
      policy_hash: '',
      retention_notes: 'RAGPerf code-license policy (LICENSE at HEAD 49c9794). Covers repository code/protocol only; Hugging Face dataset policies are NOT covered (dataset candidates remain needs_info).',
      created_at: NOW,
    };
    dataPolicyPayload.policy_hash = payloadHash(dataPolicyPayload, 'policy_hash');
    policyCheck.policy_hash = dataPolicyPayload.policy_hash;
    if (mode !== 'negative') await createRecord('data_policy', dataPolicyPayload);

    // ---- 2. canonical metric_definition x17 (from the protocol definition SSOT) ----
    for (const [index, row] of metricRows.entries()) {
      if (mode === 'negative') break;
      await createRecord('metric_definition', {
        metric_definition_id: metricDefinitionIds[index],
        metric_key: row.metric_key,
        name: row.metric_key.replace(/_/g, ' '),
        description: `RAGPerf metric sourced from: ${row.source}.${row.direction === 'informational' ? ' MSys resource metric: no-op under cpu_adapter tier (libmsys unbuildable on macOS); faithful tier only.' : ''}`,
        direction: row.direction,
        unit: row.metric_key.endsWith('_ns') ? 'nanoseconds' : row.metric_key === 'qps' ? 'queries_per_second' : null,
        value_type: 'number',
        evaluator_ref: metricEvaluatorRef(row.source),
        parser_ref: null,
        validity_constraints: row.direction === 'informational' ? ['faithful tier only under current adapter evidence'] : [],
        created_at: NOW,
        updated_at: NOW,
      });
    }

    // ---- 3. canonical evaluation_protocol ----
    if (mode !== 'negative') await createRecord('evaluation_protocol', {
      evaluation_protocol_id: IDS.protocol,
      // FORWARD REFERENCE (T-131 decision): benchmark candidate stays manual_review_required
      // (external deps), so this id points at the future benchmark asset. Consumers must not
      // dereference it until that asset lands; consumption-time verification (loop phase D) catches it.
      benchmark_asset_id: IDS.benchmarkForwardRef,
      protocol_version: 'v1-cpu-adapter',
      protocol_hash: protocolDefinition.protocol_hash,
      metric_definition_refs: metricRefs,
      evaluator_refs: evaluatorRefs,
      aggregation: { primary_metric: 'total_pipeline_time_ns', quality_panel: ['faithfulness', 'answer_relevancy', 'context_recall', 'context_precision'] },
      seed_policy: { note: 'RAGPerf exposes no seed knob in observed configs; determinism unmanaged upstream' },
      repeat_policy: { repeats: 1, note: 'smoke-tier; faithful runs should define repeats' },
      reporting_protocol: { outputs: ['text_pipeline_stats.txt', 'evaluate_result.csv'], per_round_rows: true },
      comparison_policy: { compare_axes: ['vector_db_backend', 'retrieval_knobs', 'generation_model'] },
      statistical_protocol: { test: 'none', note: 'not defined at adapter tier' },
      budget_fairness_policy: { same_hardware: true, same_dataset_slice: true },
      tuning_fairness_policy: { same_config_knobs: true },
      created_at: NOW,
      updated_at: NOW,
    });

    // ---- 4. candidate record (six gates embedded) ----
    const candidatePayload = {
      evaluation_protocol_candidate_id: IDS.candidate,
      candidate_family: 'evaluation_protocol',
      candidate_status: 'ready_for_promotion',
      canonical_name: 'RAGPerf end-to-end RAG systems evaluation protocol',
      aliases: ['ragperf-evaluation-protocol', 'lit-0204-evaluation-protocol'],
      description: 'Stage-timing + RAGAS-quality evaluation protocol observed from RAGPerf (LIT-0204); cpu_adapter tier evidence (S1 smoke, dual independent executions).',
      benchmark_ref: { ref_type: 'benchmark_asset', ref_id: IDS.benchmarkForwardRef, label: 'forward reference; benchmark candidate remains manual_review_required' },
      protocol_version: 'v1-cpu-adapter',
      protocol_hash: protocolDefinition.protocol_hash,
      metric_definition_refs: metricRefs,
      evaluator_refs: evaluatorRefs,
      protocol_summary: {
        tier: 'cpu_adapter',
        entrypoint_shape: protocolDefinition.document.definition.entrypoint_shape,
        key_knobs: protocolDefinition.document.definition.key_knobs,
        adapter_patch_digest: protocolDefinition.document.adapter_patch_digest,
        s1_verdict: s1.verdict,
        s1_run_ids: ['ragperf-s1-20260706T141503Z', 'ragperf-s1-20260706T142335Z'],
        output_artifact_contract: {
          stats_file: 'text_pipeline_stats.txt (per-round stage timings: embedding/retrieval/rerank/prompt/generation ns)',
          quality_file: 'evaluate_result.csv (RAGAS metrics; faithful tier only)',
        },
      },
      source_refs: [LIT_REF, { ref_type: 'code_repository', ref_id: 'https://github.com/platformxlab/RAGPerf', version_id: '49c9794895666d029a3c98a48afd872197d83b23' }],
      source_traces: [{
        source_trace_id: 'source_trace_lit_0204_ragperf_s1',
        source_kind: 'literature_key_content',
        source_ref: LIT_REF,
        extraction_ref: S1_ARTIFACT_REF,
        evidence_locator_snapshot: { payload_doc: PAYLOAD_DOC_REF.ref_id, s1_artifact: S1_ARTIFACT_REF.ref_id },
        confidence_score: 0.9,
        extracted_at: '2026-07-06T14:15:03.000Z',
        created_at: NOW,
      }],
      extraction_provenance_refs: [S1_ARTIFACT_REF, PAYLOAD_DOC_REF, PROTOCOL_DEFINITION_REF],
      confidence_score: 0.9,
      duplicate_check: duplicateCheck,
      completeness_check: completenessCheck,
      policy_check: policyCheck,
      risk_assessment: riskAssessment,
      deterministic_rule_trace_refs: [],
      existing_canonical_refs: [],
      candidate_hash: '',
      created_at: NOW,
      updated_at: NOW,
    };
    candidatePayload.candidate_hash = payloadHash(candidatePayload, 'candidate_hash');
    if (mode !== 'negative') await createRecord('evaluation_protocol_candidate', candidatePayload);

    // ---- 5. triage report ----
    const triagePayload = {
      triage_report_id: IDS.triage,
      candidate_ref: { ref_type: 'evaluation_protocol_candidate', ref_id: IDS.candidate },
      candidate_hash: candidatePayload.candidate_hash,
      candidate_family: 'evaluation_protocol',
      recommended_status: 'ready_for_promotion',
      confidence_score: 0.9,
      duplicate_status: 'no_duplicate',
      completeness_status: 'complete',
      policy_status: 'clear',
      risk_level: 'low',
      blockers: [],
      warnings: [
        'cpu_adapter tier evidence only; faithful tier pending external Linux/CUDA/vLLM environment',
        'benchmark_asset_id is a forward reference; benchmark candidate remains manual_review_required',
        'MSys resource metrics (3 of 17) are faithful-tier only',
      ],
      rule_trace_refs: [],
      source_refs: [LIT_REF],
      provenance_refs: [S1_ARTIFACT_REF, PAYLOAD_DOC_REF],
      triage_hash: '',
      created_at: NOW,
    };
    triagePayload.triage_hash = payloadHash(triagePayload, 'triage_hash');
    if (mode !== 'negative') await createRecord('asset_candidate_triage_report', triagePayload);

    // ---- 6. promotion decision through the real gate path ----
    const promotionRequest = {
      promotion_request_id: IDS.promotionRequest,
      candidate_ref: { ref_type: 'evaluation_protocol_candidate', ref_id: IDS.candidate },
      candidate_hash: candidatePayload.candidate_hash,
      candidate_family: 'evaluation_protocol',
      decision_kind: 'manual_promote',
      candidate_status: 'ready_for_promotion',
      confidence_score: 0.9,
      duplicate_status: 'no_duplicate',
      completeness_status: 'complete',
      policy_status: 'clear',
      risk_level: 'low',
      source_refs: [LIT_REF],
      provenance_refs: [S1_ARTIFACT_REF, PAYLOAD_DOC_REF, PROTOCOL_DEFINITION_REF],
      deterministic_rule_trace_refs: [],
      required_version_refs: [{ ref_type: 'evaluation_protocol', ref_id: IDS.protocol, label: 'protocol record carries protocol_version=v1-cpu-adapter' }],
      required_policy_refs: [{ ref_type: 'data_policy', ref_id: IDS.dataPolicy }],
      required_protocol_refs: [{ ref_type: 'evaluation_protocol', ref_id: IDS.protocol }],
      triage_report_ref: { ref_type: 'asset_candidate_triage_report', ref_id: IDS.triage },
      triage_report_hash: triagePayload.triage_hash,
      reviewer_ref: REVIEWER,
      requested_by_ref: REVIEWER,
      requested_at: NOW,
      request_hash: '',
    };
    promotionRequest.request_hash = payloadHash(promotionRequest, 'request_hash');

    const promotionResult = {
      promotion_result_id: IDS.promotionResult,
      promotion_request_id: IDS.promotionRequest,
      candidate_ref: { ref_type: 'evaluation_protocol_candidate', ref_id: IDS.candidate },
      candidate_hash: candidatePayload.candidate_hash,
      candidate_family: 'evaluation_protocol',
      result_status: 'promoted',
      canonical_asset_refs: metricRefs,
      canonical_version_refs: [{ ref_type: 'evaluation_protocol', ref_id: IDS.protocol, label: 'protocol record carries protocol_version=v1-cpu-adapter' }],
      canonical_protocol_refs: [{ ref_type: 'evaluation_protocol', ref_id: IDS.protocol }],
      canonical_policy_refs: [{ ref_type: 'data_policy', ref_id: IDS.dataPolicy }],
      blockers: [],
      warnings: [
        'cpu_adapter tier: adapter patch set folded into protocol_hash; faithful tier is a future protocol_version',
        'benchmark_asset_id forward reference pending benchmark candidate promotion',
      ],
      source_refs: [LIT_REF],
      provenance_refs: [S1_ARTIFACT_REF, PAYLOAD_DOC_REF, PROTOCOL_DEFINITION_REF],
      promotion_hash: '',
      created_at: NOW,
    };
    promotionResult.promotion_hash = payloadHash(promotionResult, 'promotion_hash');

    if (mode === 'negative') {
      try {
        await service.decidePromotion(IDS.candidate, { promotion_request: promotionRequest, promotion_result: promotionResult });
        console.error('NEGATIVE FAILED: duplicate promotion was accepted');
        process.exitCode = 1;
      } catch (error) {
        console.log(`negative ok: duplicate promotion rejected — ${error?.errorCode ?? error?.name}: ${error?.message}`);
      }
      return;
    }

    const decision = await service.decidePromotion(IDS.candidate, {
      promotion_request: promotionRequest,
      promotion_result: promotionResult,
    });
    summary.records.push({ record_kind: 'asset_promotion_request', record_id: decision.promotion_request_record.record_id, status: decision.promotion_request_record.status ?? null });
    summary.records.push({ record_kind: 'asset_promotion_result', record_id: decision.promotion_result_record.record_id, status: decision.promotion_result_record.status ?? null });
    summary.candidate_final_status = decision.candidate_record.status;
    console.log(`promotion decided: candidate status -> ${decision.candidate_record.status}`);

    writeFileSync(
      path.join(pkgRoot, 'artifacts', 'lit-0204-evaluation-protocol-promotion-run.json'),
      JSON.stringify(summary, null, 1) + '\n',
    );
    console.log('summary artifact written.');
  } catch (error) {
    console.error('FAILED:', error?.errorCode ?? error?.name, error?.message);
    if (error?.details) console.error(JSON.stringify(error.details, null, 1));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
