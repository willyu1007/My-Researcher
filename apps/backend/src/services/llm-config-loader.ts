import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type LlmProviderProtocol =
  | 'openai-responses'
  | 'openai-compatible-chat-completions';

export type LlmProviderConfig = {
  id: string;
  protocol: LlmProviderProtocol;
  baseUrl: string;
  baseUrlEnv: string | null;
  apiKeyEnv: string;
};

export type LlmFeatureCallConfig = {
  id: string;
  featureId: string;
  provider: LlmProviderConfig;
  model: string;
  version: string;
  prompts: Readonly<{
    system?: string;
  }>;
  parameters: Readonly<Record<string, unknown>>;
  tools: readonly unknown[];
};

export type LlmConfigReader = Pick<
  LlmConfigLoader,
  'getProvider' | 'getCall' | 'resolveProviderBaseUrl' | 'resolveProviderApiKey'
>;

const DEFAULT_LLM_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', '..',
  '.ai',
  'llm',
);

const SUPPORTED_PROTOCOLS = new Set<LlmProviderProtocol>([
  'openai-responses',
  'openai-compatible-chat-completions',
]);

export class LlmConfigLoader {
  private readonly providers: ReadonlyMap<string, LlmProviderConfig>;
  private readonly calls = new Map<string, ReadonlyMap<string, LlmFeatureCallConfig>>();

  constructor(
    private readonly options: {
      llmRoot?: string;
      env?: NodeJS.ProcessEnv;
    } = {},
  ) {
    this.providers = this.loadProviders();
  }

