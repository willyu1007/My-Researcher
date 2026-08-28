import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  TopicSelectionEvidenceMapRecord,
  TopicSelectionEvidenceSourceLocator,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  LiteratureAbstractProfileRecord,
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
} from '../repositories/literature-repository.js';
import { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';

const HASH = 'a'.repeat(64);
const TITLE_CARD_ID = 'title_1';
const LITERATURE_ID = 'lit_1';

function ref(ref_type: string, ref_id: string, version_id?: string) {
  return { ref_type, ref_id, ...(version_id ? { version_id } : {}) };
}

const document = {
  id: 'document_row_1',
  literatureId: LITERATURE_ID,
  sourceAssetId: 'asset_1',
  updatedAt: '2026-08-28T10:00:00.000Z',
} as unknown as LiteratureFulltextDocumentRecord;
const sections = [{
  id: 'section_row_1',
  documentId: document.id,
  sectionId: 'section_parser_1',
  title: 'Method',
  orderIndex: 1,
  checksum: HASH,
}] as unknown as LiteratureFulltextSectionRecord[];
const paragraphs = [
  {
    id: 'paragraph_row_1',
    documentId: document.id,
    paragraphId: 'paragraph_parser_1',
    sectionId: 'section_parser_1',
    orderIndex: 1,
    text: 'The signed intervention separates adjacent-depth effects.',
    checksum: HASH,
  },
  {
    id: 'paragraph_row_2',
    documentId: document.id,
    paragraphId: 'paragraph_parser_2',
    sectionId: 'section_parser_1',
    orderIndex: 2,
    text: 'The negative control removes the effect under the competing mechanism.',
    checksum: HASH,
  },
] as unknown as LiteratureFulltextParagraphRecord[];
const anchors = [{
  id: 'anchor_row_1',
  documentId: document.id,
  anchorId: 'anchor_parser_1',
  text: 'Ablation result: the competing mechanism fails.',
  checksum: HASH,
}] as unknown as LiteratureFulltextAnchorRecord[];
const abstractProfile = {
  id: 'abstract_row_1',
  literatureId: LITERATURE_ID,
  abstractText: 'We study a signed intervention for adjacent-depth effects.',
  checksum: HASH,
} as unknown as LiteratureAbstractProfileRecord;

function locator(locatorType: TopicSelectionEvidenceSourceLocator['locator_type'], refId: string) {
  const contentRef = ref(`literature_${locatorType}`, refId);
  return {
    locator_type: locatorType,
    locator_ref: contentRef,
    literature_ref: ref('literature_record', LITERATURE_ID),
    source_ref: ref('literature_source', 'source_1'),
    document_ref: locatorType === 'abstract' ? null : ref('literature_document', document.id),
    section_ref: locatorType === 'section' ? contentRef : null,
    paragraph_ref: locatorType === 'paragraph' ? contentRef : null,
    anchor_ref: locatorType === 'anchor' ? contentRef : null,
  } as TopicSelectionEvidenceSourceLocator;
}

function unit(
  id: string,
  sourceStatement: string,
  sourceLocator: TopicSelectionEvidenceSourceLocator,
): TopicSelectionEvidenceUnitRecord {
  return {
    evidence_unit_id: id,
    title_card_id: TITLE_CARD_ID,
    evidence_map_id: 'map_1',
    evidence_map_version: 'v1',
    search_run_ref: ref('search_run', 'run_1'),
    search_plan_ref: ref('search_plan', 'plan_1'),
    literature_snapshot_ref: ref('literature_snapshot', 'snapshot_1'),
    literature_ref: ref('literature_record', LITERATURE_ID),
    source_refs: [ref('literature_source', 'source_1')],
    locator: sourceLocator,
    evidence_role: 'support',
    source_attribution_kind: 'source_claim',
    source_statement: sourceStatement,
    interpretation_payload: {},
    abstract_only: sourceLocator.locator_type === 'abstract',
    review_status: 'machine_checked',
    freshness_status: 'current',
    issue_codes: [],
    created_by: 'system',
    created_at: '2026-08-28T10:00:00.000Z',
  };
}

const evidenceMap = {
  evidence_map_id: 'map_1',
  title_card_id: TITLE_CARD_ID,
  evidence_map_version: 'v1',
  status: 'ready',
  review_status: 'machine_checked',
  freshness_status: 'current',
} as unknown as TopicSelectionEvidenceMapRecord;

function createService(overrides: { stale?: boolean; mismatch?: boolean; manual?: boolean } = {}) {
  const units = [
    unit('unit_paragraph_row', 'signed intervention separates adjacent-depth effects', locator('paragraph', 'paragraph_row_1')),
    unit('unit_paragraph_parser', 'negative control removes the effect', locator('paragraph', 'paragraph_parser_2')),
    unit('unit_section', 'negative control removes the effect', locator('section', 'section_parser_1')),
    unit('unit_anchor', 'competing mechanism fails', locator('anchor', 'anchor_parser_1')),
    unit('unit_abstract', 'signed intervention for adjacent-depth effects', locator('abstract', 'abstract_row_1')),
  ];
  if (overrides.mismatch) units[0] = unit('unit_paragraph_row', 'invented claim absent from source', locator('paragraph', 'paragraph_row_1'));
  if (overrides.manual) units[0] = unit('unit_paragraph_row', 'manual note', locator('manual', 'manual_1'));
  return new TopicSelectionResearchEvidencePacketService({
    evidenceMapRepository: {
      findEvidenceMapById: async () => evidenceMap,
      findEvidenceUnitById: async (id) => units.find((candidate) => candidate.evidence_unit_id === id) ?? null,
    },
    literatureRepository: {
      findAbstractProfileByLiteratureId: async () => abstractProfile,
      listFulltextDocumentsByLiteratureId: async () => [document],
      listFulltextSectionsByDocumentId: async () => sections,
      listFulltextParagraphsByDocumentId: async () => paragraphs,
      listFulltextAnchorsByDocumentId: async () => anchors,
    },
    retrievalReadinessResolver: async () => new Map([[
      LITERATURE_ID,
      {
        ready: true,
        reason: 'EVIDENCE_READY',
        freshness: overrides.stale ? 'stale' : 'fresh',
        freshness_detail: null,
      },
    ]]),
  });
}

function request() {
  return {
    schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1' as const,
    title_card_id: TITLE_CARD_ID,
    participant_role: 'opportunity_scout' as const,
    query_intent: {
      intent_type: 'support' as const,
      query: 'Which mechanism produces the observed effect?',
      rationale: 'Resolve claim-bearing evidence before role execution.',
      target_claim: 'The signed intervention separates adjacent-depth effects.',
    },
    evidence_unit_refs: [
      'unit_paragraph_row',
      'unit_paragraph_parser',
      'unit_section',
      'unit_anchor',
      'unit_abstract',
    ].map((id) => ({
      ref_type: 'evidence_unit',
      ref_id: id,
      title_card_id: TITLE_CARD_ID,
      version_id: 'v1',
    })),
  };
}

test('EvidencePacket resolves row and parser locators into bounded replayable excerpts', async () => {
  const service = createService();
  const packet = await service.resolve(request());
  const replay = await service.resolve(request());
  assert.deepEqual(replay, packet);
  assert.equal(packet.items.length, 5);
  assert.equal(packet.items[0]?.resolved_locator.content_row_id, 'paragraph_row_1');
  assert.equal(packet.items[1]?.resolved_locator.parser_ref_id, 'paragraph_parser_2');
  assert.match(packet.items[2]?.resolved_excerpt ?? '', /negative control removes the effect/u);
  assert.match(packet.items[3]?.resolved_excerpt ?? '', /Ablation result/u);
  assert.match(packet.items[4]?.resolved_excerpt ?? '', /signed intervention/u);
  assert.equal(packet.items.every((item) =>
    item.quote_integrity === 'exact_match' || item.quote_integrity === 'normalized_match'
  ), true);
  assert.match(packet.packet_hash, /^[a-f0-9]{64}$/u);
});

test('EvidencePacket fails closed on quote mismatch, stale literature, and manual locators', async () => {
  await assert.rejects(createService({ mismatch: true }).resolve({
    ...request(),
    evidence_unit_refs: request().evidence_unit_refs.slice(0, 1),
  }), /quote integrity/u);
  await assert.rejects(createService({ stale: true }).resolve(request()), /stale/u);
  await assert.rejects(createService({ manual: true }).resolve({
    ...request(),
    evidence_unit_refs: request().evidence_unit_refs.slice(0, 1),
  }), /manual locator/u);
});
