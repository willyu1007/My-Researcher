import { fileURLToPath } from 'node:url';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { spawn } from 'node:child_process';

const rootDirUrl = new URL('../', import.meta.url);
const srcDirUrl = new URL('../src/', import.meta.url);
const rootDir = fileURLToPath(rootDirUrl);
const srcDir = fileURLToPath(srcDirUrl);

const testFiles = await collectTestFiles(srcDir);
if (testFiles.length === 0) {
  console.error('No backend test files were found under src/.');
  process.exit(1);
}

const args = ['--test', '--loader', 'ts-node/esm', ...testFiles];
const child = spawn(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

async function collectTestFiles(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return collectTestFiles(entryPath);
      }
      if (!entry.name.endsWith('.test.ts')) {
        return [];
      }
      return [relative(rootDir, entryPath).replaceAll('\\', '/')];
    }),
  );

  return nested.flat().sort((left, right) => left.localeCompare(right));
}
