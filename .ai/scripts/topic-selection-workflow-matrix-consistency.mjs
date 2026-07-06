#!/usr/bin/env node
// Topic-selection workflow matrix consistency check (T-123 Phase 0, DP-0.8; extended T-089 slice ①③).
//
// Validates the permanent SSOT matrix at docs/context/process/topic-selection-workflow-matrix.md
// against the code authority sources:
//   v1a node ids          <- TOPIC_SELECTION_V1A_WORKFLOW_HARNESS_NODE_IDS (shared contracts)
//   v1b node ids          <- TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_IDS (shared contracts)
//   v1b slot ids          <- TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_SEMANTIC_SUPPORT_SLOTS
//   v1b codex consistency <- node policy / slot allowed_execution_modes
//   v1b executor_kind     <- node policy execution_kind (deterministic/delegated/model_like)
//   v1b human_delegated   <- node policy + slot allowed_execution_modes
//   v1b default mode      <- membership in node policy + slot allowed_execution_modes
//   v1c node ids          <- TOPIC_SELECTION_V1C_NODE_ID (shared topic-selection-v1c-node-ids.ts)
//   v1c/downstream semantic columns <- TOPIC_SELECTION_V1C_NODE_POLICIES /
//                            TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES
//                            (shared topic-selection-v1c-node-policy-contracts.ts, T-089 slice ②)
//   downstream node ids   <- TOPIC_SELECTION_DOWNSTREAM_NODE_ID (v1c-node-ids file)
//   resource-sampling     <- topic-selection-resource-sampling-service.ts node id const
//   covered_scenarios     <- scenario registry in T-089 08-scenarios.md (bidirectional set equality
//                            between matrix covered_scenarios cells and registry covered_nodes)
//   script registration   <- every .ai/scripts/topic-selection-*.mjs must be registered in the
//                            scenario registry doc (T-088 D-28 hard rule)
//
// Still NOT auto-checked (no structured code authority yet): v1a semantic columns
// (executor_kind/default_execution_mode/...), the resource-sampling row's semantic columns, and
// the resource-sampling / v1a Invocation Slot Map rows' prose columns (Kind/Profile/Status — only
// the v1b slot_id set has a code authority source; the stale profile-escalation wording there was
// retired by hand per T-088 D-27, see matrix Change Log 2026-07-06) —
// see T-089 00-overview backlog notes.
//
// Usage:
//   node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs            # check real files
//   node .ai/scripts/topic-selection-workflow-matrix-consistency.mjs --self-test # drift-injection negatives

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const FILES = {
  matrix: 'docs/context/process/topic-selection-workflow-matrix.md',
  v1a: 'packages/shared/src/research-lifecycle/topic-selection-v1a-workflow-harness-contracts.ts',
  v1b: 'packages/shared/src/research-lifecycle/topic-selection-v1b-workflow-harness-contracts.ts',
  v1c: 'packages/shared/src/research-lifecycle/topic-selection-v1c-node-ids.ts',
  v1cPolicies: 'packages/shared/src/research-lifecycle/topic-selection-v1c-node-policy-contracts.ts',
  resourceSampling: 'apps/backend/src/services/topic-selection-resource-sampling-service.ts',
  scenarios: 'dev-docs/active/topic-selection-agent-workflow-review/08-scenarios.md',
};

const SCRIPTS_DIR = '.ai/scripts';
const SCRIPT_PREFIX = 'topic-selection-';

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

function extractIdMap(source, marker, prefix) {
  // Parses `KEY = { key_name: 'topic-selection...', ... }` into Map(key_name -> id).
  const block = extractBlock(source, marker);
  const map = new Map();
  const re = /(\w+):\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    if (m[2].startsWith(prefix)) map.set(m[1], m[2]);
  }
  return map;
}

