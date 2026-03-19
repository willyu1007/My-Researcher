import type { LiteratureMetadataRecord } from '../types';
import {
  asRecord,
  toText,
} from './common';

export function normalizeLiteratureMetadataPayload(payload: unknown): LiteratureMetadataRecord | null {
  const root = asRecord(payload);
  if (!root) {
    return null;
  }

  const literatureId = toText(root.literature_id);
  const title = toText(root.title);
  const updatedAt = toText(root.updated_at);
  if (!literatureId || !title || !updatedAt) {
    return null;
  }

  return {
    literature_id: literatureId,
    title,
    abstract: toText(root.abstract) ?? null,
    key_content_digest: toText(root.key_content_digest) ?? null,
    updated_at: updatedAt,
  };
}
