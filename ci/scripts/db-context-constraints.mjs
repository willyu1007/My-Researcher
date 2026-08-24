#!/usr/bin/env node

// Keep the compact DB context's field-level constraints aligned with the generated Prisma DMMF.
// Other snapshot properties remain untouched so this sync cannot introduce unrelated schema drift.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const snapshotPath = path.join(repoRoot, 'docs/context/db/schema.json');
const command = process.argv[2];

if (command !== 'check' && command !== 'sync') {
  console.error('Usage: node ci/scripts/db-context-constraints.mjs <check|sync>');
  process.exit(2);
}

const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const tables = new Map(snapshot.tables.map((table) => [table.name, table]));
const structuralMismatches = [];
const constraintMismatches = [];

for (const model of Prisma.dmmf.datamodel.models) {
  const table = tables.get(model.name);
  if (!table) {
    structuralMismatches.push(`${model.name}: missing table`);
    continue;
  }

  const columns = new Map(table.columns.map((column) => [column.name, column]));
  for (const field of model.fields) {
    if (field.kind === 'object') {
      continue;
    }

    const column = columns.get(field.name);
    if (!column) {
      structuralMismatches.push(`${model.name}.${field.name}: missing column`);
      continue;
    }

    compareFlag(model.name, field.name, column, 'primaryKey', field.isId);
    compareFlag(model.name, field.name, column, 'unique', field.isUnique);
  }
}

if (command === 'check') {
  const mismatches = [...structuralMismatches, ...constraintMismatches];
  if (mismatches.length > 0) {
    console.error('docs/context/db/schema.json constraint drift:');
    for (const mismatch of mismatches) {
      console.error(`- ${mismatch}`);
    }
    process.exit(1);
  }

  console.log('[ok] DB context primary/unique flags match Prisma DMMF.');
  process.exit(0);
}

if (structuralMismatches.length > 0) {
  console.error('Cannot sync DB context constraints because the snapshot structure is stale:');
  for (const mismatch of structuralMismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exit(1);
}

if (constraintMismatches.length === 0) {
  console.log('[ok] DB context primary/unique flags already match Prisma DMMF.');
  process.exit(0);
}

snapshot.updatedAt = new Date().toISOString();
fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
console.log(`[ok] Corrected ${constraintMismatches.length} DB context constraint flags.`);

function compareFlag(modelName, fieldName, column, property, expected) {
  const actual = column[property];
  if (actual === expected) {
    return;
  }

  constraintMismatches.push(`${modelName}.${fieldName}.${property}: expected ${expected}, found ${actual}`);
  if (command === 'sync') {
    column[property] = expected;
  }
}