function extractSemanticPolicies(source, marker, idMaps) {
  // Parses TOPIC_SELECTION_V1C_NODE_POLICIES / TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES entries.
  // node_id fields reference the id constants (e.g. TOPIC_SELECTION_V1C_NODE_ID.n1_...), so they
  // are resolved through idMaps built from the node-ids source.
  const block = extractBlock(source, marker);
  const policies = new Map();
  for (const seg of block.split(/node_index:/).slice(1)) {
    const refMatch = seg.match(/node_id:\s*TOPIC_SELECTION_(?:V1C|DOWNSTREAM)_NODE_ID\.(\w+)/);
    if (!refMatch) throw new Error(`unresolvable node_id reference in ${marker}`);
    const nodeId = idMaps.get(refMatch[1]);
    if (!nodeId) throw new Error(`unknown node id key: ${refMatch[1]}`);
    const str = (field) => {
      const m = seg.match(new RegExp(`${field}:\\s*'([^']+)'`));
      if (!m) throw new Error(`missing ${field} for ${nodeId}`);
      return m[1];
    };
    const bool = (field) => {
      const m = seg.match(new RegExp(`${field}:\\s*(true|false)`));
      if (!m) throw new Error(`missing ${field} for ${nodeId}`);
      return m[1] === 'true';
    };
    policies.set(nodeId, {
      executor_kind: str('executor_kind'),
      default_execution_mode: str('default_execution_mode'),
      codex_allowed: bool('codex_allowed'),
      provider_required: bool('provider_required'),
      debate_allowed: bool('debate_allowed'),
      debate_primitive: str('debate_primitive'),
      human_review_required: bool('human_review_required'),
      human_delegated_allowed: bool('human_delegated_allowed'),
    });
  }
  return policies;
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
  const v1cIdMap = extractIdMap(sources.v1c, 'TOPIC_SELECTION_V1C_NODE_ID = {', 'topic-selection.v1c.');
  const downstreamIdMap = extractIdMap(
    sources.v1c,
    'TOPIC_SELECTION_DOWNSTREAM_NODE_ID = {',
    'topic-selection.downstream.',
  );
  const v1cNodes = new Set(v1cIdMap.values());
  const downstreamNodes = new Set(downstreamIdMap.values());
  const rsMatch = sources.resourceSampling.match(/'(topic-selection\.resource-sampling\.[^']+)' as const/);
  if (!rsMatch) throw new Error('resource-sampling node id const not found');
  const resourceSamplingNodes = new Set([rsMatch[1]]);

  const nodeIdKeyMap = new Map([...v1cIdMap, ...downstreamIdMap]);
  const v1cSemanticPolicies = extractSemanticPolicies(
    sources.v1cPolicies,
    'TOPIC_SELECTION_V1C_NODE_POLICIES = [',
    nodeIdKeyMap,
  );
  const downstreamSemanticPolicies = extractSemanticPolicies(
    sources.v1cPolicies,
    'TOPIC_SELECTION_DOWNSTREAM_NODE_POLICIES = [',
    nodeIdKeyMap,
  );

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

  // v1b node-policy semantics (node-level allowed_execution_modes + execution_kind)
  const policiesBlock = extractBlock(sources.v1b, 'TOPIC_SELECTION_V1B_WORKFLOW_HARNESS_NODE_POLICIES = [');
  const codexAllowedByNode = new Map();
  const executionKindByNode = new Map();
  const allowedModesByNode = new Map();
  for (const seg of policiesBlock.split(/node_index: /).slice(1)) {
    const nodeMatch = seg.match(/node_id: '([^']+)'/);
    const modesMatch = seg.match(/allowed_execution_modes: \[([^\]]*)\]/);
    const kindMatch = seg.match(/execution_kind: '([^']+)'/);
    if (!nodeMatch || !modesMatch) continue;
    const nodeId = nodeMatch[1];
    const modes = new Set(extractQuoted(modesMatch[1], ''));
    for (const mode of slotModesByNode.get(nodeId) ?? []) modes.add(mode);
    codexAllowedByNode.set(nodeId, modes.has('codex_assisted'));
    allowedModesByNode.set(nodeId, modes);
    if (kindMatch) executionKindByNode.set(nodeId, kindMatch[1]);
  }

  return {
    v1aNodes,
    v1bNodes,
    v1cNodes,
    downstreamNodes,
    resourceSamplingNodes,
    v1bSlots,
    codexAllowedByNode,
    executionKindByNode,
    allowedModesByNode,
    v1cSemanticPolicies,
    downstreamSemanticPolicies,
  };
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
        row.node_id = nodeId;
        row.__cell_count = cells.length;
        row.__header_count = headerCells.length;
        nodeRows.push(row);
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

