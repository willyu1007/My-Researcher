import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const forbiddenModule = '@paper-engineering-assistant/shared';
const forbiddenStatementPatterns = [
  new RegExp(
    String.raw`^\s*import(?:\s+type)?(?:[\s\w{},*]*from\s*)?\s*['"]${forbiddenModule.replace('/', '\\/')}['"]`,
    'm',
  ),
  new RegExp(
    String.raw`^\s*export[\s\w{},*]+from\s+['"]${forbiddenModule.replace('/', '\\/')}['"]`,
    'm',
  ),
];

function listTypeScriptFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listTypeScriptFiles(fullPath);
    }
    if (!entry.isFile() || !entry.name.endsWith('.ts')) {
      return [];
    }
    return [fullPath];
  });
}

test('backend source does not import research-lifecycle contracts from the shared root entry', () => {
  const violations = listTypeScriptFiles(srcDir)
    .filter((filePath) => filePath !== fileURLToPath(import.meta.url))
    .filter((filePath) => {
      const contents = fs.readFileSync(filePath, 'utf8');
      return forbiddenStatementPatterns.some((pattern) => pattern.test(contents));
    })
    .map((filePath) => path.relative(srcDir, filePath));

  assert.deepEqual(
    violations,
    [],
    `Root shared import is forbidden in apps/backend/src. Offenders:\n${violations.join('\n')}`,
  );
});
