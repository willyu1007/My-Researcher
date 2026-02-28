export const MANUAL_RIGHTS_CLASSES = ['OA', 'USER_AUTH', 'RESTRICTED', 'UNKNOWN'] as const;

export type ManualRightsClass = (typeof MANUAL_RIGHTS_CLASSES)[number];

export type ManualImportMode = 'import_and_scope' | 'import_only';

export type ManualDraftRow = {
  id: string;
  include: boolean;
  provider: 'manual';
  external_id: string;
  title: string;
  abstract: string;
  authors_text: string;
  year_text: string;
  doi: string;
  arxiv_id: string;
  source_url: string;
  rights_class: ManualRightsClass;
  tags_text: string;
};

export type ManualImportPayload = {
  provider: 'manual';
  external_id: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  arxiv_id?: string;
  source_url: string;
  rights_class?: ManualRightsClass;
  tags?: string[];
};

export type ManualRowValidation = {
  row_id: string;
  is_valid: boolean;
  errors: string[];
  normalized?: ManualImportPayload;
};

export type ManualImportSession = {
  file_name: string;
  rows: ManualDraftRow[];
};
