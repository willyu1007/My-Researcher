import assert from 'node:assert/strict';
import test from 'node:test';

import { Prisma, type PrismaClient } from '@prisma/client';

import { AppError } from '../../../errors/app-error.js';
import type { LiteratureRecord } from '../../literature-repository.js';
import { PrismaLiteratureCoreStore } from './prisma-literature-core-store.js';

const NOW = '2026-07-08T00:00:00.000Z';

function makeRecord(overrides: Partial<LiteratureRecord> = {}): LiteratureRecord {
  return {
    id: 'LIT-P2002-1',
    title: 'Concurrent Import Race',
    abstractText: null,
    keyContentDigest: null,
    authors: ['Tester'],
    year: 2026,
    doiNormalized: '10.1000/race',
    arxivId: null,
    normalizedTitle: 'concurrent import race',
    titleAuthorsYearHash: 'hash-race',
    rightsClass: 'OA',
    tags: [],
    activeEmbeddingVersionId: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function p2002(target: string[] | string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });
}

function makeFakePrismaClient(options: {
  createError?: Error;
  updateError?: Error;
} = {}): PrismaClient {
  return {
    literatureRecord: {
      create: async () => {
        if (options.createError) {
          throw options.createError;
        }
        throw new Error('unexpected create success in this fixture');
      },
      update: async () => {
        if (options.updateError) {
          throw options.updateError;
        }
        throw new Error('unexpected update success in this fixture');
      },
    },
  } as unknown as PrismaClient;
}

test('createLiterature maps P2002 unique races to structured 409 VERSION_CONFLICT (T-130 W-07 L-09)', async () => {
  const store = new PrismaLiteratureCoreStore(makeFakePrismaClient({
    createError: p2002(['doiNormalized']),
  }));

  await assert.rejects(store.createLiterature(makeRecord()), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 409);
    assert.equal(error.errorCode, 'VERSION_CONFLICT');
    assert.match(error.message, /doiNormalized/);
    assert.deepEqual(error.details, { literature_id: 'LIT-P2002-1', constraint: 'doiNormalized' });
    return true;
  });
});

test('updateLiterature maps P2002 merge collisions and passes other errors through unchanged', async () => {
  const conflictStore = new PrismaLiteratureCoreStore(makeFakePrismaClient({
    updateError: p2002('titleAuthorsYearHash'),
  }));
  await assert.rejects(conflictStore.updateLiterature(makeRecord()), (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, 409);
    assert.equal(error.errorCode, 'VERSION_CONFLICT');
    assert.match(error.message, /titleAuthorsYearHash/);
    return true;
  });

  const plainFailure = new Error('connection reset');
  const passthroughStore = new PrismaLiteratureCoreStore(makeFakePrismaClient({
    createError: plainFailure,
  }));
  await assert.rejects(passthroughStore.createLiterature(makeRecord()), (error: unknown) => error === plainFailure);
});
