import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import type {
  PaperImplementationCoordinatorLease,
  PaperImplementationCoordinatorRun,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-coordinator-contracts';

import { AppError } from '../../errors/app-error.js';
import { PrismaPaperImplementationCoordinatorRepository } from './prisma-paper-implementation-coordinator-repository.js';

const NOW = '2026-07-11T10:00:00.000Z';
const LATER = '2026-07-11T10:30:00.000Z';
const PROJECT_ID = 'implementation_project_coordinator_prisma_001';
const RUN_ID = 'coordinator_run_prisma_001';

type StoredRow = Record<string, unknown> & { id: string };

/**
 * Minimal fake Prisma model supporting the where-shapes the coordinator
 * repository actually uses: equality, `notIn`, `lte` on dates, `null`
 * equality, and top-level `OR`.
 */
function matchesCondition(rowValue: unknown, condition: unknown): boolean {
  if (condition !== null && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof Date)) {
    const operators = condition as { notIn?: unknown[]; lte?: unknown };
    if (operators.notIn !== undefined) {
      return !operators.notIn.some((entry) => entry === rowValue);
    }
    if (operators.lte !== undefined) {
      if (!(rowValue instanceof Date) || !(operators.lte instanceof Date)) {
        return false;
      }
      return rowValue.getTime() <= operators.lte.getTime();
    }
    return false;
  }
  if (condition instanceof Date) {
    return rowValue instanceof Date && rowValue.getTime() === condition.getTime();
  }
  return rowValue === condition;
}

function matchesWhere(row: StoredRow, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') {
      return (condition as Array<Record<string, unknown>>).some((branch) => matchesWhere(row, branch));
    }
    return matchesCondition(row[key], condition);
  });
}

function makeModel(rows: StoredRow[]) {
  return {
    create: async ({ data }: { data: StoredRow }) => {
      if (rows.some((row) => row.id === data.id)) {
        const error = new Error('Unique constraint failed') as Error & { code: string };
        error.code = 'P2002';
        throw error;
      }
      rows.push(structuredClone(data));
      return structuredClone(rows.at(-1));
    },
    findFirst: async ({ where }: { where: Record<string, unknown> }) => {
      const row = rows.find((entry) => matchesWhere(entry, where));
      return row ? structuredClone(row) : null;
    },
    findMany: async ({ where }: { where?: Record<string, unknown> }) =>
      rows.filter((entry) => matchesWhere(entry, where ?? {})).map((entry) => structuredClone(entry)),
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      let count = 0;
      for (let index = 0; index < rows.length; index += 1) {
        if (matchesWhere(rows[index]!, where)) {
          rows[index] = { ...rows[index]!, ...structuredClone(data) };
          count += 1;
        }
      }
      return { count };
    },
  };
}

function makeFakePrismaClient(): { client: PrismaClient; runRows: StoredRow[] } {
  const runRows: StoredRow[] = [];
  const client = {
    paperImplementationCoordinatorRun: makeModel(runRows),
    paperImplementationCoordinatorStep: makeModel([]),
  } as unknown as PrismaClient;
  return { client, runRows };
}

