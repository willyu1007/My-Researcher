import { readFileSync } from 'node:fs';
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
