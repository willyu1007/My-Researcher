// T-127 W-11 — operator script for the one-time n4_handoff_hash backfill (in-process, no HTTP route).
//
// Run (dry-run by default — classifies + counts, writes NOTHING):
//   node --env-file=../../.env.local --loader ts-node/esm scripts/backfill-v1b-n4-handoff-hash.ts
// Apply the backfill:
//   node --env-file=../../.env.local --loader ts-node/esm scripts/backfill-v1b-n4-handoff-hash.ts --apply
// Scope:
//   --title-card-id <id>            (repeatable; restricts the global sweep)
//   --option-set-ids <a,b,c>        (exact ids; present ones are skipped)
//
// Idempotent: re-running is safe — already-backfilled records are skipped.

import { getPrismaClient } from '../src/repositories/prisma/prisma-client.js';
import { PrismaTopicSelectionControlPlaneRepository } from '../src/repositories/prisma/prisma-topic-selection-control-plane-repository.js';
import { PrismaTopicSelectionV1bResearchSliceRepository } from '../src/repositories/prisma/prisma-topic-selection-v1b-research-slice-repository.js';
import { TopicSelectionControlPlaneService } from '../src/services/topic-selection-control-plane-service.js';
import { TopicSelectionV1bN4HandoffHashBackfillService } from '../src/services/topic-selection-v1b-n4-handoff-hash-backfill-service.js';

interface ParsedArgs {
  apply: boolean;
  titleCardIds: string[];
  optionSetIds: string[];
}

function splitList(value: string | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { apply: false, titleCardIds: [], optionSetIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      args.apply = true;
      continue;
    }
    if (token === '--title-card-id') {
      const value = String(argv[index + 1] ?? '').trim();
      if (value) {
        args.titleCardIds.push(value);
      }
      index += 1;
      continue;
    }
    if (token === '--option-set-ids') {
      args.optionSetIds.push(...splitList(argv[index + 1]));
      index += 1;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prisma = getPrismaClient();
  try {
    const researchSlice = new PrismaTopicSelectionV1bResearchSliceRepository(prisma);
    const controlPlane = new TopicSelectionControlPlaneService(
      new PrismaTopicSelectionControlPlaneRepository(prisma),
    );
    const service = new TopicSelectionV1bN4HandoffHashBackfillService(researchSlice, controlPlane);

    const report = await service.run({
      dryRun: !args.apply,
      ...(args.optionSetIds.length > 0 ? { optionSetIds: args.optionSetIds } : {}),
      ...(args.titleCardIds.length > 0 ? { titleCardIds: args.titleCardIds } : {}),
    });

    console.log(JSON.stringify(report, null, 2));
    if (!args.apply) {
      console.error('DRY RUN — no writes. Re-run with --apply to persist.');
    }
    if (report.unrecoverable > 0) {
      // Surfaced, never swallowed: these records have no retrievable N4->N5 handoff artifact and were NOT
      // touched. Investigate separately (do not re-run N4 to "fix" them blindly).
      console.error(`WARNING: ${report.unrecoverable} option-set(s) UNRECOVERABLE (no retrievable N4 handoff artifact).`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
