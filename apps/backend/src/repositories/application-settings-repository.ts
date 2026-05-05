export type ApplicationSettingRecord = {
  id: string;
  namespace: string;
  key: string;
  value: Record<string, unknown>;
  secretValue: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface ApplicationSettingsRepository {
  findSetting(namespace: string, key: string): Promise<ApplicationSettingRecord | null>;
  listSettingsByNamespace(namespace: string): Promise<ApplicationSettingRecord[]>;
  upsertSetting(record: ApplicationSettingRecord): Promise<{ record: ApplicationSettingRecord; created: boolean }>;
}
