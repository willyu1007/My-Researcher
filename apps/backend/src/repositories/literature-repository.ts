import type {
  LiteratureProvider,
  PaperCitationStatus,
  RightsClass,
  TopicScopeStatus,
} from '@paper-engineering-assistant/shared';

export type LiteratureRecord = {
  id: string;
  title: string;
  abstractText: string | null;
  authors: string[];
  year: number | null;
  doiNormalized: string | null;
  arxivId: string | null;
  normalizedTitle: string;
  titleAuthorsYearHash: string | null;
  rightsClass: RightsClass;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type LiteratureSourceRecord = {
  id: string;
  literatureId: string;
  provider: LiteratureProvider;
  sourceItemId: string;
  sourceUrl: string;
  rawPayload: Record<string, unknown>;
  fetchedAt: string;
};

export type TopicLiteratureScopeRecord = {
  id: string;
  topicId: string;
  literatureId: string;
  scopeStatus: TopicScopeStatus;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaperLiteratureLinkRecord = {
  id: string;
  paperId: string;
  topicId: string | null;
  literatureId: string;
  citationStatus: PaperCitationStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface LiteratureRepository {
  countLiteratures(): Promise<number>;
  countLiteratureSources(): Promise<number>;
  countTopicScopes(): Promise<number>;
  countPaperLiteratureLinks(): Promise<number>;

  createLiterature(record: LiteratureRecord): Promise<LiteratureRecord>;
  updateLiterature(record: LiteratureRecord): Promise<LiteratureRecord>;
  findLiteratureById(literatureId: string): Promise<LiteratureRecord | null>;
  findLiteratureByDoi(doiNormalized: string): Promise<LiteratureRecord | null>;
  findLiteratureByArxivId(arxivId: string): Promise<LiteratureRecord | null>;
  findLiteratureByTitleAuthorsYearHash(hash: string): Promise<LiteratureRecord | null>;
  listLiteraturesByIds(literatureIds: string[]): Promise<LiteratureRecord[]>;

  upsertLiteratureSource(
    record: LiteratureSourceRecord,
  ): Promise<{ record: LiteratureSourceRecord; created: boolean }>;
  listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]>;

  upsertTopicScope(
    record: TopicLiteratureScopeRecord,
  ): Promise<{ record: TopicLiteratureScopeRecord; created: boolean }>;
  listTopicScopesByTopicId(topicId: string): Promise<TopicLiteratureScopeRecord[]>;

  upsertPaperLiteratureLink(
    record: PaperLiteratureLinkRecord,
  ): Promise<{ record: PaperLiteratureLinkRecord; created: boolean }>;
  findPaperLiteratureLinkById(linkId: string): Promise<PaperLiteratureLinkRecord | null>;
  listPaperLiteratureLinksByPaperId(paperId: string): Promise<PaperLiteratureLinkRecord[]>;
  updatePaperLiteratureLink(
    linkId: string,
    patch: { citationStatus?: PaperCitationStatus; note?: string | null },
  ): Promise<PaperLiteratureLinkRecord>;
}
