#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  T137_RESOURCE_SAMPLE_SET_ID,
  T137_SEMANTIC_PROFILE_ID,
} from '../../apps/backend/scripts/t137-scientific-dossier-canary-profile.ts';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../..');
const RUN_ID = process.env.T137_CANARY_RUN_ID?.trim() || 't137-pre-pai-20260817-v2';
const ARTIFACT_DIR = path.join(REPO_ROOT, '.ai/.tmp/t137-scientific-dossier-canary', RUN_ID);
const TOPIC_RUN_ID = `${RUN_ID}-topic`;
const TOPIC_SUMMARY_PATH = path.join(
  REPO_ROOT,
  '.ai/.tmp/topic-selection-real-e2e',
  TOPIC_RUN_ID,
  '90-summary.json',
);
const PREFLIGHT_SUMMARY_PATH = path.join(ARTIFACT_DIR, '02-pre-pai.json');
const FINAL_SUMMARY_PATH = path.join(ARTIFACT_DIR, '90-summary.json');

await fs.mkdir(ARTIFACT_DIR, { recursive: true });

const topic = await ensureTopicStage();
const intake = topic.paper_project_intake;
assert.ok(intake?.paperProjectBridgeId, 'T-137 Topic stage did not return a PaperProject bridge.');
assert.ok(intake?.paperProjectBridgeHash, 'T-137 Topic stage did not return the bridge hash.');
assert.ok(intake?.paperProjectId, 'T-137 Topic stage did not return a PaperProject.');

const preflight = await ensurePreflightStage({
  bridgeId: intake.paperProjectBridgeId,
  bridgeHash: intake.paperProjectBridgeHash,
  paperProjectId: intake.paperProjectId,
});

const summary = {
  schema_version: 't137-scientific-dossier-canary@v1',
  status: 'passed',
  run_id: RUN_ID,
  semantic_profile_id: T137_SEMANTIC_PROFILE_ID,
  stopped_at: 'pre_pai',
  resume_policy: 'read persisted owner summaries and run only the first incomplete fixed stage',
  stages: {
    topic_to_paper_project: {
      status: topic.status,
      summary_path: path.relative(REPO_ROOT, TOPIC_SUMMARY_PATH),
      title_card_id: topic.v1a.titleCardId,
      topic_package_id: topic.v1b.topicPackageId,
      paper_project_bridge_id: intake.paperProjectBridgeId,
      paper_project_id: intake.paperProjectId,
    },
    pi_to_ef_preflight: {
      status: preflight.status,
      summary_path: path.relative(REPO_ROOT, PREFLIGHT_SUMMARY_PATH),
      implementation_project_id: preflight.paper_implementation.implementation_project_id,
      validation_cycle_id: preflight.paper_implementation.validation_cycle_id,
      work_order_revision_id: preflight.paper_implementation.work_order_revision_id,
      ef_run_id: preflight.experiment_foundation.run_id,
    },
  },
  next_effect: 'PAI provider payload materialization and CreateJob remain outside this run.',
};
await fs.writeFile(FINAL_SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

async function ensureTopicStage() {
  const existing = await readJson(TOPIC_SUMMARY_PATH);
  if (existing?.status === 'passed' && existing.semantic_profile_id === T137_SEMANTIC_PROFILE_ID) {
    return existing;
  }
  const result = await runNode({
    label: 'topic-to-paper-project',
    script: '.ai/scripts/topic-selection-real-e2e.mjs',
    args: [],
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: '1',
      TITLE_CARD_REPOSITORY: 'prisma',
      RESEARCH_LIFECYCLE_REPOSITORY: 'prisma',
      AUTO_PULL_REPOSITORY: 'prisma',
      APPLICATION_SETTINGS_REPOSITORY: 'prisma',
      EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
      PAPER_IMPLEMENTATION_REPOSITORY: 'prisma',
      AUTO_PULL_SCHEDULER_ENABLED: 'false',
      TOPIC_SELECTION_REAL_RUN_ID: TOPIC_RUN_ID,
      TOPIC_SELECTION_REAL_RESOURCE_SAMPLE_SET_ID: T137_RESOURCE_SAMPLE_SET_ID,
      TOPIC_SELECTION_REAL_SEMANTIC_PROFILE: T137_SEMANTIC_PROFILE_ID,
      TOPIC_SELECTION_REAL_V1A_GENERATE_EXECUTION_MODE: 'codex_assisted',
    },
  });
  const summary = await readJson(TOPIC_SUMMARY_PATH);
  if (result.exitCode !== 0 || summary?.status !== 'passed') {
    throw new Error(`T-137 Topic stage failed; exit=${result.exitCode}; summary=${summary?.status ?? 'missing'}`);
  }
  return summary;
}

async function ensurePreflightStage(input) {
  const existing = await readJson(PREFLIGHT_SUMMARY_PATH);
  if (
    existing?.status === 'passed'
    && existing.source?.paper_project_bridge_id === input.bridgeId
    && existing.source?.bridge_payload_hash === input.bridgeHash
  ) {
    return existing;
  }
  const result = await runNode({
    label: 'pi-to-ef-preflight',
    script: 'apps/backend/scripts/run-t137-scientific-dossier-preflight.ts',
    args: [
      '--run-id', RUN_ID,
      '--bridge-id', input.bridgeId,
      '--bridge-hash', input.bridgeHash,
      '--paper-project-id', input.paperProjectId,
      '--output', PREFLIGHT_SUMMARY_PATH,
    ],
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: '1',
      TITLE_CARD_REPOSITORY: 'prisma',
      RESEARCH_LIFECYCLE_REPOSITORY: 'prisma',
      AUTO_PULL_REPOSITORY: 'prisma',
      APPLICATION_SETTINGS_REPOSITORY: 'prisma',
      EXPERIMENT_FOUNDATION_REPOSITORY: 'prisma',
      PAPER_IMPLEMENTATION_REPOSITORY: 'prisma',
      AUTO_PULL_SCHEDULER_ENABLED: 'false',
    },
  });
  const summary = await readJson(PREFLIGHT_SUMMARY_PATH);
  if (result.exitCode !== 0 || summary?.status !== 'passed') {
    throw new Error(`T-137 PI/EF preflight failed; exit=${result.exitCode}; summary=${summary?.status ?? 'missing'}`);
  }
  return summary;
}

async function runNode(input) {
  const stdoutPath = path.join(ARTIFACT_DIR, `${input.label}.stdout.log`);
  const stderrPath = path.join(ARTIFACT_DIR, `${input.label}.stderr.log`);
  const stdout = [];
  const stderr = [];
  const child = spawn(process.execPath, [
    '--loader',
    './apps/backend/node_modules/ts-node/esm.mjs',
    input.script,
    ...input.args,
  ], {
    cwd: REPO_ROOT,
    env: input.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
  child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
  const exitCode = await new Promise((resolve) => child.on('close', resolve));
  await fs.writeFile(stdoutPath, Buffer.concat(stdout), 'utf8');
  await fs.writeFile(stderrPath, Buffer.concat(stderr), 'utf8');
  return { exitCode };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}
