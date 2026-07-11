import assert from 'node:assert/strict';
import test from 'node:test';

import type { PrismaClient } from '@prisma/client';
import type {
  HumanConfirmationRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-human-confirmation-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../../errors/app-error.js';
import {
  PrismaPaperImplementationHumanConfirmationRepository,
} from './prisma-paper-implementation-human-confirmation-repository.js';

const NOW = '2026-07-10T12:00:00.000Z';
const CONSUMED_AT = '2026-07-10T13:00:00.000Z';
const PROJECT_ID = 'implementation_project_001';

function ref(refType: string, refId: string): TopicSelectionFunctionalRef {
  return {
    ref_type: refType,
    ref_id: refId,
    title_card_id: 'title_card_001',
    version_id: null,
  };
}

function makeRecord(overrides: Partial<HumanConfirmationRecord> = {}): HumanConfirmationRecord {
  return {
    confirmation_record_id: 'pi_human_confirmation_001',
    implementation_project_id: PROJECT_ID,
    confirmation_scope: 'strong_claim_acceptance',
    target_refs: [ref('claim_candidate', 'claim_candidate_001')],
    reviewed_sources: [],
    transition_attempt_ref: null,
    gate_result_refs: [],
    rationale: 'Reviewed the claim before accepting.',
    confirmed_by_actor_type: 'human',
    confirmed_by_actor_id: 'reviewer_001',
    policy_version_id: null,
    status: 'active',
    status_reason: null,
    consumed_at: null,
    consumed_by_ref: null,
    created_at: NOW,
    updated_at: null,
    ...overrides,
  };
}

type StoredRow = Record<string, unknown> & { id: string };

function matchesWhere(row: StoredRow, where: Partial<StoredRow>): boolean {
  return Object.entries(where).every(([key, value]) => row[key] === value);
}

function makeFakePrismaClient(rows: StoredRow[]): PrismaClient {
  return {
    paperImplementationHumanConfirmationRecord: {
      create: async ({ data }: { data: StoredRow }) => {
        rows.push({ ...data });
        return rows.at(-1);
      },
      findUnique: async ({ where }: { where: Partial<StoredRow> }) =>
        rows.find((row) => matchesWhere(row, where)) ?? null,
      findMany: async ({ where }: { where: Partial<StoredRow> }) =>
        rows.filter((row) => matchesWhere(row, where)),
      updateMany: async ({ where, data }: { where: Partial<StoredRow>; data: Partial<StoredRow> }) => {
        const matched = rows.filter((row) => matchesWhere(row, where));
        for (const row of matched) {
          Object.assign(row, data);
        }
        return { count: matched.length };
      },
    },
  } as unknown as PrismaClient;
}

test('Prisma human confirmation repository consumes an active record atomically and once', async () => {
  const rows: StoredRow[] = [];
  const repository = new PrismaPaperImplementationHumanConfirmationRepository(
    makeFakePrismaClient(rows),
  );
  const created = await repository.createHumanConfirmationRecord(makeRecord());
  assert.equal(created.consumed_at ?? null, null);

  const consumed = await repository.consumeHumanConfirmationRecord(
    PROJECT_ID,
    created.confirmation_record_id,
    { consumed_at: CONSUMED_AT, consumed_by_ref: ref('claim_candidate', 'claim_candidate_001') },
  );
  assert.equal(consumed.consumed_at, CONSUMED_AT);
  assert.deepEqual(consumed.consumed_by_ref, ref('claim_candidate', 'claim_candidate_001'));
  assert.equal(consumed.updated_at, CONSUMED_AT);

  // Second consumption must fail: the guarded updateMany matches zero rows.
  await assert.rejects(
    () => repository.consumeHumanConfirmationRecord(
      PROJECT_ID,
      created.confirmation_record_id,
      { consumed_at: CONSUMED_AT, consumed_by_ref: ref('claim_candidate', 'claim_candidate_002') },
    ),
    (error) => error instanceof AppError
      && error.statusCode === 409
      && error.errorCode === 'VERSION_CONFLICT',
  );
  // The winning consumption is preserved.
  const reloaded = await repository.findHumanConfirmationRecordById(
    PROJECT_ID,
    created.confirmation_record_id,
  );
  assert.deepEqual(reloaded?.consumed_by_ref, ref('claim_candidate', 'claim_candidate_001'));
});

test('Prisma human confirmation repository rejects consuming missing, foreign, or non-active rows', async () => {
  const rows: StoredRow[] = [];
  const repository = new PrismaPaperImplementationHumanConfirmationRepository(
    makeFakePrismaClient(rows),
  );
  await repository.createHumanConfirmationRecord(makeRecord({
    confirmation_record_id: 'pi_human_confirmation_invalidated_001',
    status: 'invalidated',
  }));

  const isConsumeConflict = (error: unknown) => error instanceof AppError
    && error.statusCode === 409
    && error.errorCode === 'VERSION_CONFLICT';

  await assert.rejects(
    () => repository.consumeHumanConfirmationRecord(
      PROJECT_ID,
      'pi_human_confirmation_missing',
      { consumed_at: CONSUMED_AT, consumed_by_ref: ref('claim_candidate', 'claim_candidate_001') },
    ),
    isConsumeConflict,
  );
  await assert.rejects(
    () => repository.consumeHumanConfirmationRecord(
      'implementation_project_other',
      'pi_human_confirmation_invalidated_001',
      { consumed_at: CONSUMED_AT, consumed_by_ref: ref('claim_candidate', 'claim_candidate_001') },
    ),
    isConsumeConflict,
  );
  await assert.rejects(
    () => repository.consumeHumanConfirmationRecord(
      PROJECT_ID,
      'pi_human_confirmation_invalidated_001',
      { consumed_at: CONSUMED_AT, consumed_by_ref: ref('claim_candidate', 'claim_candidate_001') },
    ),
    isConsumeConflict,
  );
});
