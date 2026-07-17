import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import { assertBackHalfSourceContextPacketFence } from './paper-implementation-runtime-utils.js';

function ref(refType: string, refId: string, versionId: string | null = null): TopicSelectionFunctionalRef {
  return { ref_type: refType, ref_id: refId, title_card_id: 'tc_1', version_id: versionId };
}

test('T-124 G5 FIX-A item 8: fence passes when a packet matches a declared source ref (type + id + version)', () => {
  assert.doesNotThrow(() => assertBackHalfSourceContextPacketFence(
    [ref('result_interpretation_packet', 'packet_1', 'v3')],
    ['sha256:body'],
    [{ source_ref: ref('result_interpretation_packet', 'packet_1', 'v3'), source_hash: 'sha256:body' }],
  ));
});

test('T-124 G5 FIX-A item 8: fence rejects a packet that pins a different version_id than the declared ref', () => {
  assert.throws(
    () => assertBackHalfSourceContextPacketFence(
      [ref('result_interpretation_packet', 'packet_1', 'v3')],
      ['sha256:body'],
      // Same type + id but a model-invented version pin — a different object.
      [{ source_ref: ref('result_interpretation_packet', 'packet_1', 'v9'), source_hash: 'sha256:body' }],
    ),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /is not among the declared source_refs/.test(error.message),
  );
});

test('T-124 G5 FIX-A item 8: fence rejects an ambiguous declared set (duplicate identity, divergent hashes)', () => {
  assert.throws(
    () => assertBackHalfSourceContextPacketFence(
      [ref('result_interpretation_packet', 'packet_1'), ref('result_interpretation_packet', 'packet_1')],
      ['sha256:body_a', 'sha256:body_b'],
      [{ source_ref: ref('result_interpretation_packet', 'packet_1'), source_hash: 'sha256:body_a' }],
    ),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /duplicate/.test(error.message),
  );
});

test('T-124 G5 FIX-A item 8: fence still rejects a hash mismatch and no-ops without packets', () => {
  assert.throws(
    () => assertBackHalfSourceContextPacketFence(
      [ref('result_interpretation_packet', 'packet_1')],
      ['sha256:declared'],
      [{ source_ref: ref('result_interpretation_packet', 'packet_1'), source_hash: 'sha256:other' }],
    ),
    (error) => error instanceof AppError
      && error.statusCode === 400
      && /does not match the declared source_hash/.test(error.message),
  );
  assert.doesNotThrow(() => assertBackHalfSourceContextPacketFence(
    [ref('result_interpretation_packet', 'packet_1')],
    ['sha256:declared'],
    undefined,
  ));
});
