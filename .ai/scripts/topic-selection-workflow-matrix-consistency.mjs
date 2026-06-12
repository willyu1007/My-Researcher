#!/usr/bin/env node
// Topic-selection workflow matrix consistency check (T-123 Phase 0, DP-0.8).
//
// Validates the permanent SSOT matrix at docs/context/process/topic-selection-workflow-matrix.md
// against the code authority sources:
//   v1a node ids          <- TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS (shared contracts)
//   v1b node ids          <- TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS (shared contracts)
//   v1b slot ids          <- TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS
//   v1b codex consistency <- node policy / slot allowed_execution_modes
//   v1c node ids          <- TOPIC_SELECTION_V1C_NODE_ID (shared topic-selection-v1c-node-ids.ts)
//   downstream node ids   <- TOPIC_SELECTION_DOWNSTREAM_NODE_ID (same file)
//   resource-sampling     <- topic-selection-resource-sampling-service.ts node id const
//
// Product-decision columns (debate_allowed / debate_primitive / human_review_required /
// human_delegated_allowed) are NOT auto-checked; they are not derivable from contracts.
//
// Usage:
//   node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs            # check real files
//   node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs --self-test # drift-injection negatives

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FILES = {
  matrix: 'docs/context/process/topic-selection-workflow-matrix.md',
  v1a: 'packages/shared/src/research-lifecycle/topic-selection-v1a-workflow-harness-contracts.ts',
  v1b: 'packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts',
  v1c: 'packages/shared/src/research-lifecycle/topic-selection-v1c-node-ids.ts',
  resourceSampling: 'apps/backend/src/services/topic-selection-resource-sampling-service.ts',
};

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

// --- code-side extraction -------------------------------------------------

function extractBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`marker not found: ${marker}`);
  const end = source.indexOf(' as const', start);
  if (end === -1) throw new Error(`unterminated block for: ${marker}`);
  return source.slice(start, end);
}

function extractQuoted(block, prefix) {
  const out = [];
  const re = /'([^']+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[1].startsWith(prefix)) out.push(m[1]);
  }
  return out;
}

function extractCodeSets(sources) {
  const v1aNodes = new Set(
    extractQuoted(
      extractBlock(sources.v1a, 'TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS = ['),
      'topic-selection.v1a.',
    ),
  );
  const v1bNodes = new Set(
    extractQuoted(
      extractBlock(sources.v1b, 'TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS = ['),
      'topic-selection.v1b.',
    ),
  );
  const v1cNodes = new Set(
    extractQuoted(extractBlock(sources.v1c, 'TOPIC_SELECTION_V1C_NODE_ID = {'), 'topic-selection.v1c.'),
  );
  const downstreamNodes = new Set(
    extractQuoted(
      extractBlock(sources.v1c, 'TOPIC_SELECTION_DOWNSTREAM_NODE_ID = {'),
      'topic-selection.downstream.',
    ),
  );
  const rsMatch = sources.resourceSampling.match(/'(topic-selection\.resource-sampling\.[^']+)' as const/);
  if (!rsMatch) throw new Error('resource-sampling node id const not found');
  const resourceSamplingNodes = new Set([rsMatch[1]]);

  // v1b slots + per-slot modes
  const slotsBlock = extractBlock(
    sources.v1b,
    'TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS = [',
  );
  const v1bSlots = new Set();
  const slotModesByNode = new Map();
  for (const seg of slotsBlock.split(/slot_id: '/).slice(1)) {
    const slotId = seg.slice(0, seg.indexOf("'"));
    v1bSlots.add(slotId);
    const nodeMatch = seg.match(/node_id: '([^']+)'/);
    const modesMatch = seg.match(/allowed_execution_modes: \[([^\]]*)\]/);
    if (nodeMatch && modesMatch) {
      const modes = extractQuoted(modesMatch[1], '');
      const prev = slotModesByNode.get(nodeMatch[1]) ?? new Set();
      for (const mode of modes) prev.add(mode);
      slotModesByNode.set(nodeMatch[1], prev);
    }
  }

  // v1b node-policy modes (node-level allowed_execution_modes)
  const policiesBlock = extractBlock(sources.v1b, 'TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES = [');
  const codexAllowedByNode = new Map();
  for (const seg of policiesBlock.split(/node_index: /).slice(1)) {
    const nodeMatch = seg.match(/node_id: '([^']+)'/);
    const modesMatch = seg.match(/allowed_execution_modes: \[([^\]]*)\]/);
    if (!nodeMatch || !modesMatch) continue;
    const nodeId = nodeMatch[1];
    const modes = new Set(extractQuoted(modesMatch[1], ''));
    for (const mode of slotModesByNode.get(nodeId) ?? []) modes.add(mode);
    codexAllowedByNode.set(nodeId, modes.has('codex_assisted'));
  }

  return { v1aNodes, v1bNodes, v1cNodes, downstreamNodes, resourceSamplingNodes, v1bSlots, codexAllowedByNode };
}

