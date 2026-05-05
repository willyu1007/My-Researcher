import type {
  ApplicationSettingRecord,
  ApplicationSettingsRepository,
} from './application-settings-repository.js';

export class InMemoryApplicationSettingsRepository implements ApplicationSettingsRepository {
  private readonly settings = new Map<string, ApplicationSettingRecord>();

  async findSetting(namespace: string, key: string): Promise<ApplicationSettingRecord | null> {
    return this.settings.get(this.settingKey(namespace, key)) ?? null;
  }

  async listSettingsByNamespace(namespace: string): Promise<ApplicationSettingRecord[]> {
    return [...this.settings.values()]
      .filter((record) => record.namespace === namespace)
      .sort((left, right) => left.key.localeCompare(right.key));
  }

  async upsertSetting(record: ApplicationSettingRecord): Promise<{ record: ApplicationSettingRecord; created: boolean }> {
    const key = this.settingKey(record.namespace, record.key);
    const existing = this.settings.get(key);
    if (existing) {
      const next: ApplicationSettingRecord = {
        ...existing,
        value: record.value,
        secretValue: record.secretValue,
        updatedAt: record.updatedAt,
      };
      this.settings.set(key, next);
      return { record: next, created: false };
    }

    this.settings.set(key, record);
    return { record, created: true };
  }

  private settingKey(namespace: string, key: string): string {
    return `${namespace}::${key}`;
  }
}