function makeRun(overrides: Partial<PaperImplementationCoordinatorRun> = {}): PaperImplementationCoordinatorRun {
  return {
    schema_version: 'PaperImplementationCoordinatorRun@v1',
    coordinator_run_id: RUN_ID,
    implementation_project_id: PROJECT_ID,
    lane_id: 'evidence-board-curation',
    run_status: 'created',
    run_mode: 'mock',
    execution_mode: 'mocked_llm',
    model_profile_id: null,
    model_option_id: null,
    budget_envelope: { max_steps: 4, max_provider_calls: 8 },
    consumed: { steps: 0, provider_calls: 0 },
    lease: null,
    slot_request_payloads: { 'evidence_board_curation.binding_gap_candidates': {} },
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeLease(holderId: string): PaperImplementationCoordinatorLease {
  return {
    holder_id: holderId,
    heartbeat_at: NOW,
    expires_at: '2026-07-11T10:10:00.000Z',
  };
}

test('coordinator prisma lease CAS refuses terminal runs and enforces holder fencing', async () => {
  const { client } = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationCoordinatorRepository(client);
  await repository.createCoordinatorRun(makeRun());

  // Live foreign lease: CAS loses.
  const first = await repository.acquireCoordinatorRunLease(PROJECT_ID, RUN_ID, makeLease('holder_one'), NOW);
  assert.equal(first?.lease?.holder_id, 'holder_one');
  assert.equal(first?.run_status, 'advancing');
  assert.equal(
    await repository.acquireCoordinatorRunLease(PROJECT_ID, RUN_ID, makeLease('holder_two'), NOW),
    null,
  );

  // Same holder re-acquires; an expired lease is acquirable by anyone.
  const sameHolder = await repository.acquireCoordinatorRunLease(PROJECT_ID, RUN_ID, makeLease('holder_one'), NOW);
  assert.equal(sameHolder?.lease?.holder_id, 'holder_one');
  const afterExpiry = await repository.acquireCoordinatorRunLease(
    PROJECT_ID,
    RUN_ID,
    { holder_id: 'holder_two', heartbeat_at: LATER, expires_at: '2026-07-11T11:00:00.000Z' },
    LATER,
  );
  assert.equal(afterExpiry?.lease?.holder_id, 'holder_two');

  // F8: terminal runs are unacquirable at the CAS layer even with a free or
  // expired lease; budget_exhausted stays acquirable.
  for (const terminalStatus of ['failed', 'completed'] as const) {
    await repository.updateCoordinatorRun(makeRun({ run_status: terminalStatus, lease: null, updated_at: LATER }));
    assert.equal(
      await repository.acquireCoordinatorRunLease(
        PROJECT_ID,
        RUN_ID,
        { holder_id: 'holder_three', heartbeat_at: LATER, expires_at: '2026-07-11T11:00:00.000Z' },
        LATER,
      ),
      null,
      `CAS must refuse a ${terminalStatus} run`,
    );
  }
  await repository.updateCoordinatorRun(makeRun({ run_status: 'budget_exhausted', lease: null, updated_at: LATER }));
  const exhaustedAcquire = await repository.acquireCoordinatorRunLease(
    PROJECT_ID,
    RUN_ID,
    { holder_id: 'holder_raise', heartbeat_at: LATER, expires_at: '2026-07-11T11:00:00.000Z' },
    LATER,
  );
  assert.equal(exhaustedAcquire?.lease?.holder_id, 'holder_raise');
});

test('coordinator prisma holder-fenced update fails after takeover without overwriting the new holder', async () => {
  const { client, runRows } = makeFakePrismaClient();
  const repository = new PrismaPaperImplementationCoordinatorRepository(client);
  await repository.createCoordinatorRun(makeRun());
  const victimRun = await repository.acquireCoordinatorRunLease(PROJECT_ID, RUN_ID, makeLease('holder_victim'), NOW);
  assert.ok(victimRun);

  // Lease expires; a new holder takes over.
  const thiefRun = await repository.acquireCoordinatorRunLease(
    PROJECT_ID,
    RUN_ID,
    { holder_id: 'holder_thief', heartbeat_at: LATER, expires_at: '2026-07-11T11:00:00.000Z' },
    LATER,
  );
  assert.equal(thiefRun?.lease?.holder_id, 'holder_thief');

  // F3: the stale holder's fenced write matches zero rows and throws; the
  // new holder's row state is untouched.
  await assert.rejects(
    () => repository.updateCoordinatorRun(
      {
        ...victimRun,
        consumed: { steps: 3, provider_calls: 3 },
        updated_at: LATER,
      },
      { expectedLeaseHolderId: 'holder_victim' },
    ),
    (error: unknown) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT'
      && /lease is no longer held/.test(error.message),
  );
  const row = runRows.find((entry) => entry.id === RUN_ID);
  assert.equal(row?.leaseHolderId, 'holder_thief');
  assert.equal(row?.consumedSteps, 0);

  // The live holder's fenced write succeeds.
  const updated = await repository.updateCoordinatorRun(
    {
      ...thiefRun,
      consumed: { steps: 1, provider_calls: 1 },
      updated_at: LATER,
    },
    { expectedLeaseHolderId: 'holder_thief' },
  );
  assert.equal(updated.consumed.steps, 1);
  assert.equal(runRows.find((entry) => entry.id === RUN_ID)?.consumedSteps, 1);

  // Unfenced updates keep the historical 404-on-missing semantics.
  await assert.rejects(
    () => repository.updateCoordinatorRun(makeRun({ coordinator_run_id: 'coordinator_run_missing' })),
    (error: unknown) => error instanceof AppError && error.statusCode === 404,
  );
});