// --- matrix-side extraction -----------------------------------------------

function parseMatrix(markdown) {
  const lines = markdown.split('\n');
  const nodeRows = [];
  const slotRows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i].trim();
    if (!/^\|\s*node_id\s*\|/.test(header)) continue;
    const headerCells = splitRow(header);
    const kind = headerCells[1] === 'stage' ? 'node' : headerCells[1] === 'slot_id' ? 'slot' : null;
    if (!kind) continue;
    let j = i + 2; // skip separator row
    for (; j < lines.length && lines[j].trim().startsWith('|'); j += 1) {
      const cells = splitRow(lines[j].trim());
      if (cells.length < 2) continue;
      const nodeId = cells[0].replaceAll('`', '').trim();
      if (!nodeId.startsWith('topic-selection.')) continue;
      if (kind === 'node') {
        const row = Object.fromEntries(headerCells.map((name, idx) => [name, cells[idx] ?? '']));
        nodeRows.push({ node_id: nodeId, stage: row.stage?.trim() ?? '', codex_allowed: row.codex_allowed ?? '' });
      } else {
        slotRows.push({ node_id: nodeId, slot_id: cells[1].replaceAll('`', '').trim() });
      }
    }
    i = j - 1;
  }
  return { nodeRows, slotRows };
}

function splitRow(line) {
  return line.split('|').slice(1, -1).map((cell) => cell.trim());
}

function parseYesNo(cell, context, issues) {
  const normalized = cell.trim().toLowerCase();
  if (normalized.startsWith('yes')) return true;
  if (normalized.startsWith('no')) return false;
  issues.push({ check: 'codex_cell_unparseable', detail: `${context}: ${JSON.stringify(cell)}` });
  return null;
}

// --- checks ----------------------------------------------------------------

export function checkConsistency({ matrix, sources }) {
  const issues = [];
  const code = extractCodeSets(sources);
  const { nodeRows, slotRows } = parseMatrix(matrix);

  const stageSets = {
    v1a: code.v1aNodes,
    v1b: code.v1bNodes,
    v1c: code.v1cNodes,
    downstream: code.downstreamNodes,
    resource_sampling: code.resourceSamplingNodes,
  };

  for (const [stage, codeSet] of Object.entries(stageSets)) {
    const matrixSet = new Set(nodeRows.filter((row) => row.stage === stage).map((row) => row.node_id));
    for (const id of codeSet) {
      if (!matrixSet.has(id)) issues.push({ check: `${stage}_missing_in_matrix`, detail: id });
    }
    for (const id of matrixSet) {
      if (!codeSet.has(id)) issues.push({ check: `${stage}_extra_in_matrix`, detail: id });
    }
  }

  const matrixV1bSlots = new Set(
    slotRows.filter((row) => row.node_id.startsWith('topic-selection.v1b.')).map((row) => row.slot_id),
  );
  for (const slot of code.v1bSlots) {
    if (!matrixV1bSlots.has(slot)) issues.push({ check: 'v1b_slot_missing_in_matrix', detail: slot });
  }
  for (const slot of matrixV1bSlots) {
    if (!code.v1bSlots.has(slot)) issues.push({ check: 'v1b_slot_extra_in_matrix', detail: slot });
  }

  for (const row of nodeRows.filter((r) => r.stage === 'v1b')) {
    if (!code.codexAllowedByNode.has(row.node_id)) continue; // missing node already reported
    const expected = code.codexAllowedByNode.get(row.node_id);
    const actual = parseYesNo(row.codex_allowed, row.node_id, issues);
    if (actual !== null && actual !== expected) {
      issues.push({
        check: 'v1b_codex_allowed_mismatch',
        detail: `${row.node_id}: matrix=${actual ? 'yes' : 'no'} contracts=${expected ? 'yes' : 'no'}`,
      });
    }
  }

  return issues;
}

// --- self-test (drift injection against real files) -------------------------

function mutateRowCell(matrix, nodeId, headerName, value) {
  const lines = matrix.split('\n');
  let headerCells = null;
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (/^\|\s*node_id\s*\|/.test(trimmed)) headerCells = splitRow(trimmed);
    if (headerCells && trimmed.startsWith(`| \`${nodeId}\``)) {
      const cells = splitRow(trimmed);
      cells[headerCells.indexOf(headerName)] = value;
      lines[i] = `| ${cells.join(' | ')} |`;
      return lines.join('\n');
    }
  }
  throw new Error(`row not found for mutation: ${nodeId}`);
}

