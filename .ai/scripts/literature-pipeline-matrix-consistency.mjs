// Literature pipeline matrix consistency checker (T-130 W-08, closes L-12).
//
// SSOT: docs/context/process/literature-pipeline-matrix.md
// Code authorities:
//   - packages/shared/src/research-lifecycle/literature-contracts.ts
//       LITERATURE_CONTENT_PROCESSING_STAGE_CODES (set + order)
//       LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES
//       LITERATURE_CONTENT_PROCESSING_TRIGGER_SOURCES
//   - apps/backend/src/services/literature-flow-service.ts
//       PIPELINE_STAGE_CODES (double-write of the contract sequence — the L-12 guard)
//       DEEP_PIPELINE_STAGES (must be a contiguous suffix of the sequence)
//   - apps/backend/src/services/literature-service.ts + literature-flow-service.ts
//       markStagesStale call sites (invalidation chains: reasonCode → stages set)
//
// Usage:
//   node .ai/scripts/literature-pipeline-matrix-consistency.mjs              # check
//   node .ai/scripts/literature-pipeline-matrix-consistency.mjs --self-test  # drift-injection negatives

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MATRIX_PATH = path.join(repoRoot, 'docs', 'context', 'process', 'literature-pipeline-matrix.md');
const CONTRACTS_PATH = path.join(
  repoRoot,
  'packages', 'shared', 'src', 'research-lifecycle', 'literature-contracts.ts',
);
const FLOW_SERVICE_PATH = path.join(repoRoot, 'apps', 'backend', 'src', 'services', 'literature-flow-service.ts');
const LITERATURE_SERVICE_PATH = path.join(repoRoot, 'apps', 'backend', 'src', 'services', 'literature-service.ts');

// --- extraction --------------------------------------------------------------

function extractConstStringArray(source, constName, file) {
  const match = source.match(new RegExp(`${constName}[^=]*=\\s*\\[([^\\]]*)\\]`));
  if (!match) {
    throw new Error(`cannot extract ${constName} from ${file}`);
  }
  const values = [...match[1].matchAll(/'([A-Z_]+)'/g)].map((entry) => entry[1]);
  if (values.length === 0) {
    throw new Error(`extracted ${constName} from ${file} but found zero values`);
  }
  return values;
}

function extractInvalidationChains(source, file) {
  // markStagesStale call sites: stages: ['A', 'B', ...] ... reasonCode: 'X'
  const chains = [];
  const callPattern = /markStagesStale\(\{[\s\S]*?stages:\s*\[([^\]]*)\][\s\S]*?reasonCode:\s*'([A-Z_]+)'/g;
  for (const match of source.matchAll(callPattern)) {
    const stages = [...match[1].matchAll(/'([A-Z_]+)'/g)].map((entry) => entry[1]);
    chains.push({ reasonCode: match[2], stages, file });
  }
  return chains;
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function extractMatrixTable(matrix, firstHeader) {
  const lines = matrix.split('\n');
  const headerIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && splitRow(trimmed)[0] === firstHeader;
  });
  if (headerIndex === -1) {
    throw new Error(`matrix table with first header ${firstHeader} not found`);
  }
  const header = splitRow(lines[headerIndex]);
  const rows = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|')) {
      break;
    }
    rows.push({ cells: splitRow(trimmed), line: i + 1 });
  }
  if (rows.length === 0) {
    throw new Error(`matrix table ${firstHeader} has zero rows`);
  }
  return { header, rows };
}

