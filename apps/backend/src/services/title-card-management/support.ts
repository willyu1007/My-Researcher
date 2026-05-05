import type { ValueAssessmentDTO } from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';

export interface PaperProjectGateway {
  createPaperProject(input: {
    title_card_id: string;
    title: string;
    research_direction?: string;
    created_by: 'human' | 'hybrid';
    initial_context: { literature_evidence_ids: string[] };
  }): Promise<{ paper_id: string }>;
  deletePaperProject(paperId: string): Promise<void>;
}

export type LiteratureReferenceRecord = {
  id: string;
  title: string;
  abstractText: string | null;
  keyContentDigest: string | null;
  authors: string[];
  year: number | null;
  tags: string[];
  rightsClass: string;
};

export type LiteratureSourceRecord = {
  provider: string;
  sourceUrl: string;
};

export type LiteraturePipelineState = {
  literatureId: string;
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
};

export interface TitleCardManagementReferenceGateway {
  findLiteratureById(literatureId: string): Promise<LiteratureReferenceRecord | null>;
  listLiteratures(): Promise<LiteratureReferenceRecord[]>;
  listSourcesByLiteratureId(literatureId: string): Promise<LiteratureSourceRecord[]>;
  listPipelineStatesByLiteratureIds(literatureIds: string[]): Promise<LiteraturePipelineState[]>;
}

export function allHardGatesPass(value: ValueAssessmentDTO): boolean {
  return Object.values(value.hard_gates).every((gate) => gate.pass);
}

export function isRecordUsable(recordStatus: string): boolean {
  return recordStatus !== 'archived' && recordStatus !== 'superseded';
}

export function isPipelineReady(
  state: Omit<LiteraturePipelineState, 'literatureId'> | null | undefined,
): boolean {
  return Boolean(state?.citationComplete && (state.abstractReady || state.keyContentReady));
}
