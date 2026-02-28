export type ManualImportMode = 'import_and_scope' | 'import_only';

export type ManualDraftProvider = 'manual' | 'zotero';

export type ManualDraftRow = {
  id: string;
  include: boolean;
  provider: ManualDraftProvider;
  external_id: string;
  title: string;
  abstract: string;
  authors_text: string;
  year_text: string;
  doi: string;
  arxiv_id: string;
  source_url: string;
  tags_text: string;
};

export type ManualImportPayload = {
  provider: ManualDraftProvider;
  external_id: string;
  title: string;
  abstract?: string;
  authors?: string[];
  year?: number;
  doi?: string;
  arxiv_id?: string;
  source_url: string;
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