function runSelfTest(real) {
  const expectIssues = (label, matrix, predicate) => {
    const issues = checkConsistency({ matrix, sources: real.sources });
    if (!predicate(issues)) {
      console.error(`[self-test] FAIL ${label}`);
      console.error(issues);
      return false;
    }
    console.log(`[self-test] ok ${label}`);
    return true;
  };

  const cleanOk = expectIssues('clean matrix has zero issues', real.matrix, (issues) => issues.length === 0);

  const renamed = real.matrix.replaceAll(
    'topic-selection.v1b.assess-topic-value.v1',
    'topic-selection.v1b.assess-topic-value-renamed.v1',
  );
  const renamedOk = expectIssues(
    'renamed v1b node detected (missing + extra)',
    renamed,
    (issues) =>
      issues.some((i) => i.check === 'v1b_missing_in_matrix' && i.detail.includes('assess-topic-value.v1')) &&
      issues.some((i) => i.check === 'v1b_extra_in_matrix' && i.detail.includes('assess-topic-value-renamed.v1')),
  );

  const deleted = real.matrix
    .split('\n')
    .filter((line) => !line.trim().startsWith('| `topic-selection.v1b.create-draft-topic-package.v1`'))
    .join('\n');
  const deletedOk = expectIssues('deleted v1b row detected', deleted, (issues) =>
    issues.some((i) => i.check === 'v1b_missing_in_matrix' && i.detail.includes('create-draft-topic-package')),
  );

  const v1bHeaderRowIndex = real.matrix.indexOf('| `topic-selection.v1b.create-intake-snapshot.v1`');
  const extraRowLineEnd = real.matrix.indexOf('\n', v1bHeaderRowIndex);
  const extraRowLine = real.matrix
    .slice(v1bHeaderRowIndex, extraRowLineEnd)
    .replace('topic-selection.v1b.create-intake-snapshot.v1', 'topic-selection.v1b.fabricated-node.v1');
  const extra = `${real.matrix.slice(0, extraRowLineEnd)}\n${extraRowLine}${real.matrix.slice(extraRowLineEnd)}`;
  const extraOk = expectIssues('fabricated v1b row detected', extra, (issues) =>
    issues.some((i) => i.check === 'v1b_extra_in_matrix' && i.detail.includes('fabricated-node')),
  );

  const slotDeleted = real.matrix
    .split('\n')
    .filter((line) => !line.includes('`n6_loopback_triage`'))
    .join('\n');
  const slotOk = expectIssues('deleted v1b slot row detected', slotDeleted, (issues) =>
    issues.some((i) => i.check === 'v1b_slot_missing_in_matrix' && i.detail === 'n6_loopback_triage'),
  );

  const codexFlipped = mutateRowCell(
    real.matrix,
    'topic-selection.v1b.generate-research-slice-options.v1',
    'codex_allowed',
    'no',
  );
  const codexOk = expectIssues('flipped codex_allowed detected', codexFlipped, (issues) =>
    issues.some(
      (i) => i.check === 'v1b_codex_allowed_mismatch' && i.detail.includes('generate-research-slice-options'),
    ),
  );

  const v1cRenamed = real.matrix.replaceAll(
    'topic-selection.v1c.run-promotion-gate.v1',
    'topic-selection.v1c.run-promotion-gate-renamed.v1',
  );
  const v1cOk = expectIssues('renamed v1c node detected', v1cRenamed, (issues) =>
    issues.some((i) => i.check === 'v1c_missing_in_matrix' && i.detail.includes('run-promotion-gate.v1')),
  );

  return cleanOk && renamedOk && deletedOk && extraOk && slotOk && codexOk && v1cOk;
}

// --- CLI ---------------------------------------------------------------------

function loadReal() {
  return {
    matrix: read(FILES.matrix),
    sources: {
      v1a: read(FILES.v1a),
      v1b: read(FILES.v1b),
      v1c: read(FILES.v1c),
      resourceSampling: read(FILES.resourceSampling),
    },
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const real = loadReal();
  if (process.argv.includes('--self-test')) {
    process.exit(runSelfTest(real) ? 0 : 1);
  }
  const issues = checkConsistency({ matrix: real.matrix, sources: real.sources });
  if (issues.length > 0) {
    console.error(`[matrix-consistency] ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`  - ${issue.check}: ${issue.detail}`);
    process.exit(1);
  }
  console.log('[matrix-consistency] ok — matrix matches code authority sources.');
  process.exit(0);
}
