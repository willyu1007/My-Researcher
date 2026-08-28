import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceSourceLocator,
  TopicSelectionEvidenceUnitRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type {
  TopicSelectionResearchEvidencePacket,
  TopicSelectionResearchEvidencePacketItem,
  TopicSelectionResearchEvidencePacketRequest,
  TopicSelectionResearchEvidenceRelation,
  TopicSelectionResearchQuoteIntegrityStatus,
  TopicSelectionResearchResolvedEvidenceLocator,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-arena-contracts';
import { AppError } from '../errors/app-error.js';
import type {
  LiteratureFulltextAnchorRecord,
  LiteratureFulltextDocumentRecord,
  LiteratureFulltextParagraphRecord,
  LiteratureFulltextSectionRecord,
  LiteratureRepository,
} from '../repositories/literature-repository.js';
import type { TopicSelectionEvidenceMapRepository } from '../repositories/topic-selection-evidence-map.repository.js';
import type { LiteratureRetrievalReadiness } from './literature-evidence-activation-service.js';
import { sha256Text, stableStringify } from './literature-content-processing-utils.js';

const MAX_EVIDENCE_PACKET_ITEMS = 12;
const MAX_EXCERPT_CHARS = 8_000;

type ResolvedContent = {
  text: string;
  locator: TopicSelectionResearchResolvedEvidenceLocator;
};

type ServiceOptions = {
  evidenceMapRepository: Pick<
    TopicSelectionEvidenceMapRepository,
    'findEvidenceMapById' | 'findEvidenceUnitById'
  >;
  literatureRepository: Pick<
    LiteratureRepository,
    | 'findAbstractProfileByLiteratureId'
    | 'listFulltextAnchorsByDocumentId'
    | 'listFulltextDocumentsByLiteratureId'
    | 'listFulltextParagraphsByDocumentId'
    | 'listFulltextSectionsByDocumentId'
  >;
  retrievalReadinessResolver: (
    literatureIds: string[],
  ) => Promise<Map<string, LiteratureRetrievalReadiness>>;
};

export class TopicSelectionResearchEvidencePacketService {
  constructor(private readonly options: ServiceOptions) {}

  async resolve(
    input: TopicSelectionResearchEvidencePacketRequest,
  ): Promise<TopicSelectionResearchEvidencePacket> {
    this.assertInput(input);
    const units = await Promise.all(input.evidence_unit_refs.map(async (ref) => {
      const unit = await this.options.evidenceMapRepository.findEvidenceUnitById(ref.ref_id);
      if (!unit) throw new AppError(404, 'NOT_FOUND', `EvidenceUnit ${ref.ref_id} was not found.`);
      if (unit.title_card_id !== input.title_card_id
        || (ref.title_card_id && ref.title_card_id !== unit.title_card_id)
        || (ref.version_id && ref.version_id !== unit.evidence_map_version)) {
        throw new AppError(409, 'VERSION_CONFLICT', `EvidenceUnit ${ref.ref_id} is outside the requested current title-card/version scope.`);
      }
      return unit;
    }));
    const evidenceMapIds = [...new Set(units.map((unit) => unit.evidence_map_id))];
    const evidenceMaps = await Promise.all(evidenceMapIds.map(async (evidenceMapId) => {
      const evidenceMap = await this.options.evidenceMapRepository.findEvidenceMapById(evidenceMapId);
      if (!evidenceMap) throw new AppError(404, 'NOT_FOUND', `EvidenceMap ${evidenceMapId} was not found.`);
      if (evidenceMap.title_card_id !== input.title_card_id
        || evidenceMap.status !== 'ready'
        || evidenceMap.freshness_status !== 'current'
        || !['machine_checked', 'human_reviewed'].includes(evidenceMap.review_status)) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceMap ${evidenceMapId} is not a current reviewed evidence authority.`);
      }
      return evidenceMap;
    }));
    const evidenceMapById = new Map(evidenceMaps.map((evidenceMap) => [evidenceMap.evidence_map_id, evidenceMap]));
    const literatureIds = [...new Set(units.map((unit) => unit.literature_ref.ref_id))];
    const readiness = await this.options.retrievalReadinessResolver(literatureIds);

    const items: TopicSelectionResearchEvidencePacketItem[] = [];
    for (const unit of units) {
      this.assertEvidenceUnitAdmissible(unit);
      const literatureReadiness = readiness.get(unit.literature_ref.ref_id);
      if (!literatureReadiness?.ready) {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          `EvidenceUnit ${unit.evidence_unit_id} literature is not retrieval-ready (${literatureReadiness?.reason ?? 'READINESS_MISSING'}).`,
        );
      }
      if (literatureReadiness.freshness !== 'fresh') {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceUnit ${unit.evidence_unit_id} literature index is stale.`);
      }
      const evidenceMap = evidenceMapById.get(unit.evidence_map_id);
      if (!evidenceMap) {
        throw new AppError(409, 'VERSION_CONFLICT', `EvidenceUnit ${unit.evidence_unit_id} has no resolved EvidenceMap.`);
      }
      const resolved = await this.resolveContent(unit);
      const excerpt = this.boundExcerpt(resolved.text, unit.source_statement);
      const quoteIntegrity = this.quoteIntegrity(unit.source_statement, excerpt);
      if (quoteIntegrity === 'mismatch') {
        throw new AppError(
          422,
          'GATE_CONSTRAINT_FAILED',
          `EvidenceUnit ${unit.evidence_unit_id} quote integrity failed against resolved source text.`,
        );
      }
      items.push({
        evidence_unit_ref: this.ref('evidence_unit', unit.evidence_unit_id, unit.title_card_id, unit.evidence_map_version),
        evidence_map_ref: this.ref('evidence_map', evidenceMap.evidence_map_id, unit.title_card_id, evidenceMap.evidence_map_version),
        literature_ref: unit.literature_ref,
        evidence_role: unit.evidence_role,
        relation_to_target_claim: this.relation(unit.evidence_role),
        source_statement: unit.source_statement,
        resolved_excerpt: excerpt,
        excerpt_hash: sha256Text(excerpt),
        resolved_locator: resolved.locator,
        freshness: {
          status: 'current',
          retrieval_readiness_reason: literatureReadiness.reason,
        },
        quote_integrity: quoteIntegrity,
        issue_codes: unit.abstract_only ? ['ABSTRACT_ONLY_EVIDENCE'] : [],
      });
    }

    const sourceRefs = this.uniqueRefs(items.flatMap((item, index) => {
      const unit = units[index];
      return unit ? [
        item.evidence_unit_ref,
        item.evidence_map_ref,
        item.literature_ref,
        unit.search_run_ref,
        unit.search_plan_ref,
        unit.literature_snapshot_ref,
        ...(unit.coverage_row_intent_ref ? [unit.coverage_row_intent_ref] : []),
        ...unit.source_refs,
        unit.locator.locator_ref,
      ] : [];
    }));
    const body = {
      schema_version: 'TopicSelectionResearchEvidencePacket@v1' as const,
      title_card_id: input.title_card_id,
      participant_role: input.participant_role,
      query_intent: input.query_intent,
      items,
      source_refs: sourceRefs,
      total_excerpt_chars: items.reduce((total, item) => total + item.resolved_excerpt.length, 0),
    };
    return { ...body, packet_hash: sha256Text(stableStringify(body)) };
  }

  private assertInput(input: TopicSelectionResearchEvidencePacketRequest): void {
    if (input.evidence_unit_refs.length === 0
      || input.evidence_unit_refs.length > MAX_EVIDENCE_PACKET_ITEMS) {
      throw new AppError(400, 'INVALID_PAYLOAD', `EvidencePacket requires 1-${MAX_EVIDENCE_PACKET_ITEMS} EvidenceUnit refs.`);
    }
    const keys = input.evidence_unit_refs.map((ref) => `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}`);
    if (new Set(keys).size !== keys.length
      || input.evidence_unit_refs.some((ref) => ref.ref_type !== 'evidence_unit')) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'EvidencePacket requires unique evidence_unit refs.');
    }
    if (!input.title_card_id.trim()
      || !input.query_intent.query.trim()
      || !input.query_intent.rationale.trim()
      || !input.query_intent.target_claim.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'EvidencePacket title-card and query-intent fields cannot be empty.');
    }
  }

  private assertEvidenceUnitAdmissible(unit: TopicSelectionEvidenceUnitRecord): void {
    if (unit.freshness_status !== 'current') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceUnit ${unit.evidence_unit_id} is stale or superseded.`);
    }
    if (!['machine_checked', 'human_reviewed'].includes(unit.review_status)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceUnit ${unit.evidence_unit_id} has not passed evidence review.`);
    }
    if (!['source_claim', 'counter_evidence'].includes(unit.source_attribution_kind)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceUnit ${unit.evidence_unit_id} is inference or judgment rather than source evidence.`);
    }
  }

  private async resolveContent(unit: TopicSelectionEvidenceUnitRecord): Promise<ResolvedContent> {
    const { locator } = unit;
    const literatureId = unit.literature_ref.ref_id;
    if (locator.locator_type === 'manual') {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `EvidenceUnit ${unit.evidence_unit_id} manual locator has no authoritative source text.`);
    }
    if (locator.locator_type === 'abstract') {
      const profile = await this.options.literatureRepository.findAbstractProfileByLiteratureId(literatureId);
      if (!profile?.abstractText?.trim()) {
        throw new AppError(404, 'NOT_FOUND', `Literature ${literatureId} abstract text was not found.`);
      }
      if (![profile.id, 'abstract'].includes(locator.locator_ref.ref_id)) {
        throw new AppError(404, 'NOT_FOUND', `Abstract locator ${locator.locator_ref.ref_id} was not found.`);
      }
      return {
        text: profile.abstractText.trim(),
        locator: {
          locator_type: 'abstract',
          literature_id: literatureId,
          document_id: null,
          content_row_id: profile.id,
          parser_ref_id: profile.id,
          checksum: profile.checksum,
        },
      };
    }

    const documents = await this.options.literatureRepository.listFulltextDocumentsByLiteratureId(literatureId);
    const scopedDocuments = this.scopeDocuments(documents, locator);
    if (scopedDocuments.length === 0) {
      throw new AppError(404, 'NOT_FOUND', `Fulltext document for EvidenceUnit ${unit.evidence_unit_id} was not found.`);
    }
    if (locator.locator_type === 'section') return this.resolveSection(scopedDocuments, locator);
    if (locator.locator_type === 'paragraph') return this.resolveParagraph(scopedDocuments, locator);
    return this.resolveAnchor(scopedDocuments, locator);
  }

  private scopeDocuments(
    documents: LiteratureFulltextDocumentRecord[],
    locator: TopicSelectionEvidenceSourceLocator,
  ): LiteratureFulltextDocumentRecord[] {
    const documentRefId = locator.document_ref?.ref_id;
    if (!documentRefId) return documents;
    return documents.filter((document) =>
      document.id === documentRefId || document.sourceAssetId === documentRefId
    );
  }

  private async resolveSection(
    documents: LiteratureFulltextDocumentRecord[],
    locator: TopicSelectionEvidenceSourceLocator,
  ): Promise<ResolvedContent> {
    const refId = (locator.section_ref ?? locator.locator_ref).ref_id;
    const matches: Array<{
      document: LiteratureFulltextDocumentRecord;
      section: LiteratureFulltextSectionRecord;
      paragraphs: LiteratureFulltextParagraphRecord[];
    }> = [];
    for (const document of documents) {
      const [sections, paragraphs] = await Promise.all([
        this.options.literatureRepository.listFulltextSectionsByDocumentId(document.id),
        this.options.literatureRepository.listFulltextParagraphsByDocumentId(document.id),
      ]);
      for (const section of sections.filter((candidate) => candidate.id === refId || candidate.sectionId === refId)) {
        matches.push({
          document,
          section,
          paragraphs: paragraphs
            .filter((paragraph) => paragraph.sectionId === section.sectionId)
            .sort((left, right) => left.orderIndex - right.orderIndex),
        });
      }
    }
    const match = this.uniqueMatch(matches, 'section', refId);
    const text = match.paragraphs.map((paragraph) => paragraph.text.trim()).filter(Boolean).join('\n\n');
    if (!text) throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Section ${refId} has no claim-bearing paragraph text.`);
    return {
      text,
      locator: {
        locator_type: 'section',
        literature_id: match.document.literatureId,
        document_id: match.document.id,
        content_row_id: match.section.id,
        parser_ref_id: match.section.sectionId,
        checksum: match.section.checksum,
      },
    };
  }

  private async resolveParagraph(
    documents: LiteratureFulltextDocumentRecord[],
    locator: TopicSelectionEvidenceSourceLocator,
  ): Promise<ResolvedContent> {
    const refId = (locator.paragraph_ref ?? locator.locator_ref).ref_id;
    const matches: Array<{
      document: LiteratureFulltextDocumentRecord;
      paragraph: LiteratureFulltextParagraphRecord;
    }> = [];
    for (const document of documents) {
      const paragraphs = await this.options.literatureRepository.listFulltextParagraphsByDocumentId(document.id);
      for (const paragraph of paragraphs.filter(
        (candidate) => candidate.id === refId || candidate.paragraphId === refId
      )) {
        matches.push({ document, paragraph });
      }
    }
    const match = this.uniqueMatch(matches, 'paragraph', refId);
    if (!match.paragraph.text.trim()) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Paragraph ${refId} has no claim-bearing text.`);
    }
    return {
      text: match.paragraph.text.trim(),
      locator: {
        locator_type: 'paragraph',
        literature_id: match.document.literatureId,
        document_id: match.document.id,
        content_row_id: match.paragraph.id,
        parser_ref_id: match.paragraph.paragraphId,
        checksum: match.paragraph.checksum,
      },
    };
  }

  private async resolveAnchor(
    documents: LiteratureFulltextDocumentRecord[],
    locator: TopicSelectionEvidenceSourceLocator,
  ): Promise<ResolvedContent> {
    const refId = (locator.anchor_ref ?? locator.locator_ref).ref_id;
    const matches: Array<{
      document: LiteratureFulltextDocumentRecord;
      anchor: LiteratureFulltextAnchorRecord;
    }> = [];
    for (const document of documents) {
      const anchors = await this.options.literatureRepository.listFulltextAnchorsByDocumentId(document.id);
      for (const anchor of anchors.filter((candidate) => candidate.id === refId || candidate.anchorId === refId)) {
        matches.push({ document, anchor });
      }
    }
    const match = this.uniqueMatch(matches, 'anchor', refId);
    if (!match.anchor.text?.trim()) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Anchor ${refId} has no claim-bearing text.`);
    }
    return {
      text: match.anchor.text.trim(),
      locator: {
        locator_type: 'anchor',
        literature_id: match.document.literatureId,
        document_id: match.document.id,
        content_row_id: match.anchor.id,
        parser_ref_id: match.anchor.anchorId,
        checksum: match.anchor.checksum,
      },
    };
  }

  private uniqueMatch<T>(matches: T[], kind: string, refId: string): T {
    if (matches.length === 0) throw new AppError(404, 'NOT_FOUND', `Fulltext ${kind} ${refId} was not found.`);
    if (matches.length > 1) {
      throw new AppError(409, 'VERSION_CONFLICT', `Fulltext ${kind} ${refId} is ambiguous across documents.`);
    }
    return matches[0]!;
  }

  private boundExcerpt(text: string, sourceStatement: string): string {
    const trimmed = text.trim();
    if (trimmed.length <= MAX_EXCERPT_CHARS) return trimmed;
    const exactIndex = trimmed.toLocaleLowerCase().indexOf(sourceStatement.trim().toLocaleLowerCase());
    if (exactIndex < 0) return trimmed.slice(0, MAX_EXCERPT_CHARS).trim();
    const start = Math.max(0, exactIndex - Math.floor((MAX_EXCERPT_CHARS - sourceStatement.length) / 2));
    return trimmed.slice(start, start + MAX_EXCERPT_CHARS).trim();
  }

  private quoteIntegrity(
    sourceStatement: string,
    excerpt: string,
  ): TopicSelectionResearchQuoteIntegrityStatus {
    const statement = sourceStatement.trim();
    if (excerpt.includes(statement)) return 'exact_match';
    return this.normalizeText(excerpt).includes(this.normalizeText(statement))
      ? 'normalized_match'
      : 'mismatch';
  }

  private normalizeText(value: string): string {
    return value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
  }

  private relation(role: TopicSelectionEvidenceUnitRecord['evidence_role']): TopicSelectionResearchEvidenceRelation {
    if (role === 'support') return 'supports';
    if (role === 'challenge') return 'challenges';
    if (role === 'baseline') return 'baselines';
    return 'contextualizes';
  }

  private ref(
    refType: string,
    refId: string,
    titleCardId?: string,
    versionId?: string,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      ...(titleCardId ? { title_card_id: titleCardId } : {}),
      ...(versionId ? { version_id: versionId } : {}),
    };
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((left, right) =>
      `${left.ref_type}:${left.ref_id}:${left.version_id ?? ''}:${left.title_card_id ?? ''}`.localeCompare(
        `${right.ref_type}:${right.ref_id}:${right.version_id ?? ''}:${right.title_card_id ?? ''}`,
      )
    );
  }
}