function parseYesNo(cell, context, issues, check = 'yes_no_cell_unparseable') {
  const normalized = cell.trim().toLowerCase();
  if (normalized.startsWith('yes')) return true;
  if (normalized.startsWith('no')) return false;
  issues.push({ check, detail: `${context}: ${JSON.stringify(cell)}` });
  return null;
}

function leadingToken(cell) {
  const match = cell.trim().match(/^[a-z_]+/);
  return match ? match[0] : '';
}

function extractScenarioIds(cell) {
  const out = [];
  const re = /`([a-z0-9][a-z0-9.-]*)`/g;
  let m;
  while ((m = re.exec(cell)) !== null) out.push(m[1]);
  return out;
}

// --- scenario registry extraction -------------------------------------------

function parseScenarioRegistry(markdown) {
  // Extracts scenario_id -> Set(covered_nodes) from the yaml blocks in 08-scenarios.md.
  const scenarios = new Map();
  const lines = markdown.split('\n');
  let currentId = null;
  let inCoveredNodes = false;
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const idMatch = line.match(/^scenario_id:\s*(\S+)\s*$/);
    if (idMatch) {
      currentId = idMatch[1];
      scenarios.set(currentId, new Set());
      inCoveredNodes = false;
      continue;
    }
    if (currentId === null) continue;
    if (/^covered_nodes:\s*$/.test(line)) {
      inCoveredNodes = true;
      continue;
    }
    if (inCoveredNodes) {
      const nodeMatch = line.match(/^\s+-\s+(topic-selection\.\S+)\s*$/);
      if (nodeMatch) {
        scenarios.get(currentId).add(nodeMatch[1]);
        continue;
      }
      inCoveredNodes = false;
    }
    if (/^```\s*$/.test(line)) currentId = null;
  }
  return scenarios;
}

// --- checks ----------------------------------------------------------------

const V1B_EXECUTION_KIND_TO_EXECUTOR_KIND = {
  deterministic: 'deterministic',
  delegated: 'delegated',
  model_like: 'single_agent',
};

const SEMANTIC_BOOL_COLUMNS = [
  'codex_allowed',
  'provider_required',
  'debate_allowed',
  'human_review_required',
  'human_delegated_allowed',
];

const SEMANTIC_TOKEN_COLUMNS = ['executor_kind', 'default_execution_mode', 'debate_primitive'];

function checkSemanticColumns(rows, policies, stageLabel, issues) {
  for (const row of rows) {
    const policy = policies.get(row.node_id);
    // Absent policy is reported by v1c_policy_missing / downstream_policy_missing (node in code but
    // no policy entry) or by the id-set checks (row not in code at all) — skip here either way.
    if (!policy) continue;
    for (const column of SEMANTIC_TOKEN_COLUMNS) {
      const actual = leadingToken(row[column] ?? '');
      if (actual !== policy[column]) {
        issues.push({
          check: `${stageLabel}_semantic_mismatch`,
          detail: `${row.node_id} ${column}: matrix=${actual || '(empty)'} contracts=${policy[column]}`,
        });
      }
    }
    for (const column of SEMANTIC_BOOL_COLUMNS) {
      const actual = parseYesNo(row[column] ?? '', `${row.node_id} ${column}`, issues, `${stageLabel}_semantic_cell_unparseable`);
      if (actual !== null && actual !== policy[column]) {
        issues.push({
          check: `${stageLabel}_semantic_mismatch`,
          detail: `${row.node_id} ${column}: matrix=${actual ? 'yes' : 'no'} contracts=${policy[column] ? 'yes' : 'no'}`,
        });
      }
    }
  }
}

export function checkConsistency({ matrix, sources, scenarios, scriptNames }) {
  const issues = [];
  const code = extractCodeSets(sources);
  const { nodeRows, slotRows } = parseMatrix(matrix);

  // Structural guard: a row with fewer/more cells than the header silently shifts every later
  // column (real incident: v1c N2 was missing deterministic_validators, displacing covered_scenarios).
  for (const row of nodeRows) {
    if (row.__cell_count !== row.__header_count) {
      issues.push({
        check: 'row_cell_shape_mismatch',
        detail: `${row.node_id}: ${row.__cell_count} cells vs ${row.__header_count} header columns`,
      });
    }
  }

  const stageSets = {
    v1a: code.v1aNodes,
    v1b: code.v1bNodes,
    v1c: code.v1cNodes,
    downstream: code.downstreamNodes,
    resource_sampling: code.resourceSamplingNodes,
  };

  // Stage-vocabulary guard: a row with an unknown/typo'd stage would otherwise be invisible to
  // every id-set check below (filtered out by exact stage match) and pass silently.
  const knownStages = new Set(Object.keys(stageSets));
  for (const row of nodeRows) {
    if (!knownStages.has(row.stage)) {
      issues.push({ check: 'unknown_stage', detail: `${row.node_id}: stage=${row.stage || '(empty)'}` });
    }
  }

  // Extraction-completeness guards: regex extraction that silently drops a policy entry would
  // vacuously disable the per-node semantic checks below (fail-loud, mirroring extractSemanticPolicies).
  for (const id of code.v1bNodes) {
    if (!code.allowedModesByNode.has(id) || !code.executionKindByNode.has(id)) {
      issues.push({ check: 'v1b_policy_extraction_incomplete', detail: id });
    }
  }
  for (const id of code.v1cNodes) {
    if (!code.v1cSemanticPolicies.has(id)) issues.push({ check: 'v1c_policy_missing', detail: id });
  }
  for (const id of code.downstreamNodes) {
    if (!code.downstreamSemanticPolicies.has(id)) issues.push({ check: 'downstream_policy_missing', detail: id });
  }

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

  // v1b semantic checks: codex, executor kind, human_delegated, default mode membership.
  for (const row of nodeRows.filter((r) => r.stage === 'v1b')) {
    if (!code.codexAllowedByNode.has(row.node_id)) continue; // missing node already reported
    const expectedCodex = code.codexAllowedByNode.get(row.node_id);
    const actualCodex = parseYesNo(row.codex_allowed ?? '', row.node_id, issues, 'codex_cell_unparseable');
    if (actualCodex !== null && actualCodex !== expectedCodex) {
      issues.push({
        check: 'v1b_codex_allowed_mismatch',
        detail: `${row.node_id}: matrix=${actualCodex ? 'yes' : 'no'} contracts=${expectedCodex ? 'yes' : 'no'}`,
      });
    }

    const executionKind = code.executionKindByNode.get(row.node_id);
    const expectedExecutor = V1B_EXECUTION_KIND_TO_EXECUTOR_KIND[executionKind];
    if (executionKind !== undefined && expectedExecutor === undefined) {
      issues.push({
        check: 'v1b_execution_kind_unmapped',
        detail: `${row.node_id}: execution_kind=${executionKind} has no executor_kind mapping — extend V1B_EXECUTION_KIND_TO_EXECUTOR_KIND`,
      });
    } else if (expectedExecutor) {
      const actualExecutor = leadingToken(row.executor_kind ?? '');
      if (actualExecutor !== expectedExecutor) {
        issues.push({
          check: 'v1b_executor_kind_mismatch',
          detail: `${row.node_id}: matrix=${actualExecutor || '(empty)'} contracts=${expectedExecutor} (execution_kind=${executionKind})`,
        });
      }
    }

    const modes = code.allowedModesByNode.get(row.node_id) ?? new Set();
    const expectedHumanDelegated = modes.has('human_delegated');
    const actualHumanDelegated = parseYesNo(
      row.human_delegated_allowed ?? '',
      `${row.node_id} human_delegated_allowed`,
      issues,
      'v1b_human_delegated_cell_unparseable',
    );
    if (actualHumanDelegated !== null && actualHumanDelegated !== expectedHumanDelegated) {
      issues.push({
        check: 'v1b_human_delegated_mismatch',
        detail: `${row.node_id}: matrix=${actualHumanDelegated ? 'yes' : 'no'} contracts=${expectedHumanDelegated ? 'yes' : 'no'}`,
      });
    }

    const defaultToken = leadingToken(row.default_execution_mode ?? '');
    if (defaultToken !== 'none' && !modes.has(defaultToken)) {
      issues.push({
        check: 'v1b_default_mode_not_allowed',
        detail: `${row.node_id}: matrix default=${defaultToken || '(empty)'} not in contract modes {${[...modes].join(', ')}}`,
      });
    }
  }

  // v1c + downstream full semantic-column checks against the structured policy exports.
  checkSemanticColumns(
    nodeRows.filter((r) => r.stage === 'v1c'),
    code.v1cSemanticPolicies,
    'v1c',
    issues,
  );
  checkSemanticColumns(
    nodeRows.filter((r) => r.stage === 'downstream'),
    code.downstreamSemanticPolicies,
    'downstream',
    issues,
  );

  // covered_scenarios <-> scenario registry (T-089 slice ③ + T-088 D-28).
  if (scenarios !== undefined) {
    const registry = parseScenarioRegistry(scenarios);
    const matrixScenarioNodes = new Map();
    for (const row of nodeRows) {
      for (const scenarioId of extractScenarioIds(row.covered_scenarios ?? '')) {
        const prev = matrixScenarioNodes.get(scenarioId) ?? new Set();
        prev.add(row.node_id);
        matrixScenarioNodes.set(scenarioId, prev);
      }
    }

    for (const scenarioId of matrixScenarioNodes.keys()) {
      if (!registry.has(scenarioId)) {
        issues.push({ check: 'matrix_scenario_unregistered', detail: scenarioId });
      }
    }
    for (const scenarioId of registry.keys()) {
      if (!matrixScenarioNodes.has(scenarioId)) {
        issues.push({ check: 'registry_scenario_not_in_matrix', detail: scenarioId });
      }
    }

    const allCodeNodes = new Set(
      Object.values(stageSets).flatMap((set) => [...set]),
    );
    for (const [scenarioId, registryNodes] of registry) {
      for (const nodeId of registryNodes) {
        if (!allCodeNodes.has(nodeId)) {
          issues.push({ check: 'registry_covered_node_unknown', detail: `${scenarioId}: ${nodeId}` });
        }
      }
      const matrixNodes = matrixScenarioNodes.get(scenarioId);
      if (!matrixNodes) continue; // registry_scenario_not_in_matrix already reported
      const missingInRegistry = [...matrixNodes].filter((id) => !registryNodes.has(id));
      const extraInRegistry = [...registryNodes].filter((id) => !matrixNodes.has(id));
      if (missingInRegistry.length > 0 || extraInRegistry.length > 0) {
        issues.push({
          check: 'scenario_coverage_mismatch',
          detail:
            `${scenarioId}: matrix-only=[${missingInRegistry.join(', ')}] registry-only=[${extraInRegistry.join(', ')}]`,
        });
      }
    }

    if (scriptNames !== undefined) {
      for (const scriptName of scriptNames) {
        if (!scenarios.includes(scriptName)) {
          issues.push({ check: 'script_unregistered', detail: scriptName });
        }
      }
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
  const expectIssues = (label, inputs, predicate) => {
    const issues = checkConsistency({
      matrix: inputs.matrix ?? real.matrix,
      sources: { ...real.sources, ...(inputs.sources ?? {}) },
      scenarios: inputs.scenarios ?? real.scenarios,
      scriptNames: inputs.scriptNames ?? real.scriptNames,
    });
    if (!predicate(issues)) {
      console.error(`[self-test] FAIL ${label}`);
      console.error(issues);
      return false;
    }
    console.log(`[self-test] ok ${label}`);
    return true;
  };

  const results = [];

  results.push(expectIssues('clean matrix has zero issues', {}, (issues) => issues.length === 0));

  const renamed = real.matrix.replaceAll(
    'topic-selection.v1b.assess-topic-value.v1',
    'topic-selection.v1b.assess-topic-value-renamed.v1',
  );
  results.push(
    expectIssues(
      'renamed v1b node detected (missing + extra)',
      { matrix: renamed },
      (issues) =>
        issues.some((i) => i.check === 'v1b_missing_in_matrix' && i.detail.includes('assess-topic-value.v1')) &&
        issues.some((i) => i.check === 'v1b_extra_in_matrix' && i.detail.includes('assess-topic-value-renamed.v1')),
    ),
  );

  const deleted = real.matrix
    .split('\n')
    .filter((line) => !line.trim().startsWith('| `topic-selection.v1b.create-draft-topic-package.v1`'))
    .join('\n');
  results.push(
    expectIssues('deleted v1b row detected', { matrix: deleted }, (issues) =>
      issues.some((i) => i.check === 'v1b_missing_in_matrix' && i.detail.includes('create-draft-topic-package')),
    ),
  );

  const v1bHeaderRowIndex = real.matrix.indexOf('| `topic-selection.v1b.create-intake-snapshot.v1`');
  const extraRowLineEnd = real.matrix.indexOf('\n', v1bHeaderRowIndex);
  const extraRowLine = real.matrix
    .slice(v1bHeaderRowIndex, extraRowLineEnd)
    .replace('topic-selection.v1b.create-intake-snapshot.v1', 'topic-selection.v1b.fabricated-node.v1');
  const extra = `${real.matrix.slice(0, extraRowLineEnd)}\n${extraRowLine}${real.matrix.slice(extraRowLineEnd)}`;
  results.push(
    expectIssues('fabricated v1b row detected', { matrix: extra }, (issues) =>
      issues.some((i) => i.check === 'v1b_extra_in_matrix' && i.detail.includes('fabricated-node')),
    ),
  );

  const slotDeleted = real.matrix
    .split('\n')
    .filter((line) => !line.includes('`n6_loopback_triage`'))
    .join('\n');
  results.push(
    expectIssues('deleted v1b slot row detected', { matrix: slotDeleted }, (issues) =>
      issues.some((i) => i.check === 'v1b_slot_missing_in_matrix' && i.detail === 'n6_loopback_triage'),
    ),
  );

  const codexFlipped = mutateRowCell(
    real.matrix,
    'topic-selection.v1b.generate-research-slice-options.v1',
    'codex_allowed',
    'no',
  );
  results.push(
    expectIssues('flipped codex_allowed detected', { matrix: codexFlipped }, (issues) =>
      issues.some(
        (i) => i.check === 'v1b_codex_allowed_mismatch' && i.detail.includes('generate-research-slice-options'),
      ),
    ),
  );

  const v1cRenamed = real.matrix.replaceAll(
    'topic-selection.v1c.run-promotion-gate.v1',
    'topic-selection.v1c.run-promotion-gate-renamed.v1',
  );
  results.push(
    expectIssues('renamed v1c node detected', { matrix: v1cRenamed }, (issues) =>
      issues.some((i) => i.check === 'v1c_missing_in_matrix' && i.detail.includes('run-promotion-gate.v1')),
    ),
  );

  // --- T-089 slice ①③ drift negatives ---

  const cellDropped = real.matrix.replace('| intake trace | intake trace |', '| intake trace |');
  results.push(
    expectIssues('short row (dropped cell) detected', { matrix: cellDropped }, (issues) =>
      issues.some((i) => i.check === 'row_cell_shape_mismatch' && i.detail.includes('paper-project-intake')),
    ),
  );

  const v1cDebateFlipped = mutateRowCell(
    real.matrix,
    'topic-selection.v1c.generate-promotion-support.v1',
    'debate_allowed',
    'no',
  );
  results.push(
    expectIssues('flipped v1c debate_allowed detected', { matrix: v1cDebateFlipped }, (issues) =>
      issues.some(
        (i) => i.check === 'v1c_semantic_mismatch' && i.detail.includes('generate-promotion-support.v1 debate_allowed'),
      ),
    ),
  );

  const v1cExecutorDrifted = mutateRowCell(
    real.matrix,
    'topic-selection.v1c.record-human-promotion-decision.v1',
    'executor_kind',
    'deterministic',
  );
  results.push(
    expectIssues('drifted v1c executor_kind detected', { matrix: v1cExecutorDrifted }, (issues) =>
      issues.some(
        (i) => i.check === 'v1c_semantic_mismatch' && i.detail.includes('record-human-promotion-decision.v1 executor_kind'),
      ),
    ),
  );

  const v1bHumanFlipped = mutateRowCell(
    real.matrix,
    'topic-selection.v1b.materialize-topic-question-contract.v1',
    'human_delegated_allowed',
    'no',
  );
  results.push(
    expectIssues('flipped v1b human_delegated_allowed detected', { matrix: v1bHumanFlipped }, (issues) =>
      issues.some(
        (i) => i.check === 'v1b_human_delegated_mismatch' && i.detail.includes('materialize-topic-question-contract'),
      ),
    ),
  );

  const v1bExecutorDrifted = mutateRowCell(
    real.matrix,
    'topic-selection.v1b.generate-topic-question-candidates.v1',
    'executor_kind',
    'deterministic',
  );
  results.push(
    expectIssues('drifted v1b executor_kind detected', { matrix: v1bExecutorDrifted }, (issues) =>
      issues.some(
        (i) => i.check === 'v1b_executor_kind_mismatch' && i.detail.includes('generate-topic-question-candidates'),
      ),
    ),
  );

  const v1bDefaultDrifted = mutateRowCell(
    real.matrix,
    'topic-selection.v1b.create-intake-snapshot.v1',
    'default_execution_mode',
    'provider_llm',
  );
  results.push(
    expectIssues('non-allowed v1b default mode detected', { matrix: v1bDefaultDrifted }, (issues) =>
      issues.some((i) => i.check === 'v1b_default_mode_not_allowed' && i.detail.includes('create-intake-snapshot')),
    ),
  );

  const stageTypod = mutateRowCell(real.matrix, 'topic-selection.v1c.create-promotion-input-snapshot.v1', 'stage', 'v1d');
  results.push(
    expectIssues('unknown stage value detected', { matrix: stageTypod }, (issues) =>
      issues.some((i) => i.check === 'unknown_stage' && i.detail.includes('create-promotion-input-snapshot')),
    ),
  );

  const v1bModesRefactored = real.sources.v1b.replace(
    "allowed_execution_modes: ['none'],",
    'allowed_execution_modes: SOME_NAMED_CONSTANT,',
  );
  results.push(
    expectIssues(
      'v1b policy extraction incompleteness detected (constant-style modes refactor)',
      { sources: { v1b: v1bModesRefactored } },
      (issues) => issues.some((i) => i.check === 'v1b_policy_extraction_incomplete'),
    ),
  );

  const v1bKindUnknown = real.sources.v1b.replace("execution_kind: 'deterministic',", "execution_kind: 'quantum',");
  results.push(
    expectIssues(
      'unmapped v1b execution_kind detected',
      { sources: { v1b: v1bKindUnknown } },
      (issues) => issues.some((i) => i.check === 'v1b_execution_kind_unmapped' && i.detail.includes('quantum')),
    ),
  );

  const v1cPolicyDropped = real.sources.v1cPolicies.replace(
    'TOPIC_SELECTION_V1C_NODE_ID.n3_run_promotion_gate,',
    'TOPIC_SELECTION_V1C_NODE_ID.n1_create_promotion_input_snapshot,',
  );
  results.push(
    expectIssues(
      'missing v1c policy entry detected',
      { sources: { v1cPolicies: v1cPolicyDropped } },
      (issues) => issues.some((i) => i.check === 'v1c_policy_missing' && i.detail.includes('run-promotion-gate')),
    ),
  );

  const matrixScenarioRenamed = real.matrix.replaceAll(
    'topic-selection.v1b.non-advance-negative.v1',
    'topic-selection.v1b.non-advance-negative-renamed.v1',
  );
  results.push(
    expectIssues('unregistered matrix scenario detected', { matrix: matrixScenarioRenamed }, (issues) =>
      issues.some(
        (i) => i.check === 'matrix_scenario_unregistered' && i.detail.includes('non-advance-negative-renamed'),
      ) &&
      issues.some(
        (i) => i.check === 'registry_scenario_not_in_matrix' && i.detail.includes('non-advance-negative.v1'),
      ),
    ),
  );

  const registryNodeDropped = real.scenarios.replace(
    /^(\s+-\s+topic-selection\.v1a\.create-topic-seed\.v1)$/m,
    '  # dropped for self-test',
  );
  results.push(
    expectIssues('registry covered_nodes drift detected', { scenarios: registryNodeDropped }, (issues) =>
      issues.some((i) => i.check === 'scenario_coverage_mismatch' && i.detail.includes('create-topic-seed')),
    ),
  );

  const registryNodeFabricated = real.scenarios.replace(
    /^(\s+)-\s+topic-selection\.v1a\.create-topic-seed\.v1$/m,
    '$1- topic-selection.v1a.create-topic-seed.v1\n$1- topic-selection.v1a.fabricated-registry-node.v1',
  );
  results.push(
    expectIssues('unknown registry covered node detected', { scenarios: registryNodeFabricated }, (issues) =>
      issues.some(
        (i) => i.check === 'registry_covered_node_unknown' && i.detail.includes('fabricated-registry-node'),
      ),
    ),
  );

  results.push(
    expectIssues(
      'unregistered script detected',
      { scriptNames: [...real.scriptNames, 'topic-selection-fabricated-runner.mjs'] },
      (issues) => issues.some((i) => i.check === 'script_unregistered' && i.detail.includes('fabricated-runner')),
    ),
  );

  return results.every(Boolean);
}

// --- CLI ---------------------------------------------------------------------

function loadReal() {
  return {
    matrix: read(FILES.matrix),
    scenarios: read(FILES.scenarios),
    scriptNames: readdirSync(path.join(REPO_ROOT, SCRIPTS_DIR))
      .filter((name) => name.startsWith(SCRIPT_PREFIX) && name.endsWith('.mjs'))
      .sort(),
    sources: {
      v1a: read(FILES.v1a),
      v1b: read(FILES.v1b),
      v1c: read(FILES.v1c),
      v1cPolicies: read(FILES.v1cPolicies),
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
  const issues = checkConsistency({
    matrix: real.matrix,
    sources: real.sources,
    scenarios: real.scenarios,
    scriptNames: real.scriptNames,
  });
  if (issues.length > 0) {
    console.error(`[matrix-consistency] ${issues.length} issue(s):`);
    for (const issue of issues) console.error(`  - ${issue.check}: ${issue.detail}`);
    process.exit(1);
  }
  console.log('[matrix-consistency] ok — matrix matches code authority sources and scenario registry.');
  process.exit(0);
}
