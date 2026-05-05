import fs from 'node:fs/promises';
import path from 'node:path';
import type { LiteratureContentProcessingStorageRootsDTO } from '@paper-engineering-assistant/shared/research-lifecycle/literature-contracts';
import { sha256Text } from '../literature-content-processing-utils.js';
import type { LiteratureContentProcessingSettingsService } from '../literature-content-processing-settings-service.js';

export type StoredContentArtifact = {
  path: string;
  checksum: string;
  byteSize: number;
};

export class LiteratureContentProcessingFileStore {
  constructor(private readonly settingsService?: LiteratureContentProcessingSettingsService) {}

  async writeTextArtifact(input: {
    root: keyof LiteratureContentProcessingStorageRootsDTO;
    literatureId: string;
    fileName: string;
    text: string;
  }): Promise<StoredContentArtifact> {
    const root = await this.resolveRoot(input.root);
    const directory = path.join(root, this.safePathSegment(input.literatureId));
    await fs.mkdir(directory, { recursive: true });
    const filePath = path.join(directory, this.safePathSegment(input.fileName));
    await fs.writeFile(filePath, input.text, 'utf8');
    return {
      path: filePath,
      checksum: sha256Text(input.text),
      byteSize: Buffer.byteLength(input.text, 'utf8'),
    };
  }

  async writeJsonArtifact(input: {
    root: keyof LiteratureContentProcessingStorageRootsDTO;
    literatureId: string;
    fileName: string;
    payload: Record<string, unknown>;
  }): Promise<StoredContentArtifact> {
    return this.writeTextArtifact({
      root: input.root,
      literatureId: input.literatureId,
      fileName: input.fileName,
      text: `${JSON.stringify(input.payload, null, 2)}\n`,
    });
  }

  private async resolveRoot(root: keyof LiteratureContentProcessingStorageRootsDTO): Promise<string> {
    if (this.settingsService) {
      return this.settingsService.resolveStorageRoot(root);
    }
    const os = await import('node:os');
    return path.join(os.homedir(), '.paper-engineering-assistant', 'literature-content-processing', this.defaultRootSegment(root));
  }

  private defaultRootSegment(root: keyof LiteratureContentProcessingStorageRootsDTO): string {
    switch (root) {
      case 'raw_files':
        return 'raw';
      case 'normalized_text':
        return 'normalized';
      case 'artifacts_cache':
        return 'artifacts';
      case 'indexes':
        return 'indexes';
      case 'exports':
        return 'exports';
    }
  }

  private safePathSegment(value: string): string {
    const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || 'artifact';
  }
}
