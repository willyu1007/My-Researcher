import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import type { TopicSelectionEvidenceUnitRecord } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import { InMemoryLiteratureRepository } from '../../repositories/in-memory-literature-repository.js';
import type { TopicSelectionEvidenceMapRepository } from '../../repositories/topic-selection-evidence-map.repository.js';
import { TopicSelectionResearchEvidencePacketService } from '../topic-selection-research-evidence-packet-service.js';
import { sha256Text } from '../literature-content-processing-utils.js';

// Original versioned abstracts, normalized by HTML text extraction and whitespace collapse.
export const QUALIFICATION_SOURCE_PINS = [
  { id: '2004.04906v3', hash: '1d92ab3f358bc517ca0fd9d5169dfe04832dadfdb47fd8baf2488f9d9f76fbc2',
    claim: 'retrieval can be practically implemented using dense representations alone', role: 'support', unit: 'evidence_unit_support_1' },
  { id: '2104.08663v4', hash: '42042f9170192744434569d6330ad1641fad51e3ce96957b2e5617922ef44115',
    claim: 'BM25 is a robust baseline', role: 'baseline', unit: 'evidence_unit_baseline_1' },
  { id: '2307.03172v3', hash: '9597f645fa2ed241ae31cd867771e71ea15ede9d498117e1d1b409403c10aa88',
    claim: 'performance is often highest when relevant information occurs at the beginning or end', role: 'context', unit: 'evidence_unit_context_1' },
] as const;

export async function qualificationSources(file: string, titleCardId: string, insufficient = false) {
  const sourceData: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(sourceData)) throw new Error('Expected the pinned source array.');
  const literature = new InMemoryLiteratureRepository();
  const ref = (ref_type: string, ref_id: string) => ({ ref_type, ref_id, title_card_id: titleCardId, version_id: null });
  const units: TopicSelectionEvidenceUnitRecord[] = [];
  const pins = insufficient ? QUALIFICATION_SOURCE_PINS.slice(0, 1) : QUALIFICATION_SOURCE_PINS;
  for (const pin of pins) {
    const source = sourceData.find((item: unknown): item is { id: string; url: string; abstract: string } =>
      typeof item === 'object' && item !== null && 'id' in item && item.id === pin.id
      && 'url' in item && item.url === `https://arxiv.org/abs/${pin.id}`
      && 'abstract' in item && typeof item.abstract === 'string');
    if (!source || sha256Text(source.abstract) !== pin.hash || !source.abstract.includes(pin.claim)) {
      throw new Error(`Pinned source ${pin.id} is absent or changed.`);
    }
    const literatureId = `arxiv:${pin.id}`;
    const abstractId = `abstract:${pin.id}`;
    await literature.upsertAbstractProfile({ id: abstractId, literatureId, abstractText: source.abstract,
      abstractSource: 'arxiv', sourceRef: { url: source.url, version: pin.id }, checksum: pin.hash,
      language: 'en', confidence: 1, reasonCodes: ['PINNED_ORIGINAL_ABSTRACT'], generated: false,
      createdAt: '2026-09-09T00:00:00.000Z', updatedAt: '2026-09-09T00:00:00.000Z' });
    const literatureRef = ref('literature_record', literatureId);
    const sourceRef = ref('literature_source', source.url);
    units.push({ evidence_unit_id: pin.unit, title_card_id: titleCardId, evidence_map_id: 'evidence_map_1',
      evidence_map_version: 'v1', search_run_ref: ref('search_run', 'search_run_1'),
      search_plan_ref: ref('search_plan', 'search_plan_1'), literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'literature_snapshot_1'),
      literature_ref: literatureRef, source_refs: [sourceRef],
      locator: { locator_type: 'abstract', locator_ref: ref('literature_abstract', abstractId),
        literature_ref: literatureRef, source_ref: sourceRef, document_ref: null, section_ref: null, paragraph_ref: null, anchor_ref: null },
      evidence_role: pin.role, source_attribution_kind: 'source_claim', source_statement: pin.claim,
      interpretation_payload: { qualification: true, source_hash: pin.hash }, abstract_only: true,
      review_status: 'machine_checked', freshness_status: 'current', issue_codes: ['ABSTRACT_ONLY_EVIDENCE'],
      created_by: 'system', created_at: '2026-09-09T00:00:00.000Z' });
  }
  return {
    units,
    resolver: (evidenceMapRepository: TopicSelectionEvidenceMapRepository) => new TopicSelectionResearchEvidencePacketService({
      evidenceMapRepository, literatureRepository: literature,
      // Isolated upstream setup: source text is pinned/readable; no live retrieval or embedding is claimed.
      directEvidenceReadinessResolver: async ids => new Map(await Promise.all(ids.map(async id => {
        const abstract = await literature.findAbstractProfileByLiteratureId(id);
        return [id, { ready: Boolean(abstract?.abstractText), reason: 'EVIDENCE_READY' as const,
          freshness: 'fresh' as const, freshness_detail: null }] as const;
      }))),
    }),
  };
}

