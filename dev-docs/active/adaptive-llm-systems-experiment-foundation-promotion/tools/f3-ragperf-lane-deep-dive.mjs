import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const TASK_DIR = 'dev-docs/active/adaptive-llm-systems-experiment-foundation-promotion';
const OUT_DIR = path.join(TASK_DIR, 'artifacts');
const JSON_PATH = path.join(OUT_DIR, 'lit-0204-ragperf-candidate-payload.json');
const MD_PATH = path.join(TASK_DIR, '07-lit-0204-ragperf-candidate-payload.md');
const GENERATED_AT = '2026-06-04T00:00:00.000Z';

function hashPayload(payload) {
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function ref(kind, id) {
  return { kind, id };
}

const sourceEvidence = {
  literature_id: 'LIT-0204',
  title: 'RAGPerf: An End-to-End Benchmarking Framework for Retrieval-Augmented Generation Systems',
  arxiv_id: '2603.10765',
  arxiv_abs_url: 'https://arxiv.org/abs/2603.10765',
  arxiv_pdf_url: 'https://arxiv.org/pdf/2603.10765',
  repository_url: 'https://github.com/platformxlab/RAGPerf',
  repository_raw_base: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main',
  observed_git_head: '49c9794895666d029a3c98a48afd872197d83b23',
  license: 'Apache-2.0',
  repository_api_caveat: 'GitHub API was anonymous-rate-limited during this pass; raw README/config/source files and git ls-remote HEAD were reachable.',
  source_links: {
    readme: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/README.md',
    config_readme: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/config/README.md',
    lance_insert_config: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/config/lance_insert.yaml',
    lance_query_config: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/config/lance_query.yaml',
    monitor_config: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/config/monitor/example_config.yaml',
    run_new: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/run_new.py',
    text_pipeline: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/RAGPipeline/TextsRAGPipline.py',
    text_request: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/RAGRequest/TextsRAGRequest.py',
    ragas_evaluator: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/evaluator/RagasEvaluator.py',
    ragas_vllm_evaluator: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/evaluator/Ragasvllm.py',
    vectordb_readme: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/src/vectordb/README.md',
    monitoring_readme: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/monitoring_sys/README.md',
    license: 'https://raw.githubusercontent.com/platformxlab/RAGPerf/main/LICENSE',
  },
  source_caveats: [
    'README install path references ../requirement.txt while monitoring documentation references requirements.txt; resolve dependency-generation output before smoke execution.',
    'Default example configs contain local absolute paths and must be copied/rebased before local execution.',
    'GitHub API metadata was not used because anonymous requests were rate-limited.',
  ],
  observed_files: [
    'README.md',
    'LICENSE',
    'config/README.md',
    'config/lance_insert.yaml',
    'config/lance_query.yaml',
    'config/monitor/example_config.yaml',
    'src/run_new.py',
    'src/RAGPipeline/TextsRAGPipline.py',
    'src/RAGRequest/TextsRAGRequest.py',
    'src/evaluator/RagasEvaluator.py',
    'src/evaluator/Ragasvllm.py',
    'src/vectordb/README.md',
    'monitoring_sys/README.md',
  ],
};

const observedProtocol = {
  benchmark_task: 'End-to-end RAG system performance benchmark covering ingestion/index build and query/generation/evaluation phases.',
  benchmark_domain: 'rag-aware-allocation',
  supported_modalities_observed: ['text', 'visual_pdf_image', 'audio'],
  supported_vector_databases_observed: ['lancedb', 'milvus', 'qdrant', 'chroma', 'elasticsearch'],
  default_text_corpus: 'wikimedia/wikipedia',
  query_workload_source: 'sentence-transformers/natural-questions',
  local_backend_candidate: 'lancedb',
  insert_command: 'python3 src/run_new.py --config config/lance_insert.yaml --msys-config config/monitor/example_config.yaml',
  query_command: 'python3 src/run_new.py --config config/lance_query.yaml --msys-config config/monitor/example_config.yaml',
  important_config_knobs: [
    'bench.preprocessing.chunk_size',
    'bench.preprocessing.chunk_overlap',
    'bench.preprocessing.dataset_ratio',
    'rag.retrieval.question_num',
    'rag.retrieval.retrieval_batch_size',
    'rag.retrieval.top_k',
    'rag.pipeline.batch_size',
    'rag.generation.model',
    'rag.embedding.model',
    'sys.vector_db.type',
    'sys.vector_db.db_path',
    'sys.devices.gpu_count',
    'sys.devices.gpus',
  ],
  observed_output_artifacts: [
    'output/<run>/text_pipeline_stats.txt',
    'output/<run>/translated_msys_config.yaml',
    'output/<run>/python_rt.log',
    'output/<run>/*Meter.pb.bin',
    'evaluate_result.csv',
  ],
  observed_metrics: [
    { metric_id: 'embedding_time_ns', source: 'TextsRAGPipeline text_pipeline_stats.txt', direction: 'lower_is_better' },
    { metric_id: 'retrieval_time_ns', source: 'TextsRAGPipeline text_pipeline_stats.txt', direction: 'lower_is_better' },
    { metric_id: 'rerank_time_ns', source: 'TextsRAGPipeline text_pipeline_stats.txt', direction: 'lower_is_better' },
    { metric_id: 'prompt_time_ns', source: 'TextsRAGPipeline text_pipeline_stats.txt', direction: 'lower_is_better' },
    { metric_id: 'generation_time_ns', source: 'TextsRAGPipeline text_pipeline_stats.txt', direction: 'lower_is_better' },
    { metric_id: 'total_pipeline_time_ns', source: 'derived from stage timings', direction: 'lower_is_better' },
    { metric_id: 'qps', source: 'derived from question_num / total time', direction: 'higher_is_better' },
    { metric_id: 'factual_correctness', source: 'Ragasvllm/RagasEvaluator evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'answer_accuracy', source: 'Ragasvllm evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'llm_context_recall', source: 'Ragasvllm evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'faithfulness', source: 'RagasEvaluator evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'context_recall', source: 'RagasEvaluator evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'context_precision', source: 'RagasEvaluator evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'answer_relevancy', source: 'RagasEvaluator evaluate_result.csv', direction: 'higher_is_better' },
    { metric_id: 'gpu_utilization', source: 'MSys GPUMeter protobuf output', direction: 'informational' },
    { metric_id: 'gpu_memory_or_dram_bandwidth', source: 'MSys GPUMeter protobuf output', direction: 'informational' },
    { metric_id: 'cpu_memory_disk_process_io', source: 'MSys CPU/Mem/Disk/Proc meters', direction: 'informational' },
  ],
};

const sharedChecks = {
  duplicate_check: {
    status: 'not_checked',
    required_action: 'Query experiment-foundation registry for existing RAGPerf/RAG systems benchmark, protocol, dataset, and method-component records.',
  },
  policy_check: {
    code_license_status: 'clear',
    code_license: 'Apache-2.0',
    dataset_policy_status: 'unknown',
    required_action: 'Review Hugging Face dataset licenses/policies for wikimedia/wikipedia and sentence-transformers/natural-questions before dataset candidate promotion.',
  },
  risk_assessment: {
    benchmark_risk_level: 'low',
    dataset_risk_level: 'medium',
    risk_reasons: [
      'README requirement file reference needs preflight resolution before dependency installation.',
      'Default configs include local absolute paths that must be rewritten for reproducible local execution.',
      'Query/generation/evaluation path depends on GPU-capable models and vLLM/RAGAS dependencies.',
      'Dataset policy and checksum/split manifests are not yet captured.',
      'MSys build depends on native compiler/protobuf setup.',
    ],
  },
  gate_blockers: [
    'duplicate_check_not_run',
    'dataset_policy_unknown',
    'protocol_hash_missing',
    'metric_definition_records_missing',
    'evaluator_records_missing',
    'entrypoint_smoke_missing',
    'dependency_file_reference_needs_resolution',
    'example_configs_need_local_path_rewrite',
    'gpu_model_dependencies_not_verified',
  ],
};

const candidatePayloadRequirements = {
  benchmark_candidate: {
    candidate_family: 'benchmark',
    candidate_status: 'manual_review_required',
    canonical_name: 'RAGPerf RAG Systems Benchmark',
    aliases: ['RAGPerf'],
    task: 'end_to_end_rag_system_performance',
    domain: 'rag-aware-allocation',
    source_refs: [
      ref('literature_record', 'LIT-0204'),
      ref('arxiv', '2603.10765'),
      ref('external_repository', 'platformxlab/RAGPerf'),
      ref('git_commit', sourceEvidence.observed_git_head),
    ],
    dataset_refs_required: [
      ref('dataset_asset_candidate', 'ragperf-wikipedia-corpus-candidate'),
      ref('dataset_asset_candidate', 'ragperf-natural-questions-query-candidate'),
    ],
    evaluation_protocol_candidate_refs_required: [
      ref('evaluation_protocol_candidate', 'ragperf-lance-insert-query-protocol-candidate'),
    ],
    missing_fields: [
      'duplicate_check',
      'dataset_candidate_payloads',
      'evaluation_protocol_candidate_payload',
      'metric_definition_refs',
      'protocol_hash',
      'entrypoint_smoke_result',
      'readiness_snapshot',
    ],
    next_status_if_verified: 'ready_for_promotion_after_manual_review',
  },
  evaluation_protocol_candidate: {
    candidate_family: 'evaluation_protocol',
    candidate_status: 'manual_review_required',
    canonical_name: 'RAGPerf LanceDB Insert/Query Evaluation Protocol',
    benchmark_ref_required: ref('benchmark_asset_candidate', 'ragperf-rag-systems-benchmark-candidate'),
    protocol_version: `git:${sourceEvidence.observed_git_head}`,
    protocol_summary: {
      insert_phase: observedProtocol.insert_command,
      query_phase: observedProtocol.query_command,
      monitor_config: 'config/monitor/example_config.yaml',
      default_vector_db: 'lancedb',
      default_generation_model: 'Qwen/Qwen2.5-7B-Instruct',
      default_embedding_model: 'nomic-ai/nomic-embed-text-v2-moe',
      default_query_count: 512,
      default_top_k: 10,
      default_pipeline_batch_size: 64,
    },
    metric_definition_refs_required: observedProtocol.observed_metrics.map((metric) => ref('metric_definition', metric.metric_id)),
    evaluator_refs_required: [
      ref('evaluator', 'ragperf-text-pipeline-stats-parser'),
      ref('evaluator', 'ragperf-msys-protobuf-parser'),
      ref('evaluator', 'ragas-vllm-or-ragas-evaluator'),
    ],
    missing_fields: [
      'protocol_hash',
      'metric_definition_records',
      'evaluator_ref_records',
      'local_smoke_command',
      'output_artifact_contract',
    ],
  },
  dataset_candidates: [
    {
      candidate_family: 'dataset',
      candidate_status: 'needs_info',
      canonical_name: 'RAGPerf Wikipedia Corpus Slice',
      dataset_usage: 'benchmark_dataset',
      source_dataset: 'wikimedia/wikipedia',
      role: 'vector database corpus for ingestion/index build',
      required_fields: ['data_policy_ref', 'split_protocol', 'checksum_manifest', 'dataset_version', 'local_location_ref'],
      risk_level: 'medium',
    },
    {
      candidate_family: 'dataset',
      candidate_status: 'needs_info',
      canonical_name: 'RAGPerf Natural Questions Query Workload',
      dataset_usage: 'benchmark_dataset',
      source_dataset: 'sentence-transformers/natural-questions',
      role: 'query and ground-truth workload for retrieval/generation/evaluation',
      required_fields: ['data_policy_ref', 'split_protocol', 'checksum_manifest', 'dataset_version', 'local_location_ref'],
      risk_level: 'medium',
    },
  ],
};

const smokePlan = {
  s0_static_protocol_check: [
    'Verify repo HEAD, LICENSE, README, config/README.md, lance_insert.yaml, lance_query.yaml, monitor example config, and run_new.py are reachable.',
    'Rewrite local absolute paths in copied config under a throwaway workspace outside repo.',
    'Set tiny dataset_ratio and question_num for local smoke.',
  ],
  s1_local_lancedb_smoke: [
    'Create throwaway workspace outside repo root.',
    'Install dependencies in an isolated environment.',
    'Run insert phase with LanceDB and tiny dataset slice.',
    'Run query phase with minimal question count if local GPU/model requirements are available.',
    'Collect text_pipeline_stats.txt and MSys output paths as evidence refs, not repo files.',
  ],
  s2_gpu_model_smoke: [
    'Run generation/evaluation with explicit model availability and GPU budget.',
    'Produce readiness snapshot with metric observations and blocker list.',
  ],
};

function renderMarkdown(payload) {
  const rows = [
    ['Benchmark candidate', payload.candidate_payload_requirements.benchmark_candidate.candidate_status, payload.candidate_payload_requirements.benchmark_candidate.missing_fields.join(', ')],
    ['Evaluation protocol candidate', payload.candidate_payload_requirements.evaluation_protocol_candidate.candidate_status, payload.candidate_payload_requirements.evaluation_protocol_candidate.missing_fields.join(', ')],
    ['Wikipedia corpus dataset candidate', payload.candidate_payload_requirements.dataset_candidates[0].candidate_status, payload.candidate_payload_requirements.dataset_candidates[0].required_fields.join(', ')],
    ['Natural Questions query dataset candidate', payload.candidate_payload_requirements.dataset_candidates[1].candidate_status, payload.candidate_payload_requirements.dataset_candidates[1].required_fields.join(', ')],
  ];
  const lines = [];
  lines.push('# 07 LIT-0204 RAGPerf Candidate Payload');
  lines.push('');
  lines.push('## Decision');
  lines.push('- State: in-progress');
  lines.push('- Lane: `LIT-0204` RAGPerf.');
  lines.push('- Decision: keep at candidate-payload-requirements level; do not create canonical assets.');
  lines.push('- Auto-promotion: `false`.');
  lines.push('- Recommended next step: build the RAGPerf benchmark/evaluation-protocol candidate payloads after duplicate, policy, and smoke checks.');
  lines.push('');
  lines.push('## Source Evidence');
  lines.push(`- arXiv: ${payload.source_evidence.arxiv_abs_url}.`);
  lines.push(`- Repository: ${payload.source_evidence.repository_url}.`);
  lines.push(`- Observed git HEAD: \`${payload.source_evidence.observed_git_head}\`.`);
  lines.push(`- License observed from repository LICENSE: \`${payload.source_evidence.license}\`.`);
  lines.push(`- Source caveat: ${payload.source_evidence.repository_api_caveat}`);
  for (const caveat of payload.source_evidence.source_caveats) {
    lines.push(`- Source caveat: ${caveat}`);
  }
  lines.push('');
  lines.push('## Candidate Split');
  lines.push('| Candidate | Status | Missing fields before promotion |');
  lines.push('| --- | --- | --- |');
  for (const row of rows) {
    lines.push(`| ${row[0]} | \`${row[1]}\` | ${row[2]} |`);
  }
  lines.push('');
  lines.push('## Observed Protocol');
  lines.push(`- Insert phase: \`${payload.observed_protocol.insert_command}\`.`);
  lines.push(`- Query phase: \`${payload.observed_protocol.query_command}\`.`);
  lines.push(`- Default text corpus: \`${payload.observed_protocol.default_text_corpus}\`.`);
  lines.push(`- Query workload source: \`${payload.observed_protocol.query_workload_source}\`.`);
  lines.push(`- Local backend candidate: \`${payload.observed_protocol.local_backend_candidate}\`.`);
  lines.push('- Important knobs:');
  for (const knob of payload.observed_protocol.important_config_knobs) {
    lines.push(`  - \`${knob}\``);
  }
  lines.push('');
  lines.push('## Metric Requirements');
  lines.push('| Metric | Source | Direction |');
  lines.push('| --- | --- | --- |');
  for (const metric of payload.observed_protocol.observed_metrics) {
    lines.push(`| \`${metric.metric_id}\` | ${metric.source} | \`${metric.direction}\` |`);
  }
  lines.push('');
  lines.push('## Gate Status');
  lines.push('- Duplicate check: `not_checked`; query the experiment-foundation registry before promotion.');
  lines.push('- Code policy: `clear` for Apache-2.0 repo license.');
  lines.push('- Dataset policy: `unknown`; review Hugging Face dataset policies before dataset promotion.');
  lines.push('- Risk: benchmark/protocol low, dataset medium.');
  lines.push('- Completeness: `needs_info`; no protocol hash, metric definition records, evaluator refs, dataset versions, checksum manifests, or smoke evidence yet.');
  lines.push(`- Gate blockers: ${payload.shared_checks.gate_blockers.map((blocker) => `\`${blocker}\``).join(', ')}.`);
  lines.push('');
  lines.push('## Smoke Plan');
  lines.push('### S0 Static Protocol Check');
  for (const item of payload.smoke_plan.s0_static_protocol_check) lines.push(`- ${item}`);
  lines.push('');
  lines.push('### S1 Local LanceDB Smoke');
  for (const item of payload.smoke_plan.s1_local_lancedb_smoke) lines.push(`- ${item}`);
  lines.push('');
  lines.push('### S2 GPU/Model Smoke');
  for (const item of payload.smoke_plan.s2_gpu_model_smoke) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Artifact Boundary');
  lines.push(`- JSON payload requirements: \`${JSON_PATH}\`.`);
  lines.push('- No raw dataset, cloned repository, model checkpoint, log, or execution output is stored in repo.');
  return `${lines.join('\n').trimEnd()}\n`;
}

async function main() {
  const payload = {
    generated_at: GENERATED_AT,
    task_id: 'T-118',
    source_evidence: sourceEvidence,
    observed_protocol: observedProtocol,
    shared_checks: sharedChecks,
    candidate_payload_requirements: candidatePayloadRequirements,
    smoke_plan: smokePlan,
    decision: {
      auto_promotion_allowed: false,
      current_candidate_status: 'manual_review_required',
      next_lane_action: 'Construct benchmark and evaluation-protocol candidate payloads after duplicate/policy/smoke checks.',
      canonical_asset_creation: false,
    },
  };
  payload.payload_hash = hashPayload(payload);
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(MD_PATH, renderMarkdown(payload));
  console.log(JSON.stringify({
    literature_id: payload.source_evidence.literature_id,
    decision: payload.decision,
    payload_hash: payload.payload_hash,
    artifact_paths: {
      json: JSON_PATH,
      markdown: MD_PATH,
    },
  }, null, 2));
}

await main();