function backticked(cell) {
  return [...cell.matchAll(/`([^`]+)`/g)].map((entry) => entry[1]);
}

function loadReal() {
  const matrix = readFileSync(MATRIX_PATH, 'utf8');
  const contracts = readFileSync(CONTRACTS_PATH, 'utf8');
  const flowService = readFileSync(FLOW_SERVICE_PATH, 'utf8');
  const literatureService = readFileSync(LITERATURE_SERVICE_PATH, 'utf8');
  return { matrix, contracts, flowService, literatureService };
}

// --- checks ------------------------------------------------------------------

function checkConsistency(inputs) {
  const issues = [];
  const push = (check, detail) => issues.push({ check, detail });

  let contractStages;
  let contractStatuses;
  let contractTriggers;
  let flowStages;
  let deepStages;
  let chains;
  let stageTable;
  let statusTable;
  let triggerTable;
  let chainTable;
  try {
    contractStages = extractConstStringArray(
      inputs.contracts, 'LITERATURE_CONTENT_PROCESSING_STAGE_CODES', 'literature-contracts.ts');
    contractStatuses = extractConstStringArray(
      inputs.contracts, 'LITERATURE_CONTENT_PROCESSING_STAGE_STATUSES', 'literature-contracts.ts');
    contractTriggers = extractConstStringArray(
      inputs.contracts, 'LITERATURE_CONTENT_PROCESSING_TRIGGER_SOURCES', 'literature-contracts.ts');
    flowStages = extractConstStringArray(inputs.flowService, 'PIPELINE_STAGE_CODES', 'literature-flow-service.ts');
    deepStages = extractConstStringArray(inputs.flowService, 'DEEP_PIPELINE_STAGES', 'literature-flow-service.ts');
    chains = [
      ...extractInvalidationChains(inputs.literatureService, 'literature-service.ts'),
      ...extractInvalidationChains(inputs.flowService, 'literature-flow-service.ts'),
    ];
    stageTable = extractMatrixTable(inputs.matrix, 'stage_code');
    statusTable = extractMatrixTable(inputs.matrix, 'status');
    triggerTable = extractMatrixTable(inputs.matrix, 'trigger_source');
    chainTable = extractMatrixTable(inputs.matrix, 'reason_code');
  } catch (error) {
    push('extraction_failed', error instanceof Error ? error.message : String(error));
    return issues;
  }

  // Row shape guard for every checked table.
  for (const [name, table] of [
    ['stage', stageTable], ['status', statusTable], ['trigger', triggerTable], ['chain', chainTable],
  ]) {
    for (const row of table.rows) {
      if (row.cells.length !== table.header.length) {
        push('row_shape', `${name} table line ${row.line}: ${row.cells.length} cells vs header ${table.header.length}`);
      }
    }
  }

  // Stage set + ORDER: matrix rows vs contract.
  const matrixStages = stageTable.rows.map((row) => backticked(row.cells[0])[0]).filter(Boolean);
  if (JSON.stringify(matrixStages) !== JSON.stringify(contractStages)) {
    push('stage_sequence', `matrix [${matrixStages.join(', ')}] != contract [${contractStages.join(', ')}]`);
  }

  // L-12 double-write guard: flow-service sequence vs contract.
  if (JSON.stringify(flowStages) !== JSON.stringify(contractStages)) {
    push('flow_service_sequence', `PIPELINE_STAGE_CODES [${flowStages.join(', ')}] != contract [${contractStages.join(', ')}]`);
  }
  // DEEP_PIPELINE_STAGES must be a contiguous suffix of the sequence.
  const suffix = contractStages.slice(contractStages.length - deepStages.length);
  if (JSON.stringify(deepStages) !== JSON.stringify(suffix)) {
    push('deep_stages_suffix', `DEEP_PIPELINE_STAGES [${deepStages.join(', ')}] is not the contract suffix [${suffix.join(', ')}]`);
  }

  // Status + trigger vocabularies (set + order).
  const matrixStatuses = statusTable.rows.map((row) => backticked(row.cells[0])[0]).filter(Boolean);
  if (JSON.stringify(matrixStatuses) !== JSON.stringify(contractStatuses)) {
    push('status_vocabulary', `matrix [${matrixStatuses.join(', ')}] != contract [${contractStatuses.join(', ')}]`);
  }
  const matrixTriggers = triggerTable.rows.map((row) => backticked(row.cells[0])[0]).filter(Boolean);
  if (JSON.stringify(matrixTriggers) !== JSON.stringify(contractTriggers)) {
    push('trigger_vocabulary', `matrix [${matrixTriggers.join(', ')}] != contract [${contractTriggers.join(', ')}]`);
  }

  // Invalidation chains: matrix rows vs code call sites (set equality per reason code).
  if (chains.length < 4) {
    push('chain_extraction', `expected >=4 markStagesStale call sites in code, found ${chains.length}`);
  }
  const chainHeader = chainTable.header;
  const stalesIndex = chainHeader.indexOf('stale_stages');
  const codeChainsByReason = new Map();
  for (const chain of chains) {
    // Multiple call sites may share a reason code; require identical stage sets if so.
    const existing = codeChainsByReason.get(chain.reasonCode);
    if (existing && JSON.stringify([...existing].sort()) !== JSON.stringify([...chain.stages].sort())) {
      push('chain_code_conflict', `reason ${chain.reasonCode} has conflicting stage sets across call sites`);
    }
    codeChainsByReason.set(chain.reasonCode, chain.stages);
  }
  const matrixChainReasons = new Set();
  for (const row of chainTable.rows) {
    const reason = backticked(row.cells[0])[0];
    if (!reason) {
      push('chain_row', `chain table line ${row.line}: no backticked reason_code`);
      continue;
    }
    matrixChainReasons.add(reason);
    const matrixStagesForReason = stalesIndex >= 0 ? backticked(row.cells[stalesIndex] ?? '') : [];
    const codeStages = codeChainsByReason.get(reason);
    if (!codeStages) {
      push('chain_missing_in_code', `matrix chain ${reason} has no markStagesStale call site`);
      continue;
    }
    if (JSON.stringify([...matrixStagesForReason].sort()) !== JSON.stringify([...codeStages].sort())) {
      push('chain_stage_set', `chain ${reason}: matrix {${matrixStagesForReason.join(', ')}} != code {${codeStages.join(', ')}}`);
    }
    // Structural D7 assertion: every chain must include INDEXED (union freshness signal).
    if (!codeStages.includes('INDEXED') || !matrixStagesForReason.includes('INDEXED')) {
      push('chain_missing_indexed', `chain ${reason} does not include INDEXED — breaks the W-05 union freshness signal`);
    }
    // Chain stages must be known stage codes.
    for (const stage of matrixStagesForReason) {
      if (!contractStages.includes(stage)) {
        push('chain_unknown_stage', `chain ${reason} references unknown stage ${stage}`);
      }
    }
  }
  for (const reason of codeChainsByReason.keys()) {
    if (!matrixChainReasons.has(reason)) {
      push('chain_missing_in_matrix', `code chain ${reason} is not documented in the matrix`);
    }
  }

  return issues;
}

// --- self-test (drift injection against real files) --------------------------

function runSelfTest(real) {
  const expectIssues = (label, inputs, predicate) => {
    const issues = checkConsistency({ ...real, ...inputs });
    if (!predicate(issues)) {
      console.error(`[self-test] FAIL ${label}`);
      console.error(issues);
      return false;
    }
    console.log(`[self-test] ok ${label}`);
    return true;
  };

  const results = [];

  results.push(expectIssues('clean inputs have zero issues', {}, (issues) => issues.length === 0));

  results.push(expectIssues(
    'reordered matrix stage rows detected',
    {
      matrix: (() => {
        const lines = real.matrix.split('\n');
        const first = lines.findIndex((line) => line.trim().startsWith('| `CITATION_NORMALIZED`'));
        const second = lines.findIndex((line) => line.trim().startsWith('| `ABSTRACT_READY`'));
        const copy = [...lines];
        [copy[first], copy[second]] = [copy[second], copy[first]];
        return copy.join('\n');
      })(),
    },
    (issues) => issues.some((issue) => issue.check === 'stage_sequence'),
  ));

  results.push(expectIssues(
    'flow-service double-write drift detected (L-12)',
    { flowService: real.flowService.replace("'CHUNKED',\n  'EMBEDDED',", "'EMBEDDED',\n  'CHUNKED',") },
    (issues) => issues.some((issue) => issue.check === 'flow_service_sequence'),
  ));

  results.push(expectIssues(
    'chain losing INDEXED detected (D7 union signal)',
    {
      literatureService: real.literatureService.replace(
        "stages: ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED'],",
        "stages: ['FULLTEXT_PREPROCESSED', 'KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED'],",
      ),
    },
    (issues) => issues.some((issue) => issue.check === 'chain_missing_indexed' || issue.check === 'chain_stage_set'),
  ));

  results.push(expectIssues(
    'undocumented code chain detected',
    {
      matrix: real.matrix
        .split('\n')
        .filter((line) => !line.trim().startsWith('| `KEY_CONTENT_DOSSIER_IMPORTED`'))
        .join('\n'),
    },
    (issues) => issues.some((issue) => issue.check === 'chain_missing_in_matrix'),
  ));

  results.push(expectIssues(
    'status vocabulary drift detected',
    { matrix: real.matrix.replace('| `STALE` |', '| `STALE_RENAMED` |') },
    (issues) => issues.some((issue) => issue.check === 'status_vocabulary'),
  ));

  results.push(expectIssues(
    'row shape drift detected',
    { matrix: real.matrix.replace('| `BACKFILL` | 批量回灌', '| `BACKFILL` | | 批量回灌') },
    (issues) => issues.some((issue) => issue.check === 'row_shape'),
  ));

  return results.every(Boolean);
}

// --- main --------------------------------------------------------------------

const real = loadReal();

if (process.argv.includes('--self-test')) {
  process.exit(runSelfTest(real) ? 0 : 1);
}

const issues = checkConsistency(real);
if (issues.length > 0) {
  console.error(`literature pipeline matrix consistency: ${issues.length} issue(s)`);
  for (const issue of issues) {
    console.error(`  [${issue.check}] ${issue.detail}`);
  }
  process.exit(1);
}
console.log('literature pipeline matrix consistency: ok');
process.exit(0);