  getProvider(providerId: string): LlmProviderConfig {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`LLM provider "${providerId}" is not configured.`);
    }
    return provider;
  }

  getCall(featureId: string, callId: string): LlmFeatureCallConfig {
    const calls = this.calls.get(featureId) ?? this.loadFeature(featureId);
    const call = calls.get(callId);
    if (!call) {
      throw new Error(`LLM call "${featureId}/${callId}" is not configured.`);
    }
    return call;
  }

  resolveProviderBaseUrl(providerId: string): string {
    const provider = this.getProvider(providerId);
    const override = provider.baseUrlEnv
      ? this.environment()[provider.baseUrlEnv]?.trim()
      : null;
    return this.normalizeBaseUrl(override || provider.baseUrl, providerId);
  }

  resolveProviderApiKey(providerId: string): string | null {
    const provider = this.getProvider(providerId);
    return this.environment()[provider.apiKeyEnv]?.trim() || null;
  }

  private loadProviders(): ReadonlyMap<string, LlmProviderConfig> {
    const filePath = path.join(this.llmRoot(), 'providers.json');
    const root = this.readJson(filePath);
    const providers = this.record(root.providers, `${filePath} providers`);
    const parsed = new Map<string, LlmProviderConfig>();

    for (const [providerId, value] of Object.entries(providers)) {
      const entry = this.record(value, `${filePath} provider ${providerId}`);
      const protocol = this.string(entry.protocol, `${providerId}.protocol`) as LlmProviderProtocol;
      if (!SUPPORTED_PROTOCOLS.has(protocol)) {
        throw new Error(`LLM provider "${providerId}" uses unsupported protocol "${protocol}".`);
      }
      const baseUrl = this.normalizeBaseUrl(this.string(entry.base_url, `${providerId}.base_url`), providerId);
      const apiKeyEnv = this.environmentName(entry.api_key_env, `${providerId}.api_key_env`);
      const baseUrlEnv = entry.base_url_env === undefined
        ? null
        : this.environmentName(entry.base_url_env, `${providerId}.base_url_env`);
      parsed.set(providerId, Object.freeze({
        id: providerId,
        protocol,
        baseUrl,
        baseUrlEnv,
        apiKeyEnv,
      }));
    }

    if (parsed.size === 0) {
      throw new Error(`${filePath} must configure at least one LLM provider.`);
    }
    return parsed;
  }

  private loadFeature(featureId: string): ReadonlyMap<string, LlmFeatureCallConfig> {
    this.assertId(featureId, 'feature');
    const featureRoot = path.join(this.llmRoot(), featureId);
    const filePath = path.join(featureRoot, 'config.json');
    const root = this.readJson(filePath);
    const calls = this.record(root.calls, `${filePath} calls`);
    const parsed = new Map<string, LlmFeatureCallConfig>();

    for (const [callId, value] of Object.entries(calls)) {
      this.assertId(callId, 'call');
      const entry = this.record(value, `${featureId}/${callId}`);
      const providerId = this.string(entry.provider, `${featureId}/${callId}.provider`);
      const provider = this.getProvider(providerId);
      const prompt = entry.prompt === undefined
        ? {}
        : this.record(entry.prompt, `${featureId}/${callId}.prompt`);
      const systemPath = prompt.system === undefined
        ? undefined
        : this.resolvePrompt(featureRoot, prompt.system, `${featureId}/${callId}.prompt.system`);
      const parameters = this.record(entry.parameters, `${featureId}/${callId}.parameters`);
      const tools = this.array(entry.tools, `${featureId}/${callId}.tools`);

      parsed.set(callId, Object.freeze({
        id: callId,
        featureId,
        provider,
        model: this.string(entry.model, `${featureId}/${callId}.model`),
        version: this.string(entry.version, `${featureId}/${callId}.version`),
        prompts: Object.freeze({
          ...(systemPath ? { system: readFileSync(systemPath, 'utf8').trim() } : {}),
        }),
        parameters: Object.freeze({ ...parameters }),
        tools: Object.freeze([...tools]),
      }));
    }

    if (parsed.size === 0) {
      throw new Error(`${filePath} must configure at least one LLM call.`);
    }
    const result = parsed as ReadonlyMap<string, LlmFeatureCallConfig>;
    this.calls.set(featureId, result);
    return result;
  }

  private resolvePrompt(featureRoot: string, value: unknown, label: string): string {
    const relativePath = this.string(value, label);
    const resolved = path.resolve(featureRoot, relativePath);
    const relative = path.relative(featureRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`${label} must stay inside its feature directory.`);
    }
    return resolved;
  }

  private readJson(filePath: string): Record<string, unknown> {
    try {
      return this.record(JSON.parse(readFileSync(filePath, 'utf8')) as unknown, filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load LLM configuration ${filePath}: ${message}`, { cause: error });
    }
  }

  private llmRoot(): string {
    return path.resolve(this.options.llmRoot ?? DEFAULT_LLM_ROOT);
  }

  private environment(): NodeJS.ProcessEnv {
    return this.options.env ?? process.env;
  }

  private normalizeBaseUrl(value: string, providerId: string): string {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new Error(`LLM provider "${providerId}" base_url must be an absolute URL.`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`LLM provider "${providerId}" base_url must use http or https.`);
    }
    return parsed.href.replace(/\/+$/u, '');
  }

  private assertId(value: string, label: string): void {
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/u.test(value)) {
      throw new Error(`LLM ${label} id "${value}" must use stable lowercase kebab/dot syntax.`);
    }
  }

  private record(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} must be a JSON object.`);
    }
    return value as Record<string, unknown>;
  }

  private array(value: unknown, label: string): unknown[] {
    if (!Array.isArray(value)) {
      throw new Error(`${label} must be a JSON array.`);
    }
    return value;
  }

  private string(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${label} must be a non-empty string.`);
    }
    return value.trim();
  }

  private environmentName(value: unknown, label: string): string {
    const name = this.string(value, label);
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(name)) {
      throw new Error(`${label} must be an uppercase environment variable name.`);
    }
    return name;
  }
}

let defaultLoader: LlmConfigLoader | null = null;

export function defaultLlmConfig(): LlmConfigLoader {
  defaultLoader ??= new LlmConfigLoader();
  return defaultLoader;
}