/** Controlled evidence units over the previously verified BEIR comparison and bias paragraphs.
 * Source and quote resolution are real; retrieval, extraction and upstream Human choices are fixtures.
 */
export async function qualificationBeirParagraphs(file: string, titleCardId: string) {
  const source: { url: string; text: string; paragraphs: string[] } = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(source.url, 'https://arxiv.org/html/2104.08663v4#S5');
  assert.equal(sha256Text(source.text), '9857965c203b4935ec628a8ff203f3fe6666580d12d12f63607ca618c31b7070');
  assert.equal(sha256Text(JSON.stringify(source.paragraphs)), '4e78146c033b185700e9afcafd43d6d207d6861e1f13530e9709c7aeaac17f7f');
  const literature = new InMemoryLiteratureRepository();
  const literatureId = 'arxiv:2104.08663v4';
  const documentId = 'qualification-beir-document';
  const dates = { createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z' };
  const ref = (ref_type: string, ref_id: string) => ({ ref_type, ref_id, title_card_id: titleCardId, version_id: null });
  await literature.upsertFulltextExtractionBundle({
    document: { id: documentId, literatureId, sourceAssetId: 'qualification-beir-asset', normalizedText: source.text,
      normalizedTextPath: null, normalizedTextChecksum: sha256Text(source.text), parserName: 'controlled-pinned-original', parserVersion: 'v1',
      parserArtifactPath: null, parserArtifactMimeType: null, status: 'READY', diagnostics: [], ...dates },
    sections: [{ id: 'qualification-beir-prose', documentId, sectionId: 'qualification-beir-prose', title: 'BEIR S5/S6 prose',
      level: 1, orderIndex: 1, startOffset: 0, endOffset: source.text.length, pageStart: 1, pageEnd: 1, checksum: sha256Text(source.text), ...dates }],
    anchors: [], paragraphs: source.paragraphs.map((text, index) => {
      const start = source.text.indexOf(text);
      assert.ok(text.trim() && start >= 0);
      const id = `qualification-beir-paragraph-${index + 1}`;
      return { id, documentId, paragraphId: id, sectionId: 'qualification-beir-prose', orderIndex: index + 1, text,
        startOffset: start, endOffset: start + text.length, pageNumber: null, checksum: sha256Text(text), confidence: 1, ...dates };
    }),
  });
  const roles = ['baseline', 'support', 'challenge', 'context', 'context', 'challenge', 'context', 'challenge', 'challenge'] as const;
  const units: TopicSelectionEvidenceUnitRecord[] = source.paragraphs.map((text, index) => {
    const paragraph = ref('fulltext_paragraph', `qualification-beir-paragraph-${index + 1}`);
    const literatureRef = ref('literature_record', literatureId);
    const sourceRef = ref('literature_source', source.url);
    return { evidence_unit_id: `qualification-beir-unit-${index + 1}`, title_card_id: titleCardId,
      evidence_map_id: 'evidence_map_1', evidence_map_version: 'v1', search_run_ref: ref('search_run', 'search_run_1'),
      search_plan_ref: ref('search_plan', 'search_plan_1'), literature_snapshot_ref: ref('literature_resource_pool_snapshot', 'literature_snapshot_1'),
      literature_ref: literatureRef, source_refs: [sourceRef],
      locator: { locator_type: 'paragraph', locator_ref: paragraph, paragraph_ref: paragraph, literature_ref: literatureRef,
        source_ref: sourceRef, document_ref: ref('fulltext_document', documentId), section_ref: null, anchor_ref: null },
      evidence_role: roles[index]!, source_attribution_kind: 'source_claim', source_statement: text,
      interpretation_payload: { controlled_unit: true, paragraph_hash: sha256Text(text), historical_source_only: true },
      abstract_only: false, review_status: 'machine_checked', freshness_status: 'current', issue_codes: [],
      created_by: 'system', created_at: dates.createdAt };
  });
  return { units, source,
    resolver: (evidenceMapRepository: TopicSelectionEvidenceMapRepository) => new TopicSelectionResearchEvidencePacketService({
      evidenceMapRepository, literatureRepository: literature,
      directEvidenceReadinessResolver: async ids => new Map(ids.map(id => [id, {
        ready: id === literatureId, reason: 'EVIDENCE_READY' as const, freshness: 'fresh' as const, freshness_detail: null,
      }])),
    }),
  };
}
