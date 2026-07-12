#!/usr/bin/env node
// SlotParameterManifest@v1 committed-snapshot exporter (T-124 S2-D, D5).
//
// Derives the paper-implementation slot parameter manifest from the backend
// model-profile registry at runtime and writes the deterministic JSON snapshot
// to docs/context/paper-implementation/slot-parameter-manifest.json.
//
// Usage (from repo root):
//   node .ai/scripts/paper-implementation-slot-parameter-manifest-export.mjs
//   node .ai/scripts/paper-implementation-slot-parameter-manifest-export.mjs --check
//
// --check: do not write; exit 1 if the committed snapshot differs from the
// runtime export (same comparison the backend unit test enforces).
//
// The script re-executes itself under the backend ts-node ESM loader so it can
// import the TypeScript manifest module directly.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), '../..');
const TS_CHILD_ENV_FLAG = 'PAPER_IMPLEMENTATION_SLOT_MANIFEST_EXPORT_TS_CHILD';

if (!process.env[TS_CHILD_ENV_FLAG]) {
  // cwd apps/backend so ts-node resolves the backend tsconfig ("types": ["node"]),
  // matching how the runtime-stress script spawns its ts-node children.
  const result = spawnSync(
    process.execPath,
    ['--no-warnings', '--loader', 'ts-node/esm', SCRIPT_PATH, ...process.argv.slice(2)],
    {
      cwd: path.join(REPO_ROOT, 'apps/backend'),
      stdio: 'inherit',
      env: { ...process.env, [TS_CHILD_ENV_FLAG]: '1' },
    },
  );
  process.exit(result.status ?? 1);
}

const {
  exportPaperImplementationSlotParameterManifest,
  PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH,
} = await import(
  new URL(
    '../../apps/backend/src/services/paper-implementation-slot-parameter-manifest.ts',
    import.meta.url,
  ).href
);

const checkOnly = process.argv.slice(2).includes('--check');
const snapshotPath = path.join(
  REPO_ROOT,
  PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH,
);

const manifest = exportPaperImplementationSlotParameterManifest();
const nextContent = `${JSON.stringify(manifest, null, 2)}\n`;

const currentContent = await fs.readFile(snapshotPath, 'utf8').catch(() => null);

if (checkOnly) {
  if (currentContent === nextContent) {
    console.log(
      `[slot-parameter-manifest-export] OK: snapshot is fresh (${manifest.slot_count} slots).`,
    );
    process.exit(0);
  }
  console.error(
    `[slot-parameter-manifest-export] STALE: ${PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH} does not match the runtime export. Regenerate with:\n  node .ai/scripts/paper-implementation-slot-parameter-manifest-export.mjs`,
  );
  process.exit(1);
}

if (currentContent === nextContent) {
  console.log(
    `[slot-parameter-manifest-export] Unchanged: ${PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH} (${manifest.slot_count} slots).`,
  );
  process.exit(0);
}

await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
await fs.writeFile(snapshotPath, nextContent, 'utf8');
console.log(
  `[slot-parameter-manifest-export] Wrote ${PAPER_IMPLEMENTATION_SLOT_PARAMETER_MANIFEST_SNAPSHOT_PATH} (${manifest.slot_count} slots).`,
);
console.log(
  '[slot-parameter-manifest-export] Reminder: run `node .ai/skills/features/context-awareness/scripts/ctl-context.mjs touch` to refresh docs/context registry checksums.',
);
