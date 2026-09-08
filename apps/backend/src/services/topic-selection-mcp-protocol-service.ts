// T-151 Phase 2: the MCP protocol edge for the product's tool surface.
//
// The server's own model is MCP 2026-07-28: stateless, no initialize handshake, per-request
// protocol version and client capabilities in `_meta`, and a mandatory `server/discover`. Codex
// 0.153.4 — the latest published build — still speaks the handshake-based `2025-06-18`, so this
// module also accepts that handshake and translates its envelope. The shim is confined to the
// envelope: both paths dispatch into the same tool surface, so a tool cannot behave differently
// depending on how it was reached, and deleting the shim later changes nothing below it.

import type {
  TopicSelectionMcpToolSurfaceService,
} from './topic-selection-mcp-tool-surface-service.js';

export const TOPIC_SELECTION_MCP_NATIVE_REVISION = '2026-07-28';
/** Handshake-based revisions accepted through the shim. Removable once Codex negotiates the native
 *  revision; nothing below this module depends on them. */
export const TOPIC_SELECTION_MCP_SHIM_REVISIONS = ['2025-11-25', '2025-06-18', '2025-03-26'] as const;

const META_PROTOCOL_VERSION = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER_INFO = 'io.modelcontextprotocol/serverInfo';
const UNSUPPORTED_PROTOCOL_VERSION = -32022;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const SERVER_INFO = { name: 'my-researcher-tool-surface', version: '0.1.0' } as const;
/** List results are cacheable under the current revision; a short TTL keeps a long agentic loop
 *  from re-listing on every turn without letting a stale surface persist across an attempt. */
const LIST_CACHE = { ttlMs: 60_000, cacheScope: 'private' } as const;

export interface TopicSelectionMcpJsonRpcMessage {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

export type TopicSelectionMcpJsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
} & ({ result: Record<string, unknown> } | { error: { code: number; message: string; data?: unknown } });

export class TopicSelectionMcpProtocolService {
  constructor(private readonly toolSurface: TopicSelectionMcpToolSurfaceService) {}

  /** Returns null for notifications, which carry no id and expect no response. */
  async handle(message: TopicSelectionMcpJsonRpcMessage): Promise<TopicSelectionMcpJsonRpcResponse | null> {
    const { id = null, method, params } = message;
    if (method === undefined || id === null || id === undefined) {
      return null;
    }

    const requested = this.requestedRevision(params);
    if (requested !== null && !this.isSupported(requested)) {
      return this.error(id, UNSUPPORTED_PROTOCOL_VERSION, `Unsupported protocol version ${requested}.`, {
        supportedVersions: [TOPIC_SELECTION_MCP_NATIVE_REVISION, ...TOPIC_SELECTION_MCP_SHIM_REVISIONS],
      });
    }
    // The native revision requires every request to declare its version in `_meta`, so a request
    // that declares none is by definition an older client and gets the older envelope.
    const native = requested === TOPIC_SELECTION_MCP_NATIVE_REVISION;

    switch (method) {
      case 'server/discover':
        return this.ok(id, native, {
          protocolVersions: [TOPIC_SELECTION_MCP_NATIVE_REVISION, ...TOPIC_SELECTION_MCP_SHIM_REVISIONS],
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });

      // Shim only: the native revision has no handshake, and a client that sends one is by
      // definition speaking an older revision even if it omitted the version from `_meta`.
      case 'initialize':
        return this.ok(id, false, {
          protocolVersion: requested ?? '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });

      case 'tools/list':
        return this.ok(id, native, {
          tools: this.toolSurface.listTools(this.scopeIdOf(params)),
          ...(native ? LIST_CACHE : {}),
        });

      case 'tools/call': {
        const name = typeof params?.name === 'string' ? params.name : '';
        const result = await this.toolSurface.call(name, params?.arguments ?? {});
        if (result.status === 'refused') {
          // A refusal is a tool result, not a protocol error: the model has to see the reason and
          // adapt, which it cannot do if the transport swallows the call.
          return this.ok(id, native, {
            content: [{ type: 'text', text: result.text }],
            isError: true,
            _meta: { 'com.my-researcher/refusal': result.refusal },
          });
        }
        return this.ok(id, native, {
          content: [{ type: 'text', text: result.text }],
          isError: false,
        });
      }

      default:
        return this.error(id, METHOD_NOT_FOUND, `Unsupported method ${method}.`);
    }
  }

  private requestedRevision(params: Record<string, unknown> | undefined): string | null {
    const meta = params?._meta;
    if (typeof meta === 'object' && meta !== null) {
      const value = (meta as Record<string, unknown>)[META_PROTOCOL_VERSION];
      if (typeof value === 'string') {
        return value;
      }
    }
    // The handshake carries its version as an ordinary parameter rather than in `_meta`.
    return typeof params?.protocolVersion === 'string' ? params.protocolVersion : null;
  }

  private isSupported(revision: string): boolean {
    return revision === TOPIC_SELECTION_MCP_NATIVE_REVISION
      || (TOPIC_SELECTION_MCP_SHIM_REVISIONS as readonly string[]).includes(revision);
  }

  /** Listing may be narrowed by the scope a caller already holds; absent, every tool is listed and
   *  the handle check at call time is what actually enforces the boundary. */
  private scopeIdOf(params: Record<string, unknown> | undefined): string | undefined {
    const meta = params?._meta;
    if (typeof meta === 'object' && meta !== null) {
      const value = (meta as Record<string, unknown>)['com.my-researcher/scopeId'];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }

  private ok(
    id: string | number,
    native: boolean,
    payload: Record<string, unknown>,
  ): TopicSelectionMcpJsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: native
        ? { ...payload, resultType: 'complete', _meta: { ...(payload._meta as object ?? {}), [META_SERVER_INFO]: SERVER_INFO } }
        : payload,
    };
  }

  private error(
    id: string | number,
    code: number,
    message: string,
    data?: unknown,
  ): TopicSelectionMcpJsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message, ...(data === undefined ? {} : { data }) } };
  }
}

export const TOPIC_SELECTION_MCP_ERROR_CODES = {
  UNSUPPORTED_PROTOCOL_VERSION,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
} as const;
