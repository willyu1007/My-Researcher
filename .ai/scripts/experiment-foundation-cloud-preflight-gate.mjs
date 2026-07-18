#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BACKEND_ROOT = path.join(REPO_ROOT, 'apps/backend');
const RUNNER = 'scripts/run-experiment-foundation-cloud-preflight.ts';

export function buildCloudPreflightChildArgs(argv) {
  return [
    '--env-file-if-exists=../../.env.local',
    '--loader',
    'ts-node/esm',
    RUNNER,
    ...argv,
  ];
}

export async function runCloudPreflightGate(argv, options = {}) {
  const child = spawn(process.execPath, buildCloudPreflightChildArgs(argv), {
    cwd: options.cwd ?? BACKEND_ROOT,
    env: options.env ?? process.env,
    stdio: options.stdio ?? 'inherit',
    shell: false,
  });
  return await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Cloud preflight gate terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await runCloudPreflightGate(process.argv.slice(2));
}
