import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  ApplicationSettingRecord,
  ApplicationSettingsRepository,
} from '../application-settings-repository.js';

type PrismaApplicationSetting = Awaited<ReturnType<PrismaClient['applicationSetting']['findFirstOrThrow']>>;

export class PrismaApplicationSettingsRepository implements ApplicationSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findSetting(namespace: string, key: string): Promise<ApplicationSettingRecord | null> {
    const row = await this.prisma.applicationSetting.findUnique({
      where: {
        namespace_key: {
          namespace,
          key,
        },
      },
    });
    return row ? toApplicationSettingRecord(row) : null;
  }

  async listSettingsByNamespace(namespace: string): Promise<ApplicationSettingRecord[]> {
    const rows = await this.prisma.applicationSetting.findMany({
      where: { namespace },
      orderBy: { key: 'asc' },
    });
    return rows.map((row) => toApplicationSettingRecord(row));
  }

  async upsertSetting(record: ApplicationSettingRecord): Promise<{ record: ApplicationSettingRecord; created: boolean }> {
    const existing = await this.prisma.applicationSetting.findUnique({
      where: {
        namespace_key: {
          namespace: record.namespace,
          key: record.key,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.applicationSetting.update({
        where: { id: existing.id },
        data: {
          value: record.value as Prisma.InputJsonValue,
          secretValue: record.secretValue,
          updatedAt: new Date(record.updatedAt),
        },
      });
      return { record: toApplicationSettingRecord(updated), created: false };
    }

    const created = await this.prisma.applicationSetting.create({
      data: {
        id: record.id,
        namespace: record.namespace,
        key: record.key,
        value: record.value as Prisma.InputJsonValue,
        secretValue: record.secretValue,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    return { record: toApplicationSettingRecord(created), created: true };
  }
}

function toApplicationSettingRecord(row: PrismaApplicationSetting): ApplicationSettingRecord {
  return {
    id: row.id,
    namespace: row.namespace,
    key: row.key,
    value: isRecord(row.value) ? row.value : {},
    secretValue: row.secretValue,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
